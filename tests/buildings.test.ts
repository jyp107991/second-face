import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/core/rng';
import type { MapDef } from '../src/engine/data/types';
import { detectBuildings } from '../src/engine/scene/buildings';
import { Grid } from '../src/engine/scene/grid';

const legend: MapDef['legend'] = {
  '.': { floor: 'sand' }, c: { floor: 'concrete' }, w: { floor: 'wood' },
  R: { wall: 'rock', floor: 'sand', wallHeight: 3 },
  B: { wall: 'brick', floor: 'dirt', wallHeight: 2.6 },
  W: { wall: 'wood', floor: 'wood', wallHeight: 2.8 },
  N: { wall: 'concrete', floor: 'dirt', wallHeight: 2.6, roof: 'none' },
  C: { wall: 'concrete', floor: 'concrete', wallHeight: 4.2 },
  F: { wall: 'fence', floor: 'dirt', wallHeight: 1.2 },
};
const map = (layout: string[]): MapDef => ({
  id: 't', name: 't', layout, legend, spawns: [], npcs: [],
  ambience: { indoor: false, fogColor: 0, fogDensity: 0.01, dust: 0, grade: 0.5 },
} as unknown as MapDef);

describe('buildings', () => {
  it('finds a room behind its walls and door, not the yard, the street or the cliffs', () => {
    const m = map([
      'RRRRRRRRRRRRRR',
      'R............R',
      'R.BBBBB.FFFF.R',
      'R.BcccB.F..F.R',
      'R.BcccB.F..F.R',
      'R.BBcBB.FFFF.R',
      'R............R',
      'R.CCCC.CCCCC.R',
      'R.c..........R',
      'RRRRRRRRRRRRRR',
    ]);
    const g = new Grid(m);
    const b = detectBuildings(g, new Rng(1));
    expect(b.list).toHaveLength(1);
    const [room] = b.list;
    expect(room.kind).toBe('brick');
    expect(room.roof).toBe('flat');
    expect(room.interior).toHaveLength(6);
    expect(room.doors).toEqual([g.index(4, 5)]);
    expect(b.door[g.index(4, 5)]).toBe(1);
    expect(room.ring).toHaveLength(5 + 5 + 2 + 2 - 1);
    expect(b.at[g.index(3, 3)]).toBe(0);
    expect(b.at[g.index(2, 2)]).toBe(0);
    expect(b.at[g.index(4, 5)]).toBe(0);
    expect(b.at[g.index(9, 3)]).toBe(-1);   // the fenced yard
    expect(b.at[g.index(1, 1)]).toBe(-1);   // the street
    expect(b.door[g.index(6, 7)]).toBe(1);  // a gate in the compound wall is a doorway, but no room
  });

  it('roofs by material, with the legend able to leave a ruin open', () => {
    const m = map([
      'RRRRRRRRRRRRRRR',
      'R.............R',
      'R.WWWWW.NNNNN.R',
      'R.WwwwW.NcccN.R',
      'R.WwwwW.NcccN.R',
      'R.WWwWW.NNcNN.R',
      'R.............R',
      'RRRRRRRRRRRRRRR',
    ]);
    const b = detectBuildings(new Grid(m), new Rng(2));
    expect(b.list.map((x) => x.roof).sort()).toEqual(['none', 'pitched']);
    expect(b.list.find((x) => x.kind === 'wood')?.height).toBe(2.8);
  });

  it('a double door counts as one opening, even at the end of a wall', () => {
    const m = map([
      'RRRRRRRRRRRRR',
      'R...........R',
      'R.BBBBBB....R',
      'R.Bcccc.....R',
      'R.Bcccc.....R',
      'R.BBB..BB...R',
      'R.......B...R',
      'R.......B...R',
      'RRRRRRRRRRRRR',
    ]);
    // Rows 3-4 have no east wall: the two-tile gap between the top wall's end and the corner is read as a double
    // doorway on the east, so this is still a room (an open-fronted one).
    const g = new Grid(m);
    const b = detectBuildings(g, new Rng(3));
    expect(b.list).toHaveLength(1);
    expect(b.list[0].doors.sort()).toEqual([g.index(7, 3), g.index(7, 4), g.index(5, 5), g.index(6, 5)].sort());
    expect(b.door[g.index(7, 3)]).toBe(2);
    const m2 = map([
      'RRRRRRRRRRRRR',
      'R...........R',
      'R.BBBBBBB...R',
      'R.BccccccB..R',
      'R.BccccccB..R',
      'R.BBB..BBB..R',
      'R...........R',
      'RRRRRRRRRRRRR',
    ]);
    // Walls at (8,2..5): the ring closes on the right via (9,3),(9,4) — not a straight box but enclosed all the same.
    const g2 = new Grid(m2);
    const b2 = detectBuildings(g2, new Rng(4));
    expect(b2.list).toHaveLength(1);
    expect(b2.list[0].doors.sort()).toEqual([g2.index(5, 5), g2.index(6, 5)].sort());
  });
});
