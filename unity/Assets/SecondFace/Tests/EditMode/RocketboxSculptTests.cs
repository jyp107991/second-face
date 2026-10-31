using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests.EditMode
{
    /// <summary>The sculptor on Rocketbox heads, each feature calibrated on its own (owner, 2026-10-31): a slider alone at
    /// its limits, and any set of sliders after <see cref="RocketboxSculpt.Clamp"/>, keeps every measured feature inside
    /// the library's spread for that head; the chin, which went absurd at half a unit, is held to the library's chins.</summary>
    public class RocketboxSculptTests
    {
        private static readonly string[] Heads = RocketboxSculptData.Room.Keys.ToArray();

        private static void Inside(string head, IReadOnlyDictionary<string, float> values, string what)
        {
            var (below, above) = RocketboxSculptData.Room[head];
            var d = RocketboxSculpt.Change(values);
            for (var f = 0; f < d.Length; f++)
                Assert.That(d[f], Is.InRange(below[f] - 0.05, above[f] + 0.05),
                    $"{head} {what}: {RocketboxSculptData.Features[f]} moves {d[f]:0.0} mm, room {below[f]:0.0}..{above[f]:0.0}");
        }

        [Test]
        public void EverySliderAloneAtItsLimitsStaysInsideTheLibrary()
        {
            Assert.That(Heads.Length, Is.GreaterThan(100));
            foreach (var h in Heads)
                foreach (var s in RocketboxSculptData.Sliders)
                {
                    var (lo, hi) = RocketboxSculpt.Limits(h, s);
                    Assert.That(lo, Is.InRange(-1f, 0f)); Assert.That(hi, Is.InRange(0f, 1f));
                    Inside(h, new Dictionary<string, float> { [s] = lo }, $"{s} at {lo:0.00}");
                    Inside(h, new Dictionary<string, float> { [s] = hi }, $"{s} at {hi:0.00}");
                }
        }

        [Test]
        public void AnySetOfSlidersIsHeldInsideTogether()
        {
            var rng = new Random(7);
            foreach (var h in Heads)
                for (var k = 0; k < 20; k++)
                {
                    var v = RocketboxSculptData.Sliders.ToDictionary(s => s, s => (float)(rng.NextDouble() * 2 - 1));
                    var c = RocketboxSculpt.Clamp(h, v);
                    Inside(h, c, $"random set {k}");
                    foreach (var s in v.Keys) Assert.That(Math.Abs(c[s]), Is.LessThanOrEqualTo(Math.Abs(v[s]) + 1e-6), $"{s} grew");
                }
        }

        [Test]
        public void TheChinIsHeldToTheLibrarysChins()
        {
            // one unit of chin-height adds about 21 mm to the chin; the library's women differ by about 5 mm
            var (_, high) = RocketboxSculptData.Effect["chin-height"];
            var f = Array.IndexOf(RocketboxSculptData.Features, "chin_length");
            Assert.That(high[f], Is.GreaterThan(15));
            var women = Heads.Where(h => h.Contains("Female")).ToArray();
            var reach = women.Select(h => RocketboxSculpt.Limits(h, "chin-height").High).OrderBy(x => x).ToArray();
            Assert.That(reach[reach.Length / 2], Is.LessThan(0.3f), "a typical woman's chin lengthens by well under a third of a unit");
        }

        [Test]
        public void UncalibratedSlidersAndUnknownHeadsPassThrough()
        {
            Assert.That(RocketboxSculpt.Limits("Female_Adult_03", "ear-scale"), Is.EqualTo((-1f, 1f)));
            Assert.That(RocketboxSculpt.Limits("nobody", "chin-height"), Is.EqualTo((-1f, 1f)));
            var c = RocketboxSculpt.Clamp("Female_Adult_03", new Dictionary<string, float> { ["ear-scale"] = 0.7f, ["neck-double"] = 3f });
            Assert.That(c["ear-scale"], Is.EqualTo(0.7f)); Assert.That(c["neck-double"], Is.EqualTo(1f));
        }
    }
}
