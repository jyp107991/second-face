// Captured motion for the human rig, from the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu; free for
// all uses, credit in public/assets/human/anim/MOTION_CREDITS.md).
//
// Reads ASF skeletons + AMC trials, computes every bone's world rotation per frame, and exports, for the bones the
// game animates, the rotation relative to the capture's rest pose (world space, the subject turned to face +Z) with
// the rest direction of each source bone. At run time the figure aligns its own rest direction to the source's and
// applies the captured rotation, so every bone points where the captured one pointed, whatever the body's build.
//
//   node tools/assets/motion/cmu.mjs <cmu-data-dir> [--stats] [--only name,name]
//
// Output: public/assets/human/anim/clips.json (index) + clips.bin (int16 quaternions, float32 root positions).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../../public/assets/human/anim');
const UNIT = 0.0254 / 0.45; // ASF length unit → metres
const SRC_FPS = 120, OUT_FPS = 30;

/** Target bone → source bone. Order is the clip's bone order. */
const MAP = [
  ['root', 'root'], ['spine05', 'lowerback'], ['spine03', 'thorax'], ['neck01', 'lowerneck'], ['head', 'head'],
  ['upperleg01.L', 'lfemur'], ['lowerleg01.L', 'ltibia'], ['foot.L', 'lfoot'],
  ['upperleg01.R', 'rfemur'], ['lowerleg01.R', 'rtibia'], ['foot.R', 'rfoot'],
  ['upperarm01.L', 'lhumerus'], ['lowerarm01.L', 'lradius'], ['wrist.L', 'lhand'],
  ['upperarm01.R', 'rhumerus'], ['lowerarm01.R', 'rradius'], ['wrist.R', 'rhand'],
];

/**
 * The clips. `loop: 'gait'` cuts one stride cycle (found by the legs' rhythm) and reports its speed; `loop: 'seam'`
 * takes `range` seconds and cross-fades the ends; no loop keeps the range as a one-shot. `root` keeps the pelvis's
 * travel (falls, getting up); otherwise the clip plays in place.
 */
const CLIPS = [
  { name: 'walk', src: '07_01', loop: 'gait' },
  { name: 'walk_b', src: '08_01', loop: 'gait' },
  { name: 'walk_slow', src: '07_04', loop: 'gait' },
  { name: 'walk_brisk', src: '07_12', loop: 'gait' },
  { name: 'jog', src: '35_17', loop: 'gait' },
  { name: 'jog_b', src: '16_35', loop: 'gait' },
  { name: 'run', src: '09_01', loop: 'gait' },
  { name: 'carry', src: '70_01', loop: 'gait' },
  { name: 'sneak', src: '136_09', loop: 'gait' },
  { name: 'idle', src: '77_02', loop: 'seam', range: [0.5, 7.3], seam: 1.2 },
  { name: 'idle_b', src: '82_08', loop: 'seam', range: [0.5, 6], seam: 1.2 },
  { name: 'idle_c', src: '111_28', loop: 'seam', range: [2, 10], seam: 1.2 },
  { name: 'idle_d', src: '113_21', loop: 'seam', range: [2, 10], seam: 1.2 },
  { name: 'stretch', src: '141_13', loop: false, range: [0, 3] },
  { name: 'yawn', src: '111_32', loop: false, range: [0, 6.2] },
  { name: 'yawn_b', src: '113_23', loop: false, range: [0, 8.4] },
  { name: 'sit', src: '114_05', loop: 'seam', range: [4, 14], seam: 1.2 },
  { name: 'sit_stool', src: '13_04', loop: 'seam', range: [3, 9], seam: 1.0 },
  { name: 'sit_ground', src: '82_05', loop: 'seam', range: [4, 14], seam: 1.2 },
  { name: 'talk', src: '18_08', loop: 'seam', range: [2, 14], seam: 1.0 },
  { name: 'talk_b', src: '19_08', loop: 'seam', range: [2, 14], seam: 1.0 },
  { name: 'argue', src: '18_10', loop: 'seam', range: [2, 12], seam: 1.0 },
  { name: 'drink', src: '13_09', loop: false, range: [0, 8] },
  { name: 'wave', src: '13_26', loop: false, range: [1, 6] },
  { name: 'sweep', src: '13_23', loop: 'seam', range: [2, 10], seam: 0.8 },
  { name: 'guard', src: '13_17', loop: 'seam', range: [2, 8], seam: 0.8 },
  { name: 'fall', src: '90_16', loop: false, root: true },
  { name: 'pickup', src: '26_09', loop: false, range: [0, 6] },
];

// --- quaternion helpers (x, y, z, w) ---------------------------------------------------------------------------
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qInv = (q) => [-q[0], -q[1], -q[2], q[3]];
const qAxis = (ax, a) => { const s = Math.sin(a / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(a / 2)]; };
const qRot = (q, v) => { const u = [q[0], q[1], q[2]], w = q[3]; const uv = cross(u, v), uuv = cross(u, uv); return [v[0] + 2 * (w * uv[0] + uuv[0]), v[1] + 2 * (w * uv[1] + uuv[1]), v[2] + 2 * (w * uv[2] + uuv[2])]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const qNorm = (q) => { const l = Math.hypot(...q) || 1; return q.map((v) => v / l); };
function qSlerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) return qNorm(a.map((v, i) => v + (b[i] - v) * t));
  const th = Math.acos(d), s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return a.map((v, i) => v * wa + b[i] * wb);
}
/** ASF euler (degrees, static XYZ: x first, then y, then z) → quaternion. */
const qEuler = (x, y, z) => qMul(qAxis([0, 0, 1], z * Math.PI / 180), qMul(qAxis([0, 1, 0], y * Math.PI / 180), qAxis([1, 0, 0], x * Math.PI / 180)));

// --- ASF / AMC ---------------------------------------------------------------------------------------------------
function parseASF(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const bones = new Map();
  const rootBone = { name: 'root', direction: [0, 0, 0], length: 0, axis: [0, 0, 0], dof: ['tx', 'ty', 'tz', 'rx', 'ry', 'rz'], parent: null, children: [] };
  bones.set('root', rootBone);
  let i = 0, section = '';
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith(':')) { section = l.split(/\s+/)[0]; i++; continue; }
    if (section === ':root') {
      const [k, ...v] = l.split(/\s+/);
      if (k === 'order') rootBone.dof = v.map((s) => s.toLowerCase());
      if (k === 'axis') rootBone.axisOrder = v[0];
      i++; continue;
    }
    if (section === ':bonedata') {
      if (l === 'begin') {
        const b = { direction: [0, 0, 0], length: 0, axis: [0, 0, 0], dof: [], children: [], parent: null };
        i++;
        while (lines[i] !== 'end') {
          const [k, ...v] = lines[i].split(/\s+/);
          if (k === 'name') b.name = v[0];
          else if (k === 'direction') b.direction = v.slice(0, 3).map(Number);
          else if (k === 'length') b.length = Number(v[0]);
          else if (k === 'axis') b.axis = v.slice(0, 3).map(Number);
          else if (k === 'dof') b.dof = v.map((s) => s.toLowerCase());
          i++;
        }
        bones.set(b.name, b);
      }
      i++; continue;
    }
    if (section === ':hierarchy') {
      if (l !== 'begin' && l !== 'end') {
        const [p, ...cs] = l.split(/\s+/);
        for (const c of cs) { bones.get(c).parent = p; bones.get(p).children.push(c); }
      }
      i++; continue;
    }
    i++;
  }
  for (const b of bones.values()) { b.C = qEuler(...b.axis); b.Cinv = qInv(b.C); }
  return bones;
}

function parseAMC(text) {
  const frames = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith('#') || l.startsWith(':')) continue;
    if (/^\d+$/.test(l)) { cur = {}; frames.push(cur); continue; }
    const [name, ...v] = l.split(/\s+/);
    cur[name] = v.map(Number);
  }
  return frames;
}

/** World rotation (vs rest) and tail position per bone for one frame. */
function pose(bones, frame) {
  const out = new Map();
  const visit = (name, parentQ, head) => {
    const b = bones.get(name);
    const vals = frame[name] ?? [];
    let rx = 0, ry = 0, rz = 0, tx = 0, ty = 0, tz = 0;
    b.dof.forEach((d, k) => { const v = vals[k] ?? 0; if (d === 'rx') rx = v; else if (d === 'ry') ry = v; else if (d === 'rz') rz = v; else if (d === 'tx') tx = v; else if (d === 'ty') ty = v; else if (d === 'tz') tz = v; });
    const local = qMul(b.C, qMul(qEuler(rx, ry, rz), b.Cinv));
    const q = qNorm(qMul(parentQ, local));
    const h = name === 'root' ? [tx * UNIT, ty * UNIT, tz * UNIT] : head;
    const d = qRot(q, b.direction);
    const tail = [h[0] + d[0] * b.length * UNIT, h[1] + d[1] * b.length * UNIT, h[2] + d[2] * b.length * UNIT];
    out.set(name, { q, head: h, tail });
    for (const c of b.children) visit(c, q, tail);
  };
  visit('root', [0, 0, 0, 1], [0, 0, 0]);
  return out;
}

/** Hip height above the ground standing straight: the leg chain with the thigh and shin vertical. */
function hipHeight(bones) {
  const b = (n) => bones.get(n);
  const hipjoint = b('lhipjoint'), femur = b('lfemur'), tibia = b('ltibia'), foot = b('lfoot');
  return (-hipjoint.direction[1] * hipjoint.length + femur.length + tibia.length + Math.max(0, -foot.direction[1] * foot.length)) * UNIT;
}

// --- clip building -----------------------------------------------------------------------------------------------
function loadTrial(dir, id) {
  const subj = id.split('_')[0];
  const bones = parseASF(fs.readFileSync(path.join(dir, subj, `${subj}.asf`), 'utf8'));
  const frames = parseAMC(fs.readFileSync(path.join(dir, subj, `${id}.amc`), 'utf8'));
  return { bones, frames, hip: hipHeight(bones) };
}

/** Per-frame samples in the canonical frame (Y up, facing/travelling +Z): rotations per mapped bone, root position. */
function sampleTrial(trial, f0, f1) {
  const rows = [];
  for (let f = f0; f < f1; f++) {
    const p = pose(trial.bones, trial.frames[f]);
    rows.push({ q: MAP.map(([, s]) => p.get(s).q), pos: p.get('root').head, feet: [p.get('lfoot').tail, p.get('rfoot').tail], femur: [p.get('lfemur').tail, p.get('rfemur').tail] });
  }
  return rows;
}

function yawTo(rows, travel) {
  // The direction to turn to +Z: the travel over the clip, or the mean facing of the pelvis (+Z turned by the root).
  let vx = 0, vz = 0;
  if (travel) { const a = rows[0].pos, b = rows[rows.length - 1].pos; vx = b[0] - a[0]; vz = b[2] - a[2]; }
  else for (const r of rows) { const f = qRot(r.q[0], [0, 0, 1]); vx += f[0]; vz += f[2]; }
  return -Math.atan2(vx, vz);
}

function canonical(rows, yaw, hip) {
  const Y = qAxis([0, 1, 0], yaw);
  const o = rows[0].pos;
  return rows.map((r) => {
    const p = qRot(Y, [r.pos[0] - o[0], 0, r.pos[2] - o[2]]);
    return { q: r.q.map((q) => qNorm(qMul(Y, q))), pos: [p[0], (r.pos[1] - hip) / hip, p[2]], feet: r.feet.map((f) => qRot(Y, [f[0] - o[0], f[1], f[2] - o[2]])) };
  });
}

/** One stride of a gait: period from the legs' rhythm, the cycle starting as the left leg swings furthest forward. */
function gaitCycle(rows) {
  const n = rows.length;
  // Left-minus-right forward foot offset along the travel direction.
  const sig = rows.map((r) => (r.feet[0][2] - r.feet[1][2]));
  const mean = sig.reduce((a, b) => a + b, 0) / n;
  const s = sig.map((v) => v - mean);
  const lag0 = Math.round(0.5 * SRC_FPS), lag1 = Math.min(n - 1, Math.round(2.2 * SRC_FPS));
  const corr = [];
  for (let lag = lag0; lag <= lag1; lag++) {
    let c = 0, m = 0;
    for (let i = 0; i + lag < n; i++) { c += s[i] * s[i + lag]; m++; }
    corr.push(c / m);
  }
  const best = Math.max(...corr);
  // The stride is the first clear peak of the legs' rhythm (a later, stronger one is two strides).
  let P = lag0 + corr.indexOf(best);
  for (let k = 1; k < corr.length - 1; k++) {
    if (corr[k] > corr[k - 1] && corr[k] >= corr[k + 1] && corr[k] > best * 0.55) { P = lag0 + k; break; }
  }
  // Start: the frame of the strongest left-forward offset, with room for a full cycle plus the seam after it.
  const seam = Math.round(P * 0.12);
  // Leave the trial's first and last moments out where it is long enough (the subject starting and stopping).
  const margin = Math.max(0, Math.min(Math.round(0.4 * SRC_FPS), Math.floor((n - P - seam - 1) / 2)));
  let start = margin, top = -Infinity;
  for (let i = margin; i + P + seam < n - margin; i++) if (s[i] > top) { top = s[i]; start = i; }
  if (start + P + seam >= n) throw new Error(`trial too short for a cycle: ${n} frames, period ${P}`);
  return { P, start, seam };
}

function cutLoop(rows, start, P, seam) {
  const out = [];
  for (let i = 0; i < P; i++) {
    const a = rows[start + i];
    if (i < seam) {
      const b = rows[start + P + i], t = (i + 1) / (seam + 1);
      out.push({ q: a.q.map((q, k) => qSlerp(b.q[k], q, t)), pos: a.pos.map((v, k) => b.pos[k] + (v - b.pos[k]) * t) });
    } else out.push({ q: a.q, pos: a.pos });
  }
  return out;
}

function resample(rows, fps) {
  const step = SRC_FPS / fps;
  const out = [];
  for (let t = 0; t < rows.length - 1e-6; t += step) {
    const i = Math.floor(t), f = t - i, a = rows[i], b = rows[Math.min(rows.length - 1, i + 1)];
    out.push({ q: a.q.map((q, k) => qSlerp(q, b.q[k], f)), pos: a.pos.map((v, k) => v + (b.pos[k] - v) * f) });
  }
  return out;
}

function buildClip(def, dir, stats) {
  const trial = loadTrial(dir, def.src);
  const n = trial.frames.length;
  const f0 = def.range ? Math.min(n - 2, Math.round(def.range[0] * SRC_FPS)) : 0;
  const f1 = def.range ? Math.min(n, Math.round(def.range[1] * SRC_FPS)) : n;
  let rows = sampleTrial(trial, f0, f1);
  const yaw = yawTo(rows, def.loop === 'gait' || def.root);
  rows = canonical(rows, yaw, trial.hip);
  let speed = 0, out;
  if (def.loop === 'gait') {
    const { P, start, seam } = gaitCycle(rows);
    const a = rows[start].pos, b = rows[start + P].pos;
    speed = (b[2] - a[2]) / (P / SRC_FPS);
    const cyc = cutLoop(rows, start, P, seam);
    // Play in place: take the travel out of z and centre the sway.
    const mx = cyc.reduce((s, r) => s + r.pos[0], 0) / cyc.length;
    cyc.forEach((r, i) => { r.pos = [r.pos[0] - mx, r.pos[1], 0]; });
    out = resample(cyc, OUT_FPS);
    if (stats) console.log(`  ${def.name}: ${def.src} period ${(P / SRC_FPS).toFixed(2)} s from ${(start / SRC_FPS).toFixed(2)} s, speed ${speed.toFixed(2)} m/s, ${out.length} frames`);
  } else if (def.loop === 'seam') {
    const seam = Math.round((def.seam ?? 1) * SRC_FPS);
    const P = rows.length - seam;
    const cyc = cutLoop(rows, 0, P, seam);
    const mx = cyc.reduce((s, r) => s + r.pos[0], 0) / cyc.length, mz = cyc.reduce((s, r) => s + r.pos[2], 0) / cyc.length;
    cyc.forEach((r) => { r.pos = [r.pos[0] - mx, r.pos[1], r.pos[2] - mz]; });
    out = resample(cyc, OUT_FPS);
    if (stats) console.log(`  ${def.name}: ${def.src} ${(P / SRC_FPS).toFixed(2)} s loop, ${out.length} frames`);
  } else {
    if (!def.root) rows.forEach((r) => { r.pos = [0, r.pos[1], 0]; });
    out = resample(rows, OUT_FPS);
    if (stats) console.log(`  ${def.name}: ${def.src} ${(rows.length / SRC_FPS).toFixed(2)} s one-shot, ${out.length} frames`);
  }
  if (stats) {
    const ys = out.map((r) => r.pos[1]);
    console.log(`    hip ${trial.hip.toFixed(3)} m; rel height ${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)}; frames in trial ${n} (${(n / SRC_FPS).toFixed(1)} s)`);
  }
  // Rest directions of the source bones (the capture's rest pose faces +Z already).
  const dir3 = MAP.map(([, s]) => (s === 'root' ? [0, 1, 0] : trial.bones.get(s).direction));
  return { name: def.name, fps: OUT_FPS, loop: !!def.loop, speed, root: !!def.root, hip: trial.hip, src: `CMU ${def.src}`, dir: dir3, rows: out };
}

/** Root height and the feet's height along a trial, every quarter second: where it stands, sits, falls, walks. */
function traceTrial(def, dir) {
  const trial = loadTrial(dir, def.src);
  const n = trial.frames.length;
  const line = [];
  for (let f = 0; f < n; f += SRC_FPS / 4) {
    const p = pose(trial.bones, trial.frames[f]);
    const root = p.get('root').head, lf = p.get('lfoot').tail, rf = p.get('rfoot').tail;
    line.push(`${(f / SRC_FPS).toFixed(2)}s root ${root[1].toFixed(2)} feet ${Math.min(lf[1], rf[1]).toFixed(2)} travel ${Math.hypot(root[0] - p.get('root').head[0], 0).toFixed(1)} xz ${root[0].toFixed(2)},${root[2].toFixed(2)}`);
  }
  console.log(`trace ${def.name} (${def.src}, ${(n / SRC_FPS).toFixed(1)} s):\n  ` + line.join('\n  '));
}

function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) { console.error('usage: node cmu.mjs <cmu-data-dir> [--stats] [--only a,b]'); process.exit(1); }
  const stats = args.includes('--stats');
  const dry = args.includes('--dry');
  const traceArg = args.find((a) => a.startsWith('--trace='));
  const trace = traceArg ? new Set(traceArg.slice(8).split(',')) : new Set();
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
  const clips = [];
  for (const def of CLIPS) {
    if (only && !only.has(def.name)) continue;
    const subj = def.src.split('_')[0];
    if (!fs.existsSync(path.join(dir, subj, `${def.src}.amc`))) { console.warn(`  skip ${def.name}: ${def.src}.amc not found`); continue; }
    if (trace.has(def.name)) traceTrial(def, dir);
    clips.push(buildClip(def, dir, stats));
  }
  if (dry) return;
  fs.mkdirSync(OUT, { recursive: true });
  // Binary: per clip, int16 quaternions (frames × bones × 4) then float32 positions (frames × 3).
  const parts = [], index = [];
  let offset = 0;
  for (const c of clips) {
    const nb = MAP.length;
    const q = new Int16Array(c.rows.length * nb * 4);
    const p = new Float32Array(c.rows.length * 3);
    c.rows.forEach((r, f) => {
      r.q.forEach((qq, b) => { for (let k = 0; k < 4; k++) q[(f * nb + b) * 4 + k] = Math.round(Math.max(-1, Math.min(1, qq[k])) * 32767); });
      for (let k = 0; k < 3; k++) p[f * 3 + k] = r.pos[k];
    });
    const qb = Buffer.from(q.buffer), pb = Buffer.from(p.buffer);
    index.push({ name: c.name, fps: c.fps, frames: c.rows.length, loop: c.loop, speed: +c.speed.toFixed(3), root: c.root, hip: +c.hip.toFixed(4), src: c.src, dir: c.dir.map((d) => d.map((v) => +v.toFixed(4))), q: offset, p: offset + qb.length });
    parts.push(qb, pb);
    offset += qb.length + pb.length;
  }
  fs.writeFileSync(path.join(OUT, 'clips.bin'), Buffer.concat(parts));
  fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify({ version: 1, bones: MAP.map(([t]) => t), clips: index }));
  console.log(`wrote ${clips.length} clips, ${(offset / 1024).toFixed(0)} KB`);
}

main();
