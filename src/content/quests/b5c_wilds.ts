import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, B5c: the Teeth mines and the Northern Wet. Number Four's runaways and its winchwoman's arrangement (Taken on the
 * Path), the machine under the pit (What Moved Below Four), the city's audit of Ashby Dam (Low Water), Sawtown's boom and its feud
 * (Marks at the Boom), and the Patience's load (A Load for the City). Every end is the player's choice; what follows a choice
 * at a dawn or a night waits for the player to be there. Story notes: story/B5c_NOTES_SECRET.md.
 */

const T = (v: string): Cond => ({ flag: 'tm_four', eq: v });
const G = (v: string): Cond => ({ flag: 'tm_digger', eq: v });
const D = (v: string): Cond => ({ flag: 'nw_dam', eq: v });
const F = (v: string): Cond => ({ flag: 'nw_feud', eq: v });
const R = (v: string): Cond => ({ flag: 'nw_run', eq: v });

const FOUR_ENDS = [{ if: T('exposed'), stage: 'exposed' }, { if: T('ended'), stage: 'ended' }, { if: T('kept'), stage: 'kept' }, { if: T('fought'), stage: 'fought' }];

export const q_tm_path: QuestDef = {
  id: 'q_tm_path', title: 'Taken on the Path', act: 'a2', start: 'taken', xp: 250,
  routes: [
    { id: 'exposed', kind: 'knowledge', label: 'Read the Concern\'s requests card to Number Four at the lamp meeting' },
    { id: 'ended', kind: 'talk', label: 'Make the winchwoman end the arrangement herself', requires: { skill: 'speech', gte: 50 } },
    { id: 'kept', kind: 'barter', label: 'Take the winchwoman\'s tin money for silence' },
    { id: 'fought', kind: 'fight', label: 'Fight the Clean at the switchback below the col' },
    { id: 'adit', kind: 'survival', label: 'Bring the family down the old drift under the mountain', requires: { skill: 'survival', gte: 40 } },
  ],
  stages: {
    taken: {
      journal: 'Number Four, the free pit on the Teeth\'s south face, chalks the names of the runaways the Clean take on the path below the col under a line on its lamp board: three this year. The Shift\'s runner there, Desmond Achebe, is waiting for a woman and her son to come over the col.',
      objectives: [
        { id: 'family', text: 'Bring the family down from the col', done: { flag: 'tm_family_in' }, optional: true },
        { id: 'told', text: 'Find out how the Clean know who is coming over', done: { knows: 'tm_told_known' } },
      ],
      next: [...FOUR_ENDS, { if: { any: [{ knows: 'tm_radio_known' }, { knows: 'tm_arrangement_known' }] }, stage: 'arrangement' }],
    },
    arrangement: {
      journal: 'Number Four is free by arrangement. Ragna Holm, who walked its first dozen over the col, tells the Clean on her set when somebody the Concern wants comes over, a name a season, and the Concern pays double for Four\'s tin through the guild and lets the pit stand.',
      objectives: [
        { id: 'parts', text: 'Find out what the letters on the Concern\'s card mean', done: { knows: 'tm_parts_known' }, optional: true },
        { id: 'end', text: 'Decide what becomes of the arrangement', done: { flag: 'tm_four' } },
      ],
      next: FOUR_ENDS,
    },
    exposed: { journal: 'I read the Concern\'s card to Number Four at the lamp meeting. Four voted Ragna Holm down the mountain and broke her set. Its tin sells at the ordinary price now, and the Concern\'s eye is on it.', end: 'done' },
    ended: { journal: 'Ragna Holm ended her arrangement herself, on the set and at the board, and stepped down, and winds the cage still. Number Four is poorer, and its own.', end: 'done' },
    kept: { journal: 'I took Ragna Holm\'s tin money and kept her secret. Number Four stays free and fed, and the Concern takes a name a season off its path.', end: 'done' },
    fought: { journal: 'I fought the Clean on the col. The Concern ended its arrangement with Number Four itself by stopping the money. Four is poorer, and watched.', end: 'done' },
  },
};

export const q_tm_digger: QuestDef = {
  id: 'q_tm_digger', title: 'What Moved Below Four', act: 'a2', start: 'below', xp: 150,
  routes: [
    { id: 'salvaged', kind: 'tech', label: 'Pull the machine\'s controller', requires: { skill: 'mechanics', gte: 45 } },
    { id: 'tamed', kind: 'chrome', label: 'Wake it to dig for Number Four, through Kes or a grid link', requires: { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }] } },
    { id: 'drowned', kind: 'survival', label: 'Stop the pumps and let the water back over it' },
  ],
  stages: {
    below: {
      journal: 'Gaspard Okoro\'s pumps have Number Four\'s lower level half dry for the first time in seventy years, and the face crew came up white: something down there moved.',
      objectives: [{ id: 'see', text: 'Go down to the old level and see what moved', done: { knows: 'tm_digger_seen' } }],
      next: [{ if: G('salvaged'), stage: 'salvaged' }, { if: G('tamed'), stage: 'tamed' }, { if: G('drowned'), stage: 'drowned' }, { if: { knows: 'tm_digger_seen' }, stage: 'digger' }],
    },
    digger: {
      journal: 'In the old level under Number Four a pre-war mining machine of the Concern\'s lineage lies where it was stopped, its lamp blinking, waiting to be told to work again.',
      objectives: [{ id: 'end', text: 'Decide what to do with the digger', done: { flag: 'tm_digger' } }],
      next: [{ if: G('salvaged'), stage: 'salvaged' }, { if: G('tamed'), stage: 'tamed' }, { if: G('drowned'), stage: 'drowned' }],
    },
    salvaged: { journal: 'I pulled the digger\'s controller. It is a dead machine now, and the lower level is Four\'s to dig by hand.', end: 'done' },
    tamed: { journal: 'The digger cuts for Number Four now. It is the Concern\'s machine, and answers to the Concern\'s words.', end: 'done' },
    drowned: { journal: 'I let the water back over the digger. The lower level is lost again.', end: 'done' },
  },
};

const DAM_ENDS = [{ if: D('truth'), stage: 'truth' }, { if: D('hidden'), stage: 'hidden' }, { if: D('exposed'), stage: 'exposed' }, { if: D('sunk'), stage: 'sunk' }];

export const q_nw_dam: QuestDef = {
  id: 'q_nw_dam', title: 'Low Water', act: 'a2', start: 'audit', xp: 250,
  routes: [
    { id: 'truth', kind: 'talk', label: 'Put the truth about the dam into the city\'s record, with its keeper', requires: { skill: 'speech', gte: 45 } },
    { id: 'hidden', kind: 'tech', label: 'Make the gauge read full without the block, before the inspection', requires: { skill: 'mechanics', gte: 45 } },
    { id: 'exposed', kind: 'barter', label: 'Show the inspector the block, for the record\'s bounty' },
    { id: 'sunk', kind: 'fight', label: 'Fight the inspection on the crest' },
  ],
  stages: {
    audit: {
      journal: 'The city says Ashby Dam has delivered short of its schedule for eleven seasons, and has sent an assessor up the river to read the gauge. The barges at Low Landing go down half-loaded on a low river. The assessor waits at the dam for the keeper.',
      objectives: [
        { id: 'lie', text: 'Find out why Ashby is short', done: { knows: 'nw_lie_known' } },
        { id: 'why', text: 'Find out why the keepers do it', done: { knows: 'nw_why_known' }, optional: true },
        { id: 'sink', text: 'Find out what the shortfall costs', done: { knows: 'nw_sink_link' }, optional: true },
      ],
      next: [...DAM_ENDS, { if: { knows: 'nw_lie_known' }, stage: 'lie' }],
    },
    lie: {
      journal: 'Ashby has never been full. Its keepers wedge the gauge so the city\'s controller reads a lake that is not there, and the city plans its water on it.',
      objectives: [
        { id: 'why', text: 'Find out why the keepers do it', done: { knows: 'nw_why_known' }, optional: true },
        { id: 'sink', text: 'Find out what the shortfall costs', done: { knows: 'nw_sink_link' }, optional: true },
        { id: 'end', text: 'Decide what the inspection finds', done: { flag: 'nw_dam' } },
      ],
      next: DAM_ENDS,
    },
    truth: { journal: 'The truth about Ashby is in the city\'s record. The city will plan its water on the real lake: the Precinct\'s growth cut, the Sink\'s spring pumps its own again, the river let down even.', end: 'done' },
    hidden: { journal: 'The city\'s inspector found Ashby compliant. The keepers\' lie holds, and so does everything it costs.', end: 'done' },
    exposed: { journal: 'The city took Ashby\'s keepers down the river, and wardens keep the dam to the city\'s card. The Water is to be raised to its full line.', end: 'done' },
    sunk: { journal: 'I fought the city\'s inspection on Ashby\'s crest. The record has written its assessor lost in the Wet.', end: 'done' },
  },
};

const FEUD_ENDS = [{ if: F('truth'), stage: 'truth' }, { if: F('quiet'), stage: 'quiet' }, { if: F('caught'), stage: 'caught' }, { if: F('burned'), stage: 'burned' }];

export const q_nw_feud: QuestDef = {
  id: 'q_nw_feud', title: 'Marks at the Boom', act: 'a2', start: 'marks', xp: 200,
  routes: [
    { id: 'truth', kind: 'talk', label: 'Say it all at the crews\' meeting in the mill', requires: { skill: 'speech', gte: 50 } },
    { id: 'quiet', kind: 'knowledge', label: 'Tell the Ridge\'s foreman alone what happened to his son' },
    { id: 'caught', kind: 'barter', label: 'Give the boom-keeper the mark-cutter, for the boom\'s money' },
    { id: 'burned', kind: 'fight', label: 'Keep watch while the Ridge burns the Bottoms\' camp' },
  ],
  stages: {
    marks: {
      journal: 'At Sawtown\'s boom somebody cuts the Ridge crew\'s mark off their logs at night and cuts the Bottoms\' hook over it, and the boom pays the Bottoms. The two crews have been feuding for two years, since the Ridge foreman\'s son died under a falling tree. The boom-keeper wants the cutter found before the Ridge finds them.',
      objectives: [
        { id: 'cutter', text: 'Find the mark-cutter', done: { knows: 'nw_marker_known' } },
        { id: 'money', text: 'Find out where the money goes', done: { knows: 'nw_why_marks' }, optional: true },
        { id: 'mikkel', text: 'Find out how Mikkel Brandvold died', done: { knows: 'nw_fault_known' }, optional: true },
      ],
      next: [...FEUD_ENDS, { if: { knows: 'nw_marker_known' }, stage: 'cutter' }],
    },
    cutter: {
      journal: 'The mark-cutter is Sigrun Brandvold, the Ridge foreman\'s own daughter, and the money goes to the woman his dead son meant to marry and the son\'s baby, whom the Ridge will not own.',
      objectives: [
        { id: 'mikkel', text: 'Find out how Mikkel Brandvold died', done: { knows: 'nw_fault_known' }, optional: true },
        { id: 'end', text: 'Decide what happens at Sawtown', done: { flag: 'nw_feud' } },
      ],
      next: FEUD_ENDS,
    },
    truth: { journal: 'At the crews\' meeting in the mill, Mikkel Brandvold\'s death was said aloud for what it was. His father gave up the Ridge and went up the hill. The feud is over; the marks stopped.', end: 'done' },
    quiet: { journal: 'I told Arvid Brandvold alone. He went to the cookhouse and held his son\'s child. The feud is over, and nobody else knows why.', end: 'done' },
    caught: { journal: 'I gave the boom-keeper Sigrun Brandvold\'s name and not her reason. Sawtown puts mark-cutters on the Water. The feud goes on.', end: 'done' },
    burned: { journal: 'I kept watch for Cillian Moss. The Bottoms\' camp burned, and the Bottoms went down the river.', end: 'done' },
  },
};

const RUN_ENDS = [{ if: R('delivered'), stage: 'delivered' }, { if: R('river'), stage: 'river' }, { if: R('wardens'), stage: 'wardens' }];

export const q_nw_run: QuestDef = {
  id: 'q_nw_run', title: 'A Load for the City', act: 'a2', start: 'load', xp: 200,
  routes: [
    { id: 'delivered', kind: 'barter', label: 'See the load to the guild\'s man in the city and take the pay' },
    { id: 'river', kind: 'survival', label: 'Put the load over the side in the deep reach' },
    { id: 'wardens', kind: 'knowledge', label: 'Take the load and its waybill to the wardens at the city gate' },
  ],
  stages: {
    load: {
      journal: 'Magda Kowal\'s barge, the Patience, has been tied up at Low Landing half a season with her mooring owed to the guild. The guild\'s factor has a sealed load for the city at a hundred and fifty, and she needs a hand at the sweeps and somebody awake on the night reach.',
      objectives: [
        { id: 'crew', text: 'Crew the Patience down the river', done: { flag: 'nw_run_crew' } },
        { id: 'what', text: 'Find out what the cases hold', done: { lead: 'l_nw_crates' }, optional: true },
        { id: 'end', text: 'See the load to its end', done: { flag: 'nw_run' } },
      ],
      next: RUN_ENDS,
    },
    delivered: { journal: 'The guild has its twelve cases at the city\'s Docks: the Concern\'s kennel boards. Magda Kowal has her mooring.', end: 'done' },
    river: { journal: 'Twelve cases of the Concern\'s kennel boards are in the mud of the deep reach above the city. Magda Kowal owes the guild her mooring.', end: 'done' },
    wardens: { journal: 'The wardens at the city gate have the guild\'s twelve cases of kennel boards, and its waybill. The guild knows my face.', end: 'done' },
  },
};

export const B5C_QUESTS: QuestDef[] = [q_tm_path, q_tm_digger, q_nw_dam, q_nw_feud, q_nw_run];
