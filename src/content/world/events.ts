import type { WorldEventDef } from '../../engine/world/frontier';

/**
 * Scheduled world events. There are no day limits in this game: an event waits for the player (it fires at its
 * hour once armed, and only while the player is where it happens), so nothing is missed by being elsewhere.
 */
export const WORLD_EVENTS: Record<string, WorldEventDef> = {
  /** Tribute Day: the Rust Dogs come into Shale at ten the morning after the player hears the tithe is due, if the player is in town; otherwise the morning they are next there. */
  tribute_day: {
    id: 'tribute_day', at: { hour: 10, where: 'shale' }, armedIf: { all: [{ flag: 'visited_shale' }, { any: [{ knows: 'tribute_due' }, { knows: 'overpass_dogs' }, { quest: 'q_ch1_tribute' }] }] },
    effects: [
      { set: 'tribute_day' }, { quest: 'q_ch1_tribute', start: true }, { quest: 'q_ch1_tribute', stage: 'day' },
      { news: { tag: 'dogs_in_shale', text: 'the Rust Dogs came into Shale for the tithe', valence: 0, size: 5, at: 'shale' } },
    ],
  },
  /** By evening it is settled one way or another; if the player walked away from it, Shale pays and a deputy is hurt. */
  tribute_settled: {
    id: 'tribute_settled', at: { hour: 18 }, armedIf: { flag: 'tribute_day' }, preventedIf: { flag: 'tribute_resolved' },
    effects: [
      { set: 'tribute_resolved' }, { set: 'tribute_outcome', value: 'default' }, { set: 'jonah_beaten' }, { set: 'tribute_day', value: false },
      { news: { tag: 'tribute_paid', text: 'Shale paid the Dogs\' tithe; Deputy Reese took a beating for arguing', valence: 0, size: 6, at: 'shale' } },
      { memory: { npc: 'npc_sh_01', tag: 'absent_on_tribute_day', valence: -10, strength: 70 } },
    ],
    preventedEffects: [{ set: 'tribute_day', value: false }],
  },
  /** The Sink's spring (B3.6 → B3.11): no date resolves it. A hearing of the designate at the top of the Spire closes the
   * season's accounts and enters every schedule on its docket as final (the plate on its door says so, and lists the
   * Sink's relief as DIVERTED while it is). At the next dawn after the verdict the spring comes up the stair — unless the
   * player has already settled the pumps (a variance, the dial, or the Pale), which prevents it. */
  sink_spring: {
    id: 'sink_spring', at: { hour: 6 }, armedIf: { flag: 'ar_verdict' }, preventedIf: { flag: 'sk_pumps' },
    effects: [
      { set: 'sk_flooded' }, { set: 'ks_ocho', value: 'drowned' }, { set: 'sk_clinic_anju' },
      { decision: { id: 'sk_flooded', text: 'The Sink flooded in the spring the season closed on, with its relief still diverted to the Precinct. Ocho drowned at his clinic.' } },
      { news: { tag: 'sink_flooded', text: 'the spring came up the Sink\'s stair a hand higher than last year; the free doctor drowned holding the clinic door', valence: -12, size: 9, at: 'meridian' } },
    ],
  },
  /** Leven (B3.12): once the player has taken the yard's money to look away, the tower burns at the next three o'clock the
   * player is in the Ring (the event waits for them; nothing burns behind their back while they are elsewhere). */
  leven_fire: {
    id: 'leven_fire', at: { hour: 3, where: 'md_ring' }, armedIf: { flag: 'dr_leven', eq: 'paid' },
    effects: [
      { set: 'dr_leven_burned' },
      { decision: { id: 'dr_leven_burned', text: 'Leven burned in the night after you took the yard\'s money. Two people died on the ninth floor; the count went out of the tower under its keeper\'s arm.' } },
      { news: { tag: 'dr_leven_burned', text: 'a squatted tower in the Ring burned in the night, floor on floor; its count says two dead on the ninth', valence: -8, size: 6, at: 'meridian' } },
    ],
  },
  /** The Skirts (B4a): the Concern's answer to the strike comes up the Line at the first seven o'clock the player is in the
   * Skirts after meeting Maren: twenty debtors bought off the Ninebridge block. A claim already upheld prevents it. */
  hs_scab_train: {
    id: 'hs_scab_train', at: { hour: 7, where: 'hs_skirts' }, armedIf: { flag: 'hs_maren_met' }, preventedIf: { flag: 'hs_shift' },
    effects: [
      { set: 'hs_scabs_here' }, { learn: 'hs_scabs_here' },
      { news: { tag: 'hs_scabs_here', text: 'twenty debtors came up the Line to the Skirts on Concern paper, to dig Number Six past the Shift\'s picket', valence: -3, size: 5, at: 'skirts' } },
    ],
  },
  /** The strike's default (keystone 12 as forecast): if the player goes up the hill (B4b sets `hc_inside`) with the strike
   * unsettled, the men off the Line go down, the Window starves the picket, and at the next dawn the player is back in the
   * Skirts the Clean take Maren Okafor. A story milestone, never a date: it waits for the player. */
  hs_strike_breaks: {
    id: 'hs_strike_breaks', at: { hour: 6, where: 'hs_skirts' }, armedIf: { all: [{ flag: 'hc_inside' }, { not: { flag: 'hs_shift' } }] }, preventedIf: { flag: 'hs_shift' },
    effects: [
      { set: 'hs_shift', value: 'broken' }, { set: 'hs_shift_how', value: 'default' }, { set: 'ks_maren', value: 'hanged' },
      { approval: { companion: 'npc_hs_01', by: -20 } }, { rep: { faction: 'the_shift', respect: -10 } },
      { decision: { id: 'hs_shift', text: 'While you were up the hill the strike at Number Six broke, and the Concern hanged Maren Okafor at Footgate, as the city wrote.' } },
      { news: { tag: 'hs_shift_broken', text: 'the strike at Number Six was broken; the Concern hanged the Shift\'s leader from the post at Footgate', valence: -8, size: 8, at: 'skirts' } },
    ],
  },
  /** Spare Parts (B4a): once the player has settled the Weighhouse without getting Nils Haber out, he goes up on the next
   * freight at two the player is in the Skirts. Freeing him first prevents it. */
  hs_freight: {
    id: 'hs_freight', at: { hour: 2, where: 'hs_skirts' }, armedIf: { all: [{ flag: 'hs_parts' }, { not: { flag: 'hs_nils' } }] }, preventedIf: { flag: 'hs_nils' },
    effects: [
      { set: 'hs_nils', value: 'up' },
      { decision: { id: 'hs_nils', text: 'Nils Haber went up the hill on the Weighhouse\'s freight at two, asleep, with a tag on his wrist.' } },
      { news: { tag: 'hs_nils_up', text: 'Joran Haber\'s boy went up on the freight at two; the Window wrote DISCHARGED IN SERVICE', valence: -4, size: 3, at: 'skirts' } },
    ],
  },
  /** Tamsin out of the Cistern (U8): once her letter's reply has come, or she has been asked at the Grille, she waits at
   * Mags's (the map places her there); at six the first evening the player is in Shale, she comes up to them. If they have
   * already found her, nothing happens. */
  tamsin_out: {
    id: 'tamsin_out', at: { hour: 18, where: 'shale' }, armedIf: { any: [{ knows: 'tamsin_replied' }, { flag: 'tam_out' }] }, preventedIf: { flag: 'tam_met' },
    effects: [
      { set: 'tam_out' }, { event: 'talk', data: { npc: 'npc_c9_03' } },
      { news: { tag: 'cistern_out', text: 'somebody came out of the Cistern at Knock, the first in living memory, and walked down to Shale', valence: 1, size: 5, at: 'shale' } },
    ],
  },
};
