// The lock (docs/PEOPLE_MOTION.md §1.8; CLAUDE.md §2, owner 2026-11-06): while the motion and posture gate is red, nothing
// with a person in it goes to the owner. Run by `npm run check` and CI. Fails when
//   1. an image of people under docs/evidence/ was added or changed after the gate was last green while the gate is red
//      (red-gate working captures belong under a `_red/` folder and are never sent), or
//   2. an evidence folder of people with images newer than the lock has no REVIEW.md answering every item of the review
//      checklist (1-10) for each of its images (a `## <image file>` section each), or
//   3. with --release (the Android workflow's release job): the gate is red (a playable build has people in it).
// A red check is fixed by making the people pass (HumanMotionGateTests), never by moving images, loosening limits or
// skipping this check.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const VERDICT = join(ROOT, 'docs/qa/gates/motion_gate.json');
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

const verdict = existsSync(VERDICT) ? JSON.parse(readFileSync(VERDICT, 'utf8')) : { green: false, failures: -1 };
const lastGreen = verdict.lastGreen ? Date.parse(verdict.lastGreen) : 0;
const problems = [];

const images = walk(EVIDENCE).filter((f) => PEOPLE.test(relative(EVIDENCE, f)) && !/\/_red\//.test(f));
const recent = images.map((f) => ({ f, t: changed(f) })).filter((x) => x.t >= LOCK);

if (!verdict.green) {
  for (const { f, t } of recent)
    if (t > lastGreen)
      problems.push(`${relative(ROOT, f)}: an image of people added while the motion gate is red (${verdict.failures} measures past their limits)`);
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
if (process.argv.includes('--release') && !verdict.green)
  problems.push(`a playable build is people: no release while the motion gate is red (docs/qa/gates/motion_gate.json, ${verdict.date ?? 'no run recorded'})`);

if (problems.length) {
  console.error(`people gate: FAILED (the gate is ${verdict.green ? 'green' : 'red'}: ${verdict.failures ?? '?'} measures past their limits, ${verdict.date ?? 'no run recorded'})`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`people gate: ok (the motion gate is ${verdict.green ? 'green' : 'RED'}${verdict.green ? '' : `: ${verdict.failures} measures past their limits; nothing with people goes to the owner`})`);
