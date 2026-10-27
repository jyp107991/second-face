/**
 * Where every hand-built map sits in the one world (docs/UPGRADE.md U2). World tiles are metres; 1 km on the
 * world map (`WORLD_MAP` locations, km) is `WORLD_SCALE` metres walked. Open sites are stamped into the terrain at
 * their world-map location (or beside another site); cells are enclosed places (a cistern, a tower floor, a roof)
 * kept in a reserved area far from the terrain and entered instantly through their doors.
 */
export const WORLD_SCALE = 12;
/** World bounds in tiles (metres): the 700 × 500 km map, plus the cell area east of it. */
export const WORLD_W = 32768;
export const WORLD_H = 8192;
/** Where cells are kept. */
export const CELL_ORIGIN_X = 12000;
export const CELL_PITCH = 256;

export interface SiteDef {
  kind: 'open' | 'cell';
  /** World-map location this map stands at (centred on it). */
  at?: string;
  /** Placed against another site's edge (city districts). */
  beside?: { site: string; side: 'n' | 'e' | 's' | 'w' };
  /** Open sites: the rim of rock or wall the map was drawn with is stripped so the ground runs on, unless kept. */
  rim?: 'strip' | 'keep';
  /** Nudge in metres after placement. */
  dx?: number;
  dz?: number;
}

export const SITES: Record<string, SiteDef> = {
  // the Sallow
  c9_mouth: { kind: 'open', at: 'cistern9', rim: 'strip' },
  shale: { kind: 'open', at: 'shale', rim: 'strip' },
  drywells: { kind: 'open', at: 'drywells', rim: 'strip' },
  overpass: { kind: 'open', at: 'rustdogs', rim: 'strip' },
  tollhouse: { kind: 'open', at: 'tollhouse', rim: 'strip' },
  signalhill: { kind: 'open', at: 'signalhill', rim: 'strip' },
  saltpan: { kind: 'open', at: 'lm_sallow_01', rim: 'strip' },
  orchard: { kind: 'open', at: 'orchard', rim: 'strip' },
  wheel: { kind: 'open', at: 'wheel', rim: 'strip' },
  windpumps: { kind: 'open', at: 'lm_sallow_02', rim: 'strip' },
  // the Glass Flats
  ninebridge: { kind: 'open', at: 'ninebridge', rim: 'strip' },
  openfield: { kind: 'open', at: 'openfield', rim: 'strip' },
  sump: { kind: 'open', at: 'sump', rim: 'strip' },
  // Meridian: the districts stand side by side inside the Wall
  md_precinct: { kind: 'open', at: 'meridian', rim: 'keep' },
  md_market: { kind: 'open', beside: { site: 'md_precinct', side: 'e' }, rim: 'keep' },
  md_lantern: { kind: 'open', beside: { site: 'md_market', side: 'e' }, rim: 'keep' },
  md_bridgeward: { kind: 'open', beside: { site: 'md_lantern', side: 'e' }, rim: 'keep' },
  md_stacks: { kind: 'open', beside: { site: 'md_market', side: 's' }, rim: 'keep' },
  // cells: enclosed places, entered through their doors
  cistern9: { kind: 'cell' },
  cistern4: { kind: 'cell' },
  md_sink: { kind: 'cell' },
  md_stacks_9: { kind: 'cell' },
  md_stacks_roof: { kind: 'cell' },
  md_crown: { kind: 'cell' },
  dev_yard: { kind: 'cell' },
  dev_bunker: { kind: 'cell' },
  bench_crowd: { kind: 'cell' },
  wild_track: { kind: 'cell' },
  wild_rough: { kind: 'cell' },
};
