import type { Inventory, ItemInst } from './inventory';
import { addItem, emptyInventory, itemValue, makeItem, takeAt } from './inventory';
import { itemDef, type ItemCategory } from './items';

/**
 * Barter (DESIGN §5): prices from Barter skill, local standing and faction membership; merchants buy only
 * some categories, hold finite cash, restock on a schedule, and pay less the more of one thing you have
 * sold them lately (saturation). Pure rules; the Barter screen in ui/barter.ts drives them.
 */

export interface MerchantDef {
  /** Categories this merchant buys ('all' for general stores). */
  buys: ItemCategory[] | 'all';
  cash: number;
  restockDays: number;
  stock: [string, number][];
  /** Multiplier on value when selling to the player (default 1.5). */
  markup?: number;
  /** Faction whose membership discounts apply. */
  faction?: string;
}

export interface MerchantState {
  inv: Inventory;
  cash: number;
  /** Day of the last restock. */
  restockDay: number;
  /** Recent sales to this merchant by item id (decays over days). */
  sold: Record<string, { n: number; day: number }>;
}

export interface PriceContext {
  /** Effective Barter skill 0..100. */
  barter: number;
  /** Local standing -100..100. */
  standing: number;
  /** Faction price multiplier (1 = none). */
  factionMul: number;
  markup: number;
}

/** Create the merchant's state on first visit; refill stock and cash when a restock is due. */
export function merchantState(store: Record<string, MerchantState>, id: string, def: MerchantDef, day: number): MerchantState {
  let ms = store[id];
  if (!ms) {
    ms = store[id] = { inv: emptyInventory(), cash: def.cash, restockDay: day, sold: {} };
    for (const [item, n] of def.stock) addItem(ms.inv, makeItem(item, n));
    return ms;
  }
  if (day - ms.restockDay >= def.restockDays) {
    ms.restockDay = day;
    ms.cash = Math.max(ms.cash, def.cash);
    for (const [item, n] of def.stock) {
      const have = ms.inv.items.filter((i) => i.def === item).reduce((t, i) => t + i.qty, 0);
      if (have < n) addItem(ms.inv, makeItem(item, n - have));
    }
  }
  return ms;
}

/** What the player pays for one unit. Barter and standing shave up to 25% and 20%; never below value × 1.05. */
export function buyPrice(value: number, c: PriceContext): number {
  const p = value * c.markup * Math.max(0.75, 1 - c.barter / 400) * Math.max(0.8, 1 - c.standing / 500) * c.factionMul;
  return Math.max(Math.ceil(value * 1.05), Math.round(p));
}

/** How much of one thing the merchant has taken lately (halves every 3 days). */
export function saturation(ms: MerchantState, item: string, day: number): number {
  const s = ms.sold[item];
  return s ? s.n * Math.pow(0.5, (day - s.day) / 3) : 0;
}

/** What the merchant pays for one unit: 20–60% of value by Barter and standing, less when saturated. */
export function sellPrice(value: number, c: PriceContext, sat = 0): number {
  const frac = Math.max(0.1, Math.min(0.6, 0.2 + c.barter / 400 + c.standing / 500));
  return value > 0 ? Math.max(1, Math.round((value * frac) / (1 + 0.2 * sat))) : 0;
}

/** Value of one unit of a stack (itemValue counts the whole stack). */
const unitValue = (it: ItemInst) => itemValue({ ...it, qty: 1 });

export function merchantBuys(def: MerchantDef, item: string): boolean {
  return def.buys === 'all' || def.buys.includes(itemDef(item).category);
}

export interface Deal {
  /** From the merchant's stock: item index + quantity. */
  buy: { index: number; qty: number }[];
  /** From the player's pack. */
  sell: { index: number; qty: number }[];
}

export interface DealTotals { cost: number; paid: number; /** Positive: the player pays. Negative: the merchant pays. */ net: number }

export function dealTotals(player: Inventory, ms: MerchantState, deal: Deal, c: PriceContext, day: number): DealTotals {
  let cost = 0, paid = 0;
  for (const b of deal.buy) { const it = ms.inv.items[b.index]; if (it) cost += buyPrice(unitValue(it), c) * b.qty; }
  const sat: Record<string, number> = {};
  for (const s of deal.sell) {
    const it = player.items[s.index];
    if (!it) continue;
    // Each unit sold in this deal saturates the next.
    for (let k = 0; k < s.qty; k++) {
      const cur = saturation(ms, it.def, day) + (sat[it.def] ?? 0);
      paid += sellPrice(unitValue(it), c, cur);
      sat[it.def] = (sat[it.def] ?? 0) + 1;
    }
  }
  return { cost, paid, net: cost - paid };
}

/** Carry out a deal if both sides can pay. Items move, cash moves, saturation is recorded. */
export function executeDeal(player: Inventory, ms: MerchantState, def: MerchantDef, deal: Deal, c: PriceContext, day: number): { ok: boolean; reason?: string } {
  for (const s of deal.sell) {
    const it = player.items[s.index];
    if (!it) return { ok: false, reason: 'That item is gone.' };
    if (!merchantBuys(def, it.def)) return { ok: false, reason: `They don't deal in ${itemDef(it.def).category}.` };
  }
  const t = dealTotals(player, ms, deal, c, day);
  if (t.net > 0 && player.tolls < t.net) return { ok: false, reason: `You are ${t.net - player.tolls} Tolls short.` };
  if (t.net < 0 && ms.cash < -t.net) return { ok: false, reason: `They only have ${ms.cash} Tolls on hand.` };
  // Take items out by descending index so indices stay valid.
  const bought: ItemInst[] = [];
  for (const b of [...deal.buy].sort((x, y) => y.index - x.index)) { const it = takeAt(ms.inv, b.index, b.qty); if (it) bought.push(it); }
  const soldItems: ItemInst[] = [];
  for (const s of [...deal.sell].sort((x, y) => y.index - x.index)) { const it = takeAt(player, s.index, s.qty); if (it) soldItems.push(it); }
  for (const it of bought) addItem(player, it);
  for (const it of soldItems) {
    addItem(ms.inv, it);
    const rec = ms.sold[it.def];
    ms.sold[it.def] = { n: saturation(ms, it.def, day) + it.qty, day };
    void rec;
  }
  player.tolls -= t.net;
  ms.cash += t.net;
  return { ok: true };
}
