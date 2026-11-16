import type { QuestDef } from '../../engine/quest/quest';

/** A companion's own line (U8): what Ash carries. Started at his fire (d_of_ash); every stage moves on flags his talks and
 * the seed store set, so the quest only keeps the journal. Plan: story/U8_ash_SECRET.md. */

const GONE = { flag: 'ash_gone' };

export const q_comp_ash: QuestDef = {
  id: 'q_comp_ash', title: 'Ash and the Gully', act: 'a2', start: 'told', xp: 250,
  routes: [
    { id: 'stand', kind: 'talk', label: 'Stand beside him at the seed store and let him say it himself' },
    { id: 'speak', kind: 'talk', label: 'Say it to her for him' },
    { id: 'spare', kind: 'talk', label: 'Walk him away and leave it unsaid' },
  ],
  stages: {
    told: {
      journal: 'Ash was a Rust Dog, under Kessler\'s father, the night the Dogs burned the Gully. A woman who counted them in at the well counts seed at Openfield now: Doria, the keeper, who does not know his face. He wants to tell her himself, with you beside him, the next time the road goes back through Openfield.',
      objectives: [{ id: 'store', text: 'Go back to Openfield with Ash, to the seed store', done: { flag: 'ash_gully_outcome' } }],
      next: [{ if: GONE, stage: 'parted' }, { if: { flag: 'ash_gully_outcome' }, stage: 'carried' }],
    },
    carried: {
      journal: 'Whatever was said at the seed store, Ash carries what is left of it. There is something else he carries and has not said, and he keeps touching his scarf when the city comes up.',
      objectives: [{ id: 'orders', text: 'Learn what else Ash carries', done: { flag: 'ash_orders_known' } }],
      next: [{ if: GONE, stage: 'parted' }, { if: { flag: 'ash_orders_known' }, stage: 'orders' }],
    },
    orders: {
      journal: 'Ash is one of the Unwritten who keep standing orders, and a letter in his scarf has your face in it: if you take the sash, the sky is owed. He has not decided what he will do about it, and neither, he says, have you.',
      objectives: [{ id: 'choose', text: 'Hear what Ash chooses', done: { flag: 'ash_orders' } }],
      next: [{ if: GONE, stage: 'parted' }, { if: { flag: 'ash_orders' }, stage: 'done' }],
    },
    done: { journal: 'Ash has chosen what he will do with the letter, and told you to your face. Whatever comes for you next comes through him, or past him.', end: 'done' },
    parted: { journal: 'Ash went west to the burial ground with what he carries, and does not walk with you any more.', end: 'failed' },
  },
};
