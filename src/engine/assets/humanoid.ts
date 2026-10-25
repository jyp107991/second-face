import * as THREE from 'three';
import { flatMaterial } from './materials';

/** Visual parameters for a humanoid. Expanded by the character creator (face sculptor) in M1. */
export interface HumanoidLook {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
  boots: number;
  /** 0.85..1.15 */
  height?: number;
  /** 0.8..1.3 body mass */
  mass?: number;
  hairStyle?: 'none' | 'short' | 'long' | 'mohawk' | 'bun';
  /** Gear accents */
  mask?: boolean;
  coat?: number;
}

export const BONES = ['root', 'hips', 'spine', 'head', 'armUL', 'armLL', 'armUR', 'armLR', 'legUL', 'legLL', 'legUR', 'legLR'] as const;
export type BoneName = (typeof BONES)[number];

interface Part { bone: BoneName; geo: THREE.BufferGeometry; color: number; }

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/**
 * A rigidly-skinned humanoid: every body part is bound to one bone, merged into a single
 * SkinnedMesh so each character costs one draw call.
 */
export class Humanoid {
  readonly mesh: THREE.SkinnedMesh;
  readonly bones: Record<BoneName, THREE.Bone>;
  readonly root: THREE.Group;
  private walkPhase = 0;
  private breathe = Math.random() * 10;
  /** 0 = idle, 1 = full walk cycle blend. */
  moveBlend = 0;
  aim = 0;
  dead = 0;
  flinch = 0;
  private readonly restHipY: number;

  constructor(look: HumanoidLook) {
    const H = look.height ?? 1, M = look.mass ?? 1;
    const hipY = 0.92 * H, headY = 0.5 * H, shoulderX = 0.24 * M;
    // Rest pose bone layout (positions relative to parent).
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
    b.legUL.position.set(-0.1 * M, -0.02, 0);
    b.legLL.position.set(0, -0.44 * H, 0);
    b.legUR.position.set(0.1 * M, -0.02, 0);
    b.legLR.position.set(0, -0.44 * H, 0);
    b.root.add(b.hips);
    b.hips.add(b.spine, b.legUL, b.legUR);
    b.spine.add(b.head, b.armUL, b.armUR);
    b.armUL.add(b.armLL); b.armUR.add(b.armLR);
    b.legUL.add(b.legLL); b.legUR.add(b.legLR);
    this.bones = b;

    // Body parts in model space (rest pose).
    const sY = hipY + 0.05; // spine origin world y
    const parts: Part[] = [];
    const torsoW = 0.42 * M, torsoD = 0.24 * M;
    parts.push({ bone: 'hips', geo: boxAt(0.38 * M, 0.18, 0.22 * M, 0, hipY, 0), color: look.pants });
    parts.push({ bone: 'spine', geo: boxAt(torsoW, 0.34 * H, torsoD, 0, sY + 0.2 * H, 0), color: look.shirt });
    parts.push({ bone: 'spine', geo: boxAt(torsoW * 0.92, 0.12 * H, torsoD * 0.95, 0, sY + 0.06 * H, 0), color: look.shirt });
    // Chest taper / shoulders
    parts.push({ bone: 'spine', geo: boxAt(torsoW * 1.08, 0.1 * H, torsoD * 1.02, 0, sY + 0.4 * H, 0), color: look.coat ?? look.shirt });
    if (look.coat !== undefined) {
      parts.push({ bone: 'spine', geo: boxAt(torsoW * 1.06, 0.5 * H, torsoD * 1.1, 0, sY + 0.16 * H, 0.005), color: look.coat });
      parts.push({ bone: 'hips', geo: boxAt(torsoW * 1.0, 0.36 * H, torsoD * 1.1, 0, hipY - 0.12 * H, 0.005), color: look.coat });
    }
    parts.push({ bone: 'spine', geo: boxAt(0.1, 0.07 * H, 0.1, 0, sY + 0.48 * H, 0), color: look.skin }); // neck
    // Head
    const hY = sY + headY + 0.05;
    const headGeo = new THREE.IcosahedronGeometry(0.13, 1).scale(0.95, 1.12, 1.0).translate(0, hY + 0.1, 0.01);
    parts.push({ bone: 'head', geo: headGeo, color: look.skin });
    parts.push({ bone: 'head', geo: boxAt(0.05, 0.05, 0.05, 0, hY + 0.08, 0.135), color: shade(look.skin, 0.9) }); // nose
    parts.push({ bone: 'head', geo: boxAt(0.035, 0.02, 0.01, -0.045, hY + 0.13, 0.12), color: 0x1a1410 }); // eyes
    parts.push({ bone: 'head', geo: boxAt(0.035, 0.02, 0.01, 0.045, hY + 0.13, 0.12), color: 0x1a1410 });
    const style = look.hairStyle ?? 'short';
    if (style !== 'none') {
      const cap = new THREE.SphereGeometry(0.138, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 1.1, 1.05).translate(0, hY + 0.13, -0.005);
      parts.push({ bone: 'head', geo: cap, color: look.hair });
      if (style === 'long') parts.push({ bone: 'head', geo: boxAt(0.26, 0.3, 0.08, 0, hY - 0.02, -0.1), color: look.hair });
      if (style === 'mohawk') parts.push({ bone: 'head', geo: boxAt(0.04, 0.1, 0.26, 0, hY + 0.27, -0.01), color: look.hair });
      if (style === 'bun') parts.push({ bone: 'head', geo: new THREE.IcosahedronGeometry(0.06, 0).translate(0, hY + 0.2, -0.13), color: look.hair });
    }
    if (look.mask) {
      parts.push({ bone: 'head', geo: boxAt(0.24, 0.16, 0.06, 0, hY + 0.06, 0.12), color: 0x4a4a42 });
      parts.push({ bone: 'head', geo: new THREE.CylinderGeometry(0.04, 0.05, 0.07, 6).rotateX(Math.PI / 2).translate(0, hY + 0.02, 0.17), color: 0x2a2a26 });
      parts.push({ bone: 'head', geo: boxAt(0.07, 0.05, 0.02, -0.055, hY + 0.13, 0.155), color: 0x8a9a7a });
      parts.push({ bone: 'head', geo: boxAt(0.07, 0.05, 0.02, 0.055, hY + 0.13, 0.155), color: 0x8a9a7a });
    }
    // Arms
    const armW = 0.1 * Math.sqrt(M);
    for (const side of [-1, 1] as const) {
      const sx = side * shoulderX, uy = sY + 0.46 * H;
      const u: BoneName = side < 0 ? 'armUL' : 'armUR', l: BoneName = side < 0 ? 'armLL' : 'armLR';
      parts.push({ bone: u, geo: boxAt(armW, 0.3 * H, armW, sx, uy - 0.15 * H, 0), color: look.coat ?? look.shirt });
      parts.push({ bone: l, geo: boxAt(armW * 0.9, 0.26 * H, armW * 0.9, sx, uy - 0.3 * H - 0.13 * H, 0), color: look.skin });
      parts.push({ bone: l, geo: boxAt(armW, 0.08, armW * 1.1, sx, uy - 0.6 * H, 0.01), color: shade(look.skin, 0.92) });
    }
    // Legs
    const legW = 0.13 * Math.sqrt(M);
    for (const side of [-1, 1] as const) {
      const lx = side * 0.1 * M, ly = hipY - 0.02;
      const u: BoneName = side < 0 ? 'legUL' : 'legUR', l: BoneName = side < 0 ? 'legLL' : 'legLR';
      parts.push({ bone: u, geo: boxAt(legW, 0.44 * H, legW, lx, ly - 0.22 * H, 0), color: look.pants });
      parts.push({ bone: l, geo: boxAt(legW * 0.9, 0.36 * H, legW * 0.9, lx, ly - 0.44 * H - 0.18 * H, 0), color: look.pants });
      parts.push({ bone: l, geo: boxAt(legW * 1.0, 0.1, 0.24, lx, 0.05, 0.04), color: look.boots });
    }

    const geo = mergeParts(parts);
    const skeleton = new THREE.Skeleton(BONES.map((n) => b[n]));
    this.mesh = new THREE.SkinnedMesh(geo, flatMaterial());
    this.mesh.add(b.root);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(skeleton);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.root = new THREE.Group();
    this.root.add(this.mesh);
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
    // Right arm: aims forward when aim > 0.
    b.armUR.rotation.x = THREE.MathUtils.lerp(s * 0.5 * w, -1.45, this.aim);
    b.armUR.rotation.z = 0.08 + breath;
    b.armLR.rotation.x = THREE.MathUtils.lerp(-0.25 - 0.2 * w, -0.1, this.aim);
    b.hips.position.y = this.restHipY + Math.abs(c) * 0.04 * w + breath;
    b.spine.rotation.x = 0.06 * w - this.flinch * 0.4;
    b.spine.rotation.y = s * 0.08 * w;
    b.head.rotation.x = -0.04 * w + this.flinch * 0.3;
    this.flinch = Math.max(0, this.flinch - dt * 4);
    // Death: topple backwards.
    if (this.dead > 0) {
      b.root.rotation.x = -Math.PI / 2 * easeOut(this.dead);
      b.root.position.y = 0.15 * easeOut(this.dead);
      b.root.position.z = -0.4 * easeOut(this.dead);
    }
  }
}

function easeOut(t: number) { return 1 - Math.pow(1 - Math.min(1, t), 3); }

export function shade(hex: number, k: number): number {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return c.getHex();
}

function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], skinIdx: number[] = [], skinW: number[] = [];
  const col = new THREE.Color();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    g.computeVertexNormals();
    const pos = g.getAttribute('position'), nrm = g.getAttribute('normal');
    col.setHex(p.color);
    const bi = BONES.indexOf(p.bone);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      colors.push(col.r, col.g, col.b);
      skinIdx.push(bi, 0, 0, 0);
      skinW.push(1, 0, 0, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinW, 4));
  return geo;
}
