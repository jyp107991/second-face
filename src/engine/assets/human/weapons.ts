import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { HeldShape } from '../../inventory/items';
import type { HumanFigure } from './figure';

/**
 * Held weapons: low-poly procedural shapes in the right hand, built in the hand's own frame so they
 * follow the arm. The grip sits at the palm; the long axis runs out past the fingers.
 */

type Mat = 'metal' | 'dark' | 'wood' | 'leather' | 'glass' | 'brass';
type Part = { geo: THREE.BufferGeometry; mat: Mat };

const MATERIALS: Record<Mat, () => THREE.Material> = {
  metal: () => new THREE.MeshStandardMaterial({ color: 0x5e5852, roughness: 0.62, metalness: 0.6 }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 0.78, metalness: 0.45 }),
  wood: () => new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.85, metalness: 0 }),
  leather: () => new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.92, metalness: 0 }),
  glass: () => new THREE.MeshStandardMaterial({ color: 0x7a9a86, roughness: 0.2, metalness: 0.2, emissive: 0x1e3a2e, emissiveIntensity: 0.6 }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0x9a7a3a, roughness: 0.5, metalness: 0.7 }),
};

/** A box: `l` along the weapon's long axis (+Z), `h` up (+Y), `w` across (+X), centred at (x, y, z). */
const box = (l: number, h: number, w: number, z: number, y = 0, x = 0, rx = 0): THREE.BufferGeometry =>
  new THREE.BoxGeometry(w, h, l).rotateX(rx).translate(x, y, z);
/** A rod along +Z of radius r and length l, centred at z. */
const rod = (r: number, l: number, z: number, y = 0, x = 0, r2 = r): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(r, r2, l, 10).rotateX(Math.PI / 2).translate(x, y, z);

function shapeParts(shape: HeldShape): Part[] {
  const P: Part[] = [];
  const grip = (h = 0.085, tilt = 0.3, z = 0, mat: Mat = 'leather') => P.push({ geo: new THREE.BoxGeometry(0.03, h, 0.036).rotateX(-tilt).translate(0, -h / 2 + 0.01, z), mat });
  switch (shape) {
    case 'knife':
      P.push({ geo: rod(0.011, 0.09, 0, 0, 0, 0.011), mat: 'leather' });
      P.push({ geo: box(0.15, 0.024, 0.004, 0.12), mat: 'metal' });
      break;
    case 'spike':
      P.push({ geo: rod(0.006, 0.2, 0.06, 0, 0, 0.002), mat: 'metal' });
      break;
    case 'pipe':
      P.push({ geo: rod(0.016, 0.62, 0.18), mat: 'dark' });
      P.push({ geo: rod(0.02, 0.05, 0.44), mat: 'dark' });
      break;
    case 'machete':
      P.push({ geo: rod(0.012, 0.11, -0.01), mat: 'wood' });
      P.push({ geo: box(0.4, 0.05, 0.004, 0.26), mat: 'metal' });
      P.push({ geo: box(0.05, 0.028, 0.006, 0.04), mat: 'brass' });
      break;
    case 'spear':
      P.push({ geo: rod(0.012, 1.5, 0.35), mat: 'wood' });
      P.push({ geo: new THREE.ConeGeometry(0.018, 0.2, 6).rotateX(Math.PI / 2).translate(0, 0, 1.2), mat: 'metal' });
      P.push({ geo: box(0.06, 0.03, 0.03, 1.08), mat: 'leather' });
      break;
    case 'knuckles':
      P.push({ geo: box(0.03, 0.03, 0.085, 0.045), mat: 'metal' });
      for (const x of [-0.03, -0.01, 0.01, 0.03]) P.push({ geo: new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6).rotateX(Math.PI / 2).translate(x, 0, 0.06), mat: 'metal' });
      break;
    case 'sledge':
      P.push({ geo: rod(0.016, 0.85, 0.3), mat: 'wood' });
      P.push({ geo: box(0.1, 0.17, 0.09, 0.7), mat: 'metal' });
      break;
    case 'bottle':
      P.push({ geo: rod(0.034, 0.17, 0.12), mat: 'glass' });
      P.push({ geo: rod(0.016, 0.07, 0.24, 0, 0, 0.03), mat: 'glass' });
      P.push({ geo: box(0.06, 0.05, 0.02, 0.27, 0.02, 0.02, 0.4), mat: 'leather' });
      break;
    case 'can':
      P.push({ geo: rod(0.036, 0.11, 0.07), mat: 'metal' });
      P.push({ geo: rod(0.004, 0.06, 0.14, 0.02), mat: 'leather' });
      break;
    case 'zip':
      P.push({ geo: box(0.22, 0.026, 0.026, 0.11), mat: 'dark' });
      P.push({ geo: box(0.06, 0.04, 0.03, 0.0, -0.01), mat: 'wood' });
      grip(0.08, 0.25);
      break;
    case 'revolver':
      P.push({ geo: rod(0.011, 0.15, 0.13, 0.012), mat: 'metal' });
      P.push({ geo: box(0.1, 0.04, 0.03, 0.03, 0), mat: 'metal' });
      P.push({ geo: new THREE.CylinderGeometry(0.019, 0.019, 0.04, 8).rotateX(Math.PI / 2).translate(0, 0.008, 0.045), mat: 'metal' });
      grip(0.08, 0.35, -0.01, 'wood');
      break;
    case 'pistol':
      P.push({ geo: box(0.19, 0.034, 0.03, 0.08, 0.01), mat: 'dark' });
      P.push({ geo: box(0.1, 0.02, 0.028, 0.06, -0.015), mat: 'metal' });
      grip(0.09, 0.28);
      break;
    case 'arc':
      P.push({ geo: box(0.18, 0.045, 0.036, 0.07, 0.01), mat: 'dark' });
      P.push({ geo: new THREE.TorusGeometry(0.03, 0.009, 6, 14).translate(0, 0.01, 0.17), mat: 'glass' });
      P.push({ geo: new THREE.TorusGeometry(0.022, 0.006, 6, 12).translate(0, 0.01, 0.2), mat: 'glass' });
      P.push({ geo: box(0.08, 0.02, 0.02, 0.02, 0.04), mat: 'brass' });
      grip(0.09, 0.28);
      break;
    case 'smg':
      P.push({ geo: box(0.3, 0.055, 0.04, 0.1, 0.01), mat: 'dark' });
      P.push({ geo: rod(0.01, 0.1, 0.3), mat: 'metal' });
      P.push({ geo: box(0.03, 0.12, 0.024, 0.08, -0.07), mat: 'metal' });
      P.push({ geo: box(0.2, 0.012, 0.012, -0.15, 0.02), mat: 'metal' });
      P.push({ geo: box(0.012, 0.05, 0.05, -0.25, 0.0), mat: 'metal' });
      grip(0.08, 0.25);
      break;
    case 'sawnoff':
      for (const x of [-0.013, 0.013]) P.push({ geo: rod(0.011, 0.3, 0.17, 0.01, x), mat: 'dark' });
      P.push({ geo: box(0.1, 0.05, 0.04, -0.02), mat: 'metal' });
      P.push({ geo: box(0.08, 0.05, 0.036, -0.1, -0.02, 0, -0.25), mat: 'wood' });
      break;
    case 'shotgun':
      P.push({ geo: rod(0.011, 0.6, 0.38, 0.012), mat: 'dark' });
      P.push({ geo: rod(0.008, 0.45, 0.33, -0.012), mat: 'metal' });
      P.push({ geo: box(0.12, 0.034, 0.036, 0.3, -0.01), mat: 'wood' });
      P.push({ geo: box(0.17, 0.05, 0.04, 0.02), mat: 'metal' });
      P.push({ geo: box(0.28, 0.06, 0.038, -0.2, -0.01, 0, -0.12), mat: 'wood' });
      break;
    case 'rifle':
      P.push({ geo: rod(0.009, 0.68, 0.46, 0.012), mat: 'dark' });
      P.push({ geo: box(0.32, 0.045, 0.036, 0.28, -0.012), mat: 'wood' });
      P.push({ geo: box(0.2, 0.05, 0.04, 0.02), mat: 'metal' });
      P.push({ geo: rod(0.014, 0.17, 0.08, 0.05), mat: 'dark' });
      P.push({ geo: box(0.3, 0.065, 0.038, -0.2, -0.015, 0, -0.1), mat: 'wood' });
      P.push({ geo: new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6).rotateZ(Math.PI / 2).translate(0.03, 0.02, 0.0), mat: 'metal' });
      break;
    case 'carbine':
      P.push({ geo: box(0.36, 0.06, 0.044, 0.12, 0.01), mat: 'dark' });
      P.push({ geo: rod(0.01, 0.3, 0.42), mat: 'metal' });
      P.push({ geo: box(0.03, 0.14, 0.03, 0.1, -0.08), mat: 'dark' });
      P.push({ geo: box(0.22, 0.02, 0.02, -0.18, 0.02), mat: 'metal' });
      P.push({ geo: box(0.02, 0.07, 0.05, -0.3, 0.0), mat: 'metal' });
      grip(0.08, 0.25, 0.0);
      break;
  }
  return P;
}

/** Put a weapon in the right hand. Returns the meshes added (empty if the rig lacks the hand). */
export function addHeld(fig: HumanFigure, shape: HeldShape): THREE.Mesh[] {
  const bone = fig.bones.get('wrist.R'), rw = fig.restWorld.get('wrist.R');
  if (!bone || !rw) return [];
  const parts = shapeParts(shape);
  if (!parts.length) return [];
  const g = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const byMat = new Map<Mat, THREE.BufferGeometry[]>();
  for (const p of parts) (byMat.get(p.mat) ?? byMat.set(p.mat, []).get(p.mat)!).push(p.geo);
  for (const [kind, geos] of byMat) {
    const merged = mergeGeometries(geos)!;
    for (const x of geos) x.dispose();
    const m = new THREE.Mesh(merged, MATERIALS[kind]());
    m.castShadow = true;
    meshes.push(m);
    g.add(m);
  }
  g.name = `held_${shape}`;
  // The hand's own frame: the bone runs along local +Y (wrist → fingers). The grip sits in the palm, which is
  // most of the way from the wrist to the base of the middle finger.
  const knuckle = fig.restWorld.get('finger3-1.R')?.head ?? rw.tail;
  const palm = rw.head.clone().lerp(knuckle, 0.62);
  const inv = new THREE.Matrix4().compose(rw.head, rw.q, new THREE.Vector3(1, 1, 1)).invert();
  g.position.copy(palm.applyMatrix4(inv));
  g.quaternion.setFromEuler(new THREE.Euler(HELD_ROT[0], HELD_ROT[1], HELD_ROT[2]));
  bone.add(g);
  return meshes;
}

/** Orientation of a held shape in the hand's frame (tuned by eye against the rig). */
export const HELD_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Close the right hand round a grip: curl every finger bone a little (the thumb less). */
export function closeFist(fig: HumanFigure, side: 'L' | 'R' = 'R', curl = 1.05): void {
  for (let f = 1; f <= 5; f++) for (let seg = 1; seg <= 3; seg++) {
    const b = fig.bones.get(`finger${f}-${seg}.${side}`);
    if (!b) continue;
    b.rotateX(f === 1 ? curl * 0.35 : curl * (seg === 1 ? 0.9 : 1));
  }
}
