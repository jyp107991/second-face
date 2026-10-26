import { describe, expect, it } from 'vitest';
import { FACTIONS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { hasFlag, skill } from '../src/engine/stats/sheet';
import { enlist, expel, factionPriceMul, hasAccess, isMember, setRank, syncMembership } from '../src/engine/world/factions';
import { apply, test as cond } from '../src/engine/world/logic';

describe('faction membership', () => {
  it('joining grants rank perks that accumulate up the ladder', () => {
    const g = newGameState('x', 0, 0);
    const base = skill(g.pc.sheet, 'firearms');
    enlist(g, FACTIONS, 'shale_militia'); syncMembership(g, FACTIONS);
    expect(isMember(g, FACTIONS, 'shale_militia')).toBe(true);
    expect(isMember(g, FACTIONS, 'shale_militia', 'deputy')).toBe(false);
    expect(hasAccess(g, FACTIONS, 'shale_armoury')).toBe(true);
    expect(factionPriceMul(g, FACTIONS, 'shale_militia')).toBe(0.95);
    setRank(g, FACTIONS, 'shale_militia', 'hand'); syncMembership(g, FACTIONS);
    expect(skill(g.pc.sheet, 'firearms')).toBe(base + 5);
    expect(hasFlag(g.pc.sheet, 'militia_authority')).toBe(true);
    expect(hasFlag(g.pc.sheet, 'frontier_justice')).toBe(true);
    expect(factionPriceMul(g, FACTIONS, 'shale_militia')).toBe(0.9);
  });

  it('conflicting memberships expel each other; gangs are one at a time; covers do not', () => {
    const g = newGameState('x', 0, 0);
    enlist(g, FACTIONS, 'shale_militia');
    expect(enlist(g, FACTIONS, 'rust_dogs')).toEqual(['shale_militia']);
    expect(g.world.membership.shale_militia.status).toBe('expelled');
    expect(cond({ member: 'shale_militia', status: 'expelled' }, g)).toBe(true);
    enlist(g, FACTIONS, 'gilt');
    expect(enlist(g, FACTIONS, 'pale')).toEqual(['gilt']);
    const h = newGameState('x', 0, 0);
    enlist(h, FACTIONS, 'shale_militia');
    expect(enlist(h, FACTIONS, 'rust_dogs', { cover: 'shale_militia' })).toEqual([]);
    expect(isMember(h, FACTIONS, 'shale_militia')).toBe(true);
    syncMembership(h, FACTIONS);
    // A cover membership opens doors but gives no perks.
    expect(hasAccess(h, FACTIONS, 'overpass_gate')).toBe(true);
    expect(h.pc.sheet.factionFlags).not.toContain('dog_safe_passage');
  });

  it('dialogue effects and conditions drive membership', () => {
    const g = newGameState('x', 0, 0);
    apply([{ enlist: 'tollmen' }], g);
    expect(cond({ member: 'tollmen' }, g)).toBe(true);
    apply([{ promote: { faction: 'tollmen', rank: 'factor' } }], g);
    expect(cond({ member: 'tollmen', rank: 'hand' }, g)).toBe(true);
    expect(hasFlag(g.pc.sheet, 'futures_access')).toBe(true);
    apply([{ enlist: 'choir' }], g);
    expect(cond({ member: 'tollmen' }, g)).toBe(false);
    expect(g.world.decisions.some((d) => d.id.startsWith('expelled_tollmen'))).toBe(true);
    expect(hasFlag(g.pc.sheet, 'futures_access')).toBe(false);
    expect(expel(g, 'choir', 'left')).toBe(true);
    expect(cond({ member: 'choir', status: 'left' }, g)).toBe(true);
  });
});
