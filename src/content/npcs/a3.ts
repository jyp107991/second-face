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
  // B6c: the road home (dialogue/a3_road.ts; met on the road, world/a3_roads.ts). Openfield's walkers after its night, in
  // the Choir's faded colours and a road's worth of dust; the guild's riders in oilskin dusters over green; a Hollow trader in
  // patched layers with copper wire coiled at his belt. Faces bare.
  {
    // an old man of the Choir walking away from Openfield with his house on a handcart, and its door
    id: 'npc_a3_02', name: 'Bertil Greer', look: { seed: 9364, frame: 'broad', age: 66, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0xb8b2a8 }, facialHair: 'full_beard', weathering: 0.8 } }, role: 'settler',
    level: 1, team: 'neutral', courage: 20, dialogue: 'd_re_a3_refugees', attrs: { grit: 6, wits: 6 }, skills: { survival: 35 }, tolls: 2,
    barks: ['The sky keeps no books. Nor do we, now.', 'Shale takes people, they say.'],
  },
  {
    // walking the same way with a child asleep on the sacks, who is hers
    id: 'npc_a3_03', name: 'Keturah Osei', look: { seed: 9365, frame: 'narrow', age: 34, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x16120e }, weathering: 0.5 } }, role: 'settler',
    level: 2, team: 'neutral', courage: 45, dialogue: 'd_re_a3_refugees', attrs: { grit: 7, reflex: 6 }, skills: { survival: 40, mechanics: 25 }, tolls: 4,
    barks: ['It was a good door.', 'Keep walking. That\'s all there is.'],
  },
  {
    // a Hollow man of Signal Hill who sells the city's copper to people who want to hear things
    id: 'npc_a3_04', name: 'Teodor Brann', look: { seed: 9366, frame: 'broad', age: 47, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x4a3a2a }, facialHair: 'short_beard', weathering: 0.6 } }, role: 'trader',
    level: 3, team: 'neutral', courage: 40, dialogue: 'd_re_a3_trader', attrs: { wits: 7, senses: 7 }, skills: { science: 40, barter: 40 }, tolls: 30,
    barks: ['Copper. The city left it; I sell it.', 'Listen. Under the hiss.'],
  },
  {
    // the guild's riders on the toll road, for those who stood against the guild at Openfield
    id: 'npc_a3_g9', name: 'Guild Outrider', look: { seed: 9367, frame: 'broad', age: 36, ancestry: 'south_asian', over: { hair: { style: 'paint_buzz', color: 0x1a1410 }, facialHair: 'stubble', weathering: 0.5 } }, role: 'guard',
    level: 6, team: 'tollmen', faction: 'tollmen', courage: 55, hostileIf: { flag: 'a3_riders_fight' }, dialogue: 'd_re_a3_riders', attrs: { reflex: 7, presence: 6 }, skills: { firearms: 50, speech: 35 }, tolls: 25,
    equip: ['w_carbine556', 'r_duster'], inventory: [['a_556', 12]],
    barks: ['The road\'s the guild\'s.', 'The guild remembers Openfield.'],
  },
  {
    id: 'npc_a3_g10', name: 'Guild Outrider', look: { seed: 9368, frame: 'narrow', age: 29, ancestry: 'latin_american', over: { hair: { style: 'ponytail01', color: 0x2a1e14 }, weathering: 0.45 } }, role: 'guard',
    level: 6, team: 'tollmen', faction: 'tollmen', courage: 60, hostileIf: { flag: 'a3_riders_fight' }, dialogue: 'd_re_a3_riders', attrs: { reflex: 8, senses: 7 }, skills: { firearms: 55 }, tolls: 20,
    equip: ['w_carbine556', 'r_duster'], inventory: [['a_556', 12]],
    barks: ['Fifty.', 'Mind the road.'],
  },
  // B6e (Shale): Pike's two hands, witnesses at the sheriff's door while the buyout is open (hostile only if drawn on; one at
  // her desk if the town is contracted), and two of the Dogs on the sheriff's bench if the Dogs take the office. Faces bare.
  {
    // the one who talks: twenty years of standing at guild doors, courteous the way his factor is, and as tired of it
    id: 'npc_a3_g7', name: 'Esko Harth', look: { seed: 9381, frame: 'broad', age: 52, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x4a3a2e }, facialHair: 'short_beard', weathering: 0.6 } }, role: 'guard',
    level: 6, team: 'tollmen', faction: 'tollmen', settlement: 'shale', courage: 85, hostileIf: { flag: 'a3_sh_fight' }, dialogue: 'd_a3_hands', attrs: { presence: 6, grit: 7 }, skills: { firearms: 45, speech: 35 }, tolls: 18,
    equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 10]],
    barks: ['Witnesses. That\'s all we are.', 'Pike pays by the day, and the day\'s long.', 'Nobody\'s going anywhere.'],
  },
  {
    // the one who counts: says nothing, and has counted the militia's rifles every hour since the notice went up
    id: 'npc_a3_g8', name: 'Tamar Quaid', look: { seed: 9382, frame: 'narrow', age: 34, ancestry: 'mediterranean', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x2a1c12 }, weathering: 0.45 } }, role: 'guard',
    level: 6, team: 'tollmen', faction: 'tollmen', settlement: 'shale', courage: 85, hostileIf: { flag: 'a3_sh_fight' }, dialogue: 'd_a3_hands', attrs: { reflex: 8, senses: 7 }, skills: { firearms: 55 }, tolls: 12,
    equip: ['w_carbine556', 'r_duster'], inventory: [['a_556', 16]],
    barks: ['Four.', 'Still four.'],
  },
  {
    id: 'npc_a3_g13', name: 'Rust Dog (Flint)', look: { seed: 9383, frame: 'broad', age: 27, ancestry: 'west_african', over: { hair: { style: 'paint_fade', color: 0x120e0b }, weathering: 0.6 } }, role: 'raider',
    level: 4, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', courage: 60, dialogue: 'd_a3_dogs', equip: ['w_revolver38', 'r_scrap'], inventory: [['a_38', 10]],
    barks: ['Twice a year. Every year.', 'Sheriff\'s bench. Comfortable.'],
  },
  {
    id: 'npc_a3_g14', name: 'Rust Dog (Tack)', look: { seed: 9384, frame: 'narrow', age: 22, ancestry: 'east_asian', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, weathering: 0.5 } }, role: 'raider',
    level: 3, team: 'rustdogs', faction: 'rust_dogs', settlement: 'rustdogs', courage: 50, dialogue: 'd_a3_dogs', equip: ['w_zip38'], inventory: [['a_38', 6]],
    barks: ['Water\'s the tithe.', 'Nobody has to be shot about it.'],
  },
];
