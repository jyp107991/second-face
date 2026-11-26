using System.Collections;
using System.Collections.Generic;
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
    // TEMP probe (never committed): the gate's own pick (GATE_PEOPLE) run with a watcher that measures, every second frame of
    // every state, each of the runtime's arm points against the drawn surface (the torso's and thighs' own triangles, inside by
    // ray parity, as the gate's C1), beside what the runtime's skin reads there (BodySkin.Depth), and dumps each state's worst
    // frame (the runtime's body and arm points near the gate's worst arm vertex, and the drawn triangles) for offline readings.
    public class SkinTruthProbeTests
    {
        private static object F(object o, string n) => o.GetType().GetField(n, BindingFlags.NonPublic | BindingFlags.Instance).GetValue(o);
        private static readonly string Out = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "test-results", "skin_truth"));
        private static StreamWriter _pairs;

        [DefaultExecutionOrder(10002)]
        public sealed class Truth : MonoBehaviour
        {
            public MotionProbe Probe;
            private static readonly string[] Only = System.Environment.GetEnvironmentVariable("TRUTH_STATES") is { Length: > 0 } ts ? ts.Split(',') : null;
            private BodySkin _skin; private SkinnedMeshRenderer _smr; private Transform _hips, _root; private byte[] _seg; private bool[] _armLow;
            private int[] _tris; private Mesh _baked; private int _frame; private string _state;
            private float _worst = -1f; private string _json; private float _worstOver = 0.002f; private string _jsonOver;
            private Vector3[] _lo, _hi;

            private bool Body(int i) => _seg[i] == 1 || _seg[i] == 9 || _seg[i] == 10;
            private bool ArmV(int i) => (_seg[i] >= 5 && _seg[i] <= 8) || _armLow[i];

            private void Flush()
            {
                if (_json != null && _state != null)
                {
                    Directory.CreateDirectory(Out);
                    File.WriteAllText(Path.Combine(Out, $"{Probe.Person}_{_state.Replace(':', '_')}.json"), _json);
                }
                if (_jsonOver != null && _state != null) { Directory.CreateDirectory(Out); File.WriteAllText(Path.Combine(Out, $"{Probe.Person}_{_state.Replace(':', '_')}_over.json"), _jsonOver); }
                _json = null; _worst = -1f; _jsonOver = null; _worstOver = 0.002f;
            }

            private void OnDestroy() => Flush();

            private void LateUpdate()
            {
                if (Probe == null) return;
                if (Probe.State != _state) { Flush(); _state = Probe.State; }
                if (Probe.State == null || Probe.Kind == null) return;
                if (Only != null && !Only.Any(x => Probe.State.StartsWith(x))) return;
                if (Only == null && Probe.State.StartsWith("combat:")) return;
                if ((_frame++ & 1) != 0) return;
                if (_seg == null)
                {
                    _seg = (byte[])F(Probe, "_seg"); _armLow = (bool[])F(Probe, "_armLow");
                    _smr = (SkinnedMeshRenderer)F(Probe, "_smr"); _hips = (Transform)F(Probe, "_hips"); _root = Probe.transform;
                    _skin = GetComponent<BodySkin>(); _baked = new Mesh();
                    if (_seg == null || _smr == null || _skin == null) { enabled = false; return; }
                    _smr.BakeMesh(_baked, true);
                    var all = _baked.triangles; var keep = new List<int>();
                    for (var t = 0; t + 2 < all.Length; t += 3) if (Body(all[t]) && Body(all[t + 1]) && Body(all[t + 2])) { keep.Add(all[t]); keep.Add(all[t + 1]); keep.Add(all[t + 2]); }
                    _tris = keep.ToArray(); _lo = new Vector3[_tris.Length / 3]; _hi = new Vector3[_tris.Length / 3];
                }
                if (!_skin.Ready) return;
                _smr.BakeMesh(_baked, true);
                var v = _baked.vertices; var n = _baked.normals;
                var l2w = Matrix4x4.TRS(_smr.transform.position, _smr.transform.rotation, Vector3.one);
                for (var i = 0; i < v.Length; i++) { v[i] = l2w.MultiplyPoint3x4(v[i]); n[i] = _smr.transform.rotation * n[i]; }
                for (int t = 0, k = 0; t < _tris.Length; t += 3, k++)
                {
                    Vector3 a = v[_tris[t]], b = v[_tris[t + 1]], c = v[_tris[t + 2]];
                    _lo[k] = Vector3.Min(a, Vector3.Min(b, c)); _hi[k] = Vector3.Max(a, Vector3.Max(b, c));
                }
                bool In(Vector3 p)
                {
                    var away = p - _hips.position; away.y = 0f; away = away.sqrMagnitude > 1e-6f ? away.normalized : _root.right;
                    var votes = 0;
                    foreach (var dir in new[] { away, Quaternion.AngleAxis(90f, Vector3.up) * away, Quaternion.AngleAxis(-90f, Vector3.up) * away })
                    {
                        var cr = 0;
                        for (int t = 0, k = 0; t < _tris.Length; t += 3, k++)
                        {
                            if (p.y < _lo[k].y || p.y > _hi[k].y) continue;
                            if (Hit(p, dir, v[_tris[t]], v[_tris[t + 1]], v[_tris[t + 2]], 0.8f)) cr++;
                        }
                        if ((cr & 1) == 1) votes++;
                    }
                    return votes >= 2;
                }
                float True(Vector3 p) { var d = MotionProbe.DrawnDepth(p, v, _tris, _lo, _hi, 0.08f); return In(p) ? d : -d; }
                var inv = Quaternion.Inverse(_root.rotation);
                string L(Vector3 w) { var r = inv * (w - _hips.position) * 100f; return $"[{r.x:0.000},{r.y:0.000},{r.z:0.000}]"; }
                string D(Vector3 w) { var r = inv * w; return $"[{r.x:0.0000},{r.y:0.0000},{r.z:0.0000}]"; }
                // the runtime's arm points near the body: what it reads and what is true
                int from = _skin.Begin(BodySkin.Part.UpperArmL), to = _skin.End(BodySkin.Part.HandR);
                var rows = new List<(int I, bool In, float Rd, float Tr, int Near)>();
                for (var i = from; i < to; i++)
                {
                    var ins = _skin.Depth(_skin.P[i], out var rd, out _);
                    var near = _skin.Near;
                    if (!ins || rd < -0.02f) continue;
                    var tr = True(_skin.P[i]);
                    rows.Add((i, ins, rd, tr, near));
                    _pairs?.WriteLine($"{Probe.Person},{_state},{Time.time:0.000},{i},{_skin.PartOf(i)},{rd * 100f:0.000},{tr * 100f:0.000},{_skin.Off(i) * 100f:0.00},{(near >= 0 ? _skin.Off(near) * 100f : -1f):0.00},{(near >= 0 && _skin.Low(near) ? 1 : 0)},{(near >= 0 ? _skin.PartOf(near).ToString() : "none")}");
                }
                // the gate's worst arm vertex this frame (the candidates by the three nearest body vertices' planes, then the drawn
                // depth), among the arm's vertices near the runtime's arm points that are near the body
                if (rows.Count == 0) return;
                var lo = Vector3.one * 1e9f; var hi = -lo;
                foreach (var r0 in rows) { lo = Vector3.Min(lo, _skin.P[r0.I]); hi = Vector3.Max(hi, _skin.P[r0.I]); }
                lo -= Vector3.one * 0.04f; hi += Vector3.one * 0.04f;
                bool InBox(Vector3 q, float pad) => q.x > lo.x - pad && q.x < hi.x + pad && q.y > lo.y - pad && q.y < hi.y + pad && q.z > lo.z - pad && q.z < hi.z + pad;
                var nearB = new List<int>();
                for (var j = 0; j < v.Length; j++) if (Body(j) && InBox(v[j], 0.06f)) nearB.Add(j);
                var cands = new List<(int I, float D)>();
                for (var i = 0; i < v.Length; i++)
                {
                    if (!ArmV(i) || !InBox(v[i], 0f)) continue;
                    var q = v[i];
                    float b0 = 1e9f, b1 = 1e9f, b2 = 1e9f; int i0 = -1, i1 = -1, i2 = -1;
                    foreach (var j in nearB)
                    {
                        var d = (v[j] - q).sqrMagnitude;
                        if (d < b0) { b2 = b1; i2 = i1; b1 = b0; i1 = i0; b0 = d; i0 = j; }
                        else if (d < b1) { b2 = b1; i2 = i1; b1 = d; i1 = j; }
                        else if (d < b2) { b2 = d; i2 = j; }
                    }
                    if (i2 < 0 || b0 > 0.0225f) continue;
                    var depth = Mathf.Min(-Vector3.Dot(q - v[i0], n[i0]), Mathf.Min(-Vector3.Dot(q - v[i1], n[i1]), -Vector3.Dot(q - v[i2], n[i2])));
                    if (depth > -0.005f) cands.Add((i, depth));
                }
                cands.Sort((x, y) => y.D.CompareTo(x.D));
                var worstV = -1; var worstT = 0f;
                foreach (var (i, _) in cands.Take(80))
                {
                    var tr = True(v[i]);
                    if (tr > worstT) { worstT = tr; worstV = i; }
                }
                // (or the runtime's deepest arm point, where the vertices found none deeper)
                var rowBest = -1; var rowT = 0f;
                foreach (var r0 in rows) if (r0.Tr > rowT) { rowT = r0.Tr; rowBest = r0.I; }
                // the runtime's most over-read arm point this frame (inside by its reading, out or shallower by the truth)
                var overI = -1; var overD = 0f;
                foreach (var r0 in rows) if (r0.In && r0.Rd - r0.Tr > overD) { overD = r0.Rd - r0.Tr; overI = r0.I; }
                if (overI >= 0 && overD > _worstOver) { _worstOver = overD; _jsonOver = Make(_skin.P[overI], -1, overD, "over"); }
                if (worstV < 0 && rowBest < 0) return;
                var at = worstV >= 0 && worstT >= rowT ? worstT : rowT;
                if (at <= _worst) return;
                _worst = at;
                _json = Make(worstV >= 0 && worstT >= rowT ? v[worstV] : _skin.P[rowBest], worstV >= 0 && worstT >= rowT ? worstV : -1, at, "deep");
                string Make(Vector3 p0, int vtx, float val, string kind)
                {
                    var sb = new StringBuilder();
                    sb.Append($"{{\"person\":\"{Probe.Person}\",\"state\":\"{_state}\",\"t\":{Time.time:0.000},\"vertex\":{vtx},\"seg\":{(vtx >= 0 ? _seg[vtx] : 0)},\"kind\":\"{kind}\",\"p\":{L(p0)},\"true\":{val * 100f:0.000},\"body\":[");
                    var spacing = (float[])F(_skin, "_spacing");
                    var first = true;
                    for (int i = 0, e = _skin.End(BodySkin.Part.ThighR); i < e; i++)
                    {
                        if ((_skin.P[i] - p0).sqrMagnitude > 0.01f) continue;
                        if (!first) sb.Append(','); first = false;
                        sb.Append($"{{\"i\":{i},\"part\":\"{_skin.PartOf(i)}\",\"p\":{L(_skin.P[i])},\"n\":{D(_skin.N[i])},\"sp\":{(spacing != null && i < spacing.Length ? spacing[i] * 100f : -1f):0.000},\"low\":{(_skin.Low(i) ? 1 : 0)},\"off\":{_skin.Off(i) * 100f:0.000}}}");
                    }
                    sb.Append("],\"arm\":[");
                    first = true;
                    for (var i = from; i < to; i++)
                    {
                        if ((_skin.P[i] - p0).sqrMagnitude > 0.01f) continue;
                        var ins = _skin.Depth(_skin.P[i], out var rd, out _);
                        var tr = True(_skin.P[i]);
                        if (!first) sb.Append(','); first = false;
                        sb.Append($"{{\"i\":{i},\"part\":\"{_skin.PartOf(i)}\",\"p\":{L(_skin.P[i])},\"n\":{D(_skin.N[i])},\"off\":{_skin.Off(i) * 100f:0.000},\"in\":{(ins ? 1 : 0)},\"rd\":{rd * 100f:0.000},\"true\":{tr * 100f:0.000}}}");
                    }
                    sb.Append("],\"verts\":[");
                    first = true;
                    for (var i = 0; i < v.Length; i++)
                    {
                        if (!ArmV(i) || (v[i] - p0).sqrMagnitude > 0.0036f) continue;
                        if (!first) sb.Append(','); first = false;
                        sb.Append($"{{\"i\":{i},\"p\":{L(v[i])},\"true\":{True(v[i]) * 100f:0.000}}}");
                    }
                    sb.Append("],\"tris\":[");
                    first = true;
                    for (var t = 0; t + 2 < _tris.Length; t += 3)
                    {
                        int a = _tris[t], b = _tris[t + 1], c = _tris[t + 2];
                        if ((v[a] - p0).sqrMagnitude > 0.0144f && (v[b] - p0).sqrMagnitude > 0.0144f && (v[c] - p0).sqrMagnitude > 0.0144f) continue;
                        if (!first) sb.Append(','); first = false;
                        sb.Append($"{{\"i\":[{a},{b},{c}],\"v\":[{L(v[a])},{L(v[b])},{L(v[c])}],\"n\":[{D(n[a])},{D(n[b])},{D(n[c])}]}}");
                    }
                    sb.Append("]}");
                    return sb.ToString();
                }
            }

            private static bool Hit(Vector3 o, Vector3 d, Vector3 a, Vector3 b, Vector3 c, float max)
            {
                var e1 = b - a; var e2 = c - a; var q = Vector3.Cross(d, e2); var det = Vector3.Dot(e1, q);
                if (Mathf.Abs(det) < 1e-10f) return false;
                var f = 1f / det; var sv = o - a; var u = f * Vector3.Dot(sv, q);
                if (u < 0f || u > 1f) return false;
                var r = Vector3.Cross(sv, e1); var w = f * Vector3.Dot(d, r);
                if (w < 0f || u + w > 1f) return false;
                var t = f * Vector3.Dot(e2, r);
                return t > 0f && t < max;
            }
        }

        public sealed class Watcher : MonoBehaviour
        {
            // SOLE_MIRROR="<id>:R" (or :L): that person's foot plant holds the named foot by the other foot's sole points, mirrored
            // across the foot's own side-to-side axis (z), for an A/B of the sole points' choice
            private static readonly string Mirror = System.Environment.GetEnvironmentVariable("SOLE_MIRROR") ?? "";
            private void Update()
            {
                foreach (var p in Object.FindObjectsByType<MotionProbe>(FindObjectsSortMode.None))
                {
                    if (p.GetComponent<Truth>() != null) continue;
                    p.gameObject.AddComponent<Truth>().Probe = p;
                    foreach (var m in Mirror.Split(','))
                    {
                        var kv = m.Split(':');
                        if (kv.Length != 2 || p.Person == null || !p.Person.StartsWith(kv[0])) continue;
                        var fp = p.GetComponent<FootPlant>();
                        if (fp == null) continue;
                        var to = kv[1] == "R" ? "R" : "L"; var from = to == "R" ? "L" : "R";
                        var log = new StringBuilder($"SOLE_MIRROR {p.Person}: foot {to} from {from}:");
                        foreach (var f in new[] { "_heel", "_back", "_ball", "_tip" })
                        {
                            var fs = typeof(FootPlant).GetField(f + from, BindingFlags.NonPublic | BindingFlags.Instance);
                            var ft = typeof(FootPlant).GetField(f + to, BindingFlags.NonPublic | BindingFlags.Instance);
                            var src = (Vector3)fs.GetValue(fp); var was = (Vector3)ft.GetValue(fp);
                            var now = new Vector3(src.x, src.y, -src.z);
                            ft.SetValue(fp, now);
                            log.Append($" {f} {was.x:0.0000},{was.y:0.0000},{was.z:0.0000} -> {now.x:0.0000},{now.y:0.0000},{now.z:0.0000};");
                        }
                        Debug.Log(log.ToString());
                    }
                }
            }
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator Probe()
        {
            Directory.CreateDirectory(Out);
            _pairs = new StreamWriter(Path.Combine(Out, "pairs.csv"));
            _pairs.WriteLine("person,state,t,point,part,runtime,true,offArm,offBody,low,bodyPart");
            var w = new GameObject("truth watcher");
            Object.DontDestroyOnLoad(w);
            w.AddComponent<Watcher>();
            _pairs.AutoFlush = true;
            try { yield return new HumanMotionGateTests().PickedPeopleStandAndMove(); }
            finally
            {
                foreach (var t in Object.FindObjectsByType<Truth>(FindObjectsSortMode.None)) Object.DestroyImmediate(t);
                Object.Destroy(w);
                _pairs.Flush(); _pairs.Close(); _pairs = null;
            }
        }
    }
}
