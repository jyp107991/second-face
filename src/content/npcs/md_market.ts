import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, Old Market — the bazaar in the dead mall (Act 2). Nobody here is anyone's; the wardens on the ring
 * street turn only if the market comes to a fight (`md_fight`).
 */
const MK = { team: 'neutral', settlement: 'meridian' } as const;
const warden = { team: 'wardens', settlement: 'meridian', faction: 'wardens', role: 'guard' as const, hostileIf: { flag: 'md_fight' }, courage: 70 };
const sleep = (spot: string, from = 23, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const MARKET_NPCS: NpcDef[] = [
  {
    id: 'npc_mk_01', name: 'Half-Price', look: { seed: 9201, frame: 'narrow', age: 50, ancestry: 'east_asian', over: { hair: { style: 'none', color: 0x202020 }, facialHair: 'none', weathering: 0.3 } }, role: 'street',
    outfit: { layers: [{ name: 'donitz_monk_robe', dye: 0x2a2a30, grime: 0.3, wear: 0.5 }, { name: 'donitz_monk_robe_hood', dye: 0x2a2a30, grime: 0.3 }, { name: 'toigo_gloves_short', dye: 0x1a1a1a }], grime: 0.3, wear: 0.5 },
    level: 5, ...MK, courage: 50, dialogue: 'd_mk_broker', attrs: { wits: 9, presence: 7, senses: 7 }, skills: { barter: 70, speech: 55, stealth: 40 }, tolls: 300,
    equip: ['w_hand44'], inventory: [['a_38', 6]],
    schedule: [{ from: 0, to: 24, spot: 'hatch', activity: 'work' }],
    barks: ['Half pays half. That\'s the name, and the deal.', 'The board\'s the board. I\'m only the hatch.', 'Don\'t look under the hood; there\'s nothing there you\'d like.'],
  },
  {
    id: 'npc_mk_02', name: 'Auntie Wen', look: { seed: 9202, frame: 'narrow', age: 63, ancestry: 'east_asian', over: { hair: { style: 'bob02', color: 0x9a9088 }, weathering: 0.5 } }, role: 'trader',
    level: 3, ...MK, courage: 45, dialogue: 'd_mk_wen', attrs: { presence: 7, wits: 6 }, skills: { barter: 45, speech: 40 }, tolls: 140,
    merchant: { buys: ['consumable', 'junk'], cash: 140, restockDays: 1, markup: 1.3, stock: [['c_tin', 6], ['c_meat', 4], ['c_fruit', 4], ['c_water', 8], ['c_jerky', 4], ['c_bitters', 3]] },
    schedule: [{ from: 6, to: 23, spot: 'wen_counter', activity: 'trade' }, sleep('wen_counter')],
    barks: ['Two Tolls a bowl. Three with meat. Don\'t ask which.', 'Everyone eats here. Everyone talks here. I hear it all and sell none of it.', 'Sit. You look like a forecast.'],
  },
  {
    id: 'npc_mk_03', name: 'Dessa Kuhn', look: { seed: 9203, frame: 'narrow', age: 37, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x3a3230 }, scars: ['brow_cut'] } }, role: 'tech',
    level: 4, ...MK, courage: 45, dialogue: 'd_mk_kuhn', attrs: { wits: 8, senses: 7 }, skills: { science: 50, barter: 45, medicine: 30 }, tolls: 320,
    merchant: { buys: ['misc', 'junk', 'tool'], cash: 320, restockDays: 5, markup: 1.6, stock: [['ci_ch_arm_steady', 1], ['ci_ch_legs_spring', 1], ['ci_ch_skin_plate', 1], ['j_electronics', 3], ['j_wiring', 4], ['t_repair', 2]] },
    schedule: [{ from: 8, to: 21, spot: 'chrome_stall', activity: 'trade' }, sleep('chrome_cot', 21, 8)],
    barks: ['Dark chrome. No leash, no licence, no warranty.', 'Boxed, not fitted. The Sink fits; I sell.', 'Concern chrome\'s prettier. Concern chrome phones home.'],
  },
  {
    id: 'npc_mk_04', name: 'Harlan Galt', look: { seed: 9204, frame: 'broad', age: 49, ancestry: 'north_european', over: { hair: { style: 'cut_crew', color: 0x5a5048 }, facialHair: 'moustache', weathering: 0.5 } }, role: 'trader',
    level: 5, ...MK, courage: 60, dialogue: 'd_mk_galt', attrs: { brawn: 6, wits: 6, presence: 6 }, skills: { firearms: 50, barter: 45, mechanics: 40 }, tolls: 280,
    merchant: { buys: ['weapon', 'ammo', 'armor'], cash: 280, restockDays: 4, markup: 1.5, stock: [['w_revolver38', 1], ['w_pistol9', 1], ['w_smg9', 1], ['w_bolt308', 1], ['w_pump', 1], ['a_9mm', 40], ['a_38', 30], ['a_12ga', 20], ['a_556', 24], ['a_308', 12], ['r_duster', 1], ['r_helmet', 1]] },
    equip: ['w_hand44', 'r_duster'], inventory: [['a_38', 12]],
    schedule: [{ from: 8, to: 20, spot: 'gun_stall', activity: 'trade' }, sleep('gun_back', 20, 8)],
    barks: ['Unlicensed. Everything in Old Market is; that\'s what the wardens count.', 'Guild ammunition, Mender pistols, one rifle I won\'t say where from.', 'Point it at the floor in here.'],
  },
  {
    id: 'npc_mk_05', name: 'Sato', look: { seed: 9205, frame: 'narrow', age: 42, ancestry: 'east_asian', over: { hair: { style: 'cut_slickback', color: 0x1a1410 } } }, role: 'corp',
    level: 4, ...MK, courage: 35, dialogue: 'd_mk_sato', attrs: { wits: 9, senses: 7, presence: 5 }, skills: { science: 45, security: 50, barter: 45, stealth: 35 }, tolls: 220,
    merchant: { buys: ['misc', 'tool'], cash: 100, restockDays: 7, markup: 2.0, stock: [['t_picks', 2]] },
    schedule: [{ from: 9, to: 22, spot: 'fixer', activity: 'work' }, sleep('fixer', 22, 9)],
    barks: ['No sign on the door. If you found it, you were sent.', 'Papers are paper. The lens is the problem, and the lens can be told things.', 'I don\'t do forecasts. I do the past.'],
  },
  {
    id: 'npc_mk_06', name: 'Mirabel Tosh', look: { seed: 9206, frame: 'narrow', age: 58, ancestry: 'mediterranean', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8a8078 } } }, role: 'trader',
    level: 2, ...MK, courage: 35, dialogue: 'd_mk_tosh', attrs: { wits: 7, presence: 6 }, skills: { barter: 40, speech: 45 }, tolls: 60,
    merchant: { buys: ['junk', 'misc'], cash: 60, restockDays: 3, markup: 1.3, stock: [['j_cloth', 4], ['t_lamp', 1]] },
    schedule: [{ from: 8, to: 21, spot: 'paper_stall', activity: 'trade' }, sleep('paper_stall', 21, 8)],
    barks: ['Paper. News, letters, the Precinct\'s notices a day late and half the price.', 'I don\'t sell futures. I sell what already happened; it\'s cheaper and truer.'],
  },
  {
    id: 'npc_mk_07', name: 'Ferenc', look: { seed: 9207, frame: 'broad', age: 66, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xb8b0a8 }, facialHair: 'full_beard', weathering: 0.6 } }, role: 'settler',
    level: 2, ...MK, courage: 30, dialogue: 'd_mk_ferenc', attrs: { wits: 7, presence: 6 }, skills: { speech: 40 }, tolls: 10,
    schedule: [{ from: 8, to: 22, spot: 'gossip_a_sit', activity: 'idle' }, sleep('gossip_a_sit', 22, 8)],
    barks: ['Sit. Tea\'s two. Talk\'s free and worth it.', 'The Crown\'s having a Masque. The Sink\'s having a flood. Same week; different notices.', 'There\'s a girl in Bridgeward who says true things in a dead radio\'s voice.'],
  },
  {
    id: 'npc_mk_08', name: 'Lark', look: { seed: 9208, frame: 'narrow', age: 14, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.5 } }, role: 'street',
    level: 1, ...MK, courage: 40, dialogue: 'd_mk_lark', attrs: { reflex: 7, wits: 7, senses: 7 }, skills: { stealth: 40, science: 20 }, tolls: 6,
    schedule: [{ from: 7, to: 23, spot: 'kiosk', activity: 'idle' }, sleep('kiosk', 23, 7)],
    barks: ['It talks if you feed it. I feed it.', 'It said my name before I told it. Everyone\'s.', 'Don\'t pull the wire. The wire\'s how it knows.'],
  },
  {
    id: 'npc_mk_09', name: 'Caddo Vell', look: { seed: 9209, frame: 'broad', age: 34, ancestry: 'latin_american', over: { hair: { style: 'cut_messy', color: 0x2a1c12 }, facialHair: 'stubble_heavy', weathering: 0.7 } }, role: 'labourer',
    level: 4, ...MK, hostileIf: { flag: 'mk_riot_fight' }, courage: 65, dialogue: 'd_mk_vell', attrs: { brawn: 7, presence: 7, grit: 6 }, skills: { melee: 40, speech: 35 }, tolls: 14,
    equip: ['w_pipe'],
    schedule: [{ from: 6, to: 23, spot: 'square', activity: 'idle' }, sleep('square')],
    barks: ['Point six. They say point eight and the dial says point six.', 'The Precinct drinks what we don\'t. Say it with me.', 'Forty people in this queue and two wardens. Count.'],
  },
  {
    id: 'npc_mk_10', name: 'Pinch', look: { seed: 9210, frame: 'narrow', age: 28, ancestry: 'southeast_asian', over: { hair: { style: 'paint_fade', color: 0x1a1410 } } }, role: 'street',
    level: 3, ...MK, courage: 35, dialogue: 'd_mk_pinch', attrs: { reflex: 7, wits: 7 }, skills: { barter: 50, stealth: 45, security: 35 }, tolls: 160,
    merchant: { buys: 'all', cash: 160, restockDays: 2, markup: 1.4, stock: [['t_picks', 1], ['j_electronics', 2], ['j_casings', 10]] },
    schedule: [{ from: 10, to: 2, spot: 'fence_sit', activity: 'trade' }, sleep('fence_sit', 2, 10)],
    barks: ['I buy anything that\'s not nailed down, and I know a man with a claw hammer.', 'No questions. I\'ve a rule about questions; it\'s the only rule I\'ve got.'],
  },
  { id: 'npc_md_g6', name: 'Warden', look: { seed: 9126, frame: 'broad', age: 32, ancestry: 'east_african' }, ...warden, level: 5, equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'ring_w', activity: 'patrol' }], barks: ['Count\'s at noon and six.', 'Unlicensed. All of it. Noted.'] },
  { id: 'npc_md_g7', name: 'Warden', look: { seed: 9127, frame: 'narrow', age: 29, ancestry: 'south_asian' }, ...warden, level: 5, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], schedule: [{ from: 0, to: 24, spot: 'ring_e', activity: 'patrol' }], barks: ['East street\'s closed past the bulbs. Works.', 'Keep the aisles clear.'] },
];
