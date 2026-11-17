import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { LEASHED } from '../chrome/catalogue';
import { QUESTS } from '../quests';
import { A, ASH, ILYA, K, KES, KES_IN, NINE, ODILE, PROOF, SCABS_GONE, TAMSIN, WREN, bye } from './hs_skirts';
import { KES_GUILD_NODES, KES_GUILD_START } from './a3_fire';

/**
 * Kes Oyelaran (npc_hs_01), the seventh companion (U8; story/U8_kes_SECRET.md): a grid-hand at the Window with a Concern
 * port at her nape, the Shift's organiser, and the one person in the Skirts who has found the door in the Concern's chrome.
 * Her tree: the hail and the first meeting, joining, the road, camp (four stages, light talk, two exchanges with other
 * companions), the romance, leaving and coming back. Her own quest's routes are at Lev Ostrander's table and the Window's
 * exchange (hs_parts.ts); her red line can be crossed at Agnes Bell's counter and in front of Rafe (hs_skirts.ts).
 */

const CAMP: Cond = { flag: 'at_camp' };
const kApp = (gte: number): Cond => ({ approval: { companion: KES, gte } });
const N = (by: number): Effect => A(NINE, by);
const O = (by: number): Effect => A(ODILE, by);
/** Her quest opens once it is registered (quests/index.ts); until then her arc runs on flags alone. */
const OPEN_SLACK: Effect[] = QUESTS.q_comp_kes ? [{ quest: 'q_comp_kes', start: true }] : [];
/** Something done for the Shift that she has watched. */
const HELPED: Cond = { any: [PROOF, { flag: 'hs_pim_word' }, SCABS_GONE, { flag: 'hs_dead_up' }, { flag: 'hs_shift' }, { flag: 'hs_claim_ok' }] };
/** The Shift's strike is over, one way or another (it always ends: by the player's hand, or the milestone B4b sets). */
const SHIFT_SETTLED: Cond = { flag: 'hs_shift' };
const ONE_SETTLED: Cond = { any: [{ flag: 'hs_shift' }, { flag: 'hs_parts' }] };
const ROM_ON: Cond = { any: ['yes', 'later_dark', 'dark', 'committed'].map((v) => ({ flag: 'kes_rom', eq: v })) };
const ROM_FREE: Cond = { any: [{ not: { flag: 'romance_partner' } }, { flag: 'romance_partner', eq: KES }] };
const LINK_SET: Cond = { any: ['cut', 'dark', 'kept'].map((v) => ({ flag: 'kes_link', eq: v })) };
/** The things she will not walk beside. */
const SOLD_STRIKE: Cond = { flag: 'hs_sold_out' };
const SOLD_NAME: Cond = { flag: 'hs_parts', eq: 'profit' };
const SOLD_DOOR: Cond = { flag: 'hs_leash_sold' };
const HANDED: Cond = { flag: 'hs_leash_rafe' };
const FLOOR: Cond = { approval: { companion: KES, lte: -20 } };

const JOIN: Effect[] = [{ join: KES }, { set: 'kes_joined' }, K(10), { decision: { id: 'kes_joined', text: 'Kes Oyelaran, a grid-hand at the Window, walks with you.' } }];
const GONE = (why: string, text: string): Effect[] => [{ leave: KES }, { set: 'kes_left', value: why }, { set: 'kes_rom', value: 'ended' }, { decision: { id: 'kes_left', text } }];
const COMMIT = (text: string): Effect[] => [{ set: 'kes_rom', value: 'committed' }, { set: 'romance_partner', value: KES }, K(5), { decision: { id: 'kes_committed', text } }];
const rest = { text: 'Rest.', exit: true };

export const d_hs_kes: DialogueDef = {
  id: 'd_hs_kes', owner: KES,
  start: [
    // the things she will not walk beside come before anything she would say
    { if: { all: [{ any: [SOLD_STRIKE, SOLD_NAME] }, { flag: 'kes_joined' }, { not: { flag: 'kes_left' } }] }, node: 'c_betrayed' },
    { if: { all: [SOLD_DOOR, { not: { flag: 'kes_left' } }] }, node: 'c_sold' },
    { if: { all: [HANDED, { not: { flag: 'kes_left' } }] }, node: 'c_handed' },
    KES_GUILD_START,
    { if: { all: [KES_IN, CAMP, FLOOR] }, node: 'c_floor' },
    { if: { all: [KES_IN, CAMP, ROM_ON, { approval: { companion: KES, lte: 30 } }] }, node: 'c_rom_end' },
    { if: { all: [KES_IN, CAMP] }, node: 'camp' },
    { if: KES_IN, node: 'party' },
    { if: { flag: 'kes_left' }, node: 'left' },
    { if: { all: [{ not: { flag: 'kes_joined' } }, { any: [{ flag: 'kes_refused' }, SOLD_STRIKE, SOLD_NAME] }] }, node: 'refused' },
    { if: { flag: 'kes_joined' }, node: 'waiting' },
    { if: { flag: 'kes_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    // ---------------------------------------------------------------- meeting her
    intro: {
      text: 'A young woman sitting cross-legged on the highest thing within reach, with a cable running from the back of her neck into a box on her knee, goggles pushed up into short coils of hair, a miner\'s jacket cut down to fit. She doesn\'t look up from the box. "You read my board." Then she does look up, and grins. "Obviously you did. You\'re lit up like the gardens. Every lens on the slope turns when you walk past it." She unplugs the cable with a click. "Kes. I keep the Window\'s eyes working. Mostly."',
      again: 'Kes, the cable coiled on her knee.',
      effects: [{ set: 'kes_met' }, { learn: 'kes_met' }],
      options: [
        { id: 'kes.hail', text: 'You wrote on the Line board.', next: 'hail' },
        { id: 'kes.why', text: 'Why do you care what the Concern wants with me?', next: 'why' },
        { id: 'kes.list', text: 'The city has a list with Maren on it.', if: { knows: 'name12_decoded' }, next: 'list' },
      ],
    },
    hail: { text: '"Every board on the slope is mine. The Line board\'s the only one with a view." She brags it, then shrugs. "The Window doesn\'t read its own boards. Nobody does. I could write the Board\'s birthdays up there and nobody\'d notice but the goats."', again: '"Nobody reads the boards but the goats."', options: [{ text: 'Go on.', next: 'why' }] },
    why: {
      text: '"Because the Letter has your name on a list I keep the lens for, and the list says THE BOARD\'S GUEST, and the Board doesn\'t have guests." She swings her legs. "The Board has the Skirts. Contracts, scrip, the Weighhouse, the car. When it wants a thing it hasn\'t got, it sends for it. So: what are you, that it hasn\'t got?" She waits, and when you don\'t answer she nods as if you had. "Fine. Here\'s a trade. The Shift\'s eleven under Six East. Help with that, and I\'ll get you places the car doesn\'t go. I can open things. You can walk past things. Obviously we should be the same person."',
      again: '"I open things. You walk past things."',
      effects: [{ learn: 'kes_trade' }],
      options: [
        { id: 'kes.deal', text: 'Deal.', effects: [{ set: 'kes_deal' }], next: 'deal' },
        { id: 'kes.now', text: 'Come with me now. You\'re safer next to the one the Clean can\'t touch.', check: { skill: 'speech', dc: 50 }, effects: JOIN, next: 'joined', fail: 'not_yet', once: true },
        { text: 'I\'ll think about it.', next: 'again' },
      ],
    },
    list: {
      text: 'You tell her: OKAFOR, MAREN — THE SKIRTS — STRIKE BROKEN; HANGED (THE CONCERN). She goes very still. Then: "The city\'s never been in here. Its lenses stop at the Line. It can\'t see the Window\'s grid and it can\'t see me." A grin with no fun in it. "Obviously it got it wrong. It\'s guessing from outside the fence."',
      again: '"It\'s guessing from outside the fence."',
      effects: [{ learn: 'kes_knows_line' }, { learn: 'kes_blind_spot' }],
      interject: [{ companion: NINE, text: '"It does not guess," Nine says. "It models. From faces." Its lens rests on her, longer than is polite. "I cannot find you in the model. I have been trying since we came up the Line." Kes looks delighted. "Obviously," she says.' }],
      options: [{ text: 'Go on.', next: 'why' }],
    },
    deal: { text: '"Deal." She spits in her palm and holds it out, then looks at it, and wipes it on her jacket, and holds it out again. "Skirts manners. Sorry." She shakes. "Find out what happened to the eleven. Then come and find me."', again: '"Find out what happened to the eleven."', options: [bye] },
    not_yet: { text: '"Not yet." She plugs the cable back in. "I don\'t walk with people I haven\'t watched. Do a thing for the Shift and I\'ll have watched you."', again: '"Do a thing for the Shift."', options: [bye] },
    again: {
      text: [
        { if: HELPED, text: 'Kes, swinging her legs. "I watched you," she says. "Down the cage, or at the counter, or wherever. I watch everything." She grins. "So?"' },
        { text: 'Kes, with the cable in her neck and the box on her knee. "Still lit up," she says, without looking.' },
      ],
      again: 'Kes, with the box on her knee.',
      options: [
        { id: 'kes.walk', text: 'Walk with me.', if: { all: [HELPED, { approval: { companion: KES, gte: -10 } }] }, effects: JOIN, next: 'joined' },
        { id: 'kes.why2', text: 'Why do you care what the Concern wants with me?', if: { not: { seen: 'kes.why' } }, next: 'why' },
        { id: 'kes.list2', text: 'The city has a list with Maren on it.', if: { all: [{ knows: 'name12_decoded' }, { not: { seen: 'kes.list' } }] }, next: 'list' },
        bye,
      ],
    },
    joined: {
      text: '"Right." She coils the cable and puts the box in her jacket, and hops down. "I\'ve two years left on the Window\'s paper and nobody up there will notice I\'m not at my desk until a board breaks." She looks at you sideways. "Don\'t make me regret it. I regret things loudly."',
      again: 'Kes, at your shoulder.',
      interject: [{ companion: TAMSIN, text: '"You talk to the boards?" Tamsin says. "I talk to a fridge. It\'s called MOTHER." Kes looks at her for one second and then they are both laughing, and it is somehow already decided that they are friends.', effects: [A(TAMSIN, 3), K(3), { learn: 'kes_tamsin_friends' }] }],
      options: [{ text: 'Keep up.', exit: true }],
    },
    refused: {
      text: [
        { if: SOLD_STRIKE, text: 'Kes doesn\'t get up. "Somebody told the Tonnage where the committee sat." She doesn\'t look at you. "I watch everything. Go away."' },
        { if: SOLD_NAME, text: 'Kes doesn\'t get up. "You sold the Scales a name." Flat. "I keep her board. I saw it go up. Go away."' },
        { text: '"No." She doesn\'t look up from the box.' },
      ],
      again: 'Kes, not looking up.',
      options: [bye],
    },

    // ---------------------------------------------------------------- on the road
    party: {
      text: [
        { if: { at: 'hs_skirts' }, text: 'Kes walks a half-step ahead of you, touching things: a lamp post, a stall\'s board, the Line\'s rail. Every lens on Cascade looks at you and then, as she passes, looks away. "Obviously nobody saw that," she says.' },
        { if: { at: 'hs_six' }, text: 'Kes holds the lamp up to the roof and listens to it the way she listens to a board that is about to go. "Don\'t touch anything that ticks," she says. "Obviously."' },
        { if: { at: 'md_precinct' }, text: '"The Ledger\'s town." Kes looks up at the Wall\'s lenses with real interest. "They can\'t see me. I\'m waving. Look." She is.' },
        { text: '"No lenses." Kes looks round at the open country as if it were a room nobody has wired yet. "I don\'t know where to put my hands."' },
      ],
      again: 'Kes, touching things as she passes them.',
      options: [
        { id: 'kes.p.wait', text: 'Wait here for me.', effects: [{ leave: KES }], exit: true, repeat: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    waiting: {
      text: '"Back." Kes is on her feet before you reach her, box in her jacket. "Where?"',
      again: 'Kes, box in her jacket.',
      options: [{ id: 'kes.w.go', text: 'We\'re going.', effects: [{ join: KES }], exit: true, repeat: true }, { text: 'Wait a while longer.', exit: true }],
    },

    // ---------------------------------------------------------------- at a fire
    camp: {
      text: [
        { if: { approval: { companion: KES, lte: 4 } }, text: 'Kes sits with her back to the fire and the box on her knee, the cable in her neck, and doesn\'t talk to you. With Kes that is very loud.' },
        { if: { flag: 'kes_link', eq: 'cut' }, text: 'Kes sits close to the fire with her hand on the dressing at the back of her neck, as if checking it is still quiet. "Nothing in there," she says. "Weird. Good weird."' },
        { text: 'Kes sits cross-legged by the fire, winding a length of cable round her fingers and off again. "Fire\'s a terrible light source," she says. "Obviously I love it."' },
      ],
      again: 'Kes, winding the cable.',
      options: [
        // her arc, one conversation a stage
        { id: 'kes.c.s1', text: '(She is winding a cable round her fingers. Sit with her.)', if: { all: [{ not: { flag: 'kes_s1' } }, kApp(5)] }, next: 's1' },
        { id: 'kes.c.s2', text: 'You go quiet at the same hour every night.', if: { all: [{ flag: 'kes_s1' }, ONE_SETTLED, { not: { flag: 'kes_s2' } }, kApp(25)] }, next: 's2' },
        { id: 'kes.c.s3', text: 'What do you want, Kes? For you.', if: { all: [{ flag: 'kes_s2' }, SHIFT_SETTLED, { not: { flag: 'kes_s3' } }, kApp(35)] }, next: 's3' },
        { id: 'kes.c.link', text: 'Your link. Have you decided?', if: { all: [{ flag: 'kes_s3' }, { not: { flag: 'kes_link' } }, { not: SOLD_DOOR }] }, next: 'link' },
        { id: 'kes.c.s4', text: 'You\'ve been listening to something.', if: { all: [LINK_SET, { not: { flag: 'kes_s4' } }, kApp(45)] }, next: 's4' },
        // romance: she asks, every step, and any answer is allowed
        { id: 'kes.c.r1', text: '(She keeps looking at you over the fire, and then away.)', if: { all: [{ flag: 'kes_s1' }, { not: { flag: 'kes_rom' } }, kApp(30), ROM_FREE] }, next: 'r1' },
        { id: 'kes.c.r1b', text: '(She is looking at you over the fire again.)', if: { all: [{ flag: 'kes_rom', eq: 'later' }, { flag: 'kes_s2' }, kApp(30), ROM_FREE] }, next: 'r1b' },
        { id: 'kes.c.r2', text: '(She turns her back to you and pulls her collar down.)', if: { all: [{ flag: 'kes_rom', eq: 'yes' }, { flag: 'kes_s2' }, kApp(40), ROM_FREE] }, next: 'r2' },
        { id: 'kes.c.r2b', text: '(It\'s the dark hour again. She looks at you.)', if: { all: [{ flag: 'kes_rom', eq: 'later_dark' }, { flag: 'kes_s3' }, kApp(40), ROM_FREE] }, next: 'r2b' },
        { id: 'kes.c.r3', text: 'You\'ve been chewing on something.', if: { all: [{ flag: 'kes_rom', eq: 'dark' }, { flag: 'kes_s3' }] }, next: 'r3' },
        // the others at the fire
        { id: 'kes.c.nine', text: '(Nine\'s lens is on Kes. Kes is doing something to the nearest lamp.)', if: { all: [{ inParty: NINE }, { flag: 'kes_s1' }, { not: { seen: 'kes.c.nine' } }] }, next: 'x_nine' },
        { id: 'kes.c.odile', text: '(Odile is reading by the fire. Kes is watching her read.)', if: { all: [{ inParty: ODILE }, { not: { seen: 'kes.c.odile' } }] }, next: 'x_odile' },
        { id: 'kes.c.ash', text: '(Ash is looking at the cable in Kes\'s neck.)', if: { all: [{ inParty: ASH }, { flag: 'kes_s3' }, { not: { flag: 'kes_link' } }, { not: { knows: 'kes_ash_word' } }] }, next: 'x_ash' },
        // lighter talk
        { id: 'kes.c.gardens', text: 'You keep looking up the hill.', if: { not: { seen: 'kes.c.gardens' } }, next: 't_gardens' },
        { id: 'kes.c.mother', text: 'Who signed your paper to the Window?', if: { all: [{ flag: 'kes_s1' }, { not: { seen: 'kes.c.mother' } }] }, next: 't_mother' },
        { id: 'kes.c.chrome', text: '(She is looking at the back of your neck.)', if: { all: [LEASHED, { not: { seen: 'kes.c.chrome' } }] }, next: 't_chrome' },
        { id: 'kes.c.tamsin', text: '(Tamsin is telling Kes about MOTHER again.)', if: { all: [{ inParty: TAMSIN }, { not: { seen: 'kes.c.tamsin' } }] }, next: 't_fridge' },
        { id: 'kes.c.wren', text: 'What do you make of Wren?', if: { all: [{ inParty: WREN }, { not: { seen: 'kes.c.wren' } }] }, next: 't_wren' },
        { id: 'kes.c.ilya', text: 'What do you make of Ilya?', if: { all: [{ inParty: ILYA }, { not: { seen: 'kes.c.ilya' } }] }, next: 't_ilya' },
        rest,
      ],
    },

    // stage 1 — the Shift
    s1: {
      text: 'She winds the cable round three fingers and off again. "Maren took me in when my mother died. Eighteen. I had a port in my neck and a debt on my paper and I thought organising was a word for tidying." She laughs at herself. "She sat me at the long table and made me count who\'d eaten. Every night. Two years. Then one night she said: right, you know who everybody is, now we can start." She looks at you. "So. What\'s the strike for? Your words. Not Maren\'s."',
      again: '"Your words. Not Maren\'s."',
      effects: [{ set: 'kes_s1' }],
      options: [
        { id: 'kes.s1.together', text: 'So you go up together, or nobody goes.', effects: [K(5)], next: 's1_together' },
        { id: 'kes.s1.theirs', text: 'It\'s for whatever the Shift decides it\'s for.', effects: [K(3)], next: 's1_theirs' },
        { id: 'kes.s1.hanged', text: 'Strikes get people hanged.', effects: [K(-3)], next: 's1_hanged' },
        { id: 'kes.s1.list', text: 'The city has Maren on a list. Strike broken; hanged.', if: { all: [{ knows: 'name12_decoded' }, { not: { knows: 'kes_knows_line' } }] }, next: 's1_list' },
      ],
    },
    s1_together: { text: '"Her line." She grins. "You stole her line. Good. It\'s a good line; it should get around." She winds the cable on. "It\'s also true, which is rarer."', again: '"It\'s also true."', options: [rest] },
    s1_theirs: { text: '"Huh." She considers you. "Most people from outside come up the Line with an answer. You came up with a question." She looks pleased and annoyed about it. "Fine."', again: '"You came up with a question."', options: [rest] },
    s1_hanged: { text: '"Everybody\'s forecast\'s hanged. That\'s the Skirts." She doesn\'t look up. "That\'s why you organise. So it takes them longer, and costs them more, and they have to do it in front of everyone."', again: '"So it takes them longer."', options: [rest] },
    s1_list: {
      text: 'She listens all the way through with the cable gone still in her fingers. "It can\'t see in here," she says at last. "The Window\'s grid is Halcyon\'s; the Ledger\'s lenses stop at the Line. And it can\'t see me." She almost laughs. "Obviously it got it wrong. It\'s guessing from outside the fence." Then, quieter: "Unless it isn\'t."',
      again: '"Unless it isn\'t."',
      effects: [{ learn: 'kes_knows_line' }, { learn: 'kes_blind_spot' }],
      options: [rest],
    },

    // stage 2 — the backdoor
    s2: {
      text: 'For a while she pretends not to have heard. Then she puts the cable down. "There\'s a door in every piece of their chrome. A channel nobody\'s supposed to know about, that runs up the hill. Through it they can see you, wherever you are. Numb you. Switch you off. Ask Baek about his arm." She touches the back of her neck. "I found it in mine when I was nineteen. And I turned it round. For an hour a night it looks the other way, and nobody on the hill can see me." She shrugs, too hard. "That\'s when the Shift meets. That\'s why the lenses go blind at the Lodge. That\'s me."',
      again: '"That\'s me."',
      effects: [{ set: 'kes_s2' }, { learn: 'kes_backdoor' }],
      options: [
        { id: 'kes.s2.keep', text: 'Then it\'s yours. Nobody hears it from me.', effects: [K(5)], next: 's2_keep' },
        { id: 'kes.s2.show', text: 'Show me.', effects: [K(2)], next: 's2_show' },
        { id: 'kes.s2.weapon', text: 'That\'s a weapon, Kes.', effects: [K(-5)], next: 's2_weapon' },
        { id: 'kes.s2.me', text: 'I\'m wearing their chrome. Can you do it for me?', if: LEASHED, effects: [K(3), { set: 'kes_slacked_pc' }], next: 's2_me' },
      ],
    },
    s2_keep: { text: '"Good." Something in her shoulders comes down an inch. "Nobody ever says that. They say, think what you could do with it." She looks up the hill. "Rafe would switch off every Concern piece on the slope at once, including Baek\'s arm and half the Shift\'s spines. Somebody up the hill would switch them off one at a time, on purpose." Very level: "If you ever give it to anyone, I\'m gone. That\'s not a threat. It\'s a timetable."', again: '"It\'s a timetable."', effects: [{ set: 'kes_redline_said' }], options: [rest] },
    s2_show: { text: 'She touches the back of her neck and does something you can\'t see, and the night gets a degree quieter, the way a room does when a machine you hadn\'t noticed stops. "There," she says. "Nobody\'s looking. For an hour." She lies back by the fire with her hands under her head. "This is the best hour of the day. Obviously."', again: '"The best hour of the day."', options: [rest] },
    s2_weapon: { text: '"It\'s a door." Sharp. "People keep calling doors weapons. It\'s a door they put in me without asking, and I found the handle." She picks the cable up again. "If you ever give it to anyone, I\'m gone. Remember I said."', again: '"Remember I said."', effects: [{ set: 'kes_redline_said' }], options: [rest] },
    s2_me: { text: '"Yours is lit up like the gardens." She gets behind you and puts two fingers on the back of your neck, light, and does something. "There. An hour a night. Mine and yours." She sits back down. "Don\'t tell anyone. Obviously."', again: '"An hour a night. Mine and yours."', options: [rest] },

    // stage 3 — slack (opens her quest)
    s3: {
      text: '"One day." She says it to the fire. "That\'s all. One whole day without the hill in the back of my neck, not an hour I have to steal." She turns the cable over. "It\'s in the top of my spine. Cut it wrong and it takes you with it; that\'s what the Scald was, mostly. The Pale cut theirs out with knives and half of them died." She makes herself look at you. "Lev on Nursery might. Somebody who\'s cut their own and lived might know how. Or I go into the Window at night with someone holding the other end, and turn the door on myself for good." A breath. "I\'m scared of it. Obviously. Help me anyway?"',
      again: '"Help me anyway?"',
      effects: [{ set: 'kes_s3' }, { learn: 'kes_wants_slack' }, ...OPEN_SLACK],
      options: [
        { id: 'kes.s3.way', text: 'I\'ll find you a way.', effects: [K(5)], next: 's3_way' },
        { id: 'kes.s3.risk', text: 'Is it worth the risk?', next: 's3_risk' },
        { id: 'kes.s3.use', text: 'Keep it. It\'s too useful to lose.', effects: [K(-10)], next: 's3_use' },
      ],
    },
    s3_way: { text: '"Right." She wipes her face with the heel of her hand, fast, as if it had been smoke. "Right. Good." She doesn\'t say anything else for a while, and doesn\'t need to.', again: 'Kes, looking at the fire.', options: [rest] },
    s3_risk: { text: '"I don\'t know." Honest, which costs her. "Ask me on the day. Ask me twice."', again: '"Ask me twice."', options: [rest] },
    s3_use: { text: '"Useful." She tests the word. "Yes. To everybody but me." She turns round to face the dark.', again: 'Her back, and the dark.', options: [rest] },
    link: {
      text: '"Lev\'s table. The Window at night. Or I keep it." She has obviously been over it a hundred times. "Tell me what you think. I\'ll still choose."',
      again: '"I\'ll still choose."',
      options: [
        { id: 'kes.link.keep', text: 'It\'s yours. If you want to keep it, keep it.', effects: [{ set: 'kes_link', value: 'kept' }, K(3), { decision: { id: 'kes_link', text: 'Kes decided to keep the Concern\'s port in her neck, and her sight on the grid with it.' } }], next: 'kept' },
        { id: 'kes.link.shift', text: 'The Shift needs your sight. Keep it for them.', effects: [{ set: 'kes_link', value: 'kept' }, K(-10), { decision: { id: 'kes_link', text: 'Kes kept the Concern\'s port in her neck, because you said the Shift needed her sight.' } }], next: 'kept_use' },
        { text: 'I\'m still looking. Lev, or the Window.', next: 'camp' },
      ],
    },
    kept: { text: '"I\'ll keep it." She sounds surprised to hear herself. "I know what it is now. That\'s different from not knowing." She touches the back of her neck. "An hour a night\'s mine. The rest I\'ll fight for."', again: '"An hour a night\'s mine."', options: [rest] },
    kept_use: { text: '"Everybody needs my sight." She plugs the cable back into the box, click. "Fine. I\'ll keep it." She doesn\'t look at you again tonight.', again: 'The cable, plugged into the box.', options: [rest] },

    // stage 4 — the lineage
    s4: {
      text: [
        { if: { flag: 'kes_link', eq: 'cut' }, text: '"Before Lev cut it I recorded the door. Everything that came through it, a year of it." She has a notebook, which you have never seen her use. "It talks old. Their channel. It\'s not the Window\'s grid; it\'s older. The same tongue the dead machines in the Ashlands answer to, if you know how to say it." She turns a page. "And it\'s signed. Every order down it is signed, and the signatures carry dates. Ninety years dead. More. Somebody up there signs their orders in a hand from before the Burn."' },
        { text: '"I\'ve been listening to the door." She doesn\'t look up from the cable. "It talks old. Their channel. It\'s not the Window\'s grid; it\'s older. The same tongue the dead machines in the Ashlands answer to, if you know how to say it." She winds the cable tighter. "And it\'s signed. Every order down it is signed, and the signatures carry dates. Ninety years dead. More. Somebody up there signs their orders in a hand from before the Burn."' },
      ],
      again: '"Somebody up there signs in a hand from before the Burn."',
      effects: [{ set: 'kes_s4' }, { learn: 'kes_old_hand' }],
      options: [{ id: 'kes.s4.on', text: 'What does that mean you can do?', next: 's4_lineage' }],
    },
    s4_lineage: {
      text: '"Talk to it." Simply. "In its own language. The house on the hill has been talking down that door to everybody wearing its chrome for ninety years, and nobody\'s ever answered back." A grin, not much fun in it. "I could. Obviously."',
      again: '"I could."',
      options: [
        { id: 'kes.s4.speak', text: 'Then when we go up, we answer it.', effects: [{ set: 'kes_lineage', value: 'speak' }, K(3)], next: 's4_after' },
        { id: 'kes.s4.silent', text: 'Then keep quiet. Let them think nobody can.', effects: [{ set: 'kes_lineage', value: 'silent' }, K(3)], next: 's4_after' },
        { id: 'kes.s4.yours', text: 'That\'s yours to decide.', effects: [{ set: 'kes_lineage', value: 'speak' }, K(5)], next: 's4_after' },
      ],
    },
    s4_after: {
      text: '"After." She tries the word. "Nobody up here plans an after; the Window plans it for you." She draws in the dirt with the end of the cable: a pithead, a road, a hill with a dome on it. "The Shift. The road. Or up there, in the gardens, with the orange tree, just to see if it still smells like nothing." She looks up. "Say what you think. I\'ll still choose."',
      again: 'A pithead, a road and a hill, drawn in the dirt.',
      options: [
        { id: 'kes.s4.shift', text: 'The Shift. They\'ll need you.', effects: [{ set: 'kes_after', value: 'shift' }, K(3)], next: 's4_end' },
        { id: 'kes.s4.road', text: 'The road. With me.', effects: [{ set: 'kes_after', value: 'road' }, K(3)], next: 's4_end' },
        { id: 'kes.s4.gardens', text: 'The gardens. You\'ve earned an orange tree.', effects: [{ set: 'kes_after', value: 'gardens' }, K(3)], next: 's4_end' },
      ],
    },
    s4_end: { text: 'She rubs out two of the three drawings with her boot and leaves one, and doesn\'t tell you which until you look. "Nobody\'s ever let me say before," she says. "Obviously I\'m going to be insufferable about it."', again: 'One drawing left in the dirt.', options: [rest] },

    // ---------------------------------------------------------------- the romance
    r1: {
      text: '"I\'m going to say a thing and you can say no." She doesn\'t wind the cable; she holds it still. "I like you. Not grid-like. Like-like." She makes a face at herself. "There. Said it. Obviously I could\'ve said it better. You don\'t have to answer tonight."',
      again: '"You don\'t have to answer tonight."',
      options: [
        { id: 'kes.r1.yes', text: 'I like you too. Like-like.', effects: [{ set: 'kes_rom', value: 'yes' }, K(5)], next: 'r1_yes' },
        { id: 'kes.r1.later', text: 'Not tonight. Ask me again.', effects: [{ set: 'kes_rom', value: 'later' }], next: 'r1_later' },
        { id: 'kes.r1.no', text: 'Not like that, Kes.', effects: [{ set: 'kes_rom', value: 'no' }], next: 'r1_no' },
      ],
    },
    r1b: {
      text: '"Asking again." She holds up two fingers. "Second time. Like you said. Still allowed to be no."',
      again: '"Still allowed to be no."',
      options: [
        { id: 'kes.r1b.yes', text: 'It\'s a yes.', effects: [{ set: 'kes_rom', value: 'yes' }, K(5)], next: 'r1_yes' },
        { id: 'kes.r1b.no', text: 'It\'s a no. Not because of you.', effects: [{ set: 'kes_rom', value: 'no' }], next: 'r1_no' },
      ],
    },
    r1_yes: { text: '"Oh." She looks genuinely startled, then extremely pleased with herself. "Good. Good. I had a whole second speech." She sits next to you instead of across the fire, and talks about the gardens for an hour, and you let her.', again: 'Kes, beside you instead of across the fire.', options: [rest] },
    r1_later: { text: '"Fine. Asking again later. I\'m very good at asking." She goes back to the cable, and the cable is somehow cheerful about it.', again: 'Kes and the cable.', options: [rest] },
    r1_no: { text: '"Right. Good. Clear." She nods several times. "That\'s fine. Obviously that\'s fine." In the morning she is exactly as she always is, which she has clearly decided to be.', again: 'Kes, exactly as she always is.', options: [rest] },
    r2: {
      text: [
        { if: { flag: 'kes_link', eq: 'cut' }, text: 'She pulls her collar down. Where the port was there is a puckered scar and Lev\'s neat stitches. "Touch it," she says. "Go on." You do. "There\'s nothing there now," she says, "and I still feel it twice. Once in the skin, once where their log was." She turns round. "I don\'t have to steal an hour any more. I\'d still like to spend one with you. Say if you don\'t want to."' },
        { text: 'She pulls her collar down. The port at the top of her spine, a ring of dull metal with the cable seated in it, and the skin round it pale and too smooth. "Touch it," she says. "Go on." You do. She shivers. "I feel that twice. Once in the skin and once in their log. Somewhere up the hill it says where your hand is." She touches her own neck and the night goes a degree quieter. "There. Now it doesn\'t. That\'s my hour." She turns round. "I\'d like to spend it with you. Say if you don\'t want to."' },
      ],
      again: 'Kes, with her collar down, waiting for an answer.',
      options: [
        { id: 'kes.r2.yes', text: 'I want to.', effects: [{ set: 'kes_rom', value: 'dark' }, K(10), { decision: { id: 'kes_dark_hour', text: 'You spent Kes\'s dark hour with her.' } }], next: 'r2_fade' },
        { id: 'kes.r2.later', text: 'Not tonight. I\'ll sit the hour with you, though.', effects: [{ set: 'kes_rom', value: 'later_dark' }], next: 'r2_sit' },
        { id: 'kes.r2.no', text: 'I don\'t want this, Kes.', effects: [{ set: 'kes_rom', value: 'no' }], next: 'r2_no' },
      ],
    },
    r2b: {
      text: '"Dark hour." She doesn\'t say anything else. She doesn\'t have to.',
      again: 'The dark hour.',
      options: [
        { id: 'kes.r2b.yes', text: '(Go to her.)', effects: [{ set: 'kes_rom', value: 'dark' }, K(10), { decision: { id: 'kes_dark_hour', text: 'You spent Kes\'s dark hour with her.' } }], next: 'r2_fade' },
        { id: 'kes.r2b.no', text: 'It\'s a no. I\'m sorry.', effects: [{ set: 'kes_rom', value: 'no' }], next: 'r2_no' },
      ],
    },
    r2_fade: { text: 'She kisses you like she does everything, fast and showing off, and then not fast at all and not showing off. For an hour nobody on the hill knows where she is, and for an hour she doesn\'t care where the hill is either. Afterwards she lies with her head on your chest and says, "Obviously that was better than I said it would be," and is asleep before you can answer.', again: 'Kes, asleep with her head on your chest.', options: [{ text: '(Morning.)', exit: true }] },
    r2_sit: { text: '"Fine." She leans on your shoulder for the hour instead, and tells you about the orange tree again, and when the hour is up she sits up and says, "Thanks," and means more than the word holds.', again: 'Kes, leaning on your shoulder for the hour.', options: [rest] },
    r2_no: { text: '"Okay." She pulls her collar up. "Okay. Clear." She doesn\'t make it strange, which you can see costs her something.', again: 'Kes, collar up.', options: [rest] },
    r3: {
      text: '"I don\'t do slow." She is very serious for once, which looks wrong on her. "So: are we a thing? A real one, out loud, where I tell Rosa and she pours me a free one and pretends she isn\'t pleased." She waits. "You can say no. I\'ll still be insufferable."',
      again: '"Are we a thing?"',
      options: [
        { id: 'kes.r3.yes', text: 'We\'re a thing. Tell Rosa.', effects: COMMIT('You told Kes you were a thing, out loud.'), next: 'r3_yes' },
        { id: 'kes.r3.road', text: 'We\'re a thing. Wherever this road goes.', effects: COMMIT('You told Kes you were a thing, wherever the road goes.'), next: 'r3_yes' },
        { id: 'kes.r3.no', text: 'I don\'t think I can be that.', effects: [{ set: 'kes_rom', value: 'no' }], next: 'r3_no' },
      ],
    },
    r3_yes: { text: '"Good." She says it to the fire, then to you, then to the fire again, grinning. "Good. Obviously. I knew." She didn\'t, and you both know it.', again: 'Kes, grinning at the fire.', options: [rest] },
    r3_no: { text: '"Fair." She doesn\'t look away, which is brave of her. "Then it was good. It was really good." She moves her bedroll a little. Not far.', again: 'Her bedroll, moved a little.', options: [rest] },
    c_rom_end: {
      text: '"I\'m sleeping over there." Her bedroll already is. "You know why. I watch everything, and lately I don\'t like what I\'m watching." She doesn\'t raise her voice. "I\'ll walk with you. I won\'t lie down next to it."',
      again: 'Her bedroll, over there.',
      effects: [{ set: 'kes_rom', value: 'ended' }, { decision: { id: 'kes_rom_ended', text: 'Kes ended it, at a fire. She watches everything.' } }],
      options: [{ text: '(Let her.)', exit: true }],
    },

    // ---------------------------------------------------------------- the others at the fire (U8 conflicts: two)
    x_nine: {
      text: 'Kes has two fingers on the camp lantern\'s little lens, and the lens has gone politely blind. Nine\'s own lens has not left her. "I saw that," Nine says. "The record did not." A pause. "I find the difference restful." Kes looks at it. "Are you going to write me down?" "It is my function," Nine says. "It is also clause forty that I may not read a forecast. You are not in one. I looked."',
      again: 'Nine, and Kes, and the lantern\'s blind lens.',
      effects: [{ set: 'kes_nine_x1' }],
      options: [
        { id: 'kes.x.nine.report', text: 'Write it down, Nine. The record should know there\'s a door.', effects: [N(5), K(-10)], next: 'x_nine_report' },
        { id: 'kes.x.nine.blind', text: 'The record can\'t see her for a reason. Leave her out of it.', effects: [K(5), { set: 'nine_kes_logged' }], next: 'x_nine_blind' },
        { id: 'kes.x.nine.leave', text: '(Leave it between them.)', next: 'x_nine_leave' },
      ],
    },
    x_nine_report: { text: '"Noted," Nine says, and something behind its lens moves. Kes stands up. "That\'s once," she says, very quietly, to you. "Hand that door to anyone else and I\'m gone." She goes to sit on the far side of the fire.', again: 'Kes, on the far side of the fire.', options: [rest] },
    x_nine_blind: { text: 'Nine considers this for long enough that the fire needs feeding. "I will log it," it says, "as the Plan\'s largest error: a place it cannot see, and a person in it who walks out." Its lens dims, which is the nearest it comes to a smile. "Not her name." Kes grins at it. "Obviously," she says, and passes it the soup.', again: 'Nine and Kes, sharing the soup.', options: [rest] },
    x_nine_leave: { text: 'They leave it. Nine watches the lantern all night. Kes, for once, lets it.', again: 'Nine, watching the lantern.', options: [rest] },
    x_odile: {
      text: 'Odile reads with her glasses on their chain. Kes has been watching her for an hour. "You priced the spread," Kes says at last. "Six to one. Somebody had to." Odile takes the glasses off. "My dear," she says, "I priced the weather. Somebody else made it rain." "On the Skirts," says Kes. "On whoever stood under it," says Odile. "I never once went to see who that was."',
      again: 'Odile with the glasses in her hand. Kes, watching.',
      effects: [{ set: 'kes_odile_x1' }],
      options: [
        { id: 'kes.x.odile.kes', text: 'She\'s right, Odile. You priced people.', effects: [K(5), O(-3)], next: 'x_odile_kes' },
        { id: 'kes.x.odile.odile', text: 'She left the floor, Kes. She\'s unwinding it.', effects: [K(-3), O(3)], next: 'x_odile_odile' },
        { id: 'kes.x.odile.both', text: 'Odile. What would you price it at now?', effects: [K(2), O(2), { set: 'kes_odile_truce' }], next: 'x_odile_both' },
      ],
    },
    x_odile_kes: { text: '"I did." Odile puts the glasses back on. "That is a cost." She does not read the page in front of her again tonight. Kes looks almost sorry, and is not.', again: 'Odile, not reading.', options: [rest] },
    x_odile_odile: { text: '"Unwinding." Kes tries the word like a cable she doesn\'t trust. "Unwind faster." She goes back to her box. Odile reads, and smiles very slightly.', again: 'Kes and her box. Odile, reading.', options: [rest] },
    x_odile_both: { text: 'Odile thinks about it properly, which Kes did not expect. "At par," she says, "and see who complains. Whoever complains is the one who was being paid." Kes stares at her. Then she laughs out loud. "Obviously," she says. "Obviously. Why didn\'t anyone—" "Because the ones who complain own the slate, my dear."', again: 'Kes, still laughing at the slate.', options: [rest] },
    x_ash: {
      text: 'Ash is looking at the cable in her neck the way he looks at a wound. "I had one," he says. "A link. Under the jaw. Dog work, before the Choir." He touches the scar there. "I cut it out myself with a hot knife. You burn the channel first, with a cell across the pins, so it\'s dead when you cut it. Then it can\'t take you with it." Kes stares at him. "And you lived." "I lived," Ash says. "The man next to me didn\'t burn his first."',
      again: 'Ash, with his hand on the scar under his jaw.',
      effects: [{ learn: 'kes_ash_word' }, A(ASH, 10), K(3)],
      options: [{ id: 'kes.x.ash.on', text: '(Let her think about it.)', next: 'x_ash_kes' }],
    },
    x_ash_kes: { text: '"A man who cut his link and thinks everyone can," Kes says, but there is no edge in it. "Burn it first." She looks at Ash. "Thanks." Ash nods, once, as if a debt had been paid somewhere.', again: '"Burn it first."', options: [rest] },

    // ---------------------------------------------------------------- lighter talk at the fire
    t_gardens: {
      text: '"I saw them once. Sixteen, at my fitting." She doesn\'t need asking twice. "Glass over everything, and under it trees, real ones, in rows, with fruit on, and grass you could walk on in your boots. Rain came out of pipes in the ceiling at ten and at four, and it smelled of nothing. Nothing at all. And an orange tree, by itself, in a pot, with a bench, and an old man on the bench who didn\'t look old." She stops. "You let me go on."',
      again: '"An orange tree, by itself, in a pot."',
      options: [
        { id: 'kes.t.gardens.on', text: 'Go on.', effects: [K(2)], next: 't_gardens2' },
        { text: 'You\'ll see them again.', next: 't_gardens3' },
      ],
    },
    t_gardens2: { text: 'She goes on for an hour: the paths, the glass, the man who swept the leaves before they fell. At the end she looks at you, startled. "Nobody ever lets me finish," she says. "Obviously I\'m going to do that again now."', again: 'Kes, startled that she was allowed to finish.', options: [rest] },
    t_gardens3: { text: '"Obviously." She doesn\'t sound sure. She looks up the hill anyway.', again: 'Kes, looking up the hill.', options: [rest] },
    t_mother: { text: '"My mother." The word costs her something. "She signed me to the Window at sixteen against the family\'s paper. It cleared my brothers. She died of the cough two years after." She winds the cable tight. "She did the sum. I\'d have done the same sum." She stops winding. "Don\'t say anything. I mean it."', again: 'Kes, with the cable wound tight round her hand.', effects: [{ learn: 'kes_mother' }], options: [rest] },
    t_chrome: { text: '"You\'re wearing theirs." She says it like a weather report. "Now they can see you too. Wherever you are." She looks at the back of your neck a moment longer. "Obviously it was your choice. I just wanted you to know I know."', again: '"Now they can see you too."', effects: [K(-3)], options: [rest] },
    t_fridge: { text: '"So it\'s a fridge," Kes says. "That says no." "Three times," says Tamsin. "To the city." "I love it," Kes says. "I want to meet it. I want to meet the Fridge." Tamsin is laughing too hard to answer. It is the most either of them has laughed since they met, and neither of them is sure why it\'s funny.', again: 'Kes and Tamsin, laughing about the Fridge.', effects: [K(2), A(TAMSIN, 2)], options: [rest] },

    t_wren: { text: '"Two people who got found by the wrong side." Kes says it quietly, because Wren is right there, and Wren hears it anyway and doesn\'t argue. "She got the Dogs. I got the Window." She looks at Wren\'s goggles. "She keeps hers on for the same reason I keep my cable in. So nobody reads the face."', again: 'Kes and Wren, not quite looking at each other.', options: [rest] },
    t_ilya: { text: '"Old." Kes grins. "Good eyes, though. He can see a lens at four hundred paces and tell you which way it\'s facing." She considers him across the fire. "He counts things under his breath. I count things in my neck. We\'d get on, if he talked."', again: 'Kes, considering Ilya.', options: [rest] },

    // ---------------------------------------------------------------- leaving
    c_betrayed: {
      text: [
        { if: SOLD_STRIKE, text: '"Somebody told the Tonnage where the committee sat." Kes is already standing, already packed; she was always packed. "I keep the lenses on Cascade. I watched you walk down to the pit office." She doesn\'t raise her voice. "Maren took me in when I was eighteen. Don\'t come after me."' },
        { text: '"You sold the Scales a name." Kes is already standing, already packed. "I keep her board. I watched it go up with your thumb on it." Her voice doesn\'t shake. "Don\'t come after me."' },
      ],
      again: 'Where Kes was.',
      effects: GONE('betrayed', 'Kes left you for what you sold in the Skirts.'),
      options: [{ text: '(Let her go.)', exit: true }],
    },
    c_sold: {
      text: '"You sold the door." Kes doesn\'t sit. Her hand is on the back of her neck. "The Letter\'s put a watch on every port in the Skirts since yesterday. Baek\'s arm went dead in the Pond. Mine goes dark and comes back with someone else\'s hand on it." She is very calm. "I told you it was a timetable. I\'m gone."',
      again: 'Where Kes was.',
      effects: GONE('sold', 'Kes left you for selling the door in the Concern\'s chrome to the Contract Office.'),
      options: [{ text: '(Let her go.)', exit: true }],
    },
    c_handed: {
      text: '"You told Rafe." Kes doesn\'t sit. "About the door. He came to me with your words in his mouth and asked me to switch off every piece on the slope." She is very calm. "Baek\'s arm. Mercy\'s eyes. Half the Shift\'s spines. I told you it was a timetable. I\'m gone."',
      again: 'Where Kes was.',
      effects: GONE('rafe', 'Kes left you for handing the door in the Concern\'s chrome to Rafe Ansel.'),
      options: [{ text: '(Let her go.)', exit: true }],
    },
    c_floor: {
      text: '"I\'m done." Kes has the box in her jacket and the cable coiled. "I watch everything. I\'ve watched enough." She doesn\'t list it; she doesn\'t need to. "Don\'t come after me. I\'ll see you on every board on the slope before you see me."',
      again: 'Where Kes was.',
      effects: GONE('floor', 'Kes left your fire. She watches everything, and she had watched enough.'),
      options: [{ text: '(Let her go.)', exit: true }],
    },
    left: {
      text: [
        { if: { flag: 'kes_left', eq: 'floor' }, text: 'Kes, with the cable in her neck and the box on her knee. She doesn\'t look up. "I said I\'d see you first," she says. She did.' },
        { if: { flag: 'kes_left', eq: 'sold' }, text: 'Kes, with a dressing on the back of her neck where the port was. Somebody cut it out of her in a hurry. She doesn\'t look up, and she doesn\'t speak.' },
        { text: 'Kes, with the box on her knee. She doesn\'t look up.' },
      ],
      again: 'Kes doesn\'t look up.',
      options: [
        { id: 'kes.left.talk', text: '(Sit down across from her. Tell her what you did, and why, and don\'t dress it up.)', if: { all: [{ flag: 'kes_left', eq: 'floor' }, { not: { seen: 'kes.left.talk' } }] }, check: { skill: 'speech', dc: 55 }, effects: [{ set: 'kes_left', value: false }, K(30), { join: KES }, { set: 'kes_back' }, { decision: { id: 'kes_back', text: 'You told Kes the truth, undressed, and she came back. Once, she said.' } }], next: 'left_back', fail: 'left_no' },
        { text: '(Leave her be.)', exit: true },
      ],
    },
    left_back: { text: '"That\'s the first true thing in a while." She stands, and puts the box in her jacket. "Once. I do this once. Obviously."', again: 'Kes, at your shoulder again.', options: [{ text: 'Keep up.', exit: true }] },
    left_no: { text: '"No." She plugs the cable back in. "Go on."', again: 'Kes, plugged in.', options: [{ text: '(Leave her be.)', exit: true }] },
    // Act 3 (B6n): her red line after a guild night she was not at (a3_fire.ts)
    ...KES_GUILD_NODES,
  },
};

export const KES_DIALOGUES: DialogueDef[] = [d_hs_kes];
