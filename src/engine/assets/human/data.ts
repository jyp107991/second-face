/**
 * Loader for the converted MakeHuman (CC0) human assets in public/assets/human (built by
 * tools/mh/build_human.py). Loaded once at startup; figures are then built synchronously.
 */

type ViewType = 'float32' | 'int16' | 'uint16' | 'uint8' | 'uint32';

export interface ProxyMeta {
  kind: 'eyes' | 'brows' | 'lashes' | 'teeth' | 'tongue' | 'hair' | 'clothes';
  name: string;
  verts: number;
  scale: Partial<Record<'x' | 'y' | 'z', [number, number, number]>>;
  texture: string | null;
  transparent: boolean;
  zDepth: number;
  delete: boolean;
}

export interface BoneMeta { name: string; parent: string | null; head: string; tail: string; plane: [string, string, string] | null; }
export interface ModifierMeta { id: string; group: string; min?: string; max: string; }

export interface HumanManifest {
  version: number;
  unitScale: number;
  vertexCount: number;
  views: Record<string, { offset: number; length: number; type: ViewType }>;
  heightTargets: string[];
  pca: { k: number; scale: number[]; proj: number[][] };
  /** name → [offset, count, scale] into detail_idx / detail_val. */
  detail: Record<string, [number, number, number]>;
  modifiers: ModifierMeta[];
  bones: BoneMeta[];
  joints: Record<string, number[]>;
  skins: Record<string, string>;
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
      return new CTORS[v.type](buf, v.offset, v.length) as unknown as T;
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
