import type { DialogueDef } from '../../engine/dialogue/dialogue';
import { d_dev_guide } from './dev';
import { d_sh_ada, d_sh_calla, d_sh_dov, d_sh_hollis, d_sh_issa, d_sh_jonah, d_sh_mags, d_sh_nell, d_sh_pardo, d_sh_pike, d_sh_pumps, d_sh_room, d_sh_ruth, d_sh_tracks, d_sh_yusra } from './shale';
import { d_rd_brindle, d_rd_cage, d_rd_chest, d_rd_gate, d_rd_jack, d_rd_kessler, d_rd_perpetua, d_rd_table, d_rd_tank, d_rd_teo, d_rd_vasha, d_rd_wren } from './overpass';
import { d_rd_truck, d_tribute } from './tribute';
import { d_map } from './decode';
import { d_th_bikes, d_th_caravan, d_th_clerk, d_th_debtor, d_th_fence, d_th_gate, d_th_ledger, d_th_outrider_a, d_th_outrider_b, d_th_quartermaster, d_th_rates, d_th_sergeant, d_th_terminal } from './tollhouse';
import { d_sg_camp, d_sg_cot, d_sg_gully, d_sg_mast, d_sg_relay, d_sg_speaker, d_sg_tally } from './signalhill';
import { d_sh_ilya } from './a1_shale';
import { d_re_axle, d_re_caravan, d_re_drifter, d_re_patrol, d_re_scouts, d_re_shakedown, d_re_walker, d_re_wheel } from './wilds';
import { d_wp_marit, d_wp_pump, d_wp_valvehouse } from './landmarks';
import { d_sp_hound, d_sp_truck } from './saltpan';
import { d_or_anselm, d_or_dun, d_or_leavings, d_or_petra, d_or_shrine, d_or_thieves, d_or_well } from './orchard';
import { EXTRA_DIALOGUES } from './extras';
import { WHEEL_DIALOGUES } from './wheel';
import { ACT1_SIDE_DIALOGUES } from './act1_sides';
import { NINEBRIDGE_DIALOGUES } from './ninebridge';
import { OPENFIELD_DIALOGUES } from './openfield';
import { d_dw_approach, d_dw_cato, d_dw_clerk, d_dw_console, d_dw_diary_table, d_dw_door, d_dw_juno, d_dw_oriel, d_dw_panel, d_dw_pumps, d_dw_sable, d_dw_valve, d_dw_wick } from './drywells';
import { d_c9_archive, d_c9_body, d_c9_bram, d_c9_great_door, d_c9_ines, d_c9_mother, d_c9_pell, d_c9_shaft, d_c9_tamsin, d_c9_teague } from './ch1_cistern';

export const DIALOGUES: Record<string, DialogueDef> = Object.fromEntries([
  d_dev_guide, d_c9_pell, d_c9_ines, d_c9_tamsin, d_c9_bram, d_c9_mother, d_c9_teague, d_c9_shaft, d_c9_archive, d_c9_body, d_c9_great_door,
  d_sh_mags, d_sh_room, d_sh_pumps, d_sh_nell, d_sh_ada, d_sh_jonah, d_sh_issa, d_sh_pike, d_sh_calla, d_sh_hollis, d_sh_yusra, d_sh_dov, d_sh_pardo, d_sh_ruth, d_sh_tracks,
  d_rd_gate, d_rd_brindle, d_rd_kessler, d_rd_vasha, d_rd_wren, d_rd_teo, d_rd_cage, d_rd_table, d_rd_perpetua, d_rd_jack, d_rd_tank, d_rd_chest, d_tribute, d_rd_truck, d_map,
  d_th_gate, d_th_sergeant, d_th_clerk, d_th_ledger, d_th_terminal, d_th_fence, d_th_rates, d_th_bikes, d_th_outrider_a, d_th_outrider_b, d_th_quartermaster, d_th_debtor, d_th_caravan,
  d_sg_camp, d_sg_gully, d_sg_tally, d_sg_relay, d_sg_speaker, d_sg_mast, d_sg_cot, d_sh_ilya,
  d_dw_approach, d_dw_sable, d_dw_oriel, d_dw_juno, d_dw_cato, d_dw_wick, d_dw_door, d_dw_console, d_dw_panel, d_dw_valve, d_dw_pumps, d_dw_diary_table, d_dw_clerk,
  d_re_patrol, d_re_drifter, d_re_scouts, d_re_wheel, d_re_walker, d_re_caravan, d_re_axle, d_re_shakedown, d_wp_marit, d_wp_pump, d_wp_valvehouse,
  d_sp_hound, d_sp_truck, d_or_anselm, d_or_petra, d_or_dun, d_or_shrine, d_or_well, d_or_leavings, d_or_thieves,
  ...EXTRA_DIALOGUES, ...WHEEL_DIALOGUES, ...ACT1_SIDE_DIALOGUES, ...NINEBRIDGE_DIALOGUES, ...OPENFIELD_DIALOGUES,
].map((d) => [d.id, d]));
