using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.Inventory
{
    /// <summary>One figure on an item's card: a number (or a range, <see cref="To"/>), what it would change against the
    /// piece worn or carried in its place (<see cref="Delta"/>), and whether more is better. The words are the screen's.</summary>
    public sealed class StatLine
    {
        public string Key;
        public double Value;
        /// <summary>The top of a range (damage).</summary>
        public double? To;
        /// <summary>The kind for a figure with one (damage type, ammo).</summary>
        public string Kind;
        /// <summary>Against the compared piece: this one's figure less its (a range compares its middle).</summary>
        public double? Delta;
        public bool LowerIsBetter;
        /// <summary>The change helps (null: no change, or nothing to compare).</summary>
        public bool? Better => Delta == null || Math.Abs(Delta.Value) < 1e-6 ? null : (Delta.Value > 0) != LowerIsBetter;
    }

    /// <summary>
    /// The pack's view of an inventory (P5.3h): the sections the screen offers, the items in each in a steady order, the
    /// piece an item would replace when equipped, and an item's figures compared with that piece.
    /// </summary>
    public static class Pack
    {
        public static readonly string[] Filters = { "all", "weapons", "wear", "aid", "papers", "other" };
        private static readonly string[] Order = { "weapon", "armor", "ammo", "consumable", "tool", "misc", "junk", "note", "key" };

        /// <summary>The section an item category belongs to.</summary>
        public static string FilterOf(string category) => category switch
        {
            "weapon" or "ammo" => "weapons",
            "armor" => "wear",
            "consumable" => "aid",
            "note" or "key" => "papers",
            _ => "other",
        };

        /// <summary>Indices into the pack's items in a section: by category (weapons first), then name, then the better kept.</summary>
        public static List<int> Listed(Inventory inv, string filter)
        {
            var l = new List<int>();
            for (var i = 0; i < inv.Items.Count; i++)
            {
                var d = Items.Def(inv.Items[i].Def);
                if (filter == "all" || FilterOf(d.Category) == filter) l.Add(i);
            }
            int Rank(string c) { var r = Array.IndexOf(Order, c); return r < 0 ? Order.Length : r; }
            return l.OrderBy(i => Rank(Items.Def(inv.Items[i].Def).Category))
                .ThenBy(i => Items.Def(inv.Items[i].Def).Name, StringComparer.Ordinal)
                .ThenByDescending(i => inv.Items[i].Cond ?? 1)
                .ThenBy(i => i).ToList();
        }

        /// <summary>The equipped piece this item would be weighed against: the weapon in hand (or the other hand's), the
        /// armour in its slot; null for anything else or when nothing is there.</summary>
        public static ItemInst Against(Inventory inv, ItemInst it)
        {
            var d = Items.Def(it.Def);
            if (d.Weapon != null) return inv.EquippedAt(inv.Active) ?? inv.EquippedAt(inv.Active == "primary" ? "secondary" : "primary");
            if (d.Armor != null) return inv.EquippedAt(d.Armor.Slot);
            return null;
        }

        /// <summary>An item's figures, each with its change against <paramref name="against"/> when given.</summary>
        public static List<StatLine> Stats(ItemInst it, ItemInst against = null)
        {
            var d = Items.Def(it.Def);
            var a = against != null ? Items.Def(against.Def) : null;
            var l = new List<StatLine>();
            void Add(string key, double v, double? other, bool lower = false, double? to = null, string kind = null, double? otherTo = null)
            {
                double Mid(double x, double? y) => y == null ? x : (x + y.Value) / 2;
                l.Add(new StatLine
                {
                    Key = key, Value = v, To = to, Kind = kind, LowerIsBetter = lower,
                    Delta = other == null ? null : Mid(v, to) - Mid(other.Value, otherTo),
                });
            }
            if (d.Weapon != null)
            {
                var w = d.Weapon;
                var o = a?.Weapon;
                Add("damage", w.Dmg[0], o?.Dmg[0], to: w.Dmg[1], kind: w.DmgType, otherTo: o?.Dmg[1]);
                Add("ap", w.Ap, o?.Ap, lower: true);
                Add("range", w.Range, o?.Range);
                if (w.Magazine != null) Add("magazine", w.Magazine.Value, o?.Magazine, kind: w.Ammo);
                if (w.MinBrawn != null) Add("brawn", w.MinBrawn.Value, o != null ? o.MinBrawn ?? 0 : null, lower: true);
            }
            if (d.Armor != null)
            {
                var r = d.Armor;
                var o = a?.Armor;
                Add("dt", r.Dt, o?.Dt);
                Add("dr", r.Dr, o?.Dr);
                if ((r.RadResist ?? 0) != 0 || (o?.RadResist ?? 0) != 0) Add("rad", r.RadResist ?? 0, o != null ? o.RadResist ?? 0 : null);
                if ((r.Stealth ?? 0) != 0 || (o?.Stealth ?? 0) != 0) Add("stealth", r.Stealth ?? 0, o != null ? o.Stealth ?? 0 : null, lower: true);
            }
            if (d.Ammo != null)
            {
                Add("dmg_mult", d.Ammo.DmgMult, null, kind: d.Ammo.Type);
                if (d.Ammo.DtPen != 0) Add("dt_pen", d.Ammo.DtPen, null);
            }
            if (d.Consumable != null)
                foreach (var e in d.Consumable.Effects)
                {
                    if (e.Kind == "heal" && e.Amount != null) Add("heal", e.Amount.Value, null);
                    else if (e.Kind == "rads" && e.Amount != null) Add("rads", e.Amount.Value, null, lower: true);
                    else if (e.Kind == "effect") Add("effect", e.Minutes ?? 0, null, kind: e.Name);
                    else if (e.Kind == "cureCripple") Add("mend", 1, null);
                    else if (e.Kind == "addiction" && e.Chance != null) Add("habit", Math.Round(e.Chance.Value * 100), null, lower: true);
                }
            if (it.Cond != null) Add("condition", Math.Round(it.Cond.Value * 100), against?.Cond != null ? Math.Round(against.Cond.Value * 100) : null);
            Add("weight", d.Weight, a?.Weight, lower: true);
            Add("value", Inv.ItemValue(One(it)), against != null ? Inv.ItemValue(One(against)) : null);
            return l;
        }

        private static ItemInst One(ItemInst it) { var c = it.Clone(); c.Qty = 1; return c; }
    }
}
