import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { QUESTS } from '../quests';

/**
 * Act 1 in Shale: the man who drinks behind the militia yard. Ilya Strand's companion arc (U8) lives in his tree:
 * his camp, his leaving and returning, his romance (story/U8_ilya_SECRET.md).
 */

const bye = { text: 'That\'s all.', exit: true };
const rest = { text: 'Rest.', exit: true };
/** Companions who can be with him (U7 interjections, U8 camp exchanges). */
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const NINE = 'npc_md_nine';
const ASH = 'npc_of_03';
const CAMP: Cond = { flag: 'at_camp' };
const I_IN: Cond = { inParty: ILYA };
const iApp = (gte: number): Cond => ({ approval: { companion: ILYA, gte } });
const I = (by: number): Effect => ({ approval: { companion: ILYA, by } });
const W = (by: number): Effect => ({ approval: { companion: WREN, by } });
const SOBER = (by: number): Effect => ({ inc: 'ilya_sober_days', by });
/** His personal quest opens once it is registered in quests/index.ts (U8); until then his arc runs on flags alone. */
const OPEN_LETTER: Effect[] = QUESTS.q_comp_ilya ? [{ quest: 'q_comp_ilya', start: true }] : [];
const LETTER_WAITS: Cond = { all: [{ knows: 'ilya_letter_seen' }, { not: { flag: 'ilya_letter_read' } }] };
const I_ROM_ON: Cond = { any: ['yes', 'later_well', 'well', 'committed'].map((v) => ({ flag: 'ilya_rom', eq: v })) };
const I_ROM_FREE: Cond = { any: [{ not: { flag: 'romance_partner' } }, { flag: 'romance_partner', eq: ILYA }] };
/** "Only sober" (the bible): the romance waits on the days he counts. */
const I_SOBER: Cond = { flag: 'ilya_sober_days', gte: 30 };
/** "A scene at a well": camps by water. */
const AT_WELL: Cond = { any: [{ at: 'shale' }, { at: 'drywells' }, { at: 'openfield' }, { at: 'windpumps' }] };
/** The one night he drinks again, after the boy: nobody's doing, and he comes back from it. */
const RELAPSE: Cond = { all: [{ flag: 'jonah_dead' }, { seen: 'ilya.c.s1' }, { not: { flag: 'ilya_relapse' } }] };
const I_ROM_YES: Effect[] = [{ set: 'ilya_rom', value: 'yes' }, I(5)];
const I_WELL: Effect[] = [{ set: 'ilya_rom', value: 'well' }, I(10), { decision: { id: 'ilya_well', text: 'You went down to the well with Ilya, and stayed.' } }];
const I_GONE = (why: string, text: string): Effect[] => [{ leave: ILYA }, { set: 'ilya_left', value: why }, { decision: { id: 'ilya_left', text } }];

export const d_sh_ilya: DialogueDef = {
  id: 'd_sh_ilya', owner: 'npc_sh_17',
  start: [
    // At a fire (U8): his leaving comes before anything else he would say.
    { if: { all: [I_IN, CAMP, { approval: { companion: ILYA, lte: -20 } }] }, node: 'c_floor' },
    { if: { all: [I_IN, CAMP, I_ROM_ON, { approval: { companion: ILYA, lte: 30 } }] }, node: 'c_rom_end' },
    { if: { all: [I_IN, CAMP, RELAPSE] }, node: 'c_drunk' },
    { if: { all: [I_IN, CAMP] }, node: 'camp' },
    { if: I_IN, node: 'party' },
    { if: { all: [{ flag: 'ilya_recruited' }, { flag: 'ilya_left' }] }, node: 'left' },
    { if: { flag: 'ilya_recruited' }, node: 'waiting' },
    { if: { flag: 'ilya_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A broad man with a shaved head sits on the yard fence with a long rifle across his knees and a bottle beside him, counting the militia\'s shots under his breath as they miss. "Six. Seven. Right." He looks at you with eyes that are clearer than the rest of him. "You the one drilling them? Right."',
      interject: [{ companion: WREN, text: '"Strand." Wren has stopped well back from the fence. "He put a round through my water can at four hundred paces, the summer I scouted the east road. I was holding it."' }],
      effects: [{ set: 'ilya_met' }, { learn: 'ilya_seen' }, { lead: 'l_ilya' }],
      passives: [
        { attr: 'senses', dc: 7, text: 'Two fingers gone on the left hand. The rifle is cleaner than the man.', effects: [{ learn: 'ilya_fingers' }] },
        { skill: 'firearms', dc: 35, text: 'The way he holds the rifle, drunk, is better than the way Lind holds hers sober.', effects: [{ learn: 'ilya_better' }] },
      ],
      options: [
        { id: 'ilya.who', text: 'Who are you?', next: 'who', once: true },
        { id: 'ilya.show', text: 'Show them, then. One shot.', next: 'show', once: true },
        { id: 'ilya.shame', text: 'You\'re drunk in front of boys who\'d follow you if you stood up.', check: { skill: 'speech', dc: 45, mods: [{ if: { knows: 'ilya_fingers' }, dc: -5, why: 'you looked at the hand and not away' }] }, next: 'shamed', fail: 'shame_no' },
        { id: 'ilya.recruit', text: 'Come east with me. Vasha Kade rides that road.', if: { any: [{ quest: 'q_a1_tollhouse' }, { quest: 'q_a1_tollhouse', status: 'done' }, { knows: 'overpass_dogs' }] }, next: 'recruit' },
        bye,
      ],
    },
    again: { text: '"Eight. Right." The bottle is lower.', again: 'He counts something you didn\'t see. "Right."', options: [
      { id: 'ilya.who.again', text: 'Who are you?', if: { not: { seen: 'ilya.who' } }, next: 'who' },
      { id: 'ilya.show.again', text: 'Show them. One shot.', if: { not: { seen: 'ilya.show' } }, next: 'show' },
      { id: 'ilya.shame.again', text: 'You\'re drunk in front of boys who\'d follow you if you stood up.', if: { not: { seen: 'ilya.shame' } }, check: { skill: 'speech', dc: 45 }, next: 'shamed', fail: 'shame_no' },
      { id: 'ilya.recruit.again', text: 'Come east with me. Vasha Kade rides that road.', if: { all: [{ not: { flag: 'ilya_refused' } }, { any: [{ quest: 'q_a1_tollhouse' }, { quest: 'q_a1_tollhouse', status: 'done' }, { knows: 'overpass_dogs' }] }] }, next: 'recruit' },
      bye,
    ] },
    who: { text: '"Strand. Ilya. Militia, before." He turns the bottle so the label faces away from you, as if that helped. "Benno\'s mine — cousin. He\'ll have told you about the post." A pause. "The post was the point."', effects: [{ learn: 'ilya_name' }], options: [{ id: 'ilya.before', text: 'Before what?', next: 'before', once: true }, { text: 'Right.', next: 'again' }] },
    before: { text: 'He counts a shot that isn\'t fired. "Before a raid. Dogs. I was out east on a hunt, three nights, because the wind was right for it." His voice doesn\'t change at all. "The wind was right. Right." He drinks. "Vasha Kade led it. That\'s the whole story and you\'ve had it."', effects: [{ learn: 'ilya_raid' }, { lead: 'l_ilya_raid' }, { trust: { npc: 'npc_sh_17', by: 5 } }], options: [{ text: 'Right.', next: 'again' }] },
    show: { text: 'He doesn\'t argue. He stands, which takes a moment, sets the bottle on the fence post, walks fifty paces into the yard, turns, and shoots the bottle off the post without appearing to aim. Then he shoots the post. Nine militia stop breathing. "Right," he says, and sits back down.', effects: [{ set: 'ilya_showed' }, { learn: 'ilya_better' }, { news: { tag: 'ilya_shot', text: 'Ilya Strand shot a bottle off the militia fence at fifty paces, drunk, and then shot the fence', valence: 5, size: 5, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 3 } }], options: [{ text: 'Right.', next: 'again' }] },
    shamed: { text: 'For a long moment nothing happens, and then he looks at the militia, who are looking at the ground, and at the bottle, and puts the bottle down on the far side of the fence where he can\'t reach it. "Right." He stands. "Lind. Give me the four that shoot." He walks into the yard without the rifle.', effects: [{ set: 'ilya_shamed' }, { set: 'ilya_sober_days', value: 0 }, { decision: { id: 'ilya_shamed', text: 'You shamed Ilya Strand sober in front of the militia. He took the drills.' } }, { trust: { npc: 'npc_sh_17', by: -5 } }, { memory: { npc: 'npc_sh_17', tag: 'shamed_me', valence: -10, strength: 80 } }, { memory: { npc: 'npc_sh_01', tag: 'sobered_ilya', valence: 15, strength: 80 } }, { rep: { faction: 'shale_militia', respect: 8 } }, { xp: 60 }], options: [{ text: '(Leave him to it.)', exit: true }] },
    shame_no: { text: '"Right." He drinks. "Nine."', effects: [{ memory: { npc: 'npc_sh_17', tag: 'tried_to_shame', valence: -5 } }], options: [{ text: '(Leave him.)', exit: true }] },
    recruit: {
      text: 'The counting stops. "Kade." He says it like a word he has been keeping dry. "You\'d take a drunk east." It isn\'t a question. "I\'d be sober by the Tollhouse. I\'d be useless by the bridge and I\'d be sober again by wherever she is." He looks at the rifle. "Why."',
      options: [
        { id: 'ilya.recruit.rifle', text: 'Because the militia has nine rifles and four that shoot, and the fifth is drunk on a fence.', check: { skill: 'speech', dc: 45, mods: [{ if: { knows: 'ilya_raid' }, dc: -10, why: 'he told you about the wind' }] }, next: 'joins', fail: 'refuses' },
        { id: 'ilya.recruit.shoot', text: '(Pick up the bottle. Set it on the far post. Hit it first.)', check: { skill: 'firearms', dc: 50 }, next: 'joins_shot', fail: 'refuses_shot' },
        { id: 'ilya.recruit.name', text: 'Because a man who shot the post should get to pick which one.', if: { knows: 'ilya_name' }, next: 'joins' },
        { text: 'Forget it.', next: 'again' },
      ],
    },
    joins: { text: '"Right." He puts the bottle on the far side of the fence. He picks up the rifle. "I count things. Out loud. You\'ll get used to it or you won\'t." He looks east, where the road is, and his face does something you weren\'t meant to see.', interject: [{ companion: WREN, text: '"Right," Wren says, in his voice exactly, and doesn\'t smile. "Long road, then."' }], effects: [{ join: 'npc_sh_17' }, { set: 'ilya_recruited' }, { set: 'ilya_sober_days', value: 0 }, { approval: { companion: 'npc_sh_17', by: 10 } }, { decision: { id: 'ilya_recruited', text: 'Ilya Strand came with you, east, toward Vasha Kade.' } }, { news: { tag: 'ilya_left', text: 'Ilya Strand walked out of Shale with the salt-cut stranger, sober', valence: 10, size: 6, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'took_ilya', valence: 10, strength: 70 } }, { xp: 80 }], options: [{ text: 'Keep up.', exit: true }] },
    joins_shot: { text: 'The bottle goes. He watches the glass fall for a second longer than anyone else. "Right." He picks up the rifle. "I count things. Out loud." He doesn\'t look east. He doesn\'t have to.', interject: [{ companion: WREN, text: '"Right," Wren says, in his voice exactly, and doesn\'t smile. "Long road, then."' }], effects: [{ join: 'npc_sh_17' }, { set: 'ilya_recruited' }, { set: 'ilya_sober_days', value: 0 }, { approval: { companion: 'npc_sh_17', by: 15 } }, { decision: { id: 'ilya_recruited', text: 'You outshot Ilya Strand\'s bottle and he came east with you.' } }, { news: { tag: 'ilya_left', text: 'Ilya Strand walked out of Shale with the salt-cut stranger, sober', valence: 10, size: 6, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'took_ilya', valence: 10, strength: 70 } }, { xp: 80 }], options: [{ text: 'Keep up.', exit: true }] },
    refuses: { text: '"Right." He drinks. "Ten."', effects: [{ set: 'ilya_refused' }, { memory: { npc: 'npc_sh_17', tag: 'refused_you', valence: -5 } }], options: [{ text: '(Leave him.)', exit: true }] },
    refuses_shot: { text: 'You miss. He doesn\'t say anything, which is worse. Then he shoots the bottle, from the fence, sitting down. "Right."', effects: [{ set: 'ilya_refused' }, { memory: { npc: 'npc_sh_17', tag: 'missed_bottle', valence: -5 } }], options: [{ text: '(Leave him.)', exit: true }] },
    party: {
      text: [{ if: I_SOBER, text: '"Wind\'s steady." He doesn\'t say the number of days any more; you notice that he doesn\'t. "Right."' }, { if: { flag: 'ilya_sober_days', gte: 3 }, text: '"Still counting." He means the days. "Right."' }, { text: '"Wind\'s from the east." He has the rifle slung and his hands are steady, mostly. "Right."' }],
      again: 'He is counting something on the road ahead, under his breath.',
      options: [
        { id: 'ilya.p.vasha', text: 'When we find her.', next: 'p_vasha', once: true },
        { id: 'ilya.p.wind', text: 'You talk about the wind a lot.', next: 'p_wind', once: true },
        { id: 'ilya.p.letter', text: 'Nine reads the city\'s hand. Your letter.', if: { all: [LETTER_WAITS, { inParty: NINE }, { not: { seen: 'ilya.p.letter' } }] }, next: 'p_letter' },
        { id: 'ilya.p.wait', text: 'Wait here for me.', effects: [{ leave: 'npc_sh_17' }], exit: true, repeat: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    p_vasha: { text: '"When." He likes the word. "She knows my name. I want her to know why before. After is after." He counts something. "You\'ll have an opinion. Keep it until then."', effects: [{ learn: 'ilya_wants_why' }], options: [{ text: 'Right.', exit: true }] },
    p_wind: { text: '"Wind\'s the thing you can\'t see that moves the thing you can." He shrugs. "Three nights east on a hunt because the wind was right. Right." He doesn\'t say anything else for a while.', effects: [{ trust: { npc: 'npc_sh_17', by: 5 } }], options: [{ text: 'Right.', exit: true }] },
    p_letter: { text: '"At a fire," he says. "Not on a road. Right."', options: [{ text: 'Keep up.', exit: true }] },
    waiting: {
      text: '"Right." He is up, the rifle already slung.',
      again: 'He is up before you have finished walking over.',
      options: [{ id: 'ilya.wait.go', text: 'We\'re going.', effects: [{ join: ILYA }], exit: true, repeat: true }, { text: 'Wait here a while longer.', exit: true }],
    },

    // ---------------------------------------------------------------- at a fire (U8)
    camp: {
      text: [
        { if: { approval: { companion: ILYA, lte: 4 } }, text: 'Ilya sits with his back to a rock and the rifle across his knees, facing the dark and not the fire, and counts something he does not share.' },
        { if: I_SOBER, text: '"Wind\'s steady." He doesn\'t say the number of days any more; you have noticed that he doesn\'t. "Right."' },
        { text: '"Wind\'s from the west." The rifle is across his knees and he isn\'t cleaning it. "Steady. Right."' },
      ],
      again: 'Ilya counts something in the fire under his breath, and stops when you look.',
      options: [
        // his arc, one conversation a stage
        { id: 'ilya.c.s1', text: '(Sit. Let him count.)', if: { all: [{ not: { seen: 'ilya.c.s1' } }, iApp(0)] }, next: 's1' },
        { id: 'ilya.c.s2', text: 'You said I\'d had the whole story. I haven\'t.', if: { all: [{ seen: 'ilya.c.s1' }, { not: { seen: 'ilya.c.s2' } }, { any: [{ flag: 'a1_finale' }, { flag: 'visited_ninebridge' }] }, iApp(10)] }, next: 's2' },
        { id: 'ilya.c.s3', text: '(Ask Nine to read Ilya\'s letter.)', if: { all: [LETTER_WAITS, { inParty: NINE }, iApp(20)] }, next: 's3_nine' },
        { id: 'ilya.c.s3clerk', text: 'Let me see the letter. I read the city\'s hand.', if: { all: [LETTER_WAITS, { not: { inParty: NINE } }, { origin: 'archive_clerk' }, iApp(20)] }, next: 's3_self' },
        { id: 'ilya.c.s3sci', text: 'Let me try the letter.', if: { all: [LETTER_WAITS, { not: { inParty: NINE } }, { not: { origin: 'archive_clerk' } }, { not: { seen: 'ilya.c.s3sci' } }, iApp(20)] }, check: { skill: 'science', dc: 60, mods: [{ if: { knows: 'nine_two_ledgers' }, dc: -10, why: 'you have watched the assessor write in the city\'s hand' }] }, next: 's3_self', fail: 's3_fail' },
        { id: 'ilya.c.s4', text: 'Kade.', if: { all: [{ flag: 'vasha_fate' }, { not: { seen: 'ilya.c.s4' } }, iApp(25)] }, next: 's4' },
        // romance: late, quiet, only sober; he asks every step
        { id: 'ilya.c.r1', text: '(Take the second watch with him.)', if: { all: [{ flag: 'ilya_letter_read' }, { not: { flag: 'ilya_rom' } }, I_SOBER, iApp(40), I_ROM_FREE] }, next: 'r1' },
        { id: 'ilya.c.r1b', text: '(Take the second watch with him again.)', if: { all: [{ flag: 'ilya_rom', eq: 'later' }, { seen: 'ilya.c.s4' }, I_SOBER, iApp(40), I_ROM_FREE] }, next: 'r1b' },
        { id: 'ilya.c.r2', text: '(Walk down to the well with him.)', if: { all: [{ flag: 'ilya_rom', eq: 'yes' }, AT_WELL, I_SOBER, I_ROM_FREE] }, next: 'r2' },
        { id: 'ilya.c.r2b', text: '(He is at the well again. Walk down.)', if: { all: [{ flag: 'ilya_rom', eq: 'later_well' }, AT_WELL, { seen: 'ilya.c.s4' }, I_SOBER, I_ROM_FREE] }, next: 'r2b' },
        { id: 'ilya.c.r3', text: 'You\'ve stopped saying the number.', if: { all: [{ flag: 'ilya_rom', eq: 'well' }, { seen: 'ilya.c.s4' }] }, next: 'r3' },
        // what breaks him: the bottle he gave you, held out to use him
        { id: 'ilya.c.bottle', text: '(Hold out the bottle he gave you.) You shot better at the fence with one in you. Tomorrow needs that.', if: { all: [{ flag: 'ilya_bottle_given' }, { item: 'c_bitters' }] }, next: 'c_bottle' },
        // the others at the fire
        { id: 'ilya.c.wren', text: '(Wren sits down on Ilya\'s side of the fire, which she has never done.)', if: { all: [{ inParty: WREN }, { knows: 'bw_wall_wren' }, { any: [{ flag: 'wren_bridge', eq: 'raid' }, { flag: 'wren_bridge', eq: 'alone' }] }, { not: { seen: 'ilya.c.wren' } }] }, next: 'x_wren' },
        { id: 'ilya.c.ash', text: '(Ash has been watching Ilya not drink for three nights.)', if: { all: [{ inParty: ASH }, { seen: 'ilya.c.s1' }, { not: { seen: 'ilya.c.ash' } }] }, next: 'x_ash' },
        // lighter talk
        { id: 'ilya.c.count', text: 'Why do you count out loud?', if: { not: { seen: 'ilya.c.count' } }, next: 't_count' },
        { id: 'ilya.c.wind', text: 'Teach me to read the wind.', if: { not: { seen: 'ilya.c.wind' } }, next: 't_wind' },
        { id: 'ilya.c.hand', text: 'Your hand. What happened?', if: { all: [{ knows: 'ilya_fingers' }, { not: { seen: 'ilya.c.hand' } }] }, next: 't_hand' },
        { id: 'ilya.c.ada', text: 'The sheriff.', if: { all: [{ flag: 'visited_shale' }, { not: { seen: 'ilya.c.ada' } }] }, next: 't_ada' },
        { id: 'ilya.c.jonah', text: 'Jonah.', if: { all: [{ flag: 'jonah_lived' }, { not: { seen: 'ilya.c.jonah' } }] }, next: 't_jonah_lived' },
        { id: 'ilya.c.jonah2', text: 'Jonah.', if: { all: [{ flag: 'jonah_dead' }, { flag: 'ilya_relapse' }, { not: { seen: 'ilya.c.jonah2' } }] }, next: 't_jonah_dead' },
        { id: 'ilya.c.odile', text: 'Odile bet against Shale.', if: { all: [{ knows: 'odile_short' }, { not: { seen: 'ilya.c.odile' } }] }, next: 't_odile' },
        { id: 'ilya.c.city', text: 'Meridian.', if: { all: [{ flag: 'a2_precinct_done' }, { not: { seen: 'ilya.c.city' } }] }, next: 't_city' },
        rest,
      ],
    },

    // stage 1 — the bottle (Act 1)
    s1: {
      text: 'He counts the stars in the gap above the fire, gets to forty, and gives up. "Four days." He means sober. "Four. Right." He reaches inside his jacket and brings out a bottle of Rot Bitters with two fingers gone from it, and holds it out to you by the neck. "Carry it."',
      again: 'He is still holding the bottle out by the neck.',
      effects: [SOBER(4), { set: 'ilya_s1' }],
      options: [
        { id: 'ilya.s1.take', text: '(Take it.)', effects: [{ give: 'c_bitters' }, { set: 'ilya_bottle_given' }, I(5)], next: 's1_take' },
        { id: 'ilya.s1.pour', text: '(Take it, and pour it out on the ground.)', effects: [{ set: 'ilya_bottle_poured' }, I(2)], next: 's1_pour' },
        { id: 'ilya.s1.no', text: 'Carry your own bottle, Ilya.', effects: [I(-3)], next: 's1_no' },
      ],
    },
    s1_take: { text: '"Don\'t give it back." He looks at the fire, not at you. "If I ask for it, don\'t give it back. If I don\'t ask, don\'t offer. That\'s all of it. Right."', again: 'The bottle is in your pack. He doesn\'t look at the pack.', effects: [{ learn: 'ilya_bottle_rule' }], options: [rest] },
    s1_pour: { text: 'He watches it go into the dirt and doesn\'t move to stop you. "Right." A long pause. "Now I\'ll want one and there won\'t be one. That\'s a plan too."', again: 'The dark patch in the dirt where it went.', options: [rest] },
    s1_no: { text: '"Right." He puts it back inside the jacket. He doesn\'t drink from it. He doesn\'t put it down, either.', again: 'His hand is on the jacket where the bottle is.', options: [rest] },

    // stage 2 — the night, and the letter (after the water clock)
    s2: {
      text: '"No." He agrees, which surprises you. He counts the sticks in the fire. "Shale. Eleven springs back. My wife was the healer, the only one between Shale and the glass who could set a hip. People walked three days to her." He says her name carefully, like a round he is chambering. "Agi. And two girls."',
      again: 'He is still counting the sticks in the fire.',
      effects: [SOBER(15), { set: 'ilya_s2' }],
      options: [{ id: 'ilya.s2.on', text: 'Go on.', next: 's2_night' }],
    },
    s2_night: {
      text: '"I went east on a hunt, three nights, because the wind was right. Kade came up the wash the second night with eleven Dogs and took the water and the medicine store. Agi stood in the store\'s door." He stops counting. "The girls were in the store. That\'s the whole of it. Now you\'ve had it."',
      again: 'He has stopped counting.',
      options: [
        { id: 'ilya.s2.wind', text: 'The wind didn\'t send Kade up that wash.', next: 's2_letter' },
        { id: 'ilya.s2.sit', text: '(Say nothing. Sit with it.)', effects: [I(3)], next: 's2_letter' },
      ],
    },
    s2_letter: {
      text: 'He takes a folded envelope from inside his jacket: city paper, heavy, a tower in a ring stamped on the flap, the seal long broken. He doesn\'t let go of it. "This came for Agi the spring before. She read it and put it in the medicine store and never told me what it said." He puts it back. "Nobody in Shale reads that hand. People say the city\'s own clerks do. Right."',
      again: 'The envelope is back inside his jacket. His hand is still on it.',
      effects: [...OPEN_LETTER, { learn: 'ilya_letter_seen' }],
      options: [
        { id: 'ilya.s2.find', text: 'Then we find someone who reads it.', effects: [I(3)], next: 's2_find' },
        { id: 'ilya.s2.leave', text: 'Some letters are better left unread.', effects: [I(-3)], next: 's2_unread' },
      ],
    },
    s2_find: { text: '"Right." He says it like a man agreeing to a range he isn\'t sure of. "East, then. Where the clerks are."', again: 'He is looking east.', options: [rest] },
    s2_unread: { text: '"Right." A long pause. "Not this one."', again: 'His hand is still on the jacket.', options: [rest] },

    // stage 3 — the letter read (the city): the turning point
    s3_nine: {
      text: 'Nine has been sitting by the fire, badly, with the other ledger on its knee. When Ilya holds out the envelope the lens clicks twice and the assessor does not take it at once. "This is a notice under clause 31. Variance correction." Then it takes it, by the edges, the way a doctor takes off a dressing. "Shall I read it aloud, Mr Strand, or to you alone?" "Aloud," Ilya says. "Right."',
      again: 'The assessor holds the letter by its edges, and waits.',
      options: [{ id: 'ilya.s3.listen', text: '(Listen.)', next: 's3_read' }],
    },
    s3_self: {
      text: 'It is the city\'s shorthand under a broken seal, the hand the toll stand\'s copy-book was taught from, and it reads the way those always read: as if nobody would ever be on the other end of it. You read it aloud, slowly, because it has to be read slowly.',
      again: 'The letter is open in your hands.',
      options: [{ id: 'ilya.s3.readit', text: '(Read it.)', next: 's3_read' }],
    },
    s3_fail: { text: 'The marks are a shorthand inside a shorthand. You get SHALE, and a date, and nothing in between. "Right," Ilya says, and takes it back, and you watch him decide not to be disappointed. "The city\'s clerks, then."', again: 'The letter is back in his jacket.', options: [rest] },
    s3_read: {
      text: [
        { if: { inParty: NINE }, text: 'Nine reads in the voice it keeps for clauses. "SHALE. STRAND, A. HEALER. Growth variance: ahead of plan; water-bearing population four-tenths over schedule. Relocation to the Precinct offered under clause 31; no response constitutes refusal. Variance correction scheduled: spring, the dark of the moon, by the local instrument. Thank you for your continuity." The lens clicks. "It is signed by nobody. They are all signed by nobody."' },
        { text: '"SHALE. STRAND, A. HEALER. Growth variance: ahead of plan; water-bearing population four-tenths over schedule. Relocation to the Precinct offered under clause 31; no response constitutes refusal. Variance correction scheduled: spring, the dark of the moon, by the local instrument. Thank you for your continuity." There is no signature. There never is.' },
      ],
      again: 'The letter lies open on Ilya\'s knee.',
      effects: [{ set: 'ilya_letter_read' }, { learn: 'ilya_raid_scheduled' }, SOBER(20), I(5), { decision: { id: 'ilya_letter_read', text: 'Ilya Strand\'s letter was read aloud at a fire: the raid that killed his family was on the city\'s schedule.' } }],
      options: [{ id: 'ilya.s3.wait', text: '(Wait.)', next: 's3_after' }],
    },
    s3_after: {
      text: '"By the local instrument," Ilya says. He says it again, to check it. Then he laughs, which you have never heard him do, and it is an awful sound. "Eleven years angry at the wind." He folds the letter along its old folds. "She didn\'t know. Kade. They put a fat store on a dark night in front of her, and she thought she\'d picked it." He looks at the rifle across his knees. "Right."',
      again: 'The letter, folded along its old folds, on his knee.',
      options: [{ id: 'ilya.s3.now', text: 'And now?', next: 's3_now' }],
    },
    s3_now: {
      text: '"Now I want her to know why, before. Same as ever." He puts the letter away. "Only the why\'s longer."',
      again: '"The why\'s longer," he says again.',
      options: [
        { id: 'ilya.s3.with', text: 'Then she hears it from you, and I\'ll be standing there.', effects: [{ set: 'ilya_vasha_intent', value: 'why' }, I(5)], next: 's3_with' },
        { id: 'ilya.s3.tower', text: 'She\'s the city\'s rifle. The hand that wrote that is in a tower.', effects: [{ set: 'ilya_vasha_intent', value: 'why' }, { learn: 'ilya_tower' }], next: 's3_tower' },
        { id: 'ilya.s3.carry', text: 'Maybe she should carry it. Knowing. Alive.', effects: [{ set: 'ilya_vasha_intent', value: 'open' }, I(-3)], next: 's3_carry' },
      ],
    },
    s3_with: { text: '"Right." One thing, for once. "Standing there\'s plenty."', again: 'He is cleaning the rifle, slowly.', options: [rest] },
    s3_tower: { text: '"Right. And the rifle\'s the part I can reach." He thinks about it longer than you expect. "Ask me about towers after."', again: 'He is looking at the dark where a city would be.', options: [rest] },
    s3_carry: { text: 'He doesn\'t like it; you watch him not like it. "Maybe," he says. "Ask me when she\'s in front of me. Not before."', again: 'He isn\'t looking at you.', options: [rest] },

    // stage 4 — after Kade (the Bridgeward raid settles `vasha_fate`)
    s4: {
      text: [
        { if: { flag: 'vasha_fate', eq: 'ilya' }, text: '"Forty-one rounds since the fence," he says. "Counting the last." He doesn\'t count anything else for a while. "She knew why. I watched her know it. Right." It is the first time you have heard him say a thing as if it were over.' },
        { if: { flag: 'vasha_fate', eq: 'player' }, text: '"You took it." Not angry, or not only. "I\'ve been working out whether I mind. I don\'t know yet. Right."' },
        { if: { flag: 'vasha_fate', eq: 'spared_why' }, text: '"She\'s carrying it." He watches the fire. "Every day she\'s alive she knows what she was for. Right. That\'s longer than a round."' },
        { text: '"Somebody else did it." He turns his ruined hand over. "Eleven years, and it was somebody else. Right."' },
      ],
      again: 'He is not counting anything.',
      effects: [SOBER(40), { set: 'ilya_s4' }],
      options: [{ id: 'ilya.s4.after', text: 'What will you do now?', next: 's4_after' }],
    },
    s4_after: {
      text: '"Now." He tries the word out. "I don\'t know what a man does, after." He looks at you as if you might. "Say what you think. Right."',
      again: 'He is waiting for you to say.',
      options: [
        { id: 'ilya.s4.shale', text: 'Shale needs a rifle that counts.', effects: [{ set: 'ilya_after', value: 'shale' }, I(3)], next: 's4_shale' },
        { id: 'ilya.s4.road', text: 'Stay on the road with me.', effects: [{ set: 'ilya_after', value: 'road' }, I(3)], next: 's4_road' },
        { id: 'ilya.s4.you', text: 'What do you want, Ilya?', effects: [{ set: 'ilya_after', value: 'rest' }, I(5)], next: 's4_rest' },
      ],
    },
    s4_shale: { text: '"Ada\'d have me back." He thinks. "She\'d have me drilling boys at dawn. Right. I could stand that."', again: 'He is thinking about dawn drills.', options: [rest] },
    s4_road: { text: '"Right." No hesitation at all. "Somebody has to tell you where the wind is."', again: 'He is reading the wind for tomorrow.', options: [rest] },
    s4_rest: { text: '"To stop counting." He looks surprised to have said it. "Not today. Some day. Right."', again: 'He isn\'t counting. You notice.', options: [rest] },

    // romance: late, quiet, only sober, a well; he asks every step, any answer is allowed; it can end
    r1: {
      text: 'The second watch is the cold one. He doesn\'t talk and you don\'t, and at some point his shoulder is against yours and he leaves it there, and then he moves it, carefully, to look at you. "I\'m forty-one and I count my days," he says. "I\'d like to count this. If you\'d want that." A pause. "You can say no. Right."',
      again: 'He is waiting, and will take either answer.',
      options: [
        { id: 'ilya.r1.yes', text: 'I\'d want that.', effects: I_ROM_YES, next: 'r1_yes' },
        { id: 'ilya.r1.later', text: 'Not yet.', effects: [{ set: 'ilya_rom', value: 'later' }], next: 'r1_later' },
        { id: 'ilya.r1.no', text: 'No, Ilya.', effects: [{ set: 'ilya_rom', value: 'no' }], next: 'r1_no' },
      ],
    },
    r1b: {
      text: 'The second watch again, the cold one. "I asked once," he says. "I\'m asking again, once. Then I stop." He doesn\'t look away.',
      again: 'He is waiting, and will take either answer.',
      options: [
        { id: 'ilya.r1b.yes', text: 'Yes. Count it.', effects: I_ROM_YES, next: 'r1_yes' },
        { id: 'ilya.r1b.no', text: 'Stop, then. It\'s no.', effects: [{ set: 'ilya_rom', value: 'no' }], next: 'r1_no' },
      ],
    },
    r1_yes: { text: '"Right." It sounds like one thing. "Not here. Not on a watch, not tired. There\'s a well — " He stops. "When we\'re by a well. I\'ll tell you why there."', again: 'His shoulder, against yours.', options: [rest] },
    r1_later: { text: '"Right. I\'m good at waiting." He is, and he does, and the watch goes on.', again: 'The watch goes on.', options: [rest] },
    r1_no: { text: '"Right." He means: thank you for saying it plainly. You keep the watch till the light comes, and it is a good watch.', again: 'The watch, and the light coming.', options: [rest] },
    r2: {
      text: 'He takes the bucket down to the well-head himself and doesn\'t draw anything. "Agi drew for the whole east street, mornings. I\'d carry. That\'s how it started. A bucket." He sets it on the stone. "I didn\'t want this anywhere I\'d have to learn to remember her not being. So: here, where I already do." He looks at you. "Still want it?"',
      again: 'The bucket on the stone. He is waiting, and will take either answer.',
      options: [
        { id: 'ilya.r2.yes', text: 'Yes.', effects: I_WELL, next: 'r2_fade' },
        { id: 'ilya.r2.later', text: 'Not tonight. Stay here with me, though.', effects: [{ set: 'ilya_rom', value: 'later_well' }], next: 'r2_sit' },
        { id: 'ilya.r2.no', text: 'No. I\'m sorry.', effects: [{ set: 'ilya_rom', value: 'no' }], next: 'r2_no' },
      ],
    },
    r2b: {
      text: '"Another well." He nearly smiles. "I\'ve been counting wells." He sets the bucket on the stone. "Still a question. Still yours."',
      again: 'The bucket on the stone. He is waiting.',
      options: [
        { id: 'ilya.r2b.yes', text: 'Yes.', effects: I_WELL, next: 'r2_fade' },
        { id: 'ilya.r2b.no', text: 'No. Not this.', effects: [{ set: 'ilya_rom', value: 'no' }], next: 'r2_no' },
      ],
    },
    r2_fade: { text: 'He kisses you like a man who has decided something and wants to be sure of it, slowly, his ruined hand very careful at the back of your neck. The bucket stays on the stone. Much later he tells you the wind has gone round to the south, and for once it means nothing at all.', again: 'The well, and the bucket still on the stone.', options: [{ text: '(Morning.)', exit: true }] },
    r2_sit: { text: '"Right." He sits on the well\'s lip with you until the stars have moved a hand\'s width, and counts none of them.', again: 'The well\'s lip, and the stars.', options: [rest] },
    r2_no: { text: '"Right." It costs him; he pays it. He draws the water after all, and carries it back for both of you.', again: 'He has carried the water back.', options: [rest] },
    r3: {
      text: '"I stopped saying the number." He has noticed you noticed. "Somewhere. I don\'t know which day." He looks worried about it, and then not. "If there\'s an after, I\'d like to be in it with you. You can say it isn\'t that. Right."',
      again: 'He is waiting, and will take either answer.',
      options: [
        { id: 'ilya.r3.yes', text: 'It\'s that.', effects: [{ set: 'ilya_rom', value: 'committed' }, { set: 'romance_partner', value: ILYA }, I(5), { decision: { id: 'ilya_committed', text: 'You told Ilya there would be an after, and that you would be in it with him.' } }], next: 'r3_yes' },
        { id: 'ilya.r3.no', text: 'It isn\'t that, Ilya.', effects: [{ set: 'ilya_rom', value: 'no' }], next: 'r3_no' },
      ],
    },
    r3_yes: { text: '"Right." He says it like a whole sentence. Then, quieter, a word you have never heard him use about anything: "Good."', again: 'He isn\'t counting anything.', options: [rest] },
    r3_no: { text: '"Right." He nods, slowly. "It was good to count, for a while." In the morning he reads you the wind as if nothing had happened, which is how he says he means it.', again: 'He reads you the wind.', options: [rest] },
    c_rom_end: {
      text: '"Take the second watch with somebody else." He says it to the dark. "I count what\'s good for me now. You haven\'t been, lately." He doesn\'t list it. He doesn\'t need to.',
      again: 'He is facing the dark.',
      effects: [{ set: 'ilya_rom', value: 'ended' }, { decision: { id: 'ilya_rom_ended', text: 'Ilya ended it, at a fire. He counts what is good for him now.' } }],
      options: [{ text: '(Let him.)', exit: true }],
    },

    // the one night he drinks again (the boy's death): not the player's doing; he comes back from it
    c_drunk: {
      text: 'He\'s drunk. Not falling: precise and careful, the way a good shot is drunk. A bottle of somebody\'s bitters stands by his boot. "The boy," he says. "Twenty-two. They wrote him a month and he took it." He stops. "I shot a post once to show off for him. Right."',
      again: 'The bottle by his boot.',
      options: [
        { id: 'ilya.drunk.sit', text: '(Take the bottle away. Sit with him till it\'s light.)', effects: [{ set: 'ilya_relapse' }, { set: 'ilya_sober_days', value: 0 }, I(5)], next: 'c_drunk_sat' },
        { id: 'ilya.drunk.leave', text: '(Leave him to it.)', effects: [{ set: 'ilya_relapse' }, { set: 'ilya_sober_days', value: 0 }], next: 'c_drunk_left' },
        { id: 'ilya.drunk.join', text: '(Pour yourself one.)', effects: [{ set: 'ilya_relapse' }, { set: 'ilya_sober_days', value: 0 }, I(-5)], next: 'c_drunk_join' },
      ],
    },
    c_drunk_sat: { text: 'You sit. Toward dawn he says, "Start again." He says nothing else for an hour. Then: "One. Right."', again: 'He is counting again, from one.', options: [rest] },
    c_drunk_left: { text: 'In the morning the bottle is empty and he is up before you, the rifle cleaned. "One," he says, to nobody. "Right."', again: 'He is counting again, from one.', options: [rest] },
    c_drunk_join: { text: 'He watches you pour. "Don\'t," he says, too late, and then nothing, and the bottle goes down faster for two. In the morning he won\'t look at you, and starts counting again from one under his breath.', again: 'He won\'t look at you.', options: [rest] },

    // the others at the fire (U8 conflicts: at most two)
    x_wren: {
      text: 'Wren sits down on Ilya\'s side of the fire, which she has never done. "VASHA is on that garage wall," she says. "Same as mine. Same nail. Dogs go back for the bridge." Ilya stops counting. "Kade\'s a Dog." "She\'s the Dog," Wren says. "If I go for the bridge, she\'ll hear. She\'ll come, or the city will send her." She doesn\'t look at him. "Stand with me there."',
      again: 'Wren is still sitting on his side of the fire.',
      options: [
        { id: 'ilya.x.wren.yes', text: 'Stand with her, Ilya. You\'d both be where you need to be.', effects: [{ set: 'ilya_wren_bridge' }, I(2), W(3)], next: 'x_wren_yes' },
        { id: 'ilya.x.wren.no', text: 'That\'s using his hunt for your bridge, Wren.', effects: [W(-3), I(3)], next: 'x_wren_no' },
        { id: 'ilya.x.wren.him', text: '(Leave it to him.)', next: 'x_wren_him' },
      ],
    },
    x_wren_yes: { text: 'Ilya looks at her for a long time, the way he looks down a range. "You\'re not Kade," he says. "It isn\'t enough. It\'s close." He nods once. "Right. The bridge."', again: 'The two of them, on one side of the fire.', options: [rest] },
    x_wren_no: { text: '"It is," Wren says. "I\'m asking anyway." Ilya says nothing. Later, cleaning the rifle, he says "Right," to no one, and you don\'t know what he has decided.', again: 'Ilya is cleaning the rifle.', options: [rest] },
    x_wren_him: { text: 'He takes his time. "If she comes," he says at last, "I\'ll be on your bridge. If she doesn\'t, I\'ll still be on it, and I\'ll be cross." Wren almost laughs. "Right," she says, in his voice.', again: 'The two of them, on one side of the fire.', effects: [{ set: 'ilya_wren_bridge' }], options: [rest] },
    x_ash: {
      text: 'Ash has watched Ilya not drink for three nights, and on the fourth he says, "Friend. There\'s a weight to a thing like that." "Like what." "Not drinking." Ilya counts something. "Right." "The sky took mine," Ash says. "You could give it yours." Ilya looks at him for a long time. "I knew a drunk who got religion," he says. "He was a drunk with a hymn."',
      again: 'Neither of them has said anything since.',
      options: [
        { id: 'ilya.x.ash.ilya', text: 'Let him carry it his own way, Ash.', effects: [I(3), { approval: { companion: ASH, by: -2 } }], next: 'x_ash_i' },
        { id: 'ilya.x.ash.ash', text: 'Ash isn\'t wrong. Something has to hold it.', effects: [{ approval: { companion: ASH, by: 3 } }, I(-2)], next: 'x_ash_a' },
        { id: 'ilya.x.ash.both', text: 'You both burned something off yourselves. Three nights with a lamp. However many with a bottle.', if: { knows: 'ash_admits_dog' }, effects: [I(2), { approval: { companion: ASH, by: 2 } }], next: 'x_ash_b' },
      ],
    },
    x_ash_i: { text: 'Ash nods slowly, the way he takes a refusal at the burial ground. "His own way, then." Ilya doesn\'t thank you, which from him is thanks.', again: 'Ash is feeding the fire.', options: [rest] },
    x_ash_a: { text: '"Something," Ilya says. "Right." He turns his back to the fire for the rest of the night.', again: 'Ilya\'s back, to the fire.', options: [rest] },
    x_ash_b: { text: 'Ash looks at the cord of the scarf in his fingers. Ilya looks at his ruined hand. "Right," Ilya says. "Right," says Ash, and seems surprised to hear himself say it.', again: 'The two of them, looking at their hands.', options: [rest] },

    // lighter talk at the fire
    t_count: { text: '"So I know I was there." He thinks about it. "Shots. Steps. Days. If you count it, it happened, and you were in it." A pause. "I wasn\'t, once." He looks at you. "Nobody asks why. They ask me to stop. Right."', again: 'He is counting under his breath.', effects: [I(2)], options: [rest] },
    t_wind: {
      text: '"Dust off the left of a post means it\'s quartering." He\'s off: grass, smoke, the hang a flag would have if there were flags, the shimmer on the salt that lies about everything except the wind, the hour after dawn when it turns and the hour before dusk when it lies down. He talks for an hour, the most you have ever heard him say, and none of it is about anything else. At the end: "Right. That\'s the short version."',
      again: 'He is watching the smoke to see which way it leans.',
      effects: [{ learn: 'ilya_wind' }, I(2), { xp: 20 }],
      options: [rest],
    },
    t_hand: { text: '"Frost. The winter after." He flexes what\'s left. "Three nights in a ditch with a bottle and no gloves. The surgeon said I was lucky it was two." He turns the hand over. "I count them too. Eight. Right."', again: 'He is flexing the hand.', options: [rest] },
    t_ada: { text: '"Ada." He turns the name over. "I was the best shot she had. After, she let me be her worst instead of throwing me out. Kindest thing anybody did." He looks at the fire. "Never forgiven her for it. Right."', again: 'He has said what he will say about Ada.', options: [rest] },
    t_jonah_lived: { text: '"Alive." He says it like a count that came out right. "You changed the conditions. The tower, the street, the cistern." He nods to you, once. "Somebody wrote him a month, and you didn\'t let it be his. Right."', again: 'He is still pleased about it, quietly.', effects: [I(5)], options: [rest] },
    t_jonah_dead: { text: '"Twenty-two." He turns the rifle\'s sling round his wrist. "Read both books. Called me sir once, by mistake, and went red." A pause. "Right."', again: 'The sling, round his wrist.', options: [rest] },
    t_odile: { text: '"She bet Shale would fail." He looks across to where Odile would sit, if she were here. "It nearly did. I helped, from a fence, with a bottle." He shrugs. "Expensive woman. Everything she says costs something, even good morning. And she isn\'t wrong about Shale. That\'s the part I can\'t stand. Right."', again: 'He has said what he thinks of the trade.', options: [rest] },
    t_city: { text: '"No wind." He says it like a diagnosis. "Walls everywhere. The wind can\'t get a word in. Smoke goes straight up." He looks at the dark between the towers. "I don\'t know where anything is here. Right."', again: 'He is watching smoke go straight up.', options: [rest] },

    // what breaks him, and leaving (U8)
    c_bottle: {
      text: 'He looks at the bottle in your hand for a long time. Then he takes it, and doesn\'t open it. He stands and picks up the rifle, and the counting stops. "I gave you that so you\'d hold it," he says. "Not so you\'d hand it back when you wanted a better shot." He walks out of the firelight with the bottle, and doesn\'t come back.',
      again: 'The place where he sat.',
      effects: [{ take: 'c_bitters' }, ...I_GONE('bottle', 'You held out Ilya Strand\'s bottle to get a better shot out of him. He walked out of your firelight with it.'), I(-50), { memory: { npc: ILYA, tag: 'used_me_drunk', valence: -100, strength: 100 } }],
      options: [{ text: '(Let him go.)', exit: true }],
    },
    c_floor: {
      text: [
        { if: { flag: 'rd_coup' }, text: '"You put her in his chair." He is packed; he has been packed since the overpass. "I walked behind you after that to see what else you\'d do. I\'ve seen." He shoulders the rifle. "Right."' },
        { text: '"Right." He is packed. He doesn\'t say why; he counts it instead, under his breath, a list of things, and you recognise some of them. He walks out of the firelight on the last one.' },
      ],
      again: 'The place where he sat.',
      effects: [...I_GONE('floor', 'Ilya Strand walked out of your firelight. He had been counting.')],
      options: [{ text: '(Let him go.)', exit: true }],
    },
    left: {
      text: [
        { if: { flag: 'ilya_left', eq: 'bottle' }, text: 'He is sitting on his pack with the bottle beside him, unopened. He doesn\'t look up. "No."' },
        { if: { flag: 'ilya_left', eq: 'spared' }, text: 'He is sitting with the rifle across his knees, watching the road she took. "She walked." He doesn\'t look up. "I\'ll find which wash." It isn\'t a conversation.' },
        { text: 'He is cleaning the rifle. "Right," he says, which means: go on.' },
      ],
      again: 'He doesn\'t look up.',
      options: [
        { id: 'ilya.left.talk', text: '(Sit down across from him. Tell him what you did, and why, and don\'t dress it up.)', if: { all: [{ flag: 'ilya_left', eq: 'floor' }, { not: { seen: 'ilya.left.talk' } }] }, check: { skill: 'speech', dc: 55 }, effects: [{ set: 'ilya_left', value: false }, I(30), { join: ILYA }, { decision: { id: 'ilya_back', text: 'You told Ilya the truth, undressed, and he came back.' } }], next: 'left_back', fail: 'left_no' },
        { text: '(Leave him be.)', exit: true },
      ],
    },
    left_back: { text: 'He counts something under his breath, and gets to the end of it. "Right." He stands. "Once."', again: 'He is on the road ahead of you.', options: [{ text: 'Keep up.', exit: true }] },
    left_no: { text: '"Right." He doesn\'t look up from the rifle. "Go on."', again: 'He doesn\'t look up.', options: [{ text: '(Leave him be.)', exit: true }] },
  },
};
