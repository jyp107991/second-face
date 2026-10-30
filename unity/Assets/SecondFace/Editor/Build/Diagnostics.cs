using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Prints what the importers actually produced, for checks from the command line
    /// (tools/unity/editor.sh run SecondFace.EditorTools.Diagnostics.Report): material slot names on people, the root
    /// rotation and bounds of kit pieces, the bounds of baked nature models.
    /// </summary>
    public static class Diagnostics
    {
        /// <summary>Reimports every person asset of the player bases from its source (after an import cut short, e.g. by a
        /// full disk: "Build asset version error" in the log). SF_REIMPORT (comma-separated parts of a file name) narrows it
        /// to the files that match.</summary>
        public static void ReimportPeople()
        {
            var only = (System.Environment.GetEnvironmentVariable("SF_REIMPORT") ?? "").Split(',', System.StringSplitOptions.RemoveEmptyEntries);
            var paths = Directory.GetFiles("Assets/SecondFace/People/Player", "*.*", SearchOption.AllDirectories)
                .Where(p => !p.EndsWith(".meta")).Select(p => p.Replace('\\', '/'))
                .Where(p => only.Length == 0 || only.Any(o => Path.GetFileName(p).Contains(o))).ToList();
            AssetDatabase.StartAssetEditing();
            try { foreach (var p in paths) AssetDatabase.ImportAsset(p, ImportAssetOptions.ForceUpdate); }
            finally { AssetDatabase.StopAssetEditing(); }
            AssetDatabase.Refresh();
            Debug.Log($"DIAG reimported {paths.Count} person assets");
        }

        /// <summary>The skin's head frame as baked (P4.15): the rest map's values at the top of the head, the nose's tip and the
        /// eyes' height on each base, against the mesh's own positions (tools/unity/editor.sh run
        /// SecondFace.EditorTools.Diagnostics.HeadFrame).</summary>
        public static void HeadFrame()
        {
            foreach (var b in new[] { "player_f", "player_m" })
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{b}.prefab");
                var body = prefab.GetComponentsInChildren<SkinnedMeshRenderer>(true).First(r => r.name == "Body_LOD0");
                var rest = body.sharedMaterial.GetTexture("_RestMap") as Texture2D;
                var mesh = body.sharedMesh;
                var v = mesh.vertices;
                var ids = new System.Collections.Generic.List<Vector2>(); mesh.GetUVs(1, ids);
                var px = rest.GetPixels();
                Color R(int i) => px[Mathf.RoundToInt(ids[i].x) + Mathf.RoundToInt(ids[i].y) * 128];
                int top = 0;
                for (var i = 0; i < v.Length; i++) if (v[i].y > v[top].y) top = i;
                int front = -1, back = -1, left = -1;
                for (var i = 0; i < v.Length; i++)
                {
                    if (Mathf.Abs(v[i].y - (v[top].y - 0.13f)) > 0.02f || Mathf.Abs(v[i].x) > 0.09f) continue;
                    if (front < 0 || v[i].z < v[front].z) front = i;
                    if (back < 0 || v[i].z > v[back].z) back = i;
                    if (left < 0 || v[i].x > v[left].x) left = i;
                }
                Debug.Log($"HEADFRAME {b}: top {v[top]} rest {R(top)} | most -z {v[front]} rest {R(front)} | most +z {v[back]} rest {R(back)} | most +x {v[left]} rest {R(left)} | bounds {mesh.bounds}");
                // the face's relief in the frame: for cells of x (0.05) and y (0.05), the most forward z (the nose stands
                // out of it; the beard's mask keeps off it, P4.15b)
                var cells = new System.Collections.Generic.Dictionary<(int, int), float>();
                for (var i = 0; i < v.Length; i++)
                {
                    var c = R(i);
                    if (c.a < 0.5f || c.b < 0.3f || c.g < -0.8f || c.g > 0.35f || Mathf.Abs(c.r) > 0.6f) continue;
                    var k = (Mathf.FloorToInt(c.r / 0.05f), Mathf.FloorToInt(c.g / 0.05f));
                    cells[k] = cells.TryGetValue(k, out var z) ? Mathf.Max(z, c.b) : c.b;
                }
                for (var y = 6; y >= -16; y--)
                    Debug.Log($"RELIEF {b} y {y * 0.05f:+0.00;-0.00}: " + string.Join(" ", Enumerable.Range(-12, 24).Select(x => cells.TryGetValue((x, y), out var z) ? $"{z:0.00}" : " -- ")));
            }
        }

        public static void Report()
        {
            foreach (var path in Directory.GetFiles("Assets/SecondFace/People/Bakeoff", "*.fbx").Take(2))
            {
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(path.Replace('\\', '/'));
                if (go == null) { Debug.Log($"DIAG person {path}: not imported"); continue; }
                var names = go.GetComponentsInChildren<Renderer>(true).SelectMany(r => r.sharedMaterials).Where(m => m != null).Select(m => m.name).Distinct();
                var anim = go.GetComponent<Animator>();
                Debug.Log($"DIAG person {Path.GetFileName(path)} human={(anim != null && anim.avatar != null && anim.avatar.isHuman)} rootRot={go.transform.localEulerAngles} materials=[{string.Join(" | ", names)}]");
            }
            foreach (var path in new[] { "Assets/SecondFace/Kits/Frontier/adobe_wall_window.fbx", "Assets/SecondFace/Kits/Shelter/wall_ring.fbx" })
            {
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (go == null) { Debug.Log($"DIAG kit {path}: not imported"); continue; }
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var b = Bounds(go);
                Debug.Log($"DIAG kit {Path.GetFileName(path)} bakeAxisConversion={imp.bakeAxisConversion} rootRot={go.transform.localEulerAngles} childRots=[{string.Join(" ", go.GetComponentsInChildren<Transform>().Skip(1).Select(t => t.localEulerAngles.ToString()))}] size={b.size}");
            }
            foreach (var key in new[] { "quiver_tree_01", "shrub_02_v1", "namaqualand_boulder_03", "grass_medium_01_v3" })
            {
                var path = $"Assets/SecondFace/Models/Nature/{key}.fbx";
                var bound = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/nature/{key}.prefab");
                if (bound != null)
                {
                    var bm = bound.GetComponentsInChildren<Renderer>(true).SelectMany(r => r.sharedMaterials).Where(m => m != null).Select(m => $"{m.name}({m.shader.name})").Distinct();
                    Debug.Log($"DIAG nature prefab {key} rootScale={bound.transform.localScale} rootRot={bound.transform.localEulerAngles} size={Bounds(bound).size} materials=[{string.Join(" | ", bm)}]");
                }
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (go == null) { Debug.Log($"DIAG nature {key}: not imported"); continue; }
                var nimp = (ModelImporter)AssetImporter.GetAtPath(path);
                Debug.Log($"DIAG nature model {key} bakeAxisConversion={nimp.bakeAxisConversion} rootRot={go.transform.localEulerAngles} children={go.transform.childCount}");
                var mats = go.GetComponentsInChildren<Renderer>(true).SelectMany(r => r.sharedMaterials).Where(m => m != null).Select(m => $"{m.name}({m.shader.name})").Distinct();
                Debug.Log($"DIAG nature {key} size={Bounds(go).size} materials=[{string.Join(" | ", mats)}]");
            }
        }

        /// <summary>World bounds of the first instances in each scatter group of the built vegetation scene.</summary>
        public static void Vegetation()
        {
            var scene = UnityEditor.SceneManagement.EditorSceneManager.OpenScene("Assets/SecondFace/Scenes/Test_Vegetation.unity");
            foreach (var root in scene.GetRootGameObjects())
            {
                if (root.transform.childCount == 0) continue;
                Debug.Log($"DIAG group {root.name}: {root.transform.childCount} instances");
                for (var i = 0; i < Mathf.Min(3, root.transform.childCount); i++)
                {
                    var t = root.transform.GetChild(i);
                    var rs = t.GetComponentsInChildren<Renderer>();
                    if (rs.Length == 0) { Debug.Log($"DIAG   {t.name}: no renderer"); continue; }
                    var b = rs[0].bounds; foreach (var r in rs) b.Encapsulate(r.bounds);
                    var ground = Terrain.activeTerrain != null ? Terrain.activeTerrain.SampleHeight(t.position) : float.NaN;
                    Debug.Log($"DIAG   {t.name} pos={t.position} rot={t.eulerAngles} scale={t.localScale.x:F2} boundsMin={b.min} boundsMax={b.max} ground={ground:F2} enabled={rs[0].enabled} mat={rs[0].sharedMaterial?.name}");
                }
            }
        }

        private static Bounds Bounds(GameObject go)
        {
            var rs = go.GetComponentsInChildren<MeshFilter>(true);
            var b = new Bounds(Vector3.zero, Vector3.zero); var first = true;
            foreach (var mf in rs)
            {
                if (mf.sharedMesh == null) continue;
                var m = mf.transform.localToWorldMatrix * Matrix4x4.Inverse(go.transform.localToWorldMatrix);
                var mb = mf.sharedMesh.bounds;
                foreach (var c in new[] { mb.min, mb.max, new Vector3(mb.min.x, mb.max.y, mb.min.z), new Vector3(mb.max.x, mb.min.y, mb.max.z) })
                {
                    var p = m.MultiplyPoint3x4(c);
                    if (first) { b = new Bounds(p, Vector3.zero); first = false; } else b.Encapsulate(p);
                }
            }
            return b;
        }
            /// <summary>A garment bound on a base (SF_GARMENT, default mindfront_male_trousers_1 on player_m): its unmapped bones,
        /// and how far each of its blend shapes at full weight stretches its longest edge (a torn sheet of triangles, P4.15b).</summary>
        public static void GarmentFin()
        {
            var id = System.Environment.GetEnvironmentVariable("SF_GARMENT") ?? "mindfront_male_trousers_1";
            var b = System.Environment.GetEnvironmentVariable("SF_BASE") ?? "player_m";
            var go = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{b}.prefab"));
            var w = go.GetComponent<SecondFace.Game.People.Wardrobe>();
            Debug.Log($"FIN equip {id}: {w.Equip(id)}");
            var group = go.GetComponent<LODGroup>();
            Debug.Log($"FIN LODGroup on root: {group != null}; in children: {go.GetComponentsInChildren<LODGroup>(true).Length}");
            if (group != null)
                foreach (var (lod, n) in group.GetLODs().Select((l, n) => (l, n)))
                    Debug.Log($"FIN LOD{n} at {lod.screenRelativeTransitionHeight:0.000}: {string.Join(", ", lod.renderers.Where(x => x != null).Select(x => x.name))}");
            foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.name.Contains(id)))
            {
                var nulls = r.bones.Count(t => t == null);
                Debug.Log($"FIN {r.name}: {r.sharedMesh.vertexCount} vertices, {r.bones.Length} bones ({nulls} unmapped), {r.sharedMesh.blendShapeCount} shapes, root {(r.rootBone ? r.rootBone.name : "none")}");
                var tris = r.sharedMesh.triangles;
                float Longest(Mesh m, out int at)
                {
                    var v = m.vertices; float best = 0; at = -1;
                    for (var t = 0; t < tris.Length; t += 3)
                        for (var e = 0; e < 3; e++)
                        {
                            var d = (v[tris[t + e]] - v[tris[t + (e + 1) % 3]]).magnitude;
                            if (d > best) { best = d; at = tris[t + e]; }
                        }
                    return best;
                }
                var baked = new Mesh();
                r.BakeMesh(baked);
                var rest = Longest(baked, out var ra);
                Debug.Log($"FIN rest longest edge {rest:0.000} m at vertex {ra} {baked.vertices[ra]}");
                // posed: each clip of the locomotion controller at a few times, the longest edge and where it starts
                var ctrl = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
                if (ctrl != null)
                    foreach (var clip in ctrl.animationClips.Distinct().Take(6))
                        foreach (var t in new[] { 0f, 0.5f })
                        {
                            clip.SampleAnimation(go, t * clip.length);
                            r.BakeMesh(baked);
                            var l = Longest(baked, out var la);
                            var bw = r.sharedMesh.GetAllBoneWeights();
                            var per = r.sharedMesh.GetBonesPerVertex();
                            var start = 0; for (var q = 0; q < la; q++) start += per[q];
                            var who = string.Join(" ", Enumerable.Range(start, per[la]).Select(q => $"{(r.bones[bw[q].boneIndex] ? r.bones[bw[q].boneIndex].name : "null")}:{bw[q].weight:0.00}"));
                            Debug.Log($"FIN posed {clip.name}@{t}: longest edge {l:0.000} at vertex {la} ({who})");
                        }
                var src = r.sharedMesh;
                var dv = new Vector3[src.vertexCount];
                for (var k = 0; k < src.blendShapeCount; k++)
                {
                    src.GetBlendShapeFrameVertices(k, src.GetBlendShapeFrameCount(k) - 1, dv, null, null);
                    var big = 0; var at = -1;
                    for (var q = 0; q < dv.Length; q++) if (dv[q].magnitude > (at < 0 ? 0 : dv[at].magnitude)) at = q;
                    for (var q = 0; q < dv.Length; q++) if (dv[q].magnitude > 0.12f) big++;
                    r.SetBlendShapeWeight(k, 100f);
                    r.BakeMesh(baked);
                    var l = Longest(baked, out var la);
                    r.SetBlendShapeWeight(k, 0f);
                    if (l > rest * 1.3f || big > 0)
                        Debug.Log($"FIN shape {src.GetBlendShapeName(k)}: longest edge {l:0.000} at {la}; largest delta {dv[at].magnitude:0.000} at {at}; {big} deltas over 12 cm");
                }
            }
            Object.DestroyImmediate(go);
            Debug.Log("FIN done");
        }
    
        /// <summary>Every garment of the player sets, each level of detail baked at rest: how far its surface strays from the
        /// full-detail mesh (the farthest of each triangle's centre and edge midpoints from the nearest full-detail vertex;
        /// a decimation that bridged two parts of the cloth leaves a sliver standing out, P4.15b).</summary>
        public static void GarmentLods()
        {
            foreach (var b in new[] { "player_f", "player_m" })
            {
                var set = AssetDatabase.LoadAssetAtPath<SecondFace.Game.People.WardrobeSet>($"Assets/SecondFace/People/Player/{b}_wardrobe.asset");
                foreach (var g in set.Garments)
                {
                    var go = (GameObject)PrefabUtility.InstantiatePrefab(g.Prefab);
                    var rs = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).OrderBy(r => r.name).ToList();
                    // each level's renderer has its own transform: compared in the model's space, not each one's own
                    Mesh Bake(SkinnedMeshRenderer r)
                    {
                        var m = new Mesh(); r.BakeMesh(m);
                        var to = go.transform.worldToLocalMatrix * Matrix4x4.TRS(r.transform.position, r.transform.rotation, Vector3.one);
                        m.vertices = m.vertices.Select(p => to.MultiplyPoint3x4(p)).ToArray();
                        return m;
                    }
                    var full = rs.FirstOrDefault(r => r.name.EndsWith("_LOD0"));
                    if (full == null) { Object.DestroyImmediate(go); continue; }
                    var f = Bake(full).vertices;
                    const float cell = 0.04f;
                    var grid = new System.Collections.Generic.Dictionary<Vector3Int, System.Collections.Generic.List<Vector3>>();
                    Vector3Int Key(Vector3 p) => new(Mathf.FloorToInt(p.x / cell), Mathf.FloorToInt(p.y / cell), Mathf.FloorToInt(p.z / cell));
                    foreach (var p in f) { var k = Key(p); if (!grid.TryGetValue(k, out var l)) grid[k] = l = new(); l.Add(p); }
                    float Near(Vector3 p)
                    {
                        var k = Key(p);
                        var best = float.MaxValue;   // the nearest so far, kept as the search widens
                        for (var ring = 0; ring < 8; ring++)
                        {
                            for (var x = -ring; x <= ring; x++) for (var y = -ring; y <= ring; y++) for (var z = -ring; z <= ring; z++)
                            {
                                if (Mathf.Max(Mathf.Abs(x), Mathf.Abs(y), Mathf.Abs(z)) != ring) continue;
                                if (grid.TryGetValue(k + new Vector3Int(x, y, z), out var l)) foreach (var q in l) best = Mathf.Min(best, (q - p).sqrMagnitude);
                            }
                            if (best < float.MaxValue && Mathf.Sqrt(best) <= ring * cell) return Mathf.Sqrt(best);
                        }
                        return 8 * cell;
                    }
                    var parts = rs.Where(r => r != full).Select(r =>
                    {
                        var m = Bake(r); var v = m.vertices; var t = m.triangles; float worst = 0;
                        for (var i = 0; i < t.Length; i += 3)
                        {
                            Vector3 a = v[t[i]], c = v[t[i + 1]], d = v[t[i + 2]];
                            worst = Mathf.Max(worst, Near((a + c + d) / 3f), Mathf.Max(Near((a + c) / 2f), Mathf.Max(Near((c + d) / 2f), Near((a + d) / 2f))));
                        }
                        Object.DestroyImmediate(m);
                        return $"{r.name.Substring(r.name.LastIndexOf('_') + 1)} {t.Length / 3}t {worst:0.000}";
                    });
                    Debug.Log($"LODS {b} {g.Id}: {string.Join(" | ", parts)}");
                    Object.DestroyImmediate(go);
                }
            }
            Debug.Log("LODS done");
        }
    }
}
