import type { ItemDef } from '../../engine/inventory/items';

/** Carrick, Meridian's docks (B5b, the last piece). Story notes: story/B5b_NOTES_SECRET.md (Carrick). */
export const DK_ITEMS: ItemDef[] = [
  // food from the quay
  { id: 'c_dk_mullet', icon: 'jerky', name: 'Basin Mullet', desc: 'Two small grey mullet off the Basin wall at Carrick, gutted and threaded on a reed through the gills. They taste of the harbour, which is to say of diesel and of the sea, and they are the only fresh thing on the quay.', category: 'consumable', weight: 0.3, value: 3,
    consumable: { effects: [{ kind: 'food', amount: 1 }, { kind: 'heal', amount: 2 }] } },
  { id: 'c_dk_soup', icon: 'tin', name: 'Espe\'s Soup', desc: 'A tin cup of Espe\'s soup from the cookshop in the Boxes: fish heads, rice when there is rice, a green thing from the Hulls\' roof gardens, a great deal of pepper. Hot. That is the recipe.', category: 'consumable', weight: 0.4, value: 4,
    consumable: { effects: [{ kind: 'food', amount: 1 }, { kind: 'heal', amount: 4 }] } },
  { id: 'c_dk_inhaler', icon: 'vial', name: 'Blue Inhaler', desc: 'A blue-capped inhaler in clean white plastic with the closed eye moulded into the cap: the Concern\'s medicine for lungs that have breathed too much of the world. A docker could not buy one with a month\'s tallies. It opens the chest like a window.', category: 'consumable', weight: 0.05, value: 45,
    consumable: { effects: [{ kind: 'heal', amount: 12 }] } },
  // Crane Six
  { id: 'k_dk_tape', icon: 'page', name: 'Load Tape', desc: 'A strip of waxed paper torn off the load recorder in Crane Six\'s cab, printed in faded purple: 02:06 LIFT 31.2 T — OVERLOAD — CUTOUT. 02:07 KEY 6/N — OVERRIDE. 02:10 SPREADER — LOCK FAULT. And then nothing at all.', category: 'key', weight: 0.05, value: 0 },
  { id: 'k_dk_tin', icon: 'tin', name: 'Dmytro\'s Tin', desc: 'A tobacco tin from Oksana Lysenko\'s shelf, the paint worn through to the metal by a thumb. In it: a crane key cut by hand from a blank, stamped 6/N; two blue-capped Concern inhalers; and a white card with the closed eye on it, printed BOND — NIGHT — PASS, and pencilled under it, D.L.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_dk_slip', icon: 'page', name: 'Loading Slip', desc: 'A Concern loading slip from the yard at Two-Twelve, carbon-copied, filed in the bond officer\'s drawer: BOX 7-2390 — CAST COPPER, INGOT — 31.4 T — SEALED. Clipped behind it, the guild\'s freight bill for the same box on the same through: MACHINE PARTS — 14.0 T. The same seal number on both.', category: 'key', weight: 0.05, value: 0 },
  { id: 'k_dk_order', icon: 'page', name: 'Gang Order', desc: 'A gang order off the night gang-master\'s clipboard, signed by the Harbour Master\'s clerk: NIGHT — GANG NINE — FIVE HANDS — BY ORDER — THE THROUGH TO TURN IN FOUR HOURS (CONTRACT, DEMURRAGE). The complement for Crane Six is eight. Somebody has written the eight in, in pencil, and crossed it out.', category: 'key', weight: 0.05, value: 0 },
  // Mirela's Paper
  { id: 'k_dk_paper', icon: 'page', name: 'Surety Paper', desc: 'A Concern paper sewn into the lining of a girl\'s coat, folded small and soft with handling: CONTRACT 7-1182 — B. STAN, TERRACE HAND — SURETY: ONE MINOR (M. STAN, 15) — RETURNABLE ON DEFAULT OR FLIGHT. On the back, in pencil, in a woman\'s hand, one word: GO.', category: 'key', weight: 0.05, value: 0 },
  // Stakes on the Hulls
  { id: 'k_dk_crewbook', icon: 'book', name: 'Crew Book', desc: 'The crew book of the Benguela Star, a pre-war ship\'s articles book that has been kept on, a page a week, for ninety years after the river stopped under her: MASTER — K. OFORI. CREW — and thirty-one names, signed or marked, every Sunday since before anyone alive was born. Abena Ofori keeps it now, and the books of the other hulls beside it.', category: 'key', weight: 0.4, value: 0 },
];
