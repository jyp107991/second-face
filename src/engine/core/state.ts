import { defaultAppearance, type Appearance } from '../data/appearance';
import { emptyInventory, type Inventory } from '../inventory/inventory';
import { emptySheet, type CharacterSheet } from '../stats/sheet';
import { emptyWorld, type WorldState } from '../world/world';
import type { CompanionSave } from '../npc/party';

export type Pronouns = 'he' | 'she' | 'they';

export interface NpcSave {
  dead?: boolean;
  hp?: number;
  x?: number;
  y?: number;
  hostile?: boolean;
  inventory?: Inventory;
}

export interface PlayerCharacter {
  sheet: CharacterSheet;
  appearance: Appearance;
  pronouns: Pronouns;
  inventory: Inventory;
}

/**
 * Serializable game state. Everything the save system writes lives here;
 * runtime objects (meshes, actors) are rebuilt from it.
 */
export interface GameState {
  locationId: string;
  player: { x: number; y: number; facing: number };
  pc: PlayerCharacter;
  /** Persistent per-NPC state keyed by `${locationId}/${npcId}`. */
  npcs: Record<string, NpcSave>;
  /** Opened containers' current contents keyed by `${locationId}/${containerId}`. */
  containers: Record<string, Inventory>;
  /** Game clock in minutes since day 1, 00:00. */
  minutes: number;
  flags: Record<string, number | string | boolean>;
  /** Quests, memories, relationships, reputation, knowledge, decisions, timers. */
  world: WorldState;
  /** Creation origin preset id (if any); content reacts to it. */
  origin?: string;
  /** Notebook sketches of people met (small JPEG data URLs). */
  sketches?: Record<string, string>;
  /** Companions' sheets and packs (kept across maps), keyed by NPC id. */
  companions?: Record<string, CompanionSave>;
  /** Merchants' stock, cash and recent sales, keyed by NPC id. */
  merchants?: Record<string, import('../inventory/barter').MerchantState>;
  rngState: number;
  playtimeSec: number;
}

export const START_MINUTES = 8 * 60; // Day 1, 08:00

export function newGameState(locationId: string, x: number, y: number, pc?: PlayerCharacter): GameState {
  return {
    locationId,
    player: { x, y, facing: 0 },
    pc: pc ?? { sheet: emptySheet(), appearance: defaultAppearance(), pronouns: 'they', inventory: emptyInventory() },
    npcs: {},
    containers: {},
    minutes: START_MINUTES,
    flags: {},
    world: emptyWorld(),
    rngState: (Math.random() * 2 ** 32) >>> 0,
    playtimeSec: 0,
  };
}

export function dayOf(minutes: number): number {
  return Math.floor(minutes / 1440) + 1;
}

export function hourOf(minutes: number): number {
  return (minutes % 1440) / 60;
}

export function clockString(minutes: number): string {
  const h = Math.floor(hourOf(minutes)), m = Math.floor(minutes % 60);
  return `Day ${dayOf(minutes)}  ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
