import { describe, expect, it } from 'vitest';
import '../src/content';
import { CONCLUSIONS, SETTLEMENTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { apply, test } from '../src/engine/world/logic';
import { runWorldEvents, spreadNews, standing, tryConclude, type WorldEventDef } from '../src/engine/world/frontier';

describe('news travels with people', () => {
  it('reaches neighbours after travel time, not before; masked deeds do not stick to you', () => {
    const g = newGameState('x', 0, 0);
    apply([{ news: { tag: 'saved_deputy', valence: 60, size: 9, at: 'shale' } }], g);
    expect(standing(g, 'shale')).toBeGreaterThan(0);
    spreadNews(g, SETTLEMENTS);
    expect(standing(g, 'ninebridge')).toBe(0);
    g.minutes += 1440 * 20;
    spreadNews(g, SETTLEMENTS);
    expect(test({ heard: { settlement: 'tollhouse', tag: 'saved_deputy' } }, g)).toBe(true);
    g.world.masked = true;
    apply([{ news: { tag: 'robbed_caravan', valence: -80, size: 8, at: 'shale' } }], g);
    expect(g.world.news[1].about).toBe('masked');
  });
});

describe('leads board', () => {
  it('links the right clues into a conclusion; wrong links cost only time', () => {
    const g = newGameState('x', 0, 0);
    apply([{ lead: 'l_walked_west' }, { lead: 'l_sealed_wound' }, { lead: 'l_sigil' }], g);
    const t0 = g.minutes;
    expect(tryConclude(g, ['l_walked_west', 'l_sigil'], CONCLUSIONS)).toBeNull();
    expect(g.minutes).toBe(t0 + 10);
    expect(tryConclude(g, ['l_walked_west', 'l_sealed_wound'], CONCLUSIONS)?.id).toBe('c_from_a_city');
    expect(test({ concluded: 'c_from_a_city' }, g)).toBe(true);
  });
});

describe('scheduled world events', () => {
  it('happen on time unless prevented', () => {
    const ev: Record<string, WorldEventDef> = {
      raid: { id: 'raid', at: { day: 2, hour: 6 }, preventedIf: { flag: 'warned' }, effects: [{ set: 'shale_burned' }], preventedEffects: [{ set: 'raid_repelled' }] },
    };
    const g = newGameState('x', 0, 0);
    expect(runWorldEvents(g, ev)).toEqual([]);
    g.minutes = 1440 + 6 * 60;
    expect(runWorldEvents(g, ev)).toEqual(['raid']);
    expect(g.flags.shale_burned).toBe(true);
    const h = newGameState('x', 0, 0);
    h.flags.warned = true; h.minutes = 1440 * 3;
    runWorldEvents(h, ev);
    expect(h.flags.raid_repelled).toBe(true);
    expect(test({ event: 'raid', is: 'prevented' }, h)).toBe(true);
  });
});
