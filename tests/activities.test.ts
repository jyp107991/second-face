import { describe, expect, it } from 'vitest';
import '../src/content';
import { Rng } from '../src/engine/core/rng';
import { newGameState } from '../src/engine/core/state';
import { aiStep, bank, nerveFor, newDust, roll } from '../src/engine/minigames/dust';
import { availableLetters, sendLetter, unreadPost, type LetterDef } from '../src/engine/world/letters';
import { runTimers } from '../src/engine/world/logic';

describe('Dust', () => {
  it('plays to a winner with a pot, and a 1 dusts the run', () => {
    const rng = new Rng(7);
    const s = newDust('You', 'Mags', nerveFor(60, 70), 5);
    let guard = 0;
    while (s.winner === undefined && guard++ < 500) {
      if (s.turn === 0) { if (s.run >= 10) bank(s); else roll(s, rng); }
      else aiStep(s, rng);
    }
    expect(s.winner).toBeDefined();
    expect(Math.max(s.players[0].score, s.players[1].score)).toBeGreaterThanOrEqual(30);
    const t = newDust('a', 'b', 10, 1);
    // Force a 1: find a seed that rolls 1 first.
    let seed = 1; let r = new Rng(seed);
    while (new Rng(seed).int(1, 6) !== 1) { seed++; r = new Rng(seed); }
    t.run = 9; roll(t, r);
    expect(t.run).toBe(0);
    expect(t.turn).toBe(1);
  });
  it('nerve grows with courage and greed', () => {
    expect(nerveFor(100, 100)).toBeGreaterThan(nerveFor(0, 0));
  });
});

describe('letters', () => {
  it('a letter is offered only to people met, sends with effects, and the reply arrives days later', () => {
    const g = newGameState('x', 0, 0);
    const defs: Record<string, LetterDef> = { l1: { id: 'l1', to: 'npc_c9_01', topic: 'Home', text: 'All well.', days: 3, effects: [{ trust: { npc: 'npc_c9_01', by: 5 } }], reply: { text: 'Write again.', effects: [{ set: 'ines_wrote_back' }] }, once: true } };
    expect(availableLetters(g, defs)).toHaveLength(0);
    g.world.met = { npc_c9_01: { name: 'Ines', day: 1 } };
    expect(availableLetters(g, defs)).toHaveLength(1);
    sendLetter(g, defs.l1);
    expect(g.world.relations.npc_c9_01.trust).toBe(5);
    expect(availableLetters(g, defs)).toHaveLength(0);
    expect(unreadPost(g)).toBe(0);
    g.minutes += 3 * 1440;
    runTimers(g);
    expect(unreadPost(g)).toBe(1);
    expect(g.flags.ines_wrote_back).toBe(true);
    expect(g.world.post![0].from).toBe('npc_c9_01');
  });
});
