import { describe, expect, it } from 'vitest';
import { Grid } from '../src/engine/scene/grid';
import type { MapDef } from '../src/engine/data/types';
import { ITEMS, MAPS, PERKS, TRAITS } from '../src/content';
import { validateContent } from '../src/engine/data/validate';
import { Rng } from '../src/engine/core/rng';

const map: MapDef = {
  id: 't', name: 't',
  layout: ['.....', '.###.', '.....'],
  legend: { '.': { floor: 'sand' }, '#': { wall: 'concrete' } },
  spawns: [{ id: 's', x: 0, y: 0 }],
  ambience: { indoor: false, fogColor: 0, fogDensity: 0, dust: 0 },
};

describe('Grid', () => {
  it('paths around walls', () => {
    const g = new Grid(map);
    const p = g.findPath(0, 1, 4, 1)!;
    expect(p).not.toBeNull();
    expect(p[p.length - 1]).toEqual({ x: 4, y: 1 });
    for (const s of p) expect(g.get(s.x, s.y)!.walkable).toBe(true);
  });
  it('respects maxCost', () => {
    const g = new Grid(map);
    expect(g.findPath(0, 1, 4, 1, { maxCost: 3 })).toBeNull();
  });
  it('blocks line of sight through walls', () => {
    const g = new Grid(map);
    expect(g.lineOfSight(2, 0, 2, 2)).toBe(false);
    expect(g.lineOfSight(0, 0, 4, 0)).toBe(true);
  });
  it('treats occupied tiles as blocked', () => {
    const g = new Grid(map);
    g.occupied.set(g.index(1, 0), 'npc');
    expect(g.passable(1, 0)).toBe(false);
    expect(g.passable(1, 0, 'npc')).toBe(true);
  });
});

describe('Rng', () => {
  it('is deterministic from state', () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 5; i++) expect(a.next()).toBe(b.next());
  });
});

describe('Content', () => {
  it('validates', () => {
    expect(validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS })).toEqual([]);
  });
});
