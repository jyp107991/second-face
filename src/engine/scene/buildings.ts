import * as THREE from 'three';
import type { GeoBuilder, Surface } from '../assets/builder';
import { hash2, type Rng } from '../core/rng';
import type { MapDef, RoofKind, WallKind } from '../data/types';
import type { Grid } from './grid';

/**
 * Buildings. The map only says where walls are; this module finds the rooms they enclose and builds them as
 * buildings: walls of a real thickness with faces by material, lintels and jambs on the doors, windows on the
 * long runs, drifts of sand at the foot, and a roof (flat behind a parapet, pitched with gables, or a lean-to
 * of tin) that is hidden while the player is inside. Cliffs (rock) and fences are left to the location builder.
 */

export interface Building {
  id: number;
  kind: WallKind;
  height: number;
  roof: RoofKind;
  /** Tile indices: the floor inside, the walls round it, the doorways through them. */
  interior: number[];
  ring: number[];
  doors: number[];
  /** Bounding box in tiles (inclusive) of walls and floor. */
  x0: number; y0: number; x1: number; y1: number;
  /** Plaster or paint tint of the walls. */
  tint: number;
}

export interface Buildings {
  list: Building[];
  /** Tile index → building id (walls, floor and doors), or -1. */
  at: Int16Array;
  /** Tile index → 0 none, 1 a doorway in a wall running east–west, 2 in a wall running north–south. */
  door: Uint8Array;
}

const INDOOR_FLOORS = new Set(['concrete', 'wood', 'tile', 'metal', 'grate']);
const DEFAULT_ROOF: Record<WallKind, RoofKind> = { adobe: 'flat', brick: 'flat', concrete: 'flat', wood: 'pitched', scrap: 'tin', metal: 'tin', rock: 'none', fence: 'none' };
const TINTS: Partial<Record<WallKind, number[]>> = {
  adobe: [0xd8b88e, 0xcfa878, 0xe0c8a0, 0xc89c70, 0xd4b488, 0xb89a74],
  concrete: [0xd8d2c4, 0xc8c4b8, 0xbcb8ac, 0xd0ccc0],
  wood: [0xffffff, 0xe8dcc8, 0xd0c0a8, 0xc8b8a0],
  brick: [0xffffff, 0xf0e8e0, 0xe8dcd0],
  metal: [0xc0c4c0, 0xb0b4b0, 0xa8b0a8],
  scrap: [0xffffff],
};

/** Walls that enclose (fences and cliffs do not count as building walls). */
function solidAt(grid: Grid, x: number, y: number): boolean {
  const t = grid.get(x, y);
  return !!t && !!t.def.wall && t.def.wall !== 'fence';
}
function openAt(grid: Grid, x: number, y: number): boolean {
  const t = grid.get(x, y);
  return !!t && !t.def.empty && !(t.def.wall && t.def.wall !== 'fence');
}

/** Find the rooms the walls enclose. */
export function detectBuildings(grid: Grid, rng: Rng): Buildings {
  const W = grid.width, H = grid.height, N = W * H;
  const at = new Int16Array(N).fill(-1);
  const door = new Uint8Array(N);
  const solid = (x: number, y: number) => solidAt(grid, x, y);
  // Doorways: a gap of one or two tiles in a straight run of wall. The mouth of an alley between two buildings
  // looks the same from the gap, except that both flanking walls turn the same way; that is not a door.
  const open = (x: number, y: number) => openAt(grid, x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!open(x, y)) continue;
    for (const [ax, az, kind] of [[1, 0, 1], [0, 1, 2]] as const) {
      if (!solid(x - ax, y - az)) continue;
      const len = solid(x + ax, y + az) ? 1 : open(x + ax, y + az) && solid(x + 2 * ax, y + 2 * az) ? 2 : 0;
      if (!len) continue;
      const fx = x - ax, fz = y - az, gx = x + len * ax, gz = y + len * az;   // the flanking wall tiles
      const px = az, pz = ax;                                                   // the perpendicular
      if ((solid(fx + px, fz + pz) && solid(gx + px, gz + pz)) || (solid(fx - px, fz - pz) && solid(gx - px, gz - pz))) continue;
      for (let k = 0; k < len; k++) door[(y + k * az) * W + x + k * ax] = kind;
    }
  }
  // Regions of open floor, doors closed: small ones ringed by built walls are rooms.
  const seen = new Uint8Array(N);
  const list: Building[] = [];
  for (let start = 0; start < N; start++) {
    if (seen[start] || door[start]) continue;
    const sx = start % W, sy = Math.floor(start / W);
    if (!openAt(grid, sx, sy)) continue;
    const region: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      region.push(i);
      const x = i % W, y = Math.floor(i / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!grid.inBounds(nx, ny)) continue;
        const j = ny * W + nx;
        if (seen[j] || door[j] || !openAt(grid, nx, ny)) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    if (region.length < 2 || region.length > 220) continue;
    const ringSet = new Set<number>(), doorSet = new Set<number>();
    let rock = false, indoor = 0, roofOverride: RoofKind | undefined;
    const kinds = new Map<string, number>(), heights = new Map<number, number>();
    for (const i of region) {
      const x = i % W, y = Math.floor(i / W);
      const t = grid.get(x, y)!;
      if (INDOOR_FLOORS.has(t.def.floor ?? '')) indoor++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!grid.inBounds(nx, ny)) continue;
        const j = ny * W + nx, n = grid.get(nx, ny)!;
        if (solid(nx, ny)) {
          ringSet.add(j);
          if (n.def.wall === 'rock') rock = true;
          kinds.set(n.def.wall!, (kinds.get(n.def.wall!) ?? 0) + 1);
          const h = n.def.wallHeight ?? 2.6;
          heights.set(h, (heights.get(h) ?? 0) + 1);
          if (n.def.roof && !roofOverride) roofOverride = n.def.roof;
        } else if (door[j] && (!dx || !dy)) doorSet.add(j);
      }
    }
    if (rock || ringSet.size < 4) continue;
    if (!roofOverride && indoor < region.length * 0.5) continue;   // a yard, not a room
    const kind = [...kinds.entries()].sort((a, b) => b[1] - a[1])[0][0] as WallKind;
    const height = [...heights.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const id = list.length;
    const all = [...region, ...ringSet, ...doorSet];
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const i of all) {
      const x = i % W, y = Math.floor(i / W);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      at[i] = id;
    }
    const tints = TINTS[kind] ?? [0xffffff];
    list.push({ id, kind, height, roof: roofOverride ?? DEFAULT_ROOF[kind], interior: region, ring: [...ringSet], doors: [...doorSet], x0, y0, x1, y1, tint: rng.pick(tints) });
  }
  return { list, at, door };
}

// --- Walls --------------------------------------------------------------------------------------------------

const SURF: Record<WallKind, Surface> = { concrete: 'concrete', metal: 'metal', wood: 'wood', rock: 'rock', fence: 'wood', brick: 'brick', scrap: 'scrap', adobe: 'adobe' };
const DARK_WOOD = 0x5c4430, WOOD = 0x8a6a48, DARK_METAL = 0x4a4e50, RUST = 0xa0603a;

function thickness(kind: WallKind, h: number): number {
  switch (kind) {
    case 'adobe': return 0.62;
    case 'brick': return 0.5;
    case 'concrete': return h >= 3.5 ? 0.9 : 0.55;
    case 'wood': return 0.4;
    case 'metal': return 0.42;
    case 'scrap': return 0.46;
    default: return 1;
  }
}

/** One exposed side of a straight run of wall. */
interface Face { nx: number; nz: number; px: number; pz: number; axis: 'x' | 'z'; outward: boolean; }

/** A box on a face: `len` along the wall, `dep` proud of it, `off` along the wall from the tile centre. */
function faceBox(b: GeoBuilder, f: Face, len: number, hgt: number, dep: number, y: number, off: number, surf: Surface, col: number, opts?: { rx?: number; rz?: number; shadow?: boolean }): void {
  const tx = f.axis === 'x' ? 1 : 0, tz = f.axis === 'z' ? 1 : 0;
  const cx = f.px + (f.nx * dep) / 2 + tx * off, cz = f.pz + (f.nz * dep) / 2 + tz * off;
  if (f.axis === 'x') b.box(len, hgt, dep, cx, y, cz, surf, col, 0, { cutaway: true, ...opts });
  else b.box(dep, hgt, len, cx, y, cz, surf, col, 0, { cutaway: true, ...opts });
}
/** Rotation that tilts a face box about the wall's own axis (leaning against the wall). */
function leanOpts(f: Face, a: number): { rx?: number; rz?: number } {
  // Positive `a` lifts the edge nearest the wall.
  return f.axis === 'x' ? { rx: f.nz > 0 ? a : -a } : { rz: f.nx > 0 ? -a : a };
}
/** Rotation about the face normal (a plank nailed askew). */
function spinOpts(f: Face, a: number): { rx?: number; rz?: number } {
  return f.axis === 'x' ? { rz: a } : { rx: a };
}

export function buildWalls(b: GeoBuilder, grid: Grid, map: MapDef, bld: Buildings, rng: Rng): void {
  const W = grid.width;
  const outdoor = !map.ambience.indoor;
  const windows = new Set<number>();
  const wallAt = (x: number, y: number) => { const t = grid.get(x, y); return !!t?.def.wall && t.def.wall !== 'fence' && t.def.wall !== 'rock'; };
  const interiorOf = (x: number, y: number, id: number) => grid.inBounds(x, y) && bld.at[y * W + x] === id && openAt(grid, x, y) && !bld.door[y * W + x];

  for (const t of grid.tiles) {
    const { x, y, def } = t;
    const i = y * W + x;
    if (!def.wall || def.wall === 'rock' || def.wall === 'fence') continue;
    const kind = def.wall, h = def.wallHeight ?? 2.6, th = thickness(kind, h);
    const wx = x + 0.5, wz = y + 0.5;
    const bid = bld.at[i];
    const building = bid >= 0 ? bld.list[bid] : undefined;
    const tint = building?.tint ?? TINTS[kind]?.[0] ?? 0xffffff;
    const surf = SURF[kind];
    const n = wallAt(x, y - 1), s = wallAt(x, y + 1), e = wallAt(x + 1, y), w = wallAt(x - 1, y);
    const run: 'x' | 'z' | undefined = n && s && !e && !w ? 'z' : e && w && !n && !s ? 'x' : undefined;

    // Footing: the full tile, low and dark, so the wall sits on something.
    b.box(1.02, 0.14, 1.02, wx, 0.07, wz, surf, 0x6a645a, 0, { cutaway: true });

    // The wall itself: one slab along a run, otherwise a core and a spine toward each neighbour.
    const pieces: { w: number; d: number; x: number; z: number }[] = [];
    if (run === 'z') pieces.push({ w: th, d: 1, x: wx, z: wz });
    else if (run === 'x') pieces.push({ w: 1, d: th, x: wx, z: wz });
    else {
      pieces.push({ w: th, d: th, x: wx, z: wz });
      if (n) pieces.push({ w: th, d: 0.5, x: wx, z: wz - 0.25 });
      if (s) pieces.push({ w: th, d: 0.5, x: wx, z: wz + 0.25 });
      if (e) pieces.push({ w: 0.5, d: th, x: wx + 0.25, z: wz });
      if (w) pieces.push({ w: 0.5, d: th, x: wx - 0.25, z: wz });
    }
    const coreCol = kind === 'scrap' ? 0x6a5a48 : tint;
    for (const p of pieces) {
      b.box(p.w, h, p.d, p.x, h / 2, p.z, surf, coreCol, 0, { cutaway: true });
      // Caps by material.
      switch (kind) {
        case 'adobe':
          b.box(p.w + 0.1, 0.1, p.d + 0.1, p.x, h + 0.03, p.z, 'adobe', tint, 0, { cutaway: true });
          b.box(Math.max(0.12, p.w - 0.12), 0.08, Math.max(0.12, p.d - 0.12), p.x, h + 0.11, p.z, 'adobe', tint, 0, { cutaway: true });
          break;
        case 'brick': b.box(p.w + 0.1, 0.12, p.d + 0.1, p.x, h + 0.04, p.z, 'concrete', 0xc8bca8, 0, { cutaway: true }); break;
        case 'concrete': b.box(p.w + 0.04, 0.1, p.d + 0.04, p.x, h + 0.03, p.z, 'concrete', 0x9a948a, 0, { cutaway: true }); break;
        case 'wood': b.box(p.w + 0.06, 0.08, p.d + 0.06, p.x, h + 0.02, p.z, 'wood', DARK_WOOD, 0, { cutaway: true }); break;
        case 'metal': b.box(p.w + 0.04, 0.06, p.d + 0.04, p.x, h + 0.01, p.z, 'metal', DARK_METAL, 0, { cutaway: true }); break;
        default: break;
      }
    }

    // Corner rebar and rubble for concrete; a tyre on a scrap wall end.
    if (!run && kind === 'concrete' && rng.chance(0.5)) {
      for (let k = 0; k < 2; k++) b.cyl(0.015, 0.015, 0.5, 4, wx + rng.range(-0.15, 0.15), h + 0.2, wz + rng.range(-0.15, 0.15), 'rust', RUST, { rx: rng.range(-0.5, 0.5), rz: rng.range(-0.5, 0.5), cutaway: true });
    }
    if (!run && kind === 'scrap' && rng.chance(0.3)) b.cyl(0.3, 0.3, 0.2, 10, wx, h + 0.1, wz, 'flat', 0x1c1a18, { cutaway: true });

    if (!run) continue;

    // The two long faces of the run.
    const faces: Face[] = run === 'x'
      ? [{ nx: 0, nz: -1, px: wx, pz: wz - th / 2, axis: 'x', outward: !building || !interiorOf(x, y - 1, bid) },
        { nx: 0, nz: 1, px: wx, pz: wz + th / 2, axis: 'x', outward: !building || !interiorOf(x, y + 1, bid) }]
      : [{ nx: -1, nz: 0, px: wx - th / 2, pz: wz, axis: 'z', outward: !building || !interiorOf(x - 1, y, bid) },
        { nx: 1, nz: 0, px: wx + th / 2, pz: wz, axis: 'z', outward: !building || !interiorOf(x + 1, y, bid) }];
    const prev = run === 'x' ? i - 1 : i - W;
    const nextDoor = run === 'x' ? bld.door[i - 1] || bld.door[i + 1] : bld.door[i - W] || bld.door[i + W];
    const window = !!building && h >= 2.2 && !nextDoor && !windows.has(prev) && hash2(x, y, bid * 7 + 3) < 0.4;
    if (window) windows.add(i);

    for (const f of faces) {
      switch (kind) {
        case 'adobe':
          faceBox(b, f, 1.0, 0.36, 0.025, 0.32, 0, 'adobe', 0x9a7a58);
          if (f.outward && rng.chance(0.85)) {
            const vx = f.px + f.nx * 0.12, vz = f.pz + f.nz * 0.12;
            b.cyl(0.07, 0.07, 0.3, 6, vx, h - 0.42, vz, 'wood', DARK_WOOD, { cutaway: true, ...(f.axis === 'x' ? { rx: Math.PI / 2 } : { rz: Math.PI / 2 }) });
          }
          break;
        case 'brick':
          faceBox(b, f, 1.0, 0.14, 0.03, h - 0.55, 0, 'brick', 0x8a4a34);
          if (rng.chance(0.15)) faceBox(b, f, 0.26, 0.13, 0.02, rng.range(0.6, h - 0.9), rng.range(-0.3, 0.3), 'flat', 0x2a2420);
          break;
        case 'concrete':
          faceBox(b, f, 0.03, h - 0.3, 0.015, h / 2, 0.5, 'flat', 0x5a564e);
          faceBox(b, f, 1.0, 0.03, 0.015, h * 0.5, 0, 'flat', 0x5a564e);
          if (f.outward && outdoor && rng.chance(0.2)) b.rock(0.12, f.px + f.nx * 0.2 + rng.range(-0.3, 0.3) * (f.axis === 'x' ? 1 : 0), 0.08, f.pz + f.nz * 0.2 + rng.range(-0.3, 0.3) * (f.axis === 'z' ? 1 : 0), 0x8a8478, 0, 0.5, { cutaway: true });
          break;
        case 'wood':
          faceBox(b, f, 0.08, h - 0.1, 0.04, h / 2, 0.5, 'wood', DARK_WOOD);
          faceBox(b, f, 1.0, 0.07, 0.03, 0.4, 0, 'wood', DARK_WOOD);
          faceBox(b, f, 1.0, 0.07, 0.03, h - 0.4, 0, 'wood', DARK_WOOD);
          if (rng.chance(0.1)) faceBox(b, f, 0.12, 0.8, 0.02, 1.2, rng.range(-0.3, 0.3), 'flat', 0x1c1a18);
          break;
        case 'metal':
          for (let yy = 0.55; yy < h - 0.2; yy += 0.55) faceBox(b, f, 1.0, 0.05, 0.03, yy, 0, 'metal', DARK_METAL);
          for (let k = 0; k < 3; k++) faceBox(b, f, 0.05, 0.05, 0.03, 0.4 + k * ((h - 0.8) / 2), 0.5, 'metal', 0x2a2e30);
          break;
        case 'scrap': {
          // A collage of panels, each its own sheet, leaning a little, at their own heights.
          for (let k = 0; k < 2; k++) {
            const ph = h * rng.range(0.55, 0.98), surfP = rng.pick(['tin', 'rust', 'wood', 'metal', 'scrap'] as const);
            const col = surfP === 'wood' ? rng.pick([0x7a5a3a, 0x8a7a5a, 0x5a4a3a]) : surfP === 'rust' ? RUST : surfP === 'tin' ? rng.pick([0xb0a890, 0x9a9488, 0xc0b8a0]) : 0xa8a89a;
            faceBox(b, f, 0.5, ph, rng.range(0.03, 0.08), ph / 2 + 0.1, -0.25 + k * 0.5, surfP, col, spinOpts(f, rng.range(-0.05, 0.05)));
          }
          break;
        }
        default: break;
      }
      // Sand drifts against the foot of outside walls.
      if (outdoor && f.outward && rng.chance(0.6)) faceBox(b, f, 1.0, 0.14, 0.34, 0.02, 0, 'sand', 0xc0a880, { ...leanOpts(f, 0.35), shadow: false });
    }
    if (kind === 'scrap') {
      // Posts at the joints hold the sheets.
      if (run === 'x') b.box(0.09, h + 0.15, th + 0.12, wx + 0.5, (h + 0.15) / 2, wz, 'wood', DARK_WOOD, 0, { cutaway: true });
      else b.box(th + 0.12, h + 0.15, 0.09, wx, (h + 0.15) / 2, wz + 0.5, 'wood', DARK_WOOD, 0, { cutaway: true });
    }

    if (window) buildWindow(b, kind, th, h, wx, wz, run, faces.find((f) => f.outward), rng);
  }

  // Doorways: lintel, jambs, threshold; an awning over a building's door.
  for (let i = 0; i < bld.door.length; i++) {
    const axis = bld.door[i];
    if (!axis) continue;
    const x = i % W, y = Math.floor(i / W);
    const side = axis === 1 ? grid.get(x - 1, y) ?? grid.get(x + 1, y) : grid.get(x, y - 1) ?? grid.get(x, y + 1);
    if (!side?.def.wall || side.def.wall === 'rock' || side.def.wall === 'fence') continue;
    const kind = side.def.wall, h = side.def.wallHeight ?? 2.6;
    if (h > 3.3) continue;   // a gap in a blast wall is a gate, not a door
    const th = thickness(kind, h), wx = x + 0.5, wz = y + 0.5;
    const bid = bld.at[i], building = bid >= 0 ? bld.list[bid] : undefined;
    const framed = kind === 'adobe' || kind === 'wood' || kind === 'scrap';
    const lintelSurf: Surface = framed ? 'wood' : kind === 'metal' ? 'metal' : 'concrete';
    const lintelCol = framed ? DARK_WOOD : kind === 'metal' ? DARK_METAL : 0x9a948a;
    const along = axis === 1 ? 'x' : 'z';
    const dims = (len: number, hgt: number, dep: number) => (along === 'x' ? [len, hgt, dep] : [dep, hgt, len]) as [number, number, number];
    b.box(...dims(1.1, 0.22, th + 0.12), wx, h - 0.36, wz, lintelSurf, lintelCol, 0, { cutaway: true });
    for (const o of [-0.45, 0.45]) b.box(...dims(0.1, h - 0.47, th + 0.06), wx + (along === 'x' ? o : 0), (h - 0.47) / 2, wz + (along === 'z' ? o : 0), lintelSurf, lintelCol, 0, { cutaway: true });
    b.box(...dims(1.0, 0.05, th + 0.3), wx, 0.025, wz, 'concrete', 0x8a8478, 0, { cutaway: true, shadow: false });
    if (!building || !framed || !rng.chance(0.65)) continue;
    // Which way is out: the neighbour across the opening that is not the room.
    const outDir = along === 'x'
      ? (interiorOf(x, y + 1, bid) ? -1 : interiorOf(x, y - 1, bid) ? 1 : 0)
      : (interiorOf(x + 1, y, bid) ? -1 : interiorOf(x - 1, y, bid) ? 1 : 0);
    if (!outDir) continue;
    const sheetSurf: Surface = kind === 'scrap' ? 'tin' : 'fabric', sheetCol = kind === 'scrap' ? 0xa09888 : rng.pick([0xa89a7a, 0x8a7a5a, 0x7a6a58]);
    const ox = along === 'z' ? outDir : 0, oz = along === 'x' ? outDir : 0;
    const cx = wx + ox * (th / 2 + 0.55), cz = wz + oz * (th / 2 + 0.55);
    const tilt = along === 'x' ? { rx: outDir * 0.22 } : { rz: -outDir * 0.22 };
    b.box(...dims(1.7, 0.04, 1.1), cx, h - 0.6, cz, sheetSurf, sheetCol, 0, { cutaway: true, ...tilt });
    for (const o of [-0.75, 0.75]) {
      const px = along === 'x' ? wx + o : wx + ox * (th / 2 + 1.0), pz = along === 'x' ? wz + oz * (th / 2 + 1.0) : wz + o;
      b.cyl(0.03, 0.03, h - 0.85, 5, px, (h - 0.85) / 2, pz, 'wood', DARK_WOOD, { cutaway: true });
    }
  }
}

function buildWindow(b: GeoBuilder, kind: WallKind, th: number, h: number, wx: number, wz: number, run: 'x' | 'z', out: Face | undefined, rng: Rng): void {
  const y = Math.min(1.5, h - 0.9);
  const dims = (len: number, hgt: number, dep: number) => (run === 'x' ? [len, hgt, dep] : [dep, hgt, len]) as [number, number, number];
  const frameSurf: Surface = kind === 'brick' || kind === 'concrete' ? 'concrete' : kind === 'metal' ? 'metal' : 'paint';
  const frameCol = kind === 'brick' ? 0xd8d0c0 : kind === 'concrete' ? 0x9a948a : kind === 'metal' ? DARK_METAL : kind === 'scrap' ? 0x8a7a60 : 0xe8dcc0;
  b.box(...dims(0.84, 0.76, th + 0.02), wx, y, wz, frameSurf, frameCol, 0, { cutaway: true });
  b.box(...dims(0.66, 0.58, th + 0.08), wx, y, wz, 'flat', 0x2a3240, 0, { cutaway: true });
  b.box(...dims(0.66, 0.04, th + 0.1), wx, y, wz, frameSurf, frameCol, 0, { cutaway: true });
  if (out) faceBox(b, out, 0.92, 0.06, 0.1, y - 0.4, 0, frameSurf, frameCol);
  if (kind === 'adobe' || kind === 'wood') {
    if (out && rng.chance(0.75)) {
      const col = rng.pick([0x6a9a8a, 0xb87a4a, 0x8a9ab0, 0x9a8a60, 0x7a8a5a]);
      for (const o of [-0.56, 0.56]) faceBox(b, out, 0.3, 0.7, 0.04, y, o, 'paint', col);
    }
  } else if (kind === 'scrap') {
    if (out) for (const a of [0.45, -0.45]) faceBox(b, out, 0.95, 0.12, 0.04, y, 0, 'wood', WOOD, spinOpts(out, a));
  } else {
    for (const o of [-0.2, 0, 0.2]) b.box(...dims(0.03, 0.6, th + 0.12), wx + (run === 'x' ? o : 0), y, wz + (run === 'z' ? o : 0), 'metal', DARK_METAL, 0, { cutaway: true });
  }
}

/** The height the roof of a building begins at (nothing inside should rise above it). */
export function roofBase(b: Building): number {
  return b.roof === 'flat' ? b.height - 0.32 : b.roof === 'pitched' ? b.height - 0.1 : b.roof === 'tin' ? b.height : Infinity;
}

// --- Roofs --------------------------------------------------------------------------------------------------

/** A triangle extruded along its normal (gables), in a local frame: points in the (u, y) plane, depth along w. */
function triPrism(p: [number, number][], depth: number): THREE.BufferGeometry {
  const [a, c, d] = p;
  const hd = depth / 2;
  const v = (u: number, y: number, w: number) => [u, y, w];
  const tri = (p0: number[], p1: number[], p2: number[]) => [...p0, ...p1, ...p2];
  const A0 = v(a[0], a[1], hd), C0 = v(c[0], c[1], hd), D0 = v(d[0], d[1], hd);
  const A1 = v(a[0], a[1], -hd), C1 = v(c[0], c[1], -hd), D1 = v(d[0], d[1], -hd);
  const pos = [
    ...tri(A0, C0, D0), ...tri(A1, D1, C1),
    ...tri(A0, A1, C1), ...tri(A0, C1, C0),
    ...tri(C0, C1, D1), ...tri(C0, D1, D0),
    ...tri(D0, D1, A1), ...tri(D0, A1, A0),
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

export function buildRoofs(b: GeoBuilder, grid: Grid, map: MapDef, bld: Buildings, rng: Rng, bldBase = 0): void {
  if (map.ambience.indoor) return;
  const W = grid.width;
  for (const bd of bld.list) {
    if (bd.roof === 'none') continue;
    const id = bd.id, h = bd.height, th = thickness(bd.kind, h);
    const X0 = bd.x0, X1 = bd.x1 + 1, Z0 = bd.y0, Z1 = bd.y1 + 1;
    const cover = new Set<number>([...bd.interior, ...bd.doors]);
    const isRing = (x: number, y: number) => grid.inBounds(x, y) && bd.ring.includes(y * W + x);

    if (bd.roof === 'flat') {
      const surf: Surface = bd.kind === 'adobe' ? 'adobe' : 'concrete';
      const base = bd.kind === 'adobe' ? 0x9a8060 : bd.kind === 'brick' ? 0x6a6660 : 0x8a8478;
      const col = new THREE.Color(base).multiplyScalar(rng.range(0.9, 1.08)).getHex();
      const top = h - 0.2;
      const ext = 0.5 - th / 2 + 0.05;
      for (const i of cover) {
        const x = i % W, y = Math.floor(i / W);
        const xa = x - (isRing(x - 1, y) ? ext : 0), xb = x + 1 + (isRing(x + 1, y) ? ext : 0);
        const za = y - (isRing(x, y - 1) ? ext : 0), zb = y + 1 + (isRing(x, y + 1) ? ext : 0);
        b.box(xb - xa, 0.12, zb - za, (xa + xb) / 2, top - 0.06, (za + zb) / 2, surf, col, 0, { cutaway: true, building: id + bldBase, jitter: 0 });
      }
      roofClutter(b, bd, grid, top, rng, bd.kind === 'concrete' ? 'tech' : 'home', bldBase);
    } else if (bd.roof === 'pitched') {
      const alongX = X1 - X0 >= Z1 - Z0;
      const L = alongX ? X1 - X0 : Z1 - Z0, span = alongX ? Z1 - Z0 : X1 - X0;
      const o = 0.35, rise = Math.min(2.0, span * 0.26), a = Math.atan(rise / (span / 2));
      const hh = span / 2 + o, vd = hh * Math.tan(a), sl = hh / Math.cos(a);
      const ridgeY = h - 0.05 + rise, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
      const col = rng.pick([0x6a4e34, 0x5a4a3a, 0x7a5a40]);
      for (const sgn of [-1, 1]) {
        const off = (sgn * hh) / 2, y = ridgeY - vd / 2;
        if (alongX) b.box(L + 2 * o, 0.1, sl, cx, y, cz + off, 'wood', col, 0, { cutaway: true, building: id + bldBase, rx: sgn * a });
        else b.box(sl, 0.1, L + 2 * o, cx + off, y, cz, 'wood', col, 0, { cutaway: true, building: id + bldBase, rz: -sgn * a });
      }
      if (alongX) b.box(L + 2 * o, 0.08, 0.22, cx, ridgeY + 0.02, cz, 'wood', DARK_WOOD, 0, { cutaway: true, building: id + bldBase });
      else b.box(0.22, 0.08, L + 2 * o, cx, ridgeY + 0.02, cz, 'wood', DARK_WOOD, 0, { cutaway: true, building: id + bldBase });
      // Gables close the ends, in the plane of the end walls.
      for (const end of [-1, 1]) {
        const g = triPrism([[-span / 2, h - 0.02], [span / 2, h - 0.02], [0, ridgeY]], th);
        const m = new THREE.Matrix4();
        if (alongX) m.compose(new THREE.Vector3(end > 0 ? X1 - 0.5 : X0 + 0.5, 0, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1));
        else m.compose(new THREE.Vector3(cx, 0, end > 0 ? Z1 - 0.5 : Z0 + 0.5), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        b.add(g, SURF[bd.kind], bd.tint, m, { cutaway: true, building: id + bldBase });
      }
      if (rng.chance(0.6)) {
        const px = alongX ? cx + rng.range(-L / 4, L / 4) : cx + 0.4, pz = alongX ? cz + 0.4 : cz + rng.range(-L / 4, L / 4);
        b.cyl(0.1, 0.1, 1.0, 6, px, ridgeY + 0.2, pz, 'metal', DARK_METAL, { cutaway: true, building: id + bldBase });
      }
    } else if (bd.roof === 'tin') {
      const alongX = X1 - X0 >= Z1 - Z0;
      const L = alongX ? X1 - X0 : Z1 - Z0, span = alongX ? Z1 - Z0 : X1 - X0;
      const o = 0.3, rise = Math.min(0.9, span * 0.12), a = Math.atan(rise / span);
      const sl = (span + 2 * o) / Math.cos(a);
      const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, y = h + 0.06 + rise / 2;
      const col = rng.pick([0xb0a890, 0x9a9488, 0xa8a090]);
      // High side toward -z (or -x): the sheet drops across the short span.
      if (alongX) b.box(L + 2 * o, 0.06, sl, cx, y, cz, 'tin', col, 0, { cutaway: true, building: id + bldBase, rx: a });
      else b.box(sl, 0.06, L + 2 * o, cx, y, cz, 'tin', col, 0, { cutaway: true, building: id + bldBase, rz: -a });
      // The gap under the high edge, boarded; the end triangles too.
      if (alongX) b.box(L, rise + 0.1, th, cx, h + rise / 2, Z0 + 0.5, 'scrap', 0x6a5a48, 0, { cutaway: true, building: id + bldBase });
      else b.box(th, rise + 0.1, L, X0 + 0.5, h + rise / 2, cz, 'scrap', 0x6a5a48, 0, { cutaway: true, building: id + bldBase });
      for (const end of [-1, 1]) {
        const g = triPrism([[-span / 2, h], [span / 2, h], [-span / 2, h + rise]], th);
        const m = new THREE.Matrix4();
        if (alongX) m.compose(new THREE.Vector3(end > 0 ? X1 - 0.5 : X0 + 0.5, 0, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1));
        else m.compose(new THREE.Vector3(cx, 0, end > 0 ? Z1 - 0.5 : Z0 + 0.5), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        b.add(g, 'scrap', 0x6a5a48, m, { cutaway: true, building: id + bldBase });
      }
      // Tyres and rocks hold the sheet down.
      const n = 3 + Math.floor(rng.next() * 3);
      for (let k = 0; k < n; k++) {
        const u = rng.range(-L / 2 + 0.6, L / 2 - 0.6), v = rng.range(-span / 2 + 0.5, span / 2 - 0.5);
        const px = alongX ? cx + u : cx + v, pz = alongX ? cz + v : cz + u;
        const yy = h + 0.09 + rise / 2 - (v / span) * rise;
        if (rng.chance(0.6)) b.cyl(0.3, 0.3, 0.18, 10, px, yy + 0.09, pz, 'flat', 0x1c1a18, { cutaway: true, building: id + bldBase, ...(alongX ? { rx: a } : { rz: -a }) });
        else b.rock(0.16, px, yy + 0.08, pz, 0x8a7a5a, 0, 0.6, { cutaway: true, building: id + bldBase });
      }
    }
  }
}

function roofClutter(b: GeoBuilder, bd: Building, grid: Grid, top: number, rng: Rng, style: 'tech' | 'home', bldBase = 0): void {
  const W = grid.width, id = bd.id;
  const spots = bd.interior.filter((i) => !bd.doors.includes(i));
  const n = Math.min(spots.length, 1 + Math.floor(rng.next() * 3));
  for (let k = 0; k < n; k++) {
    const i = rng.pick(spots);
    const x = (i % W) + 0.5, z = Math.floor(i / W) + 0.5, y = top;
    const r = rng.next();
    if (r < 0.25) {
      b.cyl(0.5, 0.5, 0.9, 10, x, y + 0.65, z, 'rust', 0x8a6a4a, { cutaway: true, building: id + bldBase });
      b.cyl(0.52, 0.52, 0.06, 10, x, y + 0.95, z, 'metal', DARK_METAL, { cutaway: true, building: id + bldBase });
      for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) b.box(0.06, 0.2, 0.06, x + dx, y + 0.1, z + dz, 'metal', DARK_METAL, 0, { cutaway: true, building: id + bldBase });
    } else if (r < 0.45) {
      b.box(1.3, 0.05, 1.0, x, y + 0.04, z, 'fabric', rng.pick([0x6b6b45, 0x7a6a58, 0x5a6a6a]), rng.next() * 0.6, { cutaway: true, building: id + bldBase });
      b.rock(0.1, x + 0.5, y + 0.1, z + 0.3, 0x8a7a5a, 0, 0.6, { cutaway: true, building: id + bldBase });
    } else if (r < 0.6) {
      b.cyl(0.12, 0.12, 0.5, 6, x, y + 0.25, z, 'metal', 0x6a7070, { cutaway: true, building: id + bldBase });
      b.cyl(0.2, 0.12, 0.12, 6, x, y + 0.55, z, 'metal', DARK_METAL, { cutaway: true, building: id + bldBase });
    } else if (r < 0.75) {
      b.cyl(0.02, 0.02, 2.2, 4, x, y + 1.1, z, 'metal', DARK_METAL, { cutaway: true, building: id + bldBase });
      b.box(0.6, 0.02, 0.02, x, y + 2.0, z, 'metal', DARK_METAL, 0, { cutaway: true, building: id + bldBase });
    } else if (style === 'tech' && r < 0.9) {
      b.box(1.2, 0.05, 0.8, x, y + 0.42, z, 'metal', 0x24303a, 0, { cutaway: true, building: id + bldBase, rx: 0.4 });
      b.box(0.06, 0.4, 0.06, x, y + 0.2, z + 0.3, 'metal', DARK_METAL, 0, { cutaway: true, building: id + bldBase });
    } else {
      const s = 0.6;
      b.box(s, s, s, x, y + s / 2, z, 'wood', WOOD, rng.next() * 0.5, { cutaway: true, building: id + bldBase });
    }
  }
}
