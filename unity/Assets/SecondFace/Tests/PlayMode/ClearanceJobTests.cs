using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The arm clearance's job (ArmClearance.Job.cs) against the managed step it was written from: each body twice, at the same
    /// place near the world's origin, played alike frame for frame (the same controller, the same parameters and states, every
    /// runtime system on), one clone's clearance by the managed step and the other's by the job; after every frame each bone
    /// the clearance turns (the upper arms, the forearms, the hands) within <see cref="Deg"/>° in its local turn and
    /// <see cref="M"/> m in its place about the root, and every report and trace the gate reads (Diag, DiagAt, PushAt, the
    /// stages' depths and angles, Hold) at its own tolerance; through the town's states (standing, the walk, the jog, the
    /// gestures, the sneak) and the fight's (its whole-body states, the arms held), with the gate's traces off and on. A pass
    /// with both clones on the managed step first shows the twins themselves move alike (nothing else apart). The job's clone
    /// never falls back to the managed step.
    /// </summary>
    public class ClearanceJobTests
    {
        public const float Deg = 0.01f, M = 1e-5f;
        private static readonly string[] Bodies = { "Female_Adult_01", "Business_Female_02", "Male_Adult_08", "Construction_Male_03" };
        /// <summary>A body without its skin (as the players and the base bodies are): the torso's sections' step (SectionsJob).</summary>
        private const string NoSkin = "Female_Adult_09";
        private readonly List<GameObject> _made = new();

        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var g in _made) if (g != null) Object.Destroy(g);
            _made.Clear();
            ArmClearance.ManagedStep = false;
            yield return null;
        }

        private sealed class Pair
        {
            public string Id; public Animator A, B; public ArmClearance CA, CB;
            // (the branch state the twins were in last frame, and each twin's hands a frame ago, root-relative)
            public bool Apart, HasPrev; public readonly Vector3[] PA = new Vector3[2], PB = new Vector3[2]; public readonly Quaternion[] QA = new Quaternion[2], QB = new Quaternion[2];
        }

        /// <summary>The largest differences seen and where.</summary>
        private sealed class Worst
        {
            public float Deg, M, Diag, Trace; public string WhereDeg = "", WhereM = "", WhereDiag = "", WhereTrace = ""; public int IdxDiff, Frames, Fallbacks;
            // the branch flips: an index the step chose (DiagAt, resting) differing between the twins where it did not the frame before
            public int FirstFlip = -1, Flips, Rejoins, PairFramesApart, EndApart; public string FirstFlipWho = "";
            public float DegBefore, MBefore, EndDeg, EndM;
            // at a flip or a rejoin: how far one twin's hand moved that frame beyond the other's (cm, degrees), and each hand's own step
            public float PopCm, PopDeg; public string PopWhere = ""; public readonly List<float> StepCm = new(), StepDeg = new(), StepCmB = new(), StepDegB = new();
            private static float P98(List<float> x) { if (x.Count == 0) return 0f; var a = x.ToArray(); System.Array.Sort(a); return a[(int)(0.98f * (a.Length - 1))]; }
            public string Note(string what) => $"{what}: bones {Deg:0.00000}° ({WhereDeg}), {M * 1000f:0.0000} mm ({WhereM}); reports {Diag:0.000000} ({WhereDiag}); traces {Trace:0.000000} ({WhereTrace}); index differences {IdxDiff}; frames {Frames}; the job's clone fell back {Fallbacks}"
                + $"; flips {Flips} (first at the sequence's frame {FirstFlip} {FirstFlipWho}), rejoins {Rejoins}, pair-frames apart {PairFramesApart}; before the first flip {DegBefore:0.00000}° {MBefore * 1000f:0.0000} mm; at the end {EndApart} pairs apart, {EndDeg:0.00000}° {EndM * 1000f:0.0000} mm"
                + $"; at a flip a hand moved {PopCm:0.000} cm {PopDeg:0.000}° beyond its twin ({PopWhere}); a hand's own step a frame p98 {P98(StepCm):0.000} cm {P98(StepDeg):0.000}°, max {(StepCm.Count > 0 ? StepCm.Max() : 0f):0.000} cm {(StepDeg.Count > 0 ? StepDeg.Max() : 0f):0.000}° (twin B: p98 {P98(StepCmB):0.000} cm {P98(StepDegB):0.000}°, p90 {P90(StepDeg):0.000}° / {P90(StepDegB):0.000}°)";
            private static float P90(List<float> x) { if (x.Count == 0) return 0f; var a = x.ToArray(); System.Array.Sort(a); return a[(int)(0.9f * (a.Length - 1))]; }
        }

        /// <summary>The angle between two turns (degrees), in double from their relative turn: Quaternion.Angle reads any angle
        /// under 0.162° as 0 (it returns 0 once |dot| passes 1 - 1e-6), blind at this test's tolerance.</summary>
        public static double Ang(Quaternion a, Quaternion b)
        {
            double ax = a.x, ay = a.y, az = a.z, aw = a.w, bx = b.x, by = b.y, bz = b.z, bw = b.w;
            // inverse(a) * b, for unit a: conjugate(a) * b
            double rw = aw * bw + ax * bx + ay * by + az * bz;
            double rx = aw * bx - ax * bw - ay * bz + az * by;
            double ry = aw * by + ax * bz - ay * bw - az * bx;
            double rz = aw * bz - ax * by + ay * bx - az * bw;
            return 2.0 * System.Math.Atan2(System.Math.Sqrt(rx * rx + ry * ry + rz * rz), System.Math.Abs(rw)) * 180.0 / System.Math.PI;
        }

        private static readonly HumanBodyBones[] Turned = { HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm, HumanBodyBones.LeftHand, HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm, HumanBodyBones.RightHand };

        // (where the twins first part: the frame and every field of the clearance's own state that differs then, for the report)
        private static readonly System.Reflection.FieldInfo[] StateFields = typeof(ArmClearance).GetFields(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
            .Where(f => (f.FieldType == typeof(float) || f.FieldType == typeof(int) || f.FieldType == typeof(bool) || f.FieldType == typeof(Vector3)) && f.Name != "_takenFrame").ToArray();
        private static string Parted(Pair p)
        {
            var d = new List<string>();
            foreach (var f in StateFields)
            {
                var a = f.GetValue(p.CA); var b = f.GetValue(p.CB);
                if (a is float fa && b is float fb) { if (!(fa == fb || (float.IsNaN(fa) && float.IsNaN(fb))) && Mathf.Abs(fa - fb) > 1e-6f) d.Add($"{f.Name} {fa} / {fb}"); }
                else if (a is Vector3 va && b is Vector3 vb) { if ((va - vb).magnitude > 1e-6f) d.Add($"{f.Name} {va} / {vb}"); }
                else if (!Equals(a, b)) d.Add($"{f.Name} {a} / {b}");
            }
            for (var i = 0; i < p.CA.Diag.Length; i++) if (Mathf.Abs(p.CA.Diag[i] - p.CB.Diag[i]) > 1e-6f) d.Add($"Diag[{i}] {p.CA.Diag[i]} / {p.CB.Diag[i]}");
            for (var i = 0; i < p.CA.DiagAt.Length; i++) if (p.CA.DiagAt[i] != p.CB.DiagAt[i]) d.Add($"DiagAt[{i}] {p.CA.DiagAt[i]} / {p.CB.DiagAt[i]}");
            foreach (var hb in Turned)
            {
                var a = p.A.GetBoneTransform(hb); var b = p.B.GetBoneTransform(hb);
                if (a != null && b != null && Ang(a.localRotation, b.localRotation) > 1e-6) d.Add($"{hb} {Ang(a.localRotation, b.localRotation):0.000000}°");
            }
            return string.Join("; ", d);
        }
        private static readonly Dictionary<Pair, string> FirstParted = new();
        public static readonly List<string> PartedLog = new();

        private static void Compare(Pair p, Worst w, bool trace)
        {
            w.Frames++;
            if (!FirstParted.ContainsKey(p))
            {
                var why = Parted(p);
                if (why.Length > 0) { FirstParted[p] = why; PartedLog.Add($"{p.Id} first parts at frame {Time.frameCount} (Speed {p.A.GetFloat("Speed"):0.0}, resting {p.CA.DiagResting}, restW {typeof(ArmClearance).GetField("_restW", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance).GetValue(p.CA)}): {why}"); }
            }
            if (p.CB.FallbackWhy != null) w.Fallbacks++;
            float fDeg = 0f, fM = 0f;
            foreach (var hb in Turned)
            {
                var a = p.A.GetBoneTransform(hb); var b = p.B.GetBoneTransform(hb);
                if (a == null || b == null) continue;
                var d = (float)Ang(a.localRotation, b.localRotation);
                if (d > w.Deg) { w.Deg = d; w.WhereDeg = $"{p.Id} {hb}"; }
                var ra = a.position - p.A.transform.position; var rb = b.position - p.B.transform.position;
                var m = (ra - rb).magnitude;
                if (m > w.M) { w.M = m; w.WhereM = $"{p.Id} {hb}"; }
                fDeg = Mathf.Max(fDeg, d); fM = Mathf.Max(fM, m);
            }
            // the branch state: apart when an index the step chose differs
            var apart = p.CA.DiagResting != p.CB.DiagResting;
            for (var i = 0; i < p.CA.DiagAt.Length && !apart; i++) apart = p.CA.DiagAt[i] != p.CB.DiagAt[i];
            var changed = apart != p.Apart;
            if (apart && !p.Apart) { w.Flips++; if (w.FirstFlip < 0) { w.FirstFlip = w.Frames; w.FirstFlipWho = p.Id; } }
            if (!apart && p.Apart) w.Rejoins++;
            if (apart) w.PairFramesApart++;
            if (w.FirstFlip < 0) { w.DegBefore = Mathf.Max(w.DegBefore, fDeg); w.MBefore = Mathf.Max(w.MBefore, fM); }
            p.Apart = apart;
            // each twin's hands this frame, root-relative; their step against the frame before, and one twin's beyond the other's
            for (var h = 0; h < 2; h++)
            {
                var hb = h == 0 ? HumanBodyBones.LeftHand : HumanBodyBones.RightHand;
                var ta = p.A.GetBoneTransform(hb); var tb = p.B.GetBoneTransform(hb);
                if (ta == null || tb == null) continue;
                var pa = Quaternion.Inverse(p.A.transform.rotation) * (ta.position - p.A.transform.position);
                var pb = Quaternion.Inverse(p.B.transform.rotation) * (tb.position - p.B.transform.position);
                var qa = Quaternion.Inverse(p.A.transform.rotation) * ta.rotation; var qb = Quaternion.Inverse(p.B.transform.rotation) * tb.rotation;
                if (p.HasPrev)
                {
                    w.StepCm.Add((pa - p.PA[h]).magnitude * 100f); w.StepDeg.Add((float)Ang(p.QA[h], qa));
                    w.StepCmB.Add((pb - p.PB[h]).magnitude * 100f); w.StepDegB.Add((float)Ang(p.QB[h], qb));
                    if (changed)
                    {
                        var cm = ((pa - p.PA[h]) - (pb - p.PB[h])).magnitude * 100f;
                        var dg = (float)Ang(Quaternion.Inverse(p.QA[h]) * qa, Quaternion.Inverse(p.QB[h]) * qb);
                        if (cm > w.PopCm) { w.PopCm = cm; w.PopWhere = $"{p.Id} {hb} at the sequence's frame {w.Frames}{(apart ? " (flip)" : " (rejoin)")}"; }
                        w.PopDeg = Mathf.Max(w.PopDeg, dg);
                    }
                }
                p.PA[h] = pa; p.PB[h] = pb; p.QA[h] = qa; p.QB[h] = qb;
            }
            p.HasPrev = true;
            // the reports: the gaps in m (Diag 0-3), every other Diag in degrees; the indices exactly
            for (var i = 0; i < p.CA.Diag.Length; i++)
            {
                var d = Mathf.Abs(p.CA.Diag[i] - p.CB.Diag[i]) / (i < 4 ? M : Deg);
                if (d > w.Diag) { w.Diag = d; w.WhereDiag = $"{p.Id} Diag[{i}] {p.CA.Diag[i]} / {p.CB.Diag[i]}"; }
            }
            for (var i = 0; i < p.CA.DiagAt.Length; i++) if (p.CA.DiagAt[i] != p.CB.DiagAt[i]) w.IdxDiff++;
            if (p.CA.DiagResting != p.CB.DiagResting) w.IdxDiff++;
            for (var i = 0; i < 2; i++)
            {
                var d = ((p.CA.PushAt[i] - p.A.transform.position) - (p.CB.PushAt[i] - p.B.transform.position)).magnitude / M;
                if (d > w.Diag) { w.Diag = d; w.WhereDiag = $"{p.Id} PushAt[{i}]"; }
            }
            if (!trace) return;
            void T(float[] x, float[] y, string name, float tol)
            {
                for (var i = 0; i < x.Length && i < y.Length; i++)
                {
                    var d = Mathf.Abs(x[i] - y[i]) / tol;
                    if (d > w.Trace) { w.Trace = d; w.WhereTrace = $"{p.Id} {name}[{i}] {x[i]} / {y[i]}"; }
                }
            }
            T(p.CA.HandDepth, p.CB.HandDepth, "HandDepth", M); T(p.CA.ForearmDepth, p.CB.ForearmDepth, "ForearmDepth", M);
            T(p.CA.StageA1, p.CB.StageA1, "StageA1", Deg); T(p.CA.Hold, p.CB.Hold, "Hold", M * 100f); T(p.CA.SwingTrace, p.CB.SwingTrace, "SwingTrace", Deg);
            T(p.CA.PushDeg, p.CB.PushDeg, "PushDeg", Deg); T(p.CA.RestDeg, p.CB.RestDeg, "RestDeg", Deg);
            // (cm, as MotionProbe's trace reads them)
            T(p.CA.HoldFlank, p.CB.HoldFlank, "HoldFlank", M * 100f); T(p.CA.RestDepth, p.CB.RestDepth, "RestDepth", M * 100f);
            T(p.CA.RestBodyY, p.CB.RestBodyY, "RestBodyY", M * 100f); T(p.CA.PushDepth, p.CB.PushDepth, "PushDepth", M * 100f);
            // the skin's flank weights MotionProbe's trace reads (0-1: a weight 1e-4 apart moves a flank's point under 1e-5 m)
            var sa = p.A.GetComponent<BodySkin>(); var sb = p.B.GetComponent<BodySkin>();
            if (sa != null && sb != null) T(new[] { sa.FlankL, sa.FlankR }, new[] { sb.FlankL, sb.FlankR }, "skin's Flank", 1e-4f);
            for (var i = 0; i < 2; i++) if (p.CA.PushPart[i] != p.CB.PushPart[i] || p.CA.RestPart[i] != p.CB.RestPart[i] || p.CA.RestBody[i] != p.CB.RestBody[i]) w.IdxDiff++;
        }

        [DefaultExecutionOrder(10000)]
        private sealed class Watcher : MonoBehaviour
        {
            public List<Pair> Pairs; public Worst W; public bool Trace, On;
            private void LateUpdate() { if (On) foreach (var p in Pairs) Compare(p, W, Trace); }
        }

        private IEnumerator Make(List<Pair> pairs)
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var controller = AssetDatabase.LoadAssetAtPath<UnityEditor.Animations.AnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            RocketboxCatalog cat = null; RuntimeAnimatorController controller = null;
#endif
            if (cat == null || controller == null) { Assert.Ignore("the cast's catalogue or the locomotion controller are not built"); yield break; }
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(ground);
            ground.transform.localScale = new Vector3(20f, 1f, 20f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            // (the grounds' colliders where they were put before anyone stands on them: with the physics' auto-sync off, the first
            // frames' foot rays found a cube at its creation pose, MRC §19.3)
            Physics.SyncTransforms();
            var x = 0f;
            foreach (var id in Bodies.Append(NoSkin))
            {
                var prefab = cat.Get(id);
                Assert.That(prefab, Is.Not.Null, id + " in the catalogue");
                var p = SecondFace.Core.Npc.RbPeople.Of(id);
                var pair = new Pair { Id = id };
                var at = new Vector3(x, 0f, 0f); x += 1.6f;
                for (var k = 0; k < 2; k++)
                {
                    var walker = SecondFace.Game.Play.Walker.Create(prefab, controller, at, 0f, p?.Male ?? id.Contains("Male"));
                    walker.gameObject.name = "clearance twin " + id;   // (alike: the same name, the same seeds)
                    _made.Add(walker.gameObject);
                    RbDress.Apply(walker.gameObject, SecondFace.Core.Npc.RbPeople.DyesFor(p, "walker_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
                    // (still, by hand: no agent to push the twins apart, no walker to set the pace)
                    if (walker.Agent != null) walker.Agent.enabled = false;
                    walker.enabled = false;
                    var a = walker.Animator;
                    if (id == NoSkin && Bodies.Contains(id) == false)
                    {
                        // (the skin taken off: the clearance on the torso's sections, as for a body made without one)
                        var skin = a.GetComponent<BodySkin>();
                        if (skin != null) Object.DestroyImmediate(skin);
                        a.GetComponent<ArmClearance>().Bind();
                        walker.gameObject.name = "clearance twin no skin " + id;
                    }
                    if (k == 0) { pair.A = a; pair.CA = a.GetComponent<ArmClearance>(); } else { pair.B = a; pair.CB = a.GetComponent<ArmClearance>(); }
                }
                if (id == NoSkin) { pair.Id = id + " (no skin)"; Assert.That(pair.CA.Ready && !pair.CA.SkinReady && pair.CB.Ready && !pair.CB.SkinReady, Is.True, "the no-skin twins on the torso's sections"); }
                pairs.Add(pair);
            }
            yield return null;
        }

        private static IEnumerator Frames(int n) { for (var i = 0; i < n; i++) yield return null; }

        private static void Set(List<Pair> pairs, System.Action<Animator, ArmClearance> f) { foreach (var p in pairs) { f(p.A, p.CA); f(p.B, p.CB); } }

        private static IEnumerator Town(List<Pair> pairs)
        {
            foreach (var speed in new[] { 0f, 1.4f, 3.2f, 0f })
            {
                Set(pairs, (a, c) => { a.SetFloat("Speed", speed); a.SetBool("Sneak", false); });
                yield return Frames(90);
            }
            foreach (var g in new[] { "talk", "wave", "argue" })
            {
                Set(pairs, (a, c) => a.GetComponent<Ambient>()?.Gesture(g));
                yield return Frames(120);
            }
            Set(pairs, (a, c) => { a.SetBool("Sneak", true); a.SetFloat("Speed", 1f); });
            yield return Frames(90);
            Set(pairs, (a, c) => { a.SetBool("Sneak", false); a.SetFloat("Speed", 0f); });
            yield return Frames(60);
        }

        /// <summary>The town's states past the skin's range of the camera (ArmClearance.Step's far branch; the job's SectionsJob).</summary>
        private static IEnumerator Far(List<Pair> pairs)
        {
            var made = Camera.main == null;
            var cam = made ? new GameObject("clearance twins' far camera") { tag = "MainCamera" }.AddComponent<Camera>() : Camera.main;
            var was = cam.transform.position;
            cam.transform.position = new Vector3(2.4f, 3f, -8f);
            var keep = pairs.Select(p => p.CA.SkinRange).ToList();
            Set(pairs, (a, c) => c.SkinRange = 0.5f);
            try { yield return Town(pairs); }
            finally
            {
                for (var i = 0; i < pairs.Count; i++) { pairs[i].CA.SkinRange = keep[i]; pairs[i].CB.SkinRange = keep[i]; }
                if (made) Object.Destroy(cam.gameObject); else cam.transform.position = was;
            }
        }

        private static IEnumerator Fight(List<Pair> pairs)
        {
            var layer = pairs[0].A.GetLayerIndex(CombatMotion.FullLayer);
            Assert.That(layer, Is.GreaterThan(0), "the fight's whole-body layer");
            Set(pairs, (a, c) => { a.SetLayerWeight(layer, 1f); c.Holding = true; });
            foreach (var s in CombatMotion.States.Where(s => s.Layer == CombatMotion.FullLayer && (s.Gate == "guard" || s.Gate == "ready" || s.Gate == "aim" || s.Gate == "strike" || s.Gate == "crouch")).Take(12))
            {
                foreach (var p in pairs)
                {
                    var female = p.A.GetComponent<BodySkin>() != null && !(SecondFace.Core.Npc.RbPeople.Of(p.Id)?.Male ?? p.Id.Contains("Male"));
                    if (s.Only == (female ? "m" : "f")) continue;
                    var h = Animator.StringToHash(s.Name);
                    if (!p.A.HasState(layer, h)) continue;
                    p.A.CrossFadeInFixedTime(s.Name, 0.1f, layer); p.B.CrossFadeInFixedTime(s.Name, 0.1f, layer);
                }
                yield return Frames(60);
            }
            Set(pairs, (a, c) => { a.SetLayerWeight(layer, 0f); c.Holding = false; });
            yield return Frames(30);
        }

        /// <summary>
        /// The gate's own people run on the job: the cast made as HumanMotionGateTests makes them (the prefab, its dyes, the
        /// townsfolk's or the player's animation, every runtime system on, culling off), the gate's traces on for some
        /// (TraceStages, as MotionProbe sets it), standing and walking: no one's clearance falls back to the managed step, so the
        /// gate measures the job and not the reference.
        /// </summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheGatesPeopleRunOnTheJob()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<SecondFace.Game.World.WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; SecondFace.Game.World.WorldAssets assets = null;
#endif
            if (cat == null || assets == null || assets.Locomotion == null) { Assert.Ignore("the cast's catalogue or the world's assets are not built"); yield break; }
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube); _made.Add(ground);
            ground.transform.localScale = new Vector3(30f, 1f, 30f); ground.transform.position = new Vector3(0f, -0.5f, 0f);
            var ids = new[] { "Female_Adult_01", "Male_Adult_08", "Business_Female_02", "Construction_Male_03", "Female_Adult_09", "Male_Adult_03" };
            var people = new List<(Animator A, ArmClearance C)>();
            for (var i = 0; i < ids.Length; i++)
            {
                var prefab = cat.Get(ids[i]);
                Assert.That(prefab, Is.Not.Null, ids[i]);
                var go = Object.Instantiate(prefab, new Vector3((i - 2.5f) * 1.5f, 0f, 0f), Quaternion.identity); _made.Add(go);
                go.name = "gate_" + ids[i];
                var p = SecondFace.Core.Npc.RbPeople.Of(ids[i]);
                RbDress.Apply(go, SecondFace.Core.Npc.RbPeople.DyesFor(p, "gate_" + ids[i], p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                if (i == ids.Length - 1) SecondFace.Game.Play.Walker.Animate(a, assets.Locomotion, p?.Male ?? true);
                else SecondFace.Game.Play.PeopleService.Animate(a, assets.Locomotion, ids[i], p?.Male ?? true);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                var c = a.GetComponent<ArmClearance>();
                Assert.That(c, Is.Not.Null, ids[i] + "'s arm clearance");
                c.TraceStages = i % 2 == 0;
                people.Add((a, c));
            }
            yield return Frames(20);
            var from = new Dictionary<string, int>(ArmClearance.Fallbacks);
            var fell = new List<string>();
            foreach (var speed in new[] { 0f, 1.4f, 0f })
            {
                foreach (var (a, _) in people) a.SetFloat("Speed", speed);
                for (var f = 0; f < 90; f++)
                {
                    yield return null;
                    foreach (var (a, c) in people) if (c.Ready && c.FallbackWhy != null) fell.Add($"{a.name}: {c.FallbackWhy}");
                }
            }
            var delta = ArmClearance.Fallbacks.Where(kv => kv.Value > (from.TryGetValue(kv.Key, out var w) ? w : 0)).Select(kv => $"{kv.Key} x{kv.Value - (from.TryGetValue(kv.Key, out var w2) ? w2 : 0)}").ToList();
            Assert.That(people.All(x => x.C.SkinReady), Is.True, "every one of them on the skin");
            Assert.That(fell.Distinct().ToList(), Is.Empty, "no one fell back: " + string.Join("; ", fell.Distinct()));
            Assert.That(delta, Is.Empty, "no fall back counted: " + string.Join("; ", delta));
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator TheJobStepsAsTheManagedStepDoes()
        {
            var keep = Time.captureDeltaTime;
            Time.captureDeltaTime = 1f / 60f;   // (the same step every frame for both twins; it is the same frame for both anyway)
            try
            {
                var pairs = new List<Pair>();
                yield return Make(pairs);
                var host = new GameObject("clearance twins' watcher"); _made.Add(host);
                var watch = host.AddComponent<Watcher>();
                watch.Pairs = pairs;
                yield return Frames(30);
                var report = new List<string>(); var wrong = new List<string>();
                foreach (var (control, trace) in new[] { (true, false), (false, false), (false, true) })
                {
                    foreach (var p in pairs) { p.Apart = false; p.HasPrev = false; }   // (a pass's twins counted from level)
                    foreach (var p in pairs) { p.CA.ForceManaged = true; p.CB.ForceManaged = control; p.CA.TraceStages = trace; p.CB.TraceStages = trace; }
                    foreach (var (what, seq) in new (string, System.Func<List<Pair>, IEnumerator>)[] { ("town", Town), ("fight", Fight), ("town past the skin's range", Far) })
                    {
                        var w = new Worst();
                        watch.W = w; watch.Trace = trace; watch.On = true;
                        long skin0 = ArmClearance.JobSkinSteps, sec0 = ArmClearance.JobSectionSteps;
                        yield return seq(pairs);
                        watch.On = false;
                        foreach (var p in pairs)
                        {
                            if (p.Apart) w.EndApart++;
                            foreach (var hb in Turned)
                            {
                                var a = p.A.GetBoneTransform(hb); var b = p.B.GetBoneTransform(hb);
                                if (a == null || b == null) continue;
                                w.EndDeg = Mathf.Max(w.EndDeg, (float)Ang(a.localRotation, b.localRotation));
                                w.EndM = Mathf.Max(w.EndM, ((a.position - p.A.transform.position) - (b.position - p.B.transform.position)).magnitude);
                            }
                        }
                        var label = $"{(control ? "control (both managed)" : "managed against the job")}, traces {(trace ? "on" : "off")}, {what}";
                        long skinN = ArmClearance.JobSkinSteps - skin0, secN = ArmClearance.JobSectionSteps - sec0;
                        report.Add(w.Note(label) + $"; the job's steps: {skinN} on the skin, {secN} on the sections");
                        // (each way taken where it should be: the no-skin twin on the sections throughout, everyone far off)
                        if (!control && (secN < w.Frames || (what != "town past the skin's range" && skinN == 0) || (what == "town past the skin's range" && skinN > 0)))
                            wrong.Add($"{label}: the job's ways not as Step forks: {skinN} skin steps, {secN} sections steps over {w.Frames} frames");
                        foreach (var line in PartedLog) report.Add("  " + line);
                        PartedLog.Clear(); FirstParted.Clear();
                        if ((!control && w.Fallbacks > 0) || w.Deg > Deg || w.M > M || w.Diag > 1f || w.Trace > 1f || w.IdxDiff > 0) wrong.Add(w.Note(label));
                    }
                }
                Debug.Log("ClearanceJobTests: " + string.Join("\n", report));
                Assert.That(wrong, Is.Empty, string.Join("\n", wrong));
            }
            finally { Time.captureDeltaTime = keep; }
        }
    }
}
