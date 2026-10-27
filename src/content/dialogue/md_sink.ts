import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';

/**
 * The Sink: Meridian's flooded under-city. The tally wall and the spring line, the pump house the Precinct keeps,
 * Ocho's free clinic and the Code, Vash's cold box, the Pale on the east bank.
 */

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 22, to: 5 } };
/** Nobody minds you in the pump house: the keeper's leave, a warden's card, the house taken, or the spring already settled. */
const PUMP_ACCESS: Cond = { any: [{ flag: 'sk_pump_leave' }, { member: 'wardens' }, { flag: 'sk_fight_pumps' }, { flag: 'sk_pumps' }, { flag: 'sk_dial_sneak' }] };
const UNDECIDED: Cond = { not: { flag: 'sk_pumps' } };

// ---------------------------------------------------------------- signs and the water

export const d_sk_stair_sign: DialogueDef = {
  id: 'd_sk_stair_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A Precinct sign, enamel, bolted to the stair\'s foot: THE SINK — NO SERVICE BELOW THIS POINT — RELIEF PUMPING AS PER SCHEDULE. Under it, in chalk, in a dozen hands over a dozen years: WE KNOW.', effects: [{ learn: 'sk_sign_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sk_tally: DialogueDef = {
  id: 'd_sk_tally', owner: 'narrator', start: [{ node: 'wall' }],
  nodes: {
    wall: {
      text: 'A concrete wall chalked floor to head-height with names, each with a year and a word: STAIR. WALK. SHANTY. CLINIC. Most of the words are STAIR. The oldest are chalked over the newest where the wall ran out; the newest are still white.',
      effects: [{ learn: 'sk_tally_seen' }],
      passives: [{ attr: 'senses', dc: 7, text: 'Beside perhaps one name in three, in pencil, in a different hand, a number: the kind the Precinct puts on a card.', effects: [{ learn: 'sk_tally_numbers' }] }],
      options: [
        { id: 'tally.read', text: '(Read the newest.)', next: 'newest', once: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
    newest: { text: 'ROOS, H. — the spring before last — STAIR. PENN, D. — the spring before last — STAIR. ODUYA, M. — last spring — WALK. Seven more from last spring, and under them, with no year yet, a space somebody has swept clean.', effects: [{ learn: 'sk_dagny_son' }, { learn: 'sk_tally_read' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_sk_mark: DialogueDef = {
  id: 'd_sk_mark', owner: 'narrator', start: [{ node: 'lines' }],
  nodes: {
    lines: {
      text: 'The chalk lines up the first pier. The lowest, knee-high, is twelve years old. They climb a hand a year, steadily, since the one marked 37 — beside which someone has written, small, PUMPS 2 & 3 TO PRECINCT. Next spring\'s line is drawn already, above your head, with a question mark.',
      effects: [{ learn: 'sk_mark_read' }, { lead: 'l_pumps_schedule' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_sk_clinic_sign: DialogueDef = {
  id: 'd_sk_clinic_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A board over the clinic door, painted and repainted: OCHO — FREE — SIT. Under it, smaller: FIT ONLY WHAT THE PATIENT CAN BEAR.', effects: [{ learn: 'menders_code_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sk_vash_sign: DialogueDef = {
  id: 'd_sk_vash_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A container door painted the green of the light inside it. No sign. A pair of scales drawn on the paint, and under them, in the same green: ANYTHING WARM.', effects: [{ learn: 'vash_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_sk_pale_sign: DialogueDef = {
  id: 'd_sk_pale_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A hand painted white on the rubble at the walk\'s end, fingers spread, with the palm scored through: no chrome. The Pale\'s mark. Everyone in Meridian knows what it means and nobody up the stair says it aloud.', effects: [{ learn: 'pale_mark_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

// ---------------------------------------------------------------- the pump house

export const d_sk_pump_board: DialogueDef = {
  id: 'd_sk_pump_board', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'RELIEF PUMPING — THE SINK — PRECINCT WORKS. Three pumps, their hours in a grid, and a line ruled through the spring weeks for pumps 2 and 3: DIVERTED TO PRECINCT SUPPLY, AS PER PLAN (CL. 31, GROWTH). Beside each spring week somebody has pencilled a number in feet.',
      effects: [{ learn: 'sk_schedule_known' }, { lead: 'l_pumps_schedule' }],
      options: [
        { id: 'board.copy', text: '(Copy the schedule, clause and all.)', if: { not: { item: 'k_sk_schedule' } }, effects: [{ give: 'k_sk_schedule' }], next: 'copied' },
        { id: 'board.nine', text: 'Nine. Clause 14. The drains.', if: { all: [{ inParty: 'npc_md_nine' }, UNDECIDED] }, next: 'nine' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    copied: { text: 'Clause 31, in your own hand, with the feet beside it. It reads worse copied.', options: [{ id: 'board.nine.2', text: 'Nine. Clause 14. The drains.', if: { all: [{ inParty: 'npc_md_nine' }, UNDECIDED] }, next: 'nine' }, { text: '(Leave it.)', exit: true }] },
    nine: {
      text: 'The lens reads the board at the speed a machine reads, and then the pencilled feet at the speed a person does. "Clause 31: growth. Clause 14: the drains are the city\'s first duty." A click. "The record suggests 14 outranks 31. The record has always suggested it. Nobody has asked the record." It opens its chest, which you did not know it could do, and a form comes out with its plate already pressed into it. "Variance. I am an assessor. Assessors vary." It hands it to you. "Give it to the keeper. The city will notice point six and I will note that it noticed."',
      effects: [{ give: 'k_sk_variance' }, { set: 'sk_pumps', value: 'paid' }, { set: 'sk_variance_nine' }, { approval: { companion: 'npc_md_nine', by: 15 } }, { xp: 150 }, { decision: { id: 'sk_variance_nine', text: 'Assessor Nine stamped a variance putting the Sink\'s drains before the Precinct\'s growth, because you asked it to.' } }],
      options: [{ text: '(Take it to the keeper.)', exit: true }],
    },
  },
};

export const d_sk_dial: DialogueDef = {
  id: 'd_sk_dial', owner: 'narrator',
  start: [{ if: { flag: 'sk_pumps' }, node: 'set' }, { if: { not: PUMP_ACCESS }, node: 'watched' }, { node: 'dial' }],
  nodes: {
    watched: {
      text: 'A warden has followed you in and stands in the dial room\'s door with his hand on nothing in particular. "Out." Dagny Roos, at the panel, does not look up.',
      options: [
        { id: 'dial.sneak', text: '(Wait for the count, when the door is empty, and come back.)', check: { skill: 'stealth', dc: 35, mods: [{ if: NIGHT, dc: -10, why: 'one warden sleeps at the sandbags after midnight' }] }, next: 'sneak_ok', fail: 'sneak_no' },
        { text: '(Out.)', exit: true },
      ],
    },
    sneak_ok: { text: 'Twice a day the wardens walk the pad to count the shanties. The second time, the door is a door. You are in the dial room before the count reaches the raft.', effects: [{ set: 'sk_dial_sneak' }, { xp: 40 }], options: [{ text: '(The dial.)', next: 'dial' }] },
    sneak_no: { text: 'The count is shorter than you thought. "Out," the warden says again, from closer.', effects: [{ time: 30 }], options: [{ text: '(Out.)', exit: true }] },
    dial: {
      text: 'The relief dial: a pre-Burn panel with three brass levers and a wax seal over the spring stops, the Ledger\'s seal, cracked once already and mended. The levers read 1 — SINK, 2 — PRECINCT, 3 — PRECINCT. A log on a chain, in Dagny\'s hand, every day for eleven years.',
      effects: [{ learn: 'sk_dial_seen' }],
      options: [
        { id: 'dial.retime', text: '(Break the seal and retime pumps 2 and 3 to the Sink.)', if: UNDECIDED, check: { skill: 'mechanics', dc: 45, mods: [{ if: { skill: 'science', gte: 40 }, dc: -15, why: 'the stops are arithmetic, and you can do it' }, { if: { item: 'k_sk_leave' }, dc: -10, why: 'the keeper marked the stops for you on her leave' }] }, next: 'retime_ok', fail: 'retime_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    retime_ok: { text: 'The seal comes away like a scab. The stops are arithmetic: the spring weeks, the hours, the feet. You move two levers and the thud through the wall doubles, and then, after a minute, something under the floor changes pitch, which is the water deciding to go the other way. Dagny Roos comes to the door of the dial room and looks at the levers and at you and goes back to her panel without a word, and writes in the log, and what she writes is the time.', effects: [{ set: 'sk_pumps', value: 'retimed' }, { rep: { faction: 'wardens', respect: -5 } }, { xp: 140 }, { trust: { npc: 'npc_sk_03', by: 15 } }], options: [{ text: '(Leave it running.)', exit: true }] },
    retime_no: { text: 'The seal comes away and the first lever does not move and the second trips something, and a red lamp lights on the board outside, where the wardens are. You have a minute, perhaps, before the count comes early.', effects: [{ set: 'sk_dial_tripped' }, { rep: { faction: 'wardens', respect: -3 } }, { time: 15 }], options: [{ text: '(Out, fast.)', exit: true }] },
    set: { text: [{ if: { flag: 'sk_pumps', eq: 'retimed' }, text: 'The levers read 1 — SINK, 2 — SINK, 3 — SINK, under a broken seal. The log says the time and nothing else.' }, { if: { flag: 'sk_pumps', eq: 'paid' }, text: 'The levers read 1 — SINK, 2 — SINK, 3 — SINK. A variance is pinned over the seal with the clause number ringed. The log says the time and, under it, *Clause 14*.' }, { text: 'The levers read SINK, SINK, SINK, and the seal is on the floor, and a Pale kin sits on the keeper\'s stool with a gun across his knees while Dagny Roos works round him.' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_sk_dagny: DialogueDef = {
  id: 'd_sk_dagny', owner: 'npc_sk_03',
  start: [{ if: { flag: 'sk_fight_pumps' }, node: 'fight' }, { if: { item: 'k_sk_variance' }, node: 'variance' }, { if: { flag: 'sk_pumps' }, node: 'after' }, { if: { flag: 'dagny_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman at a panel with her sleeves rolled and a scar down one cheek the shape of a thrown wrench, who does not stop working to talk. "Dagny Roos. Keeper. Three pumps; I keep them running, I don\'t say where they run. The board outside says that. Read the board."',
      effects: [{ set: 'dagny_met' }, { learn: 'dagny_seen' }],
      options: [
        { id: 'dagny.schedule', text: 'The schedule. Spring.', next: 'schedule', once: true },
        { id: 'dagny.son', text: 'Roos, H. Spring before last. Stair.', if: { knows: 'sk_dagny_son' }, next: 'son', once: true },
        { id: 'dagny.leave', text: 'Let me at the dial.', if: { all: [{ knows: 'sk_schedule_known' }, { not: { flag: 'sk_pump_leave' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'sk_dagny_son_told' }, dc: -20, why: 'you said his name and she did not stop you' }, { if: { member: 'wardens' }, dc: -10, why: 'a card she has to answer to' }] }, next: 'leave_ok', fail: 'leave_no' },
        { id: 'dagny.variance', text: '(Show her the variance.) Clause 14.', if: { item: 'k_sk_variance' }, next: 'variance' },
        bye,
      ],
    },
    again: { text: '"Keeper." The panel.', options: [{ id: 'dagny.schedule.again', text: 'The schedule.', if: { not: { seen: 'dagny.schedule' } }, next: 'schedule' }, { id: 'dagny.son.again', text: 'Roos, H. Spring before last.', if: { all: [{ knows: 'sk_dagny_son' }, { not: { seen: 'dagny.son' } }] }, next: 'son' }, { id: 'dagny.leave.again', text: 'Let me at the dial.', if: { all: [{ knows: 'sk_schedule_known' }, { not: { flag: 'sk_pump_leave' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'sk_dagny_son_told' }, dc: -20, why: 'you said his name and she did not stop you' }, { if: { member: 'wardens' }, dc: -10, why: 'a card she has to answer to' }] }, next: 'leave_ok', fail: 'leave_no' }, { id: 'dagny.variance.again', text: '(Show her the variance.)', if: { item: 'k_sk_variance' }, next: 'variance' }, bye] },
    schedule: { text: '"Three pumps. All three the Sink\'s, forty weeks of the year. Twelve weeks — the spring — two of them go to the Precinct\'s supply. Clause 31. Growth." She says the clause like a brand name. "I\'ve kept them eleven springs. I\'ve pencilled the feet beside every week. Nobody up the stair has read the feet. Read the board; it\'s the same board."', effects: [{ learn: 'sk_schedule_known' }, { lead: 'l_pumps_schedule' }], options: [bye] },
    son: { text: 'The wrench stops. "Hal. Sixteen. He was quick on the stair, usually." She puts the wrench down with care. "The year they ruled the line through two and three, the water came a hand higher than my feet said, and the stair was a river for an hour. I kept the pumps that spring. I keep them every spring. You want to know why." It is not a question. "Because if I don\'t, somebody who didn\'t lose anybody will."', effects: [{ learn: 'sk_dagny_son_told' }, { trust: { npc: 'npc_sk_03', by: 15 } }], options: [{ id: 'dagny.son.leave', text: 'Then let me at the dial.', if: { not: { flag: 'sk_pump_leave' } }, next: 'leave_ok' }, bye] },
    leave_ok: { text: 'She tears a corner off the log and writes on it against the panel. "Bearer may enter the house. The wardens may argue with me." She does not hand it to you; she leaves it on the panel for you to take. "I didn\'t see you go in. I\'ve marked the spring stops on the back. Don\'t touch pump one; pump one is mine."', effects: [{ give: 'k_sk_leave' }, { set: 'sk_pump_leave' }, { trust: { npc: 'npc_sk_03', by: 10 } }, { xp: 60 }], options: [bye] },
    leave_no: { text: '"I keep them. I don\'t set them. The board\'s outside and the wardens are beside it." The wrench starts again.', options: [bye] },
    variance: { text: 'She reads it twice, the second time with her finger under the clause. "Fourteen." Then she walks into the dial room with the paper in her fist and does a thing she has not done in eleven years, which is reach past the seal and move two levers herself. The thud through the wall doubles. She pins the variance over the seal, writes the time in the log, and under it, the clause. "The drains," she says, to the panel. "Tell whoever signed it that the keeper read it."', effects: [{ take: 'k_sk_variance' }, { set: 'sk_variance_applied' }, { set: 'dagny_met' }, { trust: { npc: 'npc_sk_03', by: 25 } }, { xp: 40 }], options: [{ text: '(Leave her to it.)', exit: true }] },
    after: { text: [{ if: { flag: 'sk_pumps', eq: 'paid' }, text: '"A variance." She has it pinned over the seal. "Eleven years I\'ve wanted a piece of paper. I\'ll tell Hal, when I\'m on the wall."' }, { if: { flag: 'sk_pumps', eq: 'retimed' }, text: '"Somebody retimed my pumps." She does not look at you. "I\'ve told the wardens I don\'t know who. Which is nearly true. The log says the time."' }, { text: '"The Pale have the house. They let me keep the pumps; the pumps are the only thing in it they don\'t understand." She wipes her hands. "The Precinct will come. I\'ll be at the panel when it does."' }], options: [bye] },
    fight: { text: 'She is under the panel with her arms over her head and the pumps still running.', options: [{ text: '(Leave her.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the tally keeper, the raft, the shanties, the runner

export const d_sk_lusk: DialogueDef = {
  id: 'd_sk_lusk', owner: 'npc_sk_04',
  start: [{ if: { flag: 'lusk_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old woman at a table under the wall of names with a tin of chalk and a kettle, who looks at you the way the wall does. "Mother Lusk. I keep the tally. Name, year, where the water took them. Chalk\'s a Toll; names are free. You\'re not from down here or you\'d know which you wanted."',
      effects: [{ set: 'lusk_met' }, { learn: 'lusk_seen' }],
      options: [
        { id: 'lusk.line', text: 'The line on the pier. Who goes on the wall?', next: 'line', once: true },
        { id: 'lusk.numbers', text: 'The numbers beside the names. The Precinct\'s kind.', if: { knows: 'sk_tally_numbers' }, next: 'numbers', once: true },
        { id: 'lusk.who', text: 'Who runs the Sink?', next: 'who', once: true },
        bye,
      ],
    },
    again: { text: '"Chalk\'s a Toll."', options: [{ id: 'lusk.line.again', text: 'Who goes on the wall?', if: { not: { seen: 'lusk.line' } }, next: 'line' }, { id: 'lusk.numbers.again', text: 'The numbers beside the names.', if: { all: [{ knows: 'sk_tally_numbers' }, { not: { seen: 'lusk.numbers' } }] }, next: 'numbers' }, { id: 'lusk.who.again', text: 'Who runs the Sink?', if: { not: { seen: 'lusk.who' } }, next: 'who' }, bye] },
    line: { text: '"The ones who can\'t climb a stair fast with the water on it. The old. The small. The ones with the wet in their chest who stop to breathe on the fifth step." She counts chalk. "Twelve years ago the pumps kept it to the knee. Then the Precinct wanted growth, and two pumps, and the stair\'s a river for an hour each spring. An hour\'s enough. Read the wall; it\'s mostly STAIR."', effects: [{ learn: 'sk_line_who' }, { learn: 'sk_dagny_son' }], options: [bye] },
    numbers: { text: 'She does not pretend. "The dead don\'t need a number. The living up the stair sometimes do: someone the lens hasn\'t seen, with a card that says they\'re someone it has. A man in the market pays four Tolls a number every spring. It buys chalk for a year." She looks at the wall. "They\'d have wanted to be useful. Most of them were."', effects: [{ lead: 'l_sink_numbers' }, { learn: 'sk_lusk_sells' }], options: [{ id: 'lusk.numbers.judge', text: 'You sell the drowned.', next: 'judge' }, { id: 'lusk.numbers.ok', text: 'Useful is better than filed.', effects: [{ trust: { npc: 'npc_sk_04', by: 10 } }], next: 'useful' }, bye] },
    judge: { text: '"I sell a number the city gave them and never used. The city sold them the water." She puts the chalk down. "Chalk\'s a Toll. Judging\'s free, and I\'ve heard it."', effects: [{ trust: { npc: 'npc_sk_04', by: -5 } }], options: [bye] },
    useful: { text: '"That\'s what I say. On the bad nights."', options: [bye] },
    who: { text: '"Nobody. That\'s the Sink\'s whole constitution." She counts on her fingers. "The Pale, east, by fear; they take the walk and what\'s owed and they\'ll take no chrome near them. Ocho, south, by kindness, which is slower. Vash, by appetite. The Precinct, by the pumps, from above, which is the only one of them that counts." The fifth finger stays down. "And me, by chalk."', effects: [{ learn: 'sk_who_runs' }, { learn: 'md_ocho_heard' }, { learn: 'pale_seen' }], options: [bye] },
  },
};

export const d_sk_jory: DialogueDef = {
  id: 'd_sk_jory', owner: 'npc_sk_08',
  start: [{ if: { flag: 'jory_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man on a raft of doors lashed to drums, with a pole and a beard that has been in the water as often as the raft. "Jory. I pole the deep bit. Raft takes two; takes one and a box. Two Tolls across to the clinic, which saves your boots and the third board of the walk, which is gone."',
      effects: [{ set: 'jory_met' }],
      options: [
        { id: 'jory.cross', text: 'Across to the clinic. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_sink', spawn: 'clinic', minutes: 10 } }], exit: true },
        { id: 'jory.under', text: 'What\'s under the water?', next: 'under', once: true },
        bye,
      ],
    },
    again: { text: '"Two across."', options: [{ id: 'jory.cross.again', text: 'Across to the clinic. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_sink', spawn: 'clinic', minutes: 10 } }], exit: true }, { id: 'jory.under.again', text: 'What\'s under the water?', if: { not: { seen: 'jory.under' } }, next: 'under' }, bye] },
    under: { text: '"Streets. Shops with the glass still in. Cars." He looks at the water, which does not look back. "Found a car under where the clinic is, the year the line went up two hands. Family in it, belted. They\'d driven down here when the road was a road and the water came up quicker than their doors." He poles. "Mother Lusk has them on the wall. No names; I gave her the plate number."', effects: [{ learn: 'sk_jory_car' }], options: [bye] },
  },
};

export const d_sk_ailsa: DialogueDef = {
  id: 'd_sk_ailsa', owner: 'npc_sk_09',
  start: [{ if: { flag: 'ailsa_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in a shanty door on stilts, breathing with a whistle in it. "Ailsa. Don\'t mind the whistle; it\'s Ocho\'s lungs, and they\'re better than mine were." She nods at the water under her floor. "You\'re new. Everyone\'s new once. Then you\'re on the wall or you\'re me."',
      effects: [{ set: 'ailsa_met' }],
      options: [
        { id: 'ailsa.wall', text: 'Who\'s on the wall of yours?', next: 'wall', once: true },
        { id: 'ailsa.lungs', text: 'Ocho fitted you lungs. For what?', next: 'lungs', once: true },
        bye,
      ],
    },
    again: { text: '"Mind the third board."', options: [{ id: 'ailsa.wall.again', text: 'Who\'s on the wall of yours?', if: { not: { seen: 'ailsa.wall' } }, next: 'wall' }, { id: 'ailsa.lungs.again', text: 'The lungs.', if: { not: { seen: 'ailsa.lungs' } }, next: 'lungs' }, bye] },
    wall: { text: '"My Davey. Spring before last. Stair." She says it like a street address. "Same spring as the keeper\'s boy, Hal Roos. She keeps the pumps that drowned him. I used to think that was a hard thing. Now I think it\'s the only thing."', effects: [{ learn: 'sk_dagny_son' }], options: [bye] },
    lungs: { text: '"For a bowl of soup a week, which I bring, and he doesn\'t eat. Free means free; he\'ll tell you. Dark chrome, Mender-made, no leash on it, no number." She breathes, whistling. "What it costs is him. Look at him when you go down. He hasn\'t slept since the line went up."', effects: [{ learn: 'md_ocho_heard' }, { learn: 'menders_code_heard' }], options: [bye] },
  },
};

export const d_sk_kye: DialogueDef = {
  id: 'd_sk_kye', owner: 'npc_sk_10',
  start: [{ if: { flag: 'kye_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy leaning on the shelf wall with his hands in his pockets and his eyes on everyone\'s. "Run anything. Two Tolls. Not east." He looks you over for weight. "Vash pays by the pound. I don\'t ask of what."',
      effects: [{ set: 'kye_met' }],
      options: [
        { id: 'kye.box', text: 'Vash\'s cold box. Where does it fill from?', check: { skill: 'speech', dc: 25, mods: [{ if: { item: 'c_fruit' }, dc: -25, why: 'fruit, down here, is a bribe' }, { if: { item: 'tolls', count: 5 }, dc: -10, why: 'you have Tolls showing' }] }, next: 'box_ok', fail: 'box_no' },
        bye,
      ],
    },
    again: { text: '"Not east."', options: [{ id: 'kye.box.again', text: 'Vash\'s cold box. Where does it fill from?', if: { not: { lead: 'l_pale_harvest' } }, check: { skill: 'speech', dc: 25, mods: [{ if: { item: 'c_fruit' }, dc: -25, why: 'fruit, down here, is a bribe' }, { if: { item: 'tolls', count: 5 }, dc: -10, why: 'you have Tolls showing' }] }, next: 'box_ok', fail: 'box_no' }, bye] },
    box_ok: { text: 'He looks east, which he has told you not to go. "The Pale. Man owed them, last week — Oduya\'s cousin, the other Oduya. They took him off the walk and he walked back lighter and Vash\'s box was full by dark." He shrugs with one shoulder. "I ran the box. Didn\'t ask. It was heavy for the size."', effects: [{ lead: 'l_pale_harvest' }, { learn: 'sk_pale_harvest' }, { xp: 30 }], options: [bye] },
    box_no: { text: '"Not east," he says, "and not that."', options: [bye] },
  },
};

// ---------------------------------------------------------------- the cold box

export const d_sk_vash: DialogueDef = {
  id: 'd_sk_vash', owner: 'npc_sk_05',
  start: [{ if: { flag: 'vash_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A neat man behind a counter in a container lit green from a cold box, with scales and a ledger and no smell at all, which is the thing you notice. "Vash. Anything that was ever warm, fair price, no questions, which is also a price." He weighs you with his eyes and writes nothing down. "Buying, or selling?"',
      effects: [{ set: 'vash_met' }, { learn: 'vash_seen' }],
      options: [
        { id: 'vash.heart', text: 'A heart. For Ocho\'s patient.', if: { all: [{ knows: 'sk_organ_needed' }, { not: { flag: 'sk_heart_bought' } }] }, next: 'heart' },
        { id: 'vash.where', text: 'Where does the box fill from?', next: 'where', once: true },
        { text: 'Show me.', effects: [{ event: 'barter' }], exit: true },
        bye,
      ],
    },
    again: { text: '"Buying, or selling?"', options: [{ id: 'vash.heart.again', text: 'A heart. For Ocho\'s patient.', if: { all: [{ knows: 'sk_organ_needed' }, { not: { flag: 'sk_heart_bought' } }] }, next: 'heart' }, { id: 'vash.where.again', text: 'Where does the box fill from?', if: { not: { seen: 'vash.where' } }, next: 'where' }, { text: 'Show me.', effects: [{ event: 'barter' }], exit: true }, bye] },
    heart: {
      text: '"A heart." He opens the cold box, which breathes out, and takes out a steel tin the size of a lunch and sets it on the scales, and the scales agree with him. "Chilled this week. A hundred and fifty. Ocho won\'t buy from me and he\'ll fit what you bring him, and he\'ll ask, and you\'ll say the water." A bag inside with a number inked on it, crossed out.',
      passives: [{ attr: 'senses', dc: 8, text: 'The ink of the crossing-out is fresh. Things the water takes do not have their numbers crossed out; they have them chalked on a wall.', effects: [{ learn: 'sk_heart_number' }] }],
      options: [
        { id: 'vash.heart.pay', text: '(Pay. 150 Tolls)', if: { item: 'tolls', count: 150 }, effects: [{ take: 'tolls', count: 150 }, { give: 'k_sk_heart' }, { set: 'sk_heart_bought' }], next: 'sold' },
        { id: 'vash.heart.low', text: 'A hundred and ten, and I don\'t say the water. I say nothing.', if: { item: 'tolls', count: 110 }, check: { skill: 'barter', dc: 40 }, next: 'low_ok', fail: 'low_no' },
        { text: 'Not today.', exit: true },
      ],
    },
    low_ok: { text: '"Nothing is cheaper than the water. A hundred and ten." The tin comes across with the ice already weeping at its corners.', effects: [{ take: 'tolls', count: 110 }, { give: 'k_sk_heart' }, { set: 'sk_heart_bought' }, { xp: 30 }], options: [{ text: '(Take it.)', next: 'sold' }] },
    low_no: { text: '"A hundred and fifty. The ice is mine too."', options: [{ id: 'vash.heart.pay2', text: '(Pay. 150 Tolls)', if: { item: 'tolls', count: 150 }, effects: [{ take: 'tolls', count: 150 }, { give: 'k_sk_heart' }, { set: 'sk_heart_bought' }], next: 'sold' }, { text: 'Not today.', exit: true }] },
    sold: { text: '"Keep it cold. Keep it quick. Tell him the water."', effects: [{ learn: 'sk_vash_sold' }], options: [bye] },
    where: { text: '"The water." He says it the way the board says *as per Plan*. "Every spring the water takes thirty people and gives back what it doesn\'t want. I keep what it doesn\'t want cold. That\'s a service." He closes the ledger. "The rest of the year, people bring me things. I don\'t ask. Ask Kye; Kye runs the box and asks nothing, which is why he runs it."', effects: [{ learn: 'sk_vash_water' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the clinic

export const d_sk_tam: DialogueDef = {
  id: 'd_sk_tam', owner: 'npc_sk_07',
  start: [{ if: { flag: 'sk_organ_fitted' }, node: 'after' }, { if: { flag: 'tam_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big man on a cot made small by sitting very still. "Tam. Oduya." He breathes between the names. "Pumped the Sink for the Precinct eleven years. The wet got in. Ocho says it skips." He listens to it. "It skips."',
      effects: [{ set: 'tam_met' }, { learn: 'ocho_tam' }],
      options: [
        { id: 'tam.heart', text: 'If a heart came. From the Pale. Off somebody who owed them.', if: { lead: 'l_pale_harvest' }, next: 'heart', once: true },
        { id: 'tam.cousin', text: 'The other Oduya. Your cousin.', if: { knows: 'sk_pale_harvest' }, next: 'cousin', once: true },
        bye,
      ],
    },
    again: { text: '"It skips."', options: [{ id: 'tam.heart.again', text: 'If a heart came from the Pale.', if: { all: [{ lead: 'l_pale_harvest' }, { not: { seen: 'tam.heart' } }] }, next: 'heart' }, { id: 'tam.cousin.again', text: 'Your cousin.', if: { all: [{ knows: 'sk_pale_harvest' }, { not: { seen: 'tam.cousin' } }] }, next: 'cousin' }, bye] },
    heart: { text: 'He does not take long. "I\'d take it from the Ledger itself." He looks at his hands. "Ocho won\'t like it. Tell Ocho I said. Tell him the Code says I decide."', effects: [{ set: 'sk_tam_yes' }, { learn: 'sk_tam_yes' }], options: [bye] },
    cousin: { text: '"Mal." The heart skips; you can see it in his neck. "Owed the Pale for a winter\'s coal. Walked back off the east bank lighter, Kye says. He\'s alive. He\'s a kidney down and alive, in the shanty by the raft." He closes his eyes. "Everyone down here is a piece of somebody."', effects: [{ learn: 'sk_mal_alive' }], options: [bye] },
    after: { text: [{ if: { flag: 'sk_organ_how', eq: 'chrome' }, text: '"It ticks." He puts a hand flat on his chest and smiles with half his face. "I can live with ticking."' }, { text: '"It doesn\'t skip." He says it like a man reading a notice he does not believe yet. "It doesn\'t skip."' }], options: [bye] },
  },
};

export const d_sk_pell: DialogueDef = {
  id: 'd_sk_pell', owner: 'npc_sk_02',
  start: [{ if: { flag: 'pell_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young woman with her sleeves tied back and her hands red from boiled water. "Pell. Apprentice. Don\'t touch the shelf; everything on it\'s clean and nothing else down here is." She looks at the cots. "If you\'re sick, sit. If you\'re not, he\'ll find you something to hold."',
      effects: [{ set: 'pell_met' }],
      options: [
        { id: 'pell.tam', text: 'The big man on the end cot.', next: 'tam', once: true },
        { id: 'pell.code', text: 'The Code. The thing on the board.', next: 'code', once: true },
        bye,
      ],
    },
    again: { text: '"Don\'t touch the shelf."', options: [{ id: 'pell.tam.again', text: 'The big man on the end cot.', if: { not: { seen: 'pell.tam' } }, next: 'tam' }, { id: 'pell.code.again', text: 'The Code.', if: { not: { seen: 'pell.code' } }, next: 'code' }, bye] },
    tam: { text: '"Tam. Heart. The wet gets into the pump-hands first; they stand in it." She lowers her voice. "He needs a new one and Ocho won\'t buy from Vash, and Vash is the only cold box in Meridian that isn\'t the Concern\'s. So Tam sits. Ask Ocho. He\'ll say it plainer than I can."', effects: [{ learn: 'ocho_tam' }], options: [bye] },
    code: { text: '"Fit only what the patient can bear. That\'s the whole of it; the rest is how." She counts on red fingers. "No leash — nothing that phones home. Dark chrome, Mender-made, or old, never Concern. The patient decides. And free means free, which is his, not the Code\'s, and it\'s killing him." She picks up a cloth. "Two years I\'ve held the lamp. He says the hands come in the third."', effects: [{ learn: 'menders_code_heard' }], options: [bye] },
  },
};

export const d_sk_ocho: DialogueDef = {
  id: 'd_sk_ocho', owner: 'npc_sk_01',
  start: [{ if: { flag: 'ocho_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man of sixty at a scrubbed table under a sodium lamp, washing to the elbow in a basin that steams. One of his hands is chrome, old chrome, a surgeon\'s hand; the other is his and shakes very slightly until he puts it in the water. "Ocho. Sit if you\'re sick. Hold something if you\'re not." He does not ask your name. "Free. Before you ask. Free means free."',
      effects: [{ set: 'ocho_met' }, { learn: 'ocho_seen' }, { learn: 'md_ocho_heard' }],
      passives: [{ attr: 'senses', dc: 7, text: 'The chrome hand is a Gyro Hand, pre-Burn, and the arm it is fitted to has a Mender\'s scar round it, not a clinic\'s. He fitted it himself, or someone like him did.', effects: [{ learn: 'ocho_hand' }] }],
      options: [
        { id: 'ocho.free', text: 'Free. What does it cost you?', next: 'free', once: true },
        { id: 'ocho.tam', text: 'Tam Oduya. The heart.', if: { knows: 'ocho_tam' }, next: 'tam', once: true },
        { id: 'ocho.fit', text: 'I\'ve a piece to fit. Or one to look at.', effects: [{ event: 'surgery' }], exit: true },
        { id: 'ocho.teach', text: 'Teach me.', if: { not: { member: 'menders' } }, next: 'teach' },
        { id: 'ocho.heart', text: '(Put the cooler on the table.)', if: { all: [{ item: 'k_sk_heart' }, { quest: 'q_sk_organ' }, { not: { flag: 'sk_organ_fitted' } }] }, next: 'where' },
        { id: 'ocho.chrome', text: '(Put the boxed Second Heart on the table.)', if: { all: [{ item: 'ci_ch_org_heart' }, { quest: 'q_sk_organ' }, { not: { flag: 'sk_organ_fitted' } }] }, next: 'chrome' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'sk_organ_fitted' }, text: '"Sit or hold." He is washing. Tam\'s cot has Tam sitting up on it.' }, { text: '"Sit or hold."' }],
      options: [
        { id: 'ocho.free.again', text: 'What does free cost you?', if: { not: { seen: 'ocho.free' } }, next: 'free' },
        { id: 'ocho.tam.again', text: 'Tam Oduya. The heart.', if: { all: [{ knows: 'ocho_tam' }, { not: { seen: 'ocho.tam' } }, { not: { flag: 'sk_organ_fitted' } }] }, next: 'tam' },
        { id: 'ocho.fit.again', text: 'I\'ve a piece to fit. Or one to look at.', effects: [{ event: 'surgery' }], exit: true },
        { id: 'ocho.teach.again', text: 'Teach me.', if: { not: { member: 'menders' } }, next: 'teach' },
        { id: 'ocho.heart.again', text: '(Put the cooler on the table.)', if: { all: [{ item: 'k_sk_heart' }, { quest: 'q_sk_organ' }, { not: { flag: 'sk_organ_fitted' } }] }, next: 'where' },
        { id: 'ocho.chrome.again', text: '(Put the boxed Second Heart on the table.)', if: { all: [{ item: 'ci_ch_org_heart' }, { quest: 'q_sk_organ' }, { not: { flag: 'sk_organ_fitted' } }] }, next: 'chrome' },
        bye,
      ],
    },
    free: { text: '"Sleep." He says it flatly, drying the chrome hand, which does not need drying. "And the pieces. Kuhn sells me what she can\'t sell up the stair, and the Wheel brings old chrome down in boxes, and I fit it into people who\'d otherwise be on the wall, and I don\'t charge, and so I have nothing, and so I can\'t buy the one thing I need, which is a heart, for a man who pumped for the Precinct eleven years." He looks at the end cot. "That\'s what free costs. Sit or hold."', effects: [{ learn: 'ocho_free_cost' }, { learn: 'ocho_tam' }], options: [{ id: 'ocho.free.tam', text: 'Tam. The heart.', if: { not: { seen: 'ocho.tam' } }, next: 'tam' }, bye] },
    tam: {
      text: '"A heart. His is drowning in him." He wipes the table that is already clean. "I can fit a real one, if it comes through that door cold and quick. I can fit a Second Heart, dark chrome, if one comes through it in a box; Kuhn had one, once, and Vash has one now at a price that is a joke with a number in it." He puts both hands flat. "I won\'t buy from Vash. Vash buys from the water, he says. The water doesn\'t cross out numbers."',
      effects: [{ quest: 'q_sk_organ', start: true }, { learn: 'sk_organ_needed' }],
      options: [{ id: 'ocho.tam.why', text: 'Then let me bring one. You don\'t ask me where.', next: 'tam_ask' }, bye],
    },
    tam_ask: { text: '"I\'ll ask." He is not angry; he is tired. "The Code says the patient decides. It doesn\'t say I keep my mouth shut. Bring it. I\'ll ask. Tam will answer. That\'s the order of it."', options: [bye] },
    teach: {
      text: [{ if: { flag: 'sk_organ_fitted' }, text: '"You held a clamp once." He looks at your hands. "Hold one again, steadier, and I\'ll say the words."' }, { text: '"I don\'t take apprentices. I take hands." He nods at Pell. "Two years she\'s held the lamp. Hold a clamp through one fitting without it shaking and I\'ll say the words over you, and they\'re the only words there are."' }],
      effects: [{ quest: 'q_sk_code', start: true }],
      options: [
        { id: 'ocho.teach.now', text: '(Hold out your hands.) Try me on the next one.', if: { flag: 'sk_organ_fitted' }, check: { skill: 'medicine', dc: 35, mods: [{ if: { chrome: 'ch_arm_steady' }, dc: -20, why: 'your hand does not shake' }, { if: { attr: 'grit', gte: 8 }, dc: -5, why: 'steady' }] }, next: 'words', fail: 'shake' },
        bye,
      ],
    },
    where: {
      text: 'He opens the tin and looks for a long moment at the bag inside, at the number on it, at the ink through the number. "Where did this come from?"',
      effects: [{ learn: 'ocho_asked' }],
      options: [
        { id: 'where.vash', text: 'Vash. He says the water.', if: { flag: 'sk_heart_bought' }, next: 'where_truth' },
        { id: 'where.pale', text: 'The Pale\'s cold store. Off a man who owed them. He\'s alive.', if: { any: [{ lead: 'l_pale_harvest' }, { flag: 'unlocked:md_sink/sk_cold' }] }, next: 'where_truth' },
        { id: 'where.lie', text: 'Under the water. Jory found a car.', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'sk_jory_car' }, dc: -15, why: 'there is a car, and Jory would say so' }] }, next: 'where_lie', fail: 'where_caught' },
        { id: 'where.nothing', text: '(Say nothing.)', next: 'where_truth' },
      ],
    },
    where_truth: { text: [{ if: { flag: 'sk_tam_yes' }, text: '"The Pale." He closes the tin. "Tam already told me he\'d take it from the Ledger itself. He said the Code says he decides. He\'s right, and I taught him that, and I wish I hadn\'t." He washes. "Clamp."' }, { text: '"The Pale, then, by the ink, whoever you say." He goes to the end cot and crouches and says something to Tam, and Tam says one word back before the sentence is finished, and Ocho stands up older. "The Code says the patient decides." He washes. "Clamp."' }], effects: [{ trust: { npc: 'npc_sk_01', by: -5 } }, { learn: 'sk_organ_pale_told' }], options: [{ text: '(The clamp.)', next: 'fit_heart' }] },
    where_lie: { text: '"A car." He looks at the tin again, and then not. "Jory would say so." He washes. "Clamp."', effects: [{ set: 'sk_organ_lied' }, { memory: { npc: 'npc_sk_01', tag: 'lied_heart', valence: -20, strength: 70 } }], options: [{ text: '(The clamp.)', next: 'fit_heart' }] },
    where_caught: { text: '"A car." He does not raise his voice. "Cars don\'t cross out numbers." He goes to the end cot, and crouches, and asks, and comes back older. "The patient decides. I\'ll fit it. I\'ll remember you said a car." He washes. "Clamp."', effects: [{ trust: { npc: 'npc_sk_01', by: -15 } }, { memory: { npc: 'npc_sk_01', tag: 'lied_heart', valence: -30, strength: 80 } }, { learn: 'sk_organ_pale_told' }], options: [{ text: '(The clamp.)', next: 'fit_heart' }] },
    chrome: { text: '"Dark. Mender-made. No leash." He turns the box over and reads the Mender\'s mark on it with his thumb. "He can bear it. He\'s borne the Precinct eleven years." He washes. "Clamp. Pell, the lamp."', options: [{ text: '(The clamp.)', next: 'fit_chrome' }] },
    fit_heart: {
      text: 'An hour under the sodium lamp with the Sink dripping on the roof. The chrome hand does not shake; the other one he keeps out of it. Pell holds the lamp. You hold the clamp, which holds the thing that is keeping Tam Oduya alive while the other thing is taken out of him.',
      options: [{ id: 'fit.clamp.heart', text: '(Hold it steady.)', check: { skill: 'medicine', dc: 30, mods: [{ if: { chrome: 'ch_arm_steady' }, dc: -20, why: 'your hand does not shake' }, { if: { attr: 'grit', gte: 8 }, dc: -5, why: 'steady' }, { if: { attr: 'reflex', gte: 8 }, dc: -5, why: 'quick when it matters' }] }, next: 'done_heart', fail: 'pell_heart' }],
    },
    fit_chrome: {
      text: 'An hour under the sodium lamp with the Sink dripping on the roof. Dark chrome goes in differently: a frame, a seat, the box\'s contents clicking into the seat like a cartridge. The chrome hand does not shake. Pell holds the lamp. You hold the clamp.',
      options: [{ id: 'fit.clamp.chrome', text: '(Hold it steady.)', check: { skill: 'medicine', dc: 30, mods: [{ if: { chrome: 'ch_arm_steady' }, dc: -20, why: 'your hand does not shake' }, { if: { attr: 'grit', gte: 8 }, dc: -5, why: 'steady' }, { if: { attr: 'reflex', gte: 8 }, dc: -5, why: 'quick when it matters' }] }, next: 'done_chrome', fail: 'pell_chrome' }],
    },
    done_heart: { text: 'It beats. Ocho watches it beat for a count of twenty, which is the longest you have seen him be still, and then closes, and washes, and says to the table, not to you: "Fit only what the patient can bear." Pell, with the lamp, says, "He said the words." Ocho says, "I said the words. Wash your hands, apprentice. Everything down here is dirty."', effects: [{ take: 'k_sk_heart' }, { set: 'sk_organ_fitted' }, { set: 'sk_organ_how', value: 'heart' }, { enlist: 'menders', rank: 'apprentice' }, { set: 'sk_code_joined' }, { trust: { npc: 'npc_sk_01', by: 20 } }, { xp: 150 }, { decision: { id: 'sk_organ_fitted', text: 'You held the clamp while Ocho gave Tam Oduya a new heart, and Ocho said the Menders\' words over you.' } }], options: [{ text: '(Wash.)', exit: true }] },
    done_chrome: { text: 'It ticks. Ocho listens to it tick for a count of twenty, and closes, and washes, and says to the table, not to you: "Fit only what the patient can bear." Pell, with the lamp, says, "He said the words." Ocho says, "I said the words. Wash your hands, apprentice. Everything down here is dirty."', effects: [{ take: 'ci_ch_org_heart' }, { set: 'sk_organ_fitted' }, { set: 'sk_organ_how', value: 'chrome' }, { enlist: 'menders', rank: 'apprentice' }, { set: 'sk_code_joined' }, { trust: { npc: 'npc_sk_01', by: 20 } }, { xp: 150 }, { decision: { id: 'sk_organ_fitted', text: 'You held the clamp while Ocho fitted Tam Oduya a Second Heart, and Ocho said the Menders\' words over you.' } }], options: [{ text: '(Wash.)', exit: true }] },
    pell_heart: { text: 'The clamp moves. Not much; enough. "Pell. Lamp to me, clamp to you." She takes it without a word and it does not move again. An hour later it beats, and Ocho watches it beat for a count of twenty, and washes. "He lives. You\'ll hold it steadier next time. There\'s always a next time down here."', effects: [{ take: 'k_sk_heart' }, { set: 'sk_organ_fitted' }, { set: 'sk_organ_how', value: 'heart' }, { trust: { npc: 'npc_sk_01', by: 10 } }, { xp: 100 }, { decision: { id: 'sk_organ_fitted', text: 'Ocho gave Tam Oduya a new heart; Pell held the clamp when yours shook.' } }], options: [{ text: '(Wash.)', exit: true }] },
    pell_chrome: { text: 'The clamp moves. Not much; enough. "Pell. Lamp to me, clamp to you." She takes it without a word and it does not move again. An hour later it ticks, and Ocho listens, and washes. "He lives. You\'ll hold it steadier next time. There\'s always a next time down here."', effects: [{ take: 'ci_ch_org_heart' }, { set: 'sk_organ_fitted' }, { set: 'sk_organ_how', value: 'chrome' }, { trust: { npc: 'npc_sk_01', by: 10 } }, { xp: 100 }, { decision: { id: 'sk_organ_fitted', text: 'Ocho fitted Tam Oduya a Second Heart; Pell held the clamp when yours shook.' } }], options: [{ text: '(Wash.)', exit: true }] },
    words: { text: 'A shanty woman with a hand crushed by a pump drum; a Gyro Hand from the Wheel\'s box, old chrome, the twin of his own. You hold the clamp and it does not move. He says the words over the table with her still open on it. "Fit only what the patient can bear." Then: "Wash your hands, apprentice."', effects: [{ enlist: 'menders', rank: 'apprentice' }, { set: 'sk_code_joined' }, { trust: { npc: 'npc_sk_01', by: 15 } }, { xp: 100 }, { time: 90 }, { decision: { id: 'sk_code_joined', text: 'Ocho said the Menders\' words over you at his table in the Sink.' } }], options: [{ text: '(Wash.)', exit: true }] },
    shake: { text: 'It moves. "Pell." She takes it. Afterwards he dries the chrome hand that does not need drying and says, "Next time," which down here is not a refusal.', effects: [{ time: 90 }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the Pale

export const d_sk_dray: DialogueDef = {
  id: 'd_sk_dray', owner: 'npc_sk_06',
  start: [
    { if: { flag: 'sk_fight_pale' }, node: 'fight' },
    { if: { all: [{ flag: 'sk_fight_pumps' }, { dead: 'npc_sk_w1' }, { dead: 'npc_sk_w2' }, UNDECIDED] }, node: 'won' },
    { if: { flag: 'sk_pumps', eq: 'seized' }, node: 'held' },
    { if: { flag: 'sk_fight_pumps' }, node: 'fighting' },
    { if: { flag: 'dray_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman in a container chair with skin the colour of the water and hair the colour of bone, who looks at your hands before your face. "You came past three of mine. Brave, or deaf." She does not get up. "Saskia Dray. The Pale. Show me your hands." You show her. "No chrome. Good. Keep it that way down here, or don\'t come down here."',
      effects: [{ set: 'dray_met' }, { learn: 'dray_seen' }, { learn: 'pale_seen' }],
      options: [
        { id: 'dray.pumps', text: 'The pumps. Spring. You want them.', if: { knows: 'sk_schedule_known' }, next: 'pumps', once: true },
        { id: 'dray.heart', text: 'There\'s a heart in your cold store with a number crossed out.', if: { lead: 'l_pale_harvest' }, next: 'heart', once: true },
        { id: 'dray.walk', text: 'Call yours off the walk. I come and go.', check: { skill: 'speech', dc: 30, mods: [{ if: { chrome: 'ch_arm_steady' }, dc: 40, why: 'she has seen your hand' }, { if: { chromeSlot: 'eyes' }, dc: 40, why: 'she has seen your eyes' }] }, next: 'walk_ok', fail: 'walk_no' },
        { id: 'dray.scald', text: 'The Scald. What was it?', next: 'scald', once: true },
        bye,
      ],
    },
    again: { text: '"Hands." You show her. "Good."', options: [{ id: 'dray.pumps.again', text: 'The pumps. Spring.', if: { all: [{ knows: 'sk_schedule_known' }, { not: { seen: 'dray.pumps' } }] }, next: 'pumps' }, { id: 'dray.seize', text: 'With me in front. Now.', if: { all: [{ seen: 'dray.pumps' }, UNDECIDED, { not: { flag: 'sk_fight_pumps' } }] }, next: 'seize' }, { id: 'dray.heart.again', text: 'The heart in your cold store.', if: { all: [{ lead: 'l_pale_harvest' }, { not: { seen: 'dray.heart' } }] }, next: 'heart' }, { id: 'dray.walk.again', text: 'Call yours off the walk.', if: { not: { flag: 'sk_pale_leave' } }, check: { skill: 'speech', dc: 30, mods: [{ if: { chrome: 'ch_arm_steady' }, dc: 40, why: 'she has seen your hand' }, { if: { chromeSlot: 'eyes' }, dc: 40, why: 'she has seen your eyes' }] }, next: 'walk_ok', fail: 'walk_no' }, { id: 'dray.scald.again', text: 'The Scald.', if: { not: { seen: 'dray.scald' } }, next: 'scald' }, bye] },
    pumps: { text: '"The pumps are ours by water. The Precinct has them by paper and two guns." She leans forward for the first time. "Twelve weeks a year they drown us for a number up the stair. I\'ve nine kin who\'ll go down the walk with me and two who\'ll come back. That\'s the arithmetic. I\'ve been waiting for someone to change it." She looks at your hands again. "You change arithmetic. I can see it on you."', effects: [{ learn: 'dray_wants_pumps' }], options: [{ id: 'dray.pumps.seize', text: 'With me in front. Now.', if: UNDECIDED, next: 'seize' }, { id: 'dray.pumps.other', text: 'There\'s paper that outranks their paper. Let me try it first.', next: 'paper' }, bye] },
    paper: { text: '"Paper." She sits back. "Try it. When it doesn\'t work, I\'m here. The water doesn\'t read."', options: [bye] },
    seize: { text: 'She stands. It is a different thing when she stands. "Then it\'s now." Three kin come off the fire without being called. "Two wardens, two guns, one door. Dagny stays alive; Dagny keeps the pumps. The rest is the walk\'s." She looks at you once more. "In front, you said."', effects: [{ set: 'sk_fight_pumps' }, { rep: { faction: 'pale', respect: 10 } }, { decision: { id: 'sk_pale_rising', text: 'You went down the stilt-walk with the Pale to take the pump house from the Precinct.' } }], options: [{ text: '(Go.)', exit: true }] },
    fighting: { text: '"The house. Go."', options: [{ text: '(Go.)', exit: true }] },
    won: { text: 'The pump house, with the Precinct\'s lamps still on it and nobody\'s wardens at the door. Saskia Dray stands in it with her hand on a pump like a woman touching a horse. "Ours by water. Now by the walk too." Dagny Roos is at the panel, alive, not looking at anyone. Dray does not thank you; she gives you something better, which is a nod from the Pale. "Keep your hands. Come east any time."', effects: [{ set: 'sk_pumps', value: 'seized' }, { set: 'sk_pale_leave' }, { rep: { faction: 'pale', respect: 20 } }, { rep: { faction: 'wardens', respect: -15, fear: 6 } }, { xp: 150 }], options: [{ text: '(Leave them to it.)', exit: true }] },
    held: { text: '"The house holds." She is on the pump pad now, most days, and the kin have moved the fire. "The Precinct will come. We\'ll be here. So will the water."', options: [bye] },
    heart: { text: '"He owed. He paid. He\'s alive — we\'re not animals; we took what he had two of." No shame in it; it is a ledger. "The box is Vash\'s by dark. This one he hasn\'t had yet." She watches you want it. "Eighty, and you take it from the cold store yourself, and you tell Ocho whatever you like."', options: [{ id: 'dray.heart.pay', text: '(Pay. 80 Tolls)', if: { all: [{ item: 'tolls', count: 80 }, { not: { flag: 'unlocked:md_sink/sk_cold' } }] }, effects: [{ take: 'tolls', count: 80 }, { set: 'unlocked:md_sink/sk_cold' }, { set: 'sk_heart_pale_paid' }, { set: 'sk_pale_leave' }], next: 'heart_paid' }, { id: 'dray.heart.no', text: 'Not from a living man.', effects: [{ rep: { faction: 'pale', respect: -2 } }], next: 'heart_no' }, bye] },
    heart_paid: { text: '"The store\'s open. Take the tin and nothing else." She sits back down. "And tell Ocho it was the water. He likes the water."', options: [bye] },
    heart_no: { text: '"Then sit with Tam while he drowns in his own chest and tell him about living men." She does not get up. "Go on. Clinic\'s south."', options: [bye] },
    walk_ok: { text: '"Come and go." She says it to the kin, not to you, and they sit back down. "You\'ve a face the water hasn\'t had. Keep it out of my cold store."', effects: [{ set: 'sk_pale_leave' }, { xp: 40 }], options: [bye] },
    walk_no: { text: '"No." The kin do not sit down. "Walk ends at the sandbags. It always did."', options: [bye] },
    scald: { text: '"Before the Burn finished burning, the city\'s chrome all woke up at once and did what it was told, and what it was told was *hold still*. Everyone with a leash in them stood in the street and held still and the fire came." She does not blink. "Our grandparents watched. We don\'t forget. No chrome, ever, and nobody with chrome among us, and we take it out of people who owe us, which is the same rule from the other end."', effects: [{ learn: 'pale_scald' }, { learn: 'scald_heard' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const SINK_DIALOGUES: DialogueDef[] = [d_sk_stair_sign, d_sk_tally, d_sk_mark, d_sk_clinic_sign, d_sk_vash_sign, d_sk_pale_sign, d_sk_pump_board, d_sk_dial, d_sk_dagny, d_sk_lusk, d_sk_jory, d_sk_ailsa, d_sk_kye, d_sk_vash, d_sk_tam, d_sk_pell, d_sk_ocho, d_sk_dray];
