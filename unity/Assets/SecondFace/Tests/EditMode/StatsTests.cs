using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    public class StatsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void DefaultSheetUsesExactlyTheCreationPoints()
        {
            var s = Sheet.Empty("A");
            Assert.That(Sheet.CreationPointsLeft(s.BaseAttrs), Is.EqualTo(0));
            s.Tagged.AddRange(new[] { "firearms", "speech", "science" });
            Assert.That(Sheet.ValidateCreation(s), Is.Empty);
        }

        [Test]
        public void TaggingAdds15AndDoublesGrowth()
        {
            var s = Sheet.Empty();
            var before = Sheet.Skill(s, "speech");
            s.Tagged.Add("speech");
            Assert.That(Sheet.Skill(s, "speech"), Is.EqualTo(before + 15));
            s.UnspentSkill = 3;
            Sheet.RaiseSkill(s, "speech");
            Assert.That(Sheet.Skill(s, "speech"), Is.EqualTo(before + 17));
            Assert.That(s.UnspentSkill, Is.EqualTo(2));
        }

        [Test]
        public void SkillsCapAt100AndMasteriesUnlockAt50And100()
        {
            var s = Sheet.Empty();
            s.SkillBought["security"] = 200;
            Assert.That(Sheet.Skill(s, "security"), Is.EqualTo(100));
            Assert.That(Sheet.HasFlag(s, "m_sec_salvage"), Is.True);
            Assert.That(Sheet.HasFlag(s, "m_sec_rearm"), Is.True);
            s.SkillBought["security"] = 0;
            Assert.That(Sheet.HasFlag(s, "m_sec_salvage"), Is.False);
        }

        [Test]
        public void TraitsModifyStats()
        {
            var s = Sheet.Empty();
            var ap = Sheet.Derived(s).Ap;
            s.Traits.Add("steady");
            Assert.That(Sheet.Derived(s).Ap, Is.EqualTo(ap - 1));
            s.Traits.Clear(); s.Traits.Add("bookish");
            Assert.That(Sheet.Derived(s).SkillPointsPerLevel, Is.EqualTo(8 + Sheet.Attr(s, "wits") + 3));
        }

        [Test]
        public void LevelsUpWithSkillPointsHpAndPerkPicks()
        {
            var s = Sheet.Empty();
            var hp0 = Sheet.Derived(s).MaxHp;
            var gained = Sheet.AddXp(s, Rules.XpForLevel(3));
            Assert.That(gained, Is.EqualTo(2));
            Assert.That(s.Level, Is.EqualTo(3));
            Assert.That(s.PendingPerks, Is.EqualTo(1));
            Assert.That(s.UnspentSkill, Is.EqualTo(2 * Sheet.Derived(s).SkillPointsPerLevel));
            Assert.That(Sheet.Derived(s).MaxHp, Is.GreaterThan(hp0));
            Assert.That(s.Hp, Is.EqualTo(Sheet.Derived(s).MaxHp));
        }

        [Test]
        public void PerkRequirementsAreEnforced()
        {
            var s = Sheet.Empty();
            Sheet.AddXp(s, Rules.XpForLevel(3));
            s.BaseAttrs["brawn"] = 6;
            Assert.That(Sheet.PerkAvailable(s, "brute"), Is.True);
            Assert.That(Sheet.TakePerk(s, "brute"), Is.True);
            Assert.That(s.Perks["brute"], Is.EqualTo(1));
            Assert.That(Sheet.TakePerk(s, "brute"), Is.False);
        }

        [Test]
        public void CrippledLegsCostApAndRadiationSapsAttributes()
        {
            var s = Sheet.Empty();
            var ap = Sheet.Derived(s).Ap; var grit = Sheet.Attr(s, "grit");
            s.Crippled["legL"] = true;
            Assert.That(Sheet.Derived(s).Ap, Is.EqualTo(ap - 1));
            s.Rads = 600;
            Assert.That(Sheet.Attr(s, "grit"), Is.EqualTo(grit - 2));
        }

        [Test]
        public void RollsAStartWithRealVariance()
        {
            var rng = new Rng(7);
            var pools = new System.Collections.Generic.List<int>();
            for (int i = 0; i < 2000; i++)
            {
                var r = Sheet.RollAttributes(rng);
                pools.Add(r.Pool);
                int sum = 0; foreach (var a in Rules.Attributes) sum += r.Attrs[a] - Rules.AttrBase;
                Assert.That(sum, Is.EqualTo(r.Pool));
                foreach (var a in Rules.Attributes) Assert.That(r.Attrs[a], Is.InRange(Rules.AttrMin, Rules.AttrCreationMax));
            }
            double mean = 0; foreach (var p in pools) mean += p; mean /= pools.Count;
            Assert.That(mean, Is.GreaterThan(Rules.AttrCreationPoints - 2));
            Assert.That(mean, Is.LessThan(Rules.AttrCreationPoints + 3));
            Assert.That(pools.Min(), Is.LessThan(2));
            Assert.That(pools.Max(), Is.GreaterThan(22));
            double great = 0; foreach (var p in pools) if (p >= 18) great++; great /= pools.Count;
            Assert.That(great, Is.GreaterThan(0.005).And.LessThan(0.25));
        }

        [Test]
        public void ARolledSheetValidatesAgainstItsOwnPool()
        {
            var s = Sheet.Empty();
            s.Name = "Tester";
            var r = Sheet.RollAttributes(new Rng(3));
            s.BaseAttrs = new System.Collections.Generic.Dictionary<string, int>(r.Attrs);
            s.CreationPool = r.Pool;
            Assert.That(Sheet.CreationPointsLeft(s.BaseAttrs, s.CreationPool.Value), Is.EqualTo(0));
            s.Tagged.AddRange(new[] { "firearms", "melee", "survival" });
            Assert.That(Sheet.ValidateCreation(s).FindAll(e => e.Contains("attribute")), Is.Empty);
            s.BaseAttrs["brawn"] -= 1;
            Assert.That(Sheet.ValidateCreation(s), Does.Contain("Distribute all attribute points."));
            s.CreationPool = null;
            Assert.That(Sheet.CreationPointsLeft(s.BaseAttrs), Is.EqualTo(Rules.AttrCreationPoints - (r.Pool - 1)));
        }
    }
}
