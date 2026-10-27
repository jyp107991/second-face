import type { RoadEncounterDef } from '../../engine/world/roads';

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
] as RoadEncounterDef[]).map((e) => [e.id, e]));
