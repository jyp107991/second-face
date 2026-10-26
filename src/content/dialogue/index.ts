import type { DialogueDef } from '../../engine/dialogue/dialogue';
import { d_dev_guide } from './dev';
import { d_c9_archive, d_c9_body, d_c9_bram, d_c9_great_door, d_c9_ines, d_c9_mother, d_c9_pell, d_c9_shaft, d_c9_tamsin, d_c9_teague } from './ch1_cistern';

export const DIALOGUES: Record<string, DialogueDef> = Object.fromEntries([
  d_dev_guide, d_c9_pell, d_c9_ines, d_c9_tamsin, d_c9_bram, d_c9_mother, d_c9_teague, d_c9_shaft, d_c9_archive, d_c9_body, d_c9_great_door,
].map((d) => [d.id, d]));
