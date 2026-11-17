import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, part 1, B3.11: the date on the photograph, the Archive Spire, and the Court of Accounts at its foot. Beats 14
 * and 15 of the critical path; the Court as a docket (cases called, evidence on the rail, rulings that set precedent);
 * and the side quest of the occupant of the old copy room. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B3.11.
 */

const NINE = 'npc_md_nine';
const ODILE = 'npc_nb_03';
const VERDICT = (v: string): Cond => ({ flag: 'ar_verdict', eq: v });
/** Ends the city's critical path and opens beat 16 (B4: the Concern's letter, the Line east to the Skirts). */
const SPIRE_DONE = [{ set: 'a2_spire_done' }, { quest: 'q_a2_halcyon', start: true }];

// ---------------------------------------------------------------- beat 14: the date

export const q_a2_calendar: QuestDef = {
  id: 'q_a2_calendar', title: 'Forty-Nine', act: 'a2', critical: true, start: 'back', xp: 300,
  routes: [
    { id: 'board', kind: 'knowledge', label: 'The pencil on the back, the year on the Wall and the date in your file, side by side on the notebook\'s board' },
    { id: 'nine', kind: 'talk', label: 'Ask the assessor to read a date: clause 40 forbids it a forecast, not a date', requires: { any: [{ inParty: NINE }, { flag: 'nine_met' }] } },
    { id: 'odile', kind: 'talk', label: 'Hand the photograph to an old trader, who knows a delivery date when she sees one', requires: { inParty: ODILE } },
    { id: 'render', kind: 'tech', label: 'Type the code in the print\'s margin into the Precinct\'s records terminal', requires: { skill: 'science', gte: 45 } },
    { id: 'eyes', kind: 'chrome', label: 'Read the margin\'s microprint with eyes, or a link, that are not your own', requires: { any: [{ chromeSlot: 'eyes' }, { chromeSlot: 'neural' }] } },
    { id: 'wire', kind: 'knowledge', label: 'The Saints\' wire says the year, if the girl who hears was kept at the tower', requires: { flag: 'bw_static', eq: 'kept' } },
  ],
  stages: {
    back: {
      journal: 'Everyone outside the Wall counts from the Burn, so the pencil on the back of the photograph — 49 — read as forty-one years gone. Meridian counts its own years: the Wall says RESTORATION YEAR 30, and the lens at the gate filed your face under a date with an R in front of it. Somebody in this city can read a date for what it is.',
      objectives: [
        { id: 'date', text: 'Work out what the date on the back of the photograph counts from', done: { knows: 'cal_future' } },
        { id: 'made', text: 'Find out what made the picture', done: { any: [{ concluded: 'c_photo_forecast' }, { concluded: 'c_photo_made' }, { knows: 'cal_render' }] }, optional: true },
      ],
      next: [{ if: { knows: 'cal_future' }, stage: 'future' }],
    },
    future: {
      journal: 'Forty-nine is the city\'s year: forty-nine from the Resumption, nineteen from now. The picture in the stranger\'s coat was never taken. It was made, of a day that has not come, on steps that are real: the broad steps at the foot of the Archive Spire, behind the Precinct, where the stranger came down ninety-one landings with twelve faces under his coat.',
      end: 'done',
      onEnter: [
        { set: 'a2_calendar_done' }, { learn: 'ar_known' }, { quest: 'q_a2_spire', start: true },
        { decision: { id: 'cal_future', text: 'You worked out that the date on the stranger\'s photograph is nineteen years from now, in the city\'s own calendar.' } },
      ],
    },
  },
};

// ---------------------------------------------------------------- beat 15: the Spire

export const q_a2_spire: QuestDef = {
  id: 'q_a2_spire', title: 'Ninety-One Landings', act: 'a2', critical: true, start: 'close', xp: 500,
  routes: [
    { id: 'designate', kind: 'knowledge', label: 'Let the lens at the foot of the stair read your file: admit on sight, every landing' },
    { id: 'nine', kind: 'talk', label: 'The assessor makes a records request under clause 40, for a citizen of Reserve 9\'s door', requires: { inParty: NINE } },
    { id: 'petition', kind: 'talk', label: 'Ask the keeper of the catalogue to let next of kin read Reserve 9\'s file', requires: { skill: 'speech', gte: 45 } },
    { id: 'keeper', kind: 'knowledge', label: 'The keeper gave the stranger his slip. Tell her you know', requires: { any: [{ lead: 'l_rev_spire' }, { concluded: 'c_rev_last_day' }] } },
    { id: 'slip', kind: 'tech', label: 'Issue yourself a reading slip at the catalogue terminal, clerk grade', requires: { skill: 'science', gte: 45 } },
    { id: 'paid', kind: 'barter', label: 'Fifty Tolls in the porter\'s lamp-oil drawer' },
    { id: 'stair', kind: 'stealth', label: 'Past the sleeping porter, up the stair in the dark', requires: { skill: 'stealth', gte: 45 } },
    { id: 'lift', kind: 'chrome', label: 'Think at the dead service lift until the grid answers', requires: { chrome: 'ch_neural_link' } },
  ],
  stages: {
    close: {
      journal: 'The steps in the photograph are at the foot of the Archive Spire, behind the Precinct. The city keeps everything it has ever written in that tower: what it ordered of the Cistern, and the list the stranger carried west. There is a stair of ninety-one landings, a porter at its foot, and a lens on a post beside him.',
      objectives: [
        { id: 'reach', text: 'Reach the Spire close', done: { flag: 'visited_md_spire' } },
        { id: 'up', text: 'Get up the stair', done: { flag: 'ar_up' } },
        { id: 'refusals', text: 'Find what the record says of Reserve 9', done: { knows: 'ar_refusals' } },
        { id: 'list', text: 'Find the list', done: { knows: 'ar_cast_list' } },
      ],
      onEnter: [{ learn: 'ar_known' }],
      next: [{ if: { all: [{ knows: 'ar_refusals' }, { knows: 'ar_cast_list' }] }, stage: 'summons' }],
    },
    summons: {
      journal: 'At the end of landing ninety-one a round door with a brass plate: HEARINGS OF THE DESIGNATE. The record knows you are up here, and has asked for you by title. A hearing closes the season\'s accounts — every schedule on its docket is entered as final when it ends — so whatever is on that docket is worth settling first. The hearing will wait for you.',
      objectives: [
        { id: 'sink', text: 'The Sink\'s spring relief is on the docket', done: { flag: 'sk_pumps' }, optional: true },
        { id: 'hear', text: 'Go in and answer, when you are ready', done: { flag: 'ar_verdict' } },
      ],
      next: [
        { if: VERDICT('agreed'), stage: 'agreed' }, { if: VERDICT('contested'), stage: 'contested' }, { if: VERDICT('noted'), stage: 'noted' },
        { if: VERDICT('refused'), stage: 'refused' }, { if: VERDICT('silent'), stage: 'silent' },
      ],
    },
    agreed: {
      journal: 'You told the voice at the top of the Spire that you agree with the record. It thanked you, which it does not do for wardens, and printed a warrant with your title on it. The season\'s accounts are closed. Whatever was on the docket is final now; whatever is on the list is a little more likely than it was.',
      end: 'done', onEnter: [...SPIRE_DONE, { news: { tag: 'ar_agreed', text: 'the Magistrate-designate was heard at the top of the Spire and came down with a warrant', valence: 2, size: 7, at: 'meridian' } }],
    },
    contested: {
      journal: 'You contested the record at the top of the Spire, and the voice did not overrule you: it wrote CONTESTED on a file that has never been contested, and said it would rather be persuaded than obeyed, and would hear you again. The season\'s accounts are closed. The file is the same file. It is not the same.',
      end: 'done', onEnter: [...SPIRE_DONE, { news: { tag: 'ar_contested', text: 'they say the designate contested their own file at the top of the Spire, and the Ledger wrote it down', valence: 4, size: 7, at: 'meridian' } }],
    },
    noted: {
      journal: 'You argued with the record at the top of the Spire and it heard you out, all of it, and said it was unpersuaded. Noted. The season\'s accounts are closed, and the schedule holds.',
      end: 'done', onEnter: [...SPIRE_DONE, { news: { tag: 'ar_noted', text: 'the designate was heard at the top of the Spire; the schedule holds, the wardens say', valence: 0, size: 6, at: 'meridian' } }],
    },
    refused: {
      journal: 'You told the voice at the top of the Spire no. It said "noted" the way MOTHER says thank you, and that the schedule holds, and let you go down all ninety-one landings without another word. The season\'s accounts are closed. The wardens on the lane already know.',
      end: 'done', onEnter: [...SPIRE_DONE, { news: { tag: 'ar_refused', text: 'the designate refused the Ledger to its face at the top of the Spire', valence: 6, size: 8, at: 'meridian' } }],
    },
    silent: {
      journal: 'You sat in the round room and said nothing, and went back down the stair. A designate who does not answer is recorded as not yet answering. The season\'s accounts are closed all the same.',
      end: 'done', onEnter: [...SPIRE_DONE],
    },
  },
};

// ---------------------------------------------------------------- the Court of Accounts (the docket)

export const q_ca_court: QuestDef = {
  id: 'q_ca_court', title: 'Court of Accounts', act: 'a2', start: 'docket', xp: 150,
  routes: [
    { id: 'speak', kind: 'talk', label: 'Speak at the rail: evidence first, then the ground the ruling stands on' },
    { id: 'paper', kind: 'knowledge', label: 'Bring what the Court can read: papers, leads, witnesses, the register\'s own rulings' },
  ],
  stages: {
    docket: {
      journal: 'The Court of Accounts sits in the west wing at the foot of the Archive Spire: fines, titles, petitions, debts. Assessor Three reads what is put on the rail and nothing else, and rules, and the ruling goes into a register the next case is read against. Anyone may contest a fine; any citizen may speak for a respondent who has nobody. The usher calls the cases. Behind the bench there is a second chair with dust on it.',
      objectives: [
        { id: 'fines', text: 'Have your contested fines heard', done: { flag: 'ca_fines' }, optional: true },
        { id: 'one', text: 'See a case ruled with your voice in it', done: { flag: 'ca_cases_heard', gte: 1 } },
        { id: 'two', text: 'And another', done: { flag: 'ca_cases_heard', gte: 2 } },
      ],
      next: [{ if: { flag: 'ca_cases_heard', gte: 2 }, stage: 'register' }],
    },
    register: {
      journal: 'Two rulings in the register with your voice in them. Three said nothing about it, which from Three is a remark. The docket does not close; there will be other cases, and each will be read against what was said at the rail this season.',
      end: 'done',
    },
  },
};

// ---------------------------------------------------------------- Court Case: the Squatter

const MET: Cond = { knows: 'ca_comfort_met' };

export const q_ca_squatter: QuestDef = {
  id: 'q_ca_squatter', title: 'Court Case: the Squatter', act: 'a2', start: 'docket', xp: 220,
  routes: [
    { id: 'living', kind: 'medicine', label: 'Prove her alive: a licensed doctor\'s certificate, or the woman herself at the rail' },
    { id: 'outside', kind: 'tech', label: 'Read the record against itself: a petition against the dead is void', requires: { skill: 'science', gte: 40 } },
    { id: 'refused', kind: 'talk', label: 'The room is being cleared for you. Refuse it, on the record', requires: { skill: 'speech', gte: 40 } },
    { id: 'catalogued', kind: 'barter', label: 'Sell her book to the catalogue before the case is called' },
  ],
  stages: {
    docket: {
      journal: 'Case 1187 on the Court\'s docket: the Registry against an occupant of the old copy room behind the court. Called eleven times. No speaker for the respondent. The usher brings her bread, and says the back stair is not locked.',
      objectives: [{ id: 'meet', text: 'Find the occupant of the copy room', done: MET }],
      next: [{ if: MET, stage: 'room' }],
    },
    room: {
      journal: 'Comfort Asamoah, seventy-one, was the Court\'s last copyist. The record says she drowned in the Sink in R12, as forecast; she climbed the Spire\'s stair that spring instead, and has lived eighteen years in a room no lens looks into, copying every ruling the Court makes into a book by hand. She will not come down to the rail: the dead do not stand at rails. Somebody has to speak for her, and know why the Registry wants the room now.',
      objectives: [
        { id: 'why', text: 'Find out who filed the petition, and why now', done: { knows: 'ca_squatter_for_you' }, optional: true },
        { id: 'alive', text: 'Something the Court will read as proof that she is alive', done: { any: [{ item: 'k_ca_certificate' }, { flag: 'ca_comfort_stands' }] }, optional: true },
        { id: 'book', text: 'What the Court reads from every morning', done: { knows: 'ca_register_is_book' }, optional: true },
        { id: 'hear', text: 'Have case 1187 called, and speak for her — or settle it another way', done: { flag: 'ca_squatter' } },
      ],
      next: [
        { if: { flag: 'ca_squatter', eq: 'living' }, stage: 'living' },
        { if: { flag: 'ca_squatter', eq: 'outside' }, stage: 'outside' },
        { if: { flag: 'ca_squatter', eq: 'refused' }, stage: 'refused' },
        { if: { flag: 'ca_squatter', eq: 'catalogued' }, stage: 'catalogued' },
        { if: { flag: 'ca_squatter', eq: 'lost' }, stage: 'lost' },
      ],
    },
    living: {
      journal: 'The record yields to a living person standing at the rail. Comfort Asamoah has a card, a ration, and the copy room by eighteen years\' occupation, and Three has made her keeper of the Court\'s register, an office nobody had held since the Resumption. She sits at a desk below the bench now, in the light, where the record can see her. It has started forecasting her again. She says she knew it would.',
      end: 'done',
    },
    outside: {
      journal: 'The Court has no jurisdiction over the dead; the petition is void. Comfort Asamoah keeps the copy room, unrecorded, unseen, and unprotected, and goes on copying. The ruling is in her book now with everything else: the Court can neither shelter nor move a person the record does not hold.',
      end: 'done',
    },
    refused: {
      journal: 'The room was being cleared for you, nineteen years early, and you refused it at the rail, on the record. A beneficiary may refuse a scheduled benefit: the first entry under that heading. The works board on the steps says CHAMBERS — REROUTED. Comfort Asamoah is still copying. So, somewhere above the Court, is something that has heard you say no.',
      end: 'done',
    },
    catalogued: {
      journal: 'The Archive has the book. The Court\'s register is read from the catalogue now, which is to say the city keeps its own precedents, and there is nothing in the copy room worth defending. Comfort Asamoah went down the stair she had not used in eighteen years, and down another, to the Sink, to look at her own name on the wall.',
      end: 'done',
    },
    lost: {
      journal: 'Petition granted. The copy room was cleared for restoration and its contents removed as property, and the contents included a woman the record says is dead. A dead woman has no card, so the wardens put her outside the Wall with the line. She carried the book out under her coat; it was the one piece of property nobody thought to take.',
      end: 'failed',
    },
  },
};
