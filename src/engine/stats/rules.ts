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
/** Highest value allowed at character creation; 9–10 are earned in play. */
export const ATTR_CREATION_MAX = 8;
export const ATTR_BASE = 3;
/** Points to distribute at creation on top of base 3 in each attribute. */
export const ATTR_CREATION_POINTS = 12;

export const SKILLS = [
  'firearms', 'arc', 'melee', 'explosives',
  'medicine', 'mechanics', 'science', 'security', 'stealth',
  'speech', 'barter', 'survival',
] as const;
export type SkillId = (typeof SKILLS)[number];

type A = Record<AttributeId, number>;

/** Base values at creation sit around 10–35 with average attributes; skills cap at 100. */
export const SKILL_INFO: Record<SkillId, { name: string; group: 'combat' | 'active' | 'social'; desc: string; base: (a: A) => number }> = {
  firearms: { name: 'Firearms', group: 'combat', desc: 'Pistols, rifles, shotguns, machine guns (heavy guns need Brawn).', base: (a) => 2 + 3 * a.reflex + a.senses },
  arc: { name: 'Arc Weapons', group: 'combat', desc: 'Pre-Burn energy weapons.', base: (a) => 2 * a.reflex + 2 * a.wits },
  melee: { name: 'Melee', group: 'combat', desc: 'Blades, clubs, spears, fists and grapples.', base: (a) => 10 + 2 * a.brawn + 2 * a.reflex },
  explosives: { name: 'Explosives', group: 'combat', desc: 'Grenades, thrown weapons, mines, launchers; disarming bombs.', base: (a) => 2 * a.reflex + a.wits + a.senses },
  medicine: { name: 'Medicine', group: 'active', desc: 'Healing, surgery, chems, diagnosing the sick.', base: (a) => 2 * (a.wits + a.senses) },
  mechanics: { name: 'Mechanics', group: 'active', desc: 'Repair, crafting, ammunition, machines and vehicles.', base: (a) => 3 * a.wits + a.reflex },
  science: { name: 'Science', group: 'active', desc: 'Terminals, electronics, chemistry, old-world records.', base: (a) => 4 * a.wits },
  security: { name: 'Security', group: 'active', desc: 'Locks, safes, alarms and traps.', base: (a) => 2 * (a.reflex + a.senses) },
  stealth: { name: 'Stealth', group: 'active', desc: 'Sneaking, picking pockets, planting items.', base: (a) => 5 + 3 * a.reflex },
  speech: { name: 'Speech', group: 'social', desc: 'Persuade, deceive, intimidate, calm.', base: (a) => 4 * a.presence + a.wits },
  barter: { name: 'Barter', group: 'social', desc: 'Prices, appraisal, deals and contracts.', base: (a) => 3 * a.presence + a.wits },
  survival: { name: 'Survival', group: 'social', desc: 'Travel, tracking, food, camps, animals, reading the land.', base: (a) => 2 * (a.grit + a.senses) },
};

export const SKILL_MAX = 100;
export const TAG_COUNT = 3;
export const TAG_BONUS = 15;
/** Check tiers used by all content. */
export const CHECK_TIERS = { novice: 25, adept: 50, expert: 75, master: 100 } as const;

/**
 * Skill masteries: free verbs unlocked at skill 50 and 100 (flags read by systems, like perk flags).
 * They reward specialization without spending perk picks.
 */
export const MASTERIES: Record<SkillId, [{ name: string; desc: string; flag: string }, { name: string; desc: string; flag: string }]> = {
  firearms: [{ name: 'Steady Hands', desc: 'Aimed shots cost no extra AP with pistols and rifles.', flag: 'm_firearms_aim' }, { name: 'Dead Eye', desc: 'Once per fight, a shot that cannot miss.', flag: 'm_firearms_deadeye' }],
  arc: [{ name: 'Overcharge', desc: 'Overcharge a cell for double damage at the risk of burning out the weapon.', flag: 'm_arc_overcharge' }, { name: 'Arc Chain', desc: 'Arc hits leap to a second target in reach.', flag: 'm_arc_chain' }],
  melee: [{ name: 'Disarm', desc: 'Strike an enemy\'s weapon from their hands.', flag: 'm_melee_disarm' }, { name: 'Riposte', desc: 'Missed melee attacks against you can be answered for free.', flag: 'm_melee_riposte' }],
  explosives: [{ name: 'Sapper', desc: 'Disarm mines and keep them; craft simple charges.', flag: 'm_expl_sapper' }, { name: 'Shaped Charge', desc: 'Breach walls and doors marked as weak.', flag: 'm_expl_breach' }],
  medicine: [{ name: 'Triage', desc: 'Stabilise downed allies and treat crippled limbs in the field.', flag: 'm_med_triage' }, { name: 'Surgeon', desc: 'Operate: remove implants, save the dying, perform procedures others cannot.', flag: 'm_med_surgeon' }],
  mechanics: [{ name: 'Jury-Rig', desc: 'Repair gear with parts from unrelated items.', flag: 'm_mech_jury' }, { name: 'Machinist', desc: 'Build turrets and modify weapons with unique mods.', flag: 'm_mech_machinist' }],
  science: [{ name: 'Backchannel', desc: 'Read terminal logs others cannot; turn hostile machines off.', flag: 'm_sci_backchannel' }, { name: 'Override', desc: 'Take control of robots and automated defences.', flag: 'm_sci_override' }],
  security: [{ name: 'Salvager', desc: 'Disarmed traps yield parts.', flag: 'm_sec_salvage' }, { name: 'Trapsmith', desc: 'Re-arm traps against your enemies.', flag: 'm_sec_rearm' }],
  stealth: [{ name: 'Plant', desc: 'Plant items in pockets (evidence, explosives, keys).', flag: 'm_stealth_plant' }, { name: 'Vanish', desc: 'Break line of sight in combat to slip back into hiding.', flag: 'm_stealth_vanish' }],
  speech: [{ name: 'Read the Room', desc: 'See how each person present will react before you speak.', flag: 'm_speech_read' }, { name: 'Last Word', desc: 'End most fights before they start, if you are heard.', flag: 'm_speech_lastword' }],
  barter: [{ name: 'Appraiser', desc: 'See true value and origin of items; spot fakes.', flag: 'm_barter_appraise' }, { name: 'Contracts', desc: 'Strike standing deals: supply runs, shares, debts that pay.', flag: 'm_barter_contracts' }],
  survival: [{ name: 'Tracker', desc: 'Follow tracks on maps and the world map; foresee ambushes.', flag: 'm_surv_tracker' }, { name: 'Wasteborn', desc: 'Live off the land: no food or water costs when travelling.', flag: 'm_surv_wasteborn' }],
};

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
export const PERK_EVERY = 2;
