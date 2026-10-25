import type { Rng } from '../core/rng';
import { countItem, type Inventory } from '../inventory/inventory';
import type { SkillId } from './rules';
import { skill, type CharacterSheet } from './sheet';

/** Tools that boost a skill while carried. */
export const TOOL_BONUS: Partial<Record<SkillId, [string, number]>> = {
  locks: ['t_picks', 15],
  medicine: ['t_docbag', 15],
  mechanics: ['t_repair', 10],
};

export function effectiveSkill(s: CharacterSheet, inv: Inventory | undefined, k: SkillId): number {
  const t = TOOL_BONUS[k];
  return skill(s, k) + (t && inv && countItem(inv, t[0]) > 0 ? t[1] : 0);
}

export interface CheckResult { success: boolean; value: number; dc: number; chance: number; }

/**
 * World skill check (locks, repairs, terminals...). Meeting the DC always succeeds; falling short
 * leaves a shrinking chance, so near-misses are possible but long shots are not.
 */
export function skillCheck(s: CharacterSheet, inv: Inventory | undefined, k: SkillId, dc: number, rng: Rng): CheckResult {
  const value = effectiveSkill(s, inv, k);
  const chance = value >= dc ? 100 : Math.max(0, 35 - (dc - value) * 3);
  return { success: chance >= 100 || rng.next() * 100 < chance, value, dc, chance };
}
