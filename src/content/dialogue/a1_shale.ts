import type { DialogueDef } from '../../engine/dialogue/dialogue';

/** Act 1 in Shale: the man who drinks behind the militia yard. */

const bye = { text: 'That\'s all.', exit: true };

export const d_sh_ilya: DialogueDef = {
  id: 'd_sh_ilya', owner: 'npc_sh_17',
  start: [{ if: { inParty: 'npc_sh_17' }, node: 'party' }, { if: { flag: 'ilya_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man with a shaved head sits on the yard fence with a long rifle across his knees and a bottle beside him, counting the militia\'s shots under his breath as they miss. "Six. Seven. Right." He looks at you with eyes that are clearer than the rest of him. "You the one drilling them? Right."',
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
    again: { text: '"Eight. Right." The bottle is lower.', options: [
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
    joins: { text: '"Right." He puts the bottle on the far side of the fence. He picks up the rifle. "I count things. Out loud. You\'ll get used to it or you won\'t." He looks east, where the road is, and his face does something you weren\'t meant to see.', effects: [{ join: 'npc_sh_17' }, { set: 'ilya_recruited' }, { set: 'ilya_sober_days', value: 0 }, { approval: { companion: 'npc_sh_17', by: 10 } }, { decision: { id: 'ilya_recruited', text: 'Ilya Strand came with you, east, toward Vasha Kade.' } }, { news: { tag: 'ilya_left', text: 'Ilya Strand walked out of Shale with the salt-cut stranger, sober', valence: 10, size: 6, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'took_ilya', valence: 10, strength: 70 } }, { xp: 80 }], options: [{ text: 'Keep up.', exit: true }] },
    joins_shot: { text: 'The bottle goes. He watches the glass fall for a second longer than anyone else. "Right." He picks up the rifle. "I count things. Out loud." He doesn\'t look east. He doesn\'t have to.', effects: [{ join: 'npc_sh_17' }, { set: 'ilya_recruited' }, { set: 'ilya_sober_days', value: 0 }, { approval: { companion: 'npc_sh_17', by: 15 } }, { decision: { id: 'ilya_recruited', text: 'You outshot Ilya Strand\'s bottle and he came east with you.' } }, { news: { tag: 'ilya_left', text: 'Ilya Strand walked out of Shale with the salt-cut stranger, sober', valence: 10, size: 6, at: 'shale' } }, { memory: { npc: 'npc_sh_01', tag: 'took_ilya', valence: 10, strength: 70 } }, { xp: 80 }], options: [{ text: 'Keep up.', exit: true }] },
    refuses: { text: '"Right." He drinks. "Ten."', effects: [{ set: 'ilya_refused' }, { memory: { npc: 'npc_sh_17', tag: 'refused_you', valence: -5 } }], options: [{ text: '(Leave him.)', exit: true }] },
    refuses_shot: { text: 'You miss. He doesn\'t say anything, which is worse. Then he shoots the bottle, from the fence, sitting down. "Right."', effects: [{ set: 'ilya_refused' }, { memory: { npc: 'npc_sh_17', tag: 'missed_bottle', valence: -5 } }], options: [{ text: '(Leave him.)', exit: true }] },
    party: {
      text: [{ if: { flag: 'ilya_sober_days', gte: 3 }, text: '"Three days." He means sober. He is counting those too. "Right."' }, { text: '"Wind\'s from the east." He has the rifle slung and his hands are steady, mostly. "Right."' }],
      options: [
        { id: 'ilya.p.vasha', text: 'When we find her.', next: 'p_vasha', once: true },
        { id: 'ilya.p.wind', text: 'You talk about the wind a lot.', next: 'p_wind', once: true },
        { id: 'ilya.p.wait', text: 'Wait here for me.', effects: [{ leave: 'npc_sh_17' }], exit: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    p_vasha: { text: '"When." He likes the word. "She knows my name. I want her to know why before. After is after." He counts something. "You\'ll have an opinion. Keep it until then."', effects: [{ learn: 'ilya_wants_why' }], options: [{ text: 'Right.', exit: true }] },
    p_wind: { text: '"Wind\'s the thing you can\'t see that moves the thing you can." He shrugs. "Three nights east on a hunt because the wind was right. Right." He doesn\'t say anything else for a while.', effects: [{ trust: { npc: 'npc_sh_17', by: 5 } }], options: [{ text: 'Right.', exit: true }] },
  },
};
