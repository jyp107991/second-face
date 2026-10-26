import type { QuestDef } from '../../engine/quest/quest';
import { q_dev_picks } from './dev';

export const QUESTS: Record<string, QuestDef> = Object.fromEntries([q_dev_picks].map((q) => [q.id, q]));
