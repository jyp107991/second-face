import type { AttributeId, SkillId } from '../../engine/stats/rules';

/**
 * Reference builds (DESIGN §3.8). Content validation projects each to the expected level of every act and
 * requires at least one route through each critical-path quest.
 */
export interface ReferenceBuild { id: string; attrs: Record<AttributeId, number>; tagged: SkillId[]; /** Investment priority after tags. */ also: SkillId[] }

const A = (brawn: number, senses: number, grit: number, presence: number, wits: number, reflex: number, fortune: number) => ({ brawn, senses, grit, presence, wits, reflex, fortune });

export const REFERENCE_BUILDS: ReferenceBuild[] = [
  { id: 'gunslinger', attrs: A(4, 7, 4, 4, 4, 8, 2), tagged: ['firearms', 'stealth', 'security'], also: ['medicine'] },
  { id: 'bruiser', attrs: A(8, 4, 8, 3, 3, 5, 2), tagged: ['melee', 'explosives', 'survival'], also: ['speech'] },
  { id: 'silver_tongue', attrs: A(3, 5, 3, 8, 8, 4, 2), tagged: ['speech', 'barter', 'science'], also: ['medicine'] },
  { id: 'shadow', attrs: A(3, 6, 4, 4, 5, 8, 3), tagged: ['stealth', 'security', 'firearms'], also: ['speech'] },
  { id: 'technician', attrs: A(3, 5, 4, 3, 8, 6, 3), tagged: ['science', 'mechanics', 'arc'], also: ['security'] },
  { id: 'survivor_medic', attrs: A(4, 7, 8, 4, 5, 4, 1), tagged: ['survival', 'medicine', 'firearms'], also: ['speech'] },
  { id: 'leader', attrs: A(4, 4, 4, 8, 6, 5, 2), tagged: ['speech', 'barter', 'firearms'], also: ['medicine'] },
  { id: 'wildcard', attrs: A(4, 5, 4, 4, 5, 5, 8), tagged: ['explosives', 'barter', 'firearms'], also: ['stealth'] },
];

/** Expected character level at each act's critical-path quests. */
export const ACT_LEVEL = { ch1: 2, a1: 8, a2: 16, a3: 24 } as const;
