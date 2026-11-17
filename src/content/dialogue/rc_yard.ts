import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, IN, KES, NINE, ODILE, TOLLS, WREN, bye, leave } from './rc_line';
import { STOCK_BOUGHT, STOCK_SOLD } from './rc_halts';

/**
 * Yard Nine, the depot (B5a): Dorcas dead on her pit and the Concern's offer (The Dead Engine), the fitter, the driver of
 * the through, the still, the Concern's field engineer (who also buys back the twelve's paper, or buys their hiding place),
 * and the rod rider on the curve. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B5.
 */

const GRID_CHROME: Cond = { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }] };
const RUNS: Cond = { flag: 'rc_engine' };
const ENGINE = (v: string, text: string, extra: Effect[]): Effect[] => [
  { set: 'rc_engine', value: v }, ...extra, { decision: { id: 'rc_engine', text } },
  { news: { tag: 'rc_dorcas_runs', text: 'Yard Nine has its second engine running again; the Line has two trains', valence: 3, size: 4, at: 'yard_nine' } },
];
export const ENGINE_CONTRACT: Effect[] = ENGINE('contract', 'Yard Nine signed the Concern\'s exclusive and Dorcas runs on a new Concern board. The Concern\'s freight has first call on every path for twenty years.', [
  { set: 'rc_concern_paths' }, { rep: { faction: 'concern', respect: 10 } }, { xp: 80 }, A(KES, -10), A(WREN, -3),
]);
export const ENGINE_DARK: Effect[] = ENGINE('dark', 'Dorcas\'s board was woken without the Concern\'s channel in it. She runs dark, and the Concern\'s man left Yard Nine the next morning.', [
  { set: 'rc_concern_marked' }, { set: 'rc_whitlock_gone' }, { rep: { faction: 'concern', respect: -10 } }, { xp: 200 }, A(KES, 10), A(NINE, 2),
]);
export const ENGINE_SPARE: Effect[] = ENGINE('spare', 'Dorcas runs on Halina Wrona\'s last spare board, pre-war silicon with nobody else in it. Four Ways\' signal box has no spare now.', [
  { take: 'k_rc_spare' }, { set: 'rc_box_nospare' }, { xp: 150 }, A(NINE, 3), A(KES, 5),
]);
/** B5d: the army board out of Kelso's shunter, in the Ashlands: pre-Scald, of the army's own makers, no channel, and Four
 * Ways keeps its last spare (`q_an_board`). */
export const ENGINE_ASHLANDS: Effect[] = ENGINE('ashlands', 'Dorcas runs on an army board out of a shunter at Kelso, in the Ashlands: pre-war, pre-Scald, with nobody in it. Four Ways keeps its spare.', [
  { take: 'k_an_board' }, { set: 'an_board', value: 'ida' }, { quest: 'q_an_board', start: true }, { rep: { faction: 'concern', respect: -5 } }, { xp: 200 }, A(NINE, 3), A(KES, 8),
]);

// ---------------------------------------------------------------- Dorcas, Sixty, the slate

export const d_rc_dorcas: DialogueDef = {
  id: 'd_rc_dorcas', owner: 'narrator',
  start: [{ if: RUNS, node: 'runs' }, { node: 'cold' }],
  nodes: {
    cold: {
      text: 'Dorcas, cold on her pit: square-nosed, plated, her cab armoured by hand with rivets the size of thumbs. Her controller housing is under the cab floor behind a steel plate on four bolts, and somebody has written on the plate in chalk: DON\'T.',
      again: 'Dorcas, cold. DON\'T.',
      effects: [{ quest: 'q_rc_engine', start: true }],
      interject: [{ companion: KES, if: { not: { knows: 'rc_leashed_known' } }, text: 'Kes has her ear against the plate before anyone can stop her. "Obviously it\'s not dead," she says. "It\'s listening. I know that hum. I have it in my neck." She stands up, white. "It\'s leashed. Somebody up the hill switched it off."', effects: [{ lead: 'l_rc_asleep' }, { learn: 'rc_leashed_known' }, A(KES, 3)] }],
      options: [
        { id: 'dorcas.mech', text: '(Take the plate off and look at the board.)', if: { not: { lead: 'l_rc_asleep' } }, check: { skill: 'mechanics', dc: 40 }, effects: [{ lead: 'l_rc_asleep' }], next: 'board', fail: 'blank' },
        { id: 'dorcas.sci', text: '(Read the board\'s lamps.)', if: { not: { lead: 'l_rc_asleep' } }, check: { skill: 'science', dc: 45 }, effects: [{ lead: 'l_rc_asleep' }], next: 'board', fail: 'blank' },
        { id: 'dorcas.kes', text: '(Kes: wake her without the channel.)', if: { all: [IN(KES), { knows: 'rc_leashed_known' }] }, effects: ENGINE_DARK, next: 'woke_dark' },
        { id: 'dorcas.jack', text: '(Go into the board through your own link and wake it without its channel.)', if: { all: [GRID_CHROME, { knows: 'rc_leashed_known' }, { not: IN(KES) }] }, check: { skill: 'science', dc: 55 }, effects: ENGINE_DARK, next: 'woke_dark', fail: 'jack_no' },
        { id: 'dorcas.army', text: '(Fit the army board out of Kelso\'s shunter.)', if: { item: 'k_an_board' }, check: { skill: 'mechanics', dc: 30, mods: [{ if: { flag: 'rc_ida_helps' }, dc: -30, why: 'Ida fits it with you' }] }, effects: ENGINE_ASHLANDS, next: 'woke_army', fail: 'spare_no' },
        { id: 'dorcas.spare', text: '(Fit Halina Wrona\'s spare board.)', if: { item: 'k_rc_spare' }, check: { skill: 'mechanics', dc: 30, mods: [{ if: { flag: 'rc_ida_helps' }, dc: -30, why: 'Ida fits it with you' }] }, effects: ENGINE_SPARE, next: 'woke_spare', fail: 'spare_no' },
        leave,
      ],
    },
    board: {
      text: 'The board is not burned. There is not a scorch on it. It is a Concern board, newer than anything else in the engine, with the closed eye etched beside the maker\'s number, and one green lamp on its edge that blinks, and blinks, and pauses, and blinks: a pattern, waiting for something to answer it.',
      again: 'The closed eye, and the blinking lamp.',
      options: [leave],
    },
    blank: { text: 'Bolts, a plate, a board, lamps. It means nothing to you except that something on it is still lit, which seems wrong for a dead engine.', again: 'Something still lit.', options: [leave] },
    woke_dark: {
      text: 'For a long moment nothing. Then the green lamp stops blinking and goes steady, and something under the cab floor thumps once like a heart starting, and Dorcas\'s gauges come up off their stops. Ida, in the shed doorway, sits down on a crate and puts her face in her oily hands.',
      again: 'Dorcas\'s gauges, off their stops.',
      interject: [{ companion: KES, text: '"Dark," Kes says, wiping her nose, which is bleeding a little. "Nobody up the hill can hear her now. Nobody can switch her off." She grins with blood on her teeth. "She\'s ours. Obviously."' }],
      options: [leave],
    },
    jack_no: { text: 'You go in, and the board is not empty: something on the far end of its channel turns, slowly, toward you. You pull out with a headache like a nail and the lamp still blinking.', again: 'The lamp, still blinking.', options: [leave] },
    woke_spare: { text: 'The old board goes in where the new one came out, its connectors fitted with shims Ida cuts from a tin. Dorcas starts on the third try with a bang that empties the shed of pigeons, and runs, roughly, like an old woman walking, and keeps running.', again: 'Dorcas, running roughly.', options: [leave] },
    woke_army: { text: 'The army board goes in where the Concern\'s came out, its old connectors a size too large; Ida shims them with strips cut from a ration tin and swears at them in a language you do not know. Dorcas coughs, catches, and runs, smoother than she has any right to, with one amber lamp steady under her cab floor and nothing on the other end of it at all.', again: 'Dorcas, running on the army board.', interject: [{ companion: KES, text: 'Kes puts her ear to the plate for a long time. "Nobody," she says at last, and laughs out loud. "Nobody in there at all. She\'s just an engine."', effects: [A(KES, 2)] }], options: [leave] },
    spare_no: { text: 'The old board will not seat without shims, and you do not know which. Ida comes and looks over your shoulder. "Give it here," she says.', again: '"Give it here."', effects: [{ set: 'rc_ida_helps' }], options: [leave] },
    runs: {
      text: [
        { if: { flag: 'rc_engine', eq: 'contract' }, text: 'Dorcas on the shed road with steam off her cooling tank and a new Concern board under her cab floor, its lamp steady green. CONCERN SERVICE AGREEMENT — 20 YEARS stencilled on her cab side in clean white.' },
        { text: 'Dorcas on the shed road, warm, ticking, her plate off the floor and the controller housing open to the air because Ida likes to look at it.' },
      ],
      again: 'Dorcas, warm.',
      options: [leave],
    },
  },
};

export const d_rc_sixty: DialogueDef = {
  id: 'd_rc_sixty', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'Sixty\'s bay, black with ninety years of oil, empty: Sixty is out on the Line, pulling the seven o\'clock or the through. A board on the wall says SIXTY — 60 — IN SERVICE, and under it somebody has chalked a tally of days without a rest. The tally is long.', again: 'Sixty\'s empty bay.', options: [leave] } },
};

export const d_rc_slate: DialogueDef = {
  id: 'd_rc_slate', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: RUNS, text: 'Ida\'s slate: DORCAS — IN SERVICE, the DEAD rubbed out so hard the slate shows through. SIXTY — REST DAY, for the first time in a year.' },
        { text: 'Ida\'s slate: SIXTY — IN SERVICE. DORCAS — DEAD — CONTROLLER. And under it, smaller: THROUGH HAS EVERY PATH.' },
      ],
      again: 'Ida\'s slate.',
      effects: [{ quest: 'q_rc_engine', start: true }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the people of the yard

export const d_rc_ida: DialogueDef = {
  id: 'd_rc_ida', owner: 'npc_rc_16',
  start: [{ if: { flag: 'rc_ida_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman with cropped grey hair and an old burn up one forearm, at a bench in the fitting shop with an injector in pieces in front of her. "Szalai. I keep the engines." She does not put the injector down. "Engine. Singular, this season. Dorcas is on her pit. She\'s not dead. She\'s sulking."',
      again: 'Ida, with the injector.',
      effects: [{ set: 'rc_ida_met' }, { quest: 'q_rc_engine', start: true }],
      options: [
        { id: 'ida.dorcas', text: 'What\'s wrong with Dorcas?', next: 'dorcas' },
        { id: 'ida.trade', text: '(Buy parts.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: [
        { if: RUNS, text: '"Two engines." Ida says it like a woman saying her children\'s names. "Two. What do you want?"' },
        { text: '"Mm?" Ida does not look up from the bench.' },
      ],
      again: 'Ida, at the bench.',
      options: [
        { id: 'ida.dorcas2', text: 'What\'s wrong with Dorcas?', if: { not: { seen: 'ida.dorcas' } }, next: 'dorcas' },
        { id: 'ida.letter', text: 'When did she die?', if: { all: [{ seen: 'ida.dorcas' }, { not: { lead: 'l_rc_timing' } }] }, next: 'letter' },
        { id: 'ida.other', text: 'Is there a board anywhere with nobody else in it?', if: { all: [{ seen: 'ida.dorcas' }, { not: RUNS }, { not: { seen: 'ida.other' } }] }, next: 'other' },
        { id: 'ida.sign', text: 'Sign Whitlock\'s paper. The Line needs two engines.', if: { all: [{ item: 'k_rc_offer' }, { not: RUNS }] }, next: 'sign' },
        { id: 'ida.pass', text: 'Dorcas runs.', if: { all: [RUNS, { not: { item: 'k_rc_pass' } }] }, effects: [{ give: 'k_rc_pass' }], next: 'pass' },
        { id: 'ida.trade2', text: '(Buy parts.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    dorcas: {
      text: '"Her controller. The board under the cab that tells everything else what to do." She puts down the injector at last. "It isn\'t burned. It isn\'t anything. One day she ran and the next she didn\'t. And a man in a clean coat came up from the Concern a week later with a new board in a box and a contract to go with it." She points with a screwdriver at the yard office. "He\'s still here. He\'s patient. They\'re all patient up there."',
      again: '"They\'re all patient up there."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    other: {
      text: '"Two." She holds up two oily fingers. "Halina\'s last spare in Four Ways\' box, which she won\'t give up and shouldn\'t, because if one of her instruments goes it stays gone." One finger down. "And the army\'s. Before the war the army ran a spur off the Line out east to its depot on the March, Kelso, and it had a yard engine there, a shunter, bought from somebody who wasn\'t the Concern. Crown and gear on the plate." She shrugs. "If the shed\'s standing. If the board\'s in it. If you want to walk into the Ashlands for an engine that isn\'t yours." She goes back to the injector. "Pickers at Spindle would know."',
      again: '"Pickers at Spindle would know."',
      effects: [{ lead: 'l_an_shunter' }, { quest: 'q_an_board', start: true }, { learn: 'loc_spindle' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    letter: {
      text: '"The night after I sent their first letter back." She does not hesitate; she has thought about it. "In the winter. They wanted the through to have every path, for twenty years, and Dorcas to pull it. I wrote NO on it and gave it to the driver to take up the Line." She picks up the injector again. "She died the next night. I\'m not stupid. I just can\'t prove anything to a board."',
      again: '"I just can\'t prove anything to a board."',
      effects: [{ lead: 'l_rc_timing' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    sign: {
      text: 'She looks at the offer for a long time. "Twenty years of the Concern\'s freight on every path, and the guild\'s seven o\'clock whenever it\'s convenient. And a board in her I didn\'t make and can\'t open." She looks out at the shed. "Two engines. The Line does need two engines."',
      again: '"The Line does need two engines."',
      options: [
        { id: 'ida.sign.yes', text: 'Sign it. Two engines.', effects: [...ENGINE_CONTRACT, { give: 'k_rc_pass' }], next: 'signed' },
        { text: 'No. Not yet.', next: 'again' },
      ],
    },
    signed: { text: 'She signs it without reading it again, in a fitter\'s capitals, and Whitlock comes and fits the new board himself in an hour, with tools that make no noise. Dorcas starts on the first try. Ida does not watch. "There," she says, and writes you a pass. "Ride her. You might as well."', again: 'Ida, not watching.', options: [{ text: 'Something else.', next: 'again' }] },
    pass: { text: 'She writes you a pass on a yard docket without being asked and stamps it with the depot\'s old brass stamp. "Ride her," she says. "Ride both of them. You got her going."', again: '"Ride both of them."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_rc_willem: DialogueDef = {
  id: 'd_rc_willem', owner: 'npc_rc_17',
  start: [{ if: { flag: 'rc_willem_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man in a driver\'s cap with the guild\'s green band, eating bread on the shed step. "Visser. I drive Sixty. I drive the through." He chews. "We used to stop at the halts. For water. For gossip. You knew who\'d died and who\'d married all down the Line. Now we stop for nothing." He brushes crumbs off his knees. "I run through. That\'s the job."',
      again: 'Willem, eating bread on the step.',
      effects: [{ set: 'rc_willem_met' }],
      options: [
        { id: 'willem.dorcas', text: 'What happened to Dorcas?', next: 'dorcas' },
        { id: 'willem.kettle', text: 'You drive the through past Kettle.', next: 'kettle' },
        bye,
      ],
    },
    again: {
      text: '"Bread?" Willem holds out the loaf.',
      again: 'Willem, with the loaf.',
      options: [
        { id: 'willem.dorcas2', text: 'What happened to Dorcas?', if: { not: { seen: 'willem.dorcas' } }, next: 'dorcas' },
        { id: 'willem.kettle2', text: 'You drive the through past Kettle.', if: { not: { seen: 'willem.kettle' } }, next: 'kettle' },
        { id: 'willem.warn', text: 'Take the through slow past East Halt. Walking pace. Don\'t ask me why.', if: { all: [{ flag: 'rc_east', eq: 'helped' }, { not: { flag: 'rc_willem_warned' } }, { not: { flag: 'rc_derailed' } }] }, effects: [{ set: 'rc_willem_warned' }, { memory: { npc: 'npc_rc_17', tag: 'warned', valence: 30, strength: 70 } }], next: 'warned' },
        bye,
      ],
    },
    dorcas: { text: '"Ida sent the Concern\'s letter back in the winter. I carried it up the Line myself. Dorcas died the next night." He tears the bread. "I\'m a driver. I don\'t think about boards. I think about it anyway."', again: '"I think about it anyway."', effects: [{ lead: 'l_rc_timing' }], options: [{ text: 'Something else.', next: 'again' }] },
    kettle: { text: '"Five times." He does not look up. "Sleeper on the rails, I stop, they open one car, they go. Nobody hurt." He stops chewing. "Then Gorse got up on that stock car\'s roof. I told him to sit down. He didn\'t sit down." He puts the bread away. "I don\'t blow for the halts any more. I blow at Kettle, every time. For Gorse. For the other one."', again: '"I blow at Kettle."', effects: [{ learn: 'rc_willem_kettle' }], options: [{ text: 'Something else.', next: 'again' }] },
    warned: { text: 'He looks at you for a long time. "Walking pace," he says. "Past East Halt." He doesn\'t ask. "Right."', again: '"Walking pace."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_rc_jide: DialogueDef = {
  id: 'd_rc_jide', owner: 'npc_rc_18',
  start: [{ node: 'hi' }],
  nodes: {
    hi: {
      text: 'A broad man in a leather apron among copper and tanks, in a heat that smells of bread gone sour on purpose. "Olatunji. The still." He taps a tank, which rings. "Openfield\'s spoiled grain comes up in sacks, I make spirit out of it, Sixty drinks it, and the Line moves. Bread into miles." He grins. "Some of it\'s for drinking. Not much. Some."',
      again: 'Jide, among the tanks.',
      options: [
        { id: 'jide.trade', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'jide.whitlock', text: 'The Concern\'s man in the yard office.', if: { not: { seen: 'jide.whitlock' } }, next: 'whitlock' },
        bye,
      ],
    },
    whitlock: { text: '"Whitlock." He wipes his hands. "Came up in the winter, looking forty. Still looks forty." He lowers his voice. "My father met a Concern man at the Skirts thirty years back, name of Whitlock, looked forty. Said he had a son." He shrugs. "Lots of sons, up the hill."', again: '"Still looks forty."', effects: [{ learn: 'rc_whitlock_age' }], options: [{ text: 'Something else.', next: 'hi' }] },
  },
};

const BUY_TWELVE = (n: number): Effect[] => [{ take: 'tolls', count: n }, ...STOCK_BOUGHT];

export const d_rc_whitlock: DialogueDef = {
  id: 'd_rc_whitlock', owner: 'npc_rc_19',
  start: [{ if: { flag: 'rc_whitlock_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in the yard office in grey that has never been near a yard, sitting at the clerk\'s desk as if it were his, with a box on it the size of a bread tin. He stands up to greet you, which nobody at Yard Nine does. "Anders Whitlock. The Concern." His smile is excellent. "I am here about the engine. And other property."',
      again: 'Whitlock, smiling.',
      effects: [{ set: 'rc_whitlock_met' }],
      passives: [{ attr: 'senses', dc: 7, text: 'His face is forty. His hands, folded on the box, are a great deal older than his face: thin skin, raised veins, the knuckles of a man who has been holding things for a long time.', effects: [{ learn: 'rc_whitlock_hands' }] }],
      options: [
        { id: 'whitlock.engine', text: 'The engine.', next: 'engine' },
        { id: 'whitlock.property', text: 'What other property?', next: 'property' },
        bye,
      ],
    },
    again: {
      text: '"Nobody has to decide anything today," Whitlock says pleasantly, as you come in.',
      again: 'Whitlock, pleasantly.',
      options: [
        { id: 'whitlock.engine2', text: 'The engine.', if: { not: { seen: 'whitlock.engine' } }, next: 'engine' },
        { id: 'whitlock.property2', text: 'What other property?', if: { not: { seen: 'whitlock.property' } }, next: 'property' },
        { id: 'whitlock.leash', text: 'Dorcas\'s board wasn\'t old. You switched it off.', if: { all: [{ knows: 'rc_leashed_known' }, { not: { seen: 'whitlock.leash' } }] }, next: 'leash' },
        { id: 'whitlock.buy', text: 'The paper on those twelve. What does it cost?', if: { all: [{ knows: 'rc_tower_inside' }, { not: { flag: 'rc_stock' } }] }, next: 'buy' },
        { id: 'whitlock.sell', text: 'I know where your twelve are.', if: { all: [{ knows: 'rc_tower_inside' }, { not: { flag: 'rc_stock' } }] }, next: 'sell' },
        bye,
      ],
    },
    engine: {
      text: '"The old board has reached the end of its service." He lays a contract on the box. "The Concern will fit a new one at no charge, in consideration of an exclusive arrangement for the Line\'s paths. Twenty years. The Concern\'s freight runs first; everything else runs when it can." He slides it across. "Take it to the depot\'s foreman. She is a sensible woman. She will see that two engines are better than one."',
      again: '"The old board has reached the end of its service."',
      effects: [{ give: 'k_rc_offer' }, { lead: 'l_rc_asleep' }, { quest: 'q_rc_engine', start: true }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    property: {
      text: '"Twelve labour contracts went astray on the Line in the spring, at Kettle. Bought at Ninebridge, paid for, sealed in a car, and the car opened by persons unknown." He does not stop smiling. "The Concern recovers its property. Fifteen Tolls a head to anyone who knows where it is. The halts are poor. Somebody always knows."',
      again: '"The Concern recovers its property."',
      effects: [{ learn: 'rc_finder_fee' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    leash: {
      text: 'For the first time he looks at you as if you were interesting. "Everything the Concern makes," he says, "remains in a small way the Concern\'s. That is not a secret. It is in the terms." He sits down again. "The yard refused our terms and the board was told it was no longer in service. It was not a punishment. It was a clause."',
      again: '"It was a clause."',
      effects: [{ learn: 'rc_leashed_known' }, { lead: 'l_rc_asleep' }],
      interject: [{ companion: KES, text: '"A clause," Kes says. Her hand has gone to the back of her neck without her noticing. "That\'s what they call it in the Skirts, too. Right before your arm stops working."', effects: [A(KES, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    buy: {
      text: '"Their residuals." He does not need to look. "Fifteen a head, twelve heads, a hundred and eighty. The Concern sells what it owns. Discharged, they may go where they like."',
      again: [{ if: { knows: 'rc_twelve_ninety' }, text: '"Ninety," Whitlock says again, pleasantly.' }, { text: '"A hundred and eighty."' }],
      options: [
        { id: 'whitlock.buy.odile', text: '(Odile leans on the desk with her glasses on their chain.)', if: { all: [IN(ODILE), { not: { knows: 'rc_twelve_ninety' } }] }, next: 'odile' },
        { id: 'whitlock.buy.90', text: '(Pay ninety.)', if: { all: [{ knows: 'rc_twelve_ninety' }, TOLLS(90)] }, effects: BUY_TWELVE(90), next: 'bought' },
        { id: 'whitlock.buy.180', text: '(Pay a hundred and eighty.)', if: { all: [{ not: { knows: 'rc_twelve_ninety' } }, TOLLS(180)] }, effects: BUY_TWELVE(180), next: 'bought' },
        { text: 'Not today.', next: 'again' },
      ],
    },
    odile: {
      speaker: ODILE,
      text: '"Twelve contracts you cannot find, for intake at a house that has just lost its door." Odile taps the desk with one finger. "My dear man, you are holding a sheet worth exactly what you can recover, and you cannot recover it, or you would not be sitting in a yard office offering fifteen a head to children. Ninety, and the Concern is rid of a bad sheet before the guild hears it was ever written." Whitlock regards her with real pleasure. "Ninety," he says.',
      again: '"Ninety," Whitlock says.',
      effects: [{ learn: 'rc_twelve_ninety' }, A(ODILE, 3)],
      options: [{ text: '(Back to the desk.)', next: 'buy' }],
    },
    bought: { text: 'He stamps twelve sheets DISCHARGED from a box in his drawer and hands you the stack with the closed eye on every one. "The Concern thanks you for your custom." By the next seven o\'clock the twelve are on West Halt\'s platform in the daylight, and four of them are asking Eamon about the length.', again: 'Twelve sheets, DISCHARGED.', options: [{ text: 'Something else.', next: 'again' }] },
    sell: {
      text: '"I am sure you do." He takes out a purse. "Fifteen a head."',
      again: '"Fifteen a head."',
      options: [
        { id: 'whitlock.sell.yes', text: '(Tell him: West Halt\'s water tower.)', effects: STOCK_SOLD, next: 'sold' },
        { text: 'No. I don\'t.', next: 'again' },
      ],
    },
    sold: { text: 'He counts a hundred and eighty onto the desk and writes your description on a docket where a name would go. "The Concern thanks you." He does not get up to see you out.', again: 'A hundred and eighty, on the desk.', interject: [{ companion: WREN, text: 'Wren walks out of the yard office and keeps walking, and when you catch her up at the curve she will not look at you. "Fifteen a head," she says. "The block pays better."' }], options: [bye] },
  },
};

export const d_rc_ferris: DialogueDef = {
  id: 'd_rc_ferris', owner: 'npc_rc_08',
  start: [{ if: { flag: 'rc_ferris_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man by a fire among the dead cars with a blanket round his shoulders and a face like a boot. "Doyle. I ride the rods." He offers you the fire with a hand. "Never pay for a ride a curve will give you."',
      again: 'Ferris, at his fire.',
      effects: [{ set: 'rc_ferris_met' }],
      options: [
        { id: 'ferris.rods', text: 'Ride the rods how?', next: 'rods' },
        { id: 'ferris.seen', text: 'You must see things from up there.', next: 'seen' },
        bye,
      ],
    },
    again: {
      text: '"Sit," says Ferris, and moves over on his log.',
      again: 'Ferris, moving over.',
      options: [
        { id: 'ferris.rods2', text: 'Ride the rods how?', if: { not: { seen: 'ferris.rods' } }, next: 'rods' },
        { id: 'ferris.seen2', text: 'You must see things from up there.', if: { not: { seen: 'ferris.seen' } }, next: 'seen' },
        { id: 'ferris.gorse', text: 'The night the guard was shot at Kettle. Were you on the through?', if: { all: [{ knows: 'rc_abe_named' }, { not: { knows: 'rc_ferris_saw' } }] }, next: 'gorse' },
        bye,
      ],
    },
    rods: { text: '"The main line bends out of the yard, west end. Everything slows for the bend. The through comes round at two, walking pace, half a minute. Ladder at every car\'s end." He mimes it: a step, a grip, a roll. "Lie flat. Get off where she slows again: Kettle, or the yard throat at the city. Don\'t get off at the bend. Never at the bend."', again: '"Never at the bend."', effects: [{ learn: 'rc_rods_known' }], options: [{ text: 'Something else.', next: 'again' }] },
    seen: { text: '"Green lamp at Kettle." He pokes the fire. "Handcar, from the west, four on it. They stop the through, open a car, gone in the time it takes to drink a cup. Never touch anyone up top." He looks at you sideways. "Nice people. Halt people. I keep my mouth shut, and they leave me bread by the curve."', again: '"Halt people."', effects: [{ lead: 'l_rc_handcar' }], options: [{ text: 'Something else.', next: 'again' }] },
    gorse: {
      text: 'He is quiet. "I was on the stock car\'s next car. Lying flat." He looks at the fire. "The guard got up on the stock car\'s roof when they opened it, and fired down into it. Five shots, quick. People in a box." He makes a small sound. "Then one shot from the bank and he went off the roof. One." He looks at you. "I\'d say so to anyone. To the clock, if it asked."',
      again: '"Five, then one. I\'d say so to the clock."',
      effects: [{ learn: 'rc_ferris_saw' }, { lead: 'l_rc_casings' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const YARD_DIALOGUES: DialogueDef[] = [d_rc_dorcas, d_rc_sixty, d_rc_slate, d_rc_ida, d_rc_willem, d_rc_jide, d_rc_whitlock, d_rc_ferris];
