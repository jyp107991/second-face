using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// The baked sleeves of a few broad bases slimmed to a real garment's stand-off (docs/MOTION_ROOT_CAUSE.md §7, T5;
    /// docs/qa/body_geometry_audit.md): their Rocketbox meshes carry their clothes in the body's own surface, and the sleeves
    /// of five of them stand 7-9 cm round the upper arm's bone and 7-9 cm round the elbow, where a real arm in a jacket is at
    /// most about 8.5 and 6.2 (ANSUR II's p90-p98 arm, plus a jacket's 1.6 cm ease, docs/PEOPLE_MOTION.md §2.6): a hanging
    /// arm had to stand 14-17° out to clear the body, against about 11° for a real man in a jacket. The deltas are worked
    /// out offline from each base's own mesh by tools/unity/people/body_slim.py (a radial scale of each arm cross-section,
    /// the cloth's own folds and the texture kept) and written beside the FBX as &lt;id&gt;_slim.bytes; the import
    /// (RocketboxImportPostprocessor) moves the body mesh's vertices and turns its normals by them, before the flank
    /// correctives (<see cref="BodyCorrectives"/>), the skin points and the layers are measured on it.
    /// </summary>
    public static class BodySlim
    {
        public const string Magic = "RBS1";

        public static string PathFor(string fbxPath) => fbxPath.Substring(0, fbxPath.Length - Path.GetExtension(fbxPath).Length) + "_slim.bytes";

        /// <summary>The deltas (the body mesh's own space: each moved vertex's position and normal change), for a mesh of
        /// <paramref name="vertexCount"/> vertices; false when the file is not for it.</summary>
        public static bool Read(byte[] bytes, int vertexCount, out Vector3[] dp, out Vector3[] dn)
        {
            dp = dn = null;
            if (bytes == null || bytes.Length < 12) return false;
            using var r = new BinaryReader(new MemoryStream(bytes));
            if (new string(r.ReadChars(4)) != Magic) return false;
            if (r.ReadInt32() != vertexCount) return false;
            dp = new Vector3[vertexCount]; dn = new Vector3[vertexCount];
            var n = r.ReadInt32();
            for (var k = 0; k < n; k++)
            {
                var i = r.ReadInt32();
                var p = new Vector3(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                var q = new Vector3(r.ReadSingle(), r.ReadSingle(), r.ReadSingle());
                if (i >= 0 && i < vertexCount) { dp[i] = p; dn[i] = q; }
            }
            return true;
        }

        public static (Vector3[] P, Vector3[] N) ReadFor(string fbxPath, int vertexCount)
        {
            var path = PathFor(fbxPath);
            if (!File.Exists(path)) return (null, null);
            return Read(File.ReadAllBytes(path), vertexCount, out var p, out var n) ? (p, n) : (null, null);
        }

        /// <summary>Moves the mesh's vertices and turns its normals by the deltas (the bind pose's own space).</summary>
        public static void Apply(Mesh m, Vector3[] dp, Vector3[] dn)
        {
            var v = m.vertices; var nr = m.normals;
            for (var i = 0; i < v.Length; i++)
            {
                v[i] += dp[i];
                if (nr != null && i < nr.Length && dn[i] != Vector3.zero) nr[i] = (nr[i] + dn[i]).normalized;
            }
            m.vertices = v;
            if (nr != null && nr.Length == v.Length) m.normals = nr;
            m.RecalculateBounds();
        }

        /// <summary>The body's own mesh: the person's largest.</summary>
        public static SkinnedMeshRenderer Body(GameObject root)
        {
            SkinnedMeshRenderer body = null;
            foreach (var r in root.GetComponentsInChildren<SkinnedMeshRenderer>(true))
                if (r.sharedMesh != null && (body == null || r.sharedMesh.vertexCount > body.sharedMesh.vertexCount)) body = r;
            return body;
        }

        /// <summary>For the command line (tools/unity/editor.sh run): every base with a slim beside its FBX imported again with
        /// it, then the people built again (their flank correctives, skin points, layers and prefabs from the slimmed mesh).</summary>
        public static void Rebuild()
        {
            var root = RocketboxImportPostprocessor.People.TrimEnd('/');
            foreach (var dir in Directory.GetDirectories(root).OrderBy(d => d))
            {
                var id = Path.GetFileName(dir);
                var fbx = $"{root}/{id}/{id}.fbx";
                if (!File.Exists(PathFor(fbx))) continue;
                AssetDatabase.ImportAsset(PathFor(fbx), ImportAssetOptions.ForceUpdate);
                AssetDatabase.ImportAsset(fbx, ImportAssetOptions.ForceUpdate);
                Debug.Log($"BodySlim: {id} imported with its slim");
            }
            RocketboxPeopleBuild.Build();
        }

        /// <summary>SLIM_DUMP ("id,id", or every person) to SLIM_OUT (a folder): each person's meshes in its bind pose as the
        /// game imports them, less any slim already applied (world space, metres: positions, normals, the four bone weights
        /// of each vertex, triangles), with its bones' places and the body mesh's world-to-mesh matrix, for
        /// tools/unity/people/body_slim.py. Read-only on the project.</summary>
        public static void Dump()
        {
            var root = RocketboxImportPostprocessor.People.TrimEnd('/');
            var outDir = System.Environment.GetEnvironmentVariable("SLIM_OUT") ?? Path.Combine(Application.dataPath, "..", "test-results", "slim");
            Directory.CreateDirectory(outDir);
            var spec = System.Environment.GetEnvironmentVariable("SLIM_DUMP") ?? "";
            var ids = spec.Length > 0 ? spec.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray()
                                      : Directory.GetDirectories(root).Select(Path.GetFileName).OrderBy(x => x).ToArray();
            foreach (var id in ids)
            {
                var fbx = $"{root}/{id}/{id}.fbx";
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(fbx);
                if (model == null) { Debug.LogWarning($"BodySlim: no {fbx}"); continue; }
                var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
                try
                {
                    go.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
                    var body = Body(go);
                    var rends = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).ToArray();
                    using var w = new BinaryWriter(File.Create(Path.Combine(outDir, id + ".slimdump")));
                    w.Write("RBD1".ToCharArray());
                    w.Write(rends.Length);
                    var worst = 0f;
                    foreach (var r in rends)
                    {
                        var m = r.sharedMesh;
                        var isBody = r == body;
                        var v = m.vertices; var nr = m.normals; var bw = m.boneWeights; var tris = m.triangles;
                        // the bind pose as posed: the sharedMesh's vertices in the renderer's space (checked against a bake)
                        var baked = new Mesh();
                        r.BakeMesh(baked, true);
                        var bv = baked.vertices;
                        var l2w = r.transform.localToWorldMatrix;
                        var rot = r.transform.rotation; var pos = r.transform.position;
                        for (var i = 0; i < Mathf.Min(bv.Length, v.Length); i += 7) worst = Mathf.Max(worst, ((pos + rot * bv[i]) - l2w.MultiplyPoint3x4(v[i])).magnitude);
                        Object.DestroyImmediate(baked);
                        if (isBody)
                        {
                            var (dp, _) = ReadFor(fbx, m.vertexCount);
                            if (dp != null) for (var i = 0; i < v.Length; i++) v[i] -= dp[i];
                        }
                        w.Write(isBody ? 1 : 0);
                        w.Write(v.Length);
                        for (var i = 0; i < v.Length; i++) { var p = l2w.MultiplyPoint3x4(v[i]); w.Write(p.x); w.Write(p.y); w.Write(p.z); }
                        for (var i = 0; i < v.Length; i++) { var q = nr != null && i < nr.Length ? l2w.MultiplyVector(nr[i]).normalized : Vector3.zero; w.Write(q.x); w.Write(q.y); w.Write(q.z); }
                        var names = r.bones.Select(b => b != null ? b.name : "").ToArray();
                        for (var i = 0; i < v.Length; i++)
                        {
                            var b = bw != null && i < bw.Length ? bw[i] : default;
                            w.Write(b.boneIndex0); w.Write(b.boneIndex1); w.Write(b.boneIndex2); w.Write(b.boneIndex3);
                            w.Write(b.weight0); w.Write(b.weight1); w.Write(b.weight2); w.Write(b.weight3);
                        }
                        w.Write(names.Length);
                        foreach (var n in names) w.Write(n);
                        w.Write(tris.Length);
                        foreach (var t in tris) w.Write(t);
                        var w2m = r.transform.worldToLocalMatrix;
                        for (var k = 0; k < 16; k++) w.Write(w2m[k]);
                    }
                    var all = go.GetComponentsInChildren<Transform>(true);
                    w.Write(all.Length);
                    foreach (var t in all) { w.Write(t.name); w.Write(t.position.x); w.Write(t.position.y); w.Write(t.position.z); }
                    Debug.Log($"BodySlim: dumped {id} ({rends.Length} meshes; bind against bake {worst * 100f:0.00} cm at most)");
                }
                finally { Object.DestroyImmediate(go); }
            }
        }
    }
}
