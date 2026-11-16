import type { QuestDef } from '../../engine/quest/quest';

/** A companion's own line (U8): Odile's sheet. Started at her fire (d_nb_odile); every stage moves on flags her talks and
 * the paper room set, so the quest only keeps the journal. Plan: story/U8_odile_SECRET.md. */

const GONE = { flag: 'odile_gone' };

export const q_comp_odile: QuestDef = {
  id: 'q_comp_odile', title: 'A Sheet on Shale', act: 'a2', start: 'told', xp: 250,
  routes: [
    { id: 'buy', kind: 'barter', label: 'Buy the sheet back from the Grand Factor (she never says no, only not at that price)' },
    { id: 'weather', kind: 'talk', label: 'Tell the Grand Factor she is keeping a losing sheet dry', requires: { skill: 'speech', gte: 40 } },
    { id: 'night', kind: 'stealth', label: 'Past the Grand Factor asleep in her chair, by a latch Odile knows', requires: { skill: 'stealth', gte: 35 } },
    { id: 'hand', kind: 'knowledge', label: 'A factor\'s hand may draw on the floor\'s paper', requires: { member: 'tollmen', rank: 'hand' } },
  ],
  stages: {
    told: {
      journal: 'Odile shorted Shale: a sealed sheet that says the town fails by a date, sold to the Ninebridge floor for a client the floor never named. The date has not come. The sheet sits in the paper room behind the Grand Factor\'s office, under S, where Odile filed it herself, and she wants it in her hand.',
      objectives: [{ id: 'room', text: 'Take Odile to the paper room behind the Grand Factor\'s office at Ninebridge', done: { flag: 'odile_room_done' } }],
      next: [{ if: { flag: 'nb_archive_burned' }, stage: 'burned' }, { if: GONE, stage: 'parted' }, { if: { flag: 'odile_sheet_held' }, stage: 'held' }],
    },
    held: {
      journal: 'Her sheet, out of its pigeonhole, and on the back the client\'s acceptance in a hand too even to be a hand. Odile put it inside her coat and has not said a word about it since.',
      objectives: [{ id: 'fire', text: 'Hear Odile out about the back of the sheet', done: { flag: 'odile_s2_done' } }],
      next: [{ if: GONE, stage: 'parted' }, { if: { flag: 'odile_s2_done' }, stage: 'city' }],
    },
    city: {
      journal: 'The buyer of Shale\'s failure is the thing that sets Shale\'s water, and Odile sold the floor the arithmetic it uses. She came east to tear the sheet up. She wants to see the city that bought it before she decides whether tearing it is unwinding a trade or burning a witness.',
      objectives: [
        { id: 'gate', text: 'Get inside Meridian\'s Wall', done: { flag: 'a2_precinct_done' } },
        { id: 'sheet', text: 'Decide with Odile what the sheet is for', done: { flag: 'odile_sheet' } },
      ],
      next: [{ if: GONE, stage: 'parted' }, { if: { flag: 'odile_sheet' }, stage: 'price' }],
    },
    price: {
      journal: 'The sheet is settled between you. Odile says she has a price for where she will stand when the guild and the farms come to blows, and that she will name it once the city has shown what it costs.',
      objectives: [{ id: 'price', text: 'Hear the price Odile has been keeping', done: { flag: 'odile_price' } }],
      next: [{ if: GONE, stage: 'parted' }, { if: { flag: 'odile_price' }, stage: 'done' }],
    },
    done: { journal: 'Odile named her price and stood where you stand. The trade she came east to unwind is as unwound as it will ever be.', end: 'done' },
    burned: { journal: 'The paper room at Ninebridge burned with every sheet in it, the one record of who bought what. Odile walked back to the Span and did not look round.', end: 'failed' },
    parted: { journal: 'Odile went back to the Span without her trade unwound, and without you.', end: 'failed' },
  },
};
