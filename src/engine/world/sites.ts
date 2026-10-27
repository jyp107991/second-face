import { MAPS, WORLD_MAP } from '../../content';
import { CELL_ORIGIN_X, CELL_PITCH, SITES, WORLD_SCALE } from '../../content/world/sites';
import type { MapDef } from '../data/types';

/** A map placed in the world: its top-left tile and size. */
export interface SitePlacement {
  id: string;
  map: MapDef;
  kind: 'open' | 'cell';
  x: number;
  z: number;
  w: number;
  h: number;
  rim: 'strip' | 'keep';
}

export function mapSize(map: MapDef): { w: number; h: number } {
  return { w: Math.max(...map.layout.map((r) => r.length)), h: map.layout.length };
}

const cellIndex = new Map<string, number>();

/** Where a map stands now (moving camps follow the day through `WORLD_MAP`'s current positions). */
export function sitePlacement(id: string): SitePlacement | undefined {
  const map = MAPS[id];
  if (!map) return undefined;
  const def = SITES[id] ?? { kind: 'cell' as const };
  const { w, h } = mapSize(map);
  if (def.kind === 'cell' || (!def.at && !def.beside)) {
    let k = cellIndex.get(id);
    if (k === undefined) { k = cellIndex.size; cellIndex.set(id, k); }
    return { id, map, kind: 'cell', x: CELL_ORIGIN_X + (k % 24) * CELL_PITCH, z: Math.floor(k / 24) * CELL_PITCH + 64, w, h, rim: 'keep' };
  }
  let x: number, z: number;
  if (def.beside) {
    const other = sitePlacement(def.beside.site);
    if (!other) return undefined;
    const s = def.beside.side;
    x = s === 'e' ? other.x + other.w : s === 'w' ? other.x - w : other.x;
    z = s === 's' ? other.z + other.h : s === 'n' ? other.z - h : other.z;
  } else {
    const loc = WORLD_MAP.locations[def.at!];
    if (!loc) return undefined;
    x = Math.round(loc.x * WORLD_SCALE - w / 2);
    z = Math.round(loc.y * WORLD_SCALE - h / 2);
  }
  return { id, map, kind: 'open', x: x + (def.dx ?? 0), z: z + (def.dz ?? 0), w, h, rim: def.rim ?? 'strip' };
}

/** Every open site's placement (for streaming and the map). */
export function openSites(): SitePlacement[] {
  const out: SitePlacement[] = [];
  for (const id of Object.keys(SITES)) {
    const p = sitePlacement(id);
    if (p && p.kind === 'open') out.push(p);
  }
  return out;
}

/** World tile → metres on the world map (km) for the map screen and the regions. */
export function worldToKm(x: number, z: number): { x: number; y: number } {
  return { x: x / WORLD_SCALE, y: z / WORLD_SCALE };
}
