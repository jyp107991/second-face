import type { QuestDef, StageDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, B4b: Halcyon, the arcology on the rim above the Skirts. Beat 16 inside the gate (the stages of `q_a2_halcyon`
 * after its car and road, added to the quest in b4_skirts.ts), and the lines that live up the hill: the Contract, the
 * Leash, the Long-Lived, and four side quests (the Clinic floors, Kes's contract, the gardens' seed, a citizen's pass).
 * Every end is set by the player's hand; nothing resolves on a date. Story notes: story/STORY_PLAN_SECRET.md, Build notes —
 * B4 (B4b).
 */

const F = (flag: string, v: string): Cond => ({ flag, eq: v });
const OFFER = (v: string) => F('hc_offer', v);

/** Beat 16 continued: inside the gate, the Board's floor, the offer. `inside` replaces B4a's stub (same id: saves keep it). */
export const HALCYON_STAGES: Record<string, StageDef> = {
  inside: {
    journal: 'Inside Halcyon\'s gate: silence, gardens under glass, and nobody old who looks old. The lens read my face before anyone asked my name, and somewhere a voice said the word the city uses for me. The Board is on the top floor. It is pleased, apparently.',
    onEnter: [{ set: 'hc_inside' }, { learn: 'hc_inside_seen' }],
    objectives: [
      { id: 'up', text: 'Go up to the Board\'s floor', done: { any: [{ knows: 'hc_board_seen' }, { flag: 'hc_soto_met' }] } },
      { id: 'soto', text: 'Find out what the Board wants with the designate', done: { flag: 'hc_soto_met' } },
    ],
    next: [
      { if: OFFER('accepted'), stage: 'accepted' }, { if: OFFER('refused'), stage: 'refused' }, { if: OFFER('feigned'), stage: 'feigned' },
      { if: { flag: 'hc_soto_met' }, stage: 'offer' },
    ],
  },
  offer: {
    journal: 'Director Pilar Soto received me in an office with real wood on the walls. The Board wants to buy something from the designate, not take it; she says purchase is kinder than war. The Chair would like to say what in person, at the season\'s ball in the hall, whenever I am pleased to attend. The Board renews before the ball. It is the season.',
    objectives: [
      { id: 'chair', text: 'Hear the Chair out at the ball', done: { flag: 'hc_board_wants' } },
      { id: 'answer', text: 'Give the Board an answer', done: { flag: 'hc_offer' } },
    ],
    next: [{ if: OFFER('accepted'), stage: 'accepted' }, { if: OFFER('refused'), stage: 'refused' }, { if: OFFER('feigned'), stage: 'feigned' }],
  },
  accepted: {
    journal: 'I said yes to the Board. A seat at its table, held for me from the day I take the city\'s sash, and in return my signature, on that day, on a transfer the Ledger cannot void. The Chair thanked me twice. Nobody had to decide anything today, he said; I had decided anyway.',
    onEnter: [{ set: 'a2_halcyon_done' }],
    end: 'done',
  },
  refused: {
    journal: 'I told the Board no. The Chair said that they would wait, and that they are very good at it. Soto watched me go to the lift with the face of someone revising a price. The Concern does not forget an answer.',
    onEnter: [{ set: 'a2_halcyon_done' }],
    end: 'done',
  },
  feigned: {
    journal: 'I told the Board yes and meant no, and the Chair believed me, or his courtesy did. A seat in waiting, a letter, a hand that has not changed in a very long time. Somebody on this hill is going to find out what my yes was worth.',
    onEnter: [{ set: 'a2_halcyon_done' }],
    end: 'done',
  },
};

// ---------------------------------------------------------------- the Contract

const CONTRACT = (v: string) => F('hc_contract', v);

export const q_hc_contract: QuestDef = {
  id: 'q_hc_contract', title: 'Terms on Request', act: 'a2', start: 'terms', xp: 200,
  routes: [
    { id: 'term', kind: 'barter', label: 'Sign for a season\'s term at the Contract Office, to be served when the Concern calls it' },
    { id: 'confess', kind: 'talk', label: 'Pay Agnes Bell her one price: something true', requires: { skill: 'speech', gte: 40 } },
    { id: 'kes', kind: 'tech', label: 'Kes writes a citizen into the Window from its own exchange' },
    { id: 'jack', kind: 'tech', label: 'Your own grid chrome, at the Window\'s exchange or the registry on the hill', requires: { skill: 'science', gte: 55 } },
    { id: 'guest', kind: 'talk', label: 'The Board\'s guest, on the invitation: paper that is not a contract' },
  ],
  stages: {
    terms: {
      journal: 'CONTRACTS — TERMS ON REQUEST. Halcyon admits contracts and the Board\'s guests. A citizen\'s contract is earned at Agnes Bell\'s counter in Footgate, for a season\'s term or for her one price; the Window can be made to print one; or I can go up on the Board\'s card, as its guest, and be watched.',
      objectives: [
        { id: 'paper', text: 'Paper for the hill: a contract, a forgery, or the Board\'s word', done: { flag: 'hc_contract' } },
        { id: 'fit', text: 'A citizen carries the Concern\'s work: the fitting at the gate', done: { member: 'concern', rank: 'contract' }, optional: true, hidden: true },
      ],
      next: [{ if: CONTRACT('citizen'), stage: 'citizen' }, { if: CONTRACT('infiltrator'), stage: 'infiltrator' }, { if: CONTRACT('guest'), stage: 'guest' }],
    },
    citizen: {
      journal: 'A citizen\'s contract, as written: forty pages with my face on the first. The Concern keeps its word to the letter, Bell says; so do its citizens, or they are reviewed. A contract citizen carries the Concern\'s work in the body, fitted at the gate. Until then I am probationary.',
      end: 'done',
    },
    infiltrator: {
      journal: 'The Window printed me a citizen\'s contract for a citizen who does not exist, and every lens on the hill believes it. A forgery is only as good as the day nobody checks it.',
      end: 'done',
    },
    guest: {
      journal: 'The Board\'s guest: a white card with GUEST under my face. It is not a contract. It is an invitation, and an invitation can be withdrawn.',
      end: 'done',
    },
  },
};

// ---------------------------------------------------------------- the Leash

const LEASH = (v: string) => F('hc_leash', v);

export const q_hc_leash: QuestDef = {
  id: 'q_hc_leash', title: 'Who Holds the Leash', act: 'a2', start: 'door', xp: 400,
  routes: [
    { id: 'kes', kind: 'tech', label: 'Kes rides the channel from the core and burns it, if her own port does not take her with it' },
    { id: 'console', kind: 'tech', label: 'Burn the channel at the core\'s console yourself', requires: { skill: 'science', gte: 60 } },
    { id: 'keeper', kind: 'talk', label: 'Ask the keeper to burn it himself, and hold him while he does', requires: { skill: 'speech', gte: 50 } },
    { id: 'blow', kind: 'fight', label: 'Blow the trunk', requires: { skill: 'explosives', gte: 50 } },
    { id: 'seize', kind: 'tech', label: 'Cut the keeper\'s key out of his chair and hold the leash yourself' },
    { id: 'sell', kind: 'barter', label: 'Sell the key: to Soto, to the Chair, or to the guild' },
  ],
  stages: {
    door: {
      journal: 'There is a door in every piece of the Concern\'s chrome, a channel that runs up the hill: through it Halcyon can see whoever wears its work, numb them, stop them. Kes found the door in her own neck. Its source is somewhere in the works under the gardens, in the grid core.',
      objectives: [
        { id: 'core', text: 'Find the source of the channel in the works', done: { knows: 'hc_core_seen' } },
        { id: 'keeper', text: 'Who keeps it', done: { knows: 'hc_lawal_told' } },
      ],
      next: [
        { if: LEASH('cut'), stage: 'cut' }, { if: LEASH('sold'), stage: 'sold' }, { if: LEASH('seized'), stage: 'seized' }, { if: LEASH('left'), stage: 'left' },
        { if: { knows: 'hc_lawal_told' }, stage: 'keeper' },
      ],
    },
    keeper: {
      journal: 'The leash is a man in a chair. Femi Lawal has sat in the grid core for forty-one years with the channel run through the lattice in his spine, because after the Scald the Concern would not trust its leash to a machine. Every Concern piece in the Reach is a voice in his head. It can be burned out at the trunk, or cut out of his chair and held.',
      objectives: [{ id: 'decide', text: 'Decide what becomes of the leash', done: { flag: 'hc_leash' } }],
      next: [{ if: LEASH('cut'), stage: 'cut' }, { if: LEASH('sold'), stage: 'sold' }, { if: LEASH('seized'), stage: 'seized' }, { if: LEASH('left'), stage: 'left' }],
    },
    cut: {
      journal: 'The channel is burned. Across the Reach, every piece of the Concern\'s chrome lost its voice at once, and the people wearing it fell where they stood and got up again, most of them. Halcyon cannot see its own any more, or stop them.',
      end: 'done',
    },
    seized: {
      journal: 'The keeper\'s key is in my pocket, warm. Every Concern piece in the Reach answers to whoever holds it, and that is me. Kes says nothing about it, which with Kes is loud.',
      objectives: [{ id: 'hold', text: 'Hold it, or hand it on', done: { any: [LEASH('sold'), LEASH('cut')] }, optional: true }],
      next: [{ if: LEASH('sold'), stage: 'sold' }, { if: LEASH('cut'), stage: 'cut' }],
    },
    sold: {
      journal: 'I sold the leash. Every Concern piece in the Reach answers to the hand I sold it to.',
      end: 'failed',
    },
    left: {
      journal: 'I left the leash where it was: in a man\'s spine in the grid core, in the Concern\'s hand. Somebody else can decide. Nobody has to decide anything today.',
      end: 'done',
    },
  },
};

// ---------------------------------------------------------------- the Long-Lived

const LL = (v: string) => F('hc_longlived', v);

export const q_hc_longlived: QuestDef = {
  id: 'q_hc_longlived', title: 'Nobody Old', act: 'a2', start: 'look', xp: 400,
  routes: [
    { id: 'portraits', kind: 'knowledge', label: 'The photographs on the Board\'s floor, and whose faces are in them' },
    { id: 'drift', kind: 'medicine', label: 'Watch the Chair closely: what is left behind the courtesy', requires: { any: [{ skill: 'medicine', gte: 45 }, { attr: 'senses', gte: 6 }] } },
    { id: 'minutes', kind: 'knowledge', label: 'The Board\'s minutes on the boardroom table' },
    { id: 'lineage', kind: 'tech', label: 'Kes answers the house in its own old tongue' },
    { id: 'toast', kind: 'talk', label: 'Say it to the hall at the toast', requires: { skill: 'speech', gte: 50 } },
    { id: 'soto', kind: 'talk', label: 'Give Soto the Chair' },
    { id: 'reserve', kind: 'tech', label: 'The console in the Chair\'s room', requires: { skill: 'science', gte: 60 } },
  ],
  stages: {
    look: {
      journal: 'Nobody up here who is old looks old. The hall on the Board\'s floor holds a ball every season, after the Board renews; the citizens say "one renews or one is reviewed" the way the Skirts says "geological". What is the Board renewed with, and how old are they?',
      objectives: [
        { id: 'ages', text: 'How old the Board is', done: { knows: 'hc_ages' } },
        { id: 'chair', text: 'What is left of the Chair', done: { knows: 'hc_chair_drift' } },
        { id: 'with', text: 'What they renew with', done: { any: [{ knows: 'hc_cold_seen' }, { knows: 'hc_recipients' }] }, optional: true },
        { id: 'reserve', text: 'The console in the Chair\'s room', done: { knows: 'hc_reserve_known' }, optional: true, hidden: true },
      ],
      next: [
        { if: LL('exposed'), stage: 'exposed' }, { if: LL('soto'), stage: 'soto' }, { if: LL('kept'), stage: 'kept' },
        { if: { all: [{ knows: 'hc_ages' }, { knows: 'hc_chair_drift' }] }, stage: 'known' },
      ],
    },
    known: {
      journal: 'The Board of the Concern is the Board of the Halverson Concern, the same twelve faces as in a photograph of a winter meeting before the Burn, kept the age they like on the Clinic floors with what comes up on the freight at two. The Chair is the oldest of them, and his courtesy is most of what is left: under it there is the house, talking. And in his room a console wakes something asleep in the Ashlands.',
      objectives: [
        { id: 'decide', text: 'Decide what to do with what you know about the Board', done: { flag: 'hc_longlived' } },
        { id: 'reserve', text: 'What sleeps in the Ashlands', done: { flag: 'hc_reserve' }, optional: true },
      ],
      next: [{ if: LL('exposed'), stage: 'exposed' }, { if: LL('soto'), stage: 'soto' }, { if: LL('kept'), stage: 'kept' }],
    },
    exposed: {
      journal: 'I said it to the hall at the toast: the photograph, the labels in the cold store, the numbers off the Weighhouse\'s board. The citizens heard their Board\'s age and what it is paid for in. Halcyon is open now, in the way a wound is open.',
      end: 'done',
    },
    soto: {
      journal: 'I gave Pilar Soto the Chair, and the Board retired him to the gardens, to a bench beside the orange tree. Soto chairs now. She would rather buy the future than take it. She still wants it.',
      end: 'done',
    },
    kept: {
      journal: 'I kept what I know about the Board, and the Board knows I keep it. That is a kind of seat at the table too.',
      end: 'done',
    },
  },
};

// ---------------------------------------------------------------- Clinic Floor Nine

const CLINIC = (v: string) => F('hc_clinic', v);

export const q_hc_clinic: QuestDef = {
  id: 'q_hc_clinic', title: 'Clinic Floor Nine', act: 'a2', start: 'nine', xp: 350,
  routes: [
    { id: 'charts', kind: 'knowledge', label: 'The recovery ward\'s charts: who the parts go to' },
    { id: 'files', kind: 'stealth', label: 'Dr Qadir\'s own list', requires: { skill: 'security', gte: 45 } },
    { id: 'qadir', kind: 'talk', label: 'Persuade Dr Qadir to close the service ward herself', requires: { skill: 'speech', gte: 55 } },
    { id: 'wake', kind: 'medicine', label: 'Wake the sleepers and take them down by the freight or the tunnel', requires: { skill: 'medicine', gte: 45 } },
    { id: 'orderly', kind: 'talk', label: 'Abena Asiedu, who carries the holdfast and was born at Two-Twelve' },
    { id: 'leave', kind: 'barter', label: 'Leave it, and take what Dr Qadir offers the designate' },
  ],
  stages: {
    nine: {
      journal: 'Floor nine of the Clinic floors: recovery, fittings, a cold store, and a door marked SERVICE. Dawit Mekonnen\'s boots came down from here with a tag in the tongue. Whatever service is, it is behind that door.',
      objectives: [
        { id: 'recipients', text: 'Who the parts go to', done: { knows: 'hc_recipients' } },
        { id: 'cold', text: 'The cold store', done: { knows: 'hc_cold_seen' }, optional: true },
        { id: 'ward', text: 'Behind the service door', done: { knows: 'hc_ward_seen' } },
        { id: 'dawit', text: '9-1182', done: { knows: 'hc_dawit_found' }, optional: true, hidden: true },
      ],
      next: [
        { if: CLINIC('freed'), stage: 'freed' }, { if: CLINIC('closed'), stage: 'closed' }, { if: CLINIC('left'), stage: 'left' },
        { if: { all: [{ knows: 'hc_ward_seen' }, { knows: 'hc_qadir_case' }] }, stage: 'service' },
      ],
    },
    service: {
      journal: 'Service is a long sleep. The debtors the Weighhouse sends up are kept alive on floor nine and drawn on as the Board needs them, a kidney this season, an eye the next, so that one body lasts. "A body is a bank," Dr Qadir says, "and we draw on it slowly." She believes the Board are the only people left who know how the world worked, and that keeping them is keeping it.',
      objectives: [
        { id: 'decide', text: 'Decide what becomes of the service ward', done: { flag: 'hc_clinic' } },
        { id: 'woken', text: 'Wake them', done: { flag: 'hc_sleepers_woken' }, optional: true },
      ],
      next: [{ if: CLINIC('freed'), stage: 'freed' }, { if: CLINIC('closed'), stage: 'closed' }, { if: CLINIC('left'), stage: 'left' }],
    },
    freed: {
      journal: 'The service ward is empty. They went down the hill awake, the ones who could walk carrying the ones who could not, and the Clinic floors are short this season. Dr Qadir has not forgiven me, and has not tried to stop me either.',
      end: 'done',
    },
    closed: {
      journal: 'Dr Qadir closed the service ward with her own signature and sent its sleepers down the hill awake. The cold store keeps what it has; from now on, she says, the floors take from the dead and the willing. The Board will be short this season. She will answer for it.',
      end: 'done',
    },
    left: {
      journal: 'I left floor nine as it was. The sleepers are still asleep, the machines still breathe for them, and the boots still come down. Dr Qadir thanked me for understanding, which I did not.',
      end: 'failed',
    },
  },
};

// ---------------------------------------------------------------- A Contract for Kes

const KESC = (v: string) => F('hc_kes_contract', v);

export const q_hc_kes: QuestDef = {
  id: 'q_hc_kes', title: 'A Contract for Kes', act: 'a2', start: 'offer', xp: 300,
  routes: [
    { id: 'read', kind: 'barter', label: 'Read the contract to page thirty', requires: { skill: 'barter', gte: 45 } },
    { id: 'keeper', kind: 'knowledge', label: 'Meet the man who signed the same contract forty-one years ago' },
    { id: 'refuse', kind: 'talk', label: 'Stand with her when she tears it up' },
    { id: 'turn', kind: 'talk', label: 'Sign it, and use the keeper\'s door to reach the core', requires: { skill: 'speech', gte: 45 } },
  ],
  stages: {
    offer: {
      journal: 'The Concern has made Kes an offer on its best paper: tenure, a flat on the terraces, her two years void, and a citizen\'s contract for anyone she names. In return, the door she found in her own neck, kept for the Concern. "Obviously I\'m not going to," she said. "Tell me I\'m not going to."',
      objectives: [
        { id: 'clause', text: 'What the contract really asks', done: { knows: 'hc_kes_clause' } },
        { id: 'keeper', text: 'Whoever holds the job now', done: { knows: 'hc_lawal_told' }, optional: true },
        { id: 'answer', text: 'Kes decides', done: { flag: 'hc_kes_contract' } },
      ],
      next: [{ if: KESC('refused'), stage: 'refused' }, { if: KESC('turned'), stage: 'turned' }, { if: KESC('urged'), stage: 'urged' }],
    },
    refused: {
      journal: 'Kes tore the Concern\'s contract into strips, slowly, on the Board\'s own carpet, and put the strips in her jacket "for the stove". Then she laughed until she had to sit down. "Obviously," she said. "Obviously."',
      end: 'done',
    },
    turned: {
      journal: 'Kes signed the Concern\'s contract with a hand that did not shake, and the keeper\'s door to the grid core opens for her now. The Concern thinks it bought her. She thinks she bought the door. One of them is wrong.',
      end: 'done',
    },
    urged: {
      journal: 'I told Kes to take the Concern\'s contract. She looked at me for a long moment, and then she put the contract down on the carpet, unsigned, and walked to the lift. She did not look back. I had handed her leash to them with my own mouth.',
      end: 'failed',
    },
  },
};

// ---------------------------------------------------------------- Seed under Glass (the gardens)

const GARDEN = (v: string) => F('hc_garden', v);

export const q_hc_garden: QuestDef = {
  id: 'q_hc_garden', title: 'Seed under Glass', act: 'a2', start: 'keeper', xp: 300,
  routes: [
    { id: 'vault', kind: 'stealth', label: 'Open the seed vault', requires: { skill: 'security', gte: 50 } },
    { id: 'read', kind: 'tech', label: 'Read the vault\'s packets for what they are', requires: { any: [{ skill: 'science', gte: 40 }, { skill: 'survival', gte: 40 }] } },
    { id: 'keeper', kind: 'talk', label: 'Earn the keeper\'s trust and his jars' },
    { id: 'guest', kind: 'talk', label: 'Carry it down as the Board\'s guest: nobody searches the Board\'s guest' },
    { id: 'freight', kind: 'barter', label: 'Down the freight at two with the brakeman' },
    { id: 'tunnel', kind: 'stealth', label: 'Down the tunnel at dawn among the gardeners', requires: { skill: 'stealth', gte: 40 } },
  ],
  stages: {
    keeper: {
      journal: 'Halcyon\'s gardens grow fruit the gardeners from the Skirts have never tasted; they are searched at the tunnel every evening, boots and mouths. The keeper, Yaw Boateng, was born on Nursery. There is a seed vault behind his lodge, and one orange tree in a pot.',
      objectives: [
        { id: 'vault', text: 'What is in the seed vault', done: { knows: 'hc_seed_f1' } },
        { id: 'jars', text: 'What the keeper keeps for himself', done: { knows: 'hc_jars' }, optional: true },
        { id: 'down', text: 'Get the seed down the hill, or don\'t', done: { flag: 'hc_garden' } },
      ],
      next: [
        { if: GARDEN('skirts'), stage: 'skirts' }, { if: GARDEN('openfield'), stage: 'openfield' }, { if: GARDEN('sold'), stage: 'sold' }, { if: GARDEN('caught'), stage: 'caught' },
        { if: { all: [{ knows: 'hc_seed_f1' }, { knows: 'hc_jars' }] }, stage: 'jars' },
      ],
    },
    jars: {
      journal: 'The vault\'s seed is the Concern\'s own lines, F1, the kind that grows once and never comes true again: buy it every year from whoever owns it. The guild\'s night crates from Openfield are in there too. The real seed is under the bench by the orange tree, in Yaw Boateng\'s jam jars: lines saved by hand since before the Burn.',
      objectives: [{ id: 'down', text: 'Get the seed down the hill, or don\'t', done: { flag: 'hc_garden' } }],
      next: [{ if: GARDEN('skirts'), stage: 'skirts' }, { if: GARDEN('openfield'), stage: 'openfield' }, { if: GARDEN('sold'), stage: 'sold' }, { if: GARDEN('caught'), stage: 'caught' }],
    },
    skirts: { journal: 'The jars went down to Nursery, and a net of oranges with them. The Skirts planted the old lines in the gaps between the shacks and the graves, and the children ate the oranges peel and all. Yaw sweeps his leaves and says nothing at all, smiling.', end: 'done' },
    openfield: { journal: 'The jars and Openfield\'s own crates went down the Line to the Choir\'s fields in the glass, care of whoever keeps the seed store there. The guild paid for that seed by night. Openfield will plant it by day.', end: 'done' },
    sold: { journal: 'I sold Yaw Boateng\'s jars to the guild\'s factor on the hill. The guild buys anything that grows. Yaw looked at the bench where they had been for a long time, and went back to his leaves.', end: 'failed' },
    caught: { journal: 'The Clean found the seed at the tunnel. Yaw Boateng is under review, which on this hill is a word with a floor number. The jars are in the vault now, with everything else the Concern owns.', end: 'failed' },
  },
};

// ---------------------------------------------------------------- Funicular Pass

const PASS = (v: string) => F('hc_funicular', v);

export const q_hc_funicular: QuestDef = {
  id: 'q_hc_funicular', title: 'Funicular Pass', act: 'a2', start: 'girl', xp: 250,
  routes: [
    { id: 'crew', kind: 'talk', label: 'The car\'s crew carry her under the steward\'s stop, if the Shift won it' },
    { id: 'forge', kind: 'tech', label: 'Kes prints a pass down at the registry' },
    { id: 'soto', kind: 'talk', label: 'Soto signs a pass, if asked the right way', requires: { skill: 'speech', gte: 50 } },
    { id: 'freight', kind: 'barter', label: 'The freight at two, and the brakeman paid' },
    { id: 'road', kind: 'stealth', label: 'The road down past the Clean at night', requires: { skill: 'stealth', gte: 45 } },
    { id: 'report', kind: 'barter', label: 'Tell the registry a citizen wants to go down' },
  ],
  stages: {
    girl: {
      journal: 'Linh Tran is nineteen and was born on the terraces, and every day she stands inside the arch and counts the car: it comes up full and goes down empty. Her mother was a gardener from Nursery, who went into service when Linh was six. Citizens may not ride down the hill without a pass, and her pass was refused.',
      objectives: [
        { id: 'why', text: 'Why her pass was refused', done: { knows: 'hc_linh_reserve' } },
        { id: 'down', text: 'Get her down the hill, or don\'t', done: { flag: 'hc_funicular' } },
      ],
      next: [
        { if: PASS('down'), stage: 'down' }, { if: PASS('stayed'), stage: 'stayed' }, { if: PASS('reported'), stage: 'reported' },
        { if: { knows: 'hc_linh_reserve' }, stage: 'reserve' },
      ],
    },
    reserve: {
      journal: 'Linh\'s pass was stamped RESERVE — NOT FOR TRANSFER. Citizen-born children are typed at birth; the ones who match a member of the Board are kept on the terraces, fed, schooled, and never let down the hill, in case. Linh matches Constance Wray. Her mother tried to take her down when she was six.',
      objectives: [{ id: 'down', text: 'Get her down the hill, or don\'t', done: { flag: 'hc_funicular' } }],
      next: [{ if: PASS('down'), stage: 'down' }, { if: PASS('stayed'), stage: 'stayed' }, { if: PASS('reported'), stage: 'reported' }],
    },
    down: { journal: 'Linh Tran rode down the hill. She stood on Cascade with her clean shoes in the coal dust and laughed at a goat. The Skirts does not know what to make of her, and she does not care.', end: 'done' },
    stayed: { journal: 'Linh heard what RESERVE means and chose to stay on the terraces, by the orange tree, where she can watch them watch her. "If I go, they find another match," she said. "Down there. Somebody\'s child." I could not argue with the sum.', end: 'done' },
    reported: { journal: 'I told the registry a citizen wanted to go down the hill. They thanked me and paid me, and Linh Tran was taken to floor nine for review. Her place inside the arch is empty.', end: 'failed' },
  },
};

export const HALCYON_QUESTS: QuestDef[] = [q_hc_contract, q_hc_leash, q_hc_longlived, q_hc_clinic, q_hc_kes, q_hc_garden, q_hc_funicular];
