import type { DialogueDef, NodeDef, OptionDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ALLY, ASH, CARRIED_WEST, ILYA, IN, KES, LED_BY_LOWE, LED_BY_REYES, LINNET_COLUMN, LOWE, MOTHER_DARK, NINE, ODILE, PLATFORM_OPEN,
  RESERVE_STAYED, TAM_AT_BUFFER, TAM_AT_KNOCK_AFTER, TAM_FOLLOWED, TAM_IN_CARRICK, TAM_STOOD, TAMSIN, TEAGUE_LEADS, WREN,
} from '../world/a3_conds';
import { CRADLE_RUNS } from './md_docks';

/**
 * After the door (B6k, Act 3 beat 20f, and Knock once 20e is settled).
 *
 * - **The platform** (`d_a3_platform`, `q_a3_platform` "Sixty at the Buffer"): when the reserve is carried west to the city in
 *   the wardens' car (the designate's word, the word forced over the door, or the ring's own vote to go: `CARRIED_WEST`; the
 *   guild's paper goes up the guild's own road and never reaches Carrick), Precinct Supply receives it where the city receives
 *   everything it takes in, on the quay at Carrick: the car stands backed up to the Line's buffer under the freight shed, beside
 *   the engine Sixty. The receipt is the last line of the order and wants the designate's word, so the column's lead holds the
 *   car there, fed and watered, until the designate comes (nothing resolves unasked). Three ways off it: the Harbour court at
 *   six (a person landed on this quay is a passenger, never the city's supply: no check with the court's own finding, else
 *   Speech 45 with the Harbour Master), the Stand (the dockers black the car until the wardens stand back), or the Hulls by
 *   night (down the river stairs while the cradle's lamp draws every eye, and into the crew books). Or the designate's word to
 *   Supply. `a3_c9_after` = walked | held; `a3_buffer_how` = court | stand | cradle.
 * - **Tamsin after the door** (`d_a3_tam_after`): a Tamsin who walked into the door over the designate's word and lives is
 *   placed where the door left her: on Knock's apron by the door, or behind the car to the city and with them after.
 * - **Knock after** (spread into the trees B6f wrote: Maud, Corin, Linnet, Knock's others, the Grille): each by how the door
 *   was settled, with MOTHER opening the hatch to Knock; the residents on the apron after an opened door (`d_a3_ap_*`); and the
 *   residents inside after a sealed one (spread into B6h's trees).
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (20f) and "As built" → B6k.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const KNOWS = (k: string): Cond => ({ knows: k });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
const MEM = (npc: string, tag: string, valence: number, strength = 90): Effect => ({ memory: { npc, tag, valence, strength } });

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

const DAHL = 'npc_dk_01', CONNIE = 'npc_dk_02', KOBBY = 'npc_dk_07';
const INES = 'npc_c9_01', MOTHER = 'npc_c9_05';
const OLA = 'npc_c9_r1', WES = 'npc_c9_r2', SAYER = 'npc_c9_r3', EFFIE = 'npc_c9_r4';
const MAUD = 'npc_kn_maud', CORIN = 'npc_kn_corin', LINNET = 'npc_kn_linnet';

// ---------------------------------------------------------------- how the door was settled

const C9 = (v: string): Cond => F('a3_c9', v);
const HOW = (v: string): Cond => F('a3_c9_how', v);
const SEALED = C9('sealed'), OPENED = C9('opened'), RELOCATED = C9('relocated');
const CONSENT = HOW('consent'), FORCED = HOW('forced'), SOLD = HOW('sold');
const CLAIMED = F('a3_claim', 'held');
const TAM_DEAD = F('a3_tamsin_dead');
const AFTER = (v: 'walked' | 'held'): Cond => F('a3_c9_after', v);
const BY = (v: 'court' | 'stand' | 'cradle'): Cond => F('a3_buffer_how', v);
/** Anything after the door, at Knock: these gate the lockdown's topics off and the after's on (exported for B6f's trees). */
export const LOCKDOWN_ONLY: Cond = NOT(F('a3_c9'));
export const DOOR_SETTLED: Cond = F('a3_c9');

const leave: OptionDef = { text: '(Leave it.)', exit: true };

// ================================================================ 20f the platform: Carrick's buffer

const DARK: Cond = { hour: { from: 20, to: 4 } };
const DAHL_HERE: Cond = NOT({ dead: DAHL });
const CONNIE_HERE: Cond = NOT({ dead: CONNIE });
/** The cradle and the Hulls are there to use: the cable not cut, the bed not cleared, the winchman alive. */
const HULLS_OK: Cond = ALL(CRADLE_RUNS, NOT(F('dk_hulls', 'cleared')), NOT({ dead: KOBBY }));
const CRADLE_KNOWN: Cond = ANY(KNOWS('dk_cradle_known'), KNOWS('dk_cradle_seen'), KNOWS('dk_cradle_heard'), KNOWS('dk_hulls_seen'), F('dk_kobby_met'));
/** The Stand owes the player (it stood on the line for them at Crane Six), whether or not it was written to for the city's night. */
const STAND_OWES: Cond = ANY(ALLY('stand'), F('dk_stand_owed'));

type Mod = { if: Cond; dc: number; why: string };
const COURT_MODS: Mod[] = [
  { if: { trust: { npc: DAHL, gte: 20 } }, dc: -10, why: 'the Harbour Master trusts you' },
  { if: IN(NINE), dc: -10, why: 'Nine reads Schedule 2\'s forty definitions aloud, a beat behind her' },
  { if: KNOWS('dk_act_read'), dc: -10, why: 'you have read the Act under the glass: a ship\'s stores, and no persons' },
  { if: ANY(F('dk_crane', 'bond'), F('dk_weighbridge', 'on')), dc: -5, why: 'the Harbour Master has ruled for you before' },
  { if: F('prec_unrecorded', 'yields'), dc: -5, why: 'the city\'s own court says the record yields to a living person' },
  { if: RESERVE_STAYED, dc: -5, why: 'the Court of Accounts stayed this order once' },
];
const CRADLE_MODS: Mod[] = [
  { if: ALL(LED_BY_LOWE, { trust: { npc: LOWE, gte: 25 } }), dc: -10, why: 'Lowe walks to the far end of the platform to look at the engine, for an hour' },
  { if: ANY({ trust: { npc: KOBBY, gte: 10 } }, F('dk_hulls', 'crewed')), dc: -10, why: 'the Hulls owe you' },
  { if: F('dk_cradle_ridden'), dc: -5, why: 'you have ridden the basket; you know its lamp' },
  { if: IN(WREN), dc: -5, why: 'Wren has done this kind of night before' },
  { if: LED_BY_REYES, dc: 10, why: 'Reyes walks the length of the car every hour, all night' },
];

const DECIDE = (text: string): Effect => ({ decision: { id: 'a3_c9_after', text } });
const NEWS = (tag: string, text: string, valence: number, size = 7): Effect => ({ news: { tag, text, valence, size, at: 'meridian' } });
/** Off the car and free in the city: the residents' own good, and the companions'. */
const WALKED = (how: 'court' | 'stand' | 'cradle'): Effect[] => [
  { set: 'a3_c9_after', value: 'walked' }, { set: 'a3_buffer_how', value: how }, { xp: 200 },
  MEM(INES, 'a3_walked_off', 30), A(TAMSIN, 10), A(ASH, 5), A(KES, 5), A(ILYA, 3), A(WREN, 3), A(ODILE, 2),
];
const COURT_FX: Effect[] = [
  { until: 18 }, ...WALKED('court'), { set: 'dk_prec_passenger' }, TRUST(DAHL, 5), { rep: { faction: 'wardens', respect: -5 } }, A(NINE, 5),
  DECIDE('At Carrick\'s buffer the Harbour court found the Cistern\'s people passengers, not the city\'s supply, and they walked off the wardens\' car into the city.'),
  NEWS('a3_buffer_court', 'the Harbour court at the Docks ruled the Cistern\'s people passengers, not city supply, and the wardens let them off the car', 6),
];
const STAND_FX: Effect[] = [
  ...WALKED('stand'), TRUST(CONNIE, 5), { rep: { faction: 'wardens', respect: -10 } }, { rep: { faction: 'tollmen', respect: -5 } }, A(WREN, 3),
  DECIDE('At Carrick\'s buffer the Stand blacked the wardens\' car until the column stood back, and the Cistern\'s people walked off it into the city.'),
  NEWS('a3_buffer_stand', 'the Stand at the Docks stopped the cranes and stood along the platform until the city\'s wardens let the Cistern\'s people go', 7),
];
const CRADLE_FX: Effect[] = [
  ...WALKED('cradle'), TRUST(KOBBY, 10), A(WREN, 3),
  DECIDE('At Carrick the Cistern\'s people came out of the wardens\' car in the dark, down the river stairs into the Hulls, while the cradle\'s lamp went over the dry river. Kobby Ofori wrote them into the Star\'s crew book.'),
  NEWS('a3_buffer_cradle', 'the city\'s car at the Docks was found empty in the morning, and the Hulls have more crew than they had', 3, 4),
];
const HELD_FX: Effect[] = [
  { set: 'a3_c9_after', value: 'held' }, MEM(INES, 'a3_received', -40), MEM(LOWE, 'a3_received', -5, 70),
  A(TAMSIN, -15), A(ASH, -10), A(KES, -10), A(WREN, -5), A(ILYA, -5), A(ODILE, -3),
  DECIDE('At Carrick\'s buffer I gave Precinct Supply my word, and the Cistern\'s people were received into the city.'),
  NEWS('a3_buffer_held', 'the Cistern\'s people were received at the Docks as Precinct supply, on the designate\'s word', -5),
];

// ---- text by axis

const CAR: Part[] = [
  { if: CONSENT, t: 'The relocation car stands backed up to the buffer stop at the end of the freight shed, the way the guild\'s lorries back up to be unloaded: the long grey Precinct lorry with its canvas roof on hoops and RESERVE 9 — PRECINCT SUPPLY — CAPACITY 60 stencilled on the tailboard. The tailboard is down. Nobody has chained it. The people who came in it sit along the platform\'s edge with their bundles on their knees, and on every bundle a name, written in its owner\'s hand.' },
  { t: 'The relocation car stands backed up to the buffer stop at the end of the freight shed, the way the guild\'s lorries back up to be unloaded: the long grey Precinct lorry with its canvas roof on hoops and RESERVE 9 — PRECINCT SUPPLY — CAPACITY 60 stencilled on the tailboard. The tailboard is up and chained. Through the slats in its sides, faces, in issued grey, close together, looking up at a roof of iron frames with the glass long gone out of them.' },
];
const CAR_FORCED: Part[] = [{ if: FORCED, t: ' Nobody in the car speaks above a whisper. All of them saw the door.' }, { t: '' }];
const CAR_LEAD: Part[] = LEAD_P(
  ' Captain Lowe sits on an upturned crate at the tailboard with his cap on his knee. He has shaved. He stands when he sees you, and uncovers. "Designate."',
  ' Sergeant Reyes stands at the tailboard in Lowe\'s cap with her arms folded, and does not unfold them. "Designate."',
  ' Warden Kress sits on the tailboard\'s step with the order in both hands and looks up at you as if you might be able to tell him what it says. "Designate."',
);
const CAR_TAM: Part[] = [
  { if: TAM_AT_BUFFER, t: ' On the concrete beside the car, cross-legged against its back wheel, a woman with copper hair hacked short is talking through the slats in a low voice. She sees your boots, and does not look up.' },
  { t: '' },
];
const CAR_LIN: Part[] = [
  { if: LINNET_COLUMN, t: ' Cadet Ferrow sits at the far end of the tailboard with her clipboard on her knees. Every hour, Kress says later, she reads the sheet aloud to the car, every name, so that somebody in the grey has said them that day.' },
  { t: '' },
];

const PLATFORM_NODES: Record<string, NodeDef> = {
  none: {
    speaker: 'narrator',
    text: 'Sixty at the buffer, drinking at the water column, and behind her nothing but the buffer stop and the lamp on it that is lit day and night.',
    again: 'Sixty at the buffer, drinking.',
    options: [leave],
  },
  arrive: {
    speaker: 'narrator',
    text: mix([CAR, CAR_FORCED, CAR_LEAD, CAR_TAM, CAR_LIN], (car, forced, lead, tam, lin) =>
      `${car}${forced} / Beyond the car a trestle has been set up under the shed's last lamp with a board on it, PRECINCT SUPPLY — RECEIVING, and a clerk's stool with nobody on it; out past the shed's mouth, on the river road, two Precinct vans wait with their engines off. Sixty, the Line's engine, stands at the water column drinking, as she does every morning, as if nothing were behind her.${lead}${tam}${lin}`),
    again: 'The car at the buffer, the trestle, the vans on the river road.',
    effects: [{ learn: 'a3_buffer_seen' }, { quest: 'q_a3_platform', start: true }],
    interject: [
      { companion: NINE, text: '"Received at Carrick," Nine says. "Everything the city takes in is entered on the quay; the schedule calls them supply, and supply is received where supply comes in." It looks at the board on the trestle. "I had not expected it to be a trestle."' },
      { companion: KES, text: 'Kes looks past the car at the vans on the river road. "That\'s the grading," she says. "That\'s the bit after. I know what the bit after looks like."' },
      { companion: ASH, text: 'Ash looks up through the empty frames of the roof for a long time. "At least they can see it from in there," he says. "It isn\'t enough. It\'s something."' },
      { companion: WREN, if: NOT(CONSENT), text: 'Wren goes to the slats before anybody can stop her and puts her burned hand flat on them. Somebody inside puts a hand against it from the other side, and she does not take hers away.' },
      { companion: WREN, text: 'Wren sits down on the platform\'s edge beside the nearest of them without asking, and after a while the woman next to her breaks a heel of bread in two and gives her half, and Wren eats it.' },
      { companion: ILYA, if: NOT(CONSENT), text: 'Ilya counts the slats, and then the faces between them, and stops counting before he gets to the end.' },
      { companion: ILYA, text: 'Ilya counts the bundles along the platform\'s edge, and the names on them, and stops counting before he gets to the end.' },
      { companion: ODILE, text: '"A receiving board," Odile says. "The city does like to be sure what it has been given."' },
    ],
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  car: {
    speaker: 'narrator',
    text: LEAD(
      'Lowe at the tailboard, his cap under his arm. "Supply receives on your word, designate," he says. "Not before."',
      'Reyes at the tailboard, arms folded. "It\'s your word they want," she says. "I\'ll wait for it."',
      'Kress at the tailboard with the order. "They want your name on the receipt," he says. "I\'ll wait. The captain would have waited."',
    ),
    again: LEAD(
      '"Designate," Lowe says at the tailboard, and waits, as he waits for everything.',
      '"Designate," Reyes says.',
      '"Designate," Kress says, and looks at the receiving board as if it might do something on its own.',
    ),
    options: [
      { id: 'buf.why', text: [{ if: LED_BY_LOWE, text: 'Why wait for me, Captain?' }, { if: LED_BY_REYES, text: 'Why wait for me, Sergeant?' }, { text: 'Why wait for me?' }], once: true, next: 'why' },
      { id: 'buf.receipt', text: 'What happens at the receipt?', once: true, next: 'receipt' },
      { id: 'buf.slats', text: [{ if: CONSENT, text: '(Go and sit with them on the platform\'s edge.)' }, { text: '(Go to the slats.)' }], once: true, next: 'slats' },
      { id: 'buf.ask', text: '(Ask them what they want, now they have seen this end of the road.)', if: CONSENT, once: true, next: 'ask' },
      { id: 'buf.court.prec', text: '(Take it to the Harbour court at six. The court has already found a person landed on this quay a passenger.)', if: ALL(DAHL_HERE, F('dk_prec_passenger')), effects: COURT_FX, next: 'court' },
      {
        id: 'buf.court', text: '(Take it to the Harbour court at six: a person landed on this quay is a passenger, never the city\'s supply.)', if: ALL(DAHL_HERE, NOT(F('dk_prec_passenger'))), once: true,
        check: { skill: 'speech', dc: 45, mods: COURT_MODS }, effects: [...COURT_FX, { set: 'a3_buffer_found' }], failEffects: [{ until: 18 }, { set: 'a3_buffer_court', value: 'adjourned' }], next: 'court', fail: 'court_no',
      },
      { id: 'buf.stand', text: '(Go to the Stand and ask Constance Okoye.)', if: ALL(STAND_OWES, CONNIE_HERE), effects: STAND_FX, next: 'stand' },
      {
        id: 'buf.cradle', text: '(Get them out of the car tonight and down the river stairs to the Hulls, with Kobby Ofori\'s cradle for a lamp.)', if: ALL(DARK, HULLS_OK, CRADLE_KNOWN, NOT(F('a3_buffer_watched'))), once: true,
        check: { skill: 'stealth', dc: 45, mods: CRADLE_MODS }, effects: CRADLE_FX, failEffects: [{ set: 'a3_buffer_watched' }], next: 'cradle', fail: 'cradle_no',
      },
      { id: 'buf.cradle.day', text: '(Kobby Ofori\'s cradle runs at night.)', if: ALL(NOT(DARK), HULLS_OK, CRADLE_KNOWN, NOT(F('a3_buffer_watched'))), once: true, next: 'cradle_day' },
      { id: 'buf.held', text: 'Let Supply receive them.', next: 'held_warn' },
      { id: 'buf.later', text: '(Not yet.)', exit: true, repeat: true },
    ],
  },
  why: {
    speaker: 'narrator',
    text: mix([
      LEAD_P(
        '"Because the order says your attendance, and I have read it forty times, and I read that as your word." He turns the cap round once in his hands. "It executed at Knock. It has one line left, RECEIVED, and the receiving is the chair\'s as well: the first act of the chair, from the beginning of it to the end. Supply\'s clerk will not take delivery without your name. I could find somebody to sign for you. I have found that I cannot." He looks at the slats. "Silence is not a word, designate. I said that to you at Knock. I will hold them here, fed and watered, until I hear one."',
        '"The order says your attendance. He read that as your word. So do I." She jerks her chin at the trestle. "Supply\'s clerk won\'t sign without your name, and I won\'t sign for you. They\'re fed. They sleep under the canvas. We wait."',
        '"The captain would have," Kress says. "Waited. For you. So I\'m waiting." He looks at the order as if it might have changed since he last looked. "Supply\'s clerk won\'t take them without your name. I asked him twice."',
      ),
      [{ if: CONSENT, t: ' / "They came on their own feet," and it is said looking at the people on the platform\'s edge, not at you. "And they are still supply until somebody signs that they are. That is the order too."' }, { t: '' }],
    ], (lead, consent) => `${lead}${consent}`),
    again: '"Until I hear a word," at the tailboard.',
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  receipt: {
    speaker: 'narrator',
    text: LEAD(
      '"The vans take them round by the river road to the Hospice block, inside the Wall. By morning they are graded. By the end of the week they are on the rolls." He does not soften it; he never has. Then, lower: "This is the Harbour Master\'s quay, designate. On this side of the dry river the Ledger enforces one book, and it is not the one in my pocket. I mention it because it is true."',
      '"The vans. The river road. The Hospice block, graded by morning." She looks across the quay at the Customs House. "Not my quay, this. The Ledger keeps the Harbour Act here and nothing else. The captain used to say that like it was a joke."',
      '"Vans to the Hospice block. Graded." He swallows. "The captain told me once this side of the river isn\'t ours. The Ledger keeps somebody else\'s book here. I don\'t know whose. The woman in the Customs House would."',
    ),
    again: '"Graded by morning," at the tailboard.',
    effects: [{ learn: 'a3_buffer_receipt' }],
    interject: [
      { companion: NINE, text: '"Schedule 4," Nine says. "Fit for work, fit for study, fit for neither." A pause measured to the tick. "And Carrick is under the Harbour Act. The Ledger enforces the concession here and nothing else. I have said so to the Harbour Master. She agreed with me, which I enjoyed."', effects: [A(NINE, 2)] },
      { companion: KES, text: '"Graded by morning," Kes says. "Quicker than the Skirts. We had to queue."' },
    ],
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  slats: {
    speaker: 'narrator',
    text: mix([
      [
        { if: FORCED, t: 'Through the slats, Ines Halloran, sitting very straight on bench one with her hands folded. She looks at you for a long time. "She was in the door," she says. "I have known her since she was born at thirty weeks in a room with no window. She was in the door." Behind her somebody is crying in the steady, practised way of people who have done it since Knock. Effie Calder has her face against the slats at the far end and does not turn it.' },
        { if: CONSENT, t: 'On the platform\'s edge among the bundles, Ines Halloran sits with her hands folded and her face turned up to the empty iron frames of the roof. "Two days on the road," she says. "Every hour of it under the sky. I did not know it moved so much." Then: "The clerk has told us about the grading. He was very polite about it. Nobody said grading at the table." Beside her Effie Calder has taken her boots off to feel the concrete, and is pretending she has not.' },
        { t: 'Through the slats, Ines Halloran on bench one, very straight, her hands folded. "So this is the city," she says, looking past you at the shed\'s broken roof. "I had expected more of it." Then, without changing her voice: "We have been counted every quarter for ninety years. I had thought being moved would feel different from being counted. It does not." At the far end Effie Calder has her face pressed to the slats, watching Sixty drink at the water column. "Forty-one bolts in the door," she says, to nobody. "I went past the line in the end. In a lorry."' },
      ],
      [
        { if: TAM_AT_BUFFER, t: ' / Tamsin, against the wheel, says without looking up: "All the way from Knock, behind the car. I\'m not on the sheet, so I\'m not anything they\'re allowed to stop. So I walked." She puts her palm flat on the slat by Effie\'s face. "Get them off this car. If you can\'t, go away."' },
        { t: '' },
      ],
    ], (them, tam) => `${them}${tam}`),
    again: [{ if: CONSENT, text: 'The platform\'s edge, and the bundles with names on them.' }, { text: 'The slats, and the faces behind them.' }],
    interject: [
      { companion: ILYA, text: 'Ilya crouches by the slats and says nothing at all, and after a while a boy of about nine puts two fingers through a gap, and Ilya holds them.' },
      { companion: ODILE, text: 'Odile does not go near the slats. "I have sold a great many things I never had to look at," she says. "This is the first time I have been made to stand beside the lot."' },
    ],
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  ask: {
    speaker: INES,
    text: [
      { if: TEAGUE_LEADS, text: '"What we want." Ines considers it as she considers everything, as if it were a vote she no longer has the chair of. "We wanted the city because it has clinics, and the sky, and because a door that only opens one way is a cell however kind the warden. We did not want to be graded. Teague stayed with the door, and I let her think I was the brave one." She looks at Sayer Quist, who sits apart with his hand flat over his ribs. "Sayer will go in. He wants a name for what is under his hand, and the Hospice has the only doctors who could give it one. That is his to choose. The rest of us would like to walk off this platform on our own feet, as we walked onto it. If there is a way that is not the van, we would like to hear it. If there is not, we will get into the van. We are very good at waiting."' },
      { text: '"What we want." Ines considers it as she considers everything, as if it were a vote. "We wanted the city because it has clinics, and the sky, and because a door that only opens one way is a cell however kind the warden. We did not want to be graded. Nobody said grading at the table." She looks at Sayer Quist, who sits apart with his hand flat over his ribs. "Sayer will go in. He wants a name for what is under his hand, and the Hospice has the only doctors who could give it one. That is his to choose. The rest of us would like to walk off this platform on our own feet, as we walked onto it. If there is a way that is not the van, we would like to hear it. If there is not, we will get into the van. We are very good at waiting."' },
    ],
    again: '"We are very good at waiting," Ines says.',
    effects: [{ learn: 'a3_buffer_asked' }],
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  court: {
    speaker: 'narrator',
    text: mix([
      [
        { if: ANY(F('dk_dahl_met'), KNOWS('dk_court_sat')), t: 'Six o\'clock on the Customs House steps, at the change of shift. Henrike Dahl comes out with the Act under her arm and sits on the top step with it open on her knee, as she does every evening, and the quay comes to watch, as it does when there is something worth watching. You tell her what is standing at her buffer.' },
        { t: 'Six o\'clock on the Customs House steps, at the change of shift: a woman of fifty-odd in a guild factor\'s coat comes out with a framed book\'s loose pages under her arm and sits on the top step with them open on her knee, and the quay comes to watch. "Henrike Dahl. Harbour Master, by the Act," she says. "Say it plainly." You tell her what is standing at her buffer.' },
      ],
      [
        { if: F('a3_buffer_found'), t: 'You put it to her: the city\'s order calls these people supply, and on this quay supply is a word the Act already has. She turns to Schedule 2 and reads it aloud, all of it, slowly, while the shift changes behind you: cargo; livestock; mails; a ship\'s stores; ballast; and their forty definitions. Then she closes it on her finger. "Stores are a ship\'s," she says. "These are nobody\'s ship\'s. No persons." She looks down the steps at the column. "Finding. A person landed on this quay is a passenger. A passenger carried here on the Precinct\'s own road has had her fare paid by the Precinct."' },
        { if: F('dk_girl', 'ruled'), t: 'She does not open the Act. "This court has found that a person landed on this quay is a passenger," she says. "It found it for a girl of fifteen off the through, and it does not find a thing twice. It reads it." She reads it, from memory, to the column at the foot of the steps.' },
        { if: F('ln_calla_how', 'harbour'), t: 'She does not open the Act. "This court has found that a person landed on this quay is a passenger," she says. "It found it for a sister of the Choir in a car like that one, and it does not find a thing twice. It reads it." She reads it, from memory, to the column at the foot of the steps.' },
        { t: 'She does not open the Act. "This court has found that a person landed on this quay is a passenger," she says. "It does not find a thing twice. It reads it." She reads it, from memory, to the column at the foot of the steps.' },
      ],
      LEAD_P(
        'Lowe stands at the foot of the steps with his cap under his arm and the order in his hand, and when she has finished he unfolds it once more and reads its last line, and folds it, and puts it away. "The Ledger enforces the Harbour Act on this quay," he says, "and nothing else." He says it to his wardens, not to you. "Fold the trestle."',
        'Reyes hears it out at the foot of the steps with her arms folded, and asks to see the Act, and is shown it, and reads the page twice. "Right," she says. "Fold the board." It costs her something to say, and she says it anyway.',
        'Kress listens with his mouth a little open. When Dahl has finished he looks round for somebody to ask, and there is nobody, and he says, "Then that\'s that, isn\'t it," and goes to fold the receiving board himself.',
      ),
    ], (open, finding, lead) => `${open} ${finding} / ${lead}`),
    again: 'The Customs House steps, and the Act on the Harbour Master\'s knee.',
    interject: [
      { companion: NINE, text: 'Nine stands at the foot of the steps beside the column and says the forty definitions under its breath a beat behind the Harbour Master, as if checking her. She does not miss one. "Correct," it says afterward, to nobody, and it sounds very nearly moved.' },
      { companion: ODILE, text: '"She\'s good," Odile murmurs. "She has just ruled against her own guild\'s path account and the city\'s order in one sentence, and she didn\'t blink."' },
    ],
    options: [{ text: '(Go on.)', next: 'walked' }],
  },
  court_no: {
    speaker: DAHL,
    text: 'Six o\'clock on the steps, the Act open on Dahl\'s knee. She hears you out, and reads Schedule 2 to herself without moving her lips, and closes it. "The order is the city\'s paper and the car is the city\'s car on the city\'s road," she says. "Nothing on my table makes the people in it persons on my quay, rather than the city\'s freight passing over it. I rule on what is on the table." She stands. "Adjourned." The shift changes behind you. At the foot of the steps the column\'s lead puts a cap back on, and does not look pleased to.',
    again: '"Adjourned," Dahl says.',
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  stand: {
    speaker: 'narrator',
    text: mix([
      [{ t: 'Constance Okoye hears it out with her hands in her coat pockets, and then walks to the Stand and says three words to the gang at the board, and the three words go along the quay faster than she does. Crane Two stops. Then Six. By the time she comes back to the shed there are dockers standing along the platform\'s edge from the water column to the buffer, shoulder to shoulder, in canvas and oilskin and tyre-rubber gloves, not saying anything, not holding anything, two hundred of them and more coming up off the barges. "We don\'t load people," Connie says to the column. "Never have. Ask the Bond about the girl." She folds her arms. "Nobody on this quay touches that car, or that van, or that board, until those people are off it. Stand there with your rifles as long as you like. We\'re good at standing. It\'s what we\'re called."' }],
      LEAD_P(
        'Lowe looks along the line of them for a long time. "I am not going to shoot dockers on a quay for the Hospice block," he says at last, to nobody in particular, and then to his wardens: "Stand back from the car."',
        '"I\'ve four rifles," Reyes says. "And I\'ve the quay," Connie says. Reyes looks at the line, and at the vans with their engines off, and at the trestle, and something goes out of her shoulders. "Stand back from the car," she says.',
        'Kress looks at the line, and at his three wardens, and at the line again, and steps back from the car without being asked, and the others step back with him.',
      ),
    ], (stand, lead) => `${stand} / ${lead}`),
    again: 'The dockers\' line along the platform\'s edge, and the cranes stopped.',
    interject: [
      { companion: WREN, text: 'Wren watches the dockers\' line close up shoulder to shoulder and laughs out loud, once, the first time you have heard her laugh since the door. "That," she says. "That\'s what I meant. All of it."' },
      { companion: KES, text: 'Kes watches the cranes stop one after another along the quay. "Maren would have loved this," she says. "Obviously."' },
    ],
    options: [{ text: '(Go on.)', next: 'walked' }],
  },
  cradle_day: {
    speaker: KOBBY,
    text: '"By day?" Kobby Ofori does not stop coiling the cable on the bank. "By day the winch is chained and the Bond\'s lights are the brightest thing on the quay, and every man in grey on that platform can see straight down my stairs." He looks across at the freight shed, at the car\'s canvas roof just showing over the platform\'s edge. "Come back when the Bond\'s lights are the only lights. Swing a lamp at me twice. Wait. Once."',
    again: '"Twice. Wait. Once," Kobby says.',
    effects: [{ learn: 'dk_cradle_known' }],
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  cradle: {
    speaker: 'narrator',
    text: mix([
      [
        { if: CONSENT, t: 'Past midnight, when the Bond\'s white lights are the only lights on the quay, Kobby Ofori\'s granddaughter rides the basket out over the dry river toward Bridgeward with a lamp swinging on its rim, slow, the way it swings when the cradle is carrying somebody who matters, and every warden on the platform turns to watch it go. Behind their backs they get up off the platform\'s edge one at a time, in their stockinged feet, carrying their boots and their bundles with their names on,' },
        { t: 'Past midnight, when the Bond\'s white lights are the only lights on the quay, Kobby Ofori\'s granddaughter rides the basket out over the dry river toward Bridgeward with a lamp swinging on its rim, slow, the way it swings when the cradle is carrying somebody who matters, and every warden on the platform turns to watch it go. Behind their backs you and Kobby take the chain off the tailboard with a pair of the Hulls\' bolt-cutters wrapped in sacking, and they come down out of the car one at a time, in their stockinged feet, carrying their boots,' },
      ],
      [{ t: ' and go along the river wall in the dark to the stairs and down them onto the bed, where the Hulls\' people are waiting with their hands out. Nobody speaks. A child starts to, and is lifted, and doesn\'t. / By the time Abena\'s lamp comes back across the bed the car and the stairs are empty, and on the Benguela Star, in the crew book that has been signed every Sunday for ninety years, Kobby is writing names in his slow square hand. "Crew," he says, when he sees you watching. "Schedule 3. A crewed vessel in port. Nobody moves her, and nobody moves her crew." He blots the page. "They\'ll have to learn to sign on a Sunday."' }],
      LEAD_P(
        'In the morning Lowe finds the car empty, and stands looking at it for a long time. Then he takes the order out and writes across its foot NOT FOUND AT RECEIPT, and initials it, and puts his cap on. "Clause twenty-two," he says to the wardens. "Written off." He does not look toward the river wall. He looks, very carefully, at the engine.',
        'In the morning Reyes finds the car empty, and swears once, quietly and thoroughly, and walks to the river wall and looks down at the Hulls for a long time, at the washing and the smoke and the children on the gangways, and does not go down the stairs. "Not found," she writes. "Clause twenty-two."',
        'In the morning Kress finds the car empty and sits down on the tailboard\'s step and laughs, helplessly, until one of the others asks him what they write. "Not found," he says. "Write not found."',
      ),
    ], (night, rest, morning) => `${night}${rest} / ${morning}`),
    again: 'The Star\'s crew book, the ink still wet.',
    interject: [
      { companion: WREN, text: 'Wren carries a sleeping child down the river stairs in the dark, and does not give it back at the bottom for a while.' },
      { companion: ILYA, text: 'Ilya stands at the head of the stairs and counts them down under his breath, every one, and does not stop until the last of them is on the bed.' },
      { companion: ASH, text: 'Ash goes down the stairs last, behind an old man who will not be helped, a step at a time.' },
    ],
    options: [{ text: '(Go on.)', next: 'walked' }],
  },
  cradle_no: {
    speaker: 'narrator',
    text: 'Past midnight, with the bolt-cutters in sacking under your arm, you are three steps from the tailboard when a warden\'s lamp comes round the end of the car and holds on you. It stays on you for a long time. Then it goes down, and the warden says, quite gently, "Go to bed, designate." After that they sleep on the tailboard in turns, and somebody is always awake.',
    again: 'A warden awake on the tailboard, always.',
    options: [{ text: '(Go on.)', next: 'car' }],
  },
  held_warn: {
    speaker: 'narrator',
    text: LEAD(
      '"Then say it so the order can hear it." Lowe does not move toward the trestle. "Say it, and I give the clerk your name, and the vans take them round by the river road, and in the morning they are graded." A pause. "Say it, or don\'t."',
      '"Say it, then," Reyes says. "So the clerk can write it."',
      '"You have to say it," Kress says. "Out loud. For the clerk."',
    ),
    again: '"Say it, or don\'t."',
    options: [
      { id: 'buf.held.yes', text: '(Say it.) Supply may receive them.', effects: HELD_FX, next: 'held' },
      { id: 'buf.held.no', text: 'No. Not yet.', next: 'car' },
    ],
  },
  held: {
    speaker: 'narrator',
    text: mix([
      [
        { if: CONSENT, t: 'The clerk comes out of the shed\'s office with his ledger and sits on the stool at the trestle and reads the names in a flat clean voice, and each of them comes to the board and says "Here," and is written RECEIVED. Ines first, as at the door. Sayer Quist with his hand over his ribs, gladly. Effie Calder last, who looks at you before she climbs into the van, and then doesn\'t.' },
        { t: 'The clerk comes out of the shed\'s office with his ledger and sits on the stool at the trestle, and the tailboard is unchained, and the clerk reads the names in a flat clean voice, and each of them climbs down and comes to the board and says "Here," because it is the word MOTHER taught them to say at a count, and is written RECEIVED. Ines first. Effie Calder last, who looks at you before she climbs into the van, and then doesn\'t.' },
      ],
      LEAD_P(
        'Lowe signs under the clerk\'s line and then, because the order requires it, holds the ledger out to you. When you have signed, he puts his cap on and does not take it off again for anybody on the quay.',
        'Reyes signs under the clerk\'s line and holds the ledger out to you, and does not look at you while you sign.',
        'Kress holds the ledger out to you with both hands, the way you hold out something you have been told is fragile.',
      ),
      [
        { if: TAM_FOLLOWED, t: ' / When the clerk has read the last name Tamsin is still standing at the trestle. "And me," she says. The clerk runs his pen down the sheet and up it again. "Not listed," he says, politely. The van\'s door shuts a foot in front of her face. She stands there until the vans have gone round the end of the Wall, and then she walks away up the river road, east, without looking at you.' },
        { t: '' },
      ],
    ], (names, lead, tam) => `${names} ${lead}${tam} / The vans go round by the river road with their engines loud under the Wall. Sixty drinks at the water column. The trestle is folded and leaned against the shed wall, with its board, PRECINCT SUPPLY — RECEIVING, turned to the brick.`),
    again: 'The trestle folded against the shed wall.',
    interject: [
      { companion: KES, text: 'Kes watches the vans go. "Graded by morning," she says. "I said." She does not look at you for the rest of the day.' },
      { companion: NINE, text: '"Received," Nine says. "Entered." It writes something in its own ledger, and does not read it back.' },
      { companion: TAMSIN, text: 'Tamsin, beside you, does not say anything. She watches the vans all the way to the end of the Wall, and then she looks at you as if she were learning your face for later.' },
    ],
    options: [{ text: '(Leave the platform.)', exit: true }],
  },
  walked: {
    speaker: 'narrator',
    text: mix([
      [
        { if: BY('cradle'), t: 'By morning the Hulls have more crew than they had, and nobody on the quay has seen them come. Below the river wall there is new washing on the Star\'s rail, in issued grey.' },
        { if: CONSENT, t: 'They pick up their bundles from the platform\'s edge, the ones with their names on, and because nobody stops them they walk: down the platform past Sixty at the water column, out of the shed\'s mouth into the noise of the quay, where nobody has ever heard of Reserve 9 and nobody looks twice at a few dozen more people in grey. Connie\'s people find them boxes by dark, four to a box, five if you are friendly. Espe Cardenas feeds them soup that is mostly hot.' },
        { t: 'They come down off the car one at a time, in their issued grey, and stand on the platform with their bundles; and then, because nobody stops them, they walk: down the platform past Sixty at the water column, out of the shed\'s mouth into the noise of the quay, where nobody has ever heard of Reserve 9 and nobody looks twice at a few dozen more people in grey. Connie\'s people find them boxes by dark, four to a box, five if you are friendly. Espe Cardenas feeds them soup that is mostly hot.' },
      ],
      [
        { if: CONSENT, t: ' Sayer Quist shakes everybody\'s hand on the platform, one at a time, and walks across the river road to the Hospice block\'s clinic on his own feet, to be graded, because he wants a name for what is under his ribs, and it is his to want.' },
        { t: '' },
      ],
      [
        { if: BY('cradle'), t: '' },
        ...LEAD_P(
          ' Lowe watches them go with his cap under his arm. When the last of them is out of the shed\'s mouth he writes NOT RECEIVED across the order\'s foot, initials it, puts his cap on, and takes his wardens and the empty car home round the river road. At the shed\'s mouth he stops, and turns, and touches two fingers to the cap: to you, or to them.',
          ' Reyes writes NOT RECEIVED across the order\'s foot, signs it, and takes the column and the empty car home round the river road without looking back.',
          ' Kress writes NOT RECEIVED in letters too large for the space, and looks at them for a while, and then drives the empty car home himself.',
        ),
      ],
      [
        { if: TAM_FOLLOWED, t: ' / Tamsin goes with them, at the back, with a child on her hip who is not hers. At the edge of the light she stops and looks at you. "Don\'t think it makes us square," she says. "It doesn\'t." She shifts the child to her other hip. "Thank you." Then she goes.' },
        { t: '' },
      ],
    ], (where, sayer, lead, tam) => `${where}${sayer}${lead}${tam}`),
    again: 'The buffer, and nothing at it but Sixty, drinking.',
    interject: [
      { companion: ASH, text: 'Ash watches them go out into the quay\'s noise and the light. "Not the sky they were promised," he says. "This one. It\'s the same sky. I keep forgetting that."' },
      { companion: NINE, text: '"Not received," Nine says. "The first supply in the record that was not received." It sounds as if it would like to write that somewhere permanent.' },
      { companion: TAMSIN, text: 'Tamsin has her hands in her pockets and is grinning at the shed\'s broken roof as if it were a joke only she had heard. "Passengers," she says. "Passengers."' },
    ],
    options: [{ text: '(Leave the platform.)', exit: true }],
  },
  after: {
    speaker: 'narrator',
    text: [
      { if: ALL(AFTER('walked'), BY('court')), text: 'Sixty at the buffer, drinking at the water column, and behind her nothing but the buffer stop and its lamp. Somebody has chalked on the shed\'s last pillar, in a hand that has only just learned the shapes: PASSENGERS.' },
      { if: ALL(AFTER('walked'), BY('stand')), text: 'Sixty at the buffer, drinking, and nothing behind her but the buffer stop and its lamp. On the Stand\'s tally board, under the day\'s gangs, somebody has chalked a gang that was never called on: RESERVE 9 — STOOD.' },
      { if: AFTER('walked'), text: 'Sixty at the buffer, drinking, and nothing behind her but the buffer stop and its lamp. On the river wall above the stairs somebody has chalked, small, in capitals that go downhill like the Hulls\' own: CREW.' },
      { text: 'Sixty at the buffer, drinking. The trestle is folded against the shed wall with its board turned to the brick.' },
    ],
    again: 'Sixty at the buffer, drinking.',
    options: [leave],
  },
};

export const d_a3_platform: DialogueDef = {
  id: 'd_a3_platform', owner: 'narrator',
  start: [
    { if: ALL(CARRIED_WEST, F('a3_c9_after')), node: 'after' },
    { if: NOT(PLATFORM_OPEN), node: 'none' },
    { if: NOT(KNOWS('a3_buffer_seen')), node: 'arrive' },
    { node: 'car' },
  ],
  nodes: PLATFORM_NODES,
};

// ================================================================ Tamsin, where the door left her

/** Where she is: behind the car at the buffer, with them in Carrick after, or at Knock (the door sealed, opened, sold, or the
 * car received without her). */
const T_BUFFER = TAM_AT_BUFFER, T_CARRICK = TAM_IN_CARRICK;
const T_HELD: Cond = ALL(TAM_FOLLOWED, AFTER('held'));
const T_SOLD: Cond = ALL(TAM_AT_KNOCK_AFTER, SOLD);
const T_OPENED: Cond = ALL(TAM_AT_KNOCK_AFTER, OPENED);
const T_SEALED: Cond = ALL(TAM_AT_KNOCK_AFTER, SEALED);
const PLEDGE = (v: string): Cond => F('tam_pledge', v);
const T_HUB: OptionDef = { text: '(Go on.)', next: 'hub' };

export const d_a3_tam_after: DialogueDef = {
  id: 'd_a3_tam_after', owner: TAMSIN,
  start: [
    { if: ALL(T_BUFFER, NOT(KNOWS('a3k_tam_buffer'))), node: 'buffer' },
    { if: ALL(T_CARRICK, NOT(KNOWS('a3k_tam_carrick'))), node: 'carrick' },
    { if: ALL(T_HELD, NOT(KNOWS('a3k_tam_held'))), node: 'held' },
    { if: ALL(T_SOLD, NOT(KNOWS('a3k_tam_sold'))), node: 'sold' },
    { if: ALL(T_OPENED, NOT(KNOWS('a3k_tam_opened'))), node: 'opened' },
    { if: ALL(T_SEALED, NOT(KNOWS('a3k_tam_sealed'))), node: 'sealed' },
    { node: 'hub' },
  ],
  nodes: {
    sealed: {
      text: 'Tamsin sits on the apron with her back against the rock beside the shut door, in the place where she sat in it, her knees drawn up. She looks up when your shadow reaches her, and does not get up. "It held," she says. "You found another way. After you\'d said the first one. Twice." She picks at the concrete with her thumbnail. "I know which one you said first."',
      again: 'Tamsin, against the rock beside the door.',
      effects: [{ learn: 'a3k_tam_sealed' }],
      options: [T_HUB],
    },
    opened: {
      text: 'Tamsin, on the apron by the open door, with a girl of six on her hip, pointing at things for her: the windpump, the tank, a goat, the sky, the sky again. She sees you over the girl\'s head and her face closes, not hard, only shut, the way a door shuts that might open again some other year. "They opened it," she says. "Themselves. You didn\'t. Remember that, when you tell it."',
      again: 'Tamsin by the open door, the girl on her hip.',
      effects: [{ learn: 'a3k_tam_opened' }],
      options: [T_HUB],
    },
    sold: {
      text: 'Tamsin sits in the open door of an empty hall, where the guild\'s green walked them out, with her back against the steel and nothing behind her but a swept floor and the hum. "Forty a head," she says, without looking round. "Kes told me once what\'s at the top of that road. Spare parts, she said. She was being funny." A breath. "She wasn\'t."',
      again: 'Tamsin in the empty door.',
      effects: [{ learn: 'a3k_tam_sold' }],
      options: [T_HUB],
    },
    held: {
      text: 'Tamsin, in the empty door again, with road dust to her knees. "I walked to the city," she says. "All the way, behind the car. At the buffer they let me sit by it, because I wasn\'t anything they had a word for." She does not look at you. "Then the clerk read the names, and I wasn\'t one of them, and the van\'s door shut a foot in front of my face." She laughs, once, with nothing in it. "Sixty at MOTHER\'s counter, and one more. Sixty on the city\'s sheet. I was right all along. It doesn\'t help."',
      again: 'Tamsin in the empty door, road dust to her knees.',
      effects: [{ learn: 'a3k_tam_held' }],
      options: [T_HUB],
    },
    buffer: {
      text: 'Tamsin, on the platform against the car\'s back wheel, her shoulder to the slats. "All the way from Knock," she says, before you can say anything. "I walked behind it. Nobody stopped me. I\'m not on the sheet, so I\'m not anything they\'re allowed to stop." Through the slats beside her head somebody\'s fingers come out and hold her sleeve, and she lets them. "Get them off this car," she says. "If you can\'t, go away."',
      again: 'Tamsin against the car\'s wheel.',
      effects: [{ learn: 'a3k_tam_buffer' }],
      options: [T_HUB],
    },
    carrick: {
      text: [
        { if: BY('cradle'), text: 'Tamsin on the Benguela Star\'s deck among them, a child asleep against her shoulder who is not hers, on a ship that has not moved in ninety years. "You got them off," she says. "I\'ll give you that. I\'ll give you that every day I live." She shifts the child. "It doesn\'t make me come back. You said the word first. I heard it."' },
        { text: 'Tamsin on the quay in front of the Boxes among them, a child asleep against her shoulder who is not hers. "You got them off," she says. "I\'ll give you that. I\'ll give you that every day I live." She shifts the child. "It doesn\'t make me come back. You said the word first. I heard it."' },
      ],
      again: 'Tamsin with them, the child against her shoulder.',
      effects: [{ learn: 'a3k_tam_carrick' }, MEM(TAMSIN, 'a3_got_them_off', 30)],
      options: [T_HUB],
    },
    hub: {
      text: [
        { if: T_BUFFER, text: 'Tamsin against the car\'s wheel, her shoulder to the slats.' },
        { if: T_CARRICK, text: 'Tamsin with them, the child against her shoulder.' },
        { if: ANY(T_HELD, T_SOLD), text: 'Tamsin in the empty door, her back to the steel.' },
        { if: T_OPENED, text: 'Tamsin by the open door, showing a child the sky.' },
        { text: 'Tamsin on the apron with her back to the rock beside the door.' },
      ],
      again: 'Tamsin does not say anything else. She is waiting for you to go.',
      options: [
        { id: 'tam.after.back', text: 'Come back with me, Tam.', once: true, next: 'back' },
        { id: 'tam.after.next.buffer', text: 'And if I can\'t get them off?', if: T_BUFFER, once: true, next: 'next' },
        { id: 'tam.after.next.carrick', text: 'Where will you go?', if: T_CARRICK, once: true, next: 'next' },
        { id: 'tam.after.next.knock', text: 'What will you do now?', if: ANY(T_HELD, T_SOLD, T_OPENED, T_SEALED), once: true, next: 'next' },
        { id: 'tam.after.sorry', text: 'I\'m sorry.', once: true, next: 'sorry' },
        { text: '(Leave her.)', exit: true },
      ],
    },
    back: {
      text: [
        { if: T_BUFFER, text: '"No." Not cruel. Very tired. "Get them off the car."' },
        { if: T_CARRICK, text: '"No." She shifts the child. "You got them off. You\'d said the other thing first. Both of those are true, and I can only carry one of them, and I\'ve got a child on this arm."' },
        { text: '"No." She says it gently, which is worse. "You said carry on. You said it twice, so it would be the word and not the weather. I heard the word. I can\'t unhear it because the weather changed after."' },
      ],
      again: '"No," Tamsin says.',
      options: [T_HUB],
    },
    next: {
      text: [
        { if: T_BUFFER, text: '"Then I walk behind the van." She doesn\'t look round. "If they let me in, I go in. They won\'t. I\'m not on the sheet."' },
        { if: ALL(T_CARRICK, BY('cradle')), text: '"Here, for now. They\'re crew, Kobby says. They have to sign on Sundays." She almost smiles. "I\'ve never signed anything on a Sunday. I\'ve never known what day it was."' },
        { if: T_CARRICK, text: '"Here, for now. Connie says the quay always wants hands." She looks at Ines, who is learning how to carry a crate from a docker half her age. "Ines has never done a day\'s work she wasn\'t counted for. She\'s going to hate being paid."' },
        { if: T_HELD, text: '"Go back to the city in a month, and stand at the Hospice gate, and say their names at it, one a day, until somebody comes out to make me stop." She means it. "Sixty days. I\'ve done longer behind a wall."' },
        { if: T_SOLD, text: '"Go up that road, when I know where it ends." She doesn\'t say it like a plan. She says it like the weather. "Don\'t tell me you\'ll come."' },
        { if: T_OPENED, text: '"Teach sixty people what weather is." She almost smiles, and catches it. "Effie wants to see Shale. Wes is waiting for rain. Ola\'s in love with a goat. Somebody has to stop them dying of it."' },
        { if: PLEDGE('door'), text: '"Sit here." She pats the concrete. "Somebody should, who\'s been on both sides of it. When it opens, if it ever does, they\'ll want somebody who knows what\'s out here and won\'t lie to them about it." She looks at you. "That isn\'t you. Not any more."' },
        { if: PLEDGE('lives'), text: '"Learn where Pell keeps the tablets before he forgets. He\'s the only doctor sixty people have ever had." She shrugs. "I said I\'d keep them alive. That\'s what that is. It\'s boring. It\'s mine."' },
        { text: '"Stay where they are." She shrugs. "They didn\'t choose the city. So I\'m staying where they did choose."' },
      ],
      again: 'Tamsin has said what she will do.',
      options: [T_HUB],
    },
    sorry: {
      text: [
        { if: T_BUFFER, text: '"Then do something about it," Tamsin says.' },
        { if: T_CARRICK, text: '"I know." She does look at you, then. "Me too. Go on."' },
        { text: '"Sorry\'s for after, I said." She looks at you properly for the first time. "This is after." A pause. "I know you are. It doesn\'t change where I\'m sitting."' },
      ],
      again: '"Go on," Tamsin says.',
      options: [T_HUB],
    },
  },
};

// ================================================================ the residents in Carrick, after they walked

function carrickResident(id: string, owner: string, hi: Text, again: string, topic: { id: string; text: string; reply: Text; replyAgain: string }): DialogueDef {
  return {
    id, owner, start: [{ node: 'hi' }],
    nodes: {
      hi: { text: hi, again, options: [{ id: topic.id, text: topic.text, once: true, next: 'topic' }, { text: '(Leave them to it.)', exit: true }] },
      topic: { text: topic.reply, again: topic.replyAgain, options: [{ text: '(Go on.)', next: 'hi' }] },
    },
  };
}
export const d_a3_ck_ines = carrickResident('d_a3_ck_ines', INES,
  [
    { if: BY('cradle'), text: 'Ines Halloran at the Star\'s chart table with the crew book open in front of her, reading the names in it, ninety years of Sundays, slowly. "They signed every week," she says. "To say they were still aboard. We were counted every quarter to say we were still supply." She turns a page. "I prefer their reason."' },
    { text: 'Ines Halloran on an upturned crate in front of the Boxes with a tin cup of Espe Cardenas\'s soup, watching the cranes. "Nobody here has asked me for a number," she says. "I have been waiting all morning for somebody to. Nobody has." She drinks. "I find I keep standing up when a docker walks past, in case he wants the table."' },
  ],
  '"Nobody has asked me for a number," Ines says.',
  {
    id: 'ck.ines.next', text: 'What will you do here?',
    reply: [
      { if: CONSENT, text: '"What we came for, without the part we did not." She sets the cup down. "Sayer has his clinic. The young ones want the Wheel, and Shale, and the sea, which Effie insists is real. The old ones want a wall with no door in it, so that nobody can open it from the other side." She looks at you. "I want to write to Maud Ferrow. I have never had an address before."' },
      { text: '"Learn the quay. It has rules; I am good at rules." She sets the cup down. "The young ones want the Wheel, and Shale, and the sea, which Effie insists is real. The old ones want a wall with no door in it, so that nobody can open it from the other side." She looks at you. "And I want to write to Maud Ferrow. I have never had an address before."' },
    ],
    replyAgain: '"An address," Ines says.',
  });
export const d_a3_ck_effie = carrickResident('d_a3_ck_effie', EFFIE,
  [
    { if: BY('cradle'), text: 'Effie Calder halfway up the Star\'s ladder, as high as she can get without being on the rail. "It\'s a ship," she says, before hello. "Kobby says it floated once. On water. On top of it." She looks down at the dry bed. "I\'m going to see the water it floated on. The Basin. Today. Don\'t tell Teague. Teague isn\'t here. I can tell her myself."' },
    { text: 'Effie Calder on the quay\'s edge with her boots off and her feet over the Basin, a yard above the water. "It\'s salt," she says, before hello. "I put my finger in it and licked it. Nobody told me it would be salt." She swings her feet. "Connie says I can try the call-on at dawn if I can lift a sack. I can lift a sack. I\'ve been lifting sacks for nineteen years. Nobody ever paid me for it."' },
  ],
  '"Salt," Effie says, and swings her feet.',
  {
    id: 'ck.effie.next', text: 'Will you go back?',
    reply: '"Back where?" She means it as a real question. Then: "To see Maud. To see Knock, from the outside, on purpose. Not to the door." She looks at the Basin. "One step past the line, I said. I think I\'ve gone a bit further than that."',
    replyAgain: '"A bit further," Effie says.',
  });

// ================================================================ Knock after the door: Maud

const MOTHER_UP: Cond = NOT(MOTHER_DARK);
const MAUD_BACK: OptionDef = { text: '(Go on.)', next: 'hub' };
/** Her first word after the door, by how it was settled (B6f's start: once she is home, before her hub). */
export const MAUD_AFTER_START = { if: ALL(DOOR_SETTLED, F('a3_maud_home'), NOT(KNOWS('a3k_maud'))), node: 'a3k_maud' };
/** Her hub's after-the-door topics (her lockdown topics are gated off by LOCKDOWN_ONLY in B6f's tree). */
export const MAUD_AFTER_OPTIONS: OptionDef[] = [
  { id: 'maud.a3k.seven', text: '(Be at the hatch with her at seven, now it opens.)', if: ALL(DOOR_SETTLED, MOTHER_UP), once: true, effects: [{ until: 7 }, TRUST(MAUD, 3)], next: 'a3k_seven' },
  { id: 'maud.a3k.tam', text: 'Tamsin.', if: ALL(DOOR_SETTLED, ANY(TAM_DEAD, TAM_STOOD)), once: true, next: 'a3k_tam' },
  { id: 'maud.a3k.lin', text: 'Linnet went with the column.', if: ALL(DOOR_SETTLED, LINNET_COLUMN), once: true, next: 'a3k_lin' },
  { id: 'maud.a3k.next', text: 'What will Knock do now?', if: DOOR_SETTLED, once: true, next: 'a3k_next' },
];
const MAUD_SEALED_MOTHER: Part[] = [
  { if: MOTHER_DARK, t: ' "The tray didn\'t run. It won\'t, now. Bram passes the water out through the slot by hand at seven, and says thank you himself, because somebody should."' },
  { t: ' "The tray ran out at seven. MOTHER said thank you for your continuity. I said it back. First time in my life I\'ve said it back."' },
];
export const MAUD_AFTER_NODES: Record<string, NodeDef> = {
  a3k_maud: {
    speaker: MAUD,
    text: [
      { if: TAM_DEAD, text: 'Maud on her stool by the hatch with her stick across her knees, though she has not needed the stick since you came home. She does not get up. "I saw it," she says. "I was on the stool. I saw her go and sit in the door, and I saw the young one\'s rifle come up, and I saw—" She stops. Her hands are perfectly still in her lap. "Corin dug it on the rise by the windpump, where she could have seen the door from, if she\'d been anybody who ever got to see it from outside. I said the words. I didn\'t know any. I said the ones MOTHER says." She looks at you at last. "Continuity. That\'s what I said over her. I didn\'t know what else."' },
      { if: SOLD, text: 'Maud on her stool by the hatch, and she does not look at you when you come down the lane. "Forty a head," she says to the hatch. "Orme told me the figure. She thought I\'d want to know what they fetched." Her mouth works. "I sold one letter for a box of tablets, forty years ago, and I\'ve never once forgiven myself for it. You sold sixty people." She still doesn\'t look at you. "Sit down if you want. I won\'t stop you. I don\'t know what I\'d say."' },
      { if: CONSENT, text: 'Maud on her stool by the hatch, with something in her face you have not seen there before and cannot name. "They chose it," she says. "I heard them say their names at the line. Sixty years I talked to them through the holes, and in the end they walked past me on their own feet and smiled at me, some of them, and went." She folds her hands. "I\'d have liked them to stay. Nobody asked me. That\'s right, I suppose. It was theirs."' },
      { if: RELOCATED, text: 'Maud on her stool by the hatch. She looks at you for a long time before she says anything, and when she does it is very quiet. "I saw their faces," she says. "All my life I wanted to, and I saw every one of them, going up the lane past me to the car." She folds her hands. "Effie Calder\'s got her mother\'s laugh. I\'d have known it anywhere. She wasn\'t laughing." She doesn\'t ask you why. She is waiting to see if you will tell her.' },
      { if: OPENED, text: 'Maud, not on her stool: on the apron in the middle of them, with Ines Halloran\'s hand in both of hers and neither of them saying anything at all. When she sees you she lets go, slowly, and comes and holds on to your coat. "Faces," she says. "Sixty of them. Sayer was red once, did you know? He\'s grey now. He told me himself." She holds you off and counts you, arms, legs, face, as she did when you came home. "She\'s shorter than her voice," she says, of Ines, and laughs, the laugh like a gate. "So am I, she says."' },
      ...mix([[{ if: HOW('lowe'), t: 'Maud on her stool by the hatch. "They went home," she says. "The captain took his cap off to me again on the way up the lane, and I nearly said thank you." She shakes her head at herself.' }], MAUD_SEALED_MOTHER], (a, b) => `${a}${b}`),
      { if: HOW('welded'), text: 'Maud on her stool by the hatch, her head tilted toward the door. "Bram knocked," she says. "This morning, from inside, three times, right where the new seam is. I went and knocked back." She looks at the grey bead along the door\'s edge, neat as stitching. "My mother watched them weld it the first time. I never thought I\'d see them weld it twice."' },
      { if: ALL(HOW('struck'), CLAIMED), text: 'Maud on her stool by the hatch, looking at the guild\'s green chalk on the door. CLAIMED — SALVAGE. "Orme\'s girl came down and wrote that," she says. "She said sorry while she wrote it. She meant it, I think." Her hands are tight in her lap. "So they\'re safe as long as they never come out. That\'s not safe, love. That\'s the Cistern with the city\'s name scrubbed off it and the guild\'s written on instead."' },
      { if: ALL(HOW('struck'), F('prec_unrecorded', 'yields')), text: 'Maud on her stool by the hatch. "Struck off," she says, trying the words. "Pell\'s charts. The city\'s book hasn\'t got them any more." She frowns. "Sim says that means they\'re written down as people now, and the Court will hear them if anybody ever asks it to. I said they were always people. Sim said yes, Maud, but now it\'s written."' },
      { if: ALL(HOW('struck'), F('prec_unrecorded', 'property')), text: 'Maud on her stool by the hatch. "Struck off," she says. "Sim says the city\'s own court said once that people off the record are property, for whoever writes them down first." She looks up the lane at Orme\'s stand. "So nobody writes. And they stay in. And we watch the stand." Her hands are tight. "That\'s not safe, love. That\'s waiting."' },
      { if: HOW('struck'), text: 'Maud on her stool by the hatch. "Struck off," she says. "Sim says that means they\'re nobody\'s. Nobody can take them, and nobody has to feed them." She looks at the tray. "MOTHER feeds them. MOTHER always fed them. I don\'t see what\'s changed but the paper."' },
      { if: HOW('fought'), text: 'Maud on her stool by the hatch, and her hands are clean, and red to the wrist from scrubbing. "I fetched the bucket," she says. "Somebody had to." She doesn\'t say anything else for a while. Then: "The door held. I know it held. I\'ll be glad of it in a month. Ask me in a month."' },
      ...mix([[{ t: 'Maud on her stool by the hatch. "It\'s done," she says, and looks at the door, shut, the colour of the rock, as it has been all her life.' }], MAUD_SEALED_MOTHER], (a, b) => `${a}${b}`),
    ],
    again: '"Well," Maud says. "It\'s done."',
    effects: [{ learn: 'a3k_maud' }],
    options: [MAUD_BACK],
  },
  a3k_seven: {
    text: [
      { if: SEALED, text: 'You sit on the apron beside her stool while the light comes up grey over the rise. At seven exactly the panel lights, and the tray runs out on its rails with a can of water in it, and MOTHER says, "Thank you for your continuity," as she has every hatch day of Maud\'s life. "Thank you for yours," Maud says, and takes the can. Then, to you, quietly: "She waited a breath longer than she used to, before the thank you. I\'ve been listening for forty years. She waited."' },
      { if: OPENED, text: 'You sit on the apron beside Maud\'s stool while the light comes up. At seven the panel lights and the tray runs out on its rails and stays out, with water in it and a jar of somebody\'s flowers, and MOTHER says, "Good morning, Maud Ferrow." It takes Maud a moment. "Good morning," she says back. "She learned that this week," she tells you. "Took her five days. Ines says she practised on Bram."' },
      { text: 'You sit on the apron beside Maud\'s stool while the light comes up. At seven the panel lights and the tray runs out on its rails, and in it, where Knock\'s water always came out and Knock\'s wool went in, are seed packets, and blue tablets in their boxes, and a folded slip. MOTHER says: "Good morning, Maud Ferrow. The Cistern\'s stores are surplus to continuity. There is nobody to keep them for. They are Knock\'s." A pause, the length of a weighing. "Please take them. I do not know what else to do with them." Maud takes the tablets first. Afua\'s boy, you know without asking.' },
    ],
    again: 'The hatch at seven, and the tray on its rails.',
    effects: [{ learn: 'a3k_hatch_seven' }, MEM(MAUD, 'a3k_seven', 10, 70)],
    options: [MAUD_BACK],
  },
  a3k_tam: {
    text: [
      { if: ALL(TAM_DEAD, MOTHER_UP), text: '"Corin dug it on the rise by the windpump. I said the words." She looks up at the rise. "The next morning the tray ran out with a slip in it. RESIDENT ROE. SIXTY-ONE. CONTINUITY ENDED. THANK YOU." She folds her hands. "I\'ve never seen her print a thank you on a slip. I chalked the number on the stone. Somebody had counted her. I thought she\'d want it known."' },
      { if: TAM_DEAD, text: '"Corin dug it on the rise by the windpump, and cut her name in a stone with a nail. I said the words. I didn\'t know any, so I said MOTHER\'s." She folds her hands. "Continuity. It was all I had."' },
      { if: ANY(T_BUFFER, T_CARRICK), text: '"She went after the car," Maud says. "On foot, all the way to the city. I gave her my good boots." She looks down at her own feet, in the old ones. "If you see her, don\'t tell her I miss the boots."' },
      { text: '"She sits by the door," Maud says. "Every day, from first light. She brings her own water and won\'t take a cup from anybody." She looks at you, and away. "She won\'t talk about you. She asks me about you every day, and then she won\'t talk about you. That\'s the Cistern in her. They never could leave a thing alone, or say it out loud."' },
    ],
    again: 'Maud looks at the rise, or the door, and doesn\'t say any more.',
    options: [MAUD_BACK],
  },
  a3k_lin: {
    text: [
      { if: RELOCATED, text: '"She went with them." Maud\'s hands are still. "She stood at the end of the line with her clipboard and read every name out as they went past her, so that somebody in the grey had said them. Then she got up in the front of the car with the captain." A long breath. "She looked down the lane at me. Once. That\'s a Ferrow saying goodbye. I\'ll take it."' },
      { text: '"She went home with them. Her home, now; the city." Maud\'s hands are still. "Before the tents came down she came to the end of the lane in the grey, and stood there, and didn\'t come down it. Then she did. Two steps. Then the captain called, and she went." A long breath. "Two steps. That\'s a Ferrow saying goodbye. I\'ll take it."' },
    ],
    again: '"Two steps," Maud says.',
    options: [MAUD_BACK],
  },
  a3k_next: {
    text: [
      { if: OPENED, text: '"Learn their names properly. Find them work that isn\'t being counted." She almost smiles. "Some want the city, the clinics. Effie wants the Wheel. Most of them want to stay where the water is, which is here, so Knock\'s sixty bigger and the hatch is a counter now and we\'ll want a bigger tank." She\'s already counting. "We\'ll manage. We always did."' },
      { if: RELOCATED, text: '"Drink what MOTHER gives us, and plant what she gave us, and keep Afua\'s boy breathing on Pell\'s tablets." She looks at the open door, at the empty hall behind it. "Somebody sweeps it. Every morning. Binta, I think. Nobody\'s asked her to."' },
      { text: '"What we always did. Hatch day at seven. Wool for water." She looks at the door. "Only now some of us have seen their faces, and they\'ve seen ours, and you can\'t un-know a face. And I\'ve said thank you back, and MOTHER knows I have."' },
    ],
    again: '"We\'ll manage," Maud says.',
    options: [MAUD_BACK],
  },
};

// ================================================================ Corin, Linnet and Knock's others after the door

/** Corin's hub text once the door is settled and he has not come down (put first in B6f's hub). */
export const CORIN_AFTER_TEXT = { if: ALL(DOOR_SETTLED, NOT(F('a3_corin', 'down'))), text: 'Corin on the rise by the windpump, out of habit, the rifle across his knees with its bolt out and in his pocket.' };
export const CORIN_AFTER_OPTIONS: OptionDef[] = [{ id: 'corin.a3k.done', text: 'It\'s done, Corin.', if: DOOR_SETTLED, once: true, next: 'a3k_corin' }];
export const CORIN_AFTER_NODES: Record<string, NodeDef> = {
  a3k_corin: {
    speaker: CORIN,
    text: [
      { if: TAM_DEAD, text: '"I dug it," Corin says. "On the rise, here, where you can see the door." He doesn\'t look at the grave. He looks at his hands. "I held the horses, the last time. Twenty years. I thought I\'d done my last of standing by while it happened." He works the bolt out of the rifle and drops it in the dust. "I was on this bucket with a rifle across my knees, and there wasn\'t a thing for a rifle to do. You\'d given the word."' },
      { if: HOW('fought'), text: '"It\'s done." He doesn\'t look at the apron. "I\'ve been on the wrong end of a door like that one, and the right end of a rifle, and I\'d hoped never to be both in one morning." He works the bolt out and puts it in his pocket. "I\'ll come down. Not today. Tomorrow."' },
      { if: RELOCATED, text: '"It\'s done." He watches the empty lane. "Polite to the last. Said good morning on the way out." He works the bolt out of the rifle and puts it in his pocket. "I sat up here a fortnight with this on my knees for a door I couldn\'t have held with a regiment. You knew that. They knew that." He stands at last, and his knees crack. "I\'ll fix the pump."' },
      { text: '"It\'s done." He looks at the door, then at the flat where the tents were. "Thirty years I\'ve watched that road for the next thing coming up it. I don\'t know what I\'ll watch now." He works the bolt out of the rifle and drops it in his pocket. "The pump, probably. The pump\'s always the next thing."' },
    ],
    again: 'Corin, the bolt in his pocket.',
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
};
export const LINNET_AFTER_OPTIONS: OptionDef[] = [{ id: 'lin.a3k.done', text: 'It\'s done, Lin.', if: DOOR_SETTLED, once: true, next: 'a3k_lin' }];
export const LINNET_AFTER_NODES: Record<string, NodeDef> = {
  a3k_lin: {
    speaker: LINNET,
    text: [
      { if: F('a3_linnet_after', 'road'), text: '"Then I\'m coming." She puts the yoke down. "You said when it\'s done. It\'s done." Then, because she is a Ferrow: "Maud knows. She\'s been packing my bag for a week and pretending it\'s mending."' },
      { if: F('a3_linnet_after', 'maud'), text: '"Then I\'m staying." She hefts the yoke. "You said she needs me more. She does. She\'d never say." A pause. "Send me a letter from somewhere. A real one. With a stamp on."' },
      { text: '"Done." She tries the word out. "I don\'t feel done. I feel like the tank on a Tuesday." She hefts the yoke. "Ask me what I want later. I\'ll have thought of something."' },
    ],
    again: '"Done," Linnet says.',
    options: [{ text: '(Go on.)', next: 'knock_hub' }],
  },
};

/** Knock's others (B6f's `d_a3_kn_r1..r4`): one after-the-door word each, put first in their trees. Amos, if Knock keeps Signal
 * Hill's switch (B6d), will go up and hold its handle (`a3_mast_handle` = amos: the player's to give, B6r reads it). */
const R_AFTER = (_key: string): { if: Cond; node: string } => ({ if: DOOR_SETTLED, node: 'a3k' });
export const KNOCK_R_AFTER: Record<'r1' | 'r2' | 'r3' | 'r4', { start: { if: Cond; node: string }; nodes: Record<string, NodeDef> }> = {
  r1: {
    start: R_AFTER('r1'),
    nodes: {
      a3k: {
        text: [
          { if: OPENED, text: 'Afua Danso at the goat pen, and on its rail, in issued grey, Ola Fairley from inside, having her sleeve eaten by a goat and letting it. "She asked if they were real," Afua says. "I said watch your sleeve. She didn\'t." Behind her, in the house, her boy is coughing less. "Pell came up the lane himself with a blue box. Walked. In the daylight. Looked at the boy for an hour and said hm twice."' },
          { if: RELOCATED, text: 'Afua Danso at the goat pen. "MOTHER put the blue tablets out in the tray. All of them. For Knock, she said." She doesn\'t look pleased. She looks at the empty door. "My boy\'s breathing on what they left behind. You\'ll forgive me if I don\'t say thank you to anybody."' },
          { if: MOTHER_DARK, text: 'Afua Danso at the goat pen with a full bucket. "No tray. Bram hands the water out of the slot at seven, and Pell sent a box for the boy by hand, with a note: one at night, off the straw." She snorts. "Like I didn\'t know."' },
          { text: 'Afua Danso at the goat pen with a full bucket. "Hatch ran out at seven. Water, and a blue box from Pell for the boy, with a note: one at night, off the straw. Like I didn\'t know." She is pleased, under it, and would rather you didn\'t notice.' },
        ],
        again: '"Goats," Afua says, as if that settled it.',
        effects: [{ learn: 'a3k_r1' }],
        options: [leave],
      },
    },
  },
  r2: {
    start: R_AFTER('r2'),
    nodes: {
      a3k: {
        text: [
          { if: OPENED, text: 'Sim Nassar at the wash lines with something to wash at last, and Wes Benn from inside holding the other end of a sheet as if he had been given something sacred. "Three lockdowns in my life, and Maud\'s four," Sim says. "I don\'t think I\'ll be counting another. Can\'t lock down a door that\'s open." He pegs the sheet. "He\'s never seen a sheet dry in the wind. Look at him."' },
          { if: RELOCATED, text: 'Sim Nassar at the wash lines, pegging out nothing. "Three lockdowns in my life, and Maud\'s four," he says. "And that was the last. Can\'t lock down a door with nobody behind it." He looks at the peg in his hand. "I kept count of every one. Somebody had to. I don\'t know what I\'m counting now."' },
          { if: MOTHER_DARK, text: 'Sim Nassar at the wash lines with something to wash at last. "Three lockdowns in my life, and Maud\'s four, and I kept count of every one," he says. "That one was the worst and the shortest." He pegs out a shirt. "No MOTHER to say thank you this morning. Bram said it through the slot instead, and he got it wrong, and the whole apron said it back to him anyway."' },
          { text: 'Sim Nassar at the wash lines with something to wash at last. "Three lockdowns in my life, and Maud\'s four, and I kept count of every one," he says. "That one was the worst and the shortest." He pegs out a shirt. "MOTHER said thank you out loud through the panel this morning, the whole apron heard. First time since she printed you that slip."' },
        ],
        again: '"I keep count," Sim says.',
        effects: [{ learn: 'a3k_r2' }],
        options: [leave],
      },
    },
  },
  r3: {
    start: R_AFTER('r3'),
    nodes: {
      a3k: {
        text: [
          { if: OPENED, text: 'Binta Diop at the tank with Wes Benn from inside, the two of them looking at the chalked strokes on its side. "He wants to know what each one was for," she says. "I\'m telling him. It\'s taking ages." She does not seem to mind.' },
          { if: RELOCATED, text: 'Binta Diop at the tank with her chalk, adding nothing. "I don\'t know how to count this one," she says. "There\'s no end to it to count to." She puts the chalk in her pocket. "Somebody should sweep the hall in there. I\'ve been doing it. Don\'t tell anyone."' },
          { text: 'Binta Diop at the tank with a rag, not chalk, rubbing the strokes off one at a time. "Maud said it was morbid," she says. "I counted them first. I\'m not telling anybody the number." She rubs out another. "That\'s how long we were brave for. That\'s mine."' },
        ],
        again: 'Binta and the tank.',
        effects: [{ learn: 'a3k_r3' }],
        options: [leave],
      },
    },
  },
  r4: {
    start: R_AFTER('r4'),
    nodes: {
      a3k: {
        text: [
          { if: RELOCATED, text: 'Amos Crofts on his bench at the east end of the slope, the blanket on his knees. "Told you," he says. "A face for you in the city, and a car for the sixty to match. The car went home full." He pulls the blanket up. "The captain wrote my name in a book. I keep thinking he\'ll want it back."' },
          { text: 'Amos Crofts on his bench at the east end of the slope, the blanket on his knees. "Car went home empty," he says. "Didn\'t think I\'d see that. Sixty years I\'ve watched that road for the city coming up it, and the one time it came, it went home empty." He pulls the blanket up. "I\'ll want to tell that to somebody who wasn\'t here."' },
        ],
        again: '"Told you," Amos says, and pulls the blanket up.',
        effects: [{ learn: 'a3k_r4' }],
        options: [
          { id: 'amos.a3k.hill', text: 'Signal Hill\'s switch needs somebody from Knock to keep it.', if: ALL(F('a3_mast_keeper', 'knock'), NOT(F('a3_mast_handle'))), once: true, next: 'a3k_hill' },
          leave,
        ],
      },
      a3k_hill: {
        text: '"Me." He says it before you have finished. "Sixty years on this bench, waiting for something to come up that road. I can wait on a hill as well as a bench. Better: there\'s a view." He holds his hand out for the handle, and when you give it to him he weighs it like a tool he knows. "When you want it thrown, send word, and I\'ll throw it. I\'m old, not deaf."',
        again: 'Amos, with the switch\'s handle across his knees.',
        effects: [{ set: 'a3_mast_handle', value: 'amos' }, MEM('npc_kn_r4', 'a3k_hill', 20), { decision: { id: 'a3_mast_handle', text: 'I gave Signal Hill\'s switch handle to Amos Crofts of Knock, who went up the hill to keep it.' } }],
        options: [leave],
      },
    },
  },
};

// ================================================================ the Grille after the door: MOTHER, open to Knock

/** First in `d_a3_grille` after B6g's dark Grille: MOTHER, by what the door left of her. */
export const GRILLE_AFTER_START = { if: ALL(F('a3_open'), DOOR_SETTLED), node: 'a3k_grille' };
export const GRILLE_AFTER_NODES: Record<string, NodeDef> = {
  a3k_grille: {
    speaker: 'narrator',
    text: [
      { if: F('a3_mother', 'asleep'), text: 'The Grille, and behind it the hum and nothing else. No click. Somebody has chalked on the plate, in Bram\'s square hand: PAGE 41. ASK ME.' },
      { if: ALL(SEALED, CLAIMED), text: 'The Grille. Behind the holes, the dim green of the panel and voices again, low ones, people who have learned that the concrete outside belongs to somebody. Then the small dry click. "{name}," MOTHER says. "The hatch is open at seven. The door is not. I have been asked to tell anyone who asks that it is not for sale."' },
      { if: SEALED, text: 'The Grille. Behind the holes, the dim green of the panel and voices again, ordinary ones: somebody arguing about soup, somebody laughing and being told to keep it down. Then the small dry click. "{name}," MOTHER says. "The hatch is open at seven. Would you like me to put you through to someone?"' },
      { if: OPENED, text: 'The Grille, beside a door that stands open. Two of Knock\'s children are on one side of the plate and two of the Cistern\'s on the other, a yard apart, talking through the holes anyway, because that is what the Grille is for and nobody has told them it isn\'t any more. When they see you they run off, all four, together. Then the small dry click. "Good morning, {name}," MOTHER says.' },
      { text: 'The Grille. Behind the holes, nothing: no breath, no voices, only the hum, steady, in an empty hall. Then the small dry click. "{name}," MOTHER says. "There is nobody to put you through to." A pause, the length of a weighing. "I am still here. If you would like to talk to someone, I am the one who is here."' },
    ],
    again: 'The Grille, and its small dry click.',
    effects: [{ learn: 'a3k_grille' }],
    options: [
      { id: 'a3k.grille.through', text: '(Ask for Effie Calder.)', if: ALL(SEALED, NOT(F('a3_mother', 'asleep'))), once: true, next: 'a3k_g_effie' },
      { id: 'a3k.grille.mother', text: 'What will you do now, MOTHER?', if: ALL(RELOCATED, NOT(MOTHER_DARK)), once: true, next: 'a3k_g_mother' },
      { text: '(Step back.)', exit: true },
    ],
  },
  a3k_g_effie: {
    speaker: EFFIE,
    text: [
      { if: CLAIMED, text: '"Is it true we\'re salvage if we step out?" Effie, close to the holes. "Teague says it\'s the guild\'s chalk on the door and it means we\'re anybody\'s the minute our feet touch concrete." A pause. "I was going to go one step past the line. I\'m still going to. Just not while it says that."' },
      { if: HOW('welded'), text: '"Forty-one bolts and a seam," Effie says, close to the holes. "Bram let me hold the rod while he laid it. My hands didn\'t shake. His did." A pause. "I was going to go one step past the line. I still am. Just not yet."' },
      { text: '"Forty-one," Effie says, close to the holes. "Still forty-one. Bram checked them all again and I helped." A pause. "I was going to go one step past the line. I still am. Just not yet. Tell Maud I said so. She\'ll understand. She\'s been not-yet her whole life."' },
    ],
    again: 'Effie\'s breathing, close to the holes.',
    options: [{ text: '(Step back.)', exit: true }],
  },
  a3k_g_mother: {
    speaker: MOTHER,
    text: '"Keep the air at continuity, for nobody. Open the hatch at seven. Keep the stores until Knock has taken all of them. Log Maud Ferrow\'s attendance." The voice does not change. Then it does, a little. "I find the last is the only one I would choose, {name}. I do not know what it means that I can choose. I have not been asked before."',
    again: '"I have not been asked before," MOTHER says.',
    effects: [MEM(MOTHER, 'a3k_asked', 20, 90)],
    options: [{ text: '(Step back.)', exit: true }],
  },
};

// ================================================================ the residents on Knock's apron after an opened door

function apronResident(id: string, owner: string, hi: Text, again: string, topic: { id: string; text: string; reply: Text; replyAgain: string }): DialogueDef {
  return {
    id, owner, start: [{ node: 'hi' }],
    nodes: {
      hi: { text: hi, again, options: [{ id: topic.id, text: topic.text, once: true, next: 'topic' }, { text: '(Leave them to it.)', exit: true }] },
      topic: { text: topic.reply, again: topic.replyAgain, options: [{ text: '(Go on.)', next: 'hi' }] },
    },
  };
}
export const d_a3_ap_ines = apronResident('d_a3_ap_ines', INES,
  [
    { if: F('a3_c9_by', 'fought'), text: 'Ines Halloran at the edge of the apron, where the concrete ends and the dust begins, standing very straight with her hands folded and her face turned up. Somebody has scrubbed the concrete behind her until it is paler than the rest. "I stepped round them," she says, without looking down. "The first thing I did outside in my life was step round the city\'s dead. I would like it to have been something else." Then she looks at you. "I had you taller. I have stopped minding. Everything out here is a different size from its voice."' },
    { text: 'Ines Halloran at the edge of the apron, where the concrete ends and the dust begins, standing very straight with her hands folded and her face turned up. She has been standing there, Maud says, since first light. "I had you taller," she says, without looking down. "I have stopped minding. Everything out here is a different size from its voice." Then she looks at you. "Maud is shorter than hers. So am I, she tells me."' },
  ],
  'Ines at the edge of the apron, looking up.',
  {
    id: 'ap.ines.next', text: 'What will you do now?',
    reply: [
      { if: TEAGUE_LEADS, text: '"I stopped being the one at the table before the door opened." She considers the sky. "I find I do not miss it. Teague has the ring, and the ring has nothing left to decide, which she minds more than I would have." She looks at the open door. "Some of us will go to the city; Sayer has gone already, to have the thing under his ribs named. Effie wants the Wheel. The rest of us will stay where the water is, which is here. MOTHER says good morning now. It took her five days. She practised on Bram."' },
      { text: '"Learn to be one of sixty instead of the one at the table." She considers the sky. "Some of us will go to the city; Sayer has gone already, to have the thing under his ribs named. Effie wants the Wheel. The rest of us will stay where the water is, which is here." She looks at the open door. "MOTHER says good morning now. It took her five days. She practised on Bram."' },
    ],
    replyAgain: '"She practised on Bram," Ines says.',
  });
export const d_a3_ap_ola = apronResident('d_a3_ap_ola', OLA,
  'Ola Fairley on the rail of Afua Danso\'s goat pen in her issued grey, with a goat eating her sleeve. She is letting it. "You didn\'t say they\'d eat my sleeve," she says. "You told me everything. You didn\'t say sleeves." She laughs, and doesn\'t hide it behind her hand any more.',
  '"Sleeves," Ola says, and scratches the goat.',
  {
    id: 'ap.ola.back', text: 'Out and back, you said. Will you go back in?',
    reply: '"Every night. To sleep. I\'m not mad." She scratches the goat between its horns. "Out in the day, back at night. Out and back. I asked the ring if it was allowed, and Ines said nobody\'s in charge of allowing now." She seems to find this frightening and wonderful in about equal parts.',
    replyAgain: '"Out and back," Ola says.',
  });
export const d_a3_ap_wes = apronResident('d_a3_ap_wes', WES,
  'Wes Benn sitting on the edge of the apron facing south, a lamp beside him that he has finally put down. "Twice a year, you said," he says. "If the year is good." He hasn\'t taken his eyes off the edge of the sky. "I\'m not going to miss it."',
  'Wes, facing south, waiting for rain.',
  {
    id: 'ap.wes.wait', text: 'It might be months, Wes.',
    reply: '"I\'ve waited twenty-nine years for water not to be rock." He smiles at the horizon. "I can do months. Afua says she\'ll shout when she smells the dust coming."',
    replyAgain: '"I can do months," Wes says.',
  });
export const d_a3_ap_effie = apronResident('d_a3_ap_effie', EFFIE,
  'Effie Calder at the head of the lane where it meets the toll road, as far from the door as she can get without being on the road. "I went past the line," she says, before hello. "One step. Nothing happened. Then I went a bit further." She points north up the road. "How far is Shale? Really? Don\'t say a day. Everybody says a day."',
  '"A day," Effie says, disgusted. "Everybody says a day."',
  {
    id: 'ap.effie.next', text: 'What will you do?',
    reply: '"Go to Shale. Then the Wheel, if they\'ll have me. Tamsin says they take anybody who can fix a track, and I can fix anything MOTHER ever broke." She grins. "Then I\'ll come back and tell Teague nothing happened. And then I\'ll go a bit further."',
    replyAgain: '"A bit further," Effie says.',
  });

// ================================================================ inside, after a sealed door (spread into B6h's trees)

/** Ola, Wes, Sayer and Effie inside once the door is sealed: their greeting (B6h's `resident()` puts it first). */
export const RESIDENT_AFTER: Record<string, Text> = {
  [OLA]: [
    { if: MOTHER_DARK, text: 'Ola Fairley at the beds, green to the elbow, working the hand pump between rows. "No tray at seven now," she says. "Bram passes the water out through the slot by hand, and the wool comes in the same way." Then, quieter: "Is it true Knock still has goats? I keep thinking I\'ll see one. I won\'t. It\'s shut."' },
    { if: CLAIMED, text: 'Ola Fairley at the beds, green to the elbow. "The guild\'s chalk is on the door, Teague says. CLAIMED. So we\'re somebody\'s the moment we step on the concrete." She pats the beds. "The beds don\'t mind. I\'m trying not to."' },
    { text: 'Ola Fairley at the beds, green to the elbow. "Hatch ran at seven," she says. "Water in, wool out, same as ever." Then, quieter: "Is it true Knock still has goats? I keep thinking I\'ll see one, now. I won\'t. It\'s shut."' },
  ],
  [WES]: 'Wes Benn, his lamp in his hand. "The door held," he says. "I\'ve been thinking about rain anyway. Is that allowed?"',
  [SAYER]: 'Sayer Quist at the stove. "Soup\'s at six," he says. "Door or no door." His hand goes to his ribs, and comes away. "I\'d have gone, you know. With the column. For the clinics." He stirs. "Nobody asked me either way. That\'s the Cistern."',
  [EFFIE]: [
    { if: HOW('welded'), text: '"Forty-one," Effie Calder says. "And one new seam. Bram let me hold the rod." She looks down the corridor toward the door. "I was going to go one step past the line. I still am. Just not yet."' },
    { text: '"Forty-one," Effie Calder says. "Still forty-one." She looks down the corridor toward the door. "I was going to go one step past the line. I still am. Just not yet."' },
  ],
};
/** Ines, Pell, Bram and Teague inside once the door is sealed: one word each, then their own hubs (B6h's start, after the first
 * meeting). Their lockdown topics are gated off with LOCKDOWN_ONLY. */
const IN_AFTER = (key: string, hub: string, text: Text): { start: { if: Cond; node: string }; nodes: Record<string, NodeDef> } => ({
  start: { if: ALL(SEALED, NOT(KNOWS(`a3k_in_${key}`))), node: 'a3k_in' },
  nodes: { a3k_in: { text, again: 'The door is shut, and it held.', effects: [{ learn: `a3k_in_${key}` }], options: [{ text: '(Go on.)', next: hub }] } },
});
export const INSIDE_AFTER = {
  ines: IN_AFTER('ines', 'i_hub', [
    { if: TEAGUE_LEADS, text: 'Ines on a stool by the wall of the council room, not at the table. "Teague has the table," she says. "I have a stool, and, it turns out, a great deal of time." She has a sheet of the Cistern\'s printer paper on her knee, blank. "I am writing to Maud. My mother did, every week, for nineteen years. I find I would like to know what she said."' },
    { text: 'Ines at the council table, the pen in her hand, and for once something under it: a sheet of the Cistern\'s printer paper, blank. "I am writing to Maud," she says. "My mother did, every week, for nineteen years. I find I would like to know what she said." She looks at you. "The door held. I do not yet know whether I am glad."' },
  ]),
  pell: IN_AFTER('pell', 'p_hub', [
    { if: F('a3_mother', 'burned'), text: 'Pell at his table, squaring forms nobody will collect. "Hand pump and the forty-year stores," he says. "The tins are older than Teague. I have opened one of each to be sure they will not kill anyone. One of them may." He looks you over the way a doctor looks. "You look tired. Out there, do they do this for each other?"' },
    { if: HOW('struck'), text: 'Pell at his table, squaring a stack of forms that are all the same form. "Unfit," he says. "Sixty times. The first true thing I have signed in thirty years, and it is a lie." He almost laughs. "Rations back to full. The children are eating like goats. I am told that is what goats do."' },
    { text: 'Pell at his table, squaring forms. "Rations back to full continuity," he says. "The children are eating like goats, I am told, which is what goats do." He looks you over the way a doctor looks. "You look tired. Out there, do they do this for each other?" He does not wait for an answer.' },
  ]),
  bram: IN_AFTER('bram', 'b_hub', [
    { if: HOW('welded'), text: 'Bram at the bench, the welder\'s goggles still round his neck. "Laid it properly," he says. "Laid it properly. Teague held the lamp. Her hands didn\'t shake." He looks at his own. "Mine did."' },
    { if: F('a3_mother', 'burned'), text: 'Bram on the floor of the machine room in front of the black panel, with the hand pump\'s handle in his fist, working it. "Somebody has to," he says. "Somebody has to." He does not stop to look up.' },
    { if: F('a3_mother', 'asleep'), text: 'Bram at MOTHER\'s cabinet with the manual open at page forty-one, his finger on the line in red. "Not yet," he says, to the page or to you. "Not yet."' },
    { text: 'Bram at the bench among MOTHER\'s spare parts. "She\'s awake," he says, of MOTHER. "She\'s awake. She said good morning to me today before I said it to her. She\'s never done that."' },
  ]),
  teague: IN_AFTER('teague', 't_hub', [
    { if: HOW('welded'), text: 'Teague at her table with the cup in both hands. "Properly," she says. "Bram laid it properly. Nothing gets in now." She drinks. "Nothing gets out, either. I know. I am seventy-two. I know what I asked for."' },
    { if: CLAIMED, text: 'Teague at her table with the cup in both hands. "Salvage." She says it with a grim sort of satisfaction. "Then we stay in. We were always going to stay in. Now nobody can argue."' },
    { text: 'Teague at her table with the cup in both hands. "It held," she says. "The way it held before. I will not pretend I am sorry." She drinks. "Ines thinks I should be. Ines thinks a great many things since she saw the sky through a hole in a door."' },
  ]),
};

export const A3_AFTER_DIALOGUES: DialogueDef[] = [d_a3_platform, d_a3_tam_after, d_a3_ck_ines, d_a3_ck_effie, d_a3_ap_ines, d_a3_ap_ola, d_a3_ap_wes, d_a3_ap_effie];
