import * as THREE from 'three';
import { hash2 } from '../core/rng';

/** Procedural surface textures (canvas-generated, cached, tileable). */
export type SurfaceKind =
  | 'sand' | 'dirt' | 'concrete' | 'metal' | 'wood' | 'grate' | 'asphalt' | 'rubble' | 'tile'
  | 'brick' | 'rust' | 'rock' | 'fabric' | 'scrap' | 'paint' | 'adobe' | 'tin' | 'water';

const SIZE = 128;
const cache = new Map<SurfaceKind, THREE.Texture>();

function smooth(t: number) { return t * t * (3 - 2 * t); }

/** Tileable value noise at given period. */
function vnoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const w = (a: number) => ((a % period) + period) % period;
  const a = hash2(w(xi), w(yi), seed), b = hash2(w(xi + 1), w(yi), seed);
  const c = hash2(w(xi), w(yi + 1), seed), d = hash2(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

function fbm(u: number, v: number, base: number, seed: number, oct = 4): number {
  let sum = 0, amp = 0.5, f = base, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(u * f, v * f, f, seed + i * 17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

type Shader = (u: number, v: number, px: number, py: number) => [number, number, number];

const mix = (a: number[], b: number[], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const SHADERS: Record<SurfaceKind, Shader> = {
  sand: (u, v) => {
    const n = fbm(u, v, 4, 1), d = fbm(u, v, 16, 2);
    const ripple = Math.sin((v + n * 0.3) * 40) * 0.5 + 0.5;
    return mix([168, 140, 100], [201, 172, 126], n * 0.7 + ripple * 0.15 + d * 0.15);
  },
  dirt: (u, v) => {
    const n = fbm(u, v, 4, 3), d = hash2(Math.floor(u * 64), Math.floor(v * 64), 4);
    const c = mix([96, 78, 58], [140, 114, 84], n);
    return d > 0.93 ? mix(c, [70, 60, 50], 0.6) : c;
  },
  concrete: (u, v) => {
    const n = fbm(u, v, 4, 5), s = hash2(Math.floor(u * 128), Math.floor(v * 128), 6);
    const crack = Math.abs(fbm(u, v, 3, 7, 3) - 0.5) < 0.012 ? 0.55 : 1;
    const c = mix([118, 112, 102], [156, 150, 138], n);
    const k = (s > 0.9 ? 0.88 : 1) * crack;
    return [c[0] * k, c[1] * k, c[2] * k];
  },
  metal: (u, v) => {
    const n = fbm(u, v, 8, 8);
    const seam = (u * 2) % 1 < 0.02 || (v * 2) % 1 < 0.02 ? 0.6 : 1;
    const rivet = (() => {
      const fu = (u * 2) % 1, fv = (v * 2) % 1;
      const near = (a: number) => Math.abs(a - 0.06) < 0.025 || Math.abs(a - 0.94) < 0.025;
      return near(fu) && near(fv) ? 1.3 : 1;
    })();
    const rust = smooth(Math.max(0, fbm(u, v, 4, 9) - 0.55) * 4);
    const c = mix(mix([92, 98, 100], [128, 132, 130], n), [124, 70, 38], Math.min(1, rust));
    const k = seam * rivet;
    return [c[0] * k, c[1] * k, c[2] * k];
  },
  wood: (u, v) => {
    const plank = Math.floor(v * 4);
    const off = hash2(plank, 0, 10);
    const grain = Math.sin((u * 6 + off * 10 + fbm(u, v, 4, 11) * 2) * 12) * 0.5 + 0.5;
    const gap = (v * 4) % 1 < 0.05 ? 0.45 : 1;
    const tone = 0.8 + off * 0.35;
    const c = mix([86, 62, 40], [134, 100, 66], grain * 0.5 + fbm(u, v, 8, 12) * 0.5);
    return [c[0] * gap * tone, c[1] * gap * tone, c[2] * gap * tone];
  },
  grate: (u, v) => {
    const fu = (u * 8) % 1, fv = (v * 8) % 1;
    const bar = fu < 0.2 || fv < 0.2;
    const n = fbm(u, v, 8, 13);
    return bar ? mix([90, 94, 92], [120, 118, 110], n) : [24, 22, 20];
  },
  asphalt: (u, v) => {
    const n = fbm(u, v, 8, 14), s = hash2(Math.floor(u * 128), Math.floor(v * 128), 15);
    const line = Math.abs(u - 0.5) < 0.015 && (v * 4) % 1 < 0.5 ? 1 : 0;
    const c = mix([46, 46, 46], [72, 70, 66], n * 0.7 + s * 0.3);
    return line ? mix(c, [170, 150, 90], 0.6) : c;
  },
  rubble: (u, v) => {
    const n = fbm(u, v, 6, 16);
    const cell = hash2(Math.floor(u * 10 + n * 2), Math.floor(v * 10 + n * 2), 17);
    return mix([84, 78, 70], [150, 140, 126], cell * 0.6 + n * 0.4);
  },
  tile: (u, v) => {
    const fu = (u * 4) % 1, fv = (v * 4) % 1;
    const grout = fu < 0.04 || fv < 0.04;
    const t = hash2(Math.floor(u * 4), Math.floor(v * 4), 18);
    const dirt = fbm(u, v, 4, 19);
    const c = mix([150, 156, 146], [176, 180, 168], t);
    return grout ? [70, 66, 60] : mix(c, [110, 100, 80], dirt * 0.5);
  },
  brick: (u, v) => {
    const row = Math.floor(v * 8);
    const fu = (u * 4 + (row % 2) * 0.5) % 1, fv = (v * 8) % 1;
    const mortar = fu < 0.05 || fv < 0.1;
    const b = hash2(Math.floor(u * 4 + (row % 2) * 0.5), row, 20);
    return mortar ? [120, 110, 96] : mix([110, 56, 40], [150, 84, 60], b * 0.6 + fbm(u, v, 8, 21) * 0.4);
  },
  rust: (u, v) => {
    const n = fbm(u, v, 6, 22);
    const streak = fbm(u * 0.3, v * 3, 4, 23);
    return mix([90, 46, 26], [158, 92, 48], n * 0.6 + streak * 0.4);
  },
  rock: (u, v) => {
    const n = fbm(u, v, 4, 24), d = fbm(u, v, 16, 25);
    const strata = Math.sin((v + n * 0.2) * 30) * 0.5 + 0.5;
    return mix([104, 88, 70], [150, 130, 104], n * 0.5 + strata * 0.25 + d * 0.25);
  },
  fabric: (u, v) => {
    const weave = ((Math.floor(u * 64) + Math.floor(v * 64)) % 2) * 0.08;
    const n = fbm(u, v, 4, 26);
    const c = mix([120, 110, 92], [150, 138, 114], n);
    return [c[0] * (1 - weave), c[1] * (1 - weave), c[2] * (1 - weave)];
  },
  scrap: (u, v) => {
    const cell = hash2(Math.floor(u * 3 + fbm(u, v, 2, 27)), Math.floor(v * 3), 28);
    const n = fbm(u, v, 8, 29);
    const base = cell < 0.33 ? [130, 76, 40] : cell < 0.66 ? [100, 104, 100] : [120, 108, 70];
    return mix(base, [60, 50, 40], n * 0.5);
  },
  paint: (u, v) => {
    const n = fbm(u, v, 6, 30);
    const peel = n > 0.62 ? 0.7 : 1;
    const c = mix([200, 196, 180], [224, 220, 204], fbm(u, v, 16, 31));
    return [c[0] * peel, c[1] * peel, c[2] * peel];
  },
  adobe: (u, v) => {
    // Mud plaster: soft ochre blotches, hairline cracks, straw flecks, the ghost of the brick courses under it.
    const n = fbm(u, v, 3, 32), d = fbm(u, v, 12, 33);
    const crack = Math.abs(fbm(u, v, 4, 34, 3) - 0.5) < 0.007 ? 0.78 : 1;
    const straw = hash2(Math.floor(u * 128), Math.floor(v * 128), 35) > 0.985 ? 1.12 : 1;
    const course = (v * 6) % 1 < 0.06 ? 0.95 : 1;
    const c = mix([188, 150, 104], [224, 194, 148], n * 0.75 + d * 0.25);
    const k = crack * straw * course;
    return [c[0] * k, c[1] * k, c[2] * k];
  },
  tin: (u, v) => {
    // Corrugated sheet: ridges along v, galvanised grey going to rust in streaks that run down the sheet.
    const ridge = 0.78 + 0.22 * Math.sin(u * Math.PI * 2 * 16);
    const streak = fbm(u * 3, v * 0.6, 4, 36), spot = fbm(u, v, 8, 37);
    const rust = smooth(Math.min(1, Math.max(0, (streak * 0.7 + spot * 0.3 - 0.5) * 3)));
    const c = mix(mix([140, 144, 140], [168, 170, 164], spot), [118, 66, 36], rust);
    return [c[0] * ridge, c[1] * ridge, c[2] * ridge];
  },
  water: (u, v) => {
    // Standing flood water: dark green-black with an oily sheen, slow ripples, a skin of scum where it is still.
    const n = fbm(u, v, 3, 38), d = fbm(u, v, 10, 39);
    const ripple = Math.sin((u * 7 + v * 3 + n * 2) * Math.PI * 2) * 0.5 + 0.5;
    const scum = smooth(Math.max(0, fbm(u, v, 5, 40) - 0.62) * 3);
    const c = mix(mix([24, 40, 46], [56, 84, 90], n * 0.6 + ripple * 0.25 + d * 0.15), [78, 88, 52], scum * 0.6);
    return c;
  },
};

export function surfaceTexture(kind: SurfaceKind): THREE.Texture {
  const hit = cache.get(kind);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);
  const shader = SHADERS[kind];
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const [r, g, b] = shader(px / SIZE, py / SIZE, px, py);
      const i = (py * SIZE + px) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  cache.set(kind, tex);
  return tex;
}

/** Soft round sprite used for dust, smoke and glows. */
export function softSprite(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
