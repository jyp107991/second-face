import type { NpcDef } from '../../engine/npc/defs';

/** Cistern 9 residents (Chapter One). */
const C9_SUIT = { suit: 'male_worksuit01', suitTint: 0x8a9088, shoes: 'shoes06', shoeTint: 0x8a8070 };
const C9_SUIT_F = { suit: 'female_casualsuit01', suitTint: 0x8a9088, shoes: 'shoes03', shoeTint: 0x8a8070 };

export const CH1_CISTERN: NpcDef[] = [
  { id: 'npc_c9_01', name: 'Elder Ines Halloran', look: { seed: 1101, frame: 'narrow', age: 66, over: { hair: { style: 'elvs_unkempt_french_braid', color: 0xb8b6ae } } }, outfit: C9_SUIT_F, level: 3, team: 'cistern9', faction: 'cistern9', courage: 35, dialogue: 'd_c9_ines' },
  { id: 'npc_c9_02', name: 'Doc Aurel Pell', look: { seed: 1102, frame: 'broad', age: 58, over: { facialHair: 'short_beard', hair: { style: 'cut_sidepart', color: 0x8a8782 } } }, outfit: C9_SUIT, level: 3, team: 'cistern9', faction: 'cistern9', courage: 40, dialogue: 'd_c9_pell' },
  { id: 'npc_c9_03', name: 'Tamsin Roe', look: { seed: 1103, frame: 'narrow', age: 24, over: { hair: { style: 'cut_pixie', color: 0x7a3418 }, freckles: 0.5 } }, outfit: C9_SUIT_F, level: 2, team: 'cistern9', faction: 'cistern9', courage: 80, dialogue: 'd_c9_tamsin', attrs: { reflex: 6, brawn: 5 }, skills: { melee: 20 } },
  { id: 'npc_c9_04', name: 'Bram Coyle', look: { seed: 1104, frame: 'broad', age: 41, over: { facialHair: 'stubble_heavy', hair: { style: 'paint_buzz', color: 0x2b1d14 } } }, outfit: C9_SUIT, level: 3, team: 'cistern9', faction: 'cistern9', courage: 30, dialogue: 'd_c9_bram' },
];
