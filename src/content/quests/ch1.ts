import type { QuestDef } from '../../engine/quest/quest';

/** Chapter One quests. */

export const q_ch1_door: QuestDef = {
  id: 'q_ch1_door', title: 'The Knock', act: 'ch1', critical: true, start: 'wake', xp: 150,
  routes: [
    { id: 'council', kind: 'talk', label: 'Take Elder Halloran\'s order to Bram' },
    { id: 'mechanics', kind: 'tech', label: 'Talk Bram through a manual cycle', requires: { skill: 'mechanics', gte: 40 } },
    { id: 'parts', kind: 'barter', label: 'Pay Bram in circuit boards' },
    { id: 'guilt', kind: 'talk', label: 'Shame Bram into it', requires: { skill: 'speech', gte: 60 } },
    { id: 'shaft', kind: 'stealth', label: 'Crawl the maintenance shaft', requires: { any: [{ skill: 'security', gte: 35 }, { skill: 'mechanics', gte: 45 }, { origin: 'pump_hand' }] } },
  ],
  stages: {
    wake: {
      journal: 'A stranger hammered on the great door before dawn — the first outsider in living memory — and died before he could speak. Doc Pell has the body. Elder Halloran is waiting for me.',
      objectives: [
        { id: 'pell', text: 'See the body in the clinic', done: { flag: 'c9_examined' } },
        { id: 'ines', text: 'Speak with Elder Halloran', done: { flag: 'c9_council_done' } },
        { id: 'tamsin', text: 'Talk to Tamsin', done: { flag: 'c9_tamsin_decided' }, optional: true },
      ],
      next: [{ if: { all: [{ flag: 'c9_examined' }, { flag: 'c9_council_done' }] }, stage: 'door' }],
    },
    door: {
      journal: 'Halloran wants me to go outside and find out who he was, and why he carried my face. Bram Coyle keeps the great door, and he does not want to open it.',
      objectives: [
        { id: 'open', text: 'Get the great door open — or find another way out', done: { any: [{ flag: 'c9_door_open' }, { flag: 'c9_shaft_open' }] } },
        { id: 'armed', text: 'Get something better than a shiv', done: { any: [{ flag: 'c9_armed' }, { item: 'w_bolt308' }] }, optional: true },
      ],
      next: [{ if: { any: [{ flag: 'c9_door_open' }, { flag: 'c9_shaft_open' }] }, stage: 'leave' }],
    },
    leave: {
      journal: 'The way out is open. Whatever is out there, it has been waiting ninety years.',
      objectives: [{ id: 'out', text: 'Leave Cistern 9', done: { flag: 'c9_left' } }],
      next: [{ if: { flag: 'c9_left' }, stage: 'done' }],
    },
    done: {
      journal: 'I left Cistern 9. The track north leads to Shale, the nearest town, if the old maps are right — and the stranger came from somewhere.',
      end: 'done',
      onEnter: [{ news: { tag: 'cistern_opened', text: 'someone walked out of the old shelter at the salt cut', valence: 5, size: 5, at: 'cistern9' } }],
    },
  },
};
