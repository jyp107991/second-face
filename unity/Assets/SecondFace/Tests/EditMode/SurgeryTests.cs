using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>
    /// The surgeon's table (Core <see cref="Surgery"/>, port of world/surgery.ts): what a surgeon offers this patient and
    /// at what price, fee and risk; the operation paid and rolled on the game's dice (clean, with a complication, or
    /// rejected: the fee spent, a bought piece refunded, a brought one boxed again); a stock piece sold once a game; the
    /// slot's old piece boxed; repairs and removals at their fees.
    /// </summary>
    public class SurgeryTests
    {
        private const string Surgeon = "npc_sh_08";

        [SetUp] public void Load() => ContentFixture.Db();

        private static GameState Patient(int tolls)
        {
            var g = States.NewGame("shale", 0, 0);
            g.Pc.Inventory.Tolls = tolls;
            return g;
        }

        [Test]
        public void ASurgeonOffersTheirStockAtPricePlusFeeAndTheRiskForThisPatient()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(0);
            var offers = Surgery.Offers(g, Surgeon, npc);
            Assert.That(offers.Select(o => o.Def.Id), Is.EqualTo(npc.Surgeon.Stock), "their stock, in order");
            foreach (var o in offers)
            {
                Assert.That(o.Source, Is.EqualTo("stock"));
                Assert.That(o.Price, Is.EqualTo(o.Def.Price));
                Assert.That(o.Fee, Is.EqualTo(40 + o.Def.Surgery.Difficulty), "the base fee plus the piece's difficulty");
                Assert.That(o.Total, Is.EqualTo(o.Price + o.Fee));
                Assert.That(o.Risk, Is.EqualTo(Chrome.SurgeryRisk(o.Def, Surgery.SurgeonMedicine(npc), Surgery.Grit(g))));
                Assert.That(o.Hours, Is.EqualTo(o.Def.Surgery.Hours));
                Assert.That(o.Replaces, Is.Null);
            }
            Assert.That(Surgery.SurgeonMedicine(npc), Is.EqualTo(60));
            Assert.That(Surgery.SurgeonMedicine(new SecondFace.Core.Npc.NpcDef()), Is.EqualTo(30), "a surgeon with no Medicine of their own works at 30");
        }

        [Test]
        public void ABoxedPieceInThePackIsOfferedForTheFeeAlone()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(0);
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("ci_ch_skin_plate"));
            var mine = Surgery.Offers(g, Surgeon, npc).Single(o => o.Source == "pack");
            Assert.That(mine.Def.Id, Is.EqualTo("ch_skin_plate"));
            Assert.That(mine.Price, Is.EqualTo(0));
            Assert.That(mine.Total, Is.EqualTo(mine.Fee));
            Assert.That(g.Pc.Inventory.Items[mine.PackIndex].Def, Is.EqualTo("ci_ch_skin_plate"));
        }

        [Test]
        public void ShortOfTollsNothingHappens()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(10);
            var o = Surgery.Offers(g, Surgeon, npc)[0];
            var r = Surgery.Perform(g, Surgeon, npc, o, 1, 0.99);
            Assert.That(r.Outcome, Is.EqualTo("cannot_pay"));
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(10));
            Assert.That(g.Pc.Sheet.Chrome == null || g.Pc.Sheet.Chrome.Count == 0, Is.True);
        }

        [Test]
        public void ACleanFitInstallsThePieceSellsItOnceAndBoxesTheOldOne()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(5000);
            // an eye already fitted: it comes out in its box
            Chrome.Install(g.Pc.Sheet, "ch_eye_scope", 1, 100, 5, 0.99);
            var o = Surgery.Offers(g, Surgeon, npc).Single(x => x.Def.Id == "ch_eye_heat");
            Assert.That(o.Replaces?.Id, Is.EqualTo("ch_eye_scope"));
            var r = Surgery.Perform(g, Surgeon, npc, o, 3, 0.99);
            Assert.That(r.Outcome, Is.EqualTo("clean"));
            Assert.That(r.Hours, Is.EqualTo(o.Def.Surgery.Hours));
            Assert.That(r.Paid, Is.EqualTo(o.Total));
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(5000 - o.Total));
            Assert.That(g.Pc.Sheet.Chrome["eyes"].Id, Is.EqualTo("ch_eye_heat"));
            Assert.That(g.Pc.Sheet.Chrome["eyes"].Condition, Is.EqualTo(1.0));
            Assert.That(g.Pc.Sheet.Chrome["eyes"].UpkeepDue, Is.EqualTo(3 + 10), "its upkeep falls due");
            Assert.That(Sheet.HasFlag(g.Pc.Sheet, "chrome_heat_vision"), Is.True, "it works on the sheet");
            Assert.That(r.Boxed?.Id, Is.EqualTo("ch_eye_scope"));
            Assert.That(Inv.CountItem(g.Pc.Inventory, "ci_ch_eye_scope"), Is.EqualTo(1), "the old piece in its box");
            Assert.That(Surgery.Offers(g, Surgeon, npc).Any(x => x.Source == "stock" && x.Def.Id == "ch_eye_heat"), Is.False, "sold once");
            Assert.That(Surgery.Offers(g, Surgeon, npc).Any(x => x.Source == "pack" && x.Def.Id == "ch_eye_scope"), Is.True, "the boxed piece can go back in");
        }

        [Test]
        public void ARejectedPieceCostsTheFeeAndABoughtOneIsRefunded()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(5000);
            var o = Surgery.Offers(g, Surgeon, npc).Single(x => x.Def.Id == "ch_arm_steady");
            var r = Surgery.Perform(g, Surgeon, npc, o, 1, 0.0);
            Assert.That(r.Outcome, Is.EqualTo("rejected"));
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(5000 - o.Fee), "the fee is spent, the piece refunded");
            Assert.That(r.Paid, Is.EqualTo(o.Fee));
            Assert.That(g.Pc.Sheet.Chrome == null || !g.Pc.Sheet.Chrome.ContainsKey("armL"), Is.True, "not fitted");
            Assert.That(Surgery.Offers(g, Surgeon, npc).Any(x => x.Def.Id == "ch_arm_steady"), Is.True, "still theirs to sell");
        }

        [Test]
        public void ARejectedPieceThePlayerBroughtGoesBackInItsBox()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(500);
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("ci_ch_skin_plate"));
            var o = Surgery.Offers(g, Surgeon, npc).Single(x => x.Source == "pack");
            Assert.That(Surgery.Perform(g, Surgeon, npc, o, 1, 0.0).Outcome, Is.EqualTo("rejected"));
            Assert.That(Inv.CountItem(g.Pc.Inventory, "ci_ch_skin_plate"), Is.EqualTo(1));
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(500 - o.Fee));
        }

        [Test]
        public void AComplicationFitsThePieceAtSixTenths()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(500);
            Inv.AddItem(g.Pc.Inventory, Inv.MakeItem("ci_ch_skin_plate"));
            var o = Surgery.Offers(g, Surgeon, npc).Single(x => x.Source == "pack");
            var r = Surgery.Perform(g, Surgeon, npc, o, 1, o.Risk * 0.75);
            Assert.That(r.Outcome, Is.EqualTo("complication"));
            Assert.That(g.Pc.Sheet.Chrome["skin"].Condition, Is.EqualTo(0.6));
            Assert.That(Inv.CountItem(g.Pc.Inventory, "ci_ch_skin_plate"), Is.EqualTo(0), "the brought piece went in");
        }

        [Test]
        public void RepairsAndRemovalsCostTheirFees()
        {
            var npc = Registry.Npcs[Surgeon];
            var g = Patient(200);
            Assert.That(Surgery.Repair(g, npc, "skin").Reason, Is.EqualTo("nothing"));
            Assert.That(Surgery.Remove(g, npc, "skin").Reason, Is.EqualTo("nothing"));
            Chrome.Install(g.Pc.Sheet, "ch_skin_plate", 1, 100, 5, 0.99);
            g.Pc.Sheet.Chrome["skin"].Condition = 0.5;
            var fee = Surgery.RepairFee(npc, 0.5);
            Assert.That(fee, Is.EqualTo(20 + 40), "half the base fee and 80 for the whole piece's wear");
            var w = Surgery.Repair(g, npc, "skin");
            Assert.That(w.Ok, Is.True);
            Assert.That(w.Hours, Is.EqualTo(Surgery.RepairHours));
            Assert.That(g.Pc.Sheet.Chrome["skin"].Condition, Is.EqualTo(1.0));
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(200 - fee));
            var rem = Surgery.Remove(g, npc, "skin");
            Assert.That(rem.Ok, Is.True);
            Assert.That(rem.Fee, Is.EqualTo(30), "three quarters of the base fee");
            Assert.That(g.Pc.Sheet.Chrome.ContainsKey("skin"), Is.False);
            Assert.That(Inv.CountItem(g.Pc.Inventory, "ci_ch_skin_plate"), Is.EqualTo(1), "out and boxed");
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(200 - fee - 30));
            // short of Tolls
            Chrome.Install(g.Pc.Sheet, "ch_skin_plate", 1, 100, 5, 0.99);
            g.Pc.Inventory.Tolls = 5;
            Assert.That(Surgery.Remove(g, npc, "skin").Reason, Is.EqualTo("cannot_pay"));
            Assert.That(g.Pc.Sheet.Chrome.ContainsKey("skin"), Is.True);
        }

        [Test]
        public void WhatAPieceGivesIsReadFromItsModsAndAbilities()
        {
            var gives = Surgery.Gives(Registry.Chrome["ch_eye_scope"]);
            Assert.That(gives, Does.Contain(("hit ranged", "+8")));
            Assert.That(gives, Does.Contain(("sightRange", "+4")));
            Assert.That(gives, Does.Contain(("weakpoint optics", (string)null)));
        }

        [Test]
        public void EverySurgeonsStockIsInTheCatalogueWithABoxedForm()
        {
            var surgeons = Registry.Npcs.Values.Where(n => n.Surgeon != null).ToList();
            Assert.That(surgeons, Is.Not.Empty);
            foreach (var s in surgeons)
                foreach (var id in s.Surgeon.Stock)
                {
                    Assert.That(Registry.Chrome.ContainsKey(id), Is.True, $"{s.Id}: {id} in the catalogue");
                    Assert.That(Items.Has("ci_" + id), Is.True, $"{id} has a boxed form");
                }
        }
    }
}
