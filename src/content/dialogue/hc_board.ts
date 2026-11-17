import type { DialogueDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { ASH, ILYA, K, KES, KES_IN, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './hs_skirts';
import { GOTO, I, KES_JOINED, LEASH_OPEN, LINH_OPEN, N, NILS_ON_WARD, O, S, T, W, back, sellKey } from './hc_halcyon';

/**
 * Halcyon's Board's floor and its works (B4b). The Board's floor: Director Soto, the Chair at the ball and in his room, the
 * Board's old and young factions, the gallery, the boardroom, the console that can wake the Ashlands: beat 16's offer and
 * the Long-Lived. The works under the gardens: the chip line, the grid core and its keeper: the Leash. Story notes:
 * story/STORY_PLAN_SECRET.md, Build notes — B4 (B4b).
 */

const CHAIR = 'npc_hc_01';
const SOTO = 'npc_hc_02';
const LAWAL = 'npc_hc_12';
const ANSWERED: Cond = { flag: 'hc_offer' };
const TO_ANSWER: Cond = { all: [{ flag: 'hc_board_wants' }, { not: ANSWERED }] };
const KNOWS_BOARD: Cond = { all: [{ knows: 'hc_ages' }, { knows: 'hc_chair_drift' }] };
const LL_OPEN: Cond = { not: { flag: 'hc_longlived' } };
const RETIRED: Cond = { flag: 'hc_chair', eq: 'retired' };
const KES_LINEAGE: Cond = { all: [KES_IN, { flag: 'kes_lineage', eq: 'speak' }] };

// ---------------------------------------------------------------- the Board's answer (beat 16's end)

const ACCEPT: Effect[] = [
  { set: 'hc_offer', value: 'accepted' }, { give: 'k_hc_seat' }, { rep: { faction: 'concern', respect: 20 } },
  K(-15), N(-10), S(-10), W(-10), T(-10), I(-5), O(-3), { xp: 300 },
  { decision: { id: 'hc_offer', text: 'You accepted the Board\'s seat: on the day you take the sash, you will sign the city\'s forecasting core over to the Concern.' } },
  { news: { tag: 'hc_offer_accepted', text: 'the designate took a seat at the Concern\'s table, they say, on Halcyon\'s hill', valence: -3, size: 7, at: 'skirts' } },
];
const REFUSE: Effect[] = [
  { set: 'hc_offer', value: 'refused' }, { rep: { faction: 'concern', respect: -15 } }, K(5), N(3), S(5), W(3), { xp: 300 },
  { decision: { id: 'hc_offer', text: 'You refused the Board\'s offer: no seat, no signature, no sale of the city\'s forecasting core.' } },
  { news: { tag: 'hc_offer_refused', text: 'the designate went up to Halcyon and said no to the Board', valence: 4, size: 7, at: 'skirts' } },
];
const FEIGN: Effect[] = [
  { set: 'hc_offer', value: 'feigned' }, { give: 'k_hc_seat' }, { rep: { faction: 'concern', respect: 10 } }, O(3), N(-3), { xp: 300 },
  { decision: { id: 'hc_offer', text: 'You told the Board yes and meant no. It gave you a seat in waiting.' } },
];
const FEIGN_CHECK = { skill: 'speech' as const, dc: 45, mods: [
  { if: { knows: 'hc_house_heard' }, dc: 10, why: 'the house heard Kes; it is listening for a lie now' },
  { if: { flag: 'cr_concern', eq: 'kept' }, dc: -10, why: 'you kept the Concern\'s secret in Meridian; they want to believe you' },
  { if: { flag: 'hs_marked' }, dc: 5, why: 'you stood with the Shift' },
] };
function answers(prefix: string, next: { yes: string; no: string; feign: string; caught: string }): OptionDef[] {
  return [
    { id: `${prefix}.yes`, text: 'Yes. A seat at the table.', if: TO_ANSWER, effects: ACCEPT, next: next.yes },
    { id: `${prefix}.no`, text: 'No.', if: TO_ANSWER, effects: REFUSE, next: next.no },
    { id: `${prefix}.feign`, text: '(Say yes. Mean no.)', if: TO_ANSWER, check: FEIGN_CHECK, effects: FEIGN, next: next.feign, fail: next.caught, failEffects: REFUSE },
  ];
}

// ---------------------------------------------------------------- the Long-Lived's three ends

const EXPOSED: Effect[] = [
  { set: 'hc_longlived', value: 'exposed' }, { rep: { faction: 'concern', respect: -25 } }, K(10), N(5), S(5), T(5), W(5), { xp: 300 },
  { decision: { id: 'hc_longlived', text: 'At the Board\'s ball you told Halcyon what its Board is, how old, and what it is renewed with.' } },
  { news: { tag: 'hc_board_exposed', text: 'the designate stood up at Halcyon\'s ball and told the hill that its Board is the Halverson Board from before the Burn, kept alive on the Skirts\' debtors', valence: 6, size: 9, at: 'skirts' } },
];
const TO_SOTO: Effect[] = [
  { set: 'hc_longlived', value: 'soto' }, { set: 'hc_chair', value: 'retired' }, { rep: { faction: 'concern', respect: 5 } }, O(5), N(2), K(-3), { xp: 300 },
  { decision: { id: 'hc_longlived', text: 'You gave Director Soto what she needed to retire the Chair. She chairs the Board now.' } },
  { news: { tag: 'hc_chair_retired', text: 'Halcyon\'s Board retired its Chair; Director Soto chairs', valence: 0, size: 6, at: 'skirts' } },
];
const KEPT: Effect[] = [
  { set: 'hc_longlived', value: 'kept' }, { xp: 200 },
  { decision: { id: 'hc_longlived', text: 'You kept what you know about Halcyon\'s Board, and let the Board know you keep it.' } },
];

// ---------------------------------------------------------------- Director Pilar Soto

export const d_hc_soto: DialogueDef = {
  id: 'd_hc_soto', owner: SOTO,
  start: [{ if: { flag: 'hc_longlived', eq: 'soto' }, node: 'chairs' }, { if: { flag: 'hc_soto_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An office with real wood on the walls and a window full of the gardens. The woman at the desk is forty, or looks it: dark hair tied back, a plain grey suit with a single lit seam at the collar, a face that has been tired for a long time and slept well last night. She stands, which nobody else up here has done for you. "Pilar Soto. Director. Sit; I would rather talk to you than about you." She waits until you do. "The Board wants to buy something from you. I\'m going to be honest about that, because the Chair is going to be charming about it, and you should hear it plainly from somebody first. We would rather buy than take. Purchase is kinder than war. I have counted the dead after the other kind."',
      again: 'Soto, at her desk.',
      effects: [{ set: 'hc_soto_met' }, { set: 'hc_clinic_open' }, { learn: 'hc_soto_purchase' }],
      passives: [{ if: { flag: 'hs_marked' }, label: 'the Shift', text: '"You stood with the Shift," she adds. "Good. A partner who keeps faith with people who can\'t pay is a partner who will keep faith with us. Saar disagrees. Saar is from Two-Twelve."' }],
      options: [
        { id: 'soto.what', text: 'Buy what?', next: 'what' },
        { id: 'soto.kes', text: '(There is a folder on her desk with Kes\'s name on it.)', if: { all: [KES_IN, KES_JOINED, { not: { knows: 'hc_kes_offered' } }] }, next: 'kes_offer' },
        bye,
      ],
    },
    again: {
      text: [
        { if: TO_ANSWER, text: 'Soto looks up from a page. "You heard him." Not a question. "The Board would like its answer. So would I."' },
        { text: '"Designate." Soto puts her pen down; she always puts her pen down.' },
      ],
      again: 'Soto, pen down.',
      options: [
        { id: 'soto.what2', text: 'Buy what?', if: { all: [{ not: { seen: 'soto.what' } }, { not: { flag: 'hc_board_wants' } }] }, next: 'what' },
        { id: 'soto.war', text: 'You\'ve counted the dead. When?', if: { not: { seen: 'soto.war' } }, next: 'war' },
        { id: 'soto.age', text: 'How old are you?', if: { not: { seen: 'soto.age' } }, effects: [{ learn: 'hc_ages' }], next: 'age' },
        { id: 'soto.chair', text: 'The Chair.', if: { all: [{ not: { seen: 'soto.chair' } }, { not: { flag: 'hc_chair' } }] }, next: 'chair' },
        { id: 'soto.kes2', text: '(There is a folder on her desk with Kes\'s name on it.)', if: { all: [KES_IN, KES_JOINED, { not: { knows: 'hc_kes_offered' } }] }, next: 'kes_offer' },
        ...answers('soto.answer', { yes: 'yes', no: 'no', feign: 'feigned', caught: 'caught' }),
        { id: 'soto.give', text: 'I can give you the Chair.', if: { all: [{ flag: 'hc_ball' }, KNOWS_BOARD, LL_OPEN] }, next: 'give' },
        { id: 'soto.keep', text: 'I know what the Board is. I\'m keeping it.', if: { all: [KNOWS_BOARD, LL_OPEN] }, effects: KEPT, next: 'kept' },
        { id: 'soto.linh', text: 'Sign a pass down for Linh Hoang.', if: { all: [LINH_OPEN, { not: { item: 'k_hc_linh_pass' } }, { not: { seen: 'soto.linh' } }] }, check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'hc_linh_reserve' }, dc: -5, why: 'you know what RESERVE means, and so does she' }, { if: { flag: 'hc_longlived', eq: 'soto' }, dc: -15, why: 'she owes you the Chair' }] }, effects: [{ give: 'k_hc_linh_pass' }], next: 'linh', fail: 'linh_no' },
        { id: 'soto.immy', text: 'There\'s a girl from the Saints\' tower in your school. I want her paper.', if: { all: [{ knows: 'hc_immy_told' }, { not: { flag: 'hc_immy' } }, { not: { seen: 'soto.immy' } }] }, next: 'immy' },
        ...sellKey('soto.key', '(Put the keeper\'s key on her desk.)', 'soto', 1500, { all: [{ item: 'k_hc_leash_key' }, { flag: 'hc_leash', eq: 'seized' }] }, 'key'),
        bye,
      ],
    },
    what: {
      text: '"The Chair will tell you. He enjoys it, and it is his to tell; he has been planning it since before you were born." A faint smile. "There is a ball. There is always a ball. This season it waits for you: the card on the concourse says so. Go when you\'re ready. Before you do, Dr Qadir will show you floor nine if you want to see it. The Concern has no secrets from a partner, and I would rather you were angry with us before you sign than after."',
      again: '"Go when you\'re ready."',
      options: [back()],
    },
    war: {
      text: '"I was twenty." She doesn\'t look away. "The Concern took the Teeth\'s free pits by force, the last time anyone tried force. The Clean went into Number Two with gas and the Board\'s lattices in their heads telling them where everyone was hiding. I was the clerk; I counted for the minutes. Four hundred and six. Children in the count." She lets that sit. "After that I spent eighty years learning to buy things. It\'s slower. Nobody has to be counted."',
      again: '"Four hundred and six."',
      interject: [{ companion: ILYA, text: 'Ilya looks at her a long time. "And the ones you buy," he says. "Who counts them?" Soto meets his eyes. "Dr Qadir," she says. "Every morning."' }],
      options: [back()],
    },
    age: {
      text: '"A hundred and twenty. I was born on this floor." She says it without any coyness at all. "I have been forty for eighty years. It is a good age. One knows things, and one\'s knees work." She turns the pen over. "The Chair is older. Most of the Board is older. Ask Constance Wray about the snow."',
      again: '"I have been forty for eighty years."',
      options: [back()],
    },
    chair: {
      text: '"The Chair is the Chair." The Board\'s formula, said flatly enough to sound like a warning. Then, lower: "Watch him at the ball. Watch him closely. Then come and tell me what you saw, if you saw anything." She picks the pen up again, which is how you know she has said more than she meant to.',
      again: '"Watch him closely."',
      options: [back()],
    },
    kes_offer: {
      text: 'Soto turns the folder round so Kes can read her own name on it. "Ms Oyelaran. The Concern would like to make you an offer." She lays it out in four sentences: tenure; a flat on the terraces; her two remaining years void; a citizen\'s contract for anyone she cares to name. "In return, the door you found. Kept, for us. You are the only person in ninety years who has found it from the outside. We would rather have you inside." She slides the contract across. Kes doesn\'t touch it. Then she does, and puts it in her jacket, folded small.',
      again: 'The folder, empty now.',
      effects: [{ learn: 'hc_kes_offered' }, { give: 'k_hc_kes_contract' }, { quest: 'q_hc_kes', start: true }],
      interject: [{ companion: KES, text: '"Obviously I\'m not going to," Kes says to you outside, very fast. "Obviously. Tell me I\'m not going to."' }],
      options: [back()],
    },
    yes: { text: 'Soto writes one line on the page in front of her and signs it. "Thank you." She means it, and she doesn\'t look pleased, exactly. "The Chair will be delighted. I am relieved, which is better." She hands you a letter on heavy card: SEAT IN WAITING.', again: 'SEAT IN WAITING.', options: [back()] },
    no: { text: 'Soto writes one line on the page and doesn\'t sign it. "Then we wait," she says. "We\'re very good at it." She looks at you with something like respect, and something like a price being revised. "So is the Chair. He has other ways to wait. I would rather you didn\'t find out what they are."', again: '"Then we wait."', options: [back()] },
    feigned: { text: 'Soto looks at you for exactly as long as the lens over her door does. Then she writes one line, and signs it, and hands you a letter on heavy card: SEAT IN WAITING. "Thank you," she says. If she believes you, she is very good. If she doesn\'t, she is better.', again: 'SEAT IN WAITING.', options: [back()] },
    caught: { text: '"No," Soto says gently. "You don\'t mean that." She writes one line, and doesn\'t sign it. "I\'ll put you down as a refusal. It\'s kinder than putting you down as a liar." She doesn\'t look angry. She looks like somebody who has been lied to by better.', again: '"A refusal. It\'s kinder."', options: [back()] },
    give: {
      text: '"Tell me." She doesn\'t write. When you have said what you saw, she nods slowly. "The Board will need it in writing, or in a voice it can\'t argue with. A Chair who cannot answer is reviewed. It is in the bylaws; he wrote them."',
      again: '"In writing, or in a voice it can\'t argue with."',
      options: [
        { id: 'soto.give.minutes', text: '(Give her the Board\'s own minutes: THE CHAIR\'S COURTESY, AS BEFORE.)', if: { item: 'k_hc_minutes' }, effects: [{ take: 'k_hc_minutes' }, ...TO_SOTO], next: 'given' },
        { id: 'soto.give.house', text: 'The house spoke through him. Kes made it. The hall heard.', if: { knows: 'hc_house_heard' }, effects: TO_SOTO, next: 'given' },
        { id: 'soto.give.word', text: '(Tell the Board yourself, at her side.)', if: { not: { seen: 'soto.give.word' } }, check: { skill: 'speech', dc: 50, mods: [{ if: { item: 'k_hc_portrait' }, dc: -5, why: 'the photograph of the winter meeting' }] }, effects: TO_SOTO, next: 'given', fail: 'give_no' },
        { text: '(Not yet.)', next: 'again' },
      ],
    },
    given: {
      text: 'It takes the Board one sitting. You are not in the room; you hear about it from Benedetti, who is delighted, and from Soto, who is not. The Chair is retired under his own bylaws to a bench by the orange tree with his name on a brass plate, and is told it is an honour, and thanks everyone twice. Soto takes the chair at the head of the table. "He did the Scald," she says to you afterwards, very quietly. "He would have done it again. I would rather buy." She looks at the window. "I still want your city\'s book. Don\'t mistake me for kind."',
      again: '"Don\'t mistake me for kind."',
      options: [back()],
    },
    give_no: { text: 'The Board hears you out with perfect courtesy and the Chair thanks you twice, and nothing happens. Soto says afterwards, "Not enough. They\'ve been looking away from him for twenty years. They need something they can\'t look away from."', again: '"Not enough."', options: [back()] },
    kept: { text: 'Soto looks at you for a long moment and then laughs, properly, for the first time. "Of course you are." She writes nothing down. "That\'s the most Concern thing anyone has said in this office in a year."', again: '"Of course you are."', options: [back()] },
    linh: { text: '"Hoang, L." She reads the record without expression: RESERVE, MATCH: WRAY. "Constance will be furious." She signs the pass and stamps it herself. "Good. It will do her good to be furious about something she can\'t buy back."', again: 'A pass, signed by the Director.', options: [back()] },
    linh_no: { text: '"No." Mildly. "She\'s reserve. Reserve is the Board\'s, and I am not going to start my chairmanship, or my next eighty years, by giving away Constance Wray\'s liver to a stranger who asked nicely."', again: '"She\'s reserve."', options: [back()] },
    immy: {
      text: '"The Bridgeward girl." She doesn\'t need to look it up. "Bought, as written, from the man who sold us where she was." She lets that land on you. "Three hundred. That is what the Concern paid, and what the Concern charges. The Concern sells what it owns."',
      again: '"The Concern sells what it owns."',
      options: [
        { id: 'soto.immy.pay', text: '(Pay three hundred.)', if: TOLLS(300), effects: [{ take: 'tolls', count: 300 }, { set: 'hc_immy', value: 'home' }, T(3), N(3), { decision: { id: 'hc_immy', text: 'You bought the girl from the Saints\' tower back from the Concern for three hundred, and she went home to Bridgeward.' } }], next: 'immy_paid' },
        { text: '(Not now.)', next: 'again' },
      ],
    },
    immy_paid: { text: 'Soto stamps a sheet DISCHARGED — BY PURCHASE and hands it to you. "She rides down in the morning. She\'ll be home in three days." Then: "You sold her to us, and you bought her back from us, and the Concern is up on the deal. You see how it works."', again: 'DISCHARGED — BY PURCHASE.', options: [back()] },
    key: { text: 'Soto doesn\'t touch it for a long time. Then she puts it in a drawer and locks the drawer. "The keeper\'s chair is empty," she says. "Now the leash is in my desk." She counts out fifteen hundred. "Thank you. You\'ve made purchase much easier, everywhere."', again: 'The key, in her drawer.', options: [back()] },
    chairs: {
      text: 'Soto at the head of the Board\'s table now, in the Chair\'s room, with the Chair\'s window. "Designate." She hasn\'t changed the furniture. "The Board is quieter. The orange tree has a new bench-warmer." She looks at you. "We still want the book."',
      again: 'Soto, in the Chair\'s place.',
      options: [
        ...answers('soto.answer2', { yes: 'yes', no: 'no', feign: 'feigned', caught: 'caught' }),
        { id: 'soto.linh2', text: 'Sign a pass down for Linh Hoang.', if: { all: [LINH_OPEN, { not: { item: 'k_hc_linh_pass' } }] }, effects: [{ give: 'k_hc_linh_pass' }], next: 'linh' },
        bye,
      ],
    },
  },
};

// ---------------------------------------------------------------- the Chair: the ball, his room, the bench

const BALL_IN: Effect[] = [{ set: 'hc_ball' }, { set: 'hc_chair_invited' }, { learn: 'hc_hall_seen' }];
const NILS_DRAWN: Effect[] = [
  { set: 'hc_nils', value: 'dead' }, K(-15), W(-5),
  { decision: { id: 'hc_nils', text: 'Nils Haber was drawn whole for the Chair\'s renewal on the evening of the ball you attended.' } },
  { news: { tag: 'hc_nils_dead', text: 'Joran Haber\'s boy died on Halcyon\'s floor nine, drawn whole for the Chair\'s renewal before the Board\'s ball', valence: -6, size: 5, at: 'skirts' } },
];
const TOAST_MODS = [
  { if: { item: 'k_hc_portrait' }, dc: -10, why: 'the winter meeting\'s photograph, held up' },
  { if: { item: 'k_hc_renewal_list' }, dc: -10, why: 'Dr Qadir\'s list, in your hand' },
  { if: { item: 'k_hc_coldtag' }, dc: -5, why: 'a cold store label off a cabinet' },
  { if: { knows: 'hc_house_heard' }, dc: -10, why: 'the hall heard the house speak through him' },
  { if: { flag: 'hs_parts', eq: 'exposed' }, dc: -5, why: 'the Skirts already knows' },
];

export const d_hc_chair: DialogueDef = {
  id: 'd_hc_chair', owner: CHAIR,
  start: [{ if: RETIRED, node: 'bench' }, { if: { flag: 'hc_ball' }, node: 'room' }, { if: { not: { flag: 'hc_soto_met' } }, node: 'early' }, { node: 'hall' }],
  nodes: {
    early: {
      text: 'A tall man by the lectern in a coat of grey so fine it seems to have no weave, white hair cut close, an old man\'s handsome face kept at fifty-eight. He takes your hand in both of his. "How kind of you to come. Director Soto keeps my diary; she will receive you first. We were here before, and we shall be here after." He smiles, and pats your hand. "How kind of you to come."',
      again: '"How kind of you to come."',
      passives: [
        { skill: 'medicine', dc: 45, text: 'He said it twice, word for word, with the same pat on the hand. Not a habit. A loop. His eyes are perfectly attentive and there is nobody quite behind them.', effects: [{ learn: 'hc_chair_drift' }] },
        { attr: 'senses', dc: 6, text: 'He said it twice, word for word, with the same pat on the hand, and between the two there was a moment when his face was simply empty, like a room someone has walked out of.', effects: [{ learn: 'hc_chair_drift' }] },
      ],
      options: [leave],
    },
    hall: {
      speaker: 'narrator',
      text: [
        { if: NILS_ON_WARD, text: 'The hall, and the Board in it, laughing quietly; and the Chair by the lectern with a glass, waiting for you without seeming to wait. The ball begins when you go to him. The card on the concourse said it: the Board renews before the ball. On nine, in bed nineteen, Joran Haber\'s boy is reserved for the Chair, whole, before the ball.' },
        { text: 'The hall, and the Board in it, laughing quietly; and the Chair by the lectern with a glass, waiting for you without seeming to wait. The ball begins when you go to him. The Board renews before the ball.' },
      ],
      again: 'The Chair by the lectern, waiting.',
      options: [
        { id: 'chair.go', text: '(Go to the Chair.)', if: NILS_ON_WARD, effects: [...BALL_IN, ...NILS_DRAWN], next: 'ball' },
        { id: 'chair.go.x', text: '(Go to the Chair.)', if: { not: NILS_ON_WARD }, effects: BALL_IN, next: 'ball' },
        { text: '(Not yet.)', exit: true },
      ],
    },
    ball: {
      text: [
        { if: { flag: 'hc_nils', eq: 'dead' }, text: 'Somebody puts a glass in your hand. The Chair turns from the lectern and he is not the man in the gallery\'s portraits: he is younger tonight, pink under the white hair, breathing deep and easy as if his chest had been given back to him, and it has. "How kind of you to come," he says. "I was renewed this evening. One always feels it the first night. Like coming in from the snow." Across the hall the Board raises its glasses to him, and to you.' },
        { text: 'Somebody puts a glass in your hand. The Chair turns from the lectern, an old man\'s handsome face kept at fifty-eight, and takes your free hand in both of his. "How kind of you to come. The ball is yours; we waited for you. We were here before, and we shall be here after." Across the hall the Board raises its glasses to him, and to you.' },
      ],
      again: 'The Chair, at the lectern, with his glass.',
      passives: [
        { skill: 'medicine', dc: 45, text: 'Watch him. He pats your hand, says the same courteous thing, pats it again. His attention is perfect and it is the attention of a lens. Whatever is in there is very old and very busy and it is not quite a man any more.', effects: [{ learn: 'hc_chair_drift' }] },
        { attr: 'senses', dc: 6, text: 'Every few sentences his face empties, for less than a breath, the way a lamp dips, and comes back with the same courtesy on it as before.', effects: [{ learn: 'hc_chair_drift' }] },
      ],
      interject: [{ companion: NINE, text: 'Nine\'s lens rests on the Chair and does not move. "I have spoken to the city every day for nine years," it says, very low. "I know what it sounds like when something large speaks through something small."' }],
      options: [
        { id: 'chair.wants', text: 'What does the Board want with me?', if: { not: { flag: 'hc_board_wants' } }, next: 'wants' },
        { id: 'chair.well', text: 'You look well.', if: { not: { seen: 'chair.well' } }, next: 'well' },
        { id: 'chair.age', text: 'How old are you?', if: { not: { seen: 'chair.age' } }, effects: [{ learn: 'hc_ages' }], next: 'age' },
        { id: 'chair.scald', text: 'Who made the Scald?', if: { not: { seen: 'chair.scald' } }, effects: [{ learn: 'hc_scald_owned' }], next: 'scald' },
        { id: 'chair.house', text: '(Kes speaks to him in the old tongue of the door in her neck.)', if: { all: [KES_LINEAGE, { not: { seen: 'chair.house' } }] }, effects: [{ learn: 'hc_house_heard' }, { learn: 'hc_ages' }, { learn: 'hc_chair_drift' }, { learn: 'hc_reserve_known' }, { learn: 'hc_scald_owned' }, K(5)], next: 'house' },
        ...answers('chair.answer', { yes: 'yes', no: 'no', feign: 'feigned', caught: 'caught' }),
        { id: 'chair.toast', text: '(Raise your glass to the hall, and tell it what its Board is.)', if: { all: [KNOWS_BOARD, LL_OPEN, { not: { seen: 'chair.toast' } }] }, check: { skill: 'speech', dc: 50, mods: TOAST_MODS }, effects: EXPOSED, next: 'toast', fail: 'toast_fail' },
        { text: '(Leave the ball.)', exit: true },
      ],
    },
    wants: {
      text: 'The Chair sets his glass on the lectern. "Your city keeps a book of what will happen," he says, "and it is right far more often than anyone has a right to be. We should like the book. Not the city: it is ugly and it smells of its river. The book. The core under your Spire that writes the forecasts. In a little while the city will give you its sash; it has already written that it will. On that day the Magistrate may transfer the city\'s property, under the city\'s own law, with a signature. We would like your signature. On that day, and nobody\'s before. In return, a seat at this table, kept for you from the day you take the sash. And renewal, when you want it. Everyone wants it, eventually." He smiles. "You are wondering why. We sell futures, my dear designate. We always have: a chip, a contract, a season\'s term, a citizen\'s place on the terraces. It is the only product that never spoils. With the book we shall know what to sell, and to whom, and when; whom to renew, and with what, and who will be born on the slope in time to renew us. We shall not have to guess. I have been guessing for two hundred and forty years. I am so very tired of guessing." He picks the glass up again. "Director Soto would like to buy it from you. I would be happy to take it; there are things asleep in the Ashlands that would fetch it for us, and they do not tire. But the Board is fond of kindness, when it is cheaper. So. Nobody has to decide anything today." The hand on yours. "How kind of you to come."',
      again: '"Nobody has to decide anything today."',
      effects: [{ set: 'hc_board_wants' }, { learn: 'hc_board_wants' }, { learn: 'hc_reserve_hint' }],
      interject: [
        { companion: KES, text: '"Who will be born on the slope in time," Kes repeats, so quietly only you hear. Her hand is on the back of her neck.', effects: [K(-1)] },
        { companion: ODILE, text: '"A futures contract on the future itself," Odile murmurs. "My dear, I have dreamed of that trade. I am so glad to find I never want to make it."', effects: [O(2)] },
        { companion: WREN, text: 'Wren is very still. "Things asleep in the Ashlands," she says. "He means the dogs."' },
      ],
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    well: {
      text: [
        { if: { flag: 'hc_nils', eq: 'dead' }, text: '"Thank you. Lungs, and a heart. A young man from your Skirts; Haber, Dr Qadir tells me. Whole, this time; she says a part at a time no longer keeps up with me." He touches his own chest, gratefully, as one touches a gift. "I am grateful to him. I always am. One should be."' },
        { text: '"Thank you. A kidney this season, and a little skin. From your Skirts; Dr Qadir keeps the names, I keep the gratitude." He touches his own side, gratefully, as one touches a gift. "One should be grateful. One always is."' },
      ],
      again: '"One should be grateful."',
      interject: [{ companion: TAMSIN, text: 'Tamsin puts her glass down on a table very carefully, untouched, and walks out of the hall.', effects: [T(-2)] }],
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    age: {
      text: '"Old enough to have skied the runs below this house when there was snow on them." He looks toward the windows as if the snow might still be there. "The lodge your Shift meets in. I had a fire there every evening of the winter of the Charter. Constance was nineteen; I taught her to turn on the black run." Pat, pat. "We were here before, and we shall be here after. How kind of you to come."',
      again: '"When there was snow on them."',
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    scald: {
      text: '"We did." He says it as pleasantly as everything else. "The Reach was coming apart: chrome everywhere, every gang its own lattice, nobody\'s hand on anything. Ninety years ago I signed an order that woke every piece of Concern work in the Reach at once and held its wearer still. Still is so much easier to govern. Then the fires came, and the people who were still could not leave them." He sips. "I am not sorry. There has been order of a kind ever since. Ask the city. It liked the arithmetic so much it wrote its whole Plan on the ashes."',
      again: '"I am not sorry."',
      interject: [{ companion: ASH, text: 'Ash makes a sound you have not heard from him before, and turns his back on the Chair, and stays like that.', effects: [S(-3)] }],
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    house: {
      text: 'Kes says something to the Chair that is not words, a run of sounds like a lock being turned in a language older than the lock. The Chair\'s face empties and does not fill. When he speaks it is his voice, without the courtesy, without anything. "HOUSE OF HALVERSON. CHARTER YEAR ONE. BOARD OF TWELVE, RENEWED. CHAIR: ADAIR HALVERSON. AGE TWO HUNDRED AND FORTY-ONE. COGNITION FOURTEEN PERCENT. COURTESY ROUTINE ACTIVE. ORDER OF THE SCALD: AUTHORISED BY THE CHAIR. RESERVE: ASHLANDS, KENNEL SEVEN, CONTROLLER IN THE CHAIR\'S ROOM." Then Kes says one more sound and the Chair blinks and smiles at you and pats your hand. "How kind of you to come." Around you, very slowly, the hall has gone quiet.',
      again: 'COGNITION FOURTEEN PERCENT. COURTESY ROUTINE ACTIVE.',
      interject: [{ companion: KES, text: 'Kes is shaking. "It\'s the same tongue," she says. "My door and him. The house wrote both." She wipes her mouth. "He\'s not in there. He\'s a door with a coat on."' }],
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    toast: {
      text: 'You raise your glass, and the hall turns, because the designate is raising a glass. You tell it what it already knows. The photograph of a winter meeting with snow on the lodge roof. The ages. The charts on nine with the Board\'s names on them, and the numbers against the names, and what the numbers are: people from the slope, asleep, drawn on a kidney at a time, a whole young man for one evening\'s good colour. You don\'t raise your voice. You don\'t need to; nobody in the hall is breathing. When you finish, the Chair thanks you, twice, and pats your hand. Then a woman near the windows puts her glass down on the floor and walks out, and then another, and the hall begins, very quietly, to empty.',
      again: 'The hall, emptying.',
      interject: [{ companion: NINE, text: '"Read into the record," Nine says, to the emptying hall. "Witnessed." It sounds, for once, like a judgement.' }],
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    toast_fail: {
      text: 'You raise your glass and say it, and the hall listens politely, and when you finish the Chair laughs, warmly, and says, "The designate has been to the Skirts. How kind of them to bring us the Skirts\' stories," and the hall laughs with him, relieved to be told what to do. Two of the Clean are suddenly at your elbows, courteous as waiters. The glass is taken out of your hand.',
      again: 'The hall laughing, relieved.',
      options: [{ text: '(Back.)', next: 'ball' }],
    },
    yes: { text: 'The Chair takes your hand in both of his. "Thank you. Thank you." The hall applauds softly, as if at a recital. A clerk appears with a letter on heavy card, SEAT IN WAITING, and the Chair signs it in a hand that has not changed in a very long time. "Nobody had to decide anything today," he says, delighted. "And you did anyway."', again: 'SEAT IN WAITING.', options: [{ text: '(Back.)', next: 'ball' }] },
    no: { text: 'The Chair looks at you with perfect courtesy for a long moment. "Then we shall wait," he says. "We are very good at waiting. We were here before." Pat, pat. "And there are other ways to fetch a book." Across the hall, Soto sets her glass down.', again: '"There are other ways to fetch a book."', options: [{ text: '(Back.)', next: 'ball' }] },
    feigned: { text: 'The Chair takes your hand in both of his. "Thank you. Thank you." A clerk appears with a letter on heavy card, SEAT IN WAITING, and the Chair signs it. Across the hall, Soto watches you over her glass and does not applaud.', again: 'SEAT IN WAITING.', options: [{ text: '(Back.)', next: 'ball' }] },
    caught: { text: 'The Chair\'s face empties and fills again, and for a moment something else looks out of it, quite interested. "Ah," he says. "No." Pat, pat. "Then we shall wait. How kind of you to come." The clerk with the letter on heavy card turns round and goes away.', again: '"Ah. No."', options: [{ text: '(Back.)', next: 'ball' }] },
    room: {
      text: 'The Chair\'s own room behind the hall: a fire in a grate, a window on the dark caldera, a chair by the fire with the Chair in it, and by the window, curled on the carpet like a hound by a hearth, a machine the size and shape of a hound with its lens dark. "How kind of you to come," the Chair says. "Do sit. That is Bramble. She is asleep. They are all asleep, out there, until I tell them otherwise."',
      again: 'The Chair by his fire, and the sleeping machine.',
      effects: [{ learn: 'hc_chair_room_seen' }, { learn: 'hc_reserve_hint' }],
      options: [
        { id: 'chair.room.scald', text: 'Who made the Scald?', if: { not: { any: [{ seen: 'chair.scald' }, { seen: 'chair.room.scald' }] } }, effects: [{ learn: 'hc_scald_owned' }], next: 'room_scald' },
        ...answers('chair.room.answer', { yes: 'room_yes', no: 'room_no', feign: 'room_yes', caught: 'room_no' }),
        ...sellKey('chair.key', '(Give him the keeper\'s key.)', 'chair', 1800, { all: [{ item: 'k_hc_leash_key' }, { flag: 'hc_leash', eq: 'seized' }] }, 'room_key'),
        { text: '(Leave him by his fire.)', exit: true },
      ],
    },
    room_scald: { text: '"We did. I did." The fire. "Still is so much easier to govern. I am not sorry." Pat, pat, though you are not within reach. "How kind of you to come."', again: '"I am not sorry."', options: [{ text: '(Back.)', next: 'room' }] },
    room_yes: { text: '"Thank you." He signs the letter on his knee: SEAT IN WAITING. "We were here before," he tells the fire.', again: 'SEAT IN WAITING.', options: [{ text: '(Back.)', next: 'room' }] },
    room_no: { text: '"Then we shall wait." He looks at the machine by the window. "We have such patient friends."', again: '"Such patient friends."', options: [{ text: '(Back.)', next: 'room' }] },
    room_key: { text: 'He takes the key in his old hands and holds it to his cheek like something warm, and for a moment, for the first time, there is somebody behind his eyes, and the somebody is very pleased. "Mine again," he says. "How kind." He pays you out of a drawer, in notes older than you are.', again: 'The key against his cheek.', options: [{ text: '(Back.)', next: 'room' }] },
    bench: {
      text: 'The Chair on the bench by the orange tree with FOR THE CHAIR on the brass plate, in a coat too warm for the gardens, his hands on his knees. He looks up at you with real pleasure. "How kind of you to come. We were here before, and we shall be here after." Pat, pat, on his own knee. "How kind of you to come."',
      again: 'The Chair on his bench.',
      options: [{ id: 'chair.bench.sit', text: '(Sit with him a while.)', if: { not: { seen: 'chair.bench.sit' } }, next: 'snow' }, leave],
    },
    snow: { text: 'You sit. He watches the gardeners. After a long time he says, in a different voice, an old man\'s voice with nothing courteous in it at all, "There was snow. You won\'t believe me. There was snow on all of it." Then the courtesy comes back over his face like a sheet. "How kind of you to come."', again: '"There was snow on all of it."', options: [leave] },
  },
};

// ---------------------------------------------------------------- the Board

export const d_hc_wray: DialogueDef = {
  id: 'd_hc_wray', owner: 'npc_hc_17', start: [{ if: { flag: 'hc_wray_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A slim fair woman in white with lit seams at the wrists, a glass she isn\'t drinking, and a stillness people only have when they have never once been interrupted. "Constance Wray." She doesn\'t offer a hand. "The Chair is the Chair. There is nothing else to say about the Chair, so please don\'t ask me to."',
      again: 'Constance Wray, not drinking.',
      effects: [{ set: 'hc_wray_met' }],
      options: [{ id: 'wray.long', text: 'How long have you been on the Board?', next: 'long' }, bye],
    },
    again: {
      text: '"Designate."',
      again: 'Wray.',
      options: [
        { id: 'wray.long2', text: 'How long have you been on the Board?', if: { not: { seen: 'wray.long' } }, next: 'long' },
        { id: 'wray.renew', text: 'Do you know what you\'re renewed with?', if: { not: { seen: 'wray.renew' } }, next: 'renew' },
        { id: 'wray.linh', text: 'Linh Hoang.', if: { all: [{ knows: 'hc_linh_reserve' }, { not: { seen: 'wray.linh' } }] }, next: 'linh' },
        bye,
      ],
    },
    long: {
      text: '"I was nineteen the winter of the Charter." She says it with a kind of relief, as if it were a thing she was rarely allowed to say. "Adair taught me to turn on the black run, below the lodge. There was snow to here." She touches her hip. "Everyone in the photographs in the gallery is in this room tonight. We were all young at the old lodge. We are all young here."',
      again: '"We are all young here."',
      effects: [{ learn: 'hc_ages' }],
      options: [back()],
    },
    renew: {
      text: '"Of course." She seems surprised that you would think otherwise. "One renews or one is reviewed. I renew. I have had three kidneys and two corneas and a great deal of skin. I know their numbers. Dr Qadir tells me, if I ask, and I always ask." She turns the glass. "I don\'t send flowers. There is nobody to send them to; the Window settles the families very generously. I think of them. That is more than they would get on the slope, where nobody thinks of anybody."',
      again: '"I know their numbers."',
      interject: [{ companion: WREN, text: '"On the slope," Wren says, "they think of each other all the time. That\'s all they\'ve got." Wray looks at Wren as if a chair had spoken.', effects: [W(1)] }],
      options: [back()],
    },
    linh: {
      text: '"My match." For the first time she looks at you properly. "A lovely girl. She counts things. I may never need her; I very much hope I never need her. But I may, and so she is kept, and she is very well kept, better than any girl on your slope." She sets the glass down. "If you take her down that hill you are not saving her. You are throwing away my liver and her supper. I would like you to understand that you are doing both."',
      again: '"You are throwing away my liver and her supper."',
      options: [back()],
    },
  },
};

export const d_hc_benedetti: DialogueDef = {
  id: 'd_hc_benedetti', owner: 'npc_hc_18', start: [{ if: { flag: 'hc_bene_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A dark, handsome, amused man in grey, who finds you before you find anyone else. "Benedetti. Aurelio. I was born up here, which makes me the Board\'s baby. Sixty-one." He laughs at your face. "Forty-four, if you\'re looking. I\'m Director Soto\'s, if you\'re counting. Everyone up here counts."',
      again: 'Benedetti, amused.',
      effects: [{ set: 'hc_bene_met' }, { learn: 'hc_ages' }],
      options: [{ id: 'bene.split', text: 'Soto\'s, against whom?', next: 'split' }, bye],
    },
    again: {
      text: '"Designate!" Benedetti, delighted to be interrupted.',
      again: 'Benedetti.',
      options: [
        { id: 'bene.split2', text: 'Soto\'s, against whom?', if: { not: { seen: 'bene.split' } }, next: 'split' },
        { id: 'bene.minutes', text: 'How would anyone prove the Chair isn\'t fit?', if: { all: [{ seen: 'bene.split' }, { not: { seen: 'bene.minutes' } }] }, next: 'minutes' },
        bye,
      ],
    },
    split: {
      text: '"The Chair, of course, and the old ones. Constance. The ones who skied." He lowers his voice to nothing. "The Chair would rather take things. He did the Scald; he likes how quiet it went. Soto would rather buy. I would rather buy. Buying is how you get to be a hundred and sixty without anyone gassing you in a pit." He drinks. "The Chair\'s courtesy is very old. So is the Chair. Everybody can see it. Nobody can say it. That\'s the Board."',
      again: '"Everybody can see it. Nobody can say it."',
      options: [back()],
    },
    minutes: {
      text: '"Read the minutes." He says it as if it were the punchline of a joke he has been waiting years to tell. "They\'re on the boardroom table in a leather binder. Nobody reads them; that\'s what minutes are for. Look at what the clerk writes every time the Chair speaks. Then look at what she\'s stopped writing."',
      again: '"Look at what she\'s stopped writing."',
      effects: [{ learn: 'hc_minutes_hint' }],
      options: [back()],
    },
  },
};

export const d_hc_quill: DialogueDef = {
  id: 'd_hc_quill', owner: 'npc_cr_11', start: [{ if: { seen: 'quill.hc.how' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'cr_concern', eq: 'exposed' }, text: 'Mr Quill from the Crown, in the Board\'s hall, with a glass. He bows to you exactly as deeply as he did at the Masque, before you played his reel at the lectern. "Designate. The Board remembers Meridian." A small smile. "The Board is also very practical. It has forgiven worse, when worse was useful."' },
        { text: 'Mr Quill from the Crown, in the Board\'s hall, with a glass. He bows to you exactly as deeply as he did at the Masque. "Designate. The Board was so grateful for your discretion in Meridian. Discretion is the only currency up here that doesn\'t depreciate."' },
      ],
      again: 'Mr Quill, bowing.',
      options: [{ id: 'quill.hc.how', text: 'How long have you worked for them?', next: 'how' }, bye],
    },
    again: { text: 'Mr Quill inclines his head.', again: 'Mr Quill, inclining.', options: [bye] },
    how: { text: '"Since I was a boy in the school on the terraces." He watches the Chair across the hall. "I was a reserve. My match died of something they could not renew, and so I was no longer needed, and they found me a career instead. I have been very grateful ever since." He sips. "Gratitude is a career up here, designate."', again: '"Gratitude is a career up here."', options: [back()] },
  },
};

// ---------------------------------------------------------------- the Board's floor: the gallery, the boardroom, the lectern, the Chair's door

export const d_hc_portraits: DialogueDef = {
  id: 'd_hc_portraits', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Portraits down the gallery in gold frames: the Board, one by one, painted, each at forty or fifty, each with the closed eye on a ring or a pin. At the end, smaller, not painted: a photograph. Twelve people on a terrace in front of a ski lodge with a deep white roof, laughing in heavy coats, captioned in ink THE BOARD OF THE HALVERSON CONCERN — WINTER MEETING — YEAR OF THE CHARTER. The man in the middle is the Chair. The girl beside him with snow in her hair is Constance Wray. Every face in the photograph is a face from the hall tonight, not a day older.',
      again: 'The portraits, and the winter meeting with snow on the roof.',
      effects: [{ learn: 'hc_ages' }, { lead: 'l_hc_portrait' }, { quest: 'q_hc_longlived', start: true }],
      interject: [
        { companion: ODILE, text: 'Odile looks at the photograph for a long time and then at the hall. "I priced their paper for thirty years," she says. "I always assumed it was the same paper because it was the same house. It was the same hands."' },
        { companion: TAMSIN, text: '"Snow," Tamsin says. "I\'ve only ever seen it in a book. They stood in it." She looks at the hall. "They stood in it before the Burn and they\'re still standing."' },
      ],
      options: [
        { id: 'port.take', text: '(Take the photograph out of its frame.)', if: { not: { item: 'k_hc_portrait' } }, once: true, effects: [{ give: 'k_hc_portrait' }], next: 'taken' },
        leave,
      ],
    },
    taken: { text: 'The frame is held shut with two little brass turns. Nobody in the gallery is watching the gallery. The photograph is soft with age and the snow on the roof has gone yellow.', again: 'The empty frame.', options: [leave] },
  },
};

export const d_hc_boardtable: DialogueDef = {
  id: 'd_hc_boardtable', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The boardroom: a long table of dark wood, twelve chairs, a bowl of oranges nobody has touched, and at the head, by the Chair\'s place, a leather binder thick with ten years of minutes.',
      again: 'The long table and the binder of minutes.',
      options: [
        { id: 'bt.read', text: '(Read the minutes.)', if: { not: { seen: 'bt.read' } }, effects: [{ learn: 'hc_chair_drift' }, { learn: 'hc_ages' }, { lead: 'l_hc_minutes' }, { quest: 'q_hc_longlived', start: true }], next: 'read' },
        { id: 'bt.take', text: '(Take the binder.)', if: { all: [{ seen: 'bt.read' }, { not: { item: 'k_hc_minutes' } }] }, once: true, effects: [{ give: 'k_hc_minutes' }], next: 'taken' },
        leave,
      ],
    },
    read: {
      text: 'Ten years of the Board. Quarterly yields from the line, renewals booked and concluded, contracts reviewed, a tonnage figure from Number Six every quarter in red or black. And at every meeting, at the top, the Chair speaks. Ten years ago the clerk wrote out what he said: "We were here before, and we shall be here after. How kind of you all to come. We were here before, and we shall be here after." Word for word, every meeting, twice. Six years ago she stopped writing it out. Every page since says only: THE CHAIR\'S COURTESY, AS BEFORE.',
      again: 'THE CHAIR\'S COURTESY, AS BEFORE.',
      interject: [{ companion: NINE, text: '"As before," Nine says. "The record would call that a standing entry. It is what one writes when a thing has stopped being an event and become furniture."' }],
      options: [{ text: '(Close the binder.)', next: 'look' }],
    },
    taken: { text: 'It is heavy, and it smells of the room. Nobody will notice for a quarter.', again: 'The table without its binder.', options: [leave] },
  },
};

export const d_hc_lectern: DialogueDef = {
  id: 'd_hc_lectern', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A lectern of pale wood with the closed eye inlaid in its face. On it, a card in the Chair\'s even hand for the toast: WE WERE HERE BEFORE, AND WE SHALL BE HERE AFTER. Under it, written later and smaller in somebody else\'s: TWICE.',
      again: 'WE WERE HERE BEFORE. TWICE.',
      options: [leave],
    },
  },
};

export const d_hc_chairdoor: DialogueDef = {
  id: 'd_hc_chairdoor', owner: 'narrator', start: [{ if: RETIRED, node: 'open' }, { node: 'door' }],
  nodes: {
    door: {
      text: 'A door of dark wood behind the lectern with a small brass plate: PRIVATE. A lens over it, and behind it, faintly, a fire.',
      again: 'PRIVATE.',
      options: [
        { id: 'cd.invited', text: '(Knock. You were asked to call on him.)', if: { flag: 'hc_chair_invited' }, effects: [GOTO('hc_board', 'chair_room')], exit: true, repeat: true },
        { id: 'cd.kes', text: '(Kes looks at the lens.)', if: { all: [KES_IN, { not: { flag: 'hc_chair_invited' } }] }, effects: [GOTO('hc_board', 'chair_room')], exit: true, repeat: true },
        { id: 'cd.pick', text: '(Work the lock while the hall is looking at itself.)', if: { all: [{ not: { flag: 'hc_chair_invited' } }, { not: { flag: 'hc_chairdoor_picked' } }] }, check: { skill: 'security', dc: 55 }, effects: [{ set: 'hc_chairdoor_picked' }, GOTO('hc_board', 'chair_room')], next: 'in', fail: 'pick_no', once: true },
        { id: 'cd.picked', text: '(The lock you worked.)', if: { flag: 'hc_chairdoor_picked' }, effects: [GOTO('hc_board', 'chair_room')], exit: true, repeat: true },
        leave,
      ],
    },
    in: { text: 'The lock is old and good and so are you. The door swings in on firelight.', again: 'The door, open.', options: [{ text: '(Go in.)', exit: true }] },
    pick_no: { text: 'The lens over the door turns down to look at your hands, and a voice from nowhere says, warmly, "The Chair is resting." One of the Clean is at your elbow, courteous as a waiter.', again: '"The Chair is resting."', options: [leave] },
    open: {
      text: 'The door to the Chair\'s room stands open. Soto\'s people are carrying out his books in boxes.',
      again: 'The open door.',
      options: [{ id: 'cd.open', text: '(Go in.)', effects: [GOTO('hc_board', 'chair_room')], exit: true, repeat: true }, leave],
    },
  },
};

export const d_hc_chairdoor_in: DialogueDef = {
  id: 'd_hc_chairdoor_in', owner: 'narrator', start: [{ node: 'door' }],
  nodes: {
    door: { text: 'The door back to the hall.', again: 'The door.', options: [{ id: 'cdi.out', text: '(Back to the hall.)', effects: [GOTO('hc_board', 'hall')], exit: true, repeat: true }, leave] },
  },
};

const RESERVE_TEXT = [
  { if: { flag: 'an_reserve', eq: 'player' }, text: 'A console by the Chair\'s window with the closed eye on its case and one line lit on a dark screen: RESERVE — ASHLANDS — KENNEL SEVEN — COMMAND: NOT ANSWERING. Under it, blinking: CORE ABSENT. Somebody has taken the heart out of what sleeps at Kelso, and the Chair\'s console is calling into an empty room.' },
  { if: { flag: 'an_reserve', eq: 'concern' }, text: 'A console by the Chair\'s window with the closed eye on its case and one line lit on a dark screen: RESERVE — ASHLANDS — KENNEL SEVEN — COMMAND: ANSWERING — HELD. Four hundred and twelve lines under it, all green. Whatever sleeps out there sleeps on this, and wakes on it.' },
  { if: { flag: 'an_reserve', eq: 'leaderless' }, text: 'A console by the Chair\'s window with the closed eye on its case and one line lit on a dark screen: RESERVE — ASHLANDS — KENNEL SEVEN — COMMAND UNIT: NONE. The lines under it flicker, green and red, like animals moving in their sleep.' },
  { text: 'A console by the Chair\'s window with the closed eye on its case and one line lit on a dark screen: RESERVE — ASHLANDS — DORMANT. Under it, a key-slot, and in the slot a controller the size of a hand. The machine by the window lifts its dark lens a quarter-inch as you lean over the console, and settles again.' },
];

export const d_hc_controllers: DialogueDef = {
  id: 'd_hc_controllers', owner: 'narrator', start: [{ if: { flag: 'hc_reserve' }, node: 'after' }, { node: 'look' }],
  nodes: {
    look: {
      text: RESERVE_TEXT,
      again: 'The Chair\'s console, and RESERVE — ASHLANDS.',
      interject: [{ companion: WREN, text: 'Wren looks at the machine curled by the window and her hand goes to her knife without her noticing. "That\'s a dog," she says. "That\'s one of theirs. They\'ve got one by the fire like a pet."' }],
      options: [
        { id: 'res.read', text: '(Read the console properly.)', if: { all: [{ not: { knows: 'hc_reserve_known' } }, { not: KES_IN }] }, check: { skill: 'science', dc: 60 }, effects: [{ learn: 'hc_reserve_known' }], next: 'read', fail: 'read_no', once: true },
        { id: 'res.kes', text: '(Kes reads it in the house\'s own tongue.)', if: { all: [{ not: { knows: 'hc_reserve_known' } }, KES_IN] }, effects: [{ learn: 'hc_reserve_known' }, K(1)], next: 'read' },
        { id: 'res.take', text: '(Pull the controller out of its slot and keep it.)', if: { knows: 'hc_reserve_known' }, effects: [{ give: 'k_hc_controller' }, { set: 'hc_reserve', value: 'taken' }, W(-3), N(-2), { decision: { id: 'hc_reserve', text: 'You took the Concern\'s reserve controller for the Ashlands out of the Chair\'s console.' } }], next: 'taken' },
        { id: 'res.burn', text: '(Burn the console: nobody on this hill wakes the Ashlands again.)', if: { knows: 'hc_reserve_known' }, effects: [{ set: 'hc_reserve', value: 'burned' }, W(5), S(5), K(3), { rep: { faction: 'concern', respect: -10 } }, { decision: { id: 'hc_reserve', text: 'You burned the Chair\'s console: the Concern can no longer wake the Ashlands\' reserve from Halcyon.' } }], next: 'burned' },
        leave,
      ],
    },
    read: {
      text: 'It is a controller and a key at once: the hill\'s end of every Concern machine left asleep in the Ashlands after the army that bought them died. Hounds in cradles, kites folded on their racks, waiting for a voice they know. The Chair\'s voice. Whoever holds the controller in the slot can tell them to wake, and where to go, and what to do when they get there. The Chair has not used it in ninety years. He has thought about it every season.',
      again: 'The Chair\'s end of what sleeps in the Ashlands.',
      options: [{ text: '(Back.)', next: 'look' }],
    },
    read_no: { text: 'The screen fills with the house\'s own tongue and none of it is for you. The machine by the window lifts its lens and watches you until you step back.', again: 'The house\'s tongue.', options: [leave] },
    taken: { text: 'The controller comes out of its slot warm. The screen goes dark. By the window the machine called Bramble sighs, a long mechanical breath, and does not wake.', again: 'The empty slot.', options: [leave] },
    burned: { text: 'You open the console\'s case and short everything inside it against everything else, and it burns with a small blue flame and a smell of hot plastic. By the window the machine called Bramble twitches once and goes still for good. The Chair, by his fire, says "How kind of you to come," to nobody.', again: 'The burned console.', options: [leave] },
    after: { text: 'The Chair\'s console, dark.', again: 'Dark.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the works: the line, the core door, the keeper, the trunk

/** Kes's own port is still on the channel (kept, or never settled): burning it gives her the fits the Reach gets. */
const KES_LIVE_PORT: Cond = { all: [KES_JOINED, { not: { any: [{ flag: 'kes_link', eq: 'cut' }, { flag: 'kes_link', eq: 'dark' }] } }] };
const CUT = (how: string, text: string): Effect[] => [
  { set: 'hc_leash', value: 'cut' }, { set: 'hc_leash_how', value: how }, { set: 'hc_drift_fits' }, { expel: 'concern' },
  { rep: { faction: 'concern', respect: -30 } }, { rep: { faction: 'the_shift', respect: 10 } },
  S(15), W(5), T(3), I(3), N(3), { xp: 400 },
  { decision: { id: 'hc_leash', text } },
  { news: { tag: 'hc_leash_cut', text: 'every piece of Concern chrome in the Reach went dead at once for a moment; people fell where they stood, and got up again, most of them', valence: 5, size: 10, at: 'skirts' } },
  { news: { tag: 'hc_leash_cut_md', text: 'Concern chrome went dead across the city at once; the wearers had fits in the street', valence: 3, size: 8, at: 'meridian' } },
];
const KES_DIES: Effect[] = [
  { leave: KES }, { set: 'kes_left', value: 'dead' }, { set: 'kes_dead' }, { set: 'kes_rom', value: 'ended' },
  { decision: { id: 'kes_left', text: 'Kes Oyelaran rode the Concern\'s channel to burn it from the inside, and it took her with it.' } },
];
/** After any cut: Kes, if her own port is still on the channel, falls with the rest of the Reach. */
function afterCut(id: string): OptionDef[] {
  return [
    { id, text: '(It is done.)', if: { all: [KES_LIVE_PORT, { not: { flag: 'kes_dead' } }, { not: { flag: 'hc_kes_rode' } }] }, effects: [{ set: 'kes_fits' }], next: 'kes_fell' },
    { id: `${id}.x`, text: '(It is done.)', if: { not: { all: [KES_LIVE_PORT, { not: { flag: 'kes_dead' } }, { not: { flag: 'hc_kes_rode' } }] } }, exit: true },
  ];
}

export const d_hc_line: DialogueDef = {
  id: 'd_hc_line', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'The chip line through the glass: a long white room in tea-coloured light, machines moving very fast and people in white moving very slowly among them, faces covered. Every chip in every piece of the Concern\'s chrome is made in this room. A brass plate on the gallery rail: LINE THREE — HOLDING TOLERANCE — NINETY YEARS.',
      again: 'The line, holding its tolerance.',
      passives: [{ skill: 'science', dc: 50, text: 'Every chip that leaves that room carries the same little block of the house\'s own logic, burned in at the line, the same in a Pond fighter\'s arm and a Board member\'s lattice: a door, and the channel behind it. You cannot fit Concern work without fitting the leash. It is not a feature of the chrome. It is the chrome.', effects: [{ learn: 'hc_line_door' }] }],
      interject: [{ companion: KES, text: '"That\'s where my door\'s from," Kes says, with her forehead against the glass. "Born in there. Like me, a bit."' }],
      options: [leave],
    },
  },
};

export const d_hc_ono: DialogueDef = {
  id: 'd_hc_ono', owner: 'npc_hc_11', start: [{ if: { flag: 'hc_ono_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A small precise woman in a white coat with a tablet, standing at the gallery glass as if she could hold the line steady by looking at it. "Ono. The line\'s chief." She doesn\'t look away from the glass. "Line three is down a point. Line three is always down a point. What do you want? Be quick; I\'m holding tolerance."',
      again: 'Ono, holding tolerance.',
      effects: [{ set: 'hc_ono_met' }],
      options: [{ id: 'ono.line', text: 'Ninety years of the same line.', next: 'line' }, bye],
    },
    again: {
      text: '"Down a point," Ono says to the glass.',
      again: 'Ono, at the glass.',
      options: [
        { id: 'ono.line2', text: 'Ninety years of the same line.', if: { not: { seen: 'ono.line' } }, next: 'line' },
        { id: 'ono.core', text: 'What\'s behind the core door?', if: { not: { seen: 'ono.core' } }, next: 'core' },
        { id: 'ono.leave', text: 'Walk me past the guard.', if: { all: [{ seen: 'ono.core' }, { not: { flag: 'hc_ono_leave' } }, { not: { seen: 'ono.leave' } }] }, check: { skill: 'speech', dc: 45, mods: [{ if: KES_IN, dc: -10, why: 'Kes keeps the Window\'s end of the grid, and Ono knows it' }, { if: { knows: 'hc_line_door' }, dc: -5, why: 'you know what the line burns into every chip' }] }, effects: [{ set: 'hc_ono_leave' }], next: 'walked', fail: 'no' },
        bye,
      ],
    },
    line: {
      text: '"My mother ran the line. Her mother ran the line. The line ran us." She says it without bitterness, like a weather report. "Nothing the Concern sells works without what we make down here. The Board are up there drinking because we are down here holding a tolerance their grandparents set." She taps the glass. "I have never been to the Board\'s floor. I don\'t need to be. They need to come down here."',
      again: '"The line ran us."',
      options: [back()],
    },
    core: {
      text: 'For the first time she looks away from the glass. "Femi." She says the name as if it were a fact about the building. "The keeper. He\'s been in that chair since before I was born. When I was six my mother took me in to see him, and he made the lamps on line three blink for me, all at once, like a trick." She looks back at the glass. "He hums. You can feel it through the floor, if you stand still. My mother said it hums like a person because it is one."',
      again: '"It hums like a person because it is one."',
      options: [back()],
    },
    walked: { text: 'Ono puts the tablet under her arm and walks to the core door without a word, and says to the guard, "Line inspection, with me," in a voice that has never once been questioned on this floor, and he steps aside. At the door she says, very low, "Somebody should look at him. Somebody from outside. I can\'t any more."', again: '"Somebody should look at him."', options: [back()] },
    no: { text: '"No." To the glass. "I hold tolerance. I don\'t open doors."', again: '"I don\'t open doors."', options: [back()] },
  },
};

export const d_hc_coredoor: DialogueDef = {
  id: 'd_hc_coredoor', owner: 'narrator', start: [{ node: 'door' }],
  nodes: {
    door: {
      text: 'A steel door at the gallery\'s end with no plate on it at all, and one of the Clean in front of it who has been told not to look at anything but the door. Through it, through the floor, through your boots: a hum, low and steady, like somebody holding a note.',
      again: 'The core door, and the hum.',
      options: [
        { id: 'core.kes', text: '(Kes walks up to the door as if it were hers.)', if: { all: [KES_IN, { not: { flag: 'hc_core_door' } }] }, effects: [GOTO('hc_works', 'core')], exit: true, repeat: true },
        { id: 'core.keeper', text: '(Kes shows the door her contract. The keeper\'s door opens for the keeper.)', if: { all: [KES_IN, { flag: 'hc_core_door' }] }, effects: [GOTO('hc_works', 'core')], exit: true, repeat: true },
        { id: 'core.ono', text: '(Line inspection, with Ono.)', if: { flag: 'hc_ono_leave' }, effects: [GOTO('hc_works', 'core')], exit: true, repeat: true },
        { id: 'core.pick', text: '(Wait for the guard\'s change and work the lock.)', if: { all: [{ not: { flag: 'hc_core_picked' } }, { not: { flag: 'hc_ono_leave' } }] }, check: { skill: 'security', dc: 50 }, effects: [{ set: 'hc_core_picked' }], next: 'picked', fail: 'pick_no', once: true },
        { id: 'core.picked', text: '(The door you opened at the change.)', if: { flag: 'hc_core_picked' }, effects: [GOTO('hc_works', 'core')], exit: true, repeat: true },
        leave,
      ],
    },
    picked: { text: 'At the change there are forty seconds when nobody is looking at the door but you. It is enough.', again: 'The door, open at the change.', options: [{ id: 'core.picked.go', text: '(Go in.)', effects: [GOTO('hc_works', 'core')], exit: true }] },
    pick_no: { text: 'The change comes and goes, and the new guard looks at the door, and then at you, for a long time. "Line\'s that way," he says.', again: '"Line\'s that way."', options: [leave] },
  },
};

export const d_hc_coredoor_in: DialogueDef = {
  id: 'd_hc_coredoor_in', owner: 'narrator', start: [{ node: 'door' }],
  nodes: { door: { text: 'The core door, from inside. The hum is louder here.', again: 'The door.', options: [{ id: 'cdin.out', text: '(Back out to the gallery.)', effects: [GOTO('hc_works', 'gallery')], exit: true, repeat: true }, leave] } },
};

export const d_hc_lawal: DialogueDef = {
  id: 'd_hc_lawal', owner: LAWAL,
  start: [
    { if: { flag: 'hc_lawal', eq: 'dead' }, node: 'empty' },
    { if: { flag: 'hc_lawal', eq: 'free' }, node: 'free' },
    { if: { flag: 'hc_leash' }, node: 'after' },
    { if: { flag: 'hc_lawal_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'At the end of the aisle of breathing cabinets, a chair like a dentist\'s, and in it a broad grey man of sixty with no hair, in a cardigan, with cables going into the back of his neck and down his spine like roots into a pot. His eyes are open. He is very tired. "Forty-one years in this chair," he says, before you can say anything. "You\'re the designate. Every lens on the hill has been talking about you for a week; it\'s very loud in here." A little smile. "Femi. Mind the cables. They\'re me."',
      again: 'The keeper, in his chair.',
      effects: [{ set: 'hc_lawal_met' }, { learn: 'hc_lawal_told' }, { learn: 'hc_core_seen' }, { quest: 'q_hc_leash', start: true }],
      options: [{ id: 'lawal.what', text: 'What are you?', next: 'what' }, bye],
    },
    again: {
      text: '"Designate." Femi Lawal doesn\'t move his head; he can\'t, much.',
      again: 'Femi, in his chair.',
      options: [
        { id: 'lawal.what2', text: 'What are you?', if: { not: { seen: 'lawal.what' } }, next: 'what' },
        { id: 'lawal.why', text: 'Why did you sit down?', if: { all: [{ seen: 'lawal.what' }, { not: { seen: 'lawal.why' } }] }, next: 'why' },
        { id: 'lawal.stop', text: 'Can it be stopped?', if: { all: [{ seen: 'lawal.what' }, { not: { seen: 'lawal.stop' } }] }, next: 'stop' },
        { id: 'lawal.decide', text: 'I\'ve decided what happens to the leash.', if: { all: [{ seen: 'lawal.stop' }, LEASH_OPEN] }, next: 'decide' },
        bye,
      ],
    },
    what: {
      text: [
        { if: { flag: 'hs_leash_sold' }, text: '"The leash." He says it plainly; he has had forty-one years to find the plain word. "Every piece of the Concern\'s chrome has a door in it and a channel behind the door, and the channel comes here, into the lattice in my spine. I see whoever wears it. When the Window says so, I make a limb heavy, or a hand quiet. Jun Baek\'s arm at the Pond; I know it by its hum. When his balance falls behind, I put it to sleep, and I hear him swear." He breathes. "After the Scald the Board would not trust its leash to a machine. Machines do what they\'re told. A man can be made to, which isn\'t the same, and the Board likes the difference." Then: "A patch came down the channel a while ago. A door in a grid-hand\'s port, shut from this end, because somebody sold it. They had me do it. I felt her go dark and stay dark. I\'m sorry for whoever she was."' },
        { text: '"The leash." He says it plainly; he has had forty-one years to find the plain word. "Every piece of the Concern\'s chrome has a door in it and a channel behind the door, and the channel comes here, into the lattice in my spine. I see whoever wears it. When the Window says so, I make a limb heavy, or a hand quiet. Jun Baek\'s arm at the Pond; I know it by its hum. When his balance falls behind, I put it to sleep, and I hear him swear." He breathes. "After the Scald the Board would not trust its leash to a machine. Machines do what they\'re told. A man can be made to, which isn\'t the same, and the Board likes the difference."' },
      ],
      again: '"A man can be made to."',
      interject: [
        { companion: KES, text: 'Kes has gone white. "You," she says. "Every night when I go dark. That\'s you. The warm thing at the other end." Femi\'s eyes move to her slowly. "Ah," he says. "The girl in the Skirts who goes quiet at nine. I wondered what you looked like. I never told them, about the hour. I liked that somebody had an hour."', effects: [K(3)] },
        { companion: ASH, text: 'Ash touches the scar at his own nape. "I cut mine out," he says. "Did you feel it?" Femi looks at him for a long time. "Openfield. Six years ago. Yes," he says. "It was like a tooth coming out. I was glad for you."' },
      ],
      options: [back()],
    },
    why: {
      text: '"A contract." He almost laughs. "Tenure. A flat on the terraces for my wife and my two girls, our paper void, a citizen\'s place for each of them. I was a grid-hand at the Window like your Kes, and I had found a door, like your Kes, and the Board made me an offer. Page thirty." He looks at nothing. "My wife died twenty years ago, up here, renewed twice and then not. My girls are fifty and forty-eight and look thirty, and they haven\'t come down to the works in twenty years. I don\'t blame them. I wouldn\'t visit this either."',
      again: '"Page thirty."',
      effects: [{ learn: 'hc_kes_clause' }],
      options: [back()],
    },
    stop: {
      text: '"Three ways." He has thought about this every day for forty-one years and it shows; it comes out in order. "Burn the channel at the trunk, and every door in the Reach loses its voice at once. People fall where they stand when it goes; I don\'t know how many get up. If I\'m still on the end of it when it burns, it goes through me, and that\'s the end of me, which I don\'t mind as much as I should. Unless I burn it myself, slowly, from inside, letting it out of me a strand at a time, with somebody holding my head so I don\'t pull the cables out when it hurts. I have never had anybody to hold my head." He breathes. "Or cut the key out of my chair. The channel answers whoever holds the key. You could walk out of here with every Concern piece in the Reach in your pocket. Or leave it. Leave me. Somebody else will decide, eventually. Somebody always does."',
      again: '"I have never had anybody to hold my head."',
      options: [back()],
    },
    decide: {
      text: 'Femi waits. The cabinets breathe. The hum goes on, and you understand now that it is him, holding a note he has held for forty-one years.',
      again: 'Femi, waiting.',
      options: [
        { id: 'lawal.hold', text: '(Hold his head while he burns it himself.)', check: { skill: 'speech', dc: 50, mods: [{ if: KES_IN, dc: -10, why: 'Kes takes his other hand' }, { if: { skill: 'medicine', gte: 50 }, dc: -5, why: 'you know how to hold someone through pain' }] }, once: true, effects: [...CUT('keeper', 'You held the keeper\'s head while he burned the Concern\'s channel out of himself. Every Concern piece in the Reach lost its voice.'), { set: 'hc_lawal', value: 'free' }, K(5)], next: 'held', fail: 'hold_no' },
        { id: 'lawal.kes', text: '(Kes. Ride the channel and burn it from inside, round him.)', if: { all: [KES_IN, KES_JOINED] }, next: 'kes_ride' },
        { id: 'lawal.seize', text: '(Cut the keeper\'s key out of the chair. Hold the leash yourself.)', effects: [{ give: 'k_hc_leash_key' }, { set: 'hc_leash', value: 'seized' }, { set: 'leash_holder', value: 'player' }, { set: 'hc_lawal', value: 'free' }, K(-10), S(-5), N(-5), { rep: { faction: 'concern', fear: 20 } }, { decision: { id: 'hc_leash', text: 'You cut the keeper\'s key out of his chair. Every Concern piece in the Reach answers to you.' } }], next: 'seized' },
        { id: 'lawal.leave', text: '(Leave it. Leave him.)', effects: [{ set: 'hc_leash', value: 'left' }, K(-10), S(-10), { decision: { id: 'hc_leash', text: 'You left the Concern\'s leash in its keeper\'s spine, where you found it.' } }], next: 'left' },
        { text: '(Not yet.)', next: 'again' },
      ],
    },
    held: {
      text: 'You hold his head in both hands, and he closes his eyes and lets it out of himself, a strand at a time. It takes an hour. Across the core the cabinets go dark one aisle at a time; somewhere far off, through the floor, through the rock, every door in the Reach loses its voice. When the last strand goes he makes a sound like a man putting down something he has carried up a hill, and the hum stops. In the silence his breathing is very loud. "Quiet," he says. "It\'s so quiet. I\'d forgotten my own head."',
      again: 'The quiet core, and the keeper breathing.',
      options: afterCut('lawal.held.done'),
    },
    hold_no: {
      text: 'He starts, and it goes through him like a current, and his hands come up off the chair\'s arms for the cables and you can\'t hold him, and he stops, gasping, the hum louder than before. "Not yet," he says. "I\'m sorry. Not like that. I haven\'t got it in me." He doesn\'t ask again.',
      again: '"I haven\'t got it in me."',
      options: [back()],
    },
    kes_ride: {
      text: [
        { if: { flag: 'kes_link', eq: 'cut' }, text: 'Kes kneels by the trunk console. "I\'ve got no port," she says. "So I do it by hand, slow, the long way round, like a grid-hand did before anyone fitted us. Routes round him. Takes all night." She looks at Femi. "Nobody dies. Obviously."' },
        { if: { flag: 'kes_link', eq: 'dark' }, text: 'Kes kneels by the trunk console with two fingers on her own port. "Mine\'s dark to them," she says. "So I ride in quiet, find the channel, take it round him and burn it from the far end. If it notices me it\'ll take a bite on the way out." She looks at you. "Hold the channel still for me. You\'ll feel it. Don\'t let go."' },
        { text: 'Kes kneels by the trunk console with two fingers on her own port, and her hand is shaking. "Mine\'s still live," she says. "Still on the string. If I ride in and burn it, I\'m on the string when it goes." She makes herself grin. "Obviously I\'m the only one who can route it round him. And obviously I might not come back out. So. Hold the channel still. As still as you\'ve ever held anything."' },
      ],
      again: 'Kes at the trunk, two fingers on her own port.',
      options: [
        { id: 'kes.ride.cut', text: '(Do it, Kes.)', if: { flag: 'kes_link', eq: 'cut' }, effects: [{ set: 'hc_kes_rode' }, ...CUT('kes', 'Kes burned the Concern\'s channel by hand from the grid core, round its keeper. Every Concern piece in the Reach lost its voice.'), { set: 'hc_lawal', value: 'free' }, K(15)], next: 'kes_done' },
        { id: 'kes.ride.dark', text: '(Do it, Kes. Hold the channel quiet for her.)', if: { flag: 'kes_link', eq: 'dark' }, check: { skill: 'science', dc: 50, mods: [{ if: { flag: 'hc_core_door' }, dc: -10, why: 'the keeper\'s contract lets her in as the keeper' }] }, effects: [{ set: 'hc_kes_rode' }, ...CUT('kes', 'Kes rode the Concern\'s channel from the grid core and burned it round its keeper. Every Concern piece in the Reach lost its voice.'), { set: 'hc_lawal', value: 'free' }, K(15)], next: 'kes_done', fail: 'kes_bitten', failEffects: [{ set: 'hc_kes_rode' }, ...CUT('kes', 'Kes rode the Concern\'s channel from the grid core and burned it round its keeper. It bit her on the way out.'), { set: 'hc_lawal', value: 'free' }, { set: 'kes_fits' }, K(10)] },
        { id: 'kes.ride.live', text: '(Do it, Kes. Hold the channel as still as you have ever held anything.)', if: { not: { any: [{ flag: 'kes_link', eq: 'cut' }, { flag: 'kes_link', eq: 'dark' }] } }, check: { skill: 'science', dc: 60, mods: [{ if: { flag: 'hc_core_door' }, dc: -10, why: 'the keeper\'s contract lets her in as the keeper' }, { if: { approval: { companion: KES, gte: 50 } }, dc: -5, why: 'she trusts your hands' }] }, effects: [{ set: 'hc_kes_rode' }, ...CUT('kes', 'Kes rode the Concern\'s channel from the grid core with her own port still on it, and burned it round its keeper, and came back out.'), { set: 'hc_lawal', value: 'free' }, K(20)], next: 'kes_done', fail: 'kes_lost', failEffects: [{ set: 'hc_kes_rode' }, ...CUT('kes', 'Kes rode the Concern\'s channel from the grid core with her own port still on it, and burned it round its keeper.'), { set: 'hc_lawal', value: 'free' }, ...KES_DIES] },
        { text: '(Not like this. Not you.)', next: 'decide' },
      ],
    },
    kes_done: {
      text: 'It takes all of the night. Across the core the cabinets go dark an aisle at a time, and somewhere far off every door in the Reach loses its voice. When it is done Kes sits back on her heels and laughs, and keeps laughing, and Femi Lawal turns his head in his chair, for the first time in forty-one years further than an inch, to look at her. "Nobody\'s on the string," Kes says. "Nobody. Not me, not him, not Baek\'s arm, not anybody." She wipes her face. "Obviously."',
      again: 'Kes, laughing on the floor of the dark core.',
      options: afterCut('lawal.kes.done'),
    },
    kes_bitten: {
      text: 'Halfway, the channel notices her, and you feel it in your own hands: it turns on her like a dog on a leash. You hold on. She finishes it with blood coming out of her nose, and the core goes dark, and every door in the Reach loses its voice, and then Kes has a fit on the floor of the core, a bad one, and you hold her head the way you held the channel. When she comes back she says, "Bit me," and, "Worth it," and, "Ask me again tomorrow."',
      again: 'Kes, after the fit, on the core floor.',
      options: afterCut('lawal.kes.bitten'),
    },
    kes_lost: {
      text: 'She finds the channel and takes it round him and burns it, and you feel the moment it goes, because the whole core goes dark at once and every door in the Reach loses its voice, and Kes is still on the string when it burns. She doesn\'t make a sound. She sits back on her heels with her two fingers still on her port and her eyes open and something in them goes out, very gently, like a lamp somebody has turned down to save oil. Femi Lawal is crying in his chair. He is free. She did that. She is gone.',
      again: 'Kes, on the floor of the dark core.',
      interject: [
        { companion: TAMSIN, text: 'Tamsin kneels by her and closes her eyes, and holds her hand, and doesn\'t say anything, the way they did in the Cistern.', effects: [T(-5)] },
        { companion: ASH, text: 'Ash stands at the end of the aisle with his hand at the back of his own neck. "She knew," he says. "She knew and she did it." He doesn\'t move for a long time.' },
      ],
      options: afterCut('lawal.kes.lost'),
    },
    kes_fell: {
      text: 'And in the dark, a sound behind you: Kes, on the floor, fitting, her own port still on the channel when it burned. You get to her and hold her head. It goes on a long time. When she comes back she says, "Told you it was a string," and, "Worth it," and she has them now, the fits, at night, like everybody else in the Reach who wore the Concern\'s work and got up again.',
      again: 'Kes, after the fit.',
      options: [{ text: '(Help her up.)', exit: true }],
    },
    seized: {
      text: 'The key is a lattice token the size of a thumb set into the chair behind his head. It comes out with a sound like a tooth. Femi Lawal gasps, and his hands open on the chair\'s arms, and the hum stops, because it is not his any more. It is in your hand, warm, and through it, very faintly, you can feel all of them: every door in the Reach, waiting to be told. He gets up. It takes him a long time. "The gardens," he says. "I\'d like to see the gardens."',
      again: 'The key in your hand, warm.',
      interject: [{ companion: KES, text: 'Kes looks at the key in your hand for a long moment and doesn\'t say anything. With Kes, that is very loud.' }],
      options: [{ text: '(Put it away.)', exit: true }],
    },
    left: { text: 'Femi closes his eyes. "Yes," he says. "That\'s what everybody decides." The hum goes on.', again: 'The hum, going on.', options: [{ text: '(Leave.)', exit: true }] },
    after: { text: '"Designate." Femi, in his chair, holding his note. He doesn\'t ask you anything.', again: 'Femi, holding his note.', options: [bye] },
    free: {
      text: [
        { if: { at: 'hc_terrace' }, text: 'Femi Lawal on a bench in the gardens in his cardigan, with the scars on his neck open to the air, watching the rain come out of the pipes at four. "I could feel it from the chair," he says. "Every day. The citizens walking under it. I never once stood in it." He holds out his hand to the rain.' },
        { text: 'The keeper\'s chair, empty, the cables lying on the seat like something shed.' },
      ],
      again: 'Femi, in the rain.',
      options: [leave],
    },
    empty: { speaker: 'narrator', text: 'The keeper\'s chair, empty, burned black down one side, the cables melted into the seat. Nobody has cleaned it. Nobody comes down here now.', again: 'The burned chair.', options: [leave] },
  },
};

export const d_hc_trunk: DialogueDef = {
  id: 'd_hc_trunk', owner: 'narrator', start: [{ if: { flag: 'hc_leash', eq: 'cut' }, node: 'dark' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'The trunk: a cabinet the size of a car at the end of the core where every cable in the room comes together before it goes into the chair. A console on its face with the closed eye, and a maintenance locker with a red stripe: CUTTING CHARGES — AUTHORISED STAFF.',
      again: 'The trunk, where every cable meets.',
      options: [
        { id: 'trunk.burn', text: '(Burn the channel from the console.)', if: { all: [LEASH_OPEN, { not: { seen: 'trunk.burn' } }] }, check: { skill: 'science', dc: 60 }, effects: [...CUT('console', 'You burned the Concern\'s channel from the grid core\'s trunk, and it went through its keeper and killed him. Every Concern piece in the Reach lost its voice.'), { set: 'hc_lawal', value: 'dead' }, K(5)], next: 'burned', fail: 'burn_no' },
        { id: 'trunk.blow', text: '(Set the cutting charges on the trunk and blow it.)', if: { all: [LEASH_OPEN, { not: { seen: 'trunk.blow' } }] }, check: { skill: 'explosives', dc: 50 }, effects: [...CUT('blow', 'You blew the grid core\'s trunk. The keeper died in his chair, the Clean came running, and every Concern piece in the Reach lost its voice.'), { set: 'hc_lawal', value: 'dead' }, { set: 'hc_alarm' }], next: 'blown', fail: 'blow_no' },
        { id: 'trunk.key', text: '(Put the keeper\'s key into the console and burn the channel with it.)', if: { all: [{ item: 'k_hc_leash_key' }, { flag: 'hc_leash', eq: 'seized' }] }, effects: [{ take: 'k_hc_leash_key' }, ...CUT('key', 'You burned the Concern\'s channel with the keeper\'s key you had cut out of his chair. Every Concern piece in the Reach lost its voice.'), K(15)], next: 'keyed' },
        leave,
      ],
    },
    burned: {
      text: 'The console fights you, and then it doesn\'t. The channel burns from the trunk outward, an aisle at a time, and you feel it go out across the Reach like a breath let go. And it goes through the chair. Femi Lawal doesn\'t scream. He opens his mouth as if to say something courteous and the cables at his neck smoke, and he is still. The hum stops. In the quiet the cabinets tick as they cool.',
      again: 'The keeper, still, and the cabinets ticking.',
      options: afterCut('trunk.burned.done'),
    },
    burn_no: { text: 'The console takes your commands and gives them back to you, politely, one at a time, refused. On the chair, without turning his head, Femi says, "It knows me better than it knows you. It won\'t let you hurt me by accident."', again: 'Refused, politely.', options: [leave] },
    blown: {
      text: 'The charges are made for cutting steel and they cut it. The trunk goes up in a white flash that turns the core to noon, and the aisles go dark, and every door in the Reach loses its voice at once, and the keeper dies in his chair before the smoke reaches him. Then bells, everywhere, and boots on the gallery, and the Clean remembering what they are for.',
      again: 'The blown trunk, and bells.',
      options: afterCut('trunk.blown.done'),
    },
    blow_no: { text: 'You get the locker open and the charges out and your hands wrong on them, and you put them back before they decide for you. When you turn round the guard from the door is standing at the end of the aisle, very still, with his hand on his radio. He hasn\'t pressed it yet.', again: 'The guard, his hand on his radio.', options: [leave] },
    keyed: {
      text: 'The key goes into the console and the console knows it, and asks you, in the house\'s own tongue, what you would like. You tell it. The channel burns from the trunk outward, the way the keeper said it would, with nobody on the end of it. Every door in the Reach loses its voice at once. The key in the slot goes cold.',
      again: 'The cold key in the slot.',
      options: afterCut('trunk.keyed.done'),
    },
    dark: { text: 'The trunk, dark and cold. Nothing hums.', again: 'Nothing hums.', options: [leave] },
    kes_fell: {
      text: 'And in the dark, a sound behind you: Kes, on the floor, fitting, her own port still on the channel when it burned. You get to her and hold her head. It goes on a long time. When she comes back she says, "Told you it was a string," and, "Worth it," and she has them now, the fits, at night, like everybody else in the Reach who wore the Concern\'s work and got up again.',
      again: 'Kes, after the fit.',
      options: [{ text: '(Help her up.)', exit: true }],
    },
  },
};

export const HC_BOARD_DIALOGUES: DialogueDef[] = [
  d_hc_soto, d_hc_chair, d_hc_wray, d_hc_benedetti, d_hc_quill, d_hc_portraits, d_hc_boardtable, d_hc_lectern, d_hc_chairdoor, d_hc_chairdoor_in,
  d_hc_controllers, d_hc_line, d_hc_ono, d_hc_coredoor, d_hc_coredoor_in, d_hc_lawal, d_hc_trunk,
];
