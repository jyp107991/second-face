import type { ItemDef } from '../../engine/inventory/items';

/** Act 2 papers and keepsakes. */
export const STORY_A2: ItemDef[] = [
  { id: 'k_futures_paper', icon: 'order', name: 'Sealed Futures Sheet', desc: 'Guild paper, folded and wax-sealed with the half-moon. On the outside a lot number, a place and a date; inside, the Exchange says, what will happen there. People pay for these. People pay more for them unopened.', category: 'note', weight: 0, value: 40, read: 'd_nb_futures_read' },
  { id: 'k_strike_sheet', icon: 'order', name: 'Futures Sheet — the Porters', desc: 'A guild forecast, seal broken: NINEBRIDGE — PORTERS\' STOPPAGE — ENDS THIRD DAY, STRAPS ON, TERMS UNCHANGED. Dated the day before the strike began.', category: 'note', weight: 0, value: 0 },
  { id: 'k_exchange_line', icon: 'page', name: 'Copied Ledger Line', desc: 'A line copied from the Exchange ledgers in your own hand: PROTECTION — TOLLHOUSE 9 — TWO RIDERS, FOUR DAYS — "WESTBOUND TRAVELLER, CONFIRMED" — PAID FROM THE SARR ACCOUNT, BY ORDER OF THE FLOOR.', category: 'note', weight: 0, value: 0 },
  { id: 'k_sable_contract', icon: 'order', name: 'Debt Contract — Lot Four', desc: 'A guild debt contract, bearer-held. SABLE CALLOWAY, 19, SUM OUTSTANDING 58 TOLLS AND INTEREST, SERVICE UNTIL CLEARED. Whoever holds this paper holds her.', category: 'key', weight: 0, value: 0 },
  { id: 'k_berth_token', icon: 'key', name: 'Berth Token', desc: 'A brass tag on a wire: SPAN — BERTH A. Lazlo\'s, and now yours, for as long as you keep paying nothing.', category: 'key', weight: 0, value: 0 },
  { id: 'k_tobias_sheet', icon: 'order', name: 'Futures Sheet — Openfield', desc: 'Guild paper, seal broken long ago and the fold worn soft: OPENFIELD — HARVEST ABOVE PLAN — THE LONG NIGHT — BURNS. No date. The hand too even to be a hand. Somebody has read it a hundred times.', category: 'note', weight: 0, value: 0, read: 'd_of_sheet_read' },
  { id: 'k_mason_letter', icon: 'order', name: 'The Elder\'s Letter', desc: 'To Sister Calla at Shale, unsent: the blight, the guild\'s offer for the harvest, and a line crossed out so hard the pen went through the paper.', category: 'note', weight: 0, value: 0 },
  { id: 'k_sky_token', icon: 'tin', name: 'A Cairn Stone', desc: 'A fist of glass-crust from the burial ground, warm from your hand. The Choir gives one to whoever raises a cairn there. It is not a likeness of anyone.', category: 'key', weight: 0.3, value: 0 },
  { id: 'k_chaff', icon: 'tin', name: 'Dead Seed', desc: 'A pouch of last year\'s seed, boiled and dried: looks right, weighs right, grows nothing. Doria calls it chaff with manners.', category: 'key', weight: 0.2, value: 0 },
  { id: 'k_odile_note', icon: 'page', name: 'Odile\'s Note', desc: 'Three lines in a trader\'s hand: the notation on the stranger\'s map, with the cipher\'s spine written out plain. "Two a night, my dear. Any more and the eyes go."', category: 'note', weight: 0, value: 0 },
];
