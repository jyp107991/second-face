import type { DialogueDef, NodeDef, OptionDef, PassiveDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { HOLD_LINES, type HoldGroup } from '../quests/a3';
import {
  A3_OPEN, ALLY, ALLY_NEEDS, ASH, AT_CLOSE, CHARGE_OPEN, CHARGE_POWDER, ILYA, IN, KES, LOWE, LOWE_CLOSE, NINE, NINE_CONSCIENCE, ODILE, PNR_OPEN, RAFE,
  RAFE_WIRES, READY_OPEN, REYES, REYES_CLOSE, SHIFT_CASES, TAMSIN, WITH_YOU, WREN, type Ally,
} from '../world/a3_conds';
import { WARN_LEFT } from '../world/a3_letters';

/**
 * Readiness, what you hold, and the point of no return (B6m, beat 21a). Three things at the Spire's close, from the Ledger's card
 * (`a3_summoned`) until the designate goes up the steps (`a3_pnr`):
 * - **The works' trestle** (`d_a3_ready`, prop `a3_ready` beside the fire barrel): Faulk lends the designate his plan table, and the
 *   ones who came can be asked for the night after the steps, whatever happens at the top of them. Eight acts, each asked once of
 *   whoever does it (`READY_OPEN`): the Choir sits with lamps, Carrick's Stand keeps the quays, the chain's crews keep their own
 *   streets, the Wheel rides ahead to faces, the column's captain keeps the wardens at their posts without the schedule (only a
 *   column that stood down), the Saints read gently first, the record reads its own errors first (Nine, or its fair copy), and the
 *   living on the city's list have heard their lines from the player (three letters answered: `world/a3_letters.ts`). Each sets
 *   `a3_ready_<act>` and adds one to `a3_ready`. None of them changes what the player holds: no act spends a means or a keeper. The
 *   trestle also lays out what the player holds, live (the notebook's page, `q_a3_hold`, as passives), and counts who is missing.
 * - **The charge** (`d_a3_charge`, and the same nodes at the trestle): powder made up and wired into a pump-casing (`k_a3_charge`,
 *   B_MEANS's alternate): the Shift's cases with the hand who came up with them (Rafe Ansel, or Orrin), the six cases out of Number
 *   Six's magazine, or four twists of black powder; wired by the Shift's hand, by Kes, or with Explosives 40. A failure spends
 *   nothing.
 * - **The point of no return** (`d_a3_pnr`, opened the first time the player sets foot on the steps after the card; also the lamp
 *   on the steps, `d_ar_steps`, and the great doors, `d_ar_doors`, which carry the same nodes): the foot of the steps where the
 *   photograph was made. What is held, live, one last time; "(Go up.)" warns once, plainly, that the story ends here and what is
 *   left undone will be told as it stands, and that a save is kept; confirming writes the save (`{ event: 'save' }`, slot `steps`,
 *   before anything else changes), then sets `a3_pnr`, then goes to the steps. "(Not yet.)" changes nothing, at either step.
 * Nothing here happens unasked, and nothing names a way to finish. Story notes: story/B6_NOTES_SECRET.md §3, §5 (M7), §8 B6m and
 * "As built" → B6m.
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
type Interject = NonNullable<NodeDef['interject']>;

const KEZIAH = 'npc_a3_31', LUCAN = 'npc_a3_32', IFEOMA = 'npc_a3_33', TUAN = 'npc_a3_34', VERITY = 'npc_bw_04';

// ---------------------------------------------------------------- what the player holds, read live (the notebook's page)

const LABEL: Record<HoldGroup, string> = { allies: 'who will come', held: 'what you hold', carried: 'in your pack', places: 'what they say of you' };
/** The page's lines as passives: each shows while it holds (unlike the page, which keeps a line once ticked). */
const HELD_PASSIVES: PassiveDef[] = HOLD_LINES.map((l) => ({ if: l.done, label: LABEL[l.group], text: `${l.text}.` }));
const HOLDS_ANY: Cond = ANY(...HOLD_LINES.map((l) => l.done));

// ---------------------------------------------------------------- the readiness acts

const DONE = (id: string, decision: string): Effect[] => [
  { set: `a3_ready_${id}` }, { inc: 'a3_ready' }, { decision: { id: `a3_ready_${id}`, text: decision } },
];
const BACK: OptionDef = { text: '(Back to the trestle.)', next: 'hub' };

/** The eight acts, one option each (offered while `READY_OPEN`), and the node where whoever does it says how. */
const ACT_OPTIONS = (x: string): OptionDef[] => [
  {
    id: `a3r.choir${x}`, text: 'Keziah. The night I go up, keep a vigil: here, and wherever the lights go first.', if: READY_OPEN('choir'), next: 'r_choir',
    effects: [...DONE('choir', 'I asked the Choir to sit with lamps the night I went up the steps: on the close, on the Sink\'s stair, at the Precinct\'s pumps.'), TRUST(KEZIAH, 3)],
  },
  {
    id: `a3r.stand${x}`, text: 'Ifeoma. The night I go up: the quays. Keep them, whatever comes down off this hill.', if: READY_OPEN('stand'), next: 'r_stand',
    effects: [...DONE('stand', 'I asked Carrick\'s Stand to keep the quays the night I went up the steps: the cranes chained, the fuel out on the river, nobody loaded.'), TRUST(IFEOMA, 3)],
  },
  {
    id: `a3r.gangs${x}`, text: 'Tuan. The night I go up: the chain. Every street kept by its own.', if: READY_OPEN('gangs'), next: 'r_gangs',
    effects: [...DONE('gangs', 'I asked the chain\'s three crews to keep their own streets the night I went up the steps, a runner on every corner and nobody crossing a line.'), TRUST(TUAN, 3)],
  },
  {
    id: `a3r.wheel${x}`, text: 'Lucan. Send the riders out ahead of me, the night I go up. Faces, not radios.', if: READY_OPEN('wheel'), next: 'r_wheel',
    effects: [...DONE('wheel', 'I asked the Wheel to put a rider on every road the night I went up the steps, to carry word out to faces before any radio could.'), TRUST(LUCAN, 3)],
  },
  {
    id: `a3r.lowe${x}`, text: 'Captain. If the city\'s schedule stops the night I go up, keep the wardens at their posts anyway.', if: ALL(READY_OPEN('lowe'), LOWE_CLOSE), next: 'r_lowe',
    effects: [...DONE('lowe', 'I asked Captain Lowe to keep the wardens at their posts the night I went up the steps, whatever the schedule did.'), TRUST(LOWE, 3)],
  },
  {
    id: `a3r.reyes${x}`, text: 'Reyes. If the city\'s schedule stops the night I go up, keep the wardens at their posts anyway.', if: ALL(READY_OPEN('lowe'), NOT(LOWE_CLOSE), REYES_CLOSE), next: 'r_reyes',
    effects: [...DONE('lowe', 'I asked Captain Reyes to keep the wardens at their posts the night I went up the steps, whatever the schedule did.'), TRUST(REYES, 3)],
  },
  {
    id: `a3r.kress${x}`, text: '(Send to the lane post for whoever leads the column now.)', if: ALL(READY_OPEN('lowe'), NOT(LOWE_CLOSE), NOT(REYES_CLOSE)), next: 'r_kress',
    effects: DONE('lowe', 'I asked the column, through its senior warden, to keep the wardens at their posts the night I went up the steps, whatever the schedule did.'),
  },
  {
    id: `a3r.saints${x}`, text: 'Verity. If it all gets read the night I go up, the Saints read first. Gently.', if: ALL(READY_OPEN('saints'), NOT({ dead: VERITY })), next: 'r_saints',
    effects: [...DONE('saints', 'I asked the Saints to read first, and gently, if anything was read aloud the night I went up the steps.'), TRUST(VERITY, 3)],
  },
  {
    id: `a3r.saints.boy${x}`, text: '(Ask the Saints for what Verity promised.)', if: ALL(READY_OPEN('saints'), { dead: VERITY }), next: 'r_saints_boy',
    effects: DONE('saints', 'I asked the Saints to read first, and gently, if anything was read aloud the night I went up the steps, as Verity had promised.'),
  },
  {
    id: `a3r.nine${x}`, text: 'Nine. If the record is read, read your count first: every forecast it got wrong.', if: ALL(READY_OPEN('nine'), WITH_YOU('nine')), next: 'r_nine',
    effects: [...DONE('nine', 'I asked Nine to read its count of the record\'s failed forecasts first, before anything else was read.'), { approval: { companion: NINE, by: 3 } }],
  },
  {
    id: `a3r.copy${x}`, text: '(Chalk the first page of Unit 9\'s count on the plank, for whoever reads first.)', if: ALL(READY_OPEN('nine'), NOT(WITH_YOU('nine'))), next: 'r_copy',
    effects: DONE('nine', 'I chalked Unit 9\'s count of failed forecasts on the trestle at the close, to be read first if anything was read.'),
  },
  {
    id: `a3r.warned${x}`, text: '(Tell them the living on the city\'s list have heard their lines from me.)', if: READY_OPEN('warned'), next: 'r_warned',
    effects: DONE('warned', 'The living names on the city\'s list that I could reach heard their lines from me first, in letters, before the steps.'),
  },
];
const HUB_OPTIONS = (x: string): OptionDef[] => [
  ...ACT_OPTIONS(x),
  { id: `a3r.held${x}`, text: '(Lay out what you hold on the plank.)', next: 'held', repeat: true },
  { id: `a3r.absent${x}`, text: '(Count who isn\'t at the table.)', next: 'absent', repeat: true },
  { id: `a3r.powder${x}`, text: '(Lay out the powder.)', if: ALL(CHARGE_OPEN, CHARGE_POWDER), next: 'ch_bench', repeat: true },
  { text: '(Leave the trestle.)', exit: true },
];

const HEARD_HABIT: Cond = ANY({ seen: 'a3lc.now' }, { seen: 'a3lc.now.hub' });
/** Lowe's act at the trestle, after his opening words (he said the habit at the close, or says it now). */
const LOWE_ACT = (open: string): string => `Lowe comes to the trestle and does not sit. He puts his cap down on the plank instead, crown down, the way a warden puts down a thing he means to pick up again. ${open} "Then here is the habit, so that it is written somewhere. The Precinct's posts doubled at the clinic doors and at the pumps. Rifles slung, not carried. Line six of every standing order: residents are not to be frightened. The lane gates left open, not shut; a shut gate on a bad night is how a crowd learns to climb." He picks the cap up. "I cannot promise you the Precinct, designate. I can promise you the four who stood on your apron, and the ones they eat with. They are the ones who will be at the clinic doors. They have been told." A pause the length of a clause. "I told them before you asked. I wanted to see whether you would."`;

const ACT_NODES: Record<string, NodeDef> = {
  r_choir: {
    speaker: KEZIAH,
    text: 'Keziah comes across from the planters with her hands tucked into her sleeves against the cold and looks at the bare plank as if it were a bed somebody was about to be laid on. "A vigil." She tries the word and puts it down again. "We don\'t keep vigils, child. A vigil is waiting for somebody to die or to wake. We sit." She sits, on the end of Faulk\'s trestle, which he would not like. "So we\'ll sit. On this stone, and on the Sink\'s stair, and at every pump the Precinct runs, one of us at each with a lamp and a pot of something hot, all night. We\'ll sing the long one, the one with no end, so anybody who can\'t see where they\'re going can walk toward the noise." She looks at the city\'s lamps. "If the lights go, people will be afraid of the dark first, before they get round to being afraid of anything else. We are not afraid of the dark. We\'ll lend them that." She chalks a small circle on the plank, the Choir\'s mark for an open sky, and nothing else.',
    again: '"We\'ll sit," Keziah says.',
    interject: [{ companion: ASH, text: '"The long one," Ash says, very low, when she has gone back to her stone. "I sang it all one winter in the Gully, to nineteen people who couldn\'t hear it. It was the only time it ever felt short."' }],
    options: [BACK],
  },
  r_stand: {
    speaker: IFEOMA,
    text: 'Ifeoma Okonjo gets up off the good stone and comes to the trestle with the tally hook in her hand, and lays it on the plank between you like a pen. "Kept is already promised. What you\'re asking is how." She counts it off on the hook\'s tines. "The cranes chained at the jib by sundown. The fuel barges walked out to the middle of the river on their own warps, where nobody with a torch can reach them without a boat, and we have the boats. The Bond\'s doors chained from the inside by the people who work behind them. And nobody, not a warden, not a factor, not a man with a gun and a list, puts a person on anything that floats or rolls, that night or after." She picks the hook up again. "If the city burns, it burns without Carrick\'s fuel in it. That\'s the most a docker can promise, and it\'s more than anybody\'s ever had from a docker for nothing."',
    again: '"Chained at the jib," Ifeoma says.',
    interject: [{ companion: KES, text: '"Fuel in the middle of the river," Kes says. "That\'s the cleverest thing anybody\'s said all week, and she said it like a shopping list."' }],
    options: [BACK],
  },
  r_gangs: {
    speaker: TUAN,
    text: 'Tuan comes over with a fresh apple and does not eat it, which from him you understand is formality. "Auntie said you\'d ask it like that." He sets the apple on the plank like a paperweight. "Here\'s how. Every runner the three crews have, on the chain\'s links, one to a corner, all night. No crew crosses another\'s line, not even to help, because help across a line is how the last war started, and the one before it. The Saints\' tower open to anybody who comes to its door. And the Gilt hold the foot of the Crown\'s stair." He grins. "First time anybody from Bridgeward\'s kept anything for the Crown. They\'ll want paying for it later. Later can wait." He takes the apple back. "You\'ve heard that Bridgeward won\'t burn. What you haven\'t heard is that Auntie Holt said it with her hand on the chain. She\'s never done that for anything that wasn\'t a funeral."',
    again: '"One to a corner," Tuan says.',
    interject: [{ companion: WREN, text: '"Help across a line is how the last war started," Wren says afterwards. "He\'s four years younger than me and he\'s right. I hate that."' }],
    options: [BACK],
  },
  r_wheel: {
    speaker: LUCAN,
    text: 'Lucan Begay comes to the trestle the way a rider comes to a fire, stopping a stride short. "Ahead." He nods slowly. "We\'ve never once been asked to get somewhere before the news. We\'re usually after it, with a cart, picking up what it dropped." He lays it out with one finger in the dust on the plank: the stopping places on the roads in and out of the city, thirty-one of them, a rider at each by a lamp from sundown; the Line\'s halts; Four Ways; the toll road east to Tollhouse 9 and the Sallow. "Whatever comes down off this hill, the riders hear it from a Wheel mouth first, and they carry it out the same way, slow, and to faces. Nobody in the Reach hears what you did out of a box in a wall. They hear it from somebody who can be asked what it means and has to look at them while they answer."',
    again: '"Thirty-one lamps," Lucan says. "One to a road."',
    interject: [{ companion: ILYA, text: '"A face you can ask," Ilya says. "That\'s all anybody in the Sallow ever wanted from the city. They got a list."' }],
    options: [BACK],
  },
  r_lowe: {
    speaker: LOWE,
    text: [{ if: HEARD_HABIT, text: LOWE_ACT('"You heard me say it: a habit before a schedule." He looks at the cap.') }, { text: LOWE_ACT('"Order is a habit before it is a schedule," he says, to the cap.') }],
    again: '"Rifles slung," Lowe says. "Not carried."',
    interject: [{ companion: TAMSIN, text: 'Tamsin watches Lowe pick up his cap and go back to the foot of the steps. "He told them before you asked," she says. "I don\'t know what to do with a warden I like. I\'ll think of something."' }],
    options: [BACK],
  },
  r_reyes: {
    speaker: REYES,
    text: 'Reyes hears it with her arms folded. "You want the wardens to keep order with nobody telling them what order is." She unfolds them. "That\'s called a job. Most of mine have never had one." Then, plainer: "Posts doubled on the clinics and the pumps. Rifles slung. Gates open. Anybody who raises a carbine at a resident that night answers to me, and I am worse than the schedule." She looks up the steps, and then at the place where he would have stood. "He\'d have said it better. He\'d have said it slower. It would have meant the same."',
    again: '"Rifles slung," Reyes says.',
    options: [BACK],
  },
  r_kress: {
    text: 'You send to the lane post. Warden Kress comes up from it with his cap in his hand: the senior warden, who led the column only because there was nobody left above him to lead it, and went back to the ranks the day after. He hears the whole of it standing at attention, which on a man of fifty looks like it costs him. "Line six," he says at the end. "Residents are not to be frightened. I\'ll see to it, designate. I don\'t know who else will." He goes back down to the post, and you hear him at it for a long time afterwards, saying it to the young ones in the voice of a man reading it off a wall.',
    again: 'Kress, at the lane post, saying line six.',
    options: [BACK],
  },
  r_saints: {
    speaker: VERITY,
    text: 'Verity brings the radio with her, back still off, and sets it on the plank with the hiss turned low, so that it sits between you like a third person. "Gently is a method, not a mood." She ticks it off with the screwdriver. "Every set on every roof in Bridgeward on the hiss band from dusk. Twelve of us, a district each, with a list of who lives where. The girl hears the Ledger a breath before the rest of us, she always has, so we will know which lines are coming before they come." She looks at you over the radio. "And this, which nobody has ever done for anybody: if your name is coming, a Saint is at your door before it does. Nobody hears their own death from a stranger on our band. Not one person. I would rather walk all night."',
    again: '"A Saint at the door before it comes," Verity says. "Not one person."',
    interject: [{ companion: ODILE, text: '"A knock before the news," Odile says. "On the floor we called that a courtesy, and charged for it. She\'s giving it away."' }],
    options: [BACK],
  },
  r_saints_boy: {
    text: 'It is a Saints\' boy who comes across the close, with Verity\'s radio held against his chest like a baby, its back still off. "She\'d have come," he says. "She said gently. We\'ll do it gently." He tells it the way she taught him: every set on every roof in Bridgeward on the hiss band from dusk, twelve Saints with a district each, and a Saint at the door of anybody whose name is coming, before it comes. "Nobody hears it from a stranger. That was the whole of what she said, every time." He chalks a small square on the plank, a radio, and goes back across the close without looking round.',
    again: 'A small square in chalk on the plank: a radio.',
    options: [BACK],
  },
  r_nine: {
    speaker: NINE,
    text: 'Nine sets its ledger on the plank and opens it at the back, where its own hand is smallest. "The errors first." The lens clicks, once. "Four hundred and eleven forecasts the record made since R4 and the world did not keep, each with the date it was made and the date it failed. At my speed, an hour and a quarter." It turns a page. "If anything is read tomorrow night, by anybody, at any speed, I will read the first page of this, and the last, and the number, and I will say before I begin that the record has been wrong four hundred and eleven times that it has written down, so that whoever hears what comes after hears it as the record and not as the sky." A pause the length of a clause. "A record that reads its own errors aloud before it reads anybody\'s future is a record that can be argued with. It is the only kind I have ever wished to be."',
    again: '"The errors first," Nine says.',
    options: [BACK],
  },
  r_copy: {
    text: 'You take Unit 9\'s fair copy out of your pack and chalk its first page and its last onto the bare plank in Faulk\'s chalk, and under them the number, four hundred and eleven, in figures a hand high. Then you say it to whoever is at the table: if anything is read tomorrow night, by anybody, at any speed, this is read first. The record has been wrong this many times. Start there. Nobody wipes it off. In the morning somebody has gone over the number again, harder, so the rain will not take it.',
    again: 'The count, chalked on the plank, a hand high.',
    options: [BACK],
  },
  r_warned: {
    text: 'You say it to the trestle, to whoever is at it: the names on the city\'s list that are still living people, the ones you could reach, have each had a letter in your hand with their own line copied out word for word, and have answered it. They will not hear it first from a box. The table is quiet for a moment, the way a table goes quiet when somebody has done a thing nobody asked them to and nobody can think of a reason why they would.',
    again: 'The letters are answered.',
    interject: [
      { companion: ODILE, text: '"You warned them," Odile says. "Before the crash, in writing, in your own hand." She looks at you over her glasses for a long moment. "My dear. You would have been dangerous on the floor."' },
      { companion: ASH, text: '"The Unwritten would call it a waste of ink," Ash says. "The Choir would call it the only ink there is. I don\'t know tonight which I am."' },
    ],
    options: [BACK],
  },
};

// ---------------------------------------------------------------- who isn't at the table

/** Allies whose own need is met and who were never written to (a letter, a duration, no deadline); then what cannot be asked. */
const MISSING: { ally: Ally; label: string; text: string }[] = [
  { ally: 'choir', label: 'the Choir', text: 'Nobody from the Choir is at the table. Openfield would answer a letter.' },
  { ally: 'stand', label: 'Carrick\'s Stand', text: 'Nobody from the quays is here. The Stand owes you, and would answer a letter.' },
  { ally: 'gangs', label: 'the chain', text: 'Nobody from Bridgeward\'s chain is here. Its holders would answer a letter.' },
  { ally: 'wheel', label: 'the Wheel', text: 'No rider of the Wheel is here. Sefa would answer a letter.' },
  { ally: 'saints', label: 'the Saints', text: 'None of the Saints is here. Verity would answer a letter.' },
  { ally: 'shift', label: 'the Shift', text: 'The Shift has powder it would lend you, if you wrote and asked for it.' },
  { ally: 'seventeen', label: 'the Wet', text: 'An assessor of the Wet would come and read, if you wrote and asked it.' },
];
const ABSENT_PASSIVES: PassiveDef[] = [
  ...MISSING.map((m) => ({ if: ALL(ALLY_NEEDS[m.ally], NOT(ALLY(m.ally))), label: m.label, text: m.text })),
  {
    if: ALL(F('a3_lowe'), NOT(F('a3_lowe', 'stood_down'))), label: 'the column',
    text: [
      { if: F('a3_lowe', 'dead'), text: 'The column\'s captain died on your apron. Whatever the wardens do the night after, they will do by the schedule.' },
      { if: F('a3_lowe', 'withdrawn'), text: 'The column went home from your door without standing down. Whatever the wardens do the night after, they will do by the schedule.' },
      { if: F('a3_lowe', 'yielded'), text: 'The column yielded at your door; it did not stand down. Whatever the wardens do the night after, they will do by the schedule.' },
      { text: 'The column carried out its order at your door. Whatever the wardens do the night after, they will do by the schedule.' },
    ],
  },
  { if: ALL(WITH_YOU('nine'), F('nine_log_kept'), NOT(F('nine_log_given')), NOT(NINE_CONSCIENCE)), label: 'Nine', text: 'Nine keeps a count it has never given anybody. It might, if you asked it at the fire.' },
  { if: ALL(WARN_LEFT, NOT({ flag: 'a3_warned', gte: 3 })), label: 'the city\'s list', text: 'Some of the names on the city\'s list are living people who have not had their line from you.' },
];
const NOBODY_MISSING: Cond = NOT(ANY(...ABSENT_PASSIVES.map((p) => p.if!)));

// ---------------------------------------------------------------- the charge (the trestle's nodes, and Rafe's own tree)

const ORRIN_WIRES: Cond = ALL(SHIFT_CASES, NOT(RAFE_WIRES));
const CASES: Cond = { item: 'k_hs_powder' };
const POWDER: Cond = { item: 'j_powder', count: 4 };
const EXPLOSIVES = { skill: 'explosives' as const, dc: 40 };
const MADE = (how: 'shift' | 'cases' | 'powder' | 'kes', take: Effect[] = []): Effect[] => [
  ...take, { give: 'k_a3_charge' }, { set: 'a3_charge_how', value: how }, { xp: 40 },
  { decision: { id: 'a3_charge', text: 'At the Spire\'s close I had a charge made up and wired: enough to bring down a roof, or whatever is under one.' } },
];
const TAKE_CASES: Effect[] = [{ take: 'k_hs_powder' }];
const TAKE_POWDER: Effect[] = [{ take: 'j_powder', count: 4 }];
const CH_INTERJECT: Interject = [
  { companion: NINE, text: '"That is an explosive device," Nine says, "and I am obliged to note it." A pause. "I have noted it. I have not noted where."' },
  { companion: ASH, text: 'Ash looks at the casing for a long time. "The Unwritten would carry that up those steps and call it a prayer," he says. "I used to." He does not say what he calls it now.' },
];

/** The charge's nodes; `back` closes them (the trestle's hub, or leaving Rafe's cases); a question or a failure goes back to the bench. */
function chargeNodes(back: OptionDef): Record<string, NodeDef> {
  const bench: OptionDef = { text: '(Back.)', next: 'ch_bench' };
  return {
    ch_bench: {
      text: [
        { if: ALL(RAFE_WIRES, F('ks_maren', 'hanged')), text: 'Rafe Ansel is sitting on two greasy cases at the end of the trestle with a coil of fuse over his shoulder like a bandolier, the Shift\'s band on his arm, and a pump-casing out of the works\' dead machine between his boots. He came up the Line with the cases the morning the Ledger\'s card came. "She\'d have sent them herself," he says, meaning Maren, and says nothing else about her. "Two cases. Two\'s what\'s left." He looks at the casing. "Tell me what it\'s for and I\'ll tell you if two will do it."' },
        { if: RAFE_WIRES, text: 'Rafe Ansel is sitting on two greasy cases at the end of the trestle with a coil of fuse over his shoulder like a bandolier, the Shift\'s band on his arm, and a pump-casing out of the works\' dead machine between his boots. He came up the Line with the cases the morning the Ledger\'s card came, because Maren said you would need them "when you need them, and not before", and he does not trust anybody else to carry powder on a train. "Six cases was what the magazine had. Two is what the Shift can spare." He looks at the casing. "Tell me what it\'s for and I\'ll tell you if two will do it."' },
        { if: ORRIN_WIRES, text: 'A cage man from Number Six called Orrin is sitting on two greasy cases at the end of the trestle, a coil of fuse over his shoulder and the Shift\'s band on his arm. He ran the winch at Six for twenty years and fires the Shift\'s shots now that Rafe is gone; he came up the Line the morning the Ledger\'s card came, because the Shift said you would need what was in the cases and somebody had to sit on them. "Two cases," he says. "That\'s all there is now. What\'s it for?"' },
        { if: CASES, text: 'Six greasy cases out of Number Six\'s magazine, the Concern\'s mark on every lid, and a coil of fuse: you lay them on the plank one by one. The works\' dead machine at the foot of the steps has a pump-casing in it that nobody will miss, and Faulk\'s box has a blasting detonator in it older than the Burn, which Faulk would tell you he keeps for stumps.' },
        { if: POWDER, text: 'Twists of black powder bought off the road, four of them, enough for a hand-loader\'s winter or one bad idea; the pump-casing out of the works\' dead machine; the detonator Faulk keeps in his box for stumps, older than the Burn. It is all here. Whether your hands are is another matter.' },
        { text: 'Faulk\'s box has a detonator in it older than the Burn, and the works\' dead machine has a pump-casing in it. Neither is any use without something to put in it, and you have nothing that burns that hard.' },
      ],
      again: 'The casing, the detonator, and the powder, on the plank.',
      options: [
        { id: 'a3c.what', text: 'What would it take to bring a roof down? Not a building. A roof, and what\'s under it.', if: ALL(CHARGE_OPEN, RAFE_WIRES), once: true, next: 'ch_what' },
        { id: 'a3c.what.orrin', text: 'What would it take to bring a roof down? Not a building. A roof, and what\'s under it.', if: ALL(CHARGE_OPEN, ORRIN_WIRES), once: true, next: 'ch_what_orrin' },
        { id: 'a3c.rafe', text: '(Let Rafe make it up.)', if: ALL(CHARGE_OPEN, RAFE_WIRES), effects: MADE('shift'), next: 'ch_rafe' },
        { id: 'a3c.orrin', text: '(Let Orrin make it up.)', if: ALL(CHARGE_OPEN, ORRIN_WIRES), effects: MADE('shift'), next: 'ch_orrin' },
        { id: 'a3c.cases', text: '(Pack the six cases into the casing and wire it yourself.)', if: ALL(CHARGE_OPEN, CASES), check: EXPLOSIVES, effects: MADE('cases', TAKE_CASES), next: 'ch_made', fail: 'ch_fumble' },
        { id: 'a3c.cases.kes', text: '(Hand Kes the leads and the six cases.)', if: ALL(CHARGE_OPEN, CASES, IN(KES)), effects: MADE('kes', TAKE_CASES), next: 'ch_kes' },
        { id: 'a3c.powder', text: '(Pack the black powder into the casing and wire it yourself.)', if: ALL(CHARGE_OPEN, POWDER), check: EXPLOSIVES, effects: MADE('powder', TAKE_POWDER), next: 'ch_made', fail: 'ch_fumble' },
        { id: 'a3c.powder.kes', text: '(Hand Kes the leads and the powder.)', if: ALL(CHARGE_OPEN, POWDER, IN(KES)), effects: MADE('kes', TAKE_POWDER), next: 'ch_kes' },
        back,
      ],
    },
    ch_what: {
      speaker: RAFE,
      text: 'Rafe turns the casing over in his hands. "A roof\'s not a quantity," he says. "Depends what holds it up. Stone that holds itself up, you\'d want a quarry\'s worth. Anything held up by a machine, you don\'t bring the roof down; you bring the machine down, and the roof sees to the rest." He sets it on the plank. "Two cases brings down most machines. It\'d bring this square\'s lamps down from here to the lane." He looks at the steel door in the Spire\'s foot and away from it again. "Don\'t ask me about that door. I don\'t want to know what\'s behind that door."',
      again: '"A roof\'s not a quantity," Rafe says.',
      options: [bench],
    },
    ch_what_orrin: {
      text: 'Orrin turns the casing over in his big hands as if it were a stone he meant to set. "A roof\'s not a quantity," he says. "Depends what holds it up. Stone that holds itself up, you\'d want a quarry\'s worth. Anything held up by a machine, you don\'t bring the roof down; you bring the machine down, and the roof sees to the rest." He sets it on the plank. "Two cases brings down most machines. Don\'t tell me which one. I\'ve been told enough for one life."',
      again: '"A roof\'s not a quantity," Orrin says.',
      options: [bench],
    },
    ch_rafe: {
      speaker: RAFE,
      text: [
        { if: F('hs_rafe', 'told'), text: 'Rafe does it on the plank with the casing between his knees, the way a man does it who has done it in the dark at the face with a hundred tons over his head. "You\'re the one who told her," he says, not looking up. "About the cellar. She took it off me, and she was right, and I\'ve hated you for it the regulation amount." He crimps the cap. He tapes the leads back. "Whatever it\'s for, don\'t do it with people under it. Maren took the powder off me before I could find out what that\'s like. Don\'t you go and find out instead." He holds it out, and does not let go of it for a moment, and then does.' },
        { if: F('hs_rafe', 'stood_down'), text: 'Rafe does it on the plank with the casing between his knees, the way a man does it who has done it in the dark at the face with a hundred tons over his head. "You talked me out of the car," he says, not looking up. "I dream about it most nights. Not the car. The people who\'d have been in it." He crimps the cap. He tapes the leads back. "So: whatever it\'s for, don\'t do it with people under it. I\'m telling you what you told me. It was good advice. I\'ve resented it ever since." He holds it out, and does not let go of it for a moment, and then does.' },
        { text: 'Rafe does it on the plank with the casing between his knees, the way a man does it who has done it in the dark at the face with a hundred tons over his head, tamping each handful with the heel of his palm. He crimps the cap with his teeth. He tapes the leads back so they cannot touch until somebody means them to. "Whatever it\'s for," he says, "don\'t do it with people under it. I nearly did, once. I still dream about the ones who\'d have been there." He holds it out, and does not let go of it for a moment, and then does.' },
      ],
      again: 'Rafe sits on the empty cases, his hands in his lap.',
      interject: CH_INTERJECT,
      options: [back],
    },
    ch_orrin: {
      text: 'Orrin makes it up on the plank without a word, a handful at a time, tamping with the heel of his palm the way you would bed a pillar, and crimps the cap with a tool he has carried on a string round his neck since before you were born. He tapes the leads back. "Shot-firer\'s rule," he says, handing it over. "You count everybody out before, and you count everybody back after, and if the numbers don\'t match you don\'t go home." He sits back down on the empty cases. "I hope your numbers match."',
      again: 'Orrin sits on the empty cases, counting something on his fingers.',
      interject: CH_INTERJECT,
      options: [back],
    },
    ch_kes: {
      speaker: KES,
      text: 'Kes takes the leads off you without asking, which is how you know she has done it before. "Every kid on the Shelf can crimp a cap," she says, crimping one with her back teeth. "First thing they teach you, so you don\'t go up the face with somebody who can\'t." She packs the casing a handful at a time and tamps it with the heel of her hand, quick, bored, sure, and tapes the leads back. "There. It won\'t go off unless somebody means it to." She wipes her palms on her trousers and does not look at you. "Don\'t tell me what it\'s for. I can guess, and I\'d rather guess."',
      again: 'Kes wipes the powder off her hands for the third time.',
      options: [back],
    },
    ch_made: {
      text: 'You pack the casing a handful at a time, tamping with the end of Faulk\'s chisel handle because there is nothing softer, and wire the detonator with the leads crossed under tape so that they cannot find each other by accident in your pack. It takes an hour. Your hands are steady for all of it, and shake for a long time afterwards. It is heavier than it looks. Whatever it is for, it is for that now.',
      again: 'The charge, heavier than it looks.',
      interject: CH_INTERJECT,
      options: [back],
    },
    ch_fumble: {
      text: 'You get as far as the detonator. Then you look at the two leads in your hands and the powder in the casing and understand, very clearly, that you do not know which one does what in the way you would need to know it at the bottom of a stair with your hands shaking. You put it all back on the plank. Nothing is spent. Somebody who knows how could do it. It isn\'t you, not yet.',
      again: 'The leads, untouched, on the plank.',
      options: [bench],
    },
    ch_have: {
      text: [
        { if: RAFE_WIRES, text: 'Rafe has his feet up on the empty cases. "It\'s in your pack," he says, without opening his eyes. "Leads taped back. Don\'t sit on it."' },
        { text: 'The charge is in your pack, heavier than it looks, the leads taped back.' },
      ],
      again: 'The charge, in your pack.',
      options: [back],
    },
    ch_late: {
      text: 'Empty powder cases at the end of the trestle, and a coil of fuse nobody wanted.',
      again: 'Empty cases.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
  };
}

const LEAVE_CASES: OptionDef = { text: '(Leave it.)', exit: true };

export const d_a3_charge: DialogueDef = {
  id: 'd_a3_charge', owner: RAFE,
  start: [
    { if: NOT(AT_CLOSE), node: 'ch_late' },
    { if: ANY({ item: 'k_a3_charge' }, F('a3_charge_how')), node: 'ch_have' },
    { node: 'ch_bench' },
  ],
  nodes: chargeNodes(LEAVE_CASES),
};

// ---------------------------------------------------------------- the works' trestle (the readiness hub)

export const d_a3_ready: DialogueDef = {
  id: 'd_a3_ready', owner: 'narrator',
  start: [
    { if: F('a3_pnr'), node: 'cold' },
    { if: ALL(AT_CLOSE, NOT({ knows: 'a3_trestle' })), node: 'first' },
    { if: AT_CLOSE, node: 'hub' },
    { if: A3_OPEN, node: 'works' },
    { node: 'plain' },
  ],
  nodes: {
    plain: {
      text: 'Faulk\'s trestle under the scaffold lamp: three planks on two horses, the day\'s plans weighted down with numbered offcuts of stone. STONE 412 — FAÇADE — COURSE 9. Nothing on it is for you.',
      again: 'Faulk\'s trestle, and his plans.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
    works: {
      text: 'Faulk\'s trestle, and the plans on it relettered like the works board: R30, R30, R30, every course of stone nineteen years sooner. Somebody has written HURRY in the margin of the top sheet, which nobody on the works has ever written on anything.',
      again: 'The plans, relettered. HURRY, in the margin.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
    first: {
      text: 'Faulk\'s trestle stands under the scaffold lamp at the edge of the square, where the works lay out each morning\'s stones on paper: three planks on two horses, the plans weighted down with numbered offcuts. Tonight the plans are rolled and tied and stood in a bucket, and the planks are bare. Faulk is up on the scaffold and does not look round. Under the nearest stone is a note in a mason\'s capitals: FOR THE DESIGNATE. DON\'T STAND ON IT. Whatever happens at the top of those steps, the city will have a night after it that nobody has planned for: the Precinct\'s lamps on or off, the radios loud or dark, a crowd at the foot of the steps either way. The people who came are here because they know it. A table is where you ask them for it.',
      again: 'Faulk\'s trestle, bare under the scaffold lamp.',
      effects: [{ learn: 'a3_trestle' }],
      interject: [{ companion: NINE, text: '"Faulk has lent the designate a table," Nine says. "He has never lent anybody anything. I have the works\' records. I have checked."' }],
      options: HUB_OPTIONS(''),
    },
    hub: {
      text: [
        { if: { flag: 'a3_ready', gte: 8 }, text: 'Faulk\'s trestle, with more chalk on it than plank: everything that could be asked for the night after has been, a line each, in the hand of whoever promised it. There is no room left to write.' },
        { if: { flag: 'a3_ready', gte: 4 }, text: 'Faulk\'s trestle, half covered in chalk: what has been promised for the night after, a line each, in the hand of whoever promised it.' },
        { if: { flag: 'a3_ready', gte: 1 }, text: 'Faulk\'s trestle. A few lines of chalk on the bare plank: what has been promised for the night after, each in the hand of whoever promised it.' },
        { text: 'Faulk\'s trestle, bare under the scaffold lamp. Nobody has been asked for anything yet.' },
      ],
      again: 'The trestle, and the chalk on it.',
      options: HUB_OPTIONS('.hub'),
    },
    held: {
      text: [
        { if: HOLDS_ANY, text: 'You lay it out on the bare plank the way Maud taught you to go through a pack before a road: everything out, everything looked at, everything back in. Not just what is in the pack.' },
        { text: 'You lay it out on the bare plank the way Maud taught you to go through a pack before a road. There is not much to lay out.' },
      ],
      again: 'Everything out on the plank, and back in.',
      passives: HELD_PASSIVES,
      options: [{ text: '(Put it all back.)', next: 'hub' }],
    },
    absent: {
      text: [
        { if: NOBODY_MISSING, text: 'You count who is not at the table, and come to the end of the count quickly: everybody who could come, came, and everybody who could be asked something has a place to stand.' },
        { text: 'You count who is not at the table.' },
      ],
      again: 'Who is not at the table.',
      passives: ABSENT_PASSIVES,
      options: [BACK],
    },
    cold: {
      text: 'The trestle is bare, the plank wiped clean, Faulk\'s numbered stones in a row along its edge as if they were waiting to be laid.',
      again: 'The bare trestle.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
    ...ACT_NODES,
    ...chargeNodes(BACK),
  },
};

// ---------------------------------------------------------------- the point of no return: the foot of the steps

const PNR_SAVE: Effect = { event: 'save', data: { slot: 'steps', label: 'Before the steps' } };
const GO_UP: Effect[] = [
  PNR_SAVE,
  { set: 'a3_pnr' },
  { decision: { id: 'a3_pnr', text: 'I went up the Spire\'s steps from the lamp where the photograph was made.' } },
  { event: 'goto', data: { location: 'md_spire', spawn: 'steps' } },
];
const BEEN_HERE: Cond = ANY({ seen: 'a3pnr.notyet' }, { seen: 'a3pnr.notyet.warn' });

/** The foot of the steps, shared by `d_a3_pnr` (the steps' trigger) and the lamp and the great doors (md_spire.ts). */
export const PNR_NODES: Record<string, NodeDef> = {
  pnr_foot: {
    text: [
      { if: BEEN_HERE, text: 'The lamp at the foot of the steps again, a stride to the left of where the photograph was made. The chain still lies coiled on the top step. The door is still an inch open, and the light behind it has not moved.' },
      { text: 'The foot of the Spire\'s steps, and the lamp you have looked at in a photograph since Knock: the same lamp, the same stone, a stride to the left of where the picture was made. The scaffold has come down off the middle flight since the card came. The chain is off the great doors and lies coiled on the top step like something asleep, and one leaf of the bronze stands an inch open with a light behind it that is not a lamp. Nobody is on the steps. Behind you the close goes on: the fire barrel, the people who came, Faulk\'s trestle, the lane to the Precinct. In front of you the steps go up.' },
    ],
    again: 'The foot of the steps, under the lamp.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin stops a step below you and does not come up level. "I\'ll be one step down," she says. "Like the picture. Somebody ought to be where the photographer was." She does not smile. "Go on, then. Or don\'t. I\'m not going anywhere either way."' },
      { companion: NINE, text: '"The steps," Nine says. "A hundred and twenty years I have walked past them. Today, if you go, I am walking up." The lens clicks. "I have logged it. It seemed the kind of thing that ought to be."' },
      { companion: WREN, text: 'Wren looks up the steps the way she looks at a place she means to come back to in the dark, and then, for once, does not. "No way down but through," she says. "I know the kind."' },
      { companion: ILYA, text: '"Twenty-two to the first landing," Ilya says. "Counted them last night." He does not say why, and you do not ask.' },
      { companion: ODILE, text: '"Every sheet I ever wrote had a date on it that somebody would one day reach," Odile says. "I always wondered what it felt like from their side." She looks at you. "No. Don\'t tell me. I\'d only price it."' },
      { companion: ASH, text: 'Ash stays on the bottom step, where he stood the first time. "I said I\'d not climb them," he says. "I\'ll climb them today." He does not say which of the things he carries is coming up with him.' },
      { companion: KES, text: 'Kes puts her hand flat on the lamp post, the way she puts it on a machine to hear it. "It\'s cold," she says, surprised. "I thought it\'d hum. Everything in this city hums."' },
    ],
    options: [
      { id: 'a3pnr.held', text: '(Go through what you hold, one last time.)', next: 'pnr_held', repeat: true },
      { id: 'a3pnr.up', text: '(Go up.)', next: 'pnr_warn' },
      { id: 'a3pnr.notyet', text: '(Not yet.)', exit: true },
    ],
  },
  pnr_held: {
    text: [
      { if: HOLDS_ANY, text: 'You go through it on the bottom step the way Maud taught you to go through a pack before a road: everything out, everything looked at, everything back in.' },
      { text: 'You go through it on the bottom step the way Maud taught you to go through a pack before a road. It does not take long.' },
    ],
    again: 'Everything out on the step, and back in.',
    passives: HELD_PASSIVES,
    options: [{ text: '(Put it all back.)', next: 'pnr_foot' }],
  },
  pnr_warn: {
    text: 'You put your foot on the first step, and stop, because this is the last time stopping will mean anything. Once you go up, the story ends here. Whatever you have left undone in the Reach stays undone and will be told as it stands: nothing out there waits for you to come back down and finish it, and nobody you have not already asked will be asked. The ones who came are where they are. (A save is kept from this moment, "Before the steps". Loading it brings you back here, to the foot of the steps, with everything that is still open still open.)',
    again: 'The first step.',
    options: [
      { id: 'a3pnr.go', text: '(Go up.)', effects: GO_UP, exit: true },
      { id: 'a3pnr.notyet.warn', text: '(Not yet.)', exit: true },
    ],
  },
  pnr_after: {
    text: 'The steps, and you on them. There is no way back down to the close but the way you are going.',
    again: 'The steps.',
    options: [{ text: '(Go on.)', exit: true }],
  },
  pnr_none: {
    text: 'The steps go up to the great doors. Nobody has asked you to climb them.',
    again: 'The steps.',
    options: [{ text: '(Leave them.)', exit: true }],
  },
};
/** The start entries the lamp (`d_ar_steps`) and the great doors (`d_ar_doors`) put before their own (md_spire.ts). */
export const PNR_START: { if: Cond; node: string }[] = [{ if: F('a3_pnr'), node: 'pnr_after' }, { if: PNR_OPEN, node: 'pnr_foot' }];

export const d_a3_pnr: DialogueDef = {
  id: 'd_a3_pnr', owner: 'narrator',
  start: [...PNR_START, { node: 'pnr_none' }],
  nodes: PNR_NODES,
};

export const A3_READY_DIALOGUES: DialogueDef[] = [d_a3_ready, d_a3_charge, d_a3_pnr];
