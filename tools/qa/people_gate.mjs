// The lock (docs/PEOPLE_MOTION.md §1.8-1.9; CLAUDE.md §2, owner 2026-11-06): while the motion and posture gate is red,
// nothing with a person in it goes to the owner. Run by `npm run check` and CI. The gate counts as green only when its
// verdict (docs/qa/gates/motion_gate.json, written by HumanMotionGateTests) is green AND fresh (its hashes are those of the
// people and the measures as they are in the tree: docs/qa/gates/motion_gate_inputs.json) AND over the whole cast (the
// full set, never the quick ten). Fails when
//   1. an image of people under docs/evidence/ was added or changed after the gate was last green while it is not green
//      (red-gate working captures belong under a `_red/` folder and are never sent), or
//   2. an evidence folder of people with images newer than the lock has no REVIEW.md answering every item of the review
//      checklist (1-10) for each of its images (a `## <image file>` section each), or
//   3. a new verdict is worse than the one it replaces on any measure (the same measures and the same set): people are
//      never made worse; a regression is fixed or reverted, never committed, or
//   4. with --release (the Android workflow's release job): the gate is not green (a playable build has people in it).
// A red check is fixed by making the people pass (HumanMotionGateTests), never by moving images, loosening limits,
// editing the verdict, taking files out of the inputs or skipping this check.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const VERDICT_REL = 'docs/qa/gates/motion_gate.json';
const VERDICT = join(ROOT, VERDICT_REL);
const INPUTS = join(ROOT, 'docs/qa/gates/motion_gate_inputs.json');
const EVIDENCE = join(ROOT, 'docs/evidence');
const LOCK = Date.parse('2026-11-06T00:00:00Z');   // evidence from before the lock is grandfathered
const PEOPLE = /(people|motion|layers|lineup|trades|feet|cast|rocketbox|rb_|wardrobe|outfit|p4)/i;
const ITEMS = 10;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(png|jpe?g|webp)$/i.test(name)) out.push(p);
  }
  return out;
}

/** When a file last changed: its last commit, or now if it is new or modified in the working tree. */
function changed(file) {
  const rel = relative(ROOT, file);
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) return Date.now();
    const t = execFileSync('git', ['log', '-1', '--format=%ct', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    return t ? Number(t) * 1000 : Date.now();
  } catch {
    return statSync(file).mtimeMs;
  }
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/** The files a pattern names ('*' within one segment), sorted. */
function expand(pattern) {
  let paths = [ROOT];
  const segs = pattern.split('/');
  segs.forEach((seg, i) => {
    const last = i === segs.length - 1;
    const re = new RegExp('^' + seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');
    const next = [];
    for (const p of paths) {
      if (!existsSync(p) || !statSync(p).isDirectory()) continue;
      for (const name of readdirSync(p).sort()) {
        if (!re.test(name)) continue;
        const q = join(p, name);
        const st = statSync(q);
        if (last ? st.isFile() : st.isDirectory()) next.push(q);
      }
    }
    paths = next;
  });
  return paths;
}

/** SHA-256 over each file's path and the SHA-256 of its bytes, in path order (as HumanMotionGateTests.InputsHash). */
function inputsHash(patterns) {
  const files = [...new Set(patterns.flatMap(expand))].map((f) => relative(ROOT, f).split(sep).join('/')).sort();
  const h = createHash('sha256');
  for (const rel of files) {
    h.update(rel + '\n');
    h.update(createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex') + '\n');
  }
  return { hash: h.digest('hex'), files: files.length };
}

const verdict = existsSync(VERDICT) ? JSON.parse(readFileSync(VERDICT, 'utf8')) : { green: false, failures: -1 };
const spec = JSON.parse(readFileSync(INPUTS, 'utf8'));
const now = { people: inputsHash(spec.people), measures: inputsHash(spec.measures) };
const fresh = verdict.people === now.people.hash && verdict.measures === now.measures.hash;
const full = /^motion_gate_full/.test(verdict.set ?? '');
// the whole cast measured: every person of the tree (a run stopped in its last batch once wrote 70 of the 79 as the cast's)
const castDir = join(ROOT, 'unity/Assets/SecondFace/People/Rocketbox');
const castNow = existsSync(castDir) ? readdirSync(castDir).filter((d) => existsSync(join(castDir, d, `${d}.fbx`))).length : 0;
const whole = !full || (verdict.bodies === castNow && (verdict.cast === undefined || verdict.cast === castNow));
const green = verdict.green === true && fresh && full && whole;
const state = green ? 'green'
  : `RED (${[verdict.green === true ? null : `${verdict.failures ?? '?'} measures past their limits`,
      fresh ? null : 'STALE: the people or the measures changed since it ran (or it predates the hashes): run the gate',
      full ? null : `set "${verdict.set ?? 'none'}" is not the whole cast`,
      whole ? null : `INCOMPLETE: it measured ${verdict.bodies ?? '?'} of the ${castNow} people`].filter(Boolean).join('; ')})`;
const lastGreen = verdict.lastGreen ? Date.parse(verdict.lastGreen) : 0;
const problems = [];

// 3. never worse: against the verdict this one replaces (the committed one while the file is changed in the tree, else
// the one before the last commit that changed it), measure by measure, when both measured the same way the same set
function prior() {
  try {
    const dirty = git(['status', '--porcelain', '--', VERDICT_REL]).trim();
    const commits = git(['log', '--format=%H', '-n', '2', '--', VERDICT_REL]).trim().split('\n').filter(Boolean);
    const base = dirty ? commits[0] : commits[1];
    return base ? JSON.parse(git(['show', `${base}:${VERDICT_REL}`])) : null;
  } catch { return null; }
}
const before = prior();
if (before && before.byMeasure && verdict.byMeasure && before.measures === verdict.measures && before.set === verdict.set) {
  for (const [m, n] of Object.entries(verdict.byMeasure)) {
    const was = before.byMeasure[m] ?? 0;
    if (n > was) problems.push(`people made worse: ${m} ${was} -> ${n} failures (${before.date} -> ${verdict.date}); fix it or revert, never commit a regression`);
  }
}

const images = walk(EVIDENCE).filter((f) => PEOPLE.test(relative(EVIDENCE, f)) && !/\/_red\//.test(f));
const recent = images.map((f) => ({ f, t: changed(f) })).filter((x) => x.t >= LOCK);

if (!green) {
  for (const { f, t } of recent)
    if (t > lastGreen)
      problems.push(`${relative(ROOT, f)}: an image of people added while the motion gate is ${state}`);
}

const byDir = new Map();
for (const { f } of recent) {
  const d = dirname(f);
  if (!byDir.has(d)) byDir.set(d, []);
  byDir.get(d).push(basename(f));
}
for (const [d, files] of byDir) {
  const review = join(d, 'REVIEW.md');
  if (!existsSync(review)) { problems.push(`${relative(ROOT, d)}: no REVIEW.md (the checklist of docs/PEOPLE_MOTION.md §3, item by item, per image)`); continue; }
  const text = readFileSync(review, 'utf8');
  for (const name of files) {
    const at = text.indexOf(`## ${name}`);
    if (at < 0) { problems.push(`${relative(ROOT, review)}: no section "## ${name}"`); continue; }
    const next = text.indexOf('\n## ', at + 3);
    const section = text.slice(at, next < 0 ? undefined : next);
    for (let i = 1; i <= ITEMS; i++)
      if (!new RegExp(`^\\s*${i}\\.\\s+\\S`, 'm').test(section)) problems.push(`${relative(ROOT, review)}: "${name}" does not answer checklist item ${i}`);
  }
}

// a playable build has people in it: none is released while the gate is red (the release job runs this with --release)
if (process.argv.includes('--release') && !green)
  problems.push(`a playable build is people: no release while the motion gate is ${state}`);

const by = verdict.byMeasure ? Object.entries(verdict.byMeasure).filter(([, n]) => n > 0).map(([m, n]) => `${m} ${n}`).join(', ') : '';
if (problems.length) {
  console.error(`people gate: FAILED (the motion gate is ${state}, ${verdict.date ?? 'no run recorded'})`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`people gate: ok (the motion gate is ${state}${by ? `; failing: ${by}` : ''}${green ? '' : '; nothing with people goes to the owner'})`);
