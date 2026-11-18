#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>Temporary diagnostic (the gate agent's, not committed): Unity's Foot IK on the consistent reference (the clip's
    /// T-pose stood on its take's floor at the flat-foot angle, Original, the bodies' T-pose on their root).</summary>
    public class SoleProbe5Tests
    {
        private static readonly string[] Clips = { "jog", "jog_b", "jog_f", "run", "run_c", "walk", "walk_b", "walk_slow", "walk_d", "walk_brisk_b", "walk_slow_b", "walk_f_b", "sneak", "idle_m", "idle_f" };
        private static readonly string[] Bodies = { "Sports_Male_04", "Medical_Female_01" };

        [Test]
        public void FootIkOnTheConsistentReference()
        {
            var sb = new StringBuilder();
            if (!AssetDatabase.IsValidFolder("Assets/ProbeTmp")) AssetDatabase.CreateFolder("Assets", "ProbeTmp");
            var grounded = Bodies.ToDictionary(id => id, id => SoleProbe3Tests.Grounded(id, out _));
            foreach (var clip in Clips)
            {
                var path = "Assets/SecondFace/Motion/" + clip + ".fbx";
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var inst = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path));
                var parent = inst.GetComponentsInChildren<Transform>(true).Where(t => t.parent != null).ToDictionary(t => t.name, t => t.parent.name);
                Object.DestroyImmediate(inst);
                var st = SoleProbe4Tests.Measure(path);
                var hd = SoleProbe4Tests.Stood(imp.humanDescription, parent, st, true, out var note);
                sb.AppendLine($"STAND {clip}: {note}");
                var c = SoleProbe4Tests.Import(path, "feet_orig", hd, true);
                foreach (var id in Bodies)
                {
                    var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/People/Rocketbox/{id}/{id}.prefab");
                    foreach (var ik in new[] { false, true })
                    {
                        var go = Object.Instantiate(prefab); var a = SoleProbeTests.Prep(go, grounded[id]);
                        sb.AppendLine($"{clip,-12} {id,-18} {(ik ? "footIK" : "noIK  ")}: {SoleProbe3Tests.StanceOf(go, a, c, ik)}");
                        Object.DestroyImmediate(go);
                    }
                }
                AssetDatabase.DeleteAsset($"Assets/ProbeTmp/fix_{clip}_feet_orig.fbx");
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "..", "test-results", "sole_probe5.txt"), sb.ToString());
        }
    }
}
#endif
