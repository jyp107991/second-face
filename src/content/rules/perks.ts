import type { PerkDef } from '../../engine/stats/sheet';

/**
 * Perks, one pick every 2 levels. Prefer perks that unlock new verbs (flags handled by systems)
 * over flat bonuses.
 */
export const PERKS: Record<string, PerkDef> = {
  // --- Combat
  quick_draw: { id: 'quick_draw', name: 'Quick Draw', desc: 'Swapping weapons and reloading cost 1 AP less.', req: { level: 2, attrs: { reflex: 5 } }, flags: ['quick_draw'] },
  marksman: { id: 'marksman', name: 'Marksman', desc: 'Range penalties start 4 tiles further out.', ranks: 2, req: { level: 2, attrs: { senses: 6 } }, mods: [{ target: 'derived:sightRange', add: 4 }] },
  brute: { id: 'brute', name: 'Brute', desc: '+3 melee damage and you can shove enemies back a tile (2 AP).', ranks: 2, req: { level: 2, attrs: { brawn: 6 } }, mods: [{ target: 'dmg_melee', add: 3 }], flags: ['shove'] },
  bonebreaker: { id: 'bonebreaker', name: 'Bonebreaker', desc: 'Aimed melee and unarmed attacks cripple limbs twice as easily.', req: { level: 6, skills: { melee: 60 } }, flags: ['easy_cripple_melee'] },
  sniper_eye: { id: 'sniper_eye', name: 'Eye for Weakness', desc: '+5% critical chance on aimed shots.', ranks: 2, req: { level: 6, attrs: { senses: 7, fortune: 4 } }, flags: ['aimed_crit'] },
  mechanics_eye: { id: 'mechanics_eye', name: "Mechanic's Eye", desc: "See enemies' weapon condition; an aimed shot at a worn weapon can jam it.", req: { level: 6, skills: { mechanics: 60 } }, flags: ['see_condition', 'jam_shot'] },
  gunslinger: { id: 'gunslinger', name: 'Gunslinger', desc: 'Pistol shots cost 1 AP less.', req: { level: 10, skills: { firearms: 75 } }, flags: ['pistol_ap'] },
  hold_the_line: { id: 'hold_the_line', name: 'Hold the Line', desc: '+3 DT while in cover.', req: { level: 10, attrs: { grit: 6 } }, flags: ['cover_dt'] },
  last_stand: { id: 'last_stand', name: 'Last Stand', desc: 'Below 25% health you gain +2 AP and +10% hit chance.', req: { level: 14, attrs: { grit: 5 } }, flags: ['last_stand'] },
  overwatch: { id: 'overwatch', name: 'Overwatch', desc: 'End your turn with 4+ AP to shoot the first enemy who moves in sight.', req: { level: 14, attrs: { senses: 6, reflex: 6 } }, flags: ['overwatch'] },
  // --- Survival / exploration
  pathfinder: { id: 'pathfinder', name: 'Pathfinder', desc: 'World map travel is 25% faster and you spot ambushes more often.', req: { level: 2, skills: { survival: 40 } }, flags: ['fast_travel', 'spot_ambush'] },
  pack_mule: { id: 'pack_mule', name: 'Pack Mule', desc: '+25 kg carry weight.', ranks: 2, req: { level: 2, attrs: { brawn: 5 } }, mods: [{ target: 'derived:carry', add: 25 }] },
  rad_eater: { id: 'rad_eater', name: 'Rad-Eater', desc: '+25 radiation resistance; you can eat irradiated food with half the dose.', req: { level: 6, attrs: { grit: 6 } }, mods: [{ target: 'derived:radResist', add: 25 }], flags: ['rad_food'] },
  field_medic: { id: 'field_medic', name: 'Field Medic', desc: 'Healing items heal 40% more and you can treat crippled limbs without a doctor kit.', req: { level: 6, skills: { medicine: 60 } }, mods: [{ target: 'heal_items', mul: 1.4 }], flags: ['field_surgery'] },
  ghost_step: { id: 'ghost_step', name: 'Ghost Step', desc: 'Sneaking no longer slows you, and you can sneak in combat.', req: { level: 10, skills: { stealth: 70 } }, flags: ['fast_sneak', 'combat_sneak'] },
  handloader: { id: 'handloader', name: 'Handloader', desc: 'Craft ammunition from scrap at any workbench.', req: { level: 6, skills: { mechanics: 50 } }, flags: ['handload'] },
  scavenger: { id: 'scavenger', name: 'Scavenger', desc: 'Find a little extra ammo and scrap in ruins.', req: { level: 2, attrs: { fortune: 6 } }, flags: ['more_loot'] },
  // --- Social / mind
  confessor: { id: 'confessor', name: 'Confessor', desc: 'People who trust you deeply (Trust 50+) will reveal one secret each.', req: { level: 6, attrs: { presence: 6 } }, flags: ['confessor'] },
  silver_tongue: { id: 'silver_tongue', name: 'Silver Tongue', desc: '+10 Speech; failed persuasion can be retried once with a different approach.', req: { level: 2, attrs: { presence: 6 } }, mods: [{ target: 'skill:speech', add: 10 }], flags: ['speech_retry'] },
  haggler: { id: 'haggler', name: 'Haggler', desc: 'Buy for 10% less and sell for 10% more.', req: { level: 2, skills: { barter: 40 } }, mods: [{ target: 'price_buy', mul: 0.9 }, { target: 'price_sell', mul: 1.1 }] },
  cold_reader: { id: 'cold_reader', name: 'Cold Reader', desc: 'See the mood and motives of people you talk to; detect most lies.', req: { level: 6, attrs: { wits: 6, senses: 5 } }, flags: ['see_mood', 'detect_lies'] },
  leader: { id: 'leader', name: 'Leader', desc: '+1 companion slot; companions get +1 AP in combat.', req: { level: 10, attrs: { presence: 7 } }, mods: [{ target: 'derived:companions', add: 1 }], flags: ['leader'] },
  terrifying: { id: 'terrifying', name: 'Terrifying', desc: 'Enemies lose morale faster; Intimidate options appear more often.', req: { level: 10, attrs: { brawn: 6 } }, flags: ['terrifying'] },
  // --- Science / tech
  hacker: { id: 'hacker', name: 'Backdoor', desc: 'Terminals give you one extra attempt and show hints.', req: { level: 2, skills: { science: 50 } }, flags: ['hack_hint'] },
  chemist: { id: 'chemist', name: 'Chemist', desc: 'Chems last twice as long and you can brew them at a workbench.', req: { level: 6, skills: { science: 60 } }, flags: ['long_chems', 'brew'] },
  old_world_scholar: { id: 'old_world_scholar', name: 'Old-World Scholar', desc: 'Read pre-Burn records others cannot; +XP from discoveries.', req: { level: 6, attrs: { wits: 7 } }, flags: ['scholar'] },
  // --- Fortune
  strange_luck: { id: 'strange_luck', name: 'Strange Luck', desc: 'Odd things happen to you on the road. More unusual encounters.', req: { level: 2, attrs: { fortune: 7 } }, flags: ['odd_encounters'] },
  better_criticals: { id: 'better_criticals', name: 'Mean Streak', desc: 'Critical hits deal 50% more damage.', req: { level: 10, attrs: { fortune: 6, senses: 6 } }, mods: [{ target: 'crit_dmg', mul: 1.5 }] },
  // --- General
  toughness: { id: 'toughness', name: 'Hide Like Leather', desc: '+2 DT and +10% DR.', ranks: 3, req: { level: 2 }, mods: [{ target: 'derived:dt', add: 2 }, { target: 'derived:dr', add: 10 }] },
  quick_learner: { id: 'quick_learner', name: 'Quick Learner', desc: '+10% experience from everything.', ranks: 2, req: { level: 2, attrs: { wits: 5 } }, mods: [{ target: 'xp', mul: 1.1 }] },
  lifegiver: { id: 'lifegiver', name: 'Second Wind', desc: '+4 health per level (retroactive).', ranks: 2, req: { level: 6, attrs: { grit: 4 } }, flags: ['lifegiver'] },
  educated: { id: 'educated', name: 'Educated', desc: '+2 skill points per level.', req: { level: 2, attrs: { wits: 6 } }, mods: [{ target: 'derived:skillPointsPerLevel', add: 2 }] },
  // --- Gunplay (verbs)
  double_tap: { id: 'double_tap', name: 'Double Tap', desc: 'After a hit with a pistol or rifle, a second shot at the same target costs 2 AP less.', req: { level: 4, skills: { firearms: 45 } }, flags: ['double_tap'] },
  suppressing_fire: { id: 'suppressing_fire', name: 'Suppressing Fire', desc: 'Bursts can pin a target: they lose 2 AP on their next turn and won\'t leave cover.', req: { level: 6, skills: { firearms: 55 } }, flags: ['suppress'] },
  trick_shot: { id: 'trick_shot', name: 'Trick Shot', desc: 'Ricochet a shot off hard surfaces to hit enemies in full cover (−25% to hit).', req: { level: 10, skills: { firearms: 75 }, attrs: { senses: 7 } }, flags: ['ricochet'] },
  fan_the_hammer: { id: 'fan_the_hammer', name: 'Fan the Hammer', desc: 'Empty a revolver at one target in a single action, wildly.', req: { level: 8, skills: { firearms: 60 }, attrs: { reflex: 7 } }, flags: ['fan_fire'] },
  // --- Close quarters
  cleave: { id: 'cleave', name: 'Follow-Through', desc: 'A melee kill grants a free attack on an adjacent enemy.', req: { level: 6, skills: { melee: 55 } }, flags: ['cleave'] },
  grappler: { id: 'grappler', name: 'Grappler', desc: 'Grab an adjacent enemy: they can\'t act and shield you from fire until they break free.', req: { level: 8, skills: { melee: 60 }, attrs: { brawn: 6 } }, flags: ['grab'] },
  charge: { id: 'charge', name: 'Charge', desc: 'Move and strike in one action; damage rises with distance covered.', req: { level: 4, attrs: { brawn: 6, reflex: 5 } }, flags: ['charge'] },
  // --- Explosives
  demolitions: { id: 'demolitions', name: 'Demolitions', desc: '+25% explosive damage and +1 tile blast radius.', ranks: 2, req: { level: 4, skills: { explosives: 45 } }, flags: ['demolitions'] },
  cook_off: { id: 'cook_off', name: 'Cook-Off', desc: 'Hold a grenade a beat longer: it bursts in the air and ignores cover.', req: { level: 8, skills: { explosives: 60 } }, flags: ['airburst'] },
  mine_layer: { id: 'mine_layer', name: 'Mine Layer', desc: 'Plant mines and traps during combat (3 AP).', req: { level: 6, skills: { explosives: 50 } }, flags: ['combat_mines'] },
  // --- Tech
  machine_tongue: { id: 'machine_tongue', name: 'Machine Tongue', desc: 'Talk to machines and old intelligences as equals: new dialogue with robots and AIs; hostile robots hesitate.', req: { level: 6, skills: { science: 55 } }, flags: ['machine_talk'] },
  arc_tuner: { id: 'arc_tuner', name: 'Arc Tuner', desc: 'Arc weapons ignore 5 DT and crit more often.', req: { level: 6, skills: { arc: 55 } }, flags: ['arc_tuned'] },
  salvager_perk: { id: 'salvager_perk', name: 'Strip-Down', desc: 'Destroyed robots and turrets yield rare parts and cells.', req: { level: 4, skills: { mechanics: 40 } }, flags: ['robot_salvage'] },
  // --- Stealth
  shadow_strike: { id: 'shadow_strike', name: 'Shadow Strike', desc: 'Attacks from hiding are automatic criticals.', req: { level: 8, skills: { stealth: 60 } }, flags: ['sneak_crit'] },
  light_step: { id: 'light_step', name: 'Light Step', desc: 'You never set off pressure plates or tripwires.', req: { level: 4, attrs: { reflex: 6 } }, flags: ['light_step'] },
  quick_fingers: { id: 'quick_fingers', name: 'Quick Fingers', desc: 'Steal equipped weapons and armour pieces, not just pocket contents.', req: { level: 10, skills: { stealth: 70 } }, flags: ['steal_equipped'] },
  // --- Social
  interrogator: { id: 'interrogator', name: 'Interrogator', desc: 'Intimidation checks may use Brawn ×10 instead of Speech; frightened people tell more.', req: { level: 4, attrs: { brawn: 6 } }, flags: ['brawn_intimidate'] },
  peacemaker: { id: 'peacemaker', name: 'Peacemaker', desc: 'Once per fight, call for a parley mid-combat (Speech check vs the enemy\'s morale).', req: { level: 8, skills: { speech: 65 } }, flags: ['parley'] },
  charmer: { id: 'charmer', name: 'Charmer', desc: 'Flirtatious and warm options with people drawn to you; attraction counts as trust in some checks.', req: { level: 2, attrs: { presence: 6 } }, flags: ['charm'] },
  negotiator: { id: 'negotiator', name: 'Negotiator', desc: 'Ask for more on quest rewards; contracts pay 25% more.', req: { level: 6, skills: { barter: 55 } }, flags: ['negotiate'] },
  liar: { id: 'liar', name: 'Practised Liar', desc: 'Deception options appear more often and are 10 easier.', req: { level: 4, skills: { speech: 45 } }, flags: ['liar'] },
  // --- Survival
  forager: { id: 'forager', name: 'Forager', desc: 'Find food and water while travelling; camp costs nothing.', req: { level: 2, skills: { survival: 35 } }, flags: ['forage'] },
  beast_friend: { id: 'beast_friend', name: 'Beast Friend', desc: 'Wild animals are wary of attacking you; some can be calmed or befriended.', req: { level: 6, skills: { survival: 55 } }, flags: ['beast_friend'] },
  tough_as_nails: { id: 'tough_as_nails', name: 'Tough as Nails', desc: 'The first crippling hit each fight is shrugged off.', req: { level: 6, attrs: { grit: 7 } }, flags: ['cripple_shrug'] },
  night_walker: { id: 'night_walker', name: 'Night Walker', desc: 'Darkness penalties halved; +15 Stealth at night.', req: { level: 4, attrs: { senses: 6 } }, flags: ['night_walker'] },
  // --- Leadership
  inspiring: { id: 'inspiring', name: 'Inspiring', desc: 'Companions gain +10% to hit and never flee while you stand.', req: { level: 6, attrs: { presence: 6 } }, flags: ['inspire'] },
  tactician: { id: 'tactician', name: 'Tactician', desc: 'Position your companions before combat starts; they act first in the opening round.', req: { level: 10, attrs: { presence: 6, wits: 6 } }, flags: ['tactician'] },
  loyalty: { id: 'loyalty', name: 'Bonds', desc: 'Companion approval losses are halved, and they forgive one red line.', req: { level: 8, attrs: { presence: 7 } }, flags: ['bonds'] },
  // --- Fortune
  lucky_find: { id: 'lucky_find', name: 'Lucky Find', desc: 'Once per location, a container holds something it shouldn\'t.', req: { level: 4, attrs: { fortune: 6 } }, flags: ['lucky_find'] },
  second_chance: { id: 'second_chance', name: 'Not Today', desc: 'Once a day, a killing blow leaves you at 1 health instead.', req: { level: 10, attrs: { fortune: 7 } }, flags: ['not_today'] },
  // --- Body
  iron_stomach: { id: 'iron_stomach', name: 'Iron Stomach', desc: 'Spoiled, irradiated or strange food is safe to eat.', req: { level: 2, attrs: { grit: 5 } }, flags: ['iron_stomach'] },
  adrenaline: { id: 'adrenaline', name: 'Adrenaline', desc: 'Being hit gives +1 AP on your next turn (max +2).', req: { level: 6, attrs: { grit: 6, reflex: 5 } }, flags: ['adrenaline'] },
};
