import type { RoadEncounterDef } from '../../engine/world/roads';
import { DS_ENCOUNTERS } from './ds_shore';
import { B5C_ENCOUNTERS } from './b5c_wilds';
import { B5D_ENCOUNTERS } from './b5d_ashlands';

/**
 * Road encounters, by region. A leg of a trip rolls its risk; on a hit one of these that fits the place, the hour and
 * what the player has done is picked by weight. Those with a map stop the trip on a roadside map and open a
 * conversation; the rest are passing things.
 */
export const ROAD_ENCOUNTERS: Record<string, RoadEncounterDef> = Object.fromEntries(([
  // --- The Sallow: passing things
  {
    id: 're_salt_wind', regions: ['sallow'], weight: 3,
    text: 'A wind comes off the pans with salt in it, and for an hour the world is a white hiss and the track is a guess. You walk bent, with your sleeve over your mouth, and come out of it with your eyes raw and the sun somewhere else.',
    effects: [{ time: 60 }, { learn: 'seen_salt_wind' }],
  },
  {
    id: 're_kite', regions: ['sallow'], hours: { from: 10, to: 16 }, weight: 2, once: true,
    text: 'Something crosses the sun with no bird in it: long wings, no beat, a shadow that slides over the salt and over you and does not hurry. It looks at you. You are fairly sure of that. Then it is a line, and then nothing.',
    effects: [{ learn: 'seen_kite' }, { lead: 'l_kite_seen' }, { xp: 20 }],
  },
  {
    id: 're_dust_devil', regions: ['sallow'], hours: { from: 11, to: 17 }, weight: 2,
    text: 'A dust devil walks the pan a hundred yards off, tall as a tower, taking its time. Grit in your teeth for a mile after.',
    effects: [{ time: 15 }],
  },
  {
    id: 're_old_camp', regions: ['sallow'], weight: 2, once: true,
    text: 'A ring of stones by the track, and in it the ash of a fire nobody has lit for years, and a tin cup with a bullet hole through it, set upright on a rock as if someone meant to come back for it.',
    effects: [{ give: 'j_scrap', count: 2 }, { learn: 'seen_old_camp' }, { xp: 10 }],
  },
  // --- Riding escort for the Wheel's wagon (q_a1_escort): the road asks twice.
  {
    id: 're_escort_axle', regions: ['sallow'], terrain: ['road', 'track'], weight: 14, once: true, map: 'wild_track', dialogue: 'd_re_axle',
    if: { flag: 'escort_active', eq: 'wheel' },
    npcs: [{ def: 'npc_w_wheel', spot: 'ahead', facing: 2 }],
  },
  {
    id: 're_escort_shakedown', regions: ['sallow'], terrain: ['road', 'track'], weight: 14, once: true, map: 'wild_track', dialogue: 'd_re_shakedown',
    if: { flag: 'escort_active', eq: 'wheel' },
    npcs: [{ def: 'npc_w_scout_a', spot: 'ahead', facing: 3 }, { def: 'npc_w_scout_b', spot: 'ahead2', facing: 3 }, { def: 'npc_w_wheel', spot: 'fire', facing: 0 }],
  },
  // --- The Sallow: things that stop you
  {
    id: 're_patrol', regions: ['sallow'], terrain: ['road', 'track'], weight: 4, map: 'wild_track', dialogue: 'd_re_patrol',
    if: { flag: 'th_passed' },
    npcs: [{ def: 'npc_w_outrider_a', spot: 'ahead', facing: 3 }, { def: 'npc_w_outrider_b', spot: 'ahead2', facing: 3 }],
  },
  {
    id: 're_drifter', regions: ['sallow'], weight: 3, once: true, map: 'wild_rough', dialogue: 'd_re_drifter',
    npcs: [{ def: 'npc_w_drifter', spot: 'fire', facing: 3 }],
  },
  {
    id: 're_scouts', regions: ['sallow'], weight: 3, map: 'wild_track', dialogue: 'd_re_scouts',
    if: { all: [{ knows: 'overpass_dogs' }, { not: { flag: 'rd_dissolved' } }] },
    npcs: [{ def: 'npc_w_scout_a', spot: 'ahead', facing: 3 }, { def: 'npc_w_scout_b', spot: 'side', facing: 3 }],
  },
  {
    id: 're_wheel', regions: ['sallow'], weight: 2, once: true, map: 'wild_track', dialogue: 'd_re_wheel',
    npcs: [{ def: 'npc_w_wheel', spot: 'side', facing: 0 }],
  },
  {
    id: 're_walker', regions: ['sallow'], hours: { from: 21, to: 5 }, weight: 3, once: true, map: 'wild_rough', dialogue: 'd_re_walker',
    if: { flag: 'ch1_done' },
    npcs: [{ def: 'npc_w_walker', spot: 'far', facing: 3 }],
  },
  {
    id: 're_caravan', regions: ['sallow'], terrain: ['road', 'track'], weight: 3, once: true, map: 'wild_track', dialogue: 'd_re_caravan',
    npcs: [{ def: 'npc_w_carter', spot: 'ahead', facing: 2 }, { def: 'npc_w_carter_guard', spot: 'ahead2', facing: 3 }],
  },
  // --- The Rail Corridor (B5a): the Line's roads, and the people on them
  {
    id: 're_rc_holdup', regions: ['rail_corridor'], hours: { from: 21, to: 5 }, weight: 6, once: true, map: 'wild_track', dialogue: 'd_re_rc_holdup',
    if: { all: [{ not: { flag: 'rc_bandits' } }, { not: { flag: 'rc_watch_gone' } }] },
    npcs: [{ def: 'npc_rc_02', id: 'npc_rc_02_road', spot: 'ahead', facing: 3 }, { def: 'npc_rc_03', id: 'npc_rc_03_road', spot: 'ahead2', facing: 3 }, { def: 'npc_rc_g3', spot: 'side', facing: 3 }],
  },
  {
    id: 're_rc_wreck', regions: ['rail_corridor'], weight: 3, once: true, if: { not: { flag: 'rc_bandits' } },
    text: 'In the ditch beside the Line, a sealed car on its side with the Concern\'s closed eye on its door, the door open and the seal\'s wire cut clean. Straw, and the square ghosts of crates in the dust. Nothing else in it. Nothing else touched.',
    effects: [{ lead: 'l_rc_sealed' }, { learn: 'rc_wreck_seen' }, { xp: 10 }],
  },
  {
    id: 're_rc_gang', regions: ['rail_corridor'], hours: { from: 6, to: 18 }, weight: 3, once: true, map: 'wild_track', dialogue: 'd_re_rc_gang',
    npcs: [{ def: 'npc_rc_w1', spot: 'ahead', facing: 2 }, { def: 'npc_rc_w2', spot: 'ahead2', facing: 2 }],
  },
  {
    id: 're_rc_rods', regions: ['rail_corridor'], weight: 2, once: true, map: 'wild_rough', dialogue: 'd_re_rc_rods',
    npcs: [{ def: 'npc_rc_w3', spot: 'fire', facing: 3 }],
  },
  {
    id: 're_rc_signal', regions: ['rail_corridor'], hours: { from: 19, to: 5 }, weight: 2, once: true,
    text: 'Where an old branch leaves the Line and runs off into the grass with no rails on it, a signal still stands on its post, and still shows green, all night, for a train that has not come for ninety years. Somebody has hung a tin cup on its ladder. You leave it there.',
    effects: [{ learn: 'rc_signal_seen' }, { xp: 15 }],
  },
  {
    id: 're_rc_drovers', regions: ['rail_corridor'], hours: { from: 7, to: 17 }, weight: 2,
    text: 'Drovers on the Line\'s verge with forty goats and two dogs, walking the grass between the rails and the road because nobody else wants it. They give you a strip of dried meat for a hand turning the herd off the track ahead of the seven o\'clock.',
    effects: [{ give: 'c_jerky', count: 1 }, { time: 30 }],
  },
  {
    id: 're_rc_grassfire', regions: ['rail_corridor'], hours: { from: 11, to: 18 }, weight: 2,
    text: 'A grass fire along the Line where an engine\'s sparks have caught the verge, a long low wall of smoke walking with the wind. You go round it the long way, with your sleeve over your mouth.',
    effects: [{ time: 60 }],
  },
  {
    id: 're_rc_riders', regions: ['rail_corridor'], terrain: ['road', 'track'], weight: 4, map: 'wild_track', dialogue: 'd_re_patrol',
    if: { flag: 'rc_line', eq: 'guild' },
    npcs: [{ def: 'npc_w_outrider_a', spot: 'ahead', facing: 3 }, { def: 'npc_w_outrider_b', spot: 'ahead2', facing: 3 }],
  },
  // --- the Drowned Shore (B5b): ds_shore.ts
  ...DS_ENCOUNTERS,
  // --- the Teeth mines and the Northern Wet (B5c): b5c_wilds.ts
  ...B5C_ENCOUNTERS,
  // --- the Ashlands' remnant machines and the Long Night's roads (B5d): b5d_ashlands.ts
  ...B5D_ENCOUNTERS,
] as RoadEncounterDef[]).map((e) => [e.id, e]));
