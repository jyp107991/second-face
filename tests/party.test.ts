import { describe, expect, it } from 'vitest';
import type { MapDef } from '../src/engine/data/types';
import { Grid } from '../src/engine/scene/grid';
import { followPath, freeTileNear, reviveDowned, shouldFollow } from '../src/engine/npc/party';
import { emptySheet } from '../src/engine/stats/sheet';

const map: MapDef = {
  id: 't', name: 't',
  layout: ['.......', '..###..', '.......', '.......'],
  legend: { '.': { floor: 'sand' }, '#': { wall: 'concrete' } },
  spawns: [{ id: 's', x: 0, y: 0 }],
  ambience: { indoor: false, fogColor: 0, fogDensity: 0, dust: 0 },
};

describe('companions', () => {
  it('finds a free tile beside an occupied one', () => {
    const g = new Grid(map);
    g.occupied.set(g.index(3, 2), 'player');
    const t = freeTileNear(g, 3, 2, 'player');
    expect(t).toEqual({ x: 3, y: 2 }); // ignore = the occupant: the tile itself is fine for them
    const u = freeTileNear(g, 3, 2)!;
    expect(Math.max(Math.abs(u.x - 3), Math.abs(u.y - 2))).toBe(1);
    expect(g.passable(u.x, u.y)).toBe(true);
  });

  it('follows only when far enough, trailing behind the leader', () => {
    expect(shouldFollow(2, false)).toBe(false);
    expect(shouldFollow(3, false)).toBe(true);
    expect(shouldFollow(3, true)).toBe(false);
    const g = new Grid(map);
    g.occupied.set(g.index(0, 3), 'c');
    // Leader at (3,3) facing +z (south): the trailing tile is (3,2), behind them.
    const p = followPath(g, { id: 'c', x: 0, y: 3 }, { x: 3, y: 3, facing: 0 })!;
    expect(p[p.length - 1]).toEqual({ x: 3, y: 2 });
  });

  it('a downed companion gets up wounded, never dead', () => {
    const s = emptySheet('t');
    s.hp = 0;
    expect(reviveDowned(s, 100)).toBe(true);
    expect(s.hp).toBeGreaterThan(0);
    expect(s.effects.some((e) => e.id === 'downed' && e.until === 100 + 1440)).toBe(true);
    expect(reviveDowned(s, 100)).toBe(false);
  });
});
