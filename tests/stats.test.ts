import { describe, expect, it } from 'vitest';
import '../src/content';
import {
  addXp, attr, creationPointsLeft, derived, emptySheet, perkAvailable, raiseSkill, skill, takePerk, validateCreation,
} from '../src/engine/stats/sheet';
import { xpForLevel } from '../src/engine/stats/rules';

describe('Character sheet', () => {
  it('default sheet uses exactly the creation points', () => {
    const s = emptySheet('A');
    expect(creationPointsLeft(s.baseAttrs)).toBe(0);
    s.tagged = ['firearms', 'speech', 'science'];
    expect(validateCreation(s)).toEqual([]);
  });
  it('tagging adds 20% and doubles growth', () => {
    const s = emptySheet();
    const before = skill(s, 'speech');
    s.tagged = ['speech'];
    expect(skill(s, 'speech')).toBe(before + 20);
    s.unspentSkill = 3;
    raiseSkill(s, 'speech');
    expect(skill(s, 'speech')).toBe(before + 22);
    expect(s.unspentSkill).toBe(2);
  });
  it('traits modify stats', () => {
    const s = emptySheet();
    const ap = derived(s).ap;
    s.traits = ['steady'];
    expect(derived(s).ap).toBe(ap - 1);
    s.traits = ['bookish'];
    expect(derived(s).skillPointsPerLevel).toBe(5 + 2 * attr(s, 'wits') + 3);
  });
  it('levels up with skill points, hp and perk picks', () => {
    const s = emptySheet();
    const hp0 = derived(s).maxHp;
    const gained = addXp(s, xpForLevel(3));
    expect(gained).toBe(2);
    expect(s.level).toBe(3);
    expect(s.pendingPerks).toBe(1);
    expect(s.unspentSkill).toBe(2 * derived(s).skillPointsPerLevel);
    expect(derived(s).maxHp).toBeGreaterThan(hp0);
    expect(s.hp).toBe(derived(s).maxHp);
  });
  it('perk requirements are enforced', () => {
    const s = emptySheet();
    addXp(s, xpForLevel(3));
    s.baseAttrs.brawn = 6;
    expect(perkAvailable(s, 'brute')).toBe(true);
    expect(takePerk(s, 'brute')).toBe(true);
    expect(s.perks.brute).toBe(1);
    expect(takePerk(s, 'brute')).toBe(false); // no pending picks
  });
  it('crippled legs cost AP; radiation saps attributes', () => {
    const s = emptySheet();
    const ap = derived(s).ap, grit = attr(s, 'grit');
    s.crippled.legL = true;
    expect(derived(s).ap).toBe(ap - 1);
    s.rads = 600;
    expect(attr(s, 'grit')).toBe(grit - 2);
  });
});
