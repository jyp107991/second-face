import type { QuestDef } from '../../engine/quest/quest';

/** Act 1: the road east. */

export const q_a1_tollhouse: QuestDef = {
  id: 'q_a1_tollhouse', title: 'The Wall on the Highway', act: 'a1', critical: true, start: 'road', xp: 300,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Pay the toll (20 Tolls)' },
    { id: 'contract', kind: 'talk', label: 'Carry a sealed guild packet east (free passage, and a catch)' },
    { id: 'forged', kind: 'talk', label: 'Show a forged pass (Teo or Perpetua can make one)', requires: { skill: 'speech', gte: 35 } },
    { id: 'fence', kind: 'stealth', label: 'Climb the chain-link at the wall\'s north end, at night', requires: { skill: 'stealth', gte: 45 } },
    { id: 'terminal', kind: 'tech', label: 'Stamp yourself through on the gate terminal', requires: { any: [{ skill: 'science', gte: 40 }, { skill: 'security', gte: 45 }] } },
    { id: 'raid', kind: 'fight', label: 'Hit the Tollhouse with Vasha\'s Dogs' },
  ],
  stages: {
    road: {
      journal: 'The stranger\'s road runs east, and east of Shale the only road is the old highway, and the highway belongs to the Tollmen. Tollhouse 9 sits across it like a hand held up. Two days\' walk.',
      objectives: [
        { id: 'reach', text: 'Reach Tollhouse 9', done: { flag: 'visited_tollhouse' } },
        { id: 'pass', text: 'Get past the gate', done: { flag: 'th_passed' } },
        { id: 'riders', text: 'The guild\'s outriders ride this road. Find out who shot him', done: { any: [{ knows: 'outriders_confessed' }, { lead: 'l_pike_paid' }] }, optional: true },
      ],
      onEnter: [{ learn: 'loc_tollhouse' }],
      next: [{ if: { flag: 'th_passed' }, stage: 'through' }],
    },
    through: {
      journal: 'Through the wall, one way or another. The guild thanks you for your custom, or will send someone to count what you cost it. The highway runs east toward a hill with a mast on it — the next pin on the map.',
      end: 'done',
      onEnter: [{ learn: 'loc_signalhill' }, { news: { tag: 'passed_tollhouse', text: 'someone from the salt cut went east through Tollhouse 9', valence: 0, size: 3, at: 'tollhouse' } }],
    },
  },
};

export const q_a1_ledger: QuestDef = {
  id: 'q_a1_ledger', title: 'Tollhouse Ledger', act: 'a1', start: 'rumour', xp: 150,
  routes: [
    { id: 'night', kind: 'stealth', label: 'Read the ledger when the booth is empty (after nine at night)' },
    { id: 'lift', kind: 'stealth', label: 'Read it under the clerk\'s nose', requires: { skill: 'stealth', gte: 40 } },
    { id: 'ask', kind: 'talk', label: 'Get the outriders to say it themselves', requires: { skill: 'speech', gte: 45 } },
  ],
  stages: {
    rumour: {
      journal: 'Pike "reported" the stranger to the guild, as per. The guild keeps books. If the outriders who shot him were paid, Tollhouse 9 wrote it down.',
      objectives: [
        { id: 'read', text: 'Find the entry in the Tollhouse 9 ledger', done: { any: [{ lead: 'l_pike_paid' }, { knows: 'outriders_confessed' }] } },
        { id: 'page', text: 'Take the page', done: { item: 'k_ledger_page' }, optional: true },
      ],
      next: [{ if: { item: 'k_ledger_page' }, stage: 'evidence' }, { if: { any: [{ lead: 'l_pike_paid' }, { knows: 'outriders_confessed' }] }, stage: 'known' }],
    },
    known: {
      journal: 'The guild paid two outriders to put the stranger down on the highway, on a Factor\'s word from Shale. You know it; you cannot yet prove it to anyone who matters.',
      objectives: [{ id: 'page', text: 'Take the ledger page as proof', done: { item: 'k_ledger_page' } }],
      next: [{ if: { item: 'k_ledger_page' }, stage: 'evidence' }],
    },
    evidence: {
      journal: 'A page in your pack says Factor Pike paid for a killing. Shale\'s sheriff would want it. Pike would pay to have it back. Either way, it is worth more than paper.',
      objectives: [
        { id: 'ada', text: 'Show the page to Sheriff Vey', done: { flag: 'ledger_shown_ada' }, optional: true },
        { id: 'pike', text: 'Sell it back to Pike', done: { flag: 'ledger_sold' }, optional: true },
      ],
      next: [{ if: { flag: 'ledger_shown_ada' }, stage: 'shown' }, { if: { flag: 'ledger_sold' }, stage: 'sold' }],
    },
    shown: { journal: 'Ada Vey read the page twice and folded it into her shirt. Pike is still at his post. Shale is a small town and the guild is not; but the sheriff knows now what the guild is for.', end: 'done' },
    sold: { journal: 'Pike bought his own page back, courteously, at the posted rate, and burned it in front of you. He will remember the courtesy. So will the guild.', end: 'done' },
  },
};
