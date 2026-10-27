import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Sump — two scavenger clans over the storm tunnels (Act 2). Grel's people on the west rim, the Tanners on the
 * east; each turns on you only if you take up arms for the other (`sp_fight_grel`, `sp_fight_tanner`).
 */
const SP = { settlement: 'sump' } as const;
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const SUMP_NPCS: NpcDef[] = [
  {
    id: 'npc_sp_01', name: 'Grel', look: { seed: 8101, frame: 'broad', age: 45, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x3a3230 }, facialHair: 'stubble_heavy', scars: ['cheek_slash'], weathering: 0.9 } }, role: 'raider',
    level: 6, ...SP, team: 'grel', hostileIf: { flag: 'sp_fight_grel' }, courage: 70, dialogue: 'd_sp_grel', attrs: { brawn: 7, grit: 8, wits: 6, presence: 6 }, skills: { melee: 45, firearms: 35, survival: 45, barter: 30 }, tolls: 55,
    equip: ['w_sawnoff', 'r_scrap'], inventory: [['a_12ga', 8], ['c_water', 2]],
    schedule: [{ from: 6, to: 20, spot: 'grel_table', activity: 'work' }, { from: 20, to: 23, spot: 'west_fire', activity: 'drink' }, sleep('grel_cot', 23, 6)],
    barks: ['The tunnel\'s ours. We dug it.', 'Scrip on the fourth day. The guild\'s never late with scrip. Only with everything else.', 'Hesk Tanner can have the east rim and the wind.'],
  },
  {
    id: 'npc_sp_02', name: 'Hesk Tanner', look: { seed: 8102, frame: 'narrow', age: 39, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x6a5a40 }, weathering: 0.8 } }, role: 'raider',
    level: 6, ...SP, team: 'tanner', hostileIf: { flag: 'sp_fight_tanner' }, courage: 70, dialogue: 'd_sp_hesk', attrs: { reflex: 7, grit: 7, wits: 7, presence: 6 }, skills: { melee: 40, firearms: 40, stealth: 35, barter: 30 }, tolls: 50,
    equip: ['w_smg9', 'r_scrap'], inventory: [['a_9mm', 16], ['c_jerky', 2]],
    schedule: [{ from: 6, to: 20, spot: 'tanner_table', activity: 'work' }, { from: 20, to: 23, spot: 'east_fire', activity: 'drink' }, sleep('tanner_cot', 23, 6)],
    barks: ['There\'s a door down there that never opened. I\'d like to be the one who opens it.', 'Grel digs. We think.', 'The guild pays us to clear a tunnel. Nobody asked what\'s at the end of it.'],
  },
  {
    id: 'npc_sp_03', name: 'Dace', look: { seed: 8103, frame: 'narrow', age: 31, ancestry: 'southeast_asian', over: { hair: { style: 'cut_sidepart', color: 0x1a1410 } } }, role: 'trader',
    level: 3, ...SP, team: 'neutral', faction: 'tollmen', courage: 30, dialogue: 'd_sp_dace', attrs: { wits: 7, presence: 5, reflex: 6 }, skills: { barter: 45, speech: 35, stealth: 25 }, tolls: 90,
    equip: ['w_zip38'], inventory: [['a_38', 6], ['c_water', 2]],
    schedule: [{ from: 7, to: 21, spot: 'runner', activity: 'idle' }, sleep('runner_cot', 21, 7)],
    barks: ['Fourth day. Scrip. Both rims. Don\'t ask me why both.', 'Factor Pike pays for a tunnel. I carry the paying.', 'I don\'t go down. Nobody from the guild goes down.'],
  },
  {
    id: 'npc_sp_04', name: 'Nib', look: { seed: 8104, frame: 'narrow', age: 13, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x2a1c12 }, weathering: 0.6 } }, role: 'street',
    level: 1, ...SP, team: 'neutral', courage: 40, dialogue: 'd_sp_nib', attrs: { reflex: 7, senses: 7, wits: 6 }, skills: { stealth: 40, survival: 30 }, tolls: 3,
    schedule: [{ from: 6, to: 20, spot: 'basin_work', activity: 'work' }, { from: 20, to: 22, spot: 'basin_fire', activity: 'idle' }, sleep('west_cot_d', 22, 6)],
    barks: ['I\'ve been down. Further than them. Don\'t tell Grel.', 'The machine\'s a bench. It\'s a good bench.', 'There\'s writing down there. I can\'t read it. I can read the pictures.'],
  },
  // the tunnel guard, one from each clan, so neither digs alone
  { id: 'npc_sp_g1', name: 'Grel\'s Man', look: { seed: 8111, frame: 'broad', age: 28 }, role: 'raider', level: 4, ...SP, team: 'grel', hostileIf: { flag: 'sp_fight_grel' }, courage: 60, equip: ['w_pipe', 'r_scrap'], schedule: [{ from: 0, to: 24, spot: 'mouth_w', activity: 'work' }], barks: ['Nobody goes down. Grel\'s word.', 'Scrip day\'s the fourth.'] },
  { id: 'npc_sp_g2', name: 'Tanner Watch', look: { seed: 8112, frame: 'narrow', age: 33, over: { facialHair: 'stubble' } }, role: 'raider', level: 4, ...SP, team: 'tanner', hostileIf: { flag: 'sp_fight_tanner' }, courage: 60, equip: ['w_machete', 'r_scrap'], schedule: [{ from: 0, to: 24, spot: 'mouth_e', activity: 'work' }], barks: ['Nobody goes down. Hesk\'s word.', 'The west rim cheats at Dust.'] },
  { id: 'npc_sp_w1', name: 'Digger (Grel\'s)', look: { seed: 8113, frame: 'broad', age: 40 }, role: 'labourer', level: 3, ...SP, team: 'grel', hostileIf: { flag: 'sp_fight_grel' }, courage: 50, equip: ['w_shiv'], schedule: [{ from: 6, to: 20, spot: 'west_work', activity: 'work' }, sleep('west_cot_b', 20, 6)], barks: ['Forty feet of rubble a week. The guild counts the feet.'] },
  { id: 'npc_sp_w2', name: 'Digger (Grel\'s)', look: { seed: 8114, frame: 'narrow', age: 24 }, role: 'labourer', level: 3, ...SP, team: 'grel', hostileIf: { flag: 'sp_fight_grel' }, courage: 50, equip: ['w_knife_throw'], schedule: [{ from: 6, to: 20, spot: 'west_pair_a', activity: 'idle' }, sleep('west_cot_c', 20, 6)], barks: ['Hesk\'s lot took our lamp. We took their rope.'] },
  { id: 'npc_sp_t1', name: 'Tanner', look: { seed: 8115, frame: 'broad', age: 36 }, role: 'labourer', level: 3, ...SP, team: 'tanner', hostileIf: { flag: 'sp_fight_tanner' }, courage: 50, equip: ['w_pipe'], schedule: [{ from: 6, to: 20, spot: 'east_work', activity: 'work' }, sleep('east_tent_b', 20, 6)], barks: ['Hesk says the door\'s the prize. Grel says the tunnel is. The guild says dig.'] },
  { id: 'npc_sp_t2', name: 'Tanner', look: { seed: 8116, frame: 'narrow', age: 22 }, role: 'raider', level: 3, ...SP, team: 'tanner', hostileIf: { flag: 'sp_fight_tanner' }, courage: 50, equip: ['w_shiv'], schedule: [{ from: 6, to: 20, spot: 'east_pair_a', activity: 'idle' }, sleep('east_tent_c', 20, 6)], barks: ['Grel\'s lot took our rope. We took their lamp.'] },
];
