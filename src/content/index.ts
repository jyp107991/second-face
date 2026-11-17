import type { MapDef } from '../engine/data/types';
import { registerRules } from '../engine/stats/sheet';
import { registerChrome } from '../engine/stats/chrome';
import { CHROME } from './chrome/catalogue';
import { registerItems } from '../engine/inventory/items';
import { ITEMS } from './items';
import { PERKS } from './rules/perks';
import { TRAITS } from './rules/traits';
import { ORIGINS } from './rules/origins';
import { FAMILIES } from './rules/families';
import type { NpcDef } from '../engine/npc/defs';
import { DEV_NPCS } from './npcs/dev_enemies';
import { CH1_CISTERN } from './npcs/ch1_cistern';
import { KNOCK } from './npcs/knock';
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
import { md_precinct } from './maps/md_precinct';
import { MERIDIAN_NPCS } from './npcs/meridian';
import { md_market } from './maps/md_market';
import { md_sink } from './maps/md_sink';
import { md_lantern } from './maps/md_lantern';
import { md_stacks } from './maps/md_stacks';
import { md_stacks_9 } from './maps/md_stacks_9';
import { md_stacks_roof } from './maps/md_stacks_roof';
import { md_bridgeward } from './maps/md_bridgeward';
import { md_crown } from './maps/md_crown';
import { md_spire } from './maps/md_spire';
import { md_spire_top } from './maps/md_spire_top';
import { md_vault } from './maps/md_vault';
import { md_ring } from './maps/md_ring';
import { hs_skirts } from './maps/hs_skirts';
import { hs_six } from './maps/hs_six';
import { hc_terrace } from './maps/hc_terrace';
import { hc_clinic } from './maps/hc_clinic';
import { hc_board } from './maps/hc_board';
import { hc_works } from './maps/hc_works';
import { HALCYON_NPCS } from './npcs/hc_halcyon';
import { rc_fourways } from './maps/rc_fourways';
import { rc_halt_w } from './maps/rc_halt_w';
import { rc_halt_e } from './maps/rc_halt_e';
import { rc_yard } from './maps/rc_yard';
import { rc_kettle } from './maps/rc_kettle';
import { CORRIDOR_NPCS } from './npcs/rc_corridor';
import { ds_stilts } from './maps/ds_stilts';
import { ds_rigs } from './maps/ds_rigs';
import { ds_rig_leg } from './maps/ds_rig_leg';
import { ds_terminal } from './maps/ds_terminal';
import { ds_wade } from './maps/ds_wade';
import { SHORE_NPCS } from './npcs/ds_shore';
import { md_docks } from './maps/md_docks';
import { DOCKS_NPCS } from './npcs/md_docks';
import { tm_pit } from './maps/tm_pit';
import { tm_level } from './maps/tm_level';
import { tm_trail } from './maps/tm_trail';
import { nw_sawtown } from './maps/nw_sawtown';
import { nw_dam } from './maps/nw_dam';
import { nw_gallery } from './maps/nw_gallery';
import { nw_landing } from './maps/nw_landing';
import { nw_bank } from './maps/nw_bank';
import { TEETH_NPCS } from './npcs/tm_teeth';
import { WET_NPCS } from './npcs/nw_wet';
import { an_spindle } from './maps/an_spindle';
import { an_kelso } from './maps/an_kelso';
import { an_hall } from './maps/an_hall';
import { an_pemberton } from './maps/an_pemberton';
import { an_saddleback } from './maps/an_saddleback';
import { an_glass } from './maps/an_glass';
import { ASHLANDS_NPCS } from './npcs/an_ashlands';
import { LONGNIGHT_NPCS } from './npcs/ln_longnight';
import { SKIRTS_NPCS } from './npcs/hs_skirts';
import { RING_NPCS } from './npcs/md_ring';
import { SPIRE_NPCS } from './npcs/md_spire';
import { MARKET_NPCS } from './npcs/md_market';
import { SINK_NPCS } from './npcs/md_sink';
import { LANTERN_NPCS } from './npcs/md_lantern';
import { STACKS_NPCS } from './npcs/md_stacks';
import { BRIDGEWARD_NPCS } from './npcs/md_bridgeward';
import { CROWN_NPCS } from './npcs/md_crown';
import { BENCH_NPCS } from './npcs/bench';
import { A3_NPCS } from './npcs/a3';
import { A3_KNOCK_NPCS, A3_SLOPE_NPCS } from './npcs/a3_knock';
import { A3_CLOSE_NPCS } from './npcs/a3_close';
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
  bench_crowd, tollhouse, signalhill, drywells, wild_track, wild_rough, windpumps, saltpan, orchard, wheel, ninebridge, openfield, sump, cistern4, md_precinct, md_market, md_sink, md_lantern, md_stacks, md_stacks_9, md_stacks_roof, md_bridgeward, md_crown, md_spire, md_spire_top, md_ring, hs_skirts, hs_six, rc_fourways, rc_halt_w, rc_halt_e, rc_yard, rc_kettle,
  ds_stilts, ds_rigs, ds_rig_leg, ds_terminal, ds_wade, md_docks,
  tm_pit, tm_level, tm_trail, nw_sawtown, nw_dam, nw_gallery, nw_landing, nw_bank,
  an_spindle, an_kelso, an_hall, an_pemberton, an_saddleback, an_glass,
  hc_terrace, hc_clinic, hc_board, hc_works,
  md_vault,
};

export const NPCS: Record<string, NpcDef> = Object.fromEntries([...DEV_NPCS, ...CH1_CISTERN, ...KNOCK, ...SHALE_NPCS, ...RUSTDOG_NPCS, ...TOLLHOUSE_NPCS, ...SIGNALHILL_NPCS, ...DRYWELLS_NPCS, ...WILDS_NPCS, ...LANDMARK_NPCS, ...ORCHARD_NPCS, ...WHEEL_NPCS, ...NINEBRIDGE_NPCS, ...OPENFIELD_NPCS, ...SUMP_NPCS, ...MERIDIAN_NPCS, ...MARKET_NPCS, ...SINK_NPCS, ...LANTERN_NPCS, ...STACKS_NPCS, ...BRIDGEWARD_NPCS, ...CROWN_NPCS, ...SPIRE_NPCS, ...RING_NPCS, ...SKIRTS_NPCS, ...HALCYON_NPCS, ...CORRIDOR_NPCS, ...SHORE_NPCS, ...DOCKS_NPCS, ...TEETH_NPCS, ...WET_NPCS, ...ASHLANDS_NPCS, ...LONGNIGHT_NPCS, ...BENCH_NPCS, ...A3_NPCS, ...A3_KNOCK_NPCS, ...A3_SLOPE_NPCS, ...A3_CLOSE_NPCS].map((n) => [n.id, n]));

export { FAMILIES, LETTERS, FACTIONS, WORLD_MAP, REGIONS, TRAITS, PERKS, CHROME, ITEMS, ORIGINS, DIALOGUES, QUESTS, SETTLEMENTS, LEADS, CONCLUSIONS, WORLD_EVENTS, ROAD_ENCOUNTERS };
registerRules({ traits: TRAITS, perks: PERKS });
registerChrome(CHROME);
registerFactions(FACTIONS);
registerItems(ITEMS);
