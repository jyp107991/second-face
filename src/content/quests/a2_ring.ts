import type { QuestDef } from '../../engine/quest/quest';
import type { Cond } from '../../engine/world/logic';

/**
 * Act 2, part 1, B3.12: the Dead Ring outside the Wall. The races at Clover (an activity repeatable as a service, with a
 * rivalry that ends in a final) and the matter of who chalks Leven's door. Story notes: story/STORY_PLAN_SECRET.md,
 * Build notes — B3.12.
 */

const BELLO = (v: string): Cond => ({ flag: 'dr_bello', eq: v });
const LEVEN = (v: string): Cond => ({ flag: 'dr_leven', eq: v });

export const q_dr_clover: QuestDef = {
  id: 'q_dr_clover', title: 'Racing at Clover', act: 'a2', start: 'slate', xp: 250,
  routes: [
    { id: 'drive', kind: 'survival', label: 'Drive it: push on the straights, cut across the broken ramp, hold when you must' },
    { id: 'tune', kind: 'tech', label: 'Tune the buggy yourself on Emil\'s bench', requires: { skill: 'mechanics', gte: 45 } },
    { id: 'line', kind: 'tech', label: 'Find the cut in the Heron\'s brake line and mend it before the final', requires: { skill: 'mechanics', gte: 40 } },
    { id: 'warn', kind: 'talk', label: 'Warn Bello that the Crown\'s book needs the Heron not to finish' },
    { id: 'court', kind: 'knowledge', label: 'Tell Bello what the Court of Accounts ruled on forecast fines', requires: { flag: 'prec_forecast_fine', eq: 'void' } },
    { id: 'paid', kind: 'barter', label: 'Take the Crown bookman\'s money, and say nothing' },
  ],
  stages: {
    slate: {
      journal: 'Outside the Wall, at the Loop\'s last halt, the Ring races buggies round the ramps of an old cloverleaf: Clover. Dorota Wilk drops the flag at dusk and keeps the slate; it is twenty to run, and the races are the only law the Ring keeps. Emil Sorensen hires out a buggy called the Mule for ten a heat.',
      objectives: [
        { id: 'buggy', text: 'Get something to race in', done: { any: [{ flag: 'dr_hired' }, { flag: 'dr_buggy' }, { flag: 'dr_heats', gte: 1 }] }, optional: true },
        { id: 'heat', text: 'Run a heat at dusk', done: { flag: 'dr_heats', gte: 1 } },
      ],
      next: [{ if: { flag: 'dr_heats', gte: 1 }, stage: 'rival' }],
    },
    rival: {
      journal: 'Nkechi Bello wins at Clover the way the sun comes up. She drives the Heron, a pre-war airport tug Emil built into the best buggy in the Ring, and she races for something: the Crown puts up a purse for the final, and a card.',
      objectives: [
        { id: 'meet', text: 'Talk to Bello in the pits', done: { flag: 'dr_bello_met' }, optional: true },
        { id: 'why', text: 'Find out what she is racing for', done: { knows: 'dr_bello_why' }, optional: true },
        { id: 'again', text: 'Race her again', done: { flag: 'dr_heats', gte: 2 } },
      ],
      next: [{ if: { flag: 'dr_heats', gte: 2 }, stage: 'final' }],
    },
    final: {
      journal: 'The final is on Dorota\'s slate, and it waits for the Mule: purse two hundred and a Precinct citizen card with the name line blank, put up by young people from the Crown who come down in the invitation car for the colour. Their bookman, a man in a good coat called Haverty, sits at the top of the stands with the book open on his knee.',
      onEnter: [{ set: 'dr_final_posted' }, { news: { tag: 'dr_final_posted', text: 'the final is on the slate at Clover: two hundred, and a card the Crown has put up', valence: 1, size: 4, at: 'meridian' } }],
      objectives: [
        { id: 'book', text: 'Find out what is in the Crown\'s book', done: { knows: 'dr_book_read' }, optional: true },
        { id: 'line', text: 'Make sure the final is clean', done: { flag: 'dr_line' }, optional: true, hidden: true },
        { id: 'run', text: 'Run the final at dusk', done: { flag: 'dr_final' } },
      ],
      next: [
        { if: BELLO('crippled'), stage: 'crippled' },
        { if: { flag: 'dr_final', eq: 'won' }, stage: 'card' },
        { if: { flag: 'dr_final', eq: 'bello' }, stage: 'hers' },
      ],
    },
    card: {
      journal: 'You won the final at Clover. Two hundred, and in your pocket a Crown envelope with a citizen card in it, blank on the name line. Bello is sitting on the Heron\'s bonnet in the pits, not looking at it.',
      objectives: [{ id: 'card', text: 'Decide what is written in the card', done: { any: [{ flag: 'dr_card' }, BELLO('inside')] } }],
      next: [{ if: BELLO('inside'), stage: 'inside' }, { if: { flag: 'dr_card' }, stage: 'champion' }],
    },
    hers: {
      journal: 'Bello won the final at Clover and wrote her own name in the Crown\'s card on the Heron\'s bonnet with a pencil stub. She has not gone up the halt yet.',
      objectives: [{ id: 'off', text: 'See her off', done: BELLO('inside') }],
      next: [{ if: BELLO('inside'), stage: 'inside' }],
    },
    inside: {
      journal: 'Nkechi Bello is on the right side of the gate. On Fridays now her brother stands on the same side of it as she does. The Heron is in Emil\'s pits with the seat bolted low, and it is yours.',
      end: 'done',
    },
    champion: {
      journal: 'You won Clover\'s final and kept what it paid. Bello is still in the pits, under the Heron, and she does not come out when you pass.',
      end: 'done',
    },
    crippled: {
      journal: 'The Heron\'s brakes went at the cloverleaf in the final. Bello lived; the leg is splinted with two tyre irons, and Emil says she will walk the way he says a weld will hold. The Crown\'s car took the card back up the Loop.',
      end: 'failed',
    },
  },
};

export const q_dr_leven: QuestDef = {
  id: 'q_dr_leven', title: 'Fire at Leven', act: 'a2', start: 'door', xp: 220,
  routes: [
    { id: 'board', kind: 'knowledge', label: 'Match the chalk on Leven\'s door to the yard\'s own tally board' },
    { id: 'night', kind: 'stealth', label: 'Wait at Leven\'s door in the small hours for whoever chalks it' },
    { id: 'book', kind: 'tech', label: 'The yard\'s tally book, from the locker in the boss\'s container', requires: { skill: 'security', gte: 45 } },
    { id: 'barred', kind: 'talk', label: 'Put the yard\'s chalking in front of Dorota\'s slate: the one law the Ring keeps' },
    { id: 'stripped', kind: 'barter', label: 'Broker a deal: Leven strips its own empty floors and sells the steel', requires: { skill: 'barter', gte: 45 } },
    { id: 'paid', kind: 'barter', label: 'Take the yard\'s money and look away' },
  ],
  stages: {
    door: {
      journal: 'Leven is a dead tower in the Ring, squatted to where its floors stop: ninety-one people on Ha-eun Seo\'s count. Somebody has chalked a ring with a bar on its door, and the towers that get that mark burn. Nobody is ever counted dead in the Ring, Ha-eun says, except by her.',
      objectives: [{ id: 'who', text: 'Find out who chalks the doors', done: { knows: 'dr_mark_who' } }],
      next: [{ if: { knows: 'dr_mark_who' }, stage: 'yard' }],
    },
    yard: {
      journal: 'The mark is the salvage yard\'s. Ruben Iturbe buys dead towers by the ton and a boy called Sami is paid in water to chalk the doors and carry the cans; a tower that burns is a tower nobody lives in, and a tower nobody lives in is steel. Sixty families eat off the yard. Twenty of them sleep in Leven.',
      objectives: [
        { id: 'why', text: 'Hear what Ruben has to say for it', done: { knows: 'dr_ruben_why' }, optional: true },
        { id: 'boy', text: 'Hear the boy out', done: { knows: 'dr_sami_told' }, optional: true },
        { id: 'book', text: 'The yard\'s own book', done: { any: [{ item: 'k_dr_yardbook' }, { knows: 'dr_yard_road' }] }, optional: true },
        { id: 'settle', text: 'Settle what happens to Leven', done: { flag: 'dr_leven' } },
      ],
      next: [{ if: LEVEN('barred'), stage: 'barred' }, { if: LEVEN('stripped'), stage: 'stripped' }, { if: LEVEN('paid'), stage: 'paid' }],
    },
    barred: {
      journal: 'Dorota read the yard\'s chalking out at the slate before the flag, and it is the Ring\'s law now: nobody sells Ruben\'s yard a pound and nobody buys a ton. Leven stands. The yard\'s men stand about at the slate with nothing to do, and some of their children sleep in Leven.',
      end: 'done',
    },
    stripped: {
      journal: 'Leven\'s people stripped their own empty upper floors and sold the steel to the yard by the ton, and the tower stands open to the sky above the tenth floor with washing still on the wires. Nobody burned. The Crown\'s road has its steel.',
      end: 'done',
    },
    paid: {
      journal: 'You took sixty Tolls from Ruben Iturbe to look the other way. The chalk on Leven\'s door is back, darker than before.',
      next: [{ if: { flag: 'dr_leven_burned' }, stage: 'burned' }],
    },
    burned: {
      journal: 'Leven burned in the night, floor on floor, to where the floors stop. Two died on the ninth: an old man and his son, who would not leave the stairs. Ha-eun Seo carried the count out under her arm and stands in the line outside the Wall with it now.',
      end: 'failed',
    },
  },
};
