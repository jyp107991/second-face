import { Rng } from '../core/rng';
import {
  ATTRIBUTES, ATTR_BASE, ATTR_CREATION_MAX, ATTR_CREATION_POINTS, ATTR_MAX, ATTR_MIN, LEVEL_CAP, MASTERIES, PERK_EVERY, SKILLS, SKILL_INFO, SKILL_MAX,
  TAG_BONUS, TAG_COUNT, xpForLevel, type AttributeId, type Derived, type SkillId,
} from './rules';
import { chromeAbilities, chromeMods, type ChromeSlot, type InstalledChrome } from './chrome';

// ---------------------------------------------------------------------------------------------
// Modifiers: the common currency of traits, perks, chems, injuries and gear.
// ---------------------------------------------------------------------------------------------

export type ModTarget = `attr:${AttributeId}` | `skill:${SkillId}` | `derived:${keyof Derived}` | `skills:all` | 'xp' | 'price_buy' | 'price_sell' | 'dmg_melee' | 'dmg_ranged' | 'hit_ranged' | 'hit_melee' | 'crit_dmg' | 'ap_cost_ranged' | 'heal_items';

export interface Modifier {
  target: ModTarget;
  /** Additive change (points / percent points). */
  add?: number;
  /** Multiplicative change applied after adds (1 = none). */
  mul?: number;
}

export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  mods: Modifier[];
  /** Verb/behaviour flags checked by systems (e.g. 'no_two_handed'). */
  flags?: string[];
}

export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  ranks?: number;
  req: { level: number; attrs?: Partial<Record<AttributeId, number>>; skills?: Partial<Record<SkillId, number>>; notTraits?: string[] };
  mods?: Modifier[];
  flags?: string[];
}

export interface RulesDb {
  traits: Record<string, TraitDef>;
  perks: Record<string, PerkDef>;
}

let db: RulesDb = { traits: {}, perks: {} };
export function registerRules(rules: RulesDb): void { db = rules; }
export function rulesDb(): RulesDb { return db; }

// ---------------------------------------------------------------------------------------------
// Character sheet
// ---------------------------------------------------------------------------------------------

export const BODY_PARTS = ['head', 'eyes', 'torso', 'armL', 'armR', 'legL', 'legR', 'groin'] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export interface ActiveEffect {
  id: string;
  name: string;
  mods: Modifier[];
  /** Game minute at which it ends; undefined = until removed. */
  until?: number;
}

export interface CharacterSheet {
  name: string;
  level: number;
  xp: number;
  baseAttrs: Record<AttributeId, number>;
  /** Attribute points above base this character may spend at creation: the standard 12, or whatever was rolled. */
  creationPool?: number;
  /** Percentage points bought with skill points (not the points themselves). */
  skillBought: Record<SkillId, number>;
  tagged: SkillId[];
  traits: string[];
  perks: Record<string, number>;
  unspentSkill: number;
  pendingPerks: number;
  hp: number;
  rads: number;
  crippled: Partial<Record<BodyPart, boolean>>;
  effects: ActiveEffect[];
  /** Extra modifiers from equipped gear (recomputed by inventory). */
  gearMods?: Modifier[];
  /** Perks from faction ranks (world/factions.ts syncMembership). */
  factionMods?: Modifier[];
  factionFlags?: string[];
  /** Installed chrome by slot (stats/chrome.ts). */
  chrome?: Partial<Record<ChromeSlot, InstalledChrome>>;
  /** Current Drift 0..100. */
  drift?: number;
}

export function emptySheet(name = 'Resident'): CharacterSheet {
  // Default spread uses all creation points: 5 in five attributes, 4 in two (3×7 + 12 = 33).
  const baseAttrs = Object.fromEntries(ATTRIBUTES.map((a) => [a, ATTR_BASE + 2])) as Record<AttributeId, number>;
  baseAttrs.presence = ATTR_BASE + 1;
  baseAttrs.fortune = ATTR_BASE + 1;
  const s: CharacterSheet = {
    name, level: 1, xp: 0, baseAttrs,
    skillBought: Object.fromEntries(SKILLS.map((k) => [k, 0])) as Record<SkillId, number>,
    tagged: [], traits: [], perks: {}, unspentSkill: 0, pendingPerks: 0, hp: 1, rads: 0, crippled: {}, effects: [],
  };
  s.hp = derived(s).maxHp;
  return s;
}

/** All modifiers currently affecting the character. */
export function allMods(s: CharacterSheet): Modifier[] {
  const out: Modifier[] = [];
  for (const t of s.traits) out.push(...(db.traits[t]?.mods ?? []));
  for (const [p, rank] of Object.entries(s.perks)) for (let i = 0; i < rank; i++) out.push(...(db.perks[p]?.mods ?? []));
  for (const e of s.effects) out.push(...e.mods);
  if (s.gearMods) out.push(...s.gearMods);
  if (s.chrome) out.push(...chromeMods(s));
  if (s.factionMods) out.push(...s.factionMods);
  // Crippled limbs
  if (s.crippled.legL || s.crippled.legR) out.push({ target: 'derived:ap', add: -1 });
  if (s.crippled.armL || s.crippled.armR) out.push({ target: 'hit_ranged', add: -15 }, { target: 'hit_melee', add: -10 });
  if (s.crippled.eyes) out.push({ target: 'attr:senses', add: -3 });
  // Radiation sickness tiers
  const radTier = s.rads >= 800 ? 3 : s.rads >= 500 ? 2 : s.rads >= 200 ? 1 : 0;
  if (radTier) out.push({ target: 'attr:grit', add: -radTier }, { target: 'attr:reflex', add: -Math.max(0, radTier - 1) }, { target: 'attr:brawn', add: -Math.max(0, radTier - 1) });
  return out;
}

export function modValue(mods: Modifier[], target: ModTarget, base: number): number {
  let add = 0, mul = 1;
  for (const m of mods) {
    if (m.target !== target) continue;
    add += m.add ?? 0;
    mul *= m.mul ?? 1;
  }
  return (base + add) * mul;
}

/** Sum of additive modifiers for a scalar target with base 0 (e.g. 'hit_ranged'). */
export function modSum(s: CharacterSheet, target: ModTarget): number {
  return modValue(allMods(s), target, 0);
}

export function hasFlag(s: CharacterSheet, flag: string): boolean {
  if (s.traits.some((t) => db.traits[t]?.flags?.includes(flag)) || Object.keys(s.perks).some((p) => db.perks[p]?.flags?.includes(flag))) return true;
  if (s.chrome && flag.startsWith('chrome_') && chromeAbilities(s).includes(flag)) return true;
  if (s.factionFlags?.includes(flag)) return true;
  // Skill masteries (verbs at 50 and 100).
  if (flag.startsWith('m_')) {
    for (const k of SKILLS) {
      const [m50, m100] = MASTERIES[k];
      if (m50.flag === flag) return skill(s, k) >= 50;
      if (m100.flag === flag) return skill(s, k) >= 100;
    }
  }
  return false;
}

export function attr(s: CharacterSheet, a: AttributeId, mods = allMods(s)): number {
  return Math.round(Math.max(ATTR_MIN, Math.min(ATTR_MAX + 2, modValue(mods, `attr:${a}`, s.baseAttrs[a]))));
}

export function attrs(s: CharacterSheet): Record<AttributeId, number> {
  const mods = allMods(s);
  return Object.fromEntries(ATTRIBUTES.map((a) => [a, attr(s, a, mods)])) as Record<AttributeId, number>;
}

export function skill(s: CharacterSheet, k: SkillId, mods = allMods(s)): number {
  const a = Object.fromEntries(ATTRIBUTES.map((x) => [x, attr(s, x, mods)])) as Record<AttributeId, number>;
  let v = SKILL_INFO[k].base(a) + (s.tagged.includes(k) ? TAG_BONUS : 0) + s.skillBought[k];
  v = modValue(mods, 'skills:all', v);
  v = modValue(mods, `skill:${k}`, v);
  return Math.round(Math.max(0, Math.min(SKILL_MAX, v)));
}

export function skills(s: CharacterSheet): Record<SkillId, number> {
  const mods = allMods(s);
  return Object.fromEntries(SKILLS.map((k) => [k, skill(s, k, mods)])) as Record<SkillId, number>;
}

export function derived(s: CharacterSheet): Derived {
  const mods = allMods(s);
  const a = Object.fromEntries(ATTRIBUTES.map((x) => [x, attr(s, x, mods)])) as Record<AttributeId, number>;
  const base: Derived = {
    maxHp: 15 + 2 * a.brawn + 3 * a.grit + (s.level - 1) * (2 + Math.floor(a.grit / 2)) + 4 * s.level * (s.perks.lifegiver ?? 0),
    ap: 5 + Math.floor(a.reflex / 2),
    carry: 25 + 15 * a.brawn,
    initiative: 2 * a.senses + a.reflex,
    crit: a.fortune,
    healRate: Math.max(1, Math.floor(a.grit / 3)),
    dt: 0,
    dr: 0,
    radResist: 2 * a.grit,
    poisonResist: 5 * a.grit,
    sightRange: 2 * a.senses + 4,
    companions: Math.max(1, Math.min(3, Math.floor(a.presence / 4) + 1)),
    skillPointsPerLevel: 8 + a.wits,
  };
  const out = { ...base };
  for (const k of Object.keys(base) as (keyof Derived)[]) out[k] = Math.round(modValue(mods, `derived:${k}`, base[k]));
  return out;
}

// ---------------------------------------------------------------------------------------------
// Creation & progression
// ---------------------------------------------------------------------------------------------

/** Remaining creation points given base attributes (base 3 each, plus the pool: the standard 12 or a roll). */
export function creationPointsLeft(baseAttrs: Record<AttributeId, number>, pool = ATTR_CREATION_POINTS): number {
  const spent = ATTRIBUTES.reduce((n, a) => n + (baseAttrs[a] - ATTR_BASE), 0);
  return pool - spent;
}

/**
 * Roll a start, the old way: each attribute gets base plus a wide roll (two below to five above), so the pool runs
 * from well below the standard 12 to far above it. The player rerolls as often as they like, keeps the best, and
 * moves points about within the roll's total.
 */
export function rollAttributes(rng: Rng): { attrs: Record<AttributeId, number>; pool: number } {
  const attrs = {} as Record<AttributeId, number>;
  let pool = 0;
  for (const a of ATTRIBUTES) {
    // Wide: each attribute can land two below base or five above it (mean a little under +2), so a whole roll runs
    // from a cripplingly poor start to a superb one. The player rerolls as often as they like and keeps the best.
    const d = rng.int(-2, 2) + rng.int(0, 3) + rng.pick([0, 0, 1]);
    attrs[a] = Math.max(ATTR_MIN, Math.min(ATTR_CREATION_MAX, ATTR_BASE + d));
    pool += attrs[a] - ATTR_BASE;
  }
  return { attrs, pool };
}

export function validateCreation(s: CharacterSheet): string[] {
  const errs: string[] = [];
  if (!s.name.trim()) errs.push('Choose a name.');
  if (creationPointsLeft(s.baseAttrs, s.creationPool ?? ATTR_CREATION_POINTS) !== 0) errs.push('Distribute all attribute points.');
  for (const a of ATTRIBUTES) if (s.baseAttrs[a] < ATTR_MIN || s.baseAttrs[a] > ATTR_CREATION_MAX) errs.push(`Attribute out of range: ${a}`);
  if (s.tagged.length !== TAG_COUNT) errs.push(`Tag exactly ${TAG_COUNT} skills.`);
  if (s.traits.length > 2) errs.push('At most two traits.');
  return errs;
}

/** Skill points needed to raise a skill by one step, and the step size. */
export function raiseCost(s: CharacterSheet, k: SkillId): { cost: number; gain: number } {
  return { cost: 1, gain: s.tagged.includes(k) ? 2 : 1 };
}

export function raiseSkill(s: CharacterSheet, k: SkillId): boolean {
  if (skill(s, k) >= SKILL_MAX) return false;
  const { cost, gain } = raiseCost(s, k);
  if (s.unspentSkill < cost) return false;
  s.unspentSkill -= cost;
  s.skillBought[k] += gain;
  return true;
}

/** Add XP; returns number of levels gained. Grants skill points, HP and perk picks. */
export function addXp(s: CharacterSheet, amount: number): number {
  const mult = modValue(allMods(s), 'xp', 1);
  s.xp += Math.round(amount * mult);
  let gained = 0;
  while (s.level < LEVEL_CAP && s.xp >= xpForLevel(s.level + 1)) {
    const before = derived(s).maxHp;
    s.level++;
    gained++;
    s.unspentSkill += derived(s).skillPointsPerLevel;
    s.hp += derived(s).maxHp - before;
    if (s.level % PERK_EVERY === 0) s.pendingPerks++;
  }
  return gained;
}

export function perkAvailable(s: CharacterSheet, id: string): boolean {
  const p = db.perks[id];
  if (!p) return false;
  if ((s.perks[id] ?? 0) >= (p.ranks ?? 1)) return false;
  if (s.level < p.req.level) return false;
  const a = attrs(s), k = skills(s);
  for (const [x, v] of Object.entries(p.req.attrs ?? {})) if (a[x as AttributeId] < v!) return false;
  for (const [x, v] of Object.entries(p.req.skills ?? {})) if (k[x as SkillId] < v!) return false;
  if (p.req.notTraits?.some((t) => s.traits.includes(t))) return false;
  return true;
}

export function takePerk(s: CharacterSheet, id: string): boolean {
  if (s.pendingPerks <= 0 || !perkAvailable(s, id)) return false;
  s.perks[id] = (s.perks[id] ?? 0) + 1;
  s.pendingPerks--;
  return true;
}

/** Remove expired temporary effects. */
export function tickEffects(s: CharacterSheet, nowMinutes: number): ActiveEffect[] {
  const expired = s.effects.filter((e) => e.until !== undefined && e.until <= nowMinutes);
  s.effects = s.effects.filter((e) => !expired.includes(e));
  return expired;
}
