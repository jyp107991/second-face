import type { NpcDef } from '../../engine/npc/defs';

/** The Wheel's camp: the caravan-mother, her son, the horse-master, the trader; the rest are extras. */
const WH = { team: 'wheel', faction: 'wheel', settlement: 'wheel' } as const;

export const WHEEL_NPCS: NpcDef[] = [
  {
    id: 'npc_wh_01', name: 'Sefa Oduya', look: { seed: 7601, frame: 'narrow', age: 58, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x3a3030 } } }, role: 'nomad',
    level: 6, ...WH, leader: true, courage: 70, dialogue: 'd_wh_sefa', attrs: { presence: 8, wits: 7, grit: 6 }, skills: { speech: 55, barter: 45, survival: 50 }, tolls: 160,
    equip: ['w_revolver38'], inventory: [['a_38', 12], ['c_water', 3]],
    schedule: [{ from: 6, to: 11, spot: 'sefa_table_work', activity: 'work' }, { from: 11, to: 21, spot: 'sefa_fire_sit', activity: 'idle' }, { from: 21, to: 6, spot: 'sefa_sleep', activity: 'sleep' }],
    barks: ['Guests eat first. Then we talk.', 'The Wheel turns on the fourth day. Be on it or be left.', 'Nobody owns a road. Some people collect for one.'],
  },
  {
    id: 'npc_wh_02', name: 'Dario Oduya', look: { seed: 7602, frame: 'broad', age: 27, ancestry: 'west_african', over: { hair: { style: 'paint_fade', color: 0x1a1410 }, facialHair: 'short_beard' } }, role: 'nomad',
    level: 4, ...WH, courage: 55, dialogue: 'd_wh_dario', attrs: { brawn: 6, reflex: 6, presence: 5 }, skills: { firearms: 40, mechanics: 35, survival: 35 }, tolls: 30,
    equip: ['w_carbine556'], inventory: [['a_9mm', 20]],
    schedule: [{ from: 6, to: 12, spot: 'dario_lean', activity: 'idle' }, { from: 12, to: 22, spot: 'dario_fire', activity: 'idle' }, { from: 22, to: 6, spot: 'dario_sleep', activity: 'sleep' }],
    barks: ['Shale has a well that never dries. I\'ve seen it.', 'Mother says the road. The road says nothing back.', 'Another four days, another pan.'],
  },
  {
    id: 'npc_wh_03', name: 'Mirren Kade', look: { seed: 7603, frame: 'narrow', age: 44, ancestry: 'indigenous_american', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x1a1410 } } }, role: 'nomad',
    level: 4, ...WH, courage: 50, dialogue: 'd_wh_mirren', attrs: { senses: 7, grit: 6 }, skills: { survival: 55, medicine: 30, melee: 30 }, tolls: 25,
    equip: ['w_machete'],
    schedule: [{ from: 5, to: 20, spot: 'mirren_horses_work', activity: 'work' }, { from: 20, to: 23, spot: 'mirren_fire', activity: 'idle' }, { from: 23, to: 5, spot: 'mirren_sleep', activity: 'sleep' }],
    barks: ['Don\'t walk behind her. She\'s asked you nicely once.', 'Four horses. Last year, six.', 'A horse drinks what three people drink. Think about that before you ask the price.'],
  },
  {
    id: 'npc_wh_04', name: 'Tulla Oduya', look: { seed: 7604, frame: 'narrow', age: 35, ancestry: 'west_african', over: { hair: { style: 'coily_afro', color: 0x2a2020 } } }, role: 'trader',
    level: 3, ...WH, courage: 40, dialogue: 'd_wh_tulla', attrs: { presence: 6, wits: 6 }, skills: { barter: 50, speech: 35 }, tolls: 120,
    merchant: { buys: ['junk', 'misc', 'ammo', 'consumable', 'tool'], cash: 140, restockDays: 4, faction: 'wheel', markup: 1.25, stock: [['c_water', 6], ['c_jerky', 6], ['c_fruit', 3], ['a_9mm', 16], ['a_38', 12], ['a_12ga', 8], ['c_bandage', 3], ['t_lamp', 1], ['j_cloth', 3], ['j_scrap', 4], ['r_hood', 1], ['u_holdfast', 2], ['u_powercell', 1]] },
    schedule: [{ from: 7, to: 20, spot: 'tulla_stall_work', activity: 'trade' }, { from: 20, to: 23, spot: 'tulla_fire', activity: 'idle' }, { from: 23, to: 7, spot: 'tulla_sleep', activity: 'sleep' }],
    barks: ['Road prices. The road is long.', 'Guild scrip? Only if you\'re leaving it behind.', 'Everything on the blanket walked here. So did the price.'],
  },
];
