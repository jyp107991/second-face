using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>
    /// A river's course and water level (step 22). The course is the layout's polyline (points ~300 m apart) drawn as a
    /// Catmull-Rom curve every <see cref="Piece"/> m and swung a little sideways by slow noise (up to ~<see cref="Wiggle"/>
    /// m), so the banks bend instead of running ruled between the points; its width breathes by ±~20 % over a few hundred
    /// metres and narrows to a stream over the first <see cref="SourceTaper"/> m. The level is sampled every
    /// <see cref="Station"/> m from the natural ground under the course, <see cref="Below"/> m down, never rising on the way
    /// to the sea (a running minimum from the source), softened over <see cref="Soften"/> m only where that lowers it (so it
    /// never stands above the ground it was read from), and never below the sea. <see cref="TerrainGen"/> cuts the bed under
    /// this level and <see cref="WorldWater"/> lays the water on it.
    /// </summary>
    public sealed class RiverProfile
    {
        public const float Station = 10f, Below = 1.5f, Soften = 150f;
        public const float Piece = 20f, Wiggle = 22f, SourceTaper = 900f;
        /// <summary>The widest the river gets against its layout width.</summary>
        public const float MaxWidening = 1.25f;

        public readonly string Id;
        /// <summary>The layout's half-width (the mean).</summary>
        public readonly float Half;
        public readonly float Length;
        private readonly float[] _xs, _zs, _s;   // the course and the arc length at each point
        private readonly float[] _level;          // per station
        private readonly int _seed;
        public readonly float MinX, MaxX, MinZ, MaxZ;

        public RiverProfile(WayInfo way, Func<float, float, float> natural, float sea, int seed = 1909)
        {
            Id = way.Id; Half = way.Width / 2; _seed = seed;
            var (xs, zs) = Course(way, seed);
            var n = xs.Count;
            _xs = xs.ToArray(); _zs = zs.ToArray(); _s = new float[n];
            MinX = MinZ = float.MaxValue; MaxX = MaxZ = float.MinValue;
            for (var i = 0; i < n; i++)
            {
                if (i > 0) _s[i] = _s[i - 1] + (float)Math.Sqrt(Sq(_xs[i] - _xs[i - 1]) + Sq(_zs[i] - _zs[i - 1]));
                MinX = Math.Min(MinX, _xs[i]); MaxX = Math.Max(MaxX, _xs[i]);
                MinZ = Math.Min(MinZ, _zs[i]); MaxZ = Math.Max(MaxZ, _zs[i]);
            }
            Length = _s[n - 1];
            var count = (int)Math.Ceiling(Length / Station) + 1;
            var mono = new float[count];
            for (var k = 0; k < count; k++)
            {
                var (x, z) = PointAt(k * Station);
                mono[k] = natural(x, z) - Below;
                if (k > 0) mono[k] = Math.Min(mono[k], mono[k - 1]);
            }
            // the mean of a falling sequence falls too, and so does the lesser of two falling sequences
            var r = (int)(Soften / Station);
            _level = new float[count];
            for (var k = 0; k < count; k++)
            {
                float sum = 0; var m = 0;
                for (var q = Math.Max(0, k - r); q <= Math.Min(count - 1, k + r); q++) { sum += mono[q]; m++; }
                _level[k] = Math.Max(sea, Math.Min(mono[k], sum / m));
            }
        }

        /// <summary>The course: the polyline as a Catmull-Rom curve through its points, every ~<see cref="Piece"/> m, then
        /// pushed along its normal by slow noise (none at the ends).</summary>
        private static (List<float> xs, List<float> zs) Course(WayInfo way, int seed)
        {
            var p = way.Points;
            var n = p.Count;
            var xs = new List<float>(); var zs = new List<float>();
            (float x, float z) P(int i) { i = Math.Clamp(i, 0, n - 1); return (p[i][0], p[i][1]); }
            for (var i = 0; i + 1 < n; i++)
            {
                var (x0, z0) = P(i - 1); var (x1, z1) = P(i); var (x2, z2) = P(i + 1); var (x3, z3) = P(i + 2);
                var len = (float)Math.Sqrt(Sq(x2 - x1) + Sq(z2 - z1));
                var k = Math.Max(1, (int)Math.Ceiling(len / Piece));
                for (var q = 0; q < k; q++)
                {
                    var t = (float)q / k;
                    xs.Add(CatmullRom(x0, x1, x2, x3, t)); zs.Add(CatmullRom(z0, z1, z2, z3, t));
                }
            }
            xs.Add(p[n - 1][0]); zs.Add(p[n - 1][1]);
            // the swing: arc length first, then each point moves along the local normal
            var m = xs.Count;
            var s = new float[m];
            for (var i = 1; i < m; i++) s[i] = s[i - 1] + (float)Math.Sqrt(Sq(xs[i] - xs[i - 1]) + Sq(zs[i] - zs[i - 1]));
            var total = s[m - 1];
            var ox = new float[m]; var oz = new float[m];
            for (var i = 0; i < m; i++)
            {
                int a = Math.Max(0, i - 1), b = Math.Min(m - 1, i + 1);
                float tx = xs[b] - xs[a], tz = zs[b] - zs[a], tl = (float)Math.Sqrt(tx * tx + tz * tz);
                if (tl == 0) continue;
                var ends = Smooth(s[i] / 400f) * Smooth((total - s[i]) / 400f);
                var off = Wiggle * 1.4f * Noise.Fbm(s[i] / 380f, 0.5f, seed + 41, 2) * ends;
                ox[i] = -tz / tl * off; oz[i] = tx / tl * off;
            }
            for (var i = 0; i < m; i++) { xs[i] += ox[i]; zs[i] += oz[i]; }
            return (xs, zs);
        }

        private static float CatmullRom(float p0, float p1, float p2, float p3, float t) =>
            0.5f * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

        /// <summary>The half-width at an arc length: breathing round the layout's, a stream at the source.</summary>
        public float HalfAt(float s)
        {
            var breathe = 1f + Math.Clamp(0.3f * Noise.Fbm(s / 320f, 3.5f, _seed + 43, 2), -0.2f, MaxWidening - 1f);
            return Half * breathe * (0.18f + 0.82f * Smooth(s / SourceTaper));
        }

        /// <summary>The point at an arc length along the course (clamped to its ends).</summary>
        public (float x, float z) PointAt(float s)
        {
            s = Math.Clamp(s, 0, Length);
            var i = Array.BinarySearch(_s, s);
            if (i < 0) i = ~i - 1;
            i = Math.Clamp(i, 0, _s.Length - 2);
            var len = _s[i + 1] - _s[i];
            var t = len > 0 ? (s - _s[i]) / len : 0;
            return (_xs[i] + (_xs[i + 1] - _xs[i]) * t, _zs[i] + (_zs[i + 1] - _zs[i]) * t);
        }

        /// <summary>The water's level at an arc length, metres above the sea (linear between stations).</summary>
        public float LevelAt(float s)
        {
            var f = Math.Clamp(s, 0, Length) / Station;
            var k = Math.Min((int)f, _level.Length - 2);
            if (k < 0) return _level[0];
            return _level[k] + (_level[k + 1] - _level[k]) * (f - k);
        }

        public int SegmentCount => _s.Length - 1;
        /// <summary>The arc length where segment <paramref name="i"/> starts.</summary>
        public float SegmentStart(int i) => _s[i];
        public (float ax, float az, float bx, float bz) SegmentEnds(int i) => (_xs[i], _zs[i], _xs[i + 1], _zs[i + 1]);

        /// <summary>The segments that come within <paramref name="reach"/> m of a square.</summary>
        public int[] SegmentsNear(float x0, float z0, float size, float reach)
        {
            var list = new List<int>();
            for (var i = 0; i + 1 < _xs.Length; i++)
            {
                float ax = _xs[i], az = _zs[i], bx = _xs[i + 1], bz = _zs[i + 1];
                if (Math.Max(ax, bx) + reach < x0 || Math.Min(ax, bx) - reach > x0 + size || Math.Max(az, bz) + reach < z0 || Math.Min(az, bz) - reach > z0 + size) continue;
                list.Add(i);
            }
            return list.ToArray();
        }

        /// <summary>The nearest point of the course (over the given segments, or all): distance, arc length there, and the
        /// downstream direction.</summary>
        public (float d, float s, float dx, float dz) Nearest(float x, float z, int[] segments = null)
        {
            float best = float.MaxValue, bs = 0, bdx = 1, bdz = 0;
            var count = segments?.Length ?? _xs.Length - 1;
            for (var q = 0; q < count; q++)
            {
                var i = segments?[q] ?? q;
                float vx = _xs[i + 1] - _xs[i], vz = _zs[i + 1] - _zs[i], l2 = vx * vx + vz * vz;
                var t = l2 == 0 ? 0 : Math.Clamp(((x - _xs[i]) * vx + (z - _zs[i]) * vz) / l2, 0f, 1f);
                float px = _xs[i] + t * vx - x, pz = _zs[i] + t * vz - z;
                var d2 = px * px + pz * pz;
                if (d2 >= best) continue;
                best = d2;
                var len = (float)Math.Sqrt(l2);
                bs = _s[i] + t * len;
                if (len > 0) { bdx = vx / len; bdz = vz / len; }
            }
            return ((float)Math.Sqrt(best), bs, bdx, bdz);
        }

        /// <summary>Whether a square comes within <paramref name="reach"/> m of the course's bounds.</summary>
        public bool Near(float x0, float z0, float size, float reach) =>
            !(MaxX + reach < x0 || MinX - reach > x0 + size || MaxZ + reach < z0 || MinZ - reach > z0 + size);

        private static float Sq(float v) => v * v;
        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }

    /// <summary>
    /// The world's open water per chunk (BUILD_PLAN §6.J, step 22): the sea at <see cref="WorldLayout.SeaLevel"/> wherever
    /// the ground lies under it, and the rivers at their <see cref="RiverProfile"/> level within <see cref="Corridor"/> m of
    /// their banks. A flat sheet on a 4 m grid laid over every cell some corner of which is under water: the terrain hides
    /// the sheet where it rises above it, so the shoreline is the ground's own, and each vertex carries its depth (the
    /// shader's colour, clarity and foam) and the flow (the ripples' drift: down the river, a slow drift at sea). Deep open
    /// sea is laid in 32 m quads (a sea chunk is a few hundred triangles, not 32 K). Pure: it runs on the chunk's worker.
    /// </summary>
    public sealed class WorldWater
    {
        public const float Cell = 4f;
        public const int Cells = (int)(WorldGrid.Chunk / Cell), Verts = Cells + 1;
        /// <summary>River water is looked for this far beyond a river's half-width (its shore lies ~1 m beyond it).</summary>
        public const float Corridor = 40f;
        /// <summary>Cells merge into one quad in blocks this many cells wide where all of it is open sea this deep.</summary>
        public const int Block = 8;
        public const float DeepEnough = 4f;
        /// <summary>A cell whose corners' levels differ more than this is not laid (a river meeting the sea's level over a
        /// bank: no sheet stands on edge between them).</summary>
        public const float MaxStep = 0.75f;
        public const float RiverSpeed = 0.9f;
        public static readonly (float x, float z) SeaDrift = (0.12f, 0.05f);

        /// <summary>A chunk's water sheet: chunk-local positions (y metres above the sea), per vertex the depth of water
        /// under it (negative on a shore corner) and the flow (x, z in m/s), triangles.</summary>
        public sealed class Sheet
        {
            public readonly List<float> Positions = new(), Depths = new(), Flows = new();
            public readonly List<int> Triangles = new();
            public int VertexCount => Depths.Count;
        }

        private readonly TerrainGen _gen;
        private readonly float _sea;

        public WorldWater(TerrainGen gen, WorldLayout layout)
        {
            _gen = gen; _sea = layout.SeaLevel;
        }

        /// <summary>The water's level at a world point (the higher of the sea and a river within its corridor), whether a
        /// river sets it, and the flow there.</summary>
        public (float level, bool river, float fx, float fz) LevelAt(float x, float z) => Near(x - 1, z - 1, 2).Level(x, z);

        /// <summary>Water levels over a square, for many queries (the river segments near it picked once).</summary>
        public Probe Near(float x0, float z0, float size)
        {
            var rivers = new List<(RiverProfile, int[])>();
            foreach (var r in _gen.Rivers)
            {
                var reach = r.Half * RiverProfile.MaxWidening + Corridor;
                if (!r.Near(x0, z0, size, reach)) continue;
                var segs = r.SegmentsNear(x0, z0, size, reach);
                if (segs.Length > 0) rivers.Add((r, segs));
            }
            return new Probe(_sea, rivers);
        }

        public sealed class Probe
        {
            private readonly float _sea;
            private readonly List<(RiverProfile river, int[] segs)> _rivers;
            internal Probe(float sea, List<(RiverProfile, int[])> rivers) { _sea = sea; _rivers = rivers; }

            /// <summary>Whether any river is near the probe's square (else the level is the sea's everywhere).</summary>
            public bool Rivers => _rivers.Count > 0;

            public (float level, bool river, float fx, float fz) Level(float x, float z)
            {
                float level = _sea, fx = SeaDrift.x, fz = SeaDrift.z;
                var river = false;
                foreach (var (r, segs) in _rivers)
                {
                    var (d, s, dx, dz) = r.Nearest(x, z, segs);
                    if (d > r.HalfAt(s) + Corridor) continue;
                    var l = r.LevelAt(s);
                    if (l < level + 0.05f) continue;
                    level = l; river = true; fx = dx * RiverSpeed; fz = dz * RiverSpeed;
                }
                return (level, river, fx, fz);
            }
        }

        /// <summary>The chunk's water on its heights (<see cref="TerrainGen.Heights"/>), or null when it has none.</summary>
        public Sheet Build(int cx, int cz, float[] heights)
        {
            const int n = TerrainGen.Resolution, stride = (int)(Cell / TerrainGen.Step);
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var probe = Near(x0, z0, WorldGrid.Chunk);
            // per vertex: level, depth, flow, whether a river sets it
            var level = new float[Verts * Verts];
            var depth = new float[Verts * Verts];
            var flow = new float[Verts * Verts * 2];
            var byRiver = new bool[Verts * Verts];
            var any = false;
            for (var j = 0; j < Verts; j++)
                for (var i = 0; i < Verts; i++)
                {
                    var k = j * Verts + i;
                    var (l, river, fx, fz) = probe.Level(x0 + i * Cell, z0 + j * Cell);
                    level[k] = l; byRiver[k] = river; flow[k * 2] = fx; flow[k * 2 + 1] = fz;
                    depth[k] = l - heights[(j * stride) * n + i * stride];
                    any |= depth[k] > 0;
                }
            if (!any) return null;
            var sheet = new Sheet();
            var index = new int[Verts * Verts];
            Array.Fill(index, -1);
            int Vertex(int i, int j)
            {
                var k = j * Verts + i;
                if (index[k] >= 0) return index[k];
                index[k] = sheet.VertexCount;
                sheet.Positions.Add(i * Cell); sheet.Positions.Add(level[k]); sheet.Positions.Add(j * Cell);
                sheet.Depths.Add(depth[k]);
                sheet.Flows.Add(flow[k * 2]); sheet.Flows.Add(flow[k * 2 + 1]);
                return index[k];
            }
            // clockwise seen from above (x east, z north): Unity's front face
            void Quad(int i0, int j0, int i1, int j1)
            {
                int a = Vertex(i0, j0), b = Vertex(i0, j1), c = Vertex(i1, j1), d = Vertex(i1, j0);
                sheet.Triangles.Add(a); sheet.Triangles.Add(b); sheet.Triangles.Add(c);
                sheet.Triangles.Add(a); sheet.Triangles.Add(c); sheet.Triangles.Add(d);
            }
            for (var bj = 0; bj < Cells; bj += Block)
                for (var bi = 0; bi < Cells; bi += Block)
                {
                    var open = true;
                    for (var j = bj; j <= bj + Block && open; j++)
                        for (var i = bi; i <= bi + Block && open; i++)
                        {
                            var k = j * Verts + i;
                            open = !byRiver[k] && depth[k] > DeepEnough;
                        }
                    if (open) { Quad(bi, bj, bi + Block, bj + Block); continue; }
                    for (var j = bj; j < bj + Block; j++)
                        for (var i = bi; i < bi + Block; i++)
                        {
                            int k00 = j * Verts + i, k10 = k00 + 1, k01 = k00 + Verts, k11 = k01 + 1;
                            if (depth[k00] <= 0 && depth[k10] <= 0 && depth[k01] <= 0 && depth[k11] <= 0) continue;
                            var lo = Math.Min(Math.Min(level[k00], level[k10]), Math.Min(level[k01], level[k11]));
                            var hi = Math.Max(Math.Max(level[k00], level[k10]), Math.Max(level[k01], level[k11]));
                            if (hi - lo > MaxStep) continue;
                            Quad(i, j, i + 1, j + 1);
                        }
                }
            return sheet.Triangles.Count > 0 ? sheet : null;
        }
    }
}
