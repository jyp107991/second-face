import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, B5d: the Ashlands and the Long Night. Kelso's sleeping reserve and the Concern's contractor (What Sleeps at Kelso),
 * the weigher's grandson under the kites (A Kite Day), the army board that finishes Yard Nine's open route (A Board for
 * Dorcas), beat 17 at Openfield (the act's alliance, `q_a2_longnight`, critical) and the order's first name carried west on
 * the Line (`q_ln_calla`). Every end is the player's choice; the Long Night waits for the player and resolves at its own dawn.
 * Story notes: story/B5d_NOTES_SECRET.md.
 */

const K = (v: string): Cond => ({ flag: 'an_kelso', eq: v });
const KT = (v: string): Cond => ({ flag: 'an_kite', eq: v });
const B = (v: string): Cond => ({ flag: 'an_board', eq: v });
const LN = (v: string): Cond => ({ flag: 'ln_alliance', eq: v });
const O = (v: string): Cond => ({ flag: 'ln_openfield', eq: v });
const DONE: Cond = { flag: 'ln_done' };

const KELSO_ENDS = [{ if: K('sold'), stage: 'sold' }, { if: K('held'), stage: 'held' }, { if: K('taken'), stage: 'taken' }, { if: K('broken'), stage: 'broken' }];

export const q_an_kelso: QuestDef = {
  id: 'q_an_kelso', title: 'What Sleeps at Kelso', act: 'a2', start: 'shut', xp: 250,
  routes: [
    { id: 'held', kind: 'talk', label: 'Talk the thing in Kelso\'s rack into refusing every authority', requires: { skill: 'speech', gte: 50 } },
    { id: 'held_kes', kind: 'chrome', label: 'Let Kes or Nine put it to the thing in its own terms' },
    { id: 'taken', kind: 'tech', label: 'Pull its core and carry it away', requires: { skill: 'mechanics', gte: 50 } },
    { id: 'broken', kind: 'fight', label: 'Break it' },
    { id: 'sold', kind: 'barter', label: 'Guide the Concern\'s contractor in, for three hundred Tolls' },
    { id: 'apron', kind: 'stealth', label: 'Cross Kelso\'s apron by day past the patrol', requires: { skill: 'stealth', gte: 45 } },
  ],
  stages: {
    shut: {
      journal: 'Four names on Spindle\'s board have not been ticked since the spring: pickers who went to Kelso, the army\'s dead base on the March, and did not come back. The weigher has shut Kelso. A Concern contractor at Spindle wants a guide into the hall under its apron.',
      objectives: [
        { id: 'how', text: 'Find out what killed the four at Kelso', done: { knows: 'an_card_known' } },
        { id: 'what', text: 'Find out what Kelso is keeping', done: { any: [{ knows: 'an_reserve_known' }, { knows: 'an_lt_met' }] } },
        { id: 'why', text: 'Find out what the Concern wants there', done: { knows: 'an_concern_known' }, optional: true },
      ],
      next: [...KELSO_ENDS, { if: { any: [{ knows: 'an_reserve_known' }, { knows: 'an_lt_met' }] }, stage: 'reserve' }],
    },
    reserve: {
      journal: 'Under Kelso\'s apron, in a hall, the command unit of a sleeping army: four hundred and twelve border hounds in their cradles in a valley past Saddleback, held dormant for ninety years until a lawful command comes. The Concern wants the unit brought home intact.',
      objectives: [
        { id: 'how', text: 'Find out what killed the four at Kelso', done: { knows: 'an_card_known' }, optional: true },
        { id: 'end', text: 'Decide what becomes of the thing in Kelso\'s rack', done: { flag: 'an_kelso' } },
      ],
      next: KELSO_ENDS,
    },
    sold: { journal: 'The Concern\'s contractor carried Kelso\'s command unit east on a sled, and paid me on delivery. Kennel Seven answers to Halcyon now.', end: 'done' },
    held: { journal: 'The thing in Kelso\'s rack has sealed its reserve against every authority there is, the Concern\'s too. Kennel Seven sleeps, and will stay asleep.', end: 'done' },
    taken: { journal: 'I carry the command unit\'s core. Whatever sleeps in Kennel Seven listens to what is in my pack, and the Concern knows someone has it.', end: 'done' },
    broken: { journal: 'I broke the command unit in Kelso\'s rack. Nobody will ever wake Kennel Seven with a word, and nobody holds it asleep any more.', end: 'done' },
  },
};

const KITE_ENDS = [{ if: KT('dark'), stage: 'dark' }, { if: KT('waited'), stage: 'waited' }, { if: KT('shot'), stage: 'shot' }, { if: KT('left'), stage: 'left' }];

export const q_an_kite: QuestDef = {
  id: 'q_an_kite', title: 'A Kite Day', act: 'a2', start: 'flag', xp: 150,
  routes: [
    { id: 'waited', kind: 'survival', label: 'Wait out the kite day with the boy and walk him home in the dark', requires: { skill: 'survival', gte: 40 } },
    { id: 'dark', kind: 'tech', label: 'Cut the perches\' feed at Pemberton\'s inverter', requires: { skill: 'mechanics', gte: 45 } },
    { id: 'shot', kind: 'fight', label: 'Shoot the kites down when they stoop', requires: { skill: 'firearms', gte: 50 } },
  ],
  stages: {
    flag: {
      journal: 'The black flag is up on Spindle\'s tower: a kite day, and nobody goes on the glass. The weigher\'s grandson, Kwesi, went to Pemberton\'s panels at dawn for cells, and has not come back.',
      objectives: [
        { id: 'find', text: 'Find Kwesi at Pemberton', done: { knows: 'an_kwesi_out' }, optional: true },
        { id: 'why', text: 'Find out why he went', done: { knows: 'an_kwesi_paid' }, optional: true },
        { id: 'home', text: 'Bring him home', done: { flag: 'an_kite' } },
      ],
      next: KITE_ENDS,
    },
    dark: { journal: 'I cut Pemberton\'s inverter. The kites came down out of the sky over the Ashlands wherever their light ran out, and the glass is open to the pickers by day. Nothing watches the valley past Saddleback now.', end: 'done' },
    waited: { journal: 'I waited out the kite day with Kwesi Kwarteng in Pemberton\'s hut and brought him home across the glass in the dark.', end: 'done' },
    shot: { journal: 'I shot two kites down over Pemberton and brought Kwesi Kwarteng home. Kelso\'s patrol walks by day now as well as by night.', end: 'done' },
    left: { journal: 'I left Kwesi Kwarteng to wait for dark at Pemberton. He did not wait.', end: 'failed' },
  },
};

const BOARD_ENDS = [{ if: B('ida'), stage: 'ida' }, { if: B('sold'), stage: 'sold' }, { if: B('spindle'), stage: 'spindle' }, { if: B('mast'), stage: 'mast' }];

export const q_an_board: QuestDef = {
  id: 'q_an_board', title: 'A Board for Dorcas', act: 'a2', start: 'shed', xp: 150,
  routes: [
    { id: 'ida', kind: 'tech', label: 'Pull the army board out of Kelso\'s shunter and bring it to Yard Nine', requires: { skill: 'mechanics', gte: 40 } },
    { id: 'spindle', kind: 'knowledge', label: 'Give it to Spindle\'s well pump instead' },
    { id: 'sold', kind: 'barter', label: 'Sell it to the Concern\'s contractor' },
  ],
  stages: {
    shed: {
      journal: 'In Kelso\'s old engine shed an army yard engine has a board in it that the Concern never made: pre-war, pre-Scald, with nobody in it. Yard Nine\'s Dorcas is cold on her pit for want of a board like that.',
      objectives: [
        { id: 'pull', text: 'Pull the board out of the shunter', done: { any: [{ item: 'k_an_board' }, { flag: 'an_board' }] } },
        { id: 'end', text: 'Decide where it goes', done: { flag: 'an_board' } },
      ],
      next: BOARD_ENDS,
    },
    ida: { journal: 'Dorcas runs on an army board out of Kelso\'s shed, with no channel in it. Four Ways keeps its last spare.', end: 'done' },
    sold: { journal: 'I sold the army board out of Kelso\'s shed to the Concern\'s contractor, who will keep it in a drawer.', end: 'done' },
    spindle: { journal: 'Spindle\'s well pump runs on the army board out of Kelso\'s shed. The water there comes up clean.', end: 'done' },
    // Act 3 (B6d): the board can go into the head box of Signal Hill's mast instead
    mast: { journal: 'The army board out of Kelso\'s shed went into the head box of Signal Hill\'s mast, in place of the city\'s controller. Dorcas is still cold on her pit.', end: 'done' },
  },
};

const NIGHT_ENDS = [
  { if: { all: [DONE, LN('choir'), O('stands')] }, stage: 'choir_stands' },
  { if: { all: [DONE, LN('choir'), O('scorched')] }, stage: 'choir_scorched' },
  { if: { all: [DONE, LN('choir'), O('burned')] }, stage: 'choir_burned' },
  { if: { all: [DONE, LN('guild'), O('guild')] }, stage: 'guild_company' },
  { if: { all: [DONE, LN('guild'), O('scorched')] }, stage: 'guild_scorched' },
  { if: { all: [DONE, LN('guild'), O('burned')] }, stage: 'guild_burned' },
  { if: { all: [DONE, LN('ledger'), O('evicted')] }, stage: 'ledger_evicted' },
  { if: { all: [DONE, LN('ledger'), O('scorched')] }, stage: 'ledger_scorched' },
  { if: { all: [DONE, LN('ledger'), O('burned')] }, stage: 'ledger_burned' },
  { if: { all: [DONE, LN('truce')] }, stage: 'truce' },
  { if: { all: [DONE, LN('none')] }, stage: 'aside' },
];

export const q_a2_longnight: QuestDef = {
  id: 'q_a2_longnight', title: 'Openfield\'s Long Night', act: 'a2', critical: true, start: 'called', xp: 600,
  routes: [
    { id: 'choir', kind: 'talk', label: 'Stand with the Choir at the store' },
    { id: 'guild', kind: 'barter', label: 'Stand with the guild and the Concern for their contracts' },
    { id: 'ledger', kind: 'knowledge', label: 'Stand with the city and read its order at the well' },
    { id: 'truce', kind: 'talk', label: 'Put all three at one table on two favours owed and make a truce', requires: { skill: 'speech', gte: 75 } },
    { id: 'lane', kind: 'fight', label: 'Hold the lane in the night' },
    { id: 'sit', kind: 'survival', label: 'Sit down in front of the riders with the Choir', requires: { attr: 'grit', gte: 7 } },
  ],
  stages: {
    called: {
      journal: 'Openfield has sent for me. The guild has called in its shares in the Choir\'s harvest, the city has nailed an order to Openfield\'s well, and both mean to have the seed store on the same night.',
      objectives: [{ id: 'go', text: 'Go to Openfield', done: { flag: 'ln_at_openfield' } }],
      next: [...NIGHT_ENDS, { if: { flag: 'ln_alliance' }, stage: 'pledged' }, { if: { flag: 'ln_at_openfield' }, stage: 'gathering' }],
    },
    gathering: {
      journal: 'Openfield, on the eve of its Long Night: the guild\'s Grand Factor and the Concern\'s bond officer on the lane with riders and wagons, the city\'s captain at the well with the order and a line of wardens, the Choir sitting down in front of its store, and the Elder\'s daughter with plans of her own. The order\'s first name was read before I had arrived, and the wardens took her west to the Line.',
      objectives: [
        { id: 'sides', text: 'Hear what each side wants', done: { all: [{ knows: 'ln_mason_met' }, { knows: 'ln_sarr_met' }, { knows: 'ln_lowe_met' }] }, optional: true },
        { id: 'calla', text: 'Take Sister Calla off the warden car before the night is over', done: { flag: 'ln_calla', eq: 'freed' }, optional: true },
        { id: 'side', text: 'Decide whom to stand with', done: { flag: 'ln_alliance' } },
      ],
      next: [...NIGHT_ENDS, { if: { flag: 'ln_alliance' }, stage: 'pledged' }],
    },
    pledged: {
      journal: 'I have chosen my side for Openfield\'s Long Night. Whoever owes me, and whoever owes them, will come at dusk; then the night.',
      objectives: [
        { id: 'dusk', text: 'Be at Openfield at dusk', done: { flag: 'ln_mustered' } },
        { id: 'night', text: 'See the night through', done: DONE },
      ],
      next: NIGHT_ENDS,
    },
    choir_stands: { journal: 'Openfield stood its Long Night. The guild went home with its paper, the city with its order, and the store was counted at dawn. The Precinct will go short this winter, and the city has my name.', end: 'done' },
    choir_scorched: { journal: 'Openfield kept its store through the Long Night, and lost its fields: the guild\'s riders burned the rows as they left. The Precinct will go short this winter, and the city has my name.', end: 'done' },
    choir_burned: { journal: 'Openfield burned in the Long Night, as the city\'s forecast said it would, though I stood with it.', end: 'done' },
    guild_company: { journal: 'Openfield is the guild\'s now, and its seed the Concern\'s, in Halcyon\'s vault. Its young ones are signing contracts on the green. The Elder walked out west.', end: 'done' },
    guild_scorched: { journal: 'The guild holds what is left of Openfield\'s store; the Unwritten burned half of it rather than let it go to Halcyon. The Elder walked out west.', end: 'done' },
    guild_burned: { journal: 'Openfield burned in the Long Night between the guild\'s riders and the city\'s wardens, with the store.', end: 'done' },
    ledger_evicted: { journal: 'The city\'s order was kept at Openfield. The store went to the Precinct under the Ledger\'s seal, the guild was put off the Flats, and nothing burned. The Choir has been returned to the schedule.', end: 'done' },
    ledger_scorched: { journal: 'The city\'s order was kept at Openfield. The store went to the Precinct, the guild off the Flats, and at dawn the wardens burned the rows by the order\'s last line.', end: 'done' },
    ledger_burned: { journal: 'Openfield burned in the Long Night, exactly as the city\'s forecast wrote it, though the city had me on its side.', end: 'done' },
    truce: { journal: 'Openfield came through its Long Night whole, its store split three ways at my table and the eviction stayed a season at the rail. The guild, the city and the Choir all owe me. None of them trusts me.', end: 'done' },
    aside: { journal: 'I stood with nobody on Openfield\'s Long Night, and it went as the city\'s forecast wrote it.', end: 'done' },
  },
};

export const q_ln_calla: QuestDef = {
  id: 'q_ln_calla', title: 'Calla on the Line', act: 'a2', start: 'taken', xp: 200,
  routes: [
    { id: 'pilot', kind: 'knowledge', label: 'West Halt\'s pilot rule holds the car at the platform', requires: { flag: 'rc_pilot' } },
    { id: 'heard', kind: 'talk', label: 'Talk the escort into releasing her to be heard', requires: { skill: 'speech', gte: 55 } },
    { id: 'lifted', kind: 'stealth', label: 'Lift her out of the car at night while it waits for a token', requires: { skill: 'stealth', gte: 45 } },
    { id: 'harbour', kind: 'knowledge', label: 'At Carrick, the Harbour court: a person on the quay is a passenger' },
    { id: 'fought', kind: 'fight', label: 'Fight the escort for her' },
  ],
  stages: {
    taken: {
      journal: 'The city\'s order at Openfield read its first name before anything else: Sister Calla of Shale, for sedition. The wardens took her west to the Line in a warden car. Who holds the Line decides where it stops. When Openfield\'s night is over, the car goes on to the city.',
      objectives: [{ id: 'free', text: 'Take her off the warden car', done: { flag: 'ln_calla', eq: 'freed' } }],
      next: [{ if: { flag: 'ln_calla', eq: 'freed' }, stage: 'freed' }, { if: { flag: 'ln_calla', eq: 'taken' }, stage: 'carried' }],
    },
    freed: { journal: 'Sister Calla is off the city\'s warden car and back among the Choir. The city will want her when it wants her.', end: 'done' },
    carried: { journal: 'Sister Calla was carried west to the city on the morning after Openfield\'s Long Night, to be heard by the Court of Accounts for sedition.', end: 'failed' },
  },
};

export const B5D_QUESTS: QuestDef[] = [q_an_kelso, q_an_kite, q_an_board, q_a2_longnight, q_ln_calla];
