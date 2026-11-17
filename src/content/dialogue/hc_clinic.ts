import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { ASH, ILYA, K, KES, KES_IN, NINE, ODILE, TAMSIN, WREN, bye, leave } from './hs_skirts';
import { CAR_UP, CLINIC_OUT, DAWIT_ALIVE, DAWIT_HOME, GOTO, I, MAZUR_OK, N, NILS_DOWN, NILS_ON_WARD, O, S, T, W, back } from './hc_halcyon';

/**
 * Floor nine of Halcyon's Clinic floors (B4b): Clinic Floor Nine (`q_hc_clinic`) and the far end of Spare Parts. The
 * recovery ward and its charts, Dr Qadir's office, the cold store, the service ward and the listening room inside it; the
 * people on the floor (Dr Qadir, the orderly Abena Asiedu, and, by what the player did in the Skirts, Dawit Mekonnen, Nils
 * Haber, Corwin Dysart, Dr Lisle) and the Saints' Listener. Every person harmed here is an adult. Story notes:
 * story/STORY_PLAN_SECRET.md, Build notes — B4 (B4b).
 */

const QADIR = 'npc_hc_05';
const CLINIC_OPEN: Cond = { not: { flag: 'hc_clinic' } };
const EXPOSED: Cond = { flag: 'hs_parts', eq: 'exposed' };

/** The ward emptied (by the player or by Dr Qadir): everyone it touches, and the news of it. */
const OUT_COMMON: Effect[] = [
  { set: 'hc_sleepers_down' }, { rep: { faction: 'concern', respect: -20 } }, { rep: { faction: 'the_shift', respect: 10 } },
  K(15), T(5), W(10), N(5), S(10), O(3), I(5), { xp: 200 },
  { news: { tag: 'hc_ward_out', text: 'the sleepers on Halcyon\'s floor nine came down the hill awake; some of them had been asleep for years', valence: 7, size: 8, at: 'skirts' } },
];
const FREED = (how: string): Effect[] => [
  { set: 'hc_clinic', value: 'freed' }, { set: 'hc_clinic_how', value: how },
  { decision: { id: 'hc_clinic', text: how === 'force' ? 'You emptied Halcyon\'s service ward by force, out through the concourse past the Clean.' : `You woke the sleepers on Halcyon's floor nine and took them down the hill by ${how === 'freight' ? 'the freight at two' : 'the gardeners\' tunnel at dawn'}.` } },
  ...OUT_COMMON,
];
const CLOSED: Effect[] = [
  { set: 'hc_clinic', value: 'closed' }, { decision: { id: 'hc_clinic', text: 'Dr Noor Qadir closed Halcyon\'s service ward with her own signature and sent its sleepers down the hill awake.' } }, ...OUT_COMMON,
];
const LEFT: Effect[] = [
  { set: 'hc_clinic', value: 'left' }, { set: 'hc_chart_open' }, { rep: { faction: 'concern', respect: 10 } },
  K(-15), T(-10), W(-10), S(-10), N(-5), O(-3),
  { decision: { id: 'hc_clinic', text: 'You left Halcyon\'s service ward as it was, and took Dr Qadir\'s offer: your chart open on nine for life.' } },
];
/** The same words twice: once carrying Joran Haber's boy down with the rest, once without him. */
function out(id: string, text: string, effects: Effect[], next: string, when?: Cond): OptionDef[] {
  return [
    { id, text, if: { all: [...(when ? [when] : []), NILS_ON_WARD] }, effects: [...effects, ...NILS_DOWN], next },
    { id: `${id}.x`, text, if: { all: [...(when ? [when] : []), { not: NILS_ON_WARD }] }, effects, next },
  ];
}

// ---------------------------------------------------------------- the floor's boards and rooms

export const d_hc_clinic_board: DialogueDef = {
  id: 'd_hc_clinic_board', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Clinic-white enamel by the lift: NINE. RECOVERY — FITTINGS — COLD STORE — SERVICE (STAFF). Under it a smaller plate, the kind people stop reading the second day: NOBODY ON THIS FLOOR IS DYING. PLEASE LOWER YOUR VOICE.',
      again: 'NOBODY ON THIS FLOOR IS DYING.',
      effects: [{ learn: 'hc_clinic_seen' }, { quest: 'q_hc_clinic', start: true }],
      options: [leave],
    },
  },
};

export const d_hc_charts: DialogueDef = {
  id: 'd_hc_charts', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The recovery ward: six beds by tall windows full of garden, and in them people in silk recovering from something, with flowers. A chart hangs at the foot of each bed. WRAY, C. — CORNEA (L), GRAFT — DONOR 9-0871 — RECOVERY GOOD. BENEDETTI, A. — MARROW — DONOR 9-1003 — RECOVERY GOOD. HALVERSON, A. — LUNG (R) — SKIN 400 SQ CM — DONOR 9-0412, 9-0977 — RECOVERY SLOW. Every donor number is a Weighhouse number. A woman in the end bed is laughing at something on a tray of cut fruit.',
      again: 'Board names, and against each a donor number off the service ward.',
      effects: [{ learn: 'hc_recipients' }, { lead: 'l_hc_recipients' }, { quest: 'q_hc_clinic', start: true }],
      interject: [
        { companion: KES, text: 'Kes doesn\'t look at the charts. She is looking at the door to the fitting suite next to the ward. "That room," she says. "That\'s where I came round. Sixteen." Her hand goes to the back of her neck and stays there.' },
        { companion: ODILE, text: 'Odile reads three charts in a row without speaking. "Recovery good," she says at last. "Do you know, my dear, I think that is the most obscene thing I have ever read, and I have read the guild\'s minutes."', effects: [O(-1)] },
      ],
      options: [leave],
    },
  },
};

export const d_hc_qadir_files: DialogueDef = {
  id: 'd_hc_qadir_files', owner: 'narrator', start: [{ if: { item: 'k_hc_renewal_list' }, node: 'taken' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'Dr Qadir\'s terminal, on a desk of real wood, its drawer locked. A list is printed and clipped to the drawer\'s front for the morning: SEASON\'S RENEWALS — BEFORE THE BALL.',
      again: 'Dr Qadir\'s locked drawer and her terminal.',
      options: [
        { id: 'qfiles.pick', text: '(Open the drawer and read her list properly.)', check: { skill: 'security', dc: 45 }, effects: [{ give: 'k_hc_renewal_list' }, { learn: 'hc_recipients' }, { learn: 'hc_nils_listed' }, { lead: 'l_hc_renewal' }], next: 'list', fail: 'list_no', once: true },
        leave,
      ],
    },
    list: {
      text: [
        { if: NILS_ON_WARD, text: 'A column of Board names, and against each a donor number off the service ward, and what is to be drawn. Most are a part: a kidney, a lobe, a stretch of skin. Against the Chair\'s, in pencil, in Dr Qadir\'s neat hand: HABER, N. — WHOLE — BEFORE THE BALL. Whole means all of him. Joran Haber\'s boy is twenty-two.' },
        { text: 'A column of Board names, and against each a donor number off the service ward, and what is to be drawn. Most are a part: a kidney, a lobe, a stretch of skin. Against the Chair\'s, in pencil: 9-1140 — WHOLE — BEFORE THE BALL. Whole means all of them.' },
      ],
      again: 'WHOLE — BEFORE THE BALL.',
      options: [leave],
    },
    list_no: { text: 'The drawer\'s lock is better than the desk deserves. You leave scratches on the wood and nothing else.', again: 'Scratches on the wood.', options: [leave] },
    taken: { text: 'The drawer, open and empty.', again: 'The empty drawer.', options: [leave] },
  },
};

export const d_hc_coldstore: DialogueDef = {
  id: 'd_hc_coldstore', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: EXPOSED, text: 'The cold store: a white room colder than any winter the Skirts remembers, steel cabinets floor to ceiling, each with a label in clean print. 9-0412 — L (PART) — MATCH 1 — HELD. 9-0977 — SKIN — HELD. And a whole column, top to bottom, one number: 9-1182 — C (R) — K (R) — L — H — MARROW — HELD. Everything worth keeping of Dawit Mekonnen is in this column. When the Skirts stopped sending, nine drew on what it had, and drew him to the end.' },
        { text: 'The cold store: a white room colder than any winter the Skirts remembers, steel cabinets floor to ceiling, each with a label in clean print. 9-0412 — L (PART) — MATCH 1 — HELD. 9-0977 — SKIN — HELD. 9-1182 — K (L) — MATCH 1 — HELD FOR RENEWAL. That is Dawit Mekonnen\'s left kidney, behind a steel door, waiting for a member of the Board who has not needed it yet.' },
      ],
      again: 'The cold store: numbers, letters, HELD.',
      effects: [{ learn: 'hc_cold_seen' }, { lead: 'l_hc_cold' }, { quest: 'q_hc_clinic', start: true }],
      interject: [
        { companion: WREN, text: 'Wren reads the labels with her lips moving, the way she reads the block\'s tally at Ninebridge. "They price you by the piece up here," she says. "Down there they at least sold us whole."', effects: [W(-2)] },
        { companion: NINE, text: 'Nine\'s lens moves down the column of numbers and stops. "The record counts people," it says. "This counts parts of them. I did not know a count could be crueller than mine."' },
        { companion: ASH, text: 'Ash puts his hand flat on a cabinet door, and takes it away, and looks at his palm. "Cold," he says. "They keep it so cold."' },
      ],
      options: [
        { id: 'cold.tag', text: '(Peel Dawit Mekonnen\'s label off its door.)', if: { not: { item: 'k_hc_coldtag' } }, once: true, effects: [{ give: 'k_hc_coldtag' }], next: 'tag' },
        leave,
      ],
    },
    tag: { text: 'It comes away with a small dry sound. White plastic, a number, a letter. You put it in your pocket and it is colder than the room.', again: 'A bare steel door.', options: [leave] },
  },
};

export const d_hc_warddoor: DialogueDef = {
  id: 'd_hc_warddoor', owner: 'narrator', start: [{ node: 'door' }],
  nodes: {
    door: {
      text: 'A wide white door at the end of the corridor with a lens beside it: SERVICE — STAFF. It is warm to stand near, and from behind it comes a sound you place after a moment: machines breathing, a great many of them, slowly, all at once.',
      again: 'SERVICE — STAFF, and the breathing behind it.',
      options: [
        { id: 'wd.abena', text: '(Abena lets you through.)', if: { flag: 'hc_abena_door' }, effects: [{ learn: 'hc_ward_seen' }, GOTO('hc_clinic', 'ward')], exit: true, repeat: true },
        { id: 'wd.qadir', text: '(The lens knows Dr Qadir has opened her floor to the designate.)', if: { all: [{ knows: 'hc_qadir_case' }, { not: { flag: 'hc_abena_door' } }] }, effects: [{ learn: 'hc_ward_seen' }, GOTO('hc_clinic', 'ward')], exit: true, repeat: true },
        { id: 'wd.kes', text: '(Kes looks at the lens.)', if: { all: [KES_IN, { not: { flag: 'hc_abena_door' } }, { not: { knows: 'hc_qadir_case' } }] }, effects: [{ learn: 'hc_ward_seen' }, K(-2), GOTO('hc_clinic', 'ward')], exit: true, repeat: true },
        { id: 'wd.pick', text: '(Work the lock under the lens.)', if: { all: [{ not: { flag: 'hc_abena_door' } }, { not: { knows: 'hc_qadir_case' } }, { not: { flag: 'hc_ward_picked' } }] }, check: { skill: 'security', dc: 45 }, effects: [{ set: 'hc_ward_picked' }], next: 'picked', fail: 'pick_no', once: true },
        { id: 'wd.picked', text: '(The lock you worked.)', if: { flag: 'hc_ward_picked' }, effects: [{ learn: 'hc_ward_seen' }, GOTO('hc_clinic', 'ward')], exit: true, repeat: true },
        leave,
      ],
    },
    picked: { text: 'The lens is very good. The lock under it is an old door\'s lock with a lens bolted on top, and it gives.', again: 'The lock, open.', options: [{ id: 'wd.picked.go', text: '(Go in.)', effects: [{ learn: 'hc_ward_seen' }, GOTO('hc_clinic', 'ward')], exit: true }] },
    pick_no: { text: 'The lock holds, and the lens beside it turns to look at your hands. Somewhere down the corridor a soft bell rings once. Nobody comes. Nobody needs to.', again: 'The lens, looking at your hands.', options: [leave] },
  },
};

export const d_hc_warddoor_in: DialogueDef = {
  id: 'd_hc_warddoor_in', owner: 'narrator', start: [{ node: 'door' }],
  nodes: {
    door: {
      text: 'The ward door from inside. No lens on this side. Nobody on this side was ever expected to want to open it.',
      again: 'The ward door.',
      options: [{ id: 'wdi.out', text: '(Out to the corridor.)', effects: [GOTO('hc_clinic', 'corridor')], exit: true, repeat: true }, leave],
    },
  },
};

export const d_hc_listening: DialogueDef = {
  id: 'd_hc_listening', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A door off the service ward with a plate: LISTENING — EXCHANGE DESK — DO NOT DISTURB. Through its little window, a chair and a woman in it, and a roll of paper coming out of a slot in the wall covered in handwriting.',
      again: 'LISTENING — DO NOT DISTURB.',
      options: [leave],
    },
  },
};

export const d_hc_wardboard: DialogueDef = {
  id: 'd_hc_wardboard', owner: 'narrator',
  start: [{ if: { flag: 'hc_clinic' }, node: 'after' }, { if: { flag: 'hc_sleepers_woken' }, node: 'woken' }, { node: 'board' }],
  nodes: {
    board: {
      text: [
        { if: { all: [DAWIT_ALIVE, NILS_ON_WARD] }, text: 'The ward\'s board: twenty-three beds, a number against each, and what has been drawn and when, in a nurse\'s even hand. BED 1 — 9-0412 — K(R) L(PART) C(L) SKIN — FOUR SEASONS. BED 7 — 9-1182 — K(L) C(L) — TWO SEASONS. Further down the drawing gets heavier, and the oldest numbers have more letters than bed. And at the bottom, in a different colour: BED 19 — HABER, N. — WHOLE — RESERVED: CHAIR.' },
        { if: DAWIT_ALIVE, text: 'The ward\'s board: twenty-three beds, a number against each, and what has been drawn and when, in a nurse\'s even hand. BED 1 — 9-0412 — K(R) L(PART) C(L) SKIN — FOUR SEASONS. BED 7 — 9-1182 — K(L) C(L) — TWO SEASONS. Further down the drawing gets heavier, and the oldest numbers have more letters than bed.' },
        { text: 'The ward\'s board: twenty-two beds and a gap, a number against each, and what has been drawn and when, in a nurse\'s even hand. BED 7 has been wiped clean and written over with a new number. Somebody has written, small, in the corner, where you would only see it if you were looking for it: 9-1182 — CONCLUDED. Further down the drawing gets heavier, and the oldest numbers have more letters than bed.' },
      ],
      again: 'Twenty-three beds, and what has been drawn from each.',
      effects: [{ learn: 'hc_ward_seen' }, { learn: 'hc_ward_board' }, { lead: 'l_hc_service' }],
      passives: [{ skill: 'medicine', dc: 40, text: 'Holdfast keeps them under and keeps them still. The lines feed them. The machines breathe for the ones who can no longer manage it themselves. Nothing on this ward is being cured. Everything on it is being kept fresh.' }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin walks to the nearest cot and looks at the face on it, a woman her own age, and then at the tag, and then she walks out of the ward without a word, and you hear her being sick in the corridor.', effects: [T(-3)] },
        { companion: ILYA, text: 'Ilya counts the beds under his breath and gets to twenty-three and stops. "Right," he says, and his voice cracks on it. He doesn\'t try again.' },
      ],
      options: [
        { id: 'ward.wake', text: '(Wake them. All of them.)', if: CLINIC_OPEN, check: { skill: 'medicine', dc: 45, mods: [{ if: { flag: 'hc_abena_door' }, dc: -10, why: 'Abena knows every line and every dose' }, { if: { flag: 'hc_lisle_turned' }, dc: -10, why: 'Dr Lisle weighed every one of them, and works beside you' }, { if: { item: 'u_holdfast' }, dc: -5, why: 'holdfast in your pack, to ease them up slow' }] }, effects: [{ set: 'hc_sleepers_woken' }, { set: 'hc_wake', value: 'clean' }], next: 'wake_ok', fail: 'wake_hard', failEffects: [{ set: 'hc_sleepers_woken' }, { set: 'hc_wake', value: 'hard' }] },
        leave,
      ],
    },
    wake_ok: {
      text: 'You go bed to bed and take the holdfast off them slowly, the way it should be done, with the lines kept running until the eyes open. It takes the night. Twenty-one of them wake: confused, weeping, asking for people who are dead, asking what day it is and getting answers that are years wrong. Two do not wake. Their numbers had been drawn too far, and when the holdfast came off there was not enough of them left to come back to it. You close their eyes. Nobody else on the ward notices; they are learning to see.',
      again: 'Twenty-one awake. Two not.',
      options: [{ text: 'Now get them down the hill.', next: 'woken' }],
    },
    wake_hard: {
      text: 'You go too fast. You know it by the fourth bed and you cannot go slower, because the corridor bell has started and will not stop. Seventeen wake, sobbing, sick, some of them fighting the lines out of their own arms. Six do not. Two of the six were dying anyway. Four were not, and you know which four, and you will know for the rest of your life.',
      again: 'Seventeen awake. Six not.',
      options: [{ text: 'Now get them down the hill.', next: 'woken' }],
    },
    woken: {
      text: 'The service ward, awake: people sitting on their cots in white sheets with the tags still on their wrists, holding the hands of whoever is beside them. The ones who can walk are helping the ones who can\'t sit up. They are looking at you. Somebody has to get them down the hill.',
      again: 'The ward, awake, waiting on you.',
      options: [
        ...out('ward.freight', '(The freight at two. Mazur will be looking at his brake.)', FREED('freight'), 'gone_freight', { all: [MAZUR_OK, CAR_UP] }),
        ...out('ward.tunnel', '(Down the service stair to the sheds, and out with Kojo\'s line at dawn.)', FREED('tunnel'), 'gone_tunnel', { flag: 'hc_yaw_tunnel' }),
        ...out('ward.force', '(Out through the concourse, now, all of you, and let the Clean try.)', [...FREED('force'), { set: 'hc_alarm' }], 'gone_force'),
        { text: '(Not yet. Keep them here a little longer.)', exit: true },
      ],
    },
    gone_freight: {
      text: 'At two Abena takes them down the service stair in threes to the freight dock, in coats off the Clean\'s own hooks, and Mazur stands at his brake looking at his brake while the car fills with people instead of bags. It goes down without lamps. At Footgate the slope is waiting in the dark, because somebody told somebody, and the slope carries them up Cascade on its back.',
      again: 'The freight gone down, full.',
      options: [{ text: '(Leave the empty ward.)', exit: true }],
    },
    gone_tunnel: {
      text: 'At five, down the service stair into the sheds in the gardeners\' own clothes, into the line going out instead of in, past two of the Clean who have looked at faces going in every morning for years and have never once counted the faces coming out. Kojo stands at the hatch with his apron off. At the bottom of the road the gardeners\' line takes them by the arms and walks them down to the Skirts in the first light, slowly, at the pace of the slowest.',
      again: 'The tunnel, at dawn, going the wrong way.',
      options: [{ text: '(Leave the empty ward.)', exit: true }],
    },
    gone_force: {
      text: 'Down the lift in loads, across the concourse in white sheets, barefoot on the white floor. The Clean at the arch see twenty people coming at them in hospital white and don\'t know whether to shoot, and in that moment the people are through. Then somebody gives the order, and the Clean remember what they are for.',
      again: 'The concourse, and the shooting.',
      options: [{ text: '(Go.)', exit: true }],
    },
    after: {
      text: [
        { if: { flag: 'hc_clinic', eq: 'left' }, text: 'The ward\'s board, with its numbers and letters. A new line at the bottom, in the even hand, since you were last here.' },
        { text: 'The ward\'s board, wiped clean. Somebody has written across it, in a nurse\'s even hand: SERVICE CLOSED. Under it, smaller, in a different hand: TWENTY-THREE.' },
      ],
      again: 'The ward\'s board.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Dr Noor Qadir

export const d_hc_qadir: DialogueDef = {
  id: 'd_hc_qadir', owner: QADIR,
  start: [{ if: { flag: 'hc_clinic' }, node: 'after' }, { if: { flag: 'hc_qadir_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An office of real wood with a window on the gardens and a desk with nothing on it but a pen. The woman behind it is seventy and looks it, the only person on the hill who does: white hair pulled back, lines round the eyes, a doctor\'s plain hands. "Dr Qadir. You\'re the designate." She doesn\'t get up. "Nobody on this floor is dying. Please lower your voice, even when it\'s already low."',
      again: 'Dr Qadir, at her empty desk.',
      effects: [{ set: 'hc_qadir_met' }, { quest: 'q_hc_clinic', start: true }],
      passives: [{ if: { flag: 'hs_lisle_favour' }, label: 'Lisle', text: '"Teodora Lisle says you were reasonable about her Weighhouse," Dr Qadir adds. "She has never been up. She writes to me every season. She has no idea what she writes to."' }],
      options: [
        { id: 'qadir.floor', text: 'What is this floor?', next: 'floor' },
        { id: 'qadir.fit', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: [{ if: { knows: 'hc_qadir_case' }, text: 'Dr Qadir looks up from nothing. "Yes?" She has been waiting for you to come back since you left.' }, { text: '"Yes?" Dr Qadir, at her empty desk.' }],
      again: 'Dr Qadir, waiting.',
      options: [
        { id: 'qadir.floor2', text: 'What is this floor?', if: { not: { seen: 'qadir.floor' } }, next: 'floor' },
        { id: 'qadir.service', text: 'What is service?', if: { all: [{ not: { knows: 'hc_qadir_case' } }, { any: [{ knows: 'hc_ward_seen' }, { knows: 'hc_recipients' }, { knows: 'hs_service_floors' }, { knows: 'hc_cold_seen' }] }] }, next: 'case' },
        { id: 'qadir.age', text: 'You\'re the only one up here who looks her age.', if: { not: { seen: 'qadir.age' } }, next: 'age' },
        { id: 'qadir.dawit', text: 'Dawit Mekonnen. 9-1182.', if: { all: [{ any: [{ item: 'k_hs_boots' }, { knows: 'hs_boots_tag' }, { knows: 'hc_dawit_found' }, { item: 'k_hc_coldtag' }] }, { not: { seen: 'qadir.dawit' } }] }, next: 'dawit' },
        { id: 'qadir.nils', text: 'Haber, N. Whole. Before the ball.', if: { all: [NILS_ON_WARD, { knows: 'hc_nils_listed' }, { not: { seen: 'qadir.nils' } }] }, next: 'nils' },
        { id: 'qadir.chair', text: 'The Chair. What\'s left of him?', if: { all: [{ knows: 'hc_qadir_case' }, { not: { seen: 'qadir.chair' } }] }, effects: [{ learn: 'hc_chair_drift' }, { learn: 'hc_ages' }], next: 'chair' },
        { id: 'qadir.close', text: 'Close the service ward.', if: { all: [{ knows: 'hc_qadir_case' }, CLINIC_OPEN, { not: { any: [{ seen: 'qadir.argue' }, { seen: 'qadir.argue.x' }] } }] }, next: 'argue' },
        { id: 'qadir.offer', text: 'What do you offer the designate to leave it alone?', if: { all: [{ knows: 'hc_qadir_case' }, CLINIC_OPEN] }, next: 'offer' },
        { id: 'qadir.fit2', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        bye,
      ],
    },
    floor: {
      text: '"Recovery, for the Board, after a renewal. Fittings, for citizens. A cold store." She lets that sit. "And service, behind the door at the end, which you have heard about in the Skirts, from people who have never seen it, and which I would rather you saw than heard about. I have nothing on this floor I am ashamed of. Go and look. Then come back and ask me."',
      again: '"Go and look. Then come back and ask me."',
      options: [back()],
    },
    case: {
      text: [
        { if: EXPOSED, text: '"Sit." She does not lower her own voice; she has never needed to. "Service is what the contract says: the debtor discharges the paper in full, in kind. The Weighhouse sends me people whose paper has crossed the line, people who would be dead of the cough by forty on your slope, or under a fall, or on the Clean\'s cart in the morning. I keep them warm, fed through a line, asleep. They feel nothing; I see to that myself. And I draw on them slowly, as the Board needs. A kidney this season, an eye the next, marrow, skin, a lobe of liver, until there is nothing left worth keeping alive, and then I let them go and the Window sends the boots home." She folds her plain hands. "A body is a bank, designate. We draw on it slowly. One healthy debtor keeps a member of the Board for four years, five. Your Skirts stopped weighing this season. So I drew harder on what I had. That is not cruelty either. That is arithmetic with a shortage in it."' },
        { text: '"Sit." She does not lower her own voice; she has never needed to. "Service is what the contract says: the debtor discharges the paper in full, in kind. The Weighhouse sends me people whose paper has crossed the line, people who would be dead of the cough by forty on your slope, or under a fall, or on the Clean\'s cart in the morning. I keep them warm, fed through a line, asleep. They feel nothing; I see to that myself. And I draw on them slowly, as the Board needs. A kidney this season, an eye the next, marrow, skin, a lobe of liver, until there is nothing left worth keeping alive, and then I let them go and the Window sends the boots home." She folds her plain hands. "A body is a bank, designate. We draw on it slowly. One healthy debtor keeps a member of the Board for four years, five."' },
      ],
      again: '"A body is a bank. We draw on it slowly."',
      effects: [{ learn: 'hc_qadir_case' }],
      options: [{ id: 'qadir.case.why', text: 'Why them? Why the Board?', next: 'why' }],
    },
    why: {
      text: '"Because of what they know." She says it the way a believer says the creed, without heat, because it has never needed heat. "Twelve people who know how a chip line holds its tolerance, how a lens is grown, how holdfast is made, how a contract is written so that it binds for two hundred years. The last people alive who know how the world worked before it ended. The Burn took the libraries. It did not take them, because they were up here. Every year one of them dies is a year the world forgets something it will never learn again." She looks at the window and the gardens. "So yes. Twenty-three people on my ward are asleep so that twelve can stay awake. I have done that sum every morning for thirty years. I have never once got a different answer."',
      again: '"I have never once got a different answer."',
      interject: [
        { companion: NINE, text: '"The record keeps a thousand people\'s water short to keep a city lawful," Nine says, very quietly. "It does that sum every morning too." Its lens does not leave her. "I have started to get different answers."', effects: [N(2)] },
        { companion: ASH, text: '"Twelve," Ash says. "We fed a whole valley at Openfield on what one of them would have cost." Dr Qadir looks at him with real interest. "Yes," she says. "And when the blight came, who did you send to, to find out what it was?" Ash doesn\'t answer.' },
      ],
      options: [back()],
    },
    age: {
      text: '"I don\'t renew." She touches the lines at her own eye as if checking they are still there. "I could. The Board has offered every season for thirty years. I am seventy and I look it, and my knees hurt on the stairs, and I will die in a few years of something I could have had replaced off a debtor in an afternoon." She looks at you steadily. "Somebody on this floor should know what it costs. It may as well be the one holding the knife."',
      again: '"It may as well be the one holding the knife."',
      options: [back()],
    },
    dawit: {
      text: [
        { if: EXPOSED, text: '"9-1182." She doesn\'t look anything up. "Concluded, three weeks ago. A good man: a strong heart, clean kidneys, no cough yet. When your Skirts shut the Weighhouse I was short at once, and I had renewals booked. So I drew on him to the end, all at once, instead of over five years." She meets your eyes. "You did that as much as I did. I want you to know I know that. It doesn\'t help either of us."' },
        { text: '"9-1182. Bed seven. Two seasons." She doesn\'t look anything up. "A kidney and an eye so far. A strong heart; I haven\'t touched it. His wife writes to the Window every week asking for him back. The Window writes back that he is in service." She meets your eyes. "He is. Go and see him, if you like. He hums. The nurses like it."' },
      ],
      again: '"9-1182."',
      effects: [{ learn: 'hc_qadir_dawit' }],
      options: [back()],
    },
    nils: {
      text: '"Haber. Twenty-two, a good weight, no cough." She doesn\'t pretend. "The Chair\'s lungs are failing and his heart is older than this building. A part at a time no longer keeps up with him. So: whole. Before the ball, because the ball is when he must be seen to be well." She sets her pen down exactly parallel to the edge of the desk. "The ball is when the designate attends. So it is, strictly, up to you."',
      again: '"So it is, strictly, up to you."',
      effects: [{ learn: 'hc_nils_ball' }],
      interject: [{ companion: KES, text: 'Kes has gone grey. "Joran\'s boy," she says. "I taught him to read the Line board." Dr Qadir nods, as if this were a useful piece of history.' }],
      options: [back()],
    },
    chair: {
      text: '"Less of him every season." A clinician\'s answer. "The renewals keep the body. Nothing keeps the rest. Two hundred and forty years of memory in a brain made for eighty; the Board\'s lattice holds what it can, and what it holds is the house, not him. What is left of Adair Halverson is his manners. They are very good manners. They go round and round."',
      again: '"His manners go round and round."',
      options: [back()],
    },
    argue: {
      text: 'She waits, hands folded, to hear what you have that she has not already thought of in thirty years of mornings.',
      again: 'Dr Qadir, waiting to hear it.',
      options: [
        ...out('qadir.argue', '(Lay it out: what they are, what she is, and what it has cost.)', CLOSED, 'closed', undefined).map((o) => ({
          ...o, check: { skill: 'speech' as const, dc: 55, mods: [
            { if: { item: 'k_hc_renewal_list' }, dc: -10, why: 'her own list: a whole person for one evening\'s appearance' },
            { if: { any: [{ knows: 'hc_dawit_found' }, { knows: 'hc_qadir_dawit' }] }, dc: -5, why: 'bed seven has a name and a wife' },
            { if: { flag: 'hc_lisle_turned' }, dc: -10, why: 'Teodora Lisle, who weighed them, stands beside you' },
            { if: EXPOSED, dc: -5, why: 'the Skirts has stopped sending: she is short already' },
            { if: KES_IN, dc: -5, why: 'Kes came round on this floor at sixteen' },
            { if: { knows: 'hc_cold_seen' }, dc: -5, why: 'you have stood in her cold store' },
          ] },
          fail: 'close_no',
        })),
        { text: '(Not yet.)', next: 'again' },
      ],
    },
    closed: {
      text: 'She listens to all of it without moving. When you have finished she is quiet for a long time. Then she takes the pen and a sheet of the floor\'s paper and writes, in the same neat hand as the board: SERVICE WARD CLOSED. SLEEPERS TO BE WOKEN AND DISCHARGED TO THE SLOPE. Q. "I have known for some years that the answer was wrong," she says. "I kept doing the sum because I had not been made to stop. The cold store keeps what it has. From now on we take from the dead and the willing, and the Board learns what a short season is." She stands; her knees hurt; she does not let it show. "Abena. Wake them. Slowly. I\'ll answer for it." And to you: "They will review me. I am seventy. Let them."',
      again: 'SERVICE WARD CLOSED. Q.',
      options: [{ text: '(Leave her to it.)', exit: true }],
    },
    close_no: {
      text: '"No." Not unkindly. "Not this season. You have told me what I already know, and you have told it well, and I have heard it from better people than you every morning in my own head." She picks up the pen again. "Go and do something about it yourself, if you think you can carry them. I won\'t stop you. I won\'t help you either."',
      again: '"Go and do something about it yourself."',
      options: [back()],
    },
    offer: {
      text: '"Your chart." She says it simply. "Open on this floor for the rest of your life. Any fitting from my own stock, at no charge. Any renewal, when you want one, and you will want one, designate; everybody does by fifty. A kidney when yours fail, eyes when yours go, a heart." She looks at you. "Leave nine as it is, and in forty years you will still look like this. That is what I offer, because that is what I have."',
      again: '"In forty years you will still look like this."',
      options: [
        { id: 'qadir.offer.take', text: '(Take it. Leave the floor as it is.)', effects: LEFT, next: 'left' },
        { text: '(No.)', next: 'again' },
      ],
    },
    left: {
      text: 'She writes your name at the top of a fresh chart and files it in the drawer with the Board\'s. "Thank you for understanding," she says. You did understand. That is the part you will think about later.',
      again: 'Your chart, filed with the Board\'s.',
      options: [{ text: '(Leave.)', exit: true }],
    },
    after: {
      text: [
        { if: { flag: 'hc_clinic', eq: 'closed' }, text: 'Dr Qadir at her desk with the closed ward\'s board propped against the wall behind her, where she can see it without turning round. "Short season," she says. "The Board has been to see me four times. I am to be reviewed in the spring." She seems almost glad.' },
        { if: { flag: 'hc_clinic', eq: 'freed' }, text: 'Dr Qadir does not get up. "You took them down the hill," she says. "Some of them reached the bottom." She looks at you for a long time. "I have twelve renewals booked and nothing to renew them with. That is your doing. I want you to have the whole of it."' },
        { text: '"Designate." Dr Qadir, at her empty desk, with your chart in her drawer.' },
      ],
      again: 'Dr Qadir.',
      options: [{ id: 'qadir.fit3', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true }, bye],
    },
  },
};

// ---------------------------------------------------------------- Abena Asiedu, the orderly

export const d_hc_abena: DialogueDef = {
  id: 'd_hc_abena', owner: 'npc_hc_16', start: [{ if: { flag: 'hc_abena_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in an orderly\'s whites with a tray of little glass vials, walking the corridor as if she were counting her own steps. Cornrows tight to the head, Skirts hands. "Holdfast at six," she says, to nobody, and then sees you. "You\'re not staff."',
      again: 'Abena, with her tray of vials.',
      effects: [{ set: 'hc_abena_met' }],
      options: [{ id: 'abena.door', text: 'What\'s behind the service door?', next: 'door' }, bye],
    },
    again: {
      text: [{ if: { flag: 'hc_abena_door' }, text: 'Abena nods to you, once, the way the slope nods to people it has decided about.' }, { text: '"Holdfast at six," Abena says, to the tray.' }],
      again: 'Abena, counting her steps.',
      options: [
        { id: 'abena.door2', text: 'What\'s behind the service door?', if: { not: { seen: 'abena.door' } }, next: 'door' },
        { id: 'abena.lev', text: 'Lev Ostrander had your job.', if: { all: [{ flag: 'hs_lev_met' }, { not: { flag: 'hc_abena_door' } }, { not: { seen: 'abena.lev' } }] }, effects: [{ set: 'hc_abena_door' }], next: 'lev' },
        { id: 'abena.kes', text: '(Kes says her name, and where she was born.)', if: { all: [KES_IN, { not: { flag: 'hc_abena_door' } }, { not: { seen: 'abena.kes' } }] }, effects: [{ set: 'hc_abena_door' }, K(2)], next: 'kes' },
        { id: 'abena.ask', text: 'You know what\'s behind it. Show me.', if: { all: [{ seen: 'abena.door' }, { not: { flag: 'hc_abena_door' } }, { not: { seen: 'abena.ask' } }] }, check: { skill: 'speech', dc: 40, mods: [{ if: { flag: 'hs_shift', eq: 'won' }, dc: -10, why: 'the Shift won, and she knows who stood with it' }] }, effects: [{ set: 'hc_abena_door' }], next: 'shown', fail: 'ask_no' },
        { id: 'abena.mother', text: 'Why do you stay?', if: { all: [{ flag: 'hc_abena_door' }, { not: { seen: 'abena.mother' } }] }, next: 'mother' },
        bye,
      ],
    },
    door: { text: '"Staff." She doesn\'t stop walking. "I don\'t read the charts. I give the holdfast at six and at six and I don\'t read the charts."', again: '"I don\'t read the charts."', options: [back()] },
    lev: {
      text: 'She stops walking. "Lev." Her whole face changes. "He trained me. Nine years he carried this tray and then one morning he put it down on that trolley and walked out and down the hill and didn\'t say anything to anybody." She looks at the service door. "He said to me once, you\'ll know when you can\'t carry it any more. I keep waiting to know." She takes a key card off her belt. "I\'ll let you in. Don\'t make me watch."',
      again: '"I keep waiting to know."',
      options: [back()],
    },
    kes: {
      text: '"Oyelaran." Abena puts the tray down. "Your mother sold mangoes off a crate at the bottom of Cascade. I used to steal them." She looks at the back of Kes\'s neck, at the port, and her mouth sets. "They brought you up on my freight. I remember. I gave you your holdfast." She takes a key card off her belt. "Go on, then. Both of you."',
      again: '"I gave you your holdfast."',
      interject: [{ companion: KES, text: 'Kes doesn\'t say anything for a long time. Then: "Thanks for the mangoes." Abena laughs, once, like something breaking.' }],
      options: [back()],
    },
    shown: { text: 'She looks at you a long time. "Fine." She takes a key card off her belt. "Look, then. Somebody from outside ought to." She doesn\'t come in with you.', again: 'Abena\'s key card.', options: [back()] },
    ask_no: { text: '"Staff," Abena says, and picks the tray up, and walks away down the corridor counting her steps aloud so she doesn\'t have to hear you.', again: 'Abena, counting aloud.', options: [back()] },
    mother: {
      text: '"My mother\'s paper is ninety scrip a season on the Window. Nine pays me a hundred." She says it like the sum it is. "If I walk down the hill like Lev did, my mother goes on the Weighhouse bench. If I stay, I give them holdfast at six and at six, and some of them are from Two-Twelve, and one of them was my teacher." She picks up the tray. "You want to take them down, I\'ll show you the service stair. I\'ve been waiting for somebody to want to for six years."',
      again: '"I\'ll show you the service stair."',
      options: [back()],
    },
  },
};

// ---------------------------------------------------------------- on the service ward

export const d_hc_dawit: DialogueDef = {
  id: 'd_hc_dawit', owner: 'npc_hc_20', start: [{ if: DAWIT_HOME, node: 'home' }, { if: { knows: 'hc_dawit_found' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Bed seven. A man of about forty under a white sheet, a line in his arm, a dressing taped over his left eye and another low on his left side. He isn\'t quite asleep. He is humming, very low, four notes over and over, the way you hum to a child. The tag on his wrist: 9-1182. When you stand over him the humming stops. "Saba," he says, to the ceiling. "Is Saba all right?"',
      again: 'Dawit Mekonnen, humming four notes.',
      effects: [{ learn: 'hc_dawit_found' }, { lead: 'l_hc_dawit' }],
      options: [
        { id: 'dawit.saba', text: 'Saba\'s all right. She\'s looking for you.', next: 'saba' },
        { id: 'dawit.boots', text: '(Put his boots on the cot beside him.)', if: { item: 'k_hs_boots' }, effects: [{ take: 'k_hs_boots' }, { set: 'hc_dawit_boots' }], next: 'boots' },
        { text: '(Let him sleep.)', exit: true },
      ],
    },
    again: {
      text: 'Dawit, humming four notes. "Saba?"',
      again: 'Dawit, humming.',
      options: [
        { id: 'dawit.saba2', text: 'Saba\'s all right. She\'s looking for you.', if: { not: { seen: 'dawit.saba' } }, next: 'saba' },
        { id: 'dawit.boots2', text: '(Put his boots on the cot beside him.)', if: { item: 'k_hs_boots' }, effects: [{ take: 'k_hs_boots' }, { set: 'hc_dawit_boots' }], next: 'boots' },
        { text: '(Let him sleep.)', exit: true },
      ],
    },
    saba: {
      text: 'His good eye finds you, slowly. "She sings that," he says. "The four notes. To the little one. I keep it going so I don\'t forget it." He is quiet. "They said service. I thought it meant work. I thought I\'d be carrying something." He laughs, very weakly, and stops, because it hurts his side. "I am, I suppose."',
      again: '"I thought I\'d be carrying something."',
      interject: [{ companion: WREN, text: 'Wren sits down on the edge of the cot and takes his hand without asking, and holds it, and doesn\'t say anything at all.', effects: [W(2)] }],
      options: [{ text: '(Let him sleep.)', exit: true }],
    },
    home: {
      text: 'Dawit Mekonnen on an upturned crate outside his own shack on Nursery, a patch over the left eye, sitting carefully because of his side. His boots are on. He is humming the four notes, and from inside, somebody is singing them back. "They said service," he says, when he sees you. "I\'m doing a different kind now. I\'m sitting." He laughs, and holds his side, and keeps laughing.',
      again: 'Dawit, home, humming.',
      options: [{ text: '(Leave them be.)', exit: true }],
    },
    boots: {
      text: 'He can\'t see them with the eye he has left, so you put his hand on them. He knows them by the laces. "Where were they?" he says. "I asked and asked. Where were my boots?" You tell him: at home. With Saba. He holds on to one of them and goes back to humming.',
      again: 'Dawit, holding a boot.',
      options: [{ text: '(Let him sleep.)', exit: true }],
    },
  },
};

export const d_hc_nils: DialogueDef = {
  id: 'd_hc_nils', owner: 'npc_hs_09', start: [{ if: { seen: 'nils.hc.wake' }, node: 'awake' }, { node: 'asleep' }],
  nodes: {
    asleep: {
      text: 'Bed nineteen. A young man of twenty-two, whole, asleep, not a dressing on him; the only one on the ward with nothing taken yet. The tag on his wrist is a different colour: HABER, N. — WHOLE — RESERVED: CHAIR. His breathing is even. He has a miner\'s shoulders and a boy\'s face.',
      again: 'Nils Haber, whole, asleep. RESERVED: CHAIR.',
      effects: [{ learn: 'hc_nils_found' }],
      options: [
        { id: 'nils.hc.wake', text: '(Wake him.)', next: 'awake' },
        leave,
      ],
    },
    awake: {
      text: 'He comes up slowly, the way people come up from holdfast, frightened before he knows of what. "Where." Then: "Is my father up? The Concern\'s crew said they\'d bring them up. The eleven." He grips your sleeve. "They said if I went into service the paper was settled and they\'d bring my father up and bury him."',
      again: 'Nils, awake, gripping your sleeve.',
      options: [
        { id: 'nils.hc.father', text: '(Tell him the truth about his father.)', if: { not: { seen: 'nils.hc.father' } }, next: 'father' },
        { id: 'nils.hc.out', text: '(Walk him out now, in a coat off a hook, while the corridor is empty.)', if: NILS_ON_WARD, check: { skill: 'stealth', dc: 45, mods: [{ if: KES_IN, dc: -10, why: 'Kes blinds the corridor\'s lenses' }, { if: { flag: 'hc_abena_door' }, dc: -10, why: 'Abena shows you the service stair' }] }, effects: [...NILS_DOWN, K(10), W(5), { decision: { id: 'hc_nils', text: 'You walked Nils Haber off Halcyon\'s floor nine before the ball, and down the hill.' } }, GOTO('hs_skirts', 'from_halcyon', 90)], next: 'out', fail: 'caught', once: true },
        { text: '(Not yet. Lie still.)', exit: true },
      ],
    },
    father: {
      text: [
        { if: { flag: 'hs_dead_up' }, text: 'You tell him: the Shift went down at night and dug, and brought the eleven up, and buried them on the slope above Nursery, and his father is in the fourth grave with his tag on the cross. Nils lies back and looks at the ceiling and cries without making any sound at all, the way the Skirts cries.' },
        { text: 'You tell him: nobody has brought his father up. The Concern\'s crew never went down. Six East is shut, GEOLOGICAL, and the eleven are where they fell. Nils lies back and looks at the ceiling. "They said," he says. "They said."' },
      ],
      again: 'Nils, looking at the ceiling.',
      options: [{ text: '(Back.)', next: 'awake' }],
    },
    out: {
      text: 'Down the service stair in a coat off a hook, past the sheds, out through the yard while the post is looking the other way, and down the road in the dark with his arm over your shoulder because his legs have forgotten. At Footgate he sits down in the coal dust and puts both hands flat on it as if to make sure it is there.',
      again: 'Nils, in the coal dust at Footgate.',
      options: [{ text: '(Walk on.)', exit: true }],
    },
    caught: {
      text: 'At the corner by the cold store a soft bell rings and two of the Clean are there, unhurried, the way they always are. They take Nils by the elbows, gently, and walk him back to bed nineteen, and Abena comes with the tray. Nobody says a word to you. They do not need to; the bed is RESERVED.',
      again: 'Nils, back in bed nineteen.',
      options: [{ text: '(Leave.)', exit: true }],
    },
  },
};

export const d_hc_dysart: DialogueDef = {
  id: 'd_hc_dysart', owner: 'npc_hs_05', start: [{ if: { flag: 'hc_dysart' }, node: 'decided' }, { if: { seen: 'dysart.hc.why' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A cot near the listening room, and on it, awake, in a ward smock with a tag on his wrist, Corwin Dysart, who ran Number Six. He sees you and laughs, once. "Reviewed," he says. "The strike was lost. The quarter\'s tonnage was lost. A contract citizen whose tenure review comes after a lost quarter is reviewed." He holds up the wrist. "First draw is tomorrow. They give you a night to make your peace. It\'s in the contract. Everything\'s in the contract."',
      again: 'Dysart, awake, his wrist tagged.',
      options: [{ id: 'dysart.hc.why', text: 'Why did you rob the pillars?', next: 'why' }, { text: '(Leave him.)', exit: true }],
    },
    again: {
      text: 'Dysart, on his cot, looking at the tag on his wrist.',
      again: 'Dysart, and his tag.',
      options: [
        { id: 'dysart.hc.down', text: 'If the ward goes down the hill, you go with it.', if: { not: CLINIC_OUT }, effects: [{ set: 'hc_dysart', value: 'down' }, K(3), W(-3)], next: 'down' },
        { id: 'dysart.hc.stay', text: 'If the ward goes down the hill, you stay.', if: { not: CLINIC_OUT }, effects: [{ set: 'hc_dysart', value: 'stays' }, K(-2), W(3), T(-3)], next: 'stay' },
        { text: '(Leave him.)', exit: true },
      ],
    },
    why: {
      text: '"Because I did a sum." He doesn\'t pretend to be sorry or not sorry. "My review was this spring. The quarter\'s tonnage decided it. Fourteen to twenty-two were good coal standing still. The steward objected; I doubled his paper; he went in. I wrote the order, I signed it, and I thought, the roof will hold another week, and if it doesn\'t, it\'s eleven debtors against my wife\'s flat on floor three and my son\'s place in the school." He looks at the ceiling. "They did the same sum on me. It came out the same way. I can\'t even say it was wrong. I just didn\'t think I\'d be on the other side of the line."',
      again: '"They did the same sum on me."',
      interject: [{ companion: KES, text: 'Kes looks at him a long time. "Maren would take you down," she says at last. "She\'d feed you. She feeds the scabs." She doesn\'t say what she would do.' }],
      options: [back()],
    },
    down: { text: 'He closes his eyes. "Maren\'s slope," he says. "They\'ll kill me on Cascade." Then: "Better than tomorrow." He doesn\'t say thank you. You didn\'t expect him to.', again: '"Better than tomorrow."', options: [{ text: '(Leave him.)', exit: true }] },
    stay: { text: 'He nods slowly, as if you had read him the result of a sum he had already done. "Eleven," he says. "Yes. All right." He lies back and looks at the tag.', again: '"Eleven. Yes."', options: [{ text: '(Leave him.)', exit: true }] },
    decided: { text: 'Dysart doesn\'t look at you. He has already been told what happens to him.', again: 'Dysart, not looking.', options: [{ text: '(Leave him.)', exit: true }] },
  },
};

export const d_hc_lisle: DialogueDef = {
  id: 'd_hc_lisle', owner: 'npc_hs_07', start: [{ if: { flag: 'hc_lisle_turned' }, node: 'turned' }, { if: { seen: 'lisle.hc.seen' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Dr Teodora Lisle, in the corridor on nine, in ward whites instead of the Weighhouse\'s, holding a clipboard she isn\'t reading. When the slope shut her Weighhouse she came up the hill, the one door out that still opened for her. She looks at you as if you had come to tell her something she already knows. "Eight days," she says. "I have been up eight days. I had never been up."',
      again: 'Dr Lisle, with a clipboard she isn\'t reading.',
      options: [{ id: 'lisle.hc.seen', text: 'Now you\'ve seen it.', next: 'seen' }, bye],
    },
    again: {
      text: 'Dr Lisle, in the corridor.',
      again: 'Dr Lisle.',
      options: [
        { id: 'lisle.hc.help', text: 'Then help me. Wake them, or tell Qadir what you weighed.', if: { not: { flag: 'hc_clinic' } }, effects: [{ set: 'hc_lisle_turned' }, K(2)], next: 'help' },
        bye,
      ],
    },
    seen: {
      text: '"I weighed them." Her voice is perfectly level. "I wrote K L C H on a board in chalk, and the yield, and I sent them up on the freight and I told myself I was the only door out of the Skirts that opened. I have walked the service ward every morning for eight days, and every morning I have found a name I wrote." She looks at the clipboard. "Bed three was a woman I weighed in the spring of my first year. I told her the settlement would see her children through the winter. It did. She has no eyes now."',
      again: '"I have found a name I wrote."',
      options: [back()],
    },
    help: { text: '"Yes." No hesitation at all, as if she had been waiting eight days for somebody to say it. "I know every one of them by weight. I know what they can stand." She puts the clipboard down on a trolley and leaves it there.', again: 'The clipboard, left on a trolley.', options: [{ text: '(Leave her.)', exit: true }] },
    turned: { text: 'Dr Lisle, in her sleeves, without the clipboard. "Whenever you\'re ready," she says.', again: '"Whenever you\'re ready."', options: [bye] },
  },
};

// ---------------------------------------------------------------- the Saints' Listener

const FREE_SELA: Effect[] = [
  { set: 'hc_listener', value: 'free' }, K(5), T(3), N(3),
  { decision: { id: 'hc_listener', text: 'You took Sela Brandt, the Saints\' Listener, off the Concern\'s wire on floor nine, and she went down the hill.' } },
];

export const d_hc_listener: DialogueDef = {
  id: 'd_hc_listener', owner: 'npc_hc_21', start: [{ if: { knows: 'hc_listener_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A small room off the ward. A woman of twenty in a chair with a cable from the port at her nape into a box on the wall, her head shaved close for it. Her right hand is writing on a roll of paper that feeds out of a slot, without her looking at it, very fast, in a tidy hand. Her lips move. "Reserve nine, point six. Thursday. A hand higher. Ward forty, short." She looks up at you without stopping the hand. "Sorry. It doesn\'t stop. Are you the new nurse? It\'s always the same light in here, I lose track."',
      again: 'Sela, writing without looking.',
      effects: [{ learn: 'hc_listener_met' }],
      options: [
        { id: 'sela.who', text: 'Who are you?', next: 'who' },
        { text: '(Leave her to it.)', exit: true },
      ],
    },
    again: {
      text: [{ if: { flag: 'hc_listener' }, text: 'The listening room is empty. The roll of paper has stopped.' }, { text: 'Sela, writing. "Thursday. A hand higher."' }],
      again: 'Sela, writing.',
      options: [
        { id: 'sela.who2', text: 'Who are you?', if: { all: [{ not: { seen: 'sela.who' } }, { not: { flag: 'hc_listener' } }] }, next: 'who' },
        { id: 'sela.reads', text: 'Who reads what you write?', if: { all: [{ seen: 'sela.who' }, { not: { seen: 'sela.reads' } }, { not: { flag: 'hc_listener' } }] }, next: 'reads' },
        { id: 'sela.immy', text: 'The girl from your tower.', if: { all: [{ knows: 'hc_immy_told' }, { not: { seen: 'sela.immy' } }, { not: { flag: 'hc_listener' } }] }, next: 'immy' },
        { id: 'sela.unplug', text: '(Take her off the wire.)', if: { all: [{ seen: 'sela.who' }, { not: { flag: 'hc_listener' } }, { not: KES_IN }] }, check: { skill: 'science', dc: 45, mods: [{ if: { flag: 'hc_abena_door' }, dc: -5, why: 'Abena knows how the box is fed' }] }, effects: FREE_SELA, next: 'free', fail: 'unplug_no', once: true },
        { id: 'sela.kes', text: '(Kes, take her off the wire.)', if: { all: [{ seen: 'sela.who' }, { not: { flag: 'hc_listener' } }, KES_IN] }, effects: [...FREE_SELA, K(3)], next: 'free_kes' },
        { text: '(Leave her to it.)', exit: true },
      ],
    },
    who: {
      text: [
        { if: { flag: 'bw_static', eq: 'concern' }, text: '"Sela. I was a Listener at the Saints\' tower in Bridgeward. Verity\'s." The hand writes. "I heard the city\'s wire in words, like the new one does. A man in a clean coat came with a radio that worked, when I was nineteen, and I thought I was going to be a citizen." The hand writes. "That was a year ago. They don\'t put anyone in the chair before nineteen; it\'s in the contract. So the new one, the girl from my tower, Immy, they\'ve got her in the school on the terraces with the reserve children. Sixteen. Three years and then this chair, or the one next to it." She doesn\'t cry. She hasn\'t got time. "Somebody should get her out before she\'s nineteen."' },
        { text: '"Sela. I was a Listener at the Saints\' tower in Bridgeward. Verity\'s." The hand writes. "I heard the city\'s wire in words, the way some of us do. A man in a clean coat came with a radio that worked, when I was nineteen, and I thought I was going to be a citizen." The hand writes. "That was a year ago. I hear everything now. All of it. All the time. I haven\'t slept the night through since the port went in." She almost smiles. "Verity used to make us stop at two and drink something hot."' },
      ],
      again: '"I hear everything now."',
      effects: [{ learn: 'hc_sela_told' }],
      passives: [{ if: { flag: 'bw_static', eq: 'concern' }, label: 'Bridgeward', text: 'Immy. You sent her up the hill. You told a man in a clean coat where a radio that worked was sitting.', effects: [{ learn: 'hc_immy_told' }] }],
      interject: [{ companion: TAMSIN, text: 'Tamsin kneels by the chair so her face is level with Sela\'s. "When did you last eat something hot?" she asks, and Sela has to think about it, and can\'t remember.', effects: [T(1)] }],
      options: [back()],
    },
    reads: {
      text: '"The Exchange desk, on the Board\'s floor." The hand writes. "The Ledger forecasts everything: reserves, prices, who dies. It leaks a little on its own wire, and a few of us hear the leak. The Concern buys ahead of the guild on what I write and sells to the guild after." She glances at the roll. "It\'s not enough for them. It\'s a keyhole. That\'s why they want the whole book, the one under the Spire. Then they wouldn\'t need me." She says it with something like hope.',
      again: '"It\'s a keyhole."',
      effects: [{ learn: 'hc_keyhole' }],
      options: [back()],
    },
    immy: {
      text: '"The school\'s on floor five, by the registry. They keep the reserve children there and the bought ones. She\'s fed. She has a bed. She\'s frightened of the dark and they leave a lamp on." The hand writes. "Her paper\'s the Concern\'s. Anything the Concern owns, it sells, if you ask the right person. Or a pass. A pass down only says you can."',
      again: '"A pass down only says you can."',
      options: [back()],
    },
    free: {
      text: 'The box on the wall is simpler than it looks: the Concern never expected anyone to want to take its listeners off. You ease the feed down slowly, and her hand slows, and stops, and the roll of paper stops coming out of the slot. Sela sits looking at her own hand. Then she starts to cry, for the first time in a year, because it is quiet. Abena finds her a coat. She goes down the service stair and out with the morning\'s line, and doesn\'t look back at the chair.',
      again: 'The empty chair.',
      options: [{ text: '(Leave.)', exit: true }],
    },
    free_kes: {
      text: 'Kes kneels behind the chair and puts two fingers on the port at Sela\'s nape, the way you would take a pulse, and closes her eyes. "Shh," she says, to the box, not to Sela. The hand slows. Stops. The paper stops. "There," Kes says. "Quiet. Obviously it\'s weird. You get used to it." Sela turns round in the chair and holds on to Kes like somebody pulled out of a river.',
      again: 'The empty chair, and the stopped paper.',
      options: [{ text: '(Leave.)', exit: true }],
    },
    unplug_no: {
      text: 'You ease the feed down and her whole body arches in the chair and the hand writes so fast it tears the paper. You put it back. She sits panting. "Not like that," she says, when she can. "It holds on. Somebody who knows the grid. Please." The hand starts writing again.',
      again: 'Sela, writing again, shaking.',
      options: [back()],
    },
  },
};

export const HC_CLINIC_DIALOGUES: DialogueDef[] = [
  d_hc_clinic_board, d_hc_charts, d_hc_qadir_files, d_hc_coldstore, d_hc_warddoor, d_hc_warddoor_in, d_hc_listening, d_hc_wardboard,
  d_hc_qadir, d_hc_abena, d_hc_dawit, d_hc_nils, d_hc_dysart, d_hc_lisle, d_hc_listener,
];
