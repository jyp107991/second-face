using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>One prop to place in a chunk: a model id and its variant, a chunk-local position on the ground (y in metres
    /// above sea level), a yaw in degrees and a scale.</summary>
    public readonly struct PropPlacement
    {
        public readonly string Model;
        public readonly int Variant;
        public readonly float X, Y, Z, Yaw, Scale;
        public PropPlacement(string model, int variant, float x, float y, float z, float yaw, float scale)
        { Model = model; Variant = variant; X = x; Y = y; Z = z; Yaw = yaw; Scale = scale; }
    }

    /// <summary>One kind of world prop: models, tries per 512 m chunk, the ground it accepts, scale range and the least
    /// distance to another prop of the same rule (metres).</summary>
    public sealed class PropRule
    {
        public string Group;
        public string[] Models;
        public int Tries;
        public float ScaleMin = 1f, ScaleMax = 1f, Spacing = 2f;
        public Func<GroundSample, bool> Accepts;
    }

    /// <summary>
    /// The world's props (BUILD_PLAN §6.A, P3.4, step 19a): the trees, boulders and dead wood that stand on the ground,
    /// per biome, placed per chunk deterministically from the chunk and the world seed, so a chunk regenerates the same at
    /// every load. A try is kept where its rule accepts the ground (altitude, slope, wash, clump noise: <see cref="Sample"/>),
    /// the point lies in the rule's own biome, clear of roads, rails, rivers and places, and no prop of the same rule
    /// stands within its spacing. Small scatter (scrub, stones, debris) and grass are terrain details, not props (19b, 19c).
    /// Pure: it runs on the chunk's worker.
    /// </summary>
    public sealed class WorldScatter
    {
        private readonly ControlMap _control;
        private readonly WorldLayout _layout;
        private readonly int _seed;

        public WorldScatter(ControlMap control, WorldLayout layout, int seed = 1909) { _control = control; _layout = layout; _seed = seed; }

        /// <summary>The props of each biome. Densities are per 512 m chunk and sized for the phone: a chunk carries a few
        /// hundred props, the streamer keeps them only round the focus.</summary>
        public static IReadOnlyList<PropRule> Rules(string biome) => biome switch
        {
            "sallow" => Sallow,
            "teeth" => Teeth,
            "rail_corridor" => Rail,
            "drowned_shore" => Shore,
            "northern_wet" => Wet,
            "ashlands" => Ash,
            "glass_flats" => Glass,
            _ => Array.Empty<PropRule>(),   // the city builds its own
        };

        private static readonly PropRule[] Sallow =
        {
            new() { Group = "Trees", Models = new[] { "quiver_tree_01", "quiver_tree_02" }, Tries = 260, ScaleMin = 1.4f, ScaleMax = 2.2f, Spacing = 6f,   // the scans are young plants (1.5–2.7 m): grown ones stand 3–6 m
                Accepts = g => g.Slope < 0.3f && g.Wash < 0.3f && g.Noise > 0.55f },
            new() { Group = "DeadWood", Models = new[] { "dead_quiver_trunk", "dead_tree_trunk", "dead_tree_trunk_02" }, Tries = 140, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 5f,
                Accepts = g => g.Slope < 0.35f && g.Noise > 0.6f },
            new() { Group = "WashTrees", Models = new[] { "tree_small_02" }, Tries = 120, ScaleMin = 0.8f, ScaleMax = 1.1f, Spacing = 8f,
                Accepts = g => g.Wash > 0.5f && g.Slope < 0.25f },
            new() { Group = "Bushes", Models = new[] { "shrub_02", "wild_rooibos_bush" }, Tries = 420, ScaleMin = 0.8f, ScaleMax = 1.3f, Spacing = 3f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.45f },
            new() { Group = "Boulders", Models = new[] { "namaqualand_boulder_02", "namaqualand_boulder_03", "boulder_01" }, Tries = 220, ScaleMin = 0.7f, ScaleMax = 1.4f, Spacing = 4f,
                Accepts = g => (g.Slope > 0.25f || g.Noise > 0.72f) && g.Wash < 0.4f },
            new() { Group = "Debris", Models = new[] { "tree_stump_01", "root_cluster_01" }, Tries = 70, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 6f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.5f },
        };

        private static readonly PropRule[] Teeth =
        {
            new() { Group = "Pines", Models = new[] { "pine" }, Tries = 900, ScaleMin = 0.8f, ScaleMax = 1.15f, Spacing = 4.5f,
                Accepts = g => g.Slope < 0.5f && g.Altitude > 180f && g.Altitude < TerrainPaint.SnowLine + 15f && g.Noise > 0.3f },
            new() { Group = "Firs", Models = new[] { "fir" }, Tries = 300, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 4.5f,
                Accepts = g => g.Slope < 0.45f && g.Altitude > 220f && g.Altitude < TerrainPaint.SnowLine && g.Noise > 0.5f },
            new() { Group = "DeadWood", Models = new[] { "dead_tree_trunk", "dead_tree_trunk_02", "tree_stump_01" }, Tries = 90, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 5f,
                Accepts = g => g.Slope < 0.45f && g.Noise > 0.6f },
            new() { Group = "Boulders", Models = new[] { "boulder_01", "namaqualand_boulder_02", "namaqualand_boulder_03" }, Tries = 260, ScaleMin = 0.8f, ScaleMax = 1.6f, Spacing = 4f,
                Accepts = g => g.Slope > 0.3f || g.Noise > 0.8f },
        };

        private static readonly PropRule[] Rail =
        {
            new() { Group = "Trees", Models = new[] { "broadleaf" }, Tries = 140, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 7f,
                Accepts = g => g.Slope < 0.35f && g.Noise > 0.62f },
            new() { Group = "Bushes", Models = new[] { "shrub_02", "wild_rooibos_bush" }, Tries = 260, ScaleMin = 0.8f, ScaleMax = 1.3f, Spacing = 3f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.5f },
            new() { Group = "DeadWood", Models = new[] { "dead_tree_trunk", "tree_stump_01" }, Tries = 60, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 6f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.55f },
            new() { Group = "Boulders", Models = new[] { "boulder_01", "namaqualand_boulder_02" }, Tries = 110, ScaleMin = 0.7f, ScaleMax = 1.3f, Spacing = 4f,
                Accepts = g => g.Slope > 0.25f || g.Noise > 0.78f },
        };

        private static readonly PropRule[] Shore =
        {
            new() { Group = "DeadWood", Models = new[] { "dead_tree_trunk", "dead_tree_trunk_02", "root_cluster_01" }, Tries = 120, ScaleMin = 0.8f, ScaleMax = 1.3f, Spacing = 5f,
                Accepts = g => g.Slope < 0.35f && g.Noise > 0.5f },
            new() { Group = "Trees", Models = new[] { "broadleaf" }, Tries = 70, ScaleMin = 0.8f, ScaleMax = 1.1f, Spacing = 7f,
                Accepts = g => g.Slope < 0.3f && g.Noise > 0.7f && g.Wash < 0.4f },
            new() { Group = "Boulders", Models = new[] { "boulder_01", "namaqualand_boulder_03" }, Tries = 90, ScaleMin = 0.8f, ScaleMax = 1.5f, Spacing = 4f,
                Accepts = g => g.Slope > 0.2f || g.Noise > 0.8f },
        };

        private static readonly PropRule[] Wet =
        {
            new() { Group = "Trees", Models = new[] { "broadleaf" }, Tries = 520, ScaleMin = 0.8f, ScaleMax = 1.25f, Spacing = 6f,
                Accepts = g => g.Slope < 0.45f && g.Noise > 0.4f },
            new() { Group = "Firs", Models = new[] { "fir" }, Tries = 260, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 5f,
                Accepts = g => g.Slope < 0.45f && g.Noise > 0.55f },
            new() { Group = "Bushes", Models = new[] { "shrub_02" }, Tries = 300, ScaleMin = 0.8f, ScaleMax = 1.3f, Spacing = 3f,
                Accepts = g => g.Slope < 0.45f && g.Noise > 0.35f },
            new() { Group = "DeadWood", Models = new[] { "dead_tree_trunk", "tree_stump_01", "root_cluster_01" }, Tries = 80, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 5f,
                Accepts = g => g.Slope < 0.45f && g.Noise > 0.5f },
            new() { Group = "Boulders", Models = new[] { "boulder_01" }, Tries = 100, ScaleMin = 0.8f, ScaleMax = 1.4f, Spacing = 4f,
                Accepts = g => g.Slope > 0.3f || g.Noise > 0.8f },
        };

        private static readonly PropRule[] Ash =
        {
            new() { Group = "DeadWood", Models = new[] { "dead_tree_trunk", "dead_tree_trunk_02", "dead_quiver_trunk" }, Tries = 260, ScaleMin = 0.8f, ScaleMax = 1.3f, Spacing = 5f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.45f },
            new() { Group = "Debris", Models = new[] { "root_cluster_01", "tree_stump_01" }, Tries = 90, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 5f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.55f },
            new() { Group = "Boulders", Models = new[] { "boulder_01", "namaqualand_boulder_02", "namaqualand_boulder_03" }, Tries = 160, ScaleMin = 0.7f, ScaleMax = 1.4f, Spacing = 4f,
                Accepts = g => g.Slope > 0.25f || g.Noise > 0.75f },
        };

        private static readonly PropRule[] Glass =
        {
            new() { Group = "Boulders", Models = new[] { "namaqualand_boulder_02", "namaqualand_boulder_03" }, Tries = 60, ScaleMin = 0.7f, ScaleMax = 1.3f, Spacing = 6f,
                Accepts = g => g.Noise > 0.7f },
            new() { Group = "DeadWood", Models = new[] { "dead_quiver_trunk" }, Tries = 40, ScaleMin = 0.8f, ScaleMax = 1.2f, Spacing = 8f,
                Accepts = g => g.Noise > 0.75f },
        };

        /// <summary>What the ground offers at a world point (chunk heights for height and slope): altitude in metres,
        /// slope 0..1 (1 vertical), wash 0..1 (the low washes and pans the terrain paint marks too), clump noise 0..1.</summary>
        public GroundSample Sample(float[] heights, float x0, float z0, float x, float z)
        {
            float lx = x - x0, lz = z - z0;
            var h = RoadStrips.HeightAt(heights, lx, lz);
            const float d = TerrainGen.Step;
            var gx = (RoadStrips.HeightAt(heights, lx + d, lz) - RoadStrips.HeightAt(heights, lx - d, lz)) / (2 * d);
            var gz = (RoadStrips.HeightAt(heights, lx, lz + d) - RoadStrips.HeightAt(heights, lx, lz - d)) / (2 * d);
            var slope = (float)(Math.Atan(Math.Sqrt(gx * gx + gz * gz)) / (Math.PI / 2));
            var wash = Smooth((Noise.Fbm(x / 140f, z / 140f, _seed + 5, 2) - 0.15f) / 0.3f) * (1 - Smooth(slope * 1.6f / 0.25f));
            var noise = Math.Clamp(0.5f + 0.75f * Noise.Fbm(x / 35f, z / 35f, _seed + 31, 3), 0f, 1f);
            return new GroundSample(0, slope, wash, noise, h);
        }

        /// <summary>The props of a chunk from its heights (<see cref="TerrainGen.Heights"/>). <paramref name="variants"/>
        /// says how many variants a model has (0: not available, skipped).</summary>
        public List<PropPlacement> Props(int cx, int cz, float[] heights, string[] biomes, Func<string, int> variants)
        {
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var list = new List<PropPlacement>();
            // the biomes present, from the control map at 64 m (with a margin, so a border chunk tries its neighbour's rules)
            var present = new SortedSet<int>();
            for (var z = z0 - 32; z <= z0 + WorldGrid.Chunk + 32; z += 64)
                for (var x = x0 - 32; x <= x0 + WorldGrid.Chunk + 32; x += 64)
                    present.Add(_control.Sample(x, z).Biome);
            var ways = WaysNear(x0, z0);
            var places = _layout.PlacesIn(cx, cz, 16f);
            foreach (var b in present)
            {
                if (b < 0 || b >= biomes.Length) continue;
                var rules = Rules(biomes[b]);
                for (var r = 0; r < rules.Count; r++)
                {
                    var rule = rules[r];
                    var rng = new Random(Hash(_seed, cx, cz, b * 31 + r));
                    var taken = new List<(float x, float z)>();
                    for (var t = 0; t < rule.Tries; t++)
                    {
                        float x = x0 + (float)rng.NextDouble() * WorldGrid.Chunk, z = z0 + (float)rng.NextDouble() * WorldGrid.Chunk;
                        var model = rule.Models[rng.Next(rule.Models.Length)];
                        var yaw = (float)rng.NextDouble() * 360f;
                        var scale = rule.ScaleMin + (rule.ScaleMax - rule.ScaleMin) * (float)rng.NextDouble();
                        var pick = rng.Next(1 << 20);   // every try draws the same numbers, kept or not: placements do not shift when a rule changes its test
                        if (_control.Sample(x, z).Biome != b) continue;
                        var g = Sample(heights, x0, z0, x, z);
                        if (!rule.Accepts(g)) continue;
                        if (!ClearOfWays(ways, x, z, 3f)) continue;
                        var inPlace = false;
                        foreach (var p in places) if (!p.Offshore && p.Contains(x, z, 10f)) { inPlace = true; break; }
                        if (inPlace) continue;
                        if (g.Altitude < _layout.SeaLevel + 0.5f) continue;
                        var tooClose = false;
                        foreach (var (px, pz) in taken) if ((px - x) * (px - x) + (pz - z) * (pz - z) < rule.Spacing * rule.Spacing) { tooClose = true; break; }
                        if (tooClose) continue;
                        var n = variants(model);
                        if (n <= 0) continue;
                        taken.Add((x, z));
                        list.Add(new PropPlacement(model, pick % n, x - x0, g.Altitude, z - z0, yaw, scale));
                    }
                }
            }
            return list;
        }

        private readonly struct Seg
        {
            public readonly float Ax, Az, Bx, Bz, Half;
            public Seg(float ax, float az, float bx, float bz, float half) { Ax = ax; Az = az; Bx = bx; Bz = bz; Half = half; }
        }

        private List<Seg> WaysNear(float x0, float z0)
        {
            var list = new List<Seg>();
            void Add(WayInfo w)
            {
                var reach = w.Width / 2 + 10f;
                for (var i = 0; i + 1 < w.Points.Count; i++)
                {
                    float ax = w.Points[i][0], az = w.Points[i][1], bx = w.Points[i + 1][0], bz = w.Points[i + 1][1];
                    if (Math.Max(ax, bx) + reach < x0 || Math.Min(ax, bx) - reach > x0 + WorldGrid.Chunk || Math.Max(az, bz) + reach < z0 || Math.Min(az, bz) - reach > z0 + WorldGrid.Chunk) continue;
                    list.Add(new Seg(ax, az, bx, bz, w.Width / 2));
                }
            }
            foreach (var w in _layout.Roads) Add(w);
            foreach (var w in _layout.Rails) Add(w);
            foreach (var w in _layout.Rivers) Add(w);
            return list;
        }

        private static bool ClearOfWays(List<Seg> segs, float x, float z, float margin)
        {
            foreach (var s in segs)
            {
                float vx = s.Bx - s.Ax, vz = s.Bz - s.Az, l2 = vx * vx + vz * vz;
                var t = l2 == 0 ? 0 : Math.Clamp(((x - s.Ax) * vx + (z - s.Az) * vz) / l2, 0f, 1f);
                float px = s.Ax + t * vx - x, pz = s.Az + t * vz - z;
                if (px * px + pz * pz < (s.Half + margin) * (s.Half + margin)) return false;
            }
            return true;
        }

        private static int Hash(int seed, int cx, int cz, int k)
        {
            unchecked
            {
                var h = (uint)seed * 2654435761u;
                h ^= (uint)cx * 2246822519u; h = (h << 13) | (h >> 19);
                h ^= (uint)cz * 3266489917u; h = (h << 13) | (h >> 19);
                h ^= (uint)k * 668265263u;
                h ^= h >> 15; h *= 2246822519u; h ^= h >> 13;
                return (int)(h & 0x7fffffff);
            }
        }

        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }
}
