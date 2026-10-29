using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The small scatter (BUILD_PLAN P3.4, step 19b): scrub, stones, pebbles, dry branches, grass tufts and ferns, drawn by
    /// the terrain as instanced detail meshes (Game DetailSet holds the prototypes in <see cref="Keys"/> order). Per 2 m
    /// detail cell, each biome's rules give an expected count from the ground (slope, wash, altitude, clump noise); the
    /// count is that expectation rounded by a hash of the cell, so a chunk regenerates the same, and nothing grows on roads,
    /// rails, rivers or in places. Pure: it runs on the chunk's worker.
    /// </summary>
    public sealed class WorldDetails
    {
        /// <summary>The detail prototypes, in layer order, all instanced meshes: bushes (domes of leaf cards: saltbush,
        /// renosterbos, the washes' big bush), stones, pebbles, flat rocks, dry branches and a fern (scans), and grass tufts
        /// (stars of tuft cards), dry and green.</summary>
        public static readonly string[] Keys =
        {
            "bush_a", "bush_b", "bush_c", "stones", "pebbles", "rocks_flat", "branches", "fern",
            "tuft_dry_a", "tuft_dry_b", "tuft_green_a", "tuft_green_b",
        };

        public const int Resolution = TerrainPaint.AlphaResolution;   // 2 m cells over a 512 m chunk
        public const int MaxPerCell = 6;

        private sealed class Rule
        {
            public int Key;
            public Func<GroundSample, float> Expected;
        }

        private static int K(string key) => Array.IndexOf(Keys, key);
        private static float Clump(GroundSample g, float from) => Smooth((g.Noise - from) / 0.25f);
        private static float Steep(GroundSample g) => Smooth((g.Slope - 0.15f) / 0.2f);
        private static float BelowSnow(GroundSample g) => 1f - Smooth((g.Altitude - TerrainPaint.SnowLine + 20f) / 30f);

        private static Rule R(string key, Func<GroundSample, float> expected) => new() { Key = K(key), Expected = expected };

        private static readonly Dictionary<string, Rule[]> Rules = new()
        {
            ["sallow"] = new[]
            {
                // a scrub desert seen from above: grey-olive mounds a metre or two apart in clumps (~15 % cover there),
                // bare pale ground between, the big bushes and the tufts thickest in the washes, stones on the slopes
                R("bush_a", g => (0.04f + 0.42f * Clump(g, 0.3f)) * (1 - Steep(g))),
                R("bush_b", g => (0.02f + 0.16f * Clump(g, 0.45f)) * (1 - Steep(g))),
                R("bush_c", g => (0.02f * Clump(g, 0.5f) + 0.25f * g.Wash) * (1 - Steep(g))),
                R("stones", g => 0.08f + 0.25f * Steep(g)),
                R("pebbles", g => 0.15f),
                R("rocks_flat", g => 0.03f + 0.08f * Steep(g)),
                R("branches", g => 0.02f * Clump(g, 0.5f)),
                R("tuft_dry_a", g => 0.1f + 0.3f * Clump(g, 0.35f) + 0.4f * g.Wash),
                R("tuft_dry_b", g => 0.05f + 0.15f * Clump(g, 0.5f) + 0.2f * g.Wash),
            },
            ["teeth"] = new[]
            {
                R("stones", g => 0.15f + 0.3f * Steep(g)),
                R("pebbles", g => 0.2f),
                R("rocks_flat", g => 0.05f + 0.1f * Steep(g)),
                R("tuft_green_a", g => 0.3f * BelowSnow(g) * (1 - Steep(g))),
                R("tuft_dry_a", g => 0.2f * BelowSnow(g) * (1 - Steep(g)) * Clump(g, 0.4f)),
                R("fern", g => 0.04f * BelowSnow(g) * Clump(g, 0.5f)),
                R("bush_c", g => 0.08f * BelowSnow(g) * Clump(g, 0.5f)),
            },
            ["rail_corridor"] = new[]
            {
                R("tuft_dry_a", g => 0.35f * (1 - Steep(g))),
                R("tuft_green_a", g => 0.2f * Clump(g, 0.4f)),
                R("tuft_dry_b", g => 0.15f),
                R("bush_b", g => 0.06f * Clump(g, 0.45f)),
                R("stones", g => 0.08f + 0.15f * Steep(g)),
                R("pebbles", g => 0.15f),
                R("branches", g => 0.01f),
            },
            ["drowned_shore"] = new[]
            {
                R("tuft_green_a", g => 0.3f * (1 - Steep(g))),
                R("tuft_green_b", g => 0.2f * Clump(g, 0.4f)),
                R("tuft_dry_b", g => 0.1f),
                R("stones", g => 0.1f + 0.15f * Steep(g)),
                R("pebbles", g => 0.2f),
                R("branches", g => 0.03f),
            },
            ["northern_wet"] = new[]
            {
                R("tuft_green_a", g => 0.55f * (1 - Steep(g))),
                R("tuft_green_b", g => 0.35f * Clump(g, 0.35f)),
                R("fern", g => 0.18f * Clump(g, 0.45f)),
                R("bush_c", g => 0.12f * Clump(g, 0.5f)),
                R("stones", g => 0.05f + 0.15f * Steep(g)),
            },
            ["ashlands"] = new[]
            {
                R("stones", g => 0.15f + 0.2f * Steep(g)),
                R("pebbles", g => 0.3f),
                R("branches", g => 0.06f * Clump(g, 0.4f)),
                R("tuft_dry_b", g => 0.04f * Clump(g, 0.5f)),
            },
            ["glass_flats"] = new[] { R("pebbles", g => 0.15f), R("stones", g => 0.05f) },
            ["meridian"] = new[] { R("pebbles", g => 0.1f), R("stones", g => 0.05f) },
        };

        /// <summary>A chunk's details: the prototype layers it uses and, for each, the count per cell (Resolution², row-major
        /// from the south-west, as Unity's detail layers).</summary>
        public sealed class Result
        {
            public readonly List<int> Layers = new();
            public readonly List<byte[]> Counts = new();
            public int Total;
        }

        private readonly ControlMap _control;
        private readonly WorldLayout _layout;
        private readonly WorldScatter _ground;
        private readonly int _seed;

        public WorldDetails(ControlMap control, WorldLayout layout, int seed = 1909)
        {
            _control = control; _layout = layout; _seed = seed; _ground = new WorldScatter(control, layout, seed);
        }

        public Result Build(int cx, int cz, float[] heights, string[] biomes)
        {
            const int n = Resolution;
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            const float cell = WorldGrid.Chunk / n;
            var blocked = Blocked(cx, cz, x0, z0, cell);
            var counts = new byte[Keys.Length][];
            var result = new Result();
            for (var j = 0; j < n; j++)
                for (var i = 0; i < n; i++)
                {
                    if (blocked[j * n + i]) continue;
                    float x = x0 + (i + 0.5f) * cell, z = z0 + (j + 0.5f) * cell;
                    var b = _control.Sample(x, z).Biome;
                    if (b < 0 || b >= biomes.Length || !Rules.TryGetValue(biomes[b], out var rules)) continue;
                    var g = _ground.Sample(heights, x0, z0, x, z);
                    if (g.Altitude < _layout.SeaLevel + 0.3f) continue;
                    foreach (var r in rules)
                    {
                        var e = r.Expected(g);
                        if (e <= 0) continue;
                        var whole = (int)e;
                        var c = whole + (Hash(_seed, cx * n + i, cz * n + j, r.Key) < e - whole ? 1 : 0);
                        if (c <= 0) continue;
                        (counts[r.Key] ??= new byte[n * n])[j * n + i] = (byte)Math.Min(MaxPerCell, c);
                        result.Total += c;
                    }
                }
            for (var k = 0; k < Keys.Length; k++)
                if (counts[k] != null) { result.Layers.Add(k); result.Counts.Add(counts[k]); }
            return result;
        }

        /// <summary>Cells on a road, rail or river (half its width + 1 m) or in a place (+ 4 m).</summary>
        private bool[] Blocked(int cx, int cz, float x0, float z0, float cell)
        {
            const int n = Resolution;
            var blocked = new bool[n * n];
            void Way(WayInfo w)
            {
                var half = w.Width / 2 + 1f;
                for (var s = 0; s + 1 < w.Points.Count; s++)
                {
                    float ax = w.Points[s][0], az = w.Points[s][1], bx = w.Points[s + 1][0], bz = w.Points[s + 1][1];
                    int i0 = Math.Max(0, (int)((Math.Min(ax, bx) - half - x0) / cell)), i1 = Math.Min(n - 1, (int)((Math.Max(ax, bx) + half - x0) / cell));
                    int j0 = Math.Max(0, (int)((Math.Min(az, bz) - half - z0) / cell)), j1 = Math.Min(n - 1, (int)((Math.Max(az, bz) + half - z0) / cell));
                    if (i0 > i1 || j0 > j1) continue;
                    float vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
                    for (var j = j0; j <= j1; j++)
                        for (var i = i0; i <= i1; i++)
                        {
                            float x = x0 + (i + 0.5f) * cell, z = z0 + (j + 0.5f) * cell;
                            var t = l2 == 0 ? 0 : Math.Clamp(((x - ax) * vx + (z - az) * vz) / l2, 0f, 1f);
                            float px = ax + t * vx - x, pz = az + t * vz - z;
                            if (px * px + pz * pz < half * half) blocked[j * n + i] = true;
                        }
                }
            }
            foreach (var w in _layout.Roads) Way(w);
            foreach (var w in _layout.Rails) Way(w);
            foreach (var w in _layout.Rivers) Way(w);
            foreach (var p in _layout.PlacesIn(cx, cz, 8f))
            {
                if (p.Offshore) continue;
                for (var j = 0; j < n; j++)
                    for (var i = 0; i < n; i++)
                        if (p.Contains(x0 + (i + 0.5f) * cell, z0 + (j + 0.5f) * cell, 4f)) blocked[j * n + i] = true;
            }
            return blocked;
        }

        /// <summary>A hash of a cell and a layer to 0..1.</summary>
        private static float Hash(int seed, int x, int z, int k)
        {
            unchecked
            {
                var h = (uint)seed * 374761393u + (uint)x * 668265263u + (uint)z * 2246822519u + (uint)k * 3266489917u;
                h = (h ^ (h >> 13)) * 1274126177u;
                h ^= h >> 16;
                return (h & 0xffffff) / 16777216f;
            }
        }

        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }
}
