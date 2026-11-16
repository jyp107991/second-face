import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, the Archive Spire and the Court of Accounts (Act 2, B3.11). The close is the Precinct's own ground: wardens in
 * grey keep it and turn only if the Precinct does (`md_fight`). The assessor on the bench is a municipal unit, not a
 * person; the voice at the top of the stair is never placed (the def exists for the speaker's name, like MOTHER's).
 */
const SP = { team: 'wardens', settlement: 'meridian', faction: 'wardens' } as const;
const warden = { ...SP, role: 'guard' as const, hostileIf: { flag: 'md_fight' }, courage: 70 };
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const SPIRE_NPCS: NpcDef[] = [
  {
    id: 'npc_ar_01', name: 'Assessor Three', look: { seed: 9801, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'none', color: 0x404040 }, facialHair: 'none', skinTone: 0.4, skinUndertone: -1, freckles: 0, weathering: 0 } }, role: 'corp',
    // Unit 3: Nine's pattern, the same week's issue, never refitted — grey plating, a brass plate, a lens that has never
    // cracked. The nearest the human rig gets to a machine until it has a machine skin (B3 backlog, as Nine).
    outfit: { layers: [{ name: 'matcreator_mc-skinsuit_2022', dye: 0x5e646c, grime: 0.02, wear: 0.15 }, { name: 'mindfront_patrol_cap', dye: 0x3e444c, grime: 0.02 }, { name: 'toigo_gloves_short', dye: 0x34383e }], grime: 0.02, wear: 0.15 },
    level: 7, team: 'neutral', settlement: 'meridian', faction: 'wardens', courage: 60, dialogue: 'd_ca_court', attrs: { wits: 10, senses: 8, grit: 8, presence: 6 }, skills: { science: 70, speech: 50, barter: 45 }, tolls: 0,
    schedule: [{ from: 0, to: 24, spot: 'bench', activity: 'work' }],
    barks: ['The Court reads what is on the rail. It reads nothing else.', 'Entered.', 'A ruling is a line in the register. The next case is read against it.'],
  },
  {
    id: 'npc_ar_02', name: 'Florin Abazi', look: { seed: 9802, frame: 'broad', age: 57, ancestry: 'mediterranean', over: { hair: { style: 'paint_buzz', color: 0x8a8580 }, facialHair: 'stubble', weathering: 0.45 } }, role: 'corp',
    level: 2, ...SP, team: 'neutral', courage: 30, dialogue: 'd_ca_usher', attrs: { wits: 7, presence: 6 }, skills: { speech: 35, barter: 30 }, tolls: 25,
    schedule: [{ from: 7, to: 20, spot: 'usher', activity: 'work' }, sleep('usher_door', 20, 7)],
    barks: ['The schedule says now. It always says now, when somebody asks.', 'Eleven times called. Twelve is unlucky; I\'d rather somebody answered.', 'Bring everything. It reads everything.'],
  },
  {
    id: 'npc_ar_03', name: 'Keeper Junko Marwood', look: { seed: 9803, frame: 'narrow', age: 63, ancestry: 'east_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x9a9690 }, weathering: 0.3 } }, role: 'corp',
    level: 3, ...SP, team: 'neutral', courage: 35, dialogue: 'd_ar_keeper', attrs: { wits: 9, senses: 8, presence: 5 }, skills: { science: 55, speech: 40, barter: 40 }, tolls: 160,
    schedule: [{ from: 7, to: 21, spot: 'keeper', activity: 'work' }, sleep('keeper', 21, 7)],
    barks: ['Everything written in this city is written once and kept here.', 'Slip first. Then the index. Then wait.', 'A record nobody reads is a grave with a number on it.'],
  },
  {
    id: 'npc_ar_04', name: 'Comfort Asamoah', look: { seed: 9804, frame: 'narrow', age: 71, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0xb4aea4 }, weathering: 0.65 } }, role: 'settler',
    level: 1, team: 'neutral', settlement: 'meridian', courage: 30, dialogue: 'd_ar_copyist', attrs: { wits: 9, senses: 6, grit: 7 }, skills: { speech: 35, science: 40 }, tolls: 3,
    schedule: [{ from: 6, to: 22, spot: 'copyist', activity: 'work' }, sleep('copyist_cot', 22, 6)],
    barks: ['Held: the dead do not open doors to a third knock.', 'Case three hundred and two, R19. Nobody remembers it. I do.', 'Ink. Bring ink, if you\'re bringing anything.'],
  },
  {
    id: 'npc_ar_05', name: 'Hemant Joshi', look: { seed: 9805, frame: 'broad', age: 38, ancestry: 'south_asian', over: { hair: { style: 'cut_crop', color: 0x16120e }, facialHair: 'stubble', weathering: 0.35 } }, role: 'labourer',
    level: 3, ...SP, team: 'neutral', courage: 40, dialogue: 'd_ar_stair', attrs: { brawn: 6, senses: 5, grit: 6 }, skills: { melee: 30, barter: 25 }, tolls: 40,
    schedule: [{ from: 6, to: 22, spot: 'porter', activity: 'work' }, sleep('porter', 22, 6)],
    barks: ['Slip, or the lens.', 'Ninety-one landings. I\'ve lit every one.', 'The lift\'s dead. The lift\'s been dead since before the Plan.'],
  },
  {
    id: 'npc_ar_06', name: 'Gideon Faulk', look: { seed: 9806, frame: 'broad', age: 52, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x5a4a3a }, facialHair: 'full_beard', weathering: 0.6 } }, role: 'labourer',
    level: 3, ...SP, team: 'neutral', courage: 45, dialogue: 'd_ar_foreman', attrs: { brawn: 7, grit: 7, wits: 6 }, skills: { mechanics: 45, melee: 30 }, tolls: 35,
    schedule: [{ from: 7, to: 19, spot: 'scaffold', activity: 'work' }, { from: 19, to: 7, activity: 'away' }],
    barks: ['R30 works. Every stone numbered, every stone back where it was.', 'The steps reopen R49. Board says so. I\'ll be dead; the board won\'t.', 'Don\'t stand on my planks.'],
  },
  {
    id: 'npc_ar_07', name: 'Marisol Quiroga', look: { seed: 9807, frame: 'narrow', age: 44, ancestry: 'latin_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x1e1612 }, weathering: 0.5 } }, role: 'settler',
    level: 1, ...SP, team: 'neutral', courage: 35, dialogue: 'd_ar_marisol', attrs: { grit: 6, presence: 6 }, skills: { speech: 30 }, tolls: 8,
    schedule: [{ from: 8, to: 18, spot: 'petitioner', activity: 'idle' }, { from: 18, to: 8, activity: 'away' }],
    barks: ['Ahead of plan, the notice says. I didn\'t know I was ahead of anything.', 'Case four hundred and nine. They said today. They always say today.', 'You read it, they say. It reads everything.'],
  },
  /** The Ledger's voice at the top of the stair: a grille in a round room; never placed. */
  { id: 'npc_ar_voice', name: 'Ledger', look: { seed: 9809 }, role: 'corp', level: 1, team: 'neutral', settlement: 'meridian', courage: 0 },
  // wardens: the court door, the lane
  { id: 'npc_ar_g1', name: 'Warden', look: { seed: 9821, frame: 'narrow', age: 31, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x120e0b } } }, ...warden, level: 5, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 12]], schedule: [{ from: 0, to: 24, spot: 'court_door', activity: 'work' }], barks: ['The Court is in session when a case is called.', 'Quiet at the rail.'] },
  { id: 'npc_ar_g2', name: 'Warden', look: { seed: 9822, frame: 'broad', age: 36, ancestry: 'southeast_asian', over: { hair: { style: 'cut_crop', color: 0x16120e } } }, ...warden, level: 5, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], schedule: [{ from: 0, to: 24, spot: 'lane_post', activity: 'work' }], barks: ['The close is the Precinct\'s. The same law.', 'The steps are closed. The works say so.'] },
];
