using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>Deterministic 2D gradient noise (improved Perlin over a seeded permutation) and its sums.</summary>
    public static class Noise
    {
        private static readonly Dictionary<int, int[]> Perms = new();

        private static int[] Perm(int seed)
        {
            lock (Perms)
            {
                if (Perms.TryGetValue(seed, out var p)) return p;
                var r = new Random(seed);
                var a = new int[256];
                for (var i = 0; i < 256; i++) a[i] = i;
                for (var i = 255; i > 0; i--) { var j = r.Next(i + 1); (a[i], a[j]) = (a[j], a[i]); }
                p = new int[512];
                for (var i = 0; i < 512; i++) p[i] = a[i & 255];
                Perms[seed] = p;
                return p;
            }
        }

        private static float Fade(float t) => t * t * t * (t * (t * 6 - 15) + 10);

        private static float Grad(int h, float x, float y)
        {
            switch (h & 7)
            {
                case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
                case 4: return x; case 5: return -x; case 6: return y; default: return -y;
            }
        }

        /// <summary>Gradient noise in about −1..1.</summary>
        public static float Perlin(float x, float y, int seed)
        {
            var p = Perm(seed);
            int xi = (int)Math.Floor(x), yi = (int)Math.Floor(y);
            float xf = x - xi, yf = y - yi;
            int X = xi & 255, Y = yi & 255;
            float u = Fade(xf), v = Fade(yf);
            int aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
            float x1 = Grad(aa, xf, yf) + u * (Grad(ba, xf - 1, yf) - Grad(aa, xf, yf));
            float x2 = Grad(ab, xf, yf - 1) + u * (Grad(bb, xf - 1, yf - 1) - Grad(ab, xf, yf - 1));
            return x1 + v * (x2 - x1);
        }

        /// <summary>Fractal sum normalised to about −1..1.</summary>
        public static float Fbm(float x, float y, int seed, int octaves, float lacunarity = 2f, float gain = 0.5f)
        {
            float sum = 0, amp = 1, norm = 0, f = 1;
            for (var i = 0; i < octaves; i++) { sum += amp * Perlin(x * f, y * f, seed + i * 101); norm += amp; amp *= gain; f *= lacunarity; }
            return sum / norm;
        }

        /// <summary>Ridged fractal in 0..1: sharp crests where the noise crosses zero.</summary>
        public static float Ridged(float x, float y, int seed, int octaves)
        {
            float sum = 0, amp = 1, norm = 0, f = 1;
            for (var i = 0; i < octaves; i++)
            {
                var n = 1f - Math.Abs(Perlin(x * f, y * f, seed + 7 + i * 131));
                sum += amp * n * n; norm += amp; amp *= 0.5f; f *= 2f;
            }
            return sum / norm;
        }
    }

    /// <summary>
    /// The ground of one 512 m chunk (BUILD_PLAN §6.A.3), deterministic from the control map, the relief style map, the
    /// layout and the world seed: base height + roughness × fbm (6 octaves from 1/900 m, 120 m) + the region's relief
    /// styles at the scales the iso camera reads (mountain ridges of 110 + 25 m, wind-stretched dunes of 5 m, mesas
    /// 22 m high with cliff sides, craters) + fine ripples; roads levelled across their width to the ground under their centreline (smoothed over 30 m along it) with a 20 m shoulder; water
    /// lowered by 3 m with an 8 m ramp; two talus passes (steeper than 38° gives half its excess to the lower
    /// neighbour); then each place's pad at its elevation, falling off over 24 m. Heights in metres above sea level,
    /// <see cref="Resolution"/>² samples 2 m apart, row-major from the south-west corner (index z × Resolution + x).
    /// The edge rows are sampled exactly from world coordinates (talus leaves them alone), so neighbouring chunks meet
    /// without a seam. Pure C#: it runs on a worker thread, never touching Unity.
    /// </summary>
    public sealed class TerrainGen
    {
        public const int Resolution = 257;
        public const float Step = WorldGrid.Chunk / (Resolution - 1);
        public const float RoadShoulder = 20f, WaterRamp = 8f, PadFalloff = 24f;   // a 20 m shoulder keeps a cut through 5 m dunes under the rock slope (12 m painted every dune cut as cliff)
        private static readonly float TalusDrop = (float)Math.Tan(38 * Math.PI / 180) * Step;

        private readonly ControlMap _control;
        private readonly StyleMap _style;
        private readonly WorldLayout _layout;
        private readonly int _seed;

        public TerrainGen(ControlMap control, WorldLayout layout, StyleMap style = null, int worldSeed = 1909)
        {
            _control = control; _layout = layout; _style = style ?? StyleMap.None; _seed = worldSeed;
        }

        /// <summary>The natural ground at a world point (before roads, water, talus and places).</summary>
        public float Natural(float x, float z)
        {
            var c = _control.Sample(x, z);
            var s = _style.Sample(x, z);
            var h = c.Height + c.Roughness * 120f * Noise.Fbm(x / 900f, z / 900f, _seed, 6);
            if (s.Ridges > 0.001f)
                h += s.Ridges * (110f * Noise.Ridged(x / 600f, z / 600f, _seed + 11, 4) + 25f * Noise.Ridged(x / 130f, z / 130f, _seed + 12, 3));
            if (s.Dunes > 0.001f)   // ridges across the prevailing wind (from the west): long in z, close in x
                h += s.Dunes * 5f * Noise.Ridged(x / 55f, z / 140f, _seed + 13, 2);
            if (s.Mesas > 0.001f)   // a plateau where the slow noise crosses a threshold, with cliff sides
                h += s.Mesas * 22f * Smooth((Noise.Fbm(x / 800f, z / 800f, _seed + 14, 3) - 0.22f) / 0.035f);
            if (s.Craters > 0.001f)
            {
                var k = Noise.Fbm(x / 260f, z / 260f, _seed + 15, 2);
                if (k > 0.3f) h -= s.Craters * (k - 0.3f) * 90f;
            }
            h += (0.25f + c.Roughness) * 0.6f * Noise.Fbm(x / 14f, z / 14f, _seed + 16, 2);   // ripples the eye reads underfoot
            return h;
        }

        private readonly struct Seg
        {
            public readonly float Ax, Az, Bx, Bz, Half;
            public readonly bool River;
            public Seg(float ax, float az, float bx, float bz, float half, bool river) { Ax = ax; Az = az; Bx = bx; Bz = bz; Half = half; River = river; }
        }

        /// <summary>The segments of roads, rail and rivers that reach into a square (with their reach added).</summary>
        private List<Seg> SegmentsNear(float x0, float z0, float size)
        {
            var list = new List<Seg>();
            void Add(WayInfo w, bool river)
            {
                var reach = w.Width / 2 + (river ? WaterRamp : RoadShoulder);
                for (var i = 0; i + 1 < w.Points.Count; i++)
                {
                    float ax = w.Points[i][0], az = w.Points[i][1], bx = w.Points[i + 1][0], bz = w.Points[i + 1][1];
                    if (Math.Max(ax, bx) + reach < x0 || Math.Min(ax, bx) - reach > x0 + size || Math.Max(az, bz) + reach < z0 || Math.Min(az, bz) - reach > z0 + size) continue;
                    list.Add(new Seg(ax, az, bx, bz, w.Width / 2, river));
                }
            }
            foreach (var w in _layout.Roads) Add(w, false);
            foreach (var w in _layout.Rails) Add(w, false);
            foreach (var w in _layout.Rivers) Add(w, true);
            return list;
        }

        /// <summary>The ground at a world point after roads and water (talus and places are per chunk).</summary>
        private float Shaped(float x, float z, List<Seg> segs)
        {
            var h = Natural(x, z);
            foreach (var s in segs)
            {
                float vx = s.Bx - s.Ax, vz = s.Bz - s.Az, l2 = vx * vx + vz * vz;
                var t = l2 == 0 ? 0 : Math.Clamp(((x - s.Ax) * vx + (z - s.Az) * vz) / l2, 0f, 1f);
                float px = s.Ax + t * vx - x, pz = s.Az + t * vz - z;
                var d = (float)Math.Sqrt(px * px + pz * pz);
                if (s.River)
                {
                    var w = 1f - Smooth((d - s.Half) / WaterRamp);
                    if (w > 0) h -= 3f * w;
                }
                else
                {
                    var w = 1f - Smooth((d - s.Half) / RoadShoulder);
                    if (w > 0)
                    {
                        // the road's level follows the ground under its centreline, smoothed over 30 m along it: a straight
                        // line between far-apart points sat tens of metres off a mountainside and cut walls into it
                        float qx = s.Ax + t * vx, qz = s.Az + t * vz, len = (float)Math.Sqrt(l2), ux = l2 == 0 ? 0 : vx / len * 15f, uz = l2 == 0 ? 0 : vz / len * 15f;
                        var hc = (Natural(qx, qz) + Natural(qx + ux, qz + uz) + Natural(qx - ux, qz - uz)) / 3f;
                        h += (hc - h) * w;
                    }
                }
            }
            var water = _control.Sample(x, z).Water;
            if (water > 0) h -= 3f * Smooth(water * 2f);
            return h;
        }

        /// <summary>The chunk's heights in metres above sea level.</summary>
        public float[] Heights(int cx, int cz)
        {
            const int n = Resolution;
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var segs = SegmentsNear(x0, z0, WorldGrid.Chunk);
            var h = new float[n * n];
            for (var j = 0; j < n; j++)
                for (var i = 0; i < n; i++)
                    h[j * n + i] = Shaped(x0 + i * Step, z0 + j * Step, segs);
            for (var pass = 0; pass < 2; pass++) Talus(h, n);
            foreach (var p in _layout.PlacesIn(cx, cz, MaxFalloff))
            {
                if (p.Offshore) continue;
                var (level, falloff) = Pad(p);
                float hx = p.Size[0] / 2, hz = p.Size[1] / 2;
                for (var j = 0; j < n; j++)
                    for (var i = 0; i < n; i++)
                    {
                        float dx = Math.Max(0, Math.Abs(x0 + i * Step - p.Centre[0]) - hx), dz = Math.Max(0, Math.Abs(z0 + j * Step - p.Centre[1]) - hz);
                        var d = (float)Math.Sqrt(dx * dx + dz * dz);
                        if (d >= falloff) continue;
                        var w = 1f - Smooth(d / falloff);
                        h[j * n + i] += (level - h[j * n + i]) * w;
                    }
            }
            return h;
        }

        /// <summary>The widest a pad's falloff gets (a place cut into a mountainside).</summary>
        public const float MaxFalloff = 160f;
        private readonly Dictionary<string, (float level, float falloff)> _pads = new();

        /// <summary>
        /// A place's pad: level with the mean of the natural ground over its footprint (0.3 m proud, never below the
        /// sea), and a falloff wide enough that the ground meets it at no more than ~35° (at least 24 m): a place on a
        /// mountainside sits in a cut, not in a pit. Deterministic and the same from every chunk.
        /// </summary>
        public (float level, float falloff) Pad(PlaceInfo p)
        {
            lock (_pads)
                if (_pads.TryGetValue(p.Id, out var cached)) return cached;
            float sum = 0; var k = 0;
            for (var a = -2; a <= 2; a++)
                for (var b = -2; b <= 2; b++) { sum += Natural(p.Centre[0] + a * p.Size[0] / 4.5f, p.Centre[1] + b * p.Size[1] / 4.5f); k++; }
            var level = Math.Max(_layout.SeaLevel + 1f, sum / k + 0.3f);
            float worst = 0;
            for (var t = 0; t < 24; t++)
            {
                var ang = t / 24.0 * Math.PI * 2;
                float ex = p.Centre[0] + (float)Math.Cos(ang) * (p.Size[0] / 2 + PadFalloff), ez = p.Centre[1] + (float)Math.Sin(ang) * (p.Size[1] / 2 + PadFalloff);
                worst = Math.Max(worst, Math.Abs(Natural(ex, ez) - level));
            }
            var result = (level, Math.Clamp(worst * 1.45f, PadFalloff, MaxFalloff));
            lock (_pads) _pads[p.Id] = result;
            return result;
        }

        /// <summary>One talus pass over the interior: a sample steeper than 38° above a neighbour gives it half the excess.</summary>
        private static void Talus(float[] h, int n)
        {
            var offsets = new[] { 1, -1, n, -n };
            for (var j = 1; j < n - 1; j++)
                for (var i = 1; i < n - 1; i++)
                {
                    var k = j * n + i;
                    foreach (var o in offsets)
                    {
                        var m = k + o;
                        int mi = m % n, mj = m / n;
                        if (mi == 0 || mj == 0 || mi == n - 1 || mj == n - 1) continue;   // edges stay exact
                        var excess = h[k] - h[m] - TalusDrop;
                        if (excess > 0) { h[k] -= excess * 0.25f; h[m] += excess * 0.25f; }
                    }
                }
        }

        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }
}
