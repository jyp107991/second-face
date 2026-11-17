import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';
import { LEASHED } from '../chrome/catalogue';

/**
 * Act 2, B4a: the Skirts under Halcyon. Beat 16's opening (`q_a2_halcyon`, continued inside the arcology by B4b), the
 * Cave-In that opens the Shift's line, the Shift's strike (keystone 12), Spare Parts' Skirts half, and Scrip. Every end
 * is set by the player's hand; the one default (the strike left unsettled) waits for a story milestone B4b sets
 * (`hc_inside`). Story notes: story/STORY_PLAN_SECRET.md, Build notes — B4.
 */

const ARRIVED: Cond = { any: [{ flag: 'visited_skirts' }, { flag: 'visited_hs_skirts' }, { knows: 'seen_skirts' }] };
const SHIFT = (v: string): Cond => ({ flag: 'hs_shift', eq: v });
const PARTS = (v: string): Cond => ({ flag: 'hs_parts', eq: v });
const SCRIP = (v: string): Cond => ({ flag: 'hs_scrip', eq: v });
const INSIDE: Cond = { flag: 'hc_inside' };

export const q_a2_halcyon: QuestDef = {
  id: 'q_a2_halcyon', title: 'Halcyon\'s Offer', act: 'a2', critical: true, start: 'invite', xp: 300,
  routes: [
    { id: 'shift', kind: 'talk', label: 'Settle the Skirts\' strike so the car up the hill runs again' },
    { id: 'guest', kind: 'talk', label: 'Go up as the Board\'s guest, on the invitation in your pocket' },
    { id: 'contract', kind: 'barter', label: 'A contract from the Contract Office at Footgate' },
    { id: 'road', kind: 'stealth', label: 'The road up past the Clean\'s gate, when the car is down', requires: { skill: 'stealth', gte: 45 } },
    { id: 'chrome', kind: 'chrome', label: 'Concern chrome: the gate\'s lens reads the wearer as a citizen', requires: LEASHED },
  ],
  stages: {
    invite: {
      journal: 'A letter came for me in the post, on heavy white card with a mark like a closed eye: the Board of the Concern would be pleased to receive the designate at Halcyon. The Line runs east to the Skirts, the town under its mountain; the Contract Office at Footgate has my name. Nobody has to decide anything today, it says.',
      onEnter: [
        { give: 'k_hc_invitation' }, { learn: 'hc_invited' }, { lead: 'l_hc_invitation' },
        { post: { from: 'npc_hs_04', text: 'THE BOARD OF THE CONCERN WOULD BE PLEASED TO RECEIVE THE DESIGNATE AT HALCYON. The Line runs to the Skirts. The Contract Office at Footgate has your name. Nobody has to decide anything today. — A. Bell, Contract Office, Footgate.' } },
      ],
      objectives: [{ id: 'skirts', text: 'Take the Line east to the Skirts', done: ARRIVED }],
      next: [{ if: ARRIVED, stage: 'skirts' }],
    },
    skirts: {
      journal: 'The Skirts: a debtors\' town on the old ski runs under the rock, and over the rock, faint even by day, the green of Halcyon\'s gardens. The funicular up to it is stopped. The Shift, the miners\' union, has struck Number Six after a gallery came down on eleven of them, and the car\'s own crew walked out with the pit: no lamps down, no car up.',
      objectives: [
        { id: 'bell', text: 'Find the Contract Office at Footgate', done: { flag: 'hs_bell_met' } },
        { id: 'strike', text: 'The car runs when the strike is settled, one way or another', done: { flag: 'hs_shift' } },
      ],
      next: [
        { if: { any: [SHIFT('won'), SHIFT('broken')] }, stage: 'car' },
        { if: SHIFT('revolt'), stage: 'road' },
        { if: INSIDE, stage: 'inside' },
      ],
    },
    car: {
      journal: 'The car runs again, up the rock on its ladder of a track. Agnes Bell at the Contract Office keeps the designate\'s appointment as written, and a clerk at the car\'s doors has my name on a list.',
      objectives: [{ id: 'up', text: 'Go up the hill to Halcyon', done: INSIDE }],
      next: [{ if: INSIDE, stage: 'inside' }],
    },
    road: {
      journal: 'The cable house at Footgate is a black room with no roof, and the car hangs on its track. Whatever the Board wanted with me, the only way up now is the road, through the Clean\'s gate.',
      objectives: [{ id: 'up', text: 'Find a way up the hill to Halcyon', done: INSIDE }],
      next: [{ if: INSIDE, stage: 'inside' }],
    },
    // B4b replaces this end with the Board's beat (the gate, the offer, what the Board wants).
    inside: {
      journal: 'Inside Halcyon\'s gate: silence, gardens under glass, and nobody old who looks old.',
      end: 'done',
    },
  },
};

export const q_hs_cavein: QuestDef = {
  id: 'q_hs_cavein', title: 'Six East', act: 'a2', start: 'board', xp: 250,
  routes: [
    { id: 'gallery', kind: 'survival', label: 'Down the cage at night with Maren\'s leave, to the pillars and the fall' },
    { id: 'sneak', kind: 'stealth', label: 'Past the sleeping guard and the winch yourself', requires: { skill: 'stealth', gte: 45 } },
    { id: 'boy', kind: 'talk', label: 'The trapper boy who ran when the roof talked', requires: { skill: 'speech', gte: 45 } },
    { id: 'order', kind: 'tech', label: 'Dysart\'s retreat order, from his lockbox or the Window\'s own files', requires: { skill: 'security', gte: 45 } },
    { id: 'sold', kind: 'barter', label: 'Sell the proof back to the pit manager' },
  ],
  stages: {
    board: {
      journal: 'Number Six\'s lamp board: eleven tags hung back on dead men\'s pegs, chalked STILL DOWN, and the Window\'s notice beside them: SIX EAST — CLOSED — GEOLOGICAL — RECOVERY NOT ECONOMIC. The debts of the dead pass to their kin. The Shift says the roof talked before it went, and you don\'t get a roof talking in good ground.',
      objectives: [
        { id: 'down', text: 'See the east gallery for yourself', done: { any: [{ knows: 'hs_six_fall_seen' }, { knows: 'hs_robbed' }] } },
        { id: 'pillars', text: 'Find out why the roof came down', done: { knows: 'hs_robbed' } },
        { id: 'boy', text: 'Hear the trapper boy out', done: { flag: 'hs_pim_word' }, optional: true },
        { id: 'order', text: 'Who signed for it', done: { item: 'k_hs_order' }, optional: true, hidden: true },
      ],
      next: [{ if: { knows: 'hs_robbed' }, stage: 'robbed' }, { if: { all: [{ flag: 'hs_shift' }, { flag: 'hs_dead_up' }] }, stage: 'buried' }, { if: { flag: 'hs_shift' }, stage: 'left' }],
    },
    robbed: {
      journal: 'Six East did not fall. Pillars fourteen to twenty-two were cut back to a waist, a bit a week, for the quarter\'s tonnage, on the pit manager\'s order, after the steward who refused to work them had his paper doubled. The eleven went in because the Window cut their families\' rations. Then the Concern billed the families.',
      objectives: [
        { id: 'proof', text: 'Decide what to do with what you know', done: { flag: 'hs_cavein' } },
        { id: 'up', text: 'Bring the eleven up', done: { flag: 'hs_dead_up' }, optional: true },
      ],
      next: [
        { if: { flag: 'hs_cavein', eq: 'shift' }, stage: 'shift' }, { if: { flag: 'hs_cavein', eq: 'sold' }, stage: 'sold' },
        { if: { all: [{ flag: 'hs_shift' }, { flag: 'hs_dead_up' }] }, stage: 'buried' }, { if: { flag: 'hs_shift' }, stage: 'left' },
      ],
    },
    shift: {
      journal: 'The proof is the Shift\'s. Maren read it twice and said a word she had never used before: claim. Clause 11 of every miner\'s contract says the Concern warrants the workings.',
      objectives: [{ id: 'up', text: 'Bring the eleven up', done: { flag: 'hs_dead_up' }, optional: true }],
      next: [{ if: { flag: 'hs_dead_up' }, stage: 'buried' }, { if: { flag: 'hs_shift' }, stage: 'left' }],
    },
    buried: {
      journal: 'The eleven are up from Six East and in the ground on the slope above Nursery, with their tags on stakes and cabbages between the graves. The lamp board\'s pegs are empty.',
      end: 'done',
    },
    left: {
      journal: 'The strike is over and the eleven are still under Six East. Their tags are gone from the lamp board and nobody will say where. The graves on the slope above Nursery are still open, with water in the bottom.',
      end: 'failed',
    },
    sold: {
      journal: 'I sold Corwin Dysart what I knew about Six East for two hundred Tolls, and watched him feed it to his stove. Geological, he said, as if he would like to believe it.',
      end: 'done',
    },
  },
};

export const q_hs_shift: QuestDef = {
  id: 'q_hs_shift', title: 'No Lamps Down', act: 'a2', start: 'strike', xp: 400,
  routes: [
    { id: 'claim', kind: 'talk', label: 'A claim under Clause 11 at the Contract Office, with the order on the counter', requires: { skill: 'speech', gte: 45 } },
    { id: 'turn', kind: 'talk', label: 'Turn the men off the Line with the truth about Six East', requires: { skill: 'speech', gte: 50 } },
    { id: 'buy', kind: 'barter', label: 'Buy the twenty labour contracts off the Contract Office counter' },
    { id: 'vote', kind: 'knowledge', label: 'Call the vote at the Lodge when the scabs are gone, and let the Shift hold' },
    { id: 'car', kind: 'fight', label: 'Rafe\'s powder and the car\'s cable house', requires: { skill: 'explosives', gte: 40 } },
    { id: 'sell', kind: 'barter', label: 'Sell the strike committee to the pit manager' },
  ],
  stages: {
    strike: {
      journal: 'Maren Okafor holds the Shift\'s pen. Three demands on the strike board at the Lodge: the eleven of Six East brought up and buried; their debts void, not passed to their children; a steward with a stop, the right to walk off bad ground. "We go up together, or we don\'t go up." The Concern has not answered yet.',
      objectives: [
        { id: 'six', text: 'Find out what happened at Six East', done: { knows: 'hs_robbed' }, optional: true },
        { id: 'answer', text: 'Wait for the Concern\'s answer', done: { flag: 'hs_scabs_here' } },
        { id: 'claim', text: 'Take the Shift\'s claim to the Contract Office', done: { flag: 'hs_claim' }, optional: true, hidden: true },
      ],
      next: [
        { if: SHIFT('won'), stage: 'won' }, { if: SHIFT('broken'), stage: 'broken' }, { if: SHIFT('revolt'), stage: 'revolt' },
        { if: { flag: 'hs_scabs_here' }, stage: 'answer' },
      ],
    },
    answer: {
      journal: 'The Concern\'s answer came up the Line at seven in the morning: twenty debtors bought off the Tollmen\'s block at Ninebridge, on Concern paper, to dig Number Six past the picket. If they go down, holding is starving. And Rafe Ansel, whose brother is under the fall, has six cases of blasting powder out of the magazine and a plan for the car\'s cable house.',
      objectives: [
        { id: 'scabs', text: 'Deal with the men off the Line', done: { flag: 'hs_scabs' } },
        { id: 'rafe', text: 'Rafe\'s powder', done: { any: [{ flag: 'hs_rafe' }, { item: 'k_hs_powder' }] }, optional: true },
        { id: 'claim', text: 'The Shift\'s claim at the Contract Office', done: { flag: 'hs_claim' }, optional: true },
        { id: 'vote', text: 'When the Shift is ready, ask Maren to call the vote', done: { flag: 'hs_vote' } },
      ],
      next: [{ if: SHIFT('won'), stage: 'won' }, { if: SHIFT('broken'), stage: 'broken' }, { if: SHIFT('revolt'), stage: 'revolt' }],
    },
    won: {
      journal: 'The Shift won. The lamps go down Number Six again with a steward who can stop them, the eleven\'s debts are void, and Corwin Dysart took the car up the hill and did not come back down. Maren Okafor is alive, whatever the city wrote. The Concern does not forget a claim.',
      end: 'done',
    },
    broken: {
      journal: 'The strike broke. The men off the Line dig Number Six; the Window starved the picket; and the Clean took Maren Okafor and hanged her from the post at Footgate as the leader of an action in breach of contract. The city wrote it that way. The slope keeps her rag on the post.',
      end: 'failed',
    },
    revolt: {
      journal: 'The Shift chose the car. Rafe\'s powder took the cable house off its mountings and the car will not run again; the Clean fired down Cascade until morning. Rafe is dead, and others with him. Maren lives, and leads an armed Shift she never wanted. The hill is shut.',
      end: 'done',
    },
  },
};

export const q_hs_parts: QuestDef = {
  id: 'q_hs_parts', title: 'Spare Parts', act: 'a2', start: 'notice', xp: 300,
  routes: [
    { id: 'lisle', kind: 'talk', label: 'Dr Lisle at the Weighhouse, on what service is', requires: { skill: 'speech', gte: 50 } },
    { id: 'book', kind: 'stealth', label: 'The Weighhouse book from the office locker', requires: { skill: 'security', gte: 50 } },
    { id: 'yield', kind: 'medicine', label: 'Read the yield column for what it is', requires: { skill: 'medicine', gte: 40 } },
    { id: 'ripper', kind: 'knowledge', label: 'Lev Ostrander, who carried holdfast on the Clinic floors' },
    { id: 'freight', kind: 'survival', label: 'Watch the freight car at two in the morning' },
    { id: 'expose', kind: 'talk', label: 'Put the book on the wall on Cascade' },
    { id: 'fee', kind: 'barter', label: 'Take the Weighhouse\'s money, for silence or for names' },
  ],
  stages: {
    notice: {
      journal: 'On the wall on Cascade, Saba Mekonnen\'s notice: her husband Dawit went to the Weighhouse to clear his paper, and the Window wrote DISCHARGED IN SERVICE. He has not written. His boots came back cleaned, with a tag in the tongue: 9-1182 — EFFECTS — RETURN TO KIN.',
      objectives: [
        { id: 'service', text: 'Find out what Clinic service is', done: { knows: 'hs_yield_read' } },
        { id: 'boots', text: 'Look at Dawit\'s boots', done: { knows: 'hs_boots_tag' }, optional: true },
        { id: 'freight', text: 'See what goes up on the freight at two', done: { knows: 'hs_freight_seen' }, optional: true },
      ],
      next: [{ if: { knows: 'hs_yield_read' }, stage: 'yield' }, { if: { flag: 'hs_parts' }, stage: 'yield' }],
    },
    yield: {
      journal: 'The Weighhouse weighs debtors by their organs: K L C H, kidney, liver, cornea, heart, graded for match. Clinic service is being taken apart on the Clinic floors up the hill, and the boots come home. The Cave-In feeds it: the eleven\'s debts went to their kin, and Nils Haber, whose father is under the fall, is in the Weighhouse\'s ward, queued.',
      objectives: [
        { id: 'decide', text: 'Decide what the Skirts is told', done: { flag: 'hs_parts' } },
        { id: 'nils', text: 'Nils Haber', done: { flag: 'hs_nils' }, optional: true },
      ],
      next: [{ if: PARTS('exposed'), stage: 'exposed' }, { if: PARTS('covered'), stage: 'covered' }, { if: PARTS('profit'), stage: 'profit' }],
    },
    exposed: {
      journal: 'The Weighhouse book went up on the wall on Cascade, and by midnight the Skirts had shut the Weighhouse and emptied its ward. Dr Lisle went up the hill on the freight. Provision\'s prices went up the next day, as everyone said they would. Nobody goes to be weighed now.',
      end: 'done',
    },
    covered: {
      journal: 'The Weighhouse is still open, and the book is not on the wall. Dr Lisle says it is the only door out of the Skirts that opens. People still go through it, and go up on the freight at two.',
      end: 'done',
    },
    profit: {
      journal: 'The Weighhouse paid me a hundred Tolls for a name. It is on her board now, in a clean hand.',
      end: 'failed',
    },
  },
};

export const q_hs_scrip: QuestDef = {
  id: 'q_hs_scrip', title: 'Scrip', act: 'a2', start: 'tin', xp: 200,
  routes: [
    { id: 'ledger', kind: 'barter', label: 'Read the changer\'s own ledger and make him change at par', requires: { skill: 'barter', gte: 50 } },
    { id: 'threat', kind: 'talk', label: 'The Shift reads his par column on the wall unless he changes at it', requires: { skill: 'speech', gte: 45 } },
    { id: 'forge', kind: 'tech', label: 'Re-seal the rate board at par for a day', requires: { skill: 'science', gte: 50 } },
    { id: 'pay', kind: 'barter', label: 'Pay the difference out of your own pocket' },
    { id: 'cut', kind: 'barter', label: 'Take the changer\'s cut' },
  ],
  stages: {
    tin: {
      journal: 'Ama Owusu at the changer\'s booth on Two-Twelve, with two children asleep on the bags and a tea tin of a hundred scrip saved over two years. Three fares down the Line to Meridian are seventy-five Tolls. Cosmin Vulpe changes scrip at six to one, which is sixteen.',
      objectives: [
        { id: 'rate', text: 'Find out who sets the rate', done: { knows: 'hs_seal' }, optional: true },
        { id: 'par', text: 'Find out what the rate should be', done: { knows: 'hs_par' }, optional: true },
        { id: 'fare', text: 'Get Ama\'s family down the Line, or don\'t', done: { flag: 'hs_scrip' } },
      ],
      next: [
        { if: SCRIP('par'), stage: 'par' }, { if: SCRIP('paid'), stage: 'paid' }, { if: SCRIP('forged'), stage: 'forged' }, { if: SCRIP('cut'), stage: 'cut' },
      ],
    },
    par: { journal: 'Vulpe changed Ama\'s tin at par: a hundred for a hundred. The guild takes the Concern\'s scrip at par on its own floor and gives the Skirts six to one; the spread is the guild\'s tithe on every miner\'s savings. Vulpe was docked a week for it. Ama\'s family took the seven o\'clock.', end: 'done' },
    paid: { journal: 'I paid the difference on Ama\'s fares myself. Her family took the seven o\'clock down the Line. The board at the booth still says six to one.', end: 'done' },
    forged: { journal: 'For one day the rate board at Two-Twelve said PAR under the Exchange\'s own seal, and the whole slope changed everything it had. Ama\'s family took the seven o\'clock. The guild sent a man up the Line, who took Vulpe\'s board, box and ticket; Provision\'s prices went up the same afternoon.', end: 'done' },
    cut: { journal: 'I took Vulpe\'s one in ten and sent Ama to change at six to one. Sixteen Tolls. She will save for another year.', end: 'failed' },
  },
};
