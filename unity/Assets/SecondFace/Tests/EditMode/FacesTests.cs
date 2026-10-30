using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>
    /// Faces from archetypes (owner, pass 9): features in coherent bundles by ancestry, sex, build and age, never a
    /// patchwork of independent sliders. The owner's own examples are the tests: a woman's big jaw, a muscular man's gaunt
    /// face, a black man's very thin lips and an Asian woman's blue eyes are each unlikely.
    /// </summary>
    public class FacesTests
    {
        private static List<Faces.Face> Draw(string cluster, bool male, int n, double age = 25, double build = 0, double muscle = 0, uint seed = 11)
        {
            var rng = new Rng(seed);
            return Enumerable.Range(0, n).Select(_ => Faces.Draw(rng, new Faces.Who { Male = male, Cluster = cluster, Age = age, Build = build, Muscle = muscle })).ToList();
        }

        private static double Mean(IEnumerable<Faces.Face> faces, string id) => faces.Average(f => f.Values[id]);

        [Test]
        public void EveryFaceCarriesEverySliderWithinItsSexsRange()
        {
            foreach (var male in new[] { false, true })
            foreach (var (cluster, _) in Bodies.Clusters)
            foreach (var f in Draw(cluster, male, 60))
            {
                Assert.That(f.Values.Keys, Is.EquivalentTo(Sculpt.Sliders.Select(s => s.Id)));
                foreach (var s in Sculpt.Sliders.Where(x => x.Paired))
                {
                    var (lo, hi) = Sculpt.Range(s.Id, male);
                    Assert.That(f.Values[s.Id], Is.InRange(lo - 1e-3f, hi + 1e-3f), $"{cluster} {(male ? "m" : "f")} {s.Id}");
                }
                Assert.That(Faces.Types, Does.Contain(f.Type));
            }
        }

        [Test]
        public void AWomansJawIsAWomansAndAMansAMans()
        {
            foreach (var (cluster, _) in Bodies.Clusters)
            {
                var women = Draw(cluster, false, 200);
                var men = Draw(cluster, true, 200);
                Assert.That(women.All(f => f.Values["chin-bones"] <= 0.15f && f.Values["brow-ridge"] <= 0.15f), Is.True, $"no big jaw or brow ridge on a woman ({cluster})");
                Assert.That(Mean(men, "chin-bones") - Mean(women, "chin-bones"), Is.GreaterThan(0.6), cluster);
                Assert.That(Mean(men, "brow-ridge") - Mean(women, "brow-ridge"), Is.GreaterThan(0.6), cluster);
                Assert.That(Mean(women, "mouth-upperlip-volume") - Mean(men, "mouth-upperlip-volume"), Is.GreaterThan(0.3), cluster);
                Assert.That(Mean(women, "eye-scale") - Mean(men, "eye-scale"), Is.GreaterThan(0.3), cluster);
                Assert.That(women.Count(f => f.Values["head-square"] > 0.3f || f.Values["head-triangular"] > 0.25f), Is.EqualTo(0), cluster);
            }
        }

        [Test]
        public void PeoplesDifferAsTheyDoInLife()
        {
            foreach (var male in new[] { false, true })
            {
                var west = Draw("west_african", male, 300);
                var north = Draw("north_european", male, 300);
                var east = Draw("east_asian", male, 300);
                // broad, flared, low noses and full lips carried forward against narrow, projecting noses and thin lips
                Assert.That(Mean(west, "nose-scale-horiz") - Mean(north, "nose-scale-horiz"), Is.GreaterThan(0.6));
                Assert.That(Mean(west, "nose-flaring") - Mean(north, "nose-flaring"), Is.GreaterThan(0.6));
                Assert.That(Mean(north, "nose-scale-depth") - Mean(west, "nose-scale-depth"), Is.GreaterThan(0.6));
                Assert.That(Mean(west, "mouth-upperlip-volume") - Mean(north, "mouth-upperlip-volume"), Is.GreaterThan(0.6));
                Assert.That(Mean(west, "mouth-trans") - Mean(north, "mouth-trans"), Is.GreaterThan(0.5));
                // the fold, a low crease and a low bridge
                Assert.That(Mean(east, "eye-epicanthus") - Mean(north, "eye-epicanthus"), Is.GreaterThan(0.4));
                Assert.That(Mean(north, "eye-eyefold") - Mean(east, "eye-eyefold"), Is.GreaterThan(0.4));
                Assert.That(Mean(north, "nose-scale-depth") - Mean(east, "nose-scale-depth"), Is.GreaterThan(0.7));
                Assert.That(Mean(north, "brow-ridge") - Mean(east, "brow-ridge"), Is.GreaterThan(0.5));
                // and within a people, the spread is small next to the gaps between peoples
                var spread = Math.Sqrt(west.Average(f => Math.Pow(f.Values["mouth-upperlip-volume"] - Mean(west, "mouth-upperlip-volume"), 2)));
                Assert.That(spread, Is.LessThan(0.25), "a people's own spread");
            }
            // the owner's example: a black man with very thin lips is unlikely
            var men = Draw("west_african", true, 500, seed: 3);
            Assert.That(men.Count(f => f.Values["mouth-upperlip-volume"] < 0f), Is.LessThan(10));
        }

        [Test]
        public void AMuscledManIsNeverGauntAndAHeavyFaceIsFull()
        {
            foreach (var (cluster, _) in Bodies.Clusters)
            {
                var strong = Draw(cluster, true, 200, build: -0.3, muscle: 0.7);
                Assert.That(strong.Count(f => f.Values["cheek-volume"] < -0.45f || f.Values["forehead-temple"] < -0.3f), Is.LessThan(10), $"a muscled man's face is hardly ever gaunt: fewer than one in twenty ({cluster})");
                Assert.That(Mean(strong, "neck-scale-horiz"), Is.GreaterThan(0.45), cluster);
                var lean = Draw(cluster, true, 200, build: -0.9, muscle: -0.4);
                Assert.That(Mean(lean, "cheek-volume"), Is.LessThan(Mean(strong, "cheek-volume") - 0.2), "the hungry and lean are the hollow-cheeked");
                var heavy = Draw(cluster, false, 200, build: 0.9);
                Assert.That(Mean(heavy, "head-fat") - Mean(lean, "head-fat"), Is.GreaterThan(0.6));
                Assert.That(Mean(heavy, "neck-double"), Is.GreaterThan(0.15));
            }
        }

        [Test]
        public void FacesShowTheirYearsAndAHardLifeSooner()
        {
            var young = Draw("mediterranean", false, 200, age: 22);
            var old = Draw("mediterranean", false, 200, age: 62);
            Assert.That(Mean(old, "eye-bag") - Mean(young, "eye-bag"), Is.GreaterThan(0.45));
            Assert.That(Mean(young, "nose-point") - Mean(old, "nose-point"), Is.GreaterThan(0.35), "the tip drops");
            Assert.That(Mean(young, "mouth-upperlip-volume") - Mean(old, "mouth-upperlip-volume"), Is.GreaterThan(0.3), "lips thin");
            Assert.That(Mean(old, "mouth-laugh-lines") - Mean(young, "mouth-laugh-lines"), Is.GreaterThan(0.5));
            Assert.That(Faces.Apparent(40, 1), Is.GreaterThan(Faces.Apparent(40, 0) + 5), "a hard life shows");
            Assert.That(Faces.Apparent(40, -0.3), Is.LessThan(40), "a sheltered one less");
        }

        [Test]
        public void TheStrikingAreCloserToTheirPeoplesFace()
        {
            var rng = new Rng(5);
            var plain = new List<Faces.Face>();
            var striking = new List<Faces.Face>();
            for (var i = 0; i < 300; i++)
            {
                plain.Add(Faces.Draw(rng, new Faces.Who { Male = false, Cluster = "south_asian", Attractive = 0.1 }, "oval"));
                striking.Add(Faces.Draw(rng, new Faces.Who { Male = false, Cluster = "south_asian", Attractive = 0.95 }, "oval"));
            }
            double Spread(List<Faces.Face> fs) => Sculpt.Sliders.Where(s => s.Paired).Average(s =>
            {
                var m = fs.Average(f => f.Values[s.Id]);
                return fs.Average(f => Math.Abs(f.Values[s.Id] - m));
            });
            Assert.That(Spread(striking), Is.LessThan(Spread(plain) * 0.75), "an average face is a handsome one");
            Assert.That(Mean(striking, "eye-scale"), Is.GreaterThan(Mean(plain, "eye-scale")));
        }

        [Test]
        public void TwoPeoplesBlendAndTheStructureFollowsSexAndPeople()
        {
            var rng = new Rng(9);
            var mixed = Enumerable.Range(0, 300).Select(_ => Faces.Draw(rng, new Faces.Who { Male = false, Cluster = "west_african", Second = "east_asian", Share = 0.5 })).ToList();
            var west = Draw("west_african", false, 300);
            var east = Draw("east_asian", false, 300);
            var m = Mean(mixed, "nose-scale-depth");
            Assert.That(m, Is.InRange(Math.Min(Mean(west, "nose-scale-depth"), Mean(east, "nose-scale-depth")), Math.Max(Mean(west, "nose-scale-depth"), Mean(east, "nose-scale-depth"))));
            var women = Draw("east_african", false, 600);
            var men = Draw("east_african", true, 600);
            Assert.That(women.Count(f => f.Type == "heart"), Is.GreaterThan(men.Count(f => f.Type == "heart") * 2));
            Assert.That(women.Count(f => f.Type == "long"), Is.GreaterThan(women.Count / 4), "long faces among the east African");
            Assert.That(Draw("north_european", true, 400).Count(f => f.Type == "long"), Is.GreaterThan(Draw("southeast_asian", true, 400).Count(f => f.Type == "long")));
        }

        [Test]
        public void ThePeopleOfTheReachAreBuiltFromTheirArchetypes()
        {
            // the owner's example: an Asian woman with blue eyes is unlikely (light eyes are recessive, rare where they are)
            var asian = Enumerable.Range(0, 600).Select(i => Bodies.For("npc_t_ea_" + i, false, 30, "settler", ancestry: "east_asian")).ToList();
            Assert.That(asian.Count(l => l.Eyes == "blue" || l.Eyes == "grey" || l.Eyes == "green" || l.Eyes == "blue_grey"), Is.LessThan(12));
            Assert.That(asian.All(l => l.Heritage == "east_asian"), Is.True);
            var north = Enumerable.Range(0, 300).Select(i => Bodies.For("npc_t_ne_" + i, true, 30, "settler", ancestry: "north_european")).ToList();
            var west = Enumerable.Range(0, 300).Select(i => Bodies.For("npc_t_wa_" + i, true, 30, "settler", ancestry: "west_african")).ToList();
            Assert.That(west.Average(l => l.Face["nose-flaring"]) - north.Average(l => l.Face["nose-flaring"]), Is.GreaterThan(0.6));
            // a labourer's face older than a rich merchant's of the same years
            var hard = Enumerable.Range(0, 200).Select(i => Bodies.For("npc_t_h_" + i, true, 45, "labourer", Bodies.Means.Destitute)).ToList();
            var soft = Enumerable.Range(0, 200).Select(i => Bodies.For("npc_t_s_" + i, true, 45, "trader", Bodies.Means.Rich)).ToList();
            Assert.That(hard.Average(l => l.Shape["body-age"]), Is.GreaterThan(soft.Average(l => l.Shape["body-age"]) + 0.15));
            Assert.That(hard.Average(l => l.Face["eye-bag"]), Is.GreaterThan(soft.Average(l => l.Face["eye-bag"]) + 0.1));
        }

        [Test]
        public void AnotherFaceIsSomeoneElseOfTheSamePeople()
        {
            var c = new Core.Stats.Creation();
            var rng = new Rng(21);
            c.Heritage("south_asian", rng);
            Assert.That(c.Look.Heritage, Is.EqualTo("south_asian"));
            Assert.That(c.Look.Shape["body-caucasian"], Is.EqualTo(0.6f).Within(1e-4));
            for (var i = 0; i < 20; i++)
            {
                var before = new Dictionary<string, float>(c.Look.Face);
                c.NewFace(rng, before);
                Assert.That(Sculpt.Distance(before, c.Look.Face), Is.GreaterThanOrEqualTo(Faces.RedrawDistance));
            }
        }
    }
}
