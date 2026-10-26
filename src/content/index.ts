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
import { SHALE_NPCS } from './npcs/shale';
import { RUSTDOG_NPCS } from './npcs/rustdogs';
import { dev_bunker } from './maps/dev_bunker';
import { dev_yard } from './maps/dev_yard';
import { bench_crowd } from './maps/bench_crowd';
import { cistern9 } from './maps/cistern9';
import { c9_mouth } from './maps/c9_mouth';
import { shale } from './maps/shale';
import { overpass } from './maps/overpass';
import { BENCH_NPCS } from './npcs/bench';
import { DIALOGUES } from './dialogue';
import { QUESTS } from './quests';
import { SETTLEMENTS } from './world/settlements';
import { CONCLUSIONS, LEADS } from './world/leads';
import { WORLD_EVENTS } from './world/events';
import { REGIONS } from './world/regions';
import { WORLD_MAP } from './world/map';
import { FACTIONS } from './factions';
import { LETTERS } from './world/letters';
import { registerFactions } from '../engine/world/factions';

/** Content registry: the engine looks everything up through here. */
export const MAPS: Record<string, MapDef> = {
  cistern9,
  c9_mouth,
  shale,
  overpass,
  dev_yard,
  dev_bunker,
  bench_crowd,
};

export const NPCS: Record<string, NpcDef> = Object.fromEntries([...DEV_NPCS, ...CH1_CISTERN, ...SHALE_NPCS, ...RUSTDOG_NPCS, ...BENCH_NPCS].map((n) => [n.id, n]));

export { LETTERS, FACTIONS, WORLD_MAP, REGIONS, TRAITS, PERKS, CHROME, ITEMS, ORIGINS, DIALOGUES, QUESTS, SETTLEMENTS, LEADS, CONCLUSIONS, WORLD_EVENTS };
registerRules({ traits: TRAITS, perks: PERKS });
registerChrome(CHROME);
registerFactions(FACTIONS);
registerItems(ITEMS);
