import type { Outfit } from '../assets/humanoid';
import type { GearLook } from '../assets/human/gear';
import type { Appearance } from '../data/appearance';
import { GARMENTS } from '../data/garments';
import { installedChrome, type ChromeGrade, type ChromeSlot } from '../stats/chrome';
import type { CharacterSheet } from '../stats/sheet';
import { allItems, itemDef } from './items';
import type { Inventory } from './inventory';

/**
 * What a body wears is read off the inventory and the chrome, so the figure in the world and the one in the
 * notebook change the moment something is equipped, taken off, or installed.
 */

/** What everyone from the Cistern walks out in. */
export const BASE_OUTFIT: Outfit = { layers: [{ name: 'cortu_cargo_pants', dye: 0x5a5e54, grime: 0.25 }, { name: 'toigo_basic_tucked_t-shirt', dye: 0x8a8c80, grime: 0.2 }, { name: 'maciekg_leather_boots', grime: 0.3 }] };

export interface Wearer { sheet: CharacterSheet; inventory: Inventory; appearance?: Appearance }

/** Plating finish and the lit accent by make: salvaged pre-Burn (gunmetal, amber), Mender-built (matte black, red),
 *  Concern (pearl, cyan). */
const CHROME_PLATE: Record<ChromeGrade, number> = { old: 0x6c7074, dark: 0x26282c, concern: 0xd6d8da };
const CHROME_ACCENT: Record<ChromeGrade, number> = { old: 0xffa030, dark: 0xff3838, concern: 0x3fe0ff };

const CHROME_GEAR: Record<ChromeSlot, GearLook['kind'][]> = {
  eyes: ['chrome_eye'], neural: ['chrome_neural'], armL: ['chrome_arm_l'], armR: ['chrome_arm_r'],
  legs: ['chrome_leg_l', 'chrome_leg_r'], spine: ['chrome_spine'], skin: ['chrome_skin'], organs: [],
};

/** The outfit for a wearer: base clothes, then worn armour over or instead of them, the active weapon, visible chrome. */
export function wardrobeOutfit(pc: Wearer, base: Outfit = BASE_OUTFIT): Outfit {
  const inv = pc.inventory;
  const fit = (pc.appearance?.shape.gender ?? 1) > 0.5 ? 'm' : 'f';
  const o: Outfit = { ...base, layers: [...(base.layers ?? [])], gear: [...(base.gear ?? [])], held: undefined, mask: base.mask };
  for (const slot of ['body', 'head'] as const) {
    const it = inv.equipped[slot];
    const w = it ? itemDef(it.def).wear : undefined;
    if (!w) continue;
    if (w.garments) {
      // A whole set of clothes: it replaces the base suit and whatever the base wore on top and legs.
      o.suit = undefined;
      o.layers = o.layers!.filter((l) => !['top', 'legs', 'full'].includes(GARMENTS[l.name]?.slot ?? ''));
      for (const g of w.garments) o.layers.push({ name: typeof g.name === 'string' ? g.name : g.name[fit], tint: g.tint, dye: g.dye, grime: g.grime, wear: g.wear });
    }
    if (w.garment) {
      const name = typeof w.garment === 'string' ? w.garment : w.garment[fit];
      const slotOf = GARMENTS[name]?.slot;
      // A full garment replaces the base suit; anything else (vest, hat, mask) goes over it.
      if (slot === 'body' && (!slotOf || slotOf === 'full' || slotOf === 'top')) { o.suit = name; o.suitTint = w.tint; }
      else o.layers!.push({ name, tint: w.tint });
    }
    for (const g of w.gear ?? []) o.gear!.push({ kind: g.kind, color: g.color });
    if (w.mask) o.mask = true;
  }
  const active = inv.equipped[inv.active];
  o.held = active ? itemDef(active.def).held : undefined;
  for (const c of installedChrome(pc.sheet)) {
    if (!c.def.visible) continue;
    for (const kind of CHROME_GEAR[c.slot]) o.gear!.push({ kind, color: CHROME_PLATE[c.def.grade], accent: CHROME_ACCENT[c.def.grade], grade: c.def.grade, wear: 1 - c.piece.condition });
  }
  return o;
}

/** Changes whenever the outfit would: compare per frame instead of rebuilding the figure. */
export function wardrobeKey(pc: Wearer): string {
  const inv = pc.inventory;
  const e = inv.equipped;
  return `${e.body?.def ?? ''}|${e.head?.def ?? ''}|${e[inv.active]?.def ?? ''}|${installedChrome(pc.sheet).map((c) => c.piece.id).join(',')}`;
}

/** Proxy keys for every garment any item can put on a body (loaded once, so equipping never waits). */
export function wearProxyKeys(): string[] {
  const out = new Set<string>();
  for (const d of Object.values(allItems())) {
    const all = [...(d.wear?.garment ? [d.wear.garment] : []), ...(d.wear?.garments ?? []).map((g) => g.name)];
    for (const g of all) for (const name of typeof g === 'string' ? [g] : [g.m, g.f]) out.add(`clothes_${name}`);
  }
  return [...out];
}
