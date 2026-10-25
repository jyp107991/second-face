import * as THREE from 'three';
import { hash2 } from '../../core/rng';
import type { Appearance, ScarId, TattooId } from '../../data/appearance';
import { humanData } from './data';
import { loadImage } from './textures';

/**
 * Per-character skin texture: blends the light/dark MakeHuman skin photos for the chosen tone,
 * then paints facial hair, freckles, scars and tattoos in UV space. Painting positions come from
 * the base mesh geometry (head-local coordinates calibrated on the eye joints), so marks land on
 * the right part of the face regardless of texture layout.
 */

const V = THREE.Vector3;
const tmp = new V();

function ageKey(age: number) { return age < 36 ? 'young' : age < 56 ? 'middleage' : 'old'; }

export function skinTextureKeys(a: Appearance): { light: string; dark: string } {
  const d = humanData();
  const age = ageKey(a.shape.age), sex = a.shape.gender >= 0.5 ? 'male' : 'female';
  const variants = ['', '2', '3'];
  let light = `${age}_light_${sex}${variants[a.skinVariant] ?? ''}`;
  if (!d.m.skins[light]) light = `${age}_light_${sex}`;
  return { light: d.m.skins[light], dark: d.m.skins[`${age}_dark_${sex}`] };
}

interface HeadFrame { c: THREE.Vector3; r: number; }
let headFrame: HeadFrame | undefined;
let headTris: Uint32Array | undefined;

/** Head-local frame from the base mesh's eye joints: eyes land at (±0.36, 0.1, ~0.88). */
function frame(): HeadFrame {
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

const needsPaint = (a: Appearance) => a.facialHair !== 'none' || a.freckles > 0 || a.scars.length > 0 || a.tattoos.length > 0;

/** Build the skin texture. Resolves synchronously if images are preloaded; updates in place otherwise. */
export function makeSkinTexture(a: Appearance, size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const { light, dark } = skinTextureKeys(a);
  void Promise.all([loadImage(light), loadImage(dark)]).then(([li, di]) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: needsPaint(a) })!;
    ctx.drawImage(li, 0, 0, size, size);
    ctx.globalAlpha = Math.max(0, Math.min(1, a.skinTone));
    ctx.drawImage(di, 0, 0, size, size);
    ctx.globalAlpha = 1;
    if (needsPaint(a)) paintMarks(ctx, size, a);
    tex.needsUpdate = true;
  });
  return tex;
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

/** Facial hair coverage 0..1 at head-local point p (unit-sphere direction), soft-edged. */
function beardAt(style: Appearance['facialHair'], p: THREE.Vector3): number {
  if (style === 'none' || p.z < -0.2) return 0;
  const mouthY = -0.47;
  // Oval clearance around the lips.
  const lip = Math.hypot(p.x / 0.27, (p.y - mouthY) / 0.075);
  const lipClear = smoothstep(0.85, 1.15, lip);
  const lower = smoothstep(-0.1, -0.34, p.y) * smoothstep(-1.08, -0.86, p.y);          // jaw & chin, above the neck line
  const cheekLine = smoothstep(0.05, -0.2, p.y + 0.25 * (1 - Math.abs(p.x)));           // sloped upper edge on the cheeks
  const sides = smoothstep(0.6, 0.76, Math.abs(p.x)) * smoothstep(0.28, 0.05, p.y) * smoothstep(-0.75, -0.45, p.y);
  const tache = smoothstep(0.34, 0.24, Math.abs(p.x)) * smoothstep(mouthY + 0.02, mouthY + 0.07, p.y) * smoothstep(mouthY + 0.2, mouthY + 0.14, p.y);
  const chin = smoothstep(0.24, 0.16, Math.abs(p.x)) * smoothstep(mouthY - 0.05, mouthY - 0.1, p.y) * smoothstep(-0.95, -0.85, p.y);
  let c = 0;
  switch (style) {
    case 'stubble': c = Math.max(lower * cheekLine, sides * 0.7, tache) * 0.5; break;
    case 'moustache': c = tache; break;
    case 'goatee': c = Math.max(tache, chin); break;
    case 'short_beard': c = Math.max(lower * cheekLine, sides, tache) * 0.8; break;
    case 'full_beard': c = Math.max(lower * cheekLine, sides, tache); break;
    case 'chops': c = sides; break;
  }
  return c * (style === 'moustache' || style === 'goatee' ? 1 : lipClear * 0.85 + 0.15 * Math.min(1, tache * 2));
}

function paintMarks(ctx: CanvasRenderingContext2D, size: number, a: Appearance): void {
  const d = humanData(), f = frame(), tris = headTriangles();
  const img = ctx.getImageData(0, 0, size, size);
  const px = img.data;
  const hair = new THREE.Color().setHex(a.hair.color, THREE.LinearSRGBColorSpace);
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
        p.set(0, 0, 0).addScaledVector(P[0], b0).addScaledVector(P[1], b1).addScaledVector(P[2], b2);
        const dir = p.clone().normalize();
        const i = (y * size + x) * 4;
        // Facial hair: soft coverage × fine strand noise (two scales), darkening toward the hair colour.
        const bh = beardAt(a.facialHair, dir);
        if (bh > 0) {
          const strands = 0.55 + 0.3 * hash2(x, y, 31) + 0.15 * hash2(x >> 2, y >> 1, 37);
          blend(i, hair, Math.min(0.9, bh * strands));
        }
        // Freckles
        if (a.freckles > 0 && dir.z > 0.35 && dir.y > -0.45 && dir.y < 0.35) {
          const fr = hash2(Math.floor(dir.x * 140), Math.floor(dir.y * 140 + 77), 7);
          if (fr > 1 - a.freckles * 0.16) { px[i] *= 0.82; px[i + 1] *= 0.76; px[i + 2] *= 0.72; }
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
  ctx.putImageData(img, 0, 0);
}
