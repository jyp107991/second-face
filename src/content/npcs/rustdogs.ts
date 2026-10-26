import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Rust Dogs under the overpass (Chapter One). Not hostile at the gate: Kessler keeps a list of who he
 * hasn't robbed, and strangers who come in daylight with their hands empty are a curiosity. The camp turns
 * on you as a whole when `rustdogs_hostile` is set (a fight in the hall, a theft seen, the coup).
 */
const RD = { team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', hostileIf: { flag: 'rustdogs_hostile' } } as const;
const sleep = (spot: string, from = 23, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const RUSTDOG_NPCS: NpcDef[] = [
  {
    id: 'npc_rd_01', name: 'Kessler', look: { seed: 3101, frame: 'broad', age: 52, over: { facialHair: 'short_beard', hair: { style: 'paint_buzz', color: 0x6a6660 } } }, role: 'raider',
    level: 7, ...RD, courage: 85, leader: true, dialogue: 'd_rd_kessler', attrs: { brawn: 7, grit: 8, presence: 8, wits: 7 }, skills: { firearms: 40, melee: 35, speech: 35 }, tolls: 120,
    equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 12], ['c_water', 2]],
    schedule: [{ from: 7, to: 22, spot: 'hall', activity: 'work' }, sleep('hall_cot', 22, 7)],
    barks: ['Fair.', 'Nobody drinks before the dogs do.', 'If you came to sell, Jack. If you came to talk, me. If you came to steal, Vasha.'],
  },
  {
    id: 'npc_rd_02', name: 'Vasha Kade', look: { seed: 3102, frame: 'narrow', age: 33, over: { hair: { style: 'paint_shaved', color: 0x120e0b }, scars: ['cheek_slash'] } }, role: 'raider',
    level: 7, ...RD, courage: 95, dialogue: 'd_rd_vasha', attrs: { reflex: 8, presence: 8, brawn: 6, wits: 7 }, skills: { firearms: 45, melee: 45, speech: 30 }, tolls: 40,
    equip: ['w_smg9', 'r_scrap'], inventory: [['a_9mm', 40]],
    schedule: [{ from: 6, to: 12, spot: 'vasha', activity: 'idle' }, { from: 12, to: 18, spot: 'lookout', activity: 'patrol' }, { from: 18, to: 24, spot: 'vasha_fire', activity: 'drink' }, sleep('tent_c', 0, 6)],
    barks: ['Say your name again. I like how it sounds when you\'re scared.', 'Kessler keeps lists. I keep count.', 'Shale\'s not a town. It\'s a well with people around it.'],
  },
  {
    id: 'npc_rd_03', name: 'Wren Calloway', look: { seed: 3103, frame: 'narrow', age: 27, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, scars: ['burn_left'] } }, role: 'raider',
    level: 4, ...RD, courage: 70, dialogue: 'd_rd_wren', attrs: { reflex: 8, senses: 8, wits: 7, presence: 5 }, skills: { stealth: 50, firearms: 35, survival: 40 }, tolls: 12,
    equip: ['w_pistol9', 'r_hood'], inventory: [['a_9mm', 14], ['c_water', 1], ['c_jerky', 1]],
    schedule: [{ from: 5, to: 11, spot: 'lookout', activity: 'patrol' }, { from: 11, to: 16, spot: 'lookout_b', activity: 'patrol' }, { from: 16, to: 22, spot: 'fire_a', activity: 'idle' }, sleep('tent_a', 22, 5)],
    barks: ['Two riders, no dust. So they came from the wet.', 'Don\'t stand on the skyline. Everyone stands on the skyline.', 'The girl\'s fine. Don\'t ask about the girl.'],
  },
  {
    id: 'npc_rd_05', name: 'Dog-mother Perpetua', look: { seed: 3105, frame: 'narrow', age: 60, over: { hair: { style: 'elvs_unkempt_french_braid', color: 0xb8b6ae } } }, role: 'nomad',
    level: 4, ...RD, courage: 60, dialogue: 'd_rd_perpetua', attrs: { wits: 8, grit: 7, presence: 7 }, skills: { survival: 45, speech: 35, medicine: 25 }, tolls: 35,
    equip: ['w_machete'], inventory: [['c_jerky', 4]],
    schedule: [{ from: 5, to: 21, spot: 'pens', activity: 'work' }, sleep('tent_b', 21, 5)],
    barks: ['The dogs know you before I do.', 'Forty years of this camp in my head. Ask me anything; pay me in something.', 'Teo counts well for a man in a cage.'],
  },
  {
    id: 'npc_rd_06', name: 'Brindle', look: { seed: 3106, frame: 'broad', age: 16 }, role: 'raider',
    level: 2, ...RD, courage: 55, dialogue: 'd_rd_brindle', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 35, firearms: 20 }, tolls: 3,
    equip: ['w_zip38'], inventory: [['a_38', 6]],
    schedule: [{ from: 5, to: 23, spot: 'gate', activity: 'patrol' }, sleep('tent_a', 23, 5)],
    barks: ['Hands where Wren can see them. She can see them from anywhere.', 'I\'m sixteen. I\'ve been a Dog nine years.', 'Don\'t go near the pens. They bite strangers first.'],
  },
  {
    id: 'npc_rd_07', name: 'Sallow Jack', look: { seed: 3107, frame: 'broad', age: 40, over: { facialHair: 'goatee', hair: { style: 'paint_fade', color: 0x2b1d14 } } }, role: 'tech',
    level: 5, ...RD, courage: 45, dialogue: 'd_rd_jack', attrs: { wits: 8, reflex: 6 }, skills: { mechanics: 55, firearms: 35, barter: 35 }, tolls: 140,
    equip: ['w_revolver38'], inventory: [['a_38', 12]],
    merchant: { buys: ['weapon', 'ammo', 'junk', 'tool'], cash: 140, restockDays: 5, faction: 'rust_dogs', markup: 1.4, stock: [['a_38', 24], ['a_9mm', 20], ['a_12ga', 10], ['w_zip38', 2], ['w_pipe', 1], ['w_machete', 1], ['w_sawnoff', 1], ['j_powder', 2], ['j_casings', 20], ['t_repair', 2], ['r_scrap', 1]] },
    schedule: [{ from: 7, to: 21, spot: 'bench', activity: 'trade' }, sleep('tent_c', 21, 7)],
    barks: ['Everything shoots. Nothing shoots straight. Pick.', 'Brass is money. Bring me brass.', 'Vasha wants a gun that shoots through walls. I told her: walls are the point.'],
  },
  {
    id: 'npc_sh_07', name: 'Teo Marsh', look: { seed: 2107, frame: 'broad', age: 46, over: { hair: { style: 'cut_sidepart', color: 0x46301f }, facialHair: 'stubble_heavy' } }, role: 'trader',
    level: 2, team: 'shale', settlement: 'shale', courage: 25, dialogue: 'd_rd_teo', attrs: { wits: 8, presence: 6 }, skills: { barter: 50, speech: 30 }, tolls: 0,
    barks: ['I can explain the numbers. Nobody wants the numbers explained.', 'Tell Mags I\'m — tell her I\'m fine.', 'Sixty Tolls. It was forty last week.'],
  },
  // the tribute party: Vasha's pick, who turn when Shale fights
  { id: 'npc_rd_t1', name: 'Rust Dog (Fenn)', look: { seed: 3121, frame: 'broad', age: 29 }, role: 'raider', level: 3, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', hostileIf: { flag: 'tribute_fight' }, courage: 60, equip: ['w_revolver38', 'r_scrap'], inventory: [['a_38', 10]], barks: ['Forty measures. Count them, I can\'t.', 'Vasha said don\'t smile. I\'m not smiling.'] },
  { id: 'npc_rd_t2', name: 'Rust Dog (Sorrel)', look: { seed: 3122, frame: 'narrow', age: 26 }, role: 'raider', level: 3, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', hostileIf: { flag: 'tribute_fight' }, courage: 55, equip: ['w_zip38'], inventory: [['a_38', 8]], barks: ['Nice town. Shame about the water.', 'We walked. Somebody\'s going to pay for the walking.'] },
  { id: 'npc_rd_t3', name: 'Rust Dog (Gant)', look: { seed: 3123, frame: 'broad', age: 41, over: { facialHair: 'full_beard' } }, role: 'raider', level: 4, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', hostileIf: { flag: 'tribute_fight' }, courage: 70, equip: ['w_sawnoff', 'r_hood'], inventory: [['a_12ga', 6]], barks: ['Barrels on the cart. Move.', 'Gant. Don\'t.'] },
  { id: 'npc_rd_t4', name: 'Rust Dog (Pell)', look: { seed: 3124, frame: 'narrow', age: 20 }, role: 'raider', level: 2, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', hostileIf: { flag: 'tribute_fight' }, courage: 45, equip: ['w_pipe'], barks: ['First tithe. Wren said keep my mouth shut.', 'Is it true the sheriff hangs people?'] },
  // the Dogs: six of them with faces, so a fight has a cost
  { id: 'npc_rd_g1', name: 'Rust Dog (Cass)', look: { seed: 3111, frame: 'narrow', age: 30 }, role: 'raider', level: 3, ...RD, courage: 60, equip: ['w_revolver38', 'r_scrap'], inventory: [['a_38', 10]], schedule: [{ from: 6, to: 22, spot: 'tank', activity: 'patrol' }, sleep('tent_b', 22, 6)], barks: ['Water\'s ours. Kessler says so.', 'Don\'t touch the tank.'] },
  { id: 'npc_rd_g2', name: 'Rust Dog (Mole)', look: { seed: 3112, frame: 'broad', age: 38, over: { facialHair: 'full_beard' } }, role: 'raider', level: 3, ...RD, courage: 65, equip: ['w_pipe', 'r_hood'], schedule: [{ from: 8, to: 23, spot: 'fire_a', activity: 'drink' }, sleep('tent_a', 23, 8)], barks: ['Sit, if you\'re sitting.', 'Mole. Because I dig.'] },
  { id: 'npc_rd_g3', name: 'Rust Dog (Tally)', look: { seed: 3113, frame: 'narrow', age: 24 }, role: 'raider', level: 3, ...RD, courage: 55, equip: ['w_zip38'], inventory: [['a_38', 8]], schedule: [{ from: 6, to: 20, spot: 'fire_b', activity: 'idle' }, sleep('tent_b', 20, 6)], barks: ['You from Shale? You smell like Shale.', 'Tribute\'s soon. Everyone gets a share.'] },
  { id: 'npc_rd_g4', name: 'Rust Dog (Hob)', look: { seed: 3114, frame: 'broad', age: 45, over: { facialHair: 'stubble_heavy' } }, role: 'raider', level: 4, ...RD, courage: 70, equip: ['w_sawnoff', 'r_scrap'], inventory: [['a_12ga', 6]], schedule: [{ from: 6, to: 22, spot: 'fire_c', activity: 'idle' }, sleep('tent_c', 22, 6)], barks: ['Hob. Don\'t.', 'Kessler\'s soft. Don\'t tell him I said.'] },
  { id: 'npc_rd_g5', name: 'Rust Dog (Sprat)', look: { seed: 3115, frame: 'narrow', age: 19 }, role: 'raider', level: 2, ...RD, courage: 50, equip: ['w_knife_throw'], schedule: [{ from: 6, to: 22, spot: 'lookout_b', activity: 'patrol' }, sleep('tent_a', 22, 6)], barks: ['I see everything from up here. Mostly dust.', 'Wren taught me. Wren\'s leaving. Don\'t tell.'] },
  { id: 'npc_rd_g6', name: 'Rust Dog (Lute)', look: { seed: 3116, frame: 'broad', age: 33 }, role: 'raider', level: 3, ...RD, courage: 60, equip: ['w_spear'], schedule: [{ from: 6, to: 23, spot: 'pens_b', activity: 'work' }, sleep('tent_b', 23, 6)], barks: ['Dogs eat first. Then Kessler. Then us.', 'Race day\'s when Perpetua says.'] },
];
