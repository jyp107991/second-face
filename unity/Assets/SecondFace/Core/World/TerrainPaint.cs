using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The ground's surfaces (BUILD_PLAN §6.A.3, at most four terrain layers per tile): each biome names four texture
    /// library keys by role — base, patches (broken up by noise), accent (the low flats: washes, pans, puddled ground)
    /// and steep (slopes over ~30°). A tile paints with its dominant biome's four layers; a sample of another biome uses
    /// that biome's role weights on the tile's layers (the seam this leaves where biomes change at a chunk edge is P3.2's
    /// to soften).
    /// </summary>
    public static class TerrainPaint
    {
        public const int Roles = 4;
        public const int AlphaResolution = 256;   // 2 m a texel over a 512 m chunk

        /// <summary>Library keys per biome id, in role order: base, patches, accent, steep.</summary>
        public static readonly IReadOnlyDictionary<string, string[]> Palettes = new Dictionary<string, string[]>
        {
            ["sallow"] = new[] { "scrub_soil", "sand", "cracked", "rock" },
            ["glass_flats"] = new[] { "sand", "glass", "cracked", "rubble" },
            ["rail_corridor"] = new[] { "grass_dry", "scrub_soil", "gravel", "rock" },
            ["drowned_shore"] = new[] { "coast", "mud", "grass_dry", "rock" },
            ["meridian"] = new[] { "rubble", "asphalt", "mud", "concrete" },
            ["teeth"] = new[] { "grass_dry", "gravel", "snow", "rock" },
            ["ashlands"] = new[] { "burned", "cracked", "rubble", "rock" },
            ["northern_wet"] = new[] { "grass", "mud", "forest", "rock" },
        };

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

        /// <summary>
        /// Role weights for every alpha texel of a chunk (AlphaResolution² × 4, row-major from the south-west, weights
        /// summing to 1), from the chunk's heights (<see cref="TerrainGen.Heights"/>): steep where the slope is over
        /// ~30°, accent in the lowest ground of its surroundings and where water is near, patches by noise.
        /// </summary>
        public static float[] Weights(ControlMap control, float[] heights, int cx, int cz, int seed = 1909)
        {
            const int n = TerrainGen.Resolution, a = AlphaResolution;
            var (x0, z0) = WorldGrid.Origin(cx, cz);
            var w = new float[a * a * Roles];
            var texel = WorldGrid.Chunk / a;
            for (var j = 0; j < a; j++)
                for (var i = 0; i < a; i++)
                {
                    float x = x0 + (i + 0.5f) * texel, z = z0 + (j + 0.5f) * texel;
                    // height samples are 2 m apart: the alpha texel's centre lies between four of them
                    float fi = (i + 0.5f) * texel / TerrainGen.Step, fj = (j + 0.5f) * texel / TerrainGen.Step;
                    int hi = Math.Min(n - 2, (int)fi), hj = Math.Min(n - 2, (int)fj);
                    float h00 = heights[hj * n + hi], h10 = heights[hj * n + hi + 1], h01 = heights[(hj + 1) * n + hi], h11 = heights[(hj + 1) * n + hi + 1];
                    float gx = ((h10 - h00) + (h11 - h01)) / (2 * TerrainGen.Step), gz = ((h01 - h00) + (h11 - h10)) / (2 * TerrainGen.Step);
                    var slope = (float)Math.Sqrt(gx * gx + gz * gz);   // rise over run
                    var c = control.Sample(x, z);
                    var steep = Smooth((slope - 0.45f) / 0.3f);
                    var patch = Smooth((Noise.Fbm(x / 40f, z / 40f, seed + 3, 3) + 0.1f) / 0.35f);
                    var low = Smooth((Noise.Fbm(x / 140f, z / 140f, seed + 5, 2) - 0.15f) / 0.3f) * (1 - Smooth(slope / 0.25f));
                    var accent = Math.Max(low, Smooth((c.Water - 0.05f) / 0.3f));
                    var rest = 1 - steep;
                    var k = (j * a + i) * Roles;
                    w[k + 3] = steep;
                    w[k + 2] = rest * accent;
                    w[k + 1] = rest * (1 - accent) * patch;
                    w[k + 0] = rest * (1 - accent) * (1 - patch);
                }
            return w;
        }

        private static float Smooth(float t) { t = Math.Clamp(t, 0f, 1f); return t * t * (3 - 2 * t); }
    }
}
