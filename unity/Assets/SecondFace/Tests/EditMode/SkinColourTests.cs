using System;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>
    /// The skin's colour against real measurements (R4c, docs/PEOPLE_REALISM.md §15): each people's indoor adults where
    /// spectrophotometers put real cheeks (<see cref="SkinColour"/> for the studies), their spread as wide as within a people
    /// measured in one place, and the colour itself in the real gamut of skin (lightness, hue, chroma, ITA).
    /// </summary>
    public sealed class SkinColourTests
    {
        private static double[] Cheeks(string people, string role, int n = 400) =>
            Enumerable.Range(0, n).Select(i => SkinColour.Lightness(Bodies.For($"npc_sc_{people}_{role}_{i}", i % 2 == 0, 25 + i % 30, role, ancestry: people))).ToArray();

        private static double Sd(double[] x) { var m = x.Average(); return Math.Sqrt(x.Sum(v => (v - m) * (v - m)) / (x.Length - 1)); }

        [Test]
        public void EachPeoplesCheeksAreWhereRealOnesWereMeasured()
        {
            // indoor adults of both sexes (the studies measured students, staff and townspeople), mean L* within 3 units
            foreach (var (people, real) in new[] { ("north_european", 61.0), ("mediterranean", 58.0), ("east_asian", 59.0), ("southeast_asian", 57.0),
                         ("latin_american", 56.0), ("south_asian", 53.0), ("indigenous_american", 53.0), ("east_african", 37.0), ("west_african", 36.0) })
            {
                var c = Cheeks(people, "clerk");
                TestContext.Out.WriteLine($"{people}: cheek L* {c.Average():F1} (sd {Sd(c):F1}), measured {real}");
                Assert.That(c.Average(), Is.EqualTo(real).Within(3), $"{people}: mean cheek L* {c.Average():F1}, measured {real}");
                Assert.That(Sd(c), Is.InRange(2.5, 7.0), $"{people}: the spread within a people ({Sd(c):F1}; British 5.5, Chinese 3.1, Kurdish 4.4, Thai 4.0)");
            }
        }

        [Test]
        public void TheSunDarkensTheFairMost()
        {
            var fairIn = Cheeks("north_european", "clerk").Average();
            var fairOut = Cheeks("north_european", "labourer").Average();
            var darkIn = Cheeks("west_african", "clerk").Average();
            var darkOut = Cheeks("west_african", "labourer").Average();
            Assert.That(fairIn - fairOut, Is.GreaterThan(2.5), "outdoor work tans a fair skin");
            Assert.That(fairIn - fairOut, Is.GreaterThan(darkIn - darkOut), "and a dark one less");
        }

        [Test]
        public void TheColoursAreSkinsColours()
        {
            for (var t = -1.0; t <= 1.0; t += 0.05)
                foreach (var u in new[] { -1.0, 0.0, 1.0 })
                {
                    var lab = SkinColour.Lab(t, u);
                    var hue = Math.Atan2(lab.B, lab.A) * 180 / Math.PI;
                    var chroma = Math.Sqrt(lab.A * lab.A + lab.B * lab.B);
                    Assert.That(lab.L, Is.InRange(29.5, 70.5), "no skin darker than L* 30 or fairer than 70");
                    Assert.That(hue, Is.InRange(44, 62), "skin's hue: red-yellow, about 50-60 degrees");
                    Assert.That(chroma, Is.InRange(11, 21));
                    var rgb = SkinColour.Linear(lab);
                    Assert.That(Math.Min(rgb.R, Math.Min(rgb.G, rgb.B)), Is.GreaterThan(0), "in the sRGB gamut");
                    var back = SkinColour.Lab(rgb);
                    Assert.That(back.L, Is.EqualTo(lab.L).Within(0.05));
                    Assert.That(back.A, Is.EqualTo(lab.A).Within(0.05));
                    Assert.That(back.B, Is.EqualTo(lab.B).Within(0.05));
                }
            // the categories as dermatology draws them (ITA): a north European's light to intermediate, a west African's dark
            var fair = Bodies.For("npc_sc_ita_f", false, 30, "clerk", ancestry: "north_european");
            var dark = Bodies.For("npc_sc_ita_d", true, 30, "clerk", ancestry: "west_african");
            Assert.That(SkinColour.Ita(SkinColour.Lab(fair.Skin, fair.Undertone)), Is.InRange(20, 60));
            Assert.That(SkinColour.Ita(SkinColour.Lab(dark.Skin, dark.Undertone)), Is.LessThan(-30));
        }

        [Test]
        public void TheMultiplierTakesTheReferenceToTheTarget()
        {
            var r = (SkinColour.Decode(SkinColour.Reference.R), SkinColour.Decode(SkinColour.Reference.G), SkinColour.Decode(SkinColour.Reference.B));
            foreach (var (t, u) in new[] { (-0.8, -0.3), (0.0, 0.2), (0.85, 0.0) })
            {
                var m = SkinColour.Multiplier(t, u);
                var lab = SkinColour.Lab((r.Item1 * m.R, r.Item2 * m.G, r.Item3 * m.B));
                var want = SkinColour.Lab(t, u);
                Assert.That(lab.L, Is.EqualTo(want.L).Within(0.05));
                Assert.That(lab.A, Is.EqualTo(want.A).Within(0.05));
                Assert.That(lab.B, Is.EqualTo(want.B).Within(0.05));
            }
        }
    }
}
