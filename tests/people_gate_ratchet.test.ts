// The motion gate's ratchet as `npm run check` runs it (tools/qa/people_gate.mjs -> tools/qa/gate_ratchet.mjs): no measure
// worse than the verdict it replaces, the fight's new sets summed into the keys they were measured under before
// (docs/PEOPLE_MOTION.md §1.9; motion_gate_inputs.json `aliases`, combat set v4, 2026-11-18).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fold, worse } from '../tools/qa/gate_ratchet.mjs';

const spec = JSON.parse(readFileSync(new URL('../docs/qa/gates/motion_gate_inputs.json', import.meta.url), 'utf8'));
const base = { set: 'full', measures: 'm1', date: 'before', byMeasure: { W3: 2, 'C1 combat:strike': 10, 'C1 combat:hit': 5, 'F1 combat:aim': 7 } };
const keys = (v: { byMeasure: Record<string, number>; measures?: string }) => worse(base, { set: 'full', measures: v.measures ?? 'm1', ...v }, spec).map((w) => w.key);

describe('the motion gate ratchet', () => {
  it('folds the gate inputs\' alias table: strike2 and dodge into strike, where the baseline measured them', () => {
    expect(spec.aliases).toEqual({ 'combat:strike2': 'combat:strike', 'combat:dodge': 'combat:strike' });
    expect(fold({ 'C1 combat:strike': 6, 'C1 combat:strike2': 5, 'C1 combat:dodge': 2, 'A2 combat:dodge': 3, 'A2 combat:hit': 1 }, spec.aliases))
      .toEqual({ 'C1 combat:strike': 13, 'A2 combat:strike': 3, 'A2 combat:hit': 1 });
  });

  it('fails a merged key made worse, though each of its sets alone is not', () => {
    expect(keys({ byMeasure: { W3: 2, 'C1 combat:strike': 6, 'C1 combat:strike2': 5, 'C1 combat:hit': 5, 'F1 combat:aim': 7 } })).toEqual(['C1 combat:strike']);
    expect(keys({ byMeasure: { W3: 2, 'C1 combat:strike': 8, 'C1 combat:dodge': 3, 'C1 combat:hit': 5, 'F1 combat:aim': 7 } })).toEqual(['C1 combat:strike']);
  });

  it('passes a merged key no worse, and a better one', () => {
    expect(keys({ byMeasure: { W3: 2, 'C1 combat:strike': 4, 'C1 combat:strike2': 3, 'C1 combat:dodge': 3, 'C1 combat:hit': 5, 'F1 combat:aim': 0 } })).toEqual([]);
  });

  it('fails any other measure made worse, the measures\' code changed or not', () => {
    expect(keys({ byMeasure: { W3: 3, 'C1 combat:strike': 10, 'C1 combat:hit': 5 } })).toEqual(['W3']);
    expect(keys({ measures: 'm2', byMeasure: { W3: 3, 'C1 combat:strike': 10, 'C1 combat:hit': 5 } })).toEqual(['W3']);
  });

  it('leaves out only a measure named as remeasured while the measures differ, and a set never measured before', () => {
    const strict = { ...spec, remeasured: { W3: 'made stricter (test)' } };
    const now = { set: 'full', measures: 'm2', byMeasure: { W3: 9, 'K1 combat:peek': 4 } };
    expect(worse(base, now, strict)).toEqual([]);
    expect(worse(base, { ...now, measures: 'm1' }, strict).map((w) => w.key)).toEqual(['W3']);
  });

  it('compares only the same set', () => {
    expect(worse(base, { set: 'pick', measures: 'm1', byMeasure: { W3: 50 } }, spec)).toEqual([]);
  });
});
