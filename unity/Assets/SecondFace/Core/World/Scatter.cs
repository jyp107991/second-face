using System;
using System.Collections.Generic;

namespace SecondFace.Core.World
{
    /// <summary>
    /// What the ground offers at a point, normalised: height and slope 0..1 (slope 1 = vertical), wash 0..1 (1 = the bed
    /// of a dry wash), noise 0..1 (the clump field that makes clumps and clearings instead of an even sprinkle).
    /// </summary>
    public readonly struct GroundSample
    {
        public readonly float Height, Slope, Wash, Noise;
        public GroundSample(float height, float slope, float wash, float noise) { Height = height; Slope = slope; Wash = wash; Noise = noise; }
    }

    /// <summary>One kind of scatter: which models, how many tries, where they may grow or lie, how much they vary in size.</summary>
    public sealed class ScatterRule
    {
        public string Group;
        public IReadOnlyList<string> Models;
        public int Tries;
        public float ScaleMin = 1f, ScaleMax = 1f;
        public Func<GroundSample, bool> Accepts;
    }

    /// <summary>One placed instance: where on the unit square, its yaw in degrees, its scale and which of the rule's models.</summary>
    public readonly struct Placement
    {
        public readonly float U, V, Yaw, Scale;
        public readonly int Model;
        public Placement(float u, float v, float yaw, float scale, int model) { U = u; V = v; Yaw = yaw; Scale = scale; Model = model; }
    }

    /// <summary>
    /// The scatter rules per biome (BUILD_PLAN §6.L, P3.4): biome × slope × height × wash × noise decide what grows or lies
    /// where; placement is deterministic for a seed, so a chunk regenerates the same at every load. The ground itself is
    /// sampled by the caller (a test terrain, later the world's chunks); scattered ground patches and grass detail are
    /// placed separately.
    /// </summary>
    public static class Scatter
    {
        /// <summary>The Sallow: the frontier's scrub desert of quiver trees, dead wood, scrub, boulders and stones, with
        /// small trees only along the dry washes.</summary>
        public static readonly IReadOnlyList<ScatterRule> Sallow = new[]
        {
            new ScatterRule { Group = "Trees", Models = new[] { "quiver_tree_01", "quiver_tree_02" }, Tries = 900, ScaleMin = 0.85f, ScaleMax = 1.25f,
                Accepts = g => g.Slope < 0.3f && g.Wash < 0.3f && g.Noise > 0.55f && g.Height < 0.5f },
            new ScatterRule { Group = "DeadWood", Models = new[] { "dead_quiver_trunk", "dead_tree_trunk", "dead_tree_trunk_02" }, Tries = 500, ScaleMin = 0.8f, ScaleMax = 1.2f,
                Accepts = g => g.Slope < 0.35f && g.Noise > 0.6f },
            new ScatterRule { Group = "WashTrees", Models = new[] { "tree_small_02" }, Tries = 300, ScaleMin = 0.8f, ScaleMax = 1.1f,
                Accepts = g => g.Wash > 0.5f && g.Slope < 0.25f },
            new ScatterRule { Group = "Scrub", Models = new[] { "shrub_01", "shrub_02", "shrub_03", "shrub_04", "wild_rooibos_bush" }, Tries = 6000, ScaleMin = 0.7f, ScaleMax = 1.3f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.35f },
            new ScatterRule { Group = "Boulders", Models = new[] { "namaqualand_boulder_02", "namaqualand_boulder_03", "boulder_01" }, Tries = 700, ScaleMin = 0.7f, ScaleMax = 1.4f,
                Accepts = g => (g.Slope > 0.25f || g.Noise > 0.72f) && g.Wash < 0.4f },
            new ScatterRule { Group = "Stones", Models = new[] { "namaqualand_boulders_01", "rock_07", "rock_09", "namaqualand_rocks_01", "namaqualand_stones_01" }, Tries = 3000, ScaleMin = 0.8f, ScaleMax = 1.3f,
                Accepts = g => g.Slope < 0.55f && g.Noise > 0.3f },
            new ScatterRule { Group = "Debris", Models = new[] { "dry_branches_medium_01", "tree_stump_01", "root_cluster_01" }, Tries = 900, ScaleMin = 0.8f, ScaleMax = 1.2f,
                Accepts = g => g.Slope < 0.4f && g.Noise > 0.5f },
        };

        /// <summary>The rules for a biome id; none for a biome without scatter yet.</summary>
        public static IReadOnlyList<ScatterRule> For(string biome) => biome == "sallow" ? Sallow : Array.Empty<ScatterRule>();

        /// <summary>
        /// Placements for one rule over the unit square: <see cref="ScatterRule.Tries"/> uniform points, each kept where the
        /// rule accepts the ground, with a model drawn from <paramref name="modelCount"/> (the variants actually loaded), a
        /// yaw and a scale. The same seed gives the same placements.
        /// </summary>
        public static List<Placement> Place(ScatterRule rule, Func<float, float, GroundSample> ground, int modelCount, Random rng)
        {
            var list = new List<Placement>();
            if (modelCount <= 0) return list;
            for (var t = 0; t < rule.Tries; t++)
            {
                float u = (float)rng.NextDouble(), v = (float)rng.NextDouble();
                if (!rule.Accepts(ground(u, v))) continue;
                var model = rng.Next(modelCount);
                var yaw = (float)rng.NextDouble() * 360f;
                var scale = rule.ScaleMin + (rule.ScaleMax - rule.ScaleMin) * (float)rng.NextDouble();
                list.Add(new Placement(u, v, yaw, scale, model));
            }
            return list;
        }
    }
}
