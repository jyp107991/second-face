#if UNITY_EDITOR
using System.Collections;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    // TEMP probe (relaunch 16, step 1's pre-check P1 a; never committed; not gate-hashed): every person of the catalogue as
    // the prefab stands (under an inactive parent: no component wakes), every skinned renderer baked, its vertices in the
    // person's root frame written to BIND_DUMP_DIR/<id>.bin (float32 x,y,z), and every transform's place and turn in the root
    // frame to <id>_bones.txt. Run before and after a change; compare the two directories.
    public class BindDumpTests
    {
        [UnityTest, Timeout(3600000)]
        public IEnumerator DumpTheBinds()
        {
            var dir = System.Environment.GetEnvironmentVariable("BIND_DUMP_DIR");
            Assert.That(string.IsNullOrEmpty(dir), Is.False, "BIND_DUMP_DIR");
            Directory.CreateDirectory(dir);
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            Assert.That(cat, Is.Not.Null, "catalogue");
            var hold = new GameObject("bind dump (inactive)");
            hold.SetActive(false);
            var sum = new StringBuilder();
            foreach (var e in cat.People.OrderBy(p => p.Id))
            {
                var go = Object.Instantiate(e.Prefab, Vector3.zero, Quaternion.identity, hold.transform);
                var root = go.transform;
                using (var bw = new BinaryWriter(File.Open(Path.Combine(dir, e.Id + ".bin"), FileMode.Create)))
                {
                    var n = 0;
                    foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true).OrderBy(x => PathOf(x.transform, root)))
                    {
                        var m = new Mesh();
                        r.BakeMesh(m, true);
                        var v = m.vertices;
                        var M = root.worldToLocalMatrix * r.transform.localToWorldMatrix;
                        foreach (var p in v) { var q = M.MultiplyPoint3x4(p); bw.Write(q.x); bw.Write(q.y); bw.Write(q.z); }
                        sum.AppendLine($"{e.Id}\t{PathOf(r.transform, root)}\t{v.Length}\t{(r.sharedMesh != null ? r.sharedMesh.name : "-")}\t{r.bones.Length}");
                        n += v.Length;
                        Object.DestroyImmediate(m);
                    }
                }
                var bones = new StringBuilder();
                foreach (var t in go.GetComponentsInChildren<Transform>(true).OrderBy(x => x.name))
                {
                    var p = root.InverseTransformPoint(t.position); var q = Quaternion.Inverse(root.rotation) * t.rotation;
                    bones.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0}\t{1}\t{2:R}\t{3:R}\t{4:R}\t{5:R}\t{6:R}\t{7:R}\t{8:R}",
                        t.name, t.parent != null ? t.parent.name : "-", p.x, p.y, p.z, q.x, q.y, q.z, q.w));
                }
                File.WriteAllText(Path.Combine(dir, e.Id + "_bones.txt"), bones.ToString());
                Object.DestroyImmediate(go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(dir, "renderers.tsv"), sum.ToString());
            Object.DestroyImmediate(hold);
            Debug.Log("BindDump done: " + cat.People.Length);
        }

        private static string PathOf(Transform t, Transform root)
        {
            var s = t.name;
            for (var x = t.parent; x != null && x != root; x = x.parent) s = x.name + "/" + s;
            return s;
        }
    }
}
#endif
