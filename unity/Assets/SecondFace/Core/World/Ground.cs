using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using SecondFace.Core.Inventory;
using SecondFace.Core.State;

namespace SecondFace.Core.World
{
    /// <summary>A pile of things on the ground: its key in <see cref="GameState.Containers"/>, where it lies (world metres,
    /// the floor it lies on) and what is in it.</summary>
    public sealed class Pile
    {
        public string Key;
        public float X, Y, Z;
        public Inventory.Inventory Inv;
    }

    /// <summary>
    /// Things on the ground (P6.1; port of game.ts's ground piles, in world metres for the open world): what is dropped
    /// lies where it was dropped, in a pile kept in <see cref="GameState.Containers"/> under a key that says where
    /// (<c>ground:x_y_z</c>, decimetres), so it is saved with the game and found again; a second thing dropped near a
    /// pile joins it. Taking from a pile is the loot screen's (<see cref="Containers.Move"/>); an emptied pile goes.
    /// </summary>
    public static class Ground
    {
        public const string Prefix = "ground:";
        /// <summary>How near a pile something dropped joins it (metres, on the ground; a floor apart never).</summary>
        public const float Join = 1.5f;

        public static string Key(float x, float y, float z) =>
            string.Format(CultureInfo.InvariantCulture, "{0}{1}_{2}_{3}", Prefix, Num.RoundInt(x * 10), Num.RoundInt(y * 10), Num.RoundInt(z * 10));

        /// <summary>Where a pile's key says it lies (false for a key that is not a pile's).</summary>
        public static bool Where(string key, out float x, out float y, out float z)
        {
            x = y = z = 0f;
            if (key == null || !key.StartsWith(Prefix, StringComparison.Ordinal)) return false;
            var parts = key.Substring(Prefix.Length).Split('_');
            if (parts.Length != 3) return false;
            if (!int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var a)
                || !int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var b)
                || !int.TryParse(parts[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out var c)) return false;
            x = a / 10f; y = b / 10f; z = c / 10f;
            return true;
        }

        /// <summary>Every pile with something in it.</summary>
        public static List<Pile> Piles(GameState g)
        {
            var list = new List<Pile>();
            foreach (var (key, inv) in g.Containers)
                if (inv != null && (inv.Items.Count > 0 || inv.Tolls > 0) && Where(key, out var x, out var y, out var z))
                    list.Add(new Pile { Key = key, X = x, Y = y, Z = z, Inv = inv });
            return list;
        }

        /// <summary>The pile within <see cref="Join"/> of a point on the same floor (within a metre and a half up or
        /// down), the nearest; null when none.</summary>
        public static Pile Near(GameState g, float x, float y, float z, float within = Join) =>
            Piles(g).Where(p => Math.Abs(p.Y - y) < 1.5f)
                .Select(p => (p, d: (p.X - x) * (p.X - x) + (p.Z - z) * (p.Z - z)))
                .Where(t => t.d <= within * within)
                .OrderBy(t => t.d).Select(t => t.p).FirstOrDefault();

        /// <summary>Drops <paramref name="n"/> of the carried stack at <paramref name="index"/> where the player stands:
        /// into the pile near there, or a new one. Returns the pile (null when nothing was dropped).</summary>
        public static Pile Drop(GameState g, Inventory.Inventory from, int index, int n, float x, float y, float z)
        {
            if (index < 0 || index >= from.Items.Count || n <= 0) return null;
            var pile = Near(g, x, y, z);
            if (pile == null)
            {
                var key = Key(x, y, z);
                if (!g.Containers.TryGetValue(key, out var inv) || inv == null) g.Containers[key] = inv = new Inventory.Inventory();
                Where(key, out var px, out var py, out var pz);
                pile = new Pile { Key = key, X = px, Y = py, Z = pz, Inv = inv };
            }
            var taken = Inv.TakeAt(from, index, Math.Min(n, from.Items[index].Qty));
            if (taken == null) return null;
            Inv.AddItem(pile.Inv, taken);
            return pile;
        }

        /// <summary>Takes away the piles left empty.</summary>
        public static int Tidy(GameState g)
        {
            var empty = g.Containers.Where(kv => kv.Key.StartsWith(Prefix, StringComparison.Ordinal) && (kv.Value == null || (kv.Value.Items.Count == 0 && kv.Value.Tolls <= 0)))
                .Select(kv => kv.Key).ToList();
            foreach (var k in empty) g.Containers.Remove(k);
            return empty.Count;
        }
    }
}
