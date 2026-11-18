// The motion gate's ratchet as `npm run check` runs it (tools/qa/people_gate.mjs -> tools/qa/gate_ratchet.mjs): no measure
// worse than the verdict it replaces, the fight's new sets summed into the keys they were measured under before
// (docs/PEOPLE_MOTION.md §1.9; motion_gate_inputs.json `aliases`, combat set v4, 2026-11-18).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fold, judge, worse } from '../tools/qa/gate_ratchet.mjs';

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

  it('leaves out a new measure (introduced) while the measures differ, from the keys and the totals; then compares it', () => {
    expect(Object.keys(spec.introduced ?? {})).toEqual(expect.arrayContaining(['FY1', 'FY2']));
    const now = { set: 'full', measures: 'm2', date: 'now', byMeasure: { ...base.byMeasure, 'FY1 combat:aim': 30, 'FY2 combat:ready': 9 } };
    expect(worse(base, now, spec)).toEqual([]);
    const r = judge(base, now, spec, [], ['before', 'now']);
    expect(r.problems).toEqual([]);
    expect(r.totals.now).toEqual(r.totals.before);
    // committed on its code (the same measures' hash), a new measure is compared as any other
    const later = { ...now, measures: 'm2', byMeasure: { ...now.byMeasure, 'FY1 combat:aim': 31 } };
    expect(worse(now, later, spec).map((w) => w.key)).toEqual(['FY1 combat:aim']);
    // and never hides an old measure's regression
    expect(worse(base, { ...now, byMeasure: { ...now.byMeasure, W3: 3 } }, spec).map((w) => w.key)).toEqual(['W3']);
  });

  it('compares only the same set', () => {
    expect(worse(base, { set: 'pick', measures: 'm1', byMeasure: { W3: 50 } }, spec)).toEqual([]);
  });

  describe('the waiver policy (owner, 2026-11-18)', () => {
    const was = { set: 'full', measures: 'm1', date: '2026-11-17T00:00:00Z', byMeasure: { W3: 4, A1: 6, 'C1 combat:strike': 10, 'F1 combat:aim': 40 } };
    const now = { set: 'full', measures: 'm1', date: '2026-11-18T00:00:00Z', byMeasure: { W3: 5, A1: 2, 'C1 combat:strike': 12, 'F1 combat:aim': 10 } };
    const waivers = [
      { key: 'W3', before: 4, after: 5, cause: 'broad men against a slim actor\'s swing', fix: 'T5 garments', since: '2026-11-18T00:00:00Z' },
      { key: 'C1 combat:strike', before: 10, after: 12, cause: 'unknown', fix: 'v4.2 blows', since: '2026-11-18T00:00:00Z' },
    ];
    const history = ['2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z'];

    it('fails an unlisted worse key', () => {
      const r = judge(was, now, spec, waivers.slice(0, 1), history);
      expect(r.problems.some((p) => p.includes('C1 combat:strike') && p.includes('not in motion_waivers.json'))).toBe(true);
    });

    it('passes listed worse keys when the cells fall overall and in the everyday states', () => {
      const r = judge(was, now, spec, waivers, history);
      expect(r.problems).toEqual([]);
      expect(r.totals).toEqual({ before: { all: 60, everyday: 10 }, now: { all: 29, everyday: 7 } });
    });

    it('fails waived keys when the everyday cells do not fall, though the total does', () => {
      const flat = { ...now, byMeasure: { ...now.byMeasure, A1: 5 } };
      const r = judge(was, flat, spec, waivers, history);
      expect(r.problems.some((p) => p.includes('everyday'))).toBe(true);
    });

    it('fails waived keys when the total does not fall', () => {
      const up = { ...now, byMeasure: { ...now.byMeasure, 'F1 combat:aim': 45 } };
      expect(judge(was, up, spec, waivers, history).problems.some((p) => p.includes('overall'))).toBe(true);
    });

    it('fails a key past its waiver, a waiver with no cause or fix, and a wrong pre-waiver value', () => {
      const past = { ...now, byMeasure: { ...now.byMeasure, W3: 6 } };
      expect(judge(was, past, spec, waivers, history).problems.some((p) => p.includes('past the 5'))).toBe(true);
      const bare = [{ key: 'W3', before: 4, after: 5, since: '2026-11-18T00:00:00Z' }, waivers[1]];
      const pr = judge(was, now, spec, bare as never, history).problems;
      expect(pr.some((p) => p.includes('no cause'))).toBe(true);
      expect(pr.some((p) => p.includes('no fix'))).toBe(true);
      const wrong = [{ ...waivers[0], before: 5 }, waivers[1]];   // (a pre-waiver value claimed higher than it was: a looser target)
      expect(judge(was, now, spec, wrong, history).problems.some((p) => p.includes('pre-waiver value'))).toBe(true);
    });

    it('blocks a waiver still open two batches on, and lets one back at its pre-waiver value go', () => {
      const later = ['2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z', '2026-11-19T00:00:00Z', '2026-11-20T00:00:00Z'];
      const next = { set: 'full', measures: 'm1', date: '2026-11-20T00:00:00Z', byMeasure: { W3: 5, A1: 2, 'C1 combat:strike': 10, 'F1 combat:aim': 10 } };
      const r = judge(now, next, spec, waivers, later);
      expect(r.problems.some((p) => p.includes('waiver W3 expired'))).toBe(true);
      expect(r.problems.some((p) => p.includes('C1 combat:strike') && p.includes('expired'))).toBe(false);
      const one = ['2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z', '2026-11-19T00:00:00Z'];
      expect(judge(now, { ...next, date: '2026-11-19T00:00:00Z' }, spec, waivers, one).problems).toEqual([]);
    });

    it('needs nothing listed when no key is worse', () => {
      const better = { ...now, byMeasure: { W3: 4, A1: 2, 'C1 combat:strike': 10, 'F1 combat:aim': 10 } };
      expect(judge(was, better, spec, [], history).problems).toEqual([]);
    });
  });
});
