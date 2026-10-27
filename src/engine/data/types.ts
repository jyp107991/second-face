import type { NpcPlacement } from '../npc/defs';
import type { Cond, Effect } from '../world/logic';

/**
 * Content schemas. Everything under src/content is plain data typed by these interfaces;
 * the engine never needs to change to add content.
 */

export type FloorKind = 'sand' | 'dirt' | 'concrete' | 'metal' | 'wood' | 'grate' | 'asphalt' | 'rubble' | 'tile';
export type WallKind = 'concrete' | 'metal' | 'wood' | 'rock' | 'fence' | 'brick' | 'scrap';

export type PropKind =
  | 'crate' | 'barrel' | 'barrel_rust' | 'locker' | 'table' | 'chair' | 'bed' | 'terminal'
  | 'pipe_h' | 'lamp_post' | 'car_wreck' | 'rock' | 'rock_small' | 'tire_pile' | 'tank' | 'vault_door'
  | 'dead_tree' | 'sandbags' | 'shelf' | 'stove' | 'fire_barrel' | 'campfire' | 'cactus' | 'sign'
  | 'counter' | 'planter' | 'machine' | 'cot' | 'tent' | 'fence_post' | 'debris'
  | 'windpump' | 'hound_dormant';

export type Cover = 'none' | 'half' | 'full';

export interface TileDef {
  floor?: FloorKind;
  wall?: WallKind;
  /** Wall height in metres (default 2.6). Low walls (<1.2) act as half cover and don't block sight. */
  wallHeight?: number;
  prop?: PropKind;
  propRot?: number;
  /** Explicit override; otherwise derived from wall/prop. */
  blocks?: boolean;
  cover?: Cover;
  /** Tile has no floor at all (void / outside the playable area). */
  empty?: boolean;
}

export interface PropPlacement {
  kind: PropKind;
  x: number;
  y: number;
  /** Rotation in quarter turns or radians if `rad` is set. */
  rot?: number;
  rad?: boolean;
  scale?: number;
  /** Optional tint (hex). */
  tint?: number;
  /** Interactable id (container, door, terminal) referenced by scripts / content. */
  id?: string;
}

export interface LightDef {
  x: number;
  y: number;
  height?: number;
  color: number;
  intensity: number;
  range: number;
  flicker?: number;
}

export interface SpawnDef {
  id: string;
  x: number;
  y: number;
  facing?: number;
}

export interface ExitDef {
  x: number;
  y: number;
  w?: number;
  h?: number;
  to: { location: string; spawn: string } | { worldMap: true };
  label?: string;
  /** Usable only while this holds (a hatch you have opened, a gate you are allowed through). */
  if?: Cond;
  /** Applied when taken (flags such as "left home"). */
  effects?: Effect[];
}

/** Something that happens when the player steps on a tile: a message, flags, a quest beat, an ambush. */
export interface TriggerDef {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  if?: Cond;
  /** Fire only the first time (default true). */
  once?: boolean;
  text?: string;
  effects?: Effect[];
}

export interface AmbienceDef {
  indoor: boolean;
  fogColor: number;
  fogDensity: number;
  /** Dust particle density 0..1. */
  dust: number;
  /** Ambient light colour/intensity for indoor maps. */
  ambient?: { color: number; intensity: number };
  /** Colour grade strength 0..1 (sepia wash). */
  grade?: number;
  /** Ambient sound bed id. */
  sound?: string;
  /** The feel of the place: sets the grade and the sound bed unless overridden (bright, peaceful, bustling, haze, grim). */
  mood?: import('../world/weather').Mood;
}

export interface ContainerDef {
  name: string;
  items: [string, number][];
  tolls?: number;
  /** Lock difficulty (Locks skill needed); absent = unlocked. */
  lock?: number;
}

export interface MapDef {
  id: string;
  name: string;
  /** Rows of characters; row 0 is the north edge. Each char is looked up in `legend`. */
  layout: string[];
  legend: Record<string, TileDef>;
  props?: PropPlacement[];
  lights?: LightDef[];
  spawns: SpawnDef[];
  exits?: ExitDef[];
  ambience: AmbienceDef;
  npcs?: NpcPlacement[];
  /** Container contents keyed by prop `id`. */
  containers?: Record<string, ContainerDef>;
  /** Seed for procedural detail (scatter, texture variation). */
  seed?: number;
  /** Settlement this map belongs to (prices, standing, news). */
  settlement?: string;
  /** Named tiles for schedules and scripts (e.g. 'bar', 'bed_03'). */
  spots?: Record<string, { x: number; y: number }>;
  triggers?: TriggerDef[];
  /** Props (by id) that open a conversation when used: terminals, a sealed door, a body to examine. */
  talk?: Record<string, { dialogue: string; name: string }>;
  /** Under a roof or under the ground: the field map opens but you cannot set out from here. */
  interior?: boolean;
  /** How much game there is to hunt or trap at camp (0..1); none when absent. */
  hunting?: number;
  /** Background people generated on load: how many of what kind, where they wander, when they are about. */
  extras?: import('../npc/extras').ExtrasDef[];
}
