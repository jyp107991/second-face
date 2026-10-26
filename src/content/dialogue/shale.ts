import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Shale — first conversations. Services (drink, the room, Dust, barter, healing, letters) live here; the
 * investigation of the stranger (q_ch1_shale) adds its nodes in shale_quest.ts through the same trees.
 */

const bye = { text: 'Later.', exit: true };

export const d_sh_mags: DialogueDef = {
  id: 'd_sh_mags', owner: 'npc_sh_03',
  start: [{ if: { flag: 'sh_mags_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Well, look at you. Dust from the salt cut and a face I don\'t know, which in this town is a thing. Mags. This is the Dry Well, and the name\'s a joke that stopped being one. What\'ll it be, love?',
      effects: [{ set: 'sh_mags_met' }],
      passives: [{ attr: 'senses', dc: 6, text: 'Her eyes go to your boots, your hands, your belt — pricing you — before they get to your face.' }],
      options: [{ text: 'What have you got?', next: 'menu' }],
    },
    again: { text: [{ if: { all: [{ flag: 'teo_freed' }, { not: { flag: 'mags_told_teo' } }] }, text: 'You. Nell says — is it true? Is he —' }, { if: { flag: 'shale_room' }, text: 'Your room\'s where you left it, love. What else?' }, { text: 'Back again. Drink, bed, or trouble?' }], options: [{ id: 'mags.teo.back', text: 'Teo\'s out. He\'s walking home. He says the count was right.', if: { all: [{ flag: 'teo_freed' }, { not: { flag: 'mags_told_teo' } }] }, next: 'teo_back' }, { text: 'Let\'s see.', next: 'menu' }] },
    teo_back: {
      text: 'She doesn\'t cry; she hits the bar with the flat of her hand hard enough to jump the glasses, twice, and then pours you something that isn\'t rot. "The count was right. Of course it was right." She pushes thirty Tolls across. "That\'s on the house. All of it. Forever. Don\'t argue with me, love."',
      effects: [{ set: 'mags_told_teo' }, { give: 'tolls', count: 30 }, { trust: { npc: 'npc_sh_03', by: 25 } }, { set: 'shale_room' }, { news: { tag: 'teo_home', text: 'Teo Marsh is back behind the bar at the Dry Well', valence: 15, size: 5, at: 'shale' } }, { xp: 40 }],
      options: [{ text: 'I won\'t.', next: 'menu' }],
    },
    menu: {
      text: 'Drink\'s on the house — the first one. Water\'s two. The back room\'s ten a night, and nobody\'ll touch your things because nobody wants to find out what I\'d do. And there\'s always a game on.',
      options: [
        { id: 'mags.drink', text: 'The free one, then.', next: 'drink', once: true },
        { id: 'mags.room', text: 'The room. (10 Tolls)', if: { all: [{ not: { flag: 'shale_room' } }, { item: 'tolls', count: 10 }] }, effects: [{ take: 'tolls', count: 10 }, { set: 'shale_room' }, { learn: 'shale_room' }], next: 'room' },
        { id: 'mags.room.broke', text: 'The room — I\'ll owe you.', if: { all: [{ not: { flag: 'shale_room' } }, { not: { item: 'tolls', count: 10 } }] }, check: { skill: 'speech', dc: 35 }, effects: [{ set: 'shale_room' }, { set: 'shale_room_owed' }, { memory: { npc: 'npc_sh_03', tag: 'owes_mags', valence: -5 } }], next: 'room_owed', fail: 'room_no' },
        { id: 'mags.dust', text: 'A game of Dust. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ event: 'dust', data: { stake: 5 } }], exit: true },
        { id: 'mags.trade', text: 'Let me see what you\'re selling.', effects: [{ event: 'barter' }], exit: true },
        { id: 'mags.town', text: 'Tell me about Shale.', next: 'town' },
        { id: 'mags.teo', text: 'Who\'s Teo?', if: { any: [{ knows: 'mags_teo' }, { seen: 'mags.town' }] }, next: 'teo', once: true },
        { id: 'mags.stranger', text: 'A tall old man with a mask on a cord. Three weeks back. Did he drink here?', if: { quest: 'q_ch1_shale' }, next: 'stranger', once: true },
        bye,
      ],
    },
    stranger: {
      text: '"Everybody drinks here, love; it\'s the only here." She polishes the same glass. "I remember. He sat by the door where Hollis sits and he didn\'t say ten words. What he said, and who he said it to — that\'s worth something. Gossip\'s my second trade."',
      options: [
        { id: 'mags.stranger.pay', text: '(Pay her. 5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }], next: 'stranger_tell' },
        { id: 'mags.stranger.trust', text: 'I\'m not here to buy. His people are my people.', check: { skill: 'speech', dc: 35, mods: [{ if: { trust: { npc: 'npc_sh_03', gte: 5 } }, dc: -10, why: 'she likes you' }] }, next: 'stranger_tell', fail: 'stranger_no' },
        { id: 'mags.stranger.teo', text: 'Tell me, and I\'ll ask after Teo at the overpass.', if: { knows: 'teo_prisoner' }, effects: [{ set: 'promised_mags_teo' }, { decision: { id: 'promised_mags_teo', text: 'You promised Mags you would ask after Teo at the overpass.' } }], next: 'stranger_tell' },
        { text: 'Never mind.', next: 'menu' },
      ],
    },
    stranger_tell: {
      text: '"He asked Nell — not me, Nell — what the Dogs paid for water, and whether Kessler could read. Then he took out a folded paper, looked at it like it was a face, and put it away. He said, to nobody, \'they\'ll give me water for this.\' And he went west in the morning, toward the overpass, walking like a man who\'d been shot."',
      effects: [{ learn: 'mags_saw_stranger' }, { learn: 'kessler_has_map' }, { lead: 'l_map_traded' }, { learn: 'loc_rustdogs' }, { xp: 30 }],
      options: [{ text: 'Thank you.', next: 'menu' }],
    },
    stranger_no: { text: '"Then it\'s five Tolls, love, same as everyone." Not unkind.', options: [{ text: 'Fine.', next: 'stranger' }, { text: 'Never mind.', next: 'menu' }] },
    drink: { text: 'She pours something brown that smells of fruit and lamp oil. "Rot bitters. Don\'t ask what rotted." It goes down like a decision you\'ll regret.', effects: [{ give: 'c_bitters' }, { trust: { npc: 'npc_sh_03', by: 3 } }], options: [{ text: 'Obliged.', next: 'menu' }] },
    room: { text: 'Back through there, past the barrels. Bed, a locker, a door that locks from the inside and a window that doesn\'t open. Welcome to Shale, love.', options: [{ text: 'Thanks.', next: 'menu' }] },
    room_owed: { text: 'She looks at you a long moment. "Teo used to say that. All right. You owe me ten, and I don\'t forget." She writes it on the wall behind the bar with a stub of pencil.', options: [{ text: 'I\'m good for it.', next: 'menu' }] },
    room_no: { text: '"Everybody\'s good for it, love. That\'s why I\'ve got a wall of names." Come back with Tolls.', options: [{ text: 'Fair.', next: 'menu' }] },
    town: {
      text: 'Two pumps, one sheriff, one saloon, one Tollman, one Choir tent full of people who\'ll bandage you for free and pray at you for less. The Dogs under the overpass take a tithe twice a year and the rest of the time we pretend they don\'t. And my Teo — my partner — went east with a wagon of salt five weeks ago and the wagon came back without him.',
      effects: [{ learn: 'mags_teo' }, { learn: 'shale_tribute' }],
      options: [{ text: 'Who\'s Teo?', next: 'teo' }, { text: 'Thanks.', next: 'menu' }],
    },
    teo: {
      text: 'Teo Marsh. Trader, partner, the one who could count. The Dogs have him, under the overpass, for a debt he says isn\'t his and they say is. They want sixty Tolls or a wagon of something. I\'ve got a bar.',
      effects: [{ learn: 'teo_prisoner' }, { lead: 'l_teo_held' }, { learn: 'loc_rustdogs' }, { quest: 'q_sh_prisoner', start: true }],
      options: [{ text: 'I\'ll keep an ear open.', next: 'menu' }],
    },
  },
};

export const d_sh_room: DialogueDef = {
  id: 'd_sh_room', owner: 'narrator',
  start: [{ if: { flag: 'shale_room' }, node: 'yours' }, { node: 'not_yours' }],
  nodes: {
    not_yours: { text: 'The back room. A bed with a real mattress, a locker, a bolt on the door. Mags rents it; nobody sleeps here for free.', options: [{ text: '(Leave it.)', exit: true }] },
    yours: {
      text: 'Your room, for now. The bolt is heavy and the mattress smells of someone else\'s years, and it is the first door you have ever been able to lock from the inside.',
      options: [
        { text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
  },
};

export const d_sh_pumps: DialogueDef = {
  id: 'd_sh_pumps', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Two pumps on a concrete apron, pre-Burn work patched with everything since. They run in bursts and stop, and the whole town leans toward them when they start.',
      passives: [
        { skill: 'mechanics', dc: 35, text: 'There is no hand-switch. The pumps are driven from somewhere else — the pipe runs north, under the pump house, and keeps going.', effects: [{ learn: 'pumps_remote' }, { lead: 'l_pumps_remote' }] },
        { attr: 'senses', dc: 7, text: 'A faint click before each burst, from a box on the north pump. Something counts before the water comes.', effects: [{ learn: 'pumps_click' }] },
      ],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

export const d_sh_nell: DialogueDef = {
  id: 'd_sh_nell', owner: 'npc_sh_10',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Hi. Nell. Mags is my aunt, which means I pour and she talks. You\'re the one from the salt cut? Everyone says there\'s a bunker out there with people in it. Everyone says a lot.',
      options: [
        { id: 'nell.wheel', text: 'You mentioned the Wheel.', next: 'wheel', once: true },
        { id: 'nell.leave', text: 'You want to leave Shale.', if: { attr: 'wits', gte: 6 }, next: 'leave', once: true },
        { id: 'nell.mother', text: 'Is it just you and Mags?', next: 'mother', once: true },
        bye,
      ],
    },
    wheel: { text: 'Forty wagons, horses, a whole town that moves. They stayed two days and when they left the street was quiet for a week. Ruth at the caravan post rides with them sometimes. I asked her what they need. She said "people who don\'t ask".', effects: [{ learn: 'nell_wheel' }], options: [{ text: 'Huh.', next: 'intro' }] },
    leave: { text: 'She goes red. "Does it show? Don\'t tell her. She\'d say it was the house that was leaving, not me." She wipes a glass that was already clean.', effects: [{ learn: 'nell_wants_out' }, { trust: { npc: 'npc_sh_10', by: 5 } }], options: [{ text: 'I won\'t.', next: 'intro' }] },
    mother: { text: '"My mum died when I was nine. Fever year. Mags took me on like a bar tab — says it every birthday." She smiles like it doesn\'t cost anything.', effects: [{ learn: 'nell_mother_dead' }], options: [{ text: 'I\'m sorry.', next: 'intro' }] },
  },
};

export const d_sh_ada: DialogueDef = {
  id: 'd_sh_ada', owner: 'npc_sh_01',
  start: [{ if: { flag: 'sh_ada_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Sheriff Vey. You\'re new, you\'re armed or you\'re stupid, and you came in on the west road, which means the salt cut or the Dogs. Which?',
      effects: [{ set: 'sh_ada_met' }],
      passives: [{ attr: 'wits', dc: 7, text: 'A folded letter under the blotter, Tollmen seal up. She moves a cup onto it as you look.', effects: [{ learn: 'ada_letter' }] }],
      options: [
        { id: 'ada.cut', text: 'The salt cut. Cistern 9. A man died at our door and I\'m finding out who he was.', next: 'cut' },
        { id: 'ada.lie', text: 'Passing through.', check: { skill: 'speech', dc: 40 }, next: 'lie_ok', fail: 'lie_no' },
        { id: 'ada.dogs', text: 'What if I said the Dogs?', next: 'dogs' },
      ],
    },
    cut: {
      text: '"Cistern 9." She says it like a name from a story. "So the bunker\'s real, and it opens. Noted." A pause. "A dead man at your door — tall, old, a mask on a cord? He came through here. Three weeks back. Bought water from Pardo with a ring and asked for the east road and the overpass. I told him the overpass would kill him. He thanked me."',
      effects: [{ learn: 'ada_saw_stranger' }, { lead: 'l_stranger_shale' }, { trust: { npc: 'npc_sh_01', by: 5 } }, { news: { tag: 'cistern_person', text: 'someone from the salt-cut bunker is in town', valence: 2, size: 4, at: 'shale' } }],
      options: [{ text: 'Did he say his name?', next: 'name' }, { text: 'What\'s at the overpass?', next: 'overpass' }, { text: 'I\'ll ask around.', next: 'rules' }],
    },
    lie_ok: { text: '"Everybody\'s passing through. Some of them stop." She lets it go, and you can see her file it. "Rules are short."', options: [{ text: 'Go on.', next: 'rules' }] },
    lie_no: { text: '"No, you\'re not." Flat. "You came out of the salt cut; Pardo saw you on the ridge. Don\'t lie to me in my own office; it wastes both our mornings."', effects: [{ trust: { npc: 'npc_sh_01', by: -5 } }], options: [{ text: 'Fine. Cistern 9.', next: 'cut' }] },
    dogs: { text: '"Then I\'d ask you to leave the gun on the counter and I\'d watch you walk back out." She doesn\'t reach for anything. "Are you saying it?"', options: [{ text: 'No. The salt cut.', next: 'cut' }, { text: 'Passing through.', next: 'rules' }] },
    name: { text: '"He didn\'t, and I asked twice. He had a way of not hearing questions. Pike at the Tollmen post talked to him longer than I did — ask him what it cost."', effects: [{ learn: 'pike_met_stranger' }], options: [{ text: 'What\'s at the overpass?', next: 'overpass' }, { text: 'Thanks.', next: 'rules' }] },
    overpass: { text: '"The Rust Dogs. Forty, fifty of them under a dead highway, with the water they take from us and the people they take from the road. Kessler runs them; he\'s a thief with manners. His lieutenant has none." She looks at you. "If you go, go in daylight, hands empty, and don\'t say my name like it\'s a password."', effects: [{ learn: 'overpass_dogs' }, { learn: 'kessler_name' }, { learn: 'loc_rustdogs' }], options: [{ text: 'Noted.', next: 'rules' }] },
    rules: {
      text: 'Rules: no guns drawn in town, no stealing water, no fighting the Dogs on my street unless I start it. Break one and you\'re in the cell. Break two and you\'re on the road. We\'re thin here; I can\'t afford trouble I didn\'t choose.',
      options: [{ text: 'Understood.', exit: true }, { id: 'ada.help', text: 'You look like someone who needs hands.', next: 'help', once: true }],
    },
    help: { text: '"I need water and I need a month without a funeral. If you can get me either, come back." The corner of her mouth moves. "Noted, anyway."', effects: [{ learn: 'ada_needs_hands' }], options: [{ text: 'I\'ll keep it in mind.', exit: true }] },
    again: {
      text: [{ if: { standing: { settlement: 'shale', gte: 15 } }, text: 'People are saying your name without spitting. Keep it up.' }, { if: { standing: { settlement: 'shale', lte: -15 } }, text: 'I hear things. I\'m hearing them about you.' }, { text: 'Sheriff\'s office. Say it quick.' }],
      options: [
        { id: 'ada.stranger.again', text: 'About the man with the mask.', if: { not: { knows: 'ada_saw_stranger' } }, next: 'cut' },
        { id: 'ada.overpass.again', text: 'Tell me about the overpass.', if: { not: { knows: 'overpass_dogs' } }, next: 'overpass' },
        { text: 'Nothing. Just checking in.', exit: true },
      ],
    },
  },
};

export const d_sh_jonah: DialogueDef = {
  id: 'd_sh_jonah', owner: 'npc_sh_02',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: [{ if: { pronouns: 'she' }, text: 'Ma\'am. Deputy Reese. Sheriff\'s inside if you need the sheriff. If you need a deputy, that\'s — that\'s me.' }, { if: { pronouns: 'he' }, text: 'Sir. Deputy Reese. Sheriff\'s inside if you need the sheriff. If you need a deputy, that\'s — that\'s me.' }, { text: 'Deputy Reese. Sheriff\'s inside if you need the sheriff. If you need a deputy, that\'s — that\'s me.' }],
      options: [
        { id: 'jonah.job', text: 'How long have you been deputy?', next: 'job', once: true },
        { id: 'jonah.read', text: 'Somebody told me you read.', next: 'read', once: true },
        { id: 'jonah.dad', text: 'Dov Reese — your father?', if: { knows: 'dov_met' }, next: 'dad', once: true },
        bye,
      ],
    },
    job: { text: '"A year in spring. Ada — the Sheriff — said I could, so I did." He stands straighter. "I know what people say. That I\'m too young. I\'m going to be the kind of deputy they stop saying it about."', effects: [{ learn: 'jonah_earnest' }], options: [{ text: 'Good luck.', next: 'intro' }] },
    read: { text: '"Everything in town. Both books." He grins, then catches it. "The pump manual, the Tollmen rate card, the Choir\'s pamphlet, a box of pre-Burn magazines Mags keeps for the pictures. I read the words."', options: [{ text: 'Keep it up.', next: 'intro' }] },
    dad: { text: 'The grin goes. "He thinks the badge is a target. Maybe it is. Somebody has to wear it."', effects: [{ learn: 'jonah_father_rift' }], options: [{ text: 'Somebody does.', next: 'intro' }] },
  },
};

export const d_sh_issa: DialogueDef = {
  id: 'd_sh_issa', owner: 'npc_sh_11',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Corporal Lind. Militia — eleven of us, nine rifles, four that shoot. If you can shoot, I want to know. If you can\'t, stay off the street when the Dogs come.',
      options: [
        { id: 'issa.shoot', text: 'I can shoot.', if: { skill: 'firearms', gte: 35 }, next: 'shoot', once: true },
        { id: 'issa.dogs', text: 'When do the Dogs come?', next: 'dogs', once: true },
        bye,
      ],
    },
    shoot: { text: '"Then you\'re the fifth rifle." She looks you over once, properly. "Ada will say no. Ada says no to everything until she says yes."', effects: [{ learn: 'issa_counts_you' }, { trust: { npc: 'npc_sh_11', by: 8 } }], options: [{ text: 'We\'ll see.', next: 'intro' }] },
    dogs: { text: '"Tribute\'s due. Half a year since the last. They come with a truck, they take water and whatever Mags has brewed, and this time they\'ll want more because Kessler\'s lieutenant counts. Vasha. Say the name to Ada and watch her face."', effects: [{ learn: 'tribute_due' }, { learn: 'vasha_name' }, { learn: 'loc_rustdogs' }], options: [{ text: 'Noted.', next: 'intro' }] },
  },
};

export const d_sh_pike: DialogueDef = {
  id: 'd_sh_pike', owner: 'npc_sh_04',
  start: [{ if: { flag: 'sh_pike_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Good day. Factor Pike, Tollmen post nine-west. Rates are posted; delivery is guaranteed between posts; water is sold by the measure and I do not haggle, as it wastes the time of the person who would have paid.',
      effects: [{ set: 'sh_pike_met' }],
      passives: [{ attr: 'wits', dc: 8, text: 'A list on the wall behind him: SEED — ANY VARIETY — ANY QUANTITY — PAID IN TOLLS OR SCRIP. The prices are absurd.', effects: [{ learn: 'pike_buys_seed' }] }],
      options: [{ text: 'Let\'s see the stock.', effects: [{ event: 'barter' }], exit: true }, { id: 'pike.seed', text: 'You\'re buying seed.', if: { knows: 'pike_buys_seed' }, next: 'seed', once: true }, { id: 'pike.who', text: 'Who are the Tollmen?', next: 'who', once: true }, { id: 'pike.stranger', text: 'A masked man came through three weeks ago. You spoke with him.', if: { quest: 'q_ch1_shale' }, next: 'stranger', once: true }, bye],
    },
    again: { text: 'As per. Stock, or something else?', options: [{ text: 'Stock.', effects: [{ event: 'barter' }], exit: true }, { id: 'pike.seed.again', text: 'About the seed.', if: { all: [{ knows: 'pike_buys_seed' }, { not: { seen: 'pike.seed' } }] }, next: 'seed' }, { id: 'pike.stranger.again', text: 'About the masked man.', if: { all: [{ quest: 'q_ch1_shale' }, { not: { seen: 'pike.stranger' } }] }, next: 'stranger' }, bye] },
    stranger: {
      text: '"Information is a good, and goods have rates." He does not smile. "Fifteen Tolls. For that you get what he asked me and what I told him, verbatim; the Tollmen do not embroider."',
      options: [
        { id: 'pike.stranger.pay', text: '(Pay. 15 Tolls)', if: { item: 'tolls', count: 15 }, effects: [{ take: 'tolls', count: 15 }], next: 'stranger_tell' },
        { id: 'pike.stranger.haggle', text: 'You said yourself: he\'s not your client. Ten.', check: { skill: 'barter', dc: 40 }, if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }], next: 'stranger_tell', fail: 'stranger_no' },
        { text: 'Not today.', next: 'intro' },
      ],
    },
    stranger_tell: {
      text: '"He asked the price of water at the overpass. I said Kessler sells it by the life. He said he had a paper Kessler would want more than a life — a map, with names on it — and asked whether the Tollmen would pay better. I quoted him. He laughed, which hurt him, and went west." Pike straightens a ledger that was straight. "I reported the conversation, as per."',
      effects: [{ learn: 'pike_saw_stranger' }, { learn: 'kessler_has_map' }, { lead: 'l_map_traded' }, { learn: 'pike_reported' }, { lead: 'l_pike_reported' }, { learn: 'loc_rustdogs' }, { learn: 'loc_tollhouse' }, { xp: 30 }],
      options: [{ text: 'Reported to whom?', next: 'reported' }, { text: 'Noted.', next: 'intro' }],
    },
    reported: { text: '"To the post east. As per." The ledger closes.', options: [{ text: 'Noted.', next: 'intro' }] },
    stranger_no: { text: '"Fifteen. The rate does not move because the buyer is clever."', options: [{ text: 'Fine.', next: 'stranger' }, { text: 'Not today.', next: 'intro' }] },
    who: { text: '"A guild. We hold the roads between the posts, we carry, we insure, we lend. The Reach moves because we move it." He smiles with the top half of his face. "Everything you own came through a Tollhouse, or it was stolen from someone whose did."', effects: [{ learn: 'tollmen_guild' }], options: [{ text: 'Noted.', next: 'intro' }] },
    seed: {
      text: '"Any variety. Any quantity. Viable, which I test." He does not explain who wants it. "You came from the salt cut, I\'m told. A shelter like that keeps a seed bank, or it wouldn\'t have lasted the first winter. I would pay very well. I would pay in advance."',
      effects: [{ learn: 'pike_seed_offer' }, { lead: 'l_seed_buyer' }],
      options: [{ text: 'I\'ll think about it.', next: 'intro' }, { id: 'pike.seed.who', text: 'Who\'s it for?', check: { skill: 'speech', dc: 50 }, next: 'seed_who', fail: 'seed_who_no', once: true }],
    },
    seed_who: { text: '"A client east of the Teeth with a great deal of glass and not enough green under it." He stops, surprised at himself, and his face closes like a ledger. "Rates are posted."', effects: [{ learn: 'seed_client_east' }], options: [{ text: 'Noted.', next: 'intro' }] },
    seed_who_no: { text: '"A client. As per." The ledger closes.', options: [{ text: 'Fine.', next: 'intro' }] },
  },
};

export const d_sh_calla: DialogueDef = {
  id: 'd_sh_calla', owner: 'npc_sh_05',
  start: [{ if: { flag: 'sh_calla_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Sit. No — you\'re not hurt; you\'re standing like someone who expects to be. I\'m Calla. The Choir keeps this tent: water, bandages, a cot if you need one, and nobody asks you to sing.',
      effects: [{ set: 'sh_calla_met' }],
      passives: [{ attr: 'senses', dc: 7, text: 'Painted small on the tent-pole behind her, faded: half a sun with no ground under it.', effects: [{ learn: 'calla_sigil' }, { lead: 'l_sigil_shale' }] }],
      options: [{ text: 'What do you have?', next: 'menu' }],
    },
    again: { text: 'The sky\'s still up. What do you need?', options: [{ text: 'Let me see.', next: 'menu' }] },
    menu: {
      text: 'Ask.',
      options: [
        { id: 'calla.heal', text: 'Patch me up.', if: { not: { flag: 'calla_healed_today' } }, next: 'heal' },
        { id: 'calla.trade', text: 'Supplies.', effects: [{ event: 'barter' }], exit: true },
        { id: 'calla.choir', text: 'What is the Choir?', next: 'choir', once: true },
        { id: 'calla.word', text: '"Larkspur."', if: { knows: 'word_larkspur' }, next: 'larkspur', once: true },
        { id: 'calla.sigil', text: 'That sign on the pole. I\'ve seen it on a mask.', if: { all: [{ knows: 'calla_sigil' }, { knows: 'sigil_seen' }] }, next: 'sigil', once: true },
        bye,
      ],
    },
    heal: {
      text: 'She works fast and talks while she does it, which you suspect is the point. Clean water, a needle, something that stings.',
      effects: [{ set: 'calla_healed_today' }, { event: 'heal' }, { after: { minutes: 720, id: 'calla_heal_reset', effects: [{ set: 'calla_healed_today', value: false }] } }, { trust: { npc: 'npc_sh_05', by: 3 } }],
      options: [{ text: 'Thank you.', next: 'menu' }],
    },
    choir: { text: '"People who decided the sky was enough to pray to, since it was all that was left. We farm, we heal, we bury. Some of us wear masks at the rites so the sky sees a face it can\'t name." She smiles. "That\'s the short version. The long one has a lot of singing."', effects: [{ learn: 'choir_what' }], options: [{ text: 'Thanks.', next: 'menu' }] },
    larkspur: {
      text: 'She goes very still, then very busy. "Where did you hear that?" You tell her: a dying man at a door. She closes her eyes. "Then he got that far. Say it to no one else. Not here. There\'s a man east, at Openfield — I can\'t tell you more than that, and you should not want me to."',
      effects: [{ learn: 'calla_knows_word' }, { lead: 'l_larkspur_calla' }, { trust: { npc: 'npc_sh_05', by: 15 } }, { decision: { id: 'said_larkspur_calla', text: 'You said the dead man\'s word to Sister Calla.' } }],
      options: [{ text: 'All right.', next: 'menu' }],
    },
    sigil: { text: '"Lots of people paint the open sky." Her hands keep folding a bandage that was folded. "If you have the mask, keep it out of the Tollmen\'s sight. They don\'t like what it means."', effects: [{ learn: 'calla_sigil_warning' }], options: [{ text: 'What does it mean?', next: 'sigil2' }, { text: 'Noted.', next: 'menu' }] },
    sigil2: { text: '"That nothing is written yet." She looks up. "It\'s a prayer. It\'s also a complaint."', effects: [{ learn: 'sigil_unwritten' }], options: [{ text: 'Thanks.', next: 'menu' }] },
  },
};

export const d_sh_hollis: DialogueDef = {
  id: 'd_sh_hollis', owner: 'npc_sh_06',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Pup. You\'ve got salt on you. Sit, I don\'t bite, haven\'t the — well. Hollis Crane, oldest living thing in Shale after the pumps. Spare a pull of something?',
      options: [
        { id: 'hollis.still', text: '(Give him the stillwater.)', if: { item: 'c_stillwater' }, effects: [{ take: 'c_stillwater' }, { trust: { npc: 'npc_sh_06', by: 15 } }, { memory: { npc: 'npc_sh_06', tag: 'player_gave_still', valence: 15 } }], next: 'gift', once: true },
        { id: 'hollis.bitters', text: '(Give him the bitters.)', if: { item: 'c_bitters' }, effects: [{ take: 'c_bitters' }, { trust: { npc: 'npc_sh_06', by: 5 } }], next: 'gift_b', once: true },
        { id: 'hollis.boards', text: 'What are "the boards"?', next: 'boards', once: true },
        { id: 'hollis.kite', text: 'What\'s a kite day?', next: 'kite', once: true },
        { id: 'hollis.stranger', text: 'A masked man sat here three weeks ago. Tall, old, hurt.', if: { all: [{ quest: 'q_ch1_shale' }, { any: [{ knows: 'hollis_likes_you' }, { trust: { npc: 'npc_sh_06', gte: 10 } }] }] }, next: 'stranger', once: true },
        { id: 'hollis.stranger.cold', text: 'A masked man sat here three weeks ago.', if: { all: [{ quest: 'q_ch1_shale' }, { not: { knows: 'hollis_likes_you' } }, { trust: { npc: 'npc_sh_06', lte: 9 } }] }, next: 'stranger_cold', once: true },
        bye,
      ],
    },
    stranger_cold: { text: '"Lots of men sit here, pup. I don\'t remember the ones who don\'t bring a bottle."', options: [{ text: 'Fair.', next: 'intro' }] },
    stranger: {
      text: '"Him." The old man goes quiet in a way he hasn\'t been. "He sat where you are. We didn\'t talk. We didn\'t need to — I knew the mask, pup, and he knew I knew it. He had a map. Folded small, kept close, the way you keep a thing you\'ve already decided to sell. He asked me if the Dogs kept their word on water. I said Kessler does. He nodded like a man picking a grave."',
      effects: [{ learn: 'hollis_saw_stranger' }, { learn: 'kessler_has_map' }, { lead: 'l_map_traded' }, { learn: 'hollis_knew_mask' }, { learn: 'loc_rustdogs' }, { xp: 30 }],
      options: [{ text: 'You knew the mask?', next: 'mask' }, { text: 'Thank you.', exit: true }],
    },
    mask: { text: '"I knew a man who wore one like it. Forty years ago, in a place with boards." He won\'t say more; he turns his cup over. "Ask me again when I\'m drunker, pup. Or soberer. One of the two."', effects: [{ lead: 'l_hollis_knew_mask' }], options: [{ text: 'I will.', exit: true }] },
    gift: { text: 'He drinks it like a man checking the time. "Pup. Pup, you\'re all right." His eyes go somewhere far east. "Ask me something. Quick, while I like you."', effects: [{ learn: 'hollis_likes_you' }], options: [{ text: 'What are "the boards"?', next: 'boards' }, { text: 'Later.', exit: true }] },
    gift_b: { text: '"Mags\'s rot." He drinks it anyway. "That\'s not a kindness, pup, but I\'ll take the thought."', options: [{ text: 'What are "the boards"?', next: 'boards' }, bye] },
    boards: { text: '"City boards. Screens, pup, tall as a house, with your face on \'em if you were worth a line. Said who paid, who owed, who was next." He laughs, dry as the street. "I had a line once. A short one."', effects: [{ learn: 'hollis_city_boards' }, { lead: 'l_hollis_city' }], options: [{ text: 'Which city?', next: 'which' }, bye] },
    which: { text: '"The only one that counts, pup. West, past the glass, where it rains." He won\'t say the name; he mouths it and looks at the Tollmen post. "Forty years. They don\'t let you out, you know. You leave."', effects: [{ learn: 'hollis_was_in_city' }], options: [{ text: 'Thanks, old man.', exit: true }] },
    kite: { text: '"Machines, pup. Big wings, no bird in \'em, from before. They come up from the south when the wind\'s wrong and they look at you." He taps his nose. "Smell the air. Ozone. That\'s a kite day."', effects: [{ learn: 'kite_days' }], options: [{ text: 'Right.', next: 'intro' }] },
  },
};

export const d_sh_yusra: DialogueDef = {
  id: 'd_sh_yusra', owner: 'npc_sh_08',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Hold still — no, you\'re fine. Yusra Hadid, Mender. I fix what\'s broken and fit what fits. You don\'t wear any work, do you? Clean as a Choir baby. Rare.',
      options: [
        { id: 'yusra.work', text: 'The work?', next: 'work', once: true },
        { id: 'yusra.trade', text: 'What do you sell?', effects: [{ event: 'barter' }], exit: true },
        { id: 'yusra.fit', text: 'Could you fit something in me?', if: { knows: 'yusra_work' }, next: 'fit', once: true },
        bye,
      ],
    },
    work: { text: '"Chrome. Bionics. Eyes that see heat, a hand that doesn\'t shake, a spine-link. Rare out here; the city makes the good pieces and the Concern makes the better ones and both of them keep a hand on the leash." She wipes a blade. "I fit what people bring me. I take it out again when it goes wrong, and it does."', effects: [{ learn: 'yusra_work' }], options: [{ text: 'Could you fit something in me?', next: 'fit' }, bye] },
    fit: { text: '"With what? I\'ve got a Holdfast — an old stabiliser for the hands — and that\'s it, and it costs more than you\'ve got. Bring me a piece and the Tolls for the surgery, and I\'ll tell you if your body will keep it." She looks at you honestly. "Most people shouldn\'t."', effects: [{ learn: 'yusra_fits' }], options: [{ text: 'Noted.', exit: true }] },
  },
};

export const d_sh_dov: DialogueDef = {
  id: 'd_sh_dov', owner: 'npc_sh_09',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'You\'re in the light. — Dov Reese. Pumps. If you\'re here about my boy, Ada\'s got him, go ask her what she\'s doing with him.',
      effects: [{ learn: 'dov_met' }],
      options: [
        { id: 'dov.pumps', text: 'Who runs the pumps?', next: 'pumps', once: true },
        { id: 'dov.pump_hand', text: 'The pressure on these never changes either, does it?', if: { all: [{ origin: 'pump_hand' }, { knows: 'c9_pressure_constant' }] }, next: 'pressure', once: true },
        { id: 'dov.jonah', text: 'Your son seems set on the badge.', next: 'jonah', once: true },
        bye,
      ],
    },
    pumps: { text: '"Nobody. That\'s the joke." He bangs the casing. "Switch is inside, dead since my father\'s time. They run on a schedule — six, eleven, four, nine, give or take — and the schedule changes maybe twice a year, and nobody here changes it. I\'ve got the manual. Half of it\'s in a hand I can\'t read."', effects: [{ learn: 'dov_pumps_schedule' }, { lead: 'l_pump_manual' }], options: [{ text: 'Can I see the manual?', next: 'manual' }, bye] },
    manual: { text: [{ if: { origin: 'archive_clerk' }, text: 'He hands you a swollen binder. The unreadable half is record shorthand — your hand. MAINTENANCE SCHEDULE: REMOTE. SUPPLY: NETWORK 4. The rest is pressures and part numbers.' }, { if: { origin: 'pump_hand' }, text: 'He hands you a swollen binder. The diagrams you know — same pumps as home, same valves. The unreadable half is a tight print you\'ve seen on MOTHER\'s crates.' }, { text: 'He hands you a swollen binder. Diagrams, pressures, and half of it in a tight print that isn\'t any language you know.' }], effects: [{ learn: 'pump_manual_seen' }, { lead: 'l_pump_manual_hand' }], options: [{ text: 'Thanks.', exit: true }] },
    pressure: { text: 'He looks at you for a long moment. "No. No, it doesn\'t. You\'re the first person who ever asked that like it meant something."', effects: [{ learn: 'dov_pressure' }, { trust: { npc: 'npc_sh_09', by: 10 } }, { lead: 'l_pressure_shale' }], options: [{ text: 'It might.', next: 'intro' }] },
    jonah: { text: '"Set." He spits. "He\'s twenty-two. He read a book about sheriffs. Ada read him."', options: [{ text: 'He seems like a good one.', next: 'jonah2' }, bye] },
    jonah2: { text: '"He is." It comes out before he can stop it. "That\'s the problem, isn\'t it."', effects: [{ trust: { npc: 'npc_sh_09', by: 5 } }], options: [bye] },
  },
};

export const d_sh_pardo: DialogueDef = {
  id: 'd_sh_pardo', owner: 'npc_sh_12',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Water? Two a measure, one if you carry your own cup, nothing if you\'re dying and I believe you. Pardo. I sit here. That\'s the job.',
      options: [
        { text: 'Water.', effects: [{ event: 'barter' }], exit: true },
        { id: 'pardo.clock', text: 'Six, eleven, four, nine?', if: { any: [{ knows: 'pumps_on_a_clock' }, { knows: 'dov_pumps_schedule' }] }, next: 'clock', once: true },
        { id: 'pardo.stranger', text: 'A tall old man with a mask bought water from you. With a ring.', if: { knows: 'ada_saw_stranger' }, next: 'stranger', once: true },
        bye,
      ],
    },
    clock: { text: '"You listened. Nobody listens." He holds up a finger each. "Six, eleven, four, nine — the hours the water comes. For thirty years. Then one spring it was five, ten, three, eight, for two months, and then it went back. Somebody turned a dial. Not here." He looks north, past the pump house, past the ridge. "Not anywhere here."', effects: [{ learn: 'pardo_clock' }, { lead: 'l_pumps_clock' }], options: [{ text: 'Who?', next: 'who' }, bye] },
    who: { text: '"If I knew that, pup, I\'d sell it. I\'m not Pike." He sips his own water. "Something counts, and the water comes."', options: [bye] },
    stranger: { text: '"The ring\'s here." He opens his hand: a plain band, worn thin on the inside. "Three weeks back. He drank like a man who\'d forgotten how. Asked the way to the overpass. I said the Dogs. He said he knew." He closes his hand. "Ten Tolls and it\'s yours. It should go back to somebody."', effects: [{ learn: 'pardo_has_ring' }], options: [{ id: 'pardo.ring', text: '(Buy the ring. 10 Tolls)', if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }, { give: 'k_ring' }, { lead: 'l_ring_shale' }], next: 'ring' }, { text: 'Later.', exit: true }] },
    ring: { text: 'Inside the band, worn almost away, two letters and a mark like half a sun.', effects: [{ learn: 'ring_initials' }], options: [bye] },
  },
};

export const d_sh_ruth: DialogueDef = {
  id: 'd_sh_ruth', owner: 'npc_sh_13',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Caravan post. Ruth Avel; I ride with the Wheel when they pass and sit here when they don\'t. Goods, ammunition, and letters — a wagon leaves when a wagon leaves. Pay in Tolls or in something a wagon wants.',
      options: [
        { text: 'Let me see your goods.', effects: [{ event: 'barter' }], exit: true },
        { id: 'ruth.letters', text: 'How do letters work?', next: 'letters', once: true },
        { id: 'ruth.wheel', text: 'The Wheel?', next: 'wheel', once: true },
        bye,
      ],
    },
    letters: { text: '"Write it where you sleep — Mags\'s room, a camp, anywhere with a table. I carry it. If the person\'s where you say they are, you get an answer in a few days. If they aren\'t, you get the letter back, eventually, with dust on it."', effects: [{ learn: 'letters_how' }], options: [{ text: 'Thanks.', next: 'intro' }] },
    wheel: { text: '"Nomads. Two hundred wagons across the Reach, in rings of forty. Neutral, armed, owed by everyone. We go where the Tollmen don\'t tax and we tax ourselves." She shrugs. "If you ever need to be somewhere else, and I mean *else*, the Wheel is how."', effects: [{ learn: 'wheel_what' }], options: [{ text: 'Noted.', next: 'intro' }] },
  },
};

/** The west road out of Shale: a sign, ruts, and three-week-old boot prints for anyone who can read ground. */
export const d_sh_tracks: DialogueDef = {
  id: 'd_sh_tracks', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A board on a post: SHALE — WATER BY THE CUP — NO DOGS. The road runs west into hardpan, toward the salt cut and, further, the line of a dead highway against the sky.',
      passives: [
        { skill: 'survival', dc: 40, text: 'Old prints in the crust at the road\'s edge, kept by three dry weeks: one man, boots worn on the outer edge, a long drag on the right leg. He went west — not toward the salt cut, but north-west, toward the highway. And he was alone.', effects: [{ learn: 'tracks_read' }, { lead: 'l_tracks_overpass' }, { learn: 'loc_rustdogs' }, { xp: 30 }] },
        { attr: 'senses', dc: 8, text: 'Scuffs where somebody sat down hard against the post, and a dark stain in the dust that the wind hasn\'t taken yet.', effects: [{ learn: 'tracks_blood' }] },
      ],
      options: [{ text: '(Move on.)', exit: true }],
    },
  },
};
