import type { PerkDef } from '../../engine/stats/sheet';

/**
 * Perks, one pick every 3 levels. Prefer perks that unlock new verbs (flags handled by systems)
 * over flat bonuses.
 */
export const PERKS: Record<string, PerkDef> = {
  // --- Combat
  quick_draw: { id: 'quick_draw', name: 'Quick Draw', desc: 'Swapping weapons and reloading cost 1 AP less.', req: { level: 3, attrs: { reflex: 5 } }, flags: ['quick_draw'] },
  marksman: { id: 'marksman', name: 'Marksman', desc: 'Range penalties start 4 tiles further out.', ranks: 2, req: { level: 3, attrs: { senses: 6 } }, mods: [{ target: 'derived:sightRange', add: 4 }] },
  brute: { id: 'brute', name: 'Brute', desc: '+3 melee damage and you can shove enemies back a tile (2 AP).', ranks: 2, req: { level: 3, attrs: { brawn: 6 } }, mods: [{ target: 'dmg_melee', add: 3 }], flags: ['shove'] },
  bonebreaker: { id: 'bonebreaker', name: 'Bonebreaker', desc: 'Aimed melee and unarmed attacks cripple limbs twice as easily.', req: { level: 6, skills: { unarmed: 60 } }, flags: ['easy_cripple_melee'] },
  sniper_eye: { id: 'sniper_eye', name: 'Eye for Weakness', desc: '+5% critical chance on aimed shots.', ranks: 2, req: { level: 6, attrs: { senses: 7, fortune: 4 } }, flags: ['aimed_crit'] },
  mechanics_eye: { id: 'mechanics_eye', name: "Mechanic's Eye", desc: "See enemies' weapon condition; an aimed shot at a worn weapon can jam it.", req: { level: 6, skills: { mechanics: 60 } }, flags: ['see_condition', 'jam_shot'] },
  gunslinger: { id: 'gunslinger', name: 'Gunslinger', desc: 'Pistol shots cost 1 AP less.', req: { level: 9, skills: { firearms: 75 } }, flags: ['pistol_ap'] },
  hold_the_line: { id: 'hold_the_line', name: 'Hold the Line', desc: '+3 DT while in cover.', req: { level: 9, attrs: { grit: 6 } }, flags: ['cover_dt'] },
  last_stand: { id: 'last_stand', name: 'Last Stand', desc: 'Below 25% health you gain +2 AP and +10% hit chance.', req: { level: 12, attrs: { grit: 5 } }, flags: ['last_stand'] },
  overwatch: { id: 'overwatch', name: 'Overwatch', desc: 'End your turn with 4+ AP to shoot the first enemy who moves in sight.', req: { level: 12, attrs: { senses: 6, reflex: 6 } }, flags: ['overwatch'] },
  // --- Survival / exploration
  pathfinder: { id: 'pathfinder', name: 'Pathfinder', desc: 'World map travel is 25% faster and you spot ambushes more often.', req: { level: 3, skills: { survival: 40 } }, flags: ['fast_travel', 'spot_ambush'] },
  pack_mule: { id: 'pack_mule', name: 'Pack Mule', desc: '+25 kg carry weight.', ranks: 2, req: { level: 3, attrs: { brawn: 5 } }, mods: [{ target: 'derived:carry', add: 25 }] },
  rad_eater: { id: 'rad_eater', name: 'Rad-Eater', desc: '+25 radiation resistance; you can eat irradiated food with half the dose.', req: { level: 6, attrs: { grit: 6 } }, mods: [{ target: 'derived:radResist', add: 25 }], flags: ['rad_food'] },
  field_medic: { id: 'field_medic', name: 'Field Medic', desc: 'Healing items heal 40% more and you can treat crippled limbs without a doctor kit.', req: { level: 6, skills: { medicine: 60 } }, mods: [{ target: 'heal_items', mul: 1.4 }], flags: ['field_surgery'] },
  ghost_step: { id: 'ghost_step', name: 'Ghost Step', desc: 'Sneaking no longer slows you, and you can sneak in combat.', req: { level: 9, skills: { stealth: 70 } }, flags: ['fast_sneak', 'combat_sneak'] },
  handloader: { id: 'handloader', name: 'Handloader', desc: 'Craft ammunition from scrap at any workbench.', req: { level: 6, skills: { mechanics: 50 } }, flags: ['handload'] },
  scavenger: { id: 'scavenger', name: 'Scavenger', desc: 'Find a little extra ammo and scrap in ruins.', req: { level: 3, attrs: { fortune: 6 } }, flags: ['more_loot'] },
  // --- Social / mind
  confessor: { id: 'confessor', name: 'Confessor', desc: 'People who trust you deeply (Trust 50+) will reveal one secret each.', req: { level: 6, attrs: { presence: 6 } }, flags: ['confessor'] },
  silver_tongue: { id: 'silver_tongue', name: 'Silver Tongue', desc: '+10 Speech; failed persuasion can be retried once with a different approach.', req: { level: 3, attrs: { presence: 6 } }, mods: [{ target: 'skill:speech', add: 10 }], flags: ['speech_retry'] },
  haggler: { id: 'haggler', name: 'Haggler', desc: 'Buy for 10% less and sell for 10% more.', req: { level: 3, skills: { barter: 40 } }, mods: [{ target: 'price_buy', mul: 0.9 }, { target: 'price_sell', mul: 1.1 }] },
  cold_reader: { id: 'cold_reader', name: 'Cold Reader', desc: 'See the mood and motives of people you talk to; detect most lies.', req: { level: 6, attrs: { wits: 6, senses: 5 } }, flags: ['see_mood', 'detect_lies'] },
  leader: { id: 'leader', name: 'Leader', desc: '+1 companion slot; companions get +1 AP in combat.', req: { level: 9, attrs: { presence: 7 } }, mods: [{ target: 'derived:companions', add: 1 }], flags: ['leader'] },
  terrifying: { id: 'terrifying', name: 'Terrifying', desc: 'Enemies lose morale faster; Intimidate options appear more often.', req: { level: 9, attrs: { brawn: 6 } }, flags: ['terrifying'] },
  // --- Science / tech
  hacker: { id: 'hacker', name: 'Backdoor', desc: 'Terminals give you one extra attempt and show hints.', req: { level: 3, skills: { science: 50 } }, flags: ['hack_hint'] },
  chemist: { id: 'chemist', name: 'Chemist', desc: 'Chems last twice as long and you can brew them at a workbench.', req: { level: 6, skills: { science: 60 } }, flags: ['long_chems', 'brew'] },
  old_world_scholar: { id: 'old_world_scholar', name: 'Old-World Scholar', desc: 'Read pre-Burn records others cannot; +XP from discoveries.', req: { level: 6, attrs: { wits: 7 } }, flags: ['scholar'] },
  // --- Fortune
  strange_luck: { id: 'strange_luck', name: 'Strange Luck', desc: 'Odd things happen to you on the road. More unusual encounters.', req: { level: 3, attrs: { fortune: 7 } }, flags: ['odd_encounters'] },
  better_criticals: { id: 'better_criticals', name: 'Mean Streak', desc: 'Critical hits deal 50% more damage.', req: { level: 9, attrs: { fortune: 6, senses: 6 } }, mods: [{ target: 'crit_dmg', mul: 1.5 }] },
  // --- General
  toughness: { id: 'toughness', name: 'Hide Like Leather', desc: '+2 DT and +10% DR.', ranks: 3, req: { level: 3 }, mods: [{ target: 'derived:dt', add: 2 }, { target: 'derived:dr', add: 10 }] },
  quick_learner: { id: 'quick_learner', name: 'Quick Learner', desc: '+10% experience from everything.', ranks: 2, req: { level: 3, attrs: { wits: 5 } }, mods: [{ target: 'xp', mul: 1.1 }] },
  lifegiver: { id: 'lifegiver', name: 'Second Wind', desc: '+4 health per level (retroactive).', ranks: 2, req: { level: 6, attrs: { grit: 4 } }, flags: ['lifegiver'] },
  educated: { id: 'educated', name: 'Educated', desc: '+2 skill points per level.', req: { level: 3, attrs: { wits: 6 } }, mods: [{ target: 'derived:skillPointsPerLevel', add: 2 }] },
};
