import * as THREE from 'three';
import { humanData, type HumanData, type ProxyMeta } from './data';
import { evaluateShape, type ShapeParams } from './shape';
import { humanTexture } from './textures';
import { applySkinScatter, cavityAO } from './shading';
import { coilyGeometry, coilyMaterial, type BodySurface } from './coily';
import { strandGeometry, strandMaterial } from './strands';
import { BEARD_STYLES, beardField } from './facialHair';
import { HAIRCUTS, haircutField } from './haircuts';
import { hairCardGeometry, hairCardMaterial } from './hairCards';
import type { FacialHair } from '../../data/appearance';

/**
 * A realistic human built from the CC0 MakeHuman base mesh: morphed body, skeleton derived from
 * the morphed joint helpers, fitted proxies (eyes, brows, lashes, teeth, hair, clothes) and a
 * per-character skin texture. Every part shares one Skeleton.
 */

export interface FigureSpec {
  shape: ShapeParams;
  /** Skin texture (already composited canvas) or null for the default. */
  skin: THREE.Texture;
  eyes: string;
  brows?: string;
  lashes?: string;
  hair?: { style: string; color: number };
  browColor?: number;
  /** Proxy names (e.g. 'male_worksuit01', 'shoes02') with optional tints. */
  clothes: { name: string; tint?: number }[];
  facialHair?: FacialHair;
  beardColor?: number;
  /** Skin detail set: 'old' uses deeper creases. */
  skinDetail?: 'm' | 'old';
  /** Strength of the skin detail (creases, pores) normal map, 0..1. */
  skinDetailStrength?: number;
  /** Low detail: no teeth/tongue/lashes (iso view). */
  lod?: 'high' | 'low';
}

const SCALE = 0.1; // MakeHuman decimetres → metres

/** Bones the procedural animation drives. */
export const ANIM_BONES = ['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'head',
  'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R',
  'foot.L', 'foot.R', 'clavicle.L', 'clavicle.R', 'jaw'] as const;

export class HumanFigure {
  readonly root = new THREE.Group();
  readonly skeleton: THREE.Skeleton;
  readonly bones = new Map<string, THREE.Bone>();
  /** Rest world positions/orientations (figure space) per bone, for animation. */
  readonly restWorld = new Map<string, { q: THREE.Quaternion; head: THREE.Vector3; tail: THREE.Vector3 }>();
  readonly restLocal = new Map<string, THREE.Quaternion>();
  readonly meshes: THREE.SkinnedMesh[] = [];
  readonly eyeHeight: number;
  readonly height: number;
  private materials: THREE.Material[] = [];

  constructor(spec: FigureSpec) {
    const d = humanData();
    const P = evaluateShape(d, spec.shape);
    // Ground the figure: lowest body vertex at y = 0.
    let minY = Infinity;
    for (let i = 0; i < d.bodyMap.length; i++) minY = Math.min(minY, P[d.bodyMap[i] * 3 + 1]);
    const toWorld = (i: number, out: THREE.Vector3) => out.set(P[i * 3] * SCALE, (P[i * 3 + 1] - minY) * SCALE, P[i * 3 + 2] * SCALE);

    // --- Skeleton from morphed joint helpers.
    const jointPos = (name: string): THREE.Vector3 => {
      const vs = d.m.joints[name];
      const acc = new THREE.Vector3(), t = new THREE.Vector3();
      for (const v of vs) acc.add(toWorld(v, t));
      return acc.divideScalar(vs.length);
    };
    const metas = d.m.bones;
    const byName = new Map(metas.map((b) => [b.name, b]));
    const order: string[] = [];
    const visit = (n: string) => {
      if (order.includes(n)) return;
      const p = byName.get(n)!.parent;
      if (p) visit(p);
      order.push(n);
    };
    for (const b of metas) visit(b.name);
    const worldM = new Map<string, THREE.Matrix4>();
    const boneList: THREE.Bone[] = [];
    for (const n of order) {
      const meta = byName.get(n)!;
      const head = jointPos(meta.head), tail = jointPos(meta.tail);
      const y = tail.clone().sub(head).normalize();
      let z = new THREE.Vector3(0, 0, 1);
      if (meta.plane) {
        const [a, b, c] = meta.plane.map(jointPos);
        z = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      }
      z.addScaledVector(y, -z.dot(y));
      if (z.lengthSq() < 1e-8) z.set(1, 0, 0).addScaledVector(y, -y.x);
      z.normalize();
      const x = y.clone().cross(z).normalize();
      const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(head);
      worldM.set(n, m);
      const bone = new THREE.Bone();
      bone.name = n;
      const local = meta.parent ? worldM.get(meta.parent)!.clone().invert().multiply(m) : m.clone();
      local.decompose(bone.position, bone.quaternion, bone.scale);
      if (meta.parent) this.bones.get(meta.parent)!.add(bone);
      this.bones.set(n, bone);
      this.restLocal.set(n, bone.quaternion.clone());
      this.restWorld.set(n, { q: new THREE.Quaternion().setFromRotationMatrix(m), head, tail });
    }
    // Skeleton bone order must match the skin indices (manifest order).
    for (const b of metas) boneList.push(this.bones.get(b.name)!);
    this.skeleton = new THREE.Skeleton(boneList);
    const rootBone = this.bones.get(order[0])!;
    this.root.add(rootBone);
    this.root.updateMatrixWorld(true);
    // Inverse bind matrices must be computed from the posed rest skeleton (the constructor ran too early).
    this.skeleton.calculateInverses();

    // --- Body
    const deleted = new Set<number>();
    for (const c of spec.clothes) {
      const key = `clothes_${c.name}`;
      if (d.m.proxies[key]?.delete) for (const v of d.view<Uint16Array>(key + '_delete')) deleted.add(v);
    }
    const body = this.addBody(d, P, minY, spec.skin, deleted, spec.lod ?? 'high', spec.skinDetail ?? 'm', spec.skinDetailStrength ?? 0.7);
    // Afro-textured hair: volumetric coil shells grown from the scalp.
    if (spec.hair?.style.startsWith('coily_')) {
      const g = coilyGeometry(d, body, spec.hair.style, (spec.lod ?? 'high') === 'high' ? 0 : 7, SCALE);
      if (g) this.addMesh(g, coilyMaterial(spec.hair.color));
    }
    // Haircuts: procedural hair cards combed along the cut's direction (short areas are painted).
    const cut = spec.hair ? HAIRCUTS[spec.hair.style] : undefined;
    if (cut && spec.hair) {
      const high = (spec.lod ?? 'high') === 'high';
      const g = hairCardGeometry(d, body, haircutField(spec.hair.style)!, SCALE, { cards: high ? 3200 : 600, segments: high ? 8 : 4, minLengthMM: 8, seed: 4242 });
      if (g) {
        // Lit cards read darker than the painted scalp layer of the same colour: lift to match.
        const hc = new THREE.Color(spec.hair.color), hl = hc.r * 0.3 + hc.g * 0.55 + hc.b * 0.15;
        const col = hc.multiplyScalar(Math.max(1, Math.min(2, 2 - hl * 4))).getHex();
        this.addMesh(g, hairCardMaterial(col, false));
        if (high) this.addMesh(g, hairCardMaterial(col, true)).renderOrder = 2;
      }
    }
    // Facial hair: individual strands grown from the skin (stubble to trimmed beards).
    const beard = spec.facialHair ? BEARD_STYLES[spec.facialHair] : undefined;
    if (beard && spec.facialHair) {
      const longest = Math.max(beard.tache, beard.chin, beard.corner, beard.cheek, beard.jaw, beard.burn);
      const layers = (spec.lod ?? 'high') === 'high' ? (longest <= 4 ? 6 : 14) : 3;
      const g = strandGeometry(d, body, beardField(spec.facialHair)!, layers, SCALE);
      if (g) {
        // Short stubs read darker and ashier than grown hair; longer beards keep the hair colour.
        const base = new THREE.Color(spec.beardColor ?? spec.hair?.color ?? 0x2b1d14);
        const lum = base.r * 0.3 + base.g * 0.55 + base.b * 0.15;
        const grown = [beard.tache, beard.chin, beard.corner, beard.cheek, beard.jaw, beard.burn].filter((l) => l > 0);
        const stubby = Math.min(...grown) <= 4;
        const col = stubby ? base.clone().lerp(new THREE.Color(lum, lum, lum), 0.4).multiplyScalar(0.42) : base.clone().multiplyScalar(0.85);
        const look = stubby
          ? { color: col.getHex(), cell: 0.016, radius: 0.0009, rootShade: 0.1, wave: 0.05, opacity: 0.9 }
          : { color: col.getHex(), cell: 0.012, radius: 0.0021, rootShade: 0.3, wave: longest > 6 ? 0.3 : 0.1 };
        const mesh = this.addMesh(g, strandMaterial(look));
        mesh.castShadow = false;
        mesh.renderOrder = 2;
      }
    }

    // --- Proxies
    const lod = spec.lod ?? 'high';
    this.addProxy(d, P, minY, 'eyes_high-poly', eyeMaterial(spec.eyes));
    if (spec.brows) {
      const meta = d.m.proxies[`brows_${spec.brows}`], c = spec.browColor ?? spec.hair?.color ?? 0x2a1e16;
      this.addProxy(d, P, minY, `brows_${spec.brows}`, hairMaterial(meta, c), hairMaterial(meta, c, true));
    }
    if (lod === 'high') {
      this.addProxy(d, P, minY, `lashes_${spec.lashes ?? 'eyelashes01'}`, hairMaterial(d.m.proxies[`lashes_${spec.lashes ?? 'eyelashes01'}`], 0x1a1410));
    }
    if (spec.hair && spec.hair.style !== 'none') {
      const key = `hair_${spec.hair.style}`;
      if (d.m.proxies[key]) this.addProxy(d, P, minY, key, hairMaterial(d.m.proxies[key], spec.hair.color, false, true), lod === 'high' ? hairMaterial(d.m.proxies[key], spec.hair.color, true, true) : undefined);
    }
    for (const c of spec.clothes) {
      const key = `clothes_${c.name}`;
      if (d.m.proxies[key]) this.addProxy(d, P, minY, key, plainMaterial(d.m.proxies[key], c.tint ?? 0xffffff, 0.92));
    }

    const eye = this.restWorld.get('eye.L');
    this.eyeHeight = eye ? eye.head.y : 1.6;
    this.height = (Math.max(...Array.from({ length: d.bodyMap.length }, (_, i) => P[d.bodyMap[i] * 3 + 1])) - minY) * SCALE;
  }

  private addBody(d: HumanData, P: Float32Array, minY: number, skin: THREE.Texture, deleted: Set<number>, lod: 'high' | 'low', detail: 'm' | 'old', detailStrength: number): BodySurface {
    const n = d.bodyMap.length;
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
    // Smooth normals on base vertices (no UV seams).
    const bn = new Float32Array(d.m.vertexCount * 3);
    const idx = d.bodyIndex;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const keep: number[] = [];
    for (let t = 0; t < idx.length; t += 3) {
      const i0 = d.bodyMap[idx[t]], i1 = d.bodyMap[idx[t + 1]], i2 = d.bodyMap[idx[t + 2]];
      if (deleted.has(i0) || deleted.has(i1) || deleted.has(i2)) continue;
      keep.push(idx[t], idx[t + 1], idx[t + 2]);
      a.fromArray(P, i0 * 3); b.fromArray(P, i1 * 3); c.fromArray(P, i2 * 3);
      e1.subVectors(b, a).cross(e2.subVectors(c, a));
      for (const vi of [i0, i1, i2]) { bn[vi * 3] += e1.x; bn[vi * 3 + 1] += e1.y; bn[vi * 3 + 2] += e1.z; }
    }
    for (let i = 0; i < n; i++) {
      const vi = d.bodyMap[i];
      pos[i * 3] = P[vi * 3] * SCALE; pos[i * 3 + 1] = (P[vi * 3 + 1] - minY) * SCALE; pos[i * 3 + 2] = P[vi * 3 + 2] * SCALE;
      const l = Math.hypot(bn[vi * 3], bn[vi * 3 + 1], bn[vi * 3 + 2]) || 1;
      nrm[i * 3] = bn[vi * 3] / l; nrm[i * 3 + 1] = bn[vi * 3 + 1] / l; nrm[i * 3 + 2] = bn[vi * 3 + 2] / l;
      // Weights are stored as bytes; renormalise so they sum to exactly 1 (otherwise skinning
      // scales vertices toward the origin and the mesh tears).
      let tot = 0;
      for (let k = 0; k < 4; k++) tot += d.skinW[vi * 4 + k];
      for (let k = 0; k < 4; k++) { skinIndex[i * 4 + k] = d.skinIdx[vi * 4 + k]; skinWeight[i * 4 + k] = tot ? d.skinW[vi * 4 + k] / tot : k === 0 ? 1 : 0; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(d.bodyUv), 2));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    g.setIndex(keep);
    // Cavity occlusion as vertex colours (eye sockets, nostrils, lip corners, ear folds).
    const ao = cavityAO(pos, nrm, keep, n);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = ao[i]; col[i * 3] = v; col[i * 3 + 1] = v * 0.97; col[i * 3 + 2] = v * 0.96; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = lod === 'high'
      ? new THREE.MeshPhysicalMaterial({
        map: skin, vertexColors: true, roughness: 0.5, metalness: 0, specularIntensity: 0.55,
        ...skinDetailMaps(d, detail, detailStrength),
        sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x6a4a40),
      })
      : new THREE.MeshStandardMaterial({ map: skin, vertexColors: true, roughness: 0.58, metalness: 0 });
    applySkinScatter(mat);
    this.addMesh(g, mat);
    return { pos, nrm, index: keep, skinIndex, skinWeight };
  }

  private addProxy(d: HumanData, P: Float32Array, minY: number, key: string, mat: THREE.Material, blendEdges?: THREE.Material): void {
    const meta = d.m.proxies[key];
    if (!meta) return;
    const ref = d.view<Uint16Array>(key + '_ref'), w = d.view<Float32Array>(key + '_w'), off = d.view<Float32Array>(key + '_off');
    const n = meta.verts;
    const s = { x: 1, y: 1, z: 1 };
    for (const ax of ['x', 'y', 'z'] as const) {
      const sc = meta.scale[ax];
      if (sc) s[ax] = Math.abs(P[sc[0] * 3 + 'xyz'.indexOf(ax)] - P[sc[1] * 3 + 'xyz'.indexOf(ax)]) / sc[2];
    }
    const pos = new Float32Array(n * 3);
    const skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
    const acc = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, z = 0;
      acc.clear();
      for (let k = 0; k < 3; k++) {
        const vi = ref[i * 3 + k], wk = w[i * 3 + k];
        if (!wk) continue;
        x += wk * P[vi * 3]; y += wk * P[vi * 3 + 1]; z += wk * P[vi * 3 + 2];
        for (let j = 0; j < 4; j++) {
          const bw = d.skinW[vi * 4 + j];
          if (bw) acc.set(d.skinIdx[vi * 4 + j], (acc.get(d.skinIdx[vi * 4 + j]) ?? 0) + wk * bw);
        }
      }
      x += off[i * 3] * s.x; y += off[i * 3 + 1] * s.y; z += off[i * 3 + 2] * s.z;
      pos[i * 3] = x * SCALE; pos[i * 3 + 1] = (y - minY) * SCALE; pos[i * 3 + 2] = z * SCALE;
      const top = [...acc.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4);
      const tot = top.reduce((t, e) => t + e[1], 0) || 1;
      top.forEach(([bi, bw], j) => { skinIndex[i * 4 + j] = bi; skinWeight[i * 4 + j] = bw / tot; });
      if (!top.length) { skinIndex[i * 4] = 0; skinWeight[i * 4] = 1; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(d.view<Float32Array>(key + '_uv')), 2));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(d.view<Uint16Array>(key + '_index')), 1));
    smoothNormals(g);
    const mesh = this.addMesh(g, mat);
    mesh.renderOrder = meta.zDepth;
    // Strand edges: a second, alpha-blended pass over the same geometry for soft hair edges.
    if (blendEdges) {
      const edge = this.addMesh(g, blendEdges);
      edge.renderOrder = meta.zDepth + 10;
      edge.castShadow = false;
    }
  }

  private addMesh(g: THREE.BufferGeometry, mat: THREE.Material): THREE.SkinnedMesh {
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    mesh.bind(this.skeleton, new THREE.Matrix4());
    this.meshes.push(mesh);
    this.materials.push(mat);
    return mesh;
  }

  // --- Animation helpers ---------------------------------------------------------------------

  private tmpQ = new THREE.Quaternion();
  private tmpQ2 = new THREE.Quaternion();

  resetPose(): void {
    for (const [n, q] of this.restLocal) this.bones.get(n)!.quaternion.copy(q);
  }

  /** Rotate a bone by `rot` expressed in figure space, relative to its rest pose. */
  rotateFigure(name: string, rot: THREE.Quaternion): void {
    const b = this.bones.get(name), rw = this.restWorld.get(name), rl = this.restLocal.get(name);
    if (!b || !rw || !rl) return;
    // local' = restLocal * (restWorld⁻¹ · rot · restWorld)
    this.tmpQ.copy(rw.q).invert().multiply(rot).multiply(rw.q);
    b.quaternion.copy(rl).multiply(this.tmpQ);
  }

  /** Rotation (figure space) that turns the bone's rest direction toward `dir`. */
  aimRotation(name: string, dir: THREE.Vector3, out = this.tmpQ2): THREE.Quaternion {
    const rw = this.restWorld.get(name)!;
    const rest = rw.tail.clone().sub(rw.head).normalize();
    return out.setFromUnitVectors(rest, dir.clone().normalize());
  }

  dispose(): void {
    for (const m of this.meshes) m.geometry.dispose();
    for (const m of this.materials) m.dispose();
  }
}

function smoothNormals(g: THREE.BufferGeometry): void {
  // Merge normals of vertices sharing a position (UV seams) for seamless shading.
  g.computeVertexNormals();
  const pos = g.getAttribute('position') as THREE.BufferAttribute, nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  const key = (i: number) => `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
  const sums = new Map<string, THREE.Vector3>();
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    const v = sums.get(k) ?? new THREE.Vector3();
    v.x += nrm.getX(i); v.y += nrm.getY(i); v.z += nrm.getZ(i);
    sums.set(k, v);
  }
  for (let i = 0; i < pos.count; i++) {
    const v = sums.get(key(i))!.clone().normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
  }
}

// --- Materials ---------------------------------------------------------------------------------

function eyeMaterial(color: string): THREE.Material {
  const d = humanData();
  const rel = d.m.eyes[color] ?? d.m.eyes.brown;
  return new THREE.MeshStandardMaterial({ map: humanTexture(rel), roughness: 0.15, metalness: 0, alphaTest: 0.5 });
}

/**
 * Strand textures (hair, brows, lashes): desaturated and tinted to the hair colour. The opaque pass
 * keeps only solid texels (writes depth); the optional blended pass draws the soft fringes on top.
 */
function hairMaterial(meta: ProxyMeta | undefined, color: number, blended = false, sheen = false): THREE.Material {
  // Sheen gives the soft fibre highlight that keeps hair cards from reading as a solid shell.
  const m = new THREE.MeshPhysicalMaterial({
    map: meta?.texture ? humanTexture(meta.texture) : null, color, roughness: 0.72, metalness: 0, envMapIntensity: 0.12,
    ...(sheen ? { sheen: 0.6, sheenRoughness: 0.32, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xd8cfc0), 0.35) } : {}),
    normalMap: meta?.normal ? humanTexture(meta.normal, false) : null,
    side: THREE.DoubleSide,
    ...(blended ? { transparent: true, depthWrite: false, alphaTest: 0.02 } : { alphaTest: 0.55 }),
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 texelColor = texture2D( map, vMapUv );
        float l = dot(texelColor.rgb, vec3(0.299, 0.587, 0.114));
        // Keep the strand detail: stronger contrast from the texture's luminance.
        diffuseColor.rgb *= clamp(0.12 + pow(l, 0.9) * 1.9, 0.0, 1.8);
        diffuseColor.a *= texelColor.a;
      #endif`);
  };
  m.customProgramCacheKey = () => 'hairTint' + (blended ? 'B' : 'O') + (sheen ? 'S' : '');
  return m;
}

/** Pores/creases (normal) for skin from the shared community detail maps; falls back to a photo bump. */
// Mindfront normal maps use the DirectX (green-down) convention, hence the flipped Y.
function skinDetailMaps(d: HumanData, detail: 'm' | 'old', k: number): Partial<THREE.MeshPhysicalMaterialParameters> {
  const n = d.m.skinDetail?.[detail === 'old' ? 'normal_old' : 'normal_m'];
  return n ? { normalMap: humanTexture(n, false), normalScale: new THREE.Vector2(k, -k) } : {};
}

function plainMaterial(meta: ProxyMeta | undefined, tint: number, roughness: number): THREE.Material {
  return new THREE.MeshStandardMaterial({
    map: meta?.texture ? humanTexture(meta.texture) : null, color: tint, roughness, metalness: 0,
    alphaTest: meta?.transparent ? 0.4 : 0, side: meta?.transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
}
