import type { NpcDef } from '../../engine/npc/defs';

/** The burnt orchard: the Choir's keeper and two novices, and the two who come over the wall at night. */
const OR = { team: 'choir', faction: 'choir', settlement: 'shale' } as const;

export const ORCHARD_NPCS: NpcDef[] = [
  {
    id: 'npc_or_01', name: 'Brother Anselm Quade', look: { seed: 7301, frame: 'narrow', age: 57, ancestry: 'east_african', over: { hair: { style: 'paint_shaved', color: 0x1a1410 }, facialHair: 'short_beard', weathering: 0.6 } }, role: 'pilgrim',
    level: 3, ...OR, courage: 35, dialogue: 'd_or_anselm', attrs: { wits: 7, presence: 6, grit: 6 }, skills: { survival: 45, medicine: 30, speech: 35 }, tolls: 9,
    inventory: [['c_fruit', 3], ['c_water', 2]],
    schedule: [{ from: 5, to: 12, spot: 'keeper_rows', activity: 'work' }, { from: 12, to: 14, spot: 'keeper_fire', activity: 'idle' }, { from: 14, to: 19, spot: 'keeper_rows', activity: 'work' }, { from: 19, to: 22, spot: 'keeper_fire', activity: 'idle' }, { from: 22, to: 5, spot: 'keeper_cot', activity: 'sleep' }],
    barks: ['Twelve. Last year it was nine.', 'The sky is open. Everything under it is ours to mend.', 'They take the green ones. Who takes green ones?'],
  },
  {
    id: 'npc_or_02', name: 'Novice Petra Lund', look: { seed: 7302, frame: 'narrow', age: 20, ancestry: 'caucasian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8a6a3a } } }, role: 'pilgrim',
    level: 1, ...OR, courage: 30, dialogue: 'd_or_petra', attrs: { senses: 6 }, skills: { medicine: 20 }, tolls: 2,
    schedule: [{ from: 6, to: 20, spot: 'novice_beds', activity: 'work' }, { from: 20, to: 6, spot: 'tent_a', activity: 'sleep' }],
    barks: ['Sister Calla says water the roots, not the leaves.', 'I heard them last night. Two. Small.'],
  },
  {
    id: 'npc_or_03', name: 'Novice Dun Mercer', look: { seed: 7303, frame: 'broad', age: 24, ancestry: 'south_asian', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, facialHair: 'stubble_light' } }, role: 'pilgrim',
    level: 2, ...OR, courage: 40, dialogue: 'd_or_dun', attrs: { brawn: 6 }, skills: { melee: 25, survival: 25 }, tolls: 3,
    equip: ['w_pipe'],
    schedule: [{ from: 6, to: 20, spot: 'novice_well', activity: 'work' }, { from: 20, to: 6, spot: 'tent_b', activity: 'sleep' }],
    barks: ['I was a Dog till I was twelve. I know a Dog\'s footprint.', 'The well\'s forty feet and the bucket\'s thirty-nine.'],
  },
  // Over the wall at night: two half-grown Rust Dogs, hungry.
  {
    id: 'npc_or_04', name: 'Kip', look: { seed: 7304, frame: 'narrow', age: 16, over: { hair: { style: 'cut_messy', color: 0x3a2a1a }, scars: ['chin_nick'] } }, role: 'raider',
    level: 1, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', courage: 25, dialogue: 'd_or_thieves', attrs: { reflex: 7, senses: 6 }, skills: { stealth: 35 }, tolls: 1,
    equip: ['w_shiv'], inventory: [['c_fruit', 2]],
    barks: ['Run.', 'Mote, run.'],
  },
  {
    id: 'npc_or_05', name: 'Mote', look: { seed: 7305, frame: 'narrow', age: 16, ancestry: 'east_asian', over: { hair: { style: 'cut_pixie', color: 0x1a1410 } } }, role: 'raider',
    level: 1, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', courage: 20, attrs: { reflex: 6 }, skills: { stealth: 30 }, tolls: 0,
    inventory: [['c_fruit', 3]],
    barks: ['They\'re sour.', 'Kip said nobody\'d miss them.'],
  },
];
