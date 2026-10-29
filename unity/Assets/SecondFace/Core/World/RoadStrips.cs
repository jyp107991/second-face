using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The surfaces of the roads, tracks and the Line (BUILD_PLAN §6.A.3, step 17b): strip meshes laid on the chunk's
    /// levelled ground, one mesh per surface per chunk. Each way's polyline is cut into ≤ 2 m pieces from its start (so
    /// every chunk cuts it the same way); a piece belongs to the chunk holding its midpoint, so neighbouring chunks share
    /// the vertices where a strip crosses their edge and nothing is drawn twice. Across the strip four vertices: the outer
    /// edges at alpha 0, the inner at 1 (the shader breaks the edge with the texture's height). U runs across in metres,
    /// V along in metres from the way's start, so ruts and cracks follow the road. Pure: it runs on the chunk's worker.
    /// </summary>
    public sealed class RoadStrips
    {
        /// <summary>A way's surface by its kind: roads are old asphalt, the Line is ballast, marsh tracks are mud, the
        /// rest (tracks, rough, mountain, glass) are stony trails.</summary>
        public static string SurfaceOf(string kind) => kind switch
        {
            "road" => "asphalt",
            "rail" => "gravel",
            "marsh" => "mud",
            _ => "trail",
        };

        public const float PieceLength = 2f, Lift = 0.05f;
        /// <summary>V is counted from a multiple of this inside each chunk (every surface's tile length divides it), so a
        /// road 15 km long keeps its texture precise and still meets itself across a chunk edge.</summary>
        public const float VPeriod = 240f;

        /// <summary>One surface's mesh in a chunk: positions (x, y, z in chunk-local metres), uv (u, v in metres), alpha,
        /// triangles.</summary>
        public sealed class Strip
        {
            public string Surface;
            public readonly List<float> Positions = new(), Uvs = new(), Alphas = new();
            public readonly List<int> Triangles = new();
            public int VertexCount => Alphas.Count;
        }

        private sealed class Way
        {
            public string Surface;
            public float Half, Fade;
            public float[] Xs, Zs, S;   // the polyline and the arc length at each point
            public float MinX, MaxX, MinZ, MaxZ;
        }

        private readonly List<Way> _ways = new();

        public RoadStrips(WorldLayout layout)
        {
            void Add(WayInfo w)
            {
                if (w.Points.Count < 2) return;
                var way = new Way { Surface = SurfaceOf(w.Kind), Half = w.Width / 2, Fade = Math.Clamp(w.Width * 0.2f, 0.8f, 2f) };
                var n = w.Points.Count;
                way.Xs = new float[n]; way.Zs = new float[n]; way.S = new float[n];
                way.MinX = way.MinZ = float.MaxValue; way.MaxX = way.MaxZ = float.MinValue;
                for (var i = 0; i < n; i++)
                {
                    way.Xs[i] = w.Points[i][0]; way.Zs[i] = w.Points[i][1];
                    if (i > 0) way.S[i] = way.S[i - 1] + (float)Math.Sqrt(Sq(way.Xs[i] - way.Xs[i - 1]) + Sq(way.Zs[i] - way.Zs[i - 1]));
                    way.MinX = Math.Min(way.MinX, way.Xs[i]); way.MaxX = Math.Max(way.MaxX, way.Xs[i]);
                    way.MinZ = Math.Min(way.MinZ, way.Zs[i]); way.MaxZ = Math.Max(way.MaxZ, way.Zs[i]);
                }
                _ways.Add(way);
            }
            foreach (var w in layout.Roads) Add(w);
            foreach (var w in layout.Rails) Add(w);
        }

        /// <summary>The strips of a chunk, one per surface present, laid on its heights (<see cref="TerrainGen.Heights"/>).</summary>
        public List<Strip> Build(int cx, int cz, float[] heights)
        {
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var strips = new Dictionary<string, Strip>();
            foreach (var way in _ways)
            {
                var reach = way.Half + way.Fade + PieceLength;
                if (way.MaxX + reach < x0 || way.MinX - reach > x0 + WorldGrid.Chunk || way.MaxZ + reach < z0 || way.MinZ - reach > z0 + WorldGrid.Chunk) continue;
                if (!strips.TryGetValue(way.Surface, out var strip)) strips[way.Surface] = strip = new Strip { Surface = way.Surface };
                Lay(way, x0, z0, heights, strip);
            }
            var list = new List<Strip>();
            foreach (var s in strips.Values) if (s.Triangles.Count > 0) list.Add(s);
            list.Sort((a, b) => string.CompareOrdinal(a.Surface, b.Surface));
            return list;
        }

        private static void Lay(Way way, float x0, float z0, float[] heights, Strip strip)
        {
            var n = way.Xs.Length;
            int prev = -1;   // the index of the last cross-section emitted (its four vertices), or -1
            var vBase = float.NaN;
            for (var i = 0; i + 1 < n; i++)
            {
                float ax = way.Xs[i], az = way.Zs[i], bx = way.Xs[i + 1], bz = way.Zs[i + 1];
                var len = way.S[i + 1] - way.S[i];
                if (len <= 0) continue;
                var pieces = Math.Max(1, (int)Math.Ceiling(len / PieceLength));
                // a segment far from the chunk is skipped whole
                var reach = way.Half + way.Fade + len;
                if (Math.Max(ax, bx) + reach < x0 || Math.Min(ax, bx) - reach > x0 + WorldGrid.Chunk || Math.Max(az, bz) + reach < z0 || Math.Min(az, bz) - reach > z0 + WorldGrid.Chunk) { prev = -1; continue; }
                for (var k = 0; k < pieces; k++)
                {
                    float t0 = (float)k / pieces, t1 = (float)(k + 1) / pieces;
                    float mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
                    if (mx < x0 || mx >= x0 + WorldGrid.Chunk || mz < z0 || mz >= z0 + WorldGrid.Chunk) { prev = -1; continue; }
                    if (float.IsNaN(vBase)) vBase = (float)Math.Floor((way.S[i] + len * t0) / VPeriod) * VPeriod;
                    if (prev < 0) prev = Section(way, i, t0, x0, z0, vBase, heights, strip);
                    var next = Section(way, i, t1, x0, z0, vBase, heights, strip);
                    for (var e = 0; e < 3; e++)
                    {
                        int a = prev + e, b = prev + e + 1, c = next + e, d = next + e + 1;
                        // clockwise seen from above: Unity's front face (the first version wound them the other way and
                        // every strip was culled)
                        strip.Triangles.Add(a); strip.Triangles.Add(b); strip.Triangles.Add(c);
                        strip.Triangles.Add(b); strip.Triangles.Add(d); strip.Triangles.Add(c);
                    }
                    prev = next;
                }
            }
        }

        /// <summary>Emits the four vertices across the way at parameter t of segment i; returns the first's index.</summary>
        private static int Section(Way way, int i, float t, float x0, float z0, float vBase, float[] heights, Strip strip)
        {
            float ax = way.Xs[i], az = way.Zs[i], bx = way.Xs[i + 1], bz = way.Zs[i + 1];
            float px = ax + (bx - ax) * t, pz = az + (bz - az) * t, s = way.S[i] + (way.S[i + 1] - way.S[i]) * t;
            // the direction: the segment's own, or at a polyline vertex the mean of the two segments meeting there
            float dx = bx - ax, dz = bz - az;
            if (t <= 0f && i > 0) { dx = dx / Len(dx, dz) + (ax - way.Xs[i - 1]) / Len(ax - way.Xs[i - 1], az - way.Zs[i - 1]); dz = dz / Len(bx - ax, bz - az) + (az - way.Zs[i - 1]) / Len(ax - way.Xs[i - 1], az - way.Zs[i - 1]); }
            if (t >= 1f && i + 2 < way.Xs.Length) { var nx = way.Xs[i + 2] - bx; var nz = way.Zs[i + 2] - bz; var l0 = Len(dx, dz); var l1 = Len(nx, nz); dx = dx / l0 + nx / l1; dz = dz / l0 + nz / l1; }
            var l = Len(dx, dz);
            float lx = -dz / l, lz = dx / l;   // to the left of the way
            var first = strip.VertexCount;
            var outer = way.Half + way.Fade / 2; var inner = Math.Max(0.2f, way.Half - way.Fade / 2);
            foreach (var (off, alpha) in new[] { (-outer, 0f), (-inner, 1f), (inner, 1f), (outer, 0f) })
            {
                float x = px + lx * off, z = pz + lz * off;
                strip.Positions.Add(x - x0);
                strip.Positions.Add(HeightAt(heights, x - x0, z - z0) + Lift);
                strip.Positions.Add(z - z0);
                strip.Uvs.Add(off); strip.Uvs.Add(s - vBase);
                strip.Alphas.Add(alpha);
            }
            return first;
        }

        /// <summary>The chunk's ground at a chunk-local point, bilinear, clamped to the chunk.</summary>
        public static float HeightAt(float[] heights, float lx, float lz)
        {
            const int n = TerrainGen.Resolution;
            float fx = Math.Clamp(lx / TerrainGen.Step, 0, n - 1.001f), fz = Math.Clamp(lz / TerrainGen.Step, 0, n - 1.001f);
            int i = (int)fx, j = (int)fz;
            float tx = fx - i, tz = fz - j;
            return (heights[j * n + i] * (1 - tx) + heights[j * n + i + 1] * tx) * (1 - tz) + (heights[(j + 1) * n + i] * (1 - tx) + heights[(j + 1) * n + i + 1] * tx) * tz;
        }

        private static float Len(float x, float z) => Math.Max(1e-5f, (float)Math.Sqrt(x * x + z * z));
        private static float Sq(float v) => v * v;
    }
}
