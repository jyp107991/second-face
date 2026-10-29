using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The ground's surfaces (BUILD_PLAN §6.A.3, P3.2). Each biome names four texture-library keys by role — base,
    /// patches (broken up by noise), accent and steep (slopes over ~24°) — and an accent rule: "low" for washes, pans and
    /// puddled ground, "high" for snow on the heights. A point's paint is a pure function of where it is: its biome
    /// weights come from the control map sampled on a jittered ring 48 m round it (so borders are soft and wander, not
    /// 64 m stair steps), each biome's role weights go to that biome's keys. A chunk paints with every key that reaches
    /// it (the union of the palettes present: four inside a biome, up to eight on a border, which costs those chunks a
    /// second pass), so the same point paints the same in both chunks either side of an edge: no seam.
    /// </summary>
    public static class TerrainPaint
    {
        public const int Roles = 4;
        public const int MaxLayers = 8;
        public const int AlphaResolution = 256;   // 2 m a texel over a 512 m chunk

        /// <summary>Library keys per biome id, in role order: base, patches, accent, steep.</summary>
        public static readonly IReadOnlyDictionary<string, string[]> Palettes = new Dictionary<string, string[]>
        {
            ["sallow"] = new[] { "scrub_soil", "sand", "cracked", "rock" },
            ["glass_flats"] = new[] { "sand", "glass", "cracked", "rubble" },
            ["rail_corridor"] = new[] { "grass_dry", "scrub_soil", "gravel", "rock" },
            ["drowned_shore"] = new[] { "coast", "mud", "grass_dry", "rock" },
            ["meridian"] = new[] { "rubble", "asphalt", "mud", "concrete" },
            ["teeth"] = new[] { "stony_ground", "grass_dry", "snow", "rock" },
            ["ashlands"] = new[] { "burned", "cracked", "rubble", "rock" },
            ["northern_wet"] = new[] { "grass", "mud", "forest", "rock" },
        };

        /// <summary>Where a biome's accent lies: "low" ground (washes, pans, near water) or "high" ground (snow).</summary>
        public static readonly IReadOnlyDictionary<string, string> AccentRule = new Dictionary<string, string>
        {
            ["teeth"] = "high",
        };

        /// <summary>The height above which the Teeth's accent (snow) begins, metres above sea level.</summary>
        public const float SnowLine = 330f;

        /// <summary>A chunk's paint: the layer keys it uses (≤ <see cref="MaxLayers"/>, most weight first) and their
        /// weights per alpha texel (AlphaResolution² × Keys.Length, row-major from the south-west, summing to 1).</summary>
        public sealed class Result
        {
            public string[] Keys;
            public float[] Weights;
        }

        /// <summary>The biome weights round a point: the control map at the point and on a jittered ring 48 m out.</summary>
        public static Dictionary<int, float> BiomeWeights(ControlMap control, float x, float z, int seed = 1909)
        {
            var w = new Dictionary<int, float>();
            void Add(int b, float v) => w[b] = w.TryGetValue(b, out var o) ? o + v : v;
            Add(control.Sample(x, z).Biome, 2f);
            var turn = Noise.Perlin(x / 300f, z / 300f, seed + 21) * 3f;
            for (var k = 0; k < 6; k++)
            {
                var a = turn + k * Math.PI / 3;
                var r = 48f * (0.7f + 0.3f * Noise.Perlin(x / 60f + k, z / 60f, seed + 22));
                Add(control.Sample(x + (float)Math.Cos(a) * r, z + (float)Math.Sin(a) * r).Biome, 1f);
            }
            foreach (var k in w.Keys.ToList()) w[k] /= 8f;
            return w;
        }

        /// <summary>One biome's role weights at a point (base, patches, accent, steep; summing to 1).</summary>
        public static void RoleWeights(string biome, float x, float z, float height, float slope, float water, float[] into, int seed = 1909)
        {
            var steep = Smooth((slope - 0.45f) / 0.3f);
            // patches: 40 m shapes with 8 m raggedness on their edges and a narrow transition (wide soft edges read as
            // blurred blobs from the game camera; height blending sharpens what is left)
            var patch = Smooth((Noise.Fbm(x / 40f, z / 40f, seed + 3, 3) + 0.3f * Noise.Fbm(x / 8f, z / 8f, seed + 4, 2) + 0.1f) / 0.22f);
            float accent;
            if (AccentRule.TryGetValue(biome, out var rule) && rule == "high")
                accent = Smooth((height - SnowLine + 25f * Noise.Fbm(x / 90f, z / 90f, seed + 7, 2)) / 40f) * (1 - Smooth((slope - 0.6f) / 0.3f));
            else
            {
                var low = Smooth((Noise.Fbm(x / 140f, z / 140f, seed + 5, 2) - 0.15f) / 0.3f) * (1 - Smooth(slope / 0.25f));
                accent = Math.Max(low, Smooth((water - 0.05f) / 0.3f));
            }
            var rest = 1 - steep;
            into[3] = steep;
            into[2] = rest * accent;
            into[1] = rest * (1 - accent) * patch;
            into[0] = rest * (1 - accent) * (1 - patch);
        }

        /// <summary>The paint of a chunk from its heights (<see cref="TerrainGen.Heights"/>).</summary>
        public static Result Paint(ControlMap control, string[] biomes, float[] heights, int cx, int cz, int seed = 1909)
        {
            const int n = TerrainGen.Resolution, a = AlphaResolution;
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var texel = WorldGrid.Chunk / a;
            // per texel: key → weight, gathered sparse, then laid out over the chunk's key set
            var keyIndex = new Dictionary<string, int>();
            var keys = new List<string>();
            var cells = new (int key, float w)[a * a][];
            var roles = new float[Roles];
            var acc = new Dictionary<int, float>();
            // inside one biome (no other biome's texel within the ring's reach) every point's biome weight is 1: skip the ring
            var only = OnlyBiome(control, x0, z0, 64f);
            var single = new Dictionary<int, float> { [only] = 1f };
            for (var j = 0; j < a; j++)
                for (var i = 0; i < a; i++)
                {
                    float x = x0 + (i + 0.5f) * texel, z = z0 + (j + 0.5f) * texel;
                    float fi = (i + 0.5f) * texel / TerrainGen.Step, fj = (j + 0.5f) * texel / TerrainGen.Step;
                    int hi = Math.Min(n - 2, (int)fi), hj = Math.Min(n - 2, (int)fj);
                    float h00 = heights[hj * n + hi], h10 = heights[hj * n + hi + 1], h01 = heights[(hj + 1) * n + hi], h11 = heights[(hj + 1) * n + hi + 1];
                    float gx = ((h10 - h00) + (h11 - h01)) / (2 * TerrainGen.Step), gz = ((h01 - h00) + (h11 - h10)) / (2 * TerrainGen.Step);
                    var slope = (float)Math.Sqrt(gx * gx + gz * gz);
                    var height = (h00 + h10 + h01 + h11) / 4f;
                    var water = control.Sample(x, z).Water;
                    acc.Clear();
                    foreach (var (b, bw) in only >= 0 ? single : BiomeWeights(control, x, z, seed))
                    {
                        var id = biomes[b];
                        RoleWeights(id, x, z, height, slope, water, roles, seed);
                        var palette = Palettes.TryGetValue(id, out var p) ? p : Palettes["sallow"];
                        for (var r = 0; r < Roles; r++)
                        {
                            if (roles[r] <= 0) continue;
                            if (!keyIndex.TryGetValue(palette[r], out var ki)) { ki = keys.Count; keyIndex[palette[r]] = ki; keys.Add(palette[r]); }
                            acc[ki] = (acc.TryGetValue(ki, out var o) ? o : 0) + bw * roles[r];
                        }
                    }
                    var cell = new (int, float)[acc.Count]; var c = 0;
                    foreach (var kv in acc) cell[c++] = (kv.Key, kv.Value);
                    cells[j * a + i] = cell;
                }
            // the chunk's layers: by total weight; beyond eight, the lightest fold into the heaviest
            var totals = new float[keys.Count];
            foreach (var cell in cells) foreach (var (k, w) in cell) totals[k] += w;
            var order = Enumerable.Range(0, keys.Count).OrderByDescending(k => totals[k]).ToList();
            var kept = order.Take(MaxLayers).ToList();
            var slot = new int[keys.Count];
            for (var k = 0; k < keys.Count; k++) slot[k] = kept.IndexOf(k) >= 0 ? kept.IndexOf(k) : 0;
            var result = new Result { Keys = kept.Select(k => keys[k]).ToArray() };
            var L = result.Keys.Length;
            result.Weights = new float[a * a * L];
            for (var t = 0; t < a * a; t++)
            {
                float sum = 0;
                foreach (var (k, w) in cells[t]) { result.Weights[t * L + slot[k]] += w; sum += w; }
                if (sum > 0) for (var l = 0; l < L; l++) result.Weights[t * L + l] /= sum;
                else result.Weights[t * L] = 1;
            }
            return result;
        }

        /// <summary>The one biome of every control texel within <paramref name="margin"/> of a chunk, or -1 if there are more.</summary>
        public static int OnlyBiome(ControlMap control, float x0, float z0, float margin)
        {
            var m = control.MetresPerTexel;
            int i0 = (int)Math.Floor((x0 - margin) / m), i1 = (int)Math.Ceiling((x0 + WorldGrid.Chunk + margin) / m);
            int j0 = (int)Math.Floor((z0 - margin) / m), j1 = (int)Math.Ceiling((z0 + WorldGrid.Chunk + margin) / m);
            var b = control.Sample(i0 * m, j0 * m).Biome;
            for (var j = j0; j <= j1; j++)
                for (var i = i0; i <= i1; i++)
                    if (control.Sample(i * m, j * m).Biome != b) return -1;
            return b;
        }

        /// <summary>The biome most of a chunk's ground belongs to (by the control map at 64 m).</summary>
        public static int DominantBiome(ControlMap control, int cx, int cz)
        {
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var counts = new Dictionary<int, int>();
            for (var z = z0 + 32; z < z0 + WorldGrid.Chunk; z += 64)
                for (var x = x0 + 32; x < x0 + WorldGrid.Chunk; x += 64)
                {
                    var b = control.Sample(x, z).Biome;
                    counts[b] = counts.TryGetValue(b, out var n) ? n + 1 : 1;
                }
            var best = 0; var bestN = -1;
            foreach (var kv in counts) if (kv.Value > bestN || (kv.Value == bestN && kv.Key < best)) { best = kv.Key; bestN = kv.Value; }
            return best;
        }

        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }
}
