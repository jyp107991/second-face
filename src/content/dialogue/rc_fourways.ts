import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, BANDITS, IN, ILYA, KES, KETTLE_OPEN, NIGHT, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './rc_line';

/**
 * Four Ways, the Junction (B5a): the stationmaster and his timetable law, the guild's factor and his reward, the
 * signalwoman and her register and instruments (pilot working), the clock, Batista's and its berths, the handcar sprints,
 * Four Ways' watch house. The rail bandits' line (Kettle Cut) turns here and most of its ends are chosen here; the
 * stationmaster's sentence on the boy who shot the guard (Murder Hangs) too. Story notes: story/STORY_PLAN_SECRET.md,
 * Build notes — B5.
 */

const OUTCOME_SETTLED: Cond = { any: [BANDITS('pilot'), BANDITS('deal'), BANDITS('paid')] };
const ABE_OPEN: Cond = { all: [{ flag: 'rc_abe_sentenced' }, { not: { flag: 'rc_abe' } }] };

/** Pilot working: the token instrument failed, every section worked by a pilot from its halt, paid by the guild. */
export const PILOT = (how: string): Effect[] => [
  { set: 'rc_bandits', value: 'pilot' }, { set: 'rc_pilot' }, { set: 'rc_pilot_how', value: how }, { set: 'rc_line', value: 'halts' }, { set: 'rc_halts', value: 'paid' },
  { set: 'rc_watch_stood_down' }, { set: 'rc_hw_trust' }, { xp: 200 }, A(NINE, 5), A(KES, 3), A(TAMSIN, 3), A(ASH, 5),
  { decision: { id: 'rc_bandits', text: 'You let Four Ways\' token instrument fail. Every train on the Line now stops at both halts for a pilot from that halt, and the guild pays for every passage. The hold-ups at Kettle stopped.' } },
  { news: { tag: 'rc_pilot', text: 'the Junction\'s instrument failed and every train on the Line stops at the halts again for a pilot; the halts sell water on the platforms', valence: 4, size: 6, at: 'fourways' } },
];
/** The deal at one table: the guild pays the halts again, the watch stands down, nobody names whose watch it was. */
const DEAL: Effect[] = [
  { set: 'rc_bandits', value: 'deal' }, { set: 'rc_line', value: 'shared' }, { set: 'rc_halts', value: 'paid' }, { set: 'rc_watch_stood_down' }, { set: 'rc_hw_trust' },
  { give: 'k_rc_pass' }, { rep: { faction: 'tollmen', respect: 5 } }, { xp: 220 }, A(ODILE, 5), A(WREN, 5), A(ASH, 3),
  { decision: { id: 'rc_bandits', text: 'You put the factor and the stationmaster at one table. The guild pays length money for every train at the halts again; the hold-ups at Kettle ended; nobody told the guild whose watch it was.' } },
  { news: { tag: 'rc_deal', text: 'the guild has agreed to stop its trains at the halts again and pay their lengths; Kettle has been quiet since', valence: 5, size: 6, at: 'fourways' } },
];
/** The band exposed to the guild: its riders go west at dawn. */
const EXPOSED: Effect[] = [
  { set: 'rc_bandits', value: 'exposed' }, { set: 'rc_line', value: 'guild' }, { set: 'rc_halts', value: 'starving' }, { set: 'rc_bounty_paid' },
  { give: 'tolls', count: 200 }, { give: 'k_rc_pass' }, { rep: { faction: 'tollmen', respect: 15 } }, { xp: 150 }, A(WREN, -10), A(ASH, -5), A(TAMSIN, -5),
  { decision: { id: 'rc_bandits', text: 'You told the guild\'s factor that the band at Kettle was West Halt\'s own watch, on the stationmaster\'s token. He paid you two hundred and a pass and sent his riders west.' } },
];
/** The stationmaster's price for silence: the hold-ups go on, and the guild levies the Line for its losses. */
const PAID: Effect[] = [
  { set: 'rc_bandits', value: 'paid' }, { set: 'rc_line', value: 'stationmaster' }, { set: 'rc_halts', value: 'fed' }, { set: 'rc_kettle_levy' },
  { give: 'tolls', count: 120 }, { give: 'k_rc_pass' }, { xp: 80 }, A(NINE, -5), A(ODILE, -5), A(WREN, 3),
  { decision: { id: 'rc_bandits', text: 'You took the stationmaster\'s hundred and twenty and a pass, and said nothing about Kettle. The hold-ups go on; the guild has put a levy on every fare.' } },
  { news: { tag: 'rc_levy', text: 'the guild has put a Kettle levy on every fare on the Line; the hold-ups go on', valence: -1, size: 5, at: 'fourways' } },
];
/** Abe Mutasa's ends under Brodsky's law. */
const ABE = (v: string, text: string, extra: Effect[] = []): Effect[] => [{ set: 'rc_abe', value: v }, ...extra, { decision: { id: 'rc_abe', text } }];

// ---------------------------------------------------------------- the stationmaster

const CONFRONT_TEXT = '"Sit down." He closes the watch and puts it in his waistcoat, which is the first time you have seen him not looking at it. "Yes. West Halt\'s watch, on my release. I was born at West Halt. My mother kept its length forty years, and the guild paid her by the train." He nods at the wire. "Then Kask signed his sheet with the Concern: the through runs on green past every halt, and length money is paid per stop. No stop, no money. A halt that cannot keep its length loses the length, and a Line that loses its lengths stops being a Line. So on the nights a sealed car is worth it, I release the section to the permanent way, and what the permanent way does in the dark is the halts\' business. The Concern\'s freight feeds the people the Concern\'s freight starves." A pause, exactly as long as he means it to be. "Nobody was hurt. That was the rule."';

export const d_rc_brodsky: DialogueDef = {
  id: 'd_rc_brodsky', owner: 'npc_rc_01',
  start: [
    { if: ABE_OPEN, node: 'sentenced' },
    { if: { all: [OUTCOME_SETTLED, { not: { flag: 'rc_abe' } }, { not: { flag: 'rc_abe_sentenced' } }, { not: { flag: 'rc_chela', eq: 'dead' } }] }, node: 'sentence' },
    { if: { flag: 'rc_brodsky_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A big grey man at a desk with a watch lying open on it beside the wire, who looks at the clock through his window before he looks at you. "Brodsky. Stationmaster." He makes a note. "You came in on foot, which is to say on no timetable at all. That is allowed. Walking is not a timetable offence."',
      again: 'Brodsky, checking his watch against the clock.',
      effects: [{ set: 'rc_brodsky_met' }],
      options: [
        { id: 'brodsky.law', text: 'What is timetable law?', next: 'law' },
        { id: 'brodsky.kettle', text: 'The guild\'s reward. Kettle Cut.', next: 'kettle' },
        { id: 'brodsky.halts', text: 'The halts look hungry.', next: 'halts' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'rc_pilot' }, text: '"The instrument has failed." He says it with perfect gravity, and checks his watch. "Every section by pilot. The timetable has stopped them for me." He nearly smiles. "On time."' },
        { if: BANDITS('deal'), text: '"The guild stops at the halts again, and pays." He checks his watch. "Kask bought me a drink at Batista\'s. I did not enjoy it. On time."' },
        { if: BANDITS('paid'), text: 'He looks at the clock, and at you, and says nothing about Kettle, which is what you were paid for. "On time."' },
        { if: { any: [BANDITS('exposed'), BANDITS('ambush')] }, text: 'He looks at the clock and not at you. "The guild has its riders on my Line. The halts have nothing." A note in the book. "On time, regardless."' },
        { text: '"On time." He looks up. "What is it?"' },
      ],
      again: 'Brodsky, checking his watch against the clock.',
      options: [
        { id: 'brodsky.law2', text: 'What is timetable law?', if: { not: { seen: 'brodsky.law' } }, next: 'law' },
        { id: 'brodsky.kettle2', text: 'The guild\'s reward. Kettle Cut.', if: { all: [{ not: { seen: 'brodsky.kettle' } }, KETTLE_OPEN] }, next: 'kettle' },
        { id: 'brodsky.halts2', text: 'The halts look hungry.', if: { not: { seen: 'brodsky.halts' } }, next: 'halts' },
        { id: 'brodsky.confront', text: 'West Halt\'s watch rides your release to Kettle.', if: { all: [{ knows: 'rc_watch_known' }, KETTLE_OPEN, { not: { knows: 'rc_brodsky_told' } }] }, next: 'confront' },
        { id: 'brodsky.options', text: 'About Kettle.', if: { all: [{ knows: 'rc_brodsky_told' }, KETTLE_OPEN] }, next: 'choose' },
        bye,
      ],
    },
    law: {
      text: '"Four rules." He counts them on a hand that has lost the top of one finger. "On the track out of timetable, the watch shoots. Theft from the Line, you are put off at the next halt in what you stand in. Murder, the rope. And the clock is right." He lets that sit. "Two hangings in nine years, and every halt from here to the sea eats. Find me a town with a better sum."',
      again: '"Four rules. The clock is right."',
      effects: [{ learn: 'rc_law_heard' }],
      interject: [{ companion: NINE, text: '"Four clauses and a clock," Nine says, after a moment. "The charter has eleven thousand. I am not certain it has a better sum." Brodsky looks at it for the first time with something like interest.' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    kettle: {
      text: '"Kettle is the guild\'s problem." He does not look up. "My timetable runs to Kettle and from Kettle. What happens between is weather."',
      again: '"Weather."',
      passives: [{ if: { knows: 'rc_held_up' }, label: 'The cutting', text: '"Weather." The woman with the rifle in the cutting called herself that, in the same voice, as if it were a word they had agreed on.', effects: [{ learn: 'rc_weather_echo' }] }],
      effects: [{ quest: 'q_rc_kettle', start: true }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    halts: {
      text: '"Through-running." He says it the way other people say a disease. "The guild and the Concern agreed it. The Concern\'s freight runs on green, Two-Twelve to the city, stopping nowhere. The guild pays a halt length money for every train that stops. Do the sum." He goes back to the wire. "West Halt was forty families. It is nineteen."',
      again: '"Do the sum."',
      effects: [{ lead: 'l_rc_length' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    confront: {
      text: CONFRONT_TEXT,
      again: '"Nobody was hurt. That was the rule."',
      effects: [{ learn: 'rc_brodsky_told' }, { learn: 'rc_brodsky_known' }, { learn: 'rc_why_known' }],
      interject: [
        { companion: ODILE, text: '"Per stop made," Odile says quietly. "I know that clause. I wrote the first one of those for a ferry company thirty years ago. It is the cheapest way there is to starve someone politely."', effects: [A(ODILE, 2)] },
        { companion: WREN, text: 'Wren has gone very still. "You rob the people who rob you, and give it to the people they rob," she says. "Kessler would have liked you. Then he\'d have taken a cut."' },
      ],
      options: [{ id: 'brodsky.hurt', text: 'Somebody was hurt.', next: 'gorse' }],
    },
    gorse: {
      text: '"Yes. Hamish Gorse." He takes the watch out again and does not open it. "A guard on the last car, with a rifle and a family at Yard Nine. The car they stopped that night was not freight. The guild had put people in it: a stock car of debtors off the Ninebridge block, bound for the Concern. One of them was Chela Ortega\'s brother, sold for West Halt\'s water tower. Chela stopped the car for him. Gorse fired on them. Somebody fired back." He closes his hand on the watch. "On my release. My rule broken, in my section."',
      again: '"On my release."',
      effects: [{ learn: 'rc_joaquin_known' }, { learn: 'rc_stock_known' }, { learn: 'rc_abe_named' }],
      interject: [{ companion: ASH, text: 'Ash says nothing for a long time. Then: "Who fired back?" Brodsky looks at him and does not answer, which is an answer.' }],
      options: [{ text: 'So what now?', next: 'choose' }],
    },
    choose: {
      text: '"Now?" He looks at the clock. "Now you know, and the guild does not. That is a thing with a price, and I am a man who pays prices. Say what you want."',
      again: '"Say what you want."',
      options: [
        { id: 'brodsky.stop', text: 'Stop the hold-ups. I\'ll get the guild to pay the halts again.', if: { not: { flag: 'rc_deal_open' } }, effects: [{ set: 'rc_deal_open' }], next: 'deal_open' },
        { id: 'brodsky.pilot', text: 'There\'s another way. Let the instrument fail.', if: { knows: 'rc_pilot_known' }, next: 'pilot' },
        { id: 'brodsky.price', text: 'What\'s my silence worth?', next: 'price' },
        { id: 'brodsky.tell', text: 'The guild will hear this from me.', next: 'tell' },
        { text: 'I need to think.', next: 'again' },
      ],
    },
    deal_open: {
      text: '"If you can get Severin Kask to pay a halt for a train that does not stop," he says, "I will stand the watch down myself and buy you a drink at Batista\'s, and you can ride my Line for nothing for the rest of your life. He will not." He goes back to the wire. "But try. I would like to see his face."',
      again: '"I would like to see his face."',
      options: [{ text: 'Something else.', next: 'choose' }],
    },
    pilot: {
      text: 'For a moment he looks almost happy. "Rule one hundred and eighty-three." He says it like a prayer he had stopped saying. "If the instrument failed, every train would have to stop at every halt for a pilot, and the guild would have to pay him. And nobody could blame the halts, or me. Only the instrument." Then the look goes. "It has never failed. Halina would know if it had not failed by itself. Ask her, not me. I have not had this conversation."',
      again: '"I have not had this conversation."',
      effects: [{ set: 'rc_pilot_brodsky_ok' }],
      options: [{ text: 'Something else.', next: 'choose' }],
    },
    price: {
      text: '"A hundred and twenty, and a pass on every section." He has it in the drawer; he has had it in the drawer for some time. "The guild will lose freight and put a levy on the fares to make it up, and the halts will eat. That is the sum."',
      again: '"A hundred and twenty, and a pass."',
      options: [
        { id: 'brodsky.price.take', text: '(Take it.)', effects: PAID, next: 'paid' },
        { text: 'No.', next: 'choose' },
      ],
    },
    paid: { text: 'He counts it out in guild notes and writes the pass himself: your description, not your name, the way the guild does. "On time," he says, and that is the end of it.', again: '"On time."', options: [{ text: 'Something else.', next: 'again' }] },
    tell: { text: '"Then tell him." He picks up the pen. "The guild will hang whoever fired, put the watch off the Line, and the halts will empty. The timetable will regret it. So will I." He writes the time in the book. "Close the door on your way out. It sticks."', again: '"Close the door. It sticks."', options: [{ text: 'Something else.', next: 'again' }] },
    // Murder hangs: Abe Mutasa, after the hold-ups are settled without the guild's justice
    sentence: {
      text: [
        { if: BANDITS('paid'), text: 'There is a paper on his desk in his own hand, and he turns it round so that you can read it. ABE MUTASA, OF WEST HALT. HAMISH GORSE, GUARD, AT KETTLE. MURDER. "You were paid not to know about Kettle," he says. "You were not paid not to know about this. There is a dead man on my Line, and I have four rules, and one of them is the rope. My watch has fetched him from West Halt. Dawn, at the platform\'s end." He looks at the clock. "The timetable regrets it."' },
        { text: 'There is a paper on his desk in his own hand, and he turns it round so that you can read it. ABE MUTASA, OF WEST HALT. HAMISH GORSE, GUARD, AT KETTLE. MURDER. "The hold-ups are over," he says. "There is still a dead man on my Line, and I have four rules, and one of them is the rope. My watch has fetched him from West Halt. Dawn, at the platform\'s end." He looks at the clock. "The timetable regrets it."' },
      ],
      again: '"Dawn, at the platform\'s end."',
      effects: [{ set: 'rc_abe_sentenced' }, { quest: 'q_rc_abe', start: true }],
      interject: [{ companion: ASH, text: '"He\'s nineteen," Ash says. "I was nineteen once, with a rifle, in a gully." He says it to the paper, not to Brodsky. "Nobody hanged me. That\'s the only reason I\'m here to say it."', effects: [A(ASH, 2)] }],
      options: [
        { id: 'brodsky.argue', text: 'The guard fired first.', check: { skill: 'speech', dc: 45, mods: [
          { if: { item: 'k_rc_casings' }, dc: -15, why: 'five cases from the guard\'s rifle, one from the bank' },
          { if: { knows: 'rc_ferris_saw' }, dc: -10, why: 'a man on the rods saw it' },
          { if: { knows: 'rc_chela_pleads' }, dc: -5, why: 'Chela Ortega asked you to speak for him' },
          { if: IN(ILYA), dc: -5, why: 'Ilya reads the cases like a page' },
        ] }, effects: ABE('exiled', 'You argued before Brodsky that the guard fired first. He did not hang Abe Mutasa; he put him off the Line, in what he stood in.', [{ set: 'rc_abe_where', value: 'openfield' }, { xp: 120 }, A(ASH, 10), A(TAMSIN, 5)]), next: 'exiled', fail: 'argue_no' },
        { text: '(Say nothing.)', exit: true },
      ],
    },
    sentenced: {
      text: '"Dawn." He does not look up.',
      again: '"Dawn."',
      options: [
        { id: 'brodsky.argue2', text: 'The guard fired first.', if: { not: { seen: 'brodsky.argue' } }, check: { skill: 'speech', dc: 45, mods: [
          { if: { item: 'k_rc_casings' }, dc: -15, why: 'five cases from the guard\'s rifle, one from the bank' },
          { if: { knows: 'rc_ferris_saw' }, dc: -10, why: 'a man on the rods saw it' },
          { if: { knows: 'rc_chela_pleads' }, dc: -5, why: 'Chela Ortega asked you to speak for him' },
          { if: IN(ILYA), dc: -5, why: 'Ilya reads the cases like a page' },
        ] }, effects: ABE('exiled', 'You argued before Brodsky that the guard fired first. He did not hang Abe Mutasa; he put him off the Line, in what he stood in.', [{ set: 'rc_abe_where', value: 'openfield' }, { xp: 120 }, A(ASH, 10), A(TAMSIN, 5)]), next: 'exiled', fail: 'argue_no' },
        { id: 'brodsky.cases', text: '(Put the guard\'s five cases and the boy\'s one on his desk.)', if: { all: [{ seen: 'brodsky.argue' }, { item: 'k_rc_casings' }, { not: { seen: 'brodsky.cases' } }] }, effects: ABE('exiled', 'You put the guard\'s five spent cases on Brodsky\'s desk beside the boy\'s one. He did not hang Abe Mutasa; he put him off the Line.', [{ set: 'rc_abe_where', value: 'openfield' }, { xp: 100 }, A(ASH, 10)]), next: 'exiled' },
        bye,
      ],
    },
    exiled: {
      text: 'He reads the paper again, the whole of it, the way he reads the wire. Then he writes under it, small: PUT OFF THE LINE. "Theft is put off," he says. "So is this. He goes south to Openfield in what he stands in, and if he comes back on my track the watch shoots him, and that is still the law." He looks at the clock. "The guard fired first. The rope does not have a clause for that. I have just written one."',
      again: '"PUT OFF THE LINE."',
      interject: [{ companion: NINE, text: '"An amendment," Nine says, very quietly, "by the only magistrate on the Line, in his own hand, under the clock." Its lens clicks. "I am noting it."' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    argue_no: { text: '"Everyone fires first," Brodsky says, "in the story the living tell." He does not raise his voice. "Dawn."', again: '"Dawn."', options: [{ text: 'Something else.', next: 'sentenced' }] },
  },
};

// ---------------------------------------------------------------- the guild's factor

const DEAL_MODS = [
  { if: { knows: 'rc_east_known' }, dc: -10, why: 'East Halt is pulling its own track up, a joint at a time' },
  { if: { knows: 'rc_watch_known' }, dc: -5, why: 'you can name the band without naming it to him' },
  { if: { lead: 'l_rc_length' }, dc: -5, why: 'length money per stop: his own clause' },
  { if: { item: 'k_rc_through' }, dc: -5, why: 'his sheet, open on his own desk' },
  { if: IN(ODILE), dc: -10, why: 'Odile reads the sheet back to him in a trader\'s voice' },
  { if: { flag: 'rc_stock', eq: 'sold' }, dc: 10, why: 'you sold the twelve to the Concern; he knows what you are' },
];

export const d_rc_kask: DialogueDef = {
  id: 'd_rc_kask', owner: 'npc_rc_04',
  start: [{ if: { flag: 'rc_kask_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a guild coat that has been to a good tailor and come back, at a desk with nothing on it but a pen and a cup. "Kask. Factor for the Line." He gives you his whole attention, which is a thing guild men are taught to do. "You have the look of somebody who has come about the reward. Most people in Four Ways have the look of somebody who has not."',
      again: 'Kask, his whole attention on you.',
      effects: [{ set: 'rc_kask_met' }],
      options: [
        { id: 'kask.reward', text: 'The reward. Tell me about Kettle.', next: 'reward' },
        { id: 'kask.through', text: 'What is through-running?', next: 'through' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'rc_bounty_paid' }, text: '"The guild pays its debts." He nods to you as to a colleague. "Anything else?"' },
        { if: BANDITS('deal'), text: '"I am paying halts for trains." He says it without inflection, as if it were weather. "I am told it is the price of having a Line. Anything else?"' },
        { if: { flag: 'rc_pilot' }, text: '"The instrument at Four Ways has failed," he says, "the week after you arrived. The guild is paying pilots." He looks at you for a long moment. "I do not suppose you know anything about instruments."' },
        { text: '"Factor for the Line." Kask waits.' },
      ],
      again: 'Kask, waiting.',
      options: [
        { id: 'kask.reward2', text: 'The reward. Tell me about Kettle.', if: { all: [{ not: { seen: 'kask.reward' } }, KETTLE_OPEN] }, next: 'reward' },
        { id: 'kask.through2', text: 'What is through-running?', if: { not: { seen: 'kask.through' } }, next: 'through' },
        { id: 'kask.bounty', text: 'I\'ll take your bounty.', if: { all: [KETTLE_OPEN, { not: { flag: 'rc_bounty_taken' } }, { seen: 'kask.reward' }] }, effects: [{ set: 'rc_bounty_taken' }, { set: 'rc_kettle_run' }, { learn: 'loc_lm_rc_kettle' }], next: 'bounty' },
        { id: 'kask.expose', text: 'The band at Kettle is West Halt\'s own watch, on the stationmaster\'s release.', if: { all: [{ knows: 'rc_watch_known' }, KETTLE_OPEN] }, next: 'proof' },
        { id: 'kask.deal', text: 'Pay the halts for the trains that don\'t stop, and Kettle goes quiet.', if: { all: [{ flag: 'rc_deal_open' }, KETTLE_OPEN, { not: { flag: 'rc_deal_failed' } }] }, next: 'deal' },
        { id: 'kask.claim', text: 'Kettle is done. West Halt\'s watch is broken.', if: { all: [BANDITS('ambush'), { not: { flag: 'rc_bounty_paid' } }] }, effects: [{ set: 'rc_bounty_paid' }, { give: 'tolls', count: 200 }, { give: 'k_rc_pass' }, { xp: 100 }], next: 'claimed' },
        { id: 'kask.abe', text: 'The one who shot Gorse is in Four Ways\' watch house: Abe Mutasa, of West Halt.', if: ABE_OPEN, effects: [{ set: 'rc_abe', value: 'guild' }, { give: 'tolls', count: 100 }, A(ASH, -15), A(TAMSIN, -10), A(WREN, -10), { decision: { id: 'rc_abe', text: 'You gave Abe Mutasa to the guild for a hundred Tolls. The guild hanged him at Kettle for Hamish Gorse.' } }], next: 'abe' },
        bye,
      ],
    },
    reward: {
      text: '"A band has been stopping freight at Kettle Cut since the spring. Five times. They lay a sleeper on the rails, open one sealed car, take what is in it, and leave." He turns the pen over. "They have never touched the coach. They have never opened the wrong car. Every car they took was the Concern\'s, and the Concern\'s manifests come up from Two-Twelve by wire to the box at the end of this platform and go nowhere else." He lets you do that sum. "Then a fortnight ago they shot Hamish Gorse off the last car. Two hundred, and a pass on every section, for the band."',
      again: '"Two hundred, and a pass."',
      effects: [{ lead: 'l_rc_reward' }, { lead: 'l_rc_manifest' }, { learn: 'loc_lm_rc_kettle' }, { quest: 'q_rc_kettle', start: true }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    through: {
      text: '"Progress." He means it. "The Concern\'s freight runs on green from Two-Twelve to the city, stopping nowhere, with first call on every path. It arrives a day sooner, the Concern pays the guild for the day, and the Line has a customer who pays on time." He folds his hands. "The halts complain. Halts always complain."',
      again: '"Progress."',
      effects: [{ learn: 'rc_through_heard' }],
      interject: [{ companion: ODILE, text: '"Severin," Odile says, in the voice of an old friend at a funeral, "you were my clerk once. You priced fish." Kask looks at her for a long moment and says, "Madame Marchetti. You taught me to."', effects: [A(ODILE, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    bounty: {
      text: '"Good." He writes your description in a book, not your name. "They ride when there is a car worth riding for. The through on its next night carries a car of Concern controllers, and someone on the Line knows it, because someone on the Line knows everything. Kettle, between midnight and four." He closes the book. "Bring me the band, or proof of it. The guild does not mind which."',
      again: '"Kettle, between midnight and four."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    proof: {
      text: '"Proof?" He does not sound surprised, which is the most surprising thing he has said.',
      again: '"Proof?"',
      options: [
        { id: 'kask.proof.register', text: '(Show him the signalwoman\'s fair copy of the register.)', if: { item: 'k_rc_register' }, effects: EXPOSED, next: 'exposed' },
        { id: 'kask.proof.tag', text: '(Show him the brass tag from the blind: WH 4.)', if: { item: 'k_rc_tag' }, effects: EXPOSED, next: 'exposed' },
        { id: 'kask.proof.wires', text: '(Show him the stationmaster\'s wire copies, ticked.)', if: { item: 'k_rc_wires' }, effects: EXPOSED, next: 'exposed' },
        { id: 'kask.proof.word', text: '(My word. Lay it out for him.)', check: { skill: 'speech', dc: 45 }, effects: EXPOSED, next: 'exposed', fail: 'word_no' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    exposed: {
      text: 'He reads it, or hears it, and then sits for a long time with the pen in his hand not writing anything. "West Halt," he says at last. "And Brodsky." He counts out two hundred in guild notes and writes a pass. "My riders go west at dawn. The guild needs the stationmaster\'s signals, so the guild will not have heard his name. It will hang whoever shot Gorse, and put the rest off the Line." He looks up. "You understand that the halts will empty."',
      again: '"My riders go west at dawn."',
      interject: [
        { companion: WREN, text: 'Outside, Wren spits on the platform. "Two hundred," she says. "That\'s what a halt costs."', effects: [] },
        { companion: NINE, text: '"Lawful," Nine says on the platform, and then, after a long time: "I have filed a great many lawful things."' },
      ],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    word_no: { text: '"Then it is a story." Kask smiles, not unkindly. "The guild pays for proof. Stories it can hear for nothing in Batista\'s."', again: '"The guild pays for proof."', options: [{ text: 'Something else.', next: 'again' }] },
    deal: {
      text: '"Pay a halt for a train that does not stop." He says it back to you slowly, to hear how it sounds. "And in return?"',
      again: '"And in return?"',
      options: [
        { id: 'kask.deal.argue', text: '(Lay it out: the halts are letting their track go; the Line goes with it; Kettle stops when the halts are paid; nobody needs to hang anyone.)', check: { skill: 'speech', dc: 55, mods: DEAL_MODS }, effects: DEAL, next: 'deal_ok', fail: 'deal_no' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    deal_ok: {
      text: 'He is quiet for a long time. Then he takes a sheet of guild paper and writes on it, and signs it, and blots it. "Length money per train passing, not per stop. Request stops at both halts, and the through to stop when flagged." He hands it to you to carry down the platform. "The Concern will be displeased. The Concern is displeased by most things it does not own." Brodsky reads it in his office, twice, and checks his watch, and goes out to the platform without his coat. That night West Halt\'s handcar does not go out, and in the morning there is a pass on your seat at Batista\'s in the stationmaster\'s hand.',
      again: 'The sheet: per train passing.',
      interject: [{ companion: ODILE, text: '"Per train passing," Odile says, reading it over your shoulder. "My dear. You have just rewritten a guild contract with a speech and a cup of tea. I never managed it in thirty years with a pen."', effects: [] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    deal_no: {
      text: '"No." He says it pleasantly. "The guild does not pay for nothing; that is the whole of the guild." He looks at you a little longer than before. "And I think somebody on this platform has been telling you things."',
      again: '"No."',
      effects: [{ set: 'rc_deal_failed' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    claimed: { text: 'He counts out two hundred and writes a pass without looking up. "The guild pays its debts." A pause. "West Halt\'s keeper came to ask where her niece was. I told her Kettle. It seemed the least I could do."', again: '"The guild pays its debts."', options: [{ text: 'Something else.', next: 'again' }] },
    abe: { text: 'A hundred, counted, and two riders sent across the platform before you have put it away. "The guild thanks you," Kask says. By the evening the boy has been taken to Kettle on the guild\'s handcar, and by the morning there is a rope on the signal post there.', again: '"The guild thanks you."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

// ---------------------------------------------------------------- the signalwoman, the instrument, the register

const HALINA_MODS = [
  { if: { knows: 'rc_watch_known' }, dc: -10, why: 'you know what she has written, and she has written it honestly' },
  { if: { knows: 'rc_why_known' }, dc: -5, why: 'the halts are starving on a clause' },
  { if: IN(NINE), dc: -10, why: 'Nine reads her rule 183 aloud, by its number' },
  { if: { flag: 'rc_pilot_brodsky_ok' }, dc: -5, why: 'the stationmaster has not had this conversation' },
];

export const d_rc_halina: DialogueDef = {
  id: 'd_rc_halina', owner: 'npc_rc_05',
  start: [{ if: { flag: 'rc_halina_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A small woman with white hair tied back hard, writing in a ledger by a lamp among brass instruments and levers worn bright, who finishes her line before she looks up. "Wrona. Signals." She puts the pen down exactly parallel to the page. "If you have come to move a lever, don\'t."',
      again: 'Halina Wrona, finishing her line.',
      effects: [{ set: 'rc_halina_met' }],
      options: [{ id: 'halina.work', text: 'What do you do here?', next: 'work' }, bye],
    },
    again: {
      text: [{ if: { flag: 'rc_pilot' }, text: 'A red card hangs on the instrument: SECTION WORKED BY PILOT — RULE 183. Halina is writing. "Pilot for the down seven o\'clock, West Halt, Eamon Fahy," she reads aloud as she writes it. "Paid."' }, { text: 'Halina writes the time, and looks up.' }],
      again: 'Halina, writing.',
      options: [
        { id: 'halina.work2', text: 'What do you do here?', if: { not: { seen: 'halina.work' } }, next: 'work' },
        { id: 'halina.read', text: 'Can I read the register?', if: { not: { flag: 'rc_register_open' } }, next: 'read' },
        { id: 'halina.fail', text: 'What happens if an instrument fails?', if: { all: [{ knows: 'rc_token_known' }, { not: { knows: 'rc_pilot_known' } }] }, next: 'fails' },
        { id: 'halina.copy', text: 'Would you write me a fair copy of that page?', if: { all: [{ knows: 'rc_register_read' }, { not: { item: 'k_rc_register' } }, KETTLE_OPEN] }, effects: [{ give: 'k_rc_register' }], next: 'copy' },
        { id: 'halina.ask', text: 'Let it fail. Tonight.', if: { all: [{ knows: 'rc_pilot_known' }, KETTLE_OPEN, { not: { flag: 'rc_halina_agrees' } }] }, check: { skill: 'speech', dc: 45, mods: HALINA_MODS }, effects: [{ set: 'rc_halina_agrees' }], next: 'agrees', fail: 'refuses' },
        { id: 'halina.spare', text: 'Yard Nine\'s engine needs a board with nobody else in it. Old silicon. Yours.', if: { all: [{ knows: 'rc_leashed_known' }, { not: { flag: 'rc_engine' } }, { not: { item: 'k_rc_spare' } }] }, check: { skill: 'speech', dc: 45, mods: [{ if: { flag: 'rc_pilot' }, dc: -20, why: 'you failed her instrument honestly' }, { if: IN(KES), dc: -10, why: 'Kes tells her what a leashed board is' }] }, effects: [{ give: 'k_rc_spare' }, { set: 'rc_box_nospare' }], next: 'spare', fail: 'spare_no' },
        bye,
      ],
    },
    work: {
      text: '"Each section of the Line is single track between two ends, and only one train may be on it. To enter, a driver must hold the section\'s token." She lifts a brass disc on a hoop from a slot. "The instruments at both ends are wired here. I release a token; it comes out at the end; the train carries it through and surrenders it at the far end; nothing else may enter until it is back. Token out. Token in." She puts it back. "And everything that is released, I write in the register. The register does not lie, so I do not write lies in it."',
      again: '"Token out. Token in."',
      effects: [{ learn: 'rc_token_known' }],
      interject: [{ companion: NINE, text: '"Absolute block," Nine says, with something close to reverence. "A system that does not trust anyone, and is therefore safe for everyone." Halina looks at it over her glasses. "Yes," she says. "Exactly that."', effects: [A(NINE, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    read: { text: '"The register is the Line\'s." She turns it round on the desk to face you. "Anyone may read it who can read."', again: '"Anyone may read it."', effects: [{ set: 'rc_register_open' }], options: [{ text: 'Something else.', next: 'again' }] },
    fails: {
      text: 'She takes a tin down from the shelf over the instruments and opens it: pages cut from a rule book older than the guild. "Rule one hundred and eighty-three. When an instrument fails, the section is worked by pilot. No train enters without a pilotman aboard, found at the section\'s end and paid by the operator for each passage." She closes the tin. "Every train would stop at every halt to take one up. In forty years my instruments have never failed."',
      again: '"Rule one hundred and eighty-three."',
      effects: [{ learn: 'rc_pilot_known' }, { give: 'k_rc_rulebook' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    copy: { text: 'She writes it out at once, without being asked twice, in a square hand: every line for the West Halt section on five nights, and the release beside each. She blots it and gives it to you. "I write what happens," she says. "What people do with it is theirs."', again: '"I write what happens."', options: [{ text: 'Something else.', next: 'again' }] },
    agrees: {
      text: 'She looks at the register a long time, and at the instruments, and then at you. "If it fails," she says, "it fails. I will write that it failed, and it will be true." She takes her coat from its peg. "After eleven. Come up the stair. Don\'t touch anything I haven\'t told you to touch."',
      again: '"After eleven."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    refuses: { text: '"No." Not angrily. "Forty years. They have never failed. I will not be the one who makes them liars." She picks up the pen. "Find a reason that is true, and come back."', again: '"Find a reason that is true."', options: [{ text: 'Something else.', next: 'again' }] },
    spare: { text: 'She is quiet. Then she goes to the cupboard under the instruments and comes back with something wrapped in oilcloth: a board, green, older than the Burn, with no mark on it but the maker\'s. "My last spare," she says. "If one of mine goes now, it stays gone." She puts it in your hands. "An engine should be its own. Go on."', again: '"My last spare."', options: [{ text: 'Something else.', next: 'again' }] },
    spare_no: { text: '"That is the last one." She shakes her head. "If an instrument goes and I have no spare, the Line stops. I am sorry for the engine."', again: '"That is the last one."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_rc_instrument: DialogueDef = {
  id: 'd_rc_instrument', owner: 'narrator',
  start: [{ if: { flag: 'rc_pilot' }, node: 'failed' }, { if: { all: [{ flag: 'rc_halina_agrees' }, NIGHT, KETTLE_OPEN] }, node: 'halina' }, { if: { all: [NIGHT, KETTLE_OPEN] }, node: 'night' }, { node: 'day' }],
  nodes: {
    day: { text: 'The token instruments: brass cases with a glass window in each, a slot of discs on hoops, a bell, a needle at LINE CLEAR. Halina watches your hands from her desk.', again: 'The instruments, LINE CLEAR, and Halina watching.', options: [leave] },
    night: {
      text: 'The box at night: the lamp turned low, Halina asleep on her cot under her coat, the instruments ticking. The West Halt instrument\'s case opens on a catch. Inside, the board, the relays, the bell\'s little hammer.',
      again: 'The instrument\'s case, open on its catch.',
      options: [
        { id: 'inst.fail', text: '(Set it to fail safe.)', if: { knows: 'rc_pilot_known' }, check: { skill: 'science', dc: 50 }, effects: PILOT('hand'), next: 'done', fail: 'bell' },
        { id: 'inst.kes', text: '(Kes: "Obviously it\'s just a relay.")', if: IN(KES), effects: PILOT('kes'), next: 'done' },
        { id: 'inst.nine', text: '(Nine: "Rule one hundred and eighty-three. I will certify the failure.")', if: { all: [IN(NINE), { knows: 'rc_pilot_known' }] }, effects: PILOT('nine'), next: 'done' },
        leave,
      ],
    },
    halina: {
      text: 'Halina is awake, with her coat on, standing by the West Halt instrument with its case open. "Watch," she says. She does not do anything you can follow: a relay out, a relay back in turned about, a thumb on the bell\'s hammer. The needle swings from LINE CLEAR to a word you have not seen before. She writes it in the register at once, and the time.',
      again: 'Halina, writing the time.',
      options: [{ id: 'inst.halina', text: '(Watch her write it.)', effects: PILOT('halina'), next: 'done' }],
    },
    done: { text: 'In the instrument\'s little window: FAILED. Halina hangs a red card on it in her square hand: SECTION WORKED BY PILOT — RULE 183. In the morning the seven o\'clock stops at West Halt, and waits, and a man in faded orange climbs into the cab with a rolled red flag.', again: 'FAILED.', options: [leave] },
    bell: { text: 'Your hand slips and the bell rings once, loud as a slap in the dark box, and Halina sits up on her cot. She does not shout. She looks at you, and at the case, and says, "Not like that." She closes it. In the morning the needle is at LINE CLEAR.', again: '"Not like that."', effects: [{ set: 'rc_instrument_tried' }], options: [leave] },
    failed: { text: 'FAILED, in the little window, and the red card: SECTION WORKED BY PILOT — RULE 183.', again: 'FAILED.', options: [leave] },
  },
};

export const d_rc_register: DialogueDef = {
  id: 'd_rc_register', owner: 'narrator',
  start: [{ if: { any: [{ flag: 'rc_register_open' }, NIGHT] }, node: 'page' }, { node: 'shut' }],
  nodes: {
    shut: { text: 'The register, open under Halina\'s hand. "Ask," she says, without looking up, "and you may read it."', again: 'The register, under Halina\'s hand.', options: [leave] },
    page: {
      text: 'The Line\'s register, a column for every section, every token out and in, every train, every release, in one square hand. On the nights the guild\'s poster names, and on one more, the same line in the West Halt section: SECTION RELEASED. OCCUPATION — PERMANENT WAY. 01:40. C.B. Then: TOKEN IN, 05:10. Then the through, at two, as on every other night, with nothing written beside it at all.',
      again: 'OCCUPATION — PERMANENT WAY. C.B.',
      effects: [{ lead: 'l_rc_token' }, { learn: 'rc_register_read' }, { quest: 'q_rc_kettle', start: true }],
      interject: [{ companion: NINE, text: '"She wrote it," Nine says. "Every night. The release, and his initials." It sounds, for a machine, very nearly moved. "Nobody asked her to lie, and so she did not."' }],
      options: [leave],
    },
  },
};

export const d_rc_rulebook: DialogueDef = {
  id: 'd_rc_rulebook', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: { text: 'RULE 183. FAILURE OF BLOCK INSTRUMENTS. When a token instrument fails, the section shall be worked by pilot. No train shall enter the section unless the pilotman is aboard. The pilotman shall be found at the section\'s end and shall be paid by the operator for each passage. The failure shall be entered in the register. And in pencil, in a square hand: NEVER YET.', again: 'RULE 183.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the platform: the clock, the reward, the law

export const d_rc_clock: DialogueDef = {
  id: 'd_rc_clock', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { knows: 'cal_future' }, text: 'The station clock: a white face the size of a cartwheel, black hands, and under the twelve a little window with a number in it: 30. It goes up by one every spring, by itself, on a day nobody in Four Ways has ever chosen. The Line\'s clocks keep the city\'s time, and the city\'s year.' },
        { text: 'The station clock: a white face the size of a cartwheel, black hands, and under the twelve a little window with a number in it: 30. Nobody in Four Ways can tell you what it counts. It goes up by one every spring, by itself, on a day nobody here has ever chosen. Everyone sets their watch by it.' },
      ],
      again: 'The clock. It is right.',
      effects: [{ learn: 'rc_clock_seen' }],
      options: [leave],
    },
  },
};

export const d_rc_poster: DialogueDef = {
  id: 'd_rc_poster', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'rc_bounty_paid' }, text: 'The guild\'s reward, with PAID stamped across it in green. Somebody has drawn a rope under the stamp in charcoal.' },
        { if: { flag: 'rc_kettle_levy' }, text: 'Over the guild\'s reward a new card: KETTLE LEVY — FIVE TOLLS ON EVERY LEG — BY ORDER OF THE GUILD. The reward is still under it, its corners curling.' },
        { if: { flag: 'rc_halts', eq: 'paid' }, text: 'The reward is gone. Its four corners are still under the tacks.' },
        { text: 'THE LINE — REWARD — TWO HUNDRED TOLLS AND A PASS ON ALL SECTIONS — FOR THE BAND THAT STOPS FREIGHT AT KETTLE CUT. HAMISH GORSE, GUARD OF THE GUILD, KILLED THERE IN THE DISCHARGE OF HIS DUTY. APPLY TO THE FACTOR.' },
      ],
      again: 'The guild\'s reward.',
      effects: [{ lead: 'l_rc_reward' }, { learn: 'loc_lm_rc_kettle' }, { quest: 'q_rc_kettle', start: true }],
      options: [leave],
    },
  },
};

export const d_rc_law: DialogueDef = {
  id: 'd_rc_law', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'rc_abe', eq: 'exiled' }, text: 'THE TIMETABLE IS THE LAW OF FOUR WAYS. 1. On the track out of timetable: the watch shoots. 2. Theft from the Line: put off at the next halt. 3. Murder: the rope. 4. The clock is right. And under the third rule, newer, in the stationmaster\'s hand: UNLESS FIRED UPON FIRST — PUT OFF.' },
        { text: 'Painted on a board in letters a hand high: THE TIMETABLE IS THE LAW OF FOUR WAYS. 1. On the track out of timetable: the watch shoots. 2. Theft from the Line: put off at the next halt. 3. Murder: the rope. 4. The clock is right.' },
      ],
      again: 'THE TIMETABLE IS THE LAW OF FOUR WAYS.',
      effects: [{ learn: 'rc_law_read' }],
      options: [leave],
    },
  },
};

export const d_rc_road_sign: DialogueDef = {
  id: 'd_rc_road_sign', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A guild sign on a post: TOLLHOUSE 9 — TWO DAYS — GUILD ROAD. Under it, in chalk: THE OLD SOUTH BRANCH. THE RAILS WENT TO MEND THE LINE.', again: 'TOLLHOUSE 9 — TWO DAYS.', effects: [{ learn: 'loc_tollhouse' }], options: [leave] } },
};

export const d_rc_guard: DialogueDef = {
  id: 'd_rc_guard', owner: 'npc_rc_g1', start: [{ node: 'hi' }],
  nodes: {
    hi: {
      text: [
        { if: { flag: 'rc_bounty_paid' }, text: 'The guard nods to you, which guild guards do not do. "Gorse was a friend," he says. "Thanks."' },
        { text: '"Ticket\'s at the window." The guard looks past you down the line, toward Kettle. "Stand back from the edge."' },
      ],
      again: 'The guard, looking toward Kettle.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- Four Ways' watch house: the cell

export const d_rc_fw_watch: DialogueDef = {
  id: 'd_rc_fw_watch', owner: 'narrator',
  start: [{ if: ABE_OPEN, node: 'cell' }, { node: 'look' }],
  nodes: {
    look: { text: 'Four Ways\' watch house: a bell on a bracket, a rack of rifles behind a chain, a cell with its door open and nobody in it, and on the door the four rules again.', again: 'The watch house, the bell, the open cell.', options: [leave] },
    cell: {
      text: 'The cell door is shut. Abe Mutasa sits on the floor inside with his back to the bars and his knees up, in his orange, and does not look round. "I\'m all right," he says, to nobody. "It\'s fine."',
      again: 'Abe, on the floor of the cell.',
      options: [
        { id: 'cell.talk', text: 'Tell me what happened at Kettle.', next: 'told' },
        { id: 'cell.pick', text: '(Pick the cell\'s lock while the watch sleeps.)', if: NIGHT, check: { skill: 'security', dc: 45 }, effects: ABE('fled', 'You took Abe Mutasa out of Four Ways\' cell in the night. He went south toward Openfield, and Brodsky has not forgotten whose hand it was.', [{ set: 'rc_abe_where', value: 'openfield' }, { memory: { npc: 'npc_rc_01', tag: 'freed_abe', valence: -30, strength: 80 } }, { xp: 80 }, A(ASH, 10), A(WREN, 5)]), next: 'out', fail: 'pick_no' },
        leave,
      ],
    },
    told: {
      text: '"He fired at the car. The stock car, with Chela\'s brother in it, with all of them in it. Five times, from the roof." He says it to his knees. "I had the pistol for the lamp. For the sleeper. I fired once." He looks at you for the first time. "I\'d do it again, and I can\'t sleep. Both. Is that allowed?"',
      again: '"Both. Is that allowed?"',
      effects: [{ learn: 'rc_abe_story' }],
      interject: [{ companion: ASH, text: 'Ash crouches at the bars so that his face is level with the boy\'s. "Yes," he says. "That\'s allowed. That\'s the only thing that\'s allowed." Abe looks at him for a long time.', effects: [A(ASH, 3)] }],
      options: [{ text: 'Something else.', next: 'cell' }],
    },
    out: { text: 'The lock gives. Abe gets up as if he has forgotten how, and you walk him out past the bell, under the clock, down the old south branch in the dark, and at the end of it he goes on alone, south, toward Openfield, without looking back. In the morning the cell is open and the platform\'s end has nothing on it.', again: 'The open cell.', options: [leave] },
    pick_no: { text: 'The lock is better than it looks, and the watch\'s bell is closer than you thought. You leave before the lamp comes on. Abe does not look round.', again: 'The lock, holding.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Batista's, the berths, the sprints

export const d_rc_nuno: DialogueDef = {
  id: 'd_rc_nuno', owner: 'npc_rc_07',
  start: [{ if: { flag: 'rc_nuno_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The old refreshment room: tiles, a long counter, a mirror with the station\'s name in gilt half rubbed off it, and a broad man with a moustache drying cups. "Batista\'s. Food, drink, and a berth on the siding if you can pay for one." He looks at the clock through the window. "Nobody drinks before the seven o\'clock. After, everybody."',
      again: 'Nuno Batista, drying a cup.',
      effects: [{ set: 'rc_nuno_met' }],
      options: [{ id: 'nuno.trade', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true }, { id: 'nuno.gorse', text: 'The guard who was killed at Kettle.', next: 'gorse' }, bye],
    },
    again: {
      text: [{ if: { flag: 'rc_halts', eq: 'paid' }, text: '"The halts are buying again," Nuno says. "Bread, nails, my second-best bitters. I don\'t know what you did." He pours you one. "On the house. Don\'t tell me."' }, { text: '"Back?" He holds a cup up to the light. "What\'ll it be?"' }],
      again: 'Nuno, holding a cup to the light.',
      options: [
        { id: 'nuno.trade2', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'nuno.gorse2', text: 'The guard who was killed at Kettle.', if: { not: { seen: 'nuno.gorse' } }, next: 'gorse' },
        { id: 'nuno.stock', text: 'What do people say about Kettle?', if: { all: [{ seen: 'nuno.gorse' }, { not: { seen: 'nuno.stock' } }] }, next: 'talk' },
        bye,
      ],
    },
    gorse: { text: '"Hamish Gorse. Drank here. Paid every time, which is more than I can say for the guild." He sets the cup down. "He had a wife at Yard Nine and a temper on the roof of a car. Both true. Put that on his stone."', again: '"Both true."', options: [{ text: 'Something else.', next: 'again' }] },
    talk: { text: '"That the band never takes a purse, and never opens the wrong car." He wipes the counter where it is already clean. "And that the last car they opened wasn\'t freight. People in it. Nobody says where they went. Nobody here is stupid."', again: '"Nobody here is stupid."', effects: [{ lead: 'l_rc_sealed' }, { learn: 'rc_people_rumour' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_rc_berth: DialogueDef = {
  id: 'd_rc_berth', owner: 'narrator', start: [{ if: { flag: 'rc_berth_rented' }, node: 'mine' }, { node: 'let' }],
  nodes: {
    let: {
      text: 'The last sleeper car on the dead siding: a pre-war berth with a bed that folds down, a locker, a window with its glass still in it and a curtain somebody made from a guild flag. A card on the door: BERTH TO LET — ASK BATISTA. Batista asks twenty-five Tolls, and says it is yours as long as the siding stands.',
      again: 'BERTH TO LET. Twenty-five Tolls.',
      options: [
        { id: 'berth.rent', text: '(Pay twenty-five Tolls.)', if: TOLLS(25), effects: [{ take: 'tolls', count: 25 }, { set: 'rc_berth_rented' }, { decision: { id: 'rc_berth', text: 'You rented a berth in a sleeper car on Four Ways\' dead siding.' } }], next: 'mine' },
        leave,
      ],
    },
    mine: {
      text: 'Your berth on the dead siding: the fold-down bed, the locker, the guild-flag curtain, the clock\'s chime coming in through the glass every quarter hour.',
      again: 'Your berth on the siding.',
      options: [{ id: 'berth.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave],
    },
  },
};

const SPRINT_HOURS: Cond = { hour: { from: 17, to: 22 } };
const SPRINT_WIN: Effect[] = [{ give: 'tolls', count: 30 }, { inc: 'rc_sprint_wins' }, { xp: 15 }];

export const d_rc_sprint: DialogueDef = {
  id: 'd_rc_sprint', owner: 'narrator', start: [{ if: SPRINT_HOURS, node: 'slate' }, { node: 'day' }],
  nodes: {
    day: { text: 'Two handcars on the old south branch\'s stop-block and a slate on a post: SPRINTS AT DUSK — FIVE IN — THIRTY TO THE CAR THAT CROSSES FIRST. Under it, names and times in chalk. The best is PETAR — 2 MIN 10.', again: 'SPRINTS AT DUSK.', options: [leave] },
    slate: {
      text: [
        { if: { flag: 'rc_sprint_wins', gte: 3 }, text: 'Dusk on the old south branch: the two handcars on the line, a crowd on the old platform, and your name on the slate three times over, which the crowd has opinions about. Petar, the watch\'s best, spits on his hands. "Again?"' },
        { text: 'Dusk on the old south branch: two handcars on the chalk line, a crowd on the old platform with bets in their fists, and Petar, the watch\'s best, a big man with forearms like rails, spitting on his hands. "Five in," somebody says. "Half a mile, the points at the far end. Pump, don\'t pray."' },
      ],
      again: 'Two handcars on the chalk line.',
      options: [
        { id: 'sprint.race', text: '(Five Tolls in. Take the left car.)', if: TOLLS(5), effects: [{ take: 'tolls', count: 5 }], next: 's1', repeat: true },
        leave,
      ],
    },
    s1: {
      speaker: 'narrator',
      text: 'The flag drops. The handle comes up into your hands and goes down under them and the car moves, and the next stroke is easier, and Petar\'s car is a yard ahead and then two.',
      again: 'The flag drops.',
      options: [
        { id: 'sprint.pump', text: '(Pump like your life depends on it.)', check: { attr: 'brawn', dc: 6 }, next: 'ahead', fail: 'behind' },
        { id: 'sprint.pace', text: '(Find a rhythm and keep it.)', next: 'even' },
      ],
    },
    ahead: { speaker: 'narrator', text: 'You come level with Petar halfway and then past him by a length, arms burning. The points at the far end come up fast: a switch in the rails that throws a careless car into the grass.', again: 'A length ahead, the points coming.', options: [
      { id: 'sprint.ahead.flat', text: '(Take the points flat out.)', check: { attr: 'reflex', dc: 7 }, effects: SPRINT_WIN, next: 'win', fail: 'off' },
      { id: 'sprint.ahead.brake', text: '(Brake for the points.)', effects: SPRINT_WIN, next: 'win' },
    ] },
    even: { speaker: 'narrator', text: 'Stroke for stroke with Petar the whole way down, the crowd on its feet. The points come up.', again: 'Stroke for stroke.', options: [
      { id: 'sprint.even.flat', text: '(Take the points flat out.)', check: { attr: 'reflex', dc: 7 }, effects: SPRINT_WIN, next: 'win', fail: 'off' },
      { id: 'sprint.even.brake', text: '(Brake for the points.)', next: 'lose' },
    ] },
    behind: { speaker: 'narrator', text: 'Your arms go at the halfway post and Petar\'s car pulls away, three lengths, four. The points come up.', again: 'Four lengths down.', options: [
      { id: 'sprint.behind.flat', text: '(Take the points flat out and hope.)', check: { attr: 'reflex', dc: 8 }, next: 'close', fail: 'off' },
      { id: 'sprint.behind.brake', text: '(Brake for the points.)', next: 'lose' },
    ] },
    win: { speaker: 'narrator', text: 'Over the line first, with the crowd coming down off the old platform and somebody pressing thirty Tolls into your hand. Petar shakes it after them. "Again tomorrow," he says.', again: 'Over the line first.', options: [{ text: '(Back to the slate.)', next: 'slate' }, leave] },
    close: { speaker: 'narrator', text: 'Through the points so fast the car lifts on one side, and you nearly catch him, and don\'t. Second. The crowd likes you better for it than Petar.', again: 'Second, by a hand.', options: [{ text: '(Back to the slate.)', next: 'slate' }, leave] },
    lose: { speaker: 'narrator', text: 'Petar\'s car crosses first. He lifts a hand off the pump handle without looking round, which in Four Ways is a great deal.', again: 'Petar first.', options: [{ text: '(Back to the slate.)', next: 'slate' }, leave] },
    off: { speaker: 'narrator', text: 'The points throw you. The car goes into the grass and you go further, and lie looking at the first stars while the crowd laughs and somebody pays somebody else.', again: 'Into the grass at the points.', effects: [{ time: 30 }], options: [{ text: '(Back to the slate.)', next: 'slate' }, leave] },
  },
};

/** Chela in the stocks after the guild's riders: put off the Line at the next train. */
export const d_rc_chela_off: DialogueDef = {
  id: 'd_rc_chela_off', owner: 'npc_rc_02', start: [{ node: 'stocks' }],
  nodes: {
    stocks: {
      text: 'Chela Ortega in the stocks at the platform\'s end, where the four rules are, with her braid cut off and her boots taken. She looks at you and keeps looking. "They hanged Abe at Kettle at dawn," she says. "On the signal post. Kask watched. I\'m to go west on the next seven o\'clock in what I stand in, which isn\'t much." She looks at your boots. "You came in on your own feet. Remember that."',
      again: 'Chela, in the stocks, looking at you.',
      effects: [{ set: 'rc_chela', value: 'off' }, { memory: { npc: 'npc_rc_02', tag: 'exposed_her', valence: -60, strength: 90 } }],
      interject: [{ companion: WREN, text: 'Wren goes to the stocks with her water bottle and holds it to Chela\'s mouth without a word, and Chela drinks, and neither of them looks at you.', effects: [A(WREN, -5)] }],
      options: [{ id: 'chela.off.water', text: '(Give her water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }], exit: true }, leave],
    },
  },
};

export const FOURWAYS_DIALOGUES: DialogueDef[] = [d_rc_brodsky, d_rc_kask, d_rc_halina, d_rc_instrument, d_rc_register, d_rc_rulebook, d_rc_clock, d_rc_poster, d_rc_law, d_rc_road_sign, d_rc_guard, d_rc_fw_watch, d_rc_nuno, d_rc_berth, d_rc_sprint, d_rc_chela_off];
