import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { HumanFigure } from './figure';
import { clothMaterial } from './cloth';

/**
 * Procedural wasteland gear (WORLD.md §7): the pieces the garment libraries lack — ponchos, wraps,
 * bandanas, goggles, respirators, scrap plates, harness webbing, faction armbands, satchels. Low-poly
 * shapes built from the figure's rest skeleton and parented to bones, so they ride the animation.
 * Each piece merges into one or two meshes (one per material) to keep draw calls down.
 */

export type GearKind = 'poncho' | 'wrap' | 'headwrap' | 'bandana' | 'goggles' | 'goggles_up' | 'respirator' | 'plates' | 'harness' | 'armband' | 'satchel'
  | 'hardhat' | 'coat' | 'coat_sleeve_ul' | 'coat_sleeve_ur' | 'coat_sleeve_ll' | 'coat_sleeve_lr'
  // Chrome that shows: the parts of a body that were replaced or plated.
  | 'chrome_eye' | 'chrome_neural' | 'chrome_arm_l' | 'chrome_arm_r' | 'chrome_leg_l' | 'chrome_leg_r' | 'chrome_spine' | 'chrome_skin';

export interface GearLook {
  kind: GearKind; color?: number; grime?: number; wear?: number;
  /** Chrome: the lit accent colour and the make (plating finish differs by grade). */
  accent?: number; grade?: 'old' | 'dark' | 'concern';
}

const ALONG_BONE: GearKind[] = ['armband', 'chrome_arm_l', 'chrome_arm_r', 'chrome_leg_l', 'chrome_leg_r', 'coat_sleeve_ul', 'coat_sleeve_ur', 'coat_sleeve_ll', 'coat_sleeve_lr'];

/** Gear that covers the hair. */
export const GEAR_HIDES_HAIR: GearKind[] = ['headwrap', 'hardhat'];

type Part = { geo: THREE.BufferGeometry; mat: 'cloth' | 'leather' | 'metal' | 'glass' | 'rubber' | 'plastic' | 'chrome' | 'scrap' | 'polymer' | 'steel' | 'accent' | 'dark' };

function box(w: number, h: number, d: number, x: number, y: number, z: number, rz = 0, ry = 0): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).rotateZ(rz).rotateY(ry).translate(x, y, z);
}

function materialFor(kind: Part['mat'], look: GearLook, seedName: string): THREE.Material {
  const grime = look.grime ?? 0.3, wear = look.wear ?? 0.4;
  switch (kind) {
    case 'cloth': return clothMaterial(undefined, { name: seedName, tint: look.color ?? 0x6b5a43, grime, wear });
    case 'leather': return clothMaterial(undefined, { name: seedName + '_l', tint: 0x3a2a1c, grime: grime * 0.6, wear: wear * 0.5 });
    case 'metal': return new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 0.72, metalness: 0.55 });
    case 'glass': return new THREE.MeshStandardMaterial({ color: 0x6a7a62, roughness: 0.15, metalness: 0.3 });
    case 'rubber': return new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.9, metalness: 0 });
    case 'plastic': return new THREE.MeshStandardMaterial({ color: look.color ?? 0xb08a30, roughness: 0.55, metalness: 0.05 });
    case 'chrome': return new THREE.MeshStandardMaterial({ color: look.color ?? 0x8a8c88, roughness: 0.35, metalness: 0.85 });
    case 'scrap': return new THREE.MeshStandardMaterial({ color: look.color ?? 0x7a7268, roughness: 0.5, metalness: 0.7, flatShading: true });
    // Chrome of the future: matte polymer plating in the make's finish, brushed-steel seams, a lit accent line that
    // dims as the piece fails, and a dark under-layer showing between the plates.
    case 'polymer': return new THREE.MeshStandardMaterial({ color: look.color ?? 0x6c7074, roughness: look.grade === 'concern' ? 0.3 : look.grade === 'dark' ? 0.62 : 0.5, metalness: look.grade === 'concern' ? 0.25 : 0.4 });
    case 'steel': return new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.28, metalness: 0.95 });
    case 'accent': { const c = look.accent ?? 0xffa030; return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6 * Math.max(0.15, 1 - wear), roughness: 0.4, metalness: 0.1 }); }
    case 'dark': return new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.85, metalness: 0.1 });
  }
}

/** Parent a group to a bone, placing it at a figure-space point with figure-aligned axes. */
function attach(fig: HumanFigure, bone: string, g: THREE.Object3D, at: THREE.Vector3): boolean {
  const b = fig.bones.get(bone), rw = fig.restWorld.get(bone);
  if (!b || !rw) return false;
  const inv = new THREE.Matrix4().compose(rw.head, rw.q, new THREE.Vector3(1, 1, 1)).invert();
  g.position.copy(at.clone().applyMatrix4(inv));
  g.quaternion.copy(rw.q.clone().invert());
  b.add(g);
  return true;
}

function landmarks(fig: HumanFigure) {
  const r = (n: string) => fig.restWorld.get(n);
  const eye = r('eye.L')!, head = r('head')!, neck = r('neck01')!, chest = r('spine03')!, root = r('root')!;
  const clL = r('clavicle.L')!, clR = r('clavicle.R')!, armL = r('upperarm01.L')!;
  return {
    eye: eye.head, headTop: head.tail, headC: new THREE.Vector3(0, eye.head.y + 0.035, eye.head.z - 0.07),
    neck: neck.head, chest: chest.head, root: root.head, shoulderL: clL.tail, shoulderR: clR.tail, armL: armL.head,
    shoulderW: Math.abs(clL.tail.x - clR.tail.x),
  };
}

/** A limb is two bones here (…01 then …02): its full span, from the first head to the second tail. */
/** Clothes sit this far off the skin: body metrics measure the bare body. */
const CLOTH = 0.03;

function limbSpan(fig: HumanFigure, bone: string) {
  const b = fig.restWorld.get(bone)!, b2 = fig.restWorld.get(bone.replace('01', '02'));
  const tail = b2?.tail ?? b.tail;
  return { head: b.head, tail, len: b.head.distanceTo(tail), mid: b.head.clone().lerp(tail, 0.5), q: b.q };
}

/** Build one piece. Returns the meshes added (for LOD tweaks) or an empty list if the rig lacks the bones. */
export function addGear(fig: HumanFigure, look: GearLook): THREE.Mesh[] {
  const L = landmarks(fig);
  const parts: Part[] = [];
  let bone = 'head';
  let at = L.headC.clone();
  const headR = 0.095;
  switch (look.kind) {
    case 'goggles':
    case 'goggles_up': {
      const up = look.kind === 'goggles_up';
      const y = up ? L.eye.y + 0.06 : L.eye.y, z = (up ? L.eye.z - 0.01 : L.eye.z) + 0.012;
      at = new THREE.Vector3(0, y, z);
      for (const s of [-1, 1]) {
        parts.push({ geo: new THREE.CylinderGeometry(0.023, 0.025, 0.02, 12).rotateX(Math.PI / 2).translate(s * 0.031, 0, 0), mat: 'rubber' });
        parts.push({ geo: new THREE.CylinderGeometry(0.018, 0.018, 0.006, 12).rotateX(Math.PI / 2).translate(s * 0.031, 0, 0.012), mat: 'glass' });
      }
      parts.push({ geo: box(0.02, 0.012, 0.012, 0, 0, 0.004), mat: 'rubber' });
      // Strap: a band around the head at this height.
      parts.push({ geo: new THREE.TorusGeometry(headR, 0.006, 6, 20).rotateX(Math.PI / 2).translate(0, 0, -0.075), mat: 'leather' });
      break;
    }
    case 'respirator': {
      at = new THREE.Vector3(0, L.eye.y - 0.055, L.eye.z + 0.01);
      parts.push({ geo: new THREE.SphereGeometry(0.048, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58).rotateX(Math.PI / 2).scale(1.05, 0.9, 0.7).translate(0, -0.008, 0.012), mat: 'rubber' });
      for (const s of [-1, 1]) parts.push({ geo: new THREE.CylinderGeometry(0.019, 0.023, 0.028, 10).rotateZ(s * 1.2).translate(s * 0.048, -0.022, 0.022), mat: 'metal' });
      parts.push({ geo: new THREE.TorusGeometry(headR, 0.006, 6, 20).rotateX(Math.PI / 2).translate(0, 0.02, -0.08), mat: 'leather' });
      break;
    }
    case 'bandana': {
      // Over nose and mouth: the front of a sphere's lower half, centred just below the eyes, hugging the face.
      // The nose tip sits ~0.045 in front of the eyes: centre the cap forward so the cloth clears the face.
      at = new THREE.Vector3(0, L.eye.y - 0.02, L.eye.z - 0.018);
      parts.push({ geo: new THREE.SphereGeometry(0.084, 16, 8, -Math.PI * 0.18, Math.PI * 1.36, Math.PI * 0.5, Math.PI * 0.4).scale(1.0, 1.1, 1.0), mat: 'cloth' });
      parts.push({ geo: box(0.045, 0.1, 0.015, 0.01, -0.03, -0.125, 0.25), mat: 'cloth' });
      break;
    }
    case 'headwrap': {
      at = L.headC.clone();
      parts.push({ geo: new THREE.SphereGeometry(0.097, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(1, 0.93, 1.05).translate(0, 0.01, -0.006), mat: 'cloth' });
      parts.push({ geo: new THREE.TorusGeometry(0.094, 0.011, 7, 20).rotateX(Math.PI / 2).translate(0, -0.004, -0.006), mat: 'cloth' });
      parts.push({ geo: new THREE.SphereGeometry(0.022, 8, 6).scale(1.4, 0.8, 1).translate(0.04, -0.015, -0.095), mat: 'cloth' });
      parts.push({ geo: box(0.05, 0.13, 0.015, 0.06, -0.075, -0.085, -0.3), mat: 'cloth' });
      break;
    }
    case 'wrap': {
      bone = 'neck01';
      at = new THREE.Vector3(0, L.neck.y + 0.012, L.neck.z + 0.005);
      parts.push({ geo: new THREE.TorusGeometry(0.066, 0.02, 7, 18).rotateX(Math.PI / 2).scale(1.05, 0.7, 0.9), mat: 'cloth' });
      parts.push({ geo: box(0.075, 0.17, 0.018, 0.025, -0.095, 0.075, 0.12), mat: 'cloth' });
      break;
    }
    case 'poncho': {
      bone = 'spine03';
      at = new THREE.Vector3(0, L.neck.y - 0.03, L.neck.z - 0.01);
      const cone = new THREE.ConeGeometry(0.47, 0.6, 12, 1, true).translate(0, -0.3, 0).scale(1, 1, 0.78);
      // Hang slightly longer at the back; a few creases from the open hem.
      const pos = cone.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i), y = pos.getY(i);
        if (y < -0.3) pos.setY(i, y - (z < 0 ? 0.05 : 0) + Math.sin(pos.getX(i) * 23) * 0.015);
      }
      cone.computeVertexNormals();
      parts.push({ geo: cone, mat: 'cloth' });
      break;
    }
    case 'plates': {
      bone = 'spine03';
      at = L.chest.clone();
      const M = fig.metrics;
      // Scrap plates: road signs and hubcaps bolted to a harness, overlapping round the chest and the back.
      const rx = M.chest.halfW + CLOTH + 0.01, rz = (M.chest.front - M.chest.back) / 2 + CLOTH + 0.01;
      const cz = (M.chest.front + M.chest.back) / 2 - at.z;
      const arc = (y: number, h: number, start: number, len: number, grow = 1.0, k = 1.0) =>
        new THREE.CylinderGeometry(k, k * grow, h, 8, 1, true, start, len).scale(rx, 1, rz).translate(0, y, cz);
      parts.push({ geo: arc(0.06, 0.16, -0.95, 0.9, 1.0, 1.0), mat: 'scrap' });
      parts.push({ geo: arc(0.05, 0.17, 0.05, 0.9, 1.0, 1.02), mat: 'scrap' });
      parts.push({ geo: arc(-0.1, 0.15, -0.7, 1.4, 1.06, 1.04), mat: 'scrap' });
      parts.push({ geo: arc(-0.22, 0.1, -0.5, 1.0, 1.1, 1.07), mat: 'scrap' });
      parts.push({ geo: arc(0.0, 0.24, Math.PI - 0.75, 1.5, 1.0, 1.0), mat: 'scrap' });
      for (const s of [-1, 1]) parts.push({ geo: box(0.13, 0.016, 0.15, s * (L.shoulderW / 2 - 0.01), L.shoulderL.y - L.chest.y + 0.02, cz, s * 0.35), mat: 'scrap' });
      for (const s of [-1, 1]) parts.push({ geo: box(0.035, 0.36, 0.012, s * 0.06, 0.02, M.chest.front - at.z + CLOTH + 0.03, 0), mat: 'leather' });
      // Bolt heads.
      for (const [x, y] of [[-0.06, 0.1], [0.07, 0.09], [0.0, -0.08], [-0.08, -0.2], [0.09, -0.21]]) parts.push({ geo: new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6).rotateX(Math.PI / 2).translate(x, y, M.chest.front - at.z + CLOTH + 0.038), mat: 'rubber' });
      break;
    }
    case 'harness': {
      bone = 'spine03';
      at = L.chest.clone();
      const M = fig.metrics, front = M.chest.front - at.z + CLOTH;
      for (const s of [-1, 1]) parts.push({ geo: box(0.035, 0.46, 0.012, s * 0.03, -0.05, front + 0.004, s * 0.42), mat: 'leather' });
      const belly = M.belly, br = belly.halfW + CLOTH + 0.006, bz = (belly.front + belly.back) / 2 - at.z;
      parts.push({ geo: new THREE.TorusGeometry(br, 0.016, 6, 18).rotateX(Math.PI / 2).scale(1, 1, ((belly.front - belly.back) / 2 + CLOTH) / br).translate(0, belly.y - at.y, bz), mat: 'leather' });
      parts.push({ geo: box(0.05, 0.07, 0.04, 0.09, belly.y - at.y, belly.front - at.z + CLOTH + 0.012), mat: 'leather' });
      parts.push({ geo: box(0.06, 0.05, 0.03, -0.08, belly.y - at.y + 0.02, belly.front - at.z + CLOTH + 0.01), mat: 'metal' });
      break;
    }
    case 'armband': {
      bone = 'upperarm01.L';
      const armDir = fig.restWorld.get('upperarm01.L')!;
      at = armDir.head.clone().lerp(armDir.tail, 0.42);
      parts.push({ geo: new THREE.TorusGeometry(0.052, 0.014, 7, 16), mat: 'cloth' });
      break;
    }
    case 'satchel': {
      bone = 'root';
      at = new THREE.Vector3(0.2, L.root.y - 0.06, L.root.z + 0.02);
      parts.push({ geo: box(0.19, 0.15, 0.08, 0, 0, 0), mat: 'leather' });
      parts.push({ geo: box(0.2, 0.06, 0.09, 0, 0.065, 0), mat: 'leather' });
      break;
    }
    case 'hardhat': {
      at = new THREE.Vector3(0, L.headC.y + 0.02, L.headC.z - 0.005);
      parts.push({ geo: new THREE.SphereGeometry(0.108, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.9, 1.08).translate(0, 0.03, 0), mat: 'plastic' });
      parts.push({ geo: new THREE.CylinderGeometry(0.125, 0.13, 0.012, 18).scale(1, 1, 1.12).translate(0, 0.03, 0.01), mat: 'plastic' });
      parts.push({ geo: box(0.03, 0.09, 0.012, 0, 0.09, 0.0), mat: 'plastic' });
      break;
    }
    case 'coat': {
      bone = 'spine03';
      at = L.chest.clone();
      const M = fig.metrics;
      // The body of a long coat: an open elliptic shell from the shoulders to the knee, split down the front,
      // hugging the torso and falling straight. Sleeves are their own pieces (coat_sleeve_*).
      const rx = Math.max(M.chest.halfW, M.belly.halfW, M.hip.halfW) + CLOTH + 0.004;
      const rz = Math.max(M.chest.front - M.chest.back, M.belly.front - M.belly.back) / 2 + CLOTH + 0.004;
      const cz = (M.chest.front + M.chest.back) / 2 - at.z;
      const top = L.shoulderL.y - at.y - 0.01, hem = -0.7;
      const shell = new THREE.CylinderGeometry(1, 1.08, top - hem, 28, 1, true, 0.36, Math.PI * 2 - 0.72);
      shell.scale(rx, 1, rz).translate(0, (top + hem) / 2, cz);
      parts.push({ geo: shell, mat: 'leather' });
      // A padded yoke across the shoulders and a soft standing collar.
      parts.push({ geo: new THREE.CylinderGeometry(0.055, 0.055, L.shoulderW + 0.06, 10, 1, false).rotateZ(Math.PI / 2).scale(1, 0.75, 1.15).translate(0, L.shoulderL.y - at.y + 0.01, cz + 0.01), mat: 'leather' });
      parts.push({ geo: new THREE.CylinderGeometry(0.08, 0.092, 0.075, 16, 1, true).scale(1, 1, 0.85).translate(0, L.neck.y - at.y + 0.01, L.neck.z - at.z), mat: 'leather' });
      break;
    }
    case 'coat_sleeve_ul':
    case 'coat_sleeve_ur':
    case 'coat_sleeve_ll':
    case 'coat_sleeve_lr': {
      const upper = look.kind.endsWith('ul') || look.kind.endsWith('ur');
      bone = `${upper ? 'upperarm01' : 'lowerarm01'}.${look.kind.endsWith('l') ? 'L' : 'R'}`;
      const b = limbSpan(fig, bone);
      at = b.mid;
      // The upper arm's measured radius is dominated by the shoulder: size the sleeve off the forearm instead.
      const fore = fig.metrics.limb[`lowerarm01.${look.kind.endsWith('l') ? 'L' : 'R'}`] ?? 0.045;
      const r = fore * (upper ? 1.3 : 1.0) + CLOTH * 0.5;
      parts.push({ geo: new THREE.CylinderGeometry(r * (upper ? 1.0 : 0.85), r * (upper ? 1.08 : 1.02), b.len * (upper ? 0.9 : 0.92), 12, 1, true).translate(0, upper ? -b.len * 0.05 : 0, 0), mat: 'leather' });
      break;
    }
    case 'chrome_eye': {
      // A lens housing flush in the socket, a lit iris ring round a glass lens, three small brow plates and a seam
      // to the temple. Concern optics replace both eyes.
      at = new THREE.Vector3(0, L.eye.y, L.eye.z + 0.004);
      const sides = look.grade === 'concern' ? [1, -1] : [Math.sign(L.eye.x) || 1];
      for (const s of sides) {
        const x = s * Math.abs(L.eye.x);
        parts.push({ geo: new THREE.CylinderGeometry(0.019, 0.021, 0.012, 16).rotateX(Math.PI / 2).translate(x, 0, 0), mat: 'polymer' });
        parts.push({ geo: new THREE.TorusGeometry(0.0115, 0.0025, 6, 20).translate(x, 0, 0.007), mat: 'accent' });
        parts.push({ geo: new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 14).rotateX(Math.PI / 2).translate(x, 0, 0.008), mat: 'glass' });
        for (let k = 0; k < 3; k++) parts.push({ geo: box(0.013, 0.008, 0.007, x - 0.016 + k * 0.016, 0.027, -0.003), mat: 'polymer' });
        parts.push({ geo: box(0.028, 0.003, 0.005, x + s * 0.034, 0.012, -0.012), mat: 'steel' });
        parts.push({ geo: box(0.006, 0.0025, 0.0035, x + s * 0.044, 0.02, -0.018), mat: 'accent' });
      }
      break;
    }
    case 'chrome_neural': {
      // A hexagonal port plate behind the right temple: three lit data ports, a steel rim, a cable channel down the
      // neck under a clip, and a hairline seam along the jaw.
      at = new THREE.Vector3(-headR - 0.002, L.eye.y + 0.02, L.eye.z - 0.05);
      parts.push({ geo: new THREE.CylinderGeometry(0.02, 0.02, 0.008, 6).rotateZ(Math.PI / 2), mat: 'polymer' });
      parts.push({ geo: new THREE.TorusGeometry(0.019, 0.002, 5, 6).rotateY(Math.PI / 2).translate(-0.004, 0, 0), mat: 'steel' });
      for (let k = 0; k < 3; k++) parts.push({ geo: new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 6).rotateZ(Math.PI / 2).translate(-0.005, 0.007 - k * 0.007, 0.004), mat: 'accent' });
      parts.push({ geo: box(0.006, 0.06, 0.009, -0.003, -0.045, -0.012, 0.22), mat: 'dark' });
      parts.push({ geo: box(0.009, 0.008, 0.013, -0.003, -0.07, -0.017), mat: 'steel' });
      parts.push({ geo: box(0.002, 0.032, 0.002, -0.001, -0.024, 0.012, 0, 0.35), mat: 'accent' });
      break;
    }
    case 'chrome_arm_l':
    case 'chrome_arm_r': {
      bone = look.kind === 'chrome_arm_l' ? 'lowerarm01.L' : 'lowerarm01.R';
      const b = limbSpan(fig, bone);
      at = b.mid;
      const len = b.len, r = (fig.metrics.limb[bone] ?? 0.04) + 0.004;
      // A plated forearm: a dark under-sleeve, four tapering polymer plates with the under-layer showing in the gaps,
      // a steel elbow cap and wrist ring, a lit line down the outside. Mender work carries a hydraulic ram besides.
      parts.push({ geo: new THREE.CylinderGeometry(r * 0.97, r * 0.82, len * 0.9, 12), mat: 'dark' });
      const n = 4, seg = (len * 0.84) / n;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const rt = r * (1.04 - 0.2 * t0), rb = r * (1.04 - 0.2 * t1);
        parts.push({ geo: new THREE.CylinderGeometry(rb + 0.003, rt + 0.003, seg - 0.007, 12).translate(0, -len * 0.42 + seg * (k + 0.5), 0), mat: 'polymer' });
      }
      parts.push({ geo: new THREE.CylinderGeometry(r * 1.08, r * 1.02, 0.018, 12).translate(0, -len * 0.45, 0), mat: 'steel' });
      parts.push({ geo: new THREE.TorusGeometry(r * 0.86, 0.004, 6, 16).rotateX(Math.PI / 2).translate(0, len * 0.42, 0), mat: 'steel' });
      parts.push({ geo: box(0.005, len * 0.7, 0.0035, r * 0.94, 0, 0), mat: 'accent' });
      parts.push({ geo: box(0.03, 0.028, 0.006, 0, len * 0.3, r * 0.9), mat: 'polymer' });
      if (look.grade === 'dark') {
        parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, len * 0.5, 8).translate(-r * 0.95, -len * 0.08, r * 0.35), mat: 'steel' });
        parts.push({ geo: box(0.017, len * 0.26, 0.017, -r * 0.95, -len * 0.28, r * 0.35), mat: 'polymer' });
      }
      if (look.grade === 'concern') parts.push({ geo: box(0.004, len * 0.5, 0.003, -r * 0.94, len * 0.05, 0), mat: 'accent' });
      break;
    }
    case 'chrome_leg_l':
    case 'chrome_leg_r': {
      bone = look.kind === 'chrome_leg_l' ? 'lowerleg01.L' : 'lowerleg01.R';
      const b = limbSpan(fig, bone);
      at = b.mid;
      const len = b.len, r = (fig.metrics.limb[bone] ?? 0.055) * 0.9 + 0.012;
      // Over the trouser leg: a knee dome, three shin plates and a calf plate in polymer, steel collars at knee and
      // ankle, a lit line down the shin; Mender frames add a ram behind the calf.
      const f = new THREE.Vector3(0, 0, 1).applyQuaternion(b.q.clone().invert());
      const ang = Math.atan2(f.x, f.z);
      const front = (d: number) => [f.x * d, f.z * d] as const;
      parts.push({ geo: new THREE.SphereGeometry(r * 0.78, 10, 8).scale(1, 0.85, 0.9).translate(...[front(r * 0.5)[0], -len * 0.42, front(r * 0.5)[1]]), mat: 'polymer' });
      for (let k = 0; k < 3; k++) {
        const [px, pz] = front(r + 0.006);
        parts.push({ geo: new THREE.BoxGeometry(r * 1.15, len * 0.19, 0.014).rotateY(ang).translate(px, -len * 0.24 + k * len * 0.22, pz), mat: 'polymer' });
      }
      {
        const [px, pz] = front(-(r + 0.004));
        parts.push({ geo: new THREE.BoxGeometry(r * 0.95, len * 0.46, 0.012).rotateY(ang).translate(px, 0, pz), mat: 'polymer' });
      }
      {
        const [px, pz] = front(r + 0.015);
        parts.push({ geo: new THREE.BoxGeometry(0.004, len * 0.62, 0.003).rotateY(ang).translate(px, -len * 0.02, pz), mat: 'accent' });
      }
      parts.push({ geo: new THREE.TorusGeometry(r + 0.004, 0.006, 6, 16).rotateX(Math.PI / 2).translate(0, -len * 0.3, 0), mat: 'steel' });
      parts.push({ geo: new THREE.TorusGeometry(r * 0.7 + 0.004, 0.005, 6, 16).rotateX(Math.PI / 2).translate(0, len * 0.42, 0), mat: 'steel' });
      if (look.grade !== 'concern') {
        const [px, pz] = front(-(r + 0.018));
        parts.push({ geo: new THREE.CylinderGeometry(0.008, 0.008, len * 0.45, 8).translate(px, len * 0.02, pz), mat: 'steel' });
        parts.push({ geo: new THREE.CylinderGeometry(0.014, 0.014, len * 0.2, 8).translate(px, -len * 0.2, pz), mat: 'polymer' });
      }
      break;
    }
    case 'chrome_spine': {
      bone = 'spine03';
      const M = fig.metrics;
      at = new THREE.Vector3(0, L.neck.y - 0.02, M.upperBack.back - 0.008);
      // A nape port over a ridge of five vertebra plates, lit between, on two steel rails.
      parts.push({ geo: new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8).rotateX(Math.PI / 2).translate(0, 0, -0.004), mat: 'steel' });
      parts.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8).rotateX(Math.PI / 2).translate(0, 0, -0.01), mat: 'accent' });
      for (let k = 0; k < 5; k++) {
        const y = -0.035 - k * 0.038;
        parts.push({ geo: box(0.044 - k * 0.003, 0.03, 0.012, 0, y, -0.004), mat: 'polymer' });
        parts.push({ geo: box(0.012, 0.004, 0.004, 0, y + 0.019, -0.009), mat: 'accent' });
      }
      for (const s of [-1, 1]) parts.push({ geo: box(0.004, 0.2, 0.006, s * 0.027, -0.1, -0.004), mat: 'steel' });
      break;
    }
    case 'chrome_skin': {
      bone = 'spine03';
      at = L.chest.clone();
      const M = fig.metrics;
      // Subdermal plate: steel seams along both collarbones with a hairline of light, three hexagonal plates down the
      // sternum, flush with the skin.
      for (const s of [-1, 1]) {
        parts.push({ geo: box(0.12, 0.006, 0.005, s * 0.065, M.shoulder.y - at.y - 0.012, M.shoulder.front - at.z - 0.004, 0, s * 0.2), mat: 'steel' });
        parts.push({ geo: box(0.1, 0.002, 0.004, s * 0.065, M.shoulder.y - at.y - 0.017, M.shoulder.front - at.z - 0.004, 0, s * 0.2), mat: 'accent' });
      }
      for (let k = 0; k < 3; k++) parts.push({ geo: new THREE.CylinderGeometry(0.015, 0.015, 0.005, 6).rotateX(Math.PI / 2).translate(0, 0.0 - k * 0.03, M.chest.front - at.z - 0.001), mat: 'polymer' });
      break;
    }
  }
  if (!parts.length) return [];
  const g = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const byMat = new Map<Part['mat'], THREE.BufferGeometry[]>();
  for (const p of parts) (byMat.get(p.mat) ?? byMat.set(p.mat, []).get(p.mat)!).push(p.geo);
  for (const [kind, geos] of byMat) {
    const merged = mergeGeometries(geos)!;
    for (const x of geos) x.dispose();
    const m = new THREE.Mesh(merged, materialFor(kind, look, look.kind));
    m.castShadow = kind !== 'glass';
    if (look.kind === 'poncho' || look.kind === 'coat' || look.kind.startsWith('coat_sleeve') || look.kind === 'plates' || kind === 'scrap') (m.material as THREE.Material).side = THREE.DoubleSide;
    meshes.push(m);
    g.add(m);
  }
  if (!attach(fig, bone, g, at)) return [];
  // Pieces that wrap a limb use the bone's own frame (local +Y along the bone) instead of figure axes.
  if (ALONG_BONE.includes(look.kind)) {
    const rw = fig.restWorld.get(bone)!;
    g.quaternion.identity();
    g.position.copy(at.clone().applyMatrix4(new THREE.Matrix4().compose(rw.head, rw.q, new THREE.Vector3(1, 1, 1)).invert()));
    if (look.kind === 'armband') (meshes[0].geometry as THREE.BufferGeometry).rotateX(Math.PI / 2);
  }
  return meshes;
}
