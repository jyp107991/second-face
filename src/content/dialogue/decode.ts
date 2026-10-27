import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * The stranger's map, read from the pack. Twelve places on a road, a block of five marks beside each. The
 * first block gives itself up to Science, to a clerk's eye, to a bought key, or to an old drifter who knows
 * the hand. Chapter One ends on the first name.
 */

const DECODE_FIRST = [
  { learn: 'name1_decoded' }, { set: 'jonah_named' }, { lead: 'l_name_jonah' }, { xp: 80 },
  { decision: { id: 'read_first_name', text: 'You read the first name on the stranger\'s map: Jonah Reese, Shale — within the month.' } },
  { quest: 'q_ch1_name', stage: 'read' },
];

export const d_map: DialogueDef = {
  id: 'd_map', owner: 'narrator',
  start: [{ if: { knows: 'name1_decoded' }, node: 'again' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'Soft as cloth. A drawn line of road that starts under your thumb at the salt cut, runs north through a town that can only be Shale, west to a bridge, and off the east edge of everything you know. Twelve places pricked with a pin. Beside each, a block of five marks in the stranger\'s cipher. The nearest pin is Shale.',
      passives: [
        { attr: 'senses', dc: 7, text: 'The pricks were made at different times: the nearest ones are fresh, the far ones worn soft. He added names as he went west.', effects: [{ learn: 'map_pricked_over_time' }] },
      ],
      options: [
        { id: 'map.clerk', text: '(Read it.) It\'s record shorthand under a substitution — your own hand, turned.', if: { origin: 'archive_clerk' }, next: 'first' },
        { id: 'map.key', text: '(Set the Tollmen\'s cipher wheel to the first block.)', if: { item: 'k_cipher_key' }, next: 'first' },
        { id: 'map.science', text: '(Work the cipher: blocks of five, a shifted alphabet, the town names as cribs.)', check: { skill: 'science', dc: 50, mods: [{ if: { knows: 'notebook_cipher' }, dc: -15, why: 'you saw the notebook repeats in blocks of five' }, { if: { item: 'k_notebook_page' }, dc: -10, why: 'the torn page gives you a second sample' }] }, next: 'first', fail: 'fail' },
        { text: '(Put it away.)', exit: true },
      ],
    },
    fail: { text: 'An hour, and the blocks stay blocks. One of them might be SHALE and might be anything. You will need a crib, a key, or someone who has read this hand before.', effects: [{ time: 60 }, { learn: 'map_cipher_hard' }], options: [{ text: '(Put it away.)', exit: true }] },
    first: {
      text: 'The first block gives. Five marks, then five, then four, then a number: REESE JONAH. SHALE. And a span, from a date that is — you check it twice — the day the stranger died at your door: within the month. Beside the pin, in the margin, a smaller mark you have seen painted on his dust mask: half a sun.',
      effects: DECODE_FIRST,
      options: [{ text: 'Jonah Reese. The deputy.', next: 'jonah' }],
    },
    jonah: {
      text: 'Twenty-two, earnest, reads both books. Someone, somewhere, has written down that he has a month. The other eleven blocks are still blocks. The road runs east.',
      effects: [{ event: 'title', data: { text: 'CHAPTER ONE\nTHE KNOCK' } }],
      options: [{ text: '(Fold the map.)', exit: true }],
    },
    again: {
      text: 'REESE JONAH. SHALE. Within the month. Eleven blocks you cannot read yet, pricked along a road that runs east.',
      options: [
        { id: 'map.again.science', text: '(Try the second block.)', check: { skill: 'science', dc: 70 }, next: 'second', fail: 'second_fail', once: true },
        { text: '(Fold the map.)', exit: true },
      ],
    },
    second: { text: 'The second block is harder — a different shift, as if he changed the key between names. You get four letters: V E Y, and A. Someone else in Shale.', effects: [{ learn: 'name3_partial' }, { lead: 'l_name_vey_partial' }], options: [{ text: '(Fold the map.)', exit: true }] },
    second_fail: { text: 'The second block uses a different shift. Not tonight.', effects: [{ time: 40 }], options: [{ text: '(Fold the map.)', exit: true }] },
  },
};
