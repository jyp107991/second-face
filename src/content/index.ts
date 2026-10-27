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
import { TOLLHOUSE_NPCS } from './npcs/tollhouse';
import { SIGNALHILL_NPCS } from './npcs/signalhill';
import { DRYWELLS_NPCS } from './npcs/drywells';
import { WILDS_NPCS } from './npcs/wilds';
import { LANDMARK_NPCS } from './npcs/landmarks';
import { ORCHARD_NPCS } from './npcs/orchard';
import { WHEEL_NPCS } from './npcs/wheel';
import { dev_bunker } from './maps/dev_bunker';
import { dev_yard } from './maps/dev_yard';
import { bench_crowd } from './maps/bench_crowd';
import { cistern9 } from './maps/cistern9';
import { c9_mouth } from './maps/c9_mouth';
import { shale } from './maps/shale';
import { overpass } from './maps/overpass';
import { tollhouse } from './maps/tollhouse';
import { signalhill } from './maps/signalhill';
import { drywells } from './maps/drywells';
import { wild_track } from './maps/wild_track';
import { wild_rough } from './maps/wild_rough';
import { windpumps } from './maps/windpumps';
import { saltpan } from './maps/saltpan';
import { orchard } from './maps/orchard';
import { wheel } from './maps/wheel';
import { ninebridge } from './maps/ninebridge';
import { NINEBRIDGE_NPCS } from './npcs/ninebridge';
import { openfield } from './maps/openfield';
import { OPENFIELD_NPCS } from './npcs/openfield';
import { sump } from './maps/sump';
import { cistern4 } from './maps/cistern4';
import { SUMP_NPCS } from './npcs/sump';
import { BENCH_NPCS } from './npcs/bench';
import { DIALOGUES } from './dialogue';
import { QUESTS } from './quests';
import { SETTLEMENTS } from './world/settlements';
import { CONCLUSIONS, LEADS } from './world/leads';
import { WORLD_EVENTS } from './world/events';
import { ROAD_ENCOUNTERS } from './world/encounters';
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
  bench_crowd, tollhouse, signalhill, drywells, wild_track, wild_rough, windpumps, saltpan, orchard, wheel, ninebridge, openfield, sump, cistern4,
};

export const NPCS: Record<string, NpcDef> = Object.fromEntries([...DEV_NPCS, ...CH1_CISTERN, ...SHALE_NPCS, ...RUSTDOG_NPCS, ...TOLLHOUSE_NPCS, ...SIGNALHILL_NPCS, ...DRYWELLS_NPCS, ...WILDS_NPCS, ...LANDMARK_NPCS, ...ORCHARD_NPCS, ...WHEEL_NPCS, ...NINEBRIDGE_NPCS, ...OPENFIELD_NPCS, ...SUMP_NPCS, ...BENCH_NPCS].map((n) => [n.id, n]));

export { LETTERS, FACTIONS, WORLD_MAP, REGIONS, TRAITS, PERKS, CHROME, ITEMS, ORIGINS, DIALOGUES, QUESTS, SETTLEMENTS, LEADS, CONCLUSIONS, WORLD_EVENTS, ROAD_ENCOUNTERS };
registerRules({ traits: TRAITS, perks: PERKS });
registerChrome(CHROME);
registerFactions(FACTIONS);
registerItems(ITEMS);
