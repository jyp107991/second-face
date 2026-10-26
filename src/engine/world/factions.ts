import type { GameState } from '../core/state';
import { dayOf } from '../core/state';
import type { Modifier } from '../stats/sheet';
import type { Cond } from './logic';

/**
 * Faction membership (DESIGN §2d): a door you walked through, as opposed to reputation (what people think).
 * Content defines factions with ordered ranks; each rank carries perks that accumulate up the ladder.
 * Joining a faction that conflicts with one you belong to expels you from the old one — unless you join
 * under cover for it. Pure data + helpers; dialogue reaches this through logic.ts conditions/effects.
 */

export interface RankDef {
  id: string;
  title: string;
  /** Modifiers while holding this rank or higher. */
  mods?: Modifier[];
  /** Verb flags while holding this rank or higher (checked with hasFlag). */
  flags?: string[];
  /** Price multiplier with the faction's merchants at this rank (0.9 = 10% off). Lowest held wins. */
  priceMul?: number;
  /** Door / district / service ids this rank may pass. */
  access?: string[];
  /** What it takes to be promoted to this rank (a hint for the notebook; content does the promoting). */
  requires?: Cond;
}

export interface FactionDef {
  id: string;
  name: string;
  desc: string;
  /** Settlement or location id of the home base. */
  home?: string;
  ranks: RankDef[];
  /** Factions you cannot openly belong to at the same time. */
  conflicts?: string[];
  /** Quest that serves as the initiation (validated once quests exist). */
  initiation?: string;
  /** Gangs are joinable one at a time within their "turf" group. */
  group?: string;
}

export type MembershipStatus = 'member' | 'expelled' | 'left';

export interface Membership {
  rank: string;
  /** Day joined. */
  since: number;
  status: MembershipStatus;
  /** Faction you really serve, when this membership is a cover. */
  cover?: string;
}

let registry: Record<string, FactionDef> = {};
export function registerFactions(defs: Record<string, FactionDef>): void { registry = defs; }
export function factionDefs(): Record<string, FactionDef> { return registry; }

export function rankIndex(def: FactionDef, rank: string): number {
  return def.ranks.findIndex((r) => r.id === rank);
}

/** Current membership, if it is live. */
export function membership(g: GameState, faction: string): Membership | undefined {
  const m = g.world.membership[faction];
  return m && m.status === 'member' ? m : undefined;
}

/** Member at `minRank` or higher (any rank when omitted). */
export function isMember(g: GameState, defs: Record<string, FactionDef>, faction: string, minRank?: string): boolean {
  const m = membership(g, faction), def = defs[faction];
  if (!m || !def) return false;
  if (!minRank) return true;
  return rankIndex(def, m.rank) >= rankIndex(def, minRank);
}

/**
 * Join a faction at a rank (default: the first). Open memberships of conflicting factions (either direction,
 * or the same gang group) are expelled unless this is a cover for one of them. Returns the expelled ids.
 */
export function enlist(g: GameState, defs: Record<string, FactionDef>, faction: string, opts: { rank?: string; cover?: string } = {}): string[] {
  const def = defs[faction];
  if (!def) throw new Error(`Unknown faction ${faction}`);
  const rank = opts.rank ?? def.ranks[0].id;
  if (rankIndex(def, rank) < 0) throw new Error(`Faction ${faction}: unknown rank ${rank}`);
  const expelled: string[] = [];
  if (!opts.cover) {
    for (const [other, m] of Object.entries(g.world.membership)) {
      if (other === faction || m.status !== 'member') continue;
      const od = defs[other];
      const clash = (def.conflicts ?? []).includes(other) || (od?.conflicts ?? []).includes(faction) || (!!def.group && od?.group === def.group);
      if (clash) { m.status = 'expelled'; expelled.push(other); }
    }
  }
  const old = g.world.membership[faction];
  g.world.membership[faction] = { rank, since: dayOf(g.minutes), status: 'member', cover: opts.cover, ...(old?.status === 'member' ? { since: old.since } : {}) };
  return expelled;
}

/** Move to another rank (up or down). */
export function setRank(g: GameState, defs: Record<string, FactionDef>, faction: string, rank: string): void {
  const def = defs[faction], m = membership(g, faction);
  if (!def || rankIndex(def, rank) < 0) throw new Error(`Faction ${faction}: unknown rank ${rank}`);
  if (!m) throw new Error(`Not a member of ${faction}`);
  m.rank = rank;
}

export function expel(g: GameState, faction: string, status: MembershipStatus = 'expelled'): boolean {
  const m = membership(g, faction);
  if (!m) return false;
  m.status = status;
  return true;
}

/** Ranks held: the member's rank and every rank below it. */
function heldRanks(g: GameState, defs: Record<string, FactionDef>): RankDef[] {
  const out: RankDef[] = [];
  for (const [id, m] of Object.entries(g.world.membership)) {
    const def = defs[id];
    if (!def || m.status !== 'member' || m.cover) continue;
    const i = rankIndex(def, m.rank);
    if (i >= 0) out.push(...def.ranks.slice(0, i + 1));
  }
  return out;
}

/** Modifiers and flags from all live, non-cover memberships (sync into the sheet after any change). */
export function membershipPerks(g: GameState, defs: Record<string, FactionDef>): { mods: Modifier[]; flags: string[] } {
  const ranks = heldRanks(g, defs);
  return { mods: ranks.flatMap((r) => r.mods ?? []), flags: [...new Set(ranks.flatMap((r) => r.flags ?? []))] };
}

/** Best price multiplier with a faction's merchants (1 when not a member). Cover memberships count: you look like one of them. */
export function factionPriceMul(g: GameState, defs: Record<string, FactionDef>, faction: string): number {
  const m = membership(g, faction), def = defs[faction];
  if (!m || !def) return 1;
  const held = def.ranks.slice(0, rankIndex(def, m.rank) + 1);
  return Math.min(1, ...held.map((r) => r.priceMul ?? 1));
}

/** May the player pass this door/district/service id by virtue of any membership (covers count)? */
export function hasAccess(g: GameState, defs: Record<string, FactionDef>, accessId: string): boolean {
  for (const [id, m] of Object.entries(g.world.membership)) {
    const def = defs[id];
    if (!def || m.status !== 'member') continue;
    const held = def.ranks.slice(0, rankIndex(def, m.rank) + 1);
    if (held.some((r) => r.access?.includes(accessId))) return true;
  }
  return false;
}

/** Write membership perks into the sheet so stats/flags see them (call after enlist/setRank/expel). */
export function syncMembership(g: GameState, defs: Record<string, FactionDef>): void {
  const { mods, flags } = membershipPerks(g, defs);
  g.pc.sheet.factionMods = mods;
  g.pc.sheet.factionFlags = flags;
}
