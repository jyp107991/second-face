import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { WORLD_MAP } from '../world/map';
import { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, leave } from './rc_line';

/**
 * The Northern Wet and the Teeth (B5c): the ways about. The river barges (`net_barge`), boarded at every stop by one service
 * tree built by `bargeBoard()` (a fare to each other stop, the wait for the six o'clock, the ride narrated, the field map;
 * a free ride for a turn at the sweeps or on the Patience's token); the north track from Yard Nine to Sawtown, which carries
 * the timber train only while Dorcas runs; the bucket line's foot at East Halt; and the road encounters of the mountain
 * trails and the river banks. Story notes: story/B5c_NOTES_SECRET.md.
 */

export { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, leave };
export const bye: OptionDef = { text: 'That\'s all.', exit: true };
export const on: OptionDef = { text: '(Go on.)', exit: true };
export const NIGHT: Cond = { hour: { from: 22, to: 5 } };
export const DAY: Cond = { hour: { from: 6, to: 18 } };

/** How the river runs, by what was settled at Ashby: an even river at the sixth mark, the city's card, or the old low water. */
export const RIVER_EVEN: Cond = { flag: 'nw_river', eq: 'even' };
export const RIVER_CITY: Cond = { flag: 'nw_river', eq: 'city' };

/** Where each stop on the river puts you down. */
export const RIVER_STOPS: Record<string, { name: string; map: string; spawn: string }> = {
  timber: { name: 'Sawtown', map: 'nw_sawtown', spawn: 'landing' },
  dam: { name: 'Ashby lock', map: 'nw_dam', spawn: 'lock' },
  riverdock: { name: 'Low Landing', map: 'nw_landing', spawn: 'quay' },
  // the barges tie up at Carrick's barge quay, Meridian's docks (B5b)
  meridian: { name: 'the city', map: 'md_docks', spawn: 'barge' },
};

const BARGE = WORLD_MAP.networks.net_barge;
/** Legs between two stops, the hours the barge takes over them, and whether it goes down the river (toward the city). */
export function reaches(from: string, to: string): { n: number; hours: number; down: boolean; lock: boolean } {
  const i = BARGE.stops.indexOf(from), j = BARGE.stops.indexOf(to);
  const a = Math.min(i, j), b = Math.max(i, j);
  const d = BARGE.stops.indexOf('dam');
  return { n: b - a, hours: BARGE.legHours.slice(a, b).reduce((t, h) => t + h, 0), down: j > i, lock: a < d && b > d };
}

/** A free ride on the river: a turn at the sweeps, the Patience's token, or a guild hand's exemption. */
export const FREE_BARGE: Cond = { any: [{ flag: 'nw_sweeps_ride' }, { item: 'k_nw_token' }, { ability: 'toll_exempt' }] };

/** Off the barge at a stop: the place goes on the map. */
export const LAND = (to: string): Effect[] => [
  { set: 'nw_rode' }, { set: 'nw_sweeps_ride', value: false }, { inc: 'nw_rides' }, { learn: `loc_${to}` }, { set: `visited_${to}` },
  { event: 'goto', data: { location: RIVER_STOPS[to].map, spawn: RIVER_STOPS[to].spawn } },
];

function rideNode(from: string, to: string): NodeDef {
  const R = reaches(from, to);
  const way = R.down
    ? 'down the river on the current, the bargemaster at the long stern oar and two hands at the sweeps, the banks going by at a walking pace and then faster where the river narrows'
    : 'up the river behind the guild\'s tug, an old diesel launch that burns the Rigs\' oil and coughs it out black, towing three barges on a cable like a string of beads';
  const lock = R.lock ? ' At Ashby the barges go one at a time into the lock\'s grey chamber, and the gates close behind, and the water ' + (R.down ? 'sinks away under you until the walls stand over the barge like a street' : 'lifts you up between the walls until the Water lies level and grey ahead') + ', while a young woman with red hair walks along the top with a key on a cord and calls the marks.' : '';
  const name = RIVER_STOPS[to].name;
  return {
    speaker: 'narrator',
    text: [
      { if: { not: { flag: 'nw_rode' } }, text: `The barge goes at six, flat-bottomed and black with tar, a deckhouse aft and the cargo under tarps, and you sit on a coil of rope and go ${way}. Everything is wet. Nothing is in a hurry. Herons stand in the shallows and watch you go by as if they had seen barges before and expected better.${lock} ${name}.` },
      { if: RIVER_EVEN, text: `The barge at six, full-loaded and low in the water, ${way}, on a river that runs high and steady between its banks.${lock} ${name}.` },
      { if: RIVER_CITY, text: `The barge at six, ${way}. The river does what the city's card says this week: brown and fast and over the meadows, the farms along it under water to the doorsteps.${lock} ${name}.` },
      { text: `The barge at six, half-loaded because the river is low, ${way}, with the bargemaster sounding the bottom with a pole at every bend.${lock} ${name}.` },
    ],
    again: `The river, to ${name}.`,
    interject: [
      { companion: TAMSIN, if: { not: { flag: 'nw_rode' } }, text: 'Tamsin lies on her front on the tarp with her chin on her hands and watches the water go by under the gunwale for an hour without saying anything, which is a record. "It\'s all going somewhere," she says at last. "All of it. On its own. Nobody pumping." She rolls over. "Rust it, I want one."', effects: [A(TAMSIN, 3)] },
      { companion: WREN, if: { not: { flag: 'nw_rode' } }, text: '"A road that moves," Wren says, watching the bank. "Leaves no tracks either." She almost smiles. "I could get used to it."' },
      { companion: ILYA, text: 'Ilya counts the bends aloud, under his breath, and then the herons, and then stops counting anything and sleeps sitting up with his rifle across his knees.' },
    ],
    options: [{ id: `barge.${from}.${to}`, text: `(Off at ${name}.)`, effects: LAND(to), exit: true, repeat: true }],
  };
}

/** A river stop's landing board: fares to every other stop (10 a reach), the ride, the sweeps, the field map. */
export function bargeBoard(id: string, here: string, owner: string, intro: NodeDef['text'], again: string, extra: OptionDef[] = [], extraNodes: Record<string, NodeDef> = {}): DialogueDef {
  const nodes: Record<string, NodeDef> = { ...extraNodes };
  const opts: OptionDef[] = [];
  for (const to of BARGE.stops) {
    if (to === here) continue;
    const R = reaches(here, to);
    const fare = BARGE.fare * R.n;
    const ride: Effect[] = [{ until: BARGE.firstHour }, { time: R.hours * 60 }];
    const label = `${RIVER_STOPS[to].name}, ${R.n === 1 ? 'one reach' : `${R.n} reaches`} ${R.down ? 'down' : 'up'}`;
    opts.push(
      { id: `${id}.${to}.free`, text: `(${label}. No fare.)`, if: FREE_BARGE, effects: ride, next: `ride_${to}`, repeat: true },
      { id: `${id}.${to}.fare`, text: `(${label}. ${fare} Tolls.)`, if: { all: [{ not: FREE_BARGE }, TOLLS(fare)] }, effects: [{ take: 'tolls', count: fare }, ...ride], next: `ride_${to}`, repeat: true },
    );
    nodes[`ride_${to}`] = rideNode(here, to);
  }
  nodes.sweeps = {
    speaker: 'narrator',
    text: 'The bargemaster looks at your arms. "Sweeps take two and the river takes everybody. A turn on the oars and you ride free, if you can keep a stroke."',
    again: '"Keep a stroke."',
    options: [
      { id: `${id}.sweeps.arms`, text: '(Take an oar and pull.)', check: { attr: 'brawn', dc: 6 }, effects: [{ set: 'nw_sweeps_ride' }, { xp: 15 }], next: 'sweeps_ok', fail: 'sweeps_no' },
      { id: `${id}.sweeps.water`, text: '(Read the water for him instead.)', check: { skill: 'survival', dc: 40 }, effects: [{ set: 'nw_sweeps_ride' }, { xp: 15 }], next: 'sweeps_ok', fail: 'sweeps_no' },
      { text: 'Never mind.', next: 'board' },
    ],
  };
  nodes.sweeps_ok = { speaker: 'narrator', text: '"Good enough." He spits over the side. "Next six o\'clock, either way. You\'re on the bow sweep."', again: '"The bow sweep."', options: [{ text: '(Back to the board.)', next: 'board' }] };
  nodes.sweeps_no = { speaker: 'narrator', text: 'You catch a crab on the first stroke and go over backwards into the cargo. "Pay the fare," he says, not unkindly. "The river\'s safer with you sitting down."', again: '"Pay the fare."', options: [{ text: '(Back to the board.)', next: 'board' }] };
  nodes.board = {
    text: intro, again,
    effects: [{ learn: 'nw_barge_board' }, { learn: `loc_${here}` }],
    options: [
      ...opts,
      { id: `${id}.sweeps`, text: '(Work your passage at the sweeps.)', if: { all: [{ not: FREE_BARGE }] }, next: 'sweeps' },
      ...extra,
      { id: `${id}.map`, text: '(Look at the map of the river.)', effects: [{ event: 'map' }], exit: true, repeat: true },
      leave,
    ],
  };
  return { id, owner, start: [{ node: 'board' }], nodes };
}

// ---------------------------------------------------------------- the landings

export const d_nw_board_st = bargeBoard('d_nw_board_st', 'timber', 'narrator',
  [
    { if: { not: { knows: 'nw_barge_board' } }, text: 'Sawtown\'s landing: a jetty of black planks into the Water and a barge tied to it, loading sawn boards off a cart in the rain. A slate on a post: DOWN AT SIX — ASHBY — LOW LANDING — THE CITY. TEN A REACH. Somebody has added, in a different chalk, IF THE DAM LETS HER.' },
    { text: 'The landing, the barge, the slate: DOWN AT SIX. TEN A REACH.' },
  ],
  'The landing. DOWN AT SIX.');

export const d_nw_board_dm = bargeBoard('d_nw_board_dm', 'dam', 'narrator',
  [
    { if: { not: { knows: 'nw_barge_board' } }, text: 'The lock at the dam\'s west end: a grey chamber of concrete with steel gates at each end and a stair down its wall, and a board on the crest with the day\'s lockings chalked on it by the lock-keeper: UP AT SIX — DOWN AT NOON — AS THE CARD ALLOWS. Barges going either way tie up below or above it and take on whoever is waiting. Ten a reach.' },
    { text: 'The lock\'s board: UP AT SIX — DOWN AT NOON — AS THE CARD ALLOWS.' },
  ],
  'The lock and its board.');

export const d_nw_board_ll = bargeBoard('d_nw_board_ll', 'riverdock', 'narrator',
  [
    { if: { not: { knows: 'nw_barge_board' } }, text: 'The guild\'s board on Low Landing\'s quay: UP TO ASHBY AND SAWTOWN AT SIX — DOWN TO THE CITY AT SIX — TEN A REACH — THE GUILD\'S RIVER. The last three words have been scratched at by somebody with a nail, many times, and painted back on by somebody with a brush.' },
    { text: 'The guild\'s board on the quay: SIX, BOTH WAYS. TEN A REACH.' },
  ],
  'The guild\'s board on the quay.');

// ---------------------------------------------------------------- the north track (Yard Nine – Sawtown)

const DORCAS: Cond = { flag: 'rc_engine' };
const PATHS: Cond = { flag: 'rc_engine', eq: 'contract' };
const PASS: Cond = { item: 'k_rc_pass' };
/** The timber train: Dorcas up the north track at noon from Yard Nine, down from Sawtown at six; nine hours either way. */
const TRAIN = (dep: number, extra = 0): Effect[] => [{ until: dep }, { time: (extra + 9) * 60 }, { set: 'nw_timber_train' }];
const TRAIN_UP: Effect[] = [{ learn: 'loc_timber' }, { set: 'visited_timber' }, { event: 'goto', data: { location: 'nw_sawtown', spawn: 'railhead' } }];
const TRAIN_DOWN: Effect[] = [{ learn: 'loc_depot' }, { set: 'visited_depot' }, { event: 'goto', data: { location: 'rc_yard', spawn: 'from_timber' } }];

function trackTree(id: string, up: boolean): DialogueDef {
  const dep = up ? 12 : 6;
  const go = up ? TRAIN_UP : TRAIN_DOWN;
  const where = up ? 'Sawtown' : 'Yard Nine';
  return {
    id, owner: 'narrator',
    start: [{ if: DORCAS, node: 'runs' }, { node: 'dead' }],
    nodes: {
      dead: {
        text: up
          ? 'The north track leaves the yard between the engine shed and the fitting shop and goes off into the grass: two rails, rust-red, with saplings standing between the sleepers a mile out. A board at its foot: NORTH TRACK — SAWTOWN — TIMBER TRAIN SUSPENDED, ONE ENGINE. Somebody has added underneath, in fitter\'s capitals: UNTIL DORCAS.'
          : 'The railhead: a loading stage, a stack of sawn sleepers under a tarp waiting for a train, and the rails going off south-east into the trees, oiled for a hundred yards and then weeds. Nobody has sent timber down the north track since Yard Nine lost an engine. It is a long walk to the Line.',
        again: up ? 'The north track, rails in the grass. UNTIL DORCAS.' : 'The railhead, and the sleepers waiting under their tarp.',
        options: [{ id: `${id}.map`, text: '(Look at the map.)', effects: [{ event: 'map' }], exit: true, repeat: true }, leave],
      },
      runs: {
        text: [
          { if: PATHS, text: up ? 'The north track board, new paint: TIMBER TRAIN — DORCAS — NOON, WHEN THE CONCERN\'S PATHS ALLOW. Under it the guild\'s clerk has chalked the next day it will. Fifteen a seat, on a flatcar among the empty timber bogies.' : 'The railhead board: DORCAS DOWN AT SIX, WHEN THE CONCERN\'S PATHS ALLOW. Fifteen a seat on the timber.' },
          { text: up ? 'The north track board, scraped and repainted: TIMBER TRAIN — DORCAS — NOON. Ida Szalai\'s stamp in the corner. Fifteen a seat, on a flatcar among the empty timber bogies; the Line\'s pass rides free.' : 'The railhead board: DORCAS DOWN AT SIX WITH THE TIMBER. Fifteen a seat on the load; the Line\'s pass rides free. The sleepers under the tarp are stacked for her.' },
        ],
        again: 'The timber train\'s board.',
        effects: [{ learn: 'nw_timber_train_known' }],
        options: [
          { id: `${id}.pass`, text: `(Ride the timber train to ${where}. The Line pass.)`, if: { all: [PASS, { not: PATHS }] }, effects: TRAIN(dep), next: 'ride', repeat: true },
          { id: `${id}.fare`, text: `(Ride the timber train to ${where}. 15 Tolls.)`, if: { all: [{ not: PASS }, { not: PATHS }, TOLLS(15)] }, effects: [{ take: 'tolls', count: 15 }, ...TRAIN(dep)], next: 'ride', repeat: true },
          { id: `${id}.paths`, text: `(Wait for the Concern's paths and ride to ${where}. 15 Tolls.)`, if: { all: [PATHS, TOLLS(15)] }, effects: [{ take: 'tolls', count: 15 }, ...TRAIN(dep, 24)], next: 'ride', repeat: true },
          { id: `${id}.map2`, text: '(Look at the map.)', effects: [{ event: 'map' }], exit: true, repeat: true },
          leave,
        ],
      },
      ride: {
        speaker: 'narrator',
        text: up
          ? 'Dorcas takes the north track at a walk, then a trot, square-nosed and plated, with a string of empty bogies rattling behind her and you on the last of them. The grass gives way to scrub, the scrub to pines, the pines to rain, and the rain does not stop. At dusk she comes down a long grade between stumps to the water and the smell of resin and stops at a loading stage beside a lake.'
          : 'Dorcas goes down the north track with the timber piled behind her and chained, sleepers for the Line and fuel wood for the still, and you ride on the load with your back to the rain. Out of the pines, into the scrub, out of the scrub into the grass and the dry, and Yard Nine\'s shed in the evening, and Ida Szalai on the step with her arms folded, counting the bogies in.',
        again: `The timber train to ${where}.`,
        interject: [
          { companion: KES, if: PATHS, text: 'Kes has her hand flat on the bogie\'s floor the whole first hour. "She\'s listening," she says, meaning the engine. "Up the line to the hill. Every turn of the wheels." She takes her hand away. "Obviously."' },
          { companion: NINE, text: '"Timber for the Line\'s sleepers, the Line\'s sleepers for the Line," Nine says. "A system that feeds itself. The record would call it inefficient. The record has never had to keep a railway."' },
        ],
        options: [{ id: `${id}.off`, text: `(Off at ${where}.)`, effects: go, exit: true, repeat: true }],
      },
    },
  };
}

export const d_nw_north_track = trackTree('d_nw_north_track', true);
export const d_nw_railhead = trackTree('d_nw_railhead', false);

// ---------------------------------------------------------------- the bucket line's foot at East Halt

export const d_tm_bucket_foot: DialogueDef = {
  id: 'd_tm_bucket_foot', owner: 'narrator',
  start: [{ if: { hour: { from: 6, to: 18 } }, node: 'day' }, { node: 'night' }],
  nodes: {
    day: {
      text: [
        { if: { knows: 'nw_bucket_known' }, text: 'The bucket line\'s foot: the iron tower in the cutting, the cable coming down out of the pines in a long sag, the buckets swinging in on the wheel and out again, and the bell rope.' },
        { text: 'At the far end of the cutting an iron tower stands in the scree, and a cable comes down to it out of the pines on the mountain in one long sag, and on the cable, every minute or so, an iron bucket the size of a bath comes swinging down, goes round a wheel on the tower with a clank, tips out grey bars of tin into a crib, and goes back up. A bell rope hangs from the tower. A painted board: NUMBER FOUR — RING TWICE — NO PAPER.' },
      ],
      again: 'The bucket line\'s foot, the buckets going round.',
      effects: [{ learn: 'nw_bucket_known' }, { learn: 'loc_mine_teeth' }],
      options: [
        { id: 'bucketfoot.up', text: '(Climb into an empty bucket, ring twice, and go up.)', effects: [{ time: 50 }, { learn: 'tm_rode_bucket' }, { event: 'goto', data: { location: 'tm_pit', spawn: 'bucket' } }], exit: true, repeat: true },
        leave,
      ],
    },
    night: {
      text: 'The bucket line\'s tower in the cutting, the cable still and humming in the wind, the buckets hanging motionless up the mountain into the dark like a string of lanterns with no lights in them. The bell rope is tied off. Number Four winds from six to six.',
      again: 'The bucket line, still.',
      effects: [{ learn: 'nw_bucket_known' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the Teeth's trails

export const d_re_tm_trapper: DialogueDef = {
  id: 'd_re_tm_trapper', owner: 'npc_tm_w1',
  start: [{ node: 'fire' }],
  nodes: {
    fire: {
      text: 'A man with a beard like a snowdrift at a fire under the pines, skinning a hare with three quick cuts while the snow ticks down around him. A dozen white pelts on a pole beside him. "Ostap. I trap." He nods at the fire. "Sit if you\'re cold. Everybody up here is cold."',
      again: 'Ostap, at his fire.',
      options: [
        { id: 'trapper.help', text: '(Help him peg out the pelts.)', check: { skill: 'survival', dc: 30 }, effects: [{ give: 'j_hide', count: 1 }, { xp: 20 }], next: 'helped', fail: 'clumsy' },
        { id: 'trapper.four', text: 'What\'s up the mountain?', next: 'four' },
        on,
      ],
    },
    helped: { text: 'You get the hang of it after the second, and he gives you the third to keep. "Winter coat comes in early this year," he says. "Hares know things." He looks up the mountain. "So do I."', again: 'The pelts, pegged.', options: [{ text: 'What\'s up the mountain?', next: 'four' }, on] },
    clumsy: { text: 'You tear the first one, and he takes it back from you gently and finishes it himself. "Hare doesn\'t care," he says. "I care a little."', again: 'The torn pelt.', options: [{ text: 'What\'s up the mountain?', next: 'four' }, on] },
    four: {
      text: '"Number Four. Free pit." He says it the way people say a name they are not sure of. "Folk come over from the Skirts by the col, at night, and some get down to it and some don\'t. The Clean sit on the switchback some nights." He turns the hare on its stick. "Not every night. Just the nights they want somebody. You\'d think they\'d sit every night, if they were guessing."',
      again: '"Just the nights they want somebody."',
      effects: [{ learn: 'loc_mine_teeth' }, { learn: 'tm_ostap_word' }],
      interject: [{ companion: WREN, text: '"They\'re not guessing," Wren says, very quietly, looking up the mountain.' }],
      options: [on],
    },
  },
};

export const d_re_tm_runaway: DialogueDef = {
  id: 'd_re_tm_runaway', owner: 'npc_tm_w2',
  start: [{ node: 'lost' }],
  nodes: {
    lost: {
      text: 'A young woman in Skirts grey cut down for walking, sitting in the snow at the trail\'s edge with her knees up and her hands in her armpits, a company arm on her left side gone dull and dead from the elbow. She stares at you. "Is this the way to Four? They said follow the cairns. I lost the cairns."',
      again: 'Ylva, in the snow, waiting to be told.',
      passives: [{ attr: 'senses', dc: 6, text: 'The company arm is switched off, not broken: the dull finish of a limb the Window has stopped paying for. She will have to have it out, where she is going, or carry it dead.' }],
      options: [
        { id: 'runaway.walk', text: '(Walk her to the cairns and point her down to Four.)', effects: [{ time: 60 }, { xp: 30 }, { learn: 'tm_ylva_helped' }, A(ASH, 2), A(KES, 2)], next: 'walked' },
        { id: 'runaway.water', text: '(Give her water and the way, and go on.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { learn: 'tm_ylva_helped' }], next: 'pointed' },
        { id: 'runaway.back', text: 'Go back. The Clean watch that path.', next: 'back' },
      ],
    },
    walked: { text: 'You find the cairns a quarter mile on, a line of them down a scree with a tin cup on the first. She looks down at the lamps of the pit in the bowl below, and does not thank you, because she is crying, and then she goes, fast, as if the mountain might change its mind.', again: 'The cairns, and Ylva going down.', interject: [{ companion: KES, text: '"Dead arm," Kes says, watching her go. "They switched it off when she missed a shift. That\'s how you know you\'ve left. Your own arm tells you."' }], options: [on] },
    pointed: { text: 'She drinks it all and gets up, and goes the way you point, holding her dead arm against her with her live one.', again: 'Ylva, going the way you pointed.', options: [on] },
    back: { text: '"Back." She laughs, a bad sound. "Back to what? My paper\'s over the line. They weigh you, when your paper\'s over the line." She gets up without your help and goes on along the trail, the wrong way, looking for cairns.', again: '"They weigh you."', options: [on] },
  },
};

// ---------------------------------------------------------------- the Wet's banks

export const d_re_nw_mule: DialogueDef = {
  id: 'd_re_nw_mule', owner: 'npc_nw_w1',
  start: [{ node: 'stuck' }],
  nodes: {
    stuck: {
      text: 'On the towpath, an old man and a mule, and the mule up to its belly in a slip of the bank, with a barge\'s towline still hitched to it and going taut every time the barge out on the river feels the current. The old man has his shoulder under the mule\'s rump and is saying, quite calmly, "Hup. Hup. Hup."',
      again: 'Ulf and the mule, in the mud.',
      options: [
        { id: 'mule.heave', text: '(Get your shoulder under it beside him.)', check: { attr: 'brawn', dc: 6 }, effects: [{ set: 'nw_sweeps_ride' }, { xp: 30 }], next: 'out', fail: 'mud' },
        { id: 'mule.line', text: '(Cut the towline before the barge drags them both in.)', next: 'cut' },
        on,
      ],
    },
    out: { text: 'It comes out of the bank on the third heave with a noise like a cork, and stands on the towpath shaking mud over both of you. "Ulf," the old man says, and holds out a hand that is mostly mud. "Tell the bargemaster at any landing Ulf says you pulled. You\'ll ride on the sweeps\' account. Next barge."', again: 'The mule, out and shaking.', options: [on] },
    mud: { text: 'You go in to the knees and then to the waist, and Ulf has to pull you out instead, and then the two of you pull the mule out together, which takes an hour. "Well," he says. "You tried."', again: 'Mud to the waist.', effects: [{ time: 60 }], options: [on] },
    cut: { text: 'The line parts with a crack and goes skating out over the water, and out on the river somebody on the barge swears in a way you can hear from the bank. The mule comes out by itself once nothing is pulling it the other way. Ulf looks at the river, and at you. "That\'s a day\'s pay," he says, "going down to the city without me."', again: 'The towline, gone.', options: [on] },
  },
};

export const d_re_nw_reeds: DialogueDef = {
  id: 'd_re_nw_reeds', owner: 'npc_nw_16',
  start: [{ node: 'boats' }],
  nodes: {
    boats: {
      text: 'Two flat boats come out of the reeds without a sound and nose onto the bank in front of you, and in the first a woman with a rifle and her hair in a muddy braid, looking at you the way you look at weather. "Evening. You\'re not guild." It is not a question. "We\'re the river. Bryony. We watch what goes down it at night."',
      again: 'Bryony and the reed boats.',
      options: [
        { id: 'reeds.what', text: 'What goes down it at night?', next: 'what' },
        { id: 'reeds.who', text: 'Who are you, the river?', next: 'who' },
        { id: 'reeds.draw', text: '(Draw.)', effects: [{ set: 'nw_reeds_fight' }, { event: 'combat' }], exit: true },
        on,
      ],
    },
    what: { text: '"Whatever the guild doesn\'t write down." She shrugs. "Men on paper for the winches. Loads with no names. We stop what we can. We\'re not thieves; thieves keep things." She pushes off with her pole. "If you ever carry for the guild, light a lamp at the bow. We\'ll come and have a look."', again: '"Whatever the guild doesn\'t write down."', effects: [{ learn: 'nw_reeds_met' }], options: [on] },
    who: { text: '"People who used to be on paper." She turns her wrist up: an old Ninebridge brand, healed white. "The winch at the Landing had me two years. When it let me go I didn\'t go far." The second boat\'s man laughs, once. "None of us did."', again: 'The brand, healed white.', effects: [{ learn: 'nw_reeds_met' }], interject: [{ companion: WREN, text: 'Wren looks at the brand a long moment, and then at the woman, and nods once, the way you nod to someone from the same street.' }], options: [{ text: 'What goes down it at night?', next: 'what' }, on] },
  },
};

export const RIVER_DIALOGUES: DialogueDef[] = [d_nw_board_st, d_nw_board_dm, d_nw_board_ll, d_nw_north_track, d_nw_railhead, d_tm_bucket_foot, d_re_tm_trapper, d_re_tm_runaway, d_re_nw_mule, d_re_nw_reeds];
