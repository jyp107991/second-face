import type { SkillId } from '../stats/rules';
import type { Modifier } from '../stats/sheet';

export type ItemCategory = 'weapon' | 'ammo' | 'armor' | 'consumable' | 'junk' | 'tool' | 'key' | 'note' | 'misc';
export type DamageType = 'ballistic' | 'energy' | 'fire' | 'blunt' | 'blade' | 'explosive';
export type WeaponKind = 'pistol' | 'rifle' | 'shotgun' | 'smg' | 'heavy' | 'arc' | 'melee' | 'unarmed' | 'thrown';

export interface WeaponDef {
  skill: SkillId;
  kind: WeaponKind;
  hands: 1 | 2;
  dmg: [number, number];
  dmgType: DamageType;
  /** AP for a normal attack; aimed shots cost +1. */
  ap: number;
  burst?: { rounds: number; ap: number };
  /** Effective range in tiles (melee = 1). */
  range: number;
  ammo?: string;
  magazine?: number;
  minBrawn?: number;
  critMult?: number;
  /** Noise radius in tiles (alerts NPCs). */
  noise?: number;
  /** Area radius for explosives / spread for shotguns. */
  area?: number;
  /** Max condition points; each use may wear it. */
  durability: number;
  /** Consumed on use (thrown weapons). */
  consumable?: boolean;
}

export interface AmmoDef {
  type: string;
  dmgMult: number;
  /** Subtracted from target DT (penetration). */
  dtPen: number;
  /** Added to target DR (hollow points < 0 vs unarmoured). */
  drMod: number;
}

export interface ArmorDef {
  slot: 'body' | 'head';
  dt: number;
  dr: number;
  radResist?: number;
  /** Stealth skill penalty. */
  stealth?: number;
  durability: number;
  mods?: Modifier[];
}

export type ConsumableEffect =
  | { kind: 'heal'; amount: number; overSec?: number }
  | { kind: 'rads'; amount: number }
  | { kind: 'cureCripple' }
  | { kind: 'effect'; id: string; name: string; mods: Modifier[]; minutes: number }
  | { kind: 'addiction'; chance: number; effectId: string }
  | { kind: 'food'; amount: number }
  | { kind: 'water'; amount: number };

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  category: ItemCategory;
  weight: number;
  /** Base value in Tolls at full condition. */
  value: number;
  /** Stacks (default: ammo, consumables, junk). */
  stack?: boolean;
  weapon?: WeaponDef;
  ammo?: AmmoDef;
  armor?: ArmorDef;
  consumable?: { effects: ConsumableEffect[]; ap?: number; skill?: SkillId };
  /** Junk breakdown into crafting parts. */
  parts?: Record<string, number>;
  tags?: string[];
  /** Procedural icon recipe key. */
  icon?: string;
}

export function isStackable(d: ItemDef): boolean {
  return d.stack ?? ['ammo', 'consumable', 'junk'].includes(d.category);
}

let itemDb: Record<string, ItemDef> = {};
export function registerItems(items: Record<string, ItemDef>): void { itemDb = items; }
export function itemDef(id: string): ItemDef {
  const d = itemDb[id];
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}
export function allItems(): Record<string, ItemDef> { return itemDb; }
