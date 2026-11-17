import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { LEASHED } from '../chrome/catalogue';

/**
 * The Skirts under Halcyon (B4a): the place, the Cave-In (Six East) and the Shift's strike (No Lamps Down), the gallery
 * under Number Six, Footgate and the Contract Office. Spare Parts, Scrip and the Skirts' services are in hs_parts.ts; Kes
 * in hs_kes.ts. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B4.
 */

export const KES = 'npc_hs_01';
export const TAMSIN = 'npc_c9_03';
export const WREN = 'npc_rd_03';
export const ILYA = 'npc_sh_17';
export const ODILE = 'npc_nb_03';
export const ASH = 'npc_of_03';
export const NINE = 'npc_md_nine';

export const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
export const K = (by: number): Effect => A(KES, by);
export const bye = { text: 'That\'s all.', exit: true };
export const leave = { text: '(Leave it.)', exit: true };
export const NIGHT: Cond = { hour: { from: 22, to: 5 } };
export const DAY: Cond = { hour: { from: 7, to: 19 } };
export const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
export const KES_IN: Cond = { inParty: KES };

/** The strike is on until one of its three ends. */
export const SHIFT_OPEN: Cond = { not: { flag: 'hs_shift' } };
export const SHIFT_WON: Cond = { flag: 'hs_shift', eq: 'won' };
export const SHIFT_BROKEN: Cond = { flag: 'hs_shift', eq: 'broken' };
export const SHIFT_REVOLT: Cond = { flag: 'hs_shift', eq: 'revolt' };
/** The car runs once the strike is over, unless the cable house is gone. */
export const CAR_RUNS: Cond = { any: [SHIFT_WON, SHIFT_BROKEN] };
/** The scabs off the Line will not dig: talked round, or their paper bought out. */
export const SCABS_GONE: Cond = { any: [{ flag: 'hs_scabs', eq: 'turned' }, { flag: 'hs_scabs', eq: 'sent' }] };
/** Rafe still has his six cases and his plan. */
export const RAFE_ARMED: Cond = { all: [{ not: { flag: 'hs_rafe_dead' } }, { not: { item: 'k_hs_powder' } }, { not: { any: ['told', 'stood_down', 'disarmed'].map((v) => ({ flag: 'hs_rafe', eq: v })) } }] };
/** Anything that tells a reader the gallery was robbed, not fallen. */
/** Nils Haber has not been taken up the hill: a won strike voids his father's paper and he walks out of the Weighhouse. */
export const NILS_NOT_UP: Cond = { not: { flag: 'hs_nils', eq: 'up' } };
export const FREE_NILS: Effect[] = [{ set: 'hs_nils', value: 'freed' }];
export const PROOF: Cond = { any: [{ knows: 'hs_robbed' }, { item: 'k_hs_log' }, { item: 'k_hs_order' }, { flag: 'hs_pim_word' }] };

/** The three ends of the strike (keystone 12: Maren Okafor). Kes hears every one of them. */
export const STRIKE_WON = (how: string, text: string): Effect[] => [
  { set: 'hs_shift', value: 'won' }, { set: 'hs_shift_how', value: how }, { set: 'ks_maren', value: 'lives' }, { set: 'forecast_broken' },
  { set: 'hs_dysart_gone' }, { set: 'hs_marked' }, { set: 'hs_dead_up' },
  { rep: { faction: 'the_shift', respect: 20 } }, { rep: { faction: 'concern', respect: -10 } }, K(10), { xp: 250 },
  { decision: { id: 'hs_shift', text } },
  { news: { tag: 'hs_shift_won', text: 'the Shift won its strike at Number Six in the Skirts: the dead\'s debts void, the lamps going down again', valence: 6, size: 8, at: 'skirts' } },
];
export const STRIKE_BROKEN = (how: string, text: string): Effect[] => [
  { set: 'hs_shift', value: 'broken' }, { set: 'hs_shift_how', value: how }, { set: 'ks_maren', value: 'hanged' },
  { rep: { faction: 'the_shift', respect: -20 } }, K(-20),
  { decision: { id: 'hs_shift', text } },
  { news: { tag: 'hs_shift_broken', text: 'the strike at Number Six was broken; the Concern hanged the Shift\'s leader from the post at Footgate', valence: -8, size: 8, at: 'skirts' } },
];
export const STRIKE_REVOLT = (clean: boolean): Effect[] => [
  { set: 'hs_shift', value: 'revolt' }, { set: 'hs_shift_how', value: 'car' }, { set: 'hs_car_down' }, { set: 'hs_gate_shut' }, { set: 'hs_rafe_dead' },
  { set: 'ks_maren', value: 'lives' }, { set: 'forecast_broken' }, ...(clean ? [{ set: 'hs_revolt_clean' } as Effect] : []),
  { rep: { faction: 'the_shift', respect: 10, fear: 20 } }, { rep: { faction: 'concern', respect: -30 } }, K(-10), { xp: 150 },
  { decision: { id: 'hs_shift', text: clean ? 'The Shift blew Footgate\'s cable house with Rafe\'s powder. You set the charge; the crew got out. Three died, Rafe among them.' : 'The Shift blew Footgate\'s cable house with Rafe\'s powder. Five died, Rafe among them, and the car will not run again.' } },
  { news: { tag: 'hs_revolt', text: 'the Shift blew the funicular\'s cable house in the Skirts; the Clean fired down Cascade; the car is stopped for good', valence: -4, size: 9, at: 'skirts' } },
];

/** Spare Parts' first end: the Weighhouse book shown to the Skirts. The crowd empties the ward, Nils with it. */
export const PARTS_EXPOSED = (how: string, text: string): Effect[] => [
  { set: 'hs_parts', value: 'exposed' }, { set: 'hs_parts_how', value: how }, { set: 'hs_lisle_gone' }, { set: 'hs_prices_up' }, ...FREE_NILS,
  K(10), { xp: 150 }, { rep: { faction: 'concern', respect: -10 } }, { decision: { id: 'hs_parts', text } },
  { news: { tag: 'hs_parts_exposed', text: 'the Skirts shut the Concern\'s Weighhouse after its book went up on the wall: the debtors it sent up the hill were weighed for parts', valence: 5, size: 8, at: 'skirts' } },
];

// ---------------------------------------------------------------- the halt and the boards

export const d_hs_board: DialogueDef = {
  id: 'd_hs_board', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'hs_car_down' }, text: 'THE LINE — TWO-TWELVE. DEPARTURES DAILY 07:00: EAST HALT, FOUR WAYS, YARD NINE, WEST HALT, MERIDIAN. FARE 25. Under it, in fresh chalk: CAR DOWN. NO CONTRACTS UP. SHIFT HOLDS FOOTGATE.' },
        { text: 'THE LINE — TWO-TWELVE. DEPARTURES DAILY 07:00: EAST HALT, FOUR WAYS, YARD NINE, WEST HALT, MERIDIAN. FARE 25. Arrivals — none. The letters are lamps behind glass, and every few minutes one of them flickers as if somebody somewhere had touched it.' },
      ],
      again: 'The Line board. Departures at seven. Fare twenty-five.',
      effects: [{ learn: 'hs_line_board' }],
      options: [
        { id: 'board.hail', text: '(Watch the board for a while.)', if: { all: [{ knows: 'kes_hail' }, { not: { flag: 'kes_met' } }] }, next: 'hail' },
        { id: 'board.ride', text: '(Buy a ticket west at the window under the board.)', effects: [{ event: 'dialogue', data: { tree: 'd_rc_board_sk', name: 'The Line board' } }], exit: true, repeat: true },
        leave,
      ],
    },
    hail: { text: 'For a long minute nothing. Then, small, in the corner where the fare is: STILL HERE? LODGE. AFTER DARK. And the fare again.', again: 'The fare, and nothing else.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Number Six: the lamp board, the cage, the slope

const ELEVEN = 'Yusuf Rasul. Joran Haber. Ivo Ansel. Kwame Asare. Lidia Moss. Hamid Sayegh. Ewa Kowal. Dilan Arslan. Marek Szabo. Obinna Nwankwo. Tess Varga\'s boy, no name on the tag but the number.';

export const d_hs_lampboard: DialogueDef = {
  id: 'd_hs_lampboard', owner: 'narrator',
  start: [{ if: SHIFT_WON, node: 'won' }, { if: SHIFT_REVOLT, node: 'revolt' }, { if: SHIFT_BROKEN, node: 'broken' }, { if: { flag: 'hs_dead_up' }, node: 'up' }, { node: 'board' }],
  nodes: {
    board: {
      text: 'A board of brass pegs outside the lamp room, two hundred of them, a tag on every peg for every man or woman who came up. At the end, eleven pegs with their tags hung back on them by somebody\'s hand, and chalk under each: STILL DOWN. Beside it a notice in clean print: SIX EAST — CLOSED — GEOLOGICAL — RECOVERY NOT ECONOMIC. DEBTS OF THE DECEASED TRANSFER TO NEXT OF KIN PER CONTRACT §9. — THE WINDOW.',
      again: 'Eleven tags hung back on their pegs. STILL DOWN. GEOLOGICAL.',
      effects: [{ learn: 'hs_notice_read' }, { lead: 'l_hs_geological' }, { quest: 'q_hs_cavein', start: true }],
      interject: [
        { companion: NINE, text: '"Geological," Nine says. "A finding with no surveyor\'s name under it. The record would send it back." Its lens stays on the word. "Here there is no record to send it to."' },
        { companion: WREN, text: '"Eleven," Wren says. "And the debt walks down the road to whoever\'s left." She looks at the pegs a long time. "Same as the block."' },
        { companion: ODILE, text: '"Paragraph nine," Odile says, and takes her glasses off. "Debts pass to kin. I have seen that clause sold on the floor as a feature."' },
      ],
      options: [{ id: 'lamps.names', text: '(Read the names someone has pencilled under the tags.)', next: 'names' }, leave],
    },
    names: { text: `Under the tags, in pencil, in several hands: ${ELEVEN}`, again: 'Eleven names in pencil, in several hands.', effects: [{ learn: 'hs_eleven_names' }], options: [leave] },
    up: { text: 'The eleven tags are off their pegs. Somebody has written under the empty pegs, in the same pencil: UP. And under that, smaller: BURIED.', again: 'UP. BURIED.', options: [leave] },
    won: { text: 'Every peg on the board is empty: the lamps are down the pit. The Window\'s notice is gone. Somebody has nailed eleven tags along the top of the board, in a row, where everybody going down will touch them.', again: 'Every peg empty. Eleven tags along the top of the board.', options: [leave] },
    broken: { text: 'Lamps down the pit again, on new pegs with new numbers: the men off the Line. The eleven tags are gone and nobody will say where. The Window\'s notice is still there.', again: 'New numbers on the pegs. The Window\'s notice.', options: [leave] },
    revolt: { text: 'The board is bare. Nobody is going down Six, and nobody is going up the hill. Somebody has written across the board in coal: WE STOPPED THE CAR.', again: 'WE STOPPED THE CAR.', options: [leave] },
  },
};

const DOWN: Effect[] = [{ set: 'hs_six_visited' }, { event: 'goto', data: { location: 'hs_six', spawn: 'cage', minutes: 6 } }];

export const d_hs_cage: DialogueDef = {
  id: 'd_hs_cage', owner: 'narrator', start: [{ node: 'cage' }],
  nodes: {
    cage: {
      text: [
        { if: SHIFT_REVOLT, text: 'The cage hangs at the top of the shaft with its gate chained. Nobody is going down Six while there is a war on the slope.' },
        { if: CAR_RUNS, text: 'The cage at the top of the shaft, its gate open, the winch warm. Six is working.' },
        { if: NIGHT, text: 'The cage at the top of the shaft, gate shut, a brake lever as long as your arm. One of the Clean is asleep on a crate against the cage house wall with his chin on his chest. The other is somewhere you can hear but not see.' },
        { text: 'The cage at the top of the shaft, gate shut, a brake lever as long as your arm. The Clean stand either side of the cage house door. "The pit is closed," one says. "Unsafe ground."' },
      ],
      again: 'The cage, and its brake lever.',
      effects: [{ learn: 'hs_cage_seen' }],
      options: [
        { id: 'cage.ride', text: '(Ride down.)', if: CAR_RUNS, effects: DOWN, exit: true, repeat: true },
        { id: 'cage.kes', text: '(Kes puts two fingers on the brake housing. "Ten seconds. Nobody saw that.")', if: { all: [KES_IN, SHIFT_OPEN] }, effects: [...DOWN, K(1)], exit: true, repeat: true },
        { id: 'cage.sneak', text: '(Slip past the sleeping guard and work the winch yourself.)', if: { all: [NIGHT, SHIFT_OPEN, { not: { inParty: KES } }] }, check: { skill: 'stealth', dc: 45 }, next: 'winch', fail: 'woke', repeat: true },
        { id: 'cage.talk', text: 'The Concern will want the pillar log before the Shift gets it. Let me go down and bring it.', if: { all: [{ not: NIGHT }, SHIFT_OPEN] }, check: { skill: 'speech', dc: 50, mods: [{ if: { flag: 'hs_bell_met' }, dc: -10, why: 'the Contract Office has your name: the Clean have heard it' }, { if: LEASHED, dc: -5, why: 'their lens reads Concern chrome in you' }] }, effects: DOWN, exit: true, fail: 'no', once: true },
        { id: 'cage.pay', text: '(Fold forty Tolls into the nearer one\'s glove.)', if: { all: [{ not: NIGHT }, SHIFT_OPEN, TOLLS(40)] }, effects: [{ take: 'tolls', count: 40 }, ...DOWN], exit: true, repeat: true },
        leave,
      ],
    },
    winch: {
      text: 'Past him, close enough to smell his soap. The gate opens on oiled hinges. The brake is a long lever and a winding wheel, and the cage is yours if you can let it down without dropping it.',
      again: 'The brake lever under your hands.',
      options: [
        { id: 'cage.winch', text: '(Let the brake off by inches.)', check: { skill: 'mechanics', dc: 35 }, effects: DOWN, exit: true, fail: 'slip', repeat: true },
        { text: '(Leave it. Not tonight.)', exit: true },
      ],
    },
    slip: { text: 'The brake bites, slips, bites. The cage drops a yard and stops with a clang that goes down the shaft and comes back up it, and the sleeper on the crate lifts his head. You are outside the cage house before he has found his lamp.', again: 'The sleeper on the crate, awake now.', options: [leave] },
    woke: { text: 'A board under your boot. He is awake and on his feet with a hand on his weapon before you have taken the next step. "Pit\'s closed," he says, without any interest at all. "Go home."', again: '"Go home."', options: [leave] },
    no: { text: '"Unsafe ground," he says again, as if you had not said anything, and the other one has not moved at all.', again: '"Unsafe ground."', options: [leave] },
  },
};

export const d_hs_graves: DialogueDef = {
  id: 'd_hs_graves', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'hs_dead_up' }, text: 'Eleven graves on the slope between the pithead and Nursery, in a row, filled, with a lamp tag nailed to a stake at the head of each. Somebody has planted cabbages between them. In the Skirts, nobody wastes ground.' },
        { text: 'Eleven graves on the slope between the pithead and Nursery, dug and left open, with water in the bottom. A stake at the head of each and nothing on the stakes. The Shift dug them the day the gallery came down, and the Window has never said what for.' },
      ],
      again: [{ if: { flag: 'hs_dead_up' }, text: 'Eleven graves, filled. Cabbages between them.' }, { text: 'Eleven graves, open, waiting.' }],
      effects: [{ learn: 'hs_graves_seen' }],
      interject: [{ companion: ASH, if: { not: { flag: 'hs_dead_up' } }, text: 'Ash stands at the end of the row the way he stands at every grave, a little too long. "They dug them first," he says. "Before anyone said they could fill them. That\'s a people who mean it."' }],
      options: [leave],
    },
  },
};

export const d_hs_strikeboard: DialogueDef = {
  id: 'd_hs_strikeboard', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: SHIFT_WON, text: 'The strike board, with the three demands crossed through one by one in Maren\'s hand, and under them: WON. WE WENT UP TOGETHER. The eleven names, and under the names, every name of the Shift who stood the picket.' },
        { if: SHIFT_REVOLT, text: 'The strike board has been taken down and used for a barricade. Where it hung, a list in coal of who has a rifle and who has a pick, and who is dead.' },
        { if: SHIFT_BROKEN, text: 'The strike board is still up. Nobody has had the heart to take it down. Somebody has hung Maren\'s rag on the nail at the top of it, folded.' },
        { text: 'The strike board: NO LAMPS DOWN UNTIL — 1. SIX EAST OPENED AND THE ELEVEN BROUGHT UP. 2. THE DEAD\'S DEBTS VOID. 3. A STEWARD WITH A STOP. Under it the eleven names, and a column of who has stood the picket and how many days. And pinned at the bottom, in Maren\'s hand: THE VOTE WHEN THE CONCERN ANSWERS. NOT BEFORE.' },
      ],
      again: 'The strike board.',
      effects: [{ learn: 'hs_demands' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Maren Okafor (keystone 12) and the vote

const VOTE_HOLD_MODS = [
  { if: SCABS_GONE, dc: -15, why: 'the men off the Line will not dig: holding is not starving' },
  { if: { flag: 'hs_dead_up' }, dc: -10, why: 'the eleven are in the ground: the Shift has buried its grief' },
  { if: { all: [KES_IN, { approval: { companion: KES, gte: 25 } }] }, dc: -10, why: 'Kes stands up beside you' },
  { if: { flag: 'hs_parts', eq: 'exposed' }, dc: -5, why: 'the Weighhouse is shut: the Skirts is angry and together' },
  { if: { flag: 'hs_scabs', eq: 'through' }, dc: 20, why: 'you walked the men off the Line to the cage yourself' },
];

const goVote: OptionDef = { id: 'maren.vote', text: 'Call the vote.', if: { all: [SHIFT_OPEN, { flag: 'hs_scabs_here' }, { not: { flag: 'hs_vote' } }] }, next: 'vote_ask' };

export const d_hs_maren: DialogueDef = {
  id: 'd_hs_maren', owner: 'npc_hs_02',
  start: [
    { if: SHIFT_WON, node: 'won' },
    { if: SHIFT_REVOLT, node: 'revolt' },
    { if: { flag: 'hs_maren_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman sitting on an upturned lamp crate with a rag in her fist. She coughs into it, folds it, puts it away, and looks at you as if she had been expecting you for some time. "You\'re the one off the Line with the Concern\'s card in your pocket." She does not say how she knows. "Maren. The Shift. You\'ll want the car up the hill, and the car\'s stopped. No lamps down, no car up."',
      again: 'Maren folds the rag and puts it away.',
      effects: [{ set: 'hs_maren_met' }, { learn: 'hs_maren' }, { quest: 'q_hs_shift', start: true }],
      interject: [
        { companion: NINE, if: { knows: 'name12_decoded' }, text: '"Okafor, Maren," Nine says, very quietly, only to you. "The twelfth line." Its lens does not leave her. "The record has never been inside this place. I would like to watch it be wrong."' },
        { companion: TAMSIN, text: '"You run all this?" Tamsin says. "Nobody runs it," Maren says. "I hold the pen."' },
      ],
      options: [
        { id: 'maren.six', text: 'What happened at Six?', next: 'six' },
        { id: 'maren.want', text: 'What does the Shift want?', next: 'demands' },
        { id: 'maren.card', text: 'The Concern sent for me. I didn\'t come for them.', next: 'card' },
        bye,
      ],
    },
    again: {
      text: [
        { if: NIGHT, text: 'The Lodge at night: soup, wet wool, the stove. Maren at the end of the long table with a ledger of who has eaten. "Sit. Eat something. Then tell me."' },
        { text: 'Maren at the head of the picket, coughing into her rag. "Still here."' },
      ],
      again: 'Maren waits, the rag folded in her fist.',
      options: [
        { id: 'maren.six2', text: 'What happened at Six?', if: { not: { seen: 'maren.six' } }, next: 'six' },
        { id: 'maren.want2', text: 'What does the Shift want?', if: { not: { seen: 'maren.want' } }, next: 'demands' },
        { id: 'maren.list', text: 'Your name is on a list in Meridian. The city\'s list.', if: { all: [{ knows: 'name12_decoded' }, { not: { seen: 'maren.list' } }] }, next: 'list' },
        { id: 'maren.proof', text: 'I\'ve seen what happened in Six East. It wasn\'t geological.', if: { all: [PROOF, { not: { flag: 'hs_cavein' } }] }, next: 'proof' },
        { id: 'maren.claim', text: 'The claim. Let\'s take it to the Contract Office.', if: { all: [{ flag: 'hs_cavein', eq: 'shift' }, { not: { flag: 'hs_claim_ok' } }, SHIFT_OPEN] }, next: 'claim' },
        { id: 'maren.dig', text: 'Bring the eleven up. I\'ll go down with you.', if: { all: [{ knows: 'hs_six_fall_seen' }, { not: { flag: 'hs_dead_up' } }, SHIFT_OPEN] }, next: 'dig' },
        { id: 'maren.pim', text: 'Pim Rasul says "geological" because the Window pays his mother\'s ration for it.', if: { all: [{ knows: 'hs_pim_rations' }, { not: { flag: 'hs_pim_fed' } }] }, next: 'pim' },
        { id: 'maren.rafe', text: 'Rafe has six cases of powder out of the magazine. He means the car.', if: { all: [{ knows: 'hs_rafe_powder' }, RAFE_ARMED, SHIFT_OPEN] }, next: 'rafe' },
        { id: 'maren.scabs', text: 'There are twenty men on the platform with Concern paper.', if: { all: [{ flag: 'hs_scabs_here' }, { not: { flag: 'hs_scabs' } }, { not: { seen: 'maren.scabs' } }] }, next: 'scabs' },
        { id: 'maren.book', text: '(Put the Weighhouse book on the table in front of her.)', if: { all: [{ item: 'k_hs_weighbook' }, { knows: 'hs_yield_read' }, { not: { flag: 'hs_parts' } }] }, next: 'book' },
        goVote,
        bye,
      ],
    },
    six: {
      text: '"Eleven days ago the east gallery came down with eleven in it." She says it the way you say a thing you have said every day since. "Orrin on the winch heard her talk before she went: you don\'t get a roof talking in good ground. The Window says geological. The Window shut the gallery, docked eleven lamps, and sent the dead\'s paper down the hill to their kin. That\'s the Concern\'s whole answer, on a notice."',
      again: '"Eleven. Geological. On a notice."',
      effects: [{ learn: 'hs_six_story' }, { set: 'hs_maren_leave' }],
      options: [
        { id: 'maren.down', text: 'Can I see the gallery?', next: 'leave' },
        { id: 'maren.six.back', text: 'What does the Shift want?', if: { not: { seen: 'maren.want' } }, next: 'demands' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    leave: { text: '"Orrin runs the cage for the Shift. Tell him I said." She coughs. "The Clean sit on it by day. At night one of them sleeps; he\'s been sleeping eleven nights. If you see the pillars, you\'ll know what I know. Tell me what you see."', again: '"Orrin. At night. Tell me what you see."', effects: [{ set: 'hs_maren_leave' }, { learn: 'hs_cage_leave' }], options: [{ text: 'Something else.', next: 'again' }] },
    demands: {
      text: '"Three things." She counts them on her fingers, which are black at the knuckles from twenty years of coal. "The eleven brought up and buried. Their debts void: a dead man\'s paper doesn\'t go to his children. And a steward with a stop: the right to say this ground\'s bad and walk off it without the Window doubling your paper." She puts the hand flat on her knee. "We go up together, or we don\'t go up."',
      again: '"Up. Void. A stop. We go up together."',
      effects: [{ learn: 'hs_demands' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    card: { text: '"Nobody comes up here for the Concern. They come for something the Concern has." She looks at you a while longer than is comfortable. "You can have the car when it runs. It runs when Six does."', again: '"The car runs when Six does."', effects: [{ trust: { npc: 'npc_hs_02', by: 5 } }], options: [{ text: 'Something else.', next: 'again' }] },
    list: {
      text: 'You tell her the line: OKAFOR, MAREN — THE SKIRTS — STRIKE BROKEN; HANGED (THE CONCERN). She listens all the way through, then coughs, folds the rag. "Hanged. By the Concern." Something nearly a smile. "They\'d have to want me that much." She thinks about it the way she thinks about a roof. "Nobody in Meridian has ever been up here. How would they know what we\'ll do?"',
      again: '"How would they know what we\'ll do?"',
      effects: [{ learn: 'hs_maren_told_line' }, { trust: { npc: 'npc_hs_02', by: 5 } }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    proof: {
      text: [
        { if: { all: [{ not: { item: 'k_hs_order' } }, { not: { knows: 'hs_log_read' } }, { not: { item: 'k_hs_log' } }] }, text: 'You tell her what Pim Rasul told you at the spoil heap: a man from the office with a surveyor\'s chalk, RETREAT on fourteen to twenty-two, the pillars cut back a bit a week, the roof talking on the Tuesday. Maren listens with the rag in her fist. "Robbed," she says. "Retreat mining. You take the legs out from under the roof on your way out. You don\'t do it with men still in the gallery." A long breath. "Unless you\'ve a tonnage."' },
        { if: { item: 'k_hs_order' }, text: 'You put Dysart\'s order on the table: PILLARS 14–22 — RETREAT MINING AUTHORISED. Maren reads it twice. She doesn\'t cough. "Steward\'s objection noted," she reads out. "That was Ivo. Rafe\'s brother. He said no, and they reviewed his paper, and he went in anyway so his crew wouldn\'t go in without him."' },
        { text: 'You tell her what you saw: pillars fourteen to twenty-two cut back to a waist, fresh pick marks, RETREAT chalked on them, and a long D. She listens with the rag in her fist. "Robbed," she says. "Retreat mining. You take the legs out from under the roof on your way out, for the last of the coal. You don\'t do it with men still in the gallery." A long breath. "Unless you\'ve a tonnage."' },
      ],
      again: 'Maren, reading it again.',
      options: [
        { id: 'maren.proof.give', text: 'It\'s the Shift\'s. Use it.', effects: [{ set: 'hs_cavein', value: 'shift' }, { learn: 'hs_robbed' }, K(5), { xp: 80 }, { decision: { id: 'hs_cavein', text: 'You gave the Shift the proof that Six East was robbed, not fallen.' } }], next: 'proof_given' },
        { text: 'Let me think about it.', next: 'again' },
      ],
    },
    proof_given: {
      text: '"Then it\'s a claim." She says it slowly, as if the word were new and she wanted to see what it weighed. "Clause eleven. Every one of us signed it and none of us read it: THE CONCERN WARRANTS THE WORKINGS. The Concern keeps its word, they tell us. It\'s the one thing it sells." She stands. "The Letter at Footgate takes claims. For the kin. When you\'re ready, I\'ll walk there with you."',
      again: '"Clause eleven. The Letter takes claims."',
      effects: [{ learn: 'hs_clause11' }, { lead: 'l_hs_clause' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    claim: { text: '"Now, then." She puts her coat on. "I\'ll do the talking. You do the paper." She stops at the door. "If the Letter says no, it says no as written, and then we\'re where we were, and you\'ve lost nothing but a walk."', again: '"I\'ll do the talking. You do the paper."', effects: [{ set: 'hs_claim_ok' }], options: [{ text: '(Go to the Contract Office with her.)', exit: true }] },
    dig: {
      text: '"Tonight." She doesn\'t argue; she has been waiting for someone to say it. "Orrin on the winch, six of us, you. A pick each. The Clean sleep or they don\'t." Night comes down on Number Six. The cage, the dark, the heading, and at the end of it the fall, and seven people taking it apart with their hands and a jack, an hour, two, five, propping as they go; the roof talks twice and everyone stops breathing. Then the first boot. Then the rest of them, one at a time, wrapped in the Shift\'s coats, up the cage in the grey before dawn and onto the slope, into the graves the Shift dug eleven days ago.',
      again: 'The eleven, up the cage in the grey before dawn.',
      effects: [
        { until: 22 }, { time: 420 }, { set: 'hs_dead_up' }, { learn: 'hs_dead_up' }, { enlist: 'the_shift', rank: 'member' }, K(5), { xp: 120 },
        { decision: { id: 'hs_dead_up', text: 'You went down Number Six with the Shift at night and brought the eleven up from Six East to be buried.' } },
        { news: { tag: 'hs_dead_up', text: 'the Shift brought the eleven up from Six East in the night and buried them on the slope', valence: 4, size: 6, at: 'skirts' } },
      ],
      passives: [{ skill: 'survival', dc: 40, text: 'You find the safe line through the fall: the stone that holds, the stone that doesn\'t. The roof talks once less than it would have.' }],
      interject: [
        { companion: ASH, text: 'Ash digs without stopping, as he digs at Openfield, and when the first one comes out he says the man\'s name off the tag before anyone else can. Nobody asks him how he knew to.', effects: [A(ASH, 5)] },
        { companion: WREN, text: 'Wren goes in front with the lamp and reads the roof the way she reads a road. Twice she puts her hand up and everyone stops, and twice she is right.', effects: [A(WREN, 5)] },
      ],
      options: [{ id: 'maren.dig.done', text: '(The slope, at dawn.)', next: 'dug' }],
    },
    dug: { text: 'Maren stands at the end of the row with her coat open and says the eleven names, slowly, and then the Shift says them back. Then she hands you a lamp tag of your own, blank. "That was a shift in the mine," she says. "You\'re Shift now, if you want it. The tag says so."', again: 'The row of graves. A blank tag in your hand.', options: [{ text: 'Something else.', next: 'again' }, bye] },
    pim: { text: '"The Rasuls." She nods slowly. "Yusuf was his brother." She writes something in the ledger of who has eaten. "Tell his mother the Shift\'s soup is hers. Tell Pim he can say what he saw." She looks up. "The Window can cut a ration. It can\'t cut the soup."', again: '"The Shift\'s soup is hers."', effects: [{ set: 'hs_pim_fed' }, K(2)], options: [{ text: 'Something else.', next: 'again' }] },
    rafe: {
      text: 'For a moment she says nothing at all. "Six cases." The rag goes into her fist. "Rafe lost Ivo under that roof. I\'d want the car too." She stands up. "But the car has a crew in the cable house, Shift people, and the Clean will come down Cascade with rifles the morning after. I\'ll take the powder off him. He won\'t thank either of us."',
      again: '"I\'ll take the powder off him."',
      effects: [{ set: 'hs_rafe', value: 'told' }, { trust: { npc: 'npc_hs_03', by: -10 } }, K(3), { decision: { id: 'hs_rafe', text: 'You told Maren about Rafe\'s powder. She took it off him.' } }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    scabs: { text: '"Twenty of them." She knew. "Off the guild\'s block at Ninebridge, on Concern paper. Debtors, same as us." She folds the rag. "We don\'t beat debtors off a platform. We feed them, if they\'ll sit down. If they go down Six, holding is starving, and the vote goes to Rafe." She looks at you. "Turn them, or buy their paper at the Letter\'s counter. Then call the vote."', again: '"Turn them, or buy their paper. Then the vote."', effects: [{ learn: 'hs_scabs_plan' }], options: [{ text: 'Something else.', next: 'again' }] },
    book: {
      text: 'She reads the book page by page, with her finger an inch above the paper the way people do who learned to read late. At Dawit Mekonnen\'s line she stops. At Nils Haber\'s she shuts it. "Joran\'s boy," she says. "His father\'s paper put him over their line. Our dead are feeding their scale." She stands. "The Skirts should see this. Today."',
      again: 'Maren, with the book shut under her hand.',
      options: [
        { id: 'maren.book.wall', text: 'Then put it on the wall on Cascade. All of it.', next: 'book_out' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    book_out: { text: 'By noon a page of it is on the wall on Cascade beside Saba Mekonnen\'s notice, and by two there are three hundred people outside the Weighhouse who have read it, and the Clean at its door are looking at each other.', again: 'Three hundred people outside the Weighhouse.', effects: PARTS_EXPOSED('shift', 'The Shift put the Weighhouse book on the wall on Cascade. The Skirts shut the Weighhouse.'), options: [{ text: 'Something else.', next: 'again' }] },
    // the vote, at the Lodge, at night
    vote_ask: {
      text: '"Tonight." She doesn\'t ask whether you are sure. "Everybody, the Lodge, after the lamps would have come up. Then it\'s theirs, not mine and not yours." She looks at you. "Say what you think when it comes to you. Or don\'t. Either\'s allowed."',
      again: '"Tonight. Then it\'s theirs."',
      options: [{ id: 'maren.vote.go', text: '(The Lodge, that night.)', effects: [{ until: 21 }, { set: 'hs_vote_called' }], next: 'vote_floor' }, { text: 'Not yet.', next: 'again' }],
    },
    vote_floor: {
      text: [
        { if: RAFE_ARMED, text: 'The Lodge, full to the doors and out of them, wet wool and breath and the stove. Maren stands on the bench: hold, she says. No lamps down. The Window can starve us slower than we can starve its tonnage, if nobody else digs. Then Rafe stands on the table: they ride over our heads every day in that car. Stop the car and the hill eats what it\'s got. Six cases says it stops tonight. The room turns its head from one to the other, and then, one by one, to you.' },
        { text: 'The Lodge, full to the doors and out of them, wet wool and breath and the stove. Maren stands on the bench: hold, she says. No lamps down. The Window can starve us slower than we can starve its tonnage, if nobody else digs. Rafe stands at the back with his arms folded and says nothing; whatever he had, he hasn\'t got it now. The room turns its head, one by one, to you.' },
      ],
      again: 'The Lodge, waiting.',
      options: [
        { id: 'vote.hold.check', text: '(Speak for holding.)', if: RAFE_ARMED, check: { skill: 'speech', dc: 45, mods: VOTE_HOLD_MODS }, effects: [{ set: 'hs_vote', value: 'hold' }, K(5)], next: 'vote_hold', fail: 'vote_carried' },
        { id: 'vote.hold', text: '(Speak for holding.)', if: { not: RAFE_ARMED }, effects: [{ set: 'hs_vote', value: 'hold' }, K(5)], next: 'vote_hold' },
        { id: 'vote.car', text: '(Speak for the car.)', if: RAFE_ARMED, effects: [{ set: 'hs_vote', value: 'car' }], next: 'vote_car' },
        { id: 'vote.silent.hold', text: '(Say nothing. It\'s theirs.)', if: { any: [SCABS_GONE, { not: RAFE_ARMED }] }, effects: [{ set: 'hs_vote', value: 'hold' }], next: 'vote_hold' },
        { id: 'vote.silent.car', text: '(Say nothing. It\'s theirs.)', if: { all: [{ not: SCABS_GONE }, RAFE_ARMED] }, effects: [{ set: 'hs_vote', value: 'car' }], next: 'vote_car' },
      ],
    },
    vote_carried: { text: 'You say it as well as you can, and it isn\'t enough. Rafe says one word back, CAR, and the Lodge says it with him, and Maren steps down off the bench without a word and sits.', again: 'CAR, the Lodge says.', effects: [{ set: 'hs_vote', value: 'car' }], options: [{ id: 'vote.carried.on', text: '(Footgate, that night.)', next: 'vote_car' }] },
    vote_hold: {
      text: 'Hands go up, slowly and then all at once. Maren counts them out loud without needing to. "Hold," she says. "No lamps down." Rafe goes out into the dark without a word. The stove ticks. Nobody goes home.',
      again: '"Hold. No lamps down."',
      options: [
        { id: 'vote.dawn.won', text: '(Dawn.)', if: { all: [SCABS_GONE, NILS_NOT_UP] }, effects: [{ until: 6 }, ...FREE_NILS], next: 'dawn_won' },
        { id: 'vote.dawn.won.up', text: '(Dawn.)', if: { all: [SCABS_GONE, { not: NILS_NOT_UP }] }, effects: [{ until: 6 }], next: 'dawn_won' },
        { id: 'vote.dawn.broken', text: '(Dawn.)', if: { not: SCABS_GONE }, effects: [{ until: 6 }], next: 'dawn_broken' },
      ],
    },
    dawn_won: {
      speaker: 'narrator',
      text: 'At dawn Corwin Dysart knocks on the Lodge door with his hat in his hand and a paper in the other. Nobody else has dug Six for eleven days and twenty men on the platform would not; the quarter\'s tonnage is a number with nothing in it. The Concern\'s terms, as written: Six East opened by the Concern\'s crew and the dead returned to kin; the debts of the eleven void under Clause 11; a steward with a stop. Maren reads it twice, and signs, and gives him back his pen. He takes the noon car up the hill and does not come down.',
      again: 'Dysart at the Lodge door at dawn, with the Concern\'s terms.',
      effects: STRIKE_WON('vote', 'The Shift voted to hold, and with nobody to dig Six the Concern gave the Shift its three demands. Maren Okafor lives.'),
      interject: [{ companion: NINE, text: '"Strike broken; hanged," Nine says, to nobody in particular. "Variance." It says the word the way someone else would say a prayer they had stopped believing in and found they still knew.', effects: [A(NINE, 5)] }],
      options: [{ text: '(Go out into the morning.)', exit: true }],
    },
    dawn_broken: {
      speaker: 'narrator',
      text: 'At dawn the cage goes down with the men off the Line in it, past the picket, with the Clean either side of them, and the winding engine starts for the first time in eleven days. By noon the Window has cut the strikers\' ration to nothing. By evening the Clean have come up Cascade for Maren Okafor, as the leader of an action in breach of every contract on the slope. She goes with them without a word. In the morning she is on the post at Footgate, and the Concern\'s notice is nailed under her feet.',
      again: 'The post at Footgate.',
      effects: STRIKE_BROKEN('vote', 'The Shift voted to hold while the men off the Line still dug. The strike broke, and the Concern hanged Maren Okafor at Footgate.'),
      options: [{ text: '(Leave the Lodge.)', exit: true }],
    },
    vote_car: {
      text: '"Car," Rafe says, and the Lodge goes out behind him into the dark with the six cases carried between them like a coffin. Maren goes too, last, because it is hers whether she wanted it or not. Footgate. The cable house behind the station, its drums the size of rooms and two of the car\'s own crew asleep beside them.',
      again: 'The cable house, the drums, the crew asleep beside them.',
      options: [
        { id: 'vote.car.charge', text: '(Set the charge yourself, and get the crew out first.)', check: { skill: 'explosives', dc: 40 }, effects: STRIKE_REVOLT(true), next: 'car_clean', fail: 'car_dirty', failEffects: STRIKE_REVOLT(false) },
        { id: 'vote.car.rafe', text: '(Let Rafe set it.)', effects: STRIKE_REVOLT(false), next: 'car_dirty_done' },
        { id: 'vote.car.back', text: '(Go back to the Lodge.)', effects: STRIKE_REVOLT(false), next: 'car_dirty_done' },
      ],
    },
    car_clean: { speaker: 'narrator', text: 'You wake the crew and walk them out past the Clean\'s lamps before you set the fuse, and the drums come off their mountings with a sound the whole slope hears. Rafe goes back in for the last case, which is not set right, and does not come out. Two of the Clean die at the fence when the shooting starts. The car hangs on its track with its cable lying down the station like a dead snake.', again: 'The car, hanging, the cable down the station.', options: [{ text: '(Morning.)', exit: true }] },
    car_dirty: { speaker: 'narrator', text: 'Your fuse is a minute too short. You get one of the crew out. The other one is still in there when the drums come off their mountings with a sound the whole slope hears. Rafe dies at the door going back for him. The Clean fire down Cascade until morning. The car hangs on its track with its cable lying down the station like a dead snake.', again: 'The car, hanging, the cable down the station.', options: [{ text: '(Morning.)', exit: true }] },
    car_dirty_done: { speaker: 'narrator', text: 'Rafe sets it fast and badly. The drums come off their mountings with a sound the whole slope hears, and with them the cable house and both the car\'s crew, and Rafe, who was still at the door. The Clean fire down Cascade until morning; three more die. In the grey Maren walks up and down the Lodge counting who is left, and does not stop coughing.', again: 'Maren, counting who is left.', options: [{ text: '(Morning.)', exit: true }] },
    won: {
      text: [
        { if: { flag: 'hs_shift_how', eq: 'claim' }, text: 'Maren at the head of the long table with the Lodge\'s ledger, and for once nobody waiting to be fed. "Clause eleven." She still says it as if she can\'t believe it held. "As written. The Letter put her stamp on it like it was a delivery note."' },
        { text: 'Maren at the head of the long table with the Lodge\'s ledger, and for once nobody waiting to be fed. "Lamps going down," she says. "Eleven up. A stop." She coughs, folds the rag. "We went up together."' },
      ],
      again: 'Maren, with the ledger and nobody waiting to be fed.',
      options: [
        { id: 'maren.won.line', text: 'The city wrote that you\'d hang.', if: { all: [{ knows: 'name12_decoded' }, { not: { seen: 'maren.won.line' } }] }, next: 'won_line' },
        { id: 'maren.won.steward', text: 'What happens now?', if: { not: { seen: 'maren.won.steward' } }, next: 'won_next' },
        bye,
      ],
    },
    won_line: { text: '"Then the city was wrong about one thing." She considers it. "Or it was right and we weren\'t here yet." She almost laughs, which makes her cough. "Tell it Maren says hello. And that she\'s busy."', again: '"Tell it she\'s busy."', options: [{ text: 'Something else.', next: 'won' }] },
    won_next: { text: '"Now they remember us." Flat. "The Concern doesn\'t forget a claim. They\'ll be cold to you at Footgate; you stood next to us. And the Shift will want rifles, because the next time they won\'t send a notice." She looks at you. "The car runs. Bell will have your name. Go up the hill if you have to. Come back down."', again: '"Go up if you have to. Come back down."', effects: [{ promote: { faction: 'the_shift', rank: 'steward' } }], options: [{ text: 'Something else.', next: 'won' }] },
    revolt: {
      text: 'Maren in the Lodge with a rifle across the table that she has not touched, and a list of the dead pinned where the strike board was. "We have guns now," she says. "I never wanted guns. I wanted a stop." The rag, folded. "The hill\'s shut. The car\'s down. Nobody\'s hanged. Ask me in a year if it was worth it."',
      again: 'Maren, and the rifle she has not touched.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- Rafe Ansel

/** Kes's red line: the door in the Concern's chrome handed to the one man on the slope who would use it on everyone. */
const RAFE_DOOR = (sfx = ''): OptionDef => ({ id: `rafe.door${sfx}`, text: 'There\'s a door in the Concern\'s chrome. Kes can switch every piece on the slope off at once.', if: { all: [{ knows: 'kes_backdoor' }, { not: { flag: 'hs_leash_rafe' } }] }, effects: [{ set: 'hs_leash_rafe' }, K(-50), { decision: { id: 'hs_leash_rafe', text: 'You told Rafe Ansel about the door in the Concern\'s chrome, and who could open it.' } }], next: 'door' });

export const d_hs_rafe: DialogueDef = {
  id: 'd_hs_rafe', owner: 'npc_hs_03',
  start: [{ if: SHIFT_WON, node: 'won' }, { if: SHIFT_BROKEN, node: 'broken' }, { if: { flag: 'hs_rafe_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man with coal in the creases of his knuckles, standing where he can watch the Clean watch the cage. "My brother\'s under Six East," he says, before you have said anything. "Say \'geological\' to me and see what happens."',
      again: 'Rafe, watching the Clean.',
      effects: [{ set: 'hs_rafe_met' }],
      options: [{ id: 'rafe.brother', text: 'Your brother.', next: 'brother' }, { id: 'rafe.want', text: 'What do you want?', next: 'want' }, bye],
    },
    again: {
      text: [{ if: { item: 'k_hs_powder' }, text: '"You took it." He knows. He doesn\'t raise his voice. "Out of the cellar. You or her, it\'s the same thing." He looks at the cage. "Fine. Hold, then. See how long holding lasts."' }, { text: 'Rafe, arms folded. "What."' }],
      again: 'Rafe, arms folded.',
      effects: [{ set: 'hs_rafe_met' }],
      options: [
        { id: 'rafe.brother2', text: 'Your brother.', if: { not: { seen: 'rafe.brother' } }, next: 'brother' },
        { id: 'rafe.want2', text: 'What do you want?', if: { not: { seen: 'rafe.want' } }, next: 'want' },
        { id: 'rafe.down', text: 'Don\'t. People ride that car, and Shift people run the cable house.', if: { all: [{ knows: 'hs_rafe_powder' }, RAFE_ARMED, SHIFT_OPEN] }, check: { skill: 'speech', dc: 55, mods: [{ if: { flag: 'hs_dead_up' }, dc: -10, why: 'Ivo is in the ground now, not under it' }, { if: { flag: 'hs_claim_ok' }, dc: -10, why: 'the claim is filed: there is another way to make them pay' }, { if: { flag: 'hs_cavein', eq: 'shift' }, dc: -5, why: 'you gave the Shift the order with his brother\'s objection on it' }] }, effects: [{ set: 'hs_rafe', value: 'stood_down' }, { give: 'k_hs_powder' }, K(5), { decision: { id: 'hs_rafe', text: 'You talked Rafe Ansel out of blowing the car. He gave you the powder.' } }], next: 'stood', fail: 'refused' },
        { id: 'rafe.join', text: 'I\'m with you. Stop the car.', if: { all: [{ knows: 'hs_rafe_powder' }, RAFE_ARMED, SHIFT_OPEN, { not: { flag: 'hs_rafe' } }] }, effects: [{ set: 'hs_rafe', value: 'joined' }, K(-5)], next: 'joined' },
        { id: 'rafe.platform', text: 'The men on the platform.', if: { all: [{ flag: 'hs_scabs_here' }, { not: { flag: 'hs_scabs' } }, SHIFT_OPEN] }, next: 'platform' },
        RAFE_DOOR(),
        bye,
      ],
    },
    brother: {
      text: '"Ivo. Steward of the east crew." He says it to the cage, not to you. "Dysart wanted pillars fourteen to twenty-two taken back for the tonnage. Ivo said no. The Window reviewed his paper the same day: doubled. He went in anyway, because his crew was going in, and he wouldn\'t send them in without him." He breathes out. "That\'s Ivo. That\'s what geological means."',
      again: '"That\'s what geological means."',
      effects: [{ learn: 'hs_piet' }, { learn: 'hs_robbed_rumour' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    want: {
      text: '"The car." He doesn\'t lower his voice; he has said it in the Lodge. "They ride over our heads every day in it, up to their orange trees. Six cases out of the magazine and the cable house comes off its mountings, and the hill eats what it\'s got. A week. Then they come down and talk." He looks at you. "Maren says hold. Holding is starving slower."',
      again: '"The car. Six cases."',
      effects: [{ learn: 'hs_rafe_powder' }, { lead: 'l_hs_powder' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    stood: { text: 'He looks at the cage a long time. Then he goes down into the Lodge\'s cellar and comes up with six greasy cases and puts them at your feet, one at a time, like a man paying a debt. "If the Letter says no," he says, "I know where the magazine is."', again: 'Six cases at your feet.', options: [{ text: 'Something else.', next: 'again' }] },
    door: { text: 'Rafe goes very still. "Every piece," he says. "The Clean\'s lenses. Their rifles\' sights. The car\'s brakes." He is already moving. "She\'s been sitting on that? Kes!" He goes off down the slope shouting her name, and you remember, too late, that she told you it was a timetable.', again: 'Rafe, gone, shouting her name.', options: [leave] },
    refused: { text: '"No." Not angry. "You weren\'t under it."', again: '"You weren\'t under it."', options: [{ text: 'Something else.', next: 'again' }] },
    joined: { text: '"Good." He grips your forearm, once. "Then when Maren calls the vote, say it out loud. They\'ll listen to somebody from outside. They always do."', again: '"Say it out loud."', options: [{ text: 'Something else.', next: 'again' }] },
    platform: {
      text: '"Bought men." He spits. "Twenty of them, off the guild\'s block. Pick handles and they\'re back on the Line by dark." He waits. "You in?"',
      again: '"Pick handles. You in?"',
      options: [
        { id: 'rafe.platform.yes', text: 'Do it.', effects: [{ set: 'hs_scabs', value: 'fought' }, K(-5), { rep: { faction: 'the_shift', fear: 10 } }, { decision: { id: 'hs_scabs', text: 'Rafe\'s men beat the men off the Line off the platform at Two-Twelve. Two died.' } }, { news: { tag: 'hs_scabs_fought', text: 'strikers beat twenty Concern labourers off the platform at Two-Twelve; two dead', valence: -5, size: 6, at: 'skirts' } }], next: 'fought' },
        { id: 'rafe.platform.no', text: 'No. They\'re debtors, same as you.', next: 'platform_no' },
      ],
    },
    fought: { speaker: 'narrator', text: 'They go down the platform at dusk with pick handles and the twenty go off the far end of it onto the rails and away down the Line on foot. Two of them don\'t get up. Rafe wipes the handle on his trousers. The Clean watch from Footgate and write something down.', again: 'Two who didn\'t get up.', interject: [{ companion: WREN, text: 'Wren watches the two on the rails and doesn\'t look at you for the rest of the night.', effects: [A(WREN, -10)] }], options: [{ text: 'Something else.', next: 'again' }] },
    platform_no: { text: '"Then you turn them," he says. "Or buy them. Or watch them go down my brother\'s pit."', again: '"Turn them, or buy them."', options: [{ text: 'Something else.', next: 'again' }] },
    won: { text: 'Rafe on the picket line with nothing to picket, watching the lamps go down. "Clause eleven," he says, as if it were a joke he has not got yet. He doesn\'t say thank you. He says, "Ivo\'s in the ground," and that seems to be the same thing.', again: '"Ivo\'s in the ground."', options: [RAFE_DOOR('.won'), bye] },
    broken: { text: 'Rafe sits on the spoil heap with his back to the post at Footgate and won\'t look round. "Six cases," he says. "I had six cases."', again: '"I had six cases."', options: [RAFE_DOOR('.broken'), bye] },
  },
};

// ---------------------------------------------------------------- Agnes Bell, the Contract Office

const CLAIM_MODS = [
  { if: { item: 'k_hs_order' }, dc: -15, why: 'the retreat order, signed, on the counter' },
  { if: { flag: 'hs_pim_word' }, dc: -10, why: 'Pim Rasul will say what he saw at the door' },
  { if: { item: 'k_hs_log' }, dc: -5, why: 'the pillar log, widths going down week by week' },
  { if: { item: 'k_hs_tags' }, dc: -5, why: 'eleven lamp tags out of the fall' },
  { if: { inParty: NINE }, dc: -5, why: 'Nine reads the clause into the room like a record' },
];
const UPHELD: Effect[] = [
  { set: 'hs_claim', value: 'upheld' },
  ...STRIKE_WON('claim', 'You and Maren Okafor won the eleven\'s claim at the Contract Office under Clause 11: the debts void, the strike won as written. Maren Okafor lives.'),
];

export const d_hs_bell: DialogueDef = {
  id: 'd_hs_bell', owner: 'npc_hs_04',
  start: [{ if: { flag: 'hs_bell_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A clean room with a counter across it and a plant that is alive. The woman behind the counter wears grey that has never seen coal, and looks at you as if you were a document. "Contract Office. You are the designate." Not a question. "The Board\'s guest. Your appointment is open. The car is suspended by industrial action; when the car runs, the appointment stands. As written."',
      again: 'Agnes Bell, waiting, as written.',
      effects: [{ set: 'hs_bell_met' }, { learn: 'hs_appointment' }],
      interject: [{ companion: KES, text: '"The Letter," Kes says, not quite under her breath. Bell does not look up. "Ms Oyelaran. Your service has two years to run." "Obviously," Kes says.' }],
      options: [
        { id: 'bell.car', text: 'When does the car run?', next: 'car' },
        { id: 'bell.contract', text: 'What is a contract, here?', next: 'contract' },
        bye,
      ],
    },
    again: {
      text: [{ if: CAR_RUNS, text: '"The car runs. Your appointment stands." Bell turns a page. "Anything else?"' }, { text: '"Contract Office." Bell turns a page. "Anything else?"' }],
      again: 'Bell, turning a page.',
      options: [
        { id: 'bell.car2', text: 'When does the car run?', if: { not: { seen: 'bell.car' } }, next: 'car' },
        { id: 'bell.contract2', text: 'What is a contract, here?', if: { not: { seen: 'bell.contract' } }, next: 'contract' },
        { id: 'bell.claim', text: 'A claim under Clause 11, for the kin of the eleven of Six East.', if: { all: [{ flag: 'hs_claim_ok' }, { not: { flag: 'hs_claim' } }, SHIFT_OPEN] }, next: 'claim' },
        { id: 'bell.refile', text: 'We refile. With the order.', if: { all: [{ flag: 'hs_claim', eq: 'denied' }, { item: 'k_hs_order' }, SHIFT_OPEN] }, once: true, check: { skill: 'speech', dc: 45, mods: CLAIM_MODS.slice(1) }, effects: [...UPHELD, ...FREE_NILS], next: 'upheld', fail: 'denied_final' },
        { id: 'bell.scabs', text: 'Twenty contracts came up the Line to dig Six. What does it cost to buy them out?', if: { all: [{ flag: 'hs_scabs_here' }, { not: { flag: 'hs_scabs' } }, SHIFT_OPEN] }, next: 'scabs' },
        { id: 'bell.nils', text: 'Nils Haber\'s paper. What does it cost?', if: { all: [{ knows: 'hs_nils_queued' }, { not: { flag: 'hs_nils' } }] }, next: 'nils' },
        { id: 'bell.leash', text: 'I know how the leash in your chrome comes off. I\'ll sell it to you.', if: { all: [{ knows: 'kes_backdoor' }, { not: { inParty: KES } }, { not: { flag: 'hs_leash_sold' } }] }, next: 'leash' },
        { id: 'bell.apply', text: 'I want a contract.', if: { not: { seen: 'bell.apply' } }, next: 'apply' },
        bye,
      ],
    },
    car: { text: '"When the Shift returns to work, the car\'s crew returns to the car." She does not say it as a threat; she says it as a timetable. "The Concern does not run a car through a picket. It is in the crew\'s contract."', again: '"When the Shift returns to work."', effects: [{ learn: 'hs_car_strike' }], options: [{ text: 'Something else.', next: 'again' }] },
    contract: {
      text: '"A promise with the price written in." She lays one on the counter for you to look at: forty pages, a schedule of scrip, a schedule of service, a clause for everything including death. "The Concern keeps its word, to the letter. That is the whole of what it sells. People down here call me the Letter. They think it is an insult."',
      again: '"The Concern keeps its word, to the letter."',
      effects: [{ learn: 'hs_contract_terms' }],
      passives: [{ skill: 'barter', dc: 45, text: 'Clause 9: debts of the deceased transfer to next of kin. Clause 11, three pages on: the Concern warrants the workings. Clause 31: service, at the Concern\'s discretion, discharges the balance in full. Every clause is a door, and every door opens one way.' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    claim: {
      text: 'Maren stands at the counter beside you with her cap in her hands and says it plainly: the eleven of Six East, a working failed by the Concern\'s order, Clause 11, for the kin. Bell takes a form from a drawer without being asked and uncaps a pen. "Grounds," she says. "As written."',
      again: '"Grounds. As written."',
      options: [
        { id: 'bell.claim.argue', text: '(Lay out the grounds: the pillars robbed on a written order, the steward\'s objection, the eleven sent in.)', if: NILS_NOT_UP, check: { skill: 'speech', dc: 60, mods: CLAIM_MODS }, effects: [...UPHELD, ...FREE_NILS], next: 'upheld', fail: 'denied' },
        { id: 'bell.claim.argue.up', text: '(Lay out the grounds: the pillars robbed on a written order, the steward\'s objection, the eleven sent in.)', if: { not: NILS_NOT_UP }, check: { skill: 'speech', dc: 60, mods: CLAIM_MODS }, effects: UPHELD, next: 'upheld', fail: 'denied' },
        { text: '(Not yet. Come back with more.)', next: 'again' },
      ],
    },
    upheld: {
      text: 'Bell reads every word of it, twice, then stamps the form: UPHELD. She doesn\'t look pleased or sorry. "The Concern warrants the workings," she says. "It failed by the Concern\'s order. The debts of the eleven are void and their kin are owed. Six East will be opened by the Concern\'s crew. The steward\'s objection stands as a stop." She files it. "As written." Maren puts her cap back on and doesn\'t say anything until you are outside, and then she sits down on the step of the Contract Office and laughs until she coughs.',
      again: 'UPHELD, in red.',
      interject: [
        { companion: NINE, text: '"Clause eleven," Nine says on the step. "A promise, kept to its letter, against the one who made it." Its lens turns to the hill. "I did not think they had law up there. They have contracts. It is nearly the same thing, and nearly is where people live."', effects: [A(NINE, 5)] },
        { companion: ODILE, text: '"A claim against the house, paid in full," Odile says. "My dear, I have never once seen that happen on a floor. Write down the date."', effects: [A(ODILE, 5)] },
      ],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    denied: { text: '"Insufficient." Bell stamps the form DENIED — GROUNDS NOT SHOWN and files it. "The finding is geological. A claim may be refiled once on new grounds." Maren picks her cap up off the counter and says nothing at all.', again: 'DENIED — GROUNDS NOT SHOWN.', effects: [{ set: 'hs_claim', value: 'denied' }], options: [{ text: 'Something else.', next: 'again' }] },
    denied_final: { text: '"Insufficient." The same stamp. "The claim is closed." Bell files it under the first one. "As written."', again: 'The claim is closed.', effects: [{ set: 'hs_claim', value: 'closed' }], options: [{ text: 'Something else.', next: 'again' }] },
    scabs: {
      text: '"The residual on twenty labour contracts bought at Ninebridge." She doesn\'t need to look. "Eight Tolls a contract. A hundred and sixty, and they are free to go back down the Line, or to stay, as they choose. The Concern sells what it owns."',
      again: [{ if: { knows: 'hs_scabs_eighty' }, text: '"Eighty," Bell says again, as written.' }, { text: '"A hundred and sixty."' }],
      options: [
        { id: 'bell.scabs.odile', text: '(Odile leans on the counter with her glasses on their chain.)', if: { all: [{ inParty: ODILE }, { not: { knows: 'hs_scabs_eighty' } }] }, next: 'scabs_odile' },
        { id: 'bell.scabs.80', text: '(Pay eighty.)', if: { all: [{ knows: 'hs_scabs_eighty' }, TOLLS(80)] }, effects: [{ take: 'tolls', count: 80 }, { set: 'hs_scabs', value: 'sent' }, K(3), { decision: { id: 'hs_scabs', text: 'You bought the twenty labour contracts off the Contract Office counter and the men off the Line went home.' } }], next: 'scabs_paid' },
        { id: 'bell.scabs.160', text: '(Pay a hundred and sixty.)', if: { all: [{ not: { knows: 'hs_scabs_eighty' } }, TOLLS(160)] }, effects: [{ take: 'tolls', count: 160 }, { set: 'hs_scabs', value: 'sent' }, K(3), { decision: { id: 'hs_scabs', text: 'You bought the twenty labour contracts off the Contract Office counter and the men off the Line went home.' } }], next: 'scabs_paid' },
        { text: 'Not today.', next: 'again' },
      ],
    },
    scabs_odile: {
      speaker: ODILE,
      text: '"My dear, you bought twenty men to dig a pit that is shut." Odile taps the counter with one finger. "Their paper is worth exactly what they can dig, and they can dig nothing until the Shift goes back, which may be never. Eighty, and the Concern is rid of a bad sheet." Bell looks at her for a long moment. "Eighty," she says.',
      again: '"Eighty," Bell says.',
      effects: [{ learn: 'hs_scabs_eighty' }, A(ODILE, 3)],
      options: [{ text: '(Back to the counter.)', next: 'scabs' }],
    },
    scabs_paid: { text: 'Bell stamps twenty sheets DISCHARGED — BY PURCHASE and hands you the stack. By evening the men off the Line are on the platform with their bags, waiting for the seven o\'clock, and Nowak comes up Cascade to shake your hand and then doesn\'t know what to say.', again: 'Twenty sheets, DISCHARGED — BY PURCHASE.', options: [{ text: 'Something else.', next: 'again' }] },
    nils: {
      text: '"Haber, N. Residual ninety, by transfer under Clause 9. Weighed; queued for service." She turns the page round so you can read it. "Ninety discharges it, and he is no longer over the line."',
      again: '"Ninety."',
      options: [
        { id: 'bell.nils.pay', text: '(Pay ninety.)', if: TOLLS(90), effects: [{ take: 'tolls', count: 90 }, { set: 'hs_nils', value: 'freed' }, { set: 'hs_nils_how', value: 'paid' }, K(10), { decision: { id: 'hs_nils', text: 'You paid Nils Haber\'s paper off at the Contract Office and he walked out of the Weighhouse.' } }], next: 'nils_paid' },
        { text: 'Not today.', next: 'again' },
      ],
    },
    nils_paid: { text: 'DISCHARGED — BY PURCHASE. Bell files it. "He may leave the Weighhouse when he likes. He will be weighed again if his paper crosses the line again." As written.', again: 'DISCHARGED.', options: [{ text: 'Something else.', next: 'again' }] },
    leash: {
      text: 'For the first time Bell looks at you as something other than a document. "Sit down," she says, and you sit. "Say exactly what you mean." You tell her: a dormant channel in every Concern piece, and a way to turn it round, and the one person in the Skirts who has done it. She writes nothing down. When you have finished she says, "Four hundred. And a contract, offered, when the car runs." A pause. "And Ms Oyelaran is reviewed."',
      again: '"Four hundred, and a contract offered."',
      options: [
        { id: 'bell.leash.yes', text: '(Take it.)', effects: [{ set: 'hs_leash_sold' }, { give: 'tolls', count: 400 }, { set: 'hc_contract_offered' }, K(-60), { rep: { faction: 'concern', respect: 20 } }, { decision: { id: 'hs_leash_sold', text: 'You sold the Concern the backdoor in its own chrome, and the name of the grid-hand who found it.' } }], next: 'leash_sold' },
        { id: 'bell.leash.no', text: '(Stand up. You\'ve said too much already.)', next: 'leash_no' },
      ],
    },
    leash_sold: { text: 'She counts it out in Halcyon notes, clean ones. "The Concern thanks you," she says, and it sounds exactly like the clause it is.', again: 'Clean notes on the counter.', options: [{ text: '(Leave.)', exit: true }] },
    leash_no: { text: '"As you like." She doesn\'t write anything down. You are fairly sure she doesn\'t need to.', again: 'Bell, writing nothing down.', effects: [{ set: 'hs_bell_heard_leash' }], options: [{ text: 'Something else.', next: 'again' }] },
    apply: { text: '"Applications are taken when the car runs." She slides a card across: CONTRACTS — TERMS ON REQUEST. "Labour, service, citizen. Or the Board\'s guest, which you are, which is not a contract. Nobody has to decide anything today."', again: '"When the car runs."', effects: [{ learn: 'hs_contract_kinds' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

// ---------------------------------------------------------------- Corwin Dysart, the pit manager

export const d_hs_dysart: DialogueDef = {
  id: 'd_hs_dysart', owner: 'npc_hs_05',
  start: [{ if: SHIFT_BROKEN, node: 'broken' }, { if: { flag: 'hs_dysart_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a good coat at a desk with a terminal on it and a window that looks at nothing but the headframe. He has the look of somebody doing a sum he does not like the answer to. "Dysart. Number Six." He doesn\'t get up. "If you\'re here about Six East, it\'s on the notice."',
      again: 'Dysart, and his sum.',
      effects: [{ set: 'hs_dysart_met' }],
      options: [{ id: 'dysart.six', text: 'Six East.', next: 'six' }, { id: 'dysart.strike', text: 'The strike.', next: 'strike' }, bye],
    },
    again: {
      text: 'Dysart looks up from the terminal. "Yes?"',
      again: 'Dysart, and the terminal.',
      options: [
        { id: 'dysart.six2', text: 'Six East.', if: { not: { seen: 'dysart.six' } }, next: 'six' },
        { id: 'dysart.robbed', text: 'Pillars fourteen to twenty-two were robbed to a waist. On your order.', if: { all: [PROOF, SHIFT_OPEN, { not: { flag: 'hs_cavein' } }] }, next: 'robbed' },
        { id: 'dysart.scabs', text: 'The men off the Line.', if: { all: [{ flag: 'hs_scabs_here' }, { not: { flag: 'hs_scabs' } }, SHIFT_OPEN] }, next: 'scabs' },
        { id: 'dysart.sell', text: 'I can tell you where the strike committee sits, and when.', if: { all: [{ flag: 'hs_maren_met' }, SHIFT_OPEN] }, next: 'sell' },
        bye,
      ],
    },
    six: { text: '"A gallery fell. Galleries fall. The Concern\'s survey says geological, and the Concern has offered the families the standard settlement." He turns a pen over. "The standard settlement is nothing, under Clause 9. I didn\'t write Clause 9."', again: '"I didn\'t write Clause 9."', options: [{ text: 'Something else.', next: 'again' }] },
    strike: { text: '"The strike is costing the Concern a quarter\'s tonnage and costing the Shift its ration. One of those can wait longer than the other." He glances at the window. "Six reopens when the ground is safe and the Shift is sensible. Twenty men are coming up the Line who are sensible already."', again: '"Twenty men are coming up the Line."', effects: [{ learn: 'hs_scabs_coming' }], options: [{ text: 'Something else.', next: 'again' }] },
    robbed: {
      text: 'He doesn\'t deny it, which surprises you. He puts the pen down very carefully. "Tonnage is a number," he says. "I don\'t write the number. I have a review at the end of every quarter, up the hill, and men who miss their number are not reviewed kindly." He looks at you. "What do you want?"',
      again: '"What do you want?"',
      options: [
        { id: 'dysart.order', text: 'The order. When the claim goes in, the Concern will look for whoever signed. Let it be the paper, not you.', if: { not: { item: 'k_hs_order' } }, check: { skill: 'speech', dc: 55, mods: [{ if: { item: 'k_hs_log' }, dc: -10, why: 'the pillar log in your hand, widths going down week by week' }, { if: { flag: 'hs_pim_word' }, dc: -10, why: 'the trapper boy will say what he saw' }] }, effects: [{ give: 'k_hs_order' }, { learn: 'hs_robbed' }, { set: 'hs_dysart_confessed' }], next: 'order', fail: 'no' },
        { id: 'dysart.buy', text: 'What\'s it worth to you that nobody else sees what I\'ve seen?', next: 'buy' },
        { text: 'Nothing. Yet.', next: 'again' },
      ],
    },
    order: { text: 'He takes a key from his waistcoat, opens the lockbox, and puts the order on the desk between you: PILLARS 14–22 — RETREAT MINING AUTHORISED TO QUARTER TONNAGE. STEWARD\'S OBJECTION NOTED; STEWARD\'S DEBT TO BE REVIEWED. "There is a copy on the Window," he says. "There always is. They will find it whether you take that or not." He looks very tired. "Clause 11 says the Concern warrants the workings. It doesn\'t say it warrants me."', again: 'The order on the desk.', options: [{ text: 'Something else.', next: 'again' }] },
    no: { text: '"Geological," he says, and picks up the pen. "It\'s on the notice."', again: '"It\'s on the notice."', options: [{ text: 'Something else.', next: 'again' }] },
    buy: {
      text: '"Two hundred." He says it at once; he had the number ready. "Whatever you have, on this desk, and you go up the hill when the car runs and never think about Six East again." He opens a drawer. "That is a great deal of money in the Skirts."',
      again: '"Two hundred."',
      options: [
        { id: 'dysart.buy.yes', text: '(Put it on the desk.)', if: { any: [{ item: 'k_hs_log' }, { item: 'k_hs_order' }, { item: 'k_hs_tags' }] }, effects: [{ take: 'k_hs_log' }, { take: 'k_hs_order' }, { give: 'tolls', count: 200 }, { set: 'hs_cavein', value: 'sold' }, K(-15), { decision: { id: 'hs_cavein', text: 'You sold Corwin Dysart the proof that Six East was robbed. He burned it.' } }], next: 'bought' },
        { text: 'No.', next: 'again' },
      ],
    },
    bought: { text: 'He feeds the paper into the stove behind his desk, sheet by sheet, and watches each one go. "Geological," he says, when it has. He sounds as if he would like to believe it.', again: 'Ash in the stove.', interject: [{ companion: TAMSIN, text: 'Tamsin is out of the door before the last sheet has caught. She doesn\'t say anything to you all the way down the slope.', effects: [A(TAMSIN, -10)] }], options: [{ text: 'Something else.', next: 'again' }] },
    scabs: {
      text: '"Sixty Tolls if they\'re through the picket and at the cage by noon." He doesn\'t pretend it is anything else. "They\'re frightened of the Shift. They would be less frightened with someone walking beside them who isn\'t either."',
      again: '"Sixty, at the cage by noon."',
      effects: [{ learn: 'hs_dysart_offer' }],
      options: [
        { id: 'dysart.scabs.yes', text: '(Take it.)', effects: [{ set: 'hs_scabs', value: 'through' }, { give: 'tolls', count: 60 }, K(-15), { rep: { faction: 'the_shift', respect: -15 } }, { decision: { id: 'hs_scabs', text: 'You walked the men off the Line through the Shift\'s picket to the cage for Corwin Dysart.' } }, { news: { tag: 'hs_scabs_through', text: 'somebody walked the Concern\'s labourers through the picket at Number Six; the winding engine started', valence: -5, size: 6, at: 'skirts' } }], next: 'scabs_done' },
        { text: 'No.', next: 'again' },
      ],
    },
    scabs_done: { speaker: 'narrator', text: 'Twenty men with their heads down and you beside them, up Cascade, past the picket where nobody raises a hand, to the cage. The winding engine starts for the first time in eleven days. The picket watches it turn and nobody says anything at all.', again: 'The winding engine, turning.', interject: [{ companion: WREN, text: '"Same block," Wren says, low, when the cage has gone. "I know whose counter they came off. I didn\'t think you\'d walk them in." She doesn\'t say anything else.', effects: [A(WREN, -10)] }], options: [{ text: 'Something else.', next: 'again' }] },
    sell: {
      text: 'He goes very still. "Where, and when." Not a question. "Two hundred and fifty. And nobody on the slope ever knows it came from you."',
      again: '"Where, and when."',
      options: [
        { id: 'dysart.sell.yes', text: '(Tell him: the Lodge, after dark; Maren chairs.)', effects: [{ set: 'hs_sold_out' }, { give: 'tolls', count: 250 }, ...STRIKE_BROKEN('sold', 'You sold the Shift\'s committee to Corwin Dysart. The Clean took Maren Okafor at the Lodge and hanged her at Footgate.'), K(-40), { set: 'kes_refused' }], next: 'sold' },
        { id: 'dysart.sell.no', text: '(Say nothing.)', next: 'again' },
      ],
    },
    sold: { speaker: 'narrator', text: 'That night the Clean come up Cascade in a line with their lamps on and go into the Lodge, and come out with Maren Okafor between them, still coughing. In the morning she is on the post at Footgate. Nobody on the slope knows who told. Somebody always knows.', again: 'The post at Footgate.', options: [{ text: '(Leave.)', exit: true }] },
    broken: { text: 'Dysart at his desk, the winding engine going outside the window. "Six works," he says. "Tonnage is a number." He doesn\'t look at you.', again: 'Dysart, not looking at you.', options: [bye] },
  },
};

// ---------------------------------------------------------------- Pim, Orrin, the Clean, the men off the Line

export const d_hs_pim: DialogueDef = {
  id: 'd_hs_pim', owner: 'npc_hs_06',
  start: [{ if: { flag: 'hs_pim_word' }, node: 'after' }, { if: { flag: 'hs_pim_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy of fifteen sitting on the spoil heap, picking at the coal under his nails. Before you have asked anything he says, "Geological." Then, because you are still standing there: "I worked the door. In Six East. Opening and shutting it for the air. That\'s all."',
      again: 'Pim, picking at his nails.',
      effects: [{ set: 'hs_pim_met' }],
      options: [
        { id: 'pim.why', text: 'Why do you keep saying that word?', next: 'why' },
        { id: 'pim.saw', text: 'You were at the door. You saw what they did to the pillars.', if: PROOF, check: { skill: 'speech', dc: 45, mods: [{ if: { item: 'k_hs_log' }, dc: -10, why: 'the pillar log, in his hands' }, { if: { flag: 'hs_pim_fed' }, dc: -15, why: 'the Shift will feed his mother whatever the Window does' }] }, next: 'saw', fail: 'geo' },
        bye,
      ],
    },
    again: {
      text: '"Geological," Pim says, without looking up.',
      again: 'Pim, without looking up.',
      options: [
        { id: 'pim.why2', text: 'Why do you keep saying that word?', if: { not: { seen: 'pim.why' } }, next: 'why' },
        { id: 'pim.saw2', text: 'You were at the door. You saw what they did to the pillars.', if: { all: [PROOF, { not: { flag: 'hs_pim_fed' } }] }, check: { skill: 'speech', dc: 45, mods: [{ if: { item: 'k_hs_log' }, dc: -10, why: 'the pillar log, in his hands' }] }, next: 'saw', fail: 'geo' },
        { id: 'pim.fed', text: 'The Shift will feed your mother. Maren\'s word. Say what you saw.', if: { flag: 'hs_pim_fed' }, next: 'saw' },
        bye,
      ],
    },
    why: { text: '"The Window pays my mother\'s ration while I say it right." He says it flat, the way you say a price. "Yusuf was my brother. He\'s under it. If I say the other thing, she doesn\'t eat." He picks at the nail. "Geological."', again: '"Geological."', effects: [{ learn: 'hs_pim_rations' }], options: [{ text: 'Something else.', next: 'again' }] },
    geo: { text: '"Geological," he says, louder, and gets up and walks off along the heap.', again: '"Geological."', options: [leave] },
    saw: {
      text: 'For a long time he doesn\'t say anything. Then it comes out all at once, quietly. "A man from the office came with a surveyor\'s chalk and wrote RETREAT on fourteen to twenty-two. Then they cut them, a bit a week. The roof started talking on the Tuesday. Ivo said it was talking and Mr Dysart\'s man said get on. I was at the door. When it went I let go of the door and ran, and Yusuf didn\'t." He wipes his face with a black hand. "I\'ll say it. At the Letter\'s counter, if Maren wants. I\'ll say it."',
      again: '"I\'ll say it."',
      effects: [{ set: 'hs_pim_word' }, { learn: 'hs_robbed' }, { lead: 'l_hs_pim' }, K(5), { xp: 60 }],
      interject: [{ companion: TAMSIN, text: 'Tamsin crouches down to his height without being asked. "You ran," she says. "That\'s what the door was for. Somebody had to come out and say it." Pim looks at her as if nobody has said that to him in eleven days.', effects: [A(TAMSIN, 5)] }],
      options: [leave],
    },
    after: { text: [{ if: SHIFT_WON, text: 'Pim on the slope by the eleven graves, with a lamp of his own on his belt now. "Steward says I can work the door again," he says. "If I want. I don\'t know if I want."' }, { text: 'Pim, picking at his nails. "I said I\'d say it." He doesn\'t say geological.' }], again: 'Pim, on the slope.', options: [bye] },
  },
};

export const d_hs_tomas: DialogueDef = {
  id: 'd_hs_tomas', owner: 'npc_hs_14',
  start: [{ if: { flag: 'hs_tomas_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man with a grey plait down his back, sitting on an oil drum beside the winding engine with his hand on its housing as if it were a horse. "Orrin. Thirty years on this winch." He pats it. "She doesn\'t move without me, and I don\'t move her without the Shift. The Clean know it. That\'s why they sit on the gate and not on me."',
      again: 'Orrin, with his hand on the winch.',
      effects: [{ set: 'hs_tomas_met' }],
      options: [{ id: 'tomas.talk', text: 'Maren says the roof talked before it went.', next: 'talk' }, bye],
    },
    again: {
      text: [{ if: CAR_RUNS, text: '"Winding again." Orrin has oil to his elbows. "Where to?"' }, { text: '"Still here," Orrin says, "and so is she."' }],
      again: 'Orrin and the winch.',
      options: [
        { id: 'tomas.talk2', text: 'Maren says the roof talked before it went.', if: { not: { seen: 'tomas.talk' } }, next: 'talk' },
        { id: 'tomas.down', text: 'Maren says take me down.', if: { all: [{ flag: 'hs_maren_leave' }, SHIFT_OPEN, NIGHT] }, effects: DOWN, exit: true, repeat: true },
        { id: 'tomas.down.day', text: 'Maren says take me down.', if: { all: [{ flag: 'hs_maren_leave' }, SHIFT_OPEN, { not: NIGHT }, { not: { seen: 'tomas.down.day' } }] }, next: 'day' },
        { id: 'tomas.ride', text: 'Take me down.', if: CAR_RUNS, effects: DOWN, exit: true, repeat: true },
        bye,
      ],
    },
    talk: { text: '"Talked all the Tuesday." He looks at the shaft. "A roof talks when you take its legs out from under it. Good ground doesn\'t talk; it doesn\'t need to. I heard it up the shaft. I rang the bell. Nobody came up." He takes his hand off the winch for the first time. "Geological, they wrote."', again: '"Good ground doesn\'t talk."', effects: [{ learn: 'hs_roof_talked' }], options: [{ text: 'Something else.', next: 'again' }] },
    day: { text: '"Not with the Clean sitting on the gate." He nods at them. "After dark. One of them sleeps. Come back when the lamps are lit and I\'ll put you down like a parcel."', again: '"After dark."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_hs_clean: DialogueDef = {
  id: 'd_hs_clean', owner: 'npc_hs_g2', start: [{ node: 'face' }],
  nodes: {
    face: {
      text: [
        { if: LEASHED, text: 'Grey that stays clean, a lens on the shoulder that turns to you on its own. A small green light on it. "Citizen-grade implant," the guard says, to the lens as much as to you. "You may stand here." Then, as if correcting himself: "For now."' },
        { if: SHIFT_REVOLT, text: 'Grey that stays clean, a carbine held across the chest, and a lens on the shoulder that has not stopped moving since the cable house went. "Back," the guard says. "Nobody comes near the station."' },
        { text: 'Grey that stays clean, a lens on the shoulder that turns to you on its own, and a face behind it that has decided not to have an expression. "Face to the lens."' },
      ],
      again: 'The lens turns to you on its own.',
      effects: [{ learn: 'hs_clean_seen' }],
      options: [
        { id: 'clean.hill', text: 'What\'s up the hill?', if: { not: { seen: 'clean.hill' } }, next: 'hill' },
        { id: 'clean.name', text: 'Do you have a name?', if: { not: { seen: 'clean.name' } }, next: 'name' },
        leave,
      ],
    },
    hill: { text: '"Halcyon." As if that answered it. "Contracts and the Board\'s guests."', again: '"Contracts and the Board\'s guests."', options: [leave] },
    name: { text: '"Contract number." He tells it to you: eleven digits. Then, after a moment, as if it had got out on its own: "My mother was from Nursery."', again: 'He does not say anything else.', options: [leave] },
  },
};

export const d_hs_nowak: DialogueDef = {
  id: 'd_hs_nowak', owner: 'npc_hs_13',
  start: [
    { if: { flag: 'hs_scabs', eq: 'turned' }, node: 'turned' },
    { if: { flag: 'hs_scabs', eq: 'through' }, node: 'through' },
    { if: { flag: 'hs_nowak_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'Twenty men on the platform with their bags at their feet, and a big one at the front with a shaved head and salt-cracked hands. "We were bought," he says, when you come up, as if you had asked. "We work. That\'s what bought means. Nowak. From the Sallow."',
      again: 'Nowak, and his twenty, and their bags.',
      effects: [{ set: 'hs_nowak_met' }],
      interject: [{ companion: WREN, text: 'Wren looks along the twenty of them, face by face. "Ninebridge," she says. "The block." Nowak looks at her. "You know it?" "I know the counter," Wren says.' }],
      options: [{ id: 'nowak.who', text: 'Who bought you?', next: 'who' }, { id: 'nowak.turn', text: 'Six East came down on eleven men under robbed pillars. That\'s the pit you\'re here to dig.', check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'hs_robbed' }, dc: -10, why: 'you saw the pillars yourself' }, { if: { item: 'k_hs_log' }, dc: -10, why: 'the pillar log, passed down the line of them' }, { if: { inParty: WREN }, dc: -10, why: 'Wren tells them what the block\'s counter is' }, { if: { item: 'k_hs_tags' }, dc: -5, why: 'eleven tags out of the fall' }, { if: { flag: 'hs_pim_word' }, dc: -5, why: 'the boy who worked the door will tell them' }] }, effects: [{ set: 'hs_scabs', value: 'turned' }, K(5), { xp: 80 }, { decision: { id: 'hs_scabs', text: 'You turned the men off the Line: they sat down on the platform and would not go down Number Six.' } }, { news: { tag: 'hs_scabs_turned', text: 'the twenty men the Concern brought up the Line sat down on the platform at Two-Twelve and would not go down Number Six', valence: 5, size: 6, at: 'skirts' } }], next: 'turn', fail: 'no' }, bye],
    },
    again: {
      text: '"Still bought," Nowak says.',
      again: 'Nowak, and the twenty.',
      options: [
        { id: 'nowak.who2', text: 'Who bought you?', if: { not: { seen: 'nowak.who' } }, next: 'who' },
        { id: 'nowak.turn2', text: 'Six East came down on eleven men under robbed pillars. That\'s the pit you\'re here to dig.', if: { not: { flag: 'hs_scabs' } }, check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'hs_robbed' }, dc: -10, why: 'you saw the pillars yourself' }, { if: { item: 'k_hs_log' }, dc: -10, why: 'the pillar log, passed down the line of them' }, { if: { inParty: WREN }, dc: -10, why: 'Wren tells them what the block\'s counter is' }, { if: { item: 'k_hs_tags' }, dc: -5, why: 'eleven tags out of the fall' }, { if: { flag: 'hs_pim_word' }, dc: -5, why: 'the boy who worked the door will tell them' }] }, effects: [{ set: 'hs_scabs', value: 'turned' }, K(5), { xp: 80 }, { decision: { id: 'hs_scabs', text: 'You turned the men off the Line: they sat down on the platform and would not go down Number Six.' } }, { news: { tag: 'hs_scabs_turned', text: 'the twenty men the Concern brought up the Line sat down on the platform at Two-Twelve and would not go down Number Six', valence: 5, size: 6, at: 'skirts' } }], next: 'turn', fail: 'no', once: true },
        bye,
      ],
    },
    who: { text: '"The Concern, off the guild\'s block at Ninebridge. Twenty papers in one lot, cheap, because there was a strike on and the guild knew it." He shrugs. "We dig or we\'re in breach, and breach goes to the Weighhouse. That\'s what the paper says. None of us can read past page two."', again: '"We dig or we\'re in breach."', effects: [{ learn: 'hs_scabs_paper' }], options: [{ text: 'Something else.', next: 'again' }] },
    turn: { text: 'He hears it out. Then he passes it down the line of them, and you watch it go from man to man, and at the end of the line somebody sits down on his bag. Then the next. Nowak is the last one standing. "Eleven," he says. "Under the legs of the roof." He sits. "We dug salt in the Sallow. You don\'t take the legs out of a salt roof either." He looks up at you. "They\'ll put us in breach." "Then sit in breach," says a voice behind you, and it\'s Maren, with a pot of soup.', again: 'Twenty men sitting on their bags, and Maren with a pot of soup.', interject: [{ companion: WREN, text: '"That\'s the first lot off that block I ever saw sit down," Wren says. She says it to the soup, not to you, but you hear it.', effects: [A(WREN, 5)] }], options: [{ text: 'Something else.', next: 'again' }] },
    no: { text: '"We were bought," he says again, and the twenty pick up their bags.', again: '"We were bought."', options: [leave] },
    turned: { text: 'Nowak at the long table in the Lodge, with Shift soup in front of him and a borrowed coat on. "In breach," he says, and almost smiles. "First time I ever sat down."', again: '"In breach."', options: [bye] },
    through: { text: 'Nowak at the pithead with coal on his hands that isn\'t salt. "We dig," he says, and doesn\'t look at the picket. "That\'s what bought means."', again: '"That\'s what bought means."', options: [bye] },
  },
};

// ---------------------------------------------------------------- Footgate: the car, the cable house, the post, the freight

export const d_hs_car: DialogueDef = {
  id: 'd_hs_car', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'hs_car_down' }, text: 'The car hangs a little way up its track with its doors open and its cable lying down the station like a dead snake. The board says SERVICE SUSPENDED. Nobody has changed it, and nobody needs to.' },
        { if: CAR_RUNS, text: 'The car at the bottom of its track, a long glass box on rails as steep as a ladder, its doors open and its crew in grey at the controls. The board: SERVICE — CONTRACTS AND THE BOARD\'S GUESTS. A clerk with a list at the doors. Your name is on the list. It will be your appointment when you choose it.' },
        { text: 'The car at the bottom of its track, a long glass box on rails as steep as a ladder going up into the rock, doors shut, crew gone. SERVICE SUSPENDED — INDUSTRIAL ACTION. Through the glass, on a seat, somebody\'s forgotten scarf in a colour nobody in the Skirts can afford.' },
      ],
      again: [{ if: { flag: 'hs_car_down' }, text: 'The car, hanging, the cable down the station.' }, { text: 'The car, and its board.' }],
      effects: [{ learn: 'hs_car_seen' }],
      interject: [{ companion: KES, text: '"The Express," Kes says. "I rode it once, up and down, at sixteen. The gardens at the top smell like rain that came out of a pipe." She stops. "Obviously I don\'t think about it."' }],
      options: [leave],
    },
  },
};

export const d_hs_cablehouse: DialogueDef = {
  id: 'd_hs_cablehouse', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'hs_car_down' }, text: 'Where the cable house was: a black room with no roof, two drums the size of rooms thrown off their mountings, and the smell of powder and burnt grease. Someone has put eleven lamp tags and one new one on the sill of the window that is no longer there.' },
        { text: 'The cable house behind the station: two winding drums the size of rooms, the cable going up through a slot in the roof into the rock, oil on everything. Two cots against the wall where the car\'s crew sleep when the car runs late. Shift people: they walked out with the pit.' },
      ],
      again: 'The cable house.',
      effects: [{ learn: 'hs_cablehouse_seen' }],
      options: [leave],
    },
  },
};

export const d_hs_post: DialogueDef = {
  id: 'd_hs_post', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'ks_maren', eq: 'hanged' }, text: 'The post at Footgate. They left her a day, for the slope to see, with the Concern\'s notice nailed under her feet. Now there is nothing on it but a folded rag tied to the crossbar, and under it, nailed in a row, eleven lamp tags and a twelfth, blank.' },
        { text: 'A post with a crossbar beside the gate, in sight of every door on Cascade, and a notice nailed to it in clean print: ACTION IN BREACH OF CONTRACT BY ANY PARTY ON THIS SLOPE IS SABOTAGE. SABOTAGE IS ANSWERED AT FOOTGATE. Nothing on it now. Old rope marks on the crossbar.' },
      ],
      again: 'The post at Footgate.',
      effects: [{ learn: 'hs_post_seen' }],
      interject: [
        { companion: ILYA, if: { flag: 'ks_maren', eq: 'hanged' }, text: 'Ilya looks at the post a long time. "Right," he says, which is what he says instead of everything else.' },
        { companion: WREN, if: { not: { flag: 'ks_maren', eq: 'hanged' } }, text: 'Wren looks at the rope marks on the crossbar and then at nothing, the way she does. "They all have one," she says. "Every place that keeps a count."' },
      ],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the east gallery under Number Six (hs_six)

export const d_hs_six_cage: DialogueDef = {
  id: 'd_hs_six_cage', owner: 'narrator', start: [{ node: 'cage' }],
  nodes: {
    cage: {
      text: 'The cage at the bottom of the shaft, a bell-pull beside it. Pull once to go up. A long way above, a square of grey that is the night.',
      again: 'The cage and its bell-pull.',
      options: [{ id: 'six.up', text: '(Pull the bell. Go up.)', effects: [{ event: 'goto', data: { location: 'hs_skirts', spawn: 'cage', minutes: 6 } }], exit: true, repeat: true }, leave],
    },
  },
};

export const d_hs_six_board: DialogueDef = {
  id: 'd_hs_six_board', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A survey board nailed to the rock in a niche off the heading: the east gallery\'s plan in a surveyor\'s neat hand, pillars numbered one to thirty, and a log of their widths, week by week. From fourteen to twenty-two the widths go down: four paces, three, two, one. Across the last column, in chalk, in a different hand: RETREAT — D.',
      again: 'The survey board. Widths going down. RETREAT — D.',
      effects: [{ learn: 'hs_log_read' }, { learn: 'hs_robbed' }, { lead: 'l_hs_log' }],
      passives: [{ skill: 'science', dc: 40, text: 'The widths are in the surveyor\'s hand, careful and regular. The chalk is not. Whoever logged the pillars was measuring them being cut, and writing it down, as if somebody would read it.' }],
      options: [
        { id: 'six.board.take', text: '(Tear the log sheet off the board.)', if: { not: { item: 'k_hs_log' } }, once: true, effects: [{ give: 'k_hs_log' }], next: 'taken' },
        leave,
      ],
    },
    taken: { text: 'The sheet comes away with the nail through it. You fold it round the nail.', again: 'The bare board.', options: [leave] },
  },
};

export const d_hs_six_door: DialogueDef = {
  id: 'd_hs_six_door', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A wooden door in a timber frame across the heading, with a cord on it that runs back to a stool in a niche. Somebody sat here twelve hours a shift opening it for the carts and shutting it for the air. On the stool, a lunch tin, never opened.',
      again: 'The trapper\'s door, the stool, the lunch tin.',
      effects: [{ learn: 'hs_trapper_door' }],
      interject: [{ companion: KES, text: '"Pim\'s," Kes says. She picks up the lunch tin and puts it in her jacket without opening it. "His mother\'ll want it back. Obviously."' }],
      options: [leave],
    },
  },
};

export const d_hs_six_pillars: DialogueDef = {
  id: 'd_hs_six_pillars', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Pillars fourteen to twenty-two: columns of coal left standing to hold the roof, the way the ones you walked past are four paces across. These are cut back to a waist. Fresh pick marks, bright on the black. Chalk on each: a number, and RETREAT, and a long D. Above them the roof has sagged into a belly, and somewhere in it, very quietly, something ticks.',
      again: 'Pillars cut to a waist. RETREAT — D. The roof ticking.',
      effects: [{ learn: 'hs_robbed' }, { lead: 'l_hs_robbed' }, { quest: 'q_hs_cavein', start: true }],
      passives: [{ skill: 'mechanics', dc: 35, text: 'Retreat mining: you take the pillars on your way out of a worked gallery, last thing, for the coal in them, and you let the roof come down behind you. You never do it with a crew still working the face beyond. Whoever cut these knew there were people past them.' }],
      interject: [
        { companion: ILYA, text: '"Somebody did that with a plan," Ilya says. He touches a pick mark with one finger. "A bit a week. Right."' },
        { companion: WREN, text: 'Wren listens to the roof with her head on one side. "Don\'t talk," she says, very quietly. "It\'s talking."' },
      ],
      options: [leave],
    },
  },
};

export const d_hs_six_fall: DialogueDef = {
  id: 'd_hs_six_fall', owner: 'narrator', start: [{ if: { flag: 'hs_dead_up' }, node: 'open' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'The fall: the roof come down across the gallery from wall to wall, slabs and slack and broken props, piled to where the roof used to be. At its edge, half in the rubble, the glass of a lamp. Then another. Eleven people are on the other side of this, and none of them are waiting any more.',
      again: 'The fall, and the lamps at its edge.',
      effects: [{ learn: 'hs_six_fall_seen' }, { lead: 'l_hs_fall' }],
      options: [
        { id: 'six.fall.dig', text: '(Dig carefully to the lamps at the edge.)', if: { not: { item: 'k_hs_tags' } }, check: { skill: 'survival', dc: 40, mods: [{ if: { inParty: WREN }, dc: -10, why: 'Wren reads the roof for you' }, { if: { inParty: KES }, dc: -5, why: 'Kes holds the lamp where you need it' }] }, effects: [{ give: 'k_hs_tags' }], next: 'tags', fail: 'talks', once: true },
        leave,
      ],
    },
    tags: { text: 'An hour on your knees with the roof ticking over you. The lamps first, then the belts they hung from, and on each belt a brass tag with a number. Eleven. You leave everything else where it lies. Bringing them up is for more than one pair of hands.', again: 'The edge of the fall, dug back.', options: [leave] },
    talks: { text: 'You get one slab off and the roof answers: a crack like a door slamming, a shower of slack down your collar. You are back at the pillars before you know you have moved. Nobody digs that alone.', again: 'The fall. The roof still ticking.', options: [leave] },
    open: { text: 'The fall dug back to a passage the width of a man, propped with new timber. Beyond it the gallery is empty. The Shift took everything they found up the cage, and chalked on the last prop: UP.', again: 'UP.', options: [leave] },
  },
};

export const SKIRTS_DIALOGUES: DialogueDef[] = [
  d_hs_board, d_hs_lampboard, d_hs_cage, d_hs_graves, d_hs_strikeboard, d_hs_maren, d_hs_rafe, d_hs_bell, d_hs_dysart, d_hs_pim, d_hs_tomas, d_hs_clean,
  d_hs_nowak, d_hs_car, d_hs_cablehouse, d_hs_post, d_hs_six_cage, d_hs_six_board, d_hs_six_door, d_hs_six_pillars, d_hs_six_fall,
];
