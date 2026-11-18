// The motion gate's ratchet (docs/PEOPLE_MOTION.md §1.9; CLAUDE.md §2: no commit may make any measure worse), as pure
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
