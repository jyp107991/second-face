import { describe, expect, it } from 'vitest';
import { REGIONS, SETTLEMENTS } from '../src/content';
import { OUTFIT_ROLES } from '../src/engine/data/outfits';
import { generateSettlement, residentRoles, SETTLEMENT_TYPES, type SettlementType } from '../src/engine/world/settlementTypes';

const TYPES = Object.keys(SETTLEMENT_TYPES) as SettlementType[];

describe('settlement types', () => {
  it('every type has people from known roles and sane ranges', () => {
    for (const t of TYPES) {
      const T = SETTLEMENT_TYPES[t];
      expect(Object.keys(T.roles).length, t).toBeGreaterThan(0);
      for (const r of Object.keys(T.roles)) expect(OUTFIT_ROLES).toContain(r);
      expect(T.size[0]).toBeLessThanOrEqual(T.size[1]);
      expect(T.kits.length).toBeGreaterThan(0);
    }
  });

  it('generation is deterministic and varies', () => {
    expect(generateSettlement('well_town', 5)).toEqual(generateSettlement('well_town', 5));
    const profiles = Array.from({ length: 40 }, (_, i) => generateSettlement('well_town', i));
    expect(new Set(profiles.map((p) => p.kit)).size).toBeGreaterThan(1);
    expect(new Set(profiles.map((p) => p.services.join())).size).toBeGreaterThan(10);
    const crises = profiles.filter((p) => p.crisis).length;
    expect(crises).toBeGreaterThan(5);
    expect(crises).toBeLessThan(25);
  });

  it('residents follow the type: communes are pilgrims, raider camps raiders', () => {
    const count = (t: SettlementType, role: string) => residentRoles(t, 0.5, 200, 1).filter((r) => r === role).length;
    expect(count('commune', 'pilgrim')).toBeGreaterThan(100);
    expect(count('raider_camp', 'raider')).toBeGreaterThan(120);
    expect(count('stilt_village', 'fisher')).toBeGreaterThan(100);
  });

  it('poverty shows: poor bastion districts have more drifters, rich ones more gilded', () => {
    const poor = residentRoles('bastion', 0.05, 400, 2), rich = residentRoles('bastion', 0.95, 400, 2);
    const n = (xs: string[], r: string) => xs.filter((x) => x === r).length;
    expect(n(poor, 'drifter')).toBeGreaterThan(n(rich, 'drifter'));
    expect(n(rich, 'gilded')).toBeGreaterThan(n(poor, 'gilded'));
  });

  it('known settlements are typed and placed in regions', () => {
    for (const s of Object.values(SETTLEMENTS)) {
      expect(s.type, s.id).toBeDefined();
      expect(REGIONS[s.region!], s.id).toBeDefined();
    }
  });
});
