import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, the Precinct — the Ledger's orderly middle (Act 2). Wardens in grey turn on you only if the gate
 * comes to a fight (`md_fight`). The assessor at the records office is a municipal unit, not a person.
 */
const MD = { team: 'wardens', settlement: 'meridian', faction: 'wardens' } as const;
const warden = { ...MD, role: 'guard' as const, hostileIf: { flag: 'md_fight' }, courage: 70 };
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const MERIDIAN_NPCS: NpcDef[] = [
  {
    id: 'npc_md_01', name: 'Captain Idris Lowe', look: { seed: 9101, frame: 'broad', age: 45, ancestry: 'east_african', over: { hair: { style: 'cut_crop', color: 0x2a2420 }, facialHair: 'short_beard', weathering: 0.4 } }, role: 'guard',
    level: 8, ...MD, hostileIf: { flag: 'md_fight' }, courage: 85, dialogue: 'd_md_lowe', attrs: { brawn: 7, grit: 8, presence: 8, wits: 7 }, skills: { firearms: 55, melee: 45, speech: 45 }, tolls: 60,
    equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 12], ['c_water', 1], ['c_bandage', 1]],
    schedule: [{ from: 6, to: 22, spot: 'lowe_desk', activity: 'work' }, sleep('lowe_desk')],
    barks: ['The schedule holds.', 'Every eviction is lawful. I have checked.', 'Nobody in the Precinct goes hungry. Outside the wall is outside the law.'],
  },
  {
    id: 'npc_md_nine', name: 'Assessor Nine', look: { seed: 9109, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'none', color: 0x404040 }, facialHair: 'none' } }, role: 'corp',
    // A warden-pattern walker refitted for civil work: grey plating and a sealed helm (a machine skin is B3 backlog).
    outfit: { layers: [{ name: 'matcreator_mc-skinsuit_2022', dye: 0x6a7078, grime: 0.1, wear: 0.3 }, { name: 'culturalibre_warrior_helmet', grime: 0.1, wear: 0.4 }, { name: 'toigo_gloves_short', dye: 0x3a3e44 }], grime: 0.1, wear: 0.35 },
    level: 7, team: 'neutral', settlement: 'meridian', faction: 'wardens', courage: 60, dialogue: 'd_md_nine', attrs: { wits: 10, senses: 8, grit: 7, presence: 5, brawn: 6 }, skills: { science: 70, security: 55, speech: 40, barter: 35 }, tolls: 0,
    equip: ['w_arc_pistol'], inventory: [],
    schedule: [{ from: 0, to: 24, spot: 'nine_desk', activity: 'work' }],
    barks: ['The record suggests otherwise.', 'Clause 14, subsection 3: the drains are the city\'s first duty.', 'I do not think. The record suggests.'],
  },
  {
    id: 'npc_md_12', name: 'Sergeant Ottoline Reyes', look: { seed: 9112, frame: 'narrow', age: 38, ancestry: 'latin_american', over: { hair: { style: 'cut_crop', color: 0x1a1410 } } }, role: 'guard',
    level: 6, ...MD, hostileIf: { flag: 'md_fight' }, courage: 75, dialogue: 'd_md_reyes', attrs: { presence: 7, grit: 7, reflex: 6 }, skills: { firearms: 45, melee: 40, speech: 35 }, tolls: 30,
    equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 16]],
    schedule: [{ from: 6, to: 22, spot: 'gate_post', activity: 'work' }, sleep('gate_booth')],
    barks: ['Face to the lens. Then we talk.', 'Hearings are Tuesdays and Fridays. Today is neither. It is never either.', 'The line is the line.'],
  },
  {
    id: 'npc_md_13', name: 'Clerk Ambrose Tull', look: { seed: 9113, frame: 'narrow', age: 29, ancestry: 'southeast_asian', over: { hair: { style: 'cut_sidepart', color: 0x1a1410 } } }, role: 'corp',
    level: 2, ...MD, courage: 25, dialogue: 'd_md_tull', attrs: { wits: 8, presence: 4 }, skills: { science: 35, barter: 30 }, tolls: 20,
    schedule: [{ from: 6, to: 22, spot: 'gate_booth', activity: 'work' }, sleep('records_counter')],
    barks: ['Name, origin, purpose. In that order. The lens does the rest.', 'I don\'t decide. The file decides.', 'Flagged means flagged.'],
  },
  {
    id: 'npc_md_14', name: 'Dr Linnea Hast', look: { seed: 9114, frame: 'narrow', age: 51, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0xa09080 } } }, role: 'medic',
    level: 4, ...MD, team: 'neutral', courage: 40, dialogue: 'd_md_hast', attrs: { wits: 8, senses: 7 }, skills: { medicine: 65, science: 40 }, tolls: 90,
    merchant: { buys: ['consumable'], cash: 120, restockDays: 2, markup: 1.3, stock: [['c_bandage', 6], ['c_splint', 3], ['c_iodine', 3], ['c_radflush', 2], ['c_knitkit', 2], ['c_water', 6]] },
    schedule: [{ from: 7, to: 20, spot: 'clinic', activity: 'work' }, sleep('clinic_cot_sit', 20, 7)],
    barks: ['Licensed. It says so on the door, which is more than most doors can say.', 'Every patient is a line in the file. I write carefully.', 'Chrome? Not here. The Sink has people for that, and the Concern has the licences.'],
  },
  {
    id: 'npc_md_15', name: 'Idra Kemp', look: { seed: 9115, frame: 'broad', age: 44, ancestry: 'south_asian', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x1a1410 } } }, role: 'trader',
    level: 3, ...MD, team: 'neutral', courage: 40, dialogue: 'd_md_kemp', attrs: { presence: 6, wits: 6 }, skills: { barter: 50 }, tolls: 260,
    merchant: { buys: ['consumable', 'junk', 'misc', 'tool', 'ammo'], cash: 260, restockDays: 3, markup: 1.5, stock: [['c_water', 10], ['c_tin', 6], ['c_jerky', 4], ['c_fruit', 3], ['a_9mm', 20], ['a_38', 16], ['t_repair', 2], ['t_lamp', 1], ['j_cloth', 4], ['r_jumpsuit', 1]] },
    schedule: [{ from: 7, to: 21, spot: 'shop', activity: 'trade' }, sleep('shop', 21, 7)],
    barks: ['Licensed prices. The licence costs; so do the prices.', 'No guns over the counter. The wardens sell those, to themselves.', 'Tickets for everything. I sell those too.'],
  },
  {
    id: 'npc_md_16', name: 'Old Sabel Quint', look: { seed: 9116, frame: 'narrow', age: 74, ancestry: 'mediterranean', over: { hair: { style: 'short04', color: 0xd0c8c0 }, weathering: 0.7 } }, role: 'settler',
    level: 1, ...MD, team: 'neutral', courage: 30, dialogue: 'd_md_quint', attrs: { wits: 7, presence: 5 }, skills: { speech: 30 }, tolls: 12,
    schedule: [{ from: 6, to: 21, spot: 'quint_table', activity: 'idle' }, sleep('quint_cot', 21, 6)],
    barks: ['Forty years a citizen. Never once hungry. Never once asked.', 'The Sink floods in spring. We get a notice about it.', 'My daughter went to the Ring. There\'s a notice about that too.'],
  },
  {
    id: 'npc_md_17', name: 'Tess Marlow', look: { seed: 9117, frame: 'narrow', age: 33, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, weathering: 0.8 } }, role: 'drifter',
    level: 2, ...MD, team: 'neutral', faction: undefined, courage: 45, dialogue: 'd_md_tess', attrs: { grit: 6, presence: 5 }, skills: { survival: 30 }, tolls: 4,
    schedule: [{ from: 5, to: 22, spot: 'crowd_a', activity: 'idle' }, sleep('crowd_sit', 22, 5)],
    barks: ['Third day. Tuesday, they said. It was Tuesday yesterday.', 'My face isn\'t on their machine. My boy\'s is; he was born inside.', 'The Ring burned Tuesday. That\'s why we\'re here.'],
  },
  // wardens: the gate, the avenue patrol, the station counter
  { id: 'npc_md_g1', name: 'Warden', look: { seed: 9121, frame: 'broad', age: 30, ancestry: 'east_asian' }, ...warden, level: 5, equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'gate_e', activity: 'work' }], barks: ['Inside the wall is inside the law.', 'Move along the avenue.'] },
  { id: 'npc_md_g2', name: 'Warden', look: { seed: 9122, frame: 'narrow', age: 27, ancestry: 'latin_american' }, ...warden, level: 5, equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 12]], schedule: [{ from: 0, to: 24, spot: 'gate_w', activity: 'work' }], barks: ['Face to the lens.', 'The line is the line.'] },
  { id: 'npc_md_g3', name: 'Warden', look: { seed: 9123, frame: 'broad', age: 35, ancestry: 'west_african', over: { facialHair: 'stubble' } }, ...warden, level: 5, equip: ['w_pump', 'r_riot'], inventory: [['a_12ga', 8]], schedule: [{ from: 0, to: 24, spot: 'patrol_a', activity: 'patrol' }], barks: ['Papers.', 'Curfew at nine.'] },
  { id: 'npc_md_g4', name: 'Warden', look: { seed: 9124, frame: 'narrow', age: 41, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x7a6a50 } } }, ...warden, level: 5, equip: ['w_pistol9', 'r_riot'], inventory: [['a_9mm', 14]], schedule: [{ from: 0, to: 24, spot: 'patrol_b', activity: 'patrol' }], barks: ['The schedule holds.', 'Water\'s point eight. Don\'t waste it.'] },
  { id: 'npc_md_g5', name: 'Desk Warden', look: { seed: 9125, frame: 'narrow', age: 33, ancestry: 'south_asian' }, ...warden, level: 4, dialogue: 'd_md_desk', equip: ['w_pistol9'], inventory: [['a_9mm', 10]], schedule: [{ from: 0, to: 24, spot: 'station_counter', activity: 'work' }], barks: ['Fines at the counter. Bail at the counter. Complaints, also at the counter.'] },
];
