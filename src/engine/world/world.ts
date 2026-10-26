/**
 * Narrative world state: everything dialogue and quests read and write. Lives inside GameState
 * (serialized with saves). Pure data + small helpers; no rendering.
 */

export interface Memory {
  /** What the NPC remembers (e.g. 'player_spared_raider'). */
  tag: string;
  /** -100..100: how they feel about it. */
  valence: number;
  /** 0..100: how vivid; gossip spreads strong memories and weakens them. */
  strength: number;
  day: number;
  source: 'witnessed' | 'told' | 'rumour';
}

export interface QuestState {
  stage: string;
  status: 'active' | 'done' | 'failed';
  startedAt: number;
  /** Journal lines, oldest first. */
  log: string[];
  /** Objectives already completed in the current stage. */
  done: string[];
}

export interface Timer {
  id: string;
  /** Game minute at which the effects fire. */
  at: number;
  effects: unknown[];
}

export interface Decision { id: string; text: string; minutes: number }

export interface WorldState {
  /** Last day the daily body tick ran (chrome upkeep, Drift). */
  bodyDay?: number;
  quests: Record<string, QuestState>;
  memories: Record<string, Memory[]>;
  /** Per NPC: trust and affection toward the player (-100..100). */
  relations: Record<string, { trust: number; affection: number }>;
  /** Companion approval (-100..100). */
  approval: Record<string, number>;
  /** Companions currently travelling with the player. */
  party: string[];
  /** Faction standing on two axes (0..100 each). */
  reputation: Record<string, { respect: number; fear: number }>;
  /** Things the player knows (unlock dialogue, lower check DCs). */
  knowledge: Record<string, true>;
  /** Dialogue options already chosen, by option id. */
  seen: Record<string, number>;
  decisions: Decision[];
  timers: Timer[];
  /** Stories about the player travelling between settlements (local reputation). */
  news: import('./frontier').NewsItem[];
  /** Clues collected for the leads board. */
  leads: Record<string, true>;
  conclusions: Record<string, true>;
  /** Scheduled world events that have resolved. */
  events: Record<string, 'happened' | 'prevented'>;
  /** Whether the player currently hides their face (news attaches to a masked stranger). */
  masked?: boolean;
  /** People the player has spoken with. */
  met?: Record<string, { name: string; day: number; where?: string }>;
}

export function emptyWorld(): WorldState {
  return { quests: {}, memories: {}, relations: {}, approval: {}, party: [], reputation: {}, knowledge: {}, seen: {}, decisions: [], timers: [], news: [], leads: {}, conclusions: {}, events: {} };
}

export function relation(w: WorldState, npc: string): { trust: number; affection: number } {
  return (w.relations[npc] ??= { trust: 0, affection: 0 });
}

export function rep(w: WorldState, faction: string): { respect: number; fear: number } {
  return (w.reputation[faction] ??= { respect: 0, fear: 0 });
}

export const clamp100 = (v: number, lo = -100) => Math.max(lo, Math.min(100, v));
