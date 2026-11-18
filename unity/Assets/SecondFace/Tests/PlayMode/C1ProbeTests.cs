using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using NUnit.Framework;
using SecondFace.Core.Npc;
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
    // TEMP probe (never committed): where a resting forearm meets the hip or thigh, the gate's reading (the three nearest
    // body vertices' planes), the surface's own (the nearest point on the body's triangles, inside by ray parity) and the
    // runtime's (BodySkin.Depth) at the same place, frame by frame.
    public class C1ProbeTests
    {
        [DefaultExecutionOrder(10001)]
        public sealed class After : MonoBehaviour { public System.Action Do; private void LateUpdate() => Do?.Invoke(); }

        private static IEnumerator Wait(float s) { for (var t = 0f; t < s; t += Time.deltaTime) yield return null; }
        private static object F(object o, string n) => o.GetType().GetField(n, BindingFlags.NonPublic | BindingFlags.Instance).GetValue(o);

        private static Vector3 Closest(Vector3 p, Vector3 a, Vector3 b, Vector3 c)
        {
            var ab = b - a; var ac = c - a; var ap = p - a;
            float d1 = Vector3.Dot(ab, ap), d2 = Vector3.Dot(ac, ap);
            if (d1 <= 0f && d2 <= 0f) return a;
            var bp = p - b; float d3 = Vector3.Dot(ab, bp), d4 = Vector3.Dot(ac, bp);
            if (d3 >= 0f && d4 <= d3) return b;
            var vc = d1 * d4 - d3 * d2;
            if (vc <= 0f && d1 >= 0f && d3 <= 0f) return a + d1 / (d1 - d3) * ab;
            var cp = p - c; float d5 = Vector3.Dot(ab, cp), d6 = Vector3.Dot(ac, cp);
            if (d6 >= 0f && d5 <= d6) return c;
            var vb = d5 * d2 - d1 * d6;
            if (vb <= 0f && d2 >= 0f && d6 <= 0f) return a + d2 / (d2 - d6) * ac;
            var va = d3 * d6 - d5 * d4;
            if (va <= 0f && (d4 - d3) >= 0f && (d5 - d6) >= 0f) return b + (d4 - d3) / ((d4 - d3) + (d5 - d6)) * (c - b);
            var denom = 1f / (va + vb + vc);
            return a + ab * (vb * denom) + ac * (vc * denom);
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

        [UnityTest, Timeout(1800000)]
        public IEnumerator Probe()
        {
#if UNITY_EDITOR
            var cat = AssetDatabase.LoadAssetAtPath<RocketboxCatalog>("Assets/SecondFace/People/Rocketbox/RocketboxCatalog.asset");
            var assets = AssetDatabase.LoadAssetAtPath<WorldAssets>("Assets/SecondFace/World/WorldAssets.asset");
#else
            RocketboxCatalog cat = null; WorldAssets assets = null;
#endif
            yield return BootTests.Clear();
            Time.captureDeltaTime = 1f / 60f;
            var root = new GameObject("c1 probe");
            var flat = GameObject.CreatePrimitive(PrimitiveType.Cube);
            flat.transform.SetParent(root.transform);
            flat.transform.localScale = new Vector3(200f, 1f, 70f); flat.transform.position = new Vector3(0f, -0.5f, 0f);
            var sb = new StringBuilder();
            sb.AppendLine("person,state,t,drawnWorst,nonArmAtWorst,runtimeAtWorstPt,worstPt,worstV,gateC1,gateWorstTri,gateWorstRuntimeAtVertex,gateWorstRuntimeNearestPt,ptToVertexCm,trueC1,trueWorstGate,runtimeMax,runtimeMaxTrue,armPts,bodyPtSpacingNear");
            var ids = (System.Environment.GetEnvironmentVariable("PROBE_PEOPLE") ?? "Business_Male_05,Business_Male_03").Split(',');
            foreach (var id in ids)
            {
                var go = Object.Instantiate(cat.Get(id), Vector3.zero, Quaternion.identity, root.transform);
                var p = RbPeople.Of(id);
                RbDress.Apply(go, RbPeople.DyesFor(p, "gate_" + id, p?.Roles?.FirstOrDefault() ?? "settler", null));
                var a = go.GetComponentInChildren<Animator>();
                var amb = PeopleService.Animate(a, assets.Locomotion, id, p?.Male ?? true);
                a.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                if (amb != null) { amb.MinGap = amb.MaxGap = 1e6f; }
                var probe = a.gameObject.AddComponent<MotionProbe>();
                probe.Person = id;
                Assert.That(probe.Calibrate(), Is.True, probe.Error);
                var seg = (byte[])F(probe, "_seg");
                var smr = (SkinnedMeshRenderer)F(probe, "_smr");
                var hips = (Transform)F(probe, "_hips");
                var skin = a.GetComponent<BodySkin>();
                var baked = new Mesh();
                bool Body(int i) => seg[i] == 1 || seg[i] == 9 || seg[i] == 10;
                bool Arm(int i) => seg[i] >= 5 && seg[i] <= 8;
                var tris = new List<int>();
                { smr.BakeMesh(baked, true); var all = baked.triangles; for (var t = 0; t + 2 < all.Length; t += 3) if (Body(all[t]) && Body(all[t + 1]) && Body(all[t + 2])) { tris.Add(all[t]); tris.Add(all[t + 1]); tris.Add(all[t + 2]); } }
                var nonArm = new List<int>();
                { var all = baked.triangles; bool ArmV(int i) => seg[i] >= 3 && seg[i] <= 8; for (var t = 0; t + 2 < all.Length; t += 3) if (!ArmV(all[t]) && !ArmV(all[t + 1]) && !ArmV(all[t + 2])) { nonArm.Add(all[t]); nonArm.Add(all[t + 1]); nonArm.Add(all[t + 2]); } }
                var bodyIdx = Enumerable.Range(0, seg.Length).Where(Body).ToArray();
                var armIdx = Enumerable.Range(0, seg.Length).Where(Arm).ToArray();
                string state = null; var frame = 0; var t0 = 0f;
                var after = a.gameObject.AddComponent<After>();
                after.Do = () =>
                {
                    if (state == null || (frame++ % 3) != 0) return;
                    smr.BakeMesh(baked, true);
                    var v = baked.vertices; var n = baked.normals;
                    var l2w = Matrix4x4.TRS(smr.transform.position, smr.transform.rotation, Vector3.one);
                    for (var i = 0; i < v.Length; i++) { v[i] = l2w.MultiplyPoint3x4(v[i]); n[i] = smr.transform.rotation * n[i]; }
                    // the arm's box, padded: only body vertices and triangles near it
                    var lo = Vector3.one * 1e9f; var hi = -lo;
                    foreach (var i in armIdx) { lo = Vector3.Min(lo, v[i]); hi = Vector3.Max(hi, v[i]); }
                    var nearB = bodyIdx.Where(j => v[j].x > lo.x - 0.08f && v[j].x < hi.x + 0.08f && v[j].y > lo.y - 0.08f && v[j].y < hi.y + 0.08f && v[j].z > lo.z - 0.08f && v[j].z < hi.z + 0.08f).ToArray();
                    float InsideTrue(Vector3 q, out bool inside)
                    {
                        var best = float.MaxValue;
                        for (var t = 0; t < tris.Count; t += 3)
                        {
                            var c = Closest(q, v[tris[t]], v[tris[t + 1]], v[tris[t + 2]]);
                            var d = (c - q).sqrMagnitude; if (d < best) best = d;
                        }
                        var away = q - hips.position; away.y = 0f; away = away.sqrMagnitude > 1e-6f ? away.normalized : a.transform.right;
                        var votes = 0;
                        foreach (var dir in new[] { away, Quaternion.AngleAxis(90f, Vector3.up) * away, Quaternion.AngleAxis(-90f, Vector3.up) * away })
                        {
                            var cr = 0;
                            for (var t = 0; t < tris.Count; t += 3)
                            {
                                var A = v[tris[t]]; var B = v[tris[t + 1]]; var C = v[tris[t + 2]];
                                if (q.y < Mathf.Min(A.y, Mathf.Min(B.y, C.y)) || q.y > Mathf.Max(A.y, Mathf.Max(B.y, C.y))) continue;
                                if (Hit(q, dir, A, B, C, 0.8f)) cr++;
                            }
                            if ((cr & 1) == 1) votes++;
                        }
                        inside = votes >= 2;
                        return Mathf.Sqrt(best);
                    }
                    // the gate's reading, every arm vertex (the three nearest body vertices' planes)
                    var cands = new List<(int I, float D)>();
                    foreach (var i in armIdx)
                    {
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
                        if (depth > 0f) cands.Add((i, depth));
                    }
                    cands.Sort((x, y) => y.D.CompareTo(x.D));
                    float gateC1 = 0f, gateTri = -1f, rtAtV = -9f, rtNearest = -9f, ptCm = -1f;
                    float trueC1 = 0f, trueGate = 0f;
                    var checkedN = 0;
                    float NonArm(Vector3 q) { var b = float.MaxValue; for (var t = 0; t < nonArm.Count; t += 3) { var c = Closest(q, v[nonArm[t]], v[nonArm[t + 1]], v[nonArm[t + 2]]); b = Mathf.Min(b, (c - q).sqrMagnitude); } return Mathf.Sqrt(b); }
                    var worstV = -1; var worstTri = 0f;
                    foreach (var (i, d) in cands)
                    {
                        if (checkedN++ > 60) break;
                        var tri = InsideTrue(v[i], out var inside);
                        if (!inside) continue;
                        if (tri > worstTri) { worstTri = tri; worstV = i; }
                        if (gateC1 == 0f)
                        {
                            gateC1 = d; gateTri = tri;
                            if (skin != null && skin.Ready)
                            {
                                rtAtV = skin.Depth(v[i], out var dd, out _) ? dd : -9f;
                                int best = -1; var bd = float.MaxValue;
                                for (int k = skin.Begin(BodySkin.Part.UpperArmL), to = skin.End(BodySkin.Part.HandR); k < to; k++) { var e = (skin.P[k] - v[i]).sqrMagnitude; if (e < bd) { bd = e; best = k; } }
                                rtNearest = skin.Depth(skin.P[best], out var d2, out _) ? d2 : -9f; ptCm = Mathf.Sqrt(bd) * 100f;
                            }
                        }
                        if (tri > trueC1) { trueC1 = tri; trueGate = d; }
                    }
                    // the runtime's own deepest arm point, and that point's true depth
                    float rtMax = 0f, rtMaxTrue = 0f; var armPts = 0;
                    if (skin != null && skin.Ready)
                    {
                        var bestK = -1;
                        for (int k = skin.Begin(BodySkin.Part.ForearmL), to = skin.End(BodySkin.Part.HandR); k < to; k++)
                        {
                            armPts++;
                            if (skin.Depth(skin.P[k], out var dk, out _) && dk > rtMax) { rtMax = dk; bestK = k; }
                        }
                        if (bestK >= 0) { var tr = InsideTrue(skin.P[bestK], out var ins); rtMaxTrue = ins ? tr : -tr; }
                    }
                    var nonArmD = worstV >= 0 ? NonArm(v[worstV]) : -1f;
                    float rtW = -9f; var under = "";
                    if (worstV >= 0 && skin != null && skin.Ready)
                    {
                        int best = -1; var bd = float.MaxValue;
                        for (int k = skin.Begin(BodySkin.Part.UpperArmL), to = skin.End(BodySkin.Part.HandR); k < to; k++) { var e = (skin.P[k] - v[worstV]).sqrMagnitude; if (e < bd) { bd = e; best = k; } }
                        rtW = skin.Depth(skin.P[best], out var dw, out _) ? dw : -9f;
                        under = $"pt{best}@{Mathf.Sqrt(bd) * 100f:0.0}cm near{skin.Near}";
                    }
                    sb.AppendLine(string.Join(",", new object[] { id, state, (Time.time - t0).ToString("0.00"), (worstTri * 100f).ToString("0.00"), (nonArmD * 100f).ToString("0.00"), (rtW * 100f).ToString("0.00"), under, worstV, (gateC1 * 100f).ToString("0.00"), (gateTri * 100f).ToString("0.00"),
                        (rtAtV * 100f).ToString("0.00"), (rtNearest * 100f).ToString("0.00"), ptCm.ToString("0.0"), (trueC1 * 100f).ToString("0.00"), (trueGate * 100f).ToString("0.00"),
                        (rtMax * 100f).ToString("0.00"), (rtMaxTrue * 100f).ToString("0.00"), armPts, "" }));
                };
                for (var idle = 0; idle < 1; idle++)
                {
                    a.SetFloat("Idle", Mathf.Min(idle, Ambient.IdlesOf(a) - 1));
                    yield return Wait(1.2f);
                    state = "idle" + idle; t0 = Time.time;
                    yield return Wait(6.5f);
                    state = null;
                }
                Object.Destroy(go);
                yield return null;
            }
            File.WriteAllText(Path.Combine(Application.dataPath, "../test-results/c1_probe.csv"), sb.ToString());
            Object.Destroy(root);
        }
    }
}
