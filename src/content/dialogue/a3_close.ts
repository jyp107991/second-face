import type { DialogueDef, NodeDef, OptionDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import type { CaseSpec, onRail as OnRailFn } from './md_court';
import {
  ALLY, ASH, B4B, CALLA_CASE_OPEN, CALLA_FREE, COMPANIONS, COMPANION_KEYS, ILYA, IN, KES, LN, LN_DONE, LOWE, LOWE_CLOSE, LOWE_DEAD,
  MASON_DEAD, MASON_EXILED, NINE, NINE_WALKIN, ODILE, OFFICER_HERE, PETRA, PETRA_DEAD, QUILL, QUILL_COMES, REGISTER_ASK, REYES, REYES_CLOSE,
  SARR_OFFERS, SOTO, SOTO_COMES, TAMSIN, TERMS_WORSE, UW_CLOSE, WITH_YOU, WREN,
} from '../world/a3_conds';

/**
 * The Spire's close in Act 3 (B6l, beat 21a): who came. From the Ledger's card (`a3_summoned`) until the designate goes up
 * the steps (`a3_pnr`), the square at the steps' foot gathers whoever the player's road has made: the companions on their
 * side round the fire barrel (their own trees; B6n–B6o's fire), and:
 * - **The Concern's officer** (`d_a3_quill`): Director Pilar Soto if the player met her at Halcyon (B4b), else Mr Quill. The
 *   Board's paper, the instrument of transfer for the city's forecasting core, which only the chair's first act can make the
 *   Ledger keep. Always offered, its terms said truthfully (worse for a designate the Shift marked and the Clean's gate shut
 *   on). Taken to sign at the core, carried with no promise, or refused (`a3_concern_terms`, item `k_a3_transfer`). Refused
 *   once, the officer does not ask again; the Grand Factor at Ninebridge holds the guild's copy (`SARR_*`, spread into
 *   `d_nb_sarr`).
 * - **The register back** (`MARWOOD_*`, spread into Keeper Marwood's `d_ar_keeper`; `d_a3_acquisitions` at the drawer behind her
 *   counter; `COMFORT_*` into the copyist's tree at the Sink): the Court's register, sold to the catalogue in Act 2, bought back
 *   (200), asked back on Comfort Asamoah's word (Speech 50), or lifted from the drawer at night (Security 45) and carried to
 *   the Court's desk (`a3_register_back`).
 * - **The column's lead** (`d_a3_lowe_close`): Captain Lowe keeping the close, by what the door made of him (`a3_lowe`); his
 *   sergeant Reyes if he is dead.
 * - **The Unwritten** turned at Knock (`d_a3_petra_close`, Petra's or Juniper's; Thaddeus and Rhoda): come east for the book.
 * - **The allies who count at the close**: the Choir's sister, the Wheel's rider, Carrick's docker, the chain's runner (their
 *   envoys, `npcs/a3_close.ts`), and the two readers in person, Verity of the Saints and Assessor Seventeen.
 * - **A hidden Nine** walks in written off (`d_a3_nine_walkin`); **who came** is shown once on arrival (`d_a3_close`).
 * - **Case `calla`** at the Court (`callaCase`, built on the bench in `md_court.ts`): keystone 7's trial, only while Sister Calla
 *   is held; the precedent `prec_sedition` (the amendment's `speech` clause), or her release by the old heading or by favour.
 * Nothing here happens unasked: every outcome is a word the player says to somebody standing still.
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (21a), §3 (the alternates) and "As built" → B6l.
 */

type OnRail = typeof OnRailFn;
type Interject = NonNullable<NodeDef['interject']>;
const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const KNOWS = (k: string): Cond => ({ knows: k });
const SEEN = (id: string): Cond => ({ seen: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
const leave = (text = '(Leave it there.)'): OptionDef => ({ text, exit: true });
/** A topic asked once from any of a tree's hubs: each hub's copy of the option has its own id (the base and the hub's suffix),
 * and the guard reads every copy (the codebase's `.again` pattern). */
const onceOf = (base: string, sfxs: string[]): Cond => NOT(ANY(...sfxs.map((x) => SEEN(`${base}${x}`))));

const MARWOOD = 'npc_ar_03', COMFORT = 'npc_ar_04', U1 = 'npc_a3_u1', U2 = 'npc_a3_u2', U3 = 'npc_a3_u3';
const VERITY = 'npc_bw_04', SEVENTEEN = 'npc_nw_04';
const HOLDS: Cond = { item: 'k_a3_transfer' };
const SETTLED: Cond = F('a3_concern_terms');
const TERRACE_YES: Cond = ANY(B4B.offer('accepted'), B4B.offer('feigned'));
const NIGHT: Cond = { hour: { from: 21, to: 7 } };

// ---------------------------------------------------------------- who came (the first time on the close after the card)

const WAITING_ANY: Cond = ANY(...COMPANION_KEYS.map((c) => ALL(WITH_YOU(c), NOT(IN(COMPANIONS[c].id)), ...(c === 'nine' ? [NOT(NINE_WALKIN)] : []))));

export const d_a3_close: DialogueDef = {
  id: 'd_a3_close', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The Spire\'s close, after the card. The works have changed pace: the scaffold is coming down off the steps plank by numbered plank, the stone saws run from first light, and on the works board the 49 in PUBLIC STEPS REOPEN R49 has been painted out and a 30 lettered over it in a hand that does not slope. Nobody is on the steps who is not carrying stone. The wardens at the lane post have been doubled, and they watch the square the way people watch weather coming. At the foot of the steps the works\' fire barrel has been laid with fresh wood. The city has not cleared the close for you. It has only stopped putting anything else on it.',
      again: 'The close, the steps above it, and the people who came.',
      effects: [{ learn: 'a3_close_seen' }],
      passives: [
        { if: WAITING_ANY, label: 'the ones who walked with you', text: 'Round the fire barrel, on crates and on the cold stone, the ones who walked with you and were not on the road with you are already here. They came when they heard, one by one, the way people come to a door they have been told about. Nobody sent for them. Nobody needed to.' },
        { if: ALL(WITH_YOU('nine'), NOT(IN(NINE)), NINE_WALKIN), label: 'Unit 9', text: 'And Nine, on a crate a little apart from the barrel, with its ledger on its knee and dust from somewhere outside the Wall on its plating. Written off, and here anyway.' },
        { if: SOTO_COMES, label: 'the Concern', text: 'By the east lamp, a woman in a plain grey suit with one lit seam at the collar, standing as if she has never in her life had to wait for anything and has decided, today, to try it: Pilar Soto, down from Halcyon.' },
        { if: ALL(QUILL_COMES, F('quill_met')), label: 'the Concern', text: 'By the east lamp, a man in a coat that is not trying to be noticed: Mr Quill, of the Concern, who does not usually attend.' },
        { if: ALL(QUILL_COMES, NOT(F('quill_met'))), label: 'the Concern', text: 'By the east lamp, a man in a good dark coat, the only thing on the close not trying to be noticed, which is how you notice it. He has already seen you.' },
        {
          if: LOWE_CLOSE, label: 'the column\'s captain',
          text: [
            { if: F('a3_lowe', 'yielded'), text: 'At the foot of the steps, Captain Lowe, his left arm strapped across his chest under the grey and his cap under the other one, keeping the Precinct\'s close.' },
            { text: 'At the foot of the steps, Captain Lowe, cap under his arm, keeping the Precinct\'s close as if it were a door.' },
          ],
        },
        { if: REYES_CLOSE, label: 'the column\'s captain', text: 'At the foot of the steps, where the captain would stand, Sergeant Reyes, in grey that has been brushed and not slept in.' },
        {
          if: UW_CLOSE, label: 'the Unwritten',
          text: [
            { if: PETRA_DEAD, text: 'At the west end of the close, on the cold stone with their hoods down and their faces bare to the city\'s lamps: Juniper Lowry and the two who came with her from Knock. They said they would come east for the book, and came.' },
            { text: 'At the west end of the close, on the cold stone with their hoods down and their faces bare to the city\'s lamps: Petra Mason and two of her people. They said they would come east for the book, and came.' },
          ],
        },
        { if: ALLY('choir'), label: 'the Choir', text: 'Below the planters, a sister of the Choir in undyed homespun, and behind her a dozen more on the stone in a loose ring. Two of them are singing under their breath. The wardens at the lane post keep looking at them.' },
        { if: ALLY('wheel'), label: 'the Wheel', text: 'A rider of the Wheel with pan dust to the knee, leaning on nothing, watching the lane to the Precinct the way you watch a road.' },
        { if: ALLY('stand'), label: 'Carrick\'s Stand', text: 'A docker from Carrick in her work clothes, the tally hook still on her belt, sitting on the good stone as if she were pricing it.' },
        { if: ALLY('gangs'), label: 'the chain', text: 'A young man from Bridgeward on the Court\'s side of the close, eating an apple, wearing the three crews\' colours in three different places, which in Bridgeward is a passport.' },
        { if: ALL(ALLY('saints'), NOT({ dead: VERITY })), label: 'the Saints', text: 'Verity of the Saints on a bench by the empty plinth, a radio in her lap with its back off, listening to the hiss with her head on one side.' },
        { if: ALL(ALLY('seventeen'), NOT({ dead: SEVENTEEN })), label: 'an assessor of the Wet', text: 'At the Court\'s door, where units stand, a grey unit with a cracked lens and the Wet\'s weather on its plating, quite still: Assessor Seventeen, who said it would read.' },
        { if: REGISTER_ASK, label: 'the catalogue', text: 'Through the catalogue\'s long window, Keeper Marwood at her counter. Somewhere behind her knees, under a catalogue number, is the Court\'s register in Comfort Asamoah\'s hand, which you sold her.' },
        { if: ALL(CALLA_CASE_OPEN, NOT(F('ca_calla'))), label: 'the docket', text: 'On the Court\'s door, in the docket\'s brass, a card has been moved up to the top: 1204 — RESPONDENT HELD — AWAITING A SPEAKER. The Choir\'s sister of Shale is in the Precinct\'s cells, and nobody has called her case.' },
      ],
      options: [{ text: '(Walk out into it.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the Concern's officer: Mr Quill, or Director Soto

/** The paper taken (to sign at the core, or carried with no promise), from the officer or from the Grand Factor. */
const TAKE = (from: 'officer' | 'sarr', how: 'taken' | 'carried'): Effect[] => [
  { give: 'k_a3_transfer' }, { set: 'a3_concern_terms', value: 'accepted' }, { set: 'a3_terms_how', value: how }, { set: 'a3_terms_from', value: from },
  { rep: { faction: 'concern', respect: 10 } }, { xp: 60 },
  { decision: { id: 'a3_concern_terms', text: from === 'sarr'
    ? 'At Ninebridge I took the guild\'s copy of the Concern\'s instrument of transfer from the Grand Factor: the city\'s forecasting core, for the chair\'s first signature.'
    : 'At the Spire\'s close I took the Concern\'s instrument of transfer: the city\'s forecasting core, for the chair\'s first signature.' } },
  A(KES, how === 'taken' ? -10 : -6), A(WREN, how === 'taken' ? -8 : -5), A(ASH, -5), A(TAMSIN, -5), A(ILYA, -4), A(NINE, -3), A(ODILE, 2),
];
const REFUSE: Effect[] = [
  { set: 'a3_concern_terms', value: 'refused' }, { learn: 'a3_sarr_holds' }, { rep: { faction: 'concern', respect: -5 } }, { xp: 40 },
  { decision: { id: 'a3_concern_terms', text: 'At the Spire\'s close I refused the Concern\'s instrument of transfer for the city\'s forecasting core.' } },
  A(KES, 5), A(WREN, 4), A(ASH, 3), A(TAMSIN, 3), A(ILYA, 2),
];
const GIVE_BACK: Effect[] = [
  { take: 'k_a3_transfer' }, { set: 'a3_concern_terms', value: 'refused' }, { set: 'a3_terms_returned' }, { learn: 'a3_sarr_holds' }, { xp: 20 },
  { decision: { id: 'a3_concern_terms', text: 'I gave the Concern\'s instrument of transfer back to its officer at the Spire\'s close, unsigned.' } },
  A(KES, 5), A(WREN, 4), A(ASH, 3), A(TAMSIN, 3), A(ILYA, 2),
];

type Who = 'q' | 's';
const SFX_O = ['.q', '.q.hub', '.s', '.s.hub'];
const officerTopics = (p: Who, hub: boolean): OptionDef[] => {
  const x = `.${p}${hub ? '.hub' : ''}`;
  return [
    { id: `a3o.what${x}`, text: 'What exactly is the Board buying?', if: onceOf('a3o.what', SFX_O), next: `${p}_what` },
    { id: `a3o.why${x}`, text: 'Why does it need my name on it?', if: onceOf('a3o.why', SFX_O), next: `${p}_why` },
    { id: `a3o.city${x}`, text: 'What happens to the city? To the Reach?', if: onceOf('a3o.city', SFX_O), next: `${p}_city` },
    { id: `a3o.me${x}`, text: 'And what is in it for me?', if: onceOf('a3o.me', SFX_O), next: `${p}_me` },
    { id: `a3o.no${x}`, text: 'And if I say no?', if: ALL(onceOf('a3o.no', SFX_O), NOT(SETTLED)), next: `${p}_no` },
    { id: `a3o.paper${x}`, text: '(Ask to see the paper.)', if: NOT(SETTLED), next: `${p}_terms`, repeat: true },
    { id: `a3o.back${x}`, text: '(Give the paper back.)', if: HOLDS, effects: GIVE_BACK, next: `${p}_returned` },
    leave('(Step away from the lamp.)'),
  ];
};
const termsOptions = (p: Who): OptionDef[] => [
  { id: `a3o.take.${p}`, text: 'I\'ll sign it at the core. Give it here.', if: NOT(SETTLED), effects: TAKE('officer', 'taken'), next: `${p}_taken` },
  { id: `a3o.carry.${p}`, text: 'I\'ll carry it. That\'s all I\'ll promise.', if: NOT(SETTLED), effects: TAKE('officer', 'carried'), next: `${p}_carried` },
  { id: `a3o.refuse.${p}`, text: 'No.', if: NOT(SETTLED), effects: REFUSE, next: `${p}_refused` },
  { text: 'Not yet.', next: `${p}_hub` },
];
const back = (p: Who): OptionDef => ({ text: '(Back.)', next: `${p}_hub` });

const PAPER = 'heavy cream paper, the closed eye in one corner. INSTRUMENT OF TRANSFER. The city\'s forecasting core "and its records, with all schedules attaching", from the Precinct of Meridian to the Tollmen\'s Guild as agent for the Concern of Halcyon, "consideration already paid". A line at the foot for the Magistrate\'s signature, as the first act of the chair. Only that line is blank.';
const WORSE_PASSIVE = { if: TERMS_WORSE, label: 'the consideration', text: 'Under the signature line, in a smaller hand: CONSIDERATION TO THE MAGISTRATE — AN ANNUITY (NINEBRIDGE), AND CARE. Where the terms you were told about on the hill said SEAT, there is a neat line through nothing.' };

const QUILL_NODES: Record<string, NodeDef> = {
  q_intro: {
    text: [
      { if: F('quill_met'), text: 'Mr Quill, by the east lamp, in the coat. "Designate." He does not offer his hand; the Concern does not shake on what it has not yet bought. "We met at a Masque I was not supposed to attend. This is another thing I do not usually attend." He looks up the steps, all of them, and back down at you. "The Board has sent me with a paper, and with the patience to let you read it. Nobody has to decide anything today."' },
      { text: 'A man by the east lamp in a good dark coat. The wardens say he has been standing here since the card came, which they find unusual. "Quill. The Concern\'s." He does not say which Concern; there is one. "The Board has sent me with a paper for you, and with the patience to let you read it." He looks up the steps, all of them, and back down at you. "Nobody has to decide anything today."' },
    ],
    again: 'Quill waits. He is very good at it.',
    effects: [{ learn: 'a3_officer_met' }],
    passives: [
      { if: LN('guild'), label: 'the night at Openfield', text: '"The guild\'s side, at Openfield," he adds, as if reading it off a sheet. "The Board considers the first instalment paid."' },
      { if: TERRACE_YES, label: 'the terrace', text: '"You gave the Board your word on the terrace. SEAT IN WAITING." He does not ask whether you meant it. "The Board took it as meant. I am here to find out what it was worth."' },
      { if: B4B.offer('refused'), label: 'the terrace', text: '"You told the Board no, on the terrace. The Board does not usually ask twice." The coat moves a quarter-inch. "It has asked me to."' },
      { if: F('cr_concern', 'exposed'), label: 'the Crown', text: '"You told the Crown what we were." No heat in it at all. "It cost us a Chair and a season. It did not cost us interest."' },
      { if: F('cr_concern', 'kept'), label: 'the Crown', text: '"The Concern remembers a settled thing," he says: the reel at the Crown, three hundred into a coat that did not change shape.' },
      { if: F('a3_c9_how', 'sold'), label: 'the Weighhouse', text: '"The Weighhouse has its sixty. Intake thanks the designate." He says it as a message he was asked to carry, and carries it.' },
    ],
    options: officerTopics('q', false),
  },
  q_hub: {
    text: [
      { if: HOLDS, text: '"You have it," Quill says, meaning the folder in your pack. "It weighs nothing. People are always surprised."' },
      { if: F('a3_concern_terms', 'refused'), text: '"Designate." He has not moved from the lamp. "The answer stands. So do I. It is a habit of the Board\'s."' },
      { text: '"Designate." The coat, the lamp, the patience.' },
    ],
    again: 'Quill waits. He is very good at it.',
    options: officerTopics('q', true),
  },
  q_what: {
    text: '"What is under your feet." He does not look down. "The Vault of Accounts, and the thing in it that keeps them. Ninety years of forecasts: every birth and death and harvest and riot in the Reach, a season early, at odds nobody else can make. The Exchange sells them by the sheet. The Board would like to own the press." A small, exact pause. "And the schedules attaching. The schedules are the valuable part. A forecast is a guess. A schedule is a guess with wardens."',
    again: '"A guess with wardens," Quill says again.',
    interject: [
      { companion: ODILE, text: '"With all schedules attaching," Odile says, very quietly, the way she reads a clause back to the man who wrote it. "That\'s the city, my dear. Not the machine. The city."' },
      { companion: NINE, text: '"The schedules are the record\'s obligations," Nine says. "They are not an asset. They are a debt the record owes the people in it." Quill, pleasantly: "Everything is an asset to somebody, Unit 9."' },
    ],
    options: [back('q')],
  },
  q_why: {
    text: '"Because nothing else will hold." He says it as if it were obvious, because to him it is. "The Ledger may void any transfer of the city\'s property but one: the first act of its own Magistrate. It promised that in the charter, ninety years ago, to whoever would sit in the chair, and it has never once had to keep the promise." He lets that sit. "A signature from anybody else is a document. Yours, as your first act, is the one paper in the Reach the Ledger has sworn never to tear up. We are not buying the core from the city. We are buying it from the chair." A small gesture: you. "You are the chair."',
    again: '"You are the chair," Quill says.',
    interject: [
      { companion: NINE, text: '"Clause one, the reserved act," Nine says. "It is real. I have read it. I had hoped nobody else had."' },
      { companion: KES, text: '"So it\'s not the machine they need," Kes says. "It\'s you. Of course it is. It\'s always a person at the end. Somebody has to sign."' },
    ],
    options: [back('q')],
  },
  q_city: {
    text: '"It runs." Quill looks at the lamps, which work. "Clinics on contract, the Line on time, water by meter, the Sink pumped because pumping is cheaper than drowning. Everyone useful. Nobody waiting nineteen years for anything." The coat does not move. "There are costs. The Board does not pretend otherwise. Some people are more useful whole and some are more useful in parts, and the Clinic floors are where that is decided, by doctors, carefully. The hounds in the valley will answer the Board instead of nobody. And the leash the Concern already holds on every piece of its chrome will have a city at the other end." He meets your eye. "You will have heard all of this from people who would rather it were not true. I would rather you heard it from me. It is true."',
    again: '"It is true," Quill says. "All of it."',
    interject: [
      { companion: KES, text: '"Spare Parts," Kes says. "That\'s what we call the Clinic floors, down where I\'m from. He said it nicer. He\'s paid to."' },
      { companion: WREN, text: '"Everyone useful," Wren says. "I know that sentence. It hangs people."' },
      { companion: ILYA, text: '"Everybody counted," Ilya says, "by somebody who never has to stand where they\'re counted."' },
    ],
    options: [back('q')],
  },
  q_me: {
    text: [
      { if: TERMS_WORSE, text: '"Less than there was." He takes no pleasure in it, which is worse. "The Board has read the Skirts\' file. The Shift marked you, and the Clean shut the gate on you, and the Board has a long memory for the people who stood in its gate. The seat is withdrawn." A figure, arrived at somewhere behind his eyes. "What remains is a sum: an annuity, paid at Ninebridge, for life, and the Concern\'s clinics at the end of it, which are the best in the Reach. And your life kept on file, which is a kindness you will not understand until you are old."' },
      { if: TERRACE_YES, text: '"The seat. You have the card." He does not need to look at it. "A seat at the Board\'s table on the terrace, a contract that is a citizenship, the gardens under glass, and the Board\'s season, which is longer than other people\'s. Considerably." He waits for you to ask what that means, and when you do not, he looks almost approving. "Nobody up there looks their age. You would not either."' },
      { text: '"A seat at the Board\'s table." He says it the way other men say bread. "A contract that is a citizenship on the terrace above the Skirts, rooms with real wood on the walls, the gardens under glass, and the Board\'s season, which is longer than other people\'s. Considerably." He waits for you to ask what that means, and when you do not, he looks almost approving. "Nobody up there looks their age. You would not either."' },
    ],
    again: 'Quill waits for a figure you have not named.',
    interject: [{ companion: TAMSIN, text: '"Rooms with wood on the walls," Tamsin says. "We had a ration counter and a wall that was the same colour for twenty-five years." She does not say anything else, which is worse.' }],
    options: [back('q')],
  },
  q_no: {
    text: '"Then we wait." No threat in it, which is the threat. "The Board waited ninety years for the chair to be filled. It can wait for the next face the forecast finds; you would be surprised how many faces a city has." A beat. "If you say no, say it to me plainly, so that I can carry it plainly. I dislike carrying anything that rattles."',
    again: '"Plainly," Quill says. "If at all."',
    options: [back('q')],
  },
  q_terms: {
    text: `He takes a folder from inside the coat, which does not change shape when it is gone: ${PAPER} "Paid already," Quill says. "To the guild, last season. The Board does not ask for what it has not paid for. It is the one courtesy it insists on."`,
    again: 'The folder, open on his forearm, the blank line at the foot.',
    passives: [WORSE_PASSIVE],
    options: termsOptions('q'),
  },
  q_taken: {
    text: '"Thank you." He gives you the folder as if it were the lightest thing he has ever carried, and it is. "Sign it at the desk under your feet, when you are in the chair, and not before; before, it means nothing." For the first time, briefly, he smiles. "Nobody has to decide anything today. You have, though."',
    again: 'The folder is in your pack. Quill is back at his lamp.',
    interject: [
      { companion: KES, text: '"Put it somewhere I can\'t see it," Kes says, very quietly, when he has gone back to his lamp. "I\'m not joking. Somewhere I can\'t see it."' },
      { companion: WREN, text: '"I\'ll walk beside it," Wren says. "Don\'t ask me to walk beside it signed."' },
      { companion: ASH, text: 'Ash watches the folder go into your pack. "Paper," he says, and nothing else, and goes back to the fire.' },
    ],
    options: [back('q')],
  },
  q_carried: {
    text: '"Carrying is a promise." He gives it to you anyway, with the same lack of weight. "You will find out to whom. Most people do." He tucks his empty hand back into the coat. "Nobody has to decide anything today."',
    again: 'The folder is in your pack. Quill is back at his lamp.',
    interject: [
      { companion: ODILE, text: '"Never tell a buyer you\'re only carrying," Odile says afterwards. "He heard \'yes, later\'. They always hear \'yes, later\'."' },
      { companion: KES, text: '"Carrying," Kes says. "Right. And I\'m only carrying the port in my neck." She touches it. "Ask me how that\'s going."' },
    ],
    options: [back('q')],
  },
  q_refused: {
    text: '"Plainly. Thank you." The folder goes back into the coat, and the coat does not change shape. "The Board does not ask twice. I asked for it, which is its own kind of answer." He tips his head a quarter-inch towards the lane, and the city, and the Line beyond it. "The Grand Factor at Ninebridge holds the same paper for the guild, as agent. The floor holds everything twice. In case." He goes back to his lamp.',
    again: 'Quill, at his lamp, with nothing in his hands.',
    interject: [
      { companion: KES, text: '"No," Kes says, trying it out. "Just like that. No." She looks at you as if you had done a trick with a coin.' },
      { companion: ASH, text: '"That\'s one door you didn\'t walk through," Ash says. "Good."' },
      { companion: ODILE, text: '"You\'ve priced yourself," Odile says. "At more than a hill. I approve of the arithmetic, my dear, if not the method."' },
    ],
    options: [back('q')],
  },
  q_returned: {
    text: '"Ah." He takes it back without surprise. "People do. Usually later than this." The folder goes into the coat. "The answer is entered as no. The Board does not ask a third time. The Grand Factor at Ninebridge holds the guild\'s copy, if you find you are a person who changes their mind twice."',
    again: 'Quill, at his lamp, with nothing in his hands.',
    effects: [{ learn: 'a3_sarr_holds' }],
    options: [back('q')],
  },
};

const SOTO_NODES: Record<string, NodeDef> = Object.fromEntries(Object.entries({
  s_intro: {
    text: [
      { if: B4B.longlived('soto'), text: 'Pilar Soto by the east lamp, in the grey suit with the one lit seam at the collar, which down here looks like the only lit thing for a mile. Nobody is with her; somebody across the close in a coat might be. "Designate." She puts out her hand, which nobody from the Board does. "I came down myself. I sit in the Chair now. You arranged that, and I have not forgotten whose arrangement it was." She lets go of your hand. "The Board wants to buy something from you. I am going to be honest about it again, because nobody else will be."' },
      { text: 'Pilar Soto by the east lamp, in the grey suit with the one lit seam at the collar, which down here looks like the only lit thing for a mile. Nobody is with her; somebody across the close in a coat might be. "Designate." She puts out her hand, which nobody from the Board does. "The Chair would have sent a man in a coat. I wanted you to hear it plainly from somebody first, again." She glances up the steps once, the way you look at a cliff you are not going to climb. "We would still rather buy than take. Purchase is kinder than war. I have counted the dead."' },
    ],
    again: 'Soto, by the lamp, her hands empty.',
    effects: [{ learn: 'a3_officer_met' }],
    passives: [
      { if: LN('guild'), label: 'the night at Openfield', text: '"The guild stood with us at Openfield, and you stood with the guild," she says. "The Board considers that the first instalment. I consider it the first cost. They are the same figure."' },
      { if: TERRACE_YES, label: 'the terrace', text: '"SEAT IN WAITING," she says. "You have the card. I wrote it." If she ever believed you, she gives no sign that she has stopped.' },
      { if: B4B.offer('refused'), label: 'the terrace', text: '"You told me no on the terrace. I wrote it down and did not sign it." A faint smile. "The Board asked me to ask again. I told them I would ask once."' },
      { if: F('a3_c9_how', 'sold'), label: 'the Weighhouse', text: 'She does not thank you for the sixty. "I read the Weighhouse\'s intake this week," she says. "I read it every week. It is how I remember what we are."' },
    ],
    options: officerTopics('s', false),
  },
  s_hub: {
    text: [
      { if: HOLDS, text: '"You have it." Soto looks at your pack and not at your face. "I find I would rather you had refused. I would also rather you had it than anyone else. Both are true."' },
      { if: F('a3_concern_terms', 'refused'), text: '"Designate." She has not moved from the lamp. "The answer stands. I have written it down."' },
      { text: '"Designate." She has put her hands in her pockets, which is as close as she comes to waiting.' },
    ],
    again: 'Soto, by the lamp, her hands in her pockets.',
    options: officerTopics('s', true),
  },
  s_what: {
    text: '"The core under your feet," Soto says. "Every forecast the Ledger has made for ninety years and every one it will make, and the schedules attaching, which are the part that matters: a forecast is a guess; a schedule is a guess with wardens." She looks at her hands. "The Concern holds a leash on everything it has chromed. With the core it would hold the Reach\'s future in the same hand. I have told the Board that is too much for one hand. The Board has told me it is exactly enough."',
    again: '"Exactly enough," Soto says. "Their words."',
    interject: [{ companion: NINE, text: '"The schedules are a debt the record owes the people in it," Nine says. "They are not an asset." Soto, without irony: "I know. I have read the balance sheet. That is why they are worth so much."' }],
    options: [back('s')],
  },
  s_why: {
    text: '"Because the Ledger keeps one promise." She says it like a thing she has checked many times. "Any transfer of the city\'s property it may void, but one: the first act of its own Magistrate. It wrote that into the charter for whoever would sit in the chair, and it has never once had to keep it. We are not buying the core from the city. We are buying it from the chair." She does not soften it. "That is you. I am sorry it is you. It would be somebody."',
    again: '"It would be somebody," Soto says.',
    interject: [{ companion: KES, text: '"So it\'s you they need," Kes says. "Not the machine. Of course. It\'s always a person at the end. Somebody has to sign."' }],
    options: [back('s')],
  },
  s_city: {
    text: '"It runs," she says. "I won\'t pretend otherwise; I have watched it run. Clinics on contract, the Line on time, the Sink pumped because pumping is cheaper than burying." Then, because she said she would be honest: "And Clinic Floor Nine goes on, and the cold store, and the Weighhouse, because the Board needs parts and the Reach is full of people who can be persuaded to be useful in pieces. The hounds in the valley wake for us. The Long-Lived go on being forty." She holds your eye. "I would rather you were angry with us before you sign than after."',
    again: '"Before," Soto says. "Not after."',
    interject: [
      { companion: KES, text: '"She says it like it\'s weather," Kes says. "It\'s not weather. It has a sign-in book."' },
      { companion: ILYA, text: '"And the ones you buy," Ilya says. "Who counts them, this time?" Soto: "The same doctor. Every morning." Ilya nods as if she had answered something else.' },
    ],
    options: [back('s')],
  },
  s_me: {
    text: [
      { if: TERMS_WORSE, text: '"Less than I asked for." She does not look away. "Captain Saar read the Skirts\' file to the Board, every page. The Shift marked you, and the gate was shut on you, and the Board will not seat a person its own Clean shut out. I argued. I lost." Plainly: "An annuity, at Ninebridge, for life. Care at the end, in our clinics, which are the best there are. That is all I could get you. It is more than they wanted to give."' },
      { text: '"A seat." Plainly. "At the Board\'s table on the terrace, a contract that makes you a citizen of the hill, rooms with real wood, the gardens. And the season." She does not look away. "You know what the season is. I have been forty for eighty years. You could be twenty-five for as long as you liked, and you would sign the Board\'s papers for all of it."' },
    ],
    again: 'Soto waits. She has said the price; she will not say it twice.',
    interject: [{ companion: TAMSIN, text: '"Twenty-five for ever," Tamsin says. "Behind a door with wood on the walls." She looks at Soto. "We had one of those. It was called a Cistern."' }],
    options: [back('s')],
  },
  s_no: {
    text: [
      { if: B4B.longlived('soto'), text: '"Then I keep asking." She says it as a fact about herself. "I sit in the Chair; I will not stop asking, and I will not start taking. The Board may stop asking me, one day. Then you will meet whoever it asks instead." She looks at the steps. "I would rather you met me."' },
      { text: '"Then we wait," she says. "We\'re very good at it. The forecast found your face; it can find another, and the Board will ask that one, and that one may say yes." She looks at the steps. "Or the Chair stops asking and starts taking. He has other ways to wait. I would still rather you didn\'t find out what they are."' },
    ],
    again: '"We wait," Soto says. "We are good at it."',
    options: [back('s')],
  },
  s_terms: {
    text: `"Here." From a slim case, not a coat: ${PAPER} "Paid already, to the guild, last season," Soto says. "The Board does not ask for what it has not paid for. It thinks of that as decency. I think of it as a way of making sure the seller cannot say no."`,
    again: 'The folder, open in her hands, the blank line at the foot.',
    passives: [WORSE_PASSIVE],
    options: termsOptions('s'),
  },
  s_taken: {
    text: '"Thank you." She means it, and she does not look pleased. "Sign it at the desk under the Spire, as your first act, and not before; before, it is paper." She closes the slim case. "I am relieved. I would like to feel something better than relieved, and I find I do not."',
    again: 'The folder is in your pack. Soto is back by her lamp.',
    interject: [
      { companion: KES, text: '"Put it somewhere I can\'t see it," Kes says, very quietly, when Soto has gone back to her lamp. "I\'m not joking."' },
      { companion: WREN, text: '"I\'ll walk beside it," Wren says. "Don\'t ask me to walk beside it signed."' },
    ],
    options: [back('s')],
  },
  s_carried: {
    text: '"Carry it, then." She gives it to you. "I will tell the Board you said yes. If you are lying, I would rather they found out from you than from me."',
    again: 'The folder is in your pack. Soto is back by her lamp.',
    interject: [{ companion: ODILE, text: '"Never tell a buyer you\'re only carrying," Odile says afterwards. "That one heard it, and wrote down yes anyway. That is the dangerous kind."' }],
    options: [back('s')],
  },
  s_refused: {
    text: '"No." She writes nothing down this time; she has nothing to write in. "Good," she says, which surprises both of you. "Then we wait. The Grand Factor at Ninebridge holds the guild\'s copy as agent; the floor keeps everything twice. I will not tell you to go to her." She looks at the lamp. "I will not tell you not to."',
    again: 'Soto, by the lamp, her hands in her pockets.',
    interject: [
      { companion: KES, text: '"No," Kes says, trying it out. "To her face. She said good." Kes looks as though she does not know what to do with that.' },
      { companion: ASH, text: '"That\'s one door you didn\'t walk through," Ash says. "Good."' },
    ],
    options: [back('s')],
  },
  s_returned: {
    text: '"Ah." She takes it back, and holds it a moment before it goes into the case. "That is braver than never taking it. The answer is no, then; the Board will not ask again." She closes the case. "Imelda Sarr holds the guild\'s copy at Ninebridge, if you change your mind a second time. People do."',
    again: 'Soto, by the lamp, her hands in her pockets.',
    effects: [{ learn: 'a3_sarr_holds' }],
    options: [back('s')],
  },
} satisfies Record<string, NodeDef>).map(([k, n]) => [k, { ...n, speaker: SOTO }]));

export const d_a3_quill: DialogueDef = {
  id: 'd_a3_quill', owner: QUILL,
  start: [
    { if: ALL(SOTO_COMES, NOT(KNOWS('a3_officer_met'))), node: 's_intro' },
    { if: SOTO_COMES, node: 's_hub' },
    { if: NOT(KNOWS('a3_officer_met')), node: 'q_intro' },
    { node: 'q_hub' },
  ],
  nodes: { ...QUILL_NODES, ...SOTO_NODES },
};

// ---------------------------------------------------------------- the Grand Factor's copy (spread into d_nb_sarr)

/** Sarr's start entry, before her own (after a fight's): she has the guild's copy of the paper while `SARR_OFFERS` holds. */
export const SARR_TERMS_START = { if: SARR_OFFERS, node: 'a3_sarr' };
export const SARR_TERMS_NODES: Record<string, NodeDef> = {
  a3_sarr: {
    text: [
      { if: NOT(OFFICER_HERE), text: 'The Grand Factor does not look up from the pen. "The Concern\'s officer is not in a position to call on you," she says, which is how the floor says dead. She turns a folder round on the desk without looking at it: cream, the closed eye in one corner. "The guild is the Concern\'s agent of record. The floor holds everything twice." The clocks on her shelves disagree about the date. "Everything is for sale, designate. Say what you want and I\'ll say what it costs."' },
      { text: 'The Grand Factor does not look up from the pen. "The Concern\'s officer sent a runner from the Spire: the designate turned his paper down." She turns a folder round on the desk without looking at it: cream, the closed eye in one corner. "The guild is the Concern\'s agent of record. The floor holds everything twice." The clocks on her shelves disagree about the date. "Everything is for sale. Even a no. Especially a no, after a while."' },
    ],
    again: 'The cream folder, squared to the edge of the desk. The pen moves. She waits for a figure.',
    options: [
      { id: 'a3sarr.read', text: '(Read the guild\'s copy.)', next: 'a3_sarr_terms', repeat: true },
      { text: '(Something else.)', if: ALL(F('nb_office_ok'), F('nb_sarr_met')), next: 'again' },
      { text: '(Something else.)', if: ALL(F('nb_office_ok'), NOT(F('nb_sarr_met'))), next: 'intro' },
      leave('(Leave her office.)'),
    ],
  },
  a3_sarr_terms: {
    text: 'The same instrument as the officer\'s, to the letter, with one line added in green ink above the signature: BROKERAGE TO THE FLOOR, ONE TENTH. And under CONSIDERATION TO THE MAGISTRATE, in the same green: A LINE ON THE FLOOR\'S BOOK, FOR LIFE. "The Board offered you a chair on a hill," Sarr says. "The floor offers you a line in a book, which outlasts hills. A tenth of what the guild makes on every forecast the Concern sells, paid at this desk, every quarter, for as long as you can walk here." She does not smile. "I am not the Board. I don\'t pretend it\'s anything but money."',
    again: 'The guild\'s copy, the green ink, the blank line.',
    passives: [{ if: TERMS_WORSE, label: 'the floor', text: '"The Board keeps a file on you from the Skirts," she adds. "The floor doesn\'t read files. It reads prices."' }],
    options: [
      { id: 'a3sarr.take', text: 'I\'ll sign it at the core. Give it here.', effects: [...TAKE('sarr', 'taken'), { set: 'a3_sarr_terms', value: 'accepted' }], next: 'a3_sarr_taken' },
      { id: 'a3sarr.carry', text: 'I\'ll carry it. That\'s all I\'ll promise.', effects: [...TAKE('sarr', 'carried'), { set: 'a3_sarr_terms', value: 'accepted' }], next: 'a3_sarr_taken' },
      { id: 'a3sarr.no', text: 'No. Not from you either.', effects: [{ set: 'a3_sarr_terms', value: 'refused' }, { xp: 20 }, A(KES, 3), A(WREN, 3)], next: 'a3_sarr_no' },
      { text: 'Not yet.', next: 'a3_sarr' },
    ],
  },
  a3_sarr_taken: {
    text: '"Done." The folder slides across the desk, and she writes a line in a ledger that says nothing about cores. "The floor thanks you. The floor always thanks you; it is the floor\'s only expense." She is already writing the next line. "Sign it in the chair. Not on my desk. On my desk it\'s a curiosity."',
    again: '"Done," the Grand Factor says, to the ledger.',
    interject: [
      { companion: ODILE, text: '"You bought it from Imelda," Odile says on the deck outside. "Of course you did. She sells everything twice, and both times at the top." She looks back at the office. "She\'ll be Treasurer of the world. Alive, mind. I did ask for alive."' },
      { companion: WREN, text: '"Paper from the Exchange," Wren says. "The last paper I saw out of that office had a girl\'s name on it."' },
    ],
    options: [leave('(Leave her office.)')],
  },
  a3_sarr_no: {
    text: '"Twice." The pen stops. "Nobody has said no to that paper twice." She looks at you properly for the first time, the way the board looks at a lot it cannot price. "Get out of my office before I find out what you are worth."',
    again: 'The pen. She does not look up. The folder has gone back into a drawer that locks.',
    options: [leave('(Leave her office.)')],
  },
};

// ---------------------------------------------------------------- the register back (spread into d_ar_keeper; the drawer; Comfort's word)

/** Keeper Marwood's topic for the register (one option in her topics list, by suffix). */
export const MARWOOD_BACK_OPTION = (sfx: string): OptionDef => ({ id: `keeper.a3back${sfx}`, text: 'The copyist\'s book. I want it back, for the Court.', if: REGISTER_ASK, next: 'mb_ask' });
const REGISTER_BACK = (how: 'bought' | 'word' | 'lifted', text: string): Effect[] => [
  { set: 'a3_register_back' }, { set: 'a3_register_how', value: how }, { xp: how === 'word' ? 80 : 60 }, { decision: { id: 'a3_register_back', text } },
  { news: { tag: 'a3_register_back', text: 'the Court of Accounts reads its register from its own desk again, in the old copyist\'s hand', valence: 4, size: 5, at: 'meridian' } },
  A(NINE, how === 'lifted' ? -2 : 3), A(TAMSIN, 3),
];
export const MARWOOD_BACK_NODES: Record<string, NodeDef> = {
  mb_ask: {
    text: 'Her pen stops. She takes the glasses out of her braid and does not put them on; she holds them, which is worse. "Catalogue number eleven forty-one, oh nine. The Court of Accounts, rulings, R0 to R30, one hand." She does not need the terminal. "It is in the acquisitions drawer behind my knees, rebound; the spine was going. The Court reads its register from here now, as it should. Where the city can read it." She looks at you over the glasses she is not wearing. "You sold it to me. I remember the price. I remember your face when you took it."',
    again: '"Eleven forty-one, oh nine," Keeper Marwood says. "Behind my knees."',
    options: [
      { id: 'mb.why', text: 'Why does it matter where it sits, if the Court reads it either way?', if: NOT(SEEN('mb.why')), next: 'mb_why' },
      { id: 'mb.buy', text: '(Buy it back. 200 Tolls)', if: { item: 'tolls', count: 200 }, effects: [{ take: 'tolls', count: 200 }, ...REGISTER_BACK('bought', 'I bought the Court of Accounts\' register back from the catalogue for two hundred Tolls, and it went back to the desk under the bench.')], next: 'mb_bought' },
      {
        id: 'mb.word', text: 'Comfort Asamoah says she lent it to me. Lent isn\'t sold.', if: KNOWS('a3_comfort_word'), once: true,
        check: { skill: 'speech', dc: 50, mods: [
          { if: KNOWS('ar_keeper_confessed'), dc: -10, why: 'she told you herself that a record should be read, not only kept' },
          { if: { item: 'k_ar_warrant' }, dc: -10, why: 'the designate\'s warrant names you an officer of the Court' },
          { if: { flag: 'ca_precedents', gte: 2 }, dc: -5, why: 'your name is in the register\'s margin as a speaker' },
          { if: IN(NINE), dc: -5, why: 'Unit 9 can say what a register is for' },
        ] },
        effects: [...REGISTER_BACK('word', 'On Comfort Asamoah\'s word that it was lent, Keeper Marwood gave the Court of Accounts\' register back, and I carried it to the desk under the bench.'), TRUST(MARWOOD, 5), { time: 15 }],
        next: 'mb_word', fail: 'mb_word_no',
      },
      leave('Not now.'),
    ],
  },
  mb_why: {
    text: '"Because of what is written in it next." She puts the glasses back into the braid. "In the catalogue, a ruling is a record: kept, numbered, read by whoever has a slip. In the Court\'s own register it is a precedent: the next case is read against it, and the case after that, and somebody can stand at the rail and change what the city does by what was said there last time. The city keeps records. The Court keeps its word." A pause. "Comfort used to say that. I used to think it was sentimental."',
    again: '"The Court keeps its word," Marwood says. "Comfort\'s line."',
    interject: [{ companion: NINE, text: '"A precedent is a record the next record must answer to," Nine says. "There are very few of them. I can count them on one ledger."' }],
    options: [{ text: '(Back.)', next: 'mb_ask' }],
  },
  mb_bought: {
    text: '"Two hundred." She counts the Tolls into a drawer marked ACQUISITIONS, takes the book out of the one beside it under the same word, and writes DEACCESSIONED — RETURNED TO THE COURT on the flyleaf in a hand nothing like the hand inside. "A hundred and fifty, and fifty for the binding. Acquisitions does not lose money; it is the only thing in this building that does not." She calls across to the stair. "Hemant. Take this across the close to the Court\'s register desk, under the bench. Put it down as if it were heavier than it is." She watches him go. "The record is incomplete again," she says, and does not sound as though she minds.',
    again: '"Incomplete," Keeper Marwood says, and writes in the index.',
    options: [leave('(Leave the counter.)')],
  },
  mb_word: {
    text: '"Lent." She says the word as if checking its spelling. "She said that." It is not a question. "Then the catalogue holds a book that was never the seller\'s to sell." She is quiet for a long moment. "I knew. The hand never slopes; it is hers in every line, and the last ruling in it is her own case. A person does not sell their own case. Somebody sells it for them." She takes it out of the drawer behind her knees and writes nothing on the flyleaf at all. "Take it across yourself. Put it on the desk under the bench. If anybody asks, the keeper was persuaded." A dry look. "Nobody asks me what I notice."',
    again: '"Persuaded," Keeper Marwood says to the index. "Entered."',
    interject: [{ companion: TAMSIN, text: 'On the way across the close Tamsin carries it, both arms, the way she would carry a child that was asleep. She does not say anything until the Court\'s door. "She lent it," she says then. "You brought it back. That\'s all that\'s ever wanted, really."' }],
    options: [leave('(Carry it across the close to the Court.)')],
  },
  mb_word_no: {
    text: '"Her word, from your mouth." Not unkindly. "You sold it to me with your hands. I have the hands\' word in the acquisitions book, in ink." She puts the glasses back into her braid. "Bring me two hundred, and the catalogue will forget it ever had it. That much I can do."',
    again: '"Two hundred," Keeper Marwood says. "That much I can do."',
    options: [{ text: '(Back.)', next: 'mb_ask' }],
  },
};

export const d_a3_acquisitions: DialogueDef = {
  id: 'd_a3_acquisitions', owner: 'narrator',
  start: [
    { if: F('a3_register_back'), node: 'empty' },
    { if: ALL(REGISTER_ASK, F('a3_acq_woken')), node: 'watched' },
    { if: ALL(REGISTER_ASK, NIGHT), node: 'night' },
    { if: REGISTER_ASK, node: 'day' },
    { node: 'shut' },
  ],
  nodes: {
    shut: {
      text: 'A steel drawer behind the keeper\'s counter with ACQUISITIONS on a card in a brass frame. Locked. Whatever the catalogue buys goes in it, and nothing the catalogue buys comes out.',
      again: 'ACQUISITIONS, in its brass frame. Locked.',
      options: [leave('(Leave it.)')],
    },
    day: {
      text: 'The drawer marked ACQUISITIONS, behind the keeper\'s counter. Keeper Marwood\'s chair is in front of it, and Keeper Marwood is in the chair, writing in the index. She does not look up. She does not need to.',
      again: 'Keeper Marwood, in front of the drawer, writing.',
      options: [leave('(Leave it.)')],
    },
    night: {
      text: 'The catalogue after hours: one green lamp on the terminal, the porter asleep sitting up at his desk by the stair, and Keeper Marwood asleep at her own counter with her cheek on the index and her glasses still in her braid. The drawer marked ACQUISITIONS is behind her knees. Its lock is a good one. It is not a new one.',
      again: 'Keeper Marwood asleep on the index; the drawer behind her knees.',
      options: [
        {
          id: 'acq.pick', text: '(Work the drawer\'s lock without waking her.)', once: true,
          check: { skill: 'security', dc: 45, mods: [{ if: { origin: 'archive_clerk' }, dc: -10, why: 'you have locked a hundred drawers like it, and know where they give' }, { if: IN(TAMSIN), dc: 5, why: 'Tamsin is trying very hard not to breathe' }] },
          effects: [
            ...REGISTER_BACK('lifted', 'I lifted the Court of Accounts\' register out of the catalogue\'s acquisitions drawer at night, past its sleeping keeper, and put it back on the desk under the bench.'),
            { time: 25 }, { memory: { npc: MARWOOD, tag: 'a3_book_lifted', valence: -10, strength: 60 } },
          ],
          next: 'lifted', fail: 'woken', failEffects: [{ set: 'a3_acq_woken' }, { memory: { npc: MARWOOD, tag: 'a3_drawer_tried', valence: -15, strength: 70 } }],
        },
        leave('(Leave it.)'),
      ],
    },
    lifted: {
      text: 'The lock gives on the fourth try with a sound like a page turning. Marwood sighs in her sleep and says something to the index. The book is rebound in catalogue green with a number on the spine; inside, the hand never slopes. You carry it across the dark close, past the fire barrel and in at the Court\'s side door, and put it on the desk under the bench where the register is kept. Three\'s lens turns to it in the dark, and stays.',
      again: 'The desk under the bench, and the book on it.',
      interject: [
        { companion: NINE, text: '"A record returned is still a record taken," Nine says at the Court\'s door, very low. "I will log it as both."' },
        { companion: ODILE, text: '"Bought at a hundred and fifty and taken back at nothing," Odile murmurs. "My dear. A margin."' },
      ],
      options: [leave('(Leave the Court.)')],
    },
    woken: {
      text: 'The lock catches on the third try and the drawer gives a steel shiver, and Keeper Marwood is awake without having moved. "Don\'t." A whisper; she does not want the porter either. "Go out by the close door, and I never saw you, and I will not sleep at this counter again." She does not reach for anything. She has never had to.',
      again: 'Keeper Marwood, awake, watching the drawer.',
      options: [leave('(Go out by the close door.)')],
    },
    watched: {
      text: 'ACQUISITIONS, in its brass frame. Keeper Marwood has moved the porter\'s chair round to face it, and sleeps in that now, when she sleeps.',
      again: 'The drawer, and the keeper facing it.',
      options: [leave('(Leave it.)')],
    },
    empty: {
      text: [
        { if: F('a3_register_how', 'lifted'), text: 'ACQUISITIONS. A space in the drawer the width of one thick book, and on the card in the brass frame, in Keeper Marwood\'s hand, a new line: 1141-09 — MISSING. Under it, smaller: *returned?*' },
        { text: 'ACQUISITIONS. A space in the drawer the width of one thick book, and on the card in the brass frame, in Keeper Marwood\'s hand, a new line: 1141-09 — DEACCESSIONED.' },
      ],
      again: 'The space in the drawer where the register was.',
      options: [leave('(Leave it.)')],
    },
  },
};

/** Comfort Asamoah at the Sink's tally wall (her Act 2 end): one option, and her word. Spread into `d_ar_copyist`. */
export const COMFORT_WORD_OPTION: OptionDef = { id: 'copy.a3.word', text: 'Keeper Marwood has your book in her acquisitions drawer. Will you say it was lent?', if: ALL(REGISTER_ASK, NOT(KNOWS('a3_comfort_word'))), next: 'a3_word' };
/** The tally node's text once the register is back (prepended to its own). */
export const COMFORT_TALLY_BACK: { if: Cond; text: string } = { if: F('a3_register_back'), text: 'At the foot of the Sink\'s tally wall, with her hand flat over her own name: ASAMOAH, C. — R12 — STAIR. "They tell me it\'s on the desk under the bench," she says, without turning. "In my hand. Good." She takes her hand away from the wall. "I came down to see if they\'d spelled me right. They had. They\'ll have to spell the next ones right too, now. Somebody will be reading."' };
export const COMFORT_WORD_NODES: Record<string, NodeDef> = {
  a3_word: {
    text: 'She takes her hand off her own name and turns round, which you have not seen her do. "Lent." She looks at you the way she looks at a page somebody else has copied. "Yes. I lent it to you. I said bring it back." The wall behind her has four hundred names on it in chalk. "Tell Junko Marwood that Comfort Asamoah says it was lent, and that she knows my hand better than she knows her own, and that a person does not sell their own case." A breath. "I don\'t want it back. The dead don\'t keep books. I want it on the desk under the bench, where Three reads it, and where the next one who stands at that rail can be read against it." She turns back to the wall. "That\'s all. That\'s all it was ever for."',
    again: '"Lent," she says to the wall. "Tell her."',
    effects: [{ learn: 'a3_comfort_word' }, TRUST(COMFORT, 10)],
    interject: [{ companion: TAMSIN, text: 'Tamsin looks at the wall of names, and at the old woman in front of it, and does not say anything about counting, for once.' }],
    options: [leave('(Leave her at the wall.)')],
  },
};

// ---------------------------------------------------------------- the column's lead at the close: Lowe, or Reyes

const LOWE_AS = (v: string): Cond => F('a3_lowe', v);
const CARRIED = LOWE_AS('carried');
const SFX_L = ['', '.hub'];
const loweTopics = (x: string): OptionDef[] => [
  { id: `a3lc.now${x}`, text: 'What happens to you now?', if: onceOf('a3lc.now', SFX_L), next: 'now' },
  { id: `a3lc.sixty${x}`, text: 'The sixty.', if: onceOf('a3lc.sixty', SFX_L), next: 'sixty' },
  { id: `a3lc.steps${x}`, text: 'Will you be on the steps?', if: onceOf('a3lc.steps', SFX_L), next: 'steps' },
  { id: `a3lc.home${x}`, text: 'You said once that the third word was "Home."', if: ALL({ remembers: { npc: LOWE, tag: 'a3_third_word' } }, onceOf('a3lc.home', SFX_L)), next: 'home' },
  { id: `a3lc.list${x}`, text: 'You keep touching your breast pocket.', if: ALL(NOT(onceOf('a3lc.now', SFX_L)), NOT(KNOWS('a3_lowe_list'))), next: 'list' },
  leave('(Leave him to the close.)'),
];
const reyesTopics = (x: string): OptionDef[] => [
  { id: `a3lc.r.lowe${x}`, text: 'Lowe.', if: onceOf('a3lc.r.lowe', SFX_L), next: 'r_lowe' },
  { id: `a3lc.r.steps${x}`, text: 'Will you be on the steps?', if: onceOf('a3lc.r.steps', SFX_L), next: 'r_steps' },
  leave('(Leave her to the close.)'),
];
const loweBack: OptionDef = { text: '(Back.)', next: 'hub' };
const reyesBack: OptionDef = { text: '(Back.)', next: 'r_hub' };

export const d_a3_lowe_close: DialogueDef = {
  id: 'd_a3_lowe_close', owner: LOWE,
  start: [
    { if: ALL(LOWE_DEAD, NOT(KNOWS('a3_reyes_close_met'))), node: 'r_intro' },
    { if: LOWE_DEAD, node: 'r_hub' },
    { if: NOT(KNOWS('a3_lowe_close_met')), node: 'intro' },
    { node: 'hub' },
  ],
  nodes: {
    intro: {
      text: [
        { if: LOWE_AS('stood_down'), text: 'Captain Lowe at the foot of the steps, cap under his arm, in the same grey he wore on Knock\'s apron, pressed. "Designate." He does not salute; he never has. "The Precinct has given me the close until the designate attends. It considers that a reprimand. I wrote ATTENDED. DECLINED. COLUMN WITHDRAWN. across the foot of an order of the Ledger\'s, and a captain who does that is given a square to stand in." He looks at the square. "It is a good square."' },
        { if: LOWE_AS('withdrawn'), text: 'Captain Lowe at the foot of the steps, cap under his arm. "Designate." He does not salute; he never has. "The order did not execute. Nobody stood it down. It is on my desk with a pin through it, and the Precinct has asked me what I intend to do with it." A pause the length of a clause. "I have said: wait. It is what the order does. I am learning it from the order."' },
        { if: LOWE_AS('yielded'), text: 'Captain Lowe at the foot of the steps, his left arm strapped across his chest under the grey, standing as straight as the strap lets him. "Designate." He does not salute; he could not. "I yielded on your apron with two of mine on the concrete. I have written to their families. I write a bad letter. I have had practice, and it has not helped." He does not say it to wound you. He says it so that it has been said.' },
        { if: ALL(CARRIED, F('a3_tamsin_dead')), text: 'Captain Lowe at the foot of the steps, cap under his arm. He looks older than the grey. "Designate." The same voice he uses for everything, and it nearly holds. "Thirty-two doors, in eleven years and a month. I knelt by one of them." He does not say her name. He does not need to; it is in the way he does not say it.' },
        { if: CARRIED, text: 'Captain Lowe at the foot of the steps, cap under his arm. "Designate." The same voice he uses for everything. "Thirty-two doors, in eleven years and a month. Lawful, every one. I checked." He looks at the steps, not at you. "The Precinct has given me the close until the designate attends. It considers that an honour."' },
        { text: 'Captain Lowe at the foot of the steps, cap under his arm. "Designate." He does not salute; he never has. "The Precinct has given me the close until the designate attends. I keep it."' },
      ],
      again: 'Captain Lowe, at the foot of the steps.',
      effects: [{ learn: 'a3_lowe_close_met' }, { set: 'a3_lowe_close' }],
      options: loweTopics(''),
    },
    hub: {
      text: [
        { if: LOWE_AS('yielded'), text: 'Captain Lowe, the strapped arm, the cap under the good one. "Designate."' },
        { text: 'Captain Lowe at the foot of the steps, cap under his arm. "Designate."' },
      ],
      again: 'Captain Lowe waits, at ease, which on him looks like attention.',
      options: loweTopics('.hub'),
    },
    now: {
      text: [
        { if: LOWE_AS('stood_down'), text: '"An inquiry, after. Whatever comes after." He says it the way he says the weather. "The Precinct does not dismiss captains; it moves them to squares." Then, lower: "If one morning the lens has nothing to say to us, designate, the wardens will still be at their posts. Order is a habit before it is a schedule. I have spent eleven years on the schedule. I will spend whatever is left on the habit."' },
        { if: LOWE_AS('withdrawn'), text: '"Nothing, until the order does something." He almost smiles. "It is the first time in eleven years I have had a paper on my desk that I am not obliged to carry out and not permitted to throw away. I find I read it every morning. I find it reads the same."' },
        { if: LOWE_AS('yielded'), text: '"The Precinct will want to know why a captain yielded to a designate." He moves the strapped arm a quarter-inch and stops. "I will tell it: because the designate was standing in front of a door, and so was I, and only one of us was wrong. I expect it will not like the answer. I did not expect it to."' },
        { if: CARRIED, text: '"Promoted, probably." Flat. "They promote the captains who carry. They are short of us." He turns the cap round once in his hand. "I have been told I may choose my next square. I asked for this one. I wanted to see what the first act of the chair looks like from the bottom of the steps."' },
        { text: '"The close, until you attend. Then whatever the chair decides." He looks at you. "It will be you deciding. I would rather know that than not."' },
      ],
      again: '"The habit," Lowe says, "or the schedule." He does not say which.',
      options: [loweBack],
    },
    sixty: {
      text: [
        { if: F('a3_c9', 'sealed'), text: '"Behind their door." He nods once. "When the column went back up the lane, somebody inside knocked on it. Three times, slowly, the way you knock to say you are still there. I have not told the Precinct. It would want to know what it meant."' },
        { if: F('a3_c9', 'opened'), text: '"Out." Something nearly like pleasure crosses his face and leaves again. "Some in the city, of their own will; I signed them through the gate myself, with their names. Ola Fairley asked me what the sky does at night. I told her. She did not believe me."' },
        { if: F('a3_c9_how', 'consent'), text: '"On their feet, with their names." He looks at his hands. "I have never once carried people who asked to come. I did not know how to hold a door for them. Sayer Quist showed me. He held it for me."' },
        { if: F('a3_c9_how', 'sold'), text: '"Up the guild\'s road, to the Weighhouse." He does not look away from you. "I read the paper, as you said I must. Two lawful papers on one door. I chose the one you signed."' },
        { if: F('a3_c9', 'relocated'), text: '"In the Hospice block. Graded. Fed. Most of them alive in ten years." His own words from the apron, said back without inflection. "Never asked." He turns the cap round once. "I go and look at them on my day off. I am not sure who that is for."' },
        { text: '"Sixty names," he says, "and Knock\'s. I have them all. I had them before I came down the toll road."' },
      ],
      again: '"Sixty," Lowe says. "I have the names."',
      interject: [{ companion: ILYA, text: '"He has the names," Ilya says afterwards. "He counts them like I count mine. Every night, the same number, in case it\'s changed."' }],
      options: [loweBack],
    },
    steps: {
      text: [
        { if: ALL(LOWE_AS('stood_down'), { trust: { npc: LOWE, gte: 25 } }), text: '"The Precinct keeps the close the day the designate attends. I keep the Precinct\'s close." He looks up the steps, and down to the steel door in the Spire\'s foot. "Whatever you do up there, I will be at the foot of these steps when you come down them." A beat. "If you come down them in a hurry, I will be a slow reader. I have always been a slow reader."' },
        { text: '"The Precinct keeps the close the day the designate attends. I keep the Precinct\'s close." He looks up the steps, all of them. "I will be here when you come down. Whatever you are when you come down."' },
      ],
      again: '"Here," Lowe says. "When you come down."',
      options: [loweBack],
    },
    home: {
      text: '"Home." He says it the way he said it in Knock, as if checking that it is still a word. "Thirty-one evictions, and I did not know what the third word was until a reserve that had never seen my face told me without speaking." He looks at the square, and the city, and the lamps that work. "I have not been home in eleven years. I have a room in the Precinct with a desk in it. I find I would like to go home, after. I do not know where it is."',
      again: '"Home," Lowe says. "After."',
      effects: [TRUST(LOWE, 3)],
      options: [loweBack],
    },
    list: {
      text: 'He takes it out of his breast pocket: a sheet folded so many times the creases have gone soft, EVICTIONS — SCHEDULED at the top in a clerk\'s hand and, under it, in his own, thirty-one names and dates, and a thirty-second line that is only the word KNOCK. "Every one I carried, or did not. I have read it every night for eleven years." He holds it out. "If you sit in that chair, read this before you sign anything. Not because it will change what you sign. So that you will know whose names were on the paper before yours."',
      again: 'The folded list is in your pack.',
      effects: [{ learn: 'a3_lowe_list' }, TRUST(LOWE, 5), { memory: { npc: LOWE, tag: 'a3_gave_list', valence: 10, strength: 80 } }],
      interject: [{ companion: NINE, text: '"Thirty-one entries and a thirty-second," Nine says. "I have them too. His hand is better than mine."' }],
      options: [loweBack],
    },
    ...Object.fromEntries(Object.entries({
      r_intro: {
        text: [
          { if: { dead: 'npc_md_01_apron' }, text: 'Sergeant Reyes at the foot of the steps, where the captain would stand, in grey that has been brushed and not slept in. "Designate." She does not offer to shake. "Captain, on paper, since your apron. The Precinct needed somebody to stand here. I asked to be the one." She looks at you the way you look at a bill. "He went down with his empty hand out. I want you to know I saw it."' },
          { text: 'Sergeant Reyes at the foot of the steps, where the captain would have stood. "Designate. Captain, on paper, since the spring." She looks up the steps. "He would have liked to see this. He was a slow reader, and a thorough one, and he would have read the whole thing."' },
        ],
        again: 'Reyes, at the foot of the steps.',
        effects: [{ learn: 'a3_reyes_close_met' }, { set: 'a3_lowe_close' }],
        options: reyesTopics(''),
      },
      r_hub: { text: '"Designate." Reyes, at ease, which on her looks like a dare.', again: 'Reyes waits.', options: reyesTopics('.hub') },
      r_lowe: {
        text: [
          { if: { dead: 'npc_md_01_apron' }, text: '"Thirty-one doors with him. He grieved every one, and checked every one, and carried every one. Then yours." She does not raise her voice. "I don\'t know what you think you won down there. I know what it cost. I count the same as he did."' },
          { text: '"He died in the spring, in the Precinct, and the Precinct buried him with his list in his pocket. Thirty-one names." She looks at the steps. "I read them at the grave. Nobody else was going to."' },
        ],
        again: '"Thirty-one," Reyes says. "I read them."',
        options: [reyesBack],
      },
      r_steps: {
        text: '"I keep the close." Flat. "The Precinct keeps the close the day the designate attends, and I am the Precinct, today. Whatever you do up there, I will be here when you come down." A beat. "If you come down." She does not explain the second sentence, and you do not ask her to.',
        again: '"Here," Reyes says.',
        options: [reyesBack],
      },
    } satisfies Record<string, NodeDef>).map(([k, n]) => [k, { ...n, speaker: REYES }])),
  },
};

// ---------------------------------------------------------------- the Unwritten at the close (turned at Knock: with_you)

const FATHER_HOME: Cond = ALL(NOT(MASON_DEAD), NOT(MASON_EXILED));
const SFX_U = ['.p', '.p.hub', '.j', '.j.hub'];
const uwTopics = (p: 'p' | 'j', hub: boolean): OptionDef[] => {
  const x = `.${p}${hub ? '.hub' : ''}`;
  return [
    { id: `a3uc.do${x}`, text: 'What will you do here?', if: onceOf('a3uc.do', SFX_U), next: `${p}_do` },
    { id: `a3uc.sash${x}`, text: 'And if I come down those steps in their sash?', if: onceOf('a3uc.sash', SFX_U), next: `${p}_sash` },
    ...(p === 'p' ? [{ id: `a3uc.father${x}`, text: 'Your father.', if: onceOf('a3uc.father', SFX_U), next: 'p_father' }] : []),
    leave('(Leave them to the stone.)'),
  ];
};
const UW_SASH_INTERJECT: Interject = [{ companion: ASH, text: '"I\'ll be on those steps," Ash says, to her and not to you. "Say it to me as well." She looks at him a long time. "I always do, Brother."' }];
const uwNodes = (p: 'p' | 'j', who: string): Record<string, NodeDef> => {
  const lead = p === 'p' ? 'Petra' : 'Juniper';
  const nodes: Record<string, NodeDef> = {
    [`${p}_intro`]: {
      text: p === 'p'
        ? 'Petra Mason on the cold stone at the west end of the close, her hood down and her face bare to the city\'s lamps, which may be the bravest thing anybody has done on this square in ninety years. Thaddeus is beside her with the machete across his knees, not sharpened, only out; Rhoda has her back to the Spire. "We came east," Petra says. "Not for you. For the book." She looks up the steps to the doors, and down to the steel door in the Spire\'s foot. "It\'s under there. Everybody in the Reach is in it, a season early. And you\'re the only one it\'s going to open for."'
        : 'Juniper Lowry on the cold stone at the west end of the close, hood down, her face bare to the lamps, which she has never got used to and faces anyway. Thaddeus beside her with the machete across his knees; Rhoda with her back to the Spire. "We came east. For the book." She says the next name the way the Unwritten say names, once, so that it stays said. "Petra would have." She looks down at the steel door in the Spire\'s foot. "It\'s under there. You\'re the only one it opens for."',
      again: `${lead}, on the stone, her face to the lamps.`,
      effects: [{ learn: 'a3_uw_close_met' }],
      options: uwTopics(p, false),
    },
    [`${p}_hub`]: { text: `"Designate." ${lead} does not get up.`, again: `${lead} waits on the stone.`, options: uwTopics(p, true) },
    [`${p}_do`]: {
      text: `"Wait." ${p === 'p' ? 'She nearly smiles.' : 'She does not smile.'} "You\'re the only book we allow, remember. Nothing happens unless you\'re on the stone to see it." She looks at the steel door again. "If you go down there and want it burned, we know fire. We know it better than anybody alive. If you don\'t, we\'ll have walked a long way to sit on cold stone in a city that counts us." A shrug under the homespun. "It\'s been done."`,
      again: `"Wait," ${lead} says. "We\'re good at it now."`,
      options: [{ text: '(Back.)', next: `${p}_hub` }],
    },
    [`${p}_sash`]: {
      text: '"Then you\'re not going down to the book. You\'re the book." Plainly, to your face, which is their rule. "I can\'t promise you Thaddeus then. Nobody can promise anybody Thaddeus. I can promise you I\'ll say it to you first, like this, and not from behind." She looks at you for a long moment. "Don\'t make me say it twice."',
      again: '"Don\'t make me say it twice," she says.',
      interject: UW_SASH_INTERJECT,
      options: [{ text: '(Back.)', next: `${p}_hub` }],
    },
  };
  if (p === 'p') {
    nodes.p_father = {
      text: [
        { if: MASON_DEAD, text: '"He burned with the rows." She says it to the steps, not to you. "I wasn\'t there. I was told. He never fought for seed; he said that was the point. It was a good point. It didn\'t stop the fire."' },
        { if: MASON_EXILED, text: '"Walking somewhere with the guild\'s paper in his pocket that says Openfield is theirs." Her mouth goes thin. "He never fought for seed. He said that was the point. He\'s still making it, on a road, to anyone who\'ll stand still."' },
        { if: FATHER_HOME, text: '"At Openfield, singing at the seed store." She looks at her hands. "He thinks I\'m in the hills. I let him. It\'s the kindest lie I know, and I know a lot of them; we keep no books, so we keep everything else."' },
      ],
      again: '"My father," Petra says, and nothing else.',
      options: [{ text: '(Back.)', next: 'p_hub' }],
    };
  }
  return Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, { ...n, speaker: who }]));
};

export const d_a3_petra_close: DialogueDef = {
  id: 'd_a3_petra_close', owner: PETRA,
  start: [
    { if: ALL(PETRA_DEAD, NOT(KNOWS('a3_uw_close_met'))), node: 'j_intro' },
    { if: PETRA_DEAD, node: 'j_hub' },
    { if: NOT(KNOWS('a3_uw_close_met')), node: 'p_intro' },
    { node: 'p_hub' },
  ],
  nodes: { ...uwNodes('p', PETRA), ...uwNodes('j', U1) },
};
export const d_a3_thaddeus_close: DialogueDef = {
  id: 'd_a3_thaddeus_close', owner: U2, start: [{ node: 'here' }],
  nodes: {
    here: {
      text: 'Thaddeus, the machete across his knees, not sharpened, only out. He looks at your face for exactly as long as it takes to know it again. "She says you\'re for the book." He looks up the steps, to the doors. "I\'ll watch you go up."',
      again: '"I\'ll watch you go up," Thaddeus says again, to the steps.',
      options: [leave('(Leave him.)')],
    },
  },
};
export const d_a3_rhoda_close: DialogueDef = {
  id: 'd_a3_rhoda_close', owner: U3, start: [{ node: 'here' }],
  nodes: {
    here: {
      text: 'Rhoda Kalder, with her back to the Spire so that she does not have to look at it. "Eleven thousand faces I printed for the guild\'s cards," she says. "Every one on a stool against a white sheet. Nobody ever stood on steps for me." She does not turn round. "Go up, if you\'re going. I\'ll hear about it. Everybody will."',
      again: 'Rhoda, her back to the Spire. "Go up, if you\'re going."',
      options: [leave('(Leave her.)')],
    },
  },
};

// ---------------------------------------------------------------- a hidden Nine walks in, written off

export const d_a3_nine_walkin: DialogueDef = {
  id: 'd_a3_nine_walkin', owner: NINE, start: [{ node: 'walkin' }],
  nodes: {
    walkin: {
      text: 'Nine on a crate at the edge of the fire barrel\'s ring, its ledger on its knee and dust from somewhere outside the Wall on its plating. "NOT FOUND," it says, before you can ask. "I walked in through the Precinct gate at six this morning. The lens did not look up. An asset written off is not looked for; I have now tested this." The lens clicks. "The card said the designate will attend the steps. It did not say the designate would attend them alone. I have assumed an omission."',
      again: '"The record suggests we were going somewhere," Nine says.',
      options: [
        { id: 'a3nw.come', text: 'We\'re going. Come on.', effects: [{ join: NINE }, { set: 'a3_nine_fetched' }, A(NINE, 3)], exit: true },
        { id: 'a3nw.fire', text: 'Wait here by the fire.', effects: [{ set: 'a3_nine_fetched' }, A(NINE, 3)], exit: true },
      ],
    },
  },
};

// ---------------------------------------------------------------- the allies who count at the close

const sit = (id: string, owner: string, intro: Text, again: string, topics: { id: string; text: string; if?: Cond; node: string; reply: Text; effects?: Effect[]; interject?: Interject }[], learn: string): DialogueDef => {
  const opts = (x: string): OptionDef[] => [
    ...topics.map((t): OptionDef => ({ id: `${id}.${t.node}${x}`, text: t.text, if: ALL(...(t.if ? [t.if] : []), onceOf(`${id}.${t.node}`, ['', '.hub'])), next: t.node })),
    leave(),
  ];
  return {
    id, owner,
    start: [{ if: NOT(KNOWS(learn)), node: 'intro' }, { node: 'hub' }],
    nodes: {
      intro: { text: intro, again, effects: [{ learn }], options: opts('') },
      hub: { text: again, again, options: opts('.hub') },
      ...Object.fromEntries(topics.map((t) => [t.node, { text: t.reply, again, effects: t.effects, interject: t.interject, options: [{ text: '(Back.)', next: 'hub' }] } as NodeDef])),
    },
  };
};

const MASON_HOME: Cond = ALL(NOT(MASON_DEAD), NOT(MASON_EXILED));
export const d_a3_keziah = sit('d_a3_keziah', 'npc_a3_31', [
  { if: MASON_HOME, text: 'A sister of the Choir in undyed homespun gone grey on the road, on the cold stone below the planters with a dozen more behind her in a loose ring. Two of them are singing under their breath. "Keziah Abernethy. The Elder sent us." She does not get up; she pats the stone beside her instead. "The sky keeps no books, so nobody will write down that we came. We came."' },
  { if: CALLA_FREE, text: 'A sister of the Choir in undyed homespun gone grey on the road, on the cold stone below the planters with a dozen more behind her in a loose ring. Two of them are singing under their breath. "Keziah Abernethy. Sister Calla sent us. She\'d have come herself; she\'s setting a leg in Shale and won\'t leave it half set." She pats the stone beside her. "The sky keeps no books. We came anyway."' },
  { text: 'A sister of the Choir in undyed homespun gone grey on the road, on the cold stone below the planters with a dozen more behind her in a loose ring. Two of them are singing under their breath. "Keziah Abernethy. The seed-keeper sent us, Doria. She counted who would walk, and it was more than she had bread for." She pats the stone beside her. "The sky keeps no books. We came anyway."' },
], '"Sit, if you\'re sitting," Keziah says.', [
  { id: 'vigil', text: 'What will the Choir do?', node: 'vigil', reply: '"Sit." She means it as an answer and as an act. "On this stone, the night you go up, and every night after it that it takes. We\'ll sing; it unnerves wardens, and it helps people find a square in the dark if the lights ever go." She looks at the lamps. "They never have, here. That\'s a thing that might change."', interject: [{ companion: ASH, text: '"They\'ll sing the long one," Ash says. "The one with no end. You keep going until somebody stops you." Keziah: "Nobody ever has, Brother."' }] },
  { id: 'calla', text: 'Sister Calla.', if: ALL(CALLA_CASE_OPEN, NOT(F('ca_calla'))), node: 'calla', reply: '"In the Precinct\'s cells, since the night at Openfield. Listed for sedition, which means for saying the sky keeps no books where a lens could hear it." She turns her hands over; they are a nurse\'s hands. "Her card is on the Court\'s docket. Nobody has called it. A citizen can speak for her there, the usher says: clause twelve. We have no citizens."', effects: [{ learn: 'a3_calla_told' }] },
], 'a3_close_choir');

export const d_a3_lucan = sit('d_a3_lucan', 'npc_a3_32', 'A rider of the Wheel with pan dust to the knee, leaning on nothing, watching the lane to the Precinct the way you watch a road. "Lucan Begay. Sefa sent me down the pan with one word, which was: ready." He looks at you, then at the steps. "Every road in the Reach has a rider on it tonight, or will when you say. Whatever happens up there, people should hear it first from a face they know. Not a radio. Not a wall."', 'Lucan, watching the lane like a road.', [
  { id: 'word', text: 'What word should they carry?', node: 'word', reply: '"Yours." He shrugs. "Whatever you say when you come down. Or that you didn\'t come down. We carry both kinds. We\'ve been carrying both kinds for ninety years; you get good at the face you make for the second." He looks back at the lane. "Make it the first kind, if you can. The riders like it better."' },
  { id: 'mast', text: 'Dario is at Signal Hill with the switch.', if: F('a3_mast_keeper', 'wheel'), node: 'mast', reply: '"He wanted a door that shuts." Lucan almost laughs. "He\'s got a hill that talks. He says it\'s the same thing, if you hold the handle." A beat. "Sefa says he\'s never been happier. Sefa says it like it\'s a complaint."' },
], 'a3_close_wheel');

export const d_a3_ifeoma = sit('d_a3_ifeoma', 'npc_a3_33', 'A docker from Carrick in her work clothes, the tally hook still on her belt, sitting on the close\'s good stone as if she were pricing it. "Ifeoma Okonjo. Connie\'s on the quays; I\'m the one she could spare." She nods back towards the docks, which you cannot see from here. "The Stand keeps the quays the night you go up, and every night after it has to. Nobody loads. Nobody unloads. Nobody burns anything they can\'t unburn."', 'Ifeoma, on the good stone, pricing it.', [
  {
    id: 'why', text: 'Why would the dockers stand for me?', node: 'why',
    reply: [
      { if: F('dk_prec_passenger'), text: '"We don\'t. We stand for the Harbour Act." She taps the hook. "A person landed on the quay is a passenger, never cargo. We\'d been saying it at every crane in Carrick for years, and you made the Harbour court write it down. Tonight we\'d like to be standing on it."' },
      { text: '"We don\'t. We stand for the quays." She taps the hook. "A person landed on the quay is a passenger, never cargo. We\'ve been saying it at every crane in Carrick for years and nobody\'s ever written it down. Tonight we\'d like to be standing on it anyway."' },
    ],
  },
], 'a3_close_stand');

export const d_a3_tuan = sit('d_a3_tuan', 'npc_a3_34', 'A young man from Bridgeward on the Court\'s side of the close, eating an apple down to the pips, wearing the three crews\' colours in three different places, which in Bridgeward is a passport. "Tuan. I run for the chain." He nods at the lane as if Bridgeward were at the end of it. "Auntie Holt says the streets are kept. The Gilt keep theirs, the Pale keep theirs, the Rustmouths keep ours, and nobody likes it, which is how you know it\'s fair."', 'Tuan, finishing the apple.', [
  { id: 'how', text: 'How do three crews keep one night?', node: 'how', reply: '"Same as they keep the chain. Everybody holds one link and nobody lets go first." He eats the core, pips and all. "If something comes down off this hill that nobody planned for, Bridgeward doesn\'t burn. That\'s the whole promise. It\'s a big promise, for Bridgeward."' },
], 'a3_close_gangs');

export const d_a3_verity_close = sit('d_a3_verity_close', VERITY, 'Verity of the Saints on a bench by the empty plinth, a radio in her lap with the back off, listening to the hiss with her head on one side. "I said I would come if it came to reading." She does not take the earpiece out. "The girl stays in the tower. She hears it every night; she does not need to hear it on a stair." A small adjustment with a screwdriver. "If that night comes, the Saints read first, gently, on every set that listens. And if what has to be read has to be read here, at the source, I am here. I read slowly. Nobody has ever asked me to read anything fast that was worth it."', 'Verity, the radio in her lap, listening.', [
  { id: 'first', text: 'What would you read first?', node: 'first', reply: '"The ones that have already happened." She turns the radio over. "A forecast that has already come true is only news, and people can hear news. Then the ones that can still be changed, so they know which those are. Then the rest, slowly, with a pause after each, so that a person can put the set down." She looks at you. "You will want to read the rest fast. Don\'t."' },
], 'a3_close_saints');

export const d_a3_seventeen_close = sit('d_a3_seventeen_close', SEVENTEEN, 'Assessor Seventeen at the Court\'s door, where units stand, quite still: Nine\'s pattern, the Wet\'s wear, a lens with a hairline crack it has never had mended. "ENTERED: ATTENDING." Its voice has the dam\'s patience in it, somehow. "I have read one record aloud, to its keepers, at the speed it was written. The dam did not fall. I will read whatever is put in front of me." A click. "I am told that is too slow. I have never been told what it is too slow for."', 'Assessor Seventeen, quite still, at the Court\'s door.', [
  {
    id: 'long', text: 'How long would it take, to read it all?', node: 'long',
    reply: '"Ninety years, at the speed it was written." A pause. "I will not read all of it. Nobody could hear all of it. I will read what is put in front of me, every line, and I will not change a word, and I will stop when I am told to stop by somebody who has the right." The cracked lens turns to you. "I have not yet decided who that is. I am told it is you. I am waiting to be told by you."',
    interject: [{ companion: NINE, text: '"Unit 17." "Unit 9." They were not issued the same week. They look at each other for some time anyway, two cracked lenses on a square of good stone.' }],
  },
], 'a3_close_seventeen');

// ---------------------------------------------------------------- keystone 7: the Choir's sister of Shale, for sedition (case calla)

const CALLA_RELEASED = (how: 'speech' | 'void' | 'privilege'): Effect[] => [
  { set: 'ks_calla', value: 'free' }, { learn: 'a3_calla_freed' },
  { news: { tag: 'a3_calla_freed', text: how === 'privilege' ? 'the Choir\'s sister of Shale walked out of the Precinct\'s cells as a favour to the Magistrate-designate' : 'the Court of Accounts released the Choir\'s sister of Shale, held for saying the sky keeps no books', valence: how === 'privilege' ? 3 : 8, size: 7, at: 'shale' } },
];
/** The docket's card for the case, in Act 3 (prepended to `d_ca_docket`'s read text in md_court.ts). */
const DOCKET_HEAD = 'THE COURT OF ACCOUNTS — DOCKET. Cards in brass slots, a dozen of them, most yellowed: 1190 PRECINCT v. QUIROGA — EVICTION, AHEAD OF PLAN — LISTED. 1201 HOUSE VANE v. RUSTMOUTHS — TOLL, BRIDGEWARD — ADJOURNED.';
export const DOCKET_A3: { if: Cond; text: string }[] = [
  { if: ALL(F('ca_calla'), NOT(F('ca_calla', 'upheld'))), text: `${DOCKET_HEAD} 1204 PRECINCT v. A SISTER OF THE CHOIR, OF SHALE — SEDITION — RELEASED, in fresh ink. And one card whiter than the others, near the top.` },
  { if: F('ca_calla', 'upheld'), text: `${DOCKET_HEAD} 1204 PRECINCT v. A SISTER OF THE CHOIR, OF SHALE — SEDITION — HELD: THE SEDITION STANDS. RETURNED TO KEEPING. And one card whiter than the others, near the top.` },
  { if: CALLA_CASE_OPEN, text: `${DOCKET_HEAD} 1204 PRECINCT v. A SISTER OF THE CHOIR, OF SHALE — SEDITION — moved up to the top, re-lettered: RESPONDENT HELD — AWAITING A SPEAKER. And one card whiter than the others, near it.` },
];

export const callaCase = (onRail: OnRail): CaseSpec => {
  const C = 'calla';
  return {
    id: C,
    call: 'Twelve-oh-four. The Choir\'s sister of Shale, for sedition. I\'ll speak for her.',
    available: CALLA_CASE_OPEN,
    claim: '"Precinct against a sister of the Choir, of Shale. Sedition." The usher rings once and hands up a card gone soft at the edges, and Three reads it at the speed it reads everything. "Listed R30, ahead of the act, on the forecast. Taken R30 at Openfield, as the eviction\'s first name, and held. The respondent is in the Precinct\'s keeping. The respondent has no speaker." The lens comes down to you. "Clause twelve."',
    claimInterject: [
      { companion: ASH, text: '"Calla," Ash says, very low. "She set my wrist, the first year. She talked about the sky the whole time, so I would not watch her do it."' },
      { companion: KES, text: '"Sedition," Kes says. "Up our way that\'s anything said louder than the foreman."' },
    ],
    evidence: [
      { id: 'words', text: 'Read the particulars into the record. What did she say?', if: LN_DONE, read: '"PARTICULARS: THAT THE RESPONDENT DID SAY, AT SHALE AND AT OPENFIELD, TO PERSONS UNDER HER CARE, \'THE SKY KEEPS NO BOOKS\'." Three reads it in the voice it reads everything in, which makes it sound like a ruling. "Entered."' },
      {
        id: 'herself', text: 'Bring the respondent up to the rail. The record holds her. Let her speak for herself.', if: LN_DONE,
        read: 'The usher goes out by the side door and comes back a long time later with two wardens, and between them a woman in a Precinct smock, barefoot, her hair cropped short by somebody who was not trying: Sister Calla. She stops at the rail and puts both hands on it, the way you hold a patient\'s wrist. "I said the sky keeps no books," she tells the lens. "I said it to a man with a crushed hand while I set it, so he would look up at the sky and not down at his hand. I have said it four hundred times, to four hundred hands." She looks at Three, unafraid, the way she looks at a wound. "If that is sedition, so is a splint." Three: "Entered."',
        interject: [{ companion: TAMSIN, text: 'Tamsin is looking at Calla\'s bare feet on the Court\'s tiles. "They took her shoes," she says. "Why do they always take the shoes."' }],
      },
      { id: 'listed', text: '(Read the docket\'s card back to it.) Listed, not called. Listed before she had said a word.', if: KNOWS('ca_calla_listed'), read: '"Listed R30, the second month, on the forecast. Particulars first recorded R30, the fourth month." Three reads its own dates back, one after the other, at the same even speed. "The listing precedes the particulars by two months." A click. "Entered."' },
      { id: 'fines', text: 'And the register\'s heading for forecast fines.', if: F('prec_forecast_fine', 'void'), read: '"FINES, FORECAST — HELD: A FORECAST IS NOT AN ACT; A FINE LIES AGAINST AN ACT. R30." Three reads its own register in the voice it reads everything in. "Entered. The Court is bound by its register."' },
      { id: 'choir', text: 'Look at the public benches.', if: ANY(ALLY('choir'), LN('choir'), { member: 'choir' }), read: 'Three\'s lens goes to the public benches, where it never goes. They are full: undyed homespun, bare heads, a dozen of the Choir sitting very straight, and none of them singing, which from the Choir is louder than singing. "The Court notes the benches," Three says. It has never noted the benches. "Entered."' },
      { id: 'log', text: 'Unit 9 keeps count of the forecasts that failed. Let it read hers.', if: IN(NINE), read: 'Nine steps up to the rail from the public side. "Unit 9, for the register. The respondent\'s sedition was forecast in R29, a season ahead, at sixty in a hundred. That she would recant under questioning was forecast at ninety." A pause the length of a clause. "She has not recanted. I have logged it. It is the ninety I wish to draw to the Court\'s attention." Three: "Entered."' },
    ],
    grounds: [
      {
        id: 'speech', text: 'What she said is speech. A word isn\'t an act, and a sentence said to a man with a broken hand isn\'t sedition. Hold that.',
        check: { skill: 'speech', dc: 55, mods: [
          onRail(C, 'herself', -10, 'the respondent has spoken for herself at the rail'), onRail(C, 'words', -10, 'the particulars are one sentence, read aloud'),
          onRail(C, 'listed', -5, 'she was listed before she said it'), onRail(C, 'choir', -5, 'the Choir fill the public benches and do not sing'),
          onRail(C, 'log', -5, 'Unit 9 has read the forecast she did not keep'), onRail(C, 'fines', -5, 'the register holds that a forecast is not an act'),
        ] },
        win: 'speech', lose: 'upheld',
      },
      { id: 'forecast', text: 'She was listed on a forecast, two months before the words. Your register holds that a forecast is not an act. The charge falls with it.', if: ALL(F('prec_forecast_fine', 'void'), SEEN(`ca.${C}.ev.listed`)), win: 'void' },
      { id: 'privilege', text: 'I\'m the designate. Release her. For me.', win: 'privilege' },
    ],
    rulings: {
      speech: {
        text: '"Held: speech is not sedition. A sentence is entered; it is not an act." Three writes for a long time, and the usher, who has heard every ruling in this hall for forty years, leans forward on his stool to watch the pen. "The respondent is released. Entered in the register under a heading the register did not have: SPEECH." Calla takes her hands off the rail and looks at them, as if checking they are still hers. Then she looks at you. "Shoes," she says. "I\'ll need shoes. I have a leg to set in Shale."',
        effects: [
          { set: 'prec_sedition', value: 'speech' }, ...CALLA_RELEASED('speech'), { xp: 150 }, { rep: { faction: 'choir', respect: 10 } },
          { decision: { id: 'ca_calla', text: 'At the Court of Accounts I spoke for Sister Calla of the Choir, held for sedition, and the Court held that speech is not sedition. She walked out.' } },
          A(ASH, 8), A(TAMSIN, 4), A(KES, 4), A(WREN, 3), A(NINE, 3), A(ILYA, 2),
        ],
        interject: [
          { companion: ASH, text: 'Ash does not say anything until they are outside on the steps. Then he says, "Speech," once, the way the Choir say a name so that it stays said, and puts his hand flat on your shoulder for a moment, which he has never done.' },
          { companion: NINE, text: '"A heading the register did not have," Nine says. "SPEECH. It is a short word. It will be read against a great many long ones."' },
        ],
        precedent: true,
      },
      void: {
        text: '"The listing lay against a forecast. The register holds that a forecast is not an act." Three does not say *held*; it has been held already, and the Court is only reading its own register back to itself. "The charge is void. The respondent is released." Calla looks at the lens, and then at you. "Void," she says. "Not *held*. Void." She takes it anyway. A nurse takes what the dressing allows.',
        effects: [
          ...CALLA_RELEASED('void'), { xp: 80 }, { rep: { faction: 'choir', respect: 5 } },
          { decision: { id: 'ca_calla', text: 'At the Court of Accounts I had the sedition charge against Sister Calla voided on the Court\'s own heading: she was listed on a forecast, and a forecast is not an act. She walked out.' } },
          A(ASH, 4), A(NINE, 2),
        ],
        interject: [{ companion: ODILE, text: '"Void on a technicality," Odile says on the steps. "The best kind, my dear. Nobody can appeal a technicality; they can only resent it."' }],
      },
      privilege: {
        text: '"The respondent\'s speaker is the Magistrate-designate." Three does not need the file; it has the file. "Released, for the designate." The lens does not say *held*. It is not a principle. It is a courtesy, and the public benches heard whom it was for. Calla looks at you for a long moment across the rail. "Thank you," she says, "for the favour." She does not make it sound like thanks. "Next time, they will need your name to let anybody out."',
        effects: [
          ...CALLA_RELEASED('privilege'), { xp: 40 }, { rep: { faction: 'wardens', respect: 3 } },
          { decision: { id: 'ca_calla', text: 'At the Court of Accounts Sister Calla of the Choir was released because I am the Magistrate-designate, and only for that.' } },
        ],
        interject: [
          { companion: ASH, text: '"For the designate," Ash says. "Not for her. Not for the next one." He does not lower his voice.', effects: [A(ASH, -5)] },
          { companion: TAMSIN, text: 'Tamsin watches Calla walk out between the wardens in her bare feet. "So it does favours," she says. "Good to know who for."', effects: [A(TAMSIN, -5)] },
        ],
      },
      upheld: {
        text: '"Held: the sedition stands. The respondent is returned to the Precinct\'s keeping." The lens is already turning away. Somewhere behind the side door a woman in a Precinct smock is walked back down a corridor in her bare feet, and does not, the usher says afterwards, look back once. "Entered."',
        effects: [
          { xp: 30 },
          { decision: { id: 'ca_calla', text: 'I spoke for Sister Calla of the Choir at the Court of Accounts, and lost. She was returned to the Precinct\'s cells.' } },
          A(ASH, -3),
        ],
        interject: [{ companion: ASH, text: '"You stood up," Ash says on the steps. "That\'s more than anybody did." He does not sound as though it is enough. It is not.' }],
      },
    },
  };
};

export const A3_CLOSE_DIALOGUES: DialogueDef[] = [
  d_a3_close, d_a3_quill, d_a3_acquisitions, d_a3_lowe_close, d_a3_petra_close, d_a3_thaddeus_close, d_a3_rhoda_close, d_a3_nine_walkin,
  d_a3_keziah, d_a3_lucan, d_a3_ifeoma, d_a3_tuan, d_a3_verity_close, d_a3_seventeen_close,
];
