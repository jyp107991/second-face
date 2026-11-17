import type { WorldEventDef } from '../../engine/world/frontier';
import type { Cond } from '../../engine/world/logic';
import { A3_OPEN, LN_DONE, ON_SIDE, ORDER_READ } from './a3_conds';

/**
 * Act 3's world events (B6). Each is armed by a flag and resolves at the next seven o'clock wherever the player is, once
 * only: nothing in Act 3 happens behind the player's back, and none of them is a deadline. Spread into WORLD_EVENTS.
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (18, 18b, 21a).
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });

export const A3_EVENTS: Record<string, WorldEventDef> = {
  /** 18: the morning after the Long Night closes Act 2, the post reaches the player wherever they are: Maud's letter, the
   * slip MOTHER printed into the last hatch tray before it shut, and the city's fourth order, sealed, signed for. */
  a3_order: {
    id: 'a3_order', at: { hour: 7 }, armedIf: { all: [LN_DONE, { not: A3_OPEN }] },
    effects: [
      { set: 'a3_open' },
      { post: { from: 'npc_kn_maud', text: 'Love — The hatch has shut. Fourth time in my life. There\'s wardens camped by the stand and they\'re polite about it, which I don\'t like. Corin\'s up on the slope with the rifle and won\'t come down for his tea, and the well\'s on a cup a head. This came out of the tray before it shut, with your name on it near enough, so I\'m sending it on. Come home. — Maud' } },
      { post: { from: 'npc_c9_05', text: 'HATCH CLOSED. THANK YOU FOR YOUR CONTINUITY. PLEASE COME HOME.' } },
      { give: 'k_a3_mother_letter' },
      { post: { from: 'npc_ar_voice', text: 'BY COURIER — TO THE DESIGNATE — ONE ITEM, SEALED. RECEIVED AND SIGNED FOR.' } },
      { give: 'k_a3_order' },
      { quest: 'q_a3_order', start: true },
      { decision: { id: 'a3_open', text: 'The morning after Openfield\'s Long Night the post found me: word from Knock that the hatch had shut, and a sealed order from the city.' } },
    ],
  },
  /** 18b: the recall notice for Unit 9 travels with the order (`d_a3_order_read` starts the quest when it is read with Nine on
   * the player's side). This picks it up at the next seven o'clock for a Nine who joins or comes back after the order was
   * read. */
  a3_recall_notice: {
    id: 'a3_recall_notice', at: { hour: 7 }, armedIf: { all: [ORDER_READ, ON_SIDE('nine'), { quest: 'q_a3_recall', status: 'none' }, { not: F('a3_recall') }] },
    effects: [
      { post: { from: 'npc_ar_voice', text: 'PRECINCT OF MERIDIAN — UNIT 9 (ASSESSOR, CIVIL) — DISPOSAL — AS SCHEDULED — R31 BROUGHT FORWARD. THE KEEPER WILL PRESENT THE UNIT AT THE PRECINCT GATE.' } },
      { set: 'a3_recall_due' }, { quest: 'q_a3_recall', start: true },
    ],
  },
  /** 19b (B6d): with the Saints' girl kept, the wire carries Signal Hill's name once the player has taken up the mast, and
   * Verity's letter with the band comes at the next seven o'clock, wherever the player is (the K route at the mast's foot). */
  a3_verity_band: {
    id: 'a3_verity_band', at: { hour: 7 }, armedIf: { all: [{ quest: 'q_a3_mast', status: 'active' }, F('bw_static', 'kept'), { not: { dead: 'npc_bw_04' } }] },
    effects: [
      { post: { from: 'npc_bw_04', text: 'Heard you on the wire, which is not a thing I say lightly. The girl says Signal Hill, and your name beside it, and that you want it loud. Then put it where we listen: the hiss band, midnight to two, the one the wire wakes on. Every radio in the Reach hears that band, even the ones with no backs on, because it is where the city\'s own wire leaks, and nobody ever built a radio that can\'t. The figures are under this, in her hand. Swear it on the hiss you won\'t use it to sell anything. — V.' } },
      { learn: 'a3_verity_band' },
    ],
  },
  /** 20b (B6g): the Unwritten told they may burn the count go down the Cistern's air grate the next time the clock passes two
   * with the player at Knock (their rule: only with the designate on the slope). MOTHER's panel and the Archive burn. */
  a3_burning: {
    id: 'a3_burning', at: { hour: 2, where: 'c9_mouth' }, armedIf: { all: [F('a3_unwritten', 'burning'), { at: 'c9_mouth' }] },
    effects: [
      { set: 'a3_mother', value: 'burned' }, { set: 'a3_archive', value: 'burned' },
      { news: { tag: 'a3_burning', text: 'the Cistern\'s caretaker burned in the night, by the Choir\'s grey people, with the designate on the slope', valence: -15, size: 8, at: 'cistern9' } },
      { decision: { id: 'a3_burning', text: 'The Unwritten went down the grate at Knock and burned MOTHER\'s panel and the Cistern\'s Archive, with me on the slope.' } },
      { event: 'dialogue', data: { tree: 'd_a3_burning', name: 'Knock' } },
    ],
  },
  /** 21a: once the Cistern's door is settled, the Ledger's card comes at the next seven o'clock, wherever the player is: the
   * close, and the tracker of what the player holds. */
  a3_summons: {
    id: 'a3_summons', at: { hour: 7 }, armedIf: { all: [A3_OPEN, F('a3_c9')] },
    effects: [
      { set: 'a3_summoned' },
      { post: { from: 'npc_ar_voice', text: 'THE DESIGNATE WILL ATTEND THE STEPS.' } },
      { give: 'k_a3_summons' },
      { quest: 'q_a3_spire', start: true }, { quest: 'q_a3_hold', start: true },
      { decision: { id: 'a3_summoned', text: 'With the Cistern\'s door settled, the Ledger sent its card: the designate will attend the steps.' } },
    ],
  },
};
