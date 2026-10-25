import type { MapDef } from '../engine/data/types';
import { registerRules } from '../engine/stats/sheet';
import { registerItems } from '../engine/inventory/items';
import { ITEMS } from './items';
import { PERKS } from './rules/perks';
import { TRAITS } from './rules/traits';
import { ORIGINS } from './rules/origins';
import type { NpcDef } from '../engine/npc/defs';
import { DEV_NPCS } from './npcs/dev_enemies';
import { dev_bunker } from './maps/dev_bunker';
import { dev_yard } from './maps/dev_yard';

/** Content registry: the engine looks everything up through here. */
export const MAPS: Record<string, MapDef> = {
  dev_yard,
  dev_bunker,
};

export const NPCS: Record<string, NpcDef> = Object.fromEntries([...DEV_NPCS].map((n) => [n.id, n]));

export { TRAITS, PERKS, ITEMS, ORIGINS };
registerRules({ traits: TRAITS, perks: PERKS });
registerItems(ITEMS);
