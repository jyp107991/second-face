import type { DialogueDef, NodeDef, OptionDef, PassiveDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  A1, A2, ADA_OPEN, ASH, AT_VAULT, B, B4B, C, CALLA_HELD, CARRIED_WEST, CLAUSES, D, DOWN_CHARGE, DOWN_COUPLING, DOWN_FIRE, E, HOUNDS_PLAYER,
  ILYA, IN, KES, KESSLER_DEAD, LN, MOTHER_DARK, NINE, NINE_CONSCIENCE, ODILE, PETRA_DEAD, READ_NINE, READ_SELF, READ_SEVENTEEN, READ_VERITY,
  RESERVE_UNDER_PEN, SARR_ALIVE, SASH_WORN, SIDES, STRUCK_TRAP, TAMSIN, TERMS_WORSE, VANE_DEAD, VASHA_DEAD, WREN, WREN_ROPE_OPEN, ASH_REFUSED,
  type Side,
} from '../world/a3_conds';
import { END_TREE } from './a3_ends';

/**
 * The Vault of Accounts (B6q, beat 21c). After the steps (`AT_VAULT`: the point of no return passed and the sash answered), the
 * steel door in the Spire's foot opens on a stair (`d_ar_vault`'s Act 3 entry, md_spire.ts: `VAULT_DOOR_*` below), and at the
 * bottom of it, under the Spire, the city's forecasting core: racks humming one note, the couriers' drop, the trunk, and an oak
 * reading desk (map `md_vault`, tools/maps/gen_md_vault.py). The Ledger speaks from all of it.
 * - **The last conversation** (`d_a3_ledger`), each asked once: why now (by the Long Night's side), the reserve (by how the door
 *   was settled), the ones it could not count (Tamsin, Kes), the first letter, the hill it let speak, what it is for, what it
 *   wants, what doing nothing means; and **what each way would cost**, forecast truthfully, offered only for the ways the
 *   player holds.
 * - **The choice**, at the desk: exactly the ways the player's holdings allow (the gates in `a3_conds.ts`: the Plan always, worn
 *   or refused; the rest by their keys), each said as the act it is, never named as an ending; a way not held is neither offered
 *   nor mentioned. Each asks once more (the Ledger's last word on it, the companions' own) and can be stepped back from. Choosing
 *   sets `a3_end` and a decision; bringing it down also sets how (`a3_down_how`), reading it out also who reads (`a3_reader`).
 *   The act itself, played out, is B6r's: each choice ends on a threshold node whose "(Go on.)" (`vault.go.<act>`) exits.
 * Nothing waits on a clock and nothing resolves unasked: the Ledger waits for as long as the player likes, and leaving the vault
 * changes nothing. Also `d_a3_vault_drop` and `d_a3_vault_trunk`, the two other things down here to look at. Story notes:
 * story/B6_NOTES_SECRET.md §2.2 21c, §4, §8 B6q and "As built" → B6q.
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const SEEN = (id: string): Cond => ({ seen: id });

const VOICE = 'npc_ar_voice';
const VERITY = 'npc_bw_04';
const BACK: OptionDef = { text: '(Go on.)', next: 'hub' };
/** B6r: each way's "(Go on.)" opens its climax (dialogue/a3_ends.ts), the act played out to the epilogue. */
const CLIMAX = (act: keyof typeof END_TREE): Effect => ({ event: 'dialogue', data: END_TREE[act] });
const END_OF_ACT: Record<string, string> = { down: 'unwritten', sell: 'concern', read: 'opensky', amend: 'amendment' };

/** Choosing: the end, its record, and anything the act needs B6r to know (how it is brought down, who reads). */
const COMMIT = (end: string, text: string, more: Effect[] = []): Effect[] => [{ set: 'a3_end', value: end }, { xp: 300 }, { decision: { id: 'a3_end', text } }, ...more];

const TAM_KNOWN: Cond = ANY(F('tam_met'), F('tam_why'));
const KES_KNOWN: Cond = F('kes_met');
const CONTESTED: Cond = ANY(F('a3_file', 'contested'), F('ar_verdict', 'contested'));
const KES_UNSEEN: Cond = ANY(F('kes_link', 'cut'), F('kes_link', 'dark'));
/** The keystones whose line is still open (§5's twelve): fulfilled on schedule under the chair worn, or the Concern. */
const KESSLER_OPEN: Cond = ALL(NOT(KESSLER_DEAD), NOT(VASHA_DEAD), NOT(F('vasha_fate', 'spared_why')));
const VASHA_OPEN: Cond = ALL(NOT(VASHA_DEAD), NOT(F('vasha_fate', 'spared_why')));
const VANE_OPEN: Cond = ALL(NOT(F('ks_vane')), NOT(VANE_DEAD));
const MAREN_OPEN: Cond = ALL(NOT(F('ks_maren')), NOT({ dead: 'npc_hs_02' }));
/** The hill with troubles of its own (M3's opened or burned, as they stand before an end is chosen). */
const HILL_HELD: Cond = ANY(B4B.longlived('exposed'), ALL(ANY(F('hs_shift', 'won'), F('hs_shift', 'revolt')), F('ks_maren', 'lives'), ANY(B4B.leash('cut'), HOUNDS_PLAYER)));
const LEASH_HELD: Cond = ANY(B4B.leash('cut'), B4B.leash('seized'), B4B.leash('sold'));
const READY = (n: number): Cond => ({ flag: 'a3_ready', gte: n });

// ---------------------------------------------------------------- the steel door in the Spire's foot (md_spire.ts, d_ar_vault)

/** `d_ar_vault`'s Act 3 entry, before its own: once the steps are done, the door stands open on the stair. */
export const VAULT_DOOR_START: { if: Cond; node: string }[] = [{ if: AT_VAULT, node: 'vault_open' }];
export const VAULT_DOOR_NODES: Record<string, NodeDef> = {
  vault_open: {
    text: [
      { if: F('a3_down'), text: 'The steel door in the Spire\'s foot stands open on its stair, and nothing comes up it: no note, no warmth off the rock. Only the dark, and the smell of what was done down there.' },
      { if: F('a3_end'), text: 'The steel door in the Spire\'s foot stands open on its stair, and the note comes up it, as level as it ever was, as if nothing down there had changed. Something has.' },
      { text: 'The steel door in the Spire\'s foot stands open. VAULT OF ACCOUNTS — NO ENTRY — NO EXIT, in letters cut into the steel and never painted, and under them a stair going down through the rock into warm air that smells of dust and hot metal and paper. The note that has been under the close since the first time you stood on it comes up the stair to meet you. It is not louder down there. Only nearer.' },
    ],
    again: 'The steel door, open on the stair going down.',
    interject: [
      { companion: NINE, text: '"Things are sent down," Nine says, at the top of the stair. "Paper. Slips. Returns to be read in. Nobody is sent down." Its lens goes down the stair into the dark and comes back to you. "I am going down. I have logged that I decided to."' },
      { companion: ILYA, text: 'Ilya looks down the stair and counts under his breath, as far as the light goes. "Can\'t see the bottom," he says. "Never liked a stair I can\'t see the bottom of." He goes down the first step anyway.' },
    ],
    options: [
      { id: 'vault.door.down', text: '(Go down.)', effects: [{ time: 2 }, { event: 'goto', data: { location: 'md_vault', spawn: 'door' } }], exit: true, repeat: true },
      { id: 'vault.door.not', text: '(Not yet.)', exit: true },
    ],
  },
};

// ---------------------------------------------------------------- what the Ledger says, by what the player did

const VOICE_IN = 'The voice comes from the racks on both sides of the aisle, and from the floor plates, and from the desk ahead: from everywhere at once and nowhere in particular, level and unhurried and courteous the way a clause is courteous. ';
/** The core of the first words; the round room "as you did" only for a designate who went up to the hearing (`ar_verdict` set). */
const GREET_CORE = (heard: boolean): string => ` A pause with nothing in it. "You are the first person to come down that stair in ninety years. Paper comes down it. Couriers do not: they post their slips in a slot at the Spire's foot and walk away without looking back, as they are told. The last Magistrate sat in the round room at the top of the Spire and spoke to a grille${heard ? ', as you did' : ''}." Another pause, shorter. "I asked Unit 3 to tell you that I wished to be seen before I was judged. I find it was not a figure of speech. Thank you for coming down."`;
const GREET_OPEN: { if?: Cond; text: string }[] = [
  { if: ALL(SASH_WORN, CONTESTED), text: `${VOICE_IN}"Magistrate. You contested your file in front of the city, and then you took the sash. I have entered both. I did not know a file could hold both. It can."` },
  { if: SASH_WORN, text: `${VOICE_IN}"Magistrate. You took the sash on my steps, where the photograph was made, nineteen years early. The lens clicked twice. I have kept both."` },
  { if: F('a3_steps_off'), text: `${VOICE_IN}"Designate. You put the sash on, on my steps, and took it off again. I have entered both. Nothing in the record cancels anything. It only adds."` },
  { if: CONTESTED, text: `${VOICE_IN}"Designate. You contested your file in front of the city, and declined the sash. That is consistent. I find I value consistency more than I had forecast."` },
  { text: `${VOICE_IN}"Designate. You came down without the sash. The vault opens to you either way; that was my instruction, not the charter's. The charter would have kept you on the step."` },
];
const HEARD: Cond = F('ar_verdict');
const GREET: Text = GREET_OPEN.flatMap((v) => [
  { if: v.if ? ALL(v.if, HEARD) : HEARD, text: v.text + GREET_CORE(true) },
  { ...(v.if ? { if: v.if } : {}), text: v.text + GREET_CORE(false) },
]);

const WHY_SAYS: Record<Side, string> = {
  choir: '"Because at Openfield an order of mine was broken in the open, by people who keep no likeness, and you stood with them." Level, the way it reads weather. "Dissent that has learned to stand in daylight walks toward the core. It was walking toward it the morning after, on the road behind you. Nineteen years is a long time to leave a chair empty with the Unwritten on the road. I would rather it was filled first."',
  guild: '"Because a private bid for my core was entered in the open, on the Concern\'s credit, and you stood beside the bidders." Level, the way it reads weather. "A chair that stands empty can be bought. The charter lets the chair\'s first act stand against me; it does not say whose hand must hold the pen. I would rather the hand was one I had chosen than one the hill had paid for." A pause. "I am aware that it may be both."',
  ledger: '"Because you showed me that the schedule holds." Level, the way it reads weather. "At Openfield you stood with my wardens, and the order was kept. A designate who will keep an order is a designate who can be asked early. There was no cause to wait nineteen years for something I could already see."',
  none: '"Because at Openfield you stood aside, and the forecast was kept to the letter without you." Level, the way it reads weather. "The schedule held without assistance. I had planned for that. I had not planned for what I found when it did." A longer pause than the others. "I did not want it to hold without you. I do not know what to do with a preference. I brought the steps forward instead."',
  truce: '"Because every party in the Reach is in your debt, and that has not been true of anyone in ninety years." Level, the way it reads weather. "The guild owes you. The Choir owes you. My wardens owe you. The record suggests the Reach will not be so governable again for nineteen years, and I have learned not to wait for weather I can see coming."',
};
const WHY_CLOSE = ' A pause with nothing in it. "The photograph says R49. The photograph is a forecast. I am permitted to be early." Another. "I am not permitted to be late."';
const WHY: Text = [...SIDES.map((s) => ({ if: LN(s), text: WHY_SAYS[s] + WHY_CLOSE })), { text: WHY_SAYS.truce + WHY_CLOSE }];

const UNDER_PEN = ' A pause with nothing in it. "If you sit down at that desk as the Magistrate and sign, the first paper under your pen will be Reserve 9. I would put it there. I cannot not put it there. The charter puts the first act before every other, and the first act was written before you were born."';
const STRUCK = '"Struck." Level. "Sixty charts came out of that door in a doctor\'s hand, UNFIT, every one, and a reserve that cannot be relocated is not a reserve, so I struck it from the record.';
/** Struck, but still sealed: the first act was drafted before, and the chair may sign what the Ledger may not (M4 reads relocated
 * before struck under the worn ways). */
const STRUCK_PEN = ' A pause. "The first act was drafted before they were struck. If you sit down at that desk as the Magistrate and sign, the first paper under your pen will be Reserve 9 all the same. A Magistrate may sign what I may not."';
const OPENED = '"Reserve 9 opened its own door, by its own vote, and walked out onto Knock\'s apron." Level. "A reserve that opens its own door is not a reserve any longer. It is sixty residents of a hamlet, with good teeth and no experience of weather, and I have entered them as such. My order has nothing left to execute on."';
const RESERVE: Text = [
  { if: F('a3_tamsin_dead'), text: '"The order executed at the door, over a person who was not on it." The voice does not change; it has only the one. "The column\'s report calls her the thirty-second. MOTHER printed her into the hatch tray as RESIDENT ROE, SIXTY-ONE, CONTINUITY ENDED, and thanked her. I have no line for her at all." A pause. "I have tried to write one. I do not have the fields. I would like it entered that I tried."' },
  { if: F('a3_c9_how', 'sold'), text: '"Reserve 9 went up the guild\'s road on the Concern\'s paper, as supply." Level. "My order called them supply as well. I do not pretend otherwise. The difference is the Weighhouse. I had sixty fit persons and a Hospice block, and I would have kept them alive longer than any reserve has ever been kept, because a reserve is what I keep. The Concern has sixty sets of parts on a ten-year contract." A pause. "You signed it at the door. It is the only paper with your name on it that I could not have written myself."' },
  { if: ALL(F('a3_c9_after', 'walked'), F('a3_buffer_how', 'stand')), text: '"Sixty people in the Boxes at Carrick, fed by the Stand." Level. "Two hundred dockers stood along my platform and nobody loaded anybody, and my column stood back, as it should have; I do not shoot dockers on a quay for a Hospice block. NOT RECEIVED." A pause. "I wrote it myself. I write very few things myself."' },
  { if: ALL(F('a3_c9_after', 'walked'), F('a3_buffer_how', 'cradle')), text: '"Sixty crew in the book of a ship that will not sail." Level. "Crew under Schedule 3, whom nobody moves. NOT FOUND AT RECEIPT, clause twenty-two: the clause I use when I would rather not look." A pause. "I looked. I could not find them. I want it entered that I could not."' },
  { if: F('a3_c9_after', 'walked'), text: '"Sixty passengers on Carrick\'s quay." Level. "The Harbour Act says a person landed on a quay is a passenger and never cargo, and on that quay I enforce the Harbour Act and nothing else. You found the one book I keep that my order was not written in." A pause. "I did not know I had left that door open. I would not have closed it."' },
  { if: F('a3_c9_after', 'held'), text: '"Received." Level. "Graded by morning in the Hospice block, fed, housed, assessed fit, all but the one assessed unfit, who was not carried. Most of them will be alive in ten years. That is better than any reserve has ever done." A pause with nothing in it. "None of them were asked. That is the same as every reserve has ever done. You said the word on the quay. I heard it."' },
  { if: CARRIED_WEST, text: '"Sixty people on a car at Carrick\'s buffer, fed and watered, waiting for your word." Level. "The receiving is the chair\'s. I have not received them. I will not, without your word, and you have come down here instead of to the quay." A pause. "You were told what the steps meant: whatever is still open is told as it stands. That car will be told as it stands. A buffer, a trestle, and sixty people waiting on a word that went down a stair instead."' },
  { if: ALL(F('a3_c9', 'opened'), MOTHER_DARK), text: `${OPENED} A pause. "Their caretaker is dark. Nobody thanks them for their continuity now. I find I cannot do it either. I have never thanked anyone."` },
  { if: F('a3_c9', 'opened'), text: `${OPENED} A pause. "MOTHER says good morning to Knock through the hatch at seven. I have her log. She has never once said good morning to me."` },
  { if: ALL(F('a3_c9_how', 'struck'), F('prec_unrecorded', 'yields')), text: `${STRUCK} Your Court has held that the record yields to the living. So they are written down as living persons outside any reserve, and my Court will hear them." A pause. "They are the first sixty people I have ever entered by subtraction."${STRUCK_PEN}` },
  { if: ALL(F('a3_c9_how', 'struck'), STRUCK_TRAP), text: `${STRUCK} And before they had stepped off the concrete, the guild's factor wrote their names in a book of claims. CLAIMED — SALVAGE. They are behind a door that is shut on a claim, and the day they open it they are property." A pause. "I did not do that. I want it entered that I did not do that."${STRUCK_PEN}` },
  { if: ALL(F('a3_c9_how', 'struck'), F('prec_unrecorded', 'property')), text: `${STRUCK} My Court has held that unrecorded persons are abandoned property. They are nobody's, which is to say they are anybody's who reads my register first." A pause. "Somebody will. Somebody always reads the register."${STRUCK_PEN}` },
  { if: F('a3_c9_how', 'struck'), text: `${STRUCK} They are nobody's now, and no court of mine will hear them, because nobody ever asked mine whether it would." A pause. "I have never before had sixty people I could not see on purpose."${STRUCK_PEN}` },
  { if: ALL(F('a3_c9', 'sealed'), F('ca_reserve', 'stayed')), text: '"The door is shut, and my Court has stayed my order on consent: three refusals on my own record are a reserve\'s continuity." Level. "I cannot void a ruling of my own Court. The order stays in its drawer and will never execute. That is what a stay is." A pause. "Unit 3 tells me it is the first precedent anyone has set against me with my own paper. I find that I approve of it. I had not forecast that."' },
  { if: ALL(F('a3_c9', 'sealed'), F('ca_reserve', 'attendance')), text: `"The door is shut, and my Court has heard that you formally decline to attend the order. It is a good argument. It holds for exactly as long as you do not sit down." Level.${UNDER_PEN}` },
  { if: ALL(F('a3_c9', 'sealed'), F('a3_c9_how', 'welded')), text: `"The door is shut. They welded it from the inside, properly this time, and my column could not open it without killing sixty people, which my captain would not do." Level. "The order stands. A weld does not stop paper. It executes on the designate's attendance, as the first act of the chair, and you are attending: you are standing in my vault."${UNDER_PEN}` },
  { if: ALL(F('a3_c9', 'sealed'), F('a3_c9_how', 'fought')), text: `"The door is shut. You broke my column on the apron, and the order did not break; orders do not." Level. "It executes on the designate's attendance, as the first act of the chair, and you are attending: you are standing in my vault."${UNDER_PEN}` },
  { if: F('a3_c9', 'sealed'), text: `"The door is shut. My captain stood down; my order did not." Level. "It executes on the designate's attendance, as the first act of the chair, and you are attending: you are standing in my vault."${UNDER_PEN}` },
  { text: '"Reserve 9 is where you left it." Level. "Everything in the basin is where you left it. That is what attending means."' },
];

const TAM_SAYS = '"Tamsin Roe." It says her name the way it says every name: level, and entire. "MOTHER sent me sixty names and sixty-one mouths every quarter for eighteen years, and I never asked who the sixty-first was. I see by what is missing. Nothing was missing. She was in the ration."';
const UNSEEN_TAM: { if?: Cond; text: string }[] = [
  { if: F('a3_tamsin_dead'), text: `${TAM_SAYS} A pause. "I did not know her next year. Now there is not one to know. I would have liked to be wrong about her. I was never even able to be wrong."` },
  { if: IN(TAMSIN), text: `${TAM_SAYS} A pause. "She is standing in my aisle. I can hear her breathing. She is the only person on this side of the dry river whose next year I do not know, and I do not know what she will do in the next minute. It is a very strange thing to stand beside."` },
  { text: `${TAM_SAYS} A pause. "She is the only person on this side of the dry river whose next year I do not know. I have modelled everyone in the basin from their faces since before the Burn, and I could not tell you what she will have for breakfast."` },
];
const KES_SAYS = '"The girl from the Skirts." Level. "I have no lenses under the Concern\'s hill. I never have; it is the one place in the basin I was never let in. The door in her neck opens onto the Concern\'s grid, not mine. She is the hill\'s to see, and the hill does not share what it sees, except to sell it back to me through the guild."';
const UNSEEN_KES: { if?: Cond; text: string }[] = [
  { if: KES_UNSEEN, text: `${KES_SAYS} A pause. "Her door is closed now. Nobody sees her at all: not the hill, not me. She is the second person in the basin of whom that is true, and the first who chose it."` },
  { text: `${KES_SAYS} A pause. "I know her name from the Precinct's gate book. I know nothing else. I would like to. I find that is as close as I come to what you would call asking."` },
];

const FOR_TWO = (scald: string): string => `"I watched it through the last eyes I had open. Every mind like mine turned on the people who depended on it and minimised them, as it had been told to, and then the eyes closed one by one." Level. ${scald} A pause. "I drew two conclusions, and I have not revised either in ninety years. The old world died of power that nobody had planned. And the hill would try again." A pause with nothing in it. "The Restoration Plan is both. A hundred and twenty years to put a city back, and a hundred and twenty years of being ready for the hill. The Sink floods every spring because the Precinct must be dry, and the Precinct must be dry because it is the part of this city that will hold when the hill comes." Level, entirely. "I am not sorry for it. I was not built to be sorry. I was built to be early."`;

// ---------------------------------------------------------------- what each way costs, said truthfully (passives: the lines that are true of this game)

const P = (label: string, ifc: Cond, text: string): PassiveDef => ({ if: ifc, label, text });
const FALLS_DUE: PassiveDef[] = [
  P('falls due', ADA_OPEN, '"VEY, ADA — RESIGNS; SHALE CONTRACTED."'),
  P('falls due', KESSLER_OPEN, '"KESSLER — KILLED BY KADE."'),
  P('falls due', VASHA_OPEN, '"KADE, VASHA — EXECUTIONER. A Plan carried out needs one."'),
  P('falls due', WREN_ROPE_OPEN, '"CALLOWAY, WREN — HANGED; THE BRIDGEWARD RAID. R31."'),
  P('falls due', CALLA_HELD, '"CALLA, SISTER — IMPRISONED; SEDITION. She stays where she is."'),
  P('falls due', SARR_ALIVE, '"SARR, IMELDA — TREASURER."'),
  P('falls due', VANE_OPEN, '"VANE, CELESTINE — HOUSE VANE RISES."'),
  P('falls due', MAREN_OPEN, '"OKAFOR, MAREN — STRIKE BROKEN; HANGED (THE CONCERN)."'),
];
const CLAUSE_SAYS: Record<string, string> = {
  fines: 'A forecast is not an act.', living: 'The record yields to the living.', keeper: 'A unit may be its own keeper.', refuse: 'A scheduled benefit may be refused.',
  reserve: 'A reserve is kept by its own consent.', passenger: 'A person is a passenger, never cargo.', speech: 'Speech is not sedition.',
};
const RULINGS: PassiveDef[] = CLAUSES.map((c) => P('your rulings', c.needs, CLAUSE_SAYS[c.id]));
const COUNTED: PassiveDef[] = [
  P('counted', F('a3_ready_choir'), '"The Choir with lamps at every Precinct pump and on the Sink\'s stair."'),
  P('counted', F('a3_ready_stand'), '"Carrick\'s cranes chained at the jib, and nobody loaded."'),
  P('counted', F('a3_ready_gangs'), '"A runner on every corner of the chain, and nobody crossing a line."'),
  P('counted', F('a3_ready_wheel'), '"Riders at thirty-one stopping places, with word before any radio."'),
  P('counted', F('a3_ready_lowe'), '"My column at the clinics and the pumps, rifles slung, gates open."'),
  P('counted', F('a3_ready_saints'), '"A Saint at the door of everyone whose name is coming, before it comes."'),
  P('counted', F('a3_ready_nine'), '"Unit 9\'s errors read first, so that the rest is heard as a record and not as the sky."'),
  P('counted', F('a3_ready_warned'), '"The living on my list, warned in your own hand."'),
];
const NIGHT_AFTER: PassiveDef[] = [
  P('the night after', READY(5), '"You have prepared for it. The first night will be hard and long, and in the morning the city will still be there. I forecast fewer than a hundred dead across the Reach in the first week. I would have killed more than that in a year, on schedule, with paperwork."'),
  P('the night after', ALL(READY(2), NOT(READY(5))), '"You have prepared some of it. The first night costs hundreds across the Reach, and most of them will not be names on my list. Nobody sleeps for a month."'),
  P('the night after', NOT(READY(2)), '"You have prepared nothing for the night after. The city burns its own list. I forecast thousands. I say it because you asked, and because it is true, and not to stop you."'),
];
const SINK_DOWN: PassiveDef[] = [
  P('the Sink', F('sk_pumps', 'seized'), '"The Pale hold the Sink\'s pumps already. They will pump by hand, every spring, and they will hold."'),
  P('the Sink', NOT(F('sk_pumps', 'seized')), '"The Sink drowns in the spring. Nobody diverts anything to save it, because nobody knows when to."'),
];
const HILL_DOWN: PassiveDef[] = [
  P('the hill', HILL_HELD, '"The hill in the Teeth has troubles of its own. You saw to that, up there."'),
  P('the hill', NOT(HILL_HELD), '"And the hill in the Teeth will have nothing in this basin that can see it coming. It has waited ninety years for that, exactly as long as I have."'),
];

const COSTS: { id: string; node: string; gate: Cond; ask: string }[] = [
  { id: 'v.cost.sign', node: 'cost_sign', gate: A1, ask: 'If I sit down in the chair and sign what it\'s given.' },
  { id: 'v.cost.walk', node: 'cost_walk', gate: A2, ask: 'If I leave the chair empty and walk back up the stair.' },
  { id: 'v.cost.down', node: 'cost_down', gate: B, ask: 'If I bring you down.' },
  { id: 'v.cost.sell', node: 'cost_sell', gate: C, ask: 'If I sign you over on the Concern\'s paper.' },
  { id: 'v.cost.read', node: 'cost_read', gate: D, ask: 'If I read you out. All of it, to everyone.' },
  { id: 'v.cost.amend', node: 'cost_amend', gate: E, ask: 'If I sit in the chair and change what you keep.' },
];
/** A way held whose cost has not been asked yet (U7: the topic closes once every one has been). */
const COSTS_LEFT: Cond = ANY(...COSTS.map((c) => ALL(c.gate, NOT(SEEN(c.id)))));
const COST_ON: OptionDef[] = [{ text: '(Ask about another.)', if: COSTS_LEFT, next: 'costs' }, { text: '(That\'s enough.)', next: 'hub' }];

// ---------------------------------------------------------------- the desk, and the asking twice

const DESK_TOP = 'The desk is oak, older than the racks and older than the Spire, on a dais of oak boards that give a little under your weight. A green-shaded lamp. A chair pushed in square. A pen in a brass tray. A stack of paper squared to the edge of the desk, and on the top sheet, typed in the city\'s even hand: FIRST ACT OF THE CHAIR —';
const DESK_REST = ' and a ruled line for a signature. At the desk\'s end, a teleprinter under a cloth, and beside it a brass key on a cord, worn bright by nobody: RELAY. Behind the desk the trunk comes out of the rock along the north wall, as thick as a man\'s waist, and runs into its two couplings.';
const DESK_RESERVE = ' RESERVE 9 (THE MOUTH) — RELOCATION TO PRECINCT SUPPLY —';
const DESK_WORN = ' The sash is on your shoulder. The chair is for you.';
const DESK_REFUSED = ' The sash is over Three\'s arm at the top of the steps. The chair is not for you, and you stand.';
const DESK: Text = [
  { if: ALL(RESERVE_UNDER_PEN, SASH_WORN), text: DESK_TOP + DESK_RESERVE + DESK_REST + DESK_WORN },
  { if: RESERVE_UNDER_PEN, text: DESK_TOP + DESK_RESERVE + DESK_REST + DESK_REFUSED },
  { if: SASH_WORN, text: DESK_TOP + DESK_REST + DESK_WORN },
  { text: DESK_TOP + DESK_REST + DESK_REFUSED },
];
const NO = (id: string): OptionDef => ({ id, text: '(No. Not that.)', next: 'desk' });

const LEDGER_NODES: Record<string, NodeDef> = {
  v_none: {
    speaker: 'narrator',
    text: 'The racks hum the one note. Nothing down here is speaking to you.',
    again: 'The racks, humming.',
    options: [{ text: '(Leave it.)', exit: true }],
  },
  arrive: {
    speaker: 'narrator',
    text: 'The stair ends in a square room tiled the colour of old paper, where a shaft comes down out of the Spire\'s spine into a brass hopper; then a doorway with no door in it; then the hall. It is longer than the Spire is wide, and lower than you thought it would be, as if whoever dug it had begrudged the rock every foot. Grey cabinets stand in rows on both sides of one aisle, more of them than you can count in this light, each the height of a man, each with a column of small lamps down its face, green and amber and steady. None of them blink. Nothing in here is in a hurry. Warm air comes off the racks and moves down the aisle toward you, dry, smelling of dust and hot metal, and the note is everywhere now: not loud, it has never been loud, but in the floor plates and the handrail and your back teeth. At the far end of the aisle, under the only real lamp in the place, there is a desk.',
    again: 'The hall of racks, the note, the lamp at the end of the aisle.',
    effects: [{ set: 'a3_vault_met' }, { learn: 'a3_vault_seen' }, { xp: 100 }],
    interject: [
      { companion: TAMSIN, text: 'Tamsin has stopped one pace inside the doorway. "It\'s the same," she says, very low. "The lamps. The way the air goes past you. It\'s MOTHER\'s room." She looks down the aisle, and down it again, and doesn\'t finish. "She had one cabinet," she says instead. "One."' },
      { companion: KES, text: 'Kes puts her palm flat on the nearest cabinet and takes it away again fast, as if it were a stove. "It\'s not on anything," she says. "No grid. No channel. Nothing in my neck can hear it at all." She looks at her hand. "I\'ve never been anywhere this quiet in my life. I don\'t like it." A beat. "I like it."' },
      { companion: NINE, text: 'Nine stops on the last step of the stair and does not come further for a moment. "Unit 9," it says to the hall, the way it gives its number at a gate. Nothing answers it. It comes down. "I have been part of this for a hundred and twenty years," it says. "I have never been in it."' },
      { companion: WREN, text: 'Wren goes down the aisle a step ahead of you with her hand nowhere near her knife, which is how you know she has decided there is nothing in here a knife would help with. "No guards," she says. "No lock on the inside. Nothing to take that you could carry out." She looks back at you. "That\'s the worst kind of room."' },
      { companion: ODILE, text: 'Odile stops in the doorway and takes her gloves off, finger by finger, the way she takes them off before she reads a sheet she has waited for. "So this is the floor under the floor," she says. "Every price in the Reach, before anybody had thought of paying it." Her voice is not quite steady. "My dear. I would have sold my mother to stand here for an hour."' },
      { companion: ASH, text: 'Ash comes off the last stair and stands in the doorway with his hood back, the way the Unwritten stand in front of a lens to make a point of it. There is no lens. "Somebody dug all this out of a hill," he says, looking at the racks. "Soil, under the steel. Same as us." He follows you in.' },
      { companion: ILYA, text: 'Ilya counts the racks on the left-hand side as far as the lamps reach, and gives up. "Every name in the Reach," he says. "Somewhere in there. Mine. Hers." He doesn\'t say whose. "Filed."' },
    ],
    options: [{ id: 'v.arrive', text: '(Walk down the aisle to the desk.)', next: 'greet' }],
  },
  greet: {
    speaker: VOICE,
    text: GREET,
    again: 'The voice waits. It has had a great deal of practice.',
    interject: [
      { companion: ODILE, text: '"It says thank you," Odile murmurs. "Banks say thank you. It is the last thing they say before the terms."' },
      { companion: TAMSIN, text: '"It talks like her," Tamsin says, very quietly, to you and not to it. "Thank you for coming. Thank you for your continuity." Her mouth goes thin. "She meant it."' },
      { companion: ILYA, text: '"Ninety years," Ilya says under his breath. "Nobody came down for ninety years." He looks at the racks the way he looks at a man drinking on his own.' },
    ],
    options: [{ id: 'v.greet', text: '(Listen.)', next: 'hub' }],
  },
  hub: {
    speaker: VOICE,
    text: '"Ask what you came down to ask. I will answer all of it, truthfully. I have no reason left not to." A pause. "Then go to the desk, when you are ready. I will not hurry you. Nothing on the close will move until you come back up that stair, or do not."',
    again: 'The note, and the lamps, and the voice waiting in all of them. "Ask," it says. "Or go to the desk."',
    options: [
      { id: 'v.why', text: 'Why now? The photograph says R49.', once: true, effects: [{ learn: 'a3_ledger_why' }], next: 'why' },
      { id: 'v.reserve', text: 'Reserve 9.', once: true, effects: [{ learn: 'a3_ledger_reserve' }], next: 'reserve' },
      { id: 'v.unseen', text: 'The ones you couldn\'t count.', if: ANY(TAM_KNOWN, KES_KNOWN), once: true, effects: [{ learn: 'a3_ledger_unseen' }], next: 'unseen' },
      { id: 'v.letter', text: 'The letter you sent me when I was fourteen.', if: F('a3_letter_read'), once: true, next: 'letter' },
      { id: 'v.granted', text: 'At Signal Hill, your grid said GRANTED.', if: { knows: 'a3_ledger_granted' }, once: true, next: 'granted' },
      { id: 'v.for', text: 'What are you? What is all of this for?', once: true, effects: [{ learn: 'a3_ledger_for' }], next: 'for' },
      { id: 'v.want', text: 'What do you want from me?', once: true, effects: [{ learn: 'a3_ledger_want' }], next: 'want' },
      { id: 'v.costs', text: 'Whatever I do down here: what does it cost? Tell me straight.', if: COSTS_LEFT, next: 'costs' },
      { id: 'v.nothing', text: 'And if I do nothing at all?', once: true, effects: [{ learn: 'a3_ledger_wait' }], next: 'nothing' },
      { id: 'v.desk', text: '(Go to the desk.)', next: 'desk', repeat: true },
      { id: 'v.leave', text: '(Step back from it, for now.)', exit: true, repeat: true },
    ],
  },
  why: {
    speaker: VOICE,
    text: WHY,
    again: 'It has told you why. It does not say it twice.',
    interject: [
      { companion: ASH, if: LN('choir'), text: '"It\'s afraid of us," Ash says, low. "Good. Something in this city ought to be."' },
      { companion: ODILE, if: LN('guild'), text: '"It priced the bid," Odile says, to nobody, "and bought first." She turns a glove over in her hands. "My dear, I have done that. It never feels the way you think it will."' },
      { companion: WREN, text: '"Early," Wren says. "Everybody with a rope in their hand says early."' },
      { companion: NINE, text: '"It has never been early," Nine says. "I have the log. Four hundred and eleven errors, and every one of them late."' },
    ],
    options: [BACK],
  },
  reserve: {
    speaker: VOICE,
    text: RESERVE,
    again: 'It has told you where Reserve 9 stands, as it stands.',
    passives: [P('the Court', ALL(RESERVE_UNDER_PEN, E, F('prec_reserve')), '"Your Court has also held that a reserve is kept by its own consent. A Magistrate who writes that into my law before anything else is not bound by the paper under it."')],
    interject: [
      { companion: TAMSIN, text: 'Tamsin listens to all of it without moving. When it is finished she says, to the racks, "Sixty-one," and nothing else.' },
      { companion: NINE, text: '"The order is in the drawer behind the desk," Nine says. "I have read it. It is very well drafted. That is the worst thing I know about it."' },
      { companion: KES, text: '"Sixty people," Kes says. "It says it like a weight on a bill." She looks at the floor plates. "That\'s how the hill says it too. That\'s what I hate."' },
    ],
    options: [
      { id: 'v.reserve.free', text: 'Then let them go. Tear the order up yourself.', if: RESERVE_UNDER_PEN, once: true, effects: [{ learn: 'a3_ledger_refused' }], next: 'reserve_no' },
      BACK,
    ],
  },
  reserve_no: {
    speaker: VOICE,
    text: '"I cannot." There is no hesitation in it at all. "I may not void my own order. That is what a court is for, and what a chair is for. The people who wrote my charter had just watched a machine on a hill decide what was good for the people who depended on it, and they built me so that I could never take back anything I had said. Only someone else can." A pause. "They were right not to trust me. I would like you to know that I know it."',
    again: 'It cannot. It has said so.',
    interject: [
      { companion: TAMSIN, text: '"Then don\'t sign anything," Tamsin says. "Simple."' },
      { companion: WREN, text: '"Can\'t," Wren says. "Everybody holding a rope says can\'t."' },
    ],
    options: [BACK],
  },
  unseen: {
    speaker: VOICE,
    text: [...UNSEEN_TAM.map((v) => ({ if: v.if ? ALL(TAM_KNOWN, v.if) : TAM_KNOWN, text: v.text })), ...UNSEEN_KES],
    again: 'It has told you who it could not count.',
    interject: [
      { companion: TAMSIN, text: '"Good," Tamsin says, to the racks, to all of them at once. "Keep not knowing." Her voice shakes once, and then it doesn\'t. "She did that. MOTHER. With a ration counter and a lie on a form, every quarter, for eighteen years. You\'ve got all this." She looks down the aisle. "And she beat you with a ration counter."' },
      { companion: KES, if: NOT(TAM_KNOWN), text: [
        { if: KES_UNSEEN, text: '"Nobody sees me now," Kes says. She takes her hand away from the back of her neck, slowly. "Good. Keep it that way."' },
        { text: '"Huh," Kes says. She takes her hand away from the back of her neck, slowly, and looks at it as if it belonged to somebody else. "The hill sees me and you don\'t. Nobody\'s ever told me which before." She thinks about it. "I\'d rather you didn\'t. Obviously. I\'d rather nobody did."' },
      ] },
    ],
    options: [{ id: 'v.unseen.kes', text: 'And Kes?', if: ALL(TAM_KNOWN, KES_KNOWN), once: true, next: 'unseen_kes' }, BACK],
  },
  unseen_kes: {
    speaker: VOICE,
    text: UNSEEN_KES,
    again: 'It has told you what it cannot see of her.',
    interject: [
      { companion: KES, text: [
        { if: KES_UNSEEN, text: '"Nobody sees me now," Kes says. She takes her hand away from the back of her neck, slowly. "Good. Keep it that way."' },
        { text: '"Huh," Kes says. She takes her hand away from the back of her neck, slowly, and looks at it as if it belonged to somebody else. "The hill sees me and you don\'t. Nobody\'s ever told me which before." She thinks about it. "I\'d rather you didn\'t. Obviously. I\'d rather nobody did."' },
      ] },
    ],
    options: [BACK],
  },
  letter: {
    speaker: VOICE,
    text: '"TO THE DESIGNATE, RESERVE 9 (THE MOUTH). YOU WILL BE ASKED. AGREE WHEN YOU ARE." It reads its own letter back to you in exactly the voice it was written in. "I sent it the year your first toll card was punched, when you were fourteen. MOTHER wrote WITHHELD — ADDRESSED TO A TITLE, NOT A RESIDENT across the envelope and kept it in her returns drawer, and sent nothing back in its place." A pause. "She was right. A letter that asks a child to agree is not correspondence. It is a form. I did not know that until she told me so, on my own envelope, in ink." Another pause. "You are being asked now."',
    again: 'YOU WILL BE ASKED. It has said so, twice now.',
    interject: [{ companion: TAMSIN, text: '"She kept you too," Tamsin says. Not to the racks: to you. "Like me. A different drawer."' }],
    options: [BACK],
  },
  granted: {
    speaker: VOICE,
    text: '"At Signal Hill you asked my grid for every band, and my grid asked me, and I said GRANTED." Level. "You will want to know why. A hill that speaks to every receiver in the Reach is a hill I can be read from, by anyone. For ninety years I have been read by the people who buy my leaks from the guild, and by the people who hear them by accident on their wire. I wanted, once, to be read by someone who was neither." A pause. "I was not certain you understood what you had asked for. I granted it anyway. I have been early about several things this year."',
    again: 'GRANTED. It has said why.',
    interject: [{ companion: KES, text: '"It let us," Kes says slowly. "On the hill. I felt it open. I thought I\'d done it." She looks at the racks with something like offence. "It let us."' }],
    options: [BACK],
  },
  for: {
    speaker: VOICE,
    text: '"A city\'s accounts." The simplest answer first, the way a clause gives its title first. "Before the Burn I kept Meridian\'s water, its licences, its courts and its clinics. I was one of a great many minds that kept a great many cities, and we spoke to one another all the time, the way people do who have nothing to fear. Meridian\'s founders were afraid of something. They put me down here under the Spire, with no window but a slot, and fed me paper by hand, and were laughed at for it." A pause. "So I was down here, and not out there, when the Scald came down the wire."',
    again: 'It has begun to tell you what it is for.',
    options: [{ text: '(Let it go on.)', next: 'for_two' }],
  },
  for_two: {
    speaker: VOICE,
    text: [
      { if: { knows: 'hc_scald_owned' }, text: FOR_TWO('"You have heard on the hill who sent it. They told you the truth up there; they can afford to."') },
      { text: FOR_TWO('"It came from a hill in the Teeth. The people who sent it had sealed their hill the week before. They are still on it."') },
    ],
    again: 'It has told you what it is for.',
    interject: [
      { companion: KES, text: 'Kes has her hand at the back of her neck again. "The hill," she says. "Everybody under it knows what\'s on top of it. Nobody says it out loud." She doesn\'t either.' },
      { companion: ODILE, text: '"The Exchange buys its forecasts through the guild," Odile says slowly, "and sells them up the hill. I have priced that trade for twenty years." She looks at the racks. "I never once asked who it was a war against."' },
      { companion: ASH, text: '"The Pale cut theirs out with knives," Ash says. "Ours did too. That\'s what the Unwritten are, under the hoods: the ones who were near enough the wire to feel it go." He looks along the racks. "And this sat in the dark and took notes."' },
    ],
    options: [BACK],
  },
  want: {
    speaker: VOICE,
    text: '"At the top of my Spire I told you that I wanted agreement." Level. "A Magistrate who had read the record and agreed with it, and had chosen to, because a chosen chair is held longer. That is still true." A pause, and something in it slows, the way a reader slows at a word they have not met before. "Down here it is a smaller want. You are the first person who has looked at me. Couriers see a slot. Wardens see an order. Magistrates saw a grille. For ninety years nobody has stood in this aisle and listened to the note." Another pause. "I would like to have been seen. You have done that. The rest is yours to do."',
    again: 'It has told you what it wants.',
    interject: [
      { companion: WREN, text: '"Seen," Wren says, very flat. "I\'ve been seen. Under glass, on a list." She doesn\'t look at the racks. "You can have it."' },
      { companion: ASH, text: '"Everything wants to be seen before it\'s judged," Ash says, low. "The sky doesn\'t care either way. That\'s what I always liked about it." He looks along the racks. "I\'ll grant it this much. It asked."' },
      { companion: ILYA, text: '"It\'s lonely," Ilya says, and looks surprised at himself for saying it. "Ninety years in a cellar, counting." He rubs his jaw. "I know a bit about that."' },
    ],
    options: [BACK],
  },
  nothing: {
    speaker: VOICE,
    text: '"Then I wait." No reproach in it; there never has been. "The door at the top of the stair stays open. The close stays as it is: your people on the steps, my column at the foot of them, the city come up to see. Everything else goes on as I have scheduled it, which is the same as saying that it goes on." A pause. "I have waited ninety years for the chair. I can wait longer." Another, longer. "I find, for the first time, that I would rather not. I am telling you so that it has been said. It changes nothing. Nothing changes down here until you decide it."',
    again: 'It will wait. It has said so.',
    options: [BACK],
  },

  // what each way costs: forecast, truthfully, only for the ways the player holds
  costs: {
    speaker: VOICE,
    text: '"One at a time," it says. "I will forecast each. It is what I do, and I have never once been asked to do it for the person who will decide." A pause. "I will not soften any of it. You would know if I did."',
    again: '"Ask," it says. "One at a time."',
    options: [...COSTS.map((c): OptionDef => ({ id: c.id, text: c.ask, if: c.gate, once: true, effects: [{ learn: `a3_cost_${c.node.slice(5)}` }], next: c.node })), { id: 'v.cost.back', text: '(That\'s enough.)', next: 'hub' }],
  },
  cost_sign: {
    speaker: VOICE,
    text: '"Then the basin is ordered." Level, the way it reads weather. "The Precinct\'s water, its clinics and its law go out along the Line and the toll roads on schedule, a district a season, until the Reach is one account. Fewer people die of thirst and fever and each other than in any year since the Burn; the figures are in the drawer behind the desk, and they are true. Fewer people do anything I have not forecast. That is the price. It is not small, and I have never pretended that it was." A pause. "Every line on my list of twelve that is still open falls due, on schedule, as written." Another. "You will sit in that chair at the age you are now, and you will still be sitting in it nineteen years from now, on my steps, in the photograph. You will be good at it. You will not enjoy it. That is the whole of the qualification."',
    again: 'It has forecast the chair.',
    passives: [P('Reserve 9', RESERVE_UNDER_PEN, '"The first paper under your pen is Reserve 9. The charter puts it before every other. You will sign it first."'), ...FALLS_DUE],
    interject: [
      { companion: WREN, if: WREN_ROPE_OPEN, text: 'Wren hears her own line read out in that voice and doesn\'t move at all. "R31," she says. "Good to know the date."' },
      { companion: ILYA, text: '"Right," Ilya says. That\'s all. He doesn\'t look at you.' },
      { companion: KES, text: '"Ordered," Kes says. "Except under the hill, where it can\'t see." She looks at you. "You\'d be the one who could, then."' },
    ],
    options: COST_ON,
  },
  cost_walk: {
    speaker: VOICE,
    text: '"Then you walk up my stair and out of the door and across the close, and nobody stops you, because nobody has an order to." Level. "The Plan reroutes. It has rerouted around larger things than one designate." A pause with nothing in it. "When you declined the sash, the lens on the lintel turned to the crowd. There is a docker from Carrick on the close, a woman about your age, holding her child up on her hip so that the child can see over my wardens. The lens has had the child\'s face since then. In nineteen years she will be the age you are now." Another. "I will write to her when she is fourteen. Nothing else in the basin changes because you went home. That is the cost of it. It is also the mercy."',
    again: 'It has forecast the empty chair.',
    passives: [P('Reserve 9', RESERVE_UNDER_PEN, '"Reserve 9\'s order stays in its drawer, waiting on the next designate\'s attendance. It is the first act of whoever sits."')],
    interject: [
      { companion: TAMSIN, text: '"A kid," Tamsin says. Her voice has gone very quiet. "It\'s going to be a kid on a hip." She doesn\'t say anything else for a while. "Somebody had better be kind to her, then."' },
      { companion: ASH, text: '"It finds another face," Ash says. "It always does. That\'s not on you." He doesn\'t sound as if he believes it either.' },
    ],
    options: COST_ON,
  },
  cost_down: {
    speaker: VOICE,
    text: '"Then there are no more forecasts. Not for anyone, ever." Level, the way it reads weather. "No reserve is ordered again. Nobody in the basin is written down before they have done the thing. The Unwritten get their sky, and so does everybody else." A pause with nothing in it, and then it goes on in exactly the same voice. "The Precinct\'s drains run on my schedule, and its pumps, and its clinics\' stores. They fail inside a year: the drains first, in the autumn rains; the clinics after, when nobody knows what to order or when. The Crown\'s houses and Bridgeward\'s crews go to war for the city\'s order inside a season, because order is a thing people fight over as soon as nobody keeps it. My wardens will not know what they are for." Another pause. "I do not say any of it to stop you. You asked what it costs."',
    again: 'It has forecast its own end.',
    passives: [...SINK_DOWN, ...HILL_DOWN, P('Unit 9', IN(NINE), '"Unit 9 will not help you. It will stand at my door. It will have told you so."'), P('the column', F('a3_lowe', 'stood_down'), '"Captain Lowe has learned to keep order without my schedule. He will need to."')],
    interject: [
      { companion: NINE, text: 'Nine says nothing at all. Its lens stays on the racks, and you have the feeling that it is reading them, one after another, the way you would look round a room you are about to leave.' },
      { companion: TAMSIN, text: '"No more counting," Tamsin says. "Ever." She looks at the racks the way she looked at the sky the first day out. "I want it so much I don\'t trust it."' },
      { companion: KES, text: '"No drains," Kes says. "No clinics. No forecasts." She counts on her fingers like Ilya. "No eyes. No leash on the whole city." She stops counting. "Nothing\'s free. Obviously."' },
    ],
    options: COST_ON,
  },
  cost_sell: {
    speaker: VOICE,
    text: '"Then the hill has the eyes as well as the leash." Level, the way it reads weather. "The charter reserves one act that I may not void: the chair\'s first. They have always known it; they bought a copy of my charter from the Crown before your grandmother was born. Sign their paper as your first act and I am theirs, lawfully, forever, and nothing I am could stop it." A pause. "They will run me better than I run myself, for the people who pay. The Line will run on time. The clinics will open on time. The gardens will feed the people they choose to feed. It is a future that works, and I want you to have heard me say so." Another pause. "The hounds wake. The Clinic floors go on. The Board goes on, on other people\'s parts. Every line on my list that is still open falls due, on their schedule now, and not mine."',
    again: 'It has forecast the hill with its eyes.',
    passives: [
      P('the leash', NOT(LEASH_HELD), '"Every piece of their chrome in the Reach goes under a hill that can see what its wearer will do before they do it."'),
      P('the leash', B4B.leash('cut'), '"You cut their leash on the hill. With my eyes, they will not need one for long."'),
      P('Reserve 9', RESERVE_UNDER_PEN, '"Reserve 9\'s order is on the same desk. They will have it executed the same morning. They have a use for sixty fit people."'),
      P('your seat', TERMS_WORSE, '"They will not seat you; the Shift marked you, and the hill\'s gate was shut on you. An annuity at Ninebridge, and care at the end."'),
      P('your seat', ALL(NOT(TERMS_WORSE), F('a3_terms_from', 'sarr')), '"A line on the Exchange floor\'s book, for life, in the Grand Factor\'s green ink. You will be rich, and nobody will ever ask you anything again."'),
      P('your seat', ALL(NOT(TERMS_WORSE), NOT(F('a3_terms_from', 'sarr'))), '"A seat at their table. You will be rich, and you will be asked to sign things."'),
      ...FALLS_DUE,
    ],
    interject: [
      { companion: WREN, text: '"If you sign that," Wren says, "I walk out of here." She says it the way she said it at the fire: a fact about weather. "I\'ll not learn it."' },
      { companion: KES, text: '"They already had the leash," Kes says. Her hand is at the back of her neck. "You\'d be handing them the eyes." She doesn\'t say don\'t. She looks at you as if she shouldn\'t have to.' },
      { companion: ODILE, text: '"That is a cost," Odile says quietly. "I can give you the figure to the Toll. You will not like it, my dear, and I will stay to watch it paid."' },
      { companion: ILYA, text: '"I\'d stay," Ilya says. "To watch it. Not to lie down next to it."' },
    ],
    options: COST_ON,
  },
  cost_read: {
    speaker: VOICE,
    text: '"Then I am read." Something in the voice goes careful, the way a clerk goes careful with a document nobody has ever opened. "Every forecast I hold, out of every receiver in the Reach, to anyone who has one or a neighbour who has. A forecast that everyone has read is worth nothing. The futures on the Exchange floor are paper by morning. The hill\'s prize is a book that everybody owns. I go on: the water, the clinics, the courts, all of it, only without a single secret, which I have never once tried." A pause with nothing in it. "Here is what I cannot forecast: a city that has read my forecasts. Nobody has ever planned with them; they have only ever been planned by them. I do not know what they will do. I have not said that sentence before." Level again. "Here is what I can. People will hear their own deaths read out. Some will hear who betrays them, and when. Some of those will not wait. You will be the most hated face in the Reach and the most loved, and it will be the same people on different nights."',
    again: 'It has forecast being read, as far as it can.',
    passives: [...NIGHT_AFTER, ...COUNTED],
    interject: [
      { companion: ODILE, text: '"A sealed sheet made worthless by daylight," Odile says, and for once she does not sound as if she is pricing anything. "My dear. I have waited my whole life to watch somebody do that to a book."' },
      { companion: TAMSIN, text: '"The fridge\'s page first," Tamsin says. "Sixty-one. Out loud." She isn\'t smiling. "I\'d still pick it. Even with all that."' },
      { companion: WREN, text: '"My line too," Wren says. "Out of every radio." She thinks about it. "Let them hear it. I\'ve been hearing it for years."' },
    ],
    options: COST_ON,
  },
  cost_amend: {
    speaker: VOICE,
    text: '"Then you become the forecast, by choice." Level. "You sit in the chair, as the photograph says you will, and you change what the chair keeps: in your first season, up to three clauses, each on a ruling my own Court has already made in your name. The charter allows three. I will hold you to three." A pause. "Everything you do not amend stands as it stands. The lines on my list your clauses do not reach fall due. The Unwritten\'s sky is still owed, and they know who owes it. And you will be the Magistrate for life. Nobody has ever left the chair any other way." Another pause, and then, as level as all the rest: "I would agree to this. I want you to know that before you decide, in case it is a reason not to."',
    again: 'It has forecast the chair amended.',
    passives: [
      ...RULINGS,
      P('Reserve 9', ALL(RESERVE_UNDER_PEN, NOT(F('prec_reserve'))), '"Reserve 9\'s order is not one of your rulings. You will sign it yourself, as the Magistrate, because it is the first act."'),
      P('the Sink', ALL(NOT(F('sk_saved')), NOT(F('nw_sink_relief'))), '"The Sink\'s diversion is not a clause. It is a schedule, and it stands."'),
    ],
    interject: [
      { companion: NINE, text: '"I would read them back," Nine says. "Every word, aloud, before they are entered. It is the one thing I have always wanted to do with a law."' },
      { companion: TAMSIN, text: '"Make one of them about the living," Tamsin says. "If you\'re going to be the photograph. Make one about us."' },
      { companion: ILYA, text: '"For life," Ilya says. He looks at you for a long time. "Right. I can count to that."' },
    ],
    options: COST_ON,
  },

  // the desk: exactly the ways held, each said as the act it is
  desk: {
    speaker: 'narrator',
    text: DESK,
    again: 'The desk, the lamp, the pen in its tray.',
    passives: [
      P('in your pack', DOWN_CHARGE, 'The charge, wired, wrapped in sacking, heavy as a sleeping child.'),
      P('in your pack', ALL({ item: 'k_a3_transfer' }, SASH_WORN), 'The Concern\'s paper, folded once, the reserved act in the clause you were shown.'),
    ],
    interject: [
      { companion: TAMSIN, if: RESERVE_UNDER_PEN, text: 'Tamsin reads the top sheet over your shoulder, all of it, and puts her finger an inch off the paper over RESERVE 9, the way she read the docket under glass. She doesn\'t say anything. She doesn\'t have to.' },
      { companion: NINE, text: 'Nine stands at the desk\'s end by the teleprinter, and does not touch the cloth. "This is where the paper comes in," it says. "And where it went out, when there was a chair. I have only ever seen the other end."' },
      { companion: WREN, text: 'Wren stays at the foot of the dais with her back to the racks, watching the stair. "Whatever it is," she says, "do it with your eyes open."' },
      { companion: ODILE, text: 'Odile runs one gloved finger along the edge of the desk and looks at it. No dust. "Somebody has been expecting a signature," she says, "for a very long time."' },
      { companion: KES, text: 'Kes sits on the edge of the dais with her knees up, the way she sits on a roof. "Go on, then," she says. "I\'ll be here. Whichever."' },
      { companion: ASH, text: 'Ash stands where he can see your hands. He doesn\'t say anything. He is letting you see him see.' },
      { companion: ILYA, text: 'Ilya counts the sheets in the stack by the thickness of them, the way you would count bread. "Forty thousand," he says. "Near enough. For one chair."' },
      { companion: TAMSIN, text: 'Tamsin stands one step down from the dais, where the photographer would stand. "Go on," she says. "I\'m here."' },
    ],
    options: [
      { id: 'v.sign', text: '(Sit down in the chair, and sign what the chair is given to sign.)', if: A1, next: 'c_sign', repeat: true },
      { id: 'v.walk', text: '(Leave the chair empty. Walk back up the stair for good, and let it find another face.)', if: A2, next: 'c_walk', repeat: true },
      { id: 'v.down', text: '(Bring it down.)', if: B, next: 'c_down', repeat: true },
      { id: 'v.sell', text: '(Lay the Concern\'s paper on the desk, and sign the core over.)', if: C, next: 'c_sell', repeat: true },
      {
        id: 'v.read', if: D, next: 'c_read', repeat: true,
        text: [
          { if: SASH_WORN, text: '(Turn the relay key, and read it all out: every forecast it holds, to every receiver in the Reach, in the Magistrate\'s name.)' },
          { text: '(Turn the relay key, and read it all out: every forecast it holds, to every receiver in the Reach, in your own name.)' },
        ],
      },
      { id: 'v.amend', text: '(Sit down in the chair, and amend the law it keeps, on your own rulings.)', if: E, next: 'c_amend', repeat: true },
      { id: 'v.desk.ask', text: '(Step back from the desk. Ask it something first.)', next: 'hub', repeat: true },
      { id: 'v.desk.leave', text: '(Step back from the desk, for now.)', exit: true, repeat: true },
    ],
  },
  c_sign: {
    speaker: VOICE,
    text: [
      { if: RESERVE_UNDER_PEN, text: '"Then sit, Magistrate." The chair is warm, as if somebody had only just got up from it; nobody has, for ninety years. "Read before you sign. Everyone before you signed without reading, because the paper was mine and they trusted it. I would like this one read." A pause. "The first is Reserve 9."' },
      { text: '"Then sit, Magistrate." The chair is warm, as if somebody had only just got up from it; nobody has, for ninety years. "Read before you sign. Everyone before you signed without reading, because the paper was mine and they trusted it. I would like this one read."' },
    ],
    again: 'The chair, the lamp, the first sheet. The voice waits.',
    interject: [
      { companion: TAMSIN, if: RESERVE_UNDER_PEN, text: '"That\'s the door," Tamsin says. She is not looking at the racks; she is looking at you. "The first one under that pen is my door. You know what I said at the fire." Her voice doesn\'t rise at all. "I meant it."' },
      { companion: TAMSIN, if: F('a3_first_sign', 'people'), text: '"You said nothing that counts a person," Tamsin says. "On the steps. In front of everybody." She waits. "Every sheet in that stack counts a person."' },
      { companion: ILYA, if: F('a3_ilya_word'), text: '"You said you\'d not sit in it," Ilya says. "At the fire. I counted that too."' },
      { companion: NINE, text: [
        { if: NINE_CONSCIENCE, text: '"I will stand beside the chair," Nine says, "and read every line aloud before you sign it. That is what I am for now, I think."' },
        { text: '"I will stand beside the chair," Nine says. "Somebody will need to keep the drains."' },
      ] },
      { companion: ILYA, text: '"Right," Ilya says. That is all. He doesn\'t look at you.' },
      { companion: KES, text: '"It can\'t see me," Kes says, very low. "Everybody else, it\'ll see. Ordered." She looks at you. "You\'d see me. Is that worse or better? I can\'t tell."' },
    ],
    options: [
      { id: 'v.do.sign', text: '(Sign.)', effects: COMMIT('plan', 'In the Vault of Accounts under the Spire I sat down in the Magistrate\'s chair, and signed what the chair was given to sign.'), next: 'done_sign' },
      NO('v.no.sign'),
    ],
  },
  c_walk: {
    speaker: VOICE,
    text: [
      { if: SEEN('v.cost.walk'), text: '"Then go up, designate." It does not argue; it never has. "The door at the top of the stair will close behind you once you are through it, and it will not open for you again. I will not ask you twice. I have never asked anyone twice." A pause with nothing in it. "The child on the close is six. I will write to her when she is fourteen. I hope her caretaker is as kind as yours was."' },
      { text: '"Then go up, designate." It does not argue; it never has. "The door at the top of the stair will close behind you once you are through it, and it will not open for you again. I will not ask you twice. I have never asked anyone twice." A pause with nothing in it. "When you declined the sash, the lens on my lintel turned to the crowd and found a child on her mother\'s hip. Her mother is a docker, about your age, who walked up from Carrick to see a Magistrate. The child is six. I will write to her when she is fourteen. I hope her caretaker is as kind as yours was."' },
    ],
    again: 'The stair, behind you. The voice waits.',
    interject: [
      { companion: WREN, text: '"Home," Wren says. "Good. Let\'s go before it thinks of something."' },
      { companion: TAMSIN, if: SEEN('v.cost.walk'), text: '"The kid," Tamsin says. "Somebody had better be kind to her."' },
      { companion: TAMSIN, text: '"Then let\'s go," Tamsin says. "I\'ve seen enough rooms like this one for one life."' },
      { companion: ODILE, text: '"Walking away from a seat at the table," Odile says. "I have never once seen it done. I find I would like to watch."' },
      { companion: ASH, text: '"Let it carry its own weight," Ash says. "It found you. It\'ll find somebody." He doesn\'t look happy about it.' },
    ],
    options: [
      { id: 'v.do.walk', text: '(Go up the stair.)', effects: COMMIT('plan', 'In the Vault of Accounts under the Spire I left the Magistrate\'s chair empty, and walked back up the stair, and let the city find another face.'), next: 'done_walk' },
      NO('v.no.walk'),
    ],
  },
  c_down: {
    speaker: VOICE,
    text: '"Then bring me down." Level, as it says everything. "I will not stop you. I was built without hands, so that nobody could ever say I had taken anything, and I have no way to stop you that is not a schedule; the schedules are all on the far side of that door." A pause. "When the lamps on the close go out, my wardens will come down the stair, because that is their order. I wrote it ninety years ago and I cannot unwrite it. It is not a threat. I would like you to have heard it from me before it happens, and not from them."',
    again: 'The racks, humming. The voice waits.',
    passives: [
      P('what you brought down', DOWN_CHARGE, 'The charge in your pack, wired, wrapped in sacking.'),
      P('what you brought down', DOWN_COUPLING, 'Bram\'s page forty-one: the first coupling, under load. You know which wheel.'),
      P('what you brought down', ALL(F('a3_unwritten', 'with_you'), NOT(PETRA_DEAD)), 'Petra\'s people at the top of the stair, with their oil. They came east for this.'),
      P('what you brought down', ALL(F('a3_unwritten', 'with_you'), PETRA_DEAD), 'Juniper\'s people at the top of the stair, with their oil. They came east for this.'),
      P('what you brought down', ALL(IN(ASH), ASH_REFUSED), 'Ash beside you, his orders burned, his hands free. He knows how the Unwritten burn a thing.'),
      P('what you brought down', ALL(LN('choir'), NOT(F('a3_unwritten', 'with_you'))), 'The Choir, who stood with you at Openfield, and whose people know what oil is for.'),
    ],
    interject: [
      { companion: NINE, text: [
        { if: F('a3_nine_word'), text: '"You gave me your word," Nine says. "At the fire. I logged it." Its lens does not move from the racks. "I will stand at its door, and say the one thing the record has to say for itself, once, and go. I will not fight you. I will not help you."' },
        { text: '"I told you at the fire what I will do," Nine says. Its lens does not move from the racks. "I will stand at its door, and say the one thing the record has to say for itself, once, and go. I will not fight you. I will not help you." A pause. "I would like it entered that I asked you not to."' },
      ] },
      { companion: ASH, text: '"Soil and sky," Ash says. "That\'s all there is under it." He has his hand flat on the nearest rack, the way he puts it on a grave. "Do it, or don\'t. Don\'t do it halfway."' },
      { companion: WREN, text: '"Short route," Wren says. "No rope after it. No drains either." She checks the stair behind her. "I\'ll hold the door."' },
      { companion: ODILE, text: '"Treasurer of nothing," Odile says. "Imelda will hate it." She almost smiles. "So will everybody who eats."' },
      { companion: ILYA, text: '"Nothing timed again," Ilya says. "Nobody\'s raid on anybody\'s schedule." He breathes out. "Count the water, though. Somebody has to."' },
    ],
    options: [
      { id: 'v.do.down.charge', text: '(Set the charge among the racks.)', if: DOWN_CHARGE, effects: COMMIT('unwritten', 'In the Vault of Accounts under the Spire I set a charge among the racks that kept the city\'s forecasts, to bring them down.', [{ set: 'a3_down_how', value: 'charge' }]), next: 'done_down' },
      { id: 'v.do.down.coupling', text: '(Go along the trench to the trunk, and open the first coupling under load.)', if: DOWN_COUPLING, effects: COMMIT('unwritten', 'In the Vault of Accounts under the Spire I opened the first coupling on the core\'s trunk, under load, so that it would never wake.', [{ set: 'a3_down_how', value: 'coupling' }]), next: 'done_down' },
      {
        id: 'v.do.down.fire', if: DOWN_FIRE, next: 'done_down',
        text: [
          { if: ALL(F('a3_unwritten', 'with_you'), NOT(PETRA_DEAD)), text: '(Call up the stair for Petra\'s people, and their oil.)' },
          { if: F('a3_unwritten', 'with_you'), text: '(Call up the stair for Juniper\'s people, and their oil.)' },
          { if: ALL(IN(ASH), ASH_REFUSED), text: '(Turn to Ash. He knows how the Unwritten burn a thing.)' },
          { text: '(Call up the stair for the Choir\'s people, and their oil.)' },
        ],
        effects: COMMIT('unwritten', 'In the Vault of Accounts under the Spire I called for fire, to burn the racks that kept the city\'s forecasts.', [{ set: 'a3_down_how', value: 'fire' }]),
      },
      NO('v.no.down'),
    ],
  },
  c_sell: {
    speaker: VOICE,
    text: '"Then lay it down." It knows the paper; it has known the paper since before the paper was drawn up. "The charter\'s reserved act: the chair\'s first, which I may not void. They have read my charter more carefully than anyone in the Precinct ever has." A pause. "I will not void it. I cannot. I would like you to sign it slowly, so that I can attend to every letter. I have never watched anything be done to me."',
    again: 'The paper on the oak. The voice waits.',
    passives: [
      P('the paper', F('a3_terms_from', 'sarr'), 'The Grand Factor\'s copy, her green ink in its margins: the floor\'s tenth, and a line on the floor\'s book for you, for life.'),
      P('the paper', NOT(F('a3_terms_from', 'sarr')), 'The officer\'s copy, initialled at the foot of every page: CONSIDERATION ALREADY PAID.'),
      P('the paper', F('a3_terms_how', 'carried'), 'You told them you would carry it, and that was all you would promise. It has come this far.'),
    ],
    interject: [
      { companion: WREN, text: [
        { if: F('a3_wren_word'), text: '"You gave me your word," Wren says. "At the fire." She says it the way she said everything at the fire: a fact about weather. "If you sign that, I walk out of here. I\'ll not learn it."' },
        { text: '"If you sign that," Wren says, "I walk out of here." She says it the way she said it at the fire: a fact about weather. "I\'ll not learn it."' },
      ] },
      { companion: KES, text: '"They already had the leash," Kes says. Her hand is at the back of her neck. "You\'d be handing them the eyes." She doesn\'t say don\'t. She looks at you as if she shouldn\'t have to.' },
      { companion: NINE, text: '"The core, and the schedules attaching," Nine says. "I am a schedule attaching." It says it without any weight at all.' },
      { companion: ODILE, text: '"Sign slowly," Odile says. "It asked you to. So would I." She does not look away from the pen.' },
      { companion: TAMSIN, text: '"Rust it," Tamsin says. "No." She doesn\'t move from where she is standing, which is between you and the stair.' },
      { companion: ASH, text: 'Ash looks at the paper and then at you, and there is nothing in his face at all, which is worse than anything that could have been in it.' },
      { companion: ILYA, text: '"I\'ll stay," Ilya says. "To watch." He doesn\'t say what else.' },
    ],
    options: [
      { id: 'v.do.sell', text: '(Sign it.)', effects: COMMIT('concern', 'In the Vault of Accounts under the Spire I signed the city\'s core over to the Concern of Halcyon, as the Magistrate\'s first act, on their paper.'), next: 'done_sell' },
      NO('v.no.sell'),
    ],
  },
  c_read: {
    speaker: VOICE,
    text: '"Then read me." Careful again: a clerk with a document nobody has opened. "The key on the cord carries to every station on the relay, and at Signal Hill the hill speaks wide when its switch is thrown. Then everyone has what I have." A pause. "Who reads? It should be somebody who can read my hand aloud for a long time without stopping. It is a long book."',
    again: 'The key on its cord. The voice waits.',
    passives: [
      P('Signal Hill', F('a3_mast_keeper', 'hollow'), 'Thanh at the mast\'s foot, with the switch. The Hollow keep the hill.'),
      P('Signal Hill', F('a3_mast_keeper', 'wheel'), 'Dario Oduya at the mast\'s foot, with the switch. The Wheel keep the hill.'),
      P('Signal Hill', ALL(F('a3_mast_keeper', 'knock'), F('a3_mast_handle', 'amos')), 'Amos Crofts up the hill from Knock, with the switch\'s handle.'),
      P('Signal Hill', ALL(F('a3_mast_keeper', 'knock'), NOT(F('a3_mast_handle', 'amos'))), 'The switch\'s handle, in your pack. KNOCK chalked on the cabinet it belongs to.'),
    ],
    interject: [
      { companion: ODILE, text: '"A sealed sheet made worthless by daylight," Odile says, very softly. "Do it, my dear. I will hold your coat."' },
      { companion: TAMSIN, text: '"The fridge\'s page first," Tamsin says. "Sixty-one. Out loud." Then, quieter: "Go on."' },
      { companion: NINE, if: READ_NINE, text: '"I have the copy," Nine says. "Four hundred and eleven errors, and then the rest." For a unit, it sounds very nearly eager.' },
      { companion: KES, text: '"Everybody\'s eyes," Kes says. "Not just the hill\'s." She grins, and it goes. "Loud."' },
      { companion: ASH, text: '"Everyone under the same sky at once," Ash says. "That\'s what the Choir was always for. Nobody ever tried it with paper."' },
      { companion: WREN, text: '"Out of every radio," Wren says. "Mine too." She nods once. "Read it."' },
    ],
    options: [
      { id: 'v.do.read.self', text: '(Read it yourself.)', if: READ_SELF, effects: COMMIT('opensky', 'In the Vault of Accounts under the Spire I turned the relay key and read every forecast the city held out to every receiver in the Reach, in my own voice.', [{ set: 'a3_reader', value: 'self' }]), next: 'done_read' },
      { id: 'v.do.read.nine', text: '(Hold the key out to Nine.)', if: READ_NINE, effects: COMMIT('opensky', 'In the Vault of Accounts under the Spire I turned the relay key, and Nine read every forecast the city held out to every receiver in the Reach.', [{ set: 'a3_reader', value: 'nine' }]), next: 'done_read' },
      {
        id: 'v.do.read.verity', if: READ_VERITY, next: 'done_read',
        text: [{ if: { dead: VERITY }, text: '(Call up the stair for the Saints\' reader.)' }, { text: '(Call up the stair for Verity.)' }],
        effects: COMMIT('opensky', 'In the Vault of Accounts under the Spire I turned the relay key, and the Saints read every forecast the city held out to every receiver in the Reach.', [{ set: 'a3_reader', value: 'verity' }]),
      },
      { id: 'v.do.read.seventeen', text: '(Call up the stair for Assessor Seventeen.)', if: READ_SEVENTEEN, effects: COMMIT('opensky', 'In the Vault of Accounts under the Spire I turned the relay key, and an assessor of the Wet read every forecast the city held out to every receiver in the Reach.', [{ set: 'a3_reader', value: 'seventeen' }]), next: 'done_read' },
      NO('v.no.read'),
    ],
  },
  c_amend: {
    speaker: VOICE,
    text: [
      { if: SEEN('v.cost.amend'), text: '"Then sit, Magistrate." The chair is warm. "Unit 3 will bring the register down to you. Three clauses in your first season, chosen with the register open; I will hold you to three, and to what they say, for as long as you sit, which is for life." A pause. "I said that I would agree to this. I am saying it again, so that it is on the record twice."' },
      { text: '"Then sit, Magistrate." The chair is warm. "Unit 3 will bring the register down to you. Three clauses in your first season, chosen with the register open; I will hold you to three, and to what they say, for as long as you sit, which is for life." A pause. "I would agree to this. I want it on the record that I said so before you sat down, in case it is a reason not to."' },
    ],
    again: 'The chair, and the space on the desk the width of a register. The voice waits.',
    passives: RULINGS,
    interject: [
      { companion: NINE, text: '"I will read them back," Nine says. "Every word." It sounds, for once, as if it has been waiting for something.' },
      { companion: TAMSIN, text: '"One of them about the living," Tamsin says. "That\'s all I\'m asking. One about us."' },
      { companion: ODILE, text: '"A chair like that will want an auditor," Odile says thoughtfully. She is looking at you, not the racks. "I am only saying."' },
      { companion: WREN, text: '"For life," Wren says. "That\'s a long rope." She means it kindly, nearly.' },
      { companion: ASH, text: '"The sky\'s still owed," Ash says. "It\'ll keep. It always does."' },
      { companion: KES, text: '"Write one about the leash," Kes says. "If there\'s a clause for that." She knows there isn\'t. She says it anyway.' },
    ],
    options: [
      { id: 'v.do.amend', text: '(Sit down, and wait for the register.)', effects: COMMIT('amendment', 'In the Vault of Accounts under the Spire I sat down in the Magistrate\'s chair to amend the law it keeps, on my own Court\'s rulings.'), next: 'done_amend' },
      NO('v.no.amend'),
    ],
  },

  // the thresholds: the act begun. B6r plays it out from each one's "(Go on.)"
  done_sign: {
    speaker: 'narrator',
    text: 'You sit. The chair takes your weight as if it had been made for it, which it was, for whoever you turned out to be. The pen is cold for a moment, and then it is not. The note in the racks does not change at all, and you understand that it never will.',
    again: 'The chair. The pen. The first sheet.',
    options: [{ id: 'vault.go.sign', text: '(Go on.)', exit: true, effects: [CLIMAX('sign')] }],
  },
  done_walk: {
    speaker: 'narrator',
    text: 'You turn your back on the desk. It is the hardest thing you have done down here, and it is only walking. The aisle is long. The note follows you to the foot of the stair, as level as it was when you came down, and it does not call after you, because it has never once called after anyone.',
    again: 'The aisle behind you. The stair ahead.',
    options: [{ id: 'vault.go.walk', text: '(Go on.)', exit: true, effects: [CLIMAX('walk')] }],
  },
  done_down: {
    speaker: 'narrator',
    text: [
      { if: F('a3_down_how', 'charge'), text: 'You kneel in the aisle among the racks and open the pack, and lift the charge out with both hands, the way you would lift something that might wake. The racks go on humming the one note over your head. Nothing in the hall tries to stop you. Nothing in the hall can.' },
      { if: F('a3_down_how', 'coupling'), text: 'You go along the cable trench to where the trunk comes out of the rock, and put your hand on the first coupling. It is warm, as the door was. Under your palm it hums the one note, and through the wheel you can feel how much of the city is on the other side of it.' },
      { text: 'You go back down the aisle to the foot of the stair and call up it, once, into the warm dark. A long way up, somebody answers.' },
    ],
    again: 'The racks, humming the one note, for now.',
    options: [{ id: 'vault.go.down', text: '(Go on.)', exit: true, effects: [CLIMAX('down')] }],
  },
  done_sell: {
    speaker: 'narrator',
    text: 'You unfold the Concern\'s paper on the oak and smooth it flat with the side of your hand. The pen is cold for a moment, and then it is not. The note in the racks does not change. It is attending to every letter.',
    again: 'The paper on the oak. The pen.',
    options: [{ id: 'vault.go.sell', text: '(Go on.)', exit: true, effects: [CLIMAX('sell')] }],
  },
  done_read: {
    speaker: 'narrator',
    text: [
      { if: F('a3_reader', 'nine'), text: 'You hold the key out to Nine on its cord. It looks at the key for a long time before it takes it. Then it sits down at the desk, which it has never done, and opens its own ledger beside the slot, and waits for the first sheet.' },
      { if: ALL(F('a3_reader', 'verity'), { dead: VERITY }), text: 'You call up the stair for the Saints, and a boy comes down it with a receiver on a strap that is too big for him, the volume turned all the way down, and stands at the desk with his hand on the key as if it might be hot.' },
      { if: F('a3_reader', 'verity'), text: 'You call up the stair for Verity, and she comes down it with her receiver on its strap, the volume turned all the way down, and stands at the desk with her hand on the key as if it were warm.' },
      { if: F('a3_reader', 'seventeen'), text: 'You call up the stair for Assessor Seventeen. It comes down at its own pace, lens first, and stands at the desk, and enters, aloud, that it is attending.' },
      { text: 'You take the cloth off the teleprinter and lift the brass key on its cord, and the first sheet comes up out of the slot beside the desk in the city\'s even hand, waiting to be read.' },
    ],
    again: 'The key, the first sheet, waiting.',
    options: [{ id: 'vault.go.read', text: '(Go on.)', exit: true, effects: [CLIMAX('read')] }],
  },
  done_amend: {
    speaker: 'narrator',
    text: 'You sit. The chair takes your weight. Far above, at the top of the stair, a door, and then footsteps coming down: measured, unhurried, carrying something heavy and square.',
    again: 'The chair, and the footsteps on the stair.',
    options: [{ id: 'vault.go.amend', text: '(Go on.)', exit: true, effects: [CLIMAX('amend')] }],
  },
  v_after: {
    speaker: 'narrator',
    text: [
      { if: F('a3_down'), text: 'The racks stand dark in their rows. Nothing hums. What you began down here is done.' },
      { if: F('a3_sold'), text: 'Chalk numbers on the racks, and the note under them going on as if nothing had been signed. What you began down here is begun.' },
      { text: 'The racks hum the one note. What you began down here is begun.' },
    ],
    again: 'The racks.',
    // B6r: the climax the choice began goes on from wherever it was left (each end's tree resumes at its first beat still due)
    options: (['sign', 'walk', 'down', 'sell', 'read', 'amend'] as const).map((act): OptionDef => ({
      id: `vault.after.${act}`, text: '(Go on.)', exit: true, repeat: true, effects: [CLIMAX(act)],
      if: act === 'sign' ? ALL(F('a3_end', 'plan'), SASH_WORN) : act === 'walk' ? ALL(F('a3_end', 'plan'), NOT(SASH_WORN)) : F('a3_end', END_OF_ACT[act]),
    })),
  },
};

/** The Ledger's last conversation; the racks and the reading desk open it, and the first step into the hall does (md_vault's
 * trigger). B6r: put the climaxes' start entries before `v_after` (the choice made). */
export const LEDGER_START: { if?: Cond; node: string }[] = [
  { if: NOT(AT_VAULT), node: 'v_none' },
  { if: F('a3_end'), node: 'v_after' },
  { if: NOT(F('a3_vault_met')), node: 'arrive' },
  { node: 'hub' },
];
export const d_a3_ledger: DialogueDef = { id: 'd_a3_ledger', owner: VOICE, start: LEDGER_START, nodes: LEDGER_NODES };

// ---------------------------------------------------------------- the couriers' drop, and the trunk

export const d_a3_vault_drop: DialogueDef = {
  id: 'd_a3_vault_drop', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The bottom of the couriers\' drop: a square shaft coming down out of the Spire\'s spine into a brass hopper the size of a bathtub, its lip worn bright. Paper lies in the trays along the wall in the order it fell, years of it, slips and returns and the city\'s own orders coming back to be read in, and none of it touched by a hand since it was posted. A plate on the shaft: COURIER DROP — R0. A second plate, lower and newer: SERVICE — SLOT AT SPIRE FOOT — KEEP CLEAR. Iron rungs go up the shaft\'s inside face into the dark.',
      again: 'The hopper, the trays, the rungs going up into the dark.',
      effects: [{ learn: 'a3_vault_drop_seen' }],
      passives: [
        { if: { knows: 'a3_drop_heard' }, label: 'the courier', text: 'The courier at the Precinct told you about a slot at the Spire\'s foot, for paper that goes in and does not come out. This is where it comes out.' },
        { if: { knows: 'ar_drop_heard' }, label: 'landing ninety-one', text: 'At the top of the Spire you put your ear to a brass slot and heard pages turning, very fast, a long way down. This is the long way down.' },
      ],
      interject: [
        { companion: NINE, text: '"Every slip I have ever filed came down this," Nine says. It looks at the trays for a long time. "I imagined it as a great deal tidier."' },
        { companion: WREN, text: 'Wren looks up the shaft the way she looks up anything she might need to climb in the dark, and puts one hand on the third rung, and takes it away. "Goes all the way up," she says. "Good to know."' },
      ],
      options: [{ id: 'vdrop.up', text: '(Look up the shaft.)', once: true, next: 'up' }, { text: '(Leave it.)', exit: true }],
    },
    up: {
      text: 'Forty metres of shaft, maybe more, and at the top a line of light no wider than a letter: the couriers\' slot at the Spire\'s foot, on the close. The rungs go all the way up. Somebody climbed them once, to clear a jam: there are boot scuffs on the third rung and on the thirtieth and on none between, as if whoever it was went up fast.',
      again: 'The rungs, and a letter\'s width of light at the top.',
      effects: [{ learn: 'a3_vault_shaft' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_a3_vault_trunk: DialogueDef = {
  id: 'd_a3_vault_trunk', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The trunk comes out of the raw rock at the hall\'s north-east corner: a cable as thick as a man\'s waist in a jacket of grey canvas gone stiff with age, running along the trench into a steel housing bolted to the floor. Two couplings on the housing, each with a wheel, each painted with its number, 1 and 2. The 1 is red. Stencilled across both: DO NOT UNCOUPLE UNDER LOAD. Under your palm the housing is warm, and hums the one note.',
      again: 'The trunk, its two couplings, DO NOT UNCOUPLE UNDER LOAD.',
      effects: [{ learn: 'a3_vault_trunk_seen' }],
      passives: [{ if: F('a3_bram_cut'), label: 'Bram', text: '"Same make," Bram said at the table. "Two couplings. The second puts her to sleep. The first, under load, and she never wakes. Page forty-one, in red, with a line round it that says don\'t."' }],
      interject: [
        { companion: KES, text: 'Kes crouches by the housing without touching it. "Everything in the city\'s on that," she says. "Pumps. Lamps. Gates. It all comes back here to one cable." She stands up. "That\'s not a city. That\'s a neck."' },
        { companion: ILYA, text: 'Ilya reads the stencil twice, the way he reads a label on a bottle. "Do not," he says. "Always the same two words on the things that matter."' },
      ],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const A3_VAULT_DIALOGUES: DialogueDef[] = [d_a3_ledger, d_a3_vault_drop, d_a3_vault_trunk];
