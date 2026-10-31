using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>
    /// The Reach's peoples beyond the face (owner, pass 9: aesthetic diversity as it occurs in life along ancestry, sex and
    /// age; docs/PEOPLE_RESEARCH.md §6): each regularity of the catalogue held over a crowd, so a later change cannot
    /// quietly flatten it.
    /// </summary>
    public class PeoplesTests
    {
        private static List<PlayerLook> Crowd(string ancestry, bool male, double age, int n = 300, string role = "settler", Bodies.Means? means = null) =>
            Enumerable.Range(0, n).Select(i => Bodies.For($"npc_pt_{ancestry}_{(male ? "m" : "f")}_{age}_{role}_{means}_{i}", male, age, role, means, ancestry)).ToList();

        private static double Share(IEnumerable<PlayerLook> c, Func<PlayerLook, bool> f) { var l = c.ToList(); return l.Count(f) / (double)l.Count; }

        [Test]
        public void StatureAndProportionsFollowPeopleAndChildhood()
        {
            var tall = Crowd("north_european", true, 30);
            var short_ = Crowd("southeast_asian", true, 30);
            Assert.That(tall.Average(l => l.Stature) - short_.Average(l => l.Stature), Is.GreaterThan(5));
            var poor = Crowd("mediterranean", true, 30, means: Bodies.Means.Destitute);
            var rich = Crowd("mediterranean", true, 30, means: Bodies.Means.Rich);
            Assert.That(rich.Average(l => l.Stature) - poor.Average(l => l.Stature), Is.GreaterThan(3), "a hungry childhood shows in the stature");
            Assert.That(Crowd("west_african", false, 30).Average(l => l.Shape["body-legs"]) - Crowd("east_asian", false, 30).Average(l => l.Shape["body-legs"]),
                Is.GreaterThan(0.4), "longer legs to the trunk in African ancestry");
            var nilotic = Crowd("east_african", true, 30);
            var andean = Crowd("indigenous_american", true, 30);
            Assert.That(andean.Average(l => l.Shape["body-chest"]) - nilotic.Average(l => l.Shape["body-chest"]), Is.GreaterThan(0.15), "broad chests and slender builds");
        }

        [Test]
        public void WomensFiguresAndFatFollowTheirPeople()
        {
            var ea = Crowd("east_asian", false, 30, 500);
            var wa = Crowd("west_african", false, 30, 500);
            Assert.That(Share(ea, l => l.Figure == "straight"), Is.GreaterThan(Share(wa, l => l.Figure == "straight") + 0.12));
            Assert.That(Share(wa, l => l.Figure == "pear" || l.Figure == "hourglass"), Is.GreaterThan(Share(ea, l => l.Figure == "pear" || l.Figure == "hourglass") + 0.12));
            Assert.That(wa.Average(l => l.Shape["body-seat"]), Is.GreaterThan(ea.Average(l => l.Shape["body-seat"]) + 0.15));
            var sa = Crowd("south_asian", true, 40, 300, "trader", Bodies.Means.Comfortable);
            var ne = Crowd("north_european", true, 40, 300, "trader", Bodies.Means.Comfortable);
            Assert.That(sa.Average(l => l.Shape["body-belly"]), Is.GreaterThan(ne.Average(l => l.Shape["body-belly"]) + 0.05), "fat carried on the belly sooner");
        }

        [Test]
        public void HairTakesThePeoplesFormAndGreysOnTheirClock()
        {
            var coily = Crowd("west_african", true, 25);
            Assert.That(Share(coily, l => l.Hair is "buzz" or "sf_coils" or "sf_matted" or "sf_cornrows" or "sf_braid"), Is.GreaterThan(0.95), "coily hair cropped close, coiled, locked or braided");
            Assert.That(Share(coily, l => l.Hair == "sf_crop"), Is.EqualTo(0), "never the straight crop");
            Assert.That(Share(Crowd("north_european", true, 25), l => l.Hair is "sf_coils" or "sf_cornrows"), Is.EqualTo(0), "and coils only where hair coils");
            var straight = Crowd("east_asian", false, 25);
            Assert.That(Share(straight, l => l.Hair is "sf_bun" or "sf_braid" or "sf_bun_loose" or "sf_braid_loose"), Is.GreaterThan(0.5));
            Assert.That(Share(straight, l => l.Hair is "sf_bun_loose" or "sf_braid_loose"), Is.GreaterThan(0.3), "most tied hair with strands loose round the face");
            bool Greyed(PlayerLook l) => Array.IndexOf(Looks.HairColours, l.HairColour) < 0 || Array.IndexOf(Looks.HairColours, l.HairColour) >= 7;
            Assert.That(Share(Crowd("north_european", false, 26), Greyed), Is.LessThan(0.03), "no grey at twenty-six");
            // (no grey at all before 55, the owner's rule: Bodies.GreyFrom; the peoples' clocks show after it)
            Assert.That(Share(Crowd("north_european", true, 54), Greyed), Is.EqualTo(0), "no grey before fifty-five");
            // how grey, on average, at sixty-five (the people's greying fully in, Bodies.GreyRamp): the peoples differ in how
            // much
            var ne = Crowd("north_european", true, 65).Average(l => l.Grey);
            var wa = Crowd("west_african", true, 65).Average(l => l.Grey);
            var ea = Crowd("east_asian", true, 65).Average(l => l.Grey);
            Assert.That(ne, Is.GreaterThan(wa + 0.15), $"Europeans grey first ({ne:F2} against {wa:F2})");
            Assert.That(ea, Is.InRange(wa, ne), "Asians between");
            Assert.That(Peoples.Grey(50, 34, 34), Is.LessThan(0.5), "at fifty most are not yet half grey (Panhard 2012)");
        }

        [Test]
        public void MenBaldByTheirPeoplesRateAndTheirYears()
        {
            double Bald(string a, double age) => Share(Crowd(a, true, age, 400), l => l.Bald > 0);
            Assert.That(Bald("north_european", 25), Is.LessThan(0.2));
            Assert.That(Bald("north_european", 60), Is.GreaterThan(0.55));
            Assert.That(Bald("east_asian", 60), Is.LessThan(Bald("north_european", 60) * 0.65), "about half the rate");
            Assert.That(Bald("indigenous_american", 60), Is.LessThan(Bald("east_asian", 60) + 0.05));
            Assert.That(Crowd("north_european", false, 60).All(l => l.Bald == 0), Is.True, "no pattern balding on a woman");
            Assert.That(Crowd("north_european", true, 60).Where(l => l.Bald > 0.45f).All(l => l.Hair == "buzz"), Is.True, "what is left is cropped close");
        }

        [Test]
        public void BeardsGrowAsTheyDoAmongAPeople()
        {
            var ea = Crowd("east_asian", true, 35, 500, "labourer");
            var me = Crowd("mediterranean", true, 35, 500, "labourer");
            Assert.That(Share(ea, l => l.Beard == "full_beard"), Is.LessThan(0.03), "few full beards where beards grow sparse");
            Assert.That(Share(ea, l => l.Beard == null), Is.GreaterThan(Share(me, l => l.Beard == null) + 0.2));
            Assert.That(Share(me, l => l.Beard == "full_beard" || l.Beard == "short_beard"), Is.GreaterThan(Share(ea, l => l.Beard == "full_beard" || l.Beard == "short_beard") * 3));
            var old = Crowd("mediterranean", true, 58, 300);
            Assert.That(Share(old.Where(l => l.Beard != null), l => l.BeardColour != 0), Is.GreaterThan(0.3), "the beard greys before the head");
            var ne = Crowd("north_european", true, 30, 500);
            Assert.That(ne.Count(l => l.BeardColour == Bodies.GreyShade(6, 0)), Is.GreaterThan(10), "red beards under brown hair");
        }

        [Test]
        public void BrowsSkinAndFrecklesFollowSexPeopleAndAge()
        {
            Assert.That(Share(Crowd("south_asian", true, 30), l => l.Brows == 2), Is.GreaterThan(Share(Crowd("east_asian", true, 30), l => l.Brows == 2) + 0.2), "dense brows");
            Assert.That(Share(Crowd("mediterranean", true, 65, 900), l => l.Brows == 2), Is.GreaterThan(Share(Crowd("mediterranean", true, 30, 900), l => l.Brows == 2) + 0.1), "bushy with the years");
            foreach (var a in new[] { "north_european", "west_african", "east_asian" })
                Assert.That(Crowd(a, false, 30, 900).Average(l => l.Skin), Is.LessThan(Crowd(a, true, 30, 900).Average(l => l.Skin) - 0.035), $"a woman a little lighter than the men of her people ({a}; the darkest tones meet the scale's end)");
            var fair = Crowd("north_european", false, 25, 800);
            var redheads = fair.Where(l => l.HairColour == Looks.HairColours[6]).ToList();
            Assert.That(redheads.Count, Is.GreaterThan(10));
            Assert.That(Share(redheads, l => l.Freckles > 0), Is.GreaterThan(0.7), "red hair and freckles go together");
            Assert.That(fair.All(l => Looks.BrowRgb(l) != 0), Is.True);
            Assert.That(Share(Crowd("east_asian", false, 25, 600), l => l.Freckles > 0), Is.LessThan(Share(fair, l => l.Freckles > 0) / 4), "freckles are the north European's");
            Assert.That(Share(Crowd("mediterranean", false, 55, 400), l => l.Hair == "buzz"), Is.EqualTo(0), "an older woman of straight or wavy hair does not shave her head");
        }

        [Test]
        public void TheContentsTagsAndColoursKeepTheRules()
        {
            Assert.That(Bodies.For("npc_pt_tag", false, 30, "settler", ancestry: "caucasian").Heritage, Is.EqualTo("north_european"), "the web game's broad tag");
            // an authored colour greys with the years as the people's own would
            var over = Newtonsoft.Json.Linq.JObject.Parse("{\"hair\": {\"color\": " + 0x202020 + "}}");
            var old = Bodies.Over(Bodies.For("npc_pt_old", true, 72, "settler", ancestry: "mediterranean"), (Newtonsoft.Json.Linq.JObject)over.DeepClone());
            var young = Bodies.Over(Bodies.For("npc_pt_young", true, 24, "settler", ancestry: "mediterranean"), (Newtonsoft.Json.Linq.JObject)over.DeepClone());
            Assert.That(young.HairColour, Is.EqualTo(0x202020));
            Assert.That(old.HairColour, Is.Not.EqualTo(0x202020), "black hair at seventy-two greys");
            var white = Newtonsoft.Json.Linq.JObject.Parse("{\"hair\": {\"color\": " + 0xc8c0b4 + "}}");
            Assert.That(Bodies.Over(Bodies.For("npc_pt_w", true, 72, "settler"), white).HairColour, Is.EqualTo(0xc8c0b4), "an authored grey stays");
            var blond = Newtonsoft.Json.Linq.JObject.Parse("{\"hair\": {\"color\": " + 0xb5a07a + "}}");
            var b = Bodies.Over(Bodies.For("npc_pt_b", false, 24, "settler", ancestry: "north_european"), blond);
            Assert.That(Looks.BrowRgb(b), Is.Not.EqualTo(0xb5a07a), "brows darker than blond hair");
        }

        [Test]
        public void AnAuthoredGreySaysHowGreyNotWhatColour()
        {
            // P4.15b, the owner: a brown man of fifty-five drawn with blond brows and beard. The content's grey hair leaves
            // the brows their own dark colour (they grey a decade or more later) and the beard its dark hairs, salt and
            // pepper, at least as grey as the head
            double Lum(int c) => (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) / 255.0;
            var grey = Newtonsoft.Json.Linq.JObject.Parse("{\"facialHair\": \"short_beard\", \"hair\": {\"color\": " + 0x8a8782 + "}}");
            var dark = 0;
            for (var i = 0; i < 40; i++)
            {
                var l = Bodies.Over(Bodies.For($"npc_pt_grey_{i}", true, 55, "labourer", ancestry: "south_asian"), (Newtonsoft.Json.Linq.JObject)grey.DeepClone());
                Assert.That(l.HairColour, Is.EqualTo(0x8a8782));
                if (Lum(Looks.BrowRgb(l)) < 0.35) dark++;   // black to a medium-dark brown
                Assert.That(Lum(Looks.BrowRgb(l)), Is.LessThan(0.45), "never pale brows at fifty-five");
                Assert.That(Lum(Looks.BeardPigment(l)), Is.LessThan(0.3), "the beard's own hairs dark brown or black");
                Assert.That(l.BeardGrey, Is.GreaterThanOrEqualTo(l.Grey - 0.001f), "the beard at least as grey as the head");
            }
            Assert.That(dark, Is.GreaterThanOrEqualTo(34), "dark brows under a grey head, for most (a few of the greyest greying)");
        }

        [Test]
        public void SkinShowsItsYearsByToneHeritageAndSex()
        {
            var fair = new PlayerLook { Body = "f", Skin = -0.7f, Heritage = "north_european" };
            var dark = new PlayerLook { Body = "f", Skin = 0.85f, Heritage = "west_african" };
            var asian = new PlayerLook { Body = "f", Skin = -0.4f, Heritage = "east_asian" };
            foreach (var l in new[] { fair, dark, asian }) l.Shape["body-age"] = 0.5f;
            Assert.That(Looks.SkinYears(fair) - Looks.SkinYears(dark), Is.GreaterThan(8), "darker skin lines about a decade later");
            Assert.That(Looks.SkinYears(asian), Is.LessThan(Looks.SkinYears(fair) - 3));
            var man = fair.Clone(); man.Body = "m";
            Assert.That(Looks.SkinYears(man), Is.GreaterThan(Looks.SkinYears(fair)));
        }
    }
}
