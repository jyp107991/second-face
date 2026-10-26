import type { QuestDef } from '../../engine/quest/quest';

/** Developer test quest. Not part of the story. */
export const q_dev_picks: QuestDef = {
  id: 'q_dev_picks', title: 'Rook\'s Picks', act: 'ch1', start: 'get', xp: 60,
  routes: [
    { id: 'pick', kind: 'tech', label: 'Pick the shelf lock', requires: { skill: 'security', gte: 30 } },
    { id: 'talk', kind: 'talk', label: 'Talk Rook out of his spares', requires: { skill: 'speech', gte: 50 } },
    { id: 'notice', kind: 'knowledge', label: 'Notice his pocket, then talk', requires: { all: [{ attr: 'senses', gte: 6 }, { skill: 'speech', gte: 30 }] } },
  ],
  stages: {
    get: {
      journal: 'Rook, who keeps the test yard, wants his lockpicks from a jammed shelf.',
      objectives: [{ id: 'picks', text: 'Get a set of lockpicks', done: { item: 't_picks' } }],
      next: [{ if: { item: 't_picks' }, stage: 'done' }],
    },
    done: { journal: 'Got the picks.', end: 'done' },
  },
};
