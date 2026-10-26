import type { GameState } from '../core/state';
import { dayOf } from '../core/state';
import { apply, test, type Cond, type Effect, type LogicHost } from './logic';

/**
 * Frontier systems: news that travels with people, leads → conclusions, and scheduled world events.
 * Content supplies the road graph, lead/conclusion definitions and event definitions.
 */

// --------------------------------------------------------------------------------------------
// News & local reputation
// --------------------------------------------------------------------------------------------

export interface SettlementDef { id: string; name: string; /** Neighbours and travel days along the road. */ roads: Record<string, number>; /** 0..1 how fast gossip moves (caravan traffic). */ traffic: number }

export interface NewsItem {
  id: string;
  /** What happened (content tag, e.g. 'saved_deputy'). */
  tag: string;
  /** How people tell it; '{who}' becomes 'you' or 'a masked stranger'. */
  text?: string;
  /** Who it is about: the player by face, or an unrecognised masked stranger. */
  about: 'player' | 'masked';
  /** -100..100 how it reflects on them. */
  valence: number;
  /** 1..10 how big a story it is (spreads further and lasts longer). */
  size: number;
  origin: string;
  day: number;
  /** Settlement → day heard and how distorted the telling is (0 = accurate). */
  heard: Record<string, { day: number; distortion: number }>;
}

export function addNews(g: GameState, n: Omit<NewsItem, 'heard' | 'day' | 'id'> & { id?: string }): NewsItem {
  const day = dayOf(g.minutes);
  const item: NewsItem = { id: n.id ?? `${n.tag}@${n.origin}#${g.world.news.length}`, day, heard: { [n.origin]: { day, distortion: 0 } }, ...n };
  g.world.news.push(item);
  return item;
}

/**
 * Advance gossip to `day`. A story reaches a neighbour after the road's travel days, if the road carries it
 * (traffic × size); each retelling distorts it a little. Deterministic per news id (hash), so saves replay.
 */
export function spreadNews(g: GameState, roads: Record<string, SettlementDef>, day = dayOf(g.minutes)): void {
  for (const n of g.world.news) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [from, h] of Object.entries(n.heard)) {
        const s = roads[from];
        if (!s) continue;
        for (const [to, days] of Object.entries(s.roads)) {
          if (n.heard[to]) continue;
          const arrive = h.day + Math.ceil(days / Math.max(0.2, s.traffic));
          if (arrive > day) continue;
          const reach = s.traffic * (0.4 + n.size / 10);
          if (hash(n.id + to) > reach) continue;
          n.heard[to] = { day: arrive, distortion: Math.min(1, h.distortion + 0.15 + 0.1 * hash(n.id + to + 'd')) };
          changed = true;
        }
      }
    }
  }
}

/** What a settlement thinks of the player (-100..100) from news it has heard, fading with time. */
export function standing(g: GameState, settlement: string): number {
  const day = dayOf(g.minutes);
  let v = 0;
  for (const n of g.world.news) {
    const h = n.heard[settlement];
    if (!h || n.about !== 'player') continue;
    const age = Math.max(0, day - h.day);
    const fade = Math.max(0.25, 1 - age / (20 + n.size * 6));
    // Distorted stories exaggerate: bad news gets worse, good news less believed.
    const told = n.valence * (n.valence < 0 ? 1 + h.distortion * 0.5 : 1 - h.distortion * 0.4);
    v += told * (n.size / 10) * fade;
  }
  return Math.max(-100, Math.min(100, Math.round(v)));
}

export function heard(g: GameState, settlement: string, tag: string): boolean {
  return g.world.news.some((n) => n.tag === tag && !!n.heard[settlement]);
}

// --------------------------------------------------------------------------------------------
// Leads & conclusions
// --------------------------------------------------------------------------------------------

export interface LeadDef { id: string; text: string; /** Short label for the board. */ label: string }
export interface ConclusionDef { id: string; text: string; /** Leads that together support it (all required). */ from: string[]; effects?: Effect[] }

/** Try to link the selected leads. Returns the conclusion formed, or null (costs a little time either way). */
export function tryConclude(g: GameState, selected: string[], conclusions: Record<string, ConclusionDef>, host: LogicHost = {}): ConclusionDef | null {
  g.minutes += 10;
  const have = new Set(selected.filter((l) => g.world.leads[l]));
  for (const c of Object.values(conclusions)) {
    if (g.world.conclusions[c.id]) continue;
    if (c.from.length === have.size && c.from.every((l) => have.has(l))) {
      g.world.conclusions[c.id] = true;
      g.world.knowledge[c.id] = true;
      apply(c.effects, g, host);
      return c;
    }
  }
  return null;
}

// --------------------------------------------------------------------------------------------
// Scheduled world events
// --------------------------------------------------------------------------------------------

export interface WorldEventDef {
  id: string;
  /** Game minute at which it happens (absolute), or a day number at an hour. */
  at: { day: number; hour?: number };
  /** Only scheduled once this holds (e.g. a quest has started). */
  armedIf?: Cond;
  /** If this holds when the time comes, the event is prevented. */
  preventedIf?: Cond;
  effects: Effect[];
  preventedEffects?: Effect[];
}

/** Resolve due events. Each resolves once: world.events[id] = 'happened' | 'prevented'. */
export function runWorldEvents(g: GameState, events: Record<string, WorldEventDef>, host: LogicHost = {}): string[] {
  const fired: string[] = [];
  for (const e of Object.values(events)) {
    if (g.world.events[e.id]) continue;
    if (e.armedIf && !test(e.armedIf, g)) continue;
    const due = (e.at.day - 1) * 1440 + (e.at.hour ?? 0) * 60;
    if (g.minutes < due) continue;
    const prevented = !!e.preventedIf && test(e.preventedIf, g);
    g.world.events[e.id] = prevented ? 'prevented' : 'happened';
    apply(prevented ? e.preventedEffects : e.effects, g, host);
    fired.push(e.id);
  }
  return fired;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
