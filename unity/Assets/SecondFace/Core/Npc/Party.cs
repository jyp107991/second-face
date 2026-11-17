using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Core.Npc
{
    /// <summary>Where a companion is, as the story has them (<see cref="Party.StateOf"/>).</summary>
    public enum CompanionState
    {
        /// <summary>Never joined.</summary>
        None,
        /// <summary>In the party: they follow the player and fight beside them.</summary>
        Travelling,
        /// <summary>Dismissed to wait (a bare "wait here"): they stand where they were left until asked to rejoin.</summary>
        Waiting,
        /// <summary>Left the road (a leave the story recorded as a decision): not following and not waiting anywhere; their
        /// content's placements say where, if anywhere, they stand now.</summary>
        Left,
    }

    /// <summary>A waiting companion's spot (<see cref="CompanionSave.WaitingAt"/>): the place's id and the world point and
    /// heading they stand at (no point until the game has written one).</summary>
    public sealed class WaitSpot
    {
        public string Location;
        public bool HasPoint;
        public float X, Y, Z, Yaw;
    }

    /// <summary>
    /// Companions in the scene (port of npc/party.ts): they follow at a short distance, fight on the player's side, go
    /// down instead of dying in combat (there is no permanent-death mode), and keep their sheet and pack between maps
    /// (<see cref="GameState.Companions"/>). A bare "wait here" (a <c>leave</c> alone) leaves them waiting where they
    /// stand; a leave the story records as a decision (or with a flag of its own) is leaving the road, and the content's
    /// placements say where they are after it. Pure helpers; the game wires them to bodies and the encounter.
    /// </summary>
    public static class Party
    {
        /// <summary>Nearest free walkable tile to (x, y), searching rings outward (radius ≤ maxR).</summary>
        public static Cell? FreeTileNear(Grid grid, int x, int y, string ignore = null, int maxR = 6)
        {
            for (var r = 0; r <= maxR; r++)
                for (var dy = -r; dy <= r; dy++)
                    for (var dx = -r; dx <= r; dx++)
                    {
                        if (Math.Max(Math.Abs(dx), Math.Abs(dy)) != r) continue;
                        int tx = x + dx, ty = y + dy;
                        if (grid.InBounds(tx, ty) && grid.Passable(tx, ty, ignore)) return new Cell(tx, ty);
                    }
            return null;
        }

        /// <summary>Follow when further than `slack` tiles (a little further while the leader is still walking).</summary>
        public static bool ShouldFollow(double dist, bool leaderMoving, int slack = 2) => dist > slack + (leaderMoving ? 1 : 0);

        /// <summary>
        /// Path for a companion toward a tile adjacent to the leader. Prefers the tile behind the leader's heading so
        /// companions trail rather than crowd; falls back to any adjacent tile.
        /// </summary>
        public static List<Cell> FollowPath(Grid grid, string id, int cx, int cy, int lx, int ly, double facing)
        {
            int bx = lx - (int)Math.Floor(Math.Sin(facing) + 0.5), by = ly - (int)Math.Floor(Math.Cos(facing) + 0.5);
            if (grid.InBounds(bx, by) && grid.Passable(bx, by, id) && !(bx == cx && by == cy))
            {
                var p = grid.FindPath(cx, cy, bx, by, new PathOpts { Ignore = id, MaxCost = 40 });
                if (p != null) return p;
            }
            return grid.FindPath(cx, cy, lx, ly, new PathOpts { Ignore = id, AdjacentOk = true, MaxCost = 40 });
        }

        /// <summary>After a fight, a companion at 0 HP gets up wounded rather than dying. Returns true if they were down.</summary>
        public static bool ReviveDowned(CharacterSheet s, int now)
        {
            if (s.Hp > 0) return false;
            s.Hp = Math.Max(1, (int)Math.Floor(Sheet.Derived(s).MaxHp * 0.1 + 0.5));
            s.Effects.RemoveAll(e => e.Id == "downed");
            s.Effects.Add(new ActiveEffect
            {
                Id = "downed", Name = "Wounded", Until = now + 24 * 60,
                Mods = new List<Modifier> { new Modifier { Target = "attr:grit", Add = -1 }, new Modifier { Target = "attr:reflex", Add = -1 } },
            });
            return true;
        }

        // ---- the story's side: who travels, who waits where, who has left the road ----------------------------------

        /// <summary>Where a companion is as the story has them.</summary>
        public static CompanionState StateOf(GameState g, string id)
        {
            if (g == null || id == null) return CompanionState.None;
            if (g.World.Party.Contains(id)) return CompanionState.Travelling;
            if (g.Companions == null || !g.Companions.TryGetValue(id, out var c) || c == null) return CompanionState.None;
            if (c.Left == true) return CompanionState.Left;
            return c.WaitingAt != null && c.WaitingAt.Type != JTokenType.Null ? CompanionState.Waiting : CompanionState.Left;
        }

        /// <summary>A companion's record, made the first time it is asked for: their sheet and pack built from their
        /// definition (with the health the world last saw them at) when the content has them.</summary>
        public static CompanionSave Save(GameState g, string id)
        {
            g.Companions ??= new Dictionary<string, CompanionSave>();
            if (!g.Companions.TryGetValue(id, out var c) || c == null) g.Companions[id] = c = new CompanionSave();
            if ((c.Sheet == null || c.Inv == null) && Registry.Npcs.TryGetValue(id, out var def))
            {
                var (sheet, inv) = NpcStats.Build(def);
                if (g.Npcs.TryGetValue(id, out var seen) && seen.Hp is int hp) sheet.Hp = Math.Max(1, Math.Min(hp, Sheet.Derived(sheet).MaxHp));
                c.Sheet ??= sheet;
                c.Inv ??= inv;
            }
            return c;
        }

        /// <summary>The content's <c>join</c>: on the road with the player (no longer waiting, no longer gone).</summary>
        public static void Joined(GameState g, string id)
        {
            if (id == null) return;
            if (!g.World.Party.Contains(id)) g.World.Party.Add(id);
            var c = Save(g, id);
            c.WaitingAt = null;
            c.Left = null;
        }

        /// <summary>The content's <c>leave</c>: waiting where they stand (a bare leave; the game writes the point), or gone
        /// from the road (<paramref name="forGood"/>: see <see cref="LeavesTheRoad"/>).</summary>
        public static void Departed(GameState g, string id, bool forGood)
        {
            if (id == null) return;
            var was = g.World.Party.Remove(id);
            // (someone who never joined has nothing to keep: a leave of theirs is the content tidying up)
            if (!was && (g.Companions == null || !g.Companions.ContainsKey(id))) return;
            var c = Save(g, id);
            if (forGood) { c.WaitingAt = null; c.Left = true; return; }
            // (a bare leave of someone not travelling changes nothing: the waiting go on waiting, the gone stay gone)
            if (!was) return;
            c.Left = null;
            c.WaitingAt = new JObject { ["Location"] = g.LocationId };
        }

        /// <summary>Whether a <c>leave</c> among <paramref name="effects"/> is leaving the road rather than waiting: the
        /// content's "wait here" is a leave alone, while every leaving of the road records a decision or sets a flag of its
        /// own in the same effects.</summary>
        public static bool LeavesTheRoad(JToken effects)
        {
            if (effects is not JArray list) return false;
            foreach (var t in list)
                if (t is JObject e && (e.ContainsKey("decision") || e.ContainsKey("set"))) return true;
            return false;
        }

        /// <summary>Where a waiting companion stands (null when they are not waiting).</summary>
        public static WaitSpot Spot(GameState g, string id)
        {
            if (StateOf(g, id) != CompanionState.Waiting) return null;
            var t = g.Companions[id].WaitingAt;
            if (t is JObject o)
            {
                var s = new WaitSpot { Location = o.Value<string>("Location") };
                if (o["X"] != null && o["Z"] != null)
                {
                    s.HasPoint = true;
                    s.X = o.Value<float>("X"); s.Y = o.Value<float?>("Y") ?? 0f; s.Z = o.Value<float>("Z"); s.Yaw = o.Value<float?>("Yaw") ?? 0f;
                }
                return s;
            }
            return new WaitSpot { Location = t.Type == JTokenType.String ? (string)t : null };
        }

        /// <summary>Writes where a waiting companion stands (the game, once it has seen them stop).</summary>
        public static void WaitAt(GameState g, string id, string location, float x, float y, float z, float yaw)
        {
            var c = Save(g, id);
            c.Left = null;
            c.WaitingAt = new JObject { ["Location"] = location, ["X"] = Round(x), ["Y"] = Round(y), ["Z"] = Round(z), ["Yaw"] = Round(yaw) };
        }

        private static double Round(float v) => Math.Round(v, 2);

        /// <summary>The companions waiting somewhere now.</summary>
        public static IEnumerable<string> Waiting(GameState g) =>
            g.Companions == null ? Enumerable.Empty<string>() : g.Companions.Keys.Where(id => StateOf(g, id) == CompanionState.Waiting).ToList();

        /// <summary>Whether one of the content's placements of this person holds now, on any map (and they are alive): the
        /// content has put them somewhere (home, their post), so no waiting figure of theirs stands anywhere else.</summary>
        public static bool PlacedByContent(GameState g, string id)
        {
            if (id == null || (g.Npcs.TryGetValue(id, out var n) && n.Dead == true)) return false;
            foreach (var p in PlacementsOf(id))
                if (p.If == null || Logic.Test(p.If, g)) return true;
            return false;
        }

        private static Dictionary<string, MapDef> _indexed;
        private static readonly Dictionary<string, List<NpcPlacement>> Placements = new();

        /// <summary>Every placement of a person on the content's maps (indexed once per registry).</summary>
        public static IReadOnlyList<NpcPlacement> PlacementsOf(string id)
        {
            if (!ReferenceEquals(_indexed, Registry.Maps))
            {
                Placements.Clear();
                foreach (var map in Registry.Maps.Values)
                    if (map?.Npcs != null)
                        foreach (var p in map.Npcs)
                        {
                            if (p?.Def == null) continue;
                            if (!Placements.TryGetValue(p.Def, out var l)) Placements[p.Def] = l = new List<NpcPlacement>();
                            l.Add(p);
                        }
                _indexed = Registry.Maps;
            }
            return Placements.TryGetValue(id, out var list) ? list : (IReadOnlyList<NpcPlacement>)Array.Empty<NpcPlacement>();
        }

        /// <summary>After a fight: every travelling companion who went down gets up wounded (never dead). The ids of those
        /// who were down.</summary>
        public static List<string> AfterFight(GameState g, int now)
        {
            var up = new List<string>();
            foreach (var id in g.World.Party)
            {
                var c = g.Companions != null && g.Companions.TryGetValue(id, out var s) ? s : null;
                if (c?.Sheet != null && ReviveDowned(c.Sheet, now)) up.Add(id);
            }
            return up;
        }
    }

    /// <summary>Building people from their definitions (the pure part of npc/spawn.ts).</summary>
    public static class NpcStats
    {
        /// <summary>An NPC's character sheet and inventory from its definition.</summary>
        public static (CharacterSheet sheet, Inventory.Inventory inv) Build(NpcDef def)
        {
            var sheet = Sheet.Empty(def.Name);
            foreach (var a in Rules.Attributes) sheet.BaseAttrs[a] = def.Attrs != null && def.Attrs.TryGetValue(a, out var v) ? v : 5;
            if (def.Skills != null) foreach (var kv in def.Skills) sheet.SkillBought[kv.Key] = kv.Value;
            sheet.Tagged = def.Tagged != null ? new List<string>(def.Tagged) : new List<string>();
            sheet.Traits = def.Traits != null ? new List<string>(def.Traits) : new List<string>();
            sheet.Perks = def.Perks != null ? new Dictionary<string, int>(def.Perks) : new Dictionary<string, int>();
            sheet.Level = def.Level;
            sheet.Xp = Rules.XpForLevel(def.Level);
            var inv = Inv.Empty();
            foreach (var (id, n) in def.InventoryItems) Inv.AddItem(inv, Inv.MakeItem(id, n));
            foreach (var id in def.Equip ?? new List<string>())
            {
                Inv.AddItem(inv, Inv.MakeItem(id));
                var idx = inv.Items.FindIndex(i => i.Def == id);
                var d = Items.Def(id);
                if (d.Weapon != null) Inv.Equip(inv, idx, inv.EquippedAt("primary") != null ? "secondary" : "primary");
                else Inv.Equip(inv, idx);
            }
            if (def.Tolls is int t && t != 0) inv.Tolls += t;
            foreach (var slot in new[] { "primary", "secondary" }) if (inv.EquippedAt(slot) != null) Inv.Reload(inv, slot);
            Inv.SyncGear(sheet, inv);
            sheet.Hp = Sheet.Derived(sheet).MaxHp;
            return (sheet, inv);
        }
    }
}
