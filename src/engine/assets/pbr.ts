import * as THREE from 'three';

/**
 * The CC0 material library (public/assets/world, fetched by tools/assets/materials.py): real photographed surfaces
 * with normal and ARM (ambient occlusion / roughness / metalness) maps. Walls and props use them as ordinary 2D
 * textures; the ground samples them from array textures so several surfaces blend in one draw.
 */

export interface MaterialEntry { id: string; scale: number; hard: boolean; tint?: string; note?: string; maps: Record<string, boolean> }
interface Manifest { materials: Record<string, MaterialEntry> }

let manifest: Manifest | undefined;
let manifestPromise: Promise<Manifest | undefined> | undefined;
const base = () => import.meta.env.BASE_URL + 'assets/world/';

/** Load the manifest once; a missing library (tests, offline) resolves to undefined and everything falls back. */
export function loadMaterialManifest(): Promise<Manifest | undefined> {
  manifestPromise ??= (typeof fetch === 'function' ? fetch(base() + 'materials.json').then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined) : Promise.resolve(undefined))
    .then((m: Manifest | undefined) => (manifest = m));
  return manifestPromise;
}
export function materialEntry(key: string): MaterialEntry | undefined { return manifest?.materials[key]; }
/** Metres one texture tile covers (the manifest's scale, or the caller's legacy value). */
export function materialScale(key: string, fallback: number): number { return manifest?.materials[key]?.scale ?? fallback; }
export function materialKeys(): string[] { return manifest ? Object.keys(manifest.materials) : []; }

export interface PbrMaps { map: THREE.Texture; normalMap: THREE.Texture; arm: THREE.Texture }
const maps2d = new Map<string, PbrMaps>();
const pending2d = new Map<string, Promise<PbrMaps | undefined>>();
const loader = new THREE.TextureLoader();

function loadTex(url: string, srgb: boolean): Promise<THREE.Texture> {
  return loader.loadAsync(url).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/** The 2D maps of a material if they are loaded (synchronous: builders run after ensurePbr). */
export function pbrMapsSync(key: string): PbrMaps | undefined { return maps2d.get(key); }

/** Texture detail: 'high' ships 1024 px colour maps; everything else 512 (normal and ARM maps are always 512 on phones). */
let detail: 'high' | 'medium' = 'medium';
export function setPbrDetail(d: 'high' | 'medium'): void { detail = d; }

/** Fetch the 2D maps for these keys. Unknown keys are skipped. */
export async function ensurePbr(keys: string[]): Promise<void> {
  const m = await loadMaterialManifest();
  if (!m) return;
  await Promise.all(keys.map((key) => {
    const e = m.materials[key];
    if (!e || maps2d.has(key)) return undefined;
    let p = pending2d.get(key);
    if (!p) {
      const d = detail === 'high' ? '' : '_512', n = detail === 'high' ? '' : '_512';
      p = Promise.all([loadTex(`${base()}mat/${key}_d${d}.webp`, true), loadTex(`${base()}mat/${key}_n${n}.webp`, false), loadTex(`${base()}mat/${key}_a_512.webp`, false)])
        .then(([map, normalMap, arm]) => { const r = { map, normalMap, arm }; maps2d.set(key, r); return r; })
        .catch((err) => { console.warn('pbr', key, err); return undefined; });
      pending2d.set(key, p);
    }
    return p;
  }));
}

/** Several surfaces in one texture array (512 px): the ground's layers. */
export interface GroundLayers {
  keys: string[];
  diff: THREE.DataArrayTexture;
  nor: THREE.DataArrayTexture;
  arm: THREE.DataArrayTexture;
  scales: number[];
  hard: number[];
  tints: THREE.Color[];
}
const arrays = new Map<string, Promise<GroundLayers | undefined>>();
const SIZE = 512;

async function imageData(url: string): Promise<Uint8ClampedArray> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, SIZE, SIZE);
  bmp.close();
  return ctx.getImageData(0, 0, SIZE, SIZE).data;
}

function arrayTexture(layers: Uint8ClampedArray[], srgb: boolean): THREE.DataArrayTexture {
  const data = new Uint8Array(SIZE * SIZE * 4 * layers.length);
  layers.forEach((l, i) => data.set(l, i * SIZE * SIZE * 4));
  const t = new THREE.DataArrayTexture(data, SIZE, SIZE, layers.length);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Build (or reuse) the array textures for an ordered set of material keys. Undefined when the library is absent. */
export function groundLayersFor(keys: string[]): Promise<GroundLayers | undefined> {
  const id = keys.join('|');
  let p = arrays.get(id);
  if (!p) {
    p = (async () => {
      const m = await loadMaterialManifest();
      if (!m || typeof document === 'undefined' || typeof createImageBitmap !== 'function') return undefined;
      const entries = keys.map((k) => m.materials[k]);
      if (entries.some((e) => !e)) return undefined;
      const d = await Promise.all(keys.map((k) => imageData(`${base()}mat/${k}_d_512.webp`)));
      const n = await Promise.all(keys.map((k) => imageData(`${base()}mat/${k}_n_512.webp`)));
      const a = await Promise.all(keys.map((k) => imageData(`${base()}mat/${k}_a_512.webp`)));
      return {
        keys, diff: arrayTexture(d, true), nor: arrayTexture(n, false), arm: arrayTexture(a, false),
        scales: entries.map((e) => e!.scale), hard: entries.map((e) => (e!.hard ? 1 : 0)),
        tints: entries.map((e) => new THREE.Color(e!.tint ? parseInt(e!.tint, 16) : 0xffffff)),
      };
    })().catch((err) => { console.warn('ground layers', err); return undefined; });
    arrays.set(id, p);
  }
  return p;
}
