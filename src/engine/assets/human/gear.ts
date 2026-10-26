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

export type GearKind = 'poncho' | 'wrap' | 'headwrap' | 'bandana' | 'goggles' | 'goggles_up' | 'respirator' | 'plates' | 'harness' | 'armband' | 'satchel';

export interface GearLook { kind: GearKind; color?: number; grime?: number; wear?: number }

/** Gear that covers the hair. */
export const GEAR_HIDES_HAIR: GearKind[] = ['headwrap'];

type Part = { geo: THREE.BufferGeometry; mat: 'cloth' | 'leather' | 'metal' | 'glass' | 'rubber' };

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
      const w = Math.max(0.2, L.shoulderW * 0.72);
      parts.push({ geo: box(w, 0.2, 0.05, 0, 0.0, 0.12), mat: 'metal' });
      parts.push({ geo: box(w * 0.9, 0.18, 0.04, 0, -0.01, -0.11), mat: 'metal' });
      for (const s of [-1, 1]) parts.push({ geo: box(0.12, 0.06, 0.13, s * (L.shoulderW / 2 + 0.01), L.shoulderL.y - L.chest.y + 0.035, 0, s * 0.25), mat: 'metal' });
      parts.push({ geo: box(0.03, 0.42, 0.015, 0, 0, 0.145, 0.0), mat: 'leather' });
      break;
    }
    case 'harness': {
      bone = 'spine03';
      at = L.chest.clone();
      for (const s of [-1, 1]) parts.push({ geo: box(0.035, 0.46, 0.012, s * 0.03, -0.05, 0.125, s * 0.42), mat: 'leather' });
      parts.push({ geo: new THREE.TorusGeometry(0.165, 0.016, 6, 18).rotateX(Math.PI / 2).scale(1, 1, 0.78).translate(0, -0.24, 0.0), mat: 'leather' });
      parts.push({ geo: box(0.05, 0.07, 0.04, 0.09, -0.24, 0.12), mat: 'leather' });
      parts.push({ geo: box(0.06, 0.05, 0.03, -0.08, -0.22, 0.125), mat: 'metal' });
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
    if (kind === 'cloth' && look.kind === 'poncho') (m.material as THREE.Material).side = THREE.DoubleSide;
    meshes.push(m);
    g.add(m);
  }
  if (!attach(fig, bone, g, at)) return [];
  // Armbands wrap the bone itself: align the torus with the arm instead of figure axes.
  if (look.kind === 'armband') {
    const rw = fig.restWorld.get(bone)!;
    g.quaternion.identity();
    g.position.copy(at.clone().applyMatrix4(new THREE.Matrix4().compose(rw.head, rw.q, new THREE.Vector3(1, 1, 1)).invert()));
    (meshes[0].geometry as THREE.BufferGeometry).rotateX(Math.PI / 2);
  }
  return meshes;
}
