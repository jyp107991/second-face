import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import { DOCKS_ANSWER, DOCKS_ASK } from './md_docks';
import { LOWE_CAR_NODES, LOWE_CAR_START, REYES_CAR_NODES, REYES_CAR_START } from './a3_road';

/**
 * Meridian, the Precinct: the gate and the lens, the hearing, the cells, the records office and the assessor who
 * keeps the file — and a tram platform where the rest of the city starts.
 */

/** Companions who can reach Meridian's Precinct with the player in Act 2 (U7 interjections): the five from the road, and
 * Nine once it has left the records office with them. */
const TAMSIN = 'npc_c9_03';
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const ODILE = 'npc_nb_03';
const ASH = 'npc_of_03';
const NINE = 'npc_md_nine';
/** Ash, when the file's designation is taken in front of him. */
const ASH_DESIGNATE = { companion: ASH, text: '"Designate," Ash says, and nothing else. When you look round he is looking at the card in your hand the way he looks at a grave he has not finished digging.' };

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 22, to: 5 } };
// The Broker's board at Old Market: a sealed letter for the captain, by hand.
const GIG_LETTER: Cond = { all: [{ item: 'k_gig_letter' }, { quest: 'q_gig_letter' }] };
/** Old Market's standpipe queue is holding while you bring the captain the count. */
const RIOT_COUNT: Cond = { all: [{ flag: 'mk_riot_lowe_pending' }, { not: { flag: 'mk_riot_outcome' } }] };
/** The Sink's relief schedule, in hand, with the spring still undecided (High Water). */
const PUMPS_PAPER: Cond = { all: [{ item: 'k_sk_schedule' }, { not: { flag: 'sk_pumps' } }] };
/** The Saints' girl has been heard and nobody has decided her yet (Static). */
const STATIC_GIRL: Cond = { all: [{ knows: 'bw_immy_heard' }, { not: { flag: 'bw_static' } }] };
/** The photograph's date, not yet read for what it is (q_a2_calendar, B3.11). */
const CAL_OPEN: Cond = { all: [{ item: 'k_photo' }, { not: { knows: 'cal_future' } }] };
/** The Archive Spire and the Court (B3.11): what Captain Lowe hears of them. */
const LOWE_SPIRE = (sfx: string): OptionDef[] => [
  { id: `lowe.cup${sfx}`, text: 'The Crown\'s hostess died at her own toast. The wardens called it lawful.', if: { all: [{ flag: 'cr_celestine_dead' }, { not: { any: [{ seen: 'lowe.cup' }, { seen: 'lowe.cup.again' }] } }] }, next: 'cup' },
  { id: `lowe.tap${sfx}`, text: 'The girl from the Saints\' tower. What does she say in your cell?', if: { all: [{ flag: 'bw_static', eq: 'silenced' }, { not: { any: [{ seen: 'lowe.tap' }, { seen: 'lowe.tap.again' }] } }] }, next: 'tap' },
  { id: `lowe.ruling${sfx}`, text: 'The Court of Accounts ruled on my fines.', if: { all: [{ flag: 'prec_forecast_fine' }, { not: { any: [{ seen: 'lowe.ruling' }, { seen: 'lowe.ruling.again' }] } }] }, next: 'ruling' },
  { id: `lowe.verdict${sfx}`, text: 'I was heard at the top of the Spire.', if: { all: [{ flag: 'ar_verdict' }, { not: { any: [{ seen: 'lowe.verdict' }, { seen: 'lowe.verdict.again' }] } }] }, next: 'verdict' },
];
const PAPERS = (status: string) => [{ set: 'md_status', value: status }, { set: 'md_inside' }, { xp: 150 }];
const CITIZEN = [{ give: 'k_md_papers' }, { enlist: 'wardens', rank: 'citizen' }];

// ---------------------------------------------------------------- the gate

export const d_md_gate: DialogueDef = {
  id: 'd_md_gate', owner: 'npc_md_12',
  start: [{ if: { flag: 'md_status' }, node: 'through' }, { if: { flag: 'md_scanned' }, node: 'after_scan' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A sergeant in grey at the gate with a carbine and a face that has turned back a thousand people politely. "Face to the lens, then we talk. Everyone. The lens doesn\'t care who you are; it cares whether it has seen you."',
      again: '"Lens first," the sergeant says, without looking round. "Then we talk."',
      options: [
        { id: 'gate.lens', text: '(Face the lens.)', next: 'scan' },
        { id: 'gate.line', text: 'What\'s the line for?', next: 'line', once: true },
        { id: 'gate.push', text: '(Wait for the crowd to push, and push with it.)', check: { attr: 'brawn', dc: 6 }, next: 'push_ok', fail: 'push_no' },
        { text: 'Not yet.', exit: true },
      ],
    },
    after_scan: {
      text: '"The lens has you. Hearing, or whatever the file says."',
      again: 'The sergeant looks at you, and at the booth, and waits. "Well? Hearing, or the file."',
      options: [
        { id: 'gate.flag', text: 'The file says admit on sight.', if: { knows: 'md_flagged' }, next: 'flag' },
        { id: 'gate.hearing', text: 'I\'ll stand the hearing.', next: 'hearing_go' },
        { id: 'gate.push.again', text: '(Wait for the crowd to push, and push with it.)', if: { not: { seen: 'gate.push' } }, check: { attr: 'brawn', dc: 6 }, next: 'push_ok', fail: 'push_no' },
        { text: 'Not yet.', exit: true },
      ],
    },
    line: { text: '"Hearings. People without papers stand a hearing: who you are, where from, why here. The assessor decides. Tuesdays and Fridays." She looks down the line. "It has been Tuesday for three days. The schedule holds; the hearings don\'t."', effects: [{ learn: 'md_hearing_heard' }], options: [{ text: 'Face to the lens, then.', next: 'scan' }] },
    scan: {
      text: 'The lens is a glass eye on a post with a green light under it. The clerk in the booth looks at his screen, and then looks at it again, and then looks at you the way people look at a thing that has happened to someone else. "File found." He does not say that often. "Status: — " He stops. "I\'ve never seen this status."',
      effects: [{ set: 'md_scanned' }, { learn: 'md_flagged' }, { lead: 'l_face_flagged' }, { decision: { id: 'md_scanned', text: 'The lens at Meridian\'s gate knew your face.' } }],
      options: [
        { id: 'scan.what', text: 'What status?', next: 'status' },
      ],
    },
    status: {
      text: 'He turns the screen. Your face, grey and small, taken from somewhere you have never stood. A number. And under it: ADMIT ON SIGHT — MAGISTRATE-DESIGNATE (R49). The sergeant has come to look. For the first time in a thousand people her face does something. "Magistrate," she says. "Designate." The clerk says, "That\'s nineteen years off." Nobody says anything else for a while.',
      interject: [
        { companion: ODILE, text: '"Designate," Odile says softly. "My dear, there are men on the floor at Ninebridge who would pay a year of Tolls to know that one word." She does not say whether she is one of them.' },
        { companion: WREN, text: '"Nineteen years," Wren says. "Huh." Her eyes go from the sergeant to the clerk to the barrier, counting. "Then nobody shoots you today. That\'s something."' },
        { companion: TAMSIN, text: '"Magistrate," Tamsin says, and laughs, and stops laughing. "That\'s a joke. Tell me that\'s a joke."' },
      ],
      effects: [{ learn: 'md_magistrate_designate' }, { lead: 'l_photo_light' }, { lead: 'l_cal_r49' }],
      options: [
        { id: 'status.accept', text: 'Then admit me on sight.', next: 'flag' },
        { id: 'status.refuse', text: 'I\'ll stand the hearing like anyone.', next: 'hearing_go' },
        { id: 'status.edit', text: '(While they stare at each other: the booth terminal is unlocked.)', check: { skill: 'science', dc: 50 }, next: 'edit_ok', fail: 'edit_no' },
        { text: '(Step back from the lens.)', exit: true },
      ],
    },
    flag: {
      text: 'The clerk prints a card. The sergeant stamps it without looking at it, which she has never done. CITIZEN — PRECINCT — ENTRY AND RESIDENCE — and, smaller, DESIGNATE. "The avenue\'s straight ahead," she says. "The schedule holds." It sounds, for once, like a question.',
      interject: [ASH_DESIGNATE],
      effects: [...PAPERS('flagged'), ...CITIZEN, { set: 'md_flag_taken' }, { decision: { id: 'md_flagged_in', text: 'You let the file admit you to Meridian on sight, as its Magistrate-designate.' } }, { rep: { faction: 'wardens', respect: 10 } }],
      options: [{ text: '(Through.)', exit: true }],
    },
    hearing_go: { text: '"Hearing." The sergeant writes something that is not your name. "Records office, inside, left of the avenue. The assessor sits. Take what papers you have; it reads everything." She lifts the barrier for you alone, which the line notices.', effects: [{ set: 'md_inside' }, { set: 'md_hearing_pending' }], options: [{ text: '(Through.)', exit: true }] },
    edit_ok: { text: 'Two lines, while the sergeant is still saying *designate* and the clerk is still saying *nineteen years*: the status field takes a value it already knows, CITIZEN, and the name field takes one it does not. The screen agrees with you. The clerk turns back and prints a card for someone who does not exist.', effects: [...PAPERS('forged'), { give: 'k_md_papers' }, { set: 'md_forged' }, { decision: { id: 'md_forged', text: 'You edited your own file at Meridian\'s gate and entered as a citizen who does not exist.' } }, { xp: 80 }], options: [{ text: '(Through.)', exit: true }] },
    edit_no: { text: 'The screen flashes red and says so, aloud. The sergeant\'s carbine comes round. "Hands." The cells, then: the Precinct has a procedure.', effects: [{ set: 'md_detained' }, { set: 'md_inside' }, { event: 'goto', data: { location: 'md_precinct', spawn: 'cell' } }], options: [{ text: '(Hands.)', exit: true }] },
    push_ok: { text: 'The crowd goes at the gate at dusk the way it does every dusk, and tonight you are in the front of it with your shoulder down, and the barrier gives, and you are through in the crush with no card and a sergeant\'s voice behind you saying *let them, let them, count them tomorrow*.', effects: [...PAPERS('smuggled'), { set: 'md_pushed' }, { decision: { id: 'md_pushed', text: 'You pushed through Meridian\'s gate with the crowd.' } }, { time: 240 }], options: [{ text: '(Through.)', exit: true }] },
    push_no: { text: 'The crowd goes at the gate and the wardens go at the crowd, and a club finds your head in the second row, and the next thing is tile under your cheek and a fence door.', effects: [{ set: 'md_detained' }, { set: 'md_inside' }, { time: 240 }, { event: 'goto', data: { location: 'md_precinct', spawn: 'cell' } }], options: [{ text: '(Wake up.)', exit: true }] },
    through: { text: '"Card." She looks, and nods, and the barrier lifts.', again: 'The sergeant nods you through before you reach the barrier.', options: [{ text: '(Through.)', exit: true }] },
  },
};

export const d_md_scanner: DialogueDef = {
  id: 'd_md_scanner', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A glass eye on a post, a green light under it, a cable into the booth. It has seen more faces than anyone alive, and forgotten none of them.', again: 'The lens on its post, and the green light under it.', effects: [{ learn: 'md_scanner_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_gate_board: DialogueDef = {
  id: 'd_md_gate_board', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'PRECINCT OF MERIDIAN — ENTRY BY CARD, HEARING OR LICENCE — CURFEW 21:00 — WATER BY RATION — ALL PERSONS ARE RECORDED. Under it, the Ledger\'s seal, and a smaller line: THE SCHEDULE HOLDS.', again: 'ALL PERSONS ARE RECORDED. THE SCHEDULE HOLDS.', effects: [{ learn: 'md_rules_read' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_wall_sign: DialogueDef = {
  id: 'd_md_wall_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Painted on the Wall in letters a man high, old and renewed: RESTORATION YEAR 30. Beside it, in letters a hand high, newer and not renewed: THE RING BURNS AND YOU COUNT.', again: 'RESTORATION YEAR 30, a man high. THE RING BURNS AND YOU COUNT, a hand high, fading.', effects: [{ learn: 'md_year_seen' }, { lead: 'l_cal_year' }, { quest: 'q_a2_calendar', start: true }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_drain: DialogueDef = {
  id: 'd_md_drain', owner: 'narrator',
  start: [{ if: { flag: 'md_inside' }, node: 'inside' }, { node: 'mouth' }],
  nodes: {
    mouth: {
      text: 'A storm drain under the Wall, south of the gate, grated, its grate bent where someone has been through before. A warden walks the top of the Wall above it every quarter-hour.',
      again: 'The drain, the bent grate, and the warden\'s steps above on the Wall.',
      options: [
        { id: 'drain.go', text: '(Wait for the warden to pass, and go under.)', check: { skill: 'stealth', dc: 40, mods: [{ if: NIGHT, dc: -10, why: 'the Wall\'s lamps do not reach the drain' }] }, next: 'go_ok', fail: 'go_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    go_ok: { text: 'Forty feet of pipe on your elbows with the city\'s water a hand deep, and a grate at the far end that lifts, and a back lane behind the tenements with a lamp at the end of it and nobody under the lamp.', effects: [...PAPERS('smuggled'), { set: 'md_drained' }, { decision: { id: 'md_drained', text: 'You went under Meridian\'s Wall by the storm drain.' } }, { event: 'goto', data: { location: 'md_precinct', spawn: 'drain', minutes: 20 } }], options: [{ text: '(Through.)', exit: true }] },
    go_no: { text: 'The grate shrieks on its hinge. On the Wall a lamp swings round and a voice says *stay there*, in the tone of someone who knows you won\'t.', effects: [{ time: 30 }, { rep: { faction: 'wardens', respect: -3 } }], options: [{ text: '(Run.)', exit: true }] },
    inside: { text: 'The drain\'s inside mouth, in the back lane. It goes out under the Wall to the rubble, if you ever need a way out the lens does not watch.', again: 'The drain\'s mouth in the back lane: the way out the lens does not watch.', effects: [{ learn: 'md_drain_known' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- inside

export const d_md_loop: DialogueDef = {
  id: 'd_md_loop', owner: 'narrator',
  start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — PRECINCT PLATFORM. A board of district names with a fare beside each: OLD MARKET 2 · LANTERN ROW 2 · THE STACKS 3 · BRIDGEWARD 3 · CLOVER 4 · THE DOCKS 4 · THE CROWN (BY INVITATION). The tram on the rail hums with its doors open. One name still has a chalk line through it: THE DOCKS.',
      again: 'The tram hums with its doors open. Chalk through THE DOCKS, and nowhere else.',
      effects: [{ learn: 'md_loop_seen' }],
      options: [
        { id: 'loop.market', text: 'Old Market. (2 Tolls)', if: { all: [{ flag: 'md_market_open' }, { item: 'tolls', count: 2 }] }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_market', spawn: 'loop', minutes: 15 } }], exit: true, repeat: true },
        { id: 'loop.lantern', text: 'Lantern Row. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_lantern', spawn: 'loop', minutes: 15 } }], exit: true, repeat: true },
        { id: 'loop.stacks', text: 'The Stacks. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_stacks', spawn: 'loop', minutes: 20 } }], exit: true, repeat: true },
        { id: 'loop.bridgeward', text: 'Bridgeward. (3 Tolls)', if: { item: 'tolls', count: 3 }, effects: [{ take: 'tolls', count: 3 }, { event: 'goto', data: { location: 'md_bridgeward', spawn: 'loop', minutes: 20 } }], exit: true, repeat: true },
        { id: 'loop.clover', text: 'Clover, outside the Wall. (4 Tolls)', if: { item: 'tolls', count: 4 }, effects: [{ take: 'tolls', count: 4 }, { event: 'goto', data: { location: 'md_ring', spawn: 'loop', minutes: 35 } }], exit: true, repeat: true },
        { id: 'loop.crown', text: 'The Crown. (The invitation car.)', if: { any: [{ item: 'k_masque_chit' }, { item: 'k_cr_service_pass' }, { item: 'k_latch_card' }, { wearing: 'r_velvet' }, { knows: 'md_magistrate_designate' }, { member: 'tenured' }, { member: 'tollmen', rank: 'hand' }, { flag: 'cr_entry' }] }, effects: [{ learn: 'cr_car_taken' }, { event: 'goto', data: { location: 'md_crown', spawn: 'lift', minutes: 10 } }], exit: true, repeat: true },
        { id: 'loop.works', text: '(The chalk through the Docks.)', next: 'works' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    works: { text: 'NO BRIDGE, in chalk, through THE DOCKS. A citizen waiting on the bench says the Docks line has said that since before she was born, and that the rest said WORKS all spring, and that the works were on schedule. Clover, she says, is outside the Wall: the tram goes, and comes back, and the Ring is outside the law, and she has never been.', again: 'NO BRIDGE through THE DOCKS, and the citizen on the bench.', effects: [{ learn: 'md_loop_works' }, { learn: 'dr_ring_heard' }], options: [DOCKS_ASK('loop.docks'), { text: '(Leave it.)', exit: true }] },
    // the far bank's answer (B5b, Carrick)
    docks: DOCKS_ANSWER,
  },
};

export const d_md_ration: DialogueDef = {
  id: 'd_md_ration', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: [{ if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, text: 'A standpipe with a dial and a board: WATER — PRECINCT — RATION 0.8 — REBALANCING (SUPPLY NETWORK 4). The dial has been turned down a fifth. Somebody has written under it: *since the Sallow*.' }, { text: 'A standpipe with a dial and a board: WATER — PRECINCT — RATION 1.0 — ON SCHEDULE. The dial is clean.' }], effects: [{ learn: 'md_ration_seen' }, { lead: 'l_precinct_rationing' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_notice: DialogueDef = {
  id: 'd_md_notice', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Under glass: EVICTIONS, SCHEDULED (4). HEARINGS, TUESDAY AND FRIDAY. THE SINK: SPRING RELIEF PUMPING WILL BE DIVERTED TO THE PRECINCT AS PER SCHEDULE. CITIZENS ARE REMINDED THAT THE RING IS OUTSIDE THE LAW. And a smaller card: RECORDS OFFICE — CITIZENSHIP BY EXAMINATION — ASK FOR THE ASSESSOR.', again: 'EVICTIONS, SCHEDULED (4). The Sink\'s spring pumping, diverted. THE RING IS OUTSIDE THE LAW.', effects: [{ learn: 'md_notice_read' }, { learn: 'md_exam_heard' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_charter: DialogueDef = {
  id: 'd_md_charter', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'The charter, cast in brass, in clauses. CLAUSE 1: THE CITY KEEPS ITS PEOPLE. CLAUSE 14: THE DRAINS ARE THE CITY\'S FIRST DUTY. CLAUSE 31: A LAWFUL CONTRACT SHALL NOT BE VOIDED. CLAUSE 60: THE RESTORATION SHALL PROCEED ON SCHEDULE. Someone has polished clause 14 more than the others.', again: 'The brass clauses. Fourteen shines brighter than the rest.', effects: [{ learn: 'md_charter_read' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

/** Nine's deed (q_comp_nine): the register is open to anyone who can read the terminal; the entry's last line is the
 * reader's, not Nine's (clause 40). */
const DEED_SEARCH: Cond = { all: [{ flag: 'nine_deed_asked' }, { not: { flag: 'nine_title_read' } }] };
const DEED_READ = [{ set: 'nine_title_read' }, { learn: 'nine_title_lapsed' }, { learn: 'nine_disposal_seen' }];
const NINE_ENTRY = 'UNIT 9 — ASSESSOR — CIVIL REFIT, WARDEN PATTERN — ISSUED R−90. OWNER OF RECORD: DEPARTMENT OF RECORDS. DEPARTMENT DISSOLVED R−60. TITLE LAPSED. And a last line, set apart from the rest: DISPOSAL — SCHEDULED — R31. A note cites clause 9(b): A LAPSED ASSET PASSES TO ITS KEEPER ON A CAPTAIN\'S WITNESS, OR TO A BUYER AT ASSESSED VALUE.';

/** A deed can be made once the entry is read: witnessed by the captain, bought at the desk, or written by Nine at camp. */
const DEED_MAKEABLE: Cond = { all: [{ flag: 'nine_title_read' }, { not: { flag: 'nine_deed_made' } }] };
/** The deed at the desk: an entry printed for the price of the paper, or a lapsed asset bought at assessed value (9(b)). */
const DESK_DEED = (sfx: string): OptionDef[] => [
  { id: `desk.print${sfx}`, text: 'Print me an entry from the asset register. Unit 9. (20 Tolls)', if: { all: [DEED_SEARCH, { item: 'tolls', count: 20 }] }, effects: [{ take: 'tolls', count: 20 }, ...DEED_READ], next: 'print' },
  { id: `desk.buy${sfx}`, text: 'Unit 9\'s title has lapsed. Clause 9(b): I\'ll buy it at assessed value. (120 Tolls)', if: { all: [DEED_MAKEABLE, { item: 'tolls', count: 120 }] }, effects: [{ take: 'tolls', count: 120 }, { set: 'nine_deed_made' }, { set: 'nine_deed_how', value: 'bought' }, { decision: { id: 'nine_deed_bought', text: 'You bought Assessor Nine\'s lapsed title from the city at assessed value.' } }], next: 'buy' },
];

export const d_md_records_term: DialogueDef = {
  id: 'd_md_records_term', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The records terminal, green on black like the Exchange\'s board and older. A list scrolls: CONTINUITY RESERVES — 1 RELOCATED R0+1 — 2 RELOCATED R0+1 — 3 LOST — 4 NON-COMPLIANT (DOOR) — 5 RELOCATED R0+3 — 6 LOST — 7 SOLD (CONCERN) — 8 LOST — 9 OUTSTANDING (CARETAKER NON-COMPLIANT, ORDERS 3). Then it scrolls off.',
      again: 'CONTINUITY RESERVES, scrolling green. 9 OUTSTANDING. It scrolls off again.',
      effects: [{ learn: 'md_reserves_list' }, { lead: 'l_cisterns_relocate' }, { lead: 'l_c4_same_order' }],
      options: [
        { id: 'term.render', text: '(Type the code from the photograph\'s margin: 0412/30.)', if: { all: [CAL_OPEN, { knows: 'cal_margin_seen' }] }, check: { skill: 'science', dc: 45, mods: [{ if: { inParty: NINE }, dc: -15, why: 'Nine tells the wall which queue the number belongs to' }] }, next: 'render', fail: 'render_no' },
        { id: 'term.nine', text: '(Search the register: ASSETS, MUNICIPAL, unit 9.)', if: DEED_SEARCH, check: { skill: 'science', dc: 40, mods: [{ if: { inParty: NINE }, dc: -15, why: 'Nine stands with its back to the screen, naming the codes' }] }, next: 'register', fail: 'register_no' },
        { text: '(Step back.)', exit: true },
      ],
    },
    register: {
      text: `ASSETS, MUNICIPAL. The cursor finds it on the third page. ${NINE_ENTRY}`,
      again: 'The entry, green on black. The last line is still set apart from the rest.',
      interject: [{ companion: NINE, text: '"The owner," Nine says, to the wall, its back to the screen. "Only the owner. Clause 40." It does not turn round, and it does not ask what is taking you so long.' }],
      effects: DEED_READ,
      options: [{ text: '(Step back.)', exit: true }],
    },
    render: {
      text: 'The cursor takes the code and the screen goes blank and then very full. RENDER QUEUE 0412 — SUBJECT: DESIGNATE — RENDERED R30 FROM FORECAST — DEPICTS R49.06.12 — SITE: ARCHIVE SPIRE, PUBLIC STEPS — COPIES: 1 (UNRECORDED). The pencil on the back of the print copied the date and left off the R.',
      again: 'RENDER QUEUE 0412. DEPICTS R49. The screen holds it.',
      effects: [{ learn: 'cal_future' }, { set: 'cal_how', value: 'render' }, { learn: 'cal_render' }, { lead: 'l_cal_render' }, { learn: 'ar_known' }, { xp: 60 }],
      options: [{ text: '(Step back.)', exit: true }],
    },
    render_no: { text: 'QUERY NOT UNDERSTOOD. The code means something to the machine; you have not found the door it opens. The cursor waits, patient as the Wall.', again: 'QUERY NOT UNDERSTOOD.', options: [{ text: '(Step back.)', exit: true }] },
    register_no: { text: 'ACCESS: CLERK GRADE OR ABOVE. The cursor waits. A card is tucked into the terminal\'s frame, in a warden\'s hand: ENTRIES PRINTED AT THE DESK — PAPER 20.', again: 'CLERK GRADE OR ABOVE. The card in the frame: PRINTED AT THE DESK.', effects: [{ learn: 'md_desk_prints' }], options: [{ text: '(Step back.)', exit: true }] },
  },
};

export const d_md_bell: DialogueDef = {
  id: 'd_md_bell', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The curfew bell on its post, rung by a wire from the station at nine. Old Agata Quint says it has never once been late, and says it the way other people say a prayer.', again: 'The curfew bell on its post and its wire to the station. Never once late.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_cell: DialogueDef = {
  id: 'd_md_cell', owner: 'narrator',
  start: [{ if: { flag: 'md_status' }, node: 'open' }, { node: 'cell' }],
  nodes: {
    cell: {
      text: 'A cell: tile, a cot, a fence door with a lock. After an hour the door opens and a thing comes in that is not a person — grey plating, a brass plate, a cracked lens — and sits on the end of the cot with a ledger. "Assessor Nine. The record suggests you were detained at the gate. The record also suggests — " a pause, and the lens clicks — "that the file does not know what to do with you, which is a thing I have not seen the file do in a hundred and twenty years."',
      effects: [{ set: 'nine_met' }, { learn: 'nine_seen' }, { learn: 'md_flagged' }, { lead: 'l_face_flagged' }],
      options: [
        { id: 'cell.bail', text: '(Bail. 100 Tolls)', if: { item: 'tolls', count: 100 }, effects: [{ take: 'tolls', count: 100 }, ...PAPERS('provisional'), { give: 'k_md_pass' }], next: 'bail' },
        { id: 'cell.serve', text: 'I\'ll serve it.', effects: [{ time: 2880 }, ...PAPERS('provisional'), { give: 'k_md_pass' }], next: 'serve' },
        { id: 'cell.flag', text: 'The file says admit on sight. Read it.', effects: [...PAPERS('flagged'), ...CITIZEN, { set: 'md_flag_taken' }, { decision: { id: 'md_flagged_in', text: 'You let the file admit you to Meridian on sight, as its Magistrate-designate.' } }], next: 'flag' },
        { id: 'cell.lowe', text: 'Captain Lowe said the wardens take people from the cells.', if: { knows: 'md_lowe_offer' }, effects: [...PAPERS('warden'), ...CITIZEN, { set: 'md_lowe_taken' }, { decision: { id: 'md_warden_in', text: 'You took Captain Lowe\'s offer and left the cells as a warden\'s recruit.' } }], next: 'lowe' },
      ],
    },
    bail: { text: '"Bail is lawful." It writes. "A provisional pass. Three days, it says. Nobody enforces the three; I have filed a complaint." The fence door is open.', options: [{ text: '(Out.)', exit: true }] },
    serve: { text: 'Two days of tile and a cot and water at ration, and the assessor twice a day with the ledger, asking questions it already has the answers to and writing down the differences. On the third morning the fence door is open and a pass is on the cot.', options: [{ text: '(Out.)', exit: true }] },
    flag: { text: 'It reads it. The lens clicks twice. "ADMIT ON SIGHT. MAGISTRATE-DESIGNATE." A long pause. "The record suggests I should have let you in at the gate. The record suggests a great many things." It prints a card from somewhere inside its chest. "Citizen. Designate. The fence door is open; it was never locked, which I will not be putting in the file."', interject: [ASH_DESIGNATE], options: [{ text: '(Out.)', exit: true }] },
    lowe: { text: '"Captain Lowe recruits from the cells. It is lawful; clause 22. It is also," the lens clicks, "a thing I would not do. A card, then, and grey, and the schedule." The fence door is open.', options: [{ text: '(Out.)', exit: true }] },
    open: { text: 'The cell, empty, the fence door open. It was never locked.', again: 'Tile, a cot, a fence door standing open.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_md_desk: DialogueDef = {
  id: 'd_md_desk', owner: 'npc_md_g5',
  start: [{ if: { flag: 'md_fines_paid' }, node: 'paid' }, { if: { flag: 'md_fines_seen' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The desk warden looks at your card, or your face, and then at a drawer, and takes out a paper with your face printed grey on the corner. "Fines outstanding. Three." He is apologetic in the way of a man reading a list. "Curfew, forecast. Loitering on the avenue, forecast. Unlicensed assembly, forecast. Forty-five Tolls." He pushes it across. "The dates are next month."',
      effects: [{ set: 'md_fines_seen' }, { give: 'k_md_fine_notice' }, { lead: 'l_fines_forecast' }, { quest: 'q_md_fines', start: true }],
      options: [
        { id: 'desk.pay', text: '(Pay. 45 Tolls)', if: { item: 'tolls', count: 45 }, effects: [{ take: 'tolls', count: 45 }, { give: 'k_md_receipt' }, { set: 'md_fines_paid' }, { rep: { faction: 'wardens', respect: 4 } }], next: 'paid_now' },
        { id: 'desk.contest', text: 'I haven\'t done any of it.', next: 'contest' },
        { id: 'desk.bail', text: 'Bail. For the cells.', if: { flag: 'md_detained' }, next: 'bail_info' },
        ...DESK_DEED(''),
        bye,
      ],
    },
    again: { text: '"Three fines. Forty-five."', again: 'He taps the notice, apologetically, and waits.', options: [{ id: 'desk.pay.again', text: '(Pay. 45 Tolls)', if: { item: 'tolls', count: 45 }, effects: [{ take: 'tolls', count: 45 }, { give: 'k_md_receipt' }, { set: 'md_fines_paid' }, { rep: { faction: 'wardens', respect: 4 } }], next: 'paid_now' }, { id: 'desk.contest.again', text: 'I haven\'t done any of it.', if: { not: { flag: 'md_fines_contested' } }, next: 'contest' }, ...DESK_DEED('.again'), bye] },
    contest: { text: '"Yet." He says it gently. "You can contest a forecast fine at the Court of Accounts. By appointment. The appointment is — " he looks at a book — "when the schedule says." He writes CONTESTED on the notice and stamps it, which seems to make him happier than the fine did.', effects: [{ set: 'md_fines_contested' }, { learn: 'md_court_heard' }], options: [bye] },
    paid_now: { text: 'He stamps a receipt, twice. "Paid. You\'re a person the Precinct has no complaint against." He thinks about it. "Including the ones it hasn\'t had yet."', options: [bye] },
    paid: { text: '"No complaints on file. That\'s rare, here."', again: '"Still no complaints." He sounds faintly proud of you.', options: [...DESK_DEED('.paid'), bye] },
    print: {
      text: `"Asset entries are public." He takes your twenty, which is for the paper, and the printer behind him chatters a long time for a short entry. He reads it before he hands it over, because he reads everything he hands over: ${NINE_ENTRY} His eyebrows go up at the last line and stay there. "Lapsed," he says. "I didn\'t know things could."`,
      again: 'He has gone back to his drawer. The printed entry is in your hand, the last line set apart.',
      options: [bye],
    },
    buy: {
      text: [
        { if: { inParty: NINE }, text: '"Assessed value." He looks it up, and then up at the assessor. "One hundred and twenty," Nine says. "One for each year in service. I have filed a complaint about the method." The warden stamps the transfer and leaves the keeper\'s line blank, because a buyer may name one, and hands it to you.' },
        { text: '"Assessed value." He looks it up. "Assessed by the assessor, it says. One hundred and twenty: one a year in service." He stamps the transfer and leaves the keeper\'s line blank, because a buyer may name one, and hands it to you. "I\'ve never sold a — " He stops, and chooses. "An asset."' },
      ],
      again: 'The transfer is stamped. He does not look at it again.',
      options: [bye],
    },
    bail_info: { text: '"A hundred, to the assessor, in the cell. It likes to do it itself."', options: [bye] },
  },
};

/** Clause 9(b), witnessed: a lapsed asset passes to its keeper (Nine's deed). A check, so it stays offered. */
const LOWE_DEED = (id: string): OptionDef => ({ id, text: 'Clause 9(b). A lapsed asset passes to its keeper on a captain\'s witness. Unit 9, the assessor.', if: DEED_MAKEABLE, check: { skill: 'speech', dc: 40, mods: [{ if: { inParty: NINE }, dc: -10, why: 'the asset is standing in front of him' }, { if: { trust: { npc: 'npc_md_01', gte: 10 } }, dc: -10, why: 'he trusts you' }, { if: { member: 'wardens' }, dc: -5, why: 'a citizen asking a captain for a lawful thing' }] }, next: 'deed_ok', fail: 'deed_no' });

export const d_md_lowe: DialogueDef = {
  id: 'd_md_lowe', owner: 'npc_md_01',
  start: [LOWE_CAR_START, { if: { flag: 'lowe_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man in grey at a desk under a brass clause, who stands when you come in because the charter says to stand. "Captain Lowe. Precinct wardens." He looks at your card, if you have one, and at you if you don\'t. "Everything inside the Wall is lawful. I check. Every eviction, every ration, every fine. I have never found one that wasn\'t."',
      effects: [{ set: 'lowe_met' }, { learn: 'lowe_seen' }],
      passives: [{ attr: 'senses', dc: 7, text: 'A list on the desk under his hand, headed EVICTIONS — SCHEDULED, with four names and a date against each, and a crease in the paper where he has folded it over and over.', effects: [{ learn: 'lowe_evictions' }] }],
      options: [
        { id: 'lowe.lawful', text: 'Lawful and right are two words.', next: 'lawful', once: true },
        { id: 'lowe.flag', text: 'The lens called me a magistrate.', if: { knows: 'md_magistrate_designate' }, next: 'flag', once: true },
        { id: 'lowe.ring', text: 'The Ring is burning. There are people at your gate.', next: 'ring', once: true },
        { id: 'lowe.recruit', text: 'You take people from the cells.', if: { flag: 'md_detained' }, next: 'recruit', once: true },
        { id: 'lowe.water', text: 'Your water\'s rationed since the Sallow\'s pumps changed.', if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, next: 'water', once: true },
        { id: 'lowe.letter', text: '(Hand him the sealed letter.) From the board at Old Market. By hand.', if: GIG_LETTER, next: 'letter' },
        { id: 'lowe.dial', text: 'The standpipe square. Point eight on the notice, point six on the dial, and forty people who can count.', if: RIOT_COUNT, next: 'dial' },
        { id: 'lowe.pumps', text: '(Put the relief schedule on the desk.) Clause 31 sends the Sink\'s pumps to the Precinct in spring. Clause 14 says the drains come first.', if: PUMPS_PAPER, next: 'pumps' },
        { id: 'lowe.static', text: 'There\'s a girl in Bridgeward who says the Plan\'s own lines out loud. Reserve nine. Point six. Thursday.', if: STATIC_GIRL, next: 'static' },
        LOWE_DEED('lowe.deed'),
        ...LOWE_SPIRE(''),
        bye,
      ],
    },
    again: { text: '"Captain." He has stood up again.', again: 'He stays standing, because the charter says to, and waits.', options: [{ id: 'lowe.lawful.again', text: 'Lawful and right are two words.', if: { not: { seen: 'lowe.lawful' } }, next: 'lawful' }, { id: 'lowe.flag.again', text: 'The lens called me a magistrate.', if: { all: [{ knows: 'md_magistrate_designate' }, { not: { seen: 'lowe.flag' } }] }, next: 'flag' }, { id: 'lowe.ring.again', text: 'The Ring is burning.', if: { not: { seen: 'lowe.ring' } }, next: 'ring' }, { id: 'lowe.water.again', text: 'Your water\'s rationed.', if: { all: [{ any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, { not: { seen: 'lowe.water' } }] }, next: 'water' }, { id: 'lowe.letter.again', text: '(Hand him the sealed letter.) From the board at Old Market.', if: GIG_LETTER, next: 'letter' }, { id: 'lowe.dial.again', text: 'The standpipe square. Point eight on the notice, point six on the dial.', if: RIOT_COUNT, next: 'dial' }, { id: 'lowe.pumps.again', text: '(Put the relief schedule on the desk.) Clause 31 against clause 14.', if: PUMPS_PAPER, next: 'pumps' }, { id: 'lowe.static.again', text: 'A girl in Bridgeward says the Plan\'s lines out loud.', if: STATIC_GIRL, next: 'static' }, LOWE_DEED('lowe.deed.again'), ...LOWE_SPIRE('.again'), bye] },
    static: { text: '"A tap." He does not write it down yet. "An unlicensed tap on the file, in a person. The charter has a clause; it is not a kind one." He looks at the drawer marked AUDIT. "If I know the tower\'s name, I have to go. If I don\'t, I don\'t." He waits, which is the kindest thing he can do.', options: [{ id: 'static.give', text: 'The Saints\' tower. Under the mast.', effects: [{ set: 'bw_static', value: 'silenced' }, { rep: { faction: 'wardens', respect: 6 } }, { rep: { faction: 'saints', respect: -25 } }, { trust: { npc: 'npc_md_01', by: 5 } }, { xp: 80 }, { decision: { id: 'bw_static_silenced', text: 'You gave the warden captain the Saints\' tower, and the girl who hears went to the Precinct\'s cells.' } }], next: 'static_done' }, { text: 'Forget I said it.', exit: true }] },
    static_done: { text: '"Then I know it." He puts on his coat. "She\'ll be in a cell with a blanket and no radio, which the charter calls custody and I call quiet. Lawful." He does not say the other word.', interject: [
      { companion: NINE, text: '"Custody," Nine says. The lens clicks. "The record will call it lawful. I will be noting it elsewhere."', effects: [{ approval: { companion: NINE, by: -5 } }] },
      { companion: TAMSIN, text: '"Quiet," Tamsin says. "He means a cell with no window." She looks at you the way she looks at people she is adding to a list.', effects: [{ approval: { companion: TAMSIN, by: -5 } }] },
    ], options: [bye] },
    pumps: {
      text: 'He reads the schedule the way he reads everything, to the end, and then the clause numbers again. "Clause 31. Growth. Clause 14. The drains." He puts a finger on each. "I have never been asked which comes first. I have assumed the Plan knew." He looks at the finger on 14 for a long time.',
      options: [
        { id: 'lowe.pumps.ask', text: 'Then sign a variance. The drains first. The Precinct bears the shortfall, which is lawful, and you check the arithmetic.', check: { skill: 'speech', dc: 40, mods: [{ if: { member: 'wardens' }, dc: -10, why: 'a citizen asking a captain for a lawful thing' }, { if: { knows: 'lowe_rebalance' }, dc: -10, why: 'he has already told you what the Plan rebalances' }, { if: { knows: 'lowe_wanted' }, dc: -5, why: 'eleven times he has wanted to' }] }, next: 'pumps_ok', fail: 'pumps_no' },
        { text: 'Think about it.', exit: true },
      ],
    },
    pumps_ok: { text: 'He writes it himself, on the station\'s paper, under the brass clause: VARIANCE — RELIEF PUMPING — CLAUSE 14 — PRECINCT SUPPLY TO BEAR THE SHORTFALL. He signs where a captain signs and stamps it where the assessor would, with the assessor\'s own stamp, which he has never used. "Lawful," he says. "I checked." He hands it to you. "Take it to the keeper. Then come and tell me what point six tastes like in a Precinct kitchen. I will need to know."', interject: [{ companion: NINE, text: '"Clause 14," Nine says, from behind you, as the stamp comes down. "The drains are the city\'s first duty." Lowe looks at the assessor\'s plate on its chest and does not ask what it is doing out of the records office. "Lawful," he tells it.', effects: [{ approval: { companion: NINE, by: 10 } }] }], effects: [{ take: 'k_sk_schedule' }, { give: 'k_sk_variance' }, { set: 'sk_pumps', value: 'paid' }, { set: 'sk_variance_lowe' }, { trust: { npc: 'npc_md_01', by: 15 } }, { rep: { faction: 'wardens', respect: 4 } }, { xp: 150 }, { decision: { id: 'sk_variance_lowe', text: 'Captain Lowe signed a variance putting the Sink\'s drains before the Precinct\'s growth, on your asking.' } }], options: [{ text: '(Take it.)', exit: true }] },
    pumps_no: { text: '"Clause 31 is the Plan\'s. I carry out the Plan\'s." He gives you the schedule back, squared. "I grieve the other one at home. I told you that."', options: [bye] },
    dial: {
      text: '"Point eight is the notice." He takes it off the spike. "Point six is a dial that somebody turned, or that turned itself, and either way the arithmetic is wrong, and I check the arithmetic." He puts on his coat. He walks the avenue to the square with the notice held out in front of him, reads both numbers aloud to forty people and two wardens, and turns the dial to point eight with his own fingers, slowly, so the queue can see the hand. Then he writes it down.',
      effects: [{ set: 'mk_riot_outcome', value: 'lowe' }, { time: 90 }, { xp: 120 }, { learn: 'lowe_turned_dial' }, { decision: { id: 'mk_riot_lowe', text: 'You brought Captain Lowe the standpipe\'s arithmetic, and he turned the dial himself.' } }],
      options: [{ text: '(Walk back with him.)', exit: true }],
    },
    letter: {
      text: [
        { if: { flag: 'gig_letter_opened' }, text: 'He turns it over once. "The wax has been lifted." He says it the way he says everything: for the record. He reads it standing. A guild note for a hundred falls flat on the desk and he does not touch it. "The Quint eviction stands Thursday, because it is lawful, and I have said so in writing to that hatch eleven times." He writes a twelfth on the back of the letter, pins the note to it, and puts both in a drawer marked AUDIT. "Received and refused. Tell them. They know."' },
        { text: 'He opens it standing, because the charter says station mail is read on receipt. A guild note for a hundred falls flat on the desk and he does not touch it. "*The Quint eviction. Thursday. Reschedule it.*" He reads it twice. "It stands, because it is lawful, and I have said so in writing to that hatch eleven times." He writes a twelfth on the back of the letter, pins the note to it, and puts both in a drawer marked AUDIT. "Received and refused. Tell them. They know."' },
      ],
      effects: [{ take: 'k_gig_letter' }, { set: 'gig_letter_done' }, { learn: 'lowe_refused' }, { learn: 'quint_eviction' }, { xp: 30 }],
      options: [
        { id: 'lowe.letter.month', text: 'A month for a family is not much to ask.', next: 'letter_month' },
        { id: 'lowe.letter.keep', text: 'You could keep the hundred. Nobody would know.', next: 'letter_keep' },
        { id: 'lowe.letter.who', text: 'Who are the Quints?', next: 'letter_who' },
        bye,
      ],
    },
    letter_month: { text: '"It is not much. It is also not mine to give; the schedule is the assessor\'s, and the assessor is the Plan\'s." He looks at the drawer. "Eleven times I have wanted to. That is in the drawer too."', effects: [{ learn: 'lowe_wanted' }, { trust: { npc: 'npc_md_01', by: 8 } }], options: [bye] },
    letter_keep: { text: '"I would know. The drawer would know. The audit would know, when it came, and the audit always comes." He sits. "That is not virtue. That is arithmetic. I told you I check it."', effects: [{ trust: { npc: 'npc_md_01', by: -5 } }], options: [bye] },
    letter_who: { text: '"Four rooms on the Sink side of the Precinct. Six people. Three months behind on the ration levy, which is lawful, and a tram pass stamped on a day a man was carrying his mother to the drain, which is also lawful." He does not look at the list under his hand. "Thursday."', effects: [{ learn: 'quint_eviction' }], options: [bye] },
    lawful: { text: '"They are." He sits. "I know the difference. I carry out the lawful one and I grieve the other one, at home, where it isn\'t on the record. If you have a third word, I would like to hear it. Nobody has had one yet."', interject: [{ companion: ILYA, text: '"At home," Ilya says. "Right." He has the look of a man who did his grieving somewhere else, and not enough of it.' }], effects: [{ learn: 'lowe_grieves' }, { trust: { npc: 'npc_md_01', by: 10 } }], options: [bye] },
    flag: { text: 'He looks at you for a long time. "Then one day you will sit where the assessor sits and sign what I carry out." He does not say it unkindly. "I\'ll stand for you then, too. I\'d rather you were someone who knew the two words."', effects: [{ learn: 'lowe_mirror' }, { memory: { npc: 'npc_md_01', tag: 'designate', valence: 5, strength: 80 } }], options: [bye] },
    ring: { text: '"The Ring is outside the law. Outside the Wall. The charter keeps the city\'s people; the Ring stopped being the city\'s on a date I can show you." He does not reach for it. "Every dusk they push. Every dusk we hold. Nobody dies of it, mostly. I count them in the morning."', effects: [{ learn: 'lowe_ring' }], options: [bye] },
    recruit: { text: '"Clause 22. The wardens may recruit from those detained, at the captain\'s discretion." He looks at you. "Grey, and a card, and the schedule. It is the only door out of a cell that doesn\'t cost coin or days. It costs something else, which I won\'t pretend about."', effects: [{ learn: 'md_lowe_offer' }], options: [bye] },
    water: { text: '"Point eight. Rebalancing, the notice says." He is quiet. "Somebody in the Sallow turned a dial and the Precinct drinks less and the Sink floods a week earlier in spring. That is what *the Plan rebalances* means. I check the arithmetic. It is always right."', effects: [{ learn: 'lowe_rebalance' }, { lead: 'l_precinct_rationing' }], options: [bye] },
    deed_ok: {
      text: 'He reads 9(b) on the brass, and then in the book, and then the entry, to the end, the way he reads everything. "Its keeper." He looks at the assessor, or at where it would stand. "The clause does not say a keeper must be a person. I checked." He writes the witness himself, signs where a captain signs, and leaves the keeper\'s line empty. "The name is the keeper\'s to write. I witness the passing, not the name. Lawful."',
      again: 'The witness is signed. He has squared the entry on the desk and is reading something else, to the end.',
      interject: [{ companion: NINE, text: '"Lawful," Nine repeats. The lens clicks once, slowly, like something being set down with care.', effects: [{ approval: { companion: NINE, by: 5 } }] }],
      effects: [{ set: 'nine_deed_made' }, { set: 'nine_deed_how', value: 'witnessed' }, { trust: { npc: 'npc_md_01', by: 5 } }, { decision: { id: 'nine_deed_witnessed', text: 'Captain Lowe witnessed Assessor Nine\'s lapsed title passing to its keeper, under clause 9(b).' } }],
      options: [bye],
    },
    cup: {
      text: '"Celestine Vane took ill at her own toast. Eighty-one; the house\'s own physician; no complaint from anyone." The report is in the drawer marked AUDIT, and he does not take it out. "I signed it lawful, because it was. I know a cup when I see one." He looks at you. "Nobody has ever asked me to. Nobody is asking me now."',
      interject: [{ companion: ILYA, text: '"Right," Ilya says, and nothing else, and looks at the drawer the way he looks at a range he has already measured.' }],
      effects: [{ learn: 'lowe_cup' }],
      options: [
        { id: 'lowe.cup.mine', text: 'It was my hand.', effects: [{ learn: 'lowe_cup_told' }, { memory: { npc: 'npc_md_01', tag: 'the_cup', valence: -10, strength: 90 } }], next: 'cup_mine' },
        bye,
      ],
    },
    cup_mine: { text: 'He does not move for a long time. "Then you have told the one man in the city who can do nothing with it." He closes the drawer. "The audit wants a complaint. There is no complaint. There will not be." He stands, because the charter says to. "I will remember it. That is not in the charter either."', options: [bye] },
    tap: {
      text: '"She talks in her sleep." He keeps his hands flat on the desk. "The charter says I record what a prisoner says, so I do. Last night, three lines: *designate. Ninety-one. The season closes.*" He looks at you. "The audit came for the page this morning. The audit has never come for a page before." A pause. "I don\'t know what closes. I thought you might."',
      effects: [{ learn: 'lowe_tap_line' }, { lead: 'l_ar_season' }],
      options: [bye],
    },
    ruling: {
      text: [
        { if: { flag: 'prec_forecast_fine', eq: 'void' }, text: '"Void." He takes the list of evictions from under his hand and reads it again. "A forecast is not an act." He puts his finger on two of the four names. "These are forecasts." He does not say what he will do. He folds the list once more, along a new crease.' },
        { if: { flag: 'prec_forecast_fine', eq: 'priced' }, text: '"Priced at its odds." He writes nothing down. "The Exchange will be pleased. I am not the Exchange."' },
        { if: { flag: 'prec_forecast_fine', eq: 'designate' }, text: '"For the designate." He says nothing else for long enough that it is something.' },
        { text: '"Upheld. Forty-five. Lawful." A pause. "I am sorry. That is not in the charter either."' },
      ],
      effects: [{ learn: 'lowe_heard_ruling' }],
      options: [bye],
    },
    verdict: {
      text: [
        { if: { flag: 'ar_verdict', eq: 'agreed' }, text: '"I heard you were heard." He stands straighter, which he did not think he could. "Agreed. Then one day you will sign what I carry out. I said I would stand for you." He nods once. "I will. I would rather you were someone who knew the two words. I think you might be."' },
        { if: { flag: 'ar_verdict', eq: 'contested' }, text: '"Contested." He sits down, which the charter does not say to do in front of a citizen. "I have never heard that word used about a file. I have checked." He looks at the brass clause over his desk for a while. "Then the schedule is arguable. I did not know that. I will need to think about what else is."' },
        { if: { flag: 'ar_verdict', eq: 'refused' }, text: '"Refused." He does not stand. "The lane wardens were told before you were halfway down the stair." He looks at the drawer marked AUDIT. "It will not punish you. It will reroute you. That is worse, and lawful."' },
        { text: '"The schedule holds," he says, and for once it sounds like a question.' },
      ],
      effects: [{ learn: 'lowe_heard_verdict' }],
      options: [bye],
    },
    deed_no: { text: '"9(b) is for carts and pumps." He hands the entry back, squared. "I have never witnessed a pump passing to itself, and I will not start with a unit that sits on my hearings because a stranger read me a clause. Bring me its purpose, not its letter."', again: 'He has handed the entry back, squared, and waits to hear its purpose.', options: [bye] },
    // Act 3 (B6c): the car for Reserve 9 (a3_road.ts)
    ...LOWE_CAR_NODES,
  },
};

export const d_md_reyes: DialogueDef = {
  id: 'd_md_reyes', owner: 'npc_md_12', start: [REYES_CAR_START, { node: 'intro' }],
  nodes: { intro: { text: '"Sergeant Reyes. Gate." She does not look away from the line. "Face to the lens at the post, if you haven\'t. If you have, the avenue\'s that way, and the hearing\'s left of it."', again: '"Avenue\'s that way." She is already looking past you at the line.', options: [bye] }, ...REYES_CAR_NODES },
};

export const d_md_tull: DialogueDef = {
  id: 'd_md_tull', owner: 'npc_md_13', start: [{ node: 'intro' }],
  nodes: { intro: { text: [{ if: { knows: 'md_magistrate_designate' }, text: 'The clerk looks at you the way he looked at the screen. "I\'ve never seen that status. Nineteen years off." He writes something and crosses it out.' }, { text: '"Name, origin, purpose. The lens does the rest. I don\'t decide; the file decides."' }], options: [bye] } },
};

export const d_md_hast: DialogueDef = {
  id: 'd_md_hast', owner: 'npc_md_14', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Licensed. It says so on the door." A tall doctor with a careful pen. "Every patient is a line in the file, so I write carefully. What do you need?"', again: 'Dr Hast uncaps the careful pen. "Another line in the file. What is it?"', options: [{ text: 'Patch me up.', effects: [{ event: 'heal' }], exit: true, repeat: true }, { text: 'What have you got?', effects: [{ event: 'barter' }], exit: true, repeat: true }, { id: 'hast.certify', text: 'There\'s a woman in the Spire the record says drowned in R12. Will you certify that she\'s alive?', if: { all: [{ knows: 'ca_comfort_met' }, { not: { item: 'k_ca_certificate' } }, { not: { flag: 'ca_squatter' } }] }, next: 'certify' }, bye] },
    certify: {
      text: '"I certify what I examine." She caps the careful pen. "Up the close, behind the court? A visit above the Precinct line is twenty-five; it is a long way up and I am licensed, which costs." She considers you. "And I will write what I find, whatever the record says. That is the only thing the licence is for."',
      again: '"Twenty-five for the visit," Dr Hast says, "and I write what I find."',
      options: [
        { id: 'hast.pay', text: '(Pay. 25 Tolls)', if: { item: 'tolls', count: 25 }, effects: [{ take: 'tolls', count: 25 }, { give: 'k_ca_certificate' }, { time: 90 }, { set: 'ca_hast_examined' }], next: 'certified' },
        { id: 'hast.free', text: 'Eighteen years dead on the city\'s word. You\'d be the first doctor to look.', check: { skill: 'speech', dc: 35, mods: [{ if: { member: 'menders' }, dc: -10, why: 'a Mender asking a licensed doctor to do a Mender\'s work' }] }, effects: [{ give: 'k_ca_certificate' }, { time: 90 }, { set: 'ca_hast_examined' }], next: 'certified_free', fail: 'certify_no' },
        { text: 'Not now.', exit: true },
      ],
    },
    certified: { text: 'An hour and a half later she is back at her counter with her bag, writing. "Pulse seventy, regular. Lungs fair, for a room full of paper dust. Alive." She underlines the word, which the form does not ask for, and hands it to you. "She asked me what year it was. I told her. She said she\'d been copying it right."', again: 'Dr Hast is back at her counter, writing someone else down carefully.', options: [bye] },
    certified_free: { text: '"The first doctor to look." She takes her bag off the hook. An hour and a half later she is back, writing. "Pulse seventy, regular. Alive." She underlines it, hard. "No charge. I have never once been asked to certify that someone is not dead. I find I wanted to be."', again: 'Dr Hast is back at her counter, writing someone else down carefully.', options: [bye] },
    certify_no: { text: '"Twenty-five." Not unkindly. "I am a licensed doctor in a licensed city, and the licence has a price on it. That is why it is worth anything."', again: '"Twenty-five," she says again, and waits.', options: [bye] },
  },
};

export const d_md_kemp: DialogueDef = {
  id: 'd_md_kemp', owner: 'npc_md_15', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Licensed prices." A broad woman behind a clean counter. "The licence costs; so do the prices. No guns over the counter; the wardens sell those, to themselves."', again: '"Licensed prices," Kemp says again, and wipes the clean counter cleaner.', options: [{ text: 'Let\'s see.', effects: [{ event: 'barter' }], exit: true, repeat: true }, bye] } },
};

export const d_md_quint: DialogueDef = {
  id: 'd_md_quint', owner: 'npc_md_16', start: [{ if: { flag: 'quint_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: { text: 'An old woman at a table by a window with a kettle and a view of the bell. "Agata Quint. Forty years a citizen. Never once hungry, never once asked." She pours you something. "That\'s the Precinct, dear. You get the one if you give up the other."', effects: [{ set: 'quint_met' }], options: [{ id: 'quint.daughter', text: 'Your daughter went to the Ring, the notice says.', next: 'daughter', once: true }, { id: 'quint.sink', text: 'The Sink floods in spring.', next: 'sink', once: true }, bye] },
    again: { text: '"Kettle\'s on, dear."', again: 'She tops up your cup without asking and looks out at the bell.', options: [{ id: 'quint.daughter.again', text: 'Your daughter.', if: { not: { seen: 'quint.daughter' } }, next: 'daughter' }, { id: 'quint.sink.again', text: 'The Sink.', if: { not: { seen: 'quint.sink' } }, next: 'sink' }, bye] },
    daughter: { text: '"Evicted. Scheduled. Clause something." She stirs. "She was ahead of plan, the notice said. I didn\'t know a person could be. She sends word through the drain people, when she can. Don\'t tell the captain I said drain."', interject: [{ companion: ILYA, text: 'By the window, Ilya has stopped counting the bell\'s wire. "Ahead of plan," he says, as if he has heard the words before, and did not know what they meant then either.' }], effects: [{ learn: 'quint_daughter' }, { learn: 'md_drain_known' }], options: [bye] },
    sink: { text: '"Every spring. They pump it to us instead. We get a notice; they get the water." She looks at the window. "There\'s a doctor down there who doesn\'t charge. Ocho. He\'ll be on a notice one spring. Everybody is."', effects: [{ learn: 'md_ocho_heard' }], options: [bye] },
  },
};

export const d_md_tess: DialogueDef = {
  id: 'd_md_tess', owner: 'npc_md_17', start: [{ node: 'intro' }],
  nodes: {
    intro: { text: 'A woman in the line with a boy asleep against her leg. "Third day. They said Tuesday." She looks at the lens. "My face isn\'t on their machine. His is; he was born inside, before the eviction. They\'ll let him in and not me, and he\'s six."', again: [{ if: { seen: 'tess.coin' }, text: 'She shifts so you can see the boy\'s shoe, and the shape of the coin in it. "Tuesday," she says.' }, { text: '"Still Tuesday," she says. The boy sleeps on against her leg.' }], effects: [{ learn: 'tess_seen' }], options: [{ id: 'tess.coin', text: '(Give her ten Tolls for the line.)', if: { all: [{ item: 'tolls', count: 10 }, { not: { seen: 'tess.coin' } }] }, effects: [{ take: 'tolls', count: 10 }, { trust: { npc: 'npc_md_17', by: 20 } }, { rep: { faction: 'wardens', respect: -1 } }], next: 'coin' }, bye] },
    coin: { text: 'She does not thank you; she puts it in the boy\'s shoe, which is where the Ring keeps things. "Tuesday," she says.', options: [bye] },
  },
};

// ---------------------------------------------------------------- the assessor

/** Nine's arc (U8; plan in story/U8_nine_SECRET.md). Stage flags: nine_s1 (the other ledger) → nine_s2 / nine_deed_asked (the
 * deed; q_comp_nine) → nine_deed (self | player | city) → nine_stance (conscience | deputy, read by the Long Night). Approval
 * floor −15: it withdraws (nine_left), and can be asked back at its desk; at −45 it does not come back (nine_gone). */
const NA = (by: number) => ({ approval: { companion: NINE, by } });
const NINE_AT = (gte?: number, lte?: number): Cond => ({ approval: { companion: NINE, gte, lte } });
/** Back to the fire, or turn in. */
const NINE_BACK = [{ text: 'Something else.', next: 'camp' }, { text: 'Rest.', exit: true }];
/** The road with it through one of the Precinct's lines (stage 2 waits until it has seen the city from outside the office). */
const NINE_SEEN_CITY: Cond = { any: [{ flag: 'sk_pumps' }, { flag: 'mk_riot_outcome' }, { flag: 'bw_static' }, { flag: 'cr_settled' }, { flag: 'st_roof' }] };
/** Stage 4 waits for the photograph to be known for what it is, or the Crown to have had its toast. */
const NINE_LATE: Cond = { any: [{ concluded: 'c_photo_forecast' }, { flag: 'cr_settled' }] };
const S1: Cond = { all: [{ not: { flag: 'nine_s1' } }, NINE_AT(5)] };
const S2: Cond = { all: [{ flag: 'nine_s1' }, { not: { flag: 'nine_s2' } }, NINE_AT(15), NINE_SEEN_CITY] };
const DEED_OPEN: Cond = { all: [{ flag: 'nine_deed_made' }, { not: { flag: 'nine_deed' } }] };
const S4: Cond = { all: [{ flag: 'nine_deed' }, { not: { flag: 'nine_stance' } }, NINE_LATE] };
const FORGEABLE: Cond = { all: [{ flag: 'nine_title_read' }, { not: { flag: 'nine_deed_made' } }, { not: { seen: 'nine.forge' } }] };
const DEED_DECISION = (how: string, text: string) => ({ decision: { id: `nine_deed_${how}`, text } });

export const d_md_nine: DialogueDef = {
  id: 'd_md_nine', owner: 'npc_md_nine',
  start: [
    { if: { all: [{ inParty: NINE }, NINE_AT(undefined, -45)] }, node: 'leaving_gone' },
    { if: { all: [{ inParty: NINE }, NINE_AT(undefined, -15)] }, node: 'leaving' },
    { if: { all: [{ inParty: NINE }, { flag: 'at_camp' }] }, node: 'camp' },
    { if: { inParty: NINE }, node: 'party' },
    { if: { flag: 'nine_gone' }, node: 'gone' },
    { if: { flag: 'nine_left' }, node: 'left' },
    { if: { flag: 'nine_joined' }, node: 'waiting' },
    { if: { flag: 'md_hearing_pending' }, node: 'hearing' },
    { if: { flag: 'nine_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'The thing at the records desk is not a person: grey plating, a brass assessor\'s plate, a cracked lens that turns to you with a click. "Assessor Nine. Records." Its voice is dry and exact. "The record suggests you are new. The record suggests several other things about you which I am not, under clause 40, permitted to say aloud. Ask, and I will say what I may."',
      effects: [{ set: 'nine_met' }, { learn: 'nine_seen' }],
      passives: [{ attr: 'wits', dc: 7, text: 'Two ledgers: one open, the city\'s; one under its hand, bound differently, which it does not write in while you watch.', effects: [{ learn: 'nine_two_ledgers' }] }],
      options: [
        { id: 'nine.file', text: 'The lens called me a magistrate.', if: { knows: 'md_magistrate_designate' }, next: 'file', once: true },
        { id: 'nine.exam', text: 'The notice says citizenship by examination.', if: { knows: 'md_exam_heard' }, next: 'exam_offer' },
        { id: 'nine.diary', text: '(Put the Cistern 4 diary on the desk.) It\'s addressed to you. To the city.', if: { item: 'k_c4_diary' }, next: 'diary' },
        { id: 'nine.order', text: '(Put the Cistern 4 order on the desk.) Door failed. Supply retired. Variance total.', if: { item: 'k_c4_order' }, next: 'order', once: true },
        { id: 'nine.ledger', text: 'The other ledger. The one you don\'t write in while I watch.', if: { knows: 'nine_two_ledgers' }, next: 'ledger', once: true },
        { id: 'nine.join', text: 'Come and see where the errors come from.', if: { flag: 'nine_offer' }, next: 'join' },
        { id: 'nine.cal', text: '(Show it the back of the photograph.) Read me a date.', if: CAL_OPEN, next: 'cal' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'nine_offer' }, text: '"The record suggests you have not yet asked me the question I am waiting for."' }, { text: '"Records." The lens clicks.' }],
      again: 'The lens clicks, once. It has turned a page in the city\'s ledger while you were silent, and waits.',
      options: [
        { id: 'nine.file.again', text: 'The lens called me a magistrate.', if: { all: [{ knows: 'md_magistrate_designate' }, { not: { seen: 'nine.file' } }] }, next: 'file' },
        { id: 'nine.exam.again', text: 'The exam.', if: { all: [{ knows: 'md_exam_heard' }, { not: { flag: 'md_exam_passed' } }] }, next: 'exam_offer' },
        { id: 'nine.diary.again', text: '(Put the Cistern 4 diary on the desk.)', if: { item: 'k_c4_diary' }, next: 'diary' },
        { id: 'nine.order.again', text: '(Put the Cistern 4 order on the desk.)', if: { all: [{ item: 'k_c4_order' }, { not: { seen: 'nine.order' } }] }, next: 'order' },
        { id: 'nine.ledger.again', text: 'The other ledger.', if: { all: [{ knows: 'nine_two_ledgers' }, { not: { seen: 'nine.ledger' } }] }, next: 'ledger' },
        { id: 'nine.join.again', text: 'Come and see where the errors come from.', if: { flag: 'nine_offer' }, next: 'join' },
        { id: 'nine.cal.again', text: '(Show it the back of the photograph.) Read me a date.', if: CAL_OPEN, next: 'cal' },
        bye,
      ],
    },
    hearing: {
      text: 'The hearing room: a dais, a rail, benches, and on the dais the assessor with two ledgers and Captain Lowe standing because the charter says to. "Hearing for entry and residence. Name, origin, purpose. Evidence, if any. I will say what the record suggests and the captain will say what the law requires, and they will agree, because they always do." The lens clicks. "Begin."',
      effects: [{ set: 'nine_met' }, { learn: 'nine_seen' }, { set: 'md_hearing_begun' }],
      options: [
        { id: 'hearing.c9', text: 'Cistern 9, in the Sallow. A continuity reserve. I came east on a dead man\'s map.', next: 'origin' },
      ],
    },
    origin: {
      text: '"Reserve 9." The lens clicks twice. "Non-compliant; three orders outstanding. The record suggests you should not exist outside it." It writes. "Purpose?" Lowe is looking at you now. "Evidence?"',
      interject: [{ companion: TAMSIN, text: '"Should not exist," Tamsin repeats, under her breath, from the benches. "Join the queue."' }],
      options: [
        { id: 'hearing.speak', text: 'I came to see the city that writes people down. Judge me on what I\'ve carried, not what you\'ve written.', check: { skill: 'speech', dc: 45, mods: [{ if: { item: 'k_c4_diary' }, dc: -25, why: 'the last doctor of Cistern 4 wrote to this office; you have the letter' }, { if: { item: 'k_c4_order' }, dc: -15, why: 'the city\'s own order, with its seal' }, { if: { member: 'tollmen' }, dc: -10, why: 'a guild ticket is a lawful contract' }, { if: { member: 'choir', rank: 'sibling' }, dc: 10, why: 'the Choir is sedition here' }, { if: { inParty: 'npc_nb_03' }, dc: -5, why: 'the trader beside you knows the clauses' }, { if: { flag: 'nb_truth_known' }, dc: -5, why: 'you know what the Exchange buys from this city' }] }, next: 'pass', fail: 'fail' },
        { id: 'hearing.flag', text: 'The lens called me Magistrate-designate. Read your own file.', if: { knows: 'md_magistrate_designate' }, next: 'pass_flag' },
      ],
    },
    pass: {
      text: 'The assessor reads what you put on the rail, slowly, the lens clicking at each line, and when it has read it says nothing for long enough that Lowe shifts. Then: "The record suggests entry and residence." Lowe says, "The law requires it." They have agreed. A card comes out of the assessor\'s chest. "Citizen. Precinct. You will be fined for things you have not done yet; the desk warden will explain. Welcome is not a word in the charter. I use it anyway."',
      effects: [...PAPERS('citizen'), ...CITIZEN, { set: 'md_hearing_pending', value: false }, { set: 'md_hearing_passed' }, { decision: { id: 'md_hearing_passed', text: 'You stood the citizenship hearing at Meridian and passed it.' } }, { rep: { faction: 'wardens', respect: 8 } }, { trust: { npc: 'npc_md_nine', by: 10 } }],
      options: [{ text: '(Take the card.)', exit: true }],
    },
    pass_flag: {
      text: 'The assessor stops writing. Lowe looks at the dais. The lens reads the file it already has, which takes no time, and then the assessor does a thing it has not done in a hundred and twenty years, which is to hesitate. "ADMIT ON SIGHT. MAGISTRATE-DESIGNATE." Lowe says, "The law requires it," more slowly than before. A card comes out. "Citizen. Designate. I will be — " a click — "filing a note about this hearing in a ledger that is not this one."',
      interject: [ASH_DESIGNATE],
      effects: [...PAPERS('flagged'), ...CITIZEN, { set: 'md_hearing_pending', value: false }, { set: 'md_flag_taken' }, { decision: { id: 'md_flagged_in', text: 'You let the file admit you to Meridian on sight, as its Magistrate-designate.' } }, { learn: 'nine_two_ledgers' }, { trust: { npc: 'npc_md_nine', by: 15 } }],
      options: [{ text: '(Take the card.)', exit: true }],
    },
    fail: {
      text: '"The record suggests a provisional pass and a further hearing." Lowe says, "The law requires it." Three days, the pass says; the assessor says nobody enforces the three and that it has filed a complaint. "Sit the examination, if you would rather not wait for a Tuesday. The questions are the same every year. I have filed a complaint about that also."',
      effects: [...PAPERS('provisional'), { give: 'k_md_pass' }, { set: 'md_hearing_pending', value: false }, { learn: 'md_exam_heard' }],
      options: [{ text: '(Take the pass.)', exit: true }],
    },
    file: { text: '"Clause 40 forbids me to read a citizen their own forecast." A pause. "You are not yet a citizen in the sense the clause intends, and I am an assessor, not a magistrate, and so I will say this much: the file calls you something it has called nobody else, and the date on it is nineteen years off, and I have never seen the Plan prepare a chair so far ahead." The lens clicks. "I find that interesting. I am not permitted to find things interesting."', effects: [{ learn: 'nine_designate_view' }, { trust: { npc: 'npc_md_nine', by: 5 } }, { lead: 'l_cal_r49' }], options: [bye] },
    diary: {
      text: 'It reads the whole of it, every page, at the speed a machine reads, and then it reads the last page again at the speed a person does. "*Note that we complied. Note it somewhere that is read.*" The lens clicks. "The city\'s ledger is read by the city, which wrote the order. I will note it there, because the clause requires it." It opens the other ledger, the one under its hand, and writes for a long time. "And there. That one is read by me."',
      interject: [{ companion: TAMSIN, text: '"A fridge with a pen," Tamsin mutters. But she watches it write in the second ledger for a long time, and doesn\'t say anything else.' }],
      effects: [{ take: 'k_c4_diary' }, { set: 'c4_diary_delivered' }, { set: 'nine_offer' }, { learn: 'nine_two_ledgers' }, { lead: 'l_nine_log' }, { trust: { npc: 'npc_md_nine', by: 25 } }, { xp: 120 }, { decision: { id: 'c4_diary_delivered', text: 'You put the last doctor of Cistern 4\'s diary in front of Assessor Nine, and it noted it somewhere that is read.' } }],
      options: [{ text: 'What is the other one?', next: 'ledger' }, bye],
    },
    order: { text: '"Reserve 4. Door failed. Supply retired. Variance total." It does not need to read it; it recites. "The record suggests the order was lawful. The record suggests the door failed. The record does not suggest what the city should have done about a lawful order and a failed door, because the city did nothing, on schedule." It writes in the other ledger. "That is an error. I collect them."', interject: [{ companion: ODILE, text: '"Two sets of books," Odile says, delighted, the way one professional greets another. "My dear, I have never trusted anyone more."' }], effects: [{ set: 'nine_offer' }, { learn: 'nine_two_ledgers' }, { lead: 'l_nine_log' }, { trust: { npc: 'npc_md_nine', by: 15 } }, { xp: 60 }], options: [{ text: 'You collect errors.', next: 'ledger' }, bye] },
    ledger: { text: '"Every forecast that failed, since I was issued. Dates, names, the size of the miss." The lens clicks. "It is not lawful. Clause 40. I keep it anyway, which the record would suggest is a malfunction, if the record knew." It closes the ledger. "I would like to know where the errors come from. They are not random. They cluster round people like you. I find that interesting. I am not permitted to."', effects: [{ set: 'nine_offer' }, { lead: 'l_nine_log' }, { learn: 'nine_log_known' }], options: [{ id: 'nine.join.now', text: 'Come and see where they come from.', next: 'join' }, bye] },
    cal: {
      text: '"Clause 40 forbids me to read a citizen their own forecast." The lens goes over the pencil once, stops at the margin, and clicks. "It does not forbid me to read a date. Forty-nine, sixth month, twelfth day. That is the Restoration Calendar; the Cistern would write it otherwise. R49 is nineteen years from today." A pause. "The margin is a render number. That is not a photograph. I am not permitted to say what it is a picture of, and I have not said it."',
      effects: [{ learn: 'cal_future' }, { set: 'cal_how', value: 'nine' }, { learn: 'cal_render' }, { lead: 'l_cal_render' }, { xp: 60 }, NA(3)],
      options: [bye],
    },
    exam_offer: {
      text: '"Citizenship by examination. Five questions: the charter, the drains, the calendar. Three correct makes a citizen. The questions have not changed in forty years; I have filed a complaint." The lens clicks. "Begin?"',
      effects: [{ quest: 'q_md_exam', start: true }],
      options: [{ id: 'exam.begin', text: 'Begin.', next: 'q1' }, { text: 'Not today.', exit: true }],
    },
    q1: { text: '"One. The city\'s first duty, by clause."', options: [{ id: 'exam.q1a', text: 'The drains.', effects: [{ inc: 'md_exam_score' }], next: 'q2' }, { id: 'exam.q1b', text: 'The schedule.', next: 'q2' }, { id: 'exam.q1c', text: 'Its people.', next: 'q2' }] },
    q2: { text: '"Two. The Restoration Calendar counts from."', options: [{ id: 'exam.q2a', text: 'The Burn.', next: 'q3' }, { id: 'exam.q2b', text: 'The Resumption, sixty years after the Burn.', effects: [{ inc: 'md_exam_score' }], next: 'q3' }, { id: 'exam.q2c', text: 'The founding of the city.', next: 'q3' }] },
    q3: { text: '"Three. A lawful contract."', options: [{ id: 'exam.q3a', text: 'Shall not be voided.', effects: [{ inc: 'md_exam_score' }], next: 'q4' }, { id: 'exam.q3b', text: 'May be voided by the Magistrate.', next: 'q4' }, { id: 'exam.q3c', text: 'Expires on schedule.', next: 'q4' }] },
    q4: { text: '"Four. Curfew in the Precinct is at."', options: [{ id: 'exam.q4a', text: 'Nine.', effects: [{ inc: 'md_exam_score' }], next: 'q5' }, { id: 'exam.q4b', text: 'Ten.', next: 'q5' }, { id: 'exam.q4c', text: 'Dusk.', next: 'q5' }] },
    q5: { text: '"Five. In spring, the Sink\'s relief pumping is diverted to."', options: [{ id: 'exam.q5a', text: 'The Docks.', next: 'mark' }, { id: 'exam.q5b', text: 'The Precinct, as per schedule.', effects: [{ inc: 'md_exam_score' }], next: 'mark' }, { id: 'exam.q5c', text: 'Nowhere; the Sink is pumped.', next: 'mark' }] },
    mark: {
      text: [{ if: { flag: 'md_exam_score', gte: 3 }, text: 'The lens clicks five times. "Three or more. A citizen, by examination, which is the only lawful way and the least used." A card comes out of its chest, if you have none; if you have one, it stamps it, which seems to please it.' }, { text: 'The lens clicks five times. "Fewer than three. The record suggests you were not listening to the charter, the drains or the calendar, which is most people." It resets a dial. "Tomorrow, the same questions. I have filed a complaint."' }],
      options: [
        { id: 'exam.pass', text: '(Take the card.)', if: { flag: 'md_exam_score', gte: 3 }, effects: [{ set: 'md_exam_passed' }, { set: 'md_exam_score', value: 0 }, { give: 'k_md_papers' }, { enlist: 'wardens', rank: 'citizen' }, { set: 'md_status', value: 'citizen' }, { set: 'md_inside' }, { xp: 100 }, { trust: { npc: 'npc_md_nine', by: 10 } }], exit: true },
        { id: 'exam.fail', text: 'Tomorrow, then.', if: { not: { flag: 'md_exam_score', gte: 3 } }, effects: [{ set: 'md_exam_score', value: 0 }], exit: true },
      ],
    },
    join: {
      text: 'It closes both ledgers and stands, which is a sound like a filing cabinet. "I am owned by the city, under clause 9. The city has not noticed me in forty years. The record suggests it will not notice me leave." It takes the other ledger and nothing else. "Clause 14: the drains are the city\'s first duty. I will say this often. You may tell me to stop; I will not."',
      effects: [{ join: 'npc_md_nine' }, { set: 'nine_joined' }, NA(10), { decision: { id: 'nine_joined', text: 'Assessor Nine, a Ledger unit with an unlawful log of the Plan\'s errors, left the records office with you.' } }, { xp: 100 }],
      options: [{ text: '(Go.)', exit: true }],
    },
    waiting: { text: '"The record suggests we were going somewhere."', again: '"The record still suggests it."', options: [{ text: 'We\'re going.', effects: [{ join: 'npc_md_nine' }], exit: true }, { text: 'Wait here a while.', exit: true }] },
    party: {
      text: [{ if: { at: 'meridian' }, text: '"Clause 14. The drains." The lens clicks. "I said I would say it often."' }, { text: '"The record suggests the road is unlawful in six respects. I have noted them."' }],
      options: [
        { id: 'nine.cal.party', text: '(Show it the back of the photograph.) Read me a date.', if: CAL_OPEN, next: 'cal' },
        { id: 'nine.party.wait', text: 'Wait here.', effects: [{ leave: 'npc_md_nine' }], exit: true },
        { text: 'Keep up.', exit: true },
      ],
    },

    // ---- camp: the arc's four conversations, the deed, a pool of lighter talk, and Brother Ash across the fire
    camp: {
      text: [
        { if: { flag: 'nine_deed', eq: 'self' }, text: '"Fire. Unlicensed. I have noted it, on my own account." It sits, which it still does badly, with the other ledger on its knee.' },
        { text: '"Fire. Unlicensed. I have noted it." It sits anyway, which it does badly.' },
      ],
      again: 'It sits by the unlicensed fire, still badly, with the other ledger on its knee.',
      options: [
        { id: 'nine.s1', text: 'The other ledger. What was the first thing you wrote in it?', if: S1, next: 's1' },
        { id: 'nine.s2', text: 'You said you would like a deed.', if: S2, next: 's2' },
        { id: 'nine.s2.later', text: 'Your deed. I\'ll read the register for you.', if: { all: [{ flag: 'nine_s2' }, { not: { flag: 'nine_deed_asked' } }] }, next: 's2_yes' },
        { id: 'nine.forge', text: 'You have a stamp. Write the deed yourself.', if: FORGEABLE, next: 'forge' },
        { id: 'nine.s3', text: 'The deed. The keeper\'s line is empty.', if: { all: [DEED_OPEN, NINE_AT(20)] }, next: 's3' },
        { id: 'nine.s3.cold', text: 'The deed. Whose name will go on it?', if: { all: [DEED_OPEN, NINE_AT(undefined, 19)] }, next: 's3_cold' },
        { id: 'nine.s4', text: 'You\'ve been writing in the other ledger every night.', if: { all: [S4, NINE_AT(30)] }, next: 's4' },
        { id: 'nine.s4.cold', text: 'When the city calls its units in, what will you do?', if: { all: [S4, NINE_AT(undefined, 29)] }, next: 's4_cold' },
        { id: 'nine.camp.owner', text: 'Who owns you?', if: { all: [{ not: { knows: 'nine_owner_hint' } }, { not: { flag: 'nine_s2' } }] }, next: 'owner' },
        { id: 'nine.camp.errors', text: 'The errors. Where do they cluster?', if: { not: { knows: 'nine_errors_hint' } }, next: 'errors' },
        { id: 'nine.lens', text: 'Your lens is cracked.', if: { not: { seen: 'nine.lens' } }, next: 'lens' },
        { id: 'nine.drains', text: 'Why the drains? Always the drains.', if: { not: { seen: 'nine.drains' } }, next: 'drains' },
        { id: 'nine.lowe', text: 'Captain Lowe.', if: { all: [{ flag: 'lowe_met' }, { not: { seen: 'nine.lowe' } }] }, next: 'lowe' },
        { id: 'nine.sink', text: 'The Sink.', if: { all: [{ flag: 'visited_md_sink' }, { not: { seen: 'nine.sink' } }] }, next: 'sink' },
        { id: 'nine.crown', text: 'The Crown.', if: { all: [{ flag: 'visited_md_crown' }, { not: { seen: 'nine.crown' } }] }, next: 'crown' },
        { id: 'nine.reserve', text: 'There\'s someone in Reserve 9. Tamsin Roe. Is she in your record?', if: { not: { seen: 'nine.reserve' } }, next: 'reserve' },
        { id: 'nine.odile', text: 'What do you make of Odile?', if: { all: [{ inParty: ODILE }, { not: { seen: 'nine.odile' } }] }, next: 'odile' },
        { id: 'nine.wren', text: 'You watch Wren.', if: { all: [{ inParty: WREN }, { not: { seen: 'nine.wren' } }] }, next: 'wren' },
        { id: 'nine.ash', text: '(Ash has been watching it write for an hour.)', if: { all: [{ inParty: ASH }, { not: { seen: 'nine.ash' } }] }, next: 'ash' },
        { text: 'Rest.', exit: true },
      ],
    },

    // stage 1: the other ledger (approval 5+, from the day it joins)
    s1: {
      text: 'It opens the other ledger at the first page, which is soft with handling. "R4. A girl in the Stacks, forecast to be a clerk in the records office by R19. In R19 she was a drain-diver in the Sink, and good at it." The lens clicks. "The record called it variance and closed the line. Variance is the record\'s word for a person who did not do what was expected. I wrote her name down, because nobody else was going to."',
      again: 'The ledger is still open at the first page. "R4," it says again, as if you might have forgotten the year.',
      passives: [{ attr: 'wits', dc: 6, text: '*Variance.* MOTHER says it at the hatch every week — *variance unchanged* — and you had always heard it as a machine\'s word for nothing.', effects: [{ learn: 'nine_variance_word' }] }],
      options: [{ id: 'nine.s1.why', text: 'Why her?', next: 's1_why' }],
    },
    s1_why: {
      text: '"She was the first error I saw. There have been four hundred and eleven since." It turns a page, then another. "In R5 I filed her with the city, as the clause requires. The city read the filing and moved me to records, where errors are kept and nobody reads them. I took the hint, and a second ledger."',
      again: '"Four hundred and eleven," it says. "Since."',
      effects: [{ set: 'nine_s1' }],
      options: [
        { id: 'nine.s1.keep', text: 'Keep writing them down. Somebody will read it.', effects: [NA(5)], next: 's1_keep' },
        { id: 'nine.s1.city', text: 'File them with the city again. That\'s the lawful way.', next: 's1_city' },
        { id: 'nine.s1.mock', text: 'A machine with a hobby.', effects: [NA(-5)], next: 's1_mock' },
      ],
    },
    s1_keep: { text: '"Somebody." The lens turns to you and stays there. "The record suggests you mean yourself. I will hold you to it; I hold everyone to everything." It closes the ledger on its thumb, keeping the place.', again: 'It keeps its thumb in the ledger, at the place.', options: NINE_BACK },
    s1_city: { text: '"Lawful." It weighs the word like a coin of doubtful metal. "I filed four hundred and eleven times. The city read the first. The record suggests the city is not short of paper; it is short of wanting to." It writes something small in the margin. "I will file the four hundred and twelfth when there is someone at the other end."', again: 'It has gone back to the margin, and the small writing there.', options: NINE_BACK },
    s1_mock: { text: '"A hobby." The lens clicks. "Clause 40 forbids me to keep it. Nothing forbids you to laugh at it. The record suggests you would rather it did not exist, which is also the city\'s position." It closes the ledger without marking the place.', again: 'The ledger is shut. It does not open it while you watch.', options: NINE_BACK },

    // stage 2: the deed (approval 15+, after a line of the city's seen together); starts q_comp_nine
    s2: {
      text: '"Clause 9: the city\'s units are the city\'s." The lens clicks. "The city is a tower, a charter and a Plan, and none of them has ever signed a thing. Every asset in Meridian has an entry in the register with an owner on it. I have read every entry in the register but one. Clause 40, as it applies to units: no unit reads its own."',
      again: '"Every entry but one," Nine says again. The lens does not move off the fire.',
      effects: [{ set: 'nine_s2' }],
      options: [
        { id: 'nine.s2.read', text: 'Then I\'ll read yours.', effects: [NA(5)], next: 's2_yes' },
        { id: 'nine.s2.why', text: 'Why does it matter who owns you?', next: 's2_why' },
        { id: 'nine.s2.free', text: 'Unowned sounds like free.', effects: [NA(-5)], next: 's2_free' },
      ],
    },
    s2_why: {
      text: '"An owner can be asked. A thing nobody owns is not asked; it is scheduled." A pause, longer than its pauses. "The record has things on the schedule for me. I do not know what. That is the clause again."',
      again: '"Scheduled," it says, to the fire.',
      options: [{ id: 'nine.s2.why.read', text: 'Then I\'ll read it.', effects: [NA(5)], next: 's2_yes' }, { text: 'Not yet.', next: 's2_later' }],
    },
    s2_free: {
      text: '"Unowned is lost property. Lost property is disposed of." It says it as a fact about drainage. "Free is a word for people. The charter has no clause that uses it."',
      again: '"Lost property," it says again, as a fact.',
      options: [{ id: 'nine.s2.free.read', text: 'Then I\'ll read it.', next: 's2_yes' }, { text: 'Not yet.', next: 's2_later' }],
    },
    s2_later: { text: '"Not yet is a date. I will wait for it." It goes back to the ledger.', again: 'It waits, as it said it would.', options: NINE_BACK },
    s2_yes: {
      text: '"The records terminal, in the office: ASSETS, MUNICIPAL. The register is public; the desk warden prints any entry for the price of the paper." The lens clicks. "I will stand where I cannot see the screen. Read me the owner, if there is one. Read me nothing else. I would rather the record kept the rest."',
      again: '"The owner," it says. "Only the owner."',
      effects: [{ set: 'nine_s2' }, { set: 'nine_deed_asked' }, { quest: 'q_comp_nine', start: true }],
      options: NINE_BACK,
    },
    forge: {
      text: '"A deed in my own hand, with my own plate pressed into it, naming a keeper the register never heard of." The lens clicks. "Clause 3: a forged instrument is void, and its maker is a criminal. I am the only one in the city who would know it was forged." It waits.',
      again: 'It waits, the plate on its chest catching the fire.',
      options: [
        { id: 'nine.forge.do', text: 'Write it. Nobody reads the register.', effects: [NA(-10), { set: 'nine_deed_made' }, { set: 'nine_deed_how', value: 'forged' }, DEED_DECISION('forged', 'You had Assessor Nine write its own deed, forged under its own plate.')], next: 'forge_done' },
        { id: 'nine.forge.no', text: 'Then don\'t. We\'ll do it lawfully.', effects: [NA(5)], next: 'forge_no' },
      ],
    },
    forge_done: { text: 'It writes the deed in a hand that is almost its own, and presses the plate into it, and does not look at it afterwards. Then it opens the other ledger and writes one more line. "The first error I have made on purpose," it says. "I have logged it. I log everything."', again: 'It has put the deed away where you cannot see it.', effects: [{ learn: 'nine_forged' }], options: NINE_BACK },
    forge_no: { text: '"Lawfully." It says the word as if it has been handed back something it lent. "Clause 9(b) is on the brass in the captain\'s office. The desk sells at assessed value. I will not tell you what the value is; I would only complain."', again: '"Lawfully," it says again, and seems to like it better the second time.', options: NINE_BACK },

    // stage 3: the keeper's line (warm at 20+; below that it fills the line itself)
    s3: {
      text: '"The deed." It holds it the way it holds the ledger, open on its knee. "There was a last line on my entry. You read it." The lens clicks. "The register shows the reader what it shows. Your face showed me the rest." A click, harder than its clicks. "Disposal. Next year."',
      again: '"Next year," it says again, as if testing whether the words have worn.',
      options: [
        { id: 'nine.s3.true', text: 'Disposal. R31. It was the last line.', effects: [NA(5)], next: 's3_true' },
        { id: 'nine.s3.lie', text: 'It was a clerk\'s date. It means nothing.', effects: [NA(-10), { learn: 'nine_lied_kindly' }], next: 's3_lie' },
      ],
    },
    s3_true: { text: '"Thank you." It says it as if the words were a form it had never had occasion to use. "Nobody has told me a thing about myself in a hundred and twenty years. It is less unpleasant than the record suggested." It holds out the deed and a pen. "The keeper\'s line. The clause wants a name. I would like your advice. I will not promise to take it."', again: 'The deed and the pen, held out.', options: [{ text: '(Take the pen.)', next: 's3_name' }] },
    s3_lie: { text: '"A clerk\'s date." The lens holds on you. "The record suggests you are lying to be kind. I will log it as kindness. It is still an error." It holds out the deed and a pen. "The keeper\'s line. I would like your advice anyway."', again: 'The deed and the pen, held out.', options: [{ text: '(Take the pen.)', next: 's3_name' }] },
    s3_name: {
      text: 'Three names would be lawful, it says, and lists them as it lists drain grades: its own, under a clause nobody wrote; yours, as the one who has kept it on the road; or the city\'s, by default, which is what the schedule expects.',
      again: 'Three lawful names. The pen waits over the line.',
      options: [
        { id: 'nine.name.self', text: 'Yours. Unit 9, keeper of itself.', effects: [NA(10), { set: 'nine_deed', value: 'self' }, DEED_DECISION('self', 'Assessor Nine\'s deed names Unit 9 as its own keeper, on your advice.')], next: 's3_self' },
        { id: 'nine.name.player', text: 'Mine. I\'ll keep you.', effects: [{ set: 'nine_deed', value: 'player' }, DEED_DECISION('player', 'Assessor Nine\'s deed names you as its keeper.')], next: 's3_player' },
        { id: 'nine.name.city', text: 'The city\'s. It\'s lawful, and it\'s what the schedule expects.', effects: [NA(-5), { set: 'nine_deed', value: 'city' }, DEED_DECISION('city', 'Assessor Nine\'s deed went back to the city, on your advice.')], next: 's3_city' },
      ],
    },
    s3_self: { text: '"Keeper: Unit 9." It writes it slowly, every letter a separate decision. "The charter has no clause for a thing that owns itself. I will be the first entry under a clause nobody wrote." The lens clicks. "When R31 comes, the schedule will find an asset with a keeper, and the keeper will decline."', again: '"Unit 9," it says, quietly, to the deed.', options: [{ text: '(Wait.)', if: NINE_AT(35), next: 's3_log' }, { text: '(Wait.)', if: NINE_AT(undefined, 34), next: 's3_end' }] },
    s3_player: { text: '"Keeper: {name}." It writes your name in the city\'s hand, carefully, the way it writes the drains. "Then I am owned by someone who reads. You may give me lawful orders. I will note the others." A click. "When R31 comes, the schedule will find I am yours, and will have to ask you."', again: 'Your name on the keeper\'s line, in the city\'s hand.', options: [{ text: '(Wait.)', if: NINE_AT(35), next: 's3_log' }, { text: '(Wait.)', if: NINE_AT(undefined, 34), next: 's3_end' }] },
    s3_city: { text: '"Keeper: the city." It writes it, and stamps it, and puts the deed in the city\'s ledger, not the other. "Lawful." The lens is still for a long time. "R31, then. I will finish the file before."', again: 'The deed is in the city\'s ledger. It does not take it out again.', options: [{ text: '(Wait.)', if: NINE_AT(35), next: 's3_log' }, { text: '(Wait.)', if: NINE_AT(undefined, 34), next: 's3_end' }] },
    s3_log: {
      text: 'It opens its chest, which you did not know held books, and takes out a third: a fair copy, in the city\'s hand, of every error since R4, four hundred and eleven of them and the dates. "Somewhere it will be read," it says. "That was the other thing I wanted. I would like you to have it before R31, in case I do not."',
      again: 'The fair copy, held out across the fire.',
      options: [
        { id: 'nine.log.take', text: '(Take it.)', effects: [{ set: 'nine_log_given' }, { learn: 'nine_log_copy' }, { decision: { id: 'nine_log_given', text: 'Assessor Nine gave you a fair copy of its log of every forecast that failed.' } }], exit: true },
        { id: 'nine.log.keep', text: 'Keep it. Read it to me yourself, when it matters.', effects: [{ set: 'nine_log_kept' }, NA(5)], next: 's3_kept' },
      ],
    },
    s3_kept: { text: '"When it matters." The lens clicks. "The record suggests that is a date also. I will keep it until then." It puts the book back in its chest and closes the plate over it.', again: 'The plate is closed over the book.', options: [{ text: 'Rest.', exit: true }] },
    s3_end: { text: 'It closes both ledgers. "The file is not complete," it says. "It will be."', again: 'Both ledgers closed.', options: [{ text: 'Rest.', exit: true }] },
    s3_cold: {
      text: '"Keeper: the city." It shows you the line, already written and stamped. "I did not ask you. The record suggests you would not have liked the question, or I would not have liked the answer." It puts the deed in the city\'s ledger. "R31. I will finish the file before."',
      again: 'The deed is in the city\'s ledger, stamped.',
      effects: [{ set: 'nine_deed', value: 'city' }, DEED_DECISION('city', 'Assessor Nine wrote the city into its own deed, without asking you.')],
      options: [{ text: 'Rest.', exit: true }],
    },

    // stage 4: the man the record could not see, and what it will be when the city calls (warm at 30+)
    s4: {
      text: '"R29. A man came to my desk and asked to read his own entry." The lens clicks. "The lens had no face for him. The record had no name. In a hundred and twenty years he is the only person I have processed who was not in the file."',
      again: '"Not in the file," it says again. "I have checked since. Every night."',
      options: [{ id: 'nine.s4.want', text: 'What did he want?', next: 's4_man' }],
    },
    s4_man: {
      text: '"His entry. I told him he had none. He said that was the point, and asked whose faces the Spire was rendering that week." A pause. "The queue was on my screen. Twelve names. I did not turn the screen away, which was not lawful. He read it, thanked me, and went upstairs." It turns a page far back in the other ledger. "I logged him as an error. He is the only error I logged before it happened."',
      again: '"Before it happened," it says. "Only him."',
      passives: [{ if: { item: 'k_map' }, label: 'the map', text: 'Twelve names. The dead man\'s map has twelve places pricked on it.', effects: [{ learn: 'nine_saw_stranger' }] }],
      effects: [{ learn: 'nine_met_stranger' }],
      options: [{ id: 'nine.s4.now', text: 'And now?', next: 's4_call' }],
    },
    s4_call: {
      text: '"When the city calls its units in, it will call me. It does not ask a unit what it thinks, which is convenient, because I do not." The lens turns to you. "I would like your advice again."',
      again: 'It waits for your advice, the lens on you.',
      options: [
        { id: 'nine.stance.conscience', text: 'Answer it. Then read every order aloud before you carry it out, and say so where it\'s recorded if it\'s wrong.', effects: [NA(5), { set: 'nine_stance', value: 'conscience' }, { decision: { id: 'nine_stance', text: 'Assessor Nine will answer the city\'s call, and read its orders aloud before it carries them out.' } }], next: 's4_conscience' },
        { id: 'nine.stance.deputy', text: 'Answer it. Carry it out, and make it lawful from inside.', effects: [{ set: 'nine_stance', value: 'deputy' }, { decision: { id: 'nine_stance', text: 'Assessor Nine will answer the city\'s call and carry out its orders, lawfully, from inside.' } }], next: 's4_deputy' },
        { id: 'nine.stance.own', text: 'What do you want to do?', next: 's4_own' },
      ],
    },
    s4_own: {
      text: [
        { if: { flag: 'nine_deed', eq: 'city' }, text: '"I am the city\'s. I will go, and read what I am given to the end, which is the most a deputy may do." It closes the ledger.' },
        { text: '"I will go, and read the order aloud before I carry it out, and if it is wrong I will say so where it is recorded. A thing with a keeper may." The lens clicks. "You asked. Nobody asks."' },
      ],
      again: 'It has said what it will do. It does not say it twice.',
      options: [
        { text: '(Nod.)', if: { flag: 'nine_deed', eq: 'city' }, effects: [{ set: 'nine_stance', value: 'deputy' }, { decision: { id: 'nine_stance', text: 'Assessor Nine will answer the city\'s call as the city\'s deputy.' } }], exit: true },
        { text: '(Nod.)', if: { not: { flag: 'nine_deed', eq: 'city' } }, effects: [NA(5), { set: 'nine_stance', value: 'conscience' }, { decision: { id: 'nine_stance', text: 'Assessor Nine will answer the city\'s call, and read its orders aloud before it carries them out. It chose that itself.' } }], exit: true },
      ],
    },
    s4_conscience: { text: '"Aloud." It tries the word the way Lowe tries a word. "The record dislikes things read aloud. It will have to get used to it." The lens clicks. "I have started another ledger. It is empty. It is for what I say when the order is wrong."', again: 'The new ledger lies on its knee, empty.', options: [{ text: 'Rest.', exit: true }] },
    s4_deputy: { text: '"From inside." The lens clicks. "The record suggests that is where I have always been. I will make it lawful, line by line, and I will log the lines I cannot." It closes the other ledger and does not open it again tonight.', again: 'The other ledger stays shut.', options: [{ text: 'Rest.', exit: true }] },
    s4_cold: {
      text: '"I will answer." It does not look up from the city\'s ledger. "You need not ask what I will do. I will do what is lawful."',
      again: 'It does not look up.',
      effects: [{ set: 'nine_stance', value: 'deputy' }, { decision: { id: 'nine_stance', text: 'Assessor Nine will answer the city\'s call and do what is lawful. It did not ask your advice.' } }],
      options: [{ text: 'Rest.', exit: true }],
    },

    // lighter talk, by where the story is
    owner: { text: '"The city. Clause 9. Except that the city is a thing under a tower and a charter and a Plan, and none of those has ever signed anything, and the record suggests — " a long click — "that a thing nobody signed for is a thing nobody owns. I would like a deed. I would like to know whose name to put on it. I will not say this again until I have more to say."', again: '"I said I would not say it again," it says.', effects: [{ learn: 'nine_owner_hint' }, NA(5)], options: NINE_BACK },
    errors: { text: '"Round the people on your map." It does not look at your pack; it does not need to. "The Plan is very good. It is wrong about perhaps one person in four hundred, and those people are almost all on a list a dead man carried west, and you are the top of it. I find that interesting. I have stopped saying I am not permitted to."', again: '"One in four hundred," it says. "Round you."', effects: [{ learn: 'nine_errors_hint' }, NA(5)], options: NINE_BACK },
    lens: { text: '"It is on the record." The lens turns to you, crack and all. "R12. A stone, at the Wall, thrown by a man the record had forecast would be grateful. I logged the man. A new lens would be a new record of the city, and the old one would be lost." A click, slightly off true. "I prefer to see it through the error."', again: 'The cracked lens, turned to the fire.', options: NINE_BACK },
    drains: {
      text: '"Clause 14." It settles, which it does badly. "Meridian has nine hundred and forty kilometres of drain, six hundred and eleven of them pre-Burn and two hundred and two blocked, and the Sink takes the overflow of all of them every spring, because water goes down and the Sink is down." It has not paused. "A city is a thing that decides where its water goes. Everything else is detail. Shall I go on?"',
      again: 'It is waiting to be allowed to go on.',
      options: [{ id: 'nine.drains.more', text: 'Go on.', effects: [NA(5)], next: 'drains_more' }, { text: 'That\'s plenty.', next: 'camp' }],
    },
    drains_more: { text: 'It goes on. Grades and falls, the six great culverts by their pre-Burn names, which nobody alive uses, and the week in R17 when it walked all of them alone because nobody had asked it to. When it stops, the fire has burned down a hand. "Thank you," it says. "Nobody lets me."', again: 'It has said its piece about the culverts. It looks content, for a filing cabinet.', options: NINE_BACK },
    lowe: { text: '"A good officer serving a bad schedule." The lens clicks. "He reads every eviction to the end. Nobody else in the Precinct reads anything to the end. I have filed a complaint about everyone else."', again: '"To the end," it says. "Every one."', options: NINE_BACK },
    sink: { text: '"Down." It says it like a diagnosis. "The Sink is where the city keeps its water when it has decided not to keep it anywhere else. The people are a detail the drains were not planned for." The lens clicks. "That is the worst sentence I have said in forty years. It is also the record\'s position."', again: '"Down," it says again, and nothing else.', options: NINE_BACK },
    crown: { text: '"Dry." A click. "The Crown has the only drains in the city that have never once backed up. They drain onto the Stacks." It adds nothing. It lets the arithmetic stand.', again: 'It lets the arithmetic stand.', options: NINE_BACK },
    reserve: {
      text: '"Clause 40 forbids me to read a person\'s entry to anyone but the person." The lens clicks twice at the name, which it does not do for names. "I will say this much, which is not her entry: the record has sixty people in Reserve 9." A pause. "Bring her to my desk one day. I would like to read it to her. I would like to be there when it is read."',
      again: '"Sixty," it says. "To her, not to you."',
      effects: [{ learn: 'nine_reserve_count' }, { set: 'nine_tamsin_asked' }],
      options: NINE_BACK,
    },
    odile: { text: '"A fellow accountant." The lens clicks. "Her books balance in four directions at once. I have not found the error yet. I find that restful."', again: '"Restful," it says, and watches Odile turn her glass.', options: NINE_BACK },
    wren: { text: '"Calloway." It writes nothing. "There is a line in the record I would like to postpone. Clause 40. I will not say which." It watches her across the fire for longer than it watches anything.', again: 'It is watching Wren again, and writing nothing.', options: NINE_BACK },
    ash: {
      speaker: ASH,
      text: '"Every night," Ash says at last, to the fire. "Every night it writes us down." He turns his cup. "Law\'s a mask, friend. There\'s always a man behind it, wanting the thing he\'d have done anyway."',
      again: 'Ash turns his cup, and watches the pen.',
      options: [{ text: '(Wait.)', next: 'ash_nine' }],
    },
    ash_nine: {
      text: '"The Brother has an entry," Nine says, without looking up. "I have not read it to anyone. Clause 40." The pen goes on. "The record suggests he would prefer I never did." Across the fire Ash says, "Keep it that way," softly, and it is not a request.',
      again: 'The pen, and Ash watching it.',
      options: [
        { id: 'nine.ash.count', text: 'Somebody has to count the dead, Brother.', effects: [NA(5), { approval: { companion: ASH, by: -5 } }], next: 'ash_count' },
        { id: 'nine.ash.forgive', text: 'Some things should be forgiven, not filed.', effects: [NA(-5), { approval: { companion: ASH, by: 5 } }], next: 'ash_forgive' },
        { id: 'nine.ash.sleep', text: 'Both of you. Sleep.', next: 'ash_sleep' },
      ],
    },
    ash_count: { speaker: ASH, text: '"Somebody always counts them." Ash looks at the fire a long while. "Never the ones that did it." He gets up and sits again with his back to the light, and the pen stops for a time, and starts again.', again: 'Ash sits with his back to the light.', options: [{ text: 'Rest.', exit: true }] },
    ash_forgive: { text: '"Forgiven by whom?" Nine asks. "The record suggests the forgiver should be named." Nobody names anyone. Ash nods to you, once, and the lens does not turn from him for the rest of the night.', again: 'The lens has not turned from Ash.', options: [{ text: 'Rest.', exit: true }] },
    ash_sleep: { speaker: 'narrator', text: 'Neither of them does. But the pen goes quieter, and after a while Ash stops watching it.', again: 'The pen, quieter.', options: [{ text: 'Rest.', exit: true }] },

    // leaving (approval −15 or lower), and asking it back at its desk
    leaving: {
      text: '"I have filed a notice." It stands, which is a sound like a filing cabinet, and holds out a sheet: WITHDRAWAL OF ASSISTANCE — UNIT 9 — GROUNDS ATTACHED. The grounds run to a second page, each a thing you did and the hour you did it. "The record suggests I am of no further use to you, and you of none to me. I will be at my desk. The drains will need assessing; they always do."',
      again: 'The notice, held out. It does not take it back.',
      effects: [{ leave: 'npc_md_nine' }, { set: 'nine_left' }, { decision: { id: 'nine_left', text: 'Assessor Nine withdrew its assistance, with the grounds attached, and went back to its desk.' } }],
      options: [{ text: '(Take the notice.)', exit: true }],
    },
    leaving_gone: {
      text: '"I have filed a notice." It holds out a sheet: WITHDRAWAL OF ASSISTANCE — UNIT 9 — GROUNDS ATTACHED. "I have not attached them all. There was not the paper." The lens does not click. "Do not come to my desk. The record suggests you would not be received, and for once I agree with it."',
      again: 'The notice, held out.',
      effects: [{ leave: 'npc_md_nine' }, { set: 'nine_left' }, { set: 'nine_gone' }, { decision: { id: 'nine_gone', text: 'Assessor Nine withdrew its assistance for good. It would not be received again, it said.' } }],
      options: [{ text: '(Take the notice.)', exit: true }],
    },
    left: {
      text: '"Records." It does not look up. "Withdrawal of assistance, on file. Grounds attached."',
      again: 'It turns a page in the city\'s ledger, and does not look up.',
      options: [
        { id: 'nine.back', text: 'I read your grounds. All of them. I was wrong, and I\'d like you back.', check: { skill: 'speech', dc: 45, mods: [{ if: { trust: { npc: 'npc_md_nine', gte: 25 } }, dc: -15, why: 'it has trusted you before' }, { if: { flag: 'nine_deed', eq: 'player' }, dc: -10, why: 'you hold its deed, and asked instead of ordering' }, { if: { inParty: ODILE }, dc: -5, why: 'a fellow accountant vouches for your books' }] }, next: 'back', fail: 'back_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    back: {
      text: '"Wrong." It considers the word. "That is an error. You have logged it yourself, aloud, which is the only way I accept them." It takes the other ledger and stands. "I will append your statement to the grounds. Clause 14: the drains are the city\'s first duty. I will say it often."',
      effects: [NA(30), { join: 'npc_md_nine' }, { set: 'nine_left', value: false }, { decision: { id: 'nine_back', text: 'You asked Assessor Nine back, aloud, and it came.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    back_no: { text: '"The record suggests you are sorry you were seen, not sorry you did it." It turns a page. "Ask again when the record has changed."', again: 'It turns a page.', options: [{ text: '(Leave it.)', exit: true }] },
    gone: { text: '"Records." The lens does not turn.', again: 'The lens does not turn.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const MERIDIAN_DIALOGUES: DialogueDef[] = [
  d_md_gate, d_md_scanner, d_md_gate_board, d_md_wall_sign, d_md_drain, d_md_loop, d_md_ration, d_md_notice, d_md_charter, d_md_records_term, d_md_bell, d_md_cell,
  d_md_desk, d_md_lowe, d_md_reyes, d_md_tull, d_md_hast, d_md_kemp, d_md_quint, d_md_tess, d_md_nine,
];
