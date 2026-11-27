#if UNITY_EDITOR
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using NUnit.Framework;
using Newtonsoft.Json;
using SecondFace.Core.Combat;
using SecondFace.Game.People;
using UnityEditor;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    // TEMP probe (never committed; not gate-hashed): every fight state's clip BARE (a playable, no Foot IK, no runtime system:
    // no Fighter, FootPlant, ArmClearance, Gaze, hands' IK or weapon), at the gate's fixed 1/60 s step:
    //  - on its own actor (the clip file's own avatar): bone measures with MotionProbe's definitions (A1/A2 per arm, their
    //    per-frame max as the calibration takes them, and pooled as the gate takes them; H1-H3 on the face's frame at the
    //    avatar's muscle zero; FY1/FY2 against the root's front; K1/Kb; F3w across the root; the ankles' and toes' heights);
    //  - on two bodies a sex (Rocketbox prefabs, all their components off): the same bone measures, and MotionProbe itself (the
    //    gate's own measures, the mesh's soles and C1 included) judged by the gate's own limits (LimitsFor, by reflection).
    // CLIP_PROBE_STATES (comma list of state names) narrows it. Output: test-results/clip_probe.{txt,json}.
    public class ClipProbeTests
    {
        private static readonly CultureInfo Iv = CultureInfo.InvariantCulture;

        private sealed class Tap : MonoBehaviour
        {
            public Animator A;
            public bool On;
            public readonly Dictionary<string, List<float>> V = new();
            private Transform _root, _head, _chest;
            private Quaternion _faceOff = Quaternion.identity, _chestOff = Quaternion.identity;
            private float _bottom, _footDropL, _footDropR;
            private Transform B(HumanBodyBones b) => A.GetBoneTransform(b);

            public void Init(Animator a)
            {
                A = a; _root = a.transform;
                _head = B(HumanBodyBones.Head);
                _chest = B(HumanBodyBones.UpperChest) ?? B(HumanBodyBones.Chest) ?? B(HumanBodyBones.Spine);
                _bottom = a.leftFeetBottomHeight;
                var hp = new HumanPoseHandler(a.avatar, _root);
                var pose = new HumanPose();
                hp.GetHumanPose(ref pose);
                var saved = (float[])pose.muscles.Clone();
                for (var i = 0; i < pose.muscles.Length; i++) pose.muscles[i] = 0f;
                hp.SetHumanPose(ref pose);
                _faceOff = Quaternion.Inverse(_head.rotation) * _root.rotation;
                _chestOff = Quaternion.Inverse(_chest.rotation) * _root.rotation;
                var tl = B(HumanBodyBones.LeftToes); var tr = B(HumanBodyBones.RightToes);
                _footDropL = tl != null ? B(HumanBodyBones.LeftFoot).position.y - tl.position.y : 0f;
                _footDropR = tr != null ? B(HumanBodyBones.RightFoot).position.y - tr.position.y : 0f;
                pose.muscles = saved; hp.SetHumanPose(ref pose);
                hp.Dispose();
            }

            private void Add(string k, float v) { if (!V.TryGetValue(k, out var l)) V[k] = l = new List<float>(); l.Add(v); }

            private void LateUpdate() { if (On) Sample(); }

            public void Sample()
            {
                var root = _root;
                float a1L = 0, a1R = 0, a2L = 0, a2R = 0;
                foreach (var (up, lo, hand) in new[] { (HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand), (HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand) })
                {
                    var u = B(up).position; var e = B(lo).position; var h = B(hand).position;
                    var a1 = Vector3.Angle(e - u, Vector3.down); var a2 = Vector3.Angle(e - u, h - e);
                    if (up == HumanBodyBones.LeftUpperArm) { a1L = a1; a2L = a2; } else { a1R = a1; a2R = a2; }
                }
                Add("A1L", a1L); Add("A1R", a1R); Add("A1max", Mathf.Max(a1L, a1R)); Add("A1pool", a1L); Add("A1pool", a1R);
                Add("A2L", a2L); Add("A2R", a2R); Add("A2max", Mathf.Max(a2L, a2R)); Add("A2pool", a2L); Add("A2pool", a2R);
                var q = _head.rotation * _faceOff;
                var f = q * Vector3.forward; var r = q * Vector3.right;
                Add("H1", Mathf.Asin(Mathf.Clamp(f.y, -1f, 1f)) * Mathf.Rad2Deg);
                var cf = _chest.rotation * _chestOff * Vector3.forward; cf.y = 0f; cf = cf.sqrMagnitude > 1e-6f ? cf.normalized : root.forward;
                var fl = new Vector3(f.x, 0, f.z);
                Add("H2", fl.sqrMagnitude > 1e-6f ? Vector3.Angle(fl.normalized, cf) : 0f);
                Add("H3", Mathf.Abs(Mathf.Asin(Mathf.Clamp(Vector3.Dot(r, Vector3.up), -1f, 1f)) * Mathf.Rad2Deg));
                var target = root.forward; target.y = 0f;
                float Yaw(HumanBodyBones l, HumanBodyBones rr)
                {
                    var front = Vector3.Cross(Vector3.up, B(l).position - B(rr).position); front.y = 0f;
                    return front.sqrMagnitude > 1e-8f ? Vector3.SignedAngle(target, front, Vector3.up) : 0f;
                }
                Add("FY1", Yaw(HumanBodyBones.LeftUpperLeg, HumanBodyBones.RightUpperLeg));
                Add("FY2", Yaw(HumanBodyBones.LeftUpperArm, HumanBodyBones.RightUpperArm));
                var hipL = B(HumanBodyBones.LeftUpperLeg).position; var hipR = B(HumanBodyBones.RightUpperLeg).position;
                var kneeL = B(HumanBodyBones.LeftLowerLeg).position; var kneeR = B(HumanBodyBones.RightLowerLeg).position;
                var ankL = B(HumanBodyBones.LeftFoot).position; var ankR = B(HumanBodyBones.RightFoot).position;
                var flexL = Vector3.Angle(kneeL - hipL, ankL - kneeL); var flexR = Vector3.Angle(kneeR - hipR, ankR - kneeR);
                Add("K1", Mathf.Min(flexL, flexR)); Add("Kb", Mathf.Max(flexL, flexR)); Add("KL", flexL); Add("KR", flexR);
                var fwd = root.forward; fwd.y = 0f; fwd.Normalize();
                var rt = Vector3.Cross(Vector3.up, fwd);
                Add("F3w", Mathf.Abs(Vector3.Dot(ankL - ankR, rt)) * 100f);
                var pel = hipL - hipR; pel.y = 0f;
                if (pel.sqrMagnitude > 1e-8f) Add("F3wPelvis", Mathf.Abs(Vector3.Dot(ankL - ankR, pel.normalized)) * 100f);
                var sl = (ankL.y - root.position.y - _bottom) * 100f; var sr = (ankR.y - root.position.y - _bottom) * 100f;
                Add("ankleL", sl); Add("ankleR", sr); Add("ankleLow", Mathf.Min(sl, sr));
                var tl = B(HumanBodyBones.LeftToes); var tr = B(HumanBodyBones.RightToes);
                if (tl != null) Add("heelLiftL", (ankL.y - tl.position.y - _footDropL) * 100f);
                if (tr != null) Add("heelLiftR", (ankR.y - tr.position.y - _footDropR) * 100f);
                // the hips over the feet: the pelvis's height over the root (cm)
                Add("hipsY", (B(HumanBodyBones.Hips).position.y - root.position.y) * 100f);
            }
        }

        private static string Q(List<float> v)
        {
            if (v == null || v.Count == 0) return "-";
            var s = v.OrderBy(x => x).ToList();
            float P(double q) => s[Mathf.Clamp((int)System.Math.Round(q * (s.Count - 1)), 0, s.Count - 1)];
            return string.Format(Iv, "{0:0.0}/{1:0.0}/{2:0.0} ({3:0.0}..{4:0.0})", P(0.02), P(0.5), P(0.98), s[0], s[^1]);
        }

        private static readonly string[] BoneKeys = { "A1L", "A1R", "A1max", "A1pool", "A2L", "A2R", "A2max", "A2pool", "H1", "H2", "H3", "FY1", "FY2", "K1", "Kb", "KL", "KR", "F3w", "F3wPelvis", "ankleL", "ankleR", "ankleLow", "heelLiftL", "heelLiftR", "hipsY" };

        private static Dictionary<string, object> Stats(Dictionary<string, List<float>> v)
        {
            var d = new Dictionary<string, object>();
            foreach (var (k, l) in v)
            {
                if (l.Count == 0) continue;
                var s = l.OrderBy(x => x).ToList();
                float P(double q) => s[Mathf.Clamp((int)System.Math.Round(q * (s.Count - 1)), 0, s.Count - 1)];
                d[k] = new[] { P(0.02), P(0.5), P(0.98), s[0], s[^1], l.Count };
            }
            return d;
        }

        private static string Bones(Dictionary<string, List<float>> v) =>
            string.Join("  ", BoneKeys.Where(v.ContainsKey).Select(k => $"{k} {Q(v[k])}"));

        [UnityTest, Timeout(5400000)]
        public IEnumerator TheFightsClipsBare()
        {
            var keep = Time.captureDeltaTime;
            Time.captureDeltaTime = 1f / 60f;
            var dt = 1f / 60f;
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            Assert.That(cat, Is.Not.Null, "catalogue");
            yield return BootTests.Clear();
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) { c.enabled = false; c.tag = "Untagged"; }
            var root = new GameObject("clip probe");
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.transform.SetParent(root.transform); flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var grounds = new Collider[] { flat.GetComponent<Collider>() };
            var limitsFor = typeof(HumanMotionGateTests).GetMethod("LimitsFor", BindingFlags.NonPublic | BindingFlags.Static);
            Assert.That(limitsFor, Is.Not.Null, "HumanMotionGateTests.LimitsFor");

            // the bodies: two a sex
            var bodyIds = new[] { ("Business_Female_01", true), ("Female_Adult_01", true), ("Business_Male_01", false), ("Male_Adult_08", false) };
            var bodies = new List<(string Id, bool Female, GameObject Go, Animator A, Tap T)>();
            var binds = new List<List<(Transform, Vector3, Quaternion, Vector3)>>();
            for (var i = 0; i < bodyIds.Length; i++)
            {
                var (id, female) = bodyIds[i];
                var go = Object.Instantiate(cat.Get(id), new Vector3((i - 1.5f) * 3f, 0f, 0f), Quaternion.identity, root.transform);
                go.name = "bare_" + id;
                foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
                var a = go.GetComponentInChildren<Animator>();
                a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate; a.enabled = true;
                var snap = go.GetComponentsInChildren<Transform>(true).Select(x => (x, x.localPosition, x.localRotation, x.localScale)).ToList();
                binds.Add(snap);
                var t = a.gameObject.AddComponent<Tap>(); t.Init(a);
                foreach (var (x, lp, lr, ls) in snap) { x.localPosition = lp; x.localRotation = lr; x.localScale = ls; }
                bodies.Add((id, female, go, a, t));
            }
            yield return null;

            var only = System.Environment.GetEnvironmentVariable("CLIP_PROBE_STATES");
            var pick = string.IsNullOrEmpty(only) ? null : new HashSet<string>(only.Split(','));
            var states = CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer && s.Gate != null && s.Gate != "step" && (pick == null || pick.Contains(s.Name))).ToList();
            var sb = new StringBuilder();
            var json = new List<Dictionary<string, object>>();
            sb.AppendLine($"clip probe {System.DateTime.UtcNow:u}: {states.Count} states, bodies {string.Join(", ", bodyIds.Select(b => b.Item1))}, dt {dt:0.0000}");
            AnimationClip Clip(string name) => AssetDatabase.LoadAllAssetsAtPath($"{CombatMotion.Folder}/{name}.fbx").OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview__"));
            string GateState(MotionState s) => s.Name == "rifle_idle" ? "combat:ready:rifle" : $"combat:{s.Gate}:{s.Name}";
            float Seconds(MotionState s, AnimationClip c) => s.Loop || s.Speed <= 0f ? Mathf.Max(2.5f, c.length) : c.length * (s.Cut - s.From) / s.Speed;

            foreach (var s in states)
            {
                // ---- its own actor (each sex's clip), bones only, evaluated at the fixed step
                var ownDone = new HashSet<string>();
                foreach (var female in new[] { false, true })
                {
                    if (s.Only == (female ? "m" : "f")) continue;
                    var name = s.ClipFor(female);
                    if (!ownDone.Add(name)) continue;   // (one take for both: measured once)
                    var clip = Clip(name);
                    if (clip == null) { sb.AppendLine($"{s.Name} {name}: no clip"); continue; }
                    var path = $"{CombatMotion.Folder}/{name}.fbx";
                    var own = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                    sb.AppendLine($"== {s.Name} [{s.Gate}] {(s.ClipF == null || s.ClipF == s.Clip ? (s.Only ?? "u") : female ? "f" : "m")} {name} ({clip.length:0.00} s, from {s.From:0.00} cut {s.Cut:0.00} speed {s.Speed:0.00} loop {s.Loop} hands {s.Hands})");
                    if (own == null || !own.isHuman) { sb.AppendLine("   own   (no humanoid avatar)"); continue; }
                    var model = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path), new Vector3(0f, 0f, 20f), Quaternion.identity, root.transform);
                    var ma = model.GetComponent<Animator>() ?? model.AddComponent<Animator>();
                    ma.avatar = own; ma.runtimeAnimatorController = null; ma.applyRootMotion = false; ma.cullingMode = AnimatorCullingMode.AlwaysAnimate; ma.enabled = true; ma.Rebind();
                    var mt = model.AddComponent<Tap>(); mt.Init(ma);
                    var g = PlayableGraph.Create("own"); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
                    var o = AnimationPlayableOutput.Create(g, "o", ma);
                    var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false); cp.SetSpeed(s.Speed > 0f ? s.Speed : 1f);
                    o.SetSourcePlayable(cp); g.Play();
                    cp.SetTime(clip.length * s.From); g.Evaluate(0f);
                    var n = Mathf.Max(2, Mathf.RoundToInt(Seconds(s, clip) / dt));
                    for (var i = 0; i < n; i++) { g.Evaluate(s.Speed > 0f ? dt : 0f); mt.Sample(); }
                    g.Destroy();
                    sb.AppendLine($"   own   {Bones(mt.V)}");
                    json.Add(new Dictionary<string, object> { ["state"] = s.Name, ["gate"] = s.Gate, ["clip"] = name, ["sex"] = female ? "f" : "m", ["who"] = "own", ["bones"] = Stats(mt.V) });
                    Object.DestroyImmediate(model);
                }

                // ---- the bodies, all at once, frame by frame (MotionProbe measures in its LateUpdate)
                var graphs = new List<PlayableGraph>();
                var probes = new List<(int I, MotionProbe P, string Clip)>();
                var frames = 0;
                for (var i = 0; i < bodies.Count; i++)
                {
                    var b = bodies[i];
                    if (s.Only == (b.Female ? "m" : "f")) continue;
                    var clip = Clip(s.ClipFor(b.Female));
                    if (clip == null) continue;
                    b.T.V.Clear();
                    var old = b.A.GetComponent<MotionProbe>(); if (old != null) Object.DestroyImmediate(old);
                    b.Go.transform.SetPositionAndRotation(new Vector3((i - 1.5f) * 3f, 0f, 0f), Quaternion.identity);
                    var g = PlayableGraph.Create("bare_" + b.Id); g.SetTimeUpdateMode(DirectorUpdateMode.GameTime);
                    var o = AnimationPlayableOutput.Create(g, "o", b.A);
                    var cp = AnimationClipPlayable.Create(g, clip); cp.SetApplyFootIK(false); cp.SetSpeed(s.Speed);
                    cp.SetTime(clip.length * s.From);
                    o.SetSourcePlayable(cp);
                    // (the probe is made on the body's bind, before the clip's first frame, as the gate makes it)
                    foreach (var (x, lp, lr, ls) in binds[i]) { x.localPosition = lp; x.localRotation = lr; x.localScale = ls; }
                    b.Go.transform.SetPositionAndRotation(new Vector3((i - 1.5f) * 3f, 0f, 0f), Quaternion.identity);
                    var probe = b.A.gameObject.AddComponent<MotionProbe>();
                    probe.Person = b.Id; probe.Ground = grounds;
                    Assert.That(probe.Calibrate(), Is.True, $"{b.Id}: {probe.Error}");
                    probe.FaceTarget = Vector3.forward * 8f;
                    g.Play();
                    graphs.Add(g); probes.Add((i, probe, clip.name));
                    frames = Mathf.Max(frames, Mathf.RoundToInt(Seconds(s, clip) / dt));
                }
                if (probes.Count == 0) continue;
                yield return null;   // (the first frame: the clip's From)
                foreach (var (i, p, _) in probes) { p.State = GateState(s); p.Kind = MotionProbe.K.Stand; bodies[i].T.On = true; }
                for (var f = 0; f < frames; f++) yield return null;
                foreach (var (i, p, _) in probes) { p.Kind = null; bodies[i].T.On = false; }
                foreach (var g in graphs) g.Destroy();
                foreach (var (i, p, clipName) in probes)
                {
                    var b = bodies[i];
                    var st = GateState(s);
                    var lims = (HumanMotionGateTests.Lim[])limitsFor.Invoke(null, new object[] { st });
                    var rows = new List<string>();
                    var judged = new List<Dictionary<string, object>>();
                    if (p.Samples.TryGetValue(st, out var measures))
                        foreach (var lim in lims)
                        {
                            if (!measures.TryGetValue(lim.M, out var vals) || vals.Count == 0) continue;
                            var sorted = vals.OrderBy(x => x).ToList();
                            float P(double q) => sorted[Mathf.Clamp((int)System.Math.Round(q * (sorted.Count - 1)), 0, sorted.Count - 1)];
                            var p2 = P(0.02); var p50 = P(0.5); var p98 = P(0.98); var min = sorted[0]; var max = sorted[^1]; var mean = vals.Average();
                            var over = float.IsInfinity(lim.Over) ? 0f : vals.Count(x => x > lim.Over) / (float)vals.Count;
                            var why = new List<string>();
                            if (p98 > lim.Hi) why.Add(string.Format(Iv, "p98 {0:0.0} > {1:0.0}", p98, lim.Hi));
                            if (p2 < lim.Lo) why.Add(string.Format(Iv, "p2 {0:0.0} < {1:0.0}", p2, lim.Lo));
                            if (max > lim.CapHi) why.Add(string.Format(Iv, "max {0:0.0} > cap {1:0.0}", max, lim.CapHi));
                            if (min < lim.CapLo) why.Add(string.Format(Iv, "min {0:0.0} < cap {1:0.0}", min, lim.CapLo));
                            if (mean > lim.MeanMax) why.Add(string.Format(Iv, "mean {0:0.00} > {1:0.00}", mean, lim.MeanMax));
                            if (over > lim.OverFrac) why.Add(string.Format(Iv, "{0:P0} of frames over {1:0}", over, lim.Over));
                            rows.Add(string.Format(Iv, "{0} {1:0.0}/{2:0.0}/{3:0.0} ({4:0.0}..{5:0.0}){6}", lim.M, p2, p50, p98, min, max, why.Count == 0 ? "" : " FAIL[" + string.Join("; ", why) + "]"));
                            judged.Add(new Dictionary<string, object> { ["m"] = lim.M, ["p2"] = p2, ["p50"] = p50, ["p98"] = p98, ["min"] = min, ["max"] = max, ["mean"] = mean, ["over"] = over, ["pass"] = why.Count == 0, ["why"] = string.Join("; ", why) });
                        }
                    sb.AppendLine($"   body  {b.Id} ({clipName}) bones {Bones(b.T.V)}");
                    sb.AppendLine($"   gate  {b.Id} {st}: {string.Join("  ", rows)}");
                    json.Add(new Dictionary<string, object> { ["state"] = s.Name, ["gate"] = s.Gate, ["clip"] = clipName, ["sex"] = b.Female ? "f" : "m", ["who"] = b.Id, ["bones"] = Stats(b.T.V), ["judged"] = judged });
                    Object.DestroyImmediate(p);
                }
                var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
                Directory.CreateDirectory(dir);
                File.WriteAllText(Path.Combine(dir, "clip_probe.txt"), sb.ToString());
                File.WriteAllText(Path.Combine(dir, "clip_probe.json"), JsonConvert.SerializeObject(json, Formatting.Indented));
                yield return null;
            }
            Object.Destroy(root);
            Time.captureDeltaTime = keep;
            Debug.Log("ClipProbe done: " + states.Count + " states");
        }
    }
}
#endif
