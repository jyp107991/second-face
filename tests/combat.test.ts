import { describe, expect, it } from 'vitest';
import '../src/content';
import { Rng } from '../src/engine/core/rng';
import { addItem, emptyInventory, equip, makeItem, reload } from '../src/engine/inventory/inventory';
import { emptySheet } from '../src/engine/stats/sheet';
import { attackAp, canAttack, hitChance, resolveAttack, turnOrder, type Combatant } from '../src/engine/combat/rules';

function fighter(id: string, x: number, y: number, weapon?: string, ammo?: string): Combatant {
  const inv = emptyInventory();
  if (weapon) { addItem(inv, makeItem(weapon)); equip(inv, 0); }
  if (ammo) { addItem(inv, makeItem(ammo, 50)); reload(inv); }
  const sheet = emptySheet(id);
  return { id, name: id, team: id, sheet, inv, x, y, ap: 8, morale: 60, evasion: 0 };
}

describe('Combat rules', () => {
  it('hit chance falls with distance, cover and aiming', () => {
    const a = fighter('a', 0, 0, 'w_pistol9', 'a_9mm');
    a.sheet.skillBought.firearms = 70; // keep values clear of the 5% floor
    const near = fighter('b', 3, 0), far = fighter('c', 25, 0);
    const base = hitChance(a, near);
    expect(hitChance(a, far)).toBeLessThan(base);
    expect(hitChance(a, near, { cover: 'half' })).toBeLessThan(base);
    expect(hitChance(a, near, { aimed: 'eyes' })).toBeLessThan(hitChance(a, near, { aimed: 'legL' }));
    expect(hitChance(a, near, { aimed: 'eyes', cover: 'full' })).toBe(5);
  });
  it('melee cannot reach beyond range', () => {
    const a = fighter('a', 0, 0, 'w_pipe');
    expect(hitChance(a, fighter('b', 2, 0))).toBe(0);
    expect(hitChance(a, fighter('b', 1, 1))).toBeGreaterThan(0);
  });
  it('attacks consume ammo, wear weapons and deal damage over many trials', () => {
    const rng = new Rng(1);
    const a = fighter('a', 0, 0, 'w_revolver38', 'a_38');
    let total = 0;
    for (let i = 0; i < 6; i++) {
      const d = fighter('d', 2, 0);
      d.sheet.hp = 1000;
      total += resolveAttack(rng, a, d).damage;
    }
    expect(total).toBeGreaterThan(0);
    expect(a.inv.equipped.primary!.loaded).toBe(0);
    expect(a.inv.equipped.primary!.cond!).toBeLessThan(1);
    expect(canAttack(a).ok).toBe(false);
  });
  it('armour reduces damage', () => {
    const rng1 = new Rng(7), rng2 = new Rng(7);
    const a1 = fighter('a', 0, 0, 'w_pipe'), a2 = fighter('a', 0, 0, 'w_pipe');
    const bare = fighter('b', 1, 0);
    const armoured = fighter('b', 1, 0, 'r_riot');
    armoured.sheet.gearMods = [{ target: 'derived:dt', add: 6 }, { target: 'derived:dr', add: 30 }];
    bare.sheet.hp = armoured.sheet.hp = 1000;
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 40; i++) { d1 += resolveAttack(rng1, a1, bare).damage; d2 += resolveAttack(rng2, a2, armoured).damage; }
    expect(d2).toBeLessThan(d1);
  });
  it('kills set hp to 0 and burst fires several rounds', () => {
    const rng = new Rng(3);
    const a = fighter('a', 0, 0, 'w_smg9', 'a_9mm');
    a.sheet.skillBought.firearms = 80;
    const d = fighter('d', 2, 0);
    d.sheet.hp = 5;
    const r = resolveAttack(rng, a, d, { burst: true });
    expect(r.roundsFired).toBeGreaterThan(1);
    expect(d.sheet.hp).toBe(0);
    expect(r.killed).toBe(true);
    expect(attackAp(a, { burst: true })).toBe(6);
  });
  it('turn order is by initiative', () => {
    const fast = fighter('fast', 0, 0), slow = fighter('slow', 0, 0);
    fast.sheet.baseAttrs.senses = 10; fast.sheet.baseAttrs.reflex = 10;
    slow.sheet.baseAttrs.senses = 1; slow.sheet.baseAttrs.reflex = 1;
    expect(turnOrder(new Rng(5), [slow, fast])[0].id).toBe('fast');
  });
});
