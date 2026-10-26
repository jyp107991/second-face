import * as THREE from 'three';
import { hash2 } from '../../core/rng';
import type { Appearance, ScarId, TattooId } from '../../data/appearance';
import { humanData } from './data';
import { loadImage } from './textures';
import { skinAlbedo } from '../../data/ancestry';
import { beardShadowAt } from './facialHair';

/**
 * Per-character skin texture: blends the light/dark MakeHuman skin photos for texture character,
 * regrades the result so the face averages the calibrated albedo for the chosen tone and undertone
 * (keeping the photo's regional colour and pore detail as ratios), then paints facial hair, freckles, scars and tattoos in UV space. Painting positions come from
 * the base mesh geometry (head-local coordinates calibrated on the eye joints), so marks land on
 * the right part of the face regardless of texture layout.
 */

const V = THREE.Vector3;
const tmp = new V();

function ageKey(age: number) { return age < 36 ? 'young' : age < 56 ? 'middleage' : 'old'; }

export function skinTextureKeys(a: Appearance, hi = false): { light: string; dark: string } {
  const d = humanData();
  const age = ageKey(a.shape.age), sex = a.shape.gender >= 0.5 ? 'male' : 'female';
  const variants = ['', '2', '3', '4', '5', '6', '7', '8'];
  let light = `${age}_light_${sex}${variants[a.skinVariant] ?? ''}`;
  if (!d.m.skins[light]) light = `${age}_light_${sex}${variants[a.skinVariant % 3] ?? ''}`;
  if (!d.m.skins[light]) light = `${age}_light_${sex}`;
  let dark = `${age}_dark_${sex}${variants[a.skinVariant] ?? ''}`;
  if (!d.m.skins[dark]) dark = `${age}_dark_${sex}`;
  const sfx = (rel: string) => (hi ? rel.replace('.webp', '_hi.webp') : rel);
  return { light: sfx(d.m.skins[light]), dark: sfx(d.m.skins[dark]) };
}

export interface HeadFrame { c: THREE.Vector3; r: number; }
let headFrame: HeadFrame | undefined;
let headTris: Uint32Array | undefined;

/** Head-local frame from the base mesh's eye joints: eyes land at (±0.36, 0.1, ~0.88). */
export function frame(): HeadFrame {
  if (headFrame) return headFrame;
  const d = humanData();
  const jp = (name: string) => {
    const vs = d.m.joints[name], acc = new V();
    for (const v of vs) acc.add(tmp.fromArray(d.base, v * 3));
    return acc.divideScalar(vs.length);
  };
  const l = jp('eye.L____head'), r = jp('eye.R____head');
  const mid = l.clone().add(r).multiplyScalar(0.5);
  const rad = l.distanceTo(r) / (2 * 0.36);
  headFrame = { c: new V(mid.x, mid.y - 0.1 * rad, mid.z - 0.88 * rad), r: rad };
  return headFrame;
}

/** Body triangles (render-vertex indices) on the head and neck. */
function headTriangles(): Uint32Array {
  if (headTris) return headTris;
  const d = humanData(), f = frame();
  const out: number[] = [];
  const p = new V();
  const near = (ri: number) => {
    p.fromArray(d.base, d.bodyMap[ri] * 3).sub(f.c).divideScalar(f.r);
    return p.y > -1.9 && p.length() < 2.0;
  };
  for (let t = 0; t < d.bodyIndex.length; t += 3) {
    if (near(d.bodyIndex[t]) && near(d.bodyIndex[t + 1]) && near(d.bodyIndex[t + 2])) out.push(d.bodyIndex[t], d.bodyIndex[t + 1], d.bodyIndex[t + 2]);
  }
  return (headTris = new Uint32Array(out));
}

const needsPaint = (a: Appearance) => a.hair.style !== 'none' || a.facialHair !== 'none' || a.freckles > 0 || a.scars.length > 0 || a.tattoos.length > 0 || (a.grime ?? 0) > 0 || (a.weathering ?? 0) > 0;

/** Build the skin texture. Resolves synchronously if images are preloaded; updates in place otherwise. */
export function makeSkinTexture(a: Appearance, size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const { light, dark } = skinTextureKeys(a, size >= 2048);
  void Promise.all([loadImage(light), loadImage(dark)]).then(([li, di]) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(li, 0, 0, size, size);
    ctx.globalAlpha = darkMix(a.skinTone);
    ctx.drawImage(di, 0, 0, size, size);
    ctx.globalAlpha = 1;
    regrade(ctx, size, a);
    if (needsPaint(a)) paintMarks(ctx, size, a);
    tex.needsUpdate = true;
  });
  return tex;
}

/** How much of the dark-skin photo to use for the texture's character (redness, contrast). */
function darkMix(tone: number): number {
  return Math.max(0, Math.min(1, (tone - 0.4) / 0.45));
}

interface SkinSamples { face: Float32Array; body: Float32Array; head: [number, number, number, number]; }
let samples: SkinSamples | undefined;

/**
 * Sample UVs (0..1, image space) for measuring mean skin colour: points on the face (cheeks, forehead)
 * and on the torso, plus the bounding box of the head's UV island. The photos' head and body islands
 * differ in colour, so each is normalised on its own.
 */
export function skinSamples(): SkinSamples {
  if (samples) return samples;
  const d = humanData(), f = frame();
  const face: number[] = [], body: number[] = [];
  const head = [1, 1, 0, 0] as [number, number, number, number];
  const p = new V(), q = new V();
  for (let t = 0; t < d.bodyIndex.length; t += 3) {
    p.set(0, 0, 0); let u = 0, v = 0;
    for (let k = 0; k < 3; k++) {
      const ri = d.bodyIndex[t + k];
      p.add(q.fromArray(d.base, d.bodyMap[ri] * 3).sub(f.c).divideScalar(f.r));
      u += d.bodyUv[ri * 2]; v += 1 - d.bodyUv[ri * 2 + 1];
    }
    p.divideScalar(3); u /= 3; v /= 3;
    if (p.y > -0.9 && p.length() < 1.6) {
      head[0] = Math.min(head[0], u); head[1] = Math.min(head[1], v); head[2] = Math.max(head[2], u); head[3] = Math.max(head[3], v);
      // Cheeks, forehead: skip eyes, lips, brows.
      const cheek = p.z > 0.55 && p.y < 0.0 && p.y > -0.5 && Math.abs(p.x) > 0.25 && Math.abs(p.x) < 0.7;
      const brow = p.z > 0.6 && p.y > 0.45 && p.y < 0.8 && Math.abs(p.x) < 0.4;
      if (cheek || brow) face.push(u, v);
    } else if (p.y < -3 && p.y > -5 && p.z > 0 && Math.abs(p.x) < 1.6) body.push(u, v);
  }
  return (samples = { face: new Float32Array(face), body: new Float32Array(body), head });
}

/**
 * Regrade the texture so face and body average the calibrated albedo. Brightness follows the photo
 * exactly (pores, shading, regional darkening); colour deviations from the island mean (lips, flush,
 * veins) are kept at reduced strength so regions never drift off-hue.
 */
function regrade(ctx: CanvasRenderingContext2D, size: number, a: Appearance): void {
  const img = ctx.getImageData(0, 0, size, size), px = img.data, S = skinSamples();
  const lum = (x: number, y: number, z: number) => 0.3 * x + 0.55 * y + 0.15 * z + 1e-3;
  const mean = (uv: Float32Array) => {
    let r = 0, g = 0, b = 0;
    const n = uv.length / 2 || 1;
    for (let i = 0; i < uv.length; i += 2) {
      const x = Math.min(size - 1, Math.floor(uv[i] * size)), y = Math.min(size - 1, Math.floor(uv[i + 1] * size));
      const j = (y * size + x) * 4;
      r += px[j]; g += px[j + 1]; b += px[j + 2];
    }
    const L = lum(r / n, g / n, b / n);
    return { L, r: r / n / L, g: g / n / L, b: b / n / L };
  };
  const mf = mean(S.face), mb = S.body.length ? mean(S.body) : mf;
  const [tr, tg, tb] = skinAlbedo(a.skinTone, a.skinUndertone ?? 0);
  // Keep most of the photo's own colour variation (lips, flush, veins): halving it left faces waxy.
  const K = 0.72;
  const [hx0, hy0, hx1, hy1] = S.head.map((v) => v * size);
  for (let y = 0; y < size; y++) {
    const inY = y >= hy0 - 2 && y <= hy1 + 2;
    for (let x = 0; x < size; x++) {
      const m = inY && x >= hx0 - 2 && x <= hx1 + 2 ? mf : mb;
      const j = (y * size + x) * 4;
      const L = lum(px[j], px[j + 1], px[j + 2]), k = L / m.L;
      px[j] = tr * k * Math.pow(px[j] / L / m.r, K);
      px[j + 1] = tg * k * Math.pow(px[j + 1] / L / m.g, K);
      px[j + 2] = tb * k * Math.pow(px[j + 2] / L / m.b, K);
    }
  }
  ctx.putImageData(img, 0, 0);
}

// -----------------------------------------------------------------------------------------------

interface Decal { c: THREE.Vector3; tx: THREE.Vector3; ty: THREE.Vector3; }
function decal(x: number, y: number, z: number): Decal {
  const c = new V(x, y, z).normalize();
  const tx = new V().crossVectors(new V(0, 1, 0), c).normalize();
  const ty = new V().crossVectors(c, tx).normalize();
  return { c, tx, ty };
}
function local(dc: Decal, p: THREE.Vector3): [number, number] {
  tmp.subVectors(p, dc.c);
  return [tmp.dot(dc.tx), tmp.dot(dc.ty)];
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(wx - vx * t, wy - vy * t);
}
function smoothstep(a: number, b: number, x: number) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

const SCAR_SHAPES: Record<ScarId, { d: Decal; seg: [number, number, number, number]; w: number; burn?: boolean }> = {
  brow_cut: { d: decal(0.36, 0.32, 0.88), seg: [-0.04, 0.1, 0.05, -0.08], w: 0.012 },
  cheek_slash: { d: decal(0.55, -0.2, 0.8), seg: [-0.18, 0.1, 0.16, -0.13], w: 0.011 },
  lip_split: { d: decal(0.07, -0.42, 0.9), seg: [0, 0.07, 0.015, -0.08], w: 0.01 },
  eye_scar: { d: decal(-0.36, 0.1, 0.9), seg: [0.02, 0.26, -0.03, -0.26], w: 0.012 },
  burn_left: { d: decal(-0.7, -0.1, 0.6), seg: [0, 0, 0, 0], w: 0.28, burn: true },
  burn_right: { d: decal(0.7, 0.15, 0.6), seg: [0, 0, 0, 0], w: 0.28, burn: true },
  forehead_x: { d: decal(0, 0.62, 0.78), seg: [-0.09, 0.09, 0.09, -0.09], w: 0.012 },
  chin_nick: { d: decal(-0.1, -0.78, 0.6), seg: [-0.05, 0, 0.05, 0.015], w: 0.011 },
};

function tattooAt(id: TattooId, p: THREE.Vector3): number {
  switch (id) {
    case 'tear': { const [x, y] = local(decal(0.4, -0.1, 0.9), p); return Math.hypot(x, (y + 0.015) * 0.7) < 0.025 + Math.max(0, y) * 0.3 && y < 0.04 ? 1 : 0; }
    case 'chin_lines': { const [x, y] = local(decal(0, -0.82, 0.55), p); return Math.abs(y) < 0.14 && [-0.07, 0, 0.07].some((c) => Math.abs(x - c) < 0.013) ? 1 : 0; }
    case 'brow_dots': { const [x, y] = local(decal(0.36, 0.45, 0.82), p); return [-0.07, 0, 0.07].some((c) => Math.hypot(x - c, y) < 0.018) ? 1 : 0; }
    case 'cheek_tribal': { const [x, y] = local(decal(-0.62, -0.15, 0.75), p); const rr = Math.hypot(x, y); return rr < 0.2 && Math.abs(Math.sin(Math.atan2(y, x) * 2 + rr * 18)) > 0.78 ? 1 : 0; }
    case 'temple_spiral': { const [x, y] = local(decal(0.85, 0.35, 0.4), p); const rr = Math.hypot(x, y); return rr < 0.16 && Math.abs(Math.sin(rr * 55 - Math.atan2(y, x))) > 0.8 ? 1 : 0; }
    case 'cheek_cross': { const [x, y] = local(decal(0.6, -0.25, 0.75), p); return (Math.abs(x) < 0.014 && Math.abs(y) < 0.07) || (Math.abs(y - 0.02) < 0.014 && Math.abs(x) < 0.05) ? 1 : 0; }
    case 'jaw_stripes': return p.y < -0.4 && p.y > -0.85 && p.z > 0 && Math.abs(p.x) > 0.45 && Math.sin(p.y * 40) > 0.4 ? 1 : 0;
    case 'forehead_star': { const [x, y] = local(decal(0, 0.62, 0.75), p); const an = Math.atan2(y, x), rr = Math.hypot(x, y); return rr < 0.04 + 0.04 * Math.abs(Math.cos(an * 2.5)) ? 1 : 0; }
    case 'eye_band': return p.z > 0.3 && p.y > 0.0 && p.y < 0.2 ? 0.8 : 0;
    case 'nine_neck': {
      const [x, y] = local(decal(0.62, -0.95, 0.25), p);
      const ring = Math.abs(Math.hypot(x, y - 0.03) - 0.03) < 0.01;
      const stem = Math.abs(x - 0.03) < 0.01 && y < 0.03 && y > -0.07;
      return ring || stem ? 1 : 0;
    }
  }
}

/**
 * Scalp-hair growth area (same head frame as beardMask): front hairline above the forehead, temples,
 * down in front of the ears, over the ears, behind them to the nape. Returns density 0..1 with a soft,
 * slightly irregular hairline (fine short hairs thin out over a few millimetres).
 */
export function scalpMask(p: THREE.Vector3, recede = 0, drop = 0): number {
  const ax = Math.abs(p.x), y = p.y;
  if (y < -1.1) return 0;
  const th = (Math.atan2(ax, p.z) * 180) / Math.PI;
  // Ears are never covered.
  if (ax > 0.86 && y > -0.42 && y < 0.32 && th > 70 && th < 115) return 0;
  const wobble = 0.025 * Math.sin(th * 0.11 + 0.7) + 0.012 * Math.sin(th * 0.23 + 2);
  // Hairline height by angle around the head: forehead, temple corner (recedes with age), temple drop
  // in front of the ear, over the ear, behind it, nape.
  const K: [number, number][] = [[0, 0.95 + recede * 0.3], [30, 0.92 + recede * 0.35], [48, 0.82 + recede * 0.4], [60, 0.62], [68, 0.3], [76, 0.1], [84, 0.22], [96, 0.36], [108, 0.15], [122, -0.45], [150, -0.72], [180, -0.78]];
  let line = K[K.length - 1][1];
  for (let i = 0; i < K.length - 1; i++) {
    if (th <= K[i + 1][0]) { const f = (th - K[i][0]) / (K[i + 1][0] - K[i][0]); line = K[i][1] + (K[i + 1][1] - K[i][1]) * (f * f * (3 - 2 * f)); break; }
  }
  line += wobble - drop;
  // A real hairline thins over a centimetre or so; a hard edge reads as a painted cap.
  const edge = th < 60 ? 0.11 : 0.07;
  return smoothstep(line - edge, line + edge, y);
}

function paintMarks(ctx: CanvasRenderingContext2D, size: number, a: Appearance): void {
  const d = humanData(), f = frame(), tris = headTriangles();
  const img = ctx.getImageData(0, 0, size, size);
  const px = img.data;
  // Each texel is painted once (triangles sharing an edge would otherwise both blend into it).
  const done = new Uint8Array(size * size);
  const hair = new THREE.Color().setHex(a.hair.color, THREE.LinearSRGBColorSpace);
  const hl = hair.r * 0.3 + hair.g * 0.55 + hair.b * 0.15;
  // Follicles seen through the skin: darker and ashier than the hair itself.
  // Dark hair gives the classic blue-grey shadow; light hair a faint, warmer one.
  const dark = Math.max(0, Math.min(1, 1 - hl * 1.6));
  const stub = hair.clone().multiplyScalar(0.55).lerp(new THREE.Color(0.1, 0.11, 0.14), 0.55 * dark);
  const hairStyle = a.hair.style;
  const hairC = new THREE.Color().setHex(a.hair.color, THREE.LinearSRGBColorSpace);
  // Hairline recedes at the temples with age for masculine faces.
  const recede = Math.max(0, Math.min(1, (a.shape.age - 32) / 40)) * Math.max(0, a.shape.gender - 0.5) * 2 * 0.5;
  const ink = new THREE.Color().setHex(a.tattooColor, THREE.LinearSRGBColorSpace);
  const scarC = new THREE.Color().setHex(0xd8a592, THREE.LinearSRGBColorSpace);
  const burnC = new THREE.Color().setHex(0xb87666, THREE.LinearSRGBColorSpace);
  const grime = a.grime ?? 0, weather = a.weathering ?? 0;
  const dirtC = new THREE.Color().setHex(0x4a3a2a, THREE.LinearSRGBColorSpace);
  const sunC = new THREE.Color().setHex(0xa8655a, THREE.LinearSRGBColorSpace);
  const P = [new V(), new V(), new V()];
  const U = [0, 0, 0], W = [0, 0, 0];
  const p = new V();
  const blend = (i: number, c: THREE.Color, k: number) => {
    px[i] += (c.r * 255 - px[i]) * k; px[i + 1] += (c.g * 255 - px[i + 1]) * k; px[i + 2] += (c.b * 255 - px[i + 2]) * k;
  };
  for (let t = 0; t < tris.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const ri = tris[t + k];
      P[k].fromArray(d.base, d.bodyMap[ri] * 3).sub(f.c).divideScalar(f.r);
      U[k] = d.bodyUv[ri * 2] * size;
      W[k] = (1 - d.bodyUv[ri * 2 + 1]) * size;
    }
    const minX = Math.max(0, Math.floor(Math.min(U[0], U[1], U[2]))), maxX = Math.min(size - 1, Math.ceil(Math.max(U[0], U[1], U[2])));
    const minY = Math.max(0, Math.floor(Math.min(W[0], W[1], W[2]))), maxY = Math.min(size - 1, Math.ceil(Math.max(W[0], W[1], W[2])));
    const den = (W[1] - W[2]) * (U[0] - U[2]) + (U[2] - U[1]) * (W[0] - W[2]);
    if (Math.abs(den) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const cx = x + 0.5, cy = y + 0.5;
        const b0 = ((W[1] - W[2]) * (cx - U[2]) + (U[2] - U[1]) * (cy - W[2])) / den;
        const b1 = ((W[2] - W[0]) * (cx - U[2]) + (U[0] - U[2]) * (cy - W[2])) / den;
        const b2 = 1 - b0 - b1;
        if (b0 < -0.01 || b1 < -0.01 || b2 < -0.01) continue;
        if (done[y * size + x]) continue;
        done[y * size + x] = 1;
        p.set(0, 0, 0).addScaledVector(P[0], b0).addScaledVector(P[1], b1).addScaledVector(P[2], b2);
        const dir = p.clone().normalize();
        const i = (y * size + x) * 4;
        // Facial hair base: a soft shadow under the strands (strands are stroked afterwards).
        // Scalp hair: painted styles, or an under-layer beneath hair meshes so their edges meet a real hairline.
        if (hairStyle !== 'none') {
          const m = scalpMask(p, recede, hairStyle.startsWith('paint_') || hairStyle.startsWith('coily_') || hairStyle.startsWith('cut_') ? 0 : 0.09);
          if (m > 0) paintScalp(px, i, x, y, p, m, hairStyle, hairC, stub);
        }
        // Beard follicle shadow under strand-rendered facial hair.
        if (a.facialHair !== 'none') {
          const sh = beardShadowAt(a.facialHair, p);
          if (sh > 0) blend(i, stub, sh * (0.45 + 0.55 * dark) * (0.94 + 0.12 * hash2(x, y, 53)));
        }
        // Freckles
        if (a.freckles > 0 && dir.z > 0.35 && dir.y > -0.45 && dir.y < 0.35) {
          const fr = hash2(Math.floor(dir.x * 140), Math.floor(dir.y * 140 + 77), 7);
          if (fr > 1 - a.freckles * 0.12) { const k = 0.9 + 0.06 * hash2(x, y, 41); px[i] *= k; px[i + 1] *= k - 0.05; px[i + 2] *= k - 0.07; }
        }
        // Scars
        for (const id of a.scars) {
          const sc = SCAR_SHAPES[id];
          const [lx, ly] = local(sc.d, dir);
          if (sc.burn) {
            const rr = Math.hypot(lx, ly * 1.2);
            if (rr < sc.w) blend(i, burnC, (1 - rr / sc.w) * (0.35 + 0.4 * hash2(Math.floor(lx * 90), Math.floor(ly * 90), 17)));
          } else {
            const dd = segDist(lx, ly, sc.seg[0], sc.seg[1], sc.seg[2], sc.seg[3]);
            if (dd < sc.w) blend(i, scarC, 0.6 * (1 - dd / sc.w) + 0.2);
            else if (dd < sc.w * 2) { px[i] *= 0.9; px[i + 1] *= 0.88; px[i + 2] *= 0.88; }
          }
        }
        // Weathering: the high points that face the sun (nose, cheekbones, brow) go a little ruddy. Broad,
        // low-frequency patches only — fine blotching read as disease, not sun.
        if (weather > 0 && dir.z > 0.5) {
          const n = valueNoise3(dir.x * 7 + 3, dir.y * 7, dir.z * 7);
          const band = dir.y > -0.55 && dir.y < 0.55 ? 1 : 0.35;
          const k = weather * Math.min(1, (dir.z - 0.5) * 2.4) * band * Math.max(0, n - 0.35) * 1.2;
          if (k > 0.02) blend(i, sunC, Math.min(0.2, k * 0.3));
        }
        // Grime: dust and soot settle low on the face (jaw, neck) and along the hairline, in broad patches.
        if (grime > 0) {
          const n = valueNoise3(dir.x * 4, dir.y * 4, dir.z * 4);
          const low = Math.max(0, -dir.y - 0.25) * 1.2 + Math.max(0, dir.y - 0.75) * 1.5;
          const k = grime * Math.max(0, Math.min(1, (n - 0.4) * 2.2)) * Math.min(1, 0.25 + low);
          if (k > 0) blend(i, dirtC, 0.32 * k);
        }
        // Tattoos (slightly faded ink)
        for (const tt of a.tattoos) {
          const k = tattooAt(tt, dir);
          if (k > 0) blend(i, ink, 0.7 * k);
        }
      }
    }
  }
  bleed(px, done, size, 2);
  ctx.putImageData(img, 0, 0);
}

/** Smooth 3D value noise in 0..1 (lattice hashed with hash2). */
function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const h = (i: number, j: number, k: number) => hash2(xi + i + (zi + k) * 57, yi + j, 91);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const z0 = lerp(lerp(h(0, 0, 0), h(1, 0, 0), sx), lerp(h(0, 1, 0), h(1, 1, 0), sx), sy);
  const z1 = lerp(lerp(h(0, 0, 1), h(1, 0, 1), sx), lerp(h(0, 1, 1), h(1, 1, 1), sx), sy);
  return lerp(z0, z1, sz);
}

/** Copy painted texels outward into unpainted neighbours so UV seams never show the unpainted photo. */
function bleed(px: Uint8ClampedArray, done: Uint8Array, size: number, passes: number): void {
  for (let pass = 0; pass < passes; pass++) {
    const mark = pass + 2;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const k = y * size + x;
        if (done[k]) continue;
        const n = done[k - 1] && done[k - 1] < mark ? k - 1 : done[k + 1] && done[k + 1] < mark ? k + 1 : done[k - size] && done[k - size] < mark ? k - size : done[k + size] && done[k + size] < mark ? k + size : -1;
        if (n < 0) continue;
        px[k * 4] = px[n * 4]; px[k * 4 + 1] = px[n * 4 + 1]; px[k * 4 + 2] = px[n * 4 + 2]; px[k * 4 + 3] = px[n * 4 + 3];
        done[k] = mark;
      }
    }
  }
}

const tc = new THREE.Color();

/** Paint scalp hair at texel i (head-frame point p, scalp density m) for the given style. */
function paintScalp(px: Uint8ClampedArray, i: number, x: number, y: number, p: THREE.Vector3, m: number, style: string, hair: THREE.Color, stub: THREE.Color): void {
  const mix = (c: THREE.Color, k: number) => {
    px[i] += (c.r * 255 - px[i]) * k; px[i + 1] += (c.g * 255 - px[i + 1]) * k; px[i + 2] += (c.b * 255 - px[i + 2]) * k;
  };
  const cover = style === 'paint_shaved' ? 0.3 : 1;
  px[i + 3] = Math.min(px[i + 3], 255 - 127 * m * cover);
  const fine = hash2(x, y, 61);
  switch (style) {
    case 'paint_shaved':
      mix(stub, m * 0.2 * (0.92 + 0.16 * fine));
      if (hash2(x, y, 62) < m * 0.6) mix(stub, 0.12 + 0.12 * hash2(x, y, 63));
      return;
    case 'paint_buzz':
    case 'paint_fade':
    default: {
      if (!style.startsWith('paint_') && !style.startsWith('cut_')) {
        // Under a hair mesh: hair colour with fine strand noise; the soft edge forms the visible hairline.
        mix(tc.copy(hair).multiplyScalar(0.72 + 0.3 * fine), m * 0.88);
        return;
      }
      // Short cut texture (buzz, under hair cards); a fade runs from near-bare skin low on the sides to full length on top.
      // Under hair cards the painted layer is the shadowed depth of the hair: darker, less saturated.
      const under = style.startsWith('cut_') ? 0.55 : 1;
      if (under < 1) { const l = hair.r * 0.3 + hair.g * 0.55 + hair.b * 0.15; tc.copy(hair).lerp(new THREE.Color(l, l, l), 0.3).multiplyScalar(under); mix(tc, m * 0.75); return; }
      const k = style === 'paint_fade' ? 0.04 + 0.96 * smoothstep(0.3, 0.85, p.y) : 1;
      if (k < 0.5) mix(stub, m * 0.18 * (1 - k));
      // Buzzed hair is skin seen through short stubble: scalp shows through, the colour is the follicle shadow.
      mix(tc.copy(hair).multiplyScalar(0.8).addScalar(0.03 * fine), m * k * 0.5 * (0.9 + 0.2 * fine));
      if (hash2(x, y, 64) < m * (0.3 + 0.35 * k)) mix(tc.copy(hair).multiplyScalar(0.55), 0.22 + 0.2 * hash2(x, y, 65));
      return;
    }
    case 'paint_coils':
    case 'coily_twa':
    case 'coily_afro':
    case 'coily_afro_big': {
      // Short natural coils: clumped texture (cells of a few texels), crisp lined-up edge.
      const d = smoothstep(0.15, 0.55, m);
      const cell = hash2(x >> 2, y >> 2, 66), cell2 = hash2((x + 2) >> 2, (y + 1) >> 2, 67);
      const shade = 0.55 + 0.35 * cell + 0.25 * cell2 + 0.15 * fine;
      // Even black hair shows soft highlights on the tops of the coils.
      const lift = Math.max(0, shade - 0.95) * 0.35;
      mix(tc.copy(hair).multiplyScalar(Math.min(1.25, shade)).addScalar(lift), d * 0.97);
      return;
    }
    case 'paint_cornrows': {
      // Rows run front to back (planes of constant x), about 1.3 cm apart, with braided stitches.
      const W = 0.15;
      const u = (p.x / W + 100.5) % 1; // 0..1 across a row
      const across = Math.abs(u - 0.5) * 2; // 0 centre .. 1 part
      const arc = Math.atan2(p.y, p.z) * Math.hypot(p.y, p.z);
      const st = (arc / 0.075 + across * 0.55 * (u < 0.5 ? 1 : -1) + 100) % 1;
      const ridge = Math.cos(Math.min(1, across) * Math.PI * 0.5);
      const shade = (0.45 + 0.7 * ridge) * (0.78 + 0.32 * smoothstep(0.1, 0.5, st) * smoothstep(0.95, 0.6, st)) * (0.92 + 0.16 * fine);
      const part = smoothstep(0.78, 0.9, across);
      mix(tc.copy(hair).multiplyScalar(shade).addScalar(Math.max(0, shade - 0.85) * 0.3), m * (1 - part) * 0.97);
      if (part > 0) mix(stub, m * part * 0.12);
      return;
    }
  }
}
