// The motion gate's ratchet (docs/PEOPLE_MOTION.md §1.9; CLAUDE.md §2: the waiver policy, owner 2026-11-18), as pure
// functions so `npm run check` runs it (tools/qa/people_gate.mjs) and the tests pin it (tests/people_gate_ratchet.test.ts).

/** A verdict key's set: '' for the standing and walking states, 'combat:<set>' for a fight's ("<measure> combat:<set>"). */
export const setOf = (k) => k.split(' ')[1] ?? '';

/**
 * A verdict's failing cells by measure with each aliased set summed into its baseline's key
 * (motion_gate_inputs.json `aliases`, introduced with combat set v4, 2026-11-18: `combat:strike2` -> `combat:strike`,
 * `combat:dodge` -> `combat:strike`, where the baseline measured them): a state moved to a set of its own is compared, summed with the set it left, against
 * what that set had, never against nothing.
 */
export function fold(byMeasure, aliases = {}) {
  const out = {};
  for (const [k, n] of Object.entries(byMeasure ?? {})) {
    let key = k;
    for (const [from, to] of Object.entries(aliases)) if (k.endsWith(' ' + from)) key = k.slice(0, k.length - from.length) + to;
    out[key] = (out[key] ?? 0) + n;
  }
  return out;
}

/**
 * The keys a new verdict makes worse than the one it replaces, `{ key, was, now }` each (failing cells, folded), when both
 * measured the same set. Compared whether or not the gate's own code changed (a change of the measures' code is no
 * exemption); only a measure named in `spec.remeasured` (made stricter, with its why) is left out, and only while the
 * measures' hash differs. A key whose set the verdict before did not measure at all is not compared.
 */
export function worse(before, verdict, spec = {}) {
  if (!before || !before.byMeasure || !verdict || !verdict.byMeasure || before.set !== verdict.set) return [];
  const aliases = spec.aliases ?? {};
  const remeasured = new Set(Object.keys(spec.remeasured ?? {}));
  const was = fold(before.byMeasure, aliases), now = fold(verdict.byMeasure, aliases);
  const measuredBefore = new Set(Object.keys(was).map(setOf));
  const out = [];
  for (const [key, n] of Object.entries(now)) {
    if (!measuredBefore.has(setOf(key))) continue;
    if (before.measures !== verdict.measures && remeasured.has(key.split(' ')[0])) continue;
    if (n > (was[key] ?? 0)) out.push({ key, was: was[key] ?? 0, now: n });
  }
  return out;
}

/** The failing cells of a folded verdict, over the sets `sets` holds (all when null): overall, and the everyday states'
 * (the standing, walking and gesture states: keys with no set). */
export function totals(folded, sets = null) {
  let all = 0, everyday = 0;
  for (const [key, n] of Object.entries(folded)) {
    if (sets && !sets.has(setOf(key))) continue;
    all += n;
    if (setOf(key) === '') everyday += n;
  }
  return { all, everyday };
}

/**
 * The waiver policy (owner, 2026-11-18, CLAUDE.md §2; docs/PEOPLE_MOTION.md §1.9), replacing "no commit may make any measure
 * worse". A new verdict on the same set as the one it replaces passes when:
 *  1. every key worse than before is listed in `waivers` (docs/qa/gates/motion_waivers.json) with its key, `before` (the
 *     pre-waiver value), `after` (no less than what it is now), a `cause` (or "unknown") and the `fix` item: an unlisted worse
 *     key fails;
 *  2. with any key waived, the failing cells fall, overall and within the everyday states (a total already at nought may stay
 *     there), both counted over the sets the verdict before measured; with no key worse the totals cannot rise;
 *  3. a waived key still above its pre-waiver value two verdicts after the one it was waived on (`since`, that verdict's date)
 *     fails: it must be back within two batches, or the next batch is blocked. `history` holds the dates of the verdicts
 *     there have been (committed, and the new one).
 * Returns `{ problems, worse, totals: { before, now } }`.
 */
export function judge(before, verdict, spec = {}, waivers = [], history = []) {
  const problems = [];
  const bad = worse(before, verdict, spec);
  const aliases = spec.aliases ?? {};
  const was = fold(before?.byMeasure, aliases), now = fold(verdict?.byMeasure, aliases);
  const sets = new Set(Object.keys(was).map(setOf));
  const same = before && verdict && before.byMeasure && verdict.byMeasure && before.set === verdict.set;
  const t = { before: totals(was), now: totals(now, sets) };
  const byKey = new Map((waivers ?? []).map((w) => [w.key, w]));
  for (const b of bad) {
    const w = byKey.get(b.key);
    if (!w) { problems.push(`people made worse: ${b.key} ${b.was} -> ${b.now} failures, not in motion_waivers.json; fix it, revert it, or list it (key, before, after, cause, fix)`); continue; }
    if (typeof w.after !== 'number' || w.after < b.now) problems.push(`waiver ${b.key}: it is at ${b.now}, past the ${w.after} its waiver allows`);
    if (typeof w.before !== 'number' || w.before > b.was) problems.push(`waiver ${b.key}: its pre-waiver value is ${b.was}, not ${w.before}`);
    if (!w.cause || typeof w.cause !== 'string') problems.push(`waiver ${b.key}: no cause (or "unknown")`);
    if (!w.fix || typeof w.fix !== 'string') problems.push(`waiver ${b.key}: no fix item`);
    if (!w.since) problems.push(`waiver ${b.key}: no "since" (the verdict it was waived on)`);
  }
  if (same && bad.length > 0) {
    const fell = (a, b) => b < a || (a === 0 && b === 0);
    if (!fell(t.before.all, t.now.all)) problems.push(`waived keys need the failing cells to fall: ${t.before.all} -> ${t.now.all} overall`);
    if (!fell(t.before.everyday, t.now.everyday)) problems.push(`waived keys need the failing cells to fall: ${t.before.everyday} -> ${t.now.everyday} in the everyday states`);
  }
  for (const w of waivers ?? []) {
    if (!w || !w.key || !w.since) continue;
    const since = (history ?? []).filter((d) => d > w.since).length;
    const at = now[w.key] ?? 0;
    if (since >= 2 && at > (w.before ?? 0)) problems.push(`waiver ${w.key} expired: ${since} verdicts since ${w.since} and still ${at}, over its pre-waiver ${w.before}; the batch is blocked until it is back`);
  }
  return { problems, worse: bad, totals: t };
}
