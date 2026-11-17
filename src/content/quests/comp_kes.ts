import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Kes Oyelaran's personal line (U8): Slack. It opens at her stage-3 fire (d_hs_kes) once both of the Skirts' lines are
 * settled, and resolves by her own choice with the player's help, never on a date: her link cut at Lev Ostrander's table
 * (hs_parts.ts, d_hs_lev), turned dark from the Window's exchange at night (d_hs_grid), or kept (her fire); or the door
 * sold to the Contract Office (d_hs_bell), which ends her. Plan: story/U8_kes_SECRET.md.
 */

const LINK = (v: string): Cond => ({ flag: 'kes_link', eq: v });
const SOLD: Cond = { flag: 'hs_leash_sold' };

export const q_comp_kes: QuestDef = {
  id: 'q_comp_kes', title: 'Slack', act: 'a2', start: 'ask', xp: 300,
  routes: [
    { id: 'cut', kind: 'medicine', label: 'Hold the channel quiet while Lev Ostrander cuts the port out', requires: { skill: 'medicine', gte: 45 } },
    { id: 'ash', kind: 'knowledge', label: 'Ash cut his own link and lived: burn the channel first' },
    { id: 'dark', kind: 'tech', label: 'Ride into the Window\'s exchange with her at night and turn the door on her own port', requires: { skill: 'science', gte: 50 } },
    { id: 'kept', kind: 'talk', label: 'Let her keep it, by her own reasons' },
  ],
  stages: {
    ask: {
      journal: 'Kes wants one whole day without the hill in the back of her neck. The Concern\'s port sits in the top of her spine; cut a live channel and it takes the person with it. Lev Ostrander on Nursery might cut it. Someone who has cut out their own and lived might know how. Or Kes and I go into the Window\'s exchange at night and turn the door in her chrome on herself, for good.',
      objectives: [
        { id: 'way', text: 'Help Kes decide what happens to her link', done: { flag: 'kes_link' } },
        { id: 'lev', text: 'Ask Lev Ostrander whether it can be cut', done: { knows: 'kes_cut_possible' }, optional: true },
        { id: 'ash', text: 'Someone who cut out their own', done: { knows: 'kes_ash_word' }, optional: true, hidden: true },
      ],
      next: [
        { if: SOLD, stage: 'sold' },
        { if: { all: [LINK('cut'), { flag: 'kes_fits' }] }, stage: 'fits' },
        { if: LINK('cut'), stage: 'free' },
        { if: LINK('dark'), stage: 'dark' },
        { if: LINK('kept'), stage: 'kept' },
      ],
    },
    free: { journal: 'Lev Ostrander cut the port out of Kes\'s neck while I held the channel, and dropped it in a dish: a coin with a wire tail. "It\'s quiet," she said. "It\'s so quiet." She is blind on the grid now, and free of it.', end: 'done' },
    fits: { journal: 'Lev cut the port out of Kes\'s neck, and the channel jumped under my hands halfway through. She lives. She has fits now, at night, and says it was worth it, and asks me to ask her again tomorrow.', end: 'done' },
    dark: { journal: 'In the Window\'s exchange at night Kes turned the Concern\'s door on her own port for good. Nobody on the hill can see her, and she keeps her sight on the grid. "Nobody\'s looking," she said. "For good."', end: 'done' },
    kept: { journal: 'Kes kept the port in her neck. She knows what it is now, she says, and that is different from not knowing. An hour a night is hers; the rest she will fight for.', end: 'done' },
    sold: { journal: 'I sold the door in the Concern\'s chrome to the Contract Office, and Kes\'s name with it. The Letter put a watch on every port in the Skirts. Kes is gone.', end: 'failed' },
  },
};
