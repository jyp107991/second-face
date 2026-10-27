import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Meridian, the Precinct: the gate and the lens, the hearing, the cells, the records office and the assessor who
 * keeps the file — and a tram platform where the rest of the city starts.
 */

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 22, to: 5 } };
const PAPERS = (status: string) => [{ set: 'md_status', value: status }, { set: 'md_inside' }, { xp: 150 }];
const CITIZEN = [{ give: 'k_md_papers' }, { enlist: 'wardens', rank: 'citizen' }];

// ---------------------------------------------------------------- the gate

export const d_md_gate: DialogueDef = {
  id: 'd_md_gate', owner: 'npc_md_12',
  start: [{ if: { flag: 'md_fight' }, node: 'fight' }, { if: { flag: 'md_status' }, node: 'through' }, { if: { flag: 'md_scanned' }, node: 'after_scan' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A sergeant in grey at the gate with a carbine and a face that has turned back a thousand people politely. "Face to the lens, then we talk. Everyone. The lens doesn\'t care who you are; it cares whether it has seen you."',
      options: [
        { id: 'gate.lens', text: '(Face the lens.)', next: 'scan' },
        { id: 'gate.line', text: 'What\'s the line for?', next: 'line', once: true },
        { id: 'gate.push', text: '(Wait for the crowd to push, and push with it.)', check: { attr: 'brawn', dc: 6 }, next: 'push_ok', fail: 'push_no' },
        { text: 'Not yet.', exit: true },
      ],
    },
    after_scan: {
      text: '"The lens has you. Hearing, or whatever the file says."',
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
      effects: [{ learn: 'md_magistrate_designate' }, { lead: 'l_photo_light' }],
      options: [
        { id: 'status.accept', text: 'Then admit me on sight.', next: 'flag' },
        { id: 'status.refuse', text: 'I\'ll stand the hearing like anyone.', next: 'hearing_go' },
        { id: 'status.edit', text: '(While they stare at each other: the booth terminal is unlocked.)', check: { skill: 'science', dc: 50 }, next: 'edit_ok', fail: 'edit_no' },
        { text: '(Step back from the lens.)', exit: true },
      ],
    },
    flag: {
      text: 'The clerk prints a card. The sergeant stamps it without looking at it, which she has never done. CITIZEN — PRECINCT — ENTRY AND RESIDENCE — and, smaller, DESIGNATE. "The avenue\'s straight ahead," she says. "The schedule holds." It sounds, for once, like a question.',
      effects: [...PAPERS('flagged'), ...CITIZEN, { set: 'md_flag_taken' }, { decision: { id: 'md_flagged_in', text: 'You let the file admit you to Meridian on sight, as its Magistrate-designate.' } }, { rep: { faction: 'wardens', respect: 10 } }],
      options: [{ text: '(Through.)', exit: true }],
    },
    hearing_go: { text: '"Hearing." The sergeant writes something that is not your name. "Records office, inside, left of the avenue. The assessor sits. Take what papers you have; it reads everything." She lifts the barrier for you alone, which the line notices.', effects: [{ set: 'md_inside' }, { set: 'md_hearing_pending' }], options: [{ text: '(Through.)', exit: true }] },
    edit_ok: { text: 'Two lines, while the sergeant is still saying *designate* and the clerk is still saying *nineteen years*: the status field takes a value it already knows, CITIZEN, and the name field takes one it does not. The screen agrees with you. The clerk turns back and prints a card for someone who does not exist.', effects: [...PAPERS('forged'), { give: 'k_md_papers' }, { set: 'md_forged' }, { decision: { id: 'md_forged', text: 'You edited your own file at Meridian\'s gate and entered as a citizen who does not exist.' } }, { xp: 80 }], options: [{ text: '(Through.)', exit: true }] },
    edit_no: { text: 'The screen flashes red and says so, aloud. The sergeant\'s carbine comes round. "Hands." The cells, then: the Precinct has a procedure.', effects: [{ set: 'md_detained' }, { set: 'md_inside' }, { event: 'goto', data: { location: 'md_precinct', spawn: 'cell' } }], options: [{ text: '(Hands.)', exit: true }] },
    push_ok: { text: 'The crowd goes at the gate at dusk the way it does every dusk, and tonight you are in the front of it with your shoulder down, and the barrier gives, and you are through in the crush with no card and a sergeant\'s voice behind you saying *let them, let them, count them tomorrow*.', effects: [...PAPERS('smuggled'), { set: 'md_pushed' }, { decision: { id: 'md_pushed', text: 'You pushed through Meridian\'s gate with the crowd.' } }, { time: 240 }], options: [{ text: '(Through.)', exit: true }] },
    push_no: { text: 'The crowd goes at the gate and the wardens go at the crowd, and a club finds your head in the second row, and the next thing is tile under your cheek and a fence door.', effects: [{ set: 'md_detained' }, { set: 'md_inside' }, { time: 240 }, { event: 'goto', data: { location: 'md_precinct', spawn: 'cell' } }], options: [{ text: '(Wake up.)', exit: true }] },
    through: { text: '"Card." She looks, and nods, and the barrier lifts.', options: [{ text: '(Through.)', exit: true }] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_md_scanner: DialogueDef = {
  id: 'd_md_scanner', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A glass eye on a post, a green light under it, a cable into the booth. It has seen more faces than anyone alive, and forgotten none of them.', effects: [{ learn: 'md_scanner_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_gate_board: DialogueDef = {
  id: 'd_md_gate_board', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'PRECINCT OF MERIDIAN — ENTRY BY CARD, HEARING OR LICENCE — CURFEW 21:00 — WATER BY RATION — ALL PERSONS ARE RECORDED. Under it, the Ledger\'s seal, and a smaller line: THE SCHEDULE HOLDS.', effects: [{ learn: 'md_rules_read' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_wall_sign: DialogueDef = {
  id: 'd_md_wall_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Painted on the Wall in letters a man high, old and renewed: RESTORATION YEAR 30. Beside it, in letters a hand high, newer and not renewed: THE RING BURNS AND YOU COUNT.', effects: [{ learn: 'md_year_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_drain: DialogueDef = {
  id: 'd_md_drain', owner: 'narrator',
  start: [{ if: { flag: 'md_inside' }, node: 'inside' }, { node: 'mouth' }],
  nodes: {
    mouth: {
      text: 'A storm drain under the Wall, south of the gate, grated, its grate bent where someone has been through before. A warden walks the top of the Wall above it every quarter-hour.',
      options: [
        { id: 'drain.go', text: '(Wait for the warden to pass, and go under.)', check: { skill: 'stealth', dc: 40, mods: [{ if: NIGHT, dc: -10, why: 'the Wall\'s lamps do not reach the drain' }] }, next: 'go_ok', fail: 'go_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    go_ok: { text: 'Forty feet of pipe on your elbows with the city\'s water a hand deep, and a grate at the far end that lifts, and a back lane behind the tenements with a lamp at the end of it and nobody under the lamp.', effects: [...PAPERS('smuggled'), { set: 'md_drained' }, { decision: { id: 'md_drained', text: 'You went under Meridian\'s Wall by the storm drain.' } }, { event: 'goto', data: { location: 'md_precinct', spawn: 'drain', minutes: 20 } }], options: [{ text: '(Through.)', exit: true }] },
    go_no: { text: 'The grate shrieks on its hinge. On the Wall a lamp swings round and a voice says *stay there*, in the tone of someone who knows you won\'t.', effects: [{ time: 30 }, { rep: { faction: 'wardens', respect: -3 } }], options: [{ text: '(Run.)', exit: true }] },
    inside: { text: 'The drain\'s inside mouth, in the back lane. It goes out under the Wall to the rubble, if you ever need a way out the lens does not watch.', effects: [{ learn: 'md_drain_known' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- inside

export const d_md_loop: DialogueDef = {
  id: 'd_md_loop', owner: 'narrator',
  start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — PRECINCT PLATFORM. A board of district names with a fare beside each: OLD MARKET 2 · LANTERN ROW 2 · THE STACKS 3 · BRIDGEWARD 3 · THE DOCKS 4 · THE CROWN (BY INVITATION). The tram on the rail hums with its doors open. Most of the names have a chalk line through them today: WORKS.',
      effects: [{ learn: 'md_loop_seen' }],
      options: [
        { id: 'loop.market', text: 'Old Market. (2 Tolls)', if: { all: [{ flag: 'md_market_open' }, { item: 'tolls', count: 2 }] }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_market', spawn: 'loop', minutes: 15 } }], exit: true },
        { id: 'loop.works', text: '(The lines through the names.)', next: 'works' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    works: { text: 'WORKS, in chalk, on every line but the Precinct\'s. A citizen waiting on the bench says it has said WORKS since the spring, and that the works are on schedule, and that the schedule is the works.', effects: [{ learn: 'md_loop_works' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_md_ration: DialogueDef = {
  id: 'd_md_ration', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: [{ if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, text: 'A standpipe with a dial and a board: WATER — PRECINCT — RATION 0.8 — REBALANCING (SUPPLY NETWORK 4). The dial has been turned down a fifth. Somebody has written under it: *since the Sallow*.' }, { text: 'A standpipe with a dial and a board: WATER — PRECINCT — RATION 1.0 — ON SCHEDULE. The dial is clean.' }], effects: [{ learn: 'md_ration_seen' }, { lead: 'l_precinct_rationing' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_notice: DialogueDef = {
  id: 'd_md_notice', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Under glass: EVICTIONS, SCHEDULED (4). HEARINGS, TUESDAY AND FRIDAY. THE SINK: SPRING RELIEF PUMPING WILL BE DIVERTED TO THE PRECINCT AS PER SCHEDULE. CITIZENS ARE REMINDED THAT THE RING IS OUTSIDE THE LAW. And a smaller card: RECORDS OFFICE — CITIZENSHIP BY EXAMINATION — ASK FOR THE ASSESSOR.', effects: [{ learn: 'md_notice_read' }, { learn: 'md_exam_heard' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_charter: DialogueDef = {
  id: 'd_md_charter', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'The charter, cast in brass, in clauses. CLAUSE 1: THE CITY KEEPS ITS PEOPLE. CLAUSE 14: THE DRAINS ARE THE CITY\'S FIRST DUTY. CLAUSE 31: A LAWFUL CONTRACT SHALL NOT BE VOIDED. CLAUSE 60: THE RESTORATION SHALL PROCEED ON SCHEDULE. Someone has polished clause 14 more than the others.', effects: [{ learn: 'md_charter_read' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_md_records_term: DialogueDef = {
  id: 'd_md_records_term', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The records terminal, green on black like the Exchange\'s board and older. A list scrolls: CONTINUITY RESERVES — 1 RELOCATED R0+1 — 2 RELOCATED R0+1 — 3 LOST — 4 NON-COMPLIANT (DOOR) — 5 RELOCATED R0+3 — 6 LOST — 7 SOLD (CONCERN) — 8 LOST — 9 OUTSTANDING (CARETAKER NON-COMPLIANT, ORDERS 3). Then it scrolls off.', effects: [{ learn: 'md_reserves_list' }, { lead: 'l_cisterns_relocate' }, { lead: 'l_c4_same_order' }], options: [{ text: '(Step back.)', exit: true }] } },
};

export const d_md_bell: DialogueDef = {
  id: 'd_md_bell', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'The curfew bell on its post, rung by a wire from the station at nine. Old Sabel Quint says it has never once been late, and says it the way other people say a prayer.', options: [{ text: '(Leave it.)', exit: true }] } },
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
    flag: { text: 'It reads it. The lens clicks twice. "ADMIT ON SIGHT. MAGISTRATE-DESIGNATE." A long pause. "The record suggests I should have let you in at the gate. The record suggests a great many things." It prints a card from somewhere inside its chest. "Citizen. Designate. The fence door is open; it was never locked, which I will not be putting in the file."', options: [{ text: '(Out.)', exit: true }] },
    lowe: { text: '"Captain Lowe recruits from the cells. It is lawful; clause 22. It is also," the lens clicks, "a thing I would not do. A card, then, and grey, and the schedule." The fence door is open.', options: [{ text: '(Out.)', exit: true }] },
    open: { text: 'The cell, empty, the fence door open. It was never locked.', options: [{ text: '(Leave it.)', exit: true }] },
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
        bye,
      ],
    },
    again: { text: '"Three fines. Forty-five."', options: [{ id: 'desk.pay.again', text: '(Pay. 45 Tolls)', if: { item: 'tolls', count: 45 }, effects: [{ take: 'tolls', count: 45 }, { give: 'k_md_receipt' }, { set: 'md_fines_paid' }, { rep: { faction: 'wardens', respect: 4 } }], next: 'paid_now' }, { id: 'desk.contest.again', text: 'I haven\'t done any of it.', if: { not: { flag: 'md_fines_contested' } }, next: 'contest' }, bye] },
    contest: { text: '"Yet." He says it gently. "You can contest a forecast fine at the Court of Accounts. By appointment. The appointment is — " he looks at a book — "when the schedule says." He writes CONTESTED on the notice and stamps it, which seems to make him happier than the fine did.', effects: [{ set: 'md_fines_contested' }, { learn: 'md_court_heard' }], options: [bye] },
    paid_now: { text: 'He stamps a receipt, twice. "Paid. You\'re a person the Precinct has no complaint against." He thinks about it. "Including the ones it hasn\'t had yet."', options: [bye] },
    paid: { text: '"No complaints on file. That\'s rare, here."', options: [bye] },
    bail_info: { text: '"A hundred, to the assessor, in the cell. It likes to do it itself."', options: [bye] },
  },
};

export const d_md_lowe: DialogueDef = {
  id: 'd_md_lowe', owner: 'npc_md_01',
  start: [{ if: { flag: 'md_fight' }, node: 'fight' }, { if: { flag: 'lowe_met' }, node: 'again' }, { node: 'intro' }],
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
        bye,
      ],
    },
    again: { text: '"Captain." He has stood up again.', options: [{ id: 'lowe.lawful.again', text: 'Lawful and right are two words.', if: { not: { seen: 'lowe.lawful' } }, next: 'lawful' }, { id: 'lowe.flag.again', text: 'The lens called me a magistrate.', if: { all: [{ knows: 'md_magistrate_designate' }, { not: { seen: 'lowe.flag' } }] }, next: 'flag' }, { id: 'lowe.ring.again', text: 'The Ring is burning.', if: { not: { seen: 'lowe.ring' } }, next: 'ring' }, { id: 'lowe.water.again', text: 'Your water\'s rationed.', if: { all: [{ any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, { not: { seen: 'lowe.water' } }] }, next: 'water' }, bye] },
    lawful: { text: '"They are." He sits. "I know the difference. I carry out the lawful one and I grieve the other one, at home, where it isn\'t on the record. If you have a third word, I would like to hear it. Nobody has had one yet."', effects: [{ learn: 'lowe_grieves' }, { trust: { npc: 'npc_md_01', by: 10 } }], options: [bye] },
    flag: { text: 'He looks at you for a long time. "Then one day you will sit where the assessor sits and sign what I carry out." He does not say it unkindly. "I\'ll stand for you then, too. I\'d rather you were someone who knew the two words."', effects: [{ learn: 'lowe_mirror' }, { memory: { npc: 'npc_md_01', tag: 'designate', valence: 5, strength: 80 } }], options: [bye] },
    ring: { text: '"The Ring is outside the law. Outside the Wall. The charter keeps the city\'s people; the Ring stopped being the city\'s on a date I can show you." He does not reach for it. "Every dusk they push. Every dusk we hold. Nobody dies of it, mostly. I count them in the morning."', effects: [{ learn: 'lowe_ring' }], options: [bye] },
    recruit: { text: '"Clause 22. The wardens may recruit from those detained, at the captain\'s discretion." He looks at you. "Grey, and a card, and the schedule. It is the only door out of a cell that doesn\'t cost coin or days. It costs something else, which I won\'t pretend about."', effects: [{ learn: 'md_lowe_offer' }], options: [bye] },
    water: { text: '"Point eight. Rebalancing, the notice says." He is quiet. "Somebody in the Sallow turned a dial and the Precinct drinks less and the Sink floods a week earlier in spring. That is what *the Plan rebalances* means. I check the arithmetic. It is always right."', effects: [{ learn: 'lowe_rebalance' }, { lead: 'l_precinct_rationing' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_md_reyes: DialogueDef = {
  id: 'd_md_reyes', owner: 'npc_md_12', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Sergeant Reyes. Gate." She does not look away from the line. "Face to the lens at the post, if you haven\'t. If you have, the avenue\'s that way, and the hearing\'s left of it."', options: [bye] } },
};

export const d_md_tull: DialogueDef = {
  id: 'd_md_tull', owner: 'npc_md_13', start: [{ node: 'intro' }],
  nodes: { intro: { text: [{ if: { knows: 'md_magistrate_designate' }, text: 'The clerk looks at you the way he looked at the screen. "I\'ve never seen that status. Nineteen years off." He writes something and crosses it out.' }, { text: '"Name, origin, purpose. The lens does the rest. I don\'t decide; the file decides."' }], options: [bye] } },
};

export const d_md_hast: DialogueDef = {
  id: 'd_md_hast', owner: 'npc_md_14', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Licensed. It says so on the door." A tall doctor with a careful pen. "Every patient is a line in the file, so I write carefully. What do you need?"', options: [{ text: 'Patch me up.', effects: [{ event: 'heal' }], exit: true }, { text: 'What have you got?', effects: [{ event: 'barter' }], exit: true }, bye] } },
};

export const d_md_kemp: DialogueDef = {
  id: 'd_md_kemp', owner: 'npc_md_15', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Licensed prices." A broad woman behind a clean counter. "The licence costs; so do the prices. No guns over the counter; the wardens sell those, to themselves."', options: [{ text: 'Let\'s see.', effects: [{ event: 'barter' }], exit: true }, bye] } },
};

export const d_md_quint: DialogueDef = {
  id: 'd_md_quint', owner: 'npc_md_16', start: [{ if: { flag: 'quint_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: { text: 'An old woman at a table by a window with a kettle and a view of the bell. "Sabel Quint. Forty years a citizen. Never once hungry, never once asked." She pours you something. "That\'s the Precinct, dear. You get the one if you give up the other."', effects: [{ set: 'quint_met' }], options: [{ id: 'quint.daughter', text: 'Your daughter went to the Ring, the notice says.', next: 'daughter', once: true }, { id: 'quint.sink', text: 'The Sink floods in spring.', next: 'sink', once: true }, bye] },
    again: { text: '"Kettle\'s on, dear."', options: [{ id: 'quint.daughter.again', text: 'Your daughter.', if: { not: { seen: 'quint.daughter' } }, next: 'daughter' }, { id: 'quint.sink.again', text: 'The Sink.', if: { not: { seen: 'quint.sink' } }, next: 'sink' }, bye] },
    daughter: { text: '"Evicted. Scheduled. Clause something." She stirs. "She was ahead of plan, the notice said. I didn\'t know a person could be. She sends word through the drain people, when she can. Don\'t tell the captain I said drain."', effects: [{ learn: 'quint_daughter' }, { learn: 'md_drain_known' }], options: [bye] },
    sink: { text: '"Every spring. They pump it to us instead. We get a notice; they get the water." She looks at the window. "There\'s a doctor down there who doesn\'t charge. Ocho. He\'ll be on a notice one spring. Everybody is."', effects: [{ learn: 'md_ocho_heard' }], options: [bye] },
  },
};

export const d_md_tess: DialogueDef = {
  id: 'd_md_tess', owner: 'npc_md_17', start: [{ node: 'intro' }],
  nodes: {
    intro: { text: 'A woman in the line with a boy asleep against her leg. "Third day. They said Tuesday." She looks at the lens. "My face isn\'t on their machine. His is; he was born inside, before the eviction. They\'ll let him in and not me, and he\'s six."', effects: [{ learn: 'tess_seen' }], options: [{ id: 'tess.coin', text: '(Give her ten Tolls for the line.)', if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }, { trust: { npc: 'npc_md_17', by: 20 } }, { rep: { faction: 'wardens', respect: -1 } }], next: 'coin' }, bye] },
    coin: { text: 'She does not thank you; she puts it in the boy\'s shoe, which is where the Ring keeps things. "Tuesday," she says.', options: [bye] },
  },
};

// ---------------------------------------------------------------- the assessor

export const d_md_nine: DialogueDef = {
  id: 'd_md_nine', owner: 'npc_md_nine',
  start: [
    { if: { all: [{ inParty: 'npc_md_nine' }, { flag: 'at_camp' }] }, node: 'camp' },
    { if: { inParty: 'npc_md_nine' }, node: 'party' },
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
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'nine_offer' }, text: '"The record suggests you have not yet asked me the question I am waiting for."' }, { text: '"Records." The lens clicks.' }],
      options: [
        { id: 'nine.file.again', text: 'The lens called me a magistrate.', if: { all: [{ knows: 'md_magistrate_designate' }, { not: { seen: 'nine.file' } }] }, next: 'file' },
        { id: 'nine.exam.again', text: 'The exam.', if: { all: [{ knows: 'md_exam_heard' }, { not: { flag: 'md_exam_passed' } }] }, next: 'exam_offer' },
        { id: 'nine.diary.again', text: '(Put the Cistern 4 diary on the desk.)', if: { item: 'k_c4_diary' }, next: 'diary' },
        { id: 'nine.order.again', text: '(Put the Cistern 4 order on the desk.)', if: { all: [{ item: 'k_c4_order' }, { not: { seen: 'nine.order' } }] }, next: 'order' },
        { id: 'nine.ledger.again', text: 'The other ledger.', if: { all: [{ knows: 'nine_two_ledgers' }, { not: { seen: 'nine.ledger' } }] }, next: 'ledger' },
        { id: 'nine.join.again', text: 'Come and see where the errors come from.', if: { flag: 'nine_offer' }, next: 'join' },
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
      effects: [...PAPERS('flagged'), ...CITIZEN, { set: 'md_hearing_pending', value: false }, { set: 'md_flag_taken' }, { decision: { id: 'md_flagged_in', text: 'You let the file admit you to Meridian on sight, as its Magistrate-designate.' } }, { learn: 'nine_two_ledgers' }, { trust: { npc: 'npc_md_nine', by: 15 } }],
      options: [{ text: '(Take the card.)', exit: true }],
    },
    fail: {
      text: '"The record suggests a provisional pass and a further hearing." Lowe says, "The law requires it." Three days, the pass says; the assessor says nobody enforces the three and that it has filed a complaint. "Sit the examination, if you would rather not wait for a Tuesday. The questions are the same every year. I have filed a complaint about that also."',
      effects: [...PAPERS('provisional'), { give: 'k_md_pass' }, { set: 'md_hearing_pending', value: false }, { learn: 'md_exam_heard' }],
      options: [{ text: '(Take the pass.)', exit: true }],
    },
    file: { text: '"Clause 40 forbids me to read a citizen their own forecast." A pause. "You are not yet a citizen in the sense the clause intends, and I am an assessor, not a magistrate, and so I will say this much: the file calls you something it has called nobody else, and the date on it is nineteen years off, and I have never seen the Plan prepare a chair so far ahead." The lens clicks. "I find that interesting. I am not permitted to find things interesting."', effects: [{ learn: 'nine_designate_view' }, { trust: { npc: 'npc_md_nine', by: 5 } }], options: [bye] },
    diary: {
      text: 'It reads the whole of it, every page, at the speed a machine reads, and then it reads the last page again at the speed a person does. "*Note that we complied. Note it somewhere that is read.*" The lens clicks. "The city\'s ledger is read by the city, which wrote the order. I will note it there, because the clause requires it." It opens the other ledger, the one under its hand, and writes for a long time. "And there. That one is read by me."',
      effects: [{ take: 'k_c4_diary' }, { set: 'c4_diary_delivered' }, { set: 'nine_offer' }, { learn: 'nine_two_ledgers' }, { lead: 'l_nine_log' }, { trust: { npc: 'npc_md_nine', by: 25 } }, { xp: 120 }, { decision: { id: 'c4_diary_delivered', text: 'You put the last doctor of Cistern 4\'s diary in front of Assessor Nine, and it noted it somewhere that is read.' } }],
      options: [{ text: 'What is the other one?', next: 'ledger' }, bye],
    },
    order: { text: '"Reserve 4. Door failed. Supply retired. Variance total." It does not need to read it; it recites. "The record suggests the order was lawful. The record suggests the door failed. The record does not suggest what the city should have done about a lawful order and a failed door, because the city did nothing, on schedule." It writes in the other ledger. "That is an error. I collect them."', effects: [{ set: 'nine_offer' }, { learn: 'nine_two_ledgers' }, { lead: 'l_nine_log' }, { trust: { npc: 'npc_md_nine', by: 15 } }, { xp: 60 }], options: [{ text: 'You collect errors.', next: 'ledger' }, bye] },
    ledger: { text: '"Every forecast that failed, since I was issued. Dates, names, the size of the miss." The lens clicks. "It is not lawful. Clause 40. I keep it anyway, which the record would suggest is a malfunction, if the record knew." It closes the ledger. "I would like to know where the errors come from. They are not random. They cluster round people like you. I find that interesting. I am not permitted to."', effects: [{ set: 'nine_offer' }, { lead: 'l_nine_log' }, { learn: 'nine_log_known' }], options: [{ id: 'nine.join.now', text: 'Come and see where they come from.', next: 'join' }, bye] },
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
      effects: [{ join: 'npc_md_nine' }, { set: 'nine_joined' }, { approval: { companion: 'npc_md_nine', by: 10 } }, { decision: { id: 'nine_joined', text: 'Assessor Nine, a Ledger unit with an unlawful log of the Plan\'s errors, left the records office with you.' } }, { xp: 100 }],
      options: [{ text: '(Go.)', exit: true }],
    },
    waiting: { text: '"The record suggests we were going somewhere."', options: [{ text: 'We\'re going.', effects: [{ join: 'npc_md_nine' }], exit: true }, { text: 'Wait here a while.', exit: true }] },
    party: {
      text: [{ if: { at: 'meridian' }, text: '"Clause 14. The drains." The lens clicks. "I said I would say it often."' }, { text: '"The record suggests the road is unlawful in six respects. I have noted them."' }],
      options: [
        { id: 'nine.party.wait', text: 'Wait here.', effects: [{ leave: 'npc_md_nine' }], exit: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    camp: {
      text: '"Fire. Unlicensed. I have noted it." It sits anyway, which it does badly.',
      options: [
        { id: 'nine.camp.owner', text: 'Who owns you?', if: { not: { knows: 'nine_owner_hint' } }, next: 'owner' },
        { id: 'nine.camp.errors', text: 'The errors. Where do they cluster?', if: { not: { knows: 'nine_errors_hint' } }, next: 'errors' },
        { text: 'Rest.', exit: true },
      ],
    },
    owner: { text: '"The city. Clause 9. Except that the city is a thing under a tower and a charter and a Plan, and none of those has ever signed anything, and the record suggests — " a long click — "that a thing nobody signed for is a thing nobody owns. I would like a deed. I would like to know whose name to put on it. I will not say this again until I have more to say."', effects: [{ learn: 'nine_owner_hint' }, { approval: { companion: 'npc_md_nine', by: 5 } }], options: [{ text: 'Rest.', exit: true }] },
    errors: { text: '"Round the people on your map." It does not look at your pack; it does not need to. "The Plan is very good. It is wrong about perhaps one person in four hundred, and those people are almost all on a list a dead man carried west, and you are the top of it. I find that interesting. I have stopped saying I am not permitted to."', effects: [{ learn: 'nine_errors_hint' }, { approval: { companion: 'npc_md_nine', by: 5 } }], options: [{ text: 'Rest.', exit: true }] },
  },
};

export const MERIDIAN_DIALOGUES: DialogueDef[] = [
  d_md_gate, d_md_scanner, d_md_gate_board, d_md_wall_sign, d_md_drain, d_md_loop, d_md_ration, d_md_notice, d_md_charter, d_md_records_term, d_md_bell, d_md_cell,
  d_md_desk, d_md_lowe, d_md_reyes, d_md_tull, d_md_hast, d_md_kemp, d_md_quint, d_md_tess, d_md_nine,
];
