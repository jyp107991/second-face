#if UNITY_EDITOR
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    // TEMP probe (never committed; not gate-hashed). Cause B's source: each fight clip BARE (manual PlayableGraph, no Foot
    // IK, no runtime system) on its own actor, two bodies of its sex, and one body whose legs and hip width are scaled to the
    // actor's (the leg bones' local positions re-set after every evaluation). Per rig: the T-pose (avatar skeleton), the
    // muscle-zero pose, and every clip frame at 1/60 s: the leg bones' positions and rotations in the root's frame, the body
    // pose, every muscle as each rig reads it back. Output: test-results/leg_trace.csv, leg_trace.txt (avatar settings,
    // lengths). LEG_TRACE_STATES (comma list of state names) narrows it.
    public class LegTraceProbeTests
    {
        private static readonly CultureInfo Iv = CultureInfo.InvariantCulture;
        private static readonly HumanBodyBones[] Bones =
        {
            HumanBodyBones.Hips, HumanBodyBones.Spine, HumanBodyBones.Chest, HumanBodyBones.UpperChest, HumanBodyBones.Neck, HumanBodyBones.Head,
            HumanBodyBones.LeftShoulder, HumanBodyBones.RightShoulder, HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm,
            HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, HumanBodyBones.LeftToes,
            HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, HumanBodyBones.RightToes,
        };

        private sealed class Rig
        {
            public string Label;
            public GameObject Go;
            public Animator A;
            public Transform Root;
            public HumanPoseHandler Hp;
            public List<(Transform T, Vector3 Lp, Quaternion Lr, Vector3 Ls)> Bind;
            public List<(Transform T, Vector3 Lp)> Fix = new();
            public bool Turned;
            public Transform B(HumanBodyBones b) => A.GetBoneTransform(b);
        }

        private static Rig Make(string label, GameObject go)
        {
            var a = go.GetComponentInChildren<Animator>();
            a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate; a.enabled = true;
            var r = new Rig { Label = label, Go = go, A = a, Root = a.transform };
            r.Bind = go.GetComponentsInChildren<Transform>(true).Select(x => (x, x.localPosition, x.localRotation, x.localScale)).ToList();
            r.Hp = new HumanPoseHandler(a.avatar, r.Root);
            return r;
        }

        private static void Restore(Rig r) { foreach (var (t, lp, lr, ls) in r.Bind) { t.localPosition = lp; t.localRotation = lr; t.localScale = ls; } }

        private static void TPose(Rig r)
        {
            Restore(r);
            var byName = new Dictionary<string, Transform>();
            foreach (var t in r.Root.GetComponentsInChildren<Transform>(true)) if (t != r.Root && !byName.ContainsKey(t.name)) byName[t.name] = t;
            foreach (var sb in r.A.avatar.humanDescription.skeleton)
                if (byName.TryGetValue(sb.name, out var t)) { t.localPosition = sb.position; t.localRotation = sb.rotation; }
        }

        private static void MuscleZero(Rig r)
        {
            var pose = new HumanPose();
            r.Hp.GetHumanPose(ref pose);
            for (var i = 0; i < pose.muscles.Length; i++) pose.muscles[i] = 0f;
            pose.bodyRotation = Quaternion.identity;
            pose.bodyPosition = new Vector3(0f, pose.bodyPosition.y, 0f);
            r.Hp.SetHumanPose(ref pose);
        }

        private static string F(float v) => v.ToString("0.#####", Iv);

        private static void Row(StringBuilder sb, string state, string clip, Rig r, int frame, float t)
        {
            sb.Append(state).Append(',').Append(clip).Append(',').Append(r.Label).Append(',').Append(frame).Append(',').Append(F(t));
            var iq = Quaternion.Inverse(r.Root.rotation);
            foreach (var b in Bones)
            {
                var x = r.B(b);
                var p = x != null ? r.Root.InverseTransformPoint(x.position) : Vector3.zero;
                var q = x != null ? iq * x.rotation : Quaternion.identity;
                sb.Append(',').Append(F(p.x)).Append(',').Append(F(p.y)).Append(',').Append(F(p.z))
                  .Append(',').Append(F(q.x)).Append(',').Append(F(q.y)).Append(',').Append(F(q.z)).Append(',').Append(F(q.w));
            }
            var pose = new HumanPose();
            r.Hp.GetHumanPose(ref pose);
            sb.Append(',').Append(F(pose.bodyPosition.x)).Append(',').Append(F(pose.bodyPosition.y)).Append(',').Append(F(pose.bodyPosition.z))
              .Append(',').Append(F(pose.bodyRotation.x)).Append(',').Append(F(pose.bodyRotation.y)).Append(',').Append(F(pose.bodyRotation.z)).Append(',').Append(F(pose.bodyRotation.w));
            foreach (var m in pose.muscles) sb.Append(',').Append(F(m));
            sb.AppendLine();
        }

        private static string Header()
        {
            var h = new StringBuilder("state,clip,rig,frame,t");
            foreach (var b in Bones) foreach (var c in new[] { "px", "py", "pz", "qx", "qy", "qz", "qw" }) h.Append(',').Append(b).Append('_').Append(c);
            foreach (var c in new[] { "bpx", "bpy", "bpz", "bqx", "bqy", "bqz", "bqw" }) h.Append(',').Append(c);
            for (var i = 0; i < HumanTrait.MuscleCount; i++) h.Append(",m").Append(i);
            return h.ToString();
        }

        // the T-pose leg geometry: hips joints, thigh and shank lengths (world, the rig at the origin)
        private static (Vector3 HL, Vector3 HR, float TL, float TR, float SL, float SR) Legs(Rig r)
        {
            TPose(r);
            var hl = r.B(HumanBodyBones.LeftUpperLeg).position; var hr = r.B(HumanBodyBones.RightUpperLeg).position;
            var kl = r.B(HumanBodyBones.LeftLowerLeg).position; var kr = r.B(HumanBodyBones.RightLowerLeg).position;
            var al = r.B(HumanBodyBones.LeftFoot).position; var ar = r.B(HumanBodyBones.RightFoot).position;
            var res = (hl, hr, (kl - hl).magnitude, (kr - hr).magnitude, (al - kl).magnitude, (ar - kr).magnitude);
            Restore(r);
            return res;
        }

        // the body's legs re-proportioned to the actor's: hip width, thigh and shank lengths (each side)
        private static string ScaleTo(Rig body, Rig actor)
        {
            var a = Legs(actor);
            var b = Legs(body);
            TPose(body);
            body.Fix.Clear();
            var mid = (b.HL + b.HR) * 0.5f;
            var w = (a.HL - a.HR).magnitude / (b.HL - b.HR).magnitude;
            foreach (var (up, lo, foot, hb, ta, tb, sa, sbb) in new[]
            {
                (HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot, b.HL, a.TL, b.TL, a.SL, b.SL),
                (HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot, b.HR, a.TR, b.TR, a.SR, b.SR),
            })
            {
                var u = body.B(up); var l = body.B(lo); var f = body.B(foot);
                var lpL = l.localPosition * (ta / tb); var lpF = f.localPosition * (sa / sbb);
                u.position = mid + (hb - mid) * w;
                body.Fix.Add((u, u.localPosition)); body.Fix.Add((l, lpL)); body.Fix.Add((f, lpF));
            }
            Restore(body);
            return string.Format(Iv, "hip width {0:0.00} -> {1:0.00} cm, thigh L {2:0.00} -> {3:0.00} R {4:0.00} -> {5:0.00}, shank L {6:0.00} -> {7:0.00} R {8:0.00} -> {9:0.00}",
                (b.HL - b.HR).magnitude * 100f, (a.HL - a.HR).magnitude * 100f, b.TL * 100f, a.TL * 100f, b.TR * 100f, a.TR * 100f, b.SL * 100f, a.SL * 100f, b.SR * 100f, a.SR * 100f);
        }

        // a body whose avatar is built again (AvatarBuilder) from its own description: TDoF as asked, and optionally its thighs
        // re-parented to the pelvis and its clavicles to the upper chest (the bind and the T-pose kept in the world)
        private static Rig Rebuilt(string label, GameObject prefab, Vector3 at, Transform parent, bool tdof, bool thighs, bool clavicles, StringBuilder txt)
        {
            var go = Object.Instantiate(prefab, at, Quaternion.identity, parent);
            foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
            var a = go.GetComponentInChildren<Animator>();
            var hd = a.avatar.humanDescription;
            var sk = hd.skeleton.ToArray();
            var all = a.transform.GetComponentsInChildren<Transform>(true).ToList();
            var bind = all.Select(x => (x, x.localPosition, x.localRotation, x.localScale)).ToList();
            var byName = new Dictionary<string, Transform>();
            foreach (var t in all) if (t != a.transform && !byName.ContainsKey(t.name)) byName[t.name] = t;
            var moves = new List<(Transform C, Transform P)>();
            if (thighs) { moves.Add((a.GetBoneTransform(HumanBodyBones.LeftUpperLeg), a.GetBoneTransform(HumanBodyBones.Hips))); moves.Add((a.GetBoneTransform(HumanBodyBones.RightUpperLeg), a.GetBoneTransform(HumanBodyBones.Hips))); }
            if (clavicles)
            {
                var up = a.GetBoneTransform(HumanBodyBones.UpperChest) ?? a.GetBoneTransform(HumanBodyBones.Chest);
                moves.Add((a.GetBoneTransform(HumanBodyBones.LeftShoulder), up)); moves.Add((a.GetBoneTransform(HumanBodyBones.RightShoulder), up));
            }
            var bindWorld = moves.Select(m => (m.C.position, m.C.rotation)).ToList();
            foreach (var b in sk) if (byName.TryGetValue(b.name, out var t)) { t.localPosition = b.position; t.localRotation = b.rotation; }
            var tLocal = new List<(Vector3, Quaternion)>();
            foreach (var (c, p) in moves) { c.SetParent(p, true); tLocal.Add((c.localPosition, c.localRotation)); }
            foreach (var (x, lp, lr, ls) in bind) { if (moves.Any(m => m.C == x)) continue; x.localPosition = lp; x.localRotation = lr; x.localScale = ls; }
            for (var i = 0; i < moves.Count; i++) { moves[i].C.SetPositionAndRotation(bindWorld[i].Item1, bindWorld[i].Item2); }
            for (var i = 0; i < moves.Count; i++)
                for (var j = 0; j < sk.Length; j++)
                    if (sk[j].name == moves[i].C.name) { sk[j].position = tLocal[i].Item1; sk[j].rotation = tLocal[i].Item2; }
            hd.skeleton = sk; hd.hasTranslationDoF = tdof;
            var av = AvatarBuilder.BuildHumanAvatar(a.gameObject, hd);
            av.name = label;
            txt.AppendLine($"   rebuilt {label}: valid {av.isValid} human {av.isHuman} (tdof {tdof}, thighs to pelvis {thighs}, clavicles to chest {clavicles}); LUL parent {a.GetBoneTransform(HumanBodyBones.LeftUpperLeg).parent.name}, LSh parent {a.GetBoneTransform(HumanBodyBones.LeftShoulder).parent.name}");
            a.avatar = av; a.Rebind();
            return Make(label, go);
        }

        private static void ApplyFix(Rig r) { foreach (var (t, lp) in r.Fix) t.localPosition = lp; }

        private static string Settings(Rig r)
        {
            var d = r.A.avatar.humanDescription;
            return string.Format(Iv, "{0}: upperLegTwist {1} legTwist {2} legStretch {3} feetSpacing {4} TDoF {5} upperArmTwist {6} armStretch {7}; hips {8}, LUL {9} parent {10}",
                r.Label, d.upperLegTwist, d.lowerLegTwist, d.legStretch, d.feetSpacing, d.hasTranslationDoF, d.upperArmTwist, d.armStretch,
                r.B(HumanBodyBones.Hips).name, r.B(HumanBodyBones.LeftUpperLeg).name, r.B(HumanBodyBones.LeftUpperLeg).parent.name);
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator TheLegsActorAgainstBody()
        {
            const float dt = 1f / 60f;
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            Assert.That(cat, Is.Not.Null, "catalogue");
            yield return BootTests.Clear();
            var root = new GameObject("leg trace");
            var set = AssetDatabase.LoadAssetAtPath<SecondFace.Game.Fighting.CombatSet>("Assets/SecondFace/Combat/CombatSet.asset");
            var only = System.Environment.GetEnvironmentVariable("LEG_TRACE_STATES");
            var pick = new HashSet<string>((string.IsNullOrEmpty(only) ? "melee_idle,unarmed_idle,club2_strike,club2_idle,cover_hold,rifle_aim,rifle_idle" : only).Split(','));
            var states = CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer && pick.Contains(s.Name)).ToList();
            var bodyIds = new[] { ("Business_Male_01", false), ("Male_Adult_08", false), ("Business_Female_01", true), ("Female_Adult_01", true) };
            var csv = new StringBuilder(Header()).AppendLine();
            var txt = new StringBuilder($"leg trace {System.DateTime.UtcNow:u}: states {string.Join(",", states.Select(s => s.Name))}\n");
            AnimationClip Clip(string name) => AssetDatabase.LoadAllAssetsAtPath($"{CombatMotion.Folder}/{name}.fbx").OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview__"));
            var done = new HashSet<string>();
            var x = 0f;
            foreach (var s in states)
                foreach (var female in new[] { false, true })
                {
                    if (s.Only == (female ? "m" : "f")) continue;
                    var name = s.ClipFor(female);
                    if (!done.Add(name + (female ? "|f" : "|m"))) continue;
                    var clip = Clip(name);
                    var path = $"{CombatMotion.Folder}/{name}.fbx";
                    var own = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                    if (clip == null || own == null || !own.isHuman) { txt.AppendLine($"{s.Name} {name}: no clip/avatar"); continue; }
                    var rigs = new List<Rig>();
                    var model = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path), new Vector3(x, 0f, 20f), Quaternion.identity, root.transform);
                    var ma = model.GetComponent<Animator>() ?? model.AddComponent<Animator>();
                    ma.avatar = own;
                    rigs.Add(Make("own", model));
                    var sexBodies = bodyIds.Where(b => b.Item2 == female).ToList();
                    var k = 0;
                    var (bid, _) = sexBodies[0];
                    {
                        var go = Object.Instantiate(cat.Get(bid), new Vector3(x + (++k) * 3f, 0f, 0f), Quaternion.identity, root.transform);
                        foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
                        rigs.Add(Make(bid, go));
                    }
                    {
                        var go = Object.Instantiate(cat.Get(bid), new Vector3(x + (++k) * 3f, 0f, 0f), Quaternion.identity, root.transform);
                        foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
                        var tr = Make("turned_" + bid, go); tr.Turned = true; rigs.Add(tr);
                    }
                    x += 20f;
                    foreach (var r in rigs) txt.AppendLine("   " + Settings(r));
                    // T-pose and muscle zero
                    foreach (var r in rigs) { TPose(r); ApplyFix(r); Row(csv, s.Name, name, r, -1, 0f); }
                    foreach (var r in rigs) { Restore(r); ApplyFix(r); MuscleZero(r); ApplyFix(r); Row(csv, s.Name, name, r, -2, 0f); Restore(r); }
                    // the clip, frame by frame, at its own times
                    var graphs = new List<(Rig R, PlayableGraph G, AnimationClipPlayable P)>();
                    foreach (var r in rigs)
                    {
                        Restore(r);
                        var g = PlayableGraph.Create("lt_" + r.Label); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
                        var o = AnimationPlayableOutput.Create(g, "o", r.A);
                        var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false); cp.SetSpeed(1f);
                        o.SetSourcePlayable(cp); g.Play();
                        graphs.Add((r, g, cp));
                    }
                    var t0 = clip.length * s.From;
                    var t1 = s.Loop ? t0 + Mathf.Max(clip.length, 1f) : clip.length * s.Cut;
                    var n = Mathf.Max(2, Mathf.RoundToInt((t1 - t0) / (dt * Mathf.Max(0.05f, s.Speed))));
                    for (var i = 0; i < n; i++)
                    {
                        var t = t0 + i * dt * Mathf.Max(0.05f, s.Speed);
                        if (s.Loop) t = t0 + Mathf.Repeat(t - t0, clip.length);
                        foreach (var (r, g, cp) in graphs)
                        {
                            cp.SetTime(t); cp.SetDone(false); g.Evaluate(0f); ApplyFix(r);
                            if (r.Turned && set != null && set.TurnOf(name, SecondFace.Game.Fighting.CombatSet.SkeletonKey(r.A), Mathf.Clamp01(t / clip.length), out var rot, out var tl, out var tr, out var sh))
                            {
                                var rr = r.Root.rotation; var ir = Quaternion.Inverse(rr);
                                var hips = r.B(HumanBodyBones.Hips);
                                hips.rotation = rr * rot * ir * hips.rotation;
                                r.B(HumanBodyBones.LeftUpperLeg).rotation = rr * tl * ir * r.B(HumanBodyBones.LeftUpperLeg).rotation;
                                r.B(HumanBodyBones.RightUpperLeg).rotation = rr * tr * ir * r.B(HumanBodyBones.RightUpperLeg).rotation;
                                hips.position += r.Root.TransformVector(sh);
                            }
                            Row(csv, s.Name, name, r, i, t);
                        }
                    }
                    foreach (var (r, g, _) in graphs) { g.Destroy(); r.Hp.Dispose(); }
                    foreach (var r in rigs) Object.DestroyImmediate(r.Go);
                    txt.AppendLine($"   frames {n} ({t0:0.000}..{t1:0.000} s)");
                    yield return null;
                }
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, "leg_trace.csv"), csv.ToString());
            var names = new StringBuilder();
            for (var i = 0; i < HumanTrait.MuscleCount; i++) names.AppendLine($"m{i},{HumanTrait.MuscleName[i]}");
            File.WriteAllText(Path.Combine(dir, "leg_trace_muscles.csv"), names.ToString());
            File.WriteAllText(Path.Combine(dir, "leg_trace.txt"), txt.ToString());
            Object.Destroy(root);
            Debug.Log("LegTrace done");
        }
    }
}
#endif
