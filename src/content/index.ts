import type { MapDef } from '../engine/data/types';
import { registerRules } from '../engine/stats/sheet';
import { registerChrome } from '../engine/stats/chrome';
import { CHROME } from './chrome/catalogue';
import { registerItems } from '../engine/inventory/items';
import { ITEMS } from './items';
import { PERKS } from './rules/perks';
import { TRAITS } from './rules/traits';
import { ORIGINS } from './rules/origins';
import type { NpcDef } from '../engine/npc/defs';
import { DEV_NPCS } from './npcs/dev_enemies';
import { CH1_CISTERN } from './npcs/ch1_cistern';
import { dev_bunker } from './maps/dev_bunker';
import { dev_yard } from './maps/dev_yard';
import { DIALOGUES } from './dialogue';
import { QUESTS } from './quests';
import { SETTLEMENTS } from './world/settlements';
import { CONCLUSIONS, LEADS } from './world/leads';
import { WORLD_EVENTS } from './world/events';

/** Content registry: the engine looks everything up through here. */
export const MAPS: Record<string, MapDef> = {
  dev_yard,
  dev_bunker,
};

export const NPCS: Record<string, NpcDef> = Object.fromEntries([...DEV_NPCS, ...CH1_CISTERN].map((n) => [n.id, n]));

export { TRAITS, PERKS, CHROME, ITEMS, ORIGINS, DIALOGUES, QUESTS, SETTLEMENTS, LEADS, CONCLUSIONS, WORLD_EVENTS };
registerRules({ traits: TRAITS, perks: PERKS });
registerChrome(CHROME);
registerItems(ITEMS);
