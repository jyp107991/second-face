/**
 * The world map (DESIGN §13c): locations on a km grid, overland routes, and transport networks with
 * timetables and fares. A trip planner finds the quickest way between two places with what the player can
 * use; "fast travel" is simply a trip made entirely on networks (rail, barge, caravan, city transit, your
 * safehouse runners) — time still passes and it still costs. Walking stays worthwhile: discoveries happen
 * on foot, and most of the map is off the networks.
 */

export type LocationKind = 'major' | 'minor' | 'landmark';

export interface LocationDef {
  id: string;
  name: string;
  region: string;
  /** km on the world map (x east, y south). */
  x: number;
  y: number;
  kind: LocationKind;
  /** Settlement it represents (frontier SettlementDef id), if any. */
  settlement?: string;
  /** Map entered on arrival (MapDef id), once built. */
  map?: string;
  /** Not on the map until discovered (found on foot nearby, told of, or read about). */
  hidden?: boolean;
  /** A camp that moves: it stands at each stop of its route for `days` days in turn (position set from the day by
   *  `placeMoving`; `near` names the settlement the stop is close to, for talk and news). */
  moves?: { route: { x: number; y: number; near: string }[]; days: number };
}

/**
 * Put every moving location where the day says it is. A location the player is at does not move under them
 * (`freeze`). Returns, per moved location, the settlement it is near.
 */
export function placeMoving(m: WorldMap, day: number, freeze?: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of Object.values(m.locations)) {
    if (!loc.moves || !loc.moves.route.length) continue;
    const stop = loc.moves.route[Math.floor(Math.max(0, day) / Math.max(1, loc.moves.days)) % loc.moves.route.length];
    if (loc.id !== freeze) { loc.x = stop.x; loc.y = stop.y; }
    out[loc.id] = loc.moves.route.find((r) => r.x === loc.x && r.y === loc.y)?.near ?? stop.near;
  }
  return out;
}

export type Terrain = 'road' | 'track' | 'rough' | 'mountain' | 'marsh' | 'glass';

export interface RouteDef {
  a: string;
  b: string;
  terrain: Terrain;
  /** 0..1 how likely trouble is per day on it. */
  danger: number;
  /** Length in km; straight-line distance × 1.25 when omitted. */
  km?: number;
}

export type OverlandMode = 'foot' | 'mount' | 'vehicle';
export type NetworkKind = 'rail' | 'barge' | 'caravan' | 'transit' | 'runner' | 'air';

export interface NetworkDef {
  id: string;
  name: string;
  kind: NetworkKind;
  /** Stops in order along the line (location ids). Services run both ways. */
  stops: string[];
  /** Hours of riding between consecutive stops. */
  legHours: number[];
  /** Tolls per leg. */
  fare: number;
  /** Departures every N hours from the first departure hour (0..23); transit runs continuously (every ≤1h). */
  every: number;
  firstHour: number;
  /** 0..1 chance of trouble per leg (rail bandits, river pirates...). */
  danger: number;
}

/** Moving hours per day and km/h by mode; terrain multiplies speed (0 = impassable for that mode). */
export const MODE: Record<OverlandMode, { kmh: number; hoursPerDay: number; terrain: Record<Terrain, number>; noise: number; discovery: number }> = {
  foot: { kmh: 4, hoursPerDay: 10, terrain: { road: 1, track: 0.85, rough: 0.6, mountain: 0.4, marsh: 0.45, glass: 0.7 }, noise: 0.8, discovery: 1 },
  mount: { kmh: 4, hoursPerDay: 10, terrain: { road: 1, track: 0.9, rough: 0.65, mountain: 0.35, marsh: 0.4, glass: 0.6 }, noise: 1, discovery: 0.7 },
  vehicle: { kmh: 18, hoursPerDay: 12, terrain: { road: 1, track: 0.7, rough: 0.35, mountain: 0, marsh: 0, glass: 0.5 }, noise: 1.4, discovery: 0.3 },
};

export interface WorldMap {
  locations: Record<string, LocationDef>;
  routes: RouteDef[];
  networks: Record<string, NetworkDef>;
}

export function routeKm(m: WorldMap, r: RouteDef): number {
  if (r.km) return r.km;
  const a = m.locations[r.a], b = m.locations[r.b];
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 1.25);
}

/** Elapsed hours to cover a route by an overland mode (moving time plus nights), or undefined if impassable. */
export function overlandHours(m: WorldMap, r: RouteDef, mode: OverlandMode): number | undefined {
  const M = MODE[mode], f = M.terrain[r.terrain];
  if (!f) return undefined;
  const moving = routeKm(m, r) / (M.kmh * f);
  const days = Math.floor(moving / M.hoursPerDay);
  return Math.round((moving + days * (24 - M.hoursPerDay)) * 10) / 10;
}

/** Hours from `hour` (0..24, fractional) until the network's next departure. */
export function waitForDeparture(n: NetworkDef, hour: number): number {
  if (n.every <= 1) return n.every / 2;
  const since = (((hour - n.firstHour) % n.every) + n.every) % n.every;
  return since === 0 ? 0 : n.every - since;
}

export interface TripLeg {
  from: string;
  to: string;
  /** Overland mode, or the network ridden. */
  by: OverlandMode | { network: string };
  hours: number;
  fare: number;
  /** Chance of an encounter on this leg. */
  risk: number;
}

export interface Trip { legs: TripLeg[]; hours: number; fare: number; /** Made only on networks: fast travel. */ fast: boolean }

export interface TravelOptions {
  /** Overland modes available (foot always is). */
  modes: OverlandMode[];
  /** Networks the player may ride (tickets, standing, access). */
  networks: string[];
  /** Locations the player knows of; hidden unknown ones are skipped. */
  known: (id: string) => boolean;
  /** Current hour of day (0..24), for timetables. */
  hour: number;
  /** Ride networks only (fast travel). */
  networksOnly?: boolean;
}

/**
 * Quickest trip from `from` to `to` (Dijkstra over elapsed hours, timetable waits included).
 * Returns undefined when unreachable with what the player has.
 */
export function planTrip(m: WorldMap, from: string, to: string, o: TravelOptions): Trip | undefined {
  const modes: OverlandMode[] = o.networksOnly ? [] : [...new Set<OverlandMode>(['foot', ...o.modes])];
  const best = new Map<string, { t: number; legs: TripLeg[] }>([[from, { t: 0, legs: [] }]]);
  const open = new Set([from]);
  const done = new Set<string>();
  while (open.size) {
    let cur = '', ct = Infinity;
    for (const id of open) { const t = best.get(id)!.t; if (t < ct) { ct = t; cur = id; } }
    open.delete(cur);
    if (cur === to) break;
    done.add(cur);
    const here = best.get(cur)!;
    const relax = (next: string, leg: TripLeg) => {
      if (done.has(next) || (m.locations[next]?.hidden && !o.known(next))) return;
      const t = here.t + leg.hours;
      if (t < (best.get(next)?.t ?? Infinity)) { best.set(next, { t, legs: [...here.legs, leg] }); open.add(next); }
    };
    for (const r of m.routes) {
      const next = r.a === cur ? r.b : r.b === cur ? r.a : undefined;
      if (!next) continue;
      for (const mode of modes) {
        const h = overlandHours(m, r, mode);
        if (h === undefined) continue;
        relax(next, { from: cur, to: next, by: mode, hours: h, fare: 0, risk: Math.min(0.95, r.danger * (h / 24) * MODE[mode].noise) });
      }
    }
    for (const nid of o.networks) {
      const n = m.networks[nid];
      const i = n?.stops.indexOf(cur) ?? -1;
      if (!n || i < 0) continue;
      const hourNow = (o.hour + here.t) % 24;
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= n.stops.length) continue;
        const ride = n.legHours[Math.min(i, j)];
        relax(n.stops[j], { from: cur, to: n.stops[j], by: { network: nid }, hours: Math.round((waitForDeparture(n, hourNow) + ride) * 10) / 10, fare: n.fare, risk: n.danger });
      }
    }
  }
  const b = best.get(to);
  if (!b || (from !== to && !b.legs.length)) return from === to ? { legs: [], hours: 0, fare: 0, fast: true } : undefined;
  return {
    legs: b.legs, hours: Math.round(b.t * 10) / 10, fare: b.legs.reduce((t, l) => t + l.fare, 0),
    fast: b.legs.every((l) => typeof l.by === 'object'),
  };
}

/** Fast travel: the quickest trip made only on networks you can ride, if there is one. */
export function fastTravel(m: WorldMap, from: string, to: string, o: Omit<TravelOptions, 'networksOnly'>): Trip | undefined {
  return planTrip(m, from, to, { ...o, networksOnly: true });
}

/**
 * Hidden landmarks that a leg can turn up: within `radiusKm` of the route's line, with a chance scaled by the
 * mode's discovery factor (on foot you notice everything; in a buggy, much less). `roll(id)` gives 0..1.
 */
export function discoveriesAlong(m: WorldMap, leg: TripLeg, roll: (id: string) => number, radiusKm = 25): string[] {
  if (typeof leg.by === 'object') return [];
  const a = m.locations[leg.from], b = m.locations[leg.to];
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
  const found: string[] = [];
  for (const loc of Object.values(m.locations)) {
    if (!loc.hidden) continue;
    const t = Math.max(0, Math.min(1, ((loc.x - a.x) * dx + (loc.y - a.y) * dy) / L2));
    const d = Math.hypot(loc.x - (a.x + t * dx), loc.y - (a.y + t * dy));
    if (d > radiusKm) continue;
    if (roll(loc.id) < MODE[leg.by].discovery * (1 - d / radiusKm) * 0.9) found.push(loc.id);
  }
  return found;
}
