import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * The Stacks: Block Seven's lobby, floor nine and the roof. The committee and its flat; the tank, the beds and the
 * trays; the floor war over the roof's water.
 */

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 23, to: 6 } };
/** The roof's water is still being fought over. */
const OPEN: Cond = { not: { flag: 'st_roof' } };
/** The flat is yours, however you came by it. */
const MINE: Cond = { flag: 'st_flat' };
const SHARED: Effect[] = [{ set: 'st_roof', value: 'shared' }, { xp: 150 }];

// ---------------------------------------------------------------- the ground: signs, the Loop, the lifts

export const d_st_loop: DialogueDef = {
  id: 'd_st_loop', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — THE STACKS. A board under Block Eight\'s face: PRECINCT 3 · OLD MARKET 3 · LANTERN ROW 3 · BRIDGEWARD 3 · THE DOCKS 4. Somebody has written under it, in the careful hand of a committee: RESIDENTS HALF FARE — ASK THE DRIVER. There is no driver.',
      effects: [{ learn: 'st_loop_seen' }],
      options: [
        { id: 'stloop.precinct', text: 'The Precinct. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_precinct', spawn: 'loop', minutes: 20 } }], exit: true },
        { id: 'stloop.market', text: 'Old Market. (3 Tolls)', if: { all: [{ flag: 'md_market_open' }, { item: 'tolls', count: 3 }] }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_market', spawn: 'loop', minutes: 15 } }], exit: true },
        { id: 'stloop.lantern', text: 'Lantern Row. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'loop', minutes: 15 } }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

const SIGN = (id: string, text: string, learn: string): DialogueDef => ({ id, owner: 'narrator', start: [{ node: 'read' }], nodes: { read: { text, effects: [{ learn }], options: [{ text: '(Leave it.)', exit: true }] } } });
export const d_st_block_sign = SIGN('d_st_block_sign', 'BLOCK SEVEN, in letters a floor high that were white once. Under them, in a hundred hands: floor numbers, names, a chalked list of who owes whom water, and RING THE BELL FOR THE COMMITTEE with no bell.', 'block_seven_seen');
export const d_st_lift_sign = SIGN('d_st_lift_sign', 'The lift yard: the shaft\'s foot behind a grille, a motor the size of a room with its casing off, and cables going up into the dark. On the motor, in Plan stencil: SERVICE AS PER SCHEDULE. On the grille, in chalk: THE SCHEDULE IS NEVER.', 'st_lifts_dead');
export const d_st_stair_sign = SIGN('d_st_stair_sign', 'THE STAIR. FLOORS 1–40. A chalk tally of how many steps, which someone has corrected three times. Under it: IF YOU SIT DOWN ON NINE, YOU LIVE ON NINE.', 'st_stair_seen');
export const d_st9_stair_sign = SIGN('d_st9_stair_sign', 'The stair cage. Down: nine floors to the lobby and the Loop. Up: the roof, the tank, and whoever is standing by it today.', 'st_stair_seen');
export const d_st_tank_sign = SIGN('d_st_tank_sign', 'THE TANK — BLOCK SEVEN — FILLS 23:00–05:00 FROM PRECINCT MAIN (CL. 14). Under it, chalked and rubbed and chalked: TWELVE 02–05. NINE: WHAT\'S LEFT. A keeper\'s log hangs from the valve on a chain.', 'st_tank_sign_read');
export const d_st_beds_sign = SIGN('d_st_beds_sign', 'Beds of real dirt, carried up nine — forty — floors in buckets over thirty years, with things growing in them that have names: tomatoes, once; beans; greens; a tree the height of a child. The dirt is dry to the knuckle at noon.', 'st_beds_seen');
export const d_st_trays_sign = SIGN('d_st_trays_sign', 'Trays under a scrap awning, stacked, each with a tube running to it and a green so even it looks printed. A pump, humming. A crate stencilled with a word that is also a company: NUTRIENT — CONCERN AGRONOMY. Nobody up here says the word aloud.', 'st_trays_seen');

export const d_st_lift_panel: DialogueDef = {
  id: 'd_st_lift_panel', owner: 'narrator', start: [{ node: 'panel' }],
  nodes: {
    panel: {
      text: 'A lift panel with a cracked screen that still lights: BLOCK SEVEN — LIFT SERVICE: AS PER SCHEDULE. Under it, a schedule, in the Plan\'s own font: 02:00 — SYSTEM CHECK. No other line. The lifts have checked themselves every night at two for forty years and carried nobody.',
      effects: [{ learn: 'st_lift_schedule' }],
      passives: [{ skill: 'science', dc: 35, text: 'The check draws the block\'s whole power for three minutes — which is why the pumps on the roof run at two: that is when the main is live.', effects: [{ learn: 'st_power_at_two' }, { lead: 'l_st_tank' }] }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_st_board: DialogueDef = {
  id: 'd_st_board', owner: 'narrator', start: [{ node: 'board' }],
  nodes: { board: { text: 'THE FLOOR BOARD. Notices in a dozen hands: NINE — WATER TUESDAYS. TWELVE — TRAYS, DO NOT TOUCH. ROOF — COMMITTEE PENDING (this one is old). 9-14 — EMPTY — SEE HESTER. FOUND: ONE CHILD, FLOOR 22, CLAIM AT LAUNDRY.', effects: [{ learn: 'st_board_read' }, { learn: 'st_flat_heard' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_st9_board: DialogueDef = {
  id: 'd_st9_board', owner: 'narrator', start: [{ node: 'board' }],
  nodes: { board: { text: 'NINE\'S BOARD. A rota for the beds, a rota for the laundry, a line that says THE ROOF IS NINE\'S BY RIGHT OF DIRT and under it, in a different chalk, THE TANK IS WHOEVER\'S AWAKE. Mama Deel has signed the first. Nobody has signed the second.', effects: [{ learn: 'st9_board_read' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

// ---------------------------------------------------------------- the committee and the flat

export const d_st_hester: DialogueDef = {
  id: 'd_st_hester', owner: 'npc_st_01',
  start: [
    { if: { all: [{ flag: 'st_flat', eq: 'squatted' }, { not: { flag: 'st_squat_faced' } }] }, node: 'squatted' },
    { if: { all: [{ flag: 'st_roof' }, { not: { flag: 'st_roof_told' } }] }, node: 'roof_after' },
    { if: { flag: 'hester_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman at a desk in a wooden office inside a concrete hall, with a ledger of floors and a face that has chaired a thousand meetings and won most of them by outlasting them. "Hester Quill. Committee, Block Seven, floor nine, and the lobby when nobody else will." She does not ask what you want; she looks at the ledger. "You want a flat or you want the roof. Everyone who comes in here wants one of the two."',
      effects: [{ set: 'hester_met' }, { learn: 'hester_seen' }, { learn: 'st_flat_heard' }],
      options: [
        { id: 'hester.flat', text: 'A flat.', if: { not: MINE }, next: 'flat' },
        { id: 'hester.roof', text: 'The roof. Nine\'s dry and Twelve\'s pumping.', if: { all: [{ quest: 'q_st_gardens' }, OPEN] }, next: 'roof', once: true },
        { id: 'hester.twelves', text: 'The Twelves want the committee to let the trays have the tank. I\'m here to say they should.', if: { all: [{ flag: 'st_lio_asked' }, OPEN] }, check: { skill: 'speech', dc: 45, mods: [{ if: { item: 'k_st_ledger' }, dc: -15, why: 'the trays\' ledger says what sixty people eat' }] }, next: 'twelves_ok', fail: 'twelves_no' },
        { id: 'hester.shared', text: 'A schedule. Nine has the tank from five to two; Twelve from two to five. Oskar keeps it; the committee signs it.', if: { all: [{ knows: 'st_tank_log' }, OPEN, { flag: 'st_lio_shared' }] }, effects: [...SHARED, { decision: { id: 'st_shared', text: 'You brokered the Stacks\' roof: a water schedule between the beds and the trays, signed by the committee.' } }], next: 'shared' },
        bye,
      ],
    },
    again: {
      text: '"Committee." The ledger.',
      options: [
        { id: 'hester.flat.again', text: 'The flat.', if: { not: MINE }, next: 'flat' },
        { id: 'hester.roof.again', text: 'The roof.', if: { all: [{ quest: 'q_st_gardens' }, OPEN, { not: { seen: 'hester.roof' } }] }, next: 'roof' },
        { id: 'hester.twelves.again', text: 'The Twelves want the tank for the trays. They should have it.', if: { all: [{ flag: 'st_lio_asked' }, OPEN] }, check: { skill: 'speech', dc: 45, mods: [{ if: { item: 'k_st_ledger' }, dc: -15, why: 'the trays\' ledger says what sixty people eat' }] }, next: 'twelves_ok', fail: 'twelves_no' },
        { id: 'hester.shared.again', text: 'A schedule: five to two for Nine, two to five for Twelve. Oskar keeps it; you sign it.', if: { all: [{ knows: 'st_tank_log' }, OPEN, { flag: 'st_lio_shared' }] }, effects: [...SHARED, { decision: { id: 'st_shared', text: 'You brokered the Stacks\' roof: a water schedule between the beds and the trays, signed by the committee.' } }], next: 'shared' },
        bye,
      ],
    },
    flat: {
      text: '"9-14. Two rooms, a stove, a bed the Marrs left, a window on the canyon. Key money\'s two hundred and fifty, which is the committee\'s, which is the floor\'s, which is water for a month." She turns the ledger round. "Or the roof. Settle the roof so Nine isn\'t dry at six, and the committee will give you the flat for the settling. That\'s the other price. People think it\'s the cheaper one."',
      effects: [{ quest: 'q_st_flat', start: true }, { learn: 'st_flat_offer' }],
      options: [
        { id: 'flat.pay', text: '(Pay. 250 Tolls)', if: { item: 'tolls', count: 250 }, effects: [{ take: 'tolls', count: 250 }, { set: 'st_flat', value: 'paid' }, { give: 'k_st_key' }, { rep: { faction: 'wardens', respect: 0 } }, { xp: 60 }, { decision: { id: 'st_flat_paid', text: 'You paid Block Seven\'s committee key money for flat 9-14.' } }], next: 'key' },
        { id: 'flat.earn', text: 'The roof, then. I\'ll settle it.', effects: [{ set: 'st_flat_promised' }], next: 'earn' },
        { text: 'Not today.', exit: true },
      ],
    },
    key: { text: 'A key on a string, brass, worn to gold at the bow. "Nine. Fourteen. The stove draws if you open the window first." She writes your name in the ledger, and under it, FLOOR NINE, and that is apparently all there is to it.', options: [bye] },
    earn: { text: '"Oskar has the log. Lio has the pump. Mama Deel has the dirt and Ren has a jerry-can he thinks I don\'t know about." She does not look up. "Come back with the roof settled and 9-14 is yours. Come back with it burned and we will have a different conversation."', options: [bye] },
    roof: { text: '"The tank fills off the Precinct main at night, which is the only time the main is live down here, and the Twelves pump it into trays from two to five, and Nine\'s beds get what the trays leave, which is a wet floor." She closes the ledger. "The committee could vote the tank. The committee has been going to vote the tank for three springs. The Twelves feed sixty. Nine feeds nine, and the nine are old, and the dirt is thirty years of buckets. You see the problem. Everyone sees the problem."', effects: [{ learn: 'st_roof_told_you' }], options: [bye] },
    twelves_ok: { text: 'She listens to the whole of it, which is her gift. "Sixty." She writes it. "Mama Deel will not forgive the committee. The committee will survive that; it survives everything." She signs something. "The tank is the trays\'. Nine can carry buckets from the laundry, the way we carried the dirt."', effects: [{ set: 'st_roof', value: 'twelves' }, { xp: 120 }, { decision: { id: 'st_twelves', text: 'You argued the Stacks\' committee into giving the roof tank to the Twelves\' trays.' } }, { trust: { npc: 'npc_st_05', by: -30 } }], options: [bye] },
    twelves_no: { text: '"Sixty." She does not write it. "And nine, who are old, and a tree the height of a child. No."', options: [bye] },
    shared: { text: 'She reads it twice and writes it once, in the ledger, in capitals, and signs it, and dates it. "Three springs." She looks at the page as if it might disagree. "Oskar keeps it. Lio keeps to it or the committee stops signing Twelve\'s water for the laundry." Then, almost as an afterthought: "9-14 is yours, if you still want it. Key money\'s waived. The Marrs left the kettle."', effects: [{ set: 'st_roof_told' }], options: [{ id: 'shared.key', text: 'I\'ll take the key.', if: { not: MINE }, effects: [{ set: 'st_flat', value: 'earned' }, { give: 'k_st_key' }, { decision: { id: 'st_flat_earned', text: 'Block Seven\'s committee gave you flat 9-14 for settling the roof.' } }], next: 'key' }, bye] },
    roof_after: {
      text: [{ if: { flag: 'st_roof', eq: 'nines' }, text: '"The pump\'s dead and the Twelves are carrying buckets." She does not smile. "Nine\'s wet at six for the first time in three springs. Sixty people are hungrier. I\'ve written both down." She pushes a key across. "9-14. For the settling. It was settled; I didn\'t say how."' }, { if: { flag: 'st_roof', eq: 'burned' }, text: '"The trays burned." She says it to the ledger. "Sixty people\'s dinner, and the awning, and Nessa Kord\'s hands. Ren says it was him. Ren says a lot. I\'ve written your name beside his, because that is what the committee is for." She does not offer a key.' }, { if: { flag: 'st_roof', eq: 'twelves' }, text: '"The tank is the trays\'." She has already written it. "Nine carries buckets. Mama Deel has stopped coming to committee." A pause. "9-14 is still two-fifty. The committee doesn\'t pay for that kind of settling."' }, { text: '"Settled." She writes it.' }],
      effects: [{ set: 'st_roof_told' }],
      options: [
        { id: 'after.key', text: 'The flat.', if: { all: [{ not: MINE }, { flag: 'st_roof', eq: 'nines' }] }, effects: [{ set: 'st_flat', value: 'earned' }, { give: 'k_st_key' }, { decision: { id: 'st_flat_earned', text: 'Block Seven\'s committee gave you flat 9-14 for settling the roof.' } }], next: 'key' },
        bye,
      ],
    },
    squatted: {
      text: '"You\'re in 9-14." She does not raise her voice; she has never needed to. "The Marrs\' door was forced on Tuesday. The committee noticed on Tuesday." The ledger. "Key money\'s two-fifty. For a squatter it\'s one-fifty, because the committee would rather have the money than the argument. Or you settle the roof, and we pretend the door was always open."',
      effects: [{ set: 'st_squat_faced' }],
      options: [
        { id: 'squat.pay', text: '(Pay. 150 Tolls)', if: { item: 'tolls', count: 150 }, effects: [{ take: 'tolls', count: 150 }, { set: 'st_flat', value: 'paid' }, { give: 'k_st_key' }, { xp: 30 }], next: 'key' },
        { id: 'squat.earn', text: 'The roof, then.', effects: [{ set: 'st_flat_promised' }], next: 'earn' },
        { id: 'squat.no', text: 'The door was open.', effects: [{ trust: { npc: 'npc_st_01', by: -20 } }, { set: 'st_squat_refused' }], next: 'squat_no' },
      ],
    },
    squat_no: { text: '"It is now." She writes something short. "Nine remembers. Nine is very good at remembering; it\'s all Nine has."', options: [bye] },
  },
};

export const d_st_flat_door: DialogueDef = {
  id: 'd_st_flat_door', owner: 'narrator', start: [{ if: MINE, node: 'yours' }, { node: 'shut' }],
  nodes: {
    shut: {
      text: '9-14. A door with a number and no name chalked under it, and a committee seal of wax over the latch, and behind it the quiet of two rooms nobody has slept in since the Marrs went to the Ring.',
      effects: [{ learn: 'st_flat_seen' }],
      options: [
        { id: 'door.force', text: '(Break the seal and force the latch.)', check: { skill: 'security', dc: 40, mods: [{ if: NIGHT, dc: -10, why: 'the corridor is asleep' }] }, next: 'forced', fail: 'forced_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    forced: { text: 'The wax breaks and the latch gives and the door opens on two rooms with a kettle on the stove and a bed the Marrs left made. Nobody in the corridor says anything. Nine will say it later.', effects: [{ set: 'st_flat', value: 'squatted' }, { quest: 'q_st_flat', start: true }, { xp: 40 }, { decision: { id: 'st_flat_squatted', text: 'You broke the committee\'s seal on flat 9-14 and moved in.' } }], options: [{ text: '(Go in.)', exit: true }] },
    forced_no: { text: 'The seal breaks and the latch does not, and a door across the corridor opens a hand\'s width and shuts.', effects: [{ set: 'st_seal_broken' }, { trust: { npc: 'npc_st_01', by: -5 } }], options: [{ text: '(Leave it.)', exit: true }] },
    yours: { text: '9-14. Your name chalked under the number now, in Bo\'s hand, badly.', options: [{ text: '(Go in.)', exit: true }] },
  },
};

export const d_st_flat: DialogueDef = {
  id: 'd_st_flat', owner: 'narrator', start: [{ if: MINE, node: 'yours' }, { node: 'not_yours' }],
  nodes: {
    not_yours: { text: 'The Marrs\' bed, made, with a kettle beside it and a window on the canyon. Not yours. The committee has a seal on the door and a ledger in the lobby.', options: [{ text: '(Leave it.)', exit: true }] },
    yours: {
      text: 'Your flat. Two rooms nine floors up, a stove that draws if you open the window first, a bed with somebody else\'s dent in it, a locker, and a window on the canyon with a thousand other windows in it, each a different light. The door locks from your side. The city is downstairs.',
      effects: [{ learn: 'st_home' }],
      options: [
        { text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

// ---------------------------------------------------------------- the roof: the tank, the beds, the trays

export const d_st_oskar: DialogueDef = {
  id: 'd_st_oskar', owner: 'npc_st_02',
  start: [{ if: { flag: 'st_roof' }, node: 'after' }, { if: { flag: 'oskar_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man on a chair by the tank with a log on a chain and the look of someone who has been asked the same question by both sides for three years. "Oskar Vey. I keep the tank. Fills off the main eleven to five, when the main\'s live. After that it\'s politics, and I keep out of politics; I keep the valve."',
      effects: [{ set: 'oskar_met' }, { learn: 'oskar_seen' }],
      options: [
        { id: 'oskar.log', text: 'The log. Who takes what, when.', next: 'log', once: true },
        { id: 'oskar.valve', text: 'The valve. Could it split the flow?', if: { knows: 'st_tank_log' }, next: 'valve', once: true },
        { id: 'oskar.schedule', text: 'Nine from five to two, Twelve from two to five. Would you keep that, if they signed it?', if: { knows: 'st_tank_log' }, next: 'schedule', once: true },
        bye,
      ],
    },
    again: { text: '"The tank." The log.', options: [{ id: 'oskar.log.again', text: 'The log.', if: { not: { seen: 'oskar.log' } }, next: 'log' }, { id: 'oskar.valve.again', text: 'The valve.', if: { all: [{ knows: 'st_tank_log' }, { not: { seen: 'oskar.valve' } }] }, next: 'valve' }, { id: 'oskar.schedule.again', text: 'A schedule. Would you keep it?', if: { all: [{ knows: 'st_tank_log' }, { not: { seen: 'oskar.schedule' } }] }, next: 'schedule' }, bye] },
    log: { text: 'He unhooks it and holds it so you can read and not take. Three years of nights in a careful hand: FILL 23–05. TWELVE PUMP 02–05, FULL DRAW. NINE: RESIDUE. Beside each spring week, the beds\' depth in fingers, going to one finger, going to none. "The pump takes it all because the pump can. Nothing in the log says it has to."', effects: [{ learn: 'st_tank_log' }, { lead: 'l_st_tank' }, { give: 'k_st_tank_log' }], options: [bye] },
    valve: { text: '"It\'s a pre-Burn valve. Two outlets and a stop between." He looks at it the way the Sink\'s keeper looks at hers. "Somebody who knew the stops could set it to give each side its hours without anybody having to agree to anything. I\'m not that somebody. I\'m the keeper." A pause. "I\'d not notice it done, is what I\'m saying."', effects: [{ learn: 'st_valve_hint' }], options: [bye] },
    schedule: { text: '"I\'d keep anything that\'s written down." He taps the log. "Three years I\'ve wanted a line in here that isn\'t *residue*. Get Lio to say the hours and Hester to sign them and I\'ll keep them with my own hand on the stop."', effects: [{ learn: 'st_oskar_keeps' }], options: [bye] },
    after: { text: [{ if: { flag: 'st_roof', eq: 'shared' }, text: '"Five to two, two to five." The log has a new line in capitals. "I keep it. Nine\'s wet at six. Twelve\'s green at eight. Nobody\'s happy and everybody\'s fed, which is what a schedule is."' }, { if: { flag: 'st_roof', eq: 'nines' }, text: '"Pump\'s dead." He does not look at the trays. "Full tank, all night, for nine old people and a tree. I write it down. I write everything down."' }, { if: { flag: 'st_roof', eq: 'twelves' }, text: '"Full draw. Committee-signed, now." He writes RESIDUE one more time and underlines it. "I keep the valve."' }, { text: '"The trays burned." He has written that too. "A tank with nothing to feed. I keep it anyway."' }], options: [bye] },
  },
};

export const d_st_valve: DialogueDef = {
  id: 'd_st_valve', owner: 'narrator', start: [{ if: { flag: 'st_roof' }, node: 'set' }, { node: 'valve' }],
  nodes: {
    valve: {
      text: 'A pre-Burn valve on the tank\'s belly: two outlets, west to the beds\' pipe and east to the pump\'s, and a stop between them that somebody set to EAST a long time ago and sealed with wire. The keeper\'s chair is three paces off and the keeper is looking at the view.',
      options: [
        { id: 'valve.split', text: '(Reset the stops: the beds until two, the trays until five.)', if: { all: [OPEN, { knows: 'st_tank_log' }] }, check: { skill: 'mechanics', dc: 45, mods: [{ if: { knows: 'st_valve_hint' }, dc: -15, why: 'the keeper told you where the stops are' }, { if: { skill: 'science', gte: 40 }, dc: -10, why: 'two outlets and a stop is arithmetic' }] }, next: 'split_ok', fail: 'split_no' },
        { id: 'valve.beds', text: '(Turn the whole flow to the beds and wire it.)', if: OPEN, check: { skill: 'mechanics', dc: 35 }, next: 'beds_ok', fail: 'split_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    split_ok: { text: 'The wire comes off. The stop moves, stiffly, to a notch between EAST and WEST that nobody has used since the Burn, and holds. Water goes two ways with a sound like a breath. Oskar Vey, three paces off, writes something in his log without turning round.', effects: [{ set: 'st_valve_split' }, ...SHARED, { decision: { id: 'st_shared', text: 'You reset the Stacks\' roof valve to give the beds and the trays their hours each.' } }, { trust: { npc: 'npc_st_02', by: 15 } }], options: [{ text: '(Leave it running.)', exit: true }] },
    beds_ok: { text: 'The stop goes to WEST and the wire goes back on, tighter. The pump\'s pipe empties with a cough. On the deck somebody says Nessa\'s name. Oskar Vey writes it down.', effects: [{ set: 'st_roof', value: 'nines' }, { set: 'st_valve_west' }, { xp: 100 }, { decision: { id: 'st_nines', text: 'You turned the Stacks\' roof tank to the Nines\' beds and left the Twelves\' trays dry.' } }, { trust: { npc: 'npc_st_05', by: 20 } }, { trust: { npc: 'npc_st_03', by: -30 } }], options: [{ text: '(Leave it.)', exit: true }] },
    split_no: { text: 'The stop does not move; the wire does, into your palm. The keeper turns round.', effects: [{ time: 20 }], options: [{ text: '(Leave it.)', exit: true }] },
    set: { text: [{ if: { flag: 'st_roof', eq: 'shared' }, text: 'The stop sits in the notch between EAST and WEST, and the wire is gone, and a chalk line on the tank says 05–02 / 02–05 in the keeper\'s hand.' }, { if: { flag: 'st_roof', eq: 'nines' }, text: 'WEST, wired. The pump\'s pipe is dry.' }, { text: 'EAST, wired, and now a committee seal on the wire.' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_st_lio: DialogueDef = {
  id: 'd_st_lio', owner: 'npc_st_03',
  start: [{ if: { flag: 'st_fight_twelves' }, node: 'fight' }, { if: { flag: 'st_roof' }, node: 'after' }, { if: { flag: 'lio_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young man under the awning with green on his hands and a pipe-wrench on his belt he has not had to use yet. "Lio Brand. Twelve." He waves at the trays. "Sixty people eat off this deck. Nine people eat off the dirt, and a tree. You\'re the one asking round; everyone says. Ask."',
      effects: [{ set: 'lio_met' }, { learn: 'lio_seen' }],
      options: [
        { id: 'lio.pump', text: 'The pump takes the whole tank from two to five.', if: { knows: 'st_tank_log' }, next: 'pump', once: true },
        { id: 'lio.shared', text: 'Five to two for the beds, two to five for you. Say the hours and the committee signs them.', if: { all: [{ knows: 'st_tank_log' }, OPEN] }, check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'st_oskar_keeps' }, dc: -10, why: 'the keeper will hold the stop himself' }, { if: { item: 'k_st_tank_log' }, dc: -10, why: 'three years of *residue* in his own keeper\'s hand' }] }, next: 'shared_ok', fail: 'shared_no' },
        { id: 'lio.ask', text: 'What do you want from the committee?', if: OPEN, next: 'ask', once: true },
        { id: 'lio.latch', text: 'Who\'s Latch?', if: { knows: 'latch_heard' }, next: 'latch', once: true },
        bye,
      ],
    },
    again: { text: '"Twelve." The trays.', options: [{ id: 'lio.pump.again', text: 'The pump.', if: { all: [{ knows: 'st_tank_log' }, { not: { seen: 'lio.pump' } }] }, next: 'pump' }, { id: 'lio.shared.again', text: 'Five to two for the beds, two to five for you.', if: { all: [{ knows: 'st_tank_log' }, OPEN, { not: { flag: 'st_lio_shared' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'st_oskar_keeps' }, dc: -10, why: 'the keeper will hold the stop himself' }, { if: { item: 'k_st_tank_log' }, dc: -10, why: 'three years of *residue* in his own keeper\'s hand' }] }, next: 'shared_ok', fail: 'shared_no' }, { id: 'lio.ask.again', text: 'What do you want from the committee?', if: { all: [OPEN, { not: { seen: 'lio.ask' } }] }, next: 'ask' }, { id: 'lio.latch.again', text: 'Who\'s Latch?', if: { all: [{ knows: 'latch_heard' }, { not: { seen: 'lio.latch' } }] }, next: 'latch' }, bye] },
    pump: { text: '"The pump takes what the pump can. Nothing says it has to." He says it the way the keeper said it, which means he has heard the keeper say it. "If I stop at three the trays go yellow by Thursday and Latch takes his third out of the yellow. You want me to say sorry to nine old people, I\'ll say it. Sorry. Sixty."', effects: [{ learn: 'st_lio_sixty' }], options: [bye] },
    shared_ok: { text: 'He looks at the trays for a long time, and at the beds, and at the keeper\'s chair. "Two to five." He says it like a man trying a number. "That\'s the main\'s live hours anyway; the pump can\'t draw without it." Something eases. "Say it to Hester. If she signs it, I keep it. If she doesn\'t, I never said it."', effects: [{ set: 'st_lio_shared' }, { learn: 'st_lio_shared' }, { xp: 40 }], options: [bye] },
    shared_no: { text: '"Hours." He shakes his head. "Hours are what Nine\'s had for three springs. Residue hours."', options: [bye] },
    ask: { text: '"The committee to say the tank\'s the trays\'. Out loud, in the ledger, so Ren stops talking about jerry-cans and Nine carries buckets from the laundry like we did before the pump." He wipes his hands. "You\'re not Nine. Hester listens to people who aren\'t Nine. Say it for us and there\'s a hundred and twenty in it, and Latch\'s card, which is worth more than the hundred and twenty if you ever want work that pays in Crown coin."', effects: [{ set: 'st_lio_asked' }, { learn: 'latch_heard' }], options: [bye] },
    latch: { text: '"Brings the nutrient. Takes a third of the crop up the Loop in crates with no name on them." He does not lower his voice; there is nobody up here to hear. "Concern. Everyone knows. The trays are Concern-made, the pump\'s Concern-made, and one day the deal\'s going to have a line in it about who owns the deck. I know. I\'ve read it. Sixty people eat."', effects: [{ learn: 'st_latch_concern' }, { lead: 'l_st_latch' }], options: [bye] },
    after: { text: [{ if: { flag: 'st_roof', eq: 'shared' }, text: '"Two to five." The trays are green and he is counting them. "Latch didn\'t like it. Latch doesn\'t have to."' }, { if: { flag: 'st_roof', eq: 'twelves' }, text: '"Committee-signed." He has the hundred and twenty counted. "And Latch\'s card. He says you\'re the kind he looks for. I\'d take that as a warning." He hands over both.' }, { if: { flag: 'st_roof', eq: 'nines' }, text: '"Pump\'s dead." He is carrying a bucket. "Sixty people. You did the sum and got nine. I\'ll remember the sum."' }, { text: 'The awning is a black frame and the trays are a smell. He does not say anything to you at all.' }], effects: [{ set: 'st_lio_after' }], options: [{ id: 'after.pay', text: '(Take the hundred and twenty, and the card.)', if: { all: [{ flag: 'st_roof', eq: 'twelves' }, { not: { flag: 'st_lio_paid' } }] }, effects: [{ give: 'tolls', count: 120 }, { give: 'k_latch_card' }, { set: 'st_lio_paid' }, { learn: 'concern_card' }], exit: true }, bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_st_nessa: DialogueDef = {
  id: 'd_st_nessa', owner: 'npc_st_04',
  start: [{ if: { flag: 'st_fight_twelves' }, node: 'fight' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman with her arm in a pump to the shoulder. "Nessa. The pump\'s mine. Don\'t touch the pump." She does not take her arm out. "Two to five. It\'s on the panel. It\'s not a secret; it\'s a schedule."',
      effects: [{ learn: 'nessa_seen' }],
      passives: [{ attr: 'senses', dc: 7, text: 'The pump\'s casing has a small moulded mark under the grime, the same mark as on the nutrient crate: a company that is also a word.', effects: [{ learn: 'latch_heard' }] }],
      options: [{ id: 'nessa.why', text: 'Why two?', next: 'why', once: true }, bye],
    },
    why: { text: '"Because the main\'s only live from eleven to five and the lifts eat it till two." She finally takes her arm out. "Everyone thinks we chose two. The Plan chose two. We just stayed up for it."', effects: [{ learn: 'st_power_at_two' }, { lead: 'l_st_tank' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_st_pump_panel: DialogueDef = {
  id: 'd_st_pump_panel', owner: 'narrator', start: [{ if: { flag: 'st_pump_broken' }, node: 'dead' }, { node: 'panel' }],
  nodes: {
    panel: {
      text: 'The pump\'s panel: a Concern-made box with a schedule set in it — 02:00–05:00 FULL DRAW — and a fuse the size of a thumb behind a cover that is not locked, because nobody up here has ever needed to lock anything from Nine.',
      effects: [{ learn: 'st_pump_seen' }],
      options: [
        { id: 'pump.pull', text: '(Pull the fuse and pocket it.)', if: OPEN, check: { skill: 'stealth', dc: 35, mods: [{ if: NIGHT, dc: -15, why: 'the deck sleeps between the pump\'s hours' }, { if: { flag: 'st_pale_leave' }, dc: 0, why: '' }] }, next: 'pulled', fail: 'caught' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    pulled: { text: 'The fuse comes out warm. The hum stops. Across the deck nobody turns round, because the pump stops every morning at five and the ear has learned not to hear it. By two tomorrow the trays will be dry and the beds will be wet, and Nessa Kord will be looking for a thumb-sized thing with your name not on it.', effects: [{ set: 'st_pump_broken' }, { set: 'st_roof', value: 'nines' }, { xp: 110 }, { decision: { id: 'st_nines', text: 'You pulled the fuse on the Twelves\' pump and gave the Stacks\' roof tank to the beds.' } }, { trust: { npc: 'npc_st_05', by: 20 } }, { trust: { npc: 'npc_st_03', by: -30 } }], options: [{ text: '(Walk away.)', exit: true }] },
    caught: { text: 'Your hand is on the cover when Nessa Kord\'s is on your wrist. "Don\'t touch the pump." She says it without heat; she will say it to Lio with heat.', effects: [{ set: 'st_pump_caught' }, { trust: { npc: 'npc_st_03', by: -15 } }, { time: 10 }], options: [{ text: '(Step back.)', exit: true }] },
    dead: { text: 'The panel is dark and the fuse cover hangs open.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_st_deel: DialogueDef = {
  id: 'd_st_deel', owner: 'npc_st_05',
  start: [{ if: { flag: 'st_roof' }, node: 'after' }, { if: { flag: 'deel_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old woman on her knees in a bed of dirt, watering a plant with a cup. "Mama Deel. Nine." She does not stop. "Thirty years of buckets. I carried the first one. Tomatoes, the year the lifts stopped; red ones; ask anyone over fifty." The dirt is dry a finger down.',
      effects: [{ set: 'deel_met' }, { learn: 'deel_seen' }],
      options: [
        { id: 'deel.trays', text: 'The trays feed sixty.', next: 'trays', once: true },
        { id: 'deel.ren', text: 'Ren has a jerry-can.', if: { knows: 'st_ren_fuel' }, next: 'ren', once: true },
        bye,
      ],
    },
    again: { text: '"Dirt remembers."', options: [{ id: 'deel.trays.again', text: 'The trays feed sixty.', if: { not: { seen: 'deel.trays' } }, next: 'trays' }, { id: 'deel.ren.again', text: 'Ren has a jerry-can.', if: { all: [{ knows: 'st_ren_fuel' }, { not: { seen: 'deel.ren' } }] }, next: 'ren' }, bye] },
    trays: { text: '"They do." She straightens, slowly. "And when Latch stops bringing the nutrient they\'ll feed nobody, and the trays will be plastic, and this will still be dirt." She points the cup at the tree. "I don\'t want the tank. I want two in the morning. Tell Lio: two. Two is all the dirt needs."', effects: [{ learn: 'st_deel_two' }], options: [bye] },
    ren: { text: '"I know what Ren has." She goes back to her knees. "He\'s twenty-four. At twenty-four I carried a bucket up forty floors every day for a year. He wants to carry a can up once. Tell him dirt remembers. He won\'t listen; tell him anyway."', effects: [{ learn: 'st_deel_no_burn' }], options: [bye] },
    after: { text: [{ if: { flag: 'st_roof', eq: 'shared' }, text: '"Two in the morning." The dirt is dark a hand down and she has her palm flat on it. "Thirty years. I\'ll have tomatoes by the Long Night, you watch."' }, { if: { flag: 'st_roof', eq: 'nines' }, text: '"Wet at six." She is not happy; she is watering. "Sixty people, Lio says. He\'s right. I\'ll be carrying them water from the laundry by Thursday, you watch."' }, { if: { flag: 'st_roof', eq: 'burned' }, text: 'She is not in the beds. She is on the deck, in the ash, with a cup, watering a tray that is a puddle of plastic, because somebody should.' }, { text: '"The tank\'s theirs." She has a bucket beside her. "Thirty years. I\'ll carry."' }], options: [bye] },
  },
};

export const d_st_ren: DialogueDef = {
  id: 'd_st_ren', owner: 'npc_st_10',
  start: [{ if: { flag: 'st_fight_twelves' }, node: 'fight' }, { if: { flag: 'st_roof' }, node: 'after' }, { if: { flag: 'ren_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young man with a hoe he holds like a weapon and a look at the deck he does not hide. "Ren. Nine. Mama Deel says talk. Mama Deel\'s been saying talk for three springs and the dirt\'s been dry for three springs." He lowers his voice, which is not low. "I\'ve a jerry-can. One night. Trays burn; dirt doesn\'t."',
      effects: [{ set: 'ren_met' }, { learn: 'st_ren_fuel' }],
      options: [
        { id: 'ren.burn', text: 'Then let\'s burn them. Tonight.', if: OPEN, next: 'burn' },
        { id: 'ren.fight', text: 'Not fire. Go and take the deck. I\'ll be beside you.', if: OPEN, next: 'fight_offer' },
        { id: 'ren.no', text: 'Dirt remembers. Burn the trays and Nine\'s the floor that burned sixty dinners.', if: { knows: 'st_deel_no_burn' }, check: { skill: 'speech', dc: 35 }, next: 'no_ok', fail: 'no_no' },
        bye,
      ],
    },
    again: { text: '"One night."', options: [{ id: 'ren.burn.again', text: 'Then let\'s burn them.', if: { all: [OPEN, { not: { flag: 'st_ren_talked_down' } }] }, next: 'burn' }, { id: 'ren.fight.again', text: 'Not fire. Take the deck.', if: { all: [OPEN, { not: { flag: 'st_ren_talked_down' } }] }, next: 'fight_offer' }, { id: 'ren.no.again', text: 'Dirt remembers.', if: { all: [{ knows: 'st_deel_no_burn' }, { not: { seen: 'ren.no' } }] }, check: { skill: 'speech', dc: 35 }, next: 'no_ok', fail: 'no_no' }, bye] },
    burn: { text: '"Tonight." He says it like a man who has said it to himself for a year and never to anyone else. "Two, when the pump\'s loud. You take Nessa\'s side; I take the can."', options: [{ id: 'burn.yes', text: '(Two, then.)', effects: [{ time: 240 }, { set: 'st_roof', value: 'burned' }, { set: 'st_trays_burned' }, { set: 'st_fight_twelves' }, { rep: { faction: 'wardens', respect: 0 } }, { decision: { id: 'st_burned', text: 'You and Ren Ashby burned the Twelves\' trays on the Stacks\' roof.' } }, { trust: { npc: 'npc_st_05', by: -30 } }, { trust: { npc: 'npc_st_01', by: -30 } }, { news: { tag: 'stacks_fire', text: 'the Twelves\' hydroponic deck on Block Seven burned in the night; a stranger was seen on the roof', valence: -12, size: 7, at: 'meridian' } }], next: 'burned' }, { text: 'No.', exit: true }] },
    burned: { text: 'Two in the morning, and the pump loud, and the awning going up faster than either of you thought a thing that wet could, and sixty dinners with it, and Nessa Kord\'s hands when she went in after the pump. Ren is standing in the beds afterwards with the can still in his hand, not looking at anything. "Dirt doesn\'t," he says. The Twelves are coming across the deck with pipes.', options: [{ text: '(Face them.)', effects: [{ event: 'combat' }], exit: true }] },
    fight_offer: { text: '"Take it." He looks at the deck, and at the three of them, and at you. "With you, yes." He picks up the hoe properly.', options: [{ id: 'fight.yes', text: '(Go.)', effects: [{ set: 'st_fight_twelves' }, { set: 'st_roof_fight' }, { decision: { id: 'st_roof_fight', text: 'You went across the Stacks\' roof with Ren Ashby to take the Twelves\' deck by force.' } }], next: 'going' }, { text: 'Not yet.', exit: true }] },
    going: { text: 'Across the roof. Lio Brand sees you coming and puts down the tray he is holding, carefully, and picks up the wrench.', options: [{ text: '(Go.)', effects: [{ event: 'combat' }], exit: true }] },
    no_ok: { text: 'He looks at the hoe for a long time. "Sixty dinners." He puts the can — it was behind the shed, where everybody knew it was — on its side, and the fuel goes into the dirt, where Mama Deel will complain about it for a year. "Talk, then. You talk. I\'ve been talking to dirt."', effects: [{ set: 'st_ren_talked_down' }, { trust: { npc: 'npc_st_10', by: 15 } }, { trust: { npc: 'npc_st_05', by: 10 } }, { xp: 50 }], options: [bye] },
    no_no: { text: '"Dirt remembers." He almost spits. "Dirt\'s been remembering for three springs. I\'d like it to forget something."', options: [bye] },
    after: { text: [{ if: { flag: 'st_roof', eq: 'shared' }, text: '"Two in the morning." He is watering with a hose that runs. "Mama Deel says you talked. I\'d have burned. I know which one I\'d have been proud of." He does not say which.' }, { if: { flag: 'st_roof', eq: 'nines' }, text: '"Wet." He is grinning, and then not. "Lio\'s carrying buckets. I\'ll be carrying them with him by Thursday; Mama Deel\'s already said."' }, { if: { flag: 'st_roof', eq: 'burned' }, text: 'He is sitting in the beds with his back to the deck and the can on its side, empty. He does not look up.' }, { text: '"Theirs." He has the hoe. "Committee said. The committee can carry its own buckets."' }], options: [bye] },
    fight: { text: '"Beside me."', options: [{ text: '(Go.)', exit: true }] },
  },
};

export const d_st_latch: DialogueDef = {
  id: 'd_st_latch', owner: 'npc_st_09',
  start: [{ if: { flag: 'latch_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a coat that has never been dirty, in a chair under the awning, with a crate at his feet and his hands folded. "Latch. Just Latch." The smile is a tool and he is good with it. "I bring the nutrient; I take a third. The trays feed sixty. You\'ve been asking the floor its arithmetic. Here is mine: nobody has to decide anything today. That is the whole of what I offer, and people find it very restful."',
      effects: [{ set: 'latch_met' }, { learn: 'latch_seen' }, { learn: 'latch_heard' }, { learn: 'concern_seen' }],
      options: [
        { id: 'latch.who', text: 'Who do you bring it for?', next: 'who', once: true },
        { id: 'latch.deck', text: 'One day the deal has a line about who owns the deck.', if: { knows: 'st_latch_concern' }, next: 'deck', once: true },
        { id: 'latch.me', text: 'And me? What\'s your arithmetic for me?', next: 'me', once: true },
        bye,
      ],
    },
    again: { text: '"Nobody has to decide anything today."', options: [{ id: 'latch.who.again', text: 'Who do you bring it for?', if: { not: { seen: 'latch.who' } }, next: 'who' }, { id: 'latch.deck.again', text: 'The line about the deck.', if: { all: [{ knows: 'st_latch_concern' }, { not: { seen: 'latch.deck' } }] }, next: 'deck' }, { id: 'latch.me.again', text: 'Your arithmetic for me.', if: { not: { seen: 'latch.me' } }, next: 'me' }, bye] },
    who: { text: '"A concern." He lets the word sit there being both things. "In Halcyon. It believes in growth, and in people who carry crates up forty floors without being asked, and in not having to say its name on rooftops."', effects: [{ learn: 'concern_halcyon' }], options: [bye] },
    deck: { text: '"There is always a line." He is pleased you found it. "It says what every line says: that a thing built with our pump and fed with our nutrient is, in the end, ours, and that the people on it are, in the end, tenants. Lio has read it. Lio feeds sixty. Lio has decided not to decide anything today, which is wise."', effects: [{ learn: 'concern_tenancy' }, { lead: 'l_st_latch' }], options: [bye] },
    me: { text: '"You get things settled. Settled is the rarest thing in this city and the Concern pays for it in coin that is counted." He takes a card from the coat: plain, a number, nothing else. "When you want work that pays in Crown coin, show this at the Docks. Nobody has to decide anything today." He puts it on the crate between you, and does not watch to see whether you take it.', effects: [{ learn: 'concern_offer' }], options: [{ id: 'me.take', text: '(Take the card.)', if: { not: { item: 'k_latch_card' } }, effects: [{ give: 'k_latch_card' }, { set: 'latch_card_taken' }, { learn: 'concern_card' }], exit: true }, { text: '(Leave it on the crate.)', effects: [{ set: 'latch_card_refused' }], exit: true }] },
  },
};

// ---------------------------------------------------------------- the lobby and the floor

export const d_st_fitch: DialogueDef = {
  id: 'd_st_fitch', owner: 'npc_st_07', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'A trader under the dead stairs with water in jerry-cans and tins in rows. "Fitch. Everything a floor needs and nothing a floor wants." He taps a can. "Water. Don\'t ask whose. Everyone asks whose."', effects: [{ learn: 'fitch_seen' }], options: [{ text: 'Show me.', effects: [{ event: 'barter' }], exit: true }, { id: 'fitch.whose', text: 'Whose?', next: 'whose', once: true }, bye] }, whose: { text: '"The laundry\'s, Tuesdays. The tank\'s, when Oskar\'s looking at the view. The Precinct main\'s, when I\'ve a cousin on it." He shrugs. "Water in the Stacks is a thing you carry, not a thing you have. I carry."', effects: [{ learn: 'fitch_water' }], options: [bye] } },
};

export const d_st_bo: DialogueDef = {
  id: 'd_st_bo', owner: 'npc_st_06',
  start: [{ if: { flag: 'bo_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy who appears beside you on the stair without having been on it. "Bo. Nine floors in two minutes, timed. Twelve pays a Toll a message; Nine pays bread." He looks at you for weight. "You\'re new. New people pay in questions."',
      effects: [{ set: 'bo_met' }],
      options: [
        { id: 'bo.flat', text: '9-14. Who were the Marrs?', next: 'marrs', once: true },
        { id: 'bo.ulla', text: 'Ulla, in the shaft room.', next: 'ulla', once: true },
        { id: 'bo.latch', text: 'The man in the clean coat on the roof.', next: 'latch', once: true },
        bye,
      ],
    },
    again: { text: '"Two minutes. Timed."', options: [{ id: 'bo.flat.again', text: 'The Marrs.', if: { not: { seen: 'bo.flat' } }, next: 'marrs' }, { id: 'bo.ulla.again', text: 'Ulla.', if: { not: { seen: 'bo.ulla' } }, next: 'ulla' }, { id: 'bo.latch.again', text: 'The man in the clean coat.', if: { not: { seen: 'bo.latch' } }, next: 'latch' }, bye] },
    marrs: { text: '"Went to the Ring. Everyone who goes to the Ring goes because of a notice. They left the kettle." He shrugs. "Hester sealed the door. Hester seals everything; it\'s what Hester is."', effects: [{ learn: 'st_marrs' }], options: [bye] },
    ulla: { text: '"She hears the lifts count. Two in the morning, every night, to forty." He is matter-of-fact. "She\'s not wrong. I\'ve heard it. Everyone\'s heard it; she\'s just the only one who sits with it."', effects: [{ learn: 'st_ulla_counts' }], options: [bye] },
    latch: { text: '"Thursdays. Brings a crate up on the Loop and takes three down." Lower: "Lio says don\'t talk to Latch. Lio talks to Latch."', effects: [{ learn: 'latch_heard' }], options: [bye] },
  },
};

export const d_st_ulla: DialogueDef = {
  id: 'd_st_ulla', owner: 'npc_st_08',
  start: [{ if: { flag: 'ulla_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in the shaft room, which is warm, on a cot against the lift\'s wall with her ear near it. "Sit. It\'s warm; it\'s always been warm. The lift doesn\'t run and the shaft is warm, and nobody asks why." She looks at you with the attention of someone who listens for a living. "It counts. Two in the morning. To forty. Then it stops."',
      effects: [{ set: 'ulla_met' }, { learn: 'ulla_seen' }],
      options: [
        { id: 'ulla.warm', text: 'Why is it warm?', next: 'warm', once: true },
        { id: 'ulla.count', text: 'What is it counting?', next: 'count', once: true },
        bye,
      ],
    },
    again: { text: '"It counts."', options: [{ id: 'ulla.warm.again', text: 'Why is it warm?', if: { not: { seen: 'ulla.warm' } }, next: 'warm' }, { id: 'ulla.count.again', text: 'What is it counting?', if: { not: { seen: 'ulla.count' } }, next: 'count' }, bye] },
    warm: { text: '"Because something in the shaft is on." She puts her palm flat on the wall. "Not the lift. Under the lift. The Plan says the lifts run; the lifts don\'t; but something under them has run every night for forty years on the block\'s whole power for three minutes and the shaft stays warm all day from it." She takes the hand away. "I don\'t know what. I sit with it. Somebody should."', effects: [{ learn: 'st_shaft_warm' }, { lead: 'l_st_tank' }], options: [bye] },
    count: { text: '"Floors, I thought. Forty floors. Then I thought: people. Then I stopped thinking and listened, and it\'s neither. It\'s the same forty every night, in the same order, and one of the numbers is always a little longer than the others, like a name you say carefully." She almost smiles. "Twenty-six. Listen for twenty-six, if you\'re here at two."', effects: [{ learn: 'st_twenty_six' }], options: [bye] },
  },
};

export const STACKS_DIALOGUES: DialogueDef[] = [
  d_st_loop, d_st_block_sign, d_st_lift_sign, d_st_stair_sign, d_st9_stair_sign, d_st_tank_sign, d_st_beds_sign, d_st_trays_sign, d_st_lift_panel, d_st_board, d_st9_board,
  d_st_hester, d_st_flat_door, d_st_flat, d_st_oskar, d_st_valve, d_st_lio, d_st_nessa, d_st_pump_panel, d_st_deel, d_st_ren, d_st_latch, d_st_fitch, d_st_bo, d_st_ulla,
];
