using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>COMBAT.md C6 (statuses by turns), C9 (flight to an exit, prisoners), perks that keep one up, and the fight's
    /// saved state.</summary>
    public class CombatStatusTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static Battle Start(GridField g, uint seed, params BattleUnit[] us)
        {
            var b = new Battle(g, new Rng(seed));
            b.Start(us);
            foreach (var u in us) u.C.Ap = 10;
            return b;
        }

        [Test]
        public void ABladesCritBleedsUntilBound()
        {
            var g = new GridField(20, 20);
            var a = Arena.Unit("a", 5.5, 5.5, true, "w_machete", skill: 200);
            var d = Arena.Unit("d", 6.5, 5.5, false, player: true, pack: ("c_knitkit", 1));
            d.C.Sheet.Hp = 300;
            var b = Start(g, 1, a, d);
            var res = CombatRules.ResolveAttack(b.Rng, a.C, d.C, new AttackOpts { SureCrit = true, Distance = 1 });
            Assert.That(res.Hits.Any(h => h.Hit && h.Bleeding), Is.True);
            var s = Status.Get(d.C, Status.Bleeding);
            Assert.That(s.Turns, Is.EqualTo(3));
            var hp = d.C.Sheet.Hp;
            var (dmg, from, _) = Status.TurnStart(b.Rng, d.C);
            Assert.That(dmg, Is.EqualTo(s.Power)); Assert.That(from, Is.EqualTo("a"));
            Assert.That(d.C.Sheet.Hp, Is.EqualTo(hp - dmg));
            Assert.That(b.UseItem(d, "c_knitkit", 0), Is.True);
            Assert.That(Status.Has(d.C, Status.Bleeding), Is.False, "a heal binds the wound");
        }

        [Test]
        public void StatusesLastTheirTurnsAndOnesPutOnInYourOwnTurnStillCount()
        {
            var c = Arena.Unit("c", 0, 0, false).C;
            Status.Add(c, Status.Blinded, 1);
            Status.TurnEnd(c);
            Assert.That(Status.Has(c, Status.Blinded), Is.False, "a turn's status: gone at the end of the bearer's next turn");
            c.InTurn = true;
            Status.Add(c, Status.Blinded, 1);
            Status.TurnEnd(c);
            Assert.That(Status.Has(c, Status.Blinded), Is.True, "put on in its own turn: not counted down at that turn's end");
            Status.TurnEnd(c);
            Assert.That(Status.Has(c, Status.Blinded), Is.False);
            Status.Add(c, Status.Burning, 3);
            Status.Add(c, Status.Burning, 1);
            Assert.That(Status.Get(c, Status.Burning).Turns, Is.EqualTo(3), "a refresh keeps the longer");
            Assert.That(Status.View(c).Select(v => v.Id), Does.Contain(Status.Burning));
        }

        [Test]
        public void ARollOnTheGroundPutsOutTheFlames()
        {
            var g = new GridField(20, 20);
            var u = Arena.Unit("u", 5.5, 5.5, false, player: true);
            var b = Start(g, 2, u, Arena.Unit("e", 15.5, 15.5, true));
            Status.Add(u.C, Status.Burning, 3);
            Assert.That(b.SetStance(u, Stances.Prone), Is.True);
            Assert.That(Status.Has(u.C, Status.Burning), Is.False);
        }

        [Test]
        public void ACalledShotToTheLegsCripplesAndSlows()
        {
            var g = new GridField(20, 20);
            var a = Arena.Unit("a", 5.5, 5.5, true, "w_bolt308", "a_308", skill: 200);
            var d = Arena.Unit("d", 12.5, 5.5, false, player: true);
            var b = Start(g, 3, a, d);
            var ap = CombatRules.MaxAp(d.C);
            for (var i = 0; i < 20 && !d.C.Sheet.IsCrippled("legL"); i++) { d.C.Sheet.Hp = 300; a.C.Ap = 10; CombatRules.ResolveAttack(b.Rng, a.C, d.C, new AttackOpts { Aimed = "legL", SureCrit = true, Distance = 7 }); SecondFace.Core.Inventory.Inv.Reload(a.C.Inv); }
            Assert.That(d.C.Sheet.IsCrippled("legL"), Is.True);
            Assert.That(CombatRules.MaxAp(d.C), Is.EqualTo(ap - 1));
            Assert.That(b.StatusesOf(d).Select(s => s.Id), Does.Contain("crippled_leg"));
        }

        [Test]
        public void PerksKeepOneUpOnceAFight()
        {
            var g = new GridField(20, 20);
            var a = Arena.Unit("a", 5.5, 5.5, true, "w_sledge", skill: 200);
            a.C.Sheet.BaseAttrs["brawn"] = 9;
            var d = Arena.Unit("d", 6.5, 5.5, false, player: true);
            d.C.Sheet.Perks["second_chance"] = 1; d.C.Sheet.Perks["tough_as_nails"] = 1;
            var b = Start(g, 4, a, d);
            d.C.Sheet.Hp = 2;
            AttackResult r = null;
            for (var i = 0; i < 10 && d.C.Sheet.Hp == 2; i++) r = CombatRules.ResolveAttack(b.Rng, a.C, d.C, new AttackOpts { SureCrit = true, Distance = 1 });
            Assert.That(d.C.Sheet.Hp, Is.EqualTo(1), "Not Today: a killing blow leaves one");
            Assert.That(r.Hits.First(h => h.Hit).Saved, Is.EqualTo("not_today"));
            for (var i = 0; i < 10 && d.C.Sheet.Hp == 1; i++) CombatRules.ResolveAttack(b.Rng, a.C, d.C, new AttackOpts { SureCrit = true, Distance = 1 });
            Assert.That(d.C.Sheet.Hp, Is.Zero, "once a fight");
            // the first cripple shrugged off
            var e = Arena.Unit("e", 6.5, 6.5, false);
            e.C.Sheet.Perks["tough_as_nails"] = 1; e.C.Sheet.Hp = 500;
            HitResult h1 = null;
            for (var i = 0; i < 30 && h1 == null; i++) h1 = CombatRules.ResolveAttack(b.Rng, a.C, e.C, new AttackOpts { Aimed = "armL", SureCrit = true, Distance = 1 }).Hits.FirstOrDefault(h => h.Hit);
            Assert.That(h1.Saved, Is.EqualTo("cripple_shrug"));
            Assert.That(e.C.Sheet.IsCrippled("armL"), Is.False);
        }

        [Test]
        public void TheBrokenRunForAnExitAndAreGoneWhenTheyReachIt()
        {
            var g = new GridField(40, 20).Exit(39.5, 10.5);
            var p = Arena.Unit("p", 2.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var r = Arena.Unit("r", 20.5, 10.5, true, "w_pistol9", "a_9mm", archetype: Archetypes.Raider);
            var b = new Battle(g, new Rng(5));
            b.Start(new[] { p, r });
            r.C.Morale = 5; r.C.Sheet.Hp = Sheet.Derived(r.C.Sheet).MaxHp;
            var turns = 0;
            for (var u = b.NextTurn(); u != null && turns < 20; u = b.NextTurn(), turns++)
            {
                if (u == r) b.RunAiTurn(r);
                b.EndTurn();
                if (r.Fled) break;
            }
            Assert.That(r.Fleeing, Is.True);
            Assert.That(r.Fled, Is.True, "out at the exit");
            Assert.That(Tactics.Dist(r.PX, r.PZ, 39.5, 10.5), Is.LessThanOrEqualTo(2.0));
            Assert.That(b.Outcome, Is.EqualTo("fled"));
        }

        [Test]
        public void TheSurrenderedAreTakenPrisonerOrSlipAwayUnwatched()
        {
            var g = new GridField(40, 20).Rect(20, 0, 20, 19, GridField.Wall);
            var p = Arena.Unit("p", 5.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var s1 = Arena.Unit("s1", 6.5, 10.5, true);
            var s2 = Arena.Unit("s2", 30.5, 10.5, true);
            var still = Arena.Unit("x", 35.5, 15.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, 6, p, s1, s2, still);
            b.Surrender(s1); b.Surrender(s2);
            Assert.That(b.EnemiesOf(p), Has.No.Member(s1));
            Assert.That(b.TakePrisoner(p, s2), Is.False, "too far");
            Assert.That(b.TakePrisoner(p, s1), Is.True);
            Assert.That(p.C.Ap, Is.EqualTo(8));
            // the one nobody watches gets away in a few rounds
            for (var u = b.NextTurn(); u != null && b.Round < 40 && !s2.Escaped; u = b.NextTurn()) b.EndTurn();
            Assert.That(s2.Escaped, Is.True);
            Assert.That(s1.Escaped, Is.False, "a prisoner stays");
            b.Down(still, p);
            Assert.That(b.Outcome, Is.EqualTo("victory"));
            Assert.That(b.Prisoners, Is.EqualTo(new[] { s1 }));
        }

        [Test]
        public void AFightSavesAndPlaysOnTheSame()
        {
            BattleUnit[] Units() => new[]
            {
                Arena.Unit("p", 4.5, 10.5, false, "w_carbine556", "a_556", player: true, pack: ("w_frag", 1)),
                Arena.Unit("c", 4.5, 14.5, false, "w_pump", "a_12ga"),
                Arena.Unit("r1", 30.5, 10.5, true, "w_pistol9", "a_9mm", archetype: Archetypes.Raider),
                Arena.Unit("r2", 30.5, 14.5, true, "w_machete", archetype: Archetypes.Raider),
            };
            var a = Units();
            var g = Arena.Field("yard");
            var b1 = new Battle(g, new Rng(77)); b1.Start(a);
            b1.Props.Add(new BattleProp { Id = "drum", Kind = "fuel", X = 20.5, Z = 10.5 });
            b1.Surfaces.Spill("oil", 14.5, 14.5, 1.5);
            for (var i = 0; i < 5; i++) { var u = b1.NextTurn(); if (u == null) break; b1.RunAiTurn(u); b1.EndTurn(); }
            var u1 = b1.NextTurn();
            Status.Add(u1.C, Status.Bleeding, 2, 2, "r1");
            var json = JsonConvert.SerializeObject(b1.Snapshot());
            var raw = BattleSave.Migrate(JObject.Parse(json));
            var saved = raw.ToObject<BattleSave>();
            Assert.That(saved.Version, Is.EqualTo(BattleSave.CurrentVersion));
            // the same people (the game rebuilds them from its own save: here, deep copies of the sheets and packs)
            var copy = Units();
            foreach (var (x, y) in a.Zip(copy, (x, y) => (x, y)))
            {
                y.C.Sheet = JsonConvert.DeserializeObject<CharacterSheet>(JsonConvert.SerializeObject(x.C.Sheet));
                y.C.Inv = JsonConvert.DeserializeObject<SecondFace.Core.Inventory.Inventory>(JsonConvert.SerializeObject(x.C.Inv));
            }
            var b2 = new Battle(Arena.Field("yard"), new Rng(1));
            b2.Restore(saved, copy);
            Assert.That(b2.Round, Is.EqualTo(b1.Round));
            Assert.That(b2.Current.C.Id, Is.EqualTo(u1.C.Id));
            Assert.That(Status.Get(b2.Current.C, Status.Bleeding).Power, Is.EqualTo(2));
            Assert.That(b2.Surfaces.Save().Count, Is.EqualTo(b1.Surfaces.Save().Count));
            // and both play on the same
            void Play(Battle b) { b.RunAiTurn(b.Current); b.EndTurn(); for (var i = 0; i < 8; i++) { var u = b.NextTurn(); if (u == null) break; b.RunAiTurn(u); b.EndTurn(); } }
            var n1 = b1.Log.Count; var n2 = b2.Log.Count;
            Play(b1); Play(b2);
            Assert.That(b2.Log.Skip(n2), Is.EqualTo(b1.Log.Skip(n1)));
            Assert.That(b2.Units.Select(u => u.C.Sheet.Hp), Is.EqualTo(b1.Units.Select(u => u.C.Sheet.Hp)));
            Assert.That(() => BattleSave.Migrate(JObject.Parse("{\"Version\": 99}")), Throws.Exception);
        }
    }
}
