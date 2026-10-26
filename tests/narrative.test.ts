import { describe, expect, it } from 'vitest';
import '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner, type DialogueDef } from '../src/engine/dialogue/dialogue';
import { QuestEngine, type QuestDef } from '../src/engine/quest/quest';
import { apply, runTimers, test } from '../src/engine/world/logic';

const quest: QuestDef = {
  id: 'q_test', title: 'Test', act: 'ch1', start: 'find', xp: 100,
  stages: {
    find: { journal: 'Find the key.', objectives: [{ id: 'key', text: 'Get the key', done: { item: 'c_splint' } }], next: [{ if: { item: 'c_splint' }, stage: 'open' }] },
    open: { journal: 'Open the door.', next: [{ if: { flag: 'door_open' }, stage: 'won' }] },
    won: { journal: 'Done.', end: 'done' },
  },
};

const talk: DialogueDef = {
  id: 'd_test', owner: 'npc_a',
  start: [{ if: { flag: 'met' }, node: 'again' }, { node: 'hello' }],
  nodes: {
    hello: {
      text: 'Hello, {name}. {They} look tired.', effects: [{ set: 'met' }],
      passives: [{ attr: 'senses', dc: 1, text: 'Their hand never leaves the knife.' }],
      options: [
        { id: 'ask', text: 'Who are you?', next: 'hello', once: true, effects: [{ learn: 'who_a' }] },
        { id: 'persuade', text: 'Give me the key.', check: { skill: 'speech', dc: 90, mods: [{ if: { knows: 'who_a' }, dc: -80, why: 'you know who they are' }] }, effects: [{ quest: 'q_test', start: true }, { give: 'c_bandage' }], next: 'yes', fail: 'no' },
        { id: 'bye', text: 'Bye.', exit: true },
      ],
    },
    yes: { text: 'Fine. Take it.', options: [{ text: 'Thanks.', exit: true }] },
    no: { text: 'No.', effects: [{ trust: { npc: 'npc_a', by: -10 } }], options: [{ text: 'Fine.', exit: true }] },
    again: { text: 'You again.', options: [{ text: 'Me again.', exit: true }] },
  },
};

describe('conditions and effects', () => {
  it('evaluate flags, knowledge, relations and timers', () => {
    const g = newGameState('x', 0, 0);
    apply([{ set: 'a' }, { inc: 'n', by: 2 }, { learn: 'secret' }, { trust: { npc: 'b', by: 30 } }, { rep: { faction: 'f', fear: 20 } }], g);
    expect(test({ all: [{ flag: 'a' }, { flag: 'n', gte: 2 }, { knows: 'secret' }, { trust: { npc: 'b', gte: 30 } }, { rep: { faction: 'f', fear: 20 } }] }, g)).toBe(true);
    expect(test({ not: { knows: 'other' } }, g)).toBe(true);
    apply([{ after: { minutes: 60, id: 't', effects: [{ set: 'later' }] } }], g);
    expect(runTimers(g)).toBe(0);
    g.minutes += 61;
    expect(runTimers(g)).toBe(1);
    expect(g.flags.later).toBe(true);
  });
});

describe('dialogue', () => {
  it('shows checks up front, branches on failure, and remembers', () => {
    const g = newGameState('x', 0, 0);
    g.pc.sheet.name = 'Ash'; g.pc.pronouns = 'she';
    const engine = new QuestEngine({ q_test: quest }, g);
    let d = new DialogueRunner(talk, g, engine);
    const v = d.view()!;
    expect(v.text).toBe('Hello, Ash. She look tired.');
    expect(v.passives[0].label).toBe('SENSES');
    const p = v.options.find((o) => o.id === 'persuade')!;
    expect(p.checkLabel).toBe('Speech 90');
    expect(p.checkMet).toBe(false);
    // Learn something that lowers the DC, then the check passes.
    d.choose('ask');
    const p2 = d.view()!.options.find((o) => o.id === 'persuade')!;
    expect(p2.checkLabel).toBe('Speech 10');
    expect(p2.checkNotes[0]).toContain('you know who they are');
    expect(d.view()!.options.some((o) => o.id === 'ask')).toBe(false); // once
    expect(d.choose('persuade')).toBe(true);
    expect(g.world.quests.q_test.stage).toBe('find');
    // Second conversation starts elsewhere.
    d = new DialogueRunner(talk, g, engine);
    expect(d.view()!.text).toBe('You again.');
  });

  it('failure leads to its own branch', () => {
    const g = newGameState('x', 0, 0);
    const d = new DialogueRunner(talk, g);
    expect(d.choose('persuade')).toBe(false);
    expect(d.view()!.text).toBe('No.');
    expect(g.world.relations.npc_a.trust).toBe(-10);
  });
});

describe('quests', () => {
  it('advance on world state by any method and grant xp', () => {
    const g = newGameState('x', 0, 0);
    const q = new QuestEngine({ q_test: quest }, g);
    q.questStart('q_test');
    apply([{ give: 'c_splint' }], g);
    q.update();
    expect(g.world.quests.q_test.stage).toBe('open');
    const xp = g.pc.sheet.xp;
    g.flags.door_open = true;
    q.update();
    expect(g.world.quests.q_test.status).toBe('done');
    expect(g.pc.sheet.xp).toBe(xp + 100);
    expect(q.journal()[0].log).toEqual(['Find the key.', 'Open the door.', 'Done.']);
  });
});
