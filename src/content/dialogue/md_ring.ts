import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * Meridian, the Dead Ring (B3.12): outside the Wall. The Loop's last halt at Clover and its turnstile; the circuit and
 * Dorota's slate (the races: a heat is three segments, each push / hold / cut; a rivalry with the Ring's champion that ends
 * in a final for a blank citizen card); Emil's pits; the Crown's bookman; Leven, a squatted tower, and the yard that cuts
 * dead towers for steel (Fire at Leven). Story notes: story/STORY_PLAN_SECRET.md, Build notes — B3.12.
 */

const TAMSIN = 'npc_c9_03';
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const ODILE = 'npc_nb_03';
const ASH = 'npc_of_03';
const NINE = 'npc_md_nine';

const bye = { text: 'That\'s all.', exit: true };
const leave = { text: '(Leave it.)', exit: true };
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
/** The meet runs at dusk; a heat takes the evening, so there is one a night. */
const DUSK: Cond = { hour: { from: 18, to: 23 } };
const SMALL_HOURS: Cond = { hour: { from: 0, to: 4 } };
const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
/** Something to race in: the Mule hired for the night, or a buggy of your own, and not in pieces. */
const BUGGY: Cond = { all: [{ any: [{ flag: 'dr_hired' }, { flag: 'dr_buggy' }] }, { not: { flag: 'dr_buggy_hurt' } }] };
const OWN: Cond = { flag: 'dr_buggy' };
const FINAL_OPEN: Cond = { all: [{ flag: 'dr_final_posted' }, { not: { flag: 'dr_final' } }] };
/** The Coat cut the Heron's line the night the final was posted; nobody has mended it or said so. */
const LINE_CUT: Cond = { all: [{ flag: 'dr_final_posted' }, { not: { flag: 'dr_line' } }] };
/** Bello no longer races: gone in through the gate, or out of the Heron for good. */
const BELLO_GONE: Cond = { any: [{ flag: 'dr_bello', eq: 'inside' }, { flag: 'dr_bello', eq: 'crippled' }] };
const LEVEN_OPEN: Cond = { all: [{ quest: 'q_dr_leven' }, { not: { flag: 'dr_leven' } }] };

/** DC changes on a push: the tune holds until a crash; a buggy of your own is one you know. */
const pushMods = (extra: { if: Cond; dc: number; why: string }[] = []) => [
  { if: { flag: 'dr_tuned' }, dc: -1, why: 'Emil\'s bench: the tune holds' },
  { if: OWN, dc: -1, why: 'your own buggy, and you know its pull' },
  ...extra,
];
const COUGH = { if: { flag: 'dr_cough' }, dc: 1, why: 'the engine is running rough' };
const WIND = { if: { knows: 'dr_ilya_wind' }, dc: -1, why: 'Ilya\'s wind: lean into it' };
const LEAN = { if: { knows: 'dr_bello_lean' }, dc: -1, why: 'Bello: lean before the bend, not in it' };
const CUT_LINE = { if: { knows: 'dr_cut_line' }, dc: -1, why: 'you walked the ramp: the good line is on the left' };

/** The course, written once: `p` is the node prefix ('' for a heat, 'f_' for the final), `up` the extra difficulty. */
function course(p: string, up: number): Record<string, NodeDef> {
  const nextSeg2: OptionDef[] = p
    ? [{ id: `${p}to2.cut`, text: '(The cloverleaf.)', if: LINE_CUT, next: `${p}seg2_crash` }, { id: `${p}to2`, text: '(The cloverleaf.)', if: { not: LINE_CUT }, next: `${p}seg2` }]
    : [{ id: 'to2', text: '(The cloverleaf.)', next: 'seg2' }];
  const seg2Options = (k: string): OptionDef[] => [
    { id: `${p}${k}.push`, text: '(Push through the bends.)', check: { attr: 'reflex', dc: 8 + up, mods: [...pushMods([WIND, LEAN]), COUGH] }, effects: [{ inc: 'dr_pos', by: -1 }], next: `${p}s2_push`, fail: `${p}crash` },
    { id: `${p}${k}.hold`, text: '(Hold your line through the bends.)', next: `${p}s2_hold` },
    { id: `${p}${k}.cut`, text: '(Cut: straight across the broken ramp.)', check: { attr: 'senses', dc: 7 + up, mods: [CUT_LINE, { if: OWN, dc: -1, why: 'your own buggy sits low enough for the rubble' }] }, effects: [{ inc: 'dr_pos', by: -2 }], next: `${p}s2_cut`, fail: `${p}crash` },
  ];
  return {
    [`${p}seg1`]: {
      speaker: 'narrator',
      text: 'The straight under the towers: four hundred metres of cracked asphalt with the piers going by like fence posts and the dead towers leaning over it. The engine wants to go, if you let it.',
      again: 'The straight under the towers, the piers going by. The engine wants to go.',
      options: [
        { id: `${p}seg1.push`, text: '(Push: flat out down the straight.)', check: { attr: 'reflex', dc: 6 + up, mods: pushMods() }, effects: [{ inc: 'dr_pos', by: -2 }], next: `${p}s1_push`, fail: `${p}s1_cough`, failEffects: [{ inc: 'dr_pos', by: 1 }, { set: 'dr_cough' }] },
        { id: `${p}seg1.hold`, text: '(Hold your line.)', next: `${p}s1_hold` },
      ],
    },
    [`${p}s1_push`]: { speaker: 'narrator', text: 'You put your foot through the floor and the engine finds something it did not know it had. Two buggies go backwards past your shoulder, and the dust of the ones ahead comes at you like weather.', again: 'Foot through the floor; two buggies go backwards past your shoulder.', options: nextSeg2.map((o) => ({ ...o, id: `${o.id}.a` })) },
    [`${p}s1_cough`]: { speaker: 'narrator', text: 'The engine coughs at the top of the gear, twice, and something behind you takes the space you left. Down a place, and the note under your feet has gone rough.', again: 'The cough at the top of the gear; down a place, running rough.', options: nextSeg2.map((o) => ({ ...o, id: `${o.id}.b` })) },
    [`${p}s1_hold`]: { speaker: 'narrator', text: 'You hold it where it is. Nobody passes you; you pass nobody. The towers go by.', again: 'You hold it where it is; the towers go by.', options: nextSeg2.map((o) => ({ ...o, id: `${o.id}.c` })) },
    [`${p}seg2`]: {
      speaker: 'narrator',
      text: 'The cloverleaf: the old ramps cut into a knot of bends with tyres stacked at every one, and in the middle of it the broken ramp going straight across the infield, where nobody sane would drive and somebody always does.',
      again: 'The cloverleaf, the tyres at every bend, the broken ramp straight across the middle.',
      options: seg2Options('seg2'),
    },
    [`${p}s2_push`]: { speaker: 'narrator', text: 'Through the bends with the tyres an arm\'s length off and the back end trying to come round on every one, and out of the last of them a place further up than you went in.', again: 'Through the bends, the back end coming round, out a place up.', options: [{ id: `${p}to3.a`, text: '(The last straight.)', next: `${p}seg3` }] },
    [`${p}s2_hold`]: { speaker: 'narrator', text: 'You take the bends the long way, the way everyone takes them. The field stays where it was, and so do you.', again: 'The long way round the bends; the field stays where it was.', options: [{ id: `${p}to3.b`, text: '(The last straight.)', next: `${p}seg3` }] },
    [`${p}s2_cut`]: { speaker: 'narrator', text: 'Off the asphalt and onto the ramp: rubble under the wheels like gravel thrown at a window, the floor striking twice, the whole buggy in the air for a moment you will remember, and out the far side of the infield ahead of two buggies that went the long way round.', again: 'Onto the ramp, the floor striking twice, out ahead of the ones who went round.', options: [{ id: `${p}to3.c`, text: '(The last straight.)', next: `${p}seg3` }] },
    [`${p}seg3`]: {
      speaker: 'narrator',
      text: 'The last straight, past the stands: fire barrels, people standing on car roofs, Dorota at the line with the flag up over her head. Somebody ahead of you. Somebody beside you, close enough to touch.',
      again: 'The last straight past the stands, Dorota at the line with the flag up.',
      options: [
        { id: `${p}seg3.push`, text: '(Push: everything it has left.)', check: { attr: 'reflex', dc: 7 + up, mods: [...pushMods(), { if: { flag: 'dr_cough' }, dc: 2, why: 'the engine is coughing' }] }, effects: [{ inc: 'dr_pos', by: -1 }], next: `${p}finish`, fail: `${p}s3_fade`, failEffects: [{ inc: 'dr_pos', by: 1 }] },
        { id: `${p}seg3.cut`, text: '(Cut across the buggy beside you and make it lift.)', check: { attr: 'grit', dc: 7 + up }, effects: [{ inc: 'dr_pos', by: -1 }], next: `${p}finish`, fail: `${p}crash` },
        { id: `${p}seg3.hold`, text: '(Hold it to the line.)', next: `${p}finish` },
      ],
    },
    [`${p}s3_fade`]: { speaker: 'narrator', text: 'Everything it has left is not quite enough. The engine fades in the last hundred metres and somebody goes by on the outside, close enough to see their teeth.', again: 'It fades in the last hundred metres; somebody goes by on the outside.', options: [{ id: `${p}fade.on`, text: '(Over the line.)', next: `${p}finish` }] },
    [`${p}crash`]: {
      speaker: 'narrator',
      text: 'The world goes sideways. Tyres, sky, tyres, the sound of a door coming off, and then it is quiet and you are hanging in the belts with the buggy on its side and people running, and somewhere a long way off the engines going on without you.',
      again: 'Sideways: tyres, sky, tyres, a door coming off. You hang in the belts while the race goes on without you.',
      effects: [{ set: 'dr_pos', value: 9 }, { set: 'dr_buggy_hurt' }, { set: 'dr_tuned', value: false }],
      interject: [{ companion: WREN, text: 'Wren is the first over the piers, before the flag is down, and has the belts cut before you have worked out which way is up. "Breathing," she says, to herself, not to you. "Fine. Breathing."' }],
      options: [{ id: `${p}crash.out`, text: '(Climb out.)', next: `${p}finish` }],
    },
  };
}

// ---------------------------------------------------------------- the halt, the road, the signs

const loopSeat = (id: string, label: string, location: string, minutes: number, extra?: Cond): OptionDef => ({
  id, text: `${label} (4 Tolls)`, if: { all: [{ flag: 'md_inside' }, TOLLS(4), ...(extra ? [extra] : [])] },
  effects: [{ take: 'tolls', count: 4 }, { event: 'goto', data: { location, spawn: 'loop', minutes } }], exit: true, repeat: true,
});

export const d_dr_loop: DialogueDef = {
  id: 'd_dr_loop', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — CLOVER. The last halt, outside the Wall, where the rail comes out of a portal and stops against a buffer. The fares are painted straight onto the concrete of the portal: PRECINCT 4 · OLD MARKET 4 · LANTERN ROW 4 · THE STACKS 4 · BRIDGEWARD 4. Under them, stencilled: OUT FREE — IN BY THE LENS. The lens on the turnstile is lit red.',
      again: 'OUT FREE — IN BY THE LENS. The turnstile\'s lens, lit red until it has looked at you.',
      effects: [{ learn: 'dr_loop_seen' }],
      options: [
        loopSeat('drloop.precinct', 'The Precinct.', 'md_precinct', 25),
        loopSeat('drloop.market', 'Old Market.', 'md_market', 25, { flag: 'md_market_open' }),
        loopSeat('drloop.lantern', 'Lantern Row.', 'md_lantern', 20),
        loopSeat('drloop.stacks', 'The Stacks.', 'md_stacks', 30),
        loopSeat('drloop.bridgeward', 'Bridgeward.', 'md_bridgeward', 15),
        // the far bank's half of the Loop: a single car round the ring road and over the old ring bridge to Carrick (B5b); outside the Wall, no lens
        { id: 'drloop.quay', text: 'The quay tram, round the ring road to the Docks. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { learn: 'dk_far_bank' }, { event: 'goto', data: { location: 'md_docks', spawn: 'tram', minutes: 25 } }], exit: true, repeat: true },
        { id: 'drloop.lens', text: '(Face the lens.)', if: { not: { flag: 'md_inside' } }, next: 'lens' },
        leave,
      ],
    },
    lens: {
      text: 'The lens looks at you for a long time and stays red. A warden by the buffer does not look up. "It counts people back in," he says. "It doesn\'t count them the first time. The gate does that, on the road south." He turns a page. "Out\'s free."',
      again: 'Red. The warden by the buffer turns a page.',
      effects: [{ learn: 'dr_lens_red' }],
      options: [leave],
    },
  },
};

const SIGN = (id: string, text: string, learn: string, again: string, extra: Partial<NodeDef> = {}): DialogueDef => ({ id, owner: 'narrator', start: [{ node: 'read' }], nodes: { read: { text, again, effects: [{ learn }], options: [leave], ...extra } } });

export const d_md_ring_sign = SIGN('d_md_ring_sign', 'Chalk at the foot of the Wall, an arrow pointing north along it and a word a hand high: RING. Under it, smaller, in another hand: CLOVER — DUSK — 20 TO RUN. Somebody has drawn a buggy as a box on four circles, with a person in it waving.', 'dr_ring_heard', 'RING, and the arrow north. CLOVER — DUSK — 20 TO RUN, and the waving box on four circles.');
export const d_dr_road_sign = SIGN('d_dr_road_sign', 'On the Wall\'s grey face, chalked from knee height to as high as an arm can reach: tally marks in fives, hundreds of them, in a dozen hands. Above them all, in letters a hand high and older than the rest: THE RING BURNS AND YOU COUNT. Under it, newer, in white: WE COUNT TOO.', 'dr_wall_count', 'The tallies in their fives, and over them: THE RING BURNS AND YOU COUNT. WE COUNT TOO.', {
  interject: [{ companion: NINE, text: '"The same sentence is on the Wall at the gate," Nine says. "The first half of it. Nobody there has written the second." It looks at the tallies for longer than it looks at most things.' }],
});
export const d_dr_start = SIGN('d_dr_start', 'A gantry of scaffold pipe over the start line, a lamp either side, a flag on a pole folded along the top, and a board: CLOVER — THREE SEGMENTS: THE STRAIGHT, THE CLOVERLEAF, THE LAST — DUSK — DOROTA\'S FLAG. Painted underneath by a hand that shook: NO GUNS ON THE GRID.', 'dr_rules_read', 'THE STRAIGHT, THE CLOVERLEAF, THE LAST. NO GUNS ON THE GRID.');
export const d_dr_mule: DialogueDef = {
  id: 'd_dr_mule', owner: 'narrator', start: [{ if: { flag: 'dr_buggy', eq: 'mule' }, node: 'yours' }, { node: 'look' }],
  nodes: {
    look: { text: 'The Mule: a buggy of welded doors with a different colour on every door, roll bars of scaffold pipe, two seats of which one is a crate, and an engine that has at one time or another been every engine in the Ring. Painted very small on the bonnet: ONE MORE SEASON.', again: 'The Mule, every door a different colour. ONE MORE SEASON.', effects: [{ learn: 'dr_mule_seen' }], options: [leave] },
    yours: { text: 'The Mule, yours, with ONE MORE SEASON on the bonnet and a new line under it in Emil\'s shaking hand: AND ANOTHER.', again: 'ONE MORE SEASON. AND ANOTHER.', options: [leave] },
  },
};
export const d_dr_slate_sign: DialogueDef = {
  id: 'd_dr_slate_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: [
        { if: { flag: 'dr_final', eq: 'won' }, text: 'The slate on the booth, the final still on it in chalk, with a line drawn under the field and your name over the line. Somebody has added, in a child\'s hand, MULE, and been allowed to.' },
        { if: { flag: 'dr_final' }, text: 'The slate on the booth, the final still on it in chalk and a line drawn under the field, the winner\'s name over the line. Tonight\'s heat is chalked beside it as if nothing had happened.' },
        { if: FINAL_OPEN, text: 'The slate on the booth: THE FINAL — BELLO (HERON) · DURO (PIG) · THE ASPLUND TWINS · A CROWN CAR · MOTH · THE MULE — PURSE 200 AND A CARD. Where a date would go: WHEN THE MULE IS READY.' },
        { if: BELLO_GONE, text: 'The slate on the booth, tonight\'s heat in chalk: DURO (PIG) evens · THE ASPLUND TWINS (ONE BUGGY) 3 · MOTH 4 · OPEN (THE MULE) 6. Where BELLO used to be at the top, a line of chalk that has been rubbed out and drawn again every night.' },
        { text: 'The slate on the booth, tonight\'s heat in chalk: BELLO (HERON) evens · DURO (PIG) 3 · THE ASPLUND TWINS (ONE BUGGY) 4 · MOTH 6 · OPEN (THE MULE) 9. The last line is always open; anyone with twenty can be the Mule.' },
      ],
      again: 'The slate on the booth, the field in chalk, the Mule at nine.',
      effects: [{ learn: 'dr_slate_read' }, { quest: 'q_dr_clover', start: true }],
      options: [leave],
    },
  },
};
export const d_dr_cut: DialogueDef = {
  id: 'd_dr_cut', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Where a ramp of the old cloverleaf came down, a straight scar of rubble runs right across the infield, a buggy wide, from one bend to the far one. Buggies take it: you can see where, in the black on the stones. You can also see the two buggy frames at the bottom of it that did not come out the other side.',
      again: 'The broken ramp across the infield, and the two frames at the bottom of it.',
      effects: [{ learn: 'dr_cut_seen' }],
      passives: [{ attr: 'senses', dc: 7, text: 'The good line is on the left, where the rebar has been driven flat by everyone who made it. On the right there is a lip of concrete a hand high, and both frames are on the right.', effects: [{ learn: 'dr_cut_line' }] }],
      interject: [{ companion: WREN, text: '"That\'s a route," Wren says, with the look she gets about routes. "Not a good one. A route." She walks the left side of it twice before she will say anything else.', effects: [{ learn: 'dr_cut_line' }] }],
      options: [leave],
    },
  },
};
export const d_dr_hound: DialogueDef = {
  id: 'd_dr_hound', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'At the back of the dead tower, under a fall of concrete: a machine the shape of a dog and the size of a pony, legs folded under it, a sensor head the size of a bucket turned to the wall. On its flank, half worn away, a stencil: a lineage number and a mark like a closed hand. Over the stencil, in chalk, children\'s handprints, dozens, small and smaller.',
      again: 'The folded machine, the bucket head to the wall, the children\'s chalk hands over its stencil.',
      effects: [{ learn: 'dr_hound_seen' }],
      passives: [{ skill: 'science', dc: 50, text: 'The power cell under its belly plate is not dead. It is not charging either. It is holding: the way a thing holds that has been told to wait, and is waiting.', effects: [{ learn: 'dr_hound_live' }] }],
      interject: [
        { companion: NINE, text: '"That is not a municipal unit," Nine says. "It has no number I can read." It does not go nearer. "The city has no record of it at all, which is a record of a kind."' },
        { companion: WREN, text: '"Kids touch it for luck," Wren says. "Dogs\' kids did that too, in the salt, with the one by the wreck. Nobody touches it twice."' },
      ],
      options: [
        { id: 'hound.touch', text: '(Put your hand on it, with the children\'s.)', next: 'touch' },
        leave,
      ],
    },
    touch: { text: 'Cold. And under the cold, very faint, something that is not: a hum you feel in your back teeth rather than hear, and then do not feel, and then are not sure you felt. Nothing moves. The sensor head stays turned to the wall.', again: 'Cold, and the hum in your teeth that might not be there.', effects: [{ learn: 'dr_hound_touched' }], options: [leave] },
  },
};

// ---------------------------------------------------------------- the slate: Dorota and the races

const HEAT_START: Effect[] = [{ take: 'tolls', count: 20 }, { set: 'dr_pos', value: 4 }, { set: 'dr_cough', value: false }];
const HEAT_END: Effect[] = [{ inc: 'dr_heats' }, { set: 'dr_hired', value: false }];

export const d_dr_slate: DialogueDef = {
  id: 'd_dr_slate', owner: 'npc_dr_01',
  start: [{ if: { flag: 'dr_slate_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in a booth of sheet metal with a slate, a tin box, and a flag rolled on its pole across her knees, and a face the weather has been working on for fifty years. "Dorota. I drop the flag." She looks at your hands, not your face. "Twenty to run, at dusk. Bring a buggy or hire Emil\'s Mule. No guns on the grid. Jump my flag and you don\'t run here again." She turns the slate round so you can read it. "That\'s the whole of it."',
      again: [{ if: FINAL_OPEN, text: '"The final\'s on the slate," Dorota says. "It waits for the Mule. Nobody else is in a hurry."' }, { text: '"Dusk," Dorota says, before you ask.' }],
      effects: [{ set: 'dr_slate_met' }, { learn: 'dr_rules_heard' }, { quest: 'q_dr_clover', start: true }],
      interject: [{ companion: ODILE, text: '"A book," Odile says, very quietly, while the woman turns the slate. "Somebody keeps a book on this, and it is not her." Dorota hears it, as she was meant to. "No," she says. "It isn\'t."', effects: [{ learn: 'dr_book_heard' }] }],
      options: [
        { id: 'dr.why', text: 'Why races?', next: 'why', once: true },
        { id: 'dr.clean', text: 'You keep them clean?', if: { knows: 'dr_race_law' }, next: 'clean', once: true },
        { id: 'dr.crown', text: 'Who else keeps a book on it?', if: { any: [{ knows: 'dr_book_heard' }, { knows: 'dr_race_law' }] }, next: 'crown', once: true },
        { id: 'dr.heat', text: '(Enter tonight\'s heat. 20 Tolls)', if: { all: [DUSK, TOLLS(20), BUGGY, { not: FINAL_OPEN }] }, effects: HEAT_START, next: 'grid', repeat: true },
        { id: 'dr.final', text: '(Enter the final. 40 Tolls)', if: { all: [DUSK, TOLLS(40), BUGGY, FINAL_OPEN] }, effects: [{ take: 'tolls', count: 40 }, { set: 'dr_pos', value: 4 }, { set: 'dr_cough', value: false }], next: 'f_grid' },
        { id: 'dr.nobuggy', text: 'I want to run tonight.', if: { all: [DUSK, { not: BUGGY }] }, next: 'nobuggy' },
        { id: 'dr.coat', text: '(Put the cut brake line on the counter.) Somebody tied this off with a Crown ribbon.', if: { all: [{ item: 'k_dr_line' }, { not: { flag: 'dr_haverty' } }] }, next: 'coat' },
        { id: 'dr.book', text: '(Put the yard\'s tally book on the counter.) Leven is chalked for burning, and this is who chalks it.', if: { all: [{ item: 'k_dr_yardbook' }, LEVEN_OPEN] }, next: 'leven' },
        { id: 'dr.sami', text: 'The boy who chalks the towers works for Ruben\'s yard. He told me so.', if: { all: [{ knows: 'dr_sami_told' }, { not: { item: 'k_dr_yardbook' } }, LEVEN_OPEN] }, check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'dr_mark_yard' }, dc: -10, why: 'the same mark is on the yard\'s own tally' }, { if: { flag: 'dr_sami', eq: 'pits' }, dc: -10, why: 'the boy works the pits now, where she can ask him herself' }] }, next: 'leven', fail: 'leven_no' },
        bye,
      ],
    },
    again: {
      text: [{ if: FINAL_OPEN, text: '"The final\'s on the slate," Dorota says. "It waits for the Mule. Nobody else is in a hurry."' }, { text: '"Dusk," Dorota says, before you ask.' }],
      again: 'Dorota rolls the flag a turn tighter on its pole and waits.',
      options: [
        { id: 'dr.why.again', text: 'Why races?', if: { not: { seen: 'dr.why' } }, next: 'why' },
        { id: 'dr.clean.again', text: 'You keep them clean?', if: { all: [{ knows: 'dr_race_law' }, { not: { seen: 'dr.clean' } }] }, next: 'clean' },
        { id: 'dr.crown.again', text: 'Who else keeps a book on it?', if: { all: [{ any: [{ knows: 'dr_book_heard' }, { knows: 'dr_race_law' }] }, { not: { seen: 'dr.crown' } }] }, next: 'crown' },
        { id: 'dr.heat.again', text: '(Enter tonight\'s heat. 20 Tolls)', if: { all: [DUSK, TOLLS(20), BUGGY, { not: FINAL_OPEN }] }, effects: HEAT_START, next: 'grid', repeat: true },
        { id: 'dr.final.again', text: '(Enter the final. 40 Tolls)', if: { all: [DUSK, TOLLS(40), BUGGY, FINAL_OPEN] }, effects: [{ take: 'tolls', count: 40 }, { set: 'dr_pos', value: 4 }, { set: 'dr_cough', value: false }], next: 'f_grid' },
        { id: 'dr.nobuggy.again', text: 'I want to run tonight.', if: { all: [DUSK, { not: BUGGY }, { not: { seen: 'dr.nobuggy' } }] }, next: 'nobuggy' },
        { id: 'dr.coat.again', text: '(Put the cut brake line on the counter.) Somebody tied this off with a Crown ribbon.', if: { all: [{ item: 'k_dr_line' }, { not: { flag: 'dr_haverty' } }] }, next: 'coat' },
        { id: 'dr.book.again', text: '(Put the yard\'s tally book on the counter.) Leven is chalked for burning, and this is who chalks it.', if: { all: [{ item: 'k_dr_yardbook' }, LEVEN_OPEN] }, next: 'leven' },
        { id: 'dr.sami.again', text: 'The boy who chalks the towers works for Ruben\'s yard. He told me so.', if: { all: [{ knows: 'dr_sami_told' }, { not: { item: 'k_dr_yardbook' } }, LEVEN_OPEN] }, check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'dr_mark_yard' }, dc: -10, why: 'the same mark is on the yard\'s own tally' }, { if: { flag: 'dr_sami', eq: 'pits' }, dc: -10, why: 'the boy works the pits now, where she can ask him herself' }] }, next: 'leven', fail: 'leven_no' },
        bye,
      ],
    },
    why: {
      text: '"Because the Ring has no law but this one." She taps the slate. "Two people with a quarrel race it. A debt, a stall, a girl, a floor of a tower. Whoever crosses first is right, and everybody keeps it, because everybody might need it next week." She looks along the straight. "And it\'s the only thing out here the Crown comes down to watch. They come for the colour. I take their money for the purse."',
      effects: [{ learn: 'dr_race_law' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    clean: {
      text: 'She doesn\'t answer for a while. "I had a boy who drove. Fast, and stupid, and kind; a Ring boy. Somebody had money on him not finishing and cut his line the night before. He went into the tyres at the cloverleaf at full speed." She rolls the flag a turn tighter. "Twelve years. Mine are not fixed. A fixed race is how people die."',
      effects: [{ learn: 'dr_son' }],
      interject: [{ companion: ILYA, text: 'Ilya says nothing at all, which from Ilya is a whole answer, and nods to her once the way he nods at graves.' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    crown: {
      text: '"On final nights the invitation car comes down the Loop. Young ones from the houses, in coats you could sell for a year, and a man in a better coat who holds their book." She does not look at the stands. "They put up a purse I couldn\'t put up in ten seasons, and a card: a citizen card, Precinct, blank on the name line. Whoever wins writes in it." A beat. "Bello means to write in it."',
      effects: [{ learn: 'dr_card_heard' }, { lead: 'l_dr_card' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    nobuggy: { text: '"With what?" Not unkindly. "Emil hires the Mule for ten a heat. He\'ll want to look at your hands first. Crash her and you owe him for it."', again: '"Emil," she says. "Ten a heat."', options: [{ text: '(Back.)', next: 'again' }] },
    coat: {
      text: 'She turns the length of brake line over in her fingers, and the strip of grey silk round it, the kind the Crown ties its invitations with. For a long moment she is not in the booth at all. Then she stands, which she does not do, and walks to the top of the stands with the line in her fist and the flag under her arm, and says to the man in the good coat, so that everyone at Clover hears it: "Off my Ring." He goes. He takes his book. The young ones on the car roofs laugh, uncertainly, and then less.',
      effects: [{ set: 'dr_haverty', value: 'barred' }, { take: 'k_dr_line' }, { xp: 80 }, { memory: { npc: 'npc_dr_01', tag: 'cut_line_brought', valence: 30, strength: 90 } }, { decision: { id: 'dr_haverty_barred', text: 'You brought Dorota the Heron\'s cut line, and she put the Crown\'s bookman off the Ring.' } }],
      interject: [{ companion: NINE, text: '"A rule," Nine says, "enforced by the person the rule is for." It sounds, for Nine, nearly pleased.', effects: [A(NINE, 2)] }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    leven: {
      text: 'She reads it standing up, the way she read your hands. At dusk, before the flag, she stands on the booth\'s step and reads it again, aloud, to everybody at Clover: the towers, the tonnage, the mark, the road. Nobody says anything. Then a woman on a car roof says, "Not from Ruben, then," and somebody else says it, and by the time the flag drops it is the Ring\'s law: nobody sells Ruben\'s yard a pound of anything, and nobody buys a ton.',
      effects: [{ set: 'dr_leven', value: 'barred' }, { xp: 120 }, { decision: { id: 'dr_leven_barred', text: 'You put the yard\'s chalking in front of Dorota\'s slate, and the Ring stopped trading with Ruben Iturbe. Leven stands.' } }, { news: { tag: 'dr_yard_barred', text: 'the Ring has stopped buying from the salvage yard that chalks towers before they burn', valence: 3, size: 4, at: 'meridian' } }],
      interject: [{ companion: ASH, text: '"Sixty families in that yard," Ash says, when it is done. "And ninety in the tower." He doesn\'t say which number he would have chosen. "The boy, too. Somebody should find the boy something."' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    leven_no: { text: '"A boy said." She doesn\'t write anything. "Boys say. Bring me something I can read out."', again: '"Something I can read out," she says.', options: [{ text: '(Back.)', next: 'again' }] },

    // a heat: the grid, the course, the line
    grid: {
      speaker: 'narrator',
      text: [
        { if: BELLO_GONE, text: 'Six on the line under the gantry, engines ticking. Duro has the Pig where the Heron used to stand and keeps looking at the empty space beside him; the twins in their one buggy are arguing about who steers. Dorota walks out in front of the field with the flag and does not hurry, and the flag goes up, and comes down.' },
        { text: 'Six on the line under the gantry, engines ticking. Bello in the Heron beside you does not look across; the twins in their one buggy are arguing about who steers. Dorota walks out in front of the field with the flag and does not hurry, and the engines rise under her as she goes, and the flag goes up, and comes down.' },
      ],
      again: 'Six on the line, engines ticking. The flag goes up, and comes down.',
      interject: [{ companion: ILYA, text: '"Wind\'s off the Wall," Ilya says at the pier, before the flag. "At the cloverleaf it\'ll push you wide. Lean into it. Right."', effects: [{ learn: 'dr_ilya_wind' }] }],
      options: [{ id: 'grid.go', text: '(Go.)', next: 'seg1' }],
    },
    ...course('', 0),
    finish: {
      speaker: 'narrator',
      text: [
        { if: { all: [{ flag: 'dr_pos', gte: 9 }, BELLO_GONE] }, text: 'You watch the rest of it from the tyres. Duro crosses first in the Pig, waving both arms, which he will pay for at the next bend of his life.' },
        { if: { flag: 'dr_pos', gte: 9 }, text: 'You watch the rest of it from the tyres. The Heron crosses first, the way it does; the flag comes down on it.' },
        { if: { all: [{ flag: 'dr_pos', lte: 1 }, BELLO_GONE] }, text: 'Over the line first, with the Pig\'s nose at your back wheel and the stands up on the car roofs, and Dorota\'s flag coming down on you like a hand on a shoulder.' },
        { if: { flag: 'dr_pos', lte: 1 }, text: 'Over the line first, with the Heron\'s nose at your back wheel and the stands up on the car roofs, and Dorota\'s flag coming down on you like a hand on a shoulder.' },
        { if: { all: [{ flag: 'dr_pos', eq: 2 }, BELLO_GONE] }, text: 'Over the line second, a length behind the Pig. Duro does not lift a hand. Duro never lifts a hand.' },
        { if: { flag: 'dr_pos', eq: 2 }, text: 'Over the line second, a length behind the Heron. Bello lifts one hand off the wheel without looking round, which at Clover is a great deal.' },
        { if: BELLO_GONE, text: 'Over the line somewhere in the field, in the Pig\'s dust. Duro first, which nobody at Clover is used to yet, least of all Duro.' },
        { text: 'Over the line somewhere in the field, in the Heron\'s dust. Bello first. Bello is always first.' },
      ],
      again: 'Over the line, and the flag coming down.',
      options: [
        { id: 'heat.won', text: '(Collect the purse.)', if: { all: [{ flag: 'dr_pos', lte: 1 }, { not: { flag: 'dr_wins', gte: 3 } }] }, effects: [{ give: 'tolls', count: 70 }, { inc: 'dr_wins' }, ...HEAT_END, { decision: { id: 'dr_first_win', text: 'You won a heat at Clover against the Ring\'s champion.' } }], next: 'won', repeat: true },
        { id: 'heat.won.short', text: '(Collect the purse.)', if: { all: [{ flag: 'dr_pos', lte: 1 }, { flag: 'dr_wins', gte: 3 }] }, effects: [{ give: 'tolls', count: 45 }, { inc: 'dr_wins' }, ...HEAT_END], next: 'won_short', repeat: true },
        { id: 'heat.second', text: '(Collect for second.)', if: { flag: 'dr_pos', eq: 2 }, effects: [{ give: 'tolls', count: 30 }, ...HEAT_END], next: 'second', repeat: true },
        { id: 'heat.back', text: '(Walk back to the slate.)', if: { flag: 'dr_pos', gte: 3 }, effects: HEAT_END, next: 'back', repeat: true },
      ],
    },
    won: { text: [{ if: BELLO_GONE, text: '"First." Dorota writes it on the slate with the chalk held like a knife, and pays seventy out of the tin box without counting it twice.' }, { text: '"First." Dorota writes it on the slate with the chalk held like a knife, and pays seventy out of the tin box without counting it twice. Across the pits Bello has climbed out of the Heron and is looking at you, properly, for the first time.' }], again: '"First," Dorota says, and pays seventy.', effects: [{ set: 'dr_beat_bello' }], options: [{ text: '(Step back from the booth.)', exit: true }] },
    won_short: { text: '"First." She pays forty-five. "The book pays short on you now. Everybody backs you." She doesn\'t say it as a compliment or as anything else.', again: '"First. Forty-five. The book pays short on you."', options: [{ text: '(Step back from the booth.)', exit: true }] },
    second: { text: [{ if: BELLO_GONE, text: '"Second." Thirty out of the box. "Second to Duro. He\'ll be unbearable."' }, { text: '"Second." Thirty out of the box. "Second to Bello is first to anybody else."' }], again: '"Second," she says, and pays thirty.', options: [{ text: '(Step back from the booth.)', exit: true }] },
    back: { text: '"Next time." She doesn\'t look up from the slate. "Everybody\'s next time, at Clover."', again: '"Next time," Dorota says.', options: [{ text: '(Step back from the booth.)', exit: true }] },

    // the final: the same course, one harder; the Coat's work on the Heron, if nobody undid it
    f_grid: {
      speaker: 'narrator',
      text: [
        { if: { flag: 'dr_haverty', eq: 'barred' }, text: 'The final. No invitation car on the halt tonight: the Crown has gone back up the Loop with its book, and the stands are the Ring\'s own, standing on its own car roofs. Six on the line. Bello in the Heron beside you looks across, once, and nods. The flag goes up, and comes down.' },
        { text: 'The final. The invitation car is on the halt with its lamps lit, and a dozen young people in coats you could sell for a year are on the best car roofs at the stands, with the man in the good coat among them holding his book open on his knee. Six on the line. Bello in the Heron beside you looks across, once, and nods. The flag goes up, and comes down.' },
      ],
      again: 'The final. Six on the line, and the flag.',
      options: [{ id: 'f_grid.go', text: '(Go.)', next: 'f_seg1' }],
    },
    ...course('f_', 1),
    f_seg2_crash: {
      speaker: 'narrator',
      text: 'Into the cloverleaf, and ahead of you the Heron\'s brake light does not come on. She goes into the first bend at the speed of the straight and through the tyres and over the pier, and the Heron turns over twice in the infield and stops on its roof among the broken pillars. Nobody in the field lifts. You are a place further up, and the bends are coming.',
      again: 'The Heron\'s brake light that did not come on; the tyres, the pier, the roof among the pillars.',
      effects: [{ set: 'dr_bello', value: 'crippled' }, { inc: 'dr_pos', by: -1 }, { decision: { id: 'dr_bello_crippled', text: 'The Heron\'s brakes went at the cloverleaf in the final at Clover. Nkechi Bello lived; her leg did not.' } }],
      interject: [{ companion: TAMSIN, text: 'Tamsin is on her feet on the car roof, and you see her mouth say *her line*, and then the dust takes her.' }],
      options: [
        { id: 'f_seg2c.push', text: '(Push through the bends, past the wreck.)', check: { attr: 'reflex', dc: 9, mods: [...pushMods([WIND, LEAN]), COUGH] }, effects: [{ inc: 'dr_pos', by: -1 }], next: 'f_s2_push', fail: 'f_crash' },
        { id: 'f_seg2c.hold', text: '(Hold your line through the bends.)', next: 'f_s2_hold' },
      ],
    },
    f_finish: {
      speaker: 'narrator',
      text: [
        { if: { flag: 'dr_pos', gte: 9 }, text: 'You watch the end of the final from the tyres, hanging in your belts.' },
        { if: { flag: 'dr_pos', lte: 1 }, text: 'Over the line first, in the final, with the whole of the Ring on its car roofs and Dorota\'s flag coming down on you like a hand on a shoulder.' },
        { if: { flag: 'dr_bello', eq: 'crippled' }, text: 'Over the line in the field, behind the Crown\'s car, which crosses first to applause from its own roof. Out in the infield, people are lifting the Heron off somebody.' },
        { text: 'Over the line behind the Heron. Bello crosses first with both hands off the wheel and the stands coming down off their roofs to meet her.' },
      ],
      again: 'The final, over the line.',
      options: [
        { id: 'final.won', text: '(Walk up to the booth.)', if: { flag: 'dr_pos', lte: 1 }, next: 'f_won' },
        { id: 'final.bello2', text: '(Walk up to the booth.)', if: { all: [{ flag: 'dr_pos', eq: 2 }, { not: { flag: 'dr_bello', eq: 'crippled' } }] }, next: 'f_bello_second' },
        { id: 'final.bello', text: '(Walk up to the booth.)', if: { all: [{ flag: 'dr_pos', gte: 3 }, { not: { flag: 'dr_bello', eq: 'crippled' } }] }, next: 'f_bello' },
        { id: 'final.other', text: '(Walk up to the booth.)', if: { all: [{ not: { flag: 'dr_pos', lte: 1 } }, { flag: 'dr_bello', eq: 'crippled' }] }, next: 'f_other' },
      ],
    },
    f_won: {
      text: [
        { if: { flag: 'dr_bello', eq: 'crippled' }, text: 'Dorota pays it out of the Crown\'s purse, two hundred, and then, from inside her coat, the card in its envelope with the Crown\'s grey ribbon, and puts it in your hand without looking at it. She is looking at the infield, where they have got the Heron off its roof, and off the woman under it.' },
        { text: 'Dorota pays it out of the Crown\'s purse, two hundred, and then, from inside her coat, the card in its envelope with the Crown\'s grey ribbon, and puts it in your hand and closes your fingers on it with her own. "Write in it," she says, "or don\'t. It\'s yours." Across the pits Bello is sitting on the Heron\'s bonnet with her helmet in her lap, looking at the envelope and not at you.' },
      ],
      again: '"It\'s yours," Dorota says.',
      effects: [{ give: 'tolls', count: 200 }, { give: 'k_dr_card' }, { set: 'dr_final', value: 'won' }, { set: 'dr_hired', value: false }, { inc: 'dr_heats' }, { xp: 150 }, { decision: { id: 'dr_final', text: 'You won the final at Clover, and the Crown\'s blank citizen card with it.' } }, { news: { tag: 'dr_final_won', text: 'a stranger in Emil\'s Mule won the final at Clover, and the Crown\'s card with it', valence: 2, size: 5, at: 'meridian' } }],
      options: [{ text: '(Step back from the booth.)', exit: true }],
    },
    f_bello_second: {
      text: 'Sixty for second, out of the Crown\'s purse. Bello has the envelope already; she is writing in the card on the Heron\'s bonnet with a pencil stub, slowly, and does not look up until she has finished her name. Then she looks across the pits and lifts one hand to you, and keeps it there.',
      again: 'Bello, writing her name on the Heron\'s bonnet.',
      effects: [{ give: 'tolls', count: 60 }, { set: 'dr_final', value: 'bello' }, { set: 'dr_hired', value: false }, { inc: 'dr_heats' }, { xp: 100 }, { decision: { id: 'dr_final', text: 'Nkechi Bello won the final at Clover, and the Crown\'s card with it. You came second.' } }],
      options: [{ text: '(Step back from the booth.)', exit: true }],
    },
    f_bello: {
      text: 'Bello has the envelope; she is writing in the card on the Heron\'s bonnet with a pencil stub, slowly, while the Ring stands round her and says nothing, so as not to put her off her letters.',
      again: 'Bello, writing her name on the Heron\'s bonnet.',
      effects: [{ set: 'dr_final', value: 'bello' }, { set: 'dr_hired', value: false }, { inc: 'dr_heats' }, { xp: 60 }, { decision: { id: 'dr_final', text: 'Nkechi Bello won the final at Clover, and the Crown\'s card with it.' } }],
      options: [{ text: '(Step back from the booth.)', exit: true }],
    },
    f_other: {
      text: 'The Crown\'s car takes the purse and the card both, and the young people on its roof take the card back up the Loop with them, laughing, to give to somebody\'s cook. Dorota pays nobody anything. She is looking out at the infield, where they have got the Heron off its roof.',
      again: 'The card going back up the Loop. Dorota, looking at the infield.',
      effects: [{ set: 'dr_final', value: 'other' }, { set: 'dr_hired', value: false }, { inc: 'dr_heats' }, { decision: { id: 'dr_final', text: 'The Crown\'s own car won the final at Clover, and took its card back up the Loop.' } }],
      options: [{ text: '(Step back from the booth.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- Bello

const BELLO_SETTLE = (how: string): Effect[] => [{ set: 'dr_bello', value: 'inside' }, { set: 'dr_bello_how', value: how }, { set: 'dr_bello_settled' }];

export const d_dr_bello: DialogueDef = {
  id: 'd_dr_bello', owner: 'npc_dr_02',
  start: [
    { if: { flag: 'dr_bello', eq: 'crippled' }, node: 'crippled' },
    { if: { all: [{ flag: 'dr_final' }, { not: { flag: 'dr_bello_settled' } }] }, node: 'after_final' },
    { if: { flag: 'dr_bello_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'dr_heats', gte: 1 }, text: '"The Mule." A woman under the grey-white buggy slides out on a board and sits up, black to the wrists. "You drove it like you meant it to finish. Nobody means the Mule to finish." She wipes a hand on her jacket, which does nothing. "Bello. That\'s the Heron. Don\'t lean on her."' },
        { text: 'A woman under a grey-white buggy slides out on a board and sits up, black to the wrists, and looks at you the way drivers look at a road. "Not racing?" She wipes a hand on her jacket, which does nothing. "Bello. That\'s the Heron. Don\'t lean on her."' },
      ],
      again: [{ if: { flag: 'dr_card', eq: 'sold' }, text: '"The Coat\'s got it back," she says to the engine, not to you. "He\'ll sell it upstairs to somebody\'s cook."' }, { if: { flag: 'dr_card', eq: 'kept' }, text: 'She doesn\'t come out from under the Heron.' }, { text: 'She slides out from under the Heron on her board. "Mule."' }],
      effects: [{ set: 'dr_bello_met' }, { learn: 'dr_bello_seen' }],
      interject: [{ companion: WREN, text: '"You lean before the bend," Wren says, "not in it." Bello looks at her properly. "Who taught you that?" "A boy called Brindle, on a buggy with a dog burned into the seat." Bello almost smiles. "Petrov\'s seat, in Bridgeward. I\'ve sat in it."', effects: [{ learn: 'dr_bello_lean' }] }],
      options: [
        { id: 'bello.why', text: 'What are you racing for?', next: 'why', once: true },
        { id: 'bello.heron', text: 'The Heron.', next: 'heron', once: true },
        { id: 'bello.court', text: 'The Court of Accounts voided forecast fines. Yours was one.', if: { all: [{ knows: 'dr_bello_why' }, { flag: 'prec_forecast_fine', eq: 'void' }, { not: { flag: 'dr_bello_court' } }] }, next: 'court' },
        { id: 'bello.line', text: 'Somebody\'s been at the Heron. Look at the rear brake line.', if: { all: [{ knows: 'dr_line_seen' }, { not: { flag: 'dr_line' } }] }, next: 'told' },
        { id: 'bello.warn', text: 'Watch the Heron tonight. The Crown\'s book needs you not to finish.', if: { all: [{ knows: 'dr_haverty_offer' }, { not: { knows: 'dr_line_seen' } }, { not: { flag: 'dr_line' } }] }, next: 'told' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'dr_card', eq: 'sold' }, text: '"The Coat\'s got it back," she says to the engine, not to you. "He\'ll sell it upstairs to somebody\'s cook."' }, { if: { flag: 'dr_card', eq: 'kept' }, text: 'She doesn\'t come out from under the Heron.' }, { text: 'She slides out from under the Heron on her board. "Mule."' }],
      again: 'Bello, under the Heron, a spanner going.',
      options: [
        { id: 'bello.why.again', text: 'What are you racing for?', if: { not: { seen: 'bello.why' } }, next: 'why' },
        { id: 'bello.heron.again', text: 'The Heron.', if: { not: { seen: 'bello.heron' } }, next: 'heron' },
        { id: 'bello.court.again', text: 'The Court of Accounts voided forecast fines. Yours was one.', if: { all: [{ knows: 'dr_bello_why' }, { flag: 'prec_forecast_fine', eq: 'void' }, { not: { flag: 'dr_bello_court' } }] }, next: 'court' },
        { id: 'bello.line.again', text: 'Somebody\'s been at the Heron. Look at the rear brake line.', if: { all: [{ knows: 'dr_line_seen' }, { not: { flag: 'dr_line' } }] }, next: 'told' },
        { id: 'bello.warn.again', text: 'Watch the Heron tonight. The Crown\'s book needs you not to finish.', if: { all: [{ knows: 'dr_haverty_offer' }, { not: { knows: 'dr_line_seen' } }, { not: { flag: 'dr_line' } }] }, next: 'told' },
        bye,
      ],
    },
    why: {
      text: '"A card." She says it flatly, as if it were the name of a part. "I had one. Precinct, a stall on the avenue, three years. Then a notice: AHEAD OF PLAN. They fined me for a second stall I hadn\'t opened yet, because I was going to, and the fine voided the card, and the gate put me out with the line." She turns a spanner over. "My brother\'s twelve. Kunle. He stayed in, a ward, in a school with a bell. Fridays I stand at the gate and he stands at the other side of it." She puts the spanner down. "The Crown puts a card on the final. I mean to write my name in it."',
      effects: [{ learn: 'dr_bello_why' }, { lead: 'l_dr_fine' }],
      interject: [
        { companion: NINE, text: '"Clause 31," Nine says. "A forecast fine. They are lawful." A pause in which its lens does not move. "I have logged three hundred and four of them as errors. Yours will be one of the four."' },
        { companion: TAMSIN, text: '"Fined for something you hadn\'t done yet," Tamsin says. "That\'s —" She stops. "We had a word for that, inside. It was *schedule*."' },
      ],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    heron: {
      text: '"An airport tug, before the Burn. Emil found the frame in a hangar on the Flats and I paid him for her in a year of Fridays." She puts a hand flat on the bonnet. "She\'s heavy in the nose. You lean before the bend, not in it, or she goes straight on into the tyres like a horse that\'s decided." She shrugs. "Now you know. It won\'t help you in the Mule."',
      effects: [{ learn: 'dr_bello_lean' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    court: {
      text: 'She listens all the way through without moving. "The rail. Anybody can stand at it." She says it to the Heron. "And it reads what\'s put on it. My notice. My stall that wasn\'t." She is quiet a while. "I\'ll race the final. I\'ve earned the final. Then I\'ll go to the rail, whatever the flag says." She looks up. "Thank you. I don\'t say that at Clover."',
      effects: [{ set: 'dr_bello_court' }, { learn: 'dr_bello_court' }, { xp: 60 }, { trust: { npc: 'npc_dr_02', by: 20 } }, { decision: { id: 'dr_bello_court', text: 'You told Nkechi Bello the Court of Accounts had voided forecast fines; she means to contest her own.' } }],
      interject: [{ companion: TAMSIN, text: '"It reads what\'s on the rail," Tamsin says. "That\'s all it reads. Put him on it too. Your brother. Put everything on it."', effects: [A(TAMSIN, 3)] }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    told: {
      text: 'She is under the Heron before you have finished the sentence. When she comes out she has the rear line in her hand, a length of it, cut most of the way through and tied off with a strip of grey silk so that it would hold until it was asked to stop hard. "The cloverleaf," she says. "At the cloverleaf." She has gone grey under the oil. "Who."',
      again: 'Bello, the cut length of line in her hand.',
      effects: [{ set: 'dr_line', value: 'told' }, { give: 'k_dr_line' }, { learn: 'dr_line_seen' }, { trust: { npc: 'npc_dr_02', by: 25 } }, { xp: 60 }, { decision: { id: 'dr_line', text: 'You warned Nkechi Bello about the Heron\'s brake line before the final.' } }],
      interject: [{ companion: WREN, text: '"Somebody paid for that," Wren says. "Somebody always pays for that." She looks at the stands, where the good coat sits in the evenings.', effects: [A(WREN, 3)] }],
      options: [
        { id: 'told.coat', text: 'The Crown\'s bookman. Take it to Dorota.', next: 'told_coat' },
        { id: 'told.mend', text: 'Mend it. Then win.', next: 'told_mend' },
      ],
    },
    told_coat: { text: '"Dorota." She gives you the length of line back. "You take it. She\'ll believe it more from somebody who didn\'t need it." She goes back under the Heron with a new length of line and does not come out again.', again: 'Bello, under the Heron, a new line going in.', options: [bye] },
    told_mend: { text: '"Both." A new length of line from Emil\'s box, and her hands steady again by the time it\'s in. "Win, I mean. You\'ll have to beat me for it now." She almost smiles. "Keep that. Somebody should see it."', again: 'Bello, under the Heron, a new line going in.', options: [bye] },
    after_final: {
      text: [
        { if: { all: [{ flag: 'dr_final', eq: 'won' }, { flag: 'dr_bello_court' }] }, text: '"You took it." She has her jacket on and her helmet hung on the Heron\'s roll bar. "Good. Keep the card. Give it to somebody the Court can\'t help; there are plenty of those in the line." She puts a bent nail on a wire in your hand: the Heron\'s key. "I\'m going to the rail. She\'s yours. Lean before the bend."' },
        { if: { flag: 'dr_final', eq: 'won' }, text: '"First." She says it like a verdict, sitting on the Heron\'s bonnet with her helmet in her lap. The envelope is in your pocket and she is not looking at it, carefully. "Write in it, then." She does not ask. She will not ask.' },
        { if: { flag: 'dr_bello_court' }, text: 'She has her card and her jacket and she is standing by the Heron as if she has forgotten how to leave it. "I don\'t need the rail now," she says. "I\'ll stand at it anyway. For the four." She puts a bent nail on a wire in your hand: the Heron\'s key. "She\'s yours. Lean before the bend."' },
        { text: 'She has the card in her jacket, buttoned in, and her hand on it. "Friday," she says. "I\'ll be on the right side of the gate for once." She puts a bent nail on a wire in your hand: the Heron\'s key. "She\'s yours. You drove her line in the Mule; you\'ll drive it better in her. Lean before the bend."' },
      ],
      again: 'Bello, by the Heron, not leaving yet.',
      options: [
        { id: 'after.give', text: '(Give her the card.)', if: { all: [{ flag: 'dr_final', eq: 'won' }, { item: 'k_dr_card' }, { not: { flag: 'dr_bello_court' } }] }, next: 'given' },
        { id: 'after.keep', text: '(Keep it.)', if: { all: [{ flag: 'dr_final', eq: 'won' }, { item: 'k_dr_card' }, { not: { flag: 'dr_bello_court' } }] }, next: 'kept' },
        { id: 'after.go.court', text: '(Let her go.)', if: { all: [{ flag: 'dr_final', eq: 'won' }, { flag: 'dr_bello_court' }] }, effects: [...BELLO_SETTLE('court'), { set: 'dr_card', value: 'kept' }], next: 'gone' },
        { id: 'after.go', text: '(Let her go.)', if: { flag: 'dr_final', eq: 'bello' }, effects: BELLO_SETTLE('race'), next: 'gone' },
        { id: 'after.later', text: '(Not yet.)', if: { all: [{ flag: 'dr_final', eq: 'won' }, { not: { flag: 'dr_bello_court' } }] }, exit: true },
      ],
    },
    given: {
      text: 'She takes the envelope as if it might go off. She writes in the card on the Heron\'s bonnet with a pencil stub, NKECHI BELLO, slowly, and looks at it for a long time. Then she puts a bent nail on a wire in your hand: the Heron\'s key. "She\'s yours. Lean before the bend." She goes up the halt with her jacket over her shoulder and does not look back at the Ring once, which is how you know what it costs her.',
      again: 'The Heron\'s key, a bent nail on a wire, in your hand.',
      effects: [{ take: 'k_dr_card' }, { set: 'dr_card', value: 'given' }, ...BELLO_SETTLE('card'), { set: 'dr_buggy', value: 'heron' }, { xp: 80 }, { decision: { id: 'dr_card', text: 'You gave Nkechi Bello the card you won at Clover. She went in to her brother, and left you the Heron.' } }, { news: { tag: 'dr_bello_inside', text: 'Clover\'s champion went in through the gate with a card the Crown put up for its own amusement', valence: 4, size: 5, at: 'meridian' } }],
      interject: [
        { companion: WREN, text: '"That\'s keeping a promise you never made," Wren says, watching her go up the halt. It is, from Wren, the highest thing there is.', effects: [A(WREN, 5)] },
        { companion: TAMSIN, text: 'Tamsin watches her all the way up the halt. "Fridays," she says. "On the same side." She has to look away.', effects: [A(TAMSIN, 5)] },
        { companion: ASH, text: '"Freely given," Ash says. "That\'s rare." He says it the way he says a prayer.', effects: [A(ASH, 3)] },
      ],
      options: [bye],
    },
    kept: {
      text: '"It\'s yours." She slides back under the Heron on her board. Nothing else. The spanner starts again, steady, and does not stop while you are standing there.',
      again: 'The spanner under the Heron, steady.',
      effects: [{ set: 'dr_card', value: 'kept' }, { set: 'dr_bello', value: 'stays' }, { set: 'dr_bello_settled' }, { decision: { id: 'dr_card', text: 'You kept the card you won at Clover. Nkechi Bello stayed in the Ring.' } }],
      interject: [{ companion: WREN, text: '"Fair," Wren says, later, on the road, in Kessler\'s voice, and then nothing else about it at all.', effects: [A(WREN, -3)] }],
      options: [bye],
    },
    gone: {
      text: 'She goes up the halt with her jacket over her shoulder. At the turnstile the lens looks at her for a long time and goes green, and she stands there a moment longer than she needs to, letting it.',
      again: 'The turnstile, gone green.',
      effects: [{ set: 'dr_buggy', value: 'heron' }, { decision: { id: 'dr_bello_inside', text: 'Nkechi Bello went in through the gate, and left you the Heron.' } }],
      options: [bye],
    },
    crippled: {
      text: [
        { if: { flag: 'dr_paid' }, text: 'Bello, in a chair in the pits with her leg out straight in a splint of two tyre irons, looking at the Heron on its blocks with its roof stove in. "Somebody cut it," she says. "And somebody was paid. The Coat\'s book paid out on the Heron not finishing; the whole Ring knows it." She doesn\'t look at you. She doesn\'t have to.' },
        { text: 'Bello, in a chair in the pits with her leg out straight in a splint of two tyre irons, looking at the Heron on its blocks with its roof stove in. "Somebody cut it," she says. "Tied it off with ribbon so it would hold till the cloverleaf." She doesn\'t look away from the buggy. "Emil says I\'ll walk. He says it like a weld he isn\'t sure of."' },
      ],
      again: 'Bello in the chair, the splint, the Heron on its blocks.',
      options: [
        { id: 'crippled.tell', text: '(Tell her you took the Coat\'s money.)', if: { all: [{ flag: 'dr_paid' }, { not: { seen: 'crippled.tell' } }] }, next: 'confess' },
        bye,
      ],
    },
    confess: { text: 'She hears it out. Then she turns her head and looks at you for the first time, and it is not anger, or not only; it is a driver reading a road that has killed somebody. "Get out of my pits," she says. "And don\'t come to Clover again on a night I\'m here."', again: '"Get out of my pits."', effects: [{ set: 'dr_confessed' }, { memory: { npc: 'npc_dr_02', tag: 'paid_for_the_line', valence: -60, strength: 100 } }], options: [{ text: '(Go.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- Emil and the pits

const HAS_A_BUGGY: Cond = { any: [{ flag: 'dr_hired' }, { flag: 'dr_buggy' }] };
const emilOptions = (sfx: string): OptionDef[] => [
  { id: `emil.hire${sfx}`, text: '(Hire the Mule for tonight. 10 Tolls)', if: { all: [{ not: HAS_A_BUGGY }, { not: { flag: 'dr_buggy_hurt' } }, TOLLS(10)] }, effects: [{ take: 'tolls', count: 10 }, { set: 'dr_hired' }], next: 'hired', repeat: true },
  { id: `emil.tune${sfx}`, text: '(Pay him to tune it. 15 Tolls)', if: { all: [HAS_A_BUGGY, { not: { flag: 'dr_tuned' } }, { not: { flag: 'dr_buggy_hurt' } }, TOLLS(15)] }, effects: [{ take: 'tolls', count: 15 }, { set: 'dr_tuned' }, { time: 60 }], next: 'tuned', repeat: true },
  { id: `emil.tuneself${sfx}`, text: '(Tune it yourself on his bench.)', if: { all: [HAS_A_BUGGY, { not: { flag: 'dr_tuned' } }, { not: { flag: 'dr_buggy_hurt' } }] }, check: { skill: 'mechanics', dc: 45 }, effects: [{ set: 'dr_tuned' }, { time: 90 }], next: 'tuned_self', fail: 'tune_no', failEffects: [{ time: 60 }] },
  { id: `emil.repair${sfx}`, text: '(Pay for the repairs. 25 Tolls)', if: { all: [{ flag: 'dr_buggy_hurt' }, TOLLS(25)] }, effects: [{ take: 'tolls', count: 25 }, { set: 'dr_buggy_hurt', value: false }, { time: 120 }], next: 'repaired', repeat: true },
  { id: `emil.heron${sfx}`, text: 'Who\'s been at the Heron at night?', if: { all: [FINAL_OPEN, { not: { flag: 'dr_line' } }, { not: { knows: 'dr_coat_seen' } }] }, next: 'heron_who' },
  { id: `emil.fix${sfx}`, text: '(Pay him to look at the Heron\'s brake line. 20 Tolls)', if: { all: [FINAL_OPEN, { any: [{ knows: 'dr_line_seen' }, { knows: 'dr_coat_seen' }] }, { not: { flag: 'dr_line' } }, TOLLS(20)] }, effects: [{ take: 'tolls', count: 20 }, { set: 'dr_line', value: 'fixed' }, { give: 'k_dr_line' }, { learn: 'dr_line_seen' }, { decision: { id: 'dr_line', text: 'Emil mended the Heron\'s cut brake line before the final, on your money.' } }], next: 'fixed' },
  { id: `emil.sami${sfx}`, text: 'There\'s a boy who chalks towers for the yard. He needs work that isn\'t chalk.', if: { all: [{ knows: 'dr_sami_told' }, { not: { flag: 'dr_sami' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { inParty: ASH }, dc: -10, why: 'Ash speaks for the boy' }, { if: { flag: 'dr_beat_bello' }, dc: -5, why: 'you have won at Clover; Emil listens to winners' }] }, next: 'sami_ok', fail: 'sami_no' },
  { id: `emil.buy${sfx}`, text: '(Buy the Mule. 120 Tolls)', if: { all: [{ flag: 'dr_final' }, { not: { flag: 'dr_buggy' } }, TOLLS(120)] }, effects: [{ take: 'tolls', count: 120 }, { set: 'dr_buggy', value: 'mule' }, { set: 'dr_hired', value: false }, { decision: { id: 'dr_buggy', text: 'You bought Emil\'s Mule.' } }], next: 'bought' },
  { text: 'Parts.', effects: [{ event: 'barter' }], exit: true, repeat: true },
  bye,
];

export const d_dr_emil: DialogueDef = {
  id: 'd_dr_emil', owner: 'npc_dr_03',
  start: [{ if: { flag: 'dr_emil_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old man at a bench in a scrap shed, welding with a hand that shakes until the arc strikes and then does not. He pushes the mask up. "Emil. I built every buggy in the Ring, or built it twice." He looks at you, then at your hands, for longer. "Ten a heat for the Mule. Crash her and you owe me twenty-five before she runs again. Fifteen and I tune her for you, or you can use my bench if your hands know a bench."',
      again: [{ if: { flag: 'dr_buggy_hurt' }, text: '"Twenty-five," Emil says, looking at what you brought back. "And a day."' }, { text: '"Hands," Emil says, by way of hello, and goes back to the weld.' }],
      effects: [{ set: 'dr_emil_met' }, { learn: 'dr_emil_seen' }],
      options: emilOptions(''),
    },
    again: {
      text: [{ if: { flag: 'dr_buggy_hurt' }, text: '"Twenty-five," Emil says, looking at what you brought back. "And a day."' }, { text: '"Hands," Emil says, by way of hello, and goes back to the weld.' }],
      again: 'Emil, the arc going, his hand steady inside it.',
      options: emilOptions('.again'),
    },
    hired: { text: 'He tosses you a bent nail on a wire. "She pulls left under braking. Everybody says she pulls left. She pulls left because everybody steers right." He goes back to the weld.', again: 'The Mule\'s nail on its wire. "She pulls left."', options: [{ text: '(Back.)', next: 'again' }] },
    tuned: { text: 'An hour under the Mule with a lamp, a file and a jug of something that is not fuel. When he comes out the engine has a different note, deeper, like a dog that has stopped being afraid. "Till you crash her," he says.', again: 'The Mule ticking over with its new note. "Till you crash her."', options: [{ text: '(Back.)', next: 'again' }] },
    tuned_self: { text: 'An hour and a half on his bench with his tools, while he pretends not to watch. When you are done he listens to the engine with his head on one side. "Yes," he says, as if somebody had asked him something else. "Till you crash her."', again: '"Yes," Emil says, listening to the engine.', options: [{ text: '(Back.)', next: 'again' }] },
    tune_no: { text: 'An hour on his bench, and the engine sounds like it did, only more so. Emil takes the file out of your hand, gently. "Fifteen," he says. "Or another day."', again: '"Fifteen," Emil says. "Or another day."', options: [{ text: '(Back.)', next: 'again' }] },
    repaired: { text: 'Two hours, a new door, a roll bar straightened over his knee. "Twenty-five," he says, though you have paid it. "Everybody pays twenty-five once. Some of them pay it every week."', again: '"Everybody pays twenty-five once."', options: [{ text: '(Back.)', next: 'again' }] },
    heron_who: { text: '"The Coat." He doesn\'t look up. "Two nights back, with a lamp, at the Heron, when he thought I was asleep." He looks at his hands. "I am, mostly. Not that night."', effects: [{ learn: 'dr_coat_seen' }, { lead: 'l_dr_coat' }], options: [{ text: '(Back.)', next: 'again' }] },
    fixed: { text: 'He is under the Heron for a quarter of an hour, and comes out with a length of brake line cut most of the way through and tied off with a strip of grey silk. He puts it in your hand. "Crown ribbon," he says. "They tie their invitations with it." He goes back to the bench and does not weld anything for a long time.', again: 'The cut line, the grey silk. Emil not welding.', options: [{ text: '(Back.)', next: 'again' }] },
    sami_ok: { text: '"A boy." He thinks about it with his whole face. "My hands shake. A boy\'s don\'t." He looks at the Mule. "Send him. Water, a cot in the shed, a tenth of what I make on the Mule. He chalks nothing for anybody."', effects: [{ set: 'dr_sami', value: 'pits' }, { xp: 50 }, { decision: { id: 'dr_sami', text: 'You got Sami work in Emil\'s pits instead of chalking towers for the yard.' } }], interject: [{ companion: ASH, text: '"Thank you," Ash says to the old man, as if it were his own boy. Afterwards, on the road, he says nothing for a mile, and then: "That\'s how it\'s done. Not the sermon. The cot."', effects: [A(ASH, 5)] }], options: [{ text: '(Back.)', next: 'again' }] },
    sami_no: { text: '"I\'ve had boys." He doesn\'t look up. "They steal the fuel."', again: '"They steal the fuel," Emil says.', options: [{ text: '(Back.)', next: 'again' }] },
    bought: { text: 'He takes the money and paints, very small, under ONE MORE SEASON on her bonnet: AND ANOTHER. "She\'s yours. She pulls left."', again: '"She pulls left."', options: [{ text: '(Back.)', next: 'again' }] },
  },
};

// the Heron on its blocks in the pits
export const d_dr_heron: DialogueDef = {
  id: 'd_dr_heron', owner: 'narrator',
  start: [{ if: { flag: 'dr_buggy', eq: 'heron' }, node: 'yours' }, { if: { flag: 'dr_bello', eq: 'crippled' }, node: 'wreck' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'The Heron: a buggy built on the frame of a pre-war airport tug, long in the nose, painted grey-white and kept the way nothing else in the Ring is kept. The seat is bolted low. The tyres are not the same make as one another and are all in better condition than anything on the Mule.',
      again: 'The Heron, grey-white and long in the nose, the seat bolted low.',
      effects: [{ learn: 'dr_heron_seen' }],
      passives: [{ skill: 'mechanics', dc: 55, if: LINE_CUT, text: 'The rear brake line has been cut most of the way through and tied off with a strip of grey silk, neatly, by somebody who wanted it to hold until it was asked to stop hard.', effects: [{ learn: 'dr_line_seen' }] }],
      options: [
        { id: 'heron.line', text: '(Look at the brake lines.)', if: { all: [LINE_CUT, { not: { knows: 'dr_line_seen' } }] }, check: { skill: 'mechanics', dc: 40, mods: [{ if: { knows: 'dr_coat_seen' }, dc: -10, why: 'you know somebody was at it at night' }] }, next: 'line_cut', fail: 'line_no' },
        { id: 'heron.fix', text: '(Mend the cut line yourself.)', if: { all: [LINE_CUT, { knows: 'dr_line_seen' }] }, check: { skill: 'mechanics', dc: 40 }, effects: [{ set: 'dr_line', value: 'fixed' }, { give: 'k_dr_line' }, { time: 60 }, { xp: 60 }, { decision: { id: 'dr_line', text: 'You mended the Heron\'s cut brake line before the final.' } }], next: 'fixed', fail: 'fix_no' },
        leave,
      ],
    },
    line_cut: { text: 'Under the rear axle, by your lamp: the brake line cut most of the way through and tied off with a strip of grey silk, so that it would hold until somebody stood on the brake at the end of a straight. The cloverleaf is at the end of a straight.', again: 'The cut line under the rear axle, the grey silk round it.', effects: [{ learn: 'dr_line_seen' }], options: [leave] },
    line_no: { text: 'Lines, unions, a lot of tape. It all looks like a buggy. Emil would know.', again: 'It all looks like a buggy.', options: [leave] },
    fixed: { text: 'Half an hour on your back under the Heron with a length of line from Emil\'s box. The cut piece comes away in your hand with its grey silk still tied on.', again: 'The new line in, the cut piece in your pocket.', options: [leave] },
    fix_no: { text: 'You get the old line off and the new one will not seat. Emil, watching from the shed door, says nothing, which is advice.', again: 'The new line will not seat. Emil, at the shed door.', options: [leave] },
    wreck: { text: 'The Heron on its blocks with the roof stove in and the long nose crumpled, a pre-war airport tug that survived the Burn and did not survive the cloverleaf.', again: 'The Heron, roof stove in, on its blocks.', options: [leave] },
    yours: { text: 'The Heron, yours, the seat still bolted low the way Bello liked it. You have not moved it.', again: 'The Heron, the seat bolted low.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the Coat

export const d_dr_haverty: DialogueDef = {
  id: 'd_dr_haverty', owner: 'npc_dr_04',
  start: [{ if: { flag: 'dr_haverty_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a coat too good for the Ring on a folding chair at the top of the stands, a ledger open on his knee and a pen that has never been dropped. "Haverty." He doesn\'t get up. "I hold the book for some young people who come down on final nights. For the colour." He smiles. "The Ring has a great deal of colour."',
      again: '"The book is open," Haverty says, turning a page.',
      effects: [{ set: 'dr_haverty_met' }, { learn: 'dr_haverty_seen' }],
      interject: [{ companion: ODILE, text: 'Odile reads the open page upside down in the time it takes him to smile. "That book has been written backwards," she says. "The odds are the result. The race is the formality." Haverty inclines his head to her as to a colleague. "Madam."', effects: [{ learn: 'dr_book_backwards' }] }],
      options: [
        { id: 'hav.book', text: 'What\'s in the book?', next: 'book', once: true },
        { id: 'hav.offer', text: 'You need Bello not to finish.', if: { all: [FINAL_OPEN, { seen: 'hav.book' }, { not: { knows: 'dr_haverty_offer' } }] }, next: 'offer' },
        { id: 'hav.card', text: '(Sell him the card back. 150 Tolls)', if: { all: [{ item: 'k_dr_card' }, { not: { flag: 'dr_haverty', eq: 'barred' } }] }, next: 'card' },
        bye,
      ],
    },
    again: {
      text: '"The book is open," Haverty says, turning a page.',
      again: 'Haverty, the ledger on his knee, the pen that has never been dropped.',
      options: [
        { id: 'hav.book.again', text: 'What\'s in the book?', if: { not: { seen: 'hav.book' } }, next: 'book' },
        { id: 'hav.offer.again', text: 'You need Bello not to finish.', if: { all: [FINAL_OPEN, { seen: 'hav.book' }, { not: { knows: 'dr_haverty_offer' } }] }, next: 'offer' },
        { id: 'hav.card.again', text: '(Sell him the card back. 150 Tolls)', if: { all: [{ item: 'k_dr_card' }, { not: { flag: 'dr_haverty', eq: 'barred' } }] }, next: 'card' },
        bye,
      ],
    },
    book: {
      text: '"The final." He turns the ledger so you can see a page of names in a good hand, and beside every name the same word: BELLO. "They\'ve all backed her. Every one of them. A woman from the Ring who wins her way back inside the Wall: it is a lovely story, and they are young." He turns the ledger back. "If she wins, I pay them out of a book my house holds, and my house will want to know why it backed a story." He says it pleasantly. "I owe my house a great deal. My own card is in this book."',
      effects: [{ learn: 'dr_book_read' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    offer: {
      text: '"I need the book to balance." He doesn\'t lower his voice; nobody on the stands is listening to a man in a good coat. "A hundred and fifty, for the Heron not finishing. You needn\'t touch it. You need only say nothing about anything you see in the pits between now and the flag." He slides a purse half out of his coat, and leaves it there.',
      effects: [{ learn: 'dr_haverty_offer' }],
      options: [
        { id: 'offer.take', text: '(Take it.)', effects: [{ give: 'tolls', count: 150 }, { set: 'dr_paid' }, { memory: { npc: 'npc_dr_04', tag: 'took_the_book', valence: 20 } }, { decision: { id: 'dr_paid', text: 'You took the Crown\'s bookman\'s money to say nothing about the Heron before the final.' } }], next: 'taken' },
        { id: 'offer.no', text: 'No.', next: 'refused' },
      ],
    },
    taken: {
      text: '"Splendid." The purse is in your hand and his pen is moving. "You have seen nothing, then, either way." He does not watch you go; he is writing your name in the book, on the side of the page where the money goes out.',
      again: 'Haverty, writing.',
      interject: [
        { companion: WREN, text: 'Wren waits until you are off the stands. "A hundred and fifty," she says. "For a woman going into the tyres at the cloverleaf." She keeps walking. "I keep count."', effects: [A(WREN, -10)] },
        { companion: TAMSIN, text: '"You took it," Tamsin says, not loud. "For her not finishing. You know what not finishing is here. You heard Dorota." She doesn\'t walk beside you for a while.', effects: [A(TAMSIN, -10)] },
        { companion: ASH, text: 'Ash says nothing at all on the stands. On the road, much later: "There\'s a price on everything out here, and you just learned yours." It is not said kindly, and it is not said to hurt.', effects: [A(ASH, -5)] },
        { companion: ILYA, text: '"Right," Ilya says, and it means only one thing, and the thing is not good.', effects: [A(ILYA, -5)] },
      ],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    refused: { text: '"Then you have seen nothing either way," he says, as pleasantly as before, and the purse goes back into his coat. "It comes to the same, you know. It nearly always does." He writes something in the book.', again: '"It comes to the same," Haverty says.', options: [{ text: '(Back.)', next: 'again' }] },
    card: {
      text: 'He looks at the envelope and his whole face changes, briefly, into somebody\'s who has been let off. "A hundred and fifty." He counts it out of a different purse. "It will go back up the Loop and be given to somebody\'s cook, who will be very grateful, and say so, and be a citizen." He tucks it into his coat. "Thank you. You have saved me a conversation."',
      effects: [{ take: 'k_dr_card' }, { give: 'tolls', count: 150 }, { set: 'dr_card', value: 'sold' }, { set: 'dr_bello', value: 'stays' }, { set: 'dr_bello_settled' }, { decision: { id: 'dr_card', text: 'You sold the Crown\'s card back to its bookman for a hundred and fifty.' } }],
      interject: [
        { companion: ODILE, text: '"Above its value to him," Odile says, when you are down off the stands. "He would have paid two hundred. Still. Clean." She does not look at the pits.', effects: [A(ODILE, 3)] },
        { companion: WREN, text: 'Wren looks at the pits, where the Heron is, and then at you, and says nothing about it, then or after.', effects: [A(WREN, -3)] },
      ],
      options: [{ text: '(Back.)', next: 'again' }],
    },
  },
};

// ---------------------------------------------------------------- Leven

const STRIP_FX: Effect[] = [{ set: 'dr_leven', value: 'stripped' }, { set: 'dr_steel_sold' }, { give: 'tolls', count: 30 }, { xp: 120 }, { decision: { id: 'dr_leven_stripped', text: 'You brokered a deal: Leven\'s people stripped their own empty upper floors and sold the steel to the yard. The tower stands, open to the sky.' } }];

export const d_dr_leven_door: DialogueDef = {
  id: 'd_dr_leven_door', owner: 'narrator',
  start: [{ if: { flag: 'dr_leven_burned' }, node: 'burned' }, { if: { flag: 'dr_leven', eq: 'barred' }, node: 'barred' }, { if: { flag: 'dr_leven', eq: 'stripped' }, node: 'stripped' }, { node: 'door' }],
  nodes: {
    door: {
      text: 'Leven\'s door: a steel door propped open on a brick, with a number painted out (11) and a name painted in (LEVEN). On the steel at shoulder height, in white chalk, a mark: a ring with a bar through it. Fresh. Somebody inside has tried to rub it off with a wet hand and made it a smear of the same shape.',
      again: [{ if: { flag: 'dr_leven', eq: 'paid' }, text: 'The ring with a bar on Leven\'s door, chalked again, darker than before.' }, { text: 'The ring with a bar on Leven\'s door, and the smear of a hand that tried to rub it off.' }],
      effects: [{ learn: 'dr_mark_seen' }, { quest: 'q_dr_leven', start: true }],
      passives: [
        { attr: 'senses', dc: 7, text: 'The same mark, fainter, on the door frame, and under it older chalk: scrubbed off, and come back, and scrubbed off.' },
        { if: { knows: 'dr_mark_yard' }, label: 'the yard', text: 'The same mark as on the yard\'s tally board, beside LEVEN, where the towers that are DONE have their tonnage.', effects: [{ learn: 'dr_mark_who' }, { lead: 'l_dr_mark' }] },
      ],
      options: [leave],
    },
    barred: { text: 'The chalk is gone. Somebody has painted over the smear in the same white: LEVEN, and under it a number that is the count: 91.', again: 'LEVEN, and 91, in white over the smear.', options: [leave] },
    stripped: { text: 'The mark is gone. Above the door Leven\'s upper floors stand open to the sky where their steel came out: girders gone, slabs on props of cut pipe, washing still strung across the windows that are only holes now.', again: 'Leven\'s upper floors, open to the sky, washing on the wires.', options: [leave] },
    burned: { text: 'The door is black, and the tower above it is black, floor on floor, to where the floors stop. The chalk mark has burned off with the paint. Somebody has written on the steel in charcoal: 89.', again: 'The black door, and 89 in charcoal.', options: [leave] },
  },
};

export const d_dr_count: DialogueDef = {
  id: 'd_dr_count', owner: 'narrator', start: [{ if: { flag: 'dr_leven_burned' }, node: 'gone' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A child\'s school slate on the table, and beside it a ledger of torn pages sewn together with fishing line: names, one to a line, ninety-one of them, with a tick beside each for every night slept here, going back nine years. Nobody inside the Wall has a record of one of them.',
      again: 'The sewn ledger, ninety-one names, the ticks going back nine years.',
      effects: [{ learn: 'dr_count_read' }],
      options: [
        { id: 'count.sign', text: '(Write your own name at the bottom.)', if: { not: { knows: 'dr_counted' } }, next: 'signed' },
        leave,
      ],
    },
    signed: {
      text: 'You write it at the bottom, ninety-two, and Ha-eun puts a tick beside it without looking up, as if you had always been there.',
      again: 'Your name at the bottom of the sewn ledger, ninety-two, with its one tick.',
      effects: [{ learn: 'dr_counted' }, { trust: { npc: 'npc_dr_05', by: 10 } }],
      interject: [{ companion: NINE, text: '"There is no file here," Nine says, very quietly. "I find that I am listening harder." Ha-eun looks at the unit for a long moment. "Then listen," she says, and reads it the first page, aloud, all forty names.', effects: [A(NINE, 2)] }],
      options: [leave],
    },
    gone: { text: 'The table is a black frame. The slate is gone. The ledger is not here: Ha-eun carried it out under her arm.', again: 'The black frame of the table.', options: [leave] },
  },
};

export const d_dr_yard_board: DialogueDef = {
  id: 'd_dr_yard_board', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'A board of tallies at the yard gate in a careful hand: TOWER 6 — 31 T — DONE. TOWER 9 — 44 T — DONE. TOWER 14 — 12 T — (FIRE TOO HOT). TOWER 3 — 27 T — DONE. And at the bottom, LEVEN, and beside it, in chalk, not a number: a ring with a bar through it.',
      again: 'TOWER 6, 9, 14, 3: DONE. LEVEN: a ring with a bar.',
      effects: [{ learn: 'dr_mark_yard' }],
      passives: [{ if: { knows: 'dr_mark_seen' }, label: 'Leven\'s door', text: 'The same mark as on Leven\'s door. Every tower on the board that is DONE has it beside its tonnage, rubbed half out.', effects: [{ learn: 'dr_mark_who' }, { lead: 'l_dr_mark' }] }],
      interject: [{ companion: ASH, text: '"Fire too hot," Ash reads, at TOWER 14. He reads it twice. He doesn\'t say anything else.' }],
      options: [leave],
    },
  },
};

export const d_dr_yardbook: DialogueDef = {
  id: 'd_dr_yardbook', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'The yard\'s tally book: towers by number, steel by the ton, and a column headed BUYER in which every line says the same: ROAD — NEAR END (BY ARRANGEMENT, H. VANE). The last page: LEVEN — STEEL — EST. 40 T — MARKED. FUEL 2 CANS. BOY: WATER ×6. AFTER THE COUNT IS OUT OF THE TOWER, IF IT EVER IS.',
      again: 'TOWERS, TONNAGE, ROAD — NEAR END (BY ARRANGEMENT, H. VANE). LEVEN — MARKED. FUEL 2 CANS.',
      effects: [{ learn: 'dr_mark_who' }, { learn: 'dr_yard_road' }, { lead: 'l_dr_mark' }, { lead: 'l_dr_steel' }],
      options: [{ text: '(Close it.)', exit: true }],
    },
  },
};

export const d_dr_haeun: DialogueDef = {
  id: 'd_dr_haeun', owner: 'npc_dr_05',
  start: [
    { if: { at: 'md_precinct' }, node: 'line' },
    { if: { flag: 'dr_leven' }, node: 'after' },
    { if: { flag: 'dr_haeun_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman at a table at the back of the tower\'s lowest floor, counting in a ledger of sewn pages with a pencil stub, who does not look up until she has finished the line. "Ha-eun. I keep the count." She makes a tick. "Ninety-one. If you\'re staying the night, say your name and it\'s ninety-two."',
      again: '"Ninety-one," Ha-eun says, finishing a line before she looks up.',
      effects: [{ set: 'dr_haeun_met' }, { learn: 'dr_count_heard' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin is looking up the stairwell, where people are living on every floor of a building that is open to the weather and has never been sealed. "Ninety-one," she says. "Inside, we were sixty, and we had a machine to count us." She looks at the ledger. "This is better."' }],
      options: [
        { id: 'haeun.mark', text: 'The chalk on your door.', if: { knows: 'dr_mark_seen' }, next: 'mark', once: true },
        { id: 'haeun.count', text: 'Why keep a count nobody reads?', next: 'count', once: true },
        { id: 'haeun.who', text: 'It\'s the yard. Ruben\'s yard chalks the towers that burn.', if: { all: [{ knows: 'dr_mark_who' }, LEVEN_OPEN] }, next: 'who' },
        bye,
      ],
    },
    again: {
      text: '"Ninety-one," Ha-eun says, finishing a line before she looks up.',
      again: 'Ha-eun, the pencil stub, the sewn pages.',
      options: [
        { id: 'haeun.mark.again', text: 'The chalk on your door.', if: { all: [{ knows: 'dr_mark_seen' }, { not: { seen: 'haeun.mark' } }] }, next: 'mark' },
        { id: 'haeun.count.again', text: 'Why keep a count nobody reads?', if: { not: { seen: 'haeun.count' } }, next: 'count' },
        { id: 'haeun.who.again', text: 'It\'s the yard. Ruben\'s yard chalks the towers that burn.', if: { all: [{ knows: 'dr_mark_who' }, LEVEN_OPEN] }, next: 'who' },
        bye,
      ],
    },
    mark: {
      text: '"A ring with a bar." She puts the pencil down. "It comes on a door, and the tower burns before the rains. Tower Six had it, and Nine, and Three. Nobody was counted dead in any of them. Nobody in the Ring is counted at all, by them." She touches the ledger. "By me they were. Fourteen in Six. Nine in Three." She picks the pencil up again. "Find who chalks it. I can\'t leave the count."',
      effects: [{ learn: 'dr_mark_heard' }, { quest: 'q_dr_leven', start: true }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    count: {
      text: '"So that when they say nobody died," she says, "I can say who." She turns back a page and runs her finger down it, a woman checking a sum. "The Wall says the Ring burns and they count. They count the fires. I count the people."',
      effects: [{ learn: 'dr_count_why' }],
      interject: [{ companion: NINE, text: 'Nine\'s lens has not moved off the ledger. "There is no file here," it says. "I find I am listening harder." Ha-eun considers the unit. "Then listen," she says.', effects: [A(NINE, 2)] }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    who: {
      text: '"Ruben." She doesn\'t sound surprised; she sounds tired, the way people sound when a sum comes out the way they knew it would. "Sixty families eat off his yard. Twenty of them sleep in my tower." She closes the ledger on her finger. "What do I do with that?"',
      again: '"What do I do with that?" Ha-eun says.',
      effects: [{ learn: 'dr_haeun_knows' }],
      options: [
        { id: 'who.strip', text: 'Sell him the steel yourselves, before he burns it out of you. The upper floors are empty.', if: { not: { flag: 'dr_leven_offer' } }, check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'dr_ruben_why' }, dc: -10, why: 'you know what the yard needs and why' }, { if: { knows: 'dr_counted' }, dc: -5, why: 'your name is on her count' }] }, next: 'strip_ok', fail: 'strip_no' },
        { id: 'who.slate', text: 'Put it in front of Dorota\'s slate. It\'s the one law the Ring keeps.', next: 'slate' },
        { text: '(Back.)', next: 'again' },
      ],
    },
    strip_ok: { text: 'She is quiet for a long time. "The tenth floor up has had nobody on it since the wind took the windows." She opens the ledger again. "We\'d strip it ourselves. Sell it to him by the ton, the same as any tower. He gets his steel. We get the money and keep the floors we sleep on." She makes a mark that is not a tick. "Tell him. If he takes it, he takes it from us, not from the fire."', effects: [{ set: 'dr_leven_offer' }, { xp: 40 }], options: [{ text: '(Back.)', next: 'again' }] },
    strip_no: { text: '"Sell him my tower." She doesn\'t raise her voice. "A floor at a time, so it takes longer." She goes back to the count.', again: 'Ha-eun, back at the count.', options: [{ text: '(Back.)', next: 'again' }] },
    slate: { text: '"Dorota\'s slate." She considers it. "If you can put it in front of her so she can\'t not read it out." She goes back to the count. "Something written. Dorota reads what\'s written."', effects: [{ learn: 'dr_slate_idea' }], options: [{ text: '(Back.)', next: 'again' }] },
    after: {
      text: [
        { if: { flag: 'dr_leven', eq: 'barred' }, text: '"Ninety-one." She looks up, which she does not do. "The yard\'s men stand at the slate and nobody sells to them. Some of their children sleep here." She goes back to the count. "So: ninety-four."' },
        { if: { flag: 'dr_leven', eq: 'stripped' }, text: '"Ninety-one, and the wind on the tenth floor like the sea, they tell me." She makes a tick. "We\'re paid. The road has its steel. We still have the floors we sleep on."' },
        { if: { flag: 'dr_leven', eq: 'paid' }, text: '"The chalk\'s back," she says, without looking up from the count. "Darker than before." She makes a tick. "Ninety-one."' },
        { text: '"Ninety-one," Ha-eun says.' },
      ],
      again: 'Ha-eun, at the count.',
      options: [bye],
    },
    line: {
      text: 'Ha-eun, in the line outside the Wall, with the sewn ledger under her arm, charred at one corner. "Eighty-nine," she says. "Two on the ninth floor, an old man and his son, who would not leave the stairs. I had their names. I have them still." She doesn\'t look at you. "They\'ll be counted somewhere now, then. That\'s something."',
      again: 'Ha-eun, in the line, the charred ledger under her arm.',
      interject: [
        { companion: ASH, text: 'Ash kneels by her in the dust of the line and asks the two names, and says them, both, aloud, the way the Choir says names. Then he gets up and does not look at you for the rest of the day.', effects: [A(ASH, -10)] },
        { companion: TAMSIN, text: '"Eighty-nine," Tamsin says. She knows what you took. "You let them count that."', effects: [A(TAMSIN, -10)] },
      ],
      options: [bye],
    },
  },
};

export const d_dr_ruben: DialogueDef = {
  id: 'd_dr_ruben', owner: 'npc_dr_06',
  start: [{ if: { flag: 'dr_leven', eq: 'barred' }, node: 'barred' }, { if: { flag: 'dr_ruben_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man at a table in a steel container, with a ledger, a mug, and a length of pipe across the table where another man would keep a gun. "Ruben. The yard." He looks you over the way he looks at a girder. "Steel\'s weighed at the gate. If you\'re selling, sell. If you\'re buying by the ton, you\'re the Crown, and you\'re not."',
      again: '"Steel\'s weighed at the gate," Ruben says.',
      effects: [{ set: 'dr_ruben_met' }, { learn: 'dr_ruben_seen' }],
      options: [
        { id: 'ruben.towers', text: 'Where does the steel come from?', next: 'towers', once: true },
        { id: 'ruben.leven', text: 'Leven has your mark on its door.', if: { all: [{ knows: 'dr_mark_who' }, LEVEN_OPEN] }, next: 'leven' },
        { text: 'Trade.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: '"Steel\'s weighed at the gate," Ruben says.',
      again: 'Ruben, the ledger, the pipe across the table.',
      options: [
        { id: 'ruben.towers.again', text: 'Where does the steel come from?', if: { not: { seen: 'ruben.towers' } }, next: 'towers' },
        { id: 'ruben.leven.again', text: 'Leven has your mark on its door.', if: { all: [{ knows: 'dr_mark_who' }, LEVEN_OPEN] }, next: 'leven' },
        { text: 'Trade.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    towers: { text: '"Dead towers." He drinks from the mug. "The Ring\'s nothing but dead towers, and a tower nobody lives in is steel. That\'s all a tower is, out here. Cut it, weigh it, sell it." He puts the mug down. "Somebody inside the Wall is building something. They don\'t ask where it comes from."', effects: [{ learn: 'dr_ruben_towers' }], options: [{ text: '(Back.)', next: 'again' }] },
    leven: {
      text: '"It has." He doesn\'t pretend; it is the thing you will remember about him. "Sixty families eat off this yard. Twenty of them sleep in Leven, as it happens." He taps the ledger. "There\'s a road going in at the near end of a bridge in Bridgeward, and the Crown wants steel for it by the ton, no questions about how it came down. A tower that burns comes down lawful. There\'s no law out here to say otherwise." He looks at you. "Nobody\'s ever died in my fires. Ask the Wall. It counts."',
      again: '"Nobody\'s ever died in my fires," Ruben says. "Ask the Wall."',
      effects: [{ learn: 'dr_ruben_why' }, { lead: 'l_dr_steel' }],
      interject: [{ companion: ODILE, text: '"By the ton, for a road," Odile says. "Sold forward, I imagine, before the tower is down." Ruben looks at her with something like respect. "Before the chalk is dry," he says.' }],
      options: [
        { id: 'leven.strip', text: '(Broker it.) Leven strips its own empty upper floors and sells you the steel. You get your tons; nobody burns.', check: { skill: 'barter', dc: 45, mods: [{ if: { flag: 'dr_leven_offer' }, dc: -15, why: 'Ha-eun has already agreed to it' }, { if: { inParty: ODILE }, dc: -5, why: 'Odile names a fair price per ton before he can' }] }, next: 'strip', fail: 'strip_no' },
        { id: 'leven.price', text: 'How much to look the other way?', next: 'price' },
        { text: '(Leave it.)', next: 'again' },
      ],
    },
    strip: {
      text: 'He does the sum on the ledger\'s margin with a carpenter\'s pencil, twice. "Forty tons off the top floors, cut by their people, weighed at my gate." He looks at it. "Less than I\'d get from a fire. More than I\'d get from a fight." He tears a strip off the margin and writes a price on it for Ha-eun, and a smaller one for you. "Broker\'s cut. Don\'t tell her what it is."',
      effects: STRIP_FX,
      interject: [
        { companion: ODILE, text: '"Clean," Odile says, approving, afterwards. "Everybody gets less than they wanted and nobody burns. That is what a market is for, my dear, on the days it works."', effects: [A(ODILE, 3)] },
        { companion: ASH, text: '"Nobody burns," Ash says. He seems to want to say more about the road the steel is for, and doesn\'t.', effects: [A(ASH, 2)] },
      ],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    strip_no: { text: '"From ninety squatters who\'d sooner keep it." He shakes his head. "A fire\'s quicker, and it doesn\'t haggle."', again: '"A fire doesn\'t haggle," Ruben says.', options: [{ text: '(Back.)', next: 'again' }] },
    price: {
      text: '"Sixty." He doesn\'t even have to think about it, which tells you how often he has said it. "I wasn\'t going to ask anybody\'s leave. But I\'d rather you were paid than talking."',
      again: '"Sixty," Ruben says. "I wasn\'t going to ask leave."',
      options: [
        { id: 'price.take', text: '(Take it.)', effects: [{ give: 'tolls', count: 60 }, { set: 'dr_leven', value: 'paid' }, { decision: { id: 'dr_leven_paid', text: 'You took sixty Tolls from Ruben Iturbe to look away from Leven.' } }], next: 'paid' },
        { id: 'price.no', text: 'No.', next: 'again' },
      ],
    },
    paid: {
      text: 'The money comes out of a tin under the table. "You never came in." He goes back to the ledger. On the last page you can see LEVEN, and beside it he writes a date that is not a date: AFTER THE COUNT.',
      again: '"You never came in," Ruben says.',
      interject: [
        { companion: ASH, text: 'Ash stops in the yard gate. "Ninety people," he says. "Sixty Tolls." He says it like a man reading a price off a board he cannot believe. He does not speak to you again that day.', effects: [A(ASH, -10)] },
        { companion: TAMSIN, text: '"There are children in that tower," Tamsin says. "I saw them." She walks out of the yard ahead of you and keeps ahead.', effects: [A(TAMSIN, -10)] },
        { companion: WREN, text: '"The Dogs burned things," Wren says. "I was there for some of them. We didn\'t get paid to look away from them. We were the ones holding the can." She looks at the tin under the table.', effects: [A(WREN, -5)] },
      ],
      options: [bye],
    },
    barred: { text: '"The slate." He says it without anger, which is worse. "Nobody buys a pound from me now, nobody sells me a ton. Sixty families." He doesn\'t look up from the ledger, where there is nothing new to write. "Go and count them, if you\'re counting."', again: 'Ruben, the ledger, nothing new in it.', options: [bye] },
  },
};

export const d_dr_sami: DialogueDef = {
  id: 'd_dr_sami', owner: 'npc_dr_07',
  start: [
    { if: { flag: 'dr_sami', eq: 'pits' }, node: 'pits' },
    { if: { all: [SMALL_HOURS, LEVEN_OPEN, { not: { knows: 'dr_sami_told' } }] }, node: 'night' },
    { if: { flag: 'dr_sami_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A boy of sixteen or seventeen carrying lengths of pipe across the yard two at a time, with a burn scar across one cheek and his hands bound in rag. He puts the pipe down when you stop in front of him, not because you asked. "Water first," he says. "Then talk."',
      again: '"Water first," Sami says.',
      effects: [{ set: 'dr_sami_met' }, { learn: 'dr_sami_seen' }],
      options: [
        { id: 'sami.water', text: '(Give him a bottle of water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }], next: 'water' },
        bye,
      ],
    },
    again: {
      text: '"Water first," Sami says.',
      again: 'Sami, with the pipe on his shoulder, waiting.',
      options: [
        { id: 'sami.water.again', text: '(Give him a bottle of water.)', if: { all: [{ item: 'c_water' }, { not: { knows: 'dr_sami_told' } }] }, effects: [{ take: 'c_water' }], next: 'water' },
        bye,
      ],
    },
    water: {
      text: 'He drinks half of it at once and caps the rest and puts it inside his shirt. "Sami." He looks at the yard, not at you. "I carry what I\'m given. Pipe in the day." He picks the pipe back up. "Other things at night. Chalk\'s free. Everything else costs."',
      again: 'Sami, the half bottle inside his shirt.',
      effects: [{ learn: 'dr_sami_hint' }],
      options: [
        { id: 'water.night', text: 'What do you carry at night?', if: { quest: 'q_dr_leven' }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'dr_mark_seen' }, dc: -5, why: 'you have seen the chalk on Leven\'s door' }] }, next: 'told', fail: 'shut' },
        bye,
      ],
    },
    shut: { text: '"Pipe." He walks off with it. "Pipe, at night too."', again: '"Pipe," Sami says.', options: [bye] },
    night: {
      text: 'Leven\'s step, in the small hours. A boy with a stick of chalk in one hand and a can in the other, making the mark on the door again where somebody rubbed it off, very carefully, the way a child does homework. He hears you and turns, and the can is between you.',
      again: 'The boy at Leven\'s door, the chalk, the can.',
      options: [
        { id: 'night.grab', text: '(Get the can off him before he runs.)', check: { attr: 'reflex', dc: 6 }, next: 'told', fail: 'ran' },
        { id: 'night.water', text: '(Hold out a bottle of water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }], next: 'told' },
        { id: 'night.let', text: '(Step aside and let him go.)', next: 'ran' },
      ],
    },
    told: {
      text: '"Ruben\'s yard." He says it quickly, as if speed made it smaller. "The gate man gives me water for chalking. Six. Two more for carrying the cans to the door after the count goes to sleep." He looks at the chalk in his hand. "I don\'t light anything. I carry. Somebody else lights." He looks at the door. "I lived in Six."',
      again: '"I carry," Sami says. "I lived in Six."',
      effects: [{ learn: 'dr_sami_told' }, { learn: 'dr_mark_who' }, { lead: 'l_dr_mark' }, { set: 'dr_sami_met' }],
      interject: [{ companion: ASH, text: 'Ash crouches so that he is lower than the boy. "Six," he says. "Who did you lose in Six?" Sami tells him. Ash listens to all of it, and gives him nothing but the listening, and the boy stands straighter for it.' }],
      options: [bye],
    },
    ran: {
      text: 'He is gone into the dark between the towers before you have moved, quick and silent, a boy who has run from doors all his life. The can stays on the step. Stencilled on its side, under the soot: YARD — WEIGH AT GATE.',
      again: 'The can on Leven\'s step: YARD — WEIGH AT GATE.',
      effects: [{ learn: 'dr_mark_who' }, { lead: 'l_dr_mark' }],
      options: [bye],
    },
    pits: {
      text: 'Sami under the Mule on Emil\'s board, a spanner in his rag-bound hand. "Emil says I\'ve got hands." He says it as if it were a thing he had been given and might have to give back.',
      again: 'Sami, under the Mule, a spanner going.',
      options: [
        { id: 'pits.coat', text: 'Seen anyone at the Heron at night?', if: { all: [FINAL_OPEN, { not: { flag: 'dr_line' } }, { not: { knows: 'dr_coat_seen' } }] }, next: 'coat' },
        bye,
      ],
    },
    coat: { text: '"The Coat." No hesitation; a boy who has been asked where things are by people with money learns to say it straight. "Twice. With a lamp and a little knife, at the back wheel. He gave me water not to see him." He looks at the Heron. "I\'m telling you anyway. Emil says I chalk nothing for anybody."', effects: [{ learn: 'dr_coat_seen' }, { lead: 'l_dr_coat' }], options: [bye] },
  },
};

export const RING_DIALOGUES: DialogueDef[] = [
  d_dr_loop, d_md_ring_sign, d_dr_road_sign, d_dr_start, d_dr_mule, d_dr_slate_sign, d_dr_cut, d_dr_hound,
  d_dr_slate, d_dr_bello, d_dr_emil, d_dr_heron, d_dr_haverty,
  d_dr_leven_door, d_dr_count, d_dr_yard_board, d_dr_yardbook, d_dr_haeun, d_dr_ruben, d_dr_sami,
];
