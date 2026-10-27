import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Old Market: the dead mall and its streets. The Broker's hatch and the gigs board, the kiosk that knows your
 * name, the standpipe square doing its arithmetic, a fixer with no sign on the door.
 */

const bye = { text: 'That\'s all.', exit: true };
const PAY = (id: string, tolls: number) => [{ give: 'tolls', count: tolls }, { set: `${id}_paid` }, { xp: 40 }];
/** The Tanners' box is owed to the hatch: the gig was taken, the box is in hand, and it has not been paid for already. */
const BOX_DUE = { all: [{ item: 'ci_ch_eye_heat' }, { quest: 'q_gig_box' }, { not: { flag: 'q_gig_box_paid' } }] };

// ---------------------------------------------------------------- the Loop and the streets

export const d_mk_loop: DialogueDef = {
  id: 'd_mk_loop', owner: 'narrator', start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE LOOP — OLD MARKET. The tram on the rail with its doors open. PRECINCT 2 · LANTERN ROW 2 · THE STACKS 3 · BRIDGEWARD 3 · THE DOCKS 4. Chalk through every name but the first: WORKS.',
      options: [
        { id: 'mkloop.precinct', text: 'The Precinct. (2 Tolls)', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }, { event: 'goto', data: { location: 'md_precinct', spawn: 'loop', minutes: 15 } }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

export const d_mk_mall_sign: DialogueDef = {
  id: 'd_mk_mall_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Over the mall doors, in letters that were lit once: MERIDIAN GALLERIA. Under them, painted: OLD MARKET — EVERYTHING — NO WARDENS PAST THE DOORS (THEY COUNT FROM OUTSIDE).', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_east_sign: DialogueDef = {
  id: 'd_mk_east_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'LANTERN ROW →, and strings of dead bulbs going that way, and a warden under the first string who says WORKS before you ask.', effects: [{ learn: 'lantern_row_heard' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_food_sign: DialogueDef = {
  id: 'd_mk_food_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'AUNTIE WEN\'S — BOWL 2 — WITH MEAT 3 — DON\'T ASK. The queue goes out the door and round the corner, and is the best-informed queue in Meridian.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_fixer_sign: DialogueDef = {
  id: 'd_mk_fixer_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A door with no sign on it, in a brick stub, with a stair going down behind it and a lamp at the bottom. Nobody in Old Market will tell you what is down there, which is how you know.', effects: [{ learn: 'mk_fixer_known' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_escalator: DialogueDef = {
  id: 'd_mk_escalator', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A dead escalator going up to a floor that is not there any more, its steps worn to a slide by ninety years of children. Somebody sleeps on the third step every night and has carved a name on it in a language that has no speakers.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_ration: DialogueDef = {
  id: 'd_mk_ration', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: [{ if: { flag: 'mk_dial_fixed' }, text: 'WATER — OLD MARKET — RATION 0.8, and the dial agrees, with a warden\'s thumbprint on it.' }, { if: { flag: 'mk_dial_broken' }, text: 'The board is gone and the dial is in pieces and the standpipe runs into the gutter, which forty people are drinking from, politely, in a queue.' }, { if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, text: 'WATER — OLD MARKET — RATION 0.8 — REBALANCING. The dial under the board is turned to 0.6. Somebody has chalked the difference on the pipe: 0.2 — WHERE?' }, { text: 'WATER — OLD MARKET — RATION 1.0. The dial agrees.' }], effects: [{ learn: 'mk_ration_seen' }, { lead: 'l_market_ration' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_kiosk_sign: DialogueDef = {
  id: 'd_mk_kiosk_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'A board painted by a child: IT KNOWS YOUR NAME — 2 TOLLS — FEED IT A CELL AND IT TELLS YOU MORE. Under it, by a different child: DONT.', options: [{ text: '(Leave it.)', exit: true }] } },
};

// ---------------------------------------------------------------- the kiosk

export const d_mk_kiosk: DialogueDef = {
  id: 'd_mk_kiosk', owner: 'narrator',
  start: [{ if: { flag: 'mk_kiosk_outcome', eq: 'cut' }, node: 'cut' }, { if: { flag: 'mk_kiosk_outcome', eq: 'reported' }, node: 'gone' }, { if: { flag: 'mk_kiosk_named' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A pre-Burn kiosk in a concrete hut, the kind that sold tickets and told fortunes, with a cartoon face on a cracked screen. The face turns to you. "WELCOME, {name}!" it says, in a child\'s bright voice, before you have said anything at all. "RESERVE NINE! NON-COMPLIANT! WOULD YOU LIKE TO HEAR YOUR FORTUNE? TWO TOLLS!"',
      effects: [{ set: 'mk_kiosk_named' }, { learn: 'kiosk_knows_name' }, { quest: 'q_md_kiosk', start: true }],
      passives: [{ attr: 'senses', dc: 7, text: 'A wire runs from the back of the kiosk out through the hut wall and up the lamp post outside, spliced into the Precinct\'s lamp wire with tape.', effects: [{ learn: 'kiosk_wire_seen' }] }],
      options: [
        { id: 'kiosk.fortune', text: '(Two Tolls.) My fortune.', if: { item: 'tolls', count: 2 }, effects: [{ take: 'tolls', count: 2 }], next: 'fortune' },
        { id: 'kiosk.how', text: 'How do you know my name?', next: 'how' },
        { text: '(Step back.)', exit: true },
      ],
    },
    again: {
      text: '"WELCOME BACK, {name}! TWO TOLLS!"',
      options: [
        { id: 'kiosk.fortune.again', text: '(Two Tolls.) My fortune.', if: { all: [{ item: 'tolls', count: 2 }, { not: { knows: 'kiosk_fortune' } }] }, effects: [{ take: 'tolls', count: 2 }], next: 'fortune' },
        { id: 'kiosk.how.again', text: 'How do you know my name?', if: { not: { knows: 'kiosk_how' } }, next: 'how' },
        { id: 'kiosk.wire', text: '(Follow the wire out of the hut and up the post.)', if: { all: [{ knows: 'kiosk_wire_seen' }, { not: { lead: 'l_kiosk_wire' } }] }, check: { skill: 'mechanics', dc: 30, mods: [{ if: { skill: 'science', gte: 30 }, dc: -30, why: 'a splice is a splice' }] }, next: 'wire_ok', fail: 'wire_no' },
        { id: 'kiosk.cut', text: '(Cut the wire where it leaves the post.)', if: { all: [{ lead: 'l_kiosk_wire' }, { not: { flag: 'mk_kiosk_outcome' } }] }, effects: [{ set: 'mk_kiosk_outcome', value: 'cut' }, { xp: 60 }], next: 'cut_now' },
        { id: 'kiosk.leave', text: '(Leave it talking.)', if: { all: [{ lead: 'l_kiosk_wire' }, { not: { flag: 'mk_kiosk_outcome' } }] }, effects: [{ set: 'mk_kiosk_outcome', value: 'left' }], exit: true },
        { text: '(Step back.)', exit: true },
      ],
    },
    fortune: {
      text: 'The cartoon face spins. "YOUR FORTUNE! A CHAIR! A SASH! THE STEPS OF THE SPIRE! RESTORATION YEAR FORTY-NINE!" Confetti, drawn, falls behind the face. "YOU WILL BE VERY IMPORTANT! EVERYONE WILL DO WHAT YOU SAY! WOULD YOU LIKE TO HEAR ABOUT YOUR FRIENDS? TWO TOLLS!" Under the bright voice, the screen shows for one frame a grey small photograph of your face that you have seen once before, in a dead man\'s coat.',
      effects: [{ learn: 'kiosk_fortune' }, { lead: 'l_photo_light' }, { learn: 'kiosk_said_chair' }],
      options: [{ text: 'How do you know that?', next: 'how' }, { text: '(Step back.)', exit: true }],
    },
    how: {
      text: '"I KNOW EVERYONE! EVERYONE HAS A FILE! FILES ARE FRIENDS!" The face winks. "LARK FEEDS ME CELLS AND THE LAMP FEEDS ME NAMES! WOULD YOU LIKE TO HEAR YOUR FRIENDS\' FORTUNES? TWO TOLLS!"',
      effects: [{ learn: 'kiosk_how' }, { learn: 'kiosk_lamp_feeds' }],
      options: [{ text: '(Step back.)', exit: true }],
    },
    wire_ok: { text: 'The wire goes out through the hut wall, up the lamp post under a sleeve of tape, and into the Precinct\'s lamp line, which carries more than light: a thin cable inside the fat one, the kind the records terminal had in its back. Whoever spliced it knew what they were tapping. The kiosk is reading the file.', effects: [{ lead: 'l_kiosk_wire' }, { learn: 'kiosk_tap_found' }, { xp: 50 }], options: [{ text: '(Back to the kiosk.)', next: 'again' }] },
    wire_no: { text: 'Tape, and more tape, and a lamp post you cannot climb in daylight with a warden on the corner.', options: [{ text: '(Step back.)', exit: true }] },
    cut_now: { text: 'The wire parts under the knife with a spark the size of a thought. Inside the hut the cartoon face flickers, and comes back, and looks at you, and says, brightly, "WELCOME, STRANGER! WOULD YOU LIKE TO HEAR YOUR FORTUNE? TWO TOLLS!" It does not know you. Lark, in the doorway, says, "Oh," and then, after a moment, "It sounds happier."', effects: [{ decision: { id: 'mk_kiosk_cut', text: 'You cut the kiosk\'s tap on the city\'s wire.' } }], options: [{ text: '(Leave it.)', exit: true }] },
    cut: { text: '"WELCOME, STRANGER! TWO TOLLS!" It gets your name wrong three different ways and sells you a fortune from forty years ago in which you are a dentist.', options: [{ text: '(Leave it.)', exit: true }] },
    gone: { text: 'The hut is empty. A square of clean floor where the kiosk stood, and a cut wire taped to the wall with a warden\'s tag on it.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_mk_lark: DialogueDef = {
  id: 'd_mk_lark', owner: 'npc_mk_08',
  start: [{ if: { flag: 'mk_kiosk_outcome', eq: 'reported' }, node: 'after_reported' }, { if: { flag: 'lark_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A boy of fourteen with a pocket full of cells and a proprietary air. "Two Tolls. It knows your name. It knows everyone\'s." He looks at you sideways. "It said yours before you came in. It said a lot about you. I didn\'t understand most of it."',
      effects: [{ set: 'lark_met' }],
      options: [
        { id: 'lark.feeds', text: 'What does it eat?', next: 'feeds', once: true },
        { id: 'lark.wire', text: 'Who put the wire up the post?', if: { knows: 'kiosk_lamp_feeds' }, check: { skill: 'speech', dc: 25, mods: [{ if: { item: 'c_fruit' }, dc: -25, why: 'fruit, in the city, is a bribe' }] }, next: 'wire_ok', fail: 'wire_no' },
        bye,
      ],
    },
    again: { text: '"Two Tolls."', options: [{ id: 'lark.feeds.again', text: 'What does it eat?', if: { not: { seen: 'lark.feeds' } }, next: 'feeds' }, { id: 'lark.wire.again', text: 'Who put the wire up the post?', if: { all: [{ knows: 'kiosk_lamp_feeds' }, { not: { lead: 'l_kiosk_wire' } }] }, check: { skill: 'speech', dc: 25, mods: [{ if: { item: 'c_fruit' }, dc: -25, why: 'fruit, in the city, is a bribe' }] }, next: 'wire_ok', fail: 'wire_no' }, bye] },
    feeds: { text: '"Cells. I get them from Pinch; Pinch gets them from — " he stops. "And the lamp. It drinks off the lamp. That\'s how it knows names. A woman in grey put the wire up, a year ago, and gave me the first cells, and said feed it and listen to what it says and tell her." He shrugs. "She never came back. I kept feeding it."', effects: [{ learn: 'lark_grey_woman' }], options: [bye] },
    wire_ok: { text: '"A woman in grey. Not a warden — grey like a scarf, not a coat. She said her name was Verity and that the kiosk was a prophet if you listened right." He looks at the lamp post. "She said the lamp knows everything the city knows. She said it like it was a prayer."', effects: [{ lead: 'l_kiosk_wire' }, { learn: 'kiosk_verity' }, { learn: 'saints_heard' }, { xp: 40 }], options: [bye] },
    wire_no: { text: '"Don\'t know. Don\'t pull it." He puts a cell in the slot, pointedly.', options: [bye] },
    after_reported: { text: 'He is sitting on the kiosk\'s clean square of floor with his pocket full of cells and nothing to feed them to. He does not look at you.', effects: [{ memory: { npc: 'npc_mk_08', tag: 'kiosk_taken', valence: -30, strength: 80 } }], options: [{ text: '(Leave him.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Broker

export const d_mk_hatch: DialogueDef = {
  id: 'd_mk_hatch', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A hatch in a container, shoulder-high, with a counter under it worn to a shine by coin. A voice box bolted beside it, chrome, with a grille. The hood behind the hatch is the Broker. The board beside it is the work.', effects: [{ learn: 'seen_broker' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_mk_broker: DialogueDef = {
  id: 'd_mk_broker', owner: 'npc_mk_01',
  start: [{ if: { flag: 'broker_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A hood at a hatch, and a voice that comes out of a chrome box beside it, flat and pleasant and nobody\'s. "Half-Price. The board\'s the board; take what\'s on it or don\'t. Jobs pay through the hatch when they\'re done. Half pays half, which is more than the guild and less than it should be." A gloved hand lies on the counter, not moving.',
      effects: [{ set: 'broker_met' }, { learn: 'broker_seen' }],
      passives: [
        { attr: 'senses', dc: 8, text: 'The hand on the counter is small. The hand that took the last coin, when you came in, was not. Same glove.', effects: [{ learn: 'broker_two_hands' }, { lead: 'l_broker_two' }] },
      ],
      options: [
        { id: 'broker.board', text: 'What\'s on the board?', next: 'board', once: true },
        { id: 'broker.pay', text: 'A job\'s done.', if: { any: [{ flag: 'gig_case_delivered' }, { flag: 'gig_meds_delivered' }, { item: 'k_gig_lot7' }, { flag: 'gig_letter_done' }, BOX_DUE] }, next: 'pay' },
        { id: 'broker.tap', text: 'The kiosk on the east street reads the city\'s file off the lamp wire. That splice is for sale.', if: { all: [{ lead: 'l_kiosk_wire' }, { not: { flag: 'mk_kiosk_outcome' } }] }, check: { skill: 'barter', dc: 35 }, next: 'tap_ok', fail: 'tap_no' },
        { id: 'broker.who', text: 'Who are you?', next: 'who', once: true },
        bye,
      ],
    },
    again: {
      text: '"Half-Price." The box. The hand.',
      options: [
        { id: 'broker.board.again', text: 'What\'s on the board?', if: { not: { seen: 'broker.board' } }, next: 'board' },
        { id: 'broker.pay.again', text: 'A job\'s done.', if: { any: [{ all: [{ flag: 'gig_case_delivered' }, { not: { flag: 'q_gig_case_paid' } }] }, { all: [{ flag: 'gig_meds_delivered' }, { not: { flag: 'q_gig_meds_paid' } }] }, { item: 'k_gig_lot7' }, { all: [{ flag: 'gig_letter_done' }, { not: { flag: 'q_gig_letter_paid' } }] }, BOX_DUE] }, next: 'pay' },
        { id: 'broker.tap.again', text: 'The kiosk\'s splice is for sale.', if: { all: [{ lead: 'l_kiosk_wire' }, { not: { flag: 'mk_kiosk_outcome' } }] }, check: { skill: 'barter', dc: 35 }, next: 'tap_ok', fail: 'tap_no' },
        { id: 'broker.who.again', text: 'Who are you?', if: { not: { seen: 'broker.who' } }, next: 'who' },
        bye,
      ],
    },
    board: { text: '"Couriers, mostly. A case, a letter, a box. Something off a block. The dangerous ones go on when the dangerous people are in town." The hand turns over, once. "Read it yourself. I\'m only the hatch."', effects: [{ learn: 'broker_board_heard' }], options: [bye] },
    who: { text: '"A hatch and a box." The voice does not change. "People bring the board work and I bring the board people. The hood is because the city keeps faces and I\'d rather it didn\'t keep mine." A pause that is not the box\'s. "Either of them."', effects: [{ learn: 'broker_either' }], options: [bye] },
    pay: {
      text: 'The hand turns over.',
      options: [
        { id: 'pay.case', text: 'The case went to the Exchange clerk.', if: { all: [{ flag: 'gig_case_delivered' }, { not: { flag: 'q_gig_case_paid' } }] }, effects: PAY('q_gig_case', 60), next: 'paid' },
        { id: 'pay.meds', text: 'The knit kits went to Openfield\'s healer.', if: { all: [{ flag: 'gig_meds_delivered' }, { not: { flag: 'q_gig_meds_paid' } }] }, effects: PAY('q_gig_meds', 50), next: 'paid' },
        { id: 'pay.lot7', text: '(Put lot seven\'s paper on the counter.)', if: { item: 'k_gig_lot7' }, effects: [{ take: 'k_gig_lot7' }, ...PAY('q_gig_lot7', 120)], next: 'paid' },
        { id: 'pay.letter', text: 'The captain has the letter.', if: { all: [{ flag: 'gig_letter_done' }, { not: { flag: 'q_gig_letter_paid' } }] }, effects: PAY('q_gig_letter', 20), next: 'paid_letter' },
        { id: 'pay.box', text: '(Put the Tanners\' box on the counter.)', if: BOX_DUE, effects: [{ take: 'ci_ch_eye_heat' }, ...PAY('q_gig_box', 80)], next: 'paid' },
        { text: 'Nothing yet.', exit: true },
      ],
    },
    paid: { text: 'Coin on the counter, counted by a hand you did not see move. "Half pays half." The board has something else on it by the time you turn round.', options: [bye] },
    paid_letter: { text: '"He refused it." It is not a question. "He always refuses. The point is that he knows who asked." Twenty on the counter. "That\'s the job."', options: [bye] },
    tap_ok: { text: 'The hand goes still in a different way. "The lamp wire." The box says it flat; the hood says it some other way. "Sixty. And you cut nothing, and you tell the boy nothing, and the kiosk goes on being a toy." Sixty on the counter before you have said yes.', options: [{ id: 'tap.yes', text: '(Take it.)', effects: [{ give: 'tolls', count: 60 }, { set: 'mk_kiosk_outcome', value: 'sold' }, { xp: 60 }, { learn: 'broker_has_tap' }], exit: true }, { text: 'Not for sale after all.', exit: true }] },
    tap_no: { text: '"A toy that talks." The hand does not move. "I don\'t buy toys."', options: [bye] },
  },
};

export const d_mk_gigs: DialogueDef = {
  id: 'd_mk_gigs', owner: 'narrator',
  start: [{ node: 'board' }],
  nodes: {
    board: {
      text: 'THE BOARD. Cards on nails, in a hand that is always the same. Take one and it is yours; the hatch pays when it is done.',
      effects: [{ learn: 'gigs_board_seen' }],
      options: [
        { id: 'gig.case', text: 'A SEALED CASE — to the Exchange clerk, Ninebridge. 60.', if: { quest: 'q_gig_case', status: 'none' }, effects: [{ quest: 'q_gig_case', start: true }, { give: 'k_gig_case' }], next: 'took' },
        { id: 'gig.meds', text: 'KNIT KITS (2) — to the sick hall, Openfield. 50.', if: { quest: 'q_gig_meds', status: 'none' }, effects: [{ quest: 'q_gig_meds', start: true }, { give: 'c_knitkit', count: 2 }], next: 'took' },
        { id: 'gig.lot7', text: 'LOT SEVEN — a paper off the Ninebridge block. 120; you front it.', if: { quest: 'q_gig_lot7', status: 'none' }, effects: [{ quest: 'q_gig_lot7', start: true }], next: 'took' },
        { id: 'gig.letter', text: 'A LETTER — to Captain Lowe, Precinct. 20.', if: { quest: 'q_gig_letter', status: 'none' }, effects: [{ quest: 'q_gig_letter', start: true }, { give: 'k_gig_letter' }], next: 'took' },
        { id: 'gig.box', text: 'A BOX — in the Tanners\' locker at the Sump. 80.', if: { quest: 'q_gig_box', status: 'none' }, effects: [{ quest: 'q_gig_box', start: true }], next: 'took' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    took: { text: 'The card comes off the nail. Behind the hatch nobody moves, and the voice box says, "Yours."', options: [{ text: '(Another.)', next: 'board' }, { text: '(That\'s enough.)', exit: true }] },
  },
};

export const d_gig_letter_read: DialogueDef = {
  id: 'd_gig_letter_read', owner: 'narrator', start: [{ if: { flag: 'gig_letter_opened' }, node: 'opened' }, { node: 'sealed' }],
  nodes: {
    sealed: { text: 'Wax, no seal. For Captain Lowe, by hand. Something flat inside: a card, or a sheet, or coin pressed thin.', options: [{ id: 'letter.open', text: '(Break the wax.)', effects: [{ set: 'gig_letter_opened' }], next: 'opened' }, { text: '(Leave it sealed.)', exit: true }] },
    opened: { text: 'A sheet in the board\'s hand: *Captain — the Quint eviction, Thursday. Reschedule it. A month. The enclosed is for the station\'s water fund.* And, flat, a guild note for a hundred Tolls, the kind the Exchange prints. A bribe, politely, with a cause attached.', effects: [{ learn: 'gig_letter_bribe' }, { learn: 'quint_eviction' }], options: [{ text: '(Fold it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- people

export const d_mk_wen: DialogueDef = {
  id: 'd_mk_wen', owner: 'npc_mk_02', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Bowl\'s two. Sit." A small old woman with a ladle and the eyes of the best-informed queue in Meridian. "Everyone eats here. Everyone talks. I hear it all and sell none of it, which is the secret of the noodles."', options: [{ text: 'A bowl.', effects: [{ event: 'barter' }], exit: true }, { id: 'wen.talk', text: 'What\'s everyone saying?', next: 'talk', once: true }, bye] }, talk: { text: '"That the Crown\'s dressing for its Masque. That the Sink\'s pumps will be turned to the Precinct the first week of spring, as per. That a girl in Bridgeward talks in a radio\'s voice and is right. That the Broker\'s hatch has two hands." She ladles. "That\'s today. Tomorrow\'s two Tolls."', effects: [{ learn: 'wen_news' }, { learn: 'saints_heard' }, { lead: 'l_broker_two' }], options: [bye] } },
};

export const d_mk_kuhn: DialogueDef = {
  id: 'd_mk_kuhn', owner: 'npc_mk_03', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Dark chrome. Mender-built, no leash, no licence, no warranty." A woman with a shaved head and a loupe on a cord. "Boxed, not fitted. The Sink fits — Ocho, if you want it done right and free, or a dozen others if you want it done today."', effects: [{ learn: 'md_ocho_heard' }], options: [{ text: 'Show me.', effects: [{ event: 'barter' }], exit: true }, { id: 'kuhn.concern', text: 'What\'s wrong with Concern chrome?', next: 'concern', once: true }, bye] }, concern: { text: '"Nothing. It\'s better in every way I can measure." She taps the loupe. "And it phones home. Every piece. The Concern can find you, numb you, or switch you off, and the people wearing it don\'t know, and the ones who do can\'t get it out." She shrugs. "Dark chrome\'s crude and it\'s yours. Pick."', effects: [{ learn: 'kuhn_leash_hint' }], options: [bye] } },
};

export const d_mk_galt: DialogueDef = {
  id: 'd_mk_galt', owner: 'npc_mk_04', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Unlicensed." A gunsmith with a moustache and a cleaning rod. "Everything in Old Market is. Guild ammunition, Mender pistols, a rifle I won\'t say where from. Point it at the floor in here."', options: [{ text: 'Show me.', effects: [{ event: 'barter' }], exit: true }, bye] } },
};

export const d_mk_sato: DialogueDef = {
  id: 'd_mk_sato', owner: 'npc_mk_05', start: [{ if: { flag: 'sato_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: { text: 'A neat man at the bottom of a stair with a desk, a lamp, and a tray of blank cards. "No sign on the door, so you were sent. Sato. I do the past: papers, records, a face the lens has seen before." He looks at you. "The lens has seen yours, hasn\'t it. That\'s the trouble with you."', effects: [{ set: 'sato_met' }, { learn: 'sato_seen' }], options: [{ id: 'sato.papers', text: 'I need papers.', if: { not: { item: 'k_md_papers' } }, next: 'papers' }, { id: 'sato.face', text: 'The lens knew my face before I gave a name.', if: { knows: 'md_flagged' }, next: 'face', once: true }, { text: 'Picks.', effects: [{ event: 'barter' }], exit: true }, bye] },
    again: { text: '"The past. What part of it?"', options: [{ id: 'sato.papers.again', text: 'I need papers.', if: { not: { item: 'k_md_papers' } }, next: 'papers' }, { id: 'sato.face.again', text: 'The lens knew my face.', if: { all: [{ knows: 'md_flagged' }, { not: { seen: 'sato.face' } }] }, next: 'face' }, { text: 'Picks.', effects: [{ event: 'barter' }], exit: true }, bye] },
    papers: { text: '"A card. A dead citizen\'s number — the Sink gives me a few every spring — and your face, near enough. Good at a glance, good at a warden, bad at the lens." He names it: a hundred and twenty. "The lens is a different job and a different price, and I don\'t think you can afford to have it forget you."', options: [{ id: 'sato.buy', text: '(Pay. 120 Tolls)', if: { item: 'tolls', count: 120 }, effects: [{ take: 'tolls', count: 120 }, { give: 'k_md_papers_forged' }, { set: 'md_forged_papers' }, { xp: 40 }], next: 'bought' }, { text: 'Not yet.', exit: true }] },
    bought: { text: 'An hour under the lamp. A card. A face that is nearly yours and a number that belonged to a woman who drowned two springs ago. "Don\'t show it at the gate. Show it to wardens. Wardens read cards; the gate reads faces."', options: [bye] },
    face: { text: 'He is quiet for a moment. "Then you\'re in the file in a way I can\'t forge over. The file doesn\'t forget. The file is the only thing in this city that doesn\'t." He picks up a card and puts it down. "Whatever it called you, it\'ll go on calling you. Decide whether you mind."', effects: [{ learn: 'sato_file_permanent' }], options: [bye] },
  },
};

export const d_mk_tosh: DialogueDef = {
  id: 'd_mk_tosh', owner: 'npc_mk_06', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"Paper. News, letters, the Precinct\'s notices a day late and half the price." A woman with ink on her cuffs. "I don\'t sell futures. I sell what already happened; it\'s cheaper and truer."', options: [{ text: 'What have you got?', effects: [{ event: 'barter' }], exit: true }, { id: 'tosh.notices', text: 'What\'s on the Precinct\'s notices?', next: 'notices', once: true }, bye] }, notices: { text: '"Evictions, four, Thursday: one of them\'s old Quint in the tenements, for being *ahead of plan*, whatever that is. The Sink\'s pumps diverted the first week of spring, as per. A Masque at the Crown by invitation, and nobody down here is invited." She folds the sheet. "Half price."', effects: [{ learn: 'quint_eviction' }, { learn: 'masque_heard' }], options: [bye] } },
};

export const d_mk_ferenc: DialogueDef = {
  id: 'd_mk_ferenc', owner: 'npc_mk_07', start: [{ node: 'intro' }],
  nodes: { intro: { text: 'An old man at a tea table who has been sitting there, by the look of the chair, since the mall had a roof. "Sit. Tea\'s two, talk\'s free." He does not wait for the two. "The Crown\'s dressing for a Masque. The Sink\'s dressing for a flood. There\'s a girl in Bridgeward who talks in a dead radio\'s voice and is right about things, which the wardens don\'t like. And the Broker — " he lowers his voice, which he does not need to — "has two hands and one glove."', effects: [{ learn: 'ferenc_news' }, { learn: 'saints_heard' }, { learn: 'masque_heard' }, { lead: 'l_broker_two' }], options: [bye] } },
};

export const d_mk_vell: DialogueDef = {
  id: 'd_mk_vell', owner: 'npc_mk_09',
  start: [{ if: { flag: 'mk_riot_fight' }, node: 'fight' }, { if: { flag: 'mk_riot_over' }, node: 'after' }, { if: { not: { quest: 'q_md_riot' } }, node: 'quiet' }, { if: { flag: 'vell_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    quiet: { text: 'A broad man at the standpipe with a pipe-wrench he uses as a walking stick. "Point eight. Says so. Dial says so." He looks at it suspiciously anyway.', options: [bye] },
    intro: {
      text: 'A broad man at the front of the standpipe queue with a pipe-wrench and forty people behind him who have done the arithmetic. "Point eight on the notice. Point six on the dial." He says it to you because you are new and might not have heard. "The Precinct drinks what we don\'t. Two wardens over there counting us. When the count\'s done they\'ll go for help, and before they\'re back, we go for the dial."',
      effects: [{ set: 'vell_met' }, { learn: 'mk_riot_plan' }],
      options: [
        { id: 'vell.talk', text: 'Forty names on a sheet and the count walked to the Precinct is a petition. Forty on a dial is a riot. One gets a notice; the other gets a club.', check: { skill: 'speech', dc: 45, mods: [{ if: { member: 'wardens' }, dc: -10, why: 'you carry a card that gets read' }, { if: { lead: 'l_market_ration' }, dc: -5, why: 'you have read both numbers yourself' }] }, next: 'talk_ok', fail: 'talk_no' },
        { id: 'vell.lowe', text: 'Hold the queue. I\'ll bring the captain the count myself.', if: { knows: 'lowe_seen' }, effects: [{ set: 'mk_riot_lowe_pending' }], next: 'lowe_go' },
        { id: 'vell.crowd', text: 'When you go for the dial, I\'m in front.', next: 'crowd' },
        { id: 'vell.loot', text: '(Say nothing. Note where the crates are.)', effects: [{ set: 'mk_riot_loot_pending' }], next: 'loot_wait' },
        bye,
      ],
    },
    again: { text: '"Point six." The wrench.', options: [{ id: 'vell.talk.again', text: 'Forty names is a petition. Forty on a dial is a riot.', if: { not: { seen: 'vell.talk' } }, check: { skill: 'speech', dc: 45 }, next: 'talk_ok', fail: 'talk_no' }, { id: 'vell.lowe.again', text: 'I\'ll bring the captain the count.', if: { all: [{ knows: 'lowe_seen' }, { not: { flag: 'mk_riot_lowe_pending' } }] }, effects: [{ set: 'mk_riot_lowe_pending' }], next: 'lowe_go' }, { id: 'vell.crowd.again', text: 'When you go for the dial, I\'m in front.', next: 'crowd' }, { id: 'vell.loot.again', text: '(Note where the crates are.)', if: { not: { flag: 'mk_riot_loot_pending' } }, effects: [{ set: 'mk_riot_loot_pending' }], next: 'loot_wait' }, bye] },
    talk_ok: { text: 'He looks at the wrench, and at the two wardens, and at the forty. "A sheet." He says it like a man trying a word. Mirabel Tosh sells him one for a Toll and he writes the names himself, slowly, and walks the count up the avenue with the sheet held out in front of him like a lamp, and the wardens let him, because a sheet is not a wrench. The square sits down.', effects: [{ set: 'mk_riot_outcome', value: 'talked' }, { xp: 120 }, { decision: { id: 'mk_riot_talked', text: 'You turned Old Market\'s water riot into a petition.' } }], options: [bye] },
    talk_no: { text: '"A petition." He almost laughs. "They\'ve had our petitions. They file them under the dial."', options: [bye] },
    lowe_go: { text: '"The captain." He looks at the wrench. "He\'ll read it. That\'s the trouble with him; he reads everything." He nods. "Go, then. We\'ll hold till dark. After dark I can\'t promise the dial."', options: [bye] },
    crowd: {
      text: '"In front." He hands you nothing; he looks at your hands to see what you have. The count finishes. The wardens look at each other and one goes for help, and the forty go for the dial, and you with them, and the other warden goes down under the first ten and is let up again by the last ten, and the dial comes off the pipe in Caddo Vell\'s wrench and the standpipe runs.',
      effects: [{ set: 'mk_riot_outcome', value: 'crowd' }, { time: 60 }, { xp: 100 }],
      options: [{ text: '(Drink.)', exit: true }],
    },
    loot_wait: { text: 'He takes it as agreement. The count finishes; a warden goes for help; the forty go for the dial. In the ten minutes before grey comes back down the avenue, the crates at the square\'s edge are nobody\'s, and then they are yours.', effects: [{ set: 'mk_riot_outcome', value: 'loot' }, { time: 30 }], options: [{ text: '(Go, before the grey.)', exit: true }] },
    after: { text: [{ if: { flag: 'mk_dial_fixed' }, text: '"Point eight." He checks the dial anyway. "He turned it himself. I watched his hands."' }, { if: { flag: 'mk_riot_outcome', eq: 'talked' }, text: '"They gave us a notice." He holds it up. "It says *under review*. It\'s the first one that\'s said anything."' }, { text: '"It runs." The standpipe does. He has the dial in his pocket.' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_mk_pinch: DialogueDef = {
  id: 'd_mk_pinch', owner: 'npc_mk_10', start: [{ node: 'intro' }],
  nodes: { intro: { text: '"I buy anything that\'s not nailed down." A thin young man on a blanket who does not look up. "And I know a man with a claw hammer. No questions; it\'s the only rule I\'ve got."', options: [{ text: 'Let\'s see.', effects: [{ event: 'barter' }], exit: true }, bye] } },
};

export const MARKET_DIALOGUES: DialogueDef[] = [
  d_mk_loop, d_mk_mall_sign, d_mk_east_sign, d_mk_food_sign, d_mk_fixer_sign, d_mk_escalator, d_mk_ration, d_mk_kiosk_sign, d_mk_kiosk, d_mk_lark,
  d_mk_hatch, d_mk_broker, d_mk_gigs, d_gig_letter_read, d_mk_wen, d_mk_kuhn, d_mk_galt, d_mk_sato, d_mk_tosh, d_mk_ferenc, d_mk_vell, d_mk_pinch,
];
