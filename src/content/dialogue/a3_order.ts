import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ASH, ILYA, KES, LN, NINE, NINE_KEEPER_CITY, NINE_KEEPER_PLAYER, NINE_KEEPER_SELF, ODILE, ON_SIDE, ORDER_READ, RECALL_OPEN, SIDES, TAMSIN, WREN, type Side,
} from '../world/a3_conds';
import { CRADLE_RUNS } from './md_docks';

/**
 * Act 3's fourth order (B6a: the read tree; B6b: the courier, the recall at the Precinct gate and its routes).
 * `d_a3_order_read` opens from the pack ("Read" on `k_a3_order`): the seal, the order, the Ledger's reason for bringing
 * the schedule forward (by the Long Night's alliance, said once here and once in the vault), the steps' date corrected,
 * the foot every city order carries (objections lie to the Court of Accounts), and the Act Three card. Reading it starts
 * the road home; with Nine on the player's side, the notice folded in with it starts the recall.
 * B6b: `d_a3_courier` (the Precinct courier at the lane to the Spire: the drop, the Court, a keeper's answer by post);
 * `d_a3_recall` (the two recall wardens at the Precinct gate: what the deed decides, and every way of answering them: the
 * keeper declines, the keeper refuses or hands it over, the Court, a purchase under 9(b), hiding it outside the Wall,
 * a fight, or letting it go); `d_a3_nine_hid` (a hidden Nine where it waits: Clover, or the Hulls while the cradle runs).
 * The Court's two cases are built on its own bench (`a3_court.ts`). Story notes: story/B6_NOTES_SECRET.md §2.1 and §2.3
 * (18, 18b, 18c).
 */

/** The Ledger's reason, by alliance, in its own capitals. */
const WHY: Record<Side, string> = {
  choir: 'AN ORDER OF EVICTION WAS BROKEN IN THE OPEN AT OPENFIELD BY PERSONS WHO KEEP NO RECORD. THE PLAN\'S DISSENT IS MOVING ON ITS CORE.',
  guild: 'A PRIVATE BID FOR THE CITY\'S CORE HAS BEEN ENTERED IN THE OPEN. A CHAIR THAT STANDS EMPTY CAN BE BOUGHT.',
  ledger: 'THE DESIGNATE HAS SHOWN THAT THE SCHEDULE HOLDS. THERE IS NO CAUSE TO WAIT.',
  truce: 'EVERY PARTY IN THE REACH IS IN THE DESIGNATE\'S DEBT. THE REACH WILL NOT BE SO GOVERNABLE AGAIN FOR NINETEEN YEARS.',
  none: 'THE DESIGNATE STOOD ASIDE AND THE FORECAST WAS KEPT TO THE LETTER. THE SCHEDULE HOLDS WITHOUT ASSISTANCE.',
};
const ORDER = 'RESERVE 9 (THE MOUTH) — RELOCATION TO PRECINCT SUPPLY — BY FORCE IF NON-COMPLIANT — EXECUTION ON THE DESIGNATE\'S ATTENDANCE — THE FIRST ACT OF THE CHAIR.';
/** B6b: the city's boilerplate at the foot of every order, which points to the Court (case `reserve`). */
const FOOT = 'Under that, small, the line the city prints at the foot of every order it has ever sent: OBJECTIONS LIE TO THE COURT OF ACCOUNTS.';
const order: { if?: Cond; text: string }[] = SIDES.map((s) => ({
  if: LN(s),
  text: `Three sheets, the city's even hand on all of them. The first is the order itself: ${ORDER} Under it, the reason, set down the way the Precinct sets down weather: ${WHY[s]} THE SCHEDULE IS BROUGHT FORWARD. And at the foot of the last sheet, one line corrected in the same hand: PUBLIC STEPS REOPEN R49, the 49 ruled through and 30 written over it. ${FOOT}`,
}));
order.push({ text: `Three sheets, the city's even hand on all of them. The first is the order itself: ${ORDER} THE SCHEDULE IS BROUGHT FORWARD. And at the foot of the last sheet, one line corrected in the same hand: PUBLIC STEPS REOPEN R49, the 49 ruled through and 30 written over it. ${FOOT}` });

/** The notice for Unit 9 folded in with the order: only with Nine on the player's side, and only once. */
const NINE_SHEET: Cond = { all: [ON_SIDE('nine'), { quest: 'q_a3_recall', status: 'none' }] };
const nineSheet = (id: string): OptionDef => ({ id, text: '(There is a fourth sheet, folded smaller, with a unit number on it.)', if: NINE_SHEET, next: 'recall' });
const fold = (id: string): OptionDef => ({ id, text: '(Fold it.)', exit: true });

export const d_a3_order_read: DialogueDef = {
  id: 'd_a3_order_read', owner: 'narrator',
  start: [{ if: { not: ORDER_READ }, node: 'seal' }, { node: 'again' }],
  nodes: {
    seal: {
      text: 'The Ledger\'s grey seal, and under it the city\'s even hand: BY COURIER — TO THE DESIGNATE — RESERVE 9 (THE MOUTH). The courier stood over you while you signed for it, then went without a word, the way the city\'s people do when the paper has said everything.',
      again: 'The city\'s order, still sealed. RESERVE 9 (THE MOUTH).',
      options: [{ id: 'a3o.break', text: '(Break the seal.)', next: 'order' }, { id: 'a3o.later', text: '(Not yet.)', exit: true }],
    },
    order: {
      text: order,
      again: `The fourth order. ${ORDER} PUBLIC STEPS REOPEN R30.`,
      effects: [
        { set: 'a3_order_read' }, { quest: 'q_a3_return', start: true }, { xp: 50 },
        { decision: { id: 'a3_order_read', text: 'I read the city\'s fourth order for the Cistern: relocation to the Precinct, carried out when I attend the door, as the first act of a chair the city keeps for me.' } },
        { event: 'title', data: { text: 'ACT THREE\nTHE DOOR' } },
      ],
      interject: [
        { companion: TAMSIN, text: 'Tamsin reads it over your arm and her mouth goes thin. "Supply," she says. "Sixty people, and they\'ve written us down as supply." She reads the line about attendance twice, the second time with her finger under it. "So it waits for you. It\'s always been waiting for you, hasn\'t it."' },
        { companion: NINE, text: '"Execution on the designate\'s attendance." Nine reads it aloud, at the speed it reads everything. "A condition precedent, not a courtesy. An order that names the one who executes it cannot be executed by anyone else." Its cracked lens stays on you a moment longer than it needs to. "The record suggests the city has made you the door."' },
        { companion: ASH, text: '"The first act of the chair," Ash says, and folds his arms. "They\'ve already written down what you\'ll do when you sit in it. That\'s what a forecast is for."' },
        { companion: ODILE, text: '"By force if non-compliant." Odile taps the line. "Nobody writes that unless they have costed it. Somebody in that tower has a price for sixty people moved against their will, and it is lower than you would like."' },
        { companion: WREN, text: '"Supply," Wren says, and her burned hand goes into her pocket. "That\'s the word they put on a block sheet. I\'ve read enough of those."' },
        { companion: KES, text: '"They didn\'t write you a leash," Kes says. "They wrote you a chair. Same thing with a cushion on it."' },
        { companion: ILYA, text: 'Ilya counts the lines with one finger, the way he counts everything. "Sixty," he says. "And one at the door." He looks up. "That\'s you."' },
      ],
      options: [nineSheet('a3o.nine'), fold('a3o.fold')],
    },
    recall: {
      text: 'The fourth sheet is a Precinct notice on thinner paper: PRECINCT OF MERIDIAN — UNIT 9 (ASSESSOR, CIVIL) — DISPOSAL — AS SCHEDULED — R31 BROUGHT FORWARD. THE KEEPER WILL PRESENT THE UNIT AT THE PRECINCT GATE.',
      again: 'UNIT 9 — DISPOSAL — AS SCHEDULED — R31 BROUGHT FORWARD.',
      effects: [{ set: 'a3_recall_due' }, { quest: 'q_a3_recall', start: true }],
      interject: [{ companion: NINE, text: 'Nine takes the sheet from you, gently, as it takes everything that is about to be filed. "R31 brought forward," it says. "It was always on the record. I had the date." A pause the length of a clause. "I had thought there would be another year of drainage."' }],
      options: [{ id: 'a3o.fold2', text: '(Fold them both.)', exit: true }],
    },
    again: {
      text: `The city's fourth order, the seal broken. ${ORDER} PUBLIC STEPS REOPEN R30. OBJECTIONS LIE TO THE COURT OF ACCOUNTS.`,
      again: 'The fourth order. EXECUTION ON THE DESIGNATE\'S ATTENDANCE.',
      options: [nineSheet('a3o.nine2'), fold('a3o.fold3')],
    },
  },
};

// ---------------------------------------------------------------- B6b: the courier, the recall wardens, a hidden Nine

const COURIER = 'npc_a3_01', W1 = 'npc_a3_g1', W2 = 'npc_a3_g2';
const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const IN = (id: string): Cond => ({ inParty: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
/** A topic not yet asked from either of the hub's option sets. */
const NOT_ASKED = (id: string): Cond => NOT(ANY({ seen: id }, { seen: `${id}.h` }));
const ASKED = (id: string): Cond => ANY({ seen: id }, { seen: `${id}.h` });

/** The keeper of Unit 9 declines its recall: the city's first refused order from one of its own units. Nine is present. */
const DECLINED: Effect[] = [
  { set: 'a3_recall', value: 'declined' }, { xp: 100 }, A(NINE, 10),
  { decision: { id: 'a3_recall_declined', text: 'Assessor Nine, its own keeper, declined the city\'s recall: the first order the city has had refused by one of its own units.' } },
  { news: { tag: 'a3_recall_declined', text: 'one of the Ledger\'s own units declined its recall for disposal, as its own keeper; the recall wardens entered it and went home', valence: 4, size: 7, at: 'meridian' } },
];
const STAYED: Effect[] = [
  { set: 'a3_recall', value: 'stayed' }, { xp: 80 },
  { decision: { id: 'a3_recall_stayed', text: 'The city asked me, as Assessor Nine\'s keeper, to present it for disposal, and I refused.' } },
];
const GONE = (how: 'handed' | 'taken', text: string): Effect[] => [
  { set: 'a3_recall', value: how }, { set: 'nine_disposed' }, { leave: NINE },
  { decision: { id: `a3_recall_${how}`, text } },
  { news: { tag: `a3_recall_${how}`, text: 'two recall wardens walked one of the city\'s own units up the lane to the Spire for disposal, as scheduled', valence: -2, size: 5, at: 'meridian' } },
];
const BOUGHT: Effect[] = [
  { take: 'tolls', count: 121 }, { set: 'a3_recall', value: 'bought' }, { set: 'a3_nine_keeper', value: 'player' }, { xp: 60 },
  { decision: { id: 'a3_recall_bought', text: 'I bought Assessor Nine\'s title from the recall wardens at its assessed value, under clause 9(b): a hundred and twenty-one Tolls.' } },
];
const HIDDEN = (where: 'clover' | 'hulls', text: string): Effect[] => [
  { set: 'a3_recall', value: 'hidden' }, { set: 'a3_nine_hid', value: where }, { leave: NINE }, { time: 90 }, { xp: 60 },
  { decision: { id: 'a3_recall_hidden', text } },
];
const FOUGHT: Effect[] = [
  { set: 'a3_recall_fight' }, { set: 'a3_recall', value: 'fought' }, { rep: { faction: 'wardens', respect: -20, fear: 5 } }, A(NINE, -5),
  { decision: { id: 'a3_recall_fought', text: 'I drew on the two recall wardens at the Precinct gate rather than let them take Assessor Nine.' } },
  { news: { tag: 'a3_recall_fought', text: 'two of the Spire\'s recall wardens were set on at the Precinct gate over one of the city\'s units', valence: -6, size: 7, at: 'meridian' } },
  { event: 'combat' },
];

// ---------------------------------------------------------------- the courier

const POST_REPLIES = (sfx: string): OptionDef[] => [
  { id: `cou.decline${sfx}`, text: '(Hand Nine the pen. Let it write its own answer.)', if: ALL(RECALL_OPEN, IN(NINE), NINE_KEEPER_SELF, ASKED('cou.unit')), next: 'declined_post' },
  { id: `cou.refuse${sfx}`, text: '(Write the keeper\'s answer on her slip: the keeper refuses.)', if: ALL(RECALL_OPEN, NINE_KEEPER_PLAYER, ASKED('cou.unit')), next: 'refused_post' },
];
const COURIER_TOPICS = (sfx: string): OptionDef[] => [
  { id: `cou.drop${sfx}`, text: 'Who gave you the order to carry?', if: NOT_ASKED('cou.drop'), next: 'drop' },
  { id: `cou.answer${sfx}`, text: 'Can an order like that be answered?', if: NOT_ASKED('cou.answer'), next: 'answer' },
  { id: `cou.unit${sfx}`, text: 'There was a notice for Nine in the packet. Its keeper is to present it at the gate?', if: ALL(RECALL_OPEN, NOT_ASKED('cou.unit')), next: 'unit' },
  { id: `cou.you${sfx}`, text: 'How long have you carried for the city?', if: NOT_ASKED('cou.you'), next: 'you' },
  ...POST_REPLIES(sfx),
  { id: `cou.bye${sfx}`, text: '(Leave her to the lane.)', exit: true },
];
const BACK = { text: 'Something else.', next: 'hub' };

export const d_a3_courier: DialogueDef = {
  id: 'd_a3_courier', owner: COURIER,
  start: [{ if: { knows: 'a3_courier_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A courier in the Precinct\'s grey, a satchel coat buttoned to the throat and a receipt book on a cord round her wrist, waiting at the mouth of the lane to the Spire as if the lane might send for her. She knows you before you speak. "Reserve 9," she says. "Signed for at seven, the morning after Openfield. You press hard on the pen." A courier remembers signatures. Faces are somebody else\'s department. "Selma Ruud. I came back. That\'s most of the job."',
      again: '"Designate." Selma Ruud waits at the lane\'s mouth with the receipt book closed on her thumb.',
      effects: [{ learn: 'a3_courier_met' }],
      options: COURIER_TOPICS(''),
    },
    hub: {
      text: '"Designate." Selma Ruud waits at the lane\'s mouth with the receipt book closed on her thumb.',
      again: 'The courier waits, the book on its cord, one eye on the lane.',
      options: COURIER_TOPICS('.h'),
    },
    drop: {
      text: '"The drop." She tips her head up the lane, toward the Spire\'s foot. "Every courier in the Precinct starts and ends at the same slot. Paper comes out of it sealed, with a name and a place on it. We carry it, we get it signed, we bring the receipt back and put it in the same slot." She turns the book on its cord. "It takes paper and gives paper. Once, in R22, it gave a key, in an envelope. Nobody has ever seen it take anything else." It is not a joke in the Precinct, and she does not smile.',
      again: '"The slot at the Spire\'s foot. Paper in, paper out."',
      effects: [{ learn: 'a3_drop_heard' }],
      options: [BACK, { text: '(Leave her to the lane.)', exit: true }],
    },
    answer: {
      text: '"Not by me. The Ledger doesn\'t take letters. It takes attendance." She says it the way you say the time. "Read the foot of your last sheet. Every order carries it: OBJECTIONS LIE TO THE COURT OF ACCOUNTS. The Court\'s in the west wing at the bottom of the Spire. Assessor Three reads what you put on its rail and nothing else." She looks at you a moment longer than a courier needs to. "And under clause twelve anyone can speak for somebody who has nobody to speak for them. A reserve, say. Nobody has ever brought one."',
      again: '"The Court of Accounts, west wing. Objections lie to the Court."',
      effects: [{ learn: 'a3_court_heard' }, { quest: 'q_ca_court', start: true }],
      options: [BACK, { text: '(Leave her to the lane.)', exit: true }],
    },
    unit: {
      text: [
        { if: IN(NINE), text: '"The recall wardens came down from the Spire with the sheet. Two of them. They\'re at the gate, and they\'ll stay at the gate, because that\'s what the sheet says." She looks at Nine, and then, because it is polite, at its lens. "If a keeper wants to answer in writing, I carry writing. That\'s all a courier is."' },
        { text: '"The recall wardens came down from the Spire with the sheet. Two of them. They\'re at the gate, and they\'ll stay at the gate, because that\'s what the sheet says. The keeper brings the unit through it." She shrugs. "If a keeper wants to answer in writing, I carry writing. That\'s all a courier is."' },
      ],
      again: '"Two recall wardens at the gate. And I carry writing."',
      options: [...POST_REPLIES('.u'), BACK, { text: '(Leave her to the lane.)', exit: true }],
    },
    you: {
      text: '"Twelve years. My mother carried before me, twenty." She runs a thumb down the book\'s spine. "She was never once given a parcel with her own name on it. I\'ve had one: my posting, when I was sixteen. It came out of the slot addressed to me, and I signed for it, and carried it to myself, and gave myself the receipt." She almost smiles, then does not. "That\'s the Precinct. Everything gets there in the end, signed for."',
      again: '"Twelve years. Everything signed for."',
      options: [BACK, { text: '(Leave her to the lane.)', exit: true }],
    },
    declined_post: {
      speaker: 'narrator',
      text: 'Nine takes the pen as if it had been waiting a hundred and twenty years to be handed one. It writes in the hand it uses for clauses, on the courier\'s own slip: THE KEEPER OF UNIT 9 DECLINES TO PRESENT THE UNIT. And under it, smaller: ENTERED BY THE KEEPER. Selma Ruud reads it, which couriers do not do, and folds it into the satchel. "I\'ve never carried a no up that lane," she says. "I\'ve carried a great deal of yes." She goes up it at a courier\'s walk, and an hour later the two wardens at the gate are gone.',
      again: 'The courier\'s slip, gone up the lane: THE KEEPER OF UNIT 9 DECLINES.',
      effects: DECLINED,
      interject: [{ companion: NINE, text: '"The first answer I have written in my own name," Nine says, watching the lane. "It was one word long, if you leave out the clause." A click. "I would like to have used more."' }],
      options: [{ text: '(Leave her to the lane.)', exit: true }],
    },
    refused_post: {
      text: 'You write it on her slip in plain words: THE KEEPER REFUSES. She reads it back to you, because a courier reads back what she is going to carry. "It goes up at noon. The wardens will read it at the gate and go home. That\'s what they do with an answer." She tucks it into the satchel with the others. "Most people write more."',
      again: '"THE KEEPER REFUSES. It goes up at noon."',
      effects: STAYED,
      interject: [{ companion: NINE, text: '"Three words," Nine says. "The schedule asked my keeper, and my keeper answered in three words." It seems to think this is a very good number.', effects: [A(NINE, 5)] }],
      options: [{ text: '(Leave her to the lane.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the recall wardens at the Precinct gate

const NIGHT = { if: { hour: { from: 20, to: 5 } } as Cond, dc: -10, why: 'after dark the gate\'s lamps throw long shadows' };
/** The Hulls will keep what the city is looking for while their cradle still runs and nobody has cleared them. */
const HULLS_OK: Cond = ALL(CRADLE_RUNS, NOT(F('dk_hulls', 'cleared')), ANY({ knows: 'dk_cradle_known' }, { knows: 'dk_cradle_heard' }, { knows: 'dk_hulls_seen' }));
const ANSWERS = (sfx: string): OptionDef[] => [
  { id: `rc.decline${sfx}`, text: '(Let Nine answer for itself.)', if: ALL(NINE_KEEPER_SELF, IN(NINE)), next: 'declined' },
  { id: `rc.refuse${sfx}`, text: 'No. I\'m its keeper, and it stays with me.', if: NINE_KEEPER_PLAYER, next: 'stayed' },
  { id: `rc.hand${sfx}`, text: 'Go with them, Nine.', if: ALL(NINE_KEEPER_PLAYER, IN(NINE)), next: 'hand_ask' },
  { id: `rc.court${sfx}`, text: 'This goes before the Court of Accounts before it goes anywhere.', if: ALL(NOT(F('a3_recall_stay')), NOT(F('ca_recall'))), next: 'stay' },
  { id: `rc.buy${sfx}`, text: 'Clause 9(b). A unit passes to a buyer at its assessed value. I\'m buying it. (121 Tolls)', if: ALL(NINE_KEEPER_CITY, { item: 'tolls', count: 121 }), next: 'bought' },
  {
    id: `rc.hide${sfx}`, text: '(While she reads the sheet, walk Nine back out through the gate.)', if: ALL(NINE_KEEPER_CITY, IN(NINE), NOT(F('a3_recall_watched'))),
    check: { skill: 'stealth', dc: 40, mods: [NIGHT] }, failEffects: [{ set: 'a3_recall_watched' }], next: 'hide', fail: 'hide_no',
  },
  { id: `rc.fight${sfx}`, text: '(Step between them and Nine, with your hand on your weapon.)', if: ALL(NINE_KEEPER_CITY, IN(NINE)), next: 'fight_ask' },
  { id: `rc.let${sfx}`, text: '(Let them take it.)', if: ALL(NINE_KEEPER_CITY, IN(NINE)), next: 'let_ask' },
  { id: `rc.later${sfx}`, text: 'Not today.', exit: true },
];
const STOP_TEXT = (sheet: string) => `Two wardens step out of the gate's lamplight as you come through it, not quickly. They are not the gate's: their grey has the Spire's white piping at the cuff, and the older of them, a woman with a face that has stood at a great many doors, carries a sheet in a clear sleeve. "Unit 9," she says, to Nine, and reads on, because the sheet tells her to. "Precinct of Meridian. Disposal, as scheduled. R31, brought forward. The keeper will present the unit." ${sheet}`;

const recallNodes: Record<string, NodeDef> = {
  stop: {
    text: [
      { if: NINE_KEEPER_SELF, text: STOP_TEXT('She reads the keeper\'s line twice. "The keeper of Unit 9 is Unit 9." She looks from the sheet to the cracked lens and back. Nobody has written her a line for this.') },
      { if: NINE_KEEPER_PLAYER, text: STOP_TEXT('She reads the keeper\'s line, and then your face, the way the gate\'s lens does. "The keeper of Unit 9 is a citizen. You." She holds the sheet out a little: not to give it to you, to show you that it is real. "Keeper. Will you present the unit?"') },
      { text: STOP_TEXT('"The title is the city\'s." She says it gently, as if it were weather. "The unit will come with us up to the Spire. The schedule is brought forward, not hurried. You may say goodbye." The young one beside her has his hands behind his back and is looking at Nine the way you look at a dog you were told to fetch.') },
    ],
    again: [{ if: NINE_KEEPER_CITY, text: 'The older warden waits, the sheet in its sleeve. "The unit, keeper."' }, { text: 'The older warden waits, the sheet in its sleeve. "Keeper."' }],
    effects: [{ set: 'a3_recall_met' }],
    interject: [
      { companion: NINE, if: NINE_KEEPER_SELF, text: '"Keeper of Unit 9," Nine says to the sheet, trying the words. It has never once in its service been asked a question it could answer for itself.' },
      { companion: NINE, if: { flag: 'nine_stance', eq: 'deputy' }, text: '"The order is lawful," Nine says. "I have read it twice." It does not move, and it does not step forward either.' },
      { companion: NINE, text: '"Disposal, as scheduled," Nine says. "I had the date." The lens clicks. "I had thought there would be another year of drainage."' },
      { companion: TAMSIN, text: 'Tamsin has stepped half in front of Nine without seeming to decide to. "It\'s with us," she says to the wardens, and then, quieter, to nobody: "It\'s with us."' },
    ],
    options: ANSWERS(''),
  },
  keeper: {
    text: [
      { if: NINE_KEEPER_SELF, text: 'Two wardens with the Spire\'s white piping at the cuff, waiting just inside the gate, the older with a sheet in a clear sleeve. "We are waiting for Unit 9," she says. "Its keeper is itself." She seems to find that easier to say each time. "When it comes through the gate, it can answer for itself."' },
      { if: NINE_KEEPER_PLAYER, text: 'Two wardens with the Spire\'s white piping at the cuff, waiting just inside the gate. "We are waiting for the keeper of Unit 9 to present the unit," the older one says, and reads your face against her sheet. "You are the keeper. Will you present it?"' },
      { text: 'Two wardens with the Spire\'s white piping at the cuff, waiting just inside the gate, the older with a sheet in a clear sleeve. "We are waiting for Unit 9," she says. "Its title is the city\'s. When it comes through the gate, it comes with us."' },
    ],
    again: 'The two recall wardens at the gate, waiting for Unit 9.',
    options: ANSWERS('.k'),
  },
  waiting: {
    text: '"Before the Court," the older warden says, when she sees you. "We wait on the ruling." The young one has found a crate to sit on and been told to stand up off it.',
    again: 'The recall wardens, waiting on the Court.',
    options: [...ANSWERS('.w'), { id: 'rc.court.go', text: 'I\'ll see you after the ruling.', exit: true }],
  },
  hide_no: {
    speaker: W2,
    text: 'You have got two steps back toward the gate when the young warden is in it, not unkindly. "Keeper," he says. "The unit." Behind you the older one has not even looked up from the sheet.',
    again: 'The young warden in the gate\'s mouth. "The unit."',
    options: ANSWERS('.watched'),
  },
  declined: {
    speaker: NINE,
    text: '"The keeper of Unit 9 declines to present the unit." Nine says it in the voice it uses for clauses. "Enter it." The older warden writes on the sleeve with a grease pencil, slowly, because the sheet has no box for it. "Entered," she says. "Keeper declines." She looks at the sheet as if it might add something. It does not. "That hasn\'t happened," the young one says. "No," says Nine. "It has not." They go back up the avenue toward the lane with the sheet between them, not quickly, and the young one looks back once.',
    again: 'The avenue, and two wardens going up it toward the lane. KEEPER DECLINES, in grease pencil.',
    effects: DECLINED,
    interject: [{ companion: TAMSIN, text: '"Did it just tell the city no?" Tamsin says. "Did the fridge\'s cousin just — " Nine: "I declined. It is a more precise word." Tamsin: "It\'s the same word."', effects: [A(TAMSIN, 5)] }],
    options: [{ text: '(Walk on with Nine.)', exit: true }],
  },
  stayed: {
    speaker: W1,
    text: '"The keeper refuses." She reads it back to you off her own grease-pencil line. "Entered." She looks at the sheet, and then she turns it over, as if there might be something on the back. "The schedule asked the keeper. The keeper refused. The sheet has no line after that." They go back toward the lane with it, and the young one is already asking her what they do now, and she is telling him: nothing. They write it down.',
    again: 'KEEPER REFUSES, in grease pencil, going up the lane.',
    effects: STAYED,
    interject: [{ companion: NINE, text: '"The schedule asked you," Nine says, very quietly. "I said I would like to be there when it did. I was there."', effects: [A(NINE, 5)] }],
    options: [{ text: '(Go on through.)', exit: true }],
  },
  hand_ask: {
    speaker: NINE,
    text: 'Nine turns its cracked lens to you, and it is the most careful you have ever heard it be with a sentence. "Is that an instruction from my keeper?"',
    again: '"An instruction from my keeper?"',
    options: [{ id: 'rc.hand.yes', text: '(Yes.)', next: 'handed' }, { id: 'rc.hand.no', text: 'No. Stay.', next: 'stop' }],
  },
  handed: {
    speaker: NINE,
    text: '"Then I obey a lawful owner," Nine says, "and I would like it entered that I was told, and by whom." The older warden enters it. Nine walks between them up the avenue toward the lane at its own pace, telling the young one about the drains under the avenue and how they were laid, and the young one, who has not been told he may not listen, listens.',
    again: 'The avenue, empty where Nine walked up it.',
    effects: GONE('handed', 'I told Assessor Nine, as its keeper, to go with the recall wardens, and it went, because a lawful owner told it to.'),
    interject: [{ companion: TAMSIN, text: 'Tamsin watches until they are gone round the corner of the hearing room. "You told it to," she says. "It would\'ve stayed if you\'d said. It was waiting for you to say." She does not wait for you to answer.', effects: [A(TAMSIN, -10)] }],
    options: [{ text: '(Watch it go.)', exit: true }],
  },
  stay: {
    speaker: W1,
    text: '"Before the Court." The older warden takes it the way she has taken everything. "A matter on the Court\'s docket is not executed until it is ruled." She slides the sheet back into its sleeve. "The Court sits in the west wing, at the Spire\'s foot. Assessor Three reads what is on the rail. We will be at the gate for the ruling."',
    again: '"Before the Court. We will be at the gate for the ruling."',
    effects: [{ set: 'a3_recall_stay' }, { learn: 'a3_court_heard' }, { quest: 'q_ca_court', start: true }],
    interject: [{ companion: NINE, text: '"Unit 3 will read my file," Nine says. "It has never read anything of mine that was not an error report." A pause the length of a clause. "Neither, in fairness, has anyone."' }],
    options: [{ text: '(Go on through.)', exit: true }],
  },
  bought: {
    speaker: W1,
    text: '"Assessed value." She reads the figure off the sheet without looking at it. "One hundred and twenty-one. One a year in service." The young one counts your Tolls into a dish he seems to have brought for no other reason. "Title to the buyer. Entered." She tears the disposal off along a perforation you had not noticed, and gives you the stub, and they go back up toward the lane.',
    again: 'The stub of the disposal, torn along its perforation. TITLE TO THE BUYER.',
    effects: BOUGHT,
    interject: [{ companion: NINE, text: '"Purchased twice," Nine says. "I am appreciating." It is the nearest thing to a joke you have heard it make on purpose, and it does not acknowledge it.', effects: [A(NINE, 3)] }],
    options: [{ text: '(Go on through.)', exit: true }],
  },
  hide: {
    speaker: 'narrator',
    text: 'The older warden has her eyes on the sheet and the young one on the line outside the Wall, and for the length of a clause nobody is looking at Nine. You walk it back out through the gate at the pace of somebody who has forgotten something, and keep walking. Outside, every lens on the Wall faces in. "They have never once looked out," Nine says, very low. "I logged it in R20." Where, then?',
    again: 'Outside the Wall with Nine, the gate behind you. Where?',
    options: [
      { id: 'rc.hide.clover', text: 'North along the Wall to Clover, the Loop\'s last halt.', next: 'hid_clover' },
      { id: 'rc.hide.hulls', text: 'South by the river road to Carrick, and down to the Hulls.', if: HULLS_OK, next: 'hid_hulls' },
    ],
  },
  hid_clover: {
    speaker: 'narrator',
    text: 'North along the outside of the Wall: the gate road, the towers with nothing in them, and up onto Clover\'s deck where the rail comes out of its portal and stops against a buffer. The turnstile\'s lens faces into the city. Nine sits down on the halt\'s bench under the shelter with its back to it. "When the unit is not presented," it says, "the recall is entered NOT FOUND, and an asset not found is written off under clause 22. Nobody looks for what has been written off. That is what writing off is for." It opens a ledger on its knee. "Come for me when you want the record read."',
    again: 'Clover\'s deck, and Nine on the bench with its back to the lens.',
    effects: HIDDEN('clover', 'I walked Assessor Nine out of the Precinct past the recall wardens and left it at Clover, outside the Wall, where the city\'s lenses do not look.'),
    options: [{ text: '(Walk back to the gate alone.)', exit: true }],
  },
  hid_hulls: {
    speaker: 'narrator',
    text: 'South along the river road under the Wall, through Carrick\'s lamps and down the river stairs onto the bed, to the Hulls, where the people who run Kwabena Ofori\'s cradle live off every lens the city has. Kwabena looks at Nine for a long time: the plate, the cracked lens, the city\'s grey. "The city\'s," he says. "Not found," Nine says. "Entered so, by tonight." He shrugs and opens a hatch in the nearest hull. "Then you can be not found in here."',
    again: 'The Hulls, and a hatch Nine went in at.',
    effects: HIDDEN('hulls', 'I walked Assessor Nine out of the Precinct past the recall wardens and down to the Hulls at Carrick, where the cradle\'s people keep what the city is looking for.'),
    options: [{ text: '(Climb back up the river stairs.)', exit: true }],
  },
  fight_ask: {
    speaker: W1,
    text: 'The older warden sees your hand and does not reach for her own. "That is resistance," she says. "It will be entered. So will you." The young one has gone pale and very still, and his hand has gone where yours is.',
    again: '"That is resistance. It will be entered."',
    options: [{ id: 'rc.fight.yes', text: '(Draw.)', effects: FOUGHT, exit: true }, { id: 'rc.fight.no', text: '(Take your hand off it.)', next: 'stop' }],
  },
  let_ask: {
    speaker: NINE,
    text: [
      { if: { flag: 'nine_stance', eq: 'deputy' }, text: '"The order is lawful," Nine says. "I have read it twice. The record suggests I should go." It does not move until you do.' },
      { text: '"Disposal, as scheduled," Nine says. "I had the date." The lens clicks. "I would like it entered that I do not consent. It will not change the order. I would like it entered."' },
    ],
    again: '"I would like it entered."',
    options: [{ id: 'rc.let.yes', text: '(Let it go.)', next: 'taken' }, { id: 'rc.let.no', text: 'No.', next: 'stop' }],
  },
  taken: {
    speaker: W1,
    text: 'The older warden takes the unit by the arm, the way you take an old man\'s at a kerb. "Disposal, as scheduled," she says, gently, as if she has said it before about other things. Nine goes with them. At the corner of the hearing room it turns its lens back once, which the record does not need it to do.',
    again: 'The avenue, empty where Nine went up it.',
    effects: GONE('taken', 'I let the recall wardens take Assessor Nine back to the Spire for disposal, as scheduled.'),
    interject: [{ companion: TAMSIN, text: 'Tamsin says nothing at all, which she never does, until the corner. Then: "It said it didn\'t consent. You heard it say it."', effects: [A(TAMSIN, -10)] }],
    options: [{ text: '(Watch it go.)', exit: true }],
  },
  hostile: { text: 'The recall wardens are past talking.', again: 'Past talking.', options: [{ text: '(Nothing.)', exit: true }] },
  done: {
    text: [
      { if: F('a3_recall', 'declined'), text: 'The gate, and nobody waiting at it for Unit 9. KEEPER DECLINES has gone up the lane in grease pencil.' },
      { text: 'The gate, and nobody waiting at it for Unit 9 any more.' },
    ],
    again: 'Nobody at the gate for Unit 9.',
    options: [{ text: '(Go on.)', exit: true }],
  },
};

export const d_a3_recall: DialogueDef = {
  id: 'd_a3_recall', owner: W1,
  start: [
    { if: F('a3_recall_fight'), node: 'hostile' },
    { if: F('a3_recall'), node: 'done' },
    { if: F('a3_recall_stay'), node: 'waiting' },
    { if: IN(NINE), node: 'stop' },
    { node: 'keeper' },
  ],
  nodes: recallNodes,
};

// ---------------------------------------------------------------- a hidden Nine, where it waits

export const d_a3_nine_hid: DialogueDef = {
  id: 'd_a3_nine_hid', owner: NINE,
  start: [{ node: 'hid' }],
  nodes: {
    hid: {
      text: [
        { if: F('a3_nine_hid', 'hulls'), text: 'Nine is in the forward hold of the nearest hull, on a crate, with a lamp somebody lent it and a child somebody did not, who is watching it write. "I have been entered NOT FOUND," it says. "An asset not found is written off." The lens clicks. "The child has asked me whether that hurts. I have told her I will log the answer when I have one."' },
        { text: 'Nine is on the halt\'s bench under the shelter, with its back to the turnstile\'s lens and a ledger open on its knee. Below the deck the Ring\'s drivers are pushing a buggy with no engine round the asphalt for the pleasure of it. "I have been entered NOT FOUND," Nine says, without looking up. "Clause 22: an asset not found is written off. I have been written off." The lens clicks. "It is the most freedom the city\'s paper allows. I have been using it to count the drivers."' },
      ],
      again: '"The record suggests we were going somewhere."',
      options: [
        { id: 'nh.come', text: 'We\'re going. Come on.', effects: [{ join: NINE }, { set: 'a3_nine_fetched' }], exit: true },
        { id: 'nh.stay', text: 'Wait here a while longer.', exit: true },
      ],
    },
  },
};

export const A3_ORDER_DIALOGUES: DialogueDef[] = [d_a3_order_read, d_a3_courier, d_a3_recall, d_a3_nine_hid];
