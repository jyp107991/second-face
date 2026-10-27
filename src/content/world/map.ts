import type { LocationDef, NetworkDef, RouteDef, WorldMap } from '../../engine/world/travel';

/**
 * The Western Reach world map — first skeleton (M2b): the known places, a few hidden landmarks, roads, and
 * the networks that make fast travel possible. Coordinates in km (docs/WORLD.md §2). M4 fills it out to
 * ~120 locations.
 */
const L: LocationDef[] = [
  // The Sallow
  { id: 'cistern9', name: 'Cistern 9', region: 'sallow', x: 470, y: 382, kind: 'major', settlement: 'cistern9', map: 'c9_mouth' },
  { id: 'shale', name: 'Shale', region: 'sallow', x: 455, y: 360, kind: 'major', settlement: 'shale', map: 'shale' },
  { id: 'drywells', name: 'Dry Wells', region: 'sallow', x: 500, y: 395, kind: 'minor', settlement: 'drywells', map: 'drywells' },
  { id: 'rustdogs', name: 'the overpass', region: 'sallow', x: 430, y: 335, kind: 'major', settlement: 'rustdogs', map: 'overpass' },
  { id: 'tollhouse', name: 'Tollhouse 9', region: 'sallow', x: 420, y: 300, kind: 'major', settlement: 'tollhouse', map: 'tollhouse' },
  { id: 'signalhill', name: 'Signal Hill', region: 'sallow', x: 402, y: 286, kind: 'minor', map: 'signalhill' },
  { id: 'lm_sallow_01', name: 'Salt-pan wreck', region: 'sallow', x: 442, y: 372, kind: 'landmark', hidden: true },
  { id: 'lm_sallow_02', name: 'Windpump graveyard', region: 'sallow', x: 488, y: 345, kind: 'landmark', hidden: true, map: 'windpumps' },
  // The Glass Flats
  { id: 'ninebridge', name: 'Ninebridge', region: 'glass_flats', x: 320, y: 300, kind: 'major', settlement: 'ninebridge' },
  { id: 'openfield', name: 'Openfield', region: 'glass_flats', x: 280, y: 340, kind: 'major', settlement: 'openfield' },
  { id: 'sump', name: 'the Sump', region: 'glass_flats', x: 362, y: 382, kind: 'minor' },
  { id: 'lm_flats_01', name: 'Stilted freeway', region: 'glass_flats', x: 370, y: 318, kind: 'landmark', hidden: true },
  // The Rail Corridor
  { id: 'junction', name: 'the Junction', region: 'rail_corridor', x: 380, y: 232, kind: 'major' },
  { id: 'halt_e', name: 'East Halt', region: 'rail_corridor', x: 520, y: 220, kind: 'minor' },
  { id: 'halt_w', name: 'West Halt', region: 'rail_corridor', x: 215, y: 238, kind: 'minor' },
  { id: 'depot', name: 'the Depot', region: 'rail_corridor', x: 300, y: 205, kind: 'minor' },
  // The Drowned Shore & Meridian
  { id: 'meridian', name: 'Meridian', region: 'meridian', x: 95, y: 340, kind: 'major', settlement: 'meridian' },
  { id: 'hamlet_shore', name: 'Gull Stilts', region: 'drowned_shore', x: 60, y: 420, kind: 'minor' },
  { id: 'rigs', name: 'the Rigs', region: 'drowned_shore', x: 22, y: 300, kind: 'landmark' },
  // The Teeth
  { id: 'skirts', name: 'the Skirts', region: 'teeth', x: 628, y: 142, kind: 'major' },
  { id: 'halcyon', name: 'Halcyon', region: 'teeth', x: 642, y: 118, kind: 'major' },
  { id: 'mine_teeth', name: 'Number Four Pit', region: 'teeth', x: 600, y: 222, kind: 'minor' },
  // The Northern Wet
  { id: 'timber', name: 'Sawtown', region: 'northern_wet', x: 300, y: 92, kind: 'minor' },
  { id: 'dam', name: 'the Dam', region: 'northern_wet', x: 196, y: 62, kind: 'landmark' },
  { id: 'riverdock', name: 'Low Landing', region: 'northern_wet', x: 150, y: 150, kind: 'minor' },
  // The Ashlands
  { id: 'lm_ash_01', name: 'Cratered base', region: 'ashlands', x: 630, y: 402, kind: 'landmark', hidden: true },
];

const R: RouteDef[] = [
  { a: 'cistern9', b: 'shale', terrain: 'track', danger: 0.1 },
  { a: 'shale', b: 'drywells', terrain: 'track', danger: 0.2 },
  { a: 'shale', b: 'rustdogs', terrain: 'road', danger: 0.5 },
  { a: 'shale', b: 'tollhouse', terrain: 'road', danger: 0.25 },
  { a: 'rustdogs', b: 'tollhouse', terrain: 'road', danger: 0.4 },
  { a: 'tollhouse', b: 'ninebridge', terrain: 'road', danger: 0.25 },
  { a: 'tollhouse', b: 'signalhill', terrain: 'rough', danger: 0.3 },
  { a: 'tollhouse', b: 'junction', terrain: 'road', danger: 0.3 },
  { a: 'ninebridge', b: 'openfield', terrain: 'track', danger: 0.15 },
  { a: 'ninebridge', b: 'sump', terrain: 'glass', danger: 0.45 },
  { a: 'openfield', b: 'halt_w', terrain: 'track', danger: 0.2 },
  { a: 'ninebridge', b: 'meridian', terrain: 'road', danger: 0.35 },
  { a: 'meridian', b: 'hamlet_shore', terrain: 'marsh', danger: 0.3 },
  { a: 'meridian', b: 'rigs', terrain: 'marsh', danger: 0.5 },
  { a: 'meridian', b: 'halt_w', terrain: 'road', danger: 0.3 },
  { a: 'junction', b: 'depot', terrain: 'road', danger: 0.3 },
  { a: 'junction', b: 'halt_e', terrain: 'road', danger: 0.35 },
  { a: 'halt_e', b: 'mine_teeth', terrain: 'track', danger: 0.3 },
  { a: 'mine_teeth', b: 'skirts', terrain: 'mountain', danger: 0.35 },
  { a: 'skirts', b: 'halcyon', terrain: 'road', danger: 0.1 },
  { a: 'depot', b: 'timber', terrain: 'track', danger: 0.3 },
  { a: 'timber', b: 'dam', terrain: 'track', danger: 0.35 },
  { a: 'dam', b: 'riverdock', terrain: 'marsh', danger: 0.3 },
  { a: 'riverdock', b: 'meridian', terrain: 'road', danger: 0.3 },
  { a: 'drywells', b: 'lm_ash_01', terrain: 'rough', danger: 0.8 },
  // Off-road to landmarks (found on foot nearby, then walkable).
  { a: 'shale', b: 'lm_sallow_01', terrain: 'rough', danger: 0.3 },
  { a: 'drywells', b: 'lm_sallow_02', terrain: 'rough', danger: 0.3 },
  { a: 'ninebridge', b: 'lm_flats_01', terrain: 'glass', danger: 0.4 },
];

const N: NetworkDef[] = [
  // The Line: slow trains, a day between big stations; tickets and gate checks.
  { id: 'net_line', name: 'the Line', kind: 'rail', stops: ['meridian', 'halt_w', 'depot', 'junction', 'halt_e', 'skirts'],
    legHours: [10, 6, 6, 9, 12], fare: 25, every: 24, firstHour: 7, danger: 0.08 },
  // River barges from the timber country down to the city docks.
  { id: 'net_barge', name: 'the river barges', kind: 'barge', stops: ['timber', 'dam', 'riverdock', 'meridian'],
    legHours: [14, 18, 16], fare: 10, every: 48, firstHour: 6, danger: 0.12 },
  // Tollmen caravan run: work or pay your passage; safe-ish, slow, on a schedule.
  { id: 'net_caravan', name: 'the Tollmen caravan', kind: 'caravan', stops: ['shale', 'tollhouse', 'ninebridge', 'meridian'],
    legHours: [30, 60, 140], fare: 12, every: 72, firstHour: 6, danger: 0.05 },
];

export const WORLD_MAP: WorldMap = {
  locations: Object.fromEntries(L.map((l) => [l.id, l])),
  routes: R,
  networks: Object.fromEntries(N.map((n) => [n.id, n])),
};
