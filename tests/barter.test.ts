import { describe, expect, it } from 'vitest';
import '../src/content';
import { buyPrice, dealTotals, executeDeal, merchantState, saturation, sellPrice, type MerchantDef, type PriceContext } from '../src/engine/inventory/barter';
import { addItem, emptyInventory, makeItem } from '../src/engine/inventory/inventory';
import { scheduleAt } from '../src/engine/npc/schedule';

const def: MerchantDef = { buys: ['junk', 'weapon'], cash: 100, restockDays: 3, stock: [['c_water', 4], ['w_machete', 1]] };
const ctx = (barter = 0, standing = 0): PriceContext => ({ barter, standing, factionMul: 1, markup: 1.5 });

describe('barter', () => {
  it('prices move with skill and standing, within bounds', () => {
    expect(buyPrice(100, ctx())).toBe(150);
    expect(buyPrice(100, ctx(100))).toBeLessThan(150);
    expect(buyPrice(100, ctx(100, 100))).toBeGreaterThanOrEqual(105);
    expect(sellPrice(100, ctx())).toBe(20);
    expect(sellPrice(100, ctx(100, 100))).toBe(60);
    expect(sellPrice(100, ctx(), 5)).toBeLessThan(sellPrice(100, ctx(), 0));
  });

  it('merchants restock on schedule and remember what you sold them', () => {
    const store = {};
    const ms = merchantState(store, 'm', def, 1);
    expect(ms.inv.items.length).toBe(2);
    const player = emptyInventory();
    player.tolls = 0;
    addItem(player, makeItem('j_scrap', 12));
    const t = dealTotals(player, ms, { buy: [], sell: [{ index: 0, qty: 12 }] }, ctx(), 1);
    expect(t.net).toBeLessThan(0);
    expect(executeDeal(player, ms, def, { buy: [], sell: [{ index: 0, qty: 12 }] }, ctx(), 1).ok).toBe(true);
    expect(player.tolls).toBe(-t.net);
    expect(saturation(ms, 'j_scrap', 1)).toBe(12);
    expect(saturation(ms, 'j_scrap', 7)).toBeCloseTo(3);
    // Buying water back: can't afford a machete on scrap money; can afford water.
    const buyM = executeDeal(player, ms, def, { buy: [{ index: 1, qty: 1 }], sell: [] }, ctx(), 1);
    expect(buyM.ok).toBe(false);
    expect(executeDeal(player, ms, def, { buy: [{ index: 0, qty: 1 }], sell: [] }, ctx(), 1).ok).toBe(true);
    // Restock after 3 days refills water and cash.
    ms.cash = 5;
    merchantState(store, 'm', def, 4);
    expect(ms.cash).toBe(100);
    expect(ms.inv.items.find((i) => i.def === 'c_water')!.qty).toBe(4);
  });

  it('refuses categories the merchant does not deal in and deals it cannot afford', () => {
    const store = {};
    const ms = merchantState(store, 'm', def, 1);
    const player = emptyInventory();
    addItem(player, makeItem('c_bandage', 1));
    expect(executeDeal(player, ms, def, { buy: [], sell: [{ index: 0, qty: 1 }] }, ctx(), 1).ok).toBe(false);
    ms.cash = 0;
    player.items = [makeItem('w_machete', 1)];
    expect(executeDeal(player, ms, def, { buy: [], sell: [{ index: 0, qty: 1 }] }, ctx(), 1).reason).toMatch(/on hand/);
  });
});

describe('schedules', () => {
  it('finds the entry in force, wrapping midnight', () => {
    const sched = [{ from: 22, to: 6, activity: 'sleep' as const, spot: 'bed' }, { from: 6, to: 22, activity: 'work' as const, spot: 'bar' }];
    expect(scheduleAt(sched, 23)!.activity).toBe('sleep');
    expect(scheduleAt(sched, 3)!.activity).toBe('sleep');
    expect(scheduleAt(sched, 12)!.activity).toBe('work');
    expect(scheduleAt(undefined, 12)).toBeUndefined();
  });
});
