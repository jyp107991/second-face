import type { SkillId } from '../stats/rules';
import type { GearKind } from '../assets/human/gear';
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
  /** Raw food: cooking at a camp turns it into this item. */
  cookTo?: string;
  /** Notes and papers: the conversation tree opened by "Read" in the pack (the text, the cipher, the choices). */
  read?: string;
  /** Junk breakdown into crafting parts. */
  parts?: Record<string, number>;
  tags?: string[];
  /** Ink-sketch icon recipe (ui/icons.ts); inferred from the category and visuals when absent. */
  icon?: string;
  /** What the item puts on the body when worn (armor). */
  wear?: WearVisual;
  /** The shape in the hand when it is the active weapon. */
  held?: HeldShape;
}

/** Worn visuals: a catalogue garment (replacing the base clothes of its slot) and/or procedural pieces. */
export interface WearVisual {
  /** Garment proxy name, or one per fit: a full garment replaces the base suit, anything else goes over it. */
  garment?: string | { m: string; f: string };
  tint?: number;
  /** A whole set of clothes instead of the base suit (a coat over trousers, say), in draw order. */
  garments?: { name: string | { m: string; f: string }; tint?: number; dye?: number; grime?: number; wear?: number }[];
  gear?: { kind: GearKind; color?: number }[];
  /** The gas mask. */
  mask?: boolean;
}

export type HeldShape =
  | 'knife' | 'pipe' | 'machete' | 'spear' | 'knuckles' | 'sledge' | 'bottle' | 'can' | 'spike'
  | 'zip' | 'revolver' | 'pistol' | 'smg' | 'sawnoff' | 'shotgun' | 'rifle' | 'carbine' | 'arc';

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
