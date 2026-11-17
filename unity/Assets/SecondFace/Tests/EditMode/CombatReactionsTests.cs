using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>COMBAT.md C3 (overwatch, ambush, interrupts from perks) and C7 (suppression, cover fire).</summary>
    public class CombatReactionsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static Battle Start(GridField g, uint seed, params BattleUnit[] us)
        {
            var b = new Battle(g, new Rng(seed));
            b.Start(us);
            foreach (var u in us) u.C.Ap = CombatRules.MaxAp(u.C);
            return b;
        }

        [Test]
        public void OverwatchFiresOnceOnWhoeverMovesInSightAtAPenalty()
        {
            var g = new GridField(40, 30);
            var w = Arena.Unit("w", 5.5, 15.5, false, "w_pistol9", "a_9mm", skill: 40);
            var m = Arena.Unit("m", 18.5, 3.5, true, "w_pistol9", "a_9mm");
            m.C.Sheet.Hp = 500;
            var b = Start(g, 1, w, m);
            Assert.That(b.Overwatch(w), Is.True);
            Assert.That(w.C.Ap, Is.Zero, "holding a shot ends the turn");
            m.C.Ap = 10;
            var o = b.Moved(m, 18.5, 12.5, 9);
            Assert.That(o.Reactions.Count, Is.EqualTo(1));
            Assert.That(o.Reactions[0].Attacker, Is.SameAs(w));
            Assert.That(o.Reactions[0].Kind, Is.EqualTo("reaction"));
            Assert.That(w.Watch, Is.Null, "one shot");
            var opts = b.OptsFor(w, m); opts.Reaction = true;
            Assert.That(CombatRules.Breakdown(w.C, m.C, opts).Of("reaction"), Is.EqualTo(-Tactics.ReactionPenalty));
            Assert.That(b.Moved(m, 18.5, 20.5, 8).Reactions, Is.Empty, "spent");
        }

        [Test]
        public void OverwatchKeepsToItsConeAndItsSight()
        {
            var g = new GridField(40, 30).Rect(10, 0, 10, 12, GridField.Wall);
            var w = Arena.Unit("w", 5.5, 15.5, false, "w_pistol9", "a_9mm");
            var m = Arena.Unit("m", 18.5, 25.5, true, "w_pistol9", "a_9mm");
            var hid = Arena.Unit("h", 15.5, 2.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, 1, w, m, hid);
            Assert.That(b.Overwatch(w, 1, -1, 30), Is.True, "a cone to the south-east");
            m.C.Ap = 10;
            Assert.That(b.Moved(m, 22.5, 25.5, 4).Reactions, Is.Empty, "outside the cone");
            hid.C.Ap = 10;
            Assert.That(b.Moved(hid, 15.5, 8.5, 6).Reactions, Is.Empty, "behind the wall");
            Assert.That(w.Watch, Is.Not.Null, "still held");
        }

        [Test]
        public void TheOverwatchPerkHoldsByItselfAndShootsSteady()
        {
            var g = new GridField(40, 30);
            var w = Arena.Unit("w", 5.5, 15.5, false, "w_pistol9", "a_9mm", player: true);
            w.C.Sheet.Perks["overwatch"] = 1;
            var m = Arena.Unit("m", 18.5, 3.5, true, "w_pistol9", "a_9mm");
            var b = new Battle(g, new Rng(2));
            b.Start(new[] { w, m });
            var u = b.NextTurn();
            for (var i = 0; i < 4 && u != w; i++) { b.EndTurn(); u = b.NextTurn(); }
            Assert.That(u, Is.SameAs(w));
            b.EndTurn();
            Assert.That(w.Watch, Is.Not.Null, "4+ AP left: it watches");
            Assert.That(w.C.Evasion, Is.Zero, "the AP is held, not banked");
            m.C.Ap = 10; m.C.Sheet.Hp = 500;
            var o = b.Moved(m, 18.5, 14.5, 11);
            Assert.That(o.Reactions.Count, Is.EqualTo(1));
            Assert.That(b.History.Last(h => h.Kind == "reaction").Attacker, Is.SameAs(w));
            // what it held lapses at its own next turn
            b.Overwatch(w); Assert.That(w.Watch, Is.Null, "no AP left to hold another");
        }

        [Test]
        public void HeldShotsLapseAtTheHoldersNextTurn()
        {
            var g = new GridField(40, 30);
            var w = Arena.Unit("w", 5.5, 15.5, false, "w_pistol9", "a_9mm", player: true);
            var m = Arena.Unit("m", 30.5, 15.5, true, "w_pistol9", "a_9mm");
            var b = new Battle(g, new Rng(2));
            b.Start(new[] { w, m });
            for (var u = b.NextTurn(); u != null; u = b.NextTurn())
            {
                if (u == w) { if (b.Round > 1) { Assert.That(w.Watch, Is.Null); break; } b.Overwatch(w); }
                b.EndTurn();
            }
        }

        [Test]
        public void AnAmbushFiresSteadyFromHidingAndSpringsTogether()
        {
            var g = new GridField(40, 30);
            var a1 = Arena.Unit("a1", 25.5, 10.5, true, "w_pistol9", "a_9mm", skill: 40);
            var a2 = Arena.Unit("a2", 25.5, 20.5, true, "w_pistol9", "a_9mm", skill: 40);
            a1.C.Sheet.Perks["shadow_strike"] = 1;
            var m = Arena.Unit("m", 5.5, 2.5, false, "w_pistol9", "a_9mm", player: true);
            m.C.Sheet.Hp = 500;
            var b = new Battle(g, new Rng(3));
            b.Start(new[] { m, a1, a2 });
            b.Ambush(a1, 1, -1, 0, 60); b.Ambush(a2, 1, -1, 0, 60);
            Assert.That(a1.Hidden && a2.Hidden, Is.True);
            Assert.That(b.Watches().Any(v => v.Unit.Hostile), Is.False, "the UI does not show a hidden ambush");
            m.C.Ap = 10;
            var o = b.Moved(m, 12.5, 10.5, 11);
            Assert.That(o.Reactions.Select(r => r.Attacker), Does.Contain(a1));
            Assert.That(a1.Hidden || a2.Hidden, Is.False, "the group is sprung");
            var shot = o.Reactions.First(r => r.Attacker == a1);
            Assert.That(shot.Result.Hits.Where(h => h.Hit).All(h => h.Crit), Is.True, "Shadow Strike: from hiding, every hit a crit");
        }

        [Test]
        public void CoverFireAnswersAnAttackFirstAndPinsTheAttacker()
        {
            var g = new GridField(40, 30);
            var cover = Arena.Unit("c", 5.5, 20.5, false, "w_carbine556", "a_556", skill: 70);
            var friend = Arena.Unit("f", 5.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var att = Arena.Unit("e", 18.5, 12.5, true, "w_pistol9", "a_9mm");
            att.C.Sheet.Hp = 500; friend.C.Sheet.Hp = 500;
            var b = Start(g, 4, cover, friend, att);
            Assert.That(b.CoverFire(cover, friend), Is.True);
            var pv = b.Preview(att, friend, ShotOptions.Snap);
            Assert.That(pv.Answered, Does.Contain(cover), "the preview warns");
            var hit = b.Attack(att, friend);
            Assert.That(hit.Interrupts.Count, Is.EqualTo(1));
            Assert.That(hit.Interrupts[0].Attacker, Is.SameAs(cover));
            if (hit.Interrupts[0].Result.Hits.Any(h => h.Hit)) Assert.That(Status.Has(att.C, Status.Suppressed), Is.True, "a hit pins");
            Assert.That(b.History.IndexOf(hit.Interrupts[0]), Is.LessThan(b.History.IndexOf(hit)), "the answer comes first");
        }

        [Test]
        public void SuppressionPinsTakesAPAndAimAndAMoveDrawsTheShot()
        {
            var g = new GridField(40, 30);
            var s = Arena.Unit("s", 5.5, 15.5, false, "w_smg9", "a_9mm", player: true, skill: 50);
            var t = Arena.Unit("t", 20.5, 15.5, true, "w_pistol9", "a_9mm");
            t.C.Sheet.Hp = 500;
            var b = new Battle(g, new Rng(5));
            b.Start(new[] { s, t }, ourMove: true);
            var u = b.NextTurn();
            Assert.That(u, Is.SameAs(s));
            var loaded = s.C.Inv.EquippedAt("primary").Loaded;
            var morale = t.C.Morale;
            var hit = b.Suppress(s, t);
            Assert.That(hit, Is.Not.Null);
            Assert.That(s.C.Inv.EquippedAt("primary").Loaded, Is.EqualTo(loaded - 6), "a burst's rounds");
            Assert.That(Status.Has(t.C, Status.Suppressed), Is.True);
            Assert.That(t.C.Morale, Is.LessThan(morale), "it shakes the nerve");
            b.EndTurn();
            u = b.NextTurn();
            Assert.That(u, Is.SameAs(t));
            Assert.That(t.C.Ap, Is.EqualTo(CombatRules.MaxAp(t.C) - 1), "pinned: an AP less");
            Assert.That(b.Preview(t, s, ShotOptions.Snap).Hit.Of("status"), Is.EqualTo(-15), "and 15 aim");
            var o = b.Moved(t, 20.5, 20.5, 5);
            Assert.That(o.Reactions.Count, Is.EqualTo(1));
            Assert.That(o.Reactions[0].Kind, Is.EqualTo("suppression"));
            b.EndTurn();
            Assert.That(Status.Has(t.C, Status.Suppressed), Is.False, "it lasts through the target's next turn");
            // the perk pins harder
            s.C.Sheet.Perks["suppressing_fire"] = 1;
            SecondFace.Core.Inventory.Inv.Reload(s.C.Inv);
            s.C.Ap = 10; s.Watch = null;
            b.Suppress(s, t);
            Assert.That(Status.Get(t.C, Status.Suppressed).Power, Is.EqualTo(2));
        }

        [Test]
        public void ARiposteAnswersAMissedBlowAndAFollowThroughCarriesAKill()
        {
            var g = new GridField(30, 20);
            // a missed blow at a master of blades is answered
            BattleHit hit = null;
            for (uint seed = 1; seed < 60 && (hit == null || hit.Followups.Count == 0); seed++)
            {
                var att = Arena.Unit("a", 10.5, 10.5, true, "w_pipe", skill: 0);
                var def = Arena.Unit("d", 11.5, 10.5, false, "w_machete", player: true, skill: 100);
                att.C.Sheet.Hp = 500;
                var b = Start(g, seed, att, def);
                Assert.That(Sheet.HasFlag(def.C.Sheet, "m_melee_riposte"), Is.True);
                hit = b.Attack(att, def);
                if (hit.Result.Hits.Any(h => h.Hit)) hit = null;
            }
            Assert.That(hit, Is.Not.Null, "a miss in sixty tries");
            Assert.That(hit.Followups.Single().Kind, Is.EqualTo("riposte"));
            // a kill with a blade carries on to the next within reach
            var k = Arena.Unit("k", 10.5, 10.5, false, "w_machete", player: true, skill: 200);
            k.C.Sheet.Perks["cleave"] = 1;
            var v1 = Arena.Unit("v1", 11.5, 10.5, true); v1.C.Sheet.Hp = 1;
            var v2 = Arena.Unit("v2", 10.5, 11.5, true); v2.C.Sheet.Hp = 300;
            var bc = Start(g, 9, k, v1, v2);
            BattleHit kh = null;
            for (var i = 0; i < 10 && v1.Alive; i++) { k.C.Ap = 10; kh = bc.Attack(k, v1); }
            Assert.That(v1.Alive, Is.False);
            Assert.That(kh.Followups.Any(f => f.Kind == "cleave" && f.Defender == v2), Is.True);
        }

        [Test]
        public void GuardsStrikeWhoeverStepsWithinReach()
        {
            var g = new GridField(30, 20);
            var gd = Arena.Unit("g", 10.5, 10.5, false, "w_machete", skill: 60);
            var m = Arena.Unit("m", 20.5, 10.5, true, "w_pistol9", "a_9mm");
            m.C.Sheet.Hp = 500;
            var b = Start(g, 1, gd, m);
            Assert.That(b.Overwatch(gd), Is.True);
            Assert.That(gd.Watch.Mode, Is.EqualTo(Watch.Guard));
            m.C.Ap = 10;
            Assert.That(b.Moved(m, 15.5, 10.5, 5).Reactions, Is.Empty, "out of reach");
            Assert.That(b.Moved(m, 11.5, 10.5, 4).Reactions.Count, Is.EqualTo(1), "steps within reach");
        }
    }
}
