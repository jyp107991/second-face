using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>COMBAT.md C1 (cover from geometry, flanking, height), C2 (stances) and the UI's questions (B1 reachable,
    /// B2 the walk's preview, B3 the hit chance with its reasons).</summary>
    public class CombatTacticsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static Battle Start(GridField g, params BattleUnit[] us)
        {
            var b = new Battle(g, new Rng(11));
            b.Start(us);
            foreach (var u in us) u.C.Ap = CombatRules.MaxAp(u.C);
            return b;
        }

        [Test]
        public void CoverCountsOnlyWithinItsArcAndAFlankIgnoresIt()
        {
            // a low wall east of the defender: half cover against the east, none against the south (flanked)
            var g = new GridField(30, 20).Set(10, 10, GridField.Low);
            var def = Arena.Unit("d", 9.5, 10.5, true);
            var east = Arena.Unit("e", 17.5, 10.5, false, "w_pistol9", "a_9mm", skill: 40);
            var south = Arena.Unit("s", 9.5, 2.5, false, "w_pistol9", "a_9mm", skill: 40);
            var b = Start(g, def, east, south);
            var pe = b.Preview(east, def, ShotOptions.Snap);
            var ps = b.Preview(south, def, ShotOptions.Snap);
            Assert.That(pe.Hit.Cover, Is.EqualTo("half"));
            Assert.That(pe.Hit.Of("cover"), Is.EqualTo(-20));
            Assert.That(ps.Hit.Flanked, Is.True, "the south flanks the wall");
            Assert.That(ps.Hit.Cover, Is.EqualTo("none"));
            Assert.That(ps.Chance - pe.Chance, Is.EqualTo(20), "the same shot without the cover");
            Assert.That(ps.Crit - pe.Crit, Is.EqualTo(Tactics.FlankCrit), "a flank crits more");
            // within 60° of the wall still counts (a shot from the north-east)
            var ne = Arena.Unit("ne", 15.5, 16.5, false, "w_pistol9", "a_9mm");
            b.Units.Add(ne);
            Assert.That(b.CoverAt(ne, ne.PX, ne.PZ, def, def.PX, def.PZ).Level, Is.EqualTo("half"));
            Assert.That(b.CoverAt(ne, 9.5, 18.5, def, def.PX, def.PZ).Flanked, Is.True, "straight from the north is a flank");
        }

        [Test]
        public void AWallIsFullCoverAndBlocksSight()
        {
            var g = new GridField(30, 20).Set(10, 10, GridField.Wall);
            var def = Arena.Unit("d", 9.5, 10.5, true);
            var behind = Arena.Unit("e", 17.5, 10.5, false, "w_pistol9", "a_9mm");
            // (round the wall's corner, still within its arc: leaning out to shoot at someone in full cover)
            var side = Arena.Unit("s", 13.5, 16.5, false, "w_pistol9", "a_9mm");
            var b = Start(g, def, behind, side);
            var p = b.Preview(behind, def, ShotOptions.Snap);
            Assert.That(p.Ok, Is.False);
            Assert.That(p.Reason, Is.EqualTo("No line of sight"));
            var ps = b.Preview(side, def, ShotOptions.Snap);
            Assert.That(ps.Ok, Is.True, $"{ps.Reason}");
            Assert.That(ps.Hit.Cover, Is.EqualTo("full"));
            Assert.That(ps.Hit.Of("cover"), Is.EqualTo(-40));
        }

        [Test]
        public void HighGroundAimsBetterAndDeniesLowCover()
        {
            // the attacker on a 2 m rise; the defender below behind a low wall facing the rise
            var g = new GridField(30, 20).Raise(0, 0, 9, 19, 2.0).Set(14, 10, GridField.Low);
            var flat = new GridField(30, 20).Set(14, 10, GridField.Low);
            var def = Arena.Unit("d", 15.5, 10.5, true);
            var att = Arena.Unit("a", 5.5, 10.5, false, "w_carbine556", "a_556", skill: 30);
            var hi = Start(g, def, att).Preview(att, def, ShotOptions.Snap);
            var def2 = Arena.Unit("d", 15.5, 10.5, true);
            var att2 = Arena.Unit("a", 5.5, 10.5, false, "w_carbine556", "a_556", skill: 30);
            var lo = Start(flat, def2, att2).Preview(att2, def2, ShotOptions.Snap);
            Assert.That(hi.Hit.HighGround, Is.True);
            Assert.That(hi.Hit.Of("height"), Is.EqualTo(Tactics.HighGroundAim));
            Assert.That(hi.Hit.Cover, Is.EqualTo("none"), "low cover is no cover from above");
            Assert.That(lo.Hit.Cover, Is.EqualTo("half"));
            Assert.That(hi.Chance - lo.Chance, Is.EqualTo(Tactics.HighGroundAim + 20));
        }

        [Test]
        public void CrouchingBehindLowCoverMakesItFullAndProneIsHardToHitFromAfarButEasyUpClose()
        {
            var g = new GridField(30, 20).Set(10, 10, GridField.Low);
            var def = Arena.Unit("d", 9.5, 10.5, true);
            var att = Arena.Unit("a", 17.5, 10.5, false, "w_pistol9", "a_9mm", skill: 40);
            var b = Start(g, def, att);
            var stand = b.Preview(att, def, ShotOptions.Snap);
            def.C.Stance = Stances.Crouch;
            var crouch = b.Preview(att, def, ShotOptions.Snap);
            Assert.That(crouch.Hit.Cover, Is.EqualTo("full"));
            Assert.That(stand.Chance - crouch.Chance, Is.EqualTo(20));
            // in the open: a crouch is −10 beyond 3 m, prone −20 beyond 4 m
            var open = new GridField(30, 20);
            var d2 = Arena.Unit("d", 9.5, 10.5, true);
            var a2 = Arena.Unit("a", 17.5, 10.5, false, "w_pistol9", "a_9mm", skill: 40);
            var b2 = Start(open, d2, a2);
            var s0 = b2.Preview(a2, d2, ShotOptions.Snap).Chance;
            d2.C.Stance = Stances.Crouch;
            Assert.That(s0 - b2.Preview(a2, d2, ShotOptions.Snap).Chance, Is.EqualTo(10));
            d2.C.Stance = Stances.Prone;
            Assert.That(s0 - b2.Preview(a2, d2, ShotOptions.Snap).Chance, Is.EqualTo(20));
            // a blade against the prone is +20; a shooter lying flat is braced (+10)
            var blade = Arena.Unit("m", 10.5, 10.5, false, "w_machete", skill: 30);
            b2.Units.Add(blade);
            Assert.That(b2.Preview(blade, d2, ShotOptions.Snap).Hit.Of("target_stance"), Is.EqualTo(20));
            d2.C.Stance = Stances.Stand; a2.C.Stance = Stances.Prone;
            Assert.That(b2.Preview(a2, d2, ShotOptions.Snap).Hit.Of("stance"), Is.EqualTo(10));
        }

        [Test]
        public void StancesCostTheirAPAndSlowTheWalk()
        {
            var g = new GridField(30, 20);
            var u = Arena.Unit("u", 5.5, 5.5, false, "w_pistol9", "a_9mm", player: true);
            var b = Start(g, u, Arena.Unit("e", 25.5, 15.5, true));
            u.C.Ap = 8;
            var walk = b.MoveCost(u, 11.5, 5.5);
            Assert.That(walk, Is.EqualTo(4));
            Assert.That(b.SetStance(u, Stances.Crouch), Is.True);
            Assert.That(u.C.Ap, Is.EqualTo(8), "the turn's free minor action");
            Assert.That(b.MoveCost(u, 11.5, 5.5), Is.EqualTo(6), "a crouch is a third slower");
            Assert.That(b.SetStance(u, Stances.Prone), Is.True);
            Assert.That(u.C.Ap, Is.EqualTo(7), "a second change costs 1 AP");
            Assert.That(b.MoveCost(u, 11.5, 5.5), Is.EqualTo(8), "a crawl is half the pace");
            Assert.That(b.Reach(u), Is.EqualTo(7 * Battle.MetresPerAp / 2).Within(1e-9));
            Assert.That(b.SetStance(u, Stances.Stand), Is.True);
            Assert.That(u.C.Ap, Is.EqualTo(6), "up off the ground is 1 AP");
            Assert.That(b.SetStance(u, Stances.Stand), Is.False, "already standing");
            // moving prone spends the crawl's AP
            b.SetStance(u, Stances.Prone);
            var ap = u.C.Ap;
            b.Moved(u, 8.5, 5.5, 3);
            Assert.That(ap - u.C.Ap, Is.EqualTo(4));
        }

        [Test]
        public void ThePreviewItemisesTheChanceAndGivesDamageCritAndAp()
        {
            var g = new GridField(40, 20).Set(20, 10, GridField.Low);
            var def = Arena.Unit("d", 19.5, 10.5, true, armour: "r_riot");
            var att = Arena.Unit("a", 34.5, 10.5, false, "w_carbine556", "a_556", skill: 30);
            var b = Start(g, def, att);
            def.C.Evasion = 6;
            var p = b.Preview(att, def, new ShotOptions { Aimed = "head" });
            Assert.That(p.Ok, Is.True, p.Reason);
            Assert.That(p.Hit.Reasons.Sum(r => r.Value), Is.EqualTo(p.Hit.Raw).Within(p.Hit.Reasons.Count * 0.5 + 0.01), "the reasons add up");
            foreach (var key in new[] { "skill", "cover", "reflex", "evasion", "aimed" }) Assert.That(p.Hit.Has(key), Is.True, key);
            Assert.That(p.Hit.Of("aimed"), Is.EqualTo(-CombatRules.AimPenalty["head"]));
            Assert.That(p.Hit.Of("evasion"), Is.EqualTo(-6));
            Assert.That(p.Ap, Is.EqualTo(b.AttackAp(att, def, "head")));
            Assert.That(p.Ap, Is.EqualTo(CombatRules.AttackAp(att.C, aimed: true) - 1), "Steady Hands (Firearms 50): an aimed rifle shot costs no extra AP");
            Assert.That(p.DamageMin, Is.LessThanOrEqualTo(p.DamageMax));
            Assert.That(p.CritMax, Is.GreaterThan(p.DamageMax));
            Assert.That(p.Crit, Is.GreaterThan(b.Preview(att, def, ShotOptions.Snap).Crit), "an aimed head shot crits more");
            Assert.That(p.Chance, Is.EqualTo(CombatRules.HitChance(att.C, def.C, b.OptsFor(att, def, "head"))), "the preview is the roll's own chance");
            // the kill chance grows as the target weakens; a burst fires its rounds
            var full = b.Preview(att, def, ShotOptions.Snap).KillChance;
            def.C.Sheet.Hp = 3;
            Assert.That(b.Preview(att, def, ShotOptions.Snap).KillChance, Is.GreaterThan(full));
            Assert.That(b.Preview(att, def, new ShotOptions { Burst = true }).Rounds, Is.EqualTo(3));
            // and from another standing point (the walk's end)
            var fromSide = b.Preview(att, def, new ShotOptions { FromX = 19.5, FromZ = 18.5 });
            Assert.That(fromSide.Hit.Flanked, Is.True);
        }

        [Test]
        public void SomeoneInTheLineOfFireIsShownAndCosts()
        {
            var g = new GridField(40, 20);
            var def = Arena.Unit("d", 30.5, 10.5, true);
            var att = Arena.Unit("a", 10.5, 10.5, false, "w_pistol9", "a_9mm", skill: 40);
            var ally = Arena.Unit("x", 20.5, 10.6, false);
            var b = Start(g, def, att, ally);
            var p = b.Preview(att, def, ShotOptions.Snap);
            Assert.That(p.InTheWay, Is.SameAs(ally));
            Assert.That(p.Hit.Of("obstructed"), Is.EqualTo(-Tactics.ObstructedPenalty));
            ally.Place(20.5, 13.5);
            Assert.That(b.Preview(att, def, ShotOptions.Snap).InTheWay, Is.Null);
        }

        [Test]
        public void TheReachableAreaHasAMoveAndActBandAndADash()
        {
            var g = new GridField(40, 30).Set(12, 10, GridField.Low);
            var u = Arena.Unit("u", 10.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var e = Arena.Unit("e", 30.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, u, e);
            u.C.Ap = 8;
            var m = b.Reachable(u, 1.0, withCover: true);
            Assert.That(m.DashAp, Is.EqualTo(8));
            Assert.That(m.ActAp, Is.EqualTo(8 - CombatRules.AttackAp(u.C)));
            Assert.That(m.ActMetres, Is.EqualTo(m.ActAp * Battle.MetresPerAp).Within(1e-9));
            Assert.That(m.Points.All(p => p.Ap <= 8), Is.True);
            Assert.That(m.Points.Where(p => p.Act).All(p => p.Ap <= m.ActAp), Is.True);
            Assert.That(m.Points.Any(p => !p.Act), Is.True, "a dash band");
            var behind = m.Points.FirstOrDefault(p => System.Math.Abs(p.X - 11.5) < 0.01 && System.Math.Abs(p.Z - 10.5) < 0.01);
            Assert.That(behind, Is.Not.Null);
            Assert.That(behind.Cover, Is.EqualTo("half"));
            Assert.That(behind.Exposed, Is.False);
        }

        [Test]
        public void AWalksPreviewShowsTheShotsItDrawsAndWhomItFlanks()
        {
            var g = new GridField(40, 30).Set(21, 15, GridField.Low);
            var u = Arena.Unit("u", 5.5, 5.5, false, "w_pistol9", "a_9mm", player: true);
            var watcher = Arena.Unit("w", 25.5, 5.5, true, "w_pistol9", "a_9mm");
            var hiding = Arena.Unit("h", 20.5, 15.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, u, watcher, hiding);
            watcher.C.Ap = 8; b.Overwatch(watcher);
            u.C.Ap = 10;
            var plan = b.PlanMove(u, 14.5, 12.5);
            Assert.That(plan.Ok, Is.True, plan.Reason);
            Assert.That(plan.Reactions.Select(r => r.Watcher), Does.Contain(watcher));
            Assert.That(plan.Reactions[0].Chance, Is.InRange(5, 95));
            // from (20.5, 22.5) the hiding one's wall faces the wrong way
            var flank = b.PlanMove(u, 20.5, 22.5);
            Assert.That(flank.Flanks, Does.Contain(hiding));
        }

        [Test]
        public void TheOldTupleIsTheNewPreview()
        {
            var g = new GridField(30, 20);
            var def = Arena.Unit("d", 20.5, 10.5, true);
            var att = Arena.Unit("a", 10.5, 10.5, false, "w_pistol9", "a_9mm");
            var b = Start(g, def, att);
            var t = b.Preview(att, def);
            var p = b.Preview(att, def, ShotOptions.Snap);
            Assert.That((t.Ok, t.Reason, t.Chance, t.Ap), Is.EqualTo((p.Ok, p.Reason, p.Chance, p.Ap)));
        }
    }
}
