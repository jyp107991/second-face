using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>The plausibility gate's 3D half in Core (owner, pass 10; docs/PEOPLE_REALISM.md §3-4): every adult's head
    /// and neck measures, as the bases' measured response predicts them, inside the region that holds the real people of
    /// their sex and ancestry (ANSUR II: the joint check, R3), and their faces' proportions inside the real faces'; the people
    /// of one group as varied as real ones; grey hair only from 55.</summary>
    public class ProportionsTests
    {
        private static readonly string[] Clusters =
        {
            "west_african", "east_african", "north_european", "mediterranean", "south_asian", "east_asian", "southeast_asian",
            "indigenous_american", "latin_american",
        };

        private static IEnumerable<(string Id, bool Male, double Age, string Cluster, PlayerLook Look)> People(int each)
        {
            foreach (var c in Clusters)
                foreach (var male in new[] { false, true })
                    for (var i = 0; i < each; i++)
                    {
                        var age = 18 + i * 53.0 / Math.Max(1, each - 1);
                        var id = $"npc_prop_{c}_{(male ? "m" : "f")}_{i}";
                        yield return (id, male, age, c, Bodies.For(id, male, age, "settler", ancestry: c));
                    }
        }

        [Test]
        public void TargetsAreRealPeople()
        {
            // every target inside the region that holds 97.5 % of the group's real people, with the model's room; and the
            // draws as spread as real people (only the few past the region are drawn in: R3, where each measure's own
            // percentiles with margins had narrowed the draws)
            foreach (var c in Clusters)
                foreach (var male in new[] { false, true })
                {
                    var g = ProportionsData.Groups[Proportions.Group(male, c)];
                    var inside = 0;
                    for (var i = 0; i < 200; i++)
                    {
                        var stature = (male ? 1650 : 1530) + i % 25 * 10.0;
                        var d = Proportions.Joint(Proportions.Target(male, c, stature, (uint)(i * 7919 + 1)), g);
                        Assert.That(d, Is.LessThanOrEqualTo(g.Joint - Proportions.Room3 + 1e-9), $"{c} {(male ? "m" : "f")}");
                        if (d < g.Joint - Proportions.Room3 - 1e-6) inside++;
                    }
                    Assert.That(inside, Is.GreaterThan(180), $"{c} {(male ? "m" : "f")}: draws taken in");
                }
        }

        [Test]
        public void EveryAdultIsInTheRealRange()
        {
            // the gate at the source (Proportions.Miss: the head and neck and the face's proportions inside the regions that
            // hold the real people, with room for the model's error): the people who pass it, and how far the rest miss (a
            // draw that cannot be brought inside in Attempts tries keeps the closest; the real gate, tools/unity/people/gate,
            // judges the renders)
            var all = People(12).ToList();
            var misses = all.Select(p => (p.Id, Miss: Proportions.Miss(p.Look, p.Male, p.Cluster, p.Age))).ToList();
            var inside = misses.Count(m => m.Miss <= 0);
            Assert.That(inside, Is.GreaterThanOrEqualTo((int)(0.9 * all.Count)), $"{inside} of {all.Count} inside");
            var worst = misses.OrderByDescending(m => m.Miss).First();
            Assert.That(worst.Miss, Is.LessThan(0.25), $"{worst.Id} misses by {worst.Miss:F3} of a limit");
        }

        [Test]
        public void PeopleOfOneGroupVaryAsRealOnes()
        {
            // the spread of each measure among one group's people near the real group's (none converge on one head), as the
            // model predicts them (the shapes' own limits narrow a few: East Asian women's cheek width, which the base cannot
            // widen apart from the skull)
            foreach (var c in new[] { "north_european", "west_african", "east_asian" })
                foreach (var male in new[] { false, true })
                {
                    var g = ProportionsData.Groups[Proportions.Group(male, c)];
                    var ms = Enumerable.Range(0, 300).Select(i =>
                    {
                        var id = $"npc_var_{c}_{male}_{i}";
                        return Proportions.Predict(Bodies.For(id, male, 30, "settler", ancestry: c), male);
                    }).ToList();
                    for (var k = 0; k < ProportionsData.Measures.Length; k++)
                    {
                        if (ProportionsData.Measures[k] == "stature") continue;
                        var mean = ms.Average(m => m[k]);
                        var sd = Math.Sqrt(ms.Average(m => (m[k] - mean) * (m[k] - mean)));
                        var real = Math.Sqrt(g.Cov[k * ProportionsData.Measures.Length + k]);
                        Assert.That(sd, Is.GreaterThan(0.5 * real), $"{c} {male} {ProportionsData.Measures[k]}: sd {sd:F1} against {real:F1}");
                    }
                }
        }

        [Test]
        public void AHeavyOrMuscledBodyHasAThickerNeck()
        {
            // ANSUR II: a man's neck is about 20 mm round thicker for each sd of body mass at his stature (r about 0.8), his
            // cheeks a little wider; ours, drawn given the body's mass, as the model predicts them: at least half that
            var neck = Array.IndexOf(ProportionsData.Measures, "neckcircumference");
            foreach (var c in new[] { "north_european", "west_african", "east_asian" })
            {
                var g = ProportionsData.Groups[Proportions.Group(true, c)];
                var zs = new List<double>();
                var ns = new List<double>();
                for (var i = 0; i < 300; i++)
                {
                    var look = Bodies.For($"npc_neck_{c}_{i}", true, 35, "settler", ancestry: c);
                    zs.Add(Proportions.Bmi(look));
                    ns.Add(Proportions.Predict(look, true)[neck]);
                }
                // the neck's girth against the body's mass: the slope of the least-squares line
                double mz = zs.Average(), mn = ns.Average();
                var slope = zs.Zip(ns, (z, n) => (z - mz) * (n - mn)).Sum() / zs.Sum(z => (z - mz) * (z - mz));
                Assert.That(slope, Is.GreaterThan(0.5 * g.Bmi[neck]), $"{c}: the neck with the body's mass ({slope:F1} mm per sd against {g.Bmi[neck]:F1})");
            }
        }

        [Test]
        public void NoGreyBefore55()
        {
            foreach (var p in People(24))
            {
                if (p.Age >= Bodies.GreyFrom) continue;
                Assert.That(p.Look.Grey, Is.EqualTo(0f), $"{p.Id} at {p.Age:F0}");
                Assert.That(p.Look.BeardGrey, Is.EqualTo(0f), $"{p.Id} at {p.Age:F0}");
            }
            // an authored grey on someone under 55 is not kept
            var look = Bodies.For("npc_grey_test", true, 40, "settler", ancestry: "north_european");
            var before = look.HairColour;
            var over = Newtonsoft.Json.Linq.JObject.Parse("{\"hair\": {\"color\": 10066329}}");
            Bodies.Over(look, over, 40);
            Assert.That(look.HairColour, Is.EqualTo(before));
        }
    }
}
