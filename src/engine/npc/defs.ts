import type { Outfit } from '../assets/humanoid';
import type { RandomLookOptions } from '../data/appearance';
import type { OutfitRole } from '../data/outfits';
import type { MerchantDef } from '../inventory/barter';
import type { ScheduleEntry } from './schedule';
import type { WeaponDef } from '../inventory/items';
import type { AttributeId, SkillId } from '../stats/rules';
import type { Cond } from '../world/logic';

/**
 * NPC definition (content). Personality, memory, schedules and dialogue are added in M2;
 * this is the physical + combat core.
 */
export interface NpcDef {
  id: string;
  name: string;
  /** Appearance: a generator seed plus explicit overrides. */
  look: { seed: number; frame?: 'broad' | 'narrow'; age?: number; ancestry?: string; over?: RandomLookOptions['over'] };
  /** Who they are, for generated clothing, build and grime (data/outfits.ts). Default 'settler'. */
  role?: OutfitRole;
  /** Explicit outfit; generated from the role when absent. */
  outfit?: Outfit;
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
  /** Hostile while this holds (a camp that turns on you once a flag is set). */
  hostileIf?: Cond;
  /** Fights on your side in encounters on their map while this holds (a town's militia on the day). */
  ally?: Cond;
  /** 0..100 */
  courage?: number;
  /** Creature attack when unarmed. */
  natural?: WeaponDef;
  /** Leader of their team (morale hit when they fall). */
  leader?: boolean;
  /** Dialogue tree id (talk on tap when not hostile). */
  dialogue?: string;
  /** Faction id for reputation effects. */
  faction?: string;
  /** Sells and buys (opens the barter screen from dialogue or directly). */
  merchant?: MerchantDef;
  /** Daily routine (spots on the map they are placed on). */
  schedule?: ScheduleEntry[];
  /** Background person: not noted in the notebook, no sketch, generated rather than written. */
  minor?: boolean;
  /** Lines muttered when the player is near. */
  barks?: string[];
  /** Settlement whose standing sets their prices (defaults to the map's settlement). */
  settlement?: string;
}

/** Placement of an NPC on a map. */
export interface NpcPlacement {
  def: string;
  x: number;
  y: number;
  facing?: number;
  /** Instance id (defaults to def id; must be unique on the map). */
  id?: string;
  /** Present only while this holds (a prisoner until freed, visitors on a certain day). */
  if?: Cond;
  /** Conversation for this placement (the same person says different things in a different place). */
  dialogue?: string;
  /** Routine for this placement (empty = stays put; overrides the def's). */
  schedule?: ScheduleEntry[];
}
