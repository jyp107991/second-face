import { WORLD_MAP } from '../../content';
import { WORLD_SCALE } from '../../content/world/sites';
import { fbm } from './terrain';

/**
 * Ways across the land: the roads and tracks of the world map's routes, the Line's rails, the river the barges
 * run, and the sea's edge. Each is a polyline in world metres with a surface and a width; the terrain chunks lay
 * the surface along it, the heightfield carves the river and the sea, and walking follows it over steep ground.
 */
export type WayKind = 'road' | 'track' | 'rough' | 'rail' | 'river';
export interface Way { kind: WayKind; key: string; width: number; pts: [number, number][]; bbox: [number, number, number, number]; /** The places it joins (a route), or the network it belongs to. */ a?: string; b?: string; net?: string }

const SURFACE: Record<string, { kind: WayKind; key: string; width: number } | undefined> = {
  road: { kind: 'road', key: 'asphalt', width: 5 },
  track: { kind: 'track', key: 'dirt', width: 3.4 },
  rough: { kind: 'rough', key: 'gravel', width: 2.4 },
  glass: { kind: 'rough', key: 'burned', width: 2.6 },
  marsh: { kind: 'track', key: 'mud', width: 3 },
  mountain: { kind: 'rough', key: 'gravel', width: 2.6 },
};

/** The sea lies west of this line (metres): a ragged coast at about 32 km, further out where the shore is low. */
export function coastX(wz: number): number {
  return 32 * WORLD_SCALE + (fbm(wz / 420 + 3, 0.5, 4242, 3) - 0.5) * 2 * 110;
}

const km = (id: string): [number, number] | undefined => {
  const l = WORLD_MAP.locations[id];
  return l ? [l.x * WORLD_SCALE, l.y * WORLD_SCALE] : undefined;
};

/** A way between two points with a wander in it (the land was never ruled straight). */
function bend(a: [number, number], b: [number, number], seed: number, wander = 0.09): [number, number][] {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.min(14, Math.round(len / 60)));
  const px = -dz / len, pz = dx / len;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ease = Math.sin(t * Math.PI);
    const off = (fbm(t * 6 + seed, seed * 0.37, 700 + seed, 2) - 0.5) * 2 * wander * len * ease;
    pts.push([a[0] + dx * t + px * off, a[1] + dz * t + pz * off]);
  }
  return pts;
}

function bboxOf(pts: [number, number][], pad: number): [number, number, number, number] {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  return [x0 - pad, z0 - pad, x1 + pad, z1 + pad];
}

let cache: Way[] | undefined;

/** Every way in the world (built once). Routes to the moving camp are left out: it is reached across the open pan. */
export function ways(): Way[] {
  if (cache) return cache;
  const out: Way[] = [];
  let seed = 1;
  for (const r of WORLD_MAP.routes) {
    seed++;
    if (r.a === 'wheel' || r.b === 'wheel') continue;
    const s = SURFACE[r.terrain];
    const a = km(r.a), b = km(r.b);
    if (!s || !a || !b) continue;
    const pts = bend(a, b, seed);
    out.push({ kind: s.kind, key: s.key, width: s.width, pts, bbox: bboxOf(pts, s.width + 6), a: r.a, b: r.b });
  }
  for (const n of Object.values(WORLD_MAP.networks)) {
    if (n.kind !== 'rail' && n.kind !== 'barge') continue;
    const stops = n.stops.map(km).filter((p): p is [number, number] => !!p);
    if (n.kind === 'barge') {
      // The river runs on past the last quay to the sea.
      const last = stops[stops.length - 1];
      stops.push([coastX(last[1]) - 40, last[1] + 60]);
    }
    for (let i = 0; i + 1 < stops.length; i++) {
      seed++;
      const pts = bend(stops[i], stops[i + 1], seed, n.kind === 'rail' ? 0.04 : 0.12);
      if (n.kind === 'rail') out.push({ kind: 'rail', key: 'gravel', width: 3.6, pts, bbox: bboxOf(pts, 10), net: n.id });
      else out.push({ kind: 'river', key: 'mud', width: 18, pts, bbox: bboxOf(pts, 40), net: n.id });
    }
  }
  cache = out;
  return out;
}

/** The ways whose reach touches a rectangle. */
export function waysIn(x0: number, z0: number, x1: number, z1: number): Way[] {
  return ways().filter((w) => w.bbox[0] < x1 && w.bbox[2] > x0 && w.bbox[1] < z1 && w.bbox[3] > z0);
}

/** Distance from a point to a way's line. */
export function distToWay(w: Way, x: number, z: number): number {
  const [bx0, bz0, bx1, bz1] = w.bbox;
  if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return Infinity;
  let best = Infinity;
  const p = w.pts;
  for (let i = 0; i + 1 < p.length; i++) {
    const ax = p[i][0], az = p[i][1], bx = p[i + 1][0], bz = p[i + 1][1];
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    const qx = ax + dx * t - x, qz = az + dz * t - z;
    const d = qx * qx + qz * qz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/** How much of a way's surface lies at a point (1 on it, fading over its verge). */
export function wayWeight(w: Way, x: number, z: number): number {
  const d = distToWay(w, x, z);
  const half = w.width / 2;
  if (d >= half + w.width * 0.7) return 0;
  return 1 - smooth((d - half * 0.6) / (half * 0.4 + w.width * 0.7));
}

const riverWays = () => ways().filter((w) => w.kind === 'river');

/**
 * What the water takes from the land: the sea beyond the coast and the river's bed. Returns the height to use.
 */
export function carve(h: number, wx: number, wz: number): number {
  // The sea: the ground falls away west of the coast.
  const c = coastX(wz);
  if (wx < c + 24) {
    const t = smooth((c + 24 - wx) / 60);
    const sea = -2.2 - Math.max(0, c - wx) * 0.03;
    h = h + (Math.min(h, sea) - h) * t;
  }
  // The river: a bed below the water, banks easing down to it.
  for (const r of riverWays()) {
    const d = distToWay(r, wx, wz);
    const half = r.width / 2, bank = 11;
    if (d >= half + bank) continue;
    const bed = -1.9;
    if (d <= half) h = Math.min(h, bed);
    else { const t = smooth((d - half) / bank); h = Math.min(h, bed + (h - bed) * t); }
  }
  return h;
}

/** A road, track or rail underfoot (walked whatever the slope). */
export function onWay(x: number, z: number): boolean {
  for (const w of ways()) {
    if (w.kind === 'river') continue;
    if (wayWeight(w, x, z) > 0.45) return true;
  }
  return false;
}

/** The way joining two places, if one is drawn (either direction). */
export function wayBetween(a: string, b: string): Way | undefined {
  return ways().find((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}

/** Points of the way from `a` to `b` in walking order (a straight line when none is drawn). */
export function wayPoints(a: string, b: string): [number, number][] {
  const w = wayBetween(a, b);
  if (w) return w.a === a ? w.pts.slice() : w.pts.slice().reverse();
  const pa = km(a), pb = km(b);
  return pa && pb ? [pa, pb] : [];
}

/** Metres walked along the way from `a` to `b`. */
export function wayMetres(a: string, b: string): number {
  const pts = wayPoints(a, b);
  let m = 0;
  for (let i = 0; i + 1 < pts.length; i++) m += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return m;
}

/** Walking pace in metres per second, and the clock's pace on a journey: one real second is one game minute. */
export const WALK_MPS = 3.5;
export const JOURNEY_CLOCK = 3;
/** Game hours a walk takes along the ways of a trip's legs. */
export function journeyHours(legs: { from: string; to: string }[]): number {
  let m = 0;
  for (const l of legs) m += wayMetres(l.from, l.to);
  return Math.round((m / WALK_MPS / 60) * 10) / 10;
}
