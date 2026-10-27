import { WORLD_H, WORLD_W } from '../../content/world/sites';
import type { MapDef } from '../data/types';
import { Grid, type Tile } from '../scene/grid';
import { biomeAt } from './terrain';
import type { SitePlacement } from './sites';

/**
 * The walkable world: one grid the size of the map, answered by the loaded sites where they stand and by the
 * terrain everywhere else. Everything that paths, fights or stands (actors, encounters, followers) uses it like
 * any map grid; world tiles are metres.
 */
export interface LoadedSiteGrid { place: SitePlacement; grid: Grid }

const WORLD_DEF: MapDef = { id: '_world', name: 'the world', layout: ['.'], legend: { '.': { empty: true } }, spawns: [], ambience: { indoor: false, fogColor: 0, fogDensity: 0.01, dust: 0 } };

export class WorldGrid extends Grid {
  readonly sites = new Map<string, LoadedSiteGrid>();
  private last?: LoadedSiteGrid;
  private scratch: Tile = { x: 0, y: 0, def: { floor: 'sand' }, walkable: true, opaque: false, cover: 'none' };
  /** Terrain the player cannot walk (water, cliffs) — filled by the heightfield later; empty means open. */
  blocked?: (x: number, y: number) => boolean;

  constructor() {
    super(WORLD_DEF);
    this.width = WORLD_W;
    this.height = WORLD_H;
  }

  /** The loaded site standing on a world tile. */
  siteAt(x: number, y: number): LoadedSiteGrid | undefined {
    const l = this.last;
    if (l && x >= l.place.x && y >= l.place.z && x < l.place.x + l.place.w && y < l.place.z + l.place.h) return l;
    for (const s of this.sites.values()) {
      const p = s.place;
      if (x >= p.x && y >= p.z && x < p.x + p.w && y < p.z + p.h) { this.last = s; return s; }
    }
    return undefined;
  }

  override index(x: number, y: number): number { return y * WORLD_W + x; }
  override inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H; }

  override get(x: number, y: number): Tile | undefined {
    if (!this.inBounds(x, y)) return undefined;
    const s = this.siteAt(x, y);
    if (s) {
      const t = s.grid.get(x - s.place.x, y - s.place.z);
      // A site's void (the air past a parapet) is nothing to stand on; its rim, when stripped, is open ground.
      return t;
    }
    const t = this.scratch;
    t.x = x; t.y = y;
    t.def = { floor: biomeAt(x, y).floor };
    t.walkable = !(this.blocked && this.blocked(x, y));
    return t;
  }

  override passable(x: number, y: number, ignore?: string): boolean {
    const t = this.get(x, y);
    if (!t || !t.walkable) return false;
    const occ = this.occupied.get(this.index(x, y));
    return occ === undefined || occ === ignore;
  }

  /** World paths keep a budget: a far goal across open ground is walked in legs (the game re-paths as it goes). */
  override findPath(sx: number, sy: number, tx: number, ty: number, opts: { ignore?: string; maxCost?: number; adjacentOk?: boolean; budget?: number } = {}): { x: number; y: number }[] | null {
    return super.findPath(sx, sy, tx, ty, { budget: 60000, ...opts });
  }

  /** Sites' occupancy is kept on this grid: the site grids never see actors. */
  addSite(place: SitePlacement, grid: Grid): void { this.sites.set(place.id, { place, grid }); this.last = undefined; }
  removeSite(id: string): void { this.sites.delete(id); this.last = undefined; }
}
