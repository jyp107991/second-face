import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Long Night (B5d): the people the night brings to Openfield who are not already somewhere in the game. The city's
 * eviction line (wardens in the Precinct's grey), the guild's riders (the guild's green on cord and canvas, dust to the
 * knee), and the two wardens who carry the order's first name west on the Line. Everyone else who comes is someone the
 * player has met, placed at Openfield (or at West Halt, or at Carrick) for the night. Story notes:
 * story/B5d_NOTES_SECRET.md.
 */
const warden = { team: 'wardens', settlement: 'openfield', faction: 'wardens', role: 'guard' as const, hostileIf: { flag: 'ln_wardens_fight' }, courage: 60, minor: true, schedule: [] };
const rider = { team: 'tollmen', settlement: 'openfield', faction: 'tollmen', role: 'guard' as const, hostileIf: { flag: 'ln_riders_fight' }, courage: 55, minor: true, schedule: [] };
const escort = { team: 'wardens', settlement: 'west_halt', faction: 'wardens', role: 'guard' as const, hostileIf: { flag: 'ln_escort_fight' }, courage: 60, minor: true, schedule: [] };

export const LONGNIGHT_NPCS: NpcDef[] = [
  { id: 'npc_ln_w1', name: 'Warden', look: { seed: 5901, frame: 'broad', age: 38, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x46301f } } }, ...warden, level: 6, dialogue: 'd_ln_warden', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 16]], barks: ['Stand clear of the line.', 'The schedule holds.'] },
  { id: 'npc_ln_w2', name: 'Warden', look: { seed: 5902, frame: 'narrow', age: 29, ancestry: 'east_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b } } }, ...warden, level: 6, dialogue: 'd_ln_warden', equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], barks: ['Persons as the record holds.', 'Noted.'] },
  { id: 'npc_ln_w3', name: 'Warden', look: { seed: 5903, frame: 'broad', age: 44, ancestry: 'south_asian', over: { hair: { style: 'paint_shaved', color: 0x16120e }, facialHair: 'short_beard' } }, ...warden, level: 7, dialogue: 'd_ln_warden', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 16]], barks: ['The order will be read at the well.', 'Nobody leaves the holding with stores.'] },
  { id: 'npc_ln_r1', name: 'Guild Guard', look: { seed: 5911, frame: 'broad', age: 35, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x1a1410 }, facialHair: 'stubble' } }, ...rider, level: 6, dialogue: 'd_ln_rider', equip: ['w_carbine556', 'r_duster'], inventory: [['a_556', 14]], barks: ['Contract goods. Stand off.', 'The guild carries the risk. Tonight it carries a rifle.'] },
  { id: 'npc_ln_r2', name: 'Guild Guard', look: { seed: 5912, frame: 'narrow', age: 31, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8f6c45 } } }, ...rider, level: 5, dialogue: 'd_ln_rider', equip: ['w_smg9', 'r_duster'], inventory: [['a_9mm', 16]], barks: ['Futures fall due. That\'s all this is.', 'Nobody has to get hurt over seed.'] },
  { id: 'npc_ln_r3', name: 'Guild Guard', look: { seed: 5913, frame: 'broad', age: 42, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, facialHair: 'stubble_heavy' } }, ...rider, level: 6, dialogue: 'd_ln_rider', equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 8]], barks: ['Wagons by midnight.', 'The Grand Factor\'s word is the contract.'] },
  { id: 'npc_ln_e1', name: 'Warden', look: { seed: 5921, frame: 'broad', age: 40, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x2a2420 } } }, ...escort, level: 6, dialogue: 'd_ln_escort', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], barks: ['The prisoner travels to the city.', 'The car waits for the section.'] },
  { id: 'npc_ln_e2', name: 'Warden', look: { seed: 5922, frame: 'narrow', age: 33, ancestry: 'east_asian', over: { hair: { style: 'ponytail01', color: 0x16120e } } }, ...escort, level: 6, dialogue: 'd_ln_escort', equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 12]], barks: ['Stand back from the car.', 'Sedition. It\'s on the order.'] },
];
