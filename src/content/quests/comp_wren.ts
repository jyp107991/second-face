import type { QuestDef } from '../../engine/quest/quest';

/**
 * Wren Calloway's personal line (U8). It opens at a fire once she knows her name is on the city's list, and resolves
 * on story milestones, never on a date: her choice at the fire (`wren_bridge`, overpass.ts), then the Bridgeward raid
 * (`bw_raid`: 'won' | 'lost', set by the raid itself, B3.12). The debt auction before it is q_nb_auction.
 */
export const q_comp_wren: QuestDef = {
  id: 'q_comp_wren', title: 'Wren\'s Name', act: 'a2', start: 'tower', xp: 300,
  routes: [
    { id: 'raid', kind: 'fight', label: 'Take the bridge back with her, on a night the two of you choose' },
    { id: 'down', kind: 'talk', label: 'Talk her off the bridge the city wrote for her', requires: { skill: 'speech', gte: 50 } },
    { id: 'chain', kind: 'knowledge', label: 'Split the chain three ways first, so there is nothing left to take' },
  ],
  stages: {
    tower: {
      journal: 'A girl at the Saints\' tower in Bridgeward says the city\'s lines in the city\'s voice, and one of them is Wren\'s: Calloway, Wren, Bridgeward, the rope, before the Long Night. An example; the gangs cowed. The Dogs\' old garage has her name burned on its wall at a child\'s height, under BACK FOR THE BRIDGE. Wren will say what she means to do about it at a fire, not on a street.',
      objectives: [
        { id: 'fire', text: 'Hear Wren out at a fire', done: { flag: 'wren_bridge' } },
        { id: 'wall', text: 'Read the Dogs\' wall in the old garage', done: { knows: 'bw_wall_wren' }, optional: true },
        { id: 'chain', text: 'Settle who holds the chain', done: { flag: 'bw_turf' }, optional: true },
      ],
      next: [
        { if: { flag: 'wren_bridge', eq: 'stood_down' }, stage: 'stood_down' },
        { if: { flag: 'wren_bridge', eq: 'raid' }, stage: 'raid' },
        { if: { flag: 'wren_bridge', eq: 'alone' }, stage: 'alone' },
      ],
    },
    raid: {
      journal: 'Wren will take the bridge back for the Dogs on a night the two of you pick, not the night the city wrote. Who holds the chain will matter when it comes; so will who stands beside her.',
      objectives: [
        { id: 'night', text: 'Take the bridge with Wren', done: { flag: 'bw_raid' } },
        { id: 'ilya', text: 'A second rifle on the bridge, with its own reason to be there', done: { flag: 'ilya_wren_bridge' }, optional: true, hidden: true },
      ],
      next: [
        { if: { flag: 'bw_raid', eq: 'won' }, stage: 'walked' },
        { if: { flag: 'bw_raid', eq: 'lost' }, stage: 'hanged' },
        { if: { flag: 'wren_bridge', eq: 'stood_down' }, stage: 'stood_down' },
      ],
    },
    alone: {
      journal: 'Wren is going to take the bridge without you, on a night she won\'t name. She has stopped asking.',
      objectives: [{ id: 'night', text: 'The night she picks', done: { flag: 'bw_raid' } }],
      next: [
        { if: { flag: 'bw_raid', eq: 'won' }, stage: 'walked' },
        { if: { flag: 'bw_raid', eq: 'lost' }, stage: 'hanged' },
        { if: { flag: 'wren_bridge', eq: 'raid' }, stage: 'raid' },
      ],
    },
    stood_down: {
      journal: 'Wren left the bridge to whoever holds the chain. The Dogs stay a crew in the Sallow, and the city will have to find its example somewhere else. "If I don\'t go," she said, "it isn\'t my bridge. It\'s just a bridge."',
      end: 'done',
      onEnter: [{ set: 'wren_rope', value: 'refused' }, { decision: { id: 'wren_rope', text: 'Wren walked away from the bridge the city wrote for her.' } }],
    },
    walked: {
      journal: 'The Dogs hold the bridge, on a night Wren chose. There is a rope on the booth and nobody on it.',
      end: 'done',
      onEnter: [{ set: 'wren_rope', value: 'broken' }, { set: 'forecast_broken' }, { decision: { id: 'wren_rope', text: 'Wren took the bridge on her own night, and walked off it.' } }],
    },
    hanged: {
      journal: 'The raid went wrong, and the city had its example the way it wrote it. They left her on the booth a day, for the street to see.',
      end: 'failed',
      onEnter: [{ set: 'wren_rope', value: 'fulfilled' }, { decision: { id: 'wren_rope', text: 'Wren hanged from the Bridgeward booth, as the city wrote.' } }],
    },
  },
};
