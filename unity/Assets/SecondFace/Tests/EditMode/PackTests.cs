using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>P5.3h: the pack's view (sections, order, comparison), the outfit read off the inventory, and the haggle.</summary>
    public class PackTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static Inventory Kit()
        {
            var inv = Inv.Empty();
            foreach (var (id, n) in new[] { ("c_water", 2), ("w_pipe", 1), ("r_duster", 1), ("a_9mm", 14), ("w_pistol9", 1), ("c_bandage", 3), ("r_hood", 1) })
                Inv.AddItem(inv, Inv.MakeItem(id, n));
            return inv;
        }

        [Test]
        public void SectionsListTheirItemsInASteadyOrder()
        {
            var inv = Kit();
            var all = Pack.Listed(inv, "all").Select(i => inv.Items[i].Def).ToList();
            Assert.That(all.Count, Is.EqualTo(inv.Items.Count));
            Assert.That(all.Take(2), Is.EquivalentTo(new[] { "w_pipe", "w_pistol9" }), "weapons first");
            Assert.That(Pack.Listed(inv, "weapons").Select(i => inv.Items[i].Def), Is.EquivalentTo(new[] { "w_pipe", "w_pistol9", "a_9mm" }));
            Assert.That(Pack.Listed(inv, "wear").Select(i => inv.Items[i].Def), Is.EquivalentTo(new[] { "r_duster", "r_hood" }));
            Assert.That(Pack.Listed(inv, "aid").Select(i => inv.Items[i].Def), Is.EquivalentTo(new[] { "c_water", "c_bandage" }));
            Assert.That(Pack.Listed(inv, "papers"), Is.Empty);
            Assert.That(Pack.Filters.Where(f => f != "all").Sum(f => Pack.Listed(inv, f).Count), Is.EqualTo(inv.Items.Count), "every item in one section");
        }

        [Test]
        public void ComparesWithWhatIsInHand()
        {
            var inv = Kit();
            var pipe = inv.Items.FindIndex(i => i.Def == "w_pipe");
            Assert.That(Pack.Against(inv, inv.Items[pipe]), Is.Null, "nothing in hand yet");
            Inv.Equip(inv, pipe);
            var pistol = inv.Items.Find(i => i.Def == "w_pistol9");
            var against = Pack.Against(inv, pistol);
            Assert.That(against.Def, Is.EqualTo("w_pipe"));
            var stats = Pack.Stats(pistol, against);
            var dmg = stats.Find(s => s.Key == "damage");
            Assert.That(dmg.Value, Is.EqualTo(8)); Assert.That(dmg.To, Is.EqualTo(15));
            Assert.That(dmg.Delta, Is.EqualTo((8 + 15) / 2.0 - (4 + 9) / 2.0).Within(1e-9));
            Assert.That(dmg.Better, Is.True);
            Assert.That(stats.Find(s => s.Key == "weight").Better, Is.True, "lighter is better");
            Assert.That(stats.Find(s => s.Key == "ap").Better, Is.Null, "the same AP");
            Assert.That(stats.Find(s => s.Key == "magazine").Delta, Is.Null, "the pipe has no magazine to compare");
            var hood = inv.Items.Find(i => i.Def == "r_hood");
            Assert.That(Pack.Against(inv, hood), Is.Null);
            Assert.That(Pack.Stats(hood).Select(s => s.Key), Is.SupersetOf(new[] { "dt", "dr", "rad", "condition", "weight", "value" }));
        }

        [Test]
        public void WornArmourDressesTheFigure()
        {
            var inv = Kit();
            var s = Sheet.Empty();
            var bare = Wear.Of(inv, s, "m");
            Assert.That(bare.Layers.Select(l => l.Name), Is.EquivalentTo(Wear.Base().Layers.Select(l => l.Name)));
            var key = Wear.Key(inv, s);
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "r_duster"));
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "r_hood"));
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "w_pipe"));
            Assert.That(Wear.Key(inv, s), Is.Not.EqualTo(key));
            var m = Wear.Of(inv, s, "m");
            Assert.That(m.Layers.Select(l => l.Name), Does.Contain("mindfront_cardigan_long_open_front").And.Contain("elvs_male_tankshirt1"));
            Assert.That(m.Layers.Select(l => l.Name), Does.Not.Contain("toigo_basic_tucked_t-shirt"), "the duster's set replaces the base top");
            Assert.That(m.Layers.Select(l => l.Name), Does.Contain("maciekg_leather_boots"), "the base boots stay");
            Assert.That(Wear.Of(inv, s, "f").Layers.Select(l => l.Name), Does.Contain("elvs_lara_tank1"), "by fit");
            Assert.That(m.Gear.Select(g => g.Kind), Is.EquivalentTo(new[] { "headwrap", "goggles" }), "the hood's gear");
            Assert.That(m.Held, Is.EqualTo("pipe"));
        }

        [Test]
        public void HaggleIsACheckWithAVisibleMargin()
        {
            var g = States.NewGame("shale", 0, 0);
            g.Pc.Sheet = Sheet.Empty();
            foreach (var a in Rules.Attributes) g.Pc.Sheet.BaseAttrs[a] = 5;
            var def = Registry.Npcs["npc_sh_03"].Merchant;
            var ms = Barter.State(g.Merchants ??= new(), "npc_sh_03", def, Clock.DayOf(g.Minutes));
            var day = Clock.DayOf(g.Minutes);
            var skill = Checks.EffectiveSkill(g.Pc.Sheet, g.Pc.Inventory, "barter");
            var offer = Barter.Offer(skill, def, ms, 40, day);
            Assert.That(offer.Open, Is.True);
            Assert.That(offer.Dc, Is.EqualTo(15 + 16 + 1), "markup 1.4 and a 40-Toll deal");
            Assert.That(offer.Chance, Is.EqualTo(skill >= offer.Dc ? 100 : System.Math.Max(0, 35 - (offer.Dc - skill) * 3)));
            Assert.That(Barter.HaggleDc(def, 400), Is.GreaterThan(offer.Dc), "a big deal is harder to shift");
            Assert.That(Barter.HaggleWin(offer.Dc, offer.Dc), Is.EqualTo(0.04).Within(1e-9));
            Assert.That(Barter.HaggleWin(100, 30), Is.EqualTo(0.15).Within(1e-9), "at most 15%");

            var plain = Barter.Context(g, def, "shale", ms);
            var price = Barter.BuyPrice(100, plain);
            // a skilled haggler always wins and the day's prices move their way
            g.Pc.Sheet.SkillBought["barter"] = 60;
            var won = Barter.Haggle(g, def, ms, 40, new Rng(7));
            Assert.That(won.Success, Is.True);
            Assert.That(ms.HaggleDay, Is.EqualTo(day));
            Assert.That(Barter.Offer(won.Value, def, ms, 40, day).Open, Is.False, "once a day");
            var after = Barter.Context(g, def, "shale", ms);
            Assert.That(after.Haggle, Is.EqualTo(Barter.HaggleWin(won.Value, won.Dc)).Within(1e-9));
            Assert.That(Barter.BuyPrice(100, after), Is.LessThan(Barter.BuyPrice(100, new PriceContext { Barter = after.Barter, Standing = after.Standing, FactionMul = 1, Markup = def.Markup ?? 1.5 })));
            Assert.That(Barter.SellPrice(100, after), Is.GreaterThan(Barter.SellPrice(100, new PriceContext { Barter = after.Barter, Standing = after.Standing, FactionMul = 1, Markup = def.Markup ?? 1.5 })));
            // a poor one far short of the DC is always refused, and pays for it today
            var ms2 = new MerchantState();
            g.Pc.Sheet.SkillBought.Clear();
            foreach (var a in Rules.Attributes) g.Pc.Sheet.BaseAttrs[a] = 1;
            var lost = Barter.Haggle(g, def, ms2, 400, new Rng(7));
            Assert.That(lost.Success, Is.False);
            Assert.That(Barter.HaggleToday(ms2, day), Is.EqualTo(-Barter.HaggleLose));
            Assert.That(Barter.HaggleToday(ms2, day + 1), Is.EqualTo(0), "gone the next day");
            Assert.That(price, Is.GreaterThan(0));
        }
    }
}
