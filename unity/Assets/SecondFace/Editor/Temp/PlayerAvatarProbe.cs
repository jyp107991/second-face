// TEMP (never commit): why grounding the player bodies breaks them (editor hand-off 1127d)
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace SecondFace.EditorTools
{
    public static class PlayerAvatarProbe
    {
        static readonly string[] Paths = { "Assets/SecondFace/People/Player/player_m.fbx", "Assets/SecondFace/People/Player/player_f.fbx" };
        static StringBuilder sb;
        static void L(string s) { sb.AppendLine(s); }

        static string Stamp(string path)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            return System.BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(path))).Replace("-", "").ToLowerInvariant();
        }

        /// PROBE_END = fresh | verbatim | grounded (the state left for the next test run)
        public static void Run()
        {
            sb = new StringBuilder();
            var end = System.Environment.GetEnvironmentVariable("PROBE_END") ?? "fresh";
            Directory.CreateDirectory("test-results/player_probe");
            foreach (var p in Paths) Facts(p, "grounded");
            // fresh: Ground skipped for the players, the bones mapped afresh as on dfc
            foreach (var p in Paths) { var imp = (ModelImporter)AssetImporter.GetAtPath(p); imp.userData = ""; imp.SaveAndReimport(); Facts(p, "fresh"); }
            // verbatim: the fresh getter's description set back unchanged, kept by the stamp
            foreach (var p in Paths)
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(p); var hd = imp.humanDescription; imp.humanDescription = hd;
                imp.userData = "ground " + Stamp(p); imp.SaveAndReimport(); Facts(p, "verbatim");
            }
            // verbatim with the description's globalScale put back at 0 by its serialized property
            foreach (var p in Paths)
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(p);
                var so = new SerializedObject(imp); var gs = so.FindProperty("m_HumanDescription.m_GlobalScale");
                L($"{p} verbatim m_GlobalScale before {(gs != null ? gs.floatValue.ToString() : "n/a")}");
                if (gs != null) { gs.floatValue = 0f; so.ApplyModifiedPropertiesWithoutUndo(); }
                imp.SaveAndReimport(); Facts(p, "verbatim_gs0");
            }
            if (end == "fresh")
            {
                foreach (var p in Paths) { var imp = (ModelImporter)AssetImporter.GetAtPath(p); imp.userData = ""; imp.SaveAndReimport(); Facts(p, "fresh_end"); }
            }
            else if (end == "verbatim")
            {
                foreach (var p in Paths) { var imp = (ModelImporter)AssetImporter.GetAtPath(p); imp.userData = ""; imp.SaveAndReimport(); }
                foreach (var p in Paths)
                {
                    var imp = (ModelImporter)AssetImporter.GetAtPath(p); var hd = imp.humanDescription; imp.humanDescription = hd;
                    imp.userData = "ground " + Stamp(p); imp.SaveAndReimport(); Facts(p, "verbatim_end");
                }
            }
            AssetDatabase.SaveAssets();
            File.WriteAllText("test-results/player_probe/summary.txt", sb.ToString());
            Debug.Log("player_probe:\n" + sb);
        }

        /// The committed player metas re-imported twice (a forced import each time, then GroundAll as a batch run does):
        /// the metas are compared with git's copies by the chain.
        public static void Reimport()
        {
            foreach (var pass in new[] { 1, 2 })
            {
                foreach (var p in Paths) AssetDatabase.ImportAsset(p, ImportAssetOptions.ForceUpdate);
                var n = PeopleImportPostprocessor.GroundAll();
                AssetDatabase.SaveAssets();
                foreach (var p in Paths) File.Copy(p + ".meta", $"test-results/player_probe/{Path.GetFileName(p)}.meta.pass{pass}", true);
                Debug.Log($"player_probe: reimport pass {pass}: GroundAll grounded {n}");
            }
        }

        /// The sit take as recorded (a copy of Motion/sit.fbx read as Generic, as TakeStance.Measure reads a take): the actor's
        /// hips, ankles and toes over the take's lowest foot, at tenths of the clip.
        public static void SitTake()
        {
            sb = new StringBuilder();
            Directory.CreateDirectory("test-results/player_probe");
            foreach (var name in new[] { "sit", "sit_stool", "sit_ground" })
            {
                var path = $"Assets/SecondFace/Motion/{name}.fbx";
                var copy = "Assets/SitTake_" + name + ".fbx";
                AssetDatabase.DeleteAsset(copy);
                if (!AssetDatabase.CopyAsset(path, copy)) { L($"{name}: copy failed"); continue; }
                GameObject go = null;
                try
                {
                    var imp = (ModelImporter)AssetImporter.GetAtPath(copy);
                    imp.userData = ""; imp.animationType = ModelImporterAnimationType.Generic; imp.avatarSetup = ModelImporterAvatarSetup.NoAvatar;
                    imp.importAnimation = true; imp.clipAnimations = imp.defaultClipAnimations; imp.materialImportMode = ModelImporterMaterialImportMode.None;
                    imp.SaveAndReimport();
                    var clip = AssetDatabase.LoadAllAssetsAtPath(copy).OfType<AnimationClip>().First(c => !c.name.StartsWith("__preview__"));
                    go = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(copy));
                    go.transform.position = Vector3.zero;
                    var all = go.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).ToDictionary(g => g.Key, g => g.First());
                    string Y(string b) => all.TryGetValue(b, out var t) ? t.position.y.ToString("0.000") : "-";
                    L($"== {name} take: {clip.length:0.00} s at {clip.frameRate} fps; bones {string.Join(" ", all.Keys.Where(k => k.Contains("Foot") || k.Contains("Toe") || k.Contains("Hips") || k.Contains("Leg")))}");
                    // the floor: the lowest any foot or toe joint reaches over the whole take
                    var n = Mathf.Max(1, Mathf.RoundToInt(clip.length * clip.frameRate)); var floor = float.MaxValue;
                    for (var k = 0; k <= n; k++) { clip.SampleAnimation(go, clip.length * k / n); foreach (var b in new[] { "LeftFoot", "RightFoot", "LeftToes", "RightToes", "LeftToeBase", "RightToeBase" }) if (all.TryGetValue(b, out var t)) floor = Mathf.Min(floor, t.position.y); }
                    L($"  floor (lowest ankle/toe over the take) {floor:0.000} m");
                    for (var k = 0; k <= 10; k++)
                    {
                        clip.SampleAnimation(go, clip.length * Mathf.Min(k / 10f, 0.999f));
                        float H(string b) => all.TryGetValue(b, out var t) ? t.position.y - floor : float.NaN;
                        float Z(string b) => all.TryGetValue(b, out var t) ? t.position.z : float.NaN;
                        L($"  {k / 10f:0.0}: hips {H("Hips"):0.000} ankles L {H("LeftFoot"):0.000} R {H("RightFoot"):0.000} toes L {H("LeftToes"):0.000}/{H("LeftToeBase"):0.000} R {H("RightToes"):0.000}/{H("RightToeBase"):0.000} knees L {H("LeftLeg"):0.000} R {H("RightLeg"):0.000} | z hips {Z("Hips"):0.000} ankL {Z("LeftFoot"):0.000} ankR {Z("RightFoot"):0.000}");
                    }
                }
                finally { if (go != null) Object.DestroyImmediate(go); AssetDatabase.DeleteAsset(copy); }
            }
            File.WriteAllText("test-results/player_probe/sit_take.txt", sb.ToString());
            Debug.Log("player_probe sit take:\n" + sb);
        }

        /// The players' configured T-pose with its trunk stood upright (each of Spine, Chest, UpperChest, Neck turned so its
        /// segment to the next stands vertical in the root's frame, as the cast's Biped T-poses stand), built by AvatarBuilder,
        /// against the same description built as it is; idle_m and the walk sampled on both.
        public static void TrunkTest()
        {
            sb = new StringBuilder();
            Directory.CreateDirectory("test-results/player_probe");
            var idle = AssetDatabase.LoadAllAssetsAtPath("Assets/SecondFace/Motion/idle_m.fbx").OfType<AnimationClip>().First(x => !x.name.StartsWith("__preview"));
            var walk = AssetDatabase.LoadAllAssetsAtPath("Assets/SecondFace/Motion/walk.fbx").OfType<AnimationClip>().First(x => !x.name.StartsWith("__preview"));
            foreach (var path in Paths.Concat(new[] { "Assets/SecondFace/People/Rocketbox/Female_Adult_01/Female_Adult_01.fbx", "Assets/SecondFace/People/Rocketbox/Male_Adult_08/Male_Adult_08.fbx" }))
            {
                var imp = (ModelImporter)AssetImporter.GetAtPath(path);
                var hd = imp.humanDescription;
                var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                var bone = hd.human.ToDictionary(h => h.humanName, h => h.boneName);
                // the getter's skeleton is in metres; AvatarBuilder takes it as the scene's (the instance at scale 1)
                var sk = hd.skeleton.ToArray();
                var chain = new[] { "Spine", "Chest", "UpperChest", "Neck", "Head" }.Where(bone.ContainsKey).ToList();
                var lean = new StringBuilder();
                for (var i = 0; i + 1 < chain.Count; i++)
                {
                    var w = TakeStance.World(sk, model);
                    var b = bone[chain[i]]; var c = bone[chain[i + 1]];
                    var dir = w[c].p - w[b].p;
                    lean.Append($" {chain[i]} {Vector3.SignedAngle(Vector3.up, dir, Vector3.right):+0.0;-0.0}");
                    var R = Quaternion.FromToRotation(dir, Vector3.up);
                    var par = TakeStance.ParentOf(model, b, sk);
                    var j = System.Array.FindIndex(sk, x => x.name == b);
                    if (j < 0 || par == null || !w.ContainsKey(par)) continue;
                    sk[j].rotation = Quaternion.Inverse(w[par].r) * (R * w[b].r);
                }
                L($"== {Path.GetFileNameWithoutExtension(path)}: trunk segments' lean from the vertical about the root's right (deg):{lean}");
                var hd2 = hd; hd2.skeleton = sk;
                foreach (var (tag, desc) in new[] { ("as is", hd), ("upright", hd2) })
                {
                    var go = Object.Instantiate(model); go.transform.SetPositionAndRotation(Vector3.zero, Quaternion.identity);
                    try
                    {
                        var av = AvatarBuilder.BuildHumanAvatar(go, desc);
                        var a = go.GetComponent<Animator>() ?? go.AddComponent<Animator>();
                        a.avatar = av; a.Rebind();
                        var still = FaceRaw(a);
                        if (!AnimationMode.InAnimationMode()) AnimationMode.StartAnimationMode();
                        AnimationMode.BeginSampling(); AnimationMode.SampleAnimationClip(go, idle, idle.length * 0.3f); AnimationMode.EndSampling();
                        var idleS = Pose(a); var idleF = FaceRaw(a) - still;
                        var faces = new StringBuilder();
                        for (var k = 0; k < 8; k++) { AnimationMode.BeginSampling(); AnimationMode.SampleAnimationClip(go, walk, walk.length * k / 8f); AnimationMode.EndSampling(); faces.Append($" {FaceRaw(a) - still:+0;-0}"); }
                        AnimationMode.StopAnimationMode();
                        L($"  {tag}: valid {av.isValid} | idle_m 0.3: {idleS} (face vs bind {idleF:+0.0;-0.0}) | walk faces vs bind:{faces}");
                        Object.DestroyImmediate(av);
                    }
                    finally { Object.DestroyImmediate(go); }
                }
            }
            File.WriteAllText("test-results/player_probe/trunk.txt", sb.ToString());
            Debug.Log("player_probe trunk:\n" + sb);
        }

        static float FaceRaw(Animator a)
        {
            var head = a.GetBoneTransform(HumanBodyBones.Head); var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
            if (head == null) return float.NaN;
            // (no eye bones on the cast: the head's own up-forward line from the neck)
            var d = l != null && r != null ? (l.position + r.position) * 0.5f - head.position : head.position - a.GetBoneTransform(HumanBodyBones.Neck).position;
            return Mathf.Atan2(d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg;
        }

        public static void SitAndTrunk() { SitTake(); TrunkTest(); }

        static void Facts(string path, string tag)
        {
            var imp = (ModelImporter)AssetImporter.GetAtPath(path);
            var name = Path.GetFileNameWithoutExtension(path);
            var hd = imp.humanDescription;
            var so = new SerializedObject(imp); var gs = so.FindProperty("m_HumanDescription.m_GlobalScale");
            L($"== {name} {tag}: userData '{(imp.userData ?? "").Split(' ')[0]}' importer globalScale {imp.globalScale} useFileScale {imp.useFileScale} fileScale {imp.fileScale} hd.m_GlobalScale {(gs != null ? gs.floatValue.ToString() : "n/a")} human {hd.human?.Length} skeleton {hd.skeleton?.Length} twist {hd.upperArmTwist}/{hd.lowerArmTwist}/{hd.upperLegTwist}/{hd.lowerLegTwist} stretch {hd.armStretch}/{hd.legStretch} tdof {hd.hasTranslationDoF}");
            var sk = new StringBuilder();
            foreach (var b in hd.skeleton ?? new SkeletonBone[0]) sk.AppendLine($"{b.name}\t{b.position.x:0.000000} {b.position.y:0.000000} {b.position.z:0.000000}\t{b.rotation.x:0.000000} {b.rotation.y:0.000000} {b.rotation.z:0.000000} {b.rotation.w:0.000000}\t{b.scale.x:0.0000} {b.scale.y:0.0000} {b.scale.z:0.0000}");
            File.WriteAllText($"test-results/player_probe/{name}_{tag}_skeleton.txt", sk.ToString());
            var hu = new StringBuilder();
            foreach (var h in hd.human ?? new HumanBone[0]) hu.AppendLine($"{h.humanName}\t{h.boneName}\t{h.limit.useDefaultValues}\t{h.limit.min}\t{h.limit.max}\t{h.limit.center}\t{h.limit.axisLength:0.000000}");
            File.WriteAllText($"test-results/player_probe/{name}_{tag}_human.txt", hu.ToString());
            var model = AssetDatabase.LoadAssetAtPath<GameObject>(path);
            var avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
            var dupes = model.GetComponentsInChildren<Transform>(true).GroupBy(t => t.name).Where(g => g.Count() > 1).Select(g => $"{g.Key} x{g.Count()}");
            L($"  model root '{model.name}', duplicate names: {string.Join(", ", dupes)}; avatar {(avatar == null ? "none" : avatar.name)} valid {avatar != null && avatar.isValid} human {avatar != null && avatar.isHuman}");
            if (avatar == null) return;
            var go = Object.Instantiate(model);
            try
            {
                var a = go.GetComponent<Animator>() ?? go.AddComponent<Animator>();
                a.avatar = avatar; a.Rebind();
                L($"  humanScale {a.humanScale:0.00000} feet-bottom {a.leftFeetBottomHeight * 100f:0.000}/{a.rightFeetBottomHeight * 100f:0.000} cm");
                var hp = new HumanPoseHandler(avatar, go.transform);
                var pose = new HumanPose(); hp.GetHumanPose(ref pose);
                var mus = new StringBuilder();
                for (var i = 0; i < pose.muscles.Length; i++) mus.AppendLine($"{HumanTrait.MuscleName[i]}\t{pose.muscles[i]:0.00000}");
                File.WriteAllText($"test-results/player_probe/{name}_{tag}_bindmuscles.txt", mus.ToString());
                L($"  bind pose: bodyPosition {pose.bodyPosition.x:0.0000} {pose.bodyPosition.y:0.0000} {pose.bodyPosition.z:0.0000} bodyRotation {pose.bodyRotation.eulerAngles.x:0.00} {pose.bodyRotation.eulerAngles.y:0.00} {pose.bodyRotation.eulerAngles.z:0.00}; spine F-B {M(pose, "Spine Front-Back"):0.000} chest {M(pose, "Chest Front-Back"):0.000} upperchest {M(pose, "UpperChest Front-Back"):0.000} neck {M(pose, "Neck Nod Down-Up"):0.000} head {M(pose, "Head Nod Down-Up"):0.000} L arm down-up {M(pose, "Left Arm Down-Up"):0.000} L arm F-B {M(pose, "Left Arm Front-Back"):0.000}");
                var zero = new HumanPose { bodyPosition = new Vector3(0, 1, 0), bodyRotation = Quaternion.identity, muscles = new float[HumanTrait.MuscleCount] };
                hp.SetHumanPose(ref zero);
                L("  muscle zero: " + Pose(a));
                var clip = AssetDatabase.LoadAllAssetsAtPath("Assets/SecondFace/Motion/idle_m.fbx").OfType<AnimationClip>().FirstOrDefault(x => !x.name.StartsWith("__preview"));
                if (clip != null)
                {
                    if (!AnimationMode.InAnimationMode()) AnimationMode.StartAnimationMode();
                    AnimationMode.BeginSampling(); AnimationMode.SampleAnimationClip(go, clip, clip.length * 0.3f); AnimationMode.EndSampling();
                    L("  idle_m 0.3: " + Pose(a));
                    AnimationMode.StopAnimationMode();
                }
            }
            finally { Object.DestroyImmediate(go); }
        }

        static float M(HumanPose p, string n) { var i = System.Array.IndexOf(HumanTrait.MuscleName, n); return i < 0 ? float.NaN : p.muscles[i]; }

        static string Pose(Animator a)
        {
            var hips = a.GetBoneTransform(HumanBodyBones.Hips).position; var fwd = a.transform.forward;
            string B(HumanBodyBones b) { var t = a.GetBoneTransform(b); if (t == null) return "-"; var d = t.position - hips; return $"{d.x:+0.000;-0.000},{d.y:+0.000;-0.000},{d.z:+0.000;-0.000}"; }
            var head = a.GetBoneTransform(HumanBodyBones.Head); var l = a.GetBoneTransform(HumanBodyBones.LeftEye); var r = a.GetBoneTransform(HumanBodyBones.RightEye);
            var face = float.NaN; if (head != null && l != null && r != null) { var d = (l.position + r.position) * 0.5f - head.position; face = Mathf.Atan2(d.y, new Vector2(d.x, d.z).magnitude) * Mathf.Rad2Deg; }
            float Ahead(HumanBodyBones b) => Vector3.Dot(a.GetBoneTransform(b).position - hips, fwd);
            var hr = a.GetBoneTransform(HumanBodyBones.Hips).rotation.eulerAngles;
            return $"hipsY {hips.y:0.000} hipsRot {hr.x:0.0} {hr.y:0.0} {hr.z:0.0} | head {B(HumanBodyBones.Head)} chest {B(HumanBodyBones.Chest)} Lhand {B(HumanBodyBones.LeftHand)} Rhand {B(HumanBodyBones.RightHand)} Lfoot {B(HumanBodyBones.LeftFoot)} | hands ahead {Ahead(HumanBodyBones.LeftHand):+0.000;-0.000}/{Ahead(HumanBodyBones.RightHand):+0.000;-0.000} face {face:0.0}";
        }
    }
}
