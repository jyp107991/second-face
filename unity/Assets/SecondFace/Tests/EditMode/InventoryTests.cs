using System.Collections.Generic;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    public class InventoryTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void StacksCountsRemovesAndHandlesTolls()
        {
            var inv = Inv.Empty();
            Inv.AddItem(inv, Inv.MakeItem("a_9mm", 10));
            Inv.AddItem(inv, Inv.MakeItem("a_9mm", 5));
            Inv.AddItem(inv, new ItemInst { Def = "tolls", Qty = 30 });
            Assert.That(inv.Items.Count, Is.EqualTo(1));
            Assert.That(Inv.CountItem(inv, "a_9mm"), Is.EqualTo(15));
            Assert.That(Inv.RemoveItem(inv, "a_9mm", 20), Is.EqualTo(15));
            Assert.That(inv.Items.Count, Is.EqualTo(0));
            Assert.That(inv.Tolls, Is.EqualTo(30));
        }

        [Test]
        public void EquipsWeaponsAndReloadsFromMatchingAmmo()
        {
            var inv = Inv.Empty();
            Inv.AddItem(inv, Inv.MakeItem("w_pistol9"));
            Inv.AddItem(inv, Inv.MakeItem("a_9mm", 20));
            Assert.That(Inv.Equip(inv, 0), Is.True);
            Assert.That(Inv.ActiveWeapon(inv).Def, Is.EqualTo("w_pistol9"));
            Assert.That(Inv.Reload(inv), Is.EqualTo(12));
            Assert.That(Inv.CountItem(inv, "a_9mm"), Is.EqualTo(8));
            Inv.AddItem(inv, Inv.MakeItem("a_9mm_hp", 12));
            Inv.Reload(inv, "primary", "a_9mm_hp");
            Assert.That(Inv.ActiveWeapon(inv).LoadedAmmo, Is.EqualTo("a_9mm_hp"));
            Assert.That(Inv.CountItem(inv, "a_9mm"), Is.EqualTo(20));
        }

        [Test]
        public void ArmourFeedsDtDrViaGearMods()
        {
            var inv = Inv.Empty(); var s = Sheet.Empty();
            Inv.AddItem(inv, Inv.MakeItem("r_duster"));
            Inv.Equip(inv, 0);
            Inv.SyncGear(s, inv);
            Assert.That(Sheet.Derived(s).Dt, Is.EqualTo(2));
            Assert.That(Sheet.Derived(s).Dr, Is.EqualTo(15));
        }

        [Test]
        public void ConditionLowersValueAndWeightSums()
        {
            var w = Inv.MakeItem("w_revolver38");
            var full = Inv.ItemValue(w);
            for (int i = 0; i < 150; i++) Inv.Wear(w);
            Assert.That(Inv.ItemValue(w), Is.LessThan(full));
            var inv = Inv.Empty();
            Inv.AddItem(inv, Inv.MakeItem("w_sledge"));
            Inv.AddItem(inv, Inv.MakeItem("j_scrap", 3));
            Assert.That(Inv.TotalWeight(inv), Is.EqualTo(10));
        }

        [Test]
        public void ConsumablesHealAndAreUsedUp()
        {
            var inv = Inv.Empty(); var s = Sheet.Empty();
            s.Hp = 5;
            Inv.AddItem(inv, Inv.MakeItem("c_knitkit", 2));
            var r = Inv.UseConsumable(inv, 0, s, 0);
            Assert.That(r.Ok, Is.True);
            Assert.That(s.Hp, Is.EqualTo(25));
            Assert.That(Inv.CountItem(inv, "c_knitkit"), Is.EqualTo(1));
        }

        [Test]
        public void ItemsContentDeserialisesStrictly()
        {
            Assert.That(Registry.Table<ItemDef>(ContentFixture.Db(), "items", true).Count, Is.GreaterThan(100));
        }

        private static readonly MerchantDef Def = new(new[] { "junk", "weapon" }, 100, 3, ("c_water", 4), ("w_machete", 1));
        private static PriceContext Ctx(double barter = 0, double standing = 0) => new PriceContext { Barter = barter, Standing = standing, FactionMul = 1, Markup = 1.5 };

        [Test]
        public void PricesMoveWithSkillAndStandingWithinBounds()
        {
            Assert.That(Barter.BuyPrice(100, Ctx()), Is.EqualTo(150));
            Assert.That(Barter.BuyPrice(100, Ctx(100)), Is.LessThan(150));
            Assert.That(Barter.BuyPrice(100, Ctx(100, 100)), Is.GreaterThanOrEqualTo(105));
            Assert.That(Barter.SellPrice(100, Ctx()), Is.EqualTo(20));
            Assert.That(Barter.SellPrice(100, Ctx(100, 100)), Is.EqualTo(60));
            Assert.That(Barter.SellPrice(100, Ctx(), 5), Is.LessThan(Barter.SellPrice(100, Ctx(), 0)));
        }

        [Test]
        public void MerchantsRestockOnScheduleAndRememberWhatYouSoldThem()
        {
            var store = new Dictionary<string, MerchantState>();
            var ms = Barter.State(store, "m", Def, 1);
            Assert.That(ms.Inv.Items.Count, Is.EqualTo(2));
            var player = Inv.Empty();
            Inv.AddItem(player, Inv.MakeItem("j_scrap", 12));
            var sell = new Deal { Sell = { new DealLine(0, 12) } };
            var t = Barter.Totals(player, ms, sell, Ctx(), 1);
            Assert.That(t.Net, Is.LessThan(0));
            Assert.That(Barter.Execute(player, ms, Def, sell, Ctx(), 1).Ok, Is.True);
            Assert.That(player.Tolls, Is.EqualTo(-t.Net));
            Assert.That(Barter.Saturation(ms, "j_scrap", 1), Is.EqualTo(12));
            Assert.That(Barter.Saturation(ms, "j_scrap", 7), Is.EqualTo(3).Within(1e-9));
            Assert.That(Barter.Execute(player, ms, Def, new Deal { Buy = { new DealLine(1, 1) } }, Ctx(), 1).Ok, Is.False);
            Assert.That(Barter.Execute(player, ms, Def, new Deal { Buy = { new DealLine(0, 1) } }, Ctx(), 1).Ok, Is.True);
            ms.Cash = 5;
            Barter.State(store, "m", Def, 4);
            Assert.That(ms.Cash, Is.EqualTo(100));
            Assert.That(ms.Inv.Items.Find(i => i.Def == "c_water").Qty, Is.EqualTo(4));
        }

        [Test]
        public void RefusesCategoriesNotDealtInAndDealsItCannotAfford()
        {
            var store = new Dictionary<string, MerchantState>();
            var ms = Barter.State(store, "m", Def, 1);
            var player = Inv.Empty();
            Inv.AddItem(player, Inv.MakeItem("c_bandage", 1));
            Assert.That(Barter.Execute(player, ms, Def, new Deal { Sell = { new DealLine(0, 1) } }, Ctx(), 1).Ok, Is.False);
            ms.Cash = 0;
            player.Items = new List<ItemInst> { Inv.MakeItem("w_machete", 1) };
            Assert.That(Barter.Execute(player, ms, Def, new Deal { Sell = { new DealLine(0, 1) } }, Ctx(), 1).Reason, Does.Contain("on hand"));
        }

        [Test]
        public void SchedulesFindTheEntryInForceWrappingMidnight()
        {
            var sched = new List<ScheduleEntry>
            {
                new ScheduleEntry { From = 22, To = 6, Activity = "sleep", Spot = "bed" },
                new ScheduleEntry { From = 6, To = 22, Activity = "work", Spot = "bar" },
            };
            Assert.That(Schedule.At(sched, 23).Activity, Is.EqualTo("sleep"));
            Assert.That(Schedule.At(sched, 3).Activity, Is.EqualTo("sleep"));
            Assert.That(Schedule.At(sched, 12).Activity, Is.EqualTo("work"));
            Assert.That(Schedule.At(null, 12), Is.Null);
        }
    }
}
