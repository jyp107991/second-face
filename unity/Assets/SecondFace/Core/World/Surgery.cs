using System;
using System.Collections.Generic;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Core.Stats;

namespace SecondFace.Core.World
{
    /// <summary>One piece a surgeon could fit into the player today: theirs to buy and fit, or a boxed piece from the
    /// player's pack; its price, the fee, the risk for this patient, the hours on the table, the piece it would replace.</summary>
    public sealed class SurgeryOffer
    {
        public ChromeDef Def;
        /// <summary>"stock" (the surgeon's own, bought and fitted) or "pack" (a boxed piece the player brought).</summary>
        public string Source;
        /// <summary>The boxed piece's place in the pack (source "pack").</summary>
        public int PackIndex = -1;
        public int Price, Fee, Total;
        public double Risk;
        public double Hours;
        /// <summary>The piece in that slot now, if any (it comes out and is boxed).</summary>
        public ChromeDef Replaces;
    }

    /// <summary>What an operation came to: its outcome (clean, complication, rejected, or cannot_pay), the hours it took,
    /// the Tolls it cost and what it took out (the screen says it in words).</summary>
    public sealed class SurgeryResult
    {
        public string Outcome;
        public double Hours;
        public int Paid;
        /// <summary>The piece that came out of the slot and went into a box (null when none).</summary>
        public ChromeDef Boxed;
    }

    /// <summary>A repair or a removal: done or not (short of Tolls, nothing there), what it cost, the piece.</summary>
    public sealed class TableWork
    {
        public bool Ok;
        /// <summary>Why not: "nothing" (no piece in the slot) or "cannot_pay".</summary>
        public string Reason;
        public int Fee;
        public ChromeDef Def;
        public double Hours;
    }

    /// <summary>
    /// A surgeon's table (port of world/surgery.ts; the screen is Game <c>SurgeryScreen</c>): what this surgeon offers this
    /// patient (their stock, each sold once a game, and the boxed pieces the player carries), the fee and the risk, and
    /// the operation itself: pay, roll (Core <see cref="Chrome.Install"/>), fit or fail, box the old piece. A rejected
    /// piece costs the fee: a bought one is refunded, a brought one goes back in its box. Repairs and removals at a fee.
    /// Pure but for the state it is handed; the roll comes from the game's <see cref="Rng"/>.
    /// </summary>
    public static class Surgery
    {
        /// <summary>A repair takes an hour on the table, a removal two (the time passes in the caller).</summary>
        public const double RepairHours = 1, RemoveHours = 2;

        public static int SurgeonMedicine(NpcDef npc) => npc?.Skills != null && npc.Skills.TryGetValue("medicine", out var m) ? m : 30;

        private static double BaseFee(NpcDef npc) => npc?.Surgeon?.Fee ?? 40;

        /// <summary>Base fee plus the piece's difficulty.</summary>
        public static int FitFee(NpcDef npc, ChromeDef def) => Num.RoundInt(BaseFee(npc) + def.Surgery.Difficulty);
        public static int RepairFee(NpcDef npc, double condition) => Num.RoundInt(BaseFee(npc) * 0.5 + (1 - condition) * 80);
        public static int RemoveFee(NpcDef npc) => Num.RoundInt(BaseFee(npc) * 0.75);

        /// <summary>The flag that remembers a stock piece was sold (each once a game).</summary>
        public static string SoldFlag(string npcId, string chromeId) => $"surgery_sold_{npcId}_{chromeId}";

        public static int Grit(GameState g) => Sheet.Attr(g.Pc.Sheet, "grit");

        /// <summary>Everything this surgeon could fit into the player today, their stock first.</summary>
        public static List<SurgeryOffer> Offers(GameState g, string npcId, NpcDef npc)
        {
            var sheet = g.Pc.Sheet;
            var med = SurgeonMedicine(npc);
            var grit = Grit(g);
            SurgeryOffer Offer(ChromeDef def, string source, int packIndex)
            {
                var fee = FitFee(npc, def);
                var price = source == "stock" ? def.Price : 0;
                ChromeDef replaces = null;
                if (sheet.Chrome != null && sheet.Chrome.TryGetValue(def.Slot, out var cur) && cur != null) replaces = Chrome.Def(cur.Id);
                return new SurgeryOffer
                {
                    Def = def, Source = source, PackIndex = packIndex, Price = price, Fee = fee, Total = price + fee,
                    Risk = Chrome.SurgeryRisk(def, med, grit), Hours = def.Surgery.Hours, Replaces = replaces,
                };
            }
            var list = new List<SurgeryOffer>();
            foreach (var id in npc?.Surgeon?.Stock ?? new List<string>())
            {
                var def = Chrome.Def(id);
                if (def != null && !g.Flags.ContainsKey(SoldFlag(npcId, id))) list.Add(Offer(def, "stock", -1));
            }
            var items = g.Pc.Inventory.Items;
            for (var i = 0; i < items.Count; i++)
            {
                if (!Items.Has(items[i].Def)) continue;
                var chromeId = Items.Def(items[i].Def).Chrome;
                var def = string.IsNullOrEmpty(chromeId) ? null : Chrome.Def(chromeId);
                if (def != null) list.Add(Offer(def, "pack", i));
            }
            return list;
        }

        /// <summary>A piece back into the pack in its box (every catalogue piece has one: <c>ci_&lt;id&gt;</c>); false when
        /// it has no boxed form (the piece is lost).</summary>
        public static bool Box(Inventory.Inventory inv, string chromeId)
        {
            var boxed = "ci_" + chromeId;
            if (!Items.Has(boxed)) return false;
            Inv.AddItem(inv, Inv.MakeItem(boxed, 1));
            return true;
        }

        /// <summary>The operation: the total paid, the piece taken from the pack if brought, the dice rolled
        /// (<paramref name="roll"/> in 0..1, from the game's Rng). Rejected: the fee is spent, the piece is not. Fitted: a
        /// stock piece is sold for good, the slot's old piece comes out in its box. The hours pass in the caller.</summary>
        public static SurgeryResult Perform(GameState g, string npcId, NpcDef npc, SurgeryOffer o, int day, double roll)
        {
            var inv = g.Pc.Inventory;
            var sheet = g.Pc.Sheet;
            if (inv.Tolls < o.Total) return new SurgeryResult { Outcome = "cannot_pay" };
            inv.Tolls -= o.Total;
            if (o.Source == "pack" && o.PackIndex >= 0 && o.PackIndex < inv.Items.Count)
            {
                var it = inv.Items[o.PackIndex];
                if (it.Qty > 1) it.Qty--; else inv.Items.RemoveAt(o.PackIndex);
            }
            InstalledChrome old = null;
            if (sheet.Chrome != null && sheet.Chrome.TryGetValue(o.Def.Slot, out var cur)) old = cur;
            var outcome = Chrome.Install(sheet, o.Def.Id, day, SurgeonMedicine(npc), Grit(g), roll);
            var r = new SurgeryResult { Outcome = outcome, Hours = o.Hours, Paid = o.Total };
            if (outcome == "rejected")
            {
                // the body will not have it: a bought piece is refunded, a brought one boxed again
                if (o.Source == "stock") { inv.Tolls += o.Price; r.Paid -= o.Price; }
                else Box(inv, o.Def.Id);
                return r;
            }
            if (o.Source == "stock") g.SetFlag(SoldFlag(npcId, o.Def.Id), true);
            if (old != null && old.Id != o.Def.Id && Box(inv, old.Id)) r.Boxed = Chrome.Def(old.Id);
            return r;
        }

        /// <summary>Sees to a worn piece (back to whole) for the repair fee.</summary>
        public static TableWork Repair(GameState g, NpcDef npc, string slot)
        {
            var sheet = g.Pc.Sheet;
            if (sheet.Chrome == null || !sheet.Chrome.TryGetValue(slot, out var p) || p == null) return new TableWork { Reason = "nothing" };
            var fee = RepairFee(npc, p.Condition);
            var w = new TableWork { Fee = fee, Def = Chrome.Def(p.Id) };
            if (g.Pc.Inventory.Tolls < fee) { w.Reason = "cannot_pay"; return w; }
            g.Pc.Inventory.Tolls -= fee;
            Chrome.Repair(sheet, slot, 1);
            w.Ok = true;
            w.Hours = RepairHours;
            return w;
        }

        /// <summary>Takes a piece out (boxed into the pack) for the removal fee.</summary>
        public static TableWork Remove(GameState g, NpcDef npc, string slot)
        {
            var sheet = g.Pc.Sheet;
            if (sheet.Chrome == null || !sheet.Chrome.TryGetValue(slot, out var p) || p == null) return new TableWork { Reason = "nothing" };
            var fee = RemoveFee(npc);
            var w = new TableWork { Fee = fee, Def = Chrome.Def(p.Id) };
            if (g.Pc.Inventory.Tolls < fee) { w.Reason = "cannot_pay"; return w; }
            g.Pc.Inventory.Tolls -= fee;
            var outPiece = Chrome.Remove(sheet, slot);
            if (outPiece != null) Box(g.Pc.Inventory, outPiece.Id);
            w.Ok = true;
            w.Hours = RemoveHours;
            return w;
        }

        /// <summary>What a piece gives, as (target, amount) lines for the screen: its modifiers (an add or a multiplier)
        /// and its abilities (an ability's id with no amount).</summary>
        public static List<(string What, string Amount)> Gives(ChromeDef def)
        {
            var list = new List<(string, string)>();
            foreach (var m in def.Mods ?? new List<Modifier>())
            {
                var target = m.Target ?? "";
                var colon = target.IndexOf(':');
                if (colon >= 0) target = target.Substring(colon + 1);
                target = target.Replace('_', ' ');
                if (m.Add is double add) list.Add((target, (add > 0 ? "+" : "") + add.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)));
                else if (m.Mul is double mul) list.Add((target, "×" + mul.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)));
            }
            foreach (var a in def.Abilities ?? new List<string>())
                list.Add(((a.StartsWith("chrome_") ? a.Substring(7) : a).Replace('_', ' '), null));
            return list;
        }
    }
}
