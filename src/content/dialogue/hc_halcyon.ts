import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { LEASHED } from '../chrome/catalogue';
import { A, ASH, ILYA, K, KES, KES_IN, NINE, ODILE, SHIFT_BROKEN, SHIFT_WON, TAMSIN, TOLLS, WREN, bye, leave } from './hs_skirts';

/**
 * Halcyon (B4b), the top of the hill: the top station and the gate (beat 16's four ways in), the service yard and the
 * gardeners' tunnel, the concourse and the registry, the gardens under glass and their keeper, the citizens' terraces, the
 * lifts. The Board's floor and the works are in hc_board.ts; floor nine of the Clinic floors in hc_clinic.ts. Kes's
 * conversation inside the arcology is here too (KES_HC_NODES, spread into d_hs_kes). Story notes:
 * story/STORY_PLAN_SECRET.md, Build notes — B4 (B4b).
 */

// ---------------------------------------------------------------- shared by the three Halcyon files

export const GOTO = (location: string, spawn: string, minutes = 1): Effect => ({ event: 'goto', data: { location, spawn, minutes } });
export const DAWN: Cond = { hour: { from: 4, to: 7 } };
export const EVENING: Cond = { hour: { from: 18, to: 21 } };
export const TWO: Cond = { hour: { from: 1, to: 3 } };
/** The cable house is gone (the Shift's revolt): no car, no freight. */
export const CAR_DOWN: Cond = { flag: 'hs_car_down' };
export const CAR_UP: Cond = { not: CAR_DOWN };
export const GATE_SHUT: Cond = { flag: 'hs_gate_shut' };
/** The Concern marked the player for standing with the Shift (or the Shift blew the cable house): the gate is cold. */
export const MARKED: Cond = { any: [{ flag: 'hs_marked' }, GATE_SHUT] };
/** The Concern owes the player for Meridian: the gate is warm. */
export const WARM: Cond = { any: [{ flag: 'cr_concern', eq: 'kept' }, { knows: 'concern_favour' }] };
export const AT_HC: Cond = { any: ['hc_terrace', 'hc_clinic', 'hc_board', 'hc_works'].map((at) => ({ at })) };
/** Kes walks with the player and has not left for good. */
export const KES_JOINED: Cond = { all: [{ flag: 'kes_joined' }, { not: { flag: 'kes_left' } }] };
export const GRID_CHROME: Cond = { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }, { chrome: 'ch_neural_regent' }] };
/** The brakeman will carry what the player asks down on the freight at two. */
export const MAZUR_OK: Cond = { any: [SHIFT_WON, { flag: 'hc_mazur_paid' }, { flag: 'hc_mazur_trust' }] };
export const YAW_OK: Cond = { flag: 'hc_yaw_trust' };
/** The service ward emptied, by the player's hands or Dr Qadir's signature. */
export const CLINIC_OUT: Cond = { any: [{ flag: 'hc_clinic', eq: 'freed' }, { flag: 'hc_clinic', eq: 'closed' }] };
/** Joran Haber's boy, taken up on the freight at two (B4a), still on the ward. */
export const NILS_ON_WARD: Cond = { all: [{ flag: 'hs_nils', eq: 'up' }, { not: { flag: 'hc_nils' } }] };
export const NILS_DOWN: Effect[] = [{ set: 'hc_nils', value: 'freed' }, { set: 'hs_nils', value: 'freed' }];
/** 9-1182 lived while the Skirts still sent; when the Weighhouse was shut the floors drew on what they had. */
export const DAWIT_ALIVE: Cond = { not: { flag: 'hs_parts', eq: 'exposed' } };
export const DAWIT_HOME: Cond = { all: [CLINIC_OUT, DAWIT_ALIVE] };
export const LINH_OPEN: Cond = { all: [{ knows: 'hc_linh_met' }, { not: { flag: 'hc_funicular' } }] };
export const GARDEN_OPEN: Cond = { not: { flag: 'hc_garden' } };
export const LEASH_OPEN: Cond = { not: { flag: 'hc_leash' } };
export const T = (by: number): Effect => A(TAMSIN, by);
export const W = (by: number): Effect => A(WREN, by);
export const I = (by: number): Effect => A(ILYA, by);
export const O = (by: number): Effect => A(ODILE, by);
export const S = (by: number): Effect => A(ASH, by);
export const N = (by: number): Effect => A(NINE, by);
export const back = (to = 'again'): OptionDef => ({ text: 'Something else.', next: to });

/** Through the gate, by whatever paper: inside, the beat's milestone (which also arms the Skirts' strike default), how. */
export const ENTER = (how: string): Effect[] => [{ set: 'hc_inside' }, { set: 'hc_entry', value: how }, { learn: 'hc_inside_seen' }, { quest: 'q_hc_longlived', start: true }];
const IN = (how: string): Effect[] => [...ENTER(how), GOTO('hc_terrace', 'concourse')];

/** Selling the keeper's key: Kes's red line if she ever walked with the player. One option per case, the same words. */
export function sellKey(id: string, text: string, holder: string, tolls: number, when: Cond, next: string): OptionDef[] {
  const base: Effect[] = [{ take: 'k_hc_leash_key' }, { give: 'tolls', count: tolls }, { set: 'hc_leash', value: 'sold' }, { set: 'leash_holder', value: holder },
    { rep: { faction: 'concern', respect: 15 } }, S(-20), N(-10), W(-15),
    { decision: { id: 'hc_leash', text: `You sold the keeper's key, and every Concern piece in the Reach with it, to ${holder === 'guild' ? 'the guild' : holder === 'soto' ? 'Director Soto' : 'the Chair'}.` } }];
  const kesGoes: Effect[] = [{ leave: KES }, { set: 'kes_left', value: 'leash' }, { set: 'kes_rom', value: 'ended' }, K(-60),
    { decision: { id: 'kes_left', text: 'You sold the leash. Kes Oyelaran walked out of Halcyon without you, and will not walk with you again.' } }];
  return [
    { id, text, if: { all: [when, KES_JOINED] }, effects: [...base, ...kesGoes], next },
    { id: `${id}.nokes`, text, if: { all: [when, { not: KES_JOINED }] }, effects: base, next },
  ];
}

// ---------------------------------------------------------------- the top station

export const d_hc_car: DialogueDef = {
  id: 'd_hc_car', owner: 'narrator', start: [{ if: CAR_DOWN, node: 'down' }, { node: 'car' }],
  nodes: {
    car: {
      text: [
        { if: SHIFT_WON, text: 'The car against its buffer of white steel, doors open on air that smells of nothing. Its crew wear the Shift\'s armband on their Concern grey now, and nobody up here has dared tell them to take it off. A chalked board on the buffer: STEWARD\'S STOP IN FORCE. ASK MAZUR.' },
        { text: 'The car against its buffer of white steel, doors open on air that smells of nothing. A crew in grey at the controls, a clerk with a list at the doors. It goes down the rock on its ladder of a track to Footgate, and comes up full, and goes down empty.' },
      ],
      again: 'The car at the top of its track.',
      effects: [{ learn: 'hc_car_seen' }],
      options: [
        { id: 'hc.car.down', text: '(Ride down to Footgate.)', effects: [GOTO('hs_skirts', 'from_halcyon', 12)], exit: true, repeat: true },
        leave,
      ],
    },
    down: {
      text: 'No car. The track goes down into the rock from a buffer of white steel and stops being a track somewhere below, where the cable used to run. A clerk with a list stands at a door that no longer opens on anything, because nobody has told her to stop.',
      again: 'The empty track.',
      effects: [{ learn: 'hc_car_seen' }],
      options: [leave],
    },
  },
};

export const d_hc_carboard: DialogueDef = {
  id: 'd_hc_carboard', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: CAR_DOWN, text: 'SERVICE SUSPENDED — DAMAGE TO PLANT. Under it, in a clean hand: FREIGHT BY ROAD. CITIZENS REMAIN ON THE TERRACES UNTIL FURTHER NOTICE.' },
        { if: SHIFT_WON, text: 'SERVICE — CONTRACTS AND THE BOARD\'S GUESTS. Under it, in chalk, every letter pressed hard: STEWARD\'S STOP. And under that, in a cleaner hand, somebody\'s attempt to rub it out, and the chalk again on top.' },
        { text: 'SERVICE — CONTRACTS AND THE BOARD\'S GUESTS. CITIZENS DESCENDING: PASS REQUIRED. FREIGHT 02:00. The letters are lamps behind glass, and none of them flickers.' },
      ],
      again: 'The car\'s board.',
      options: [leave],
    },
  },
};

export const d_hc_freightdock: DialogueDef = {
  id: 'd_hc_freightdock', owner: 'narrator', start: [{ if: { all: [TWO, CAR_UP] }, node: 'two' }, { node: 'day' }],
  nodes: {
    day: {
      text: 'The freight dock: crates stencilled MEDICAL — COLD stacked under a canopy, a cart, a hose, and a sign: FREIGHT 02:00 — CONCERN CREW ONLY. The dock\'s drain smells faintly of what the hose was for.',
      again: 'MEDICAL — COLD. FREIGHT 02:00.',
      effects: [{ learn: 'hc_freight_dock' }],
      options: [leave],
    },
    two: {
      text: 'Two in the morning. The freight car comes up out of the rock with no lamps lit and stops at the dock. Two of the Clean carry stretchers off it, one, then another, then a third, people asleep under white sheets with tags on their wrists, and wheel them to the lift lobby without hurrying. A bag goes down the other way: a coat, a pair of boots. The brakeman does not look at any of it. He looks at his brake.',
      again: 'The freight at two: stretchers up, a bag of effects down.',
      effects: [{ learn: 'hc_freight_seen' }],
      interject: [
        { companion: KES, text: 'Kes stands very still. "That\'s how I came up," she says. "At sixteen. Asleep, on the freight. They woke me on nine with the port already in." She does not say anything else, and does not move until the car has gone.' },
        { companion: TAMSIN, text: 'Tamsin watches the stretchers go. "In the Cistern we carried our dead up the stairs to the vault," she says. "Like that. Slowly. As if they could still be woken." She stops. "Those can."' },
      ],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the gate (beat 16: four ways in)

const RECEPTION_TEXT = [
  { if: MARKED, text: 'The woman at reception reads the card, and then reads it again, and looks past you at the captain of the Clean, who has come out of nowhere to stand at your shoulder. "The Board\'s guest," she says. "Yes. The Board has asked that the designate be accompanied." Captain Saar does not smile. "You stood beside the Shift," she says. "The Board says you are its guest. I say you are watched. We can both be right."' },
  { if: WARM, text: 'The woman at reception reads the card and her whole face changes. "Oh, the designate. Meridian sent word; you were so very helpful there." She prints a white card with your face on it and the word GUEST under the face, and hands it to you with both hands. "The Board is so pleased. The lifts will know you. Mind the step; it is the only one."' },
  { text: 'The woman at reception reads the card, and the lens over her desk turns to look at you, and a small light under it goes from white to green. "The designate. The Board\'s guest." She prints a white card with your face on it and the word GUEST under the face. "The lifts will know you. Floors are printed on the back. Mind the step; it is the only one."' },
];
/** The guest goes in; the Contract line's paper is the Board's word unless the player already carries a contract. */
const GUEST_IN: OptionDef[] = [
  { id: 'gate.guest.in', text: '(Go through the arch.)', if: { not: { flag: 'hc_contract' } }, effects: [{ give: 'k_hc_guest_pass' }, { set: 'hc_contract', value: 'guest' }, { quest: 'q_hc_contract', start: true }, ...IN('guest')], exit: true },
  { id: 'gate.guest.in2', text: '(Go through the arch.)', if: { flag: 'hc_contract' }, effects: [{ give: 'k_hc_guest_pass' }, ...IN('guest')], exit: true },
];

export const d_hc_gate: DialogueDef = {
  id: 'd_hc_gate', owner: 'narrator', start: [{ if: { flag: 'hc_entry' }, node: 'known' }, { node: 'arch' }],
  nodes: {
    arch: {
      text: [
        { if: GATE_SHUT, text: 'The arch in the screen: white steel, a lens at its crown like an eye that is not quite shut. Four of the Clean at it now, not two, and a new plate screwed under the lens: CONTRACTS FROM THE SLOPE SUSPENDED. CITIZENS THROUGH. THE BOARD\'S GUESTS TO RECEPTION.' },
        { text: 'The arch in the screen: white steel, a lens at its crown like an eye that is not quite shut. On the station side a reception desk with a woman behind it smiling at nothing, and a plate: FACE TO THE LENS. CITIZENS THROUGH. THE BOARD\'S GUESTS TO RECEPTION. ALL OTHERS ARE PROCESSED.' },
      ],
      again: 'The arch, and the lens at its crown.',
      effects: [{ learn: 'hc_gate_seen' }],
      interject: [
        { companion: KES, text: '"Every face that comes up goes in that lens," Kes says. "Mine\'s in there twice. Once at sixteen, asleep, and once every day since, because I keep the thing it talks to." She grins at it. It does not grin back.' },
        { companion: NINE, text: '"PROCESSED," Nine reads. "The record has that word for people too." Its lens rests on the plate. "It is always the one with nobody\'s name under it."' },
      ],
      options: [
        { id: 'gate.guest', text: '(Take the Board\'s card to reception.)', if: { item: 'k_hc_invitation' }, next: 'reception' },
        { id: 'gate.contract', text: '(Face the lens with your contract.)', if: { item: 'k_hc_contract' }, next: 'citizen' },
        { id: 'gate.forged', text: '(Face the lens with the Window\'s copy of a contract.)', if: { item: 'k_hc_contract_forged' }, next: 'forged' },
        { id: 'gate.chrome', text: '(Walk into the lens and let it read what is in you.)', if: LEASHED, next: 'chrome' },
        { id: 'gate.walk', text: '(Walk into the lens.)', if: { not: LEASHED }, once: true, next: 'refused' },
        leave,
      ],
    },
    reception: {
      speaker: 'npc_hc_08',
      text: RECEPTION_TEXT,
      again: '"The Board\'s guest. Mind the step."',
      effects: [{ learn: 'hc_received' }, { quest: 'q_hc_contract', start: true }],
      passives: [{ if: { not: { flag: 'hs_bell_met' } }, label: 'appointment', text: '"You did not keep your appointment at Footgate," she adds, as if it were a smudge on your collar. "No matter. The Board keeps it for you."' }],
      options: GUEST_IN,
    },
    citizen: {
      text: [
        { if: GATE_SHUT, text: 'The lens reads the contract, and your face, and a light goes amber. CONTRACTS FROM THE SLOPE SUSPENDED. Then, after a long moment in which the four of the Clean shift their weight, green: CITIZEN — PROBATIONARY. The contract was signed on the hill\'s paper; the hill reads its own paper.' },
        { text: 'The lens reads the contract, and your face, and the light under it goes green. A voice from nowhere: "Citizen. Probationary. Welcome to Halcyon." The two of the Clean step apart to let you through, and do not look at you, the way they do not look at anyone who belongs.' },
      ],
      again: 'CITIZEN — PROBATIONARY.',
      options: [{ id: 'gate.in.contract', text: '(Go in.)', effects: IN('contract'), exit: true }],
    },
    forged: {
      text: 'The lens reads the Window\'s copy, and your face, and thinks about it for exactly as long as it thinks about everyone. Green. "Citizen. Welcome home." The forgery is the Window\'s own print on the Window\'s own stock, and the lens has never once been asked to doubt the Window.',
      again: 'Green. "Welcome home."',
      interject: [{ companion: KES, text: '"Obviously," Kes breathes, very quietly, as the light goes green. "Obviously obviously obviously."' }],
      options: [{ id: 'gate.in.forged', text: '(Go in.)', effects: IN('contract'), exit: true }],
    },
    chrome: {
      text: 'You walk into the lens and it does not look at your face at all. It looks at the work in you: the Concern\'s, with its channel running up the hill like a thread out of the back of your skull. Green. "Citizen." No name. It does not need your name; it has your number. Somewhere above you, very faintly, something takes note.',
      again: 'Green, for the work in you.',
      interject: [{ companion: ASH, text: 'Ash watches the light go green and his hand goes to the scar at the back of his own neck. "That\'s what it is," he says. "Not a door. A collar with a lock that opens from their side."', effects: [S(-2)] }],
      options: [{ id: 'gate.in.chrome', text: '(Go in.)', effects: IN('chrome'), exit: true }],
    },
    refused: {
      text: 'The lens looks at you. The light under it stays white. NOT RECOGNISED. The woman at reception lifts one hand without looking up: "Reception, please, if you are the Board\'s. Processing is at the yard, at dawn, with the gardeners." The two of the Clean have not moved, and somehow you are standing a step further from the arch than you were.',
      again: 'NOT RECOGNISED.',
      options: [leave],
    },
    known: {
      text: 'The lens knows you now. The light under it goes green before you reach it, and the Clean step apart.',
      again: 'The lens, green.',
      options: [
        { id: 'gate.through', text: '(Through the arch, into Halcyon.)', effects: [{ set: 'hc_inside' }, GOTO('hc_terrace', 'concourse')], exit: true, repeat: true },
        { id: 'gate.out', text: '(Out to the station.)', effects: [GOTO('hc_terrace', 'car')], exit: true, repeat: true },
        leave,
      ],
    },
  },
};

export const d_hc_screen: DialogueDef = {
  id: 'd_hc_screen', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The screen runs the whole width of the rim: white steel posts and glass between them, four times the height of a man, clean on both sides. Through it the gardens, green and wet and lit, a man sweeping leaves that have not fallen. Somebody on this side has breathed on the glass and written in the fog with a finger, low down where the Clean would not look, and it has not quite faded: TWO-TWELVE.',
      again: 'The screen, and TWO-TWELVE in the fog.',
      options: [leave],
    },
  },
};

export const d_hc_roadpost: DialogueDef = {
  id: 'd_hc_roadpost', owner: 'narrator', start: [{ if: GATE_SHUT, node: 'shut' }, { node: 'post' }],
  nodes: {
    post: {
      text: 'The Clean\'s post where the road comes through the rim: a lamp, a board, two of them in grey with nothing on their boots. GARDENERS AT DAWN. FREIGHT BY THE DOCK. THE YARD IS FOR THE YARD. One of them looks at you, at your clothes, at your hands, and decides you are not worth the walk.',
      again: 'The Clean\'s post. THE YARD IS FOR THE YARD.',
      effects: [{ learn: 'hc_road_seen' }],
      options: [
        { id: 'post.card', text: '(Show them the Board\'s card.)', if: { all: [{ item: 'k_hc_invitation' }, { not: { flag: 'hc_entry' } }] }, next: 'card' },
        leave,
      ],
    },
    shut: {
      text: 'The Clean\'s post where the road comes through the rim: four of them now, rifles, a barrier of new steel across the road, and a notice: SINCE THE CABLE HOUSE, EVERY HEAD IS COUNTED. NOBODY FROM THE SLOPE COMES UP. They count you. You can see them do it.',
      again: 'Four of the Clean, counting.',
      effects: [{ learn: 'hc_road_seen' }],
      interject: [{ companion: ILYA, text: 'Ilya reads the rifles, then the men holding them, then the barrier. "Right," he says. "They\'re frightened. That\'s worse."' }],
      options: [
        { id: 'post.card2', text: '(Show them the Board\'s card.)', if: { all: [{ item: 'k_hc_invitation' }, { not: { flag: 'hc_entry' } }] }, next: 'card' },
        leave,
      ],
    },
    card: {
      text: 'The one who decided you were not worth the walk reads the card and decides otherwise, quickly. "The designate." He walks you himself, along the screen past the sheds, to the top station and the reception desk under the arch, and leaves you there as if you were something he had been told not to drop.',
      again: 'Walked to reception.',
      options: [{ id: 'post.walked', text: '(Go to reception.)', effects: [GOTO('hc_terrace', 'car')], exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the yard and the gardeners' tunnel

export const d_hc_gardeners: DialogueDef = {
  id: 'd_hc_gardeners', owner: 'narrator', start: [{ if: DAWN, node: 'line' }, { node: 'empty' }],
  nodes: {
    empty: {
      text: 'A bench along the screen\'s wall, worn pale where people sit, and a board: GARDENERS 05:00 IN — 19:00 OUT. ONE DAY, ONE SCRIP, OFF THE WINDOW. FACE TO THE LENS. BOOTS. MOUTHS.',
      again: 'GARDENERS 05:00.',
      options: [leave],
    },
    line: {
      text: 'The gardeners\' line: twenty people from the Skirts on the bench in the half-dark, coal in the creases of their hands, eating nothing. Each of them has paid a scrip off their Window balance for a day\'s work in the gardens, and will be paid two back at the evening search if the keeper signs them off. An old woman at the end of the bench is coughing into a rag and folding it.',
      again: 'The gardeners\' line, waiting for the iron door.',
      effects: [{ learn: 'hc_gardeners_line' }],
      options: [
        { id: 'gard.buy', text: '(Offer the coughing woman ten Tolls for her day stamp.)', if: { all: [TOLLS(10), { not: { item: 'k_hc_daypass' } }, { not: { seen: 'gard.buy' } }] }, effects: [{ take: 'tolls', count: 10 }, { give: 'k_hc_daypass' }], next: 'bought' },
        { id: 'gard.ask', text: 'What\'s it like in there?', if: { not: { seen: 'gard.ask' } }, next: 'ask' },
        leave,
      ],
    },
    bought: {
      text: 'She looks at the money for a long time. Ten Tolls is sixty scrip at the booth on Two-Twelve, which is a month of her days. "Go on, then," she says, and peels the stamped card off her sleeve and gives it to you. "Eyes on the beds. Don\'t eat anything. They look in your mouth." She goes back down the road coughing, richer than she has been in years, and the line closes up behind her as if she had never been on it.',
      again: 'Her place on the bench, closed up.',
      options: [leave],
    },
    ask: {
      text: 'A man with a rake over his shoulder answers without looking at you. "Warm. Wet. It rains out of pipes at ten and four. Fruit on everything." He spits. "Thirty years I\'ve grown oranges I\'ve never eaten. They look in your mouth at the evening search. Boots, pockets, mouth. Somebody tried to take a plum down once in his cheek. They didn\'t send him down. They sent him up." He means floor nine. He does not need to say it.',
      again: '"They sent him up."',
      effects: [{ learn: 'hc_search_known' }],
      options: [{ text: '(Leave them to their bench.)', exit: true }],
    },
  },
};

export const d_hc_tunnel: DialogueDef = {
  id: 'd_hc_tunnel', owner: 'narrator', start: [{ if: DAWN, node: 'dawn' }, { node: 'shut' }],
  nodes: {
    shut: {
      text: 'A low iron door in the screen\'s footing with a lens beside it: the gardeners\' tunnel, which runs under the screen and comes up in the sheds inside. Shut. A plate: 05:00 IN — 19:00 OUT.',
      again: 'The iron door, shut.',
      options: [
        { id: 'tun.kes', text: '(Kes puts her hand flat on the lens.)', if: KES_IN, next: 'kes' },
        leave,
      ],
    },
    dawn: {
      text: 'Dawn. The iron door is open and the gardeners go in one by one, face to the lens, a clerk stamping each card, two of the Clean at the door who look at every face and see none of them. The tunnel behind is dark and smells of wet earth and machine oil.',
      again: 'The gardeners going in, face to the lens.',
      options: [
        { id: 'tun.sneak', text: '(Go in among them, head down, eyes on the floor.)', check: { skill: 'stealth', dc: 45, mods: [{ if: { inParty: WREN }, dc: -5, why: 'Wren walks like a debtor and you walk like Wren' }, { if: MARKED, dc: 10, why: 'the Clean have your face' }] }, next: 'in', fail: 'turned' },
        { id: 'tun.pass', text: '(Show the lens a gardener\'s day stamp.)', if: { item: 'k_hc_daypass' }, effects: [{ take: 'k_hc_daypass' }], next: 'in_pass' },
        { id: 'tun.kes2', text: '(Kes puts her hand flat on the lens.)', if: KES_IN, next: 'kes' },
        leave,
      ],
    },
    in: {
      text: 'You keep your head down and your hands loose and the line carries you. The lens looks at a hundred faces a morning and wants none of them. The clerk stamps the air where your card would be. Then the dark, and the smell of earth, and a ladder up into a shed full of rakes.',
      again: 'Up the ladder into the sheds.',
      options: [{ id: 'tun.in', text: '(Up into the gardens.)', effects: [...ENTER('tunnel'), GOTO('hc_terrace', 'tunnel')], exit: true }],
    },
    in_pass: {
      text: 'The clerk stamps the day stamp without reading it. The lens reads the stamp, not the face, the way the Skirts said it would. Behind you somebody coughs into a rag. The tunnel, the dark, the ladder, the sheds.',
      again: 'The stamp, not the face.',
      options: [{ id: 'tun.in.pass', text: '(Up into the gardens.)', effects: [...ENTER('tunnel'), GOTO('hc_terrace', 'tunnel')], exit: true }],
    },
    kes: {
      text: 'Kes puts her palm on the lens like somebody greeting a dog she knows. Something clicks in the door. "I keep this one," she says. "Well. I keep the thing that keeps it." The iron door swings in on the dark. "Mind the ladder. Obviously."',
      again: 'The door, open for Kes.',
      options: [{ id: 'tun.in.kes', text: '(Up into the gardens.)', effects: [...ENTER('tunnel'), GOTO('hc_terrace', 'tunnel'), K(2)], exit: true }],
    },
    turned: {
      text: 'The lens looks at you twice. One of the Clean at the door puts out an arm, not hard, the way you stop a cart. "Card." You have none. "Not on the list, not in the line." The line closes up past you and goes in, and the iron door shuts on it, and the sun comes up on you standing in a yard full of barrows.',
      again: '"Not on the list."',
      options: [leave],
    },
  },
};

export const d_hc_tunnel_in: DialogueDef = {
  id: 'd_hc_tunnel_in', owner: 'narrator', start: [{ if: EVENING, node: 'search' }, { node: 'hatch' }],
  nodes: {
    hatch: {
      text: 'A hatch in the floor of the gardeners\' shed, an iron ladder going down into the tunnel under the screen. Rakes and barrows and sacks of compost, and a list on the wall of who is signed on today.',
      again: 'The hatch and the ladder.',
      options: [{ id: 'tin.out', text: '(Down the ladder and out to the yard.)', effects: [GOTO('hc_terrace', 'yard')], exit: true, repeat: true }, leave],
    },
    search: {
      text: 'The evening search. The gardeners stand in a line at the hatch with their boots in their hands. One of the Clean looks in each pair of boots, in each pocket, and then, with a little torch, in each mouth, and the gardener opens wide and looks at the roof of the shed while he does it. Nobody says anything. It takes an hour.',
      again: 'Boots, pockets, mouths.',
      effects: [{ learn: 'hc_search_seen' }],
      interject: [
        { companion: WREN, text: 'Wren watches the torch go into an old man\'s mouth and her jaw goes tight. "On the block at Ninebridge," she says, "they look at your teeth to price you." She doesn\'t say anything else for a long time.', effects: [W(-1)] },
        { companion: ODILE, text: '"A plum," Odile says, very quietly. "They are searching for a plum." She takes her glasses off. "My dear, I have audited a great many houses. This is the first one that has made me want to steal."' },
      ],
      options: [{ id: 'tin.out2', text: '(Down the ladder and out to the yard.)', effects: [GOTO('hc_terrace', 'yard')], exit: true, repeat: true }, leave],
    },
  },
};

// ---------------------------------------------------------------- the concourse: the card, the registry, the lifts

export const d_hc_ballcard: DialogueDef = {
  id: 'd_hc_ballcard', owner: 'narrator', start: [{ if: { flag: 'hc_ball' }, node: 'after' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A card in a gilt frame on an easel, in a hand so even it might be print: THE BOARD\'S BALL — THE SEASON\'S RENEWAL — ON THE BOARD\'S FLOOR, WHEN THE DESIGNATE IS PLEASED TO ATTEND. Under it, smaller: THE BOARD RENEWS BEFORE THE BALL.',
      again: 'The Board\'s ball, when the designate is pleased.',
      effects: [{ learn: 'hc_ball_card' }],
      interject: [{ companion: ODILE, text: '"When the designate is pleased," Odile reads. "They have built their season round you, my dear. That is either flattery or a schedule, and on a hill like this it is never flattery."' }],
      options: [leave],
    },
    after: { text: 'The easel is empty. A cleaner is polishing the frame.', again: 'The empty easel.', options: [leave] },
  },
};

export const d_hc_floors: DialogueDef = {
  id: 'd_hc_floors', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A board by the lifts in enamel letters: GARDENS — TERRACES — RECEPTION. NINE: CLINIC (STAFF). BOARD. WORKS (STAFF). Floors two to eight are not on the board. Floors two to eight are the citizens\' flats, Gallo will tell you if you ask; and nine is nine.',
      again: 'GARDENS. NINE. BOARD. WORKS.',
      options: [leave],
    },
  },
};

/** Who the lift will carry to nine: the Board's tour, Dr Lisle's name, a fitted citizen, Kes, or the panel shorted. */
export const CLINIC_OK: Cond = { any: [{ flag: 'hc_clinic_open' }, { flag: 'hs_lisle_favour' }, { member: 'concern', rank: 'contract' }, { flag: 'hc_lift_kes' }, { flag: 'hc_lift_shorted' }] };

export const d_hc_lift: DialogueDef = {
  id: 'd_hc_lift', owner: 'narrator', start: [{ node: 'panel' }],
  nodes: {
    panel: {
      text: 'A lift with walls of pale wood and a lens in its ceiling. Four buttons: GARDENS, NINE, BOARD, WORKS. The lens looks at you and the BOARD button lights by itself.',
      again: 'The lift, four buttons and a lens.',
      options: [
        { id: 'lift.gardens', text: '(GARDENS.)', if: { not: { at: 'hc_terrace' } }, effects: [GOTO('hc_terrace', 'lift')], exit: true, repeat: true },
        { id: 'lift.nine', text: '(NINE.)', if: { all: [{ not: { at: 'hc_clinic' } }, CLINIC_OK] }, effects: [GOTO('hc_clinic', 'lift')], exit: true, repeat: true },
        { id: 'lift.nine.no', text: '(NINE.)', if: { all: [{ not: { at: 'hc_clinic' } }, { not: CLINIC_OK }] }, next: 'nine_no' },
        { id: 'lift.board', text: '(BOARD.)', if: { not: { at: 'hc_board' } }, effects: [GOTO('hc_board', 'lift')], exit: true, repeat: true },
        { id: 'lift.works', text: '(WORKS.)', if: { not: { at: 'hc_works' } }, effects: [GOTO('hc_works', 'lift')], exit: true, repeat: true },
        leave,
      ],
    },
    nine_no: {
      text: 'The NINE button does not light. The lens in the ceiling says, kindly, "Nine is for staff," and the BOARD button lights again instead, as if to be helpful.',
      again: '"Nine is for staff."',
      options: [
        { id: 'lift.kes', text: '(Kes looks up at the lens.)', if: KES_IN, effects: [{ set: 'hc_lift_kes' }, K(1)], next: 'kes' },
        { id: 'lift.short', text: '(Open the panel under the buttons and talk to it with a screwdriver.)', if: { not: { seen: 'lift.short' } }, check: { skill: 'security', dc: 50 }, effects: [{ set: 'hc_lift_shorted' }], next: 'shorted', fail: 'short_no' },
        { text: '(Leave it.)', next: 'panel' },
      ],
    },
    kes: {
      text: 'Kes looks up at the lens and says something to it under her breath that is not words. The NINE button lights. "It thinks I\'m a grid-hand on a call," she says. "Which I am. Obviously." She does not look happy about nine.',
      again: 'NINE, lit for Kes.',
      options: [{ id: 'lift.kes.go', text: '(NINE.)', effects: [GOTO('hc_clinic', 'lift')], exit: true, repeat: true }, { text: '(Not now.)', next: 'panel' }],
    },
    shorted: {
      text: 'The panel comes off with a click. Behind it the buttons are four switches and a little board that asks the lens before it closes any of them. You stop it asking. NINE lights, and stays lit, and will for whoever presses it until somebody notices.',
      again: 'NINE, lit by a screwdriver.',
      options: [{ id: 'lift.short.go', text: '(NINE.)', effects: [GOTO('hc_clinic', 'lift')], exit: true, repeat: true }, { text: '(Not now.)', next: 'panel' }],
    },
    short_no: {
      text: 'The panel comes off and the little board behind it feels you there and locks every button but BOARD. The lens in the ceiling says, kindly, "Thank you. A technician has been called." You put the panel back.',
      again: 'Every button dark but BOARD.',
      options: [{ text: '(Leave it.)', next: 'panel' }],
    },
  },
};

export const d_hc_registry: DialogueDef = {
  id: 'd_hc_registry', owner: 'narrator', start: [{ if: KES_IN, node: 'kes' }, { if: GRID_CHROME, node: 'jack' }, { node: 'desk' }],
  nodes: {
    desk: {
      text: 'The citizens\' registry: a counter, a clerk on a stool who is mostly a pair of hands, and a terminal with a lens. ENQUIRIES BY LENS. PASSES: APPLY IN PERSON. The clerk looks at you, decides you are the Board\'s, and goes back to stamping.',
      again: 'The registry. ENQUIRIES BY LENS.',
      options: [
        { id: 'reg.linh', text: 'A citizen called Hoang, L. Why was her pass refused?', if: { all: [LINH_OPEN, { not: { knows: 'hc_linh_reserve' } }] }, next: 'linh' },
        { id: 'reg.report', text: 'A citizen wants to go down the hill without a pass. Linh Hoang.', if: LINH_OPEN, next: 'report' },
        leave,
      ],
    },
    linh: {
      text: 'The clerk turns the lens on the terminal without looking at it. HOANG, L. — CITIZEN-BORN — PASS DESCENDING: REFUSED. GROUNDS: RESERVE — NOT FOR TRANSFER. The clerk reads it upside down and says, as if it explained anything, "Reserve." Then, because you are the Board\'s and still standing there: "Typed at birth. Matched. Kept. It\'s a kindness, sir; they\'re the best-fed children on the hill."',
      again: 'RESERVE — NOT FOR TRANSFER.',
      effects: [{ learn: 'hc_linh_reserve' }, { lead: 'l_hc_reserve' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin is quiet a long time. "The Cistern kept a list of who was fit to have children," she says. "Nobody ever told me what it was for. I think I know now what a list like that turns into."', effects: [T(-2)] }],
      options: [back('desk')],
    },
    report: {
      text: 'The clerk stops stamping. "Hoang, L.," she repeats, and writes it on a slip, and rings a little bell under the counter. "Thank you. The registry is grateful." She counts out eighty Tolls in clean Halcyon notes from a drawer that is kept for exactly this. Across the concourse, a minute later, two of the Clean walk up to a girl inside the arch who is counting the car, and speak to her quietly, and she goes with them toward the lifts without making a sound.',
      again: 'The bell under the counter.',
      options: [
        { id: 'reg.report.yes', text: '(Take the money.)', effects: [{ give: 'tolls', count: 80 }, { set: 'hc_funicular', value: 'reported' }, { quest: 'q_hc_funicular', start: true }, K(-25), T(-15), W(-15), O(-5),
          { decision: { id: 'hc_funicular', text: 'You told the registry that Linh Hoang wanted to go down the hill. She was taken to floor nine for review.' } }], exit: true },
        { id: 'reg.report.no', text: '(Leave the money on the counter.)', effects: [{ set: 'hc_funicular', value: 'reported' }, { quest: 'q_hc_funicular', start: true }, K(-20), T(-12), W(-12), O(-5),
          { decision: { id: 'hc_funicular', text: 'You told the registry that Linh Hoang wanted to go down the hill, and left its money on the counter. She was taken to floor nine for review.' } }], exit: true },
      ],
    },
    jack: {
      text: 'The registry\'s terminal, and your port warming as you lean on the counter. The hill\'s citizens are in there, under the glass, every one of them a page with a face on it. The clerk is stamping and not looking.',
      again: 'The registry\'s pages, under the glass.',
      options: [
        { id: 'reg.jack', text: '(Think your way in and write yourself a citizen\'s page.)', if: { all: [{ not: { flag: 'hc_contract' } }, { not: { seen: 'reg.jack' } }] }, check: { skill: 'science', dc: 55 }, effects: [{ give: 'k_hc_contract_forged' }, { set: 'hc_contract', value: 'infiltrator' }, { quest: 'q_hc_contract', start: true }], next: 'jacked', fail: 'jack_no' },
        { id: 'reg.linh2', text: 'A citizen called Hoang, L. Why was her pass refused?', if: { all: [LINH_OPEN, { not: { knows: 'hc_linh_reserve' } }] }, next: 'linh' },
        { id: 'reg.report2', text: 'A citizen wants to go down the hill without a pass. Linh Hoang.', if: LINH_OPEN, next: 'report' },
        leave,
      ],
    },
    jacked: {
      text: 'You find an empty page and fill it the way the registry fills them: a face, a number nobody has, a fitting dated last spring that never happened. The printer under the counter hums and gives you forty pages, warm. The clerk tears them off for you without looking up. "Citizen," she says.',
      again: 'Forty warm pages.',
      options: [leave],
    },
    jack_no: {
      text: 'The registry notices you a moment before you find an empty page. The terminal goes dark; the lens turns, slowly, to look at you; and the clerk stops stamping. "Is there a problem, sir?" There isn\'t, you tell her. She goes back to stamping, and does not stop watching.',
      again: 'The dark terminal.',
      options: [leave],
    },
    kes: {
      text: 'Kes leans on the registry\'s counter and the lens on the terminal turns away from both of you without being asked. "The hill\'s paper," she says. "Every citizen, every pass, every child. I keep the Window\'s half of it. This half talks to mine every night." The clerk looks at Kes\'s port, and at her coal-dark nails, and decides not to ask.',
      again: 'Kes at the registry, the lens looking politely elsewhere.',
      options: [
        { id: 'reg.kes.me', text: 'Write me in as a citizen.', if: { not: { flag: 'hc_contract' } }, effects: [{ give: 'k_hc_contract_forged' }, { set: 'hc_contract', value: 'infiltrator' }, { quest: 'q_hc_contract', start: true }, K(3)], next: 'kes_me' },
        { id: 'reg.kes.linh', text: 'Linh Hoang. Why was her pass refused?', if: { all: [LINH_OPEN, { not: { knows: 'hc_linh_reserve' } }] }, effects: [{ learn: 'hc_linh_match' }], next: 'kes_linh' },
        { id: 'reg.kes.pass', text: 'Print her a pass down.', if: { all: [LINH_OPEN, { not: { item: 'k_hc_linh_pass' } }] }, effects: [{ give: 'k_hc_linh_pass' }, K(5)], next: 'kes_pass' },
        { id: 'reg.kes.immy', text: 'There\'s a girl from the Saints\' tower in the school on the terraces. Print her a pass down too.', if: { all: [{ knows: 'hc_immy_told' }, { not: { flag: 'hc_immy' } }] }, effects: [{ set: 'hc_immy', value: 'home' }, K(5), { decision: { id: 'hc_immy', text: 'Kes printed a pass down for the girl from the Saints\' tower, and she went home to Bridgeward.' } }], next: 'kes_immy' },
        { id: 'reg.report3', text: 'A citizen wants to go down the hill without a pass. Linh Hoang.', if: LINH_OPEN, next: 'report' },
        leave,
      ],
    },
    kes_me: {
      text: 'Her fingers go into the terminal\'s guts and something clicks behind her eyes. "Face. Number nobody\'s got. Fitted last spring, very brave, no complications." The printer hums and hands you forty pages, warm. "Every lens on the hill will believe that. Obviously don\'t let a person read it."',
      again: 'Forty warm pages.',
      options: [back('kes')],
    },
    kes_linh: {
      text: 'The page comes up on the lens and Kes reads it and her face shuts. "RESERVE. NOT FOR TRANSFER. MATCH: WRAY, C." She says it flat. "They type the babies born up here. The ones that match a Board member are kept. Fed, schooled, never down the hill, in case the Board member needs a liver she can\'t get off the freight." She swallows. "Her mother was a gardener off Nursery. Hoang, Mai. Went into service the year Linh was six." She shuts the page. "For trying to take her down."',
      again: '"MATCH: WRAY, C."',
      effects: [{ learn: 'hc_linh_reserve' }, { lead: 'l_hc_reserve' }],
      options: [back('kes')],
    },
    kes_pass: {
      text: '"Pass down. Citizen-born. One journey." The printer hums. Kes stamps the card with the registry\'s own stamp, off the clerk\'s own counter, while the clerk watches and says nothing. "It doesn\'t say what she is," Kes says. "That\'s the trick with paper. It only says what you tell it."',
      again: 'A pass, warm, stamped.',
      options: [back('kes')],
    },
    kes_immy: {
      text: 'Kes finds the page and doesn\'t read it out. The printer hums. In the morning a girl of sixteen in a school smock rides the car down to Footgate with a pass in her hand and a pair of clean shoes she will ruin by the Line, and goes home to a tower in Bridgeward with forty dead radios in it. Nobody up here will notice for a week. The school has a great many children.',
      again: 'A pass down, for the tower.',
      options: [back('kes')],
    },
  },
};

// ---------------------------------------------------------------- the gardens: the keeper, the vault, the tree

export const d_hc_seedvault: DialogueDef = {
  id: 'd_hc_seedvault', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The seed vault: a cold concrete room behind the keeper\'s lodge, shelves of foil packets in steel trays, every packet stamped with the closed eye: CONCERN LINE — a crop — a number — F1 — DO NOT SAVE. On a lower shelf, a stack of crates in coarser paper, rope-tied, with a guild tally on each: OPENFIELD — GUILD LOT — BY NIGHT.',
      again: 'Foil packets: F1 — DO NOT SAVE. And Openfield\'s crates.',
      effects: [{ learn: 'hc_vault_seen' }],
      passives: [
        { skill: 'science', dc: 40, text: 'F1: the first cross of two pure lines. It grows strong and even, once. Save its seed and plant it and the next year comes up all different, half of it worthless. Whoever owns the parent lines sells you the seed again every spring, forever.', effects: [{ learn: 'hc_seed_f1' }] },
        { skill: 'survival', dc: 40, text: 'You have grown things that came true from their own seed and things that did not. These do not. DO NOT SAVE is not an instruction. It is a warning that saving them is useless, which means every farm that plants them comes back here every spring.', effects: [{ learn: 'hc_seed_f1' }] },
      ],
      interject: [{ companion: ASH, text: 'Ash turns an Openfield crate over and reads the tally. "That\'s our store," he says. "The Choir\'s. The guild\'s been buying it out the back by night and sending it here." He puts it down very carefully. "We\'ve been planting their packets and selling them our seed."', effects: [S(-2)] }],
      options: [leave],
    },
  },
};

export const d_hc_orange: DialogueDef = {
  id: 'd_hc_orange', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'One orange tree in a big glazed pot, older than anything else in the gardens, with a ring of white gravel round it that nobody walks on. Oranges on it, dozens, glowing like lamps. A citizen goes past and touches the pot lightly for luck without breaking stride. One of the Clean stands near it all day.',
      again: 'The orange tree, and the Clean beside it.',
      interject: [
        { companion: KES, text: '"That one," Kes says. "I saw it at sixteen, on the way out of nine, with the port still hot." She looks at it with a face you have not seen on her. "They let me hold one. Not eat it. Hold it. Then a nurse took it back." Then: "Obviously I don\'t think about it."', effects: [{ learn: 'kes_orange' }] },
        { companion: TAMSIN, text: 'Tamsin stares. "That\'s a tree," she says. "With food on it. Just. Growing." She laughs, and it comes out wrong.' },
      ],
      options: [leave],
    },
  },
};

export const d_hc_bench: DialogueDef = {
  id: 'd_hc_bench', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'hc_chair', eq: 'retired' }, text: 'A bench by the orange tree with a brass plate: FOR THE CHAIR. The Chair is on it, in a coat too warm for the gardens, with his hands on his knees, saying something courteous to nobody.' },
        { if: { knows: 'hc_jars' }, text: 'A bench by the orange tree with a brass plate: FOR THE CHAIR. Under it, behind a sack of compost nobody would move, Kojo\'s jars, twenty-two of them, labelled in pencil.' },
        { text: 'A bench by the orange tree with a brass plate: FOR THE CHAIR. Nobody sits on it. Under it, a sack of compost that has been there long enough to grow moss.' },
      ],
      again: 'FOR THE CHAIR.',
      options: [leave],
    },
  },
};

const YAW_DOWN = (where: 'skirts' | 'openfield', text: string): Effect[] => [
  { take: 'k_hc_jars' }, { set: 'hc_garden', value: where }, { decision: { id: 'hc_garden', text } },
  { rep: { faction: 'concern', respect: -5 } }, K(5), S(where === 'openfield' ? 10 : 3), T(3),
  { news: { tag: where === 'skirts' ? 'hc_seed_skirts' : 'hc_seed_openfield', text: where === 'skirts' ? 'old seed came down from Halcyon\'s gardens to Nursery, in jam jars, with oranges for the children' : 'seed that comes true came down from Halcyon to Openfield\'s store', valence: 5, size: 5, at: where === 'skirts' ? 'skirts' : 'openfield' } },
];
const WHERE: OptionDef[] = [
  { id: 'yaw.where.skirts', text: 'Nursery. Between the shacks and the graves.', effects: YAW_DOWN('skirts', 'Kojo Frimpong\'s seed jars went down the hill to Nursery, and oranges for the children.'), next: 'gone_skirts' },
  { id: 'yaw.where.of', text: 'Openfield. People there plant by hand and save what they plant.', effects: YAW_DOWN('openfield', 'Kojo Frimpong\'s seed jars went down the Line to Openfield\'s store.'), next: 'gone_of' },
];

export const d_hc_yaw: DialogueDef = {
  id: 'd_hc_yaw', owner: 'npc_hc_07',
  start: [
    { if: { flag: 'hc_garden', eq: 'caught' }, node: 'review' },
    { if: { flag: 'hc_garden' }, node: 'after' },
    { if: { flag: 'hc_yaw_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A broad man in a canvas apron sweeping leaves off a path, though none have fallen; he is taking them off the trees with a long hooked pole before they are ready, and sweeping them before they know. Grey in his beard, earth in the creases of his hands. "Keeper," he says, and keeps sweeping. "Kojo. If you\'re the Board\'s, the beds are mine and the paths are yours. If you\'re not, you\'re standing on a bed."',
      again: 'Kojo, sweeping leaves before they fall.',
      effects: [{ set: 'hc_yaw_met' }, { quest: 'q_hc_garden', start: true }],
      options: [
        { id: 'yaw.leaves', text: 'Why take the leaves off before they fall?', next: 'leaves' },
        { id: 'yaw.who', text: 'You\'re from the Skirts.', next: 'who' },
        bye,
      ],
    },
    again: {
      text: [{ if: YAW_OK, text: 'Kojo leans the pole on a tree and wipes his hands. "Well," he says, low. "Are we doing it?"' }, { text: 'Kojo keeps sweeping. "Paths are yours, beds are mine."' }],
      again: 'Kojo, sweeping.',
      options: [
        { id: 'yaw.leaves2', text: 'Why take the leaves off before they fall?', if: { not: { seen: 'yaw.leaves' } }, next: 'leaves' },
        { id: 'yaw.who2', text: 'You\'re from the Skirts.', if: { not: { seen: 'yaw.who' } }, next: 'who' },
        { id: 'yaw.vault', text: 'What\'s in the seed vault?', if: { not: { seen: 'yaw.vault' } }, next: 'vault' },
        { id: 'yaw.yours', text: 'What do you grow for yourself?', if: { all: [{ seen: 'yaw.who' }, { not: YAW_OK }, { not: { seen: 'yaw.yours' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: KES_IN, dc: -15, why: 'Kes is from Nursery, and he knew her mother' }, { if: SHIFT_WON, dc: -10, why: 'the Shift won, and the gardeners know who stood with it' }, { if: MARKED, dc: -5, why: 'the Clean watch you; that is a recommendation up here' }] }, effects: [{ set: 'hc_yaw_trust' }, { learn: 'hc_jars' }, { give: 'k_hc_jars' }], next: 'jars', fail: 'yours_no' },
        { id: 'yaw.down', text: 'The jars. How do we get them down?', if: { all: [YAW_OK, GARDEN_OPEN, { item: 'k_hc_jars' }] }, next: 'down' },
        { id: 'yaw.tunnel', text: 'There are people on nine who need to get out by the tunnel at dawn.', if: { all: [YAW_OK, { flag: 'hc_sleepers_woken' }, { not: { flag: 'hc_clinic' } }] }, next: 'tunnel' },
        bye,
      ],
    },
    leaves: {
      text: '"The Board walks here at four, after the rain. A brown leaf on a white path is a complaint. A complaint is a review." He reaches up with the hook and takes a leaf that is only just turning, and drops it in his barrow. "So I take them while they\'re green. I\'ve been doing it thirty years. The trees don\'t mind. I mind."',
      again: '"A brown leaf on a white path is a complaint."',
      options: [back()],
    },
    who: {
      text: '"Nursery. Born in a shack on the beginners\' slope, three doors down from where the Haber boy\'s father lived." He stops sweeping. "They took me up at twenty-seven to keep the gardens because I could make anything grow in coal slack, and I\'ve been up thirty years, and I go down once a year in the car to see my sister\'s grave. They search me at the bottom too." He starts sweeping again. "They pay well. I eat fruit. I sleep in a lodge with a roof that doesn\'t leak. I\'m the luckiest man from the Skirts there is, and you should hear how that sounds in my own head."',
      again: '"The luckiest man from the Skirts there is."',
      effects: [{ learn: 'hc_yaw_skirts' }],
      interject: [{ companion: KES, text: '"Uncle Kojo," Kes says, and he looks up and his whole face goes. "Kestrel Oyelaran," he says. "Look at you. Look at your mother\'s chin."' }],
      options: [back()],
    },
    vault: {
      text: '"The Concern\'s seed. Their own lines, bred before the Burn in this very glass, and they still keep the parents locked where I\'ve never been. What\'s in the vault is the crosses: F1. Grows like a dream, once. Save it and plant it and next year you get rubbish." He looks at the vault door. "They sell it down the Line every spring. And the guild\'s been buying Openfield\'s store out the back by night and bringing it up here, so there\'s less of the other kind about." He spits, carefully, on a bed, where it will do some good.',
      again: '"Grows like a dream, once."',
      effects: [{ learn: 'hc_seed_f1' }],
      interject: [{ companion: ODILE, text: '"A seed you have to buy again every spring," Odile says. "My dear, that isn\'t farming. That\'s a subscription."' }],
      options: [back()],
    },
    jars: {
      text: 'Kojo looks at you for a long time, and then at the Clean by the orange tree, and then he goes to the bench with FOR THE CHAIR on its plate and moves the sack of compost from under it as if it weighed nothing. Jam jars. Twenty-two, each with a twist of seed in it and a label in pencil: a bean, a squash, a tomato, a wheat, and a year. Some of the years are before the Burn. "Every one of these comes true," he says. "My grandmother\'s beans. A tomato the keeper before me had off the keeper before him. I\'ve kept them under the Chair\'s own bench for thirty years because it\'s the one place nobody looks." He puts them in a sack and the sack in your hands. "Take them down. To somebody who\'ll plant them and save the seed and give it away. That\'s all seed wants."',
      again: '"That\'s all seed wants."',
      options: [back()],
    },
    yours_no: {
      text: '"Leaves," Kojo says, and reaches up with the hook. "I grow leaves for the Board to not see." He doesn\'t look at you again.',
      again: '"Leaves."',
      options: [back()],
    },
    down: {
      text: '"Searched at the tunnel every evening, boots, pockets, mouths. The freight goes down at two with nobody looking in it but the brakeman. And there\'s you." He looks at your clothes. "Nobody searches the Board\'s guest. Unless the Board\'s told them to."',
      again: '"Nobody searches the Board\'s guest."',
      options: [
        { id: 'yaw.guest', text: '(Carry them out through the arch as the Board\'s guest.)', if: { all: [{ item: 'k_hc_guest_pass' }, { not: MARKED }] }, effects: [{ set: 'hc_garden_how', value: 'guest' }], next: 'where' },
        { id: 'yaw.guest.no', text: '(Carry them out through the arch as the Board\'s guest.)', if: { all: [{ item: 'k_hc_guest_pass' }, MARKED] }, next: 'guest_watched' },
        { id: 'yaw.freight', text: '(The freight at two, with the brakeman.)', if: { all: [MAZUR_OK, CAR_UP] }, effects: [{ set: 'hc_garden_how', value: 'freight' }], next: 'where' },
        { id: 'yaw.tunnel.out', text: '(Down the tunnel at the evening search, among the gardeners.)', check: { skill: 'stealth', dc: 40, mods: [{ if: KES_IN, dc: -10, why: 'Kes makes the lens look elsewhere' }, { if: MARKED, dc: 10, why: 'the Clean have your face' }] }, effects: [{ set: 'hc_garden_how', value: 'tunnel' }], next: 'where', fail: 'caught' },
        { id: 'yaw.sell', text: 'The guild\'s factor would pay for these.', next: 'sell_word' },
        { text: '(Not yet.)', next: 'again' },
      ],
    },
    guest_watched: {
      text: '"Not you." Kojo nods at Captain Saar, who is standing by the screen not looking at you. "You stood with the Shift. She\'s had the gate turn out every bag you carry since you came up. Find another way."',
      again: '"She turns out every bag you carry."',
      options: [{ text: '(Another way.)', next: 'down' }],
    },
    where: {
      text: 'It goes as the hill goes: quietly, and by somebody else\'s rules. The jars are down. Kojo, when you tell him, sits down on a barrow for the first time you have seen and puts his face in his earth-dark hands. "Where?" he says through them.',
      again: '"Where?"',
      options: WHERE,
    },
    caught: {
      text: 'The evening search. The line, the boots, the torch. The Clean at the hatch weighs your sack in one hand and opens it, and takes out a jam jar, and reads the pencil on it, and looks across the shed at Kojo, who has come to see you off. Nobody says anything. Two of them walk Kojo to the lifts. He does not look back at the gardens. The jars go into the vault with everything else the Concern owns.',
      again: 'The jars, and Kojo, taken.',
      effects: [{ take: 'k_hc_jars' }, { set: 'hc_garden', value: 'caught' }, { set: 'hc_yaw', value: 'review' }, K(-5), { decision: { id: 'hc_garden', text: 'The Clean found Kojo Frimpong\'s seed jars on you at the evening search. Kojo was taken for review.' } }],
      options: [{ text: '(Leave.)', exit: true }],
    },
    sell_word: {
      text: 'Kojo looks at the jars and then at you, and says nothing at all, which is what he says to the Board.',
      again: 'Kojo, saying nothing.',
      options: [{ text: '(Another way.)', next: 'down' }, { text: '(Leave him.)', exit: true }],
    },
    tunnel: {
      text: '"How many?" You tell him. He does a sum on his fingers that is not about seed. "The hatch at five. They come down the service stair in the sheds\' clothes, and I put them in the line going out instead of in. The Clean look at faces going in. Nobody\'s ever counted the ones coming out at dawn, because nobody\'s ever gone out at dawn." He takes his apron off and folds it. "I\'ll be reviewed for it. I\'m fifty-seven. Let them."',
      again: '"The hatch at five."',
      effects: [{ set: 'hc_yaw_tunnel' }],
      options: [back()],
    },
    gone_skirts: { text: '"Nursery." He laughs into his hands. "Between the graves." He gets up and picks a net of oranges off the tree, in front of the Clean, who do nothing, and gives it to you. "For the children. Peel and all."', again: 'A net of oranges.', effects: [{ give: 'k_hc_oranges' }], options: [{ text: '(Leave him to his leaves.)', exit: true }] },
    gone_of: { text: '"Openfield." He nods slowly. "They\'ll save it. They\'re mad, the Choir, but they save everything." He goes back to his pole and his leaves and does not say anything else, and he is smiling.', again: 'Kojo, smiling at the leaves.', options: [{ text: '(Leave him to his leaves.)', exit: true }] },
    after: {
      text: [
        { if: { flag: 'hc_garden', eq: 'sold' }, text: 'Kojo looks at the bench where the jars were for a long time, and goes back to his leaves, and does not speak to you.' },
        { text: 'Kojo lifts his pole an inch off the leaves when he sees you, which up here is a wave.' },
      ],
      again: 'Kojo, at his leaves.',
      options: [bye],
    },
    review: { speaker: 'narrator', text: 'Another man in Kojo\'s apron is sweeping leaves that have already fallen. He has not learned the trick yet.', again: 'A new keeper.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Linh Hoang, who counts the car

const LINH_DOWN = (how: string, text: string, more: Effect[] = []): Effect[] => [
  { set: 'hc_funicular', value: 'down' }, { set: 'hc_funicular_how', value: how }, { decision: { id: 'hc_funicular', text } }, K(5), T(5), W(5), ...more,
  { news: { tag: 'hc_linh_down', text: 'a girl born on Halcyon\'s terraces came down to the Skirts and laughed at a goat', valence: 3, size: 3, at: 'skirts' } },
];

export const d_hc_linh: DialogueDef = {
  id: 'd_hc_linh', owner: 'npc_hc_14',
  start: [{ if: { flag: 'hc_funicular', eq: 'stayed' }, node: 'stayed' }, { if: { knows: 'hc_linh_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young woman of nineteen just inside the arch, in a citizen\'s clean grey with the cuffs lit, standing where she can see the top station through the screen. Her lips move. She is counting. "Thirty-one up," she says, without turning. "None down. It comes up full and goes down empty. Is it true there are goats in the Skirts?"',
      again: 'Linh, counting the car.',
      effects: [{ learn: 'hc_linh_met' }, { quest: 'q_hc_funicular', start: true }],
      options: [
        { id: 'linh.goats', text: 'There are goats.', next: 'goats' },
        { id: 'linh.count', text: 'Why do you count it?', next: 'count' },
        bye,
      ],
    },
    again: {
      text: [{ if: { item: 'k_hc_linh_pass' }, text: 'Linh sees the card in your hand before you have said anything, and stops counting.' }, { text: 'Linh, counting. "Thirty-four up. None down."' }],
      again: 'Linh, counting.',
      options: [
        { id: 'linh.goats2', text: 'There are goats.', if: { not: { seen: 'linh.goats' } }, next: 'goats' },
        { id: 'linh.count2', text: 'Why do you count it?', if: { not: { seen: 'linh.count' } }, next: 'count' },
        { id: 'linh.mother', text: 'Your mother.', if: { all: [{ seen: 'linh.count' }, { not: { seen: 'linh.mother' } }] }, next: 'mother' },
        { id: 'linh.tell', text: '(Tell her what RESERVE means.)', if: { all: [{ knows: 'hc_linh_reserve' }, LINH_OPEN, { not: { seen: 'linh.tell' } }] }, next: 'tell' },
        { id: 'linh.pass', text: '(Give her the pass.)', if: { all: [{ item: 'k_hc_linh_pass' }, LINH_OPEN] }, next: 'pass' },
        { id: 'linh.road', text: 'Tonight. The road, past the Clean. Stay behind me.', if: { all: [{ seen: 'linh.count' }, LINH_OPEN, { not: { seen: 'linh.road' } }] }, check: { skill: 'stealth', dc: 45, mods: [{ if: KES_IN, dc: -10, why: 'Kes blinds the post\'s lens for the hour' }, { if: GATE_SHUT, dc: 10, why: 'four at the post now, counting' }] }, effects: [{ until: 23 }, ...LINH_DOWN('road', 'You walked Linh Hoang down the road past the Clean at night, and she went down to the Skirts.'), GOTO('hs_skirts', 'from_halcyon', 90)], next: 'road', fail: 'road_no', failEffects: [{ until: 23 }] },
        bye,
      ],
    },
    goats: {
      text: 'She turns round. "Really?" Her face is a child\'s for a moment, then she remembers to be nineteen. "My mother said. She said they eat washing. I thought she was making it up so I\'d laugh." She looks back at the car. "I think she was trying to make me want to go."',
      again: '"They eat washing."',
      options: [back()],
    },
    count: {
      text: '"Because nobody else does." She says it simply. "Thirty-one up today: three contracts, a guest, and twenty-seven asleep. The asleep ones come up on the freight at two but I count them anyway; I come out at two to count them. None down. Not one, all season, except the bags." She looks at you. "I applied for a pass down. Citizens can, with a pass. Mine was refused. They don\'t say why. They never say why. I\'m a good citizen. I count."',
      again: '"Mine was refused."',
      effects: [{ lead: 'l_hc_linh' }],
      options: [back()],
    },
    mother: {
      text: '"Hoang Mai. A gardener, off Nursery. She married a man up here and had me and kept the beds." She stops counting. "When I was six she took me to the car with a bag. I don\'t remember much. The Clean. Her holding my wrist too hard. Then I was in the school and she was in service." She says the word the way everybody up here says it, as if it were a place she had moved to. "That was thirteen years ago. They said she\'d be proud I was so well."',
      again: '"She was in service."',
      interject: [{ companion: KES, text: 'Kes has gone very still. "Thirteen years," she says, to nobody. "On nine." She doesn\'t say what everyone knows about thirteen years on nine.' }],
      options: [back()],
    },
    tell: {
      text: 'You tell her. Typed at birth; matched to Constance Wray; kept on the hill, fed and schooled, in case Constance Wray one day needs what Linh has. She listens to every word. She doesn\'t cry. "Oh," she says at the end. "That\'s why they let me come out at two to count." Then: "If I go, what happens to the match?"',
      again: '"If I go, what happens to the match?"',
      options: [
        { id: 'linh.tell.another', text: 'They\'ll type another one.', next: 'another' },
        { id: 'linh.tell.notyours', text: 'That\'s not yours to carry.', next: 'notyours' },
      ],
    },
    another: {
      text: '"Somebody\'s child. Down there." She looks out at the car for a long time. "Then I\'ll stay." She says it like a sum she has checked. "I\'ll stay by the orange tree, where they can see me, and I\'ll be very well, and she can watch me being well." She almost smiles. "I count. I\'m good at it. I\'ll count her."',
      again: '"I\'ll count her."',
      effects: [{ set: 'hc_funicular', value: 'stayed' }, { decision: { id: 'hc_funicular', text: 'Linh Hoang heard what RESERVE means and chose to stay on the terraces, so that nobody else\'s child would be typed in her place.' } }, K(-2), T(2)],
      options: [{ text: '(Leave her.)', exit: true }],
    },
    notyours: {
      text: '"Isn\'t it?" She thinks about it the way she counts, carefully. "No. It\'s theirs. They made it." She looks at you. "Then I want to go down. How?"',
      again: '"How?"',
      effects: [{ set: 'hc_linh_wants' }],
      options: [back()],
    },
    pass: {
      text: 'She reads it twice. HOANG, L. — PASS DESCENDING — ONE JOURNEY. "It doesn\'t say what I am," she says. "It just says I can." She puts it in her sleeve and does not look back at the terraces once, and walks out through the arch to the car with her clean shoes, and the lens over the arch turns to watch her and does nothing at all, because the paper says she can.',
      again: 'Linh, gone through the arch.',
      effects: [{ take: 'k_hc_linh_pass' }, ...LINH_DOWN('pass', 'Linh Hoang rode down the hill on a citizen\'s pass and went to the Skirts.')],
      options: [{ text: '(Watch her go.)', exit: true }],
    },
    road: {
      text: 'Down the road at night, past the post, Linh behind you in a borrowed coat with her lit cuffs turned in. She does not make a sound the whole way. At the bottom, at Footgate, in the coal dust, she stands and breathes, and in the dark somewhere a goat says something, and she laughs so hard she has to sit down on the road.',
      again: 'Linh, laughing on the road.',
      options: [{ text: '(Walk on.)', exit: true }],
    },
    road_no: {
      text: 'Halfway to the post a lamp swings round and one of the Clean says, "Citizen," gently, to Linh, and she stops as if the word were a hand on her collar. They walk her back to the terraces. Nobody says anything to you at all. In the morning she is inside the arch again, counting, and she does not look at you.',
      again: 'Linh, counting, not looking.',
      options: [{ text: '(Leave.)', exit: true }],
    },
    stayed: {
      text: 'Linh sits on the bench by the orange tree in her clean grey with her hands in her lap, where the Board walks past at four. "Forty-two up," she says. "None down." Then: "Constance came by. She asked me how I was. I said very well." She looks at you. "I am. It\'s what I\'m for."',
      again: '"None down."',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- Wojtek Mazur, the brakeman

export const d_hc_mazur: DialogueDef = {
  id: 'd_hc_mazur', owner: 'npc_hc_13', start: [{ if: { flag: 'hc_mazur_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: CAR_DOWN, text: 'A big man with a shaved head and a week\'s grey stubble, sitting on the step of the brakeman\'s cabin with nothing to brake. "Mazur," he says. "Brake\'s mine. There\'s no car on the end of it. They keep me up here so they can watch me not have a car." He spits off the platform into the rock.' },
        { if: SHIFT_BROKEN, text: 'A big man with a shaved head and a week\'s grey stubble at the car\'s brake, both hands on it. He does not look at you. "Mazur. Brake\'s mine." Then, flat: "They hanged Maren at the bottom of my track. I brought the car down past her twice a day for a week. Ask your question."' },
        { text: 'A big man with a shaved head and a week\'s grey stubble at the car\'s brake, both hands on it, a Shift armband on his Concern grey. "Mazur. Brake\'s mine. The car goes down when I say." He looks at you properly. "You\'re the one stood with Maren. The car\'s yours, any hour."' },
      ],
      again: 'Mazur at his brake.',
      effects: [{ set: 'hc_mazur_met' }],
      options: [
        { id: 'maz.freight', text: 'What goes down on the freight at two?', next: 'freight' },
        bye,
      ],
    },
    again: {
      text: [{ if: MAZUR_OK, text: '"Brake\'s mine," Mazur says. "What do you need carried?"' }, { text: 'Mazur at his brake, not looking at you.' }],
      again: 'Mazur at his brake.',
      options: [
        { id: 'maz.freight2', text: 'What goes down on the freight at two?', if: { not: { seen: 'maz.freight' } }, next: 'freight' },
        { id: 'maz.trust', text: 'I need something carried down at two, and nobody to look in it.', if: { all: [{ not: MAZUR_OK }, CAR_UP, { not: { seen: 'maz.trust' } }] }, check: { skill: 'speech', dc: 45, mods: [{ if: KES_IN, dc: -10, why: 'Kes is Maren\'s, and Maren was his' }, { if: { flag: 'hs_dead_up' }, dc: -10, why: 'you brought the eleven up' }] }, effects: [{ set: 'hc_mazur_trust' }], next: 'trusted', fail: 'trust_no' },
        { id: 'maz.pay', text: '(Put sixty Tolls on his brake.)', if: { all: [{ not: MAZUR_OK }, CAR_UP, TOLLS(60)] }, effects: [{ take: 'tolls', count: 60 }, { set: 'hc_mazur_paid' }], next: 'paid' },
        { id: 'maz.linh', text: 'There\'s a citizen inside the arch who wants to go down. Linh Hoang.', if: { all: [LINH_OPEN, CAR_UP, { not: { seen: 'maz.linh' } }] }, next: 'linh' },
        bye,
      ],
    },
    freight: {
      text: '"Up, at two: sleepers off the Weighhouse, on stretchers, tags on. Cold crates from Lisle\'s back door. Down, at three: bags. Coats and boots, for the Window to send to the kin." He looks at his hands on the brake. "And crates, MEDICAL — COLD, going to the Concern\'s clinics down the Line. Thirty years I\'ve braked that car. Freight doesn\'t strike. That\'s what they said when they made me keep running it through Maren\'s strike, and I did, and I\'ll answer for it."',
      again: '"Freight doesn\'t strike."',
      effects: [{ learn: 'hc_freight_known' }],
      options: [back()],
    },
    trusted: { text: '"At two." He doesn\'t ask what. "Nobody looks in my car but me, and I\'ll be looking at the brake."', again: '"At two."', options: [back()] },
    trust_no: { text: '"Freight\'s the Concern\'s," Mazur says to his brake. "I\'m the Concern\'s. Ask someone who isn\'t."', again: '"Ask someone who isn\'t."', options: [back()] },
    paid: { text: 'He doesn\'t touch the money for a moment. Then he does. "At two," he says. "I\'ll be looking at the brake." He doesn\'t like himself for it, and he takes it anyway, because sixty Tolls is his sister\'s paper for a season.', again: '"At two."', options: [back()] },
    linh: {
      text: '"The counting girl." He has seen her every day for two years, watching his car. "She can\'t ride with a pass refused. The lens on the car reads her." He thinks. "She can ride under the steward\'s stop. A brakeman can stop his car for any danger to the crew, and carry who he likes off it, and the Shift says so and the Concern signed it." His jaw sets. "If the Shift won. If it didn\'t, I can put her in the freight at two with the bags, for the same as anything else."',
      again: '"Under the steward\'s stop."',
      options: [
        { id: 'maz.linh.stop', text: 'Under the steward\'s stop, then.', if: SHIFT_WON, effects: LINH_DOWN('crew', 'Wojtek Mazur stopped the car for Linh Hoang under the steward\'s stop and carried her down to the Skirts.', [{ rep: { faction: 'the_shift', respect: 5 } }]), next: 'linh_gone' },
        { id: 'maz.linh.freight', text: 'The freight at two, with the bags.', if: MAZUR_OK, effects: LINH_DOWN('freight', 'Linh Hoang rode down to the Skirts in the freight at two, among the bags of effects.'), next: 'linh_freight' },
        { text: '(Not yet.)', next: 'again' },
      ],
    },
    linh_gone: { text: 'At noon Mazur stops his car a yard below the top station for a danger to the crew that nobody else can see, and a girl in clean grey steps on, and he takes her down to Footgate with his armband on and his hand on the brake. The lens on the car watches her ride. The steward\'s stop is in the Concern\'s own contract, and the lens has never once been asked to doubt the Concern\'s contract.', again: 'The car gone down, with Linh.', options: [{ text: '(Leave.)', exit: true }] },
    linh_freight: { text: 'At two the freight goes down with the bags of effects, coats and boots for the kin, and among them a girl of nineteen in a borrowed coat, sitting very still. Mazur looks at his brake the whole way.', again: 'The freight gone down at two.', options: [{ text: '(Leave.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the station and the gate's people

export const d_hc_aubert: DialogueDef = {
  id: 'd_hc_aubert', owner: 'npc_hc_08', start: [{ if: { flag: 'hc_aubert_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The woman at reception, in grey with lit cuffs, with a face arranged to be glad to see you before she has decided whether she is. "Reception," she says. "Welcome to Halcyon. The Board\'s guests are received. Everyone else is processed."',
      again: 'Reception, glad to see you.',
      effects: [{ set: 'hc_aubert_met' }],
      options: [{ id: 'aub.processed', text: 'What does "processed" mean?', next: 'processed' }, bye],
    },
    again: {
      text: '"Reception." The smile, again.',
      again: 'The smile.',
      options: [
        { id: 'aub.processed2', text: 'What does "processed" mean?', if: { not: { seen: 'aub.processed' } }, next: 'processed' },
        { id: 'aub.you', text: 'Where are you from?', if: { not: { seen: 'aub.you' } }, next: 'you' },
        bye,
      ],
    },
    processed: {
      text: '"Labour contracts come up at the yard and are fitted at the gate. Service comes up on the freight and goes to nine." She says it as if she were giving directions to the refectory. "Guests come to me. I find guests are much the nicest part of the day."',
      again: '"Service goes to nine."',
      options: [back()],
    },
    you: {
      text: 'For a moment the smile goes somewhere else. "Here," she says. "Floor four. My grandmother came up on a labour contract and was fitted at that gate. I was born a citizen." The smile comes back, a little brighter than before. "I have never been down. I\'m told one doesn\'t miss it."',
      again: '"I\'m told one doesn\'t miss it."',
      options: [back()],
    },
  },
};

export const d_hc_arata: DialogueDef = {
  id: 'd_hc_arata', owner: 'npc_hc_09', start: [{ if: { flag: 'hc_arata_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The gate\'s fitting room: a chair with straps folded neatly on its arms, a lamp on a boom, a tray. The man at the tray is calm and clean and kind about the eyes. "Dr Arata. I fit the citizens." He gestures at the chair as a host gestures at a seat. "A contract is a promise. The implant is how we keep it. Both sides."',
      again: 'Dr Arata at his tray.',
      effects: [{ set: 'hc_arata_met' }],
      options: [
        { id: 'ara.fit', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        { id: 'ara.report', text: 'What does it report?', next: 'report' },
        bye,
      ],
    },
    again: {
      text: '"Sit, if you like," Dr Arata says. "Or don\'t. Most people stand the first time."',
      again: 'Dr Arata, patient.',
      options: [
        { id: 'ara.fit2', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        { id: 'ara.report2', text: 'What does it report?', if: { not: { seen: 'ara.report' } }, next: 'report' },
        { id: 'ara.register', text: 'I\'m fitted. Register me as a contract citizen.', if: { all: [{ member: 'concern', rank: 'probationary' }, { not: { member: 'concern', rank: 'contract' } }, LEASHED] }, effects: [{ promote: { faction: 'concern', rank: 'contract' } }, { set: 'hc_fitted' }, K(-3), S(-5)], next: 'registered' },
        bye,
      ],
    },
    report: {
      text: '"Where you are. What you carry. Your pulse, your sleep, your temperature. Anything you think at the grid, which, if you have a lattice, is more than you\'d like." He says it without embarrassment. "And it can be told to make a limb heavy, or a hand quiet, or a heart slow, if the Window decides a contract is not being kept. That is not cruelty. A promise you cannot check is only a hope, and hopes are what the Skirts runs on. Look at the Skirts."',
      again: '"A promise you cannot check is only a hope."',
      effects: [{ learn: 'hc_report_known' }],
      interject: [{ companion: NINE, text: '"Pulse, sleep, temperature, thought," Nine repeats. "The record only ever wanted where people were and what they owed." It turns its lens to the chair. "I did not know there was further to go."', effects: [N(-1)] }],
      options: [back()],
    },
    registered: {
      text: 'He reads the Concern\'s work in you off a little lens on a wand, nods, and stamps your contract\'s back page. CONTRACT CITIZEN. "Welcome," he says, and means it. "You\'ll find the lifts more forthcoming."',
      again: 'CONTRACT CITIZEN.',
      options: [back()],
    },
  },
};

export const d_hc_kask: DialogueDef = {
  id: 'd_hc_kask', owner: 'npc_hc_10', start: [{ if: { flag: 'hc_kask_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: MARKED, text: 'The captain of the Clean on the hill: a lean woman in grey with a scar through one eyebrow and a carbine she carries the way other people carry their hands. "Saar," she says. "You stood beside the Shift. The Board says you are its guest. I say you are watched. Go where you like; I\'ll be there first."' },
        { text: 'The captain of the Clean on the hill: a lean woman in grey with a scar through one eyebrow and a carbine she carries the way other people carry their hands. "Saar. Halcyon has not had a door forced in ninety years." She looks at you. "Don\'t be the first. That isn\'t a threat. It\'s a statistic I\'m fond of."' },
      ],
      again: 'Saar, watching.',
      effects: [{ set: 'hc_kask_met' }],
      options: [{ id: 'kask.from', text: 'Your accent. You\'re from the slope.', next: 'from' }, bye],
    },
    again: {
      text: '"Designate." Saar does not move from where she stands.',
      again: 'Saar, not moving.',
      options: [
        { id: 'kask.from2', text: 'Your accent. You\'re from the slope.', if: { not: { seen: 'kask.from' } }, next: 'from' },
        bye,
      ],
    },
    from: {
      text: 'Something hard happens in her face and is put away. "Two-Twelve. The bottom of the platform. My father dug Six." She says it the way she would give her number. "I came up on a labour contract at fifteen and I\'ve been the reason nobody from Two-Twelve comes up without paper for twenty years. They know my face down there. They spit when the car goes past." She shrugs. "They\'d do what I did. They just didn\'t get the chance."',
      again: '"They\'d do what I did."',
      interject: [{ companion: WREN, text: '"You\'re the dog that goes back for the sheep," Wren says. Saar looks at her for a long moment. "Yes," she says. "And I eat."' }],
      options: [back()],
    },
  },
};

// ---------------------------------------------------------------- the terraces: the refectory

export const d_hc_gallo: DialogueDef = {
  id: 'd_hc_gallo', owner: 'npc_hc_19', start: [{ if: { flag: 'hc_gallo_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A handsome man at a refectory table peeling an orange with a little silver knife, the peel coming away in one long curl. "The designate! Sit, sit. The orange is from the tree. The only tree. It\'s the season." He offers you a segment. "Lorenzo Gallo. Floor six. Tenure review in the spring; one renews or one is reviewed, ha. You\'ll want to know everything. I know everything."',
      again: 'Gallo and his orange.',
      effects: [{ set: 'hc_gallo_met' }],
      options: [
        { id: 'gallo.renews', text: '"One renews or one is reviewed." What does it mean?', next: 'renews' },
        { id: 'gallo.orange', text: '(Eat the segment.)', next: 'orange' },
        bye,
      ],
    },
    again: {
      text: '"Designate!" Another orange. Gallo is always peeling another orange.',
      again: 'Gallo, peeling.',
      options: [
        { id: 'gallo.renews2', text: '"One renews or one is reviewed." What does it mean?', if: { not: { seen: 'gallo.renews' } }, next: 'renews' },
        { id: 'gallo.board', text: 'How old is the Board?', if: { not: { seen: 'gallo.board' } }, next: 'board' },
        { id: 'gallo.skirts', text: 'Have you ever been down to the Skirts?', if: { not: { seen: 'gallo.skirts' } }, next: 'skirts' },
        bye,
      ],
    },
    orange: {
      text: 'It is the best thing you have eaten in your life. You did not know an orange could taste of that much. Gallo watches you eat it with real pleasure, a host\'s pleasure. "You see?" he says. "You see why one doesn\'t go down?"',
      again: '"You see why one doesn\'t go down?"',
      options: [back()],
    },
    renews: {
      text: '"Tenure. One\'s contract comes up for review every few years: one\'s work, one\'s health, one\'s usefulness. If the Board is pleased, one renews: one stays, one is fitted, one is, ha, kept up. If not." He spreads his hands, knife in one. "One is reviewed. One goes to nine. One\'s family is settled very generously." He pops a segment in his mouth. "It\'s why everyone up here is so very good at their jobs."',
      again: '"One goes to nine."',
      effects: [{ learn: 'hc_review_known' }],
      interject: [{ companion: ILYA, text: 'Ilya stops chewing. He puts the rest of his segment down on the table very carefully, and doesn\'t pick it up again.', effects: [I(-1)] }],
      options: [back()],
    },
    board: {
      text: '"Oh, one doesn\'t ask." He winks. "But my grandmother served the Board its soup, and her Board had the same faces as mine, and mine has the same faces as the photographs in the gallery, and the photographs in the gallery have snow on the roof behind them." He leans in. "Constance Wray skied the runs. She\'ll tell you so if you ask nicely. Everybody knows. Nobody says. That\'s what a citizen is."',
      again: '"Everybody knows. Nobody says."',
      effects: [{ learn: 'hc_ages_rumour' }],
      options: [back()],
    },
    skirts: {
      text: '"Once. On a school trip. They took us down in the car to the Weighhouse to see where service comes from, so we\'d be grateful." For a moment he isn\'t peeling. "There was a boy on the bench my age. He had a cough. He looked at my shoes." Then he is peeling again. "One doesn\'t go down. Why would one?"',
      again: '"He looked at my shoes."',
      options: [back()],
    },
  },
};

export const d_hc_voight: DialogueDef = {
  id: 'd_hc_voight', owner: 'npc_hc_15', start: [{ if: { flag: 'hc_voight_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A heavy, clean-shaven man with a guild ring and a ledger at the refectory\'s quietest table. "Voight. The guild\'s factor on the hill." He doesn\'t get up. "I keep the Concern\'s accounts in Tolls. Somebody has to. The Concern doesn\'t believe in money; it believes in paper."',
      again: 'Voight and his ledger.',
      effects: [{ set: 'hc_voight_met' }],
      options: [{ id: 'voi.par', text: 'Scrip goes at six to one in the Skirts.', next: 'par' }, bye],
    },
    again: {
      text: '"Designate." Voight turns a page.',
      again: 'Voight, turning a page.',
      options: [
        { id: 'voi.par2', text: 'Scrip goes at six to one in the Skirts.', if: { not: { seen: 'voi.par' } }, next: 'par' },
        { id: 'voi.jars', text: '(Show him the keeper\'s jars.)', if: { all: [{ item: 'k_hc_jars' }, GARDEN_OPEN] }, next: 'jars' },
        ...sellKey('voi.key', '(Put the keeper\'s key on his ledger.)', 'guild', 1200, { all: [{ item: 'k_hc_leash_key' }, { flag: 'hc_leash', eq: 'seized' }] }, 'key'),
        bye,
      ],
    },
    par: {
      text: '"And at par up here." He doesn\'t pretend otherwise. "The Toll is Halcyon\'s paper, designate; the guild prints it on the Concern\'s promise. Par is a word for people who own the slate. Six to one is a word for people who are written on it." He shuts the ledger on his finger. "I didn\'t make the slate. I keep it tidy."',
      again: '"Par is a word for people who own the slate."',
      options: [back()],
    },
    jars: {
      text: 'He unscrews one, sniffs, reads the pencil. His eyebrows go up a long way. "Seed that comes true. Pre-Burn, some of it." He screws the lid back on with great care. "The guild buys anything that grows, designate. And anything that knows. Two hundred and fifty, for the lot, and nobody on this hill ever asks where you found them."',
      again: '"Two hundred and fifty, for the lot."',
      options: [
        { id: 'voi.jars.sell', text: '(Sell.)', effects: [{ take: 'k_hc_jars' }, { give: 'tolls', count: 250 }, { set: 'hc_garden', value: 'sold' }, { quest: 'q_hc_garden', start: true }, K(-15), S(-15), T(-5), { decision: { id: 'hc_garden', text: 'You sold Kojo Frimpong\'s seed jars to the guild\'s factor on the hill.' } }], next: 'sold' },
        { text: '(Put them away.)', next: 'again' },
      ],
    },
    sold: { text: 'He counts it out in clean Halcyon notes and the jars go into a guild crate under his table, and his ledger gets a line. "Pleasure," he says, and means it.', again: 'A line in the ledger.', options: [back()] },
    key: { text: 'Voight looks at the key for a long time without touching it. Then he wraps it in a handkerchief and puts it in an inside pocket. "The guild has never owned the Concern\'s hand before," he says. "It will be interesting to find out what the Concern is worth without it." He counts out twelve hundred, and doesn\'t thank you.', again: 'The key, gone into his pocket.', options: [back()] },
  },
};

export const d_hc_latch: DialogueDef = {
  id: 'd_hc_latch', owner: 'npc_st_09', start: [{ if: { seen: 'latch.hc.why' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Mr Latch from the Stacks, at a refectory table with a glass of something clear, in a better coat than he wears in Meridian. He folds his hands and smiles exactly the smile he smiles there. "The designate. On the hill at last. I told them you would come; nobody has to decide anything, and everybody comes."',
      again: 'Mr Latch, hands folded.',
      options: [{ id: 'latch.hc.why', text: 'What are you doing up here?', next: 'why' }, bye],
    },
    again: { text: 'Mr Latch raises his glass a quarter-inch.', again: 'The glass, raised a quarter-inch.', options: [bye] },
    why: {
      text: '"Reporting." He turns the glass. "Everything I offered you in the Stacks, I offered on the Board\'s paper. They like to hear how it was received. You were very courteous. They were pleased." He smiles. "I bring them people, designate. They are always so pleased with people."',
      again: '"They are always so pleased with people."',
      options: [{ text: 'That\'s all.', next: 'again' }],
    },
  },
};

export const d_hc_clean: DialogueDef = {
  id: 'd_hc_clean', owner: 'npc_hc_g1', start: [{ if: { flag: 'hc_alarm' }, node: 'alarm' }, { node: 'post' }],
  nodes: {
    post: { text: '"Face to the lens, please." The voice is polite and bored and has a rifle behind it.', again: '"Face to the lens."', options: [leave] },
    alarm: { text: 'The Clean does not speak to you any more. The rifle speaks for it.', again: 'The rifle.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Kes inside the arcology (spread into d_hs_kes)

export const KES_HC_START = { if: { all: [KES_IN, AT_HC, { not: { flag: 'at_camp' } }] }, node: 'hc' };

const KES_CONTRACT_OPEN: Cond = { all: [{ knows: 'hc_kes_offered' }, { not: { flag: 'hc_kes_contract' } }] };
const KES_LEAVES_CONTRACT: Effect[] = [
  { set: 'hc_kes_contract', value: 'urged' }, { leave: KES }, { set: 'kes_left', value: 'contract' }, { set: 'kes_rom', value: 'ended' }, K(-60),
  { decision: { id: 'hc_kes_contract', text: 'You told Kes to take the Concern\'s contract for her door. She put it down unsigned and left Halcyon without you.' } },
];

export const KES_HC_NODES: Record<string, NodeDef> = {
  hc: {
    text: [
      { if: { at: 'hc_clinic' }, text: 'Kes walks close to you on nine, closer than she ever walks, and her hand keeps going to the back of her neck. "I came round in that room," she says, nodding at the fitting suite. "Sixteen. Port already in. A nurse gave me an orange to hold." She doesn\'t look at the ward door.' },
      { if: { at: 'hc_works' }, text: 'Kes puts her palm flat on the gallery\'s glass and listens to the floor with her whole body. "It\'s down there," she says. "The thing my door talks to. I can hear it. It hums like a person."' },
      { if: { at: 'hc_board' }, text: 'Kes walks on the Board\'s carpet as if it might give way, and looks at the portraits as if they might look back. "Wood," she says, touching the wall. "Real. They cut down a tree to look at."' },
      { text: 'Kes keeps looking up at the glass, and at the rain pipes, and at the orange tree when she thinks you aren\'t watching. "Rain out of a pipe on a timer," she says. "I told you. Obviously I told you."' },
    ],
    again: 'Kes, close beside you on the hill.',
    options: [
      { id: 'kes.hc.gardens', text: 'Tell me about the first time you saw this.', if: { not: { seen: 'kes.hc.gardens' } }, effects: [K(2)], next: 'hc_gardens' },
      { id: 'kes.hc.source', text: 'The door in your neck. Where does the other end go?', if: { all: [{ knows: 'kes_backdoor' }, LEASH_OPEN, { not: { seen: 'kes.hc.source' } }] }, effects: [{ learn: 'hc_leash_source' }, { quest: 'q_hc_leash', start: true }], next: 'hc_source' },
      { id: 'kes.hc.contract', text: 'The Concern\'s contract.', if: KES_CONTRACT_OPEN, next: 'kc' },
      { text: 'Something else.', next: 'party' },
    ],
  },
  hc_gardens: {
    text: '"Sixteen. My mother signed me to the Window for ten years against the paper, and they took me up asleep on the freight and put the port in on nine, and when I came round they walked me out through the gardens to the car because it was the quickest way." She is looking at the trees. "It was raining. Out of a pipe. At four. And everyone walking under it in clean clothes with their faces up, like it was a thing they\'d paid for, which it was. I thought: this is what the coal is for." She laughs, not much. "Then I went home and kept their lenses working for ten years so they could keep watching it rain."',
    again: '"This is what the coal is for."',
    options: [{ text: 'Something else.', next: 'hc' }],
  },
  hc_source: {
    text: '"The works. Under the gardens, under the line, there\'s a room the grid all runs to, and in it there\'s something that holds every door in every piece of their chrome at once. I\'ve felt it every night for ten years when I go dark: the other end of the string. Warm. Patient." She swallows. "I always thought it was a machine. It doesn\'t feel like a machine. It feels like it\'s listening because it has to."',
    again: '"It feels like it\'s listening because it has to."',
    options: [{ text: 'Something else.', next: 'hc' }],
  },
  kc: {
    text: 'Kes has the Concern\'s contract in her jacket, folded small, the way you carry a thing you would like to throw away and can\'t yet. "Tenure. A flat on the terraces. My two years void. A citizen\'s contract for anyone I name." She doesn\'t take it out. "Maren. I could name Maren. I could name every kid on Nursery one at a time. That\'s the bit that gets you. That\'s the bit they wrote to get me."',
    again: 'Kes, the contract folded small in her jacket.',
    options: [
      { id: 'kes.kc.read', text: 'Let me read it. All of it.', if: { not: { knows: 'hc_kes_clause' } }, check: { skill: 'barter', dc: 45, mods: [{ if: { inParty: ODILE }, dc: -15, why: 'Odile reads contracts for a living' }] }, effects: [{ learn: 'hc_kes_clause' }], next: 'kc_clause', fail: 'kc_dense' },
      { id: 'kes.kc.keeper', text: 'I met the man who signed this forty-one years ago.', if: { all: [{ knows: 'hc_lawal_told' }, { not: { seen: 'kes.kc.keeper' } }] }, effects: [{ learn: 'hc_kes_clause' }, K(3)], next: 'kc_keeper' },
      { id: 'kes.kc.tear', text: 'Tear it up.', effects: [{ set: 'hc_kes_contract', value: 'refused' }, K(10), { decision: { id: 'hc_kes_contract', text: 'Kes tore up the Concern\'s contract for her door on the Board\'s own carpet.' } }], next: 'kc_torn' },
      { id: 'kes.kc.turn', text: 'Sign it. Then use the door it opens to get to the thing it guards.', if: { all: [{ knows: 'hc_kes_clause' }, { not: { seen: 'kes.kc.turn' } }] }, check: { skill: 'speech', dc: 45, mods: [{ if: { approval: { companion: KES, gte: 50 } }, dc: -10, why: 'she trusts you with her neck' }] }, effects: [{ set: 'hc_kes_contract', value: 'turned' }, { set: 'hc_core_door' }, K(2), { decision: { id: 'hc_kes_contract', text: 'Kes signed the Concern\'s contract to get the keeper\'s door to the grid core.' } }], next: 'kc_turned', fail: 'kc_noturn' },
      { id: 'kes.kc.take', text: 'Take it, Kes. It\'s a way out.', next: 'kc_urged' },
      { text: 'Later.', next: 'hc' },
    ],
  },
  kc_clause: {
    text: 'You read it to page thirty, and on page thirty there it is, in the same clean print as the flat and the void and the names: TENURE IS SERVED IN THE KEEPER\'S CHAIR. THE HOLDER IS FITTED TO THE CHANNEL AND KEEPS IT FOR THE TERM OF THE CONTRACT. THE TERM OF THE CONTRACT IS THE HOLDER\'S LIFE. Kes reads it over your shoulder. "Oh," she says. "Oh, that\'s clever. I\'d be the other end of the string."',
    again: 'Page thirty: THE TERM OF THE CONTRACT IS THE HOLDER\'S LIFE.',
    interject: [{ companion: ODILE, text: '"Page thirty," Odile says. "They always put the price on page thirty, my dear, because by page thirty you have already spent the flat in your head."' }],
    options: [{ text: '(Back to the contract.)', next: 'kc' }],
  },
  kc_dense: {
    text: 'Forty pages of clauses that refer to clauses. By page twenty the words have stopped meaning anything. Kes takes it back. "Yeah," she says. "That\'s how they get you. It\'s not hidden. It\'s just boring."',
    again: 'Forty pages of clauses.',
    options: [{ text: '(Back to the contract.)', next: 'kc' }],
  },
  kc_keeper: {
    text: 'You tell her about the man in the chair in the grid core: forty-one years, the cables in his spine, his daughters on the terraces who look thirty and never visit. Kes listens with her hand on the back of her neck. "That\'s the job," she says. "That\'s tenure. That\'s me in forty years." She is quiet. "He hums. That\'s what I feel at night. He hums."',
    again: '"He hums."',
    options: [{ text: '(Back to the contract.)', next: 'kc' }],
  },
  kc_torn: {
    text: 'Kes takes the contract out and tears it, slowly, page by page, into strips the width of a finger, standing on the Board\'s carpet, and puts every strip into her jacket. "For the stove," she says. Then she starts laughing and can\'t stop, and has to sit down on a Board member\'s chair, and the lens in the ceiling watches all of it. "Obviously," she says, wiping her eyes. "Obviously."',
    again: 'Strips in her jacket, for the stove.',
    interject: [{ companion: TAMSIN, text: 'Tamsin sits down next to Kes on the Board\'s chair and starts laughing too, without knowing why, and that makes Kes worse.', effects: [T(2)] }],
    options: [{ text: 'Something else.', next: 'hc' }],
  },
  kc_turned: {
    text: 'Kes looks at you for a long time. Then she takes the pen off the Board\'s own desk and signs it, KESTREL OYELARAN, in a hand that doesn\'t shake. "Keeper\'s door," she says. "It opens for the keeper. It opens for me." She folds the contract and puts it away. "They think they bought me. I think I bought a door. Let\'s find out who\'s right before they come to fit me."',
    again: '"Let\'s find out who\'s right."',
    options: [{ text: 'Something else.', next: 'hc' }],
  },
  kc_noturn: {
    text: '"No." Flat. "I\'m not signing it. Not even to lie. If I sign it there\'s a page in their Window with my name on the bottom of THE HOLDER\'S LIFE, and paper up here doesn\'t care what you meant." She puts it away. "Other doors."',
    again: '"Other doors."',
    options: [{ text: '(Back to the contract.)', next: 'kc' }],
  },
  kc_urged: {
    text: 'Kes looks at you for a long moment. She doesn\'t argue. She takes the contract out of her jacket and unfolds it and lays it on the Board\'s carpet between you, unsigned, and smooths it flat with her palm. "You\'d put me in the chair," she says. Not a question. "You\'d hand them the string with me on the other end of it, and call it a way out." She stands up. "I said once. I said it once." She walks to the lift and the doors close on her, and she does not look back.',
    again: 'The contract on the carpet, unsigned.',
    effects: KES_LEAVES_CONTRACT,
    options: [{ text: '(Let her go.)', exit: true }],
  },
};

export const HC_TERRACE_DIALOGUES: DialogueDef[] = [
  d_hc_car, d_hc_carboard, d_hc_freightdock, d_hc_gate, d_hc_screen, d_hc_roadpost, d_hc_gardeners, d_hc_tunnel, d_hc_tunnel_in,
  d_hc_ballcard, d_hc_floors, d_hc_lift, d_hc_registry, d_hc_seedvault, d_hc_orange, d_hc_bench, d_hc_yaw, d_hc_linh, d_hc_mazur,
  d_hc_aubert, d_hc_arata, d_hc_kask, d_hc_gallo, d_hc_voight, d_hc_latch, d_hc_clean,
];
