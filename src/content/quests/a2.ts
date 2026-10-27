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
        { set: 'nb_truth_known' }, { learn: 'loc_openfield' }, { quest: 'q_a2_openfield', start: true },
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

// ---------------------------------------------------------------- Openfield

const OF_FOUND = { any: [{ knows: 'of_poisoner_known' }, { flag: 'of_blight_outcome' }] };

export const q_a2_openfield: QuestDef = {
  id: 'q_a2_openfield', title: 'Every Third Row', act: 'a2', critical: true, start: 'rows', xp: 400,
  routes: [
    { id: 'medicine', kind: 'medicine', label: 'The sick in the long hall: fever, or something they drank', requires: { skill: 'medicine', gte: 40 } },
    { id: 'science', kind: 'tech', label: 'Test the two troughs at the well', requires: { skill: 'science', gte: 40 } },
    { id: 'survival', kind: 'survival', label: 'Follow the night tracks from the well', requires: { skill: 'survival', gte: 40 } },
    { id: 'talk', kind: 'talk', label: 'Old Benedek saw a light at the well. Get him to say whose', requires: { skill: 'speech', gte: 30 } },
    { id: 'stakeout', kind: 'stealth', label: 'Wait by the well after midnight', requires: { skill: 'stealth', gte: 35 } },
  ],
  stages: {
    rows: {
      journal: 'Openfield: the Choir\'s farms in the glass, and every third row dying. The Elder calls it blight and does not believe himself. The road east runs through here, and so does the map\'s; and a man at Openfield, Calla said, knows more about the word the stranger died saying.',
      objectives: [
        { id: 'reach', text: 'Reach Openfield', done: { flag: 'visited_openfield' } },
        { id: 'elder', text: 'Hear the Elder out', done: { flag: 'of_blight_told' } },
        { id: 'cause', text: 'Find what is killing the rows', done: OF_FOUND },
      ],
      onEnter: [{ learn: 'loc_openfield' }],
      next: [{ if: { dead: 'openfield/npc_of_04' }, stage: 'dead' }, { if: OF_FOUND, stage: 'found' }],
    },
    found: {
      journal: 'Not blight. The north trough is dosed every night by the Elder\'s own son, who has read a guild forecast until it fell apart: Openfield burns if its harvest rises above plan, so he keeps it below. What you do with that is the whole of Openfield.',
      objectives: [
        { id: 'settle', text: 'Settle it with Tobias', done: { flag: 'of_blight_outcome' } },
      ],
      next: [
        { if: { flag: 'of_blight_outcome', eq: 'exposed' }, stage: 'exposed' },
        { if: { flag: 'of_blight_outcome', eq: 'mercy' }, stage: 'mercy' },
        { if: { flag: 'of_blight_outcome', eq: 'unwritten' }, stage: 'unwritten' },
        { if: { flag: 'of_blight_outcome', eq: 'dead' }, stage: 'dead' },
        { if: { dead: 'openfield/npc_of_04' }, stage: 'dead' },
      ],
    },
    exposed: {
      journal: 'You told the Elder. He heard it the way a man hears his own name read from a list, and then he walked his son to the track and did not come back for an hour. The well is clean. The rows will come back. Mason will not. The road runs on east, to a dead shelter and the city.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_gone' }, { set: 'a2_openfield_done' }, { decision: { id: 'of_exposed', text: 'You told Elder Mason that his son was poisoning Openfield\'s well.' } }, { news: { tag: 'of_son_cast_out', text: 'the Elder of Openfield cast out his own son over the well', valence: -10, size: 7, at: 'openfield' } }, { rep: { faction: 'choir', respect: 8 } }],
    },
    mercy: {
      journal: 'Tobias stopped. You hold his secret and his sheet, and the Elder holds a theory about blight that he can go on not believing. The well is clean by the week\'s end. The rows will come back. The road runs on east, to a dead shelter and the city.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_secret' }, { set: 'a2_openfield_done' }, { decision: { id: 'of_mercy', text: 'You let Tobias Mason stop poisoning the well without telling his father.' } }, { rep: { faction: 'choir', respect: 4 } }, { trust: { npc: 'npc_of_04', by: 30 } }],
    },
    unwritten: {
      journal: 'You gave Tobias to Petra, and the Unwritten took him down the hatch to argue about whether a man who breaks a forecast by starving his own people is one of them or the opposite. The Elder thinks his son went east. The well is clean. The road runs on east, to a dead shelter and the city.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_gone' }, { set: 'of_tobias_unwritten' }, { set: 'a2_openfield_done' }, { decision: { id: 'of_unwritten', text: 'You handed Tobias Mason to the Unwritten.' } }, { rep: { faction: 'choir', respect: 2 } }],
    },
    dead: {
      journal: 'Tobias Mason died at his own well with a knife in his hand. The Choir buried him under the open sky and did not sing. The well is clean. Nothing else here is. The road runs on east.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_dead' }, { set: 'a2_openfield_done' }, { decision: { id: 'of_dead', text: 'Tobias Mason died at Openfield\'s well.' } }, { news: { tag: 'of_son_dead', text: 'the Elder\'s son died at the well in Openfield; a stranger\'s hand was in it', valence: -25, size: 8, at: 'openfield' } }, { rep: { faction: 'choir', respect: -20, fear: 10 } }],
    },
  },
};

export const q_of_seed: QuestDef = {
  id: 'q_of_seed', title: 'A Crate a Night', act: 'a2', start: 'count', xp: 160,
  routes: [
    { id: 'watch', kind: 'stealth', label: 'Wait in the seed store after dark', requires: { skill: 'stealth', gte: 35 } },
    { id: 'tally', kind: 'knowledge', label: 'The tally: counted, not grabbed. Someone with a key', requires: { attr: 'wits', gte: 7 } },
    { id: 'corso', kind: 'talk', label: 'The guild\'s hand on the lane buys what the Choir won\'t sell', requires: { skill: 'barter', gte: 35 } },
    { id: 'chaff', kind: 'tech', label: 'Let the thief keep stealing — dead seed', requires: { any: [{ skill: 'science', gte: 35 }, { skill: 'survival', gte: 40 }] } },
  ],
  stages: {
    count: {
      journal: 'A crate of viable seed walks out of Openfield\'s store every night: counted at dusk, short at dawn, no broken lock. Keeper Doria has stopped sleeping.',
      objectives: [{ id: 'who', text: 'Find where the seed goes', done: { any: [{ knows: 'of_seed_hollin' }, { lead: 'l_seed_corso' }] } }, { id: 'end', text: 'End it', done: { flag: 'of_seed_outcome' } }],
      next: [
        { if: { flag: 'of_seed_outcome', eq: 'exposed' }, stage: 'exposed' },
        { if: { flag: 'of_seed_outcome', eq: 'chaff' }, stage: 'chaff' },
        { if: { flag: 'of_seed_outcome', eq: 'cut' }, stage: 'cut' },
        { if: { flag: 'of_seed_outcome', eq: 'corso_gone' }, stage: 'gone' },
      ],
    },
    exposed: { journal: 'Hollin Brannock, who came from the Sump with nothing and was given the yard, carried a crate a night to the guild\'s hand for twelve Tolls each. Doria wanted him gone. The Elder gave him the yard back and the night watch, which is a Choir punishment and worse than the track.', end: 'done', onEnter: [{ set: 'of_corso_gone' }, { rep: { faction: 'choir', respect: 6 } }, { rep: { faction: 'tollmen', respect: -4 } }] },
    chaff: { journal: 'The guild\'s hand left Openfield with six crates of seed that will grow nothing anywhere, bought at a future\'s price, and a receipt. Doria laughed for the first time in a month. Somewhere east of the Teeth a client will plant it and wait.', end: 'done', onEnter: [{ set: 'of_corso_gone' }, { set: 'guild_chaff' }, { decision: { id: 'of_chaff', text: 'You let the Tollmen buy dead seed from Openfield at a living price.' } }, { rep: { faction: 'choir', respect: 8 } }, { news: { tag: 'guild_chaff', text: 'the guild bought Choir seed by night at Openfield and got chaff with manners', valence: 10, size: 5, at: 'openfield' } }] },
    cut: { journal: 'A crate a night still walks, and a tenth of each walks to you. Doria counts, and the Elder calls it blight of a different kind, and nobody says your name.', end: 'done', onEnter: [{ set: 'of_seed_cut' }, { decision: { id: 'of_seed_cut', text: 'You took a cut of the seed stolen from Openfield for the guild.' } }, { rep: { faction: 'tollmen', respect: 5 } }] },
    gone: { journal: 'Corso Vail took his coin and his future-paper back down the track to Ninebridge. The store is whole at dawn. Hollin keeps the yard and his tent and the look of a man who has been let off once.', end: 'done', onEnter: [{ rep: { faction: 'choir', respect: 5 } }, { rep: { faction: 'tollmen', respect: -3 } }] },
  },
};

export const q_of_rite: QuestDef = {
  id: 'q_of_rite', title: 'The Sky Rite', act: 'a2', start: 'asked', xp: 120,
  routes: [{ id: 'bury', kind: 'talk', label: 'Raise a cairn for someone you lost, under the open sky' }],
  stages: {
    asked: {
      journal: 'The Choir\'s door is a burial: raise a cairn in the ground under the windpump for someone you have lost, with Petra Mason saying the words, and you are a sister or brother of the Open Sky — which opens the long halls, and other doors.',
      objectives: [{ id: 'cairn', text: 'Raise a cairn at the burial ground', done: { flag: 'sky_rite' } }],
      next: [{ if: { flag: 'sky_rite' }, stage: 'done' }],
    },
    done: { journal: 'A cairn under the windpump with no name on it, and a stone from it in your pack. Sister, or brother, of the Open Sky. The Choir\'s halls are open to you from Shale to the city.', end: 'done', onEnter: [{ decision: { id: 'sky_rite', text: 'You raised a cairn under the open sky at Openfield and took the Choir\'s second vow.' } }] },
  },
};
