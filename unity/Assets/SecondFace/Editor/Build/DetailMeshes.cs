using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;
using UnityEditor.AddressableAssets.Settings.GroupSchemas;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The terrain's detail prototypes (step 19b): for each Core <see cref="WorldDetails.Keys"/> entry, one scan variant
    /// reduced to the coarsest of its Mesh LODs that stays under <see cref="TriangleCap"/> (the nature import generates
    /// them), saved as a compact mesh with the scan's bound library materials (GPU instancing on) in
    /// Assets/SecondFace/Prefabs/details, made Addressable in the "details" group, and named with its scale range in
    /// Assets/SecondFace/World/DetailSet.asset. Committed; rebuilt in place by this code.
    /// </summary>
    public static class DetailMeshes
    {
        public const string Dir = "Assets/SecondFace/Prefabs/details";
        public const string SetPath = "Assets/SecondFace/World/DetailSet.asset";
        public const string Group = "details";
        public const int TriangleCap = 400;

        /// <summary>Key → (scan variant FBX stem, scale range, align to ground).</summary>
        private static readonly Dictionary<string, (string Model, float Min, float Max, float Align)> Sources = new()
        {
            ["scrub_bush"] = ("wild_rooibos_bush_v3", 1.4f, 2.4f, 0.3f),
            ["scrub_twigs"] = ("shrub_01_v1", 2.0f, 3.4f, 0.2f),
            ["scrub_low"] = ("shrub_03_v1", 1.8f, 3.0f, 0.2f),
            ["stones"] = ("rock_07", 1.0f, 2.2f, 0.9f),   // brown; the Namaqualand granite read salmon-pink on the pale ground
            ["pebbles"] = ("namaqualand_stones_01_v2", 1.4f, 3.0f, 1f),
            ["rocks_flat"] = ("namaqualand_boulders_01_v1", 1.0f, 1.8f, 0.9f),
            ["branches"] = ("dry_branches_medium_01_v2", 0.9f, 1.4f, 1f),
            ["grass_a"] = ("grass_medium_01_v2", 2.5f, 4.5f, 0.3f),   // a 0.14 m tuft: grown to 0.35–0.6 m
            ["grass_b"] = ("grass_medium_02_v4", 1.3f, 2.2f, 0.3f),
            ["grass_c"] = ("grass_medium_02_v5", 1.2f, 2.0f, 0.3f),
            ["fern"] = ("fern_02_v3", 1.0f, 1.4f, 0.3f),
        };

        [MenuItem("Second Face/Build detail meshes")]
        public static DetailSet Build()
        {
            Directory.CreateDirectory(Dir);
            var entries = new List<DetailSet.Entry>();
            var settings = AddressableAssetSettingsDefaultObject.GetSettings(true);
            var group = settings.FindGroup(Group) ?? settings.CreateGroup(Group, false, false, false, null, typeof(BundledAssetGroupSchema), typeof(ContentUpdateGroupSchema));
            var bundled = group.GetSchema<BundledAssetGroupSchema>();
            bundled.BundleMode = BundledAssetGroupSchema.BundlePackingMode.PackTogether;
            bundled.Compression = BundledAssetGroupSchema.BundleCompressionMode.LZ4;
            bundled.BuildPath.SetVariableByName(settings, AddressableAssetSettings.kLocalBuildPath);
            bundled.LoadPath.SetVariableByName(settings, AddressableAssetSettings.kLocalLoadPath);
            foreach (var key in WorldDetails.Keys)
            {
                if (!Sources.TryGetValue(key, out var src)) { Debug.LogWarning($"DetailMeshes: no source for {key}"); continue; }
                var modelPath = $"{ModelLibrary.Dir}/{src.Model}.fbx";
                var bound = ContentPrefabs.Bound(modelPath);
                if (bound == null) { Debug.LogWarning($"DetailMeshes: {modelPath} is missing"); continue; }
                var filter = bound.GetComponentInChildren<MeshFilter>();
                var renderer = bound.GetComponentInChildren<MeshRenderer>();
                if (filter == null || filter.sharedMesh == null || renderer == null) { Debug.LogWarning($"DetailMeshes: {modelPath} has no mesh"); continue; }
                var mesh = Reduce(filter.sharedMesh, filter.transform.localToWorldMatrix, out var tris);
                var meshPath = $"{Dir}/{key}.asset";
                var existing = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
                if (existing == null) AssetDatabase.CreateAsset(mesh, meshPath);
                else { EditorUtility.CopySerialized(mesh, existing); Object.DestroyImmediate(mesh); mesh = existing; EditorUtility.SetDirty(existing); }
                foreach (var m in renderer.sharedMaterials) if (m != null && !m.enableInstancing) { m.enableInstancing = true; EditorUtility.SetDirty(m); }
                var go = new GameObject(key);
                go.AddComponent<MeshFilter>().sharedMesh = mesh;
                var r = go.AddComponent<MeshRenderer>();
                r.sharedMaterials = renderer.sharedMaterials;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;   // a stone's shadow is not worth its draw
                var prefabPath = $"{Dir}/{key}.prefab";
                var prefab = PrefabUtility.SaveAsPrefabAsset(go, prefabPath);
                Object.DestroyImmediate(go);
                var entry = settings.CreateOrMoveEntry(AssetDatabase.AssetPathToGUID(prefabPath), group, false, false);
                entry.address = $"{Group}/{key}";
                entries.Add(new DetailSet.Entry { Key = key, Address = entry.address, MinScale = src.Min, MaxScale = src.Max, AlignToGround = src.Align });
                Debug.Log($"DetailMeshes: {key} from {src.Model}: {tris} triangles (scan {filter.sharedMesh.triangles.Length / 3}, {filter.sharedMesh.lodCount} LODs)");
            }
            EditorUtility.SetDirty(group);
            var set = AssetDatabase.LoadAssetAtPath<DetailSet>(SetPath);
            var fresh = set == null;
            if (fresh) set = ScriptableObject.CreateInstance<DetailSet>();
            set.Entries = entries.ToArray();
            Directory.CreateDirectory(Path.GetDirectoryName(SetPath));
            if (fresh) AssetDatabase.CreateAsset(set, SetPath); else EditorUtility.SetDirty(set);
            AssetDatabase.SaveAssets();
            return set;
        }

        /// <summary>A compact copy of a mesh at the coarsest LOD level under the cap (the whole mesh if it has no LODs
        /// or is already under it), with the node's transform baked in (the scans sit on their own base).</summary>
        private static Mesh Reduce(Mesh src, Matrix4x4 node, out int triangles)
        {
            var level = 0;
            for (var l = 0; l < src.lodCount; l++)
            {
                var count = 0;
                for (var s = 0; s < src.subMeshCount; s++) count += (int)src.GetLod(s, l).indexCount / 3;
                level = l;
                if (count <= TriangleCap) break;
            }
            var verts = src.vertices; var normals = src.normals; var tangents = src.tangents; var uv = src.uv;
            var remap = new Dictionary<int, int>();
            var outV = new List<Vector3>(); var outN = new List<Vector3>(); var outT = new List<Vector4>(); var outUv = new List<Vector2>();
            var subs = new List<List<int>>();
            triangles = 0;
            for (var s = 0; s < src.subMeshCount; s++)
            {
                var all = src.GetIndices(s);
                var range = src.lodCount > 0 ? src.GetLod(s, level) : new MeshLodRange { indexStart = 0, indexCount = (uint)all.Length };
                var start = (int)range.indexStart - (int)src.GetSubMesh(s).indexStart;
                if (start < 0 || start + (int)range.indexCount > all.Length) start = 0;   // ranges relative to the submesh
                var list = new List<int>();
                for (var k = 0; k < range.indexCount && start + k < all.Length; k++)
                {
                    var v = all[start + k];
                    if (!remap.TryGetValue(v, out var nv))
                    {
                        nv = outV.Count; remap[v] = nv;
                        outV.Add(node.MultiplyPoint3x4(verts[v]));
                        if (normals.Length > v) outN.Add(node.MultiplyVector(normals[v]).normalized);
                        if (tangents.Length > v) { var t = node.MultiplyVector(tangents[v]).normalized; outT.Add(new Vector4(t.x, t.y, t.z, tangents[v].w)); }
                        if (uv.Length > v) outUv.Add(uv[v]);
                    }
                    list.Add(nv);
                }
                triangles += list.Count / 3;
                subs.Add(list);
            }
            var mesh = new Mesh { name = src.name + "_detail" };
            mesh.SetVertices(outV);
            if (outN.Count == outV.Count) mesh.SetNormals(outN);
            if (outT.Count == outV.Count) mesh.SetTangents(outT);
            if (outUv.Count == outV.Count) mesh.SetUVs(0, outUv);
            mesh.subMeshCount = subs.Count;
            for (var s = 0; s < subs.Count; s++) mesh.SetTriangles(subs[s], s);
            mesh.RecalculateBounds();
            if (outN.Count != outV.Count) mesh.RecalculateNormals();
            mesh.UploadMeshData(true);
            return mesh;
        }
    }
}
