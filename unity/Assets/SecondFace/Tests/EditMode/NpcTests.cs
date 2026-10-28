using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    public class NpcTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void EveryPersonDeserialisesStrictlyAndBuildsASheetAndPack()
        {
            var db = ContentFixture.Db();
            var npcs = Registry.Table<NpcDef>(db, "npcs", strict: true);
            Assert.That(npcs.Count, Is.GreaterThan(200));
            foreach (var def in npcs.Values)
            {
                Assert.That(Outfits.Roles, Does.Contain(def.Role ?? "settler"), def.Id);
                var (sheet, inv) = NpcStats.Build(def);
                Assert.That(sheet.Hp, Is.GreaterThan(0), def.Id);
                Assert.That(sheet.Level, Is.EqualTo(def.Level));
                foreach (var id in def.Equip ?? new List<string>())
                {
                    Assert.That(Registry.Items.ContainsKey(id), Is.True, $"{def.Id} equips unknown {id}");
                    Assert.That(inv.Equipped.Values.Any(i => i.Def == id), Is.True, $"{def.Id} did not equip {id}");
                }
                foreach (var (id, _) in def.InventoryItems) Assert.That(id == "tolls" || Registry.Items.ContainsKey(id), Is.True, $"{def.Id} carries unknown {id}");
                if (def.Tolls is int t) Assert.That(inv.Tolls, Is.GreaterThanOrEqualTo(t), def.Id);
                if (def.Dialogue != null) Assert.That(Registry.Dialogues.ContainsKey(def.Dialogue), Is.True, $"{def.Id} talks with unknown {def.Dialogue}");
            }
        }

        [Test]
        public void EquippedWeaponsAreLoadedAndArmourCounts()
        {
            var boss = Registry.Npcs["dev_raider_boss"];
            var (sheet, inv) = NpcStats.Build(boss);
            var w = inv.EquippedAt("primary");
            Assert.That(w, Is.Not.Null);
            Assert.That(Items.Def(w.Def).Weapon, Is.Not.Null);
            if (Items.Def(w.Def).Weapon.Magazine is int) Assert.That(w.Loaded, Is.GreaterThan(0));
            Assert.That(inv.EquippedAt("body"), Is.Not.Null);
            Assert.That(sheet.GearMods, Is.Not.Null);
        }

        [Test]
        public void PeopleDressByRoleAndFactionUnlessTheirOutfitIsWritten()
        {
            var explicitCount = Registry.Npcs.Values.Count(n => n.Outfit != null);
            Assert.That(explicitCount, Is.GreaterThan(5));
            foreach (var def in Registry.Npcs.Values.Where(n => n.Outfit == null).Take(60))
            {
                var fit = def.Look.Frame == "narrow" ? "f" : "m";
                var o = Outfits.DressFor(def.Look.Seed, def.Role ?? "settler", fit, def.Faction);
                Assert.That(o.Layers.Count, Is.GreaterThanOrEqualTo(2), def.Id);
            }
        }
    }
}
