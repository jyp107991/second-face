import type { CheckDef, DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A3_OPEN, ALLY, ALLY_NEEDS, ASH, ILYA, IN, KES, MAST_BOARDS, NINE, ODILE, TAMSIN, WREN } from '../world/a3_conds';
import { d_sg_mast, d_sg_speaker } from './signalhill';

/**
 * Every Dead Radio (B6d, Act 3 beat 19b): Signal Hill's mast raised to reach every radio in the Reach, or left as the city
 * built it. The hook is the station's voice, which reads its list every night and has the designate's line at the top of it
 * now, with the city's new year; the investigation is the relay rack (a circuit marked BROADCAST, isolated by order), the
 * mast's foot (the meter live, the stub at the head with four empty plates) and the crown of rods the city let down the
 * gully; the turn is that a mast that reaches everyone makes the Hollow's hill the most valuable place in the basin, so the
 * Hollow want a price for standing on a target; the choice is who keeps the hill and the switch (the Hollow, the Wheel,
 * Knock), or to leave it narrow.
 *
 * Six routes, none violent. At the mast's foot (`d_a3_mast`): rebuild the band at the feed cabinet (Science 50), open it
 * through a neural port or through Kes (no check), set it to the band in Verity's letter (no check; the letter comes by
 * post), or take the crown up the lattice yourself (Survival 45, or Reflex 7). At the Hollow's fire (`d_a3_hollow`): a
 * pre-Scald board and sixty Tolls for the climb, or the Hollow talked into keeping it as theirs (Speech 45), in which case
 * they raise it themselves. A route makes it able to speak (`a3_mast_how`); it is raised (`a3_mast`) when someone keeps it.
 *
 * One prop serves both acts: the map's mast and speaker open `d_a3_mast` and `d_a3_station`, which carry Signal Hill's
 * Act 1 trees (`d_sg_mast`, `d_sg_speaker`) whole after their own Act 3 entries, so nothing changes before Act 3 opens.
 * The crown in the gully is a prop of its own (`d_a3_aerial`); Sefa's son at the station, if the Wheel keep it, has
 * `d_a3_keeper`. Story notes: story/B6_NOTES_SECRET.md §2.3 (19b), §8 B6d and its "As built".
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
const leave: OptionDef = { text: '(Leave it.)', exit: true };
const bye: OptionDef = { text: 'That\'s all.', exit: true };
const on: OptionDef = { text: '(Go on.)', exit: true };
const trade: OptionDef = { text: 'Trade.', effects: [{ event: 'barter' }], exit: true, repeat: true };

const TALLY = 'npc_sg_01', DARIO = 'npc_wh_02';

// ---------------------------------------------------------------- state

export type Keeper = 'hollow' | 'wheel' | 'knock';
export const MAST_QUEST: Effect = { quest: 'q_a3_mast', start: true };
/** Settled for good: raised (kept by someone) or left narrow. */
export const MAST_SET: Cond = F('a3_mast');
export const MAST_RAISED: Cond = F('a3_mast', 'raised');
export const MAST_NARROW: Cond = F('a3_mast', 'narrow');
export const KEEPER = (k: Keeper): Cond => F('a3_mast_keeper', k);
/** A route has made it able to speak to everyone, and nobody keeps it yet. */
export const MAST_OPEN: Cond = ALL(F('a3_mast_how'), NOT(MAST_SET));
/** Nothing done to it yet. */
export const MAST_UNTOUCHED: Cond = ALL(NOT(F('a3_mast_how')), NOT(MAST_SET));
/** The crown dug out of the gully, a line run up the crack. */
export const CROWN_FOUND: Cond = F('a3_aerial_found');
/** The crown back on the plates (the Hollow raised it, or the player did). */
export const CROWN_UP: Cond = ANY(F('a3_mast_how', 't'), F('a3_mast_how', 'v'));
/** The Hollow on their hill: Tally alive, never fought, not gone west. */
export const HOLLOW_HERE: Cond = ALL(NOT(F('sg_fight')), NOT(F('a3_hollow_gone')), NOT({ dead: `signalhill/${TALLY}` }), NOT({ dead: `${TALLY}_a3` }));
export const HOLLOW_PAID: Cond = F('a3_hollow_paid');
/** The Wheel will hold a hill for the player: mustered by letter, or the player is theirs, or they think well of them. */
export const WHEEL_KEEPS: Cond = ANY(ALLY('wheel'), ALLY_NEEDS.wheel);
export const DARIO_ALIVE: Cond = ALL(NOT({ dead: DARIO }), NOT({ dead: `${DARIO}_sg` }));
/** Verity's letter with the band has come (world event `a3_verity_band`). */
export const VERITY_BAND: Cond = { knows: 'a3_verity_band' };
/** A neural port the city's grid answers (the plan's Gridjack; the Concern's lattice port talks to it as well). */
export const GRID_CHROME: Cond = ANY({ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' });
/** Kes can still ride a grid: travelling, and her link not cut. */
export const KES_RIDES: Cond = ALL(IN(KES), NOT(F('kes_link', 'cut')));

// ---------------------------------------------------------------- the checks

/** X: the feed cabinet. */
const X_CHECK: CheckDef = { skill: 'science', dc: 50, mods: [{ if: { knows: 'relay_log_read' }, dc: -10, why: 'you have seen how the city routed its lines' }] };
/** T: the Hollow keep it as theirs. */
const T_CHECK: CheckDef = { skill: 'speech', dc: 45, mods: [
  { if: F('broadcast_silenced'), dc: -10, why: 'you shut it up once' },
  { if: F('broadcast_amplified'), dc: 10, why: 'they heard what a loud voice does' },
  { if: { trust: { npc: TALLY, gte: 10 } }, dc: -5, why: 'Tally owes you one' },
  { if: IN(WREN), dc: -5, why: 'Calloway\'s word' },
] };
/** The rack: where the list goes. */
const RACK: CheckDef = { skill: 'science', dc: 35, mods: [
  { if: { origin: 'archive_clerk' }, dc: -15, why: 'record formats are your trade' },
  { if: IN(NINE), dc: -15, why: 'Nine reads the routing table aloud' },
  { if: KES_RIDES, dc: -15, why: 'Kes reads it like a price board' },
] };

// ---------------------------------------------------------------- the ends

const RAISED_TEXT: Record<Keeper, string> = {
  hollow: 'I raised Signal Hill\'s mast to speak to every radio in the Reach, and the Hollow keep it as theirs, the switch held down at its foot until I send word.',
  wheel: 'I raised Signal Hill\'s mast to speak to every radio in the Reach, and gave the hill to the Wheel to keep, the switch held down until I send word.',
  knock: 'I raised Signal Hill\'s mast to speak to every radio in the Reach, and gave it to Knock: KNOCK chalked on the cabinet door, and the switch\'s handle with me.',
};
const KEEPS: Record<Keeper, Effect[]> = {
  hollow: [
    { trust: { npc: TALLY, by: 10 } }, A(WREN, 5),
    { news: { tag: 'a3_mast_hollow', text: 'the Hollow on Signal Hill have stopped selling copper at the Tollhouse: they say the mast is theirs now, and it has two lamps', valence: 2, size: 5, at: 'tollhouse' } },
  ],
  wheel: [
    { trust: { npc: 'npc_wh_01', by: 5 } }, { trust: { npc: DARIO, by: 5 } },
    { after: { minutes: 1440, id: 'a3_wheel_up', effects: [{ set: 'a3_wheel_up' }] } },
    { news: { tag: 'a3_mast_wheel', text: 'the Wheel have a hill now: Signal Hill, the mast with two lamps, given them by the designate', valence: 6, size: 6, at: 'wheel' } },
  ],
  knock: [
    A(TAMSIN, 3),
    { news: { tag: 'a3_mast_knock', text: 'the designate gave Signal Hill\'s mast to Knock: KNOCK chalked on its cabinet door', valence: 5, size: 6, at: 'cistern9' } },
  ],
};
/** Raised, kept by `k`: the mast can speak to everyone, and waits on a switch. */
export const RAISE = (k: Keeper, extra: Effect[] = []): Effect[] => [
  ...extra, { set: 'a3_mast', value: 'raised' }, { set: 'a3_mast_keeper', value: k }, MAST_QUEST,
  { decision: { id: 'a3_mast_raised', text: RAISED_TEXT[k] } }, A(NINE, 3), A(ODILE, 2), A(ASH, 2), { xp: 100 }, ...KEEPS[k],
];
/** Given to Knock over the Hollow's heads: they will not stand on somebody else's target, and walk west by morning. */
const RAISE_KNOCK_OVER: Effect[] = RAISE('knock', [
  A(WREN, -5), { trust: { npc: TALLY, by: -10 } }, { after: { minutes: 480, id: 'a3_hollow_leave', effects: [{ set: 'a3_hollow_gone' }] } },
]);
/** The T route: the Hollow raise it themselves, the crown up the gully on Brick's back, and keep it. */
const RAISE_T: Effect[] = RAISE('hollow', [{ set: 'a3_mast_how', value: 't' }, { set: 'a3_aerial_found' }, { time: 360 }, { xp: 100 }]);
/** Left as the city built it, for good. */
const NARROW = (hollow: boolean): Effect[] => [
  { set: 'a3_mast', value: 'narrow' }, MAST_QUEST,
  { decision: { id: 'a3_mast_narrow', text: hollow ? 'I left Signal Hill\'s mast as the city built it, as the Hollow asked: nobody climbs their track for a mast that speaks to nobody.' : 'I left Signal Hill\'s mast as the city built it, speaking narrow to a room and a pump station.' } },
  A(NINE, -3), A(ODILE, -2), { xp: 40 },
  ...(hollow ? [{ trust: { npc: TALLY, by: 10 } }, A(WREN, 3)] : []),
];
/** A route has made it able to speak (`how`). */
const SPOKE = (how: string, xp: number, extra: Effect[] = []): Effect[] => [{ set: 'a3_mast_how', value: how }, MAST_QUEST, { xp }, ...extra];

// ---------------------------------------------------------------- the station's voice (the speaker; Act 1's tree after it)

const DESIGNATE_LINE = '"— the Spire. The designate. Year thirty. Magistrate. —"';

export const d_a3_station: DialogueDef = {
  id: 'd_a3_station', owner: 'narrator',
  start: [
    { if: ALL(A3_OPEN, MAST_RAISED), node: 'a3_kept' },
    { if: ALL(A3_OPEN, MAST_NARROW), node: 'a3_narrow' },
    { if: A3_OPEN, node: 'a3' },
    ...d_sg_speaker.start,
  ],
  nodes: {
    ...d_sg_speaker.nodes,
    a3: {
      text: [
        { if: F('broadcast_silenced'), text: `The speaker hangs cut on its bracket where you left it. The rack has not stopped: its lamp pulses, and when you put your ear to the cut stub of the wire you can hear the voice, small as a fly in a jar, reading its list down the line west. It has come round to its first line. ${DESIGNATE_LINE} The thirty is new. It is the city's new year for the steps, the one written over a forty-nine on the order in your pack.` },
        { if: F('broadcast_amplified'), text: `The speaker is quiet; the mast is not. Through the wall it carries the list over the Sallow the way you set it, every dead radio from here to Shale with a speaker in it saying the same words. It has come round to its first line. ${DESIGNATE_LINE} The thirty is new, the same year as the city's order. Tonight the whole Sallow is hearing your line.` },
        { text: `A horn speaker on a bracket, wire to the relay rack, and a voice in it: calm, male, not quite a man, reading a list. A place, a name, a time, a word, and lines you know have already come and gone read in the same voice as the rest. It has come round to its first line. ${DESIGNATE_LINE} The thirty is new, the same year as the city's order. It reads it to this room, and down a line west to a pump station, and to nobody else.` },
      ],
      again: 'The voice reaches the end of its list and begins again, and comes round again to your line.',
      effects: [MAST_QUEST, { learn: 'a3_list_heard' }],
      interject: [
        { companion: NINE, text: '"That is my record\'s voice," Nine says. "It reads well. It reads to a room and a pump station." Its cracked lens turns to the wall, and the mast beyond it. "A record read to some is a privilege. The record suggests this station was built to read to all."' },
        { companion: TAMSIN, text: '"It\'s got you the way the fridge had me," Tamsin says. "A line and a number, read out to a room with nobody in it." She looks at the speaker for a long time. "Rust it. If it\'s going to read you, it can read you to everyone."' },
        { companion: KES, text: '"Narrow band," Kes says, already looking at the rack the way she looks at a price board. "Obviously. You don\'t shout what you\'re selling."' },
        { companion: ODILE, text: '"A sealed sheet," Odile says. "Read to one buyer it is worth a fortune, my dear. Read to everyone it is worth the paper."' },
        { companion: WREN, if: F('broadcast_amplified'), text: '"It said Kessler\'s day to the whole Sallow once," Wren says. "Now it\'s saying yours." She doesn\'t say anything else for a while.' },
        { companion: WREN, text: '"Year thirty," Wren says. "That\'s soon. I don\'t like a road that\'s been read to me."' },
        { companion: ASH, text: '"There\'s a weight to that," Ash says. "A thing that reads your name to an empty room. Read it to everybody, and it\'s only a voice."' },
        { companion: ILYA, text: '"Year thirty." Ilya counts something on his fingers and stops. "Right."' },
      ],
      options: [
        { id: 'a3st.rack', text: '(Follow the wire into the rack: where does the list go?)', if: NOT({ knows: 'relay_log_read' }), check: RACK, next: 'band', fail: 'band_no' },
        { id: 'a3st.rack.known', text: '(Look at the rack again, with the city\'s order in your pack.)', if: ALL({ knows: 'relay_log_read' }, NOT({ knows: 'a3_broadcast_seen' })), next: 'band' },
        { text: '(Leave it reading.)', exit: true },
      ],
    },
    band: {
      text: 'Three circuits leave the rack, each tagged in city shorthand. One feeds the speaker. One runs west along the old line to a pump station marked DW-4: the city telling its pumps the time. The third is marked BROADCAST — ALL BANDS, and long ago somebody put a city tie through its terminals and a tag on the tie: ISOLATED BY ORDER. It runs up the wall and out to the mast\'s head, where the lattice stops in a stub. The band is narrow because the city wanted it narrow. The station was built to speak to everyone.',
      again: 'BROADCAST — ALL BANDS, the city\'s tie through its terminals, and the tag: ISOLATED BY ORDER.',
      effects: [{ learn: 'relay_log_read' }, { learn: 'a3_broadcast_seen' }, { xp: 40 }],
      interject: [
        { companion: NINE, text: '"Isolated by order," Nine reads. "The order is older than I am. It is filed under maintenance, which is where the city files the things it does not want to call decisions."' },
        { companion: KES, text: '"Not broken," Kes says. "Switched off. Obviously. Broken costs money."' },
        { companion: TAMSIN, text: '"Built to talk to everyone," Tamsin says, "and they gave it a list and a room." She looks at the speaker. "Sounds familiar."' },
        { companion: ODILE, text: '"A public good made private with a tag," Odile says. "I have done it myself, my dear, with less wire."' },
      ],
      options: [{ text: '(Leave it reading.)', exit: true }],
    },
    band_no: {
      text: 'The tags are city shorthand older than any you can read. You follow the wire up the wall to where it goes out toward the mast, and lose it in the dark of the conduit.',
      again: 'The tags in their shorthand, and the conduit going dark toward the mast.',
      effects: [{ time: 30 }],
      options: [{ text: '(Leave it reading.)', exit: true }],
    },
    a3_kept: {
      text: [
        { if: KEEPER('hollow'), text: 'The list goes out on its old line, to a room and a pump station, as it always has. The circuit marked BROADCAST runs whole now, up the wall and out to the mast, and stops at a knife switch at the mast\'s foot that the Hollow keep down until you send word.' },
        { if: KEEPER('wheel'), text: 'The list goes out on its old line, as it always has. The circuit marked BROADCAST runs whole now, up the wall and out to the mast, and stops at a knife switch the Wheel keep down until you send word.' },
        { text: 'The list goes out on its old line, as it always has. The circuit marked BROADCAST runs whole now, up the wall and out to the mast, and stops at a knife switch with no handle on its pin: the handle is with you, and the cabinet door says KNOCK.' },
      ],
      again: 'The list on its old line, and the BROADCAST circuit waiting on its switch.',
      options: [{ text: '(Leave it reading.)', exit: true }],
    },
    a3_narrow: {
      text: 'The list goes out on its old line, to a room and a pump station, as the city built it. The circuit marked BROADCAST still has the city\'s tie through it, and you left it there.',
      again: 'The list on its old line, and the city\'s tie where you left it.',
      options: [{ text: '(Leave it reading.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the crown in the gully (a prop of its own)

export const d_a3_aerial: DialogueDef = {
  id: 'd_a3_aerial', owner: 'narrator',
  start: [{ if: ALL(A3_OPEN, CROWN_UP), node: 'gone' }, { if: A3_OPEN, node: 'a3' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'Half buried in the loose stone of the crack: three metres of old lattice with a crown of rods at one end, rusted to the colour of the rock. The bolts at its foot were undone, not sheared, and there are rope scars on the rock above it. Somebody let it down here on purpose, a long time ago.',
      again: 'The old lattice in the stone, and its crown of rods.',
      options: [leave],
    },
    a3: {
      text: [
        { if: ANY(MAST_SET, F('a3_mast_how')), text: 'The crown lies in the crack where the city let it down, rods up, rusted to the rock. Up on the hill the mast does without it.' },
        { if: CROWN_FOUND, text: 'The crown lies clear of the stone where you dug it out, the line you ran tied to its foot and going up the crack to the plateau. It is ready to go up, for somebody with the nerve for forty metres of lattice.' },
        { text: 'Half buried in the loose stone of the crack: three metres of old lattice with a crown of rods at one end, rusted to the colour of the rock. The bolts at its foot were undone, not sheared, and the rope scars on the rock above it are old. Somebody let it down here on purpose. It is the top of a mast, and there is only one mast on this hill.' },
      ],
      again: 'The crown of rods in the crack, and the rope scars above it.',
      effects: [MAST_QUEST],
      interject: [
        { companion: ILYA, text: '"Twelve rods," Ilya says. He has counted them twice. "Right."' },
        { companion: WREN, text: '"Let down careful," Wren says, reading the scars. "Two men, a rope, a long afternoon. Somebody wanted it kept, not broken."' },
        { companion: ASH, text: '"Taken down gentle," Ash says, "so it could go back up. There\'s a weight to that."' },
        { companion: KES, text: '"Old broadcast crown," Kes says. "Pre-everything. Obviously they didn\'t smash it. You don\'t smash what you might want back."' },
      ],
      options: [
        { id: 'crown.dig', text: '(Dig it out of the stone and run a line up the crack, ready to haul.)', if: ALL(NOT(CROWN_FOUND), MAST_UNTOUCHED), effects: [{ set: 'a3_aerial_found' }, MAST_QUEST, { time: 50 }, { xp: 40 }], next: 'ready' },
        leave,
      ],
    },
    ready: {
      text: 'Most of an hour with your hands in the stone. The crown comes clear, lighter than it looks and longer, and the line you run up the crack ties off at the top by the plateau. Hauled from there it could go up the lattice to the plates, if somebody has the nerve for forty metres of it in the wind.',
      again: 'The crown out of the stone, and the line up the crack.',
      options: [on],
    },
    gone: {
      text: 'Where the crown lay there is a long pale scar in the stone, and rope burns going up the crack.',
      again: 'The scar in the stone, and the rope burns.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the mast's foot (Act 1's tree after it)

/** Who keeps it, chosen at the mast's foot. The Hollow are asked at their own fire. */
const KEEP_AT_MAST: OptionDef[] = [
  { id: 'keep.ask_hollow', text: 'The Hollow should keep it. I\'ll go down and ask Tally.', if: HOLLOW_HERE, exit: true },
  {
    id: 'keep.wheel', if: WHEEL_KEEPS, effects: RAISE('wheel'), next: 'kept_wheel',
    text: [
      { if: ALL({ knows: 'dario_town' }, DARIO_ALIVE), text: 'The Wheel will keep it. Sefa\'s son wanted a door that shuts.' },
      { text: 'The Wheel will keep it. They go everywhere; let them hold the one place that reaches everywhere.' },
    ],
  },
  { id: 'keep.knock', text: 'Knock keeps it. It\'s my home\'s.', if: NOT(HOLLOW_HERE), effects: RAISE('knock'), next: 'kept_knock' },
  { id: 'keep.knock.over', text: 'Knock keeps it. It\'s my home\'s, not the Hollow\'s.', if: HOLLOW_HERE, effects: RAISE_KNOCK_OVER, next: 'kept_knock' },
  { id: 'keep.narrow', text: '(Pull out what you wired and put it back as the city built it.)', next: 'narrow_ask' },
  { text: '(Not yet.)', exit: true },
];

export const d_a3_mast: DialogueDef = {
  id: 'd_a3_mast', owner: 'narrator',
  start: [
    { if: ALL(A3_OPEN, MAST_RAISED), node: 'a3_kept' },
    { if: ALL(A3_OPEN, MAST_NARROW), node: 'a3_narrow' },
    { if: ALL(A3_OPEN, MAST_OPEN), node: 'a3_keeper' },
    { if: A3_OPEN, node: 'a3' },
    ...d_sg_mast.start,
  ],
  nodes: {
    ...d_sg_mast.nodes,
    a3: {
      text: [
        { if: CROWN_FOUND, text: 'Forty metres of lattice and the slow red lamp at its head, guyed with what the Hollow have left of the cable. The meter on the feed cabinet\'s door is live: something east is still paying for this. At the head the lattice stops in a stub, a box under the lamp with the city\'s narrow aerial bolted to it and, beside it, four empty plates where something bigger used to sit. The crown you dug out of the gully was made for those plates.' },
        { if: { knows: 'a3_broadcast_seen' }, text: 'Forty metres of lattice and the slow red lamp at its head, guyed with what the Hollow have left of the cable. The meter on the feed cabinet\'s door is live: something east is still paying for this. At the head the lattice stops in a stub, a box under the lamp with the city\'s narrow aerial bolted to it and, beside it, four empty plates where something bigger used to sit. The circuit marked BROADCAST runs up inside the lattice to those plates, and stops.' },
        { text: 'Forty metres of lattice and the slow red lamp at its head, guyed with what the Hollow have left of the cable. The meter on the feed cabinet\'s door is live: something east is still paying for this. At the head the lattice stops in a stub, a box under the lamp with the city\'s narrow aerial bolted to it and, beside it, four empty plates where something bigger used to sit.' },
      ],
      again: 'The lattice, the slow lamp, the live meter, and the stub at the head with its four empty plates.',
      effects: [MAST_QUEST, { learn: 'mast_powered' }, { learn: 'seen_mast' }],
      interject: [
        { companion: KES, if: KES_RIDES, text: '"Two ways to make it loud," Kes says, squinting up. "Put the top back on, or make the stub shout. Obviously I\'d make it shout."' },
        { companion: NINE, text: '"The box at the head will hold a controller of city pattern," Nine says. "It will be doing exactly what it was told. In my experience that is the most dangerous thing a machine can do."' },
        { companion: TAMSIN, text: '"Forty metres," Tamsin says, with her head right back. "Knock\'s tallest thing is Corin\'s hat."' },
        { companion: WREN, text: '"Wind\'s from the west," Wren says. "Anyone going up that wants it at their back."' },
        { companion: ILYA, text: '"Forty," Ilya says. He has counted the rungs in sections. "And some. Right."' },
      ],
      options: [
        { id: 'a3m.x', text: '(Work the feed cabinet: lift the city\'s narrow band off the link and lay a wide one under it.)', check: X_CHECK, next: 'x_done', fail: 'x_no' },
        { id: 'a3m.link', text: '(Open the band through your neural port.)', if: GRID_CHROME, next: 'c_link' },
        { id: 'a3m.kes', text: 'Kes. Can you talk to it?', if: KES_RIDES, next: 'c_kes' },
        { id: 'a3m.verity', text: '(Set the feed by the figures in Verity\'s letter.)', if: VERITY_BAND, next: 'k_done' },
        { id: 'a3m.crown.rope', text: '(Haul the crown up the lattice on the line and bolt it to the plates.)', if: CROWN_FOUND, check: { skill: 'survival', dc: 45 }, next: 'v_done', fail: 'v_no' },
        { id: 'a3m.crown.nerve', text: '(Climb with the crown on your back: no ropework, only hands and nerve.)', if: CROWN_FOUND, check: { attr: 'reflex', dc: 7 }, next: 'v_done', fail: 'v_no' },
        { id: 'a3m.hollow', text: '(Think about who knows this mast best.)', if: HOLLOW_HERE, once: true, next: 'hollow_hint' },
        { id: 'a3m.narrow', text: '(Leave the mast as the city built it.)', next: 'narrow_ask' },
        leave,
      ],
    },
    hollow_hint: {
      text: 'The Hollow have been up and down this lattice for years for the copper in its guys. If anybody could put something new in the box at the head, or the crown on its plates, it is Tally\'s three. Tally will have a price.',
      again: 'Tally\'s three, and Tally\'s price.',
      options: [{ text: '(Look at the mast again.)', next: 'a3' }, leave],
    },
    x_done: {
      text: 'Two hours with the cabinet open and the city\'s shorthand on its door. You lift the narrow band off the link circuit, lay a wide one under it, and wire a knife switch between the two so the old line runs until somebody throws it. When you shut the door the red lamp stutters at the head and steadies, and a white one lights beside it: the head box saying ALL BANDS in the only word it has. The stub could speak to every radio in the Reach now. It is waiting on a switch.',
      again: 'The cabinet shut, two lamps at the head, and the knife switch down.',
      effects: SPOKE('x', 150, [{ time: 120 }]),
      interject: [
        { companion: NINE, text: '"By morning the city will have a line in a book," Nine says. "It will say the band was widened at Relay Seven. It will not say by whom, unless someone asks it." A pause. "Someone will ask it."' },
        { companion: KES, text: '"Not bad," Kes says, which from her is a medal.' },
      ],
      options: [{ text: '(Go on.)', next: 'a3_keeper' }],
    },
    x_no: {
      text: 'The wide band will not hold on the link. Twice the cabinet trips, and the second time the red lamp goes out at the head for a full minute and the Hollow below start shouting. It comes back. So does the narrow line.',
      again: 'The cabinet, the narrow line, and the smell of hot wire.',
      effects: [{ time: 60 }],
      options: [{ text: '(Step back.)', next: 'a3' }, leave],
    },
    c_link: {
      text: [
        { if: F('relay_grid_filed'), text: 'The port in your skull finds the relay before you have decided to let it. The weight of attention east turns toward you: it has your serial on file from the last time, and now it finds a second line under it, the designate. REQUEST FROM THE DESIGNATE, it files, and then, with no hesitation at all: GRANTED. Down in the cabinet a relay clicks over, and at the head a white lamp lights beside the red. Whatever is east does not mind being heard. It may want you to be the one who made it heard.' },
        { text: 'The port in your skull finds the relay before you have decided to let it. The weight of attention east turns toward you, reads your serial, and finds a second line under it: the designate. REQUEST FROM THE DESIGNATE, it files, and then, with no hesitation at all: GRANTED. Down in the cabinet a relay clicks over, and at the head a white lamp lights beside the red. Whatever is east does not mind being heard. It may want you to be the one who made it heard.' },
      ],
      again: 'GRANTED, filed under the designate, and the white lamp lit.',
      effects: SPOKE('c', 120, [{ learn: 'a3_ledger_granted' }]),
      interject: [
        { companion: NINE, text: '"It granted it," Nine says. "It has never granted anything I have asked of it in a hundred and twenty years. I find that I would like to know why."' },
        { companion: KES, text: '"Show-off," Kes says. "Obviously it said yes. It wants an audience."' },
        { companion: TAMSIN, text: '"It said yes," Tamsin says. "The fridge used to say yes like that. Right up until it said no."' },
      ],
      options: [{ text: '(Pull out, and go on.)', next: 'a3_keeper' }],
    },
    c_kes: {
      speaker: KES,
      text: [
        { if: F('kes_link', 'dark'), text: '"Obviously." She is already on the cabinet with the lid off and the cable from her nape in its service port, eyes on nothing. "City grid, not the Window. Different house, same doors." Ten minutes of humming under her breath and swearing in grid. A relay clicks over, and at the head a white lamp lights beside the red. "Done. Band\'s wide, switch is down, and the log says nobody did it." She unplugs and rubs her nape. "Nobody sees me now unless I let them."' },
        { text: '"Obviously." She is already on the cabinet with the lid off and the cable from her nape in its service port, eyes on nothing. "City grid, not the Window. Different house, same doors." Ten minutes of humming under her breath and swearing in grid. A relay clicks over, and at the head a white lamp lights beside the red. "Done. Band\'s wide, switch is down, and the log says nobody did it." She unplugs and rubs her nape. "It can\'t see me. It never could."' },
      ],
      again: '"Still wide," Kes says. "Still nobody did it."',
      effects: SPOKE('c', 120, [A(KES, 3)]),
      options: [{ text: '(Go on.)', next: 'a3_keeper' }],
    },
    k_done: {
      text: 'You set the feed\'s dial by the figures in Verity\'s letter, written small in a girl\'s hand: the hiss band, the one the wire wakes on between midnight and two. The meter hardly moves; it does not need to. At the head a white lamp lights beside the red. Every radio in the Reach has been listening on that band since before anyone alive was born, even the ones with no backs, because it is where the city\'s own wire leaks, and in Bridgeward the Saints have been sitting up for it for years. You wire a knife switch under it and leave it down.',
      again: 'The dial on Verity\'s figures, and the switch down.',
      effects: SPOKE('k', 120, [{ rep: { faction: 'saints', respect: 5 } }]),
      interject: [
        { companion: TAMSIN, text: '"Midnight to two," Tamsin says. "That\'s when the fridge does its counts. I used to lie awake and listen to it hum." She laughs, once. "Same band, probably."' },
        { companion: NINE, text: '"The band the wire leaks on," Nine says. "I was told it did not exist. I filed that as an error, too."' },
      ],
      options: [{ text: '(Go on.)', next: 'a3_keeper' }],
    },
    v_done: {
      text: 'Forty metres, with the crown on the line below your boots and the wind finding every gap in your coat. At the head you sit on the box with your knees round the lattice and haul, and the crown comes up rods first, and the four plates take its foot as if they had been waiting. You bolt it with the city\'s own bolts. The red lamp goes out, comes back, and a second lamp lights beside it, white. At the foot, in the station, you cut the city\'s tie through the terminals marked BROADCAST and put a knife switch where it was, down.',
      again: 'Two lamps at the head, red and white, and the switch down in the rack.',
      effects: SPOKE('v', 150, [{ learn: 'a3_broadcast_seen' }, { time: 90 }]),
      interject: [
        { companion: WREN, text: '"Good hands," Wren says, which she has never said to anyone you know of.' },
        { companion: ILYA, text: '"Forty," Ilya says when your boots touch the ground. "And four. I counted you down."' },
        { companion: TAMSIN, text: '"Never do that again," Tamsin says. "Or do. Tell me first."' },
      ],
      options: [{ text: '(Go on.)', next: 'a3_keeper' }],
    },
    v_no: {
      text: 'Halfway up, the line fouls on a cut guy and the crown swings out over the drop. You come down with it, which is better than coming down without it, and leave the skin of both palms on the rungs.',
      again: 'The crown at the foot of the lattice, the line in a tangle, your hands raw.',
      effects: [{ time: 40 }],
      options: [{ text: '(Step back.)', next: 'a3' }, leave],
    },
    a3_keeper: {
      text: [
        { if: HOLLOW_HERE, text: 'It can speak to every radio in the Reach now, and that makes it the loudest thing between here and the city, and the only one. Everyone who wants the Reach kept quiet will want this hill: the city, which keeps a record of who speaks; the guild, which sells forecasts sealed; the Concern, which sells them dearer. Somebody has to keep the switch down until you send word, and keep the hill while they come for it. Below, the Hollow\'s fire. They will have seen the white lamp.' },
        { text: 'It can speak to every radio in the Reach now, and that makes it the loudest thing between here and the city, and the only one. Everyone who wants the Reach kept quiet will want this hill: the city, which keeps a record of who speaks; the guild, which sells forecasts sealed; the Concern, which sells them dearer. Somebody has to keep the switch down until you send word, and keep the hill while they come for it.' },
      ],
      again: 'The switch down, the white lamp lit. It still needs a keeper.',
      interject: [
        { companion: NINE, text: '"A keeper is a person who is there when they come," Nine says. "The record suggests you choose one who will be."' },
        { companion: TAMSIN, text: '"Knock\'s never had a voice that wasn\'t the hatch\'s," Tamsin says. She doesn\'t say anything else, which is how you know she means it.' },
        { companion: ODILE, text: '"Price the keeping before you give it away, my dear," Odile says. "Everyone else will."' },
        { companion: WREN, if: HOLLOW_HERE, text: '"Tally\'s three have lived on this hill longer than anybody\'s wanted it," Wren says.' },
        { companion: ASH, text: '"Whoever holds it will be the most hated people in the Reach for a night," Ash says. "Then the most loved. Choose people who can stand both."' },
      ],
      options: KEEP_AT_MAST,
    },
    kept_wheel: {
      text: [
        { if: DARIO_ALIVE, text: 'You send word down the Tollhouse road with the next walker going that way: the Wheel have a hill. By this time tomorrow Sefa will have somebody on it, and you would put money on who.' },
        { text: 'You send word down the Tollhouse road with the next walker going that way: the Wheel have a hill. By this time tomorrow Sefa will have somebody on it.' },
      ],
      again: 'Word gone to the Wheel, and the switch down.',
      options: [on],
    },
    kept_knock: {
      text: [
        { if: HOLLOW_HERE, text: 'You chalk KNOCK on the cabinet door in letters a child could read, and take the knife switch\'s handle off its pin. Nobody throws it now but whoever has the handle, and whoever comes up from Knock to keep the hill will have it from you. Below, at the Hollow\'s fire, somebody has stood up to watch you do it.' },
        { text: 'You chalk KNOCK on the cabinet door in letters a child could read, and take the knife switch\'s handle off its pin. Nobody throws it now but whoever has the handle, and whoever comes up from Knock to keep the hill will have it from you.' },
      ],
      again: 'KNOCK on the cabinet door, and the switch\'s pin empty.',
      options: [on],
    },
    narrow_ask: {
      text: 'The narrow line to a room and a pump station, as the city built it. Nobody climbs the Hollow\'s track for a mast that speaks to nobody. Once you go down the hill with it like that, you will not be coming back up to change your mind.',
      again: 'The narrow line, as the city built it, for good.',
      options: [
        { id: 'narrow.yes', text: '(Leave it narrow.)', effects: NARROW(false), next: 'narrowed' },
        { text: '(Not yet.)', exit: true },
      ],
    },
    narrowed: {
      text: [
        { if: F('a3_mast_how'), text: 'You pull out what you wired and leave the city\'s band as narrow as a pump station. At the head the red lamp blinks, slow as a pulse, saying nothing to anybody.' },
        { text: 'You leave the city\'s tie where it was and the band as narrow as a pump station. At the head the red lamp blinks, slow as a pulse, saying nothing to anybody.' },
      ],
      again: 'The red lamp, saying nothing to anybody.',
      options: [on],
    },
    a3_kept: {
      text: [
        { if: KEEPER('hollow'), text: 'The mast with its two lamps at the head, red and white. Thanh sits on the feed cabinet with his back to the station wall and the switch down under his hand. He has not been inside the station since the voice started, and he does not go in now.' },
        { if: ALL(KEEPER('wheel'), F('a3_wheel_up'), DARIO_ALIVE), text: 'The mast with its two lamps at the head, red and white. Dario Oduya has swept the station step, which nobody has done since the Burn, and the switch is down under a stone he has painted white so nobody kicks it.' },
        { if: KEEPER('wheel'), text: 'The mast with its two lamps at the head, red and white, and the switch down. The Wheel\'s someone is on the way.' },
        { text: 'The mast with its two lamps at the head, red and white, KNOCK chalked on the cabinet door and the switch\'s pin empty. The handle is with you.' },
      ],
      again: 'Two lamps at the head, and the switch down.',
      options: [leave],
    },
    a3_narrow: {
      text: 'The mast and its one red lamp, speaking narrow to a room and a pump station, as the city built it.',
      again: 'The one red lamp, speaking narrow.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- the Hollow at their fire (Tally's Act 3 placement)

const TAIL = '"It\'s got a new line, lately. At the top of the list, before the overpass and the rest." She looks up the hill. "Thanh went close enough to hear it. Says it\'s yours."';

/** What the Hollow want, once asked: a route of their own, a board and sixty, or leave it be. */
const hollowRoutes = (at: string): OptionDef[] => [
  { id: `a3h.${at}.keep`, text: 'Keep it as yours. A hill everyone needs is a hill everyone pays.', if: ALL({ knows: 'a3_hollow_price' }, MAST_UNTOUCHED), check: T_CHECK, effects: RAISE_T, next: 't_done', fail: 't_no' },
  { id: `a3h.${at}.board`, text: '(Show her a board.) It goes in the box at the head. Sixty for the climb.', if: ALL({ knows: 'a3_hollow_price' }, MAST_UNTOUCHED, ANY(...MAST_BOARDS.map((b): Cond => ({ item: b.item })))), next: 'board' },
  { id: `a3h.${at}.leave`, text: 'Then I\'ll leave it as it is. Nobody climbs your track for it.', if: ALL({ knows: 'a3_hollow_price' }, MAST_UNTOUCHED), next: 'narrow_ask' },
];
const HUB: OptionDef[] = [
  { id: 'a3h.mast', text: 'The mast. What would it take to make it reach past the Sallow?', once: true, next: 'mast' },
  { id: 'a3h.raise', text: 'I want it to reach every radio in the Reach.', if: MAST_UNTOUCHED, once: true, next: 'turn' },
  ...hollowRoutes('hub'),
  trade,
  bye,
];
/** The boards a pre-Scald route takes, each in the player's words. */
const BOARD_LABEL: Record<string, string> = {
  j_controller: '(Hand over the pump controller out of the drowned machine.) Sixty for the climb.',
  j_tm_controller: '(Hand over the digger\'s controller from under Number Four.) Sixty for the climb.',
  k_an_board: '(Hand over the army board out of Kelso\'s shed.) Sixty for the climb.',
};
/** Who keeps it, settled at the Hollow's fire. */
const KEEP_AT_FIRE: OptionDef[] = [
  { id: 'a3h.keep.paid', text: 'You do. You\'ve had the sixty.', if: HOLLOW_PAID, effects: RAISE('hollow'), next: 'kept' },
  { id: 'a3h.keep.pay', text: 'You do. Sixty, for water and cartridges.', if: ALL(NOT(HOLLOW_PAID), TOLLS(60)), effects: RAISE('hollow', [{ take: 'tolls', count: 60 }, { set: 'a3_hollow_paid' }]), next: 'kept' },
  { id: 'a3h.keep.talk', text: 'You do. Keep it as yours: a hill everyone needs is a hill everyone pays.', if: NOT(HOLLOW_PAID), check: T_CHECK, effects: RAISE('hollow'), next: 'kept', fail: 'open_no' },
  { id: 'a3h.keep.wheel', text: 'The Wheel will. They\'ve horses and guns, and they go everywhere.', if: WHEEL_KEEPS, effects: RAISE('wheel'), next: 'wheel_told' },
  { id: 'a3h.keep.knock', text: 'Knock will. It\'s my home\'s.', effects: RAISE_KNOCK_OVER, next: 'knock_told' },
  { id: 'a3h.keep.narrow', text: 'Nobody. I\'ll put it back as it was.', next: 'narrow_back' },
  { text: '(Not yet.)', exit: true },
];

export const d_a3_hollow: DialogueDef = {
  id: 'd_a3_hollow', owner: TALLY,
  start: [
    { if: F('sg_fight'), node: 'hostile' },
    { if: KEEPER('knock'), node: 'leaving' },
    { if: KEEPER('hollow'), node: 'keeping' },
    { if: KEEPER('wheel'), node: 'under_wheel' },
    { if: MAST_NARROW, node: 'quiet' },
    { if: MAST_OPEN, node: 'open' },
    { node: 'hub' },
  ],
  nodes: {
    hub: {
      text: [
        { if: NOT(F('sg_tally_met')), text: `"Tally. We're the Hollow, which is three people and a word." She pushes the hood back and looks at you properly. ${TAIL}` },
        { if: F('sg_wren'), text: `"Calloway's friend." Tally pushes the hood back. ${TAIL}` },
        { if: F('sg_sneaked'), text: `"Gully," Tally says, before you are near enough to say anything. "Brick still counts the stones you moved." ${TAIL}` },
        { if: F('sg_talked'), text: `"You said the voice was your problem." Tally pushes the hood back. "Was it?" ${TAIL}` },
        { if: F('sg_traded'), text: `"Board-trader." Tally pushes the hood back. ${TAIL}` },
        { if: F('sg_paid'), text: `"Fifteen-Tolls." It is a name, the way she says it. ${TAIL}` },
        { text: `"Still copper," Tally says. ${TAIL}` },
      ],
      again: '"Still here," Tally says, the zip gun across her knees and the hood pushed back.',
      effects: [MAST_QUEST, { set: 'a3_hollow_heard' }, { set: 'sg_tally_met' }],
      interject: [
        { companion: WREN, if: F('sg_wren'), text: 'Wren nods to Tally, and Tally nods back, and that is a whole conversation between them.' },
        { companion: TAMSIN, text: '"Yours," Tamsin says under her breath. "Everybody\'s got you on a list but you."' },
      ],
      options: HUB,
    },
    mast: {
      text: '"Forty metres." Tally does not look up at it; she does not need to. "We\'ve been cutting the guys from the bottom for the copper in them, and it stands anyway, because it was welded by people who meant it. Top\'s a stub. There\'s a crown of rods in the gully on the west side, in the crack: city men let it down there before my mother\'s time, on ropes, careful, the way you\'d lower a coffin. Steel and old metal, and the copper\'s in a sleeve we can\'t cut. Not worth the climb down." She shrugs. "Thanh says the box at the head is where it thinks. He\'s been up to look. He wouldn\'t touch it."',
      again: '"Crown in the gully. Box at the head. Copper in the guys." Tally counts them off. "That\'s the mast."',
      effects: [{ learn: 'a3_crown_told' }],
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    turn: {
      text: 'Tally does not answer straight away. She looks at the lamp, and at Brick, and down the track behind you. "Every radio," she says. "Then this is the loudest hill between here and the city, and the only one. Everybody who wants things quiet comes up our track. The city\'s wardens. Guild riders. The Concern\'s people, who don\'t use tracks." She pulls the hood back up. "We\'re three, and we came for copper. If you want us standing on a target, it costs. Sixty, for water and cartridges, because they\'ll come. Or leave it be, and nobody climbs our track for it at all."',
      again: '"Sixty to stand on a target," Tally says. "Or leave it be."',
      effects: [{ learn: 'a3_hollow_price' }],
      interject: [
        { companion: ODILE, text: '"Sixty," Odile says. "My dear, pay it before she thinks of a better number."' },
        { companion: WREN, text: '"She means it," Wren says. "And she\'s right. They\'ll come."' },
        { companion: KES, text: '"She\'s right about the Concern," Kes says. "They don\'t use tracks. They use you."' },
        { companion: NINE, text: '"The city will know who speaks on it within the night," Nine says. "It used to send a unit like me to ask."' },
        { companion: ASH, text: '"Three people and a word," Ash says. "That is how the Choir began."' },
        { companion: TAMSIN, text: '"Sixty\'s what Maud pays for a month of the well," Tamsin says. "It\'s not nothing to them."' },
        { companion: ILYA, text: '"Three," Ilya says, counting them. "Against everybody. Right."' },
      ],
      options: [
        ...hollowRoutes('turn'),
        { id: 'a3h.self', text: 'I\'ll find my own way up it. We\'ll talk about who keeps it after.', next: 'self' },
        bye,
      ],
    },
    self: {
      text: '"Then it\'s your target till then," Tally says. "When it can talk, come and tell me who\'s sitting on it. If it\'s us, it\'s sixty."',
      again: '"Your target," Tally says. "Till then."',
      options: [bye],
    },
    t_done: {
      text: '"A hill everyone pays," Tally says, trying the words for size. She looks at Brick. Brick looks at the mast. From the pipes Thanh says "I\'ll go up," before anybody has asked him, and then looks as if he would like to take it back, and does not. By dark Brick has the crown up out of the gully on his back, the way you would carry a door, and Thanh goes up the lattice with the line in his teeth, and Tally feeds the crown with the Hollow\'s own copper, the coils they cut off the guys, put back where they came from. The red lamp goes out at the head and comes back, and a second lamp lights beside it, white. Thanh comes down with his hands shaking and sits on the feed cabinet by a knife switch, down. "Ours," Tally says, to nobody in particular. "Mind. Ours."',
      again: '"Ours," Tally says. "Mind."',
      interject: [
        { companion: WREN, text: '"That\'s the first thing anyone\'s given them," Wren says quietly, "that they didn\'t have to cut off something."' },
        { companion: NINE, text: '"Three keepers and a word," Nine says. "I have known city stations kept worse."' },
      ],
      options: [on],
    },
    t_no: {
      text: '"Nice words." Tally does not move. "Copper\'s copper and a target\'s a target. Sixty, or leave it be."',
      again: '"Sixty," Tally says, "or leave it be."',
      options: [{ text: '(Go on.)', next: 'hub' }],
    },
    board: {
      text: '"Show me." Tally turns it over in hands that know what a board is worth against copper. Thanh comes over from the pipes without being called and looks at it the way you would look at a bird that had landed on your arm.',
      again: 'Tally with the board in her hands, and Thanh looking at it.',
      options: [
        ...MAST_BOARDS.map((b): OptionDef => ({
          id: `a3h.board.${b.item}`, text: BOARD_LABEL[b.item], if: ALL({ item: b.item }, TOLLS(60)),
          effects: [{ take: b.item }, { take: 'tolls', count: 60 }, ...b.settles, { set: 'a3_hollow_paid' }, { trust: { npc: TALLY, by: 5 } }, ...SPOKE('b', 120, [{ time: 90 }])],
          next: 'open',
        })),
        { id: 'a3h.board.short', text: 'I haven\'t sixty on me.', if: NOT(TOLLS(60)), next: 'hub' },
        { text: 'Not yet.', next: 'hub' },
      ],
    },
    open: {
      text: [
        { if: HOLLOW_PAID, text: 'Brick goes up first with the line. Thanh goes after him with the board inside his shirt, and comes down an hour later with the city\'s controller in his teeth and a look on his face you will remember. At the head a white lamp lights beside the red, and Thanh wires a knife switch in at the mast\'s foot because Tally tells him to, and leaves it down. "Band\'s yours," Tally says. "Sixty bought the climb. Keeping it is the same sixty, and we\'ve had it. So: who sits on it?"' },
        { if: { knows: 'a3_hollow_price' }, text: 'Tally has seen the white lamp at the head, or Thanh has, which is the same thing. "So it can talk to everyone." She does not sound pleased or sorry. "Who sits on it? If it\'s us, it\'s sixty."' },
        { text: 'Tally has seen the white lamp at the head, or Thanh has, which is the same thing. "So it can talk to everyone." She does not sound pleased or sorry. "Then this is the loudest hill between here and the city. Everybody who wants things quiet comes up our track: the city\'s wardens, guild riders, the Concern\'s people, who don\'t use tracks. Who sits on it? If it\'s us, it\'s sixty, for water and cartridges, because they\'ll come."' },
      ],
      again: '"Who sits on it?" Tally says again.',
      effects: [MAST_QUEST, { learn: 'a3_hollow_price' }, { set: 'a3_hollow_heard' }, { set: 'sg_tally_met' }],
      interject: [
        { companion: KES, if: HOLLOW_PAID, text: '"City controller," Kes says, taking it off Thanh before he can drop it. "Obviously I\'m keeping this."' },
        { companion: ODILE, if: HOLLOW_PAID, text: '"Sixty for a climb and a keeping," Odile says. "She undersold herself, my dear. Don\'t tell her."' },
        { companion: WREN, text: '"Ask them straight," Wren says. "They\'ve earned that much."' },
      ],
      options: KEEP_AT_FIRE,
    },
    open_no: {
      text: '"Nice words," Tally says. "Sixty."',
      again: '"Sixty," Tally says.',
      options: [{ text: '(Go on.)', next: 'open' }],
    },
    kept: {
      text: '"Ours," Tally says. "Then Brick sits up by the track by day, and Thanh does the switch." At the pipes Thanh goes very still. "Outside," he says. "At the foot. I don\'t go in." "Outside," Tally agrees.',
      again: '"Ours," Tally says. "Outside."',
      options: [on],
    },
    wheel_told: {
      text: '"The Wheel." Tally weighs it. "Horses and guns over us, and somebody to sell copper to who isn\'t the Tollhouse." She almost smiles. "Could be worse. We keep the camp. They keep the target."',
      again: '"We keep the camp," Tally says. "They keep the target."',
      options: [on],
    },
    knock_told: {
      text: '"Knock." Tally says it like a coin she is testing with her teeth. "Then it\'s Knock\'s target, and we\'re not Knock." She is already kicking the fire apart. "We\'ll find another hill with less on it." Thanh looks at the mast, and at you, and goes to roll the copper.',
      again: '"Knock\'s target," Tally says. "Not ours."',
      interject: [{ companion: WREN, text: 'Wren watches the Hollow kick their fire apart and says nothing at all, which is worse than anything she could have said.' }],
      options: [on],
    },
    leaving: {
      text: '"We\'re going," Tally says, rolling a coil of copper. "Knock\'s target. Not ours."',
      again: 'Tally rolls the copper and does not look up.',
      options: [bye],
    },
    keeping: {
      text: '"Still ours," Tally says. Up the hill the white lamp burns beside the red. "Nobody\'s come yet. They will."',
      again: '"Still ours," Tally says.',
      options: [
        { id: 'a3h.keeping.come', text: 'What will you do when they come?', once: true, next: 'come' },
        trade,
        bye,
      ],
    },
    come: {
      text: '"Throw the switch, if your word\'s come up the wire. Run, if it hasn\'t." She shrugs. "We\'re good at running. It\'s the first thing the Hollow ever learned."',
      again: '"Throw it or run," Tally says.',
      options: [{ text: '(Go on.)', next: 'keeping' }],
    },
    under_wheel: {
      text: [
        { if: ALL(F('a3_wheel_up'), DARIO_ALIVE), text: '"The Wheel\'s up there," Tally says, nodding at the station. "Sefa\'s boy swept the step. Nobody\'s swept that step since the Burn." She does not sound as if she minds.' },
        { text: '"Wheel\'s coming, you said," Tally says. "We\'ll see."' },
      ],
      again: '"We keep the camp," Tally says. "They keep the target."',
      options: [trade, bye],
    },
    quiet: {
      text: '"Still narrow," Tally says, and very nearly thanks you.',
      again: '"Still narrow."',
      options: [trade, bye],
    },
    narrow_ask: {
      text: '"Leave it be." Tally waits to see whether you mean it. "Then nobody climbs our track for it, and nobody puts a crown on it, and we go on cutting the guys a little at a time till it falls down, which it won\'t." Once you go down the hill like that, you will not be coming back up to change your mind.',
      again: '"Leave it be?" Tally says.',
      options: [
        { id: 'a3h.narrow.yes', text: 'Leave it be.', effects: NARROW(true), next: 'narrowed' },
        { text: 'Not yet.', exit: true },
      ],
    },
    narrow_back: {
      text: '"Put it back." Tally looks at the white lamp for a while. "Then nobody climbs our track for it after all." Once you go down the hill like that, you will not be coming back up to change your mind.',
      again: '"Put it back?" Tally says.',
      options: [
        { id: 'a3h.narrow.back', text: 'Put it back.', effects: NARROW(false), next: 'narrowed' },
        { text: 'Not yet.', exit: true },
      ],
    },
    narrowed: {
      text: '"Then you\'ve a fire here," Tally says, "any night you want one." It is the first thing the Hollow have given anybody for nothing.',
      again: '"Any night," Tally says.',
      options: [on],
    },
    hostile: { text: 'Nobody is talking.', again: 'Nobody is talking, and nobody is going to.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Wheel's keeper at the station

export const d_a3_keeper: DialogueDef = {
  id: 'd_a3_keeper', owner: DARIO,
  start: [{ node: 'hill' }],
  nodes: {
    hill: {
      text: [
        { if: { knows: 'dario_told_door' }, text: '"A door," Dario says, and shuts the station door, and opens it again to show you. "It shuts. You said a door is a door, and what I do behind it is mine." He sits on the step with the carbine across his knees. "Switch is down. It stays down till your word comes up the wire. Mother says I\'m a fool. Mother sent me."' },
        { text: '"A door," Dario says, and shuts the station door, and opens it again to show you. "It shuts." He sits on the step with the carbine across his knees. "Switch is down. It stays down till your word comes up the wire. Mother says I\'m a fool. Mother sent me."' },
      ],
      again: '"Still down," Dario says, and taps the cabinet with his boot. "Still mine."',
      options: [
        { id: 'a3k.come', text: 'Has anyone come for it?', once: true, next: 'come' },
        bye,
      ],
    },
    come: {
      text: '"Two riders on the track yesterday with guild tin on their saddles. They looked at the carbine, and they looked at the lamp, and they went back down." He does not sound unhappy about it. "They\'ll come back with more. Let them. It\'s a good door."',
      again: '"They\'ll come back with more," Dario says. "Let them."',
      options: [{ text: '(Go on.)', next: 'hill' }],
    },
  },
};

export const A3_MAST_DIALOGUES: DialogueDef[] = [d_a3_station, d_a3_aerial, d_a3_mast, d_a3_hollow, d_a3_keeper];
