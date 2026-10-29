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
    /// The terrain's detail prototypes (steps 19b–c), for each Core <see cref="WorldDetails.Keys"/> entry a mesh in
    /// Assets/SecondFace/Prefabs/details: a bush, a dome of leaf cards (Textures/Detail/bush_*, graded by
    /// tools/unity/tufts.py) with its normals bent out from its heart; a tuft, a star of tilted cards carrying a tuft cut
    /// by tufts.py; or a stone or branch, one scan variant reduced to the coarsest of its Mesh LODs under its triangle cap
    /// (the nature import generates them), compacted, with the scan's bound library materials (GPU instancing on). Bushes
    /// and tufts draw with SecondFace/Foliage (tint per plant, occlusion and wind in the vertex colours). Each is made
    /// Addressable in the "details" group and named with its size in Assets/SecondFace/World/DetailSet.asset. Committed;
    /// rebuilt in place by this code.
    /// </summary>
    public static class DetailMeshes
    {
        public const string Dir = "Assets/SecondFace/Prefabs/details";
        public const string SetPath = "Assets/SecondFace/World/DetailSet.asset";
        public const string Group = "details";
        public const int TriangleCap = 400;

        /// <summary>Scan prototypes: key → (scan variant FBX stem, scale range, align to ground, triangle cap).</summary>
        private static readonly Dictionary<string, (string Model, float Min, float Max, float Align, int Cap)> Sources = new()
        {
            ["stones"] = ("rock_07", 1.0f, 2.2f, 0.9f, TriangleCap),   // brown; the Namaqualand granite read salmon-pink on the pale ground
            ["pebbles"] = ("namaqualand_stones_01_v2", 1.4f, 3.0f, 1f, TriangleCap),
            ["rocks_flat"] = ("namaqualand_boulders_01_v1", 1.0f, 1.8f, 0.9f, TriangleCap),
            ["branches"] = ("dry_branches_medium_01_v2", 0.9f, 1.4f, 1f, TriangleCap),
            ["fern"] = ("fern_02_v3", 1.0f, 1.4f, 0.3f, TriangleCap),
        };

        /// <summary>Bush prototypes: key → (card in Textures/Detail, cards, height over width, domes, width range in
        /// metres, seed, the two tints a plant is drawn between). The scanned bushes (rooibos) were thin dark twigs at
        /// their size from the iso camera, and the terrain draws only a detail mesh's first submesh; a dome of cards is
        /// one material, a few dozen triangles, and reads as a mound with a shadow side.</summary>
        private static readonly Dictionary<string, (string Texture, int Cards, float Height, int Lobes, float Min, float Max, int Seed, Color TintA, Color TintB)> Bushes = new()
        {
            // saltbush: low grey-olive mounds, the Sallow's commonest cover
            ["bush_a"] = ("bush_leaf", 30, 0.6f, 3, 0.8f, 1.5f, 11, new Color(0.96f, 0.95f, 0.86f), new Color(0.7f, 0.74f, 0.68f)),
            // renosterbos: rounder grey-green needle bushes
            ["bush_b"] = ("bush_needle", 28, 0.75f, 2, 0.6f, 1.2f, 23, new Color(0.95f, 0.95f, 0.88f), new Color(0.68f, 0.72f, 0.66f)),
            // the washes' big bush, darker and fuller (also the Teeth's and the Wet's undergrowth)
            ["bush_c"] = ("bush_needle", 36, 0.7f, 3, 1.3f, 2.3f, 37, new Color(0.84f, 0.88f, 0.76f), new Color(0.58f, 0.64f, 0.54f)),
        };

        /// <summary>Tuft prototypes: key → (tuft card from tools/unity/tufts.py, height range in metres). Each tuft is a
        /// star of <see cref="TuftCards"/> cards tilted <see cref="TuftTilt"/>° outwards: upright cards (the terrain's own
        /// grass) read as slivers from the iso camera's 50°.</summary>
        private static readonly Dictionary<string, (string Texture, float Min, float Max)> Tufts = new()
        {
            ["tuft_dry_a"] = ("tuft_dry_1", 0.5f, 0.9f),
            ["tuft_dry_b"] = ("tuft_dry_3", 0.45f, 0.8f),
            ["tuft_green_a"] = ("tuft_green_1", 0.5f, 0.9f),
            ["tuft_green_b"] = ("tuft_green_4", 0.45f, 0.8f),
        };

        public const int TuftCards = 7;
        public const float TuftTilt = 35f;

        public const string TuftDir = "Assets/SecondFace/Textures/Detail";

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
                if (Bushes.TryGetValue(key, out var bush))
                {
                    var tex = CardTexture(bush.Texture);
                    if (tex == null) continue;
                    var mat = FoliageMaterial(key, tex, bush.TintA, bush.TintB, 0.04f, 0.45f);
                    var mesh = BushMesh(key, bush.Cards, bush.Height, bush.Lobes, (float)tex.width / tex.height, bush.Seed);
                    entries.Add(Save(key, mesh, new[] { mat }, bush.Min, bush.Max, 0.3f, settings, group));
                    Debug.Log($"DetailMeshes: {key} from {bush.Texture}: {bush.Lobes} domes of {mesh.vertexCount / 4} cards");
                    continue;
                }
                if (Tufts.TryGetValue(key, out var tuft))
                {
                    var tex = CardTexture(tuft.Texture);
                    if (tex == null) continue;
                    var tint = key.Contains("dry") ? (new Color(1.06f, 1.02f, 0.96f), new Color(0.82f, 0.82f, 0.78f)) : (new Color(1.05f, 1.05f, 0.95f), new Color(0.8f, 0.86f, 0.78f));
                    var mat = FoliageMaterial(key, tex, tint.Item1, tint.Item2, 0.07f, 0.7f);
                    var mesh = TuftMesh(key, (float)tex.width / tex.height);
                    entries.Add(Save(key, mesh, new[] { mat }, tuft.Min, tuft.Max, 0.5f, settings, group));
                    Debug.Log($"DetailMeshes: {key} from {tuft.Texture}: {TuftCards} tilted cards");
                    continue;
                }
                if (!Sources.TryGetValue(key, out var src)) { Debug.LogWarning($"DetailMeshes: no source for {key}"); continue; }
                var modelPath = $"{ModelLibrary.Dir}/{src.Model}.fbx";
                var bound = ContentPrefabs.Bound(modelPath);
                if (bound == null) { Debug.LogWarning($"DetailMeshes: {modelPath} is missing"); continue; }
                var filter = bound.GetComponentInChildren<MeshFilter>();
                var renderer = bound.GetComponentInChildren<MeshRenderer>();
                if (filter == null || filter.sharedMesh == null || renderer == null) { Debug.LogWarning($"DetailMeshes: {modelPath} has no mesh"); continue; }
                var mats = renderer.sharedMaterials;
                // the terrain draws a detail mesh's first submesh only
                if (mats.Length > 1) Debug.LogWarning($"DetailMeshes: {key} has {mats.Length} materials: the terrain will draw the first only");
                var reduced = Reduce(filter.sharedMesh, filter.transform.localToWorldMatrix, src.Cap, out var tris);
                reduced.name = key;
                var stored = Store(key, reduced);
                foreach (var m in mats) if (m != null && !m.enableInstancing) { m.enableInstancing = true; EditorUtility.SetDirty(m); }
                entries.Add(Save(key, stored, mats, src.Min, src.Max, src.Align, settings, group));
                Debug.Log($"DetailMeshes: {key} from {src.Model}: {tris} triangles (scan {filter.sharedMesh.triangles.Length / 3}, {filter.sharedMesh.lodCount} LODs)");
            }
            var wanted = new HashSet<string>(entries.Select(e => e.Address));   // stale entries (renamed keys) go
            foreach (var stale in group.entries.Where(e => !wanted.Contains(e.address)).ToList()) group.RemoveAssetEntry(stale, false);
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

        /// <summary>The prototype's prefab (a mesh and its materials, no shadows: a stone's or a tuft's shadow is not worth
        /// its draw), made Addressable; returns its DetailSet entry.</summary>
        private static DetailSet.Entry Save(string key, Mesh mesh, Material[] mats, float min, float max, float align, AddressableAssetSettings settings, AddressableAssetGroup group)
        {
            var go = new GameObject(key);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = go.AddComponent<MeshRenderer>();
            r.sharedMaterials = mats;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var prefabPath = $"{Dir}/{key}.prefab";
            PrefabUtility.SaveAsPrefabAsset(go, prefabPath);
            Object.DestroyImmediate(go);
            var entry = settings.CreateOrMoveEntry(AssetDatabase.AssetPathToGUID(prefabPath), group, false, false);
            entry.address = $"{Group}/{key}";
            return new DetailSet.Entry { Key = key, Address = entry.address, MinScale = min, MaxScale = max, AlignToGround = align };
        }

        /// <summary>A card from Textures/Detail, imported for cut-out cards (clamped, coverage kept in the mips: thin
        /// blades and leaves vanish in the small mips otherwise).</summary>
        private static Texture2D CardTexture(string name)
        {
            var path = $"{TuftDir}/{name}.png";
            var imp = AssetImporter.GetAtPath(path) as TextureImporter;
            if (imp == null) { Debug.LogWarning($"DetailMeshes: {path} is missing (tools/unity/tufts.py)"); return null; }
            if (!imp.mipMapsPreserveCoverage || imp.wrapMode != TextureWrapMode.Clamp || !imp.alphaIsTransparency)
            {
                imp.textureType = TextureImporterType.Default;
                imp.alphaSource = TextureImporterAlphaSource.FromInput;
                imp.alphaIsTransparency = true;
                imp.wrapMode = TextureWrapMode.Clamp;
                imp.mipmapEnabled = true;
                imp.mipMapsPreserveCoverage = true;
                imp.alphaTestReferenceValue = 0.5f;
                imp.SaveAndReimport();
            }
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        /// <summary>A plant's material: SecondFace/Foliage, the card cut out, tinted per plant between two colours,
        /// swaying by <paramref name="wind"/> metres at the top, fading out before the terrain's detail distance.</summary>
        private static Material FoliageMaterial(string key, Texture2D tex, Color tintA, Color tintB, float wind, float translucency)
        {
            var path = $"{Dir}/{key}.mat";
            var shader = Shader.Find("SecondFace/Foliage");
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            var fresh = m == null;
            if (fresh) m = new Material(shader) { name = key };
            else if (m.shader != shader) m.shader = shader;
            m.SetTexture("_BaseMap", tex);
            m.SetFloat("_Cutoff", 0.5f);
            m.SetColor("_TintA", tintA); m.SetColor("_TintB", tintB);
            m.SetFloat("_Occlusion", 0.85f);
            m.SetFloat("_Smoothness", 0.1f);
            m.SetFloat("_Translucency", translucency);
            m.SetFloat("_Wind", wind);
            m.SetFloat("_FadeEnd", ChunkTerrain.DetailDistance);
            m.SetFloat("_FadeStart", ChunkTerrain.DetailDistance - 25f);
            m.enableInstancing = true;
            if (fresh) AssetDatabase.CreateAsset(m, path); else EditorUtility.SetDirty(m);
            return m;
        }

        /// <summary>Stores a generated mesh at Prefabs/details/key.asset, in place if it exists (its GUID kept).</summary>
        private static Mesh Store(string key, Mesh mesh)
        {
            var path = $"{Dir}/{key}.asset";
            var existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (existing == null) { AssetDatabase.CreateAsset(mesh, path); return mesh; }
            EditorUtility.CopySerialized(mesh, existing); Object.DestroyImmediate(mesh); EditorUtility.SetDirty(existing);
            return existing;
        }

        /// <summary>A bush about one metre wide and <paramref name="height"/> high, made of <paramref name="lobes"/>
        /// overlapping domes (one dome reads as a ball; two or three give a lumpy, lopsided crown): <paramref name="cards"/>
        /// cards shared between the domes by their size, each spread over its dome on a golden-angle spiral from the crown
        /// to just above the ground, jittered, facing out from the dome's heart, rolled at random. The normals point out
        /// from a heart low in each dome, so the bush shades as mounds, not as flat cards; vertex colour r darkens the
        /// hearts and the base (the plant's own occlusion), g lets the top sway and keeps the base still.</summary>
        private static Mesh BushMesh(string key, int cards, float height, int lobes, float aspect, int seed)
        {
            var rng = new System.Random(seed);
            float R() => (float)rng.NextDouble();
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var col = new List<Color>(); var t = new List<int>();
            // the domes: the first at the centre, the others leaning off it on different sides, smaller
            var domes = new List<(Vector3 Centre, float Radius, float Height)> { (Vector3.zero, 0.4f, height) };
            var turn = R() * Mathf.PI * 2;
            for (var l = 1; l < lobes; l++)
            {
                turn += Mathf.Lerp(1.8f, 2.6f, R());
                var r = Mathf.Lerp(0.24f, 0.32f, R());
                var d = Mathf.Lerp(0.22f, 0.3f, R());
                domes.Add((new Vector3(Mathf.Cos(turn) * d, 0, Mathf.Sin(turn) * d), r, height * Mathf.Pow(r / 0.4f, 0.8f)));
            }
            var area = domes.Sum(o => o.Radius * o.Radius);
            const float golden = 2.39996323f;
            foreach (var dome in domes)
            {
                var count = Mathf.Max(6, Mathf.RoundToInt(cards * dome.Radius * dome.Radius / area));
                var heart = dome.Centre + new Vector3(0, dome.Height * 0.15f, 0);
                for (var k = 0; k < count; k++)
                {
                    // from the crown (elevation 90°) down to −10°: more cards round the sides, where the silhouette is
                    var f = (k + 0.5f) / count;
                    var elev = Mathf.Lerp(88f, -10f, Mathf.Pow(f, 0.8f)) * Mathf.Deg2Rad + (R() - 0.5f) * 0.3f;
                    var az = k * golden + (R() - 0.5f) * 0.7f;
                    var dir = new Vector3(Mathf.Cos(elev) * Mathf.Cos(az), Mathf.Sin(elev), Mathf.Cos(elev) * Mathf.Sin(az));
                    var reach = Mathf.Lerp(0.35f, 0.85f, R());
                    var centre = dome.Centre + new Vector3(dir.x * dome.Radius * reach, dome.Height * 0.5f + dir.y * dome.Height * 0.5f * reach, dir.z * dome.Radius * reach);
                    // the card's plane faces out (its normal along dir), turned about dir at random
                    var right = Vector3.Cross(Mathf.Abs(dir.y) > 0.95f ? Vector3.forward : Vector3.up, dir).normalized;
                    var up = Vector3.Cross(dir, right);
                    var roll = R() * Mathf.PI * 2;
                    var r2 = right * Mathf.Cos(roll) + up * Mathf.Sin(roll);
                    var u2 = Vector3.Cross(dir, r2);
                    var size = Mathf.Lerp(1.1f, 1.5f, R()) * dome.Radius;
                    var hw = size * 0.5f * Mathf.Min(1f, aspect); var hh = size * 0.5f / Mathf.Max(1f, aspect);
                    var i = v.Count;
                    var corners = new[] { centre - r2 * hw - u2 * hh, centre + r2 * hw - u2 * hh, centre - r2 * hw + u2 * hh, centre + r2 * hw + u2 * hh };
                    foreach (var c in corners)
                    {
                        var p = c;
                        p.y = Mathf.Max(p.y, 0.02f);
                        v.Add(p);
                        n.Add(((p - heart).normalized * 0.85f + Vector3.up * 0.15f).normalized);
                        var h = Mathf.Clamp01(p.y / height);
                        var rim = Mathf.Clamp01(new Vector2(p.x - dome.Centre.x, p.z - dome.Centre.z).magnitude / dome.Radius);
                        var ao = Mathf.Lerp(0.3f, 1f, Mathf.Clamp01(0.2f + 0.55f * h + 0.35f * rim));
                        col.Add(new Color(ao, h * h, 0, 1));
                    }
                    // half the cards show the card mirrored, so neighbours do not repeat
                    var flip = R() < 0.5f;
                    uv.Add(new Vector2(flip ? 1 : 0, 0)); uv.Add(new Vector2(flip ? 0 : 1, 0)); uv.Add(new Vector2(flip ? 1 : 0, 1)); uv.Add(new Vector2(flip ? 0 : 1, 1));
                    t.Add(i); t.Add(i + 2); t.Add(i + 1); t.Add(i + 1); t.Add(i + 2); t.Add(i + 3);
                }
            }
            var mesh = new Mesh { name = key };
            mesh.SetVertices(v); mesh.SetNormals(n); mesh.SetUVs(0, uv); mesh.SetColors(col); mesh.SetTriangles(t, 0);
            mesh.RecalculateBounds();
            return Store(key, mesh);
        }

        /// <summary>A tuft one metre high: <see cref="TuftCards"/> cards round the centre, each facing out and tilted
        /// <see cref="TuftTilt"/>° outwards, normals bent up (the tuft shades as a mound, not as flat cards).</summary>
        private static Mesh TuftMesh(string key, float aspect)
        {
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var col = new List<Color>(); var t = new List<int>();
            var width = Mathf.Clamp(aspect * 0.55f, 0.4f, 1.2f);
            var tilt = TuftTilt * Mathf.Deg2Rad;
            for (var k = 0; k < TuftCards; k++)
            {
                var a = (k + 0.31f * (k % 3)) * Mathf.PI * 2 / TuftCards;
                var d = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a));
                var side = new Vector3(-d.z, 0, d.x);
                var up = d * Mathf.Sin(tilt) + Vector3.up * Mathf.Cos(tilt);
                var c = d * 0.06f;
                var normal = (Vector3.up * 0.75f + d * 0.25f).normalized;
                var i = v.Count;
                v.Add(c - side * width / 2); v.Add(c + side * width / 2); v.Add(c - side * width / 2 + up); v.Add(c + side * width / 2 + up);
                for (var q = 0; q < 4; q++) n.Add(normal);
                // the base dark and still, the tips lit and swaying
                col.Add(new Color(0.45f, 0, 0, 1)); col.Add(new Color(0.45f, 0, 0, 1)); col.Add(new Color(1, 1, 0, 1)); col.Add(new Color(1, 1, 0, 1));
                uv.Add(new Vector2(0, 0)); uv.Add(new Vector2(1, 0)); uv.Add(new Vector2(0, 1)); uv.Add(new Vector2(1, 1));
                t.Add(i); t.Add(i + 2); t.Add(i + 1); t.Add(i + 1); t.Add(i + 2); t.Add(i + 3);
            }
            var mesh = new Mesh { name = key };
            mesh.SetVertices(v); mesh.SetNormals(n); mesh.SetUVs(0, uv); mesh.SetColors(col); mesh.SetTriangles(t, 0);
            mesh.RecalculateBounds();
            return Store(key, mesh);
        }

        /// <summary>A compact copy of a mesh at the coarsest LOD level under the cap (the whole mesh if it has no LODs
        /// or is already under it), with the node's transform baked in (the scans sit on their own base).</summary>
        private static Mesh Reduce(Mesh src, Matrix4x4 node, int cap, out int triangles)
        {
            var level = 0;
            for (var l = 0; l < src.lodCount; l++)
            {
                var count = 0;
                for (var s = 0; s < src.subMeshCount; s++) count += (int)src.GetLod(s, l).indexCount / 3;
                level = l;
                if (count <= cap) break;
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
