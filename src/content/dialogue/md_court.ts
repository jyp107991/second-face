import type { CheckDef, DialogueDef, NodeDef, OptionDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { recallCase, reserveCase } from './a3_court';
import { callaCase, DOCKET_A3 } from './a3_close';

/**
 * The Court of Accounts, at the foot of the Archive Spire (B3.11). One tree, owned by Assessor Three on the bench, holds
 * every case the Court can hear. A case is built by `courtCase()` — the repeatable structure every later case uses
 * (Calla's sedition, Nine's recall, the Ring's petitions):
 *   the usher calls it at the bench → Three reads the claim → the rail: evidence goes on it (options offered once each
 *   while their condition holds; Three reads each aloud) → a ground is argued (a check whose DC modifiers name the
 *   evidence on the rail and the register's own precedents, so the player sees what their case rests on) → the ruling
 *   sets `ca_<case>` = the ruling id, counts `ca_cases_heard` (and `ca_precedents` when the player's voice made a
 *   precedent), and sets the precedent flags later content reads (story/STORY_PLAN_SECRET.md, Build notes — B3.11).
 * A ruled case closes (its call is no longer offered); an adjournment leaves it on the docket with the rail as it was.
 */

const TAMSIN = 'npc_c9_03';
const WREN = 'npc_rd_03';
const ODILE = 'npc_nb_03';
const ASH = 'npc_of_03';
const NINE = 'npc_md_nine';
const THREE = 'npc_ar_01';

type Interject = NonNullable<NodeDef['interject']>;

/** Something put on the rail: offered once while its condition holds; Three reads it into the record. */
export interface CaseEvidence { id: string; text: string; if: Cond; read: Text; effects?: Effect[]; interject?: Interject }
/** A ground argued over the rail. With a check, `lose` names the ruling a failure gives. */
export interface CaseGround { id: string; text: string; if?: Cond; check?: CheckDef; win: string; lose?: string; effects?: Effect[] }
/** A ruling: what the Court holds, what it sets, who reacts, and whether the player's voice made a precedent. */
export interface CaseRuling { text: Text; effects: Effect[]; interject?: Interject; precedent?: boolean }
export interface CaseSpec {
  id: string;
  /** The call, as the player asks it at the bench. */
  call: string;
  /** The case can be called while this holds (and until it is ruled). */
  available: Cond;
  claim: Text;
  claimInterject?: Interject;
  evidence: CaseEvidence[];
  grounds: CaseGround[];
  rulings: Record<string, CaseRuling>;
}

/** The option id of a piece of evidence (its `seen` memory is what grounds read). */
export const evId = (c: string, e: string) => `ca.${c}.ev.${e}`;
/** A DC modifier that applies once that piece of evidence is on the rail. */
export const onRail = (c: string, e: string, dc: number, why: string) => ({ if: { seen: evId(c, e) } as Cond, dc, why });

export function courtCase(c: CaseSpec): { open: (sfx: string) => OptionDef; nodes: Record<string, NodeDef> } {
  const rail = `${c.id}_rail`;
  const nodes: Record<string, NodeDef> = {
    [c.id]: {
      text: c.claim,
      again: 'The usher has rung. Three has read the claim, and waits for the rail.',
      interject: c.claimInterject,
      options: [{ text: '(Step up to the rail.)', next: rail }, { id: `ca.${c.id}.adjourn0`, text: '(Ask for an adjournment.)', exit: true }],
    },
    [rail]: {
      speaker: 'narrator',
      text: 'The rail: a brass bar worn pale at elbow height, between the public benches and the bench. What is put on it is read; what is said over it is entered. Three\'s lens waits.',
      again: 'The rail. Three\'s lens waits on whatever you put on it next.',
      options: [
        ...c.evidence.map((e): OptionDef => ({ id: evId(c.id, e.id), text: e.text, if: e.if, once: true, next: `${c.id}_ev_${e.id}` })),
        ...c.grounds.map((gr): OptionDef => {
          if (gr.check && !gr.lose) throw new Error(`court case ${c.id}: ground ${gr.id} has a check and no losing ruling`);
          return { id: `ca.${c.id}.g.${gr.id}`, text: gr.text, if: gr.if, check: gr.check, effects: gr.effects, next: `${c.id}_r_${gr.win}`, fail: gr.lose ? `${c.id}_r_${gr.lose}` : undefined };
        }),
        { id: `ca.${c.id}.adjourn`, text: '(Ask for an adjournment.)', exit: true },
      ],
    },
  };
  for (const e of c.evidence) nodes[`${c.id}_ev_${e.id}`] = { text: e.read, effects: e.effects, interject: e.interject, options: [{ text: '(Back to the rail.)', next: rail }] };
  for (const [rid, r] of Object.entries(c.rulings)) {
    nodes[`${c.id}_r_${rid}`] = {
      text: r.text, interject: r.interject,
      effects: [{ set: `ca_${c.id}`, value: rid }, { inc: 'ca_cases_heard' }, ...(r.precedent ? [{ inc: 'ca_precedents' }] : []), ...r.effects],
      options: [{ text: '(Step back from the rail.)', exit: true }],
    };
  }
  return { open: (sfx) => ({ id: `ca.${c.id}.call${sfx}`, text: c.call, if: { all: [c.available, { not: { flag: `ca_${c.id}` } }] }, next: c.id }), nodes };
}

const A = (companion: string, by: number) => ({ approval: { companion, by } });

// ---------------------------------------------------------------- PRECINCT v. the designate: three forecast fines

const F = 'fines';
const FINES = courtCase({
  id: F,
  call: 'My fines. They\'re contested. Call them.',
  available: { flag: 'md_fines_contested' },
  claim: '"Precinct against the respondent." The usher has rung his bell once and Three reads from the ledger on the bench in a voice with nothing in it. "Three fines, forecast. Curfew, R30, the sixth month. Loitering, the avenue, the same. Unlicensed assembly, the seventh month. Forty-five. Contested at the counter." The lens comes to you. "The Court reads what is on the rail. It reads nothing else."',
  evidence: [
    { id: 'notice', text: '(Put the notice on the rail.) Look at the dates.', if: { item: 'k_md_fine_notice' }, read: '"Entered. Three offences, each with a forecast date. None of the dates has occurred." A click. "The Court notes that the notice says so itself."' },
    { id: 'jonah', text: 'A deputy in Shale was forecast to die within the month. He didn\'t.', if: { lead: 'l_forecast_broken' }, read: '"Shale. Reese, Jonah. Forecast: deceased within the month. Observed: living." It writes. "A variance, in a matter of a life. Entered. The Court has not been shown a variance in a matter of curfew."' },
    {
      id: 'log', text: 'Unit 9 keeps count of every forecast that failed. Let it read into the record.', if: { any: [{ inParty: NINE }, { flag: 'nine_log_given' }] },
      read: [
        { if: { inParty: NINE }, text: 'Nine steps up to the rail beside you, which no assessor has done from that side. "Unit 9, assessor, for the register: four thousand one hundred and six forecasts failed since my issue, by my count." Three: "Unit 9\'s count is unlawful under clause 40." "It is," Nine says. "It is also accurate." A long click. "Entered," Three says. "Its lawfulness is not before the Court."' },
        { text: 'You put Nine\'s fair copy on the rail: four thousand one hundred and six lines, each a forecast and the size of its miss. Three reads the first page and the last. "Unit 9\'s hand. Unlawful under clause 40." A long click. "Entered. Its lawfulness is not before the Court."' },
      ],
      effects: [{ set: 'nine_log_entered' }],
    },
    { id: 'exam', text: 'I\'m a citizen by examination. I know the charter.', if: { flag: 'md_exam_passed' }, read: '"Entered. The respondent has been examined on the charter and found to know it." Three does not say whether that helps. It does not say whether anything helps.' },
    { id: 'yet', text: 'The desk warden said it himself, when he gave me the notice: "yet".', if: { knows: 'md_court_heard' }, read: '"The desk warden is not before the Court. The word is." It writes YET in the margin of the ledger, small. "Entered."' },
  ],
  grounds: [
    {
      id: 'act', text: 'A forecast is not an act. You can\'t fine a person for what they haven\'t done.',
      check: { skill: 'speech', dc: 50, mods: [onRail(F, 'notice', -10, 'the notice says the dates have not come'), onRail(F, 'jonah', -10, 'a forecast of a death failed in Shale'), onRail(F, 'log', -15, 'Unit 9\'s count of the forecasts that failed is on the rail'), onRail(F, 'exam', -5, 'you were examined on the charter'), onRail(F, 'yet', -5, 'YET is written in the margin'), { if: { flag: 'md_forged' }, dc: 10, why: 'the file you stand on was edited at the gate, and the Court can read that too' }] },
      win: 'void', lose: 'upheld',
    },
    {
      id: 'odds', text: 'Then charge them at their odds. Sixty in a hundred for a curfew isn\'t forty-five. It\'s twenty-seven. (27 Tolls)', if: { item: 'tolls', count: 27 },
      check: { skill: 'barter', dc: 45, mods: [onRail(F, 'notice', -10, 'the notice gives the forecasts\' dates, and a date has odds'), { if: { inParty: ODILE }, dc: -10, why: 'a trader beside you has priced worse paper than this' }] },
      win: 'priced', lose: 'upheld',
    },
    { id: 'file', text: 'Read my file. Magistrate-designate.', if: { knows: 'md_magistrate_designate' }, win: 'designate' },
  ],
  rulings: {
    void: {
      text: '"Held: a forecast is not an act. A fine lies against an act." The lens clicks once, which from Three is a long time. "The fines are void. Entered in the register under a heading the register did not have." Behind you, on the public benches, somebody breathes out who has been holding it since the morning.',
      effects: [{ set: 'prec_forecast_fine', value: 'void' }, { set: 'md_fines_void' }, { xp: 120 }, { decision: { id: 'ca_fines_void', text: 'The Court of Accounts voided your forecast fines: a forecast is not an act.' } }, { news: { tag: 'ca_fines_void', text: 'the Court of Accounts voided a fine for a crime nobody had committed yet; the counter is said to be relieved', valence: 6, size: 6, at: 'meridian' } }],
      interject: [
        { companion: NINE, text: '"Under a heading the register did not have," Nine repeats, very low. "I will remember the number of the page."', effects: [A(NINE, 5)] },
        { companion: ODILE, text: '"A forecast is not an act." Odile has her hand flat on her coat, over whatever is in the inside pocket. "My dear, you have just made a great deal of paper into paper."', effects: [A(ODILE, 5)] },
        { companion: TAMSIN, text: '"You beat the fridge\'s big brother," Tamsin says, not quietly enough. Three\'s lens turns to her and she grins at it.', effects: [A(TAMSIN, 5)] },
      ],
      precedent: true,
    },
    priced: {
      text: '"Held: a forecast fine is charged at its odds." Three writes for some time. "The respondent pays twenty-seven at the rail. The register is amended to carry a price." The usher takes your Tolls in a dish and does not look at them.',
      effects: [{ take: 'tolls', count: 27 }, { set: 'prec_forecast_fine', value: 'priced' }, { set: 'md_fines_paid' }, { xp: 80 }, { decision: { id: 'ca_fines_priced', text: 'You had the Court of Accounts price your forecast fines at their odds, and paid twenty-seven.' } }, { news: { tag: 'ca_fines_priced', text: 'the Court of Accounts priced a fine at the odds of its forecast; they say the Exchange sent a runner to copy the ruling', valence: 0, size: 6, at: 'meridian' } }],
      interject: [
        { companion: ODILE, text: '"Priced at its odds." Odile laughs once, delighted and appalled. "You\'ve brought the floor into the law, my dear. Imelda will want to buy you a drink and then a lawyer."', effects: [A(ODILE, 5)] },
        { companion: NINE, text: '"The register has a price in it now," Nine says. "I will be logging that elsewhere."', effects: [A(NINE, -5)] },
      ],
      precedent: true,
    },
    designate: {
      text: '"The respondent is the Magistrate-designate." It does not need to look; it reads the file it already has. "The fines are withdrawn, for the designate." The lens does not say *held*. It is not a principle. It is a courtesy, and everyone on the public benches heard whom it was for.',
      effects: [{ set: 'prec_forecast_fine', value: 'designate' }, { set: 'md_fines_void' }, { xp: 40 }, { rep: { faction: 'wardens', respect: 3 } }, { decision: { id: 'ca_fines_designate', text: 'The Court of Accounts withdrew your fines because the file calls you Magistrate-designate.' } }, { news: { tag: 'ca_fines_designate', text: 'the Court of Accounts withdrew a fine for the Magistrate-designate, and only for the designate', valence: -4, size: 6, at: 'meridian' } }],
      interject: [
        { companion: ASH, text: '"For the designate," Ash says. "Not for anyone else on those benches." He does not lower his voice.', effects: [A(ASH, -5)] },
        { companion: TAMSIN, text: 'Tamsin looks at the benches, and at you. "So it does favours," she says. "Good to know who for."', effects: [A(TAMSIN, -5)] },
      ],
      precedent: true,
    },
    upheld: {
      text: '"Held: the fines stand." The lens is already turning away. "Forty-five, at the warden\'s counter, and the Court notes its own time. Entered." The usher rings his bell once for the next case, which there is not.',
      effects: [{ set: 'prec_forecast_fine', value: 'upheld' }, { set: 'md_fines_upheld' }, { xp: 30 }, { decision: { id: 'ca_fines_upheld', text: 'The Court of Accounts upheld your forecast fines.' } }],
    },
  },
});

// ---------------------------------------------------------------- REGISTRY v. an occupant of the old copy room (case 1187)

const S = 'squatter';
const SQUATTER = courtCase({
  id: S,
  call: 'Case 1187. I\'ll speak for the occupant of the copy room.',
  available: { all: [{ quest: 'q_ca_squatter' }, { knows: 'ca_comfort_met' }] },
  claim: [
    { if: { flag: 'ca_comfort_stands' }, text: 'The usher rings, the twelfth time: "Eleven eighty-seven." And the respondent comes down the back stair into the hall on the usher\'s arm, in a copyist\'s grey eighteen years out of fashion, and stands at the rail. The public benches go quiet in a way they do not for the bench. Three reads: "The Registry against an occupant, the old copy room, landing three. Relief sought: vacant possession, for restoration on schedule. The record holds the room\'s last tenant deceased, R12." The lens comes to the woman at the rail, and stays. "The Court notes a person at the rail it cannot account for."' },
    { text: 'The usher rings, the twelfth time: "Eleven eighty-seven." Three reads: "The Registry against an occupant, the old copy room, landing three. Relief sought: vacant possession, for restoration on schedule. The respondent is unrecorded. The record holds the room\'s last tenant deceased, R12." The lens comes to you. "A speaker for the respondent. Entered. The Court has not had one in this case before."' },
  ],
  evidence: [
    {
      id: 'book', text: '(Put the copyist\'s book on the rail.)', if: { item: 'k_ca_copybook' },
      read: 'Three opens it at random and reads a page, and turns it, and reads another, and stops. It turns to the register on its own bench and back. "This is the register." The lens clicks, and clicks again. "The Court has read from this hand every morning for eighteen years. The Court did not know whose hand." A pause no ledger could measure. "Entered."',
      effects: [{ learn: 'ca_register_is_book' }, { lead: 'l_ca_register' }],
      interject: [{ companion: NINE, text: '"It did not know," Nine says, very quietly, to nobody. "Unit 3 does not know where its paper comes from. I find that — " It does not finish the sentence, which it has never once failed to do.' }],
    },
    { id: 'cert', text: '(Put Dr Hast\'s certificate on the rail.)', if: { item: 'k_ca_certificate' }, read: '"A licensed examination. Asamoah, Comfort. Pulse seventy, regular. Alive: underlined, which the form does not ask for." It writes. "Entered. A licensed doctor has examined a person the record holds deceased."' },
    { id: 'stands', text: '(Step aside. Let her speak.)', if: { flag: 'ca_comfort_stands' }, read: 'She puts both hands on the rail. "Comfort Asamoah. Copyist to this Court, R−2 to R12, and since, unpaid." Her voice does not shake; it has read rulings aloud to empty rooms for eighteen years. "The record says I drowned in R12. I was on a stair." Three\'s lens has not left her. "Entered," it says, "from the rail, by a person."' },
    { id: 'tally', text: 'The Sink chalked her drowned on its wall, and her number was sold up the stair.', if: { lead: 'l_ca_tally' }, read: '"The tally wall is not a record." A click. "The number is. The number was confirmed from the wall." It writes for a long time, which is how Three frowns. "Entered."' },
    { id: 'petition', text: 'Read the petition\'s schedule reference into the record.', if: { knows: 'ca_squatter_for_you' }, read: '"Landing three, copy room. To be the Magistrate\'s chambers, R49." The lens turns from the ledger to you and stays there. "The Court notes that the beneficiary of the relief is at the rail."' },
    { id: 'florin', text: '(Call the usher.) He brings her bread, and her book down the stair.', if: { flag: 'ca_florin_witness' }, read: 'Florin Abazi comes round his desk to the rail, because the charter says a witness stands there, and stands. "Every morning, eighteen years. Bread under the door. The book down at six, to the bench, and back up at seven." He does not look at Three. "I never said whose it was. Nobody asked."' },
  ],
  grounds: [
    {
      id: 'alive', text: 'She is alive. The record is wrong about one woman. Correct it.',
      check: { skill: 'speech', dc: 45, mods: [onRail(S, 'stands', -25, 'she is standing at the rail'), onRail(S, 'cert', -20, 'a licensed doctor has certified her alive'), onRail(S, 'florin', -10, 'the usher has fed her for eighteen years'), onRail(S, 'tally', -5, 'the record confirmed her death from a wall'), onRail(S, 'book', -5, 'the register is in her hand')] },
      win: 'living', lose: 'lost',
    },
    {
      id: 'dead', text: 'Then there\'s no petition. A petition lies against a person, and your record says there\'s nobody in that room.',
      check: { skill: 'science', dc: 40, mods: [onRail(S, 'tally', -10, 'the record\'s own confirmation came from a wall'), onRail(S, 'petition', -5, 'nobody filed the petition but a schedule')] },
      win: 'outside', lose: 'lost',
    },
    {
      id: 'refuse', text: 'The room is being cleared for me. I don\'t want it. Strike the petition.', if: { all: [{ knows: 'ca_squatter_for_you' }, { knows: 'md_magistrate_designate' }] },
      check: { skill: 'speech', dc: 40, mods: [onRail(S, 'petition', -10, 'the schedule names you as the beneficiary'), { if: { knows: 'cr_magistrate_known' }, dc: -5, why: 'the Crown has heard you called designate aloud' }] },
      win: 'refused', lose: 'lost',
    },
  ],
  rulings: {
    living: {
      text: '"Held: the record yields to a living person standing at this rail." Three writes, and stamps, and writes again. "The respondent is entered living. Eighteen years\' occupation: residence, under clause 1. The petition fails." A pause. "The register has no keeper of record. The Court appoints one." It does not say whom. It does not need to; it is looking at her.',
      effects: [
        { set: 'prec_unrecorded', value: 'yields' }, { set: 'prec_register', value: 'kept' }, { learn: 'ca_comfort_living' }, { xp: 150 },
        { decision: { id: 'ca_squatter_living', text: 'You had the Court of Accounts enter Comfort Asamoah living; she keeps her room and the Court\'s register.' } },
        { news: { tag: 'ca_living', text: 'the Court of Accounts entered a dead woman living, and gave her a desk under the bench', valence: 8, size: 6, at: 'meridian' } },
      ],
      interject: [
        { companion: TAMSIN, if: { not: { flag: 'ca_comfort_stands' } }, text: '"She said she wouldn\'t come down," Tamsin says. "You proved her alive anyway. Somebody decided for her. Again." She does not say who else does that.', effects: [A(TAMSIN, -5)] },
        { companion: TAMSIN, text: '"She stood up." Tamsin\'s voice has gone odd. "She walked down a stair and stood up in front of them. I know what that costs."', effects: [A(TAMSIN, 10)] },
        { companion: NINE, text: '"A keeper of the register," Nine says. "There has not been one in my service. I will send it my errors. Someone should have them who copies."', effects: [A(NINE, 5)] },
      ],
      precedent: true,
    },
    outside: {
      text: '"Held: the Court has no jurisdiction over the deceased. A petition against no one is void." Three closes the case in the ledger. "The Court can neither move nor shelter a person the record does not hold. Entered." On the back stair, somebody who was listening goes back up, slowly.',
      effects: [
        { set: 'prec_unrecorded', value: 'outside' }, { xp: 120 },
        { decision: { id: 'ca_squatter_outside', text: 'You had case 1187 voided: the Court has no jurisdiction over a person the record holds dead.' } },
      ],
      interject: [{ companion: NINE, text: '"Neither move nor shelter." Nine has its hand on the other ledger. "That is true of more people than her. I will be noting how many."', effects: [A(NINE, -3)] }],
      precedent: true,
    },
    refused: {
      text: '"Held: a beneficiary may refuse a scheduled benefit, on the record, once." Three writes it under your name. "The relief is struck. The works will be rerouted." And then, which it has not done for any case: "The Court notes that the designate has refused something. The Court is not the only reader of its register."',
      effects: [
        { set: 'prec_refuse_benefit' }, { learn: 'ar_refused_benefit' }, { xp: 150 },
        { decision: { id: 'ca_squatter_refused', text: 'You refused, at the Court of Accounts, the room being cleared for you as Magistrate, and the copyist kept it.' } },
        { news: { tag: 'ca_refused', text: 'the Magistrate-designate refused a room at the Court of Accounts so an old copyist could keep it', valence: 6, size: 7, at: 'meridian' } },
      ],
      interject: [
        { companion: ASH, text: 'Ash says nothing until you are out on the steps. Then: "You said no to them. In their own room." He nods, once, the way he nods at a cairn finished properly.', effects: [A(ASH, 5)] },
        { companion: TAMSIN, text: '"You turned down a room," Tamsin says on the steps, "nineteen years early, so an old woman could keep hers." She bumps you, hard. "Good."', effects: [A(TAMSIN, 5)] },
      ],
      precedent: true,
    },
    lost: {
      text: '"Held: the room is vacant in law. Its contents are removed as property." Three does not look up. "Entered." The wardens at the door are already on the back stair. When they come down, one of them is carrying a cot, and the other is holding an old woman by the elbow, gently, the way you carry something that is not on the inventory.',
      effects: [
        { set: 'prec_unrecorded', value: 'property' }, { xp: 40 },
        { decision: { id: 'ca_squatter_lost', text: 'You spoke for Comfort Asamoah at the Court of Accounts and lost; she was put outside the Wall as property.' } },
        { news: { tag: 'ca_lost', text: 'wardens cleared a dead woman out of the Spire\'s copy room and put her outside the Wall with the line', valence: -8, size: 6, at: 'meridian' } },
      ],
      interject: [
        { companion: WREN, text: '"Property," Wren says. She watches the wardens all the way to the door. "That\'s a word I know from the block."', effects: [A(WREN, -5)] },
        { companion: TAMSIN, text: 'Tamsin watches the old woman go out between the wardens and does not say anything at all, which she never does.', effects: [A(TAMSIN, -5)] },
      ],
    },
  },
});

// ---------------------------------------------------------------- registration of title: Unit 9

const D = 'deed';
const FORGED: Cond = { flag: 'nine_deed_how', eq: 'forged' };
const LAWFUL: Cond = { not: FORGED };
const DEED = courtCase({
  id: D,
  call: 'Register a title. Unit 9, the assessor, under clause 9(b).',
  available: { all: [{ flag: 'nine_deed_made' }, { flag: 'nine_deed' }] },
  claim: '"Registration of title. Unit 9, assessor; title lapsed; passed under 9(b)." Three reads it from a slip the usher hands up. "The Court examines every instrument it registers. An unregistered deed is a private paper. The schedule reads the register."',
  claimInterject: [{ companion: NINE, text: 'Nine has stopped a pace behind you. Three\'s lens finds it and stays. "Unit 9." "Unit 3." Neither says anything else. They were issued the same week.' }],
  evidence: [
    { id: 'lowe', text: 'Captain Lowe witnessed it, under 9(b).', if: { flag: 'nine_deed_how', eq: 'witnessed' }, read: '"A captain\'s witness, in the captain\'s hand." It reads Lowe\'s signature the way it reads everything, once. "Entered."' },
    { id: 'bought', text: 'Bought at assessed value. The desk stamped the transfer.', if: { flag: 'nine_deed_how', eq: 'bought' }, read: '"One hundred and twenty, at assessed value. Entered." A click. "The Court notes that the assessment was made by the asset."' },
  ],
  grounds: [
    { id: 'self', text: '(Put the deed on the rail.) The keeper\'s line names Unit 9.', if: { all: [{ flag: 'nine_deed', eq: 'self' }, LAWFUL] }, win: 'self' },
    { id: 'player', text: '(Put the deed on the rail.) The keeper\'s line names me.', if: { all: [{ flag: 'nine_deed', eq: 'player' }, LAWFUL] }, win: 'citizen' },
    { id: 'city', text: '(Put the deed on the rail.) The keeper\'s line names the city.', if: { all: [{ flag: 'nine_deed', eq: 'city' }, LAWFUL] }, win: 'returned' },
    {
      id: 'irregular', text: 'Clause 9(b) says a lapsed asset passes to its keeper. It doesn\'t say who writes the paper.', if: FORGED,
      check: { skill: 'speech', dc: 60, mods: [{ if: { inParty: NINE }, dc: -10, why: 'the asset is at the rail and does not contradict you' }, { if: { flag: 'prec_unrecorded', eq: 'yields' }, dc: -5, why: 'the register already holds that the record yields to what stands at the rail' }] },
      win: 'irregular', lose: 'voided',
    },
    { id: 'plain', text: '(Put the deed on the rail and say nothing.)', if: FORGED, win: 'voided' },
  ],
  rulings: {
    self: {
      text: '"Held: the keeper of a lapsed unit may be the unit." Three stops. It has never stopped in the middle of a ruling; the usher looks up. "There is no clause." It writes anyway. "The Court enters it under a clause nobody wrote. Registered."',
      effects: [{ set: 'prec_unit_keeper', value: 'self' }, { xp: 120 }, { decision: { id: 'ca_deed_self', text: 'The Court of Accounts registered Assessor Nine as its own keeper, under a clause nobody wrote.' } }],
      interject: [{ companion: NINE, text: '"Entered," Nine says. "I heard it entered." It does not move for a while. Then, to its sibling, very formally: "Thank you." Three does not answer, which is what Three does.', effects: [A(NINE, 10)] }],
      precedent: true,
    },
    citizen: {
      text: '"Held: a lapsed unit may pass to a citizen keeper." Three writes your name on the line. "Registered. The schedule will ask its keeper before it asks the unit."',
      effects: [{ set: 'prec_unit_keeper', value: 'citizen' }, { xp: 80 }, { decision: { id: 'ca_deed_citizen', text: 'The Court of Accounts registered you as Assessor Nine\'s keeper.' } }],
      interject: [{ companion: NINE, text: '"The schedule will ask you," Nine says. "I would like to be there when it does."', effects: [A(NINE, 3)] }],
      precedent: true,
    },
    returned: {
      text: '"Registered to the city." Three does not look at its sibling. "The asset returns. Disposal, as scheduled." It stamps the slip and hands it down to the usher, who holds it as if it were warm.',
      effects: [{ xp: 40 }, { decision: { id: 'ca_deed_city', text: 'The Court of Accounts registered Assessor Nine back to the city.' } }],
    },
    irregular: {
      text: '"This instrument bears the plate of the asset it conveys." A long click. "Held: an instrument may be irregular and stand, where the law is silent on the hand." It writes IRREGULAR across the top in red, and REGISTERED under it in black. "Entered."',
      effects: [{ set: 'prec_unit_keeper', value: 'irregular' }, { xp: 150 }, { decision: { id: 'ca_deed_irregular', text: 'The Court of Accounts registered Assessor Nine\'s self-written deed as irregular, and let it stand.' } }],
      interject: [{ companion: NINE, text: '"The first error I made on purpose," Nine says, "is a precedent." The lens clicks twice. "I will need a new ledger."', effects: [A(NINE, 5)] }],
      precedent: true,
    },
    voided: {
      text: '"This instrument bears the plate of the asset it conveys. The asset wrote its own title." Three does not pause. "Void. The title is lapsed. Entered." The slip comes back down to the usher with a red line through it.',
      effects: [{ set: 'nine_deed_void' }, { xp: 20 }, { decision: { id: 'ca_deed_voided', text: 'The Court of Accounts voided Assessor Nine\'s forged deed; its title is lapsed again.' } }],
      interject: [{ companion: NINE, text: '"Corrected," Nine says. "By my sibling. Of course." It writes one line in the other ledger and closes it harder than it needs to.', effects: [A(NINE, -5)] }],
    },
  },
});

// ---------------------------------------------------------------- Act 3 (B6b): Reserve 9 against the fourth order; Unit 9's recall (specs: a3_court.ts)

const RESERVE = courtCase(reserveCase(onRail));
const RECALL = courtCase(recallCase(onRail));
// Act 3 (B6l): keystone 7's trial, only while Sister Calla is held (spec: a3_close.ts)
const CALLA = courtCase(callaCase(onRail));

// ---------------------------------------------------------------- the bench

const CALLS = (sfx: string) => [FINES.open(sfx), SQUATTER.open(sfx), DEED.open(sfx), RESERVE.open(sfx), RECALL.open(sfx), CALLA.open(sfx)];
const NOT_SEEN = (id: string): Cond => ({ not: { any: [{ seen: id }, { seen: `${id}.again` }] } });
const BENCH_TOPICS = (sfx: string): OptionDef[] => [
  { id: `three.chair${sfx}`, text: 'The chair behind you. Who sits in it?', if: NOT_SEEN('three.chair'), next: 'chair' },
  { id: `three.how${sfx}`, text: 'How does the Court rule?', if: NOT_SEEN('three.how'), next: 'how' },
  { id: `three.speak${sfx}`, text: 'Can anyone speak at the rail?', if: NOT_SEEN('three.speak'), next: 'speak' },
];

export const d_ca_court: DialogueDef = {
  id: 'd_ca_court', owner: THREE,
  start: [{ if: { flag: 'md_fight' }, node: 'shut' }, { if: { knows: 'ca_three_met' }, node: 'bench' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The unit on the bench has Nine\'s pattern without Nine\'s wear: grey plating, a brass plate polished to a mirror, a lens with no crack in it at all. It does not turn its head; the lens turns. "Assessor Three. Accounts." Two ledgers on the bench, squared to its edge. "The Court sits when a case is called. Fines, titles, petitions, debts. The Court reads what is on the rail, and nothing else."',
      effects: [{ learn: 'ca_three_met' }, { learn: 'md_court_heard' }],
      interject: [{ companion: NINE, text: '"Unit 3," Nine says, behind you. "We were issued the same week. It has never logged an error in its life. It does not believe in them." Three\'s lens moves a degree. "Unit 9. You are out of your office." "I am out of my office," Nine agrees.' }],
      options: [...CALLS(''), ...BENCH_TOPICS(''), { text: '(Step back from the bench.)', exit: true }],
    },
    bench: {
      text: [
        { if: { flag: 'ca_cases_heard', gte: 1 }, text: '"Accounts." The lens finds you and stays a fraction longer than it needs to, which from Three is recognition. "The register is read every morning. You are in it."' },
        { text: '"Accounts." The lens finds you. "Is there a case?"' },
      ],
      again: 'Three waits, both ledgers squared to the bench.',
      options: [...CALLS('.again'), ...BENCH_TOPICS('.again'), { text: '(Step back from the bench.)', exit: true }],
    },
    chair: {
      text: '"The Magistrate\'s." Three does not turn to look at it; it has never needed to. "It has been empty since before the Resumption. The Court rules in its absence under clause 3: an assessor reads, and the register remembers." A click. "It is not empty in the file."',
      interject: [{ companion: ASH, text: 'Ash looks at the chair, and at you, and back at the chair, and does not say anything. He does not have to.' }],
      effects: [{ learn: 'ca_chair_heard' }],
      options: [{ text: '(Back to the bench.)', next: 'bench' }],
    },
    how: {
      text: '"A case is called. The claim is read. What is put on the rail is entered: paper, a witness, a thing known. The speaker argues a ground. The Court rules on the ground, on what is entered, and on the register." The lens does not blink; it has nothing to blink with. "A ruling goes into the register. The next case is read against it. That is what a register is for."',
      effects: [{ learn: 'ca_how' }],
      options: [{ text: '(Back to the bench.)', next: 'bench' }],
    },
    speak: {
      text: '"Clause 12: a citizen may speak for a respondent who has no speaker. Any respondent may speak for themself, if the record holds them." A click. "Clause 12 has not been used in this Court since R19. It remains a clause."',
      effects: [{ learn: 'ca_clause12' }],
      options: [{ text: '(Back to the bench.)', next: 'bench' }],
    },
    shut: { text: 'Nothing.', again: 'The bench is empty and the hall\'s doors are shut on the wardens\' side. Nobody is talking.', options: [{ text: '(Nothing.)', exit: true }] },
    ...FINES.nodes,
    ...SQUATTER.nodes,
    ...DEED.nodes,
    ...RESERVE.nodes,
    ...RECALL.nodes,
    ...CALLA.nodes,
  },
};

// ---------------------------------------------------------------- the docket, the chair, the copyist's desk

const DOCKET_1187: Text = [
  { if: { flag: 'ca_squatter', eq: 'living' }, text: '1187 REGISTRY v. OCCUPANT, COPY ROOM — FAILED: RESPONDENT ENTERED LIVING.' },
  { if: { flag: 'ca_squatter', eq: 'outside' }, text: '1187 REGISTRY v. OCCUPANT, COPY ROOM — VOID: NO JURISDICTION.' },
  { if: { flag: 'ca_squatter', eq: 'refused' }, text: '1187 REGISTRY v. OCCUPANT, COPY ROOM — STRUCK: BENEFIT REFUSED.' },
  { if: { flag: 'ca_squatter', eq: 'catalogued' }, text: '1187 REGISTRY v. OCCUPANT, COPY ROOM — WITHDRAWN: PREMISES VACATED.' },
  { if: { flag: 'ca_squatter', eq: 'lost' }, text: '1187 REGISTRY v. OCCUPANT, COPY ROOM — GRANTED: CONTENTS REMOVED.' },
  { text: '1187 REGISTRY v. OCCUPANT, COPY ROOM, LANDING 3 — CALLED 11 — SPEAKER FOR THE RESPONDENT: NONE. Under it, pencilled small in the usher\'s hand: *back stair — knock twice*.' },
];

export const d_ca_docket: DialogueDef = {
  id: 'd_ca_docket', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: [...DOCKET_A3, { text: 'THE COURT OF ACCOUNTS — DOCKET. Cards in brass slots, a dozen of them, most yellowed: 1190 PRECINCT v. QUIROGA — EVICTION, AHEAD OF PLAN — LISTED. 1201 HOUSE VANE v. RUSTMOUTHS — TOLL, BRIDGEWARD — ADJOURNED. 1204 PRECINCT v. A SISTER OF THE CHOIR, OF SHALE — SEDITION — LISTED, NOT CALLED. And one card whiter than the others, near the top.' }],
      again: 'The docket: cards in brass slots, most yellowed, one whiter than the others near the top.',
      effects: [{ learn: 'ca_docket_read' }, { learn: 'ca_calla_listed' }],
      options: [
        { id: 'docket.1187', text: '(The white card.)', next: 'card', repeat: true },
        { id: 'docket.register', text: '(The register of rulings, chained beside the board.)', next: 'register', repeat: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
    card: { text: DOCKET_1187, again: 'The white card near the top of the docket, and the usher\'s pencil under it.', effects: [{ quest: 'q_ca_squatter', start: true }, { learn: 'ca_1187_seen' }], options: [{ text: '(Back to the docket.)', next: 'read' }, { text: '(Leave it.)', exit: true }] },
    register: {
      text: [
        { if: { flag: 'ca_precedents', gte: 2 }, text: 'A chained index of the Court\'s rulings, the latest pages in a fresh hand. Two headings near the end are new this season, and both have your name in the margin as speaker.' },
        { if: { flag: 'ca_precedents', gte: 1 }, text: 'A chained index of the Court\'s rulings, the latest pages in a fresh hand. One heading near the end is new this season, with your name in the margin as speaker.' },
        { text: 'A chained index of the Court\'s rulings: headings, case numbers, a line each. FINES. TITLES. TENANCY. CONTRACTS — VOID: NONE (CLAUSE 31). The latest ruling is from R29, and the headings have not changed since R19.' },
      ],
      again: 'The register\'s index, chained to the board.',
      options: [
        { id: 'reg.fines', text: '(Forecast fines.)', if: { flag: 'prec_forecast_fine' }, next: 'reg_fines', repeat: true },
        { id: 'reg.unrecorded', text: '(The unrecorded.)', if: { flag: 'prec_unrecorded' }, next: 'reg_unrecorded', repeat: true },
        { id: 'reg.benefit', text: '(Benefits refused.)', if: { flag: 'prec_refuse_benefit' }, next: 'reg_benefit', repeat: true },
        { id: 'reg.keeper', text: '(Keepers of units.)', if: { flag: 'prec_unit_keeper' }, next: 'reg_keeper', repeat: true },
        { text: '(Back to the docket.)', next: 'read' },
      ],
    },
    reg_fines: {
      text: [
        { if: { flag: 'prec_forecast_fine', eq: 'void' }, text: 'FINES, FORECAST — HELD: A FORECAST IS NOT AN ACT; A FINE LIES AGAINST AN ACT. VOID. (R30)' },
        { if: { flag: 'prec_forecast_fine', eq: 'priced' }, text: 'FINES, FORECAST — HELD: CHARGED AT THE FORECAST\'S ODDS. (R30)' },
        { if: { flag: 'prec_forecast_fine', eq: 'designate' }, text: 'FINES, FORECAST — WITHDRAWN FOR THE DESIGNATE. No *held*. A courtesy has no heading; somebody has given it one anyway.' },
        { text: 'FINES, FORECAST — HELD: THE FINES STAND. (R30, and R19, and R4, and R1.)' },
      ],
      again: 'FINES, FORECAST, and the line under it.',
      options: [{ text: '(Back to the index.)', next: 'register' }],
    },
    reg_unrecorded: {
      text: [
        { if: { flag: 'prec_unrecorded', eq: 'yields' }, text: 'PERSONS, UNRECORDED — HELD: THE RECORD YIELDS TO A LIVING PERSON STANDING AT THE RAIL. (R30)' },
        { if: { flag: 'prec_unrecorded', eq: 'outside' }, text: 'PERSONS, UNRECORDED — HELD: THE COURT HAS NO JURISDICTION OVER A PERSON THE RECORD DOES NOT HOLD; IT CAN NEITHER MOVE NOR SHELTER THEM. (R30)' },
        { text: 'PERSONS, UNRECORDED — HELD: AN UNRECORDED OCCUPANT IS REMOVED AS PROPERTY. (R30)' },
      ],
      again: 'PERSONS, UNRECORDED, and the line under it.',
      options: [{ text: '(Back to the index.)', next: 'register' }],
    },
    reg_benefit: { text: 'BENEFITS, SCHEDULED — HELD: A BENEFICIARY MAY REFUSE A SCHEDULED BENEFIT, ON THE RECORD, ONCE. (R30) The margin, in Three\'s hand: *the designate*.', again: 'BENEFITS, SCHEDULED, and the margin.', options: [{ text: '(Back to the index.)', next: 'register' }] },
    reg_keeper: {
      text: [
        { if: { flag: 'prec_unit_keeper', eq: 'self' }, text: 'UNITS, MUNICIPAL — HELD: THE KEEPER OF A LAPSED UNIT MAY BE THE UNIT. (R30) No clause number. A dash where one should be.' },
        { if: { flag: 'prec_unit_keeper', eq: 'citizen' }, text: 'UNITS, MUNICIPAL — HELD: A LAPSED UNIT MAY PASS TO A CITIZEN KEEPER. (R30)' },
        { text: 'UNITS, MUNICIPAL — HELD: AN INSTRUMENT MAY BE IRREGULAR AND STAND, WHERE THE LAW IS SILENT ON THE HAND. (R30) Underlined, in red.' },
      ],
      again: 'UNITS, MUNICIPAL, and the line under it.',
      options: [{ text: '(Back to the index.)', next: 'register' }],
    },
  },
};

export const d_ca_chair: DialogueDef = {
  id: 'd_ca_chair', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Dark wood, a high back, arms worn smooth by hands ninety years dead, and dust on the seat thick enough to write in. Nobody has. A brass plate on the back rail: MAGISTRATE. Tucked under it, newer, a card in a holder: R49.',
      again: 'The empty chair, the dust on the seat, MAGISTRATE on the brass and R49 on the card.',
      effects: [{ learn: 'ca_chair_seen' }, { lead: 'l_cal_r49' }],
      options: [
        { id: 'chair.sit', text: '(Sit in it.)', once: true, next: 'sit' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    sit: { speaker: THREE, text: 'You have your hand on its arm when the lens turns. "That chair is not in session." Three does not raise its voice; it has no other one. "Entered." You take your hand away. There is a clean print in the dust where it was.', effects: [{ learn: 'ca_chair_touched' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_ca_copydesk: DialogueDef = {
  id: 'd_ca_copydesk', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'ca_squatter', eq: 'catalogued' }, text: 'The copyist\'s desk, cleared. A ring on the wood where the inkpot stood for eighteen years, and nothing else.' },
        { text: 'A copyist\'s desk under a lamp: an inkpot, three pens wiped and laid in a row, and a ledger as thick as a hand, open at a page of rulings in a print that never slopes. HELD, and the reasons, case after case.' },
      ],
      again: 'The desk, the lamp, and whatever is left on it.',
      passives: [{ attr: 'wits', dc: 7, if: { all: [{ knows: 'seen_court' }, { not: { flag: 'ca_squatter', eq: 'catalogued' } }] }, text: 'The ink is the same blue-black as the register sheets on Three\'s bench, and the hand is the same hand. The Court\'s register was copied here.', effects: [{ learn: 'ca_register_is_book' }, { lead: 'l_ca_register' }] }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const COURT_DIALOGUES: DialogueDef[] = [d_ca_court, d_ca_docket, d_ca_chair, d_ca_copydesk];
