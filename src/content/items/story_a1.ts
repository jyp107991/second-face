import type { ItemDef } from '../../engine/inventory/items';

/** Act 1 papers and keepsakes. */
export const STORY_A1: ItemDef[] = [
  { id: 'k_pass_forged', icon: 'order', name: 'Tollmen Pass (forged)', desc: 'A guild transit pass on the right paper with the wrong hand. Good at a glance; bad under a lamp.', category: 'key', weight: 0, value: 0 },
  { id: 'k_pass_stamped', icon: 'order', name: 'Tollmen Pass', desc: 'A guild transit pass, stamped at Tollhouse 9. "Bearer and goods. As per."', category: 'key', weight: 0, value: 0 },
  { id: 'k_packet', icon: 'order', name: 'Sealed Guild Packet', desc: 'Oilcloth, wax, the guild\'s half-moon pressed into it. For the Exchange at Ninebridge, by hand, unopened. It weighs almost nothing and you keep checking it.', category: 'key', weight: 0.2, value: 0 },
  { id: 'k_ledger_page', icon: 'page', name: 'Toll Ledger Page', desc: 'Torn from the Tollhouse 9 ledger. A line of outriders\' pay: two riders, four days, "one masked traveller, confirmed — as per Factor Pike, post nine-west".', category: 'note', weight: 0, value: 0 },
];
