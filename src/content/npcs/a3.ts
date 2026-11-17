import type { NpcDef } from '../../engine/npc/defs';

/**
 * Act 3's people (B6; each slice adds its own here). B6b: the Precinct courier who carries the Ledger's paper by hand
 * (`npc_a3_01`, at the mouth of the lane to the Spire once Act 3 is open), and the two recall wardens who came down from the
 * Spire with Unit 9's sheet (`npc_a3_g1/g2`, inside the Precinct gate while the recall is open). The city's grey, pressed
 * and worn soft at the elbows; the recall wardens' with the Spire's white piping at the cuff; the courier's satchel coat
 * buttoned to the throat. Faces bare. Story notes: story/B6_NOTES_SECRET.md §2.3 (18, 18b).
 */
const PRECINCT = { team: 'wardens', settlement: 'meridian', faction: 'wardens' } as const;
/** The recall wardens: hostile only if drawn on over the unit (or in a fight with the whole Precinct). */
const recall = { ...PRECINCT, role: 'guard' as const, hostileIf: { any: [{ flag: 'a3_recall_fight' }, { flag: 'md_fight' }] }, courage: 70, dialogue: 'd_a3_recall' };

export const A3_NPCS: NpcDef[] = [
  {
    // the courier: twelve years up and down the lane between the slot at the Spire's foot and wherever the paper says
    id: 'npc_a3_01', name: 'Selma Ruud', look: { seed: 9361, frame: 'narrow', age: 31, ancestry: 'north_european', over: { hair: { style: 'ponytail01', color: 0x5a4632 }, weathering: 0.3 } }, role: 'corp',
    level: 2, ...PRECINCT, team: 'neutral', courage: 35, dialogue: 'd_a3_courier', attrs: { reflex: 7, wits: 6 }, skills: { survival: 30, speech: 30 }, tolls: 15,
    schedule: [{ from: 6, to: 22, spot: 'courier_post', activity: 'idle' }, { from: 22, to: 6, activity: 'away' }],
    barks: ['Signed for. Carried. Back to the slot.', 'I don\'t read them. I carry them.', 'Paper comes down the lane. Receipts go up it.'],
  },
  {
    // the older recall warden: a face that has stood at a great many doors, and said the same thing at all of them
    id: 'npc_a3_g1', name: 'Warden', look: { seed: 9362, frame: 'narrow', age: 46, ancestry: 'mediterranean', over: { hair: { style: 'cut_crop', color: 0x2a2018 }, weathering: 0.45 } }, ...recall,
    level: 6, attrs: { presence: 7, grit: 7 }, skills: { firearms: 45, speech: 40 }, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 14]], tolls: 10,
    schedule: [{ from: 0, to: 24, spot: 'recall_a', activity: 'work' }],
    barks: ['The keeper will present the unit.', 'The schedule is brought forward. Not hurried.'],
  },
  {
    // the young one: two years in the Spire's grey, and this far down the lane for the first time
    id: 'npc_a3_g2', name: 'Warden', look: { seed: 9363, frame: 'broad', age: 24, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, weathering: 0.3 } }, ...recall,
    level: 5, attrs: { reflex: 7, brawn: 6 }, skills: { firearms: 40, melee: 35 }, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 12]], tolls: 6,
    schedule: [{ from: 0, to: 24, spot: 'recall_b', activity: 'work' }],
    barks: ['Clause 9. I had to learn it on the way down.', 'We don\'t usually come this far down the lane.'],
  },
];
