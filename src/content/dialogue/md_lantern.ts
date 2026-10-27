import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';

/**
 * Lantern Row: the canal, the Coinage, the hall, the Velvet, the Lantern, the pit. Bets, bouts, reveries, Dust.
 */

const bye = { text: 'That\'s all.', exit: true };
/** The pit's stake is paid and the bout not yet fought (or lost and the stake gone). */
const COMER: Cond = { all: [{ flag: 'lr_comer_paid' }, { not: { flag: 'lr_bout_won' } }] };
/** What a pit bout pays either way: the dialogue collects from Mab afterwards. */
const PIT = { pit: { win: [{ set: 'lr_bout_won' }, { set: 'lr_bout_fresh' }], lose: [{ set: 'lr_bout_lost' }, { set: 'lr_comer_paid', value: false }, { inc: 'lr_floored' }] } };

// ---------------------------------------------------------------- signs and the Loop

export const d_lr_loop: DialogueDef = {
  id: 'd_lr_loop', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — LANTERN ROW. The tram with its doors open and a tube over the board, pink. PRECINCT 2 · OLD MARKET 2 · THE STACKS 3 · BRIDGEWARD 3 · THE DOCKS 4. Chalk through the last three, and under it in a different chalk: SOON.',
      effects: [{ learn: 'lr_loop_seen' }],
      options: [
        { id: 'lrloop.precinct', text: 'The Precinct. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_precinct', spawn: 'loop', minutes: 15 } }], exit: true },
        { id: 'lrloop.market', text: 'Old Market. (2 Tolls)', if: { all: [{ flag: 'md_market_open' }, { item: 'tolls', count: 2 }] }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_market', spawn: 'loop', minutes: 10 } }], exit: true },
        { id: 'lrloop.stacks', text: 'The Stacks. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_stacks', spawn: 'loop', minutes: 15 } }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

const SIGN = (id: string, text: string, learn: string): DialogueDef => ({ id, owner: 'narrator', start: [{ node: 'read' }], nodes: { read: { text, effects: [{ learn }], options: [{ text: '(Leave it.)', exit: true }] } } });
export const d_lr_bar_sign = SIGN('d_lr_bar_sign', 'THE COINAGE, in gold tube over a brick door, and a hand painted under it with the palm scored through — the Pale\'s mark — and over that, in gold paint, a coin. The Gilt\'s answer.', 'coinage_seen');
export const d_lr_dust_sign = SIGN('d_lr_dust_sign', 'A green tube and no name. Through the door, tables, and the sound Dust makes when it is being lost by people who can afford it.', 'dust_hall_seen');
export const d_lr_velvet_sign = SIGN('d_lr_velvet_sign', 'THE VELVET, in pink, with the T burned out so that it reads THE VELVE. Nobody has fixed it in a year; it is said with the T anyway. A queue, orderly, under the tube.', 'velvet_seen');
export const d_lr_den_sign = SIGN('d_lr_den_sign', 'A violet tube over a container door: THE LANTERN — REVERIES BY THE HOUR — YOURS OR BETTER. Smaller, under it: WE DO NOT BUY FROM THE DROWNED.', 'den_sign_seen');
export const d_lr_east_sign = SIGN('d_lr_east_sign', 'WORKS. A chain across the street east and two Gilt on the chain. Behind them the tubes are dark all the way to Bridgeward, which is where the chain is really about.', 'bridgeward_heard');
export const d_lr_west_sign = SIGN('d_lr_west_sign', 'LANTERN ROW, in every colour, on a board that was once a tram timetable. Under it, in warden stencil: NO WARDEN SERVICE. Under that, in chalk: GOOD.', 'lr_sign_seen');
export const d_lr_canal_sign = SIGN('d_lr_canal_sign', 'A tide mark on the canal wall with a date beside it, and the water a foot below it. The canal was a street; the Sink\'s pumps found it. It runs warm and it throws the tubes back at you, pink and cyan, all night.', 'canal_seen');

export const d_lr_boat: DialogueDef = {
  id: 'd_lr_boat', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'Shay\'s boat: a flat hull of doors with a pole and a lantern, tied at the quay. Two Tolls, the board says, and a hand painted pointing across.', options: [{ text: '(Call Shay.)', effects: [{ event: 'talk', data: { npc: 'npc_lr_10' } }], exit: true }, { text: '(Leave it.)', exit: true }] } },
};

export const d_lr_card: DialogueDef = {
  id: 'd_lr_card', owner: 'narrator', start: [{ node: 'card' }],
  nodes: {
    card: {
      text: 'TONIGHT\'S CARD, in chalk on a post: TEAGUE v. DOUBT — house pays two to one. ANVIL v. ALL COMERS — thirty to enter, ninety standing. HANDS AND IRON. GUNS WITH MAB. Under it, older: NOBODY HAS STOOD SINCE SPRING.',
      effects: [{ learn: 'lr_card_read' }],
      passives: [{ attr: 'senses', dc: 7, text: 'The chalk under DOUBT has been rubbed out and written again tonight, and the odds beside it moved a notch the house\'s way.', effects: [{ learn: 'lr_doubt_fixed' }] }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the pit

export const d_lr_mab: DialogueDef = {
  id: 'd_lr_mab', owner: 'npc_lr_01',
  start: [
    { if: { all: [{ flag: 'lr_bout_won' }, { not: { flag: 'lr_bout_paid' } }] }, node: 'purse' },
    { if: { all: [{ flag: 'lr_bout_lost' }, { not: { flag: 'lr_bout_seen_lost' } }] }, node: 'floored' },
    { if: { flag: 'mab_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman with a slate, a stool, a cash-box and a revolver she does not need to touch. "Mab Corrigan. The pit\'s mine, the floor\'s washed, the odds are chalk. Undercard\'s twenty, two to one. The comer\'s thirty to enter and ninety if you\'re standing at the end." She looks you up and down the way a scale would. "Nobody\'s standing."',
      effects: [{ set: 'mab_met' }, { learn: 'mab_seen' }, { quest: 'q_lr_pits', start: true }],
      options: [
        { id: 'mab.under', text: 'Twenty on the undercard.', if: { all: [{ item: 'tolls', count: 20 }, { not: { flag: 'lr_under_paid' } }] }, next: 'under' },
        { id: 'mab.comer', text: 'Thirty, and I\'m the comer.', if: { all: [{ item: 'tolls', count: 30 }, { not: { flag: 'lr_comer_paid' } }, { not: { flag: 'lr_bout_won' } }] }, next: 'comer' },
        { id: 'mab.dive', text: 'What would the house pay for the comer to fall in the second?', if: { all: [{ not: { flag: 'lr_dive_deal' } }, { not: { flag: 'lr_bout_won' } }] }, next: 'dive', once: true },
        bye,
      ],
    },
    again: {
      text: '"Chalk." The slate.',
      options: [
        { id: 'mab.under.again', text: 'Twenty on the undercard.', if: { all: [{ item: 'tolls', count: 20 }, { not: { flag: 'lr_under_paid' } }] }, next: 'under' },
        { id: 'mab.comer.again', text: 'Thirty, and I\'m the comer.', if: { all: [{ item: 'tolls', count: 30 }, { not: { flag: 'lr_comer_paid' } }, { not: { flag: 'lr_bout_won' } }] }, next: 'comer' },
        { id: 'mab.dive.again', text: 'What would the house pay for the comer to fall in the second?', if: { all: [{ not: { flag: 'lr_dive_deal' } }, { not: { flag: 'lr_bout_won' } }, { not: { seen: 'mab.dive' } }] }, next: 'dive' },
        bye,
      ],
    },
    under: {
      text: '"Teague or Doubt." She has the slip written before you answer; she writes both and tears one.',
      options: [
        { id: 'under.teague', text: 'Teague.', effects: [{ take: 'tolls', count: 20 }, { set: 'lr_under_pick', value: 'teague' }], next: 'bell' },
        { id: 'under.doubt', text: 'Doubt.', effects: [{ take: 'tolls', count: 20 }, { set: 'lr_under_pick', value: 'doubt' }], next: 'bell' },
        { text: 'Neither.', exit: true },
      ],
    },
    bell: {
      text: 'An hour, and the bell. Teague is the small one and fights like it, in and out; Doubt is the big one and fights like a man with somewhere to be. In the second, Doubt walks onto a left that a child would have seen coming and goes down, carefully, like a man checking the floor for coins. The crowd knows. The crowd always knows. The house pays anyway.',
      effects: [{ time: 60 }, { learn: 'lr_doubt_fixed' }, { learn: 'lr_under_seen' }],
      options: [
        { id: 'bell.collect', text: '(Collect. Forty.)', if: { flag: 'lr_under_pick', eq: 'teague' }, effects: [{ give: 'tolls', count: 40 }, { set: 'lr_under_paid' }, { xp: 30 }], next: 'collected' },
        { id: 'bell.tear', text: '(Tear the slip.)', if: { flag: 'lr_under_pick', eq: 'doubt' }, effects: [{ set: 'lr_under_paid' }], next: 'torn' },
      ],
    },
    collected: { text: '"Forty." Counted onto the slate, not into your hand; you pick it up yourself. "The small one. Everyone says the small one, after."', options: [bye] },
    torn: { text: '"Doubt." She almost smiles. "Nobody\'s ever sure why."', options: [bye] },
    comer: {
      text: '"Anvil\'s in the ring. Hands and iron only — leave the guns with me; you get them back, you always do." She holds out the cash-box lid. "Thirty."',
      options: [
        { id: 'comer.pay', text: '(Pay. 30 Tolls)', effects: [{ take: 'tolls', count: 30 }, { set: 'lr_comer_paid' }, { set: 'lr_bout_lost', value: false }], next: 'comer_go' },
        { text: 'Not tonight.', exit: true },
      ],
    },
    comer_go: { text: '"Go and stand in front of him. He\'ll do the rest." The slate: COMER — 3 TO 1. Somebody in the crowd has already bet against you.', options: [{ text: '(The ring.)', exit: true }] },
    dive: { text: 'She does not look up from the slate. "Sixty. After. From me. And nobody says." The chalk does not stop. "Anvil knows. Anvil doesn\'t mind. Anvil\'s been in the second since spring."', options: [{ id: 'dive.yes', text: 'Done.', effects: [{ set: 'lr_dive_deal' }], next: 'dive_done' }, { text: 'Forget I asked.', exit: true }] },
    dive_done: { text: '"The second. Not the first; the first\'s an insult. Not the third; the third\'s a crime." She writes nothing down.', options: [bye] },
    purse: {
      text: [{ if: { flag: 'lr_dive_deal' }, text: 'The slate is still up. COMER — STANDING. She looks at you for a long moment over it. "You had a deal." The cash-box opens anyway. "Ninety. The deal was sixty and I don\'t pay men who don\'t fall. Take the ninety and don\'t come to me for a deal again."' }, { text: 'The slate is still up. COMER — STANDING. The crowd is the loudest it has been all year and most of it is losing money. "Standing." She opens the cash-box. "Ninety. And this." A brass token, pit-stamped. "The Skirts\' pits honour it, and the Crown\'s, if you ever stand in one of those."' }],
      effects: [{ give: 'tolls', count: 90 }, { give: 'k_lr_token' }, { set: 'lr_bout_paid' }, { set: 'lr_champion' }, { xp: 120 }, { rep: { faction: 'gilt', respect: 4 } }, { decision: { id: 'lr_champion', text: 'You stood in Lantern Row\'s pit against Anvil and were standing at the end.' } }, { news: { tag: 'lr_comer', text: 'a comer stood against Anvil in Lantern Row\'s pit and was standing at the end', valence: 6, size: 6, at: 'meridian' } }],
      options: [{ text: '(Take it.)', exit: true }],
    },
    floored: {
      text: [{ if: { flag: 'lr_dive_deal' }, text: '"The second." She says it like a date. "Sixty." Counted onto the slate. "That\'s a deal kept, which on this row is rarer than standing."' }, { text: '"Anvil." She wipes the slate. "Thirty\'s chalk. There\'s tomorrow; there\'s always tomorrow, down here."' }],
      effects: [{ set: 'lr_bout_seen_lost' }],
      options: [
        { id: 'floored.dive', text: '(Take the sixty.)', if: { flag: 'lr_dive_deal' }, effects: [{ give: 'tolls', count: 60 }, { set: 'lr_dive_done' }, { set: 'lr_dive_deal', value: false }, { decision: { id: 'lr_dive', text: 'You took a dive in Lantern Row\'s pit for the house\'s sixty.' } }, { rep: { faction: 'gilt', respect: -3 } }], exit: true },
        { id: 'floored.again', text: 'Tomorrow, then.', if: { not: { flag: 'lr_dive_deal' } }, effects: [{ set: 'lr_bout_lost', value: false }], exit: true },
      ],
    },
  },
};

export const d_lr_anvil: DialogueDef = {
  id: 'd_lr_anvil', owner: 'npc_lr_02',
  start: [{ if: { flag: 'lr_bout_won' }, node: 'stood' }, { if: COMER, node: 'ready' }, { if: { flag: 'lr_floored', gte: 1 }, node: 'floored' }, { node: 'intro' }],
  nodes: {
    intro: { text: 'A man in the ring with his hands wrapped and bolt knuckles on the wraps, standing the way a wall stands. "Anvil. You\'re not on the card." He does not look at you long. "Mab\'s thirty. Then you\'re on it."', effects: [{ learn: 'anvil_seen' }], options: [{ text: 'Mab\'s thirty, then.', exit: true }, bye] },
    ready: {
      text: '"You paid Mab." He rolls his shoulders once. "Hands and iron. I don\'t go for the head unless you do. Floor\'s washed; try not to be the reason it needs washing." The crowd leans in over the chain.',
      options: [
        { id: 'anvil.fight', text: '(Fight.)', effects: [{ event: 'fight', data: PIT }], exit: true },
        { text: 'Not yet.', exit: true },
      ],
    },
    stood: { text: '"Standing." He says it with something that is nearly respect and nearly relief. "Nobody\'s done that since spring. The spring one was me." He unwraps a hand. "Mab\'s got your purse. Go and get it before she thinks of a reason."', effects: [{ learn: 'anvil_beaten' }], options: [bye] },
    floored: { text: '"Floor\'s clean." He means it kindly. "You cleaned it. Thirty gets you another go; the second go is the one that counts, most of them."', options: [bye] },
  },
};

export const d_lr_sunny: DialogueDef = {
  id: 'd_lr_sunny', owner: 'npc_lr_03', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A small fighter wrapping her hands with the care of someone who has broken them before. "Teague. I\'m the small one. Bet on the small one; the big one\'s got somewhere to be." She looks at Doubt across the ring, and at Mab\'s shack, and back at her hands.', effects: [{ learn: 'sunny_seen' }], options: [{ id: 'sunny.doubt', text: 'Somewhere to be?', next: 'doubt', once: true }, bye] }, doubt: { text: '"Mab\'s shack, after. With a slip in his hand and a limp he hasn\'t got." She ties off the wrap. "Everyone on the Row knows. Everyone bets anyway. That\'s the Row."', effects: [{ learn: 'lr_doubt_fixed' }], options: [bye] } },
};

export const d_lr_doubt: DialogueDef = {
  id: 'd_lr_doubt', owner: 'npc_lr_04', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A big man with a beard and bolt knuckles, looking at the pit floor as if it owed him. "Doubt. They call me Doubt. Nobody\'s sure why." He does not look at Teague. "Second round. Could go either way."', passives: [{ attr: 'senses', dc: 8, text: 'He is counting something on his fingers inside his coat, and it is not rounds.', effects: [{ learn: 'lr_doubt_fixed' }] }], options: [bye] } },
};

// ---------------------------------------------------------------- the Lantern: reveries

export const d_lr_ysolde: DialogueDef = {
  id: 'd_lr_ysolde', owner: 'npc_lr_05',
  start: [{ if: { flag: 'ysolde_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman at a desk between three cots with headsets on hooks over them, and a locker behind her with a violet tube on it. "Ysolde Marr. The Lantern. Yours or better." She taps the hooks. "A Summer in the Crown. The Race. Five an hour, either. And the evidence shelf, which isn\'t for sale, and which you\'ll ask about anyway."',
      effects: [{ set: 'ysolde_met' }, { learn: 'ysolde_seen' }],
      options: [
        { id: 'ysolde.crown', text: 'A Summer in the Crown. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }, { event: 'reverie', data: { tree: 'd_lr_rev_crown', name: 'A Summer in the Crown' } }], exit: true },
        { id: 'ysolde.race', text: 'The Race. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }, { event: 'reverie', data: { tree: 'd_lr_rev_race', name: 'The Race' } }], exit: true },
        { id: 'ysolde.shelf', text: 'The evidence shelf.', if: { all: [{ flag: 'ch1_done' }, { not: { item: 'k_lr_reel' } }] }, next: 'shelf' },
        { id: 'ysolde.play', text: '(Jack in. The stranger\'s day.)', if: { item: 'k_lr_reel' }, effects: [{ event: 'reverie', data: { tree: 'd_lr_reverie', name: 'A Stranger\'s Day' } }], exit: true },
        { id: 'ysolde.what', text: 'What is a reverie?', next: 'what', once: true },
        bye,
      ],
    },
    again: {
      text: '"Yours or better."',
      options: [
        { id: 'ysolde.crown.again', text: 'A Summer in the Crown. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }, { event: 'reverie', data: { tree: 'd_lr_rev_crown', name: 'A Summer in the Crown' } }], exit: true },
        { id: 'ysolde.race.again', text: 'The Race. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }, { event: 'reverie', data: { tree: 'd_lr_rev_race', name: 'The Race' } }], exit: true },
        { id: 'ysolde.shelf.again', text: 'The evidence shelf.', if: { all: [{ flag: 'ch1_done' }, { not: { item: 'k_lr_reel' } }, { not: { flag: 'lr_reel_taken' } }] }, next: 'shelf' },
        { id: 'ysolde.play.again', text: '(Jack in. The stranger\'s day.)', if: { item: 'k_lr_reel' }, effects: [{ event: 'reverie', data: { tree: 'd_lr_reverie', name: 'A Stranger\'s Day' } }], exit: true },
        { id: 'ysolde.what.again', text: 'What is a reverie?', if: { not: { seen: 'ysolde.what' } }, next: 'what' },
        bye,
      ],
    },
    what: { text: '"A day someone had, on a reel, through a headset. The Crown records art. The Row records whatever sells. Wardens record for evidence." She shrugs. "Some people live in them. I don\'t sell to those; look at the cots after and you\'d stop too."', effects: [{ learn: 'reverie_explained' }], options: [bye] },
    shelf: {
      text: 'She takes a reel off the locker shelf with two fingers, the way you hold something that is not yours. "A Rustmouth brought it off a warden\'s shelf. A man sat on that cot a season ago and paid me to record his last day in the city, start to end, and left before dawn. No face in it; he was a Choir man, they keep no likeness. The wardens wanted it for who he met." She puts it down between you. "Two hundred. Because wardens."',
      effects: [{ quest: 'q_lr_reverie', start: true }, { learn: 'lr_reel_heard' }, { learn: 'stranger_recorded_here' }],
      options: [
        { id: 'shelf.pay', text: '(Pay. 200 Tolls)', if: { item: 'tolls', count: 200 }, effects: [{ take: 'tolls', count: 200 }, { give: 'k_lr_reel' }, { set: 'lr_reel_taken' }, { set: 'lr_reel_how', value: 'bought' }], next: 'reel' },
        { id: 'shelf.trade', text: 'What would you take instead?', next: 'trade' },
        { id: 'shelf.who', text: 'Who did he meet?', next: 'who' },
        { text: 'I\'ll think about it.', exit: true },
      ],
    },
    who: { text: '"I didn\'t watch it. I never watch the shelf." She means it. "Buy it and tell me, or don\'t."', options: [{ id: 'who.pay', text: '(Pay. 200 Tolls)', if: { item: 'tolls', count: 200 }, effects: [{ take: 'tolls', count: 200 }, { give: 'k_lr_reel' }, { set: 'lr_reel_taken' }, { set: 'lr_reel_how', value: 'bought' }], next: 'reel' }, { id: 'who.trade', text: 'What would you take instead?', next: 'trade' }, { text: 'I\'ll think about it.', exit: true }] },
    trade: { text: '"A memory of yours." She looks at you properly for the first time. "The Cistern. Nobody up here has one of a cistern; nobody up here has been in one. An hour on the cot and the reel\'s yours." A pause. "It\'s not a copy. It\'s yours; you\'ll still have it. People say it feels thinner after. People say a lot."', options: [{ id: 'trade.yes', text: '(Give her the Cistern.)', effects: [{ time: 60 }, { give: 'k_lr_reel' }, { set: 'lr_reel_taken' }, { set: 'lr_reel_how', value: 'traded' }, { set: 'lr_cistern_sold' }, { decision: { id: 'lr_cistern_sold', text: 'You sold a reverie of the Cistern to the Lantern, for the stranger\'s day.' } }, { learn: 'reverie_recorded' }], next: 'reel' }, { text: 'Not that.', exit: true }] },
    reel: { text: '"Jack in here or don\'t jack in at all; the reel\'s keyed to my cots." She hangs a headset on the nearest hook. "I won\'t watch. I never watch the shelf."', options: [{ id: 'reel.play', text: '(Jack in.)', effects: [{ event: 'reverie', data: { tree: 'd_lr_reverie', name: 'A Stranger\'s Day' } }], exit: true }, { text: 'Later.', exit: true }] },
  },
};

export const d_lr_rev_crown: DialogueDef = {
  id: 'd_lr_rev_crown', owner: 'narrator', start: [{ node: 'garden' }],
  nodes: {
    garden: { text: 'Light. Real light, through a dome, on leaves that are green all the way through. You are carrying a tray; the hands are not yours and they are steady. A woman in grey silk at a glass table does not look at you as she takes a cup, and beyond her, over the parapet, the whole city lies in haze like something spilled. The air has no taste at all. You stand there a long time, holding the tray, and nobody asks you to stop.', effects: [{ learn: 'crown_seen_reverie' }], options: [{ text: '(Look at the city.)', next: 'city' }, { text: '(Wake.)', exit: true }] },
    city: { text: 'From up here the Precinct is a grid and Old Market is a stain and the canal is a bright thread, and you cannot see the Sink at all, which is the point of up here. The woman says, to nobody, "Bring the next one." The reel ends on the tray going back through a door.', effects: [{ learn: 'crown_view_reverie' }], options: [{ text: '(Wake.)', exit: true }] },
  },
};

export const d_lr_rev_race: DialogueDef = {
  id: 'd_lr_rev_race', owner: 'narrator', start: [{ node: 'line' }],
  nodes: {
    line: { text: 'Engine. Dust. A buggy of welded doors with a wheel in your hands that fights you, and six others beside you on a ring road of cracked concrete outside the Wall with the towers behind, and a flag. The flag drops. For four minutes you are faster than anyone you have ever been, and then a wheel comes off something ahead and it is not yours, and the reel ends in the roar, which the crowd at the Dead Ring makes when somebody does not get up.', effects: [{ learn: 'dead_ring_heard' }, { learn: 'race_reverie' }], options: [{ text: '(Wake.)', exit: true }] },
  },
};

export const d_lr_reverie: DialogueDef = {
  id: 'd_lr_reverie', owner: 'narrator', start: [{ node: 'stair' }],
  nodes: {
    stair: {
      text: 'A stair. Concrete, lit every landing by a tube that is the city\'s, not the Row\'s: white, steady, counted. The hands are not yours; they are older and the knuckles are scarred, and one of them is pressed flat against the coat over the ribs where something flat and square is carried. Breath, going down. Nobody on the stair. The reel is a season old and the man whose eyes these are is still alive in it, for the length of the reel.',
      effects: [{ set: 'lr_reel_played' }, { learn: 'rev_stair' }],
      options: [
        { id: 'rev.count', text: '(Listen. He is counting.)', check: { attr: 'wits', dc: 7 }, next: 'count', fail: 'count_no', once: true },
        { id: 'rev.bundle', text: '(Look down, at what the hand is pressing flat.)', check: { attr: 'senses', dc: 7 }, next: 'bundle', fail: 'bundle_no', once: true },
        { text: '(Let the day run.)', next: 'row' },
      ],
    },
    count: { text: 'Landings. Under the breath, a number at each: "— ninety-one. Ninety. Eighty-nine —" It goes on a long time. There is only one house in Meridian with that many floors above a stair, and it has the city\'s own tubes on its landings.', effects: [{ lead: 'l_rev_spire' }, { learn: 'rev_spire' }, { xp: 40 }], options: [{ id: 'rev.bundle.2', text: '(Look down, at what the hand is pressing flat.)', if: { not: { seen: 'rev.bundle' } }, check: { attr: 'senses', dc: 7 }, next: 'bundle', fail: 'bundle_no' }, { text: '(Let the day run.)', next: 'row' }] },
    count_no: { text: 'Breath, and the stair, and a number you cannot catch.', options: [{ id: 'rev.bundle.3', text: '(Look down, at what the hand is pressing flat.)', if: { not: { seen: 'rev.bundle' } }, check: { attr: 'senses', dc: 7 }, next: 'bundle', fail: 'bundle_no' }, { text: '(Let the day run.)', next: 'row' }] },
    bundle: { text: 'On a landing he stops and takes it out, to check it, the way you check a thing you have stolen. A bundle of photographs in a cloth, each a face, each with a line of cipher under it; and a sheet, the same cipher, twelve lines long. He fans them once with his thumb. The fourth face is yours, older, grey at the temples, and you feel the hand that is not yours stop, and feel — through a season and a reel — the man decide something. He puts them back against his ribs.', effects: [{ lead: 'l_rev_bundle' }, { learn: 'rev_bundle' }, { xp: 40 }], options: [{ id: 'rev.count.2', text: '(Listen. He is counting.)', if: { not: { seen: 'rev.count' } }, check: { attr: 'wits', dc: 7 }, next: 'count', fail: 'count_no' }, { text: '(Let the day run.)', next: 'row' }] },
    bundle_no: { text: 'The hand stays flat. Whatever is under it stays under it.', options: [{ id: 'rev.count.3', text: '(Listen. He is counting.)', if: { not: { seen: 'rev.count' } }, check: { attr: 'wits', dc: 7 }, next: 'count', fail: 'count_no' }, { text: '(Let the day run.)', next: 'row' }] },
    row: {
      text: 'Then night, and tubes, pink and violet, and this cot, from the inside: the headset coming down over eyes that are not yours and a woman\'s voice — Ysolde\'s, a season younger — saying "Start to end?" and his, the first time you have heard it, saying "Start to end. If I don\'t come back, somebody should have seen it." Then a bowl of Auntie Wen\'s noodles, eaten standing. Then the gate.',
      effects: [{ learn: 'rev_row' }],
      options: [
        { id: 'rev.gate', text: '(The gate. Look at who is looking.)', check: { attr: 'senses', dc: 7 }, next: 'gate', fail: 'gate_no' },
      ],
    },
    gate: { text: 'Dawn at the Wall, the gate the size of a door, the lens. He does not look at the lens; he looks past it, west, at the road, and at a rider on the road who is not going anywhere: a long coat, a guild rifle across the saddle, a brand on the saddle\'s leather you have seen on a gatepost at Tollhouse 9. The rider is waiting. The man whose eyes these are sees that the rider is waiting, and goes west anyway, and the reel ends on the first step.', effects: [{ lead: 'l_rev_gate' }, { learn: 'rev_gate' }, { xp: 40 }], options: [{ text: '(Wake.)', next: 'wake' }] },
    gate_no: { text: 'Dawn, the Wall, the road west. Somebody on it. The reel ends on the first step.', options: [{ text: '(Wake.)', next: 'wake' }] },
    wake: { text: 'The cot. The violet tube. Ysolde at her desk with her back to you, not watching, as promised. Your own hands, which shake, a little, which his did not.', effects: [{ set: 'lr_reel_seen' }, { xp: 60 }, { decision: { id: 'lr_reel_seen', text: 'You lived the stranger\'s last day in the city, through his eyes, on a cot in the Lantern.' } }], options: [{ text: '(Sit up.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Coinage, the hall, the Velvet

export const d_lr_pip: DialogueDef = {
  id: 'd_lr_pip', owner: 'npc_lr_06',
  start: [{ if: { flag: 'lr_fight_gilt' }, node: 'fight' }, { if: { member: 'pale' }, node: 'pale' }, { if: { flag: 'pip_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy of twenty-two on a bar stool with gold in his hair and gold at his wrist, which is a watch, and gold behind his left eye, which is not. "Pip Aldous. Gilt." He says it like a family name, which it has replaced. "You\'re not Row and you\'re not Crown. That makes you trade. Chrome, coin or trouble?"',
      effects: [{ set: 'pip_met' }, { learn: 'pip_seen' }, { learn: 'gilt_seen' }],
      options: [
        { id: 'pip.gilt', text: 'What are the Gilt?', next: 'gilt', once: true },
        { id: 'pip.chain', text: 'The chain east. Works.', next: 'chain', once: true },
        { id: 'pip.run', text: 'Trouble. What kind do you pay for?', next: 'run', once: true },
        { text: 'Chrome.', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    again: { text: '"Chrome, coin or trouble?"', options: [{ id: 'pip.gilt.again', text: 'What are the Gilt?', if: { not: { seen: 'pip.gilt' } }, next: 'gilt' }, { id: 'pip.chain.again', text: 'The chain east.', if: { not: { seen: 'pip.chain' } }, next: 'chain' }, { id: 'pip.run.again', text: 'Trouble.', if: { not: { seen: 'pip.run' } }, next: 'run' }, { text: 'Chrome.', effects: [{ event: 'barter' }], exit: true }, bye] },
    gilt: { text: '"Crown kids who came down the Loop and didn\'t go back up." He turns the watch. "We fence what the Crown loses and fit what the Concern won\'t licence, and we wear it where the wardens can see, which they can\'t, because there aren\'t any. Mother thinks I\'m at a salon."', effects: [{ learn: 'gilt_what' }], options: [bye] },
    chain: { text: '"Bridgeward\'s a Rustmouth street. Was. Is." He shrugs the eye. "The chain says works and means ours, and the Rustmouths have a chain at their end that says the same. Between the chains it\'s dark. Nobody walks it. When somebody does, it\'ll be a war or a wedding."', effects: [{ learn: 'turf_heard' }, { learn: 'bridgeward_heard' }], options: [bye] },
    run: { text: '"The kind the wardens want back." He finishes the glass. "Bring me a thing with a warden\'s tag on it and I\'ll give you a name to say at the chain. Runner. It\'s a start. Everything on this row\'s a start."', effects: [{ set: 'gilt_invite' }, { learn: 'gilt_invite' }], options: [bye] },
    pale: { text: 'He looks at your hands and then does not look at you at all. "Pale." The stool turns. "We don\'t trade with the hand. Drink, if you like. Then go."', options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_lr_dolour: DialogueDef = {
  id: 'd_lr_dolour', owner: 'npc_lr_07', start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'A dealer at the middle table with a deck she does not look at. "Dust. Ten the hand, thirty the high table. The house wins. I\'m the house." She fans the deck without looking at that either. "Sit."',
      effects: [{ learn: 'dolour_seen' }],
      options: [
        { text: 'Ten the hand.', if: { item: 'tolls', count: 10 }, effects: [{ event: 'dust', data: { stake: 10 } }], exit: true },
        { text: 'The high table.', if: { item: 'tolls', count: 30 }, effects: [{ event: 'dust', data: { stake: 30 } }], exit: true },
        { id: 'dolour.chit', text: 'A Crown boy lost a chit here.', if: { knows: 'fenwick_chit' }, next: 'chit', once: true },
        bye,
      ],
    },
    chit: { text: '"Lorne." She taps the cage behind her without turning. "A Masque chit, House Lorne, one guest. In the cage, with the rest of what the Crown loses when it comes down to feel something." She looks at you for the first time. "A hundred. Or win it; the house plays for it, high table, once."', effects: [{ learn: 'masque_chit_cage' }, { learn: 'masque_heard' }], options: [{ id: 'chit.buy', text: '(Pay. 100 Tolls)', if: { item: 'tolls', count: 100 }, effects: [{ take: 'tolls', count: 100 }, { give: 'k_masque_chit' }, { set: 'lr_chit_bought' }], next: 'chit_got' }, { id: 'chit.play', text: 'The high table. For the chit.', if: { all: [{ item: 'tolls', count: 30 }, { not: { flag: 'lr_chit_played' } }] }, effects: [{ set: 'lr_chit_played' }, { event: 'dust', data: { stake: 30, prize: { label: 'a Masque chit, House Lorne', win: [{ give: 'k_masque_chit' }, { set: 'lr_chit_won' }], lose: [] } } }], exit: true }, bye] },
    chit_got: { text: '"House Lorne." She slides it across. "Wear something. They\'ll know you\'re not Lorne; they won\'t care, if you wear something."', options: [bye] },
  },
};

export const d_lr_madame: DialogueDef = {
  id: 'd_lr_madame', owner: 'npc_lr_08',
  start: [{ if: { flag: 'madame_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman behind a long counter in a room that is warmer than the Row and smells of oil and oranges, who has seen everyone who has ever come through the door and let most of them in. "The Velvet. Madame Oyelaran; the Madame does, if you\'re shy. Company, conversation, the hour. In that order, if you\'re wise." She takes you in. "You\'re not shy. You\'re tired."',
      effects: [{ set: 'madame_met' }, { learn: 'madame_seen' }],
      options: [
        { id: 'madame.hour', text: 'The hour. (20 Tolls)', if: { all: [{ item: 'tolls', count: 20 }, { not: { flag: 'velvet_hour_today' } }] }, effects: [{ take: 'tolls', count: 20 }, { time: 60 }, { event: 'heal' }, { set: 'velvet_hour_today' }, { after: { minutes: 1440, id: 'velvet_hour_reset', effects: [{ set: 'velvet_hour_today', value: false }] } }, { learn: 'velvet_hour' }], next: 'hour' },
        { id: 'madame.crown', text: 'You dress the Crown\'s girls, they say.', next: 'crown', once: true },
        { id: 'madame.row', text: 'Who runs the Row?', next: 'row', once: true },
        bye,
      ],
    },
    again: { text: '"Company, conversation, the hour."', options: [{ id: 'madame.hour.again', text: 'The hour. (20 Tolls)', if: { all: [{ item: 'tolls', count: 20 }, { not: { flag: 'velvet_hour_today' } }] }, effects: [{ take: 'tolls', count: 20 }, { time: 60 }, { event: 'heal' }, { set: 'velvet_hour_today' }, { after: { minutes: 1440, id: 'velvet_hour_reset', effects: [{ set: 'velvet_hour_today', value: false }] } }], next: 'hour' }, { id: 'madame.crown.again', text: 'The Crown\'s girls.', if: { not: { seen: 'madame.crown' } }, next: 'crown' }, { id: 'madame.row.again', text: 'Who runs the Row?', if: { not: { seen: 'madame.row' } }, next: 'row' }, bye] },
    hour: { text: 'An hour in a warm room with the door shut and somebody who asks nothing and listens to everything, and a bath that is actually hot, which in Meridian is the rarer thing. You come out slower and better.', options: [{ text: '(Go.)', exit: true }] },
    crown: { text: '"I dress them and I send them up the Loop, and at the Masque they are the Crown\'s and in here they are mine, and they tell me everything, because nobody up there listens." She folds a cloth. "Vane\'s Masque is this season. The chits are paper; House Lorne\'s boy lost his at the hall. If you ever need to be at a Masque, come to me first. I\'ll make you look like you belong, which is the only thing they check."', effects: [{ learn: 'masque_heard' }, { learn: 'masque_velvet' }, { learn: 'fenwick_chit' }], options: [bye] },
    row: { text: '"Nobody, and the Gilt think it\'s them, and Mab thinks it\'s money, and Perrin thinks it\'s the tubes." She smiles. "It\'s the canal. Everything on this row is here because the water came and the wardens didn\'t."', effects: [{ learn: 'lr_who_runs' }], options: [bye] },
  },
};

export const d_lr_fenwick: DialogueDef = {
  id: 'd_lr_fenwick', owner: 'npc_lr_09', start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy in a coat that cost more than the bar, leaning on it. "Lorne. House Lorne." He is drunk in the careful way of someone who has only recently learned how. "I lost it. The chit. At the hall, on a hand I was *sure* of. Mother will see. Mother sees everything from up there; it\'s what up there is for."',
      effects: [{ learn: 'fenwick_seen' }, { learn: 'fenwick_chit' }],
      options: [
        { id: 'fenwick.chit', text: 'A chit for what?', next: 'chit', once: true },
        { id: 'fenwick.why', text: 'Why come down here at all?', next: 'why', once: true },
        bye,
      ],
    },
    chit: { text: '"The Masque. Vane\'s. House Lorne, one guest, which was going to be —" he waves at the Row — "somebody from down here, to see their faces. Now it\'s in Dolour\'s cage with my dignity." He drinks. "She\'d sell it. She\'d sell her mother."', effects: [{ learn: 'masque_heard' }, { learn: 'masque_chit_cage' }], options: [bye] },
    why: { text: '"Because it\'s real." He says it like a man who has just found the word. "Up there nothing hurts and nothing tastes and nobody loses. Down here Doubt went down in the second and I *felt* it." He looks at his glass. "I\'m going to be very ill and it\'s going to be wonderful."', effects: [{ learn: 'crown_bored' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the canal and the street

export const d_lr_shay: DialogueDef = {
  id: 'd_lr_shay', owner: 'npc_lr_10',
  start: [{ if: { flag: 'shay_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boatman with a pole and a lantern on a hull made of doors. "Shay. Two across, either way. Bridge is free and further, and the bridge has Kit on it."',
      effects: [{ set: 'shay_met' }],
      options: [
        { id: 'shay.south', text: 'The south quay. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'quay_s', minutes: 5 } }], exit: true },
        { id: 'shay.north', text: 'The north quay. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'quay_n', minutes: 5 } }], exit: true },
        { id: 'shay.canal', text: 'Where does the canal come from?', next: 'canal', once: true },
        bye,
      ],
    },
    again: { text: '"Two across."', options: [{ id: 'shay.south.again', text: 'The south quay. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'quay_s', minutes: 5 } }], exit: true }, { id: 'shay.north.again', text: 'The north quay. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'quay_n', minutes: 5 } }], exit: true }, { id: 'shay.canal.again', text: 'Where does the canal come from?', if: { not: { seen: 'shay.canal' } }, next: 'canal' }, bye] },
    canal: { text: '"The Sink. Pumps push it up through the old storm line and it comes out here warm, because the Precinct\'s pipes run alongside." He poles. "Spring, it comes up a foot. The Sink goes under and we get a foot. Everything on this row is somebody else\'s water."', effects: [{ learn: 'canal_from_sink' }], options: [bye] },
  },
};

export const d_lr_perrin: DialogueDef = {
  id: 'd_lr_perrin', owner: 'npc_lr_11',
  start: [{ if: { flag: 'perrin_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man with a pole with a hook on it and a bag of tubes, walking the towpath lighting what will light. "Perrin. Lit the first tube on this row. Pink. Still pink; look." He points with the hook. "Everything that\'s lit is mine. Everything that\'s dark is the Gilt\'s, or dead."',
      effects: [{ set: 'perrin_met' }],
      options: [
        { id: 'perrin.row', text: 'How did the Row start?', next: 'row', once: true },
        { id: 'perrin.stranger', text: 'A stranger on the card, they say. A season ago.', if: { flag: 'ch1_done' }, next: 'stranger', once: true },
        bye,
      ],
    },
    again: { text: '"Pink. Still pink."', options: [{ id: 'perrin.row.again', text: 'How did the Row start?', if: { not: { seen: 'perrin.row' } }, next: 'row' }, { id: 'perrin.stranger.again', text: 'A stranger, a season ago.', if: { all: [{ flag: 'ch1_done' }, { not: { seen: 'perrin.stranger' } }] }, next: 'stranger' }, bye] },
    row: { text: '"Canal was a street. Water came up the year the Sink\'s pumps went to the Precinct, and the wardens drew the line at the water and said *no service below*, and the first night nobody came to count us, somebody put a tube up." He taps his chest. "Pink. Then a bar, then the pit, then the Velvet, then everything. Lawless is just a word for *the water came and they didn\'t*."', effects: [{ learn: 'lr_history' }], options: [bye] },
    stranger: { text: '"A Choir man, hood up, sat in the Lantern a season back and paid Ysolde to record his day, start to end, which nobody does; people record the good hour, not the day." He lights a tube; it comes on cyan. "Wardens took the reel off her a week later. Rustmouths took it off the wardens. It\'s back on her shelf. She won\'t watch it. I would, if I had the Tolls, and I don\'t, and I\'m not sure I would."', effects: [{ learn: 'lr_stranger_hint' }, { learn: 'stranger_recorded_here' }], options: [bye] },
  },
};

export const d_lr_kit: DialogueDef = {
  id: 'd_lr_kit', owner: 'npc_lr_12',
  start: [{ if: { flag: 'kit_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A girl of seventeen leaning on a lamp post as if she were holding it up, who falls into step beside you before you have decided to walk. "Lost? You look lost. Two Tolls and you\'re not." She is very close, briefly, and then not.',
      effects: [{ set: 'kit_met' }, { take: 'tolls', count: 5 }],
      passives: [{ attr: 'senses', dc: 7, text: 'A hand in your coat, out again, five Tolls lighter. She is already three steps off and not looking back.', effects: [{ learn: 'kit_caught' }] }],
      options: [
        { id: 'kit.back', text: 'Hand it back.', if: { knows: 'kit_caught' }, next: 'back' },
        { id: 'kit.guide', text: 'Two Tolls. Where\'s what?', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }], next: 'guide' },
        bye,
      ],
    },
    again: { text: '"Not lost, then."', options: [{ id: 'kit.back.again', text: 'The five you took. Hand it back.', if: { all: [{ knows: 'kit_caught' }, { not: { flag: 'kit_returned' } }] }, next: 'back' }, { id: 'kit.guide.again', text: 'Two Tolls. Where\'s what?', if: { all: [{ item: 'tolls', count: 2 }, { not: { seen: 'kit.guide' } }] }, effects: [{ take: 'tolls', count: 2 }], next: 'guide' }, bye] },
    back: { text: 'She stops, considers running, considers you, and hands it back with a bow that is nearly real. "Mostly nobody notices. You\'re not mostly." She grins. "Keep your hand on it on the bridge."', effects: [{ give: 'tolls', count: 5 }, { set: 'kit_returned' }, { trust: { npc: 'npc_lr_12', by: 10 } }, { xp: 20 }], options: [bye] },
    guide: { text: '"Pit\'s south, Mab\'s the woman with the slate. Hall\'s the green tube; the dealer\'s the house. The Velvet\'s the pink one, and the queue\'s the queue. The Lantern\'s the violet one at the end, and don\'t buy the shelf." She counts on her fingers. "Gilt are the gold ones. Don\'t take their coin; it\'s counted."', effects: [{ learn: 'lr_guide' }], options: [bye] },
  },
};

export const LANTERN_DIALOGUES: DialogueDef[] = [
  d_lr_loop, d_lr_bar_sign, d_lr_dust_sign, d_lr_velvet_sign, d_lr_den_sign, d_lr_east_sign, d_lr_west_sign, d_lr_canal_sign, d_lr_boat, d_lr_card,
  d_lr_mab, d_lr_anvil, d_lr_sunny, d_lr_doubt, d_lr_ysolde, d_lr_rev_crown, d_lr_rev_race, d_lr_reverie, d_lr_pip, d_lr_dolour, d_lr_madame, d_lr_fenwick, d_lr_shay, d_lr_perrin, d_lr_kit,
];
