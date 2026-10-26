import type { QuestDef } from '../../engine/quest/quest';
import { q_dev_picks } from './dev';
import { q_ch1_door, q_ch1_map, q_ch1_name, q_ch1_shale, q_ch1_tribute, q_sh_prisoner } from './ch1';
import { q_a1_ledger, q_a1_tollhouse } from './a1';

export const QUESTS: Record<string, QuestDef> = Object.fromEntries([q_dev_picks, q_ch1_door, q_ch1_shale, q_ch1_map, q_sh_prisoner, q_ch1_tribute, q_ch1_name, q_a1_tollhouse, q_a1_ledger].map((q) => [q.id, q]));
