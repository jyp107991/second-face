import * as THREE from 'three';
import { Rng, hash2 } from '../../core/rng';
import type { Appearance, ScarId, TattooId } from '../../data/appearance';
import { humanData } from './data';
import { loadImage } from './textures';
import { skinAlbedo } from '../../data/ancestry';

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
  const variants = ['', '2', '3'];
  let light = `${age}_light_${sex}${variants[a.skinVariant] ?? ''}`;
  if (!d.m.skins[light]) light = `${age}_light_${sex}`;
  const sfx = (rel: string) => (hi ? rel.replace('.webp', '_hi.webp') : rel);
  return { light: sfx(d.m.skins[light]), dark: sfx(d.m.skins[`${age}_dark_${sex}`]) };
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

/** Painted stubble level 0..3 (explicit stubble part; mesh beards get a medium shadow underneath). */
export function stubbleLevel(facialHair: string): number {
  const parts = facialHair.split('+');
  if (parts.includes('stubble_heavy')) return 3;
  if (parts.includes('stubble')) return 2;
  if (parts.includes('stubble_light')) return 1;
  return parts.some((x) => x.includes('beard')) ? 2 : 0;
}

const needsPaint = (a: Appearance) => a.hair.style !== 'none' || stubbleLevel(a.facialHair) > 0 || a.freckles > 0 || a.scars.length > 0 || a.tattoos.length > 0;

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
function skinSamples(): SkinSamples {
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
  const K = 0.5;
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
 * Natural beard-growth area in head-frame coordinates, built from the base mesh's landmarks (1 unit ≈ the
 * head radius; eyes at y≈0.1, under the nose y≈-0.47, mouth corners (±0.22, -0.69), lower lip -0.92,
 * lips -0.57..-0.86, chin bottom -1.22, earlobes y≈-0.35, ear beyond |x|≈0.89).
 * Uses the angle around the vertical axis (0° = front, 90° = side) so cheek and sideburn lines are
 * well defined. Returns growth density 0..1.
 */
function beardMask(p: THREE.Vector3): number {
  const ax = Math.abs(p.x), y = p.y;
  if (y > 0.3 || y < -1.9) return 0;
  const th = (Math.atan2(ax, p.z) * 180) / Math.PI;
  if (th > 92) return 0;
  // Ears are never covered.
  if (ax > 0.89 && y > -0.5) return 0;
  // Top boundary: moustache under the nose (following the nostril wings and smile lines), then the cheek
  // line rising from just outside the mouth corner to the sideburn base, then the sideburn.
  const wobble = 0.022 * Math.sin(th * 0.13) + 0.012 * Math.sin(th * 0.29 + 1.3);
  const tacheTop = -0.42 - Math.max(0, ax - 0.17) * 1.0;
  const tc = smoothstep(14, 22, th);
  const cheekTop = -0.66 + 0.34 * smoothstep(18, 70, th) + wobble;
  let top = tacheTop * (1 - tc) + cheekTop * tc;
  const sideburn = smoothstep(66, 71, th) * smoothstep(84, 80, th);
  top = top * (1 - sideburn) + 0.12 * sideburn;
  const topEdge = 0.035 + 0.05 * tc;
  // Bottom boundary: the jawline (chin bottom at the front rising to the jaw angle); no neck growth.
  const bottom = -1.24 + 0.39 * Math.pow(Math.min(1, th / 78), 1.6);
  let m = smoothstep(top + topEdge, top - topEdge, y) * smoothstep(bottom - 0.03, bottom + 0.05, y) * smoothstep(90, 82, th);
  // Lips (vermilion -0.57..-0.86, corners ±0.22) stay clear right up to their border.
  const lip = Math.hypot(ax / 0.225, (y + 0.715) / 0.145);
  m *= smoothstep(0.95, 1.06, lip);
  // Moustache and chin grow densest; the upper cheeks are sparser.
  const sparse = 1 - 0.28 * smoothstep(22, 45, th) * smoothstep(-0.95, -0.7, y);
  return m * sparse;
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
  const edge = th < 60 ? 0.07 : 0.045;
  return smoothstep(line - edge, line + edge, y);
}

/** Painted stubble density 0..1 at head-frame point p. */
function stubbleAt(p: THREE.Vector3): number {
  return beardMask(p);
}

function paintMarks(ctx: CanvasRenderingContext2D, size: number, a: Appearance): void {
  const d = humanData(), f = frame(), tris = headTriangles();
  const img = ctx.getImageData(0, 0, size, size);
  const px = img.data;
  // Each texel is painted once (triangles sharing an edge would otherwise both blend into it).
  const done = new Uint8Array(size * size);
  const hair = new THREE.Color().setHex(a.hair.color, THREE.LinearSRGBColorSpace);
  const lvl = stubbleLevel(a.facialHair);
  const hl = hair.r * 0.3 + hair.g * 0.55 + hair.b * 0.15;
  // Short hairs read darker and ashier than the same hair grown long (no ginger cast on light browns).
  const stub = hair.clone().lerp(new THREE.Color(hl, hl, hl), 0.6).multiplyScalar(0.6).lerp(new THREE.Color(0.08, 0.08, 0.09), 0.3);
  const SHADOW = [0, 0.11, 0.24, 0.28], STUBS = [0, 0.38, 0.64, 0.66];
  const hairStyle = a.hair.style;
  const hairC = new THREE.Color().setHex(a.hair.color, THREE.LinearSRGBColorSpace);
  // Hairline recedes at the temples with age for masculine faces.
  const recede = Math.max(0, Math.min(1, (a.shape.age - 32) / 40)) * Math.max(0, a.shape.gender - 0.5) * 2 * 0.5;
  const ink = new THREE.Color().setHex(a.tattooColor, THREE.LinearSRGBColorSpace);
  const scarC = new THREE.Color().setHex(0xd8a592, THREE.LinearSRGBColorSpace);
  const burnC = new THREE.Color().setHex(0xb87666, THREE.LinearSRGBColorSpace);
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
          const m = scalpMask(p, recede, hairStyle.startsWith('paint_') || hairStyle.startsWith('coily_') ? 0 : 0.09);
          if (m > 0) paintScalp(px, i, x, y, p, m, hairStyle, hairC, stub);
        }
        // Stubble: a follicle shadow (hair seen through skin) plus individual dark stubs.
        if (lvl > 0) {
          const st = stubbleAt(p);
          if (st > 0) {
            blend(i, stub, st * SHADOW[lvl] * (0.92 + 0.16 * hash2(x, y, 53)));
            px[i + 3] = Math.min(px[i + 3], 255 - 127 * st * lvl * 0.2);
            // Fine stubs: many faint dots rather than few strong ones (strong dots read as a rash).
            if (hash2(x, y, 57) < st * STUBS[lvl]) blend(i, stub, 0.1 + 0.14 * hash2(x, y, 58));
          }
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
  if (lvl >= 3) strokeHair(ctx, size, a);
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
    case 'paint_fade': {
      // A fade runs from near-bare skin low on the sides to full length on top.
      const k = style === 'paint_fade' ? 0.04 + 0.96 * smoothstep(0.3, 0.85, p.y) : 1;
      if (k < 0.5) mix(stub, m * 0.18 * (1 - k));
      mix(tc.copy(hair).multiplyScalar(0.8).addScalar(0.03 * fine), m * k * 0.62 * (0.9 + 0.2 * fine));
      if (hash2(x, y, 64) < m * (0.35 + 0.4 * k)) mix(tc.copy(hair).multiplyScalar(0.55), 0.25 + 0.2 * hash2(x, y, 65));
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
    default:
      // Under a hair mesh: hair colour with fine strand noise; the soft edge forms the visible hairline.
      mix(tc.copy(hair).multiplyScalar(0.72 + 0.3 * fine), m * 0.88);
  }
}

/**
 * Draw facial hair as individual anti-aliased strands in UV space. Each strand starts at a random
 * point on a head triangle and points "down the face" in 3D, mapped into that triangle's UV frame.
 */
function strokeHair(ctx: CanvasRenderingContext2D, size: number, a: Appearance): void {
  const d = humanData(), f = frame(), tris = headTriangles();
  const rng = new Rng(Math.round(a.hair.color + a.shape.age * 1000 + a.skinTone * 1e6));
  const scale = size / 2048;
  const density = 0.4 * scale * scale;
  const len3 = 0.014;
  const col = new THREE.Color(a.hair.color);
  const P = [new V(), new V(), new V()], U = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
  const e1 = new V(), e2 = new V(), p = new V(), dir = new V();
  ctx.lineCap = 'round';
  for (let t = 0; t < tris.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const ri = tris[t + k];
      P[k].fromArray(d.base, d.bodyMap[ri] * 3).sub(f.c).divideScalar(f.r);
      U[k].set(d.bodyUv[ri * 2] * size, (1 - d.bodyUv[ri * 2 + 1]) * size);
    }
    // Quick reject: triangle centroid far from any beard zone.
    p.copy(P[0]).add(P[1]).add(P[2]).divideScalar(3);
    if (stubbleAt(p) <= 0.01 && stubbleAt(P[0]) <= 0.01) continue;
    const t1x = U[1].x - U[0].x, t1y = U[1].y - U[0].y, t2x = U[2].x - U[0].x, t2y = U[2].y - U[0].y;
    const area = Math.abs(t1x * t2y - t2x * t1y) / 2;
    e1.subVectors(P[1], P[0]); e2.subVectors(P[2], P[0]);
    const g11 = e1.dot(e1), g12 = e1.dot(e2), g22 = e2.dot(e2), det = g11 * g22 - g12 * g12;
    if (det < 1e-12) continue;
    const n = Math.floor(area * density + rng.next());
    for (let s = 0; s < n; s++) {
      let b1 = rng.next(), b2 = rng.next();
      if (b1 + b2 > 1) { b1 = 1 - b1; b2 = 1 - b2; }
      p.copy(P[0]).addScaledVector(e1, b1).addScaledVector(e2, b2);
      const cov = stubbleAt(p);
      if (rng.next() > cov * cov) continue;
      // Hair flows down, slightly outward on the cheeks and away from the philtrum on the lip.
      dir.set(Math.sign(p.x) * (p.y > -0.55 ? 0.45 : 0.15) + (rng.next() - 0.5) * 0.5, -1, 0.15).normalize().multiplyScalar(len3 * (0.6 + rng.next() * 0.8));
      // Express dir in the triangle basis (least squares), then map to UV.
      const r1 = dir.dot(e1), r2 = dir.dot(e2);
      const ca = (r1 * g22 - r2 * g12) / det, cb = (r2 * g11 - r1 * g12) / det;
      const ux = U[0].x + t1x * b1 + t2x * b2, uy = U[0].y + t1y * b1 + t2y * b2;
      const dx = t1x * ca + t2x * cb, dy = t1y * ca + t2y * cb;
      const shade = 0.85 + rng.next() * 0.65;
      ctx.strokeStyle = `rgba(${Math.min(255, col.r * 255 * shade) | 0},${Math.min(255, col.g * 255 * shade) | 0},${Math.min(255, col.b * 255 * shade) | 0},${(0.12 + 0.22 * cov).toFixed(2)})`;
      ctx.lineWidth = 0.7 * scale + rng.next() * 0.3;
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.quadraticCurveTo(ux + dx * 0.5 + (rng.next() - 0.5) * 1.5 * scale, uy + dy * 0.5, ux + dx, uy + dy);
      ctx.stroke();
    }
  }
}
