import { describe, expect, it } from 'vitest';
import '../src/content';
import { CHROME, ITEMS } from '../src/content';
import { addItem, emptyInventory, equip, makeItem } from '../src/engine/inventory/inventory';
import { BASE_OUTFIT, wardrobeKey, wardrobeOutfit } from '../src/engine/inventory/wardrobe';
import { emptySheet } from '../src/engine/stats/sheet';
import { ICON_RECIPES, iconRecipe } from '../src/engine/ui/icons';

function wearer() {
  return { sheet: emptySheet('Test'), inventory: emptyInventory() };
}

describe('wardrobe: what is worn shows on the body', () => {
  it('starts in the base clothes with empty hands', () => {
    const o = wardrobeOutfit(wearer());
    expect(o.suit).toBe(BASE_OUTFIT.suit);
    expect(o.held).toBeUndefined();
    expect(o.gear).toEqual([]);
  });

  it('puts the active weapon in the hand and armour on the body', () => {
    const w = wearer();
    addItem(w.inventory, makeItem('w_bolt308'));
    addItem(w.inventory, makeItem('r_duster'));
    addItem(w.inventory, makeItem('r_gasmask'));
    equip(w.inventory, 0, 'primary');
    equip(w.inventory, 0);
    equip(w.inventory, 0);
    const o = wardrobeOutfit(w);
    expect(o.held).toBe('rifle');
    // The duster is a whole set of clothes: the base suit goes, a coat over trousers comes.
    expect(o.suit).toBeUndefined();
    expect(o.layers?.map((l) => l.name)).toContain('mindfront_cardigan_long_open_front');
    expect(o.mask).toBe(true);
  });

  it('a full garment replaces the base suit; a vest goes over it', () => {
    const w = wearer();
    addItem(w.inventory, makeItem('r_riot'));
    equip(w.inventory, 0);
    const o = wardrobeOutfit(w);
    expect(o.suit).toBe(BASE_OUTFIT.suit);
    expect(o.layers?.[0]?.name).toMatch(/tactical_vest/);
  });

  it('visible chrome adds parts; hidden chrome shows nothing', () => {
    const w = wearer();
    w.sheet.chrome = { legs: { id: 'ch_legs_spring', condition: 1, installedDay: 1 }, organs: { id: 'ch_org_heart', condition: 1, installedDay: 1 } };
    const kinds = wardrobeOutfit(w).gear!.map((g) => g.kind);
    expect(kinds).toEqual(['chrome_leg_l', 'chrome_leg_r']);
    expect(CHROME.ch_org_heart.visible).toBe(false);
  });

  it('the key changes with equipment and chrome', () => {
    const w = wearer();
    const k0 = wardrobeKey(w);
    addItem(w.inventory, makeItem('w_pipe'));
    equip(w.inventory, 0, 'primary');
    const k1 = wardrobeKey(w);
    w.sheet.chrome = { eyes: { id: 'ch_eye_scope', condition: 1, installedDay: 1 } };
    const k2 = wardrobeKey(w);
    expect(new Set([k0, k1, k2]).size).toBe(3);
  });
});

describe('a clothing set replaces what it covers', () => {
  it('the duster over a dressed NPC leaves one pair of trousers', () => {
    const w = wearer();
    addItem(w.inventory, makeItem('r_duster'));
    equip(w.inventory, 0);
    const base = { layers: [{ name: 'elvs_jeans_bootcut' }, { name: 'mindfront_tank_top_01' }, { name: 'maciekg_leather_boots' }, { name: 'jujube_newsboy_cap' }] };
    const o = wardrobeOutfit(w, base);
    const names = o.layers!.map((l) => l.name);
    expect(names).not.toContain('elvs_jeans_bootcut');
    expect(names).toContain('cortu_cargo_pants');
    expect(names).toContain('maciekg_leather_boots');
    expect(names).toContain('jujube_newsboy_cap');
  });
});

describe('every item has a sketch', () => {
  it('resolves to a drawn recipe, never the category fallback for weapons and armour', () => {
    for (const d of Object.values(ITEMS)) {
      const r = iconRecipe(d);
      expect(ICON_RECIPES, `${d.id} → ${r}`).toContain(r);
      if (d.weapon) expect(r, d.id).not.toBe('weapon');
      if (d.armor) expect(r, d.id).not.toBe('armor');
      if (!d.weapon && !d.armor && !d.icon) expect(r, `${d.id} needs an icon`).not.toBe(d.category);
    }
  });
});
