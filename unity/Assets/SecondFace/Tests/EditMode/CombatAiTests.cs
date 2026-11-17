using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    /// <summary>COMBAT.md D1–D5 decision by decision: cover, flanks, focus fire, throws, holds, healing, the hard rules,
    /// the archetypes and their mapping from the content, the difficulty's noise, the intent the UI shows, purity.</summary>
    public class CombatAiTests
    {
        [SetUp] public void Load() { ContentFixture.Db(); Arena.Kit(); }
        [TearDown] public void Clean() => Arena.Forget("w_smoke_t", "w_flash_t");

        private static Battle Start(GridField g, uint seed, params BattleUnit[] us)
        {
            var b = new Battle(g, new Rng(seed));
            b.Start(us);
            foreach (var u in us) u.C.Ap = CombatRules.MaxAp(u.C);
            return b;
        }

        [Test]
        public void ItTakesCoverRatherThanStandInTheOpen()
        {
            // a low wall a step away facing the enemy; the enemy too far to shoot this turn
            var g = new GridField(40, 20).Rect(12, 8, 12, 12, GridField.Low);
            var u = Arena.Unit("u", 9.5, 10.5, true, "w_pistol9", "a_9mm", archetype: Archetypes.Guard);
            var e = Arena.Unit("e", 34.5, 10.5, false, "w_carbine556", "a_556", player: true, skill: 60);
            var b = Start(g, 1, u, e);
            b.RunAiTurn(u);
            Assert.That(b.CoverVsAll(u, u.PX, u.PZ).Exposed, Is.False, $"ended at ({u.PX},{u.PZ})");
        }

        [Test]
        public void ItFlanksAnEnemyInCoverWhenItCan()
        {
            // the enemy behind a long low wall facing west; the AI can walk round its end
            var g = new GridField(40, 30).Rect(20, 8, 20, 18, GridField.Low);
            var e = Arena.Unit("e", 21.5, 13.5, false, "w_pistol9", "a_9mm", player: true);
            var u = Arena.Unit("u", 14.5, 21.5, true, "w_pump", "a_12ga", skill: 40, archetype: Archetypes.Raider);
            var b = Start(g, 2, e, u);
            Assert.That(b.CoverAt(u, u.PX, u.PZ, e, e.PX, e.PZ).Level, Is.EqualTo("half"), "from where it starts the wall covers");
            b.RunAiTurn(u);
            var shots = b.History.Where(h => h.Attacker == u && h.Kind == "attack").ToList();
            Assert.That(shots.Count, Is.GreaterThan(0), "it got its shot");
            Assert.That(b.CoverAt(u, u.PX, u.PZ, e, e.PX, e.PZ).Level, Is.EqualTo("none"), "from where the wall does not cover");
        }

        [Test]
        public void ItFocusesOnTheWounded()
        {
            var g = new GridField(40, 20);
            var u = Arena.Unit("u", 10.5, 10.5, true, "w_pistol9", "a_9mm", skill: 40, archetype: Archetypes.Raider);
            var a = Arena.Unit("a", 18.5, 8.5, false, "w_pistol9", "a_9mm", player: true);
            var w = Arena.Unit("w", 18.5, 12.5, false, "w_pistol9", "a_9mm");
            w.C.Sheet.Hp = 6;
            var b = Start(g, 3, u, a, w);
            var s = b.Choose(u);
            Assert.That(s.Kind, Is.EqualTo("attack").Or.EqualTo("burst"));
            Assert.That(s.Target, Is.SameAs(w));
            Assert.That(u.Intent, Is.SameAs(w), "the intent is shown");
        }

        [Test]
        public void ItNeverShootsThroughItsOwn()
        {
            var g = new GridField(40, 20);
            var u = Arena.Unit("u", 5.5, 10.5, true, "w_pistol9", "a_9mm", skill: 60, archetype: Archetypes.Raider);
            var friend = Arena.Unit("f", 10.5, 10.5, true, "w_machete", archetype: Archetypes.Raider);
            var e = Arena.Unit("e", 16.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var b = Start(g, 4, u, friend, e);
            for (var i = 0; i < 4; i++)
            {
                var s = b.Choose(u);
                if (s.Kind == "attack" || s.Kind == "burst") Assert.That(b.InTheWay(u, u.PX, u.PZ, e, e.PX, e.PZ), Is.Not.SameAs(friend));
                if (s.Kind == "move") b.WalkTo(u, s.X, s.Z); else break;
            }
        }

        [Test]
        public void ItThrowsIntoAGroupButNeverOntoItsOwn()
        {
            var g = new GridField(40, 20).Rect(24, 6, 24, 14, GridField.Wall);
            var u = Arena.Unit("u", 12.5, 10.5, true, "w_pistol9", "a_9mm", skill: 60, archetype: Archetypes.Raider, pack: ("w_frag", 1));
            var e1 = Arena.Unit("e1", 22.5, 9.5, false, "w_pistol9", "a_9mm", player: true);
            var e2 = Arena.Unit("e2", 22.5, 11.5, false, "w_pistol9", "a_9mm");
            var b = Start(g, 5, u, e1, e2);
            var s = b.Choose(u);
            Assert.That(s.Kind, Is.EqualTo("throw"), string.Join("\n", b.Ai.LastOptions));
            // the same, with one of its own beside them
            var mate = Arena.Unit("m", 21.5, 10.5, true, "w_machete", archetype: Archetypes.Raider);
            var u2 = Arena.Unit("u", 12.5, 10.5, true, "w_pistol9", "a_9mm", skill: 60, archetype: Archetypes.Raider, pack: ("w_frag", 1));
            var b2 = Start(g, 5, u2, mate, Arena.Unit("e1", 22.5, 9.5, false, "w_pistol9", "a_9mm", player: true), Arena.Unit("e2", 22.5, 11.5, false, "w_pistol9", "a_9mm"));
            Assert.That(b2.Choose(u2).Kind, Is.Not.EqualTo("throw"));
        }

        [Test]
        public void ItNeverWalksIntoFire()
        {
            var g = new GridField(40, 20);
            var u = Arena.Unit("u", 5.5, 10.5, true, "w_machete", skill: 40, archetype: Archetypes.Raider);
            var e = Arena.Unit("e", 20.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var b = Start(g, 6, u, e);
            for (var z = 0; z < 20; z++) { b.Surfaces.Ignite(12.5, z + 0.5, 0.4); b.Surfaces.Peek(12.5, z + 0.5).Fire = 9; }
            for (var t = 0; t < 3; t++)
            {
                u.C.Ap = 8;
                foreach (var s in b.RunAiTurn(u)) Assert.That(s.Kind, Is.Not.EqualTo("flee"));
                Assert.That(Status.Has(u.C, Status.Burning), Is.False, $"walked into the fire at ({u.PX},{u.PZ})");
                Assert.That(u.PX, Is.LessThan(12), "and stays on its side of it");
            }
        }

        [Test]
        public void ItHoldsOverwatchWhenNothingIsInSightButSomeoneIsComing()
        {
            var g = new GridField(40, 20).Rect(20, 0, 20, 19, GridField.Wall).Set(20, 10, GridField.Open);
            var u = Arena.Unit("u", 8.5, 10.5, true, "w_carbine556", "a_556", archetype: Archetypes.Warden);
            g.Set(9, 10, GridField.Low).Set(9, 9, GridField.Low).Set(9, 11, GridField.Low);
            var e = Arena.Unit("e", 26.5, 4.5, false, "w_pistol9", "a_9mm", player: true);
            var b = Start(g, 7, u, e);
            var steps = b.RunAiTurn(u);
            Assert.That(steps.Select(s => s.Kind), Does.Contain("overwatch").Or.Contain("cover"), string.Join(" | ", steps));
            Assert.That(u.Watch, Is.Not.Null);
        }

        [Test]
        public void ItPatchesUpAWoundedFriendBesideIt()
        {
            var g = new GridField(40, 20).Rect(12, 6, 12, 14, GridField.Wall);
            var u = Arena.Unit("u", 10.5, 10.5, false, "w_pistol9", "a_9mm", pack: ("c_knitkit", 1));
            var hurt = Arena.Unit("h", 10.5, 11.5, false, "w_pistol9", "a_9mm", player: true);
            hurt.C.Sheet.Hp = 4;
            var e = Arena.Unit("e", 30.5, 10.5, true, "w_pistol9", "a_9mm");
            var b = Start(g, 8, u, hurt, e);
            var s = b.Choose(u);
            Assert.That(s.Kind, Is.EqualTo("heal_ally"), string.Join("\n", b.Ai.LastOptions));
            Assert.That(b.Execute(u, s).Done, Is.True);
            Assert.That(hurt.C.Sheet.Hp, Is.GreaterThan(4));
        }

        [Test]
        public void WardensDemandAndArrestRaidersDoNot()
        {
            var g = new GridField(40, 20);
            var w = Arena.Unit("w", 10.5, 10.5, true, "w_carbine556", "a_556", archetype: Archetypes.Warden);
            var foe = Arena.Unit("f", 20.5, 10.5, false, "w_pistol9", "a_9mm");
            var pc = Arena.Unit("p", 35.5, 2.5, false, "w_pistol9", "a_9mm", player: true);
            var b = Start(g, 9, w, foe, pc);
            Assert.That(b.Choose(w).Kind, Is.EqualTo("shout"));
            var m0 = foe.C.Morale;
            b.Execute(w, new AiStep { Kind = "shout" });
            Assert.That(foe.C.Morale, Is.LessThan(m0));
            Assert.That(b.Choose(w).Kind, Is.Not.EqualTo("shout"), "once");
            // a surrendered enemy beside a warden is taken
            b.Surrender(foe); foe.Place(11.5, 10.5);
            w.C.Ap = 8;
            var s = b.Choose(w);
            Assert.That(s.Kind == "capture" || b.Ai.LastOptions.Any(o => o.Kind == "capture"), Is.True, string.Join("\n", b.Ai.LastOptions));
            var r = Arena.Unit("r", 10.5, 12.5, true, "w_carbine556", "a_556", archetype: Archetypes.Raider);
            b.Units.Add(r); r.C.Ap = 8;
            b.Choose(r);
            Assert.That(b.Ai.LastOptions.Any(o => o.Kind == "shout" || o.Kind == "capture"), Is.False);
        }

        [Test]
        public void MachinesNeverBreakAndAnimalsRunWhenHurtAndUseNoTools()
        {
            var g = new GridField(40, 20).Set(15, 10, GridField.Low);
            var m = Arena.Unit("m", 10.5, 10.5, true, "w_smg9", "a_9mm", archetype: Archetypes.Machine);
            m.C.Morale = 0; m.C.Sheet.Hp = 2;
            var a = Arena.Unit("a", 10.5, 14.5, true, archetype: Archetypes.Animal);
            a.C.Natural = Arena.Bite;
            var e = Arena.Unit("e", 30.5, 10.5, false, "w_pistol9", "a_9mm", player: true);
            var b = Start(g, 10, m, a, e);
            var s = b.Choose(m);
            Assert.That(s.Kind, Is.Not.EqualTo("flee").And.Not.EqualTo("surrender"));
            Assert.That(b.Choose(a).Kind, Is.EqualTo("move"), "an animal charges");
            a.C.Sheet.Hp = 3;
            Assert.That(b.Choose(a).Kind, Is.EqualTo("flee"), "and runs when hurt");
            a.C.Sheet.Hp = 30;
            foreach (var o in b.Ai.LastOptions) Assert.That(new[] { "overwatch", "cover", "suppress", "throw", "stance" }, Does.Not.Contain(o.Kind));
        }

        [Test]
        public void ContentPeopleMapToTheirArchetypes()
        {
            string Of(string faction, string team, string role) => Archetypes.OfDef(new SecondFace.Core.Npc.NpcDef { Faction = faction, Team = team, Role = role });
            Assert.That(Of("rust_dogs", "rustdogs", "raider"), Is.EqualTo(Archetypes.Raider));
            Assert.That(Of("wardens", "wardens", "guard"), Is.EqualTo(Archetypes.Warden));
            Assert.That(Of("tollmen", "tollmen", "guard"), Is.EqualTo(Archetypes.Guard));
            Assert.That(Of("choir", "choir", "pilgrim"), Is.EqualTo(Archetypes.Civilian));
            Assert.That(Of(null, "machines", null), Is.EqualTo(Archetypes.Machine));
            Assert.That(Archetypes.OfDef(new SecondFace.Core.Npc.NpcDef { Natural = Arena.Bite }), Is.EqualTo(Archetypes.Animal));
            // every hostile-capable person in the content has one
            var all = Registry.Npcs.Values.Where(n => n.Team != null && n.Team != "neutral").Select(Archetypes.OfDef).ToList();
            Assert.That(all, Is.Not.Empty);
            Assert.That(all.All(a => Archetypes.Profiles.ContainsKey(a)), Is.True);
            Assert.That(Registry.Npcs.Values.Where(n => n.Faction == "wardens" && n.Role == "guard").Select(Archetypes.OfDef).Distinct(), Is.EqualTo(new[] { Archetypes.Warden }));
        }

        [Test]
        public void TheStoryDifficultySettlesForLesserChoicesAndHardNever()
        {
            int Off(string diff)
            {
                var n = 0;
                for (uint seed = 1; seed <= 40; seed++)
                {
                    var g = Arena.Field("cover");
                    var b = Arena.New(g, seed, diff);
                    var us = Arena.Party().Concat(Arena.Squad(Archetypes.Raider)).ToList();
                    b.Start(us);
                    foreach (var u in us.Where(x => x.Hostile))
                    {
                        u.C.Ap = CombatRules.MaxAp(u.C);
                        var s = b.Choose(u);
                        if (b.Ai.LastOptions.Count > 1 && s.Score < b.Ai.LastOptions[0].Score - 1e-9 && s.Why != "to cover") n++;
                    }
                }
                return n;
            }
            Assert.That(Off("story"), Is.GreaterThan(0));
            Assert.That(Off("hard"), Is.Zero);
        }

        [Test]
        public void ADecisionIsPureAndTheIntentIsTrue()
        {
            var g = Arena.Field("cover");
            var b = Arena.New(g, 12);
            var us = Arena.Party().Concat(Arena.Squad(Archetypes.Warden)).ToList();
            b.Start(us);
            var u = us.First(x => x.Hostile);
            u.C.Ap = CombatRules.MaxAp(u.C);
            var rng = b.Rng.State; var pos = (u.PX, u.PZ); var ap = u.C.Ap;
            var a1 = b.Choose(u).ToString(); var a2 = b.Choose(u).ToString();
            Assert.That(a2, Is.EqualTo(a1), "the same state, the same choice");
            Assert.That(b.Rng.State, Is.EqualTo(rng), "the AI never rolls the dice");
            var intent = b.PredictIntent(u);
            Assert.That((u.PX, u.PZ, u.C.Ap, b.Rng.State), Is.EqualTo((pos.PX, pos.PZ, ap, rng)), "foreseeing changes nothing");
            Assert.That(intent.Kind, Is.Not.Null);
        }
    }
}
