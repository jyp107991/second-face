import type { NpcDef } from '../../engine/npc/defs';

/** Developer test enemies. Not part of the story. */
export const DEV_NPCS: NpcDef[] = [
  {
    id: 'dev_raider_boss', name: 'Scrap Boss', look: { seed: 901, frame: 'broad', over: { age: 38, facialHair: 'full_beard' } },
    outfit: { shirt: 0x4a3a2a, pants: 0x3a3028, boots: 0x1a1612, plates: 0x6a6a5a }, level: 4,
    attrs: { brawn: 7, reflex: 6, grit: 6, senses: 6 }, skills: { firearms: 30 },
    inventory: [['a_12ga', 12], ['c_knitkit', 1], ['tolls', 35]], equip: ['w_sawnoff', 'r_scrap'], team: 'dev_raiders', hostile: true, courage: 75, leader: true,
  },
  {
    id: 'dev_raider', name: 'Scrapper', look: { seed: 902, frame: 'broad' },
    outfit: { shirt: 0x5a4a32, pants: 0x3a3028, boots: 0x1a1612, hood: 0x6a5a40 }, level: 2,
    attrs: { reflex: 6, senses: 5 }, skills: { firearms: 20 },
    inventory: [['a_38', 14], ['c_jerky', 1], ['tolls', 8]], equip: ['w_zip38', 'w_machete'], team: 'dev_raiders', hostile: true, courage: 45,
  },
  {
    id: 'dev_raider_knife', name: 'Cutter', look: { seed: 903, frame: 'narrow' },
    outfit: { shirt: 0x6a3a2a, pants: 0x2a2a24, boots: 0x1a1612 }, level: 2,
    attrs: { reflex: 7, brawn: 5 }, skills: { melee: 25 },
    inventory: [['c_kick', 1], ['tolls', 5]], equip: ['w_shiv', 'r_duster'], team: 'dev_raiders', hostile: true, courage: 55,
  },
];
