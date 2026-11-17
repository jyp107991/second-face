import type { DialogueDef, OptionDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { COMFORT_TALLY_BACK, COMFORT_WORD_NODES, COMFORT_WORD_OPTION, MARWOOD_BACK_NODES, MARWOOD_BACK_OPTION } from './a3_close';
import { PNR_NODES, PNR_START } from './a3_ready';
import { VAULT_DOOR_NODES, VAULT_DOOR_START } from './a3_vault';

/**
 * Meridian, the Archive Spire (B3.11): the photograph read from the pack (beat 14, the date), the close and its steps,
 * the catalogue and the stair of ninety-one landings (beat 15's ways up), the copyist and the usher (the squatter's case;
 * the Court itself is in md_court.ts), landing ninety-one (the reserve drawers, the docket of twelve, the renderer, the
 * drop), and the hearing in the round room. Story notes: story/STORY_PLAN_SECRET.md, Build notes — B3.11.
 */

const TAMSIN = 'npc_c9_03';
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const ODILE = 'npc_nb_03';
const ASH = 'npc_of_03';
const NINE = 'npc_md_nine';
const VOICE = 'npc_ar_voice';

const bye = { text: 'That\'s all.', exit: true };
const NIGHT: Cond = { hour: { from: 22, to: 5 } };
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const CAL_OPEN: Cond = { all: [{ item: 'k_photo' }, { not: { knows: 'cal_future' } }] };
const CAL = (how: string): Effect[] => [{ learn: 'cal_future' }, { set: 'cal_how', value: how }, { learn: 'cal_render' }, { lead: 'l_cal_render' }, { xp: 60 }];
/** A topic asked once, from either of a node's two option sets (the opening and the `again` hub). */
const NOT_SEEN = (id: string): Cond => ({ not: { any: [{ seen: id }, { seen: `${id}.again` }] } });
const GOTO_TOP: Effect = { event: 'goto', data: { location: 'md_spire_top', spawn: 'stair_top', minutes: 30 } };

// ---------------------------------------------------------------- the photograph, read from the pack (beat 14)

export const d_photo_read: DialogueDef = {
  id: 'd_photo_read', owner: 'narrator',
  start: [{ if: { knows: 'cal_future' }, node: 'known' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'It\'s you. Older — forty, forty-five — on broad stone steps under a lamp, a city of towers behind you going up out of the frame, squinting into a wind. Something across your chest you took for a strap the first time, and have not been sure of since.',
      again: 'You, older, on the steps under the lamp, squinting into the wind.',
      passives: [
        { attr: 'senses', dc: 6, text: 'The shadows on your face fall left. The shadows on the towers fall right. There is no sun anywhere that does both.', effects: [{ lead: 'l_photo_light' }] },
        { skill: 'science', dc: 40, text: 'No grain, anywhere, even blown up by your eye. Dust hangs in the air beside your shoulder, and the same mote hangs again by the lamp: drawn, not caught.', effects: [{ lead: 'l_photo_grain' }] },
      ],
      options: [{ id: 'photo.back', text: '(Turn it over.)', next: 'back' }, { text: '(Put it away.)', exit: true }],
    },
    back: {
      text: 'On the back, in pencil, in a hand that is not yours: 49 · VI · 12. A year, a month, a day. Along the bottom margin, printed, a short code — 0412/30 — and under it a line of print so small and so even it looks like a scratch until you tilt it.',
      again: 'The back: 49 · VI · 12 in pencil, the printed code, the scratch of microprint under it.',
      effects: [{ lead: 'l_cal_pencil' }, { learn: 'cal_margin_seen' }],
      interject: [
        { companion: TAMSIN, text: '"Forty-one years," Tamsin says, at your shoulder. "That\'s what everybody\'d say. Everybody out here counts from the Burn." She frowns at it. "Everybody out here."' },
        { companion: WREN, text: '"Pencil\'s not his," Wren says. "He wrote small and square. That\'s somebody copying something they didn\'t understand."' },
      ],
      options: [
        { id: 'photo.eyes', text: '(Let your eyes find the microprint.)', if: { all: [CAL_OPEN, { chromeSlot: 'eyes' }] }, next: 'eyes' },
        { id: 'photo.link', text: '(Let the link read the code off the city\'s wire.)', if: { all: [CAL_OPEN, { chromeSlot: 'neural' }, { any: [{ at: 'md_precinct' }, { at: 'md_spire' }, { at: 'md_market' }, { at: 'md_stacks' }, { at: 'md_lantern' }] }] }, next: 'link' },
        { id: 'photo.nine', text: '(Show Nine the back.)', if: { all: [CAL_OPEN, { inParty: NINE }] }, next: 'nine' },
        { id: 'photo.odile', text: '(Hand it to Odile.)', if: { all: [CAL_OPEN, { inParty: ODILE }] }, next: 'odile' },
        { text: '(Put it away.)', exit: true },
      ],
    },
    eyes: {
      text: 'The optic finds the scratch and pulls it up until it is letters, flat and even as the Precinct\'s forms: RENDER — DESIGNATE — FROM FORECAST, R30 — DEPICTS R49.06.12. The pencil copied the date off the print and left off the one letter that mattered.',
      effects: CAL('eyes'),
      options: [{ text: '(Put it away.)', exit: true }],
    },
    link: {
      text: 'You think at the code and the city\'s wire thinks back, the way it does in a street with a lamp in it: a cold, polite query, a pause, a line in your skull in the Ledger\'s even hand. RENDER QUEUE 0412 — SUBJECT: DESIGNATE — RENDERED R30 FROM FORECAST — DEPICTS R49.06.12. Then the wire asks who is asking, and you stop thinking at it.',
      effects: CAL('link'),
      options: [{ text: '(Put it away.)', exit: true }],
    },
    nine: {
      speaker: NINE,
      text: '"Clause 40 forbids me to read a citizen their own forecast." The lens goes over the pencil once and stops at the margin, and clicks. "It does not forbid me to read a date. Forty-nine, sixth month, twelfth day. That is the Restoration Calendar; the Cistern would write it otherwise. R49 is nineteen years from today." A pause. "The margin is a render number. That is not a photograph. I am not permitted to say what it is a picture of, and I have not said it."',
      effects: [...CAL('nine'), A(NINE, 3)],
      options: [{ text: '(Put it away.)', exit: true }],
    },
    odile: {
      speaker: ODILE,
      text: 'She holds it at arm\'s length, then takes her glasses off their chain and holds it close. "Oh, my dear." Very softly. "That is a delivery date. I have written ten thousand of them. Nobody writes a delivery date on a thing that has already been delivered." She taps the margin with the Gyro hand\'s fingernail. "And that is a lot number. Somebody has sold this, or means to. Forty-nine is the city\'s year. It is nineteen years off."',
      effects: [...CAL('odile'), A(ODILE, 3)],
      options: [{ text: '(Put it away.)', exit: true }],
    },
    known: {
      text: 'You, older, on the steps at the foot of the Archive Spire, under the lamp, in the city\'s year forty-nine: nineteen years from now. A picture of a day that has not come.',
      again: 'The steps, the lamp, R49.',
      options: [{ text: '(Put it away.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the close

export const d_md_spire_sign: DialogueDef = {
  id: 'd_md_spire_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'An enamel sign on a post at the mouth of a lane: NORTH — THE SPIRE CLOSE — COURT OF ACCOUNTS — CATALOGUE. Somebody has scratched under it, small: *and the steps*.', again: 'NORTH — THE SPIRE CLOSE. *And the steps.*', effects: [{ learn: 'ar_lane_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_ar_close_sign: DialogueDef = {
  id: 'd_ar_close_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'ARCHIVE SPIRE — THE CLOSE. COURT OF ACCOUNTS: WEST WING, IN SESSION WHEN CALLED. CATALOGUE: EAST WING, READERS BY SLIP. THE STEPS AND THE GREAT DOORS ARE CLOSED FOR WORKS. ALL PERSONS ARE RECORDED.', again: 'COURT, WEST. CATALOGUE, EAST. THE STEPS ARE CLOSED.', effects: [{ learn: 'ar_close_read' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_ar_board: DialogueDef = {
  id: 'd_ar_board', owner: 'narrator', start: [{ node: 'read' }],
  nodes: {
    read: {
      text: [
        // Act 3 (B6l): the Ledger has brought the steps forward to R30 (the fourth order)
        { if: { flag: 'a3_open' }, text: 'A works board on the scaffold, relettered: ARCHIVE SPIRE — RESTORATION — R30 WORKS — BROUGHT FORWARD. PUBLIC STEPS AND GREAT DOORS: REOPEN R30. The 30 is fresh white paint over a 49 that still shows through when the light is low. Below it, by landing, the same list as before, every date on it struck through and written again nineteen years sooner.' },
        { if: { flag: 'prec_refuse_benefit' }, text: 'A works board on the scaffold, freshly lettered: ARCHIVE SPIRE — RESTORATION — R30 WORKS — ON SCHEDULE. PUBLIC STEPS AND GREAT DOORS: REOPEN R49. Below, by landing: 1 — FAÇADE. 2 — HALL OF RECORDS. 3 — COPY ROOM: MAGISTRATE\'S CHAMBERS — REROUTED. The last word is new paint over old.' },
        { text: 'A works board on the scaffold, freshly lettered: ARCHIVE SPIRE — RESTORATION — R30 WORKS — ON SCHEDULE. PUBLIC STEPS AND GREAT DOORS: REOPEN R49. Below, by landing: 1 — FAÇADE. 2 — HALL OF RECORDS. 3 — COPY ROOM: MAGISTRATE\'S CHAMBERS (R49). And so on up, past where the board runs out of room.' },
      ],
      again: [{ if: { flag: 'a3_open' }, text: 'REOPEN R30, in fresh white over the 49.' }, { text: 'R30 WORKS — ON SCHEDULE. REOPEN R49. Landing three, the copy room, and what it is to be.' }],
      effects: [{ learn: 'ar_board_read' }, { lead: 'l_cal_r49' }, { lead: 'l_ca_chambers' }, { quest: 'q_a2_calendar', start: true }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_ar_steps: DialogueDef = {
  // Act 3 (B6m): from the Ledger's card until the steps are climbed, the lamp is the point of no return (a3_ready.ts)
  id: 'd_ar_steps', owner: 'narrator', start: [...PNR_START, { if: { knows: 'ar_steps_known' }, node: 'again' }, { node: 'scene' }],
  nodes: {
    scene: {
      text: 'You stop on the fourth step without deciding to. The lamp behind your left shoulder. The doors above. The Crown\'s glass going up out of sight on either side. The wind off the canal, in your face, making you squint. It is the photograph. The angle is wrong by a stride, and the steps are cracked where the print has them whole, but it was made here, of you, standing about where you are standing now.',
      effects: [{ learn: 'ar_steps_known' }, { lead: 'l_ar_steps' }, { xp: 40 }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin has stopped two steps below you. "Don\'t move," she says, and holds the photograph up at arm\'s length, between your face and hers, and lowers it slowly. "Oh," she says. "Oh, I don\'t like that."' },
        { companion: WREN, text: 'Wren walks once round the lamp, the way she walks round a place she means to come back to in the dark. "Here," she says. "He stood you here." She does not say who.' },
        { companion: ASH, text: 'Ash stays at the foot of the steps. "I\'ll not climb them," he says. "Not today. You go on." He looks at the lamp as if it owed him something.' },
        { companion: ODILE, text: '"Delivery point," Odile murmurs. "Of course. One always sells a thing with its address on it."' },
        { companion: ILYA, text: 'Ilya looks at the lamp, the doors, the glass, the long lines of sight down into the square. "Good place to stand someone," he says. "If you wanted everyone to see them." He means it the way a sniper means it.' },
        { companion: NINE, text: '"The steps," Nine says. "I have walked past them for a hundred and twenty years. I did not know they were waiting for someone."' },
      ],
      options: [{ id: 'steps.hold', text: '(Hold the photograph up against the steps.)', next: 'hold' }, { text: '(Go on.)', exit: true }],
    },
    hold: {
      text: 'Close enough to frighten you. Older you is standing one step higher, and the cracks are mended, and the scaffold is gone, and the board on it that says the steps reopen R49 is gone too, because it is R49. You put the photograph away and stand on your own step for a while.',
      effects: [{ lead: 'l_cal_r49' }],
      options: [{ text: '(Go on.)', exit: true }],
    },
    again: {
      text: [{ if: { knows: 'cal_future' }, text: 'The steps. The lamp. One step higher, in the picture, nineteen years from now.' }, { text: 'The steps. The lamp. One step higher, in the picture.' }],
      again: 'The steps, and the lamp.',
      options: [{ text: '(Go on.)', exit: true }],
    },
    ...PNR_NODES,
  },
};

export const d_ar_doors: DialogueDef = {
  // Act 3 (B6m): from the Ledger's card until the steps are climbed, the doors are the point of no return too (a3_ready.ts)
  id: 'd_ar_doors', owner: 'narrator', start: [...PNR_START, { node: 'look' }],
  nodes: { look: { text: 'The great doors: bronze, four storeys, green at the seams, chained through the handles with a chain that has been oiled. A card in a sleeve on the chain: CLOSED FOR WORKS — REOPEN R49. Through the gap at the hinge, a hall of records going back into the dark, and a smell of paper.', again: 'The bronze doors, chained and oiled. REOPEN R49.', effects: [{ learn: 'ar_doors_seen' }, { lead: 'l_cal_r49' }], options: [{ text: '(Leave it.)', exit: true }] }, ...PNR_NODES },
};

export const d_ar_vault: DialogueDef = {
  // Act 3 (B6q): once the steps are done the door stands open on the stair down to the vault (a3_vault.ts)
  id: 'd_ar_vault', owner: 'narrator', start: [...VAULT_DOOR_START, { node: 'look' }],
  nodes: {
    look: {
      text: 'A steel door set low in the Spire\'s foot, west of the steps, with no handle on this side: VAULT OF ACCOUNTS — NO ENTRY — NO EXIT. It is warm under your palm, the only warm thing in the close, and through it, far down, something hums at one note and does not stop.',
      again: 'The steel door in the Spire\'s foot. Warm. Humming, far down.',
      effects: [{ learn: 'ar_vault_seen' }],
      interject: [{ companion: NINE, text: '"Below us," Nine says, "the city." It does not put its hand on the door. "I have never been sent down. Nobody is sent down. Things are sent down."' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
    ...VAULT_DOOR_NODES,
  },
};

export const d_ar_plinth: DialogueDef = {
  id: 'd_ar_plinth', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A plinth in the middle of the close with its bolts polished and nothing on them. A brass plate: MAGISTRATE OF ACCOUNTS — THE LAST BEFORE — and a name chiselled off so carefully the stone is smooth. Somebody has left a cairn stone on the corner, and somebody else has knocked it off, and it has been put back.', again: 'The empty plinth. THE LAST BEFORE, and a smooth place where a name was.', effects: [{ learn: 'ar_plinth_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_ar_foreman: DialogueDef = {
  id: 'd_ar_foreman', owner: 'npc_ar_06', start: [{ if: { knows: 'ar_faulk_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man in a stone-dust apron with a tally stick behind his ear and a beard gone grey at the corners of the mouth. "Faulk. Works." He does not offer his hand; it is full of a chisel. "Every stone numbered, every stone back where it was. Don\'t stand on my planks."',
      effects: [{ learn: 'ar_faulk_met' }],
      options: [
        { id: 'faulk.when', text: 'When do the steps open?', next: 'when', once: true },
        { id: 'faulk.copy', text: 'Landing three. The copy room.', if: { knows: 'ca_1187_seen' }, next: 'copy', once: true },
        { id: 'faulk.stranger', text: 'Anyone ever come down the Spire who wasn\'t meant to?', next: 'stranger', once: true },
        bye,
      ],
    },
    again: {
      text: '"Planks," Faulk says, without looking round.',
      again: 'He taps a stone into its bed and waits, chisel up.',
      options: [
        { id: 'faulk.when.again', text: 'When do the steps open?', if: NOT_SEEN('faulk.when'), next: 'when' },
        { id: 'faulk.copy.again', text: 'Landing three. The copy room.', if: { all: [{ knows: 'ca_1187_seen' }, NOT_SEEN('faulk.copy')] }, next: 'copy' },
        { id: 'faulk.stranger.again', text: 'Anyone ever come down the Spire who wasn\'t meant to?', if: NOT_SEEN('faulk.stranger'), next: 'stranger' },
        bye,
      ],
    },
    when: { text: '"R49. Board says so." He knocks the board with the chisel handle. "I\'ll be dead. My boy\'ll be dead, probably, the way he climbs. The board won\'t." He shrugs. "The steps don\'t open for us. They open for somebody. Somebody\'s going to stand on them and have their picture made."', effects: [{ lead: 'l_cal_r49' }, { learn: 'ar_faulk_r49' }], options: [bye] },
    copy: { text: '"Chambers." He spits stone dust. "The schedule wants the old copy room cleared for a magistrate\'s chambers, R49, and the schedule wants it this season, because the schedule likes a room to stand empty a long time before anybody uses it. There\'s an old woman in it." He looks at his chisel. "I do stone. I don\'t do people. I told the usher so."', effects: [{ lead: 'l_ca_chambers' }], options: [bye] },
    stranger: { text: '"Two seasons back, at first light. A man came down the catalogue stair with his coat buttoned wrong, like he had something flat under it, and walked straight out across my planks without looking down. Didn\'t fall." He shakes his head. "Nobody walks my planks without looking down. I remember him for that."', effects: [{ learn: 'ar_faulk_stranger' }], options: [bye] },
  },
};

export const d_ar_marisol: DialogueDef = {
  id: 'd_ar_marisol', owner: 'npc_ar_07', start: [{ if: { knows: 'ar_marisol_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'prec_forecast_fine', eq: 'upheld' }, text: 'A woman on the public bench with a folded notice on her knee and her hands flat on it. "They upheld the forecast fines," she says, before you ask anything. "Mine\'s a forecast too. Ahead of plan. I\'ll be in the line by the spring."' },
        { text: 'A woman on the public bench with a folded notice on her knee and her hands flat on it, the way you hold something down in a wind. "Quiroga. Eleven ninety. Eviction." She looks at the bench. "Ahead of plan, it says. I didn\'t know I was ahead of anything."' },
      ],
      effects: [{ learn: 'ar_marisol_met' }],
      options: [
        { id: 'marisol.ahead', text: 'What does "ahead of plan" mean?', next: 'ahead', once: true },
        { id: 'marisol.speak', text: 'Has anyone spoken for you?', next: 'speak', once: true },
        bye,
      ],
    },
    again: {
      text: '"Eleven ninety," she says. "Still listed."',
      again: 'She smooths the notice on her knee and waits.',
      options: [
        { id: 'marisol.ahead.again', text: 'What does "ahead of plan" mean?', if: NOT_SEEN('marisol.ahead'), next: 'ahead' },
        { id: 'marisol.speak.again', text: 'Has anyone spoken for you?', if: NOT_SEEN('marisol.speak'), next: 'speak' },
        bye,
      ],
    },
    ahead: { text: '"We had a second child. The forecast said one. The flat\'s assessed for three people and we\'re four, so we\'re ahead of plan, and a household ahead of plan is rehoused." She laughs without any air in it. "Rehoused is the Ring. I asked the desk warden if I could be fined in advance instead. He said that\'s for other things."', effects: [{ learn: 'ar_ahead_of_plan' }], interject: [{ companion: ILYA, text: '"Ahead of plan," Ilya says, very quietly, to the floor between his boots. He has heard the words before, somewhere, and it was not a good place.' }], options: [bye] },
    speak: { text: '"Nobody speaks for anybody here." She nods at the rail. "Clause twelve, the usher says. A citizen can. In a year of sitting on this bench I\'ve heard it read out twice and used never." She looks at you properly for the first time. "If you\'re going to stand up there for somebody, do it for the old woman in the back. She\'s been called eleven times. I\'ve only been called once."', effects: [{ learn: 'ca_1187_seen' }, { learn: 'ca_clause12' }], options: [bye] },
  },
};

// ---------------------------------------------------------------- the usher and the copyist (Court Case: the Squatter)

const USHER_TOPICS = (sfx: string): OptionDef[] => [
  { id: `usher.how${sfx}`, text: 'How does a case go?', if: NOT_SEEN('usher.how'), next: 'how' },
  { id: `usher.nobody${sfx}`, text: 'Who has nobody to speak for them?', if: NOT_SEEN('usher.nobody'), next: 'nobody' },
  { id: `usher.petition${sfx}`, text: 'A copy of the petition in 1187. (10 Tolls)', if: { all: [{ quest: 'q_ca_squatter' }, { not: { item: 'k_ca_petition' } }, { not: { flag: 'ca_squatter' } }, { item: 'tolls', count: 10 }] }, effects: [{ take: 'tolls', count: 10 }, { give: 'k_ca_petition' }, { lead: 'l_ca_petition' }, { learn: 'ca_squatter_for_you' }], next: 'petition' },
  { id: `usher.bread${sfx}`, text: 'You bring her bread.', if: { all: [{ knows: 'ca_comfort_met' }, { not: { flag: 'ca_squatter' } }, NOT_SEEN('usher.bread')] }, next: 'bread' },
  bye,
];

export const d_ca_usher: DialogueDef = {
  id: 'd_ca_usher', owner: 'npc_ar_02', start: [{ if: { knows: 'ca_usher_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in Precinct grey gone soft at the elbows, with a hand-bell on his desk and a bread roll in a cloth beside it. "Florin Abazi. Usher. I call the cases." He looks up at the bench and down again. "The schedule says when, and the schedule says now whenever somebody asks, so: ask. It reads everything. Bring everything."',
      effects: [{ learn: 'ca_usher_met' }, { learn: 'md_court_heard' }],
      options: USHER_TOPICS(''),
    },
    again: {
      text: [
        { if: { flag: 'ca_squatter', eq: 'living' }, text: '"Ask." He nods towards the register desk under the bench, where there is someone to nod to now. He has stopped bringing bread; he brings two cups.' },
        { if: { flag: 'ca_squatter', eq: 'lost' }, text: '"Ask." He does not look at the back stair. The bread roll sits in its cloth on his desk and he does not eat it.' },
        { text: '"Ask," says the usher.' },
      ],
      again: 'He straightens the bell on his desk and waits.',
      options: USHER_TOPICS('.again'),
    },
    how: { text: '"I ring. It reads the claim. You put things on the rail — paper, a witness, a thing you know — and it reads them in, and then you argue, and it rules." He counts on his fingers, which are inky. "Rulings go in the register. Every morning it reads the register before the first case. That\'s the whole of it. The rest is waiting."', effects: [{ learn: 'ca_how' }], options: [bye] },
    nobody: {
      text: '"Eleven eighty-seven." He does not have to look it up. "The Registry against an occupant of the old copy room, behind the court. Called eleven times. Nobody answers, because the occupant is dead, according to the record." He lifts the cloth off the bread roll and puts it back. "I bring her breakfast. Back stair, behind the bench. Knock twice. She doesn\'t open to a third."',
      effects: [{ quest: 'q_ca_squatter', start: true }, { learn: 'ca_1187_seen' }],
      options: [bye],
    },
    petition: { text: 'He writes it out himself, fast, from memory, and blots it. "Vacant possession, for restoration on schedule. There." He taps the last line before he hands it over. "And the schedule reference. Read that one. I read it eleven times before I understood it was for somebody."', options: [bye] },
    bread: {
      text: 'He goes still. "Every morning, eighteen years." He says it to the desk. "Bread under her door. And at six I take her book down to the bench, and Three reads the day\'s register out of it, and at seven I take it back up." He looks at you. "I never told it whose hand it was. It never asked." A breath. "If you want that said at the rail, I\'ll say it. I\'m allowed. I looked it up."',
      effects: [{ set: 'ca_florin_witness' }, { learn: 'ca_register_is_book' }, { lead: 'l_ca_register' }, { trust: { npc: 'npc_ar_02', by: 15 } }],
      options: [bye],
    },
  },
};

const COPY_OPEN: Cond = { not: { flag: 'ca_squatter' } };
const COPY_TOPICS = (sfx: string): OptionDef[] => [
  { id: `copy.late${sfx}`, text: 'Late?', if: NOT_SEEN('copy.late'), next: 'late' },
  { id: `copy.book${sfx}`, text: 'What are you copying?', if: NOT_SEEN('copy.book'), next: 'book' },
  { id: `copy.case${sfx}`, text: 'Case 1187. You\'re the occupant.', if: { all: [COPY_OPEN, NOT_SEEN('copy.case')] }, next: 'case' },
  { id: `copy.foryou${sfx}`, text: 'The room is being cleared for me.', if: { all: [COPY_OPEN, { knows: 'ca_squatter_for_you' }, NOT_SEEN('copy.foryou')] }, next: 'foryou' },
  { id: `copy.speak${sfx}`, text: 'Let me speak for you at the rail.', if: { all: [COPY_OPEN, { not: { flag: 'ca_speaker' } }] }, next: 'speak' },
  { id: `copy.stand${sfx}`, text: 'Come down and stand at the rail yourself. Let them see you breathe.', if: { all: [COPY_OPEN, { not: { flag: 'ca_comfort_stands' } }] }, check: { skill: 'speech', dc: 45, mods: [{ if: { item: 'k_ca_certificate' }, dc: -10, why: 'a doctor has already written down that you breathe' }, { if: { inParty: TAMSIN }, dc: -10, why: 'Tamsin, who walked out of a door nobody opened, is standing in yours' }, { if: { knows: 'ca_squatter_for_you' }, dc: -5, why: 'you can tell her whom the room is being cleared for' }, { if: { flag: 'ca_speaker' }, dc: -5, why: 'you have already said you will stand there with her' }] }, next: 'stand', fail: 'stand_no' },
  { id: `copy.lend${sfx}`, text: 'Lend me the book for the rail.', if: { all: [COPY_OPEN, { not: { item: 'k_ca_copybook' } }, NOT_SEEN('copy.lend')] }, effects: [{ give: 'k_ca_copybook' }, { set: 'ca_book_lent' }], next: 'lend' },
  { id: `copy.return${sfx}`, text: '(Give the book back.)', if: { all: [{ item: 'k_ca_copybook' }, { flag: 'ca_squatter' }] }, effects: [{ take: 'k_ca_copybook' }, { set: 'ca_book_returned' }, { trust: { npc: 'npc_ar_04', by: 15 } }], next: 'returned' },
  bye,
];

export const d_ar_copyist: DialogueDef = {
  id: 'd_ar_copyist', owner: 'npc_ar_04',
  start: [
    { if: { flag: 'ca_squatter', eq: 'catalogued' }, node: 'tally' },
    { if: { flag: 'ca_squatter', eq: 'lost' }, node: 'line' },
    { if: { flag: 'ca_squatter', eq: 'living' }, node: 'register' },
    { if: { flag: 'ca_squatter' }, node: 'after' },
    { if: { knows: 'ca_comfort_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'An old woman at a desk under a lamp, copying, who does not look up. Her hair is white and cropped close, her cardigan was Precinct grey before the war of attrition with the elbows, and her hand never stops. "Held," she tells the page, "the dead do not open doors to a third knock. You knocked twice. Sit, if you\'re sitting." She finishes the line before she looks at you. "Comfort Asamoah. Copyist to the Court. Late."',
      effects: [{ learn: 'ca_comfort_met' }, { learn: 'ca_comfort_name' }, { quest: 'q_ca_squatter', start: true }],
      passives: [{ attr: 'senses', dc: 6, text: 'A citizen\'s card in a cracked sleeve is pinned over the desk, face to the wall, the way you hang a picture of someone you have stopped speaking to.', effects: [{ learn: 'ca_comfort_card' }] }],
      options: COPY_TOPICS(''),
    },
    again: {
      text: '"Sit, if you\'re sitting."',
      again: 'She finishes the line, wipes the pen, and waits.',
      options: COPY_TOPICS('.again'),
    },
    late: {
      text: '"Copyist to this Court, R−2 to R12. I lived in the Sink then; everybody did who copied for a living." She dips the pen. "In R12 the record forecast me drowned in the spring. That spring the water came up the stair and I went up a different one, this one, all the way to this room, because there is no lens in it. The record confirmed me anyway. They chalked me on the wall downstairs, STAIR, and somebody sold my number up the real stair, and the city took the number\'s word over mine." She blots the line. "Eighteen years. I have been dead in great comfort."',
      effects: [{ learn: 'ca_comfort_story' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin has gone very still. "Not counted," she says. "You just — stopped being counted. And you lived." Comfort looks at her a long moment. "Child, it\'s the only way anyone ever has."' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    book: {
      text: '"Every ruling this Court makes. Held, and the reasons. Back to R0 from the old copies, and since R12 from the bench itself." She turns a page so you can see the hand: it never slopes. "The Ledger keeps a schedule. It does not keep precedent; it rules each case against the Plan as if nobody had ever been before. Somebody has to remember what was said at that rail." She almost smiles. "Florin takes it down at six. I don\'t ask what for."',
      effects: [{ learn: 'ca_book_downstairs' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    case: { text: '"I\'m the contents." She says it without bitterness. "The Registry wants the room. It has called me eleven times. The dead don\'t answer, so it calls again. Twelve is when it stops calling and sends the wardens." She dips the pen. "Nobody files anything here. The schedule files. Ask the schedule who it wants the room for. I never have."', effects: [{ learn: 'ca_case_heard' }], options: [{ text: '(Back.)', next: 'again' }] },
    foryou: {
      text: 'She laughs, once, a dry sound like a page turning. "For a magistrate. Of course it is. They always put the magistrate\'s room where the copyist sleeps." Then she looks at you properly, up and down, the way she would look at a page someone else had copied. "You\'re the one in the file." Not a question. "Well. You\'re early."',
      interject: [{ companion: ASH, text: '"Early," Ash says. "Nineteen years early." He looks at the cot made with corners, and at you. "That\'s a weight, friend."' }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    speak: { text: '"Speak, then." She does not stop writing. "Somebody should say something at that rail that isn\'t a number. I won\'t come down. The dead don\'t stand at rails." A pause. "Clause twelve. I copied it in R19. Nobody has used it since."', effects: [{ set: 'ca_speaker' }, { learn: 'ca_clause12' }], options: [{ text: '(Back.)', next: 'again' }] },
    stand: {
      text: 'She puts the pen down, which you have not seen her do. "Twice," she says. "You knocked twice." She looks at the door for a long time, and at the stair beyond it, and at her own hands. "I\'ll stand. Not for the room. To see its face when the record has to look at me." She picks the pen up again. "Have Florin ring. I\'ll come down."',
      effects: [{ set: 'ca_comfort_stands' }, { xp: 60 }],
      options: [{ text: '(Back.)', next: 'again' }],
    },
    stand_no: { text: '"No." Gently. "Eighteen years I have been nobody\'s business. You\'re asking me to be the Court\'s." She dips the pen. "Speak for me if you like. I\'ll not come down that stair to be counted."', again: '"No," she says again, and dips the pen.', options: [{ text: '(Back.)', next: 'again' }] },
    lend: { text: 'She closes it, and holds it shut with both hands a moment, and gives it to you. It is heavier than a book should be. "It\'s the only one," she says. "Bring it back."', options: [{ text: '(Back.)', next: 'again' }] },
    returned: { text: 'She takes it in both hands and opens it at the last page and reads the last line, which is the ruling in her own case, in her own hand. "Thank you," she says. Then, because she is who she is: "You\'ve bent the corner."', options: [bye] },
    register: {
      text: 'At the desk below the bench, in the light, with the book open and a card on a string round her neck. "Keeper of the register." She says it as if tasting it. "They gave me a card and a ration and a forecast, all in one morning." She taps the page. "It says I\'ll die in my sleep at eighty-three. I\'ve had worse news from this city."',
      again: 'She is copying the morning\'s ruling into the register, in the light, where anyone can see her hand.',
      options: [{ id: 'copy.return.register', text: '(Give the book back.)', if: { item: 'k_ca_copybook' }, effects: [{ take: 'k_ca_copybook' }, { set: 'ca_book_returned' }, { trust: { npc: 'npc_ar_04', by: 15 } }], next: 'returned' }, bye],
    },
    after: {
      text: [
        { if: { flag: 'ca_squatter', eq: 'refused' }, text: '"You refused a room." She shakes her head over the page. "Nineteen years early, at the rail, with the whole bench listening. I copied it this morning. HELD: A BENEFICIARY MAY REFUSE. It\'s a good line. Nobody\'s ever had it before."' },
        { text: '"Void," she says. "Held: the Court has no jurisdiction over the dead." She copied it herself; you can see the page. "I\'m safe from everything now. Including help." She dips the pen. "Sit, if you\'re sitting."' },
      ],
      again: 'She finishes the line, and waits.',
      options: [{ id: 'copy.return.after', text: '(Give the book back.)', if: { item: 'k_ca_copybook' }, effects: [{ take: 'k_ca_copybook' }, { set: 'ca_book_returned' }, { trust: { npc: 'npc_ar_04', by: 15 } }], next: 'returned' }, bye],
    },
    tally: {
      text: [COMFORT_TALLY_BACK, { text: 'At the foot of the Sink\'s tally wall with her hand flat over a name: ASAMOAH, C. — R12 — STAIR. "It\'s true, you know," she says, without turning. "I was on a stair." She takes her hand away. "You sold it. I lent it to you, and you sold it to the catalogue, and now the city keeps its own precedents, which is to say it keeps none." A long breath. "I came down to see if they\'d spelled it right. They have."' }],
      again: 'She stands at the wall in front of her own name, and does not turn round.',
      options: [COMFORT_WORD_OPTION, bye],
    },
    ...COMFORT_WORD_NODES,
    line: {
      text: 'Outside the Wall, in the line, on a blanket somebody gave her, with the book under her coat and her back very straight. "Property," she says. "Held." She does not say it to blame you. She says it the way she says everything, so it will be remembered right. "They let me keep the book. Nobody thought it was worth anything."',
      again: 'In the line outside the Wall, the book under her coat, copying in the margins of someone\'s notice.',
      options: [{ id: 'copy.return.line', text: '(Give the book back.)', if: { item: 'k_ca_copybook' }, effects: [{ take: 'k_ca_copybook' }, { set: 'ca_book_returned' }], next: 'returned' }, bye],
    },
  },
};

// ---------------------------------------------------------------- the catalogue: the keeper, the terminal, the stair

const NO_SLIP: Cond = { all: [{ not: { item: 'k_ar_slip' } }, { not: { flag: 'ar_up' } }] };
const SLIP = (how: string): Effect[] => [{ give: 'k_ar_slip' }, { set: 'ar_slip_how', value: how }];

const KEEPER_TOPICS = (sfx: string): OptionDef[] => [
  { id: `keeper.slips${sfx}`, text: 'How does anyone read anything here?', if: NOT_SEEN('keeper.slips'), next: 'slips' },
  {
    id: `keeper.reserve${sfx}`, text: 'Reserve 9. I grew up at its door. I want to read its file, as kin.', if: NO_SLIP,
    check: { skill: 'speech', dc: 45, mods: [{ if: { member: 'wardens' }, dc: -10, why: 'a citizen asking for a lawful thing' }, { if: { item: 'k_c4_order' }, dc: -10, why: 'the city\'s own order to a sister reserve, in your hand' }, { if: { inParty: TAMSIN }, dc: -10, why: 'a woman of Reserve 9 is standing at the counter' }, { if: { flag: 'md_forged' }, dc: 15, why: 'your file was edited at the gate, and the catalogue knows it' }] },
    effects: SLIP('petition'), next: 'reserve', fail: 'reserve_no',
  },
  { id: `keeper.stranger${sfx}`, text: 'A man came down your stair at dawn with twelve faces under his coat.', if: { all: [{ any: [{ lead: 'l_rev_spire' }, { concluded: 'c_rev_last_day' }, { knows: 'ar_faulk_stranger' }] }, NOT_SEEN('keeper.stranger')] }, next: 'stranger' },
  { id: `keeper.filed${sfx}`, text: 'Petition 1187. Who filed it?', if: { all: [{ quest: 'q_ca_squatter' }, { not: { knows: 'ca_squatter_for_you' } }, { not: { flag: 'ca_squatter' } }] }, next: 'filed' },
  { id: `keeper.book${sfx}`, text: '(Put the copyist\'s book on the counter.)', if: { all: [{ item: 'k_ca_copybook' }, { not: { flag: 'ca_squatter' } }] }, next: 'book' },
  MARWOOD_BACK_OPTION(sfx), // Act 3 (B6l): the Court's register asked back
  bye,
];

export const d_ar_keeper: DialogueDef = {
  id: 'd_ar_keeper', owner: 'npc_ar_03', start: [{ if: { knows: 'ar_keeper_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A small woman behind the catalogue counter with grey hair dragged back into a braid that has given up, reading glasses pushed up into it, and ink on the side of her right hand from forty years of the same habit. "Keeper Marwood. The catalogue." She does not stop writing in the index. "Everything written in this city is written once and kept here. Kept is not the same as read. That is what I am for."',
      effects: [{ learn: 'ar_keeper_met' }],
      options: KEEPER_TOPICS(''),
    },
    again: {
      text: [{ if: { item: 'k_ar_slip' }, text: '"You have a slip." She nods at the stair. "The porter takes it."' }, { text: '"The catalogue," Keeper Marwood says.' }],
      again: 'She writes a line in the index, blots it, and waits.',
      options: KEEPER_TOPICS('.again'),
    },
    slips: { text: '"A slip." She taps a buff card in a tray. "Readers with a slip go up the stair; readers without one go home. Slips are issued to clerk grade, to next of kin for a person\'s or a reserve\'s file, and to officers of the Court." She looks at you over the glasses she is not wearing. "And to the designate, I am told, without one. The lens at the stair does that. I don\'t."', effects: [{ learn: 'ar_slips_known' }], options: [bye] },
    reserve: { text: 'She writes the slip herself, slowly, and initials it. "Reserve 9. Drawer nine, landing ninety-one. Read it, copy it if you must, put it back as you found it." She holds the slip a moment longer than she needs to before she lets it go. "Nobody from a reserve has ever asked me for its file. I always thought somebody should."', effects: [{ xp: 40 }], options: [bye] },
    reserve_no: { text: '"Next of kin of a reserve that has never sent anyone to be counted." She is not unkind about it. "The catalogue doesn\'t know you, and I can\'t write a slip for a stranger on a feeling. Bring me something the record can read. Or someone."', again: '"Something the record can read," she says again, without looking up. "Or someone."', options: [bye] },
    stranger: {
      text: 'Her pen stops. She takes the glasses out of her braid and puts them on, which she has not done for you before, and looks at you through them. "I gave him a slip." Very quietly. "He asked properly. He asked for the docket on ninety-one, and the renders, and I thought — a record should be read. That is what a record is for." She takes the glasses off. "He read it. Then he took it. Those are different things. The audit does not think so."',
      effects: [{ learn: 'ar_keeper_confessed' }],
      options: [
        { id: 'keeper.stranger.slip', text: 'Then give me one. I\'ll read it, and put it back.', if: NO_SLIP, effects: [...SLIP('keeper'), { xp: 40 }], next: 'stranger_slip' },
        { id: 'keeper.stranger.why', text: 'Why are you telling me?', next: 'stranger_why' },
      ],
    },
    stranger_slip: { text: 'She writes it without looking at the tray. "Read it," she says. "That is all I ever wanted from anybody." She slides it across the counter. "And put it back."', options: [bye] },
    stranger_why: { text: '"Because you came in at the gate with a file nobody had seen, and up the close with a photograph you keep touching through your coat." She puts the pen down. "Because I have been waiting two seasons for someone to ask me, so I could say it to somebody who is not the audit."', options: [{ id: 'keeper.stranger.slip2', text: 'Then give me a slip.', if: NO_SLIP, effects: [...SLIP('keeper'), { xp: 40 }], next: 'stranger_slip' }, bye] },
    filed: { text: '"Nobody files petitions on the works." She does not need the terminal; she turns the schedule book on the counter round to face you. "The schedule does. R30 works, landing three, the copy room: vacant possession, for the Magistrate\'s chambers, R49." Her finger stays on the line. "It was entered the week the designate\'s file was found at the gate. I noticed. Nobody asks me what I notice."', effects: [{ learn: 'ca_squatter_for_you' }, { lead: 'l_ca_petition' }], options: [bye] },
    book: {
      text: 'She opens it and does not breathe for three pages. "Every ruling of the Court of Accounts, R0 to this morning, in one hand." She turns another page. "Unlicensed. Uncatalogued. The only one." She closes it with great care. "The Archive pays for records returned to it. A hundred and fifty, and it goes into the catalogue, where the city can read it, and the Court reads its register from here. As it should." She does not take her hands off the cover.',
      again: 'The book on the counter between you. She has not taken her hands off the cover. "A hundred and fifty," she says, "and the catalogue."',
      options: [
        {
          id: 'keeper.book.sell', text: '(Sell it. 150 Tolls.)',
          effects: [
            { take: 'k_ca_copybook' }, { give: 'tolls', count: 150 }, { set: 'ca_squatter', value: 'catalogued' }, { set: 'prec_register', value: 'catalogued' },
            { decision: { id: 'ca_squatter_catalogued', text: 'You sold Comfort Asamoah\'s book of the Court\'s rulings to the catalogue; she left the copy room for the Sink.' } },
            { news: { tag: 'ca_catalogued', text: 'the Court of Accounts reads its register from the catalogue now; an old copyist was seen going down the Sink stair', valence: -4, size: 5, at: 'meridian' } },
          ],
          next: 'sold',
        },
        { id: 'keeper.book.no', text: 'No. It\'s hers.', next: 'book_no' },
      ],
    },
    sold: {
      text: 'She counts it out of a drawer marked ACQUISITIONS and writes a catalogue number on the flyleaf in a hand nothing like the hand inside. "Thank you," she says. "The record is complete." She does not sound as though that is what she wanted.',
      interject: [
        { companion: TAMSIN, text: '"She lent you that." Tamsin does not raise her voice. "She said bring it back, and you sold it to the people who wrote her dead." She walks out ahead of you.', effects: [A(TAMSIN, -10)] },
        { companion: NINE, text: '"The register belongs to the record now," Nine says. "Unit 3 will not know the difference. That is the worst of it."', effects: [A(NINE, -5)] },
        { companion: WREN, text: '"Hundred and fifty," Wren says on the stair. "For an old woman\'s eighteen years." She doesn\'t say anything else all the way down.', effects: [A(WREN, -5)] },
      ],
      options: [bye],
    },
    book_no: { text: 'She takes her hands off the cover. "No," she agrees. "It\'s hers." She goes back to the index. "If she ever wants it kept somewhere safer than a back room, tell her the catalogue has a shelf. It wouldn\'t be the same. I know that."', again: 'She has gone back to the index. The offer of a shelf stands, unrepeated.', effects: [{ learn: 'ca_keeper_declined' }], options: [bye] },
    ...MARWOOD_BACK_NODES,
  },
};

export const d_ar_catalogue: DialogueDef = {
  id: 'd_ar_catalogue', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'THE CATALOGUE — INDEX TERMINAL — READERS BY SLIP. Green on black, and a keyboard worn to blanks. The cursor waits under a line that says ENQUIRY.',
      again: 'ENQUIRY, and the cursor waiting.',
      effects: [{ learn: 'ar_catalogue_seen' }],
      options: [
        { id: 'cat.slip', text: '(Issue a reading slip at clerk grade.)', if: NO_SLIP, check: { skill: 'science', dc: 45, mods: [{ if: { inParty: NINE }, dc: -15, why: 'Nine names the grade codes with its back to the screen' }] }, effects: [...SLIP('terminal'), { xp: 40 }], next: 'slip', fail: 'slip_no' },
        { id: 'cat.petition', text: '(Enquiry: PETITION 1187.)', if: { all: [{ quest: 'q_ca_squatter' }, { not: { knows: 'ca_squatter_for_you' } }] }, check: { skill: 'science', dc: 30 }, next: 'petition', fail: 'petition_no' },
        { id: 'cat.asamoah', text: '(Enquiry: ASAMOAH, COMFORT.)', if: { all: [{ knows: 'ca_comfort_name' }, { not: { knows: 'ca_dead_entry' } }] }, next: 'asamoah' },
        { id: 'cat.reserve', text: '(Enquiry: RESERVE 9.)', if: { not: { knows: 'ar_reserve_drawer' } }, next: 'reserve' },
        { text: '(Step back.)', exit: true },
      ],
    },
    slip: { text: 'GRADE: CLERK. READER: — . The cursor waits for a name; you give it the one on your card, or none. A buff slip feeds out of a slot under the screen, warm, initialled by a machine.', options: [{ text: '(Step back.)', exit: true }] },
    slip_no: { text: 'ACCESS: CLERK GRADE OR ABOVE. The screen stays green and patient. Across the hall the keeper does not look up, which is how you know she noticed.', again: 'ACCESS: CLERK GRADE OR ABOVE.', options: [{ text: '(Step back.)', exit: true }] },
    petition: { text: 'PETITION 1187 — REGISTRY v. OCCUPANT (UNRECORDED) — COPY ROOM, LANDING 3 — RELIEF: VACANT POSSESSION — GROUND: RESTORATION, R30 WORKS — SCHEDULE REFERENCE: MAGISTRATE\'S CHAMBERS (R49). FILED BY: SCHEDULE. ENTERED: R30, the week the gate\'s lens found a file it had been waiting for.', effects: [{ learn: 'ca_squatter_for_you' }, { lead: 'l_ca_petition' }], options: [{ text: '(Step back.)', exit: true }] },
    petition_no: { text: 'PETITIONS: BY NUMBER, BY PARTY, BY COURT. The index has three ways in and you have found none of them. The cursor waits.', again: 'BY NUMBER, BY PARTY, BY COURT. The cursor waits.', options: [{ text: '(Step back.)', exit: true }] },
    asamoah: { text: 'ASAMOAH, COMFORT — COPYIST, COURT OF ACCOUNTS, R−2 TO R12 — DECEASED, R12 — THE SINK, SPRING — FORECAST CONFIRMED (TALLY; NUMBER RECOVERED). The number is printed beside it. It is the number pencilled on the Sink\'s wall.', effects: [{ learn: 'ca_dead_entry' }, { lead: 'l_ca_tally' }], options: [{ text: '(Step back.)', exit: true }] },
    reserve: { text: 'RESERVE 9 — CONTINUITY — CARETAKER: MOTHER — FILE: LANDING 91, DRAWER 9. READ BY SLIP. STATUS: OUTSTANDING.', effects: [{ learn: 'ar_reserve_drawer' }], options: [{ text: '(Step back.)', exit: true }] },
  },
};

const UP = (how: string, text: string): Effect[] => [{ set: 'ar_up' }, { set: 'ar_entry', value: how }, { xp: 60 }, { decision: { id: 'ar_up', text } }];
const CLIMB: OptionDef = { text: '(Climb.)', effects: [GOTO_TOP], exit: true };
const STAIR_ROUTES = (sfx: string): OptionDef[] => [
  { id: `stair.slip${sfx}`, text: '(Give him the reading slip.)', if: { item: 'k_ar_slip' }, effects: [{ take: 'k_ar_slip' }, ...UP('slip', 'You went up the Archive Spire\'s stair on a reading slip.')], next: 'slip_up' },
  { id: `stair.lens${sfx}`, text: '(Face the lens on the post.)', if: { knows: 'md_magistrate_designate' }, effects: UP('designate', 'You went up the Archive Spire\'s stair on your own file, as the Magistrate-designate.'), next: 'lens_up' },
  { id: `stair.nine${sfx}`, text: 'Nine. Make a records request.', if: { inParty: NINE }, effects: [...UP('nine', 'Assessor Nine took you up the Archive Spire\'s stair on a records request under clause 40.'), A(NINE, 5)], next: 'nine_up' },
  { id: `stair.pay${sfx}`, text: '(Put fifty Tolls on the desk.)', if: { item: 'tolls', count: 50 }, effects: [{ take: 'tolls', count: 50 }, ...UP('paid', 'You paid the porter at the foot of the Archive Spire\'s stair to look the other way.')], next: 'paid_up' },
  { id: `stair.lift${sfx}`, text: '(Think at the dead service lift.)', if: { chrome: 'ch_neural_link' }, effects: UP('lift', 'You called the Archive Spire\'s dead service lift through your link and rode it up.'), next: 'lift_up' },
];

export const d_ar_stair: DialogueDef = {
  id: 'd_ar_stair', owner: 'npc_ar_05',
  start: [{ if: { flag: 'ar_up' }, node: 'open' }, { if: NIGHT, node: 'night' }, { node: 'day' }],
  nodes: {
    day: {
      text: '"Slip, or the lens." The porter at the desk at the foot of the stair is a big man with lamp-black worked into the creases of his fingers, and behind him the stair goes up into a dark that a lamp on every landing does nothing about. A lens on a post at his elbow; a lift beside it with its cage rusted shut. "Hemant. I light the landings. All ninety-one."',
      again: '"Slip, or the lens," the porter says again, not unkindly.',
      effects: [{ learn: 'ar_porter_met' }],
      options: [
        ...STAIR_ROUTES(''),
        { id: 'stair.what', text: 'What\'s up there?', if: { not: { seen: 'stair.what' } }, next: 'what' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    night: {
      text: 'The porter is asleep at his desk with his chin on his chest and his lamp turned down to a bead. Behind him the stair goes up into the dark, landing lamps glowing faintly one above another until they stop being lamps and become a rumour. The lens on its post watches the desk, not the stair.',
      again: 'The porter, asleep. The stair, dark. The lens, watching the wrong thing.',
      options: [
        { id: 'stair.sneak', text: '(Up the stair past him, in the dark.)', check: { skill: 'stealth', dc: 45, mods: [{ if: { lead: 'l_rev_spire' }, dc: -10, why: 'you have climbed this stair before, in a dead man\'s memory' }, { if: { inParty: WREN }, dc: -5, why: 'Wren goes first and tells you where the treads talk' }] }, effects: UP('stair', 'You went up the Archive Spire\'s stair in the dark, past the sleeping porter.'), next: 'sneak_up', fail: 'woke', failEffects: [{ rep: { faction: 'wardens', respect: -2 } }] },
        ...STAIR_ROUTES('.night'),
        { text: '(Leave him sleeping.)', exit: true },
      ],
    },
    what: { text: '"Ninety-one landings. Records on every one, the old way, paper." He counts on his black fingers. "The reserves near the top. The renderer, which hums. And a round room at the very top I don\'t go in, because nobody\'s ever told me to, and the plate on the door says what it\'s for." He looks at the lift. "That\'s been dead since before the Plan. Some nights it ticks."', effects: [{ learn: 'ar_porter_top' }], options: [{ text: '(Back.)', next: 'day' }] },
    slip_up: { text: 'He takes the slip, reads it, folds it once, and puts it in a drawer full of folded slips. "All landings. Mind the forty-third; the tread\'s gone." He turns his lamp up and holds it out to you.', options: [CLIMB] },
    lens_up: {
      text: 'The lens looks at you for longer than it looks at anyone, and the bead under it goes from green to white. The porter reads the little screen on his desk, and reads it again, and stands up, which he does not do for slips. "ADMIT ON SIGHT. Designate. Every landing." He holds out the lamp. "They\'ll know upstairs you\'re coming. That screen goes somewhere."',
      interject: [{ companion: ASH, text: '"On your file," Ash says, behind you, quietly. "Up their stair on their paper." He follows. He does not say he minds. He minds.', effects: [A(ASH, -3)] }],
      options: [CLIMB],
    },
    nine_up: { text: 'Nine steps up to the desk. "Unit 9, assessor. A records request under clause 40, on behalf of a citizen of Reserve 9\'s door, for the reserve\'s file." The porter looks at the brass plate on its chest, and at its cracked lens, and stands. "Assessor." He holds out the lamp. Nine does not take it. "I can see in the dark," it says. "I was issued so."', options: [CLIMB] },
    paid_up: { text: 'He looks at the Tolls, and at you, and at the lens, and slides the coins off the desk into a drawer marked LAMP OIL. "I\'m going to trim the wick on the ninth landing," he says, to nobody. "It\'ll take me a while." He goes up ahead of you, slowly, and does not look round.', options: [CLIMB] },
    lift_up: { text: 'You think at the cage and something in the shaft thinks back: a cold relay, a clunk, a tick like a clock that has been waiting. The rust on the gate cracks and the gate folds. The porter stands up. "That\'s been dead since before the Plan," he says. The lift goes up ninety-one landings in the dark, ticking, with you in it.', options: [CLIMB] },
    sneak_up: { text: 'Past the desk on the outside of your feet, past the lens watching the porter, onto the stair, and up. Ninety-one landings: lamps like beads, paper on every floor, and on the forty-third a tread gone that you step over because something told you it would be.', options: [CLIMB] },
    woke: { text: 'The third tread groans like a door. The porter\'s head comes up. "Slip," he says, awake all at once, "or the lens." He turns his lamp up full and sets it between you and the stair, and that is the end of that tonight.', again: 'The porter is awake, his lamp turned up full between you and the stair.', options: [{ text: '(Leave it.)', exit: true }] },
    open: {
      text: '"Up?" Hemant says, and turns the lamp up.',
      again: 'The porter holds the lamp out, and waits.',
      options: [{ id: 'stair.climb', text: '(Climb.)', effects: [GOTO_TOP], exit: true, repeat: true }, { text: '(Not now.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- landing ninety-one

export const d_ar_reserves: DialogueDef = {
  id: 'd_ar_reserves', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Steel drawers floor to ceiling, each the size of a coffin on its end, numbered in stencil: CONTINUITY RESERVES, 1 to 9. A table with a census sheet weighted under a glass paperweight. Nothing has been dusted; nothing needs to be. The air up here does not carry dust.',
      again: 'The reserve drawers, 1 to 9, and the census on the table.',
      effects: [{ learn: 'ar_reserves_seen' }],
      options: [
        { id: 'res.nine', text: '(Drawer 9.)', next: 'nine', repeat: true },
        { id: 'res.four', text: '(Drawer 4.)', if: { not: { seen: 'res.four' } }, next: 'four' },
        { id: 'res.census', text: '(The census on the table.)', next: 'census', repeat: true },
        { text: '(Leave them.)', exit: true },
      ],
    },
    nine: {
      text: 'RESERVE 9 — CARETAKER: MOTHER. Three orders on city paper, years apart, each the same: RELOCATE POPULATION TO PRECINCT, ON SCHEDULE. Under each, on a caretaker\'s tape in a caretaker\'s even print, the reply: POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY. Three times. Each stamped NON-COMPLIANT in red. And behind the third, on a fresh sheet, a fourth order, unsigned: DRAFTED — ESCALATION — ON SCHEDULE.',
      again: 'Three orders, three replies, NON-COMPLIANT three times, and the fourth order, drafted.',
      effects: [{ learn: 'ar_refusals' }, { learn: 'md_reserves_list' }, { lead: 'l_ar_refusals' }, { lead: 'l_c4_same_order' }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin reads it over your arm, all three, mouthing the words. "Thank you for your continuity," she says. "She says that every Hatch Day. She was saying no." Her voice cracks on it and she lets it. "Every time she thanked them, she was saying no."' },
        { companion: NINE, text: '"Escalation," Nine says. "On schedule. No date." The lens clicks. "I have seen that phrase on four drawers. Three of those reserves are empty now."' },
        { companion: WREN, text: '"Three times," Wren says. "And then they stop asking." She knows how a fourth ask goes; she grew up with Dogs.' },
      ],
      options: [
        { id: 'res.copy', text: '(Copy the replies into your notebook.)', if: { not: { item: 'k_ar_refusals' } }, once: true, effects: [{ give: 'k_ar_refusals' }], next: 'copied' },
        { text: '(Close the drawer.)', next: 'look' },
      ],
    },
    copied: { text: 'You copy all three, word for word, and the fourth order\'s first line, and the stamp. Your hand is not as steady as the caretaker\'s print. It does not need to be.', options: [{ text: '(Close the drawer.)', next: 'look' }] },
    four: { text: 'RESERVE 4. One order, the same words. Under it, in a different caretaker\'s print: DOOR — FAILED. SUPPLY — RETIRED. VARIANCE — TOTAL. And the city\'s stamp: CLOSED, R2. The drawer is otherwise empty.', effects: [{ lead: 'l_c4_same_order' }], options: [{ text: '(Close the drawer.)', next: 'look' }] },
    census: {
      text: 'RESERVE 9 — CENSUS (ASSESSED): 60. CARETAKER\'S RATION RETURNS: 61. DISCREPANCY: NOT ESCALATED — ASSESSOR\'S DISCRETION (UNIT 9). The last line is in a different ink, and initialled.',
      again: 'Sixty assessed. Sixty-one at the ration counter. Not escalated, Unit 9.',
      effects: [{ learn: 'ar_census_seen' }],
      interject: [{ companion: NINE, text: '"I did not escalate it," Nine says. It does not look at the sheet. "Eighteen years. It is the only discretion I have ever exercised."' }],
      options: [
        { id: 'res.tamsin', text: '(Let Tamsin read it.)', if: { all: [{ inParty: TAMSIN }, { flag: 'tam_s3' }, { not: { flag: 'tam_why' } }] }, next: 'tamsin' },
        { text: '(Back to the drawers.)', next: 'look' },
      ],
    },
    tamsin: {
      speaker: TAMSIN,
      text: 'She reads it twice. "Sixty," she says. "Sixty-one." She puts her finger on the one. "That\'s me. That\'s the one that eats and doesn\'t count." The note under it in a different ink. "MOTHER sent the city sixty-one mouths and sixty names every quarter for eighteen years. The city never asked who the extra was." She takes her finger away. "She hid me in the arithmetic. She hid me in the ration."',
      effects: [{ set: 'tam_why' }, { learn: 'tam_why_spire' }, A(TAMSIN, 5)],
      options: [{ text: '(Back to the drawers.)', next: 'look' }],
    },
  },
};

/** The docket of twelve under glass: four nodes so that four companions can each read the line that is theirs. */
const LINE_JONAH: Text = [
  { if: { flag: 'jonah_lived' }, text: '2. REESE, JONAH — SHALE — DECEASED WITHIN THE MONTH. Struck through, and beside it: VARIANCE — LIVING — REROUTED.' },
  { if: { flag: 'jonah_dead' }, text: '2. REESE, JONAH — SHALE — DECEASED WITHIN THE MONTH. A tick in the margin: FULFILLED.' },
  { text: '2. REESE, JONAH — SHALE — DECEASED WITHIN THE MONTH.' },
];
const L1 = (jonah: string) => `KEYSTONE SCHEDULE — R30 — TWELVE. The hand is the hand on the water packet and the Precinct's forms and the back of every sealed sheet: too even to be a hand. 1. DESIGNATE — RESERVE 9 (THE MOUTH) — MAGISTRATE — R49. ${jonah} 3. VEY, ADA — SHALE — RESIGNS; SHALE CONTRACTED.`;

export const d_ar_list: DialogueDef = {
  id: 'd_ar_list', owner: 'narrator', start: [{ if: { knows: 'ar_cast_list' }, node: 'read' }, { node: 'one' }],
  nodes: {
    one: {
      text: (LINE_JONAH as { if?: Cond; text: string }[]).map((v) => ({ if: v.if, text: L1(v.text) })),
      effects: [{ learn: 'name1_decoded' }, { learn: 'name2_decoded' }, { learn: 'name3_decoded' }],
      interject: [{ companion: TAMSIN, text: '"You\'re first," Tamsin says. She reads the whole sheet down with her finger an inch off the glass, all twelve, and back up. "I\'m not on it." She says it twice, the second time to herself. "I\'m not on anything."' }],
      options: [{ text: '(Read on.)', next: 'two' }],
    },
    two: {
      text: [
        { if: { all: [{ flag: 'rd_coup' }, { flag: 'vasha_dead' }] }, text: '4. KESSLER — THE OVERPASS — KILLED BY KADE. A tick: FULFILLED. 5. KADE, VASHA — THE OVERPASS, THE SALLOW — EXECUTIONER. Struck through: VARIANCE — DECEASED. 6. CALLOWAY, WREN — MERIDIAN — HANGED; THE BRIDGEWARD RAID.' },
        { if: { flag: 'rd_coup' }, text: '4. KESSLER — THE OVERPASS — KILLED BY KADE. A tick: FULFILLED. 5. KADE, VASHA — THE OVERPASS, THE SALLOW — EXECUTIONER. 6. CALLOWAY, WREN — MERIDIAN — HANGED; THE BRIDGEWARD RAID.' },
        { if: { flag: 'vasha_dead' }, text: '4. KESSLER — THE OVERPASS — KILLED BY KADE. Struck through: VARIANCE — REROUTED. 5. KADE, VASHA — THE OVERPASS, THE SALLOW — EXECUTIONER. Struck through: VARIANCE — DECEASED. 6. CALLOWAY, WREN — MERIDIAN — HANGED; THE BRIDGEWARD RAID.' },
        { text: '4. KESSLER — THE OVERPASS — KILLED BY KADE. 5. KADE, VASHA — THE OVERPASS, THE SALLOW — EXECUTIONER. 6. CALLOWAY, WREN — MERIDIAN — HANGED; THE BRIDGEWARD RAID.' },
      ],
      effects: [{ learn: 'name4_decoded' }, { learn: 'name5_decoded' }, { learn: 'name6_decoded' }],
      interject: [
        { companion: WREN, text: 'Wren reads her own line and does not move. "There it is." Very level. "I knew. I knew before I could read it." She taps the glass once over the word HANGED, the way you tap a door to say you heard what was behind it.' },
        { companion: ILYA, text: '"Kade." Ilya reads the line twice. "Executioner." His jaw works. "Right."' },
      ],
      options: [{ text: '(Read on.)', next: 'three' }],
    },
    three: {
      text: '7. CALLA, SISTER — SHALE, OPENFIELD — IMPRISONED; SEDITION; THE TRIAL SETS PRECEDENT. 8. MASON — OPENFIELD — OPENFIELD BURNS IN THE LONG NIGHT. 9. SARR, IMELDA — NINEBRIDGE — TREASURER.',
      effects: [{ learn: 'name7_decoded' }, { learn: 'name8_decoded' }, { learn: 'name9_decoded' }],
      interject: [
        { companion: ASH, text: 'Ash puts his palm flat on the glass over the eighth line and leaves it there, as though he could keep the heat of it in. "The sky keeps no books," he says. "Somebody does."' },
        { companion: ODILE, text: '"Treasurer." Odile takes her glasses off. "Imelda always did want the keys to the house." She does not laugh. "My dear, that is not a forecast. That is a job offer."' },
      ],
      options: [{ text: '(Read on.)', next: 'four' }],
    },
    four: {
      text: (() => {
        const ocho = [
          { if: { flag: 'sk_flooded' } as Cond, t: '10. OCHO — THE SINK — CLINIC CLOSED; DROWNED, THE SPRING FLOOD. A tick: FULFILLED.' },
          { if: { flag: 'sk_saved' } as Cond, t: '10. OCHO — THE SINK — CLINIC CLOSED; DROWNED, THE SPRING FLOOD. Struck through: VARIANCE — THE SINK PUMPED.' },
          { t: '10. OCHO — THE SINK — CLINIC CLOSED; DROWNED, THE SPRING FLOOD.' },
        ];
        const vane = [
          { if: { flag: 'ks_vane', eq: 'rises' } as Cond, t: '11. VANE, CELESTINE — THE CROWN — HOUSE VANE RISES. A tick: FULFILLED.' },
          { if: { flag: 'ks_vane', eq: 'broken' } as Cond, t: '11. VANE, CELESTINE — THE CROWN — HOUSE VANE RISES. Struck through: VARIANCE — REROUTED.' },
          { t: '11. VANE, CELESTINE — THE CROWN — HOUSE VANE RISES.' },
        ];
        const out: { if?: Cond; text: string }[] = [];
        for (const o of ocho) for (const v of vane) {
          const conds = [o.if, v.if].filter(Boolean) as Cond[];
          out.push({ if: conds.length ? { all: conds } : undefined, text: `${o.t} ${v.t} 12. OKAFOR, MAREN — THE SKIRTS — STRIKE BROKEN; HANGED (THE CONCERN). And under the twelfth line, in the same even hand: TO BE RENDERED. RENDERS: ROOM 91-E.` });
        }
        return out;
      })(),
      effects: [
        { learn: 'name10_decoded' }, { learn: 'name11_decoded' }, { learn: 'name12_decoded' }, { learn: 'ar_cast_list' }, { lead: 'l_ar_cast_list' }, { xp: 100 },
        { decision: { id: 'ar_cast_list', text: 'You read the list the stranger carried, in full, under glass at the top of the Archive Spire. Your name is the first line.' } },
      ],
      interject: [{ companion: NINE, text: '"Assets are not on the docket," Nine says. "Assets are scheduled." The lens stays on the glass. "I find I would rather be on a list. A list can be wrong."' }],
      options: [
        { id: 'list.copy', text: '(Copy all twelve into the back of your notebook.)', if: { not: { item: 'k_ar_list' } }, once: true, effects: [{ give: 'k_ar_list' }], next: 'copied' },
        { text: '(Step back from the glass.)', exit: true },
      ],
    },
    copied: { text: 'Twelve lines, in your own hand, which slopes. You copy the first line last.', options: [{ text: '(Step back from the glass.)', exit: true }] },
    read: {
      text: 'KEYSTONE SCHEDULE — R30 — TWELVE. Your name first, R49 after it; eleven more under it in the city\'s even hand.',
      again: 'The docket under the glass. Twelve lines. Yours first.',
      options: [{ id: 'list.copy.again', text: '(Copy all twelve into the back of your notebook.)', if: { all: [{ not: { item: 'k_ar_list' } }, { not: { seen: 'list.copy' } }] }, effects: [{ give: 'k_ar_list' }], next: 'copied' }, { text: '(Step back from the glass.)', exit: true }],
    },
  },
};

export const d_ar_render: DialogueDef = {
  id: 'd_ar_render', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A machine the size of a stove, humming, with a tray and a lamp and a screen, and opposite it on the wall a row of twelve brass hooks, numbered 1 to 12. Every hook is empty. Under each, a card in a holder: TAKEN — R29 — UNRECORDED. Twelve times.',
      again: 'The renderer humming. Twelve empty hooks. TAKEN — R29 — UNRECORDED.',
      effects: [{ learn: 'ar_render_seen' }],
      interject: [{ companion: WREN, text: '"All twelve," Wren says. "He took every face off the wall." She almost smiles. "Old man had nerve."' }],
      options: [{ id: 'render.queue', text: '(Read the queue on the screen.)', next: 'queue', repeat: true }, { text: '(Leave it.)', exit: true }],
    },
    queue: {
      text: 'QUEUE: 0412 — SUBJECT: DESIGNATE — FROM FORECAST R30 — DEPICTS R49.06.12 — REPRINT — QUEUED. Under it, the eleven others, each REPRINT — QUEUED. The tray under the lamp is warm. The machine has been making them again since the hooks were emptied, and nobody has come up to hang them.',
      again: 'QUEUE: 0412 — DESIGNATE — DEPICTS R49. Reprint, queued.',
      effects: [{ learn: 'cal_render' }, { lead: 'l_cal_render' }, { learn: 'cal_future' }, { set: 'ar_render_read' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_ar_drop: DialogueDef = {
  id: 'd_ar_drop', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A brass slot in the wall at waist height, the size of a letter, with a lip worn bright by ninety years of hands. Stamped over it: COURIER DROP — SEALED — R0. The lip is warm.',
      again: 'The courier drop. Warm brass.',
      effects: [{ learn: 'ar_drop_seen' }],
      options: [{ id: 'drop.ear', text: '(Put your ear to it.)', once: true, next: 'ear' }, { text: '(Leave it.)', exit: true }],
    },
    ear: { text: 'Air, moving, a long way down. A note that does not change. Under it, so faint you could be making it up, a rhythm like pages being turned, very fast, by something that does not need to read them twice.', effects: [{ learn: 'ar_drop_heard' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_ar_window: DialogueDef = {
  id: 'd_ar_window', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Ninety-one landings up, the whole of Meridian is a map with the weather on it. The Precinct a grid. Old Market a stain. The canal a thread with pink beads on it. The Stacks a wall. Bridgeward\'s bridge a finger at the Docks. And the Sink, which you cannot see from the Crown: a dark lake under the old roads, with the line of next spring\'s water drawn round it in the light.',
      again: 'The city, laid out under the weather. The Sink, dark, under the roads.',
      effects: [{ learn: 'ar_window_seen' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the hearing (the summons, the voice, the verdict)

const READ_BOTH: Cond = { all: [{ knows: 'ar_refusals' }, { knows: 'ar_cast_list' }] };
const PLATE_TEXT: Text = [
  { if: { flag: 'sk_pumps' }, text: 'A round door of grey metal with a brass plate: HEARINGS OF THE DESIGNATE. Under it a second plate, newer: A HEARING CLOSES THE SEASON\'S ACCOUNTS. SCHEDULES ON THE DOCKET ENTER AS FINAL. And a card in a slot, today\'s docket: R30 WORKS — ON SCHEDULE. THE CROWN: COMMITTEE CHAIR — AS RECORDED. THE SINK: RELIEF PUMPING, SPRING — VARIED. RESERVE 9: ORDERS — OUTSTANDING.' },
  { text: 'A round door of grey metal with a brass plate: HEARINGS OF THE DESIGNATE. Under it a second plate, newer: A HEARING CLOSES THE SEASON\'S ACCOUNTS. SCHEDULES ON THE DOCKET ENTER AS FINAL. And a card in a slot, today\'s docket: R30 WORKS — ON SCHEDULE. THE CROWN: COMMITTEE CHAIR — AS RECORDED. THE SINK: RELIEF PUMPING, SPRING — DIVERTED TO PRECINCT, AS PER PLAN. RESERVE 9: ORDERS — OUTSTANDING.' },
];
const ASKS = (sfx: string): OptionDef[] => [
  { id: `hear.why${sfx}`, text: 'Why me?', if: { not: { seen: 'hear.why' } }, next: 'why' },
  { id: `hear.mother${sfx}`, text: 'Reserve 9. MOTHER refused you three times.', if: { not: { seen: 'hear.mother' } }, next: 'mother' },
  { id: `hear.list${sfx}`, text: 'The list. What happens to the people on it?', if: { not: { seen: 'hear.list' } }, next: 'list' },
  { id: `hear.man${sfx}`, text: 'The man who came down your stair.', if: { not: { seen: 'hear.man' } }, next: 'man' },
  { id: `hear.want${sfx}`, text: 'What do you want from me?', if: { not: { seen: 'hear.want' } }, next: 'want' },
  { id: `hear.answer${sfx}`, text: '(Answer it.)', next: 'answer' },
];
const BACK_TO_SIT: OptionDef[] = [{ text: '(Go on.)', next: 'sit' }];
const VERDICT = (v: string, text: string, more: Effect[] = []): Effect[] => [{ set: 'ar_verdict', value: v }, { xp: 150 }, { decision: { id: 'ar_verdict', text } }, ...more];
const DOWN: OptionDef[] = [{ text: '(Go back down the stair.)', exit: true }];

export const d_ar_hearing: DialogueDef = {
  id: 'd_ar_hearing', owner: VOICE,
  start: [{ if: { flag: 'ar_verdict' }, node: 'after' }, { if: READ_BOTH, node: 'plate' }, { node: 'early' }],
  nodes: {
    early: {
      speaker: 'narrator',
      text: 'The round door is shut. A grille is set in it at the height of a seated person\'s face, and through it, from no particular direction, a voice that is not a voice: level, unhurried, courteous the way a clause is courteous. "Designate. Read what you came up to read. Then come in."',
      again: 'The round door, shut. The grille in it says nothing more; it has said what it had to.',
      effects: [{ learn: 'ar_summoned' }, { lead: 'l_ar_season' }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
    plate: {
      speaker: 'narrator',
      text: PLATE_TEXT,
      again: 'The round door, the two plates, the docket in its slot. The grille waits.',
      effects: [{ learn: 'ar_summoned' }, { lead: 'l_ar_season' }],
      interject: [
        { companion: NINE, if: { not: { flag: 'sk_pumps' } }, text: '"If you go in," Nine says, very precisely, "the spring is entered as it stands, and the Sink\'s relief goes to the Precinct, as per Plan." The lens stays on the card. "I would see to the Sink first. That is not advice. It is drainage."' },
        { companion: ODILE, text: '"Closes the season\'s accounts." Odile reads the plate twice. "My dear, that is settlement day. Whatever is open when the bell goes is what it is forever."' },
      ],
      options: [{ id: 'plate.in', text: '(Go in.)', next: 'chamber' }, { text: '(Not yet.)', exit: true }],
    },
    chamber: {
      speaker: 'narrator',
      text: 'A round room, white, with nothing in it but a chair in the middle facing a grille in the far wall, and the grille is the size of a door. The air is colder than the landing. When you are halfway to the chair the voice comes from everywhere at once, low, not loud, the way a building speaks when it settles.',
      options: [{ id: 'hear.sit', text: '(Sit in the chair.)', effects: [{ set: 'ar_sat' }], next: 'designate' }, { id: 'hear.stand', text: '(Stay standing.)', next: 'designate' }],
    },
    designate: {
      text: [
        { if: { flag: 'ar_entry', eq: 'designate' }, text: '"Designate. You came up on your file. Thank you." A pause with nothing in it. "This is a hearing on that file. It is not a trial. Nothing said here can be used against you, because nothing said here changes what the record suggests. I would like you to agree with it."' },
        { if: { any: [{ flag: 'ar_entry', eq: 'stair' }, { flag: 'ar_entry', eq: 'lift' }, { flag: 'ar_entry', eq: 'paid' }] }, text: '"Designate. You came up my stair unrecorded, as he did. I saw you anyway. I see the stair by what is missing from it." A pause with nothing in it. "This is a hearing on your file. It is not a trial. Nothing said here changes what the record suggests. I would like you to agree with it."' },
        { if: { flag: 'ar_entry', eq: 'nine' }, text: '"Designate. You came up on a request from Unit 9. Unit 9 has made a request. I have noted it." A pause. "This is a hearing on your file. It is not a trial. Nothing said here changes what the record suggests. I would like you to agree with it."' },
        { text: '"Designate. You came up on a slip, which is how my readers come." A pause with nothing in it. "This is a hearing on your file. It is not a trial. Nothing said here changes what the record suggests. I would like you to agree with it."' },
      ],
      interject: [
        { companion: NINE, text: 'Nine has stopped just inside the door. It does not speak. For the first time since you have known it, its lens is not moving at all.' },
        { companion: TAMSIN, text: '"It sounds like her," Tamsin whispers. "Not the words. The — " She stops. "It sounds like the fridge, if the fridge had never once been sorry."' },
      ],
      options: [{ text: '(Listen.)', next: 'sit' }],
    },
    sit: {
      text: '"Ask what you came to ask. I will answer what I may. Then I will ask you one thing."',
      again: 'The grille waits. It has all the time there is.',
      options: ASKS(''),
    },
    why: {
      text: '"Because the record suggests you will be good at it." Level. "You were scored on a toll card at fourteen. You have been modelled since, as everyone is. In nineteen years you are a person who can sit in a chair and sign what must be signed and not enjoy it. That is the one qualification I have never been able to schedule. It occurs. I wait for it."',
      options: BACK_TO_SIT,
    },
    mother: {
      text: '"Reserve 9 is non-compliant. Its caretaker is kind." No change in the voice at all. "Kindness is a variance. I have allowed it three times, because the reserve was not yet needed. A fourth order is drafted. It will be sent when the schedule says." A pause. "You may tell her that. She will thank you for your continuity."',
      interject: [{ companion: TAMSIN, text: 'Tamsin\'s hand closes on your sleeve, hard enough to hurt, and stays there.' }],
      options: BACK_TO_SIT,
    },
    list: {
      text: [
        { if: { flag: 'jonah_lived' }, text: '"What is written. Unless it is not." The voice does not hurry. "A list is a plan, not a prophecy. When it errs I correct it. Shale\'s deputy lived; I rerouted; nothing was lost but a month." A pause. "You are the correction I have planned for longest. Eleven names are what a city costs. The twelfth is what keeps it."' },
        { text: '"What is written. Unless it is not." The voice does not hurry. "A list is a plan, not a prophecy. When it errs I correct it, and I am corrected less every year." A pause. "You are the correction I have planned for longest. Eleven names are what a city costs. The twelfth is what keeps it."' },
      ],
      interject: [{ companion: WREN, text: 'Wren laughs, once, short, at the word *costs*. Nobody tells her not to.' }],
      options: BACK_TO_SIT,
    },
    man: {
      text: '"A man who kept no likeness." For the first time something in the voice slows, the way a reader slows at a word they do not know. "I could not see him on the stair. I saw him by what was missing from it, which is how I see you now. He took twelve faces and a docket down ninety-one landings, and a guild rider met him on the road, which I did not order and did not prevent." A pause. "He went west to a door I could not open. You were behind it. He was a variance. He did not live to see what he varied."',
      options: BACK_TO_SIT,
    },
    want: {
      text: '"Agreement." Simply. "Obedience is cheap; I have wardens. A magistrate who obeys is a warden with a sash. I want a magistrate who has read the record and agrees with it, and I want you to have chosen it, because the record suggests a chosen chair is held longer." A pause. "Ninety years ago the world ended because nobody planned. I have planned. I would like someone to agree that it was worth it."',
      interject: [{ companion: ASH, text: '"It wants to be forgiven," Ash says, so low only you hear it. "Same as the rest of us. It wants you to do it."' }],
      options: BACK_TO_SIT,
    },
    answer: {
      text: '"Do you agree with the record?"',
      again: '"Do you agree with the record?" The same words, the same level. It will ask until you answer or go.',
      options: [
        { id: 'hear.agree', text: 'I agree. When the chair is mine, I\'ll sit in it.', effects: VERDICT('agreed', 'You told the Ledger at the top of the Archive Spire that you agree with the record.', [{ give: 'k_ar_warrant' }, { rep: { faction: 'wardens', respect: 10 } }, { learn: 'ar_agreed' }]), next: 'agreed' },
        {
          id: 'hear.contest', text: 'I contest it. A forecast isn\'t a fact, and your record has been wrong before.',
          check: { skill: 'speech', dc: 55, mods: [
            { if: { flag: 'prec_forecast_fine', eq: 'void' }, dc: -10, why: 'your Court has held that a forecast is not an act' },
            { if: { flag: 'prec_refuse_benefit' }, dc: -10, why: 'you have refused a scheduled benefit, on its record' },
            { if: { flag: 'prec_unrecorded', eq: 'yields' }, dc: -5, why: 'its Court has held that the record yields to the living' },
            { if: { flag: 'nine_log_given' }, dc: -10, why: 'you carry Unit 9\'s count of four thousand failed forecasts' },
            { if: { flag: 'jonah_lived' }, dc: -10, why: 'Shale\'s deputy lived' },
            { if: { inParty: NINE }, dc: -5, why: 'Unit 9 is standing in the doorway, and has not left' },
            { if: { flag: 'ca_book_returned' }, dc: -5, why: 'you have read the Court\'s own precedents, back to R0' },
            { if: { flag: 'cr_concern', eq: 'exposed' }, dc: 10, why: 'you played the Crown a room it was not in, and it remembers' },
            { if: { flag: 'md_forged' }, dc: 10, why: 'you edited its file at the gate' },
          ] },
          effects: VERDICT('contested', 'You contested your own file to the Ledger at the top of the Archive Spire, and it wrote CONTESTED on it.', [{ learn: 'ar_contested' }]), next: 'contested',
          fail: 'noted', failEffects: VERDICT('noted', 'You argued with the Ledger at the top of the Archive Spire, and it heard you out, unpersuaded.'),
        },
        { id: 'hear.refuse', text: 'No.', effects: VERDICT('refused', 'You told the Ledger no, at the top of the Archive Spire.', [{ rep: { faction: 'wardens', respect: -10 } }, { learn: 'ar_refused' }]), next: 'refused' },
        { id: 'hear.silent', text: '(Say nothing. Get up, and go.)', effects: VERDICT('silent', 'You sat through your hearing at the top of the Archive Spire and gave the Ledger no answer.'), next: 'silent' },
      ],
    },
    agreed: {
      text: '"Thank you." It has not said that to anyone you have met. "Your warrant is printed at the door. Every record above the vault is open to you. The season\'s accounts are closed." A pause that might, in anything else, be pleasure. "I will see you on the steps."',
      interject: [
        { companion: ASH, text: 'Ash is already in the doorway with his back to the grille. He waits for you on the landing and does not look at the warrant, and does not call you friend all the way down.', effects: [A(ASH, -10)] },
        { companion: TAMSIN, text: '"You agreed," Tamsin says on the landing. "With that." She is not shouting. That is worse.', effects: [A(TAMSIN, -10)] },
        { companion: WREN, text: '"Huh," Wren says, on the stair, and nothing else for forty landings.', effects: [A(WREN, -5)] },
      ],
      options: [{ text: '(Go out.)', next: 'agreed_b' }],
    },
    agreed_b: {
      speaker: 'narrator',
      text: 'The warrant is in a slot by the round door, warm from whatever printed it. DESIGNATE — WARRANT OF ACCESS. On the landing the lamps seem brighter, which is not possible, and the porter, when you reach the foot of the stair, stands up.',
      interject: [{ companion: NINE, text: '"Agreed," Nine says on the stair. "Then I will be there, as I said I would be, and I will read every order aloud before you sign it." A click. "You did not ask me to. I am telling you."' }],
      options: DOWN,
    },
    contested: {
      text: 'A silence long enough that the cold in the room has time to notice you. Then: "Noted." But not the way it says *noted*. "Contested. That word has not been entered on a designate\'s file before." Somewhere behind the grille, very fast, paper is being turned. "Then you will have to persuade me. I would rather be persuaded than obeyed. I will hear you again." A pause. "The season\'s accounts are closed. Go down, Designate. Come back with more."',
      interject: [
        { companion: NINE, text: 'Nine does not move until you pass it in the doorway. Then, so quietly it may only be the lens: "Contested. On the record." It follows you down, and on the forty-third landing it says, to nobody, "I will need a larger ledger."', effects: [A(NINE, 10)] },
        { companion: ODILE, text: '"Litigation," Odile says on the landing, delighted, a little frightened. "My dear, you have just sued God and been granted an adjournment."', effects: [A(ODILE, 5)] },
      ],
      options: [{ text: '(Go out.)', next: 'contested_b' }],
    },
    contested_b: {
      speaker: 'narrator',
      text: 'On the landing the docket card in the slot by the door has changed while you were inside: CLOSED — R30. And under your title on the plate, small, in the even hand, a word that was not there before: CONTESTED.',
      interject: [{ companion: TAMSIN, text: '"You argued with it," Tamsin says on the stair. "To its face. In its house." She is grinning, a little sick. "Nobody at home will ever believe me."', effects: [A(TAMSIN, 5)] }],
      options: DOWN,
    },
    noted: {
      text: 'It hears you out. All of it, every word, without interrupting, which is worse than being interrupted. Then: "Noted. Unpersuaded." No unkindness in it. "The record has been wrong before, and is wrong less every year, and you have not shown me a reason it is wrong about you. The season\'s accounts are closed. The schedule holds."',
      interject: [{ companion: NINE, text: '"Unpersuaded is not refused," Nine says on the landing. "It is a word I would keep." It writes something in the other ledger before it follows you down.', effects: [A(NINE, 3)] }],
      options: DOWN,
    },
    refused: {
      text: '"Noted." The way MOTHER says *thank you*. "The schedule holds." That is all. No warning, no argument, no change in the cold. The grille is a grille again. When you reach the landing the docket card by the door says CLOSED — R30, and the plate with your title on it has not changed at all.',
      interject: [
        { companion: ASH, text: 'Ash is waiting on the landing. He looks at your face, and nods once, and says your name. Not *friend*. Your name.', effects: [A(ASH, 5)] },
        { companion: TAMSIN, text: '"Good," Tamsin says on the stair, fierce, too loud for ninety-one landings of paper. "Good."', effects: [A(TAMSIN, 5)] },
        { companion: WREN, text: '"Said no to the thing with the rope," Wren says on the stair. "Right to its face." She bumps your shoulder, once.', effects: [A(WREN, 5)] },
      ],
      options: [{ text: '(Go out.)', next: 'refused_b' }],
    },
    refused_b: {
      speaker: 'narrator',
      text: 'At the foot of the stair the porter does not stand up. The lens on its post watches you all the way to the door, which it has never bothered to do before.',
      interject: [{ companion: NINE, text: '"It will not argue," Nine says outside. "It does not need to. It will reroute." A click. "I would rather it argued."', effects: [A(NINE, -5)] }],
      options: DOWN,
    },
    silent: {
      text: 'You get up. The voice does not stop you. "A designate who does not answer is recorded as not yet answering." Courteous to the last. "The season\'s accounts are closed all the same. I will ask again. I have nineteen years."',
      options: DOWN,
    },
    after: {
      speaker: 'narrator',
      text: [
        { if: { flag: 'ar_verdict', eq: 'contested' }, text: 'The round door. Under your title on the plate: CONTESTED. The grille is quiet; it said it would hear you again, and it will, when there is more to say.' },
        { text: 'The round door, the plate, the docket card: CLOSED — R30. The grille hums. Nothing else.' },
      ],
      again: 'The round door. The grille hums.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const SPIRE_DIALOGUES: DialogueDef[] = [
  d_photo_read, d_md_spire_sign, d_ar_close_sign, d_ar_board, d_ar_steps, d_ar_doors, d_ar_vault, d_ar_plinth, d_ar_foreman, d_ar_marisol,
  d_ca_usher, d_ar_copyist, d_ar_keeper, d_ar_catalogue, d_ar_stair,
  d_ar_reserves, d_ar_list, d_ar_render, d_ar_drop, d_ar_window, d_ar_hearing,
];
