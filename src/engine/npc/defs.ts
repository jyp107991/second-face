import type { Outfit } from '../assets/humanoid';
import type { Appearance } from '../data/appearance';
import type { WeaponDef } from '../inventory/items';
import type { AttributeId, SkillId } from '../stats/rules';

/**
 * NPC definition (content). Personality, memory, schedules and dialogue are added in M2;
 * this is the physical + combat core.
 */
export interface NpcDef {
  id: string;
  name: string;
  /** Appearance: a generator seed plus explicit overrides. */
  look: { seed: number; frame?: 'broad' | 'narrow'; over?: Partial<Appearance> };
  outfit: Outfit;
  level: number;
  attrs?: Partial<Record<AttributeId, number>>;
  /** Percentage points added on top of attribute-derived skill bases. */
  skills?: Partial<Record<SkillId, number>>;
  tagged?: SkillId[];
  traits?: string[];
  perks?: Record<string, number>;
  inventory?: [string, number][];
  /** Item ids to equip (weapon → primary, then secondary; armour to its slot). */
  equip?: string[];
  tolls?: number;
  /** Combat side. Same team = allies. 'player' is the player's side. */
  team: string;
  hostile?: boolean;
  /** 0..100 */
  courage?: number;
  /** Creature attack when unarmed. */
  natural?: WeaponDef;
  /** Leader of their team (morale hit when they fall). */
  leader?: boolean;
}

/** Placement of an NPC on a map. */
export interface NpcPlacement {
  def: string;
  x: number;
  y: number;
  facing?: number;
  /** Instance id (defaults to def id; must be unique on the map). */
  id?: string;
}
