import type { QuestDef } from '../../engine/quest/quest';

/** Act 2, part 1: the road east — Ninebridge. */

const NB_TRUTH = { any: [{ knows: 'nb_paid_truth' }, { item: 'k_exchange_line' }] };

export const q_a2_ninebridge: QuestDef = {
  id: 'q_a2_ninebridge', title: 'Paper Futures', act: 'a2', critical: true, start: 'road', xp: 400,
  routes: [
    { id: 'buy', kind: 'barter', label: 'Buy the line from the Grand Factor (she sells everything, not at that price)' },
    { id: 'audience', kind: 'talk', label: 'Talk your way to the Grand Factor\'s desk and make her say it', requires: { skill: 'speech', gte: 50 } },
    { id: 'ledgers', kind: 'stealth', label: 'Read the Exchange ledgers after the floor closes, or under the clerk\'s nose', requires: { skill: 'stealth', gte: 40 } },
    { id: 'board', kind: 'tech', label: 'Pull the protection account off the board', requires: { skill: 'science', gte: 45 } },
    { id: 'odile', kind: 'knowledge', label: 'An old trader at the Span knows what the paper means, and what the packet was' },
  ],
  stages: {
    road: {
      journal: 'The stranger\'s road runs east off the map\'s edge, past the Tollhouse, over the glass, to a bridge with a town on it — Ninebridge, where the guild keeps its Exchange and, the caravan woman said, sells things that have not happened yet. If the outriders who shot him were paid, they were paid from there.',
      objectives: [
        { id: 'reach', text: 'Reach Ninebridge', done: { flag: 'visited_ninebridge' } },
        { id: 'floor', text: 'Get onto the Exchange floor', done: { flag: 'nb_floor_ok' } },
        { id: 'who', text: 'Find who paid for the outriders', done: NB_TRUTH },
        { id: 'packet', text: 'Deliver the sealed packet to the Exchange', done: { any: [{ flag: 'nb_packet_delivered' }, { flag: 'packet_opened' }] }, optional: true, hidden: true },
      ],
      onEnter: [{ learn: 'loc_ninebridge' }],
      next: [{ if: NB_TRUTH, stage: 'paid' }],
    },
    paid: {
      journal: 'Paid from the floor. The Exchange at Ninebridge bought the stranger\'s death the way it buys everything: two riders, four days, a line in a ledger, by order of the floor. The guild sells paper that says what will happen, and someone was selling them the paper. The road runs on east, to the farms and the city, and the map\'s next pins.',
      end: 'done',
      onEnter: [
        { set: 'nb_truth_known' },
        { decision: { id: 'nb_paid_truth', text: 'You learned at Ninebridge that the Exchange paid the outriders who shot the stranger.' } },
        { news: { tag: 'asked_at_exchange', text: 'someone from the salt cut was asking after the protection account on the Exchange floor', valence: -5, size: 4, at: 'ninebridge' } },
      ],
    },
  },
};

export const q_nb_auction: QuestDef = {
  id: 'q_nb_auction', title: 'Lot Four', act: 'a2', start: 'block', xp: 150,
  routes: [
    { id: 'buy', kind: 'barter', label: 'Buy her contract at the block (the price rises with the crowd)' },
    { id: 'free', kind: 'stealth', label: 'Take the contract from the auctioneer\'s box, or cut the cage at night', requires: { any: [{ skill: 'security', gte: 40 }, { skill: 'stealth', gte: 45 }] } },
    { id: 'fen', kind: 'talk', label: 'The auctioneer hates his work. Give him a reason to lose a lot', requires: { skill: 'speech', gte: 40 } },
    { id: 'wren', kind: 'knowledge', label: 'Wren knows her' },
  ],
  stages: {
    block: {
      journal: 'The auction block on Ninebridge\'s east bank sells debt: whoever holds a contract holds the debtor until it clears. Today\'s lot four is a young woman called Sable, nineteen, fifty-eight Tolls and interest. Fen will open at sixty.',
      objectives: [
        { id: 'settle', text: 'Settle lot four, one way or another', done: { flag: 'nb_sable_settled' } },
      ],
      next: [
        { if: { flag: 'nb_sable_outcome', eq: 'freed' }, stage: 'freed' },
        { if: { flag: 'nb_sable_outcome', eq: 'bought_free' }, stage: 'freed' },
        { if: { flag: 'nb_sable_outcome', eq: 'kept' }, stage: 'kept' },
        { if: { flag: 'nb_sable_outcome', eq: 'resold' }, stage: 'resold' },
        { if: { flag: 'nb_sable_outcome', eq: 'sold_on' }, stage: 'sold_on' },
      ],
    },
    freed: { journal: 'Sable Calloway walked off the block with her paper in her own hand, which is the only place a debt contract is worth nothing. She said she would go west, to Shale, where a sister might be, and that she would not thank you, and then did.', end: 'done', onEnter: [{ news: { tag: 'lot_four_freed', text: 'a debtor walked off the Ninebridge block free, and the auctioneer called it a sale', valence: 10, size: 4, at: 'ninebridge' } }, { rep: { faction: 'tollmen', respect: -4 } }] },
    kept: { journal: 'You hold Sable Calloway\'s contract. Fifty-eight Tolls and interest, service until cleared. She keeps the berth at the Span swept and does not look at you, and the paper is in your pack, and you could tear it up any morning.', end: 'done', onEnter: [{ decision: { id: 'nb_sable_kept', text: 'You bought Sable Calloway\'s debt at Ninebridge and kept it.' } }] },
    resold: { journal: 'You bought Sable Calloway\'s contract at sixty and sold it to the floor at ninety. The clerk did not ask where she was going. Thirty Tolls, and a sister somewhere who will hear.', end: 'done', onEnter: [{ decision: { id: 'nb_sable_resold', text: 'You bought and resold a debtor\'s contract at Ninebridge for the margin.' } }, { news: { tag: 'lot_four_resold', text: 'someone bought lot four at the Ninebridge block and sold her on the same day', valence: -15, size: 5, at: 'ninebridge' } }] },
    sold_on: { journal: 'Lot four went to a guild buyer at ninety, the way lots do. You watched. The crowd moved to lot five.', end: 'done', onEnter: [{ decision: { id: 'nb_sable_watched', text: 'You watched Sable Calloway sold at the Ninebridge block and did nothing.' } }] },
  },
};

export const q_nb_strike: QuestDef = {
  id: 'q_nb_strike', title: 'Straps Off', act: 'a2', start: 'camp', xp: 180,
  routes: [
    { id: 'break', kind: 'talk', label: 'Break the stoppage for the guild (they pay eighty)', requires: { skill: 'speech', gte: 40 } },
    { id: 'carry', kind: 'survival', label: 'Pick up a strap and carry with them until the guild comes to the table', requires: { attr: 'grit', gte: 6 } },
    { id: 'sheet', kind: 'knowledge', label: 'The guild holds a forecast that says the porters lose. Put it in their hands' },
    { id: 'pay', kind: 'barter', label: 'Pay the difference yourself and shame the guild into matching it' },
  ],
  stages: {
    camp: {
      journal: 'The porters who carry Ninebridge\'s goods up the ramps have sat down with their straps off: a share of the bridge toll, or nothing moves. The toll-warden says they will be back on the third day. He says it like a man reading.',
      objectives: [
        { id: 'end', text: 'End the stoppage, one way or another', done: { flag: 'nb_strike_over' } },
      ],
      next: [
        { if: { flag: 'nb_strike_outcome', eq: 'broken' }, stage: 'broken' },
        { if: { flag: 'nb_strike_outcome', eq: 'won' }, stage: 'won' },
        { if: { flag: 'nb_strike_outcome', eq: 'paid' }, stage: 'won' },
      ],
    },
    broken: { journal: 'The porters put their straps back on for the guild\'s terms, on the day the paper said. Eighty Tolls, the warden\'s nod, and forty people who know your face.', end: 'done', onEnter: [{ set: 'nb_toll_rate', value: 'high' }, { news: { tag: 'strike_broken', text: 'the Ninebridge porters went back under the guild\'s terms; a stranger talked them down', valence: -12, size: 6, at: 'ninebridge' } }] },
    won: { journal: 'The guild came to the table. A tenth of the crossing goes to the porters now — the first time, Voss says, that the bridge has paid the backs that carry it. The warden has a new rate painted, and a new face when he sees you.', end: 'done', onEnter: [{ set: 'nb_toll_rate', value: 'fair' }, { news: { tag: 'strike_won', text: 'the Ninebridge porters won a share of the bridge toll', valence: 15, size: 7, at: 'ninebridge' } }, { rep: { faction: 'tollmen', respect: -6, fear: 4 } }] },
  },
};
