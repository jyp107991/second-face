using System;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class ScatterTests
    {
        private static ScatterRule Rule(string group) => Scatter.Sallow.Single(r => r.Group == group);
        private static GroundSample G(float height = 0.3f, float slope = 0.1f, float wash = 0f, float noise = 0.8f) => new GroundSample(height, slope, wash, noise);

        [Test]
        public void SallowRulesNameOnlyBakedModels()
        {
            var manifest = FindManifest();
            var baked = JObject.Parse(File.ReadAllText(manifest)).Properties().Select(p => p.Name).ToHashSet();
            foreach (var rule in Scatter.Sallow)
                foreach (var m in rule.Models)
                    Assert.That(baked, Does.Contain(m), $"{rule.Group} scatters {m}, which models_bake.py has not baked");
        }

        [Test]
        public void TreesKeepOffSteepGroundTheWashAndTheHeights()
        {
            var trees = Rule("Trees");
            Assert.That(trees.Accepts(G()), Is.True);
            Assert.That(trees.Accepts(G(slope: 0.5f)), Is.False);
            Assert.That(trees.Accepts(G(wash: 0.6f)), Is.False);
            Assert.That(trees.Accepts(G(height: 0.8f)), Is.False);
            Assert.That(trees.Accepts(G(noise: 0.2f)), Is.False, "trees grow in clumps, not as an even sprinkle");
        }

        [Test]
        public void WashTreesGrowOnlyInTheWash()
        {
            var wash = Rule("WashTrees");
            Assert.That(wash.Accepts(G(wash: 0.8f)), Is.True);
            Assert.That(wash.Accepts(G(wash: 0.1f)), Is.False);
        }

        [Test]
        public void BouldersLieOnSteepGroundButNotInTheWash()
        {
            var boulders = Rule("Boulders");
            Assert.That(boulders.Accepts(G(slope: 0.6f, noise: 0.1f)), Is.True);
            Assert.That(boulders.Accepts(G(slope: 0.6f, wash: 0.8f)), Is.False);
        }

        [Test]
        public void PlacementIsTheSameForTheSameSeed()
        {
            var rule = Rule("Scrub");
            Func<float, float, GroundSample> ground = (u, v) => G(noise: (u + v) / 2f);
            var a = Scatter.Place(rule, ground, 5, new Random(7));
            var b = Scatter.Place(rule, ground, 5, new Random(7));
            var c = Scatter.Place(rule, ground, 5, new Random(8));
            Assert.That(a.Count, Is.GreaterThan(0));
            Assert.That(b.Select(p => (p.U, p.V, p.Model, p.Yaw, p.Scale)), Is.EqualTo(a.Select(p => (p.U, p.V, p.Model, p.Yaw, p.Scale))));
            Assert.That(c.Select(p => (p.U, p.V)), Is.Not.EqualTo(a.Select(p => (p.U, p.V))));
        }

        [Test]
        public void PlacementsStayOnTheSquareWithinTheRulesScaleAndModels()
        {
            foreach (var rule in Scatter.Sallow)
            {
                var placed = Scatter.Place(rule, (u, v) => G(slope: v * 0.6f, wash: u, noise: 0.9f), rule.Models.Count, new Random(3));
                foreach (var p in placed)
                {
                    Assert.That(p.U, Is.InRange(0f, 1f)); Assert.That(p.V, Is.InRange(0f, 1f));
                    Assert.That(p.Scale, Is.InRange(rule.ScaleMin, rule.ScaleMax), rule.Group);
                    Assert.That(p.Model, Is.InRange(0, rule.Models.Count - 1));
                    Assert.That(rule.Accepts(G(slope: p.V * 0.6f, wash: p.U, noise: 0.9f)), Is.True, $"{rule.Group} placed where its rule says no");
                }
            }
        }

        [Test]
        public void NoModelsMeansNoPlacements() => Assert.That(Scatter.Place(Rule("Trees"), (u, v) => G(), 0, new Random(1)), Is.Empty);

        private static string FindManifest()
        {
            foreach (var start in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
            {
                for (var dir = new DirectoryInfo(start); dir != null; dir = dir.Parent)
                    foreach (var rel in new[] { "unity/Assets/SecondFace/Models/Nature/models.json", "Assets/SecondFace/Models/Nature/models.json" })
                    {
                        var p = Path.Combine(dir.FullName, rel);
                        if (File.Exists(p)) return p;
                    }
            }
            throw new FileNotFoundException("models.json not found (tools/unity/models_bake.py writes it)");
        }
    }
}
