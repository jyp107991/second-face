import type { ItemDef } from '../../engine/inventory/items';

/** Items for B5c: the Teeth mines and the Northern Wet. Story notes: story/B5c_NOTES_SECRET.md. */
export const B5C_ITEMS: ItemDef[] = [
  // trade goods of the Teeth
  { id: 'j_tin', icon: 'scrap', name: 'Tin Bar', desc: 'A finger-thick bar of grey tin out of Number Four\'s clay furnace, stamped with a 4 while it was still soft. Tinkers, solderers and the Line\'s fitters all want it.', category: 'junk', weight: 0.5, value: 6 },
  { id: 'j_pelt', icon: 'cloth', name: 'Winter Pelt', desc: 'A snow hare\'s winter coat, white to the roots, scraped and stretched on a hoop. Worth more than the hare by a long way, to anyone with a cold neck.', category: 'junk', weight: 0.3, value: 9 },
  { id: 'j_tm_controller', icon: 'board', name: 'Digger\'s Controller', desc: 'The brain of a pre-war mining machine, potted in black resin with the closed eye etched beside the maker\'s number, its pins bright. Ninety years asleep in the water under Number Four. A controller like this is worth more than a rifle to anyone who knows what it is.', category: 'junk', weight: 0.6, value: 160 },
  // Number Four
  { id: 'k_tm_requests', icon: 'card', name: 'Requests Card', desc: 'A Concern card, clean and stiff, kept in the winchwoman\'s locker under a tin of bitters. Names down one side, one a season back fifteen winters, and after each name a letter or two: K, L, C, H. The last line is this season\'s, and it is a woman\'s name. At the foot, in the Concern\'s small type: FOUR — ARRANGEMENT — RENEWED.', category: 'key', weight: 0, value: 0 },
  // Ashby Dam
  { id: 'k_nw_keepers_log', icon: 'book', name: 'Keepers\' Log', desc: 'The Wexford keepers\' own book, kept beside the city\'s for sixty years. On its first page, in a big square hand: NEVER ABOVE THE SIXTH MARK. SHE WILL NOT HOLD IT. — M.W. And under it, every season, a level and a date and the same small tick.', category: 'key', weight: 0.4, value: 0 },
  { id: 'k_nw_contract', icon: 'order', name: 'Ashby Lease, Copied', desc: 'A copy of the lease framed on the gatehouse wall: the waters impounded at Ashby leased to the charter city of Meridian for a hundred and fifty years by the Ashby water trust, and, in the eleventh clause, THE LESSOR WARRANTS THE WORKS FOR THE TERM.', category: 'key', weight: 0, value: 0 },
  // Sawtown
  { id: 'k_nw_scribe', icon: 'wrench', name: 'Timber Scribe', desc: 'A bent marking knife with a hooked blade, the kind fallers use to cut a mark in a log\'s butt. This one has a crow\'s foot burned into its handle, and the hook of its blade is bright from use.', category: 'key', weight: 0.2, value: 0 },
  // Low Landing
  { id: 'k_nw_waybill', icon: 'order', name: 'Waybill', desc: 'The guild\'s waybill for the Patience\'s sealed load: TWELVE CASES — MACHINE PARTS — CONCERN — CONSIGNED TO THE GUILD\'S FLOOR, THE DOCKS, FOR THE NEW SEASON. Signed L. Pryce for the guild, and, smaller, a Concern account number nobody at Low Landing has seen before.', category: 'key', weight: 0, value: 0 },
  { id: 'k_nw_token', icon: 'ring', name: 'Bargeman\'s Token', desc: 'A copper ring cut from a pre-war pipe, stamped PATIENCE. On the river it means the bearer rides on the Patience\'s account, on any barge whose master knows Magda Kowal, which is all of them.', category: 'key', weight: 0, value: 0 },
];
