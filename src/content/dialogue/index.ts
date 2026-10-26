import type { DialogueDef } from '../../engine/dialogue/dialogue';
import { d_dev_guide } from './dev';

export const DIALOGUES: Record<string, DialogueDef> = Object.fromEntries([d_dev_guide].map((d) => [d.id, d]));
