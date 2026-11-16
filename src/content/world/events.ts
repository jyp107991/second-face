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
