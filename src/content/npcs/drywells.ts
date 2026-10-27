import type { NpcDef } from '../../engine/npc/defs';

/** Dry Wells — the family that lives off the station's bypass: three generations from a cistern that failed. */
const DW = { team: 'ghosts', settlement: 'drywells' } as const;

export const DRYWELLS_NPCS: NpcDef[] = [
  {
    id: 'npc_dw_01', name: 'Oriel Marr', look: { seed: 6101, frame: 'narrow', age: 72, ancestry: 'latin_american', over: { hair: { style: 'bob02', color: 0xc8c0b4 } } }, role: 'settler',
    level: 3, ...DW, courage: 40, dialogue: 'd_dw_oriel', attrs: { wits: 8, presence: 6 }, skills: { mechanics: 35, medicine: 25, speech: 30 }, tolls: 6,
    schedule: [{ from: 7, to: 21, spot: 'oriel_chair', activity: 'idle' }, { from: 21, to: 7, spot: 'oriel_cot', activity: 'sleep' }],
    barks: ['Eleven o\'clock. Listen. There.', 'My father said the pumps would outlive the town. He was a pump man. He was right.', 'Sit. The chair\'s the only thing here that was built for sitting.'],
  },
  {
    id: 'npc_dw_02', name: 'Sable Marr', look: { seed: 6102, frame: 'broad', age: 34, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, scars: ['eye_scar'] } }, role: 'drifter',
    level: 5, ...DW, hostileIf: { flag: 'dw_fight' }, courage: 70, dialogue: 'd_dw_sable', attrs: { senses: 8, reflex: 6, grit: 6 }, skills: { firearms: 45, survival: 50, stealth: 30 }, tolls: 9,
    equip: ['w_bolt308', 'r_hood'], inventory: [['a_308', 7], ['c_jerky', 2]],
    schedule: [{ from: 5, to: 23, spot: 'perch', activity: 'patrol' }, { from: 23, to: 5, spot: 'cot_d', activity: 'sleep' }],
    barks: ['Far enough.', 'Seven rounds. I count them so you don\'t have to.', 'Shale thinks the pressure drop is the city. Let them.'],
  },
  {
    id: 'npc_dw_03', name: 'Juno Marr', look: { seed: 6103, frame: 'narrow', age: 19, ancestry: 'latin_american', over: { hair: { style: 'toigo_inverted_bob', color: 0x1a1410 } } }, role: 'settler',
    level: 2, ...DW, courage: 45, dialogue: 'd_dw_juno', attrs: { wits: 7 }, skills: { survival: 30, medicine: 20 }, tolls: 2,
    schedule: [{ from: 6, to: 20, spot: 'planter', activity: 'work' }, { from: 20, to: 6, spot: 'cot_b', activity: 'sleep' }],
    barks: ['Beans. In a planter. In Dry Wells. Grandmother says that\'s a joke; I say it\'s beans.', 'If you\'re from Shale, don\'t tell them about the valve.'],
  },
  {
    id: 'npc_dw_04', name: 'Cato Marr', look: { seed: 6104, frame: 'broad', age: 23, ancestry: 'latin_american', over: { facialHair: 'stubble' } }, role: 'labourer',
    level: 3, ...DW, hostileIf: { flag: 'dw_fight' }, courage: 55, dialogue: 'd_dw_cato', attrs: { brawn: 7 }, skills: { mechanics: 30, melee: 25 }, equip: ['w_pipe'], tolls: 3,
    schedule: [{ from: 6, to: 20, spot: 'yard', activity: 'work' }, { from: 20, to: 6, spot: 'cot_c', activity: 'sleep' }],
    barks: ['The valve\'s mine to turn. Grandmother says when, I say how far.', 'Cistern 4. Say it to anyone in Shale and watch them not know it.'],
  },
  {
    id: 'npc_dw_05', name: 'Wick Marr', look: { seed: 6105, frame: 'narrow', age: 16, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x1a1410 } } }, role: 'settler',
    level: 1, ...DW, courage: 30, dialogue: 'd_dw_wick', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 30 }, tolls: 1,
    schedule: [{ from: 6, to: 21, spot: 'tower', activity: 'patrol' }, { from: 21, to: 6, spot: 'cot_c', activity: 'sleep' }],
    barks: ['I can hear the clock in the pumps. Sable says that\'s not a thing.', 'I\'ve never seen Shale. I\'ve seen its water go past under the floor.'],
  },
  {
    id: 'npc_dw_06', name: 'Guild Engineer Osk', look: { seed: 6106, frame: 'narrow', age: 41, ancestry: 'east_asian', over: { hair: { style: 'cut_sidepart', color: 0x1a1410 } } }, role: 'tech',
    level: 4, team: 'tollmen', faction: 'tollmen', settlement: 'drywells', courage: 30, dialogue: 'd_dw_clerk', attrs: { wits: 8 }, skills: { science: 50, mechanics: 40 }, tolls: 20,
    equip: ['w_pistol9'], schedule: [],
    barks: ['By the measure.', 'Allocation is posted. Reliability is not negotiable.', 'The guild thanks you for your custom.'],
  },
];
