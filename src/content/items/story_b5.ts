import type { ItemDef } from '../../engine/inventory/items';

/** Story items for B5a: the Rail Corridor. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B5. */
export const STORY_B5: ItemDef[] = [
  // the Line
  { id: 'k_rc_pass', icon: 'card', name: 'Line Pass', desc: 'A guild card with a punched corner and a stamp in green: BEARER RIDES — ALL SECTIONS — NO FARE. Somebody has written the bearer\'s description on the back instead of a name, the way the guild does: height, hair, a scar if there is one.', category: 'key', weight: 0, value: 0 },
  { id: 'k_rc_rulebook', icon: 'book', name: 'Rule Book, Pilot Working', desc: 'Pages cut from a pre-war rule book, older than the guild, kept in a tin in Four Ways\' signal box. Rule 183: when a token instrument fails, each section is worked by a pilotman; no train enters the section without him; the pilot is found at the section\'s end and paid by the operator for each passage.', category: 'note', weight: 0.1, value: 0, read: 'd_rc_rulebook' },
  // Kettle Cut
  { id: 'k_rc_tag', icon: 'ring', name: 'Brass Watch Tag', desc: 'A brass disc on a broken loop of wire, stamped WH 4. Found in the blind on the north bank at Kettle Cut, among cigarette ends.', category: 'key', weight: 0, value: 0 },
  { id: 'k_rc_casings', icon: 'casings', name: 'Spent Cases', desc: 'Five spent .308 cases from the ballast under where the coach\'s roof would have been, all from one rifle, and a single 9 mm case from the bank opposite. Five, then one.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_rc_register', icon: 'page', name: 'Register, Fair Copy', desc: 'Halina Wrona\'s fair copy of a page of Four Ways\' register, in her square hand: WEST HALT — YARD NINE. SECTION RELEASED. OCCUPATION — PERMANENT WAY. 01:40. C.B. And the same line, with other times, on four other nights.', category: 'key', weight: 0, value: 0 },
  { id: 'k_rc_wires', icon: 'order', name: 'Wire Copies', desc: 'Manifests copied off the wire in the stationmaster\'s hand: the through\'s cars, numbered, with what each carries. Against some of the sealed cars, a small pencil tick.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_rc_through', icon: 'order', name: 'Through-Running Sheet', desc: 'The guild\'s copy of its contract with the Concern, signed S. Kask for the guild: Concern freight to run through all halts without stopping, with first call on every path. And on the last page, in a smaller type: LENGTH MONEY PAYABLE PER STOP MADE.', category: 'key', weight: 0.1, value: 0 },
  // the stock car
  { id: 'k_rc_paper', icon: 'order', name: 'Intake Paper', desc: 'Twelve sheets of Concern paper, each with a name, a number and a price paid at the Ninebridge block, and the same line stamped across the foot of every one: INTAKE — WEIGHHOUSE — TWO-TWELVE.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_rc_discharges', icon: 'order', name: 'Twelve Discharges', desc: 'Twelve sheets stamped DISCHARGED across the intake line, each with the Concern\'s closed eye at the foot. They say the people named on them owe nobody anything.', category: 'key', weight: 0.1, value: 0 },
  // the dead engine
  { id: 'k_rc_offer', icon: 'order', name: 'Concern Offer', desc: 'A Concern contract on clean card: a new controller for the engine Dorcas, fitted at no charge, in consideration of an exclusive through-running agreement for twenty years. The old board has reached the end of its service, it says. Nobody has to decide anything today.', category: 'key', weight: 0, value: 0 },
  { id: 'k_rc_spare', icon: 'board', name: 'Spare Instrument Board', desc: 'A controller board out of a pre-war token instrument, wrapped in oilcloth, older than the Burn and older than the Concern\'s chip line. Halina Wrona\'s last spare.', category: 'key', weight: 0.3, value: 0 },
];
