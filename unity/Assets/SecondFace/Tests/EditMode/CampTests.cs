using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>P6.1: camp (rest, cook, mend, hunt, snares), as the web game's camp did it.</summary>
    public class CampTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static GameState Hurt()
        {
            var g = States.NewGame("shale", 0, 0);
            g.Pc.Sheet = Sheet.Empty();
            g.Pc.Sheet.Hp = 3;
            return g;
        }

        [Test]
        public void RestHealsByTheHourAndWantsWaterAndFood()
        {
            var g = Hurt();
            var d = Sheet.Derived(g.Pc.Sheet);
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_water", 1));
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_jerky", 1));
            var m0 = g.Minutes;
            var r = Camp.Rest(g, 8);
            Assert.That(r.Water && r.Food, Is.True);
            Assert.That(r.Healed, Is.EqualTo(Num.RoundInt(d.HealRate * 8.0)));
            Assert.That(g.Pc.Sheet.Hp, Is.EqualTo(System.Math.Min(d.MaxHp, 3 + r.Healed)));
            Assert.That(g.Minutes, Is.EqualTo(m0 + 8 * 60));
            Assert.That(Inv.CountItem(g.Pc.Inventory, "c_water") + Inv.CountItem(g.Pc.Inventory, "c_jerky"), Is.EqualTo(0), "drunk and eaten");
            // with nothing, a quarter of the healing
            var h = Hurt();
            var poor = Camp.Rest(h, 8);
            Assert.That(poor.Water || poor.Food, Is.False);
            Assert.That(poor.Healed, Is.EqualTo(Num.RoundInt(d.HealRate * 8.0 * 0.25)));
            // a short rest needs no meal
            var s = Hurt();
            Inv.AddItem(s.Pc.Inventory, Inv.MakeItem("c_water", 1));
            Assert.That(Camp.Rest(s, 1).Food, Is.True, "no meal wanted for an hour");
            Assert.That(Camp.UntilMorning(22 * 60), Is.EqualTo(8));
            Assert.That(Camp.UntilMorning(6 * 60), Is.EqualTo(24));
        }

        [Test]
        public void CookMendAndSnares()
        {
            var g = Hurt();
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_meat", 3));
            Assert.That(Camp.CanCook(g), Is.True);
            var m0 = g.Minutes;
            Assert.That(Camp.Cook(g), Is.EqualTo(1));
            Assert.That(Inv.CountItem(g.Pc.Inventory, "c_jerky"), Is.EqualTo(3));
            Assert.That(g.Minutes, Is.EqualTo(m0 + 30));
            // mend: a kit and a worn thing
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("w_pipe", 1, 0.4));
            Inv.Equip(g.Pc.Inventory, g.Pc.Inventory.Items.FindIndex(i => i.Def == "w_pipe"));
            var slot = g.Pc.Inventory.Active;
            Assert.That(Camp.Mend(g, slot), Is.False, "no kit");
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("t_repair", 1));
            Assert.That(Camp.Mend(g, slot), Is.True);
            Assert.That(g.Pc.Inventory.EquippedAt(slot).Cond, Is.EqualTo(0.75).Within(1e-9));
            Assert.That(Camp.RepairKits(g), Is.EqualTo(0));
            // snares: a wire and a scrap; nothing for the first hours, a catch after a day where game is plenty
            Assert.That(Camp.SetTraps(g, "wilds"), Is.False, "nothing to make them of");
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("j_wiring", 1));
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("j_scrap", 1));
            Assert.That(Camp.SetTraps(g, "wilds"), Is.True);
            Assert.That(Camp.Traps(g, "wilds"), Is.Not.Null);
            Assert.That(Camp.SetTraps(g, "wilds"), Is.False, "one line a place");
            g.Minutes += 24 * 60;
            var before = Inv.CountItem(g.Pc.Inventory, "c_meat");
            var n = Camp.CheckTraps(g, "wilds", 1.0);
            Assert.That(n, Is.GreaterThan(0));
            Assert.That(Inv.CountItem(g.Pc.Inventory, "c_meat"), Is.EqualTo(before + n));
            Assert.That(Camp.Traps(g, "wilds"), Is.Null, "taken up");
            Assert.That(Camp.CheckTraps(g, "wilds", 1.0), Is.EqualTo(-1));
            // a hunt: three hours whatever comes of it
            var t = g.Minutes;
            Camp.Hunt(g, 0.8, new Rng(5));
            Assert.That(g.Minutes, Is.EqualTo(t + 180));
        }

        [Test]
        public void TheOpenLandHasItsGameAndKeepsItsSnaresWhereTheyWereSet()
        {
            Assert.That(Camp.WildGame("northern_wet"), Is.GreaterThan(Camp.WildGame("sallow")));
            Assert.That(Camp.WildGame("sallow"), Is.GreaterThan(Camp.WildGame("glass_flats")));
            Assert.That(Camp.WildGame("meridian"), Is.LessThan(0.1));
            Assert.That(Camp.UntilNext(8 * 60), Is.EqualTo((11, false)), "by day, until the evening");
            Assert.That(Camp.UntilNext(22 * 60), Is.EqualTo((8, true)), "at night, until the morning");
            Assert.That(Camp.UntilNext(2 * 60 + 1440), Is.EqualTo((4, true)));
            Assert.That(Camp.WildSpot(10f, 10f), Is.EqualTo(Camp.WildSpot(190f, 150f)));
            Assert.That(Camp.WildSpot(-10f, 10f), Is.Not.EqualTo(Camp.WildSpot(10f, 10f)));
            var g = Hurt();
            var at = Camp.WildSpot(-350f, 820f);
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("j_wiring", 1));
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("j_scrap", 1));
            Assert.That(Camp.SetTraps(g, at), Is.True);
            Assert.That(Camp.Traps(g, at), Is.Not.Null);
            Assert.That(Camp.Traps(g, Camp.WildSpot(350f, 820f)), Is.Null, "not where they were not set");
            var (water, food) = Camp.Supplies(g);
            Assert.That((water, food), Is.EqualTo((0, 0)));
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_water", 2));
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("c_jerky", 3));
            Assert.That(Camp.Supplies(g), Is.EqualTo((2, 3)));
        }
    }
}
