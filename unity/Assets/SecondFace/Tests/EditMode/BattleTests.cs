using System;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>The open-world battle (P6.4): turns, AP by distance, attacks, the AI's steps, the end.</summary>
    public class BattleTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        /// <summary>An open flat field: straight-line distances, everyone seen, no cover, a ring of standing points.</summary>
        private sealed class OpenField : IBattleField
        {
            public string CoverAll = "none";
            public double PathLength(BattleUnit u, double x, double z) => Math.Sqrt((u.PX - x) * (u.PX - x) + (u.PZ - z) * (u.PZ - z));
            public bool LineOfSight(BattleUnit a, BattleUnit b) => true;
            public bool LineOfSightFrom(double x, double z, BattleUnit b) => true;
            public string Cover(BattleUnit att, BattleUnit def) => CoverAll;
            public CombatContext Context(BattleUnit def) => new CombatContext();
            public IEnumerable<(double X, double Z)> Candidates(BattleUnit u, double reach)
            {
                for (var a = 0; a < 12; a++)
                    for (var r = 1.0; r <= reach; r += 1.5)
                        yield return (u.PX + Math.Cos(a * Math.PI / 6) * r, u.PZ + Math.Sin(a * Math.PI / 6) * r);
            }
        }

        private static BattleUnit Unit(string id, double x, double z, bool hostile, string weapon = null, string ammo = null, bool player = false)
        {
            var inv = Inv.Empty();
            if (weapon != null) { Inv.AddItem(inv, Inv.MakeItem(weapon)); Inv.Equip(inv, 0); }
            if (ammo != null) { Inv.AddItem(inv, Inv.MakeItem(ammo, 60)); Inv.Reload(inv); }
            var c = new Combatant { Id = id, Name = id, Team = hostile ? "them" : "us", Sheet = Sheet.Empty(id), Inv = inv, Morale = 60, IsPlayer = player };
            var u = new BattleUnit { C = c, Hostile = hostile };
            u.Place(x, z);
            return u;
        }

        [Test]
        public void MovingCostsApByDistance()
        {
            var b = new Battle(new OpenField(), new Rng(3));
            var p = Unit("p", 0, 0, false, player: true);
            b.Start(new[] { p, Unit("e", 20, 0, true) });
            p.C.Ap = 8;
            Assert.That(b.MoveCost(p, 3, 0), Is.EqualTo(2));
            Assert.That(b.MoveCost(p, 0.1, 0), Is.EqualTo(0));
            b.Moved(p, 4.4, 0, 4.4);
            Assert.That(p.C.Ap, Is.EqualTo(5));
            Assert.That(p.C.X, Is.EqualTo(4));
        }

        [Test]
        public void MeleeNeedsReachAndRangedNeedsSight()
        {
            var b = new Battle(new OpenField(), new Rng(3));
            var p = Unit("p", 0, 0, false, "w_pipe", player: true);
            var e = Unit("e", 5, 0, true);
            b.Start(new[] { p, e });
            p.C.Ap = 8;
            Assert.That(b.Preview(p, e).Ok, Is.False);
            e.Place(1.2, 0);
            Assert.That(b.Preview(p, e).Ok, Is.True);
        }

        /// <summary>A field where sight runs out at 15 m (a rise, a wall between): nobody can shoot across it.</summary>
        private sealed class ShortSight : IBattleField
        {
            private readonly OpenField _open = new();
            public double PathLength(BattleUnit u, double x, double z) => _open.PathLength(u, x, z);
            public bool LineOfSight(BattleUnit a, BattleUnit b) => Battle.Distance(a, b) < 15;
            public bool LineOfSightFrom(double x, double z, BattleUnit b) => Math.Sqrt((x - b.PX) * (x - b.PX) + (z - b.PZ) * (z - b.PZ)) < 15;
            public string Cover(BattleUnit att, BattleUnit def) => "none";
            public CombatContext Context(BattleUnit def) => new CombatContext();
            public IEnumerable<(double X, double Z)> Candidates(BattleUnit u, double reach) => _open.Candidates(u, reach);
        }

        [Test]
        public void NobodyWaitsForeverOutOfSight()
        {
            // two riflemen 40 m apart with no line between them: each closes in rather than waiting, and the player's own
            // body on the AI never runs or gives up
            var b = new Battle(new ShortSight(), new Rng(5));
            var p = Unit("p", 0, 0, false, "w_pistol9", "a_9mm", player: true);
            var e = Unit("e", 40, 0, true, "w_pistol9", "a_9mm");
            b.Start(new[] { p, e });
            var u = b.NextTurn();
            var a = b.Choose(u);
            Assert.That(a.Kind, Is.EqualTo("move"), $"{u.C.Id} {a.Kind} ({a.Why})");
            Assert.That(Math.Abs(a.X - (u == p ? e.PX : p.PX)), Is.LessThan(40), "towards the other");
            p.C.Morale = 1; p.C.Sheet.Hp = 2;
            foreach (var x in new[] { "flee", "surrender" }) Assert.That(b.Choose(p).Kind, Is.Not.EqualTo(x));
        }

        [Test]
        public void TheSideThatStartsItMovesFirst()
        {
            // a fight the player's side began (a signal to a rifle on the rise): all of that side act before the other
            for (var seed = 1u; seed <= 8; seed++)
            {
                var b = new Battle(new OpenField(), new Rng(seed));
                var p = Unit("p", 0, 0, false, "w_pistol9", "a_9mm", player: true);
                var ally = Unit("ally", 20, 20, false, "w_pistol9", "a_9mm");
                var e1 = Unit("e1", 9, 2, true, "w_pipe");
                var e2 = Unit("e2", 10, -3, true, "w_machete");
                b.Start(new[] { e1, p, e2, ally }, false, ourMove: true);
                Assert.That(b.Order.Take(2).All(u => !u.Hostile), Is.True, $"seed {seed}: {string.Join(", ", b.Order.Select(u => u.C.Id))}");
                Assert.That(b.Order.Skip(2).All(u => u.Hostile), Is.True);
            }
        }

        [Test]
        public void AiFightsToAnEndOnBothSides()
        {
            // both sides played by the AI: the battle must end (victory, defeat or a rout) within a sane number of turns
            for (var seed = 1u; seed <= 6; seed++)
            {
                var b = new Battle(new OpenField(), new Rng(seed));
                var p = Unit("p", 0, 0, false, "w_pistol9", "a_9mm", player: true);
                p.C.Sheet.SkillBought["firearms"] = 60;
                var e1 = Unit("e1", 9, 2, true, "w_pipe");
                var e2 = Unit("e2", 10, -3, true, "w_machete");
                b.Start(new[] { p, e1, e2 });
                var turns = 0;
                for (var u = b.NextTurn(); u != null && turns < 200; u = b.NextTurn(), turns++)
                {
                    for (var step = 0; step < 10 && b.Active && u.C.Ap > 0; step++)
                    {
                        var ap = u.C.Ap;
                        var a = b.Choose(u);
                        if (a.Kind == "wait") break;
                        if (a.Kind == "attack" || a.Kind == "burst") b.Attack(u, a.Target, null, a.Kind == "burst");
                        else if (a.Kind == "move" || a.Kind == "flee") b.Moved(u, a.X, a.Z, new OpenField().PathLength(u, a.X, a.Z));
                        else if (a.Kind == "reload") b.Reload(u);
                        else if (a.Kind == "heal") b.UseItem(u, Battle.HealItem, 0);
                        else if (a.Kind == "surrender") { u.Fled = true; u.Surrendered = true; break; }
                        if (a.Kind == "flee") { u.Fled = true; break; }
                        if (u.C.Ap == ap) break;
                    }
                    b.EndTurn();
                }
                Assert.That(b.Active, Is.False, $"seed {seed}: still fighting after {turns} turns");
                Assert.That(b.Outcome, Is.Not.Null);
            }
        }
    }
}
