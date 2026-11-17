import type { NpcDef } from '../../engine/npc/defs';

/**
 * Act 3 at Knock (B6f): the people who came to the home hamlet with the city's fourth order. Placed on Knock's map by
 * `tools/maps/gen_knock.py`. Story notes: story/B6_NOTES_SECRET.md §2.3 (20a) and "As built" → B6f.
 *
 * - The column's four wardens (`npc_a3_g3..g6`), camped on the toll road opposite the stand under Captain Lowe (or his
 *   sergeant): the Precinct's grey, pressed and worn soft at the elbows, faces bare, polite because the order says the
 *   residents are not to be frightened. Hostile only if the door comes to a fight (`a3_door_fight`, B6j) or the whole
 *   Precinct already has (`md_fight`).
 * - The guild's two hound handlers (`npc_a3_g11/g12`), with the guild's party when it brought hounds on leads
 *   (`a3_hounds_in`): oilskin over the guild's green, gauntlets to the elbow. The hounds themselves are the runtime's (a
 *   stand-in until a live hound exists); here they are in the handlers' mouths.
 * - Three of the Unwritten (`npc_a3_u1..u3`), at Knock by night with Petra Mason, or led by the first of them if Petra is
 *   dead: the Choir's undyed homespun gone grey on the road, hoods down, faces bare to the lamp (they keep no likeness by
 *   refusing lenses and portraits, never by masking). What they came to do, and their trees, are B6g's (`dialogue/a3_forces.ts`).
 */
const COLUMN = { team: 'wardens', faction: 'wardens', settlement: 'meridian', role: 'guard' as const, courage: 70, hostileIf: { any: [{ flag: 'a3_door_fight' }, { flag: 'md_fight' }] } };
const HANDLERS = { team: 'tollmen', faction: 'tollmen', settlement: 'ninebridge', role: 'guard' as const, courage: 55, dialogue: 'd_a3_handlers' };
/** B6g: hostile only once drawn on at the apron (`a3_uw_fight`), until the map's after-trigger settles it (`a3_unwritten`). */
const UNWRITTEN = { team: 'unwritten', faction: 'choir', settlement: 'openfield', role: 'pilgrim' as const, courage: 80, hostileIf: { all: [{ flag: 'a3_uw_fight' }, { not: { flag: 'a3_unwritten' } }] } };

export const A3_KNOCK_NPCS: NpcDef[] = [
  // the column
  {
    // the senior warden: thirty years of doors, and the one who answers when the captain is not by
    id: 'npc_a3_g3', name: 'Warden Garrick Kress', look: { seed: 9391, frame: 'broad', age: 51, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x5a4a3c }, facialHair: 'stubble_heavy', weathering: 0.55 } }, ...COLUMN,
    level: 7, dialogue: 'd_a3_warden', attrs: { grit: 8, presence: 6 }, skills: { firearms: 50, speech: 35 }, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 16], ['c_water', 1]], tolls: 12,
    barks: ['Morning. The captain is at the table, if you want him.', 'Nobody is to be frightened. It is in the order.', 'We brought our own water. We will take none of yours.'],
  },
  {
    // the one who keeps the column's book: what came up the road, what was drunk, who passed the end of the lane
    id: 'npc_a3_g4', name: 'Warden Suri Pahl', look: { seed: 9392, frame: 'narrow', age: 33, ancestry: 'south_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x1a1410 }, weathering: 0.4 } }, ...COLUMN,
    level: 6, attrs: { wits: 7, senses: 7 }, skills: { firearms: 45 }, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 12]], tolls: 8,
    barks: ['Two barrels in, none out. Entered.', 'Good morning. Your name is on the sheet. Ours are not.', 'The children wave. I am not sure I should wave back.'],
  },
  {
    // the youngest of the four: the Precinct's grey since he was eighteen, and never this far down the toll road
    id: 'npc_a3_g5', name: 'Warden Selwyn Okeke', look: { seed: 9393, frame: 'broad', age: 26, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, weathering: 0.35 } }, ...COLUMN,
    level: 5, attrs: { reflex: 7, brawn: 6 }, skills: { firearms: 45, melee: 35 }, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], tolls: 6,
    barks: ['It hums. The door. Did you know it hums?', 'Sixty benches. I counted them on the way down.', 'Morning, designate. Sorry. Morning.'],
  },
  {
    // the one at the apron, who watches the door by day and does not touch it
    id: 'npc_a3_g6', name: 'Warden Odalys Tolland', look: { seed: 9394, frame: 'narrow', age: 40, ancestry: 'latin_american', over: { hair: { style: 'ponytail01', color: 0x2a1e14 }, weathering: 0.5 } }, ...COLUMN,
    level: 6, attrs: { grit: 7, senses: 7 }, skills: { firearms: 50 }, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 12]], tolls: 9,
    barks: ['The door is watched, not touched. Those are my orders.', 'Mind the apron. It is slippery where the old woman sits.', 'Nobody has knocked. I would have heard.'],
  },
  // the guild's hound handlers
  {
    id: 'npc_a3_g11', name: 'Ansgar Wilmot', look: { seed: 9395, frame: 'broad', age: 44, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0x6a5a48 }, facialHair: 'full_beard', weathering: 0.65 } }, ...HANDLERS,
    level: 6, attrs: { grit: 7, senses: 7 }, skills: { firearms: 45, survival: 45 }, equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 8]], tolls: 20,
    barks: ['She\'s asleep. They\'re always asleep, till they aren\'t.', 'Don\'t look her in the lens. She doesn\'t like it. I don\'t like it.', 'The guild feeds them. Don\'t ask on what.'],
  },
  {
    id: 'npc_a3_g12', name: 'Ebun Nkemelu', look: { seed: 9396, frame: 'narrow', age: 29, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x16120e }, weathering: 0.45 } }, ...HANDLERS,
    level: 5, attrs: { reflex: 7, wits: 6 }, skills: { firearms: 45 }, equip: ['w_carbine556', 'r_duster'], inventory: [['a_556', 10]], tolls: 14,
    barks: ['Leads stay short. That\'s the job.', 'They came out of the ground warm. Think about that.', 'Hold still. She\'s counting you.'],
  },
  // the Unwritten at Knock, by night
  {
    // leads them at Knock when Petra Mason is dead
    id: 'npc_a3_u1', name: 'Juniper Lowry', look: { seed: 9397, frame: 'narrow', age: 36, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x7a6a50 }, weathering: 0.7 } }, ...UNWRITTEN,
    level: 6, dialogue: 'd_a3_petra', attrs: { wits: 7, presence: 7, grit: 7 }, skills: { stealth: 50, melee: 40, speech: 40 }, equip: ['w_machete'], inventory: [['c_water', 1]], tolls: 4,
    barks: ['Don\'t draw me. Don\'t keep me. Look, and then forget.', 'The sky keeps no books.', 'Petra would have known what to say. I only know what to do.'],
  },
  {
    // the blade: quiet, and quick, and sure
    id: 'npc_a3_u2', name: 'Thaddeus Wolde', look: { seed: 9398, frame: 'broad', age: 31, ancestry: 'east_african', over: { hair: { style: 'paint_shaved', color: 0x120e0b }, facialHair: 'stubble', weathering: 0.6 } }, ...UNWRITTEN,
    level: 7, dialogue: 'd_a3_thaddeus', attrs: { reflex: 8, brawn: 6 }, skills: { melee: 55, stealth: 50 }, equip: ['w_machete'], tolls: 2,
    barks: ['Not tonight.', 'Your face is on a card. Mine isn\'t.'],
  },
  {
    id: 'npc_a3_u3', name: 'Rhoda Kalder', look: { seed: 9399, frame: 'narrow', age: 27, ancestry: 'mediterranean', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2a1c12 }, weathering: 0.6 } }, ...UNWRITTEN,
    level: 5, dialogue: 'd_a3_rhoda', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 50, survival: 45 }, equip: ['w_shiv'], inventory: [['j_cloth', 2], ['j_fuel', 1]], tolls: 3,
    barks: ['Lamp oil weighs more than you\'d think.', 'Ninety years of counting. Somebody has to stop.'],
  },
];
