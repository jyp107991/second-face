using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using NUnit.Framework;
using SecondFace.Game.People;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.Animations;
using UnityEngine.Playables;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    // TEMP harness (never committed; not a gate input): the motion gate's own Gate() over the whole cast in its chunks of ten,
    // the everyday states only (the fight is skipped by holding the world assets' combat set back in memory for the run, so
    // Gate's "the fight's motion is not built" branch is taken; never saved). No measure, limit or state is changed; it writes
    // test-results/motion_screen_<k>.* (never motion_gate.json, never a verdict). SCREEN_CHUNKS: "0-7", "4,5" (default all).
    // StageProbeTests' watcher (REST_TRACE, W3_TRACE, FOOT_TRACE, W3_MODE, FOOT_MODE) can ride along with SCREEN_WATCH=1.
    public class EverydayScreenTests
    {
        private static readonly BindingFlags Any = BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static;

        private static IEnumerator Fixed(IEnumerator inner)
        {
            var keep = Time.captureDeltaTime;
            Time.captureDeltaTime = 1f / 60f;
            yield return null; yield return null;
            try { while (inner.MoveNext()) yield return inner.Current; }
            finally { Time.captureDeltaTime = keep; }
        }

        // (the bisect's switches, TEMP: ArmClearance.BisectEnv when the tree carries them; every FootPlant's ToeBendMax held at 0 for "toes")
        private static void SetBisect(string switches)
        {
            StrideEndOff = ("," + (switches ?? "") + ",").Contains(",nostrideend,");
            OutRetryOff = ("," + (switches ?? "") + ",").Contains(",nooutretry,");
            RestOutOff = ("," + (switches ?? "") + ",").Contains(",norestout,");
            Debug.Log($"EVERYDAY SCREEN switches [{switches}]: stride end {(StrideEndOff ? "OFF" : "on")}, out retry {(OutRetryOff ? "OFF" : "on")}");
            var df = typeof(BodySkin).GetField("DrawnOff", Any);
            if (df != null) df.SetValue(null, ("," + (switches ?? "") + ",").Contains(",drawnoff,") || System.Environment.GetEnvironmentVariable("SKIN_DRAWN") == "off");
            Debug.Log($"EVERYDAY SCREEN switches [{switches}]: drawn reading {(df != null && (bool)df.GetValue(null) ? "OFF" : "on")}");
            var f = typeof(ArmClearance).GetField("BisectEnv", Any);
            if (f != null) f.SetValue(null, switches ?? (System.Environment.GetEnvironmentVariable("BISECT") ?? ""));
            else if (!string.IsNullOrEmpty(switches) && switches != "toes") Debug.LogWarning("EVERYDAY SCREEN: no ArmClearance.BisectEnv in this tree: switches " + switches + " not applied");
        }

        private static bool StrideEndOff, OutRetryOff, RestOutOff;
        public sealed class ToeSwitch : MonoBehaviour
        {
            public bool Off;
            private void Update()
            {
                var se = typeof(ArmClearance).GetField("StrideEnd", BindingFlags.Public | BindingFlags.Instance);
                var orr = typeof(ArmClearance).GetField("OutRetry", BindingFlags.Public | BindingFlags.Instance);
                var ror = typeof(ArmClearance).GetField("RestOutRetry", BindingFlags.Public | BindingFlags.Instance);
                foreach (var ac in Object.FindObjectsByType<ArmClearance>(FindObjectsSortMode.None)) { se?.SetValue(ac, !StrideEndOff); orr?.SetValue(ac, !OutRetryOff); ror?.SetValue(ac, !RestOutOff); }
                var f = typeof(FootPlant).GetField("ToeBendMax", BindingFlags.Public | BindingFlags.Instance);
                if (f == null) return;
                foreach (var fp in Object.FindObjectsByType<FootPlant>(FindObjectsSortMode.None)) f.SetValue(fp, Off ? 0f : 50f);
            }
        }

        [UnityTest, Timeout(14400000)]
        public IEnumerator EverydayScreen() => Fixed(Screen());

        private static IEnumerator Screen()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            Assert.That(cat, Is.Not.Null); Assert.That(assets, Is.Not.Null);
            var ids = cat.People.Where(e => e != null && e.Prefab != null).Select(e => e.Id).OrderBy(s => s).ToArray();
            var batches = Enumerable.Range(0, (ids.Length + 9) / 10).Select(k => ids.Skip(k * 10).Take(10).ToArray()).ToArray();
            // (SCREEN_PEOPLE: a comma list measured as one batch, "motion_screen_p", for a trace: never a screen of the cast)
            var only = (System.Environment.GetEnvironmentVariable("SCREEN_PEOPLE") ?? "").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            if (only.Length > 0) batches = new[] { only };
            var want = new HashSet<int>();
            var spec = System.Environment.GetEnvironmentVariable("SCREEN_CHUNKS") ?? "";
            foreach (var part in spec.Split(',').Select(x => x.Trim()).Where(x => x.Length > 0))
            {
                var ab = part.Split('-');
                if (ab.Length == 2) for (var k = int.Parse(ab[0]); k <= int.Parse(ab[1]); k++) want.Add(k);
                else want.Add(int.Parse(part));
            }
            if (want.Count == 0) for (var k = 0; k < batches.Length; k++) want.Add(k);
            var gateType = typeof(HumanMotionGateTests);
            var gate = gateType.GetMethod("Gate", Any);
            var buildCm = (IDictionary)gateType.GetField("BuildCm", Any).GetValue(null);
            var buildTop = (IDictionary)gateType.GetField("BuildTop", Any).GetValue(null);
            var hash = HumanMotionGateTests.InputsHash("people") + "|" + HumanMotionGateTests.InputsHash("measures");
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            GameObject watch = null;
            if (System.Environment.GetEnvironmentVariable("SCREEN_WATCH") == "1")
            {
                watch = new GameObject("stage watcher");
                Object.DontDestroyOnLoad(watch);
                watch.AddComponent<PhaseWatcher>();
            }
            var combat = assets.Combat;
            var everyday = new List<string>();
            var configs = (System.Environment.GetEnvironmentVariable("SCREEN_CONFIGS") ?? "").Split('|').Select(x => x.Trim()).Where(x => x.Length > 0)
                .Select(x => { var c = x.Split(':'); return (Label: c[0], Switches: c.Length > 1 ? c[1] : ""); }).ToList();
            if (configs.Count == 0) configs.Add(("", null));
            var toes = new GameObject("toe switch"); Object.DontDestroyOnLoad(toes); var ts = toes.AddComponent<ToeSwitch>();
            try
            {
                assets.Combat = null;
                foreach (var (label, switches) in configs)
                foreach (var k in want.OrderBy(x => x))
                {
                    if (switches != null) { SetBisect(switches); ts.Off = ("," + switches + ",").Contains(",toes,"); }
                    var tag = (only.Length > 0 ? "motion_screen_p" : $"motion_screen_{k}") + (label.Length > 0 ? "_" + label : "");
                    if (k < 0 || k >= batches.Length) continue;
                    buildCm.Clear(); buildTop.Clear();
                    var failed = new List<string>();
                    var measured = new int[1];
                    var t0 = System.DateTime.UtcNow;
                    var inner = (IEnumerator)gate.Invoke(new HumanMotionGateTests(), new object[] { batches[k], tag, false, failed, false, measured });
                    while (inner.MoveNext()) yield return inner.Current;
                    var secs = (System.DateTime.UtcNow - t0).TotalSeconds;
                    var ev = failed.Where(f => !f.Contains(" combat:")).ToList();
                    everyday.AddRange(ev);
                    File.WriteAllText(Path.Combine(dir, tag + ".chunk.json"), JsonConvert.SerializeObject(new Dictionary<string, object>
                    {
                        ["Hash"] = hash, ["Ids"] = batches[k], ["Measured"] = measured[0], ["Failures"] = failed, ["Seconds"] = secs, ["Switches"] = switches ?? "",
                    }, Formatting.Indented));
                    Debug.Log($"EVERYDAY SCREEN {tag} [{switches}]: {batches[k].Length} people, {measured[0]} measures, {ev.Count} everyday failures, {secs:0} s\n" + string.Join("\n", ev));
                }
            }
            finally
            {
                assets.Combat = combat;
                SetBisect(null);
                Object.Destroy(toes);
                if (watch != null) Object.Destroy(watch);
            }
            Debug.Log($"EVERYDAY SCREEN total: {everyday.Count} everyday failures\n" + string.Join("\n", everyday));
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        // TEMP (1127f): each recorded locomotion clip BARE (a manual PlayableGraph, no runtime system) on its own actor and on each
        // listed person's body of its set, Unity's foot IK off and on (the Locomotion state has it on), at the clip's own keys:
        // the hips' height, the ankles and toes in the root's frame, each foot's turn, and on the bodies the body mesh's lowest
        // foot-skinned vertex per foot (root frame). Writes test-results/loco_touch.csv and loco_touch.txt. LOCO_PEOPLE narrows it.
        [UnityTest, Timeout(3600000)]
        public IEnumerator LocoTouch() => Fixed(LocoBare());

        /// <summary>The toes' bend at their joint from a rest local rotation, degrees, + up (the tip raised against the foot).</summary>
        private static float ToeBend(Transform foot, Transform toe, Quaternion rest, Vector3 tip)
        {
            if (toe == null) return 0f;
            var sc = toe.localScale; var p = new Vector3(tip.x * sc.x, tip.y * sc.y, tip.z * sc.z);
            if (p.sqrMagnitude < 1e-10f) p = Vector3.forward * 0.05f;
            var now = toe.localRotation * p; var was = rest * p;
            var a = Vector3.Angle(now, was);
            var parent = toe.parent != null ? toe.parent.rotation : foot.rotation;
            return (parent * now).y >= (parent * was).y ? a : -a;
        }

        private static int[][] FootVerts(SkinnedMeshRenderer r, Transform[] foot, Transform[] toe)
        {
            var m = r.sharedMesh; var bones = r.bones;
            var bpv = m.GetBonesPerVertex(); var bw = m.GetAllBoneWeights();
            var lists = new[] { new List<int>(), new List<int>() };
            var o = 0;
            for (var v = 0; v < bpv.Length; v++)
            {
                var sh = new float[2];
                for (var j = o; j < o + bpv[v]; j++)
                {
                    var b = bw[j].boneIndex < bones.Length ? bones[bw[j].boneIndex] : null;
                    for (var s = 0; s < 2; s++) if (b != null && (b == foot[s] || (toe[s] != null && b == toe[s]))) sh[s] += bw[j].weight;
                }
                o += bpv[v];
                for (var s = 0; s < 2; s++) if (sh[s] > 0.5f) lists[s].Add(v);
            }
            return new[] { lists[0].ToArray(), lists[1].ToArray() };
        }

        private static IEnumerator LocoBare()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var rec = AssetDatabase.LoadAssetAtPath<StepRecord>("Assets/SecondFace/Game/Resources/StepRecord.asset");
            Assert.That(cat, Is.Not.Null); Assert.That(rec, Is.Not.Null);
            var who = (System.Environment.GetEnvironmentVariable("LOCO_PEOPLE") ?? "Female_Adult_01,Female_Adult_09,Business_Female_02,Construction_Female_01,Male_Adult_08,Male_Adult_03,Construction_Male_03,Male_Adult_12,Police_Male_07,Female_Adult_04,Medical_Female_01")
                .Split(',').Select(w => w.Trim()).Where(w => w.Length > 0).ToArray();
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            var csv = new System.Text.StringBuilder("rig,person,clip,ik,k,t,hipsY");
            foreach (var s in new[] { "L", "R" }) csv.Append($",a{s}x,a{s}y,a{s}z,t{s}x,t{s}y,t{s}z,q{s}x,q{s}y,q{s}z,q{s}w,low{s}x,low{s}y,low{s}z,b{s}");
            csv.AppendLine();
            var txt = new System.Text.StringBuilder($"loco touch {System.DateTime.UtcNow:u}\n");
            var root = new GameObject("loco touch");
            var x = 0f;
            var iv = System.Globalization.CultureInfo.InvariantCulture;
            foreach (var c in rec.Clips)
            {
                if (c == null || c.Motion == null) continue;
                var path = AssetDatabase.GetAssetPath(c.Motion);
                var jp = Path.ChangeExtension(path, ".json");
                var j = Newtonsoft.Json.Linq.JObject.Parse(File.ReadAllText(jp));
                var set = (string)j["set"] ?? "both"; var fps = j["fps"] != null ? (float)j["fps"] : 30f;
                var frames = j["frames"] != null ? (int)j["frames"] : Mathf.RoundToInt(c.Motion.length * fps) + 1;
                var own = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                var rigs = new List<(string Label, string Person, GameObject Go, Animator A, SkinnedMeshRenderer Body, int[][] Feet)>();
                var model = (GameObject)Object.Instantiate(AssetDatabase.LoadAssetAtPath<GameObject>(path), new Vector3(x, 0f, 40f), Quaternion.identity, root.transform);
                var ma = model.GetComponent<Animator>(); if (ma == null) ma = model.AddComponent<Animator>();
                ma.avatar = own; ma.runtimeAnimatorController = null; ma.applyRootMotion = false; ma.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                rigs.Add(("actor", "actor", model, ma, null, null));
                var k0 = 0;
                foreach (var id in who)
                {
                    var male = !id.Contains("Female");
                    if ((set == "m" && !male) || (set == "f" && male)) continue;
                    var go = Object.Instantiate(cat.Get(id), new Vector3(x + (++k0) * 3f, 0f, 0f), Quaternion.identity, root.transform);
                    foreach (var mb in go.GetComponentsInChildren<MonoBehaviour>(true)) mb.enabled = false;
                    var a = go.GetComponentInChildren<Animator>();
                    a.runtimeAnimatorController = null; a.applyRootMotion = false; a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    var body = go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).OrderByDescending(r => r.sharedMesh.vertexCount).First();
                    var foot = new[] { a.GetBoneTransform(HumanBodyBones.LeftFoot), a.GetBoneTransform(HumanBodyBones.RightFoot) };
                    var toe = new[] { a.GetBoneTransform(HumanBodyBones.LeftToes), a.GetBoneTransform(HumanBodyBones.RightToes) };
                    rigs.Add(("body", id, go, a, body, FootVerts(body, foot, toe)));
                    txt.AppendLine($"{c.Name}: {id} skeleton {SecondFace.Game.Fighting.CombatSet.SkeletonKey(a)} hipsY at the bind {(a.GetBoneTransform(HumanBodyBones.Hips).position.y - a.transform.position.y):0.0000}");
                }
                txt.AppendLine($"{c.Name}: set {set} fps {fps} frames {frames} length {c.Motion.length:0.0000} actor avatar {(own != null ? own.name : "-")} human {(own != null && own.isHuman)} hipsY at the bind {(ma.GetBoneTransform(HumanBodyBones.Hips) != null ? ma.GetBoneTransform(HumanBodyBones.Hips).position.y - model.transform.position.y : float.NaN):0.0000}");
                x += 40f;
                // each rig's toes at its bind, before any evaluation
                var rests = new Dictionary<string, Quaternion[]>();
                foreach (var r in rigs)
                {
                    var tl = r.A.GetBoneTransform(HumanBodyBones.LeftToes); var tr = r.A.GetBoneTransform(HumanBodyBones.RightToes);
                    rests[r.Label + r.Person] = new[] { tl != null ? tl.localRotation : Quaternion.identity, tr != null ? tr.localRotation : Quaternion.identity };
                }
                var baked = new Mesh();
                foreach (var ik in new[] { false, true })
                {
                    foreach (var r in rigs)
                    {
                        var g = PlayableGraph.Create("lt_" + r.Label); g.SetTimeUpdateMode(DirectorUpdateMode.Manual);
                        var o = AnimationPlayableOutput.Create(g, "o", r.A);
                        var cp = AnimationClipPlayable.Create(g, c.Motion); cp.SetApplyFootIK(ik); cp.SetSpeed(1f);
                        o.SetSourcePlayable(cp); g.Play();
                        var rt = r.A.transform; var irot = Quaternion.Inverse(rt.rotation);
                        Transform B(HumanBodyBones b) => r.A.GetBoneTransform(b);
                        var toeRest = rests[r.Label + r.Person];
                        for (var k = 0; k < frames; k++)
                        {
                            var t = Mathf.Min(k / fps, c.Motion.length);
                            cp.SetTime(t); cp.SetDone(false); g.Evaluate(0f);
                            var row = new System.Text.StringBuilder();
                            row.Append(string.Format(iv, "{0},{1},{2},{3},{4},{5:0.0000},{6:0.0000}", r.Label, r.Person, c.Name, ik ? 1 : 0, k, t, rt.InverseTransformPoint(B(HumanBodyBones.Hips).position).y));
                            Vector3[] v = null;
                            if (r.Body != null) { r.Body.BakeMesh(baked, true); v = baked.vertices; var tr = r.Body.transform; var mw = Matrix4x4.TRS(tr.position, tr.rotation, Vector3.one); for (var i = 0; i < v.Length; i++) v[i] = mw.MultiplyPoint3x4(v[i]); }
                            for (var s = 0; s < 2; s++)
                            {
                                var ft = B(s == 0 ? HumanBodyBones.LeftFoot : HumanBodyBones.RightFoot); var tt = B(s == 0 ? HumanBodyBones.LeftToes : HumanBodyBones.RightToes);
                                var an = rt.InverseTransformPoint(ft.position); var to = tt != null ? rt.InverseTransformPoint(tt.position) : an;
                                var q = irot * ft.rotation;
                                var low = new Vector3(float.NaN, float.NaN, float.NaN);
                                if (v != null) { var best = float.MaxValue; foreach (var i in r.Feet[s]) if (v[i].y < best) { best = v[i].y; low = rt.InverseTransformPoint(v[i]); } }
                                var bend = tt != null && tt.childCount > 0 ? ToeBend(ft, tt, toeRest[s], tt.GetChild(0).localPosition) : tt != null ? ToeBend(ft, tt, toeRest[s], Vector3.zero) : 0f;
                                row.Append(string.Format(iv, ",{0:0.00000},{1:0.00000},{2:0.00000},{3:0.00000},{4:0.00000},{5:0.00000},{6:0.000000},{7:0.000000},{8:0.000000},{9:0.000000},{10:0.00000},{11:0.00000},{12:0.00000},{13:0.0}", an.x, an.y, an.z, to.x, to.y, to.z, q.x, q.y, q.z, q.w, low.x, low.y, low.z, bend));
                            }
                            csv.AppendLine(row.ToString());
                        }
                        g.Destroy();
                    }
                    yield return null;
                }
                Object.Destroy(baked);
                foreach (var r in rigs) Object.DestroyImmediate(r.Go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(dir, "loco_touch.csv"), csv.ToString());
            File.WriteAllText(Path.Combine(dir, "loco_touch.txt"), txt.ToString());
            Object.Destroy(root);
            Debug.Log("LocoTouch done");
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }

        // TEMP (1127f, v5): the foot plant's catch (the hips set down onto a slow lower foot, both feet up) frame by frame: what the
        // catch reads at the start of the plant's frame (last frame's dips and sole paces), the body's pace and slowing, the stand
        // test, the sink and the stride's lowest before and after the plant. Writes test-results/catch_<person>.csv.
        [DefaultExecutionOrder(-25)]
        public sealed class CatchPre : MonoBehaviour { public CatchRec P; private void LateUpdate() { if (P != null) P.Pre(); } }

        [DefaultExecutionOrder(-19)]
        public sealed class CatchRec : MonoBehaviour
        {
            public MotionProbe Probe; private FootPlant _fp; private Animator _a; private StreamWriter _w;
            private const BindingFlags NP = BindingFlags.NonPublic | BindingFlags.Instance;
            private string _pre = ""; private Vector3 _rootWas; private bool _haveRoot;
            private object F(string n) => typeof(FootPlant).GetField(n, NP)?.GetValue(_fp);
            private float Fl(string n) => F(n) is float x ? x : float.NaN;
            private string B(string n) => F(n) is bool b ? (b ? "1" : "0") : "";
            private void Start()
            {
                _fp = GetComponent<FootPlant>(); _a = GetComponent<Animator>();
                var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
                _w = new StreamWriter(Path.Combine(dir, $"catch_{Probe.Person}.csv")) { AutoFlush = false };
                _w.WriteLine($"# CatchPace {_fp.CatchPace} CatchSlow {_fp.CatchSlow} CatchLift {_fp.CatchLift} StandSpeed {_fp.StandSpeed} WalkFlight {_fp.WalkFlight} SlowingAccel {_fp.SlowingAccel}");
                _w.WriteLine("frame,t,state,moved,speedParam,rate,haveDipWas,dipWasL,dipWasR,soleVWasL,soleVWasR,bodyWas,accelWas,lowWas,sinkWas,plantWas,halted,body,accel,low,sink,plant,dipL,dipR,lockL,lockR,liftL,liftR,g_have,g_notStanding,g_pace,g_dipL,g_dipR,g_slowL,g_slowR,caught,g_paceMin,caughtMin,hipsY,rootY,drawnL,drawnR");
            }
            public void Pre()
            {
                if (_fp == null || Probe == null || Probe.State == null) { _pre = ""; return; }
                _pre = $"{B("_haveDipWas")},{Fl("_dipWasL"):0.0000},{Fl("_dipWasR"):0.0000},{Fl("_soleVWasL"):0.000},{Fl("_soleVWasR"):0.000},{Fl("_bodySpeed"):0.000},{Fl("_accel"):0.000},{Fl("_low"):0.0000},{Fl("_sink"):0.0000},{Fl("_plant"):0.000}";
            }
            private void LateUpdate()
            {
                if (_w == null || _pre.Length == 0) { _haveRoot = false; return; }
                var dt = Time.deltaTime; var root = _fp.transform.position;
                // (as the plant reads it: none across a teleport, a body set down elsewhere)
                var moved = _haveRoot && dt > 0f ? ((root - _rootWas).sqrMagnitude > 0.25f ? 0f : new Vector2(root.x - _rootWas.x, root.z - _rootWas.z).magnitude / dt) : float.NaN;
                _rootWas = root; _haveRoot = true;
                float P(string n) { foreach (var p in _a.parameters) if (p.name == n && p.type == AnimatorControllerParameterType.Float) return _a.GetFloat(n); return float.NaN; }
                var speed = P("Speed"); var rate = P("LocoRate");
                var halted = B("_halted"); var body = Fl("_bodySpeed");
                var standing = speed < _fp.StandSpeed || halted == "1";
                var pre = _pre.Split(',');
                bool have = pre[0] == "1"; float dl = float.Parse(pre[1]), dr = float.Parse(pre[2]), vl = float.Parse(pre[3]), vr = float.Parse(pre[4]);
                var gPace = body < _fp.CatchPace; var gDL = dl > _fp.CatchLift; var gDR = dr > _fp.CatchLift; var gSL = vl < _fp.CatchSlow; var gSR = vr < _fp.CatchSlow;
                var caught = have && !standing && gPace && gDL && gDR && (gSL || gSR);
                var gPaceMin = Mathf.Min(float.IsNaN(moved) ? body : moved, body) < _fp.CatchPace;
                var caughtMin = have && !standing && gPaceMin && gDL && gDR && (gSL || gSR);
                string Bo(bool b) => b ? "1" : "0";
                var hips = F("_hips") as Transform;
                string Drawn(string f, string t)
                {
                    var foot = F(f) as Transform; var toe = F(t) as Transform;
                    var hl = typeof(FootPlant).GetMethod("HullLow", NP); var ga = typeof(FootPlant).GetMethod("GroundAt", NP);
                    if (foot == null || hl == null || ga == null) return "";
                    var g = (float)ga.Invoke(_fp, new object[] { foot.position, null });
                    return ((float)hl.Invoke(_fp, new object[] { foot, toe }) - g).ToString("0.0000");
                }
                _w.WriteLine($"{Time.frameCount},{Time.time:0.000},{Probe.State},{moved:0.000},{speed:0.000},{rate:0.000},{_pre},{halted},{body:0.000},{Fl("_accel"):0.000},{Fl("_low"):0.0000},{Fl("_sink"):0.0000},{Fl("_plant"):0.000},{_fp.Diag[0]:0.0000},{_fp.Diag[4]:0.0000},{_fp.Diag[3]:0.0},{_fp.Diag[7]:0.0},{_fp.Diag[2]:0.0000},{_fp.Diag[6]:0.0000},{Bo(have)},{Bo(!standing)},{Bo(gPace)},{Bo(gDL)},{Bo(gDR)},{Bo(gSL)},{Bo(gSR)},{Bo(caught)},{Bo(gPaceMin)},{Bo(caughtMin)},{(hips != null ? hips.position.y : float.NaN):0.0000},{root.y:0.0000},{Drawn("_footL", "_toeL")},{Drawn("_footR", "_toeR")}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }

        // TEMP (1127f, v6): in any play-mode test run with CATCH_WATCH=1 (the game's own walkers and followers on their navigation
        // agents), every frame a foot plant's catch fires by the smoothed pace or by the slower of the raw and the smoothed one:
        // test-results/game_catch.csv
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void CatchWatch()
        {
            if (System.Environment.GetEnvironmentVariable("CATCH_WATCH") != "1") return;
            var go = new GameObject("catch watch"); Object.DontDestroyOnLoad(go); go.AddComponent<GameCatchWatch>();
        }
        public sealed class GameCatchWatch : MonoBehaviour
        {
            public static StreamWriter W;
            private void Update()
            {
                if (W == null)
                {
                    var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results")); Directory.CreateDirectory(dir);
                    W = new StreamWriter(Path.Combine(dir, "game_catch.csv")) { AutoFlush = true };
                    W.WriteLine("t,who,moved,body,accel,speedParam,dipWasL,dipWasR,soleVWasL,soleVWasR,caught,caughtMin,sinkWas,sink,hipsY,drawnL,drawnR,frames");
                }
                foreach (var fp in Object.FindObjectsByType<FootPlant>(FindObjectsSortMode.None))
                    if (fp.GetComponent<GameCatch>() == null) { var c = fp.gameObject.AddComponent<GameCatch>(); fp.gameObject.AddComponent<GameCatchPre>().P = c; }
            }
            private void OnDestroy() { W?.Flush(); W?.Close(); W = null; }
        }
        [DefaultExecutionOrder(-25)]
        public sealed class GameCatchPre : MonoBehaviour { public GameCatch P; private void LateUpdate() { if (P != null) P.Pre(); } }
        [DefaultExecutionOrder(-19)]
        public sealed class GameCatch : MonoBehaviour
        {
            private const BindingFlags NP = BindingFlags.NonPublic | BindingFlags.Instance;
            private FootPlant _fp; private Animator _a; private Vector3 _was; private bool _have; private int _n;
            private bool _hd; private float _dl, _dr, _vl, _vr, _sinkWas;
            private object F(string n) => typeof(FootPlant).GetField(n, NP)?.GetValue(_fp);
            private float Fl(string n) => F(n) is float x ? x : float.NaN;
            public void Pre()
            {
                if (_fp == null) { _fp = GetComponent<FootPlant>(); _a = GetComponent<Animator>(); }
                if (_fp == null) return;
                _hd = F("_haveDipWas") is bool b && b; _dl = Fl("_dipWasL"); _dr = Fl("_dipWasR"); _vl = Fl("_soleVWasL"); _vr = Fl("_soleVWasR"); _sinkWas = Fl("_sink");
            }
            private void LateUpdate()
            {
                if (_fp == null || !_fp.enabled) { _have = false; return; }
                _n++;
                var dt = Time.deltaTime; var root = _fp.transform.position;
                var moved = _have && dt > 0f ? ((root - _was).sqrMagnitude > 0.25f ? 0f : new Vector2(root.x - _was.x, root.z - _was.z).magnitude / dt) : float.NaN;
                _was = root; _have = true;
                if (float.IsNaN(moved)) return;
                var body = Fl("_bodySpeed"); var speed = 0f;
                if (_a != null) foreach (var p in _a.parameters) if (p.name == "Speed" && p.type == AnimatorControllerParameterType.Float) speed = _a.GetFloat("Speed");
                var standing = speed < _fp.StandSpeed || (F("_halted") is bool h && h);
                var rest = _hd && !standing && _dl > _fp.CatchLift && _dr > _fp.CatchLift && (_vl < _fp.CatchSlow || _vr < _fp.CatchSlow);
                var c1 = rest && body < _fp.CatchPace; var c2 = rest && Mathf.Min(moved, body) < _fp.CatchPace;
                if (!c1 && !c2) return;
                var hips = F("_hips") as Transform;
                string Drawn(string f, string t)
                {
                    var foot = F(f) as Transform; var toe = F(t) as Transform;
                    var hl = typeof(FootPlant).GetMethod("HullLow", NP); var ga = typeof(FootPlant).GetMethod("GroundAt", NP);
                    if (foot == null || hl == null || ga == null) return "";
                    var g = (float)ga.Invoke(_fp, new object[] { foot.position, null });
                    return ((float)hl.Invoke(_fp, new object[] { foot, toe }) - g).ToString("0.0000");
                }
                GameCatchWatch.W?.WriteLine($"{Time.time:0.000},{_fp.gameObject.name}#{_fp.GetInstanceID()},{moved:0.000},{body:0.000},{Fl("_accel"):0.000},{speed:0.000},{_dl:0.0000},{_dr:0.0000},{_vl:0.000},{_vr:0.000},{(c1 ? 1 : 0)},{(c2 ? 1 : 0)},{_sinkWas:0.0000},{Fl("_sink"):0.0000},{(hips != null ? hips.position.y : float.NaN):0.0000},{Drawn("_footL", "_toeL")},{Drawn("_footR", "_toeR")},{_n}");
            }
        }

        // TEMP (1127e): each traced person's base layer, frame by frame: the state's phase and the clips playing, by file
        public sealed class PhaseWatcher : MonoBehaviour
        {
            private static readonly string[] Who = (System.Environment.GetEnvironmentVariable("GATE_TRACE") ?? "").Split(',').Where(x => x.Length > 0).ToArray();
            private void Update()
            {
                foreach (var p in Object.FindObjectsByType<MotionProbe>(FindObjectsSortMode.None))
                {
                    if (p.Person == null || p.GetComponent<PhaseRec>() != null || !Who.Contains(p.Person)) continue;
                    var r = p.gameObject.AddComponent<PhaseRec>(); r.Probe = p;
                    var cr = p.gameObject.AddComponent<CatchRec>(); cr.Probe = p; p.gameObject.AddComponent<CatchPre>().P = cr;
                    var sp = p.gameObject.AddComponent<SoleProbe>(); sp.Probe = p;
                    p.gameObject.AddComponent<SolePre>().P = sp; p.gameObject.AddComponent<SoleMid>().P = sp;
                }
            }
        }

        [DefaultExecutionOrder(10006)]
        public sealed class PhaseRec : MonoBehaviour
        {
            public MotionProbe Probe; private StreamWriter _w; private Animator _a;
            private static readonly Dictionary<AnimationClip, string> Names = new();
            private void Start()
            {
                _a = GetComponent<Animator>();
                var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
                _w = new StreamWriter(Path.Combine(dir, $"phase_{Probe.Person}.csv")) { AutoFlush = false };
                _w.WriteLine("state,t,norm,trans,nextnorm,clips");
            }
            private static string Name(AnimationClip c)
            {
                if (c == null) return "-";
                if (Names.TryGetValue(c, out var n)) return n;
#if UNITY_EDITOR
                n = Path.GetFileNameWithoutExtension(AssetDatabase.GetAssetPath(c));
#else
                n = c.name;
#endif
                Names[c] = n; return n;
            }
            private void LateUpdate()
            {
                if (_w == null || _a == null || Probe.State == null) return;
                if (!Probe.State.Contains("walk") && !Probe.State.Contains("jog") && !Probe.State.Contains("sneak")) return;
                var st = _a.GetCurrentAnimatorStateInfo(0); var tr = _a.IsInTransition(0);
                var nx = tr ? _a.GetNextAnimatorStateInfo(0) : default;
                var sb = new System.Text.StringBuilder();
                foreach (var ci in _a.GetCurrentAnimatorClipInfo(0)) if (ci.weight > 0.01f) sb.Append($"{Name(ci.clip)}:{ci.weight:0.000}:{ci.clip.length:0.0000}:{st.normalizedTime:0.0000};");
                if (tr) foreach (var ci in _a.GetNextAnimatorClipInfo(0)) if (ci.weight > 0.01f) sb.Append($"{Name(ci.clip)}:{ci.weight:0.000}:{ci.clip.length:0.0000}:{nx.normalizedTime:0.0000}:next;");
                _w.WriteLine($"{Probe.State},{Time.time:0.000},{st.normalizedTime:0.0000},{(tr ? _a.GetAnimatorTransitionInfo(0).normalizedTime : -1f):0.000},{(tr ? nx.normalizedTime : -1f):0.0000},{sb}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }

        // TEMP (1127f): the foot plant's sole model against the mesh as drawn, frame by frame, for each traced person in the
        // walks: each sole term (heel, back, ball, tip and the hull's lowest) where the plant evaluates them (the clip's pose, the
        // hips' sink and the toes' straightening put back on: the pose of FootPlant.SoleOver, checked against its own Diag dip),
        // which is the lowest, the hull's lowest point's source (renderer, vertex, dominant bone and weight, found on the pose the
        // hull was made on) and where that vertex really is; the mesh's own lowest foot-skinned vertex (more than half its weight
        // on the foot and toe bones) on the same pose; then the same on the pose as drawn (after every runtime system), with the
        // gate's own foot part and its heel and ball points. Writes test-results/sole_<person>.csv and sole_<person>.txt.
        [DefaultExecutionOrder(-25)]
        public sealed class SolePre : MonoBehaviour { public SoleProbe P; private void LateUpdate() { if (P != null) P.Pre(); } }

        [DefaultExecutionOrder(-19)]
        public sealed class SoleMid : MonoBehaviour { public SoleProbe P; private void LateUpdate() { if (P != null) P.Mid(); } }

        [DefaultExecutionOrder(10007)]
        public sealed class SoleProbe : MonoBehaviour
        {
            public MotionProbe Probe;
            private const BindingFlags NP = BindingFlags.NonPublic | BindingFlags.Instance;
            private FootPlant _fp; private Transform _hips;
            private readonly Transform[] _foot = new Transform[2], _toe = new Transform[2];
            private readonly Vector3[] _heel = new Vector3[2], _back = new Vector3[2], _ball = new Vector3[2], _tip = new Vector3[2];
            private readonly Vector3[][] _hf = new Vector3[2][], _ht = new Vector3[2][];
            private readonly Quaternion[] _toeRest = new Quaternion[2];
            private MethodInfo _soleOver, _groundAt; private FieldInfo _plantF, _clockF;
            private SkinnedMeshRenderer[] _rs; private Mesh _baked; private int _body = -1;
            private int[][] _off; private BoneWeight1[][] _bw;
            private int[][][] _footVerts;                  // [renderer][side]: vertices with more than half their weight on that foot and its toes
            private int[][][] _toeVerts;                   // [renderer][side]: vertices with more than half their weight on that foot's toes
            private bool _straighten; private Vector2 _pitchLow;
            private readonly (int r, int v, float d)[][] _src = new (int r, int v, float d)[2][];      // [side][hull index: the foot frame's points, then the toes']: the source vertex
            private Transform[] _all; private Vector3[] _p1, _p2, _s1, _s2; private Quaternion[] _q1, _q2;
            private bool _init, _snap, _bad;
            private StreamWriter _w;
            private readonly Matrix4x4[] _footRestM = new Matrix4x4[2];
            private readonly Vector3[] _ankleRest = new Vector3[2], _fwdRest = new Vector3[2];
            private string _midRow = "";
            private string _midExtra = ",,,,,,,,,,,,,,,,,,,,";
            private string _midToe = ",,";
            // (v4) each sole point's frame as the plant holds it (toes' frame: true); main's plant has none: heel/back/ball on the foot, tip on the toes
            private bool[][] _frames = { new[] { false, false, false, true }, new[] { false, false, false, true } };
            private readonly Vector3[] _tipToe = new Vector3[2]; private readonly Quaternion[] _toeRestLocal = new Quaternion[2];
            private FieldInfo _lockFL, _lockFR;
            private Transform Tf(int s, int i) => _frames[s][i] && _toe[s] != null ? _toe[s] : _foot[s];
            private string PushOf(int s)
            {
                var lf = s == 0 ? _lockFL : _lockFR;
                if (lf == null) return "";
                var k = lf.GetValue(_fp); var t = k.GetType();
                var on = t.GetField("On"); var push = t.GetField("Push");
                if (on == null || push == null) return "";
                return (bool)on.GetValue(k) && (bool)push.GetValue(k) ? "1" : "0";
            }
            private (int r, int v) LowestToeIdx(int s, Vector3[][] verts)
            {
                var best = float.MaxValue; var br = -1; var bv = -1;
                for (var ri = 0; ri < verts.Length; ri++) foreach (var v in _toeVerts[ri][s]) { var y = verts[ri][v].y; if (y < best) { best = y; br = ri; bv = v; } }
                return (br, bv);
            }
            private string ToeLow(Vector3[][] verts, int s, float g)
            {
                var best = float.MaxValue;
                for (var ri = 0; ri < verts.Length; ri++) foreach (var v in _toeVerts[ri][s]) if (verts[ri][v].y < best) best = verts[ri][v].y;
                return best < float.MaxValue ? (best - g).ToString("0.0000") : "";
            }
            private readonly float[] _toeClip = new float[2], _toeW = new float[2];
            private Vector3[][] _prevM, _prevD; private int _prevMFrame = -10, _prevDFrame = -10;
            private byte[] _seg; private int[] _solePoint; private SkinnedMeshRenderer _gateSmr;
            private static readonly string[] Sides = { "L", "R" };

            private object F(string n) => typeof(FootPlant).GetField(n, NP)?.GetValue(_fp);
            private static string PathOf(Transform root, Transform t)
            {
                var parts = new List<string>();
                for (var x = t; x != null && x != root; x = x.parent) parts.Add(x.name);
                parts.Reverse(); return string.Join("/", parts);
            }
            private static bool Walks(string s) => s != null && (s.Contains("walk") || s.Contains("jog") || s.Contains("sneak"));
            private float Ground(Vector3 p)
            {
                var args = new object[] { p, null };
                return (float)_groundAt.Invoke(_fp, args);
            }
            private float Along(int s, Vector3 local) => Vector3.Dot(_footRestM[s].MultiplyPoint3x4(local) - _ankleRest[s], _fwdRest[s]);

            private Vector3[] BakeWorld(SkinnedMeshRenderer r, bool fullTransform)
            {
                r.BakeMesh(_baked, true);
                var v = _baked.vertices; var tr = r.transform;
                var m = fullTransform ? tr.localToWorldMatrix : Matrix4x4.TRS(tr.position, tr.rotation, Vector3.one);
                for (var i = 0; i < v.Length; i++) v[i] = m.MultiplyPoint3x4(v[i]);
                return v;
            }

            private void Init()
            {
                _init = true;
                var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
                var info = new System.Text.StringBuilder();
                try
                {
                    _fp = GetComponent<FootPlant>();
                    _foot[0] = (Transform)F("_footL"); _toe[0] = (Transform)F("_toeL"); _foot[1] = (Transform)F("_footR"); _toe[1] = (Transform)F("_toeR");
                    _heel[0] = (Vector3)F("_heelL"); _back[0] = (Vector3)F("_backL"); _ball[0] = (Vector3)F("_ballL"); _tip[0] = (Vector3)F("_tipL");
                    _heel[1] = (Vector3)F("_heelR"); _back[1] = (Vector3)F("_backR"); _ball[1] = (Vector3)F("_ballR"); _tip[1] = (Vector3)F("_tipR");
                    _hf[0] = (Vector3[])F("_hullFL"); _ht[0] = (Vector3[])F("_hullTL"); _hf[1] = (Vector3[])F("_hullFR"); _ht[1] = (Vector3[])F("_hullTR");
                    _toeRest[0] = (Quaternion)F("_toeRestL"); _toeRest[1] = (Quaternion)F("_toeRestR");
                    _toeRestLocal[0] = _toeRest[0]; _toeRestLocal[1] = _toeRest[1];
                    if (F("_toeFrameL") is bool[] tfl && F("_toeFrameR") is bool[] tfr) _frames = new[] { tfl, tfr };
                    _lockFL = typeof(FootPlant).GetField("_lockL", NP); _lockFR = typeof(FootPlant).GetField("_lockR", NP);
                    _hips = (Transform)F("_hips");
                    _soleOver = typeof(FootPlant).GetMethod("SoleOver", NP); _groundAt = typeof(FootPlant).GetMethod("GroundAt", NP);
                    // (the toes straightened on the moving branch only where the plant still has its Toes(): main's ankle test)
                    _straighten = typeof(FootPlant).GetMethod("Toes", NP) != null;
                    var plf = typeof(FootPlant).GetField("PitchLow", BindingFlags.Public | BindingFlags.Instance);
                    _pitchLow = plf != null ? (Vector2)plf.GetValue(_fp) : Vector2.zero;
                    info.AppendLine($"plant straightens the toes on the moving branch: {_straighten}");
                    _plantF = typeof(FootPlant).GetField("_plant", NP); _clockF = typeof(MotionProbe).GetField("_clock", NP);
                    _seg = (byte[])typeof(MotionProbe).GetField("_seg", NP).GetValue(Probe);
                    _solePoint = (int[])typeof(MotionProbe).GetField("_solePoint", NP).GetValue(Probe);
                    _gateSmr = (SkinnedMeshRenderer)typeof(MotionProbe).GetField("_smr", NP).GetValue(Probe);
                    _baked = new Mesh();
                    _rs = _fp.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.sharedMesh != null).ToArray();
                    _body = System.Array.IndexOf(_rs, _gateSmr);
                    _all = _fp.GetComponentsInChildren<Transform>(true);
                    var n = _all.Length;
                    _p1 = new Vector3[n]; _p2 = new Vector3[n]; _s1 = new Vector3[n]; _s2 = new Vector3[n]; _q1 = new Quaternion[n]; _q2 = new Quaternion[n];
                    // each renderer's skin weights, and its vertices skinned mostly to each foot
                    _off = new int[_rs.Length][]; _bw = new BoneWeight1[_rs.Length][]; _footVerts = new int[_rs.Length][][]; _toeVerts = new int[_rs.Length][][];
                    for (var ri = 0; ri < _rs.Length; ri++)
                    {
                        var r = _rs[ri]; var m = r.sharedMesh; var bones = r.bones;
                        _footVerts[ri] = new[] { new int[0], new int[0] }; _toeVerts[ri] = new[] { new int[0], new int[0] };
                        try
                        {
                            var bpv = m.GetBonesPerVertex(); var bw = m.GetAllBoneWeights();
                            var off = new int[bpv.Length + 1];
                            for (var i = 0; i < bpv.Length; i++) off[i + 1] = off[i] + bpv[i];
                            _off[ri] = off; _bw[ri] = bw.ToArray();
                            var lists = new[] { new List<int>(), new List<int>() }; var tlists = new[] { new List<int>(), new List<int>() };
                            for (var v = 0; v < bpv.Length; v++)
                                for (var s = 0; s < 2; s++)
                                {
                                    var share = 0f; var tshare = 0f;
                                    for (var j = off[v]; j < off[v + 1]; j++)
                                    {
                                        var b = _bw[ri][j].boneIndex < bones.Length ? bones[_bw[ri][j].boneIndex] : null;
                                        if (b != null && (b == _foot[s] || (_toe[s] != null && b == _toe[s]))) share += _bw[ri][j].weight;
                                        if (b != null && _toe[s] != null && b == _toe[s]) tshare += _bw[ri][j].weight;
                                    }
                                    if (share > 0.5f) lists[s].Add(v);
                                    if (tshare > 0.5f) tlists[s].Add(v);
                                }
                            _footVerts[ri] = new[] { lists[0].ToArray(), lists[1].ToArray() };
                            _toeVerts[ri] = new[] { tlists[0].ToArray(), tlists[1].ToArray() };
                        }
                        catch (System.Exception e) { info.AppendLine($"renderer {r.name}: no skin weights read: {e.Message}"); }
                        info.AppendLine($"renderer {ri} {r.name} active={r.gameObject.activeInHierarchy} enabled={r.enabled} verts={m.vertexCount} lossyScale={r.transform.lossyScale.x:0.0000},{r.transform.lossyScale.y:0.0000},{r.transform.lossyScale.z:0.0000} footVertsL={_footVerts[ri][0].Length} footVertsR={_footVerts[ri][1].Length} toeVertsL={_toeVerts[ri][0].Length} toeVertsR={_toeVerts[ri][1].Length}{(ri == _body ? " (the gate's body)" : "")}");
                    }
                    Provenance(info);
                }
                catch (System.Exception e) { _bad = true; info.AppendLine("INIT FAILED: " + e); }
                File.WriteAllText(Path.Combine(dir, $"sole_{Probe.Person}.txt"), info.ToString());
                if (_bad) return;
                _w = new StreamWriter(Path.Combine(dir, $"sole_{Probe.Person}.csv")) { AutoFlush = false };
                var head = new System.Text.StringBuilder("frame,t,clock,state,moving,sink");
                foreach (var pre in new[] { "M", "D" })
                    foreach (var s in Sides)
                    {
                        head.Append($",{pre}{s}_heel,{pre}{s}_back,{pre}{s}_ball,{pre}{s}_tip,{pre}{s}_hull,{pre}{s}_arg,{pre}{s}_hi,{pre}{s}_hsrc,{pre}{s}_mesh,{pre}{s}_meshr,{pre}{s}_mesha,{pre}{s}_body,{pre}{s}_bodya");
                        if (pre == "M") head.Append($",{pre}{s}_chk,{pre}{s}_dip");
                        else head.Append($",{pre}{s}_seg,{pre}{s}_gheel,{pre}{s}_gball,{pre}{s}_lock");
                    }
                foreach (var s in Sides) head.Append($",M{s}_cx,M{s}_cz,M{s}_csp,M{s}_bsp,M{s}_ax,M{s}_az,M{s}_e,M{s}_toeclip,M{s}_toew,M{s}_toeplant");
                foreach (var s in Sides) head.Append($",D{s}_csp,D{s}_cx,D{s}_cz");
                head.Append(",rootx,rootz,ML_toe,MR_toe,DL_toe,DR_toe");
                foreach (var s in Sides) head.Append($",D{s}_toebend,D{s}_tsp,D{s}_jx,D{s}_jz,D{s}_push");
                _w.WriteLine(head.ToString());
            }

            // the hull's points' sources: on the pose the hull was made on (the person's prefab, as at FootPlant.Awake), each stored
            // point is one baked vertex of one renderer, in its foot's (or toes') frame
            private void Provenance(System.Text.StringBuilder info)
            {
#if UNITY_EDITOR
                var root = transform; while (root.parent != null && !root.name.StartsWith("gate_")) root = root.parent;
                var id = Probe.Person.Replace(" (player)", "");
                var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
                var prefab = cat.Get(id);
                var map = new Dictionary<string, Transform>(); var dup = 0;
                foreach (var t in prefab.GetComponentsInChildren<Transform>(true)) if (!map.TryAdd(PathOf(prefab.transform, t), t)) dup++;
                var inst = root.GetComponentsInChildren<Transform>(true);
                var lp = inst.Select(t => t.localPosition).ToArray(); var lq = inst.Select(t => t.localRotation).ToArray(); var ls = inst.Select(t => t.localScale).ToArray();
                var set = 0;
                for (var i = 0; i < inst.Length; i++)
                {
                    if (inst[i] == root || !map.TryGetValue(PathOf(root, inst[i]), out var pt)) continue;
                    inst[i].localPosition = pt.localPosition; inst[i].localRotation = pt.localRotation; inst[i].localScale = pt.localScale; set++;
                }
                info.AppendLine($"provenance pose: {set} of {inst.Length} transforms set from the prefab {prefab.name} ({dup} duplicate paths)");
                try
                {
                    var verts = _rs.Select(r => BakeWorld(r, true)).ToArray();   // (as FootPlant.Hull bakes: TransformPoint)
                    for (var s = 0; s < 2; s++)
                    {
                        _footRestM[s] = _foot[s].localToWorldMatrix;
                        var a = _foot[s].position; var d = (_toe[s] != null ? _toe[s].position : a + transform.forward * 0.12f) - a; d.y = 0f;
                        _ankleRest[s] = a; _fwdRest[s] = d.normalized;
                        var toesAlong = Vector3.Dot((_toe[s] != null ? _toe[s].position : a + d) - a, _fwdRest[s]);
                        var low = verts.SelectMany((vv, ri) => _footVerts[ri][s].Select(ix => vv[ix].y)).DefaultIfEmpty(float.NaN).Min();
                        string P(Vector3 local, bool toes)
                        {
                            var w = toes && _toe[s] != null ? _toe[s].TransformPoint(local) : _foot[s].TransformPoint(local);
                            return $"along {Vector3.Dot(w - a, _fwdRest[s]) * 100f:0.0} cm, {(w.y - low) * 100f:0.00} cm over the foot-skinned lowest";
                        }
                        info.AppendLine($"foot {Sides[s]}: toe joint along {toesAlong * 100f:0.0} cm; ankle {(a.y - low) * 100f:0.0} cm over the foot-skinned lowest; plant heel {P(_heel[s], _frames[s][0])}; back {P(_back[s], _frames[s][1])}; ball {P(_ball[s], _frames[s][2])}; tip {P(_tip[s], _frames[s][3])}");
                        _tipToe[s] = _toe[s] != null ? (_frames[s][3] ? _tip[s] : _toe[s].InverseTransformPoint(_foot[s].TransformPoint(_tip[s]))) : Vector3.zero;
                        if (_gateSmr != null && _solePoint != null)
                        {
                            var gv = BakeWorld(_gateSmr, false);
                            for (var q = 0; q < 2; q++)
                            {
                                var j = _solePoint[s * 2 + q];
                                if (j >= 0) info.AppendLine($"  gate {(q == 0 ? "heel" : "ball")} vertex {j}: along {Vector3.Dot(gv[j] - a, _fwdRest[s]) * 100f:0.0} cm, {(gv[j].y - low) * 100f:0.00} cm over the foot-skinned lowest");
                            }
                        }
                        if (_body >= 0)
                        {
                            var bv = verts[_body];
                            foreach (var (tn, tl, tt) in new[] { ("heel", _heel[s], _frames[s][0]), ("back", _back[s], _frames[s][1]), ("ball", _ball[s], _frames[s][2]), ("tip", _tip[s], _frames[s][3]) })
                            {
                                var tw = tt && _toe[s] != null ? _toe[s].TransformPoint(tl) : _foot[s].TransformPoint(tl);
                                var bi = -1; var bd = float.MaxValue;
                                for (var v = 0; v < bv.Length; v++) { var dd = (bv[v] - tw).sqrMagnitude; if (dd < bd) { bd = dd; bi = v; } }
                                var (tb, tbw, tsh) = Dominant(_body, bi, s);
                                var tsh2 = 0f;
                                if (bi >= 0 && _off[_body] != null) for (var jj = _off[_body][bi]; jj < _off[_body][bi + 1]; jj++) { var e2 = _bw[_body][jj]; var bb = e2.boneIndex < _rs[_body].bones.Length ? _rs[_body].bones[e2.boneIndex] : null; if (bb != null && _toe[s] != null && bb == _toe[s]) tsh2 += e2.weight; }
                                info.AppendLine($"  term {Sides[s]} {tn}: body vertex {bi} at {Mathf.Sqrt(bd) * 1000f:0.000} mm; dominant bone {tb} {tbw:0.000}; foot+toes share {tsh:0.000}; toes share {tsh2:0.000}; stored in the {(tt ? "toes'" : "foot's")} frame");
                            }
                        }
                        var n = _hf[s].Length + _ht[s].Length;
                        _src[s] = new (int, int, float)[n];
                        for (var k = 0; k < n; k++)
                        {
                            var toes = k >= _hf[s].Length;
                            var local = toes ? _ht[s][k - _hf[s].Length] : _hf[s][k];
                            var w = toes ? _toe[s].TransformPoint(local) : _foot[s].TransformPoint(local);
                            var best = (r: -1, v: -1, d: float.MaxValue);
                            for (var ri = 0; ri < verts.Length; ri++)
                                for (var v = 0; v < verts[ri].Length; v++)
                                {
                                    var dd = (verts[ri][v] - w).sqrMagnitude;
                                    if (dd < best.d) best = (ri, v, dd);
                                }
                            best.d = Mathf.Sqrt(best.d);
                            _src[s][k] = best;
                            var (bone, bw, share) = Dominant(best.r, best.v, s);
                            info.AppendLine($"  hull {Sides[s]} {k} {(toes ? "toes" : "foot")}: {P(local, toes)}, below the ankle {(a.y - w.y) * 100f:0.0} cm; source {(best.r >= 0 ? _rs[best.r].name : "-")} vertex {best.v} at {best.d * 1000f:0.000} mm; dominant bone {bone} {bw:0.000}; this foot+toes share {share:0.000}");
                        }
                    }
                }
                finally
                {
                    for (var i = 0; i < inst.Length; i++) { inst[i].localPosition = lp[i]; inst[i].localRotation = lq[i]; inst[i].localScale = ls[i]; }
                }
#endif
            }

            private (string bone, float w, float share) Dominant(int ri, int v, int side)
            {
                if (ri < 0 || _off[ri] == null || v < 0 || v + 1 >= _off[ri].Length) return ("-", 0f, 0f);
                var bones = _rs[ri].bones; var best = -1; var bw = 0f; var share = 0f;
                for (var j = _off[ri][v]; j < _off[ri][v + 1]; j++)
                {
                    var e = _bw[ri][j];
                    if (e.weight > bw) { bw = e.weight; best = e.boneIndex; }
                    var b = e.boneIndex < bones.Length ? bones[e.boneIndex] : null;
                    if (b != null && (b == _foot[side] || (_toe[side] != null && b == _toe[side]))) share += e.weight;
                }
                return (best >= 0 && best < bones.Length && bones[best] != null ? bones[best].name : "-", bw, share);
            }

            public void Pre()
            {
                if (!_init) Init();
                _snap = false;
                if (_bad || Probe == null || !Walks(Probe.State)) return;
                for (var i = 0; i < _all.Length; i++) { _p1[i] = _all[i].localPosition; _q1[i] = _all[i].localRotation; _s1[i] = _all[i].localScale; }
                _snap = true;
            }

            // the sole terms on a pose: over the ground under the ankle; the lowest of them; the hull's lowest point and its index
            private string Terms(int s, float g, out float min, out int hi, out string arg)
            {
                var foot = _foot[s];
                var h = Tf(s, 0).TransformPoint(_heel[s]).y - g; var k = Tf(s, 1).TransformPoint(_back[s]).y - g;
                var b = Tf(s, 2).TransformPoint(_ball[s]).y - g; var t = Tf(s, 3).TransformPoint(_tip[s]).y - g;
                var u = float.MaxValue; hi = -1;
                for (var i = 0; i < _hf[s].Length; i++) { var y = foot.TransformPoint(_hf[s][i]).y; if (y < u) { u = y; hi = i; } }
                if (_toe[s] != null) for (var i = 0; i < _ht[s].Length; i++) { var y = _toe[s].TransformPoint(_ht[s][i]).y; if (y < u) { u = y; hi = _hf[s].Length + i; } }
                u -= g;
                min = h; arg = "heel";
                if (k < min) { min = k; arg = "back"; }
                if (b < min) { min = b; arg = "ball"; }
                if (t < min) { min = t; arg = "tip"; }
                if (u < min) { min = u; arg = "hull"; }
                return $"{h:0.0000},{k:0.0000},{b:0.0000},{t:0.0000},{(hi >= 0 ? u.ToString("0.0000") : "")},{arg},{hi}";
            }

            // the mesh on the pose now: each side's lowest foot-skinned vertex (any renderer; the body alone), its renderer and
            // how far along the foot it is; and where the hull's lowest point's source vertex is
            // the lowest foot-skinned vertex of a side (any renderer, or the body alone) on a pose, and the same vertex's own
            // horizontal speed from the previous frame's pose of the same kind (m/s; blank when that frame is not the one before)
            private (int r, int v) LowestIdx(int s, Vector3[][] verts, bool bodyOnly)
            {
                var best = float.MaxValue; var br = -1; var bv = -1;
                for (var ri = 0; ri < verts.Length; ri++)
                {
                    if (bodyOnly && ri != _body) continue;
                    foreach (var v in _footVerts[ri][s]) { var y = verts[ri][v].y; if (y < best) { best = y; br = ri; bv = v; } }
                }
                return (br, bv);
            }
            private static string Own((int r, int v) c, Vector3[][] now, Vector3[][] was, bool consecutive)
            {
                if (!consecutive || was == null || c.r < 0 || Time.deltaTime <= 0f) return "";
                var a = now[c.r][c.v]; var b = was[c.r][c.v];
                return (new Vector2(a.x - b.x, a.z - b.z).magnitude / Time.deltaTime).ToString("0.000");
            }

            private string MeshLow(int s, float g, Vector3[][] verts, int hi)
            {
                var best = float.MaxValue; var br = -1; var bv = -1; var body = float.MaxValue; var bodyV = -1;
                for (var ri = 0; ri < verts.Length; ri++)
                    foreach (var v in _footVerts[ri][s])
                    {
                        var y = verts[ri][v].y;
                        if (y < best) { best = y; br = ri; bv = v; }
                        if (ri == _body && y < body) { body = y; bodyV = v; }
                    }
                var src = hi >= 0 ? _src[s][hi] : (r: -1, v: -1, d: 0f);
                var hsrc = src.r >= 0 ? (verts[src.r][src.v].y - g).ToString("0.0000") : "";
                string A(int ri, int v) => ri >= 0 && v >= 0 ? (Along(s, _foot[s].InverseTransformPoint(verts[ri][v])) * 100f).ToString("0.0") : "";
                return $"{hsrc},{(br >= 0 ? (best - g).ToString("0.0000") : "")},{br},{A(br, bv)},{(bodyV >= 0 ? (body - g).ToString("0.0000") : "")},{A(_body, bodyV)}";
            }

            public void Mid()
            {
                _midRow = ""; _midExtra = ",,,,,,,,,,,,,,,,,,,,"; _midToe = ",,";
                if (!_snap || _bad) return;
                var moving = _fp.enabled && (float)_plantF.GetValue(_fp) <= 0f;
                if (!moving) return;
                for (var i = 0; i < _all.Length; i++) { _p2[i] = _all[i].localPosition; _q2[i] = _all[i].localRotation; _s2[i] = _all[i].localScale; }
                try
                {
                    // the pose FootPlant.SoleOver saw: the clip's, the hips sunk, each toe straightened toward flat
                    for (var i = 0; i < _all.Length; i++) { _all[i].localPosition = _p1[i]; _all[i].localRotation = _q1[i]; _all[i].localScale = _s1[i]; }
                    _hips.position += Vector3.up * _fp.Diag[8];
                    for (var s = 0; s < 2; s++)
                    {
                        var e = _fp.Diag[10 + s];
                        var w = _straighten ? Mathf.Clamp01((_pitchLow.y - e) / (_pitchLow.y - _pitchLow.x)) : 0f;
                        _toeClip[s] = ToeBend(_foot[s], _toe[s], _toeRest[s], _tip[s]); _toeW[s] = w;
                        if (w > 0f && _toe[s] != null) _toe[s].localRotation = Quaternion.Slerp(_toe[s].localRotation, _toeRest[s], w);
                    }
                    var verts = _rs.Select(r => BakeWorld(r, false)).ToArray();
                    var sb = new System.Text.StringBuilder();
                    for (var s = 0; s < 2; s++)
                    {
                        var g = Ground(_foot[s].position);
                        var off = Mathf.Clamp(g - _fp.transform.position.y, -_fp.Reach, _fp.Reach);
                        var terms = Terms(s, g, out var min, out var hi, out _);
                        var sole = (float)_soleOver.Invoke(_fp, new object[] { _foot[s], _toe[s], _heel[s], _back[s], _ball[s], _tip[s], g });
                        var dip = _fp.Diag[s == 0 ? 0 : 4];
                        sb.Append($",{terms},{MeshLow(s, g, verts, hi)},{(sole + off - dip) * 1000f:0.000},{dip:0.0000}");
                    }
                    _midRow = sb.ToString();
                    var exb = new System.Text.StringBuilder();
                    var con = _prevMFrame == Time.frameCount - 1;
                    for (var s = 0; s < 2; s++)
                    {
                        var c = LowestIdx(s, verts, false); var cb = LowestIdx(s, verts, true);
                        var cp = c.r >= 0 ? verts[c.r][c.v] : Vector3.zero;
                        exb.Append($",{cp.x:0.0000},{cp.z:0.0000},{Own(c, verts, _prevM, con)},{Own(cb, verts, _prevM, con)},{_foot[s].position.x:0.0000},{_foot[s].position.z:0.0000},{_fp.Diag[10 + s]:0.0000},{_toeClip[s]:0.0},{_toeW[s]:0.000},{ToeBend(_foot[s], _toe[s], _toeRest[s], _tip[s]):0.0}");
                    }
                    _midExtra = exb.ToString();
                    _midToe = $",{ToeLow(verts, 0, Ground(_foot[0].position))},{ToeLow(verts, 1, Ground(_foot[1].position))}";
                    _prevM = verts; _prevMFrame = Time.frameCount;
                }
                catch (System.Exception ex) { Debug.LogWarning("SoleProbe.Mid: " + ex.Message); }
                finally
                {
                    for (var i = 0; i < _all.Length; i++) { _all[i].localPosition = _p2[i]; _all[i].localRotation = _q2[i]; _all[i].localScale = _s2[i]; }
                }
            }

            private void LateUpdate()
            {
                if (!_snap || _bad || _w == null) return;
                try
                {
                    var verts = _rs.Select(r => BakeWorld(r, false)).ToArray();
                    var gv = _body >= 0 ? verts[_body] : null;
                    var sb = new System.Text.StringBuilder();
                    for (var s = 0; s < 2; s++)
                    {
                        var g = Ground(_foot[s].position);
                        var terms = Terms(s, g, out _, out var hi, out _);
                        var seg = float.MaxValue;
                        if (gv != null && _seg != null && _seg.Length == gv.Length)
                            for (var i = 0; i < gv.Length; i++) if (_seg[i] == (byte)(13 + s) && gv[i].y < seg) seg = gv[i].y;
                        string GP(int q) { var j = _solePoint != null ? _solePoint[s * 2 + q] : -1; return gv != null && j >= 0 && j < gv.Length ? (gv[j].y - g).ToString("0.0000") : ""; }
                        sb.Append($",{terms},{MeshLow(s, g, verts, hi)},{(seg < float.MaxValue ? (seg - g).ToString("0.0000") : "")},{GP(0)},{GP(1)},{_fp.Diag[s == 0 ? 3 : 7]:0.0}");
                    }
                    var mid = _midRow.Length > 0 ? _midRow : string.Concat(Enumerable.Repeat(",,,,,,,,,,,,,,,", 2));
                    var dx = new System.Text.StringBuilder();
                    var dcon = _prevDFrame == Time.frameCount - 1;
                    for (var s = 0; s < 2; s++)
                    {
                        var c = LowestIdx(s, verts, false);
                        var cp = c.r >= 0 ? verts[c.r][c.v] : Vector3.zero;
                        dx.Append($",{Own(c, verts, _prevD, dcon)},{cp.x:0.0000},{cp.z:0.0000}");
                    }
                    var tx = new System.Text.StringBuilder();
                    for (var s = 0; s < 2; s++)
                    {
                        if (_toe[s] == null) { tx.Append(",,,,,"); continue; }
                        var bend = ToeBend(_foot[s], _toe[s], _toeRestLocal[s], _tipToe[s]);
                        var tc = LowestToeIdx(s, verts);
                        tx.Append($",{bend:0.0},{Own(tc, verts, _prevD, dcon)},{_toe[s].position.x:0.0000},{_toe[s].position.z:0.0000},{PushOf(s)}");
                    }
                    _prevD = verts; _prevDFrame = Time.frameCount;
                    var rootP = _fp.transform.position;
                    var clock = _clockF != null ? (float)_clockF.GetValue(Probe) : 0f;
                    _w.WriteLine($"{Time.frameCount},{Time.time:0.000},{clock:0.000},{Probe.State},{(_midRow.Length > 0 ? 1 : 0)},{_fp.Diag[8]:0.0000}{mid}{sb}{_midExtra}{dx},{rootP.x:0.0000},{rootP.z:0.0000}{_midToe},{ToeLow(verts, 0, Ground(_foot[0].position))},{ToeLow(verts, 1, Ground(_foot[1].position))}{tx}");
                }
                catch (System.Exception ex) { Debug.LogWarning("SoleProbe.LateUpdate: " + ex.Message); }
            }

            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; if (_baked != null) Destroy(_baked); }
        }
    }
}
