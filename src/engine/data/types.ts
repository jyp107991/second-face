import type { NpcPlacement } from '../npc/defs';

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
  | 'counter' | 'planter' | 'machine' | 'cot' | 'tent' | 'fence_post' | 'debris';

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
}
