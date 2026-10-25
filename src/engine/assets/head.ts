import * as THREE from 'three';
import { hash2 } from '../core/rng';
import { ageFactor, type Appearance, type ScarId, type TattooId } from '../data/appearance';

/**
 * Procedural head built in "unit head space" (radius ≈ 1, +z = face, +y = up).
 * The skull samples the per-character face texture (skin, freckles, scars, tattoos, wrinkles,
 * stubble); every other part is vertex-coloured and samples the atlas' white texel.
 */

export interface HeadPart { geo: THREE.BufferGeometry; color: number; /** true = uses the painted face texture */ skin?: boolean; }

/** Atlas layout: top half = head paint (equirect), white texel in the bottom-right corner. */
export const ATLAS_SIZE = 256;
export const WHITE_UV = new THREE.Vector2(0.97, 0.03);

const V = THREE.Vector3;
const tmp = new V();

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function bump(p: THREE.Vector3, c: THREE.Vector3, r: number): number {
  return Math.exp(-p.distanceToSquared(c) / (r * r));
}

/** Deform a point on the unit sphere into the character's skull shape. */
function deformSkull(p: THREE.Vector3, a: Appearance): THREE.Vector3 {
  const f = a.face, A = ageFactor(a.age);
  const n = p.clone();
  const out = p.clone();
  const wj = smoothstep(-0.1, -0.9, p.y);
  const front = smoothstep(-0.2, 0.7, p.z);
  // Lower head tapers into the jaw; jaw width counteracts.
  out.x *= 1 - 0.3 * wj + 0.2 * f.jawWidth * wj + 0.04 * A * wj;
  // Faces are flatter than spheres.
  out.z *= 1 - 0.16 * front * smoothstep(-0.6, 0.3, p.y);
  // Temples pinch in slightly; back of skull fuller.
  out.x *= 1 - 0.08 * smoothstep(0.1, 0.6, p.y) * front;
  out.z -= 0.08 * smoothstep(0.2, -0.6, p.z) * smoothstep(-0.2, -0.8, p.y);
  out.y += -0.16 * f.jawLength * wj * front - 0.05 * A * wj * front;
  out.z += 0.12 * f.chinProtrude * bump(p, tmp.set(0, -0.85, 0.5), 0.4);
  out.x *= 1 + 0.25 * f.chinWidth * bump(p, tmp.set(0, -0.85, 0.45), 0.35);
  for (const s of [-1, 1]) {
    out.addScaledVector(n, 0.07 * f.cheekbones * bump(p, tmp.set(0.75 * s, 0.0, 0.6), 0.35));
    out.addScaledVector(n, (0.07 * f.cheekFullness - 0.06 * A) * bump(p, tmp.set(0.6 * s, -0.35, 0.7), 0.35));
    const ex = 0.36 + 0.07 * f.eyeSpacing;
    out.addScaledVector(n, -(0.07 + 0.05 * f.eyeDepth + 0.03 * A) * bump(p, tmp.set(ex * s, 0.1, 0.92), 0.22));
    // Jowls with age
    out.y -= 0.06 * A * bump(p, tmp.set(0.55 * s, -0.55, 0.6), 0.35);
    out.x += 0.04 * A * s * bump(p, tmp.set(0.55 * s, -0.55, 0.6), 0.35);
  }
  out.z += (0.07 * f.browRidge + 0.03) * bump(p, tmp.set(0, 0.3, 0.95), 0.45);
  out.x *= 0.86 + 0.08 * f.headWidth;
  out.y *= 1.14 + 0.08 * f.headHeight;
  out.z *= 1.0 + 0.07 * f.headDepth;
  return out;
}

/** Approximate deformed face surface z at height y (for placing features). */
function faceZ(a: Appearance, y: number, x = 0): number {
  const p = new V(x / 0.86, y / 1.14, 0);
  p.z = Math.sqrt(Math.max(0.02, 1 - p.x * p.x - p.y * p.y));
  return deformSkull(p, a).z;
}

function skullGeometry(a: Appearance): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 28, 20);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const p = new V();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const d = deformSkull(p, a);
    pos.setXYZ(i, d.x, d.y, d.z);
    // Remap into the atlas' top half.
    uv.setY(i, 0.5 + 0.5 * uv.getY(i));
  }
  g.computeVertexNormals();
  return g;
}

/** A shell offset from the skull, keeping only triangles whose centroid passes `keep`. */
function shell(skull: THREE.BufferGeometry, base: THREE.BufferGeometry, thickness: number, keep: (p: THREE.Vector3) => boolean, extra?: (p: THREE.Vector3, out: THREE.Vector3) => void): THREE.BufferGeometry {
  const pos = skull.getAttribute('position') as THREE.BufferAttribute;
  const nrm = skull.getAttribute('normal') as THREE.BufferAttribute;
  const basePos = base.getAttribute('position') as THREE.BufferAttribute;
  const idx = skull.index!;
  const outPos: number[] = [];
  const a = new V(), b = new V(), c = new V(), o = new V(), n = new V();
  const pick = (i: number, out: THREE.Vector3) => {
    out.fromBufferAttribute(pos, i).addScaledVector(n.fromBufferAttribute(nrm, i), thickness);
    if (extra) extra(o.fromBufferAttribute(basePos, i), out);
    return out;
  };
  for (let t = 0; t < idx.count; t += 3) {
    const i0 = idx.getX(t), i1 = idx.getX(t + 1), i2 = idx.getX(t + 2);
    const cen = new V().fromBufferAttribute(basePos, i0).add(o.fromBufferAttribute(basePos, i1)).add(o.fromBufferAttribute(basePos, i2)).divideScalar(3);
    if (!keep(cen)) continue;
    pick(i0, a); pick(i1, b); pick(i2, c);
    outPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  g.computeVertexNormals();
  return g;
}

function orientedMesh(verts: THREE.Vector3[], tris: [number, number, number][], inside: THREE.Vector3): THREE.BufferGeometry {
  const out: number[] = [];
  const ab = new V(), ac = new V(), nn = new V(), cen = new V();
  for (const [i, j, k] of tris) {
    const a = verts[i], b = verts[j], c = verts[k];
    nn.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    cen.copy(a).add(b).add(c).divideScalar(3).sub(inside);
    const flip = nn.dot(cen) < 0;
    const order = flip ? [a, c, b] : [a, b, c];
    for (const v of order) out.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

function mixHex(a: number, b: number, t: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
}

/** Colour with raw 0..1 sRGB channels (no colour-space conversion) for canvas painting. */
function raw(hex: number): THREE.Color {
  return new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
}

export function hairColorAt(a: Appearance): number {
  return mixHex(a.hair.color, 0xbcbab2, smoothstep(40, 72, a.age) * 0.85);
}

export function buildHead(a: Appearance): HeadPart[] {
  const f = a.face, A = ageFactor(a.age);
  const parts: HeadPart[] = [];
  const base = new THREE.SphereGeometry(1, 28, 20);
  const skull = skullGeometry(a);
  parts.push({ geo: skull, color: 0xffffff, skin: true });
  const skin = a.skin;
  const hair = hairColorAt(a);

  // --- Nose
  const topY = 0.2 + 0.04 * f.browHeight;
  const L = 0.44 + 0.12 * f.noseLength + 0.05 * A;
  const tipY = topY - L + 0.06 * f.noseTip;
  const W = 0.16 + 0.05 * f.noseWidth + 0.02 * A;
  const zt = faceZ(a, topY), zp = faceZ(a, tipY);
  const nose = [
    new V(0, topY, zt + 0.01),
    new V(0, (topY + tipY) / 2, (zt + zp) / 2 + 0.1 + 0.06 * f.noseBridge),
    new V(0, tipY, zp + 0.26 + 0.08 * f.noseBridge),
    new V(-W, tipY - 0.03, zp + 0.06),
    new V(W, tipY - 0.03, zp + 0.06),
    new V(0, tipY - 0.08, zp + 0.1),
  ];
  parts.push({ geo: orientedMesh(nose, [[0, 3, 1], [0, 1, 4], [1, 3, 2], [1, 2, 4], [2, 3, 5], [2, 5, 4]], new V(0, (topY + tipY) / 2, zp - 0.2)), color: mixHex(skin, 0x000000, 0.04) });

  // --- Mouth
  const mY = -0.5 + 0.08 * f.mouthHeight;
  const mz = faceZ(a, mY) + 0.0;
  const mw = 0.18 + 0.05 * f.mouthWidth;
  const lip = (0.035 + 0.025 * f.lipFullness) * (1 - 0.35 * A);
  const lipColor = mixHex(skin, 0x9a4038, 0.32);
  parts.push({ geo: new THREE.IcosahedronGeometry(1, 1).scale(mw, lip, 0.05).translate(0, mY + lip * 0.8, mz + 0.01), color: lipColor });
  parts.push({ geo: new THREE.IcosahedronGeometry(1, 1).scale(mw * 0.88, lip * 1.15, 0.05).translate(0, mY - lip * 0.9, mz + 0.005), color: mixHex(lipColor, 0xffffff, 0.06) });

  // --- Eyes, lids, brows
  for (const s of [-1, 1]) {
    const ex = s * (0.36 + 0.07 * f.eyeSpacing);
    const ey = 0.1;
    const ez = faceZ(a, ey, ex * 0.9) - 0.07 - 0.03 * f.eyeDepth;
    const er = 0.085 * (1 + 0.22 * f.eyeSize);
    const tilt = s * 0.25 * f.eyeTilt;
    parts.push({ geo: new THREE.SphereGeometry(er, 10, 8).scale(1.2, 1, 0.8).translate(ex, ey, ez), color: 0xe6dccb });
    parts.push({ geo: new THREE.CylinderGeometry(er * 0.55, er * 0.55, 0.01, 10).rotateX(Math.PI / 2).translate(ex, ey, ez + er * 0.8), color: a.eyes });
    parts.push({ geo: new THREE.CylinderGeometry(er * 0.24, er * 0.24, 0.012, 8).rotateX(Math.PI / 2).translate(ex, ey, ez + er * 0.82), color: 0x0a0806 });
    // Upper lid: droops with age.
    const lid = new THREE.SphereGeometry(er * 1.12, 10, 5, 0, Math.PI * 2, 0, Math.PI * (0.42 + 0.12 * A)).scale(1.2, 1, 0.85).rotateZ(tilt);
    parts.push({ geo: lid.translate(ex, ey, ez), color: mixHex(skin, 0x000000, 0.08) });
    // Brow
    const by = 0.29 + 0.06 * f.browHeight - 0.03 * A;
    const bz = faceZ(a, by, ex * 0.9) + 0.03 + 0.03 * f.browRidge;
    const bt = 0.03 * (1 + 0.7 * a.brows);
    parts.push({ geo: new THREE.BoxGeometry(0.24, bt, 0.05).rotateZ(-tilt * 0.6 + s * 0.06).translate(ex + s * 0.02, by, bz), color: hair });
    // Ears
    const ear = new THREE.SphereGeometry(1, 8, 6).scale(0.06, 0.2 * (1 + 0.25 * f.earSize) * (1 + 0.12 * A), 0.13).rotateY(s * (0.15 + 0.35 * f.earAngle));
    parts.push({ geo: ear.translate(s * (0.83 + 0.07 * f.headWidth), 0.02, -0.08), color: mixHex(skin, 0x803020, 0.05) });
  }

  // --- Hair
  const recess = A * 0.35 * (a.hair.style === 'long' || a.hair.style === 'long_wavy' || a.hair.style === 'ponytail' || a.hair.style === 'bun' || a.hair.style === 'braids' || a.hair.style === 'locs' ? 0.4 : 1);
  const hairline = (p: THREE.Vector3) => {
    const frontY = 0.5 + recess;
    const t = smoothstep(-0.4, 0.75, p.z);
    return THREE.MathUtils.lerp(-0.55, frontY, t) + (Math.abs(p.x) > 0.75 && p.z > -0.2 ? 0.25 : 0);
  };
  const cap = (th: number, extraKeep?: (p: THREE.Vector3) => boolean, jitter = 0) => shell(skull, base, th, (p) => p.y > hairline(p) && (!extraKeep || extraKeep(p)), jitter ? (p, o) => { o.addScaledVector(p, (hash2(Math.round(p.x * 50), Math.round(p.y * 50 + p.z * 31), 3) - 0.3) * jitter); } : undefined);
  switch (a.hair.style) {
    case 'bald': break;
    case 'buzz': parts.push({ geo: cap(0.025), color: hair }); break;
    case 'short': parts.push({ geo: cap(0.08), color: hair }); break;
    case 'side_part':
      parts.push({ geo: cap(0.09), color: hair });
      parts.push({ geo: new THREE.BoxGeometry(0.7, 0.14, 0.35).rotateZ(-0.25).translate(0.25, 0.85 + recess * 0.5, 0.55), color: hair });
      break;
    case 'curly': parts.push({ geo: cap(0.15, undefined, 0.12), color: hair }); break;
    case 'afro':
      parts.push({ geo: cap(0.1), color: hair });
      parts.push({ geo: new THREE.IcosahedronGeometry(1.42, 1).translate(0, 0.35, -0.12), color: hair });
      break;
    case 'long': case 'long_wavy': {
      const wavy = a.hair.style === 'long_wavy';
      parts.push({ geo: cap(0.1, undefined, wavy ? 0.06 : 0), color: hair });
      const back = new THREE.BoxGeometry(wavy ? 2.0 : 1.8, 1.9, 0.35, 4, 6, 1);
      if (wavy) jitterGeo(back, 0.08);
      parts.push({ geo: back.translate(0, -0.55, -0.62), color: hair });
      for (const s of [-1, 1]) parts.push({ geo: new THREE.BoxGeometry(0.28, 1.3, 0.45).translate(s * 0.98, -0.35, -0.05), color: hair });
      break;
    }
    case 'ponytail':
      parts.push({ geo: cap(0.08), color: hair });
      parts.push({ geo: new THREE.CylinderGeometry(0.16, 0.06, 1.2, 6).rotateX(0.35).translate(0, -0.25, -1.2), color: hair });
      break;
    case 'bun':
      parts.push({ geo: cap(0.08), color: hair });
      parts.push({ geo: new THREE.IcosahedronGeometry(0.42, 1).translate(0, 0.65, -0.9), color: hair });
      break;
    case 'braids':
      parts.push({ geo: cap(0.06), color: hair });
      for (const s of [-1, 1]) parts.push({ geo: new THREE.CylinderGeometry(0.1, 0.07, 1.6, 6).translate(s * 0.6, -1.0, -0.55), color: hair });
      break;
    case 'mohawk':
      parts.push({ geo: cap(0.02, (p) => Math.abs(p.x) < 0.25), color: hair });
      parts.push({ geo: new THREE.BoxGeometry(0.16, 0.55, 1.7).translate(0, 1.1, -0.1), color: hair });
      break;
    case 'undercut':
      parts.push({ geo: cap(0.02), color: mixHex(hair, skin, 0.5) });
      parts.push({ geo: cap(0.18, (p) => p.y > 0.55), color: hair });
      parts.push({ geo: new THREE.BoxGeometry(0.9, 0.18, 0.5).rotateX(-0.4).translate(0, 0.95, 0.6), color: hair });
      break;
    case 'locs':
      parts.push({ geo: cap(0.12), color: hair });
      for (let i = 0; i < 12; i++) {
        const ang = Math.PI * (0.15 + (i / 11) * 0.7);
        const x = Math.cos(ang) * 1.0, z = -Math.sin(ang) * 0.95;
        parts.push({ geo: new THREE.CylinderGeometry(0.07, 0.06, 1.4, 5).translate(x, -0.6, z), color: hair });
      }
      break;
  }

  // --- Facial hair (conforming shells on the lower face)
  const beardKeep = (yMax: number, xMin = 0) => (p: THREE.Vector3) => p.y < yMax && p.z > -0.25 && Math.abs(p.x) >= xMin && !(Math.abs(p.x) < 0.35 && p.y > mY / 1.12 + 0.02 && p.y < topY);
  const fh = a.facialHair;
  if (fh === 'moustache' || fh === 'goatee') parts.push({ geo: new THREE.BoxGeometry(mw * 2.1, 0.07, 0.08).translate(0, mY + 0.11, mz + 0.04), color: hair });
  if (fh === 'goatee') parts.push({ geo: new THREE.IcosahedronGeometry(1, 1).scale(0.2, 0.17, 0.12).translate(0, mY - 0.27, mz - 0.02), color: hair });
  if (fh === 'short_beard') parts.push({ geo: shell(skull, base, 0.06, beardKeep(-0.25)), color: hair });
  if (fh === 'full_beard' || fh === 'long_beard') {
    parts.push({ geo: shell(skull, base, 0.11, beardKeep(-0.15), (p, o) => { o.y -= 0.18 * smoothstep(-0.5, -1, p.y); }), color: hair });
    parts.push({ geo: new THREE.BoxGeometry(mw * 2.2, 0.08, 0.1).translate(0, mY + 0.11, mz + 0.05), color: hair });
    if (fh === 'long_beard') parts.push({ geo: new THREE.ConeGeometry(0.42, 0.9, 6).rotateX(Math.PI).translate(0, -1.45, 0.45), color: hair });
  }
  if (fh === 'chops') parts.push({ geo: shell(skull, base, 0.07, beardKeep(0.0, 0.55)), color: hair });
  return parts;
}

function jitterGeo(g: THREE.BufferGeometry, amt: number): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (hash2(i, 1, 9) - 0.5) * amt, p.getY(i), p.getZ(i) + (hash2(i, 2, 9) - 0.5) * amt);
}

// -----------------------------------------------------------------------------------------------
// Face texture painting
// -----------------------------------------------------------------------------------------------

interface Decal { c: THREE.Vector3; tx: THREE.Vector3; ty: THREE.Vector3; }
function decal(x: number, y: number, z: number): Decal {
  const c = new V(x, y, z).normalize();
  const tx = new V().crossVectors(new V(0, 1, 0), c).normalize();
  const ty = new V().crossVectors(c, tx).normalize();
  return { c, tx, ty };
}
function local(d: Decal, p: THREE.Vector3): [number, number] {
  tmp.subVectors(p, d.c);
  return [tmp.dot(d.tx), tmp.dot(d.ty)];
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

const SCAR_SHAPES: Record<ScarId, { d: Decal; seg: [number, number, number, number]; w: number; burn?: boolean }> = {
  brow_cut: { d: decal(0.35, 0.3, 0.9), seg: [-0.05, 0.12, 0.06, -0.1], w: 0.022 },
  cheek_slash: { d: decal(0.55, -0.2, 0.8), seg: [-0.2, 0.12, 0.18, -0.15], w: 0.02 },
  lip_split: { d: decal(0.08, -0.45, 0.9), seg: [0, 0.1, 0.02, -0.12], w: 0.018 },
  eye_scar: { d: decal(-0.36, 0.1, 0.9), seg: [0.02, 0.3, -0.04, -0.3], w: 0.022 },
  burn_left: { d: decal(-0.7, -0.1, 0.6), seg: [0, 0, 0, 0], w: 0.3, burn: true },
  burn_right: { d: decal(0.7, 0.15, 0.6), seg: [0, 0, 0, 0], w: 0.3, burn: true },
  forehead_x: { d: decal(0, 0.55, 0.8), seg: [-0.1, 0.1, 0.1, -0.1], w: 0.02 },
  chin_nick: { d: decal(-0.12, -0.8, 0.55), seg: [-0.06, 0, 0.06, 0.02], w: 0.02 },
};

/** Returns tattoo ink coverage 0..1 at point p. */
function tattooAt(id: TattooId, p: THREE.Vector3): number {
  switch (id) {
    case 'tear': { const [x, y] = local(decal(0.4, -0.12, 0.9), p); return Math.hypot(x, (y + 0.02) * 0.7) < 0.035 + Math.max(0, y) * 0.3 && y < 0.06 ? 1 : 0; }
    case 'chin_lines': { const [x, y] = local(decal(0, -0.85, 0.5), p); return Math.abs(y) < 0.16 && [-0.08, 0, 0.08].some((c) => Math.abs(x - c) < 0.018) ? 1 : 0; }
    case 'brow_dots': { const [x, y] = local(decal(0.36, 0.42, 0.85), p); return [-0.08, 0, 0.08].some((c) => Math.hypot(x - c, y) < 0.025) ? 1 : 0; }
    case 'cheek_tribal': { const [x, y] = local(decal(-0.62, -0.15, 0.75), p); const r = Math.hypot(x, y); return r < 0.22 && Math.abs(Math.sin(Math.atan2(y, x) * 2 + r * 18)) > 0.75 ? 1 : 0; }
    case 'temple_spiral': { const [x, y] = local(decal(0.85, 0.35, 0.4), p); const r = Math.hypot(x, y); return r < 0.18 && Math.abs(Math.sin(r * 55 - Math.atan2(y, x))) > 0.8 ? 1 : 0; }
    case 'cheek_cross': { const [x, y] = local(decal(0.6, -0.25, 0.75), p); return (Math.abs(x) < 0.02 && Math.abs(y) < 0.08) || (Math.abs(y - 0.02) < 0.02 && Math.abs(x) < 0.06) ? 1 : 0; }
    case 'jaw_stripes': { if (p.y > -0.4 || p.y < -0.85 || p.z < 0) return 0; return Math.abs(p.x) > 0.45 && Math.sin(p.y * 40) > 0.4 ? 1 : 0; }
    case 'forehead_star': { const [x, y] = local(decal(0, 0.62, 0.75), p); const a = Math.atan2(y, x), r = Math.hypot(x, y); return r < 0.05 + 0.05 * Math.abs(Math.cos(a * 2.5)) ? 1 : 0; }
    case 'eye_band': return p.z > 0.2 && p.y > 0.0 && p.y < 0.2 ? 0.85 : 0;
    case 'nine_neck': {
      const [x, y] = local(decal(0.62, -0.78, 0.2), p);
      const ring = Math.abs(Math.hypot(x, y - 0.035) - 0.035) < 0.012;
      const stem = Math.abs(x - 0.035) < 0.012 && y < 0.035 && y > -0.08;
      return ring || stem ? 1 : 0;
    }
  }
}

export function paintFace(a: Appearance, size = ATLAS_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size / 2);
  const A = ageFactor(a.age);
  const skin = raw(a.skin);
  const hair = raw(hairColorAt(a));
  const ink = raw(a.tattooColor);
  const c = new THREE.Color();
  const p = new V();
  const stubble = a.facialHair !== 'none';
  for (let py = 0; py < size / 2; py++) {
    const v = 1 - py / (size / 2);
    const theta = (1 - v) * Math.PI;
    for (let px = 0; px < size; px++) {
      const u = px / size, phi = u * Math.PI * 2;
      p.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      c.copy(skin);
      const n = hash2(px, py, 5);
      c.multiplyScalar(0.96 + n * 0.06);
      // Warmth on cheeks, nose; shadow under brow
      for (const s of [-1, 1]) {
        const bl = bump(p, tmp.set(0.6 * s, -0.25, 0.75), 0.3);
        c.r += bl * 0.06; c.g -= bl * 0.02;
        c.multiplyScalar(1 - 0.18 * bump(p, tmp.set(0.36 * s, 0.12, 0.92), 0.17));
      }
      // Freckles
      if (a.freckles > 0 && p.z > 0.3 && p.y > -0.45 && p.y < 0.4) {
        const fr = hash2(Math.floor(p.x * 110), Math.floor(p.y * 110 + 100), 7);
        if (fr > 1 - a.freckles * 0.18) c.multiplyScalar(0.84);
      }
      // Age: forehead wrinkles, crow's feet, smile lines, spots
      if (A > 0) {
        if (p.z > 0.5 && p.y > 0.38 && p.y < 0.68) c.multiplyScalar(1 - A * 0.12 * Math.max(0, Math.sin(p.y * 70)));
        for (const s of [-1, 1]) {
          const [lx, ly] = local(decal(0.6 * s, 0.08, 0.75), p);
          if (Math.hypot(lx, ly) < 0.12 && Math.abs(Math.sin(Math.atan2(ly, lx) * 6)) > 0.85) c.multiplyScalar(1 - A * 0.18);
          const [mx, my] = local(decal(0.22 * s, -0.38, 0.92), p);
          if (segDist(mx, my, 0.02 * s, 0.14, 0.07 * s, -0.12) < 0.018) c.multiplyScalar(1 - A * 0.22);
        }
        if (A > 0.45 && hash2(Math.floor(p.x * 18), Math.floor(p.y * 18), 11) > 0.93) c.multiplyScalar(0.85);
      }
      // Stubble / beard shadow (fine speckle, soft edge)
      if (stubble && p.z > -0.1) {
        const reg = smoothstep(-0.2, -0.35, p.y) * (1 - smoothstep(0.32, 0.22, Math.abs(p.x)) * smoothstep(-0.62, -0.42, p.y));
        const k = (a.facialHair === 'stubble' ? 0.35 : 0.25) * reg;
        if (k > 0 && hash2(px, py, 13) > 0.3) c.lerp(hair, k);
      }
      // Scalp: hair colour under the hair mesh so the hairline reads cleanly.
      if (a.hair.style !== 'bald') {
        const recess = A * 0.35;
        const t = smoothstep(-0.4, 0.75, p.z);
        const line = (a.hair.style === 'mohawk' ? 2 : 0) + (-0.55 + (0.5 + recess + 0.55) * t) - 0.06;
        const k = smoothstep(line - 0.02, line + 0.06, p.y);
        if (k > 0) c.lerp(hair, k * (a.hair.style === 'buzz' ? 0.6 : 0.9));
      }
      // Scars
      for (const id of a.scars) {
        const sc = SCAR_SHAPES[id];
        const [lx, ly] = local(sc.d, p);
        if (sc.burn) {
          const r = Math.hypot(lx, ly * 1.2);
          if (r < sc.w) {
            const mottled = hash2(Math.floor(lx * 80), Math.floor(ly * 80), 17);
            c.lerp(raw(0xc07a6a), (1 - r / sc.w) * (0.4 + 0.4 * mottled));
          }
        } else {
          const d = segDist(lx, ly, sc.seg[0], sc.seg[1], sc.seg[2], sc.seg[3]);
          if (d < sc.w) c.lerp(raw(0xe0aa98), 0.65);
          else if (d < sc.w * 1.8) c.multiplyScalar(0.85);
        }
      }
      // Tattoos
      for (const t of a.tattoos) {
        const k = tattooAt(t, p);
        if (k > 0) c.lerp(ink, 0.75 * k);
      }
      const i = (py * size + px) * 4;
      img.data[i] = Math.min(255, c.r * 255);
      img.data[i + 1] = Math.min(255, c.g * 255);
      img.data[i + 2] = Math.min(255, c.b * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
