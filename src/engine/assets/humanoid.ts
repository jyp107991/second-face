import * as THREE from 'three';
import { defaultAppearance, type Appearance } from '../data/appearance';
import { buildHead, paintFace, WHITE_UV } from './head';

/** Clothing/gear colours worn over the body. */
export interface Outfit {
  shirt: number;
  pants: number;
  boots: number;
  coat?: number;
  /** Gas mask over the face. */
  mask?: boolean;
  gloves?: number;
  /** Armour plates over torso/shoulders. */
  plates?: number;
  hood?: number;
}

export interface HumanoidLook {
  appearance: Appearance;
  outfit: Outfit;
}

export const BONES = ['root', 'hips', 'spine', 'head', 'armUL', 'armLL', 'armUR', 'armLR', 'legUL', 'legLL', 'legUR', 'legLR'] as const;
export type BoneName = (typeof BONES)[number];

interface Part { bone: BoneName; geo: THREE.BufferGeometry; color: number; skin?: boolean; }

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

export function lookFrom(appearance: Partial<Appearance> | undefined, outfit: Outfit): HumanoidLook {
  return { appearance: { ...defaultAppearance(), ...(appearance ?? {}) } as Appearance, outfit };
}

/**
 * A rigidly-skinned humanoid: every body part is bound to one bone, merged into a single
 * SkinnedMesh so each character costs one draw call. The material's map is a small per-character
 * atlas (painted face in the top half, a white texel for vertex-coloured parts).
 */
export class Humanoid {
  readonly mesh: THREE.SkinnedMesh;
  readonly bones: Record<BoneName, THREE.Bone>;
  readonly root: THREE.Group;
  /** World-space height of the eyes in rest pose (camera framing for portraits). */
  readonly eyeHeight: number;
  private walkPhase = 0;
  private breathe = Math.random() * 10;
  moveBlend = 0;
  aim = 0;
  dead = 0;
  flinch = 0;
  private readonly restHipY: number;
  private texture: THREE.CanvasTexture;

  constructor(look: HumanoidLook) {
    const app = look.appearance, o = look.outfit, body = app.body;
    const H = 1 + 0.08 * body.height;
    const M = 1 + 0.15 * body.mass;
    const mus = 1 + 0.12 * body.muscle;
    const stoop = Math.max(0, app.age - 60) / 30;
    const hipY = 0.92 * H, headY = 0.5 * H;
    const shoulderX = (0.22 + 0.035 * body.shoulders) * M * mus;
    const hipX = (0.1 + 0.018 * body.hips) * M;

    const b = {} as Record<BoneName, THREE.Bone>;
    for (const n of BONES) { b[n] = new THREE.Bone(); b[n].name = n; }
    b.hips.position.set(0, hipY, 0);
    this.restHipY = hipY;
    b.spine.position.set(0, 0.05, 0);
    b.head.position.set(0, headY + 0.05, 0);
    b.armUL.position.set(-shoulderX, 0.46 * H, 0);
    b.armLL.position.set(0, -0.3 * H, 0);
    b.armUR.position.set(shoulderX, 0.46 * H, 0);
    b.armLR.position.set(0, -0.3 * H, 0);
    b.legUL.position.set(-hipX, -0.02, 0);
    b.legLL.position.set(0, -0.44 * H, 0);
    b.legUR.position.set(hipX, -0.02, 0);
    b.legLR.position.set(0, -0.44 * H, 0);
    b.root.add(b.hips);
    b.hips.add(b.spine, b.legUL, b.legUR);
    b.spine.add(b.head, b.armUL, b.armUR);
    b.armUL.add(b.armLL); b.armUR.add(b.armLR);
    b.legUL.add(b.legLL); b.legUR.add(b.legLR);
    this.bones = b;

    const sY = hipY + 0.05;
    const parts: Part[] = [];
    const torsoW = (0.36 + 0.04 * body.shoulders) * M * mus, torsoD = 0.22 * M;
    const waistW = (0.32 + 0.04 * body.hips - 0.02 * body.shoulders) * M;
    const top = o.coat ?? o.shirt;
    parts.push({ bone: 'hips', geo: boxAt((0.34 + 0.05 * body.hips) * M, 0.2, 0.22 * M, 0, hipY, 0), color: o.pants });
    parts.push({ bone: 'spine', geo: boxAt(waistW, 0.18 * H, torsoD * 0.95, 0, sY + 0.08 * H, 0), color: o.shirt });
    parts.push({ bone: 'spine', geo: boxAt(torsoW, 0.24 * H, torsoD, 0, sY + 0.28 * H, 0), color: o.shirt });
    parts.push({ bone: 'spine', geo: boxAt(torsoW * 1.08 + 0.04, 0.09 * H, torsoD * 1.02, 0, sY + 0.43 * H, 0), color: top });
    if (body.chest > 0.05) {
      const cs = 0.06 + 0.05 * body.chest;
      for (const s of [-1, 1]) parts.push({ bone: 'spine', geo: new THREE.SphereGeometry(cs, 7, 5).scale(1, 0.85, 0.9).translate(s * torsoW * 0.24, sY + 0.3 * H, torsoD * (o.coat !== undefined ? 0.5 : 0.42)), color: top });
    }
    if (o.coat !== undefined) {
      parts.push({ bone: 'spine', geo: boxAt(torsoW * 1.08, 0.5 * H, torsoD * 1.14, 0, sY + 0.2 * H, 0.004), color: o.coat });
      parts.push({ bone: 'hips', geo: boxAt(waistW * 1.15, 0.42 * H, torsoD * 1.16, 0, hipY - 0.14 * H, 0.004), color: o.coat });
    }
    if (o.plates !== undefined) {
      parts.push({ bone: 'spine', geo: boxAt(torsoW * 0.9, 0.3 * H, 0.04, 0, sY + 0.27 * H, torsoD * 0.6), color: o.plates });
      for (const s of [-1, 1]) parts.push({ bone: 'spine', geo: boxAt(0.14, 0.05, 0.2, s * shoulderX, sY + 0.48 * H, 0), color: o.plates });
    }
    const neckW = 0.07 * (1 + 0.25 * app.face.neckWidth) * mus;
    parts.push({ bone: 'spine', geo: new THREE.CylinderGeometry(neckW * 0.62, neckW * 0.7, 0.11 * H, 7).translate(0, sY + 0.5 * H, 0.0), color: app.skin });
    if (o.hood !== undefined) parts.push({ bone: 'spine', geo: boxAt(torsoW * 0.75, 0.08, torsoD * 1.1, 0, sY + 0.48 * H, -0.02), color: o.hood });

    // Head (unit head space → world): radius ≈ 0.112.
    const hY = sY + headY + 0.05;
    const R = 0.105 * (1 + 0.04 * body.height);
    const headM = new THREE.Matrix4().compose(new THREE.Vector3(0, hY + 0.08, 0.015), new THREE.Quaternion().setFromEuler(new THREE.Euler(stoop * 0.2, 0, 0)), new THREE.Vector3(R, R, R));
    for (const hp of buildHead(app)) parts.push({ bone: 'head', geo: hp.geo.applyMatrix4(headM), color: hp.color, skin: hp.skin });
    this.eyeHeight = hY + 0.08 + 0.1 * R;
    if (o.mask) {
      const fz = hY + 0.08;
      parts.push({ bone: 'head', geo: boxAt(0.2, 0.15, 0.07, 0, fz - 0.03, 0.1), color: 0x4a4a42 });
      parts.push({ bone: 'head', geo: new THREE.CylinderGeometry(0.035, 0.045, 0.07, 6).rotateX(Math.PI / 2).translate(0, fz - 0.07, 0.15), color: 0x2a2a26 });
      for (const s of [-1, 1]) parts.push({ bone: 'head', geo: new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8).rotateX(Math.PI / 2).translate(s * 0.045, fz + 0.015, 0.13), color: 0x8a9a7a });
      parts.push({ bone: 'head', geo: boxAt(0.25, 0.03, 0.24, 0, fz + 0.015, 0.0), color: 0x2a2a26 });
    }

    // Arms
    const armW = 0.085 * Math.sqrt(M) * mus;
    for (const side of [-1, 1] as const) {
      const sx = side * shoulderX, uy = sY + 0.46 * H;
      const u: BoneName = side < 0 ? 'armUL' : 'armUR', l: BoneName = side < 0 ? 'armLL' : 'armLR';
      parts.push({ bone: u, geo: boxAt(armW * 1.1, 0.3 * H, armW * 1.1, sx, uy - 0.15 * H, 0), color: top });
      parts.push({ bone: l, geo: boxAt(armW * 0.92, 0.25 * H, armW * 0.92, sx, uy - 0.3 * H - 0.125 * H, 0), color: o.coat !== undefined ? o.coat : app.skin });
      parts.push({ bone: l, geo: boxAt(armW * 0.95, 0.085, armW * 1.15, sx, uy - 0.59 * H, 0.01), color: o.gloves ?? app.skin });
    }
    // Legs
    const legW = 0.12 * Math.sqrt(M) * mus;
    for (const side of [-1, 1] as const) {
      const lx = side * hipX, ly = hipY - 0.02;
      const u: BoneName = side < 0 ? 'legUL' : 'legUR', l: BoneName = side < 0 ? 'legLL' : 'legLR';
      parts.push({ bone: u, geo: boxAt(legW, 0.44 * H, legW * 1.05, lx, ly - 0.22 * H, 0), color: o.pants });
      parts.push({ bone: l, geo: boxAt(legW * 0.88, 0.3 * H, legW * 0.92, lx, ly - 0.44 * H - 0.15 * H, 0), color: o.pants });
      parts.push({ bone: l, geo: boxAt(legW * 0.98, 0.14, 0.24, lx, 0.07, 0.035), color: o.boots });
    }

    this.texture = new THREE.CanvasTexture(paintFace(app));
    this.texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: this.texture, vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0.02 });
    const geo = mergeParts(parts);
    const skeleton = new THREE.Skeleton(BONES.map((n) => b[n]));
    this.mesh = new THREE.SkinnedMesh(geo, mat);
    this.mesh.add(b.root);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(skeleton);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.root = new THREE.Group();
    this.root.add(this.mesh);
    if (stoop > 0) b.spine.rotation.x = stoop * 0.15;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.texture.dispose();
  }

  /** Advance procedural animation. `speed` is world units/sec of locomotion. */
  animate(dt: number, speed: number): void {
    const b = this.bones;
    this.breathe += dt;
    this.moveBlend += ((speed > 0.05 ? 1 : 0) - this.moveBlend) * Math.min(1, dt * 10);
    this.walkPhase += dt * speed * 4.2;
    const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);
    const w = this.moveBlend;
    b.legUL.rotation.x = s * 0.6 * w;
    b.legUR.rotation.x = -s * 0.6 * w;
    b.legLL.rotation.x = Math.max(0, -c) * 0.8 * w;
    b.legLR.rotation.x = Math.max(0, c) * 0.8 * w;
    const breath = Math.sin(this.breathe * 1.6) * 0.015;
    b.armUL.rotation.x = -s * 0.5 * w;
    b.armUL.rotation.z = -0.08 - breath;
    b.armLL.rotation.x = -0.25 - 0.2 * w;
    b.armUR.rotation.x = THREE.MathUtils.lerp(s * 0.5 * w, -1.45, this.aim);
    b.armUR.rotation.z = 0.08 + breath;
    b.armLR.rotation.x = THREE.MathUtils.lerp(-0.25 - 0.2 * w, -0.1, this.aim);
    b.hips.position.y = this.restHipY + Math.abs(c) * 0.04 * w + breath;
    b.spine.rotation.x = 0.06 * w - this.flinch * 0.4;
    b.spine.rotation.y = s * 0.08 * w;
    b.head.rotation.x = -0.04 * w + this.flinch * 0.3;
    this.flinch = Math.max(0, this.flinch - dt * 4);
    if (this.dead > 0) {
      b.root.rotation.x = (-Math.PI / 2) * easeOut(this.dead);
      b.root.position.y = 0.15 * easeOut(this.dead);
      b.root.position.z = -0.4 * easeOut(this.dead);
    }
  }
}

function easeOut(t: number) { return 1 - Math.pow(1 - Math.min(1, t), 3); }

export function shade(hex: number, k: number): number {
  return new THREE.Color(hex).multiplyScalar(k).getHex();
}

function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [], skinIdx: number[] = [], skinW: number[] = [];
  const col = new THREE.Color();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    if (!p.skin) g.computeVertexNormals();
    const pos = g.getAttribute('position'), nrm = g.getAttribute('normal'), uv = g.getAttribute('uv');
    col.setHex(p.color);
    const bi = BONES.indexOf(p.bone);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      colors.push(col.r, col.g, col.b);
      if (p.skin && uv) uvs.push(uv.getX(i), uv.getY(i));
      else uvs.push(WHITE_UV.x, WHITE_UV.y);
      skinIdx.push(bi, 0, 0, 0);
      skinW.push(1, 0, 0, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinW, 4));
  return geo;
}
