import type { QuestDef } from '../../engine/quest/quest';

/**
 * Ilya Strand's personal line (U8). It opens at a fire when he shows the letter he cannot read, and resolves on story
 * milestones, never on a date: the letter read at a fire (`ilya_letter_read`, a1_shale.ts), then Vasha Kade at the
 * Bridgeward booth (`vasha_cornered` set by the raid, B3.12; `vasha_fate` set by her tree in overpass.ts).
 */
export const q_comp_ilya: QuestDef = {
  id: 'q_comp_ilya', title: 'Ilya\'s Letter', act: 'a2', start: 'letter', xp: 300,
  routes: [
    { id: 'nine', kind: 'knowledge', label: 'Ask the assessor to read the city\'s hand at a fire' },
    { id: 'clerk', kind: 'knowledge', label: 'Read the city\'s shorthand yourself, with a road clerk\'s eye', requires: { origin: 'archive_clerk' } },
    { id: 'science', kind: 'tech', label: 'Work the shorthand out', requires: { skill: 'science', gte: 60 } },
  ],
  stages: {
    letter: {
      journal: 'Ilya Strand carries a letter in a city envelope, heavy paper with a tower in a ring on the flap, that came for his wife the spring before the raid. She read it, put it in the medicine store, and never said what it said. Nobody in Shale reads that hand. The city\'s own clerks do.',
      objectives: [{ id: 'read', text: 'Find someone who reads the city\'s hand', done: { flag: 'ilya_letter_read' } }],
      next: [{ if: { flag: 'ilya_letter_read' }, stage: 'why' }],
    },
    why: {
      journal: 'Read aloud at a fire, the letter says the raid that killed Agi Strand and her girls was on the city\'s schedule: Shale was growing ahead of plan, and the correction came by the local instrument, on the dark of the moon. Vasha Kade led it and thought she had picked the night. Ilya still wants her to know why, before. The why is longer now.',
      objectives: [
        { id: 'wall', text: 'Her name is burned on a wall in Bridgeward, with the other Dogs\'', done: { knows: 'bw_wall_wren' }, optional: true },
        { id: 'find', text: 'Find Vasha Kade', done: { any: [{ flag: 'vasha_cornered' }, { dead: 'npc_rd_02' }] } },
        { id: 'settle', text: 'Settle it', done: { any: [{ flag: 'vasha_fate' }, { dead: 'npc_rd_02' }] } },
      ],
      next: [
        { if: { flag: 'vasha_fate', eq: 'ilya' }, stage: 'shot' },
        { if: { flag: 'vasha_fate', eq: 'player' }, stage: 'taken' },
        { if: { flag: 'vasha_fate', eq: 'spared_why' }, stage: 'carried' },
        { if: { flag: 'vasha_fate', eq: 'spared' }, stage: 'let_go' },
        { if: { dead: 'npc_rd_02' }, stage: 'robbed' },
      ],
    },
    shot: { journal: 'Ilya shot Vasha Kade at the booth, after she knew why. He has stopped counting rounds.', end: 'done' },
    taken: { journal: 'You shot Vasha Kade before Ilya could. He is working out whether he minds.', end: 'done' },
    carried: { journal: 'Vasha Kade read the city\'s letter at the booth and walked away from it alive, knowing what she was for. Ilya let her carry it. He says that is longer than a round.', end: 'done' },
    let_go: { journal: 'You let Vasha Kade walk away from the booth without the why. Ilya went after her alone.', end: 'failed' },
    robbed: { journal: 'Vasha Kade is dead, and it was not at the booth, and it was not Ilya. Eleven years, and somebody else.', end: 'done' },
  },
};
