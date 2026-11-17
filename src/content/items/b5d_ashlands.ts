import type { ItemDef } from '../../engine/inventory/items';

/** Items for B5d: the Ashlands and the Long Night. Story notes: story/B5d_NOTES_SECRET.md. */
export const B5D_ITEMS: ItemDef[] = [
  // salvage of the Ashlands (region-banded: rare, and worth the walk)
  { id: 'j_an_kiteboard', icon: 'board', name: 'Kite\'s Board', desc: 'The flight brain out of a pre-war kite, a slab of black resin the size of a hand with the closed eye etched beside an army number, its pins still bright under the glass dust. Pickers say a kite\'s board buys a winter. They are not wrong.', category: 'junk', weight: 0.4, value: 140 },
  { id: 'j_an_lens', icon: 'scrap', name: 'Hound\'s Lens', desc: 'The one eye of a border hound, a cup of ground glass in a steel collar, cracked across but still faintly warm. Meridian\'s camera menders pay for the glass; nobody pays for the crack.', category: 'junk', weight: 0.5, value: 55 },
  { id: 'k_an_board', icon: 'board', name: 'Shunter\'s Board', desc: 'The controller out of an army yard engine at Kelso: pre-war, pre-Scald, a crown over a gear stamped in its corner and nothing else in it at all. No closed eye. No channel. Ninety years in a shed, and when you breathe on its pins it lights one lamp, amber, and waits to be told it is an engine.', category: 'junk', weight: 0.7, value: 120 },
  // Kelso
  { id: 'k_an_card', icon: 'card', name: 'Waking Card', desc: 'A Concern card, white, edged in copper, with a strip of dark glass down one side and the closed eye in its corner. HALVERSON DEFENCE SERVICES — MAINTENANCE — MARCH. Somebody died holding it. Somebody else gave it to him.', category: 'key', weight: 0, value: 0 },
  { id: 'k_an_order', icon: 'order', name: 'Work Order', desc: 'A Concern work order on clean, heavy paper, folded in four: RESERVE AUDIT — KENNEL 7 — COMMAND UNIT TO BE RECOVERED INTACT AND RETURNED TO HALCYON. DORMANT UNITS NOT TO BE DISTURBED PENDING RECOVERY. LOSSES OF LOCAL LABOUR TO BE COSTED TO THE CONTRACT. Signed B. Sorlie, contractor, and countersigned with a number.', category: 'key', weight: 0, value: 0 },
  { id: 'k_an_core', icon: 'board', name: 'Command Core', desc: 'The heart of the thing in Kelso\'s rack: a sealed drum of black ceramic the size of a loaf, warm, heavy, its one lamp green. It hums against your hip when you walk, and the hum changes when you face east.', category: 'key', weight: 2.5, value: 0 },
  { id: 'k_an_notebook', icon: 'book', name: 'Picker\'s Notebook', desc: 'A dead picker\'s book, its pages stiff with glass dust: sketches of Pemberton\'s rows, and over them, in pencil, the kites\' turns, day after day, and the arcs they never fly. On the last page: THEY DON\'T LOOK DOWN AT THE HUT. THEY LOOK AT WHAT MOVES.', category: 'note', weight: 0.2, value: 0 },
  // the Long Night
  { id: 'k_ln_order', icon: 'order', name: 'Eviction Order, Copied', desc: 'The city\'s order as it was nailed to Openfield\'s well, copied out in a clerk\'s square hand: THE HOLDING KNOWN AS OPENFIELD IS RETURNED TO THE SCHEDULE. STORES TO PRECINCT SUPPLY. PERSONS AS THE RECORD HOLDS. Under it, the first name to be read: CALLA, SISTER, OF SHALE — SEDITION.', category: 'key', weight: 0, value: 0 },
];
