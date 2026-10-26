import { describe, expect, it } from 'vitest';
import { WORLD_MAP } from '../src/content';
import { discoveriesAlong, fastTravel, overlandHours, planTrip, routeKm, waitForDeparture, type TravelOptions } from '../src/engine/world/travel';

const m = WORLD_MAP;
const opts = (o: Partial<TravelOptions> = {}): TravelOptions => ({ modes: [], networks: [], known: () => false, hour: 8, ...o });

describe('world travel', () => {
  it('walking takes days and includes nights; vehicles are faster on roads and stopped by mountains', () => {
    const road = m.routes.find((r) => r.a === 'tollhouse' && r.b === 'ninebridge')!;
    const foot = overlandHours(m, road, 'foot')!, car = overlandHours(m, road, 'vehicle')!;
    expect(routeKm(m, road)).toBeGreaterThan(100);
    expect(foot).toBeGreaterThan(24);
    expect(car).toBeLessThan(foot / 4);
    const pass = m.routes.find((r) => r.terrain === 'mountain')!;
    expect(overlandHours(m, pass, 'vehicle')).toBeUndefined();
  });

  it('timetables: waiting for the next departure', () => {
    const line = m.networks.net_line;
    expect(waitForDeparture(line, 7)).toBe(0);
    expect(waitForDeparture(line, 8)).toBe(23);
    expect(waitForDeparture(line, 5)).toBe(2);
  });

  it('plans on foot by default and uses networks when they are quicker', () => {
    const walk = planTrip(m, 'shale', 'meridian', opts())!;
    expect(walk.legs.every((l) => l.by === 'foot')).toBe(true);
    const ride = planTrip(m, 'shale', 'meridian', opts({ networks: ['net_caravan'] }))!;
    expect(ride.hours).toBeLessThanOrEqual(walk.hours);
    const bike = planTrip(m, 'shale', 'meridian', opts({ modes: ['vehicle'] }))!;
    expect(bike.hours).toBeLessThan(walk.hours / 3);
  });

  it('fast travel only on networks you can ride; it costs money and still takes time', () => {
    expect(fastTravel(m, 'shale', 'meridian', opts())).toBeUndefined();
    const t = fastTravel(m, 'shale', 'meridian', opts({ networks: ['net_caravan'] }))!;
    expect(t.fast).toBe(true);
    expect(t.fare).toBeGreaterThan(0);
    expect(t.hours).toBeGreaterThan(24);
    // No network reaches Cistern 9: you walk.
    expect(fastTravel(m, 'meridian', 'cistern9', opts({ networks: ['net_caravan', 'net_line', 'net_barge'] }))).toBeUndefined();
  });

  it('hidden places are off the planner until known', () => {
    expect(planTrip(m, 'shale', 'lm_sallow_01', opts())).toBeUndefined();
    expect(planTrip(m, 'shale', 'lm_sallow_01', opts({ known: (id) => id === 'lm_sallow_01' }))).toBeDefined();
  });

  it('walking discovers more than driving', () => {
    const leg = (by: 'foot' | 'vehicle') => ({ from: 'shale', to: 'drywells', by, hours: 1, fare: 0, risk: 0 });
    const roll = () => 0.1;
    expect(discoveriesAlong(m, leg('foot'), roll).length).toBeGreaterThan(discoveriesAlong(m, leg('vehicle'), roll).length);
  });
});
