import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * The model library: CC0 plants, trees and rocks baked by `tools/assets/models.py` (decimated, 512 px WebP,
 * meshopt). A model is a few parts (a trunk, its leaves), each a geometry and a material, ready to be instanced
 * across the land. The manifest says what each is for: its kind, the regions it grows in, whether it blocks walking.
 */
export type ModelKind = 'tree' | 'shrub' | 'grass' | 'rock';
export interface ModelEntry { file: string; id: string; kind: ModelKind; scale: number; blocks: boolean; biomes: string[]; note?: string }
interface ModelManifest { models: Record<string, ModelEntry> }

export interface ModelPart { geometry: THREE.BufferGeometry; material: THREE.Material }
/** One thing to place: its parts (a trunk, its leaves), standing on the origin, with its footprint radius and height in metres. */
export interface Variant { parts: ModelPart[]; radius: number; height: number }
/** A library model: Poly Haven sets lay several variants side by side; each is placed on its own. */
export interface Model { key: string; entry: ModelEntry; variants: Variant[]; /** Of the largest variant. */ radius: number; height: number }

const base = () => `${import.meta.env.BASE_URL ?? '/'}assets/world/`.replace(/\/\/+/g, '/');

let manifest: ModelManifest | undefined;
let manifestP: Promise<ModelManifest | undefined> | undefined;

export function loadModelManifest(): Promise<ModelManifest | undefined> {
  manifestP ??= (typeof fetch === 'function' ? fetch(base() + 'models.json').then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined) : Promise.resolve(undefined))
    .then((m: ModelManifest | undefined) => (manifest = m));
  return manifestP;
}
export function modelEntries(): Record<string, ModelEntry> { return manifest?.models ?? {}; }

let loader: GLTFLoader | undefined;
const models = new Map<string, Promise<Model | undefined>>();

/** Load one model (once). Undefined when the library is absent or the file fails. */
export function loadModel(key: string): Promise<Model | undefined> {
  let p = models.get(key);
  if (!p) {
    p = (async () => {
      const m = await loadModelManifest();
      const entry = m?.models[key];
      if (!entry || typeof document === 'undefined') return undefined;
      if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
      const gltf = await loader.loadAsync(base() + entry.file);
      const meshes: { g: THREE.BufferGeometry; mat: THREE.Material; box: THREE.Box3 }[] = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        // Baked positions are quantised to normalised int16 with the size in the node's scale; take them to floats
        // before the node's transform is applied, or the metres clamp to ±1.
        const g = toFloat(mesh.geometry).applyMatrix4(mesh.matrixWorld);
        g.scale(entry.scale, entry.scale, entry.scale);
        g.computeBoundingBox();
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
        // Plants are cut-outs seen from both sides (bark and wood are opaque in their textures and unaffected);
        // rocks stay single-sided and solid.
        if (entry.kind !== 'rock') { mat.side = THREE.DoubleSide; mat.transparent = false; mat.alphaTest = 0.3; mat.depthWrite = true; }
        mat.roughness = Math.max(mat.roughness, 0.7);
        meshes.push({ g, mat, box: g.boundingBox!.clone() });
      });
      if (!meshes.length) return undefined;
      // Variants: meshes whose footprints stand apart are separate things laid out side by side; meshes that overlap
      // are parts of one thing (a trunk and its leaves).
      const groups: { items: typeof meshes; box: THREE.Box3 }[] = [];
      for (const m of meshes) {
        const b = m.box.clone(); b.min.y = -1e9; b.max.y = 1e9;
        const g = groups.find((gr) => { const o = gr.box.clone(); o.min.y = -1e9; o.max.y = 1e9; o.expandByScalar(0.05); return o.intersectsBox(b); });
        if (g) { g.items.push(m); g.box.union(m.box); } else groups.push({ items: [m], box: m.box.clone() });
      }
      let variants: Variant[] = groups.map((gr) => {
        const c = gr.box.getCenter(new THREE.Vector3());
        const shift = new THREE.Matrix4().makeTranslation(-c.x, -gr.box.min.y, -c.z);
        const size = gr.box.getSize(new THREE.Vector3());
        return { parts: gr.items.map((m) => ({ geometry: m.g.applyMatrix4(shift), material: m.mat })), radius: Math.max(size.x, size.z) / 2, height: size.y };
      });
      // Stray bits (a leaf cluster that stood apart from its trunk) are not things to plant: keep the real variants.
      const tallest = Math.max(...variants.map((v) => v.height)), widest = Math.max(...variants.map((v) => v.radius));
      const whole = variants.filter((v) => v.height >= tallest * 0.45 || v.radius >= widest * 0.45);
      if (whole.length) variants = whole;
      return { key, entry, variants, radius: Math.max(...variants.map((v) => v.radius)), height: Math.max(...variants.map((v) => v.height)) };
    })().catch((err) => { console.warn('model', key, err); return undefined; });
    models.set(key, p);
  }
  return p;
}

/** Every model the manifest lists for a region, loaded. */
export async function modelsFor(region: string): Promise<Model[]> {
  const m = await loadModelManifest();
  if (!m) return [];
  const keys = Object.entries(m.models).filter(([, e]) => e.biomes.includes(region)).map(([k]) => k);
  const out = await Promise.all(keys.map(loadModel));
  return out.filter((x): x is Model => !!x);
}

/** A copy of a geometry with every attribute as plain floats (quantised or normalised ones read through their accessors). */
function toFloat(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) {
    const a = src.getAttribute(name) as THREE.BufferAttribute;
    const size = a.itemSize, n = a.count;
    const out = new Float32Array(n * size);
    for (let i = 0; i < n; i++) for (let c = 0; c < size; c++) out[i * size + c] = a.getComponent(i, c);
    g.setAttribute(name, new THREE.BufferAttribute(out, size));
  }
  if (src.index) g.setIndex(src.index.clone());
  return g;
}
