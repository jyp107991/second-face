import type { NpcDef } from '../../engine/npc/defs';

/**
 * Openfield — the Choir's farming commune (Act 2). Nobody here is hostile unless the well's business ends in a
 * drawn knife (`of_fight`); the guild's buyer on the lane is a guest the Choir tolerates.
 */
const OF = { team: 'choir', settlement: 'openfield', faction: 'choir' } as const;
const sleep = (spot: string, from = 21, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const OPENFIELD_NPCS: NpcDef[] = [
  {
    id: 'npc_of_01', name: 'Elder Mason', look: { seed: 7101, frame: 'broad', age: 67, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xc8c0b4 }, facialHair: 'full_beard', weathering: 0.8 } }, role: 'pilgrim',
    level: 5, ...OF, courage: 55, dialogue: 'd_of_mason', attrs: { wits: 7, presence: 8, grit: 7, brawn: 5 }, skills: { survival: 55, medicine: 30, speech: 50 }, tolls: 30,
    inventory: [['c_water', 2], ['c_fruit', 2]],
    schedule: [{ from: 6, to: 11, spot: 'field_e_work', activity: 'work' }, { from: 11, to: 17, spot: 'mason_table', activity: 'work' }, { from: 17, to: 21, spot: 'shrine', activity: 'idle' }, sleep('mason_bed')],
    barks: ['The sky keeps no books.', 'Every third row. I have counted them so often the counting is a prayer.', 'Sit. Nobody here will ask you to sing.'],
  },
  {
    id: 'npc_of_02', name: 'Petra Mason', look: { seed: 7102, frame: 'narrow', age: 29, ancestry: 'north_european', over: { hair: { style: 'cut_pixie', color: 0x6a5a40 }, weathering: 0.5 } }, role: 'pilgrim',
    level: 6, ...OF, courage: 75, dialogue: 'd_of_petra', attrs: { reflex: 7, wits: 7, presence: 7, grit: 7 }, skills: { stealth: 45, melee: 40, speech: 40, survival: 40 }, tolls: 20,
    equip: ['w_machete'], inventory: [['c_water', 1], ['c_bandage', 2]],
    schedule: [{ from: 6, to: 12, spot: 'shrine', activity: 'idle' }, { from: 12, to: 18, spot: 'field_c_work', activity: 'work' }, { from: 18, to: 23, spot: 'shrine', activity: 'idle' }, sleep('hall_cot_c', 23, 6)],
    barks: ['Don\'t paint me. Don\'t draw me. Don\'t remember my face if you can help it.', 'The sky is enough.', 'My father counts rows. I count other things.'],
  },
  {
    id: 'npc_of_03', name: 'Brother Ash', look: { seed: 7103, frame: 'broad', age: 38, ancestry: 'indigenous_american', over: { hair: { style: 'ponytail01', color: 0x4a4440 }, facialHair: 'stubble', scars: ['brow_cut'], weathering: 0.85 } }, role: 'pilgrim',
    level: 7, team: 'neutral', settlement: 'openfield', faction: 'choir', courage: 80, dialogue: 'd_of_ash', attrs: { brawn: 7, grit: 8, senses: 6, presence: 6, wits: 5 }, skills: { melee: 45, firearms: 50, medicine: 40, survival: 45 }, tolls: 4,
    equip: ['w_pump', 'r_duster'], inventory: [['a_12ga', 10], ['c_bandage', 2], ['c_water', 1]],
    schedule: [{ from: 6, to: 12, spot: 'grave_dig', activity: 'work' }, { from: 12, to: 18, spot: 'field_a_work', activity: 'work' }, { from: 18, to: 22, spot: 'shrine_w', activity: 'idle' }, sleep('hall_cot_a', 22, 6)],
    barks: ['There\'s a weight to a thing like that.', 'Soil forgives. It\'s the only thing that does, so I work in it.', 'Friend.'],
  },
  {
    id: 'npc_of_04', name: 'Tobias Mason', look: { seed: 7104, frame: 'broad', age: 35, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x7a6a48 }, facialHair: 'stubble_light', weathering: 0.6 } }, role: 'labourer',
    level: 3, ...OF, hostileIf: { flag: 'of_fight' }, courage: 40, dialogue: 'd_of_tobias', attrs: { brawn: 6, grit: 5, wits: 6, presence: 4 }, skills: { survival: 40, melee: 25, science: 20 }, tolls: 8,
    equip: ['w_shiv'], inventory: [['c_water', 1]],
    schedule: [{ from: 6, to: 18, spot: 'tobias_field', activity: 'work' }, { from: 18, to: 22, spot: 'tobias_hut', activity: 'idle' }, sleep('tobias_cot', 22, 6)],
    barks: ['Rows don\'t lie. People do.', 'My father thinks the sky is enough. The sky doesn\'t read.', 'Don\'t drink from the north trough.'],
  },
  {
    id: 'npc_of_05', name: 'Sister Imre Dall', look: { seed: 7105, frame: 'narrow', age: 44, ancestry: 'east_african', over: { hair: { style: 'coily_twa', color: 0x1a1410 } } }, role: 'medic',
    level: 4, ...OF, courage: 45, dialogue: 'd_of_imre', attrs: { wits: 7, senses: 7, presence: 6 }, skills: { medicine: 60, science: 30, speech: 35 }, tolls: 24,
    merchant: { buys: ['consumable', 'junk'], cash: 50, restockDays: 3, markup: 1.2, faction: 'choir', stock: [['c_bandage', 4], ['c_splint', 2], ['c_iodine', 2], ['c_knitkit', 1], ['c_water', 4]] },
    inventory: [['c_bandage', 2]],
    schedule: [{ from: 6, to: 22, spot: 'sick_table', activity: 'work' }, sleep('hall_cot_b', 22, 6)],
    barks: ['Fever has a smell. This isn\'t it.', 'Boil the north trough. Boil everything.', 'Lie down. The sky can see you lying down.'],
  },
  {
    id: 'npc_of_06', name: 'Keeper Doria Vance', look: { seed: 7106, frame: 'narrow', age: 52, ancestry: 'latin_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x5a4a3a }, weathering: 0.6 } }, role: 'settler',
    level: 3, ...OF, courage: 40, dialogue: 'd_of_doria', attrs: { wits: 8, senses: 6, presence: 5 }, skills: { barter: 40, survival: 45, science: 25 }, tolls: 16,
    inventory: [['c_fruit', 1]],
    schedule: [{ from: 6, to: 20, spot: 'store', activity: 'work' }, sleep('hall_cot_d', 20, 6)],
    barks: ['Counted at dusk, counted at dawn. The numbers walk at night.', 'Seed is the only thing we have that the glass can\'t grow.', 'A crate a night. Somebody is patient.'],
  },
  {
    id: 'npc_of_07', name: 'Old Benedek', look: { seed: 7107, frame: 'broad', age: 72, ancestry: 'mediterranean', over: { hair: { style: 'none', color: 0xa8a098 }, facialHair: 'full_beard', weathering: 0.9 } }, role: 'labourer',
    level: 2, ...OF, courage: 30, dialogue: 'd_of_benedek', attrs: { grit: 6, senses: 7, wits: 5 }, skills: { survival: 50 }, tolls: 5,
    schedule: [{ from: 5, to: 19, spot: 'field_b_work', activity: 'work' }, { from: 19, to: 22, spot: 'hall_table', activity: 'idle' }, sleep('hall_cot_b', 22, 5)],
    barks: ['Forty years in the glass. Thirty of them green.', 'I saw a light at the well. Lights at wells aren\'t good.', 'The young ones sing. We used to work.'],
  },
  {
    id: 'npc_of_08', name: 'Hollin Brannock', look: { seed: 7108, frame: 'broad', age: 26, ancestry: 'south_asian', over: { hair: { style: 'cut_crop', color: 0x1a1410 }, weathering: 0.7 } }, role: 'labourer',
    level: 2, ...OF, team: 'neutral', courage: 35, dialogue: 'd_of_hollin', attrs: { brawn: 7, reflex: 6, wits: 5 }, skills: { stealth: 35, survival: 30 }, tolls: 22,
    inventory: [['c_jerky', 1]],
    schedule: [{ from: 6, to: 19, spot: 'yard_work', activity: 'work' }, { from: 19, to: 23, spot: 'camp_fire', activity: 'idle' }, sleep('camp_tent_c', 23, 6)],
    barks: ['Came from the Sump. They gave me the yard. That\'s more than anyone gave me.', 'Don\'t look in my tent.', 'Seed\'s seed. It grows anywhere.'],
  },
  {
    id: 'npc_of_09', name: 'Wyn', look: { seed: 7109, frame: 'narrow', age: 12, ancestry: 'north_european', over: { hair: { style: 'long01', color: 0x9a7a48 } } }, role: 'settler', minor: false,
    level: 1, ...OF, courage: 20, dialogue: 'd_of_wyn', attrs: { grit: 3 }, schedule: [{ from: 0, to: 24, spot: 'sick_cot_a_sit', activity: 'idle' }],
    barks: ['I drank from the north one. It tasted of pennies.', 'Is the sky still up?'],
  },
  {
    id: 'npc_of_10', name: 'Marta Keel', look: { seed: 7110, frame: 'narrow', age: 40, ancestry: 'west_african', over: { hair: { style: 'coily_afro', color: 0x1a1410 }, weathering: 0.6 } }, role: 'settler',
    level: 2, ...OF, courage: 35, dialogue: 'd_of_marta', attrs: { grit: 5 }, schedule: [{ from: 0, to: 24, spot: 'sick_cot_c_sit', activity: 'idle' }],
    barks: ['My hands shake. Imre says it\'s not the fever.', 'Tobias brought me water. Kind of him.'],
  },
  {
    id: 'npc_of_11', name: 'Corso Vail', look: { seed: 7111, frame: 'narrow', age: 38, ancestry: 'east_asian', over: { hair: { style: 'cut_sidepart', color: 0x1a1410 } } }, role: 'trader',
    level: 3, team: 'neutral', settlement: 'openfield', faction: 'tollmen', courage: 35, dialogue: 'd_of_corso', attrs: { wits: 7, presence: 6 }, skills: { barter: 55, speech: 40 }, tolls: 180,
    equip: ['w_pistol9'], inventory: [['a_9mm', 10], ['c_water', 2]],
    schedule: [{ from: 7, to: 21, spot: 'lane_e', activity: 'idle' }, sleep('camp_tent_c', 21, 7)],
    barks: ['Harvest futures, paid in advance. The guild carries the risk.', 'The Choir doesn\'t sell. The Choir\'s children do.', 'Seed is just a future in a smaller box.'],
  },
];
