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
        public void ApartReadsLightnessAndHue()
        {
            Assert.That(RbPeople.Apart(0xc46a2a, 0xc46a2a), Is.False, "one dye");
            Assert.That(RbPeople.Apart(0xc46a2a, 0x2b2621), Is.True, "orange over near black");
            Assert.That(RbPeople.Apart(0x8a3b1e, 0x2f4a73), Is.True, "rust over indigo");
        }
    }
}
