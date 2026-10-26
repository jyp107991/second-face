import type { WorldEventDef } from '../../engine/world/frontier';

/** Scheduled world events (resolve once, whether or not the player is there). */
export const WORLD_EVENTS: Record<string, WorldEventDef> = {};
