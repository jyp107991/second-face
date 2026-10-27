import type { Cover, MapDef, TileDef } from '../data/types';

export interface Tile {
  x: number;
  y: number;
  def: TileDef;
  walkable: boolean;
  /** Blocks line of sight (full walls, tall props). */
  opaque: boolean;
  cover: Cover;
}

const PROP_BLOCKS: Record<string, Cover> = {
  crate: 'half', barrel: 'half', barrel_rust: 'half', locker: 'full', table: 'half', chair: 'none',
  bed: 'half', terminal: 'half', pipe_h: 'half', lamp_post: 'none', car_wreck: 'full', rock: 'full',
  rock_small: 'half', tire_pile: 'half', tank: 'full', vault_door: 'full', dead_tree: 'half',
  sandbags: 'half', shelf: 'full', stove: 'half', fire_barrel: 'half', campfire: 'none', cactus: 'half',
  sign: 'none', counter: 'half', planter: 'half', machine: 'full', cot: 'half', tent: 'full',
  fence_post: 'none', debris: 'half', pump: 'half', wagon: 'full', horse: 'half', blanket: 'none',
};

/** Props that occupy their tile (not walkable). */
const PROP_SOLID = new Set(Object.keys(PROP_BLOCKS).filter((k) => !['sign', 'debris', 'blanket'].includes(k)));

export class Grid {
  width: number;
  height: number;
  readonly tiles: Tile[];
  /** Dynamic occupancy (actors) — tile index → entity id. */
  readonly occupied = new Map<number, string>();

  /** `stripRim`: the rock or wall the map was drawn with round its border becomes open ground (an open-world site). */
  constructor(map: MapDef, opts: { stripRim?: boolean } = {}) {
    this.height = map.layout.length;
    this.width = Math.max(...map.layout.map((r) => r.length));
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const ch = map.layout[y][x] ?? ' ';
        let def = map.legend[ch] ?? { empty: true };
        if (opts.stripRim && def.wall && (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1)) def = { floor: def.floor ?? 'sand' };
        this.tiles.push(Grid.makeTile(x, y, def));
      }
    }
    for (const p of map.props ?? []) {
      const t = this.get(p.x, p.y);
      if (!t) continue;
      const cover = PROP_BLOCKS[p.kind] ?? 'none';
      if (PROP_SOLID.has(p.kind)) t.walkable = false;
      if (cover === 'full') t.opaque = true;
      t.cover = maxCover(t.cover, cover);
    }
  }

  static makeTile(x: number, y: number, def: TileDef): Tile {
    let walkable = !def.empty;
    let opaque = false;
    let cover: Cover = def.cover ?? 'none';
    if (def.wall) {
      walkable = false;
      const h = def.wallHeight ?? 2.6;
      const seeThrough = def.wall === 'fence';
      opaque = h >= 1.2 && !seeThrough;
      cover = def.cover ?? (h >= 1.2 && !seeThrough ? 'full' : 'half');
    }
    if (def.prop) {
      const c = PROP_BLOCKS[def.prop] ?? 'none';
      if (PROP_SOLID.has(def.prop)) walkable = false;
      if (c === 'full') opaque = true;
      cover = def.cover ?? maxCover(cover, c);
    }
    if (def.blocks !== undefined) walkable = !def.blocks;
    return { x, y, def, walkable, opaque, cover };
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Tile | undefined {
    return this.inBounds(x, y) ? this.tiles[this.index(x, y)] : undefined;
  }

  passable(x: number, y: number, ignore?: string): boolean {
    const t = this.get(x, y);
    if (!t || !t.walkable) return false;
    const occ = this.occupied.get(this.index(x, y));
    return occ === undefined || occ === ignore;
  }

  /**
   * A* over 8-connected tiles. Diagonal moves may not cut wall corners.
   * Returns path excluding start, or null. `maxCost` bounds the search (e.g. AP).
   */
  findPath(sx: number, sy: number, tx: number, ty: number, opts: { ignore?: string; maxCost?: number; adjacentOk?: boolean; /** Most nodes expanded before giving up (the open world). */ budget?: number } = {}): { x: number; y: number }[] | null {
    if (!this.inBounds(tx, ty)) return null;
    const goalPassable = this.passable(tx, ty, opts.ignore);
    if (!goalPassable && !opts.adjacentOk) return null;
    const W = this.width;
    const start = this.index(sx, sy);
    const g = new Map<number, number>([[start, 0]]);
    const came = new Map<number, number>();
    const open = new MinHeap();
    const h = (x: number, y: number) => {
      const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
      return Math.max(dx, dy) + 0.41 * Math.min(dx, dy);
    };
    open.push(start, h(sx, sy));
    const closed = new Set<number>();
    let budget = opts.budget ?? Infinity;
    while (open.size) {
      if (--budget < 0) return null;
      const cur = open.pop();
      const cx = cur % W, cy = (cur / W) | 0;
      const atGoal = opts.adjacentOk && !goalPassable
        ? Math.max(Math.abs(cx - tx), Math.abs(cy - ty)) <= 1
        : cx === tx && cy === ty;
      if (atGoal) {
        const path: { x: number; y: number }[] = [];
        let n = cur;
        while (n !== start) {
          path.push({ x: n % W, y: (n / W) | 0 });
          n = came.get(n)!;
        }
        return path.reverse();
      }
      if (closed.has(cur)) continue;
      closed.add(cur);
      const gc = g.get(cur)!;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          if (!this.passable(nx, ny, opts.ignore)) continue;
          if (dx && dy && (!this.passable(cx + dx, cy, opts.ignore) || !this.passable(cx, cy + dy, opts.ignore))) continue;
          // Diagonals cost 1 AP like orthogonal moves (classic iso convention) but are slightly
          // penalised in pathing so paths look natural.
          const ng = gc + (dx && dy ? 1.001 : 1);
          if (opts.maxCost !== undefined && ng > opts.maxCost + 0.01) continue;
          const ni = this.index(nx, ny);
          if (ng < (g.get(ni) ?? Infinity)) {
            g.set(ni, ng);
            came.set(ni, cur);
            open.push(ni, ng + h(nx, ny));
          }
        }
      }
    }
    return null;
  }

  /** Bresenham line-of-sight between tile centres; endpoints excluded. */
  lineOfSight(ax: number, ay: number, bx: number, by: number): boolean {
    let x = ax, y = ay;
    const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (x === bx && y === by) return true;
      if (!(x === ax && y === ay) && this.get(x, y)?.opaque) return false;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
}

function maxCover(a: Cover, b: Cover): Cover {
  const rank = { none: 0, half: 1, full: 2 };
  return rank[a] >= rank[b] ? a : b;
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() { return this.items.length; }
  push(item: number, p: number) {
    this.items.push(item); this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent); i = parent;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastI = this.items.pop()!, lastP = this.prio.pop()!;
    if (this.items.length) {
      this.items[0] = lastI; this.prio[0] = lastP;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}
