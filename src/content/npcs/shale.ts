import type { NpcDef } from '../../engine/npc/defs';

/**
 * Shale — the well-town's people (Chapter One). Looks are generated from seed + role; the few fixed
 * features are the ones other people would mention.
 */
const SH = { team: 'shale', settlement: 'shale' } as const;
const home = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const SHALE_NPCS: NpcDef[] = [
  {
    id: 'npc_sh_01', name: 'Sheriff Ada Vey', look: { seed: 2101, frame: 'narrow', age: 48, over: { hair: { style: 'cut_crop', color: 0x6a5a50 } } }, role: 'guard',
    level: 6, ...SH, faction: 'shale_militia', courage: 80, dialogue: 'd_sh_ada', attrs: { wits: 7, presence: 7, reflex: 6 }, skills: { firearms: 35, speech: 25 },
    equip: ['w_revolver38', 'r_duster'], inventory: [['a_38', 18]], tolls: 30,
    schedule: [{ from: 6, to: 9, spot: 'street_c', activity: 'patrol' }, { from: 9, to: 19, spot: 'sheriff_desk', activity: 'work' }, { from: 19, to: 22, spot: 'saloon_table', activity: 'drink' }, home('home_e')],
    barks: ['Noted.', 'Water first. Everything else after.', 'If you\'re here to sell, Pike\'s east. If you\'re here to steal, I\'m here.'],
  },
  {
    id: 'npc_sh_02', name: 'Deputy Jonah Reese', look: { seed: 2102, frame: 'broad', age: 22, over: { hair: { style: 'cut_crew', color: 0x46301f } } }, role: 'guard',
    level: 3, ...SH, faction: 'shale_militia', courage: 90, dialogue: 'd_sh_jonah', attrs: { brawn: 6, reflex: 6 }, skills: { firearms: 20, melee: 15 },
    equip: ['w_pipe', 'r_jumpsuit'], inventory: [['c_water', 1]], tolls: 8,
    schedule: [{ from: 6, to: 12, spot: 'deputy', activity: 'work' }, { from: 12, to: 18, spot: 'street_e', activity: 'patrol' }, { from: 18, to: 21, spot: 'yard', activity: 'work' }, home('home_d', 21, 6)],
    barks: ['Sir. Ma\'am. — Sorry.', 'Sheriff says keep moving, so I keep moving.', 'I read the whole pump manual once. Twice.'],
  },
  {
    id: 'npc_sh_03', name: 'Mags Durrow', look: { seed: 2103, frame: 'narrow', age: 50, over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2b1d14 } } }, role: 'trader',
    level: 4, ...SH, courage: 55, dialogue: 'd_sh_mags', attrs: { presence: 8, wits: 7 }, skills: { barter: 40, speech: 35 }, tolls: 90,
    merchant: { buys: ['consumable', 'junk', 'misc'], cash: 90, restockDays: 3, stock: [['c_bitters', 4], ['c_dirtywater', 6], ['c_water', 2], ['c_jerky', 3], ['c_algae', 2]], markup: 1.4 },
    schedule: [{ from: 9, to: 2, spot: 'bar', activity: 'trade' }, { from: 2, to: 9, spot: 'home_b', activity: 'sleep' }],
    barks: ['Drink\'s on the house, love. Water isn\'t.', 'Teo would\'ve known what to charge you.', 'Mind the floor, it\'s older than you.'],
  },
  {
    id: 'npc_sh_04', name: 'Factor Ozias Pike', look: { seed: 2104, frame: 'broad', age: 44, over: { hair: { style: 'cut_slickback', color: 0x120e0b }, facialHair: 'none' } }, role: 'corp',
    level: 5, ...SH, faction: 'tollmen', courage: 50, dialogue: 'd_sh_pike', attrs: { wits: 8, presence: 7 }, skills: { barter: 55, speech: 40 }, tolls: 400,
    equip: ['w_pistol9'], inventory: [['a_9mm', 16]],
    merchant: { buys: 'all', cash: 400, restockDays: 4, faction: 'tollmen', markup: 1.6, stock: [['a_38', 30], ['a_9mm', 24], ['a_12ga', 12], ['c_water', 8], ['c_jerky', 6], ['c_tin', 2], ['j_fuel', 2], ['t_repair', 2], ['r_hood', 1], ['w_revolver38', 1], ['w_sawnoff', 1], ['c_bandage', 3], ['t_lamp', 1]] },
    schedule: [{ from: 8, to: 20, spot: 'toll_counter', activity: 'trade' }, { from: 20, to: 22, spot: 'toll_desk', activity: 'work' }, { from: 22, to: 8, activity: 'away' }],
    barks: ['As per the posted rates.', 'The Tollmen guarantee delivery. The road guarantees nothing.', 'Seed. Any seed, any price.'],
  },
  {
    id: 'npc_sh_05', name: 'Sister Calla', look: { seed: 2105, frame: 'narrow', age: 31, over: { hair: { style: 'short04', color: 0x46301f } } }, role: 'medic',
    level: 4, ...SH, faction: 'choir', courage: 60, dialogue: 'd_sh_calla', attrs: { wits: 7, presence: 6 }, skills: { medicine: 55, speech: 30 }, tolls: 20,
    inventory: [['c_bandage', 2]],
    merchant: { buys: ['consumable'], cash: 40, restockDays: 3, faction: 'choir', markup: 1.1, stock: [['c_bandage', 4], ['c_splint', 2], ['c_iodine', 2], ['c_water', 4], ['c_radflush', 1]] },
    schedule: [{ from: 6, to: 21, spot: 'mission', activity: 'work' }, home('mission_cot', 21, 6)],
    barks: ['The sky keeps no books. Sit; let me see that.', 'Water\'s free here. Don\'t tell Mags.', 'Who sent the wound doesn\'t change how it\'s dressed.'],
  },
  {
    id: 'npc_sh_06', name: 'Hollis Crane', look: { seed: 2106, frame: 'broad', age: 70, over: { hair: { style: 'paint_shaved', color: 0x8a8782 }, facialHair: 'full_beard' } }, role: 'drifter',
    level: 3, ...SH, courage: 20, dialogue: 'd_sh_hollis', attrs: { wits: 8, grit: 3 }, skills: { survival: 40, speech: 30 }, tolls: 3,
    inventory: [['c_stillwater', 1]],
    schedule: [{ from: 10, to: 1, spot: 'awning', activity: 'drink' }, { from: 1, to: 10, spot: 'home_a', activity: 'sleep' }],
    barks: ['Pup. Spare a pull?', 'Kite day coming. I can smell it.', 'The boards said a lot of things, once.'],
  },
  {
    id: 'npc_sh_08', name: 'Mender Yusra Hadid', look: { seed: 2108, frame: 'narrow', age: 39, over: { hair: { style: 'paint_cornrows', color: 0x120e0b } } }, role: 'medic',
    level: 5, ...SH, courage: 50, dialogue: 'd_sh_yusra', attrs: { wits: 8, reflex: 7 }, skills: { medicine: 60, science: 40, mechanics: 35 }, tolls: 45,
    merchant: { buys: ['tool', 'junk'], cash: 60, restockDays: 5, markup: 1.3, stock: [['t_repair', 2], ['c_bandage', 3], ['c_splint', 2], ['j_electronics', 2], ['u_holdfast', 1]] },
    schedule: [{ from: 7, to: 22, spot: 'mender', activity: 'work' }, home('mender_cot', 22, 7)],
    barks: ['Hold still.', 'The work is the work. Who wears it is your business.', 'Don\'t touch that. It\'s charged.'],
  },
  {
    id: 'npc_sh_09', name: 'Dov Reese', look: { seed: 2109, frame: 'broad', age: 55, over: { facialHair: 'short_beard', hair: { style: 'paint_buzz', color: 0x8a8782 } } }, role: 'labourer',
    level: 3, ...SH, courage: 40, dialogue: 'd_sh_dov', attrs: { brawn: 7, wits: 6 }, skills: { mechanics: 50 }, tolls: 12,
    schedule: [{ from: 5, to: 13, spot: 'pump_house', activity: 'work' }, { from: 13, to: 15, spot: 'wells', activity: 'work' }, { from: 15, to: 19, spot: 'pump_house', activity: 'work' }, { from: 19, to: 23, spot: 'awning', activity: 'drink' }, home('home_d', 23, 5)],
    barks: ['She took my boy and gave him a badge. Badge won\'t stop a bullet.', 'Pumps run when they run.', 'Don\'t stand there, you\'re in the light.'],
  },
  {
    id: 'npc_sh_10', name: 'Nell Durrow', look: { seed: 2110, frame: 'narrow', age: 19, over: { hair: { style: 'ponytail01', color: 0x6a4a30 } } }, role: 'settler',
    level: 1, ...SH, courage: 50, dialogue: 'd_sh_nell', attrs: { reflex: 6, presence: 6 }, tolls: 4,
    schedule: [{ from: 9, to: 23, spot: 'bar_hand', activity: 'work' }, home('home_b', 23, 9)],
    barks: ['Aunt Mags says smile. I\'m smiling.', 'The Wheel came through last month. Forty wagons. Forty.', 'If you want the room, ask her, not me.'],
  },
  {
    id: 'npc_sh_11', name: 'Corporal Issa Lind', look: { seed: 2111, frame: 'narrow', age: 34, over: { hair: { style: 'paint_fade', color: 0x120e0b } } }, role: 'guard',
    level: 4, ...SH, faction: 'shale_militia', courage: 85, dialogue: 'd_sh_issa', attrs: { reflex: 7, brawn: 6 }, skills: { firearms: 30, melee: 25 },
    equip: ['w_bolt308', 'r_scrap'], inventory: [['a_308', 12]], tolls: 10,
    schedule: [{ from: 6, to: 12, spot: 'yard', activity: 'work' }, { from: 12, to: 18, spot: 'street_w', activity: 'patrol' }, { from: 18, to: 22, spot: 'corporal', activity: 'work' }, home('home_f')],
    barks: ['Eyes up.', 'Jonah\'s a good kid. Kids die first.', 'When the Dogs come we fight. Ada knows it. Ada just hasn\'t said it.'],
  },
  {
    id: 'npc_sh_12', name: 'Old Pardo', look: { seed: 2112, frame: 'broad', age: 63, over: { facialHair: 'stubble_heavy', hair: { style: 'none', color: 0x8a8782 } } }, role: 'settler',
    level: 2, ...SH, courage: 30, dialogue: 'd_sh_pardo', attrs: { wits: 7, senses: 7 }, skills: { survival: 35 }, tolls: 15,
    merchant: { buys: ['junk'], cash: 15, restockDays: 1, markup: 1.2, stock: [['c_dirtywater', 6], ['c_water', 1]] },
    schedule: [{ from: 5, to: 21, spot: 'wells', activity: 'trade' }, home('home_g', 21, 5)],
    barks: ['The water comes when it comes.', 'Six, eleven, four, nine. Every day. Count it yourself.', 'Nobody asks the old man. The old man knows the clock.'],
  },
  {
    id: 'npc_sh_13', name: 'Ruth Avel', look: { seed: 2113, frame: 'narrow', age: 45, over: { hair: { style: 'cut_crop', color: 0x2b1d14 } } }, role: 'nomad',
    level: 4, ...SH, faction: 'wheel', courage: 60, dialogue: 'd_sh_ruth', attrs: { wits: 7, grit: 7 }, skills: { barter: 35, survival: 45 }, tolls: 70,
    equip: ['w_sawnoff'], inventory: [['a_12ga', 8]],
    merchant: { buys: ['junk', 'misc', 'ammo'], cash: 70, restockDays: 6, faction: 'wheel', markup: 1.3, stock: [['c_water', 4], ['c_jerky', 4], ['a_9mm', 10], ['a_38', 10], ['t_lamp', 1], ['j_cloth', 4]] },
    schedule: [{ from: 7, to: 20, spot: 'caravan', activity: 'trade' }, { from: 20, to: 7, spot: 'caravan_b', activity: 'sleep' }],
    barks: ['Letters go out with the next wagon. Pay in something a wagon wants.', 'Road\'s bad east. Road\'s worse west.', 'The Wheel owes nobody. The Wheel is owed by everyone.'],
  },
  {
    id: 'npc_sh_14', name: 'Hesper Vale', look: { seed: 2114, frame: 'narrow', age: 40 }, role: 'settler', level: 1, ...SH, courage: 30,
    schedule: [{ from: 7, to: 10, spot: 'wells_b', activity: 'work' }, { from: 10, to: 18, spot: 'street_w', activity: 'idle' }, { from: 18, to: 21, spot: 'saloon_table', activity: 'drink' }, home('home_c')],
    barks: ['Two cups a day. Two. For a family.', 'You from the salt cut? Nobody\'s from the salt cut.', 'The Choir girl fixed my boy\'s arm for nothing. Nothing. I don\'t trust it.'],
  },
  {
    id: 'npc_sh_15', name: 'Kit Doran', look: { seed: 2115, frame: 'broad', age: 25 }, role: 'labourer', level: 2, ...SH, courage: 45,
    schedule: [{ from: 6, to: 12, spot: 'plaza', activity: 'work' }, { from: 12, to: 20, spot: 'wells_b', activity: 'work' }, { from: 20, to: 23, spot: 'saloon_table', activity: 'drink' }, home('home_c', 23, 6)],
    barks: ['Tribute\'s due. Everybody knows it, nobody says it.', 'I carried water for the Dogs once. Once.', 'Pike pays in Tolls. Mags pays in drink. Guess who I work for.'],
  },
  {
    id: 'npc_sh_16', name: 'Benno Strand', look: { seed: 2116, frame: 'broad', age: 30 }, role: 'guard', level: 3, ...SH, faction: 'shale_militia', courage: 60,
    equip: ['w_zip38'], inventory: [['a_38', 6]],
    schedule: [{ from: 6, to: 14, spot: 'street_e', activity: 'patrol' }, { from: 14, to: 22, spot: 'yard_b', activity: 'work' }, home('home_f', 22, 6)],
    barks: ['Militia. Volunteer. Mostly volunteer.', 'My cousin Ilya shot a bottle off a post at two hundred paces. Then he shot the post.', 'Keep the gun down in town.'],
  },
];
