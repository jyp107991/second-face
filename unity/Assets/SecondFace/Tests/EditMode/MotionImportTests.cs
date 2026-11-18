#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>Every captured clip (Assets/SecondFace/Motion) is retargeted from its own file's T-pose, with the hands on the
    /// hand bones (MotionImportPostprocessor). Unity, left to itself, stores the configuration of a clip's first import, filled
    /// from that take's first key with every limb as captured, and reuses it on every re-export: the Neck2 rig errors of motion
    /// set v6, the CMU clips' wrist turn thrown away (the twist bone mapped as the hand) and every jogger's stance sole raised
    /// by v6.1's first keys all came from there (docs/MOTION_ROOT_CAUSE.md §7, 2026-11-17).</summary>
    public class MotionImportTests
    {
        private const string Dir = "Assets/SecondFace/Motion/";

        private static readonly string[] Mapped =
        {
            "Hips", "Spine", "Chest", "UpperChest", "Neck", "Head",
            "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand",
            "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "LeftToes", "RightUpperLeg", "RightLowerLeg", "RightFoot", "RightToes",
        };

        /// <summary>The file's default pose, the converters' T-pose (`t_pose_key`): the model read without its take (with it,
        /// Unity poses the model at the take's first key). A copy, imported and removed.</summary>
        private static Dictionary<string, (Vector3 p, Quaternion r, string parent)> TPose(string path)
        {
            var copy = "Assets/MotionImportTests_" + Path.GetFileName(path);
            AssetDatabase.CopyAsset(path, copy);
            try
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(copy);
                imp.importAnimation = false; imp.animationType = ModelImporterAnimationType.None; imp.userData = "";
                imp.materialImportMode = ModelImporterMaterialImportMode.None;
                imp.SaveAndReimport();
                var go = AssetDatabase.LoadAssetAtPath<GameObject>(copy);
                return go.GetComponentsInChildren<Transform>(true).Where(t => t != go.transform).GroupBy(t => t.name)
                    .ToDictionary(g => g.Key, g => (g.First().localPosition, g.First().localRotation, g.First().parent == go.transform ? "" : g.First().parent.name));
            }
            finally { AssetDatabase.DeleteAsset(copy); }
        }

        /// <summary>Unity's own avatar setup normalises these from the file's T-pose: the hips turned to face +Z and set at the
        /// root's height, the shoulders and upper arms levelled (the bodies' avatars are set up the same way). Every other bone
        /// is the file's T-pose itself.</summary>
        private static readonly string[] Normalised = { "Hips", "LeftShoulder", "RightShoulder", "LeftUpperArm", "RightUpperArm" };

        /// <summary>Each configured bone's position in the root's frame (the configuration's local transforms, chained by the
        /// file's own hierarchy).</summary>
        private static Dictionary<string, Vector3> Placed(SkeletonBone[] sk, Dictionary<string, (Vector3 p, Quaternion r, string parent)> hier)
        {
            var local = sk.Skip(1).GroupBy(b => b.name).ToDictionary(g => g.Key, g => g.First());
            var world = new Dictionary<string, (Vector3 p, Quaternion r)>();
            (Vector3 p, Quaternion r) W(string n)
            {
                if (world.TryGetValue(n, out var w)) return w;
                var b = local[n];
                (Vector3 p, Quaternion r) parent = hier.TryGetValue(n, out var h) && h.parent != "" && local.ContainsKey(h.parent) ? W(h.parent) : (Vector3.zero, Quaternion.identity);
                return world[n] = (parent.p + parent.r * b.position, parent.r * b.rotation);
            }
            return local.Keys.ToDictionary(n => n, n => W(n).p);
        }

        /// <summary>The segments compared across clips, and how far apart each may point: the limbs are the T-pose's own
        /// (2026-11-17: legs 0.0°, arms within 6.0°, levelled by Unity in each body's frame); the spine, neck and feet are each
        /// subject's own anatomy (the spine's curve, the foot's arch: within 25° across CMU's subjects); a first key's limbs
        /// were 90-160° apart.</summary>
        private static float Spread(string from) => from.Contains("Arm") || from.Contains("Leg") ? 10f : 30f;

        private static readonly (string From, string To)[] Segments =
        {
            ("Hips", "Spine"), ("Spine", "Chest"), ("Chest", "UpperChest"), ("UpperChest", "Neck"), ("Neck", "Head"),
            ("LeftUpperArm", "LeftLowerArm"), ("LeftLowerArm", "LeftHand"), ("RightUpperArm", "RightLowerArm"), ("RightLowerArm", "RightHand"),
            ("LeftUpperLeg", "LeftLowerLeg"), ("LeftLowerLeg", "LeftFoot"), ("RightUpperLeg", "RightLowerLeg"), ("RightLowerLeg", "RightFoot"),
            // (the feet: each take's own flat stance since 2026-11-18, TakeStance; StandOnTheGroundTests holds them)
        };

        private static IEnumerable<string> Clips() => Directory.GetFiles(Dir, "*.fbx").Select(p => p.Replace('\\', '/')).OrderBy(p => p);

        [Test]
        public void EveryClipIsConfiguredFromItsOwnTPoseWithTheHandsOnTheHandBones()
        {
            var wrong = new List<string>();
            var n = 0;
            foreach (var path in Clips())
            {
                n++;
                var name = Path.GetFileNameWithoutExtension(path);
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                using (var sha = System.Security.Cryptography.SHA256.Create())
                {
                    var stamp = "stood-2 " + System.BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-", "").ToLowerInvariant();
                    if (imp.userData != stamp && imp.userData != stamp + " seated") wrong.Add($"{name}: configured for other bytes than its file's ({imp.userData?.Split(' ').FirstOrDefault()})");
                }
                var hd = imp.humanDescription;
                if (hd.human.Length != Mapped.Length || hd.human.Any(h => h.boneName != h.humanName || !Mapped.Contains(h.humanName)))
                    wrong.Add($"{name}: mapped {string.Join(", ", hd.human.Where(h => h.boneName != h.humanName).Select(h => h.humanName + "=" + h.boneName))} ({hd.human.Length} bones)");
                var byName = TPose(path);
                // (the feet: stood at the actor's own flat-foot turn, checked by TheClipsAndTheBodiesStandOnTheirGround)
                foreach (var b in hd.skeleton.Skip(1).Where(b => !Normalised.Contains(b.name) && b.name != "LeftFoot" && b.name != "RightFoot"))
                {
                    if (!byName.TryGetValue(b.name, out var t)) { wrong.Add($"{name}: {b.name} in the configuration, not in the model"); continue; }
                    var deg = Quaternion.Angle(b.rotation, t.r);
                    if (deg > 0.5f) wrong.Add($"{name}: {b.name} configured {deg:0.0}° off the T-pose");
                    if ((b.position - t.p).magnitude > 0.001f) wrong.Add($"{name}: {b.name} configured {(b.position - t.p).magnitude * 100f:0.0} cm off the T-pose");
                }
                if (hd.skeleton.Length < 2) wrong.Add($"{name}: no configuration stored");
                else
                {
                    // where Unity normalises, what it normalises to: the upper arms level, out to the sides (Unity levels them in
                    // the body's own frame: within 4.6° of the root's horizontal on the 38 clips of 2026-11-17, where a first
                    // key's arms hang 60-90° down)
                    var at = Placed(hd.skeleton, byName);
                    foreach (var (arm, elbow) in new[] { ("LeftUpperArm", "LeftLowerArm"), ("RightUpperArm", "RightLowerArm") })
                    {
                        var d = (at[elbow] - at[arm]).normalized;
                        var tilt = Mathf.Asin(Mathf.Clamp(d.y, -1f, 1f)) * Mathf.Rad2Deg;
                        if (Mathf.Abs(tilt) > 10f) wrong.Add($"{name}: {arm} configured {tilt:0.0}° off level");
                    }
                }
                var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                if (avatar == null || !avatar.isValid || !avatar.isHuman) wrong.Add($"{name}: no valid Humanoid avatar");
            }
            Assert.That(n, Is.GreaterThan(0), "no captured clips found");
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }

        /// <summary>The clips of one skeleton (the converters' CMU and ACCAD ones) share one reference: their configured
        /// segments point the same way (arms out, legs down, the spine up), where Unity's first keys put the same bone of two
        /// clips 90-160° apart (2026-11-17). The bones' own roll is each subject's, so the limbs' directions are compared.</summary>
        [Test]
        public void ClipsOfOneSkeletonShareOneReference()
        {
            var report = new List<string>();
            var wrong = new List<string>();
            var all = Clips().Select(p => (p, hd: ((ModelImporter)AssetImporter.GetAtPath(p)).humanDescription)).ToList();
            foreach (var group in all.GroupBy(x => string.Join(",", x.hd.skeleton.Skip(1).Select(b => b.name).OrderBy(s => s))))
            {
                var clips = group.Select(c => (c.p, at: Placed(c.hd.skeleton, TPose(c.p)))).ToList();
                foreach (var (from, to) in Segments)
                {
                    var dirs = clips.Where(c => c.at.ContainsKey(from) && c.at.ContainsKey(to)).Select(c => (c.p, d: (c.at[to] - c.at[from]).normalized)).ToList();
                    var worst = 0f; var pair = "";
                    for (var i = 0; i < dirs.Count; i++)
                        for (var j = i + 1; j < dirs.Count; j++)
                        {
                            var a = Vector3.Angle(dirs[i].d, dirs[j].d);
                            if (a > worst) { worst = a; pair = $"{Path.GetFileNameWithoutExtension(dirs[i].p)}/{Path.GetFileNameWithoutExtension(dirs[j].p)}"; }
                        }
                    report.Add($"{dirs.Count} clips, {from}->{to}: {worst:0.0}° ({pair})");
                    if (worst > Spread(from)) wrong.Add($"{from}->{to}: {worst:0.0}° apart ({pair})");
                }
            }
            Debug.Log("MotionImportTests: the configured segments across clips of one skeleton\n" + string.Join("\n", report));
            Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
        }
    }
}
#endif
