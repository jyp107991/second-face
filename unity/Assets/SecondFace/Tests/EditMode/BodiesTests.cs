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
        public void TheContentsLookOverridesTheDraw()
        {
            var look = Bodies.For("npc_x", true, 40, "guard");
            var over = Newtonsoft.Json.Linq.JObject.Parse("{\"hair\":{\"style\":\"cut_sidepart\",\"color\":1183243},\"scars\":[\"eye_scar\"],\"skinTone\":0.9,\"eyes\":\"bluegreen\",\"facialHair\":\"full_beard\"}");
            Bodies.Over(look, over);
            Assert.That(look.Hair, Is.EqualTo("sf_crop"), "a side part is cropped (the grooming rule)");
            Assert.That(look.HairColour, Is.EqualTo(1183243));
            Assert.That(look.Scar, Is.EqualTo("eye_line"));
            Assert.That(look.Skin, Is.GreaterThan(0.9f), "dark");
            Assert.That(look.Eyes, Is.EqualTo("grey_green"));
            Assert.That(Bodies.HairOf("bob02"), Is.EqualTo("sf_bun"));
            Assert.That(Bodies.HairOf("paint_shaved"), Is.EqualTo("buzz"));
            Assert.That(Bodies.HairOf("elvs_unkempt_french_braid"), Is.EqualTo("sf_braid"));
            Assert.That(Bodies.HairOf("long01"), Is.EqualTo("sf_matted"));
            Assert.That(Looks.Hair, Does.Contain(Bodies.HairOf("cut_quiff")));
        }

        [Test]
        public void PeopleComeInClustersAndEveryPlaceHasItsOwn()
        {
            // P4.14, the owner: people too homogeneous. Most people are mostly of one ancestry; the Reach's crowd has every
            // cluster in it; a place's community raises a few of them, differently from the next place's
            var crowd = Many(false, 400).Concat(Many(true, 400)).ToList();
            double Top(PlayerLook l) => Math.Max(l.Shape["body-african"], Math.Max(l.Shape["body-asian"], l.Shape["body-caucasian"]));
            Assert.That(crowd.Count(l => Top(l) >= 0.7) / (double)crowd.Count, Is.GreaterThan(0.6), "mostly of one ancestry");
            Assert.That(crowd.Count(l => l.Shape["body-african"] >= 0.7), Is.GreaterThan(80));
            Assert.That(crowd.Count(l => l.Shape["body-asian"] >= 0.7), Is.GreaterThan(80));
            Assert.That(crowd.Count(l => l.Shape["body-caucasian"] >= 0.7), Is.GreaterThan(80));
            var a = Bodies.Community(11u); var b = Bodies.Community(1234567u);
            Assert.That(a.Sum(), Is.EqualTo(1).Within(1e-6));
            Assert.That(a.Max(), Is.GreaterThan(0.25), "a community has its founders");
            Assert.That(Array.IndexOf(a, a.Max()) != Array.IndexOf(b, b.Max()) || Math.Abs(a.Max() - b.Max()) > 0.02, Is.True, "two places differ");
            var here = Enumerable.Range(0, 300).Select(i => Bodies.For($"x_here_{i}", i % 2 == 0, 30, "settler", community: a)).ToList();
            var there = Enumerable.Range(0, 300).Select(i => Bodies.For($"x_here_{i}", i % 2 == 0, 30, "settler", community: b)).ToList();
            Assert.That(here.Average(l => l.Shape["body-african"]) != there.Average(l => l.Shape["body-african"]) || here.Average(l => l.Shape["body-asian"]) != there.Average(l => l.Shape["body-asian"]), Is.True);
        }

        [Test]
        public void SkinHairAndEyesFollowAncestry()
        {
            var crowd = Many(false, 400).Concat(Many(true, 400)).ToList();
            Assert.That(crowd.Min(l => l.Skin), Is.LessThan(-0.6f), "very fair skins");
            Assert.That(crowd.Max(l => l.Skin), Is.GreaterThan(0.8f), "very dark skins");
            Assert.That(crowd.Count(l => l.Skin > -0.3f && l.Skin < 0.3f), Is.GreaterThan(100), "and every shade between");
            var fair = crowd.Where(l => l.Shape["body-caucasian"] >= 0.85).ToList();
            var dark = crowd.Where(l => l.Shape["body-african"] >= 0.85).ToList();
            Assert.That(fair.Average(l => l.Skin), Is.LessThan(dark.Average(l => l.Skin) - 0.8f));
            int Shade(PlayerLook l) => Array.IndexOf(Looks.HairColours, l.HairColour);
            Assert.That(fair.Count(l => Shade(l) >= 3 && Shade(l) <= 6), Is.GreaterThan(fair.Count / 5), "fair and red hair among the north European");
            Assert.That(dark.Count(l => Shade(l) >= 3 && Shade(l) <= 6), Is.EqualTo(0), "none elsewhere");
            Assert.That(dark.Count(l => l.Eyes == "blue" || l.Eyes == "green" || l.Eyes == "grey"), Is.LessThan(dark.Count / 20));
        }

        [Test]
        public void ChildrenAreChildren()
        {
            var boy = Bodies.For("npc_boy", true, 8, "settler");
            var girl = Bodies.For("npc_girl", false, 12, "settler");
            var youth = Bodies.For("npc_youth", true, 15, "labourer");
            var grown = Bodies.For("npc_grown", false, 18, "settler");
            Assert.That(boy.Stature, Is.EqualTo(Bodies.Growth(true, 8)).Within(Bodies.Growth(true, 8) * 0.12));
            Assert.That(boy.Stature, Is.LessThan(140));
            Assert.That(boy.Shape["body-child"], Is.EqualTo(1f));
            Assert.That(boy.Beard, Is.Null);
            Assert.That(boy.Tattoo, Is.Null);
            Assert.That(boy.Build, Is.LessThan(0f));
            Assert.That(girl.Shape["body-child"], Is.GreaterThan(0.6f));
            Assert.That(girl.Shape["body-bust"], Is.LessThanOrEqualTo(-girl.Shape["body-child"]), "no bust on a girl");
            Assert.That(girl.Stature, Is.LessThan(165));
            Assert.That(youth.Shape["body-child"], Is.GreaterThan(0f).And.LessThan(0.5f));
            Assert.That(grown.Shape.ContainsKey("body-child"), Is.False);
            Assert.That(Bodies.Growth(true, 17.5), Is.EqualTo(Bodies.ManMean).Within(1));
            Assert.That(Bodies.Growth(false, 17.5), Is.EqualTo(Bodies.WomanMean).Within(1));
        }

        [Test]
        public void WomensFiguresAreOfEveryTypeAndBreastsVary()
        {
            // P4.14, the owner: not all pears; real breasts. The figure types at their real shares, hips not wide by
            // default; the set, spacing, shape and fullness of the breasts spread
            var women = Many(false, 600);
            var wideHips = women.Count(l => l.Shape["body-hips"] > 0.3f) / (double)women.Count;
            Assert.That(wideHips, Is.LessThan(0.4), "not all pears");
            Assert.That(women.Count(l => l.Shape["body-vshape"] > 0.25f), Is.GreaterThan(30), "some inverted triangles");
            Assert.That(women.Count(l => l.Shape["body-waist"] < -0.3f && l.Shape["body-hips"] > 0.1f), Is.GreaterThan(30), "some hourglasses");
            Assert.That(women.Count(l => l.Shape["body-waist"] > 0.3f), Is.GreaterThan(20), "some apples");
            var shares = Bodies.FigureShare(0);
            Assert.That(shares.Sum(), Is.EqualTo(1).Within(1e-6));
            Assert.That(Bodies.FigureShare(0.4)[4], Is.GreaterThan(shares[4]), "apples with weight");
            foreach (var key in new[] { "body-lift", "body-spacing", "body-point", "body-fullness" })
            {
                var (_, sd) = Stats(women.Select(l => (double)l.Shape[key]));
                Assert.That(sd, Is.GreaterThan(0.2), key);
            }
            Assert.That(women.Where(l => l.Shape["body-bust"] > 0.5f).Average(l => l.Shape["body-lift"]), Is.LessThan(women.Where(l => l.Shape["body-bust"] < -0.3f).Average(l => l.Shape["body-lift"])), "a full bust sits lower");
            var men = Many(true, 300, "guard");
            Assert.That(men.All(l => !l.Shape.ContainsKey("body-lift") && !l.Shape.ContainsKey("body-bust")), Is.True);
            Assert.That(men.Average(l => l.Shape["body-pecs"]), Is.GreaterThan(Many(true, 300, "trader").Average(l => l.Shape["body-pecs"])), "pectorals with the work");
        }

        [Test]
        public void AWomansFaceIsNeverAMans()
        {
            var women = Many(false, 300);
            var men = Many(true, 300);
            Assert.That(women.All(l => l.Face["chin-bones"] <= 0.15f && l.Face["neck-scale-horiz"] <= 0.1f && l.Face["chin-width"] <= 0.2f), Is.True, "no square jaw or thick neck on a woman");
            Assert.That(women.All(l => !l.Face.ContainsKey("head-square") || l.Face["head-square"] <= 0.3f), Is.True);
            Assert.That(men.Count(l => l.Face["chin-bones"] > 0.4f), Is.GreaterThan(25), "men with a jaw");
            Assert.That(women.Count(l => l.Face["chin-bones"] < -0.4f), Is.GreaterThan(25), "women with a fine one");
            Assert.That(women.Select(l => string.Join(",", l.Face.OrderBy(kv => kv.Key).Select(kv => kv.Value.ToString("0.00")))).Distinct().Count(), Is.EqualTo(women.Count), "every face its own");
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
