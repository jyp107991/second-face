import { newGameState } from '../core/state';
import type { QuestDef } from '../quest/quest';
import { emptySheet, raiseSkill, skill } from '../stats/sheet';
import { SKILL_MAX, type AttributeId, type SkillId } from '../stats/rules';
import { derived } from '../stats/sheet';
import { test } from '../world/logic';

export interface CoverageBuild { id: string; attrs: Record<AttributeId, number>; tagged: SkillId[]; also: SkillId[] }

/** Sheet for a build at a level: skill points go to tagged skills (round-robin) then the secondary list. */
export function projectBuild(b: CoverageBuild, level: number) {
  const s = emptySheet(b.id);
  s.baseAttrs = { ...b.attrs };
  s.tagged = [...b.tagged];
  s.level = level;
  s.unspentSkill = (level - 1) * derived(s).skillPointsPerLevel;
  // Round-robin: tagged skills up to the cap, then the secondary list up to 60.
  const tiers: [SkillId[], number][] = [[b.tagged, SKILL_MAX], [b.also, 60]];
  for (const [list, cap] of tiers) {
    let progressed = true;
    while (s.unspentSkill > 0 && progressed) {
      progressed = false;
      for (const k of list) if (s.unspentSkill > 0 && skill(s, k) < cap && raiseSkill(s, k)) progressed = true;
    }
  }
  return s;
}

/**
 * Every reference build must have at least one route through each critical-path quest at that act's level.
 * Routes without requirements count for everyone. Returns human-readable problems.
 */
export function checkCoverage(quests: Record<string, QuestDef>, builds: CoverageBuild[], levels: Record<string, number>): string[] {
  const errs: string[] = [];
  for (const q of Object.values(quests)) {
    if (!q.critical) continue;
    if (!q.routes?.length) { errs.push(`quest ${q.id}: critical-path quest has no routes declared`); continue; }
    for (const b of builds) {
      const g = newGameState('coverage', 0, 0);
      g.pc.sheet = projectBuild(b, levels[q.act] ?? 1);
      if (!q.routes.some((r) => test(r.requires, g))) errs.push(`quest ${q.id}: build "${b.id}" has no route at act ${q.act}`);
    }
  }
  return errs;
}
