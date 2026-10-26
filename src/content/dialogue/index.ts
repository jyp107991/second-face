import type { DialogueDef } from '../../engine/dialogue/dialogue';
import { d_dev_guide } from './dev';
import { d_c9_bram, d_c9_ines, d_c9_pell, d_c9_tamsin } from './ch1_cistern';

export const DIALOGUES: Record<string, DialogueDef> = Object.fromEntries([d_dev_guide, d_c9_pell, d_c9_ines, d_c9_tamsin, d_c9_bram].map((d) => [d.id, d]));
