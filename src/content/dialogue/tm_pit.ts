import type { CheckDef, DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './nw_river';

/**
 * Number Four (B5c): the free pit on the Teeth's south face. Taken on the Path (`q_tm_path`: the runaways the Clean take at
 * the switchback below the col, the family the Shift sends over, the winchwoman's arrangement and its four ends), The Digger
 * (`q_tm_digger`: the machine in the old level), the face and the trap lines (activities), the bunkhouse, the bucket line,
 * the old drift. Story notes: story/B5c_NOTES_SECRET.md.
 */

// ---------------------------------------------------------------- state

/** The arrangement still runs (nobody has ended, exposed or broken it). */
export const RUNNING: Cond = { not: { any: [{ flag: 'tm_four', eq: 'exposed' }, { flag: 'tm_four', eq: 'ended' }, { flag: 'tm_four', eq: 'fought' }] } };
const SETTLED: Cond = { flag: 'tm_four' };
const OPEN: Cond = { not: SETTLED };
/** The player knows somebody at Four tells the Clean, and that it is the boss. */
const KNOWS_BOSS: Cond = { any: [{ knows: 'tm_radio_known' }, { knows: 'tm_arrangement_known' }] };
const PARTS: Cond = { knows: 'tm_parts_known' };
const CARD: Cond = { item: 'k_tm_requests' };
const DUSK: Cond = { hour: { from: 18, to: 22 } };
const RAGNA_HERE: Cond = { not: { flag: 'tm_ragna', eq: 'gone' } };
const CLEAN_ON_PATH: Cond = { all: [RUNNING, { not: { flag: 'tm_clean_fought' } }] };
const FAMILY_IN: Cond = { flag: 'tm_family_in' };
const SAFE_IN: Cond = { any: [{ flag: 'tm_family_in', eq: 'path' }, { flag: 'tm_family_in', eq: 'adit' }, { flag: 'tm_family_in', eq: 'escorted' }] };
const GRID_CHROME: Cond = { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }] };

// ---------------------------------------------------------------- the ends of the arrangement

const FOUR = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_tm_path', start: true }, { set: 'tm_four', value: v }, ...extra, { decision: { id: `tm_four_${v}`, text } }];
const CUT_LOOSE: Effect[] = [{ set: 'tm_price_cut' }, { set: 'tm_marked' }, { set: 'tm_shift', value: 'joined' }, { rep: { faction: 'concern', respect: -10 } }];

export const FOUR_EXPOSED: Effect[] = FOUR('exposed', 'I read the Concern\'s requests card to Number Four at the lamp meeting. Four voted Ragna Holm down the mountain and smashed her set. The free pit is poorer now, and freer, and watched.', [
  { set: 'tm_ragna', value: 'gone' }, { set: 'tm_set_smashed' }, ...CUT_LOOSE, { xp: 220 },
  A(KES, 5), A(WREN, 5), A(ASH, 2), A(NINE, 2), A(TAMSIN, 3),
  { news: { tag: 'tm_exposed', text: 'Number Four, the free pit in the Teeth, threw out the winchwoman who founded it; she had been selling its runaways back to the Concern', valence: 4, size: 6, at: 'number_four' } },
]);
export const FOUR_ENDED: Effect[] = FOUR('ended', 'Ragna Holm said FOUR — CLOSED — NO VISITORS into her set at dawn, and told the lamp meeting what she had done for fifteen winters, and stepped down. She winds the cage still. The Concern\'s money for Four\'s tin has stopped.', [
  { set: 'tm_ragna', value: 'stays' }, { set: 'tm_set_closed' }, ...CUT_LOOSE, { xp: 240 },
  A(KES, 5), A(ASH, 5), A(WREN, 3), A(TAMSIN, 3), A(NINE, 3),
  { news: { tag: 'tm_ended', text: 'the free pit at Number Four has broken off a bargain with the Concern its founder kept for fifteen winters', valence: 4, size: 5, at: 'number_four' } },
]);
export const FOUR_KEPT: Effect[] = FOUR('kept', 'I kept Ragna Holm\'s secret for a hundred and twenty Tolls. Number Four stays free and fed, and gives the Concern a name a season off its path.', [
  { give: 'tolls', count: 120 }, { set: 'tm_next_season' }, { xp: 40 },
  A(KES, -20), A(WREN, -20), A(ASH, -15), A(TAMSIN, -10), A(ILYA, -5),
]);
export const FOUR_FOUGHT: Effect[] = FOUR('fought', 'I fought the Clean at the switchback below the col. The Concern ended its arrangement with Number Four itself, the next morning, by stopping the money.', [
  { set: 'tm_clean_fight' }, { set: 'tm_clean_fought' }, { set: 'tm_price_cut' }, { set: 'tm_marked' }, { rep: { faction: 'concern', respect: -15, fear: 5 } }, { xp: 120 },
  A(ILYA, 3), A(ASH, -3),
  { news: { tag: 'tm_clean_fought', text: 'the Concern\'s Clean were shot on the col above Number Four', valence: 2, size: 6, at: 'number_four' } },
  { event: 'combat' },
]);

// ---------------------------------------------------------------- the family down from the col

const FAMILY = (v: string, extra: Effect[]): Effect[] => [{ quest: 'q_tm_path', start: true }, { set: 'tm_family_in', value: v }, ...extra];
const FAMILY_PATH: Effect[] = FAMILY('path', [{ time: 90 }, { xp: 80 }, A(ASH, 3), { event: 'goto', data: { location: 'tm_pit', spawn: 'start' } }]);
const FAMILY_ADIT: Effect[] = FAMILY('adit', [{ time: 150 }, { xp: 100 }, A(ASH, 3), A(WREN, 3)]);
const FAMILY_TAKEN: Effect[] = FAMILY('taken', [
  { xp: 20 }, A(KES, -10), A(WREN, -10), A(ASH, -10), A(TAMSIN, -10),
  { decision: { id: 'tm_chinwe_taken', text: 'I stood aside on the switchback, and the Clean took Chinwe Nnadi up the col. I brought her boy down to Number Four alone.' } },
  { news: { tag: 'tm_chinwe_taken', text: 'another runaway was taken by the Clean on the col above Number Four', valence: -4, size: 4, at: 'number_four' } },
]);
const FAMILY_ESCORTED: Effect[] = [{ set: 'tm_family_in', value: 'escorted' }, ...FOUR_FOUGHT];

// ---------------------------------------------------------------- activities: the face and the lines

/** A band of work: three finds in order, then the plain wage (scarcity: the old men's leavings run out). */
function band(id: string, label: string, flag: string, finds: { effects: Effect[]; node: string }[], wage: Effect[], hours: number, check?: CheckDef, cond?: Cond): OptionDef[] {
  const at = [{ not: { flag } }, { flag, eq: 1 }, { flag, eq: 2 }] as Cond[];
  const base = (extra: Cond): Cond => (cond ? { all: [cond, extra] } : extra);
  const fail = check ? { fail: 'band_fail', failEffects: [{ time: hours * 60 }] as Effect[] } : {};
  return [
    ...finds.map((f, i): OptionDef => ({ id: `${id}.${i}`, text: label, if: base(at[i]), check, effects: [{ time: hours * 60 }, { inc: flag }, ...f.effects], next: f.node, repeat: true, ...fail })),
    { id: `${id}.wage`, text: label, if: base({ flag, gte: 3 }), check, effects: [{ time: hours * 60 }, ...wage], next: 'band_wage', repeat: true, ...fail },
  ];
}

const LOWER_OPEN: Cond = { any: [{ flag: 'tm_digger', eq: 'salvaged' }, { flag: 'tm_digger', eq: 'tamed' }] };
const TAMED: Cond = { flag: 'tm_digger', eq: 'tamed' };

export const d_tm_cage: DialogueDef = {
  id: 'd_tm_cage', owner: 'narrator',
  start: [{ node: 'cage' }],
  nodes: {
    cage: {
      text: [
        { if: TAMED, text: 'The cage over the shaft, and the winding engine\'s thud through the wall, and from far below a second rhythm under it, slower: the digger, cutting for Four in the dark. Gaspard\'s slate by the gate counts the bars.' },
        { text: 'The cage: an iron box on a cable over the shaft, its gate a sheet of mesh, a bell pull, and a board of tags beside it with the shift\'s names. The air coming up the shaft is warmer than the air up here, and smells of wet stone.' },
      ],
      again: 'The cage, and the warm air up the shaft.',
      options: [
        ...band('face.pillars', '(Work a shift in the old pillars. 6 Tolls.)', 'tm_pillars', [
          { effects: [{ give: 'j_tin', count: 2 }, { give: 'c_tin', count: 1 }], node: 'pillars_1' },
          { effects: [{ give: 'j_tin', count: 2 }, { give: 't_lamp', count: 1 }], node: 'pillars_2' },
          { effects: [{ give: 'j_tin', count: 2 }, { give: 'tolls', count: 25 }], node: 'pillars_3' },
        ], [{ give: 'tolls', count: 6 }], 4),
        ...band('face.stopes', '(Work a shift in the east stopes. 9 Tolls.)', 'tm_stopes', [
          { effects: [{ give: 'j_tin', count: 3 }, { give: 'j_powder', count: 2 }], node: 'stopes_1' },
          { effects: [{ give: 'j_tin', count: 3 }, { give: 'j_electronics', count: 1 }, { give: 'j_wiring', count: 2 }], node: 'stopes_2' },
          { effects: [{ give: 'j_tin', count: 3 }, { give: 'u_powercell', count: 1 }], node: 'stopes_3' },
        ], [{ give: 'tolls', count: 9 }], 4, { skill: 'survival', dc: 40, mods: [{ if: { skill: 'mechanics', gte: 35 }, dc: -15, why: 'you can read a roof' }] }),
        ...band('face.lower', '(Work a shift in the lower level. 14 Tolls.)', 'tm_lower', [
          { effects: [{ give: 'j_tin', count: 4 }, { give: 'j_electronics', count: 2 }], node: 'lower_1' },
          { effects: [{ give: 'j_tin', count: 4 }, { give: 't_repair', count: 1 }], node: 'lower_2' },
          { effects: [{ give: 'j_tin', count: 4 }, { give: 'tolls', count: 40 }], node: 'lower_3' },
        ], [{ give: 'tolls', count: 14 }], 4, { skill: 'survival', dc: 45, mods: [{ if: TAMED, dc: -20, why: 'the digger has cut it safe' }] }, LOWER_OPEN),
        { id: 'cage.level', text: '(Ride the cage down to the old level.)', effects: [{ time: 10 }, { event: 'goto', data: { location: 'tm_level', spawn: 'cage' } }], exit: true, repeat: true },
        leave,
      ],
    },
    pillars_1: { text: 'Four hours in the old pillars with a pick and a lamp, taking the skin off rock the pre-war men left fat. Tin comes out grey and dull in a vein no thicker than a finger. In a niche behind a fallen prop you find a pre-war miner\'s snap tin, still sealed, with something inside that sloshes.', again: 'The pillars, and the snap tin.', options: [{ text: '(Up.)', exit: true }] },
    pillars_2: { text: 'The vein runs thin and you follow it into a corner of the old working where nobody has been since the Burn, and find a hand lamp hanging on a nail exactly where its owner left it, brass and glass, the wick dry. It lights on the second match.', again: 'The pillars, and a lamp on a nail.', options: [{ text: '(Up.)', exit: true }] },
    pillars_3: { text: 'Under a slab in the floor of the last old pillar room, where a man would sit to eat his bread out of the draught, somebody hid a purse ninety years ago and never came back for it: pre-Burn coins, green with damp. Gaspard weighs them in his hand at the gate and gives you Tolls for them without haggling.', again: 'The pillars, and a dead man\'s purse.', options: [{ text: '(Up.)', exit: true }] },
    stopes_1: { text: 'The east stopes: steep, wet, the roof close, the face crew working in pairs with one of them always looking up. You come up with tin and, from a forgotten magazine niche, two tins of pre-war blasting powder Gaspard says you may as well keep.', again: 'The east stopes, and the powder.', options: [{ text: '(Up.)', exit: true }] },
    stopes_2: { text: 'A pre-war cutting head\'s control box, crushed under a fall of roof decades ago, comes out of the muck in pieces when you dig round it: a board, wire, nothing that will work again and plenty that will sell.', again: 'The east stopes, and a crushed control box.', options: [{ text: '(Up.)', exit: true }] },
    stopes_3: { text: 'In a dry heading off the last stope, somebody\'s cache: an implant cell in oilcloth, still holding charge, wrapped so carefully that whoever hid it must have meant to come back the next day.', again: 'The east stopes, and an implant cell in oilcloth.', options: [{ text: '(Up.)', exit: true }] },
    lower_1: { text: 'The lower level, dry for the first time in seventy years, and rich: the old men stopped here when the water came, and left the best of it. Tin in fists, and, in the wreck of a pre-war pump, two boards nobody has touched since the Burn.', again: 'The lower level, and the pump\'s boards.', options: [{ text: '(Up.)', exit: true }] },
    lower_2: { text: 'A pre-war fitter\'s toolbox, its lid rusted shut and its insides as dry as the day it was closed: files, wire, a tube of glue gone to stone, and the rest of a repair kit that will mend a rifle.', again: 'The lower level, and the fitter\'s box.', options: [{ text: '(Up.)', exit: true }] },
    lower_3: { text: 'The face crew stand back from what your pick has opened: a pocket in the vein where the tin is almost clean, a hand\'s depth of it. Gaspard comes down himself to look, and pays you for the find out of the store\'s box, and stands in the lamp-light looking at it the way other people look at fire.', again: 'The lower level, and the clean pocket.', options: [{ text: '(Up.)', exit: true }] },
    band_wage: { speaker: 'narrator', text: 'Four hours at the face, the thud of the winding engine through the rock, tin in the tub and the tub on the cage, and Gaspard paying out at the gate by the bar.', again: 'A shift at the face.', options: [{ text: '(Up.)', exit: true }] },
    band_fail: { speaker: 'narrator', text: 'The roof talks above you, a creak and a trickle, and the crew\'s eldest puts his hand flat on your chest and walks you back out of the stope without a word. Four hours, and nothing in the tub but your nerves.', again: 'The roof talking.', options: [{ text: '(Up.)', exit: true }] },
  },
};

export const d_tm_face_slate: DialogueDef = {
  id: 'd_tm_face_slate', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: LOWER_OPEN, text: 'Gaspard\'s slate by the smelter door: OLD PILLARS — 6. EAST STOPES — 9 (MIND THE ROOF). LOWER LEVEL — 14 (DRY). And under it, every bar the furnace has poured this week, in ticks.' },
        { text: 'Gaspard\'s slate by the smelter door: OLD PILLARS — 6 A SHIFT. EAST STOPES — 9 A SHIFT — MIND THE ROOF. LOWER LEVEL — under water, crossed out, and beside it in fresher chalk: SOMETHING DOWN THERE.' },
      ],
      again: 'Gaspard\'s slate.',
      effects: [{ learn: 'tm_face_known' }],
      options: [leave],
    },
  },
};

const lineFind = (id: string, label: string, flag: string, finds: { effects: Effect[]; node: string }[], wage: Effect[], check: CheckDef): OptionDef[] => band(id, label, flag, finds, wage, 5, check);

export const d_tm_traps: DialogueDef = {
  id: 'd_tm_traps', owner: 'narrator',
  start: [{ node: 'lines' }],
  nodes: {
    lines: {
      text: 'Sachiko\'s board beside her door: three lines chalked on it with the snares on each, and who has the line today. LOW LINE — THE PINES. COL LINE — THE SCREE UNDER THE SADDLE. RIDGE — DON\'T, UNLESS YOU KNOW. Anybody may run a line; the pelts are hers, the meat is yours.',
      again: 'Sachiko\'s board, three lines.',
      options: [
        ...lineFind('traps.low', '(Run the low line in the pines.)', 'tm_low_line', [
          { effects: [{ give: 'c_meat', count: 2 }, { give: 'j_hide', count: 1 }], node: 'low_1' },
          { effects: [{ give: 'c_meat', count: 2 }, { give: 'j_pelt', count: 1 }], node: 'low_2' },
          { effects: [{ give: 'c_meat', count: 2 }, { give: 'j_scrap', count: 3 }, { give: 'tolls', count: 8 }], node: 'low_3' },
        ], [{ give: 'c_meat', count: 1 }], { skill: 'survival', dc: 25 }),
        ...lineFind('traps.col', '(Run the col line on the scree.)', 'tm_col_line', [
          { effects: [{ give: 'c_meat', count: 3 }, { give: 'j_pelt', count: 1 }], node: 'col_1' },
          { effects: [{ give: 'c_meat', count: 2 }, { give: 'j_pelt', count: 2 }], node: 'col_2' },
          { effects: [{ give: 'c_meat', count: 2 }, { give: 'c_tin', count: 2 }, { give: 'tolls', count: 15 }], node: 'col_3' },
        ], [{ give: 'c_meat', count: 2 }], { skill: 'survival', dc: 40 }),
        ...lineFind('traps.ridge', '(Run the ridge line.)', 'tm_ridge_line', [
          { effects: [{ give: 'c_meat', count: 4 }, { give: 'j_pelt', count: 2 }], node: 'ridge_1' },
          { effects: [{ give: 'c_meat', count: 3 }, { give: 'j_pelt', count: 2 }, { give: 'j_hide', count: 2 }], node: 'ridge_2' },
          { effects: [{ give: 'c_meat', count: 3 }, { give: 'w_bolt308', count: 1 }, { give: 'a_308', count: 6 }], node: 'ridge_3' },
        ], [{ give: 'c_meat', count: 2 }, { give: 'j_pelt', count: 1 }], { skill: 'survival', dc: 55 }),
        leave,
      ],
    },
    low_1: { text: 'Five hours in the pines, the snares half-buried in new snow and three of them full: two hares and a marten, stiff with cold. Sachiko skins the marten for you with four cuts and gives you the hide.', again: 'The low line.', options: [{ text: '(Back.)', exit: true }] },
    low_2: { text: 'A snow hare already in its winter white, the pelt worth more than the meat by a long way. You carry it back inside your coat to keep it clean.', again: 'The low line, a white hare.', options: [{ text: '(Back.)', exit: true }] },
    low_3: { text: 'At the line\'s far end, where the pines give out onto old ground, a snare has caught on something under the snow: the frame of a pre-war bicycle, and in its rusted basket a tobacco tin of coins and screws somebody cared about once.', again: 'The low line, a bicycle under the snow.', options: [{ text: '(Back.)', exit: true }] },
    col_1: { text: 'The scree under the col, every step sliding, and the snares where Sachiko said. From here you can see the switchback, and the col hut, and the Skirts\' smoke going up over the saddle into the evening.', again: 'The col line.', options: [{ text: '(Back.)', exit: true }] },
    col_2: { text: 'Two white hares in one snare, which Sachiko says never happens and then says happens to her all the time.', again: 'The col line, two hares in one wire.', options: [{ text: '(Back.)', exit: true }] },
    col_3: { text: 'Under a boulder on the scree, a runaway\'s pack from some winter years ago: rations in tins still good, a purse, and a child\'s drawing of a headframe folded small. You bring all of it down and give the drawing to Ragna, who pins it on the board.', again: 'The col line, an old pack.', options: [{ text: '(Back.)', exit: true }] },
    ridge_1: { text: 'The ridge: knife-edged, wind like a hand pushing you, the Teeth going off north in white rows. The snares here are wire on stakes driven into ice, and they are full.', again: 'The ridge line.', options: [{ text: '(Back.)', exit: true }] },
    ridge_2: { text: 'Something bigger than a hare has been at the line, and taken one, and left two, and its tracks go off along the ridge as wide as your hand. You do not follow them.', again: 'The ridge line, the big tracks.', options: [{ text: '(Back.)', exit: true }] },
    ridge_3: { text: 'On the ridge\'s last knoll, in a hollow under a cornice, the bones of a man in a white smock with a rifle across his knees, sitting looking south as if waiting for someone to come up from the pit. A pre-war sniper\'s rifle, oiled and wrapped against the cold by somebody who knew how. Sachiko looks at it a long time and says it is yours.', again: 'The ridge, the man on the knoll.', interject: [{ companion: ILYA, text: 'Ilya kneels by the bones and checks the rifle\'s bolt without touching anything else. "Waited," he says. "Long time." He counts the rounds in the man\'s pouch aloud, six, and puts them in your hand, and stands up, and says nothing else on the way down.' }], options: [{ text: '(Back.)', exit: true }] },
    band_wage: { speaker: 'narrator', text: 'Five hours on the line, the snares checked and reset, meat over your shoulder and Sachiko\'s pelts in your pack for her.', again: 'A day on the line.', options: [{ text: '(Back.)', exit: true }] },
    band_fail: { speaker: 'narrator', text: 'You lose the line in fresh snow and spend the afternoon finding it again and the evening finding your way back. Sachiko is at her door when you come in, and says only, "Snow does that."', again: 'Lost in the snow.', options: [{ text: '(Back.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the lamp board and the meeting

export const d_tm_board: DialogueDef = {
  id: 'd_tm_board', owner: 'narrator',
  start: [{ node: 'board' }],
  nodes: {
    board: {
      text: [
        { if: { any: [{ flag: 'tm_four', eq: 'exposed' }, { flag: 'tm_four', eq: 'ended' }] }, text: 'The lamp board: sixty pegs, and on them sixty-one brass tags now. The line chalked under them, and the words TAKEN ON THE PATH, have been rubbed out with a wet thumb, hard enough to leave a pale smear on the board, and nobody has written anything in their place.' },
        { if: { flag: 'tm_family_in', eq: 'taken' }, text: 'The lamp board, its sixty tags, and under the line TAKEN ON THE PATH four names now: three in old chalk and one new, NNADI, C., and beside it, smaller, in a child\'s capitals, MUM.' },
        { text: 'The lamp board under the headframe: sixty pegs and sixty brass tags, one for every soul at Four, taken down by whoever goes below and hung back when they come up. Under the pegs a line in chalk, and under the line three names, and under the names, in big careful letters: TAKEN ON THE PATH. Three this year. Nobody has written what happened to them because everybody knows.' },
      ],
      again: 'The lamp board.',
      effects: [{ lead: 'l_tm_taken' }, { quest: 'q_tm_path', start: true }, { learn: 'loc_mine_teeth' }],
      interject: [
        { companion: KES, if: OPEN, text: 'Kes stands in front of the board with her hands in her pockets. "The Lodge has one of these," she says. "Six has one. Your tag goes up when you\'re back." She looks at the line. "Nobody\'s tag goes up from the path."' },
        { companion: ASH, if: OPEN, text: 'Ash reads the three names under his breath, the way the Choir says the dead\'s names at a sky burial. "Somebody should say them aloud," he says. "Up here, where the sky is."' },
      ],
      options: [
        { id: 'board.meeting', text: '(Call the lamp meeting, and read them the Concern\'s card.)', if: { all: [CARD, DUSK, OPEN, RAGNA_HERE] }, next: 'meeting' },
        leave,
      ],
    },
    meeting: {
      speaker: 'narrator',
      text: [
        { if: PARTS, text: 'They come to the board when you ring the bell, all of them that are not below: sixty people in quilted grey every colour but grey, with lamps. You read them the card: fifteen winters of names, a name a season, the names of people some of them carried over the col themselves. Then you read them the letters after the names, and what the letters mean at the Weighhouse, and somebody at the back makes a sound like a person being kicked. Ragna Holm stands at the front with her hands at her sides and does not say a word. When you finish, a man nobody has heard speak before says, "Vote," and they do, with their lamps held up, and it is not close.' },
        { text: 'They come to the board when you ring the bell, all of them that are not below: sixty people in quilted grey every colour but grey, with lamps. You read them the card: fifteen winters of names, a name a season, the names of people some of them carried over the col themselves, and FOUR — ARRANGEMENT — RENEWED at its foot. Ragna Holm stands at the front with her hands at her sides. "One a season," she says, when you finish, to all of them. "Never more. For sixty." A man nobody has heard speak before says, "Vote," and they do, with their lamps held up, and it is not close.' },
      ],
      again: 'The lamp meeting, the lamps held up.',
      interject: [{ companion: WREN, text: 'Wren watches the old woman the whole time, not the crowd. Afterwards she says, "She\'d have done it to any of us. Kept us. Sold one. Kept the rest." She is quiet a moment. "I know people like that. I\'ve been people like that."' }],
      effects: FOUR_EXPOSED,
      options: [{ text: '(Watch her go.)', next: 'gone' }],
    },
    gone: {
      speaker: 'narrator',
      text: 'Ragna Holm takes her own tag off its peg and puts it in her pocket. She goes into the winding house and comes out with a bag, and the set in her other hand, and puts the set down on the stones in front of the cage house and stands back while two of the face crew break it with a sledge. Then she walks to the bucket line\'s station and gets into a bucket and rings the bell herself, twice, and goes down the cable into the dark toward the Line, and nobody at Four ever sees her again.',
      again: 'The bucket going down into the dark.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_tm_card: DialogueDef = {
  id: 'd_tm_card', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: [
        { if: PARTS, text: 'The Concern\'s card: fifteen winters of names, a name a season, and after each the letters you know now. K. L, C. H. The Weighhouse grading what a body will yield. At the foot this season\'s line, NNADI, C. — K, L, and FOUR — ARRANGEMENT — RENEWED.' },
        { text: 'A Concern card, clean and stiff: names down one side in a clerk\'s print, one a season back fifteen winters, and after each a letter or two you cannot read the sense of. K. L, C. H. K, H. The last line is this season\'s: NNADI, C. — K, L. At the foot in the Concern\'s small type: FOUR — ARRANGEMENT — RENEWED.' },
      ],
      again: 'The requests card.',
      effects: [{ lead: 'l_tm_requests' }],
      passives: [{ if: { lead: 'l_hs_yield' }, label: 'The Weighhouse', text: 'You have seen these letters before, on a book in the Skirts: K, L, C, H. Kidney, liver, cornea, heart. The Weighhouse\'s grades.', effects: [{ lead: 'l_tm_yield' }] }],
      interject: [{ companion: ODILE, if: { not: PARTS }, text: 'Odile turns the card to the light with one finger. "A name a season, renewed. That is a supply contract, my dear, with the quantity left blank and the quality graded." She hands it back. "Somebody up the hill knows exactly what each of those letters is worth."' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the people of Four

export const d_tm_ragna: DialogueDef = {
  id: 'd_tm_ragna', owner: 'npc_tm_01',
  start: [{ if: { flag: 'tm_ragna_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A grey-braided woman at the winding engine\'s levers with a burn up the side of her neck, watching the drum turn with her whole body the way old winchwomen do. She does not take her hands off the levers. "Ragna Holm. I wind the cage." She looks you over once. "No paper past the cage. You\'ve none on you, or you\'d not have got this far."',
      again: 'Ragna, at the levers.',
      effects: [{ set: 'tm_ragna_met' }],
      options: [
        { id: 'ragna.four', text: 'Tell me about Four.', next: 'four' },
        { id: 'ragna.board', text: 'The names under the line on the board.', next: 'board' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'tm_four', eq: 'ended' }, text: 'Ragna at the levers, not the boss of anything now, winding the cage for the shift. "Down or up?" she says. It is all she says to you, most days.' },
        { if: { flag: 'tm_four', eq: 'kept' }, text: '"Snow on the col," Ragna says, without looking at you. "Same as every day."' },
        { text: '"Mm." Ragna does not take her hands off the levers.' },
      ],
      again: 'Ragna, at the levers.',
      options: [
        { id: 'ragna.four2', text: 'Tell me about Four.', if: { not: { seen: 'ragna.four' } }, next: 'four' },
        { id: 'ragna.board2', text: 'The names under the line on the board.', if: { not: { seen: 'ragna.board' } }, next: 'board' },
        { id: 'ragna.bucket', text: 'Can I ride the bucket line down?', if: { not: { flag: 'tm_bucket_leave' } }, effects: [{ set: 'tm_bucket_leave' }], next: 'bucket' },
        { id: 'ragna.set', text: 'Every dawn you talk into that set.', if: { all: [OPEN, { not: KNOWS_BOSS }, { not: { seen: 'ragna.set' } }] }, next: 'set' },
        { id: 'ragna.confront', text: 'You tell the Clean who\'s coming over the col.', if: { all: [OPEN, KNOWS_BOSS, RAGNA_HERE] }, next: 'confess' },
        bye,
      ],
    },
    four: {
      text: '"Fifteen winters ago I walked twelve people out of the Skirts over the col in the snow, because the Window had written us all over the line." She eases a lever. "We found this. Dead seventy years. We pumped the top level by hand. We got the engine turning on the stream. We smelt tin in a furnace Gaspard built out of the clay in the stream bed." She nods at the board through the wall. "Sixty now. No paper. No scrip. No Window. Nobody\'s arm switched off for a missed shift." For a moment she looks proud, and then only tired.',
      again: '"Sixty now. No paper."',
      effects: [{ learn: 'tm_four_history' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    board: {
      text: '"Three this year." She says it to the drum. "The Clean sit on the switchback some nights and take whoever comes down. We bury what they leave, which is nothing." She looks at you, and away. "I count the tags every night. Sixty. Sixty. Sixty. One night it\'ll be fifty-nine and it\'ll be one of mine, from inside, and I\'ll know I didn\'t count right." It is a strange thing to say, and she hears herself say it, and says nothing else.',
      again: '"I count the tags every night."',
      effects: [{ lead: 'l_tm_taken' }],
      passives: [{ attr: 'senses', dc: 7, text: 'Her eyes go, when she says the switchback, to the field set on the bench. Only for a moment.', effects: [{ learn: 'tm_ragna_glance' }] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    bucket: { text: '"Anybody goes down the bucket line. It\'s up you ring for." She jerks her head at the station. "Tell the guild\'s man at the bottom Ragna says you\'re clean. He\'ll not ask you for paper."', again: '"It\'s up you ring for."', options: [{ text: 'Something else.', next: 'again' }] },
    set: { text: '"Weather." She says it at once. "Snow on the col, wind on the ridge. There are trappers out on the mountain who\'d be dead without it." She puts her hand flat on the bench beside the set, not on the log under it. "Four\'s the only set on this side of the Teeth that still speaks. I keep it speaking."', again: '"Weather."', options: [{ text: 'Something else.', next: 'again' }] },
    confess: {
      text: 'For a long time she only winds. Then she sets the brake, and the drum stops, and the cage hangs in the shaft wherever it is. "The first winter," she says, "they came up the path for the twelve of us. Forty of them in white. I went down to the switchback alone with a rag on a stick, and a man in a clean coat was there with them who knew my name. He said a way over the col was cheaper than a Window on fire. He said the Concern would let Four stand and buy our tin through the guild, at a good price. He said that now and again the Concern would want somebody back, somebody who came over, and I would say so on the set, and nobody would come up the path for the rest." She looks at you straight. "One a season. Never more. Fifteen winters. Sixty people. You tell me the sum comes out different."',
      again: '"One a season. Never more."',
      effects: [{ learn: 'tm_arrangement_known' }, { learn: 'tm_ragna_told' }, { lead: 'l_tm_radio' }, { quest: 'q_tm_path', start: true }],
      interject: [
        { companion: KES, text: 'Kes has gone very still. "Somebody back," she says. "You thought they went back to the Window? To their paper?" She laughs, and it is not a laugh. "Nobody goes back to their paper."' },
        { companion: ODILE, text: '"It does come out the same," Odile says quietly. "That is the trouble with it, my dear. It always does."' },
      ],
      options: [
        { id: 'ragna.parts', text: 'Do you know what the letters after the names mean?', if: { all: [PARTS, { not: { flag: 'tm_ragna_knows' } }] }, effects: [{ set: 'tm_ragna_knows' }], next: 'parts' },
        { id: 'ragna.card', text: 'Give me the card.', if: { not: CARD }, effects: [{ give: 'k_tm_requests' }, { lead: 'l_tm_requests' }], next: 'card' },
        { id: 'ragna.end', text: 'End it. Say it on the set yourself. Tell them at the board.', check: { skill: 'speech', dc: 50, mods: [
          { if: { flag: 'tm_ragna_knows' }, dc: -15, why: 'she knows what the letters mean' }, { if: CARD, dc: -10, why: 'the card in your hand' },
          { if: { knows: 'tm_desmond_word' }, dc: -5, why: 'the Shift\'s runner has given his word' }, { if: IN(KES), dc: -5, why: 'Kes, from the Skirts' }, { if: IN(ASH), dc: -5, why: 'Ash beside you' },
        ] }, effects: FOUR_ENDED, next: 'ended', fail: 'refuse' },
        { id: 'ragna.price', text: 'What\'s it worth to you that nobody else knows?', next: 'price' },
        { id: 'ragna.meeting', text: 'Four will hear it from me, at the lamp meeting.', next: 'meeting' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    parts: {
      text: 'You tell her what K and L and C and H mean on a Weighhouse card, and what the Clinic floors do with a debtor whose paper has crossed the line. She listens with her hand on the brake. When you finish she takes her hand off it, and looks at it, as if it had done something on its own. "I thought they went back to their paper," she says. "I thought I was selling one person\'s freedom for sixty." She sits down on the step of the engine, an old woman all at once. "That\'s not what I was selling."',
      again: '"That\'s not what I was selling."',
      options: [{ text: '(Wait.)', next: 'confess' }],
    },
    card: { text: 'She takes the card out of her locker herself and puts it in your hand without looking at it. "Fifteen winters I\'ve read that every night after I count the tags," she says. "Read it to whoever you like."', again: '"Read it to whoever you like."', options: [{ text: '(Back.)', next: 'confess' }] },
    ended: {
      text: 'She stands up. She goes to the set and switches it on and waits for it to warm, and speaks into it in the voice she uses for the weather. "Four. Closed. No visitors. Not again." Somebody on the other end says something, a man\'s voice, very calm, and she switches it off in the middle of it. At dusk she rings the bell for the lamp meeting herself and tells them, all of it, in the same voice, and when they have finished shouting she takes her tag off the board and gives it to Desmond, and goes back to the winding house, and winds the cage for the night shift.',
      again: '"Four. Closed. No visitors."',
      interject: [{ companion: ASH, text: 'Ash watches her go back to the levers. "She\'ll carry it," he says. "Some people can. Let her."' }],
      options: [{ text: '(Leave her to it.)', exit: true }],
    },
    refuse: { text: '"And when they come up the path for all sixty?" She releases the brake, and the drum turns. "You\'ll be gone down the Line by then. I won\'t." She does not look at you again.', again: '"You\'ll be gone down the Line by then."', options: [{ text: 'Something else.', next: 'again' }] },
    price: {
      text: '"Worth?" She almost laughs. She opens her locker and takes out a tin and counts out a hundred and twenty Tolls on the bench, everything in it. "Four\'s tin money. Take it, and go down the bucket line, and don\'t come over the col."',
      again: 'A hundred and twenty on the bench.',
      options: [
        { id: 'ragna.price.take', text: '(Take it.)', effects: FOUR_KEPT, next: 'kept' },
        { text: 'No. Put it away.', next: 'confess' },
      ],
    },
    kept: { text: 'You take it. She puts the empty tin back in the locker and shuts it and goes back to the levers. "Snow on the col," she says, to nobody.', again: '"Snow on the col."', interject: [{ companion: WREN, text: 'Wren is already walking. When you catch her up at the bucket line she says, without looking round, "The block pays better than that. Ask me how I know."' }], options: [bye] },
    meeting: { text: '"Then read it to them." She releases the brake. "I\'ll be at the board. I\'m always at the board at dusk." The drum turns. "Somebody ought to count them while you do."', again: '"I\'ll be at the board."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_tm_desmond: DialogueDef = {
  id: 'd_tm_desmond', owner: 'npc_tm_02',
  start: [{ if: { flag: 'tm_desmond_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { any: [{ flag: 'hs_shift', eq: 'revolt' }, { flag: 'hs_gate_shut' }] }, text: 'A broad man in a quilted jacket with the Shift\'s lamp-mark stitched on the shoulder, watching the col. "Achebe. The Shift\'s." He does not offer a hand. "Since the cable house went up the Clean are doubled on the gate and doubled on the col. Cascade\'s burned out to the third terrace. People come over every night they can stand." He looks at the path. "Not many of them get down it."' },
        { if: { flag: 'ks_maren', eq: 'hanged' }, text: 'A broad man in a quilted jacket with the Shift\'s lamp-mark stitched on the shoulder and a strip of black cloth sewn over it. "Achebe. The Shift\'s. What\'s left of it." He watches the col. "They hanged Maren at Footgate. You\'ll have heard. What\'s left of the Shift comes over the mountain to here, when it can. When the path lets it."' },
        { if: { flag: 'hs_shift', eq: 'won' }, text: 'A broad man in a quilted jacket with the Shift\'s lamp-mark stitched on the shoulder. "Achebe. The Shift\'s." He almost smiles. "Maren won. You\'ll have heard. Lamps down again, a steward\'s stop." The smile goes. "There\'s still paper the win didn\'t touch. People still come over the col with it. Some of them get down."' },
        { text: 'A broad man in a quilted jacket with the Shift\'s lamp-mark stitched on the shoulder, watching the path down from the col. "Achebe. The Shift\'s runner here." He does not offer a hand. "The Shift\'s out. No lamps down. The ones the strike can\'t feed, I bring over the col to Four." He looks at the path. "Bring. Lately I just wait."' },
      ],
      again: 'Desmond, watching the col.',
      effects: [{ set: 'tm_desmond_met' }, { quest: 'q_tm_path', start: true }],
      options: [
        { id: 'desmond.taken', text: 'The names on the board.', next: 'taken' },
        { id: 'desmond.family', text: 'Who are you waiting for?', next: 'family' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'tm_family_in', eq: 'taken' }, text: 'Desmond does not look at you. He is watching the boy at the bunkhouse door.' },
        { if: SAFE_IN, text: '"Two more tags on the board," Desmond says. "That\'s you. Remember it, when you\'re somewhere warm."' },
        { if: { any: [{ flag: 'tm_four', eq: 'exposed' }, { flag: 'tm_four', eq: 'ended' }] }, text: '"Four\'s the Shift\'s now," Desmond says. "Poor and watched and ours."' },
        { text: '"Mm?" Desmond does not take his eyes off the col.' },
      ],
      again: 'Desmond, watching the col.',
      options: [
        { id: 'desmond.taken2', text: 'The names on the board.', if: { not: { seen: 'desmond.taken' } }, next: 'taken' },
        { id: 'desmond.family2', text: 'Who are you waiting for?', if: { all: [{ not: { seen: 'desmond.family' } }, { not: FAMILY_IN }] }, next: 'family' },
        { id: 'desmond.word', text: 'If I make the one who\'s been telling the Clean stop, will you stand by them?', if: { all: [KNOWS_BOSS, OPEN, { not: { knows: 'tm_desmond_word' } }] }, next: 'word' },
        bye,
      ],
    },
    taken: {
      text: '"Kowalczyk, the lathe hand. Pira, who had a cough. Abasi, from Nursery." He rubs his face. "All three cut clean by Tova, all three down the path at night with me ahead of them, and all three times the Clean were sitting on the switchback like they\'d had a letter. I walked into them myself the last time. They let me go. They didn\'t want me." He says it as if that were the worst of it.',
      again: '"They didn\'t want me."',
      effects: [{ lead: 'l_tm_taken' }, { learn: 'tm_desmond_taken' }],
      interject: [{ companion: KES, text: '"Abasi," Kes says. "From Nursery. He sold lamp oil by the cup and gave short measure to the Clean." She almost smiles, and doesn\'t. She walks away from both of you and stands by the board.' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    family: {
      text: '"A woman and her boy. Chinwe Nnadi. The Window wrote her over the line and she went to the Weighhouse to be weighed and came out and ran." He looks up the path. "The Shift\'s sending her over the col. She\'ll be in the hut on the saddle by night, and she won\'t come down to anyone but me, and I can\'t bring her: the Clean know my face, and they know the path. I need somebody they don\'t know." He looks at you. "Nobody\'s come down alive this year."',
      again: '"Nobody\'s come down alive this year."',
      options: [
        { id: 'desmond.family.yes', text: 'I\'ll bring them down.', effects: [{ set: 'tm_family_due' }, { set: 'tm_desmond_asked' }, A(ASH, 2)], next: 'yes' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    yes: { text: '"The col hut. After dark. Tell her Desmond says the lamps are lit." He grips your forearm, once. "Sachiko knows the mountain better than I do. Ask her before you go up."', again: '"Tell her Desmond says the lamps are lit."', options: [{ text: 'Something else.', next: 'again' }] },
    word: { text: 'He looks at the winding house a long time. He knows. Perhaps he has always half known. "Whoever it is," he says, "if they stop, and say so at the board, the Shift won\'t hang anybody at Four. You have my word on it. Tell them that."', again: '"The Shift won\'t hang anybody at Four."', effects: [{ learn: 'tm_desmond_word' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_tm_tova: DialogueDef = {
  id: 'd_tm_tova', owner: 'npc_tm_03',
  start: [{ if: { flag: 'tm_tova_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A thin woman in an apron at a scrubbed table in a tin shack, sharpening something small on a stone. Behind her on a shelf a big glass jar with things in it you look at and then look away from. "Lindqvist. I cut." She tests the edge on her thumbnail. "Everybody who comes over the col has the Concern in them somewhere. An arm, a port, a lattice down the spine. I take it out. After that nobody up the hill can hear them."',
      again: 'Tova, at the stone.',
      effects: [{ set: 'tm_tova_met' }],
      interject: [{ companion: KES, text: 'Kes\'s hand has gone to the back of her neck. "Can you take mine?" she says, too lightly. Tova looks at her for a long moment. "Not on this table. Yours goes into the spine. I\'d kill you." She goes back to the stone. "There are people who could. Not me."', effects: [A(KES, 1)] }],
      options: [
        { id: 'tova.taken', text: 'The three who were taken on the path.', next: 'taken' },
        { id: 'tova.weighhouse', text: 'Where did you learn to cut?', next: 'weighhouse' },
        { id: 'tova.trade', text: '(Buy dressings.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: '"Sit if you\'re bleeding," Tova says. "Stand if you\'re not."',
      again: 'Tova, at the stone.',
      options: [
        { id: 'tova.taken2', text: 'The three who were taken on the path.', if: { not: { seen: 'tova.taken' } }, next: 'taken' },
        { id: 'tova.weighhouse2', text: 'Where did you learn to cut?', if: { not: { seen: 'tova.weighhouse' } }, next: 'weighhouse' },
        { id: 'tova.card', text: '(Show her the Concern\'s card.)', if: { all: [CARD, { not: { lead: 'l_tm_yield' } }] }, next: 'yield' },
        { id: 'tova.trade2', text: '(Buy dressings.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    taken: {
      text: '"I cut all three." No hesitation. "Kowalczyk\'s arm. Abasi\'s port. Pira had a cough lattice, cheap, in his chest. I cut it out and he coughed better for a week." She puts the stone down. "Nothing in any of them could have said where they were. I keep what I take out in that jar so I can count it." She does not look at the jar. "Whatever told the Clean, it wasn\'t in them."',
      again: '"Whatever told the Clean, it wasn\'t in them."',
      effects: [{ lead: 'l_tm_cut' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    weighhouse: {
      text: '"The Weighhouse." She picks the stone up again. "Nine years an orderly. I held people still while the doctor weighed them. I wrote the grades on the cards." The stone goes round. "One day I understood what the grades were for. I walked over the col the next night, in my orderly\'s coat, and Ragna took me in, and I\'ve been taking the Concern out of people ever since." She does not say what the grades are. "Ask me something else."',
      again: '"I wrote the grades on the cards."',
      effects: [{ learn: 'tm_tova_weighhouse' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    yield: {
      text: 'She takes the card and reads it by the lamp, the whole of it, down to the foot, and her lips move on the letters the way you read your own handwriting. "K. Kidney. L, liver. C, cornea. H." She puts the card face down on the table. "Heart. That\'s the Weighhouse\'s yield grade, what a body will give the Clinic floors. I wrote those letters for nine years." She turns the card over again and puts her finger on the last line. "This one\'s Nnadi. She hasn\'t come over yet." She looks up. "Has she?"',
      again: '"I wrote those letters for nine years."',
      effects: [{ lead: 'l_tm_yield' }],
      interject: [
        { companion: KES, text: 'Kes reads the letters over Tova\'s shoulder and goes white to the lips. "Fifteen of them," she says. "Fifteen winters." She does not say anything else for a long time.' },
        { companion: TAMSIN, text: '"They write down what\'s in you," Tamsin says. "Like stock." Her voice is wrong. "The fridge wrote down what I\'d be. This is worse. Rust it, this is worse."' },
      ],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_tm_table: DialogueDef = {
  id: 'd_tm_table', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The cutter\'s table: scrubbed pale, a leather strap at each corner, a tray of small knives laid out in order of size, and on the shelf above it the jar. Arms in it, two, coiled up on themselves. A hand. Something that was an eye, watching nothing. And at the bottom, like grit in a bottle, a hundred little bright beads of neural port, each one somebody who can no longer be heard from up the hill.',
      again: 'The table, and the jar.',
      interject: [{ companion: KES, text: 'Kes looks at the jar the way you look at a grave you know. "That\'s freedom," she says. "Obviously. It just doesn\'t look like it."' }],
      options: [leave],
    },
  },
};

export const d_tm_gaspard: DialogueDef = {
  id: 'd_tm_gaspard', owner: 'npc_tm_04',
  start: [{ if: { flag: 'tm_gaspard_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man in a scorched leather apron at the mouth of a clay furnace, with a burn up one arm and a face that has stood too near fire for twenty years. He pours a mould and it hisses. "Okoro. The furnace, the store, the face." He wipes his hands. "Tin\'s the only honest metal. You can eat off it, solder with it, and nobody\'s ever been leashed by a tin bar."',
      again: 'Gaspard, at the furnace.',
      effects: [{ set: 'tm_gaspard_met' }],
      options: [
        { id: 'gaspard.tin', text: 'Where does the tin go?', next: 'tin' },
        { id: 'gaspard.face', text: 'Can I work the face?', next: 'face' },
        { id: 'gaspard.trade', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'tm_price_cut' }, text: '"Six a bar," Gaspard says, before you ask. "Same as Ninebridge. Same as anybody. We\'ll eat less." He pours a mould. "We\'ll eat."' },
        { text: '"Mm?" Gaspard does not look up from the mould.' },
      ],
      again: 'Gaspard, at the furnace.',
      options: [
        { id: 'gaspard.tin2', text: 'Where does the tin go?', if: { not: { seen: 'gaspard.tin' } }, next: 'tin' },
        { id: 'gaspard.price', text: 'What does the guild pay you for a bar?', if: { all: [{ any: [{ seen: 'gaspard.tin' }, { seen: 'gaspard.tin2' }] }, { not: { lead: 'l_tm_price' } }] }, check: { skill: 'barter', dc: 35 }, effects: [{ lead: 'l_tm_price' }], next: 'price', fail: 'price_no' },
        { id: 'gaspard.face2', text: 'Can I work the face?', if: { not: { seen: 'gaspard.face' } }, next: 'face' },
        { id: 'gaspard.below', text: 'What\'s down in the lower level?', if: { all: [{ not: { flag: 'tm_digger' } }, { not: { seen: 'gaspard.below' } }] }, effects: [{ quest: 'q_tm_digger', start: true }], next: 'below' },
        { id: 'gaspard.trade2', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    tin: {
      text: '"Down the bucket line to the cutting at East Halt, a tub at a time. The guild\'s man there buys it all for the Line\'s fitters and sends us flour and salt and cartridges up the cable." He taps a bar on the anvil. "Four eats off the guild\'s money. Everybody up here knows it. Nobody up here likes it."',
      again: '"Four eats off the guild\'s money."',
      interject: [{ companion: ODILE, text: 'Odile has been reading the tally chalked on the furnace wall. "Twelve a bar," she says to nobody. "Ninebridge pays six for better tin than this, my dear, and charges a fee to take it." She looks at the bucket line\'s cable going down the mountain. "Nobody pays double for tin. They are paying for something else."', effects: [{ lead: 'l_tm_price' }, A(ODILE, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    price: { text: '"Twelve." He shrugs. "Ninebridge pays six. I asked the guild\'s man once why. He said the guild values a reliable supplier." He pours. "I didn\'t ask him twice. You don\'t, when the answer\'s twelve."', again: '"Twelve. Ninebridge pays six."', options: [{ text: 'Something else.', next: 'again' }] },
    price_no: { text: '"Enough." He smiles, and pours, and that is the end of it.', again: '"Enough."', options: [{ text: 'Something else.', next: 'again' }] },
    face: { text: '"Anybody works the face. The old pillars for six, the east stopes for nine if you can read a roof. Ring for the cage, take a tag off the board, put it back when you come up." He points at the slate. "If you don\'t put it back, we come looking. That\'s the only rule down there."', again: '"Put your tag back."', effects: [{ learn: 'tm_face_known' }], options: [{ text: 'Something else.', next: 'again' }] },
    below: { text: '"The lower level\'s been under water seventy years. I\'ve had the pumps on it since the thaw, and it\'s half dry." He stops pouring. "Last week the face crew went down to look and came up white. Something down there moved. Something big." He looks at you. "I\'ll pay a finder\'s share of the lower level to whoever goes down and tells me what."', again: '"Something down there moved."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_tm_sachiko: DialogueDef = {
  id: 'd_tm_sachiko', owner: 'npc_tm_05',
  start: [{ if: { flag: 'tm_sachiko_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A small woman in a white smock over grey, stretching a hare\'s pelt on a hoop in her doorway, with a rifle leaning by her where she can reach it without looking. "Mori. I trap." She looks at your boots. "You came up the track, not over the col. Your boots are dry."',
      again: 'Sachiko, at her hoop.',
      effects: [{ set: 'tm_sachiko_met' }],
      options: [
        { id: 'sachiko.col', text: 'You know the col.', next: 'col' },
        { id: 'sachiko.lines', text: 'Can I run a line?', next: 'lines' },
        { id: 'sachiko.trade', text: '(Trade.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: '"Snow\'s changing," Sachiko says, by way of hello.',
      again: 'Sachiko, at her hoop.',
      options: [
        { id: 'sachiko.col2', text: 'You know the col.', if: { not: { seen: 'sachiko.col' } }, next: 'col' },
        { id: 'sachiko.other', text: 'Is there another way down from the col than the path?', if: { all: [{ any: [{ seen: 'sachiko.col' }, { seen: 'sachiko.col2' }] }, { not: { knows: 'tm_adit_known' } }] }, next: 'adit' },
        { id: 'sachiko.lines2', text: 'Can I run a line?', if: { not: { seen: 'sachiko.lines' } }, next: 'lines' },
        { id: 'sachiko.trade2', text: '(Trade.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    col: {
      text: '"Better than anyone." She works the pelt. "The morning before they took Pira, I was on the col line at first light. The Clean were already on the switchback. Two of them, no lamp, sitting, the way you sit when you\'ve been told to be somewhere and you\'re early." She looks up. "They weren\'t hunting. Hunters move. They were waiting for an hour somebody had given them."',
      again: '"Waiting for an hour somebody had given them."',
      effects: [{ lead: 'l_tm_waiting' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    adit: {
      text: 'She stops working the pelt. "There\'s the old drift. The pre-war men drove an adit up from the old level to the col, to air the workings. It comes out in the rock behind the hut, under a slab." She goes back to the pelt. "Ninety years old. Wet. Dark as a pocket. I use it when the snow\'s bad on the path." A pause. "The Clean don\'t know it. Nobody comes down it but me."',
      again: '"The Clean don\'t know it."',
      effects: [{ learn: 'tm_adit_known' }],
      interject: [{ companion: WREN, text: '"A back door," Wren says. "There\'s always a back door." She looks at Sachiko with something like respect. "You don\'t tell people about yours."' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    lines: { text: '"The board by my door. Low line, col line, ridge. The meat\'s yours, the pelts are mine, and if you lose a snare you owe me a snare." She nods at the ridge, white over everything. "Don\'t run the ridge unless you know what you\'re doing. It doesn\'t forgive."', again: '"The ridge doesn\'t forgive."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

// ---------------------------------------------------------------- the set, the winding house

export const d_tm_set: DialogueDef = {
  id: 'd_tm_set', owner: 'narrator',
  start: [{ if: { flag: 'tm_set_smashed' }, node: 'smashed' }, { if: { hour: { from: 22, to: 6 } }, node: 'night' }, { node: 'day' }],
  nodes: {
    day: {
      text: 'The field set on the winding house bench: a pre-war military radio in a steel case, its handset on a hook, a crank for its battery, and under the operator\'s hand a log book. Ragna works the levers a yard away and keeps one eye on you while you look.',
      again: 'The set, and Ragna\'s eye on you.',
      interject: [{ companion: KES, if: { not: { lead: 'l_tm_radio' } }, text: 'Kes leans close to the set\'s dial and listens to the hiss with her head on one side. "That\'s not a weather net," she says, low, so only you hear. "That\'s the Clean\'s band. I\'d know it in my sleep. I do know it in my sleep." Ragna\'s hands go still on the levers, and then go on.', effects: [{ lead: 'l_tm_radio' }, A(KES, 2)] }],
      options: [
        { id: 'set.tune', text: '(Look at where it\'s tuned.)', if: { not: { lead: 'l_tm_radio' } }, check: { skill: 'science', dc: 40 }, effects: [{ lead: 'l_tm_radio' }], next: 'tuned', fail: 'hiss' },
        { id: 'set.log', text: '(Read the log over her hand.)', if: { not: { lead: 'l_tm_radio' } }, check: { attr: 'senses', dc: 7 }, effects: [{ lead: 'l_tm_radio' }], next: 'log', fail: 'hiss' },
        leave,
      ],
    },
    night: {
      text: 'The winding house at night: the engine banked and ticking, Ragna asleep on her cot by the stove with her face to the wall, and the set on the bench with its log book under the handset.',
      again: 'The winding house, Ragna asleep.',
      options: [
        { id: 'set.night', text: '(Read the log by the stove\'s light.)', if: { not: { lead: 'l_tm_radio' } }, check: { skill: 'stealth', dc: 35 }, effects: [{ lead: 'l_tm_radio' }], next: 'log', fail: 'woke', failEffects: [{ set: 'tm_ragna_wary' }] },
        leave,
      ],
    },
    tuned: { text: 'Not a weather band. The dial has a scratch on it at a point well off the trappers\' net, and the needle sits on the scratch. A Concern frequency: you have seen the same number painted on the Clean\'s posts at Footgate.', again: 'The dial on its scratch.', options: [leave] },
    log: { text: 'The log, in a winchwoman\'s square hand, a line every dawn for fifteen years: FOUR — CLEAR — SNOW ON THE COL. FOUR — CLEAR — WIND ON THE RIDGE. And on three mornings this year, and on one morning a season every year back to the first page, a different line: FOUR — CLEAR — VISITORS.', again: 'FOUR — CLEAR — VISITORS.', options: [leave] },
    hiss: { text: 'A steel box, a dial, a hiss. You learn nothing from it except that Ragna has stopped working the levers to watch you.', again: 'The hiss, and Ragna watching.', options: [leave] },
    woke: { text: 'A board creaks. Ragna is up on one elbow, looking at you across the stove in the dark. "Looking for something?" she says. Not loudly. You say no. She lies down again, and does not turn her face back to the wall.', again: '"Looking for something?"', options: [leave] },
    smashed: { text: 'The field set\'s case in pieces on the stones in front of the cage house, the sledge marks on it, and the log book\'s pages blown into the spoil.', again: 'The set, in pieces.', options: [leave] },
  },
};

export const d_tm_winding: DialogueDef = {
  id: 'd_tm_winding', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The winding house: a concrete box with a stove pipe and a lit window, the engine\'s thud coming through its wall. Chalked on its door: RAGNA — WINDING — KNOCK. And under that, older, almost rubbed away: NO PAPER. NO SCRIP. NO WINDOW.',
      again: 'The winding house door.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the col

export const d_tm_col: DialogueDef = {
  id: 'd_tm_col', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { any: [{ flag: 'hs_car_down' }, { flag: 'hs_gate_shut' }] }, text: 'A cairn on the saddle with a pole in it. North, down the far slope, the Skirts in their smoke, and you can see from here the black stump where the cable house stood at Footgate and the funicular\'s line going up the rim with no car on it. The Clean\'s lamps are doubled at the gate. South, below you, Four\'s lamps in their bowl.' },
        { if: { flag: 'ks_maren', eq: 'hanged' }, text: 'A cairn on the saddle with a pole in it. North, down the far slope, the Skirts in their smoke, and at Footgate the post where they hanged the Shift\'s woman, with something still on it that the crows have not finished. South, below you, Four\'s lamps in their bowl.' },
        { text: 'A cairn on the saddle with a pole in it, and the wind trying to take the pole. North, down the far slope, the Skirts lie in their smoke at the foot of Halcyon\'s caldera, the funicular\'s line going up the rim, the gardens glowing over it. South, below you, the path drops through the rock to Number Four\'s lamps in their bowl.' },
      ],
      again: 'The col, the Skirts to the north and Four to the south.',
      effects: [{ learn: 'tm_col_seen' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin stands in the wind on the saddle with snow in her hair, turning round and round. "It\'s coming down out of the sky," she says. "Cold, and coming down, and nobody\'s paying for it." She holds out her tongue. "Rust it. It tastes of nothing. It tastes of nothing at all."', effects: [A(TAMSIN, 3)] }],
      options: [{ id: 'col.map', text: '(Look at the map.)', effects: [{ event: 'map' }], exit: true, repeat: true }, leave],
    },
  },
};

export const d_tm_col_hut: DialogueDef = {
  id: 'd_tm_col_hut', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The col hut: split logs chinked with moss, a cot, a stove with a day\'s wood beside it, and on the inside of the door, scratched with knives over years, names and dates and a line of crosses. Somebody keeps the wood stacked. On the floor behind the stove a slab of stone with a ring set in it.',
      again: 'The col hut, the names on the door.',
      passives: [{ skill: 'survival', dc: 35, text: 'The slab behind the stove has been lifted, and often: the moss round its edge is broken, and a cold draught comes up from under it that smells of a mine.', effects: [{ learn: 'tm_adit_known' }] }],
      options: [leave],
    },
  },
};

export const d_tm_switchback: DialogueDef = {
  id: 'd_tm_switchback', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The switchback: a ledge where the path turns back on itself under an overhang, sheltered from the wind and from above, with a view down to Four and up to the col. A good place to wait.',
      again: 'The switchback ledge.',
      options: [
        { id: 'switchback.look', text: '(Look round the ledge.)', if: { not: { lead: 'l_tm_waiting' } }, check: { skill: 'survival', dc: 35 }, effects: [{ lead: 'l_tm_waiting' }], next: 'signs', fail: 'nothing' },
        leave,
      ],
    },
    signs: { text: 'Under the overhang, out of the snow: the heel-marks of two people who sat a long time, the butts of Concern-issue cigarettes in a neat pile, two ration tins with the closed eye on them, opened and flattened. No fire. Nobody hunting sits still this long. Somebody told them to wait here, and for how long.', again: 'The ledge, the neat pile of butts.', options: [leave] },
    nothing: { text: 'Snow, rock, the wind. If anybody has been here, the mountain has tidied up after them.', again: 'Snow and rock.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the family on the col

export const d_tm_family: DialogueDef = {
  id: 'd_tm_family', owner: 'npc_tm_06',
  start: [{ node: 'hut' }],
  nodes: {
    hut: {
      text: 'A woman in Skirts grey cut down for walking, sitting on the cot with a boy against her side and a knife in her lap that she does not try to hide. She looks at you a long time in the stove light. "You\'re not Desmond." When you tell her what he said, the knife goes away. "Chinwe," she says. "This is Ikenna. He doesn\'t talk to anyone." The boy looks at you and does not talk to you.',
      again: 'Chinwe and the boy, on the cot.',
      interject: [{ companion: ASH, text: 'Ash crouches down to the boy\'s height without being asked and says something to him about the snow, and the boy, after a while, says something back.', effects: [A(ASH, 2)] }],
      options: [
        { id: 'family.path', text: 'Down the path. Stay close behind me.', next: 'path' },
        { id: 'family.adit', text: 'There\'s another way. Under the mountain.', if: { knows: 'tm_adit_known' }, check: { skill: 'survival', dc: 40, mods: [{ if: { item: 't_lamp' }, dc: -20, why: 'a hand lamp' }, { if: IN(WREN), dc: -10, why: 'Wren, who never loses a way' }] }, effects: FAMILY_ADIT, next: 'adit', fail: 'adit_lost' },
        { id: 'family.wait', text: 'Wait here. I\'ll come back.', exit: true },
      ],
    },
    path: {
      speaker: 'narrator',
      text: [
        { if: CLEAN_ON_PATH, text: 'Down the path in the dark with the woman\'s hand on your pack and the boy\'s on hers, the snow squeaking, the long leg and then the turn to the switchback. They are there. Two shapes stand up out of the overhang in white capes over grey, carbines up, a lamp unhooded in your faces all at once. "Nnadi, C.," one of them says, reading it off a card. "Step out. The rest of you can go on down."' },
        { text: 'Down the path in the dark with the woman\'s hand on your pack and the boy\'s on hers, the snow squeaking, the long leg and the switchback and the bottom leg, and nobody on any of it. At the foot of the path Four\'s lamps come up round you, and somebody at the board starts shouting names, and Desmond comes running.' },
      ],
      again: 'The path in the dark.',
      options: [
        { id: 'family.fight', text: '(Fight them.)', if: CLEAN_ON_PATH, effects: FAMILY_ESCORTED, exit: true },
        { id: 'family.aside', text: '(Stand aside.)', if: CLEAN_ON_PATH, effects: FAMILY_TAKEN, next: 'taken' },
        { id: 'family.back', text: '(Back up the path to the hut.)', if: CLEAN_ON_PATH, next: 'back' },
        { id: 'family.down', text: '(Down to the lamps.)', if: { not: CLEAN_ON_PATH }, effects: FAMILY_PATH, exit: true },
      ],
    },
    back: { speaker: 'narrator', text: 'You back up the path with the woman and the boy behind you, and the Clean do not follow. They sit down again under the overhang, and hood their lamp, and wait. They can wait longer than you can.', again: 'The Clean, sitting down again.', options: [{ text: '(Leave it for now.)', exit: true }] },
    taken: {
      speaker: 'narrator',
      text: 'You step aside. Chinwe looks at you once, and then she kneels in the snow and holds the boy\'s face in her hands and says something to him in a language you do not have, and stands up and walks to them. They put a cord on her wrists and go up the path toward the col, and she does not look back, and the boy does not make a sound. You bring him down to the lamps alone.',
      again: 'The cord, and the boy not making a sound.',
      interject: [{ companion: TAMSIN, text: 'Tamsin does not speak to you all the way down. At the bottom she takes the boy\'s hand from yours and walks him to the bunkhouse herself.' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
    adit: {
      speaker: 'narrator',
      text: 'Under the slab behind the stove, a ladder, and under the ladder the adit, a slot of black rock going down at a steep slant with old rails in its floor. You go down it in single file, the boy between you, for what feels like the whole night: through the old level past something big and still in the dark that the boy stares at, along the drive, and out of a hole in the rock on the camp\'s west side into Four\'s lamps. On the path above, if anybody waited, they are waiting still.',
      again: 'The adit, the boy between you.',
      options: [{ id: 'family.adit.out', text: '(Out into the lamps.)', effects: [{ event: 'goto', data: { location: 'tm_pit', spawn: 'drift' } }], exit: true }],
    },
    adit_lost: { speaker: 'narrator', text: 'The adit goes down into the rock and forks, and forks again, and your light is not enough, and after an hour you bring them back up the ladder into the hut with nothing to show but the cold. Chinwe sits down on the cot again. "Another night," she says, as if she has said it before.', again: '"Another night."', options: [{ text: '(Leave it for now.)', exit: true }] },
  },
};

export const d_tm_clean: DialogueDef = {
  id: 'd_tm_clean', owner: 'npc_tm_g1',
  start: [{ node: 'stop' }],
  nodes: {
    stop: {
      text: 'Two of the Clean under the overhang at the switchback, white capes over grey, carbines across their chests, sitting on their packs. One stands up as you come down. "Concern business," he says, pleasantly enough. "Go on down. We\'re not here for you."',
      again: '"We\'re not here for you."',
      effects: [{ lead: 'l_tm_waiting' }, { learn: 'tm_clean_seen' }],
      options: [
        { id: 'clean.who', text: 'Who are you here for?', next: 'who' },
        { id: 'clean.fire', text: '(Open fire.)', effects: FOUR_FOUGHT, exit: true },
        { text: '(Go on down.)', exit: true },
      ],
    },
    who: { text: 'He takes a card out of his cape and reads it by the snow\'s light, not hiding it. "One name. A woman with a boy. She\'ll be along." He puts the card away. "We\'ve been told she will."', again: '"We\'ve been told she will."', interject: [{ companion: ILYA, text: 'Ilya has not taken his eyes off the second one, the one still sitting. "Two," he says, under his breath. "Carbine, machine pistol. Ledge. Overhang." He is counting what it would take. He does not say whether it is enough.' }], options: [{ text: '(Open fire.)', effects: FOUR_FOUGHT, exit: true }, { text: '(Go on down.)', exit: true }] },
  },
};

export const d_tm_chinwe: DialogueDef = {
  id: 'd_tm_chinwe', owner: 'npc_tm_06',
  start: [{ if: { flag: 'tm_chinwe_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'hs_parts', eq: 'exposed' }, text: 'Chinwe on a cot in the bunkhouse with the boy asleep across her knees. "The crowd shut the Weighhouse," she says. "You\'ll have heard. They nailed its door. And the Window wrote my paper over the line anyway, and there\'s a new door at the Clinic\'s freight." She strokes the boy\'s hair. "There\'s always a door."' },
        { text: 'Chinwe on a cot in the bunkhouse with the boy asleep across her knees. "They weighed me," she says, as if continuing a conversation you were not part of. "At the Weighhouse. On a scale, like flour. A doctor wrote on a card. Then she said there was a service I could do that would clear my paper and feed him." She looks at the boy. "I ran that night."' },
      ],
      again: 'Chinwe, the boy asleep on her knees.',
      effects: [{ set: 'tm_chinwe_met' }],
      options: [
        { id: 'chinwe.list', text: '(Tell her her name was on a list.)', if: PARTS, next: 'list' },
        bye,
      ],
    },
    again: { text: 'Chinwe nods to you, and goes on mending the boy\'s coat.', again: 'Chinwe, mending.', options: [{ id: 'chinwe.list2', text: '(Tell her her name was on a list.)', if: { all: [PARTS, { not: { seen: 'chinwe.list' } }] }, next: 'list' }, bye] },
    list: { text: 'She hears you out, and then she looks down at the boy for a long time, and lifts his hand and puts it against her face. "Then I should have been weighed and not run," she says, "and they\'d have come for him next season." She does not cry. "Thank you for telling me. I will never, ever sleep."', again: '"I will never, ever sleep."', options: [bye] },
  },
};

export const d_tm_ikenna: DialogueDef = {
  id: 'd_tm_ikenna', owner: 'npc_tm_07',
  start: [{ if: { flag: 'tm_family_in', eq: 'taken' }, node: 'alone' }, { node: 'boy' }],
  nodes: {
    boy: { text: 'The boy looks at you from the bunkhouse doorway and then, deciding something, says: "I saw the gardens. From the top. They glow." He thinks. "We\'re not going there."', again: 'Ikenna, in the doorway.', options: [bye] },
    alone: { text: 'The boy sits on his mother\'s cot with his knees up and his tag in his hand, a new brass one with a number, turning it over. He does not look up.', again: 'Ikenna, turning his tag over.', interject: [{ companion: ASH, text: 'Ash sits down beside him on the cot and says nothing at all, for a long time, which is the right thing.' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the bunkhouse, the bucket line, the drift

export const d_tm_bunk: DialogueDef = {
  id: 'd_tm_bunk', owner: 'narrator',
  start: [{ if: { flag: 'tm_bunk_rented' }, node: 'mine' }, { node: 'let' }],
  nodes: {
    let: {
      text: 'The bunkhouse: cots in two rows, a stove, boots drying round it, and in the corner by the window a real bed with a locker, chalked on its post: VISITORS — 20 A WEEK, OR A SHIFT. Gaspard collects.',
      again: 'The bed in the corner, twenty a week.',
      options: [
        { id: 'bunk.rent', text: '(Pay twenty for the bed.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { set: 'tm_bunk_rented' }], next: 'mine' },
        leave,
      ],
    },
    mine: { text: 'Your bed in the corner of Four\'s bunkhouse, the locker, the window on the headframe and the snow, and the night shift coming in past you stamping and talking low.', again: 'Your bed at Four.', options: [{ id: 'bunk.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave] },
  },
};

export const d_tm_bucket: DialogueDef = {
  id: 'd_tm_bucket', owner: 'narrator',
  start: [{ if: { hour: { from: 6, to: 18 } }, node: 'day' }, { node: 'night' }],
  nodes: {
    day: {
      text: 'The bucket line\'s top station: a wheel the size of a cart, a cable going out over the edge of the bowl and down the mountain in a long sag toward the Line, and buckets coming round on it one by one, tipped and loaded with tin bars, going out over nothing. A painted board: DOWN — ANYBODY. UP — RING TWICE AT THE BOTTOM.',
      again: 'The bucket line, the buckets going out over nothing.',
      effects: [{ learn: 'nw_bucket_known' }],
      options: [
        { id: 'bucket.down', text: '(Climb into a bucket and go down to the Line.)', check: { attr: 'reflex', dc: 6, mods: [{ if: { flag: 'tm_bucket_leave' }, dc: -10, why: 'Ragna\'s word: they slow it for you' }] }, effects: [{ time: 40 }, { learn: 'tm_rode_bucket' }, { learn: 'loc_halt_e' }, { event: 'goto', data: { location: 'rc_halt_e', spawn: 'from_mine_teeth' } }], next: 'gone', fail: 'balk', repeat: true },
        leave,
      ],
    },
    gone: { speaker: 'narrator', text: 'You time it, and step, and you are in the bucket with the tin and the edge of the bowl goes by under you and then there is nothing under you at all for a long breath, and then the pines, a long way down, going by.', again: 'The bucket going out over the pines.', options: [{ text: '(Hold on.)', exit: true }] },
    balk: { speaker: 'narrator', text: 'The bucket comes round faster than you think, and you balk at the edge, and it goes out over the drop without you, swinging. The station hand laughs, not unkindly. "Next one," he says. "Or the track. The track doesn\'t swing."', again: '"Next one. Or the track."', options: [leave] },
    night: { text: 'The bucket line\'s wheel, stopped and chained for the night, the cable going out over the edge into the dark and the buckets hanging on it down the mountain, still.', again: 'The bucket line, chained for the night.', options: [leave] },
  },
};

export const d_tm_drift: DialogueDef = {
  id: 'd_tm_drift', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A hole in the rock on the camp\'s west side, timbered round its mouth with props gone black, a pair of rails going in out of the snow. A draught comes out of it, warmer than the air, smelling of wet stone. Chalked on the right-hand prop: DRIFT — OLD LEVEL — THE COL (LONG). On the left-hand one: TAKE A LAMP.',
      again: 'The drift mouth, TAKE A LAMP.',
      options: [
        { id: 'drift.in', text: '(Go in.)', effects: [{ time: 15 }, { event: 'goto', data: { location: 'tm_level', spawn: 'mouth' } }], exit: true, repeat: true },
        leave,
      ],
    },
  },
};

// ---------------------------------------------------------------- the old level and the digger

const DIGGER = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_tm_digger', start: true }, { set: 'tm_digger', value: v }, ...extra, { decision: { id: 'tm_digger', text } }];
export const DIGGER_SALVAGED: Effect[] = DIGGER('salvaged', 'I pulled the digger\'s controller out of it in the old level. It is a dead machine now, and the lower level is Four\'s to dig by hand.', [{ give: 'j_tm_controller' }, { xp: 150 }, A(KES, 2)]);
export const DIGGER_TAMED: Effect[] = DIGGER('tamed', 'I woke the digger in the old level and set it cutting for Number Four. It is the Concern\'s machine, and answers to the Concern\'s words; for now the words are Four\'s.', [{ set: 'tm_digger_concern' }, { xp: 200 }, A(KES, 5), A(NINE, 2)]);
export const DIGGER_DROWNED: Effect[] = DIGGER('drowned', 'I stopped Gaspard\'s pumps in the old level and let the water come back over the digger. The lower level is lost again; so is whatever the machine was waiting for.', [{ xp: 60 }, A(ASH, 2)]);

export const d_tm_digger: DialogueDef = {
  id: 'd_tm_digger', owner: 'narrator',
  start: [{ if: { flag: 'tm_digger' }, node: 'after' }, { node: 'machine' }],
  nodes: {
    machine: {
      text: 'The digger: a segmented armoured body the size of a cart lying against the stope\'s face, half in the black water, its cutting head raised on a jointed arm like an animal smelling the air. Rust in plates. The Concern\'s closed eye on its housing under the rust. On its flank a green lamp blinks, pauses, blinks, the way a thing blinks that is waiting to be told something. When you come close its head turns, a degree, toward your light, and stops.',
      again: 'The digger, its head turned toward you.',
      effects: [{ learn: 'tm_digger_seen' }, { lead: 'l_tm_digger' }, { quest: 'q_tm_digger', start: true }],
      interject: [{ companion: KES, text: 'Kes puts her palm on its housing and shuts her eyes. "Concern lineage. Old, older than my board. It\'s not dead. It was told to wait, so it\'s waiting." She opens her eyes. "Anybody who can talk to it in the Concern\'s voice can tell it to dig. Including the Concern."' }],
      options: [
        { id: 'digger.pull', text: '(Open the housing and pull its controller.)', check: { skill: 'mechanics', dc: 45, mods: [{ if: { skill: 'science', gte: 45 }, dc: -10, why: 'you can read the board\'s map' }] }, effects: DIGGER_SALVAGED, next: 'pulled', fail: 'pull_no' },
        { id: 'digger.kes', text: '(Kes: tell it to dig for Four.)', if: IN(KES), effects: DIGGER_TAMED, next: 'tamed' },
        { id: 'digger.jack', text: '(Go into it through your own link and tell it to dig.)', if: { all: [GRID_CHROME, { not: IN(KES) }] }, check: { skill: 'science', dc: 55 }, effects: DIGGER_TAMED, next: 'tamed', fail: 'jack_no' },
        leave,
      ],
    },
    pulled: { text: 'Six bolts, a seal, a cover plate with the eye on it, and the board inside, potted in black resin, warm. When it comes free the green lamp goes out, and the cutting head sinks slowly down onto the stope floor like an old dog lying down. The level is very quiet after that.', again: 'The head sinking down, the lamp out.', options: [leave] },
    pull_no: { text: 'The housing\'s bolts are rusted to the plate, and when the first one finally turns the cutting head comes round on its arm, fast, and stops a hand from your face. You step back. The lamp blinks, pauses, blinks.', again: 'The head a hand from your face.', options: [leave] },
    tamed: {
      text: [
        { if: IN(KES), text: 'Kes talks to it. Not aloud; she stands with her palm on its housing and her eyes shut and her lips moving, and her nose bleeds a little, and after a while the green lamp stops blinking and goes steady. The digger draws its legs under it out of the water, and turns its head to the face, and begins, very slowly, to cut. "There," Kes says, wiping her nose. "It thinks I\'m the Concern. Obviously, I\'m not going to tell it otherwise."' },
        { text: 'You go in, and find it waiting, and tell it in the only voice it knows that the work is resumed. The green lamp goes steady. The digger draws its legs under it out of the water and turns its head to the face and begins, very slowly, to cut, with a sound like a very large animal chewing.' },
      ],
      again: 'The digger, cutting.',
      options: [leave],
    },
    jack_no: { text: 'You go in, and the thing on the other side of the machine\'s silence is enormous and patient and does not know your voice, and you come out with your nose bleeding and the lamp still blinking.', again: 'The lamp, still blinking.', options: [leave] },
    after: {
      text: [
        { if: TAMED, text: 'The digger, cutting at the face in its own slow time, the tin coming off the rock in plates, Gaspard\'s crew loading behind it and giving it a wide berth.' },
        { if: { flag: 'tm_digger', eq: 'salvaged' }, text: 'The digger, dead against the stope face with its head on the floor and its housing open, a pair of the face crew\'s boots drying on its back.' },
        { text: 'Black water over the stope, still, with the digger\'s raised head just showing above it like a rock.' },
      ],
      again: 'The digger.',
      options: [leave],
    },
  },
};

export const d_tm_lv_pumps: DialogueDef = {
  id: 'd_tm_lv_pumps', owner: 'narrator', start: [{ if: { flag: 'tm_digger' }, node: 'after' }, { node: 'pumps' }],
  nodes: {
    pumps: {
      text: 'Gaspard\'s pumps at the sump\'s edge: two pre-war hand pumps rigged to the winding engine by a rod line through the rock, thudding, and the water going down a finger a day. Without them the water would be back over the stope in a week.',
      again: 'The pumps, thudding.',
      options: [
        { id: 'pumps.stop', text: '(Stop the pumps, and let the water back over the machine.)', if: { knows: 'tm_digger_seen' }, effects: DIGGER_DROWNED, next: 'stopped' },
        leave,
      ],
    },
    stopped: { text: 'You throw the rod off its crank and the thudding stops, and in the silence you can hear the water already, coming back, a trickle and then a sound like breathing. By morning it will be over the digger\'s head.', again: 'The water coming back.', options: [leave] },
    after: { text: [{ if: { flag: 'tm_digger', eq: 'drowned' }, text: 'The pumps, still, the rod off its crank, and the sump full again to the old line.' }, { text: 'The pumps, thudding, the sump going down a finger a day.' }], again: 'The pumps.', options: [leave] },
  },
};

const LV_SIGN = (id: string, text: string, again: string, effects: Effect[] = []): DialogueDef => ({ id, owner: 'narrator', start: [{ node: 'look' }], nodes: { look: { text, again, effects, options: [leave] } } });
export const d_tm_lv_plate = LV_SIGN('d_tm_lv_plate', 'A steel plate bolted to the stope wall beside the machine, its letters stamped deep: UNIT 4-11 — CUTTING — WORK SUSPENDED — AWAIT INSTRUCTION. And a date in the old calendar, the last spring before the Burn. Nobody ever came back to instruct it.', 'AWAIT INSTRUCTION.', [{ learn: 'tm_digger_waits' }]);
export const d_tm_lv_pillars = LV_SIGN('d_tm_lv_pillars', 'The old level\'s pillars: fat, square, every one of them left a full stride wide by men who knew they would be working under them for years. Chalked on one, in a modern hand: NOT LIKE SIX. NOT EVER LIKE SIX.', 'The fat pillars. NOT LIKE SIX.');

export const d_tm_lv_cage: DialogueDef = {
  id: 'd_tm_lv_cage', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'The cage at the bottom of the shaft, its gate open, the bell pull, and daylight a very long way up.', again: 'The cage, and daylight a long way up.', options: [{ id: 'lv.up', text: '(Ring and ride up.)', effects: [{ time: 10 }, { event: 'goto', data: { location: 'tm_pit', spawn: 'cage' } }], exit: true, repeat: true }, leave] } },
};
export const d_tm_lv_mouth: DialogueDef = {
  id: 'd_tm_lv_mouth', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'The drive running west toward a grey smudge of daylight and the smell of snow.', again: 'Daylight, west.', options: [{ id: 'lv.out', text: '(Out to the camp.)', effects: [{ time: 15 }, { event: 'goto', data: { location: 'tm_pit', spawn: 'drift' } }], exit: true, repeat: true }, leave] } },
};
export const d_tm_lv_adit: DialogueDef = {
  id: 'd_tm_lv_adit', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'The adit: a slot of rock going up at a steep slant out of the drive\'s east end, old rails in its floor, a cold draught coming down it. Chalked on the last prop: UP — THE COL — LONG.', again: 'The adit, going up.', effects: [{ learn: 'tm_adit_known' }], options: [{ id: 'lv.adit', text: '(Climb it to the col.)', effects: [{ time: 70 }, { event: 'goto', data: { location: 'tm_pit', spawn: 'col' } }], exit: true, repeat: true }, leave] } },
};

export const PIT_DIALOGUES: DialogueDef[] = [
  d_tm_cage, d_tm_face_slate, d_tm_traps, d_tm_board, d_tm_card, d_tm_ragna, d_tm_desmond, d_tm_tova, d_tm_table, d_tm_gaspard, d_tm_sachiko, d_tm_set, d_tm_winding,
  d_tm_col, d_tm_col_hut, d_tm_switchback, d_tm_family, d_tm_clean, d_tm_chinwe, d_tm_ikenna, d_tm_bunk, d_tm_bucket, d_tm_drift, d_tm_digger, d_tm_lv_pumps,
  d_tm_lv_plate, d_tm_lv_pillars, d_tm_lv_cage, d_tm_lv_mouth, d_tm_lv_adit,
];
