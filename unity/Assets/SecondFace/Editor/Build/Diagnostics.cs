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
            foreach (var key in new[] { "quiver_tree_01", "shrub_02", "namaqualand_boulder_03" })
            {
                var path = $"Assets/SecondFace/Models/Nature/{key}.glb";
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (go == null) { Debug.Log($"DIAG nature {key}: not imported"); continue; }
                var mats = go.GetComponentsInChildren<Renderer>(true).SelectMany(r => r.sharedMaterials).Where(m => m != null).Select(m => $"{m.name}({m.shader.name})").Distinct();
                Debug.Log($"DIAG nature {key} size={Bounds(go).size} materials=[{string.Join(" | ", mats)}]");
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
