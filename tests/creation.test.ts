import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/core/rng';
import { ATTRIBUTES, ATTR_BASE, ATTR_CREATION_MAX, ATTR_CREATION_POINTS } from '../src/engine/stats/rules';
import { creationPointsLeft, emptySheet, rollAttributes, validateCreation } from '../src/engine/stats/sheet';

describe('rolling a start', () => {
  it('rolls a pool that varies round the standard, never below base nor above the creation cap', () => {
    const rng = new Rng(7);
    const pools: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const r = rollAttributes(rng);
      pools.push(r.pool);
      expect(ATTRIBUTES.reduce((n, a) => n + (r.attrs[a] - ATTR_BASE), 0)).toBe(r.pool);
      for (const a of ATTRIBUTES) { expect(r.attrs[a]).toBeGreaterThanOrEqual(ATTR_BASE); expect(r.attrs[a]).toBeLessThanOrEqual(ATTR_CREATION_MAX); }
    }
    const mean = pools.reduce((n, p) => n + p, 0) / pools.length;
    expect(mean).toBeGreaterThan(ATTR_CREATION_POINTS - 1);
    expect(mean).toBeLessThan(ATTR_CREATION_POINTS + 3);
    expect(Math.min(...pools)).toBeLessThan(8);
    expect(Math.max(...pools)).toBeGreaterThan(18);
    // A great roll is rare enough to be worth fishing for, common enough to turn up.
    const great = pools.filter((p) => p >= 18).length / pools.length;
    expect(great).toBeGreaterThan(0.005);
    expect(great).toBeLessThan(0.12);
  });

  it('a rolled sheet validates against its own pool, and leftover points are refused', () => {
    const s = emptySheet();
    s.name = 'Tester';
    const r = rollAttributes(new Rng(3));
    s.baseAttrs = { ...r.attrs };
    s.creationPool = r.pool;
    expect(creationPointsLeft(s.baseAttrs, s.creationPool)).toBe(0);
    s.tagged = ['firearms', 'melee', 'survival'];
    expect(validateCreation(s).filter((e) => e.includes('attribute'))).toEqual([]);
    s.baseAttrs.brawn -= 1;
    expect(validateCreation(s)).toContain('Distribute all attribute points.');
    // Without a pool the standard twelve still apply.
    delete s.creationPool;
    expect(creationPointsLeft(s.baseAttrs)).toBe(ATTR_CREATION_POINTS - (r.pool - 1));
  });
});
