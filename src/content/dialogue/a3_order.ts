import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import { ASH, ILYA, KES, LN, NINE, ODILE, ON_SIDE, ORDER_READ, SIDES, TAMSIN, WREN, type Side } from '../world/a3_conds';

/**
 * Act 3's fourth order (B6a: the read tree only; B6b adds the courier, the recall at the Precinct gate and its routes).
 * `d_a3_order_read` opens from the pack ("Read" on `k_a3_order`): the seal, the order, the Ledger's reason for bringing
 * the schedule forward (by the Long Night's alliance, said once here and once in the vault), the steps' date corrected,
 * and the Act Three card. Reading it starts the road home; with Nine on the player's side, the notice folded in with it
 * starts the recall. Story notes: story/B6_NOTES_SECRET.md §2.1 and §2.3 (18, 18b).
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
const order: { if?: Cond; text: string }[] = SIDES.map((s) => ({
  if: LN(s),
  text: `Three sheets, the city's even hand on all of them. The first is the order itself: ${ORDER} Under it, the reason, set down the way the Precinct sets down weather: ${WHY[s]} THE SCHEDULE IS BROUGHT FORWARD. And at the foot of the last sheet, one line corrected in the same hand: PUBLIC STEPS REOPEN R49, the 49 ruled through and 30 written over it.`,
}));
order.push({ text: `Three sheets, the city's even hand on all of them. The first is the order itself: ${ORDER} THE SCHEDULE IS BROUGHT FORWARD. And at the foot of the last sheet, one line corrected in the same hand: PUBLIC STEPS REOPEN R49, the 49 ruled through and 30 written over it.` });

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
      text: `The city's fourth order, the seal broken. ${ORDER} PUBLIC STEPS REOPEN R30.`,
      again: 'The fourth order. EXECUTION ON THE DESIGNATE\'S ATTENDANCE.',
      options: [nineSheet('a3o.nine2'), fold('a3o.fold3')],
    },
  },
};

export const A3_ORDER_DIALOGUES: DialogueDef[] = [d_a3_order_read];
