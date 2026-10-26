import type { DialogueDef } from '../../engine/dialogue/dialogue';
import { d_dev_guide } from './dev';
import { d_sh_ada, d_sh_calla, d_sh_dov, d_sh_hollis, d_sh_issa, d_sh_jonah, d_sh_mags, d_sh_nell, d_sh_pardo, d_sh_pike, d_sh_pumps, d_sh_room, d_sh_ruth, d_sh_yusra } from './shale';
import { d_c9_archive, d_c9_body, d_c9_bram, d_c9_great_door, d_c9_ines, d_c9_mother, d_c9_pell, d_c9_shaft, d_c9_tamsin, d_c9_teague } from './ch1_cistern';

export const DIALOGUES: Record<string, DialogueDef> = Object.fromEntries([
  d_dev_guide, d_c9_pell, d_c9_ines, d_c9_tamsin, d_c9_bram, d_c9_mother, d_c9_teague, d_c9_shaft, d_c9_archive, d_c9_body, d_c9_great_door,
  d_sh_mags, d_sh_room, d_sh_pumps, d_sh_nell, d_sh_ada, d_sh_jonah, d_sh_issa, d_sh_pike, d_sh_calla, d_sh_hollis, d_sh_yusra, d_sh_dov, d_sh_pardo, d_sh_ruth,
].map((d) => [d.id, d]));
