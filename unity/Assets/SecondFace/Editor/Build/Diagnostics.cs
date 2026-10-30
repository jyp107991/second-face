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
        /// <summary>The skin's head frame as baked (P4.15): the rest map's values at the top of the head, the nose's tip and the
        /// eyes' height on each base, against the mesh's own positions (tools/unity/editor.sh run
        /// SecondFace.EditorTools.Diagnostics.HeadFrame).</summary>
        /// <summary>Reimports every person asset of the player bases from its source (after an import cut short, e.g. by a
        /// full disk: "Build asset version error" in the log).</summary>
        public static void ReimportPeople()
        {
            var paths = Directory.GetFiles("Assets/SecondFace/People/Player", "*.*", SearchOption.AllDirectories)
                .Where(p => !p.EndsWith(".meta")).Select(p => p.Replace('\\', '/')).ToList();
            AssetDatabase.StartAssetEditing();
            try { foreach (var p in paths) AssetDatabase.ImportAsset(p, ImportAssetOptions.ForceUpdate); }
            finally { AssetDatabase.StopAssetEditing(); }
            AssetDatabase.Refresh();
            Debug.Log($"DIAG reimported {paths.Count} person assets");
        }

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
    }
}
