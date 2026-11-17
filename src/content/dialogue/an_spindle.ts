import type { CheckDef, DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './rc_line';

/**
 * Spindle (B5d): the pickers' camp on the Ashlands' western edge. The weigher and her board, the picking runs onto the glass
 * in three bands (scarcity: three finds a band, then the plain wage), the kite-watcher and his flag, the doctor, the
 * hound-keeper and his tame hound, the one who came back from Kelso, and the Concern's contractor with a job and a work
 * order. What Sleeps at Kelso (`q_an_kelso`) starts here and at Kelso; A Kite Day (`q_an_kite`) is the weigher's grandson
 * pinned at Pemberton under the kites; A Board for Dorcas (`q_an_board`) finishes Yard Nine's open route. Story notes:
 * story/B5d_NOTES_SECRET.md.
 */

export { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave };
export const on: OptionDef = { text: '(Go on.)', exit: true };
export const DAY: Cond = { hour: { from: 6, to: 19 } };
export const GRID_CHROME: Cond = { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }] };

// ---------------------------------------------------------------- state

/** The kite flag is up: the weigher's grandson is out at Pemberton under the kites, and nobody has brought him in. */
export const KITE_DAY: Cond = { all: [{ flag: 'an_kite_day' }, { not: { flag: 'an_kite' } }] };
export const KELSO_SETTLED: Cond = { flag: 'an_kelso' };
/** The contractor is still at Spindle (not put out, not gone with or without what he came for, not dead). */
export const SORLIE_HERE: Cond = { not: { flag: 'an_sorlie' } };
/** Somebody can reach him: at Spindle, or at Kelso's gate once Spindle has put him out. */
export const SORLIE_ABOUT: Cond = { any: [SORLIE_HERE, { flag: 'an_sorlie', eq: 'out' }] };
export const CORE: Cond = { item: 'k_an_core' };
export const CARD_KNOWN: Cond = { knows: 'an_card_known' };
export const RESERVE_KNOWN: Cond = { knows: 'an_reserve_known' };
export const KWESI_PAID: Cond = { knows: 'an_kwesi_paid' };
export const KWESI_DEAD: Cond = { flag: 'an_kwesi_dead' };
export const KITES_DOWN: Cond = { flag: 'an_kites', eq: 'down' };

// ---------------------------------------------------------------- the ends of What Sleeps at Kelso

const KELSO = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_an_kelso', start: true }, { set: 'an_kelso', value: v }, ...extra, { decision: { id: `an_kelso_${v}`, text } }];

export const KELSO_SOLD: Effect[] = KELSO('sold', 'I let the Concern\'s contractor carry Kelso\'s command unit out of its rack and east on a sled, for three hundred Tolls. Whatever sleeps in Kennel Seven answers to Halcyon now.', [
  { set: 'an_key', value: 'concern' }, { set: 'an_reserve', value: 'concern' }, { set: 'an_sorlie', value: 'gone' }, { give: 'tolls', count: 300 }, { rep: { faction: 'concern', respect: 15 } }, { xp: 120 },
  A(KES, -25), A(WREN, -10), A(ASH, -10), A(TAMSIN, -10), A(NINE, -5), A(ILYA, -5), A(ODILE, 2),
  { news: { tag: 'an_sold', text: 'the Concern\'s man at Spindle went east off the glass with something heavy on a sled, paid for and covered', valence: -4, size: 5, at: 'spindle' } },
]);
export const KELSO_HELD: Effect[] = KELSO('held', 'I talked the thing in Kelso\'s rack into refusing everyone: no lawful command survives, so none will be obeyed. It sealed Kennel Seven against every code there is, the Concern\'s too. The reserve sleeps, and stays asleep.', [
  { set: 'an_key', value: 'none' }, { set: 'an_reserve', value: 'sealed' }, { set: 'an_kelso_quiet' }, { set: 'an_sorlie', value: 'gone' }, { rep: { faction: 'concern', respect: -15 } }, { xp: 250 },
  A(KES, 10), A(NINE, 8), A(ASH, 5), A(TAMSIN, 5), A(WREN, 5),
  { news: { tag: 'an_sealed', text: 'Kelso\'s dead base on the March has gone quiet; the Concern\'s man left Spindle with nothing on his sled', valence: 6, size: 5, at: 'spindle' } },
]);
export const KELSO_TAKEN: Effect[] = KELSO('taken', 'I pulled the command unit\'s core out of Kelso\'s rack and carried it away myself. Whatever sleeps in Kennel Seven listens to what is in my pack.', [
  { give: 'k_an_core' }, { set: 'an_key', value: 'player' }, { set: 'an_reserve', value: 'player' }, { set: 'an_kelso_quiet' }, { rep: { faction: 'concern', respect: -10 } }, { xp: 200 },
  A(KES, -5), A(NINE, -3), A(ASH, -5), A(ILYA, 3), A(ODILE, 3),
  { news: { tag: 'an_taken', text: 'somebody came up out of Kelso\'s hall carrying a thing the size of a loaf, and the base\'s hounds lay down and let them by', valence: 3, size: 6, at: 'spindle' } },
]);
export const KELSO_BROKEN: Effect[] = KELSO('broken', 'I broke the command unit in Kelso\'s rack. Nobody will ever wake Kennel Seven with a word. Nobody will ever hold it asleep with one either.', [
  { set: 'an_key', value: 'none' }, { set: 'an_reserve', value: 'leaderless' }, { set: 'an_feral' }, { set: 'an_sorlie', value: 'gone' }, { rep: { faction: 'concern', respect: -15 } }, { xp: 150 },
  A(KES, 3), A(ASH, 3), A(NINE, -10), A(TAMSIN, -3),
  { news: { tag: 'an_broken', text: 'a blast under Kelso\'s apron shook the glass for a mile; the pickers say the base\'s hounds have stopped keeping to the base', valence: 0, size: 6, at: 'spindle' } },
]);
/** The core carried out and sold to the contractor afterwards: the same keys change hands. */
export const CORE_SOLD: Effect[] = [
  { take: 'k_an_core' }, { set: 'an_key', value: 'concern' }, { set: 'an_reserve', value: 'concern' }, { set: 'an_core_sold' }, { set: 'an_sorlie', value: 'gone' }, { give: 'tolls', count: 300 }, { rep: { faction: 'concern', respect: 15 } },
  A(KES, -25), A(WREN, -10), A(ASH, -10), A(TAMSIN, -10), A(NINE, -5),
  { decision: { id: 'an_core_sold', text: 'I sold the core out of Kelso\'s rack to the Concern\'s contractor for three hundred Tolls. Kennel Seven answers to Halcyon now.' } },
];

// ---------------------------------------------------------------- the ends of A Kite Day

const KITE = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_an_kite', start: true }, { set: 'an_kite', value: v }, ...extra, { decision: { id: `an_kite_${v}`, text } }];
const HOME: Effect[] = [{ set: 'an_kwesi_home' }, { trust: { npc: 'npc_an_01', by: 25 } }];
/** Home across the glass to Spindle (the exit of the scene that brings the boy back). */
export const TO_SPINDLE: Effect = { event: 'goto', data: { location: 'an_spindle', spawn: 'from_pemberton' } };

export const KITE_DARK: Effect[] = KITE('dark', 'I cut Pemberton\'s inverter. The kites have nothing to sit on and charge, and they are coming down out of the sky one by one wherever their light runs out. Kwesi Kwarteng walked home in daylight.', [
  { set: 'an_kites', value: 'down' }, { set: 'an_reserve_blind' }, { time: 120 }, { xp: 200 }, A(KES, 3), A(NINE, 3), A(TAMSIN, 3), A(WREN, 2),
  { news: { tag: 'an_kites_down', text: 'the kites are coming down over the Ashlands; Spindle\'s pickers walk the glass by day', valence: 8, size: 6, at: 'spindle' } }, ...HOME,
]);
export const KITE_WAITED: Effect[] = KITE('waited', 'I waited out the kite day with Kwesi Kwarteng in Pemberton\'s inverter house, and brought him home across the glass in the dark.', [
  { until: 20 }, { time: 180 }, { xp: 150 }, A(TAMSIN, 3), A(WREN, 5), A(ASH, 3), ...HOME,
]);
export const KITE_SHOT: Effect[] = KITE('shot', 'I shot two kites out of the sky over Pemberton and brought Kwesi Kwarteng home. Somewhere east, something will have counted them.', [
  { give: 'j_an_kiteboard' }, { set: 'an_kelso_alert' }, { time: 90 }, { xp: 120 }, A(ILYA, 5), A(ASH, -2),
  { news: { tag: 'an_kites_shot', text: 'somebody shot two kites down over Pemberton\'s panels', valence: 4, size: 5, at: 'spindle' } }, ...HOME,
]);
export const KITE_LEFT: Effect[] = KITE('left', 'I left Kwesi Kwarteng in Pemberton\'s inverter house to wait for dark. He did not wait. A kite took him on the glass a mile from the hut.', [
  { set: 'an_kwesi_dead' }, { trust: { npc: 'npc_an_01', by: -40 } }, A(TAMSIN, -15), A(ASH, -15), A(WREN, -15), A(KES, -10), A(NINE, -5), A(ILYA, -5), A(ODILE, -5),
  { news: { tag: 'an_kwesi_dead', text: 'the weigher\'s grandson died on the glass on a kite day; a stranger had found him and left him', valence: -8, size: 5, at: 'spindle' } },
]);

// ---------------------------------------------------------------- the picking runs

/** A band of picking: three finds in order, then the plain wage (scarcity: the glass gives up its best once). */
function band(id: string, label: string, flag: string, finds: { effects: Effect[]; node: string }[], wage: Effect[], hours: number, check?: CheckDef, cond?: Cond): OptionDef[] {
  const at = [{ not: { flag } }, { flag, eq: 1 }, { flag, eq: 2 }] as Cond[];
  const base = (extra: Cond): Cond => (cond ? { all: [cond, extra] } : extra);
  const fail = check ? { fail: 'run_fail', failEffects: [{ time: hours * 60 }] as Effect[] } : {};
  return [
    ...finds.map((f, i): OptionDef => ({ id: `${id}.${i}`, text: label, if: base(at[i]), check, effects: [{ time: hours * 60 }, { inc: flag }, ...f.effects], next: f.node, repeat: true, ...fail })),
    { id: `${id}.wage`, text: label, if: base({ flag, gte: 3 }), check, effects: [{ time: hours * 60 }, ...wage], next: 'run_wage', repeat: true, ...fail },
  ];
}

const KELSO_KNOWN: Cond = { any: [{ knows: 'loc_lm_ash_01' }, { knows: 'seen_kelso' }] };
const ARRAY_OPEN: Cond = { any: [KITES_DOWN, { flag: 'an_kite' }] };

export const d_an_table: DialogueDef = {
  id: 'd_an_table', owner: 'npc_an_01',
  start: [{ node: 'table' }],
  nodes: {
    table: {
      speaker: 'narrator',
      text: [
        { if: KITE_DAY, text: 'The weigher\'s table, the scale on it, and the board behind it with the day\'s runs chalked and every one of them rubbed out: nobody goes on the glass on a kite day. Hester sits with her hands flat on the table and does not look at you.' },
        { text: 'The weigher\'s table: a pre-war school desk with a brass scale on it, and the runs chalked on the board behind it. THE EDGE — 3 HRS. THE CRATERS — 5 HRS — IODINE. THE PANELS — KITES. KELSO — SHUT. Hester writes your name up before you go and ticks it when you come back, and weighs what you bring.' },
      ],
      again: 'The weigher\'s table and its scale.',
      effects: [{ learn: 'an_runs_known' }],
      options: [
        ...band('run.edge', '(Pick the edge of the glass. Three hours.)', 'an_run_edge', [
          { effects: [{ give: 'j_glass', count: 2 }, { give: 'j_scrap', count: 2 }], node: 'edge_1' },
          { effects: [{ give: 'u_powercell', count: 1 }], node: 'edge_2' },
          { effects: [{ give: 'tolls', count: 25 }], node: 'edge_3' },
        ], [{ give: 'j_glass', count: 1 }, { give: 'tolls', count: 3 }], 3, { skill: 'survival', dc: 25 }, { not: KITE_DAY }),
        ...band('run.craters', '(Pick the crater field under Kelso. Five hours.)', 'an_run_craters', [
          { effects: [{ give: 'j_electronics', count: 2 }, { give: 'j_wiring', count: 2 }], node: 'craters_1' },
          { effects: [{ give: 'j_controller', count: 1 }], node: 'craters_2' },
          { effects: [{ give: 'tolls', count: 35 }, { give: 'c_radflush', count: 1 }], node: 'craters_3' },
        ], [{ give: 'j_electronics', count: 1 }, { give: 'tolls', count: 6 }], 5,
        { skill: 'survival', dc: 40, mods: [{ if: { flag: 'an_selin_map' }, dc: -15, why: 'Selin\'s map of the crater field' }, { if: { item: 'c_iodine' }, dc: -5, why: 'iodine in your pocket' }, { if: { flag: 'an_feral' }, dc: 10, why: 'Kelso\'s hounds walk where they like now' }] },
        { all: [KELSO_KNOWN, { not: KITE_DAY }] }),
        ...band('run.panels', '(Pick Pemberton\'s array. Six hours.)', 'an_run_panels', [
          { effects: [{ give: 'u_powercell', count: 2 }], node: 'panels_1' },
          { effects: [{ give: 'j_an_kiteboard', count: 1 }], node: 'panels_2' },
          { effects: [{ give: 'tolls', count: 40 }], node: 'panels_3' },
        ], [{ give: 'j_wiring', count: 2 }, { give: 'tolls', count: 8 }], 6,
        { skill: 'science', dc: 45, mods: [{ if: KITES_DOWN, dc: -20, why: 'the kites are down' }, { if: { item: 'k_an_notebook' }, dc: -10, why: 'the dead picker\'s notebook of their arcs' }, { if: { skill: 'mechanics', gte: 40 }, dc: -5, why: 'you can open a panel without breaking it' }] },
        { all: [ARRAY_OPEN, { not: KITE_DAY }] }),
        { id: 'table.trade', text: '(Weigh what you have.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        leave,
      ],
    },
    edge_1: { speaker: 'narrator', text: 'Three hours along the edge where the scrub gives up and the glass begins, turning over the fused crust with a bar: glass that will cut, glass that will sell, and the scrap of a pre-war fence that was a fence for a mile and then was not.', again: 'The edge, and its glass.', options: [{ text: '(Back to the table.)', exit: true }] },
    edge_2: { speaker: 'narrator', text: 'In a drift of black sand against a fallen pylon, a pre-war power cell in its case, the kind a lineman carried, still holding a little charge after ninety years. Hester weighs it in her hand and nods, and does not say what it is worth, because she is going to buy it.', again: 'The edge, and a lineman\'s cell.', options: [{ text: '(Back to the table.)', exit: true }] },
    edge_3: { speaker: 'narrator', text: 'Under a sheet of glass you have to break with your boot heel, a wrist: a soldier\'s, or a farmer\'s, ninety years in the crust, and on it a steel watch that still ticks when you wind it. You leave the wrist where it is. Hester gives you twenty-five for the watch without looking at it, and puts it in a drawer full of them.', again: 'The edge, and a watch on a wrist.', options: [{ text: '(Back to the table.)', exit: true }] },
    craters_1: { speaker: 'narrator', text: 'Five hours among the craters under Kelso\'s fence, where the strikes threw half a base across the glass: cable as thick as your arm, a junction box full of boards gone green, and the iodine taste in your mouth the whole way.', again: 'The craters, and the cable.', options: [{ text: '(Back to the table.)', exit: true }] },
    craters_2: { speaker: 'narrator', text: 'At the bottom of a dry crater, a hound\'s housing split open like a seed pod, and inside it, potted in resin and untouched by anything, its controller. Pristine. Worth a rifle. You carry it back against your chest as if it might wake.', again: 'The craters, and a hound\'s controller.', options: [{ text: '(Back to the table.)', exit: true }] },
    craters_3: { speaker: 'narrator', text: 'A field dressing station, half in a crater, half out: its roof gone, its cabinets fused shut, all but one. Inside it, in an army tin, three phials of the old flush and a purse of pre-war coin somebody meant to come back for. Delphine takes one phial off you at once and gives you Tolls for it.', again: 'The craters, and the dressing station.', options: [{ text: '(Back to the table.)', exit: true }] },
    panels_1: { speaker: 'narrator', text: 'Six hours among the panel rows with a screwdriver and the sky in the corner of your eye: two of the array\'s junction cells, cool and heavy and full, unbolted from under a row that has not felt a hand since the Burn.', again: 'The panels, and two cells.', options: [{ text: '(Back to the table.)', exit: true }] },
    panels_2: { speaker: 'narrator', text: 'A kite down between two rows where it came in to perch and missed: wings folded wrong, its housing cracked on the glass, its board inside it whole. Hester holds it up to the light for a long time. "A winter," she says. "That\'s a winter, that is."', again: 'The panels, and a fallen kite.', options: [{ text: '(Back to the table.)', exit: true }] },
    panels_3: { speaker: 'narrator', text: 'The silver in the panels\' backs, scraped out of a whole row\'s cracked cells into a tin: Hester weighs it, and weighs it again, and pays you forty, and puts the tin in the strongbox under the scale where she keeps the things that matter.', again: 'The panels, and their silver.', options: [{ text: '(Back to the table.)', exit: true }] },
    run_wage: { speaker: 'narrator', text: 'Hours on the glass, the light coming up off it into your eyes, and what the glass gives up when it has given up its best already: a little scrap, a little wire, a few Tolls from the scale. Hester ticks your name.', again: 'A run on the glass.', options: [{ text: '(Back to the table.)', exit: true }] },
    run_fail: { speaker: 'narrator', text: 'The glass beats you: a wrong turn among craters that all look alike, the light off the crust closing your eyes to slits, and your water half gone before you have found anything worth carrying. You come back with nothing and Hester ticks your name anyway, because you came back.', again: 'A run that gave nothing.', options: [{ text: '(Back to the table.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the board

export const d_an_board: DialogueDef = {
  id: 'd_an_board', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_board_chalked' }, text: 'The board: names out, names ticked back, a season of them. Four names at the bottom have a line under them now and, in Hester\'s square chalk, DEAD AT KELSO — A CARD THEY WERE GIVEN. Somebody has put a sprig of glass-thorn on the ledge under them.' },
        { if: KWESI_DEAD, text: 'The board: names out, names ticked. The newest is KWESI, and it is not ticked, and nobody has rubbed it out, and nobody will.' },
        { text: 'The board: a sheet of pre-war blackboard bolted to the hall wall, a season of names on it in chalk, each one ticked when its picker came back off the glass. Four at the bottom are not ticked: KELSO RUN — MATEI, SUNNIVA, OLU, DRAGOS — DUE BACK, and a date in the spring. Under them, newer: KELSO — SHUT — H.K.' },
      ],
      again: 'The board, and the names on it.',
      effects: [{ lead: 'l_an_four' }, { quest: 'q_an_kelso', start: true }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Hester Kwarteng, the weigher

const TELL_SORLIE: Effect[] = [{ set: 'an_sorlie', value: 'out' }, { set: 'an_board_chalked' }, { trust: { npc: 'npc_an_01', by: 15 } }, { memory: { npc: 'npc_an_01', tag: 'told_her_sorlie', valence: 30 } }, { xp: 60 }];

export const d_an_hester: DialogueDef = {
  id: 'd_an_hester', owner: 'npc_an_01',
  start: [{ if: { knows: 'an_hester_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A tall woman in a re-dyed army jacket at the school\'s scale, her grey hair cropped to the skull, her forearms tight with old burn scars, reading your boots before your face. "New." Not a question. "I\'m Hester. I weigh. If you go on the glass you put your name on the board first, and you come back and I tick it, and I buy what you bring at a fair weight. If you don\'t come back I don\'t come looking. Nobody does."',
      again: 'Hester, at the scale.',
      effects: [{ learn: 'an_hester_met' }, { learn: 'loc_spindle' }],
      interject: [
        { companion: TAMSIN, text: '"Nobody comes looking," Tamsin says, very quietly, after. "She said that like it was the rules for a game."' },
        { companion: WREN, text: '"Fair woman," Wren says. "Scared of something. Look at her hands on that scale."' },
      ],
      options: [{ id: 'hester.go', text: 'Understood.', next: 'hub' }],
    },
    hub: {
      text: [
        { if: KITE_DAY, text: 'Hester at the scale with her hands flat on the table. She does not weigh anything. "The flag\'s up," she says. "He went to the panels at dawn."' },
        { if: KWESI_DEAD, text: 'Hester at the scale. She weighs what she is given and ticks what she is told and does not look up at anyone she does not have to, and least at you.' },
        { if: { flag: 'an_kwesi_home' }, text: 'Hester at the scale, and her grandson on a crate by the stove pretending he is not listening. "Name on the board?" she says to you, and almost smiles.' },
        { text: '"Weighing, or asking?" Hester does not stop sorting glass.' },
      ],
      again: 'Hester waits.',
      options: [
        { id: 'hester.board', text: 'Four names on your board aren\'t ticked.', if: { not: { seen: 'hester.board' } }, next: 'four' },
        { id: 'hester.sorlie', text: 'Who\'s the man in the clean coat?', if: { all: [SORLIE_HERE, { not: { seen: 'hester.sorlie' } }] }, next: 'sorlie' },
        { id: 'hester.kwesi', text: 'Where\'s Kwesi?', if: KITE_DAY, next: 'kite' },
        { id: 'hester.paid', text: 'Kwesi didn\'t go to the panels for cells. Your lodger paid him to map the kites.', if: { all: [KWESI_PAID, SORLIE_HERE] }, effects: [...TELL_SORLIE, { learn: 'an_told_hester_kwesi' }], next: 'out' },
        { id: 'hester.card', text: 'Your four died at Kelso because of a card your lodger gave their guide.', if: { all: [CARD_KNOWN, SORLIE_HERE] }, effects: TELL_SORLIE, next: 'out' },
        { id: 'hester.card2', text: 'Your four at Kelso died because of a card the Concern\'s man gave their guide.', if: { all: [CARD_KNOWN, { not: SORLIE_HERE }, { not: { flag: 'an_board_chalked' } }] }, effects: [{ set: 'an_board_chalked' }, { trust: { npc: 'npc_an_01', by: 10 } }, { xp: 40 }], next: 'chalk' },
        { id: 'hester.board_dorcas', text: 'I\'ve an army board out of Kelso\'s shed. Is it worth anything here?', if: { all: [{ item: 'k_an_board' }, { not: { flag: 'an_board' } }] }, next: 'pump' },
        { id: 'hester.glass', text: 'What is the glass, here?', if: { not: { seen: 'hester.glass' } }, next: 'glass' },
        { id: 'hester.trade', text: '(Weigh what you have.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    four: {
      text: '"Matei, Sunniva, Olu, Dragos." She does not look at the board. "Kelso, in the spring. The base on the March, a day east. Old army. Old boards, old chrome, if you can get at it. Matei had a way in, he said." She puts a piece of glass on the scale and takes it off again. "Parveen went with them and came back. Ask her. She won\'t tell you. Then I shut Kelso, and nobody\'s been since but the man in the clean coat, and he only goes as far as the gate."',
      again: '"Ask Parveen. She won\'t tell you."',
      effects: [{ lead: 'l_an_four' }, { quest: 'q_an_kelso', start: true }, { learn: 'loc_lm_ash_01' }],
      interject: [{ companion: ILYA, text: 'Ilya is looking at the board, counting. "Four out, one back," he says. "That\'s not the glass. The glass takes one at a time."', effects: [A(ILYA, 2)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    sorlie: {
      text: '"Sorlie. The Concern\'s." She says it the way people here say glass. "Contract man, up from the Skirts with paper. Pays double for the east room and doesn\'t eat with us. Wants a guide into Kelso, pays three hundred. Matei\'s card was his." She looks at you for the first time properly. "I took his money for the room. I\'m not proud. We had a thin winter."',
      again: '"I took his money for the room."',
      effects: [{ learn: 'an_sorlie_known' }],
      interject: [{ companion: KES, text: '"A contract man in the Ashlands with a card," Kes says. "Obviously he\'s not after old chrome." She rubs her neck without noticing.' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    kite: {
      text: 'She speaks to the scale, not to you. "Pemberton. The panels. He wanted cells; he\'s sixteen; he wants everything. He went before light, and Ingmar ran the flag up at nine." Her hands stay flat. "You don\'t go out on a kite day. That\'s the law here. It\'s the only one I keep."',
      again: '"You don\'t go out on a kite day."',
      effects: [{ quest: 'q_an_kite', start: true }, { learn: 'loc_lm_ash_02' }, { learn: 'an_kwesi_out' }],
      interject: [
        { companion: TAMSIN, text: '"I\'m going," Tamsin says, to you, not to her. "You\'re going. Aren\'t we."', effects: [A(TAMSIN, 2)] },
        { companion: ASH, text: 'Ash has his hat in his hands. "Sixteen," he says. "I\'ll carry him if he can\'t walk."', effects: [A(ASH, 2)] },
      ],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    out: {
      text: 'She hears you out. Then she gets up from the scale, which you have not seen her do, and walks to the east room, and you hear her voice through the wall, low, the whole of it said once and not repeated. When she comes back she sits down and picks up a piece of glass. "He\'s going," she says. "He can camp at Kelso\'s gate with his card and see who comes to him there." Then she goes to the board and chalks under the four names, and her hand is steady.',
      again: '"He can camp at Kelso\'s gate."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    chalk: {
      text: 'She goes to the board and chalks under the four names, DEAD AT KELSO — A CARD THEY WERE GIVEN, and stands looking at it. "He\'s gone, your clean coat," she says. "Gone or going. It doesn\'t bring them back. It goes on the board."',
      again: '"It goes on the board."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    glass: {
      text: '"The March." She means the plateau. "The old border. The army kept it with machines, and when the war came the other side burned it flat and the machines with it, most of them. What burned is glass. What didn\'t is still out there doing what it was told." She weighs a shard. "We pick what the glass gives up. It gives up boards and cells and old chrome off the dead, and it gives up people who get greedy. I weigh both."',
      again: '"I weigh both."',
      effects: [{ learn: 'an_march_known' }],
      interject: [{ companion: NINE, text: '"The March Command," Nine says. "It was in the city\'s defence schedule before the Burn: the eastern belt, contracted out. The record says it was decommissioned." A pause. "The record is wrong about some things."' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    pump: {
      text: 'She turns it in her hands, and her face does something you have not seen it do. "Army. Before the Scald. Nobody in it." She sets it down very gently. "Our well\'s pump has run on a cracked board for twelve years, and every season it drinks a little more of what it brings up. With that in it, the water comes up clean." She looks at you. "Sixty Tolls, and the east room\'s yours free as long as I keep it. That\'s what I can give. It\'s worth more to anyone with a rail."',
      again: '"It\'s worth more to anyone with a rail."',
      options: [
        { id: 'hester.pump.yes', text: 'Put it in your pump.', effects: [{ take: 'k_an_board' }, { give: 'tolls', count: 60 }, { set: 'an_board', value: 'spindle' }, { set: 'an_bunk_rented' }, { set: 'an_well_clean' }, { trust: { npc: 'npc_an_01', by: 20 } }, { xp: 120 }, { quest: 'q_an_board', start: true }, A(TAMSIN, 3), A(ASH, 3), A(KES, 2),
          { decision: { id: 'an_board_spindle', text: 'I gave the army board out of Kelso\'s shed to Spindle\'s well pump. The water there comes up clean.' } },
          { news: { tag: 'an_well_clean', text: 'Spindle\'s well runs clean on an old army board a stranger brought in off the glass', valence: 6, size: 4, at: 'spindle' } }], next: 'pumped' },
        { text: 'I\'ll think about it.', next: 'hub' },
      ],
    },
    pumped: { text: 'She has the pump\'s housing open before you have finished speaking, and an hour later the well\'s handle is going up and down under a child\'s hands, and what comes out of the spout is clear. Hester fills a tin cup and drinks it standing, all of it, and then sits down at the scale as if nothing has happened.', again: 'The well, running clear.', options: [{ text: 'Something else.', next: 'hub' }] },
  },
};

// ---------------------------------------------------------------- Kwesi Kwarteng

export const d_an_kwesi: DialogueDef = {
  id: 'd_an_kwesi', owner: 'npc_an_02',
  start: [{ if: { flag: 'an_kwesi_home' }, node: 'home' }, { if: { knows: 'an_kwesi_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy of sixteen on a cot in the west room with a sheet of glass across his knees, scratching on it with a nail. He hides the glass as you come. "Have you been out? Out far? Kelso, or the panels?" He does not wait. "Gran says I can do the edge when I\'m seventeen. The edge is for babies. There\'s nothing on the edge."',
      again: 'Kwesi, with his sheet of glass.',
      effects: [{ learn: 'an_kwesi_met' }],
      options: [{ id: 'kwesi.glass', text: 'What are you drawing?', next: 'drawing' }, bye],
    },
    again: {
      text: '"Have you been to the panels yet?" Kwesi asks, as if the question had been waiting all day.',
      again: 'Kwesi waits.',
      options: [{ id: 'kwesi.glass2', text: 'What are you drawing?', if: { not: { seen: 'kwesi.glass' } }, next: 'drawing' }, bye],
    },
    drawing: {
      text: '"Nothing." It is lines: rows, and loops over the rows. "Birds." He puts it under the cot. "Gran says don\'t go on about the panels."',
      again: '"Birds."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    home: {
      text: [
        { if: { flag: 'an_kite', eq: 'shot' }, text: 'Kwesi, with the shaking gone out of him and something else come in instead. "You shot them," he says. "Two. Out of the sky. Nobody does that." He looks east. "Gran says something will have counted."' },
        { text: 'Kwesi on a crate by the stove, not drawing anything. "He gave me a coin," he says, before you ask. "The clean man. For the turns. How they fly round. I didn\'t know what for." He looks at his hands. "I still don\'t."' },
      ],
      again: 'Kwesi, by the stove.',
      options: [bye],
    },
  },
};

export const d_an_kwesi_cot: DialogueDef = {
  id: 'd_an_kwesi_cot', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { any: [KITE_DAY, { flag: 'an_kite' }] }, text: 'Kwesi\'s cot. Under it, a sheet of glass scratched with a nail: Pemberton\'s rows, and over them the turns the kites fly, loop after loop, every one dated, a month of mornings. And wedged into the cot\'s frame where a boy hides what matters, a coin that is not a Toll: white metal, the closed eye on one side, a number on the other. Concern scrip.' },
        { text: 'A cot in the west room, a blanket folded square, and under it the edge of a sheet of glass.' },
      ],
      again: 'Kwesi\'s cot.',
      effects: [],
      options: [
        { id: 'cot.take', text: '(Look at the glass and the coin.)', if: { all: [{ any: [KITE_DAY, { flag: 'an_kite' }] }, { not: { lead: 'l_an_scrip' } }] }, effects: [{ lead: 'l_an_kwesi_map' }, { lead: 'l_an_scrip' }], next: 'seen' },
        leave,
      ],
    },
    seen: {
      text: 'A month of kite turns over Pemberton, careful, in a boy\'s hand; and a coin a contractor pays with when he wants a thing done that he will not do himself.',
      again: 'The glass and the coin.',
      interject: [{ companion: KES, text: '"Scrip." Kes turns the coin over. "They pay the Skirts in this. Nobody up the hill would pay a boy for bird pictures." She looks east. "They want to know how the kites guard something."' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Ingmar Lund, the kite-watcher

export const d_an_ingmar: DialogueDef = {
  id: 'd_an_ingmar', owner: 'npc_an_03',
  start: [{ if: { knows: 'an_ingmar_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man at the foot of the tower with a pre-war spotting scope slung on his back and his eyes red-rimmed from the glass light. "Lund. I watch the sky." He jerks his head up at the pole with its folded black square. "When I see a kite I run the flag, and everybody goes in, and nobody argues. That\'s all I do. It\'s enough."',
      again: 'Ingmar, at the tower\'s foot.',
      effects: [{ learn: 'an_ingmar_met' }],
      options: [{ id: 'ingmar.ok', text: 'Tell me about the kites.', next: 'kites' }, bye],
    },
    hub: {
      text: [
        { if: KITE_DAY, text: 'Ingmar at the tower\'s foot with the scope at his eye, pointed south-east at nothing you can see. "Three up," he says. "Over the panels. Working the rows."' },
        { if: KITES_DOWN, text: 'Ingmar sits at the tower\'s foot with the scope across his knees and nothing to point it at. "Came down one at a time," he says. "Like birds that forgot how. I don\'t know what to do with my days."' },
        { text: 'Ingmar has the scope on the horizon. "Clear," he says. "For now."' },
      ],
      again: 'Ingmar, with the scope.',
      options: [
        { id: 'ingmar.kites', text: 'Tell me about the kites.', if: { not: { seen: 'ingmar.ok' } }, next: 'kites' },
        { id: 'ingmar.east', text: 'Where do they go at dusk?', if: { all: [{ seen: 'ingmar.ok' }, { not: { seen: 'ingmar.east' } }] }, next: 'east' },
        { id: 'ingmar.boy', text: 'Can Kwesi be got back?', if: KITE_DAY, next: 'boy' },
        bye,
      ],
    },
    kites: {
      text: '"Army machines. Wings like a gull and a lens underneath." He does not take his eye from the scope. "They fly on the sun. All day they quarter the glass and anything that moves on it they stoop at, and they don\'t miss twice. At dusk they go down to the panels at Pemberton and sit on poles at the ends of the rows, and drink." He lowers the scope at last. "Something there still feeds them. Ninety years. A hut that hums."',
      again: '"A hut that hums."',
      effects: [{ lead: 'l_an_kites' }, { learn: 'loc_lm_ash_02' }],
      interject: [{ companion: ILYA, text: '"What they stoop at," Ilya says. "Movement or heat?" Ingmar looks at him with new respect. "Movement. Heat close up." Ilya nods. "Then you don\'t move."', effects: [A(ILYA, 2)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    east: {
      text: '"The ones that don\'t sit at Pemberton go east, past Kelso, to a ridge we call Saddleback, and over it, and down." He shrugs. "Nobody\'s been over Saddleback and come back to say. There\'s a valley. They circle it the way a dog circles a sheep it\'s minding." He points with the scope. "Take the track east out of Kelso if you want to look. Lie down at the top. Don\'t stand up against the sky."',
      again: '"Don\'t stand up against the sky."',
      effects: [{ learn: 'loc_lm_ash_03' }, { learn: 'an_valley_heard' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    boy: {
      text: 'He is quiet a long time. "They\'re working the rows, not the hut. He\'ll be in the hut if he\'s got sense; it\'s the only roof out there. At dusk they go down to drink, and then there\'s an hour of dark before the moon when nothing up there can see much." He hands you nothing, says nothing about going. "Hester won\'t ask you. She can\'t."',
      again: '"Hester won\'t ask you."',
      effects: [{ learn: 'an_dusk_window' }, { learn: 'loc_lm_ash_02' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
  },
};

// ---------------------------------------------------------------- Delphine Arcand, the doctor

export const d_an_delphine: DialogueDef = {
  id: 'd_an_delphine', owner: 'npc_an_04',
  start: [{ if: { knows: 'an_delphine_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in a canvas apron in a scrap shack that smells of vinegar and iodine, washing a picker\'s eyes out with a squeeze bottle. "Arcand. Doctor, near enough." She does not stop. "Show me your hands. Show me your eyes. Iodine before you go out, flush after you come back if you were long in the craters, and don\'t look at the glass at noon. That\'s all the medicine there is, out here."',
      again: 'Delphine, with the squeeze bottle.',
      effects: [{ learn: 'an_delphine_met' }],
      options: [{ id: 'delph.go', text: 'Thanks.', next: 'hub' }],
    },
    hub: {
      text: '"Hands," Delphine says, by way of hello, and looks at yours.',
      again: 'Delphine waits.',
      options: [
        { id: 'delph.parveen', text: 'Parveen Rao. What happened to her hands?', if: { not: { seen: 'delph.parveen' } }, next: 'parveen' },
        { id: 'delph.rads', text: 'What does the glass do to people?', if: { not: { seen: 'delph.rads' } }, next: 'rads' },
        { id: 'delph.trade', text: '(Buy iodine, flush, dressings.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    parveen: {
      text: '"Glass." She sets the bottle down. "She came back across the apron at Kelso on her hands and knees in the noon light, a mile of it, because her legs had stopped. The palms are healing. The rest of her isn\'t." She looks out of the door to where Parveen sits by the fire. "She won\'t let me dress them any more. Bring her something for them yourself and she might talk to you. I\'m the one who told her they\'d heal, and she\'s angry at me for it."',
      again: '"Bring her something for them yourself."',
      effects: [{ learn: 'an_parveen_hands' }],
      interject: [{ companion: ASH, text: 'Ash says nothing until you are outside. "Angry at the one who says it\'ll heal." He nods slowly. "That\'s the right person to be angry at. It\'s the only one who\'ll stay."' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    rads: {
      text: '"The craters are hot. The glass is mostly not, but it\'s a mirror the size of a country, and the light off it cooks the eyes and the skin under the chin." She ticks it off on her fingers. "Hot ground makes you sick slowly, then all at once. Iodine keeps your throat clean of it. Flush drags it out of you after and leaves you weak a day. The old men at Spindle have no teeth and very good eyesight, and the young ones have no sense." She almost smiles. "I sell to both."',
      again: '"I sell to both."',
      effects: [{ learn: 'an_rads_known' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
  },
};

// ---------------------------------------------------------------- Radu Ilie, the hound-keeper

const PIDGE_WALK: Cond = { flag: 'an_pidge_walk' };

export const d_an_radu: DialogueDef = {
  id: 'd_an_radu', owner: 'npc_an_05',
  start: [{ if: { knows: 'an_radu_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man with a burned cheek on an upturned bucket in a fenced yard, and lying at his feet, the way a dog lies, a machine: grey plates, four folded legs, one lens. It lifts its head as you come to the fence. He puts a hand on its neck without looking. "Ilie. That\'s Pidge. Don\'t put your hand out; she doesn\'t know hands." He considers you. "She knows feet. Yours are all right."',
      again: 'Radu, and the hound at his feet.',
      effects: [{ learn: 'an_radu_met' }],
      interject: [
        { companion: KES, text: 'Kes has stopped at the fence with her hand on her neck. "She\'s quiet," she says. "Inside. There\'s nobody talking to her at all. How?"' },
        { companion: TAMSIN, text: 'Tamsin has gone very still. "It looked at me," she says. "Like the one on the pan. But it\'s lying on his foot."' },
      ],
      options: [{ id: 'radu.go', text: 'A tame hound.', next: 'pidge' }],
    },
    hub: {
      text: 'Radu scratches the place behind Pidge\'s lens that she leans into. "Mm?"',
      again: 'Radu, scratching the hound\'s neck.',
      options: [
        { id: 'radu.patrol', text: 'Kelso\'s hounds. How do they walk?', if: { not: { seen: 'radu.patrol' } }, next: 'patrol' },
        { id: 'radu.shunter', text: 'Is there anything at Kelso with a board nobody\'s listening to?', if: { not: { seen: 'radu.shunter' } }, next: 'shunter' },
        { id: 'radu.walk', text: 'Would Pidge walk Kelso\'s apron with me?', if: { all: [{ seen: 'radu.patrol' }, { not: PIDGE_WALK }] }, next: 'walk' },
        { id: 'radu.trade', text: '(Trade.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    pidge: {
      text: '"Found her at fourteen, in a crater, with her housing split and her lineage burned out of her by a strike that missed her by a yard." He taps the lens\'s collar where the metal is scorched. "Whatever told her what to be, it\'s gone. She followed me home because I was the last thing that moved. Twenty-eight years." He looks down at her. "She doesn\'t obey me. She just likes where I am."',
      again: '"She just likes where I am."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    patrol: {
      text: '"Three at Kelso walk the apron. Not the rows in the motor pool: those are dead. Three." He holds up three fingers burned shiny at the tips. "By day they lie in the shade of the far fence with their backs to the sun and drink it, lenses down. They don\'t get up for feet. By night they walk, the whole apron, and nothing crosses it." He looks at you hard. "Matei crossed by day, the right way, and then he held up the clean man\'s card at the door. And they got up."',
      again: '"And they got up."',
      effects: [{ lead: 'l_an_patrol' }, { learn: 'an_day_route' }],
      interject: [{ companion: NINE, text: '"A maintenance credential," Nine says, "presented at a secured door, would wake the site\'s patrol to escort the technician. That is what it is for." It pauses. "It is not what anyone told the man holding it."' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    shunter: {
      text: '"In the old engine shed, west side, there\'s a yard engine. Army. The spur ran to Kelso before the war." He thinks. "The Concern built the hounds and the kites, but the army bought its engines from somebody else; there\'s a crown and a gear on that one, not the eye. I looked in it once. Its board\'s whole." He shrugs. "Nothing to run it on, here. Heavy, and loud to get out. The patrol lifts its heads at a bang, even by day."',
      again: '"There\'s a crown and a gear on that one, not the eye."',
      effects: [{ lead: 'l_an_shunter' }, { quest: 'q_an_board', start: true }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    walk: {
      text: '"She might." He looks at Pidge, and at you, a long while. "The patrol knows her. Knows her for what she was, whatever she is now; they don\'t get up for her. If she walks with you, they\'ll think you\'re hers." He scratches her neck. "I\'ll want her back. And I\'ll want to know why."',
      again: '"I\'ll want her back."',
      options: [
        { id: 'radu.walk.why', text: 'The four on your board. I want to know what happened at the door.', check: { skill: 'speech', dc: 35, mods: [{ if: { lead: 'l_an_four' }, dc: -10, why: 'you name the four' }, { if: { trust: { npc: 'npc_an_05', gte: 10 } }, dc: -10, why: 'he trusts you' }] }, effects: [{ set: 'an_pidge_walk' }, { trust: { npc: 'npc_an_05', by: 10 } }], next: 'walk_yes', fail: 'walk_no' },
        { id: 'radu.walk.pay', text: '(Pay him for her day. 30 Tolls.)', if: TOLLS(30), effects: [{ take: 'tolls', count: 30 }, { set: 'an_pidge_walk' }], next: 'walk_yes' },
        { text: 'Something else.', next: 'hub' },
      ],
    },
    walk_yes: { text: '"Day only," Radu says. "She\'ll come to your heel at the gate and leave it at the craters coming home. Don\'t shout. Don\'t run." Pidge gets up, unfolding her legs with a sound like a gate, and looks at your feet.', again: '"Day only."', options: [{ text: 'Something else.', next: 'hub' }] },
    walk_no: { text: '"No." Not unkind. "Not for why. Pay her day, or don\'t."', again: '"Not for why."', options: [{ text: 'Something else.', next: 'hub' }] },
  },
};

export const d_an_pidge: DialogueDef = {
  id: 'd_an_pidge', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Pidge lies at the yard\'s fence with her lens on your boots. Close to, the plates are scored and polished by twenty-eight years of a man\'s hand in one place behind her lens, and her collar is scorched black where something burned her lineage out of her. She is warm. She is listening to nothing at all.',
      again: 'Pidge, with her lens on your boots.',
      passives: [{ skill: 'science', dc: 40, text: 'A border unit, light pattern, Concern-built under an army contract. Where its command receiver should sit under the collar there is only fused slag. Nothing can call her. Nothing ever will.', effects: [{ learn: 'an_pidge_deaf' }] }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Parveen Rao, who came back

export const d_an_parveen: DialogueDef = {
  id: 'd_an_parveen', owner: 'npc_an_06',
  start: [{ if: { knows: 'an_parveen_told' }, node: 'after' }, { if: { knows: 'an_parveen_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman by the fire with her hands held in her lap palms up, the palms glazed and shiny, the fingers curled. She does not look up. "Don\'t," she says. "Whatever you\'re going to ask. Don\'t."',
      again: 'Parveen, with her palms up.',
      effects: [{ learn: 'an_parveen_met' }],
      options: [
        { id: 'parveen.dress', text: '(Kneel and dress her hands.)', check: { skill: 'medicine', dc: 30, mods: [{ if: { knows: 'an_parveen_hands' }, dc: -10, why: 'you know what the glass did' }] }, effects: [{ take: 'c_bandage' }, { trust: { npc: 'npc_an_06', by: 15 } }], if: { item: 'c_bandage' }, next: 'dressed', fail: 'dress_no' },
        { id: 'parveen.ask', text: 'I\'m going to Kelso. I\'d rather not die at the door.', check: { skill: 'speech', dc: 40, mods: [{ if: { lead: 'l_an_four' }, dc: -5, why: 'you know the four names' }] }, next: 'told', fail: 'no' },
        bye,
      ],
    },
    again: {
      text: 'Parveen by the fire. "You again."',
      again: 'Parveen waits.',
      options: [
        { id: 'parveen.dress2', text: '(Kneel and dress her hands.)', if: { all: [{ item: 'c_bandage' }, { not: { trust: { npc: 'npc_an_06', gte: 15 } } }] }, check: { skill: 'medicine', dc: 30, mods: [{ if: { knows: 'an_parveen_hands' }, dc: -10, why: 'you know what the glass did' }] }, effects: [{ take: 'c_bandage' }, { trust: { npc: 'npc_an_06', by: 15 } }], next: 'dressed', fail: 'dress_no' },
        { id: 'parveen.ask2', text: 'Kelso. The door. What happened?', if: { trust: { npc: 'npc_an_06', gte: 15 } }, next: 'told' },
        bye,
      ],
    },
    dress_no: { text: 'You get the dressing on, badly, and she lets you, and when you have finished she looks at it and takes it off again with her teeth. "Not like that." She does not say how.', again: '"Not like that."', options: [bye] },
    no: { text: '"Then don\'t go." She looks at the fire. "That\'s all I\'ve got."', again: '"Then don\'t go."', options: [bye] },
    dressed: {
      text: 'You clean the glazed skin and lay the dressing on loose, the way it has to go on a burn that has to breathe, and she watches your hands the whole time. When you have done she flexes the fingers an inch. "Delphine does it tight," she says. "She thinks I\'ll pick at it. I would." She breathes out. "Ask, then."',
      again: '"Ask, then."',
      options: [{ id: 'parveen.dressed.ask', text: 'Kelso. The door. What happened?', next: 'told' }],
    },
    told: {
      text: '"Matei found a way across. By day, past the three in the shade, the long way round the craters, quiet. We were at the blockhouse by noon." She is looking at the fire. "The clean man gave him a card. White, with copper. He said hold it to the door and the door would know him. Matei held it to the door." Her fingers curl. "The door didn\'t open. The three got up. All at once, like they\'d been called to supper. Matei still had the card in his hand when they reached him." She looks at you at last. "Don\'t hold it to the door. Whatever he tells you."',
      again: '"Don\'t hold it to the door."',
      effects: [{ lead: 'l_an_card' }, { learn: 'an_parveen_told' }, { quest: 'q_an_kelso', start: true }, { xp: 40 }],
      interject: [
        { companion: WREN, text: '"He sent them in to test it," Wren says, flat, when you are away from the fire. "Didn\'t he. Send a picker with a card and see what gets up."', effects: [A(WREN, 2)] },
        { companion: KES, text: '"A waking card," Kes says. "Wakes the guards to escort the engineer. Nobody told the engineer he wasn\'t one."' },
      ],
      options: [bye],
    },
    after: {
      text: [
        { if: { flag: 'an_board_chalked' }, text: 'Parveen by the fire with her hands in clean dressings. "Hester chalked them," she says. "Under the names. A card they were given." She nods at nothing. "That\'s right. That\'s what it was."' },
        { text: 'Parveen by the fire. "Don\'t hold it to the door," she says again, as if you might have forgotten.' },
      ],
      again: 'Parveen, by the fire.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- Benedikt Sorlie, the Concern's contractor

export const d_an_sorlie: DialogueDef = {
  id: 'd_an_sorlie', owner: 'npc_an_07',
  start: [{ if: { knows: 'an_sorlie_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'an_sorlie', eq: 'out' }, text: 'A man in a clean field coat on a folding stool at Kelso\'s gate, a tarp rigged against the sun, a rifle-carrier beside him, his boots shined. "Ah. Spindle\'s envoy." He is not offended; he is never offended. "Sorlie. Contractor. The weigher has strong views. I respect a strong view. I am still here."' },
        { text: 'A man at a clean desk in the school\'s east room with a field case open in front of him and a rifle-carrier at the door. His coat is the Skirts\' cut but nobody in the Skirts has a coat that clean. "Sorlie. Contractor." He offers his hand and takes it back when you do not, without any feeling. "I have a board recovery at Kelso and no guide. Three hundred Tolls on delivery."' },
      ],
      again: 'Sorlie, courteous.',
      effects: [{ learn: 'an_sorlie_met' }, { learn: 'an_sorlie_known' }, { quest: 'q_an_kelso', start: true }],
      options: [{ id: 'sorlie.go', text: 'A board recovery.', next: 'hub' }],
    },
    hub: {
      text: [
        { if: { flag: 'an_guiding' }, text: '"By day," Sorlie says, "at the blockhouse. I will be there. I always keep an appointment."' },
        { text: '"Well?" Sorlie closes his case.' },
      ],
      again: 'Sorlie waits.',
      interject: [{ companion: KES, if: { not: { seen: 'sorlie.card' } }, text: 'Kes is looking at the edge of a white card in his breast pocket. "That talks old," she says under her breath, to you. "Their oldest dialect. It\'s not for doors. It\'s for things that keep doors."', effects: [{ learn: 'an_kes_card' }] }],
      options: [
        { id: 'sorlie.what', text: 'What board?', if: { not: { seen: 'sorlie.what' } }, next: 'what' },
        { id: 'sorlie.order', text: 'Show me the work order.', if: { all: [{ not: { lead: 'l_an_order' } }, { seen: 'sorlie.what' }] }, check: { skill: 'speech', dc: 50, mods: [{ if: CARD_KNOWN, dc: -15, why: 'you know what his card did to four people' }, { if: { item: 'k_an_card' }, dc: -10, why: 'you have the card the dead man held' }] }, effects: [{ lead: 'l_an_order' }], next: 'order', fail: 'order_no' },
        { id: 'sorlie.card', text: 'The four at Kelso. Matei had your card.', if: { all: [{ lead: 'l_an_card' }, { not: { seen: 'sorlie.card' } }] }, next: 'card' },
        { id: 'sorlie.job', text: 'I\'ll guide you in.', if: { all: [{ not: { flag: 'an_guiding' } }, { not: KELSO_SETTLED }] }, next: 'job' },
        { id: 'sorlie.core', text: '(Show him the core out of Kelso\'s rack.)', if: CORE, next: 'core' },
        { id: 'sorlie.board', text: '(Show him the army board out of Kelso\'s shed.)', if: { all: [{ item: 'k_an_board' }, { not: { flag: 'an_board' } }] }, next: 'board' },
        { id: 'sorlie.fight', text: 'You sent four people to die with a card. You won\'t walk off this glass.', if: { all: [CARD_KNOWN, { not: KELSO_SETTLED }] }, next: 'fight' },
        bye,
      ],
    },
    what: {
      text: '"The depot at Kelso had a hardened hall under its apron. In the hall, a unit the Concern built for the army under contract and never recovered: a maintenance and logistics controller, one of a kind." He folds his hands. "The Concern\'s property, by the contract, which is still in force. I am to bring it home intact. It is heavy and the base is not entirely asleep, so I need someone who knows the glass." He smiles, briefly, accurately. "A board recovery. Nothing more exotic."',
      again: '"Nothing more exotic."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    order: {
      text: 'He considers you, and the room, and then takes a folded paper out of the case and lays it on the desk the right way round for you, and keeps two fingers on it. RESERVE AUDIT — KENNEL 7 — COMMAND UNIT TO BE RECOVERED INTACT AND RETURNED TO HALCYON. DORMANT UNITS NOT TO BE DISTURBED PENDING RECOVERY. LOSSES OF LOCAL LABOUR TO BE COSTED TO THE CONTRACT. "Costed," he says. "Not hidden. I want you to notice that."',
      again: '"Costed. Not hidden."',
      interject: [{ companion: ODILE, text: 'Odile reads it upside down, faster than he can turn it. "Losses of local labour costed to the contract," she says. "My dear, I wrote clauses like that for twenty years. It means somebody upriver has already paid for the dead."', effects: [A(ODILE, 2)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    order_no: { text: '"No." Pleasantly. "It is a Concern document. You are not a Concern employee. Guide me in, and you will see everything I see."', again: '"Guide me in."', options: [{ text: 'Something else.', next: 'hub' }] },
    card: {
      text: 'For a moment nothing. Then: "A maintenance credential. The guide was told how to use it and chose to." He says it without heat, the way a clerk reads back a figure. "The base responded as a base does. I was not present. I have since costed it." He looks at his clean cuffs. "I do not ask you to like it. I ask you to guide me, for three hundred Tolls, by a better route than his."',
      again: '"I have since costed it."',
      interject: [{ companion: TAMSIN, text: 'Tamsin\'s jaw is set. "He sent them to see what would get up," she says. "And he wrote down what it cost. Like a stocktake."', effects: [A(TAMSIN, 2)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    job: {
      text: '"Good." He writes something. "Cross by day, by your own route. I will meet you at the blockhouse; my men can carry. Open the door however you open it; I am told the card is no longer advisable." No smile. "In the hall you will show me the rack, and stand aside, and I will pay you at the sled."',
      again: '"Stand aside, and I will pay you at the sled."',
      options: [
        { id: 'sorlie.job.yes', text: 'At the blockhouse, by day.', effects: [{ set: 'an_guiding' }, { learn: 'an_guiding_known' }], next: 'hub' },
        { text: 'Not yet.', next: 'hub' },
      ],
    },
    core: {
      text: 'For the first time something in his face moves: not greed; relief, the relief of a man whose account will balance. "Three hundred," he says, "as agreed, though you did not agree it. It is the Concern\'s, and I will not argue its title with you in a school." He opens the case. "Or keep it, and carry it, and learn what it is for. I have found people rarely enjoy that."',
      again: '"Three hundred."',
      options: [
        { id: 'sorlie.core.sell', text: 'Three hundred. Take it.', effects: [...CORE_SOLD, { xp: 60 }], next: 'sold_core' },
        { text: 'It stays with me.', next: 'hub' },
      ],
    },
    sold_core: { text: 'He lifts it out of your hands in a cloth, as you would lift a sleeping child, and puts it into a padded box, and closes the box, and counts three hundred onto the desk. By the next morning the east room is empty and swept.', again: 'The east room, swept.', options: [bye] },
    board: {
      text: '"Army. Pre-war." He turns it in the light from the slit. "A clean one. The Concern buys these where it finds them, at a hundred and twenty, and keeps them in a drawer." He sets it down. "A clean board is a board that does not need us. We prefer the Line to need us. I make no secret of it."',
      again: '"We prefer the Line to need us."',
      interject: [{ companion: KES, text: '"He\'d buy it to bury it," Kes says. "Obviously. Dorcas is cold on her pit and he\'d put this in a drawer."', effects: [A(KES, 1)] }],
      options: [
        { id: 'sorlie.board.sell', text: 'A hundred and twenty.', effects: [{ take: 'k_an_board' }, { give: 'tolls', count: 120 }, { set: 'an_board', value: 'sold' }, { quest: 'q_an_board', start: true }, { rep: { faction: 'concern', respect: 5 } }, { xp: 40 }, A(KES, -5), A(NINE, -2),
          { decision: { id: 'an_board_sold', text: 'I sold the army board out of Kelso\'s shed to the Concern\'s contractor, who will keep it in a drawer.' } }], next: 'hub' },
        { text: 'No.', next: 'hub' },
      ],
    },
    fight: {
      text: 'He does not stand up. His man in the door does. "I would rather not," Sorlie says. "It would be costed to the contract, and to you." He waits, his hands flat on the desk, as polite as a man ordering lunch.',
      again: '"I would rather not."',
      options: [
        { id: 'sorlie.fight.go', text: '(Draw.)', effects: [{ set: 'an_sorlie_fight' }, { set: 'an_sorlie', value: 'dead' }, { rep: { faction: 'concern', respect: -15, fear: 5 } }, { set: 'an_concern_marked' }, A(ILYA, 2), A(ASH, -5), A(NINE, -3),
          { decision: { id: 'an_sorlie_dead', text: 'I drew on the Concern\'s contractor over the four who died at Kelso\'s door.' } },
          { news: { tag: 'an_sorlie_shot', text: 'a Concern contractor was shot at Spindle by a stranger over the dead at Kelso', valence: 0, size: 6, at: 'spindle' } }, { event: 'combat' }], exit: true },
        { text: '(Let it go.)', next: 'hub' },
      ],
    },
  },
};

export const d_an_sorlie_desk: DialogueDef = {
  id: 'd_an_sorlie_desk', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: SORLIE_HERE, text: 'A clean desk in the east room: a pen laid square, a blotter, a field case with a good lock, and on the blotter, face down, a paper folded in four with the corner of a letterhead showing.' },
        { text: 'The east room\'s desk, swept bare. A square on the blotter where something sat a long time.' },
      ],
      again: 'The clean desk.',
      passives: [{ attr: 'senses', dc: 7, if: SORLIE_HERE, text: 'The letterhead\'s corner, the closed eye, and the first line under it in heavy type: RESERVE AUDIT —. The rest is folded in.', effects: [{ learn: 'an_audit_glimpse' }] }],
      options: [leave],
    },
  },
};

export const d_an_hired: DialogueDef = {
  id: 'd_an_hired', owner: 'npc_an_g1', start: [{ node: 'look' }],
  nodes: { look: { text: 'A Skirts man on a contractor\'s wage, carbine across his chest and the Concern\'s closed eye stitched small on his cuff. "Mr Sorlie does the talking."', again: '"Mr Sorlie does the talking."', options: [leave] } },
};

// ---------------------------------------------------------------- the camp

export const d_an_bunk: DialogueDef = {
  id: 'd_an_bunk', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_bunk_rented' }, text: 'The room to let in the east of the school: a bed with a straw mattress, a locker that is yours, a slit window full of glass light. Hester has put a tin cup of clean water on the sill.' },
        { text: 'The room to let in the east of the school: a bed with a straw mattress, a locker, a slit window. Twenty-five Tolls, Hester says, and the locker is yours while the room is.' },
      ],
      again: 'The room to let.',
      options: [
        { id: 'bunk.rent', text: '(Take the room. 25 Tolls.)', if: { all: [{ not: { flag: 'an_bunk_rented' } }, TOLLS(25)] }, effects: [{ take: 'tolls', count: 25 }, { set: 'an_bunk_rented' }], next: 'rented' },
        { id: 'bunk.rest', text: '(Rest, mend, write.)', if: { flag: 'an_bunk_rented' }, effects: [{ event: 'camp' }], exit: true, repeat: true },
        leave,
      ],
    },
    rented: { text: 'Hester takes the Tolls and writes your name on the door in chalk. "Yours," she says. "Don\'t bring glass in."', again: '"Don\'t bring glass in."', options: [{ id: 'bunk.rest2', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave] },
  },
};

export const d_an_arch: DialogueDef = {
  id: 'd_an_arch', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The school\'s arch: STALLARD PRIMARY cut in the stone, a pre-war crest of a windmill over a book, and under it in white paint, fresh every season, NAMES ON THE BOARD BEFORE YOU GO.', again: 'STALLARD PRIMARY, and the white paint.', effects: [{ learn: 'an_school_known' }], options: [leave] } },
};

export const d_an_tower: DialogueDef = {
  id: 'd_an_tower', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The last tower of a pre-war wind farm: a grey steel pin a hundred feet high, its nacelle at the top with no blades on it, a ladder up its inside behind a hatch. A plate at its foot: MARCH GRID — TURBINE 31 — DECOMMISSIONED. The rest of the farm is stumps in the glass, east, as far as you can see.',
      again: 'Turbine 31, bladeless.',
      options: [{ id: 'tower.climb', text: '(Climb to the nacelle and look east.)', check: { attr: 'grit', dc: 6 }, effects: [{ time: 40 }, { learn: 'loc_lm_ash_01' }, { learn: 'loc_lm_ash_02' }], next: 'top', fail: 'top_no' }, leave],
    },
    top: { text: 'A long climb inside a steel tube that hums with wind, and then the nacelle: a tin room on a pin over the world. East, the glass, white to the horizon, and on it a dark grid that is Kelso\'s apron and a shimmer that is Pemberton\'s panels, and beyond both a black ridge like a saddle. Over the ridge, specks, turning.', again: 'The glass, from the nacelle.', options: [leave] },
    top_no: { text: 'Halfway up, the tube sways, and your hands decide for you. You come down. Ingmar does not laugh, which is worse.', again: 'The tube sways.', options: [leave] },
  },
};

export const d_an_flag: DialogueDef = {
  id: 'd_an_flag', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: KITE_DAY, text: 'The flag on the pole: a black square, snapping east. A kite day. The whole of Spindle indoors behind slits.' },
        { if: KITES_DOWN, text: 'The flag on its pole, folded and tied. Ingmar has not run it up since the kites came down. Somebody has tied a child\'s ribbon to the halyard.' },
        { text: 'A pole with a halyard and a black square folded at its foot. When it goes up, everyone goes in.' },
      ],
      again: 'The flag pole.',
      options: [leave],
    },
  },
};

export const d_an_well: DialogueDef = {
  id: 'd_an_well', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_well_clean' }, text: 'Spindle\'s well, its pump running sweet on an army board, the water clear in the tin cup chained to it. Somebody has scratched on the housing: ARMY 3 — THANK YOU.' },
        { text: 'Spindle\'s well: a pre-war pump on a cracked board that grinds as the handle goes, and a still beside it to boil what comes up, because what comes up tastes of metal.' },
      ],
      again: 'Spindle\'s well.',
      options: [{ id: 'well.drink', text: '(Fill a bottle.)', effects: [{ give: 'c_water', count: 1 }, { time: 10 }], if: { flag: 'an_well_clean' }, exit: true, repeat: true }, leave],
    },
  },
};

export const d_an_sign_w: DialogueDef = {
  id: 'd_an_sign_w', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A board on a post: DRY WELLS — 2 DAYS — WATER. And under it, older: MARCH GRID — SERVICE ROAD — NO ENTRY BEYOND TURBINE 40.', again: 'DRY WELLS — 2 DAYS — WATER.', effects: [{ learn: 'loc_drywells' }], options: [leave] } },
};

export const d_an_sign_e: DialogueDef = {
  id: 'd_an_sign_e', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A board at the edge of the glass, painted fresh: KELSO — 1 DAY — SHUT. PANELS — KITES. SADDLEBACK — DON\'T. And nailed under it a row of old tags off the necks of pickers who did not come back, so many the board is heavy with them.', again: 'KELSO — SHUT. PANELS — KITES. SADDLEBACK — DON\'T.', effects: [{ learn: 'loc_lm_ash_01' }], options: [leave] } },
};

export const SPINDLE_DIALOGUES: DialogueDef[] = [d_an_table, d_an_board, d_an_hester, d_an_kwesi, d_an_kwesi_cot, d_an_ingmar, d_an_delphine, d_an_radu, d_an_pidge, d_an_parveen, d_an_sorlie, d_an_sorlie_desk, d_an_hired, d_an_bunk, d_an_arch, d_an_tower, d_an_flag, d_an_well, d_an_sign_w, d_an_sign_e];
