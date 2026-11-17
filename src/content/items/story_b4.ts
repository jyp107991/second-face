import type { ItemDef } from '../../engine/inventory/items';

/** Story items for B4: the Skirts under Halcyon (B4a). Story notes: story/STORY_PLAN_SECRET.md, Build notes — B4. */
export const STORY_B4: ItemDef[] = [
  // beat 16's opening
  { id: 'k_hc_invitation', icon: 'card', name: 'Concern Invitation', desc: 'Heavy white card with one line of print and a mark like a closed eye: THE BOARD OF THE CONCERN WOULD BE PLEASED TO RECEIVE THE DESIGNATE AT HALCYON. And on the back, by hand: The Line runs to the Skirts. The Contract Office at Footgate has your name. Nobody has to decide anything today.', category: 'key', weight: 0, value: 0 },
  // the Cave-In and the Shift
  { id: 'k_hs_log', icon: 'page', name: 'Pillar Log, Six East', desc: 'A sheet torn from the survey board at the bottom of Number Six: pillar numbers down the side, widths in a surveyor\'s neat hand across the top, and from fourteen to twenty-two the widths going down week by week, from four paces to one, with RETREAT — D. chalked over the last column.', category: 'key', weight: 0, value: 0 },
  { id: 'k_hs_order', icon: 'order', name: 'Retreat Order', desc: 'Concern paper, Number Six\'s stamp: PILLARS 14–22, EAST GALLERY — RETREAT MINING AUTHORISED TO QUARTER TONNAGE. STEWARD\'S OBJECTION NOTED; STEWARD\'S DEBT TO BE REVIEWED. And a signature with a long D.', category: 'key', weight: 0, value: 0 },
  { id: 'k_hs_tags', icon: 'ring', name: 'Eleven Lamp Tags', desc: 'Brass lamp tags on a loop of wire, stamped with eleven numbers, dug out of the rubble at the edge of the fall in Six East. Each one was on a man\'s belt.', category: 'key', weight: 0.1, value: 0 },
  { id: 'k_hs_powder', icon: 'powder', name: 'Six Cases of Powder', desc: 'Blasting powder out of Number Six\'s magazine, in six greasy cases with the Concern\'s mark, and a coil of fuse. Enough to bring down a cable house, or a gallery.', category: 'key', weight: 6, value: 0 },
  // Spare Parts
  { id: 'k_hs_boots', icon: 'coat', name: 'Dawit\'s Boots', desc: 'A miner\'s boots, resoled twice, cleaned by somebody else. Inside the left tongue a printed tag: 9-1182 — EFFECTS — RETURN TO KIN, and the Concern\'s mark like a closed eye.', category: 'key', weight: 1, value: 0 },
  { id: 'k_hs_weighbook', icon: 'book', name: 'Weighhouse Book', desc: 'A clinic ledger in a clean hand: NAME — DEBT — YIELD — SERVICE. The yield column is four letters, K L C H, each with a grade. The service column says CLINIC 9 all the way down.', category: 'note', weight: 0.4, value: 0, read: 'd_hs_weighbook' },
  // Scrip
  { id: 'k_hs_ratebook', icon: 'book', name: 'Changer\'s Ledger', desc: 'Cosmin Vulpe\'s book: every change at the booth for two years, scrip in, Tolls out, at the week\'s rate. And down the margin, ruled off in red, a column headed PAR that never moves: one to one.', category: 'note', weight: 0.3, value: 0 },
  { id: 'k_hs_savings', icon: 'tin', name: 'A Tin of Scrip', desc: 'A tea tin with a hundred Concern scrip in it, counted into tens with string: two years of somebody\'s savings, worth a hundred at the Window and sixteen at the booth.', category: 'key', weight: 0.2, value: 0 },
];
