import type { Rng } from '../core/rng';
import type { CharacterSheet } from '../stats/sheet';
import { skill } from '../stats/sheet';

/**
 * Hunting and trapping at camp (DESIGN §2f). Game is thin in the Sallow and thicker elsewhere; a map says how much
 * with `hunting` (0..1). A hunt is hours spent and a Survival threshold; traps are parts left behind that yield over
 * days, collected the next time you camp on the same map. Nothing here is a deadline: traps wait.
 */

export interface HuntOutcome { hours: number; meat: number; hides: number; text: string }

/** A hunt: fixed thresholds like every other check, scaled by how much there is to find. */
export function hunt(sheet: CharacterSheet, abundance: number, rng: Rng, hourOfDay: number): HuntOutcome {
  const s = skill(sheet, 'survival');
  // Dawn and dusk are when things move.
  const good = (hourOfDay >= 5 && hourOfDay < 8) || (hourOfDay >= 17 && hourOfDay < 20);
  const dc = Math.round(45 - abundance * 30 - (good ? 10 : 0));
  if (s < dc) return { hours: 3, meat: 0, hides: 0, text: good ? 'Tracks, a shape at the edge of sight, nothing in the hand. Three hours.' : 'Nothing moves in the heat but you. Three hours, and the water you drank doing it.' };
  const margin = s - dc;
  const meat = 1 + (margin >= 20 ? 1 : 0) + (margin >= 40 && rng.next() < 0.5 ? 1 : 0);
  const hides = rng.next() < 0.3 + abundance * 0.3 ? 1 : 0;
  const text = meat >= 3 ? 'A good day: a hare run down in the rocks and a brace of something slower, dressed where they fell.' : meat === 2 ? 'Two kills, small and quick, and the sun on your neck while you dressed them.' : 'One, after a long stalk. Enough.';
  return { hours: 3, meat, hides, text };
}

export interface TrapLine { mapId: string; setAt: number; count: number }

/** What a trap line has caught since it was set: one piece of meat per trap per twelve hours, up to two per trap. */
export function trapYield(line: TrapLine, now: number, abundance: number, sheet: CharacterSheet): number {
  const hours = (now - line.setAt) / 60;
  if (hours < 8) return 0;
  const per = Math.min(2, Math.floor(hours / 12));
  const skillBonus = skill(sheet, 'survival') >= 40 ? 1 : 0.7;
  return Math.round(per * line.count * (0.4 + abundance * 0.6) * skillBonus);
}
