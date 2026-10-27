import { REGIONS } from '../../content';
import { WORLD_SCALE, WORLD_W } from '../../content/world/sites';
import { openSites, type SitePlacement } from './sites';
import { fbm } from './terrain';
import { carve, onWay } from './ways';

/**
 * The lie of the land: one continuous heightfield over the world, in metres. Each region has its own relief
 * (dunes in the Sallow, a near-flat pan on the Flats, plains along the Line, a shore that dips under the sea,
 * mountains in the Teeth, craters in the Ashlands, hills in the Wet) and the reliefs blend across the borders.
 * Hand-built places stand on pads: inside a place the ground is level at the place's height, and the terrain
 * round it eases to that height over `PAD` metres. Water lies at `WATER_LEVEL`; steep ground is not walked.
 */

export const WATER_LEVEL = 0;
/** How far from a place's edge the terrain eases to the place's level. */
export const PAD = 28;
/** Steeper than this (rise over run) is not walked. */
export const MAX_SLOPE = 0.75;

interface Relief {
  base: number; amp: number; freq: number; octaves: number;
  /** Relief the eye reads at walking scale: dune ridges, rock steps, hummocks (amplitude in metres, wavelength in metres; `stretch` lengthens it along x, as wind does). */
  mid?: { amp: number; wave: number; ridged?: boolean; stretch?: number };
  /** Fine ripples (sand ripples, furrows, scree): amplitude in metres over ~24 m and ~7 m. */
  detail: number;
  ridged?: boolean; craters?: boolean;
}

const RELIEF: Record<string, Relief> = {
  sallow: { base: 9, amp: 7, freq: 1 / 240, octaves: 4, mid: { amp: 5.2, wave: 44, ridged: true, stretch: 2.4 }, detail: 0.6 },
  glass_flats: { base: 7, amp: 1.6, freq: 1 / 420, octaves: 3, mid: { amp: 0.5, wave: 60 }, detail: 0.2 },
  rail_corridor: { base: 11, amp: 3.5, freq: 1 / 320, octaves: 4, mid: { amp: 2.6, wave: 55 }, detail: 0.35 },
  drowned_shore: { base: 0.6, amp: 3.2, freq: 1 / 260, octaves: 4, mid: { amp: 1.4, wave: 48 }, detail: 0.25 },
  meridian: { base: 3.5, amp: 1.2, freq: 1 / 300, octaves: 3, mid: { amp: 0.5, wave: 50 }, detail: 0.15 },
  teeth: { base: 36, amp: 70, freq: 1 / 1100, octaves: 5, mid: { amp: 6, wave: 52, ridged: true }, detail: 1.0, ridged: true },
  ashlands: { base: 13, amp: 9, freq: 1 / 210, octaves: 4, mid: { amp: 2.6, wave: 42, ridged: true }, detail: 0.6, craters: true },
  northern_wet: { base: 15, amp: 10, freq: 1 / 360, octaves: 4, mid: { amp: 4.2, wave: 50 }, detail: 0.4 },
};

function relief(r: Relief, wx: number, wz: number, seed: number): number {
  let v = fbm(wx * r.freq, wz * r.freq, seed, r.octaves);
  if (r.ridged) { v = 1 - Math.abs(v * 2 - 1); v = v * v; }
  // Layered noise averages toward the middle; the factor gives the relief its stated span.
  let h = r.base + (v - 0.5) * 3 * r.amp;
  if (r.mid) {
    const sx = r.mid.stretch ?? 1;
    let m = fbm(wx / (r.mid.wave * sx) + 31, wz / r.mid.wave - 17, seed + 21, 2);
    if (r.mid.ridged) m = 1 - Math.abs(2 * m - 1);
    h += (m - 0.5) * 2 * r.mid.amp;
  }
  // Fine relief the eye reads at walking scale: ripples of ~24 m and ~7 m.
  h += (fbm(wx / 24 + 9, wz / 24 - 4, seed + 5, 2) - 0.5) * 2 * r.detail + (fbm(wx / 7 - 3, wz / 7 + 8, seed + 9, 1) - 0.5) * r.detail * 1.2;
  if (r.craters) {
    const c = fbm(wx * r.freq * 2.3 + 50, wz * r.freq * 2.3 - 20, seed + 77, 2);
    if (c > 0.62) h -= (c - 0.62) * 60;
  }
  return h;
}

/** Blend band at region borders, metres walked (about 15 km on the map). */
const BLEND = 180;

/** The natural ground before any place is set in it. */
export function rawHeight(wx: number, wz: number): number {
  const kx = wx / WORLD_SCALE, ky = wz / WORLD_SCALE;
  let sum = 0, wsum = 0;
  for (const r of Object.values(REGIONS)) {
    const [x0, y0, x1, y1] = r.bounds;
    const dx = Math.max(x0 - kx, 0, kx - x1), dy = Math.max(y0 - ky, 0, ky - y1);
    const d = Math.hypot(dx, dy) * WORLD_SCALE;
    if (d >= BLEND) continue;
    const t = 1 - d / BLEND;
    const w = t * t * (3 - 2 * t);
    const def = RELIEF[r.id] ?? RELIEF.sallow;
    sum += w * relief(def, wx, wz, 1300 + r.id.length * 13);
    wsum += w;
  }
  const h = wsum <= 0 ? relief(RELIEF.sallow, wx, wz, 1300) : sum / wsum;
  return carve(h, wx, wz);
}

const levels = new Map<string, number>();

/** The height a place stands at (its pad): the natural ground under its centre, so it sits in the land. */
export function siteLevel(place: SitePlacement): number {
  if (place.kind === 'cell') return 0;
  let l = levels.get(place.id);
  if (l === undefined) {
    // A little above the natural mean so the pad reads as a rise, never as a pit; and always dry ground.
    l = Math.max(WATER_LEVEL + 0.8, rawHeight(place.x + place.w / 2, place.z + place.h / 2) + 0.4);
    levels.set(place.id, l);
  }
  return l;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** The ground height at a world point: the natural relief, eased onto the pads of the places near it. */
export function heightAt(wx: number, wz: number): number {
  let h = rawHeight(wx, wz);
  for (const p of openSites()) {
    const dx = Math.max(p.x - wx, 0, wx - (p.x + p.w)), dz = Math.max(p.z - wz, 0, wz - (p.z + p.h));
    if (dx >= PAD || dz >= PAD) continue;
    const d = Math.hypot(dx, dz);
    if (d >= PAD) continue;
    const t = smooth(1 - d / PAD);
    h = h + (siteLevel(p) - h) * t;
  }
  return h;
}

/** Rise over run at a point (central differences over 2 m). */
export function slopeAt(wx: number, wz: number): number {
  const e = 1;
  const dx = (heightAt(wx + e, wz) - heightAt(wx - e, wz)) / (2 * e);
  const dz = (heightAt(wx, wz + e) - heightAt(wx, wz - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

/** Open ground the player may walk on: above the water, not too steep. */
export function walkableAt(wx: number, wz: number): boolean {
  if (heightAt(wx, wz) < WATER_LEVEL + 0.15) return false;
  return slopeAt(wx, wz) < MAX_SLOPE;
}

/** Normal of the ground at a point (for the terrain mesh). */
export function normalAt(wx: number, wz: number, out: [number, number, number] = [0, 1, 0]): [number, number, number] {
  const e = 1;
  const dx = heightAt(wx + e, wz) - heightAt(wx - e, wz);
  const dz = heightAt(wx, wz + e) - heightAt(wx, wz - e);
  const nx = -dx / (2 * e), nz = -dz / (2 * e);
  const l = Math.hypot(nx, 1, nz);
  out[0] = nx / l; out[1] = 1 / l; out[2] = nz / l;
  return out;
}

// --- per-tile caches: pathing asks thousands of times a second ------------------------------------------------
const tileH = new Map<number, number>();
const tileW = new Map<number, boolean>();
const CACHE_MAX = 600000;

/** Ground height at a tile's centre (cached). */
export function tileHeight(tx: number, tz: number): number {
  const k = tz * WORLD_W + tx;
  let h = tileH.get(k);
  if (h === undefined) {
    if (tileH.size > CACHE_MAX) tileH.clear();
    h = heightAt(tx + 0.5, tz + 0.5);
    tileH.set(k, h);
  }
  return h;
}

/** Whether a tile of open ground can be walked: above the water, not too steep (from the cached tile heights). */
export function tileWalkable(tx: number, tz: number): boolean {
  const k = tz * WORLD_W + tx;
  let w = tileW.get(k);
  if (w === undefined) {
    if (tileW.size > CACHE_MAX) tileW.clear();
    const h = tileHeight(tx, tz);
    if (h < WATER_LEVEL + 0.15) w = false;
    else {
      const dx = (tileHeight(tx + 1, tz) - tileHeight(tx - 1, tz)) / 2, dz = (tileHeight(tx, tz + 1) - tileHeight(tx, tz - 1)) / 2;
      w = Math.hypot(dx, dz) < MAX_SLOPE || onWay(tx + 0.5, tz + 0.5);
    }
    tileW.set(k, w);
  }
  return w;
}
