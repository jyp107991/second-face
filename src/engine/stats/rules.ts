/** Core character rules: attributes, skills, derived stats. Content (traits/perks) lives in src/content/rules. */

export const ATTRIBUTES = ['brawn', 'senses', 'grit', 'presence', 'wits', 'reflex', 'fortune'] as const;
export type AttributeId = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_INFO: Record<AttributeId, { name: string; short: string; desc: string }> = {
  brawn: { name: 'Brawn', short: 'BRN', desc: 'Raw strength. Carry weight, melee damage, heavy weapons, a little health.' },
  senses: { name: 'Senses', short: 'SNS', desc: 'Sight, hearing, instinct. Weapon range, spotting traps and hidden things, noticing what others miss.' },
  grit: { name: 'Grit', short: 'GRT', desc: 'Toughness and stamina. Health, healing, resistance to radiation and poison, long marches.' },
  presence: { name: 'Presence', short: 'PRS', desc: 'Force of personality. How people react to you, prices, followers.' },
  wits: { name: 'Wits', short: 'WIT', desc: 'Intelligence and memory. Skill points, science and medicine, seeing through lies.' },
  reflex: { name: 'Reflex', short: 'RFX', desc: 'Speed and coordination. Action points, initiative, firearms, stealth.' },
  fortune: { name: 'Fortune', short: 'FRT', desc: 'The world bending your way. Critical hits, odd encounters, finds, gambling.' },
};

export const ATTR_MIN = 1;
export const ATTR_MAX = 10;
export const ATTR_BASE = 3;
/** Points to distribute at creation on top of base 3 in each attribute. */
export const ATTR_CREATION_POINTS = 12;

export const SKILLS = [
  'firearms', 'heavy', 'arc', 'melee', 'unarmed', 'throwing',
  'medicine', 'mechanics', 'science', 'stealth', 'sleight', 'locks',
  'speech', 'barter', 'survival', 'gambling',
] as const;
export type SkillId = (typeof SKILLS)[number];

type A = Record<AttributeId, number>;

export const SKILL_INFO: Record<SkillId, { name: string; group: 'combat' | 'active' | 'social'; desc: string; base: (a: A) => number }> = {
  firearms: { name: 'Firearms', group: 'combat', desc: 'Pistols, rifles, shotguns.', base: (a) => 5 + 4 * a.reflex },
  heavy: { name: 'Heavy Arms', group: 'combat', desc: 'Machine guns, launchers, flamers.', base: (a) => 2 * a.brawn + 2 * a.reflex },
  arc: { name: 'Arc Weapons', group: 'combat', desc: 'Pre-Burn energy weapons.', base: (a) => 2 * a.reflex + a.wits },
  melee: { name: 'Melee', group: 'combat', desc: 'Knives, clubs, spears.', base: (a) => 20 + 2 * (a.brawn + a.reflex) },
  unarmed: { name: 'Unarmed', group: 'combat', desc: 'Fists, knuckles, grapples.', base: (a) => 30 + 2 * (a.brawn + a.reflex) },
  throwing: { name: 'Throwing', group: 'combat', desc: 'Knives, grenades, molotovs.', base: (a) => 4 * a.reflex },
  medicine: { name: 'Medicine', group: 'active', desc: 'Healing wounds, curing poison, surgery, chems.', base: (a) => 5 + 2 * (a.wits + a.senses) },
  mechanics: { name: 'Mechanics', group: 'active', desc: 'Repair, traps, machines, reloading ammo.', base: (a) => 3 * a.wits + a.reflex },
  science: { name: 'Science', group: 'active', desc: 'Terminals, electronics, chemistry, old-world knowledge.', base: (a) => 4 * a.wits },
  stealth: { name: 'Stealth', group: 'active', desc: 'Moving unseen and unheard.', base: (a) => 5 + 3 * a.reflex },
  sleight: { name: 'Sleight', group: 'active', desc: 'Picking pockets, planting items.', base: (a) => 3 * a.reflex + a.senses },
  locks: { name: 'Locks', group: 'active', desc: 'Opening locks without keys.', base: (a) => 10 + a.senses + 2 * a.reflex },
  speech: { name: 'Speech', group: 'social', desc: 'Persuasion, lies, intimidation, calm.', base: (a) => 5 * a.presence },
  barter: { name: 'Barter', group: 'social', desc: 'Prices, haggling, appraisal.', base: (a) => 4 * a.presence },
  survival: { name: 'Survival', group: 'social', desc: 'Travel, food, tracking, camp, avoiding ambushes.', base: (a) => 2 * (a.grit + a.wits) },
  gambling: { name: 'Gambling', group: 'social', desc: 'Cards, dice, wagers, reading a bluff.', base: (a) => 5 * a.fortune },
};

export const SKILL_MAX = 150;
export const TAG_COUNT = 3;
export const TAG_BONUS = 20;

/** Derived statistics. */
export interface Derived {
  maxHp: number;
  ap: number;
  carry: number;
  initiative: number;
  crit: number;
  healRate: number;
  /** Damage threshold / resistance from the character alone (armour adds more). */
  dt: number;
  dr: number;
  radResist: number;
  poisonResist: number;
  /** Tiles at which ranged penalties start. */
  sightRange: number;
  /** Max companions that will follow you. */
  companions: number;
  skillPointsPerLevel: number;
}

/** XP needed to *reach* level n (n ≥ 1). Level 2 = 750, 3 = 2250, 4 = 4500, ... */
export function xpForLevel(n: number): number {
  return (750 * n * (n - 1)) / 2;
}

export const LEVEL_CAP = 30;
export const PERK_EVERY = 3;
