import type { NpcDef } from '../../engine/npc/defs';

/** People met on the road: placed by road encounters on the roadside maps, never by a map of their own. */
const ROAD = { settlement: 'shale' } as const;

export const WILDS_NPCS: NpcDef[] = [
  // The guild's outriders on the highway: two bikes, a ledger, a rate card.
  {
    id: 'npc_w_outrider_a', name: 'Outrider Sorin Vale', look: { seed: 7101, frame: 'broad', age: 36, ancestry: 'east_african', over: { hair: { style: 'paint_fade', color: 0x1a1410 }, facialHair: 'goatee' } }, role: 'guard',
    level: 5, ...ROAD, team: 'tollmen', faction: 'tollmen', courage: 65, dialogue: 'd_re_patrol', attrs: { reflex: 6, senses: 7 }, skills: { firearms: 45, speech: 30 }, tolls: 24,
    equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12], ['c_water', 2]],
    barks: ['Papers.', 'The road is insured between posts. You are not between posts.', 'As per.'],
  },
  {
    id: 'npc_w_outrider_b', name: 'Outrider Hesper Quayle', look: { seed: 7102, frame: 'narrow', age: 29, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x1a1410 } } }, role: 'guard',
    level: 4, ...ROAD, team: 'tollmen', faction: 'tollmen', courage: 55, attrs: { reflex: 7 }, skills: { firearms: 40 }, tolls: 12,
    equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 10]],
    barks: ['Sorin does the talking.', 'Bike\'s running hot. Make it quick.'],
  },
  // A drifter at a dead fire with a leg that has gone bad.
  {
    id: 'npc_w_drifter', name: 'Pell Amory', look: { seed: 7103, frame: 'narrow', age: 44, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x3a2a1a }, facialHair: 'stubble_heavy', scars: ['cheek_slash'] } }, role: 'drifter',
    level: 3, ...ROAD, team: 'drifters', courage: 20, dialogue: 'd_re_drifter', attrs: { grit: 6 }, skills: { survival: 45, melee: 25 }, tolls: 7,
    equip: ['w_machete'], inventory: [['c_dirtywater', 1], ['j_cloth', 2]],
    barks: ['Don\'t. Just don\'t.', 'It was a kite. Nobody believes the kite.'],
  },
  // Rust Dog scouts, a long way from the overpass.
  {
    id: 'npc_w_scout_a', name: 'Rust Dog (Hale)', look: { seed: 7104, frame: 'broad', age: 27, over: { hair: { style: 'paint_shaved', color: 0x1a1410 }, facialHair: 'stubble' } }, role: 'raider',
    level: 4, ...ROAD, team: 'rustdogs', faction: 'rust_dogs', hostileIf: { flag: 're_scouts_fight' }, courage: 60, dialogue: 'd_re_scouts', attrs: { brawn: 6, reflex: 6 }, skills: { firearms: 35, melee: 35 }, tolls: 9,
    equip: ['w_sawnoff', 'r_scrap'], inventory: [['a_12ga', 6]],
    barks: ['Water. Then we\'ll see.', 'Kessler counts us when we come back. Kessler counts everything.'],
  },
  {
    id: 'npc_w_scout_b', name: 'Rust Dog (Nettle)', look: { seed: 7105, frame: 'narrow', age: 22, ancestry: 'south_asian', over: { hair: { style: 'cut_pixie', color: 0x1a1410 }, scars: ['brow_cut'] } }, role: 'raider',
    level: 3, ...ROAD, team: 'rustdogs', faction: 'rust_dogs', hostileIf: { flag: 're_scouts_fight' }, courage: 50, attrs: { reflex: 7 }, skills: { firearms: 30, stealth: 40 }, tolls: 4,
    equip: ['w_zip38', 'r_hood'], inventory: [['a_38', 8]],
    barks: ['Hale talks. I count the rounds.', 'Shale\'s water tastes of the pipe.'],
  },
  // A rider of the Wheel, watering two horses at a trough that should be dry.
  {
    id: 'npc_w_wheel', name: 'Ansel of the Wheel', look: { seed: 7106, frame: 'narrow', age: 51, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x8a8070 }, facialHair: 'short_beard' } }, role: 'nomad',
    level: 5, ...ROAD, team: 'wheel', faction: 'wheel', courage: 60, dialogue: 'd_re_wheel', attrs: { senses: 8, presence: 6 }, skills: { survival: 60, barter: 45, firearms: 35 }, tolls: 40,
    equip: ['w_bolt308', 'r_duster'], inventory: [['a_308', 10], ['c_water', 4], ['c_jerky', 3]],
    merchant: { stock: [['c_water', 4], ['c_jerky', 3], ['c_bandage', 2], ['a_308', 10]], buys: ['junk', 'consumable'], cash: 60, restockDays: 7, markup: 1.3 },
    barks: ['The Wheel turns; it doesn\'t stop for anyone.', 'Horses first. Then you.'],
  },
  // A man walking the wrong way at night with his hand on the air.
  {
    id: 'npc_w_walker', name: 'A walker', look: { seed: 7107, frame: 'narrow', age: 58, over: { hair: { style: 'none', color: 0x1a1410 }, facialHair: 'none', weathering: 0.9 } }, role: 'drifter',
    level: 2, ...ROAD, team: 'drifters', courage: 10, dialogue: 'd_re_walker', attrs: { wits: 3 }, skills: {}, tolls: 0,
    inventory: [['c_dirtywater', 1]],
    barks: ['East. It said east.', 'I had a name. It\'s in the book now.'],
  },
  // A guild carter and his guard, halted with an axle in the dirt.
  {
    id: 'npc_w_carter', name: 'Carter Oswin Bell', look: { seed: 7108, frame: 'broad', age: 47, ancestry: 'caucasian', over: { hair: { style: 'cut_crew', color: 0x6a5a48 }, facialHair: 'moustache' } }, role: 'trader',
    level: 3, ...ROAD, team: 'tollmen', faction: 'tollmen', courage: 35, dialogue: 'd_re_caravan', attrs: { brawn: 6 }, skills: { mechanics: 25, barter: 40 }, tolls: 55,
    inventory: [['c_water', 6], ['c_tin', 3], ['j_scrap', 4]],
    merchant: { stock: [['c_water', 6], ['c_tin', 3], ['c_bandage', 2]], buys: ['junk'], cash: 40, restockDays: 7, markup: 1.5 },
    barks: ['Axle. Of course it\'s the axle.', 'Guild delivery is guaranteed between posts. This is between posts.'],
  },
  {
    id: 'npc_w_carter_guard', name: 'Caravan Guard', look: { seed: 7109, frame: 'broad', age: 33, over: { hair: { style: 'paint_buzz', color: 0x1a1410 }, facialHair: 'stubble' } }, role: 'guard',
    level: 4, ...ROAD, team: 'tollmen', faction: 'tollmen', courage: 55, attrs: { reflex: 6 }, skills: { firearms: 40 }, tolls: 10,
    equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]],
    barks: ['Keep your hands where the wagon can see them.'],
  },
];
