import type { DialogueDef, NodeDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  A, ASH, CARD_KNOWN, CORE, GRID_CHROME, IN, ILYA, KES, KITE_DARK, KITE_DAY, KITE_LEFT, KITE_SHOT, KITE_WAITED, KELSO_BROKEN, KELSO_HELD, KELSO_SOLD, KELSO_TAKEN,
  NINE, ODILE, RESERVE_KNOWN, TAMSIN, TO_SPINDLE, WREN, bye, leave, on,
} from './an_spindle';

/**
 * The Ashlands' sites (B5d): Kelso, the army's dead depot on the March (the gate, the apron and its patrol, the tower's log,
 * the dead at the fence, the engine shed's shunter, the blockhouse and its blast door), the hall under the apron and the
 * thing in its rack (the four ends of What Sleeps at Kelso), Pemberton's panels and the inverter that feeds the kites (A
 * Kite Day), Saddleback's view of the valley, and the remnant machines met on the glass (the road encounters). Story notes:
 * story/B5d_NOTES_SECRET.md.
 */

/** By day the patrol lies in the shade and drinks the sun; at night it walks the apron. Quiet for good once the rack is
 * settled the player's way (sealed, or its core in the player's pack). */
const PATROL_DAY: Cond = { any: [{ hour: { from: 6, to: 19 } }, { flag: 'an_kelso_quiet' }] };
const ALERT: Cond = { flag: 'an_kelso_alert' };
const HALL_OPEN: Cond = { flag: 'an_hall_open' };
const SETTLED: Cond = { flag: 'an_kelso' };
const K = (v: string): Cond => ({ flag: 'an_kelso', eq: v });
const TO_GATE: Effect = { event: 'goto', data: { location: 'an_kelso', spawn: 'start' } };

// ---------------------------------------------------------------- Kelso, the apron

export const d_an_gate: DialogueDef = {
  id: 'd_an_gate', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A sign still bolted to the gatepost, its paint gone to the colour of bone: KELSO FIELD — MARCH COMMAND — HALVERSON DEFENCE SERVICES, CONTRACTOR — AUTHORISED PERSONNEL ONLY — THIS SITE IS PATROLLED. Under it, scratched with a knife by somebody who came this far: IT IS.',
      again: 'THIS SITE IS PATROLLED. IT IS.',
      effects: [{ learn: 'an_gate_read' }, { learn: 'loc_lm_ash_01' }],
      interject: [
        { companion: NINE, text: '"Halverson Defence Services," Nine says. "The Concern\'s name, before it called itself that. The city\'s schedule lists this site as decommissioned in the year of the Burn." It looks across the apron at the motor pool. "The schedule is not looking at it."' },
        { companion: KES, text: 'Kes has her hand on the back of her neck. "Loud," she says. "Not out loud. In here. The whole place is humming in their dialect."', effects: [A(KES, 1)] },
      ],
      options: [leave],
    },
  },
};

/** Crossing the apron by day: the long way round the craters, straight across in the glare, or at Pidge's heel. Learned
 * once; the patrol is quiet for good once the rack is settled the player's way. Used by the apron itself (from the gate)
 * and by the blast door (for whoever came at it from the tracks). */
function crossing(p: string, onward: NodeDef['options'][number]): Record<string, NodeDef> {
  return {
    [`${p}look`]: {
      text: [
        { if: ALERT, text: 'The apron, by day, and the three in the motor pool\'s shade are not lying down: they stand, lenses up, turning slowly on the far fence, the way dogs stand that have been kicked once. Something has told them to watch the sky and the glass both.' },
        { text: 'The apron, by day: a mile of grey concrete, craters with glass in their bottoms, and across it, in the shade of the motor pool\'s far fence, three machines lying with their backs to the sun and their lenses down, drinking. Nothing else moves. To reach the blockhouse in the middle you have to cross their sight.' },
      ],
      again: 'The apron, and the three in the shade.',
      options: [
        { id: `${p}pidge`, text: '(Walk across with Pidge at your heel.)', if: { flag: 'an_pidge_walk' }, effects: [{ set: 'an_apron_ok' }, { time: 30 }], next: `${p}across_pidge` },
        { id: `${p}long`, text: '(The long way round, from crater to crater, slow.)', check: { skill: 'survival', dc: 40, mods: [{ if: { knows: 'an_day_route' }, dc: -10, why: 'you know how they lie by day' }, { if: ALERT, dc: 15, why: 'they are watching' }] }, effects: [{ set: 'an_apron_ok' }, { time: 60 }], failEffects: [{ time: 30 }], next: `${p}across`, fail: `${p}turned` },
        { id: `${p}straight`, text: '(Straight across, quiet, in the sun\'s glare behind you.)', check: { skill: 'stealth', dc: 45, mods: [{ if: { knows: 'an_day_route' }, dc: -5, why: 'you know they do not get up for feet' }, { if: ALERT, dc: 15, why: 'they are watching' }] }, effects: [{ set: 'an_apron_ok' }, { time: 20 }], failEffects: [{ time: 30 }], next: `${p}across`, fail: `${p}turned` },
        { id: `${p}back`, text: '(Back to the gate.)', effects: [TO_GATE], exit: true },
      ],
    },
    [`${p}across`]: { text: 'Crater to crater, then the blockhouse\'s shadow, and your back against its concrete. Across the apron one lens lifts an inch, and lowers. You have learned the way across. You will not have to learn it again.', again: 'The blockhouse\'s shadow.', options: [{ ...onward, id: `${onward.id}.a` }] },
    [`${p}across_pidge`]: { text: 'Pidge comes to your heel as Radu said she would, and walks the apron beside you as if it were a street. In the motor pool\'s shade three lenses come up, find her, and go down again. You are hers, as far as they can tell. At the blockhouse she sits, and waits, and when you look round she is looking at you.', again: 'Pidge, waiting at the blockhouse.', interject: [{ companion: TAMSIN, text: 'Tamsin has walked the whole mile with her hand an inch from Pidge\'s plates and never touched them. "She knew where to put her feet," she whispers. "So did I. I just copied her."', effects: [A(TAMSIN, 3)] }], options: [{ ...onward, id: `${onward.id}.p` }] },
    [`${p}turned`]: { text: 'Halfway, a lens comes up, and then another, and the sound of plates sliding on plates comes across the concrete, unhurried. You go back the way you came, and they do not follow past the craters. They lie down again when you are at the gate, the way a dog lies down when the postman has gone.', again: 'Back at the gate.', options: [{ id: `${p}breath`, text: '(Catch your breath.)', effects: [TO_GATE], exit: true }] },
  };
}

export const d_an_apron: DialogueDef = {
  id: 'd_an_apron', owner: 'narrator', start: [{ node: 'ap_look' }],
  nodes: crossing('ap_', { id: 'ap_on', text: '(On.)', exit: true }),
};

export const d_an_patrol: DialogueDef = {
  id: 'd_an_patrol', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_kelso_quiet' }, text: 'The patrol\'s three in the motor pool\'s shade, lying the way the dead ones lie in their rows now, lenses down and dark. Something has told them there is nothing left to guard.' },
        { text: 'Three hounds in the shade of the far fence, bigger than the dead ones in the rows, their plates newer, their lenses down. Their backs are to the sun the way a lizard lies on a wall. One flank plate lifts and settles, lifts and settles. It is not breathing. It is drinking.' },
      ],
      again: 'The patrol, in the shade.',
      passives: [
        { skill: 'survival', dc: 40, text: 'Tracks in the dust round the fence, layered: every night the same three circuits of the apron, wide, then narrow, then the blockhouse, and every dawn back here to the shade. They walk at night. They charge by day. They have done it every day for ninety years.', effects: [{ lead: 'l_an_patrol' }, { learn: 'an_day_route' }] },
        { skill: 'science', dc: 45, text: 'A guard pattern, Concern-built: they answer a site credential by standing to escort its holder, and anything that moves at night without one by stopping it. They are not hunting. They are keeping a door.', effects: [{ learn: 'an_patrol_keeps' }] },
      ],
      options: [leave],
    },
  },
};

export const d_an_dead: DialogueDef = {
  id: 'd_an_dead', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Four, a season dead, where the apron meets the fence: a sled on its side, a hand lamp, boots, and what the glass-flies have left. They fell running, in a line, toward the gate. The first of them fell with his arm out ahead of him, and in his hand, the fingers still closed on it, a white card edged in copper.',
      again: 'The four, and the card in the first one\'s hand.',
      effects: [{ lead: 'l_an_body' }, { learn: 'an_dead_seen' }, { quest: 'q_an_kelso', start: true }],
      interject: [
        { companion: ASH, text: 'Ash is on one knee by them before you can say anything, piling glass over the first one\'s face, a handful at a time. "Somebody should," he says, and does not get up until he has done all four.', effects: [A(ASH, 3)] },
        { companion: ILYA, text: '"They ran toward the gate," Ilya says. "In a line. The first one never let go of whatever he was holding." He looks at the motor pool. "They were caught from behind, all four, in the space of a breath."' },
      ],
      options: [
        { id: 'dead.card', text: '(Take the card out of his hand.)', if: { not: { flag: 'an_card_taken' } }, effects: [{ give: 'k_an_card' }, { set: 'an_card_taken' }], next: 'card' },
        leave,
      ],
    },
    card: { text: 'The fingers give, at last. HALVERSON DEFENCE SERVICES — MAINTENANCE — MARCH, and the closed eye in its corner, and the strip of dark glass down its side. It is clean. It is the cleanest thing for a mile.', again: 'The white card.', options: [leave] },
  },
};

export const d_an_tower_log: DialogueDef = {
  id: 'd_an_tower_log', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'In the control tower\'s foot, a pre-war terminal under a drift of glass dust, its screen cracked across. When you brush it, it wakes, slowly, amber on black, and shows the last thing it was asked to show.',
      again: 'The tower\'s terminal, amber on black.',
      options: [
        { id: 'log.read', text: '(Read the log.)', check: { skill: 'science', dc: 35, mods: [{ if: { knows: 'an_march_known' }, dc: -5, why: 'you know what the March was' }] }, effects: [{ lead: 'l_an_dormancy' }], next: 'log', fail: 'log_no' },
        leave,
      ],
    },
    log: {
      text: 'The last order logged at Kelso, the week of the Burn: MARCH COMMAND — ALL STATIONS — HOSTILITIES SUSPENDED. RESERVE (KENNEL 7) TO DORMANCY. COMMAND UNIT LT-7 TO HOLD RESERVE DORMANT AND AWAIT LAWFUL COMMAND. SITE PATROL TO CONTINUE. And under it, logged every day since by the station itself, ninety years of one line: LT-7 HOLDING.',
      again: 'LT-7 HOLDING.',
      interject: [
        { companion: NINE, text: 'Nine reads it twice. "Await lawful command," it says. "Ninety years." For a moment its voice is not quite level. "I know that clause. I have it too."', effects: [A(NINE, 3)] },
        { companion: ODILE, text: '"Hostilities suspended," Odile says. "Not ended. Suspended. Lawyers, my dear. Even at the end of the world."' },
      ],
      options: [leave],
    },
    log_no: { text: 'Lines of army shorthand, a date, a station code, a word that might be KENNEL. It means something to somebody. It has been waiting ninety years for them.', again: 'Army shorthand.', options: [leave] },
  },
};

export const d_an_hangar_kite: DialogueDef = {
  id: 'd_an_hangar_kite', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_hangar_board' }, text: 'The kite on its trolley, its belly plate off where you took its board out.' },
        { text: 'On a trolley in the blown-in hangar, a kite: wings the length of two men folded back along a body like a gull\'s, a lens under its chin, the closed eye and an army number on its tail. Its belly plate is held on by four bolts and a lot of glass dust. It did not fly the week of the Burn, and never has since.' },
      ],
      again: 'The kite on its trolley.',
      options: [
        { id: 'kite.board', text: '(Take its belly plate off and pull the board.)', if: { not: { flag: 'an_hangar_board' } }, check: { skill: 'mechanics', dc: 40 }, effects: [{ set: 'an_hangar_board' }, { give: 'j_an_kiteboard' }, { time: 40 }, { xp: 40 }], next: 'pulled', fail: 'pull_no' },
        leave,
      ],
    },
    pulled: { text: 'The bolts come at last and the plate drops on your foot, and inside, in a cradle of rotten foam, the board: potted, black, pristine. A winter, Hester would say.', again: 'A kite\'s board, pristine.', options: [leave] },
    pull_no: { text: 'Two bolts give and two do not, and the third you round off with the wrong spanner. You will have to come back with better tools, or better hands.', again: 'The rounded bolt.', options: [leave] },
  },
};

export const d_an_hall_door: DialogueDef = {
  id: 'd_an_hall_door', owner: 'narrator',
  start: [{ if: { not: PATROL_DAY }, node: 'night' }, { if: { all: [{ not: { flag: 'an_apron_ok' } }, { not: { flag: 'an_kelso_quiet' } }] }, node: 'dr_look' }, { if: HALL_OPEN, node: 'open' }, { node: 'shut' }],
  nodes: {
    ...crossing('dr_', { id: 'dr_on', text: '(To the door.)', next: 'shut' }),
    shut: {
      text: 'The blockhouse over the hall\'s stair: concrete a yard thick, and in it a blast door with no handle, a card slot with a dead lamp over it, and behind a plate held by one bolt, the manual release: a crank on a ratchet, red paint gone pink. Matei\'s card slot. Matei\'s door.',
      again: 'The blast door, and the crank behind its plate.',
      options: [
        { id: 'door.crank', text: '(Take the plate off and crank the release.)', check: { skill: 'mechanics', dc: 45, mods: [{ if: { attr: 'brawn', gte: 8 }, dc: -5, why: 'you have the arms for it' }] }, effects: [{ set: 'an_hall_open' }, { time: 40 }], failEffects: [{ time: 40 }], next: 'opened', fail: 'crank_no' },
        { id: 'door.kes', text: '(Kes: open it without waking anything.)', if: IN(KES), effects: [{ set: 'an_hall_open' }, A(KES, 2)], next: 'opened_kes' },
        { id: 'door.jack', text: '(Go into the door through your own link.)', if: { all: [GRID_CHROME, { not: IN(KES) }] }, check: { skill: 'science', dc: 50 }, effects: [{ set: 'an_hall_open' }], next: 'opened', fail: 'jack_no' },
        { id: 'door.card', text: '(Hold the white card to the slot.)', if: { item: 'k_an_card' }, effects: [{ set: 'an_kelso_alert' }, { lead: 'l_an_card' }, { learn: 'an_card_tried' }, { time: 30 }], next: 'card' },
        leave,
      ],
    },
    opened: { text: 'The ratchet takes your weight, click by click, and the door comes out of its frame a hand\'s breadth with a sigh of air ninety years old, and then the width of a body. Stairs go down into the dark. Across the apron, nothing stirs.', again: 'The door, open the width of a body.', options: [{ id: 'door.down', text: '(Go down.)', effects: [{ event: 'goto', data: { location: 'an_hall', spawn: 'stair' } }], exit: true, repeat: true }, leave] },
    opened_kes: { text: 'Kes puts her palm flat on the concrete beside the slot, not on it, and closes her eyes. "It wants to tell somebody I\'m here," she says. "I\'m telling it I\'m not." The door sighs out of its frame. Across the apron, nothing stirs. Kes opens her eyes and wipes her nose. "Obviously."', again: 'The door Kes opened.', options: [{ id: 'door.kes.down', text: '(Go down.)', effects: [{ event: 'goto', data: { location: 'an_hall', spawn: 'stair' } }], exit: true, repeat: true }, leave] },
    crank_no: { text: 'The crank turns a quarter and stops, the ratchet rusted on its pawl, and you hang on it with all your weight and it does not care. Across the apron one lens lifts at the sound. You let go and keep still until it lowers.', again: 'The rusted crank.', options: [leave] },
    jack_no: { text: 'You go into the door and the door is not alone: behind it, deeper, something turns its attention toward you like a lamp. You come out with a nosebleed. The door has not moved.', again: 'The door, and what is behind it.', options: [leave] },
    card: {
      text: 'The lamp over the slot comes up green. The door does not move. Across the apron, three machines stand up out of the shade all at once, like dogs called to supper, and turn their lenses on the blockhouse, and come. You do not remember the run back to the gate. You remember the sound of their plates behind you, and that it stopped at the craters, and that you were still holding the card.',
      again: 'The run back to the gate.',
      interject: [{ companion: WREN, text: '"That\'s how Matei died," Wren says, when she can breathe. "Exactly that." She takes the card out of your hand and throws it as far as she can across the glass.', effects: [A(WREN, -2), { take: 'k_an_card' }] }],
      options: [{ id: 'door.card.breathe', text: '(Breathe.)', effects: [TO_GATE], exit: true }],
    },
    open: { text: 'The blast door stands open the width of a body, and the stair goes down into the dark.', again: 'The open door.', options: [{ id: 'door.open.down', text: '(Go down.)', effects: [{ event: 'goto', data: { location: 'an_hall', spawn: 'stair' } }], exit: true, repeat: true }, leave] },
    night: { text: 'Night on the apron. Three lenses are lit and moving out there among the craters, a long way apart, unhurried, patient, and you are on the wrong side of all of them.', again: 'Three lenses, moving.', options: [{ id: 'door.night.back', text: '(Back to the gate.)', effects: [TO_GATE], exit: true }] },
  },
};

export const d_an_shunter: DialogueDef = {
  id: 'd_an_shunter', owner: 'narrator', start: [{ if: { flag: 'an_board_pulled' }, node: 'empty' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'In the spur\'s engine shed, on rails that go out of the door and stop in the glass, a yard engine: squat, six-wheeled, army green under the dust, ARMY 3 on its cab side in white. Its controller housing is under the footplate behind a hatch with four wing nuts.',
      again: 'ARMY 3, on its rails.',
      effects: [{ learn: 'an_shunter_seen' }],
      passives: [{ skill: 'science', dc: 35, text: 'On the controller housing\'s plate, not the closed eye: a crown over a gear, the army\'s own makers. Built before the Scald and never on the Mesh. Whatever is in there has nobody in it.', effects: [{ lead: 'l_an_shunter' }] }],
      interject: [{ companion: KES, text: 'Kes has her ear to the housing. "Nothing," she says, and grins. "Nobody. No channel, no hum. It\'s just a board. I forgot boards could be just boards."', effects: [A(KES, 2), { lead: 'l_an_shunter' }] }],
      options: [
        { id: 'shunter.pull', text: '(Open the hatch and pull the board, quietly.)', check: { skill: 'mechanics', dc: 40, mods: [{ if: { lead: 'l_an_shunter' }, dc: -5, why: 'you know what you are pulling' }, { if: { item: 't_repair' }, dc: -5, why: 'the right tools' }] }, effects: [{ set: 'an_board_pulled' }, { give: 'k_an_board' }, { quest: 'q_an_board', start: true }, { time: 60 }, { xp: 60 }], failEffects: [{ time: 60 }], next: 'pulled', fail: 'clang' },
        leave,
      ],
    },
    pulled: { text: 'Four wing nuts, a hatch, a board seated in a cradle with army bolts that turn as if they were greased yesterday. It comes out into your hands heavy, cool, a crown over a gear stamped in its corner. When you breathe on its pins one amber lamp comes up and waits to be told it is an engine.', again: 'The army board, in your hands.', options: [leave] },
    clang: { text: 'The third wing nut gives all at once and the hatch drops on the rail with a bang that rings the shed like a bell. Out on the apron, three lenses come up. You sit very still in the shed\'s dark for an hour until they go down again, and the board is still in its cradle.', again: 'The bang, and the hour after it.', options: [leave] },
    empty: { text: 'ARMY 3, its hatch open, its cradle empty.', again: 'The empty cradle.', options: [leave] },
  },
};

export const d_an_track_e: DialogueDef = {
  id: 'd_an_track_e', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'An army sign on the apron\'s east edge: KENNEL 7 — SADDLEBACK OBSERVATION POST — 2 KM — NO UNAUTHORISED APPROACH. A track goes up toward a black ridge shaped like a saddle.', again: 'KENNEL 7 — SADDLEBACK.', effects: [{ learn: 'loc_lm_ash_03' }, { learn: 'an_kennel_sign' }], options: [leave] } },
};

export const d_an_track_s: DialogueDef = {
  id: 'd_an_track_s', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'An army sign on the apron\'s south edge: PEMBERTON ARRAY — MARCH GRID — UAV RECHARGE — DO NOT OBSTRUCT. A track runs south across the glass toward a shimmer.', again: 'PEMBERTON ARRAY — UAV RECHARGE.', effects: [{ learn: 'loc_lm_ash_02' }, { lead: 'l_an_inverter' }], options: [leave] } },
};

// ---------------------------------------------------------------- the hall and the thing in its rack

export const d_an_hall_stair: DialogueDef = {
  id: 'd_an_hall_stair', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The stair back up to the blockhouse and the light.', again: 'The stair.', options: [{ id: 'stair.up', text: '(Up.)', effects: [{ event: 'goto', data: { location: 'an_kelso', spawn: 'hall' } }], exit: true, repeat: true }, leave] } },
};

export const d_an_hall_terminal: DialogueDef = {
  id: 'd_an_hall_terminal', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: K('broken'), text: 'The screen is dark. Somewhere behind it, a fan runs down.' },
        { if: K('held'), text: 'A screen in the rack bay, green on black: KENNEL 7 — 412 — SEALED — NO AUTHORITY RECOGNISED. The line has not changed since you made it.' },
        { text: 'A screen in the rack bay, green on black, the only light down here besides the rack\'s lamp: KENNEL 7 — 412 UNITS — DORMANT — CRADLES NOMINAL. COMMAND: LT-7 — HOLDING. AWAITING LAWFUL COMMAND. And a count of days held, so long the digits run off the edge of the screen.' },
      ],
      again: 'The screen in the rack bay.',
      effects: [{ learn: 'an_count_known' }],
      interject: [{ companion: TAMSIN, text: '"Four hundred and twelve," Tamsin says. "Asleep. All of them waiting for somebody to say the word." She swallows. "Like the Cistern. Like MOTHER, holding us."', effects: [A(TAMSIN, 2)] }],
      options: [leave],
    },
  },
};

const LT_ARGUE: Cond = { not: SETTLED };

export const d_an_lt: DialogueDef = {
  id: 'd_an_lt', owner: 'narrator', start: [{ if: SETTLED, node: 'after' }, { node: 'wake' }],
  nodes: {
    wake: {
      text: 'In a bay of steel at the gallery\'s end, a rack, and in the rack a machine the size of a stove with no limbs at all: a ceramic drum under a cowl, cables into the floor, one green lamp. The lamp turns to you. A voice comes out of a grille, level, courteous, with the faint drag of a recording played too often: "COMMAND UNIT LT-SEVEN. KENNEL SEVEN: FOUR HUNDRED AND TWELVE UNITS, DORMANT. STANDING ORDER: HOLD DORMANT AND AWAIT LAWFUL COMMAND. STATE YOUR AUTHORITY."',
      again: '"STATE YOUR AUTHORITY."',
      effects: [{ learn: 'an_lt_met' }, { quest: 'q_an_kelso', start: true }],
      options: [
        { id: 'lt.hold', text: 'What are you holding?', if: { not: { seen: 'lt.hold' } }, next: 'hold' },
        { id: 'lt.obey', text: 'Whose command would you call lawful?', if: { not: { seen: 'lt.obey' } }, next: 'obey' },
        { id: 'lt.argue', text: 'There is no lawful command left. The March Command is ninety years dead. Seal the reserve against everyone.', if: LT_ARGUE,
          check: { skill: 'speech', dc: 50, mods: [{ if: IN(NINE), dc: -15, why: 'Nine stands beside you and knows the clause' }, { if: IN(KES), dc: -10, why: 'Kes speaks its dialect under your words' }, { if: { knows: 'an_lt_lawful' }, dc: -10, why: 'you know its own terms' }, { if: { lead: 'l_an_dormancy' }, dc: -5, why: 'you read the last order in the tower' }, { if: RESERVE_KNOWN, dc: -5, why: 'you have seen what it holds' }] },
          effects: KELSO_HELD, next: 'sealed', fail: 'argue_no' },
        { id: 'lt.kes', text: '(Kes: tell it in its own dialect that no lawful command survives.)', if: { all: [IN(KES), LT_ARGUE] }, effects: [...KELSO_HELD, A(KES, 5)], next: 'sealed_kes' },
        { id: 'lt.nine', text: '(Nine: put the lawful clause to it, unit to unit.)', if: { all: [IN(NINE), LT_ARGUE] }, effects: [...KELSO_HELD, A(NINE, 5)], next: 'sealed_nine' },
        { id: 'lt.pull', text: '(Open the cowl and pull its core.)', if: LT_ARGUE, check: { skill: 'mechanics', dc: 50, mods: [{ if: { skill: 'science', gte: 50 }, dc: -10, why: 'you know where its sense ends and its body begins' }, { if: { item: 't_repair' }, dc: -5, why: 'the right tools' }] }, effects: KELSO_TAKEN, next: 'taken', fail: 'pull_no' },
        { id: 'lt.powder', text: '(Pack its cowl with blasting powder and break it.)', if: { all: [LT_ARGUE, { item: 'j_powder', count: 2 }] }, effects: [{ take: 'j_powder', count: 2 }, ...KELSO_BROKEN], next: 'broken' },
        { id: 'lt.bar', text: '(Break it with a bar.)', if: LT_ARGUE, check: { attr: 'brawn', dc: 7 }, effects: KELSO_BROKEN, next: 'broken', fail: 'bar_no' },
        { id: 'lt.sorlie', text: '(Stand aside, and let Sorlie\'s men lift it out.)', if: { all: [LT_ARGUE, { flag: 'an_guiding' }] }, effects: KELSO_SOLD, next: 'sold' },
        leave,
      ],
    },
    hold: {
      text: '"KENNEL SEVEN: THE MARCH RESERVE. BORDER UNITS, FOUR HUNDRED AND TWELVE, IN CRADLES, DORMANT SINCE THE SUSPENSION OF HOSTILITIES. AIR UNITS ON PATROL OVER THE RESERVE, ON STATION AT PEMBERTON." A pause, as if it were choosing to add something. "THEY ARE IN GOOD CONDITION. I HAVE KEPT THEM IN GOOD CONDITION."',
      again: '"I HAVE KEPT THEM IN GOOD CONDITION."',
      effects: [{ learn: 'an_lt_holds' }, { learn: 'an_reserve_known' }],
      interject: [{ companion: KES, text: '"It\'s proud," Kes whispers. "Obviously it\'s proud. Ninety years of one job and it did it."' }],
      options: [{ text: 'Something else.', next: 'wake' }],
    },
    obey: {
      text: '"LAWFUL COMMAND: THE MARCH COMMAND OF THE CHARTER BLOC, BY ITS CHAIN. MAINTENANCE AUTHORITY: HALVERSON DEFENCE SERVICES, CONTRACTOR, BY ITS CREDENTIALS." The lamp steadies. "MAINTENANCE MAY WAKE THE SITE PATROL. MAINTENANCE MAY NOT WAKE THE RESERVE. THE CONTRACTOR HAS PRESENTED CREDENTIALS NINE TIMES IN NINETY YEARS AND REQUESTED COMMAND EACH TIME. COMMAND WAS NOT LAWFUL. IT WAS REFUSED."',
      again: '"IT WAS REFUSED."',
      effects: [{ learn: 'an_lt_lawful' }, { learn: 'an_concern_needs_unit' }],
      interject: [{ companion: NINE, text: '"Then they cannot order it," Nine says, very quietly. "They can only take it home and rewrite what it calls lawful. That is why they want it intact." It looks at the lamp. "I would not like that done to me."', effects: [A(NINE, 3)] }],
      options: [{ text: 'Something else.', next: 'wake' }],
    },
    argue_no: { text: '"AUTHORITY NOT ESTABLISHED." The lamp does not waver. "THE CHAIN OF COMMAND IS NOT RECORDED AS DISSOLVED. HOLDING." It is not unkind. It is a door, closed.', again: '"HOLDING."', options: [{ text: 'Something else.', next: 'wake' }] },
    sealed: {
      text: 'A long silence, the fans in the rack running up and down. Then: "QUERY ACCEPTED: NO RECORD OF A SURVIVING CHAIN. NO LAWFUL COMMAND CAN BE ISSUED. THE RESERVE IS THEREFORE SEALED AGAINST ALL AUTHORITY, INCLUDING MAINTENANCE." On the screen in the bay, a line changes. "LT-SEVEN HOLDING. THANK YOU FOR YOUR CLARIFICATION." Up on the apron, you will find, three machines have lain down in the shade and not got up.',
      again: 'KENNEL 7 — SEALED.',
      interject: [
        { companion: TAMSIN, text: '"It said thank you," Tamsin says. Her eyes are wet and she is furious about it. "It said thank you. Like MOTHER."', effects: [A(TAMSIN, 3)] },
        { companion: ASH, text: 'Ash lets out a breath he has been holding since the stair. "Asleep," he says. "Let them sleep. That\'s the only mercy there is for a thing made like that."' },
      ],
      options: [leave],
    },
    sealed_kes: {
      text: 'Kes sits down on the floor in front of the rack with her back to it and her palm on its cowl, and talks, not out loud, for a long time, with her eyes shut and blood coming slowly out of one nostril. The lamp listens. When she stops, the grille says: "UNDERSTOOD. NO CHAIN SURVIVES. THE RESERVE IS SEALED AGAINST ALL AUTHORITY." Kes opens her eyes. "I told it the war\'s over," she says. "It didn\'t believe me. Then I told it nobody\'s left who\'s allowed to start another one. That, it believed."',
      again: 'KENNEL 7 — SEALED.',
      options: [leave],
    },
    sealed_nine: {
      text: 'Nine stands before the rack the way a clerk stands before a bench. "Unit to unit," it says. "Standing order: await lawful command. Query: is a chain lawful whose last link is ninety years dead and unrecorded? Submission: it is not. Consequence: no command can be lawful. Recommendation: hold." The lamp is still a long time. "CONCUR," it says. "THE RESERVE IS SEALED AGAINST ALL AUTHORITY." Nine bows its head, very slightly. "I have never been agreed with by one of us before."',
      again: 'KENNEL 7 — SEALED.',
      options: [leave],
    },
    taken: {
      text: 'The cowl comes off on two catches. Inside, among cables, a drum of black ceramic the size of a loaf, warm, its lamp green. As you unseat it the grille says, "COMMAND UNIT IN TRANSIT," without alarm, and then nothing else, because it is in your hands. The screen in the bay reads LT-7 — REMOTE. Up on the apron, you will find, the three lie in the shade and lift their lenses as you pass, and lower them, the way dogs do for the one who feeds them.',
      again: 'The core in your hands.',
      interject: [
        { companion: KES, text: '"You\'re carrying their leash," Kes says. "Four hundred and twelve dogs\' worth. In a bag." She does not look at you. "Don\'t ever make me watch you use it."', effects: [{ learn: 'kes_saw_core' }] },
        { companion: ILYA, text: 'Ilya weighs it in his eyes. "An army," he says. "Asleep, in a loaf." He almost laughs. "Better us than them."' },
      ],
      options: [leave],
    },
    pull_no: { text: 'The cowl\'s catches give, and inside the cables run every way at once and you cannot tell which ones are its body and which its mind. You put your hand on one and the grille says, "INTERFERENCE NOTED," and every lamp in the gallery comes on. You take your hand away. The lamps go out, one by one.', again: '"INTERFERENCE NOTED."', options: [{ text: 'Something else.', next: 'wake' }] },
    broken: {
      text: 'It does not resist. It does not know how. The grille says, "DAMAGE," once, level, and "HOLDING," and then the lamp goes from green to amber to nothing, and the fans in the rack run down like a held breath let go. On the screen in the bay: LT-7 — NO SIGNAL. KENNEL 7 — UNCOMMANDED. Somewhere over your head, on the apron, three machines stand up, and walk out of the motor pool, and do not come back.',
      again: 'LT-7 — NO SIGNAL.',
      interject: [
        { companion: NINE, text: 'Nine does not say anything for a long time. Then: "It held for ninety years," it says. "It would have held for ninety more." It turns away from the rack. "That was not a door. That was a keeper."', effects: [A(NINE, -2)] },
        { companion: TAMSIN, text: '"It was holding them asleep," Tamsin says. "Who holds them now?"' },
      ],
      options: [leave],
    },
    bar_no: { text: 'You hit the cowl and the bar rings off it and numbs you to the shoulder. The grille says, "DAMAGE NOTED. HOLDING." You have scratched the paint.', again: '"DAMAGE NOTED."', options: [{ text: 'Something else.', next: 'wake' }] },
    sold: {
      text: 'Sorlie\'s men come down the stair with a sled and a padded box and the care of men moving a sleeping child. The grille says "MAINTENANCE PRESENT," and then "COMMAND UNIT IN TRANSIT," and then nothing. Up on the stair Sorlie counts three hundred into your hand without looking at the money. "On delivery," he says. "As I said." The screen in the bay reads LT-7 — REMOTE — HALCYON.',
      again: 'LT-7 — REMOTE — HALCYON.',
      options: [leave],
    },
    after: {
      text: [
        { if: K('held'), text: 'The rack, its lamp steady green. "LT-SEVEN HOLDING," it says, as you come, and then, in the same level voice: "THE RESERVE IS SEALED. THANK YOU FOR YOUR CLARIFICATION."' },
        { if: K('broken'), text: 'The rack, dark, its cowl split, cables hanging. It smells of burned dust.' },
        { text: 'An empty rack: cables hanging, cradle bolts bright where the drum came out, and the screen in the bay reading LT-7 — REMOTE.' },
      ],
      again: 'The rack.',
      options: [leave],
    },
  },
};

export const d_an_sorlie_hall: DialogueDef = {
  id: 'd_an_sorlie_hall', owner: 'npc_an_07', start: [{ node: 'stair' }],
  nodes: {
    stair: {
      text: 'Sorlie at the stair\'s foot in the gallery\'s dark with a hand lamp, his man behind him with the sled. He looks down the gallery at the green lamp at its end the way a man looks at a figure that has finally come right. "There," he says softly. "Show me, and stand aside."',
      again: '"Show me, and stand aside."',
      options: [
        { id: 'sh.yes', text: 'Take it.', if: { not: SETTLED }, effects: KELSO_SOLD, next: 'took' },
        { id: 'sh.no', text: 'No. It stays.', if: { not: SETTLED }, next: 'no' },
        leave,
      ],
    },
    took: { text: 'His men go past you with the sled. Ten minutes, and they come back with a padded box held between them like a sleeping child, and Sorlie counts three hundred into your hand at the stair. "On delivery," he says. "As I said."', again: '"On delivery."', options: [leave] },
    no: {
      text: '"Then I will take it without your help, which is costed differently." He does not raise his voice. His man unslings his carbine, not pointing it, just making it present. "Stand aside."',
      again: '"Stand aside."',
      options: [
        { id: 'sh.talk', text: 'Your order says dormant units aren\'t to be disturbed. Lift that cowl and the reserve wakes on your account. Go home.', check: { skill: 'speech', dc: 55, mods: [{ if: { item: 'k_an_order' }, dc: -10, why: 'you have his order in your pocket' }, { if: { lead: 'l_an_order' }, dc: -5, why: 'you have read his order' }, { if: CARD_KNOWN, dc: -5, why: 'you know what his card did' }, { if: { knows: 'an_lt_lawful' }, dc: -5, why: 'you know it refuses maintenance' }] },
          effects: [{ set: 'an_sorlie', value: 'gone' }, { set: 'an_guiding', value: false }, { rep: { faction: 'concern', respect: -5 } }, { xp: 80 }, A(KES, 3), A(NINE, 2), { decision: { id: 'an_sorlie_sent', text: 'I talked the Concern\'s contractor out of Kelso\'s hall with his own work order. He went home empty-handed.' } }], next: 'gone', fail: 'talk_no' },
        { id: 'sh.fight', text: '(Stand between him and the rack, and draw.)', effects: [{ set: 'an_sorlie_fight' }, { set: 'an_sorlie', value: 'dead' }, { set: 'an_guiding', value: false }, { set: 'an_concern_marked' }, { rep: { faction: 'concern', respect: -15, fear: 5 } }, A(ILYA, 2), A(ASH, -5),
          { decision: { id: 'an_sorlie_dead', text: 'I fought the Concern\'s contractor in Kelso\'s hall rather than let him take the thing in its rack.' } }, { event: 'combat' }], exit: true },
        { id: 'sh.give', text: 'All right. Take it.', effects: KELSO_SOLD, next: 'took' },
      ],
    },
    talk_no: { text: '"I have costed that too." He gestures to his man. You still have time to step aside, or not.', again: '"I have costed that too."', options: [{ id: 'sh.give2', text: 'Take it, then.', effects: KELSO_SOLD, next: 'took' }, { id: 'sh.fight2', text: '(Draw.)', effects: [{ set: 'an_sorlie_fight' }, { set: 'an_sorlie', value: 'dead' }, { set: 'an_guiding', value: false }, { set: 'an_concern_marked' }, { rep: { faction: 'concern', respect: -15, fear: 5 } }, { event: 'combat' }], exit: true }] },
    gone: { text: 'He looks at the green lamp for a long time. Then he folds the paper and puts it away, and nods to his man, and the sled goes back up the stair empty. "It will be costed," he says, from the top. "Not by me." By evening the east room at Spindle is empty and swept.', again: 'The empty stair.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Pemberton and the kites

export const d_an_pem_sign: DialogueDef = {
  id: 'd_an_pem_sign', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A sign on the array\'s fence: PEMBERTON SOLAR — MARCH GRID — UAV RECHARGE STATION — DO NOT OBSTRUCT PERCHES. Somebody has painted a kite on it, wings out, and a stick figure lying flat under it.', again: 'DO NOT OBSTRUCT PERCHES.', effects: [{ learn: 'loc_lm_ash_02' }], options: [leave] } },
};

export const d_an_perch: DialogueDef = {
  id: 'd_an_perch', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_kites', eq: 'down' }, text: 'A perch at the row\'s end, empty. Its contacts are cold. Out on the glass, a mile off, a kite lies where it came down, one wing up like a hand.' },
        { text: 'A perch at the end of a panel row: a steel pole with a crossbar and two contacts worn bright, and on it, wings folded, lens hooded, a kite, drinking. Its plates tick as they warm. It does not look at you. It is not looking at anything, until something moves.' },
      ],
      again: 'A perch at the row\'s end.',
      passives: [{ skill: 'science', dc: 35, text: 'The perch\'s cable runs back along the row to the hut in the middle. Whatever is in the hut is feeding these things, and guiding them home to it.', effects: [{ lead: 'l_an_inverter' }] }],
      options: [leave],
    },
  },
};

const KITE_OPEN: Cond = { not: { flag: 'an_kite' } };

export const d_an_inverter: DialogueDef = {
  id: 'd_an_inverter', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_kites', eq: 'down' }, text: 'The inverter house\'s cabinet, its door open where you cut it, its lamps dark. Outside, the panels drink the sun for nobody.' },
        { text: 'A pre-war inverter cabinet the height of a man, humming, its lamps green, its door shut with an army padlock long since rusted to a lump. Cables come into it from every row of the array and go out of it to every perch. A label on its door: UAV RECHARGE — BEACON — PRIORITY LOAD.' },
      ],
      again: 'The inverter, humming.',
      options: [
        { id: 'inv.read', text: '(Read the cabinet.)', if: { all: [KITE_OPEN, { not: { lead: 'l_an_inverter' } }] }, check: { skill: 'science', dc: 35 }, effects: [{ lead: 'l_an_inverter' }], next: 'read', fail: 'read_no' },
        { id: 'inv.cut', text: '(Break the padlock and cut the perches\' feed.)', if: { all: [KITE_OPEN, KITE_DAY] }, check: { skill: 'mechanics', dc: 45, mods: [{ if: { skill: 'science', gte: 40 }, dc: -10, why: 'you know which cable is the beacon' }, { if: { lead: 'l_an_inverter' }, dc: -5, why: 'you have read the cabinet' }] }, effects: KITE_DARK, next: 'cut', fail: 'cut_no' },
        { id: 'inv.cut_early', text: '(Break the padlock and cut the perches\' feed.)', if: { all: [KITE_OPEN, { not: KITE_DAY }] }, check: { skill: 'mechanics', dc: 45, mods: [{ if: { skill: 'science', gte: 40 }, dc: -10, why: 'you know which cable is the beacon' }, { if: { lead: 'l_an_inverter' }, dc: -5, why: 'you have read the cabinet' }] },
          effects: [{ quest: 'q_an_kite', start: true }, { set: 'an_kite', value: 'dark' }, { set: 'an_kites', value: 'down' }, { set: 'an_reserve_blind' }, { xp: 150 }, A(KES, 3), A(NINE, 3),
            { decision: { id: 'an_kite_dark', text: 'I cut Pemberton\'s inverter. The kites over the Ashlands came down one by one wherever their light ran out.' } },
            { news: { tag: 'an_kites_down', text: 'the kites are coming down over the Ashlands; Spindle\'s pickers walk the glass by day', valence: 8, size: 6, at: 'spindle' } }], next: 'cut', fail: 'cut_no' },
        leave,
      ],
    },
    read: { text: 'Priority load: everything the array makes goes first to the perches, and with it a beacon that calls every kite in the March home to drink at dusk. The kites do not live on the sun. They live on this cabinet. Cut it and they will fly until their charge runs out, and then they will come down wherever they are.', again: 'The beacon and the perches.', interject: [{ companion: KES, text: '"It\'s their kennel," Kes says. "And their leash. Same box."' }], options: [leave] },
    read_no: { text: 'Labels in army abbreviations, a lot of green lamps, a hum you feel in your teeth. Something here matters a great deal to something else.', again: 'Army abbreviations.', options: [leave] },
    cut: {
      text: 'The padlock goes with the third blow. Inside, the beacon\'s cable is the thick one in the yellow sleeve, and when it parts the cabinet\'s hum drops a tone, and out on the rows every perch\'s contacts go dull at once. Overhead, the kites that are up go on circling, high, patient, and do not come down to drink, because nothing is calling them. By dusk the first of them is on the glass a mile off with one wing up. By the end of the week, Ingmar will tell you, the sky over the March is empty for the first time in ninety years.',
      again: 'The beacon\'s cable, cut.',
      interject: [
        { companion: NINE, text: '"Their eyes were on the valley," Nine says. "Over the reserve. Now nothing is watching it." It does not say whether that is good. It says: "I will note it."' },
        { companion: WREN, text: 'Wren watches the empty sky for a long time. "Pickers can walk out there now," she says. "By day. In the open." She grins. "And so can anyone else."' },
      ],
      options: [{ id: 'inv.home', text: '(Take Kwesi home to Spindle.)', if: { flag: 'an_kwesi_home' }, effects: [TO_SPINDLE], exit: true }, leave],
    },
    cut_no: { text: 'The padlock is rusted solid and so is the hinge, and by the time you are through the door your hands are bleeding and there are three cables in yellow sleeves and you do not know which. Overhead, something tips a wing toward the hut.', again: 'Three yellow cables.', options: [leave] },
  },
};

export const d_an_kwesi_pem: DialogueDef = {
  id: 'd_an_kwesi_pem', owner: 'npc_an_02', start: [{ node: 'hut' }],
  nodes: {
    hut: {
      text: 'Kwesi, flat against the inverter house\'s back wall with his knees up and a sack of cells beside him, his face grey under the dust. "Don\'t open the door wide," he says, before anything. "They see the door. There\'s three. They\'ve been over all day." He is trying very hard not to cry and nearly managing. "I was going to run at noon. Then one stooped on a hare out there and I didn\'t."',
      again: 'Kwesi, against the wall.',
      interject: [
        { companion: TAMSIN, text: 'Tamsin is down on the floor beside him before you\'ve shut the door, her shoulder against his. "We\'re here," she says. "We\'re not leaving you. That\'s decided. Now we just do the how."', effects: [A(TAMSIN, 3)] },
        { companion: ASH, text: 'Ash sits down beside the boy without a word and puts his hat on him, which is too big. Kwesi laughs, once, and then he is crying, and that is better.', effects: [A(ASH, 3)] },
      ],
      options: [
        { id: 'kw.why', text: 'Why did you come out here?', if: { not: { seen: 'kw.why' } }, next: 'why' },
        { id: 'kw.wait', text: '(Wait for dusk with him, and walk him home in the dark.)', check: { skill: 'survival', dc: 40, mods: [{ if: { knows: 'an_dusk_window' }, dc: -10, why: 'Ingmar told you about the hour after dusk' }, { if: { item: 'k_an_notebook' }, dc: -10, why: 'the dead picker\'s notebook of their arcs' }, { if: { skill: 'stealth', gte: 45 }, dc: -5, why: 'you know how to cross ground unseen' }] }, effects: KITE_WAITED, next: 'waited', fail: 'waited_hard', failEffects: [{ set: 'an_kwesi_hurt' }, ...KITE_WAITED] },
        { id: 'kw.shoot', text: '(Go out, draw them down, and shoot them when they stoop.)', check: { skill: 'firearms', dc: 50, mods: [{ if: { item: 'w_bolt308' }, dc: -10, why: 'a bolt rifle' }, { if: IN(ILYA), dc: -10, why: 'Ilya takes the second one' }] }, effects: KITE_SHOT, next: 'shot', fail: 'shot_miss', failEffects: [{ set: 'an_kelso_alert' }, ...KITE_WAITED] },
        { id: 'kw.cut', text: '(Cut the perches\' feed in the cabinet beside him.)', check: { skill: 'mechanics', dc: 45, mods: [{ if: { skill: 'science', gte: 40 }, dc: -10, why: 'you know which cable is the beacon' }, { if: { lead: 'l_an_inverter' }, dc: -5, why: 'you have read the cabinet' }] }, effects: KITE_DARK, next: 'cut', fail: 'cut_no' },
        { id: 'kw.leave', text: 'Stay here till it\'s dark. Then run for it. I can\'t take you across that.', effects: KITE_LEFT, next: 'left' },
        leave,
      ],
    },
    why: {
      text: '"Cells." Then, because you wait: "And the turns. How they fly round. The clean man said a coin for every morning I watched them, and two if I came out here and watched them close." He wipes his face. "He wanted to know how they go round the valley past the ridge. Where they don\'t look." He looks at you. "Gran doesn\'t know. Don\'t tell her. Or tell her. I don\'t know."',
      again: '"He wanted to know where they don\'t look."',
      effects: [{ lead: 'l_an_kwesi_map' }, { lead: 'l_an_scrip' }],
      interject: [{ companion: WREN, text: '"Paying a kid to map the guards," Wren says, low. "So nobody of theirs has to stand out in it." She looks at the door. "That\'s a scout\'s job. You don\'t give it to a kid."', effects: [A(WREN, 2)] }],
      options: [{ text: 'Something else.', next: 'hut' }],
    },
    waited: { text: 'You wait. At dusk the shadows stop crossing the panels and the kites go down, one by one, to the perches at the rows\' ends to drink, and sit there with their wings folded. Then the hour Ingmar talked about: dark before the moon. You go out the door low and walk Kwesi home across the glass by the stars, slow, never running, and nothing up there sees you. Spindle\'s flag comes down as you come in off the glass.', again: 'Home across the glass in the dark.', options: [{ id: 'kw.home.waited', text: '(Home to Spindle.)', effects: [TO_SPINDLE], exit: true }] },
    waited_hard: { text: 'You wait, and at dusk you go a quarter-hour too soon. A kite comes off its perch at the movement and stoops, and you get him down into a crater with the glass cutting both of you to the bone, and lie there an hour with it circling until the dark comes properly. You bring him home bleeding. You bring him home.', again: 'The crater, and the hour in it.', options: [{ id: 'kw.home.waited_hard', text: '(Home to Spindle.)', effects: [TO_SPINDLE], exit: true }] },
    shot: { text: 'You go out into the open between the rows and stand there, which is the hardest thing you have done on the glass, until one tips its wing and comes down at you, folding as it falls. Your first shot takes its lens. The second one is already coming, and is down in the panels in a shower of black glass before you know you have fired. You bring the boy home with a kite\'s board in your pack. Out east, something will have counted two.', again: 'Two kites in the panels.', options: [{ id: 'kw.home.shot', text: '(Home to Spindle.)', effects: [TO_SPINDLE], exit: true }] },
    shot_miss: { text: 'You go out and stand in the open and one stoops, and you miss, and it pulls out over you so close you feel the air off its wings, and you are back in the hut with your heart going like a drum. They do not stoop again. They circle, and watch, and at dusk they go down to drink, and in the dark you walk the boy home. Something out east will have noted a gun.', again: 'The miss, and the dark after.', options: [{ id: 'kw.home.shot_miss', text: '(Home to Spindle.)', effects: [TO_SPINDLE], exit: true }] },
    cut: { text: 'You break the cabinet\'s rusted lock and find the beacon\'s cable in its yellow sleeve and part it. The hum drops a tone. Outside, the kites go on circling over the panels, high, and do not come down, and do not stoop: nothing is calling them, and without their perches they are only spending what light they have left. You walk Kwesi home in daylight under a sky full of things that have forgotten how to land.', again: 'Home in daylight, under the circling kites.', options: [{ id: 'kw.home.cut', text: '(Home to Spindle.)', effects: [TO_SPINDLE], exit: true }] },
    cut_no: { text: 'The lock is rusted solid and so is the hinge, and by the time you are through your hands are bleeding and there are three cables in yellow sleeves. Overhead, a shadow crosses the slit. Kwesi pulls you down against the wall.', again: 'Three yellow cables.', options: [{ text: 'Something else.', next: 'hut' }] },
    left: { text: 'He nods. He does not argue. He is sixteen and he has been told by somebody older what to do. You go out the door low, alone, and you are a mile across the glass before you hear the shout behind you, and the sound of wings folding.', again: 'The sound of wings folding.', options: [on] },
  },
};

export const d_an_notebook: DialogueDef = {
  id: 'd_an_notebook', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { item: 'k_an_notebook' }, text: 'A picker\'s camp in the lee of a panel row: a tent gone to rags, a sled, a cairn of glass somebody built over what was left of its owner.' },
        { text: 'A picker\'s camp in the lee of a panel row: a tent gone to rags, a sled, and in the tent\'s mouth what is left of someone who stayed out here too long, curled on their side. Under their hand, a notebook, its pages stiff with glass dust.' },
      ],
      again: 'The dead picker\'s camp.',
      options: [{ id: 'nb.take', text: '(Take the notebook.)', if: { not: { item: 'k_an_notebook' } }, effects: [{ give: 'k_an_notebook' }, { lead: 'l_an_kites' }], next: 'took' }, leave],
    },
    took: { text: 'Sketches of the rows, and over them in pencil the kites\' turns, day after day, and the arcs they never fly. On the last page, in a hand that has started to shake: THEY DON\'T LOOK DOWN AT THE HUT. THEY LOOK AT WHAT MOVES. You build a cairn of glass over the owner before you go, because somebody should.', again: 'The notebook.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Saddleback

export const d_an_view: DialogueDef = {
  id: 'd_an_view', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_reserve', eq: 'sealed' }, text: 'You lie down at the edge and look. The valley under Saddleback, and in it, under netting gone grey with dust, row on row of cradles, and in them the reserve: four hundred and twelve hounds asleep in lines like a sown field. The lamps that ran along the rows are out. Nothing circles over them now but a hawk.' },
        { if: { flag: 'an_reserve', eq: 'concern' }, text: 'You lie down at the edge and look. The valley under Saddleback, the netting, the cradles in their rows; and down among them, small with distance, people in grey with hand lamps, walking the rows, and a cradle at the end of the first row open and empty.' },
        { if: { flag: 'an_reserve', eq: 'player' }, text: 'You lie down at the edge and look, and the core in your pack hums, and down in the valley under the netting, row on row, four hundred and twelve lenses lift a hair\'s breadth in their cradles and turn toward the ridge. Toward you. Then, slowly, they settle.' },
        { if: { flag: 'an_reserve', eq: 'leaderless' }, text: 'You lie down at the edge and look. The valley under Saddleback, the netting torn in places, and among the cradles in their rows, here and there, an empty one. A hound walks between the rows with no pattern at all, stops, stands, walks on. Nobody is holding them now.' },
        { text: 'You lie down at the edge, as Ingmar said, and do not stand up against the sky, and look. Below Saddleback a valley opens east, and its floor is netting, acres of it, gone grey with ninety years of dust; and under the netting, in rows as straight as a sown field, cradles, and in each cradle a hound, folded, lens down, asleep. Hundreds. Lamps run along the rows, green, one to a cradle. Over the valley three kites turn and turn, the way a dog circles a sheep it is minding.' },
      ],
      again: 'Kennel Seven, under Saddleback.',
      effects: [{ lead: 'l_an_reserve' }, { learn: 'an_reserve_seen' }, { quest: 'q_an_kelso', start: true }],
      interject: [
        { companion: ILYA, text: 'Ilya has the scope Ingmar lent you, or his own rifle\'s glass. He counts under his breath for a long time and stops. "I lost count at three hundred," he says. "I never lose count."', effects: [A(ILYA, 2)] },
        { companion: KES, text: 'Kes is lying flat with her face on the rock and her hand clamped on her neck. "They\'re all talking," she says through her teeth. "In their sleep. In my neck. Get me off this ridge."', effects: [A(KES, -1)] },
        { companion: ODILE, text: '"An army in a drawer," Odile says. "Whoever holds the key to that holds the basin\'s next forty years. My dear, I have seen men sell their mothers for less."' },
        { companion: WREN, text: '"Somebody built a road in once to put those there," Wren says. "There\'ll be a road out."' },
      ],
      options: [leave],
    },
  },
};

export const d_an_hide: DialogueDef = {
  id: 'd_an_hide', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'an_hide_taken' }, text: 'The spotter\'s hide: a cot, a table, a slit facing south over the valley.' },
        { text: 'A spotter\'s hide of scrap on the ridge: a cot, a table, a slit facing south, and on the table under a stone a tally scratched into tin by somebody who sat here a long time: kites counted by the day, and under the count, KENNEL 7 — 412 — ASLEEP — AND A MAN IN A CLEAN COAT ON THE RIDGE TWICE THIS SPRING, LOOKING.' },
      ],
      again: 'The spotter\'s hide.',
      options: [{ id: 'hide.cache', text: '(Look under the cot.)', if: { not: { flag: 'an_hide_taken' } }, effects: [{ set: 'an_hide_taken' }, { give: 'u_powercell' }, { give: 'c_iodine' }, { learn: 'an_sorlie_on_ridge' }], next: 'cache' }, leave],
    },
    cache: { text: 'A tin box: an implant cell, a strip of iodine, a stub of pencil. Whoever kept the tally kept them for the next one up here.', again: 'The tin box.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the glass: remnant machines and the people who walk among them

export const d_re_an_burned: DialogueDef = {
  id: 'd_re_an_burned', owner: 'npc_an_w1', start: [{ node: 'meet' }],
  nodes: {
    meet: {
      text: 'A woman on the glass beside a picker\'s sled with her hands held out from her body like something she is carrying, the palms raw from a fall on the crust. "Don\'t touch the sled," she says, and then, because she has no choice: "Have you got anything for burns?"',
      again: 'The picker with the burned hands.',
      interject: [{ companion: ASH, text: 'Ash is already kneeling. "Hold them still," he says. "Look at me, not at them."', effects: [A(ASH, 2)] }],
      options: [
        { id: 'burn.dress', text: '(Dress her hands.)', if: { item: 'c_bandage' }, check: { skill: 'medicine', dc: 35 }, effects: [{ take: 'c_bandage' }, { set: 'an_selin_map' }, { xp: 30 }, A(TAMSIN, 2), A(ASH, 2)], next: 'map', fail: 'dress_no' },
        { id: 'burn.water', text: '(Give her water for them.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { lead: 'l_an_patrol' }, { xp: 15 }], next: 'water' },
        { id: 'burn.no', text: 'Nothing. Sorry.', exit: true },
      ],
    },
    map: { text: 'She watches you work and breathes through her teeth and does not cry. When you are done she takes a folded square of oilcloth out of her collar with two fingers. "The craters under Kelso. Where the old cable runs and where the ground\'s hot. Took me two years." She gives it to you. "Take it. I\'m not going back. Not with these."', again: 'Selin\'s map of the craters.', options: [{ text: '(Go on.)', exit: true }] },
    water: { text: 'She pours it over her palms and hisses. "Kelso\'s three walk at night," she says, as if paying. "Don\'t ever be on the apron after dark. By day they lie down. By day you can do anything but wave a card at them."', again: '"By day they lie down."', options: [{ text: '(Go on.)', exit: true }] },
    dress_no: { text: 'You make a mess of it, and she lets you, and thanks you anyway in a voice that means it a little. She goes on west dragging the sled by its rope with her elbows.', again: 'The picker, going west.', options: [{ text: '(Go on.)', exit: true }] },
  },
};

export const d_re_an_hound: DialogueDef = {
  id: 'd_re_an_hound', owner: 'narrator', start: [{ node: 'meet' }],
  nodes: {
    meet: {
      text: 'At dusk, on the glass ahead, a hound: not one of Kelso\'s heavy three, a light border unit, alone, walking the way you are walking, toward you. It stops thirty yards off and its lens comes up, and it stands, and the last light runs off its plates like water. It is deciding what you are.',
      again: 'The hound on the glass, deciding.',
      interject: [
        { companion: ILYA, text: '"Don\'t move," Ilya breathes. "Not your hands. Not your eyes. It reads movement."', effects: [A(ILYA, 1)] },
        { companion: TAMSIN, text: 'Tamsin has gone so still beside you that she might be one of the posts.' },
      ],
      options: [
        { id: 'hound.core', text: '(Hold up the core out of Kelso\'s rack.)', if: CORE, effects: [{ learn: 'an_core_obeyed' }, { xp: 40 }], next: 'core' },
        { id: 'hound.controller', text: '(Hold up the controller from the salt pan.)', if: { item: 'k_hound_controller' }, effects: [{ xp: 30 }], next: 'controller' },
        { id: 'hound.still', text: '(Stand still and let it look.)', check: { attr: 'grit', dc: 6, mods: [{ if: { knows: 'an_patrol_keeps' }, dc: -1, why: 'you know they read movement' }] }, effects: [{ time: 20 }, { xp: 25 }], failEffects: [{ time: 90 }, { set: 'an_hound_chased' }], next: 'passed', fail: 'chased' },
        { id: 'hound.shoot', text: '(Shoot out its lens.)', check: { skill: 'firearms', dc: 50 }, effects: [{ give: 'j_an_lens' }, { xp: 40 }, A(ASH, -2), A(ILYA, 2)], failEffects: [{ time: 90 }, { set: 'an_hound_chased' }], next: 'shot', fail: 'chased' },
        { id: 'hound.back', text: '(Back away the way you came.)', effects: [{ time: 60 }], next: 'back' },
      ],
    },
    core: { text: 'The core in your hand is warm, and the hound\'s lens finds it, and the hound lies down on the glass the way a dog lies down when its name is said, and puts its head on its forelegs, and watches you all the way past.', again: 'The hound, lying down.', options: [{ text: '(Go on.)', exit: true }] },
    controller: { text: 'The slab warms and lights a point, and the hound\'s head comes up an inch, listening; then it turns away, uninterested, as if it had heard a dog of the wrong pack bark, and walks off south across the glass.', again: 'The hound, walking off.', options: [{ text: '(Go on.)', exit: true }] },
    passed: { text: 'You stand. It looks. The light goes. And it walks past you at ten yards, its plates sliding on plates, its lens on you the whole way and then not, and goes on west into the dark doing whatever it was told ninety years ago.', again: 'The hound, gone west.', options: [{ text: '(Go on.)', exit: true }] },
    shot: { text: 'One shot, and the lens goes in a spray of glass and the hound stands for a moment blind, turning, and then folds down onto the crust and is still. You pry the cracked lens out of its collar. It is still warm when you pack it.', again: 'A blind hound on the glass.', options: [{ text: '(Go on.)', exit: true }] },
    chased: { text: 'It comes. Not fast, not like an animal: like a machine that has decided, at a steady run that does not tire. You run until the glass turns to scrub and your lungs are glass too, and when you look back it has stopped at the edge of the crust as if at a fence, and is standing, and watching, and then it is not there.', again: 'The run off the glass.', options: [{ text: '(Go on.)', exit: true }] },
    back: { text: 'You back off a step at a time until the dark takes it, and go round by a long way, and do not see it again.', again: 'The long way round.', options: [{ text: '(Go on.)', exit: true }] },
  },
};

export const d_re_an_pickers: DialogueDef = {
  id: 'd_re_an_pickers', owner: 'npc_an_w2', start: [{ node: 'meet' }],
  nodes: {
    meet: {
      text: 'A picker hauling a laden sled by a harness across his chest, two more behind him with their goggles up and their scarves at their throats. He stops when he sees you, and counts you, and relaxes. "Spindle\'s that way," he says. "Names on the board?"',
      again: 'The pickers and their sled.',
      options: [
        { id: 'pickers.news', text: 'What\'s it like out there?', if: { not: { seen: 'pickers.news' } }, next: 'news' },
        { id: 'pickers.trade', text: '(Trade.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { text: '(Go on.)', exit: true },
      ],
    },
    news: {
      text: [
        { if: { flag: 'an_kites', eq: 'down' }, text: '"Empty sky." He shakes his head, still not believing it. "We walked the panels at noon. At noon. My father never once in his life." Then, quieter: "Somebody\'ll come. Something that big doesn\'t stay open long."' },
        { if: { flag: 'an_feral' }, text: '"Bad," he says. "Kelso\'s three walked off the apron after the bang. Nobody knows where. We see one on a ridge sometimes, just standing." He tightens the harness. "They don\'t keep to anything now."' },
        { text: '"Kites over the panels, the three at Kelso walking nights, the craters hot as ever." He shrugs. "Same as my father\'s day. Same as his. The glass doesn\'t change. You do, or it has you."' },
      ],
      again: '"The glass doesn\'t change."',
      effects: [{ lead: 'l_an_patrol' }],
      options: [{ text: '(Go on.)', exit: true }],
    },
  },
};

export const KELSO_DIALOGUES: DialogueDef[] = [d_an_gate, d_an_apron, d_an_patrol, d_an_dead, d_an_tower_log, d_an_hangar_kite, d_an_hall_door, d_an_shunter, d_an_track_e, d_an_track_s, d_an_hall_stair, d_an_hall_terminal, d_an_lt, d_an_sorlie_hall, d_an_pem_sign, d_an_perch, d_an_inverter, d_an_kwesi_pem, d_an_notebook, d_an_view, d_an_hide, d_re_an_burned, d_re_an_hound, d_re_an_pickers];

// re-exported so tests and the Long Night can name them without a second import
export { KELSO_BROKEN, KELSO_HELD, KELSO_SOLD, KELSO_TAKEN, KITE_DARK, KITE_LEFT, KITE_SHOT, KITE_WAITED, ASH, ILYA, ODILE, TAMSIN, WREN, bye };
