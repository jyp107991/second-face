import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { WORLD_MAP } from '../world/map';

/**
 * The Rail Corridor (B5a): the Line as transport and the corridor's roads. Every stop's ticket point is one service tree
 * built by `lineBoard()`: a fare to each other stop (the network's own, a leg at a time), the ride itself (the first ride,
 * Kettle Cut seen from the car, pilot working once the halts are paid), and the field map (the engine's own planner). The
 * other ways on: a Line pass, a guild hand's exemption, a free ride earned on the footplate at Yard Nine, the rods on Yard
 * Nine's curve, and West Halt's handcar. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B5.
 */

export const TAMSIN = 'npc_c9_03';
export const WREN = 'npc_rd_03';
export const ILYA = 'npc_sh_17';
export const ODILE = 'npc_nb_03';
export const ASH = 'npc_of_03';
export const NINE = 'npc_md_nine';
export const KES = 'npc_hs_01';
export const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
export const bye: OptionDef = { text: 'That\'s all.', exit: true };
export const leave: OptionDef = { text: '(Leave it.)', exit: true };
export const NIGHT: Cond = { hour: { from: 22, to: 5 } };
export const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
export const IN = (who: string): Cond => ({ inParty: who });

/** The rail bandits' line is open until the player settles it one way or another. */
export const KETTLE_OPEN: Cond = { not: { flag: 'rc_bandits' } };
export const BANDITS = (v: string): Cond => ({ flag: 'rc_bandits', eq: v });
/** The guild pays the halts again (pilot working or the deal at Four Ways). */
export const HALTS_PAID: Cond = { flag: 'rc_halts', eq: 'paid' };
/** West Halt trusts the player: the twelve helped, or the halts paid again, or the keeper's word. */
export const HW_TRUST: Cond = { any: [{ flag: 'rc_hw_trust' }, HALTS_PAID] };
/** Rides without a fare: the pass, a guild hand's exemption, or a ride earned on the footplate. */
export const FREE: Cond = { any: [{ item: 'k_rc_pass' }, { ability: 'toll_exempt' }, { flag: 'rc_free_ride' }] };
export const LEVY: Cond = { flag: 'rc_kettle_levy' };

/** Where each stop on the Line puts you down. */
export const STOPS: Record<string, { name: string; map: string; spawn: string }> = {
  // the Line's far end is Carrick, Meridian's docks across the dry river (B5b): the terminus under the freight shed
  meridian: { name: 'Meridian Docks', map: 'md_docks', spawn: 'platform' },
  halt_w: { name: 'West Halt', map: 'rc_halt_w', spawn: 'platform' },
  depot: { name: 'Yard Nine', map: 'rc_yard', spawn: 'platform' },
  junction: { name: 'Four Ways', map: 'rc_fourways', spawn: 'platform' },
  halt_e: { name: 'East Halt', map: 'rc_halt_e', spawn: 'platform' },
  skirts: { name: 'Two-Twelve', map: 'hs_skirts', spawn: 'from_halt_e' },
};

const LINE = WORLD_MAP.networks.net_line;
/** Legs between two stops, and the hours the cars take over them. */
export function legs(from: string, to: string): { n: number; hours: number; kettle: boolean } {
  const i = LINE.stops.indexOf(from), j = LINE.stops.indexOf(to);
  const a = Math.min(i, j), b = Math.max(i, j);
  const hours = LINE.legHours.slice(a, b).reduce((t, h) => t + h, 0);
  const w = LINE.stops.indexOf('halt_w'), d = LINE.stops.indexOf('depot');
  return { n: b - a, hours, kettle: a <= w && b >= d };
}

/** Off the car at a stop: the clock has run for the legs; the place goes on the map. */
export const ARRIVE = (to: string): Effect[] => [
  { set: 'rc_rode' }, { set: 'rc_free_ride', value: false }, { inc: 'rc_rides' }, { learn: `loc_${to}` }, { set: `visited_${to}` },
  { event: 'goto', data: { location: STOPS[to].map, spawn: STOPS[to].spawn } },
];

/** The car itself: the first ride, Kettle Cut from the window, pilot working at the halts, and the plain run. */
function rideNode(from: string, to: string): NodeDef {
  const L = legs(from, to);
  const kettle: Effect[] = L.kettle ? [{ learn: 'loc_lm_rc_kettle' }, { learn: 'rc_kettle_from_car' }] : [];
  const kettleLine = L.kettle ? ' At Kettle Cut the train slows for the curve, and in the ditch under the window two cars lie on their sides, opened like tins. The guard watches them go by and says nothing at all.' : '';
  return {
    speaker: 'narrator',
    text: [
      { if: { not: { flag: 'rc_rode' } }, text: `You wait on the platform for the seven o'clock. It comes in under its own smoke: Sixty, square-nosed and plated, pulling a pre-war coach with steel riveted over its windows to the height of a seated man, so that you look out over a rim of plate at the country going by. The guard punches your card and sits down opposite with a carbine across his knees. For the first hour you watch the land go past at the speed of a fast cart the way you would watch someone sleeping.${kettleLine} Then, somewhere, you sleep too, and wake to ${STOPS[to].name}.` },
      { if: { flag: 'rc_pilot' }, text: `The seven o'clock, and at every halt the train stops for a pilot in faded orange who climbs into the cab with a red flag rolled under his arm, rides the section and gets down at the next, while the halt sells water on the platform and somebody sells bread through the coach's slots.${kettleLine} ${STOPS[to].name}.` },
      { text: `The seven o'clock: the coach, the plate at the windows, the guard and his carbine, the country going by at the speed of a cart.${kettleLine} ${STOPS[to].name}.` },
    ],
    again: `The Line, to ${STOPS[to].name}.`,
    interject: [
      { companion: TAMSIN, if: { not: { flag: 'rc_rode' } }, text: 'Tamsin has her face to the slot over the plate the whole way. "It\'s moving and nobody\'s pushing it," she says, three times, and then, without looking round: "Don\'t tell anyone I said that."', effects: [A(TAMSIN, 3)] },
      { companion: WREN, if: { knows: 'rc_kettle_from_car' }, text: '"Two cars, one key," Wren says, watching the ditch go by. "Somebody knew which ones. That\'s not robbing. That\'s shopping."' },
      { companion: NINE, if: { not: { flag: 'rc_rode' } }, text: '"The token for each section is drawn at its end and surrendered at the next," Nine says, watching the signals. "A system with no memory but the register. I admire it."' },
    ],
    effects: kettle,
    options: [{ id: `ride.${from}.${to}`, text: `(Off at ${STOPS[to].name}.)`, effects: ARRIVE(to), exit: true, repeat: true }],
  };
}

/** A stop's ticket point: fares to every other stop (25 a leg, 30 with the guild's Kettle levy, nothing with a pass), the ride, the map. */
export function lineBoard(id: string, here: string, owner: string, intro: NodeDef['text'], again: string, extra: OptionDef[] = [], extraNodes: Record<string, NodeDef> = {}): DialogueDef {
  const nodes: Record<string, NodeDef> = { ...extraNodes };
  const opts: OptionDef[] = [];
  for (const to of LINE.stops) {
    if (to === here) continue;
    const L = legs(here, to);
    // the network's own fare a leg; the guild's Kettle levy adds five a leg
    const fare = LINE.fare * L.n, levy = (LINE.fare + 5) * L.n;
    const ride: Effect[] = [{ until: 7 }, { time: L.hours * 60 }];
    const label = `${STOPS[to].name}, ${L.n === 1 ? 'one leg' : `${L.n} legs`}`;
    opts.push(
      { id: `${id}.${to}.free`, text: `(${label}. No fare.)`, if: FREE, effects: ride, next: `ride_${to}`, repeat: true },
      { id: `${id}.${to}.levy`, text: `(${label}. ${levy} Tolls, with the Kettle levy.)`, if: { all: [{ not: FREE }, LEVY, TOLLS(levy)] }, effects: [{ take: 'tolls', count: levy }, ...ride], next: `ride_${to}`, repeat: true },
      { id: `${id}.${to}.fare`, text: `(${label}. ${fare} Tolls.)`, if: { all: [{ not: FREE }, { not: LEVY }, TOLLS(fare)] }, effects: [{ take: 'tolls', count: fare }, ...ride], next: `ride_${to}`, repeat: true },
    );
    nodes[`ride_${to}`] = rideNode(here, to);
  }
  nodes.board = {
    text: intro, again,
    effects: [{ learn: 'rc_line_board' }, { learn: `loc_${here}` }],
    options: [...opts, ...extra, { id: `${id}.map`, text: '(Look at the map of the Line.)', effects: [{ event: 'map' }], exit: true, repeat: true }, leave],
  };
  return { id, owner, start: [{ node: 'board' }], nodes };
}

// ---------------------------------------------------------------- the ticket points

const FARE_LINE: { if?: Cond; text: string }[] = [
  { if: { item: 'k_rc_pass' }, text: 'She looks at your pass, and at you, and punches nothing. "All sections. The seven o\'clock, either way."' },
  { if: LEVY, text: '"Thirty a leg." She taps a new card pinned beside the grille: KETTLE LEVY — BY ORDER OF THE GUILD. "Don\'t look at me. Look at Kettle."' },
  { text: '"Seven o\'clock both ways. Twenty-five a leg. The guild sets it, not me."' },
];

export const d_rc_board_fw = lineBoard('d_rc_board_fw', 'junction', 'npc_rc_06',
  [
    { if: { not: { knows: 'rc_line_board' } }, text: 'A window in the ticket hall with a brass grille, and behind it a young woman with a card punch, a book of blank toll cards and a pencil. "The Line." She looks at your face the way a clerk looks at a form, and draws it on a card in four quick lines: the guild puts a likeness on every card. "Seven o\'clock both ways. Twenty-five a leg. The guild sets it, not me."' },
    ...FARE_LINE,
  ],
  'Yetunde Ajayi, behind the grille, with the punch.',
  [
    { id: 'fw.gossip', text: 'Who robs the trains at Kettle?', if: { not: { seen: 'fw.gossip' } }, next: 'gossip' },
    { id: 'fw.card', text: 'Why a face on a ticket?', if: { not: { seen: 'fw.card' } }, next: 'card' },
  ],
  {
    gossip: { speaker: 'npc_rc_06', text: '"Nobody." She says it the way everyone on the Line says it. "Ask the factor, he\'s paying for an answer. Two hundred." She lowers her voice. "They never touch the coach. I\'ve sold a ticket to every passenger on every train they stopped, and every one of them got off with their purse."', again: '"Ask the factor."', effects: [{ lead: 'l_rc_sealed' }, { quest: 'q_rc_kettle', start: true }], options: [{ text: 'Something else.', next: 'board' }] },
    card: { speaker: 'npc_rc_06', text: '"So the card can\'t be sold on." She blows on your likeness to dry it. "And because the guild sends the faces south with the takings. Everyone\'s face goes somewhere." She does not say where, and you do not think she knows.', again: '"Everyone\'s face goes somewhere."', effects: [{ learn: 'rc_card_face' }], options: [{ text: 'Something else.', next: 'board' }] },
  });

const REQUEST: NodeDef['text'] = [
  { if: HALTS_PAID, text: 'A tin flag on a post at the platform\'s edge, painted red, and the board behind it scraped back to its old letters: TRAINS STOP ON REQUEST. The seven o\'clock stops here whether it is flagged or not now, for the pilot. The guard sells the ticket on the car.' },
  { text: 'A tin flag on a post at the platform\'s edge: raise it and the seven o\'clock stops for you, though the through goes by for nobody. The guard sells the ticket on the car.' },
];

export const d_rc_board_hw = lineBoard('d_rc_board_hw', 'halt_w', 'narrator', REQUEST, 'The request flag, red on its post.');
export const d_rc_board_he = lineBoard('d_rc_board_he', 'halt_e', 'narrator', REQUEST, 'The request flag, red on its post.');

const FOOTPLATE_OK: Cond = { not: { flag: 'rc_willem_dead' } };
export const d_rc_board_yd = lineBoard('d_rc_board_yd', 'depot', 'narrator',
  [
    { if: { item: 'k_rc_pass' }, text: 'The yard board, chalked with the day\'s paths: the seven o\'clock both ways, THROUGH at two. The clerk in the yard office window sees your pass and waves you on without getting up.' },
    { text: 'The yard board, chalked with the day\'s paths: the seven o\'clock both ways, and THROUGH at two in a different hand, underlined. A clerk in the yard office window sells tickets at the guild\'s rate.' },
  ],
  'The yard board. THROUGH at two, underlined.',
  [
    { id: 'yd.foot', text: '(Ask Willem Visser for a ride on the footplate.)', if: { all: [FOOTPLATE_OK, { not: { flag: 'rc_free_ride' } }, { not: FREE }] }, next: 'foot' },
  ],
  {
    foot: {
      speaker: 'npc_rc_17',
      text: 'The driver looks you over from the cab step. "A pair of hands that can read a gauge, or a pair of eyes and a rifle for the cuttings. Either rides free. Neither rides if it\'s useless."',
      again: '"Gauges or a rifle."',
      options: [
        { id: 'yd.foot.gauges', text: '(Read the gauges for him.)', check: { skill: 'mechanics', dc: 35 }, effects: [{ set: 'rc_free_ride' }, { xp: 20 }], next: 'foot_ok', fail: 'foot_no' },
        { id: 'yd.foot.rifle', text: '(Ride as his eyes at the cuttings.)', check: { skill: 'firearms', dc: 35 }, effects: [{ set: 'rc_free_ride' }, { xp: 20 }], next: 'foot_ok', fail: 'foot_no' },
        { text: 'Never mind.', next: 'board' },
      ],
    },
    foot_ok: { speaker: 'npc_rc_17', text: '"Good enough." He jerks his head at the cab. "Next seven o\'clock, either way. Don\'t touch anything I haven\'t told you to touch."', again: '"Don\'t touch anything."', options: [{ text: '(Back to the board.)', next: 'board' }] },
    foot_no: { speaker: 'npc_rc_17', text: '"No." Not unkindly. "Buy a ticket. The coach is safer than the cab with you in it."', again: '"Buy a ticket."', options: [{ text: '(Back to the board.)', next: 'board' }] },
  });

/** The Skirts' Line board opens this when the player asks to ride west (B4a's d_hs_board). */
export const d_rc_board_sk = lineBoard('d_rc_board_sk', 'skirts', 'narrator',
  [{ text: 'The window under the Line board at Two-Twelve, where a guild clerk in a coat too thin for the Teeth sells tickets west, in Tolls only. "Seven o\'clock. Twenty-five a leg."' }],
  'The window under the Line board. Seven o\'clock, west.');

// ---------------------------------------------------------------- the rods on Yard Nine's curve

export const d_rc_curve: DialogueDef = {
  id: 'd_rc_curve', owner: 'narrator',
  start: [{ if: { all: [{ knows: 'rc_rods_known' }, { hour: { from: 1, to: 4 } }] }, node: 'night' }, { node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { knows: 'rc_rods_known' }, text: 'The main line bends out of the yard here, and anything on it slows for the bend whether it means to stop or not. The through comes round at two, walking pace, for half a minute. Ferris was right: you could step onto it.' },
        { text: 'The main line bends out of the yard here, and anything on it slows for the bend whether it means to stop or not. Somebody has worn a path to the edge of the ballast and a flat stone to stand on.' },
      ],
      again: 'The bend, and the flat stone.',
      options: [leave],
    },
    night: {
      text: 'Two in the morning, and down the line the through\'s lamp, coming slow round the bend: nineteen sealed cars with the closed eye on their doors, a ladder at every car\'s end, and the guard\'s lamp on the last.',
      again: 'The through, coming round the bend.',
      options: [
        { id: 'curve.hop', text: '(Step off the stone onto a ladder as it passes.)', check: { skill: 'stealth', dc: 40 }, next: 'rods', fail: 'caught' },
        { id: 'curve.jump', text: '(Run and jump for a ladder.)', check: { attr: 'reflex', dc: 7 }, next: 'rods', fail: 'caught' },
        leave,
      ],
    },
    rods: {
      speaker: 'narrator',
      text: 'You are up a ladder and flat on a car\'s roof with the night going by under you, and nobody has seen. The through runs west without stopping: it slows for nothing but Kettle\'s curve, and the yard throat at the city.',
      again: 'Flat on the roof, the night going by.',
      interject: [{ companion: WREN, text: 'Wren lands on the roof beside you without a sound and lies there grinning at the stars. "Kessler would have charged for that," she says.' }],
      options: [
        { id: 'rods.kettle', text: '(Drop off at Kettle, where she slows for the curve.)', effects: [{ time: 180 }, { learn: 'loc_lm_rc_kettle' }, { set: 'rc_rode_rods' }, { event: 'goto', data: { location: 'rc_kettle', spawn: 'from_depot' } }], exit: true, repeat: true },
        { id: 'rods.city', text: '(Ride her all the way to the city.)', effects: [{ time: 960 }, { set: 'rc_rode_rods' }, { set: 'visited_meridian' }, { event: 'goto', data: { location: 'md_docks', spawn: 'yard' } }], exit: true, repeat: true },
      ],
    },
    caught: {
      speaker: 'narrator',
      text: 'A lamp in your face and a carbine under it: the through\'s guard, hanging off the last car\'s step. "Twenty," he says, "or you walk from Kettle." The train does not slow down to discuss it.',
      again: '"Twenty, or you walk from Kettle."',
      options: [
        { id: 'caught.pay', text: '(Pay twenty.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }], next: 'rods' },
        { id: 'caught.walk', text: '(Let him put you off at Kettle.)', effects: [{ time: 180 }, { learn: 'loc_lm_rc_kettle' }, { event: 'goto', data: { location: 'rc_kettle', spawn: 'from_depot' } }], exit: true, repeat: true },
      ],
    },
  },
};

// ---------------------------------------------------------------- West Halt's handcar

export const d_rc_handcar: DialogueDef = {
  id: 'd_rc_handcar', owner: 'npc_rc_10',
  start: [{ if: HW_TRUST, node: 'ride' }, { node: 'look' }],
  nodes: {
    look: {
      speaker: 'narrator',
      text: 'A handcar on the spur: a flat bed on four wheels, a see-saw pump handle, a lamp with a green hood, and WEST HALT — PERMANENT WAY stencilled on the side. The rails under it are bright.',
      again: 'The handcar, its green lamp.',
      passives: [{ skill: 'survival', dc: 30, text: 'The flanges are bright with use and the axle greased this week. Somebody runs this a long way, often, at night.', effects: [{ learn: 'rc_handcar_used' }] }],
      options: [{ id: 'handcar.ask', text: '(Ask Eamon to run you up the line.)', next: 'no' }, leave],
    },
    no: { text: '"Not for hire." Eamon does not look up from the axle. "Permanent way. It runs when the length needs it."', again: '"Permanent way."', options: [leave] },
    ride: {
      text: '"Where to?" Eamon has the lamp lit already. "Not Four Ways. Out of timetable\'s out of law on his track, and his watch shoots. Anywhere this side of it."',
      again: '"Where to? Not Four Ways."',
      options: [
        { id: 'handcar.kettle', text: '(To Kettle Cut.)', effects: [{ time: 150 }, { learn: 'loc_lm_rc_kettle' }, { event: 'goto', data: { location: 'rc_kettle', spawn: 'from_halt_w' } }], exit: true, repeat: true },
        { id: 'handcar.yard', text: '(To Yard Nine.)', effects: [{ time: 300 }, { learn: 'loc_depot' }, { event: 'goto', data: { location: 'rc_yard', spawn: 'from_halt_w' } }], exit: true, repeat: true },
        leave,
      ],
    },
  },
};

// ---------------------------------------------------------------- the corridor's roads

const on: OptionDef = { text: '(Go on.)', exit: true };
/** Opening fire on West Halt's watch (at Kettle, or on the road): the band broken, as the guild wants. */
export const AMBUSH = (where: string): Effect[] => [
  { set: 'rc_kettle_fight' }, { set: 'rc_bandits', value: 'ambush' }, { set: 'rc_line', value: 'guild' }, { set: 'rc_halts', value: 'starving' },
  { set: 'rc_chela', value: 'dead' }, { set: 'rc_abe', value: 'dead' }, { set: 'rc_watch_gone' },
  { rep: { faction: 'tollmen', respect: 10 } }, A(ASH, -10), A(TAMSIN, -5), A(ILYA, 3),
  { decision: { id: 'rc_bandits', text: `You opened fire on West Halt's watch ${where}. Chela Ortega and Abe Mutasa did not go home. The guild owes you its bounty.` } },
  { news: { tag: 'rc_ambush', text: 'the band that stopped trains at Kettle was shot to pieces on the Line; it was West Halt\'s own watch', valence: -2, size: 7, at: 'west_halt' } },
  { event: 'combat' },
];

export const d_re_rc_holdup: DialogueDef = {
  id: 'd_re_rc_holdup', owner: 'npc_rc_02',
  start: [{ node: 'stop' }],
  nodes: {
    stop: {
      text: 'Where the way runs down into a cutting beside the Line, a sleeper has been dragged across the rails and a lamp hooded green on the bank. A woman with a rifle steps out of the dark with her scarf down round her neck, as if she wants you to see her face. Behind her, three more in faded rail-crew orange; one is a boy who will not look at you. "Line\'s closed for an hour," she says. "Sit on the bank and keep your hands where I like them, and nobody gets hurt. We\'re not here for you."',
      again: '"Sit on the bank. Nobody gets hurt."',
      effects: [{ learn: 'rc_held_up' }, { quest: 'q_rc_kettle', start: true }, { lead: 'l_rc_sealed' }],
      passives: [{ attr: 'senses', dc: 6, text: 'Their boots are Line issue, hobnailed and resoled; their orange is a halt\'s work wear, not a raider\'s paint. And the ballast round your feet has been swept: they picked up their brass from last time.', effects: [{ learn: 'rc_watch_look' }] }],
      interject: [{ companion: WREN, text: '"Not raiders," Wren says under her breath, sitting down on the bank as if she does this every night. "Raiders don\'t sweep the brass."' }],
      options: [
        { id: 'holdup.sit', text: '(Sit on the bank and watch.)', next: 'watch' },
        { id: 'holdup.who', text: 'Who are you?', next: 'who' },
        { id: 'holdup.what', text: 'What are you here for?', next: 'what' },
        { id: 'holdup.draw', text: '(Draw.)', effects: AMBUSH('on the road'), exit: true },
        { text: '(Back away up the road and go round.)', effects: [{ time: 60 }], exit: true },
      ],
    },
    who: { text: '"Nobody." She almost smiles. "The Line\'s weather. Tonight it\'s raining."', again: '"Nobody."', options: [{ text: '(Something else.)', next: 'stop' }] },
    what: {
      text: '"Freight." She nods down the cut, where a lamp is coming. "Not yours. Never yours. The coach doesn\'t get touched and nobody\'s purse gets opened. That\'s the rule." The boy behind her says something you don\'t catch, and she says, without turning round, "That\'s the rule, Abe."',
      again: '"That\'s the rule."',
      effects: [{ learn: 'rc_abe_named' }],
      options: [{ text: '(Something else.)', next: 'stop' }],
    },
    watch: {
      speaker: 'narrator',
      text: 'The freight comes up the grade at a walk: the lamp, the engine, a string of sealed cars with the closed eye on their doors. It stops at the sleeper with its brakes screaming. Nobody fires. The woman walks down the train with a key on a cord round her neck and opens one car, only one, and they carry crates out of it to a handcar on the other track in the time it takes to drink a cup of water. A guard sits on the last car\'s roof with his carbine across his knees and does not lift it. Then the sleeper is off the rails, the train goes on, and so do they, west, pumping, the green lamp going away into the dark.',
      again: 'The green lamp going away west.',
      effects: [{ learn: 'rc_saw_holdup' }, { xp: 30 }],
      options: [on],
    },
  },
};

export const d_re_rc_gang: DialogueDef = {
  id: 'd_re_rc_gang', owner: 'npc_rc_w1',
  start: [{ if: { knows: 'rc_gang_met' }, node: 'again' }, { node: 'gang' }],
  nodes: {
    gang: {
      text: 'Two people in faded orange with a rail on their shoulders and another in the grass, re-laying a length where the old one has cracked clean through. "Give us a shoulder," says the older one, "or give us the road."',
      again: '"A shoulder, or the road."',
      effects: [{ learn: 'rc_gang_met' }],
      options: [
        { id: 'gang.lift', text: '(Take an end.)', check: { attr: 'brawn', dc: 6 }, effects: [{ give: 'c_water', count: 1 }, { xp: 30 }], next: 'lifted', fail: 'dropped' },
        { id: 'gang.pay', text: 'Who pays you for this?', next: 'pay' },
        on,
      ],
    },
    lifted: { text: 'It goes in on the third heave, and they key it while you hold it, and then the three of you sit in the grass and share their water. "Halt\'s length," the older one says. "Forty mile of it, and the guild pays us for a train that stops. Count the trains that stop."', again: 'The new rail, keyed in.', effects: [{ lead: 'l_rc_length' }], options: [{ text: 'Who pays you for this?', next: 'pay' }, on] },
    dropped: { text: 'You get your end to your knees and no further, and the rail goes back into the grass with a sound like a church bell. "Never mind," the younger one says. "It\'s been in the grass a month. It\'ll wait."', again: 'The rail, back in the grass.', options: [{ text: 'Who pays you for this?', next: 'pay' }, on] },
    pay: { text: '"Length money." The older one spits. "The guild pays a halt for keeping its length, per train that stops there. Then the guild and the Concern agree the freight runs through. Doesn\'t stop. Doesn\'t pay." He hefts the rail. "We keep it anyway. A length\'s not a thing you stop keeping."', again: '"Per train that stops."', effects: [{ lead: 'l_rc_length' }, { learn: 'rc_length_heard' }], options: [on] },
    again: { text: 'The track gang again, further down the line, with the same rail on the same shoulders.', again: 'The track gang.', options: [on] },
  },
};

export const d_re_rc_rods: DialogueDef = {
  id: 'd_re_rc_rods', owner: 'npc_rc_w3',
  start: [{ node: 'ankle' }],
  nodes: {
    ankle: {
      text: 'A young woman sitting in the grass beside the rails with one boot off and her ankle the wrong shape. "Fell off at the bend," she says. "Never fall off at the bend." She looks at your boots, then your pack. "Got anything straight?"',
      again: 'Dulcie, and the ankle the wrong shape.',
      options: [
        { id: 'rods.splint', text: '(Splint it with a proper splint.)', if: { item: 'c_splint' }, effects: [{ take: 'c_splint' }, { xp: 40 }, { learn: 'rc_rods_known' }], next: 'splinted' },
        { id: 'rods.set', text: '(Set it with what\'s to hand.)', if: { not: { item: 'c_splint' } }, check: { skill: 'medicine', dc: 30 }, effects: [{ xp: 40 }, { learn: 'rc_rods_known' }], next: 'splinted', fail: 'botched' },
        { id: 'rods.water', text: '(Leave her water and go.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }], next: 'water' },
        on,
      ],
    },
    splinted: {
      text: 'She swears through it and then laughs. "Right. One for one." She draws in the dirt with a finger: a curve of track, a stone. "The through slows on the bend out of Yard Nine. Two in the morning, walking pace, half a minute. Ladder at every car\'s end. Step on, lie flat, get off where she slows again: Kettle, or the yard throat at the city." She looks up. "And don\'t fall off at the bend."',
      again: 'The curve drawn in the dirt.',
      options: [on],
    },
    botched: { text: 'It goes back with a sound neither of you likes, and she passes out, and wakes, and says she has had worse. She hasn\'t. You leave her what you can and she waves you on, white to the lips.', again: 'Dulcie, white to the lips.', options: [on] },
    water: { text: '"Ta." She drinks half and saves half. "Somebody\'ll be along. Somebody\'s always along, on the Line."', again: '"Somebody\'s always along."', options: [on] },
  },
};

export const LINE_DIALOGUES: DialogueDef[] = [d_rc_board_fw, d_rc_board_hw, d_rc_board_he, d_rc_board_yd, d_rc_board_sk, d_rc_curve, d_rc_handcar, d_re_rc_holdup, d_re_rc_gang, d_re_rc_rods];
