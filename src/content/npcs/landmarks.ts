import type { NpcDef } from '../../engine/npc/defs';

/** People at the Sallow's landmarks: the scavenger under the dead pumps. */
export const LANDMARK_NPCS: NpcDef[] = [
  {
    id: 'npc_wp_01', name: 'Odd Marit', look: { seed: 7201, frame: 'narrow', age: 63, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0xb0a898 }, scars: ['burn_left'], weathering: 0.85 } }, role: 'drifter',
    level: 4, team: 'drifters', settlement: 'drywells', hostileIf: { flag: 'wp_marit_fight' }, courage: 45, dialogue: 'd_wp_marit', attrs: { senses: 7, wits: 6 }, skills: { mechanics: 50, survival: 55, barter: 35 }, tolls: 18,
    equip: ['w_zip38', 'r_hood'], inventory: [['a_38', 6], ['j_wiring', 4]],
    merchant: { stock: [['j_wiring', 6], ['j_scrap', 5], ['j_electronics', 1], ['c_jerky', 2], ['t_lamp', 1]], buys: ['junk', 'tool'], cash: 35, restockDays: 10, markup: 1.2 },
    schedule: [{ from: 6, to: 20, spot: 'marit_work', activity: 'work' }, { from: 20, to: 6, spot: 'marit_tent', activity: 'sleep' }],
    barks: ['Copper\'s mine. The rest is yours.', 'Six towers. I\'ve had the wire out of four.', 'The Wheel pays in horseshoes. I don\'t have a horse.'],
  },
];
