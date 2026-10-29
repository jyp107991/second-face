using System;
using System.Globalization;
using SecondFace.Core.Inventory;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The pieces the pack and the barter table share (P5.3h): an item's cell (its drawing, how many, a condition line
    /// under it), and an item's figures in words (<see cref="StatLine"/> to a label, a value and a change).
    /// </summary>
    public static class ItemCells
    {
        /// <summary>A cell for an item: its drawing, the count when more than one, the condition as a line along the foot.</summary>
        public static Button Make(ItemInst it, Action tapped, string name)
        {
            var d = Items.Def(it.Def);
            var cell = new Button(tapped) { name = name, tooltip = d.Name };
            cell.AddToClassList("sf-cell");
            cell.Add(new ItemGlyph(ItemArt.KeyOf(d)) { name = "glyph" });
            if (it.Qty > 1)
            {
                var q = new Label(Strings.Get("pack.qty", it.Qty)) { pickingMode = PickingMode.Ignore };
                q.AddToClassList("sf-cell__qty");
                cell.Add(q);
            }
            if (it.Cond != null)
            {
                var bar = new VisualElement { pickingMode = PickingMode.Ignore };
                bar.AddToClassList("sf-cell__cond");
                var fill = new VisualElement { pickingMode = PickingMode.Ignore };
                fill.AddToClassList("sf-cell__cond-fill");
                var c = (float)it.Cond.Value;
                fill.style.width = Length.Percent(Math.Max(4f, c * 100f));
                fill.EnableInClassList("sf-cell__cond-fill--worn", c < 0.5f);
                fill.EnableInClassList("sf-cell__cond-fill--failing", c < 0.2f);
                bar.Add(fill);
                cell.Add(bar);
            }
            return cell;
        }

        /// <summary>An empty cell (a slot with nothing in it).</summary>
        public static Button Empty(Action tapped, string name)
        {
            var cell = new Button(tapped) { name = name };
            cell.AddToClassList("sf-cell");
            cell.AddToClassList("sf-cell--empty");
            return cell;
        }

        /// <summary>A sum of Tolls in words ("1 Toll", "12 Tolls").</summary>
        public static string Tolls(int n) => Strings.Get(n == 1 ? "stat.toll" : "stat.tolls", n);

        private static string N(double v) => Math.Abs(v - Math.Round(v)) < 1e-6 ? Math.Round(v).ToString(CultureInfo.InvariantCulture) : v.ToString("0.#", CultureInfo.InvariantCulture);

        /// <summary>A figure's value as the card writes it.</summary>
        public static string Value(StatLine s) => s.Key switch
        {
            "damage" => s.Kind != null ? $"{N(s.Value)}–{N(s.To ?? s.Value)} {Strings.Get("dmg." + s.Kind)}" : $"{N(s.Value)}–{N(s.To ?? s.Value)}",
            "magazine" => s.Kind != null ? $"{N(s.Value)} · {s.Kind}" : N(s.Value),
            "dr" or "condition" or "habit" => Strings.Get("stat.pct", N(s.Value)),
            "dmg_mult" => "×" + N(s.Value),
            "heal" => "+" + N(s.Value),
            "rads" => s.Value > 0 ? "+" + N(s.Value) : N(s.Value),
            "stealth" => "−" + N(s.Value),
            "effect" => s.Value > 0 ? $"{s.Kind} · {Strings.Get("stat.min", N(s.Value))}" : s.Kind,
            "mend" => "✓",
            "weight" => Strings.Get("stat.kg", N(s.Value)),
            "value" => Tolls((int)Math.Round(s.Value)),
            _ => N(s.Value),
        };

        /// <summary>A figure's change against the compared piece ("" when none).</summary>
        public static string Delta(StatLine s)
        {
            if (s.Delta == null || Math.Abs(s.Delta.Value) < 1e-6) return "";
            var d = s.Delta.Value;
            var mark = s.Better == true ? "▲" : "▼";
            return $"{mark} {(d > 0 ? "+" : "−")}{N(Math.Abs(d))}";
        }

        /// <summary>A row of the card: label, value, change (coloured by whether it helps).</summary>
        public static VisualElement Row(StatLine s)
        {
            var row = new VisualElement { name = "stat-" + s.Key };
            row.AddToClassList("sf-stat");
            var label = new Label(Strings.Get("stat." + s.Key));
            label.AddToClassList("sf-stat__label");
            row.Add(label);
            var value = new Label(Value(s));
            value.AddToClassList("sf-stat__value");
            row.Add(value);
            var delta = new Label(Delta(s)) { name = "delta" };
            delta.AddToClassList("sf-stat__delta");
            delta.EnableInClassList("sf-stat__delta--better", s.Better == true);
            delta.EnableInClassList("sf-stat__delta--worse", s.Better == false);
            row.Add(delta);
            return row;
        }
    }
}
