import type { WorldEventDef } from '../../engine/world/frontier';
import type { RoadEncounterDef } from '../../engine/world/roads';
import type { Cond } from '../../engine/world/logic';
import {
  A3_OPEN, AGAINST_GUILD, AT_KNOCK, HOME_OPEN, LOWE, LOWE_DEAD, OPENFIELD, ORDER_READ, ORME, REYES, RIDE_CARTS, RIDE_COLUMN, RIDE_FIRST, RIDE_WHEEL,
} from './a3_conds';

/**
 * Toll Road Home (B6c, Act 3 beat 19): the world's side of the road home. Spread into WORLD_EVENTS (`world/events.ts`) and
 * ROAD_ENCOUNTERS (`world/encounters.ts`).
 *
 * Events, each armed by a flag and waiting for its hour (none on a date; none resolves anything behind the player's back):
 * - the offers of a ride, by post at the next nine o'clock after the order is read, wherever the player is: the wardens' car
 *   (Lowe, or Reyes if he is dead), the guild's first class (Orme), Openfield's carts (the seed-keeper). Each says where the
 *   ride leaves from; the ride goes whenever the player is in it.
 * - the player home at Knock, however they came (`a3_home`, `a3_home_road`): the first time the player is on Knock's map once
 *   the order has been read (the hour is midnight after the reading, which the road home is always longer than), the
 *   player is at Knock, and if no ride brought them, they came under their own steam (`a3_route_home` = foot). A ride's own
 *   scene sets both on arrival; Knock's arrival trigger (B6f) can set `a3_at_knock` the moment the player walks in.
 *
 * Encounters on the road home (`re_a3_*`): the column's supply car passing; Openfield's walkers after its night; the guild's
 * riders, only for those who stood against the guild; a Hollow trader with the station's news; and the Wheel, who carry
 * road-kin and friends home across the pan. Story notes: story/B6_NOTES_SECRET.md §2.3 (19) and "As built" → B6c.
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });

/** On the road home: the order read, not yet at Knock. */
const HOMEWARD: Cond = ALL(ORDER_READ, NOT(AT_KNOCK));

export const A3_ROAD_EVENTS: Record<string, WorldEventDef> = {
  a3_offer_column: {
    id: 'a3_offer_column', at: { hour: 9 }, armedIf: ALL(HOME_OPEN, RIDE_COLUMN, NOT(LOWE_DEAD)),
    effects: [
      { post: { from: LOWE, text: 'Designate — The car for Reserve 9 leaves the Precinct gate at seven any morning the designate is aboard it. My orders are to carry the attendance with the car. I would rather you came with me than came to me. I am at my desk under the clause, as always. — I. Lowe, Captain, Precinct wardens' } },
      { learn: 'a3_ride_column' },
    ],
  },
  a3_offer_column_reyes: {
    id: 'a3_offer_column_reyes', at: { hour: 9 }, armedIf: ALL(HOME_OPEN, RIDE_COLUMN, LOWE_DEAD),
    effects: [
      { post: { from: REYES, text: 'Designate — Captain Lowe\'s car for Reserve 9 is mine to command now. It leaves the Precinct gate at seven any morning the designate is aboard. He would have wanted to carry you rather than meet you at the door. So would I. Find me at the gate. — P. Reyes, Sergeant' } },
      { learn: 'a3_ride_column' },
    ],
  },
  a3_offer_first: {
    id: 'a3_offer_first', at: { hour: 9 }, armedIf: ALL(HOME_OPEN, RIDE_FIRST),
    effects: [
      { post: { from: ORME, text: 'Designate — The guild\'s compliments, and a seat: first class, in the guild\'s own car behind the engine of the Concern\'s through, out of Carrick at four any morning, as far as Four Ways; the guild\'s coach from there down our own road. Show this to the boy at the Line\'s window in the shed. I am going home to my stand myself. — I. Orme, Factor, Knock' } },
      { learn: 'a3_ride_first' },
    ],
  },
  a3_offer_carts: {
    id: 'a3_offer_carts', at: { hour: 9 }, armedIf: ALL(HOME_OPEN, RIDE_CARTS),
    effects: [
      { post: { from: 'npc_of_06', text: 'Knock is dry since its hatch shut; we heard it on the road. The Choir is taking it water, by the old south bed, where the guild has no gates. The carts leave the yard at first light any morning you come to walk with them. Nobody is writing this down. — Doria, keeper, Openfield' } },
      { learn: 'a3_ride_carts' },
    ],
  },
  /** Home, however they came: the first time on Knock's map after the order is read. */
  a3_home: {
    id: 'a3_home', at: { hour: 0, where: 'c9_mouth' }, armedIf: ALL(ORDER_READ, NOT(AT_KNOCK)),
    effects: [{ set: 'a3_at_knock' }, { set: 'a3_in_sallow' }, { learn: 'loc_cistern9' }],
  },
  /** ...and if no ride brought them, they came under their own steam: on foot, by the Line, with a caravan. */
  a3_home_road: {
    id: 'a3_home_road', at: { hour: 0, where: 'c9_mouth' }, armedIf: ALL(ORDER_READ, NOT(F('a3_route_home'))),
    effects: [
      { set: 'a3_route_home', value: 'foot' }, { xp: 100 },
      { decision: { id: 'a3_route_home', text: 'I came home to Knock under my own steam, by the roads I knew, and nobody carried me.' } },
    ],
  },
};

export const A3_ENCOUNTERS: RoadEncounterDef[] = [
  // passing: the column's supply car, going to Knock with the wardens' water
  {
    id: 're_a3_column', regions: ['glass_flats', 'sallow'], terrain: ['road'], weight: 4, once: true, if: ALL(HOMEWARD, NOT(F('a3_route_home', 'column'))),
    text: 'A grey Precinct car goes by on the toll road at a steady forty, stencilled on its tailboard COLUMN — RESERVE 9 — SUPPLY: water barrels roped down under canvas, the Precinct\'s own, for the wardens camped at Knock, because Knock has none to sell them. The warden at the wheel lifts two fingers to you as it passes, politely, the way the sheet says the designate is to be greeted.',
    effects: [{ learn: 'a3_column_seen' }, { xp: 10 }],
  },
  // Openfield's walkers, after its night
  {
    id: 're_a3_refugees', regions: ['glass_flats', 'sallow'], weight: 6, once: true, map: 'wild_track', dialogue: 'd_re_a3_refugees',
    if: ALL(HOMEWARD, ANY(OPENFIELD('burned'), OPENFIELD('evicted'), OPENFIELD('guild'), OPENFIELD('scorched'))),
    npcs: [{ def: 'npc_a3_02', spot: 'ahead', facing: 3 }, { def: 'npc_a3_03', spot: 'ahead2', facing: 3 }],
  },
  // the guild's riders: only for those who stood against the guild at Openfield
  {
    id: 're_a3_riders', regions: ['rail_corridor', 'glass_flats', 'sallow'], terrain: ['road'], weight: 6, once: true, map: 'wild_track', dialogue: 'd_re_a3_riders',
    if: ALL(HOMEWARD, AGAINST_GUILD),
    npcs: [{ def: 'npc_a3_g9', spot: 'ahead', facing: 3 }, { def: 'npc_a3_g10', spot: 'ahead2', facing: 3 }],
  },
  // a Hollow trader with the station's news
  {
    id: 're_a3_trader', regions: ['sallow', 'glass_flats', 'rail_corridor'], weight: 4, once: true, map: 'wild_rough', dialogue: 'd_re_a3_trader',
    if: ALL(A3_OPEN, NOT(F('a3_mast'))),
    npcs: [{ def: 'npc_a3_04', spot: 'fire', facing: 3 }],
  },
  // the Wheel carry their own home
  {
    id: 're_a3_wheel', regions: ['glass_flats', 'rail_corridor', 'sallow'], weight: 12, once: true, map: 'wild_track', dialogue: 'd_re_a3_wheel',
    if: ALL(HOME_OPEN, RIDE_WHEEL),
    npcs: [{ def: 'npc_w_wheel', id: 'npc_w_wheel_a3', spot: 'ahead', facing: 2 }],
  },
];
