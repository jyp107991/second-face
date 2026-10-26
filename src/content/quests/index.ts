import type { QuestDef } from '../../engine/quest/quest';
import { q_dev_picks } from './dev';
import { q_ch1_door } from './ch1';

export const QUESTS: Record<string, QuestDef> = Object.fromEntries([q_dev_picks, q_ch1_door].map((q) => [q.id, q]));
