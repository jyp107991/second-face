import type { NpcDef } from '../../engine/npc/defs';

/**
 * The Teeth mines (B5c): Number Four, the free pit on the Teeth's south face, and the people who come over the col to it.
 * Miners' wear is the Skirts' left behind: company grey cut down and re-dyed every colour a smelter's rag will take, quilted
 * against the cold, patched with hide; nobody at Four wears the Concern's grey as it came. The Clean on the col wear it as
 * it came. Story notes: story/B5c_NOTES_SECRET.md.
 */
const sleep = (spot: string, from = 22, to = 6) => ({ from, to, spot, activity: 'sleep' as const });
const FOUR = { team: 'neutral', settlement: 'number_four' } as const;
/** The Clean's collection party on the col: they fire on anyone who fires on them. */
const clean = { team: 'concern', settlement: 'number_four', faction: 'concern', role: 'corp' as const, hostileIf: { flag: 'tm_clean_fight' }, courage: 65, minor: true };

export const TEETH_NPCS: NpcDef[] = [
  {
    // the boss: the Lodge's winchwoman who walked the first dozen over the col
    id: 'npc_tm_01', name: 'Ragna Holm', look: { seed: 5301, frame: 'narrow', age: 61, ancestry: 'north_european', over: { hair: { style: 'elvs_unkempt_french_braid', color: 0x8a8782 }, weathering: 0.7, scars: ['burn_right'] } }, role: 'labourer',
    level: 6, ...FOUR, courage: 65, dialogue: 'd_tm_ragna', attrs: { grit: 9, wits: 8, presence: 7 }, skills: { mechanics: 55, speech: 50, survival: 45 }, tolls: 120,
    schedule: [{ from: 6, to: 18, spot: 'ragna', activity: 'work' }, { from: 18, to: 22, spot: 'ragna_board', activity: 'idle' }, sleep('ragna_sleep', 22, 6)],
    barks: ['Sixty tags. Sixty pegs.', 'No paper past the cage.', 'Snow on the col. Anybody coming will be cold.'],
  },
  {
    // the Shift's runner at Four: he brings the Skirts' runaways over the col
    id: 'npc_tm_02', name: 'Desmond Achebe', look: { seed: 5302, frame: 'broad', age: 34, ancestry: 'west_african', over: { hair: { style: 'coily_twa', color: 0x120e0b }, facialHair: 'stubble', weathering: 0.55 } }, role: 'labourer',
    level: 5, ...FOUR, faction: 'the_shift', courage: 60, dialogue: 'd_tm_desmond', attrs: { grit: 8, brawn: 7, presence: 6 }, skills: { survival: 50, melee: 40, speech: 40 }, tolls: 15,
    schedule: [{ from: 6, to: 20, spot: 'desmond', activity: 'idle' }, { from: 20, to: 23, spot: 'desmond_col', activity: 'idle' }, sleep('desmond_sleep', 23, 6)],
    barks: ['Nobody\'s come down alive this year.', 'Lamps down, or lamps out. The Shift\'s word.', 'Over the col by night. That\'s the only way.'],
  },
  {
    // the cutter: nine years an orderly at the Weighhouse; takes the Concern's chrome out of everyone who comes over
    id: 'npc_tm_03', name: 'Tova Lindqvist', look: { seed: 5303, frame: 'narrow', age: 47, ancestry: 'north_european', over: { hair: { style: 'cut_crop', color: 0x6a4a30 }, weathering: 0.5 } }, role: 'medic',
    level: 4, ...FOUR, courage: 45, dialogue: 'd_tm_tova', attrs: { wits: 8, senses: 7 }, skills: { medicine: 60, science: 40 }, tolls: 30,
    merchant: { buys: ['consumable'], cash: 60, restockDays: 5, markup: 1.4, stock: [['c_bandage', 4], ['c_iodine', 1], ['u_holdfast', 1]] },
    schedule: [{ from: 7, to: 21, spot: 'tova', activity: 'work' }, sleep('tova_sleep', 21, 7)],
    barks: ['Sit. Bite this. It\'s quicker than you think.', 'They put it in you. I take it out. Nobody upstairs hears you after.', 'Keep it clean and keep it dry. Up here, good luck.'],
  },
  {
    // the smelter: the furnace, the store, the face crew
    id: 'npc_tm_04', name: 'Gaspard Okoro', look: { seed: 5304, frame: 'broad', age: 45, ancestry: 'west_african', over: { hair: { style: 'paint_shaved', color: 0x120e0b }, facialHair: 'short_beard', weathering: 0.6, scars: ['burn_left'] } }, role: 'labourer',
    level: 4, ...FOUR, courage: 50, dialogue: 'd_tm_gaspard', attrs: { brawn: 8, grit: 7, wits: 7 }, skills: { mechanics: 50, barter: 45, science: 35 }, tolls: 140,
    merchant: { buys: ['junk', 'tool', 'consumable'], cash: 150, restockDays: 4, markup: 1.3, stock: [['j_tin', 6], ['j_powder', 4], ['t_lamp', 1], ['c_jerky', 6], ['c_water', 4], ['j_scrap', 6]] },
    schedule: [{ from: 6, to: 13, spot: 'gaspard', activity: 'work' }, { from: 13, to: 20, spot: 'gaspard_store', activity: 'trade' }, sleep('gaspard_sleep', 20, 6)],
    barks: ['Tin\'s the only honest metal. Ask anyone who\'s had to eat off it.', 'Twelve a bar, at East Halt. Don\'t ask me why. I don\'t.', 'Mind the furnace. It minds nobody.'],
  },
  {
    // the trapper: the lines on the col and the ridge; she knows the old drift
    id: 'npc_tm_05', name: 'Sachiko Mori', look: { seed: 5305, frame: 'narrow', age: 38, ancestry: 'east_asian', over: { hair: { style: 'ponytail01', color: 0x16120e }, weathering: 0.65, scars: ['brow_cut'] } }, role: 'nomad',
    level: 5, ...FOUR, courage: 55, dialogue: 'd_tm_sachiko', attrs: { senses: 8, reflex: 7, grit: 7 }, skills: { survival: 65, stealth: 50, firearms: 40 }, tolls: 25,
    merchant: { buys: ['junk', 'consumable'], cash: 70, restockDays: 4, markup: 1.2, stock: [['c_meat', 4], ['j_hide', 3], ['j_pelt', 1]] },
    equip: ['w_bolt308'], inventory: [['a_308', 8]],
    schedule: [{ from: 5, to: 9, spot: 'sachiko_line', activity: 'work' }, { from: 9, to: 21, spot: 'sachiko', activity: 'work' }, sleep('sachiko_sleep', 21, 5)],
    barks: ['Hare on the low line. Something bigger on the ridge.', 'Snow tells you everything if you let it.', 'The col watches back.'],
  },
  {
    // the family the Shift sends over the col
    id: 'npc_tm_06', name: 'Chinwe Nnadi', look: { seed: 5306, frame: 'narrow', age: 36, ancestry: 'west_african', over: { hair: { style: 'paint_cornrows', color: 0x120e0b }, weathering: 0.6 } }, role: 'labourer',
    level: 2, ...FOUR, courage: 45, dialogue: 'd_tm_chinwe', attrs: { grit: 8, wits: 7 }, skills: { survival: 25, mechanics: 30 }, tolls: 2,
    schedule: [{ from: 6, to: 22, spot: 'chinwe_bunk', activity: 'idle' }, sleep('chinwe_bunk', 22, 6)],
    barks: ['Ikenna. Stay where I can see you.', 'They weighed me. At the Weighhouse. Like a sack.', 'I can work a hoist. I can work anything.'],
  },
  {
    id: 'npc_tm_07', name: 'Ikenna Nnadi', look: { seed: 5307, frame: 'broad', age: 12, ancestry: 'west_african', over: { hair: { style: 'paint_buzz', color: 0x120e0b }, weathering: 0.3 } }, role: 'street',
    level: 1, ...FOUR, courage: 30, dialogue: 'd_tm_ikenna', attrs: { reflex: 7, senses: 7 }, skills: { stealth: 30 }, tolls: 0,
    schedule: [{ from: 7, to: 21, spot: 'ikenna_bunk', activity: 'idle' }, sleep('ikenna_bunk', 21, 7)],
    barks: ['Is it always this cold?', 'I saw the gardens from the top. They glow.', 'Mum says don\'t talk to anyone. You\'re anyone.'],
  },
  // the Clean's collection party at the switchback
  { id: 'npc_tm_g1', name: 'Guard', look: { seed: 5321, frame: 'broad', age: 36, ancestry: 'north_european', over: { hair: { style: 'paint_buzz', color: 0x46301f } } }, ...clean, level: 6, dialogue: 'd_tm_clean', equip: ['w_carbine556', 'r_riot'], inventory: [['a_556', 20]], barks: ['Stand aside.', 'Concern business.'] },
  { id: 'npc_tm_g2', name: 'Guard', look: { seed: 5322, frame: 'narrow', age: 31, ancestry: 'south_asian', over: { hair: { style: 'ponytail01', color: 0x16120e } } }, ...clean, level: 6, dialogue: 'd_tm_clean', equip: ['w_smg9', 'r_riot'], inventory: [['a_9mm', 20]], barks: ['One name. That\'s all we\'re here for.', 'Keep your hands where I can see them.'] },
  // the Teeth's trails
  {
    id: 'npc_tm_w1', name: 'Ostap', look: { seed: 5331, frame: 'broad', age: 52, ancestry: 'north_european', over: { hair: { style: 'short04', color: 0x46301f }, facialHair: 'full_beard', weathering: 0.85 } }, role: 'nomad',
    team: 'neutral', level: 3, dialogue: 'd_re_tm_trapper', attrs: { senses: 7 }, skills: { survival: 55 }, tolls: 6,
    barks: ['Snow\'s early.', 'Hares go white before the people do.'],
  },
  {
    id: 'npc_tm_w2', name: 'Ylva', look: { seed: 5332, frame: 'narrow', age: 26, ancestry: 'north_european', over: { hair: { style: 'cut_messy', color: 0x8f6c45 }, weathering: 0.7 } }, role: 'labourer',
    team: 'neutral', level: 1, dialogue: 'd_re_tm_runaway', attrs: { grit: 6 }, skills: { survival: 20 }, tolls: 0,
    barks: ['Is this the way? Tell me this is the way.', 'Don\'t send me back.'],
  },
];
