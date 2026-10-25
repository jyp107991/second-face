import { allMods, derived, modValue, type CharacterSheet, type Modifier } from '../stats/sheet';
import { isStackable, itemDef } from './items';

export interface ItemInst {
  def: string;
  qty: number;
  /** Condition 0..1 for weapons/armour. */
  cond?: number;
  /** Rounds currently loaded (weapons with magazines). */
  loaded?: number;
  /** Ammo item id currently loaded. */
  loadedAmmo?: string;
}

export const EQUIP_SLOTS = ['primary', 'secondary', 'body', 'head'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export interface Inventory {
  items: ItemInst[];
  equipped: Partial<Record<EquipSlot, ItemInst>>;
  /** Which weapon slot is in hand. */
  active: 'primary' | 'secondary';
  tolls: number;
}

export function emptyInventory(): Inventory {
  return { items: [], equipped: {}, active: 'primary', tolls: 0 };
}

export function makeItem(def: string, qty = 1, cond?: number): ItemInst {
  const d = itemDef(def);
  const inst: ItemInst = { def, qty };
  if (d.weapon || d.armor) inst.cond = cond ?? 1;
  if (d.weapon?.magazine) { inst.loaded = 0; inst.loadedAmmo = undefined; }
  return inst;
}

function sameStack(a: ItemInst, b: ItemInst): boolean {
  return a.def === b.def && isStackable(itemDef(a.def)) && a.cond === b.cond;
}

export function addItem(inv: Inventory, item: ItemInst): void {
  if (item.def === 'tolls') { inv.tolls += item.qty; return; }
  const existing = inv.items.find((i) => sameStack(i, item));
  if (existing) existing.qty += item.qty;
  else inv.items.push({ ...item });
}

export function countItem(inv: Inventory, def: string): number {
  if (def === 'tolls') return inv.tolls;
  return inv.items.filter((i) => i.def === def).reduce((n, i) => n + i.qty, 0);
}

/** Remove qty of an item def (from stacks first). Returns how many were removed. */
export function removeItem(inv: Inventory, def: string, qty = 1): number {
  if (def === 'tolls') { const n = Math.min(qty, inv.tolls); inv.tolls -= n; return n; }
  let left = qty;
  for (let i = inv.items.length - 1; i >= 0 && left > 0; i--) {
    const it = inv.items[i];
    if (it.def !== def) continue;
    const n = Math.min(left, it.qty);
    it.qty -= n;
    left -= n;
    if (it.qty <= 0) inv.items.splice(i, 1);
  }
  return qty - left;
}

/** Remove a specific instance (by index) and return it. */
export function takeAt(inv: Inventory, index: number, qty?: number): ItemInst | undefined {
  const it = inv.items[index];
  if (!it) return;
  const n = Math.min(qty ?? it.qty, it.qty);
  if (n >= it.qty) { inv.items.splice(index, 1); return it; }
  it.qty -= n;
  return { ...it, qty: n };
}

export function itemWeight(i: ItemInst): number {
  return itemDef(i.def).weight * i.qty;
}

export function totalWeight(inv: Inventory): number {
  let w = inv.items.reduce((n, i) => n + itemWeight(i), 0);
  for (const e of Object.values(inv.equipped)) if (e) w += itemWeight(e);
  return Math.round(w * 10) / 10;
}

export function overloaded(inv: Inventory, s: CharacterSheet): boolean {
  return totalWeight(inv) > derived(s).carry;
}

/** Value of an item instance in Tolls (condition matters). */
export function itemValue(i: ItemInst): number {
  const d = itemDef(i.def);
  const condK = i.cond === undefined ? 1 : 0.2 + 0.8 * i.cond;
  return Math.max(0, Math.round(d.value * condK)) * i.qty;
}

export function slotFor(def: string): EquipSlot[] {
  const d = itemDef(def);
  if (d.weapon) return ['primary', 'secondary'];
  if (d.armor) return [d.armor.slot];
  return [];
}

/** Equip the item at index into a slot (swapping any existing item back into the pack). */
export function equip(inv: Inventory, index: number, slot?: EquipSlot): boolean {
  const it = inv.items[index];
  if (!it) return false;
  const slots = slotFor(it.def);
  const target = slot ?? slots[0];
  if (!target || !slots.includes(target)) return false;
  const one = takeAt(inv, index, 1)!;
  const prev = inv.equipped[target];
  inv.equipped[target] = one;
  if (prev) addItem(inv, prev);
  return true;
}

export function unequip(inv: Inventory, slot: EquipSlot): void {
  const it = inv.equipped[slot];
  if (!it) return;
  delete inv.equipped[slot];
  addItem(inv, it);
}

export function activeWeapon(inv: Inventory): ItemInst | undefined {
  return inv.equipped[inv.active];
}

/** Modifiers from worn armour: DT/DR/rad resist scale with condition. */
export function gearModifiers(inv: Inventory): Modifier[] {
  const out: Modifier[] = [];
  for (const slot of ['body', 'head'] as const) {
    const it = inv.equipped[slot];
    if (!it) continue;
    const a = itemDef(it.def).armor!;
    const k = 0.5 + 0.5 * (it.cond ?? 1);
    out.push({ target: 'derived:dt', add: Math.round(a.dt * k) });
    out.push({ target: 'derived:dr', add: Math.round(a.dr * k) });
    if (a.radResist) out.push({ target: 'derived:radResist', add: a.radResist });
    if (a.stealth) out.push({ target: 'skill:stealth', add: -a.stealth });
    if (a.mods) out.push(...a.mods);
  }
  return out;
}

/** Keep sheet.gearMods in sync after any equipment change. */
export function syncGear(s: CharacterSheet, inv: Inventory): void {
  s.gearMods = gearModifiers(inv);
}

/** Reload the active weapon from inventory ammo. Returns rounds loaded (0 if none). */
export function reload(inv: Inventory, slot: 'primary' | 'secondary' = inv.active, preferAmmo?: string): number {
  const w = inv.equipped[slot];
  if (!w) return 0;
  const wd = itemDef(w.def).weapon;
  if (!wd?.magazine || !wd.ammo) return 0;
  // Ammo items whose ammo.type matches the weapon calibre.
  const candidates = inv.items.filter((i) => itemDef(i.def).ammo?.type === wd.ammo);
  let ammoId = preferAmmo ?? w.loadedAmmo;
  if (!ammoId || !candidates.some((c) => c.def === ammoId)) ammoId = candidates[0]?.def;
  if (!ammoId) return 0;
  // Switching ammo type: unload current rounds back to inventory first.
  if (w.loadedAmmo && w.loadedAmmo !== ammoId && (w.loaded ?? 0) > 0) {
    addItem(inv, { def: w.loadedAmmo, qty: w.loaded! });
    w.loaded = 0;
  }
  if (wd.magazine - (w.loaded ?? 0) <= 0) return 0;
  const n = removeItem(inv, ammoId, wd.magazine - (w.loaded ?? 0));
  w.loaded = (w.loaded ?? 0) + n;
  w.loadedAmmo = ammoId;
  return n;
}

export interface UseResult { ok: boolean; message: string; healed?: number; }

/** Apply a consumable from the pack to a character. */
export function useConsumable(inv: Inventory, index: number, s: CharacterSheet, now: number, roll: () => number = Math.random): UseResult {
  const it = inv.items[index];
  if (!it) return { ok: false, message: 'Nothing there.' };
  const d = itemDef(it.def);
  if (!d.consumable) return { ok: false, message: `You can't use ${d.name}.` };
  const mods = allMods(s);
  let healed = 0;
  for (const e of d.consumable.effects) {
    switch (e.kind) {
      case 'heal': {
        const amt = Math.round(modValue(mods, 'heal_items', e.amount));
        const before = s.hp;
        s.hp = Math.min(derived(s).maxHp, s.hp + amt);
        healed += s.hp - before;
        break;
      }
      case 'rads': s.rads = Math.max(0, s.rads + e.amount); break;
      case 'cureCripple': s.crippled = {}; break;
      case 'effect':
        s.effects = s.effects.filter((x) => x.id !== e.id);
        s.effects.push({ id: e.id, name: e.name, mods: e.mods, until: now + e.minutes });
        break;
      case 'addiction':
        if (roll() < e.chance && !s.effects.some((x) => x.id === e.effectId)) {
          s.effects.push({ id: e.effectId, name: 'Addiction', mods: [{ target: 'attr:reflex', add: -1 }, { target: 'attr:wits', add: -1 }] });
        }
        break;
      case 'food': case 'water': break; // survival needs handled by world systems (M4)
    }
  }
  removeItem(inv, it.def, 1);
  return { ok: true, message: healed ? `${d.name}: +${healed} HP` : `Used ${d.name}.`, healed };
}

/** Wear a weapon/armour piece by a small amount; returns true if it broke this time. */
export function wear(it: ItemInst, amount = 1): boolean {
  const d = itemDef(it.def);
  const dur = d.weapon?.durability ?? d.armor?.durability;
  if (!dur || it.cond === undefined) return false;
  const was = it.cond;
  it.cond = Math.max(0, it.cond - amount / dur);
  return was > 0 && it.cond === 0;
}
