// Decimated index buffers for the iso (low) LOD: node tools/mh/decimate.mjs [public/assets/human]
// Appends `<key>_index_lo` views (meshoptimizer quadric simplification, borders locked) to human.bin and
// the lazy proxy files, and records them in human.json. Re-run after tools/mh/build_human.py; keys that
// already have a low index are skipped. Vertices are untouched: the low index references the same vertex
// arrays, so proxy fitting and skinning work unchanged; the runtime compacts unused vertices away.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';

const OUT = process.argv[2] || 'public/assets/human';
const RATIO = { body: 0.3, clothes: 0.3, hair: 0.35, eyes: 0.45, beard: 0.5 };
const MIN_TRIS = 400;

await MeshoptSimplifier.ready;
const manifest = JSON.parse(readFileSync(join(OUT, 'human.json'), 'utf8'));
const CTORS = { float32: Float32Array, int16: Int16Array, uint16: Uint16Array, uint8: Uint8Array, uint32: Uint32Array };
/** File buffers by published path ('' = human.bin), as growable byte arrays. */
const files = new Map();
const fileBytes = (f) => {
  if (!files.has(f)) files.set(f, { bytes: new Uint8Array(readFileSync(join(OUT, f || 'human.bin'))), dirty: false });
  return files.get(f);
};
const view = (name) => {
  const v = manifest.views[name];
  const fb = fileBytes(v.file || '');
  return new CTORS[v.type](fb.bytes.buffer, fb.bytes.byteOffset + v.offset, v.length);
};
const append = (file, name, arr) => {
  const fb = fileBytes(file);
  const pad = (4 - (fb.bytes.length % 4)) % 4;
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  const next = new Uint8Array(fb.bytes.length + pad + bytes.length);
  next.set(fb.bytes, 0);
  next.set(bytes, fb.bytes.length + pad);
  manifest.views[name] = { offset: fb.bytes.length + pad, length: arr.length, type: arr instanceof Uint32Array ? 'uint32' : 'uint16', ...(file ? { file } : {}) };
  fb.bytes = next;
  fb.dirty = true;
};

const base = view('base_pos');
const simplify = (positions, index, ratio) => {
  const tris = index.length / 3;
  if (tris < MIN_TRIS) return null;
  const target = Math.max(MIN_TRIS * 3, Math.floor(tris * ratio) * 3);
  const [lo, err] = MeshoptSimplifier.simplify(new Uint32Array(index), positions, 3, target, 0.03, ['LockBorder']);
  return { lo, err };
};
const report = [];

// Body: render vertices map onto base vertices.
if (!manifest.views.body_index_lo) {
  const map = view('body_map'), idx = view('body_index');
  const pos = new Float32Array(map.length * 3);
  for (let i = 0; i < map.length; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = base[map[i] * 3 + k];
  const r = simplify(pos, idx, RATIO.body);
  if (r) { append('', 'body_index_lo', map.length < 65536 ? new Uint16Array(r.lo) : r.lo); report.push(['body', idx.length / 3, r.lo.length / 3, r.err]); }
}

// Proxies fitted to the base body.
for (const [key, meta] of Object.entries(manifest.proxies)) {
  const ratio = RATIO[meta.kind];
  if (!ratio || manifest.views[key + '_index_lo']) continue;
  const ref = view(key + '_ref'), w = view(key + '_w'), off = view(key + '_off'), idx = view(key + '_index');
  const n = meta.verts;
  const s = { x: 1, y: 1, z: 1 };
  for (const ax of ['x', 'y', 'z']) {
    const sc = meta.scale[ax];
    if (sc) s[ax] = Math.abs(base[sc[0] * 3 + 'xyz'.indexOf(ax)] - base[sc[1] * 3 + 'xyz'.indexOf(ax)]) / sc[2];
  }
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < 3; k++) { const vi = ref[i * 3 + k], wk = w[i * 3 + k]; x += wk * base[vi * 3]; y += wk * base[vi * 3 + 1]; z += wk * base[vi * 3 + 2]; }
    pos[i * 3] = x + off[i * 3] * s.x; pos[i * 3 + 1] = y + off[i * 3 + 1] * s.y; pos[i * 3 + 2] = z + off[i * 3 + 2] * s.z;
  }
  const r = simplify(pos, idx, ratio);
  if (r) { append(meta.file || '', key + '_index_lo', new Uint16Array(r.lo)); report.push([key, idx.length / 3, r.lo.length / 3, r.err]); }
}

for (const [f, fb] of files) if (fb.dirty) writeFileSync(join(OUT, f || 'human.bin'), fb.bytes);
writeFileSync(join(OUT, 'human.json'), JSON.stringify(manifest));
let before = 0, after = 0;
for (const [, a, b] of report) { before += a; after += b; }
console.log(`decimated ${report.length} meshes: ${before} → ${after} tris`);
for (const [k, a, b, e] of report.filter((r) => r[1] > 15000)) console.log(`  ${k}: ${a} → ${b} (err ${e.toFixed(4)})`);
