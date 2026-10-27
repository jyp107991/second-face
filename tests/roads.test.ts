import { describe, expect, it } from 'vitest';
import '../src/content';
import { WORLD_MAP } from '../src/content';
import { ROAD_ENCOUNTERS } from '../src/content/world/encounters';
import { newGameState } from '../src/engine/core/state';
import { Rng } from '../src/engine/core/rng';
import { discoveriesOnLeg, eligibleEncounters, rollEncounter } from '../src/engine/world/roads';
import type { TripLeg } from '../src/engine/world/travel';

const leg = (from: string, to: string, risk = 0.5): TripLeg => ({ from, to, by: 'foot', hours: 20, fare: 0, risk });

describe('the road: encounters', () => {
  it('fits the place, the hour and what has been done', () => {
    const g = newGameState('c9', 0, 0);
    g.minutes = 10 * 1440 + 12 * 60;
    const ids = () => eligibleEncounters(g, WORLD_MAP, leg('shale', 'drywells'), ROAD_ENCOUNTERS).map((e) => e.id);
    // Day on a track in the Sallow: the passing things and the once-only strangers; no patrol before the wall, no scouts before the Dogs are known.
    expect(ids()).toContain('re_salt_wind');
    expect(ids()).toContain('re_kite');
    expect(ids()).not.toContain('re_patrol');
    expect(ids()).not.toContain('re_scouts');
    expect(ids()).not.toContain('re_walker');
    g.flags.th_passed = true; g.world.knowledge.overpass_dogs = true;
    expect(ids()).toContain('re_patrol');
    expect(ids()).toContain('re_scouts');
    // The walker only walks at night, after the first name.
    g.flags.ch1_done = true;
    expect(ids()).not.toContain('re_walker');
    g.minutes = 10 * 1440 + 23 * 60;
    expect(ids()).toContain('re_walker');
    expect(ids()).not.toContain('re_kite');
    // Once is once.
    g.world.roadSeen = { re_walker: true };
    expect(ids()).not.toContain('re_walker');
  });

  it('rolls against the leg\'s risk and picks by weight', () => {
    const g = newGameState('c9', 0, 0);
    g.minutes = 10 * 1440 + 12 * 60;
    expect(rollEncounter(g, WORLD_MAP, leg('shale', 'drywells', 0), ROAD_ENCOUNTERS, new Rng(1))).toBeUndefined();
    const picks = new Set<string>();
    const rng = new Rng(7);
    for (let i = 0; i < 200; i++) { const e = rollEncounter(g, WORLD_MAP, leg('shale', 'drywells', 1), ROAD_ENCOUNTERS, rng); if (e) picks.add(e.id); }
    expect(picks.size).toBeGreaterThan(3);
    for (const id of picks) expect(ROAD_ENCOUNTERS[id]).toBeTruthy();
  });

  it('every encounter with a map names spots the roadside maps have, and a dialogue', async () => {
    const { MAPS, DIALOGUES, NPCS } = await import('../src/content');
    for (const e of Object.values(ROAD_ENCOUNTERS)) {
      if (!e.map) { expect(e.text, e.id).toBeTruthy(); continue; }
      const m = MAPS[e.map];
      expect(m, `${e.id}: map ${e.map}`).toBeTruthy();
      expect(DIALOGUES[e.dialogue!], `${e.id}: dialogue`).toBeTruthy();
      for (const n of e.npcs ?? []) {
        expect(NPCS[n.def], `${e.id}: npc ${n.def}`).toBeTruthy();
        expect(m.spots?.[n.spot], `${e.id}: spot ${n.spot}`).toBeTruthy();
      }
    }
  });
});

describe('the road: discoveries', () => {
  it('a hidden place near the way is found with enough Survival, and always when it is close', () => {
    const g = newGameState('c9', 0, 0);
    const known = () => false;
    // The salt-pan wreck lies near the Shale–Cistern 9 way; the windpump graveyard near Dry Wells–Signal Hill.
    g.pc.sheet.skillBought.survival = 0;
    for (const k of Object.keys(g.pc.sheet.baseAttrs) as (keyof typeof g.pc.sheet.baseAttrs)[]) g.pc.sheet.baseAttrs[k] = 1;
    const low = discoveriesOnLeg(g, WORLD_MAP, leg('shale', 'cistern9'), known);
    g.pc.sheet.skillBought.survival = 90;
    const high = discoveriesOnLeg(g, WORLD_MAP, leg('shale', 'cistern9'), known);
    expect(high.map((d) => d.id)).toContain('lm_sallow_01');
    expect(low.map((d) => d.id)).not.toContain('lm_sallow_01');
    expect(high[0].km).toBeGreaterThan(10);
    // Nothing is found twice, and nothing far off.
    expect(discoveriesOnLeg(g, WORLD_MAP, leg('shale', 'cistern9'), (id) => id === 'lm_sallow_01').map((d) => d.id)).not.toContain('lm_sallow_01');
    expect(discoveriesOnLeg(g, WORLD_MAP, leg('tollhouse', 'signalhill'), known).map((d) => d.id)).not.toContain('lm_sallow_01');
  });
});
