using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Combat;
using SecondFace.Core.Content;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>
    /// The content's events the game answers (Core rules behind Game <c>Walkabout.OnEvent</c>): every <c>goto</c> the
    /// content asks for lands somewhere real (its map, its spawn, a world place that holds the map), the ways a map is
    /// found in the one open world (its own place, through the maps it opens onto, its town), and a pit bout's end (both
    /// get up, the stake pays through the outcome's effects, nobody dies).
    /// </summary>
    public class ContentEventRulesTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static System.Func<string, string> Places => Goto.ContentPlaces(ContentFixture.Db().Table("sites"));

        [Test]
        public void EveryGotoInTheContentLandsOnARealMapSpawnAndPlace()
        {
            var db = ContentFixture.Db();
            var all = Goto.InContent(("dialogues", db.Table("dialogues")), ("quests", db.Table("quests")), ("maps", db.Table("maps")));
            Assert.That(all.Count, Is.GreaterThan(20), "the content's moves were found");
            var bad = new System.Collections.Generic.List<string>();
            foreach (var (where, order, data) in all)
            {
                if (order == null) { bad.Add($"{where}: goto names no location ({data})"); continue; }
                if (!Registry.Maps.TryGetValue(order.Location, out var map)) { bad.Add($"{where}: no map {order.Location}"); continue; }
                if (!string.IsNullOrEmpty(order.Spawn) && (map.Spawns == null || !map.Spawns.Any(s => s.Id == order.Spawn)))
                    bad.Add($"{where}: {order.Location} has no spawn {order.Spawn}");
                var t = Goto.Resolve(order.Location, order.Spawn, Places);
                if (t == null) { bad.Add($"{where}: no world place holds {order.Location}"); continue; }
                if (!Registry.WorldMap.Locations.ContainsKey(t.Place)) bad.Add($"{where}: {order.Location} resolves to {t.Place}, not a world place");
                if (t.Spawn == null) bad.Add($"{where}: {order.Location} has no spawn at all");
                if (order.Minutes < 0) bad.Add($"{where}: negative minutes");
            }
            Assert.That(bad, Is.Empty, string.Join("\n", bad));
        }

        [Test]
        public void AMapIsFoundByItsOwnPlaceThroughItsExitsOrByItsTown()
        {
            // its own place (the world map's location whose map it is, or a site beside one)
            var own = Goto.Resolve("overpass", "cage", Places);
            Assert.That(own.Place, Is.EqualTo("rustdogs"));
            Assert.That(own.Via, Is.EqualTo("map"));
            Assert.That(own.SpawnFound, Is.True);
            Assert.That(own.Spawn.Id, Is.EqualTo("cage"));
            Assert.That(Goto.Resolve("md_bridgeward", "loop", Places).Place, Is.EqualTo("meridian"), "a district beside another, followed to the one stood in the world");
            // through the maps it opens onto (a cellar under its street)
            var under = Goto.Resolve("md_sink", "clinic", Places);
            Assert.That(under.Place, Is.EqualTo("meridian"));
            Assert.That(under.Via, Is.EqualTo("exits"));
            // a room of a town reached by a lift's conversation: through the map the lift stands on
            var lift = Goto.Resolve("md_crown", "hall", Places);
            Assert.That(lift.Place, Is.EqualTo("meridian"));
            Assert.That(lift.Via, Is.EqualTo("exits"));
            // a room whose neighbours stand nowhere in the world: its town
            var town = Goto.Resolve("md_crown", "hall", m => m == "meridian" ? "meridian" : null);
            Assert.That(town.Place, Is.EqualTo("meridian"));
            Assert.That(town.Via, Is.EqualTo("settlement"));
            // a cell whose only door is a conversation (a crank, a stair): the place of the map that door stands on
            var cell = Goto.Resolve("an_hall", "stair", Places);
            Assert.That(cell, Is.Not.Null, "a cell entered by a conversation's goto is found through the map of its door");
            Assert.That(cell.Place, Is.EqualTo(Goto.Resolve("an_kelso", null, Places).Place));
            Assert.That(cell.Via, Is.EqualTo("exits"));
            // as the world's layout has it at run time: a place whose map it is wins
            var layout = Goto.Resolve("md_bridgeward", "loop", m => m == "md_bridgeward" ? "site_md_bridgeward" : m == "meridian" ? "meridian" : null);
            Assert.That(layout.Place, Is.EqualTo("site_md_bridgeward"));
            Assert.That(layout.Via, Is.EqualTo("map"));
        }

        [Test]
        public void AnUnknownSpawnFallsBackToTheMapsFirstAndAnUnknownMapToNothing()
        {
            var t = Goto.Resolve("shale", "no_such_spawn", Places);
            Assert.That(t.SpawnFound, Is.False);
            Assert.That(t.Spawn.Id, Is.EqualTo(Registry.Maps["shale"].Spawns[0].Id));
            Assert.That(Goto.Resolve("shale", null, Places).Spawn.Id, Is.EqualTo(Registry.Maps["shale"].Spawns[0].Id));
            Assert.That(Goto.Resolve("no_such_map", null, Places), Is.Null);
            Assert.That(Goto.Resolve("shale", null, _ => null), Is.Null, "no place holds it");
        }

        [Test]
        public void AGotosDataReadsItsLocationSpawnAndMinutes()
        {
            var o = GotoOrder.From(JObject.Parse("{\"location\":\"md_crown\",\"spawn\":\"hall\",\"minutes\":5}"));
            Assert.That((o.Location, o.Spawn, o.Minutes), Is.EqualTo(("md_crown", "hall", 5.0)));
            var bare = GotoOrder.From(JObject.Parse("{\"location\":\"md_precinct\"}"));
            Assert.That(bare.Spawn, Is.Null);
            Assert.That(bare.Minutes, Is.EqualTo(0));
            Assert.That(GotoOrder.From(JObject.Parse("{}")), Is.Null);
            Assert.That(GotoOrder.From(null), Is.Null);
        }

        // ---- the pit ----------------------------------------------------------------------------------------------------

        private static (GameState g, CharacterSheet them) Bout()
        {
            var g = States.NewGame("shale", 0, 0);
            var them = Sheet.Empty("Them");
            return (g, them);
        }

        private static PitTerms Terms() => PitTerms.From(JObject.Parse(
            "{\"pit\":{\"win\":[{\"set\":\"t_bout_won\"},{\"give\":\"tolls\",\"count\":15}],\"lose\":[{\"set\":\"t_bout_lost\"},{\"inc\":\"t_floored\"}]}}"));

        [Test]
        public void APitWinPaysTheWinsEffectsAndBothGetUp()
        {
            var (g, them) = Bout();
            them.Hp = 0;   // down on the pit floor
            g.Pc.Sheet.Hp = 3;
            var tolls = g.Pc.Inventory.Tolls;
            Assert.That(Pit.Settle(g, them, "npc_t_pit", "victory", Terms()), Is.EqualTo("won"));
            Assert.That(g.Flags.ContainsKey("t_bout_won"), Is.True);
            Assert.That(g.Flags.ContainsKey("t_bout_lost"), Is.False);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(tolls + 15));
            Assert.That(them.Hp, Is.EqualTo(System.Math.Max(1, (int)System.Math.Round(Sheet.Derived(them).MaxHp * Pit.StandUpShare))), "the loser gets up at three tenths");
            Assert.That(g.Pc.Sheet.Hp, Is.EqualTo(3), "the winner keeps what they had");
            var save = g.Npcs["npc_t_pit"];
            Assert.That(save.Dead, Is.Not.True, "nobody dies in the pit");
            Assert.That(save.Hostile, Is.False);
            Assert.That(save.Hp, Is.EqualTo(them.Hp));
        }

        [Test]
        public void APitLossPaysTheLossesEffectsAndThePlayerGetsUp()
        {
            var (g, them) = Bout();
            g.Pc.Sheet.Hp = 0;
            Assert.That(Pit.Settle(g, them, "npc_t_pit", "defeat", Terms()), Is.EqualTo("lost"));
            Assert.That(g.Flags.ContainsKey("t_bout_lost"), Is.True);
            Assert.That(g.Flag("t_floored"), Is.EqualTo(1.0));
            Assert.That(g.Flags.ContainsKey("t_bout_won"), Is.False);
            Assert.That(g.Pc.Sheet.Hp, Is.GreaterThanOrEqualTo(1), "the player gets up off the floor");
            Assert.That(g.Pc.Sheet.Hp, Is.LessThan(Sheet.Derived(g.Pc.Sheet).MaxHp));
        }

        [Test]
        public void ABoutCalledOffPaysNothingAndARealFightHasNoTerms()
        {
            var (g, them) = Bout();
            Assert.That(Pit.Settle(g, them, "npc_t_pit", "truce", Terms()), Is.EqualTo("called"));
            Assert.That(g.Flags.ContainsKey("t_bout_won") || g.Flags.ContainsKey("t_bout_lost"), Is.False);
            Assert.That(PitTerms.From(null), Is.Null);
            Assert.That(PitTerms.From(JObject.Parse("{}")), Is.Null, "a fight without a pit is a real one");
        }

        [Test]
        public void TheContentsPitBoutsAllHaveTerms()
        {
            var db = ContentFixture.Db();
            var fights = new System.Collections.Generic.List<JObject>();
            void Walk(JToken t)
            {
                if (t is JObject o) { if ((string)o["event"] == "fight") fights.Add(o); foreach (var p in o.Properties()) Walk(p.Value); }
                else if (t is JArray a) foreach (var e in a) Walk(e);
            }
            Walk(db.Table("dialogues"));
            Assert.That(fights, Is.Not.Empty);
            foreach (var f in fights.Where(f => f["data"]?["pit"] != null))
            {
                var terms = PitTerms.From(f["data"]);
                Assert.That(terms, Is.Not.Null);
                // the effects are ones Logic knows (applying them on a fresh game throws nothing)
                var g = States.NewGame("shale", 0, 0);
                Assert.DoesNotThrow(() => Logic.Apply(terms.Win, g));
                Assert.DoesNotThrow(() => Logic.Apply(terms.Lose, States.NewGame("shale", 0, 0)));
            }
        }
    }
}
