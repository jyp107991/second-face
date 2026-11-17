using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Inventory;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>COMBAT.md C4 (throwables, areas, friendly fire) and C5 (surfaces, props).</summary>
    public class CombatAreaTests
    {
        [SetUp] public void Load() { ContentFixture.Db(); Arena.Kit(); Arena.Ensure("w_chem_t", "chem", 2); }
        [TearDown] public void Clean() => Arena.Forget("w_smoke_t", "w_flash_t", "w_chem_t");

        private static Battle Start(GridField g, uint seed, params BattleUnit[] us)
        {
            var b = new Battle(g, new Rng(seed));
            b.Start(us);
            foreach (var u in us) u.C.Ap = 10;
            return b;
        }

        [Test]
        public void AGrenadeHurtsEveryoneInItsRadiusFriendsIncluded()
        {
            var g = new GridField(40, 30);
            var t = Arena.Unit("t", 5.5, 15.5, false, "w_pistol9", "a_9mm", skill: 200, pack: ("w_frag", 2));
            var foe = Arena.Unit("f", 15.5, 15.5, true);
            var friend = Arena.Unit("x", 17.0, 15.5, false);
            var far = Arena.Unit("z", 25.5, 15.5, true);
            foreach (var u in new[] { foe, friend, far }) u.C.Sheet.Hp = 200;
            var b = Start(g, 1, t, foe, friend, far);
            var plan = b.PlanThrow(t, "w_frag", 15.5, 15.5);
            Assert.That(plan.Ok, Is.True, plan.Reason);
            Assert.That(plan.Kind, Is.EqualTo("blast"));
            Assert.That(plan.Radius, Is.EqualTo(3.0).Within(1e-9));
            Assert.That(plan.Caught.Single(c => c.Unit == friend).Ally, Is.True, "the footprint flags the friend");
            Assert.That(plan.Caught.Any(c => c.Unit == far), Is.False);
            var r = b.Throw(t, "w_frag", 15.5, 15.5);
            Assert.That(r, Is.Not.Null);
            Assert.That(Tactics.Dist(r.X, r.Z, 15.5, 15.5), Is.LessThanOrEqualTo(r.Scatter + 1e-9));
            Assert.That(foe.C.Sheet.Hp, Is.LessThan(200));
            Assert.That(friend.C.Sheet.Hp, Is.LessThan(200), "friendly fire is real");
            Assert.That(far.C.Sheet.Hp, Is.EqualTo(200));
            Assert.That(Inv.CountItem(t.C.Inv, "w_frag"), Is.EqualTo(1), "used up");
            Assert.That(t.C.Ap, Is.EqualTo(10 - Items.Def("w_frag").Weapon.Ap));
            Assert.That(b.Throw(t, "w_frag", 35.5, 15.5), Is.Null, "too far to throw");
        }

        [Test]
        public void ProneAndFullCoverHalveABlastAndSkillTightensTheThrow()
        {
            int Damage(string stance, bool wall)
            {
                var g = new GridField(40, 30);
                if (wall) g.Set(14, 15, GridField.Wall);
                var t = Arena.Unit("t", 15.5, 5.5, false, skill: 200, pack: ("w_frag", 1));
                var f = Arena.Unit("f", 13.5, 15.5, true);
                f.C.Sheet.Hp = 500; f.C.Stance = stance;
                var b = Start(g, 7, t, f);
                b.Throw(t, "w_frag", 15.5, 15.5);
                return 500 - f.C.Sheet.Hp;
            }
            var standing = Damage(Stances.Stand, false);
            Assert.That(Damage(Stances.Prone, false), Is.LessThan(standing));
            Assert.That(Damage(Stances.Stand, true), Is.LessThan(standing), "full cover facing the blast");
            // scatter falls with the Explosives skill
            var c0 = Arena.Unit("c0", 0, 0, false, skill: 0); var c1 = Arena.Unit("c1", 0, 0, false, skill: 80);
            var w = Items.Def("w_frag").Weapon;
            Assert.That(Battle.ThrowScatter(c1.C, w, 10), Is.LessThan(Battle.ThrowScatter(c0.C, w, 10)));
        }

        [Test]
        public void AFireBottleSetsTheGroundAlightAndThoseInItBurning()
        {
            var g = new GridField(40, 30).Ground(20, 14, 22, 16, "scrub").Ground(16, 10, 18, 20, "water");
            var t = Arena.Unit("t", 5.5, 15.5, false, skill: 200, pack: ("w_molotov", 1));
            var f = Arena.Unit("f", 14.5, 15.5, true);
            f.C.Sheet.Hp = 200;
            var b = Start(g, 2, t, f);
            b.Surfaces.Spill("oil", 14.5, 15.5, 1.0);
            b.Surfaces.Spill("oil", 15.5, 15.5, 0.6);
            var r = b.Throw(t, "w_molotov", 14.5, 15.5);
            Assert.That(r.Kind, Is.EqualTo("fire"));
            Assert.That(b.Surfaces.Peek(14.5, 15.5).Fire, Is.GreaterThan(0));
            Assert.That(Status.Has(f.C, Status.Burning), Is.True);
            Assert.That(f.C.Sheet.Hp, Is.LessThan(200));
            // it burns at their turn's start; water puts it out
            var hp = f.C.Sheet.Hp;
            var (dmg, _, _) = Status.TurnStart(b.Rng, f.C);
            Assert.That(dmg, Is.GreaterThan(0)); Assert.That(f.C.Sheet.Hp, Is.EqualTo(hp - dmg));
            f.C.Ap = 10;
            b.Moved(f, 17.5, 15.5, 3);
            Assert.That(Status.Has(f.C, Status.Burning), Is.False, "water douses");
            // fire spreads on oil, never onto water, burns oil away to ash
            for (var i = 0; i < 6; i++) b.Surfaces.Tick(b.Rng);
            Assert.That(b.Surfaces.Peek(17.5, 15.5)?.Fire ?? 0, Is.Zero, "never on water");
            Assert.That(b.Surfaces.Peek(14.5, 15.5).Ground, Is.EqualTo("ash"), "the oil burnt away");
            Assert.That(b.Surfaces.All().All(c => c.C.Fire == 0), Is.True, "and it burns out");
        }

        [Test]
        public void FireRunsAlongOilAndThroughScrub()
        {
            var g = new GridField(40, 10).Ground(10, 0, 30, 9, "scrub");
            var b = Start(g, 3, Arena.Unit("a", 1.5, 1.5, false, player: true), Arena.Unit("b", 38.5, 8.5, true));
            b.Surfaces.Spill("oil", 5.5, 5.5, 0.5); b.Surfaces.Spill("oil", 6.5, 5.5, 0.5); b.Surfaces.Spill("oil", 7.5, 5.5, 0.5);
            b.Surfaces.Ignite(5.5, 5.5, 0.4);
            for (var i = 0; i < 6; i++) b.Surfaces.Tick(b.Rng);
            Assert.That(b.Surfaces.Peek(7.5, 5.5).Fire > 0 || b.Surfaces.Peek(7.5, 5.5).Ground == "ash", Is.True, "along the oil");
            b.Surfaces.Ignite(12.5, 5.5, 0.4);
            for (var i = 0; i < 12; i++) b.Surfaces.Tick(b.Rng);
            var burnt = b.Surfaces.All().Count(c => c.C.Ground == "ash");
            Assert.That(burnt, Is.GreaterThan(10), "a scrub fire spreads");
            Assert.That(b.Surfaces.Peek(3.5, 5.5)?.Fire ?? 0, Is.Zero, "bare ground does not carry it");
        }

        [Test]
        public void OilCostsTwiceToWalkThrough()
        {
            var g = new GridField(40, 10);
            var u = Arena.Unit("u", 2.5, 5.5, false, player: true);
            var b = Start(g, 4, u, Arena.Unit("e", 38.5, 8.5, true));
            var dry = b.MoveCost(u, 8.5, 5.5);
            b.Surfaces.Spill("oil", 5.5, 5.5, 1.2);
            Assert.That(b.MoveCost(u, 8.5, 5.5), Is.GreaterThan(dry));
        }

        [Test]
        public void SmokeBlocksSightAndThins()
        {
            var g = new GridField(40, 20);
            var a = Arena.Unit("a", 5.5, 10.5, false, "w_pistol9", "a_9mm", skill: 200, pack: ("w_smoke_t", 1));
            var e = Arena.Unit("e", 20.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, 5, a, e);
            Assert.That(b.Sees(a, e), Is.True);
            var r = b.Throw(a, "w_smoke_t", 12.5, 10.5);
            Assert.That(r.Kind, Is.EqualTo("smoke"));
            Assert.That(b.Sees(a, e), Is.False, "smoke between");
            Assert.That(b.Preview(a, e, ShotOptions.Snap).Reason, Is.EqualTo("No line of sight"));
            for (var i = 0; i < SurfaceGrid.SmokeRounds; i++) b.Surfaces.Tick(b.Rng);
            Assert.That(b.Sees(a, e), Is.True, "thinned away");
        }

        [Test]
        public void AFlashBlindsThoseWhoSeeItAndBreaksTheirOverwatch()
        {
            var g = new GridField(40, 20).Rect(24, 0, 24, 19, GridField.Wall);
            var a = Arena.Unit("a", 5.5, 10.5, false, skill: 200, pack: ("w_flash_t", 1));
            var e = Arena.Unit("e", 15.5, 10.5, true, "w_pistol9", "a_9mm");
            var hid = Arena.Unit("h", 25.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, 6, a, e, hid);
            b.Overwatch(e);
            Assert.That(e.Watch, Is.Not.Null);
            b.Throw(a, "w_flash_t", 16.5, 10.5);
            Assert.That(Status.Has(e.C, Status.Blinded), Is.True);
            Assert.That(e.Watch, Is.Null, "blinded: the held shot is gone");
            Assert.That(Status.Has(hid.C, Status.Blinded), Is.False, "behind the wall");
            e.C.Ap = 10;
            Assert.That(b.Preview(e, a, ShotOptions.Snap).Hit.Of("status"), Is.EqualTo(-40));
        }

        [Test]
        public void WaterCarriesAShockAndAChemCloudChokesAndBursts()
        {
            var g = new GridField(40, 20).Ground(10, 5, 20, 15, "water");
            var a = Arena.Unit("a", 2.5, 10.5, false, "w_arc_pistol", "a_cell", skill: 200);
            a.C.Sheet.SkillBought["arc"] = 100;
            var e1 = Arena.Unit("e1", 12.5, 10.5, true); var e2 = Arena.Unit("e2", 18.5, 12.5, true); var dry = Arena.Unit("e3", 25.5, 10.5, true);
            foreach (var u in new[] { e1, e2, dry }) u.C.Sheet.Hp = 300;
            var b = Start(g, 8, a, e1, e2, dry);
            BattleHit hit = null;
            for (var i = 0; i < 6 && (hit == null || !hit.Result.Hits.Any(h => h.Hit)); i++) { a.C.Ap = 10; hit = b.Attack(a, e1); }
            Assert.That(hit.Result.Hits.Any(h => h.Hit), Is.True);
            Assert.That(e2.C.Sheet.Hp, Is.LessThan(300), "the current ran through the water to the other");
            Assert.That(dry.C.Sheet.Hp, Is.EqualTo(300));
            // a chem cloud chokes those in it at their turn's start, and fire sets it off
            var c = Arena.Unit("c", 6.5, 8.5, false, skill: 200, pack: ("w_chem_t", 1));
            var g2 = new GridField(40, 20);
            var v = Arena.Unit("v", 15.5, 10.5, true); v.C.Sheet.Hp = 300;
            var b2 = Start(g2, 9, c, v);
            b2.Throw(c, "w_chem_t", 15.5, 10.5);
            Assert.That(b2.Surfaces.Peek(15.5, 10.5).Cloud, Is.EqualTo("chem"));
            Assert.That(Status.Has(v.C, Status.Choking), Is.True);
            Assert.That(Status.ApChange(v.C), Is.EqualTo(1), "choking takes an AP");
            b2.Surfaces.Ignite(15.5, 10.5, 0.4);
            Assert.That(b2.Surfaces.Bursts.Count, Is.GreaterThan(0), "fire bursts the cloud");
        }

        [Test]
        public void ADrumGoesUpWhenShotAndSetsOffTheNext()
        {
            var g = new GridField(40, 20);
            var a = Arena.Unit("a", 2.5, 10.5, false, "w_bolt308", "a_308", skill: 200, player: true);
            var e = Arena.Unit("e", 20.5, 11.5, true); e.C.Sheet.Hp = 300;
            var b = Start(g, 10, a, e);
            var fuel = new BattleProp { Id = "f", Kind = "fuel", X = 20.5, Z = 10.5 };
            var chem = new BattleProp { Id = "c", Kind = "chem", X = 22.5, Z = 10.5 };
            b.Props.Add(fuel); b.Props.Add(chem);
            for (var i = 0; i < 6 && !fuel.Destroyed; i++) { a.C.Ap = 10; b.AttackProp(a, fuel); }
            Assert.That(fuel.Destroyed, Is.True);
            Assert.That(chem.Destroyed, Is.True, "the blast set off the next");
            Assert.That(e.C.Sheet.Hp, Is.LessThan(300));
            Assert.That(b.Surfaces.Peek(20.5, 10.5).Fire, Is.GreaterThan(0), "burning fuel on the ground");
            Assert.That(b.ThreatsAt(a, 20.5, 12.5).Surface?.Hazard ?? false, Is.True, "the UI sees the hazard");
        }

        [Test]
        public void TheGroundTicksTheSameForTheSameSeed()
        {
            string Run()
            {
                var g = new GridField(30, 30).Ground(5, 5, 25, 25, "scrub");
                var b = Start(g, 42, Arena.Unit("a", 1.5, 1.5, false, player: true), Arena.Unit("b", 28.5, 28.5, true));
                b.Surfaces.Ignite(15.5, 15.5, 1.5);
                for (var i = 0; i < 5; i++) b.Surfaces.Tick(b.Rng);
                return string.Join(";", b.Surfaces.Save().Select(s => $"{s.X},{s.Z},{s.Ground},{s.Fire}"));
            }
            Assert.That(Run(), Is.EqualTo(Run()));
        }
    }
}
