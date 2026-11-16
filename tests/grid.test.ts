import { describe, expect, it } from 'vitest';
import { Grid } from '../src/engine/scene/grid';
import type { MapDef } from '../src/engine/data/types';
import { FAMILIES, ITEMS, MAPS, NPCS, PERKS, TRAITS } from '../src/content';
import { peopleNames, personName, validateContent } from '../src/engine/data/validate';
import type { NpcDef } from '../src/engine/npc/defs';
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
    expect(validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, families: FAMILIES })).toEqual([]);
  });

  it('keeps a surname to one family and a given name to one person in a region', () => {
    expect(personName('Sergeant Freya Brecht')).toEqual(['Freya', 'Brecht']);
    expect(personName('Rust Dog (Burr)')).toEqual(['Burr']);
    expect(personName('Girma of the Wheel')).toEqual(['Girma']);
    expect(personName('Guild Guard')).toBeNull();
    expect(personName('Passer-by 3')).toBeNull();
    const npc = (id: string, name: string, settlement: string): NpcDef => ({ id, name, settlement, look: { seed: 1 }, level: 1, team: 'neutral' });
    const run = (npcs: NpcDef[], families: Record<string, string[]> = {}) => peopleNames({
      maps: {}, families, npcs: Object.fromEntries(npcs.map((n) => [n.id, n])),
      settlements: { a: { id: 'a', roads: {}, region: 'north' }, b: { id: 'b', roads: {}, region: 'south' } },
    });
    expect(run([npc('x', 'Sheriff Ada Vey', 'a'), npc('y', 'Oskar Vey', 'b')])).toHaveLength(1);
    expect(run([npc('x', 'Sheriff Ada Vey', 'a'), npc('y', 'Oskar Vey', 'b')], { Vey: ['x', 'y'] })).toEqual([]);
    expect(run([npc('x', 'Marlow Dent', 'a'), npc('y', 'Tess Marlow', 'b')])).toHaveLength(1);
    expect(run([npc('x', 'Nell Durrow', 'a'), npc('y', 'Nell Rusk', 'a')])).toHaveLength(1);
    expect(run([npc('x', 'Nell Durrow', 'a'), npc('y', 'Nell Rusk', 'b')])).toEqual([]);
    expect(run([npc('x', 'Ada Vey', 'a')], { Vey: ['x', 'gone'] })).toHaveLength(1);
  });
});
