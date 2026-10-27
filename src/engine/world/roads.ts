import type { GameState } from '../core/state';
import type { Rng } from '../core/rng';
import type { NpcPlacement } from '../npc/defs';
import { skill } from '../stats/sheet';
import { test, type Cond, type Effect } from './logic';
import type { Terrain, TripLeg, WorldMap } from './travel';

/**
 * The road between places: things that happen on it (authored encounters picked by where you are and what you
 * have done) and things you notice from it (hidden landmarks near the way, found with Survival).
 * Encounters interrupt a trip on a small roadside map; the trip continues when you leave it.
 */

export interface RoadEncounterDef {
  id: string;
  /** World-map regions it can happen in (any when omitted). */
  regions?: string[];
  /** Terrains it can happen on (any when omitted). */
  terrain?: Terrain[];
  /** Hours of the day it can happen (wraps past midnight). */
  hours?: { from: number; to: number };
  if?: Cond;
  /** Relative chance against the others that qualify. */
  weight: number;
  /** Happens once per game. */
  once?: boolean;
  /** The roadside map it plays on; without one it is a passing thing: text and effects, no stop. */
  map?: string;
  /** Who is there (spots are named on the roadside map). */
  npcs?: { def: string; spot: string; id?: string; facing?: number; dialogue?: string }[];
  /** Opened on arrival. */
  dialogue?: string;
  /** For a passing thing: what you see. */
  text?: string;
  effects?: Effect[];
}

/** A trip paused by an encounter: where it was going, and how long is left. */
export interface PendingTrip { to: string; from: string; hoursLeft: number; map: string; encounter: string; npcs: NpcPlacement[] }

function hourOk(h: { from: number; to: number } | undefined, minutes: number): boolean {
  if (!h) return true;
  const hour = (minutes / 60) % 24;
  return h.from <= h.to ? hour >= h.from && hour < h.to : hour >= h.from || hour < h.to;
}

function regionOf(m: WorldMap, id: string): string | undefined { return m.locations[id]?.region; }

function terrainOf(m: WorldMap, leg: TripLeg): Terrain | undefined {
  return m.routes.find((r) => (r.a === leg.from && r.b === leg.to) || (r.a === leg.to && r.b === leg.from))?.terrain;
}

/** The encounters that could happen on this leg right now. */
export function eligibleEncounters(g: GameState, m: WorldMap, leg: TripLeg, defs: Record<string, RoadEncounterDef>): RoadEncounterDef[] {
  const regions = new Set([regionOf(m, leg.from), regionOf(m, leg.to)].filter((r): r is string => !!r));
  const terrain = terrainOf(m, leg);
  const seen = g.world.roadSeen ?? {};
  return Object.values(defs).filter((e) =>
    (!e.regions || e.regions.some((r) => regions.has(r))) &&
    (!e.terrain || (terrain !== undefined && e.terrain.includes(terrain))) &&
    hourOk(e.hours, g.minutes) &&
    (!e.once || !seen[e.id]) &&
    (!e.if || test(e.if, g)));
}

/** Roll the leg: nothing, or one encounter, weighted. */
export function rollEncounter(g: GameState, m: WorldMap, leg: TripLeg, defs: Record<string, RoadEncounterDef>, rng: Rng): RoadEncounterDef | undefined {
  if (rng.next() >= leg.risk) return undefined;
  const pool = eligibleEncounters(g, m, leg, defs);
  const total = pool.reduce((t, e) => t + e.weight, 0);
  if (total <= 0) return undefined;
  let r = rng.next() * total;
  for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
  return pool[pool.length - 1];
}

/** km from a point to the segment a–b. */
function segmentKm(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export interface Discovery { id: string; name: string; km: number }

/**
 * Hidden places near the way that a traveller on foot can make out: within reach, and with the Survival to read the
 * land (a fixed threshold that rises with distance, like every other check: ~45 finds things ten km off, ~70 twenty).
 * Anything within a few km is plain.
 */
export function discoveriesOnLeg(g: GameState, m: WorldMap, leg: TripLeg, known: (id: string) => boolean, reachKm = 20): Discovery[] {
  const a = m.locations[leg.from], b = m.locations[leg.to];
  if (!a || !b || typeof leg.by !== 'string') return [];
  const survival = skill(g.pc.sheet, 'survival');
  const out: Discovery[] = [];
  for (const loc of Object.values(m.locations)) {
    if (!loc.hidden || known(loc.id) || loc.id === leg.from || loc.id === leg.to) continue;
    const km = segmentKm(loc.x, loc.y, a.x, a.y, b.x, b.y);
    if (km > reachKm) continue;
    const dc = km <= 3 ? 0 : 15 + Math.round(km * 3);
    if (survival >= dc) out.push({ id: loc.id, name: loc.name, km: Math.round(km) });
  }
  return out;
}
