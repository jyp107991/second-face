using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>The background people of a place (P4.13 step 5): as many as the content asks, the same every time, each
    /// a person of their own with a trade, a name, talk and a routine that keeps them at their spot through their hours
    /// or about their area.</summary>
    public class ExtrasTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void EveryPlaceGetsTheExtrasItAsksFor()
        {
            var total = 0;
            foreach (var map in Registry.Maps.Values.Where(m => m.Extras != null))
            {
                var extras = Extras.Of(map);
                Assert.That(extras.Count, Is.EqualTo(map.Extras.Sum(e => e.Count)), map.Id);
                Assert.That(extras.Select(x => x.Def.Id).Distinct().Count(), Is.EqualTo(extras.Count), $"{map.Id}: ids unique");
                foreach (var x in extras)
                {
                    Assert.That(string.IsNullOrEmpty(x.Def.Name), Is.False, $"{x.Def.Id}: a name");
                    Assert.That(Outfits.Roles, Does.Contain(x.Def.Role), $"{x.Def.Id}: a trade the outfit rules know");
                    Assert.That(Registry.Dialogues.ContainsKey(x.Def.Dialogue), Is.True, $"{x.Def.Id}: talk ({x.Def.Dialogue})");
                    Assert.That(x.Def.Barks, Is.Not.Empty, $"{x.Def.Id}: barks");
                    Assert.That(Routine.Male(x.Def.Look), Is.EqualTo(x.Male), $"{x.Def.Id}: their sex reads back");
                    Assert.That(x.Spot != null || x.At != null || (map.Extras.All(e => e.Area == null && (e.Spots == null || e.Spots.Count == 0))), Is.True, $"{x.Def.Id}: somewhere to be");
                    if (x.Spot != null) Assert.That(map.Spots != null && map.Spots.ContainsKey(x.Spot), Is.True, $"{x.Def.Id}: spot {x.Spot} on {map.Id}");
                }
                total += extras.Count;
            }
            Assert.That(total, Is.GreaterThanOrEqualTo(200), "the content's extras, all of them");
        }

        [Test]
        public void TheSamePeopleEveryTime()
        {
            var shale = Registry.Maps["shale"];
            var a = Extras.Of(shale);
            var b = Extras.Of(shale);
            Assert.That(a.Select(x => x.Def.Name + x.Def.Role + x.Look.Stature), Is.EqualTo(b.Select(x => x.Def.Name + x.Def.Role + x.Look.Stature)));
            Assert.That(a.Select(x => x.Def.Name).Distinct().Count(), Is.GreaterThan(a.Count / 2), "names vary");
            // no two of a place's people share a name while their people's names last (P4.15b: three Lias in Shale)
            foreach (var map in Registry.Maps.Values.Where(m => m.Extras != null))
            {
                var x = Extras.Of(map);
                var repeats = x.GroupBy(e => e.Def.Name).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
                Assert.That(repeats.Count, Is.LessThanOrEqualTo(x.Count / 9), $"{map.Id}: names given twice: {string.Join(", ", repeats)}");
            }
            Assert.That(a.Select(e => e.Def.Name).Distinct().Count(), Is.EqualTo(a.Count), "Shale's people, each their own name");
            Assert.That(a.Count(x => x.Male), Is.GreaterThan(0));
            Assert.That(a.Count(x => !x.Male), Is.GreaterThan(0));
        }

        [Test]
        public void TheirHoursKeepThemThereAndAwayAfter()
        {
            var map = Registry.Maps.Values.First(m => m.Extras != null && m.Extras.Any(e => e.Hours != null && e.Spots != null && e.Spots.Count > 0));
            var def = map.Extras.First(e => e.Hours != null && e.Spots != null && e.Spots.Count > 0);
            var x = Extras.Make(map, map.Extras.IndexOf(def), def).First();
            var mid = (def.Hours.From + (def.Hours.To > def.Hours.From ? def.Hours.To : def.Hours.To + 24)) / 2 % 24;
            var on = Routine.Now(x.Placement, x.Def, mid);
            Assert.That(on.Spot, Is.EqualTo(x.Spot));
            Assert.That(Routine.Hidden(on), Is.False);
            var off = Routine.Now(x.Placement, x.Def, (def.Hours.To + 0.5) % 24);
            Assert.That(off.Activity, Is.EqualTo("away"));
            Assert.That(Extras.SpotActivity("stall_0_work"), Is.EqualTo("work"));
            Assert.That(Extras.SpotActivity("deck_pair_a"), Is.EqualTo("trade"));
            Assert.That(Extras.SpotActivity("row_lean"), Is.EqualTo("idle"));
        }
    }
}
