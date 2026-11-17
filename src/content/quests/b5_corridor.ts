import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, B5a: the Rail Corridor. The rail bandits' line (Kettle Cut) and the stationmaster's sentence that can follow it
 * (Murder Hangs), the twelve in West Halt's tower (Stock Car), Yard Nine's dead engine, and East Halt's east length. Every
 * end is the player's choice; the three that follow a choice by a night or a dawn wait for the player to be there. Story
 * notes: story/STORY_PLAN_SECRET.md, Build notes — B5.
 */

const B = (v: string): Cond => ({ flag: 'rc_bandits', eq: v });
const S = (v: string): Cond => ({ flag: 'rc_stock', eq: v });
const E = (v: string): Cond => ({ flag: 'rc_engine', eq: v });
const X = (v: string): Cond => ({ flag: 'rc_east', eq: v });
const AB = (v: string): Cond => ({ flag: 'rc_abe', eq: v });

const OUTCOMES = [
  { if: B('ambush'), stage: 'ambush' }, { if: B('exposed'), stage: 'exposed' }, { if: B('pilot'), stage: 'pilot' },
  { if: B('deal'), stage: 'deal' }, { if: B('paid'), stage: 'paid' },
];

export const q_rc_kettle: QuestDef = {
  id: 'q_rc_kettle', title: 'Kettle Cut', act: 'a2', start: 'reward', xp: 250,
  routes: [
    { id: 'ambush', kind: 'fight', label: 'Take the guild\'s bounty and lie in wait at Kettle on a night the band rides' },
    { id: 'exposed', kind: 'knowledge', label: 'Prove to the guild\'s factor whose watch it is: the register, the tag, the stationmaster\'s wires' },
    { id: 'pilot', kind: 'tech', label: 'Let Four Ways\' token instrument fail, so every train must stop at the halts for a pilot', requires: { skill: 'science', gte: 50 } },
    { id: 'deal', kind: 'talk', label: 'Put the factor and the stationmaster at one table: pay the halts and Kettle goes quiet', requires: { skill: 'speech', gte: 55 } },
    { id: 'paid', kind: 'barter', label: 'Take the stationmaster\'s price for silence' },
  ],
  stages: {
    reward: {
      journal: 'The guild\'s factor at Four Ways pays two hundred Tolls and a pass on every section for the band that stops freight at Kettle Cut, a cutting on the Line between Yard Nine and West Halt. They lay a sleeper on the rails, open one sealed car, and are gone. A guild guard, Hamish Gorse, was killed there a fortnight ago.',
      objectives: [
        { id: 'kettle', text: 'See Kettle Cut', done: { knows: 'rc_kettle_seen' } },
        { id: 'who', text: 'Find out who the band is', done: { knows: 'rc_watch_known' } },
        { id: 'why', text: 'Find out why they only ever open the Concern\'s cars', done: { knows: 'rc_why_known' }, optional: true },
      ],
      next: [...OUTCOMES, { if: { knows: 'rc_watch_known' }, stage: 'watch' }],
    },
    watch: {
      journal: 'The band at Kettle is West Halt\'s own watch, riding a handcar along the Line at night, and someone at Four Ways lets them onto the section. Chela Ortega captains it. Four Ways has four rules, and one of them is a rope.',
      objectives: [
        { id: 'brodsky', text: 'Hear what the stationmaster has to say for himself', done: { knows: 'rc_brodsky_told' }, optional: true },
        { id: 'end', text: 'Decide what happens to the band at Kettle', done: { flag: 'rc_bandits' } },
      ],
      next: OUTCOMES,
    },
    ambush: { journal: 'West Halt\'s watch is broken: shot down on the Line by my hand. The guild owes me its bounty. The halts will have nothing now but the length they keep for nobody.', end: 'done' },
    exposed: { journal: 'I proved to Severin Kask whose watch it was. He paid me and sent his riders west. The guild needs the stationmaster\'s signals, so it will not have heard his name; it will hang whoever shot Gorse.', end: 'done' },
    pilot: { journal: 'Four Ways\' token instrument failed in the night, and Rule 183 says every section is worked by pilot: every train stops at both halts for a pilotman from that halt, and the guild pays him. The hold-ups stopped. Nobody was hanged for them.', end: 'done' },
    deal: { journal: 'Kask signed a sheet at his desk: length money per train passing, request stops at both halts, the through to stop when flagged. The stationmaster stood his watch down. The guild was never told whose watch it was.', end: 'done' },
    paid: { journal: 'I took the stationmaster\'s hundred and twenty and a pass. The hold-ups go on; the guild has put a levy on every fare on the Line to cover what Kettle costs it.', end: 'done' },
  },
};

export const q_rc_abe: QuestDef = {
  id: 'q_rc_abe', title: 'Murder Hangs', act: 'a2', start: 'sentence', xp: 150,
  routes: [
    { id: 'argue', kind: 'talk', label: 'Argue before the stationmaster that the guard fired first', requires: { skill: 'speech', gte: 45 } },
    { id: 'cases', kind: 'knowledge', label: 'The guard\'s five spent cases and the boy\'s one, on the stationmaster\'s desk' },
    { id: 'cell', kind: 'stealth', label: 'Pick the watch house cell\'s lock at night', requires: { skill: 'security', gte: 45 } },
    { id: 'guild', kind: 'barter', label: 'Give the boy to the guild for its hundred' },
  ],
  stages: {
    sentence: {
      journal: 'Brodsky has sentenced Abe Mutasa of West Halt to hang at dawn at the end of Four Ways\' platform, for Hamish Gorse. Murder: the rope. The boy says the guard fired first, five times, into a stock car full of people.',
      objectives: [
        { id: 'cases', text: 'Find out who fired first at Kettle', done: { any: [{ item: 'k_rc_casings' }, { knows: 'rc_ferris_saw' }] }, optional: true },
        { id: 'end', text: 'Abe Mutasa', done: { flag: 'rc_abe' } },
      ],
      next: [{ if: AB('exiled'), stage: 'exiled' }, { if: AB('fled'), stage: 'fled' }, { if: AB('guild'), stage: 'guild' }, { if: AB('hanged'), stage: 'hanged' }],
    },
    exiled: { journal: 'Brodsky put Abe Mutasa off the Line instead of hanging him, and wrote a new line under his third rule: UNLESS FIRED UPON FIRST — PUT OFF. Abe went south to Openfield in what he stood in.', end: 'done' },
    fled: { journal: 'I took Abe Mutasa out of Four Ways\' cell in the night and walked him down the old south branch. He went on alone toward Openfield. Brodsky knows whose hand it was.', end: 'done' },
    guild: { journal: 'I gave Abe Mutasa to the guild for a hundred Tolls, and the guild hanged him at Kettle for Hamish Gorse.', end: 'done' },
    hanged: { journal: 'Abe Mutasa was hanged at dawn at the end of Four Ways\' platform, under the clock, by the stationmaster\'s fourth rule. The timetable regrets it.', end: 'failed' },
  },
};

export const q_rc_stock: QuestDef = {
  id: 'q_rc_stock', title: 'Stock Car', act: 'a2', start: 'tower', xp: 250,
  routes: [
    { id: 'openfield', kind: 'survival', label: 'Walk the twelve south to Openfield by the old track at night', requires: { skill: 'survival', gte: 35 } },
    { id: 'bought', kind: 'barter', label: 'Buy out their paper at the Concern\'s desk at Yard Nine' },
    { id: 'forged', kind: 'tech', label: 'Forge their discharges', requires: { skill: 'science', gte: 45 } },
    { id: 'keeper', kind: 'talk', label: 'The keeper\'s key, or the pilotman\'s bread, to get up the tower', requires: { skill: 'speech', gte: 40 } },
    { id: 'climb', kind: 'stealth', label: 'Climb the tower\'s overflow pipe in the dark', requires: { skill: 'stealth', gte: 40 } },
  ],
  stages: {
    tower: {
      journal: 'West Halt\'s water tower has its ladder drawn up and a new padlock on its hatch, and somebody inside it coughs. The keeper says the tank leaks.',
      objectives: [
        { id: 'inside', text: 'Get up the tower', done: { knows: 'rc_tower_inside' } },
        { id: 'why', text: 'Find out what intake means', done: { knows: 'rc_stock_why' }, optional: true },
      ],
      next: [{ if: S('openfield'), stage: 'openfield' }, { if: S('bought'), stage: 'bought' }, { if: S('forged'), stage: 'forged' }, { if: S('sold'), stage: 'sold' }, { if: { knows: 'rc_tower_inside' }, stage: 'twelve' }],
    },
    twelve: {
      journal: 'Twelve people live in the drum of West Halt\'s water tower, bought at the Ninebridge block on Concern paper stamped INTAKE — WEIGHHOUSE — TWO-TWELVE. Chela Ortega opened their car at Kettle; her brother Joaquin is one of them. The Concern\'s man at Yard Nine pays fifteen a head to anyone who knows where they are.',
      objectives: [{ id: 'end', text: 'Decide what becomes of the twelve', done: { flag: 'rc_stock' } }],
      next: [{ if: S('openfield'), stage: 'openfield' }, { if: S('bought'), stage: 'bought' }, { if: S('forged'), stage: 'forged' }, { if: S('sold'), stage: 'sold' }],
    },
    openfield: { journal: 'I walked the twelve south to Openfield by night, and a woman at the Choir\'s gate looked at twelve faces with no papers and opened it. Joaquin Ortega turned back at the last fence to keep West Halt\'s length.', end: 'done' },
    bought: { journal: 'I bought the twelve\'s paper off the Concern at Yard Nine. They owe nobody anything now. Four of them stayed at West Halt to keep the length.', end: 'done' },
    forged: { journal: 'I forged discharges for the twelve on their own Concern paper, and they took the seven o\'clock like anybody. Joaquin Ortega stayed home.', end: 'done' },
    sold: { journal: 'I told the Concern\'s man where the twelve were, for fifteen Tolls a head. The Concern recovers its property.', end: 'done' },
  },
};

export const q_rc_engine: QuestDef = {
  id: 'q_rc_engine', title: 'Yard Nine\'s Dead Engine', act: 'a2', start: 'cold', xp: 200,
  routes: [
    { id: 'contract', kind: 'barter', label: 'Have the depot sign the Concern\'s exclusive for a new board' },
    { id: 'dark', kind: 'chrome', label: 'Wake the board without its channel, through a grid link or with Kes', requires: { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }] } },
    { id: 'spare', kind: 'talk', label: 'Talk the signalwoman out of her last pre-war spare', requires: { skill: 'speech', gte: 45 } },
    { id: 'read', kind: 'knowledge', label: 'Read the board and when it died', requires: { skill: 'mechanics', gte: 40 } },
  ],
  stages: {
    cold: {
      journal: 'Yard Nine\'s second engine, Dorcas, has been cold on her pit all season. With one engine on the Line, the Concern\'s through has every path. The Concern\'s man in the yard office has a new board in a box, and a contract to go with it.',
      objectives: [
        { id: 'board', text: 'Find out what is wrong with Dorcas', done: { knows: 'rc_leashed_known' } },
        { id: 'run', text: 'Get Dorcas running', done: { flag: 'rc_engine' } },
      ],
      next: [{ if: E('contract'), stage: 'contract' }, { if: E('dark'), stage: 'dark' }, { if: E('spare'), stage: 'spare' }, { if: { knows: 'rc_leashed_known' }, stage: 'leashed' }],
    },
    leashed: {
      journal: 'Dorcas did not die. Her board is the Concern\'s, and it was switched off from far away the night after the yard sent the Concern\'s first letter back unsigned.',
      objectives: [{ id: 'run', text: 'Get Dorcas running', done: { flag: 'rc_engine' } }],
      next: [{ if: E('contract'), stage: 'contract' }, { if: E('dark'), stage: 'dark' }, { if: E('spare'), stage: 'spare' }],
    },
    contract: { journal: 'Ida signed the Concern\'s exclusive and Whitlock fitted a new board. Dorcas runs, on the Concern\'s board and the Concern\'s terms: twenty years of its freight first on every path.', end: 'done' },
    dark: { journal: 'Dorcas\'s board was woken without the Concern\'s channel. She runs dark: nobody up the hill can switch her off again. The Concern\'s man left Yard Nine the next morning.', end: 'done' },
    spare: { journal: 'Dorcas runs on Halina Wrona\'s last spare, a pre-war board with nobody in it but the maker. If one of the instruments at Four Ways goes now, it stays gone.', end: 'done' },
  },
};

export const q_rc_east: QuestDef = {
  id: 'q_rc_east', title: 'Bolts on the East Length', act: 'a2', start: 'bolts', xp: 200,
  routes: [
    { id: 'talk', kind: 'talk', label: 'Talk the keeper down', requires: { skill: 'speech', gte: 45 } },
    { id: 'fix', kind: 'tech', label: 'Tighten and peen the bolts yourself at night', requires: { skill: 'mechanics', gte: 35 } },
    { id: 'tell', kind: 'knowledge', label: 'Tell the stationmaster who is loosening the track' },
    { id: 'paid', kind: 'barter', label: 'Get the halts paid again, so she has no need' },
  ],
  stages: {
    bolts: {
      journal: 'Gerrit Haas, East Halt\'s old line-keeper, finds the bolts on two joints of the east length backed off every morning, a rail\'s width from coming apart under a train, and tightens them every morning.',
      objectives: [
        { id: 'who', text: 'Find out who is loosening them', done: { knows: 'rc_east_known' } },
      ],
      next: [{ if: X('fixed'), stage: 'fixed' }, { if: { knows: 'rc_east_known' }, stage: 'plan' }],
    },
    plan: {
      journal: 'East Halt\'s keeper, Imani Wekesa, is loosening the east length herself, to throw the Concern\'s through off the rails at her halt: a wreck the guild must stop to clear, and nineteen cars for a dying halt to strip. Willem Visser drives it.',
      objectives: [{ id: 'end', text: 'Decide what happens on the east length', done: { flag: 'rc_east' } }],
      next: [{ if: X('stopped'), stage: 'stopped' }, { if: X('stood_down'), stage: 'stood_down' }, { if: X('fixed'), stage: 'fixed' }, { if: X('told'), stage: 'told' }, { if: X('helped'), stage: 'helped' }],
    },
    stopped: { journal: 'Imani tightened every bolt she had loosened, in daylight, while Gerrit watched with his hat off.', end: 'done' },
    stood_down: { journal: 'When the trains began to stop at the halts again, Imani tightened the east length herself the same morning, and never said why.', end: 'done' },
    fixed: { journal: 'I tightened and peened every bolt on the east length in the dark. In the morning Gerrit stood at the joint a long time and looked at the keeper\'s house, and said nothing.', end: 'done' },
    told: { journal: 'I told the stationmaster. His watch put Imani Wekesa off the Line at dawn. East Halt has thirteen people.', end: 'done' },
    helped: {
      journal: 'I helped Imani loosen the east length. The through comes past East Halt at two.',
      objectives: [{ id: 'wreck', text: 'The through, at two', done: { flag: 'rc_derailed' } }],
      next: [{ if: { flag: 'rc_derailed' }, stage: 'derailed' }],
    },
    derailed: { journal: 'The Concern\'s through came off the rails on the east length at two in the morning. East Halt strips its cars in a line, and the guild will be stopping there for a season.', end: 'done' },
  },
};
