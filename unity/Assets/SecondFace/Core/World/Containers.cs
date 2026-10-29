using System;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    /// <summary>What happened when a container was tried.</summary>
    public sealed class Opened
    {
        /// <summary>It opened (and <see cref="Inv"/> is what is in it).</summary>
        public bool Open;
        public string Name;
        public Inventory.Inventory Inv;
        /// <summary>The Locks check, when it was locked.</summary>
        public CheckResult? Check;
        /// <summary>The lock was picked now (and <see cref="Xp"/> earned).</summary>
        public bool Picked;
        public int Xp;
    }

    /// <summary>
    /// The containers of a place (P6.1; port of game.ts interactableAt): a locked one takes a Locks check (two minutes
    /// each try; picked once, it stays open and the pick is worth 10 + half the lock in XP), and the first time one is
    /// opened it is filled from the map's definition; after that its contents live in <see cref="GameState.Containers"/>
    /// by <c>place/id</c>, taken from and put into like any inventory.
    /// </summary>
    public static class Containers
    {
        public static string Key(string place, string id) => $"{place}/{id}";
        public static string UnlockedFlag(string key) => "unlocked:" + key;

        /// <summary>Whether it is locked to this player now.</summary>
        public static bool Locked(GameState g, string place, string id, ContainerDef def) =>
            def?.Lock is double l && l > 0 && !g.FlagTruthy(UnlockedFlag(Key(place, id)));

        /// <summary>Tries it: picks the lock if there is one, fills it on its first opening.</summary>
        public static Opened Open(GameState g, string place, string id, ContainerDef def, Rng rng)
        {
            var key = Key(place, id);
            var o = new Opened { Name = def?.Name ?? id };
            if (def?.Lock is double l && l > 0 && !g.FlagTruthy(UnlockedFlag(key)))
            {
                var r = Checks.SkillCheck(g.Pc.Sheet, g.Pc.Inventory, "security", (int)l, rng);
                g.Minutes += 2;
                o.Check = r;
                if (!r.Success) return o;
                g.SetFlag(UnlockedFlag(key), true);
                o.Xp = 10 + (int)Math.Floor(l / 2 + 0.5);   // JavaScript's Math.round
                Sheet.AddXp(g.Pc.Sheet, o.Xp);
                o.Picked = true;
            }
            if (!g.Containers.TryGetValue(key, out var inv))
            {
                inv = new Inventory.Inventory();
                if (def != null)
                {
                    foreach (var (item, n) in def.Entries()) if (Items.Has(item)) Inv.AddItem(inv, Inv.MakeItem(item, n));
                    inv.Tolls = (int)(def.Tolls ?? 0);
                }
                g.Containers[key] = inv;
            }
            o.Inv = inv;
            o.Open = true;
            return o;
        }

        /// <summary>Moves a stack (or some of it) from one inventory to another; false when there is nothing there.</summary>
        public static bool Move(Inventory.Inventory from, int index, Inventory.Inventory to, int? qty = null)
        {
            var it = Inv.TakeAt(from, index, qty);
            if (it == null) return false;
            Inv.AddItem(to, it);
            return true;
        }

        /// <summary>Takes everything (and the Tolls); returns how many stacks moved.</summary>
        public static int MoveAll(Inventory.Inventory from, Inventory.Inventory to)
        {
            var n = 0;
            while (from.Items.Count > 0 && Move(from, 0, to)) n++;
            to.Tolls += from.Tolls;
            from.Tolls = 0;
            return n;
        }
    }
}
