import type { ItemDef } from '../../engine/inventory/items';

/** Act 1 papers and keepsakes. */
export const STORY_A1: ItemDef[] = [
  { id: 'k_seed_case', icon: 'tin', name: 'Cistern Seed Case', desc: 'A sealed steel case the size of a loaf, cold to the touch, with a Cistern inventory label: VIABLE — TOMATO, BEAN, SQUASH, MILLET — DO NOT OPEN BELOW 4°C. Ninety years of somebody\'s patience.', category: 'key', weight: 1.5, value: 300 },
  { id: 'k_mags_books', icon: 'order', name: 'The Dry Well\'s Books', desc: 'Two ledgers tied with a bootlace. Water in, water out, rooms, Dust, debts. Mags\'s hand throughout, and another hand in the margins of the second.', category: 'note', weight: 0.8, value: 0, read: 'd_mags_books' },
  { id: 'k_bram_letter', icon: 'order', name: 'Bram\'s Letter', desc: 'Folded four times and sealed with machine grease. On the outside, in a mechanic\'s careful capitals: EDDA VALE, SHALE. He asked you not to read it, and you have not.', category: 'note', weight: 0, value: 0 },
  { id: 'k_hesper_reply', icon: 'order', name: 'Hesper\'s Reply', desc: 'A single sheet in a tight, plain hand. For Bram, at the Cistern: the truth, kindly put.', category: 'note', weight: 0, value: 0 },
  { id: 'k_hesper_reply_forged', icon: 'order', name: 'A Reply for Bram', desc: 'A single sheet in a hand that is not Edda Vale\'s, saying things Edda Vale would have said. You wrote it.', category: 'note', weight: 0, value: 0 },
  { id: 'k_pass_forged', icon: 'order', name: 'Tollmen Pass (forged)', desc: 'A guild transit pass on the right paper with the wrong hand. Good at a glance; bad under a lamp.', category: 'key', weight: 0, value: 0 },
  { id: 'k_pass_stamped', icon: 'order', name: 'Tollmen Pass', desc: 'A guild transit pass, stamped at Tollhouse 9. "Bearer and goods. As per."', category: 'key', weight: 0, value: 0 },
  { id: 'k_packet', icon: 'order', name: 'Sealed Guild Packet', desc: 'Oilcloth, wax, the guild\'s half-moon pressed into it. For the Exchange at Ninebridge, by hand, unopened. It weighs almost nothing and you keep checking it.', category: 'key', weight: 0.2, value: 0, read: 'd_packet_read' },
  { id: 'k_station_key', icon: 'key', name: 'Brass Station Key', desc: 'Worn to gold where a thumb rubbed it for sixty years. It opens a door at the east end of a pump hall, painted with a 4.', category: 'key', weight: 0, value: 0 },
  { id: 'k_pumpman_diary', icon: 'book', name: 'Pump Man\'s Diary', desc: 'Forty years of gauge readings in a hand that gets smaller, and on the first page, underlined twice, a credential: MAINT AUTH — MARR — DW4 — "ELEVEN".', category: 'note', weight: 0.3, value: 0 },
  { id: 'k_hound_controller', icon: 'cell', name: 'Controller', desc: 'A grey slab the size of a hand with one lens and no buttons, warm when nothing is. The convoy was carrying it; the thing on the pan sat down beside it.', category: 'key', weight: 0.4, value: 0 },
  { id: 'k_convoy_manifest', icon: 'page', name: 'Convoy Manifest', desc: 'Guild paper. Eight crates of parts, two of water, one item listed as HANDLER (1) — CONCERN CUSTOMS SEAL — DO NOT POWER.', category: 'note', weight: 0, value: 0 },
  { id: 'k_dog_plate', icon: 'plates', name: 'Rust Dog Plate (small)', desc: 'A thumb-sized scrap of plate with a dog\'s head scratched on it, on a child\'s cord. Dropped in the orchard wall.', category: 'key', weight: 0, value: 0 },
  { id: 'k_ledger_page', icon: 'page', name: 'Toll Ledger Page', desc: 'Torn from the Tollhouse 9 ledger. A line of outriders\' pay: two riders, four days, "one traveller, westbound, confirmed — as per Factor Pike, post nine-west".', category: 'note', weight: 0, value: 0 },
];
