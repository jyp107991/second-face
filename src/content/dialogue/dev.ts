import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** Developer test conversation (exercises checks, passives, quests, memory). Not part of the story. */
export const d_dev_guide: DialogueDef = {
  id: 'd_dev_guide', owner: 'dev_guide',
  start: [
    { if: { quest: 'q_dev_picks', status: 'done' }, node: 'thanks' },
    { if: { quest: 'q_dev_picks' }, node: 'waiting' },
    { node: 'hello' },
  ],
  nodes: {
    hello: {
      text: 'Another one out of the hole, eh? Name\'s Rook. I keep this yard. Mostly from people like you.',
      passives: [{ attr: 'senses', dc: 6, text: 'His left hand stays near a pocket that clinks like metal picks.' }],
      options: [
        { id: 'dev.rook.job', text: 'Got any work?', next: 'job' },
        { id: 'dev.rook.pocket', text: 'What\'s in the pocket, Rook?', if: { attr: 'senses', gte: 6 }, next: 'pocket', once: true },
        { id: 'dev.rook.bye', text: 'Just passing through.', exit: true },
      ],
    },
    job: {
      text: 'Shelf over there has my good picks. Lock jammed. Get them out and they\'re yours — I\'ll take the scrap.',
      effects: [{ quest: 'q_dev_picks', start: true }],
      options: [
        { id: 'dev.rook.persuade', text: 'You clearly have spares. Hand one over and I\'ll owe you.', check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'dev_rook_pocket' }, dc: -20, why: 'you saw the picks in his pocket' }] },
          effects: [{ give: 't_picks' }, { trust: { npc: 'dev_guide', by: 5 } }], next: 'gave', fail: 'refused' },
        { id: 'dev.rook.buy', text: 'Sell me a set. [10 Tolls]', if: { flag: 'never' }, showLocked: true, next: 'gave' },
        { id: 'dev.rook.ok', text: 'I\'ll get your picks.', exit: true },
      ],
    },
    pocket: {
      text: 'Ha. Sharp eyes. Spares. Not for sale.', effects: [{ learn: 'dev_rook_pocket' }, { memory: { npc: 'dev_guide', tag: 'player_noticed_picks', valence: 10 } }],
      options: [{ text: 'About that work…', next: 'job' }, { text: 'Later.', exit: true }],
    },
    gave: { text: 'Fine. Take it. Don\'t make me regret it, {name}.', options: [{ text: 'Thanks.', exit: true }] },
    refused: { text: 'Nice try. Shelf\'s over there.', effects: [{ trust: { npc: 'dev_guide', by: -5 } }], options: [{ text: 'Fine.', exit: true }] },
    waiting: { text: 'Picks?', options: [{ text: 'Working on it.', exit: true }] },
    thanks: { text: 'Good hands. Come back when the yard needs more.', options: [{ text: 'Will do.', exit: true }] },
  },
};
