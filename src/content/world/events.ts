import type { WorldEventDef } from '../../engine/world/frontier';

/** Scheduled world events (resolve once, whether or not the player is there). */
export const WORLD_EVENTS: Record<string, WorldEventDef> = {
  /** Tribute Day: the Rust Dogs come to Shale for the half-year tithe once the player has found the town. */
  tribute_day: {
    id: 'tribute_day', at: { day: 5, hour: 10 }, armedIf: { flag: 'visited_shale' },
    effects: [
      { set: 'tribute_day' }, { quest: 'q_ch1_tribute', start: true }, { quest: 'q_ch1_tribute', stage: 'day' },
      { news: { tag: 'dogs_in_shale', text: 'the Rust Dogs came into Shale for the tithe', valence: 0, size: 5, at: 'shale' } },
    ],
  },
  /** By evening it is settled one way or another; if the player was not there to settle it, Shale pays and a deputy is hurt. */
  tribute_settled: {
    id: 'tribute_settled', at: { day: 5, hour: 18 }, armedIf: { flag: 'tribute_day' }, preventedIf: { flag: 'tribute_resolved' },
    effects: [
      { set: 'tribute_resolved' }, { set: 'tribute_outcome', value: 'default' }, { set: 'jonah_beaten' }, { set: 'tribute_day', value: false },
      { news: { tag: 'tribute_paid', text: 'Shale paid the Dogs\' tithe; Deputy Reese took a beating for arguing', valence: 0, size: 6, at: 'shale' } },
      { memory: { npc: 'npc_sh_01', tag: 'absent_on_tribute_day', valence: -10, strength: 70 } },
    ],
    preventedEffects: [{ set: 'tribute_day', value: false }],
  },
};
