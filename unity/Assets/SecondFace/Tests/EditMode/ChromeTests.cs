using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    public class ChromeTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void ACleanInstallGrantsItsModsAndAbilities()
        {
            var s = Sheet.Empty("t");
            var before = Sheet.Derived(s).Dt;
            Assert.That(Chrome.Install(s, "ch_skin_plate", 1, 100, 5, 0.99), Is.EqualTo("clean"));
            Assert.That(Sheet.Derived(s).Dt, Is.EqualTo(before + 3));
            Assert.That(Chrome.Install(s, "ch_eye_scope", 1, 100, 5, 0.99), Is.EqualTo("clean"));
            Assert.That(Sheet.HasFlag(s, "chrome_weakpoint_optics"), Is.True);
            Assert.That(Sheet.ModSum(s, "hit_ranged"), Is.GreaterThanOrEqualTo(8));
        }

        [Test]
        public void SurgeryRiskFallsWithSkillAndGritAndRejectionDoesNotInstall()
        {
            var d = Registry.Chrome["ch_neural_reflex"];
            Assert.That(Chrome.SurgeryRisk(d, 30, 5), Is.GreaterThan(Chrome.SurgeryRisk(d, 80, 5)));
            Assert.That(Chrome.SurgeryRisk(d, 80, 9), Is.LessThan(Chrome.SurgeryRisk(d, 80, 5)));
            var s = Sheet.Empty("t");
            Assert.That(Chrome.Install(s, "ch_neural_reflex", 1, 0, 5, 0.01), Is.EqualTo("rejected"));
            Assert.That(s.Chrome, Is.Null.Or.Not.ContainKey("neural"));
            Assert.That(Chrome.Install(s, "ch_neural_reflex", 1, 0, 5, Chrome.SurgeryRisk(d, 0, 5) * 0.9), Is.EqualTo("complication"));
            Assert.That(s.Chrome["neural"].Condition, Is.EqualTo(0.6));
        }

        [Test]
        public void MissedUpkeepDegradesChromeUntilItStopsWorking()
        {
            var s = Sheet.Empty("t");
            Chrome.Install(s, "ch_legs_spring", 0, 100, 5, 0.99);
            Assert.That(Sheet.HasFlag(s, "chrome_spring_legs"), Is.True);
            int held = 1;
            for (int day = 7; day < 22; day++) Chrome.TickUpkeep(s, day, _ => held-- > 0);
            Assert.That(s.Chrome["legs"].Condition, Is.LessThan(Chrome.Working));
            Assert.That(Sheet.HasFlag(s, "chrome_spring_legs"), Is.False);
            Chrome.Remove(s, "legs");
            Assert.That(s.Chrome, Does.Not.ContainKey("legs"));
        }

        [Test]
        public void DriftRisesTowardsTheLoadEasedByGrit()
        {
            var s = Sheet.Empty("t");
            foreach (var id in new[] { "ch_neural_reflex", "ch_arm_breaker", "ch_skin_plate", "ch_legs_spring", "ch_eye_heat" }) Chrome.Install(s, id, 0, 100, 5, 0.99);
            var b = Chrome.DriftBaseline(s, 5);
            Assert.That(b, Is.GreaterThan(75));
            Assert.That(Chrome.DriftBaseline(s, 9), Is.LessThan(b));
            for (int d = 0; d < 20; d++) Chrome.SettleDrift(s, 5);
            Assert.That(s.Drift, Is.GreaterThan(b - 2));
            Assert.That(Chrome.DriftBand(s.Drift.Value), Is.EqualTo("drifting"));
            Assert.That(Chrome.EpisodeChance(s.Drift.Value), Is.GreaterThan(0));
            Assert.That(Chrome.EpisodeChance(30), Is.EqualTo(0));
        }

        [Test]
        public void TheCatalogueCoversEverySlotAndGrade()
        {
            var defs = Registry.Chrome.Values.ToList();
            Assert.That(defs.Select(d => d.Slot).Distinct().Count(), Is.EqualTo(8));
            Assert.That(new HashSet<string>(defs.Select(d => d.Grade)), Is.EquivalentTo(new[] { "old", "dark", "concern" }));
        }

        [Test]
        public void RulesContentDeserialisesStrictly()
        {
            var db = ContentFixture.Db();
            Assert.That(Registry.Table<TraitDef>(db, "traits", true).Count, Is.GreaterThan(5));
            Assert.That(Registry.Table<PerkDef>(db, "perks", true).Count, Is.GreaterThan(10));
            Assert.That(Registry.Table<ChromeDef>(db, "chrome", true).Count, Is.GreaterThan(8));
        }
    }
}
