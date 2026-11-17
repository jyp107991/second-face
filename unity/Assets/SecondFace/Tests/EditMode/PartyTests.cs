using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Npc;
using SecondFace.Core.Save;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class PartyTests
    {
        private static Grid Map() => new Grid(new MapDef
        {
            Id = "t", Name = "t",
            Layout = new List<string> { ".......", "..###..", ".......", "......." },
            Legend = new Dictionary<string, TileDef> { ["."] = new TileDef { Floor = "sand" }, ["#"] = new TileDef { Wall = "concrete" } },
            Spawns = new List<SpawnDef> { new SpawnDef { Id = "s", X = 0, Y = 0 } },
            Ambience = new AmbienceDef(),
        });

        [Test]
        public void FindsAFreeTileBesideAnOccupiedOne()
        {
            var g = Map();
            g.Occupied[g.Index(3, 2)] = "player";
            Assert.That(Party.FreeTileNear(g, 3, 2, "player"), Is.EqualTo(new Cell(3, 2))); // ignore = the occupant: the tile itself is fine for them
            var u = Party.FreeTileNear(g, 3, 2).Value;
            Assert.That(System.Math.Max(System.Math.Abs(u.X - 3), System.Math.Abs(u.Y - 2)), Is.EqualTo(1));
            Assert.That(g.Passable(u.X, u.Y), Is.True);
        }

        [Test]
        public void FollowsOnlyWhenFarEnoughTrailingBehindTheLeader()
        {
            Assert.That(Party.ShouldFollow(2, false), Is.False);
            Assert.That(Party.ShouldFollow(3, false), Is.True);
            Assert.That(Party.ShouldFollow(3, true), Is.False);
            var g = Map();
            g.Occupied[g.Index(0, 3)] = "c";
            // Leader at (3,3) facing +z (south): the trailing tile is (3,2), behind them.
            var p = Party.FollowPath(g, "c", 0, 3, 3, 3, 0);
            Assert.That(p, Is.Not.Null);
            Assert.That(p[p.Count - 1], Is.EqualTo(new Cell(3, 2)));
        }

        [Test]
        public void ADownedCompanionGetsUpWoundedNeverDead()
        {
            ContentFixture.Db();
            var s = Sheet.Empty("t");
            s.Hp = 0;
            Assert.That(Party.ReviveDowned(s, 100), Is.True);
            Assert.That(s.Hp, Is.GreaterThan(0));
            Assert.That(s.Effects.Any(e => e.Id == "downed" && e.Until == 100 + 1440), Is.True);
            Assert.That(Party.ReviveDowned(s, 100), Is.False);
        }

        private const string Ash = "npc_of_03", Nine = "npc_md_nine";

        [Test]
        public void AJoinPutsThemOnTheRoadWithTheirSheetAndPack()
        {
            ContentFixture.Db();
            var g = States.NewGame("openfield", 0, 0);
            Assert.That(Party.StateOf(g, Ash), Is.EqualTo(CompanionState.None));
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }, { 'set': 'ash_joined' }]"), g);
            Assert.That(g.World.Party, Is.EqualTo(new[] { Ash }));
            Assert.That(Party.StateOf(g, Ash), Is.EqualTo(CompanionState.Travelling));
            var c = g.Companions[Ash];
            Assert.That(c.Sheet, Is.Not.Null, "their sheet, built from their definition");
            Assert.That(c.Inv, Is.Not.Null, "their pack");
            Assert.That(c.Sheet.Hp, Is.EqualTo(Sheet.Derived(c.Sheet).MaxHp));
            Assert.That(Party.Save(g, Ash), Is.SameAs(c), "the same record every time (it is what fights and camps change)");
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }]"), g);
            Assert.That(g.World.Party.Count, Is.EqualTo(1), "a second join is no second member");
        }

        [Test]
        public void TheHealthTheWorldSawThemAtComesWithThem()
        {
            ContentFixture.Db();
            var g = States.NewGame("openfield", 0, 0);
            g.Npcs[Ash] = new NpcSave { Hp = 3 };
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }]"), g);
            Assert.That(g.Companions[Ash].Sheet.Hp, Is.EqualTo(3));
        }

        [Test]
        public void AWaitHereLeavesThemWaitingWhereTheyStoodAndASaveKeepsTheSpot()
        {
            ContentFixture.Db();
            var g = States.NewGame("openfield", 0, 0);
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }, { 'set': 'ash_joined' }]"), g);
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_of_03' }]"), g);
            Assert.That(g.World.Party, Is.Empty);
            Assert.That(Party.StateOf(g, Ash), Is.EqualTo(CompanionState.Waiting));
            var spot = Party.Spot(g, Ash);
            Assert.That(spot.Location, Is.EqualTo("openfield"), "waiting in the place they were left");
            Assert.That(spot.HasPoint, Is.False, "the game writes the point once it has seen them stop");
            Party.WaitAt(g, Ash, "openfield", 10.5f, 3.25f, -20f, 90f);
            var file = new SaveFile { Version = Migrations.CurrentVersion, Meta = new SaveMeta(), State = g };
            var back = SaveManager.Parse(SaveManager.Serialise(file)).State;
            Assert.That(Party.Waiting(back), Is.EqualTo(new[] { Ash }));
            var kept = Party.Spot(back, Ash);
            Assert.That(kept.HasPoint, Is.True);
            Assert.That(new[] { kept.X, kept.Y, kept.Z, kept.Yaw }, Is.EqualTo(new[] { 10.5f, 3.25f, -20f, 90f }));
            Assert.That(back.Companions[Ash].Sheet, Is.Not.Null, "their sheet saved with them");
            Assert.That(back.Companions[Ash].Left, Is.Null);
            // their own conversation asks them back
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }]"), back);
            Assert.That(Party.StateOf(back, Ash), Is.EqualTo(CompanionState.Travelling));
            Assert.That(Party.Spot(back, Ash), Is.Null);
        }

        [Test]
        public void LeavingTheRoadIsNotWaitingAndCanBeAskedBack()
        {
            ContentFixture.Db();
            var g = States.NewGame("openfield", 0, 0);
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }]"), g);
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_of_03' }, { 'set': 'x_left' }, { 'decision': { 'id': 'x_left', 'text': 'They went.' } }]"), g);
            Assert.That(Party.StateOf(g, Ash), Is.EqualTo(CompanionState.Left));
            Assert.That(Party.Spot(g, Ash), Is.Null);
            Assert.That(Party.Waiting(g), Is.Empty, "no one waits for the player");
            Assert.That(g.Companions[Ash].Sheet, Is.Not.Null, "their sheet is kept");
            // a bare leave afterwards changes nothing
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_of_03' }]"), g);
            Assert.That(Party.StateOf(g, Ash), Is.EqualTo(CompanionState.Left));
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }, { 'set': 'x_left', 'value': false }]"), g);
            Assert.That(Party.StateOf(g, Ash), Is.EqualTo(CompanionState.Travelling));
            Assert.That(g.Companions[Ash].Left, Is.Null);
        }

        [Test]
        public void ALeaveOfSomeoneWhoNeverJoinedKeepsNothing()
        {
            var g = States.NewGame("shale", 0, 0);
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_nobody' }]"), g);
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_nobody' }, { 'set': 'x' }]"), g);
            Assert.That(g.Companions == null || !g.Companions.ContainsKey("npc_nobody"), Is.True);
            Assert.That(Party.StateOf(g, "npc_nobody"), Is.EqualTo(CompanionState.None));
        }

        /// <summary>The rule that tells a wait from a leaving of the road holds over the content as exported: every leave
        /// with more than itself in its effects records a decision or sets a flag (none is ambiguous), and the content's
        /// own "wait here" choices are bare leaves.</summary>
        [Test]
        public void TheContentsWaitHereIsABareLeaveAndEveryOtherLeaveLeavesTheRoad()
        {
            var dir = ContentFixture.ContentDir();
            int bare = 0, road = 0;
            var ambiguous = new List<string>();
            void Walk(JToken t, string at)
            {
                if (t is JObject o)
                {
                    foreach (var p in o.Properties())
                    {
                        if (p.Value is JArray fx && fx.Any(e => e is JObject eo && eo.ContainsKey("leave")))
                        {
                            if (fx.Count == 1) { bare++; Assert.That(Party.LeavesTheRoad(fx), Is.False, at); }
                            else if (Party.LeavesTheRoad(fx)) road++;
                            else ambiguous.Add(at + "/" + p.Name);
                        }
                        Walk(p.Value, at + "/" + p.Name);
                    }
                }
                else if (t is JArray a) for (var i = 0; i < a.Count; i++) Walk(a[i], at + "[" + i + "]");
            }
            foreach (var name in new[] { "dialogues", "quests", "maps", "npcs", "world_events" })
            {
                var f = Path.Combine(dir, name + ".json");
                if (File.Exists(f)) Walk(JToken.Parse(File.ReadAllText(f)), name);
            }
            Assert.That(ambiguous, Is.Empty, "a leave with other effects but no decision or flag: wait or gone?");
            Assert.That(bare, Is.GreaterThanOrEqualTo(5), "the companions' wait-here choices");
            Assert.That(road, Is.GreaterThanOrEqualTo(5), "the companions' leavings of the road");
        }

        [Test]
        public void TheContentsPlacementsSayWhoIsPlacedAndWhoWaits()
        {
            ContentFixture.Db();
            var g = States.NewGame("md_precinct", 0, 0);
            Assert.That(Party.PlacementsOf(Nine), Is.Not.Empty);
            Assert.That(Party.PlacedByContent(g, Nine), Is.True, "at their post before they join");
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_md_nine' }, { 'set': 'nine_joined' }]"), g);
            Assert.That(Party.PlacedByContent(g, Nine), Is.False, "on the road with the player");
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_md_nine' }]"), g);
            Assert.That(Party.StateOf(g, Nine), Is.EqualTo(CompanionState.Waiting));
            Assert.That(Party.PlacedByContent(g, Nine), Is.False, "waiting where they were left: no placement holds");
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_md_nine' }]"), g);
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_md_nine' }, { 'set': 'nine_left' }, { 'decision': { 'id': 'n', 'text': 't' } }]"), g);
            Assert.That(Party.StateOf(g, Nine), Is.EqualTo(CompanionState.Left));
            Assert.That(Party.PlacedByContent(g, Nine), Is.True, "back at their post, as the content places them");
            g.Npcs[Nine] = new NpcSave { Dead = true };
            Assert.That(Party.PlacedByContent(g, Nine), Is.False, "the dead are placed nowhere");
        }

        [Test]
        public void DownedCompanionsGetUpWoundedAfterAFight()
        {
            ContentFixture.Db();
            var g = States.NewGame("openfield", 0, 0);
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }, { 'join': 'npc_md_nine' }]"), g);
            g.Companions[Ash].Sheet.Hp = 0;
            var up = Party.AfterFight(g, 500);
            Assert.That(up, Is.EqualTo(new[] { Ash }));
            Assert.That(g.Companions[Ash].Sheet.Hp, Is.GreaterThan(0), "never dead");
            Assert.That(g.Companions[Ash].Sheet.Effects.Any(e => e.Id == "downed"), Is.True, "wounded");
            Assert.That(g.Companions[Nine].Sheet.Effects.Any(e => e.Id == "downed"), Is.False);
        }

        [Test]
        public void OnlyATravellingCompanionHasTheirSayInConversation()
        {
            ContentFixture.Db();
            var g = States.NewGame("openfield", 0, 0);
            var t = JObject.Parse(@"{ 'id': 'd_ij_party', 'owner': 'npc_test', 'start': [{ 'node': 'a' }], 'nodes': {
                'a': { 'text': 'Pay the toll.', 'interject': [ { 'companion': 'npc_of_03', 'text': 'Do not.' } ],
                  'options': [ { 'text': 'Bye.', 'exit': true } ] } } }").ToObject<DialogueDef>();
            int Says() => new DialogueRunner(t, g).View().Interjections.Count;
            Assert.That(Says(), Is.EqualTo(0));
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }]"), g);
            Assert.That(Says(), Is.EqualTo(1), "travelling");
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_of_03' }]"), g);
            Assert.That(Says(), Is.EqualTo(0), "waiting somewhere");
            Logic.Apply(Logic.Fx("[{ 'join': 'npc_of_03' }]"), g);
            Logic.Apply(Logic.Fx("[{ 'leave': 'npc_of_03' }, { 'set': 'gone' }]"), g);
            Assert.That(Says(), Is.EqualTo(0), "gone from the road");
        }
    }
}
