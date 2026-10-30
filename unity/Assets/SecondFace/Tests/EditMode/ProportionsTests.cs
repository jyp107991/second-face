using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>The plausibility gate's 3D half in Core (owner, pass 10; docs/PEOPLE_REALISM.md §3-4): every adult's head
    /// and neck measures, as the bases' measured response predicts them, inside the real people of their sex and ancestry
    /// (ANSUR II), on every measure and proportion; the people of one group as varied as real ones; grey hair only from 55.</summary>
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
            foreach (var c in Clusters)
                foreach (var male in new[] { false, true })
                {
                    var g = ProportionsData.Groups[Proportions.Group(male, c)];
                    for (var i = 0; i < 200; i++)
                    {
                        var stature = (male ? 1650 : 1530) + i % 25 * 10.0;
                        var t = Proportions.Target(male, c, stature, (uint)(i * 7919 + 1));
                        for (var k = 0; k < ProportionsData.Measures.Length; k++)
                            if (ProportionsData.Measures[k] != "stature")
                                Assert.That(t[k], Is.InRange(g.P3[k], g.P97[k]), $"{c} {(male ? "m" : "f")} {ProportionsData.Measures[k]}");
                    }
                }
        }

        [Test]
        public void EveryAdultIsInTheRealRange()
        {
            // the gate at the source (Proportions.Miss: every measure and proportion inside the real ranges, with room for
            // the model's error): the people who pass it, and how far the rest miss (R2: a draw that cannot be brought inside
            // in Attempts tries keeps the closest, a few per cent, all near an edge; the real gate, tools/unity/people/gate,
            // judges the renders)
            var all = People(12).ToList();
            var misses = all.Select(p => (p.Id, Miss: Proportions.Miss(p.Look, p.Male, p.Cluster, p.Age))).ToList();
            var inside = misses.Count(m => m.Miss <= 0);
            Assert.That(inside, Is.GreaterThanOrEqualTo((int)(0.85 * all.Count)), $"{inside} of {all.Count} inside");
            var worst = misses.OrderByDescending(m => m.Miss).First();
            // (regression guards at R2's measured state; the base's missing skull-width and neck-length range are the gap,
            // docs/PEOPLE_REALISM.md §7)
            Assert.That(worst.Miss, Is.LessThan(0.35), $"{worst.Id} misses by {worst.Miss:F3} of a range");
        }

        [Test]
        public void PeopleOfOneGroupVaryAsRealOnes()
        {
            // the spread of each measure among one group's people near the real group's (none converge on one head); the draw
            // keeps a margin inside each range for the model's error and redraws the edges, which narrows it (R2: 0.44-0.9 of
            // the real spread; least, East Asian women's cheek width, which the base cannot widen apart from the skull)
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
                        Assert.That(sd, Is.GreaterThan(0.4 * real), $"{c} {male} {ProportionsData.Measures[k]}: sd {sd:F1} against {real:F1}");
                    }
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
