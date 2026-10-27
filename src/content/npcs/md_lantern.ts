import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, Lantern Row — the pleasure district on the canal (Act 2). No wardens; the Gilt keep the east end and turn
 * only if crossed (`lr_fight_gilt`). The pit's fighters fight in the ring, not in the street.
 */
const LR = { team: 'neutral', settlement: 'meridian' } as const;
const gilt = { team: 'gilt', settlement: 'meridian', faction: 'gilt', role: 'gilded' as const, hostileIf: { flag: 'lr_fight_gilt' }, courage: 65 };
const sleep = (spot: string, from = 4, to = 12) => ({ from, to, spot, activity: 'sleep' as const });

export const LANTERN_NPCS: NpcDef[] = [
  {
    id: 'npc_lr_01', name: 'Mab Corrigan', look: { seed: 9401, frame: 'narrow', age: 55, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xb0a8a0 }, weathering: 0.4 } }, role: 'trader',
    level: 5, ...LR, courage: 60, dialogue: 'd_lr_mab', attrs: { presence: 8, wits: 7, senses: 7 }, skills: { barter: 60, speech: 55, firearms: 35 }, tolls: 400,
    equip: ['w_revolver38'], inventory: [['a_38', 12]],
    schedule: [{ from: 12, to: 4, spot: 'pit_master', activity: 'work' }, sleep('shack_cot')],
    barks: ['Twenty on the undercard. Two to one. Chalk doesn\'t lie; I do, but not about chalk.', 'Thirty to enter. Ninety if you\'re standing. Nobody\'s standing.', 'Floor\'s washed. Mind it.'],
  },
  {
    id: 'npc_lr_02', name: 'Anvil', look: { seed: 9402, frame: 'broad', age: 34, ancestry: 'mediterranean', over: { hair: { style: 'paint_buzz', color: 0x1a1410 }, scars: ['brow_cut'], weathering: 0.4 } }, role: 'labourer',
    level: 8, ...LR, courage: 90, dialogue: 'd_lr_anvil', attrs: { brawn: 9, grit: 9, reflex: 7, presence: 6 }, skills: { melee: 75 }, tolls: 20,
    equip: ['w_knuckles'],
    schedule: [{ from: 14, to: 4, spot: 'ring', activity: 'idle' }, sleep('house_cot_a')],
    barks: ['Hands and iron. I don\'t go for the head unless you do.', 'Nobody\'s standing since spring.', 'Bastien Roque. Anvil\'s what they shout.'],
  },
  {
    id: 'npc_lr_03', name: 'Sunny Teague', look: { seed: 9403, frame: 'narrow', age: 26, ancestry: 'east_african', over: { hair: { style: 'paint_shaved', color: 0x1a1410 }, weathering: 0.3 } }, role: 'labourer',
    level: 4, ...LR, courage: 70, dialogue: 'd_lr_sunny', attrs: { reflex: 8, grit: 6 }, skills: { melee: 45 }, tolls: 10,
    equip: ['w_pipe'],
    schedule: [{ from: 14, to: 4, spot: 'ring_a', activity: 'idle' }, sleep('house_cot_b')],
    barks: ['Second round. Watch his left; he doesn\'t.', 'I\'m the small one. Bet on the small one.'],
  },
  {
    id: 'npc_lr_04', name: 'Doubt', look: { seed: 9404, frame: 'broad', age: 41, ancestry: 'south_asian', over: { facialHair: 'full_beard', hair: { style: 'short04', color: 0x2a2018 }, weathering: 0.5 } }, role: 'drifter',
    level: 5, ...LR, courage: 50, dialogue: 'd_lr_doubt', attrs: { brawn: 7, grit: 7 }, skills: { melee: 50 }, tolls: 35,
    equip: ['w_knuckles'],
    schedule: [{ from: 14, to: 4, spot: 'ring_b', activity: 'idle' }, sleep('pit_crowd_c')],
    barks: ['They call me Doubt. Nobody\'s sure why.', 'Second round. Could go either way. Could.'],
  },
  {
    id: 'npc_lr_05', name: 'Ysolde Marr', look: { seed: 9405, frame: 'narrow', age: 45, ancestry: 'west_african', over: { hair: { style: 'bob02', color: 0x120e0b }, weathering: 0.25 } }, role: 'tech',
    level: 5, ...LR, courage: 45, dialogue: 'd_lr_ysolde', attrs: { wits: 9, presence: 7, senses: 7 }, skills: { science: 55, barter: 55, speech: 50 }, tolls: 300,
    schedule: [{ from: 14, to: 4, spot: 'den_desk', activity: 'work' }, sleep('den_cot')],
    barks: ['Yours or better.', 'Don\'t buy one you can\'t put down. I mean it; I\'ve seen the cots after.', 'The evidence shelf isn\'t for sale. Ask anyway; everyone does.'],
  },
  {
    id: 'npc_lr_06', name: 'Pip Aldous', look: { seed: 9406, frame: 'broad', age: 22, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0xd8b040 }, weathering: 0.1 } },
    level: 6, ...gilt, dialogue: 'd_lr_pip', attrs: { presence: 8, reflex: 7, wits: 6 }, skills: { firearms: 50, speech: 45, barter: 50 }, tolls: 500, leader: true,
    equip: ['w_pistol9'], inventory: [['a_9mm', 16]],
    merchant: { buys: ['misc', 'junk', 'weapon'], cash: 500, restockDays: 6, markup: 1.7, stock: [['ci_ch_eye_scope', 1], ['ci_ch_neural_link', 1], ['w_pistol9', 1], ['a_9mm', 24]] },
    schedule: [{ from: 16, to: 5, spot: 'bar_stool', activity: 'drink' }, sleep('bar_cot', 5, 16)],
    barks: ['Gilt. Say it like it\'s worth something.', 'Crown coin\'s counted. Row coin isn\'t. Guess which I carry.', 'East end\'s ours. Chain says works; chain means ours.'],
  },
  {
    id: 'npc_lr_07', name: 'Dolour', look: { seed: 9407, frame: 'narrow', age: 38, ancestry: 'east_asian', over: { hair: { style: 'bob02', color: 0x1a1a1a }, weathering: 0.2 } }, role: 'street',
    level: 4, ...LR, courage: 40, dialogue: 'd_lr_dolour', attrs: { wits: 9, senses: 8 }, skills: { barter: 65, speech: 40 }, tolls: 250,
    schedule: [{ from: 14, to: 4, spot: 'dust_table', activity: 'work' }, sleep('dust_cot')],
    barks: ['Dust. Ten the hand, thirty the high table.', 'The house wins. I am the house. Sit.', 'Fenwick lost a Crown chit at this table and cried. Crown kids cry beautifully.'],
  },
  {
    id: 'npc_lr_08', name: 'Madame Oyelaran', look: { seed: 9408, frame: 'narrow', age: 52, ancestry: 'west_african', over: { hair: { style: 'bob02', color: 0x201810 }, weathering: 0.15 } }, role: 'gilded',
    level: 4, ...LR, courage: 55, dialogue: 'd_lr_madame', attrs: { presence: 9, wits: 8, senses: 7 }, skills: { speech: 65, barter: 50 }, tolls: 260,
    schedule: [{ from: 0, to: 24, spot: 'velvet', activity: 'work' }],
    barks: ['The Velvet. Company, conversation, the hour. In that order, if you\'re wise.', 'The Crown sends its girls to me to be dressed. I send them back dressed.', 'No chrome on the premises. Not for the Pale\'s reasons; for mine.'],
  },
  {
    id: 'npc_lr_09', name: 'Fenwick Lorne', look: { seed: 9409, frame: 'broad', age: 20, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0xe8d8a0 }, weathering: 0.05 } }, role: 'gilded',
    level: 2, ...LR, courage: 25, dialogue: 'd_lr_fenwick', attrs: { presence: 6, wits: 5 }, tolls: 120,
    schedule: [{ from: 18, to: 4, spot: 'bar_lean', activity: 'drink' }, { from: 4, to: 18, spot: 'bar_lean', activity: 'away' }],
    barks: ['Lorne. House Lorne. It used to mean something; it still means a chit.', 'I lost it at the hall. The chit. Mother will *see*.', 'Is this what the Row is? It\'s wonderful. It\'s horrible. Another.'],
  },
  {
    id: 'npc_lr_10', name: 'Shay', look: { seed: 9410, frame: 'broad', age: 47, ancestry: 'mediterranean', over: { facialHair: 'full_beard', hair: { style: 'short04', color: 0x3a3028 }, weathering: 0.55 } }, role: 'fisher',
    level: 3, ...LR, courage: 45, dialogue: 'd_lr_shay', attrs: { senses: 7, grit: 7 }, skills: { stealth: 35 }, tolls: 30,
    schedule: [{ from: 8, to: 24, spot: 'quay_n', activity: 'work' }, sleep('quay_n', 0, 8)],
    barks: ['Boat\'s two. Bridge is free and further.', 'Canal\'s warm. Pumps. Don\'t ask me whose.', 'I\'ve had the Crown in this boat. They tip in coin you can\'t spend.'],
  },
  {
    id: 'npc_lr_11', name: 'Old Perrin', look: { seed: 9411, frame: 'broad', age: 68, ancestry: 'east_asian', over: { hair: { style: 'short04', color: 0xc8c0b8 }, facialHair: 'short_beard', weathering: 0.6 } }, role: 'labourer',
    level: 2, ...LR, courage: 40, dialogue: 'd_lr_perrin', attrs: { wits: 7, senses: 8 }, skills: { mechanics: 45 }, tolls: 15,
    schedule: [{ from: 15, to: 24, spot: 'tow_w', activity: 'patrol' }, { from: 0, to: 15, spot: 'tow_e', activity: 'idle' }],
    barks: ['Lit the first tube on this row. Pink. Still pink.', 'Every tube on the Row\'s mine. Every one that\'s dark is the Gilt\'s.', 'Canal was a street. I remember the street.'],
  },
  {
    id: 'npc_lr_12', name: 'Kit Halloran', look: { seed: 9412, frame: 'narrow', age: 17, ancestry: 'south_asian', over: { hair: { style: 'paint_buzz', color: 0x1a1410 }, weathering: 0.3 } }, role: 'street',
    level: 2, ...LR, courage: 30, dialogue: 'd_lr_kit', attrs: { reflex: 8, senses: 7 }, skills: { stealth: 55, speech: 35 }, tolls: 22,
    schedule: [{ from: 10, to: 2, spot: 'street_lean', activity: 'idle' }, sleep('kit_cot', 2, 10)],
    barks: ['Lost? I\'m not. Two Tolls and you\'re not either.', 'Mind your purse. Not from me. From everyone.'],
  },
  // the Gilt at the Coinage
  { id: 'npc_lr_g1', name: 'Gilt', look: { seed: 9413, frame: 'narrow', age: 21, ancestry: 'north_european', over: { hair: { style: 'paint_shaved', color: 0xe0c060 } } }, ...gilt, level: 4, minor: true, equip: ['w_zip38'], inventory: [['a_38', 6]], schedule: [{ from: 0, to: 24, spot: 'gilt_a', activity: 'idle' }], barks: ['Crown coin\'s counted.', 'Chain says works.'] },
  { id: 'npc_lr_g2', name: 'Gilt', look: { seed: 9414, frame: 'broad', age: 24, ancestry: 'mediterranean', over: { hair: { style: 'paint_shaved', color: 0xd8b040 } } }, ...gilt, level: 4, minor: true, equip: ['w_shiv'], schedule: [{ from: 0, to: 24, spot: 'gilt_b', activity: 'idle' }], barks: ['Pip says. That\'s the whole law.'] },
  // the pit's hands
  { id: 'npc_lr_h1', name: 'Pit Hand', look: { seed: 9415, frame: 'broad', age: 30, ancestry: 'west_african' }, ...LR, role: 'labourer', level: 3, minor: true, courage: 50, schedule: [{ from: 0, to: 24, spot: 'hand_a', activity: 'work' }], barks: ['Floor\'s washed.', 'Bell in an hour.'] },
  { id: 'npc_lr_h2', name: 'Pit Hand', look: { seed: 9416, frame: 'narrow', age: 27, ancestry: 'east_asian' }, ...LR, role: 'labourer', level: 3, minor: true, courage: 50, schedule: [{ from: 0, to: 24, spot: 'hand_b', activity: 'work' }], barks: ['Guns with Mab. All of them.', 'Mind the gap.'] },
];
