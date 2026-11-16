import type { QuestDef } from '../../engine/quest/quest';

/** Tamsin Roe's personal line (U8): Meridian's records office has no entry for her. Started at her camp fire (d_c9_tamsin,
 * stage 3, in Meridian); answered by Pell through the Grille at Knock (d_kn_grille, with her there) or by Nine at the fire
 * (d_c9_tamsin, with Nine travelling); closed at her fire when she decides what to do with it. Flags: tam_s3, tam_uncounted →
 * tam_why → tam_secret (mother | ines | kept). No day limit. */
export const q_comp_tamsin: QuestDef = {
  id: 'q_comp_tamsin', title: 'Not Written Down', act: 'a2', start: 'why', xp: 250,
  routes: [
    { id: 'pell', kind: 'medicine', label: 'Take her to the Grille at Knock: Pell kept her chart before she was six' },
    { id: 'nine', kind: 'knowledge', label: 'Nine reads a person their own entry, and what is missing from it', requires: { inParty: 'npc_md_nine' } },
  ],
  stages: {
    why: {
      journal: 'Tamsin asked Meridian\'s records office for her own entry, which a person may do for the price of the paper. ROE, TAMSIN — RESERVE 9 — NO ENTRY. Sixty people in the record for the Cistern, and she is not one of them. She thinks MOTHER hid her from the count. She wants to know why.',
      objectives: [
        { id: 'why', text: 'Find out why the city never counted Tamsin', done: { flag: 'tam_why' } },
        { id: 'pell', text: 'Pell kept her chart; he talks through the Grille at Knock', done: { flag: 'tam_why' }, optional: true },
      ],
      next: [{ if: { flag: 'tam_why' }, stage: 'choice' }],
    },
    choice: {
      journal: 'Tamsin knows why she was never counted. What she does with it is hers: write to MOTHER, tell Elder Ines and the whole ring, or keep it until she knows what it is for.',
      objectives: [{ id: 'choice', text: 'Talk to Tamsin at camp', done: { flag: 'tam_secret' } }],
      next: [
        { if: { flag: 'tam_secret', eq: 'mother' }, stage: 'mother' },
        { if: { flag: 'tam_secret', eq: 'ines' }, stage: 'ines' },
        { if: { flag: 'tam_secret', eq: 'kept' }, stage: 'kept' },
      ],
    },
    mother: { journal: 'Tamsin wrote to MOTHER from the road, unsigned, in MOTHER\'s own words: thank you for your continuity. She says it will know.', end: 'done' },
    ines: { journal: 'Tamsin wrote to Elder Ines. The whole ring will know by supper what was done, and by whom. She did not sound happy about it. She sounded like someone pulling out a splinter.', end: 'done' },
    kept: { journal: 'Tamsin kept it: a strip of printer paper against her skin, NO ENTRY, until she knows what it is for.', end: 'done' },
  },
};
