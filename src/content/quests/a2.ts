import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

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
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_gone' }, { set: 'a2_openfield_done' }, { learn: 'loc_sump' }, { quest: 'q_a2_cistern4', start: true }, { decision: { id: 'of_exposed', text: 'You told Elder Mason that his son was poisoning Openfield\'s well.' } }, { news: { tag: 'of_son_cast_out', text: 'the Elder of Openfield cast out his own son over the well', valence: -10, size: 7, at: 'openfield' } }, { rep: { faction: 'choir', respect: 8 } }],
    },
    mercy: {
      journal: 'Tobias stopped. You hold his secret and his sheet, and the Elder holds a theory about blight that he can go on not believing. The well is clean by the week\'s end. The rows will come back. The road runs on east, to a dead shelter and the city.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_secret' }, { set: 'a2_openfield_done' }, { learn: 'loc_sump' }, { quest: 'q_a2_cistern4', start: true }, { decision: { id: 'of_mercy', text: 'You let Tobias Mason stop poisoning the well without telling his father.' } }, { rep: { faction: 'choir', respect: 4 } }, { trust: { npc: 'npc_of_04', by: 30 } }],
    },
    unwritten: {
      journal: 'You gave Tobias to Petra, and the Unwritten took him down the hatch to argue about whether a man who breaks a forecast by starving his own people is one of them or the opposite. The Elder thinks his son went east. The well is clean. The road runs on east, to a dead shelter and the city.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_gone' }, { set: 'of_tobias_unwritten' }, { set: 'a2_openfield_done' }, { learn: 'loc_sump' }, { quest: 'q_a2_cistern4', start: true }, { decision: { id: 'of_unwritten', text: 'You handed Tobias Mason to the Unwritten.' } }, { rep: { faction: 'choir', respect: 2 } }],
    },
    dead: {
      journal: 'Tobias Mason died at his own well with a knife in his hand. The Choir buried him under the open sky and did not sing. The well is clean. Nothing else here is. The road runs on east.',
      end: 'done',
      onEnter: [{ set: 'of_well_clean' }, { set: 'of_tobias_dead' }, { set: 'a2_openfield_done' }, { learn: 'loc_sump' }, { quest: 'q_a2_cistern4', start: true }, { decision: { id: 'of_dead', text: 'Tobias Mason died at Openfield\'s well.' } }, { news: { tag: 'of_son_dead', text: 'the Elder\'s son died at the well in Openfield; a stranger\'s hand was in it', valence: -25, size: 8, at: 'openfield' } }, { rep: { faction: 'choir', respect: -20, fear: 10 } }],
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

// ---------------------------------------------------------------- the Sump and Cistern 4

const C4_PROOF = { any: [{ item: 'k_c4_order' }, { knows: 'c4_four_spoke' }, { knows: 'c4_diary_read' }] };

export const q_a2_cistern4: QuestDef = {
  id: 'q_a2_cistern4', title: 'The Fourth Door', act: 'a2', critical: true, start: 'sump', xp: 400,
  routes: [
    { id: 'four', kind: 'tech', label: 'Crank the caretaker awake and ask it what it was told', requires: { any: [{ skill: 'science', gte: 35 }, { skill: 'mechanics', gte: 35 }] } },
    { id: 'records', kind: 'knowledge', label: 'The Archive: the order itself, with the city\'s seal' },
    { id: 'diary', kind: 'medicine', label: 'The last doctor\'s diary, and the clinic table that says how they went', requires: { skill: 'medicine', gte: 30 } },
    { id: 'sneak', kind: 'stealth', label: 'Past the tunnel guard after dark, or by the way a child knows', requires: { skill: 'stealth', gte: 40 } },
    { id: 'fight', kind: 'fight', label: 'Through the guard' },
  ],
  stages: {
    sump: {
      journal: 'The Marrs walked out of a cistern with a number on it when its pumps stopped and its door would not open: Cistern 4, under the glass south-east of Ninebridge, where two scavenger clans are being paid to dig toward a door. What the city told Cistern 4, it told Cistern 9. The proof is down there.',
      objectives: [
        { id: 'reach', text: 'Reach the Sump', done: { flag: 'visited_sump' } },
        { id: 'down', text: 'Get down the tunnel', done: { flag: 'sp_tunnel_open' } },
        { id: 'proof', text: 'Find what Cistern 4 was told', done: C4_PROOF },
      ],
      onEnter: [{ learn: 'loc_sump' }],
      next: [{ if: C4_PROOF, stage: 'proof' }],
    },
    proof: {
      journal: 'Cistern 4 was ordered to send its people to the city on a date, and could not, and had its water cut for not complying, and died in the dark with its door shut and its records filed for return. The same order sits sealed in MOTHER\'s log three times over, refused. The cisterns were never anyone\'s but the city\'s. The city is east, and the map\'s road runs into it.',
      end: 'done',
      onEnter: [
        { set: 'a2_cistern4_done' }, { lead: 'l_c4_order' }, { lead: 'l_c4_same_order' }, { learn: 'loc_meridian' }, { quest: 'q_a2_precinct', start: true },
        { decision: { id: 'c4_proof', text: 'You found in Cistern 4 what the city ordered of the cisterns.' } },
        { news: { tag: 'c4_opened', text: 'someone went down the Sump\'s tunnel to the dead cistern and came back up with paper', valence: 0, size: 5, at: 'sump' } },
      ],
    },
  },
};

export const q_sp_feud: QuestDef = {
  id: 'q_sp_feud', title: 'Two Clans, One Purse', act: 'a2', start: 'rims', xp: 160,
  routes: [
    { id: 'purse', kind: 'barter', label: 'The runner\'s ledger: both rims paid from one purse', requires: { skill: 'barter', gte: 35 } },
    { id: 'unite', kind: 'talk', label: 'Put the ledger in front of both chiefs', requires: { skill: 'speech', gte: 40 } },
    { id: 'skim', kind: 'stealth', label: 'Take a cut of the purse and let them dig', requires: { skill: 'stealth', gte: 35 } },
    { id: 'side', kind: 'fight', label: 'Take a side and clear the other rim' },
  ],
  stages: {
    rims: {
      journal: 'Two clans over one tunnel, paid on the fourth day to dig toward the same door and to hate each other in between. The guild\'s runner sleeps on the south rim with the purse.',
      objectives: [{ id: 'purse', text: 'Find out who pays the Sump', done: { lead: 'l_sump_one_purse' } }, { id: 'end', text: 'End the feud, or use it', done: { flag: 'sp_feud_outcome' } }],
      next: [
        { if: { flag: 'sp_feud_outcome', eq: 'united' }, stage: 'united' },
        { if: { flag: 'sp_feud_outcome', eq: 'grel' }, stage: 'grel' },
        { if: { flag: 'sp_feud_outcome', eq: 'tanner' }, stage: 'tanner' },
        { if: { flag: 'sp_feud_outcome', eq: 'skim' }, stage: 'skim' },
      ],
    },
    united: { journal: 'Grel and Hesk Tanner read the same ledger at the same fire and did not speak for a while, and then went together to the south rim. The runner left in the night with his purse and without his horse. The Sump digs for itself now, both rims, and the tunnel is open to anyone it does not mind.', end: 'done', onEnter: [{ set: 'sp_runner_gone' }, { set: 'sp_united' }, { rep: { faction: 'tollmen', respect: -8 } }, { news: { tag: 'sump_united', text: 'the two clans at the Sump threw out the guild\'s runner and dig for themselves', valence: 12, size: 6, at: 'sump' } }] },
    grel: { journal: 'The east rim is empty. Grel\'s people have both cabins and the tunnel and the purse, and the guild pays one column now instead of two, which Factor Pike will call a saving.', end: 'done', onEnter: [{ set: 'sp_grel_won' }, { decision: { id: 'sp_grel', text: 'You cleared the Tanners off the Sump\'s east rim for Grel.' } }, { news: { tag: 'sump_grel', text: 'Grel\'s clan took the whole Sump; a stranger\'s gun was in it', valence: -10, size: 6, at: 'sump' } }] },
    tanner: { journal: 'The west rim is empty. Hesk Tanner has the cabins, the tunnel, the purse and the door, which is what Hesk Tanner wanted; the guild pays one column now.', end: 'done', onEnter: [{ set: 'sp_tanner_won' }, { decision: { id: 'sp_tanner', text: 'You cleared Grel\'s clan off the Sump\'s west rim for Hesk Tanner.' } }, { news: { tag: 'sump_tanner', text: 'the Tanners took the whole Sump; a stranger\'s gun was in it', valence: -10, size: 6, at: 'sump' } }] },
    skim: { journal: 'A tenth of the purse comes to you on the fourth day, and both rims keep digging, and hating, and neither knows why the runner looks at you when he counts.', end: 'done', onEnter: [{ decision: { id: 'sp_skim', text: 'You took a cut of the guild\'s purse at the Sump and let the clans keep feuding.' } }] },
  },
};

export const q_c4_diary: QuestDef = {
  id: 'q_c4_diary', title: 'To Whoever Comes', act: 'a2', start: 'carry', xp: 120,
  routes: [{ id: 'deliver', kind: 'knowledge', label: 'Carry the last doctor\'s letter to the city it was written to' }],
  stages: {
    carry: {
      journal: 'The last doctor of Cistern 4 wrote the end of it in a clinic ledger, and addressed the last page to whoever came from Meridian. Nobody came. You have it. The city is east.',
      objectives: [{ id: 'deliver', text: 'Put the diary in front of someone in Meridian who should read it', done: { flag: 'c4_diary_delivered' } }],
      next: [{ if: { flag: 'c4_diary_delivered' }, stage: 'delivered' }],
    },
    delivered: { journal: 'Read, in the city it was written to. What that changes is the city\'s to decide.', end: 'done' },
  },
};

// ---------------------------------------------------------------- Meridian: the gate and the Precinct

const MD_IN = { flag: 'md_status' };

export const q_a2_precinct: QuestDef = {
  id: 'q_a2_precinct', title: 'The Face at the Gate', act: 'a2', critical: true, start: 'wall', xp: 450,
  routes: [
    { id: 'hearing', kind: 'talk', label: 'Stand the citizenship hearing and talk your way to papers', requires: { skill: 'speech', gte: 40 } },
    { id: 'paper', kind: 'barter', label: 'The hearing takes evidence: a guild ticket, a reserve\'s records, a dead doctor\'s letter' },
    { id: 'record', kind: 'tech', label: 'The scanner\'s file can be edited by someone who knows how', requires: { skill: 'science', gte: 50 } },
    { id: 'drain', kind: 'stealth', label: 'The storm drain under the wall, south of the gate', requires: { skill: 'stealth', gte: 40 } },
    { id: 'push', kind: 'fight', label: 'Push through with the crowd when it pushes', requires: { attr: 'brawn', gte: 6 } },
    { id: 'flag', kind: 'knowledge', label: 'The file says ADMIT ON SIGHT. Let it' },
  ],
  stages: {
    wall: {
      journal: 'Meridian: the Wall, the gate, and the Ledger behind it that keeps a face for everyone it has ever seen. The map\'s road runs through the gate to the towers; so does the city\'s interest in a cistern that would not comply. There is a hearing for people without papers, and a line for the hearing, and a lens before the line.',
      objectives: [
        { id: 'reach', text: 'Reach Meridian', done: { flag: 'visited_md_precinct' } },
        { id: 'in', text: 'Get inside the Wall', done: { flag: 'md_inside' } },
        { id: 'status', text: 'Settle what you are to the Precinct', done: MD_IN },
      ],
      onEnter: [{ learn: 'loc_meridian' }],
      next: [{ if: { flag: 'md_detained' }, stage: 'cells' }, { if: MD_IN, stage: 'inside' }],
    },
    cells: {
      journal: 'A cell in the warden station, tile floor, a cot, a fence door. The Precinct has a procedure for you and is following it. Someone will come; the file will say who.',
      objectives: [{ id: 'out', text: 'Get out of the cells', done: MD_IN }],
      next: [{ if: MD_IN, stage: 'inside' }],
    },
    inside: {
      journal: 'Inside the Wall, with a status the Precinct can read off a card — or a storm drain and no card at all. The city knew your face before you gave a name; the file calls you something the clerk had never seen. The records office will know what. So will the assessor who keeps it.',
      end: 'done',
      onEnter: [{ set: 'a2_precinct_done' }, { decision: { id: 'md_entered', text: 'You got inside Meridian\'s Wall.' } }, { news: { tag: 'stranger_at_gate', text: 'someone from the salt cut came through the Precinct gate and the lens knew their face', valence: 0, size: 5, at: 'meridian' } }],
    },
  },
};

export const q_md_exam: QuestDef = {
  id: 'q_md_exam', title: 'The Citizenship Exam', act: 'a2', start: 'sit', xp: 120,
  routes: [{ id: 'sit', kind: 'knowledge', label: 'Five questions on the charter, the drains and the calendar; three right makes a citizen' }],
  stages: {
    sit: {
      journal: 'The records office sets an exam for provisional residents: five questions on the charter, the drains and the Restoration Calendar. Three right and the card is yours. The assessor says the questions are the same every year; it has filed a complaint about that.',
      objectives: [{ id: 'pass', text: 'Pass the exam', done: { flag: 'md_exam_passed' } }],
      next: [{ if: { flag: 'md_exam_passed' }, stage: 'passed' }],
    },
    passed: { journal: 'Three of five, or better. A citizen of the Precinct, by examination, which the assessor says is the only lawful way and the least used.', end: 'done' },
  },
};

export const q_md_fines: QuestDef = {
  id: 'q_md_fines', title: 'Unpaid Fines', act: 'a2', start: 'notice', xp: 80,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Pay forty-five for three things you have not done' },
    { id: 'contest', kind: 'talk', label: 'Contest them at the Court of Accounts, by appointment' },
  ],
  stages: {
    notice: {
      journal: 'The Precinct has fined you for three offences, each with a forecast date: a curfew you will break, an avenue you will loiter on, an assembly you will attend. Forty-five Tolls, payable at the warden\'s counter. The desk warden was apologetic about the dates.',
      objectives: [{ id: 'settle', text: 'Pay the fines, or contest them', done: { any: [{ flag: 'md_fines_paid' }, { flag: 'md_fines_contested' }] } }],
      next: [{ if: { flag: 'md_fines_paid' }, stage: 'paid' }, { if: { flag: 'md_fines_contested' }, stage: 'contested' }],
    },
    paid: { journal: 'Paid. The receipt is stamped twice. You are, for the moment, a person the Precinct has no complaint against, including the ones it has not had yet.', end: 'done' },
    contested: { journal: 'Contested. The Court of Accounts will hear it, by appointment, which the assessor says could be any time and will be when the schedule says.', end: 'done' },
  },
};

// ---------------------------------------------------------------- Old Market: the kiosk, the riot, the Broker's gigs

export const q_md_kiosk: QuestDef = {
  id: 'q_md_kiosk', title: 'The Haunted Kiosk', act: 'a2', start: 'name', xp: 140,
  routes: [
    { id: 'wire', kind: 'tech', label: 'Follow the wire from the kiosk to where it drinks', requires: { any: [{ skill: 'mechanics', gte: 30 }, { skill: 'science', gte: 30 }] } },
    { id: 'lark', kind: 'talk', label: 'The boy who feeds it knows what it eats' },
    { id: 'sell', kind: 'barter', label: 'A tap on the city\'s wire is worth something to the Broker' },
  ],
  stages: {
    name: {
      journal: 'A pre-Burn kiosk on Old Market\'s east street that still talks, and said your name before you gave it, and said other things after: a number, a reserve, a chair, a date. A boy feeds it cells. Something feeds it names.',
      objectives: [{ id: 'how', text: 'Find out how the kiosk knows faces', done: { lead: 'l_kiosk_wire' } }, { id: 'end', text: 'Decide what to do about it', done: { flag: 'mk_kiosk_outcome' } }],
      next: [
        { if: { flag: 'mk_kiosk_outcome', eq: 'cut' }, stage: 'cut' },
        { if: { flag: 'mk_kiosk_outcome', eq: 'sold' }, stage: 'sold' },
        { if: { flag: 'mk_kiosk_outcome', eq: 'left' }, stage: 'left' },
        { if: { flag: 'mk_kiosk_outcome', eq: 'reported' }, stage: 'reported' },
      ],
    },
    cut: { journal: 'The wire is cut where it left the lamp post. The kiosk sells fortunes now out of a memory forty years deep and no newer, and gets everyone\'s name wrong, and the boy says it is happier.', end: 'done', onEnter: [{ decision: { id: 'mk_kiosk_cut', text: 'You cut the kiosk\'s tap on the city\'s wire.' } }] },
    sold: { journal: 'The Broker bought the splice: a tap on the Precinct\'s lamp wire, which is a tap on the file. The kiosk still talks. So, now, does the hatch.', end: 'done', onEnter: [{ decision: { id: 'mk_kiosk_sold', text: 'You sold the Broker a tap on the city\'s file.' } }, { set: 'broker_has_tap' }] },
    left: { journal: 'You left the kiosk talking. It knows your name and the date, and will tell anyone who stands in front of it with two Tolls.', end: 'done' },
    reported: { journal: 'The wardens took the wire and the kiosk, and the boy, for an hour, and Captain Lowe wrote it up as an unlicensed tap and filed it where the Saints of Static will find it when it is their turn.', end: 'done', onEnter: [{ decision: { id: 'mk_kiosk_reported', text: 'You reported the kiosk\'s tap to the wardens.' } }, { rep: { faction: 'wardens', respect: 5 } }] },
  },
};

export const q_md_riot: QuestDef = {
  id: 'q_md_riot', title: 'Old Market Riot', act: 'a2', start: 'queue', xp: 180,
  routes: [
    { id: 'talk', kind: 'talk', label: 'Talk the square down before the wardens count it', requires: { skill: 'speech', gte: 45 } },
    { id: 'lowe', kind: 'knowledge', label: 'Bring the captain the count: point eight on the notice, point six on the dial' },
    { id: 'crowd', kind: 'fight', label: 'Stand with the queue when it goes for the dial' },
    { id: 'loot', kind: 'stealth', label: 'Let it run, and take what runs loose' },
  ],
  stages: {
    queue: {
      journal: 'The standpipe square in Old Market: the notice says point eight and the dial says point six, and forty people in a queue have done the arithmetic. Two wardens are counting them. Something will happen at the dial before dark.',
      objectives: [{ id: 'end', text: 'See the square through', done: { flag: 'mk_riot_outcome' } }],
      next: [
        { if: { flag: 'mk_riot_outcome', eq: 'talked' }, stage: 'talked' },
        { if: { flag: 'mk_riot_outcome', eq: 'lowe' }, stage: 'lowe' },
        { if: { flag: 'mk_riot_outcome', eq: 'crowd' }, stage: 'crowd' },
        { if: { flag: 'mk_riot_outcome', eq: 'loot' }, stage: 'loot' },
      ],
    },
    talked: { journal: 'The square sat down. You gave them the arithmetic and a place to send it, and Caddo Vell took the count to the Precinct himself with forty names on it, which is a petition and not a riot and gets a notice instead of a club.', end: 'done', onEnter: [{ set: 'mk_riot_over' }, { rep: { faction: 'wardens', respect: 3 } }, { news: { tag: 'market_petition', text: 'Old Market\'s standpipe queue sent a petition to the Precinct instead of breaking the dial', valence: 8, size: 5, at: 'meridian' } }] },
    lowe: { journal: 'Captain Lowe came down to the square himself with the notice in his hand, read both numbers aloud, and turned the dial to point eight with his own fingers while the queue watched. He checked the arithmetic. It was wrong. He wrote that down.', end: 'done', onEnter: [{ set: 'mk_riot_over' }, { set: 'mk_dial_fixed' }, { trust: { npc: 'npc_md_01', by: 20 } }, { rep: { faction: 'wardens', respect: 6 } }, { news: { tag: 'lowe_dial', text: 'the warden captain came to Old Market and turned the water dial up himself', valence: 10, size: 6, at: 'meridian' } }] },
    crowd: { journal: 'The queue went for the dial and you went with it, and the two wardens went down under forty people and were let up again, and the dial is broken open and the standpipe runs. The Precinct will count this one carefully.', end: 'done', onEnter: [{ set: 'mk_riot_over' }, { set: 'mk_dial_broken' }, { rep: { faction: 'wardens', respect: -15, fear: 8 } }, { decision: { id: 'mk_riot_crowd', text: 'You stood with Old Market\'s queue when it broke the water dial.' } }, { news: { tag: 'market_riot', text: 'Old Market broke its water dial; a stranger was in the front of it', valence: -10, size: 8, at: 'meridian' } }] },
    loot: { journal: 'It ran. The dial went, the wardens went for help, the crates at the square\'s edge went in the confusion, and so did you, with what was in them. The queue drinks; the Precinct counts; nobody saw you.', end: 'done', onEnter: [{ set: 'mk_riot_over' }, { set: 'mk_dial_broken' }, { give: 'tolls', count: 40 }, { give: 'c_water', count: 4 }, { decision: { id: 'mk_riot_loot', text: 'You let Old Market riot and took what ran loose.' } }] },
  },
};

const GIG = (id: string, title: string, journal: string, done: Cond, reward: string): QuestDef => ({
  id, title, act: 'a2', start: 'taken', xp: 60,
  stages: {
    taken: { journal, objectives: [{ id: 'do', text: 'Do the job', done }, { id: 'pay', text: 'Collect from the Broker\'s hatch', done: { flag: `${id}_paid` } }], next: [{ if: { flag: `${id}_paid` }, stage: 'paid' }] },
    paid: { journal: reward, end: 'done' },
  },
});

export const q_gig_case = GIG('q_gig_case', 'Gig: A Sealed Case', 'A flat steel case for the clerk at the Exchange in Ninebridge, by hand, unopened. Sixty on delivery, the board says. It ticks, faintly.', { flag: 'gig_case_delivered' }, 'Sixty Tolls through the hatch, and a hand you did not see take the receipt.');
export const q_gig_meds = GIG('q_gig_meds', 'Gig: Knit Kits for the Farms', 'Two knit kits for the sick hall at Openfield, where the Choir\'s healer is short. Fifty, the board says, and the Choir\'s thanks, which the Broker does not pay in.', { flag: 'gig_meds_delivered' }, 'Fifty through the hatch. The healer at Openfield has two knit kits she did not have.');
export const q_gig_lot7 = GIG('q_gig_lot7', 'Gig: Lot Seven', 'A debt contract on the block at Ninebridge: lot seven, a mechanic, forty-eight. The Broker wants the paper, and fronts nothing. A hundred and twenty for it, the board says; the lot opens at seventy.', { item: 'k_gig_lot7' }, 'A hundred and twenty through the hatch for the mechanic\'s paper. Whoever he is, he is the Broker\'s now, and the Broker says that is better than the block, and is probably right.');
export const q_gig_letter = GIG('q_gig_letter', 'Gig: A Letter for the Captain', 'A sealed letter for Captain Lowe at the Precinct station, by hand. Twenty, the board says. It is the weight of a letter with something flat inside.', { flag: 'gig_letter_done' }, 'Twenty through the hatch. "He always refuses," the voice box said. "The point is that he knows who asked."');
export const q_gig_box = GIG('q_gig_box', 'Gig: A Box from the Sump', 'A boxed piece of chrome in the Tanners\' locker at the Sump, which the Broker says is the Broker\'s and the Tanners say is the Tanners\'. Eighty for it through the hatch.', { item: 'ci_ch_eye_heat' }, 'Eighty through the hatch, and the box gone into the container without a sound.');

// ---------------------------------------------------------------- the Sink

export const q_sk_highwater: QuestDef = {
  id: 'q_sk_highwater', title: 'High Water', act: 'a2', start: 'rising', xp: 200,
  routes: [
    { id: 'paid', kind: 'talk', label: 'A variance under clause 14: the Precinct bears the shortfall (the assessor, or the captain)' },
    { id: 'retimed', kind: 'tech', label: 'Retime the relief pumps at the dial', requires: { any: [{ skill: 'mechanics', gte: 40 }, { skill: 'science', gte: 40 }] } },
    { id: 'seized', kind: 'fight', label: 'Take the pump house with the Pale' },
  ],
  stages: {
    rising: {
      journal: 'The first pier of the Sink\'s stilt-walk has a chalk line for every spring, each a hand above the last, and next spring\'s already drawn with a question mark. Something is pumping, far off, for somebody else.',
      objectives: [
        { id: 'schedule', text: 'Learn what the pumps are told to do in spring', done: { knows: 'sk_schedule_known' } },
        { id: 'decide', text: 'See the Sink through the spring', done: { flag: 'sk_pumps' } },
      ],
      next: [
        { if: { flag: 'sk_pumps', eq: 'paid' }, stage: 'paid' },
        { if: { flag: 'sk_pumps', eq: 'retimed' }, stage: 'retimed' },
        { if: { flag: 'sk_pumps', eq: 'seized' }, stage: 'seized' },
      ],
    },
    paid: { journal: 'A variance under clause 14, the drains being the city\'s first duty: the relief pumps run for the Sink this spring and the Precinct bears the shortfall. Dagny Roos read it twice and turned her own dial, which she has not been allowed to do in eleven years. The Precinct will drink point six and notice.', end: 'done', onEnter: [{ set: 'sk_pumps_running' }, { set: 'sk_saved' }, { decision: { id: 'sk_paid', text: 'You had the Sink\'s relief pumping varied under clause 14; the Precinct bears the shortfall.' } }, { news: { tag: 'sink_variance', text: 'the Sink\'s pumps will run this spring on a variance; the Precinct\'s ration drops to pay for it', valence: 6, size: 7, at: 'meridian' } }] },
    retimed: { journal: 'The relief dial reads what you set it to. Two pumps that were the Precinct\'s in spring are the Sink\'s again, and the seal on the dial is a seal on a dial, which the wardens will find out when they next count. Dagny Roos says she does not know who did it, which is nearly true.', end: 'done', onEnter: [{ set: 'sk_pumps_running' }, { set: 'sk_saved' }, { decision: { id: 'sk_retimed', text: 'You retimed the Sink\'s relief pumps behind the Plan\'s seal.' } }, { news: { tag: 'sink_retimed', text: 'somebody retimed the Sink\'s pumps under the Plan\'s seal; the Precinct\'s pressure dropped overnight', valence: 2, size: 6, at: 'meridian' } }] },
    seized: { journal: 'The Pale hold the pump house. The wardens who held it are on the tally wall, by the Pale\'s hand and yours, and the pumps run for the Sink because Saskia Dray says so. The Precinct will come down the stair for this, in its own time, with its own count.', end: 'done', onEnter: [{ set: 'sk_pumps_running' }, { set: 'sk_saved' }, { set: 'sk_pale_leave' }, { decision: { id: 'sk_seized', text: 'You took the Sink\'s pump house from the Precinct with the Pale.' } }, { news: { tag: 'sink_seized', text: 'the Pale took the Sink\'s pump house from the wardens; a stranger was in it', valence: -8, size: 9, at: 'meridian' } }] },
  },
};

export const q_sk_organ: QuestDef = {
  id: 'q_sk_organ', title: 'Organ Run', act: 'a2', start: 'need', xp: 160,
  routes: [
    { id: 'buy', kind: 'barter', label: 'Buy one from Vash\'s cold box, and don\'t ask' },
    { id: 'take', kind: 'stealth', label: 'Take it from the Pale\'s cold store', requires: { any: [{ skill: 'security', gte: 40 }, { skill: 'stealth', gte: 40 }] } },
    { id: 'chrome', kind: 'barter', label: 'A dark-chrome Second Heart instead, and Ocho to fit it' },
  ],
  stages: {
    need: {
      journal: 'Tam Oduya pumped the Sink for the Precinct for eleven years and the wet got into his heart. Ocho can fit a new one — a real one, chilled, or a dark-chrome Second Heart — if one comes through the clinic door. Vash sells hearts. Nobody says whose.',
      objectives: [
        { id: 'heart', text: 'Bring Ocho a heart he can fit', done: { any: [{ item: 'k_sk_heart' }, { item: 'ci_ch_org_heart' }, { flag: 'sk_organ_fitted' }] } },
        { id: 'fit', text: 'See it fitted', done: { flag: 'sk_organ_fitted' } },
      ],
      next: [{ if: { flag: 'sk_organ_how', eq: 'chrome' }, stage: 'fitted_chrome' }, { if: { flag: 'sk_organ_lied' }, stage: 'fitted_lie' }, { if: { flag: 'sk_organ_fitted' }, stage: 'fitted' }],
    },
    fitted: { journal: 'Tam Oduya has a heart that beats. Ocho asked where it came from and you told him, and he asked Tam, and Tam said yes before the sentence was finished. The Code says the patient decides. It does not say Ocho has to like it.', end: 'done' },
    fitted_chrome: { journal: 'Tam Oduya has a Second Heart under his ribs, Mender-built, no leash. It does not skip. He says it ticks, and that he can live with ticking.', end: 'done' },
    fitted_lie: { journal: 'Tam Oduya has a heart that beats and a number inked on a bag in Ocho\'s bin, crossed out. Ocho believes it came from under the water. You know whose walk it came off.', end: 'done' },
  },
};

export const q_sk_code: QuestDef = {
  id: 'q_sk_code', title: 'The Menders\' Code', act: 'a2', start: 'hands', xp: 100,
  stages: {
    hands: {
      journal: 'Ocho does not take apprentices; he takes hands. Hold a clamp steady through one fitting and he will say the words, which are: *fit only what the patient can bear*. Shake, and Pell takes the clamp, and there is always a next time down here.',
      objectives: [{ id: 'assist', text: 'Hold steady through a fitting at Ocho\'s table', done: { member: 'menders' } }],
      next: [{ if: { member: 'menders' }, stage: 'apprentice' }],
    },
    apprentice: { journal: 'Apprentice, by the Menders\' Code. Ocho said the words over a table with a man still open on it, which Pell says is how he says everything. Menders\' prices are yours now, where there are Menders, and so is the thing the Code asks: fit only what the patient can bear.', end: 'done' },
  },
};

// ---------------------------------------------------------------- Lantern Row

export const q_lr_pits: QuestDef = {
  id: 'q_lr_pits', title: 'The Pit', act: 'a2', start: 'card', xp: 120,
  routes: [
    { id: 'under', kind: 'knowledge', label: 'Read the undercard before the house does' },
    { id: 'comer', kind: 'fight', label: 'Stand against Anvil: hands and iron, nobody dies' },
    { id: 'dive', kind: 'barter', label: 'Take the house\'s sixty to fall in the second' },
  ],
  stages: {
    card: {
      journal: 'Lantern Row\'s pit: Teague against Doubt on the undercard at two to one, and Anvil against all comers — thirty to enter, ninety if you are standing at the end. Nobody has stood since spring. Mab Corrigan keeps the slate and the guns.',
      objectives: [
        { id: 'under', text: 'Bet on the undercard', done: { flag: 'lr_under_paid' }, optional: true },
        { id: 'comer', text: 'Stand against Anvil, or fall for the house', done: { any: [{ flag: 'lr_bout_paid' }, { flag: 'lr_dive_done' }] } },
      ],
      next: [{ if: { flag: 'lr_bout_paid' }, stage: 'standing' }, { if: { flag: 'lr_dive_done' }, stage: 'fallen' }],
    },
    standing: { journal: 'Standing, at the end, with Anvil on the floor he keeps so clean and the crowd losing money by the fistful. Ninety from the cash-box, and a pit token the Skirts\' pits and the Crown\'s will honour.', end: 'done' },
    fallen: { journal: 'Down in the second, as agreed, and sixty from Mab after, which on the Row counts as a deal kept. The crowd knew. The crowd always knows.', end: 'done' },
  },
};

export const q_lr_reverie: QuestDef = {
  id: 'q_lr_reverie', title: 'Reverie of a Stranger', act: 'a2', start: 'shelf', xp: 150,
  routes: [
    { id: 'buy', kind: 'barter', label: 'Two hundred, because wardens' },
    { id: 'trade', kind: 'talk', label: 'An hour on the cot: a memory of yours for his' },
    { id: 'take', kind: 'stealth', label: 'The Lantern\'s locker, after hours', requires: { skill: 'security', gte: 45 } },
  ],
  stages: {
    shelf: {
      journal: 'The Lantern\'s evidence shelf holds a reel a Rustmouth took off a warden: a man with no face in it recorded his last day in the city, start to end, a season ago, and went west before dawn. Ysolde Marr wants two hundred for it, or something of yours.',
      objectives: [{ id: 'reel', text: 'Get the reel', done: { item: 'k_lr_reel' } }, { id: 'play', text: 'Live his day, on a cot in the Lantern', done: { flag: 'lr_reel_seen' } }],
      next: [{ if: { flag: 'lr_reel_seen' }, stage: 'seen' }],
    },
    seen: { journal: 'You lived the stranger\'s last day in the city through his eyes: a long stair, something flat carried against the ribs, this cot, a bowl of noodles eaten standing, and a gate at dawn with somebody on the road beyond it who was waiting. What you made of it is in the notebook\'s leads.', end: 'done' },
  },
};

// ---------------------------------------------------------------- the Stacks

export const q_st_flat: QuestDef = {
  id: 'q_st_flat', title: 'A Flat in the Stacks', act: 'a2', start: 'offer', xp: 80,
  routes: [
    { id: 'pay', kind: 'barter', label: 'Key money: two hundred and fifty to the committee' },
    { id: 'earn', kind: 'talk', label: 'Settle the roof and the committee gives it' },
    { id: 'squat', kind: 'stealth', label: 'Break the seal and move in', requires: { skill: 'security', gte: 35 } },
  ],
  stages: {
    offer: {
      journal: 'Flat 9-14 in Block Seven: two rooms, a stove, a bed the Marrs left, a window on the canyon. The committee wants two hundred and fifty in key money, or the roof settled so Nine is not dry at six. The door has a seal on it.',
      objectives: [{ id: 'key', text: 'Get the flat, one way or another', done: { flag: 'st_flat' } }],
      next: [{ if: { flag: 'st_flat' }, stage: 'home' }],
    },
    home: { journal: 'A flat of your own, nine floors up: a bed to rest in, a locker to keep things in, a table to write at, a door that locks from your side. The Loop is downstairs.', end: 'done' },
  },
};

export const q_st_gardens: QuestDef = {
  id: 'q_st_gardens', title: 'Rooftop Gardens', act: 'a2', start: 'roof', xp: 180,
  routes: [
    { id: 'shared', kind: 'talk', label: 'A schedule: hours for the beds, hours for the trays (the committee, or the valve)' },
    { id: 'nines', kind: 'stealth', label: 'The beds: pull the pump\'s fuse, or turn the valve west', requires: { any: [{ skill: 'stealth', gte: 30 }, { skill: 'mechanics', gte: 35 }] } },
    { id: 'twelves', kind: 'talk', label: 'The trays: argue the committee into giving them the tank', requires: { skill: 'speech', gte: 40 } },
    { id: 'burned', kind: 'fight', label: 'Burn the trays with Ren, and fight the Twelves' },
  ],
  stages: {
    roof: {
      journal: 'Block Seven\'s roof: a tank that fills off the Precinct main at night, beds of real dirt on the Nines\' side that are dry by noon, trays on the Twelves\' side that take the whole tank from two to five. Nine old people and a tree against sixty dinners and a man in a clean coat. Three springs of committee pending.',
      objectives: [
        { id: 'log', text: 'Learn who takes what from the tank, and when', done: { knows: 'st_tank_log' } },
        { id: 'settle', text: 'Settle the roof', done: { flag: 'st_roof' } },
      ],
      next: [
        { if: { flag: 'st_roof', eq: 'shared' }, stage: 'shared' },
        { if: { flag: 'st_roof', eq: 'nines' }, stage: 'nines' },
        { if: { flag: 'st_roof', eq: 'twelves' }, stage: 'twelves' },
        { if: { flag: 'st_roof', eq: 'burned' }, stage: 'burned' },
      ],
    },
    shared: { journal: 'Five to two for the beds, two to five for the trays, in the keeper\'s log in capitals and in the committee\'s ledger with a date. Nine is wet at six and Twelve is green at eight. Nobody is happy and everybody is fed.', end: 'done', onEnter: [{ set: 'st_roof_settled' }, { news: { tag: 'stacks_schedule', text: 'Block Seven\'s roof got a water schedule after three springs; the committee signed it', valence: 7, size: 5, at: 'meridian' } }] },
    nines: { journal: 'The pump is dead, or the valve is wired west; either way the tank is the beds\' all night and the trays are drying. Sixty people will carry buckets. Lio Brand will remember the sum.', end: 'done', onEnter: [{ set: 'st_roof_settled' }, { news: { tag: 'stacks_beds', text: 'the Twelves\' pump on Block Seven stopped; the Nines\' beds are wet for the first time in three springs', valence: 2, size: 5, at: 'meridian' } }] },
    twelves: { journal: 'The committee gave the tank to the trays, out loud, in the ledger. Nine carries buckets from the laundry. Mama Deel has stopped coming to committee. A man in a clean coat was pleased, which should worry someone.', end: 'done', onEnter: [{ set: 'st_roof_settled' }, { news: { tag: 'stacks_trays', text: 'Block Seven\'s committee gave the roof tank to the hydroponic deck', valence: -3, size: 5, at: 'meridian' } }] },
    burned: { journal: 'The trays burned at two in the morning with the pump loud, and sixty dinners with them, and Nessa Kord\'s hands. The Twelves came across the deck with pipes. Ren Ashby is sitting in the dirt with an empty can. The committee has written your name beside his.', end: 'done', onEnter: [{ set: 'st_roof_settled' }, { rep: { faction: 'wardens', respect: -4 } }] },
  },
};
