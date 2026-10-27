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
};
