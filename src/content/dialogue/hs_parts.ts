import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, FREE_NILS, K, KES, KES_IN, NIGHT, NINE, ODILE, PARTS_EXPOSED, SHIFT_WON, TAMSIN, TOLLS, WREN, bye, leave } from './hs_skirts';

/**
 * The Skirts (B4a), part two: Spare Parts (the Weighhouse, its book, the freight at two, Nils Haber in the ward), Scrip
 * (the changer at Two-Twelve, the rate board, Ama Owusu's tin), and the Skirts' services: the wall on Cascade, Provision,
 * Lampblack, the Pond, Lev Ostrander's table (where Kes's link can be cut), the shack on Nursery, and the Window's grid
 * exchange (where it can be turned dark). Story notes: story/STORY_PLAN_SECRET.md, Build notes — B4.
 */

const PARTS_OPEN: Cond = { not: { flag: 'hs_parts' } };
const EXPOSED: Cond = { flag: 'hs_parts', eq: 'exposed' };
const SCRIP_OPEN: Cond = { not: { flag: 'hs_scrip' } };
/** Kes's own quest (Slack) is open and she is here. */
const KES_Q: Cond = { all: [KES_IN, { flag: 'kes_s3' }, { not: { flag: 'kes_link' } }] };
const GRID_CHROME: Cond = { any: [{ chrome: 'ch_neural_link' }, { chrome: 'ch_neural_lattice' }] };

const PARTS_COVERED = (how: string, text: string, more: Effect[] = []): Effect[] => [
  { set: 'hs_parts', value: 'covered' }, { set: 'hs_parts_how', value: how }, K(how === 'paid' ? -10 : -5), { xp: 100 }, { decision: { id: 'hs_parts', text } }, ...more,
];
const PARTS_PROFIT: Effect[] = [
  { set: 'hs_parts', value: 'profit' }, { set: 'hs_parts_how', value: 'fee' }, { give: 'tolls', count: 100 }, K(-40), { set: 'kes_refused' },
  { decision: { id: 'hs_parts', text: 'You took the Weighhouse\'s finder\'s fee: a name for a hundred Tolls.' } },
];
const SCRIP = (v: string, how: string, text: string, more: Effect[] = []): Effect[] => [
  { set: 'hs_scrip', value: v }, { set: 'hs_scrip_how', value: how }, { decision: { id: 'hs_scrip', text } }, ...more,
];
const SCRIP_PAR = (how: string): Effect[] => SCRIP('par', how, 'You made the changer at Two-Twelve change Ama Owusu\'s savings at par. Her family went down the Line.', [
  { set: 'hs_vulpe_docked' }, K(5), { xp: 100 }, { news: { tag: 'hs_scrip_par', text: 'the changer at Two-Twelve changed a miner\'s savings at par for once; the guild docked him for it', valence: 3, size: 4, at: 'skirts' } },
]);
const LINK = (v: string, text: string, more: Effect[] = []): Effect[] => [{ set: 'kes_link', value: v }, { decision: { id: 'kes_link', text } }, { xp: 150 }, ...more];

// ---------------------------------------------------------------- the wall on Cascade (Spare Parts' hook)

export const d_hs_notice: DialogueDef = {
  id: 'd_hs_notice', owner: 'narrator', start: [{ node: 'wall' }],
  nodes: {
    wall: {
      text: [
        { if: EXPOSED, text: 'The wall on Cascade, three deep in paper. In the middle of it, nailed through all four corners so nobody can take it down, a page of the Weighhouse book: NAME — DEBT — YIELD — SERVICE. Somebody has written beside the yield column, in big letters, what K L C H stand for.' },
        { text: 'The wall on Cascade, three deep in paper: lost, found, for sale, a room, a goat, a pair of boots in good condition. NO LAMPS DOWN in red over all of it. And one notice newer and neater than the rest, pinned at eye height by somebody who comes back every day to straighten it.' },
      ],
      again: 'The wall on Cascade.',
      effects: [{ learn: 'hs_wall_seen' }],
      options: [
        { id: 'wall.saba', text: '(Read the neat notice.)', next: 'saba' },
        { id: 'wall.pin', text: '(Nail a page of the Weighhouse book to the wall beside it.)', if: { all: [{ item: 'k_hs_weighbook' }, { knows: 'hs_yield_read' }, PARTS_OPEN] }, next: 'pin' },
        { id: 'wall.rest', text: '(Read the rest.)', if: { not: { seen: 'wall.rest' } }, next: 'rest' },
        leave,
      ],
    },
    saba: {
      text: 'DAWIT MEKONNEN, MINER, NUMBER FOUR, WENT TO THE WEIGHHOUSE TO CLEAR HIS PAPER. THE WINDOW WROTE DISCHARGED IN SERVICE. HE HAS NOT WRITTEN. IF YOU HAVE SEEN HIM UP THE HILL TELL SABA, NURSERY, THE SECOND ROW. HE IS TALL AND HE HUMS.',
      again: 'HE IS TALL AND HE HUMS.',
      effects: [{ learn: 'hs_saba_notice' }, { quest: 'q_hs_parts', start: true }],
      options: [leave],
    },
    rest: { text: 'A goat, two scrip a day for its milk. A room on Nursery, no cough. CONTRACT FOR SALE, TEN YEARS LEFT, GOOD TERMS, ASK AT THE POND. A child\'s drawing of an orange tree. And small, in the corner, chalk: THE LEDGER CAN\'T SEE US. GOOD.', again: 'A goat, a room, a contract for sale, an orange tree.', effects: [{ learn: 'hs_wall_rest' }], options: [leave] },
    pin: {
      text: 'You nail the page up beside Saba\'s notice and stand back. It takes an hour. First one person stops, then four, then the whole of Cascade is reading it over each other\'s shoulders, and somebody who can read the letters says them out loud, and somebody else says what they stand for. By dark there are three hundred people outside the Weighhouse. By midnight there are none inside it.',
      again: 'The page, nailed up beside Saba\'s notice.',
      effects: PARTS_EXPOSED('wall', 'You nailed a page of the Weighhouse book to the wall on Cascade. The Skirts read it, and shut the Weighhouse.'),
      interject: [
        { companion: ASH, text: '"There\'s a weight to that," Ash says, watching them read. "Now it\'s everyone\'s."', effects: [A(ASH, 5)] },
        { companion: TAMSIN, text: 'Tamsin reads it with them and then turns round to you with a face like a slammed door. "Bits," she says. "They weigh them for bits."', effects: [A(TAMSIN, 5)] },
        { companion: WREN, text: '"That\'s a block," Wren says. "With a doctor at the counter." She doesn\'t say anything else for an hour.', effects: [A(WREN, 5)] },
      ],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Saba Mekonnen

export const d_hs_saba: DialogueDef = {
  id: 'd_hs_saba', owner: 'npc_hs_10',
  start: [
    // B4b: what the player found on Halcyon's floor nine comes home to her
    { if: { all: [{ any: [{ flag: 'hc_clinic', eq: 'freed' }, { flag: 'hc_clinic', eq: 'closed' }] }, { not: EXPOSED }] }, node: 'hc_home' },
    { if: { all: [EXPOSED, { knows: 'hc_cold_seen' }, { not: { flag: 'hc_saba_told' } }] }, node: 'hc_dead' },
    { if: EXPOSED, node: 'exposed' }, { if: { flag: 'hs_saba_met' }, node: 'again' }, { node: 'intro' },
  ],
  nodes: {
    hc_home: {
      text: 'Saba is not at the wall. Her notice is gone; there is a nail where it was. You find her outside the shack on Nursery with a bowl of beans to shell, and Dawit beside her on a crate with a patch over one eye, humming. She looks at you for a long time. "They carried him up Cascade on a door," she says. "Nobody would let me help. They said I\'d drop him laughing." She goes back to the beans. "I would have."',
      again: 'Saba, shelling beans beside Dawit.',
      options: [{ text: '(Leave them be.)', exit: true }],
    },
    hc_dead: {
      text: 'Saba at her wall, straightening a notice that has no reason to be straight any more: the Weighhouse is shut and nobody goes up. "You\'ve been up the hill," she says. "Everybody says. Did you see him? Dawit. He\'s tall. He hums."',
      again: '"Did you see him?"',
      options: [
        { id: 'saba.hc.tell', text: '(Tell her what you found on floor nine.)', effects: [{ set: 'hc_saba_told', value: 'truth' }], next: 'hc_told' },
        { id: 'saba.hc.lie', text: '(Tell her you didn\'t find him.)', effects: [{ set: 'hc_saba_told', value: 'lied' }], next: 'hc_lied' },
      ],
    },
    hc_told: {
      text: 'You tell her: a cold room, a column of labels with his number on every one, and what the Clinic floors did when the Skirts stopped sending. She listens with her hand flat on the notice. When you finish she takes it down, folds it in four, and puts it in her apron. "So it was us," she says. "Shutting the Weighhouse. That\'s what did it." She doesn\'t cry. "I\'d shut it again. I want you to know that. I\'d shut it again."',
      again: '"I\'d shut it again."',
      options: [{ text: '(Leave her.)', exit: true }],
    },
    hc_lied: {
      text: '"No." She straightens the notice. "No, well. It\'s a big hill." She will be standing at this wall for years. You know it, and you walk away anyway.',
      again: 'Saba at her wall.',
      options: [{ text: '(Leave her.)', exit: true }],
    },
    intro: {
      text: 'A woman straightening a notice on the wall that does not need straightening. "Have you been up the hill?" she says, before anything else. "Dawit. He\'s tall. He hums when he works. He went to the Weighhouse to clear his paper and they wrote that he\'s in service."',
      again: 'Saba, straightening her notice.',
      effects: [{ set: 'hs_saba_met' }, { learn: 'hs_saba_notice' }, { quest: 'q_hs_parts', start: true }],
      options: [{ id: 'saba.what', text: 'What happened?', next: 'what' }, bye],
    },
    again: {
      text: '"Anything?" Saba says. She already knows the answer from your face.',
      again: 'Saba waits.',
      options: [
        { id: 'saba.what2', text: 'What happened?', if: { not: { seen: 'saba.what' } }, next: 'what' },
        { id: 'saba.boots', text: 'Can I see the boots?', if: { all: [{ knows: 'hs_saba_boots' }, { not: { item: 'k_hs_boots' } }, PARTS_OPEN] }, next: 'boots' },
        { id: 'saba.tell', text: 'I know what service is.', if: { all: [{ knows: 'hs_yield_read' }, { not: { seen: 'saba.tell' } }] }, next: 'tell' },
        bye,
      ],
    },
    what: {
      text: '"His paper crossed the line after the winter. The cough took two months\' tally. You go to the Weighhouse when you cross the line; they weigh you and offer you service, and service clears it all, and the family gets a settlement." She says it like a lesson. "He went on a Tuesday. On the Friday the Window gave me forty scrip and his boots, cleaned. Nobody comes back from service. Everybody says they\'re in the gardens." She looks at the notice. "He would have written."',
      again: '"He would have written."',
      effects: [{ learn: 'hs_saba_boots' }, { learn: 'hs_service_rumour' }],
      options: [{ id: 'saba.boots.ask', text: 'Can I see the boots?', next: 'boots' }, { text: 'Something else.', next: 'again' }],
    },
    boots: {
      text: 'She brings them out of the shack: a miner\'s boots resoled twice, cleaner than any boot on the slope. "Take them," she says. "Find out. I can\'t look at them." Inside the left tongue there is a printed tag. You read it twice: 9-1182 — EFFECTS — RETURN TO KIN.',
      again: 'The boots, and the tag in the tongue.',
      effects: [{ give: 'k_hs_boots' }, { learn: 'hs_boots_tag' }, { lead: 'l_hs_boots' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    tell: {
      text: 'You tell her as gently as it can be told, which is not very. She doesn\'t sit down. She straightens the notice on the wall one more time, very carefully, and then she takes it down, and folds it, and puts it in her apron. "He hummed," she says. "Nobody up there will know what he hummed."',
      again: 'Saba, with the notice folded in her apron.',
      effects: [{ set: 'hs_saba_told' }],
      options: [bye],
    },
    exposed: { text: 'Saba on the step of her shack with Dawit\'s name chalked on the door. "They shut it," she says. "Three hundred people. I didn\'t know there were three hundred people who would." She looks up the hill. "It won\'t bring him down."', again: '"It won\'t bring him down."', options: [bye] },
  },
};

// ---------------------------------------------------------------- the Weighhouse: Dr Lisle, the door, the book, the ward

export const d_hs_weighdoor: DialogueDef = {
  id: 'd_hs_weighdoor', owner: 'narrator', start: [{ node: 'door' }],
  nodes: {
    door: {
      text: [
        { if: EXPOSED, text: 'The Weighhouse door, kicked in and nailed shut again from the outside with planks. WEIGHED written across the planks in somebody\'s blood or somebody\'s red paint, and under it a list of names that keeps getting longer.' },
        { text: 'A sign by the Weighhouse door in clinic-white enamel: WEIGHING — VOLUNTARY. SERVICE DISCHARGES ALL PAPER IN FULL (CLAUSE 31). SETTLEMENT TO KIN. And the iron deck of the old ore scale still set in the floor inside the door, so that everyone who comes in stands on it.' },
      ],
      again: 'The Weighhouse door.',
      effects: [{ learn: 'hs_clause31' }],
      options: [leave],
    },
  },
};

export const d_hs_lisle: DialogueDef = {
  id: 'd_hs_lisle', owner: 'npc_hs_07',
  start: [{ if: { flag: 'hs_lisle_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman in clinic white at a table by the scale deck, with a board of names and a pen she uses like a scalpel. "Sit. Breathe." Then she sees you are not from the bench. "Fittings are by appointment. Weighing is for paper that has crossed the line. Which are you?"',
      again: 'Dr Lisle, with her board of names.',
      effects: [{ set: 'hs_lisle_met' }, { learn: 'hs_weighhouse' }],
      options: [
        { id: 'lisle.what', text: 'What is the Weighhouse?', next: 'what' },
        { id: 'lisle.fit', text: 'Fittings.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        bye,
      ],
    },
    again: {
      text: [{ if: { knows: 'hs_yield_read' }, text: 'Dr Lisle looks up and, for the first time, puts the pen down. "You\'ve been reading," she says.' }, { text: '"Sit. Breathe," Dr Lisle says, to the bench, and then, to you: "Yes?"' }],
      again: 'Dr Lisle, with her pen.',
      options: [
        { id: 'lisle.what2', text: 'What is the Weighhouse?', if: { not: { seen: 'lisle.what' } }, next: 'what' },
        { id: 'lisle.service', text: 'What is Clinic service?', if: { all: [{ knows: 'hs_service' }, { not: { knows: 'hs_service_floors' } }] }, check: { skill: 'speech', dc: 50, mods: [{ if: { item: 'k_hs_boots' }, dc: -10, why: 'a pair of boots with a tag in the tongue' }] }, next: 'service', fail: 'service_no' },
        { id: 'lisle.boots', text: '(Put Dawit Mekonnen\'s boots on her table.) 9-1182.', if: { all: [{ item: 'k_hs_boots' }, { not: { seen: 'lisle.boots' } }] }, next: 'boots' },
        { id: 'lisle.yield', text: 'K, L, C, H. Kidney, liver, cornea, heart. You grade them.', if: { all: [{ knows: 'hs_yield_read' }, PARTS_OPEN] }, next: 'yield' },
        { id: 'lisle.nils', text: 'Nils Haber, in your ward.', if: { all: [{ knows: 'hs_nils_queued' }, { not: { flag: 'hs_nils' } }, { not: { seen: 'lisle.nils' } }] }, next: 'nils' },
        { id: 'lisle.fit2', text: 'Fittings.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        bye,
      ],
    },
    what: {
      text: '"When a contract\'s paper crosses the line, the holder is weighed: what they can still carry, what the contract can still yield." She says it the way she would say a dose. "Most go home with a schedule. Some are offered service. Service discharges the whole of the paper under Clause 31 and the family is settled. It is the only door out of the Skirts that opens." She caps the pen. "Nobody is made to walk through it."',
      again: '"The only door out of the Skirts that opens."',
      effects: [{ learn: 'hs_service' }],
      interject: [{ companion: NINE, text: '"Yield," Nine says. "A term of assessment." Its lens holds on her board. "I would like to see the schedule it is assessed against." Dr Lisle does not answer it.' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    service: {
      text: 'She looks at the bench, at the queue on it, and lowers her voice. "Service is on the Clinic floors. Floor nine. They go up on the freight car at two, asleep; it is kinder. I have never been up." She says the last part as if it were a defence. "I weigh. I don\'t ask what the scale is for. Someone has to stand between this bench and the Clean collecting the old way, and that someone is me."',
      again: '"I weigh. I don\'t ask what the scale is for."',
      effects: [{ learn: 'hs_service_floors' }, { lead: 'l_hs_floor_nine' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    service_no: { text: '"Service is service." She uncaps the pen. "Next."', again: '"Next."', options: [{ text: 'Something else.', next: 'again' }] },
    boots: { text: 'She looks at the tag and her face does something small and quickly put away. "Effects return to kin," she says. "That is in the contract. It is a kindness. Most contracts don\'t send anything back."', again: '"It is a kindness."', effects: [{ learn: 'hs_lisle_boots' }], options: [{ text: 'Something else.', next: 'again' }] },
    nils: { text: '"Haber. Twenty-two, a miner\'s lungs, no cough yet, a father\'s paper by transfer." She reads it off the board without needing to. "Queued. He\'s a good weight." She hears herself say it. "The paper decides. Not me."', again: '"The paper decides."', effects: [{ learn: 'hs_nils_queued' }], options: [{ text: 'Something else.', next: 'again' }] },
    yield: {
      text: 'She doesn\'t deny it. She closes the board. "Do you know what the Clean did before the Weighhouse?" Quietly. "They collected. Paper over the line, a family on the slope, and a cart in the morning. Now there is a bench, and a settlement, and the boots come home." She looks at you steadily. "Put it on the wall, if you like. They\'ll stop coming. The paper will still be over the line. And the cart will come back."',
      again: '"And the cart will come back."',
      effects: [{ learn: 'hs_lisle_case' }],
      options: [
        { id: 'lisle.pay', text: 'What\'s it worth to you that nobody reads it?', next: 'pay' },
        { id: 'lisle.favour', text: 'I\'ll keep it quiet. Take one name off your board: Nils Haber.', if: { all: [{ not: { flag: 'hs_nils' } }, { knows: 'hs_nils_queued' }] }, next: 'favour' },
        { id: 'lisle.fee', text: 'You pay for names, don\'t you?', next: 'fee' },
        { text: 'I\'ll think about it.', next: 'again' },
      ],
    },
    pay: {
      text: '"A hundred and fifty." Out of a drawer, in clean Halcyon notes. "For the book, and for the Skirts not to read what it wouldn\'t understand."',
      again: '"A hundred and fifty."',
      options: [
        { id: 'lisle.pay.yes', text: '(Take it.)', effects: [{ give: 'tolls', count: 150 }, { take: 'k_hs_weighbook' }, ...PARTS_COVERED('paid', 'You took a hundred and fifty from Dr Lisle to keep the Weighhouse book off the wall.')], next: 'covered' },
        { text: 'No.', next: 'again' },
      ],
    },
    favour: {
      text: 'A long silence. Then she rubs one name off the board with her thumb. "Haber walks," she says. "He was never weighed." She looks at you. "And you owe the Weighhouse a silence, and I owe you a door, when you go up. The Clinic floors know my name."',
      again: '"Haber walks."',
      effects: [...FREE_NILS, { set: 'hs_nils_how', value: 'favour' }, { set: 'hs_lisle_favour' }, ...PARTS_COVERED('favour', 'You kept the Weighhouse quiet for Dr Lisle, in exchange for Nils Haber\'s name off her board.')],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    fee: {
      text: '"A finder\'s fee." She doesn\'t blush. "A hundred, for a name that comes to the bench of its own accord. People do find each other. The Skirts is full of paper over the line."',
      again: '"A hundred, for a name."',
      options: [
        { id: 'lisle.fee.yes', text: '(Give her a name.)', effects: PARTS_PROFIT, next: 'fee_done' },
        { text: 'No.', next: 'again' },
      ],
    },
    fee_done: {
      text: 'She writes it on the board, and pays you, and turns back to the bench. "Sit," she says to the next one. "Breathe."',
      again: 'A new name on the board.',
      interject: [
        { companion: WREN, text: 'Wren is gone from the door before the notes are counted. You find her later on the platform, and she does not turn round.', effects: [A(WREN, -30)] },
        { companion: TAMSIN, text: 'Tamsin looks at you as if she has never seen you before. "Bits," she says. "You sold someone for bits."', effects: [A(TAMSIN, -30)] },
        { companion: ASH, text: 'Ash says nothing. It is the loudest thing he has ever said to you.', effects: [A(ASH, -20)] },
        { companion: ODILE, text: '"I sold paper on people for thirty years," Odile says. "I never once sold the person to the doctor." She buttons her coat.', effects: [A(ODILE, -20)] },
      ],
      options: [bye],
    },
    covered: { text: '"Thank you." She means it, which is the worst part. "Sit," she says to the bench. "Breathe."', again: '"Sit. Breathe."', options: [bye] },
  },
};

export const d_hs_weighbook: DialogueDef = {
  id: 'd_hs_weighbook', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: 'NAME — DEBT — YIELD — SERVICE. Two hundred lines in a clean hand. The yield column is four letters with a grade under each, K L C H, 1 to 3, and a dash where there is nothing to grade. MEKONNEN, D. — 212 — K2 L2 C1 H1 — CLINIC 9, R30. Under the last ruled line, in pencil, the queue: HABER, N. — 90 (TRANSFER, §9) — K1 L1 C1 H1 — QUEUED. And four more, each with a father or a mother under Six East.',
      again: 'NAME — DEBT — YIELD — SERVICE. K L C H.',
      effects: [{ learn: 'hs_weighbook_read' }, { learn: 'hs_nils_queued' }, { lead: 'l_hs_book' }],
      passives: [
        { skill: 'medicine', dc: 40, text: 'K, L, C, H: kidney, liver, cornea, heart. Graded the way a surgeon grades an organ for a recipient. A dash under H means the heart is no good. This is not a ledger of debts. It is a donor list.', effects: [{ learn: 'hs_yield_read' }, { lead: 'l_hs_yield' }] },
        { skill: 'science', dc: 45, text: 'Four letters, four grades, a dash for the unusable: an inventory, not an assessment. Of four things a body has one or two of. Kidney, liver, cornea, heart.', effects: [{ learn: 'hs_yield_read' }, { lead: 'l_hs_yield' }] },
      ],
      interject: [{ companion: KES, text: 'Kes reads over your shoulder and stops breathing for a second. "K L C H," she says. "I thought it was a pay grade." Her hand goes to the back of her neck. "My mother was on a board like this once. I thought it was a pay grade."' }],
      options: [{ text: '(Close it.)', exit: true }],
    },
  },
};

export const d_hs_nils: DialogueDef = {
  id: 'd_hs_nils', owner: 'npc_hs_09',
  start: [{ if: { flag: 'hs_nils', eq: 'freed' }, node: 'free' }, { if: { flag: 'hs_nils_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young man on a cot in the Weighhouse ward with his boots on, as if he might be leaving. "Haber," he says. "My father\'s under Six East. His paper came to me; that\'s the contract. Ninety over the line." He tries a smile. "They say service is up in the gardens. Orange trees."',
      again: 'Nils, on the cot, with his boots on.',
      effects: [{ set: 'hs_nils_met' }, { learn: 'hs_nils_queued' }],
      options: [{ id: 'nils.service', text: 'What do you think service is?', next: 'service' }, bye],
    },
    again: {
      text: 'Nils sits up on the cot. "Still here."',
      again: 'Nils, sitting up.',
      options: [
        { id: 'nils.service2', text: 'What do you think service is?', if: { not: { seen: 'nils.service' } }, next: 'service' },
        { id: 'nils.truth', text: 'I\'ve read the book. Service isn\'t the gardens.', if: { all: [{ knows: 'hs_yield_read' }, { not: { seen: 'nils.truth' } }] }, next: 'truth' },
        { id: 'nils.walk', text: 'Walk out with me. Now, while the door\'s asleep.', if: { all: [NIGHT, { not: { flag: 'hs_nils' } }] }, check: { skill: 'stealth', dc: 45, mods: [{ if: KES_IN, dc: -10, why: 'Kes blinds the ward\'s lens for a minute' }] }, effects: [...FREE_NILS, { set: 'hs_nils_how', value: 'walked' }, K(10), { decision: { id: 'hs_nils', text: 'You walked Nils Haber out of the Weighhouse ward at night.' } }], next: 'walked', fail: 'caught' },
        bye,
      ],
    },
    service: { text: '"Work. Up the hill. Clean work, gardens, orange trees." He looks at his boots. "Nobody writes back. They say that\'s because it\'s good up there and they forget us." He laughs. "I wouldn\'t forget."', again: '"I wouldn\'t forget."', options: [{ text: 'Something else.', next: 'again' }] },
    truth: { text: 'He listens, and when you have finished he takes his boots off, very slowly, and puts them side by side under the cot as if somebody would come to collect them. Then he puts them on again. "Get me out," he says. "Please."', again: '"Get me out."', options: [{ text: 'Something else.', next: 'again' }] },
    walked: { speaker: 'narrator', text: 'Past the sleeping cots, past the scale deck, past the Clean at the door who is looking at Cascade, and out into the cold. He doesn\'t stop until he is on Nursery among the shacks, and then he sits down in the mud and shakes.', again: 'Nils, on Nursery, shaking.', options: [leave] },
    caught: { text: '"Back on your cot." The Clean at the door, without looking round. Nils lies down again with his boots on.', again: 'Nils, lying down with his boots on.', options: [leave] },
    free: { text: 'Nils Haber on Nursery, splitting kindling for somebody else\'s stove. "Joran\'s boy," people call him. "My paper\'s nothing," he says. "First time in my life." He doesn\'t know what to do with his hands.', again: 'Nils, splitting kindling.', options: [bye] },
  },
};

export const d_hs_freight: DialogueDef = {
  id: 'd_hs_freight', owner: 'narrator', start: [{ if: { hour: { from: 1, to: 3 } }, node: 'two' }, { node: 'day' }],
  nodes: {
    day: { text: 'A gate in the fence at the top of the freight lane, and a board on it: FREIGHT — 02:00 — CONCERN CREW. The Concern runs its own freight on its own crew, strike or no strike. Crates on the dock behind the station, stencilled MEDICAL — COLD.', again: 'FREIGHT — 02:00.', effects: [{ learn: 'hs_freight_board' }], options: [leave] },
    two: {
      text: 'Two in the morning. The freight car comes down its track with no lamps lit and stops at the dock. Out of the Weighhouse\'s back door and up the lane come two of the Clean with a stretcher between them, and on it someone asleep under a white sheet with a tag on their wrist. Then another. They go into the freight car with the cold crates. A bag comes down off the car the other way and is put inside the Weighhouse\'s back door: a coat, a pair of boots.',
      again: 'The freight at two: stretchers up, a bag of effects down.',
      effects: [{ learn: 'hs_freight_seen' }, { lead: 'l_hs_freight' }],
      interject: [{ companion: NINE, text: '"I have watched the Precinct\'s carts take people who would not be counted," Nine says, very low. "They did not send the boots back." It does not say which is worse.' }],
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Lev Ostrander, the ripper (and where Kes's link can be cut)

export const d_hs_lev: DialogueDef = {
  id: 'd_hs_lev', owner: 'npc_hs_08',
  start: [{ if: { flag: 'hs_lev_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A shack with a surgeon\'s table in it, a good one, with a lamp on an arm and a tray of tools that are clean. The man at it is big and bearded and grey, and his hands are the steadiest thing on Nursery. "Lev. Dark work: no channel, no warranty, no Window." He looks at the back of your neck before he looks at your face. "What are you carrying?"',
      again: 'Lev at his table.',
      effects: [{ set: 'hs_lev_met' }],
      options: [
        { id: 'lev.fit', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        { id: 'lev.trade', text: 'Trade.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'lev.who', text: 'Where did you learn?', next: 'who' },
        bye,
      ],
    },
    again: {
      text: '"Sit still or I charge double," Lev says. "What?"',
      again: 'Lev waits.',
      options: [
        { id: 'lev.who2', text: 'Where did you learn?', if: { not: { seen: 'lev.who' } }, next: 'who' },
        { id: 'lev.yield', text: 'What does "yield" mean, on the Weighhouse\'s board?', if: { all: [{ any: [{ item: 'k_hs_weighbook' }, { item: 'k_hs_boots' }, { knows: 'hs_weighbook_read' }] }, { not: { knows: 'hs_yield_read' } }] }, next: 'yield' },
        { id: 'lev.kes', text: 'Can you take a Concern port out of somebody\'s neck without killing them?', if: KES_Q, next: 'kes' },
        { id: 'lev.fit2', text: 'Fit something.', effects: [{ event: 'surgery' }], exit: true, repeat: true },
        { id: 'lev.trade2', text: 'Trade.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        bye,
      ],
    },
    who: { text: '"Nine years an orderly on the Clinic floors. Carrying holdfast, mopping, holding things still." He turns a clamp over. "I left the week I understood what I was holding still. Now I fit what people can bear and drink less than I did." He looks up. "Most weeks."', again: '"Nine years. Most weeks."', effects: [{ learn: 'hs_lev_floors' }], options: [{ text: 'Something else.', next: 'again' }] },
    yield: {
      text: 'He doesn\'t need to look at the book. "K, L, C, H. Kidney, liver, cornea, heart, graded one to three for match and wear." He sets the clamp down. "Nobody up there needs a whole Skirts body. They need it in pieces, and fresh, and the pieces go to the people who can pay to stay the age they are." He wipes his hands although they are clean. "I don\'t know whose. I carried holdfast. I didn\'t read the charts."',
      again: '"Nobody up there needs a whole Skirts body."',
      effects: [{ learn: 'hs_yield_read' }, { lead: 'l_hs_yield' }],
      interject: [{ companion: ASH, text: 'Ash puts a hand flat on the shack wall as if the floor had moved. "They take the dead for the sky at Openfield," he says. "This is the other thing."' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    kes: {
      text: 'Lev looks at Kes the way he looked at the back of your neck. "Lattice port. Window issue." He touches the cable at her nape with one finger and she doesn\'t flinch, which costs her. "It\'s in the top of the spine. Cut a live channel and it takes the person with it: that\'s the Scald\'s lesson, and the Pale\'s, and anyone who\'s held a hand while it went." He sets out the tray. "Somebody holds the channel quiet while I cut. If they hold it, she walks out blind on the grid and free. If they don\'t, she walks out and has fits. I don\'t lose people on this table."',
      again: 'Lev, with the tray set out.',
      effects: [{ learn: 'kes_cut_possible' }],
      options: [
        { id: 'lev.kes.cut', text: '(Hold the channel while he cuts.)', check: { skill: 'medicine', dc: 45, mods: [{ if: { knows: 'kes_ash_word' }, dc: -10, why: 'Ash\'s word: burn the channel first, then cut' }, { if: { item: 'u_holdfast' }, dc: -5, why: 'holdfast in the pack' }] }, effects: LINK('cut', 'Lev Ostrander cut the Concern\'s port out of Kes\'s neck at his table, with you holding the channel. She walked out free.', [K(10)]), next: 'cut', fail: 'fits', failEffects: LINK('cut', 'Lev Ostrander cut the Concern\'s port out of Kes\'s neck. The channel slipped in your hands; she lives, and has fits now.', [{ set: 'kes_fits' }, K(5)]) },
        { text: 'Not today.', next: 'again' },
      ],
    },
    cut: { text: 'An hour. Her hand on your wrist the whole time, hard enough to bruise. Then a small wet sound and Lev drops something the size of a coin into a dish, with a tail of fine wire. Kes sits up. She puts her hand to the back of her neck, where there is a dressing now and nothing else. "It\'s quiet," she says, astonished. "It\'s so quiet."', again: 'The dish, and the coin in it with its wire tail.', options: [bye] },
    fits: { text: 'Halfway through, the channel jumps under your hands and her whole body goes rigid on the table, and Lev says something you don\'t catch and keeps cutting. The port comes out. Kes lives. That night at the fire she has her first fit, and you hold her head off the ground until it passes. "Worth it," she says after, with her teeth still chattering. "Obviously. Ask me again tomorrow."', again: 'The dish, and her hand shaking.', options: [bye] },
  },
};

// ---------------------------------------------------------------- Scrip: the changer, the board, Ama Owusu

export const d_hs_ama: DialogueDef = {
  id: 'd_hs_ama', owner: 'npc_hs_12',
  start: [{ if: { flag: 'hs_scrip', eq: 'cut' }, node: 'cut' }, { if: { flag: 'hs_ama_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman on the platform beside the changer\'s booth with two children asleep on the bags and a tea tin held in both hands. "Two years," she says, not to you exactly. "A hundred scrip. The Line to Meridian is twenty-five a head, Tolls, and there are three of us." She opens the tin to show you: tens, tied with string. "He changes at six. That\'s sixteen." She closes it. "Meridian has schools. That\'s all I know about Meridian."',
      again: 'Ama, the tin, the children asleep on the bags.',
      effects: [{ set: 'hs_ama_met' }, { learn: 'hs_ama_story' }, { quest: 'q_hs_scrip', start: true }],
      interject: [{ companion: ODILE, text: '"Six to one," Odile says, mostly to herself. She is looking at the booth\'s board the way she looks at a sheet. "My dear, I priced that spread on a slate at Ninebridge in the year the bridge had eight spans."', effects: [{ learn: 'odile_spread' }] }],
      options: [
        { id: 'ama.see', text: 'Let me see what the changer can do.', exit: true },
        { id: 'ama.pay', text: '(Give her the difference. 59 Tolls.)', if: TOLLS(59), effects: [{ take: 'tolls', count: 59 }, ...SCRIP('paid', 'pocket', 'You paid the difference on Ama Owusu\'s fares yourself. Her family went down the Line.', [K(2), { xp: 60 }])], next: 'paid' },
      ],
    },
    again: {
      text: '"Anything?" Ama says. The children are awake now and watching you.',
      again: 'Ama waits with the tin.',
      options: [
        { id: 'ama.pay2', text: '(Give her the difference. 59 Tolls.)', if: { all: [TOLLS(59), SCRIP_OPEN] }, effects: [{ take: 'tolls', count: 59 }, ...SCRIP('paid', 'pocket', 'You paid the difference on Ama Owusu\'s fares yourself. Her family went down the Line.', [K(2), { xp: 60 }])], next: 'paid' },
        bye,
      ],
    },
    paid: { text: 'She looks at the Tolls for a long time before she takes them. "I\'ll pay it back," she says, which you both know she won\'t be able to. "Seven o\'clock." She wakes the children.', again: 'Ama and the children, waiting for seven.', options: [bye] },
    cut: { text: 'Ama, on the platform with the tin. "Sixteen," she says. "I\'ll save for another year." She doesn\'t look at the booth, or at you.', again: '"Another year."', options: [bye] },
  },
};

export const d_hs_vulpe: DialogueDef = {
  id: 'd_hs_vulpe', owner: 'npc_hs_11',
  start: [{ if: { flag: 'hs_scrip', eq: 'forged' }, node: 'ruined' }, { if: { flag: 'hs_vulpe_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a booth with a counter, a cash box and a board, and a guild ticket pinned to his coat. "Six to one, scrip to Tolls. Four to one the other way." He taps the board. "I don\'t set it. I read it."',
      again: 'Vulpe, and his board.',
      effects: [{ set: 'hs_vulpe_met' }, { learn: 'hs_spread' }],
      options: [{ id: 'vulpe.who', text: 'Who sets it?', next: 'who' }, bye],
    },
    again: {
      text: [{ if: { flag: 'hs_vulpe_docked' }, text: '"Docked a week," Vulpe says, without looking up. "For one change at par. The guild doesn\'t miss a thing." He reads the board. "Six to one."' }, { text: '"Six to one," Vulpe says.' }],
      again: 'Vulpe, and his board.',
      options: [
        { id: 'vulpe.who2', text: 'Who sets the rate?', if: { not: { seen: 'vulpe.who' } }, next: 'who' },
        { id: 'vulpe.book', text: 'Show me your ledger.', if: { not: { knows: 'hs_par' } }, check: { skill: 'barter', dc: 40, mods: [{ if: { knows: 'odile_spread' }, dc: -10, why: 'Odile knows what a changer\'s book looks like' }] }, next: 'book', fail: 'book_no', once: true },
        { id: 'vulpe.par', text: 'Change Ama Owusu\'s tin at par.', if: { all: [{ knows: 'hs_ama_story' }, SCRIP_OPEN] }, check: { skill: 'barter', dc: 50, mods: [{ if: { knows: 'hs_par' }, dc: -10, why: 'you know his book has a par column' }, { if: { item: 'k_hs_ratebook' }, dc: -15, why: 'his own ledger, open on his counter' }, { if: { inParty: ODILE }, dc: -15, why: 'Odile reads him his own par column, line by line' }] }, effects: SCRIP_PAR('barter'), next: 'par', fail: 'par_no' },
        { id: 'vulpe.threat', text: 'Change it at par, or the Shift reads your par column on the wall on Cascade.', if: { all: [{ knows: 'hs_ama_story' }, { knows: 'hs_par' }, SCRIP_OPEN] }, check: { skill: 'speech', dc: 45, mods: [{ if: SHIFT_WON, dc: -10, why: 'the Shift has just won a claim against the Concern' }, { if: { flag: 'hs_shift', eq: 'broken' }, dc: 15, why: 'the Shift is broken and he knows it' }] }, effects: SCRIP_PAR('threat'), next: 'par', fail: 'par_no' },
        { id: 'vulpe.cut', text: 'What would you pay me to send travellers your way?', if: { all: [{ knows: 'hs_par' }, SCRIP_OPEN] }, next: 'cut' },
        bye,
      ],
    },
    who: {
      text: '"The board comes up the Line every week from Ninebridge, under the Exchange\'s seal." He turns it so you can see the wax. "Scrip is the Concern\'s; Tolls are the guild\'s; I\'m the hole in the fence between them." He shrugs. "I\'m on a guild ticket. I owe them more than you\'d think."',
      again: '"The Exchange\'s seal."',
      effects: [{ learn: 'hs_seal' }, { lead: 'l_hs_seal' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    book: {
      text: 'He hesitates, then opens it, because nobody has asked him in two years and it is a beautiful book. Every change, scrip in, Tolls out, at the week\'s rate. And down the margin, ruled in red, a column headed PAR that never moves: one to one. "That\'s what the guild takes it at," he says, quietly, "from the Concern. On the floor." He shuts it. "Six to one is what the Skirts gets."',
      again: 'PAR, one to one, in red.',
      effects: [{ learn: 'hs_par' }, { lead: 'l_hs_par' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    book_no: { text: '"Ledgers are private." He puts his elbow on it.', again: 'His elbow on the ledger.', options: [{ text: 'Something else.', next: 'again' }] },
    par: { text: 'He changes it at par: a hundred scrip, a hundred Tolls, out of the cash box, slowly, as if every Toll were a tooth. "The guild will dock me the difference," he says. "A week. Maybe two." He doesn\'t look at Ama when she takes it. She looks at him, though, for a long time.', again: 'A hundred Tolls, counted out like teeth.', interject: [{ companion: ODILE, text: '"Par," Odile says, and puts her glasses back on. "My dear, I have waited a long time to see someone say that word at a booth and mean it."', effects: [A(ODILE, 5)] }], options: [bye] },
    par_no: { text: '"Six to one." He doesn\'t move. "Take it up with Ninebridge."', again: '"Take it up with Ninebridge."', options: [{ text: 'Something else.', next: 'again' }] },
    cut: {
      text: '"One in ten." He says it without looking up, like the rate. "Anyone you send me with scrip to change, I give you one Toll in ten of what I take. Thirty now, for the woman with the tin, if she changes with me today."',
      again: '"One in ten."',
      options: [
        { id: 'vulpe.cut.yes', text: '(Take it. Send Ama to change at six.)', effects: SCRIP('cut', 'cut', 'You took the changer\'s cut and sent Ama Owusu to change her savings at six to one.', [{ give: 'tolls', count: 30 }, K(-10)]), next: 'cut_done' },
        { text: 'No.', next: 'again' },
      ],
    },
    cut_done: { text: 'Thirty Tolls across the counter. In the afternoon Ama changes her tin at the booth, and counts sixteen, and sits back down on the bags.', again: 'Sixteen.', interject: [{ companion: ODILE, text: 'Odile watches the woman count sixteen. "That is how I started," she says. "One in ten." She does not say anything else.', effects: [A(ODILE, -5)] }], options: [bye] },
    ruined: { text: 'The booth is shut. A guild man came up the Line and took the board, the box and Vulpe\'s ticket. Vulpe sits on the platform\'s edge with his ledger on his knees. "One day at par," he says. "Everyone on the slope changed everything they had. I\'ll be paying it back to the guild till I die." He almost laughs. "Best day the booth ever had."', again: 'Vulpe, with his ledger, on the platform\'s edge.', options: [bye] },
  },
};

export const d_hs_rates: DialogueDef = {
  id: 'd_hs_rates', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: [
        { if: { flag: 'hs_scrip', eq: 'forged' }, text: 'The rate board is gone. A rectangle of cleaner wood where it hung, and chalk: PAR. ONE DAY. WE REMEMBER.' },
        { text: 'THE CHANGE — THIS WEEK — SCRIP TO TOLLS 6:1 — TOLLS TO SCRIP 1:4. Painted on a board under glass, with the Exchange\'s wax seal on a ribbon across the corner: the Grand Factor\'s office, Ninebridge.' },
      ],
      again: 'The rate board.',
      effects: [{ learn: 'hs_seal' }, { lead: 'l_hs_seal' }],
      options: [
        { id: 'rates.forge.kes', text: '(Kes: "Obviously the glass is a screen. Give me the night.")', if: { all: [KES_IN, { knows: 'hs_ama_story' }, SCRIP_OPEN] }, effects: SCRIP('forged', 'kes', 'Kes re-sealed the changer\'s board at par for a day. Everyone on the slope changed everything they had.', [{ set: 'hs_guild_man' }, { set: 'hs_prices_up' }, K(5), { xp: 120 }, { news: { tag: 'hs_scrip_forged', text: 'the rate board at Two-Twelve read PAR for one day under the Exchange\'s own seal; the guild sent a man up the Line', valence: 4, size: 6, at: 'skirts' } }]), next: 'forged' },
        { id: 'rates.forge', text: '(Lift the glass, and the seal with it, and re-paint the rate at par.)', if: { all: [{ not: KES_IN }, { knows: 'hs_ama_story' }, SCRIP_OPEN, NIGHT] }, check: { skill: 'science', dc: 50 }, effects: SCRIP('forged', 'hand', 'You re-sealed the changer\'s board at par for a day. Everyone on the slope changed everything they had.', [{ set: 'hs_guild_man' }, { set: 'hs_prices_up' }, K(5), { xp: 120 }, { news: { tag: 'hs_scrip_forged', text: 'the rate board at Two-Twelve read PAR for one day under the Exchange\'s own seal; the guild sent a man up the Line', valence: 4, size: 6, at: 'skirts' } }]), next: 'forged', fail: 'forge_no', once: true },
        leave,
      ],
    },
    forged: { speaker: 'narrator', text: 'In the morning the board says PAR under the Exchange\'s own seal, and by noon there is a line from the booth to the Lodge. Ama Owusu changes her hundred first. Vulpe changes until the box is empty and then sits down. The next Line brings a guild man with a cane, who takes the board, the box and Vulpe\'s ticket, and goes back down on the seven o\'clock. Provision\'s prices go up the same afternoon.', again: 'A line from the booth to the Lodge.', options: [leave] },
    forge_no: { text: 'The seal\'s wax cracks under your thumb in the wrong place. You put the glass back before anyone looks. It will not take a second try.', again: 'The cracked seal.', options: [leave] },
  },
};

// ---------------------------------------------------------------- Provision, Lampblack, the Pond, the shack, the Window's exchange

export const d_hs_prices: DialogueDef = {
  id: 'd_hs_prices', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: [
        { if: { any: [KES_IN, { chrome: 'ch_eye_concern' }] }, text: 'Provision\'s price board: a lit screen of what things cost in scrip. And over it, faint, an overlay you were not meant to see: every price shifts by a few points as each customer steps up to the counter, a little higher for the ones whose Window balance is deep. The deeper the paper, the dearer the bread.' },
        { if: { flag: 'hs_prices_up' }, text: 'Provision\'s price board: a lit screen of what things cost in scrip, and every price on it higher than last week. Somebody has scratched UP into the frame.' },
        { text: 'Provision\'s price board: a lit screen of what things cost in scrip. The prices flicker now and then, by a point or two, as people step up to the counter.' },
      ],
      again: 'Provision\'s price board.',
      effects: [{ learn: 'hs_prices_seen' }],
      interject: [{ companion: KES, text: '"I keep that board running," Kes says. "Obviously I know what it does. Everybody pays the board. The board reads your paper." She looks at the counter. "Mercy pays it too."', effects: [{ learn: 'hs_price_overlay' }, { lead: 'l_hs_overlay' }] }],
      options: [leave],
    },
  },
};

export const d_hs_mercy: DialogueDef = {
  id: 'd_hs_mercy', owner: 'npc_hs_17',
  start: [{ if: { flag: 'hs_mercy_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman behind Provision\'s counter in a company apron, who looks as tired as the people she sells to. "Provision. Prices on the board." She glances at your hands. "Outsiders pay in Tolls, at the outsider\'s price. Don\'t look at me like that. I pay the same board."',
      again: 'Mercy, behind the counter.',
      effects: [{ set: 'hs_mercy_met' }],
      options: [{ id: 'mercy.trade', text: 'Let\'s see what you have.', effects: [{ event: 'barter' }], exit: true, repeat: true }, bye],
    },
    again: {
      text: [{ if: { flag: 'hs_prices_up' }, text: '"Up again," Mercy says. "Don\'t ask me why. You know why."' }, { text: '"Provision," Mercy says.' }],
      again: 'Mercy waits.',
      options: [
        { id: 'mercy.trade2', text: 'Let\'s see what you have.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'mercy.board', text: 'The board reads everybody\'s paper and prices them by it.', if: { all: [{ knows: 'hs_price_overlay' }, { not: { seen: 'mercy.board' } }] }, next: 'board' },
        bye,
      ],
    },
    board: { text: '"Course it does." She doesn\'t lower her voice. "Twelve years behind this counter. You think I can\'t see the numbers jump when Ewa Kowal\'s widow steps up?" She stacks tins. "I\'m two years from clear. Then I\'ll say it at the Lodge. Not before."', again: '"Two years from clear."', effects: [{ learn: 'hs_mercy_board' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_hs_rosa: DialogueDef = {
  id: 'd_hs_rosa', owner: 'npc_hs_15',
  start: [{ if: { flag: 'hs_rosa_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A container fitted out as a bar, coal dust in every crease, a stove, a counter, and a woman behind it with a long plait and forearms like a miner\'s. "Lampblack. Coal dust and a door that shuts." She pours before you ask. "Strike pours are half. You\'re not on strike. The Dust table\'s open if you\'ve something you\'d miss."',
      again: 'Rosa, pouring.',
      effects: [{ set: 'hs_rosa_met' }],
      options: [{ id: 'rosa.drink', text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true }, { id: 'rosa.talk', text: 'What\'s the talk?', next: 'talk' }, bye],
    },
    again: {
      text: '"Back," Rosa says. "Pour, play, or talk?"',
      again: 'Rosa waits with the bottle.',
      options: [
        { id: 'rosa.drink2', text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'rosa.dust10', text: 'Ten the hand.', if: TOLLS(10), effects: [{ event: 'dust', data: { stake: 10 } }], exit: true, repeat: true },
        { id: 'rosa.dust30', text: 'The high table.', if: TOLLS(30), effects: [{ event: 'dust', data: { stake: 30 } }], exit: true, repeat: true },
        { id: 'rosa.talk2', text: 'What\'s the talk?', if: { not: { seen: 'rosa.talk' } }, next: 'talk' },
        { id: 'rosa.rafe', text: 'Rafe Ansel.', if: { all: [{ knows: 'hs_rosa_rafe' }, { not: { seen: 'rosa.rafe' } }] }, next: 'rafe' },
        { id: 'rosa.kes', text: 'Who\'s K?', if: { all: [{ knows: 'kes_hail' }, { not: { flag: 'kes_met' } }, { not: { seen: 'rosa.kes' } }] }, next: 'kes' },
        bye,
      ],
    },
    talk: { text: '"Strike. Always the strike." She wipes the counter. "Maren says hold. Rafe drinks here less than he did and talks less than that, which with Rafe means something. And the Weighhouse had a busy month." She doesn\'t say anything about the Weighhouse. She doesn\'t need to.', again: '"Strike. Always the strike."', effects: [{ learn: 'hs_rosa_rafe' }], options: [{ text: 'Something else.', next: 'again' }] },
    rafe: { text: '"Six cases out of the magazine." Very quietly, wiping the same place on the counter. "Orrin counts them every night; he told me, and I\'m telling you, and now it\'s three of us and that\'s too many." She looks at the door. "Rafe means the car. He says it in here when he\'s had two."', again: '"Rafe means the car."', effects: [{ learn: 'hs_rafe_powder' }, { lead: 'l_hs_powder' }], options: [{ text: 'Something else.', next: 'again' }] },
    kes: { text: '"Kes?" Rosa laughs. "The Window\'s girl. Fixes their lenses and their boards. Drinks here at six, sits in the corner, says \'obviously\' at everybody. If she\'s writing on the Line board she likes you." She pours. "Or she wants something. With Kes it\'s both."', again: '"With Kes it\'s both."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

const PIT = { pit: { win: [{ set: 'hs_bout_won' }, { inc: 'hs_bouts_won' }, { give: 'tolls', count: 45 }], lose: [{ set: 'hs_bout_lost' }, { inc: 'hs_bouts_lost' }] } };

export const d_hs_baek: DialogueDef = {
  id: 'd_hs_baek', owner: 'npc_hs_16',
  start: [{ if: { flag: 'hs_baek_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in the middle of the dry pond with his shirt off and his knuckles taped, and on his right arm, from the elbow down, a company limb in grey composite with a lamp-tag number on it. He sees you look. "No chrome in the Pond. The Pond\'s rule." He holds the arm up. "This one they switch off for me, when I\'m behind on the Window. Saves me the trouble." He grins with a split lip. "Twenty on yourself, forty-five back if you win."',
      again: 'Baek, in the middle of the pond.',
      effects: [{ set: 'hs_baek_met' }, { learn: 'hs_arm_numbed' }, { lead: 'l_hs_numbed' }],
      options: [{ id: 'baek.fight', text: '(Fight. 20 Tolls on yourself.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { event: 'fight', data: PIT }], exit: true, repeat: true }, { id: 'baek.arm', text: 'They switch your arm off?', next: 'arm' }, bye],
    },
    again: {
      text: [{ if: { flag: 'hs_bout_won' }, text: '"You again." Baek rolls his good shoulder. "Lucky. Again?"' }, { text: '"Again?" Baek says.' }],
      again: 'Baek waits.',
      options: [
        { id: 'baek.fight2', text: '(Fight. 20 Tolls on yourself.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { event: 'fight', data: PIT }], exit: true, repeat: true },
        { id: 'baek.arm2', text: 'They switch your arm off?', if: { not: { seen: 'baek.arm' } }, next: 'arm' },
        bye,
      ],
    },
    arm: {
      text: '"Hauler arm, company issue. Fitted at the Weighhouse when I was nineteen, against the paper." He flexes the fingers; they move, slow. "Fall behind on the Window and one morning it\'s dead to the shoulder. Pay the Window and it wakes up. Nobody touches it. Nobody has to." He shrugs. "Everybody in the Skirts with company chrome knows. Nobody says. What would you say?"',
      again: '"What would you say?"',
      effects: [{ learn: 'hs_leash_rumour' }],
      interject: [{ companion: KES, text: 'Kes looks at the arm and then away, fast. "Obviously," she says, and nothing else, and her hand is at the back of her neck.' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_hs_pond_slate: DialogueDef = {
  id: 'd_hs_pond_slate', owner: 'narrator', start: [{ node: 'slate' }],
  nodes: {
    slate: {
      text: 'A slate on a post at the Pond\'s mouth: THE POND — FISTS ONLY — NO CHROME — NOBODY DIES. BAEK: 41. And under it a list of everyone who has lasted three rounds with him, which is short, and everyone who has beaten him, which is shorter.',
      again: 'THE POND — FISTS ONLY — NO CHROME — NOBODY DIES.',
      options: [leave],
    },
  },
};

export const d_hs_shack: DialogueDef = {
  id: 'd_hs_shack', owner: 'narrator', start: [{ if: { flag: 'hs_shack_rented' }, node: 'mine' }, { node: 'let' }],
  nodes: {
    let: {
      text: 'A shack on Nursery with a padlock and a card in the window: TO LET. ASK ANYONE. A bed, a stove, a locker, a window that looks up at the gardens\' glow. Somebody on the next step says thirty Tolls and it\'s yours as long as you like, and nobody from the Window comes in.',
      again: 'TO LET. Thirty Tolls.',
      options: [
        { id: 'shack.rent', text: '(Pay thirty Tolls.)', if: TOLLS(30), effects: [{ take: 'tolls', count: 30 }, { set: 'hs_shack_rented' }, { decision: { id: 'hs_shack', text: 'You rented a shack on Nursery in the Skirts.' } }], next: 'mine' },
        leave,
      ],
    },
    mine: {
      text: 'Your shack on Nursery: the bed, the stove, the locker, the window up at the gardens\' glow, and the cough from next door through the wall.',
      again: 'Your shack on Nursery.',
      options: [{ id: 'shack.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave],
    },
  },
};

export const d_hs_grid: DialogueDef = {
  id: 'd_hs_grid', owner: 'narrator', start: [{ if: KES_IN, node: 'kes' }, { if: GRID_CHROME, node: 'jack' }, { node: 'locked' }],
  nodes: {
    locked: { text: 'A terminal in a steel cabinet behind the Window\'s counter, with a lens on top and a plate: GRID-HAND ONLY. The lens looks at you and the screen stays dark.', again: 'GRID-HAND ONLY.', options: [leave] },
    jack: {
      text: 'A terminal in a steel cabinet behind the Window\'s counter, GRID-HAND ONLY. Your port warms when you get near it. The Window\'s grid is there, under the glass, a whole town\'s paper laid out like a field.',
      again: 'The Window\'s grid, under the glass.',
      options: [
        { id: 'grid.jack.order', text: '(Think your way into Number Six\'s work orders.)', if: { all: [{ not: { item: 'k_hs_order' } }, { knows: 'hs_six_story' }] }, check: { skill: 'science', dc: 50 }, effects: [{ give: 'k_hs_order' }, { learn: 'hs_robbed' }], next: 'order', fail: 'jack_no', once: true },
        leave,
      ],
    },
    jack_no: { text: 'The grid notices you a moment before you find the drawer you want, and the screen goes dark. The lens on top of the cabinet turns, slowly, to look at you.', again: 'The dark screen.', options: [leave] },
    order: { text: 'PILLARS 14–22 — RETREAT MINING AUTHORISED TO QUARTER TONNAGE. STEWARD\'S OBJECTION NOTED. The Window keeps everything. The printer under the counter hums and gives it to you warm.', again: 'The printer, humming.', options: [leave] },
    kes: {
      text: 'Kes leans on the steel cabinet like a woman leaning on her own front door. "My desk," she says. "Obviously." The lens on top of it turns away from both of you without being asked.',
      again: 'Kes at the Window\'s exchange, the lens looking politely elsewhere.',
      options: [
        { id: 'grid.kes.order', text: 'Number Six\'s work orders. Dysart\'s.', if: { all: [{ not: { item: 'k_hs_order' } }, { knows: 'hs_six_story' }] }, once: true, effects: [{ give: 'k_hs_order' }, { learn: 'hs_robbed' }, K(2)], next: 'kes_order' },
        { id: 'grid.kes.book', text: 'The Weighhouse\'s book.', if: { all: [{ not: { item: 'k_hs_weighbook' } }, { knows: 'hs_service' }] }, once: true, effects: [{ give: 'k_hs_weighbook' }, K(2)], next: 'kes_book' },
        { id: 'grid.kes.citizen', text: 'Write me a citizen\'s contract. One the hill will believe.', if: { not: { flag: 'hc_contract' } }, effects: [{ give: 'k_hc_contract_forged' }, { set: 'hc_contract', value: 'infiltrator' }, { quest: 'q_hc_contract', start: true }, { decision: { id: 'hc_contract', text: 'Kes wrote you into the Window as a citizen who does not exist.' } }, K(3)], next: 'kes_citizen' },
        { id: 'grid.kes.prices', text: 'Provision\'s board. What does it read?', if: { not: { knows: 'hs_price_overlay' } }, effects: [{ learn: 'hs_price_overlay' }, { lead: 'l_hs_overlay' }], next: 'kes_prices' },
        { id: 'grid.kes.dark', text: 'Your link. Turn it dark for good, from in here.', if: { all: [KES_Q, NIGHT, { not: { flag: 'kes_dark_failed' } }] }, check: { skill: 'science', dc: 50, mods: [{ if: GRID_CHROME, dc: -15, why: 'your own port: you can ride in beside her' }, { if: { approval: { companion: KES, gte: 50 } }, dc: -5, why: 'she trusts your hands in her head' }] }, effects: LINK('dark', 'You and Kes turned the Concern\'s backdoor on her own port for good, from the Window\'s exchange. She is dark to Halcyon, and keeps her sight.', [K(10)]), next: 'kes_dark', fail: 'kes_dark_fail', failEffects: [{ set: 'kes_dark_failed' }, { set: 'hs_window_alert' }] },
        leave,
      ],
    },
    kes_order: { text: 'Her fingers go into the cabinet\'s guts and something clicks behind her eyes. "Paper\'s paper. The Window keeps everything, because nobody up there thinks anybody down here can read." The printer under the counter hums. PILLARS 14–22 — RETREAT MINING AUTHORISED. "There," she says. "Obviously."', again: 'The printer, humming.', options: [{ text: 'Something else.', next: 'kes' }] },
    kes_book: { text: '"Weighhouse." Her face goes still. "I keep that board too." The printer hums for a long time. She hands you the pages without reading them and doesn\'t look at you while you do.', again: 'Pages, warm from the printer.', options: [{ text: 'Something else.', next: 'kes' }] },
    kes_prices: { text: '"Provision reads your Window balance off your lamp tag when you step up to the counter and moves the price a few points. Deeper paper, dearer bread." She says it flat. "I keep it running. If I don\'t, they send someone who\'ll keep it running worse."', again: '"Deeper paper, dearer bread."', options: [{ text: 'Something else.', next: 'kes' }] },
    kes_dark: { text: 'You go in beside her, or she takes you in; there is no telling. The Window\'s grid like a field at night, and in it a single channel, lit, running up the hill: hers. She takes it in both hands, so to speak, and turns it round, and the light goes out of it. When you are back in the cabinet\'s hum she is crying without noticing. "Nobody," she says. "Nobody\'s looking. For good." Then: "Obviously I\'m not crying."', again: 'Kes, not crying.', options: [{ text: 'Something else.', next: 'kes' }] },
    kes_citizen: { text: '"Citizen." Kes\'s fingers go into the cabinet\'s guts. "Face. A number nobody\'s got. Fitted last spring at the gate, very brave, no complications." The printer under the counter hums for a long time and gives you forty pages, warm, the Window\'s own print on the Window\'s own stock. "Every lens on the hill will believe that," she says. "Obviously don\'t let a person read it."', again: 'Forty warm pages.', options: [{ text: 'Something else.', next: 'kes' }] },
    kes_dark_fail: { text: 'Halfway round, something on the hill notices. Kes rips out of the cabinet so fast she cuts her hand on its edge. "Bricked," she says. "They\'ve put a watch on the Window. That door\'s shut." She sucks the cut. "Other doors."', again: '"That door\'s shut."', options: [{ text: 'Something else.', next: 'kes' }] },
  },
};

export const PARTS_DIALOGUES: DialogueDef[] = [
  d_hs_notice, d_hs_saba, d_hs_weighdoor, d_hs_lisle, d_hs_weighbook, d_hs_nils, d_hs_freight, d_hs_lev, d_hs_ama, d_hs_vulpe, d_hs_rates,
  d_hs_prices, d_hs_mercy, d_hs_rosa, d_hs_baek, d_hs_pond_slate, d_hs_shack, d_hs_grid,
];
