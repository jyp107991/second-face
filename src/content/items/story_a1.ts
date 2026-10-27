import type { ItemDef } from '../../engine/inventory/items';

/** Act 1 papers and keepsakes. */
export const STORY_A1: ItemDef[] = [
  { id: 'k_pass_forged', icon: 'order', name: 'Tollmen Pass (forged)', desc: 'A guild transit pass on the right paper with the wrong hand. Good at a glance; bad under a lamp.', category: 'key', weight: 0, value: 0 },
  { id: 'k_pass_stamped', icon: 'order', name: 'Tollmen Pass', desc: 'A guild transit pass, stamped at Tollhouse 9. "Bearer and goods. As per."', category: 'key', weight: 0, value: 0 },
  { id: 'k_packet', icon: 'order', name: 'Sealed Guild Packet', desc: 'Oilcloth, wax, the guild\'s half-moon pressed into it. For the Exchange at Ninebridge, by hand, unopened. It weighs almost nothing and you keep checking it.', category: 'key', weight: 0.2, value: 0 },
  { id: 'k_station_key', icon: 'key', name: 'Brass Station Key', desc: 'Worn to gold where a thumb rubbed it for sixty years. It opens a door at the east end of a pump hall, painted with a 4.', category: 'key', weight: 0, value: 0 },
  { id: 'k_pumpman_diary', icon: 'book', name: 'Pump Man\'s Diary', desc: 'Forty years of gauge readings in a hand that gets smaller, and on the first page, underlined twice, a credential: MAINT AUTH — MARR — DW4 — "ELEVEN".', category: 'note', weight: 0.3, value: 0 },
  { id: 'k_ledger_page', icon: 'page', name: 'Toll Ledger Page', desc: 'Torn from the Tollhouse 9 ledger. A line of outriders\' pay: two riders, four days, "one masked traveller, confirmed — as per Factor Pike, post nine-west".', category: 'note', weight: 0, value: 0 },
];
