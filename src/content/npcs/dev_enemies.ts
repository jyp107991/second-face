import type { NpcDef } from '../../engine/npc/defs';

/** Developer test enemies. Not part of the story. */
export const DEV_NPCS: NpcDef[] = [
  {
    id: 'dev_raider_boss', name: 'Scrap Boss', look: { seed: 901, frame: 'broad', age: 38, over: { facialHair: 'full_beard' } },
    outfit: { suit: 'male_casualsuit04', suitTint: 0x8a7a68, shoes: 'shoes05', shoeTint: 0x6a5a4a }, level: 4,
    attrs: { brawn: 7, reflex: 6, grit: 6, senses: 6 }, skills: { firearms: 30 },
    inventory: [['a_12ga', 12], ['c_knitkit', 1], ['tolls', 35]], equip: ['w_sawnoff', 'r_scrap'], team: 'dev_raiders', hostile: true, courage: 75, leader: true,
  },
  {
    id: 'dev_raider', name: 'Scrapper', look: { seed: 902, frame: 'broad' },
    outfit: { suit: 'male_casualsuit02', suitTint: 0x9a8a70, shoes: 'shoes02' }, level: 2,
    attrs: { reflex: 6, senses: 5 }, skills: { firearms: 20 },
    inventory: [['a_38', 14], ['c_jerky', 1], ['tolls', 8]], equip: ['w_zip38', 'w_machete'], team: 'dev_raiders', hostile: true, courage: 45,
  },
  {
    id: 'dev_raider_knife', name: 'Cutter', look: { seed: 903, frame: 'narrow' },
    outfit: { suit: 'female_casualsuit01', suitTint: 0x8a7060, shoes: 'shoes03' }, level: 2,
    attrs: { reflex: 7, brawn: 5 }, skills: { melee: 25 },
    inventory: [['c_kick', 1], ['tolls', 5]], equip: ['w_shiv', 'r_duster'], team: 'dev_raiders', hostile: true, courage: 55,
  },
  {
    id: 'dev_guide', name: 'Rook', look: { seed: 911, frame: 'broad', age: 61, over: { facialHair: 'stubble_heavy' } },
    outfit: { suit: 'male_casualsuit02', suitTint: 0x7a6a58, shoes: 'shoes02' }, level: 3, team: 'neutral', courage: 40,
    dialogue: 'd_dev_guide', inventory: [['t_picks', 1]],
  },
];
