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
  // West Halt's watch captain and her brother (B5a)
  Ortega: ['npc_rc_02', 'npc_rc_12'],
  // the Drowned Shore (B5b): the dive master and her daughter; a man and his wife; Hum's keeper and his daughter
  Coker: ['npc_ds_03', 'npc_ds_14'],
  Ibarra: ['npc_ds_05', 'npc_ds_06'],
  Farouk: ['npc_ds_10', 'npc_ds_11'],
  // Carrick, Meridian's docks (B5b): the Hulls' speaker and his granddaughter
  Ofori: ['npc_dk_07', 'npc_dk_08'],
  // the Teeth mines and the Northern Wet (B5c): a mother and her son; the dam's keeper and her granddaughter; the Ridge's
  // foreman and his daughter; the Bottoms' foreman and his daughter
  Nnadi: ['npc_tm_06', 'npc_tm_07'],
  Wexford: ['npc_nw_01', 'npc_nw_02'],
  Brandvold: ['npc_nw_06', 'npc_nw_07'],
  Huaman: ['npc_nw_09', 'npc_nw_10'],
  // the Ashlands (B5d): Spindle's weigher and her grandson
  Kwarteng: ['npc_an_01', 'npc_an_02'],
};
