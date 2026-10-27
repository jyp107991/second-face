import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, Bridgeward — gang turf round the broken bridge (Act 2). The Rustmouths hold the toll and turn if the
 * bridge is fought for (`bw_fight_rustmouths`); the Gilt at the chain turn with their captain (`lr_fight_gilt`); the
 * Pale at the hatch with theirs (`sk_fight_pale`). The Saints fight nobody.
 */
const BW = { team: 'neutral', settlement: 'meridian' } as const;
const rust = { team: 'rustmouths', settlement: 'meridian', faction: 'rustmouths', role: 'labourer' as const, hostileIf: { flag: 'bw_fight_rustmouths' }, ally: { all: [{ flag: 'lr_fight_gilt' }, { member: 'rustmouths' }] }, courage: 65 };
const gilt = { team: 'gilt', settlement: 'meridian', faction: 'gilt', role: 'gilded' as const, hostileIf: { flag: 'lr_fight_gilt' }, ally: { flag: 'bw_fight_rustmouths' }, courage: 60 };
const pale = { team: 'pale', settlement: 'meridian', faction: 'pale', role: 'street' as const, hostileIf: { flag: 'sk_fight_pale' }, courage: 70 };
const sleep = (spot: string, from = 23, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const BRIDGEWARD_NPCS: NpcDef[] = [
  {
    id: 'npc_bw_01', name: 'Dagmar Holt', look: { seed: 9601, frame: 'narrow', age: 58, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xa89888 }, weathering: 0.55, scars: ['cheek_slash'] } },
    level: 7, ...rust, dialogue: 'd_bw_dagmar', attrs: { presence: 9, wits: 8, grit: 7 }, skills: { speech: 60, barter: 60, firearms: 45 }, tolls: 500, leader: true,
    equip: ['w_sawnoff'], inventory: [['a_12ga', 10]],
    schedule: [{ from: 8, to: 23, spot: 'boss', activity: 'work' }, sleep('hall_cot')],
    barks: ['Auntie Scrap, they call me. Not to my face. Say it to my face.', 'The bridge is ours because we\'re on it. That\'s the whole of law in Bridgeward.', 'Five to stand. Twenty to cross, if there were a crossing. There isn\'t. Five.'],
  },
  {
    id: 'npc_bw_02', name: 'Corvo', look: { seed: 9602, frame: 'broad', age: 36, ancestry: 'mediterranean', over: { hair: { style: 'paint_buzz', color: 0x1a1410 }, facialHair: 'short_beard', weathering: 0.45 } },
    level: 6, ...rust, dialogue: 'd_bw_corvo', attrs: { brawn: 8, grit: 8 }, skills: { melee: 55, firearms: 40, barter: 35 }, tolls: 120,
    equip: ['w_pipe', 'w_revolver38'], inventory: [['a_38', 12]],
    schedule: [{ from: 7, to: 24, spot: 'hand', activity: 'work' }, sleep('hall_cot', 0, 7)],
    barks: ['Boss\'s Hand. The hand does the lifting.', 'Tithe\'s a hundred, or a haul. Haul\'s honest.', 'The Gilt want the chain. The Gilt want a lot.'],
  },
  {
    id: 'npc_bw_03', name: 'Petrov', look: { seed: 9603, frame: 'broad', age: 49, ancestry: 'north_european', over: { hair: { style: 'none', color: 0x202020 }, facialHair: 'full_beard', weathering: 0.5 } }, role: 'tech',
    level: 4, ...BW, courage: 45, dialogue: 'd_bw_petrov', attrs: { wits: 8, mechanics: 8 } as never, skills: { mechanics: 65, barter: 45 }, tolls: 300,
    merchant: { buys: ['junk', 'tool', 'weapon', 'misc'], cash: 300, restockDays: 4, markup: 1.4, stock: [['t_repair', 3], ['j_electronics', 4], ['j_wiring', 6], ['w_pipe', 2], ['a_38', 24], ['a_9mm', 24], ['w_zip38', 1]] },
    schedule: [{ from: 7, to: 22, spot: 'chop_counter', activity: 'trade' }, sleep('chop_cot', 22, 7)],
    barks: ['Anything with wheels. Anything that had wheels.', 'I cut cars. The Rustmouths cut me. That\'s the trade.', 'The Dogs left a buggy here once. I still have the seat.'],
  },
  {
    id: 'npc_bw_04', name: 'Verity', look: { seed: 9604, frame: 'narrow', age: 44, ancestry: 'mediterranean', over: { hair: { style: 'bob02', color: 0x5a5048 }, weathering: 0.35 } }, role: 'pilgrim',
    level: 5, ...BW, courage: 50, dialogue: 'd_bw_verity', faction: 'saints', attrs: { wits: 9, presence: 8, senses: 8 }, skills: { science: 50, speech: 55 }, tolls: 40,
    schedule: [{ from: 6, to: 24, spot: 'tower_yard', activity: 'work' }, sleep('shrine_sit', 0, 6)],
    barks: ['Listen. Under the hiss. It\'s always there.', 'The city talks to itself all night. We sit up for it.', 'A prophet is a radio that works. Nothing more; nothing less.'],
  },
  {
    id: 'npc_bw_05', name: 'Immy', look: { seed: 9605, frame: 'narrow', age: 16, ancestry: 'east_asian', over: { hair: { style: 'bob02', color: 0x1a1a1a }, weathering: 0.2 } }, role: 'street',
    level: 1, ...BW, courage: 25, dialogue: 'd_bw_immy', faction: 'saints', attrs: { senses: 10, wits: 7 }, tolls: 2,
    schedule: [{ from: 0, to: 24, spot: 'shrine', activity: 'pray' }],
    barks: ['— reserve nine, non-compliant —', '— point six, as per —', '— Thursday. Thursday. Thursday —', '— a hand higher —'],
  },
  {
    id: 'npc_bw_06', name: 'Tobin', look: { seed: 9606, frame: 'broad', age: 30, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b }, weathering: 0.3 } }, role: 'drifter',
    level: 3, ...BW, courage: 40, dialogue: 'd_bw_tobin', faction: 'saints', attrs: { senses: 8 }, tolls: 8,
    schedule: [{ from: 0, to: 24, spot: 'listener_a', activity: 'pray' }],
    barks: ['Three years listening. I heard my own name once. Nothing since.', 'She hears it in words. I hear it in weather.'],
  },
  {
    id: 'npc_bw_07', name: 'Nell', look: { seed: 9607, frame: 'narrow', age: 35, ancestry: 'north_european', over: { skinTone: 0.05, hair: { style: 'paint_shaved', color: 0xe0d8c8 }, weathering: 0.3 } },
    level: 5, ...pale, dialogue: 'd_bw_nell', attrs: { grit: 8, senses: 7 }, skills: { melee: 50, speech: 40 }, tolls: 30,
    equip: ['w_machete'],
    schedule: [{ from: 0, to: 24, spot: 'hatch_chair', activity: 'idle' }],
    barks: ['Hatch is ours. Stair\'s ours. The Sink\'s under it; that\'s ours too.', 'Show me your hands.', 'The bridge is nobody\'s. That\'s the only true thing said in Bridgeward.'],
  },
  {
    id: 'npc_bw_08', name: 'Jax', look: { seed: 9608, frame: 'broad', age: 23, ancestry: 'south_asian', over: { hair: { style: 'paint_shaved', color: 0xd8b040 }, weathering: 0.1 } },
    level: 5, ...gilt, dialogue: 'd_bw_jax', attrs: { reflex: 8, presence: 6 }, skills: { firearms: 50, speech: 40 }, tolls: 90,
    equip: ['w_pistol9'], inventory: [['a_9mm', 12]],
    schedule: [{ from: 0, to: 24, spot: 'chain_w', activity: 'patrol' }],
    barks: ['Chain says works. Chain means ours, as far as the fire barrel.', 'Pip says the bridge is next. Pip says.', 'Rustmouths charge the Crown\'s toll and keep the Crown\'s money. Somebody should tell the Crown.'],
  },
  {
    id: 'npc_bw_09', name: 'Old Fenn', look: { seed: 9609, frame: 'broad', age: 66, ancestry: 'east_african', over: { hair: { style: 'short04', color: 0xb8b0a8 }, facialHair: 'full_beard', weathering: 0.65 } }, role: 'drifter',
    level: 3, ...BW, courage: 40, dialogue: 'd_bw_fenn', attrs: { wits: 7, grit: 7 }, skills: { survival: 45, firearms: 40 }, tolls: 12,
    schedule: [{ from: 0, to: 24, spot: 'haunt_table', activity: 'idle' }],
    barks: ['Dogs had this garage. I was a Dog. I stayed; the garage stayed.', 'Kessler said the Sallow. Perpetua said the Sallow. I said my knees.', 'The cache is where it always was. Nobody\'s asked in nine years.'],
  },
  {
    id: 'npc_bw_10', name: 'Ms Harrow', look: { seed: 9610, frame: 'narrow', age: 38, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0x2a2018 }, weathering: 0.05 } }, role: 'corp',
    level: 4, ...BW, courage: 35, dialogue: 'd_bw_harrow', attrs: { wits: 9, presence: 8 }, skills: { barter: 60, speech: 55 }, tolls: 400,
    schedule: [{ from: 10, to: 16, spot: 'toll_booth', activity: 'work' }, { from: 16, to: 10, spot: 'toll_booth', activity: 'away' }],
    barks: ['The toll is the Crown\'s. The chain is the Rustmouths\'. The arrangement is mine.', 'A bridge to nowhere still has a near end. The near end is worth something.', 'House Vane holds the paper on this bridge. I hold the pen.'],
  },
  {
    id: 'npc_bw_11', name: 'Sadie Mott', look: { seed: 9611, frame: 'narrow', age: 41, ancestry: 'west_african', over: { hair: { style: 'bob02', color: 0x201810 }, weathering: 0.45 } }, role: 'trader',
    level: 3, ...BW, courage: 40, dialogue: 'd_bw_sadie', attrs: { grit: 6, barter: 6 } as never, skills: { barter: 45 }, tolls: 35,
    schedule: [{ from: 8, to: 22, spot: 'street_sit', activity: 'idle' }, sleep('street_sit', 22, 8)],
    barks: ['Five to stand on the bridge. Five to stand under it. Five to breathe, soon.', 'Carted for the Dogs once. They paid. Late, but they paid.'],
  },
  // the Rustmouths at the chain and in the yard
  { id: 'npc_bw_r1', name: 'Rustmouth', look: { seed: 9612, frame: 'broad', age: 29, ancestry: 'north_european' }, ...rust, level: 4, minor: true, equip: ['w_sawnoff'], inventory: [['a_12ga', 6]], schedule: [{ from: 0, to: 24, spot: 'toll_a', activity: 'patrol' }], barks: ['Five.', 'Chain\'s shut.'] },
  { id: 'npc_bw_r2', name: 'Rustmouth', look: { seed: 9613, frame: 'narrow', age: 33, ancestry: 'mediterranean' }, ...rust, level: 4, minor: true, equip: ['w_pump'], inventory: [['a_12ga', 6]], schedule: [{ from: 0, to: 24, spot: 'toll_b', activity: 'patrol' }], barks: ['Five to stand.'] },
  { id: 'npc_bw_r3', name: 'Rustmouth', look: { seed: 9614, frame: 'broad', age: 40, ancestry: 'east_asian' }, ...rust, level: 3, minor: true, equip: ['w_pipe'], schedule: [{ from: 0, to: 24, spot: 'yard_a', activity: 'work' }], barks: ['Haul\'s weighed Fridays.'] },
  { id: 'npc_bw_g1', name: 'Gilt', look: { seed: 9615, frame: 'narrow', age: 20, ancestry: 'mediterranean', over: { hair: { style: 'paint_shaved', color: 0xe0c060 } } }, ...gilt, level: 4, minor: true, equip: ['w_zip38'], inventory: [['a_38', 6]], schedule: [{ from: 0, to: 24, spot: 'chain_w2', activity: 'idle' }], barks: ['Chain says works.'] },
  { id: 'npc_bw_s1', name: 'Listener', look: { seed: 9616, frame: 'narrow', age: 52, ancestry: 'south_asian' }, ...BW, role: 'pilgrim', faction: 'saints', level: 2, minor: true, courage: 30, schedule: [{ from: 0, to: 24, spot: 'listener_b', activity: 'pray' }], barks: ['Under the hiss.'] },
  { id: 'npc_bw_p1', name: 'Pale Sworn', look: { seed: 9617, frame: 'broad', age: 28, ancestry: 'north_european', over: { skinTone: 0.05, hair: { style: 'paint_shaved', color: 0xd8d0c0 } } }, ...pale, level: 4, minor: true, equip: ['w_shiv'], schedule: [{ from: 0, to: 24, spot: 'pale_door', activity: 'patrol' }], barks: ['Hands.'] },
];
