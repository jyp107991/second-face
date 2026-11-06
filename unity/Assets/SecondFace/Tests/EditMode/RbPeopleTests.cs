using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    /// <summary>The Rocketbox people's choice and dyes (L3, the wardrobe rule): office and hospital wear never stand for a
    /// trade they are not, and a person's top and legs never take one colour (head to foot in one dye reads as a suit).</summary>
    public class RbPeopleTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static readonly string[] Trades = { "settler", "labourer", "trader", "drifter", "raider", "guard", "nomad", "tech", "street", "fisher", "pilgrim" };

        [Test]
        public void TradesAreDressedForTheirTrade()
        {
            foreach (var role in Trades)
                foreach (var male in new[] { false, true })
                    for (var i = 0; i < 60; i++)
                    {
                        var p = RbPeople.Pick($"npc_t_{role}_{i}", male, 22 + i % 40, role, i % 3 == 0 ? "west_african" : i % 3 == 1 ? "north_european" : "east_asian");
                        Assert.That(p, Is.Not.Null);
                        Assert.That(p.Style, Is.Not.EqualTo("formal").And.Not.EqualTo("medic"), $"{role} {(male ? "man" : "woman")} {i} as {p.Id}");
                        if (RbPeople.All.Any(q => q.Male == male && q.Roles.Contains(role)))
                            Assert.That(p.Roles, Does.Contain(role), $"{role} {(male ? "man" : "woman")} {i} as {p.Id} ({p.Style})");
                    }
        }

        [Test]
        public void TopAndLegsAreTwoGarments()
        {
            foreach (var role in Trades)
                for (var i = 0; i < 80; i++)
                {
                    var id = $"npc_d_{role}_{i}";
                    var p = RbPeople.Pick(id, i % 2 == 0, 30, role, "mediterranean");
                    var d = RbPeople.DyesFor(p, id, role, null);
                    Assert.That(RbPeople.Apart(d.Top, d.Legs), Is.True, $"{id} as {p.Id}: top {d.Top:x6} legs {d.Legs:x6}");
                }
        }

        [Test]
        public void APlayerIsSomeoneOfTheirOwnSexAndPeople()
        {
            foreach (var male in new[] { false, true })
                foreach (var people in new[] { "west_african", "north_european", "east_asian", "south_asian" })
                {
                    var c = RbPeople.PlayerChoices(male, people);
                    Assert.That(c, Is.Not.Empty, $"{(male ? "men" : "women")} of {people}");
                    Assert.That(c.All(p => p.Male == male && p.Face), Is.True);
                    Assert.That(c.Where(p => p.Style == "formal" || p.Style == "medic").All(p => p.People == Bodies.People(people)), Is.True, "office wear only for a people with nobody else");
                }
            var w = RbPeople.PlayerChoices(false, "west_african");
            Assert.That(w[0].People, Is.EqualTo("west_african"), "their own people first: " + w[0].Id);
        }

        [Test]
        public void ApartReadsLightnessAndHue()
        {
            Assert.That(RbPeople.Apart(0xc46a2a, 0xc46a2a), Is.False, "one dye");
            Assert.That(RbPeople.Apart(0xc46a2a, 0x2b2621), Is.True, "orange over near black");
            Assert.That(RbPeople.Apart(0x8a3b1e, 0x2f4a73), Is.True, "rust over indigo");
        }

        /// <summary>The wardrobe rule (owner 2026-11-06: "a stroll in california"): every frontier trade wears boots and a piece
        /// over its shirt; raiders and guards gear up, drifters cover up; the megacity's rich and corp wear none; the choice
        /// is the same for the same person, and a crowd of one trade is not all alike.</summary>
        [Test]
        public void EveryFrontierTradeWearsLayers()
        {
            foreach (var trade in Trades)
            {
                var seen = new HashSet<string>();
                for (var k = 0; k < 40; k++)
                {
                    var d = RbPeople.DyesFor(RbPeople.All[k % RbPeople.All.Count], $"{trade}_{k}", trade, null);
                    Assert.That(d.Layers, Does.Contain("boots"), $"{trade} #{k}: boots");
                    Assert.That(d.Layers.Intersect(new[] { "vest", "bomber", "cape", "gaiter" }), Is.Not.Empty, $"{trade} #{k}: something over the shirt");
                    if (d.Layers.Contains("straps")) Assert.That(d.Layers, Does.Contain("vest"), "straps go on a vest");
                    Assert.That(RbPeople.Apart(d.Shell, d.Top) || RbPeople.Apart(d.Shell, d.Legs), Is.True, $"{trade} #{k}: the layer's dye stands apart");
                    seen.Add(string.Join("+", d.Layers));
                    var again = RbPeople.DyesFor(RbPeople.All[k % RbPeople.All.Count], $"{trade}_{k}", trade, null);
                    Assert.That(again.Layers, Is.EqualTo(d.Layers), "the same person, the same layers");
                }
                Assert.That(seen.Count, Is.GreaterThan(6), $"{trade}: a crowd is not all alike ({seen.Count} outfits in 40)");
            }
            foreach (var rich in new[] { "gilded", "corp" })
                Assert.That(RbPeople.DyesFor(RbPeople.All[0], "rich", rich, null).Layers, Is.Empty, rich);
        }
    }
}
