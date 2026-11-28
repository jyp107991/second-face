using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using NUnit.Framework;
using SecondFace.Core.Npc;
using SecondFace.Game.Fighting;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    // TEMP harness (never committed; not a gate input): the motion gate's fight only, over the whole cast in the gate's chunks of
    // ten. The people are made as HumanMotionGateTests.Gate makes them (same ground, lanes, dress, PeopleService.Animate, probe
    // calibration), then the gate's own private Fighting sequence runs (by reflection) and each person's fight states are judged
    // by the gate's own LimitsFor, as Gate's verdict loop judges them. The everyday states are never run, so a person starts the
    // fight fresh instead of after ~15 min of everyday states: a screen, never a verdict; its agreement with a whole-cast verdict
    // on the same tree is measured before it is trusted. Fixed 1/60 s step. SCREEN_CHUNKS "0-7"/"4,5"; SCREEN_PEOPLE one batch.
    // Writes test-results/fight_screen_<k>.chunk.json (+ .json table).
    public class FightScreenTests
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


        // (KNEE_TRACE=1, TEMP: each frame a fight state is measured, the knees, hips and ankles before Fighter.Feet (order 25,
        // Fighter is 30) and after everything (order 10000), Feet's sink and the soles it left)
        [DefaultExecutionOrder(-100)]
        public sealed class KRaw : MonoBehaviour
        {
            public Animator A; public float KL, KR, A1L, A1R, A2L, A2R;
            private void LateUpdate() { if (A == null) return; (KL, KR, _, _, _) = Legs(A); (A1L, A1R, A2L, A2R) = Arms(A); }
        }
        // (RAG_TRACE=1, TEMP relaunch 16: each person's ragdoll through its fall and hand-back, and the body through the rise:
        // per frame while fallen, the parts' largest speed and the hips; at the fall, the hand-back and the rise's end, the hips, the
        // root and the frame; the get-up chosen)
        [DefaultExecutionOrder(10001)]
        public sealed class RagTrace : MonoBehaviour
        {
            public Animator A; public System.Text.StringBuilder Out; public string Id;
            private SecondFace.Game.People.Ragdoll _r; private bool _was, _rising; private int _fellAt = -1;
            private static string V(Vector3 v) => $"{v.x:0.000000};{v.y:0.000000};{v.z:0.000000}";
            private static string Q(Quaternion q) => $"{q.x:0.000000};{q.y:0.000000};{q.z:0.000000};{q.w:0.000000}";
            private void LateUpdate()
            {
                if (A == null) return;
                if (_r == null) _r = A.GetComponent<SecondFace.Game.People.Ragdoll>();
                if (_r == null) return;
                var hips = A.GetBoneTransform(HumanBodyBones.Hips);
                var f = Time.frameCount;
                if (_r.Fallen && !_was) { _fellAt = f; Out.Append($"{Id},fall,{f},{V(hips.position)},{Q(hips.rotation)},{V(A.transform.position)},{Q(A.transform.rotation)}\n"); }
                if (_r.Fallen)
                {
                    var top = 0f; foreach (var b in _r.Bodies) if (b != null) top = Mathf.Max(top, b.linearVelocity.magnitude);
                    Out.Append($"{Id},lying,{f - _fellAt},{V(hips.position)},{Q(hips.rotation)},{top:0.000000}\n");
                }
                if (!_r.Fallen && _was) { _rising = true; Out.Append($"{Id},handback,{f - _fellAt},{V(hips.position)},{Q(hips.rotation)},{V(A.transform.position)},{Q(A.transform.rotation)},{A.GetCurrentAnimatorStateInfo(A.GetLayerIndex(SecondFace.Core.Combat.CombatMotion.FullLayer)).shortNameHash}\n"); }
                if (_rising && !_r.Blending && !_r.Fallen && (f % 30 == 0)) Out.Append($"{Id},after,{f - _fellAt},{V(hips.position)},{V(A.transform.position)},{Q(A.transform.rotation)}\n");
                _was = _r.Fallen;
            }
        }
        // (STEP3=1, TEMP relaunch 16: what each foot's ground ray strikes, as FootPlant casts it (0.45 m over the foot, 1.125 m down,
        // every layer) and as Fighter.GroundAt casts it (0.6 m over, 1.4 m down), when it is not the ground: the frame, the state,
        // the collider, how far over the ground)
        [DefaultExecutionOrder(10002)]
        public sealed class RayTrace : MonoBehaviour
        {
            public Animator A; public MotionProbe P; public System.Text.StringBuilder Out; public string Id; public Collider[] Grounds;
            private void LateUpdate()
            {
                if (A == null) return;
                foreach (var hb in new[] { HumanBodyBones.LeftFoot, HumanBodyBones.RightFoot })
                {
                    var f = A.GetBoneTransform(hb); if (f == null) continue;
                    foreach (var (up, len, who) in new[] { (0.45f, 1.125f, "plant"), (0.6f, 1.4f, "fighter") })
                    {
                        var from = f.position + Vector3.up * up;
                        if (!Physics.Raycast(from, Vector3.down, out var hit, len, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)) continue;
                        if (System.Array.IndexOf(Grounds, hit.collider) >= 0) continue;
                        // (its own body or what it holds: FootPlant's ray does not leave it out; the fight's takes its fallback height)
                        var own = hit.transform.IsChildOf(A.transform) ? 1 : 0;
                        var gy = float.NaN;
                        foreach (var g in Grounds) if (g.Raycast(new Ray(from, Vector3.down), out var gh, len)) gy = gh.point.y;
                        Out.Append($"{Id},{Time.frameCount},{P?.State},{hb},{who},{hit.collider.name},{hit.collider.transform.root.name},{hit.point.y - gy:0.0000},{own}\n");
                    }
                }
            }
        }
        [DefaultExecutionOrder(25)]
        public sealed class KBefore : MonoBehaviour
        {
            public Animator A; public float KL, KR, HipsY, AnkL, AnkR, A1L, A1R, A2L, A2R;
            private void LateUpdate() { if (A == null) return; (KL, KR, HipsY, AnkL, AnkR) = Legs(A); (A1L, A1R, A2L, A2R) = Arms(A); }
        }
        private static (float, float, float, float) Arms(Animator a)
        {
            (float, float) One(HumanBodyBones up, HumanBodyBones lo, HumanBodyBones h) { var u = a.GetBoneTransform(up).position; var e = a.GetBoneTransform(lo).position; var w = a.GetBoneTransform(h).position; return (Vector3.Angle(e - u, Vector3.down), Vector3.Angle(e - u, w - e)); }
            var (l1, l2) = One(HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand);
            var (r1, r2) = One(HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand);
            return (l1, r1, l2, r2);
        }
        [DefaultExecutionOrder(10000)]
        public sealed class KAfter : MonoBehaviour
        {
            public Animator A; public KBefore B; public KRaw R; public MotionProbe P; public System.Text.StringBuilder Out;
            private static readonly FieldInfo Sink = typeof(Fighter).GetField("_sink", BindingFlags.NonPublic | BindingFlags.Instance);
            private void LateUpdate()
            {
                if (A == null || P == null || P.Kind == null || P.State == null || !P.State.StartsWith("combat:")) return;
                var f = A.GetComponent<Fighter>();
                var (kl, kr, hy, al, ar) = Legs(A);
                var sink = f != null && Sink != null ? (float)Sink.GetValue(f) : float.NaN;
                var (a1l, a1r, a2l, a2r) = Arms(A);
                Out.AppendLine(string.Join(",", P.Person, P.State, Time.frameCount, R.KL.ToString("0.0"), R.KR.ToString("0.0"),
                    R.A1L.ToString("0.0"), R.A1R.ToString("0.0"), B.A1L.ToString("0.0"), B.A1R.ToString("0.0"), a1l.ToString("0.0"), a1r.ToString("0.0"),
                    R.A2L.ToString("0.0"), R.A2R.ToString("0.0"), B.A2L.ToString("0.0"), B.A2R.ToString("0.0"), a2l.ToString("0.0"), a2r.ToString("0.0"), B.KL.ToString("0.0"), B.KR.ToString("0.0"), kl.ToString("0.0"), kr.ToString("0.0"),
                    (B.HipsY * 100f).ToString("0.00"), (hy * 100f).ToString("0.00"), (B.AnkL * 100f).ToString("0.00"), (B.AnkR * 100f).ToString("0.00"), (al * 100f).ToString("0.00"), (ar * 100f).ToString("0.00"),
                    (sink * 100f).ToString("0.00"), f != null ? (f.SoleOver.x * 100f).ToString("0.00") : "", f != null ? (f.SoleOver.y * 100f).ToString("0.00") : "", f != null ? f.Current : ""));
            }
        }
        [DefaultExecutionOrder(10001)]
        public sealed class FTrace : MonoBehaviour
        {
            public Animator A; public MotionProbe P; public System.Text.StringBuilder Out; public string Only;
            private static readonly FieldInfo FullW = typeof(Fighter).GetField("_fullW", BindingFlags.NonPublic | BindingFlags.Instance);
            private static readonly FieldInfo FullS = typeof(Fighter).GetField("_fullState", BindingFlags.NonPublic | BindingFlags.Instance);
            private static readonly FieldInfo FullT = typeof(Fighter).GetField("_fullT", BindingFlags.NonPublic | BindingFlags.Instance);
            private static readonly FieldInfo FullL = typeof(Fighter).GetField("_full", BindingFlags.NonPublic | BindingFlags.Instance);
            private static readonly MethodInfo RecDown = typeof(Fighter).GetMethod("RecordDown", BindingFlags.NonPublic | BindingFlags.Instance);
            private Vector3 _pl, _pr; private bool _have;
            private void LateUpdate()
            {
                if (A == null || P == null || P.State == null || !P.State.StartsWith(Only)) { _have = false; return; }
                var f = A.GetComponent<Fighter>();
                var l = A.GetBoneTransform(HumanBodyBones.LeftFoot).position; var r = A.GetBoneTransform(HumanBodyBones.RightFoot).position;
                var dt = Time.deltaTime;
                float V(Vector3 a, Vector3 b) => new Vector2(a.x - b.x, a.z - b.z).magnitude / Mathf.Max(1e-5f, dt) * 100f;
                var vl = _have ? V(l, _pl) : 0f; var vr = _have ? V(r, _pr) : 0f;
                _pl = l; _pr = r; _have = true;
                string rec(bool left) { if (f == null || RecDown == null) return ""; var o = RecDown.Invoke(f, new object[] { left }); return o == null ? "n" : (bool)o ? "1" : "0"; }
                var layer = f != null && FullL != null ? (int)FullL.GetValue(f) : -1;
                var trans = layer >= 0 && A.IsInTransition(layer);
                var tn = trans ? A.GetAnimatorTransitionInfo(layer).normalizedTime : -1f;
                Out.AppendLine(string.Join(",", P.Person, P.State, Time.frameCount, Time.time.ToString("0.000"), (dt * 1000f).ToString("0.0"), (l.y - A.transform.position.y).ToString("0.000"), (r.y - A.transform.position.y).ToString("0.000"),
                    vl.ToString("0.0"), vr.ToString("0.0"), f != null ? f.Planted.x.ToString("0") : "", f != null ? f.Planted.y.ToString("0") : "",
                    rec(true), rec(false), f != null && FullS != null ? (string)FullS.GetValue(f) : "", f != null && FullT != null ? ((float)FullT.GetValue(f)).ToString("0.000") : "",
                    f != null && FullW != null ? ((float)FullW.GetValue(f)).ToString("0.000") : "", trans ? "1" : "0", tn.ToString("0.000"),
                    f != null ? f.TurnAngle.ToString("0.0") : "", f != null ? (f.TurnShift.magnitude * 100f).ToString("0.00") : "", f != null ? f.Current : ""));
            }
        }
        private static (float, float, float, float, float) Legs(Animator a)
        {
            float K(HumanBodyBones u, HumanBodyBones l, HumanBodyBones ft) { var U = a.GetBoneTransform(u).position; var L = a.GetBoneTransform(l).position; var F = a.GetBoneTransform(ft).position; return Vector3.Angle(L - U, F - L); }
            var y = a.transform.position.y;
            return (K(HumanBodyBones.LeftUpperLeg, HumanBodyBones.LeftLowerLeg, HumanBodyBones.LeftFoot), K(HumanBodyBones.RightUpperLeg, HumanBodyBones.RightLowerLeg, HumanBodyBones.RightFoot),
                a.GetBoneTransform(HumanBodyBones.Hips).position.y - y, a.GetBoneTransform(HumanBodyBones.LeftFoot).position.y - y, a.GetBoneTransform(HumanBodyBones.RightFoot).position.y - y);
        }

        [UnityTest, Timeout(14400000)]
        public IEnumerator FightScreen() => Fixed(Screen());

        private static IEnumerator Wait(float seconds) { for (int n = Mathf.Max(1, Mathf.RoundToInt(seconds / Time.captureDeltaTime)), i = 0; i < n; i++) yield return null; }

        private static IEnumerator Screen()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
            Assert.That(cat, Is.Not.Null); Assert.That(assets, Is.Not.Null); Assert.That(assets.Combat, Is.Not.Null, "the fight's motion");
            var ids = cat.People.Where(e => e != null && e.Prefab != null).Select(e => e.Id).OrderBy(s => s).ToArray();
            var batches = Enumerable.Range(0, (ids.Length + 9) / 10).Select(k => ids.Skip(k * 10).Take(10).ToArray()).ToArray();
            var only = (System.Environment.GetEnvironmentVariable("SCREEN_PEOPLE") ?? "").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
            if (only.Length > 0) batches = new[] { only };
            var want = new HashSet<int>();
            foreach (var part in (System.Environment.GetEnvironmentVariable("SCREEN_CHUNKS") ?? "").Split(',').Select(x => x.Trim()).Where(x => x.Length > 0))
            {
                var ab = part.Split('-');
                if (ab.Length == 2) for (var k = int.Parse(ab[0]); k <= int.Parse(ab[1]); k++) want.Add(k); else want.Add(int.Parse(part));
            }
            if (want.Count == 0) for (var k = 0; k < batches.Length; k++) want.Add(k);
            var gt = typeof(HumanMotionGateTests);
            var subjT = gt.GetNestedType("Subject", Any); var runnerT = gt.GetNestedType("Runner", Any);
            var fighting = gt.GetMethod("Fighting", Any); var limitsFor = gt.GetMethod("LimitsFor", Any);
            var lane = (float)gt.GetField("Lane", Any).GetValue(null);
            Assert.That(subjT != null && runnerT != null && fighting != null && limitsFor != null, "the gate's own parts");
            var hash = HumanMotionGateTests.InputsHash("people") + "|" + HumanMotionGateTests.InputsHash("measures");
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results"));
            Directory.CreateDirectory(dir);
            var total = 0;
            // (SCREEN_CONFIGS "label:rule|label:rule": TEMP A/B, each chunk run once per config with Fighter.FeetRuleTemp = rule when
            // the tree has it; outputs fight_screen_<k>_<label>)
            var configs = (System.Environment.GetEnvironmentVariable("SCREEN_CONFIGS") ?? "").Split('|').Select(x => x.Trim()).Where(x => x.Length > 0)
                .Select(x => { var c = x.Split(':'); return (Label: c[0], Rule: c.Length > 1 ? int.Parse(c[1].Split(',')[0]) : -1, NoTurn: c.Length > 1 && c[1].Contains("noturn")); }).ToList();
            if (configs.Count == 0) configs.Add(("", -1, false));
            var ruleField = typeof(Fighter).GetField("FeetRuleTemp", BindingFlags.Public | BindingFlags.Static);
            var turnOff = typeof(Fighter).GetField("TurnOffTemp", BindingFlags.Public | BindingFlags.Static);
            var turnTicks = typeof(Fighter).GetField("TurnTicksTemp", BindingFlags.Public | BindingFlags.Static);
            var turnCalls = typeof(Fighter).GetField("TurnCallsTemp", BindingFlags.Public | BindingFlags.Static);
            foreach (var (label, rule, noTurn) in configs)
            {
            if (rule >= 0) { Assert.That(ruleField, Is.Not.Null, "Fighter.FeetRuleTemp (TEMP)"); ruleField.SetValue(null, rule); }
            if (turnOff != null) turnOff.SetValue(null, noTurn);
            if (turnTicks != null) { turnTicks.SetValue(null, 0L); turnCalls.SetValue(null, 0L); }
            Debug.Log($"FIGHT SCREEN config [{label}] rule {(ruleField != null ? ruleField.GetValue(null) : "n/a")} turn {(turnOff == null ? "n/a" : noTurn ? "off" : "on")}");
            var f4trace = new System.Text.StringBuilder("person,state,frame,time,dtms,ankLy,ankRy,vL,vR,pinL,pinR,recL,recR,fullState,fullT,fullW,trans,transT,turn,shiftcm,current\n");
            var ragOut = new System.Text.StringBuilder("person,kind,frame,...\n");
            var rayOut = new System.Text.StringBuilder("person,frame,state,foot,ray,collider,root,over,own\n");
            var knees = new System.Text.StringBuilder("person,state,frame,KLr,KRr,A1Lr,A1Rr,A1Lb,A1Rb,A1La,A1Ra,A2Lr,A2Rr,A2Lb,A2Rb,A2La,A2Ra,KLb,KRb,KLa,KRa,hipsYb,hipsYa,ankLb,ankRb,ankLa,ankRa,sink,soleOverL,soleOverR,current\n");
            foreach (var k in want.OrderBy(x => x))
            {
                if (k < 0 || k >= batches.Length) continue;
                var batch = batches[k];
                var tag = (only.Length > 0 ? "fight_screen_p" : $"fight_screen_{k}") + (label.Length > 0 ? "_" + label : "");
                var t0 = System.DateTime.UtcNow;
                yield return BootTests.Clear();
                foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) { c.enabled = false; c.tag = "Untagged"; }
                // the ground as Gate's: flat, and a 10° slope beyond it
                // (TEMP relaunch 16, LEFT_TRACE=1: whatever has a collider outside this chunk's own root as it starts: what an earlier
                // chunk left in the scene)
                if (System.Environment.GetEnvironmentVariable("LEFT_TRACE") == "1")
                    foreach (var c in Object.FindObjectsByType<Collider>(FindObjectsSortMode.InstanceID))
                    {
                        if (c == null || !c.enabled || !c.gameObject.activeInHierarchy || c.name == "ground" || c.name == "slope") continue;
                        var rb = c.attachedRigidbody;
                        Debug.Log($"FIGHT SCREEN LEFT chunk {k}: {c.name} ({c.GetType().Name}, root {c.transform.root.name}, layer {c.gameObject.layer}) at {c.transform.position.x:0.000},{c.transform.position.y:0.000},{c.transform.position.z:0.000}{(rb != null ? $" rigidbody {(rb.isKinematic ? "kinematic" : "dynamic")}" : "")}");
                    }
                if (System.Environment.GetEnvironmentVariable("STEP3") == "1")
                {
                    var rs = UnityEngine.Random.state; var rj = JsonUtility.ToJson(rs);
                    Debug.Log($"FIGHT SCREEN CLOCK chunk {k}: frame {Time.frameCount}, time {Time.time:0.000000}, fixedTime {Time.fixedTime:0.000000}, phase {(Time.time - Time.fixedTime):0.000000}, random {rj.GetHashCode():x8} {rj}");
                }
                var root = new GameObject("motion gate");
                var runner = (MonoBehaviour)root.AddComponent(runnerT);
                var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
                flat.name = "flat"; flat.transform.SetParent(root.transform);
                flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
                var slope = GameObject.CreatePrimitive(PrimitiveType.Cube);
                slope.name = "slope"; slope.transform.SetParent(root.transform);
                slope.transform.localScale = new Vector3(200f, 1f, 30f);
                slope.transform.rotation = Quaternion.Euler(-10f, 0f, 0f);
                slope.transform.position = new Vector3(0f, 0f, 70f) - slope.transform.rotation * new Vector3(0f, 0.5f, 0f);
                var grounds = new Collider[] { flat.GetComponent<Collider>(), slope.GetComponent<Collider>() };
                var sun = new GameObject("sun").AddComponent<Light>(); sun.transform.SetParent(root.transform);
                sun.type = LightType.Directional; sun.intensity = 1.6f; sun.shadows = LightShadows.Soft; sun.transform.rotation = Quaternion.Euler(45f, 150f, 0f);
                // the people, as Gate makes them (a cast's report is never "motion_gate": none is the player)
                var people = (IList)System.Activator.CreateInstance(typeof(List<>).MakeGenericType(subjT));
                var probes = new List<MotionProbe>(); var gos = new List<GameObject>(); var homes = new List<Vector3>();
                for (var i = 0; i < batch.Length; i++)
                {
                    var prefab = cat.Get(batch[i]);
                    if (prefab == null) continue;
                    var home = new Vector3((i - (batch.Length - 1) * 0.5f) * lane, 0f, 0f);
                    var go = Object.Instantiate(prefab, home, Quaternion.identity, root.transform);
                    go.name = "gate_" + batch[i];
                    var p = RbPeople.Of(batch[i]);
                    RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + batch[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                    var a = go.GetComponentInChildren<Animator>();
                    var amb = PeopleService.Animate(a, assets.Locomotion, batch[i], p?.Male ?? true);
                    a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }
                    var probe = a.gameObject.AddComponent<MotionProbe>();
                    probe.Person = batch[i]; probe.Ground = grounds;
                    Assert.That(probe.Calibrate(), Is.True, $"{batch[i]}: {probe.Error}");
                    var mark = new GameObject("mark_" + batch[i]).transform; mark.SetParent(root.transform);
                    var s = System.Activator.CreateInstance(subjT, true);
                    void F(string n, object v) => subjT.GetField(n, Any).SetValue(s, v);
                    F("Id", batch[i]); F("Go", go); F("A", a); F("Ambient", amb); F("Gaze", a.GetComponent<Gaze>()); F("Probe", probe); F("Mark", mark); F("Home", home);
                    people.Add(s); probes.Add(probe); gos.Add(go); homes.Add(home);
                    if (!string.IsNullOrEmpty(System.Environment.GetEnvironmentVariable("F4_TRACE")))
                    {
                        var ft = a.gameObject.AddComponent<FTrace>(); ft.A = a; ft.P = probe; ft.Out = f4trace; ft.Only = System.Environment.GetEnvironmentVariable("F4_TRACE");
                        probe.TracePath = Path.Combine(Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results")), "f4probe_" + batch[i] + ".csv");
                        File.Delete(probe.TracePath); File.Delete(probe.TracePath.Replace(".csv", "_soles.csv"));
                        probe.TraceState = System.Environment.GetEnvironmentVariable("F4_TRACE");
                    }
                    if (System.Environment.GetEnvironmentVariable("RAG_TRACE") == "1") { var rt = a.gameObject.AddComponent<RagTrace>(); rt.A = a; rt.Out = ragOut; rt.Id = batch[i]; }
                    if (System.Environment.GetEnvironmentVariable("STEP3") == "1") { var yt = a.gameObject.AddComponent<RayTrace>(); yt.A = a; yt.P = probe; yt.Out = rayOut; yt.Id = batch[i]; yt.Grounds = grounds; }
                    if (System.Environment.GetEnvironmentVariable("KNEE_TRACE") == "1")
                    {
                        var kr = a.gameObject.AddComponent<KRaw>(); kr.A = a;
                        var kb = a.gameObject.AddComponent<KBefore>(); kb.A = a;
                        var ka = a.gameObject.AddComponent<KAfter>(); ka.A = a; ka.B = kb; ka.R = kr; ka.P = probe; ka.Out = knees;
                    }
                }
                yield return Wait(1f);
                void Record(string state, MotionProbe.K? kind) { foreach (var pr in probes) { pr.State = state; pr.Kind = kind; } }
                void Stop() { foreach (var pr in probes) pr.Kind = null; }
                void Place(Vector3 offset, float yaw)
                {
                    for (var i = 0; i < gos.Count; i++)
                    {
                        var at = homes[i] + offset;
                        var ray = new Ray(at + Vector3.up * 5f, Vector3.down);
                        var y = 0f;
                        foreach (var g in grounds) if (g.Raycast(ray, out var hit, 20f)) y = Mathf.Max(y, hit.point.y);
                        gos[i].transform.SetPositionAndRotation(new Vector3(at.x, y, at.z), Quaternion.Euler(0f, yaw, 0f));
                    }
                }
                Assert.That(Fighter.HasLayers(((Animator)subjT.GetField("A", Any).GetValue(people[0]))), "the fight's layers");
                // (TEMP, relaunch 16: SCREEN_SEED, UnityEngine.Random seeded alike before the fight's phase: does the run repeat then?)
                var seedTemp = System.Environment.GetEnvironmentVariable("SCREEN_SEED");
                if (!string.IsNullOrEmpty(seedTemp)) { UnityEngine.Random.InitState(int.Parse(seedTemp)); Debug.Log("FightScreen: Random seeded " + seedTemp); }
                var inner = (IEnumerator)fighting.Invoke(null, new object[] { people, root, runner, assets.Combat, false,
                    (System.Action<string, MotionProbe.K?>)Record, (System.Action)Stop, (System.Action<Vector3, float>)Place });
                while (inner.MoveNext()) yield return inner.Current;
                // judged as Gate's verdict loop judges (fight states only)
                var fails = new List<string>(); var table = new List<Dictionary<string, object>>();
                foreach (var pr in probes)
                {
                    if (pr.Error != null) fails.Add($"{pr.Person}: {pr.Error}");
                    foreach (var (state, measures) in pr.Samples)
                    {
                        if (!state.StartsWith("combat:")) continue;
                        foreach (var lim in (HumanMotionGateTests.Lim[])limitsFor.Invoke(null, new object[] { state }))
                        {
                            if (!measures.TryGetValue(lim.M, out var vals) || vals.Count == 0) continue;
                            var sorted = vals.OrderBy(x => x).ToList();
                            float P(double q) => sorted[Mathf.Clamp((int)System.Math.Round(q * (sorted.Count - 1)), 0, sorted.Count - 1)];
                            var p2 = P(0.02); var p50 = P(0.5); var p98 = P(0.98); var min = sorted[0]; var max = sorted[^1];
                            var mean = vals.Average();
                            var over = float.IsInfinity(lim.Over) ? 0f : vals.Count(x => x > lim.Over) / (float)vals.Count;
                            var why = new List<string>();
                            if (p98 > lim.Hi) why.Add($"p98 {p98:0.0} > {lim.Hi:0.0}");
                            if (p2 < lim.Lo) why.Add($"p2 {p2:0.0} < {lim.Lo:0.0}");
                            if (max > lim.CapHi) why.Add($"max {max:0.0} > cap {lim.CapHi:0.0}");
                            if (min < lim.CapLo) why.Add($"min {min:0.0} < cap {lim.CapLo:0.0}");
                            if (mean > lim.MeanMax) why.Add($"mean {mean:0.00} > {lim.MeanMax:0.00}");
                            if (over > lim.OverFrac) why.Add($"{over:P0} of frames over {lim.Over:0}");
                            table.Add(new Dictionary<string, object> { ["person"] = pr.Person, ["state"] = state, ["measure"] = lim.M, ["n"] = vals.Count, ["p2"] = p2, ["p50"] = p50, ["p98"] = p98, ["min"] = min, ["max"] = max, ["mean"] = mean, ["over"] = over, ["pass"] = why.Count == 0, ["why"] = string.Join("; ", why) });
                            if (why.Count > 0) fails.Add($"{pr.Person} {state} {lim.M}: {string.Join("; ", why)}");
                        }
                    }
                }
                var secs = (System.DateTime.UtcNow - t0).TotalSeconds;
                total += fails.Count;
                File.WriteAllText(Path.Combine(dir, tag + ".json"), JsonConvert.SerializeObject(table, Formatting.Indented));
                File.WriteAllText(Path.Combine(dir, tag + ".chunk.json"), JsonConvert.SerializeObject(new Dictionary<string, object>
                {
                    ["Hash"] = hash, ["Ids"] = batch, ["Measured"] = table.Count, ["Failures"] = fails, ["Seconds"] = secs,
                }, Formatting.Indented));
                Debug.Log($"FIGHT SCREEN {tag}: {batch.Length} people, {table.Count} measures, {fails.Count} fight failures, {secs:0} s");
                Object.Destroy(root);
                yield return null;
            }
            Debug.Log($"FIGHT SCREEN [{label}] total: {total} fight failures");
            if (turnTicks != null)
            {
                var calls = (long)turnCalls.GetValue(null); var ticks = (long)turnTicks.GetValue(null);
                Debug.Log($"FIGHT SCREEN [{label}] turn cost: {calls} calls, {(calls > 0 ? ticks * 1e6 / System.Diagnostics.Stopwatch.Frequency / calls : 0):0.00} us a call (a person a frame)");
            }
            if (!string.IsNullOrEmpty(System.Environment.GetEnvironmentVariable("F4_TRACE"))) File.WriteAllText(Path.Combine(dir, "f4_trace" + (label.Length > 0 ? "_" + label : "") + ".csv"), f4trace.ToString());
            if (System.Environment.GetEnvironmentVariable("STEP3") == "1") File.WriteAllText(Path.Combine(dir, "ray_trace" + (label.Length > 0 ? "_" + label : "") + ".csv"), rayOut.ToString());
            if (System.Environment.GetEnvironmentVariable("RAG_TRACE") == "1") File.WriteAllText(Path.Combine(dir, "rag_trace" + (label.Length > 0 ? "_" + label : "") + ".csv"), ragOut.ToString());
            if (System.Environment.GetEnvironmentVariable("KNEE_TRACE") == "1") File.WriteAllText(Path.Combine(dir, "knee_trace" + (label.Length > 0 ? "_" + label : "") + ".csv"), knees.ToString());
            knees.Clear(); knees.Append("person,state,frame,KLr,KRr,A1Lr,A1Rr,A1Lb,A1Rb,A1La,A1Ra,A2Lr,A2Rr,A2Lb,A2Rb,A2La,A2Ra,KLb,KRb,KLa,KRa,hipsYb,hipsYa,ankLb,ankRb,ankLa,ankRa,sink,soleOverL,soleOverR,current\n");
            total = 0;
            }
            if (ruleField != null) ruleField.SetValue(null, 0);
#else
            Assert.Ignore("editor only");
            yield break;
#endif
        }
    }
}
