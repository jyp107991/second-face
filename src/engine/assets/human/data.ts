/**
 * Loader for the converted MakeHuman (CC0) human assets in public/assets/human (built by
 * tools/mh/build_human.py). The core set is loaded once at startup; garments live in their own files and are
 * fetched on demand with ensureProxies() before the figures that wear them are built (figures build synchronously).
 */

type ViewType = 'float32' | 'int16' | 'uint16' | 'uint8' | 'uint32';

export interface ProxyMeta {
  kind: 'eyes' | 'brows' | 'lashes' | 'teeth' | 'tongue' | 'hair' | 'clothes' | 'beard';
  name: string;
  verts: number;
  scale: Partial<Record<'x' | 'y' | 'z', [number, number, number]>>;
  texture: string | null;
  /** Tangent-space normal map, if the asset has one. */
  normal?: string | null;
  transparent: boolean;
  zDepth: number;
  delete: boolean;
  /** Lazily loaded data file (garments); absent for the core set in human.bin. */
  file?: string;
}

export interface BoneMeta { name: string; parent: string | null; head: string; tail: string; plane: [string, string, string] | null; }
export interface ModifierMeta { id: string; group: string; min?: string; max: string; }

export interface HumanManifest {
  version: number;
  unitScale: number;
  vertexCount: number;
  views: Record<string, { offset: number; length: number; type: ViewType; file?: string }>;
  heightTargets: string[];
  pca: { k: number; scale: number[]; proj: number[][] };
  /** name → [offset, count, scale] into detail_idx / detail_val. */
  detail: Record<string, [number, number, number]>;
  modifiers: ModifierMeta[];
  bones: BoneMeta[];
  joints: Record<string, number[]>;
  skins: Record<string, string>;
  /** Shared skin detail maps (all skins share one UV layout). */
  skinDetail?: Partial<Record<'normal_m' | 'spec_m' | 'normal_old' | 'spec_old', string>>;
  eyes: Record<string, string>;
  proxies: Record<string, ProxyMeta>;
  expressions: Record<string, Record<string, number>>;
}

export interface HumanData {
  m: HumanManifest;
  base: Float32Array;
  bodyMap: Uint16Array;
  bodyUv: Float32Array;
  bodyIndex: Uint16Array | Uint32Array;
  detailIdx: Uint16Array;
  detailVal: Int16Array;
  pca: Int16Array;
  skinIdx: Uint8Array;
  skinW: Uint8Array;
  url: (rel: string) => string;
  view<T extends ArrayBufferView>(name: string): T;
  has(name: string): boolean;
}

let cached: Promise<HumanData> | undefined;
/** Lazily loaded data files by published path. */
const files = new Map<string, ArrayBuffer>();
const pending = new Map<string, Promise<void>>();
let ready: HumanData | undefined;

const CTORS = { float32: Float32Array, int16: Int16Array, uint16: Uint16Array, uint8: Uint8Array, uint32: Uint32Array };

export function humanData(): HumanData {
  if (!ready) throw new Error('Human assets not loaded yet (call loadHumanData first)');
  return ready;
}

export function humanDataReady(): boolean { return !!ready; }

export function loadHumanData(baseUrl = import.meta.env.BASE_URL + 'assets/human/'): Promise<HumanData> {
  cached ??= (async () => {
    const [mRes, bRes] = await Promise.all([fetch(baseUrl + 'human.json'), fetch(baseUrl + 'human.bin')]);
    if (!mRes.ok || !bRes.ok) throw new Error('Failed to load human assets');
    const m = (await mRes.json()) as HumanManifest;
    const buf = await bRes.arrayBuffer();
    const view = <T extends ArrayBufferView>(name: string): T => {
      const v = m.views[name];
      if (!v) throw new Error(`Missing human data view ${name}`);
      const b = v.file ? files.get(v.file) : buf;
      if (!b) throw new Error(`Human data ${name} not loaded (ensureProxies first)`);
      return new CTORS[v.type](b, v.offset, v.length) as unknown as T;
    };
    ready = {
      m,
      base: view('base_pos'), bodyMap: view('body_map'), bodyUv: view('body_uv'), bodyIndex: view('body_index'),
      detailIdx: view('detail_idx'), detailVal: view('detail_val'), pca: view('pca'), skinIdx: view('skin_idx'), skinW: view('skin_w'),
      url: (rel) => baseUrl + rel,
      view,
      has: (name) => name in m.views,
    };
    return ready;
  })();
  return cached;
}

/** True when a proxy exists and its data is in memory. */
export function proxyLoaded(key: string): boolean {
  const meta = ready?.m.proxies[key];
  return !!meta && (!meta.file || files.has(meta.file));
}

/** Fetch the data files of lazily loaded proxies (unknown keys are ignored). */
export async function ensureProxies(keys: Iterable<string>): Promise<void> {
  const d = await loadHumanData();
  const jobs: Promise<void>[] = [];
  for (const k of keys) {
    const f = d.m.proxies[k]?.file;
    if (!f || files.has(f)) continue;
    let p = pending.get(f);
    if (!p) {
      p = fetch(d.url(f)).then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load ${f}`);
        files.set(f, await r.arrayBuffer());
      }).finally(() => pending.delete(f));
      pending.set(f, p);
    }
    jobs.push(p);
  }
  await Promise.all(jobs);
}
