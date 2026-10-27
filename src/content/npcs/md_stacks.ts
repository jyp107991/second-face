import type { NpcDef } from '../../engine/npc/defs';

/**
 * Meridian, the Stacks — Block Seven: the lobby, floor nine, the roof (Act 2). Self-governed floors; no wardens. The
 * Twelves' crew on the roof turn only if the roof comes to a fight (`st_fight_twelves`).
 */
const ST = { team: 'neutral', settlement: 'meridian' } as const;
const twelves = { team: 'twelves', settlement: 'meridian', role: 'tech' as const, hostileIf: { flag: 'st_fight_twelves' }, courage: 55 };
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });

export const STACKS_NPCS: NpcDef[] = [
  {
    id: 'npc_st_01', name: 'Hester Quill', look: { seed: 9501, frame: 'narrow', age: 63, ancestry: 'north_european', over: { hair: { style: 'bob02', color: 0xc8c0b0 }, weathering: 0.4 } }, role: 'settler',
    level: 4, ...ST, courage: 55, dialogue: 'd_st_hester', attrs: { wits: 8, presence: 8 }, skills: { speech: 60, barter: 45 }, tolls: 180,
    schedule: [{ from: 8, to: 20, spot: 'office_desk', activity: 'work' }, { from: 20, to: 8, spot: 'office_desk', activity: 'away' }],
    barks: ['Committee meets when the committee meets. Sit.', 'Nine\'s dry, Twelve\'s pumping, and the Plan says the lifts run. Three things that are true.', '9-14\'s empty. Key money\'s two-fifty. The Marrs left the kettle.'],
  },
  {
    id: 'npc_st_02', name: 'Oskar Vey', look: { seed: 9502, frame: 'broad', age: 50, ancestry: 'mediterranean', over: { hair: { style: 'short04', color: 0x4a4038 }, facialHair: 'short_beard', weathering: 0.5 } }, role: 'tech',
    level: 5, ...ST, courage: 50, dialogue: 'd_st_oskar', attrs: { wits: 8, mechanics: 7 } as never, skills: { mechanics: 55, science: 35 }, tolls: 60,
    schedule: [{ from: 6, to: 22, spot: 'tank_keeper', activity: 'work' }, sleep('tank_chair')],
    barks: ['Tank fills at night off the Precinct main. What comes out after is politics.', 'I keep the valve. I don\'t set it. Everyone says that; I mean it.', 'Twelve pumps at two. Nine wakes at six to a dry bed. I\'ve a log.'],
  },
  {
    id: 'npc_st_03', name: 'Lio Brand', look: { seed: 9503, frame: 'broad', age: 29, ancestry: 'east_asian', over: { hair: { style: 'paint_buzz', color: 0x1a1a1a }, weathering: 0.2 } },
    level: 6, ...twelves, dialogue: 'd_st_lio', attrs: { presence: 7, wits: 7, reflex: 7 }, skills: { speech: 50, melee: 45, science: 35 }, tolls: 220, leader: true,
    equip: ['w_pipe'],
    schedule: [{ from: 8, to: 24, spot: 'trays_b', activity: 'work' }, sleep('trays_b', 0, 8)],
    barks: ['Trays feed sixty. Dirt feeds nine. Do the sum.', 'Latch brings the nutrient. Latch takes a third. That\'s farming.', 'Nine can have the tank from six to two. We\'re not animals.'],
  },
  {
    id: 'npc_st_04', name: 'Nessa Kord', look: { seed: 9504, frame: 'narrow', age: 33, ancestry: 'south_asian', over: { hair: { style: 'bob02', color: 0x1a1410 }, weathering: 0.2 } },
    level: 4, ...twelves, dialogue: 'd_st_nessa', attrs: { wits: 9, senses: 7 }, skills: { science: 55, mechanics: 50 }, tolls: 40,
    schedule: [{ from: 8, to: 24, spot: 'pump', activity: 'work' }, sleep('pump', 0, 8)],
    barks: ['Pump\'s mine. Don\'t touch the pump.', 'Two to five. It\'s on the panel; it\'s not a secret, it\'s a schedule.', 'Nutrient\'s Concern-made. So\'s the pump. So, nearly, am I.'],
  },
  {
    id: 'npc_st_05', name: 'Mama Deel', look: { seed: 9505, frame: 'narrow', age: 70, ancestry: 'west_african', over: { hair: { style: 'none', color: 0x202020 }, weathering: 0.6 } }, role: 'settler',
    level: 2, ...ST, courage: 50, dialogue: 'd_st_deel', attrs: { wits: 7, presence: 8 }, skills: { survival: 50, speech: 40 }, tolls: 20,
    schedule: [{ from: 6, to: 21, spot: 'beds_a', activity: 'work' }, { from: 21, to: 6, spot: 'beds_a', activity: 'away' }],
    barks: ['Dirt remembers. Trays don\'t.', 'Tomatoes, the year the lifts stopped. Red ones. Ask anyone over fifty.', 'Beds are dry by noon. I water with a cup.'],
  },
  {
    id: 'npc_st_06', name: 'Bo', look: { seed: 9506, frame: 'broad', age: 12, ancestry: 'mediterranean', over: { hair: { style: 'paint_buzz', color: 0x2a2018 }, weathering: 0.25 } }, role: 'street',
    level: 1, ...ST, courage: 30, dialogue: 'd_st_bo', attrs: { reflex: 8, senses: 7 }, skills: { stealth: 35 }, tolls: 3,
    schedule: [{ from: 7, to: 22, spot: 'bo_run', activity: 'idle' }, sleep('bo_cot')],
    barks: ['Nine floors in two minutes. Timed.', 'Twelve pays a Toll a message. Nine pays in bread. I like bread.', 'Ulla talks to the lift. The lift doesn\'t talk back. Mostly.'],
  },
  {
    id: 'npc_st_07', name: 'Fitch', look: { seed: 9507, frame: 'broad', age: 44, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x8a7a60 }, facialHair: 'full_beard', weathering: 0.4 } }, role: 'trader',
    level: 4, ...ST, courage: 45, dialogue: 'd_st_fitch', attrs: { barter: 7, wits: 7 } as never, skills: { barter: 60, speech: 40 }, tolls: 260,
    merchant: { buys: ['consumable', 'junk', 'misc', 'tool'], cash: 260, restockDays: 2, markup: 1.4, stock: [['c_water', 10], ['c_tin', 6], ['c_bandage', 3], ['t_repair', 1], ['j_wiring', 3], ['c_fruit', 3]] },
    schedule: [{ from: 7, to: 22, spot: 'stall', activity: 'trade' }, sleep('stall_sit')],
    barks: ['Water. Tins. Wire. Everything a floor needs and nothing a floor wants.', 'Fitch has water. Don\'t ask whose.', 'Rent above twenty and you\'ll be buying from me daily.'],
  },
  {
    id: 'npc_st_08', name: 'Ulla', look: { seed: 9508, frame: 'narrow', age: 58, ancestry: 'east_asian', over: { hair: { style: 'bob02', color: 0x9a9088 }, weathering: 0.55 } }, role: 'drifter',
    level: 2, ...ST, courage: 35, dialogue: 'd_st_ulla', attrs: { senses: 9, wits: 8 }, skills: { science: 40 }, tolls: 5,
    schedule: [{ from: 0, to: 24, spot: 'shaft', activity: 'idle' }],
    barks: ['It counts. The lift. Every night at two it counts to forty and stops.', 'The Plan says the lifts run. The Plan says a lot.', 'Sit. The shaft\'s warm. The shaft\'s always been warm.'],
  },
  {
    id: 'npc_st_09', name: 'Mr Latch', look: { seed: 9509, frame: 'broad', age: 40, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x3a3028 }, facialHair: 'none', weathering: 0.05 } }, role: 'corp',
    level: 5, ...ST, courage: 40, dialogue: 'd_st_latch', attrs: { presence: 9, wits: 9 }, skills: { speech: 65, barter: 60 }, tolls: 600,
    schedule: [{ from: 17, to: 21, spot: 'latch_chair', activity: 'idle' }, { from: 21, to: 17, spot: 'latch_chair', activity: 'away' }],
    barks: ['A third of the crop. Nutrient and the pump. Fair.', 'The Concern believes in growth. So does a tray.', 'Nobody has to decide anything today. That\'s the Concern\'s whole offer.'],
  },
  {
    id: 'npc_st_10', name: 'Ren Ashby', look: { seed: 9510, frame: 'broad', age: 24, ancestry: 'east_african', over: { hair: { style: 'paint_shaved', color: 0x151210 }, weathering: 0.3 } }, role: 'labourer',
    level: 4, ...ST, courage: 70, dialogue: 'd_st_ren', attrs: { grit: 7, brawn: 7 }, skills: { melee: 45, survival: 35 }, tolls: 15,
    equip: ['w_pipe'],
    schedule: [{ from: 6, to: 23, spot: 'beds_c', activity: 'work' }, { from: 23, to: 6, spot: 'beds_c', activity: 'away' }],
    barks: ['One jerry-can of fuel. One night. Trays burn.', 'Mama Deel says talk. Mama Deel\'s been saying talk for three springs.', 'Latch wears a coat that never gets dirty. Think about that.'],
  },
  // the Twelves' crew, and a Nines resident at the laundry
  { id: 'npc_st_t1', name: 'Twelves', look: { seed: 9511, frame: 'narrow', age: 26, ancestry: 'mediterranean' }, ...twelves, level: 3, minor: true, equip: ['w_shiv'], schedule: [{ from: 0, to: 24, spot: 'trays_a', activity: 'work' }], barks: ['Trays. Mind the trays.'] },
  { id: 'npc_st_t2', name: 'Twelves', look: { seed: 9512, frame: 'broad', age: 31, ancestry: 'west_african' }, ...twelves, level: 3, minor: true, equip: ['w_pipe'], schedule: [{ from: 0, to: 24, spot: 'trays_post', activity: 'idle' }], barks: ['Deck\'s ours. Beds are theirs. Tank\'s whoever\'s awake.'] },
  { id: 'npc_st_n1', name: 'Nines', look: { seed: 9513, frame: 'narrow', age: 48, ancestry: 'south_asian' }, ...ST, role: 'settler', level: 2, minor: true, courage: 40, schedule: [{ from: 6, to: 22, spot: 'laundry', activity: 'work' }, sleep('laundry')], barks: ['Water\'s for washing on Tuesdays. Says the committee.', 'Nine\'s dry.'] },
];
