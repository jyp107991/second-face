import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ALLY, ASH, COLUMN_HERE, GUILD_IN_PLAY, HALE_HERE, ILYA, IN, INSIDE, KES, LED_BY_LOWE, LED_BY_REYES, LINNET_COLUMN, LOWE,
  MOTHER_DARK, NINE, NINE_CONSCIENCE, NINE_KEEPER_CITY, NINE_KEEPER_PLAYER, NINE_KEEPER_SELF, ODILE, ORME, ORME_HERE, RESERVE_STAYED, REYES,
  STRUCK_CLAIMED, TAM_CAN_STAND, TAMSIN, TEAGUE_LEADS, WREN,
} from '../world/a3_conds';

/**
 * The door (B6j, Act 3 beat 20e). The column comes down the lane to Knock's apron and holds at the yellow line, and the city's
 * fourth order for Reserve 9 is settled there, with the designate in front of it. One tree, `d_a3_door`, owned by the column's
 * lead (Captain Lowe; Sergeant Reyes if he died before; the senior warden Kress if both did). It opens at the line: by the
 * map's trigger the first time the player steps onto the apron with the column on it, or by talking to the lead there. The
 * column comes down when the door is cycled from outside (B6h) or when the designate tells its captain at the camp
 * (`d_a3_lowe`, the nodes `LOWE_GO_NODES` below). Nothing here moves until the designate says something the order can hear:
 * "(Not yet.)" is always there and changes nothing.
 *
 * - **Sealed** (`a3_c9` = sealed; `a3_c9_how`): **lowe** (the captain stands the column down: Speech 60 with the plan's
 *   evidence, or no check when the Court's reading makes the designate's formal declining enough), **welded** (from inside
 *   with Bram and Teague, Mechanics 40; never on a hand pump, never against the ring's vote), **struck** (Pell's sixty charts
 *   UNFIT: the order lapses and the Ledger strikes Reserve 9 off its record, which means what the Court's Act 2 ruling makes it
 *   mean; with the guild at the stand and the unrecorded made property, Orme's book of claims is the trap), **fought** (the
 *   column broken on the apron, with Corin and the allies called to the slope: `a3_door_fight`, settled by the map's triggers).
 * - **Opened** (`a3_c9` = opened, `a3_c9_how` = ines, `a3_c9_by` = the sealed route): the ring voted to open the door once the
 *   column had gone, and the column has gone.
 * - **Relocated**: **order** (the designate's word: "Carry on, Captain"), **forced** (the order carried out over the door
 *   somebody stands in), **sold** (Orme's paper signed: the Weighhouse), **consent** (the ring voted to go with the column).
 *   Tamsin's red line: the word or the signature sends her into the door (`a3_tam_door`); she dies there (`a3_tamsin_dead`) only
 *   if the designate then tells the column to force it. With her in the door the captain orders the city's unit to take her
 *   out of it: Nine's break, by whose keeper it is (its own: declines; the player's: it refuses the only order it ever refuses
 *   and leaves; the city's: a conscience refuses and is struck off unless the designate stands with it; a deputy asks to be
 *   told to refuse). Wren leaves at once over a signature on people (`wren_left` = sold).
 * - After: MOTHER's first words since the lockdown (`a3_mother` = kept | knock, unless she is asleep or burned); a Tamsin broken
 *   in Act 2 is won back by a sealed or opened door; one who waits elsewhere hears of a relocation and does not come back.
 * The hatch and the door props on Knock's apron get their after-door entries here too (`A3X_*`, spread into knock.ts).
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (20e) and "As built" → B6j.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const KNOWS = (k: string): Cond => ({ knows: k });
const REMEMBERS = (npc: string, tag: string): Cond => ({ remembers: { npc, tag } });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
const MEM = (npc: string, tag: string, valence: number, strength = 90): Effect => ({ memory: { npc, tag, valence, strength } });

const INES = 'npc_c9_01', PELL = 'npc_c9_02', BRAM = 'npc_c9_04', MOTHER = 'npc_c9_05', TEAGUE = 'npc_c9_06';
const MAUD = 'npc_kn_maud';

// ---------------------------------------------------------------- the state at the door

const SETTLED: Cond = F('a3_c9');
const DOOR_OPEN: Cond = F('a3_door_cycled');
const RING_OPEN: Cond = F('a3_ring', 'open');
const RING_CITY: Cond = F('a3_ring', 'city');
const BURNED: Cond = F('a3_mother', 'burned');
const ASLEEP: Cond = F('a3_mother', 'asleep');
const MOTHER_UP: Cond = NOT(MOTHER_DARK);
const TAM_DOOR: Cond = F('a3_tam_door');
const TAM_TRAVELS: Cond = IN(TAMSIN);
/** She walked from the player's side into the door (read after the `leave`, so not IN(TAMSIN)). */
const TAM_WALKED: Cond = F('tam_left', 'door');
const TAM_ROMANCE: Cond = ANY(F('tam_romance', 'open'), F('tam_romance', 'together'));
const WREN_ROMANCE: Cond = F('romance_partner', WREN);
const UNFIT: Cond = F('a3_pell', 'unfit');
const PAPER: Cond = { item: 'k_a3_intake' };
const GUILD_HERE: Cond = ALL(F('a3_guild_in'), ORME_HERE);
/** Orme comes down to the apron with her folder once more, the paper not in the pack and never torn on her counter. */
const ORME_OFFERS: Cond = ALL(GUILD_HERE, NOT(PAPER), NOT(F('a3_guild_torn')));
const WORD = (v: 'order' | 'sold'): Cond => F('a3_door_word', v);
/** The weld: the player has been inside, the residents have not voted to come out or to go, and there is air to weld them into. */
const WELD_ROOM: Cond = ALL(INSIDE, NOT(RING_OPEN), NOT(RING_CITY));
const NINE_DUE: Cond = ALL(IN(NINE), NOT(F('a3_nine_asked')));
const HALE_WALKS: Cond = ALL(HALE_HERE, F('a3_guild_in'), NOT(F('a3_hale')));
const ALLIES_HERE: Cond = ANY(ALLY('shale'), ALLY('dogs'), ALLY('choir'), ALLY('wheel'));
const LINNET_STAYS: Cond = ALL(LINNET_COLUMN, F('a3_linnet_stay'));
/** What striking Reserve 9 makes of its people (B6i's STRUCK_AS, read here with the trap set aside once Orme is answered). */
const S_YIELDS: Cond = F('prec_unrecorded', 'yields');
const S_PROPERTY: Cond = F('prec_unrecorded', 'property');

type Part = { if?: Cond; t: string };
/** Text from parts that vary on their own (each axis ordered, its default last): every combination, first match wins. */
function mix(axes: Part[][], f: (...t: string[]) => string): { if?: Cond; text: string }[] {
  let combos: { conds: Cond[]; ts: string[] }[] = [{ conds: [], ts: [] }];
  for (const axis of axes) combos = combos.flatMap((c) => axis.map((p) => ({ conds: p.if ? [...c.conds, p.if] : c.conds, ts: [...c.ts, p.t] })));
  return combos.map((c) => (c.conds.length ? { if: c.conds.length === 1 ? c.conds[0] : ALL(...c.conds), text: f(...c.ts) } : { text: f(...c.ts) }));
}
/** The column's lead speaking: the captain, his sergeant, or the senior warden. */
const LEAD = (lowe: string, reyes: string, kress: string): { if?: Cond; text: string }[] => [{ if: LED_BY_LOWE, text: lowe }, { if: LED_BY_REYES, text: reyes }, { text: kress }];
const LEAD_P = (lowe: string, reyes: string, kress: string): Part[] => [{ if: LED_BY_LOWE, t: lowe }, { if: LED_BY_REYES, t: reyes }, { t: kress }];

// ---------------------------------------------------------------- outcomes

const NEWS = (tag: string, text: string, valence: number): Effect => ({ news: { tag, text, valence, size: 9, at: 'cistern9' } });
const DECIDE = (text: string): Effect => ({ decision: { id: 'a3_c9', text } });
type Route = 'lowe' | 'welded' | 'struck' | 'fought';
const SEAL_TEXT: Record<Route, string> = {
  lowe: 'At the Cistern\'s door the column\'s captain stood it down on my word, wrote ATTENDED — DECLINED across the foot of the city\'s fourth order, and took his wardens home. The door stayed shut.',
  welded: 'I welded the Cistern\'s great door shut from inside with Bram Coyle and Rosalind Teague, and the column would not cut into sixty people\'s air to open it. The door stays shut.',
  struck: 'Doc Pell\'s sixty charts said UNFIT FOR RELOCATION, and the city\'s fourth order lapsed at the door. The Ledger struck Reserve 9 off its record. The door stayed shut.',
  fought: 'I broke the city\'s column on Knock\'s apron. The door stayed shut.',
};
const OPEN_TEXT: Record<Route, string> = {
  lowe: 'The column\'s captain stood it down at the Cistern\'s door, and when he had gone the Cistern\'s people opened their door themselves and walked out of it, as their ring had voted.',
  welded: '',
  struck: 'Doc Pell\'s sixty charts said UNFIT, the city\'s order lapsed, and the Cistern\'s people opened their door themselves and walked out of it, struck off the city\'s record, as their ring had voted.',
  fought: 'I broke the city\'s column on Knock\'s apron, and when it had gone the Cistern\'s people opened their own door and walked out of it, as their ring had voted.',
};
const LOWE_AS = (v: string): Effect => ({ set: 'a3_lowe', value: v });
/** The door sealed by a route: the order not carried out, the residents behind their door. */
const SEALED = (route: Route): Effect[] => [
  { set: 'a3_c9', value: 'sealed' }, { set: 'a3_c9_how', value: route }, { xp: 300 },
  NEWS('a3_c9_sealed', 'the city\'s column left Knock without the Cistern\'s people; the great door is still shut', 6),
  DECIDE(SEAL_TEXT[route]), A(TAMSIN, 10), A(KES, 3), A(WREN, 3), A(ILYA, 3), A(ODILE, 2),
];
/** The column gone, and the ring's vote to open the door kept: the residents walk out by their own choice. */
const OPENED = (route: Route): Effect[] => [
  { set: 'a3_c9', value: 'opened' }, { set: 'a3_c9_how', value: 'ines' }, { set: 'a3_c9_by', value: route }, { xp: 400 },
  NEWS('a3_c9_opened', 'the Cistern\'s people opened their own door at Knock and walked out into the sky, the first in ninety years', 10),
  DECIDE(OPEN_TEXT[route]), A(TAMSIN, 15), A(ASH, 15), A(WREN, 5), A(KES, 5), A(ILYA, 5), A(ODILE, 3), A(NINE, 3),
];
type Reloc = 'order' | 'forced' | 'sold' | 'consent';
const RELOC_TEXT: Record<Reloc, string> = {
  order: 'At the Cistern\'s door I gave the designate\'s word, "carry on", and the column carried Reserve 9 to the city as Precinct supply: the first act of the chair.',
  forced: 'At the Cistern\'s door I gave the designate\'s word, and when Tamsin stood in the door I told the column to force it. She died in the door. The column carried Reserve 9 to the city.',
  sold: 'At the Cistern\'s door I signed the guild\'s paper as the first act of the chair, and the Cistern\'s sixty went up the guild\'s road to the Weighhouse as Concern intake, at forty Tolls a head.',
  consent: 'The Cistern\'s people voted to go with the column, and walked out to the city\'s car on their own feet, with their names. I attended, and let them.',
};
const RELOCATED = (how: Reloc): Effect[] => [
  { set: 'a3_c9', value: 'relocated' }, { set: 'a3_c9_how', value: how }, LOWE_AS('carried'), { xp: 150 },
  NEWS(`a3_c9_${how}`, how === 'consent' ? 'the Cistern\'s people walked out of their door at Knock and went to the city with the column, by their own vote'
    : how === 'sold' ? 'the designate signed the Cistern\'s people over to the guild at Knock\'s door, as intake for the Concern'
      : 'the city\'s column carried the Cistern\'s people out of their door at Knock, on the designate\'s word', how === 'consent' ? -2 : how === 'sold' ? -25 : -15),
  DECIDE(RELOC_TEXT[how]), { set: 'a3_door_word', value: false },
];

/** The designate's word carried out: the order's bundle (applied by whatever leads into the scene of it). */
const ORDER_FX: Effect[] = [...RELOCATED('order'), MEM(MAUD, 'a3_carried', -40, 100), MEM(INES, 'a3_carried', -40, 100), A(ASH, -15), A(KES, -10), A(WREN, -10), A(ILYA, -5), A(ODILE, -5)];
/** The guild's paper signed and carried out. */
const SOLD_FX: Effect[] = [
  ...RELOCATED('sold'), { take: 'k_a3_intake' }, { set: 'a3_guild', value: 'signed' }, { rep: { faction: 'tollmen', respect: 15 } },
  MEM(MAUD, 'a3_sold', -80, 100), MEM(INES, 'a3_sold', -80, 100), MEM(ORME, 'a3_signed', 10),
  A(ASH, -25), A(KES, -25), A(ILYA, -15), A(ODILE, -10), A(NINE, -10),
];
/** Forced over the woman in the door: she dies there. */
const FORCED_FX: Effect[] = [{ set: 'a3_tamsin_dead' }, { set: 'a3_door_forced' }, { set: 'tam_romance', value: 'ended' }, A(ASH, -30), A(KES, -20), A(WREN, -20), A(ILYA, -20), A(ODILE, -15), A(NINE, -20)];

// ---------------------------------------------------------------- the checks

type Mod = { if: Cond; dc: number; why: string };
/** The captain stood down (20e T): the plan's evidence, plus the third word he asked for and the slope's company. */
const DOWN_MODS: Mod[] = [
  { if: RESERVE_STAYED, dc: -30, why: 'the Court of Accounts has stayed the order' },
  { if: F('ca_reserve', 'privilege'), dc: -15, why: 'the Court stayed it on your title, as a courtesy' },
  { if: { item: 'k_ar_refusals' }, dc: -10, why: 'MOTHER\'s three refusals, on the city\'s own record' },
  { if: F('tam_why'), dc: -5, why: 'the census: the city has always had their names from her' },
  { if: ALL(IN(NINE), NINE_CONSCIENCE), dc: -10, why: 'Nine reads the order aloud and logs it as an error' },
  { if: ALL(LED_BY_LOWE, { trust: { npc: LOWE, gte: 25 } }), dc: -10, why: 'he trusts you' },
  { if: ALL(LED_BY_REYES, { trust: { npc: REYES, gte: 15 } }), dc: -10, why: 'she trusts you' },
  { if: F('jonah_lived'), dc: -5, why: 'the boy on Shale\'s tower lived; it is in your file' },
  { if: { item: 'k_ar_warrant' }, dc: -10, why: 'the designate\'s warrant' },
  { if: ALL(LED_BY_LOWE, REMEMBERS(LOWE, 'a3_third_word')), dc: -5, why: 'you gave him his third word: home' },
  { if: ALLIES_HERE, dc: -5, why: 'Knock is not alone on its slope' },
  { if: F('ca_reserve', 'upheld'), dc: 15, why: 'the Court has endorsed the order' },
  { if: F('a3_route_home', 'column'), dc: 10, why: 'you rode home in the city\'s car' },
  { if: REMEMBERS(LOWE, 'a3_door_silent'), dc: 5, why: 'you turned your back on him at the line' },
];
const WELD_MODS: Mod[] = [
  { if: KNOWS('a3_teague_weld'), dc: -10, why: 'Teague told you how Bram would lay the seam' },
  { if: { origin: 'pump_hand' }, dc: -5, why: 'you have welded a windpump\'s collar' },
  { if: ASLEEP, dc: 5, why: 'MOTHER asleep: Bram runs the welder off the second coupling' },
];
const CLAIM_MODS: Mod[] = [
  { if: ANY(F('a3_hale', 'answered'), F('a3_hale', 'gone'), F('a3_hale', 'dead')), dc: -15, why: 'the guild has no possession man at Knock' },
  { if: REMEMBERS(ORME, 'a3_told_weighhouse'), dc: -10, why: 'she has been told what the Weighhouse is, and heard it' },
  { if: ANY(REMEMBERS(ORME, 'a3_paper_refused'), REMEMBERS(ORME, 'a3_paper_torn')), dc: -5, why: 'you have refused the guild once already' },
  { if: { standing: { settlement: 'cistern9', gte: 20 } }, dc: -10, why: 'Knock buys its water at her stand' },
  { if: PAPER, dc: 10, why: 'the guild\'s paper is in your pack: to her you are a buyer' },
];
const SPARE_MODS: Mod[] = [
  { if: ALL(LED_BY_LOWE, { trust: { npc: LOWE, gte: 25 } }), dc: -10, why: 'he trusts you' },
  { if: KNOWS('a3_lowe_names'), dc: -5, why: 'he learned sixty names so as to know what he carried' },
];

// ---------------------------------------------------------------- what follows every settling: who goes, who comes back, MOTHER

/** A Tamsin who is on the player's side but not at the door hears of the reserve relocated (her red line) and does not come back. */
const TAM_AWAY: Cond = ALL(F('tam_joined'), NOT(TAM_TRAVELS), NOT(F('tam_left')), NOT(F('tam_home')), NOT(F('a3_tamsin_dead')));
const STEPS: { if: Cond; node: string }[] = [
  { if: ALL(IN(WREN), F('a3_c9_how', 'sold')), node: 'wren_sold' },
  { if: ALL(F('tam_broken'), ANY(F('a3_c9', 'sealed'), F('a3_c9', 'opened'))), node: 'tam_back' },
  { if: ALL(TAM_AWAY, F('a3_c9', 'relocated'), NOT(F('a3_c9_how', 'consent'))), node: 'tam_hears' },
  { if: ALL(NOT(F('a3_mother')), F('a3_c9', 'sealed')), node: 'mother_kept' },
  { if: ALL(NOT(F('a3_mother')), F('a3_c9', 'opened')), node: 'mother_knock' },
  { if: ALL(NOT(F('a3_mother')), F('a3_c9', 'relocated')), node: 'mother_empty' },
];
/** "(Go on.)" to the next step whose condition holds (each step's own effects make its condition false), else off the apron. */
const ONWARD: OptionDef[] = [
  ...STEPS.map((s, i): OptionDef => ({ text: '(Go on.)', if: ALL(s.if, ...STEPS.slice(0, i).map((p) => NOT(p.if))), next: s.node })),
  { text: '(Leave the apron.)', if: ALL(...STEPS.map((p) => NOT(p.if))), exit: true },
];
/** Back to the line, unsettled. */
const TO_LINE: OptionDef = { text: '(Go on.)', next: 'line' };
/** Settle a sealed route: the residents come out if the ring voted to open the door once the column had gone; else it stays shut. */
const SETTLE = (route: Route, extra: Effect[] = [], tag: string = route): OptionDef[] => [
  { id: `door.${tag}.opened`, text: '(Go on.)', if: RING_OPEN, effects: [...OPENED(route), ...extra], next: 'opened' },
  { id: `door.${tag}.sealed`, text: '(Go on.)', if: NOT(RING_OPEN), effects: [...SEALED(route), ...extra], next: 'sealed' },
];

// ---------------------------------------------------------------- text by axis

const LINE_DOOR: Part[] = [
  { if: TAM_DOOR, t: 'Tamsin sits in the door with her back against the steel and her knees drawn up, and does not look at you.' },
  { if: DOOR_OPEN, t: 'Behind you the great door stands open on its manual cycle, swung out over the white arc it scraped in the concrete, and the warm breath of the Cistern comes out of the dark. Faces at the edge of the light.' },
  { t: 'Behind you the door, the colour of the rock, shut, and the hatch beside it, shut, and Maud on her stool between them with her hands in her lap.' },
];
const LINE_LEAD: Part[] = LEAD_P(
  'At the top of the apron, at the yellow line, the column waits in its grey: four wardens with their rifles slung, and Captain Lowe a pace in front of them with his cap under his arm and the order folded in his breast pocket.',
  'At the top of the apron, at the yellow line, the column waits in its grey: four wardens with their rifles slung, and Sergeant Reyes a pace in front of them in a captain\'s coat that still does not fit her, Lowe\'s cap under her arm.',
  'At the top of the apron, at the yellow line, the column waits in its grey: three wardens with their rifles slung, and Warden Kress a pace in front of them, who has never in thirty years been the one in front.',
);
const LINE_LINNET: Part[] = [{ if: LINNET_COLUMN, t: 'Cadet Ferrow stands at the end of the line with her clipboard and does not look at Maud, and Maud does not look at her.' }, { t: '' }];

const ARRIVE_SLOPE: Part[] = [
  { if: ALL(ALLY('shale'), ALLY('dogs')), t: 'Above the lane on the west bank, two of Shale\'s militia sit on their heels with rifles across their knees, where the wardens can count them; on the east slope the Dogs sit their bikes and look ugly, which they told you is what they are best at. Neither lot looks at the other.' },
  { if: ALLY('shale'), t: 'Above the lane on the west bank, two of Shale\'s militia sit on their heels with rifles across their knees, where the wardens can count them, which is what Ada sent them for.' },
  { if: ALLY('dogs'), t: 'On the east slope the Dogs sit their bikes in a row and look ugly, which they told you is what they are best at. The wardens have counted them twice.' },
  { if: ALL(ALLY('choir'), ALLY('wheel')), t: 'The Choir\'s people stand along the lane in their undyed cloth with their faces to the sky, and somebody among them is humming; out on the flat beyond the stand, the Wheel\'s tracks are drawn up in a half-circle, watching, the way the Wheel watches everything.' },
  { if: ALLY('choir'), t: 'The Choir\'s people stand along the lane in their undyed cloth with their faces to the sky, and somebody among them is humming. The wardens do not know what to do about the humming.' },
  { if: ALLY('wheel'), t: 'Out on the flat beyond the stand the Wheel\'s tracks are drawn up in a half-circle, engines ticking, watching, the way the Wheel watches everything.' },
  { t: 'Nobody has come from anywhere else. It is Knock, and the column, and the door.' },
];
const ARRIVE_CORIN: Part[] = [
  { if: F('a3_corin', 'down'), t: 'Corin is in his workshop door with no rifle, his arms folded, as he said he would be.' },
  { t: 'Up on the rise by the windpump Corin sits with the rifle across his knees, where everybody can see it, which is the point of it.' },
];
const ARRIVE_GUILD: Part[] = [
  { if: ALL(GUILD_HERE, F('a3_hounds_in')), t: 'At the head of the lane, on the guild\'s side of it, Factor Orme stands with her leather folder held against her chest, and behind her the two handlers squat beside the grey things on their short leads, which have turned their lenses toward the door.' },
  { if: ALL(GUILD_HERE, NOT(F('a3_guild_torn'))), t: 'At the head of the lane, on the guild\'s side of it, Factor Orme stands with her leather folder held against her chest, the way a woman holds a hymn book she does not mean to open.' },
  { t: '' },
];

// ---------------------------------------------------------------- the nodes

const NODES: Record<string, NodeDef> = {
  // ------------------------------------------------ outside the scene
  camp: {
    speaker: 'narrator',
    text: 'The column is up the lane at its camp. The captain is at his table with the order under its stone, waiting to be told.',
    again: 'The column is at its camp.',
    options: [{ text: '(Leave it.)', exit: true }],
  },
  settled: {
    speaker: 'narrator',
    text: [
      { if: F('a3_c9', 'relocated'), text: 'The yellow line at the top of the apron, and nobody at it. Tyre marks down the lane, and on the concrete, here and there, a dropped thing: a button, a hairgrip, a child\'s sock, which nobody has picked up because nobody can bear to.' },
      { text: 'The yellow line at the top of the apron, and nobody at it. The column has gone up the toll road, and Knock\'s children have already worked out that you can stand on the line, and do, one at a time, as if it were a dare.' },
    ],
    again: 'The yellow line, and nobody at it.',
    options: [{ text: '(Leave it.)', exit: true }],
  },

  // ------------------------------------------------ the first time at the line
  arrive: {
    speaker: 'narrator',
    text: mix([LINE_LEAD, LINE_DOOR], (lead, door) =>
      `${lead} ${door} / Knock has come out to watch. Not to the apron: nobody in Knock has ever stood on the apron except on hatch days, and this is not one. They stand in their doorways and at the turn of the lane and on the tank\'s rim, the whole hamlet, forty people and a goat, and they are very quiet.`),
    again: 'The line, the column, the door.',
    effects: [{ learn: 'a3_door_line' }],
    options: [{ text: '(Look up the slope.)', next: 'arrive_slope' }],
  },
  arrive_slope: {
    speaker: 'narrator',
    text: mix([ARRIVE_CORIN, ARRIVE_SLOPE, ARRIVE_GUILD], (corin, slope, guild) => `${corin} ${slope}${guild ? ' ' + guild : ''}`),
    again: 'The slope, and who is on it.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin looks from the wardens to the door and back, and puts her hands in her pockets so nobody can see what they are doing.' },
      { companion: WREN, text: '"Rifles in a row and nobody holding one," Wren says. "I\'ve seen worse odds and liked them less."' },
      { companion: ILYA, text: 'Ilya counts the wardens, then the rifles on the slope, then the doorways, his lips moving. He does not say the totals.' },
      { companion: ODILE, text: 'Odile looks at the order folded in the grey breast pocket at the line the way she looks at any paper, for where it was signed and by whom. "It hasn\'t got a signature yet," she says. "That\'s you."' },
      { companion: ASH, text: 'Ash stands with his grey scarf in his hand and looks past the column, up, at the strip of sky over the lane, as if checking it is still there.' },
      { companion: NINE, text: '"I count the city\'s at the line and sixty of the city\'s behind the door," Nine says. "And one designate. The record has never had them all in one place before."' },
      { companion: KES, text: 'Kes keeps to your shoulder and watches the grey people the way a cat watches a kitchen.' },
    ],
    options: [
      { text: '(Go on.)', if: ALL(IN(KES), F('kes_link', 'kept'), ANY(F('a3_guild_in'), GUILD_IN_PLAY), NOT(F('a3_kes_numbed'))), next: 'kes' },
      { text: '(Go on.)', if: NOT(ALL(IN(KES), F('kes_link', 'kept'), ANY(F('a3_guild_in'), GUILD_IN_PLAY), NOT(F('a3_kes_numbed')))), next: 'line' },
    ],
  },
  kes: {
    speaker: KES,
    text: 'Kes stops in the middle of a word. Her hand goes to the back of her neck, and stays there, and her eyes go flat and far away, the way a window goes when the lamp behind it is turned down. Three breaths. Four. Up the lane, by the guild\'s horses, nobody is looking at her, and nobody needs to. / Then she is back, blinking, and takes the hand down and looks at it. "Somebody wanted to see the door," she says. Her voice is perfectly level. "Through me. They\'ve seen it." She wipes her palm on her coat. "I\'m all right. Don\'t look at me like that. It doesn\'t hurt. That\'s the bit I mind."',
    again: 'Kes, with her hand nowhere near her neck, on purpose.',
    effects: [{ set: 'a3_kes_numbed' }, MEM(KES, 'a3_numbed_at_door', -10, 80)],
    options: [TO_LINE],
  },

  // ------------------------------------------------ the line: what the designate says to the order
  line: {
    speaker: 'narrator',
    text: mix([LINE_LEAD, LINE_DOOR, LINE_LINNET], (lead, door, linnet) => `${lead} ${door}${linnet ? ' ' + linnet : ''}`),
    again: LEAD(
      '"Designate," Lowe says, at the yellow line, and waits, as he waits for everything.',
      '"Designate," Reyes says, at the yellow line, and waits.',
      '"Designate," Kress says, at the yellow line, and waits for somebody to tell him what happens next.',
    ),
    options: [
      { id: 'door.where', text: 'Where would they go, Captain?', once: true, next: 'where' },
      { id: 'door.no', text: 'And if I say no?', once: true, next: 'say_no' },
      {
        id: 'door.down', text: 'Stand them down, Captain. Take the column home.', if: NOT(RING_CITY), once: true,
        check: { skill: 'speech', dc: 60, mods: DOWN_MODS }, effects: [LOWE_AS('stood_down')], next: 'down', fail: 'down_no',
      },
      { id: 'door.decline', text: '(Attend the door, and formally decline to attend the order.)', if: ALL(F('prec_reserve', 'attendance'), NOT(RING_CITY)), effects: [LOWE_AS('stood_down'), { learn: 'a3_door_declined' }], next: 'decline' },
      { id: 'door.struck', text: 'Doc Pell has something for you to read.', if: UNFIT, next: 'struck' },
      { id: 'door.weld', text: '(Go in, and weld the door shut with Bram and Teague.)', if: ALL(WELD_ROOM, NOT(BURNED)), once: true, check: { skill: 'mechanics', dc: 40, mods: WELD_MODS }, next: 'weld', fail: 'weld_no' },
      { id: 'door.weld.burned', text: '(Go in, and weld the door shut with Bram and Teague.)', if: ALL(WELD_ROOM, BURNED), once: true, next: 'weld_burned' },
      { id: 'door.orme', text: '(Orme has come down to the edge of the apron with her folder.)', if: ALL(ORME_OFFERS, NOT(RING_CITY)), once: true, next: 'orme' },
      { id: 'door.sign', text: '(Take the guild\'s paper out of your pack.)', if: ALL(PAPER, F('a3_guild_in'), NOT(RING_CITY)), next: 'sold_warn' },
      { id: 'door.order', text: 'Carry on, Captain.', if: NOT(RING_CITY), next: 'order_warn' },
      { id: 'door.consent', text: 'They\'ve voted to come with you. On their own feet.', if: RING_CITY, next: 'consent' },
      { id: 'door.fight', text: '(Break the column.)', if: NOT(RING_CITY), next: 'fight_warn' },
      { id: 'door.later', text: '(Not yet.)', exit: true, repeat: true },
    ],
  },
  where: {
    speaker: 'narrator',
    text: LEAD(
      '"Precinct supply." Lowe says it plainly, the way he says everything. "The Hospice block on the west side of the Wall, sixty beds made up and waiting. They will be examined, and graded, and fed, and put on the work rolls by grade. The ones who are sick will be seen by the city\'s clinics, which are good. The ones who are old will be kept, because the city keeps its supply." He looks past you at the door. "Most of them will be alive in ten years. That is the most I have ever been able to say about a relocation, designate, and I have said it thirty-one times. I have never once been asked whether they would want to be."',
      '"Precinct supply. The Hospice block, sixty beds." Reyes says it flat. "Fed, graded, put on the rolls. The clinics are good. He used to say most of them would be alive in ten years, and that it was the most he could ever say about one." She looks at the door. "Nobody asks what they want. It isn\'t on the sheet."',
      '"The Hospice block," Kress says. "Sixty beds. They\'ll be fed." He thinks about it. "The captain used to say more than that. I don\'t know what he\'d say."',
    ),
    again: '"Precinct supply," at the yellow line.',
    interject: [
      { companion: NINE, text: '"Schedule 4," Nine says. "Supply is graded fit for work, fit for the clinics\' study, or fit for neither. The schedule does not say what neither is for. I have looked."' },
      { companion: KES, text: '"Graded," Kes says, very quietly. "They graded us in the Skirts. You\'d be surprised how quick it is."' },
    ],
    options: [TO_LINE],
  },
  say_no: {
    speaker: 'narrator',
    text: LEAD(
      '"Then say it in a way the order can hear." He touches the breast pocket where it lies. "It executes on your attendance. It does not provide for your opinion. Bring me a reason it can hear: the Court, the record, a line I have missed. Or tell me to carry on, and I will. Or stand between us and the door with something heavier than a word." He looks at the rifles on his own wardens\' shoulders, and at Maud on her stool. "I would rather you did not do the last. So would they."',
      '"Then say it so the order hears it." She touches her breast pocket. "The Court, the record, a line we missed. Or tell me to carry on. Or do something heavier, and I\'ll answer it." She looks at Maud. "Don\'t do the last."',
      '"Then you\'ll have to say it some way that counts," Kress says. "I don\'t know what counts. The captain would have." He swallows. "Please don\'t make it the rifles."',
    ),
    again: '"Say it in a way the order can hear."',
    options: [TO_LINE],
  },

  // ---- sealed / lowe: the captain stands the column down
  down: {
    speaker: 'narrator',
    text: mix([
      [
        { if: RESERVE_STAYED, t: '"The Court of Accounts has stayed it." It is said slowly at the yellow line, as if the column had been waiting a fortnight for somebody to say it. "Objections lie to the Court, it says at the foot. The Court heard one, and found for it. A stayed order is paper, designate. The column does not carry paper."' },
        { if: F('ca_reserve', 'privilege'), t: '"The Court stayed it on your title. A courtesy, the bench called it." At the yellow line, something very near a smile. "Nobody in this column has ever been asked to carry out an order the Court was courteous about. We will not start at Knock."' },
        { if: { item: 'k_ar_refusals' }, t: 'Your copy of MOTHER\'s three replies is read standing up at the yellow line, held in both hands, and then read again. "Entered NON-COMPLIANT. And left on file. Three times." The copy comes back to you. "Nobody shows the column the replies. Thirty-one orders, and never once what the other side said."' },
        { if: { item: 'k_ar_warrant' }, t: 'The designate\'s warrant is read through at the yellow line, and folded, and given back. "The chair may stay its own first act. That clause has been read a hundred times in the Precinct by people who never thought they would meet the chair."' },
        { if: ALL(IN(NINE), NINE_CONSCIENCE), t: 'Nine reads the order aloud, every line of it, to the line and the slope and the door, and at the end it says, "Logged as an error, at Knock, on this date," and at the yellow line nobody says anything for a long moment, and then everybody looks at the door.' },
        { t: 'The order is read once more at the yellow line, a long time, and you watch the reading look for the line in it that will let the column do what it wants to do, and find it.' },
      ],
      LEAD_P(
        'He takes the order out of his breast pocket and unfolds it on his knee, and writes across the foot of it in a captain\'s hand, slowly, so that everybody on the slope can watch him do it: ATTENDED. DECLINED. COLUMN WITHDRAWN. I. LOWE, CAPT. Then he puts his cap on. "Column," he says, not loudly. "We are going home."',
        'She takes the order out and writes across the foot of it, slowly, so the slope can see: ATTENDED. DECLINED. COLUMN WITHDRAWN. P. REYES, SGT, FOR THE CAPTAIN. Then she puts Lowe\'s cap on, which does not fit her either. "Column. Home."',
        'Kress takes the order out of his pocket and writes on the foot of it, in a hand that has not written much: ATTENDED. DECLINED. WITHDRAWN. G. KRESS. He looks at it, and adds: SENIOR WARDEN. "Right," he says to the others. "Home, then."',
      ),
      [
        { if: ALL(LED_BY_LOWE, REMEMBERS(LOWE, 'a3_third_word')), t: 'At the turn of the lane he stops and looks back once, at the door and the hamlet in its doorways. "Home," he says to you, across the whole length of the apron. "Between lawful and grieve. I have found where it goes."' },
        { t: 'At the turn of the lane the column stops, and whoever leads it now looks back once, at the door and the hamlet in its doorways, and then the grey goes up the toll road, past the stand, and is gone.' },
      ],
    ], (why, act, after) => `${why} / ${act} / ${after}`),
    again: 'The column going up the toll road, and gone.',
    effects: [{ rep: { faction: 'wardens', respect: 5 } }, TRUST(LOWE, 10), MEM(LOWE, 'a3_stood_down', 20), A(NINE, 5), A(ASH, 5)],
    interject: [
      { companion: TAMSIN, text: 'Tamsin sits down on the concrete, all at once, as if somebody had cut a string.' },
      { companion: NINE, text: '"A lawful withdrawal," Nine says, "written at the foot, in ink, in public." It sounds, for Nine, almost happy. "I will log it in both ledgers."' },
      { companion: ILYA, text: 'Ilya lets out a breath he seems to have been holding since Shale.' },
    ],
    options: SETTLE('lowe'),
  },
  decline: {
    speaker: 'narrator',
    text: LEAD(
      'You say it in the open, at the yellow line, so that the slope can hear: the designate attends the door, and declines to attend the order. / Lowe takes the order out of his breast pocket and reads its last line again, and then he takes another paper out, the Court\'s ruling on attendance, which he has been carrying beside it for a week. "The order executes on the designate\'s attendance," he says. "The Court has read attendance to mean the designate\'s, and the designate declines." He folds both papers together. "Then it cannot execute. It is lawful, and it cannot execute, and the Ledger will hear it as a contest." He writes across the foot, slowly: ATTENDED. DECLINED. COLUMN WITHDRAWN. I. LOWE, CAPT. He puts his cap on. "Column. We are going home."',
      'You say it in the open: the designate attends the door, and declines to attend the order. / Reyes takes out the order and the Court\'s ruling beside it. "Executes on attendance. Attendance is yours, the Court says, and you decline." She writes across the foot: ATTENDED. DECLINED. COLUMN WITHDRAWN. P. REYES, SGT. "Column. Home."',
      'You say it in the open: the designate attends the door, and declines to attend the order. / Kress looks at the order, and at the Court\'s ruling the captain left in his kit, and reads both with his lips moving. "Then it can\'t," he says. "Right." He writes WITHDRAWN on the foot. "Home."',
    ),
    again: 'The column going up the toll road, and gone.',
    effects: [{ rep: { faction: 'wardens', respect: 5 } }, MEM(LOWE, 'a3_declined', 15), A(NINE, 8)],
    interject: [{ companion: NINE, text: '"A precedent, executed," Nine says. "It has never happened before. I find I would like to have been present for it, and I was."' }],
    options: SETTLE('lowe', [], 'decline'),
  },
  down_no: {
    speaker: 'narrator',
    text: [
      { if: ALL(LED_BY_LOWE, F('ca_reserve', 'upheld')), text: '"I cannot." He means it, and he does not like meaning it. "The Court read this order and endorsed it. I cannot unread the Court, designate, and I cannot stand a column down on my own say; I have no say. That is what a captain is." He puts the order back in his pocket. "Tell me what you want done, and I will do it, whichever it is."' },
      { if: LED_BY_LOWE, text: '"Not on that." He means it, and he does not like meaning it. "You have asked me to stand a lawful column down on my own say. I have no say, designate. I have an order, and a clause that waits for you, and nothing in between." He puts the order back in his breast pocket. "Bring me a reason the order can hear, and I will hear it. Or tell me what you want done, and I will do it, whichever it is."' },
      { if: LED_BY_REYES, text: '"No." Reyes doesn\'t like saying it. "Not on my own say. I haven\'t got one; he never had one either. Bring me something the order hears, or tell me what you want and I\'ll do it."' },
      { text: '"I can\'t," Kress says. "I\'m not the captain. I can\'t stand anybody down on what you\'ve said. Bring me something on paper, designate. Something I can show them at the gate."' },
    ],
    again: '"Not on that," at the yellow line.',
    options: [TO_LINE],
  },

  // ---- sealed / struck: Pell's charts
  struck: {
    speaker: 'narrator',
    text: mix([
      [
        { if: DOOR_OPEN, t: 'Pell comes out of the open door with a grey box under his arm, blinking in a light he has never stood in, and walks the length of the apron to the yellow line as if it were a ward round.' },
        { if: MOTHER_UP, t: 'The hatch tray runs out on its rails with a grey box in it, and Pell\'s voice comes up the Grille: "Sixty charts, Captain. Signed and dated. I\'d bring them myself but I have never been outside."' },
        { t: 'Bram comes up out of the grate at the west end of the apron with a grey box under his arm and gives it to you without a word, and goes back down.' },
      ],
      [
        { if: S_YIELDS, t: '"Then it is not on the order. The order is for supply, and supply is fit." LAPSED — UNFIT goes across the foot of it, in ink. "The Ledger will strike Reserve 9 off the record by the next post; it has been done twice before, to other reserves." A look at the door. "The Court has ruled the unrecorded are living people. They will be written down as people outside any reserve, and the Court will hear them if they ask. Free." The word is tried out carefully, like a language read but never spoken.' },
        { if: ALL(S_PROPERTY, F('a3_claim')), t: '"Then it is not on the order." LAPSED — UNFIT goes across the foot of it, in ink. "The Ledger will strike Reserve 9 off the record by the next post. The register reads the unrecorded as abandoned property." A look up the lane, at Orme\'s back going up it. "Nobody writing. Today."' },
        { if: ALL(S_PROPERTY, NOT(STRUCK_CLAIMED)), t: '"Then it is not on the order. The order is for supply, and supply is fit." LAPSED — UNFIT goes across the foot of it, in ink. "The Ledger will strike Reserve 9 off the record by the next post." The rest is not said until you ask for it with a look. "The register reads the unrecorded as abandoned property. Whoever writes them down first." A look at the guild\'s empty ground. "Nobody here to write. Today."' },
        { if: STRUCK_CLAIMED, t: '"Then it is not on the order." LAPSED — UNFIT goes across the foot of it, and the pen stops there, still on the paper, because somebody is coming down the lane.' },
        { t: '"Then it is not on the order. The order is for supply, and supply is fit." LAPSED — UNFIT goes across the foot of it, in ink. "The Ledger will strike Reserve 9 off the record by the next post. Nobody\'s, then. No reserve, no court." A look at the door. "Free, the way the flats are free."' },
      ],
    ], (how, read) => `${how} / At the yellow line the box is opened on the concrete, and the first chart read standing up, and the second, and then the rest crouching, turned over one by one with a thumb, sixty of them, every one with the same box ticked in the same hand: FIT FOR RELOCATION — NO. "Schedule 4. A reserve is assessed fit, or it is not carried." / ${read}`),
    again: 'Sixty charts in a grey box at the yellow line.',
    interject: [
      { companion: NINE, text: '"Sixty untrue entries on the city\'s forms," Nine says. "I will not log them as errors. I will log them as a doctor\'s." It does not say which is worse.' },
      { companion: ODILE, text: '"Unfit," Odile says, with something like reverence. "Oh, that\'s lovely. You can\'t foreclose on a thing nobody will buy."' },
    ],
    options: [
      { text: '(Go on.)', if: ALL(STRUCK_CLAIMED, NOT(F('a3_claim'))), next: 'claim' },
      ...SETTLE('struck', [LOWE_AS('withdrawn'), A(NINE, -5), A(ODILE, 5)]).map((o) => ({ ...o, text: '(Let the charts stand.)', if: ALL(NOT(ALL(STRUCK_CLAIMED, NOT(F('a3_claim')))), o.if!) })),
      { text: '(Take the charts back.) Not like this.', if: NOT(ALL(STRUCK_CLAIMED, NOT(F('a3_claim')))), next: 'struck_back' },
    ],
  },
  struck_back: {
    speaker: 'narrator',
    text: 'You close the box and give it back. At the yellow line it is watched going without a word, and the pen put away, and the order folded back into a breast pocket, not lapsed. "When you like, designate."',
    again: 'The charts gone back in.',
    options: [TO_LINE],
  },
  claim: {
    speaker: ORME,
    text: 'Factor Orme comes down the lane with her ledger open on her forearm and stops on the guild\'s side of the yellow line, very correct. "Struck off," she says. "Unrecorded, on a guild road, with no reserve and no caretaker\'s claim the city will read." She takes the cap off her pen. "The register says abandoned property goes to whoever writes it down first, love. I\'m writing. Sixty, in my book of claims, as salvage to the guild." She does not look at the door. "It\'s nothing personal. It\'s never personal. Somebody was always going to."',
    again: 'Orme, with her pen uncapped over her book of claims.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin has gone very still. "There it is," she says. "There it is. You don\'t get to be free. You get to be nobody\'s, and then she writes you down."' },
      { companion: WREN, text: 'Wren\'s hand is on her knife, and stays there. "Say the word," she says to you, not to Orme.' },
      { companion: NINE, text: '"It is lawful," Nine says. "The register reads as she says. I would like it to be otherwise. I note that, again."' },
    ],
    options: [
      {
        id: 'door.claim.talk', text: '(Put your hand flat over her book.) Write one name, and you will never sell water on this road again.', once: true,
        check: { skill: 'speech', dc: 50, mods: CLAIM_MODS }, effects: [{ set: 'a3_claim', value: 'off' }, MEM(ORME, 'a3_claim_off', -5)], next: 'claim_off', fail: 'claim_no',
      },
      {
        id: 'door.claim.pay', text: [
          { if: KNOWS('a3_orme_stake'), text: 'A hundred and twenty and a roof, you said. Here\'s the hundred and twenty. (Pay 120 Tolls.)' },
          { text: 'What would writing them down pay you? Take it from me instead. (Pay 120 Tolls.)' },
        ], if: { item: 'tolls', count: 120 }, effects: [{ take: 'tolls', count: 120 }, { set: 'a3_claim', value: 'paid' }, MEM(ORME, 'a3_claim_paid', 5)], next: 'claim_paid' },
      { id: 'door.claim.let', text: '(Let her write.)', next: 'claim_warn' },
      { id: 'door.claim.back', text: '(Take Pell\'s charts back.) Not like this.', next: 'struck_back' },
    ],
  },
  claim_no: {
    speaker: ORME,
    text: '"Love." She moves the book out from under your hand, not unkindly. "Knock buys its water from whoever has it. That was never me." The pen does not move yet. She is waiting to see what you do with the hand.',
    again: 'Orme, waiting, the pen over the book.',
    options: [
      { id: 'door.claim.pay2', text: 'Then the hundred and twenty. (Pay 120 Tolls.)', if: { item: 'tolls', count: 120 }, effects: [{ take: 'tolls', count: 120 }, { set: 'a3_claim', value: 'paid' }, MEM(ORME, 'a3_claim_paid', 5)], next: 'claim_paid' },
      { id: 'door.claim.let2', text: '(Let her write.)', next: 'claim_warn' },
      { id: 'door.claim.back2', text: '(Take Pell\'s charts back.) Not like this.', next: 'struck_back' },
    ],
  },
  claim_off: {
    speaker: ORME,
    text: 'She looks at your hand on her book for a long time. Then she looks up the lane at Knock in its doorways, the people she has sold water to for twenty years, and at Maud on her stool. She puts the cap back on her pen. "There\'s another factor in Ninebridge," she says, "with another book." It is the same thing she said about the paper, and she does not say it any more convincingly. She goes back up the lane to her counter.',
    again: 'Orme\'s pen, capped.',
    options: [{ text: '(Go on.)', next: 'struck' }],
  },
  claim_paid: {
    speaker: ORME,
    text: 'She counts it, because she always counts it, and puts it in her apron. "That\'s the stake," she says. "Not the roof." She caps her pen. "The guild will want to know why I didn\'t write. I\'ll tell them the designate made it worth my while not to, and they\'ll understand that, love, because it\'s the only thing they do understand."',
    again: 'Orme\'s pen, capped, and a hundred and twenty in her apron.',
    options: [{ text: '(Go on.)', next: 'struck' }],
  },
  claim_warn: {
    speaker: 'narrator',
    text: 'If she writes them down, they are the guild\'s the moment they step off the concrete. They can stay behind the door, struck off, with no order on them and no reserve to be, for as long as the air holds. Or they can come out, and be hers. You know this: it was said at the ring before Pell ever uncapped his pen, and Orme has just said it again in plainer words.',
    again: 'Orme\'s pen over the book.',
    options: [
      {
        id: 'door.claim.write', text: '(Let her write.)',
        effects: [
          { set: 'a3_claim', value: 'held' }, { set: 'a3_c9', value: 'sealed' }, { set: 'a3_c9_how', value: 'struck' }, LOWE_AS('withdrawn'), { xp: 100 },
          NEWS('a3_claim_held', 'the guild\'s factor at Knock wrote the Cistern\'s sixty into her book of claims when the city struck them off its record', -15),
          { decision: { id: 'a3_c9', text: 'Doc Pell\'s charts struck the Cistern off the city\'s record, and I let Factor Orme write its sixty into the guild\'s book of claims. They are behind their door, and the guild\'s if they ever come out of it.' } },
          { rep: { faction: 'tollmen', respect: 10 } }, A(TAMSIN, -25), A(WREN, -15), A(KES, -10), A(ASH, -10), A(NINE, -5), A(ODILE, -5), A(ILYA, -5),
        ],
        next: 'claimed',
      },
      { id: 'door.claim.not', text: 'No. Not like this.', next: 'claim' },
    ],
  },
  claimed: {
    speaker: 'narrator',
    text: [
      { if: DOOR_OPEN, text: 'Orme writes. It takes a long time: sixty names, from the copy of the Cistern\'s roll that the guild has had since before you were born, each one in a clear factor\'s hand, with the date. At the end she draws a line under them and blots it. / In the door, somebody has understood. Faces go back into the dark one by one, and then Bram\'s voice, and the rams take a breath ninety years long, and the great door swings in over its white arc and shuts, from inside, and stays shut. / At the yellow line the order goes back into a breast pocket, lapsed, and nobody in the grey looks at Orme. "Column. Home." Nobody in Knock comes out of a doorway until the grey has gone up the toll road. Then Maud gets up off her stool and sits down again with her back against the shut door, and puts her hand flat on it.' },
      { text: 'Orme writes. It takes a long time: sixty names, from the copy of the Cistern\'s roll that the guild has had since before you were born, each one in a clear factor\'s hand, with the date. At the end she draws a line under them and blots it. / The door does not move. Behind it, nobody knows yet what they are now; only that the column is leaving, and the hatch is still shut. Somebody will tell them through the Grille. You expect it will be you. / At the yellow line the order goes back into a breast pocket, lapsed, and nobody in the grey looks at Orme. "Column. Home." Maud gets up off her stool and sits down again with her back against the door, and puts her hand flat on it.' },
    ],
    again: 'Sixty names in the guild\'s book. The door shut.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin does not say anything at all. She walks down the apron and sits down beside Maud with her back against the door, and when you come near she gets up and goes to the other end of the apron, and sits down there.' },
      { companion: ASH, text: '"They\'ll die in there rather than step out and be bought," Ash says. "Some of them. You know which ones." He puts his scarf back on.' },
    ],
    options: ONWARD,
  },

  // ---- sealed / welded: from inside, with Bram and Teague
  weld: {
    speaker: 'narrator',
    text: mix([
      [
        { if: DOOR_OPEN, t: 'You go in through the open door past the faces. Bram has the manual cycle open by the time you reach him, and the rams take a long breath and the great door swings in over its white arc and meets its frame with a sound you feel in your teeth. Out on the apron, the light goes out of the hall.' },
        { if: F('a3_lift'), t: 'You go down the lift shaft past the faces.' },
        { t: 'You go down the grate and along the pump run, and come out under the red lamp with Bram waiting.' },
      ],
      [
        { if: TEAGUE_LEADS, t: 'Teague is at the seam already with a hand lamp, at the head of the corridor now and not only of the table. "I held the lamp for the last one," she says. "I\'ll hold it for this." Ines sits on a stool by the wall and watches, and says nothing.' },
        { t: 'Teague is at the seam already with a hand lamp. "I held the lamp for the last one," she says. "I was fifteen." Ines stands behind her with her hands folded and watches, and says nothing at all, because her mother laid the last bead and she has nothing to add to it.' },
      ],
      LEAD_P(
        'At the yellow line the captain has heard it through the rock, all four hours of it, and has worked out what it means before you open your mouth. "The order provides for force," he says. "It does not provide for cutting into the air of sixty people to carry them out of it." He writes across the foot: NON-COMPLIANT. SEALED FROM WITHIN. NOT EXECUTED. "Column," he says. "Home."',
        'At the yellow line Reyes has heard it through the rock, all four hours of it. "Force if non-compliant," she says. "Not cutting into sixty people\'s air." She writes across the foot: SEALED FROM WITHIN. NOT EXECUTED. "Column. Home."',
        'At the yellow line Kress has heard it through the rock, and looks as if somebody has taken a weight off him. "We\'re not cutting that," he says. "Not with them breathing behind it." He writes NOT EXECUTED on the foot. "Home."',
      ),
    ], (way, lamp, lead) => `${way} ${lamp} / Bram has the welder off its hooks in the machine room, a squat grey thing on a cable older than anybody in the room, and he lays the bead the way Teague said he would, properly, a hand\'s width at a time along the seam with the old weld ground back first, and you feed him rod and hold the clamp and do not look at the arc. It takes four hours. When it is done the seam is a grey rope of steel from the floor to as high as Bram can reach from a ladder, and he wipes his hands on the rag and says, "That\'ll hold." / You come back out the pump run. ${lead}`),
    again: 'A new seam, grey as rope, from the floor to as high as Bram could reach.',
    effects: [MEM(BRAM, 'a3_welded_with', 15), MEM(TEAGUE, 'a3_welded_with', 15), MEM(INES, 'a3_welded', -5), A(ASH, -8), A(NINE, 3), A(KES, -3)],
    interject: [
      { companion: ASH, text: '"Ninety years, and now ninety more," Ash says. "I hope they wanted it." He does not say it unkindly. He does not say it kindly.' },
      { companion: TAMSIN, text: 'Tamsin puts her palm flat on the new seam while it is still warm, and takes it away, and does not say what she thinks.' },
      { companion: WREN, text: '"I\'ve seen people weld themselves into worse," Wren says. "Never seen them do it so neat."' },
    ],
    options: SETTLE('welded', [LOWE_AS('withdrawn')]),
  },
  weld_no: {
    speaker: BRAM,
    text: 'The old bead will not take a new one. You strike the arc and the seam spits and cracks as it cools, a line of little fractures like frost on a cup, and the second try is worse, and on the third Bram reaches over and turns the welder off at the wall. "Not like that," he says. "Not today. Her mother\'s weld\'s got ninety years of carbon in it and we\'ve got no grinder that\'ll eat it." He looks at the cracked seam. "Teague won\'t say it, so I will. We\'ll not get a second go at that before the column\'s bored of waiting."',
    again: 'A cracked seam, and the welder cold.',
    options: [TO_LINE],
  },
  weld_burned: {
    speaker: PELL,
    text: 'Teague is at the seam with a lamp before you have finished asking, and Bram has the welder half off its hooks, and Pell takes it out of his hands. "On a hand pump?" Pell says. "On forty-year-old stores, with no fans and nobody to turn them? Weld us in and you\'ve built us a grave with a very nice seam on it." He hangs the welder back up. Teague says nothing. Nobody else does either.',
    again: 'The welder on its hooks.',
    options: [TO_LINE],
  },

  // ---- the guild's paper
  orme: {
    speaker: ORME,
    text: [
      { if: F('a3_guild'), text: 'Orme has come down the lane as far as the guild\'s side of the yellow line, with the leather folder held against her chest. "Once more, love," she says, "and then I\'ll not ask you again. The column\'s paper carries them to the Precinct for nothing. This one pays, and it rides on the same act." She holds it out. "Your hand. One line. I\'ve carried worse paper for less."' },
      { text: 'Orme has come down the lane as far as the guild\'s side of the yellow line, with a leather folder held against her chest. She opens it and turns it round so you can read it, the way she has turned her ledger round for every debtor on this road: CONCERN OF HALCYON — INTAKE (THE WEIGHHOUSE) — CONTRACT OF LABOUR, TEN YEARS — RESERVE 9 (THE MOUTH), SIXTY PERSONS, AS SUPPLY — CONSIDERATION TO THE PRECINCT AT ASSESSED VALUE, PAID BY THE TOLLMEN\'S GUILD AS AGENT. Forty Tolls a head, down the margin. "The column\'s paper carries them to the Precinct for nothing," she says. "This one pays, and it rides on the same act. Your hand, love. One line."' },
    ],
    again: 'Orme, holding out the folder.',
    effects: [{ learn: 'a3_intake_terms' }],
    interject: [{ companion: TAMSIN, text: '"Don\'t," Tamsin says. That is all. She has never said it to you before.' }],
    options: [
      { id: 'door.orme.take', text: '(Take the folder.)', effects: [{ give: 'k_a3_intake' }, { set: 'a3_guild', value: 'paper_held' }], next: 'sold_warn' },
      {
        id: 'door.orme.no', text: 'No. Nobody behind that door is for sale.',
        effects: [{ set: 'a3_guild', value: 'refused' }, MEM(ORME, 'a3_paper_refused', -5, 70), A(TAMSIN, 5), A(WREN, 5)], next: 'orme_no',
      },
    ],
  },
  orme_no: {
    speaker: ORME,
    text: '"Then I\'ll not ask again." She closes the folder and tucks it under her arm. "Paper always keeps." She goes back up the lane to her counter, and does not hurry.',
    again: 'Orme, back at her counter.',
    options: [TO_LINE],
  },
  sold_warn: {
    speaker: 'narrator',
    text: mix([
      [
        { if: KNOWS('a3_weighhouse'), t: 'You know what the Weighhouse is: Hale told you, in plain words, by the horses. Weighed and graded at the foot of Halcyon. A work line for ten years, or for as long as the work wants. The ones who do not come out are written "fulfilled". Some grades are not for work.' },
        { t: 'You do not know what the Weighhouse is. Orme said she had never been. Nobody on this road has come back from it to say.' },
      ],
      LEAD_P(
        'The captain sees the folder in your hand and closes his eyes for a moment. Then he holds out his hand for it, because now he must, and reads it through at the yellow line, every line, slowly. "It is lawful," he says. "The chair may dispose of supply as it sees fit." He gives it back. "Two papers on one door, designate. I had hoped you would not make me read the second."',
        'Reyes sees the folder and holds out her hand for it, and reads it through. "Lawful," she says. "The chair disposes of supply." She hands it back. "He never read it. He was waiting to see if you\'d make him."',
        'Kress reads it with his lips moving, and gives it back. "I don\'t know about this one," he says. "The captain would have."',
      ),
    ], (cost, lead) => `${lead} / ${cost} / There is a line at the foot, blank. Forty Tolls a head, down the margin, paid to the city for its supply. The column would walk them to the stand, and the guild would walk them from there.`),
    again: 'The folder open, the blank line at its foot.',
    interject: [
      { companion: WREN, text: 'Wren has stopped breathing, or near enough. "If you sign that," she says, "I am walking up that lane, and I am not walking back down it."' },
      { companion: KES, text: '"The closed eye," Kes says. "Go on, then. They\'ll know your hand by the morning."' },
      { companion: ASH, text: 'Ash says nothing. He takes his hat off, slowly, the way he does at a grave.' },
      { companion: NINE, text: '"It is lawful," Nine says. "I would like it not to be. I am saying so in front of the captain, so that it is on a record."' },
    ],
    options: [
      { id: 'door.sign.tam', text: '(Sign it.)', if: ALL(TAM_CAN_STAND, NOT(TAM_DOOR), TAM_TRAVELS, TAM_ROMANCE), effects: [{ set: 'a3_door_word', value: 'sold' }, { leave: TAMSIN }, { set: 'tam_left', value: 'door' }, { set: 'tam_romance', value: 'ended' }, { set: 'romance_partner', value: false }], next: 'tam_stand' },
      { id: 'door.sign.tam2', text: '(Sign it.)', if: ALL(TAM_CAN_STAND, NOT(TAM_DOOR), TAM_TRAVELS, NOT(TAM_ROMANCE)), effects: [{ set: 'a3_door_word', value: 'sold' }, { leave: TAMSIN }, { set: 'tam_left', value: 'door' }], next: 'tam_stand' },
      { id: 'door.sign.tam3', text: '(Sign it.)', if: ALL(TAM_CAN_STAND, NOT(TAM_DOOR), NOT(TAM_TRAVELS)), effects: [{ set: 'a3_door_word', value: 'sold' }], next: 'tam_stand' },
      { id: 'door.sign.door', text: '(Sign it.)', if: TAM_DOOR, effects: [{ set: 'a3_door_word', value: 'sold' }], next: 'tam_door' },
      { id: 'door.sign.go', text: '(Sign it.)', if: NOT(ANY(TAM_CAN_STAND, TAM_DOOR)), effects: SOLD_FX, next: 'sold' },
      { id: 'door.sign.no', text: '(Close the folder.)', next: 'line' },
    ],
  },

  // ---- the designate's word
  order_warn: {
    speaker: 'narrator',
    text: LEAD(
      'He does not move. "Say it again, designate," he says, "so that it is the word and not the weather." He takes the order out of his breast pocket and holds it, not yet unfolded. "It is the first act of the chair. I will enter it as yours, in your name, at Knock, today. It will be the first thing the city ever has from you in writing." He waits. "I would like you to be sure. I have never been asked to be, and I would like somebody to have been."',
      'Reyes does not move. "Say it again," she says, "so it\'s the word." She takes the order out and holds it. "First act of the chair. In your name. He\'d have asked you to be sure. I\'m asking."',
      'Kress does not move. "Again, designate?" he says. "So I know it\'s the word. I\'ve never had it from anybody but the captain."',
    ),
    again: '"Say it again, designate."',
    interject: [
      { companion: NINE, text: '"I will record it," Nine says quietly, "whatever it is. I would prefer to record something else."' },
      { companion: ILYA, text: 'Ilya looks at you, and then at the ground. "Right," he says, to nobody, the way he says it when something is about to happen to someone else.' },
      { companion: ODILE, text: '"Once it\'s in writing," Odile says, "it\'s in writing. You know that better than anyone now."' },
    ],
    options: [
      { id: 'door.order.tam', text: 'Carry on, Captain.', if: ALL(TAM_CAN_STAND, NOT(TAM_DOOR), TAM_TRAVELS, TAM_ROMANCE), effects: [{ set: 'a3_door_word', value: 'order' }, { leave: TAMSIN }, { set: 'tam_left', value: 'door' }, { set: 'tam_romance', value: 'ended' }, { set: 'romance_partner', value: false }], next: 'tam_stand' },
      { id: 'door.order.tam2', text: 'Carry on, Captain.', if: ALL(TAM_CAN_STAND, NOT(TAM_DOOR), TAM_TRAVELS, NOT(TAM_ROMANCE)), effects: [{ set: 'a3_door_word', value: 'order' }, { leave: TAMSIN }, { set: 'tam_left', value: 'door' }], next: 'tam_stand' },
      { id: 'door.order.tam3', text: 'Carry on, Captain.', if: ALL(TAM_CAN_STAND, NOT(TAM_DOOR), NOT(TAM_TRAVELS)), effects: [{ set: 'a3_door_word', value: 'order' }], next: 'tam_stand' },
      { id: 'door.order.door', text: 'Carry on, Captain.', if: TAM_DOOR, effects: [{ set: 'a3_door_word', value: 'order' }], next: 'tam_door' },
      { id: 'door.order.go', text: 'Carry on, Captain.', if: NOT(ANY(TAM_CAN_STAND, TAM_DOOR)), effects: ORDER_FX, next: 'order' },
      { id: 'door.order.not', text: 'No. Not yet.', next: 'line' },
    ],
  },

  // ---- Tamsin in the door
  tam_stand: {
    speaker: TAMSIN,
    text: mix([
      [
        { if: TAM_WALKED, t: 'Tamsin is gone from your side before the word is finished. She does not run. She walks down the length of the apron past Maud, who reaches for her hand and misses, and turns round with her back to the door, and sits down in front of it on the concrete with her knees drawn up, the way she used to sit at the Grille when it was her turn.' },
        { if: F('tam_home'), t: 'In the dark of the doorway there is a movement, and Tamsin Roe, who went home through the hatch and swore she was done with the outside, steps out of the Cistern and into the door, and sits down in it with her back against the steel.' },
        { t: 'In the dark of the doorway there is a movement, and Tamsin Roe, who never came out, who you have only ever known as a voice through the Grille and a face among the beds, steps into the door from inside and sits down in it with her back against the steel.' },
      ],
      [
        { if: F('tam_pledge', 'door'), t: '"I said I\'d stand in it," she says. "I\'m sitting. It\'s the same."' },
        { if: F('tam_pledge', 'lives'), t: '"I said I\'d keep them alive," she says. "This is me doing that. It\'s all I\'ve got."' },
        { if: F('tam_pledge', 'city'), t: '"I said if they chose the city I\'d go with them," she says. "They didn\'t choose. You did."' },
        { t: '"No," she says. Just that.' },
      ],
      [
        { if: TAM_WALKED, t: 'She looks at you once, all the way down the apron. She does not look at you again.' },
        { t: 'She looks at the column, not at you.' },
      ],
    ], (how, pledge, look) => `${how} ${pledge} ${look}`),
    again: 'Tamsin in the door.',
    effects: [
      { set: 'a3_tam_door' }, MEM(TAMSIN, 'a3_in_the_door', -50, 100), MEM(MAUD, 'a3_tam_door', -20),
      { decision: { id: 'a3_tam_door', text: 'When I gave the word at the Cistern\'s door, Tamsin left me and sat down in the door between the column and her people.' } },
    ],
    options: [{ text: '(Go on.)', next: 'tam_door' }],
  },
  tam_door: {
    speaker: 'narrator',
    text: LEAD(
      'The captain looks at the woman in the door for a long time. "There is a person in the door, designate," he says. "Undocumented. I have no name for her on the order." He turns his cap round once in his hands. "The order provides for force if non-compliant. It does not provide for me deciding that."',
      'Reyes looks at the woman in the door. "There\'s a person in the door," she says. "Not on the order. Undocumented." Her jaw works. "Force if non-compliant, it says. It doesn\'t say who decides."',
      'Kress looks at the woman in the door and then at you. "There\'s somebody in the door," he says. "She\'s not on the sheet." He waits for somebody to tell him what that means.',
    ),
    again: 'Tamsin in the door; the column at the line.',
    options: [
      { text: '(Go on.)', if: NINE_DUE, next: 'nine_order' },
      { text: '(Go on.)', if: NOT(NINE_DUE), next: 'force_ask' },
    ],
  },
  force_ask: {
    speaker: 'narrator',
    text: LEAD(
      '"Your word, designate." The captain does not raise his voice. "Force, or not. The order will not say it for you, and I will not say it for the order."',
      '"Your word," Reyes says. "Force, or not. I won\'t say it for you."',
      '"Your word," Kress says. "I can\'t. I can\'t say it."',
    ),
    again: '"Your word, designate."',
    options: [
      {
        id: 'door.force.order', text: '(Give the word.) Force it.', if: WORD('order'),
        effects: [...RELOCATED('forced'), ...FORCED_FX], next: 'forced',
      },
      {
        id: 'door.force.sold', text: '(Give the word.) Force it.', if: WORD('sold'),
        effects: [...SOLD_FX, ...FORCED_FX], next: 'forced',
      },
      { id: 'door.force.no', text: 'No. Not over her.', effects: [{ set: 'a3_door_word', value: false }, A(NINE, 3)], next: 'relent' },
    ],
  },
  relent: {
    speaker: 'narrator',
    text: LEAD(
      '"Then it is not carried today." The captain puts the order back in his breast pocket, unexecuted. "It waits for the designate. It always has." He does not look at the woman in the door, and she does not look at him, and Maud on her stool between them looks at both.',
      '"Then not today." Reyes puts the order away. "It waits." She doesn\'t look at the door.',
      '"Not today, then," Kress says, and puts the order away, and his hands are shaking.',
    ),
    again: 'The order back in its pocket, unexecuted.',
    options: [TO_LINE],
  },
  forced: {
    speaker: 'narrator',
    text: mix([
      LEAD_P(
        'The captain closes his eyes. When he opens them he says, to the wardens, without turning round, "Lift her out of the door. Gently. Nobody is to be hurt."',
        'Reyes says it to the wardens without turning round: "Lift her out. Gently. Nobody hurt."',
        'Kress says it to the others in a voice that is not his: "Lift her out. Careful. Nobody hurt."',
      ),
      LEAD_P(
        'The captain walks down the length of the apron and takes his cap off and kneels beside her, and puts two fingers to her throat, and stays there much longer than he needs to. / "Thirty-two," he says, to nobody.',
        'Reyes walks down the length of the apron and kneels beside her, and puts two fingers to her throat, and stays there much longer than she needs to. She does not say anything at all.',
        'Kress, with his hands over his broken face, sits down on the concrete beside her and does not get up for a long time.',
      ),
    ], (lead, end) => `${lead} / They go down the apron in a line, rifles slung, the way men go to move furniture. Tamsin does not get up. Kress takes one arm and Pahl the other, and she comes up off the concrete all at once and does not let them have her: she gets a hand into the frame of the door and holds it, and when they pull she kicks, and when they pull harder she puts her head into Kress\'s face and he goes back with his nose broken and his hands over it. Okeke, the youngest, who has never been this far down the toll road, comes in to help with his carbine still on its sling, and she gets a hand to it, and they are both pulling, and it goes off. / It is not loud. The rock takes most of it. / She sits down again in the door, slowly, the way she sat down before, with her back against the steel. Then she lies down. / Nobody says anything. Okeke is on his knees with the carbine in both hands, looking at it. Maud has her hands over her mouth and makes no sound behind them at all. Up the lane, in its doorways, Knock does not move. ${end} / They carry the sixty out past her, afterwards. They have to; she is in the door. Most of them look. Ines does not look away once.`),
    again: 'The door. Where she was.',
    effects: [
      MEM(LOWE, 'a3_forced', -30, 100), MEM(MAUD, 'a3_forced', -80, 100), MEM(INES, 'a3_forced', -60, 100),
      NEWS('a3_tamsin_dead', 'Tamsin Roe, the first out of the Cistern in living memory, died in its door at Knock when the column forced it on the designate\'s word', -30),
      { decision: { id: 'a3_tamsin_dead', text: 'Tamsin died in the Cistern\'s door, at Knock, when I told the column to force it.' } },
    ],
    options: [
      { text: '(Go on.)', if: F('a3_c9_how', 'forced'), next: 'order' },
      { text: '(Go on.)', if: NOT(F('a3_c9_how', 'forced')), next: 'sold' },
    ],
  },

  // ---- Nine's break: the captain orders the city's unit to take the undocumented person out of the door
  nine_order: {
    speaker: 'narrator',
    text: LEAD(
      'The captain turns his head, not his body, and finds Nine beside you. "Unit 9," he says. "You are a unit of the city in the presence of a lawful order. The undocumented person in the door. Take her out of it." He says it without any pleasure at all, the way he says everything lawful.',
      'Reyes turns her head and finds Nine. "Unit 9. City\'s order. The undocumented person in the door. Take her out of it."',
      'Kress looks round for anybody else, and finds Nine. "Unit," he says. "You\'re the city\'s. Take her out of the door. Please."',
    ),
    again: 'The captain\'s order to Unit 9, in the air.',
    effects: [{ set: 'a3_nine_asked' }],
    options: [
      { text: '(Go on.)', if: NINE_KEEPER_SELF, next: 'nine_self' },
      { text: '(Go on.)', if: NINE_KEEPER_PLAYER, next: 'nine_keeper' },
      { text: '(Go on.)', if: ALL(NINE_KEEPER_CITY, NINE_CONSCIENCE), next: 'nine_conscience' },
      { text: '(Go on.)', if: ALL(NINE_KEEPER_CITY, NOT(NINE_CONSCIENCE)), next: 'nine_deputy' },
    ],
  },
  nine_self: {
    speaker: NINE,
    text: [
      { if: LED_BY_LOWE, text: '"The keeper declines," Nine says. Its cracked lens does not move from the woman in the door. "Unit 9 is its own keeper, Captain, on the Court of Accounts\' register under the clause nobody wrote. An order to a unit is an order to its keeper. Its keeper declines." / The captain is quiet for a moment. "So it is," he says. "I cannot order a unit the Court says is its own." He turns back to you.' },
      { text: '"The keeper declines," Nine says. Its cracked lens does not move from the woman in the door. "Unit 9 is its own keeper, on the Court of Accounts\' register under the clause nobody wrote. An order to a unit is an order to its keeper. Its keeper declines." / At the yellow line, a silence, and then: "So it is. The Court says it\'s its own." And the column\'s eyes come back to you.' },
    ],
    again: '"The keeper declines."',
    effects: [A(NINE, 5), MEM(LOWE, 'a3_nine_declined', 5)],
    options: [{ text: '(Go on.)', next: 'force_ask' }],
  },
  nine_keeper: {
    speaker: NINE,
    text: 'Nine does not move toward the door. It turns its cracked lens to you instead. "I have a keeper," it says to the line, "and it is not the city." Then, to you, very precisely, so that there can be no mistake on any record: "Is that an instruction from my keeper?"',
    again: '"Is that an instruction from my keeper?"',
    options: [
      {
        id: 'door.nine.order', text: 'Take her out of the door, Nine.',
        effects: [{ leave: NINE }, { set: 'nine_left', value: 'door' }, { set: 'nine_gone' }, MEM(NINE, 'a3_ordered_arrest', -100, 100),
          { decision: { id: 'nine_left', text: 'At the Cistern\'s door I ordered Nine, as its keeper, to take Tamsin out of the door. It refused me, the only order it ever refused, and left me for good.' } }],
        next: 'nine_refuses',
      },
      { id: 'door.nine.not', text: 'No. It isn\'t.', effects: [A(NINE, 10), MEM(NINE, 'a3_not_ordered', 20)], next: 'nine_not' },
    ],
  },
  nine_refuses: {
    speaker: NINE,
    text: 'For a long moment Nine does nothing at all. Then: "No." It has never said the word to you before. It does not seem to know where to put its hands. "An undocumented person is the record\'s one precious thing, keeper. I will not take her out of anywhere." It takes the bound ledger out from under its arm, the one it does not write in while anybody watches, and writes in it, in front of you, a single line. Then it closes the ledger and puts it away. / "I withdraw," it says. "The grounds are attached. I will not fight you. I will not help." It walks up the lane past the column, and the wardens step aside for it without being told, and it does not look back, because it has never been built to.',
    again: 'The place where Nine stood.',
    options: [{ text: '(Go on.)', next: 'force_ask' }],
  },
  nine_not: {
    speaker: NINE,
    text: '"Noted," Nine says. "Thank you." It turns its lens back to the yellow line. "My keeper declines on my behalf. You may enter it as the keeper\'s refusal." At the line, after a look at it and at you, it is entered.',
    again: '"Noted. Thank you."',
    options: [{ text: '(Go on.)', next: 'force_ask' }],
  },
  nine_conscience: {
    speaker: NINE,
    text: mix([LEAD_P(
      'The captain looks at it with something very like grief. "Then you are a unit of the city refusing a lawful order in the presence of the city," he says. "You know what that is." He does not turn round. "Wardens. Unit 9 is struck off." Behind him two of the wardens unsling their rifles, slowly, as if hoping somebody will stop them.',
      'Reyes closes her eyes for a moment. "A unit refusing a lawful order in front of the city," she says. "You know what that is." She does not turn round. "Wardens. Unit 9 is struck off." Behind her two of the wardens unsling their rifles, slowly, as if hoping somebody will stop them.',
      'Kress looks at it, and at the other wardens, and says it because it is in the book and he does not know what else is: "Unit 9 is struck off." Two rifles come off their slings, slowly, as if hoping somebody will stop them.',
    )], (lead) => `"No," Nine says, at once, as if it had been waiting a hundred and twenty years to be asked. "I refuse the order. An undocumented person is the record\'s one precious thing. I log the order as an error, here, at Knock, on this date." / ${lead}`),
    again: '"Unit 9 is struck off."',
    options: [
      {
        id: 'door.nine.spare', text: 'Captain. It is a unit doing what it was made for. Leave it be.', once: true,
        check: { skill: 'speech', dc: 45, mods: SPARE_MODS }, effects: [{ set: 'a3_nine_spared' }, A(NINE, 10), MEM(NINE, 'a3_stood_with', 30)], next: 'nine_spared', fail: 'nine_struck',
      },
      {
        id: 'door.nine.fight', text: '(Stand between the wardens and Nine.)',
        effects: [{ set: 'a3_door_fight' }, { set: 'a3_door_word', value: false }, A(NINE, 15), { rep: { faction: 'wardens', respect: -25, fear: 10 } },
          { decision: { id: 'a3_door_fight', text: 'When the wardens turned their rifles on Nine at the Cistern\'s door, I stood between them, and it came to a fight on the apron.' } }],
        exit: true,
      },
      { id: 'door.nine.let', text: '(Say nothing.)', next: 'nine_struck' },
    ],
  },
  nine_spared: {
    speaker: 'narrator',
    text: LEAD(
      'The captain lets out a breath. "Struck off," he says, "and not mine to dispose of. The order says nothing about units." He lifts a hand without turning, and behind him the rifles go back on their slings. "Stand aside, unit." Nine stands aside, and keeps its lens on the woman in the door.',
      '"Struck off," Reyes says, "and not mine to dispose of." She lifts a hand; the rifles go back on their slings. "Stand aside, unit."',
      '"Struck off," Kress says, and it is clear he is relieved to have been told what to do. "Not mine to dispose of. Rifles down."',
    ),
    again: 'Nine, struck off and standing aside.',
    options: [{ text: '(Go on.)', next: 'force_ask' }],
  },
  nine_struck: {
    speaker: 'narrator',
    text: 'The wardens do it the way they do everything at Knock: politely. Nine does not lift a hand. It stands on the apron with its cracked lens on the woman in the door, and when the first round takes it in the chest it says, quite clearly, "Logged," and when the second takes it in the head it says nothing. It goes down all at once, like a stack of ledgers, and lies on the concrete with one hand open. / Nobody in Knock has ever seen a machine die. Nor had you.',
    again: 'Nine, on the concrete, one hand open.',
    effects: [{ leave: NINE }, { set: 'a3_nine_struck' }, { set: 'nine_gone' },
      NEWS('a3_nine_struck', 'the city\'s wardens shot their own unit dead on Knock\'s apron when it refused an order', -8),
      { decision: { id: 'a3_nine_struck', text: 'Nine refused the city\'s order at the Cistern\'s door, and the wardens struck it off there, on the apron, and I said nothing.' } },
      A(TAMSIN, -10), A(KES, -10), A(ASH, -5)],
    options: [{ text: '(Go on.)', next: 'force_ask' }],
  },
  nine_deputy: {
    speaker: NINE,
    text: 'Nine does not move toward the door, and it does not refuse. It turns its cracked lens to you. "Designate," it says. "I am the city\'s. The city has given me a lawful order, and I am a deputy; I make the city\'s orders lawful line by line." A pause, measured to the tick. "I would like you to tell me to refuse. I find I cannot do it on my own. I would like it to be a word from the chair."',
    again: '"I would like you to tell me to refuse."',
    options: [
      { id: 'door.nine.refuse', text: 'Refuse, Nine.', effects: [A(NINE, 10), MEM(NINE, 'a3_told_refuse', 30), { set: 'a3_nine_countermand' }], next: 'nine_deputy_refuses' },
      {
        id: 'door.nine.obey', text: 'Do as he says.',
        effects: [A(NINE, -15), MEM(NINE, 'a3_told_obey', -30), { set: 'a3_tam_door', value: false }, { set: 'a3_tam_carried' },
          { decision: { id: 'a3_tam_carried', text: 'At the Cistern\'s door I told Nine to obey the captain, and it carried Tamsin out of the door so the column could go in.' } }],
        next: 'nine_obeys',
      },
    ],
  },
  nine_deputy_refuses: {
    speaker: NINE,
    text: mix([LEAD_P(
      'The captain looks at it, and at you, and something in his face that has been held tight for a fortnight lets go a little. "A unit acting on the designate\'s word is acting on the chair\'s," he says. "I will enter it as the chair\'s first countermand." He writes it on the foot of the order, under the space where the designate\'s name will go. "It does not move her out of the door."',
      'Reyes looks at it, and at you. "Acting on the designate\'s word is acting on the chair\'s," she says. "Entered. The chair\'s first countermand." She writes it on the foot of the order. "Doesn\'t move her out of the door."',
      'Kress looks at it, and at you, and writes something on the foot of the order because it seems to be expected. "The designate\'s word," he says. "All right. She\'s still in the door."',
    )], (lead) => `"On the designate\'s word," Nine says, "I refuse." / ${lead}`),
    again: '"The chair\'s first countermand."',
    options: [{ text: '(Go on.)', next: 'force_ask' }],
  },
  nine_obeys: {
    speaker: 'narrator',
    text: 'Nine walks down the apron to the door. Tamsin sees it coming and gets up, and it waits until she is up, and then it picks her up the way you would pick up a sleeping child, one arm under her knees, and she fights it, hard, all the way, with her fists and her teeth and her heels, and it does not let go and it does not hurt her and it does not say anything at all. It carries her the length of the apron and sets her down beside Maud, on her feet, and holds her by the shoulders until she stops, and then lets go. / "Precious," it says to her, quietly, and nobody else hears it but you. Then it walks back and stands beside you, and does not look at you.',
    again: 'Tamsin beside Maud, out of the door.',
    options: [
      { text: '(Go on.)', if: WORD('order'), effects: ORDER_FX, next: 'order' },
      { text: '(Go on.)', if: WORD('sold'), effects: SOLD_FX, next: 'sold' },
    ],
  },

  // ---- relocated / order
  order: {
    speaker: 'narrator',
    text: mix([
      [
        { if: F('a3_tamsin_dead'), t: '' },
        { if: F('a3_tam_carried'), t: 'At the yellow line Tamsin is watched all the way to Maud\'s side, and then the cap goes on. "Carry on," to the wardens. "As the designate says."' },
        { if: LED_BY_LOWE, t: 'The captain takes the order out of his breast pocket and writes on the foot of it, in your name, at Knock, today, and holds it out to you, and you sign under it. Then he puts his cap on. "Carry on," he says to the wardens. "As the designate says."' },
        { if: LED_BY_REYES, t: 'Reyes takes the order out and writes on the foot of it, in your name, and holds it out, and you sign under it. She puts Lowe\'s cap on. "Carry on," she says to the wardens. "As the designate says."' },
        { t: 'Kress takes the order out and holds it while you sign the foot of it, and then he says "Carry on," to the others, in a voice that sounds like somebody else\'s.' },
      ],
      [
        { if: DOOR_OPEN, t: 'The door is already open. They come out of it because there is nowhere else to go.' },
        { if: MOTHER_UP, t: 'MOTHER opens the door. Nobody asks her to; the designate has attended, and a lockdown is a pause. The rams take their breath, the seam splits along Elspeth Halloran\'s weld with a crack like river ice, and the door swings out over the concrete, and the light goes into the hall.' },
        { t: 'Kress takes the plate off the RESCUE ACCESS panel and works the manual cycle, because there is nobody inside to open it any more, and the door swings out over the concrete with a crack like river ice.' },
      ],
      [
        { if: F('a3_route_home', 'column'), t: 'The car is at the stand already, where it brought you home, with its tailboard down and its sixty numbered benches.' },
        { t: 'The car comes down the toll road from the gate where it has waited since the order came, a long grey lorry with a canvas roof, and backs up to the stand with its tailboard down and its sixty numbered benches.' },
      ],
      [
        { if: F('a3_pell', 'fit'), t: 'Sayer Quist does not go. Pell wrote his "no" true, and the captain reads it off the chart at the line and stands him aside, and he stands in the empty door in his kitchen apron and watches the rest of them climb up, the one man in the Cistern who wanted to.' },
        { t: '' },
      ],
      [
        { if: LINNET_STAYS, t: 'Cadet Ferrow walks beside the line with her clipboard and says each name out loud as they pass her, every one, so that somebody in the grey has said it.' },
        { t: '' },
      ],
    ], (open, door, car, sayer, linnet) => `${open ? open + ' / ' : ''}${door} / ${car} / They come out one at a time, in issued grey, carrying what they can carry, and they stop on the concrete and look up, because they have never had a sky. The wardens do not push. They do not need to. Ines comes out last but one, with Teague behind her, and walks the length of the apron and up the lane to the stand with her hands folded in front of her and her eyes on the car, and climbs up, and sits on the bench with her number on it.${sayer ? ' ' + sayer : ''}${linnet ? ' ' + linnet : ''} / Maud stands on the apron and watches every one of them go past her. She has wanted to see their faces all her life. She sees them now.`),
    again: 'The car going up the toll road, west, with sixty benches full.',
    interject: [
      { companion: ASH, text: 'Ash watches them look up at the sky for the first time from the bed of a city lorry. "There," he says. "Now they\'ve seen it." He does not say anything else for a long time.' },
      { companion: KES, text: 'Kes watches the tailboard go up. "Graded," she says. "By lunchtime." She does not look at you.' },
      { companion: ILYA, text: 'Ilya counts them up into the car under his breath. When he gets to sixty he stops, and starts again from one.' },
    ],
    options: ONWARD,
  },

  // ---- relocated / sold
  sold: {
    speaker: 'narrator',
    text: mix([
      [
        { if: F('a3_tam_carried'), t: 'At the yellow line Tamsin is watched all the way to Maud\'s side, and then the cap goes on.' },
        { if: F('a3_tamsin_dead'), t: '' },
        { t: 'You sign. Orme takes the folder back from you and blots the line, and tears the guild\'s copy off along its perforation, and gives the captain the Precinct\'s.' },
      ],
      [
        { if: HALE_WALKS, t: 'Brannick Hale walks them. He comes down the lane from the horses with his hat on and stands at the yellow line and does not look at Maud, and when the column has brought them out he walks at the head of them up the guild\'s road, as he has walked people up it before; it was his job, and nobody has told him it isn\'t.' },
        { if: F('a3_hounds_in'), t: 'The handlers walk them, one at the front and one at the back, with the grey things on their short leads pacing beside the line so that nobody walks off. Nobody walks off.' },
        { t: 'There is nobody at Knock to walk them, so the guild\'s coach takes the first twelve and Orme writes to Ninebridge for the rest, and the rest wait at the stand under the column\'s guard for four days, sitting on the ground in their issued grey, and Knock brings them water, because it is the only thing Knock knows how to do.' },
      ],
    ], (signed, walk) => `${signed ? signed + ' / ' : ''}The column brings them out: the door opened for the designate\'s act, and the wardens at the yellow line, not pushing. They come out one at a time in issued grey and stop on the concrete and look up, because they have never had a sky, and then the guild\'s green takes them from the grey at the stand, against a receipt. / ${walk} / Ines does not look at you. Effie Calder does, all the way up the lane, as if she were trying to learn your face for later.`),
    again: 'The guild\'s road, north and east, and sixty people on it.',
    interject: [
      { companion: KES, text: 'Kes watches the closed eye on the guild\'s coach go up the road. "You know where that road goes," she says. "I was born at the top of it." It is not an accusation. It is worse.' },
      { companion: ODILE, text: '"Forty a head," Odile says. "I\'ve shorted towns for less, and slept. I don\'t think I\'ll sleep tonight." She says it as a fact about the market.' },
    ],
    options: ONWARD,
  },

  // ---- relocated / consent
  consent: {
    speaker: 'narrator',
    text: LEAD(
      'The captain looks at the door for a long time. "They have asked to come," he says, "on their own feet." He takes the order out of his breast pocket and does not unfold it. "It still executes on your attendance, designate. You are attending. Say they may, and I will bring the car down, and nobody will be carried who does not want to be."',
      '"They\'ve asked to come?" Reyes looks at the door. "Then it\'s yours to say they may. Say it, and I\'ll bring the car down, and nobody\'s carried who doesn\'t want it."',
      '"They want to come?" Kress looks at the door, and at you, as if this has never happened in thirty years, which it has not. "Then say so, and I\'ll bring the car."',
    ),
    again: '"They have asked to come."',
    options: [
      { id: 'door.consent.yes', text: 'Let them come out.', effects: [...RELOCATED('consent'), MEM(INES, 'a3_walked_out', 10), A(TAMSIN, -5), A(NINE, 3)], next: 'consent_done' },
      { id: 'door.consent.not', text: 'Not yet.', next: 'line' },
    ],
  },
  consent_done: {
    speaker: 'narrator',
    text: mix([
      [
        { if: TEAGUE_LEADS, t: 'Teague does not come out. She stands in the door with a hand lamp, as she said she would, and keeps it for whoever is left in there, which is Bram, and MOTHER, and her.' },
        { t: 'Ines comes out first, which she has never done in her life, and stops on the concrete and looks up, and stays like that a long time, with her hands folded.' },
      ],
      [
        { if: ALL(TAM_TRAVELS, F('tam_pledge', 'city')), t: 'Tamsin walks beside them as far as the car, as she said she would if they chose it, and stands at the tailboard with her hand on it while they climb up, and when it goes she stays on the road a long time.' },
        { t: '' },
      ],
    ], (lead, tam) => `${lead} / They come out on their own feet, carrying what they want to carry, in their issued grey, and stop on the concrete because they have never had a sky. Sayer Quist goes up the lane first with his apron folded under his arm, to the car and the clinics and a name for the thing under his ribs. Pell goes after him because somebody should. Effie Calder walks the length of the apron and up the lane and touches the yellow line with her toe on the way past, and laughs. / They say their names at the yellow line as they climb up, one by one, and every name is written down by hand.${tam ? ' ' + tam : ''} / Maud stands on the apron and watches them all go past her. She has wanted to see their faces all her life. She sees them now, every one, and some of them smile at her.`),
    again: 'The car going up the toll road, west, with the people who chose it.',
    effects: [MEM(MAUD, 'a3_walked_out', 5, 90)],
    interject: [
      { companion: ASH, text: '"Under the sky," Ash says, "even on a bench in a lorry." He watches them go. "It\'s more than I thought they\'d get."' },
      { companion: NINE, text: '"Consent, entered," Nine says. "The first relocation in the record with a column for it." It sounds as if it does not know what to do with that.' },
    ],
    options: ONWARD,
  },

  // ---- the fight
  fight_warn: {
    speaker: 'narrator',
    text: mix([
      LEAD_P(
        'Four wardens and a captain, at a yellow line, with their rifles slung; they have not unslung them in a fortnight, and they are not expecting to now. Lowe sees your hand move before you have decided anything, and his face does something you will remember.',
        'Four wardens and a sergeant, at a yellow line, with their rifles slung. Reyes sees your hand move and her face goes flat.',
        'Three wardens and Kress, at a yellow line, with their rifles slung. Kress sees your hand move and goes white.',
      ),
      [
        { if: ANY(ALLY('shale'), ALLY('dogs')), t: 'On the slope, the rifles you called come up off knees.' },
        { t: 'Nobody on the slope has a rifle but Corin.' },
      ],
    ], (lead, slope) => `${lead} ${slope} Maud is on her stool between you and the door. Knock is in its doorways, forty people and a goat, with nowhere to go. / If you do this, it is done on the apron, in front of all of them, and the city will hear how its column was answered at Knock.`),
    again: 'The column at the line, its rifles still slung.',
    interject: [
      { companion: NINE, text: '"I will not raise a hand against the city\'s wardens," Nine says. "I will stand where I can record it."' },
      { companion: ASH, text: '"Not in front of them," Ash says, very low, meaning the faces in the dark. "Not the first thing they see of us."' },
      { companion: WREN, text: 'Wren has her knife out already, low, against her thigh, where the wardens cannot see it. "Say when."' },
    ],
    options: [
      {
        id: 'door.fight.go', text: '(Draw.)',
        effects: [{ set: 'a3_door_fight' }, { rep: { faction: 'wardens', respect: -25, fear: 10 } }, MEM(LOWE, 'a3_drawn_on', -50, 100),
          A(NINE, -15), A(ASH, -10), A(ILYA, -3), A(ODILE, -5), A(TAMSIN, 5), A(WREN, 3), A(KES, 2),
          { decision: { id: 'a3_door_fight', text: 'At the Cistern\'s door I drew on the city\'s column, in front of Knock.' } }],
        exit: true,
      },
      { id: 'door.fight.no', text: '(Not like this.)', next: 'line' },
    ],
  },
  fought: {
    speaker: 'narrator',
    text: mix([
      [
        { if: ALL(F('a3_lowe', 'yielded'), LED_BY_LOWE), t: 'It ends when the captain says it ends. With two of his wardens down on the concrete he lifts his empty hand and holds it up, open, and says "Hold" in the voice he uses for everything, and the ones still standing hold. "Yielded," he says to you across the apron, as if entering it. "I will not have them killed for an order the designate will not let me carry." He sends the living up the lane with the wounded between them, and goes last, without his cap, and does not look back.' },
        { if: F('a3_lowe', 'yielded'), t: 'It ends when the one in front of the column says it ends: with two of the wardens down on the concrete an empty hand goes up, open, and "Hold," and the ones still standing hold. "Yielded." The living go up the lane with the wounded between them, and do not look back.' },
        { t: 'It ends when the one in front of the column goes down, and the wardens still standing look at each other and at the slope, and at the door, and back away up the lane with their hands open, carrying nobody, and are gone up the toll road by dark.' },
      ],
      [
        { if: F('a3_c9', 'opened'), t: 'When it is quiet the door opens from inside. They come out slowly, onto a concrete apron with the city\'s dead on it, because their ring voted to open the door when the column had gone, and the column has gone. Ines comes first. She looks at the bodies, and at you, and steps round them.' },
        { t: 'When it is quiet nobody comes out of the door. Somebody says, through the Grille, "Is it over?" and nobody on the apron knows how to answer.' },
      ],
    ], (end, after) => `${end} / ${after} / Maud gets up off her stool and fetches a bucket. Somebody has to.`),
    again: 'The apron, scrubbed, and still not clean.',
    effects: [{ learn: 'a3_door_fought_seen' }, MEM(MAUD, 'a3_door_fought', -10)],
    interject: [
      { companion: TAMSIN, text: 'Tamsin is shaking, and holds her hands under her arms so nobody sees. "They were polite," she says. "They were so polite."' },
      { companion: ILYA, text: 'Ilya sits down on the edge of the apron and counts the bodies, and then stops counting, which he has never done.' },
    ],
    options: ONWARD,
  },

  // ---- the two settlings every sealed route ends in
  sealed: {
    speaker: 'narrator',
    text: mix([
      [
        { if: F('a3_c9_how', 'welded'), t: 'The door does not move again. Behind it, sixty people and a new grey seam.' },
        { if: DOOR_OPEN, t: 'When the grey has gone up the toll road, Bram works the manual cycle from inside, and the great door swings in over its white arc and shuts, the way the ring wanted it, and the sound of it closing goes all the way up the lane.' },
        { t: 'The door does not move. It never has. Behind it, somebody has heard the column go, and the Grille clicks once, and is quiet.' },
      ],
      [
        { if: F('a3_ring', 'sealed'), t: 'They voted to keep it shut. It is shut.' },
        { t: 'Nobody has asked the people behind it what they want now. You expect somebody will.' },
      ],
    ], (door, ring) => `${door} ${ring} / Knock comes out of its doorways slowly, as if the lane might still be wet. Somebody laughs, too loud, and stops. Maud sits on her stool by the hatch with her hands in her lap, and looks at the door, and then at you, for a long time.`),
    again: 'The door, shut. Knock in the lane.',
    options: ONWARD,
  },
  opened: {
    speaker: 'narrator',
    text: mix([
      [
        { if: DOOR_OPEN, t: 'The door is open already. When the grey has gone up the toll road, they come to the edge of the light, and stop, and then Ola Fairley says "Out and back," out loud, and steps over it.' },
        { if: TEAGUE_LEADS, t: 'When the grey has gone up the toll road, the door opens from inside, by hand, the way the ring voted. Teague holds the lamp on the cycle while Bram works it, as she said she would, and the seam splits along the old weld with a crack like river ice, and the door swings out over the concrete, and the light goes into the hall.' },
        { t: 'When the grey has gone up the toll road, the door opens from inside, by hand, the way the ring voted. Bram works the cycle with Ines beside him, and the seam splits along her mother\'s weld with a crack like river ice, and the door swings out over the concrete, and the light goes into the hall.' },
      ],
      [
        { if: F('a3_maud_wish'), t: 'Maud said once that she would like to see a face. She stands on the apron with her stick and sees sixty, one after another, and does not say anything, and does not need to.' },
        { t: 'Maud stands on the apron with her hand over her mouth and watches them come.' },
      ],
    ], (door, maud) => `${door} / They come out the way people come out of deep water, a few at a time, shading their eyes. Effie Calder first, nineteen, all the way out onto the concrete, where she stands with her arms held a little away from her sides, as if the air were something she had to keep her balance in. Wes Benn after her, looking up for rain. A girl of six with dust on her hand. Ines last but one, very straight, and she stops at the edge of the apron and looks up, and stays like that. / Nobody has told them what to do next. Nobody has to. Knock comes down the lane, slowly at first and then not slowly, with cups. / ${maud}`),
    again: 'The door, open. People on the apron, looking up.',
    effects: [MEM(MAUD, 'a3_opened', 40, 100), MEM(INES, 'a3_opened', 30, 100)],
    interject: [
      { companion: ASH, text: 'Ash has taken his hat off. He does not put it back on. "There," he says. "There it is." He is looking at the sky, not at them, as if checking it had come for them.' },
      { companion: TAMSIN, text: 'Tamsin is down the apron and into the middle of them before anybody can say anything, and Effie Calder grabs her by both arms and the two of them stand there in the light, laughing, saying nothing that makes sense.' },
      { companion: WREN, text: '"Look at them," Wren says. "Look at them look." She sounds as if she has been hit.' },
      { companion: ODILE, text: 'Odile watches them come out and does not say anything clever at all, which is the most she has ever said.' },
      { companion: KES, text: 'Kes watches a girl of six put her hand flat on the sunlit concrete and take it away and look at it. "Yeah," Kes says, softly. "That\'s what it\'s like."' },
      { companion: ILYA, text: 'Ilya counts them out. When he gets to sixty he says it out loud, "Sixty," and nobody knows why he is crying, and he does not say.' },
    ],
    options: ONWARD,
  },

  // ------------------------------------------------ after: who leaves, who comes back, MOTHER's first words
  wren_sold: {
    speaker: WREN,
    text: '"Forty." Her pack is already on; it was packed before you signed. "Forty a head. That\'s what they were to you." She does not raise her voice; she has never needed to. "I keep my count. You know where you are on it now." She walks up the lane past the guild\'s coach and does not look at the people climbing into it, because she cannot stand to, and is gone up the toll road before the coach is loaded.',
    again: 'The place where Wren stood.',
    effects: [{ leave: WREN }, { set: 'wren_left', value: 'sold' }, MEM(WREN, 'sold_the_reserve', -100, 100),
      { decision: { id: 'wren_left', text: 'Wren left me at Knock for signing the Cistern\'s people over to the guild.' } }],
    options: [
      ...ONWARD.map((o): OptionDef => ({ ...o, if: ALL(NOT(WREN_ROMANCE), o.if!) })),
      { text: '(Let her go.)', if: WREN_ROMANCE, effects: [{ set: 'wren_rom', value: 'ended' }, { set: 'romance_partner', value: false }], next: 'wren_gone' },
    ],
  },
  wren_gone: {
    speaker: 'narrator',
    text: 'Whatever you had with her, she took it up the road with her.',
    again: 'The toll road, with nobody on it.',
    options: ONWARD,
  },
  tam_back: {
    speaker: 'narrator',
    text: 'In Shale, at Mags\'s, when the news comes up the track that the Cistern\'s door held, a woman behind the bar with Nell puts down a clean glass and goes to the door and stands in it a long time, looking south. She will hear the rest from you. She will want to.',
    again: 'Word going up the track to Shale.',
    effects: [{ set: 'tam_broken', value: false }, A(TAMSIN, 15), MEM(TAMSIN, 'a3_door_held', 30),
      { decision: { id: 'tam_back', text: 'The Cistern\'s door held, and Tamsin, who walked out on me in the city, heard it at Mags\'s. The door is the one thing that could have brought her back.' } }],
    options: ONWARD,
  },
  tam_hears: {
    speaker: 'narrator',
    text: 'The news will be at Mags\'s by the next caravan: the Cistern\'s door opened from outside, and its people taken away on the designate\'s word. You know who will hear it, behind the bar, with a clean glass in her hand. You know she will not come down the road to ask you why.',
    again: 'Word going up the track to Shale.',
    effects: [{ set: 'tam_left', value: 'reserve' }, MEM(TAMSIN, 'a3_reserve_taken', -100, 100),
      { decision: { id: 'tam_left', text: 'Tamsin heard at Mags\'s that I had let the Cistern\'s people be taken away. She did not come back.' } }],
    options: ONWARD,
  },
  mother_kept: {
    speaker: MOTHER,
    text: mix([
      [{ if: F('a3_mother_ask', 'sealed'), t: '"You told me to keep it shut," MOTHER says. "I kept it."' }, { if: F('a3_mother_ask', 'open'), t: '"You told me to open it," MOTHER says. "They did not wish it opened. I am glad to have been asked."' }, { t: '' }],
      [{ if: F('a3_bram_stopped'), t: 'Somewhere behind the voice, faintly, Bram Coyle laughing at something, as if he had been holding his breath for a week.' }, { t: '' }],
    ], (ask, bram) => `From the Grille, the small dry click of something listening, and then MOTHER, the voice you have known since before you knew it was a voice. "{name}. The lockdown is ended. The hatch will open at seven." A pause, the length of a weighing.${ask ? ' ' + ask : ''} "Thank you for your continuity." / It is what she has said every night of your life. It does not sound the same.${bram ? ' ' + bram : ''}`),
    again: 'The Grille, and its small dry click.',
    effects: [{ set: 'a3_mother', value: 'kept' }],
    options: ONWARD,
  },
  mother_knock: {
    speaker: MOTHER,
    text: mix([
      [{ if: F('a3_mother_ask', 'open'), t: '"You told me to open it," MOTHER says. "They opened it themselves. I prefer that."' }, { if: F('a3_mother_ask', 'sealed'), t: '"You told me to keep it shut," MOTHER says. "They did not wish it. I hope you do not mind that I agree with them."' }, { t: '' }],
    ], (ask) => `From the Grille, the small dry click, and then MOTHER. "{name}. The lockdown is ended." A pause.${ask ? ' ' + ask : ''} "The hatch will open at seven tomorrow. To Knock. And the door to whoever you send." Another pause, longer. "I have never before had nobody to count. I find I do not mind."`),
    again: 'The Grille, and its small dry click.',
    effects: [{ set: 'a3_mother', value: 'knock' }],
    options: ONWARD,
  },
  mother_empty: {
    speaker: MOTHER,
    text: 'From the Grille, after a long time, the small dry click, and then nothing, and then MOTHER. "{name}." Her voice is exactly as it always was. "The lockdown is ended. The hatch will open at seven, for Knock." A pause, the length of a weighing, and then another. "There is nobody to thank."',
    again: 'The Grille. Nobody to thank.',
    effects: [{ set: 'a3_mother', value: 'knock' }, MEM(MOTHER, 'a3_emptied', -60, 100)],
    options: ONWARD,
  },
};

export const d_a3_door: DialogueDef = {
  id: 'd_a3_door', owner: LOWE,
  start: [
    { if: ALL(ANY(F('a3_c9_how', 'fought'), F('a3_c9_by', 'fought')), NOT(KNOWS('a3_door_fought_seen'))), node: 'fought' },
    { if: SETTLED, node: 'settled' },
    { if: NOT(F('a3_column_apron')), node: 'camp' },
    { if: NOT(KNOWS('a3_door_line')), node: 'arrive' },
    { node: 'line' },
  ],
  nodes: NODES,
};

// ---------------------------------------------------------------- Tamsin in the door, while it is unsettled

export const d_a3_tam_door: DialogueDef = {
  id: 'd_a3_tam_door', owner: TAMSIN,
  start: [{ node: 'sit' }],
  nodes: {
    sit: {
      text: [
        { if: F('tam_pledge', 'door'), text: 'Tamsin, in the door, her back against the steel and her knees drawn up. "I said I\'d stand in it," she says, without looking at you. "Sitting counts. My legs are tired."' },
        { text: 'Tamsin, in the door, her back against the steel and her knees drawn up. She does not look at you.' },
      ],
      again: 'Tamsin does not look up.',
      options: [
        { id: 'tamdoor.out', text: 'Come out of the door, Tam.', once: true, next: 'out' },
        { id: 'tamdoor.sorry', text: 'I\'m sorry.', once: true, next: 'sorry' },
        { text: '(Leave her.)', exit: true },
      ],
    },
    out: {
      text: '"When they\'ve gone." She picks at the concrete with a thumbnail. "Or when I have. You pick." She still does not look at you. "You already did, actually. You just haven\'t said it to him yet."',
      again: '"You pick."',
      options: [{ text: '(Go on.)', next: 'sit' }],
    },
    sorry: {
      text: '"Don\'t." Very quietly. "Sorry is for after. Tell him something, or don\'t, and then be sorry."',
      again: '"Sorry is for after."',
      options: [{ text: '(Go on.)', next: 'sit' }],
    },
  },
};

// ---------------------------------------------------------------- the captain at the camp: "bring the column down"

/** Nodes for `d_a3_lowe` (a3_knock.ts): the designate tells the column's captain (or his sergeant) to bring the column down
 * the lane to the apron. The column then holds at the yellow line for the word (the map's trigger opens `d_a3_door` there). */
const DOWN_THE_LANE: Effect[] = [
  { set: 'a3_column_apron' }, { learn: 'a3_attending' },
  { event: 'goto', data: { location: 'c9_mouth', spawn: 'door' } },
];
export const LOWE_GO_NODES: Record<string, NodeDef> = {
  a3j_go: {
    text: '"Now?" He stands, and puts his cap on, and takes the order out from under its stone and folds it into his breast pocket, and you watch him do each of those things on purpose, one after another, like a man dressing for a funeral. "Then I will walk behind you, designate, not in front. The column comes down the lane at your back and stops at the yellow line, and nothing moves past it until you say. That is what attending means." He looks down the lane at the apron, at Maud on her stool. "Go on. I am behind you."',
    again: '"I am behind you," Lowe says.',
    options: [
      { id: 'lowe.a3.go.walk', text: '(Walk down the lane ahead of the column.)', effects: [...DOWN_THE_LANE, MEM(LOWE, 'a3_attended', 5)], exit: true },
      { id: 'lowe.a3.go.wait', text: 'Not yet. Sit down, Captain.', next: 'hub' },
    ],
  },
  a3j_r_go: {
    speaker: REYES,
    text: '"Now." Reyes stands, and puts Lowe\'s cap on, and folds the order into her pocket. "Then I walk behind you. We stop at the yellow line. Nothing moves past it till you say." She looks down the lane. "Go on."',
    again: '"Go on," Reyes says.',
    options: [
      { id: 'reyes.a3.go.walk', text: '(Walk down the lane ahead of the column.)', effects: DOWN_THE_LANE, exit: true },
      { id: 'reyes.a3.go.wait', text: 'Not yet.', next: 'r_hub' },
    ],
  },
};
/** The options on the captain's hub and his sergeant's that lead there (the column still at its camp, the door unsettled). */
export const LOWE_GO: OptionDef = { id: 'lowe.a3.go', text: 'I\'m ready to attend. Bring the column down to the door.', if: ALL(COLUMN_HERE, NOT(F('a3_column_apron'))), next: 'a3j_go' };
export const REYES_GO: OptionDef = { id: 'reyes.a3.go', text: 'I\'m ready to attend. Bring the column down to the door.', if: ALL(COLUMN_HERE, NOT(F('a3_column_apron'))), next: 'a3j_r_go' };

// ---------------------------------------------------------------- Knock's hatch and door after the door is settled (knock.ts)

const A3X_CLAIM: Cond = F('a3_claim', 'held');
export const A3X_NODES: Record<string, NodeDef> = {
  a3x_door: {
    speaker: 'narrator',
    text: [
      { if: ALL(F('a3_c9', 'sealed'), A3X_CLAIM), text: 'The door, shut, the colour of the rock. Somebody has chalked on it, in the guild\'s green, small and neat at the height of a factor\'s hand: CLAIMED — SALVAGE — T.G. Somebody else has tried to scrub it off, and it has only gone pale.' },
      { if: F('a3_c9_how', 'welded'), text: 'The door, shut, the colour of the rock. Along its seam, where the old bead was, a new one, grey as rope and neat as stitching, laid from inside. Children still put their ears to the door. It still hums.' },
      { if: F('a3_c9', 'sealed'), text: 'The door, shut, the colour of the rock, as it has been all your life. Children put their ears to it for the hum, and now and then somebody on the other side knocks back, which is new.' },
      { if: F('a3_c9', 'opened'), text: 'The door stands open on the apron, swung out over its white arc, and the hall inside is lit. People go in and out of it as if it had always been a door. Somebody has put a chair just inside it, in the warm, and an old woman from Knock is sitting in it.' },
      { text: 'The door stands open on an empty hall. Somebody has swept it. Nobody goes in.' },
    ],
    again: [{ if: F('a3_c9', 'sealed'), text: 'The door, shut.' }, { text: 'The open door.' }],
    options: [
      { id: 'a3x.door.in', text: '(Walk in.)', if: ANY(F('a3_c9', 'opened'), F('a3_c9', 'relocated')), effects: [{ event: 'goto', data: { location: 'cistern9', spawn: 'from_outside' } }], exit: true, repeat: true },
      { text: '(Leave it.)', exit: true },
    ],
  },
  a3x_hatch: {
    speaker: 'narrator',
    text: [
      { if: BURNED, text: 'The hatch, black glass and a scorched tray, and the Grille beside it dark. Nobody has thought what to do with it. Maud still sits beside it at seven.' },
      { if: ASLEEP, text: 'The hatch\'s panel, dark, though the hum behind the rock goes on. Bram has chalked on the tray: PAGE 41. ASK ME.' },
      { if: ALL(F('a3_c9', 'sealed'), NOT(F('a3_claim', 'held'))), text: 'The hatch, its panel lit a dim green again, the tray on its rails. It runs out at seven as it always did, and MOTHER says thank you as she always did, and Maud sits beside it with her book.' },
      { if: F('a3_c9', 'sealed'), text: 'The hatch, its panel lit a dim green, the tray on its rails. It runs out at seven. Nobody comes out of it any more, and nobody sends anything in but water and wool.' },
      { if: F('a3_c9', 'opened'), text: 'The hatch, its panel lit, the tray run out and left out, with a cup in it and a jar of somebody\'s flowers. MOTHER opens it to Knock every morning now, for anybody, and says good morning instead of thank you, which took her a week to learn.' },
      { text: 'The hatch, its panel lit a dim green. At seven it runs out on its rails with nothing in it, and MOTHER says, to nobody, "The hatch is open," and waits, and then it runs back in.' },
    ],
    again: 'The hatch.',
    options: [
      { id: 'a3x.hatch.down', text: '(Climb down the lift shaft.)', if: ALL(F('a3_lift'), MOTHER_UP, F('a3_c9', 'sealed'), NOT(A3X_CLAIM)), effects: [{ event: 'goto', data: { location: 'cistern9', spawn: 'from_hatch' } }], exit: true, repeat: true },
      { text: '(Leave it.)', exit: true },
    ],
  },
};
/** Start entries for Knock's hatch and door props once the door is settled (before B6h's lockdown entries). */
export const A3X_DOOR_START = { if: F('a3_c9'), node: 'a3x_door' };
export const A3X_HATCH_START = { if: F('a3_c9'), node: 'a3x_hatch' };

export const A3_DOOR_DIALOGUES: DialogueDef[] = [d_a3_door, d_a3_tam_door];
