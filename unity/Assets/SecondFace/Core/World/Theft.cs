using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.Scene;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>
    /// Whose things are whose (P6.3): a container belongs to whoever keeps the room it stands in, the one who sleeps
    /// there first, else the one who works or trades there, else the one placed there; in the open, or in a room nobody
    /// keeps, it is nobody's (salvage). Visitors (placements with a condition) keep nothing.
    /// </summary>
    public static class Owners
    {
        public static Dictionary<string, string> Of(MapDef map, PlacePlan plan)
        {
            var keeps = new Dictionary<int, (string Who, int Rank)>();
            void Keep(int room, string who, int rank)
            {
                if (room < 0) return;
                if (!keeps.TryGetValue(room, out var k) || rank < k.Rank) keeps[room] = (who, rank);
            }
            foreach (var p in map.Npcs ?? new List<NpcPlacement>())
            {
                if (p.If != null || !Registry.Npcs.TryGetValue(p.Def, out var def)) continue;
                foreach (var e in Routine.Of(p, def) ?? new List<ScheduleEntry>())
                {
                    if (e.Spot == null || map.Spots == null || !map.Spots.TryGetValue(e.Spot, out var t)) continue;
                    Keep(plan.RoomOf(t.X, t.Y), p.Def, e.Activity == "sleep" ? 0 : e.Activity is "work" or "trade" ? 1 : 2);
                }
                Keep(plan.RoomOf(p.X, p.Y), p.Def, 3);
            }
            var owners = new Dictionary<string, string>();
            foreach (var m in plan.Markers)
            {
                if (m.Kind != "container") continue;
                var room = plan.RoomOf((m.X + plan.Width / 2) / PlacePlan.Tile, (plan.Depth / 2 - m.Z) / PlacePlan.Tile);
                if (room >= 0 && keeps.TryGetValue(room, out var k)) owners[m.Id] = k.Who;
            }
            return owners;
        }

        /// <summary>Whose a container is now in a game: nobody's when its content says it is the player's (a room rented),
        /// else its keeper from <paramref name="owners"/> (null: nobody's).</summary>
        public static string Now(GameState g, MapDef map, string id, IReadOnlyDictionary<string, string> owners)
        {
            if (map?.Containers != null && map.Containers.TryGetValue(id, out var def) && def.YoursIf != null && Logic.Test(def.YoursIf, g)) return null;
            return owners != null && owners.TryGetValue(id, out var who) ? who : null;
        }
    }

    /// <summary>
    /// Something taken from what is another's (P6.3; reputation is local and travels with people, DESIGN §2): seen, every
    /// witness remembers it and trusts the player less, the owner most of all (told of it if they did not see), and word
    /// goes round the settlement and on along its roads (news about the player, the bigger the take the further);
    /// unseen, the owner finds it gone and blames nobody yet.
    /// </summary>
    public static class Theft
    {
        public const string Tag = "theft";
        public const double WitnessTrust = -10, OwnerSawTrust = -25, OwnerToldTrust = -15;

        /// <summary>Records a theft; the news item when it was seen (null when not).</summary>
        public static NewsItem Taken(GameState g, string settlement, string settlementName, string owner, IReadOnlyCollection<string> witnesses, int value)
        {
            var w = g.World;
            if (witnesses == null || witnesses.Count == 0)
            {
                if (owner != null) Remember(g, owner, "robbed", -20, 50, "witnessed");
                return null;
            }
            foreach (var who in witnesses.Where(x => x != owner).Distinct())
            {
                Remember(g, who, "saw_theft", -40, 70, "witnessed");
                var r = w.RelationWith(who);
                r.Trust = WorldState.Clamp100(r.Trust + WitnessTrust);
            }
            if (owner != null)
            {
                var saw = witnesses.Contains(owner);
                Remember(g, owner, "robbed_by_player", -70, 85, saw ? "witnessed" : "told");
                var r = w.RelationWith(owner);
                r.Trust = WorldState.Clamp100(r.Trust + (saw ? OwnerSawTrust : OwnerToldTrust));
            }
            var size = Math.Clamp(2 + value / 20.0, 2, 8);
            return Frontier.AddNews(g, Tag, $"A stranger was seen thieving in {settlementName}.", -30, size, settlement, "player");
        }

        private static void Remember(GameState g, string npc, string tag, double valence, double strength, string source)
        {
            var w = g.World;
            if (!w.Memories.TryGetValue(npc, out var list)) w.Memories[npc] = list = new List<Memory>();
            var m = new Memory { Tag = tag, Valence = valence, Strength = strength, Day = Clock.DayOf(g.Minutes), Source = source };
            var old = list.Find(x => x.Tag == tag);
            if (old == null) list.Add(m);
            else { old.Valence = Math.Min(old.Valence, valence); old.Strength = Math.Min(100, old.Strength + 10); old.Day = m.Day; old.Source = source; }
        }
    }
}
