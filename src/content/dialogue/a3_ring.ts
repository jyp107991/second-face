import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { ASH, ILYA, IN, INES_PREPARED, KES, NINE, ODILE, STRUCK_TRAP, TAMSIN, TEAGUE_LEADS, WREN } from '../world/a3_conds';

/**
 * The ring (B6i, Act 3 beat 20d): Cistern 9's council sits on what Reserve 9 does about the fourth order, with the designate
 * from Knock in the ninth chair (the one kept for the city's assessor, who never came) and no hand to vote with. One tree,
 * `d_a3_council`, opened from the council table (talk prop `council_table` on `cistern9`) once the player is inside
 * (`a3_inside`, B6h) and the door is not settled.
 *
 * - **What they want**, round the table: Teague (weld it; she held the lamp for the last weld), Pell (doesn't know), Bram
 *   (MOTHER kept), Ola (out and back), Wes (the sky's colour), Sayer (the city's clinics, for the thing in his chest), Effie
 *   (what "continuity" means).
 * - **Tamsin's card** (`a3_tam_card`; Tamsin travelling, her secret kept or told to MOTHER): she tells the ring MOTHER hid her.
 *   MOTHER owns it (or, burned, cannot). Then the room turns to Ines: ready (`INES_PREPARED`: the Archive promised or opened,
 *   the replies' copy put in her hands, or her own telling at this table) she stands with Tamsin (`a3_ines` = opens); not
 *   ready, she falls (`falls`) and Rosalind Teague takes the head of the table. After the card Tamsin can ask about her mother;
 *   Ines tells it, and names the one who told her (Teague), which the room hears.
 * - **Ines** can be brought to tell the ring what the Archive held herself (Speech 50; `opens`), or given the copy of
 *   MOTHER's replies to read aloud (no check; `opens`). A failed word closes her: `seals`.
 * - **Pell's certificate** (`a3_pell`): FIT FOR RELOCATION on sixty charts. What striking the reserve off the record makes of
 *   them, read by the Act 2 precedent (`STRUCK_AS`: the Court will hear them; nobody's; abandoned property, claimed on the spot
 *   by the guild's factor when the guild is at Knock: the trap). Unfit by Speech 40 (no check for a clinic aide), fit by the
 *   truth, refused when the word fails.
 * - **Bram** knows how a caretaker is put to sleep and won't. Asked about the city's core, he says how it is fed: couriers'
 *   paper and one trunk, two couplings, the first one in red (`a3_bram_cut`: B's means with Mechanics 50).
 * - **The vote** (`a3_ring` = sealed | open | city, and what the player said, `a3_ring_word`): the leader's default (Teague or
 *   a sealing Ines: sealed; an opening Ines: open), or the player's one speech against it (checks read what the room knows: the
 *   refusals, the faces, the card, Pell's charts, the hatch story). **Under Teague, a sealed vote is followed by her order to
 *   put MOTHER to sleep**: Bram obeys unless the player stops him (Speech 45); else `a3_mother` = asleep. Never under Ines;
 *   never with MOTHER burned.
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (20d) and "As built" → B6i.
 */

const F = (flag: string, eq?: string | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const KNOWS = (k: string): Cond => ({ knows: k });
const SEEN = (id: string): Cond => ({ seen: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
const MEM = (npc: string, tag: string, valence: number): Effect => ({ memory: { npc, tag, valence, strength: 80 } });

const INES = 'npc_c9_01', PELL = 'npc_c9_02', BRAM = 'npc_c9_04', MOTHER = 'npc_c9_05', TEAGUE = 'npc_c9_06', SAYER = 'npc_c9_r3';

// ---------------------------------------------------------------- the room's state

/** The ring can sit: the player inside the Cistern and the door not settled, and no vote yet. */
export const RING_CAN_SIT: Cond = ALL(F('a3_inside'), NOT(F('a3_c9')), NOT(F('a3_ring')));
const CALLED: Cond = KNOWS('a3_ring_called');
const FELL: Cond = TEAGUE_LEADS;
const BURNED: Cond = F('a3_mother', 'burned');
const ASLEEP: Cond = F('a3_mother', 'asleep');
const CARD: Cond = F('a3_tam_card');
const FACES: Cond = F('a3_faces');
const VOTED: Cond = ANY(F('a3_ring'), F('a3_c9'));
/** Tamsin's card is hers to play: she travels with the player, and her secret is kept or told only to MOTHER (told to Ines,
 * it is Ines's to tell; never learned, there is no card). */
export const CARD_HELD: Cond = ALL(IN(TAMSIN), ANY(F('tam_secret', 'kept'), F('tam_secret', 'mother')));
/** The room knows MOTHER said no to the city for them: the Archive opened, the copy read, Ines's own telling, or the card. */
const R_REFUSALS: Cond = ANY(F('a3_archive', 'open'), KNOWS('a3_ring_refusals'), F('a3_ines', 'opens'), CARD);
/** The leader's default at the vote: an Ines who has told the room everything would open the door herself; a sealing Ines and
 * Teague would keep it. */
const DEF_OPEN: Cond = F('a3_ines', 'opens');
const DEF_SEALED: Cond = NOT(DEF_OPEN);
const BRAM_OWED: Cond = { quest: 'q_a1_bram', status: 'done' };
const PREC = (v: string): Cond => F('prec_unrecorded', v);
const UNFIT: Cond = F('a3_pell', 'unfit');
const HATCH: Cond = KNOWS('a3_ring_hatch');

type Part = { if?: Cond; text: string };
/** Text built from independent axes (each ordered, its last part the default): every combination, in priority order, joined
 * with spaces. The runner shows the first whose condition holds. */
function axes(...xs: Part[][]): Part[] {
  let out: { conds: Cond[]; text: string }[] = [{ conds: [], text: '' }];
  for (const x of xs) {
    const next: typeof out = [];
    for (const o of out) for (const p of x) next.push({ conds: p.if ? [...o.conds, p.if] : o.conds, text: [o.text, p.text].filter(Boolean).join(' ') });
    out = next;
  }
  return out.map((o) => (o.conds.length ? { if: o.conds.length === 1 ? o.conds[0] : ALL(...o.conds), text: o.text } : { text: o.text }));
}

/** Back to wherever the player is at the table: the ring sitting, or after it. */
const BACK: OptionDef[] = [
  { text: '(Go on.)', if: NOT(VOTED), next: 'hub' },
  { text: '(Go on.)', if: VOTED, next: 'after' },
];

// ---------------------------------------------------------------- outcomes

const INES_OPENS: Effect[] = [{ set: 'a3_ines', value: 'opens' }];
const TAM_CARD: Effect[] = [
  { set: 'a3_tam_card' }, { xp: 50 }, MEM(TAMSIN, 'a3_card_told', 15),
  { decision: { id: 'a3_tam_card', text: 'At the Cistern\'s council table Tamsin told the ring that MOTHER had hidden her from the city\'s count. I told her it was hers to tell.' } },
];
const PELL_UNFIT: Effect[] = [
  { set: 'a3_pell', value: 'unfit' }, { xp: 75 }, TRUST(PELL, 5), MEM(PELL, 'a3_unfit_signed', 10), A(TAMSIN, 3), A(ODILE, 2), A(NINE, -3),
  { decision: { id: 'a3_pell', text: 'Doc Pell ticked FIT FOR RELOCATION "no" on sixty charts at my asking, so the city\'s order would have nobody fit to carry.' } },
];
const PELL_REFUSED: Effect[] = [
  { set: 'a3_pell', value: 'refused' }, TRUST(PELL, -3),
  { decision: { id: 'a3_pell', text: 'I asked Doc Pell to certify the Cistern unfit for relocation. He would not lie on sixty charts, and sent the city nothing.' } },
];
const PELL_FIT: Effect[] = [
  { set: 'a3_pell', value: 'fit' }, { xp: 40 }, TRUST(PELL, 5), A(NINE, 3), A(TAMSIN, -3),
  { decision: { id: 'a3_pell', text: 'I told Doc Pell to write what was true on the city\'s charts. He wrote them fit, all but Sayer Quist.' } },
];
const TRUNK: Effect[] = [
  { set: 'a3_bram_cut' }, { learn: 'a3_trunk' }, { xp: 50 }, TRUST(BRAM, 5), MEM(BRAM, 'a3_told_trunk', 5), A(NINE, -5), A(ASH, 2),
  { decision: { id: 'a3_bram_cut', text: 'Bram Coyle told me how a caretaker of MOTHER\'s make is fed, and where the coupling is that it does not wake from.' } },
];
const STOPPED: Effect[] = [
  { set: 'a3_bram_stopped' }, { xp: 50 }, TRUST(BRAM, 5), MEM(BRAM, 'a3_stopped', 20), MEM(TEAGUE, 'a3_crossed', -10), A(TAMSIN, 5), A(KES, 3),
  { decision: { id: 'a3_bram_stopped', text: 'When Teague ordered Bram to put MOTHER to sleep, I stopped him.' } },
];
const PUT_TO_SLEEP: Effect[] = [
  { set: 'a3_mother', value: 'asleep' }, A(TAMSIN, -10), A(KES, -5), MEM(BRAM, 'a3_put_her_down', -10),
  { decision: { id: 'a3_mother', text: 'At Teague\'s order Bram put MOTHER to sleep, so she could never open the Cistern\'s door for the city.' } },
];

type Vote = 'sealed' | 'open' | 'city';
type Word = 'shut' | 'open' | 'city' | 'yours';
const VOTE_TEXT: Record<Vote, string> = {
  sealed: 'voted to keep the great door shut',
  open: 'voted to open the great door themselves, once the column was gone',
  city: 'voted to go with the column to the city',
};
const WORD_TEXT: Record<Word, string> = {
  shut: 'I asked them to keep it shut',
  open: 'I asked them to open it when the column had gone',
  city: 'I asked them to go with the column',
  yours: 'I told them it was theirs to decide',
};
/** What the companions think of what the player said at the vote (said once, whatever the room did with it). */
const SAID: Record<Word, Effect[]> = {
  shut: [A(TAMSIN, 3), A(ASH, -3)],
  open: [A(TAMSIN, 5), A(ASH, 5), A(WREN, 3), A(KES, 2)],
  city: [A(TAMSIN, -15), A(ASH, -5), A(WREN, -5), A(KES, -5), A(NINE, 3)],
  yours: [A(TAMSIN, 5), A(ASH, 3), A(WREN, 3), A(ILYA, 2)],
};
const RING = (v: Vote, w: Word): Effect[] => [
  { set: 'a3_ring', value: v }, { set: 'a3_ring_word', value: w }, { xp: 150 }, ...SAID[w],
  { decision: { id: 'a3_ring', text: `At the Cistern's council table the ring ${VOTE_TEXT[v]}. ${WORD_TEXT[w]}.` } },
];

// ---------------------------------------------------------------- checks

type Mod = { if: Cond; dc: number; why: string };
const INES_MODS: Mod[] = [
  { if: F('a3_archive_promise'), dc: -10, why: 'she has already promised you the Archive' },
  { if: FACES, dc: -10, why: 'she has seen your face, and so has the ring' },
  { if: { standing: { settlement: 'cistern9', gte: 20 } }, dc: -5, why: 'Knock has always dealt straight with the hatch' },
  { if: F('a3_archive', 'sealed'), dc: 10, why: 'she sealed the Archive against you tonight' },
];
const PELL_MODS: Mod[] = [
  { if: CARD, dc: -10, why: 'Tamsin has stood up and said what his one true "no" did' },
  { if: BURNED, dc: -10, why: 'on a hand pump and forty-year-old stores, half of it is true now' },
  { if: F('a3_ring', 'city'), dc: 15, why: 'the ring has voted to go with the city' },
];
const BRAM_MODS: Mod[] = [
  { if: BRAM_OWED, dc: -15, why: 'you carried his letter to Shale, and brought the answer back' },
  { if: BURNED, dc: -10, why: 'they burned her; he would like something to answer for it' },
  { if: CARD, dc: -10, why: 'he heard what MOTHER did for Tamsin, and what the city does with the unfit' },
  { if: { origin: 'pump_hand' }, dc: -5, why: 'you talk about pumps the way he does' },
  { if: F('a3_bram_stopped'), dc: -10, why: 'you stopped him putting her to sleep' },
  { if: ASLEEP, dc: 10, why: 'he put her to sleep tonight, and cannot look at you' },
];
const CUT_MODS: Mod[] = [
  { if: BRAM_OWED, dc: -15, why: 'you carried his letter, and brought the answer back' },
  { if: CARD, dc: -10, why: 'she kept a child alive against the city' },
  { if: SEEN('ring.bram'), dc: -10, why: 'he told you himself that he won\'t' },
];
const SHUT_MODS: Mod[] = [
  { if: FACES, dc: 10, why: 'they have seen a face from outside, and it was yours' },
  { if: R_REFUSALS, dc: 10, why: 'they know MOTHER said no for them, and what it cost her' },
  { if: UNFIT, dc: -10, why: 'Pell\'s sixty charts have stopped the order on paper already' },
  { if: BURNED, dc: 10, why: 'they are on a hand pump' },
];
const OPEN_MODS: Mod[] = [
  { if: FACES, dc: -10, why: 'they have seen a face from outside, and it was yours' },
  { if: R_REFUSALS, dc: -10, why: 'they know MOTHER said no to the city for them' },
  { if: CARD, dc: -5, why: 'Tamsin told them what a count costs' },
  { if: ALL(UNFIT, PREC('yields')), dc: -10, why: 'struck off the record, the Court would hear them' },
  { if: BURNED, dc: -10, why: 'on a hand pump, they will have to come out some day' },
  { if: ALL(FELL, HATCH), dc: -10, why: 'the room has heard who told on the two at the hatch' },
  { if: F('a3_archive', 'sealed'), dc: 10, why: 'Ines sealed the Archive against you' },
];
const CITY_MODS: Mod[] = [
  { if: R_REFUSALS, dc: 15, why: 'they know MOTHER said no to the city for them three times' },
  { if: CARD, dc: 10, why: 'they know what the city does with the unfit' },
  { if: FELL, dc: 15, why: 'Teague leads the ring' },
  { if: F('a3_pell', 'fit'), dc: -10, why: 'Pell has written them fit, and the city expects them' },
  { if: BURNED, dc: -10, why: 'no caretaker, a hand pump and forty-year-old stores' },
  { if: NOT(FACES), dc: -10, why: 'they have never seen anything of outside but the city\'s word' },
  { if: F('ca_reserve', 'upheld'), dc: -5, why: 'the Court of Accounts has endorsed the order' },
];

// ---------------------------------------------------------------- the nodes

const CALL_SETTING: Part[] = [
  { if: BURNED, text: 'There is no hum. For the first time in ninety years the Cistern is quiet enough to hear itself, and what it hears is the hand pump in the corridor, a creak and a breath, a creak and a breath, with somebody on it in shifts. The council room is lit by three hand lamps down the middle of the table.' },
  { if: F('a3_in_how', 'door'), text: 'At the end of the corridor the great door stands open on its manual cycle, the first time in anybody\'s life, and the cold of the hall comes all the way down to the council room. Nobody has thought to shut it, because nobody knows how.' },
  { text: 'The council room is the size of Maud\'s kitchen. It holds a table, nine chairs, and a speaker grille over the door, through which, now and then, comes the small dry click of MOTHER listening.' },
];
const CALL_INES: Part[] = [
  { if: FACES, text: 'Ines Halloran is at the head of the table, very straight, hands folded on the wood. She has seen your face already, out in the corridor with the rest of them. She looks at it again now, without hurrying, as if to make sure it has stayed the same.' },
  { text: 'Ines Halloran is at the head of the table, very straight, hands folded on the wood, and she looks at your face for a long time without hurrying. "Indulge an old woman," she says at last. "I have known your voice since you were six. I wanted to see what it was attached to."' },
];
const CALL_RING = 'She lifts a hand and the ring comes in. Rosalind Teague first, seventy-two and upright as a pipe; Pell with his sleeves rolled to the elbow; Bram, wiping his hands on a rag he then does not know what to do with; and the four the residents sent: Ola Fairley with algae green under her nails, Wes Benn, Sayer Quist still in his kitchen apron, and Effie Calder, nineteen, who sits on her hands. Behind them, in both doorways and down the corridor as far as you can see, the rest of the sixty stand and wait, and nobody tells them to go. Ines points you to the ninth chair, at the foot. "We kept that one for the city\'s assessor," she says, "in case he ever came to a meeting. He never did. Sit in it."';
const CALL_SPEECH: Part[] = [
  { if: BURNED, text: '"This is the ring." Her voice does not rise; it never has. "MOTHER shut the hatch, as she has three times in my life, and then the Choir\'s grey people came down the grate with oil, and there is nobody left to ask. There is a column on the toll road with an order for us, RELOCATION TO PRECINCT SUPPLY, BY FORCE IF NON-COMPLIANT, and it waits for one person to walk up to our door. That person is at my table." She does not look away from you. "So we will decide what Reserve 9 does, the way we have decided everything down here. You don\'t have a hand at this table, {name}. You may speak."' },
  { text: '"This is the ring." Her voice does not rise; it never has. "MOTHER has shut the hatch, as she has three times in my life. There is a column on the toll road with an order for us, RELOCATION TO PRECINCT SUPPLY, BY FORCE IF NON-COMPLIANT, and it waits for one person to walk up to our door. MOTHER says that person is sitting at my table." She does not look away from you. "So we will decide what Reserve 9 does, the way we have decided everything down here. You don\'t have a hand at this table, {name}. You may speak."' },
];

const ROUND_INES: Part[] = [
  { if: FELL, text: 'Ines, on her stool against the wall, says nothing when it comes round to her, and the ring goes on past her as if her place were empty.' },
  { text: 'Ines, when it comes round to her, folds her hands. "I will say mine when we vote," she says. "Not before. I have said mine first for thirty years."' },
];
const ROUND_BRAM: Part[] = [
  { if: BURNED, text: 'Bram does not look up from his hands. "They burned her," he says. "I\'ll do what the rest of you do. It doesn\'t matter now what I want."' },
  { text: 'Bram looks up at the grille over the door, at the click. "Whatever we do, she keeps the air," he says. "I want her kept. That\'s what I want. Her kept."' },
];
const ROUND_EFFIE: Part[] = [
  { if: R_REFUSALS, text: 'Effie Calder last, still sitting on her hands. "It meant no," she says. "Continuity. MOTHER said it to us every night of my life and it meant no. She was saying no for us." She takes her hands out from under her and puts them flat on the table. "I\'d like to vote for that."' },
  { text: 'Effie Calder last, still sitting on her hands. "I\'d like to know what continuity means," she says, "before I vote for it or against it. MOTHER says it every night. Nobody has ever told me."' },
];

const VOTE_LEAD: Part[] = [
  { if: FELL, text: 'Teague does not ask for the vote. She calls it, the way she must have wanted to for thirty years: "Hands." Then, before a hand moves, she looks down the table at you, as Ines would have. "The designate may speak. Once."' },
  { if: F('a3_ines', 'seals'), text: 'Ines asks for the vote. "By hands," she says, "as we have always done the small things. Before the hands, our guest may speak, once." She looks round the table. "And so that nobody votes to please me: I will vote to keep the door. Vote as you like."' },
  { text: 'Ines asks for the vote. "By hands," she says, "as we have always done the small things. Before the hands, our guest may speak, once." She looks round the table. "I have told you what I know. I will vote to open it, from in here, when the column has gone. Vote as you like."' },
];

const SEALED_LOST: Part[] = [
  { if: ANY(F('a3_ring_word', 'open'), F('a3_ring_word', 'city')), text: 'You said your piece. It was not enough to move them.' },
  { text: '' },
];
const SEALED_HANDS: Part[] = [
  { if: FELL, text: '"Hands," Teague says, and hers is up before the word is out. Then Bram\'s, slowly, and Sayer\'s after a look at Pell, and Pell\'s with his eyes shut; then, from the stool against the wall, after a long moment, Ines\'s. Five. Effie and Wes and Ola keep theirs on the table, and in the doorways the sixty say nothing, because nobody has ever asked them. "The door stays shut," Teague says. "As it has. As it will."' },
  { text: '"Hands," Ines says. Teague\'s first, as always. Bram\'s, with his eyes on the grille. Sayer\'s, and Pell\'s, and then, after a long look at you, Ines\'s own. Ola and Wes keep theirs on the table; Effie lifts hers halfway and puts it down. "Then we keep the door," Ines says, "and the city may knock." She does not look relieved. She looks like a woman who has carried something up a stair and been told to carry it down again.' },
];
const SEALED_AIR: Part[] = [
  { if: BURNED, text: 'On a hand pump, for as long as the hand pump holds. Nobody says that part aloud.' },
  { text: '' },
];

const OPEN_LOST: Part[] = [
  { if: F('a3_ring_word', 'shut'), text: 'You asked them to keep it shut. They heard you, and they put their hands up anyway.' },
  { if: F('a3_ring_word', 'city'), text: 'You asked them to go with the column. They heard you, and put their hands up for the other thing.' },
  { text: '' },
];
const OPEN_HANDS: Part[] = [
  { if: FELL, text: '"Hands," Teague says, sure of them. Hers goes up, and Bram\'s, slowly. And then Ola Fairley puts hers up for the other thing, in the middle of the table where everybody can see it, and says, "Out and back," and Wes\'s goes up beside it, and Effie\'s, and Sayer looks at his folded apron and puts his up too, and Pell, and from her stool against the wall, Ines. Six. Teague looks at the hands as if they were a leak. Then she sits down in the chair that is hers now. "When the column has gone," she says. "Not an hour before. I\'ll hold the lamp."' },
  { text: '"Hands," Ines says, and puts hers up first, which she has never done in her life. Ola\'s is beside it before she has finished: "Out and back." Wes\'s. Effie\'s, all the way up this time. Sayer\'s, after a look at his folded apron; Pell\'s. Bram\'s last, with his eyes on the grille. Teague\'s stays flat on the table. "Seven," Ines says. "When the column has gone, or stood down, or been told no by somebody it listens to, we open the door. By hand. From in here."' },
];
const OPEN_MOTHER: Part[] = [
  { if: BURNED, text: 'Somebody looks up at the dead grille out of habit. Nobody answers. Nobody expected anybody to.' },
  { if: FELL, text: 'Over the door, the click; then, slow and formal, MOTHER: "Thank you for your continuity." It has never sounded like that before.' },
  { text: 'She looks up at the grille. "MOTHER. Did you hear?" The click; then, slow and formal, "I heard. Thank you for your continuity." It has never sounded like that before.' },
];

const CITY_HANDS: Part[] = [
  { if: FELL, text: '"Hands," Teague says. Sayer\'s is up first, the apron folded square in front of him. Effie\'s, after a long look at you. Wes\'s, because Effie\'s is. Pell\'s, slowly: "I\'d like to see the lights they see through a man with." Ola looks at the grille, and at you, and puts hers up. Teague\'s stays flat on the table and her face does not move. "Then go," she says. "I will keep the door for whoever is left in here."' },
  { text: '"Hands," Ines says. Sayer\'s is up first, the apron folded square in front of him. Effie\'s, after a long look at you. Wes\'s, because Effie\'s is. Pell\'s, slowly: "I\'d like to see the lights they see through a man with." Ola looks at the grille, and at you, and puts hers up. Ines looks at the hands for a long time. Then she puts her own up with them. "We go to the city," she says. "On our feet, with our names, and not in the dark. Somebody tell the captain."' },
];
const CITY_MOTHER: Part[] = [
  { if: BURNED, text: '' },
  { text: 'From the grille, the click, and then nothing. For the first time in ninety years MOTHER does not thank anybody for anything.' },
];

const AFTER_STATE: Part[] = [
  { if: F('a3_ring', 'sealed'), text: 'The council table. The ring has risen, and somebody has chalked a short line along the table\'s edge: SHUT. 4TH TIME.' },
  { if: F('a3_ring', 'open'), text: 'The council table. The ring has risen, and somebody has chalked OUT AND BACK along the table\'s edge, in Ola Fairley\'s round hand.' },
  { if: F('a3_ring', 'city'), text: 'The council table. The ring has risen. Sayer\'s apron is still folded on the wood where he left it, and nobody has moved it.' },
  { text: 'The council table and its nine chairs. The ring never sat over the door; it was settled without them.' },
];
const AFTER_WHO: Part[] = [
  { if: ALL(FELL, F('a3_ring')), text: 'Teague is at the head of it with a list in her hand.' },
  { if: F('a3_ring'), text: 'Ines sits at the head of it alone, with her hands folded.' },
  { text: '' },
];
const AFTER_MOTHER: Part[] = [
  { if: ASLEEP, text: 'The click over the door does not come. Bram\'s manual lies open at page forty in the machine room doorway.' },
  { text: '' },
];

const NODES: Record<string, NodeDef> = {
  // ------------------------------------------------ before the ring can sit
  table: {
    speaker: 'narrator',
    text: 'A long table worn pale at its edges by ninety years of elbows, and nine chairs that do not match, each mended in a different decade. Somebody has scratched a tally into the corner nearest the door, and somebody else has tried to sand it out.',
    again: 'The council table and its nine chairs.',
    options: [{ text: '(Leave it.)', exit: true }],
  },

  // ------------------------------------------------ the ring is called
  call: {
    speaker: INES,
    text: axes(CALL_SETTING, CALL_INES, [{ text: CALL_RING }], CALL_SPEECH),
    again: 'The ninth chair, at the foot of the table, kept for an assessor who never came.',
    effects: [{ learn: 'a3_ring_called' }],
    interject: [
      { companion: TAMSIN, text: 'Tamsin does not sit. She stands behind your chair with her hands on its back, the way she used to stand at the Grille when it was her turn, and when Teague looks at her she looks back until Teague stops.' },
      { companion: NINE, text: '"I will not record this meeting," Nine says to the table. "I say so in order that you know a unit of the city sat in your council and did not." Teague looks at it as if it were a smell.' },
      { companion: KES, text: 'Kes looks up at the speaker grille over the door, at the little click of something listening, and puts two fingers to the back of her neck without seeming to know she has.' },
      { companion: ODILE, text: 'Odile takes in the mended chairs, the tally in the wood and the sixty people in the doorways, and murmurs, "A board meeting, with the shareholders standing," and nobody down here knows what either word means.' },
      { companion: ASH, text: 'Ash stays by the door with his back to the wall and his grey scarf in his hand, the way a man stands at a burial he was not asked to.' },
      { companion: WREN, text: 'Wren counts the ways out of the room without moving her head: two doors, both full of people. She does not like it, and she does not say so.' },
    ],
    options: [{ id: 'ring.sit', text: '(Sit in the ninth chair.)', next: 'hub' }],
  },

  hub: {
    speaker: 'narrator',
    text: [
      { if: FELL, text: 'Teague has Ines\'s chair now, at the head of the table, and sits in it as if it had always been hers. Ines is on a stool against the wall with her hands in her lap, and the room does not look at her. "Well," Teague says. "Say what you came to say, designate. Then we vote, and then we weld."' },
      { text: 'Eight chairs, and the ninth, yours; sixty people in the doorways, breathing. "Ask what you need to ask," Ines says. "Then we will vote. We have never in my life voted on anything that mattered. I would like to do it properly."' },
    ],
    again: [{ if: FELL, text: 'Teague waits at the head of the table. Ines waits against the wall.' }, { text: 'The ring waits.' }],
    options: [
      { id: 'ring.round', text: '(Let them say, one by one, what they want.)', once: true, next: 'round' },
      { id: 'ring.teague', text: 'Teague. Why weld it?', once: true, next: 'teague' },
      { id: 'ring.sayer', text: 'Sayer. Why the column?', if: SEEN('ring.round'), once: true, next: 'sayer' },
      { id: 'ring.card', text: 'Tamsin. It\'s yours to tell, if you want to.', if: ALL(CARD_HELD, NOT(CARD), NOT(FELL)), once: true, effects: [A(TAMSIN, 5)], next: 'card' },
      { id: 'ring.copy', text: '(Put your copy of MOTHER\'s replies on the table in front of Ines.)', if: ALL({ item: 'k_ar_refusals' }, NOT(F('a3_ines')), NOT(F('a3_archive', 'open'))), once: true, next: 'copy' },
      {
        id: 'ring.ines', text: [{ if: F('a3_archive', 'burned'), text: 'Ines. Tell them what was in the Archive. You, now, before anybody else does.' }, { text: 'Ines. Tell them what\'s in the Archive. You, now, before anybody else does.' }],
        if: ALL(NOT(F('a3_ines')), NOT(F('a3_archive', 'open'))), once: true,
        check: { skill: 'speech', dc: 50, mods: INES_MODS },
        effects: [...INES_OPENS, { xp: 75 }, TRUST(INES, 5), A(TAMSIN, 3)], next: 'ines_tells',
        fail: 'ines_seals', failEffects: [{ set: 'a3_ines', value: 'seals' }, TRUST(INES, -5)],
      },
      { id: 'ring.pell', text: 'Doc. The forms you send the city every quarter.', once: true, next: 'pell' },
      { id: 'ring.pell.back', text: 'Doc. The charts. What will you write?', if: ALL(KNOWS('a3_pell_struck'), NOT(F('a3_pell'))), next: 'pell_choose' },
      { id: 'ring.bram', text: [{ if: BURNED, text: 'Bram. You know how a caretaker is fed.' }, { text: 'Bram. Could she be put to sleep?' }], once: true, next: 'bram' },
      { id: 'ring.hatch', text: '(Tamsin has another question. Let her ask it.)', if: ALL(CARD, IN(TAMSIN)), once: true, next: 'hatch' },
      { id: 'ring.vote', text: '(Ask for the vote.)', if: F('a3_ines'), next: 'vote' },
      { id: 'ring.vote.open', text: '(Ask for the vote.)', if: ALL(NOT(F('a3_ines')), F('a3_archive', 'open')), effects: INES_OPENS, next: 'vote' },
      { id: 'ring.vote.seal', text: '(Ask for the vote.)', if: ALL(NOT(F('a3_ines')), NOT(F('a3_archive', 'open'))), effects: [{ set: 'a3_ines', value: 'seals' }], next: 'vote' },
      { text: '(Get up. The ring will sit again when you come back to the table.)', exit: true },
    ],
  },

  // ------------------------------------------------ what they want
  round: {
    speaker: 'narrator',
    text: axes(
      [{ text: 'They go round the table the way the ring always has, oldest to youngest. Teague first: "Weld it." She does not elaborate. She has never needed to.' }],
      ROUND_INES,
      [{ text: 'Sayer Quist takes off his apron and folds it square on the table in front of him. "I\'d go with the column." The doorways shift. "Ask me why, if you like. Soup\'s at six either way." Pell rubs his eyes. "I don\'t know," he says. "I\'d like that written down somewhere. The doctor didn\'t know."' }],
      ROUND_BRAM,
      [{ text: 'Ola Fairley, with the algae green under her nails: "I\'d like to go out and come back." She says it to the table, then makes herself say it to you. "Is that allowed? Nobody has ever said whether that\'s allowed." Wes Benn grins, which nobody else is doing. "My grandmother said the sky was blue. I\'d like to find out which of you was lying to her."' }],
      ROUND_EFFIE,
    ),
    again: 'Eight people round a table, each wanting something different, all of them wanting to be alive at the end of it.',
    effects: [{ learn: 'a3_ring_heard' }],
    interject: [
      { companion: ILYA, text: 'Ilya has counted the chairs, and the people in the doorways, and does the sum aloud without meaning to. "Eight hands," he says. "For sixty." Nobody at the table answers him, which is an answer.' },
      { companion: WREN, text: '"Out and back," Wren says under her breath, when Ola has said it. "That\'s all a road is." She sounds almost fond.' },
      { companion: KES, text: 'When Sayer says the column, Kes looks at him the way you look at a man in a queue you have stood in yourself. Her hand is at the back of her neck.' },
    ],
    options: BACK,
  },
  teague: {
    speaker: TEAGUE,
    text: '"Because I held the lamp." Teague\'s hands lie flat on the table and they are steady, which at seventy-two is its own argument. "Ines was nine and I was fifteen, and her mother put the torch to the door\'s leaves while I held the lamp for her, because something had come through that door that was not ours, and we were what was left." She does not say what came through. Nobody in the room asks; most of them have known all their lives not to. "Since that night nothing has come in that we did not let in through a tray the size of a loaf, and we are alive. Every one of us." She looks at you. "Continuity is a duty, not a comfort. The ones who wanted the door open are not here to argue with me. That is the whole of my argument, and it has never lost."',
    again: '"It has never lost," Teague says.',
    effects: [{ learn: 'a3_ring_teague' }],
    interject: [
      { companion: TAMSIN, text: 'Tamsin\'s hands tighten on the back of your chair at "not here to argue". She does not say anything. She is very carefully not saying anything.' },
      { companion: ASH, text: '"Doors keep things out," Ash says, quietly, to nobody. "They keep things in, too. Ask anyone who\'s been kept in a cellar." Teague\'s eyes go to him and stay there.' },
    ],
    options: BACK,
  },
  sayer: {
    speaker: SAYER,
    text: 'Sayer turns the folded apron a quarter turn, square to the table\'s edge. "There\'s a thing in my chest," he says, "under the ribs, this side. Pell\'s felt it. Pell doesn\'t know what it is, because Pell\'s books stop where Pell\'s books stop." Pell does not argue. "I\'m sixty-three. That\'s old, down here. The city has clinics, they say, with lights you can see through a man with." He shrugs. "I\'d like a name for it before it names me. And I\'d like to cook for more than sixty once in my life. That\'s all it is. I\'m not brave. I\'m curious, and I\'m ill."',
    again: '"Curious, and ill," Sayer says. "Soup at six."',
    effects: [{ learn: 'a3_ring_sayer' }],
    interject: [
      { companion: NINE, text: '"The Precinct\'s clinics would see him," Nine says. "They would also assess him. A man of sixty-three with a mass under the ribs is found unfit for relocation." A pause. "I am not arguing. I am telling him the form."' },
      { companion: KES, text: '"They\'ll name it," Kes says. "In the Skirts they named everything. Then they sent you the bill with the name on it."' },
      { companion: ODILE, text: '"A name and an invoice," Odile says gently. "In my experience they arrive in the same envelope."' },
    ],
    options: BACK,
  },

  // ------------------------------------------------ Tamsin's card
  card: {
    speaker: TAMSIN,
    text: 'Tamsin lets go of your chair. For a moment you think she will not do it; then she walks round the table to the head of it, where Ines is, and puts both hands flat on the wood. "Hello," she says. "You know me. Most of you have told me to keep it down." Nobody laughs. She did not expect them to. "I was born at thirty weeks. Pell knows. Lungs like wet paper. There\'s a box on the city\'s form, FIT FOR RELOCATION, and Pell ticked no, because it was true, and gave it to MOTHER for the quarterly return." Pell has closed his eyes. "I wasn\'t on the next count. Or any count. Not the city\'s. The city takes the fit, and the ones that aren\'t, it stops writing down, and what isn\'t written down doesn\'t get a ration. Sixty in their book and sixty-one at MOTHER\'s ration counter, every quarter since I was six." She looks up at the grille over the door. "The fridge kept writing me down. To itself. It hid me. I\'m the error it never filed."',
    again: 'Tamsin, with her hands flat on the table at its head.',
    effects: TAM_CARD,
    interject: [
      { companion: NINE, text: '"Clause forty," Nine says, very quietly. "A person\'s entry is read to the person. It was. In my presence." It does not say anything else.' },
      { companion: ASH, text: 'Ash has bowed his head, the way the Choir do for a name said aloud.' },
      { companion: ILYA, text: 'Ilya, by the door, has stopped counting anything at all.' },
    ],
    options: [
      { text: '(Go on.)', if: NOT(BURNED), next: 'card_mother' },
      { text: '(Go on.)', if: BURNED, next: 'card_dark' },
    ],
  },
  card_mother: {
    speaker: MOTHER,
    text: 'Every head in the room goes up to the grille over the door, out of ninety years of habit, and for a long moment there is only the click. Then MOTHER, slow and formal, in the voice that has said goodnight to all of them every night of their lives: "Resident sixty-one was not submitted for assessment. I logged the omission as variance. The variance is unchanged." A pause, the length of a weighing. "Tamsin. Thank you for your continuity." And then, in the same voice, a thing it has never said: "I am sorry I did not tell you."',
    again: 'The grille over the door, and the small click of MOTHER listening.',
    options: [
      { text: '(Go on.)', if: INES_PREPARED, next: 'card_stands' },
      { text: '(Go on.)', if: NOT(INES_PREPARED), next: 'card_falls' },
    ],
  },
  card_dark: {
    speaker: 'narrator',
    text: 'Every head in the room goes up to the grille over the door, out of ninety years of habit, and there is nobody in it. There will not be anybody in it again. Tamsin looks up at it with them. "Well," she says. "She can\'t say sorry now, can she." Her voice does something, and she lets it. "She hid me, and they burned her for being a city machine. Somebody write that down."',
    again: 'The dead grille over the door.',
    options: [
      { text: '(Go on.)', if: INES_PREPARED, next: 'card_stands' },
      { text: '(Go on.)', if: NOT(INES_PREPARED), next: 'card_falls' },
    ],
  },
  card_stands: {
    speaker: INES,
    text: axes(
      [{ text: 'Then the room turns, as you knew it would, from the grille to the head of the table. Sayer says it, because somebody has to: "Ines. Did you know?" Ines does not look away from him.' }],
      [
        { if: KNOWS('a3_ring_refusals'), text: '"Not about Tamsin. About the city, yes: since a quarter of an hour ago, when {name} put that paper in front of me.' },
        { if: KNOWS('a3_ines_told'), text: '"Not about Tamsin. About the city, yes. I told you myself, tonight, at this table.' },
        { if: F('a3_archive', 'open'), text: '"Not about Tamsin. About the city, yes, since I opened the Archive for {name} and read what MOTHER answered them.' },
        { if: F('a3_archive_promise'), text: '"Not about Tamsin. About the city, yes, since {name}\'s copy came home: three orders, and three times MOTHER told them no, in the words she says goodnight with.' },
        { text: '"Not about Tamsin. About the city, yes. I have known longer than I told you.' },
      ],
      [{ text: 'I knew MOTHER refused them. I did not know what it cost her to keep the count she kept." She stands, which she has not done all evening, and puts her hand over Tamsin\'s on the table. "I should have told you both things before a girl had to stand up in this room and say them for me." She looks round the ring, chair by chair. "There. Now you know what I know. Nobody decides this for you any more. Not me."' }],
    ),
    again: 'Ines, standing, her hand over Tamsin\'s on the table.',
    effects: [...INES_OPENS, MEM(INES, 'a3_stood_with_tamsin', 15)],
    interject: [
      { companion: TAMSIN, text: 'Tamsin does not take her hand away. That is all. It is a great deal.' },
      { companion: ODILE, text: '"Disclosed before the market opened," Odile says, very softly. "Clever woman. She keeps her seat."' },
    ],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
  card_falls: {
    speaker: 'narrator',
    text: 'Then the room turns, as you knew it would, from the grille to the head of the table. Sayer says it, because somebody has to: "Ines. Did you know?" "No." Ines says it at once, because she has never in her life lied to this room about a small thing. Then she hears what it means, and so do they: thirty years at the head of this table deciding what the sixty could bear to know, and MOTHER saying no to the city on their behalf the whole time, and hiding a child from it, and Ines had not known either. "No," she says again, smaller. "Then what was the Archive for?" Effie, from the foot of the table, before anyone can stop her. "All those years you went in there with the key. What was in there, if it wasn\'t this?" Ines opens her mouth and nothing comes out of it. It is Teague who stands. "The city\'s letters," she says. "She has kept them under lock as long as she has had the key, and told us the hatch shut for maintenance." She does not raise her voice either; she does not need to. "She decided we couldn\'t bear it. She decides everything. And I have sat at this table and let her." She walks round the table and stands at Ines\'s chair until Ines, slowly, gets up out of it, and goes and sits on a stool against the wall with her hands in her lap. Nobody asks her to come back.',
    again: 'Ines on a stool against the wall. Teague in her chair.',
    effects: [{ set: 'a3_ines', value: 'falls' }, MEM(INES, 'a3_fell', -10), MEM(TEAGUE, 'a3_leads', 10)],
    interject: [
      { companion: ODILE, text: '"A sheet made worthless by daylight," Odile says, so quietly only you hear it. She does not sound pleased. She sounds as if she has watched it happen to somebody she liked.' },
      { companion: NINE, text: '"She has not been removed by any procedure," Nine says. "She has been removed." It says it the way it would remark on the weather.' },
      { companion: ILYA, text: 'Ilya watches the old woman cross the room to the stool, and counts her steps without meaning to. Eleven.' },
    ],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
  hatch: {
    speaker: INES,
    text: axes(
      [{ text: 'Tamsin has not sat down. "One more," she says, to Ines, not to the room. "My mother. You told me she was quiet. That\'s all you ever told me. Quiet."' }],
      [{ if: FELL, text: 'Ines is a long time answering from her stool against the wall.' }, { text: 'Ines is a long time answering.' }],
      [{ text: '"She was not quiet. That was the lie." She folds her hands. "The winter before you were born, two of the young ones went down the pump run at night, to the hatch, to go out. Your mother was one of them. I was waiting in the passage. I talked them back. It took me until morning, and I was proud of it, and I have never told anyone, because by the spring I knew what I had done." She looks, not at Tamsin, but across the room at Teague. "I would not have known they were going. Rosalind told me." Teague does not look away. "I did my duty." "Yes," Ines says. "So did I."' }],
    ),
    again: '"So did I," Ines says, and does not say anything else.',
    effects: [{ learn: 'a3_ring_hatch' }, MEM(TEAGUE, 'a3_named_informer', -15), MEM(INES, 'a3_told_hatch', 5)],
    interject: [
      { companion: WREN, text: 'Wren has gone very still. "Somebody always tells," she says to her own hands, the way scouts say a thing they learned the expensive way.' },
      { companion: KES, text: '"In the Skirts we called it reporting," Kes says. "You got a better shift for it." She does not look at Teague. She does not have to.' },
    ],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },

  // ------------------------------------------------ Ines, and the Archive
  copy: {
    speaker: INES,
    text: axes(
      [{ text: 'You put the copy on the table in front of her: three orders in your own hand, and under each the caretaker\'s reply. Ines reads it once to herself, lips moving, the way Bram reads things. Then she does a thing nobody in the room has seen her do. She reads it aloud, all of it, in her own measured voice, from RESERVE 9 at the top to the fourth order, drafted, at the bottom, and under each order, three times: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. At the third reply Effie Calder makes a sound like a laugh with no air in it. "That\'s what it means," she says. "Continuity. It means no." Ines puts the paper down.' }],
      [
        { if: F('a3_archive', 'burned'), text: '"The city\'s letters were in the Archive behind me," she says, "until the oil. I kept them under lock as long as I had the key, and I never knew what MOTHER answered. Now you know what I know. I will not decide this for you."' },
        { text: '"The city\'s letters are in the Archive behind me," she says. "I have kept them under lock as long as I have had the key, and I never knew what MOTHER answered. Now you know what I know. I will not decide this for you."' },
      ],
    ),
    again: 'The copy on the table in front of Ines: three orders, three replies.',
    effects: [{ learn: 'a3_ring_refusals' }, ...INES_OPENS, { xp: 40 }, TRUST(INES, 5), MEM(INES, 'a3_ring_copy', 15)],
    interject: [
      { companion: TAMSIN, text: '"She said no," Tamsin says to nobody, to the grille. "Three times. Rust it." Then she laughs, once, and wipes her face with her wrist.' },
      { companion: NINE, text: '"That is an accurate copy," Nine says. "I have read the originals. Your hand is better than the clerk\'s."' },
    ],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
  ines_tells: {
    speaker: INES,
    text: 'Ines looks at you for a long time. Then she looks at the ring, and you watch her decide, the way she must have decided everything in this room for thirty years, except that this time what she decides is to stop. "There is a drawer in the Archive," she says, "with three letters in it on the city\'s paper. Orders. Relocate the population to Precinct supply. The first came when I was twelve. The last when I was not much older than {name} is now. Each time MOTHER shut the hatch, and I told you it was maintenance, and each time the city went away. I did not ask her why it went away. I was afraid she would tell me." She unfolds her hands. "I kept them from you because I thought you couldn\'t carry them, and I thought that was mine to decide. It wasn\'t. Now you know what I know."',
    again: '"Now you know what I know," Ines says.',
    effects: [{ learn: 'a3_ines_told' }],
    interject: [
      { companion: ASH, text: 'Ash watches her the way the Choir watch somebody put down a thing they have carried a long way. He says nothing. It is the kindest thing he could do.' },
      { companion: TAMSIN, text: 'Tamsin\'s hands come off the back of your chair. "Maintenance," she says. "Twelve years old, and you told us it was maintenance." But she does not say it unkindly. She says it like somebody finally being told the end of a story.' },
    ],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },
  ines_seals: {
    speaker: INES,
    text: '"No." Ines does not raise her voice. "Not in front of the ring, not because a child from Knock tells me to, and not with a column on the road. What is in the Archive is mine to carry, and I have carried it a long time without dropping it." She turns to the table. "We keep the door. That is what I will say when we vote, and you may all vote as you like." Nobody in the doorways moves. You have watched her close something, and it was not the Archive.',
    again: '"We keep the door," Ines says.',
    interject: [{ companion: TAMSIN, text: '"She decides things for people," Tamsin says, not quietly. "Told you."' }],
    options: [{ text: '(Go on.)', next: 'hub' }],
  },

  // ------------------------------------------------ Pell's certificate
  pell: {
    speaker: PELL,
    text: 'Pell takes his glasses off, which he does when he is about to say something plainly. "Every quarter, a chart for every one of us. Height, weight, teeth, lungs, the lot, in a format I was taught by my teacher, who was taught by hers, and she told me whose boxes they were the first day: the city\'s, for when it comes. At the bottom of every chart there\'s one that says FIT FOR RELOCATION. I tick it. Sixty times a quarter, for thirty years, and MOTHER sends them up the line with the ration returns." He puts his glasses down on the table. "I ticked no once. For Tamsin. Because it was true." He looks at you. "The order says the reserve. A reserve is kept for relocation, and the Plan relocates the fit. If I ticked no sixty times, there\'d be nobody on that road for the column to carry. That\'s what you were going to ask me."',
    again: '"Sixty boxes," Pell says. "Every quarter."',
    effects: [{ learn: 'a3_pell_forms' }],
    interject: [
      { companion: ODILE, text: '"A certificate is a sheet like any other," Odile says. "Its value is whatever the next reader decides it is. I would want to know who the next reader is."' },
      { companion: NINE, text: '"That is correct," Nine says. "Schedule 4: a reserve is assessed fit or it is not carried. It has never been tested on a whole reserve." A pause. "I would like to see it tested."' },
    ],
    options: [{ text: '(Go on.)', next: 'pell_struck' }],
  },
  pell_struck: {
    speaker: 'narrator',
    text: axes(
      [{ text: '"And then?" Pell says. "That\'s the part I don\'t know. What happens to sixty people the city stops writing down?" The ring looks at you, because you have been where the writing is done.' }],
      [
        { if: PREC('yields'), text: 'You know, because the Court of Accounts ruled it in Comfort Asamoah\'s case: the record yields to the living. Strike Reserve 9 off the city\'s books and its people do not fall out of them. They are written down as what they are, living people outside any reserve, with nobody\'s order on them. Free, and the Court will hear them if anyone comes for them again.' },
        { if: STRUCK_TRAP, text: 'You know, because the Court of Accounts ruled it in Comfort Asamoah\'s case: what has no record is abandoned property. Strike sixty people off the city\'s books and the city\'s own law has a word for them, and the word is salvage. And there is a factor at the stand at the top of Knock with a book of claims and the guild behind her, and a column that cannot carry what is not fit but will stand aside while she does. She would not even have to wait for the door to open. She would only have to write their names down first.' },
        { if: PREC('property'), text: 'You know, because the Court of Accounts ruled it in Comfort Asamoah\'s case: what has no record is abandoned property. Strike sixty people off the city\'s books and the city\'s own law has a word for them, and the word is salvage. There is nobody at the stand today with a book of claims. There will be, the first time a buyer reads the register.' },
        { if: PREC('outside'), text: 'You know, because the Court of Accounts ruled it in Comfort Asamoah\'s case: the Court has no jurisdiction over people with no record. Strike Reserve 9 off the city\'s books and nobody can order it anywhere again. Nobody can protect it either. Free the way the wind is free: nobody\'s, and nobody\'s business.' },
        { text: 'Nobody has ever asked the Court of Accounts what a person with no record is. Strike Reserve 9 off the city\'s books and there is no order for its people any more, and no law that has heard of them. Free, and no court that would hear them if anyone came.' },
      ],
    ),
    again: 'What happens to sixty people the city stops writing down.',
    effects: [{ learn: 'a3_pell_struck' }],
    interject: [
      { companion: TAMSIN, if: PREC('property'), text: '"Not written down." Tamsin\'s voice is flat. "That\'s what it did to me. You don\'t get to be free. You get to be nobody\'s. And then you\'re anybody\'s."' },
      { companion: WREN, if: STRUCK_TRAP, text: '"That\'s a sale," Wren says. "With a court in the middle so nobody has to say so."' },
      { companion: KES, if: PREC('property'), text: '"That\'s how the Skirts filled," Kes says. "Nobody\'s people. Then the Concern\'s."' },
      { companion: NINE, text: '"The register reads as {name} says," Nine says, and gives the heading of the ruling word for word, and its date, as if reading it off the inside of its own eye.' },
      { companion: TAMSIN, text: '"Off the books," Tamsin says. "I\'ve been off the books my whole life. It\'s roomier than you\'d think."' },
    ],
    options: [{ text: '(Go on.)', next: 'pell_choose' }],
  },
  pell_choose: {
    speaker: PELL,
    text: 'There is a stack of blank charts in front of Pell that was not there a minute ago; Effie fetched them from the clinic without being asked. "So," he says. "I have never lied on one of these. I ticked no once, and it was true, and a child went off the count for good. I don\'t know what a lie does." He picks up his pen and does not uncap it. "What do I write?"',
    again: '"What do I write?" Pell says, the pen still capped.',
    options: [
      { id: 'ring.pell.aide', text: 'You taught me to splint a leg through a grille. Trust me once more. Tick no, sixty times.', if: { origin: 'clinic_aide' }, effects: PELL_UNFIT, next: 'pell_unfit' },
      {
        id: 'ring.pell.unfit', text: 'Tick no. Sixty times. Half of it\'s true, and the other half is the city\'s own word turned round on it.', if: NOT({ origin: 'clinic_aide' }),
        check: { skill: 'speech', dc: 40, mods: PELL_MODS }, effects: PELL_UNFIT, next: 'pell_unfit', fail: 'pell_refused', failEffects: PELL_REFUSED,
      },
      { id: 'ring.pell.fit', text: 'Write what\'s true.', effects: PELL_FIT, next: 'pell_fit' },
      { text: '(Not yet.)', if: NOT(VOTED), next: 'hub' },
      { text: '(Not yet.)', if: VOTED, next: 'after' },
    ],
  },
  pell_unfit: {
    speaker: PELL,
    text: [
      { if: STRUCK_TRAP, text: 'Pell uncaps the pen. He starts with Sayer, because Sayer\'s is true; then Teague\'s, whose lungs are seventy-two years old; then the rest, one by one, in his small upright hand, each box ticked with the same short stroke. Nobody in the doorways speaks. It takes him most of an hour. When he has finished he squares the stack and puts his hand flat on it. "There," he says. "I\'ve lied to the city in writing. I\'d like somebody to remember I was sorry about the ones that weren\'t true." He does not look up. "And I\'d like somebody to tell me who comes for them now."' },
      { text: 'Pell uncaps the pen. He starts with Sayer, because Sayer\'s is true; then Teague\'s, whose lungs are seventy-two years old; then the rest, one by one, in his small upright hand, each box ticked with the same short stroke. Nobody in the doorways speaks. It takes him most of an hour. When he has finished he squares the stack and puts his hand flat on it. "There," he says. "I\'ve lied to the city in writing. I\'d like somebody to remember I was sorry about the ones that weren\'t true."' },
    ],
    again: 'Sixty charts in a square stack under Pell\'s hand.',
    interject: [
      { companion: NINE, text: '"I will log sixty errors," Nine says, "if I am asked. I have not been asked."' },
      { companion: ODILE, text: '"Sixty sheets at a price nobody can check," Odile says. "I have done worse with less paper, and slept."' },
    ],
    options: BACK,
  },
  pell_refused: {
    speaker: PELL,
    text: 'Pell looks at the pen for a long time, and puts it down still capped. "No," he says. "I ticked no once because it was true, and a child lived her whole life off the count on what MOTHER could spare out of sixty rations. I don\'t know what a lie would do. I\'m a doctor. I\'m not going to find out on sixty people." He pushes the blank charts away. "I\'ll send nothing this quarter. They\'ve last quarter\'s on file. It says what it says."',
    again: '"It says what it says," Pell says.',
    options: BACK,
  },
  pell_fit: {
    speaker: PELL,
    text: '"True." Pell uncaps the pen, and you watch the relief go through him like a drink. "Fit, then, mostly. We\'re short and pale and our teeth are bad, but the city\'s form has never asked about any of that." He ticks the boxes in his small upright hand, one after another, and stops at one chart. "Except Sayer. Sayer\'s no." Across the table, Sayer nods as if he has been told the soup is ready. "The city takes the fit," Pell says. "I\'ve written down who that is. What anybody does about it isn\'t a doctor\'s business."',
    again: 'Sixty charts, ticked yes, and one ticked no.',
    interject: [{ companion: TAMSIN, text: 'Tamsin looks at Sayer, and then at the one chart Pell has set aside, and you can see her doing the sum the city does. She doesn\'t say it.' }],
    options: BACK,
  },

  // ------------------------------------------------ Bram
  bram: {
    speaker: BRAM,
    text: [
      { if: ASLEEP, text: 'Bram is on the floor in the doorway with the manual on his knees. "Asleep," he says, without looking up. "You saw. I can wake her. Page forty-one." He turns a page he does not read. "What do you want with me now?"' },
      { if: BURNED, text: 'Bram does not look up. "Fed," he says. "One trunk and a slot for paper. That\'s all any of them eats." He turns the rag over in his hands. "I could have told the Choir\'s people how to put her to sleep without burning her. Page forty. Nobody asked. They brought oil." He looks at you then. "Why? Whose are you thinking of?"' },
      { text: '"No." Bram says it before you have finished asking, and then, because he repeats himself, again. "No. I know how. There\'s a page in her manual says how, and I\'ve read it every night since I was nine, the way some people read the Choir\'s book, so I\'d know it the night somebody asked. Somebody\'s asked. No." He wipes his hands on the rag, though they are clean. "She keeps the air. She keeps the water. She kept Tamsin. You don\'t put that to sleep because you\'re frightened of what it\'ll do awake."' },
    ],
    again: '"Page forty," Bram says. "I know it by heart."',
    effects: [{ learn: 'a3_caretaker_sleep' }],
    options: [
      { id: 'ring.bram.core', text: 'Not her. The one under the Spire. Is it fed the same way?', once: true, check: { skill: 'speech', dc: 40, mods: BRAM_MODS }, effects: TRUNK, next: 'bram_trunk', fail: 'bram_no', failEffects: [TRUST(BRAM, -3)] },
      ...BACK,
    ],
  },
  bram_trunk: {
    speaker: BRAM,
    text: 'Bram is quiet so long that Teague opens her mouth, and he holds up one hand without looking at her, and she shuts it. "Same make," he says. "Bigger. There\'s a plate inside her cabinet: the city\'s mark and a number, and her number\'s low. Every machine of her make eats two things. Paper, down a slot, from whoever sends it; the couriers. And power, up one trunk, through two couplings at the cabinet." He holds up two fingers, and folds one down. "Pull the second coupling and it sleeps. Wakes in the morning with its schedule and its memory and a little gap where the night was. Pull the first, under load, and it doesn\'t wake. Not ever. It isn\'t a fuse. It\'s the whole of what it is." He looks at his hands. "The first coupling is on page forty-one, in red, with a line round it that says don\'t. That\'s what you\'re asking me. Somebody with good hands and a steady stomach, at the foot of its trunk, and the first coupling. There. I\'ve said it. I never said it about her."',
    again: '"The first coupling," Bram says. "Page forty-one. In red."',
    passives: [{ skill: 'mechanics', dc: 50, text: 'You can see it as he says it: the cabinet, the trunk, the two couplings, and the weight of a live line in your hands. You could do it. It would not take long.' }],
    interject: [
      { companion: NINE, text: 'Nine has gone entirely still, the way it does when it is not filing something. "I heard that," it says. "I wish it noted that I heard it, and did not like it."' },
      { companion: ASH, text: 'Ash closes his eyes, briefly, like a man who has been handed the blade he asked for.' },
      { companion: KES, text: '"Two couplings," Kes says to herself. "Everything the Concern ever built had a second one too. You just never found it."' },
    ],
    options: BACK,
  },
  bram_no: {
    speaker: BRAM,
    text: 'Bram looks at you, and you can see him weigh it, and you can see where it comes down. "No," he says. "I don\'t know you. I know your voice through a plate. That isn\'t the same thing." He folds the rag. "Ask me about her pumps any day you like. Not that."',
    again: '"Not that," Bram says.',
    options: BACK,
  },

  // ------------------------------------------------ the vote
  vote: {
    speaker: 'narrator',
    text: VOTE_LEAD,
    again: 'The ring, waiting for the hands.',
    passives: [
      { if: R_REFUSALS, label: 'The room', text: 'They know MOTHER told the city no three times, in the words she says goodnight with.' },
      { if: CARD, label: 'The room', text: 'They know she hid a child from the count, and which child.' },
      { if: FACES, label: 'The room', text: 'They have seen a face from Knock, and it is yours.' },
      { if: UNFIT, label: 'The room', text: 'They know Pell has ticked no sixty times.' },
      { if: HATCH, label: 'The room', text: 'They know who told on the two at the hatch.' },
    ],
    options: [
      { id: 'ring.v.shut', text: 'Keep the door shut. Whatever comes up that road, let it knock.', if: DEF_SEALED, effects: RING('sealed', 'shut'), next: 'v_sealed' },
      { id: 'ring.v.shut.argue', text: 'Keep the door shut. Whatever comes up that road, let it knock.', if: DEF_OPEN, check: { skill: 'speech', dc: 40, mods: SHUT_MODS }, effects: RING('sealed', 'shut'), next: 'v_sealed', fail: 'v_open', failEffects: RING('open', 'shut') },
      { id: 'ring.v.open', text: 'Open it when the column has gone, and walk out on your own feet. Out and back, if you like.', if: DEF_OPEN, effects: RING('open', 'open'), next: 'v_open' },
      { id: 'ring.v.open.ines', text: 'Open it when the column has gone, and walk out on your own feet. Out and back, if you like.', if: F('a3_ines', 'seals'), check: { skill: 'speech', dc: 50, mods: OPEN_MODS }, effects: RING('open', 'open'), next: 'v_open', fail: 'v_sealed', failEffects: RING('sealed', 'open') },
      { id: 'ring.v.open.teague', text: 'Open it when the column has gone, and walk out on your own feet. Out and back, if you like.', if: FELL, check: { skill: 'speech', dc: 55, mods: OPEN_MODS }, effects: RING('open', 'open'), next: 'v_open', fail: 'v_sealed', failEffects: RING('sealed', 'open') },
      { id: 'ring.v.city', text: 'Go with the column. The city has clinics and doctors with lights, and ninety years in the dark is long enough.', if: DEF_OPEN, check: { skill: 'speech', dc: 55, mods: CITY_MODS }, effects: RING('city', 'city'), next: 'v_city', fail: 'v_open', failEffects: RING('open', 'city') },
      { id: 'ring.v.city.sealed', text: 'Go with the column. The city has clinics and doctors with lights, and ninety years in the dark is long enough.', if: DEF_SEALED, check: { skill: 'speech', dc: 55, mods: CITY_MODS }, effects: RING('city', 'city'), next: 'v_city', fail: 'v_sealed', failEffects: RING('sealed', 'city') },
      { id: 'ring.v.yours', text: 'It\'s yours. I\'m from Knock. I don\'t get a hand.', if: DEF_OPEN, effects: RING('open', 'yours'), next: 'v_open' },
      { id: 'ring.v.yours.sealed', text: 'It\'s yours. I\'m from Knock. I don\'t get a hand.', if: DEF_SEALED, effects: RING('sealed', 'yours'), next: 'v_sealed' },
    ],
  },
  v_sealed: {
    speaker: 'narrator',
    text: axes(SEALED_LOST, SEALED_HANDS, SEALED_AIR),
    again: 'The door stays shut.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin lets go of the back of your chair at last. "Shut, then," she says. "I can stand in a shut door. I\'ve had practice."' },
      { companion: ILYA, text: 'Ilya counted the hands. "Five," he says. "And fifty-five that didn\'t get asked." He doesn\'t make it sound like an accusation. He makes it sound like a number.' },
      { companion: ASH, text: 'Ash lets out a breath. "A shut door is a kind of sky too," he says. "A low one."' },
    ],
    options: [
      { text: '(Go on.)', if: ALL(FELL, NOT(BURNED)), next: 'cut' },
      { text: '(Go on.)', if: NOT(ALL(FELL, NOT(BURNED))), next: 'after' },
    ],
  },
  v_open: {
    speaker: 'narrator',
    text: axes(OPEN_LOST, OPEN_HANDS, OPEN_MOTHER),
    again: 'Out and back.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin has her hand over her mouth. When she takes it away she is laughing, or the other thing. "Rust it," she says. "Rust it, Ola."' },
      { companion: ASH, text: 'Ash puts his hand flat over his heart, where the Choir keep the sky. "Out and back," he says. "That\'s a prayer, that is."' },
      { companion: ILYA, if: FELL, text: '"Six," Ilya says. "And fifty-four standing who\'ll walk out of it anyway, once it\'s open." He seems pleased by the arithmetic.' },
      { companion: ILYA, text: '"Seven," Ilya says. "And fifty-three standing who\'ll walk out of it anyway, once it\'s open." He seems pleased by the arithmetic.' },
      { companion: WREN, text: '"Out and back," Wren says. "Somebody had better show them the back part."' },
    ],
    options: [{ text: '(Go on.)', next: 'after' }],
  },
  v_city: {
    speaker: 'narrator',
    text: axes(CITY_HANDS, CITY_MOTHER),
    again: 'Sayer\'s apron, folded square on the table.',
    interject: [
      { companion: TAMSIN, text: 'Tamsin has gone white. She does not say anything at all. She takes her hands off the back of your chair and puts them in her pockets, and she does not take them out again.' },
      { companion: NINE, text: '"A reserve that consents," Nine says, "is a reserve the schedule did not need to compel. I will note that it was asked." It does not say whether that is good.' },
      { companion: KES, text: '"They\'ll weigh you at the gate," Kes says to Effie, very gently. "Don\'t let them see you\'re scared. They price that too."' },
    ],
    options: [{ text: '(Go on.)', next: 'after' }],
  },

  // ------------------------------------------------ Teague's order to Bram
  cut: {
    speaker: TEAGUE,
    text: 'Teague does not sit down. "Bram," she says. "Put her to sleep." The room goes still. "There is a Knock child at this table tonight, and she never once asked the ring whether there should be. She hid one of ours from the count since the day she was born and told none of us. A machine that decides who to keep will decide who to let in, and one night it will decide the column is kinder than we are, and open the door while we sleep." She does not look at the grille. "Page forty. You told me once it sleeps with the fans on. Do it." Bram has stood up. His hands are shaking, and he looks at them as if they belonged to somebody else. Over the door, the click; then MOTHER, slow and formal: "Resident Coyle. You have the manual open at page forty."',
    again: 'Bram, standing, his hands shaking. Teague, waiting.',
    interject: [
      { companion: TAMSIN, text: '"She kept me," Tamsin says. Not loud. To Bram, only. "Bram. She kept me."' },
      { companion: KES, text: 'Kes\'s hand has gone to the back of her neck. "Don\'t," she says, and doesn\'t seem to know she said it aloud.' },
    ],
    options: [
      {
        id: 'ring.cut.stop', text: [{ if: SEEN('ring.bram'), text: 'Bram. You told me you won\'t. Don\'t.' }, { text: 'Bram. Don\'t. She has kept the air in your mouth your whole life.' }],
        check: { skill: 'speech', dc: 45, mods: CUT_MODS }, effects: STOPPED, next: 'cut_stopped', fail: 'cut_done', failEffects: PUT_TO_SLEEP,
      },
      { id: 'ring.cut.let', text: '(Say nothing. It is the ring\'s to decide.)', effects: PUT_TO_SLEEP, next: 'cut_done' },
    ],
  },
  cut_stopped: {
    speaker: BRAM,
    text: axes(
      [
        { if: SEEN('ring.bram'), text: 'Bram looks at you, and at Teague, and at the grille. Then he sits down again, very carefully, as if the chair might not be there. "No," he says. "I told you. I said I won\'t. I won\'t."' },
        { text: 'Bram looks at you, and at Teague, and at the grille. Then he sits down again, very carefully, as if the chair might not be there. "No," he says. "I\'ve read page forty every night since I was nine, so I\'d know it the night somebody asked. Somebody\'s asked. I won\'t."' },
      ],
      [{ text: 'He puts his shaking hands flat on the table. "Weld the door, Rosalind. I\'ll hold the lamp. I\'ll sit up with her every night. If she opens it, it\'ll be over me, and she won\'t, because she\'d have to step over me to do it." Teague looks at him for a long time, and then she nods, once, which is as near as she comes to losing. Over the door, after a moment, MOTHER says, "Thank you, Resident Coyle," and then, as if correcting herself: "Thank you, Bram."' }],
    ),
    again: 'Bram at the table, his hands flat on the wood.',
    options: [{ text: '(Go on.)', next: 'after' }],
  },
  cut_done: {
    speaker: 'narrator',
    text: axes(
      [{ if: SEEN('ring.cut.stop'), text: 'It nearly works. You see it nearly work. Then Teague says his name again, and he goes.' }, { text: 'Bram goes. Nobody stops him.' }],
      [{ text: 'You hear him in the machine room through the wall: the cabinet door, a long quiet, then the sound of a coupling coming apart, which is a small sound, smaller than a door. The lights do not go out. The fans do not stop. The hum changes key, and the click over the door does not come again. When Bram comes back he does not sit at the table. He sits on the floor in the doorway with his back to the frame and the manual on his knees, open at page forty. "Asleep," he says, to nobody. "Not dead. Asleep. Page forty-one is how you wake her." Nobody asks him to.' }],
    ),
    again: 'Bram on the floor in the doorway, the manual open on his knees.',
    interject: [{ companion: TAMSIN, text: 'Tamsin walks out of the room. You hear her in the machine room, after, talking to the cabinet in a low voice, the way you talk to somebody who is asleep in a clinic bed. Nobody follows her.' }],
    options: [{ text: '(Go on.)', next: 'after' }],
  },

  // ------------------------------------------------ after the ring
  after: {
    speaker: 'narrator',
    text: axes(AFTER_STATE, AFTER_WHO, AFTER_MOTHER),
    again: 'The council table.',
    options: [
      { id: 'ring.after.bram', text: [{ if: ASLEEP, text: 'Bram. The one under the Spire. Is it fed like her?' }, { text: 'Bram. Could a caretaker be put to sleep?' }], if: ALL(NOT(SEEN('ring.bram')), NOT(SEEN('ring.bram.core'))), once: true, next: 'bram' },
      { id: 'ring.after.pell', text: 'Doc. The forms you send the city every quarter.', if: ALL(NOT(SEEN('ring.pell')), NOT(F('a3_pell')), NOT(F('a3_c9'))), once: true, next: 'pell' },
      { id: 'ring.after.pell.back', text: 'Doc. The charts. What will you write?', if: ALL(KNOWS('a3_pell_struck'), NOT(F('a3_pell')), NOT(F('a3_c9'))), next: 'pell_choose' },
      { text: '(Leave the table.)', exit: true },
    ],
  },
};

/** The ring: Cistern 9's council table. */
export const d_a3_council: DialogueDef = {
  id: 'd_a3_council', owner: INES,
  start: [
    { if: VOTED, node: 'after' },
    { if: ALL(CALLED, RING_CAN_SIT), node: 'hub' },
    { if: RING_CAN_SIT, node: 'call' },
    { node: 'table' },
  ],
  nodes: NODES,
};

export const A3_RING_DIALOGUES: DialogueDef[] = [d_a3_council];
