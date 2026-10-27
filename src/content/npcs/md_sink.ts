import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, the Sink — the flooded under-city (Act 2). Nobody down here is the city's. The two wardens at the pump
 * house are the Precinct's and turn only if the pumps are fought for (`sk_fight_pumps`) or the city does
 * (`md_fight`); the Pale turn if crossed (`sk_fight_pale`) and stand with you if you go for the pumps.
 */
const SK = { team: 'neutral', settlement: 'meridian' } as const;
const pale = { team: 'pale', settlement: 'meridian', faction: 'pale', role: 'street' as const, hostileIf: { flag: 'sk_fight_pale' }, ally: { flag: 'sk_fight_pumps' }, courage: 75 };
const warden = { team: 'wardens', settlement: 'meridian', faction: 'wardens', role: 'guard' as const, hostileIf: { any: [{ flag: 'md_fight' }, { flag: 'sk_fight_pumps' }] }, courage: 70 };
const sleep = (spot: string, from = 23, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const SINK_NPCS: NpcDef[] = [
  {
    id: 'npc_sk_01', name: 'Ocho', look: { seed: 9301, frame: 'broad', age: 61, ancestry: 'west_african', over: { hair: { style: 'none', color: 0x202020 }, facialHair: 'short_beard', weathering: 0.55 } }, role: 'medic',
    level: 7, ...SK, courage: 60, dialogue: 'd_sk_ocho', faction: 'menders', attrs: { wits: 9, senses: 8, grit: 7, presence: 7 }, skills: { medicine: 85, science: 50, mechanics: 40, speech: 45 }, tolls: 30,
    surgeon: { stock: ['ch_org_lungs', 'ch_org_heart', 'ch_neural_reflex', 'ch_legs_spring'], fee: 15 },
    schedule: [{ from: 6, to: 24, spot: 'clinic_table', activity: 'work' }, sleep('clinic_cot_ocho', 0, 6)],
    barks: ['Sit. The queue sits.', 'Fit only what the patient can bear. The rest is vanity with a scar.', 'Free means free. Don\'t make me say it again.', 'Hold that. No — hold it like you mean it.'],
  },
  {
    id: 'npc_sk_02', name: 'Pell', look: { seed: 9302, frame: 'narrow', age: 24, ancestry: 'south_asian', over: { hair: { style: 'bob02', color: 0x1a1410 } } }, role: 'medic',
    level: 3, ...SK, courage: 40, dialogue: 'd_sk_pell', faction: 'menders', attrs: { wits: 7, senses: 7 }, skills: { medicine: 45, science: 30 }, tolls: 12,
    schedule: [{ from: 7, to: 23, spot: 'clinic_shelf', activity: 'work' }, sleep('clinic_cot_pell', 23, 7)],
    barks: ['Boiled. Everything\'s boiled. Don\'t touch the shelf.', 'He hasn\'t slept since the line went up. Don\'t tell him I said.', 'Apprentice. Two years. He says the hands come in the third.'],
  },
  {
    id: 'npc_sk_03', name: 'Dagny Roos', look: { seed: 9303, frame: 'narrow', age: 48, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xb8a890 }, weathering: 0.45, scars: ['cheek_slash'] } }, role: 'tech',
    level: 5, ...SK, courage: 55, dialogue: 'd_sk_dagny', attrs: { wits: 8, senses: 7, grit: 6 }, skills: { mechanics: 65, science: 40, speech: 30 }, tolls: 40,
    equip: ['w_hand44'], inventory: [['a_38', 6], ['t_repair', 1]],
    schedule: [{ from: 5, to: 22, spot: 'pump_panel', activity: 'work' }, sleep('pump_cot', 22, 5)],
    barks: ['Three pumps. Two run. The schedule says which.', 'I keep them. I don\'t set them. Read the board.', 'Spring\'s a dial, down here. Somebody up there turns it.'],
  },
  {
    id: 'npc_sk_04', name: 'Mother Lusk', look: { seed: 9304, frame: 'narrow', age: 71, ancestry: 'mediterranean', over: { hair: { style: 'bob02', color: 0xd8d0c8 }, weathering: 0.6 } }, role: 'settler',
    level: 2, ...SK, courage: 45, dialogue: 'd_sk_lusk', attrs: { wits: 8, presence: 7, senses: 6 }, skills: { speech: 50, barter: 35 }, tolls: 25,
    schedule: [{ from: 6, to: 22, spot: 'tally', activity: 'work' }, sleep('tally_cot', 22, 6)],
    barks: ['Name, year, where the water took them. That\'s all a wall needs.', 'The Precinct has a file. We have a wall. The wall\'s truer.', 'Chalk\'s a Toll. Names are free.'],
  },
  {
    id: 'npc_sk_05', name: 'Vash', look: { seed: 9305, frame: 'broad', age: 44, ancestry: 'east_asian', over: { hair: { style: 'paint_buzz', color: 0x1a1a1a }, facialHair: 'none', weathering: 0.3 } }, role: 'trader',
    level: 5, ...SK, courage: 50, dialogue: 'd_sk_vash', attrs: { wits: 8, presence: 6, senses: 7 }, skills: { barter: 70, medicine: 35, speech: 45 }, tolls: 400,
    merchant: { buys: ['consumable', 'misc', 'junk'], cash: 400, restockDays: 7, markup: 1.8, stock: [['ci_ch_org_heart', 1], ['ci_ch_org_lungs', 1], ['c_knitkit', 2], ['c_bandage', 4], ['c_bitters', 3]] },
    schedule: [{ from: 8, to: 24, spot: 'vash_counter', activity: 'trade' }, sleep('vash_cot', 0, 8)],
    barks: ['Anything that was ever warm. Fair price. No questions, which is also a price.', 'Cold box is cold. That\'s the whole business.', 'Menders fit. I supply. Ask Ocho where he thinks the supply comes from.'],
  },
  {
    id: 'npc_sk_06', name: 'Saskia Dray', look: { seed: 9306, frame: 'narrow', age: 39, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0xe8e0d0 }, skinTone: 0.04, scars: ['brow_cut'], weathering: 0.35 } },
    level: 7, ...pale, dialogue: 'd_sk_dray', attrs: { grit: 8, presence: 8, reflex: 7 }, skills: { speech: 50, stealth: 45, barter: 35 }, tolls: 90, leader: true,
    equip: ['w_hand44'], inventory: [['a_38', 12]],
    schedule: [{ from: 0, to: 24, spot: 'pale_chair', activity: 'idle' }],
    barks: ['No chrome. Ever. We remember the Scald.', 'The pumps are ours by water. The Precinct has them by paper.', 'You\'ve a face the water hasn\'t had yet. Keep it.'],
  },
  {
    id: 'npc_sk_07', name: 'Tam Oduya', look: { seed: 9307, frame: 'broad', age: 33, ancestry: 'east_african', over: { hair: { style: 'none', color: 0x151210 }, weathering: 0.5 } }, role: 'labourer',
    level: 2, ...SK, courage: 30, dialogue: 'd_sk_tam', attrs: { grit: 4 }, tolls: 4,
    schedule: [{ from: 0, to: 24, spot: 'clinic_cot_a_sit', activity: 'idle' }],
    barks: ['It skips. Ocho says it skips.', 'Pumped for the Precinct eleven years. The wet got in.', 'Don\'t let him pay for it. He\'ll pay for it.'],
  },
  {
    id: 'npc_sk_08', name: 'Jory Sand', look: { seed: 9308, frame: 'broad', age: 52, ancestry: 'mediterranean', over: { facialHair: 'full_beard', hair: { style: 'short04', color: 0x4a4038 }, weathering: 0.6 } }, role: 'fisher',
    level: 3, ...SK, courage: 45, dialogue: 'd_sk_jory', attrs: { senses: 8, grit: 6 }, skills: { stealth: 40, barter: 30 }, tolls: 20,
    schedule: [{ from: 6, to: 24, spot: 'raft', activity: 'work' }, sleep('raft_cot', 0, 6)],
    barks: ['Raft takes two. Takes one and a box.', 'I pole the deep bit. Nobody walks the deep bit.', 'Found a car under the clinic once. Found who was in it.'],
  },
  {
    id: 'npc_sk_09', name: 'Ailsa Penn', look: { seed: 9309, frame: 'narrow', age: 58, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0x8a8078 }, weathering: 0.55 } }, role: 'settler',
    level: 2, ...SK, courage: 35, dialogue: 'd_sk_ailsa', attrs: { wits: 6, senses: 7 }, tolls: 8,
    schedule: [{ from: 0, to: 24, spot: 'shanty_a', activity: 'idle' }],
    barks: ['Lungs. It\'s the wet. Everyone\'s is the wet.', 'My boy\'s on the wall. Third line down, spring before last.', 'Ocho gave me lungs that whistle. Better than lungs that don\'t.'],
  },
  {
    id: 'npc_sk_10', name: 'Kye', look: { seed: 9310, frame: 'broad', age: 15, ancestry: 'east_asian', over: { hair: { style: 'paint_buzz', color: 0x1a1a1a }, weathering: 0.3 } }, role: 'street',
    level: 1, ...SK, courage: 30, dialogue: 'd_sk_kye', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 40 }, tolls: 6,
    schedule: [{ from: 7, to: 24, spot: 'kye_lean', activity: 'idle' }, sleep('shelf_sit', 0, 7)],
    barks: ['Run anything. Two Tolls. Not east.', 'Vash pays by the pound. I don\'t ask of what.', 'Pale took a man off the walk last week. Owed them. He walked back lighter.'],
  },
  // the Pale: sworn kin on the east bank, no chrome, skin that has not seen sun
  { id: 'npc_sk_p1', name: 'Pale Sworn', look: { seed: 9311, frame: 'broad', age: 27, ancestry: 'north_european', over: { skinTone: 0.05, hair: { style: 'paint_shaved', color: 0xd8d0c0 } } }, ...pale, level: 4, minor: true, equip: ['w_hand44'], inventory: [['a_38', 6]], schedule: [{ from: 0, to: 24, spot: 'pale_door', activity: 'patrol' }], barks: ['Turn round.', 'Not east. Not you.'] },
  { id: 'npc_sk_p2', name: 'Pale Sworn', look: { seed: 9312, frame: 'narrow', age: 31, ancestry: 'mediterranean', over: { skinTone: 0.06, hair: { style: 'paint_shaved', color: 0xd0c8b8 } } }, ...pale, level: 4, minor: true, equip: ['w_hand44'], inventory: [['a_38', 6]], schedule: [{ from: 0, to: 24, spot: 'pale_walk', activity: 'patrol' }], barks: ['Walk ends here.', 'Chrome? Show me your hands.'] },
  { id: 'npc_sk_p3', name: 'Pale Sworn', look: { seed: 9313, frame: 'broad', age: 22, ancestry: 'east_asian', over: { skinTone: 0.05, hair: { style: 'paint_shaved', color: 0xe0d8c8 } } }, ...pale, level: 3, minor: true, equip: ['w_hand44'], inventory: [['a_38', 6]], schedule: [{ from: 0, to: 24, spot: 'pale_fire', activity: 'idle' }], barks: ['The Scald took the chromed first. We remember.'] },
  // the Precinct's two wardens at the pump house door
  { id: 'npc_sk_w1', name: 'Warden', look: { seed: 9314, frame: 'broad', age: 35, ancestry: 'west_african' }, ...warden, level: 5, minor: true, equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'warden_a', activity: 'patrol' }], barks: ['Pump house is the city\'s. Keep walking.', 'Schedule\'s on the board. Read it from there.'] },
  { id: 'npc_sk_w2', name: 'Warden', look: { seed: 9315, frame: 'narrow', age: 30, ancestry: 'south_asian' }, ...warden, level: 5, minor: true, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], schedule: [{ from: 0, to: 24, spot: 'warden_b', activity: 'patrol' }], barks: ['Nobody inside without the keeper\'s say.', 'Relief\'s at point six. It says so.'] },
];
