using System.Collections.Generic;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    public class CombatTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static Combatant Fighter(string id, int x, int y, string weapon = null, string ammo = null)
        {
            var inv = Inv.Empty();
            if (weapon != null) { Inv.AddItem(inv, Inv.MakeItem(weapon)); Inv.Equip(inv, 0); }
            if (ammo != null) { Inv.AddItem(inv, Inv.MakeItem(ammo, 50)); Inv.Reload(inv); }
            return new Combatant { Id = id, Name = id, Team = id, Sheet = Sheet.Empty(id), Inv = inv, X = x, Y = y, Ap = 8, Morale = 60 };
        }

        [Test]
        public void HitChanceFallsWithDistanceCoverAndAiming()
        {
            var a = Fighter("a", 0, 0, "w_pistol9", "a_9mm");
            a.Sheet.SkillBought["firearms"] = 70;
            var near = Fighter("b", 3, 0); var far = Fighter("c", 25, 0);
            var baseChance = CombatRules.HitChance(a, near);
            Assert.That(CombatRules.HitChance(a, far), Is.LessThan(baseChance));
            Assert.That(CombatRules.HitChance(a, near, new AttackOpts { Cover = "half" }), Is.LessThan(baseChance));
            Assert.That(CombatRules.HitChance(a, near, new AttackOpts { Aimed = "eyes" }), Is.LessThan(CombatRules.HitChance(a, near, new AttackOpts { Aimed = "legL" })));
            Assert.That(CombatRules.HitChance(a, near, new AttackOpts { Aimed = "eyes", Cover = "full" }), Is.EqualTo(5));
        }

        [Test]
        public void MeleeCannotReachBeyondRange()
        {
            var a = Fighter("a", 0, 0, "w_pipe");
            Assert.That(CombatRules.HitChance(a, Fighter("b", 2, 0)), Is.EqualTo(0));
            Assert.That(CombatRules.HitChance(a, Fighter("b", 1, 1)), Is.GreaterThan(0));
        }

        [Test]
        public void AttacksConsumeAmmoWearWeaponsAndDealDamageOverTrials()
        {
            var rng = new Rng(1);
            var a = Fighter("a", 0, 0, "w_revolver38", "a_38");
            int total = 0;
            for (int i = 0; i < 6; i++) { var d = Fighter("d", 2, 0); d.Sheet.Hp = 1000; total += CombatRules.ResolveAttack(rng, a, d).Damage; }
            Assert.That(total, Is.GreaterThan(0));
            Assert.That(a.Inv.Equipped["primary"].Loaded, Is.EqualTo(0));
            Assert.That(a.Inv.Equipped["primary"].Cond, Is.LessThan(1));
            Assert.That(CombatRules.CanAttack(a).Ok, Is.False);
        }

        [Test]
        public void ArmourReducesDamage()
        {
            var rng1 = new Rng(7); var rng2 = new Rng(7);
            var a1 = Fighter("a", 0, 0, "w_pipe"); var a2 = Fighter("a", 0, 0, "w_pipe");
            var bare = Fighter("b", 1, 0); var armoured = Fighter("b", 1, 0, "r_riot");
            armoured.Sheet.GearMods = new List<Modifier> { new Modifier("derived:dt", 6), new Modifier("derived:dr", 30) };
            bare.Sheet.Hp = armoured.Sheet.Hp = 1000;
            int d1 = 0, d2 = 0;
            for (int i = 0; i < 40; i++) { d1 += CombatRules.ResolveAttack(rng1, a1, bare).Damage; d2 += CombatRules.ResolveAttack(rng2, a2, armoured).Damage; }
            Assert.That(d2, Is.LessThan(d1));
        }

        [Test]
        public void KillsSetHpToZeroAndBurstFiresSeveralRounds()
        {
            var rng = new Rng(3);
            var a = Fighter("a", 0, 0, "w_smg9", "a_9mm");
            a.Sheet.SkillBought["firearms"] = 80;
            var d = Fighter("d", 2, 0);
            d.Sheet.Hp = 5;
            var r = CombatRules.ResolveAttack(rng, a, d, new AttackOpts { Burst = true });
            Assert.That(r.RoundsFired, Is.GreaterThan(1));
            Assert.That(d.Sheet.Hp, Is.EqualTo(0));
            Assert.That(r.Killed, Is.True);
            Assert.That(CombatRules.AttackAp(a, burst: true), Is.EqualTo(6));
        }

        [Test]
        public void TurnOrderIsByInitiative()
        {
            var fast = Fighter("fast", 0, 0); var slow = Fighter("slow", 0, 0);
            fast.Sheet.BaseAttrs["senses"] = 10; fast.Sheet.BaseAttrs["reflex"] = 10;
            slow.Sheet.BaseAttrs["senses"] = 1; slow.Sheet.BaseAttrs["reflex"] = 1;
            Assert.That(CombatRules.TurnOrder(new Rng(5), new[] { slow, fast })[0].Id, Is.EqualTo("fast"));
        }

        [Test]
        public void MoraleMovesWithEventsAndCourage()
        {
            var c = Fighter("c", 0, 0); c.Morale = CombatRules.InitialMorale(50); c.Courage = 50;
            CombatRules.MoraleEvent(c, "ally_down");
            Assert.That(c.Morale, Is.LessThan(CombatRules.InitialMorale(50)));
            var brave = Fighter("b", 0, 0); brave.Morale = CombatRules.InitialMorale(90); brave.Courage = 90;
            CombatRules.MoraleEvent(brave, "ally_down");
            Assert.That(CombatRules.InitialMorale(90) - brave.Morale, Is.LessThan(CombatRules.InitialMorale(50) - c.Morale));
        }
    }
}
