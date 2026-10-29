using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>The people of the Reach as bodies (P4.13, the owner's notes: bodies as varied as in life, skewing slim,
    /// heavy bodies for the comfortable): statures as people are, a woman's bust across its range, build by means and
    /// muscle by work, everyone the same each time.</summary>
    public class BodiesTests
    {
        private static List<PlayerLook> Many(bool male, int n, string role = "settler", double age = 30, Bodies.Means? means = null) =>
            Enumerable.Range(0, n).Select(i => Bodies.For($"npc_test_{(male ? "m" : "f")}_{role}_{i}", male, age, role, means)).ToList();

        private static (double Mean, double Sd) Stats(IEnumerable<double> xs)
        {
            var l = xs.ToList();
            var mean = l.Average();
            return (mean, Math.Sqrt(l.Sum(x => (x - mean) * (x - mean)) / l.Count));
        }

        [Test]
        public void StaturesAreAsPeopleAre()
        {
            var men = Stats(Many(true, 2000).Select(l => (double)l.Stature));
            var women = Stats(Many(false, 2000).Select(l => (double)l.Stature));
            Assert.That(men.Mean, Is.EqualTo(Bodies.ManMean).Within(1.0));
            Assert.That(women.Mean, Is.EqualTo(Bodies.WomanMean).Within(1.0));
            Assert.That(men.Sd, Is.EqualTo(Bodies.ManSd).Within(0.8));
            Assert.That(women.Sd, Is.EqualTo(Bodies.WomanSd).Within(0.8));
            var all = Many(true, 2000).Select(l => l.Stature).ToList();
            Assert.That(all.Min(), Is.GreaterThanOrEqualTo(Bodies.ManMean - 2.5 * Bodies.ManSd - 0.06));
            Assert.That(all.Max() - all.Min(), Is.GreaterThan(30), "short and tall men both");
            var old = Stats(Many(false, 500, age: 75).Select(l => (double)l.Stature));
            Assert.That(old.Mean, Is.LessThan(women.Mean - 1.5), "a little lost after 45");
        }

        [Test]
        public void TheSameIdIsTheSamePerson()
        {
            var a = Bodies.For("npc_shale_07", false, 34, "trader");
            var b = Bodies.For("npc_shale_07", false, 34, "trader");
            Assert.That(a.ToJson().ToString(), Is.EqualTo(b.ToJson().ToString()));
            var c = Bodies.For("npc_shale_08", false, 34, "trader");
            Assert.That(c.ToJson().ToString(), Is.Not.EqualTo(a.ToJson().ToString()));
        }

        [Test]
        public void AWomansBustRunsTheWholeRangeAndAMansHasNone()
        {
            var women = Many(false, 1000);
            var bust = women.Select(l => l.Shape["body-bust"]).ToList();
            Assert.That(bust.Count(v => v < -0.5f), Is.GreaterThan(50), "small");
            Assert.That(bust.Count(v => v > 0.5f), Is.GreaterThan(50), "full");
            var seat = women.Select(l => l.Shape["body-seat"]).ToList();
            Assert.That(seat.Max() - seat.Min(), Is.GreaterThan(1.2f), "seats from flat to full");
            var hips = women.Select(l => l.Shape["body-hips"]).ToList();
            Assert.That(hips.Max() - hips.Min(), Is.GreaterThan(1.0f));
            foreach (var m in Many(true, 200))
            {
                Assert.That(m.Shape.ContainsKey("body-bust"), Is.False);
                Assert.That(m.Shape.ContainsKey("body-firm"), Is.False);
                Assert.That(m.Body, Is.EqualTo("m"));
            }
            Assert.That(Sculpt.WomanOnly("body-bust") && Sculpt.WomanOnly("body-firm") && !Sculpt.WomanOnly("body-seat"), Is.True);
        }

        [Test]
        public void HeavyBodiesBelongToTheComfortable()
        {
            var working = Many(true, 500, "settler", 35, Bodies.Means.Working).Concat(Many(false, 500, "settler", 35, Bodies.Means.Working)).ToList();
            var rich = Many(true, 300, "gilded", 35).Concat(Many(false, 300, "gilded", 35)).ToList();
            var poor = Many(true, 300, "street", 35).Concat(Many(false, 300, "street", 35)).ToList();
            double Build(IEnumerable<PlayerLook> l) => l.Average(x => x.Build);
            Assert.That(Build(rich), Is.GreaterThan(Build(working) + 0.3));
            Assert.That(Build(working), Is.GreaterThan(Build(poor)));
            Assert.That(working.Count(l => l.Build > 0.5f) / (double)working.Count, Is.LessThan(0.03), "heavy is rare among the working");
            Assert.That(rich.Count(l => l.Build > 0.5f) / (double)rich.Count, Is.GreaterThan(0.25));
            Assert.That(poor.Average(l => l.Shape["body-belly"]), Is.LessThan(rich.Average(l => l.Shape["body-belly"])));
        }

        [Test]
        public void MuscleComesWithTheWork()
        {
            var guards = Many(true, 400, "guard");
            var clerks = Many(true, 400, "corp", means: Bodies.Means.Working);
            Assert.That(guards.Average(l => l.Muscle), Is.GreaterThan(clerks.Average(l => l.Muscle) + 0.15));
            Assert.That(guards.Average(l => l.Shape["body-shoulders"]), Is.GreaterThan(clerks.Average(l => l.Shape["body-shoulders"])));
            Assert.That(guards.Average(l => l.Shape["body-tone"]), Is.GreaterThan(clerks.Average(l => l.Shape["body-tone"])));
            var tone = Many(true, 1000).Select(l => l.Muscle).ToList();
            Assert.That(tone.Max() - tone.Min(), Is.GreaterThan(1.0f), "soft to hard worked");
        }

        [Test]
        public void AgeAndAncestryAreTheContentsWhenGiven()
        {
            var young = Bodies.For("npc_a", true, 20);
            var old = Bodies.For("npc_a", true, 70, ancestry: "west_african");
            Assert.That(young.Shape["body-age"], Is.EqualTo(0f));
            Assert.That(old.Shape["body-age"], Is.EqualTo(1f));
            Assert.That(old.Shape["body-african"], Is.EqualTo(0.95f).Within(1e-5));
            Assert.That(old.Shape["body-caucasian"], Is.EqualTo(0.05f).Within(1e-5));
            foreach (var l in Many(false, 300))
                Assert.That(l.Shape["body-african"] + l.Shape["body-asian"] + l.Shape["body-caucasian"], Is.EqualTo(1f).Within(1e-4), "a mix is whole");
            var grey = Many(true, 300, age: 68).Count(l => Array.IndexOf(Looks.HairColours, l.HairColour) >= 7);
            Assert.That(grey, Is.GreaterThan(200), "grey with the years");
            foreach (var l in Many(false, 300))
                Assert.That(Looks.Hair, Does.Contain(l.Hair), "the grooming rule");
        }

        [Test]
        public void TheBodysShapesReachTheSculptor()
        {
            var look = Bodies.For("npc_b", false, 40, "trader");
            look.Shape["not-a-body"] = 1f;
            var values = Looks.Shape(look);
            Assert.That(values.ContainsKey("not-a-body"), Is.False);
            Assert.That(values["body-bust"], Is.EqualTo(look.Shape["body-bust"]));
            Assert.That(values["body-weight"], Is.EqualTo(look.Build));
            var w = Sculpt.Weights(values).ToDictionary(x => x.Shape, x => x.Weight);
            var bust = look.Shape["body-bust"];
            Assert.That(bust >= 0 ? w["body-bust-incr"] : w["body-bust-decr"], Is.EqualTo(Math.Abs(bust) * 100f).Within(1e-3));
            Assert.That(w["body-age-incr"], Is.EqualTo(look.Shape["body-age"] * 100f).Within(1e-3));
            Assert.That(w.ContainsKey("body-african"), Is.True);
            var json = PlayerLook.From(look.ToJson());
            Assert.That(json.Stature, Is.EqualTo(look.Stature));
            Assert.That(json.Shape["body-seat"], Is.EqualTo(look.Shape["body-seat"]));
        }

        [Test]
        public void ToSliderMapsEachSideOfTheBase()
        {
            Assert.That(Bodies.ToSlider(0.25, 0.25, 0, 0.75), Is.EqualTo(0).Within(1e-9));
            Assert.That(Bodies.ToSlider(0, 0.25, 0, 0.75), Is.EqualTo(-1).Within(1e-9));
            Assert.That(Bodies.ToSlider(0.5, 0.25, 0, 0.75), Is.EqualTo(0.5).Within(1e-9));
            Assert.That(Bodies.ToSlider(2, 0.25, 0, 0.75), Is.EqualTo(1).Within(1e-9));
        }
    }
}
