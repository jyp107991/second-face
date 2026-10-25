import { describe, expect, it } from 'vitest';
import '../src/content';
import {
  activeWeapon, addItem, countItem, emptyInventory, equip, itemValue, makeItem, reload, removeItem, syncGear, totalWeight, useConsumable, wear,
} from '../src/engine/inventory/inventory';
import { derived, emptySheet } from '../src/engine/stats/sheet';

describe('Inventory', () => {
  it('stacks, counts, removes and handles tolls', () => {
    const inv = emptyInventory();
    addItem(inv, makeItem('a_9mm', 10));
    addItem(inv, makeItem('a_9mm', 5));
    addItem(inv, makeItem('tolls', 30));
    expect(inv.items.length).toBe(1);
    expect(countItem(inv, 'a_9mm')).toBe(15);
    expect(removeItem(inv, 'a_9mm', 20)).toBe(15);
    expect(inv.items.length).toBe(0);
    expect(inv.tolls).toBe(30);
  });
  it('equips weapons and reloads from matching ammo', () => {
    const inv = emptyInventory();
    addItem(inv, makeItem('w_pistol9'));
    addItem(inv, makeItem('a_9mm', 20));
    expect(equip(inv, 0)).toBe(true);
    expect(activeWeapon(inv)?.def).toBe('w_pistol9');
    expect(reload(inv)).toBe(12);
    expect(countItem(inv, 'a_9mm')).toBe(8);
    // switching ammo returns loaded rounds
    addItem(inv, makeItem('a_9mm_hp', 12));
    reload(inv, 'primary', 'a_9mm_hp');
    expect(activeWeapon(inv)?.loadedAmmo).toBe('a_9mm_hp');
    expect(countItem(inv, 'a_9mm')).toBe(20);
  });
  it('armour feeds DT/DR via gear mods', () => {
    const inv = emptyInventory(), s = emptySheet();
    addItem(inv, makeItem('r_duster'));
    equip(inv, 0);
    syncGear(s, inv);
    expect(derived(s).dt).toBe(2);
    expect(derived(s).dr).toBe(15);
  });
  it('condition lowers value and weight sums', () => {
    const w = makeItem('w_revolver38');
    const full = itemValue(w);
    for (let i = 0; i < 150; i++) wear(w);
    expect(itemValue(w)).toBeLessThan(full);
    const inv = emptyInventory();
    addItem(inv, makeItem('w_sledge'));
    addItem(inv, makeItem('j_scrap', 3));
    expect(totalWeight(inv)).toBe(10);
  });
  it('consumables heal and are used up', () => {
    const inv = emptyInventory(), s = emptySheet();
    s.hp = 5;
    addItem(inv, makeItem('c_knitkit', 2));
    const r = useConsumable(inv, 0, s, 0);
    expect(r.ok).toBe(true);
    expect(s.hp).toBe(25);
    expect(countItem(inv, 'c_knitkit')).toBe(1);
  });
});
