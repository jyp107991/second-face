using System;
using System.Collections.Generic;
using System.Linq;

namespace SecondFace.Core.Inventory
{
    public sealed class SoldRecord { public double N; public int Day; }

    public sealed class MerchantState
    {
        public Inventory Inv = new();
        public int Cash;
        /// <summary>Day of the last restock.</summary>
        public int RestockDay;
        /// <summary>Recent sales to this merchant by item id (decays over days).</summary>
        public Dictionary<string, SoldRecord> Sold = new();
    }

    public struct PriceContext
    {
        /// <summary>Effective Barter skill 0..100.</summary>
        public double Barter;
        /// <summary>Local standing -100..100.</summary>
        public double Standing;
        /// <summary>Faction price multiplier (1 = none).</summary>
        public double FactionMul;
        public double Markup;
    }

    public struct DealLine { public int Index; public int Qty; public DealLine(int index, int qty) { Index = index; Qty = qty; } }
    public sealed class Deal { public List<DealLine> Buy = new(); public List<DealLine> Sell = new(); }
    public struct DealTotals { public int Cost; public int Paid; /// <summary>Positive: the player pays. Negative: the merchant pays.</summary>
        public int Net; }
    public struct DealResult { public bool Ok; public string Reason; }

    /// <summary>Barter rules (port of inventory/barter.ts): prices from Barter skill, standing and faction; finite cash; restocks; saturation.</summary>
    public static class Barter
    {
        /// <summary>Create the merchant's state on first visit; refill stock and cash when a restock is due.</summary>
        public static MerchantState State(Dictionary<string, MerchantState> store, string id, MerchantDef def, int day)
        {
            if (!store.TryGetValue(id, out var ms))
            {
                ms = store[id] = new MerchantState { Cash = def.Cash, RestockDay = day };
                foreach (var (item, n) in def.Stock) Inv.AddItem(ms.Inv, Inv.MakeItem(item, n));
                return ms;
            }
            if (day - ms.RestockDay >= def.RestockDays)
            {
                ms.RestockDay = day;
                ms.Cash = Math.Max(ms.Cash, def.Cash);
                foreach (var (item, n) in def.Stock)
                {
                    int have = ms.Inv.Items.Where(i => i.Def == item).Sum(i => i.Qty);
                    if (have < n) Inv.AddItem(ms.Inv, Inv.MakeItem(item, n - have));
                }
            }
            return ms;
        }

        /// <summary>What the player pays for one unit. Barter and standing shave up to 25% and 20%; never below value × 1.05.</summary>
        public static int BuyPrice(int value, PriceContext c)
        {
            double p = value * c.Markup * Math.Max(0.75, 1 - c.Barter / 400) * Math.Max(0.8, 1 - c.Standing / 500) * c.FactionMul;
            return Math.Max((int)Math.Ceiling(value * 1.05), Num.RoundInt(p));
        }

        /// <summary>How much of one thing the merchant has taken lately (halves every 3 days).</summary>
        public static double Saturation(MerchantState ms, string item, int day)
        {
            return ms.Sold.TryGetValue(item, out var s) ? s.N * Math.Pow(0.5, (day - s.Day) / 3.0) : 0;
        }

        /// <summary>What the merchant pays for one unit: 20–60% of value by Barter and standing, less when saturated.</summary>
        public static int SellPrice(int value, PriceContext c, double sat = 0)
        {
            double frac = Math.Max(0.1, Math.Min(0.6, 0.2 + c.Barter / 400 + c.Standing / 500));
            return value > 0 ? Math.Max(1, Num.RoundInt(value * frac / (1 + 0.2 * sat))) : 0;
        }

        private static int UnitValue(ItemInst it) { var one = it.Clone(); one.Qty = 1; return Inv.ItemValue(one); }

        public static bool MerchantBuys(MerchantDef def, string item) => def.BuysAll || def.Buys.Contains(Items.Def(item).Category);

        public static DealTotals Totals(Inventory player, MerchantState ms, Deal deal, PriceContext c, int day)
        {
            int cost = 0, paid = 0;
            foreach (var b in deal.Buy) { if (b.Index >= 0 && b.Index < ms.Inv.Items.Count) cost += BuyPrice(UnitValue(ms.Inv.Items[b.Index]), c) * b.Qty; }
            var sat = new Dictionary<string, double>();
            foreach (var s in deal.Sell)
            {
                if (s.Index < 0 || s.Index >= player.Items.Count) continue;
                var it = player.Items[s.Index];
                for (int k = 0; k < s.Qty; k++)
                {
                    double cur = Saturation(ms, it.Def, day) + (sat.TryGetValue(it.Def, out var v) ? v : 0);
                    paid += SellPrice(UnitValue(it), c, cur);
                    sat[it.Def] = (sat.TryGetValue(it.Def, out var v2) ? v2 : 0) + 1;
                }
            }
            return new DealTotals { Cost = cost, Paid = paid, Net = cost - paid };
        }

        /// <summary>Carry out a deal if both sides can pay. Items move, cash moves, saturation is recorded.</summary>
        public static DealResult Execute(Inventory player, MerchantState ms, MerchantDef def, Deal deal, PriceContext c, int day)
        {
            foreach (var s in deal.Sell)
            {
                if (s.Index < 0 || s.Index >= player.Items.Count) return new DealResult { Ok = false, Reason = "That item is gone." };
                var it = player.Items[s.Index];
                if (!MerchantBuys(def, it.Def)) return new DealResult { Ok = false, Reason = $"They don't deal in {Items.Def(it.Def).Category}." };
            }
            var t = Totals(player, ms, deal, c, day);
            if (t.Net > 0 && player.Tolls < t.Net) return new DealResult { Ok = false, Reason = $"You are {t.Net - player.Tolls} Tolls short." };
            if (t.Net < 0 && ms.Cash < -t.Net) return new DealResult { Ok = false, Reason = $"They only have {ms.Cash} Tolls on hand." };
            var bought = new List<ItemInst>();
            foreach (var b in deal.Buy.OrderByDescending(x => x.Index)) { var it = Inv.TakeAt(ms.Inv, b.Index, b.Qty); if (it != null) bought.Add(it); }
            var soldItems = new List<ItemInst>();
            foreach (var s in deal.Sell.OrderByDescending(x => x.Index)) { var it = Inv.TakeAt(player, s.Index, s.Qty); if (it != null) soldItems.Add(it); }
            foreach (var it in bought) Inv.AddItem(player, it);
            foreach (var it in soldItems)
            {
                Inv.AddItem(ms.Inv, it);
                ms.Sold[it.Def] = new SoldRecord { N = Saturation(ms, it.Def, day) + it.Qty, Day = day };
            }
            player.Tolls -= t.Net;
            ms.Cash += t.Net;
            return new DealResult { Ok = true };
        }
    }
}
