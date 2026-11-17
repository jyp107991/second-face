import type { Cond, Effect } from '../../engine/world/logic';
import type { CaseSpec, onRail as OnRailFn } from './md_court';
import { ASH, NINE, NINE_REGISTERED, ODILE, ORDER_READ, RECALL_OPEN, TAMSIN, WREN } from '../world/a3_conds';

/**
 * Act 3's two cases at the Court of Accounts (B6b), as `courtCase()` specs: `md_court.ts` builds them on its own bench
 * (`courtCase(reserveCase(onRail))`), so this file imports only types from it and there is no import cycle.
 *   · **reserve**: Reserve 9 against the fourth order. Grounds: consent (the caretaker's three refusals on the city's own
 *     record), attendance (the order cannot execute while the designate declines to attend), privilege (the designate stays
 *     its own first act: a courtesy, not a principle). A failed ground leaves the order upheld.
 *   · **recall**: Precinct against Unit 9, disposal as scheduled. Grounds: a unit may be its own keeper (no check when the
 *     register already says so), or the schedule reads the register (a title registered with a keeper). Kept, or returned.
 * Rulings set `ca_<case>`; the Court's own counters (`ca_cases_heard`, `ca_precedents`) move as courtCase does.
 * Story notes: story/B6_NOTES_SECRET.md §2.3 (18b, 18c).
 */

type OnRail = typeof OnRailFn;
const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const IN = (id: string): Cond => ({ inParty: id });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });

// ---------------------------------------------------------------- RESERVE 9 (THE MOUTH) v. the fourth order

export const reserveCase = (onRail: OnRail): CaseSpec => {
  const C = 'reserve';
  return {
    id: C,
    call: 'Reserve 9 against the fourth order. I\'ll speak for the reserve.',
    available: ALL(ORDER_READ, NOT(F('a3_c9'))),
    claim: '"Reserve 9, the Mouth, objecting." The usher rings twice, which nobody in the hall has heard him do, and Three reads from a sheet he hands up in both hands. "The fourth order: relocation of Reserve 9 to Precinct supply, by force if non-compliant, execution on the designate\'s attendance, the first act of the chair. Objection lies to this Court under the order\'s own foot." The lens comes down to you. "The respondent is a reserve. A reserve has no voice at this rail. Clause 12: a citizen may speak for a respondent who has none." A click. "The Court notes that the citizen at the rail is the designate the order names."',
    claimInterject: [
      { companion: TAMSIN, text: 'Tamsin has come up to the rail beside you and put both hands on it, the way you hold a ladder. "Sixty people," she says, low. "Say it like there\'s sixty people."' },
      { companion: NINE, text: '"Unit 3 has never heard a reserve," Nine says, behind you. "There has never been anybody to bring one." Three\'s lens moves a degree. "There is now," Nine says.' },
    ],
    evidence: [
      {
        id: 'refusals', text: '(Put the copy of the Cistern\'s replies on the rail.)', if: { item: 'k_ar_refusals' },
        read: '"Three orders on city paper. Under each, in a caretaker\'s print: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY." Three reads all three at the same even speed, and the stamp under each. "NON-COMPLIANT, three times, in the city\'s red." It writes. "Entered. The city\'s own record holds three refusals by the reserve\'s caretaker."',
      },
      {
        id: 'census', text: 'The reserve\'s census. Sixty on the city\'s paper. The caretaker feeds sixty-one.', if: ANY(F('tam_why'), { knows: 'ar_census_seen' }, IN(TAMSIN)),
        read: [
          { if: IN(TAMSIN), text: '"Sixty on your paper," Tamsin says, at the rail, too loud for the hall. "She feeds sixty-one. Every quarter. Do the sum." Three does. "Entered: the caretaker\'s ration returns exceed the assessed census by one." It does not ask who the one is. Tamsin does not breathe out until the lens has moved on.' },
          { text: 'You give it the figures from the drawer in the Spire: sixty assessed, sixty-one at the ration counter, and the note in a different ink. "Entered: the caretaker\'s ration returns exceed the assessed census by one, not escalated." It does not ask who the one is. The Court reads what is on the rail.' },
        ],
      },
      {
        id: 'slip', text: '(Put the slip from the Cistern\'s hatch tray on the rail.)', if: { item: 'k_a3_mother_letter' },
        read: '"HATCH CLOSED. THANK YOU FOR YOUR CONTINUITY. PLEASE COME HOME." Three reads the curl of printer paper twice, which it does not do. "The caretaker\'s fourth reply to the fourth order." A click. "It is the first that is addressed to a person. Entered."',
        interject: [{ companion: TAMSIN, text: 'Tamsin looks at the slip on the brass and then very hard at the ceiling. "Please," she says. "She\'s never once said please. Not on a form."' }],
      },
      {
        id: 'nine', text: 'Unit 9 assessed that reserve for eighteen years. Let it say what it did.', if: IN(NINE),
        read: 'Nine steps up to the rail from the public side, where units do not stand. "Unit 9, assessor, for the register. The census discrepancy of Reserve 9 was not escalated, at my discretion, for eighteen years." Three: "Discretion is not in Unit 9\'s pattern." "It is in Unit 9\'s record," Nine says. "I did not escalate it." A long click. "Entered."',
      },
      {
        id: 'living', text: 'Read your own register back. The heading for the unrecorded.', if: F('prec_unrecorded', 'yields'),
        read: '"PERSONS, UNRECORDED — HELD: THE RECORD YIELDS TO A LIVING PERSON STANDING AT THE RAIL. R30." Three reads its own register in the voice it reads everything in. "Entered. The Court is bound by its register."',
      },
      {
        id: 'refuse', text: 'And the heading for benefits refused.', if: F('prec_refuse_benefit'),
        read: '"BENEFITS, SCHEDULED — HELD: A BENEFICIARY MAY REFUSE A SCHEDULED BENEFIT, ON THE RECORD, ONCE. R30." The margin, in its own hand, says *the designate*; it reads that too. "Entered. The Court notes that the first act of a chair is a benefit of the chair."',
      },
    ],
    grounds: [
      {
        id: 'consent', text: 'Three refusals on your own record. A reserve kept by its caretaker against three orders is kept by consent. You can\'t relocate a consent.',
        check: { skill: 'speech', dc: 50, mods: [
          onRail(C, 'refusals', -10, 'the caretaker\'s three refusals are on the rail'), onRail(C, 'census', -5, 'the census shows the caretaker feeding one more than the city counts'),
          onRail(C, 'nine', -5, 'the unit that assessed the reserve has said what it did'), onRail(C, 'living', -10, 'the register holds that the record yields to the living'),
          onRail(C, 'slip', -5, 'the caretaker\'s fourth reply asks its people home'),
        ] },
        win: 'stayed', lose: 'upheld',
      },
      { id: 'clerk', text: 'Condition precedent. The order names the one who executes it, and the one it names declines to attend. Read your own clause back.', if: { origin: 'archive_clerk' }, win: 'attendance' },
      {
        id: 'attendance', text: 'The order executes on the designate\'s attendance. I decline to attend. An order that can only be carried out by me can\'t be carried out without me.', if: NOT({ origin: 'archive_clerk' }),
        check: { skill: 'science', dc: 45, mods: [onRail(C, 'refuse', -10, 'the register holds that a scheduled benefit may be refused')] },
        win: 'attendance', lose: 'upheld',
      },
      { id: 'privilege', text: 'I\'m the designate it names. Stay it. For me.', win: 'privilege' },
    ],
    rulings: {
      stayed: {
        text: '"Held: a reserve kept by its caretaker against three orders on the city\'s own record is kept by consent." Three writes for a long time. "The fourth order is stayed. It is entered in the register under a heading the register did not have: RESERVES." The usher, who has rung his bell for forty years, sits down on his stool as if his knees had decided it for him.',
        effects: [
          { set: 'prec_reserve', value: 'consent' }, { xp: 150 },
          { decision: { id: 'ca_reserve_stayed', text: 'The Court of Accounts stayed the city\'s fourth order for the Cistern: a reserve kept by its caretaker against three orders is kept by consent.' } },
          { news: { tag: 'ca_reserve_stayed', text: 'the Court of Accounts stayed an order to move a whole reserve, on its caretaker\'s three refusals; nobody can remember a reserve being heard', valence: 8, size: 8, at: 'meridian' } },
        ],
        interject: [
          { companion: TAMSIN, text: 'Tamsin does not say anything on the way out. On the steps she stops, and puts her forehead against your shoulder for exactly as long as it takes to breathe in, and then she is three steps ahead and talking about the sky.', effects: [A(TAMSIN, 10)] },
          { companion: NINE, text: '"Kept by consent," Nine says. "A heading the register did not have." Its lens clicks twice. "I will copy the page number into the other ledger. It is the first entry in it that is not an error."', effects: [A(NINE, 5)] },
          { companion: ASH, text: '"They said no three times and you made it count," Ash says. "That\'s not nothing."', effects: [A(ASH, 5)] },
        ],
        precedent: true,
      },
      attendance: {
        text: '"Held: an order that executes on the designate\'s attendance cannot execute while the designate declines to attend." Three writes, and then does a thing the usher has never seen it do: it turns its ledger round on the bench and reads its own line back, slowly, as if to someone above it. "The order stands. Its execution does not. Entered." A click. "The Court notes that this register is read upstairs."',
        effects: [
          { set: 'prec_reserve', value: 'attendance' }, { xp: 120 },
          { decision: { id: 'ca_reserve_attendance', text: 'The Court of Accounts held that the fourth order cannot be carried out while I decline to attend it.' } },
          { news: { tag: 'ca_reserve_attendance', text: 'the Court of Accounts held that an order of the Ledger\'s cannot be carried out while the person it names declines to attend', valence: 5, size: 7, at: 'meridian' } },
        ],
        interject: [
          { companion: NINE, text: '"A condition precedent, read back to the one who wrote it," Nine says. "It will have heard. It reads that register every morning." A pause the length of a clause. "So, now, does it know you can say no."', effects: [A(NINE, 5)] },
          { companion: ODILE, text: '"You found the clause they wrote for their own convenience and stood on it," Odile says. "My dear. That is the only kind of contract worth reading."', effects: [A(ODILE, 5)] },
          { companion: TAMSIN, text: '"So it\'s still waiting for you," Tamsin says. "It just can\'t make you." She thinks about it. "That\'s nearly the same as no."', effects: [A(TAMSIN, 5)] },
        ],
        precedent: true,
      },
      privilege: {
        text: '"The respondent\'s speaker is the designate the order names." Three does not need the file; it has the file. "The designate stays its own first act. The order is stayed, for the designate." The lens does not say *held*. It is not a principle. It is a courtesy, and everybody on the public benches heard whom it was for.',
        effects: [
          { xp: 40 }, { rep: { faction: 'wardens', respect: 3 } },
          { decision: { id: 'ca_reserve_privilege', text: 'The Court of Accounts stayed the fourth order for the Cistern because I am the designate it names, and only for that.' } },
          { news: { tag: 'ca_reserve_privilege', text: 'the Court of Accounts stayed an order for the Magistrate-designate, as a courtesy to the designate', valence: -3, size: 6, at: 'meridian' } },
        ],
        interject: [
          { companion: TAMSIN, text: '"You used your title," Tamsin says on the steps, flat. "Again." She does not look at you. "It worked. I hate that it worked."', effects: [A(TAMSIN, -5)] },
          { companion: ASH, text: '"For the designate," Ash says. "Not for the sixty. For you." He does not lower his voice for the benches.', effects: [A(ASH, -5)] },
        ],
      },
      upheld: {
        text: '"Held: the fourth order stands, with this Court\'s endorsement." The lens is already turning away. "Relocation of Reserve 9 to Precinct supply, on the designate\'s attendance. Entered." The usher rings once for the next case. There is not one. The hall is very quiet.',
        effects: [
          { xp: 30 },
          { decision: { id: 'ca_reserve_upheld', text: 'I spoke for the Cistern against the fourth order at the Court of Accounts and lost; the Court endorsed the order.' } },
          { news: { tag: 'ca_reserve_upheld', text: 'the Court of Accounts endorsed the Ledger\'s order to move a reserve to Precinct supply', valence: -4, size: 6, at: 'meridian' } },
        ],
        interject: [
          { companion: TAMSIN, text: 'Tamsin takes her hands off the rail one finger at a time. "Endorsed," she says. "Now it\'s got a stamp on it." She walks out ahead of you and does not wait.', effects: [A(TAMSIN, -3)] },
          { companion: WREN, text: '"Supply," Wren says, on the steps. "They read it out like a weather report and then they stamped it." She spits, neatly, off the side.' },
        ],
      },
    },
  };
};

// ---------------------------------------------------------------- PRECINCT v. Unit 9: disposal, as scheduled

export const recallCase = (onRail: OnRail): CaseSpec => {
  const C = 'recall';
  /** The condition an `onRail` modifier carries: that piece of evidence is on the rail. */
  const on = (e: string): Cond => onRail(C, e, 0, '').if;
  return {
    id: C,
    call: 'Unit 9\'s recall. Disposal, as scheduled. I\'ll speak against it.',
    available: RECALL_OPEN,
    claim: [
      { if: IN(NINE), text: '"Precinct against Unit 9, assessor, civil." Three reads it from the sheet the recall wardens brought down, and its lens does not go to the unit standing a pace behind you. It goes to you. "Disposal, as scheduled. R31, brought forward. The title is examined: the schedule reads the register." A click. "The unit is at the rail. A unit is not a respondent. Clause 12: a citizen may speak for what has no speaker."' },
      { text: '"Precinct against Unit 9, assessor, civil." Three reads it from the sheet the recall wardens brought down. "Disposal, as scheduled. R31, brought forward. The title is examined: the schedule reads the register. The unit is not at the rail." A click. "Clause 12: a citizen may speak for what has no speaker."' },
    ],
    claimInterject: [{ companion: NINE, text: '"Unit 3," Nine says. "Unit 9," says Three. Nothing else. They were issued the same week, and one of them is reading the other\'s disposal.' }],
    evidence: [
      {
        id: 'deed', text: '(Put the deed on the rail.)', if: F('nine_deed_made'),
        read: [
          { if: F('nine_deed_void'), text: '"This instrument was voided at this rail." Three does not look at it twice. "Entered as void. The title is lapsed."' },
          { if: F('ca_deed', 'returned'), text: '"Registered to the city, at this rail." It reads the slip it stamped itself. "Entered."' },
          { if: NINE_REGISTERED, text: '"An instrument of title, registered at this rail. The keeper\'s line is entered." It reads the line it wrote. "Entered again."' },
          { if: F('nine_deed', 'city'), text: '"An instrument of title. The keeper\'s line names the city." It reads the unit\'s own hand on the keeper\'s line. "Entered."' },
          { if: F('nine_deed_how', 'forged'), text: '"An instrument of title. It bears the plate of the asset it conveys, and was never brought here." A click. "Entered as a private paper."' },
          { text: '"An instrument of title, unregistered. A private paper, lawfully made." Three reads the keeper\'s line once. "Entered."' },
        ],
      },
      {
        id: 'log', text: 'Unit 9 keeps a count of every forecast that failed. Put the count on the rail.', if: ANY(F('nine_log_given'), IN(NINE)),
        read: [
          { if: IN(NINE), text: '"Four thousand one hundred and six," Nine says, before you can. "And the Long Night\'s, since. I keep my own errors, Unit 3, and the city\'s, which are more." Three: "Unlawful under clause 40." "Yes," Nine says. "Kept, all the same." A long click. "Entered. Its lawfulness is not before the Court."' },
          { text: 'You put Nine\'s fair copy on the rail: four thousand lines, each a forecast and the size of its miss. "Unit 9\'s hand. Unlawful under clause 40." A long click. "Entered. A unit that keeps its own errors. Its lawfulness is not before the Court."' },
        ],
      },
      {
        id: 'register', text: 'Read the register\'s heading for units back to the Court.', if: F('prec_unit_keeper'),
        read: [
          { if: F('prec_unit_keeper', 'self'), text: '"UNITS, MUNICIPAL — HELD: THE KEEPER OF A LAPSED UNIT MAY BE THE UNIT. R30." Three reads its own dash where a clause number should be. "Entered. The Court is bound by its register."' },
          { if: F('prec_unit_keeper', 'citizen'), text: '"UNITS, MUNICIPAL — HELD: A LAPSED UNIT MAY PASS TO A CITIZEN KEEPER. R30." "Entered. The register has a heading for the keepers of units."' },
          { text: '"UNITS, MUNICIPAL — HELD: AN INSTRUMENT MAY BE IRREGULAR AND STAND, WHERE THE LAW IS SILENT ON THE HAND. R30." It reads the red underline as well. "Entered."' },
        ],
      },
      {
        id: 'census', text: 'The census for Reserve 9. Read the note at the bottom, in Unit 9\'s ink.', if: { knows: 'ar_census_seen' },
        read: '"DISCREPANCY: NOT ESCALATED — ASSESSOR\'S DISCRETION (UNIT 9)." Three reads the initials as if they were a signature on a confession. "A discretion, exercised once, for eighteen years, in a matter of a ration." It writes. "Entered."',
        interject: [{ companion: TAMSIN, text: 'Tamsin looks at Nine for a long moment and does not say anything, which is how you know she has worked out what the one was.' }],
      },
    ],
    grounds: [
      { id: 'held', text: 'Your own register holds it already: a unit may be its own keeper. Read it back and rule on it.', if: F('prec_unit_keeper', 'self'), win: 'kept', effects: [{ set: 'a3_nine_keeper', value: 'self' }] },
      {
        id: 'keeper', text: 'A unit may be its own keeper. This one has kept the city\'s errors for a hundred and twenty years. It can keep itself.', if: NOT(F('prec_unit_keeper', 'self')),
        check: { skill: 'speech', dc: 50, mods: [
          { if: ALL(on('deed'), NOT(F('nine_deed', 'city')), NOT(F('nine_deed_void'))), dc: -10, why: 'a deed with a keeper\'s line that is not the city\'s is on the rail' },
          onRail(C, 'log', -15, 'its count of the forecasts that failed is on the rail: a unit that keeps its own errors'),
          onRail(C, 'register', -10, 'the register already has a heading for the keepers of units'),
          onRail(C, 'census', -10, 'it used its discretion once, for a person, and the city\'s own sheet shows it'),
          { if: IN(NINE), dc: -5, why: 'the unit is standing at the rail' },
          { if: F('nine_deed_void'), dc: 10, why: 'its own deed was voided at this rail' },
        ] },
        win: 'kept', lose: 'returned', effects: [{ set: 'a3_nine_keeper', value: 'self' }],
      },
      {
        id: 'register', text: 'The schedule reads the register. Your register has a keeper for Unit 9. You scheduled the disposal of a lapsed title that doesn\'t exist any more.', if: NINE_REGISTERED,
        check: { skill: 'science', dc: 45, mods: [onRail(C, 'deed', -10, 'the registered deed is on the rail')] },
        win: 'kept', lose: 'returned',
      },
    ],
    rulings: {
      kept: {
        text: [
          { if: { seen: 'ca.recall.g.register' }, text: '"Held: the schedule reads the register." Three reads the keeper\'s line on its own register aloud, and then the disposal order, and lays one on the other. "A disposal scheduled against a lapsed title does not lie against a title registered since. Struck." It does not look at its sibling. It writes for a long time.' },
          { text: '"Held: a unit that keeps a record may keep itself." Three stops at the last word, which it does not do in the middle of a ruling; the usher looks up. "The disposal is struck. Unit 9 is entered as its own keeper." It writes the word itself and looks at it, which it does not do. "Entered."' },
        ],
        effects: [
          { set: 'prec_recall', value: 'keeper' }, { set: 'a3_recall', value: 'court' }, { xp: 150 },
          { decision: { id: 'ca_recall_kept', text: 'The Court of Accounts struck the city\'s disposal of Assessor Nine.' } },
          { news: { tag: 'ca_recall_kept', text: 'the Court of Accounts struck the disposal of one of the city\'s own units; the recall wardens went back up the Spire without it', valence: 5, size: 7, at: 'meridian' } },
        ],
        interject: [
          { companion: NINE, text: 'Nine does not move for some time. Then, to the bench, very formally: "Thank you, Unit 3." Three does not answer, which is what Three does. On the steps Nine says, to nobody: "There will be another year of drainage." And then: "There will be all of them."', effects: [A(NINE, 10)] },
          { companion: TAMSIN, text: '"You got the fridge\'s cousin off," Tamsin says on the steps, and bumps Nine with her shoulder. Nine logs it.', effects: [A(TAMSIN, 5)] },
        ],
        precedent: true,
      },
      returned: {
        text: [
          { if: IN(NINE), text: '"Held: the title is the city\'s, and the city\'s schedule stands. Disposal, as scheduled." Three\'s lens is on the ledger. The recall wardens are already at the hall\'s door. Nine turns to you before they reach it. "I would like it entered that you spoke," it says. "It will not change the order. I would like it entered." It walks between them at its own pace. At the door it does not look back, because the record does not need it to.' },
          { text: '"Held: the title is the city\'s, and the city\'s schedule stands. Disposal, as scheduled. The unit will be collected from its keeper\'s keeping." Three stamps the sheet and hands it down. The usher holds it the way he held the other one, as if it were warm.' },
        ],
        effects: [
          { set: 'a3_recall', value: 'taken' }, { set: 'nine_disposed' }, { leave: NINE }, { xp: 20 },
          { decision: { id: 'ca_recall_returned', text: 'I spoke against Assessor Nine\'s disposal at the Court of Accounts and lost; the city took its unit back.' } },
          { news: { tag: 'ca_recall_returned', text: 'the Court of Accounts returned one of the city\'s units for disposal, as scheduled', valence: -3, size: 5, at: 'meridian' } },
        ],
        interject: [{ companion: TAMSIN, text: 'Tamsin watches the door the wardens went through for a long time. "It said please once," she says. "Not out loud. It never said it out loud."', effects: [A(TAMSIN, -5)] }],
      },
    },
  };
};
