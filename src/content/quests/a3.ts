import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';
import {
  ALLIES_AT_KNOCK, ALLY, AT_KNOCK, IN_SALLOW, KNOCK_WATERED, ORDER_READ, RIDE_BUGGY, RIDE_CARTS, RIDE_COLUMN, RIDE_FIRST, RIDE_WHEEL, type Ally,
} from '../world/a3_conds';

/**
 * Act 3 (B6): every quest of the act, as skeletons. Each stage's journal is a placeholder line in the player's voice and
 * each transition reads the flag its slice will set (registry: the end of `world/a3_conds.ts`), so a slice fills its
 * scenes and the quest already moves. The four critical quests declare routes (build coverage at level 24); the side ones
 * document theirs. The order starts the road home; the Ledger's card starts the Spire and the tracker. Nothing here waits
 * on a date. Story notes: story/B6_NOTES_SECRET.md §2 and §8.
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });

// ---------------------------------------------------------------- 18 the order (critical)

export const q_a3_order: QuestDef = {
  id: 'q_a3_order', title: 'Escalation on Schedule', act: 'a3', critical: true, start: 'post', xp: 100,
  routes: [{ id: 'read', kind: 'knowledge', label: 'Break the seal on the city\'s order and read it' }],
  stages: {
    post: {
      journal: 'The post found me the morning after Openfield\'s night: a letter from Maud, a slip out of the Cistern\'s hatch tray, and a sealed order from the city, carried by hand and signed for.',
      objectives: [{ id: 'read', text: 'Read the city\'s order', done: ORDER_READ }],
      next: [{ if: ORDER_READ, stage: 'read' }],
    },
    read: { journal: 'The city has issued its fourth order for the Cistern, and it will not carry it out until I am standing at the door. Knock is under a column of wardens. I am going home.', end: 'done' },
  },
};

// ---------------------------------------------------------------- 18b the recall (side)

const RECALL = (v: string): Cond => F('a3_recall', v);
export const q_a3_recall: QuestDef = {
  id: 'q_a3_recall', title: 'Disposal, as Scheduled', act: 'a3', start: 'notice', xp: 200,
  routes: [
    { id: 'declined', kind: 'knowledge', label: 'A unit that is its own keeper declines its own recall', requires: F('nine_deed', 'self') },
    { id: 'court', kind: 'talk', label: 'Argue the recall at the Court of Accounts', requires: { skill: 'speech', gte: 50 } },
    { id: 'stayed', kind: 'talk', label: 'As the unit\'s owner, refuse to hand it over', requires: F('nine_deed', 'player') },
    { id: 'bought', kind: 'barter', label: 'Buy its title at assessed value under clause 9(b)', requires: { item: 'tolls', count: 121 } },
    { id: 'hidden', kind: 'stealth', label: 'Hide it outside the Wall' },
    { id: 'fought', kind: 'fight', label: 'Turn the recall wardens away' },
  ],
  stages: {
    notice: {
      journal: 'A Precinct notice for Nine, in the city\'s post: DISPOSAL — AS SCHEDULED — R31 BROUGHT FORWARD. The city wants its unit back before the year it had written down.',
      objectives: [
        { id: 'gate', text: 'Hear the recall wardens out at the Precinct gate', done: { any: [F('a3_recall_met'), F('a3_recall')] }, optional: true },
        { id: 'answer', text: 'Answer the city\'s recall of Unit 9', done: F('a3_recall') },
      ],
      next: [
        { if: RECALL('declined'), stage: 'declined' }, { if: RECALL('stayed'), stage: 'stayed' }, { if: RECALL('court'), stage: 'court' },
        { if: RECALL('bought'), stage: 'bought' }, { if: RECALL('hidden'), stage: 'hidden' }, { if: RECALL('fought'), stage: 'fought' },
        { if: RECALL('handed'), stage: 'handed' }, { if: RECALL('taken'), stage: 'taken' },
      ],
    },
    declined: { journal: 'Nine declined its own recall, as its own keeper. The city has had its first refusal from one of its units.', end: 'done' },
    stayed: { journal: 'The city asked me for its unit, and I said no. Nine stays with me.', end: 'done' },
    court: { journal: 'The Court of Accounts heard the recall and struck the disposal. Nine is kept, on the Court\'s own register.', end: 'done' },
    bought: { journal: 'I bought Nine\'s title at its assessed value under clause 9(b). It is paid for, and nobody else\'s.', end: 'done' },
    hidden: { journal: 'Nine is outside the Wall, where the city\'s lenses do not look. Not presented at the gate, the recall is entered NOT FOUND, and an asset not found is written off. It waits for me where I left it.', end: 'done' },
    fought: { journal: 'The recall wardens went back to the Precinct without Nine. The wardens will remember it.', end: 'done' },
    handed: { journal: 'I handed Nine over to the city. It went, because a lawful owner told it to, and said so.', end: 'failed' },
    taken: { journal: 'The city took Nine back and disposed of it, as scheduled.', end: 'failed' },
  },
};

// ---------------------------------------------------------------- 19 the road home (critical)

export const q_a3_return: QuestDef = {
  id: 'q_a3_return', title: 'Toll Road Home', act: 'a3', critical: true, start: 'west', xp: 250,
  // B6c: the rides by side are offered by post and taken from Lowe (or Reyes), Femi's window at Carrick, Openfield's
  // seed-keeper, and the player's own buggy at the Ring (dialogue/a3_road.ts); the Wheel find their own on the road.
  routes: [
    { id: 'line', kind: 'barter', label: 'Ride the Line east on a fare or a pass, and walk the toll road down from Four Ways' },
    { id: 'column', kind: 'talk', label: 'Ride east with the column in the wardens\' car', requires: RIDE_COLUMN },
    { id: 'first', kind: 'barter', label: 'Take the guild\'s first class on the Concern\'s through', requires: RIDE_FIRST },
    { id: 'carts', kind: 'talk', label: 'Walk east with Openfield\'s carts by the old south bed', requires: RIDE_CARTS },
    { id: 'wheel', kind: 'survival', label: 'Travel with the Wheel across the pan', requires: RIDE_WHEEL },
    { id: 'buggy', kind: 'tech', label: 'Drive home in your own buggy', requires: RIDE_BUGGY },
    { id: 'foot', kind: 'survival', label: 'Walk the toll road home' },
  ],
  stages: {
    west: {
      journal: 'The city\'s column is camped at Knock by the stand, waiting for me, and the hatch is shut. It is a long road east to the Sallow, and there is more than one way to travel it. Some people owe me; some would come to Knock if I wrote.',
      objectives: [
        { id: 'sallow', text: 'Get back to the Sallow', done: { any: [IN_SALLOW, AT_KNOCK] } },
        { id: 'muster', text: 'Write to the people who might stand with me at Knock', done: { any: ALLIES_AT_KNOCK.map(ALLY) }, optional: true },
        { id: 'knock', text: 'Go home to Knock', done: AT_KNOCK },
      ],
      next: [{ if: AT_KNOCK, stage: 'knock' }, { if: IN_SALLOW, stage: 'sallow' }],
    },
    sallow: {
      journal: 'I am back in the Sallow, under its white sky. Knock is a day\'s walk up the track from Shale.',
      objectives: [
        { id: 'muster', text: 'Write to the people who might stand with me at Knock', done: { any: ALLIES_AT_KNOCK.map(ALLY) }, optional: true },
        { id: 'knock', text: 'Go home to Knock', done: AT_KNOCK },
      ],
      next: [{ if: AT_KNOCK, stage: 'knock' }],
    },
    knock: { journal: 'I am home. Knock is dry and the wardens are polite, and the Cistern\'s door has not moved.', onEnter: [{ quest: 'q_a3_cistern', start: true }], end: 'done' },
  },
};

// ---------------------------------------------------------------- 19b the mast (side; Signal Hill; built in B6d: dialogue/a3_mast.ts)

const MAST = (v: string): Cond => F('a3_mast', v);
const KEPT_BY = (k: string): Cond => ({ all: [MAST('raised'), F('a3_mast_keeper', k)] });
export const q_a3_mast: QuestDef = {
  id: 'q_a3_mast', title: 'Every Dead Radio', act: 'a3', start: 'list', xp: 300,
  routes: [
    { id: 'x', kind: 'tech', label: 'Rebuild the relay\'s band for every receiver', requires: { skill: 'science', gte: 50 } },
    { id: 'c', kind: 'chrome', label: 'Talk to the grid through a neural port, or through Kes', requires: { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }, { inParty: 'npc_hs_01' }] } },
    { id: 'b', kind: 'barter', label: 'A pre-Scald board and the Hollow\'s price for the climb', requires: { all: [{ any: [{ item: 'j_controller' }, { item: 'j_tm_controller' }, { item: 'k_an_board' }] }, { item: 'tolls', count: 60 }] } },
    { id: 't', kind: 'talk', label: 'Persuade the Hollow to keep the mast as theirs', requires: { skill: 'speech', gte: 45 } },
    { id: 'v', kind: 'survival', label: 'Re-rig the aerial\'s top section from the gully', requires: { any: [{ skill: 'survival', gte: 45 }, { attr: 'reflex', gte: 7 }] } },
    { id: 'k', kind: 'knowledge', label: 'The band from Verity\'s letter', requires: F('bw_static', 'kept') },
  ],
  stages: {
    list: {
      journal: 'Every night the station on Signal Hill reads its list, and lately my line is at the top of it, with the city\'s new year for the steps. It reads to a room and a pump station and nobody else. Raised, its mast could reach every radio in the Reach.',
      objectives: [
        { id: 'power', text: 'Find out what powers the relay', done: { knows: 'mast_powered' }, optional: true },
        { id: 'band', text: 'Find out why the band is narrow', done: { knows: 'relay_log_read' }, optional: true },
        { id: 'top', text: 'Find the aerial\'s top section', done: F('a3_aerial_found'), optional: true },
        { id: 'price', text: 'Hear what the Hollow want for standing on a target', done: { knows: 'a3_hollow_price' }, optional: true, hidden: true },
        { id: 'speak', text: 'Make the mast able to speak to everyone', done: { any: [F('a3_mast_how'), MAST('raised')] }, optional: true },
        { id: 'keeper', text: 'Find someone to keep the hill', done: F('a3_mast_keeper'), optional: true },
        { id: 'raise', text: 'Raise the mast, or leave it as it is', done: F('a3_mast') },
      ],
      next: [
        { if: KEPT_BY('hollow'), stage: 'hollow' }, { if: KEPT_BY('wheel'), stage: 'wheel' }, { if: KEPT_BY('knock'), stage: 'knock' },
        { if: MAST('raised'), stage: 'raised' }, { if: MAST('narrow'), stage: 'narrow' },
      ],
    },
    hollow: { journal: 'Signal Hill\'s mast can speak to every radio in the Reach, and the Hollow keep it as theirs, the switch held down at its foot. It will say nothing wide until I send word.', end: 'done' },
    wheel: { journal: 'Signal Hill\'s mast can speak to every radio in the Reach, and the Wheel keep the hill for me, the switch held down. It will say nothing wide until I send word.', end: 'done' },
    knock: { journal: 'Signal Hill\'s mast can speak to every radio in the Reach, and it is Knock\'s: KNOCK chalked on the cabinet door, and the switch\'s handle with me. It will say nothing wide until I send word.', end: 'done' },
    raised: { journal: 'Signal Hill\'s mast stands at its full height again, and the relay can reach every receiver in the Reach.', end: 'done' },
    narrow: { journal: 'I left Signal Hill\'s mast as the city built it, speaking only to the places it chose.', end: 'done' },
  },
};

// ---------------------------------------------------------------- 19c the last ride (side; keystone 3, Shale)

// (built in B6e: dialogue/a3_shale.ts; the buyout comes due on Shale's road triggers or the first Act 3 word in the town)
const ADA = (v: string): Cond => F('ks_ada', v);
const GONE_TO = (v: string): Cond => ({ all: [F('ks_ada'), F('a3_shale', v)] });
export const q_a3_ride: QuestDef = {
  id: 'q_a3_ride', title: 'Sheriff\'s Last Ride', act: 'a3', start: 'notice', xp: 300,
  routes: [
    { id: 'stays', kind: 'talk', label: 'Talk Ada out of resigning', requires: { skill: 'speech', gte: 50 } },
    { id: 'paid', kind: 'barter', label: 'Pay the town\'s paper with the guild, or have it repriced on a living town (Odile, or Teo\'s figures)', requires: { any: [{ item: 'tolls', count: 300 }, { all: [{ item: 'tolls', count: 150 }, { any: [{ inParty: 'npc_nb_03' }, { all: [F('teo_freed'), { skill: 'barter', gte: 50 }] }] }] }] } },
    { id: 'void', kind: 'knowledge', label: 'Unwind the sheet the price rests on: already torn, or torn at Pike\'s counter', requires: { any: [F('odile_sheet', 'torn'), F('odile_sheet', 'player'), { all: [F('odile_sheet', 'kept'), { inParty: 'npc_nb_03' }] }, { all: [F('odile_sheet', 'nine'), { inParty: 'npc_md_nine' }] }] } },
    { id: 'page', kind: 'knowledge', label: 'Lay the Tollhouse page beside Pike\'s ledger, or have Ada walk it across', requires: { any: [{ item: 'k_ledger_page' }, F('ledger_shown_ada')] } },
    { id: 'safe', kind: 'stealth', label: 'Take the guild\'s copy of the contract out of Pike\'s strongbox at night', requires: { skill: 'security', gte: 50 } },
    { id: 'street', kind: 'fight', label: 'Put the guild\'s hands off Shale\'s street with the militia: counted off, or fought' },
    { id: 'signed', kind: 'talk', label: 'Let her sign' },
  ],
  stages: {
    notice: {
      journal: 'A notice on the sheriff\'s office door in Shale: SHALE — CONTRACT OF PROTECTION — ON THE SHERIFF\'S RESIGNATION. Two of Pike\'s guild hands stand at the door as witnesses, and Ada sits at her desk with the paper and the pen. She has not signed it. She has not said she won\'t. She says she was waiting to hear from me.',
      objectives: [
        { id: 'why', text: 'Ask Ada why she would sign', done: { knows: 'a3_buyout_why' }, optional: true },
        { id: 'terms', text: 'Find out what the paper costs Shale', done: { knows: 'a3_buyout_terms' }, optional: true },
        { id: 'sheet', text: 'Find out what the price rests on', done: { knows: 'a3_buyout_sheet' }, optional: true, hidden: true },
        { id: 'broker', text: 'Find out who brokered it', done: { knows: 'a3_mags_hand' }, optional: true, hidden: true },
        { id: 'ada', text: 'Decide what happens to Shale\'s sheriff', done: F('ks_ada') },
      ],
      next: [
        { if: ADA('stays'), stage: 'stays' }, { if: GONE_TO('dogs'), stage: 'dogs' }, { if: GONE_TO('abandoned'), stage: 'abandoned' },
        { if: ADA('resigns'), stage: 'resigned' }, { if: ADA('dead'), stage: 'dead' },
      ],
    },
    stays: { journal: 'Ada Vey is still Shale\'s sheriff. Pike\'s notice came down off her door, and the guild\'s hands went back to the post.', end: 'done' },
    resigned: { journal: 'Ada Vey rode a borrowed grey the forty yards to Pike\'s post and signed, because a sheriff rides out. Shale is under the guild\'s protection, and a guild hand sits at her desk.', end: 'done' },
    dogs: { journal: 'With Ada Vey gone, the Rust Dogs rode into Shale and took the sheriff\'s office. The water is the tithe now, twice a year, and the guild pays them to call it protection.', end: 'failed' },
    abandoned: { journal: 'With Ada Vey gone, Shale is going east a cart at a time, because a town with no sheriff and pumps on a clock is a town with a date on it.', end: 'failed' },
    dead: { journal: 'Ada Vey died in front of her own door when the guild\'s hands were put off Shale\'s street. Issa Lind wears the star, and Shale is nobody\'s but its own.', end: 'failed' },
  },
};

// ---------------------------------------------------------------- 20 the Cistern (critical: Knock, inside, the ring, the door)

const C9 = (v: string): Cond => F('a3_c9', v);
const C9_ENDS = [{ if: C9('sealed'), stage: 'sealed' }, { if: C9('opened'), stage: 'opened' }, { if: C9('relocated'), stage: 'relocated' }];
export const q_a3_cistern: QuestDef = {
  id: 'q_a3_cistern', title: 'Reserve 9 (The Mouth)', act: 'a3', critical: true, start: 'knock', xp: 800,
  routes: [
    { id: 'lowe', kind: 'talk', label: 'Stand the column down with its captain', requires: { skill: 'speech', gte: 60 } },
    { id: 'stay', kind: 'knowledge', label: 'The Court\'s stay on the order as evidence at the door', requires: { any: [F('ca_reserve', 'stayed'), F('ca_reserve', 'attendance')] } },
    { id: 'unfit', kind: 'medicine', label: 'Have the reserve certified unfit for relocation', requires: { any: [{ skill: 'speech', gte: 40 }, { origin: 'clinic_aide' }] } },
    { id: 'welded', kind: 'tech', label: 'Weld the great door from inside', requires: { skill: 'mechanics', gte: 40 } },
    { id: 'fought', kind: 'fight', label: 'Break the column at the apron' },
    { id: 'word', kind: 'talk', label: 'Give the designate\'s word at the door' },
    // B6j: the door's other settlings (20e)
    { id: 'open', kind: 'talk', label: 'The residents open their own door once the column has gone, as their ring voted' },
    { id: 'consent', kind: 'talk', label: 'The residents walk out to the city\'s car on their own vote' },
    { id: 'sold', kind: 'barter', label: 'Sign the guild\'s paper at the door', requires: { item: 'k_a3_intake' } },
    // B6h: the ways in (20c), the first of them recorded as a3_in_how
    { id: 'in_hatch', kind: 'talk', label: 'Ask MOTHER to hold the hatch\'s tray lift', requires: { any: [{ skill: 'speech', gte: 40 }, { skill: 'science', gte: 45 }] } },
    { id: 'in_shaft', kind: 'survival', label: 'Down the grate and along the pump run', requires: { any: [{ origin: 'pump_hand' }, { skill: 'mechanics', gte: 45 }, { skill: 'survival', gte: 40 }] } },
    { id: 'in_door', kind: 'tech', label: 'Open the great door from outside on its manual cycle', requires: { skill: 'mechanics', gte: 50 } },
    { id: 'in_tamsin', kind: 'knowledge', label: 'Tamsin\'s service phrase at the hatch', requires: { inParty: 'npc_c9_03' } },
    { id: 'in_bram', kind: 'talk', label: 'Bram lifts the grate from below, once his letter has come back', requires: { any: [{ item: 'k_hesper_reply' }, { item: 'k_hesper_reply_forged' }, { knows: 'bram_tell' }, { quest: 'q_a1_bram', status: 'done' }] } },
  ],
  stages: {
    knock: {
      journal: 'Knock is dry since the hatch shut. The city\'s column is camped on the toll road by the stand, and its captain will not move on the door until I attend it. Nobody in Knock has ever been inside.',
      objectives: [
        { id: 'maud', text: 'Go home to Maud, at the hatch', done: F('a3_maud_home'), optional: true },
        { id: 'lowe', text: 'Hear the column\'s captain out', done: F('a3_lowe_heard'), optional: true },
        { id: 'grille', text: 'Speak at the Grille', done: { knows: 'a3_mother_named' }, optional: true },
        { id: 'water', text: 'See that Knock has water while the hatch is shut', done: KNOCK_WATERED, optional: true },
        { id: 'in', text: 'Find a way into the Cistern', done: F('a3_inside') },
      ],
      next: [...C9_ENDS, { if: F('a3_in_how', 'door'), stage: 'door' }, { if: F('a3_inside'), stage: 'inside' }],
    },
    inside: {
      journal: 'I am inside the Cistern for the first time in my life, and its people are looking at a face from Knock for the first time in theirs.',
      objectives: [
        { id: 'mother', text: 'Speak with MOTHER at her panel', done: { any: [F('a3_mother_met'), F('a3_letter_read')] }, optional: true },
        { id: 'archive', text: 'Ask Ines about the Archive', done: F('a3_archive'), optional: true },
        { id: 'ring', text: 'Sit with the ring', done: F('a3_ring') },
      ],
      next: [...C9_ENDS, { if: F('a3_ring'), stage: 'door' }],
    },
    door: {
      journal: 'It comes down to the door: the column on the apron, Knock behind it, the residents behind the steel, and me between.',
      objectives: [{ id: 'door', text: 'Settle the door', done: F('a3_c9') }],
      next: C9_ENDS,
    },
    sealed: { journal: 'The Cistern\'s door stays shut, and the city\'s fourth order is not carried out.', end: 'done' },
    opened: { journal: 'The Cistern\'s door is open, and its people walked out of it by their own choice.', end: 'done' },
    relocated: { journal: 'The Cistern\'s people are gone from behind their door, and the door stands open on an empty hall.', end: 'done' },
  },
};

// ---------------------------------------------------------------- 20b the Unwritten at Knock (side)

const UW = (v: string): Cond => F('a3_unwritten', v);
export const q_a3_unwritten: QuestDef = {
  id: 'q_a3_unwritten', title: 'Burn the Count', act: 'a3', start: 'chalk', xp: 250,
  routes: [
    { id: 'with_you', kind: 'talk', label: 'Turn the Unwritten from the reserve to the core', requires: { skill: 'speech', gte: 50 } },
    { id: 'gone', kind: 'talk', label: 'Talk them into going home', requires: { skill: 'speech', gte: 40 } },
    { id: 'stopped', kind: 'stealth', label: 'Take the burning party\'s lamp at the apron at night', requires: { skill: 'stealth', gte: 45 } },
    { id: 'fought', kind: 'fight', label: 'Stop the burning party by force' },
  ],
  stages: {
    chalk: {
      journal: 'Chalk on the Cistern\'s apron in the mornings: an open eye struck through. The Unwritten are at Knock by night, at the dark west end of the apron, and they mean to burn what the Cistern keeps. They will not do it, they say, unless I am on the slope to see it.',
      objectives: [
        { id: 'aim', text: 'Hear what the Unwritten came to Knock to do', done: { knows: 'a3_uw_aim' }, optional: true },
        { id: 'turn', text: 'Find out what the grate in the rock is to the Cistern', done: { knows: 'a3_uw_turn' }, optional: true },
        { id: 'end', text: 'Decide what the Unwritten do at Knock', done: F('a3_unwritten') },
      ],
      next: [{ if: UW('with_you'), stage: 'with_you' }, { if: UW('gone'), stage: 'gone' }, { if: UW('stopped'), stage: 'stopped' }, { if: UW('burning'), stage: 'burning' }],
    },
    with_you: { journal: 'The Unwritten will not burn the Cistern\'s count. They are coming east with me, to the city.', end: 'done' },
    gone: { journal: 'The Unwritten went home from Knock without lighting anything.', end: 'done' },
    stopped: { journal: 'I stopped the Unwritten\'s burning party at the apron in the dark.', end: 'done' },
    burning: { journal: 'I let the Unwritten have their night at Knock.', end: 'failed' },
  },
};

// ---------------------------------------------------------------- 20f the platform (side; only after a relocation)

const AFTER = (v: string): Cond => F('a3_c9_after', v);
export const q_a3_platform: QuestDef = {
  id: 'q_a3_platform', title: 'Sixty at the Buffer', act: 'a3', start: 'buffer', xp: 300,
  routes: [
    { id: 'harbour', kind: 'talk', label: 'At the Harbour court: a person landed on the quay is a passenger', requires: { any: [F('dk_prec_passenger'), { skill: 'speech', gte: 45 }] } },
    { id: 'stand', kind: 'fight', label: 'Have the Stand black the wardens\' car', requires: ALLY('stand') },
    { id: 'cradle', kind: 'stealth', label: 'Take them over the dry river in the cradle at night', requires: { not: F('dk_cradle', 'cut') } },
  ],
  stages: {
    buffer: {
      journal: 'The wardens\' car with the Cistern\'s people in it has come to the Line\'s buffer at Carrick.',
      objectives: [{ id: 'quay', text: 'Get them off the car', done: F('a3_c9_after') }],
      next: [{ if: AFTER('walked'), stage: 'walked' }, { if: AFTER('held'), stage: 'held' }],
    },
    walked: { journal: 'The Cistern\'s people walked off the wardens\' car at Carrick, free in the city.', end: 'done' },
    held: { journal: 'The Cistern\'s people went from the buffer into the Precinct\'s keeping.', end: 'failed' },
  },
};

// ---------------------------------------------------------------- 21 the Spire (critical: the close, the steps, the vault)

const PNR = F('a3_pnr'), SASH = F('a3_sash'), END = F('a3_end');
export const q_a3_spire: QuestDef = {
  id: 'q_a3_spire', title: 'Public Steps Reopen', act: 'a3', critical: true, start: 'close', xp: 1000,
  routes: [
    { id: 'plan', kind: 'talk', label: 'Take the chair, or walk away from it' },
    { id: 'unwritten', kind: 'fight', label: 'Bring the vault down with what you carry' },
    { id: 'concern', kind: 'barter', label: 'Sign the city\'s core over on the Concern\'s paper' },
    { id: 'opensky', kind: 'tech', label: 'Read the record into every radio in the Reach' },
    { id: 'amendment', kind: 'knowledge', label: 'Amend the law from the chair, on your own rulings' },
  ],
  stages: {
    close: {
      journal: 'A card from the Ledger, in the post: THE DESIGNATE WILL ATTEND THE STEPS. Everyone who walked with me has come to the Spire\'s close.',
      objectives: [{ id: 'up', text: 'Climb the Spire\'s steps', done: PNR }],
      next: [{ if: END, stage: 'ended' }, { if: SASH, stage: 'vault' }, { if: PNR, stage: 'steps' }],
    },
    steps: {
      journal: 'The steps of the photograph, and a crowd on them, and a sash held out to me.',
      objectives: [{ id: 'sash', text: 'Answer the sash', done: SASH }],
      next: [{ if: END, stage: 'ended' }, { if: SASH, stage: 'vault' }],
    },
    vault: {
      journal: 'Under the Spire\'s foot, the Vault of Accounts, and the thing that keeps them.',
      objectives: [{ id: 'end', text: 'Decide', done: END }],
      next: [{ if: END, stage: 'ended' }],
    },
    ended: { journal: 'It is done, and the Reach will tell it as it stands.', end: 'done' },
  },
};

// ---------------------------------------------------------------- 21a what you hold (the tracker)

/** The notebook's "what you hold" page before the climb (the coordinator's default): allies, things carried, and how the
 * places think of the player. Each line appears once it is held (hidden until done); none names a way to finish. */
const ALLY_LINES: { id: Ally; text: string }[] = [
  { id: 'shale', text: 'Shale\'s militia will come' }, { id: 'dogs', text: 'The Rust Dogs will ride' }, { id: 'choir', text: 'The Choir will come' },
  { id: 'wheel', text: 'The Wheel will carry word' }, { id: 'shift', text: 'The Shift has sent powder' }, { id: 'stand', text: 'Carrick\'s dockers stand with you' },
  { id: 'boats', text: 'The shore\'s boats are yours to call' }, { id: 'barges', text: 'The Wet\'s barges are yours to call' }, { id: 'gangs', text: 'The chain\'s holders will keep their streets' },
  { id: 'saints', text: 'The Saints will read for you' }, { id: 'seventeen', text: 'An assessor of the Wet will read for you' },
];
const HELD_ITEMS: { id: string; text: string }[] = [
  { id: 'k_ar_refusals', text: 'The copy of the Cistern\'s replies' }, { id: 'k_ar_warrant', text: 'The designate\'s warrant' },
  { id: 'k_a3_first_letter', text: 'The letter MOTHER kept for you' }, { id: 'k_a3_transfer', text: 'The Concern\'s paper' },
  { id: 'k_a3_charge', text: 'A charge, made up and wired' }, { id: 'k_an_core', text: 'The core out of Kelso\'s rack' },
];
const PLACES: { id: string; text: string }[] = [
  { id: 'cistern9', text: 'Knock thinks well of you' }, { id: 'shale', text: 'Shale thinks well of you' },
  { id: 'openfield', text: 'Openfield thinks well of you' }, { id: 'meridian', text: 'Meridian thinks well of you' },
];
export const q_a3_hold: QuestDef = {
  id: 'q_a3_hold', title: 'What You Hold', act: 'a3', start: 'holding',
  stages: {
    holding: {
      journal: 'Before the steps: who came, what I carry, and what the places I have been think of me.',
      objectives: [
        ...ALLY_LINES.map((a) => ({ id: `ally_${a.id}`, text: a.text, done: ALLY(a.id), hidden: true, optional: true })),
        ...HELD_ITEMS.map((i) => ({ id: `item_${i.id}`, text: i.text, done: { item: i.id } as Cond, hidden: true, optional: true })),
        ...PLACES.map((p) => ({ id: `place_${p.id}`, text: p.text, done: { standing: { settlement: p.id, gte: 10 } } as Cond, hidden: true, optional: true })),
        { id: 'up', text: 'Climb the steps when you are ready', done: PNR },
      ],
      next: [{ if: PNR, stage: 'climbed' }],
    },
    climbed: { journal: 'I climbed the Spire\'s steps with what I held.', end: 'done' },
  },
};

export const A3_QUESTS: QuestDef[] = [q_a3_order, q_a3_recall, q_a3_return, q_a3_mast, q_a3_ride, q_a3_cistern, q_a3_unwritten, q_a3_platform, q_a3_spire, q_a3_hold];
