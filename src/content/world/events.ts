import type { WorldEventDef } from '../../engine/world/frontier';
import { DS_EVENTS } from './ds_shore';
import { DK_EVENTS } from './md_docks';
import { B5C_EVENTS } from './b5c_wilds';

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
  /** Kettle Cut exposed (B5a): the guild's riders take West Halt's watch at the next dawn the player is at Four Ways. Abe
   * Mutasa is hanged at Kettle for the guard; Chela Ortega is put in the stocks on Four Ways' platform and off the Line. */
  rc_riders: {
    id: 'rc_riders', at: { hour: 6, where: 'rc_fourways' }, armedIf: { flag: 'rc_bandits', eq: 'exposed' },
    effects: [
      { set: 'rc_abe', value: 'hanged' }, { set: 'rc_chela', value: 'stocks' }, { set: 'rc_watch_gone' },
      { decision: { id: 'rc_abe', text: 'The guild\'s riders took West Halt\'s watch. Abe Mutasa was hanged at Kettle for Hamish Gorse; Chela Ortega was put off the Line.' } },
      { news: { tag: 'rc_riders', text: 'the guild\'s riders broke West Halt\'s watch and hanged a boy at Kettle Cut for the guard', valence: -4, size: 7, at: 'fourways' } },
    ],
  },
  /** Murder hangs (B5a): once the stationmaster has sentenced Abe Mutasa, the boy is hanged at the next dawn the player is at
   * Four Ways, unless the player has settled it first (argued, taken him off, or given him to the guild). */
  rc_abe_rope: {
    id: 'rc_abe_rope', at: { hour: 6, where: 'rc_fourways' }, armedIf: { all: [{ flag: 'rc_abe_sentenced' }, { not: { flag: 'rc_abe' } }] }, preventedIf: { flag: 'rc_abe' },
    effects: [
      { set: 'rc_abe', value: 'hanged' }, { approval: { companion: 'npc_of_03', by: -10 } },
      { memory: { npc: 'npc_rc_02', tag: 'abe_hanged', valence: -30, strength: 80 } },
      { decision: { id: 'rc_abe', text: 'Brodsky hanged Abe Mutasa at dawn at the end of Four Ways\' platform, under the clock, for Hamish Gorse.' } },
      { news: { tag: 'rc_abe_hanged', text: 'the stationmaster at Four Ways hanged a West Halt boy at dawn for the guard killed at Kettle', valence: -3, size: 6, at: 'fourways' } },
    ],
  },
  /** Stock Car sold (B5a): the Concern's men take the twelve from West Halt's tower at the next dawn the player is there. */
  rc_stock_taken: {
    id: 'rc_stock_taken', at: { hour: 6, where: 'rc_halt_w' }, armedIf: { flag: 'rc_stock', eq: 'sold' },
    effects: [
      { set: 'rc_joaquin', value: 'taken' }, { set: 'rc_stock_gone' },
      { decision: { id: 'rc_stock_taken', text: 'The Concern\'s men came to West Halt at dawn with a paper and took the twelve from the water tower, Joaquin Ortega among them, for the Weighhouse.' } },
      { news: { tag: 'rc_stock_taken', text: 'the Concern took twelve debtors out of West Halt\'s water tower at dawn; somebody had told', valence: -6, size: 6, at: 'west_halt' } },
    ],
  },
  /** The East Length helped (B5a): the Concern's through comes off the rails at East Halt at the next two o'clock the player
   * is there. Unwarned, its driver dies; warned, he takes it at walking pace and jumps. */
  rc_derail: {
    id: 'rc_derail', at: { hour: 2, where: 'rc_halt_e' }, armedIf: { all: [{ flag: 'rc_east', eq: 'helped' }, { not: { flag: 'rc_willem_warned' } }] }, preventedIf: { flag: 'rc_derailed' },
    effects: [
      { set: 'rc_derailed' }, { set: 'rc_willem_dead' }, { rep: { faction: 'tollmen', respect: -10 } }, { rep: { faction: 'concern', respect: -10 } },
      { decision: { id: 'rc_derail', text: 'The Concern\'s through came off the rails on East Halt\'s east length at two in the morning. Willem Visser died in the cab.' } },
      { news: { tag: 'rc_derailed', text: 'the Concern\'s through came off the rails at East Halt in the night; its driver was killed; the halt is stripping the cars', valence: -5, size: 8, at: 'east_halt' } },
    ],
  },
  rc_derail_slow: {
    id: 'rc_derail_slow', at: { hour: 2, where: 'rc_halt_e' }, armedIf: { all: [{ flag: 'rc_east', eq: 'helped' }, { flag: 'rc_willem_warned' }] }, preventedIf: { flag: 'rc_derailed' },
    effects: [
      { set: 'rc_derailed' }, { rep: { faction: 'concern', respect: -10 } },
      { decision: { id: 'rc_derail', text: 'The Concern\'s through came off the rails on East Halt\'s east length at walking pace. Willem Visser jumped clear.' } },
      { news: { tag: 'rc_derailed', text: 'the Concern\'s through came off the rails at East Halt in the night at walking pace; the halt is stripping the cars', valence: -2, size: 7, at: 'east_halt' } },
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
// the Drowned Shore's events (B5b) live in ds_shore.ts
Object.assign(WORLD_EVENTS, DS_EVENTS);
// Carrick's events (B5b, Meridian's docks) live in md_docks.ts
Object.assign(WORLD_EVENTS, DK_EVENTS);
// the Teeth mines' and the Northern Wet's events (B5c) live in b5c_wilds.ts
Object.assign(WORLD_EVENTS, B5C_EVENTS);
