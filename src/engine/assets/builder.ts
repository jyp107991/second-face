import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyWorldUVs, flatMaterial, surfaceMaterial } from './materials';
import type { SurfaceKind } from './textures';
import type { Rng } from '../core/rng';

export type Surface = SurfaceKind | 'flat' | 'glow';

interface Bucket { surface: Surface; cutaway: boolean; shadow: boolean; geos: THREE.BufferGeometry[]; }

const tmpColor = new THREE.Color();

/**
 * Accumulates transformed, vertex-coloured geometry and merges it into one mesh per material.
 * This is how a whole map becomes ~10 draw calls.
 */
export class GeoBuilder {
  private buckets = new Map<string, Bucket>();
  /** Current transform applied to everything added (prop-local space). */
  matrix = new THREE.Matrix4();
  /** Cutaway applied when an add() call doesn't specify one. */
  cutawayDefault = false;

  constructor(private rng?: Rng) {}

  add(geo: THREE.BufferGeometry, surface: Surface, color: number, local?: THREE.Matrix4, opts: { cutaway?: boolean; shadow?: boolean; jitter?: number } = {}): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = local ? this.matrix.clone().multiply(local) : this.matrix;
    g.applyMatrix4(m);
    g.deleteAttribute('uv');
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    const colors = new Float32Array(n * 3);
    tmpColor.setHex(color);
    const j = opts.jitter ?? 0.06;
    const v = this.rng ? 1 + (this.rng.next() - 0.5) * 2 * j : 1;
    for (let i = 0; i < n; i++) {
      colors[i * 3] = tmpColor.r * v; colors[i * 3 + 1] = tmpColor.g * v; colors[i * 3 + 2] = tmpColor.b * v;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (surface !== 'flat' && surface !== 'glow') applyWorldUVs(g, surface === 'grate' || surface === 'tile' ? 1 : 2);
    else g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const cut = opts.cutaway ?? this.cutawayDefault;
    const key = `${surface}|${cut}|${opts.shadow ?? true}`;
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = { surface, cutaway: cut, shadow: opts.shadow ?? true, geos: [] }));
    b.geos.push(g);
  }

  // --- primitive helpers (local coords relative to this.matrix) ---
  box(w: number, h: number, d: number, x: number, y: number, z: number, surface: Surface, color: number, ry = 0, opts?: { cutaway?: boolean; shadow?: boolean; rx?: number; rz?: number }): void {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(opts?.rx ?? 0, ry, opts?.rz ?? 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this.add(g, surface, color, m, opts);
  }

  cyl(rTop: number, rBot: number, h: number, seg: number, x: number, y: number, z: number, surface: Surface, color: number, opts?: { cutaway?: boolean; shadow?: boolean; rx?: number; rz?: number; ry?: number }): void {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(opts?.rx ?? 0, opts?.ry ?? 0, opts?.rz ?? 0)),
      new THREE.Vector3(1, 1, 1),
    );
    this.add(g, surface, color, m, opts);
  }

  rock(r: number, x: number, y: number, z: number, color: number, detail = 0, squash = 0.7, opts?: { cutaway?: boolean }): void {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const rnd = this.rng;
    for (let i = 0; i < pos.count; i++) {
      const k = 0.75 + (rnd ? rnd.next() : 0.5) * 0.45;
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * squash, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    const m = new THREE.Matrix4().makeTranslation(x, y, z);
    this.add(g, 'rock', color, m, { cutaway: opts?.cutaway, jitter: 0.1 });
  }

  /** Run fn with this.matrix temporarily set to a placement transform. */
  at(x: number, z: number, ry: number, scale: number, fn: () => void): void {
    const prev = this.matrix;
    this.matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
      new THREE.Vector3(scale, scale, scale),
    );
    fn();
    this.matrix = prev;
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    for (const b of this.buckets.values()) {
      const merged = mergeGeometries(b.geos, false);
      for (const g of b.geos) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mat = b.surface === 'flat'
        ? flatMaterial({ cutaway: b.cutaway })
        : b.surface === 'glow'
          ? glowMaterial()
          : surfaceMaterial(b.surface, { cutaway: b.cutaway });
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = b.shadow && b.surface !== 'glow';
      mesh.receiveShadow = b.surface !== 'glow';
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

let glow: THREE.MeshBasicMaterial | undefined;
function glowMaterial(): THREE.MeshBasicMaterial {
  return (glow ??= new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
}
