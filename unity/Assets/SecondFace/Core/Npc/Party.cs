using System;
using System.Collections.Generic;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Scene;
using SecondFace.Core.Stats;

namespace SecondFace.Core.Npc
{
    /// <summary>What a companion keeps between maps: their sheet, their pack, and where they wait when dismissed.</summary>
    public sealed class CompanionSave
    {
        public CharacterSheet Sheet;
        public Inventory.Inventory Inv;
        public WaitingAt WaitingAt;
    }

    public sealed class WaitingAt { public string Location; public int X, Y; }

    /// <summary>
    /// Companions in the scene (port of npc/party.ts): they follow at a short distance, fight on the player's side, go
    /// down instead of dying in combat (there is no permanent-death mode), and keep their sheet and pack between maps.
    /// Pure helpers; the game wires them to actors and the encounter.
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
