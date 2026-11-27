using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace SecondFace.Tests
{
    /// <summary>
    /// The motion gate's C1 depth (<see cref="MotionProbe.DrawnDepth"/>, 2026-11-18): known penetrations under a drawn surface,
    /// on a convex patch with vertices about 8 cm apart (a sphere of 15 cm drawn as 80 flat faces, as coarse as a Rocketbox hip)
    /// and on a flat one, each read within 0.05 cm. The three nearest vertices' planes, the reading before, put a point lying
    /// on the convex patch's face 0.3-0.7 cm "inside" (docs/MOTION_ROOT_CAUSE.md §7).
    /// </summary>
    public class MotionProbeDepthTests
    {
        private static readonly float[] Depths = { 0f, 0.003f, 0.005f, 0.01f, 0.02f };

        [Test]
        public void TheDrawnSurfaceDepthReadsKnownPenetrationsOnAConvexPatch()
        {
            var (v, t) = Icosphere(0.15f, 1);
            var worstOld = 0f;
            for (var f = 0; f < t.Length; f += 3 * 7)   // every seventh face
            {
                Vector3 a = v[t[f]], b = v[t[f + 1]], c = v[t[f + 2]];
                var n = Vector3.Cross(b - a, c - a).normalized;
                if (Vector3.Dot(n, a) < 0f) n = -n;   // outward
                var centre = (a + b + c) / 3f;
                foreach (var d in Depths)
                {
                    var p = centre - n * d;
                    var got = MotionProbe.DrawnDepth(p, v, t, null, null, 0.2f);
                    Assert.That(got, Is.EqualTo(d).Within(0.0005f), $"face {f / 3}: {d * 100f:0.0} cm under the drawn surface read {got * 100f:0.00} cm");
                    if (d > 0f) Assert.That(MotionProbe.Inside(p, p, v, t), Is.True, $"face {f / 3}: {d * 100f:0.0} cm under is inside");
                    worstOld = Mathf.Max(worstOld, OldReading(p, v) - d);
                }
            }
            // (what the vertices' planes made of the same points: the over-read this measure removes)
            TestContext.WriteLine($"the three nearest vertices' planes over-read by up to {worstOld * 100f:0.00} cm");
            Assert.That(worstOld, Is.GreaterThan(0.002f), "the convex patch is coarse enough to show the planes' over-read");
        }

        [Test]
        public void TheDrawnSurfaceDepthReadsKnownPenetrationsOnAFlatPatch()
        {
            // a closed slab 40 x 40 x 10 cm, its top at y = 0.05
            var v = new List<Vector3>();
            for (var i = 0; i < 8; i++) v.Add(new Vector3((i & 1) == 0 ? -0.2f : 0.2f, (i & 2) == 0 ? -0.05f : 0.05f, (i & 4) == 0 ? -0.2f : 0.2f));
            int[] t =
            {
                2, 3, 7, 2, 7, 6,   // top
                0, 5, 1, 0, 4, 5,   // bottom
                0, 2, 6, 0, 6, 4,   // -x
                1, 7, 3, 1, 5, 7,   // +x
                0, 3, 2, 0, 1, 3,   // -z
                4, 6, 7, 4, 7, 5,   // +z
            };
            var verts = v.ToArray();
            foreach (var x in new[] { -0.07f, 0.03f, 0.11f })
                foreach (var d in Depths)
                {
                    var p = new Vector3(x, 0.05f - d, 0.04f);
                    var got = MotionProbe.DrawnDepth(p, verts, t, null, null, 0.2f);
                    Assert.That(got, Is.EqualTo(d).Within(0.0005f), $"{d * 100f:0.0} cm under the flat top read {got * 100f:0.00} cm");
                    if (d > 0f) Assert.That(MotionProbe.Inside(p, Vector3.right, verts, t), Is.True, $"{d * 100f:0.0} cm under is inside");
                }
        }

        /// <summary>The gate's reading before: the least of the three nearest vertices' planes (their normals the sphere's).</summary>
        private static float OldReading(Vector3 p, Vector3[] v)
        {
            var near = new List<int>();
            for (var i = 0; i < v.Length; i++) near.Add(i);
            near.Sort((x, y) => (v[x] - p).sqrMagnitude.CompareTo((v[y] - p).sqrMagnitude));
            var depth = float.MaxValue;
            for (var k = 0; k < 3; k++) depth = Mathf.Min(depth, -Vector3.Dot(p - v[near[k]], v[near[k]].normalized));
            return depth;
        }

        private static (Vector3[] V, int[] T) Icosphere(float r, int subdivisions)
        {
            var g = (1f + Mathf.Sqrt(5f)) / 2f;
            var v = new List<Vector3>
            {
                new(-1, g, 0), new(1, g, 0), new(-1, -g, 0), new(1, -g, 0), new(0, -1, g), new(0, 1, g),
                new(0, -1, -g), new(0, 1, -g), new(g, 0, -1), new(g, 0, 1), new(-g, 0, -1), new(-g, 0, 1),
            };
            for (var i = 0; i < v.Count; i++) v[i] = v[i].normalized * r;
            var t = new List<int>
            {
                0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
                3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
            };
            for (var s = 0; s < subdivisions; s++)
            {
                var mid = new Dictionary<long, int>();
                int Mid(int a, int b)
                {
                    var key = a < b ? ((long)a << 32) | (uint)b : ((long)b << 32) | (uint)a;
                    if (mid.TryGetValue(key, out var m)) return m;
                    v.Add(((v[a] + v[b]) * 0.5f).normalized * r);
                    return mid[key] = v.Count - 1;
                }
                var next = new List<int>();
                for (var i = 0; i < t.Count; i += 3)
                {
                    int a = t[i], b = t[i + 1], c = t[i + 2], ab = Mid(a, b), bc = Mid(b, c), ca = Mid(c, a);
                    next.AddRange(new[] { a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca });
                }
                t = next;
            }
            return (v.ToArray(), t.ToArray());
        }
    }
}
