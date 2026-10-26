import { describe, expect, it } from 'vitest';
import '../src/content';
import { CHROME } from '../src/content';
import {
  CHROME_WORKING, driftBand, driftBaseline, episodeChance, installChrome, removeChrome, settleDrift, surgeryRisk, tickChromeUpkeep,
} from '../src/engine/stats/chrome';
import { derived, emptySheet, hasFlag, modSum } from '../src/engine/stats/sheet';
import { test as cond } from '../src/engine/world/logic';
import { newGameState } from '../src/engine/core/state';

describe('chrome', () => {
  it('a clean install grants its mods and abilities', () => {
    const s = emptySheet('t');
    const before = derived(s).dt;
    expect(installChrome(s, 'ch_skin_plate', 1, 100, 5, 0.99)).toBe('clean');
    expect(derived(s).dt).toBe(before + 3);
    expect(installChrome(s, 'ch_eye_scope', 1, 100, 5, 0.99)).toBe('clean');
    expect(hasFlag(s, 'chrome_weakpoint_optics')).toBe(true);
    expect(modSum(s, 'hit_ranged')).toBeGreaterThanOrEqual(8);
  });

  it('surgery risk falls with surgeon skill and patient grit; rejection does not install', () => {
    const d = CHROME.ch_neural_reflex;
    expect(surgeryRisk(d, 30, 5)).toBeGreaterThan(surgeryRisk(d, 80, 5));
    expect(surgeryRisk(d, 80, 9)).toBeLessThan(surgeryRisk(d, 80, 5));
    const s = emptySheet('t');
    expect(installChrome(s, 'ch_neural_reflex', 1, 0, 5, 0.01)).toBe('rejected');
    expect(s.chrome?.neural).toBeUndefined();
    expect(installChrome(s, 'ch_neural_reflex', 1, 0, 5, surgeryRisk(d, 0, 5) * 0.9)).toBe('complication');
    expect(s.chrome?.neural?.condition).toBe(0.6);
  });

  it('missed upkeep degrades chrome until it stops working', () => {
    const s = emptySheet('t');
    installChrome(s, 'ch_legs_spring', 0, 100, 5, 0.99);
    expect(hasFlag(s, 'chrome_spring_legs')).toBe(true);
    let held = 1;
    // One refill on day 7, then nothing: from day 14 it loses 0.1 a day.
    for (let day = 7; day < 22; day++) tickChromeUpkeep(s, day, () => held-- > 0);
    expect(s.chrome!.legs!.condition).toBeLessThan(CHROME_WORKING);
    expect(hasFlag(s, 'chrome_spring_legs')).toBe(false);
    removeChrome(s, 'legs');
    expect(s.chrome!.legs).toBeUndefined();
  });

  it('drift rises towards the load of installed chrome, eased by grit', () => {
    const s = emptySheet('t');
    for (const id of ['ch_neural_reflex', 'ch_arm_breaker', 'ch_skin_plate', 'ch_legs_spring', 'ch_eye_heat']) installChrome(s, id, 0, 100, 5, 0.99);
    const base = driftBaseline(s, 5);
    expect(base).toBeGreaterThan(75);
    expect(driftBaseline(s, 9)).toBeLessThan(base);
    for (let d = 0; d < 20; d++) settleDrift(s, 5);
    expect(s.drift).toBeGreaterThan(base - 2);
    expect(driftBand(s.drift!)).toBe('drifting');
    expect(episodeChance(s.drift!)).toBeGreaterThan(0);
    expect(episodeChance(30)).toBe(0);
  });

  it('dialogue conditions read chrome and drift', () => {
    const g = newGameState('dev_yard', 1, 1, { sheet: emptySheet('t'), appearance: undefined as never, pronouns: 'they', inventory: { items: [], equipped: {}, tolls: 0 } as never });
    expect(cond({ chromeSlot: 'eyes' }, g)).toBe(false);
    installChrome(g.pc.sheet, 'ch_eye_heat', 0, 100, 5, 0.99);
    g.pc.sheet.drift = 40;
    expect(cond({ chrome: 'ch_eye_heat' }, g)).toBe(true);
    expect(cond({ chromeSlot: 'eyes' }, g)).toBe(true);
    expect(cond({ drift: { gte: 25, lte: 49 } }, g)).toBe(true);
  });

  it('the catalogue covers every slot and grade', () => {
    const defs = Object.values(CHROME);
    expect(new Set(defs.map((d) => d.slot)).size).toBe(8);
    expect(new Set(defs.map((d) => d.grade))).toEqual(new Set(['old', 'dark', 'concern']));
  });
});
