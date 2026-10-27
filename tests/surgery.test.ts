import { describe, expect, it } from 'vitest';
import '../src/content';
import { NPCS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { addItem, makeItem } from '../src/engine/inventory/inventory';
import { performRemoval, performRepair, performSurgery, surgeryOffers } from '../src/engine/world/surgery';

describe('the surgeon\'s table', () => {
  const mender = NPCS.npc_sh_08;
  it('offers the surgeon\'s pieces and boxed pieces from the pack, priced and risked for this patient', () => {
    const g = newGameState('c9', 0, 0);
    addItem(g.pc.inventory, makeItem('ci_ch_legs_spring', 1));
    const offers = surgeryOffers(g, mender.id, mender);
    expect(offers.map((o) => `${o.def.id}/${o.source}`)).toEqual(['ch_arm_steady/stock', 'ch_eye_heat/stock', 'ch_legs_spring/pack']);
    const hand = offers[0];
    expect(hand.price).toBeGreaterThan(0);
    expect(hand.total).toBe(hand.price + hand.fee);
    expect(hand.risk).toBeGreaterThan(0.03);
    expect(hand.risk).toBeLessThan(0.65);
    expect(offers[2].price).toBe(0);
  });

  it('fits a piece on a good roll, boxes the old one, and sells a stock piece only once', () => {
    const g = newGameState('c9', 0, 0);
    g.pc.inventory.tolls = 5000;
    const hand = surgeryOffers(g, mender.id, mender)[0];
    const r = performSurgery(g, mender.id, mender, hand, 3, 0.99);
    expect(r.outcome).toBe('clean');
    expect(g.pc.sheet.chrome?.armL?.id).toBe('ch_arm_steady');
    expect(g.pc.inventory.tolls).toBe(5000 - hand.total);
    expect(surgeryOffers(g, mender.id, mender).some((o) => o.def.id === 'ch_arm_steady')).toBe(false);
    // Bring another left-arm piece: the Gyro Hand comes out and is boxed.
    addItem(g.pc.inventory, makeItem('ci_ch_arm_breaker', 1));
    const breaker = surgeryOffers(g, mender.id, mender).find((o) => o.def.id === 'ch_arm_breaker')!;
    expect(breaker.replaces?.id).toBeUndefined();   // a right-arm piece: nothing to replace there
    const r2 = performSurgery(g, mender.id, mender, breaker, 3, 0.99);
    expect(r2.outcome).toBe('clean');
    expect(g.pc.sheet.chrome?.armR?.id).toBe('ch_arm_breaker');
    expect(g.pc.inventory.items.some((i) => i.def === 'ci_ch_arm_breaker')).toBe(false);
  });

  it('a rejection spends the fee and keeps the piece; a complication fits it at 60%; repairs and removals work', () => {
    const g = newGameState('c9', 0, 0);
    g.pc.inventory.tolls = 5000;
    const eyes = surgeryOffers(g, mender.id, mender)[1];
    const r = performSurgery(g, mender.id, mender, eyes, 3, 0.0);
    expect(r.outcome).toBe('rejected');
    expect(g.pc.sheet.chrome?.eyes).toBeUndefined();
    expect(g.pc.inventory.tolls).toBe(5000 - eyes.fee);
    expect(surgeryOffers(g, mender.id, mender).some((o) => o.def.id === 'ch_eye_heat')).toBe(true);
    const again = surgeryOffers(g, mender.id, mender).find((o) => o.def.id === 'ch_eye_heat')!;
    const r2 = performSurgery(g, mender.id, mender, again, 3, again.risk * 0.75);
    expect(r2.outcome).toBe('complication');
    expect(g.pc.sheet.chrome?.eyes?.condition).toBe(0.6);
    const rep = performRepair(g, mender, 'eyes');
    expect(rep.ok).toBe(true);
    expect(g.pc.sheet.chrome?.eyes?.condition).toBe(1);
    const rem = performRemoval(g, mender, 'eyes');
    expect(rem.ok).toBe(true);
    expect(g.pc.sheet.chrome?.eyes).toBeUndefined();
    expect(g.pc.inventory.items.some((i) => i.def === 'ci_ch_eye_heat')).toBe(true);
    expect(performSurgery({ ...g, pc: { ...g.pc, inventory: { ...g.pc.inventory, tolls: 1 } } }, mender.id, mender, eyes, 3, 0.9).outcome).toBe('cannot_pay');
  });
});
