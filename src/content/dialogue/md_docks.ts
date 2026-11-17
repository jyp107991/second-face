import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave, lineBoard } from './rc_line';
import { bargeBoard } from './nw_river';

/**
 * Carrick, Meridian's docks across the dry river (B5b, the last piece). The Line's terminus (its ticket point is the Line's own
 * `lineBoard()`), the tide boat's water stairs, the quay tram round the ring road to Clover, the river road round by the Wall
 * to the Precinct's gate, and the Hulls' cradle over the dry bed to Bridgeward's drop at night. The district's line (Crane
 * Six, heard by the Harbour court on the Customs House steps), a girl off the through (Mirela's Paper), the Crown's road coming
 * down on the Hulls (Stakes on the Hulls); the call-on at the Stand, fishing off the Basin wall, a cookshop, a bunk, three
 * counters. The Loop boards' answer to NO BRIDGE is `DOCKS_ASK`/`DOCKS_ANSWER`, and Bridgeward's drop signals the cradle with
 * `CRADLE_SIGNAL`. Story notes: story/B5b_NOTES_SECRET.md (Carrick).
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const NOT = (c: Cond): Cond => ({ not: c });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const IN = (who: string): Cond => ({ inParty: who });
const SEEN = (id: string): Cond => ({ seen: id });
const NEWS = (tag: string, text: string, valence: number, size = 5): Effect => ({ news: { tag, text, valence, size, at: 'meridian' } });
const DEC = (id: string, text: string): Effect => ({ decision: { id, text } });
const T = (npc: string, by: number): Effect => ({ trust: { npc, by } });

/** The cradle runs at night, from eight till four; the call-on is at dawn. */
const DARK: Cond = { hour: { from: 20, to: 4 } };
const DAWN: Cond = { hour: { from: 4, to: 9 } };
const AFTERNOON: Cond = { hour: { from: 13, to: 17 } };
const DAHL = 'npc_dk_01', CONNIE = 'npc_dk_02', PLATT = 'npc_dk_03', OKSANA = 'npc_dk_04', ROUX = 'npc_dk_05', IMOGEN = 'npc_dk_06', KOBBY = 'npc_dk_07';

/** Crane Six is not settled yet. */
const CRANE_OPEN: Cond = NOT(F('dk_crane'));
const CRANE = (v: string): Cond => F('dk_crane', v);
/** The player knows Dmytro turned the cutout himself, at the Bond's pay. */
const TRUTH: Cond = { knows: 'dk_paid' };
/** The player knows the Bond's boxes are billed short and never weighed. */
const SKIM: Cond = ANY({ knows: 'dk_skim' }, { item: 'k_dk_slip' });
const GIRL_OPEN: Cond = NOT(F('dk_girl'));
const GIRL = (v: string): Cond => F('dk_girl', v);
const HULLS_OPEN: Cond = NOT(F('dk_hulls'));
const HULLS = (v: string): Cond => F('dk_hulls', v);
/** The cradle runs while the Hulls are crewed and the cable has not been cut. */
export const CRADLE_RUNS: Cond = NOT(ANY(F('dk_cradle', 'cut'), F('dk_hulls_empty')));
/** The stoppage won: the Stand stood together. */
const STOOD: Cond = F('dk_black', 'won');

// ---------------------------------------------------------------- the city's answer to NO BRIDGE (shared with the Loop boards)

/** An option for a Loop board inside the Wall: ask about the chalk through THE DOCKS (the board's `docks` node answers). */
export const DOCKS_ASK = (id: string): OptionDef => ({ id, text: '(THE DOCKS: NO BRIDGE.)', next: 'docks' });
/** The far-bank answer on every Loop board: round by the Wall, by Clover and the quay tram, by the Line and the tide boat, and the cradle. */
export const DOCKS_ANSWER: NodeDef = {
  text: 'NO BRIDGE, chalked through THE DOCKS. Under it, in a newer chalk somebody has gone over twice: BY CLOVER — QUAY TRAM 2. A woman on the bench with a basket on her knees says the Loop\'s Docks line went over Bridgeward\'s bridge, and the bridge went into the river in the Charter Wars with a tram on it. "Carrick\'s across the dry river," she says. "Round by the Wall: the river road south from the gate, an hour on foot outside the law. Or the Loop to Clover and the quay tram round the ring road. The Line comes in there, and the tide boat, and the barges." She lowers her voice. "And at night, they say, a basket on a wire from Bridgeward\'s drop, if you know who to wave a lamp at."',
  again: 'BY CLOVER — QUAY TRAM 2, under the NO BRIDGE.',
  effects: [{ learn: 'dk_far_bank' }, { learn: 'dk_cradle_heard' }],
  options: [{ text: '(Back to the board.)', next: 'board' }, leave],
};
/** Bridgeward's drop at night: the cradle's signal, for whoever the Hulls have taught it. */
export const CRADLE_SIGNAL: OptionDef = {
  id: 'dk.drop.signal', text: '(Swing a lamp twice at the far bank, wait, and once. 5 Tolls)', if: ALL(DARK, { knows: 'dk_cradle_known' }, CRADLE_RUNS, TOLLS(5)),
  effects: [{ take: 'tolls', count: 5 }, { set: 'dk_cradle_ridden' }, { event: 'goto', data: { location: 'md_docks', spawn: 'cradle', minutes: 20 } }], exit: true, repeat: true,
};

export const d_md_river_sign: DialogueDef = {
  id: 'd_md_river_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'Chalk on the Wall\'s foot where the rubble road turns south along it: an arrow, and DOCKS — CARRICK — NO BRIDGE — THIS WAY ROUND. Under it somebody has drawn a crane, carefully, the way a child draws a horse, and a box hanging from it.',
      again: 'DOCKS — CARRICK — THIS WAY ROUND, and the careful crane.',
      effects: [{ learn: 'dk_far_bank' }],
      options: [leave],
    },
  },
};

export const d_dk_road_sign: DialogueDef = {
  id: 'd_dk_road_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'Chalk on a bollard where the river road comes down off the Wall\'s shoulder: GATE ↑ 1 HR — PAPERS. Under it: CLOVER BY THE QUAY TRAM. And under that, small, in a child\'s hand: KOBBY\'S ROPE AT NIGHT.',
      again: 'GATE ↑ 1 HR — PAPERS. CLOVER BY THE QUAY TRAM. KOBBY\'S ROPE AT NIGHT.',
      effects: [{ learn: 'dk_cradle_heard' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the Line, the tide boat, the quay tram, the cradle

export const d_dk_line = lineBoard('d_dk_line', 'meridian', 'npc_dk_12',
  [
    { if: { item: 'k_rc_pass' }, text: 'The window cut into the shed\'s brick at the Line\'s end. Femi Adebayo looks at your pass, and at you, and punches nothing. "All sections. Seven o\'clock, east."' },
    { if: { flag: 'rc_kettle_levy' }, text: 'The window in the shed\'s brick. "Thirty a leg." Femi taps a card pinned to the grille: KETTLE LEVY — BY ORDER OF THE GUILD. "Don\'t look at me. I\'ve never seen Kettle."' },
    { if: { flag: 'rc_line', eq: 'guild' }, text: 'The window in the shed\'s brick, and two of the guild\'s riders on the platform behind you with carbines, watching who buys. "Seven o\'clock, east," Femi says. "Twenty-five a leg. They\'re on every train now. Smile for the card."' },
    { if: { not: { knows: 'rc_line_board' } }, text: 'A ticket window cut into the brick of the freight shed at the very end of the Line, with a grille and a young man behind it with a card punch and a pencil, who draws your face on a toll card in four quick lines before you have said where you are going. "The Line, east. Seven o\'clock. Twenty-five a leg; the guild sets it, not me."' },
    { text: 'The window in the shed\'s brick. "Seven o\'clock, east," Femi says. "Twenty-five a leg."' },
  ],
  'Femi Adebayo, behind the grille, with the punch.',
  [
    { id: 'dk.line.through', text: 'What about the through?', if: NOT(SEEN('dk.line.through')), next: 'through' },
  ],
  {
    through: {
      speaker: 'npc_dk_12',
      text: '"The through doesn\'t sell tickets." Femi nods down the shed, where a second road runs straight past the platform and out through the far end into a fenced cut toward the Bond. "Comes in at the throat at two in the morning, nineteen cars sealed, goes into the Bond without stopping, comes out empty or not and goes back east at four. Nobody gets a look." He shrugs. "Nobody weighs it, either. That\'s not my department. That\'s Hruska\'s, and it isn\'t his."',
      again: '"Nobody gets a look. Nobody weighs it."',
      effects: [{ learn: 'dk_through_heard' }],
      options: [{ text: 'Something else.', next: 'board' }],
    },
  });

/** The tide boat from the water stairs: down the delta on the evening ebb (the network's own fare and hours). */
const TIDE_RIDES: OptionDef[] = [
  { id: 'dk.tide.stilts', text: '(Down the delta to Gull Stilts. 6 Tolls)', if: TOLLS(6), effects: [{ take: 'tolls', count: 6 }, { until: 17 }, { time: 480 }, { learn: 'loc_hamlet_shore' }, { set: 'visited_hamlet_shore' }, { event: 'goto', data: { location: 'ds_stilts', spawn: 'jetty' } }], exit: true, repeat: true },
  { id: 'dk.tide.rigs', text: '(Down the delta and out to the Rigs. 12 Tolls)', if: TOLLS(12), effects: [{ take: 'tolls', count: 12 }, { until: 17 }, { time: 900 }, { learn: 'loc_rigs' }, { set: 'visited_rigs' }, { event: 'goto', data: { location: 'ds_rigs', spawn: 'landing' } }], exit: true, repeat: true },
];

export const d_dk_tide: DialogueDef = {
  id: 'd_dk_tide', owner: 'narrator', start: [{ node: 'stairs' }],
  nodes: {
    stairs: {
      text: [
        { if: AFTERNOON, text: 'The tide boat at the water stairs, flat and tarred, with salt sacks and a crate of smoked fish coming off it hand to hand, and Mele Tui at the tiller watching the water before she watches you. "Down the delta on the ebb at five," she says. "Stilts, six. Rigs, twelve. Mind your hands on the gunwale."' },
        { text: 'The water stairs: worn granite down into the Basin, green to the third step, iron rings in the wall for boats. A slate on the ring post, chalked: TIDE BOAT — IN ON THE FLOOD — DOWN THE DELTA AT 5 — STILTS 6 — RIGS 12 — M.T.' },
      ],
      again: 'The water stairs, and the slate on the ring post: DOWN THE DELTA AT 5.',
      effects: [{ learn: 'dk_tide_seen' }, { learn: 'ds_tide_boat' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin sits on the top step and watches a crate of fish go up the stairs and a sack of salt come down. "Everything in the Reach ends up here," she says. "Fish, oil, copper, people. It\'s a drain with cranes."', effects: [A(TAMSIN, 1)] }],
      options: [...TIDE_RIDES, { id: 'dk.tide.map', text: '(Look at the map.)', effects: [{ event: 'map' }], exit: true, repeat: true }, leave],
    },
  },
};

export const d_dk_tram: DialogueDef = {
  id: 'd_dk_tram', owner: 'narrator', start: [{ node: 'stop' }],
  nodes: {
    stop: {
      text: 'THE QUAY — CARRICK. A single tram car off the Loop\'s old Docks line, its trolley pole bent up to a wire that still carries something, and a board with one name on it: CLOVER 2. The far bank\'s half of the Loop, running north round the ring road and over the old ring bridge to the Loop\'s last halt, outside the Wall.',
      again: 'The quay tram, humming. CLOVER 2.',
      effects: [{ learn: 'dk_tram_seen' }],
      interject: [{ companion: NINE, text: '"The Loop\'s Docks branch," Nine says. "Its far half. The drawings show a single line from Clover over the ring bridge to this terminus; the bridge at Bridgeward carried the other half, with a tram on it, the day it fell." The lens clicks. "The timetable for that tram is still in the record. It is very punctual."' }],
      options: [
        { id: 'dk.tram.clover', text: 'Clover, for the Loop. (2 Tolls)', if: TOLLS(2), effects: [{ take: 'tolls', count: 2 }, { learn: 'dr_ring_heard' }, { event: 'goto', data: { location: 'md_ring', spawn: 'loop', minutes: 25 } }], exit: true, repeat: true },
        leave,
      ],
    },
  },
};

export const d_dk_cradle: DialogueDef = {
  id: 'd_dk_cradle', owner: 'narrator',
  start: [{ if: NOT(CRADLE_RUNS), node: 'cut' }, { if: DARK, node: 'night' }, { node: 'day' }],
  nodes: {
    day: {
      text: 'Crane One, dead on the bank above the river wall, its jib out over the dry bed like an arm held out for balance. From the jib\'s end a cable runs out into the air over the Hulls, sagging, to the torn end of Bridgeward\'s bridge on the far bank. At the crane\'s foot a winch with a drum of cable as thick as a wrist, and a steel basket chained to the bank. By day it does not move.',
      again: 'Crane One\'s jib, the cable to Bridgeward\'s drop, the basket chained.',
      effects: [{ learn: 'dk_cradle_seen' }],
      options: [leave],
    },
    night: {
      text: 'Night, and the cradle working: the winch\'s brake squealing, a lamp on the basket going away over the bed toward Bridgeward with two people crouched in it, and Kobby Ofori at the drum with his sleeves rolled. "Over?" he says. "Five. Sit in the middle and don\'t look down; there\'s nothing to see but the bed."',
      again: 'The winch, the lamp going out over the bed, Kobby at the brake. "Over?"',
      effects: [{ learn: 'dk_cradle_seen' }, { learn: 'dk_cradle_known' }],
      interject: [{ companion: ILYA, text: 'Ilya climbs into the basket last and holds the rim with both hands. "I\'ve been shot at from further than this," he says. "I\'ve never hung."', effects: [A(ILYA, 1)] }],
      options: [
        { id: 'dk.cradle.over', text: '(Ride the basket over the dry river to Bridgeward\'s drop. 5 Tolls)', if: TOLLS(5), effects: [{ take: 'tolls', count: 5 }, { set: 'dk_cradle_ridden' }, { learn: 'docks_seen' }, { event: 'goto', data: { location: 'md_bridgeward', spawn: 'bridge', minutes: 20 } }], exit: true, repeat: true },
        leave,
      ],
    },
    cut: {
      text: 'Crane One, dead on the bank, its jib bare. The cradle\'s cable has been cut at the drum and lies in coils on the bed below, already half buried in silt, and the winch is padlocked under the guild\'s seal.',
      again: 'The bare jib, the cut cable in the silt.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- signs on the quay

const SIGN = (id: string, text: NodeDef['text'], again: string, effects: Effect[] = [], extra: Partial<NodeDef> = {}): DialogueDef =>
  ({ id, owner: 'narrator', start: [{ node: 'read' }], nodes: { read: { text, again, effects, options: [leave], ...extra } } });

export const d_dk_engine = SIGN('d_dk_engine', [
  { if: { flag: 'rc_derailed' }, text: 'Sixty under the shed, drinking from the water column, and the through\'s road beside her empty: no through has come in since the wreck east of East Halt, and the Bond\'s yard is half dark. The dockers on the platform are playing cards on a crate.' },
  { if: { flag: 'rc_pilot' }, text: 'Sixty under the shed, drinking from the water column, and on her footplate a pilot in faded orange with a red flag rolled under his arm, drinking tea out of the driver\'s can: the halts\' men ride every section now, even the last.' },
  { if: { flag: 'rc_line', eq: 'guild' }, text: 'Sixty under the shed, drinking from the water column, with two of the guild\'s riders on her step and a third walking the platform, looking at faces. The guild holds the Line end to end, and it wants you to see it holding.' },
  { text: 'Sixty under the shed: square-nosed, plated, steaming gently at the buffer stop with the water column swung over her tank and a fireman on her roof with a hose. The Line\'s last ten feet of rail, and a lamp on the buffer that is lit day and night.' },
], 'Sixty at the buffer, drinking.', [{ learn: 'dk_engine_seen' }]);

export const d_dk_floor_notice = SIGN('d_dk_floor_notice', [
  { if: ANY(GIRL('returned'), GIRL('shore'), GIRL('choir'), GIRL('bought'), GIRL('ruled')), text: 'GUILD FLOOR — CARRICK — FREIGHT BY THE TON — DUES BY THE BERTH. The Concern\'s notice is gone; four drawing pins hold a square of cleaner paint where it was.' },
  { text: 'Notices on the guild floor\'s door: GUILD FLOOR — CARRICK — FREIGHT BY THE TON — DUES BY THE BERTH — THEFT FROM THE QUAY: THE HOOK. And pinned over the guild\'s, in the Concern\'s clean type on clean card: RETURNABLE LOST FROM BOND — ONE — REWARD 60 — APPLY THE BOND OFFICER. Somebody has written under it in chalk, small: IT WASHES POTS.' },
], 'FREIGHT BY THE TON. RETURNABLE LOST FROM BOND — ONE — REWARD 60.', [{ learn: 'dk_notice_read' }, { lead: 'l_dk_returnable' }, { quest: 'q_dk_girl', start: true }]);

export const d_dk_bond_sign = SIGN('d_dk_bond_sign', 'THE BOND — CONCERN — UNDER SEAL. Below it, in smaller letters cut into a steel plate as if somebody expected to be argued with: BONDED PREMISES UNDER THE HARBOUR ACT, s. 19. THE HARBOUR MASTER\'S AUTHORITY DOES NOT EXTEND WITHIN. The lights on the fence posts are on at noon.', 'THE BOND — UNDER SEAL — s. 19. The lights on at noon.', [{ learn: 'dk_bond_seen' }]);

export const d_dk_hulls_notice = SIGN('d_dk_hulls_notice', 'HARBOUR NOTICE — THE RIVER BERTHS — LEASED TO HOUSE VANE FOR WORKS UNDER THE ACT, s. 41 — OCCUPIERS TO QUIT ON COMMENCEMENT — H. DAHL, HARBOUR MASTER. Somebody has chalked under it, in capitals that go downhill: WE ARE NOT OCCUPIERS WE ARE CREW.', 'LEASED TO HOUSE VANE. WE ARE NOT OCCUPIERS WE ARE CREW.', [{ lead: 'l_dk_lease' }, { learn: 'dk_crew_chalk' }, { quest: 'q_dk_far', start: true }]);

export const d_dk_crane2 = SIGN('d_dk_crane2', [
  { if: STOOD, text: 'Crane Two, Constance\'s, with a strip of red cloth tied to the cab\'s rail that nobody has taken down since the morning on the Stand.' },
  { text: 'Crane Two: the other crane on the quay that still works, older than Six and slower, its cab windows patched with tin. CONNIE painted on the counterweight in letters a yard high, and under it, smaller, older: NO BOX DOWN — 22 YEARS.' },
], 'Crane Two, and NO BOX DOWN on the counterweight.');

/** The Wet's barges tie up at Carrick's barge quay: the river's own board (B5c's `bargeBoard()`), its city end. */
export const d_dk_barge = bargeBoard('d_dk_barge', 'meridian', 'narrator',
  [{ text: 'The barge quay: timber staging along the Basin\'s edge where the Wet\'s barges tie up, black with tar and white with gull. A long flat barge lies against it with timber stacked on her deck and a family living under a tarp at her stern. A slate on a post: THE BARGES — LOW LANDING — ASHBY — SAWTOWN — UP AT SIX — 10 A REACH — ASK ABOARD.' }],
  'The barge quay. UP AT SIX — 10 A REACH.');

export const d_dk_fish = SIGN('d_dk_fish', 'GRIGOR\'S STEPS — MULLET — LINES AT DAWN 2 — BRING THEM BACK. A painted fish beside it, smiling, which nobody who has eaten a Basin mullet would do.', 'GRIGOR\'S STEPS — LINES AT DAWN 2.');

export const d_dk_fuel = SIGN('d_dk_fuel', [
  { if: ANY(F('ds_barge', 'pyre'), F('ds_barge', 'burned')), text: 'The fuel berth: a tank on the quay stencilled LINE ACCOUNT in the guild\'s neat letters, and a gauge on its side reading a quarter. The night barge from the delta that used to fill it does not come any more. The guild\'s men have started buying Hum\'s diesel off the tide boat, a drum at a time, at Hum\'s price.' },
  { if: ANY(F('ds_rig', 'crew'), F('ds_rig', 'shared'), F('ds_rig', 'stilts')), text: 'The fuel berth: a tank on the quay stencilled LINE ACCOUNT, and alongside it the Rigs\' own launch, low in the water, pumping across a hose with HUM painted on it, at a price somebody on Hum set.' },
  { text: 'The fuel berth: a tank on the quay stencilled LINE ACCOUNT in the guild\'s neat letters, a hose coiled on the staging, and a slick on the water round it, purple and gold. The night barge from the delta ties up here with no lamps, every few nights, and nobody on the quay is awake to see it.' },
], 'The tank, LINE ACCOUNT.', [{ learn: 'dk_fuel_seen' }]);

export const d_dk_act: DialogueDef = {
  id: 'd_dk_act', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'THE HARBOUR ACT, framed under glass on the long room\'s wall, its pages pinned open side by side and gone the colour of tea. Section 19: BONDED PREMISES — the Harbour Master\'s authority does not extend within. Section 41: IDLE BERTHS — may be leased by the concession for works. Schedule 2, GOODS: cargo, livestock, mails, ship\'s stores, ballast. Schedule 3, VESSELS IN PORT: a vessel in port shall not be moved, broken or removed while she has a crew aboard, save by her master\'s leave or the court\'s order on proof of abandonment.',
      again: 'The Act under glass: s. 19, s. 41, Schedules 2 and 3.',
      effects: [{ learn: 'dk_act_read' }, { lead: 'l_dk_act' }],
      interject: [{ companion: NINE, text: '"Schedule 2 has no persons in it," Nine says, reading with its lens almost on the glass. "Schedule 3 has no definition of a vessel\'s being afloat." It reads both again. "The drafters were thorough about everything except the future. That is the usual way."', effects: [A(NINE, 3)] }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Crane Six: the box, the cab, the tally board

export const d_dk_box: DialogueDef = {
  id: 'd_dk_box', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: ANY(CRANE('bond'), STOOD), text: 'The box Six dropped, empty now: the copper went over the weighbridge in barrows, bar by bar, with the whole quay watching the needle. The dockers have started using it as a windbreak.' },
        { if: NOT(CRANE_OPEN), text: 'The box Six dropped, emptied by the Bond\'s men in the night and left where it fell. The stain where the tarp was is being worn out of the concrete by boots.' },
        { text: 'A forty-foot box on its side, the closed eye on its doors and the Concern\'s seal whole on its wire. Stencilled on the end: MACHINE PARTS — 14.0 T — 7-2390. One end has gone into the concrete and burst along the seam, and through the seam, stacked as neat as loaves on a baker\'s board, red-brown bars as long as a forearm, each one stamped with the closed eye. Beside it, the tarp, and the boots.' },
      ],
      again: 'The box on its side, the copper in the split.',
      effects: [{ learn: 'dk_box_read' }, { lead: 'l_dk_box' }, { quest: 'q_dk_crane', start: true }],
      passives: [
        { skill: 'mechanics', dc: 25, text: 'Cast copper. A bar that size is thirty kilos if it is a gram, and a box like this holds a thousand of them packed like that. Thirty tonnes, on a bill of fourteen; under a crane whose plate says twenty-five.', effects: [{ learn: 'dk_box_weighed' }] },
        { attr: 'senses', dc: 6, text: 'The spreader\'s twistlocks are still in the box\'s corner castings, sheared clean through. They did not come unlatched. They broke.', effects: [{ learn: 'dk_locks_sheared' }] },
      ],
      interject: [
        { companion: KES, text: 'Kes crouches at the split and turns a bar over with her boot. "Copper," she says. "Halcyon pulls it out of the Teeth by the trainload; the whole arcology\'s wired with it. They\'re selling it west." She reads the stencil. "And lying about it, obviously."', effects: [A(KES, 1)] },
        { companion: ILYA, text: '"A man under a load," Ilya says quietly. "You don\'t unlatch wrong after eleven years. You get tired. Or somebody tells you to hurry."' },
      ],
      options: [leave],
    },
  },
};

export const d_dk_cab: DialogueDef = {
  id: 'd_dk_cab', owner: 'narrator',
  start: [{ if: F('dk_cab_done'), node: 'done' }, { if: { hour: { from: 21, to: 5 } }, node: 'night' }, { node: 'ladder' }],
  nodes: {
    ladder: {
      text: 'Crane Six\'s ladder goes up inside a cage on the crane\'s leg, forty feet to the cab: a steel box with its glass gone dark. A chain across the ladder\'s foot with a padlock, and a guild guard on the quay who looks at the chain every time he turns.',
      again: 'The ladder in its cage, the chain, the guard turning.',
      options: [
        { id: 'dk.cab.relief', text: '(Unhook the chain and climb, as Connie\'s relief.)', if: F('dk_cab_leave'), next: 'cab' },
        { id: 'dk.cab.climb', text: '(Climb the outside of the cage while the guard\'s back is turned.)', if: NOT(F('dk_cab_leave')), check: { attr: 'reflex', dc: 7, mods: [{ if: { skill: 'stealth', gte: 40 }, dc: -1, why: 'you know when a man is not looking' }] }, next: 'cab', fail: 'caught' },
        leave,
      ],
    },
    night: {
      text: 'At night the cab is dark, the guard is up at the Customs House steps, and the chain is still on the ladder with its padlock.',
      again: 'The dark cab, the chain, the padlock.',
      options: [
        { id: 'dk.cab.lock', text: '(Pick the padlock.)', check: { skill: 'security', dc: 30 }, next: 'cab', fail: 'locked' },
        { id: 'dk.cab.relief2', text: '(Unhook the chain, as Connie\'s relief.)', if: F('dk_cab_leave'), next: 'cab' },
        leave,
      ],
    },
    caught: {
      text: '"Off the leg." The guard has not raised his voice or his shotgun; he has only turned round at the wrong moment. "Ten Tolls for the climb, or the Harbour Master hears about it."',
      again: '"Ten, or the Harbour Master."',
      options: [
        { id: 'dk.cab.fine', text: '(Pay ten.)', if: TOLLS(10), effects: [{ take: 'tolls', count: 10 }], exit: true },
        { id: 'dk.cab.walk', text: '(Walk away.)', effects: [{ rep: { faction: 'tollmen', respect: -2 } }], exit: true },
      ],
    },
    locked: {
      text: 'The padlock is older than it looks and better. It does not give, and something in it bends that should not. Better come back by day with somebody\'s leave.',
      again: 'The padlock that would not give.',
      options: [leave],
    },
    cab: {
      text: 'The cab: a seat with the stuffing out, two levers worn bright as cutlery, a pre-war panel with a dial for the load and, under a glass lid, a recorder with a strip of waxed paper hanging out of it like a tongue. Beside the dial, a key switch: OVERRIDE. The quay below is a map of hats.',
      again: 'The cab: the dial, the recorder\'s tongue of paper, the key switch.',
      interject: [{ companion: KES, text: '"Pre-war and unnetworked, no Concern board anywhere in it," Kes says, rapping the panel with a knuckle. "Dumb as a fencepost and about as honest. It said no." She looks at the key switch. "Somebody made it shut up."', effects: [A(KES, 2)] }],
      options: [
        { id: 'dk.cab.read', text: '(Read the load recorder.)', once: true, check: { skill: 'mechanics', dc: 30, mods: [{ if: { skill: 'science', gte: 40 }, dc: -10, why: 'the printer\'s codes are an old standard' }, { if: IN(KES), dc: -20, why: 'Kes reads it over your shoulder' }] }, effects: [{ give: 'k_dk_tape' }, { lead: 'l_dk_tape' }, { set: 'dk_cab_done' }, { xp: 40 }], failEffects: [{ give: 'k_dk_tape' }, { set: 'dk_cab_done' }], next: 'tape', fail: 'tape_no' },
        { id: 'dk.cab.key', text: '(Look at the key switch.)', once: true, next: 'keyswitch' },
        leave,
      ],
    },
    tape: {
      text: 'You tear the strip off and read it against the light. 02:06 LIFT 31.2 T — OVERLOAD — CUTOUT. 02:07 KEY 6/N — OVERRIDE. 02:08 LIFT. 02:10 SPREADER — LOCK FAULT. Then nothing at all: the box was on the quay, and the recorder had nothing more to say.',
      again: 'KEY 6/N — OVERRIDE, and then nothing.',
      options: [{ text: '(Climb down.)', exit: true }],
    },
    tape_no: {
      text: 'Codes in faded purple on waxed paper, times and numbers and abbreviations in a pre-war standard you cannot read. The strip tears off in your hand anyway. Somebody who weighs things for a living would know what it says.',
      again: 'Codes you cannot read on a strip of wax.',
      options: [{ text: '(Climb down.)', exit: true }],
    },
    keyswitch: {
      text: 'The override is a key switch beside the load dial, its brass collar polished by thumbs. Round the slot the brass is scratched bright in a ring: a key that did not quite fit, turned hard, many times over many nights. A factory key does not do that.',
      again: 'The scratched ring round the key switch.',
      effects: [{ learn: 'dk_copied_key' }],
      options: [{ text: '(Back to the panel.)', next: 'cab' }],
    },
    done: {
      text: 'Crane Six\'s cab, where you tore the tape off the recorder. Somebody has fitted a new roll.',
      again: 'Six\'s cab, a new roll in the recorder.',
      options: [leave],
    },
  },
};

export const d_dk_stand: DialogueDef = {
  id: 'd_dk_stand', owner: 'narrator', start: [{ if: DAWN, node: 'callon' }, { node: 'board' }],
  nodes: {
    board: {
      text: [
        { if: STOOD, text: 'The tally board on its post: every gang ON, Gang Nine among them, all eight names. Chalked across the top, in letters a hand high, by somebody who has never written so big: WE STOOD.' },
        { if: F('dk_black', 'broken'), text: 'The tally board: GANG NINE — OFF — BY ORDER. Somebody chalked BLACK across the board once; it has been washed off, and the wash left a grey cloud the shape of the word.' },
        { if: CRANE('black'), text: 'The tally board: every gang on it chalked BLACK — BOND, and under the board, on the concrete, a ring of boots where people have been standing all night so that nobody can say the Stand was empty.' },
        { if: CRANE('bond'), text: 'The tally board: GANG NINE — ON. Under it, in the Harbour Master\'s clerk\'s hand: ALL THROUGH BOXES TO THE PLATE — BY ORDER OF THE COURT. And under that, in chalk: LYSENKO SOLD THE CUTOUT, which somebody else has half rubbed out.' },
        { if: CRANE('gang'), text: 'The tally board: GANG NINE — ON — NEGLIGENCE STRUCK BY THE COURT — SIX AT COMPLEMENT. Somebody has drawn a small crane beside Dmytro\'s name, very carefully.' },
        { text: 'The tally board on its post, the gangs in columns of names. GANG NINE — STOOD DOWN — DOCKER\'S NEGLIGENCE (LYSENKO, D., HOOKER-ON) — NO FUNERAL TALLY — BY ORDER. The other seven of Nine\'s names have a chalk line through them.' },
      ],
      again: 'The tally board, and Gang Nine\'s names.',
      effects: [{ learn: 'dk_board_read' }, { quest: 'q_dk_crane', start: true }],
      options: [leave],
    },
    callon: {
      text: [
        { if: ALL(CRANE('black'), NOT(F('dk_black'))), text: 'Dawn, and nobody on the Stand is being called: the whole quay is on the line with its arms folded, facing the Bond.' },
        { if: CRANE_OPEN, text: 'Dawn on the Stand: a hundred people on a white line with their breath smoking, and the gang-masters walking down it with clipboards, choosing with a tap on the shoulder. Gang Nine stands at the back of the line, and nobody taps them.' },
        { text: 'Dawn on the Stand: a hundred people on a white line with their breath smoking, and the gang-masters walking down it with clipboards, choosing with a tap on the shoulder.' },
      ],
      again: 'The line at dawn, the clipboards coming down it.',
      effects: [{ learn: 'dk_callon_known' }],
      options: [
        { id: 'dk.callon.stand', text: '(Stand on the line for the call-on.)', if: NOT(ALL(CRANE('black'), NOT(F('dk_black')))), check: { attr: 'brawn', dc: 5, mods: [{ if: { trust: { npc: CONNIE, gte: 30 } }, dc: -2, why: 'Connie nods at you, and the gang-master sees it' }] }, next: 'picked', fail: 'passed_over', repeat: true },
        { id: 'dk.callon.board', text: '(Read the tally board.)', next: 'board' },
        leave,
      ],
    },
    picked: {
      text: [
        { if: STOOD, text: 'A tap on the shoulder. Eight hours on Two\'s gang, slinging timber off a barge, with a full gang and a break at the fourth hour that nobody has to ask for. Twelve Tolls in tallies at the floor at the end of it, and Constance on Two\'s lever calling the lifts as if she had all the time in the world.' },
        { text: 'A tap on the shoulder. Eight hours on a gang, slinging timber off a barge and hooking on boxes for a crane that lifts what it is given, until your hands are somebody else\'s. Eight Tolls in tallies at the floor at the end of it, which the floor pays out at par, minus one for the floor.' },
      ],
      again: 'Eight hours on a gang, and tallies at the floor.',
      options: [
        { id: 'dk.callon.paid', text: '(Take your tallies.)', if: NOT(STOOD), effects: [{ time: 480 }, { give: 'tolls', count: 7 }, { xp: 15 }], exit: true, repeat: true },
        { id: 'dk.callon.paid_full', text: '(Take your tallies.)', if: STOOD, effects: [{ time: 480 }, { give: 'tolls', count: 12 }, { xp: 15 }], exit: true, repeat: true },
      ],
    },
    passed_over: {
      text: 'The gang-master walks past you without slowing, taps the man beside you, and the line closes up behind him. By the time the clipboards are at the end of it the sun is up and the Stand is half empty, and the half that is left goes home.',
      again: 'Passed over.',
      options: [{ id: 'dk.callon.home', text: '(Try tomorrow.)', effects: [{ time: 60 }], exit: true, repeat: true }],
    },
  },
};

// ---------------------------------------------------------------- Constance Okoye, the Stand's voice

const CONNIE_TOPICS = (n: string): OptionDef[] => [
  { id: `dk.connie.hear${n}`, text: 'What does the Harbour Master need to hear?', if: ALL(NOT(SEEN('dk.connie.hear')), NOT(SEEN('dk.connie.hear2'))), next: 'hear' },
  { id: `dk.connie.think${n}`, text: 'What do you think happened?', if: ALL(NOT(SEEN('dk.connie.think')), NOT(SEEN('dk.connie.think2'))), next: 'think' },
  { id: `dk.connie.cab${n}`, text: 'Can I get up into Six\'s cab?', if: ALL(CRANE_OPEN, NOT(F('dk_cab_leave'))), next: 'cab' },
  { id: `dk.connie.callon${n}`, text: 'How does the call-on work?', if: ALL(NOT(SEEN('dk.connie.callon')), NOT(SEEN('dk.connie.callon2'))), next: 'callon' },
  { id: `dk.connie.bond${n}`, text: 'What is the Bond?', if: ALL(NOT(SEEN('dk.connie.bond')), NOT(SEEN('dk.connie.bond2'))), next: 'bond' },
];
/** The Stand blacks the Bond: no docker on the quay touches a Concern box until it pays for Dmytro and its boxes are weighed. */
const BLACK: Effect[] = [
  { set: 'dk_crane', value: 'black' }, { set: 'dk_stand', value: 'black' }, { rep: { faction: 'tollmen', respect: -5 } }, { rep: { faction: 'concern', respect: -5 } },
  T(CONNIE, 15), A(WREN, 5), A(TAMSIN, 3), A(KES, 5), A(ASH, 3), { xp: 120 },
  DEC('dk_crane', 'You brought the Stand at Carrick to black the Concern\'s Bond: no docker would touch a Concern box until the Concern paid for Dmytro Lysenko and its boxes went over the weighbridge.'),
  NEWS('dk_black', 'the dockers at Carrick have blacked the Concern\'s Bond over a man killed under Crane Six; the through stands at the yard throat', 2, 6),
];

export const d_dk_connie: DialogueDef = {
  id: 'd_dk_connie', owner: CONNIE,
  start: [{ if: F('dk_black', 'broken'), node: 'broken' }, { if: F('dk_connie_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"You walked round the tarp instead of over it. Most strangers don\'t." A woman on the Stand with a crane driver\'s gloves through her belt and grey in the roots of her cornrows, watching the tally board. "Constance. Connie, on the line. That\'s Dmytro Lysenko under there: hooker-on, night gang, Gang Nine, eleven years on Six and never a box down. The guild\'s board says he unlatched the spreader wrong. Gang Nine\'s stood down until the Harbour Master hears it, no tally, and his widow gets no funeral. Eight families." She looks at you. "You look like somebody who asks questions. Ask them. We can\'t; we\'d lose our place on the line."',
      again: 'Connie on the line, watching Gang Nine\'s names with the chalk through them.',
      effects: [{ set: 'dk_connie_met' }, { quest: 'q_dk_crane', start: true }],
      interject: [{ companion: WREN, text: 'Wren looks along the white line, at the gang-masters, at the Bond\'s lights. "Same as the halts," she says to you. "The ones who carry it don\'t get paid when it doesn\'t arrive."' }],
      options: [...CONNIE_TOPICS(''), bye],
    },
    again: {
      text: [
        { if: STOOD, text: '"Look at it." Connie nods down the line: full, every gang, Nine among them. "Twenty-two years on Two and I didn\'t know we could. Now we do. So does the guild. So does the Bond."' },
        { if: CRANE('bond'), text: '"Dmytro sold the cutout." She says it flatly. "If you\'d told me that the day he died I\'d have put you in the Basin. Gang Nine\'s on the line. That\'s what I asked you for." She looks at the tarp\'s stain. "It isn\'t what I wanted."' },
        { if: CRANE('gang'), text: '"The guild paid for his funeral. The quay thinks the guild killed him." She looks at you, longer than she needs to. "Is that what happened?" She does not wait for an answer.' },
        { if: ANY(CRANE('guild'), CRANE('bought')), text: 'Connie does not look round. "Gang Nine\'s still off the line," she says to the tally board. "Whatever you found."' },
        { if: CRANE('black'), text: '"Dawn," Connie says. "On the line. They\'ll send to the Ring for men; they always do. We\'ll be here."' },
        { text: 'Connie on the line, watching Gang Nine\'s names with the chalk through them.' },
      ],
      again: 'Connie on the line.',
      options: [
        ...CONNIE_TOPICS('2'),
        { id: 'dk.connie.truth', text: 'It was Dmytro. He turned the cutout himself, for the Bond.', if: ALL(CRANE_OPEN, TRUTH), once: true, next: 'truth' },
        { id: 'dk.connie.black', text: 'The Stand could black the Bond. Every Concern box, until it pays.', if: ALL(CRANE_OPEN, TRUTH, SEEN('dk.connie.truth')), next: 'black_offer' },
        { id: 'dk.connie.girl', text: 'Espe\'s niece at the back of the cookshop.', if: ALL(F('dk_espe_met'), GIRL_OPEN, NOT(F('dk_mirela_met')), NOT(SEEN('dk.connie.girl'))), next: 'girl' },
        bye,
      ],
    },
    hear: {
      text: '"Something she can hold." Connie holds up a hand, empty. "Dahl keeps the port by the Act, and the Act\'s a book. Bring her a thing that\'s written or a thing she can put on the table, and she rules on what\'s in front of her, at the change of shift, on the steps. She\'s hanged guild men on the facts. She\'s hanged dockers on the facts. She has never once ruled on what anybody felt."',
      again: '"Something she can hold."',
      effects: [{ learn: 'dk_court_how' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    think: {
      text: '"I think Six lifted a box Six shouldn\'t lift." She looks up at the crane. "Six has a cutout: pre-war, dumb, honest. Over twenty-five tonnes and she won\'t lift; the arm just sits there humming. That box —" She does not finish. "Ask the box. Ask the cab. And ask Platt, the night gang-master, why Nine was five hands on Six the night it happened, when Six wants eight."',
      again: '"Ask the box. Ask the cab. Ask Platt."',
      effects: [{ learn: 'dk_short_heard' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    cab: {
      text: '"Six is the guild\'s. I drive Two." She thinks about it. "The cab\'s not locked by day; the ladder\'s chained and the guard on the quay watches the chain. I\'ll tell him you\'re my relief. He won\'t believe it, and he won\'t say so." She puts two fingers in her mouth and whistles at the guard, and points at you, and the guard looks at you and away.',
      again: '"You\'re my relief. He won\'t say so."',
      effects: [{ set: 'dk_cab_leave' }],
      options: [{ id: 'dk.connie.cab.thanks', text: 'Thank you.', once: true, effects: [T(CONNIE, 5)], next: 'again' }, { text: 'Something else.', next: 'again' }],
    },
    callon: {
      text: '"Dawn, on the line." She toes the white paint. "The gang-masters walk down it and tap who they want. You stand, you look like you can lift, you get tapped or you don\'t. A day on a gang is eight in tallies at the floor, which pays you seven, because it\'s the floor." She shrugs. "It was ten, when I started. Nobody voted on that either."',
      again: '"Dawn, on the line. Eight in tallies; the floor pays seven."',
      effects: [{ learn: 'dk_callon_known' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    bond: {
      text: '"The Concern\'s yard." She does not look at it. "Everything off the through goes in there sealed and comes out sealed. Their fence, their lights, their man in his clean office. The Act says the Harbour Master\'s word stops at the fence. We work the boxes in and out of the gate and we don\'t go past the line." She spits, neatly, on the guild\'s side of it. "The lights never go off. I\'ve always wondered what they need to see."',
      again: '"Their fence, their lights, their man."',
      effects: [{ learn: 'dk_bond_seen' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    girl: {
      text: 'Connie looks at you for a long moment. "Espe\'s got a lot of nieces," she says. "Every one of them\'s from the Hulls." Then, lower: "If you\'re going to ask her, ask her straight, and don\'t ask her near the fence. Tell her I said you could be told."',
      again: '"Tell Espe I said you could be told."',
      effects: [{ set: 'dk_connie_vouch' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    truth: {
      text: [
        { if: { item: 'k_dk_tin' }, text: 'Her face does nothing at all. "Show me." You show her the tin. She takes the key out and turns it over and holds it up to the light, the hand-cut teeth, the 6/N stamped a little crooked. "He cut it himself. I taught him to cut keys." She puts it back. She looks at the blue caps for a long time. "His girl," she says. "Those blue things. That\'s what she breathes through." She closes the tin and gives it back. "So what do I tell the line? That Dmytro was a thief? That the guild was right?"' },
        { text: 'Her face does nothing at all. "Prove it." You tell her what you know: the tape, the key, the blue caps. She listens to the end without moving. "His girl," she says. "Those blue things. That\'s what she breathes through." She looks at the tarp. "So what do I tell the line? That Dmytro was a thief? That the guild was right?"' },
      ],
      again: '"So what do I tell the line?"',
      interject: [{ companion: ASH, text: '"He sold it for his girl\'s breath," Ash says. "That\'s not a thief. That\'s a father with a bad choice and a good reason." He looks at Connie. "Bury him as one."', effects: [A(ASH, 3)] }],
      options: [
        { id: 'dk.connie.truth.bond', text: 'Tell them the Bond paid him to do it, so its boxes would never be weighed.', next: 'black_offer' },
        { id: 'dk.connie.truth.later', text: 'Tell them nothing yet.', next: 'again' },
      ],
    },
    black_offer: {
      text: '"The Bond pays a docker to switch off the thing that keeps dockers alive, so it can cheat the guild on the ton. And the guild never weighs the through, because its contract with the Concern says the through doesn\'t stop." She looks down the line, the length of it. "If the Stand stopped working Concern boxes. All of us. Every gang. Until the Concern pays Oksana and every box goes over the plate." She looks back at you. "They\'d send to the Ring for men who\'ll work a crane for a day\'s pay. They always do. Will you stand on the line with us at dawn?"',
      again: '"Will you stand on the line with us at dawn?"',
      options: [
        { id: 'dk.connie.black.yes', text: 'Black the Bond. I\'ll stand with you.', if: CRANE_OPEN, check: { skill: 'speech', dc: 45, mods: [
          { if: { item: 'k_dk_slip' }, dc: -15, why: 'the Concern\'s own slip: two weights for one seal' },
          { if: { knows: 'dk_skim' }, dc: -10, why: 'you can say how the cheat works' },
          { if: { trust: { npc: CONNIE, gte: 20 } }, dc: -10, why: 'she trusts you' },
          { if: IN(ODILE), dc: -5, why: 'Odile tells her what a stopped through costs the guild by the hour' },
        ] }, effects: BLACK, next: 'black_yes', fail: 'black_no' },
        { id: 'dk.connie.black.no', text: 'Not yet.', next: 'again' },
      ],
    },
    black_yes: {
      text: '"Dawn, then. On the line." She walks off down the quay without another word, and you watch her stop at every box in the Boxes, one by one, and at the barge, and at the fish steps, and at the Hulls\' stairs. By dark there is chalk on every gang\'s column on the tally board: BLACK — BOND.',
      again: '"Dawn, on the line."',
      options: [bye],
    },
    black_no: {
      text: '"Not on what you\'ve got." She shakes her head. "The line won\'t stop for a story. Two hundred families lose a day\'s tallies for every day it stands. It\'ll stop for a paper it can read, that says the Bond did this on purpose." She looks at the fence. "Bring me that."',
      again: '"Bring me a paper the line can read."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    broken: {
      speaker: 'narrator',
      text: 'Constance Okoye at Crane Two\'s foot, eating bread out of a cloth, who does not look up when your shadow falls on her and does not say anything at all.',
      again: 'Connie, eating, not looking up.',
      options: [{ text: '(Leave her be.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the stoppage: the Ring's men on the Stand at dawn

/** The stoppage holds: the Concern settles through the guild, its boxes go over the plate, and the Stand knows what it is. */
const STOOD_FX = (how: string): Effect[] => [
  { set: 'dk_black', value: 'won' }, { set: 'dk_black_how', value: how }, { set: 'dk_stand', value: 'organised' }, { set: 'dk_stand_owed' },
  { set: 'dk_weighbridge', value: 'on' }, { set: 'dk_concern_billed' }, { set: 'dk_buried', value: 'concern' },
  { rep: { faction: 'tollmen', respect: -5 } }, { rep: { faction: 'concern', respect: -10 } }, T(CONNIE, 25), T(OKSANA, 15),
  A(WREN, 5), A(TAMSIN, 5), A(KES, 5), A(ASH, 3), A(ILYA, 3), { xp: 300 },
  DEC('dk_black', 'The Stand at Carrick held the line against the guild\'s hired men at dawn. The Concern paid Dmytro\'s widow through the guild, and every through box goes over the weighbridge now.'),
  NEWS('dk_black_won', 'the dockers at Carrick held their stoppage against the guild\'s hired men; the Concern paid for the dead man and its boxes are weighed', 5, 8),
];
const BROKEN_FX: Effect[] = [
  { set: 'dk_black', value: 'broken' }, { set: 'dk_stand', value: 'broken' }, T(CONNIE, -30),
  A(WREN, -10), A(TAMSIN, -10), A(KES, -5), A(ASH, -5),
  DEC('dk_black', 'You stepped off the line at dawn and the stoppage at Carrick broke: the Ring\'s men worked Crane Six for a day\'s pay and Gang Nine is off the quay.'),
  NEWS('dk_black_broken', 'the dockers\' stoppage at Carrick broke at dawn; hired men from the Ring worked the cranes', -3, 5),
];

export const d_dk_breakers: DialogueDef = {
  id: 'd_dk_breakers', owner: 'npc_dk_h1',
  start: [{ node: 'line' }],
  nodes: {
    line: {
      speaker: 'narrator',
      text: 'Dawn, and the Stand is full: every docker on the quay on the white line with their arms folded, Constance in the middle of them, Oksana at the end with her fish knife in her apron. Facing them, between the line and the Bond\'s gate, three men from the Ring: one with a sledge on his shoulder, one with a pipe, one with a zip gun stuck in his belt. Behind them, at a careful distance, Platt with his clipboard, not calling anybody. The one with the sledge says, to the line in general: "Day\'s pay to work a crane. Nobody has to get hurt. Off the line."',
      again: 'The Ring\'s men, the line, and nobody moving.',
      interject: [{ companion: ILYA, text: 'Ilya stands on the line beside you with his rifle slung, not unslung. "Three," he says, not quietly. "The one with the gun has never fired it. Look at his thumb." The one with the gun looks at his thumb.' }],
      options: [
        { id: 'dk.brk.talk', text: 'You\'re from the Ring. You know what it is to be the cheapest thing in somebody\'s arrangement. Go home.', check: { skill: 'speech', dc: 45, mods: [
          { if: IN(ILYA), dc: -5, why: 'Ilya has told them about the thumb' },
          { if: F('dr_leven', 'barred'), dc: -10, why: 'Leven stood, and the Ring knows whose doing that was' },
          { if: F('dr_leven_burned'), dc: 10, why: 'Leven burned, and the Ring knows who was paid' },
          { if: { trust: { npc: CONNIE, gte: 30 } }, dc: -5, why: 'the whole line is behind you' },
        ] }, effects: STOOD_FX('talked'), next: 'talked', fail: 'stay' },
        { id: 'dk.brk.pay', text: '(Pay them their day to go home. 60 Tolls)', if: TOLLS(60), effects: [{ take: 'tolls', count: 60 }, ...STOOD_FX('paid')], next: 'paid' },
        { id: 'dk.brk.fight', text: '(Step off the line at them.)', effects: [{ set: 'dk_breakers_fight' }, ...STOOD_FX('fought'), { event: 'combat' }], exit: true },
        { id: 'dk.brk.aside', text: '(Step off the line and out of it.)', effects: BROKEN_FX, next: 'aside' },
      ],
    },
    stay: {
      speaker: 'npc_dk_h1',
      text: '"Nice speech." The sledge comes down off his shoulder and rests head-down on the concrete. "Ring\'s hungry too. Off the line."',
      again: '"Off the line."',
      options: [
        { id: 'dk.brk.pay2', text: '(Pay them their day to go home. 60 Tolls)', if: TOLLS(60), effects: [{ take: 'tolls', count: 60 }, ...STOOD_FX('paid')], next: 'paid' },
        { id: 'dk.brk.fight2', text: '(Step off the line at them.)', effects: [{ set: 'dk_breakers_fight' }, ...STOOD_FX('fought'), { event: 'combat' }], exit: true },
        { id: 'dk.brk.aside2', text: '(Step off the line and out of it.)', effects: BROKEN_FX, next: 'aside' },
      ],
    },
    talked: {
      speaker: 'narrator',
      text: 'The one with the sledge looks at you, and at the line, and at Platt behind him, who is looking at the sky. Then he puts the sledge back on his shoulder. "Day\'s pay\'s a day\'s pay," he says. "Night\'s pay\'s more than they offered." They go off up the river road the way they came. By noon the Bond\'s clerk comes down to the Stand with an envelope for Oksana Lysenko, through the guild, with nothing written on it; by night the first Concern box sits on Hruska\'s plate under its seal while the needle swings, and the whole quay watches it settle.',
      again: 'The Ring\'s men gone up the river road, and a box on the plate.',
      options: [{ text: '(Stand down off the line.)', exit: true }],
    },
    paid: {
      speaker: 'narrator',
      text: 'You count sixty into the sledge man\'s hand. He weighs it, looks at the line, and shrugs. "Same pay for less work," he says. "The Ring always takes that." They go off up the river road. By noon the Bond\'s clerk comes down to the Stand with an envelope for Oksana Lysenko, through the guild, with nothing written on it; by night the first Concern box sits on Hruska\'s plate under its seal, and the whole quay watches the needle settle.',
      again: 'Sixty in the sledge man\'s hand, and a box on the plate.',
      options: [{ text: '(Stand down off the line.)', exit: true }],
    },
    aside: {
      speaker: 'narrator',
      text: 'You step off the line. Nobody says anything. Then the man next to where you were steps off it too, and the woman next to him, and the line comes apart from the end like a rope unlaying, and the Ring\'s men walk through the gap to Crane Six. Constance is the last on the white paint, alone, and then she walks to Crane Two and climbs into the cab and sits there with the door shut.',
      again: 'The line come apart, and Connie alone on the paint.',
      options: [{ text: '(Go.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- Mattias Platt, the night gang-master

export const d_dk_platt: DialogueDef = {
  id: 'd_dk_platt', owner: PLATT,
  start: [{ if: F('dk_platt_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man with a clipboard and a whistle on a cord, who calls the night gangs\' names off the board without looking at the board. "Platt. Night gang-master. If you\'re on the line, stand on it. If you\'re asking about Nine, the board says what happened."',
      again: 'Platt, with the clipboard.',
      effects: [{ set: 'dk_platt_met' }],
      options: [
        { id: 'dk.platt.short', text: 'How many were on Six that night?', once: true, next: 'short' },
        { id: 'dk.platt.key', text: 'Who has Six\'s night key?', once: true, next: 'key' },
        { id: 'dk.platt.dmytro', text: 'Did you know Dmytro?', once: true, next: 'dmytro' },
        bye,
      ],
    },
    again: {
      text: [
        { if: ANY(CRANE('bond'), CRANE('gang'), STOOD), text: 'Platt, calling Nine\'s names off the board again, all eight of them, without looking at it.' },
        { text: 'Platt, with the clipboard. "The board says what happened."' },
      ],
      again: 'Platt, with the clipboard.',
      options: [
        { id: 'dk.platt.short2', text: 'How many were on Six that night?', if: NOT(SEEN('dk.platt.short')), once: true, next: 'short' },
        { id: 'dk.platt.key2', text: 'Who has Six\'s night key?', if: NOT(SEEN('dk.platt.key')), once: true, next: 'key' },
        { id: 'dk.platt.dmytro2', text: 'Did you know Dmytro?', if: NOT(SEEN('dk.platt.dmytro')), once: true, next: 'dmytro' },
        { id: 'dk.platt.order', text: 'Show me the order that put five on Six.', if: ALL(CRANE_OPEN, { lead: 'l_dk_short' }, NOT({ item: 'k_dk_order' }), NOT(F('dk_order_refused'))), check: { skill: 'speech', dc: 30, mods: [{ if: { knows: 'dk_override' }, dc: -10, why: 'you can tell him it was not his key' }] }, effects: [{ give: 'k_dk_order' }], failEffects: [{ set: 'dk_order_refused' }], next: 'order', fail: 'order_no' },
        bye,
      ],
    },
    short: {
      text: '"Five." He does not need the clipboard for it. "Six wants eight: the driver, the hooker-on, two on the tag lines, four on the deck. Nine was five. By order." He taps the clipboard with the whistle. "The through turns in four hours or the guild pays the Concern for every hour it stands at the throat. The Harbour Master\'s clerk writes the order. I call who I\'m told I can call."',
      again: '"Five, by order. I call who I\'m told I can call."',
      effects: [{ lead: 'l_dk_short' }],
      interject: [{ companion: ODILE, text: '"Demurrage," Odile says, very quietly. "A clause that charges you for the hours a train stands is a clause that has bought your clock." She looks at the clipboard. "I wrote the first sheet of that contract, at Ninebridge, a long time ago. The demurrage was mine. I meant it for the Concern\'s trains." A pause. "That is a cost."', effects: [A(ODILE, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    key: {
      text: '"Mine." He pulls it out on its chain from under his shirt: a factory key, heavy brass, 6/N stamped deep and square. "On my belt every night of my life. It was on my belt at two. I was at the yard throat with the through\'s guard, counting seals." He puts it away. "Ask the guard. Ask the seals."',
      again: '"Mine. On my belt at two."',
      effects: [{ learn: 'dk_platt_key' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    dmytro: {
      text: '"Eleven years on Six. Best hooker-on I had. Didn\'t drink." He looks at the tarp, and away. "His girl coughs. He asked me for day shifts so he could be home with her at night. I couldn\'t give him them; the night gang\'s short as it is." He says it as if somebody had asked him to justify it, and nobody had.',
      again: '"Best hooker-on I had."',
      effects: [{ learn: 'dk_dmytro_nights' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    order: {
      text: 'He unclips a sheet from the bottom of the stack and hands it to you without looking at it. NIGHT — GANG NINE — FIVE HANDS — BY ORDER. "Take it. I wrote the eight in, in pencil, when it came down. Then I crossed it out, because the clerk said."',
      again: '"I wrote the eight in. Then I crossed it out."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    order_no: {
      text: '"The order\'s guild paper." He clips the board shut. "You want guild paper, climb the Customs House steps and ask the Harbour Master for it."',
      again: '"Climb the steps and ask."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

// ---------------------------------------------------------------- Oksana Lysenko, the widow; the tin

/** What the widow keeps on the shelf over her girl's cot: given, taken, or shown up by the tape. */
const TIN: Effect[] = [{ give: 'k_dk_tin' }, { lead: 'l_dk_key' }, { lead: 'l_dk_medicine' }, { set: 'dk_tin_had' }];

export const d_dk_oksana: DialogueDef = {
  id: 'd_dk_oksana', owner: OKSANA,
  start: [{ if: F('dk_oksana_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman on the fish steps with a short knife and a basket of mullet, gutting without looking at her hands. She does not stop when you speak to her. "If you\'re from the guild, say so. If you\'re from the Bond, go away."',
      again: 'Oksana on the fish steps, gutting.',
      effects: [{ set: 'dk_oksana_met' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin sits down on the step below her without asking, takes a mullet out of the basket and starts gutting it, badly. Oksana watches her ruin it, and something in her face lets go a little. "Not like that," she says. "Like this."', effects: [A(TAMSIN, 2), T(OKSANA, 5)] }],
      options: [
        { id: 'dk.ok.sorry', text: 'I\'m sorry about Dmytro.', once: true, next: 'sorry' },
        { id: 'dk.ok.zoya', text: 'Who\'s Zoya?', once: true, next: 'zoya' },
        { id: 'dk.ok.night', text: 'What did he do on the night gang?', once: true, next: 'night' },
        bye,
      ],
    },
    again: {
      text: [
        { if: STOOD, text: '"The Concern paid." Oksana does not look up from the knife. "Through the guild, in an envelope, with nothing written on it. Nobody said sorry. I didn\'t want them to." She guts a fish. "He\'s under the Star. Zoya chose the place."' },
        { if: CRANE('bond'), text: '"They said his name on the steps." She guts a fish. "The man who sold the cutout." Another. "Zoya breathes over a kettle now, with a towel on her head. The Bond doesn\'t pay the dead." She does not say it to you as an accusation. She says it to the fish.' },
        { if: CRANE('gang'), text: '"The guild paid for the funeral. He\'s under the Star." She looks at you once, sideways. "They think the guild killed him." She goes back to the fish. "Let them."' },
        { if: ANY(CRANE('guild'), CRANE('bought'), F('dk_black', 'broken')), text: '"We\'ve moved down to the Hulls," Oksana says. "Kobby had a cabin on the Star." She guts a fish. "The box is cheaper than the Boxes."' },
        { text: 'Oksana on the fish steps, gutting.' },
      ],
      again: 'Oksana, gutting.',
      options: [
        { id: 'dk.ok.sorry2', text: 'I\'m sorry about Dmytro.', if: NOT(SEEN('dk.ok.sorry')), once: true, next: 'sorry' },
        { id: 'dk.ok.zoya2', text: 'Who\'s Zoya?', if: NOT(SEEN('dk.ok.zoya')), once: true, next: 'zoya' },
        { id: 'dk.ok.night2', text: 'What did he do on the night gang?', if: NOT(SEEN('dk.ok.night')), once: true, next: 'night' },
        { id: 'dk.ok.medicine', text: 'Where did Zoya\'s medicine come from?', if: ALL(CRANE_OPEN, NOT(F('dk_tin_had')), ANY({ knows: 'dk_zoya_breathes' }, { knows: 'dk_medicine_heard' }, { knows: 'dk_inhalers_heard' })), check: { skill: 'speech', dc: 35, mods: [
          { if: { trust: { npc: OKSANA, gte: 10 } }, dc: -10, why: 'she has decided you are not the guild' },
          { if: IN(ASH), dc: -5, why: 'Ash is there, and she has told him where she wants him buried' },
          { if: { knows: 'dk_inhalers_heard' }, dc: -5, why: 'you know the night gang had blue caps' },
        ] }, effects: [...TIN, T(OKSANA, 10)], next: 'tin', fail: 'tin_no' },
        { id: 'dk.ok.tape', text: '(Show her the load tape: KEY 6/N.)', if: ALL(CRANE_OPEN, NOT(F('dk_tin_had')), { item: 'k_dk_tape' }), effects: [...TIN, { learn: 'dk_paid' }], next: 'tape' },
        { id: 'dk.ok.inhaler', text: '(Give her a blue inhaler for Zoya.)', if: { item: 'c_dk_inhaler' }, once: true, effects: [{ take: 'c_dk_inhaler' }, T(OKSANA, 15), { memory: { npc: OKSANA, tag: 'gave_zoya_air', valence: 30, strength: 70 } }, A(TAMSIN, 3), A(ASH, 2)], next: 'inhaler' },
        bye,
      ],
    },
    sorry: {
      text: '"Everybody\'s sorry. The guild\'s sorry, on a board." She guts a fish. "No tally. You know what a funeral is without a tally? It\'s the Basin. They put you in off the fish steps with a bar of iron through your belt, and Grigor gives you a day\'s fish in your hand, and that\'s you."',
      again: '"The Basin, with a bar of iron through your belt."',
      interject: [{ companion: ASH, text: 'Ash crouches beside her on the step. "Where do you want him?" he asks. "Not where they\'ll put him. Where you want him." The knife stops. "The Hulls," she says, after a while. "Under the Star. His mother\'s there."', effects: [A(ASH, 3), T(OKSANA, 5)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    zoya: {
      text: '"My girl. Eight." She points the knife up at the Boxes without looking. "Her lungs are bad. The Boxes are wet and the Basin\'s diesel; half the children in the Boxes cough." The knife comes down again. "She breathes now. She didn\'t, a year ago." Then she stops, as if she has said something she did not mean to, and says nothing else.',
      again: '"She breathes now. She didn\'t, a year ago."',
      effects: [{ learn: 'dk_zoya_breathes' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    night: {
      text: '"Hooked on. He was the one on the deck who says when." She guts a fish. "He came home at four. Every night, four." The knife slows. "Some nights he came home with medicine." It stops. She looks at the fish in her hand as if she does not know what it is.',
      again: '"Some nights he came home with medicine."',
      effects: [{ learn: 'dk_medicine_heard' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    tin: {
      text: 'She wipes the knife on her apron, slowly, both sides, and puts it down on the step. Then she goes up into the Boxes, and comes back with a tobacco tin with the paint worn off it by a thumb, and puts it in your hand without opening it. "He kept it on the shelf over Zoya\'s cot. I never opened it." She sits down and picks up the knife. "I knew what was in it."',
      again: 'The tin, in your hand.',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    tin_no: {
      text: '"Get away from me," she says, very quietly, and goes on gutting.',
      again: '"Get away from me."',
      options: [bye],
    },
    tape: {
      text: 'She reads it twice, her lips moving. KEY 6/N — OVERRIDE. Then she puts the knife down. "He cut a key," she says. "He sat up at the table with a file, three nights, and Zoya asked what he was making and he said a present." She goes up into the Boxes and comes back with a tobacco tin and puts it in your hand. "The Bond\'s man gave him a card for the gate, and the blue caps, a box a week. For turning a key when he was told." She looks at the tarp. "He was told."',
      again: '"For turning a key when he was told."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    inhaler: {
      text: 'She looks at the blue cap in your hand, and then at you, and takes it in both hands, as if it were warm. She does not say thank you. She puts it in her apron and goes back to the fish, and her hands are not quite steady for a while.',
      again: 'Oksana, gutting, steadier.',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

/** Oksana's box: a shelf over a child's cot, with a tin on it. */
export const d_dk_tin: DialogueDef = {
  id: 'd_dk_tin', owner: 'narrator',
  start: [{ if: F('dk_tin_had'), node: 'empty' }, { node: 'shelf' }],
  nodes: {
    shelf: {
      text: 'Oksana\'s box: two cots, a curtain, a stove made from a drum, and on a shelf over the smaller cot a tobacco tin with the paint worn off it, next to a child\'s drawing of a crane with a box hanging from it. On the cot a girl of eight sleeps with her mouth open, and every breath she takes has a whistle at the end of it.',
      again: 'The shelf, the tin, the girl breathing.',
      options: [
        { id: 'dk.tin.take', text: '(Take the tin without waking her.)', if: CRANE_OPEN, check: { skill: 'stealth', dc: 30 }, effects: TIN, failEffects: [T(OKSANA, -20), { memory: { npc: OKSANA, tag: 'robbed_her_box', valence: -40, strength: 80 } }], next: 'taken', fail: 'woke' },
        leave,
      ],
    },
    taken: {
      text: 'The tin is light in your hand. The girl turns over and the whistle goes on. Inside, without your having to open it, something rattles: metal, and plastic, and card.',
      again: 'The tin, light in your hand.',
      options: [{ text: '(Go.)', exit: true }],
    },
    woke: {
      text: 'The girl\'s eyes open and look at your hand on the shelf. She does not scream. She just watches you, breathing her whistle, until you put the tin back. Her mother will know by evening.',
      again: 'The girl\'s eyes on your hand.',
      options: [{ text: '(Go.)', exit: true }],
    },
    empty: {
      text: 'The shelf over the cot, the child\'s drawing of a crane, and a clean square in the dust where a tin was.',
      again: 'The clean square in the dust.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the weighbridge, Tomas Hruska

export const d_dk_weighbridge: DialogueDef = {
  id: 'd_dk_weighbridge', owner: 'narrator', start: [{ node: 'plate' }],
  nodes: {
    plate: {
      text: [
        { if: F('dk_weighbridge', 'on'), text: 'The weighbridge: a steel plate let into the quay in front of the guild\'s floor, and on it, as you watch, a Concern box from the through sitting under its seal while the needle in the hut swings and settles and Tomas Hruska writes a number beside it, carefully, with his tongue between his teeth, as if it were the first number he had ever been allowed to write.' },
        { text: 'The weighbridge: a steel plate let into the quay in front of the guild\'s floor, with a hut beside it where a needle on a dial waits to be asked something. Carts and timber go over the plate and get a number. A painted line round it says ALL FREIGHT. A second painted line, newer, cuts the corner off it for a track that runs from the yard throat to the Bond without touching the plate.' },
      ],
      again: 'The plate, the needle, the line that cuts its corner.',
      effects: [{ learn: 'dk_weighbridge_seen' }],
      options: [
        { id: 'dk.weigh.register', text: '(Read the register on the hut\'s table.)', next: 'register' },
        leave,
      ],
    },
    register: {
      text: 'A register as thick as a family Bible, ruled by hand: date, time, what, how heavy, dues. Every page the same for the night columns: a row of seal numbers off the through, and beside each, in the same patient hand, NOT WEIGHED — THROUGH PATH — BY ORDER. You turn back a year. Two. The first one is two years ago this spring, and somebody has underlined it.',
      again: 'NOT WEIGHED — THROUGH PATH — BY ORDER, for two years.',
      effects: [{ lead: 'l_dk_unweighed' }],
      options: [leave],
    },
  },
};

export const d_dk_tomas: DialogueDef = {
  id: 'd_dk_tomas', owner: 'npc_dk_13',
  start: [{ if: F('dk_tomas_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in the weigh hut with ink on his cuffs and a grey moustache he chews when he is thinking. "Hruska. The plate, and the floor\'s counter: rope, lamps, wire, guild prices. Everything on the plate gets a number." He pauses. "Nearly everything."',
      again: 'Hruska, at the needle.',
      effects: [{ set: 'dk_tomas_met' }],
      options: [
        { id: 'dk.tomas.trade', text: 'Show me the counter.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.tomas.through', text: 'Do you weigh the through?', once: true, next: 'through' },
        bye,
      ],
    },
    again: {
      text: [
        { if: F('dk_weighbridge', 'on'), text: '"Everything on the plate gets a number," Hruska says. "Everything." He says the second one as if he had been saving it.' },
        { text: 'Hruska, at the needle.' },
      ],
      again: 'Hruska, at the needle.',
      options: [
        { id: 'dk.tomas.trade2', text: 'Show me the counter.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.tomas.through2', text: 'Do you weigh the through?', if: NOT(SEEN('dk.tomas.through')), once: true, next: 'through' },
        { id: 'dk.tomas.tape', text: '(Show him the load tape from Six\'s cab.)', if: ALL({ item: 'k_dk_tape' }, NOT({ lead: 'l_dk_tape' })), effects: [{ lead: 'l_dk_tape' }], next: 'tape' },
        { id: 'dk.tomas.slip', text: '(Show him the Concern\'s loading slip.)', if: ALL({ item: 'k_dk_slip' }, NOT(SEEN('dk.tomas.slip'))), effects: [{ learn: 'dk_skim' }], next: 'slip' },
        bye,
      ],
    },
    through: {
      text: '"No." He says it at once, the way people answer a question they have been waiting two years for. "By order. Through freight goes from the throat to the Bond on its own track and never touches my plate: THROUGH PATH, the order says, the contract says, the through doesn\'t stop. I write it every night. The seal numbers, and beside every one, NOT WEIGHED." He opens the register for you at today. "Somebody might read it one day. Read it."',
      again: '"I write it every night. NOT WEIGHED."',
      effects: [{ lead: 'l_dk_unweighed' }],
      interject: [{ companion: NINE, text: '"A register that records its own blindness," Nine says, reading over his shoulder. "Two years of true statements that nothing was measured." It straightens. "The record suggests this man has been waiting for an auditor." Hruska looks at the lens as if he might cry.', effects: [A(NINE, 3)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    tape: {
      text: 'He holds it to the light over the needle and reads it the way you would read a letter. "Thirty-one two. Overload, cutout. Then the key: six stroke N, override. Then the spreader\'s lock fault." He puts it down. "Six refused it. Somebody told her not to."',
      again: '"Six refused it. Somebody told her not to."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    slip: {
      text: 'He reads it twice, chewing the moustache. "Thirty-one four. On a bill of fourteen." He opens the register at the same night and puts his finger on the seal number, NOT WEIGHED, and leaves it there. "And the next box, and the next. Two years." He looks up. "The guild bills freight by the ton. The Concern\'s been paying for half of what it ships, on my plate, and I\'ve been writing it down."',
      again: '"Two years. I\'ve been writing it down."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

// ---------------------------------------------------------------- Lucien Roux and the Bond

const GIRL_FREE_GOOD: Effect[] = [A(KES, 5), A(TAMSIN, 5), A(WREN, 5)];

export const d_dk_roux: DialogueDef = {
  id: 'd_dk_roux', owner: ROUX,
  start: [{ if: F('dk_roux_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in the Concern\'s grey at a clean desk in a clean office, who stands up when you come in, which nobody on the quay does for anybody. "Lucien Roux. I keep the Bond." He gestures at the chair; it is a good chair. "Everything inside the fence is under bond: sealed at Two-Twelve, unsealed by its consignee. I keep it whole between. It is a simple job done exactly, and I find that restful."',
      again: 'Roux, at the clean desk.',
      effects: [{ set: 'dk_roux_met' }],
      interject: [{ companion: KES, text: 'Kes does not sit. "Contract citizen," she says to you, not to him. "See the cuffs? Printed. They make those in Halcyon." Roux smiles at her as if she had paid him a compliment. "And you were Skirts," he says. "I can always tell. It\'s the way you look at the lights."' }],
      options: [
        { id: 'dk.roux.box', text: 'The box that fell from Six.', once: true, next: 'box' },
        { id: 'dk.roux.notice', text: 'Your notice about a returnable.', once: true, next: 'notice' },
        { id: 'dk.roux.who', text: 'Who are the boxes for?', once: true, next: 'who' },
        bye,
      ],
    },
    again: {
      text: [
        { if: ALL(CRANE('bond'), NOT(STOOD)), text: '"You cost the Concern a great deal of money," Roux says pleasantly, writing. "Two years of back-freight, and a weighbridge. I\'m to go back to Two-Twelve at the end of the season and explain it." He blots the line. "I shall say the quay had a good lawyer."' },
        { if: STOOD, text: '"The Stand." Roux says the word as if he were tasting it. "I didn\'t know they had it in them. Neither did they. It\'s an expensive thing to learn, for everybody."' },
        { if: CRANE('bought'), text: '"A pleasure, as ever." Roux does not look up. "Your papers are quite safe."' },
        { text: 'Roux, at the clean desk. "Shall we keep this pleasant? It costs nothing."' },
      ],
      again: 'Roux, at the clean desk.',
      options: [
        { id: 'dk.roux.box2', text: 'The box that fell from Six.', if: NOT(SEEN('dk.roux.box')), once: true, next: 'box' },
        { id: 'dk.roux.notice2', text: 'Your notice about a returnable.', if: ALL(GIRL_OPEN, NOT(SEEN('dk.roux.notice'))), once: true, next: 'notice' },
        { id: 'dk.roux.who2', text: 'Who are the boxes for?', if: NOT(SEEN('dk.roux.who')), once: true, next: 'who' },
        { id: 'dk.roux.offer', text: '(Lay what you\'ve found on his desk.)', if: ALL(CRANE_OPEN, ANY({ item: 'k_dk_tin' }, { item: 'k_dk_slip' }, TRUTH)), next: 'offer' },
        { id: 'dk.roux.girl.return', text: '(Tell him where the girl is, for the sixty.)', if: ALL(GIRL_OPEN, F('dk_mirela_met')), next: 'return' },
        { id: 'dk.roux.girl.price', text: 'What would the girl\'s paper cost to discharge?', if: ALL(GIRL_OPEN, F('dk_mirela_met')), next: 'price' },
        bye,
      ],
    },
    box: {
      text: '"A regrettable lift." He folds his hands. "The box was sealed and remains sealed. Its contents are its consignee\'s affair; its freight is the guild\'s affair; the guild\'s cranes are the guild\'s affair. The Bond\'s interest ends at the fence." He smiles. "I sent the widow a little something. One does."',
      again: '"The Bond\'s interest ends at the fence."',
      effects: [{ learn: 'dk_roux_box' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    notice: {
      text: '"One of our sureties came west in a box she should not have been in." He says it as if a crate of tins had gone astray. "A minor under contract, on her mother\'s, from the terraces. A returnable: a surety goes back to its contract when the contract\'s behind. Sixty to whoever brings her to the fence, no questions asked, and she goes home on the through, the way she came but in the coach." He considers. "Well. In a box. But a clean one."',
      again: '"Sixty, no questions; she goes home on the through."',
      effects: [{ lead: 'l_dk_returnable' }, { quest: 'q_dk_girl', start: true }],
      interject: [{ companion: WREN, text: 'Wren has gone very still. "A box," she says. "For a girl." She looks at Roux the way she looks at a road with riders on it.' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    who: {
      text: '"The consignee, which on the westbound through is mostly the Crown." He ticks them off on clean fingers. "Chrome, for the houses that can afford to have it fitted. Medicine. Copper, for terraces. Controllers." He spreads his hands. "The Crown is a very good customer, and the Line is the only road the Crown has to us. Until it builds its own."',
      again: '"The Crown is a very good customer."',
      effects: [{ learn: 'dk_bond_crown' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    offer: {
      text: 'He looks at what you put on his desk without touching it, the way a man looks at a hand of cards he has already seen. "You\'ll want to take this to the Harbour court," he says, "and she\'ll rule, because she always rules. The guild will bill us two years of back-freight and win, the dockers will learn that one of their own sold a cutout, and the widow will be the widow of a thief." He opens a drawer. "Who is better off? A hundred and fifty, and the papers stay in my drawer. The widow is not forgotten. The Bond can be generous where it is not obliged."',
      again: '"A hundred and fifty, and the papers stay in my drawer."',
      interject: [{ companion: ODILE, text: 'Odile reads the slip upside down across the desk. "Thirty-one on fourteen," she says, "for two years. He is offering you a hundred and fifty against a bill of several thousand." She looks at Roux almost fondly. "That is not a bribe. It is a discount."', effects: [A(ODILE, 1)] }],
      options: [
        { id: 'dk.roux.take', text: '(Take the hundred and fifty.)', effects: [
          { take: 'k_dk_tin' }, { take: 'k_dk_slip' }, { give: 'tolls', count: 150 }, { set: 'dk_crane', value: 'bought' }, { set: 'dk_stand', value: 'quiet' },
          { rep: { faction: 'concern', respect: 5 } }, A(WREN, -10), A(TAMSIN, -10), A(ASH, -10), A(KES, -10), A(NINE, -3), { xp: 100 },
          DEC('dk_crane', 'Lucien Roux paid you a hundred and fifty for what you had found about Crane Six, and it stayed in his drawer.'),
        ], next: 'took' },
        { id: 'dk.roux.widow', text: 'Pay the widow what you\'d pay me, and keep your papers.', check: { skill: 'speech', dc: 40, mods: [{ if: IN(ODILE), dc: -10, why: 'Odile names a figure first' }] }, effects: [
          { take: 'k_dk_tin' }, { take: 'k_dk_slip' }, { set: 'dk_crane', value: 'bought' }, { set: 'dk_widow_paid' }, { set: 'dk_stand', value: 'quiet' },
          T(OKSANA, 10), A(WREN, -5), A(TAMSIN, -3), A(ASH, -3), A(KES, -5), { xp: 100 },
          DEC('dk_crane', 'You let Lucien Roux keep what you had found about Crane Six in his drawer, for the price of it paid to Dmytro\'s widow.'),
        ], next: 'widow', fail: 'widow_no' },
        { id: 'dk.roux.no', text: 'No.', next: 'refused' },
      ],
    },
    took: {
      text: 'He counts it out on the desk in new Tolls, squares the stack and pushes it across, and puts your papers in the drawer, and locks it, and puts the key in his waistcoat. "A pleasure," he says, and means it.',
      again: '"A pleasure."',
      options: [bye],
    },
    widow: {
      text: 'He looks at you with real interest for the first time. "How unusual." He writes a chit, signs it, and blots it. "A hundred and fifty to the widow Lysenko, from the Bond, for her loss, through the guild\'s floor. She\'ll think it\'s the guild\'s conscience." He puts your papers in the drawer. "Let her."',
      again: '"She\'ll think it\'s the guild\'s conscience."',
      options: [bye],
    },
    widow_no: {
      text: '"No, I don\'t think so." He closes the drawer. "Generosity is a thing I offer. It is not a thing I\'m told."',
      again: '"Generosity is a thing I offer."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    refused: {
      text: '"Pity." He means that, too. "Take it to the steps, then. She\'ll rule." He goes back to his ledger.',
      again: '"Pity."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    return: {
      text: '"Ah." He writes something down. "At the back of the cookshop, I expect. They always choose the cookshop." He counts sixty onto the desk. "My men will collect her tonight, quietly; nobody need see anything. She goes east on the through at two." He pushes the coins across. "Thank you. People think the Concern is cruel. It is only exact."',
      again: '"She goes east on the through at two."',
      options: [
        { id: 'dk.roux.return.take', text: '(Take the sixty.)', effects: [
          { give: 'tolls', count: 60 }, { set: 'dk_girl', value: 'returned' }, { rep: { faction: 'concern', respect: 5 } },
          A(KES, -20), A(TAMSIN, -15), A(WREN, -20), A(ASH, -10), A(NINE, -3), { trust: { npc: 'npc_dk_11', by: -30 } }, { xp: 50 },
          DEC('dk_girl', 'You told the Concern\'s bond officer where Mirela Stan was hiding, for sixty Tolls.'),
        ], next: 'returned' },
        { id: 'dk.roux.return.no', text: 'Keep your money.', next: 'again' },
      ],
    },
    returned: {
      text: 'You take it. Roux has already gone back to his ledger, and does not see you go.',
      again: 'Roux\'s ledger.',
      options: [bye],
    },
    price: {
      text: '"A surety is valued at the outstanding balance of the contract it secures." He does not need to look it up. "A hundred and fifty, in her case. Paid, the surety is discharged and the contract stands whole: her mother keeps her terrace, and the girl is nobody\'s." He tilts his head. "It is an unusual way to spend money. I find I approve of it."',
      again: '"A hundred and fifty. Paid, the girl is nobody\'s."',
      options: [
        { id: 'dk.roux.buy150', text: '(Pay a hundred and fifty.)', if: TOLLS(150), effects: [{ take: 'tolls', count: 150 }], next: 'discharged' },
        { id: 'dk.roux.buy.talk', text: 'That balance is padded.', once: true, check: { skill: 'barter', dc: 50, mods: [{ if: IN(ODILE), dc: -15, why: 'Odile does the arithmetic of a discharge out loud' }, { if: SKIM, dc: -10, why: 'you know what his boxes really weigh, and he knows you know' }] }, next: 'price90', fail: 'price_no' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    price90: {
      text: 'He looks at you for a moment, and laughs, quietly, through his nose. "Ninety," he says. "The terraces\' interest is somewhat aggressive. I\'ll write it down."',
      again: '"Ninety."',
      options: [
        { id: 'dk.roux.buy90', text: '(Pay ninety.)', if: TOLLS(90), effects: [{ take: 'tolls', count: 90 }], next: 'discharged' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    price_no: {
      text: '"The balance is the balance." He smiles. "I didn\'t set the terraces\' interest. I only read it."',
      again: '"The balance is the balance."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    discharged: {
      text: 'He takes the money, writes DISCHARGED across a copy of the girl\'s paper in the Concern\'s clean hand, and blots it, and gives it to you. "Her mother\'s contract is whole. The surety is nobody\'s." He looks at the copy as you fold it. "Tell her to burn the other one. Paper has a way of being found."',
      again: '"Tell her to burn the other one."',
      options: [{ id: 'dk.roux.discharged', text: '(Take it to her.)', effects: [
        { set: 'dk_girl', value: 'bought' }, ...GIRL_FREE_GOOD, A(ODILE, 3), { trust: { npc: 'npc_dk_11', by: 20 } }, { xp: 150 },
        DEC('dk_girl', 'You bought Mirela Stan\'s surety off the Concern\'s Bond; her mother\'s contract stood whole and the girl was nobody\'s.'),
        NEWS('dk_girl_bought', 'somebody bought a runaway surety\'s paper off the Concern at the Docks and the girl stayed on the quay', 2, 3),
      ], exit: true }],
    },
  },
};

export const d_dk_bond_desk: DialogueDef = {
  id: 'd_dk_bond_desk', owner: 'narrator',
  start: [{ if: F('dk_slip_taken'), node: 'empty' }, { if: { hour: { from: 21, to: 6 } }, node: 'night' }, { node: 'day' }],
  nodes: {
    day: {
      text: 'Roux\'s desk, clean as a plate, and Roux behind it, or his guard in front of it. Not by day.',
      again: 'Roux\'s desk. Not by day.',
      options: [leave],
    },
    night: {
      text: 'The Bond at night: every light on, the boxes\' shadows hard as walls, one guard at the gate with his back to the yard and the office dark. The office door is shut and not locked. The desk\'s drawers are.',
      again: 'The dark office, the locked drawers.',
      options: [
        { id: 'dk.desk.pick', text: '(Pick the drawer.)', check: { skill: 'security', dc: 45, mods: [{ if: { item: 't_picks' }, dc: -5, why: 'proper picks' }] }, effects: [{ give: 'k_dk_slip' }, { lead: 'l_dk_slip' }, { set: 'dk_slip_taken' }, { xp: 50 }], next: 'slip', fail: 'caught' },
        leave,
      ],
    },
    slip: {
      text: 'Loading slips, filed by through and by night, in a stack as square as a brick. You take the top pair: BOX 7-2390 — CAST COPPER, INGOT — 31.4 T — SEALED, from Two-Twelve, and clipped behind it the guild\'s freight bill for the same seal: MACHINE PARTS — 14.0 T. Under it, a hundred more pairs, and every one of them says two things.',
      again: 'Two weights for one seal, a hundred times.',
      options: [{ text: '(Go.)', exit: true }],
    },
    caught: {
      text: 'A light in your face. The guard from the gate, not hurrying, with his pistol at his side. "Under bond," he says, as if it were a reason, which here it is. "Hands where I like them."',
      again: '"Under bond."',
      options: [
        { id: 'dk.desk.talk', text: 'I was looking for the girl you lost. I thought she might be in here.', check: { skill: 'speech', dc: 40 }, next: 'let_go', fail: 'barred' },
        { id: 'dk.desk.run', text: '(Run for the gate.)', check: { attr: 'reflex', dc: 7 }, effects: [{ set: 'dk_bond_barred' }, { rep: { faction: 'concern', respect: -10 } }], next: 'ran', fail: 'barred' },
        { id: 'dk.desk.fight', text: '(Fight.)', effects: [{ set: 'dk_bond_fight' }, { rep: { faction: 'concern', respect: -20 } }, { event: 'combat' }], exit: true },
      ],
    },
    let_go: {
      text: 'He looks at you for a long time. "She isn\'t," he says at last, and walks you to the gate, and does not mention it to anyone, which tells you something about how much the Bond\'s guards like the Bond.',
      again: '"She isn\'t."',
      options: [{ text: '(Go.)', exit: true }],
    },
    ran: {
      text: 'You are through the gate and into the dark between the Boxes before he has finished saying stop. Behind you the Bond\'s lights do not change at all. In the morning there is a new notice on the gate with a good likeness of you on it.',
      again: 'A likeness of you on the Bond\'s gate.',
      options: [{ text: '(Go.)', exit: true }],
    },
    barred: {
      text: 'He walks you to the gate with the pistol in your back and puts you out on the quay. "Don\'t come inside the line again," he says. By morning there is a likeness of you pinned to the gate.',
      effects: [{ set: 'dk_bond_barred' }, { rep: { faction: 'concern', respect: -5 } }],
      again: 'Put out at the gate.',
      options: [{ text: '(Go.)', exit: true }],
    },
    empty: {
      text: 'Roux\'s drawer. The lock is new.',
      again: 'A new lock.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Factor Henrike Dahl and the Harbour court

const EV = (id: string, text: string, flag: string, cond: Cond): OptionDef => ({ id, text, if: ALL(cond, NOT(F(flag))), effects: [{ set: flag }], next: `ev_${flag}` });
const COURT_SITS: Effect[] = [{ until: 18 }, { learn: 'dk_court_sat' }];

/** The court rules on Crane Six: the whole of it, at the Bond's pay. */
const RULED_BOND: Effect[] = [
  { set: 'dk_crane', value: 'bond' }, { set: 'dk_weighbridge', value: 'on' }, { set: 'dk_concern_billed' }, { set: 'dk_stand', value: 'quiet' },
  { rep: { faction: 'tollmen', respect: 5 } }, { rep: { faction: 'concern', respect: -10 } }, T(CONNIE, 5), A(NINE, 5), A(ODILE, 3), A(KES, 3), { xp: 300 },
  DEC('dk_crane', 'You laid the whole of Crane Six before the Harbour court: Dmytro Lysenko had overridden the cutout at the Bond\'s pay, and the guild\'s weighbridge had been blind to the through for two years. Every Concern box goes over the plate now.'),
  NEWS('dk_crane_bond', 'the Harbour court at the Docks found the Concern\'s Bond paid a docker to switch off a crane\'s cutout; every through box is weighed now', 3, 7),
];
/** The court rules on the short gang: the negligence struck, the master's fault. */
const RULED_GANG: Effect[] = [
  { set: 'dk_crane', value: 'gang' }, { set: 'dk_buried', value: 'guild' }, { set: 'dk_complement' }, { set: 'dk_stand', value: 'quiet' },
  { rep: { faction: 'tollmen', respect: -5 } }, T(CONNIE, 20), T(OKSANA, 10), A(WREN, 3), A(TAMSIN, 3), { xp: 250 },
  DEC('dk_crane', 'You argued Gang Nine\'s appeal at the Harbour court on the short gang, and kept Dmytro\'s tin out of it. The negligence was struck and the guild paid for his funeral.'),
  NEWS('dk_crane_gang', 'the Harbour court at the Docks struck a dead docker\'s negligence: his gang had been worked short by the guild\'s own order', 3, 5),
];

export const d_dk_dahl: DialogueDef = {
  id: 'd_dk_dahl', owner: DAHL,
  start: [{ if: F('dk_dahl_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman at a desk under the only glazed window on the quay, writing in a ledger with a steel pen. She finishes the line before she looks up. "Henrike Dahl. Harbour Master, by the Act, for the guild, which holds the concession." She caps the pen. "You\'ll want something. Everyone who climbs my steps wants something. Say it plainly and I\'ll tell you plainly whether the Act gives it to you."',
      again: 'Factor Dahl, writing; she finishes the line before she looks up.',
      effects: [{ set: 'dk_dahl_met' }],
      interject: [{ companion: NINE, text: '"The Harbour Act of the old Port Authority," Nine says. "Still in force. Here the Ledger enforces the concession and nothing else; it cannot see past the dry river." Dahl looks at the cracked lens with professional interest. "It can see the dues," she says. "It always sees the dues."', effects: [A(NINE, 2)] }],
      options: [
        { id: 'dk.dahl.act', text: 'What is the Act?', once: true, next: 'act' },
        { id: 'dk.dahl.verdict', text: 'Gang Nine\'s verdict.', once: true, next: 'verdict' },
        { id: 'dk.dahl.court', text: 'How does a thing come before your court?', once: true, next: 'court_how' },
        bye,
      ],
    },
    again: {
      text: [
        { if: ALL(CRANE('black'), NOT(F('dk_black'))), text: '"The Stand has blacked the Bond, and the Bond has blacked me, and the through is standing at the throat costing the guild by the hour." Dahl does not look up. "I have sent to the Ring for hands. It\'s within the Act. So is a stoppage. The Act is not on anybody\'s side."' },
        { if: STOOD, text: '"The Concern settled." Dahl turns a page. "Through me, without admitting anything, at a figure I would not have got in court. Every box over the plate." She looks at you. "I don\'t like a stoppage. I like a quay that knows what it can do even less. It\'s bad for the dues."' },
        { text: 'Factor Dahl, writing; she finishes the line before she looks up.' },
      ],
      again: 'Factor Dahl, writing.',
      options: [
        { id: 'dk.dahl.call', text: 'I want to bring something before the court.', if: ANY(ALL(CRANE_OPEN, { knows: 'dk_box_read' }), ALL(GIRL_OPEN, F('dk_mirela_met')), ALL(HULLS_OPEN, F('dk_kobby_met'))), next: 'call' },
        { id: 'dk.dahl.private', text: '(Give her Dmytro\'s tin, here, with the door shut.)', if: ALL(CRANE_OPEN, { item: 'k_dk_tin' }), next: 'private' },
        { id: 'dk.dahl.act2', text: 'What is the Act?', if: NOT(SEEN('dk.dahl.act')), once: true, next: 'act' },
        { id: 'dk.dahl.verdict2', text: 'Gang Nine\'s verdict.', if: ALL(CRANE_OPEN, NOT(SEEN('dk.dahl.verdict'))), once: true, next: 'verdict' },
        { id: 'dk.dahl.court2', text: 'How does a thing come before your court?', if: NOT(SEEN('dk.dahl.court')), once: true, next: 'court_how' },
        { id: 'dk.dahl.hulls', text: 'The Hulls\' berths.', if: ALL({ knows: 'dk_hulls_seen' }, NOT(SEEN('dk.dahl.hulls'))), once: true, next: 'hulls' },
        { id: 'dk.dahl.girl', text: 'A girl off the through, who the Bond calls goods.', if: ALL(F('dk_mirela_met'), GIRL_OPEN, NOT(SEEN('dk.dahl.girl'))), once: true, next: 'girl' },
        bye,
      ],
    },
    act: {
      text: '"The Harbour Act: the old Port Authority\'s, from before the Burn." She taps the framed pages on the wall behind her without turning. "It gives the concession-holder the port: berths, dues, labour, order. The guild bought the concession from the city ninety years ago, and I keep it. Theft from the quay: the hook. A fight: a fine. A killing: the hook. A grievance: the steps, at the change of shift, before me, with the Act open on my knee." She uncaps the pen. "The Ledger enforces the concession. That is all it does here, and it does it perfectly."',
      again: '"Theft, the hook. A grievance, the steps."',
      effects: [{ learn: 'dk_act_heard' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    verdict: {
      text: '"Docker\'s negligence. The spreader\'s locks failed under a load, and the hooker-on said lift." She does not look at the window, where you can see Six. "The board says what the facts in front of me said. If there are other facts, bring them to the steps, and I\'ll hear Gang Nine\'s appeal whenever somebody stands up with it." She writes a line. "I don\'t like a board that\'s wrong. It\'s bad for the dues."',
      again: '"Bring the facts to the steps."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    court_how: {
      text: '"At the change of shift, on the steps. You speak; whoever is party to it speaks; you put on the table what you have." She lays her pen flat. "I rule on what is on the table. Not on what anyone feels about it, including me. Especially me."',
      again: '"I rule on what is on the table."',
      effects: [{ learn: 'dk_court_how' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    hulls: {
      text: '"Idle berths. Section forty-one lets the concession lease idle berths for works, and House Vane pays four hundred a year for them. The occupiers quit on commencement." She does not blink. "There is nothing in the Act about people living on a riverbed. There wasn\'t a riverbed when it was written."',
      again: '"Idle berths. Section forty-one."',
      effects: [{ lead: 'l_dk_lease' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    girl: {
      text: '"If she is goods under bond, she is the Bond\'s, and my writ stops at the fence." Dahl turns the pen in her fingers. "If she is a person landed on my quay, she is a passenger, and she owes her fare. The Act\'s schedule of goods doesn\'t list persons. Nobody has ever asked me to read it that way." She looks at you. "Ask me on the steps, and I\'ll read it."',
      again: '"Ask me on the steps."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    private: {
      text: 'She opens the tin and looks at the key, the blue caps, the white card, for a long time, and closes it. "Thank you." She means it. "This stays in this room. The board stays as it is: the board was right, and a guild does not publish that its own weighbridge has been blind for two years. The Concern will receive a bill." She counts a hundred out of a drawer. "A finder\'s fee. The Act allows one."',
      again: '"This stays in this room."',
      options: [
        { id: 'dk.dahl.private.take', text: '(Take the fee.)', effects: [
          { take: 'k_dk_tin' }, { give: 'tolls', count: 100 }, { set: 'dk_crane', value: 'guild' }, { set: 'dk_concern_billed' }, { set: 'dk_stand', value: 'quiet' },
          { rep: { faction: 'tollmen', respect: 10 } }, A(WREN, -5), A(ASH, -10), A(TAMSIN, -5), A(ODILE, 3), { xp: 100 },
          DEC('dk_crane', 'You gave the Harbour Master Dmytro Lysenko\'s tin in private. The guild billed the Concern quietly; the tally board still says docker\'s negligence.'),
          NEWS('dk_crane_guild', 'the guild sent the Concern\'s Bond at the Docks a bill nobody will talk about', 0, 3),
        ], next: 'private_done' },
        { id: 'dk.dahl.private.steps', text: 'No. The steps.', next: 'call' },
      ],
    },
    private_done: {
      text: 'She writes in the ledger with the steel pen, and the tin goes into a drawer under it. "Gang Nine can stand on the line again in a season, when it has learned its business," she says, without looking up. "Good day."',
      again: '"Good day."',
      options: [bye],
    },
    call: {
      text: '"Which?" She picks up the pen. "The steps at the change of shift. Six o\'clock."',
      again: '"Which?"',
      options: [
        { id: 'dk.call.crane', text: 'Gang Nine\'s appeal.', if: ALL(CRANE_OPEN, { knows: 'dk_box_read' }), effects: COURT_SITS, next: 'c_open' },
        { id: 'dk.call.girl', text: 'Mirela Stan: a girl the Bond calls goods.', if: ALL(GIRL_OPEN, F('dk_mirela_met')), effects: COURT_SITS, next: 'g_open' },
        { id: 'dk.call.hulls', text: 'The Hulls\' berths.', if: ALL(HULLS_OPEN, F('dk_kobby_met')), effects: COURT_SITS, next: 'h_open' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    // ---------------------------------------------------------------- Crane Six before the court
    c_open: {
      speaker: 'narrator',
      text: 'Six o\'clock, the change of shift. The day gangs come off and the night gangs come on, and between them, for a quarter of an hour, the quay stops and climbs the Customs House steps to watch. Dahl sits at the top with the Act open on her knee. Constance stands with Gang Nine; Platt stands with his clipboard; Oksana stands at the back with her arms round herself. Roux has sent a clerk, who stands outside the line of the bottom step as if it were the Bond\'s fence. "Gang Nine\'s appeal," Dahl says. "Put on the table what you have."',
      again: '"Put on the table what you have."',
      options: [
        EV('dk.cev.box', '(The box: thirty tonnes of copper on a bill of fourteen.)', 'dk_ev_box', { lead: 'l_dk_box' }),
        EV('dk.cev.tape', '(The load tape from Six\'s cab.)', 'dk_ev_tape', { item: 'k_dk_tape' }),
        EV('dk.cev.order', '(Platt\'s order: five hands on a crane that wants eight.)', 'dk_ev_order', ANY({ item: 'k_dk_order' }, { lead: 'l_dk_short' })),
        EV('dk.cev.register', '(The weighbridge register: NOT WEIGHED, two years.)', 'dk_ev_register', { lead: 'l_dk_unweighed' }),
        EV('dk.cev.slip', '(The Concern\'s own loading slip.)', 'dk_ev_slip', { item: 'k_dk_slip' }),
        EV('dk.cev.tin', '(Dmytro\'s tin: the key, the caps, the Bond\'s pass.)', 'dk_ev_tin', { item: 'k_dk_tin' }),
        { id: 'dk.carg.bond', text: 'Dmytro turned the cutout himself, at the Bond\'s pay, so the Bond\'s boxes would never be weighed.', if: TRUTH, check: { skill: 'speech', dc: 45, mods: [
          { if: F('dk_ev_tin'), dc: -10, why: 'the key and the pass are on the table' },
          { if: F('dk_ev_tape'), dc: -10, why: 'the tape: KEY 6/N' },
          { if: F('dk_ev_slip'), dc: -15, why: 'the Concern\'s own slip: two weights for one seal' },
          { if: F('dk_ev_register'), dc: -5, why: 'the register: NOT WEIGHED' },
          { if: F('dk_ev_box'), dc: -5, why: 'the copper in the split' },
          { if: IN(ODILE), dc: -5, why: 'Odile reads the bill against the slip aloud' },
        ] }, effects: RULED_BOND, next: 'c_bond', fail: 'c_adjourn' },
        { id: 'dk.carg.gang', text: 'Nine was five where Six wants eight, by the guild\'s own order. A short gang is the master\'s fault, not the hand\'s.', if: ALL(NOT(F('dk_ev_tin')), ANY(F('dk_ev_order'), { lead: 'l_dk_short' })), check: { skill: 'speech', dc: 40, mods: [
          { if: F('dk_ev_order'), dc: -10, why: 'the order, with the eight crossed out in Platt\'s own hand' },
          { if: F('dk_ev_tape'), dc: -5, why: 'the tape shows the lift was too much for the gang to see' },
          { if: IN(NINE), dc: -5, why: 'Nine cites the Act\'s complement clause' },
        ] }, effects: RULED_GANG, next: 'c_gang', fail: 'c_adjourn' },
        { id: 'dk.carg.withdraw', text: '(Withdraw the appeal for now.)', next: 'c_withdraw' },
      ],
    },
    ev_dk_ev_box: { speaker: 'narrator', text: 'A docker carries a copper bar up the steps in both arms and puts it at Dahl\'s feet, and the stencil off the box\'s end after it: MACHINE PARTS — 14.0 T. Dahl looks from one to the other and writes a number.', again: 'The bar at Dahl\'s feet, and the stencil.', options: [{ text: '(Go on.)', next: 'c_open' }] },
    ev_dk_ev_tape: { speaker: 'narrator', text: 'Dahl reads the tape aloud, in her flat clear voice, the times and the codes: KEY 6/N — OVERRIDE. The steps go very quiet. At the side, without being asked, Platt pulls his key out on its chain and holds it up so that everybody can see it is on his neck.', again: 'KEY 6/N, and Platt\'s key held up on its chain.', options: [{ text: '(Go on.)', next: 'c_open' }] },
    ev_dk_ev_order: { speaker: 'narrator', text: 'Platt\'s order is read out: GANG NINE — FIVE HANDS — BY ORDER. Platt says, to nobody, "I wrote the eight in." The Harbour Master\'s clerk, beside Dahl, looks at his shoes.', again: '"I wrote the eight in."', options: [{ text: '(Go on.)', next: 'c_open' }] },
    ev_dk_ev_register: { speaker: 'narrator', text: 'Tomas Hruska comes up the steps with the register under his arm without being called, opens it at the place, and stands there holding it open until Dahl has read two years of NOT WEIGHED.', again: 'Hruska, holding the register open.', options: [{ text: '(Go on.)', next: 'c_open' }] },
    ev_dk_ev_slip: { speaker: 'narrator', text: 'Roux\'s clerk takes a step toward the line of the bottom step and stops himself. Dahl reads both weights, and the seal number on each, twice, and then a third time.', again: 'Two weights, one seal, read three times.', options: [{ text: '(Go on.)', next: 'c_open' }] },
    ev_dk_ev_tin: { speaker: 'narrator', text: 'The key cut by hand, the blue caps, the white card with the closed eye on it. Oksana makes a small sound at the back of the steps. Constance turns round and looks at her, and then does not.', again: 'The tin, open on the step.', options: [{ text: '(Go on.)', next: 'c_open' }] },
    c_bond: {
      speaker: DAHL,
      text: 'Dahl closes the Act on her knee. "Finding. The hooker-on Lysenko overrode Crane Six\'s cutout with a key he had cut, at the Bond\'s pay, to lift a box billed at less than half its weight. The spreader failed under the load the cutout was there to refuse. That is not negligence. It is a sale, and the seller is dead." She looks at the Bond\'s clerk below the line. "The Bond\'s fence stops my writ. It does not stop my weighbridge. From tonight every box off the through goes over the plate, and the guild will bill the Concern for two years of short weight." To Constance: "Gang Nine stands on the line from the next call-on." And to the steps: "A man who sold the cutout is owed no funeral tally by the Act." She waits. Nobody says anything at all.',
      again: '"A man who sold the cutout is owed no funeral tally."',
      interject: [{ companion: ASH, text: '"The court is right," Ash says, quietly, to you, "and it isn\'t enough. It never is." He is looking at Oksana.' }],
      options: [
        { id: 'dk.cbond.tally', text: '(Put thirty on the step for his funeral.)', if: TOLLS(30), effects: [{ take: 'tolls', count: 30 }, { set: 'dk_buried', value: 'paid' }, A(ASH, 5), T(OKSANA, 15)], next: 'c_bond_tally' },
        { id: 'dk.cbond.mercy', text: 'The Act gives the court relief for a dead hand\'s kin.', check: { skill: 'speech', dc: 50, mods: [{ if: IN(NINE), dc: -10, why: 'Nine has the clause: relief to dependants, at the court\'s discretion' }, { if: { knows: 'dk_act_read' }, dc: -5, why: 'you have read the Act' }] }, effects: [{ set: 'dk_buried', value: 'guild' }, A(ASH, 5), A(NINE, 2), T(OKSANA, 10)], next: 'c_bond_mercy', fail: 'c_bond_end' },
        { text: '(Leave the steps.)', exit: true },
      ],
    },
    c_bond_tally: {
      speaker: 'narrator',
      text: 'You put thirty on the step. Oksana comes up from the back and picks it up and holds it and does not look at you. He goes under the Star in the morning, from the Hulls, the river people\'s way, with the whole night gang standing on the wall above with their hats off.',
      again: 'He went under the Star, with the night gang on the wall.',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    c_bond_mercy: {
      speaker: 'narrator',
      text: 'Dahl turns three pages. "Relief to the dependants of a hand dead in the port\'s service, at the court\'s discretion." She reads the clause for a long time. "He was in the port\'s service when he died, whatever else he was doing in it." A funeral tally from the guild\'s box. Oksana does not look up.',
      again: 'A funeral tally from the guild\'s box.',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    c_bond_end: {
      speaker: 'narrator',
      text: '"The Act says what it says." Dahl closes it. The court rises; the shift changes; the quay goes back to work. Oksana is the last off the steps.',
      again: 'The court risen, Oksana last off the steps.',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    c_gang: {
      speaker: DAHL,
      text: 'Dahl reads the order twice. "Finding. Crane Six was worked five hands where its complement is eight, by the master\'s order. Under the Act a gang below complement is the master\'s charge, and what befalls it is the master\'s fault, not the hand\'s." The steps breathe out. "The negligence is struck. Gang Nine stands on the line from the next call-on, and the guild pays the funeral tally." She closes the Act. "And from tonight Six works at complement, through or no through, and the guild will argue its demurrage with the Concern." Constance is looking at you. So is Oksana, from the back of the steps; and Oksana looks away first.',
      again: '"The negligence is struck."',
      interject: [{ companion: NINE, if: TRUTH, text: 'Nine says nothing at all on the steps. Afterwards, walking away, it says: "The record of this hearing is true in every line and false in its sum. I have filed a great many like it." It does not say whether that is a complaint.', effects: [A(NINE, -3)] }],
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    c_adjourn: {
      speaker: DAHL,
      text: '"Not enough." Dahl closes the Act. "I have a box, a dead man and a quarrel. Bring me something I can hold." The court rises; the shift changes. The board stays as it is, and so does Gang Nine, and the appeal can come up the steps again whenever somebody brings it.',
      effects: [{ set: 'dk_adjourned' }],
      again: '"Bring me something I can hold."',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    c_withdraw: {
      speaker: DAHL,
      text: '"Withdrawn." Dahl writes it down. "The steps are here every evening." The quay goes back to work.',
      again: '"Withdrawn."',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    // ---------------------------------------------------------------- Mirela Stan before the court
    g_open: {
      speaker: 'narrator',
      text: 'Six o\'clock on the steps. Roux comes himself this time, in his clean grey, and stands just outside the line of the bottom step. Espe stands with the girl, who keeps her hands in her sleeves. "The Bond holds that the minor Stan is a surety under contract, consigned in error, returnable, and so under bond," Roux says, pleasantly. Dahl looks at the girl. "Put on the table what you have."',
      again: '"Put on the table what you have."',
      options: [
        EV('dk.gev.paper', '(Her paper: RETURNABLE ON DEFAULT OR FLIGHT.)', 'dk_ev_paper', ANY({ item: 'k_dk_paper' }, { lead: 'l_dk_surety' })),
        EV('dk.gev.act', '(Schedule 2, the goods: cargo, livestock, mails, stores, ballast.)', 'dk_ev_act', { knows: 'dk_act_read' }),
        { id: 'dk.garg', text: 'A person is not goods. On this quay she is a passenger, and a passenger owes her fare, not her body.', check: { skill: 'speech', dc: 50, mods: [
          { if: F('dk_ev_act'), dc: -10, why: 'the schedule of goods, read out' },
          { if: F('dk_ev_paper'), dc: -5, why: 'FLIGHT: a word you use of a person' },
          { if: IN(NINE), dc: -10, why: 'Nine reads the schedule\'s definitions aloud, all forty' },
          { if: IN(KES), dc: -5, why: 'Kes tells the steps what a returnable is, in the Skirts' },
          { if: F('prec_unrecorded', 'yields'), dc: -5, why: 'the city\'s own court has ruled a record yields to the living' },
        ] }, next: 'g_ruled', fail: 'g_adjourn' },
        { id: 'dk.garg.withdraw', text: '(Withdraw for now.)', next: 'c_withdraw' },
      ],
    },
    ev_dk_ev_paper: { speaker: 'narrator', text: 'The paper is read out on the steps: SURETY — ONE MINOR — RETURNABLE ON DEFAULT OR FLIGHT. And the back, which Dahl reads too, without being asked: GO. The girl\'s face does not move. Espe\'s does.', again: 'RETURNABLE ON DEFAULT OR FLIGHT. GO.', options: [{ text: '(Go on.)', next: 'g_open' }] },
    ev_dk_ev_act: { speaker: 'narrator', text: 'Dahl turns to Schedule 2 and reads it out, all of it, slowly, to the steps: cargo; livestock; mails; ship\'s stores; ballast; and their forty definitions. It takes a long time. Nobody leaves.', again: 'Cargo, livestock, mails, stores, ballast.', options: [{ text: '(Go on.)', next: 'g_open' }] },
    g_ruled: {
      speaker: DAHL,
      text: '"No persons," Dahl says, closing the schedule. "Finding. A person landed on this quay is a passenger. A passenger without a ticket owes the fare from her port of embarkation." She looks at Roux. "Two-Twelve to Carrick is a hundred and twenty-five Tolls on the guild\'s own tariff. Your paper is a contract between you and her mother, in the Skirts. It is not a bill of lading, and it is not mine to enforce." Roux bows very slightly, as if he had lost a hand of cards he had not much wanted. "And the fare?" Dahl says, to the steps.',
      again: '"And the fare?"',
      options: [
        { id: 'dk.gfare.pay', text: '(Pay her fare. 125 Tolls)', if: TOLLS(125), effects: [{ take: 'tolls', count: 125 }], next: 'g_paid' },
        { id: 'dk.gfare.work', text: 'She\'ll work it off on the quay.', next: 'g_work' },
      ],
    },
    g_paid: {
      speaker: 'narrator',
      text: 'You count it onto the step. The clerk writes PAID beside a name the guild\'s ledger has never had before. Mirela looks at the coins, and at you, and says, as if trying the word: "Passenger."',
      again: '"Passenger."',
      options: [{ id: 'dk.gfare.done', text: '(Leave the steps.)', effects: [
        { set: 'dk_girl', value: 'ruled' }, { set: 'dk_prec_passenger' }, { set: 'dk_fare_paid' }, ...GIRL_FREE_GOOD, A(NINE, 5), { rep: { faction: 'concern', respect: -5 } }, { trust: { npc: 'npc_dk_11', by: 20 } }, { xp: 200 },
        DEC('dk_girl', 'At the Harbour court you had it found that a person cannot be goods under bond: in Carrick Mirela Stan is a passenger, and you paid her fare.'),
        NEWS('dk_passenger', 'the Harbour court at the Docks ruled that a person landed on the quay is a passenger, never cargo, whatever the Concern\'s paper says', 4, 7),
      ], exit: true }],
    },
    g_work: {
      speaker: 'narrator',
      text: 'Espe says she will stand for it: the girl washes pots for wages and the guild takes the wages until a hundred and twenty-five is paid. The clerk writes it down. Mirela looks at the Bond\'s fence, white-lit across the quay, and then deliberately turns her back on it.',
      again: 'Mirela, her back to the fence.',
      options: [{ id: 'dk.gwork.done', text: '(Leave the steps.)', effects: [
        { set: 'dk_girl', value: 'ruled' }, { set: 'dk_prec_passenger' }, ...GIRL_FREE_GOOD, A(NINE, 5), { rep: { faction: 'concern', respect: -5 } }, { xp: 200 },
        DEC('dk_girl', 'At the Harbour court you had it found that a person cannot be goods under bond: in Carrick Mirela Stan is a passenger who owes her fare.'),
        NEWS('dk_passenger', 'the Harbour court at the Docks ruled that a person landed on the quay is a passenger, never cargo, whatever the Concern\'s paper says', 4, 7),
      ], exit: true }],
    },
    g_adjourn: {
      speaker: DAHL,
      text: '"The Bond\'s paper names her a surety under contract," Dahl says. "Nothing on my table says what else she is, and the court cannot find what is not put before it." The girl does not cry. Espe does, angrily. "Adjourned," Dahl says. "Bring me the rest." The steps empty.',
      again: '"Bring me the rest."',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
    // ---------------------------------------------------------------- the Hulls before the court
    h_open: {
      speaker: 'narrator',
      text: 'Six o\'clock on the steps. Imogen Thrale at the foot of them with a roll of drawings under her arm; beside her, a head taller, Kwabena Ofori with his hat in his hands; and behind him, filling the quay to the Bond\'s fence, more people out of the Hulls than you have seen in daylight. "The river berths are leased," Dahl says. "What is before the court?"',
      again: '"What is before the court?"',
      options: [
        EV('dk.hev.act', '(Schedule 3: a crewed vessel in port.)', 'dk_ev_sched3', { knows: 'dk_act_read' }),
        EV('dk.hev.books', '(The Benguela Star\'s crew book: ninety years of Sundays.)', 'dk_ev_books', { item: 'k_dk_crewbook' }),
        { id: 'dk.harg', text: 'The Hulls are vessels in port, with crews aboard. A lease can let the berths. It cannot move a crewed ship.', check: { skill: 'speech', dc: 45, mods: [
          { if: F('dk_ev_sched3'), dc: -10, why: 'Schedule 3, read out' },
          { if: F('dk_ev_books'), dc: -15, why: 'ninety years of Sundays in a crew book' },
          { if: IN(NINE), dc: -10, why: 'Nine has the Act by heart' },
          { if: { knows: 'dk_crewed' }, dc: -5, why: 'you have it straight' },
        ] }, next: 'h_crewed', fail: 'h_adjourn' },
        { id: 'dk.harg.withdraw', text: '(Withdraw for now.)', next: 'c_withdraw' },
      ],
    },
    ev_dk_ev_sched3: { speaker: 'narrator', text: 'Dahl reads Schedule 3 aloud. A vessel in port shall not be moved, broken or removed while she has a crew aboard. Somebody at the back of the Hulls\' crowd starts to cheer and is hushed by everybody round them.', again: 'Schedule 3, read out.', options: [{ text: '(Go on.)', next: 'h_open' }] },
    ev_dk_ev_books: { speaker: 'narrator', text: 'Abena Ofori brings the crew book up the steps in both arms and opens it at the first page, and Dahl turns the pages herself, all of them, slowly, ninety years of Sundays, while the steps wait and the light goes.', again: 'Ninety years of Sundays.', options: [{ text: '(Go on.)', next: 'h_open' }] },
    h_crewed: {
      speaker: DAHL,
      text: '"Finding." Dahl closes the book gently and hands it back to Abena. "These are vessels in port, and they are crewed. The lease stands for the berths and cannot touch the vessels in them; the marks already made are a master\'s leave for three hulls, and a leave is not abandonment while the crew is still aboard. House Vane may treat with their masters." She looks at Imogen. "Or build where nobody is." Imogen writes something in her book with the silver pencil. Kwabena puts his hat back on.',
      again: '"These are vessels in port, and they are crewed."',
      options: [{ id: 'dk.hcrewed.done', text: '(Leave the steps.)', effects: [
        { set: 'dk_hulls', value: 'crewed' }, { rep: { faction: 'tenured', respect: -10 } }, T(KOBBY, 25), A(NINE, 5), A(ASH, 5), A(TAMSIN, 3), A(WREN, 3), { xp: 200 },
        DEC('dk_hulls', 'At the Harbour court you had the Hulls found to be crewed vessels in port: House Vane\'s lease cannot move them.'),
        NEWS('dk_hulls_crewed', 'the Harbour court at the Docks found the old ships on the dry river are crewed and cannot be moved for a Crown bridge', 4, 6),
      ], exit: true }],
    },
    h_adjourn: {
      speaker: DAHL,
      text: '"A lease of idle berths," Dahl says, "and people in them. That is what is in front of me." She looks at Kwabena, and not unkindly. "Bring me what makes them more than people in a berth. Adjourned." The Hulls go back down the river stairs in silence.',
      again: '"Bring me what makes them more than people in a berth."',
      options: [{ text: '(Leave the steps.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- Espe's cookshop, the bunk, Mirela Stan

export const d_dk_espe: DialogueDef = {
  id: 'd_dk_espe', owner: 'npc_dk_11',
  start: [{ if: F('dk_espe_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A container with its end cut open to the quay, a stove made from a drum, a counter made from a door, and a pot on it the size of a child. A woman behind it with her sleeves pushed up and a ladle in her fist. "Espe\'s. Soup, bread, rice when there\'s rice, a bunk next door. Pay first, then I like you." At the back of the box a girl is washing pots in a tin bath and does not look up.',
      again: 'Espe, with the ladle.',
      effects: [{ set: 'dk_espe_met' }, { learn: 'dk_saw_girl' }],
      options: [
        { id: 'dk.espe.trade', text: 'Soup.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.espe.girl', text: 'Who\'s the girl at the back?', once: true, next: 'girl' },
        { id: 'dk.espe.news', text: 'What\'s the news on the quay?', once: true, next: 'news' },
        bye,
      ],
    },
    again: {
      text: [
        { if: GIRL('returned'), text: 'Espe ladles soup for somebody else and does not look at you, and when you put money on the counter she pushes it back with the ladle. "Not yours," she says. "Not any more."' },
        { if: ANY(GIRL('bought'), GIRL('ruled')), text: '"Pay first, then I like you." Espe ladles. At the back of the box the girl is singing under her breath over the pots, something with a terrace in it.' },
        { if: ANY(GIRL('shore'), GIRL('choir')), text: '"Pay first, then I like you." Espe ladles, and then, not looking up: "I miss the pots being washed properly."' },
        { text: 'Espe, with the ladle.' },
      ],
      again: 'Espe, with the ladle.',
      options: [
        { id: 'dk.espe.trade2', text: 'Soup.', if: NOT(GIRL('returned')), effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.espe.girl2', text: 'Who\'s the girl at the back?', if: ALL(GIRL_OPEN, NOT(F('dk_mirela_known')), NOT(SEEN('dk.espe.girl'))), once: true, next: 'girl' },
        { id: 'dk.espe.truth', text: 'The Bond has lost a returnable. I think she washes your pots.', if: ALL(GIRL_OPEN, NOT(F('dk_mirela_known')), ANY({ lead: 'l_dk_returnable' }, SEEN('dk.espe.girl'))), check: { skill: 'speech', dc: 35, mods: [
          { if: F('dk_connie_vouch'), dc: -15, why: 'Connie said you could be told' },
          { if: IN(TAMSIN), dc: -5, why: 'Tamsin is already at the back, drying pots' },
          { if: IN(KES), dc: -5, why: 'Kes talks to the girl about the Skirts\' terraces' },
        ] }, effects: [{ set: 'dk_mirela_known' }], next: 'shown', fail: 'denied' },
        { id: 'dk.espe.news2', text: 'What\'s the news on the quay?', if: NOT(SEEN('dk.espe.news')), once: true, next: 'news' },
        bye,
      ],
    },
    girl: {
      text: '"My niece." Espe does not blink. "From the Hulls. Washes pots." She ladles soup into somebody else\'s cup. "Next."',
      again: '"My niece. From the Hulls."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    shown: {
      text: 'Espe looks at you for a long time over the pot. Then she puts the ladle down. "Mirela," she says, without turning round. "Come and look at this one. Tell me what you think."',
      again: '"Come and look at this one."',
      options: [{ id: 'dk.espe.talkgirl', text: '(Talk to the girl.)', effects: [{ event: 'talk', data: { npc: 'npc_dk_09' } }], exit: true, repeat: true }, { text: 'Something else.', next: 'again' }],
    },
    denied: {
      text: '"My niece," Espe says again, in exactly the same voice, and ladles soup for somebody else, and does not look at you again today.',
      again: '"My niece."',
      options: [bye],
    },
    news: {
      text: [
        { if: { flag: 'rc_stock', eq: 'openfield' }, text: '"Twelve off a stock car on the Line walked south to the Choir by night and got there, every one. A guild clerk told a docker who told me." She looks at the back of the box, at the girl, and away. "Some people get where they\'re going."' },
        { if: { flag: 'rc_stock', eq: 'sold' }, text: '"Twelve off a stock car on the Line hid in a water tower and somebody sold them to the Concern at fifteen a head. Fifteen." She stirs. "That\'s what a person\'s worth on the Line this year. Write it down."' },
        { if: { flag: 'bw_dogs_hold' }, text: '"Bridgeward\'s fallen to a crew with a dog on its jackets, and the Crown\'s near end with it. Vane\'s lady still comes down to the Hulls with her stakes, every day, like a woman visiting a grave."' },
        { text: '"A box fell. Gang Nine\'s off. The Crown\'s drawing lines on the Hulls. The Bond lost something it calls a returnable." She ladles. "Same as last week, but worse."' },
      ],
      again: '"Same as last week, but worse."',
      effects: [{ learn: 'dk_espe_news' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_dk_cookshop = SIGN('d_dk_cookshop', 'ESPE\'S — SOUP — PAY FIRST, chalked on the container\'s side in letters as big as the container allows, and under it a painted bowl with three lines of steam coming off it, like a drawing of a bowl that is pleased with itself.', 'ESPE\'S — PAY FIRST.');

export const d_dk_bunk: DialogueDef = {
  id: 'd_dk_bunk', owner: 'narrator', start: [{ if: F('dk_bunk_rented'), node: 'mine' }, { node: 'offer' }],
  nodes: {
    offer: {
      text: 'The container next to Espe\'s, with a door cut in its side and a bed in it that somebody has made with a corner tucked: a locker, a hook, a lamp, a square of window cut in the steel and glazed with something that was a windscreen. A card on the door: BUNK — TWENTY — ASK ESPE.',
      again: 'BUNK — TWENTY — ASK ESPE.',
      options: [
        { id: 'dk.bunk.rent', text: '(Pay Espe twenty for the bunk.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { set: 'dk_bunk_rented' }], next: 'mine' },
        leave,
      ],
    },
    mine: {
      text: 'Your bunk in the Boxes: the bed with its tucked corner, the locker, the windscreen window with Crane Six\'s red light in it, and through the wall Espe\'s stove ticking as it cools and somebody next door snoring in a language you do not know.',
      again: 'Your bunk in the Boxes.',
      options: [{ id: 'dk.bunk.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave],
    },
  },
};

export const d_dk_mirela: DialogueDef = {
  id: 'd_dk_mirela', owner: 'npc_dk_09',
  start: [
    { if: ANY(GIRL('bought'), GIRL('ruled')), node: 'after' },
    { if: F('dk_mirela_met'), node: 'again' },
    { if: F('dk_mirela_known'), node: 'intro' },
    { node: 'pots' },
  ],
  nodes: {
    pots: {
      text: 'A girl washing pots in a tin bath at the back of the cookshop, who goes very still when you come near, the way a hare goes still in a field. "I\'m washing pots," she says.',
      again: '"I\'m washing pots."',
      options: [
        { id: 'dk.mir.through', text: 'You came off the through.', if: { lead: 'l_dk_returnable' }, check: { skill: 'speech', dc: 40, mods: [{ if: IN(KES), dc: -15, why: 'Kes says the name of a terrace, and the girl looks up' }, { if: F('dk_connie_vouch'), dc: -5, why: 'Connie has spoken for you on the quay' }] }, effects: [{ set: 'dk_mirela_known' }], next: 'intro', fail: 'still' },
        { text: '(Leave her be.)', exit: true },
      ],
    },
    still: {
      text: 'She goes on washing the same pot, round and round, until you go away.',
      again: 'The same pot, round and round.',
      options: [{ text: '(Leave her be.)', exit: true }],
    },
    intro: {
      text: '"Mirela." She dries her hands on her shirt. Fifteen, maybe, thin the way the terraces make you thin, the Teeth\'s sun still on the back of her neck, and a coat far too heavy for the quay that she does not take off. "I came in a box. Six days. You count by the stops: you feel it slow, and men talk outside, and then it goes on. They never open the spares." She looks past you at the Bond\'s white lights across the quay. "Are you going to tell him?"',
      again: '"Are you going to tell him?"',
      effects: [{ set: 'dk_mirela_met' }],
      interject: [{ companion: KES, text: 'Kes looks at her for a long moment. "Which terrace?" she asks. "Nine," the girl says. "The pear houses." Kes nods as if that explains everything, and to her it does. "Then you got further than anyone I knew," she says.', effects: [A(KES, 3)] }],
      options: [
        { id: 'dk.mir.why', text: 'Why did you run?', once: true, next: 'why' },
        { id: 'dk.mir.coat', text: 'Why won\'t you take the coat off?', once: true, next: 'coat' },
        { id: 'dk.mir.where', text: 'Where do you want to go?', next: 'where' },
        { text: 'No. I\'m not going to tell him.', next: 'again' },
      ],
    },
    again: {
      text: 'Mirela, at the pots, with her coat on.',
      again: 'Mirela, at the pots.',
      options: [
        { id: 'dk.mir.why2', text: 'Why did you run?', if: NOT(SEEN('dk.mir.why')), once: true, next: 'why' },
        { id: 'dk.mir.coat2', text: 'Why won\'t you take the coat off?', if: NOT(SEEN('dk.mir.coat')), once: true, next: 'coat' },
        { id: 'dk.mir.where2', text: 'Where do you want to go?', if: GIRL_OPEN, next: 'where' },
        bye,
      ],
    },
    why: {
      text: '"Because I\'m fifteen." As if that were an answer, which on the terraces it is. "At fifteen a surety goes to the Weighhouse for intake, if the contract\'s behind. Ma\'s behind. Everybody\'s behind; that\'s what the terraces are." She looks at the fence. "She told me to go. She said, get in a box going west, they never open the spares. So I did."',
      again: '"She told me to go."',
      effects: [{ learn: 'dk_mirela_why' }],
      interject: [{ companion: WREN, text: 'Wren has gone very quiet. "A box going west," she says. "Her mother put her in a box." She looks at the girl for a long moment. "Good," she says, and it costs her something to say it.', effects: [A(WREN, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    coat: {
      text: 'She puts a hand flat on the lining. "It\'s sewn in. Ma sewed it." She unpicks three stitches with her thumbnail and lets you see: a Concern paper, folded small and soft with handling. SURETY: ONE MINOR (M. STAN, 15) — RETURNABLE ON DEFAULT OR FLIGHT. On the back, in pencil, in a woman\'s hand, one word: GO. "If I\'m not returned, she\'s defaulted," Mirela says. "I know. She knew. She wrote that anyway." She folds it back.',
      again: '"She knew. She wrote that anyway."',
      effects: [{ lead: 'l_dk_surety' }, { learn: 'dk_paper_read' }],
      options: [
        { id: 'dk.mir.keep', text: 'Let me carry it. If they find you, they\'ll look in the coat first.', once: true, effects: [{ give: 'k_dk_paper' }, { set: 'dk_paper_carried' }], next: 'keep' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    keep: {
      text: 'She looks at you for a long time. Then she unpicks the rest of the stitches and puts the paper in your hand, and closes your fingers over it with hers, which are cold from the washing water. "Don\'t lose it," she says. "It\'s the only thing she ever wrote me."',
      again: '"It\'s the only thing she ever wrote me."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    where: {
      text: '"Somewhere they don\'t read it." She thinks. "Somewhere it\'s just paper."',
      again: '"Somewhere it\'s just paper."',
      options: [
        { id: 'dk.mir.shore', text: 'The tide boat goes down the delta to Gull Stilts. The water keeps no paper. (6 Tolls for her passage)', if: ALL(GIRL_OPEN, TOLLS(6)), effects: [
          { take: 'tolls', count: 6 }, { set: 'dk_girl', value: 'shore' }, ...GIRL_FREE_GOOD, { trust: { npc: 'npc_dk_11', by: 10 } }, { xp: 150 },
          DEC('dk_girl', 'You put Mirela Stan on the tide boat down the delta to Gull Stilts, with the Concern\'s paper still on her.'),
        ], next: 'shore' },
        { id: 'dk.mir.choir', text: 'The seven o\'clock east to West Halt, and the track south to Openfield by night. The Choir takes anyone. (25 Tolls for her ticket)', if: ALL(GIRL_OPEN, TOLLS(25)), check: { skill: 'survival', dc: 30, mods: [{ if: { flag: 'rc_stock', eq: 'openfield' }, dc: -30, why: 'the twelve walked it from West Halt, and West Halt will see her down the track' }, { if: IN(ASH), dc: -10, why: 'Ash draws her the way and the names to ask for' }] }, effects: [
          { take: 'tolls', count: 25 }, { set: 'dk_girl', value: 'choir' }, ...GIRL_FREE_GOOD, A(ASH, 5), { trust: { npc: 'npc_dk_11', by: 10 } }, { xp: 150 },
          DEC('dk_girl', 'You bought Mirela Stan a ticket east to West Halt and the way south by night to Openfield, where the Choir takes anyone.'),
        ], next: 'choir', fail: 'choir_no' },
        { id: 'dk.mir.wait', text: 'Stay hidden a while. I\'ll find a way to make the paper go away.', next: 'wait' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    shore: {
      text: 'Mele\'s boat goes down on the evening ebb. Mirela goes down the water stairs with Espe\'s bread inside her coat, and sits in the bottom of the boat between two sacks of salt, and does not look back at the Bond\'s lights, and then does, once, as the boat clears the Basin\'s mouth.',
      again: 'The tide boat clearing the Basin\'s mouth.',
      interject: [{ companion: TAMSIN, text: 'Tamsin watches the boat until it is a dot. "The sky lying down," she says. "She\'ll like it. You can\'t box the sea."', effects: [A(TAMSIN, 2)] }],
      options: [{ text: '(Go.)', exit: true }],
    },
    choir: {
      text: 'She goes east on the seven o\'clock with a ticket you bought her and the way south drawn on the back of one of Espe\'s bills, and Espe\'s bread, and her coat. At the platform\'s end she turns round to say something, and the guard shouts, and she gets on instead.',
      again: 'The seven o\'clock, going east with her on it.',
      interject: [{ companion: ASH, text: '"Openfield," Ash says, watching the train go. "Ask for the seed store. Say my name." He pauses. "It won\'t help. Say it anyway."' }],
      options: [{ text: '(Go.)', exit: true }],
    },
    choir_no: {
      text: 'You try to draw her the way south from West Halt in the dust with a finger, and get it wrong twice, and she watches you get it wrong. "I\'ll get lost," she says, very reasonably. "In the dark, in the Flats, by myself." She is right. Not that way; not yet.',
      again: '"I\'ll get lost."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    wait: {
      text: '"All right." She goes back to the pots. "I\'m good at waiting. I did six days in a box."',
      again: '"I\'m good at waiting."',
      options: [bye],
    },
    after: {
      text: [
        { if: GIRL('ruled'), text: '"Passenger." Mirela tries the word again, as if it might have worn out since. "I owe a fare. I\'ve never owed anything that was mine before." She goes back to the pots, and she has taken the coat off, and hung it on a nail where she can see it.' },
        { text: 'Mirela at the tin bath, washing pots for wages, singing under her breath something with a terrace in it. She has burned the paper in Espe\'s stove; she says it took a long time to catch.' },
      ],
      again: 'Mirela, at the pots, without the coat.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- the Hulls: Imogen Thrale, Kwabena and Abena Ofori, the stakes

/** The masters' marks, bought: the Hulls abandoned on paper for House Vane's bridge, and cleared at the next dawn. */
const CLEARED: Effect[] = [
  { set: 'dk_hulls', value: 'cleared' }, { rep: { faction: 'tenured', respect: 10 } }, T(KOBBY, -40),
  A(ASH, -10), A(TAMSIN, -10), A(WREN, -10), A(KES, -5), A(NINE, -3), { xp: 100 },
  DEC('dk_hulls', 'You got House Vane the masters\' marks on the Hulls: the old ships on the dry river were abandoned on paper, for the Crown\'s bridge.'),
];

export const d_dk_imogen: DialogueDef = {
  id: 'd_dk_imogen', owner: IMOGEN,
  start: [{ if: F('dk_imogen_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in a coat that cost more than the Hulls, kneeling on the old bridge\'s stump with a theodolite, writing numbers in a book with a silver pencil. She looks up and smiles as if you were a pleasant surprise. "Imogen Thrale. House Vane\'s engineer." She waves the pencil at the blue stakes in the bed below, among the ships. "I\'m building the far end of a bridge. Or I will be."',
      again: 'Imogen at the theodolite, writing.',
      effects: [{ set: 'dk_imogen_met' }, { quest: 'q_dk_far', start: true }],
      interject: [{ companion: TAMSIN, text: 'Tamsin looks from the stakes to the washing on the ships\' rails and back. "There are people in those," she says. "Yes," says Imogen, kindly. "That\'s the difficult part."' }],
      options: [
        { id: 'dk.im.why', text: 'Why here?', once: true, next: 'why' },
        { id: 'dk.im.road', text: 'What is the bridge for?', once: true, next: 'road' },
        { id: 'dk.im.people', text: 'And the people in the ships?', once: true, next: 'people' },
        { id: 'dk.im.steel', text: 'Where is the steel coming from?', once: true, next: 'steel' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'bw_dogs_hold' }, text: 'Imogen at the theodolite, writing, though the near end across the river is held by a crew with a dog painted on their jackets who do not sign anything. "Bridges are patient," she says, without looking up.' },
        { text: 'Imogen at the theodolite, writing.' },
      ],
      again: 'Imogen, writing.',
      options: [
        { id: 'dk.im.why2', text: 'Why here?', if: NOT(SEEN('dk.im.why')), once: true, next: 'why' },
        { id: 'dk.im.road2', text: 'What is the bridge for?', if: NOT(SEEN('dk.im.road')), once: true, next: 'road' },
        { id: 'dk.im.people2', text: 'And the people in the ships?', if: NOT(SEEN('dk.im.people')), once: true, next: 'people' },
        { id: 'dk.im.steel2', text: 'Where is the steel coming from?', if: NOT(SEEN('dk.im.steel')), once: true, next: 'steel' },
        { id: 'dk.im.near', text: 'And the near end?', if: NOT(SEEN('dk.im.near')), once: true, next: 'near' },
        { id: 'dk.im.help', text: 'I\'ll carry your purse to the masters who haven\'t signed.', if: ALL(HULLS_OPEN, { lead: 'l_dk_signed' }), next: 'help' },
        { id: 'dk.im.price', text: 'Buy all nine hulls together, at a price that means something.', if: ALL(HULLS_OPEN, { lead: 'l_dk_signed' }, F('dk_kobby_met')), next: 'price' },
        { id: 'dk.im.plate', text: 'There\'s a survey plate on the wall with the old tram bridge on it.', if: ALL(HULLS_OPEN, { knows: 'dk_plate_seen' }, NOT({ lead: 'l_dk_footing' })), effects: [{ lead: 'l_dk_footing' }], next: 'plate' },
        { id: 'dk.im.move', text: 'Build on the tram bridge\'s footing instead.', if: ALL(HULLS_OPEN, { lead: 'l_dk_footing' }), next: 'move' },
        bye,
      ],
    },
    why: {
      text: '"Because the old bridge\'s far pier stood here, and its footing is still here, eleven metres down on good rock." She taps the stump with the pencil. "A bridge is a sentence with two ends, and the far end wants rock. Anywhere else on this bank I\'d have to go looking for rock, and rock is the expensive part."',
      again: '"The far end wants rock."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    road: {
      text: '"Freight." She says it the way other people say a lover\'s name. "The Line ends here; the barges end here; the Concern\'s through ends here. Everything Carrick takes in goes into the city round by the Wall, a day for a cart, through the gate, past the lens, and is counted." She smiles. "House Vane would like its goods to arrive without being counted. So would every house in the Crown, which is why they\'ll all pay the toll."',
      again: '"House Vane would like its goods to arrive without being counted."',
      effects: [{ learn: 'dk_road_why' }],
      interject: [{ companion: NINE, text: '"Past the lens," Nine repeats. "A road to the Crown that never passes the gate." The lens clicks twice. "The Ledger\'s charter has no clause for a road it cannot see. It will have one by the morning after this opens."' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    people: {
      text: '"Nobody is going to be thrown off a ship." She says it as if she has said it before, often, to people who did not believe her. "The Harbour Master leased us the berths, and the Act says the occupiers quit on commencement. But I would rather they left with something. So I\'m buying the masters\' marks: a paper of abandonment, forty Tolls a hull. Three have signed." She turns a page. "Forty Tolls is a season, down there. I checked."',
      again: '"Forty Tolls a hull. Three have signed."',
      effects: [{ lead: 'l_dk_signed' }, { learn: 'dk_marks' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    steel: {
      text: [
        { if: F('dr_leven', 'stripped'), text: '"Leven: a tower in the Ring whose squatters stripped their own top floors and sold us the steel. Good steel." She points with the pencil at the quay, where girders lie stacked under a tarp with LEVEN chalked on the ends. "Already here."' },
        { if: ANY(F('dr_leven', 'paid'), F('dr_leven_burned')), text: '"Leven: a tower in the Ring that burned, I\'m told." She does not look up. "Good steel. It came down very cleanly." She points with the pencil at the girders stacked under a tarp on the quay, LEVEN chalked on the ends.' },
        { if: F('dr_leven', 'barred'), text: '"Late." For the first time she sounds less than pleasant. "The Ring stopped selling to our yard. Something about a mark on a door. It will start again; the Ring is always hungry."' },
        { text: '"The Ring. Its dead towers are good steel, and there is a yard out there that cuts them by the ton however they come down." She makes a note. "I don\'t ask how they come down. I\'m an engineer."' },
      ],
      again: '"Good steel."',
      effects: [{ learn: 'dk_steel_asked' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    near: {
      text: [
        { if: F('bw_dogs_hold'), text: '"Held by a crew with a dog painted on their jackets, who don\'t sign anything." She sighs. "It will change. The Crown is patient, and dogs get hungry, and there is a great deal of money on the far side of a bridge."' },
        { text: '"Bridgeward." She looks across the dry river at the torn deck. "A temporary arrangement with the Rustmouths, who hold the chain for us. Ms Harrow manages the near end. I manage the far one. We meet in the middle eventually; that\'s the idea of a bridge."' },
      ],
      again: '"We meet in the middle eventually."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    help: {
      text: 'She counts out two hundred and forty Tolls into a soft leather purse: forty for each of six. "The marks on the papers. And Mr Ofori\'s, if you can manage it: the Star\'s the oldest, and the others follow her." She hands you a sheaf of papers, printed, with a line at the bottom for a mark. "Keep twenty for your trouble. I\'d rather it was somebody they don\'t know."',
      again: '"The others follow the Star."',
      options: [
        { id: 'dk.im.help.go', text: '(Go down the river stairs and buy the marks.)', check: { skill: 'barter', dc: 45, mods: [{ if: { trust: { npc: KOBBY, gte: 20 } }, dc: -5, why: 'they know your face on the bed' }, { if: { knows: 'dk_crewed' }, dc: 10, why: 'you know they need not sign, and it shows' }] }, effects: [...CLEARED, { give: 'tolls', count: 20 }], next: 'cleared', fail: 'marks_no' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    cleared: {
      text: 'You go hull by hull, a mark and forty Tolls, a mark and forty Tolls, and the masters do not look at you while they make them. Kobby makes his last, on the Star\'s gangway, slowly, a K and an O, and gives you the paper and turns his back. By the time you climb the stairs the word is all over the bed. The Harbour Master\'s men will be down at dawn.',
      again: 'Nine marks, and the word all over the bed.',
      options: [bye],
    },
    marks_no: {
      text: 'Kobby\'s word has gone down the bed ahead of you: on every gangway somebody shakes their head before you have opened the purse. You bring it back up the stairs heavy. Imogen counts it and writes something down. "Well," she says. "That\'s data."',
      again: '"That\'s data."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    price: {
      text: '"All nine?" She puts the pencil down. "Go on."',
      again: '"Go on."',
      options: [
        { id: 'dk.im.price.go', text: 'A hundred and twenty a hull, all nine together, paid to the masters on the steps, or nobody signs at all.', check: { skill: 'barter', dc: 50, mods: [{ if: { knows: 'dk_crewed' }, dc: -10, why: 'the Act gives the masters a veto, and you say so' }, { if: IN(ODILE), dc: -10, why: 'Odile names the figure first, and higher' }, { if: { item: 'k_dk_crewbook' }, dc: -5, why: 'the crew book on her table' }] }, effects: [
          { set: 'dk_hulls', value: 'sold' }, { set: 'dk_hulls_empty' }, { rep: { faction: 'tenured', respect: 5 } }, T(KOBBY, 10), A(ODILE, 5), A(ASH, -3), A(TAMSIN, -3), { xp: 150 },
          DEC('dk_hulls', 'You made House Vane buy all nine of the Hulls together at three times its price; the masters walked up the river stairs with the money.'),
          NEWS('dk_hulls_sold', 'the old ships on the dry river at the Docks were sold to a Crown house all together, at a price that made the Hulls\' masters rich for a season', 1, 5),
        ], next: 'sold', fail: 'price_no' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    sold: {
      text: 'She works it out on a page, twice, and then laughs. "Three times. My mother will be appalled." She signs a draft on House Vane for a thousand and eighty and gives it to you to carry down. On the steps at the change of shift the nine masters take it in turns to count it, and then walk up the river stairs with it in a sack between two of them, and the Hulls follow them up with their bedding.',
      again: 'Nine masters and a sack, up the river stairs.',
      options: [bye],
    },
    price_no: {
      text: '"No." Pleasantly. "Forty is generous for a hull that cannot float. A hundred and twenty is sentiment." She picks up the pencil. "I can afford sentiment. I am not paid to."',
      again: '"Forty is generous."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    plate: {
      text: 'She comes to the wall with you and reads the plate, crouching, with her nose almost on the brass. "The tram bridge. I had the road bridge\'s drawings; nobody had these." She traces the line downstream with the silver pencil. "A hundred and twenty metres. Footing to rock." She stands up and looks down the quay at the Bond\'s fence and its lights, and goes rather quiet.',
      again: 'The tram bridge\'s footing, under the Bond.',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    move: {
      text: '"Under the Concern\'s yard." She says it carefully. "House Vane and the Concern are partners in a great many things." She looks at the Hulls, the washing, a child on a gangway, and back at the drawings. "Convince me the load works and I\'ll take it to the house."',
      again: '"Convince me the load works."',
      options: [
        { id: 'dk.im.move.go', text: '(Work the old tram bridge\'s loads with her, footing by footing.)', check: { skill: 'science', dc: 45, mods: [{ if: { skill: 'mechanics', gte: 50 }, dc: -10, why: 'you can read the old load tables' }, { if: IN(NINE), dc: -10, why: 'Nine has the tram bridge\'s drawings in its memory, to the bolt' }] }, effects: [
          { set: 'dk_hulls', value: 'moved' }, { set: 'dk_abutment', value: 'bond' }, { rep: { faction: 'tenured', respect: 3 } }, { rep: { faction: 'concern', respect: -5 } }, T(KOBBY, 20),
          A(TAMSIN, 3), A(ASH, 5), A(KES, 5), A(ODILE, 3), A(NINE, 3), { xp: 200 },
          DEC('dk_hulls', 'You worked House Vane\'s far end onto the old tram bridge\'s footing under the edge of the Concern\'s Bond; the Hulls stay, and the Crown and the Concern want the same ground.'),
          NEWS('dk_abutment_bond', 'House Vane moved its bridge\'s far end at the Docks onto the Concern\'s bonded yard; the Hulls stay', 2, 6),
        ], next: 'moved', fail: 'move_no' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    moved: {
      text: 'It takes the afternoon, on the stump, in the silver pencil and then in yours. When the last footing comes out right she looks at it for a long time and then laughs. "Sound rock. Under the Concern\'s yard." She stands. "This will be very expensive for someone, and not me." On her way back along the bed she pulls up a blue stake as if it were a weed, and then, after a moment, all of them.',
      again: 'The stakes pulled up like weeds.',
      options: [bye],
    },
    move_no: {
      text: 'The numbers do not come out: the old pier\'s footing will carry a tram and not a road, and she shows you where with the pencil. "Close," she says. "Close is a bridge that falls down." She goes back to the theodolite.',
      again: '"Close is a bridge that falls down."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_dk_kwabena: DialogueDef = {
  id: 'd_dk_kwabena', owner: KOBBY,
  start: [{ if: F('dk_kobby_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: DARK, text: 'At the dead crane\'s foot, a winch with a drum of cable as thick as your wrist, and a big grey man on its brake with a lamp hooked to his belt, who looks at you the way a ship\'s master looks at weather. "Kwabena Ofori. Kobby, on the bed. The cradle\'s mine, and the Benguela Star, which is the oldest hull on the river and the only one with her name still on her. Five a head, if you\'re going over."' },
        { text: 'A big grey man on the Benguela Star\'s gangway with his sleeves rolled, mending a block and tackle, who looks at you the way a ship\'s master looks at weather. "Kwabena Ofori. Kobby, on the bed. Master of the Star, which is the oldest hull on the river and the only one with her name still on her."' },
      ],
      again: 'Kobby, looking at you like weather.',
      effects: [{ set: 'dk_kobby_met' }, { quest: 'q_dk_far', start: true }],
      options: [
        { id: 'dk.kob.hulls', text: 'Tell me about the Hulls.', once: true, next: 'hulls' },
        { id: 'dk.kob.cradle', text: 'What is the cradle?', once: true, next: 'cradle' },
        { id: 'dk.kob.stakes', text: 'The blue stakes.', once: true, next: 'stakes' },
        { id: 'dk.kob.books', text: 'Master of a ship on dry land?', once: true, next: 'books' },
        bye,
      ],
    },
    again: {
      text: [
        { if: HULLS('crewed'), text: '"Crew." Kobby says it with great satisfaction, to nobody. "Ninety years of Sundays, and the court read every one." He goes back to his block and tackle, humming.' },
        { if: HULLS('moved'), text: '"Vane\'s lady pulled her stakes up like weeds." Kobby laughs, deep. "Now she and the Bond can fight over the quay, and we\'ll sell them both rope."' },
        { if: HULLS('sold'), text: '"A Crown man now, God help me." Kobby at the winch, on a wage from House Vane until the bridge comes. "Five a head, and I give it to the girl in the coat at the far end. Different coat. Same five."' },
        { text: 'Kobby, looking at you like weather.' },
      ],
      again: 'Kobby, at his work.',
      options: [
        { id: 'dk.kob.hulls2', text: 'Tell me about the Hulls.', if: NOT(SEEN('dk.kob.hulls')), once: true, next: 'hulls' },
        { id: 'dk.kob.cradle2', text: 'What is the cradle?', if: NOT(SEEN('dk.kob.cradle')), once: true, next: 'cradle' },
        { id: 'dk.kob.stakes2', text: 'The blue stakes.', if: NOT(SEEN('dk.kob.stakes')), once: true, next: 'stakes' },
        { id: 'dk.kob.books2', text: 'Master of a ship on dry land?', if: NOT(SEEN('dk.kob.books')), once: true, next: 'books' },
        { id: 'dk.kob.ride', text: '(Ride the cradle over to Bridgeward. 5 Tolls)', if: ALL(DARK, CRADLE_RUNS, TOLLS(5)), effects: [{ take: 'tolls', count: 5 }, { learn: 'dk_cradle_known' }, { set: 'dk_cradle_ridden' }, { event: 'goto', data: { location: 'md_bridgeward', spawn: 'bridge', minutes: 20 } }], exit: true, repeat: true },
        { id: 'dk.kob.sign', text: 'Sign Vane\'s paper. Take what she offers while it\'s offered.', if: ALL(HULLS_OPEN, { lead: 'l_dk_signed' }), check: { skill: 'speech', dc: 55, mods: [{ if: { knows: 'dk_crewed' }, dc: 15, why: 'he knows the Act is on his side, because you told him' }] }, effects: CLEARED, next: 'signed', fail: 'sign_no' },
        bye,
      ],
    },
    hulls: {
      text: '"Nine ships on the river the day the river stopped." He waves the block at the bed. "The crews stayed aboard, because where else would they go? Ninety years. Three hundred of us now. We fish the Basin off the wall, we stand on the call-on when Platt will have us, which is never, and we run the cradle." He looks up at the Star\'s rust. "My great-grandfather was her third mate. He used to say she\'d float again. She won\'t. She\'s full of people."',
      again: '"She won\'t float again. She\'s full of people."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    cradle: {
      text: '"A basket on a wire." He points up at Crane One\'s jib, at the cable running off it into the air over the bed, west, to where Bridgeward\'s torn deck stands up out of the far bank like a broken tooth. "Before the bridge fell there was a bridge. After, there was nothing, and my grandfather said a rope\'s a bridge if you\'re brave. Five a head, at night: people who want into the city without the gate looking at their faces. Letters. Goods. The Rustmouths take two of every five at their end." He shrugs. "You come at night, you pay, Abena takes you over. From their side: swing a lamp twice at the drop, wait, and once. We\'ll see it."',
      again: '"Swing a lamp twice, wait, and once."',
      effects: [{ learn: 'dk_cradle_known' }],
      interject: [{ companion: WREN, text: 'Wren is looking up at the cable with an expression you have not seen on her before. "A road nobody drew," she says. "That\'s the best kind."', effects: [A(WREN, 3)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    stakes: {
      text: '"Vane\'s." He does not look at them. "Their lady buys our masters\' marks. Forty a hull. Three of my cousins took it: a season of rice, for a ship." He puts the block down. "She\'s polite about it. That\'s the worst part. You can\'t hit polite."',
      again: '"You can\'t hit polite."',
      effects: [{ lead: 'l_dk_signed' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    books: {
      text: 'He grins for the first time, all the way across his face. "The articles. A ship\'s crew signs on in her book. When the river stopped, my great-grandfather said: we\'re still a crew, so we\'ll sign on. Every Sunday since." He shakes his head. "Ninety years of Sundays. Abena keeps them now, all nine hulls\' books. Ask her; she\'ll show you. She shows everybody."',
      again: '"Ninety years of Sundays."',
      effects: [{ lead: 'l_dk_crews' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    signed: {
      text: 'He looks at the Star for a long time, at the washing and the smoke and the child on the gangway. "All right," he says at last. "All right. Better forty than the river stairs with nothing in our hands." He makes his mark, a K and an O, and goes down the bed with the paper, and the other masters follow the Star, as they always have.',
      again: 'A K and an O.',
      options: [bye],
    },
    sign_no: {
      text: '"No." Not loud. "The Star\'s a ship. I\'m her master. She has a crew." He picks the block up again. "Forty Tolls is what they pay for a thing that\'s finished. We\'re not."',
      again: '"We\'re not finished."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_dk_abena: DialogueDef = {
  id: 'd_dk_abena', owner: 'npc_dk_08',
  start: [{ if: F('dk_abena_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: DARK, text: 'A young woman crouched in the steel basket at the cable\'s end with a lamp between her knees, who looks up at you with her grandfather\'s exact face. "Abena. Over?"' },
        { text: 'A young woman sitting on the Benguela Star\'s rail with a fat ledger open on her knees, writing names in a careful hand. "Abena. Sunday\'s tomorrow," she says. "I\'m getting ahead."' },
      ],
      again: 'Abena, with the book or the lamp.',
      effects: [{ set: 'dk_abena_met' }],
      options: [
        { id: 'dk.ab.book', text: 'The crew books.', once: true, next: 'book' },
        { id: 'dk.ab.signed', text: 'Who signed Vane\'s papers?', once: true, next: 'signed' },
        { id: 'dk.ab.city', text: 'What is it like, over there?', once: true, next: 'city' },
        bye,
      ],
    },
    again: {
      text: 'Abena, with the book or the lamp.',
      again: 'Abena.',
      options: [
        { id: 'dk.ab.book2', text: 'The crew books.', if: NOT(SEEN('dk.ab.book')), once: true, next: 'book' },
        { id: 'dk.ab.borrow', text: 'Could I take the Star\'s book up the steps to the Harbour court?', if: ALL(HULLS_OPEN, SEEN('dk.ab.book'), NOT({ item: 'k_dk_crewbook' })), once: true, effects: [{ give: 'k_dk_crewbook' }], next: 'borrow' },
        { id: 'dk.ab.signed2', text: 'Who signed Vane\'s papers?', if: NOT(SEEN('dk.ab.signed')), once: true, next: 'signed' },
        { id: 'dk.ab.city2', text: 'What is it like, over there?', if: NOT(SEEN('dk.ab.city')), once: true, next: 'city' },
        { id: 'dk.ab.over', text: '(Over to Bridgeward\'s drop. 5 Tolls)', if: ALL(DARK, CRADLE_RUNS, TOLLS(5)), effects: [{ take: 'tolls', count: 5 }, { learn: 'dk_cradle_known' }, { set: 'dk_cradle_ridden' }, { event: 'goto', data: { location: 'md_bridgeward', spawn: 'bridge', minutes: 20 } }], exit: true, repeat: true },
        bye,
      ],
    },
    book: {
      text: 'She holds the ledger up so you can see the spine: BENGUELA STAR — ARTICLES, in gold that has mostly gone. "Every hull has one. Every name. Every Sunday, signed or marked." She turns to the first page, where the ink is brown. "The first one\'s the week the river stopped. Grandad\'s great-grandfather. Third mate." She closes it carefully. "Grandad says it\'s a joke we kept telling until it was true."',
      again: '"A joke we kept telling until it was true."',
      effects: [{ lead: 'l_dk_crews' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    borrow: {
      text: 'She looks at you, and at the book, and at the Star. "Bring it back," she says, and puts it in your hands. It is heavier than it looks. "It\'s the only one with all ninety years in it."',
      again: '"Bring it back."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    signed: {
      text: '"The Orinoco, the Hope and the Saint Kilda." She does not have to look it up. "Forty each. The Hope\'s master has seven children; I don\'t blame him. The Saint Kilda\'s master drinks; I do." She shrugs. "They\'re still crewed. Everybody\'s still aboard. The marks are just marks, till somebody comes to move us."',
      again: '"The marks are just marks, till somebody comes."',
      effects: [{ lead: 'l_dk_signed' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    city: {
      text: '"Loud. Counted." She thinks about it. "They look at your face at the gate and decide if it\'s a face. I go over twice a night and I\'ve never been further than the end of the bridge." She grins suddenly, exactly like her grandfather. "The Rustmouths give me sweets. They think I don\'t know they\'re skimming."',
      again: '"They look at your face and decide if it\'s a face."',
      interject: [{ companion: TAMSIN, text: '"I\'ve been counted," Tamsin says. "It\'s overrated." Abena laughs, and the two of them look at each other like people who have just found out they speak the same language.', effects: [A(TAMSIN, 1)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_dk_stakes: DialogueDef = {
  id: 'd_dk_stakes', owner: 'narrator',
  start: [{ if: HULLS('moved'), node: 'moved' }, { if: F('dk_hulls_empty'), node: 'empty' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'Blue stakes in a straight line across the dry bed between the ships, each with a brass tag: VANE — WEST ABUTMENT — and a number. The line runs through a cookfire, a washing line, and the Saint Kilda\'s stern, and does not bend for any of them. On the stump above, a theodolite on its tripod, looking at the far bank.',
      again: 'The blue stakes, straight through the Saint Kilda\'s stern.',
      effects: [{ learn: 'dk_stakes_seen' }, { quest: 'q_dk_far', start: true }],
      options: [leave],
    },
    moved: {
      text: 'The stakes are gone from the bed. A new line of blue runs along the Bond\'s fence downstream, and the Bond\'s guards pull them up every morning as fast as House Vane\'s men drive them in at night.',
      again: 'Blue stakes along the Bond\'s fence, and the guards pulling them.',
      options: [leave],
    },
    empty: {
      text: 'The stakes stand in a bed with nothing round them but rust, the black rings of ninety years of cookfires, and a child\'s shoe.',
      again: 'The stakes, the fire-rings, the shoe.',
      options: [leave],
    },
  },
};

export const d_dk_plate: DialogueDef = {
  id: 'd_dk_plate', owner: 'narrator', start: [{ node: 'plate' }],
  nodes: {
    plate: {
      text: 'A brass plate let into the river wall\'s coping, green with ninety years, its letters cut deep: MERIDIAN PORT AUTHORITY — RIVER CROSSINGS — SURVEY DATUM. Under it, engraved, the river in its banks with water in it, and two bridges across it, ROAD and TRAM, their piers marked with depths to rock.',
      again: 'The survey plate: ROAD and TRAM, their piers, depths to rock.',
      effects: [{ learn: 'dk_plate_seen' }],
      options: [
        { id: 'dk.plate.read', text: '(Read the depths to rock.)', if: NOT({ lead: 'l_dk_footing' }), check: { skill: 'science', dc: 40, mods: [{ if: { skill: 'mechanics', gte: 45 }, dc: -10, why: 'you have read survey work before' }] }, effects: [{ lead: 'l_dk_footing' }], next: 'read', fail: 'read_no' },
        leave,
      ],
    },
    read: {
      text: 'The road bridge\'s far pier: rock at eleven metres, right under the stump. The tram bridge\'s far pier, a hundred and twenty metres downstream: rock at nine. Shallower, and sound. You look down the quay to where the plate\'s line would land, and it lands inside the Bond\'s fence, under its white lights.',
      again: 'Rock at nine, under the Bond.',
      options: [leave],
    },
    read_no: {
      text: 'Numbers, a scale, a north arrow, two lines of piers. Somebody who reads surveys for a living would know what it says. Somebody on this bank does, and kneels on the stump all day with a silver pencil.',
      again: 'Numbers you cannot read.',
      options: [leave],
    },
  },
};

export const d_dk_crewbooks: DialogueDef = {
  id: 'd_dk_crewbooks', owner: 'narrator', start: [{ node: 'books' }],
  nodes: {
    books: {
      text: 'On the Star\'s mess table, nine ledgers in a row with their spines out, each with a ship\'s name in faded gold: BENGUELA STAR, ORINOCO, CAPE HOPE, SAINT KILDA, and five more. Each one open at this week, with a pen beside it.',
      again: 'Nine crew books, open at this week.',
      effects: [{ lead: 'l_dk_crews' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the fish steps, the Hulls' fence, a factor sent back to a desk

export const d_dk_grigor: DialogueDef = {
  id: 'd_dk_grigor', owner: 'npc_dk_10',
  start: [{ if: F('dk_grigor_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man on the fish steps with a beard like a hedge and a hand line in each fist, who does not look up from the water. "Grigor. Mullet: small, grey, alive, which is three things more than the river. Lines at dawn, two Tolls, bring them back."',
      again: 'Grigor, a line in each fist.',
      effects: [{ set: 'dk_grigor_met' }],
      options: [
        { id: 'dk.gr.trade', text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.gr.river', text: 'What happened to the river?', once: true, next: 'river' },
        { id: 'dk.gr.oil', text: 'Who brings the oil to the fuel berth?', once: true, next: 'oil' },
        bye,
      ],
    },
    again: {
      text: [{ if: DAWN, text: '"Dawn." Grigor holds a line out without looking round. "Two. Bring it back."' }, { text: 'Grigor, a line in each fist.' }],
      again: 'Grigor, watching the water.',
      options: [
        { id: 'dk.gr.trade2', text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.gr.fish', text: '(Rent a line and fish off the Basin wall. 2 Tolls)', if: ALL(DAWN, TOLLS(2)), check: { skill: 'survival', dc: 30, mods: [{ if: { attr: 'senses', gte: 7 }, dc: -5, why: 'you see them turn under the slick' }] }, effects: [{ take: 'tolls', count: 2 }, { time: 180 }, { give: 'c_dk_mullet', count: 2 }, { xp: 10 }], failEffects: [{ take: 'tolls', count: 2 }, { time: 180 }], next: 'caught', fail: 'nothing', repeat: true },
        { id: 'dk.gr.river2', text: 'What happened to the river?', if: NOT(SEEN('dk.gr.river')), once: true, next: 'river' },
        { id: 'dk.gr.oil2', text: 'Who brings the oil to the fuel berth?', if: NOT(SEEN('dk.gr.oil')), once: true, next: 'oil' },
        bye,
      ],
    },
    caught: {
      text: 'Three hours on the wall with your legs over the Basin and the line round your finger, and two small grey mullet in the bucket for it, and a sunburn on one side of your neck. Grigor looks in the bucket and grunts, which from him is applause.',
      again: 'Two mullet in the bucket.',
      options: [{ text: '(Give him back his line.)', exit: true }],
    },
    nothing: {
      text: 'Three hours on the wall with your legs over the Basin, and the line goes slack every time you look away. Grigor takes it back and coils it. "They\'re down there," he says. "They just don\'t like you yet."',
      again: '"They just don\'t like you yet."',
      options: [{ text: '(Give him back his line.)', exit: true }],
    },
    river: {
      text: '"It stopped." He spits into the Basin. "My grandfather said: the Burn, and the dams upriver, and then the city took what was left for the Precinct, and one spring it was a river and the next it was a road for rats. They left the ships where they sat." He jerks his head at the Basin. "This is the sea\'s. The sea doesn\'t stop. The sea doesn\'t take orders from anybody."',
      again: '"The sea doesn\'t stop."',
      interject: [{ companion: NINE, text: '"The upper river was diverted into the north channel in the Burn\'s second year by the city\'s own works," Nine says, looking at the bed with something like fondness. "The drawings are in the Vault. Eleven sluices." Grigor looks at the lens. "Eleven," Nine says again, as if that settled something. "Drainage."', effects: [A(NINE, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    oil: {
      text: [
        { if: ANY(F('ds_barge', 'pyre'), F('ds_barge', 'burned')), text: '"There was a night barge from the delta, low in the water, no lamps, every few nights, to the fuel berth. Not since the spring." He coils a line. "Somebody burned it, the tide boat says. Somebody on the shore. Good." He does not explain the good.' },
        { if: ANY(F('ds_rig', 'crew'), F('ds_rig', 'shared'), F('ds_rig', 'stilts')), text: '"The Rigs\' own launch, now, once a month, with a hose that says HUM on it, and a price somebody on the Rigs set." He spits. "The guild hates it. Good."' },
        { text: '"A night barge from the delta, low in the water, no lamps, every few nights. Unloads at the fuel berth for the Line\'s engines." He coils a line. "Nobody on the quay is awake to see it. Nobody asks. The water round the berth\'s purple in the morning."' },
      ],
      again: '"Nobody asks."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_dk_nadia: DialogueDef = {
  id: 'd_dk_nadia', owner: 'npc_dk_14',
  start: [{ if: F('dk_nadia_met'), node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman behind a counter of crates in the cut-open side of a hull, with a split lip that healed crooked and a pistol on the counter where she can reach it. "Nadia. What comes over the rope and what falls off the boxes." She smiles with half her mouth. "Don\'t ask which."',
      again: 'Nadia, behind her crates.',
      effects: [{ set: 'dk_nadia_met' }],
      options: [
        { id: 'dk.nad.trade', text: 'Show me.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.nad.boxes', text: 'What falls off the boxes?', once: true, next: 'boxes' },
        bye,
      ],
    },
    again: {
      text: 'Nadia, behind her crates, the pistol where she can reach it.',
      again: 'Nadia.',
      options: [
        { id: 'dk.nad.trade2', text: 'Show me.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'dk.nad.boxes2', text: 'What falls off the boxes?', if: NOT(SEEN('dk.nad.boxes')), once: true, next: 'boxes' },
        bye,
      ],
    },
    boxes: {
      text: '"Inhalers, lately. Blue caps." She sets one on the crate between you: clean white plastic, the closed eye on the cap. "Somebody on the night gang had a box a week of them for a while and sold me what his girl didn\'t need, and then he didn\'t." She looks at you. "Concern medicine at Concern prices. I\'m not a charity. The Bond is, apparently, when it wants something."',
      again: '"Somebody on the night gang had a box a week."',
      effects: [{ learn: 'dk_inhalers_heard' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_dk_thorne: DialogueDef = {
  id: 'd_dk_thorne', owner: 'npc_ds_04', start: [{ node: 'desk' }],
  nodes: {
    desk: {
      text: 'At a junior clerk\'s table in the Customs House\'s long room, copying berth dues into a ledger in an exact hand, a man in a good coat gone shiny at the elbows. Cyprian Thorne looks up, and for a moment has no expression at all. "Ah," he says. "You." He dips the pen. "I was a factor. Now I copy. The guild sends you back to a desk when the water won\'t have you." He goes back to the ledger. "Nobody has to be unreasonable."',
      again: 'Thorne, copying dues, not looking up.',
      effects: [{ learn: 'dk_thorne_seen' }],
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- the crowd

function crowd(id: string, lines: { if?: Cond; text: string }[], asks: { text: string; reply: string }[], again: string): DialogueDef {
  const nodes: DialogueDef['nodes'] = {
    hello: { text: lines, again, options: [...asks.map((a, i) => ({ id: `${id}.${i}`, text: a.text, next: `a${i}`, once: true })), { text: 'Take care.', exit: true }] },
  };
  asks.forEach((a, i) => { nodes[`a${i}`] = { text: a.reply, again: a.reply, options: [{ text: 'Thanks.', next: 'hello' }] }; });
  return { id, owner: 'narrator', start: [{ node: 'hello' }], nodes };
}

export const d_dk_x_docker = crowd('d_dk_x_docker', [
  { if: STOOD, text: '"You were on the line that morning." A nod, and something more than a nod. "Stand by me at the call-on any time."' },
  { if: { standing: { settlement: 'meridian', lte: -15 } }, text: 'They look at you, and at the Bond, and go back to what they were doing.' },
  { if: CRANE_OPEN, text: '"Mind the tarp." Not unfriendly. "That\'s Dmytro. Nobody\'s moved him; nobody\'s allowed."' },
  { text: '"Off the Line?" Not unfriendly. "Mind the hooks. Mind the gang-masters more."' },
], [
  { text: 'Where do I sleep?', reply: '"Espe\'s bunk, twenty, next to the soup. Or the Hulls, if Kobby likes you. Or the Stand, if you like the cold."' },
  { text: 'Who runs the quay?', reply: '"Dahl, by the Act. The Bond, past its fence. The Crown, whenever it wants a box. Us, on the line, for about four minutes at dawn."' },
  { text: 'How do I get into the city?', reply: '"River road from the north end, round by the Wall to the gate: an hour, and papers. The quay tram to Clover. Or at night, Kobby\'s rope." They grin. "You didn\'t hear the last one from me."' },
], '"Something else?"');

export const d_dk_x_hulls = crowd('d_dk_x_hulls', [
  { if: HULLS('crewed'), text: '"Crew," they say, and grin, and tap a ship\'s rail as if it were a friend\'s shoulder.' },
  { text: '"You\'re not from the bed." A look up and down. "Mind the stakes. They\'re only paint, but the paint\'s the Crown\'s."' },
], [
  { text: 'How long have you lived down here?', reply: '"Always. My grandmother was born on the Star. So was I. So was my boy, in a storm, with the rain coming through the bridge."' },
  { text: 'What happens if they build the bridge?', reply: '"Then there\'s a bridge." A shrug. "And we\'re up the stairs in the Boxes, four to a box, and nobody runs the rope."' },
], '"Something else?"');

export const d_dk_x_bond = crowd('d_dk_x_bond', [
  { text: '"Please stay outside the line." Pleasant, clean, in the Concern\'s grey, and not looking at your face for longer than it takes to remember it.' },
], [
  { text: 'What\'s in the boxes?', reply: '"Everything inside the line is under bond." A small smile. "That\'s what\'s in the boxes."' },
], '"Is there anything else?"');

export const DOCKS_DIALOGUES: DialogueDef[] = [
  d_md_river_sign, d_dk_road_sign, d_dk_line, d_dk_tide, d_dk_tram, d_dk_cradle,
  d_dk_engine, d_dk_floor_notice, d_dk_bond_sign, d_dk_hulls_notice, d_dk_crane2, d_dk_barge, d_dk_fish, d_dk_fuel, d_dk_act,
  d_dk_box, d_dk_cab, d_dk_stand, d_dk_breakers, d_dk_connie, d_dk_platt, d_dk_oksana, d_dk_tin, d_dk_weighbridge, d_dk_tomas, d_dk_roux, d_dk_bond_desk, d_dk_dahl,
  d_dk_espe, d_dk_cookshop, d_dk_bunk, d_dk_mirela,
  d_dk_imogen, d_dk_kwabena, d_dk_abena, d_dk_stakes, d_dk_plate, d_dk_crewbooks,
  d_dk_grigor, d_dk_nadia, d_dk_thorne, d_dk_x_docker, d_dk_x_hulls, d_dk_x_bond,
];
