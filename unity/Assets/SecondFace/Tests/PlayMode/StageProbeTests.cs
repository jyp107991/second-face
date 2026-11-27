using System.Collections;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using NUnit.Framework;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    // TEMP probe (never committed): the gate's own pick (GATE_PEOPLE) with (1) W3_TRACE people's moving arms through the arm
    // clearance's stages every frame of the walks (ArmClearance.SwingTrace), (2) FOOT_TRACE people's feet: the bind's foot
    // vertices in each foot's frame beside the foot plant's sole points and the gate's, then every walking frame the hold,
    // its pivot and heading, and the gate's own heel and ball in the world; (3) W3_MODE A/B switches on ArmClearance.
    public class StageProbeTests
    {
        private static readonly string Out = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", "stage_probe"));
        private static object F(object o, string n) => o.GetType().GetField(n, BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Public).GetValue(o);

        [DefaultExecutionOrder(10004)]
        public sealed class SwingRec : MonoBehaviour
        {
            public MotionProbe Probe; public ArmClearance Ac; private StreamWriter _w;
            private void Start()
            {
                Directory.CreateDirectory(Out);
                _w = new StreamWriter(Path.Combine(Out, $"swing_{Probe.Person}.csv")) { AutoFlush = false };
                var cols = new[] { "a0", "sag0", "side0", "a1", "a2", "sag2", "side2", "pushFwd", "turn", "aEnd" };
                _w.WriteLine("state,t," + string.Join(",", cols.Select(c => c + "L")) + "," + string.Join(",", cols.Select(c => c + "R")) + ",pushL,pushR,depL,depR");
            }
            private void LateUpdate()
            {
                if (_w == null || Probe.State == null || Probe.Kind == null) return;
                if (!Probe.State.Contains("walk") && !Probe.State.Contains("jog")) return;
                Ac.TraceStages = true;
                var t = Ac.SwingTrace;
                _w.WriteLine($"{Probe.State},{Time.time:0.000}," + string.Join(",", t.Select(x => x.ToString("0.00"))) + $",{Ac.PushDeg[0]:0.0},{Ac.PushDeg[1]:0.0},{Ac.PushDepth[0]:0.00},{Ac.PushDepth[1]:0.00}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }

        [DefaultExecutionOrder(10004)]
        public sealed class FootRec : MonoBehaviour
        {
            public MotionProbe Probe; public FootPlant Plant; private StreamWriter _w; private bool _bindDone;
            private Transform _fl, _fr, _tl, _tr; private byte[] _seg; private int[] _sole; private MethodInfo _bake;
            private static readonly FieldInfo LockL = typeof(FootPlant).GetField("_lockL", BindingFlags.NonPublic | BindingFlags.Instance), LockR = typeof(FootPlant).GetField("_lockR", BindingFlags.NonPublic | BindingFlags.Instance);
            private void Start()
            {
                var a = GetComponent<Animator>();
                _fl = a.GetBoneTransform(HumanBodyBones.LeftFoot); _fr = a.GetBoneTransform(HumanBodyBones.RightFoot);
                _tl = a.GetBoneTransform(HumanBodyBones.LeftToes); _tr = a.GetBoneTransform(HumanBodyBones.RightToes);
                _bake = typeof(MotionProbe).GetMethod("Bake", BindingFlags.NonPublic | BindingFlags.Instance);
                Directory.CreateDirectory(Out);
                _w = new StreamWriter(Path.Combine(Out, $"foot_{Probe.Person}.csv")) { AutoFlush = false };
                _w.WriteLine("state,t,lockL,pivotL,fwdLx,fwdLz,lockR,pivotR,fwdRx,fwdRz,plantBallLx,plantBallLy,plantBallLz,plantBallRx,plantBallRy,plantBallRz,gHeelLx,gHeelLy,gHeelLz,gBallLx,gBallLy,gBallLz,gHeelRx,gHeelRy,gHeelRz,gBallRx,gBallRy,gBallRz,footLqx,footLqy,footLqz,footLqw,footRqx,footRqy,footRqz,footRqw,footLx,footLy,footLz,footRx,footRy,footRz");
            }
            private Vector3[] Bake() => (Vector3[])_bake.Invoke(Probe, new object[] { null });
            private void LateUpdate()
            {
                if (_w == null || Probe.State == null) return;
                _seg ??= (byte[])F(Probe, "_seg"); _sole ??= (int[])F(Probe, "_solePoint");
                if (_seg == null || _sole == null) return;
                if (!_bindDone && Probe.State.StartsWith("idle0") && Probe.Kind != null)
                {
                    _bindDone = true;
                    var v = Bake();
                    var sb = new StringBuilder("foot,kind,i,x,y,z\n");
                    foreach (var (foot, toe, part, side) in new[] { (_fl, _tl, (byte)13, "L"), (_fr, _tr, (byte)14, "R") })
                    {
                        for (var i = 0; i < v.Length; i++) if (_seg[i] == part) { var q = foot.InverseTransformPoint(v[i]); sb.Append($"{side},v,{i},{q.x:0.00000},{q.y:0.00000},{q.z:0.00000}\n"); }
                        foreach (var (nm, k) in new[] { ("heel", 0), ("ball", 1) })
                        {
                            var j = _sole[(side == "L" ? 0 : 2) + k];
                            if (j >= 0) { var q = foot.InverseTransformPoint(v[j]); sb.Append($"{side},gate_{nm},{j},{q.x:0.00000},{q.y:0.00000},{q.z:0.00000}\n"); }
                            var smr = (SkinnedMeshRenderer)F(Probe, "_smr");
                            if (j >= 0 && smr != null && smr.sharedMesh != null && smr.sharedMesh.isReadable)
                            {
                                var bw = smr.sharedMesh.boneWeights[j]; var bs = smr.bones;
                                Debug.Log($"STAGEPROBE {Probe.Person} gate {side} {nm} vertex {j}: {bs[bw.boneIndex0].name} {bw.weight0:0.00}, {bs[bw.boneIndex1].name} {bw.weight1:0.00}, {bs[bw.boneIndex2].name} {bw.weight2:0.00}");
                            }
                            else if (j >= 0) Debug.Log($"STAGEPROBE {Probe.Person} gate {side} {nm} vertex {j}: mesh not readable");
                        }
                        foreach (var nm in new[] { "_heel", "_back", "_ball", "_tip" })
                        {
                            var q = (Vector3)typeof(FootPlant).GetField(nm + side, BindingFlags.NonPublic | BindingFlags.Instance).GetValue(Plant);
                            if (nm == "_tip" && toe != null) q = foot.InverseTransformPoint(toe.TransformPoint(q));
                            sb.Append($"{side},plant{nm},-1,{q.x:0.00000},{q.y:0.00000},{q.z:0.00000}\n");
                        }
                        foreach (var nm in new[] { "_hullF", "_hullT" })
                        {
                            var arr = (Vector3[])typeof(FootPlant).GetField(nm + side, BindingFlags.NonPublic | BindingFlags.Instance).GetValue(Plant);
                            foreach (var p in arr) { var q = nm == "_hullT" && toe != null ? foot.InverseTransformPoint(toe.TransformPoint(p)) : p; sb.Append($"{side},hull{nm.Substring(5)},-1,{q.x:0.00000},{q.y:0.00000},{q.z:0.00000}\n"); }
                        }
                        var up = foot.InverseTransformDirection(Vector3.up); var right = foot.InverseTransformDirection(transform.right); var fwd = foot.InverseTransformDirection(transform.forward);
                        var toeL = toe != null ? foot.InverseTransformPoint(toe.position) : Vector3.zero;
                        sb.Append($"{side},axis_up,-1,{up.x:0.00000},{up.y:0.00000},{up.z:0.00000}\n{side},axis_right,-1,{right.x:0.00000},{right.y:0.00000},{right.z:0.00000}\n{side},axis_fwd,-1,{fwd.x:0.00000},{fwd.y:0.00000},{fwd.z:0.00000}\n{side},toe_joint,-1,{toeL.x:0.00000},{toeL.y:0.00000},{toeL.z:0.00000}\n");
                    }
                    File.WriteAllText(Path.Combine(Out, $"footbind_{Probe.Person}.csv"), sb.ToString());
                }
                if (Probe.Kind == null || !Probe.State.Contains("walk") && !Probe.State.Contains("jog")) return;
                var w = Bake();
                object l = LockL.GetValue(Plant), r = LockR.GetValue(Plant);
                bool On(object k) => (bool)k.GetType().GetField("On").GetValue(k);
                int Piv(object k) => (int)k.GetType().GetField("Pivot").GetValue(k);
                Vector3 Fw(object k) => (Vector3)k.GetType().GetField("Fwd").GetValue(k);
                string V(Vector3 p) => $"{p.x:0.0000},{p.y:0.0000},{p.z:0.0000}";
                string Q(Quaternion q) => $"{q.x:0.00000},{q.y:0.00000},{q.z:0.00000},{q.w:0.00000}";
                Vector3 G(int k) => _sole[k] >= 0 ? w[_sole[k]] : Vector3.zero;
                _w.WriteLine($"{Probe.State},{Time.time:0.000},{(On(l) ? 1 : 0)},{Piv(l)},{Fw(l).x:0.0000},{Fw(l).z:0.0000},{(On(r) ? 1 : 0)},{Piv(r)},{Fw(r).x:0.0000},{Fw(r).z:0.0000},{V(Plant.BallL)},{V(Plant.BallR)},{V(G(0))},{V(G(1))},{V(G(2))},{V(G(3))},{Q(_fl.rotation)},{Q(_fr.rotation)},{V(_fl.position)},{V(_fr.position)}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }

        [DefaultExecutionOrder(10004)]
        public sealed class RestRec : MonoBehaviour
        {
            public MotionProbe Probe; public ArmClearance Ac; private StreamWriter _w;
            private void Start()
            {
                Directory.CreateDirectory(Out);
                _w = new StreamWriter(Path.Combine(Out, $"rest_{Probe.Person}.csv")) { AutoFlush = false };
                _w.WriteLine("state,t," + string.Join(",", Enumerable.Range(0, 6).Select(k => $"fL{k}")) + "," + string.Join(",", Enumerable.Range(0, 6).Select(k => $"fR{k}")) + "," + string.Join(",", Enumerable.Range(0, 6).Select(k => $"hR{k}")) + ",a1R0,a1R1,a1R2,a1R3,a1R4,a1R5,restDegR,pushR");
            }
            private void LateUpdate()
            {
                if (_w == null || Probe.State == null || Probe.Kind == null) return;
                if (Probe.State.StartsWith("combat:") || Probe.State.Contains("walk") || Probe.State.Contains("jog")) return;
                Ac.TraceStages = true;
                var f = Ac.ForearmDepth; var h = Ac.HandDepth; var sa = Ac.StageA1;
                _w.WriteLine($"{Probe.State},{Time.time:0.000}," + string.Join(",", f.Select(x => (x * 100f).ToString("0.00"))) + "," + string.Join(",", h.Skip(6).Select(x => (x * 100f).ToString("0.00"))) + "," + string.Join(",", sa.Skip(8).Take(6).Select(x => x.ToString("0.0"))) + $",{Ac.RestDeg[1]:0.0},{Ac.PushDeg[1]:0.0}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }

        [DefaultExecutionOrder(10001)]
        public sealed class NeedRec : MonoBehaviour
        {
            public MotionProbe Probe; public ArmClearance Ac; private StreamWriter _w; private BodySkin _skin; private Animator _an;
            private static readonly BindingFlags NP = BindingFlags.NonPublic | BindingFlags.Instance;
            private MethodInfo _need, _give; private FieldInfo _needAt, _needDepth, _restW;
            private void Start()
            {
                Directory.CreateDirectory(Out);
                _w = new StreamWriter(Path.Combine(Out, $"need_{Probe.Person}.csv")) { AutoFlush = false };
                _w.WriteLine("state,t,restW,needDeg,needAt,needPart,needDepth,deepI,deepPart,deepD,give,m,offArm,s,offBody,nx,ny,nz,ax,ay,az,distElbow");
                _skin = Probe.GetComponent<BodySkin>(); _an = Probe.GetComponent<Animator>();
                _need = typeof(ArmClearance).GetMethod("SkinNeed", NP); _give = typeof(ArmClearance).GetMethod("Give", NP);
                _needAt = typeof(ArmClearance).GetField("_needAt", NP); _needDepth = typeof(ArmClearance).GetField("_needDepth", NP); _restW = typeof(ArmClearance).GetField("_restW", NP);
            }
            private void LateUpdate()
            {
                if (_w == null || Probe.State == null || !(Probe.State == "idle1" || Probe.State == "turn" || Probe.State == "idle0")) return;
                var up = _an.GetBoneTransform(HumanBodyBones.RightUpperArm); var lo = _an.GetBoneTransform(HumanBodyBones.RightLowerArm);
                var res = _need.Invoke(Ac, new object[] { up, BodySkin.Part.UpperArmR, false, false, false });
                var ang = (float)res.GetType().GetField("Item1").GetValue(res);
                var at = (int)_needAt.GetValue(Ac); var nd = (float)_needDepth.GetValue(Ac); var rw = (float)_restW.GetValue(Ac);
                int b = _skin.Begin(BodySkin.Part.ForearmR), e = _skin.End(BodySkin.Part.ForearmR);
                _skin.DepthRange(b, e);
                var deep = -1; var dd = -1f; var dn = Vector3.zero;
                for (var i = b; i < e; i++) if (_skin.Got(i, out var d, out var n) && d > dd) { dd = d; deep = i; dn = n; }
                if (deep < 0) return;
                _skin.Got(deep, out _, out _);
                var near = _skin.Near;
                var g = (float)_give.Invoke(Ac, new object[] { deep, dn, Ac.ClothGive, Ac.SleeveGive });
                var m = -Ac.RestGive * Mathf.Clamp01(-Vector3.Dot(_skin.N[deep], dn));
                var s = -Vector3.Dot(_skin.N[deep], dn);
                var inv = Quaternion.Inverse(Probe.transform.rotation);
                var nb = inv * dn; var na = inv * _skin.N[deep];
                _w.WriteLine($"{Probe.State},{Time.time:0.000},{rw:0.00},{ang:0.00},{at},{(at >= 0 ? _skin.PartOf(at).ToString() : "-")},{nd * 100f:0.00},{deep},{_skin.PartOf(deep)},{dd * 100f:0.00},{g * 100f:0.00},{m * 100f:0.00},{_skin.Off(deep) * 100f:0.00},{s:0.00},{(near >= 0 ? _skin.Off(near) * 100f : -1f):0.00},{nb.x:0.00},{nb.y:0.00},{nb.z:0.00},{na.x:0.00},{na.y:0.00},{na.z:0.00},{(_skin.P[deep] - lo.position).magnitude * 100f:0.0}");
            }
            private void OnDestroy() { _w?.Flush(); _w?.Close(); _w = null; }
        }

        public sealed class Watcher : MonoBehaviour
        {
            private static readonly string[] Rest = (System.Environment.GetEnvironmentVariable("REST_TRACE") ?? "").Split(',').Where(x => x.Length > 0).ToArray();
            private static readonly string[] Off = (System.Environment.GetEnvironmentVariable("ROBUST_OFF") ?? "").Split(',').Where(x => x.Length > 0).ToArray();
            private static readonly string[] Swing = (System.Environment.GetEnvironmentVariable("W3_TRACE") ?? "").Split(',').Where(x => x.Length > 0).ToArray();
            private static readonly string[] Foot = (System.Environment.GetEnvironmentVariable("FOOT_TRACE") ?? "").Split(',').Where(x => x.Length > 0).ToArray();
            private static readonly string Mode = System.Environment.GetEnvironmentVariable("W3_MODE") ?? "";
            private static readonly string FootMode = System.Environment.GetEnvironmentVariable("FOOT_MODE") ?? "";
            private void Update()
            {
                foreach (var p in Object.FindObjectsByType<MotionProbe>(FindObjectsSortMode.None))
                {
                    if (p.Person == null || p.GetComponent<Marked>() != null) continue;
                    var mk = p.gameObject.AddComponent<Marked>(); mk.Person = p.Person; mk.Skin = p.GetComponent<BodySkin>();
                    var ac = p.GetComponent<ArmClearance>();
                    if (ac != null && Mode.Length > 0)
                        foreach (var kv in Mode.Split(';'))
                        {
                            var x = kv.Split('=');
                            if (x.Length != 2) continue;
                            var f = typeof(ArmClearance).GetField(x[0], BindingFlags.Public | BindingFlags.Instance);
                            if (f == null) { Debug.LogWarning($"W3_MODE: no field {x[0]}"); continue; }
                            if (f.FieldType == typeof(bool)) f.SetValue(ac, x[1] == "1" || x[1] == "true");
                            else if (f.FieldType == typeof(float)) f.SetValue(ac, float.Parse(x[1], System.Globalization.CultureInfo.InvariantCulture));
                            Debug.Log($"W3_MODE {p.Person}: {x[0]} = {f.GetValue(ac)}");
                        }
                    var fp = p.GetComponent<FootPlant>();
                    if (fp != null && FootMode.Length > 0)
                        foreach (var kv in FootMode.Split(';'))
                        {
                            var x = kv.Split('=');
                            if (x.Length != 2) continue;
                            var f = typeof(FootPlant).GetField(x[0], BindingFlags.Public | BindingFlags.Instance);
                            if (f == null) { Debug.LogWarning($"FOOT_MODE: no field {x[0]}"); continue; }
                            if (f.FieldType == typeof(bool)) f.SetValue(fp, x[1] == "1" || x[1] == "true");
                            else if (f.FieldType == typeof(float)) f.SetValue(fp, float.Parse(x[1], System.Globalization.CultureInfo.InvariantCulture));
                            Debug.Log($"FOOT_MODE {p.Person}: {x[0]} = {f.GetValue(fp)}");
                        }
                    if (ac != null && Swing.Any(x => p.Person == x)) { var s = p.gameObject.AddComponent<SwingRec>(); s.Probe = p; s.Ac = ac; }
                    if (Foot.Any(x => p.Person == x)) { var f = p.gameObject.AddComponent<FootRec>(); f.Probe = p; f.Plant = p.GetComponent<FootPlant>(); }
                    if (ac != null && Rest.Any(x => p.Person == x)) { var r = p.gameObject.AddComponent<RestRec>(); r.Probe = p; r.Ac = ac; }
                    if (ac != null && (System.Environment.GetEnvironmentVariable("NEED_TRACE") ?? "").Split(',').Any(x => x.Length > 0 && p.Person == x)) { var nr = p.gameObject.AddComponent<NeedRec>(); nr.Probe = p; nr.Ac = ac; }
                }
            }
        }
        public sealed class Marked : MonoBehaviour
        {
            public string Person; public BodySkin Skin;
            private void OnDestroy()
            {
                if (Skin == null) return;
                long V(string n) { var f = typeof(BodySkin).GetField(n, BindingFlags.Public | BindingFlags.Instance); return f != null ? (long)f.GetValue(Skin) : -1; }
                var sm = typeof(BodySkin).GetField("SatMs", BindingFlags.Public | BindingFlags.Instance);
                Debug.Log($"STAGEPROBE skin {Person}: depth asks {V("DepthCalls")}, robust passes run {V("RobustRuns")}, kept from the pose {V("DepthKept")}, satellite asks {V("SatAsks")}, deeper {V("SatDeeper")}, satellites {(sm != null ? (double)sm.GetValue(Skin) : -1):0.0} ms in all");
                double D(string n) { var f = typeof(BodySkin).GetField(n, BindingFlags.Public | BindingFlags.Instance); return f != null ? System.Convert.ToDouble(f.GetValue(Skin)) : -1; }
                var ac = Skin.GetComponent<ArmClearance>();
                var frames = ac != null ? ac.CostFrames : 0;
                Debug.Log($"STAGEPROBE drawn {Person}: asks {D("DrawnAsks")}, found {D("DrawnFound")}, inside {D("DrawnInside")}, refused by the rays {D("DrawnRefused")}, posed {D("DrawnPoses")}x in {D("DrawnPoseMs"):0.0} ms, read in {D("DrawnReadMs"):0.0} ms; clearance frames {frames}, {(frames > 0 ? ac.CostMs / frames : 0):0.000} ms a frame; drawn {(frames > 0 ? (D("DrawnPoseMs") + D("DrawnReadMs")) / frames : 0):0.000} ms a frame");
            }
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator Probe()
        {
            Directory.CreateDirectory(Out);
            var w = new GameObject("stage watcher");
            Object.DontDestroyOnLoad(w);
            w.AddComponent<Watcher>();
            try { yield return new HumanMotionGateTests().PickedPeopleStandAndMove(); }
            finally
            {
                foreach (var t in Object.FindObjectsByType<SwingRec>(FindObjectsSortMode.None)) Object.DestroyImmediate(t);
                foreach (var t in Object.FindObjectsByType<FootRec>(FindObjectsSortMode.None)) Object.DestroyImmediate(t);
                Object.Destroy(w);
            }
        }
    }
}
