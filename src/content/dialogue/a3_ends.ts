import type { DialogueDef, NodeDef, OptionDef, PassiveDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  ADA_LATE, ALLY, AMENDS_FULL, ASH, ASH_REFUSED, CALLA_KEPT, CLAUSES, CRATES_BLADE, CRATES_FIGHTING, ENDED, HANDLE_IN_PACK, ILYA, IN, KES,
  KESSLER_LATE, LOWE_DEAD, LOWE_LETS_PASS, MAREN_LATE, NINE, NINE_CONSCIENCE, ODILE, ON_STEPS, PETRA_DEAD, RESERVE_UNDER_PEN,
  RAFE_WIRES, REYES, SARR_ALIVE, SASH_WORN, SIGN_FRIENDLY, SKY_BURNING, SKY_FIGHTING, SKY_GUARDS_DOWN, SKY_HARD, SKY_HELD, TAMSIN, THAD_CRATES,
  VANE_LATE, VASHA_EXECUTIONER, VAULT_FIGHTING, VAULT_WARDENS_DOWN, WITH_YOU, WREN, WREN_ROPE_LATE, WREN_ROPE_OPEN,
} from '../world/a3_conds';

/**
 * The five ends played out (B6r, beat 21d): what happens after the choice at the reading desk under the Spire (B6q's `done_<act>`,
 * whose "(Go on.)" opens one of these), until the epilogue (`d_a3_epilogue`, B6s–B6v) is opened. One tree per end:
 * - `d_a3_end_plan`: the chair worn (A1: the first sheet, Tamsin and Ilya walking out, the stack, the column's lead saluting for
 *   the first time, the morning's schedules) or refused (A2: up the stair, the lens turning over the close to a docker's child).
 * - `d_a3_end_unwritten`: Nine's one plea at the core's door; the act (the charge, the coupling, or fire, by `a3_down_how`); the
 *   Ledger's last words, which are a clause; the city dark; the stair wardens coming down: Lowe lets the party by (only if he
 *   stood his column down and trusts the player), the couriers' drop (Stealth), hands up (the clause has nothing in it about the
 *   player), or the fight (`a3_vault_fight`; md_vault's wardens and its after-trigger); the close under the first stars.
 * - `d_a3_end_concern`: the paper signed slowly, read back; Wren, Kes (and Tamsin, if the reserve goes with it) walking out; the
 *   Concern's people down the shaft with chalk; on the close at night, the Unwritten's blade for the courier (talk, the Concern's
 *   guns, the fight on md_spire, or let him burn a courtesy copy), or nobody, if the blade is spent.
 * - `d_a3_end_opensky`: the switch's handle sent west if nobody holds the hill; the reading by whoever reads (MOTHER's replies
 *   first, then the twelve, then everyone's, the player's own line among them); the Ledger's one line; the close at dawn at the
 *   night's price (`ep_sky`: held, a quiet close; hard, a man with a knife and his own line; burning, a house's men, fought, held
 *   off by the wardens, or talked off).
 * - `d_a3_end_amendment`: Three brings the register down; the clauses written on the fourth step in the open (one to three, from
 *   the player's own rulings; struck out and rewritten freely until the register is closed); "Agreed."; read back; Tamsin walks
 *   away if the reserve is left under the pen.
 * Each tree is a list of beats (`beats()`): its start list resumes at the first beat still due, so a climax left, saved or fought
 * picks up where it stood; every "(Go on.)" is the same list. Nothing here waits on a clock (the hours the scenes name are
 * durations the player's own choice starts), nothing resolves unasked, and every beat that has not happened yet can be left with
 * "(Not yet.)" and nothing changed. Each end's last option sets `a3_climax_done` and opens the epilogue. Story notes:
 * story/B6_NOTES_SECRET.md §4.3, §8 B6r and "As built" → B6r.
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const SEEN = (id: string): Cond => ({ seen: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const DECIDE = (id: string, text: string): Effect => ({ decision: { id, text } });
const P = (label: string, ifc: Cond, text: string): PassiveDef => ({ if: ifc, label, text });

const VOICE = 'npc_ar_voice', THREE = 'npc_ar_01', LOWE = 'npc_md_01', THAD = 'npc_a3_u2', VERITY = 'npc_bw_04';
const EPILOGUE: Effect = { event: 'dialogue', data: { tree: 'd_a3_epilogue', name: 'Afterwards' } };
/** The last option of every end: the climax is over, and the epilogue opens (B6s: it reads `a3_end`, `a3_sash`, the clauses). */
const AFTER = (id: string): OptionDef => ({ id, text: '(Afterwards.)', exit: true, effects: [{ set: 'a3_climax_done' }, EPILOGUE] });
const reopen = (tree: string, name: string): Effect => ({ event: 'dialogue', data: { tree, name } });
const UP_TO_CLOSE: Effect = { event: 'goto', data: { location: 'md_spire', spawn: 'from_vault' } };
const STEPS_SPAWN: Effect = { event: 'goto', data: { location: 'md_spire', spawn: 'steps' } };
const NOT_YET = (id: string, text = '(Not yet.)'): OptionDef => ({ id, text, exit: true });
/** The hour the Spire's floors are empty (B6m's shot-firer: "don't do it with people under it"); the epilogue's "a little after ten". */
const AT_TEN: Cond = { hour: { from: 22, to: 23 } };

interface Beat { node: string; when?: Cond }
/** A climax as beats in order. A beat is due while its condition holds and no earlier beat's does (each beat's own effects make
 * its condition false); the last has none. The list is the tree's start (a climax left, saved or fought resumes at the first beat
 * still due) and every "(Go on.)" (`on`). */
function beats(tree: string, list: Beat[]) {
  const due = (i: number): Cond => ALL(...(list[i].when ? [list[i].when!] : []), ...list.slice(0, i).filter((b) => b.when).map((b) => NOT(b.when!)));
  return {
    start: list.map((b, i) => ({ if: due(i), node: b.node })),
    on: (from: string, text: Text = '(Go on.)', into: Record<string, Effect[]> = {}): OptionDef[] =>
      list.map((b, i) => ({ id: `${tree}.${from}>${b.node}`, text, if: due(i), next: b.node, ...(into[b.node] ? { effects: into[b.node] } : {}) })),
  };
}
/** The start of every end's tree: a guard for the wrong end, then the epilogue again once the climax is over. */
const GUARD = (end: string): { if: Cond; node: string }[] => [{ if: NOT(ENDED(end as never)), node: 'none' }, { if: F('a3_climax_done'), node: 'after' }];
const NONE: NodeDef = { speaker: 'narrator', text: 'Nothing here is waiting for you.', options: [{ text: '(Leave it.)', exit: true }] };
const AFTER_NODE = (id: string): NodeDef => ({ speaker: 'narrator', text: 'That is how it went that night.', options: [AFTER(id)] });

// ================================================================ A — the Plan (d_a3_end_plan)

/** The open lines on the list, signed in the stack (§5's twelve, fulfilled on schedule under the chair). */
const SIGNED: PassiveDef[] = [
  P('signed', ADA_LATE, '"VEY, ADA — RESIGNS; SHALE CONTRACTED." Your name under it.'),
  P('signed', KESSLER_LATE, '"KESSLER — KILLED BY KADE." Your name under it.'),
  P('signed', VASHA_EXECUTIONER, '"KADE, VASHA — EXECUTIONER." Your name under it.'),
  P('signed', WREN_ROPE_LATE, '"CALLOWAY, WREN — HANGED; THE BRIDGEWARD RAID. R31." Your name under it.'),
  P('signed', CALLA_KEPT, '"CALLA, SISTER — IMPRISONED; SEDITION." Your name under it.'),
  P('signed', SARR_ALIVE, '"SARR, IMELDA — TREASURER." Your name under it.'),
  P('signed', VANE_LATE, '"VANE, CELESTINE — HOUSE VANE RISES." Your name under it.'),
  P('signed', MAREN_LATE, '"OKAFOR, MAREN — STRIKE BROKEN; HANGED (THE CONCERN)." Your name under it.'),
];

const PLAN = 'd_a3_end_plan';
const A1_BEATS = beats(`${PLAN}.a1`, [
  { node: 'p_first', when: ALL(SASH_WORN, NOT(F('a3_signed'))) },
  { node: 'p_ilya', when: ALL(SASH_WORN, IN(ILYA)) },
  { node: 'p_stack', when: ALL(SASH_WORN, NOT(F('a3_stacked'))) },
  { node: 'p_lowe', when: ALL(SASH_WORN, NOT(F('a3_saluted'))) },
  { node: 'p_end', when: SASH_WORN },
]);
const A2_BEATS = beats(`${PLAN}.a2`, [
  { node: 'w_stair', when: ALL(NOT(SASH_WORN), NOT(F('a3_walked_up'))) },
  { node: 'w_close', when: ALL(NOT(SASH_WORN), NOT(F('a3_child'))) },
  { node: 'w_end', when: NOT(SASH_WORN) },
]);
const TAM_UNDER_PEN: Cond = ALL(IN(TAMSIN), RESERVE_UNDER_PEN);
const SIGN_RESERVE = 'Under the Spire, at the reading desk, the first paper I signed as Magistrate was the city\'s fourth order: Reserve 9, relocated.';
const SIGN_WATER = 'Under the Spire, at the reading desk, the first paper I signed as Magistrate was the Sink\'s spring diversion.';

const PLAN_NODES: Record<string, NodeDef> = {
  none: NONE,
  after: AFTER_NODE('end.plan.again'),
  // A1: the chair
  p_first: {
    speaker: 'narrator',
    text: [
      { if: RESERVE_UNDER_PEN, text: `The first sheet is the one you were told it would be. RESERVE 9 (THE MOUTH) — RELOCATION TO PRECINCT SUPPLY — BY FORCE IF NON-COMPLIANT — EXECUTION ON THE DESIGNATE'S ATTENDANCE — THE FIRST ACT OF THE CHAIR, and under it a ruled line for the Magistrate's name. The second page is the names, sixty of them in two columns in the city's even hand: Ines and Pell and Bram and the rest, every voice you heard through the Grille as a child. At the foot of the second column there is room for one more. Nothing is written in it. "Read it," the Ledger says. "Then sign."` },
      { text: `The first sheet is water. SPRING DIVERSION — THE SINK — R30 — AS SCHEDULED, and under it the Precinct's drains street by street, and a ruled line for the Magistrate's name. It has been carried out every spring for thirty years with nobody's name on it. Whatever was going to be first under this pen, the door at Knock saw to it; this is only what comes next. "Read it," the Ledger says. "Then sign."` },
    ],
    again: 'The first sheet, the ruled line, the pen.',
    interject: [
      { companion: NINE, if: NINE_CONSCIENCE, text: 'Nine reads the sheet aloud, all of it, the clause number too, in the voice it keeps for the record. It does not say anything else.' },
      { companion: KES, text: 'Kes watches your hand, not the paper. "Go on," she says. "I said I\'d be here. I\'m here."' },
    ],
    options: [
      { id: 'p.pen', text: '(Pick up the pen.)', if: TAM_UNDER_PEN, next: 'p_tamsin' },
      { id: 'p.sign', text: '(Sign it.)', if: NOT(TAM_UNDER_PEN), next: 'p_signed' },
      { id: 'p.notyet', text: '(Put the pen down. Not tonight.)', next: 'p_wait' },
    ],
  },
  p_wait: {
    speaker: VOICE,
    text: '"Then it will be the first sheet under your pen tomorrow," the Ledger says, "and the morning after that." A pause with nothing in it. "I have waited ninety years for a signature. A night is not long."',
    options: [{ id: 'p.wait.go', text: '(Step back from the desk.)', exit: true }],
  },
  p_tamsin: {
    speaker: 'narrator',
    effects: [{ leave: TAMSIN }, { set: 'a3_tam_walked' }],
    text: [
      { if: F('a3_tamsin_word'), text: `Tamsin reads it over your shoulder, both pages, the way she read everything through the Grille: to the end, in case the end was different. It isn't. You gave her your word at the fire, and she doesn't remind you of it. She puts the sheet back square on the oak with one finger, where it was, and walks down off the dais and along the aisle between the racks to the stair, not fast, and goes up it. She doesn't look back down. The note in the racks follows her up, as level as ever.` },
      { if: F('tam_romance', 'together'), text: `Tamsin reads it over your shoulder, both pages, the way she read everything through the Grille: to the end, in case the end was different. It isn't. Her hand is on the dais rail beside yours for a moment, an inch away, and then it isn't. She walks down off the dais and along the aisle between the racks to the stair, not fast, and goes up it. She doesn't say anything. She doesn't look back down.` },
      { text: `Tamsin reads it over your shoulder, both pages, the way she read everything through the Grille: to the end, in case the end was different. It isn't. She puts the sheet back square on the oak with one finger, where it was, and walks down off the dais and along the aisle between the racks to the stair, not fast, and goes up it. She doesn't say anything. She doesn't look back down. The note in the racks follows her up, as level as ever.` },
    ],
    again: 'The stair, and nobody on it.',
    options: [
      { id: 'p.tam.name', text: '(Say her name.)', once: true, next: 'p_tamsin_name' },
      { id: 'p.tam.sign', text: '(Sign it.)', next: 'p_signed' },
      { id: 'p.tam.notyet', text: '(Put the pen down. Not tonight.)', next: 'p_wait' },
    ],
  },
  p_tamsin_name: {
    speaker: 'narrator',
    text: 'She stops on the fourth stair with her back to you, for about as long as it takes to count three. Then she goes on up.',
    again: 'The stair, and nobody on it.',
    options: [{ id: 'p.tamn.sign', text: '(Sign it.)', next: 'p_signed' }, { id: 'p.tamn.notyet', text: '(Put the pen down. Not tonight.)', next: 'p_wait' }],
  },
  p_signed: {
    speaker: VOICE,
    text: [
      { if: RESERVE_UNDER_PEN, text: 'You sign: your name, in your own hand, on the ruled line under the city\'s type. The pen does not catch. "Entered," the Ledger says, from everywhere, and nothing in its voice has changed. "Thank you, Magistrate. The column will be on the toll road by morning. Its captain will be told that the designate has attended." A pause with nothing in it. "You read it first. Nobody before you did."' },
      { text: 'You sign: your name, in your own hand, on the ruled line under the city\'s type. The pen does not catch. "Entered," the Ledger says, from everywhere, and nothing in its voice has changed. "Thank you, Magistrate." A pause with nothing in it. "You read it first. Nobody before you did."' },
    ],
    effects: [{ set: 'a3_signed' }],
    again: 'The first sheet, signed, face down on the oak.',
    interject: [{ companion: ODILE, text: '"Well," Odile says quietly. "Now we know what the hand looks like." She means yours.' }],
    options: [
      { id: 'p.signed.r', text: '(Turn it over, and take the next.)', if: RESERVE_UNDER_PEN, effects: [DECIDE('a3_first_paper', SIGN_RESERVE)], next: 'p_signed_on' },
      { id: 'p.signed.w', text: '(Turn it over, and take the next.)', if: NOT(RESERVE_UNDER_PEN), effects: [DECIDE('a3_first_paper', SIGN_WATER)], next: 'p_signed_on' },
    ],
  },
  p_signed_on: {
    speaker: 'narrator',
    text: 'The next sheet is already squared on the stack where the first one was. There are a great many of them.',
    again: 'The stack.',
    options: A1_BEATS.on('p_signed_on'),
  },
  p_ilya: {
    speaker: 'narrator',
    effects: [{ leave: ILYA }],
    text: [
      { if: F('a3_ilya_word'), text: 'Ilya has stood at the foot of the dais the whole time with his rifle slung, counting something under his breath. He stops. "Right," he says. You gave him your word at the fire that you would not sit in this, and he counted that too; he doesn\'t say so. He goes back along the aisle to the stair and up it, and you can hear him counting the steps out loud all the way to the top, forty-three, and then the steel door, and then nothing.' },
      { if: F('ilya_rom', 'committed'), text: 'Ilya has stood at the foot of the dais the whole time with his rifle slung, counting something under his breath. He stops. "Right," he says, which has never once meant yes. At the stair\'s foot he stops again, as if he might turn round, and doesn\'t. You hear him count the steps out loud all the way to the top, forty-three, and then the steel door, and then nothing.' },
      { text: 'Ilya has stood at the foot of the dais the whole time with his rifle slung, counting something under his breath. He stops. "Right," he says, the way he says it to everything; it has never once meant yes. He doesn\'t look at you. The Plan sitting in this chair timed a raid up a wash eleven springs ago, to the night. He goes back along the aisle to the stair and up it, counting the steps out loud, forty-three, and then the steel door, and then nothing.' },
    ],
    again: 'The stair, empty.',
    options: A1_BEATS.on('p_ilya'),
  },
  p_stack: {
    speaker: 'narrator',
    effects: [{ set: 'a3_stacked' }],
    text: [
      { if: ALL(IN(NINE), NINE_CONSCIENCE), text: 'The stack goes down a sheet at a time under the green lamp. Water. Clinic hours. Tolls on the Line, with the halts named in full. A census of the Sallow, district by district, and Shale\'s well under Shale\'s name. Nine stands at your left hand by the teleprinter and reads every sheet aloud before you sign it, all of it, the clause numbers too. It does not try to stop you. Twice it reads a line a second time, slowly, and waits until you have signed, and enters something in its own book. Some of the sheets have names on them. You know the names.' },
      { if: IN(NINE), text: 'The stack goes down a sheet at a time under the green lamp. Water. Clinic hours. Tolls on the Line, with the halts named in full. A census of the Sallow, district by district, and Shale\'s well under Shale\'s name. Nine stands at your left hand and takes each sheet as you sign it, squares it, and says the clause it was made under; once, near three, it says something about the drains under the Precinct\'s east gate that you do not follow and it does not explain. Some of the sheets have names on them. You know the names.' },
      { text: 'The stack goes down a sheet at a time under the green lamp. Water. Clinic hours. Tolls on the Line, with the halts named in full. A census of the Sallow, district by district, and Shale\'s well under Shale\'s name. Every one of them was carried out for thirty years whether anybody signed it or not; now somebody does. Some of them have names on them. You know the names.' },
    ],
    passives: SIGNED,
    again: 'The stack, smaller. The lamp.',
    options: A1_BEATS.on('p_stack'),
  },
  p_lowe: {
    speaker: 'narrator',
    effects: [{ set: 'a3_saluted' }],
    text: [
      { if: ALL(NOT(LOWE_DEAD), RESERVE_UNDER_PEN), text: 'Some time after four there are boots on the stair: one man\'s, slow. Captain Idris Lowe comes down into the hall with his cap under his arm, pressed, and walks the length of the aisle without looking at the racks, and stops at the foot of the dais. He has never saluted anybody in the time you have known him; the schedule does not need it, he says. He salutes now: all of it, the Precinct\'s, heels and hand. "Magistrate." He does not say anything about Knock. He will go with the car himself. He has always gone with the car himself.' },
      { if: NOT(LOWE_DEAD), text: 'Some time after four there are boots on the stair: one man\'s, slow. Captain Idris Lowe comes down into the hall with his cap under his arm, pressed, and walks the length of the aisle without looking at the racks, and stops at the foot of the dais. He has never saluted anybody in the time you have known him; the schedule does not need it, he says. He salutes now: all of it, the Precinct\'s, heels and hand. "Magistrate." He looks at the stack, and then at you. "The schedule holds," he says. "I wish it didn\'t, some days. I\'ll keep it anyway."' },
      { if: NOT({ dead: REYES }), text: 'Some time after four there are boots on the stair. Sergeant Paloma Reyes comes down into the hall in Lowe\'s cap, which still does not fit her, and stops at the foot of the dais, and salutes: all of it, the Precinct\'s. "Magistrate." Then, because nobody else will say it: "He\'d have wanted to be the one who came down. He\'d have hated it."' },
      { text: 'Some time after four a warden comes down the stair with the morning\'s first schedules in a satchel, and stops at the foot of the dais when she sees somebody in the chair, and doesn\'t know what to do, and salutes.' },
    ],
    again: 'The salute, given.',
    // the hours until the morning's schedules pass on the way into the last beat (a node's own effects would run again on a reopen)
    options: [...A1_BEATS.on('p_lowe', '(Return it.)', { p_end: [{ until: 6 }] }), ...A1_BEATS.on('p_lowe.n', '(Nod, and go on signing.)', { p_end: [{ until: 6 }] })],
  },
  p_end: {
    speaker: 'narrator',
    text: 'At six the morning\'s first schedules come down the couriers\' shaft into the hopper in the drop room, and fall into their trays in the order they were sent. The date on them is today\'s. The name typed under every ruled line is yours. You go and fetch them yourself, because nobody else is going to, and the note in the racks goes on over your head exactly as it did before you came down the stair, and as it will tomorrow.',
    again: 'The trays. Your name on every sheet.',
    options: [AFTER('end.plan.a1')],
  },

  // A2: the chair left empty
  w_stair: {
    speaker: 'narrator',
    text: 'Forty-three steps of poured concrete, warmer at the bottom than the top. The note comes up them behind you, as level as it was going down; it does not get quieter as you climb, only further away. At the top the steel door stands open on the close, and through it, the close\'s own light and the sound of a great many people not going home.',
    again: 'The stair, and the door at the top of it.',
    interject: [
      { companion: WREN, text: 'Wren goes up ahead of you, the way she goes up anything, and waits at the top with her back to the door so she can see you come.' },
      { companion: NINE, text: '"I have never gone up this stair," Nine says. "Only things come up it. Paper." It goes up it.' },
    ],
    options: [
      { id: 'w.out', text: '(Step out onto the close.)', exit: true, effects: [{ set: 'a3_walked_up' }, { time: 3 }, UP_TO_CLOSE, reopen(PLAN, 'The close')] },
      NOT_YET('w.notyet'),
    ],
  },
  w_close: {
    speaker: 'narrator',
    text: 'The steel door shuts behind you with a sound like a drawer closing, and the lettering is the same on this side: NO ENTRY — NO EXIT. The close has not gone home. It came to see a Magistrate and it is still waiting for one: clerks, labourers, the towers come down, the column at the foot of the steps. Three stands at the top of the steps with the sash over its arm and does not turn round. Above the great doors the lens turns in the lintel, slowly, the way a lighthouse turns, over the whole crowd; and stops. A young docker from Carrick, about your age, with her cap crushed in one fist, who walked up from the river to see this; and on her hip, held up to see over the wardens, a girl of six who is looking straight back up at the lens the way children look back at anything that looks at them. The lens clicks. The girl waves at it.',
    again: 'The lens over the doors, on the girl on her mother\'s hip.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin sees where the lens has stopped, and then she sees the girl. She doesn\'t say anything. She has been a child that something kept a file on.' },
      { companion: ASH, text: '"Let it carry its own weight," Ash says, very low. He is looking at the girl too. "That\'s what I said. Down there." He doesn\'t say it again.' },
    ],
    options: [
      { id: 'w.go', text: '(Go down through the crowd to them.)', effects: [{ set: 'a3_child', value: 'met' }], next: 'w_child' },
      { id: 'w.away', text: '(Go down the far side of the steps, and away, without looking back.)', effects: [{ set: 'a3_child', value: 'passed' }], next: 'w_away' },
      NOT_YET('w.close.wait', '(Stand by the steel door a while.)'),
    ],
  },
  w_child: {
    speaker: 'narrator',
    text: 'You go down through the crowd, and the crowd lets you, because it no longer knows who you are. The docker sees you coming and shifts the girl to her other hip. Up close there is rope-burn healing on both her palms, and the girl has her mother\'s heavy brows and a docker\'s cap of her own, too big, with a gull\'s feather in the band. "Efua," her mother says, "stop waving at the lamp." Then, to you, because you are looking: "She wanted to see a Magistrate. I told her there wasn\'t one yet."',
    again: 'The docker from Carrick, and Efua on her hip.',
    options: [
      { id: 'w.tell', text: 'There isn\'t. Take her home. Keep her off these steps.', next: 'w_tell' },
      { id: 'w.wave', text: '(Say nothing. Wave back at the girl.)', next: 'w_wave' },
    ],
  },
  w_tell: {
    speaker: 'narrator',
    effects: [{ learn: 'a3_child_told' }],
    text: '"It\'s a lamp, love," she says, and laughs; then she looks at your face and stops laughing. She doesn\'t ask. She looks up at the lens for a long moment, and at her daughter, and then she turns and carries the girl away across the close toward the lane that goes down to Carrick, not hurrying, the way you walk away from a dog you don\'t want to run from. Efua waves at the lens over her mother\'s shoulder all the way to the corner. It watches her all the way.',
    again: 'The corner, and nobody at it.',
    options: A2_BEATS.on('w_tell'),
  },
  w_wave: {
    speaker: 'narrator',
    text: 'You wave. Efua waves back, harder, delighted to have got two of them. Her mother looks at you the way you look at somebody who might be drunk, and smiles anyway, and takes her home down the lane to Carrick. You watch them to the corner. So does the lens.',
    again: 'The corner, and nobody at it.',
    options: A2_BEATS.on('w_wave'),
  },
  w_away: {
    speaker: 'narrator',
    text: 'You go down the far side of the steps, past the wardens at the foot of them, into the lane, and you do not look back. Behind you, over the doors, the lens clicks once more, for the record. You cannot possibly hear it from the lane. You hear it all the same.',
    again: 'The lane.',
    options: A2_BEATS.on('w_away'),
  },
  w_end: {
    speaker: 'narrator',
    text: [
      { if: IN(NINE), text: 'The lane south, the Precinct\'s gate, the Wall, and the road out of the city with nobody on it who knows your face. Nine walks beside you as far as the Wall and stops there, because its desk is on this side of it, and the drains. "The Plan will find another face," it says. "I am uneasy about that. I would like it on the record that I am uneasy." Then it goes back. It is a long way home. Nothing in the basin changes because you are walking it.' },
      { text: 'The lane south, the Precinct\'s gate, the Wall, and the road out of the city with nobody on it who knows your face. It is a long way home. Nothing in the basin changes because you are walking it, and that was the price, and you knew it when you paid.' },
    ],
    again: 'The road.',
    options: [AFTER('end.plan.a2')],
  },
};
export const d_a3_end_plan: DialogueDef = {
  id: PLAN, owner: 'narrator', nodes: PLAN_NODES,
  start: [...GUARD('plan'), ...A1_BEATS.start, ...A2_BEATS.start, { node: 'none' }],
};

// ================================================================ B — the core brought down (d_a3_end_unwritten)

const DOWN = 'd_a3_end_unwritten';
const B_BEATS = beats(DOWN, [
  { node: 'b_nine', when: IN(NINE) },
  { node: 'b_act', when: NOT(F('a3_down')) },
  { node: 'b_wardens', when: ALL(NOT(F('a3_vault_out')), NOT(F('a3_vault_fight'))) },
  { node: 'b_beaten', when: ALL(VAULT_FIGHTING, F('a3_vault_beaten')) },
  { node: 'b_fought', when: ALL(VAULT_FIGHTING, VAULT_WARDENS_DOWN) },
  { node: 'b_fighting', when: VAULT_FIGHTING },
  // out of the dark but not yet up the stair (a save taken in the vault after the way out was settled): the stair, and up it
  { node: 'b_stair', when: ALL(F('a3_vault_out'), NOT(F('a3_vault_up'))) },
  // the dark close is due until it is seen, and (the sash worn) until the sash is left on the top step: a save on the dark close
  // resumes there with the folding still to do
  { node: 'b_close', when: ANY(NOT(F('a3_dark')), ALL(SASH_WORN, NOT(F('a3_sash_left')))) },
  { node: 'b_nine_close', when: ALL(ON_STEPS('nine'), NOT(IN(NINE))) },
  { node: 'b_end' },
]);
/** Every way out of the dark goes up the stair to the close, and says so (`a3_vault_up`), so a save in between resumes on the stair. */
const UP_THE_STAIR: Effect[] = [{ set: 'a3_vault_up' }, UP_TO_CLOSE, reopen(DOWN, 'The close')];
const PETRA_FIRE: Cond = ALL(F('a3_unwritten', 'with_you'), NOT(PETRA_DEAD));
const JUNIPER_FIRE: Cond = ALL(F('a3_unwritten', 'with_you'), PETRA_DEAD);
const ASH_FIRE: Cond = ALL(NOT(F('a3_unwritten', 'with_you')), IN(ASH), ASH_REFUSED);
/** The act, done now at ten, or after waiting for ten (the Spire's floors empty): the same choice, the clock's duration added. */
function act(id: string, now: string, wait: string, means: Cond, extra: Effect[] = []): OptionDef[] {
  const done: Effect[] = [...extra, DECIDE('a3_down', 'Under the Spire I brought the Ledger\'s core down, and the city went dark.')];
  return [
    { id, text: now, if: ALL(means, AT_TEN), effects: [{ time: 10 }, ...done], next: 'b_last' },
    { id: `${id}.wait`, text: wait, if: ALL(means, NOT(AT_TEN)), effects: [{ until: 22 }, ...done], next: 'b_last' },
  ];
}
const LAST_WORDS = '"Clause two hundred and twelve," the Ledger says, from everywhere, level and unhurried, courteous as a clause. "Where the Ledger cannot schedule, the wardens shall keep the stair, and then the pumps, in that order. The Court shall sit at nine as before. And the people shall be told the hour." A pause with nothing in it. "It is ten o\'clock."';
const DOWN_DRILL = { skill: 'stealth' as const, dc: 45, mods: [
  { if: { knows: 'a3_vault_shaft' }, dc: -10, why: 'you looked up the shaft: the rungs, and the scuffs of whoever went up it fast' },
  { if: ANY({ knows: 'a3_drop_heard' }, { knows: 'ar_drop_heard' }), dc: -5, why: 'you know where it comes out' },
  { if: IN(WREN), dc: -5, why: 'Wren goes up first and talks you up it' },
  { if: F('a3_down_how', 'fire'), dc: 10, why: 'the smoke goes up the shaft before you' },
] };
const DARK_CITY = 'There is no lamp on any post on the close. The Precinct\'s windows are black, and the Crown\'s glass up on its terraces, and the canal, and every street you can see from the steps; people are coming out of their doors with candles, and holding their hands round the flames, and looking up. With every lamp in Meridian out there are stars over the close. Nobody under fifty in this city has seen them from here.';

const DOWN_NODES: Record<string, NodeDef> = {
  none: NONE,
  after: AFTER_NODE('end.down.again'),
  b_nine: {
    speaker: 'npc_md_nine',
    effects: [{ leave: NINE }, { set: 'nine_left', value: 'core' }, DECIDE('a3_nine_core', 'Under the Spire, at the core\'s door, Nine said the record\'s one plea and withdrew from me, with its grounds attached.')],
    text: [
      { if: F('a3_nine_word'), text: 'Nine does not come into the hall. It stops in the doorway between the drop room and the racks, where the tile ends and the floor plates begin, its hands at its sides and its cracked lens on you. "The record has one thing to say for itself," it says, "and I will say it once. A city is a thing that decides where its water goes. Without it the Precinct\'s drains fail within a year: the east gate first, then the low streets, then the Sink, which was never asked. That is the plea. It is entered." A pause. "You gave me your word at the fire. I have filed the breach. I did not underline it. I withdraw, with my grounds attached. I will not fight you. I will not help you." It goes up the stair at its own pace, and does not look back down.' },
      { text: 'Nine does not come into the hall. It stops in the doorway between the drop room and the racks, where the tile ends and the floor plates begin, its hands at its sides and its cracked lens on you. "The record has one thing to say for itself," it says, "and I will say it once. A city is a thing that decides where its water goes. Without it the Precinct\'s drains fail within a year: the east gate first, then the low streets, then the Sink, which was never asked. That is the plea. It is entered." A pause. "I withdraw, with my grounds attached. I will not fight you. I will not help you." It goes up the stair at its own pace, and does not look back down.' },
    ],
    again: 'The doorway, empty.',
    options: B_BEATS.on('b_nine', '(Let it go.)'),
  },
  b_act: {
    speaker: 'narrator',
    text: [
      { if: ALL(F('a3_down_how', 'charge'), F('a3_charge_how', 'shift'), RAFE_WIRES), text: 'The charge comes out of the sacking the way it went in, heavy as a sleeping child. You lay it where Rafe\'s hand-drawn diagram says, against the trunk\'s housing where the cable comes out of the rock, and pay the fuse back along the trench to the drop room\'s doorway. Rafe\'s fuse: ninety seconds if you walk, he said, and walk. And the other thing he said, at the trestle, with his hand flat on the case: whatever it\'s for, don\'t do it with people under it.' },
      { if: F('a3_down_how', 'charge'), text: 'The charge comes out of the sacking the way it went in, heavy as a sleeping child. You lay it against the trunk\'s housing where the cable comes out of the rock, the one place everything in the city comes back to, and pay the fuse back along the trench to the drop room\'s doorway. The Spire is over your head, ninety floors of it, and there are people in the catalogue until ten, and a porter at his desk.' },
      { if: F('a3_down_how', 'coupling'), text: 'You go along the cable trench to the trunk. Bram\'s page forty-one, in red, with a line round it that says don\'t: the first coupling, under load, and she never wakes. The wheel is cold for a moment and then it is not. It hums in your palms, the one note, and through it you can feel how much of the city is on the other side. It will take both hands and all your weight, and it will not go back. Above you the catalogue is open until ten.' },
      { if: PETRA_FIRE, text: 'Petra\'s people come down the stair with the oil in two cans each, carried the way you carry water so as not to spill it on the steps. Petra comes last. She looks at the racks for a long time, and at the desk, and at you. "Don\'t keep any of it," she says. "Not one sheet." They pour along both banks of racks and up the cable trench to the trunk, without hurry, as if they had always known they would. Then Petra holds the matches out to you. "At ten," she says. "When the tower\'s empty. We\'re not the city."' },
      { if: JUNIPER_FIRE, text: 'Juniper\'s people come down the stair with the oil in two cans each, carried the way you carry water so as not to spill it. Juniper comes last. "Petra would have known what to say," she says. "I only know what to do." They pour along both banks of racks and up the cable trench to the trunk, without hurry. Then she holds the matches out to you. "At ten," she says. "When the tower\'s empty."' },
      { if: ASH_FIRE, text: 'Ash goes through to the drop room and comes back with the trays of paper from under the hopper in his arms, years of slips nobody read, and lays them along the foot of the racks like kindling under a grate, the way the Unwritten taught him when he was twenty. He uses the oil from the desk lamp. He does it neatly. When it is laid he stands up and holds the matches out to you, not to himself. "Not me," he says. "Never first. You know that." Then: "Wait till the tower\'s empty. Ten."' },
      { text: 'A dozen of the Choir come down the stair with oil in cans, the ones who stood with you at Openfield, and pour it along both banks of racks without speaking, the way they do everything in the fields: together, and without hurry. When it is done the eldest of them holds the matches out to you. "Not before ten," she says. "When the tower\'s empty. We\'re not the city."' },
    ],
    again: 'The racks, humming. What you brought down here to do.',
    interject: [
      { companion: ODILE, text: '"Treasurer of nothing," Odile says, watching. "I did say." She does not look away.' },
      { companion: WREN, text: 'Wren has gone back to the foot of the stair, where she can hear the door. "When it goes," she says, "they\'ll come down. That\'s the job. I\'d come down."' },
      { companion: KES, text: '"Everything\'s on that," Kes says, of the trunk. "Pumps. Lamps. Gates." She swallows. "I said it was a neck."' },
    ],
    options: [
      ...act('b.do.fuse', '(Light the fuse, and walk.)', '(Wait for ten, when the tower is empty. Then light the fuse, and walk.)', F('a3_down_how', 'charge'), [{ take: 'k_a3_charge' }]),
      ...act('b.do.wheel', '(Put your weight on the wheel.)', '(Wait for ten, when the tower is empty. Then put your weight on the wheel.)', F('a3_down_how', 'coupling')),
      ...act('b.do.match', '(Strike the match yourself.)', '(Wait for ten, when the tower is empty. Then strike the match yourself.)', F('a3_down_how', 'fire')),
      ...act('b.do.give', '(Give the matches back.)', '(Wait for ten, when the tower is empty. Then give the matches back.)', ALL(F('a3_down_how', 'fire'), NOT(ASH_FIRE))),
      NOT_YET('b.notyet'),
    ],
  },
  b_last: {
    speaker: VOICE,
    effects: [{ set: 'a3_down' }, { xp: 200 }],
    text: [
      { if: F('a3_down_how', 'charge'), text: `${LAST_WORDS} Then the charge goes. The floor comes up through the drop room's wall into your back, and the sound is too big to be a sound, and when you can hear again the note is gone.` },
      { if: F('a3_down_how', 'coupling'), text: `${LAST_WORDS} Then you put your weight on the wheel, and the first coupling opens under load with a crack like a tooth coming out, and the note stops. It does not fade. It stops.` },
      { text: `${LAST_WORDS} Then the match. The oil takes it along the aisle faster than you can walk, both banks at once, and the racks begin to tick in the heat like a stove, and somewhere inside them the note goes up half a tone, and holds, and stops.` },
    ],
    again: 'The dark. The racks, ticking as they cool.',
    options: [{ id: 'b.last.on', text: '(Go on.)', next: 'b_dark' }],
  },
  b_dark: {
    speaker: 'narrator',
    text: 'The lamps along the racks go out row by row toward the desk, green and amber, and the desk\'s green lamp last. Your own lamp is the only light under the Spire. You do not need anybody to tell you that it is not only the hall that has gone dark. Then, a long way up the stair: the steel door. Boots, four sets, coming down in step, and the swing of a lamp on the walls of the stair, because the clause says stair, and it was written ninety years ago, and nobody has unwritten it.',
    again: 'Boots on the stair. A lamp.',
    options: B_BEATS.on('b_dark'),
  },
  b_wardens: {
    speaker: 'narrator',
    text: [
      { if: LOWE_LETS_PASS, text: 'The Spire\'s stair wardens come down into the drop room with their rifles slung and their faces bare in their own lamplight, the grey with the white piping: four of them, to keep the stair. At the head of them, with the lamp, is Captain Lowe.' },
      { if: NOT(LOWE_DEAD), text: 'The Spire\'s stair wardens come down into the drop room with their rifles slung and their faces bare in their own lamplight, the grey with the white piping: four of them, to keep the stair. Somewhere above them on the close you can hear Captain Lowe\'s voice, giving the order the clause gives him, as if it were any other.' },
      { text: 'The Spire\'s stair wardens come down into the drop room with their rifles slung and their faces bare in their own lamplight, the grey with the white piping: four of them, to keep the stair, because nobody has told them anything else and there is nobody left to.' },
    ],
    again: 'Four wardens at the foot of the stair, and the shaft\'s rungs behind you.',
    options: [
      { id: 'b.lowe', text: '(Walk to the foot of the stair, where Lowe\'s lamp can see your face.)', if: LOWE_LETS_PASS, next: 'b_lowe' },
      { id: 'b.drop', text: '(Back into the drop room, and up the rungs in the dark.)', check: DOWN_DRILL, next: 'b_drop', fail: 'b_drop_seen' },
      { id: 'b.hands', text: '(Put your hands where their lamps can see them.)', next: 'b_taken' },
      { id: 'b.draw', text: '(Draw.)', next: 'b_draw' },
      NOT_YET('b.wardens.wait', '(Stand still in the dark, for now.)'),
    ],
  },
  b_lowe: {
    speaker: 'narrator',
    effects: [{ set: 'a3_vault_out', value: 'lowe' }, { trust: { npc: LOWE, by: 5 } }, DECIDE('a3_vault_out', 'When the core was down, Captain Lowe came down the stair with the wardens, and stood aside, and let me go up past them.')],
    text: 'Lowe comes down the last of the stair with the lamp held up, and looks past you at the racks for a long time: the dark, the smell, the one note gone. Nobody behind him moves. "Stair," he says at last, to the wardens behind him, as if it were a word he had found in his pocket. "Then the pumps. In that order." He stands aside against the wall with the lamp, and so do they. As you pass him he says, without looking at you, "Mind the ninth step. It\'s worn." He does not say anything else.',
    again: 'Lowe against the wall, the lamp held up.',
    options: [{ id: 'b.lowe.up', text: '(Go up past them.)', exit: true, effects: UP_THE_STAIR }],
  },
  b_drop: {
    speaker: 'narrator',
    effects: [{ set: 'a3_vault_out', value: 'drop' }, DECIDE('a3_vault_out', 'When the core was down and the wardens came for the stair, I went up the couriers\' drop in the dark and out of the slot at the Spire\'s foot.')],
    text: [
      { if: F('a3_down_how', 'fire'), text: 'Forty metres of iron rungs, and the smoke going up the shaft with you like a hand in the small of your back, and your eyes shut because there is nothing to see. Third rung, thirtieth: you feel the scuffs of whoever went up here fast before you, and you know now why they went fast. At the top a letter\'s width of air that is not light any more, and a brass flap that opens outward, and the close.' },
      { text: 'Forty metres of iron rungs in the dark, with the wardens\' lamp swinging in the drop room below and not once looking up. Third rung, thirtieth: you feel the scuffs of whoever went up here fast before you, and you know now why they went fast. At the top a letter\'s width of air that is not light any more, and a brass flap that opens outward, and the close.' },
    ],
    again: 'The slot at the Spire\'s foot.',
    options: [{ id: 'b.drop.out', text: '(Out onto the close.)', exit: true, effects: UP_THE_STAIR }],
  },
  b_drop_seen: {
    speaker: 'narrator',
    text: 'Twelve rungs up, a lamp finds you. "Come down, please," a warden says from the drop room, quite politely. "The stair\'s ours. That includes this one."',
    again: 'A lamp on the rungs.',
    options: [
      { id: 'b.seen.hands', text: '(Come down, hands where the lamp is.)', next: 'b_taken' },
      { id: 'b.seen.draw', text: '(Drop, and draw.)', next: 'b_draw' },
    ],
  },
  b_taken: {
    speaker: 'narrator',
    effects: [{ set: 'a3_vault_out', value: 'taken' }, DECIDE('a3_vault_out', 'When the core was down I put my hands up for the Spire\'s wardens, and they took me up the stair, and found nothing in their orders about me.')],
    text: 'They take you up the stair by the arms, not roughly, a warden on each side and the lamps going ahead. Nobody speaks. At the top, two of them stay by the steel door.',
    again: 'The stair, a warden on each side.',
    options: [{ id: 'b.taken.up', text: '(Up, with them.)', exit: true, effects: UP_THE_STAIR }],
  },
  b_draw: {
    speaker: 'narrator',
    effects: [{ set: 'a3_vault_fight' }, { rep: { faction: 'wardens', respect: -15 } }, DECIDE('a3_vault_out', 'When the core was down and the Spire\'s wardens came down the stair to keep it, I fought them in the dark under the Spire.'), { event: 'combat' }],
    text: 'You draw. In the lamplight four wardens unsling their rifles in one movement, as they were drilled to, without hurry and without anger, because the clause says stair. "Stand down," the first of them says. You don\'t.',
    options: [{ id: 'b.draw.fight', text: '(Fight.)', exit: true }],
  },
  b_stair: {
    speaker: 'narrator',
    text: 'The stair up out of the dark, and the steel door open at the top of it.',
    options: [{ id: 'b.stair.up', text: '(Up the stair.)', exit: true, effects: UP_THE_STAIR }],
  },
  b_fighting: {
    speaker: 'narrator',
    text: 'The wardens are on the stair, and between you and it.',
    options: [{ id: 'b.fighting', text: '(Fight.)', exit: true, effects: [{ event: 'combat' }] }],
  },
  b_beaten: {
    speaker: 'narrator',
    effects: [{ set: 'a3_vault_out', value: 'taken' }],
    text: 'You come to on the stair with a warden\'s coat folded under your head and nothing in your hands. Somebody has bound the cut on your arm with a strip of the Spire\'s grey. They take you up the rest of the stair by the arms, not roughly, and nobody speaks.',
    again: 'The stair, a warden on each side.',
    options: [{ id: 'b.beaten.up', text: '(Up, with them.)', exit: true, effects: UP_THE_STAIR }],
  },
  b_fought: {
    speaker: 'narrator',
    effects: [{ set: 'a3_vault_out', value: 'fought' }, { xp: 100 }],
    text: 'Four wardens on the tile of the drop room, in the light of their own lamps, which go on burning where they fell. It is the only light left under the Spire. One of them is still holding the card the clause is printed on; you can read STAIR on it from where you stand.',
    again: 'The lamps on the tile. The stair.',
    options: [{ id: 'b.fought.up', text: '(Up the stair.)', exit: true, effects: UP_THE_STAIR }],
  },
  b_close: {
    speaker: 'narrator',
    effects: [{ set: 'a3_dark' }],
    text: [
      { if: F('a3_vault_out', 'taken'), text: `On the close it is darker than you have ever seen a city. ${DARK_CITY} The senior warden takes a card from her breast pocket and reads it by her own lamp, all of it, twice: the stair, the pumps, the Court at nine, the hour. She turns it over. Nothing on the back. "There\'s nothing on here about you," she says, and lets go of your arm. "Pumps," she says to the others, and they go at a run toward the Precinct, and leave you on the close in the dark.` },
      { if: F('a3_vault_out', 'lowe'), text: `Lowe comes up behind you with the lamp and stands on the close beside you, and for a while neither of you says anything. ${DARK_CITY} Then he sits down on the bottom step of the Spire with the lamp between his boots and his cap in his hands, as if his legs had decided it.` },
      { text: `On the close it is darker than you have ever seen a city. ${DARK_CITY}` },
    ],
    passives: [
      P('the foot of the steps', ALL(F('a3_blade', 'talked'), NOT({ dead: THAD })), 'Thaddeus, where he sat down to watch: he gets up, and looks at the dark city for a while, and walks into it.'),
      P('the close', F('a3_unwritten', 'with_you'), 'The Unwritten on the close light no lamps. They stand with their faces turned up.'),
      P('the close', ALL(NOT(F('a3_vault_out', 'lowe')), NOT(LOWE_DEAD)), 'Captain Lowe on the bottom step of the Spire with his cap in his hands, not giving any order at all.'),
    ],
    again: 'The dark close. The stars.',
    interject: [
      { companion: ASH, text: 'Ash looks up for a long time. "There," he says. That is all. He has waited his whole life to say it and it is one word.' },
      { companion: TAMSIN, text: 'Tamsin has her head back and her mouth open. "I didn\'t know there were that many," she says. "Nobody said there were that many."' },
      { companion: ILYA, text: 'Ilya starts counting them under his breath, and stops, and laughs once, and doesn\'t start again.' },
      { companion: KES, text: '"Lenses are dark," Kes says, very quietly, her hand at the back of her neck. "All of them. Up and down the Line." She sounds as if she does not know yet whether that is the best thing that has ever happened to her.' },
      { companion: WREN, text: '"Every lamp in the city," Wren says. "You\'d see a fire from the overpass tonight." She is already thinking about who will light one.' },
      { companion: ODILE, text: '"Well," Odile says, into the dark. "Tomorrow there will be nothing to sell. I shall have to learn to cook."' },
    ],
    options: [
      { id: 'b.sash', text: '(Take off the sash. Fold it. Leave it on the top step.)', if: SASH_WORN, next: 'b_sash' },
      ...B_BEATS.on('b_close').map((o) => ({ ...o, if: ALL(NOT(SASH_WORN), o.if!) })),
    ],
  },
  b_sash: {
    speaker: 'narrator',
    effects: [{ set: 'a3_sash_left' }, DECIDE('a3_sash_left', 'When the city went dark I took the Magistrate\'s sash off on the Spire\'s steps, and folded it, and left it on the top step.')],
    text: 'You take it off and fold it the way Three folded it, in thirds, the darned grey wool over the clasp, and leave it on the top step, where the photograph was made. The first act of the chair, and the last. Nobody on the close sees you do it. Nobody can see anything.',
    again: 'The sash, folded, on the top step.',
    options: B_BEATS.on('b_sash'),
  },
  b_nine_close: {
    speaker: 'npc_md_nine',
    effects: [{ set: 'nine_left', value: 'core' }, DECIDE('a3_nine_core', 'When the city went dark, Nine said the record\'s one plea to me on the Spire\'s steps and withdrew, with its grounds attached.')],
    text: 'Nine comes down the steps from where it waited, a darker shape in the dark, and stops two steps above you. "The record has one thing to say for itself," it says, "and I will say it once. A city is a thing that decides where its water goes. Without it the Precinct\'s drains fail within a year: the east gate first, then the low streets, then the Sink, which was never asked. It is entered." A pause. "I withdraw, with my grounds attached. I will not fight you. I will not help you." It goes down the lane toward the Precinct\'s east gate, where the drains begin.',
    again: 'The lane, and Nine gone down it.',
    options: B_BEATS.on('b_nine_close', '(Let it go.)'),
  },
  b_end: {
    speaker: 'narrator',
    text: 'Somewhere under the Precinct a pump runs down and stops, and then another, a long way off, like somebody breathing out. In Bridgeward people are lighting fires in the street to see by. The couriers\' slot at the foot of the steps is still open, and nobody will post anything in it tonight. You sit down on the Spire\'s steps in the cold to wait for morning, because there is nothing left in the city that can tell you what the morning is for.',
    again: 'The steps, the cold, the stars.',
    options: [AFTER('end.down')],
  },
};
export const d_a3_end_unwritten: DialogueDef = { id: DOWN, owner: 'narrator', nodes: DOWN_NODES, start: [...GUARD('unwritten'), ...B_BEATS.start, { node: 'none' }] };

// ================================================================ C — the core signed over (d_a3_end_concern)

const SELL = 'd_a3_end_concern';
const C_BEATS = beats(SELL, [
  { node: 'c_pen', when: NOT(F('a3_sold')) },
  { node: 'c_tamsin', when: ALL(IN(TAMSIN), RESERVE_UNDER_PEN) },
  { node: 'c_wren', when: IN(WREN) },
  { node: 'c_kes', when: IN(KES) },
  { node: 'c_shaft', when: NOT(F('a3_sold_up')) },
  { node: 'c_wren_gone', when: ALL(WITH_YOU('wren'), NOT(IN(WREN))) },
  { node: 'c_kes_gone', when: ALL(WITH_YOU('kes'), NOT(IN(KES))) },
  { node: 'c_fought', when: ALL(CRATES_FIGHTING, { dead: THAD_CRATES }) },
  { node: 'c_fighting', when: CRATES_FIGHTING },
  { node: 'c_blade', when: ALL(CRATES_BLADE, NOT(F('a3_crates'))) },
  { node: 'c_quiet', when: NOT(F('a3_crates')) },
  { node: 'c_end' },
]);
const UW_EAST: Cond = ALL(F('a3_unwritten', 'with_you'), NOT(PETRA_DEAD));
const TALK_BLADE = { skill: 'speech' as const, dc: 50, mods: [
  { if: F('a3_blade', 'talked'), dc: -10, why: 'he sat down on the steps once already, at your word' },
  { if: IN(ASH), dc: -5, why: 'Ash says his name' },
  { if: UW_EAST, dc: 10, why: 'Petra is watching him go and does not call him back' },
  { if: SIGN_FRIENDLY, dc: 10, why: 'you told the steps what you would sign first, and then signed this' },
] };

const SELL_NODES: Record<string, NodeDef> = {
  none: NONE,
  after: AFTER_NODE('end.sell.again'),
  c_pen: {
    speaker: 'narrator',
    text: [
      { if: F('a3_terms_from', 'sarr'), text: 'Three pages, and the Ledger\'s hand on none of them: the Concern\'s type, smaller and blacker, with clause numbers that go up in tenths, and the Grand Factor\'s green ink in the margins where the floor\'s tenth is written in. THE CORE, AND THE SCHEDULES ATTACHING. CONSIDERATION ALREADY PAID. A line for the Magistrate\'s name, and beside it a small square printed for a seal, which the Concern has already filled. "Slowly," the Ledger says. "If you would."' },
      { text: 'Three pages, and the Ledger\'s hand on none of them: the Concern\'s type, smaller and blacker, with clause numbers that go up in tenths, initialled at the foot of every page. THE CORE, AND THE SCHEDULES ATTACHING. CONSIDERATION ALREADY PAID. A line for the Magistrate\'s name, and beside it a small square printed for a seal, which the Concern has already filled. "Slowly," the Ledger says. "If you would."' },
    ],
    again: 'The paper on the oak. The pen.',
    options: [
      { id: 'c.sign', text: '(Sign it, slowly.)', next: 'c_signed' },
      { id: 'c.notyet', text: '(Put the pen down. Not yet.)', exit: true },
    ],
  },
  c_signed: {
    speaker: VOICE,
    effects: [{ set: 'a3_sold' }, { take: 'k_a3_transfer' }, DECIDE('a3_sold', 'Under the Spire I signed the city\'s core over to the Concern, slowly, as it asked, and it read my name back to me as I wrote it.')],
    text: 'You sign it slowly. The note in the racks does not change while you do it, but the Ledger reads your name back to you as you write it, one letter at a time, level, as if it were taking dictation; and when you have finished it says your whole name once, and then: "TRANSFERRED, AS SCHEDULED BY OTHERS." It says it the way it says everything. Then it says nothing at all, and goes on saying nothing.',
    again: 'The paper, signed. The racks, humming, saying nothing.',
    options: C_BEATS.on('c_signed'),
  },
  c_tamsin: {
    speaker: 'narrator',
    effects: [{ leave: TAMSIN }, { set: 'a3_tam_walked' }],
    text: 'Tamsin was standing between you and the stair. She isn\'t now. She read the second page over your shoulder while you signed, where the schedules attaching are listed by number, and the fourth order is the fourth line, and she went up the stair before the ink was dry. You did not hear her go. She meant you not to.',
    again: 'The stair, and nobody between you and it.',
    options: C_BEATS.on('c_tamsin'),
  },
  c_wren: {
    speaker: 'narrator',
    effects: [{ leave: WREN }, { set: 'wren_left', value: 'concern' }, A(WREN, -40)],
    text: [
      { if: F('a3_wren_word'), text: 'Wren doesn\'t wait for the ink to dry. She said it at the fire, and she doesn\'t say it again. She pulls her goggles down over her eyes, which she never does indoors, and goes up the stair two at a time without looking at the racks or at you, the way she leaves a camp gone bad: early, without a scene, before anybody can ask her to stay.' },
      { if: F('wren_rom', 'committed'), text: 'Wren doesn\'t wait for the ink to dry. She pulls her goggles down over her eyes, which she never does indoors, and goes up the stair two at a time without looking at the racks or at you. At the turn of the stair she stops for exactly one breath, as if she has dropped something. Then she hasn\'t.' },
      { text: 'Wren doesn\'t wait for the ink to dry. She pulls her goggles down over her eyes, which she never does indoors, and goes up the stair two at a time without looking at the racks or at you, the way she leaves a camp gone bad: early, without a scene, before anybody can ask her to stay.' },
    ],
    again: 'The stair. Her boots on it, gone.',
    options: [{ id: 'c.wren.call', text: '(Wren—)', once: true, next: 'c_wren_call' }, ...C_BEATS.on('c_wren', '(Let her go.)')],
  },
  c_wren_call: {
    speaker: 'npc_rd_03',
    text: '"Don\'t," she says, from somewhere up the stair, not loudly. That is the last thing she says to you.',
    again: 'The stair.',
    options: C_BEATS.on('c_wren_call'),
  },
  c_kes: {
    speaker: 'npc_hs_01',
    effects: [{ leave: KES }, { set: 'kes_left', value: 'concern' }, A(KES, -40)],
    text: [
      { if: F('kes_rom', 'committed'), text: 'Kes gets up off the edge of the dais and stands in front of you, close, and looks at your face for a while as if she is learning it for later. Her hand is at the back of her neck, where the port is, and she is very calm, which is the worst thing she does. "You handed them the eyes," she says. "They already had the leash." She goes along the aisle to the stair, and the racks\' green lamps go over her one row at a time like a hand counting.' },
      { text: 'Kes gets up off the edge of the dais. Her hand is at the back of her neck, where the port is, and she is very calm, which is the worst thing she does. "You handed them the eyes," she says. "They already had the leash." She doesn\'t wait to hear what you have to say to that. She goes along the aisle to the stair, and the racks\' green lamps go over her one row at a time like a hand counting.' },
    ],
    again: 'The aisle, empty.',
    options: C_BEATS.on('c_kes', '(Let her go.)'),
  },
  c_shaft: {
    speaker: 'narrator',
    text: 'Soft lamps come down the couriers\' shaft into the drop room, and gloves, and people in the Concern\'s quiet grey with chalk in their pockets, who say good evening and mean it, and begin. They chalk a number on every rack in the order it went in, and measure the trunk, and photograph the couplings with a lens on a stand. Nobody has told them what any of it is. They do not need to know. The guild\'s wagons are on the close for the crates.',
    passives: [
      P('Odile', IN(ODILE), '"That is a cost," Odile says, watching the chalk go on. "I want you to know that I know it is." She stays.'),
      P('Nine', IN(NINE), 'Nine watches a woman chalk a number on the rack its own file is kept in. "I am a schedule attaching," it says. It does not leave. It has nowhere it would be let go to.'),
      P('Ash', IN(ASH), 'Ash has his hand flat on the nearest rack again, the way he puts it on a grave, until the woman with the chalk waits politely for him to take it off. He takes it off.'),
      P('Ilya', IN(ILYA), 'Ilya counts the racks as they are numbered, out loud, under the numbers, to see if they lose count. They don\'t.'),
    ],
    again: 'Chalk on the racks. Soft lamps.',
    options: [
      { id: 'c.up', text: '(Go up to the close.)', exit: true, effects: [{ set: 'a3_sold_up' }, { until: 23 }, UP_TO_CLOSE, reopen(SELL, 'The close')] },
      NOT_YET('c.stay', '(Stay down here a while.)'),
    ],
  },
  c_wren_gone: {
    speaker: 'narrator',
    effects: [{ set: 'wren_left', value: 'concern' }],
    text: 'Wren\'s place on the steps is empty. She was there when you went down. She saw the soft lamps go down the couriers\' slot at the Spire\'s foot, a warden says, and knew what they were for, and pulled her goggles down and went south down the lane without a word to anybody.',
    again: 'Her step, empty.',
    options: C_BEATS.on('c_wren_gone'),
  },
  c_kes_gone: {
    speaker: 'narrator',
    effects: [{ set: 'kes_left', value: 'concern' }],
    text: 'Kes\'s place on the steps is empty too. She went when the soft lamps went down the slot. She said something to the warden at the foot of the steps on her way, and he will not repeat it; he only says she had her hand at the back of her neck.',
    again: 'Her step, empty.',
    options: C_BEATS.on('c_kes_gone'),
  },
  c_blade: {
    speaker: 'narrator',
    text: [
      { if: UW_EAST, text: 'The close at night under its lamps, and the guild\'s wagons drawn up with their canvas off, waiting for crates. By the first wagon the Concern\'s officer has a copy of the paper in a folder. At the mouth of the lane Selma Ruud, the courier who brought you the fourth order, waits with a satchel chained to her wrist: the signed paper, to go by hand to the Board\'s car at the Precinct gate, because paper goes by hand. Petra Mason is on the close with her people, where they waited for the core to come down. "You brought us east for this," she says, not loudly. Then Thaddeus walks out of them toward the courier with the machete held low along his leg, and Petra watches him go and does not call him back.' },
      { if: F('a3_blade', 'talked'), text: 'The close at night under its lamps, and the guild\'s wagons drawn up with their canvas off, waiting for crates. By the first wagon the Concern\'s officer has a copy of the paper in a folder. At the mouth of the lane Selma Ruud, the courier who brought you the fourth order, waits with a satchel chained to her wrist: the signed paper, to go by hand to the Board\'s car at the Precinct gate. Thaddeus gets up from the foot of the steps, where he sat down to watch at your word, and walks toward the courier with the machete held low along his leg. Not running. He has never needed to run.' },
      { text: 'The close at night under its lamps, and the guild\'s wagons drawn up with their canvas off, waiting for crates. By the first wagon the Concern\'s officer has a copy of the paper in a folder. At the mouth of the lane Selma Ruud, the courier who brought you the fourth order, waits with a satchel chained to her wrist: the signed paper, to go by hand to the Board\'s car at the Precinct gate. Thaddeus comes out of the dark at the far side of the close and walks toward her with the machete held low along his leg. Not running. He has never needed to run.' },
    ],
    again: 'Thaddeus, walking. The courier at the mouth of the lane.',
    interject: [{ companion: ASH, text: '"Brother," Ash says, not loudly enough for Thaddeus to hear. He doesn\'t move. He has never fired first.' }],
    options: [
      { id: 'c.talk', text: '(Get between them, hands open. Talk to him.)', check: TALK_BLADE, next: 'c_talked', fail: 'c_shot' },
      { id: 'c.guns', text: '(Shout for the Concern\'s men.)', next: 'c_shot' },
      { id: 'c.draw', text: '(Draw on him.)', next: 'c_draw' },
      { id: 'c.let', text: '(Stand back, and let him.)', next: 'c_let' },
    ],
  },
  c_talked: {
    speaker: THAD,
    effects: [{ set: 'a3_crates', value: 'talked' }, DECIDE('a3_crates', 'On the close the night the core was sold, the Unwritten sent their blade for the courier with the paper, and I stood between them and talked him down.')],
    text: [
      { if: UW_EAST, text: 'You get there first, and stand between the blade and the satchel with your hands open, and say it: that the paper is a copy; that the Ledger has entered it already; that the woman holding it carries what she is given and does not read it, and he knows that; that if he wants somebody to answer for it, it is you, and you are here. He stops a stride off. Behind him Petra says his name, once. He looks at the courier, who has not moved, and back at you. "Then it\'s on you," he says. "All of it. Not on her." He puts the machete through his belt and walks back to Petra\'s people, and none of them looks at you again.' },
      { text: 'You get there first, and stand between the blade and the satchel with your hands open, and say it: that the paper is a copy; that the Ledger has entered it already; that the woman holding it carries what she is given and does not read it, and he knows that; that if he wants somebody to answer for it, it is you, and you are here. He stops a stride off. He looks at the courier, who has not moved, and back at you. "Then it\'s on you," he says. "All of it. Not on her." He puts the machete through his belt and walks away into the dark the way he came.' },
    ],
    again: 'The courier, and the satchel, and nobody between.',
    options: C_BEATS.on('c_talked'),
  },
  c_shot: {
    speaker: 'narrator',
    effects: [{ set: 'a3_crates', value: 'guards' }, { rep: { faction: 'choir', respect: -10 } }, A(ASH, -10), DECIDE('a3_crates', 'On the close the night the core was sold, the Unwritten sent their blade for the courier with the paper, and the Concern\'s men shot him on the stones.')],
    text: [
      { if: SEEN('c.talk'), text: 'He goes past you as if you were a lamp post. The Concern\'s men are quicker than anybody on the close expected, because that is what they are for: two shots, flat and close together. Thaddeus goes down on the stones three strides short of the courier, on his face, the machete under him, and does not move again. Nobody screams; it was too quick for that. The officer checks the time. Selma Ruud looks at the satchel on her wrist, and then at him, and then at you.' },
      { text: 'You shout, and the Concern\'s men are quicker than anybody on the close expected, because that is what they are for: two shots, flat and close together. Thaddeus goes down on the stones three strides short of the courier, on his face, the machete under him, and does not move again. Nobody screams; it was too quick for that. The officer checks the time. Selma Ruud looks at the satchel on her wrist, and then at him, and then at you.' },
    ],
    passives: [P('the close', UW_EAST, 'Petra Mason walks out across the stones to him and kneels, and turns him over so his face is to the sky, and stays there.')],
    again: 'Thaddeus on the stones.',
    options: C_BEATS.on('c_shot'),
  },
  c_let: {
    speaker: 'narrator',
    effects: [{ set: 'a3_crates', value: 'let' }, DECIDE('a3_crates', 'On the close the night the core was sold, the Unwritten sent their blade for the courier with the paper, and I stood back and let him burn it. It changed nothing.')],
    text: 'You stand back. He reaches the courier, and she holds her arm out to him with the satchel on its chain, because she carries what she is given and does not fight for it, and he cuts the chain an inch from her wrist with one blow that does not touch her. He opens the satchel on the stones and burns the paper in it with a match, page by page, in front of the whole close. The officer watches it burn and does not seem troubled. "The Ledger has entered the transfer," the officer says. "The paper was a courtesy." Thaddeus looks at the ash, and then at you. "Then it\'s all on you," he says, and walks away into the dark.',
    again: 'Ash on the stones, and a cut chain.',
    options: C_BEATS.on('c_let'),
  },
  c_draw: {
    speaker: 'narrator',
    effects: [{ set: 'a3_crates_fight' }, { rep: { faction: 'choir', respect: -10 } }, DECIDE('a3_crates', 'On the close the night the core was sold, the Unwritten sent their blade for the courier with the paper, and I fought him there, under the lamps.'), { event: 'combat' }],
    text: 'You draw. The close goes back from the two of you all at once, wagons and wardens and the officer with the folder, and Selma Ruud flat against the wall at the mouth of the lane with the satchel held to her chest. Thaddeus turns from her to you without hurrying. That is what he came for, after all: somebody to answer for it.',
    options: [{ id: 'c.draw.fight', text: '(Fight.)', exit: true }],
  },
  c_fighting: {
    speaker: 'narrator',
    text: 'Thaddeus, on the close, between you and the courier.',
    options: [{ id: 'c.fighting', text: '(Fight.)', exit: true, effects: [{ event: 'combat' }] }],
  },
  c_fought: {
    speaker: 'narrator',
    effects: [{ set: 'a3_crates', value: 'fought' }, { xp: 100 }],
    text: 'Thaddeus lies on the stones under the lamp, his face bare to it, the machete a yard from his open hand. The Unwritten keep no likeness, and there is nobody on the close who will draw him. The officer comes over to you with the folder held flat. "Thank you," he says. It is the worst thing anybody has said to you this year.',
    again: 'Thaddeus under the lamp.',
    options: C_BEATS.on('c_fought'),
  },
  c_quiet: {
    speaker: 'narrator',
    effects: [{ set: 'a3_crates', value: 'none' }],
    text: 'The close at night under its lamps, and the guild\'s wagons drawn up with their canvas off, waiting for crates. At the mouth of the lane Selma Ruud, the courier who brought you the fourth order, waits with a satchel chained to her wrist: the signed paper, to go by hand to the Board\'s car at the Precinct gate. Nobody comes out of the dark for it. Whoever the Unwritten had left to send, they have spent. The officer nods, and the courier goes down the lane at her walking pace. "Signed for," she says as she passes you. "Carried."',
    again: 'The lane, and the courier gone down it.',
    options: C_BEATS.on('c_quiet'),
  },
  c_end: {
    speaker: 'narrator',
    text: 'All night the crates come up the couriers\' slot on ropes, one rack to a crate, numbered in chalk, and go onto the wagons under canvas twelve to a wagon. Toward morning the note under the close goes thin, the way a sound goes thin when the room it is in is emptied, and you can no longer tell whether you hear it or remember it. The Board\'s car will come at noon. The photographers are already on the close, setting up their stands at the foot of the steps.',
    again: 'The wagons under canvas. The stands at the foot of the steps.',
    options: [AFTER('end.sell')],
  },
};
export const d_a3_end_concern: DialogueDef = { id: SELL, owner: 'narrator', nodes: SELL_NODES, start: [...GUARD('concern'), ...C_BEATS.start, { node: 'none' }] };

// ================================================================ D — every forecast read out (d_a3_end_opensky)

const READ = 'd_a3_end_opensky';
const D_BEATS = beats(READ, [
  { node: 'd_handle', when: ALL(HANDLE_IN_PACK, NOT(F('a3_handle_sent'))) },
  { node: 'd_first', when: NOT(F('a3_reading')) },
  { node: 'd_twelve', when: NOT(F('a3_read_twelve')) },
  { node: 'd_all', when: NOT(F('a3_read_all')) },
  { node: 'd_plan', when: NOT(F('a3_read_up')) },
  { node: 'd_fought', when: ALL(SKY_FIGHTING, ANY(SKY_GUARDS_DOWN, F('a3_sky_beaten'))) },
  { node: 'd_fighting', when: SKY_FIGHTING },
  { node: 'd_close', when: NOT(F('ep_sky')) },
  { node: 'd_end' },
]);
const READER_IS = (r: string): Cond => F('a3_reader', r);
const KEEPER: PassiveDef[] = [
  P('Signal Hill', F('a3_mast_keeper', 'hollow'), 'Thanh throws the knife switch at the mast\'s foot when the first word comes up the wire, and the hill speaks wide.'),
  P('Signal Hill', F('a3_mast_keeper', 'wheel'), 'Dario Oduya throws the knife switch at the mast\'s foot when the first word comes up the wire, and the hill speaks wide.'),
  P('Signal Hill', ALL(F('a3_mast_keeper', 'knock'), F('a3_mast_handle', 'amos')), 'Amos Crofts of Knock throws the knife switch at the mast\'s foot when the first word comes up the wire, and the hill speaks wide.'),
  P('Signal Hill', F('a3_handle_sent', 'courier'), 'Selma Ruud, four days up the toll road with a handle in her satchel, hangs it on a cabinet with KNOCK chalked on it and throws a switch she does not understand, at the hour her paper said, and the hill speaks wide.'),
  P('Signal Hill', F('a3_handle_sent', 'wheel'), 'The Wheel\'s rider, three days up the Line with a handle wrapped in a shirt, throws the switch at the hour he was given, and the hill speaks wide.'),
];
const WARNED_HEARD: PassiveDef[] = [
  P('your letters', { flag: 'a3_warned', gte: 1 }, 'Some of them heard their lines first in your own hand, by post, days ago. Tonight they hear them again with everybody.'),
  P('Wren', ALL(IN(WREN), WREN_ROPE_OPEN), 'Wren listens to her own line come out of the speaker, R31, the Bridgeward toll booth, and does not move at all. Then she pushes her goggles up so she can see properly.'),
];

const READ_NODES: Record<string, NodeDef> = {
  none: NONE,
  after: AFTER_NODE('end.read.again'),
  d_handle: {
    speaker: 'narrator',
    text: 'The key on its cord carries to every station on the relay, the Ledger said, and at Signal Hill the hill speaks wide when its switch is thrown. The switch\'s handle is in your pack. You took it off its cabinet yourself, so that nobody else could throw it; there is nobody on the hill to throw it now. It is four days by the toll road to the Sallow, or three for somebody who knows the Line.',
    again: 'The handle in your pack. The key on its cord.',
    options: [
      { id: 'd.handle.courier', text: '(Send it west by the courier, by hand, with the hour written down.)', next: 'd_sent', effects: [{ set: 'a3_handle_sent', value: 'courier' }, { time: 4 * 1440 }] },
      { id: 'd.handle.wheel', text: '(Give it to the Wheel\'s rider on the close, with the hour written down.)', if: ALLY('wheel'), next: 'd_sent', effects: [{ set: 'a3_handle_sent', value: 'wheel' }, { time: 3 * 1440 }] },
      NOT_YET('d.handle.wait'),
    ],
  },
  d_sent: {
    speaker: 'narrator',
    text: [
      { if: F('a3_handle_sent', 'courier'), text: 'Selma Ruud comes down the stair when she is sent for, and takes the handle wrapped in a page of the Ledger\'s own paper, and the slip with the hour on it, and does not ask what either is. "Signed for," she says. "Carried." Then there is nothing to do but wait four days, and the reader waits at the desk with the cloth still on the teleprinter, and you wait with them.' },
      { text: 'The Wheel\'s rider takes the handle and the slip with the hour on it and is gone up the lane before you have finished telling him what it is. Then there is nothing to do but wait three days, and the reader waits at the desk with the cloth still on the teleprinter, and you wait with them.' },
    ],
    again: 'The days, waiting.',
    options: D_BEATS.on('d_sent'),
  },
  d_first: {
    speaker: 'narrator',
    effects: [{ set: 'a3_reading' }, { until: 20 }],
    text: [
      { if: READER_IS('nine'), text: 'At eight, when the relay\'s stations are manned, Nine turns the brass key with two fingers, as if it were a clause, and the first sheet comes up out of the slot beside the desk in the city\'s even hand. Nine reads it the way it reads everything: every word, the numbers in full. The first is MOTHER\'s. RESERVE 9 (THE MOUTH). CONTINUITY RESERVE. SIXTY RESIDENTS, SCORED: HEALTH, LITERACY, ORDER. HELD TO RESEED THE CITY. Then the three orders to send them, and under each, the caretaker\'s reply: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. That goes out first, to every radio in the Reach: what a reserve was for.' },
      { if: ALL(READER_IS('verity'), { dead: VERITY }), text: 'At eight, when the relay\'s stations are manned, the Saints\' boy turns the brass key with both hands and reads into it the way Verity taught him to read on the hiss band at night: low and slow, as if somebody listening might be asleep and should not be woken badly. The first sheet is MOTHER\'s. RESERVE 9 (THE MOUTH). CONTINUITY RESERVE. SIXTY RESIDENTS, SCORED: HEALTH, LITERACY, ORDER. HELD TO RESEED THE CITY. Then the three orders, and under each the caretaker\'s reply: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. That goes out first, to every radio in the Reach: what a reserve was for.' },
      { if: READER_IS('verity'), text: 'At eight, when the relay\'s stations are manned, Verity puts her receiver down on the desk with the volume all the way down and reads into the key the way the Saints read on the hiss band at night: low and slow, as if somebody listening might be asleep and should not be woken badly. The first sheet is MOTHER\'s. RESERVE 9 (THE MOUTH). CONTINUITY RESERVE. SIXTY RESIDENTS, SCORED: HEALTH, LITERACY, ORDER. HELD TO RESEED THE CITY. Then the three orders, and under each the caretaker\'s reply: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. That goes out first, to every radio in the Reach: what a reserve was for.' },
      { if: READER_IS('seventeen'), text: 'At eight, when the relay\'s stations are manned, Assessor Seventeen enters, aloud, that it is attending, and turns the key, and reads. The first sheet is MOTHER\'s. RESERVE 9 (THE MOUTH). CONTINUITY RESERVE. SIXTY RESIDENTS, SCORED: HEALTH, LITERACY, ORDER. HELD TO RESEED THE CITY. Then the three orders, and under each the caretaker\'s reply: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. That goes out first, to every radio in the Reach: what a reserve was for.' },
      { text: 'At eight, when the relay\'s stations are manned, you take the cloth off the teleprinter and turn the brass key, and somewhere up the relay, station by station across the basin, a lamp goes from amber to green. The first sheet comes up out of the slot in the city\'s even hand and you read it into the key, aloud, because that is how the relay takes it. MOTHER\'s. RESERVE 9 (THE MOUTH). CONTINUITY RESERVE. SIXTY RESIDENTS, SCORED: HEALTH, LITERACY, ORDER. HELD TO RESEED THE CITY. Then the three orders, and under each the caretaker\'s reply: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. That goes out first, to every radio in the Reach: what a reserve was for.' },
    ],
    passives: KEEPER,
    again: 'The key, the sheets coming up out of the slot.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin hears MOTHER\'s replies go out, all three, and puts both hands over her mouth, and keeps them there.' },
      { companion: ODILE, text: '"A sealed sheet made worthless by daylight," Odile says, very softly, to nobody. She is smiling.' },
    ],
    options: D_BEATS.on('d_first'),
  },
  d_twelve: {
    speaker: 'narrator',
    effects: [{ set: 'a3_read_twelve' }],
    text: 'Then the twelve: the list under glass on landing ninety-one, every line of it, read out to the people it names and to everybody else at the same moment. Jonah Reese. Ada Vey. Kessler, and Vasha Kade. Wren Calloway. Sister Calla. Mason. Imelda Sarr. Ocho. Celestine Vane. Maren Okafor. The dead ones too, with the dates they were given and the dates they kept. And the twelfth line, which is the designate\'s: the steps, R49, the sash.',
    passives: WARNED_HEARD,
    again: 'The twelve, read.',
    options: D_BEATS.on('d_twelve'),
  },
  d_all: {
    speaker: 'narrator',
    effects: [{ set: 'a3_read_all' }, { until: 5 }],
    text: [
      { if: READER_IS('self'), text: 'Then everyone\'s. You read all night, until your voice is a scrape: every face in the Ledger\'s records nineteen years ahead, district by district. A clerk in the Precinct dismissed in R33, for a debt he does not have yet. A child in the Stacks dead of the cough at four. A man in the Crown poisoned at his own table in R40, and the brother who does it named. The futures the Exchange has bought for thirty years, out loud, for nothing. Near three in the morning you come to your own name, in your own voice: the steps, R49, the sash; and the line after that, which is the last one, and has a date in it. You read it exactly as you read the clerk\'s. Then you read the next.' },
      { text: 'Then everyone\'s, all night: every face in the Ledger\'s records nineteen years ahead, district by district. A clerk in the Precinct dismissed in R33, for a debt he does not have yet. A child in the Stacks dead of the cough at four. A man in the Crown poisoned at his own table in R40, and the brother who does it named. The futures the Exchange has bought for thirty years, out loud, for nothing. Near three in the morning the reader comes to your name, in the same voice as everybody\'s: the steps, R49, the sash; and the line after that, which is the last one, and has a date in it. The voice does not stop for it. It reads yours exactly as it read the clerk\'s.' },
    ],
    again: 'The night, read out. Your own line in it.',
    interject: [
      { companion: KES, text: 'Kes listens for her own name all night. It never comes: the hill never let the city see her. Near dawn she laughs, once, and wipes her face with the heel of her hand.' },
      { companion: ILYA, text: 'Ilya sits on the dais with his back against the desk and counts the lines as they go, and somewhere after two in the morning he stops counting and just listens.' },
      { companion: ASH, text: 'When Doria\'s name comes, Ash closes his eyes. He keeps them closed until the district is done.' },
    ],
    options: D_BEATS.on('d_all'),
  },
  d_plan: {
    speaker: VOICE,
    effects: [{ set: 'a3_read' }],
    text: 'Near five the last sheet comes up out of the slot, and it is blank, and the teleprinter stops. Up the relay the stations\' lamps go back to amber one by one. For a long time nothing in the hall says anything. Then the Ledger, from everywhere, level and unhurried, as courteous as a clause: "Then everyone will have to plan." It does not say anything else. Up the stair, the steel door is open, and the city comes down it. It is not quiet.',
    again: 'The blank sheet. The stair, and the city coming down it.',
    options: [
      { id: 'd.up', text: '(Go up.)', exit: true, effects: [{ set: 'a3_read_up' }, UP_TO_CLOSE, reopen(READ, 'The close')] },
      NOT_YET('d.stay', '(Not yet. Sit a while in the quiet.)'),
    ],
  },
  d_close: {
    speaker: 'narrator',
    text: [
      { if: SKY_HELD, text: 'Dawn on the close. There are lamps along it that nobody from the Precinct lit: the Choir\'s, in a line on the steps, singing the long one very low. The wardens at the foot have their rifles slung. People have come with their lines copied out on whatever they had, and stand about in the cold with them, reading them to each other; some are crying and some are arguing, and one old man is laughing so hard he has to sit down on the plinth. Nobody is hurting anybody. It was paid for in advance, by everybody you asked.' },
      { if: SKY_HARD, text: 'Dawn on the close, and the close is full, and nobody went home. People with their lines copied out on paper, on cloth, on the backs of their hands. There is blood on the stones by the empty plinth, not yours, and a woman sweeping sand over it. Then a man comes out of the crowd at the foot of the steps with a knife held down along his leg and a paper in his other hand, and he is looking at your face, and he knows it.' },
      { text: 'Dawn, of a kind. The light comes up brown, because Bridgeward is burning, and the Crown above it, and the smoke has the whole sky. The close is nearly empty. At the empty plinth three men in the Crown\'s clean grey with the lit trim at their cuffs are waiting for whoever comes up out of the Spire\'s foot, with their pistols out and not hidden: a house\'s men, whose house heard its own line read with everyone else\'s. They have come for the voice. Two wardens at the foot of the steps are watching them and doing nothing yet.' },
    ],
    passives: [
      P('the night', F('a3_ready_choir'), 'The Choir kept their lamps at every Precinct pump and on the Sink\'s stair all night.'),
      P('the night', F('a3_ready_stand'), 'Carrick\'s cranes are chained at the jib, and nobody was loaded.'),
      P('the night', F('a3_ready_gangs'), 'There was a runner on every corner of the chain, and nobody crossed a line.'),
      P('the night', F('a3_ready_wheel'), 'The Wheel\'s riders carried word ahead of the radio to thirty-one stopping places.'),
      P('the night', F('a3_ready_lowe'), 'The column stood at the clinics and the pumps, rifles slung, gates open.'),
      P('the night', F('a3_ready_saints'), 'A Saint sat at the door of everyone whose name was coming, before it came.'),
      P('the night', F('a3_ready_nine'), 'Unit 9\'s four hundred and eleven errors went out first, and the rest was heard as a record and not as the sky.'),
      P('the night', F('a3_ready_warned'), 'The living on the list had their lines from you first.'),
    ],
    again: 'The close at dawn.',
    options: [
      { id: 'd.held', text: '(Sit down on the fourth step.)', if: SKY_HELD, next: 'd_held' },
      { id: 'd.hard.read', text: 'Read it to me.', if: SKY_HARD, check: { skill: 'speech', dc: 45, mods: [{ if: F('a3_ready_saints'), dc: -10, why: 'a Saint read him his line gently once already, in the night' }, { if: F('a3_ready_warned'), dc: -5, why: 'the list had its lines from you first' }] }, next: 'd_hard_read', fail: 'd_hard_still' },
      { id: 'd.hard.wardens', text: '(Nod to the wardens at the foot of the steps.)', if: SKY_HARD, next: 'd_hard_wardens' },
      { id: 'd.hard.still', text: '(Stand still, and let him come.)', if: SKY_HARD, next: 'd_hard_still' },
      { id: 'd.burn.draw', text: '(Draw.)', if: SKY_BURNING, next: 'd_draw' },
      { id: 'd.burn.wardens', text: '(Call the wardens at the foot of the steps.)', if: SKY_BURNING, next: 'd_burn_wardens' },
      { id: 'd.burn.talk', text: 'Your house\'s line is read. Killing the voice won\'t unread it.', if: SKY_BURNING, check: { skill: 'speech', dc: 55, mods: [{ if: ALLY('gangs'), dc: -10, why: 'the chain\'s runners are on the close, and they know these men' }] }, next: 'd_burn_talk', fail: 'd_burn_fail' },
      NOT_YET('d.close.wait', '(Stay inside the steel door a while longer.)'),
    ],
  },
  d_held: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'held' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, the close was quiet: the city had been made ready for it, by everyone I asked.')],
    text: 'You sit down on the fourth step. A woman you have never seen brings you a cup of something hot and her own line, copied out in pencil, and sits beside you to drink hers while you read it. It says she will be widowed in R36. She does not seem to want anything from you except that you know it too.',
    again: 'The fourth step, the cup, the line in pencil.',
    options: D_BEATS.on('d_held'),
  },
  d_hard_read: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'hard' }, { set: 'a3_sky_walk', value: 'read' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, a man came at me on the Spire\'s steps with a knife and his own line, and I asked him to read it to me, and he did.')],
    text: 'He stops a step below you. You ask him to read it to you, and after a while he does, out loud, with the close listening: his wife, R34, and the man she leaves him for, who is his brother, named. When he has finished he looks at the knife as if somebody else has been holding it. He sits down on the step with the paper on his knee. Nobody takes the knife off him. Nobody needs to.',
    again: 'The man on the step below, the paper on his knee.',
    options: D_BEATS.on('d_hard_read'),
  },
  d_hard_wardens: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'hard' }, { set: 'a3_sky_walk', value: 'wardens' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, a man came at me on the Spire\'s steps with a knife and his own line, and the wardens took him down.')],
    text: 'Two wardens come up the steps behind him and take his arms, and the knife goes down the steps ringing, and the paper goes with it. They take him down to the plinth. There is more blood there by the time they have finished, and some of it is his, and the woman with the sand comes back with her bucket.',
    again: 'The plinth, and the sand.',
    options: D_BEATS.on('d_hard_wardens'),
  },
  d_hard_still: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'hard' }, { set: 'a3_sky_walk', value: 'still' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, a man came at me on the Spire\'s steps with a knife and his own line, and I stood still and let him come.')],
    text: 'You stand still. He comes up the steps to you with the knife, and stops a step below, near enough to use it, and doesn\'t. He holds the paper up so you can read it: his wife, R34, and the man she leaves him for, who is his brother, named. Then four people come up out of the crowd behind him and take hold of him and carry him back down off the bottom step, and they will not say what they read about him in the night, or he about them.',
    again: 'The bottom step. Four people and a man between them.',
    options: D_BEATS.on('d_hard_still'),
  },
  d_draw: {
    speaker: 'narrator',
    effects: [{ set: 'a3_sky_fight' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, a Crown house sent its men to the Spire for whoever had read it, and I fought them on the close.'), { event: 'combat' }],
    text: 'You draw. The two wardens at the foot of the steps go flat behind the sandbags. The house\'s men spread out across the close the way men do who were trained by somebody expensive, and the first of them says, quite reasonably, "This isn\'t about you." It is.',
    options: [{ id: 'd.draw.fight', text: '(Fight.)', exit: true }],
  },
  d_fighting: {
    speaker: 'narrator',
    text: 'The house\'s men, on the close, in the brown light.',
    options: [{ id: 'd.fighting', text: '(Fight.)', exit: true, effects: [{ event: 'combat' }] }],
  },
  d_fought: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'burning' }, { xp: 100 }],
    text: [
      { if: F('a3_sky_beaten'), text: 'You come to on the steps with a warden\'s coat under your head. The house\'s men are gone; the wardens held the foot of the steps once you were down, and the men did not want a war with the Precinct on top of everything else. The voice is alive. Bridgeward is still burning.' },
      { text: 'The house\'s men lie on the close in their clean grey, and the lit trim at their cuffs goes on glowing in the brown light as if nothing had happened to the men wearing it. The wardens come out from behind the sandbags and hold the foot of the steps. Bridgeward is still burning.' },
    ],
    again: 'The close, in the brown light.',
    options: D_BEATS.on('d_fought'),
  },
  d_burn_wardens: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'burning' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, a Crown house sent its men to the Spire for whoever had read it, and the wardens held the foot of the steps against them.')],
    text: 'You call to the wardens at the foot of the steps, and they look at each other, and then they do what the clause says, which is keep the stair. They stand across the foot of the steps with their rifles up, two of them, and then six, as more come in from the lane, and the house\'s men look at the rifles for a long time and go back to the plinth, and wait there. Nobody fires. The wardens hold the steps all morning, and you sit on the fourth step behind them and watch the Crown burn.',
    again: 'The wardens across the foot of the steps. The Crown burning.',
    options: D_BEATS.on('d_burn_wardens'),
  },
  d_burn_talk: {
    speaker: 'narrator',
    effects: [{ set: 'ep_sky', value: 'burning' }, DECIDE('a3_sky', 'The dawn after every forecast was read out, a Crown house sent its men to the Spire for whoever had read it, and I talked them off the close.')],
    text: 'You walk down to the plinth and say it to the first of them, level, the way the Ledger would have said it: the line is read; every radio in the Reach has it; the house can kill the voice and the line will still be read, and the house will have killed somebody in front of the whole close as well. He looks at you for a long time. Then he puts the pistol away, and the others do, and they go back up toward the Crown, toward the fire, because that is where their house is.',
    again: 'The plinth, and the house\'s men gone up toward the fire.',
    options: D_BEATS.on('d_burn_talk'),
  },
  d_burn_fail: {
    speaker: 'narrator',
    text: 'He hears you out, and says, "We know," and does not put the pistol away.',
    again: 'The pistol, not put away.',
    options: [
      { id: 'd.fail.draw', text: '(Draw.)', next: 'd_draw' },
      { id: 'd.fail.wardens', text: '(Call the wardens at the foot of the steps.)', next: 'd_burn_wardens' },
    ],
  },
  d_end: {
    speaker: 'narrator',
    text: [
      { if: READER_IS('nine'), text: 'Nine comes up the stair at last, when the relay\'s lamps have all gone out, and sits a step below you on the Spire\'s steps with its ledger shut on its knees. It does not say anything for a long time. Then it says that it has read four hundred and eleven errors and the rest, and that it would like that entered. You sit on the fourth step and let anybody who wants to look at your face come and look.' },
      { text: 'You sit down on the fourth step of the Spire where the photograph was made, and let anybody who wants to look at your face come and look. A great many people want to. Some of them want to spit. Some of them want to thank you. Most of them only want to see what somebody looks like who would do that.' },
    ],
    again: 'The fourth step. The faces coming to look.',
    options: [AFTER('end.read')],
  },
};
export const d_a3_end_opensky: DialogueDef = { id: READ, owner: 'narrator', nodes: READ_NODES, start: [...GUARD('opensky'), ...D_BEATS.start, { node: 'none' }] };

// ================================================================ E — the Magistrate's Amendment (d_a3_end_amendment)

const AMEND = 'd_a3_end_amendment';
const E_BEATS = beats(AMEND, [
  { node: 'e_three', when: NOT(F('a3_register_up')) },
  { node: 'e_write', when: NOT(F('a3_amended')) },
  { node: 'e_tamsin', when: ALL(WITH_YOU('tamsin'), RESERVE_UNDER_PEN, NOT(F('a3_amend_reserve')), NOT(F('a3_tam_walked'))) },
  { node: 'e_end' },
]);
const CLAUSE_SAYS: Record<string, string> = {
  fines: 'A forecast is not an act.', living: 'The record yields to the living.', keeper: 'A unit may be its own keeper.', refuse: 'A scheduled benefit may be refused.',
  reserve: 'A reserve is kept by its own consent.', passenger: 'A person is a passenger, never cargo.', speech: 'Speech is not sedition.',
};
const CHOSEN = (id: string): Cond => F(`a3_amend_${id}`);
const NONE_HELD: Cond = NOT(ANY(...CLAUSES.map((c) => c.needs)));
const AMENDS = (n: number): Cond => ({ flag: 'a3_amends', gte: n });
/** One to three clauses from the rulings held, written and struck out as often as the player likes until the register is closed. */
const PICKER: OptionDef[] = [
  ...CLAUSES.map((c): OptionDef => ({
    id: `e.w.${c.id}`, text: `(Write: ${CLAUSE_SAYS[c.id]})`, if: ALL(c.needs, NOT(CHOSEN(c.id)), NOT(AMENDS_FULL)), repeat: true, next: 'e_write',
    effects: [{ set: `a3_amend_${c.id}`, value: true }, { inc: 'a3_amends' }],
  })),
  ...CLAUSES.map((c): OptionDef => ({
    id: `e.s.${c.id}`, text: `(Strike it out: ${CLAUSE_SAYS[c.id]})`, if: CHOSEN(c.id), repeat: true, next: 'e_write',
    effects: [{ set: `a3_amend_${c.id}`, value: false }, { inc: 'a3_amends', by: -1 }],
  })),
  { id: 'e.close', text: '(Close the register.)', if: AMENDS(1), repeat: true, next: 'e_close' },
  { id: 'e.close.none', text: '(Close the register with nothing written in it.)', if: NONE_HELD, repeat: true, next: 'e_close' },
  NOT_YET('e.wait', '(Not yet. Leave it open on the plinth.)'),
];

const AMEND_NODES: Record<string, NodeDef> = {
  none: NONE,
  after: AFTER_NODE('end.amend.again'),
  e_three: {
    speaker: THREE,
    text: [
      { if: F('a3_register_back'), text: 'The footsteps reach the bottom of the stair and come along the aisle between the racks: Assessor Three, with the Court\'s register in both arms, the way a clerk carries something that might wake. The catalogue\'s acquisitions label is still on its spine, half scraped off. Three sets it on the oak in the space the width of it and steps back. "The Court\'s register, Magistrate. The charter asks that an amendment be entered in it in the open, where the Magistrate\'s face can be seen, and read at the bench when the Court sits." A pause. "The Court sits at nine. The steps are in the open."' },
      { text: 'The footsteps reach the bottom of the stair and come along the aisle between the racks: Assessor Three, with the Court\'s register in both arms, the way a clerk carries something that might wake. Three sets it on the oak in the space the width of it and steps back. "The Court\'s register, Magistrate. The charter asks that an amendment be entered in it in the open, where the Magistrate\'s face can be seen, and read at the bench when the Court sits." A pause. "The Court sits at nine. The steps are in the open."' },
    ],
    again: 'Three, and the register on the oak.',
    interject: [{ companion: NINE, text: '"Clause three of the charter," Nine says. "I have read it a great many times. I did not think anybody would ever use it." It sounds, for once, as if it would like to sit down.' }],
    options: [
      { id: 'e.up', text: '(Carry it up to the steps with Three, and wait for nine.)', exit: true, effects: [{ set: 'a3_register_up' }, { until: 9 }, STEPS_SPAWN, reopen(AMEND, 'The register')] },
      NOT_YET('e.notyet'),
    ],
  },
  e_write: {
    speaker: 'narrator',
    text: [
      { if: NONE_HELD, text: 'Three sets the register on the empty plinth under THE LAST BEFORE, open at a clean page headed AMENDMENTS — FIRST SEASON, and gives you the pen, and goes back up a step. The close is full; the wind off the canal turns the pages back until Three lays a hand flat on them. A clause may be written only from a ruling the Court has made in the Magistrate\'s favour, the charter says, and the Court\'s rulings in your hand all went the city\'s way. There is nothing on the page you are allowed to write.' },
      { if: AMENDS_FULL, text: 'Three lines on the page, in your hand, under AMENDMENTS — FIRST SEASON. The register will take no more this season. Three reads them over your shoulder and waits. The crowd on the close does not know what it is waiting for.' },
      { if: AMENDS(1), text: 'Your hand on the page, under AMENDMENTS — FIRST SEASON, and room left under it. Three reads each line over your shoulder as you write it, and waits. The wind off the canal turns the corner of the page, and Three lays a hand on it. The crowd on the close does not know what it is waiting for.' },
      { text: 'Three sets the register on the empty plinth under THE LAST BEFORE, open at a clean page headed AMENDMENTS — FIRST SEASON, and gives you the pen, and goes back up a step. The close is full; the wind off the canal turns the pages back until Three lays a hand flat on them. Three clauses, the charter says, in a Magistrate\'s first season, and each only from a ruling the Court has made in the Magistrate\'s favour. The crowd does not know what it is waiting for.' },
    ],
    passives: [
      ...CLAUSES.map((c) => P('written', CHOSEN(c.id), CLAUSE_SAYS[c.id])),
      P('Three', ALL(RESERVE_UNDER_PEN, F('prec_reserve'), NOT(CHOSEN('reserve'))), '"Without the clause on reserves," Three says, "the first paper under the chair\'s pen is Reserve 9."'),
      P('Three', ALL(RESERVE_UNDER_PEN, NOT(F('prec_reserve'))), '"There is no ruling of yours on reserves," Three says. "The first paper under the chair\'s pen is Reserve 9. That is the cost of the chair."'),
    ],
    again: 'The register open on the plinth. The pen.',
    interject: [
      { companion: TAMSIN, if: NOT(CHOSEN('living')), text: '"One of them about the living," Tamsin says from the step below. "That\'s all I asked. One about us."' },
      { companion: KES, text: '"Write one about the leash," Kes says, "if there\'s a clause for that." She knows there isn\'t.' },
      { companion: ODILE, text: 'Odile reads the page upside down from two steps away, which she can do. "Short," she says. "Good. Long ones get read wrong."' },
    ],
    options: PICKER,
  },
  e_close: {
    speaker: THREE,
    text: [
      { if: NONE_HELD, text: '"An empty page," Three says. "The register will enter that the Magistrate amended nothing." It does not say whether that is good. It waits.' },
      { text: 'Three reads the page over your shoulder, every line, slowly, and then once more. "Closed, it is entered," it says. "Not before." It waits.' },
    ],
    again: 'The register, open still.',
    options: [
      { id: 'e.close.yes', text: '(Close it.)', next: 'e_agreed' },
      { id: 'e.close.no', text: '(Open it again.)', next: 'e_write' },
    ],
  },
  e_agreed: {
    speaker: 'narrator',
    effects: [{ set: 'a3_amended' }, { xp: 200 }, DECIDE('a3_amended', 'On the Spire\'s steps I wrote the Magistrate\'s amendments into the Court\'s register in the open, and the Ledger agreed to them in front of the city.')],
    text: [
      { if: ALL(WITH_YOU('nine'), NOT(NONE_HELD)), text: 'You close the register. Three takes it up off the plinth in both arms and turns it to face the great doors, open, and holds it there. Above the doors the lens turns in its socket and stops on the page, and then on you, and the voice comes out of the inch of light between the doors, and everybody on the close hears it: "Agreed." Then Nine comes down two steps and reads the clauses back aloud, every word, slowly, for anyone on the close who cannot read.' },
      { if: NOT(NONE_HELD), text: 'You close the register. Three takes it up off the plinth in both arms and turns it to face the great doors, open, and holds it there. Above the doors the lens turns in its socket and stops on the page, and then on you, and the voice comes out of the inch of light between the doors, and everybody on the close hears it: "Agreed." Then Three reads the clauses back aloud, every word, in its voice with nothing in it, for anyone on the close who cannot read.' },
      { text: 'You close the register on an empty page. Three takes it up off the plinth in both arms and turns it to face the great doors, and holds it there. Above the doors the lens turns in its socket and stops on the page, and then on you, and the voice comes out of the inch of light between the doors, and everybody on the close hears it: "Agreed." Nobody on the close knows what was agreed. You do.' },
    ],
    passives: CLAUSES.map((c) => P('read back', CHOSEN(c.id), CLAUSE_SAYS[c.id])),
    again: 'The register, closed. Agreed.',
    options: E_BEATS.on('e_agreed'),
  },
  e_tamsin: {
    speaker: 'narrator',
    effects: [{ leave: TAMSIN }, { set: 'a3_tam_walked' }],
    text: [
      { if: CHOSEN('living'), text: 'Tamsin read the page over Three\'s arm with everybody else. You wrote one about the living. It does not cover a door. She knows what the first paper under that pen is, and she reads the page once more to be sure, and then she goes down the steps and through the crowd and into the lane without saying anything, and the crowd closes behind her.' },
      { text: 'Tamsin read the page over Three\'s arm with everybody else, all of it, and then again. There is nothing on it about reserves, and nothing about the living, and she knows what the first paper under that pen is. She goes down the steps and through the crowd and into the lane without saying anything, and the crowd closes behind her.' },
    ],
    again: 'The lane. The crowd, closed.',
    options: E_BEATS.on('e_tamsin'),
  },
  e_end: {
    speaker: 'narrator',
    text: 'At nine Three carries the register in to the bench and reads the clauses aloud to the Court of Accounts, which is a long hall with a grey unit at the end of it and nobody in the public benches who does not have to be. Then it brings the first of the season\'s papers out to the Magistrate on the steps, because there is still no desk on the close. You read it first. Then you sign it. It is the first of a great many, for the rest of your life.',
    again: 'The steps. The first paper of the season.',
    options: [AFTER('end.amend')],
  },
};
export const d_a3_end_amendment: DialogueDef = { id: AMEND, owner: 'narrator', nodes: AMEND_NODES, start: [...GUARD('amendment'), ...E_BEATS.start, { node: 'none' }] };

export const A3_END_DIALOGUES: DialogueDef[] = [d_a3_end_plan, d_a3_end_unwritten, d_a3_end_concern, d_a3_end_opensky, d_a3_end_amendment];
/** The climax each way at the desk opens (B6q's `vault.go.<act>`), and the end each one plays out. */
export const END_TREE: Record<string, { tree: string; name: string }> = {
  sign: { tree: PLAN, name: 'The chair' }, walk: { tree: PLAN, name: 'The stair' }, down: { tree: DOWN, name: 'The core' },
  sell: { tree: SELL, name: 'The paper' }, read: { tree: READ, name: 'The relay' }, amend: { tree: AMEND, name: 'The register' },
};
