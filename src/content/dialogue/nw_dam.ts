import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, WREN, bye, leave, NIGHT } from './nw_river';

/**
 * Ashby Dam (B5c): Low Water (`q_nw_dam`: the city's audit of the dam's delivery, the gauge, the gallery's crack, the
 * keepers' sixty-year lie and what it costs the Sink, and the inspection's four ends), the keeper and her granddaughter, the
 * city's courier, the controller, the lock (the barge board is in nw_river.ts), eels at the tailrace. Story notes:
 * story/B5c_NOTES_SECRET.md.
 */

const AUDIT: Cond = { flag: 'nw_audit' };
const DECIDED: Cond = { flag: 'nw_dam' };
const UNDECIDED: Cond = { not: DECIDED };
const LIE: Cond = { knows: 'nw_lie_known' };
const WHY: Cond = { knows: 'nw_why_known' };
const SINK: Cond = { knows: 'nw_sink_link' };
const D = (v: string): Cond => ({ flag: 'nw_dam', eq: v });

/** The city's notice read: the inspection waits at the gatehouse from now on. */
export const NOTICE: Effect[] = [{ lead: 'l_nw_short' }, { set: 'nw_audit' }, { quest: 'q_nw_dam', start: true }, { learn: 'loc_dam' }];

// ---------------------------------------------------------------- the ends of the inspection

const DAM = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_nw_dam', start: true }, { set: 'nw_dam', value: v }, ...extra, { decision: { id: `nw_dam_${v}`, text } }];
const TRUTH = (keepers: Effect[], how: string): Effect[] => DAM('truth', `The truth went into the city's record at Ashby: the Water held at the sixth mark for sixty years because the dam would not hold it higher. ${how} The city will plan its water on the real lake now: the Precinct's growth cut, the Sink's spring pumps its own again, and the river let down even for the barges.`, [
  ...keepers, { set: 'nw_river', value: 'even' }, { set: 'nw_sink_relief' }, { set: 'nw_precinct_short' }, { set: 'nw_barges_owed' },
  { rep: { faction: 'wardens', respect: 5 } }, { xp: 260 }, A(NINE, 10), A(TAMSIN, 3), A(ASH, 5), A(WREN, 3),
  { news: { tag: 'nw_dam_truth', text: 'the city\'s record at Ashby Dam has been corrected: the dam was never full, and the city\'s water plan is to be rewritten', valence: 5, size: 6, at: 'ashby' } },
  { news: { tag: 'nw_sink_relief', text: 'word from the water office: next spring the Sink keeps its relief pumps, by a change in Ashby\'s schedule', valence: 6, size: 6, at: 'meridian' } },
]);
export const DAM_TRUTH_HEDDA: Effect[] = TRUTH([{ set: 'nw_keepers', value: 'kept' }], 'Hedda Wexford told it herself, and the record calls a keeper who corrects it a witness.');
export const DAM_TRUTH_TOLD: Effect[] = TRUTH([{ set: 'nw_keepers', value: 'kept' }, { set: 'nw_keepers_fined' }], 'I told it; the keepers were fined for the false readings and kept on, because the record has nobody else who can keep the dam.');
export const DAM_HIDDEN: Effect[] = DAM('hidden', 'The city\'s inspector found a free float in Ashby\'s gauge well and a full lake on its controller, and wrote COMPLIANT. The keepers\' lie goes on; so does everything it costs.', [
  { set: 'nw_river', value: 'low' }, { xp: 160 }, A(NINE, -5), A(TAMSIN, 3),
]);
const EXPOSED_BASE: Effect[] = [
  { set: 'nw_keepers', value: 'taken' }, { set: 'nw_dam_strain' }, { set: 'nw_river', value: 'city' }, { rep: { faction: 'wardens', respect: 10 } }, { xp: 120 },
  A(TAMSIN, -10), A(ASH, -5), A(WREN, -5), A(NINE, 2),
  { news: { tag: 'nw_keepers_taken', text: 'the city took Ashby Dam\'s keepers down the river for falsifying its gauge; wardens keep the dam now', valence: -4, size: 6, at: 'ashby' } },
];
export const DAM_EXPOSED: Effect[] = DAM('exposed', 'The city\'s inspector found the block in Ashby\'s gauge well. The Wexfords were taken down the river for falsifying a city instrument, and wardens keep the dam now, to the city\'s card: the Water is to be raised to its full line.', EXPOSED_BASE);
export const DAM_EXPOSED_BOUNTY: Effect[] = DAM('exposed', 'I showed the city\'s inspector the block in Ashby\'s gauge well, for the record\'s bounty. The Wexfords were taken down the river, and wardens keep the dam now, to the city\'s card: the Water is to be raised to its full line.', [{ give: 'tolls', count: 50 }, ...EXPOSED_BASE, A(TAMSIN, -5)]);
export const DAM_SUNK: Effect[] = DAM('sunk', 'I fought the city\'s inspection on Ashby\'s crest. The record will write its assessor lost in the Wet, and send more than one next time.', [
  { set: 'nw_inspection_fight' }, { set: 'nw_ledger_marked' }, { set: 'nw_river', value: 'low' }, { rep: { faction: 'wardens', respect: -20, fear: 5 } }, { xp: 100 },
  A(NINE, -20), A(ASH, -10), A(ILYA, 2),
  { news: { tag: 'nw_inspection_lost', text: 'the city\'s inspection of Ashby Dam was lost in the Wet with its wardens', valence: -6, size: 6, at: 'ashby' } },
  { event: 'combat' },
]);

// ---------------------------------------------------------------- the keepers

export const d_nw_hedda: DialogueDef = {
  id: 'd_nw_hedda', owner: 'npc_nw_01',
  start: [{ if: { flag: 'nw_hedda_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A tall old woman in an oilskin with a bunch of keys on a chain at her belt, at the gatehouse window, watching the Water. She does not turn round. "Wexford. I keep her." She says "her" the way bargemen say it of a barge. "My grandmother kept her, and my mother. You came over the crest. Did you hear her hum? That\'s the turbine she still turns for the gatehouse lamps. She hums when she\'s content."',
      again: 'Hedda, at the window, watching the Water.',
      effects: [{ set: 'nw_hedda_met' }],
      options: [
        { id: 'hedda.dam', text: 'Tell me about the dam.', next: 'dam' },
        { id: 'hedda.gauge', text: 'The gauge on the face says the sixth mark.', next: 'gauge' },
        bye,
      ],
    },
    again: {
      text: [
        { if: D('truth'), text: '"The card came up yesterday with the barge." Hedda has it in her hand, opened. "LAKE — SIXTH MARK — HOLD. It\'s the first card in sixty years that\'s been true." She does not look happy, exactly. She looks like someone who has put down something heavy and does not know what to do with her arms.' },
        { if: D('hidden'), text: '"Sixth mark," Hedda says, at the window. "Same as yesterday." She does not look at you. "Thank you. Don\'t say anything else."' },
        { if: D('sunk'), text: 'Hedda will not look at you. "They\'ll send more," she says, to the Water. "Next season. More than one. And they\'ll not knock."' },
        { text: '"Mm?" Hedda does not turn from the window.' },
      ],
      again: 'Hedda, at the window.',
      options: [
        { id: 'hedda.dam2', text: 'Tell me about the dam.', if: { not: { seen: 'hedda.dam' } }, next: 'dam' },
        { id: 'hedda.gauge2', text: 'The gauge on the face says the sixth mark.', if: { not: { seen: 'hedda.gauge' } }, next: 'gauge' },
        { id: 'hedda.audit', text: 'There\'s an inspector from the city on the crest.', if: { all: [AUDIT, UNDECIDED, { not: { seen: 'hedda.audit' } }] }, next: 'audit' },
        { id: 'hedda.block', text: 'There\'s a block in your gauge well.', if: { all: [LIE, UNDECIDED] }, next: 'block' },
        bye,
      ],
    },
    dam: {
      text: '"They built her to cool the campus downriver, before the Burn. You\'ve seen the halls at the Landing; that was the campus. All those machines, thinking, hot as stoves." She taps the glass. "The Ashbys owned her. Their heirs live in the city\'s Crown now and have never once come up the river. The water\'s the city\'s, by a lease older than the Burn, and the city sends a card every season to say what she\'s to do with it." A pause. "And she does it."',
      again: '"And she does it."',
      effects: [{ learn: 'nw_ashby_history' }],
      interject: [{ companion: NINE, text: '"The Ashby lease," Nine says. "A hundred and fifty years. It is in the charter\'s schedule of contracts. The record cannot void it." The lens clicks. "The record does not like that it cannot void it."' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    gauge: {
      text: '"Rain\'s been light." She says it at once, and it is the first thing she has said that sounds rehearsed. "Sixth mark\'s where she sits in a light year." She turns from the window for the first time and looks at you. Grey eyes, very steady. "Ask me something else."',
      again: '"Rain\'s been light."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    audit: {
      text: '"I saw it come up on the barge." She does not look out at the crest, where the grey unit stands by the gatehouse door in the rain. "It wants the keeper to attend. It\'ll wait. They wait better than we do." Her hand is on the keys at her belt. "Let it find what it finds."',
      again: '"Let it find what it finds."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    block: {
      text: 'For a long time she only looks at the Water. Then she takes a book down off the shelf by the controller, a fat old ledger with a cracked spine, and opens it at its first page and holds it out to you. In a square hand, faded brown: NEVER ABOVE THE SIXTH MARK. SHE WILL NOT HOLD IT. — M.W. "My grandmother," Hedda says. "The year the city started sending cards. She went down the gallery and found the west wall weeping and a crack in it you could put a knife in. She cut an oak block for the well that night. Sixty years the card\'s said FULL and sixty years we\'ve kept her at the sixth, and she\'s stood." She closes the book. "You go down the gallery and look at the pins, if you don\'t believe me."',
      again: '"Sixty years, and she\'s stood."',
      effects: [{ lead: 'l_nw_keepers_log' }, { give: 'k_nw_keepers_log' }, { learn: 'nw_hedda_told' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin is looking at the old woman with an expression you have not seen on her before. "You lied to a machine for sixty years to keep people alive," she says. "I know someone like that. She\'s a fridge." She laughs, shakily. "You\'d like her."', effects: [A(TAMSIN, 3)] }],
      options: [
        { id: 'hedda.sink', text: 'Do you know what the shortfall costs the city?', if: { all: [SINK, { not: { flag: 'nw_hedda_sink' } }] }, effects: [{ set: 'nw_hedda_sink' }], next: 'sink' },
        { id: 'hedda.tell', text: 'Tell the inspector yourself. All of it.', if: { not: { flag: 'nw_hedda_agrees' } }, check: { skill: 'speech', dc: 45, mods: [
          { if: { flag: 'nw_hedda_sink' }, dc: -15, why: 'she knows what the lie costs the Sink' }, { if: WHY, dc: -10, why: 'you have read the pins' },
          { if: { flag: 'nw_rhiannon_word' }, dc: -10, why: 'her granddaughter will stand beside her' }, { if: IN(NINE), dc: -5, why: 'Nine, who speaks the record\'s language' },
        ] }, effects: [{ set: 'nw_hedda_agrees' }], next: 'agrees', fail: 'no' },
        { text: 'Something else.', next: 'again' },
      ],
    },
    sink: {
      text: [
        { if: { flag: 'sk_pumps' }, text: 'You tell her about the Sink: the under-city by the river mouth, the pumps that are the Sink\'s forty weeks of the year, and the clause that took two of them for the Precinct\'s supply every spring when Ashby came in short; the chalk lines on the pier, and the names on the wall, and the word beside most of them, STAIR; and how this spring the Sink kept its pumps, and the Precinct went short instead, and the city came up the river to find out why. She listens with her hand on the controller\'s case. "Every spring," she says. "Short." She sits down on the keeper\'s chair. "My grandmother didn\'t know. My mother didn\'t know. I didn\'t." She looks at her hands. "We were saving the Landing. And they were drowning on a stair for it, and now they\'ve stopped drowning, and that\'s why it\'s on my crest."' },
        { text: 'You tell her about the Sink: the under-city by the river mouth, the pumps that are the Sink\'s forty weeks of the year, and the clause that takes two of them for the Precinct\'s supply every spring when Ashby comes in short; the chalk lines on the pier, and the names on the wall, and the word beside most of them, STAIR. She listens with her hand on the controller\'s case. "Every spring," she says. "Short." She sits down on the keeper\'s chair. "My grandmother didn\'t know. My mother didn\'t know. I didn\'t." She looks at her hands. "We were saving the Landing."' },
      ],
      again: '"We were saving the Landing."',
      interject: [{ companion: NINE, text: '"Both are true," Nine says, quietly for Nine. "The block saved the Landing, and the shortfall drowned the stair. The record holds both. It is the record\'s whole difficulty."' }],
      options: [{ text: '(Wait.)', next: 'block' }],
    },
    agrees: {
      text: 'She is quiet so long that you think she has not heard. Then she takes the keys off her belt and holds them in her lap. "If I tell it," she says, "it\'ll write it down, and the city will plan her as she is, and the card will say the sixth mark." She looks at the window. "And the Precinct will go short, and the Sink won\'t." She stands up. "All right. When you let it in. I\'ll be beside you."',
      again: '"When you let it in, I\'ll be beside you."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    no: { text: '"They\'d take me down the river in a cage," she says, "and fill her to the line, and she\'d go. The first wet spring she\'d go, and the Landing with her." She puts the book back on the shelf. "No."', again: '"No."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_rhiannon: DialogueDef = {
  id: 'd_nw_rhiannon', owner: 'npc_nw_02',
  start: [{ if: { flag: 'nw_rhiannon_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young woman with red hair under an oilskin hood, coming up the lock\'s stair two at a time with a key on a cord round her neck. "Rhiannon. Wexford. The lock\'s mine; the dam\'s Gran\'s." She grins. "The lock runs on the card, like everything. Six up, noon down. If you\'re for a barge, they tie up below."',
      again: 'Rhiannon, on the lock stair.',
      effects: [{ set: 'nw_rhiannon_met' }],
      options: [
        { id: 'rhiannon.lock', text: 'How does the lock know when?', next: 'lock' },
        { id: 'rhiannon.gran', text: 'Your grandmother.', next: 'gran' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'nw_keepers', eq: 'taken' }, text: 'Rhiannon is not here. A warden walks the lock\'s top with the key on its cord round its own neck.' },
        { if: D('truth'), text: '"Sixth mark, on the card, in the city\'s own print." Rhiannon is grinning like a child. "The city\'s sending men up to look at the pins. The city. Up here."' },
        { text: '"Barge?" Rhiannon asks, wiping rain out of her eyes.' },
      ],
      again: 'Rhiannon, at the lock.',
      options: [
        { id: 'rhiannon.lock2', text: 'How does the lock know when?', if: { not: { seen: 'rhiannon.lock' } }, next: 'lock' },
        { id: 'rhiannon.gran2', text: 'Your grandmother.', if: { not: { seen: 'rhiannon.gran' } }, next: 'gran' },
        { id: 'rhiannon.pins', text: 'The crack in the gallery.', if: { all: [{ any: [LIE, { lead: 'l_nw_crack' }] }, UNDECIDED, { not: { seen: 'rhiannon.pins' } }] }, next: 'pins' },
        { id: 'rhiannon.help', text: 'Help me make the gauge read full without the block.', if: { all: [LIE, UNDECIDED, { not: { flag: 'nw_rhiannon_helps' } }] }, next: 'help' },
        bye,
      ],
    },
    lock: { text: '"The card." She jerks a thumb at the gatehouse. "The city writes a card every season and the courier brings it up sealed and the controller opens it. It knows the lockings, the gates, the spill, all of it. Gran and I just keep its hands oiled." She shrugs. "It\'s never been wrong about a barge. It\'s wrong about everything else."', again: '"It\'s wrong about everything else."', options: [{ text: 'Something else.', next: 'again' }] },
    gran: { text: '"Gran says." She laughs. "Gran always says. She\'s kept the dam forty years and she\'s never once been down the river to the city, because the dam might need her while she was gone." The laugh goes. "She won\'t either. Not even if they asked her."', again: '"Gran always says."', options: [{ text: 'Something else.', next: 'again' }] },
    pins: {
      text: 'She stops with her hand on the lock\'s rail. "You\'ve seen them." It is not a question. "I\'ve been down the gallery with the pins since I was eight. Gran chalks the date and I hold the lamp. It opens a little every wet season. One wet season it\'ll open all at once." She looks down the gorge toward the Landing. "The city could mend her. Only the city has that kind of money and that kind of men. But the city would have to know." She looks at you. "If Gran tells them, I\'ll stand beside her and say I held the lamp."',
      again: '"I\'ll stand beside her and say I held the lamp."',
      effects: [{ set: 'nw_rhiannon_word' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    help: {
      text: '"Without the block." She looks at the gauge-well hut, and at you, and at the gatehouse where her grandmother\'s lamp is lit. "You mean so it finds a free float and a full lake both. So it writes COMPLIANT and goes away." She wipes her face. "I want the city told. I want her mended." A long breath. "But not with Gran in a cage." She takes the key off her neck. "There\'s a way. The indicator drum. Two turns. I\'ll hold the lamp. For Gran. Once."',
      again: '"For Gran. Once."',
      effects: [{ set: 'nw_rhiannon_helps' }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
  },
};

export const d_nw_aurelio: DialogueDef = {
  id: 'd_nw_aurelio', owner: 'npc_nw_03',
  start: [{ if: { flag: 'nw_aurelio_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in Precinct grey that was never meant for rain, with a leather case chained to his wrist and the expression of someone who has been wet for a week. He shows you a card with the city\'s seal before you ask. "Santangelo. The water office. Courier." He lifts the case an inch. "Cards up, cards down. I only carry them." He looks at the rain. "Is it always like this?"',
      again: 'Aurelio, with the case chained to his wrist.',
      effects: [{ set: 'nw_aurelio_met' }],
      options: [
        { id: 'aurelio.notice', text: 'What\'s the notice on the quay?', next: 'notice' },
        { id: 'aurelio.cards', text: 'How do the cards work?', next: 'cards' },
        bye,
      ],
    },
    again: {
      text: '"Still raining," Aurelio says, with the deep satisfaction of a man proved right.',
      again: 'Aurelio, in the rain.',
      options: [
        { id: 'aurelio.notice2', text: 'What\'s the notice on the quay?', if: { not: { seen: 'aurelio.notice' } }, next: 'notice' },
        { id: 'aurelio.cards2', text: 'How do the cards work?', if: { not: { seen: 'aurelio.cards' } }, next: 'cards' },
        { id: 'aurelio.clause', text: 'Clause thirty-one. What is it?', if: { all: [{ any: [{ seen: 'aurelio.cards' }, { seen: 'aurelio.cards2' }] }, { not: { seen: 'aurelio.clause' } }] }, next: 'clause' },
        bye,
      ],
    },
    notice: {
      text: [
        { if: { flag: 'sk_pumps' }, text: '"An audit of delivery." He recites it. "Ashby has delivered short of its schedule for eleven seasons. The water office has escalated it. An assessor came up with me to read the gauge, and waits at the dam for the keeper to attend." He lowers his voice. "This spring the Sink kept its relief pumps. A variance, or somebody at the dial; nobody upstairs will say. So for the first time in years nothing made up Ashby\'s shortfall, and the Precinct went short, and somebody in the water office has to explain it to somebody higher. Ashby is the explanation they would like."' },
        { text: '"An audit of delivery." He recites it. "Ashby has delivered short of its schedule for eleven seasons. The water office has escalated it. An assessor came up with me to read the gauge, and waits at the dam for the keeper to attend." He lowers his voice, as if the rain might report him. "The Precinct went short this spring. Somebody in the water office has to explain it to somebody higher. Ashby is the explanation they would like."' },
      ],
      again: '"Ashby is the explanation they would like."',
      effects: NOTICE,
      options: [{ text: 'Something else.', next: 'again' }],
    },
    cards: { text: '"The water office writes the season\'s schedule on a card, seals it, and gives it to me. I bring it up the river and put it in the controller\'s slot at Ashby, and the controller opens it. Nobody reads it but the controller." He seems to find this restful. "I bring the old one back down, so the office knows it was obeyed. It always says it was."', again: '"It always says it was."', options: [{ text: 'Something else.', next: 'again' }] },
    clause: { text: '"Growth." He says it the way people in the Precinct say the names of clauses, like brands. "Thirty-one. The Precinct\'s supply grows on schedule. When a source comes in short, the clause makes it up from elsewhere." He frowns. "I don\'t know from where. I only carry the cards."', again: '"I only carry the cards."', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

// ---------------------------------------------------------------- the inspection

export const d_nw_inspect: DialogueDef = {
  id: 'd_nw_inspect', owner: 'npc_nw_04',
  start: [{ if: DECIDED, node: 'done' }, { if: { flag: 'nw_inspect_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A grey unit in a warden-pattern frame, standing on the crest by the gatehouse door in the rain as if the rain were not falling on it, a lens where a face would be framed under a grey cap. Two wardens behind it with carbines and wet collars. "Assessor Seventeen. Water and Works." Its voice is mild and exact. "An audit of delivery: Ashby, eleven seasons short. The inspection requires the gauge, the controller, and the keeper\'s attendance. The schedule allows for delay." The lens turns to the gatehouse window. "It does not allow for absence."',
      again: 'Assessor Seventeen, in the rain.',
      effects: [{ set: 'nw_inspect_met' }, ...NOTICE],
      interject: [{ companion: NINE, text: '"Seventeen," Nine says. The two lenses regard each other. "We were commissioned in the same week." "Nine," says Seventeen. "You are logged as on detached duty." "I am," says Nine. "I am also logged as present." Neither of them says anything for a moment. It is, you realise, a family reunion.', effects: [A(NINE, 2)] }],
      options: [{ text: 'Something else.', next: 'again' }],
    },
    again: {
      text: '"The inspection waits on the keeper," says Seventeen.',
      again: 'Seventeen, waiting.',
      options: [
        { id: 'inspect.what', text: 'What will you do if the gauge is wrong?', if: { not: { seen: 'inspect.what' } }, next: 'what' },
        { id: 'inspect.begin', text: 'Begin.', next: 'reads' },
        { id: 'inspect.truth', text: 'Before you read anything: there is something the record should hear.', if: LIE, next: 'truth' },
        { id: 'inspect.report', text: 'There\'s a block in the gauge well. I\'ll show you, for the record\'s bounty.', if: { all: [LIE, { not: { flag: 'nw_hidden_ready' } }] }, effects: DAM_EXPOSED_BOUNTY, next: 'taken' },
        { id: 'inspect.fight', text: '(Draw on it.)', effects: DAM_SUNK, exit: true },
        { text: 'Not yet.', exit: true },
      ],
    },
    what: { text: '"Correct the record." It does not hesitate. "A false reading of a city instrument is an offence under the works clauses. The offender is taken before the Court of Accounts. The works pass to warden keeping. The schedule is enforced." The lens turns to the Water. "The record suggests that the Water is full. If it is full, the schedule will be enforced without difficulty."', again: '"The schedule will be enforced."', options: [{ text: 'Something else.', next: 'again' }] },
    reads: {
      speaker: 'narrator',
      text: [
        { if: { flag: 'nw_hidden_ready' }, text: 'Seventeen opens the gauge-well hut with a key of its own and stands over the well a long time with its lens down: a float riding free on black water, no block, no wedge, nothing but rust and a cable. It goes into the gatehouse and reads the controller: LAKE — FULL. It looks out at the staff gauge on the dam\'s face, where the rain is running down over the marks, and the lens clicks once. Then it writes on a card, and seals it, and gives it to the courier. "COMPLIANT," it says. "The shortfall is assigned to losses in transit." It walks back to the lock with its wardens, and does not look at the old woman in the gatehouse window.' },
        { text: 'Seventeen opens the gauge-well hut with a key of its own and stands over the well a long time with its lens down. Then it reaches into the well with one grey hand and draws out the oak block, black with sixty years of handling, and the float drops down its well with a clank you hear on the crest, and inside the gatehouse the controller begins to chime. "A false reading of a city instrument," says Seventeen, and turns its lens to the window where Hedda Wexford is standing very straight. "The keeper will attend."' },
      ],
      again: 'The inspection.',
      options: [
        { id: 'inspect.hidden', text: '(Watch it go.)', if: { flag: 'nw_hidden_ready' }, effects: DAM_HIDDEN, next: 'done' },
        { id: 'inspect.exposed', text: '(Watch them take her.)', if: { not: { flag: 'nw_hidden_ready' } }, effects: DAM_EXPOSED, next: 'taken' },
        { id: 'inspect.late', text: 'Wait. There\'s something the record should hear.', if: { all: [LIE, { not: { flag: 'nw_hidden_ready' } }] }, next: 'truth' },
      ],
    },
    truth: {
      text: '"The record is listening," says Seventeen, and its lens comes down to you, and stays there.',
      again: '"The record is listening."',
      options: [
        { id: 'inspect.truth.hedda', text: '(Let Hedda tell it, with the log, and the pins, and the lake as it is.)', if: { flag: 'nw_hedda_agrees' }, check: { skill: 'speech', dc: 45, mods: [
          { dc: -15, if: { flag: 'nw_hedda_agrees' }, why: 'the keeper tells it herself' }, { dc: -10, if: WHY, why: 'the crack and the keepers\' log' },
          { dc: -10, if: SINK, why: 'what the shortfall costs the Sink' }, { dc: -5, if: { flag: 'nw_rhiannon_word' }, why: 'her granddaughter held the lamp' }, { dc: -5, if: IN(NINE), why: 'Nine, beside you' },
        ] }, effects: DAM_TRUTH_HEDDA, next: 'corrected', fail: 'unmoved' },
        { id: 'inspect.truth.self', text: '(Tell it yourself: the block, the crack, the sixty years.)', if: { not: { flag: 'nw_hedda_agrees' } }, check: { skill: 'speech', dc: 55, mods: [
          { dc: -10, if: WHY, why: 'the crack and the keepers\' log' }, { dc: -10, if: SINK, why: 'what the shortfall costs the Sink' },
          { dc: -5, if: { flag: 'nw_rhiannon_word' }, why: 'the lock-keeper will witness the pins' }, { dc: -5, if: IN(NINE), why: 'Nine, beside you' },
        ] }, effects: DAM_TRUTH_TOLD, next: 'corrected', fail: 'unmoved' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    corrected: {
      text: 'Seventeen goes down the gallery stair with the old woman and her lamp and is gone an hour. When it comes up its frame is wet to the knees. It stands in the gatehouse in front of the controller for a long time, and then it does something you did not know they could do: it takes off its cap, and holds it. "The record is corrected," it says. "Ashby: sixth mark, structurally limited. Schedule to be recomputed on the instrument as found. Clause thirty-one: Ashby\'s shortfall void, there being no shortfall from a lake that does not exist." It puts the cap back on. "The record regrets the sixty years."',
      again: '"The record regrets the sixty years."',
      interject: [
        { companion: NINE, text: 'Nine does not say anything for a long time. Then: "It took its cap off." Another pause. "I did not know we could."', effects: [A(NINE, 3)] },
        { companion: ASH, text: '"The Sink," Ash says, and you realise he is crying, quietly, without any fuss. "Next spring. Think of the stair, next spring."' },
      ],
      options: [
        { id: 'inspect.warranty', text: 'And the mending? The lease says the lessor warrants the works.', if: { all: [{ lead: 'l_nw_warranty' }, { not: { flag: 'nw_mend' } }] }, effects: [{ set: 'nw_mend', value: 'house' }, A(ODILE, 3), { rep: { faction: 'tenured', respect: -5 } }, { decision: { id: 'nw_mend_house', text: 'The city filed the Ashby lease\'s warranty against its lessor\'s heirs: a house of the Crown must pay to mend the dam.' } }], next: 'warranty' },
        { id: 'inspect.mend', text: 'Who mends her?', if: { all: [{ not: { lead: 'l_nw_warranty' } }, { not: { flag: 'nw_mend' } }] }, effects: [{ set: 'nw_mend', value: 'city' }], next: 'mend' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    warranty: { text: '"Clause eleven." The lens clicks. "The lessor warrants the works for the term. The lessor\'s heirs are listed." It writes on a second card. "The record will present the account to the house of Ashby-Crane." If a unit could sound pleased, it would sound pleased. "It is a large account."', again: '"It is a large account."', interject: [{ companion: ODILE, text: '"Oh, well done," Odile murmurs. "The Crown pays for the Wet\'s dam. I would give a great deal to see the face that opens that letter."' }], options: [{ text: '(Leave it.)', exit: true }] },
    mend: { text: '"The city\'s works." The lens turns to the Water. "Scheduled. The record will send men and concrete up the river." It pauses. "The record does not say when. The record has a great many things to mend."', again: '"The record has a great many things to mend."', options: [{ text: '(Leave it.)', exit: true }] },
    unmoved: { text: '"The record notes the claim," says Seventeen, and does not move. "A claim is not an instrument. The inspection will proceed when the keeper attends."', again: '"A claim is not an instrument."', options: [{ text: 'Something else.', next: 'again' }] },
    taken: {
      speaker: 'narrator',
      text: 'They take her down the lock\'s stair in the rain, the old woman with her keys taken off her and her hands in front of her, and the girl with the red hair beside her refusing to be led, onto the down barge at noon, and the wardens stay. By evening one of them has the lock\'s key on its cord round its own neck, and the controller in the gatehouse is chiming every hour: RAISE TO FULL LINE. RAISE TO FULL LINE.',
      again: 'RAISE TO FULL LINE.',
      interject: [{ companion: TAMSIN, text: 'Tamsin watches the barge go down the gorge until it is gone. "They\'ll fill it," she says. "Because the card says." She turns on you. "You know what happens to it, filled. You read the pins."' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
    done: {
      text: [
        { if: D('truth'), text: 'Seventeen on the crest, writing in the rain, measuring the dam with a tape it carries in its own leg. "The record is occupied," it says pleasantly.' },
        { text: 'The crest, the rain.' },
      ],
      again: 'The crest.',
      options: [bye],
    },
  },
};

export const d_nw_warden: DialogueDef = {
  id: 'd_nw_warden', owner: 'npc_nw_g1', start: [{ node: 'w' }],
  nodes: { w: { text: [{ if: D('exposed'), text: '"Warden keeping. Stand clear of the works." The warden has the lock\'s key round its neck. "Raise to full line, by the card."' }, { text: '"Stand clear of the inspection."' }], again: '"Stand clear."', options: [bye] } },
};

// ---------------------------------------------------------------- the dam as a place

export const d_nw_dm_notice: DialogueDef = {
  id: 'd_nw_dm_notice', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: D('truth'), text: 'The city\'s notice on the crest, and pasted across it a second, newer one: ASHBY — RECORD CORRECTED — SCHEDULE TO BE RECOMPUTED. WORKS TO FOLLOW.' },
        { text: 'A notice on the crest under oilcloth, with the city\'s seal: AUDIT OF DELIVERY — ASHBY — ELEVEN SEASONS SHORT OF SCHEDULE. INSPECTION PENDING. THE KEEPER WILL ATTEND. Under it somebody has drawn, very small, a dam with a face, crying.' },
      ],
      again: 'The city\'s notice.',
      effects: NOTICE,
      options: [leave],
    },
  },
};

export const d_nw_gauge: DialogueDef = {
  id: 'd_nw_gauge', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'nw_keepers', eq: 'taken' }, text: 'The staff gauge on the upstream face, ten marks painted on the concrete as tall as a man each, and the Water higher than it was: past the sixth, creeping toward the seventh, a warden standing over it with a log.' },
        { text: 'Leaning over the parapet you can see the staff gauge painted down the dam\'s upstream face: ten white marks as tall as a man each, numbered, the top one at your feet, going down into the grey water. The Water stands at the sixth mark. Four marks of dry concrete above it, streaked with sixty years of rain and nothing else; no tide line, no weed. It has never been higher.' },
      ],
      again: 'The gauge on the face.',
      effects: [{ lead: 'l_nw_gauge' }],
      interject: [{ companion: ILYA, text: 'Ilya counts the marks aloud from the top. "Ten. Nine. Eight. Seven. Six." He looks along the dry concrete above the water. "Never wet," he says. "Not once." He knows what a full lake leaves on a wall; he has hidden behind enough of them.' }],
      options: [leave],
    },
  },
};

export const d_nw_well: DialogueDef = {
  id: 'd_nw_well', owner: 'narrator',
  start: [{ if: { flag: 'nw_hidden_ready' }, node: 'ready' }, { if: { flag: 'nw_well_open' }, node: 'inside' }, { node: 'shut' }],
  nodes: {
    shut: {
      text: 'The gauge-well hut: a steel box built out over the upstream face on brackets, its door padlocked with a lock older than you, a grating in its floor over the water. Inside, the float of the gauge that tells the controller how full the Water is rides in its well.',
      again: 'The gauge-well hut, padlocked.',
      options: [
        { id: 'well.pick', text: '(Pick the padlock.)', check: { skill: 'security', dc: 35 }, effects: [{ set: 'nw_well_open' }], next: 'inside', fail: 'stuck' },
        { id: 'well.grating', text: '(Lie on the crest and look through the hut\'s floor grating.)', check: { skill: 'mechanics', dc: 30, mods: [{ if: { attr: 'senses', gte: 7 }, dc: -10, why: 'sharp eyes' }] }, effects: [{ lead: 'l_nw_jam' }], next: 'grating', fail: 'dark' },
        { id: 'well.key', text: '(Open it with the keeper\'s key from her chain.)', if: { knows: 'nw_hedda_told' }, effects: [{ set: 'nw_well_open' }], next: 'inside' },
        leave,
      ],
    },
    inside: {
      text: 'Inside: a well of black water in the concrete, a float on a cable going up over a pulley to an indicator drum, and the float jammed hard against the top of its well with a block of oak cut to fit, black and smooth with handling. With the block there, the float reads the top of the well. FULL.',
      again: 'The float, and the oak block.',
      effects: [{ lead: 'l_nw_jam' }],
      options: [
        { id: 'well.spool', text: '(Re-spool the indicator\'s drum two turns, take out the block, and let the float run free.)', if: { all: [LIE, NIGHT, { not: { flag: 'nw_dam' } }] }, check: { skill: 'mechanics', dc: 45, mods: [{ if: { flag: 'nw_rhiannon_helps' }, dc: -15, why: 'Rhiannon holds the lamp and knows the drum' }] }, effects: [{ set: 'nw_hidden_ready' }, { xp: 40 }], next: 'spooled', fail: 'spool_no' },
        leave,
      ],
    },
    grating: { text: 'Through the grating, by the light off the water: the float of the gauge, jammed hard against the top of its well with a block of oak cut to fit, black with handling. Old work, and kept up. Somebody has put that block back in place every day for a very long time.', again: 'The oak block in the well.', options: [leave] },
    dark: { text: 'Black water, a cable, a shape that might be anything. You cannot make it out.', again: 'Black water.', options: [leave] },
    stuck: { text: 'The padlock is older than you and has opinions about it.', again: 'The padlock, unmoved.', options: [leave] },
    spooled: {
      text: [
        { if: { flag: 'nw_rhiannon_helps' }, text: 'Rhiannon holds the lamp and talks you through it in a whisper: the drum\'s pawl, two turns back, the pawl again, the block out and into her coat. The float drops a yard down its well and floats free on black water, and in the gatehouse, through the wall, the controller does not chime. FULL, it still says. "Two turns," Rhiannon whispers. "Gran\'s gran worked that out the year after the block. We never needed it." She is shaking.' },
        { text: 'By your own lamp, with your hands numb: the drum\'s pawl, two turns back, the pawl again, the block out and into the Water. The float drops a yard down its well and floats free, and through the wall the controller does not chime. FULL, it still says.' },
      ],
      again: 'The free float, still reading FULL.',
      options: [leave],
    },
    spool_no: { text: 'The pawl slips, and the drum spins, and for one long breath the indicator runs down toward the truth before you catch it and wind it back. You put the block back in with shaking hands. Not tonight.', again: 'The pawl slipping.', options: [leave] },
    ready: { text: 'The gauge well: the float riding free on black water, no block, the drum two turns out, reading FULL.', again: 'The free float.', options: [leave] },
  },
};

export const d_nw_controller: DialogueDef = {
  id: 'd_nw_controller', owner: 'narrator', start: [{ node: 'panel' }],
  nodes: {
    panel: {
      text: [
        { if: D('truth'), text: 'The controller\'s panel: LAKE — 60% — STRUCTURALLY LIMITED. SCHEDULE R30 — RECOMPUTED. CL. 31 — VOID FOR ASHBY. And, in a line of its own, WORKS — SCHEDULED.' },
        { if: D('hidden'), text: 'The controller\'s panel: LAKE — FULL — 100%. INSPECTION R30 — COMPLIANT.' },
        { if: D('exposed'), text: 'The controller\'s panel, chiming on the hour: LAKE — 62% — RAISE TO FULL LINE. KEEPING — WARDEN. And a red lamp beside a word you have not seen on it before: STRAIN.' },
        { if: D('sunk'), text: 'The controller\'s panel: INSPECTION R30 — UNIT 17 — NO REPORT. Under it, patiently, the same line every hour: AWAITING INSPECTION.' },
        { text: 'The controller: a grey pre-war cabinet the height of a man with a slot in its face for the city\'s cards and a panel of green characters. LAKE — FULL — 100%. SCHEDULE R30 — CARD 3 OF 4: SPRING RELIEF TO PRECINCT SUPPLY (CL. 31, GROWTH). LOCKINGS 06:00, 12:00. SPILL — NIL.' },
      ],
      again: 'The controller\'s panel.',
      interject: [
        { companion: KES, text: 'Kes puts her palm flat on the cabinet and frowns. "Nothing," she says. "No channel, no backdoor, no lattice. It\'s deaf as a stone. Ledger work: it only hears what you put in its slot." She takes her hand away. "Honestly, I respect it."' },
        { companion: NINE, if: { not: { lead: 'l_nw_clause31' } }, text: '"Card three," Nine says, reading the panel. "Clause thirty-one. Its footnote applies." It reads the small characters below the line aloud: "SHORTFALL MET FROM SINK RELIEF." The lens clicks. "Ashby\'s delivery and the Sink\'s pumps are one line in the schedule. I did not know that. I should have."', effects: [{ lead: 'l_nw_clause31' }, A(NINE, 2)] },
      ],
      options: [
        { id: 'controller.read', text: '(Read the card\'s footnote on the panel.)', if: { not: { lead: 'l_nw_clause31' } }, check: { skill: 'science', dc: 35, mods: [{ if: { knows: 'sk_schedule_known' }, dc: -20, why: 'you have seen the Sink\'s pump board' }] }, effects: [{ lead: 'l_nw_clause31' }], next: 'footnote', fail: 'blur' },
        leave,
      ],
    },
    footnote: { text: 'Below the card\'s line, in characters half the size: SHORTFALL MET FROM SINK RELIEF (PUMPS 2, 3). When Ashby comes in short, the city takes the difference out of the Sink\'s spring.', again: 'SHORTFALL MET FROM SINK RELIEF.', options: [leave] },
    blur: { text: 'Green characters on grey glass, in the city\'s shorthand. You can read FULL. The rest is clauses.', again: 'FULL, and clauses.', options: [leave] },
  },
};

export const d_nw_log: DialogueDef = {
  id: 'd_nw_log', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Two books on the shelf by the controller: the city\'s, thin, printed, its pages stamped COMPLIANT season by season; and beside it a fat old ledger with a cracked spine, the keepers\' own. On the keepers\' first page, in a big square hand gone brown: NEVER ABOVE THE SIXTH MARK. SHE WILL NOT HOLD IT. — M.W. And under it, every season since, a level and a date and the same small tick: 6. 6. 6.',
      again: 'The two books, COMPLIANT and 6.',
      effects: [{ lead: 'l_nw_keepers_log' }],
      options: [leave],
    },
  },
};

export const d_nw_lease: DialogueDef = {
  id: 'd_nw_lease', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A frame on the gatehouse wall with a long document in it on paper gone the colour of tea: THE ASHBY WATER TRUST — LEASE OF IMPOUNDED WATERS — TO THE CHARTER CITY OF MERIDIAN — ONE HUNDRED AND FIFTY YEARS. Seals. Signatures. Clauses in a small grey type that goes on for ever.',
      again: 'The Ashby lease, in its frame.',
      interject: [{ companion: ODILE, if: { not: { lead: 'l_nw_warranty' } }, text: 'Odile has her glasses on their chain up to her eyes before you have finished reading the heading. "Eleventh clause," she says after a while, tapping the glass. "THE LESSOR WARRANTS THE WORKS FOR THE TERM. My dear, the Ashbys promised the city a sound dam for a hundred and fifty years." She smiles slowly. "And the Ashbys are a house in the Crown."', effects: [{ lead: 'l_nw_warranty' }, { give: 'k_nw_contract' }, A(ODILE, 2)] }],
      options: [
        { id: 'lease.read', text: '(Read it through.)', if: { not: { lead: 'l_nw_warranty' } }, check: { skill: 'science', dc: 30 }, effects: [{ lead: 'l_nw_warranty' }, { give: 'k_nw_contract' }], next: 'clause', fail: 'type' },
        leave,
      ],
    },
    clause: { text: 'In the eleventh clause, between a paragraph about silt and one about birds: THE LESSOR WARRANTS THE WORKS FOR THE TERM. The Ashby trust promised the city a sound dam for a hundred and fifty years, and its heirs are still listed, under the seals: a house of the city\'s Crown. You copy the clause.', again: 'THE LESSOR WARRANTS THE WORKS.', options: [leave] },
    type: { text: 'Small grey type, a great deal of it, about silt and birds and liabilities. Your eyes slide off it.', again: 'Silt and birds.', options: [leave] },
  },
};

export const d_nw_stair: DialogueDef = {
  id: 'd_nw_stair', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'A steel door in the gatehouse floor, and under it a stair going down into the dam, wet, lit by one bulb at the bottom that the turbine keeps alive.', again: 'The gallery stair.', options: [{ id: 'stair.down', text: '(Go down.)', effects: [{ time: 5 }, { event: 'goto', data: { location: 'nw_gallery', spawn: 'stair' } }], exit: true, repeat: true }, leave] } },
};
export const d_nw_gl_stair: DialogueDef = {
  id: 'd_nw_gl_stair', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'The stair up to the gatehouse, and the bulb, and the sound of rain at the top.', again: 'The stair up.', options: [{ id: 'gl.up', text: '(Go up.)', effects: [{ time: 5 }, { event: 'goto', data: { location: 'nw_dam', spawn: 'gatehouse' } }], exit: true, repeat: true }, leave] } },
};

export const d_nw_pins: DialogueDef = {
  id: 'd_nw_pins', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'On the west wall of the gallery a crack runs down from the ceiling to the drain, dark and wet, and across it, every hand\'s breadth, a pair of brass pins set into the concrete either side, with a date chalked beside each pair and a figure. Sixty years of dates. The water that should not be running is running out of the bottom of the crack into the drain, a thread of it, clean and cold.',
      again: 'The crack and its pins.',
      interject: [{ companion: ILYA, if: { not: { lead: 'l_nw_crack' } }, text: 'Ilya holds his thumb against the oldest pair of pins, and then against the newest, and counts the chalk dates under his breath all the way down the wall. "Sixty," he says. "A finger, in sixty." He takes his thumb away. "Faster at the bottom. Faster in the wet ones."', effects: [{ lead: 'l_nw_crack' }, A(ILYA, 2)] }],
      options: [
        { id: 'pins.read', text: '(Read the pins.)', if: { not: { lead: 'l_nw_crack' } }, check: { skill: 'science', dc: 40, mods: [{ if: { skill: 'mechanics', gte: 40 }, dc: -10, why: 'you know concrete' }] }, effects: [{ lead: 'l_nw_crack' }], next: 'read', fail: 'chalk' },
        leave,
      ],
    },
    read: { text: 'Each pair of pins measures how far the crack has opened since they were set. The figures go up, season by season, a hair at a time, faster in the wet years; sixty years have opened it a finger\'s width. At the sixth mark, the Water\'s weight is what the cracked wall has been carrying. Above it, the weight goes up as the square of the depth. You do the sum the keepers did, and do not like it.', again: 'A finger, in sixty years.', options: [leave] },
    chalk: { text: 'Pins, dates, numbers in chalk going up. It means something to somebody. The wet means something to you.', again: 'Pins and chalk.', options: [leave] },
  },
};

export const d_nw_joint: DialogueDef = {
  id: 'd_nw_joint', owner: 'narrator', start: [{ node: 'l' }],
  nodes: { l: { text: 'A construction joint weeping lime: a white beard of it down the wall, grown over ninety years like a stalactite, wet to the touch. Somebody has stuck a cup under it to see how fast it fills. It is full.', again: 'The weeping joint, the full cup.', options: [leave] } },
};

export const d_nw_tailrace: DialogueDef = {
  id: 'd_nw_tailrace', owner: 'narrator',
  start: [{ if: NIGHT, node: 'night' }, { node: 'day' }],
  nodes: {
    day: { text: 'The tailrace: the river coming out of the turbine hall\'s mouth under the dam in a white rush and going off down the gorge. Somebody has set eel traps in the slack water under the bank, wicker, weighted with stones. Eels run at night.', again: 'The tailrace, the eel traps.', options: [leave] },
    night: {
      text: 'The tailrace at night, loud in the dark, and the eel traps under the bank shining wet in your lamp.',
      again: 'The tailrace, at night.',
      options: [
        { id: 'tailrace.first', text: '(Work the traps.)', if: { not: { flag: 'nw_eels' } }, check: { skill: 'survival', dc: 30 }, effects: [{ set: 'nw_eels', value: 1 }, { time: 180 }, { give: 'c_meat', count: 3 }, { give: 'j_scrap', count: 2 }], next: 'first', fail: 'slip', failEffects: [{ time: 180 }], repeat: true },
        { id: 'tailrace.again', text: '(Work the traps.)', if: { flag: 'nw_eels' }, check: { skill: 'survival', dc: 30 }, effects: [{ time: 180 }, { give: 'c_meat', count: 2 }], next: 'eels', fail: 'slip', failEffects: [{ time: 180 }], repeat: true },
        leave,
      ],
    },
    first: { text: 'Three hours to the knee in black water with your sleeves rolled, and the traps full of eels thick as your wrist, and wedged in the last trap\'s wicker a lump of pre-war copper fittings the current has been rolling down the tailrace for ninety years.', again: 'Eels, and copper.', options: [leave] },
    eels: { text: 'Three hours at the traps, and a sack of eels heavy and moving on your shoulder all the way up the bank.', again: 'A sack of eels.', options: [leave] },
    slip: { text: 'You slip on the weed and go in to the chest, and the cold takes the breath out of you, and you spend the rest of the night by a fire you can barely light.', again: 'In to the chest.', options: [leave] },
  },
};

export const DAM_DIALOGUES: DialogueDef[] = [d_nw_hedda, d_nw_rhiannon, d_nw_aurelio, d_nw_inspect, d_nw_warden, d_nw_dm_notice, d_nw_gauge, d_nw_well, d_nw_controller, d_nw_log, d_nw_lease, d_nw_stair, d_nw_gl_stair, d_nw_pins, d_nw_joint, d_nw_tailrace];
