import * as THREE from 'three';
import { REGIONS } from '../../content';
import { WORLD_SCALE } from '../../content/world/sites';
import type { AmbienceDef, FloorKind } from '../data/types';
import type { GroundLayers } from '../assets/pbr';
import { FALLBACK, splatMaterial } from '../scene/ground';
import type { Mood } from './weather';

/**
 * The ground between the places: one terrain by region climate, streamed in chunks round the player. Each region
 * blends up to four surfaces by noise (salt pans and cracked earth in the Sallow, fused glass and burned ground on
 * the Flats, grass and gravel along the Line, mud and wet sand on the Shore, grey rubble round the city, rock and
 * snow in the Teeth, ash and craters, forest floor in the Wet). Flat for now; the heightfield follows in U2b.
 */

export const CHUNK = 128;
const STEP = 2;

export interface BiomeDef {
  /** Material library keys, up to four (the first is the base). */
  layers: string[];
  /** Footstep and scatter surface. */
  floor: FloorKind;
  ambience: AmbienceDef;
}

const wild = (mood: Mood, fogColor: number, fogDensity: number, dust: number, sound?: string): AmbienceDef => ({ indoor: false, fogColor, fogDensity, dust, mood, sound });

export const BIOMES: Record<string, BiomeDef> = {
  sallow: { layers: ['sand', 'cracked', 'dirt', 'salt'], floor: 'sand', ambience: wild('haze', 0xd2c4ae, 0.005, 0.45, 'wind') },
  glass_flats: { layers: ['sand', 'burned', 'cracked', 'rubble'], floor: 'sand', ambience: wild('bright', 0xdcd4c4, 0.004, 0.35, 'wind') },
  rail_corridor: { layers: ['grass_dry', 'dirt', 'gravel', 'grass'], floor: 'dirt', ambience: wild('peaceful', 0xd0d4cc, 0.005, 0.15, 'wind') },
  drowned_shore: { layers: ['coast', 'mud', 'grass_dry', 'moss'], floor: 'dirt', ambience: wild('haze', 0xc4ccd0, 0.007, 0.1, 'wind') },
  meridian: { layers: ['grass_dry', 'rubble', 'mud', 'asphalt'], floor: 'dirt', ambience: wild('grim', 0xa8aab0, 0.006, 0.3, 'wind') },
  teeth: { layers: ['rock', 'gravel', 'snow', 'grass_dry'], floor: 'dirt', ambience: wild('bright', 0xd8e0ec, 0.004, 0.1, 'wind') },
  ashlands: { layers: ['burned', 'cracked', 'rubble', 'rock'], floor: 'rubble', ambience: wild('grim', 0x9a9088, 0.007, 0.5, 'wind') },
  northern_wet: { layers: ['forest', 'mud', 'grass', 'moss'], floor: 'dirt', ambience: wild('peaceful', 0xb8c4b8, 0.007, 0.05, 'wind') },
};

/** The region a world tile lies in (by the world map's km bounds; the nearest when outside all of them). */
export function regionAt(wx: number, wz: number): string {
  const kx = wx / WORLD_SCALE, ky = wz / WORLD_SCALE;
  let best = 'sallow', bestD = Infinity;
  for (const r of Object.values(REGIONS)) {
    const [x0, y0, x1, y1] = r.bounds;
    if (kx >= x0 && kx < x1 && ky >= y0 && ky < y1) return r.id;
    const dx = Math.max(x0 - kx, 0, kx - x1), dy = Math.max(y0 - ky, 0, ky - y1);
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = r.id; }
  }
  return best;
}

export function biomeAt(wx: number, wz: number): BiomeDef { return BIOMES[regionAt(wx, wz)] ?? BIOMES.sallow; }

// --- noise ---------------------------------------------------------------------------------------------------
function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t: number): number { return t * t * (3 - 2 * t); }
export function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
export function fbm(x: number, y: number, seed: number, oct = 3): number {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(x * f, y * f, seed + i * 31); norm += amp; amp *= 0.5; f *= 2.1; }
  return sum / norm;
}

/** Layer weights at a world point: the base surface everywhere, the others in patches of different grain. */
export function layerWeights(wx: number, wz: number, n: number): number[] {
  const w = new Array(n).fill(0);
  w[0] = 0.55;
  const scales = [0.011, 0.023, 0.006];
  for (let i = 1; i < n; i++) {
    const v = fbm(wx * scales[(i - 1) % 3] + i * 100, wz * scales[(i - 1) % 3] - i * 70, 900 + i * 7);
    w[i] = Math.max(0, (v - 0.48) * 2.6) ** 1.4;
  }
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / sum);
}

export function chunkKey(cx: number, cz: number): string { return `${cx},${cz}`; }

/** Build one chunk's ground mesh (vertices every 2 m), slightly below the sites so their floors win. */
export function buildChunk(cx: number, cz: number, layersByRegion: (region: string) => GroundLayers | undefined): THREE.Mesh {
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const n = CHUNK / STEP + 1;
  const count = n * n;
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const aLayer = new Float32Array(count * 4), aWeight = new Float32Array(count * 4);
  const region = regionAt(x0 + CHUNK / 2, z0 + CHUNK / 2);
  const biome = BIOMES[region] ?? BIOMES.sallow;
  const layers = layersByRegion(region);
  const keys = layers?.keys ?? biome.layers;
  const c = new THREE.Color();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const wx = x0 + i * STEP, wz = z0 + j * STEP;
      pos[k * 3] = wx; pos[k * 3 + 1] = -0.06; pos[k * 3 + 2] = wz;
      nrm[k * 3 + 1] = 1;
      const w = layerWeights(wx, wz, keys.length);
      c.setRGB(0, 0, 0);
      for (let s = 0; s < 4; s++) {
        aLayer[k * 4 + s] = s < keys.length ? s : 0;
        aWeight[k * 4 + s] = s < keys.length ? w[s] : 0;
        if (s < keys.length) c.add(new THREE.Color(FALLBACK[keys[s]] ?? 0x9a8a6a).multiplyScalar(w[s]));
      }
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
  }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6);
  let o = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
    idx[o++] = a; idx[o++] = d; idx[o++] = b; idx[o++] = b; idx[o++] = d; idx[o++] = e;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aLayer', new THREE.BufferAttribute(aLayer, 4));
  geo.setAttribute('aWeight', new THREE.BufferAttribute(aWeight, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, layers ? splatMaterial(layers) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.name = `chunk ${cx},${cz}`;
  return mesh;
}
