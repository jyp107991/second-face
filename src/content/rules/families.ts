/**
 * Kin who share a surname. A surname belongs to one family (the naming bible, docs/DESIGN_UNITY.md §8.1): the validator
 * fails when two people carry the same surname, or one person's given name is another's surname, unless every one of
 * them is listed here under that surname. List a family only when the content or the story files establish the kinship.
 */
export const FAMILIES: Record<string, string[]> = {
  Ferrow: ['npc_kn_maud', 'npc_kn_linnet'],
  Rusk: ['npc_kn_rib_a', 'npc_kn_rib_b'],
  Reese: ['npc_sh_02', 'npc_sh_09'],
  Durrow: ['npc_sh_03', 'npc_sh_10'],
  Strand: ['npc_sh_16', 'npc_sh_17'],
  Marr: ['npc_dw_01', 'npc_dw_02', 'npc_dw_03', 'npc_dw_04', 'npc_dw_05'],
  // The Wheel's family: the caravan-mother, her son and the wheel-born trader.
  Oduya: ['npc_wh_01', 'npc_wh_02', 'npc_wh_04'],
  Mason: ['npc_of_01', 'npc_of_02', 'npc_of_04'],
  Lorne: ['npc_lr_09', 'npc_cr_06'],
  Vane: ['npc_cr_01', 'npc_cr_10'],
  'Ashby-Crane': ['npc_cr_02', 'npc_cr_04'],
};
