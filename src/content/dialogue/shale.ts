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
    books: {
      text: 'She looks at the bar for a while before she answers, which for Mags is a year. "Somebody\'s skimming. Barman, I think; the water doesn\'t add up. You read numbers? You look like you read numbers." Two ledgers tied with a bootlace come up from under the bar. "Read them. Night\'s room and twenty for your trouble. Don\'t show them to anyone, love. They\'re mine."',
      effects: [{ give: 'k_mags_books' }, { quest: 'q_a1_books', start: true }, { set: 'shale_room' }, { learn: 'shale_room' }],
      options: [{ text: 'I\'ll read them.', exit: true }],
    },
    books_clean: { text: '"No?" Something goes out of her shoulders that was not about a barman. "Well. Good." Twenty Tolls on the bar. "Keep the room tonight."', effects: [{ take: 'k_mags_books' }, { give: 'tolls', count: 20 }, { trust: { npc: 'npc_sh_03', by: 3 } }], options: [{ text: 'Thanks.', next: 'menu' }] },
    books_back: {
      text: 'You put the second ledger on the bar open at the signed page and she does not look at it, because she knows the page. "Right." Very quietly. "Right. Pike lent against the deed when the pumps went dry the second year. I\'ve been paying it back out of water money and losing. He bought the rest two months ago. On paper it\'s his. The town doesn\'t know, because the day they know, this is a guild saloon and they\'ll drink somewhere there isn\'t one." She looks at you then. "What do you want, love?"',
      options: [
        { id: 'mags.expose', text: 'The town should know who they\'re drinking under.', next: 'expose_warn' },
        { id: 'mags.squeeze', text: 'A hundred and fifty, and I never read the second book.', check: { skill: 'speech', dc: 40 }, next: 'squeezed', fail: 'squeeze_no' },
        { id: 'mags.help', text: 'I can make these balance so a guild clerk\'s lamp won\'t find it.', check: { skill: 'barter', dc: 40, mods: [{ if: { knows: 'mags_hidden' }, dc: -10, why: 'you saw how she hid it; you can hide it better' }] }, next: 'helped', fail: 'help_no' },
        { text: 'Let me think.', exit: true },
      ],
    },
    expose_warn: { text: '"Then tell Ada." She takes the books back. "And when you want a drink in this town, go to the Choir for water and the Dogs for the rest." No anger in it. That is the worst of it.', effects: [{ take: 'k_mags_books' }, { learn: 'mags_warned' }], options: [{ text: '(Leave.)', exit: true }] },
    squeezed: { text: 'She counts it out without looking at you. A hundred and fifty, from the water tin. "There. Paid." She takes the books. "Don\'t come back for seconds. I\'d sooner tell Ada myself."', effects: [{ take: 'k_mags_books' }, { give: 'tolls', count: 150 }, { learn: 'mags_squeezed' }, { trust: { npc: 'npc_sh_03', by: -25 } }, { memory: { npc: 'npc_sh_03', tag: 'squeezed', valence: -1, strength: 3 } }, { decision: { id: 'mags_squeezed', text: 'You sold Mags her own silence for 150 Tolls.' } }], options: [{ text: '(Leave.)', exit: true }] },
    squeeze_no: { text: '"No." She takes the books. "Tell Ada, then. Go on." She waits. You don\'t.', options: [{ id: 'mags.help2', text: 'Or I make them balance.', check: { skill: 'barter', dc: 40 }, next: 'helped', fail: 'help_no' }, { text: 'Let me think.', exit: true }] },
    helped: { text: 'Two hours with the lamp and a pencil, moving water from a column where it shows to a column where it doesn\'t, until the second book says what the first book says and both of them say it to a guild clerk. She watches the whole time. "That\'ll hold." Then: "The room\'s yours. Not tonight. Always."', effects: [{ take: 'k_mags_books' }, { time: 120 }, { learn: 'mags_helped' }, { set: 'shale_room' }, { learn: 'mags_room_free' }, { trust: { npc: 'npc_sh_03', by: 15 } }, { memory: { npc: 'npc_sh_03', tag: 'helped', valence: 1, strength: 3 } }, { decision: { id: 'mags_helped', text: 'You hid the Dry Well\'s buyout for Mags.' } }], options: [{ text: 'Always, then.', next: 'menu' }] },
    help_no: { text: 'You try, and an hour in you have made it worse, and she takes the pencil out of your hand very gently. "Leave it. Leave it, love." She pours. "Just don\'t tell anyone."', effects: [{ take: 'k_mags_books' }, { time: 60 }, { learn: 'mags_help_failed' }], options: [{ id: 'mags.expose2', text: 'The town should know.', next: 'expose_warn' }, { text: 'I won\'t.', effects: [{ learn: 'mags_helped' }, { trust: { npc: 'npc_sh_03', by: 5 } }], exit: true }] },
    menu: {
      text: 'Drink\'s on the house — the first one. Water\'s two. The back room\'s ten a night, and nobody\'ll touch your things because nobody wants to find out what I\'d do. And there\'s always a game on.',
      options: [
        { id: 'mags.drink', text: 'The free one, then.', next: 'drink', once: true },
        { id: 'mags.room', text: 'The room. (10 Tolls)', if: { all: [{ not: { flag: 'shale_room' } }, { item: 'tolls', count: 10 }] }, effects: [{ take: 'tolls', count: 10 }, { set: 'shale_room' }, { learn: 'shale_room' }], next: 'room' },
        { id: 'mags.room.broke', text: 'The room — I\'ll owe you.', if: { all: [{ not: { flag: 'shale_room' } }, { not: { item: 'tolls', count: 10 } }] }, check: { skill: 'speech', dc: 35 }, effects: [{ set: 'shale_room' }, { set: 'shale_room_owed' }, { memory: { npc: 'npc_sh_03', tag: 'owes_mags', valence: -5 } }], next: 'room_owed', fail: 'room_no' },
        { id: 'mags.dust', text: 'A game of Dust. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ event: 'dust', data: { stake: 5 } }], exit: true },
        { id: 'mags.trade', text: 'Let me see what you\'re selling.', effects: [{ event: 'barter' }], exit: true },
        { id: 'mags.town', text: 'Tell me about Shale.', next: 'town' },
        { id: 'mags.books', text: 'You look like someone with a problem.', if: { all: [{ quest: 'q_a1_books', status: 'none' }, { any: [{ flag: 'shale_room' }, { flag: 'teo_freed' }, { trust: { npc: 'npc_sh_03', gte: 5 } }] }] }, next: 'books' },
        { id: 'mags.books.cooked', text: 'About your books.', if: { all: [{ quest: 'q_a1_books', stage: 'decide' }, { knows: 'mags_cooked' }] }, next: 'books_back' },
        { id: 'mags.books.clean', text: 'Your books. There\'s no thief in them.', if: { all: [{ item: 'k_mags_books' }, { knows: 'mags_books_clean' }] }, next: 'books_clean' },
        { id: 'mags.teo', text: 'Who\'s Teo?', if: { any: [{ knows: 'mags_teo' }, { seen: 'mags.town' }] }, next: 'teo', once: true },
        { id: 'mags.stranger', text: 'A tall old man, hurt, in a long coat. Three weeks back. Did he drink here?', if: { quest: 'q_ch1_shale' }, next: 'stranger', once: true },
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
      effects: [{ learn: 'mags_teo' }, { learn: 'shale_tribute' }, { quest: 'q_ch1_tribute', start: true }],
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
      text: [
        { if: { flag: 'dw_restored' }, text: 'Two pumps on a concrete apron, pre-Burn work patched with everything since. They run in long pulls now instead of bursts, and the town has stopped leaning.' },
        { if: { flag: 'dw_freed' }, text: 'Two pumps on a concrete apron, pre-Burn work patched with everything since. They have not stopped since you came back from the east; the overflow has made a creek across the yard, and children stand in it.' },
        { if: { flag: 'dw_sold' }, text: 'Two pumps on a concrete apron, pre-Burn work patched with everything since. A Tollman sits on a chair beside them with a ledger and sells what comes out by the measure.' },
        { text: 'Two pumps on a concrete apron, pre-Burn work patched with everything since. They run in bursts and stop, and the whole town leans toward them when they start.' },
      ],
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
        { id: 'nell.water', text: 'The east cistern\'s gone green. The deputy drinks from it.', if: { all: [{ knows: 'jonah_drinks' }, { not: { flag: 'jonah_fever_blocked' } }] }, next: 'water' },
        bye,
      ],
    },
    wheel: { text: 'Forty wagons, horses, a whole town that moves. They stayed two days and when they left the street was quiet for a week. Ruth at the caravan post rides with them sometimes. I asked her what they need. She said "people who don\'t ask".', effects: [{ learn: 'nell_wheel' }], options: [{ text: 'Huh.', next: 'intro' }] },
    leave: { text: 'She goes red. "Does it show? Don\'t tell her. She\'d say it was the house that was leaving, not me." She wipes a glass that was already clean.', effects: [{ learn: 'nell_wants_out' }, { trust: { npc: 'npc_sh_10', by: 5 } }], options: [{ text: 'I won\'t.', next: 'intro' }] },
    mother: { text: '"My mum died when I was nine. Fever year. Mags took me on like a bar tab — says it every birthday." She smiles like it doesn\'t cost anything.', effects: [{ learn: 'nell_mother_dead' }], options: [{ text: 'I\'m sorry.', next: 'intro' }] },
    water: {
      text: '"Everyone drinks last from something." She frowns. "Aunt Mags says it\'s the pipe. The Mender says it\'s the tank. Jonah says it\'s fine." She looks at the bar. "I could give him the good water. He wouldn\'t take it. He\'d say somebody else needed it."',
      options: [
        { id: 'nell.water.flush', text: '(Give her a Flush for him.) Tell him it\'s for the pump manual: it stops the pages going green.', if: { item: 'c_radflush' }, effects: [{ take: 'c_radflush' }, { set: 'jonah_fever_blocked' }, { decision: { id: 'jonah_water_flush', text: 'You left a Flush with Nell for Jonah, with a story he would swallow.' } }, { trust: { npc: 'npc_sh_10', by: 10 } }, { xp: 40 }], next: 'water_done' },
        { id: 'nell.water.filter', text: '(Show her a filter: sand, cloth, charcoal, in a barrel by the cistern.)', check: { skill: 'medicine', dc: 30, mods: [{ if: { skill: 'survival', gte: 30 }, dc: -10, why: 'you have made worse water drinkable' }] }, effects: [{ set: 'jonah_fever_blocked' }, { set: 'east_cistern_filtered' }, { decision: { id: 'jonah_water_filter', text: 'You built a filter barrel for the east cistern.' } }, { news: { tag: 'filter_barrel', text: 'someone built a filter barrel for the east cistern', valence: 8, size: 4, at: 'shale' } }, { trust: { npc: 'npc_sh_10', by: 8 } }, { xp: 50 }], next: 'water_done', fail: 'water_no' },
        { text: 'Someone will think of something.', next: 'intro' },
      ],
    },
    water_done: { text: '"He\'ll drink it if it\'s for the manual." She almost laughs. "He\'d drink from the Dogs\' truck if it was for the manual."', options: [bye] },
    water_no: { text: 'The barrel leaks and the sand goes green faster than the water. Nell watches you fail politely.', effects: [{ time: 60 }], options: [bye] },
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
        { id: 'ada.pip', text: 'There\'s a Rust Dog child in the Choir tent.', if: { all: [{ knows: 'pip_is_dog' }, { not: { knows: 'pip_reported' } }] }, next: 'pip' },
        { id: 'ada.books', text: 'The Dry Well is Pike\'s. Mags signed it over two months ago.', if: { all: [{ knows: 'mags_cooked' }, { not: { knows: 'mags_exposed' } }, { not: { knows: 'mags_helped' } }, { not: { knows: 'mags_squeezed' } }] }, next: 'books' },
        { id: 'ada.dogs', text: 'What if I said the Dogs?', next: 'dogs' },
      ],
    },
    cut: {
      text: '"Cistern 9." She says it like a name from a story. "So the bunker\'s real, and it opens. Noted." A pause. "A dead man at your door — tall, old, walking like he\'d been shot? He came through here. Three weeks back. Bought water from Pardo with a ring and asked for the east road and the overpass. I told him the overpass would kill him. He thanked me."',
      effects: [{ learn: 'ada_saw_stranger' }, { lead: 'l_stranger_shale' }, { trust: { npc: 'npc_sh_01', by: 5 } }, { news: { tag: 'cistern_person', text: 'someone from the salt-cut bunker is in town', valence: 2, size: 4, at: 'shale' } }],
      options: [{ text: 'Did he say his name?', next: 'name' }, { text: 'What\'s at the overpass?', next: 'overpass' }, { text: 'I\'ll ask around.', next: 'rules' }],
    },
    lie_ok: { text: '"Everybody\'s passing through. Some of them stop." She lets it go, and you can see her file it. "Rules are short."', options: [{ text: 'Go on.', next: 'rules' }] },
    lie_no: { text: '"No, you\'re not." Flat. "You came out of the salt cut; Pardo saw you on the ridge. Don\'t lie to me in my own office; it wastes both our mornings."', effects: [{ trust: { npc: 'npc_sh_01', by: -5 } }], options: [{ text: 'Fine. Cistern 9.', next: 'cut' }] },
    dogs: { text: '"Then I\'d ask you to leave the gun on the counter and I\'d watch you walk back out." She doesn\'t reach for anything. "Are you saying it?"', options: [{ text: 'No. The salt cut.', next: 'cut' }, { text: 'Passing through.', next: 'rules' }] },
    name: { text: '"He didn\'t, and I asked twice. He had a way of not hearing questions. Pike at the Tollmen post talked to him longer than I did — ask him what it cost."', effects: [{ learn: 'pike_met_stranger' }], options: [{ text: 'What\'s at the overpass?', next: 'overpass' }, { text: 'Thanks.', next: 'rules' }] },
    overpass: { text: '"The Rust Dogs. Forty, fifty of them under a dead highway, with the water they take from us and the people they take from the road. Kessler runs them; he\'s a thief with manners. His lieutenant has none." She looks at you. "If you go, go in daylight, hands empty, and don\'t say my name like it\'s a password."', effects: [{ learn: 'overpass_dogs' }, { learn: 'kessler_name' }, { learn: 'loc_rustdogs' }], options: [{ text: 'Noted.', next: 'rules' }] },
    jonah_dead: {
      text: [{ if: { flag: 'jonah_death', eq: 'fall' }, text: '"The tower." She doesn\'t look up from the desk. "Forty feet. Half the rungs. Everyone knew and I signed nothing." A long breath. "The militia\'s four rifles again. Pike was here this morning with a rate card for protection. I didn\'t throw him out."' }, { if: { flag: 'jonah_death', eq: 'fight' }, text: '"East street. Midnight. Alone, because that\'s how I had it drawn up." She is very still. "They didn\'t even take anything. The militia\'s four rifles again and Pike was here this morning with a rate card for protection. I didn\'t throw him out."' }, { text: '"Fever. From the east cistern, Nell says, and Nell\'s usually right." She looks at her hands. "I wrote the ration. Deputy drinks last. The militia\'s four rifles again and Pike was here this morning with a rate card for protection. I didn\'t throw him out."' }],
      effects: [{ set: 'ada_broke' }, { trust: { npc: 'npc_sh_01', by: -10 } }, { learn: 'ada_pike_protection' }, { lead: 'l_ada_protection' }],
      options: [{ text: 'I\'m sorry.', exit: true }],
    },
    hound: { text: '"I noticed." She has not sat down since it walked in. "Issa wants to shoot it. Jonah wants to name it. Mags wants to charge people to look at it. I\'ve told all three no." She looks out at the yard, where it sits. "It looked at me once and then it stopped, as if it had decided something. I\'d like to know what." A breath. "Thank you. I think."', effects: [{ set: 'ada_hound_told' }, { trust: { npc: 'npc_sh_01', by: 10 } }, { memory: { npc: 'npc_sh_01', tag: 'hound', valence: 15, strength: 90 } }], options: [{ text: 'Noted.', exit: true }] },
    ghosts: {
      text: '"On a tap off my line." She lets that be a sentence by itself. "So the pressure drop has a name and a family, and the family wants a street."',
      options: [
        { id: 'ada.ghosts.yes', text: 'Three generations out of a cistern that failed. Five people, one of them sixteen, one of them dying. Under your law, and the valve closes.', check: { skill: 'speech', dc: 35, mods: [{ if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, dc: -15, why: 'the town has water to spare now' }, { if: { standing: { settlement: 'shale', gte: 15 } }, dc: -10, why: 'Shale trusts you' }, { if: { flag: 'shale_exodus_ok' }, dc: -10, why: 'she has done this once already' }] }, next: 'ghosts_yes', fail: 'ghosts_no' },
        { text: 'Forget I asked.', exit: true },
      ],
    },
    ghosts_yes: { text: '"Under my law. As townsfolk. The tannery\'s empty; it stinks, and it has a roof." She writes it on the blotter. "And the first one who touches that valve again answers to me, not to you. Noted?"', effects: [{ set: 'ada_ghosts_decided' }, { set: 'ada_ghosts_ok' }, { decision: { id: 'ada_ghosts_ok', text: 'Sheriff Vey agreed to take the Dry Wells family in under Shale\'s law.' } }, { trust: { npc: 'npc_sh_01', by: 5 } }, { xp: 40 }], options: [{ text: 'Noted.', exit: true }] },
    ghosts_no: { text: '"They\'ve been drinking my town for sixty years and you want me to give them a street." She shakes her head once. "No. Tell them the valve closes, or I close it."', effects: [{ set: 'ada_ghosts_decided' }, { decision: { id: 'ada_ghosts_no', text: 'Sheriff Vey refused the Dry Wells family.' } }], options: [{ text: 'Noted.', exit: true }] },
    drywells: {
      text: [
        { if: { flag: 'dw_restored' }, text: '"The pumps ran all night." She has not slept either. "You did that. In a room, with a machine, a day east." She does not sit down. "Nine years I\'ve been sheriff of a town dying of something nobody could name, and you named it and fixed it, and I don\'t know whether to thank you or arrest you for knowing where it was." A breath. "Thank you."' },
        { if: { flag: 'dw_freed' }, text: '"They haven\'t stopped." She looks toward the yard, where you can hear them. "The north tank\'s over the top and the children are standing in it. And when they stop?" She lets you answer or not. "Fine. Water today. I\'ve had worse news from the east."' },
        { if: { flag: 'dw_sold' }, text: '"A Tollman on a chair by my pumps, selling me my water by the measure." Her voice is very level. "Pike came by with the rate card an hour ago. He said your name twice, as per." She sits down. "Get out of my office. Come back when you\'ve got something for Shale that isn\'t a receipt."' },
        { text: '"You stood in front of it." She says it flat. "The thing that\'s been bleeding my town, and you read it and walked away." A long pause. "Maybe that was the right thing. Maybe whatever wrote the number reads what you do, too. I\'d have liked to be asked."' },
      ],
      effects: [{ set: 'ada_dw_told' }],
      options: [
        { text: 'Noted.', if: { flag: 'dw_restored' }, effects: [{ trust: { npc: 'npc_sh_01', by: 20 } }, { memory: { npc: 'npc_sh_01', tag: 'water_restored', valence: 40, strength: 100 } }, { rep: { faction: 'shale_militia', respect: 5 } }], exit: true },
        { text: 'Noted.', if: { flag: 'dw_freed' }, effects: [{ trust: { npc: 'npc_sh_01', by: 10 } }, { memory: { npc: 'npc_sh_01', tag: 'water_freed', valence: 20, strength: 100 } }], exit: true },
        { text: '(Go.)', if: { flag: 'dw_sold' }, effects: [{ trust: { npc: 'npc_sh_01', by: -25 } }, { memory: { npc: 'npc_sh_01', tag: 'sold_water', valence: -40, strength: 100 } }, { rep: { faction: 'shale_militia', respect: -10 } }], exit: true },
        { text: 'Noted.', if: { flag: 'dw_kept' }, effects: [{ trust: { npc: 'npc_sh_01', by: -5 } }, { memory: { npc: 'npc_sh_01', tag: 'water_kept', valence: -10, strength: 80 } }], exit: true },
      ],
    },
    jonah_lived: {
      text: '"A month and a day." She has counted; she pretends she hasn\'t. "Something changed its mind about my deputy, and I don\'t know what, and I don\'t like not knowing." She looks at you, properly. "But I know who was in town." A pause. "Pike came by with a rate card for protection last week. I threw him out. I\'d like you to know that was easier than it should have been."',
      effects: [{ trust: { npc: 'npc_sh_01', by: 15 } }, { rep: { faction: 'shale_militia', respect: 10 } }, { learn: 'ada_threw_pike_out' }],
      options: [{ text: 'Noted.', exit: true }],
    },
    pip: {
      text: '"I know." She does not stop writing. "Fifteen, broken arm, fell off the deck when the Dogs had their last fight about who runs it. Calla took her in and asked me not to look, so I didn\'t." Now she looks at you. "You want me to look?"',
      options: [
        { id: 'ada.pip.yes', text: 'She\'s a Dog. Kessler will come for her, or use her.', next: 'pip_taken' },
        { id: 'ada.pip.no', text: 'No. I wanted you to know I knew.', effects: [{ learn: 'pip_kept' }, { trust: { npc: 'npc_sh_01', by: 2 } }], next: 'pip_left' },
      ],
    },
    pip_taken: { text: '"Then she goes in the cell till the Dogs send for her, and the Choir doesn\'t speak to either of us for a season." She stands. "You\'re right that Kessler would use her. That\'s not the same as this being right."', effects: [{ learn: 'pip_reported' }, { rep: { faction: 'shale_militia', respect: 5 } }, { rep: { faction: 'choir', respect: -10 } }, { trust: { npc: 'npc_sh_05', by: -12 } }, { decision: { id: 'pip_reported', text: 'You had the sheriff take a Rust Dog child out of the Choir tent.' } }, { news: { tag: 'pip_taken', text: 'The sheriff took a girl out of the Choir tent.', valence: -1, at: 'shale' } }], options: [{ text: 'No.', exit: true }] },
    pip_left: { text: '"Good." Back to writing. "Then we both know, and the girl keeps her arm."', options: [{ text: 'Yes.', exit: true }] },
    books: {
      text: 'She stops writing. "Say that again." You do. She sits with it the way she sits with everything, which is still. "Then Shale\'s only bar is a guild bar, and the water in it is guild water at guild prices the day Pike wants it to be." She stands. "The town needs to know that. Mags will never forgive you, and neither will I, quite, and it still needs doing."',
      effects: [{ learn: 'mags_exposed' }, { trust: { npc: 'npc_sh_03', by: -40 } }, { memory: { npc: 'npc_sh_03', tag: 'exposed', valence: -1, strength: 3 } }, { rep: { faction: 'tollmen', respect: -3 } }, { news: { tag: 'drywell_guild', text: 'The Dry Well is guild property; Mags signed it over.', valence: -1, size: 2, at: 'shale' } }, { decision: { id: 'mags_exposed', text: 'You told the sheriff the Dry Well belongs to the guild.' } }],
      options: [{ text: 'It needed doing.', exit: true }],
    },
    ledger_page: {
      text: 'She reads it twice, and the second time her lips move on the name. "Post nine-west." She folds it into her shirt, not her pocket. "He sells us water. He stands in my street." A breath. "This stays with me. If I use it, it\'ll be when it costs him more than it costs Shale, and I don\'t know when that is yet."',
      effects: [{ take: 'k_ledger_page' }, { set: 'ledger_shown_ada' }, { decision: { id: 'ledger_shown_ada', text: 'You gave Sheriff Vey the ledger page proving Pike paid for the stranger\'s shooting.' } }, { trust: { npc: 'npc_sh_01', by: 15 } }, { rep: { faction: 'shale_militia', respect: 10 } }, { rep: { faction: 'tollmen', respect: -10 } }, { memory: { npc: 'npc_sh_01', tag: 'pike_page', valence: 20, strength: 100 } }, { xp: 60 }],
      options: [{ text: 'Noted.', exit: true }],
    },
    rules: {
      text: 'Rules: no guns drawn in town, no stealing water, no fighting the Dogs on my street unless I start it. Break one and you\'re in the cell. Break two and you\'re on the road. We\'re thin here; I can\'t afford trouble I didn\'t choose.',
      options: [{ text: 'Understood.', exit: true }, { id: 'ada.help', text: 'You look like someone who needs hands.', next: 'help', once: true }],
    },
    help: { text: '"I need water and I need a month without a funeral. If you can get me either, come back." The corner of her mouth moves. "Noted, anyway."', effects: [{ learn: 'ada_needs_hands' }], options: [{ text: 'I\'ll keep it in mind.', exit: true }] },
    again: {
      text: [{ if: { standing: { settlement: 'shale', gte: 15 } }, text: 'People are saying your name without spitting. Keep it up.' }, { if: { standing: { settlement: 'shale', lte: -15 } }, text: 'I hear things. I\'m hearing them about you.' }, { text: 'Sheriff\'s office. Say it quick.' }],
      options: [
        { id: 'ada.stranger.again', text: 'About the man who died at our door.', if: { not: { knows: 'ada_saw_stranger' } }, next: 'cut' },
        { id: 'ada.overpass.again', text: 'Tell me about the overpass.', if: { not: { knows: 'overpass_dogs' } }, next: 'overpass' },
        { id: 'ada.tribute', text: 'Tribute Day. What are you going to do?', if: { all: [{ quest: 'q_ch1_tribute' }, { not: { knows: 'ada_will_pay' } }] }, next: 'tribute' },
        { id: 'ada.terms', text: 'Kessler\'s terms: half of last time, in water. I carried them myself.', if: { all: [{ flag: 'rd_terms_carried' }, { not: { flag: 'ada_terms_decided' } }] }, next: 'terms' },
        { id: 'ada.exodus', text: 'Some of the Dogs want out — Wren Calloway and her people. Would Shale have them?', if: { all: [{ any: [{ knows: 'wren_wants_out' }, { knows: 'wren_leaving' }] }, { not: { flag: 'shale_exodus_decided' } }] }, next: 'exodus' },
        { id: 'ada.ledger', text: 'Pike paid the outriders who shot the old man. (Show her the ledger page.)', if: { item: 'k_ledger_page' }, next: 'ledger_page' },
        { id: 'ada.jonah.dead', text: 'Jonah.', if: { flag: 'jonah_dead' }, next: 'jonah_dead', once: true },
        { id: 'ada.jonah.lived', text: 'The month\'s out. He\'s alive.', if: { flag: 'jonah_lived' }, next: 'jonah_lived', once: true },
        { id: 'ada.ghosts', text: 'Five people live at Dry Wells, on a tap off your line. Would Shale take them in?', if: { all: [{ knows: 'dw_oriel_would_go' }, { not: { flag: 'ada_ghosts_decided' } }] }, next: 'ghosts' },
        { id: 'ada.drywells', text: 'Dry Wells. The station there sets your water.', if: { all: [{ flag: 'dw_outcome' }, { not: { flag: 'ada_dw_told' } }] }, next: 'drywells' },
        { id: 'ada.hound', text: 'The machine in your yard. It will look at everything that comes in at night.', if: { all: [{ flag: 'hound_for_shale' }, { not: { flag: 'ada_hound_told' } }] }, next: 'hound' },
        { text: 'Nothing. Just checking in.', exit: true },
      ],
    },
    tribute: {
      text: '"I\'m going to pay, and hate it, and count the rifles while I do." She says it like a verdict. "Unless somebody gives me a reason not to that doesn\'t end with Jonah in the dirt."',
      effects: [{ learn: 'ada_will_pay' }],
      options: [{ id: 'ada.tribute.fight', text: 'The militia would fight if you let them.', next: 'tribute_fight', once: true }, { text: 'Noted.', exit: true }],
    },
    tribute_fight: { text: '"Issa would. Jonah would, which is why I won\'t." A breath. "If it comes to it, and you\'re standing there, I\'ll say the word and you\'ll hear it. Don\'t make it come to it."', effects: [{ learn: 'ada_would_fight' }], options: [{ text: 'Understood.', exit: true }] },
    terms: {
      text: '"Half." She doesn\'t say it twice. "Half of forty is twenty measures I don\'t have, from a man who\'s never once asked for less than everything." She looks at you. "Why would he?"',
      options: [
        { id: 'ada.terms.yes', text: 'Because he keeps a list of who he hasn\'t robbed, and he\'d like you on it. He doesn\'t take lives; Vasha would.', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'kessler_no_lives' }, dc: -15, why: 'you know what Kessler says of himself' }, { if: { knows: 'vasha_would_be_chief' }, dc: -10, why: 'you know what Shale fighting would make of Vasha' }] }, next: 'terms_yes', fail: 'terms_no' },
        { text: 'I don\'t know. I carried the message.', next: 'terms_no' },
      ],
    },
    terms_yes: { text: '"…Half, then. In water, and I count it." She writes it on the blotter, over the cup. "If she asks for more, you\'ll be standing there. Noted?"', effects: [{ set: 'ada_terms_decided' }, { set: 'ada_terms_accepted' }, { trust: { npc: 'npc_sh_01', by: 10 } }, { decision: { id: 'ada_terms_accepted', text: 'Sheriff Vey agreed to pay the Dogs half, on Kessler\'s terms you carried.' } }], options: [{ text: 'Noted.', exit: true }] },
    terms_no: { text: '"Then I\'ll hear it from Vasha on the day, and decide then." The cup goes back on the letter.', effects: [{ set: 'ada_terms_decided' }, { set: 'ada_terms_refused' }], options: [{ text: 'Fine.', exit: true }] },
    exodus: {
      text: '"Rust Dogs. In my town." She lets the words sit. "Under my law? If one of them steals a cup of water, I hang the lot, and they\'d know it. Would they still come?"',
      options: [
        { id: 'ada.exodus.yes', text: 'Wren would. She keeps her word to the letter and expects the same. That\'s more than you get from most of Shale.', check: { skill: 'speech', dc: 45, mods: [{ if: { knows: 'wren_wanted_release' }, dc: -10, why: 'you know she argued to let the stranger go' }] }, next: 'exodus_yes', fail: 'exodus_no' },
        { text: 'I don\'t know.', next: 'exodus_no' },
      ],
    },
    exodus_yes: { text: '"Then tell her: under my law, as townsfolk, and the first one who looks at the pumps wrong answers to me." She almost smiles. "Noted. God help me."', effects: [{ set: 'shale_exodus_decided' }, { set: 'shale_exodus_ok' }, { decision: { id: 'shale_exodus_ok', text: 'Sheriff Vey agreed to take in Wren\'s people under Shale\'s law.' } }], options: [{ text: 'I\'ll tell her.', exit: true }] },
    exodus_no: { text: '"Then no. I\'ve enough people I can\'t feed."', effects: [{ set: 'shale_exodus_decided' }], options: [{ text: 'Fine.', exit: true }] },
  },
};

export const d_sh_jonah: DialogueDef = {
  id: 'd_sh_jonah', owner: 'npc_sh_02',
  start: [{ if: { flag: 'jonah_lived' }, node: 'lived' }, { if: { all: [{ flag: 'jonah_named' }, { flag: 'jonah_month_met' }] }, node: 'month_again' }, { if: { flag: 'jonah_named' }, node: 'month' }, { node: 'intro' }],
  nodes: {
    month: {
      text: 'He straightens when he sees you, the way he does for everyone, and then a little more. "You\'re the one from the salt cut. The sheriff says you went to the overpass and came back, which nobody does." He waits to be told what to do with that.',
      effects: [{ set: 'jonah_month_met' }],
      options: [
        { id: 'jonah.week', text: 'What does a deputy do with his week?', next: 'week', once: true },
        { id: 'jonah.night', text: 'Who walks the street at night?', next: 'night', once: true },
        { id: 'jonah.water', text: 'Where do you drink? The water, I mean.', next: 'water', once: true },
        { id: 'jonah.name', text: 'Someone wrote your name on a list. With a number of days.', if: { not: { flag: 'jonah_told' } }, next: 'name' },
        { text: 'Something else.', next: 'intro' },
      ],
    },
    month_again: { text: '"Sir. Ma\'am." He catches himself. "Sorry."', options: [
      { id: 'jonah.week.again', text: 'What does a deputy do with his week?', if: { not: { seen: 'jonah.week' } }, next: 'week' },
      { id: 'jonah.night.again', text: 'Who walks the street at night?', if: { not: { seen: 'jonah.night' } }, next: 'night' },
      { id: 'jonah.water.again', text: 'Where do you drink?', if: { not: { seen: 'jonah.water' } }, next: 'water' },
      { id: 'jonah.name.again', text: 'Someone wrote your name on a list.', if: { not: { flag: 'jonah_told' } }, next: 'name' },
      { text: 'Something else.', next: 'intro' },
    ] },
    week: { text: '"Patrol, mostly. And the vane — Dad sends me up the windpump tower every week since the kite day bent it. Somebody has to, and it isn\'t going to be him." He grins. "Forty feet. You can see the overpass from the top."', effects: [{ learn: 'jonah_climbs' }, { lead: 'l_jonah_tower' }], options: [{ text: 'Forty feet of what?', next: 'week2', once: true }, { text: 'Noted.', next: 'month_again' }] },
    week2: { text: '"Rungs. Half of them." The grin doesn\'t go. "I know. I\'m careful."', options: [{ text: 'Noted.', next: 'month_again' }] },
    night: { text: '"Me. East street, midnight to four. The Corporal\'s got nine rifles and four that shoot, and the four sleep." He says it with pride, which is the problem. "If the Dogs come at night, I\'m the one who sees them first."', effects: [{ learn: 'jonah_patrols' }, { lead: 'l_jonah_patrol' }], options: [{ text: 'Noted.', next: 'month_again' }] },
    water: { text: '"East cistern, by the yard. It\'s gone a bit green." A shrug. "The deputy drinks last. Everybody else gets the pumps."', effects: [{ learn: 'jonah_drinks' }, { lead: 'l_jonah_water' }], options: [{ text: 'Noted.', next: 'month_again' }] },
    name: {
      text: 'He goes very still, and then he laughs, because he is twenty-two. "A list. Of — what, people who are going to —" He doesn\'t finish it. "Who wrote it?" You tell him you don\'t know. "Then it\'s not true till someone makes it true." He puts his hand on the badge without noticing.',
      effects: [{ set: 'jonah_told' }, { decision: { id: 'jonah_told', text: 'You told Jonah Reese his name was on the stranger\'s list.' } }, { trust: { npc: 'npc_sh_02', by: 5 } }],
      options: [
        { id: 'jonah.name.careful', text: 'Then don\'t help them. Stay off the tower. Walk the street with someone. Drink from the pumps.', check: { skill: 'speech', dc: 40, mods: [{ if: { trust: { npc: 'npc_sh_02', gte: 10 } }, dc: -10, why: 'he wants to believe you' }] }, next: 'careful', fail: 'careful_no' },
        { text: 'Then don\'t.', next: 'month_again' },
      ],
    },
    careful: { text: 'He nods, slowly, the way he reads. "Off the tower." It costs him something; you can see it being paid. "I\'ll tell Dad it\'s the sheriff\'s order. He\'ll like that less than the tower."', effects: [{ set: 'jonah_fall_blocked' }, { decision: { id: 'jonah_off_tower', text: 'You talked Jonah Reese off the windpump tower.' } }, { xp: 40 }], options: [{ text: 'Good.', next: 'month_again' }] },
    careful_no: { text: '"I\'m not going to hide from a list." He stands straighter. It is exactly what the list would want him to say.', options: [{ text: 'Noted.', next: 'month_again' }] },
    lived: { text: 'He is sitting on the office step with both books open on his knees, alive, and looks up like a man who has heard a door close somewhere far away. "A month." He says it quietly. "Dad counted too. He pretended not to." A breath. "Whatever you did — I don\'t know what you did." He goes back to the books, and then doesn\'t.', effects: [{ trust: { npc: 'npc_sh_02', by: 15 } }, { learn: 'jonah_knows_lived' }], options: [{ text: 'Read your books, deputy.', exit: true }] },
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
        { id: 'issa.drills', text: 'Your four that shoot could be nine. I\'ll drill them.', if: { all: [{ not: { flag: 'drills_started' } }, { any: [{ skill: 'firearms', gte: 35 }, { skill: 'speech', gte: 40 }, { attr: 'presence', gte: 7 }] }] }, next: 'drills' },
        { id: 'issa.drills.on', text: 'How are the drills?', if: { all: [{ flag: 'drills_started' }, { not: { flag: 'militia_drilled' } }] }, next: 'drills_on' },
        { id: 'issa.drills.done', text: 'The militia.', if: { flag: 'militia_drilled' }, next: 'drills_done', once: true },
        bye,
      ],
    },
    drills: {
      text: '"Dawn and dusk, the yard, live rounds we can\'t spare, until nine of them shoot. And from tonight nobody walks the street alone; I\'ll tell Ada it was your idea." She looks at the nine. "There\'s a man drinks behind the yard who used to be the best shot in the Sallow. If he turns up, don\'t let him near the boys. Or do. I\'ve stopped knowing."',
      effects: [{ set: 'drills_started' }, { quest: 'q_sh_drills', start: true }, { decision: { id: 'drills_started', text: 'You took on drilling Shale\'s militia.' } }, { set: 'jonah_fight_blocked' }, { after: { minutes: 3 * 1440, id: 'drills_done', effects: [{ set: 'militia_drilled' }, { news: { tag: 'militia_drilled', text: 'the militia walk the street in pairs now, and nine rifles shoot', valence: 12, size: 6, at: 'shale' } }, { rep: { faction: 'shale_militia', respect: 10 } }] } }, { learn: 'ilya_rumour' }],
      options: [{ text: 'Dawn, then.', exit: true }],
    },
    drills_on: { text: '"Better. Two of them hit the post today; one of them meant to." She lowers her voice. "The deputy walked the east street in a pair last night and hated it. Good."', options: [bye] },
    drills_done: { text: '"Nine rifles. Nine that shoot, more or less." She doesn\'t smile, but it\'s close. "Pairs on the street from now on. Ada signed it." A beat. "Thank you. I don\'t say that."', effects: [{ trust: { npc: 'npc_sh_11', by: 15 } }], options: [bye] },
    shoot: { text: '"Then you\'re the fifth rifle." She looks you over once, properly. "Ada will say no. Ada says no to everything until she says yes."', effects: [{ learn: 'issa_counts_you' }, { trust: { npc: 'npc_sh_11', by: 8 } }], options: [{ text: 'We\'ll see.', next: 'intro' }] },
    dogs: { text: '"Tribute\'s due. Half a year since the last. They come with a truck, they take water and whatever Mags has brewed, and this time they\'ll want more because Kessler\'s lieutenant counts. Vasha. Say the name to Ada and watch her face."', effects: [{ learn: 'tribute_due' }, { learn: 'vasha_name' }, { learn: 'loc_rustdogs' }, { quest: 'q_ch1_tribute', start: true }], options: [{ text: 'Noted.', next: 'intro' }] },
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
      options: [{ text: 'Let\'s see the stock.', effects: [{ event: 'barter' }], exit: true }, { id: 'pike.seed', text: 'You\'re buying seed.', if: { knows: 'pike_buys_seed' }, next: 'seed', once: true }, { id: 'pike.who', text: 'Who are the Tollmen?', next: 'who', once: true }, { id: 'pike.stranger', text: 'An old man came through three weeks ago, hurt. You spoke with him.', if: { quest: 'q_ch1_shale' }, next: 'stranger', once: true }, bye],
    },
    again: { text: 'As per. Stock, or something else?', options: [{ id: 'pike.seed.sell', text: '(Put the seed case on the counter.)', if: { all: [{ item: 'k_seed_case' }, { quest: 'q_a1_seed', status: 'active' }] }, next: 'seed_sell' }, { text: 'Stock.', effects: [{ event: 'barter' }], exit: true }, { id: 'pike.seed.again', text: 'About the seed.', if: { all: [{ knows: 'pike_buys_seed' }, { not: { seen: 'pike.seed' } }] }, next: 'seed' }, { id: 'pike.stranger.again', text: 'About the old man.', if: { all: [{ quest: 'q_ch1_shale' }, { not: { seen: 'pike.stranger' } }] }, next: 'stranger' }, { id: 'pike.key', text: 'Do the Tollmen read this hand?', if: { all: [{ item: 'k_map' }, { not: { item: 'k_cipher_key' } }] }, next: 'key' }, { id: 'pike.ledger', text: '(Put the Tollhouse ledger page on the counter.)', if: { item: 'k_ledger_page' }, next: 'ledger_page' }, { id: 'pike.station', text: 'The console at Dry Wells. The guild would pay to hold what it holds.', if: { all: [{ flag: 'dw_console_seen' }, { not: { flag: 'dw_outcome' } }] }, next: 'station' }, { id: 'pike.controller', text: '(Put the grey slab from the pan on the counter.)', if: { all: [{ item: 'k_hound_controller' }, { not: { flag: 'hound_outcome' } }] }, next: 'controller' }, bye] },
    station: {
      text: '"Post nine-west has known about DW-4 for eleven years, and been unable to get a man past the rifle." He does not blink. "One hundred and fifty Tolls. A guild engineer walks in behind you, and Shale\'s water is sold by the measure, as per: reliably. There is a word for what Shale has now, and it is not reliable."',
      options: [
        { id: 'pike.station.sell', text: '(Take the money.)', effects: [{ give: 'tolls', count: 150 }, { set: 'dw_outcome', value: 'sold' }, { set: 'dw_sold' }, { set: 'dw_how', value: 'sold' }, { set: 'escort_east', value: 'tollmen' }, { decision: { id: 'dw_sold', text: 'You sold the Dry Wells console to Factor Pike for a hundred and fifty Tolls.' } }, { memory: { npc: 'npc_sh_04', tag: 'sold_station', valence: 30, strength: 100 } }, { xp: 120 }], next: 'station_sold' },
        { id: 'pike.station.no', text: 'No.', effects: [{ memory: { npc: 'npc_sh_04', tag: 'refused_station', valence: -10, strength: 60 } }, { set: 'pike_station_refused' }], next: 'station_no' },
      ],
    },
    station_sold: { text: '"As per." He counts it out in a way that makes a hundred and fifty look like a courtesy. "An engineer leaves tonight. A caravan goes east in three days from the gate; there is a seat on it with a description on it that is not your name." He is already writing. "Shale will find this reliable. Everyone does, in the end."', options: [{ text: 'As per.', exit: true }] },
    controller: {
      text: 'He does not touch it. "Concern customs seal. Handler, one." He knows the manifest line by heart. "The guild lost a convoy on the pan with that aboard, and has been not saying so for a season." The top half of his face does the arithmetic. "One hundred and fifty. The guild\'s engineer collects the rest of it, and the guild\'s road is quieter for everyone. As per."',
      options: [
        { id: 'pike.controller.sell', text: '(Take the money.)', effects: [{ take: 'k_hound_controller' }, { give: 'tolls', count: 150 }, { set: 'hound_outcome', value: 'sold' }, { set: 'hound_sold' }, { decision: { id: 'hound_sold', text: 'You sold the controller from the pan to Factor Pike; the guild will have the machine.' } }, { rep: { faction: 'tollmen', respect: 12 } }, { memory: { npc: 'npc_sh_04', tag: 'sold_controller', valence: 25, strength: 90 } }, { xp: 80 }], next: 'controller_sold' },
        { id: 'pike.controller.no', text: 'No.', effects: [{ memory: { npc: 'npc_sh_04', tag: 'kept_controller', valence: -10, strength: 60 } }], next: 'controller_no' },
      ],
    },
    controller_sold: { text: 'The slab goes into a drawer that locks. "The guild thanks you for your custom." He writes two lines, and the second one is longer than the first.', options: [{ text: 'As per.', exit: true }] },
    controller_no: { text: '"Then you are carrying something the Concern will want back, and the Concern does not haggle either." He goes back to the rates. "The offer stands. They always do."', options: [{ text: 'Noted.', exit: true }] },
    station_no: { text: '"Then it will be somebody else, later, for less."" He goes back to the rates. "The offer does not expire. The guild\'s offers never do; that is what the guild is."', options: [{ text: 'Noted.', exit: true }] },
    ledger_page: {
      text: 'He reads it the way he reads rates. "Post nine\'s hand. A road contract, confirmed and paid, as per." He looks up with the top half of his face. "Guild paper, removed from a guild ledger. There is a buy-back rate for that. Sixty." A pause exactly as long as a courtesy. "I don\'t ask what you\'d do with it otherwise. I know."',
      options: [
        { id: 'pike.ledger.sell', text: '(Sell it. 60 Tolls)', effects: [{ take: 'k_ledger_page' }, { give: 'tolls', count: 60 }, { set: 'ledger_sold' }, { decision: { id: 'ledger_sold', text: 'You sold the Tollhouse ledger page back to Pike for sixty Tolls, and he burned it.' } }, { memory: { npc: 'npc_sh_04', tag: 'bought_page', valence: 15, strength: 90 } }, { rep: { faction: 'tollmen', respect: 10 } }], next: 'ledger_burn' },
        { id: 'pike.ledger.keep', text: 'I\'ll keep it.', effects: [{ memory: { npc: 'npc_sh_04', tag: 'kept_page', valence: -25, strength: 90 } }, { set: 'pike_knows_page' }], next: 'ledger_keep' },
      ],
    },
    ledger_burn: { text: 'He counts sixty onto the counter, takes the page, and holds it to the lamp until it is gone. "As per." He wipes the ash off the counter with his sleeve.', options: [bye] },
    ledger_keep: { text: '"Then we both know what it says." He goes back to his rates. "Good day."', options: [bye] },
    key: {
      text: 'He looks at the map for exactly as long as it takes to see what it is, and then not at all. "Not here. But the post sells the key to it — a cipher wheel, forty Tolls, as per. The Tollmen sell keys to everything, {name}. It is how we know what is locked."',
      effects: [{ learn: 'pike_sells_key' }, { lead: 'l_pike_saw_map' }, { memory: { npc: 'npc_sh_04', tag: 'saw_the_map', valence: 0, strength: 100 } }, { news: { tag: 'map_seen_by_tollmen', text: 'the salt-cut stranger showed a Tollman a map covered in cipher', valence: -5, size: 4, at: 'shale' } }],
      options: [{ id: 'pike.key.buy', text: '(Buy the wheel. 40 Tolls)', if: { item: 'tolls', count: 40 }, effects: [{ take: 'tolls', count: 40 }, { give: 'k_cipher_key' }], next: 'key_bought' }, { text: 'Not today.', next: 'intro' }],
    },
    key_bought: { text: '"Set the inner rim to the first letter of the nearest town. They always start with the nearest town." He has already turned back to the ledger.', options: [{ text: 'Noted.', exit: true }] },
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
    who: { text: '"A guild. We hold the roads between the posts, we carry, we insure, we lend. The Reach moves because we move it." He smiles with the top half of his face. "Everything you own came through a Tollhouse, or it was stolen from someone whose did."', effects: [{ learn: 'loc_tollhouse' }, { learn: 'tollmen_guild' }], options: [{ text: 'Noted.', next: 'intro' }] },
    seed: {
      text: '"Any variety. Any quantity. Viable, which I test." He does not explain who wants it. "You came from the salt cut, I\'m told. A shelter like that keeps a seed bank, or it wouldn\'t have lasted the first winter. I would pay very well. I would pay in advance."',
      effects: [{ learn: 'pike_seed_offer' }, { lead: 'l_seed_buyer' }],
      options: [{ id: 'pike.seed.get', text: 'The Cistern kept a bank. I could ask.', if: { quest: 'q_a1_seed', status: 'none' }, effects: [{ quest: 'q_a1_seed', start: true }], next: 'seed_get' }, { text: 'I\'ll think about it.', next: 'intro' }, { id: 'pike.seed.who', text: 'Who\'s it for?', check: { skill: 'speech', dc: 50 }, next: 'seed_who', fail: 'seed_who_no', once: true }],
    },
    seed_who: { text: '"A client east of the Teeth with a great deal of glass and not enough green under it." He stops, surprised at himself, and his face closes like a ledger. "Rates are posted."', effects: [{ learn: 'seed_client_east' }], options: [{ text: 'Noted.', next: 'intro' }] },
    seed_who_no: { text: '"A client. As per." The ledger closes.', options: [{ text: 'Fine.', next: 'intro' }] },
    seed_get: { text: '"Then ask." He writes a figure on a slip and turns it to face you: more than the saloon takes in a month. "Viable. Sealed. I test it here. Bring it to this counter and the guild will remember your name, which is worth more than the figure."', options: [{ text: 'I\'ll see what the Elder says.', next: 'intro' }] },
    seed_sell: {
      text: 'He does not open the case here. He weighs it, reads the label twice, and sets it under the counter the way other men set down a loaded gun. "Viable." The Tolls come out in a stack that has been counted in advance. "The guild remembers. As per."',
      effects: [{ take: 'k_seed_case' }, { give: 'tolls', count: 250 }, { rep: { faction: 'tollmen', respect: 10 } }, { enlist: 'tollmen', rank: 'ticket' }, { learn: 'seed_sold_pike' }, { news: { tag: 'seed_sold', text: 'The Cistern\'s seed went east with the guild.', valence: -1, at: 'shale' } }, { decision: { id: 'seed_sold', text: 'You sold the Cistern\'s seed to the Tollmen.' } }],
      options: [{ text: 'As per.', next: 'intro' }],
    },
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
        { id: 'calla.help', text: 'You\'ve three on cots and one of you. Let me help.', if: { quest: 'q_a1_tents', status: 'none' }, effects: [{ quest: 'q_a1_tents', start: true }], next: 'help' },
        { id: 'calla.tents', text: 'The three are seen to.', if: { quest: 'q_a1_tents', stage: 'tended' }, next: 'tents_done' },
        { id: 'calla.seed', text: '(Give her the Cistern\'s seed case.)', if: { all: [{ item: 'k_seed_case' }, { quest: 'q_a1_seed', status: 'active' }] }, next: 'seed_given' },
        { id: 'calla.trade', text: 'Supplies.', effects: [{ event: 'barter' }], exit: true },
        { id: 'calla.choir', text: 'What is the Choir?', next: 'choir', once: true },
        { id: 'calla.orchard', text: 'The trees north of town, with leaves on. Yours?', next: 'orchard', once: true },
        { id: 'calla.word', text: '"Larkspur."', if: { knows: 'word_larkspur' }, next: 'larkspur', once: true },
        { id: 'calla.sigil', text: 'That sign on the pole. I\'ve seen it on a dead man\'s things.', if: { all: [{ knows: 'calla_sigil' }, { knows: 'sigil_seen' }] }, next: 'sigil', once: true },
        bye,
      ],
    },
    help: { text: '"Would you." It is not a question; she is already pointing. "The old man can\'t breathe, the girl\'s arm needs the board checked, and Abel\'s burning. Water\'s in the crate. Don\'t be clever; be slow."', options: [{ text: 'Slow it is.', next: 'menu' }] },
    tents_done: {
      text: [
        { if: { knows: 'pip_reported' }, text: '"Seen to." She does not look up from what she is doing. "And the girl is in the sheriff\'s cell, so one of the three is seen to twice." She finishes the knot. "The Choir says lay healer. The Choir is kinder than I am."' },
        { if: { knows: 'pip_kept' }, text: '"Seen to." She looks at you properly for the first time. "All three. And you looked at Pip\'s arm and saw an arm." She puts a grey scarf in your hands. "Lay healer. It means the sky trusts your hands, and so do I."' },
        { text: '"Seen to." She puts a grey scarf in your hands. "Lay healer. It means the sky trusts your hands. Try to deserve it."' },
      ],
      effects: [{ learn: 'tents_thanked' }, { enlist: 'choir', rank: 'lay' }, { rep: { faction: 'choir', respect: 8 } }, { trust: { npc: 'npc_sh_05', by: 8 } }],
      options: [{ text: 'I\'ll try.', next: 'menu' }],
    },
    seed_given: {
      text: 'She takes the case in both hands and does not say anything for a while. "Ninety years." She reads the label. "Tomato." A laugh that is nearly something else. "Anselm will plant it tomorrow. Pike will hear by tonight. Let him." She touches the tent-pole where the sign is. "Under the sky. Thank you."',
      effects: [{ take: 'k_seed_case' }, { rep: { faction: 'choir', respect: 12 } }, { enlist: 'choir', rank: 'lay' }, { trust: { npc: 'npc_sh_05', by: 10 } }, { learn: 'seed_given_choir' }, { rep: { faction: 'tollmen', respect: -4 } }, { news: { tag: 'seed_choir', text: 'The Cistern\'s seed went into the Choir\'s beds.', valence: 1, at: 'shale' } }, { decision: { id: 'seed_given', text: 'You gave the Cistern\'s seed to the Choir.' } }],
      options: [{ text: 'Under the sky.', next: 'menu' }],
    },
    heal: {
      text: 'She works fast and talks while she does it, which you suspect is the point. Clean water, a needle, something that stings.',
      effects: [{ set: 'calla_healed_today' }, { event: 'heal' }, { after: { minutes: 720, id: 'calla_heal_reset', effects: [{ set: 'calla_healed_today', value: false }] } }, { trust: { npc: 'npc_sh_05', by: 3 } }],
      options: [{ text: 'Thank you.', next: 'menu' }],
    },
    orchard: { text: '"Ours, and the sky\'s. Brother Anselm has had twelve of them back from the roots in nine years, which is twelve more than anyone else in the Sallow." The smile goes. "Something robs him at night. He won\'t have it hurt and he won\'t have it go on, and he asked me, and I am asking you, since you look like someone who can tell the difference between those two."', effects: [{ learn: 'calla_orchard' }, { learn: 'loc_orchard' }, { learn: 'or_thefts' }, { quest: 'q_orchard', start: true }, { lead: 'l_orchard_thieves' }], options: [{ text: 'I\'ll go and look.', next: 'menu' }] },
    choir: { text: '"People who decided the sky was enough to pray to, since it was all that was left. We farm, we heal, we bury." She smiles. "That\'s the short version. The long one has a lot of singing."', effects: [{ learn: 'choir_what' }], options: [{ text: 'Thanks.', next: 'menu' }] },
    larkspur: {
      text: 'She goes very still, then very busy. "Where did you hear that?" You tell her: a dying man at a door. She closes her eyes. "Then he got that far. Say it to no one else. Not here. There\'s a man east, at Openfield — I can\'t tell you more than that, and you should not want me to."',
      effects: [{ learn: 'calla_knows_word' }, { lead: 'l_larkspur_calla' }, { trust: { npc: 'npc_sh_05', by: 15 } }, { decision: { id: 'said_larkspur_calla', text: 'You said the dead man\'s word to Sister Calla.' } }],
      options: [{ text: 'All right.', next: 'menu' }],
    },
    sigil: { text: '"Lots of people paint the open sky." Her hands keep folding a bandage that was folded. "If you have his things, keep them out of the Tollmen\'s sight. They don\'t like what it means."', effects: [{ learn: 'calla_sigil_warning' }], options: [{ text: 'What does it mean?', next: 'sigil2' }, { text: 'Noted.', next: 'menu' }] },
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
        { id: 'hollis.stranger', text: 'An old man sat here three weeks ago. Tall, hurt.', if: { all: [{ quest: 'q_ch1_shale' }, { any: [{ knows: 'hollis_likes_you' }, { trust: { npc: 'npc_sh_06', gte: 10 } }] }] }, next: 'stranger', once: true },
        { id: 'hollis.map', text: '(Show him the map.) Can you read this hand?', if: { all: [{ item: 'k_map' }, { not: { knows: 'hollis_read_map' } }, { any: [{ knows: 'hollis_likes_you' }, { trust: { npc: 'npc_sh_06', gte: 10 } }] }] }, next: 'map' },
        { id: 'hollis.stranger.cold', text: 'An old man sat here three weeks ago.', if: { all: [{ quest: 'q_ch1_shale' }, { not: { knows: 'hollis_likes_you' } }, { trust: { npc: 'npc_sh_06', lte: 9 } }] }, next: 'stranger_cold', once: true },
        bye,
      ],
    },
    stranger_cold: { text: '"Lots of men sit here, pup. I don\'t remember the ones who don\'t bring a bottle."', options: [{ text: 'Fair.', next: 'intro' }] },
    stranger: {
      text: '"Him." The old man goes quiet in a way he hasn\'t been. "He sat where you are. We didn\'t talk. We didn\'t need to — I knew the sign on his things, pup, and he knew I knew it. He had a map. Folded small, kept close, the way you keep a thing you\'ve already decided to sell. He asked me if the Dogs kept their word on water. I said Kessler does. He nodded like a man picking a grave."',
      effects: [{ learn: 'hollis_saw_stranger' }, { learn: 'kessler_has_map' }, { lead: 'l_map_traded' }, { learn: 'hollis_knew_mask' }, { learn: 'loc_rustdogs' }, { xp: 30 }],
      options: [{ text: 'You knew the sign?', next: 'mask' }, { text: 'Thank you.', exit: true }],
    },
    mask: { text: '"I knew a man who painted that sign on everything he owned. Forty years ago, in a place with boards." He won\'t say more; he turns his cup over. "Ask me again when I\'m drunker, pup. Or soberer. One of the two."', effects: [{ lead: 'l_hollis_knew_mask' }], options: [{ text: 'I will.', exit: true }] },
    gift: { text: 'He drinks it like a man checking the time. "Pup. Pup, you\'re all right." His eyes go somewhere far east. "Ask me something. Quick, while I like you."', effects: [{ learn: 'hollis_likes_you' }], options: [{ text: 'What are "the boards"?', next: 'boards' }, { text: 'Later.', exit: true }] },
    gift_b: { text: '"Mags\'s rot." He drinks it anyway. "That\'s not a kindness, pup, but I\'ll take the thought."', options: [{ text: 'What are "the boards"?', next: 'boards' }, bye] },
    boards: { text: '"City boards. Screens, pup, tall as a house, with your face on \'em if you were worth a line. Said who paid, who owed, who was next." He laughs, dry as the street. "I had a line once. A short one."', effects: [{ learn: 'hollis_city_boards' }, { lead: 'l_hollis_city' }], options: [{ text: 'Which city?', next: 'which' }, bye] },
    which: { text: '"The only one that counts, pup. West, past the glass, where it rains." He won\'t say the name; he mouths it and looks at the Tollmen post. "Forty years. They don\'t let you out, you know. You leave."', effects: [{ learn: 'hollis_was_in_city' }], options: [{ text: 'Thanks, old man.', exit: true }] },
    map: {
      text: 'He holds it a long way from his face, then very close. "Boards hand," he says. "City hand. Blocks of five and a turn of the wheel each name — they taught us that so we couldn\'t read our own files." His finger finds the nearest pin. "Reese. Jonah. Shale. A month." The next. "Vey. Ada. Shale. Four months." He stops reading. "That\'s two I know. Don\'t show me the rest, pup. I\'m old; I\'d like to stay surprised."',
      effects: [{ learn: 'hollis_read_map' }, { learn: 'name1_decoded' }, { learn: 'name3_decoded' }, { set: 'jonah_named' }, { lead: 'l_name_jonah' }, { lead: 'l_name_vey' }, { xp: 80 }, { trust: { npc: 'npc_sh_06', by: 10 } }, { decision: { id: 'read_first_name', text: 'Hollis Crane read the first names on the stranger\'s map for you: Jonah Reese within the month; Ada Vey in four.' } }, { after: { minutes: 30 * 1440, id: 'jonah_month', effects: [{ set: 'jonah_month_over' }] } }, { quest: 'q_ch1_name', stage: 'read' }, { event: 'title', data: { text: 'CHAPTER ONE\nTHE KNOCK' } }],
      options: [{ text: '(Fold the map.)', exit: true }],
    },
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
        { id: 'yusra.fit', text: 'Could you fit something in me?', if: { all: [{ knows: 'yusra_work' }, { not: { knows: 'yusra_fits' } }] }, next: 'fit' },
        { id: 'yusra.table', text: 'I\'ll sit for the work.', if: { knows: 'yusra_fits' }, effects: [{ event: 'surgery' }], exit: true },
        { id: 'yusra.filter', text: 'The east cistern. Could you build a filter for it?', if: { all: [{ knows: 'jonah_drinks' }, { not: { flag: 'jonah_fever_blocked' } }] }, next: 'filter' },
        bye,
      ],
    },
    work: { text: '"Chrome. Bionics. Eyes that see heat, a hand that doesn\'t shake, a spine-link. Rare out here; the city makes the good pieces and the Concern makes the better ones and both of them keep a hand on the leash." She wipes a blade. "I fit what people bring me. I take it out again when it goes wrong, and it does."', effects: [{ learn: 'yusra_work' }], options: [{ text: 'Could you fit something in me?', next: 'fit' }, bye] },
    fit: {
      text: '"With what? I\'ve a Gyro Hand — a pre-Burn surgical hand, steady as a table — and a pair of Ember Eyes I built myself, and either costs more than you\'ve got on you. Bring me a piece and the Tolls for the surgery, or the Tolls for the piece and the surgery both, and I\'ll fit it. It goes in or it doesn\'t; I don\'t promise. Sit down when you\'re ready."',
      effects: [{ learn: 'yusra_fits' }],
      options: [{ id: 'yusra.fit.sit', text: '(Sit down.)', effects: [{ event: 'surgery' }], exit: true }, { text: 'Not today.', exit: true }],
    },
    filter: { text: '"Ceramic and charcoal, a day\'s work, and thirty Tolls for the ceramic, which I don\'t make." She wipes her hands. "The deputy drinks from it. I know. Everyone knows and nobody\'s asked."', options: [{ id: 'yusra.filter.pay', text: '(Pay. 30 Tolls)', if: { item: 'tolls', count: 30 }, effects: [{ take: 'tolls', count: 30 }, { set: 'jonah_fever_blocked' }, { set: 'east_cistern_filtered' }, { decision: { id: 'jonah_water_mender', text: 'You paid the Mender to build a filter for the east cistern.' } }, { trust: { npc: 'npc_sh_08', by: 8 } }, { xp: 40 }], next: 'filter_done' }, { text: 'Not now.', exit: true }] },
    filter_done: { text: '"Tomorrow. Tell the deputy it\'s for the whole east street. He\'ll drink from it if it isn\'t for him."', options: [{ text: 'Done.', exit: true }] },
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
        { id: 'dov.tower', text: 'Stop sending Jonah up the tower.', if: { all: [{ knows: 'jonah_climbs' }, { not: { flag: 'jonah_fall_blocked' } }] }, next: 'tower' },
        bye,
      ],
    },
    pumps: { text: '"Nobody. That\'s the joke." He bangs the casing. "Switch is inside, dead since my father\'s time. They run on a schedule — six, eleven, four, nine, give or take — and the schedule changes maybe twice a year, and nobody here changes it. I\'ve got the manual. Half of it\'s in a hand I can\'t read."', effects: [{ learn: 'dov_pumps_schedule' }, { lead: 'l_pump_manual' }], options: [{ text: 'Can I see the manual?', next: 'manual' }, bye] },
    manual: { text: [{ if: { origin: 'archive_clerk' }, text: 'He hands you a swollen binder. The unreadable half is record shorthand — your hand. MAINTENANCE SCHEDULE: REMOTE. SUPPLY: NETWORK 4. The rest is pressures and part numbers.' }, { if: { origin: 'pump_hand' }, text: 'He hands you a swollen binder. The diagrams you know — same pumps as home, same valves. The unreadable half is a tight print you\'ve seen on MOTHER\'s crates.' }, { text: 'He hands you a swollen binder. Diagrams, pressures, and half of it in a tight print that isn\'t any language you know.' }], effects: [{ learn: 'pump_manual_seen' }, { lead: 'l_pump_manual_hand' }], options: [{ text: 'Thanks.', exit: true }] },
    pressure: { text: 'He looks at you for a long moment. "No. No, it doesn\'t. You\'re the first person who ever asked that like it meant something."', effects: [{ learn: 'dov_pressure' }, { trust: { npc: 'npc_sh_09', by: 10 } }, { lead: 'l_pressure_shale' }], options: [{ text: 'It might.', next: 'intro' }] },
    jonah: { text: '"Set." He spits. "He\'s twenty-two. He read a book about sheriffs. Ada read him."', options: [{ text: 'He seems like a good one.', next: 'jonah2' }, bye] },
    jonah2: { text: '"He is." It comes out before he can stop it. "That\'s the problem, isn\'t it."', effects: [{ trust: { npc: 'npc_sh_09', by: 5 } }], options: [bye] },
    tower: {
      text: '"Who else goes up? Me, with this hip? The vane\'s bent since the kite day and if it doesn\'t turn, the tank doesn\'t fill, and if the tank doesn\'t fill the east street drinks green." He looks at the tower, not at you. "He\'s careful."',
      options: [
        { id: 'dov.tower.fix', text: '(Go up and straighten the vane yourself.)', check: { skill: 'mechanics', dc: 30, mods: [{ if: { origin: 'pump_hand' }, dc: -10, why: 'you grew up on ladders like this' }] }, next: 'fixed', fail: 'fix_no' },
        { id: 'dov.tower.pay', text: '(Pay Pardo to go up. 20 Tolls)', if: { item: 'tolls', count: 20 }, effects: [{ take: 'tolls', count: 20 }, { set: 'jonah_fall_blocked' }, { decision: { id: 'jonah_tower_paid', text: 'You paid Old Pardo to climb the windpump tower so Jonah would not.' } }, { xp: 30 }], next: 'paid' },
        { id: 'dov.tower.son', text: 'He\'s your son. You know what half the rungs are.', check: { skill: 'speech', dc: 40 }, effects: [{ set: 'jonah_fall_blocked' }, { decision: { id: 'jonah_tower_dov', text: 'You made Dov Reese climb his own tower instead of sending his son.' } }, { trust: { npc: 'npc_sh_09', by: -5 } }, { xp: 40 }], next: 'son', fail: 'son_no' },
        { text: 'Never mind.', next: 'intro' },
      ],
    },
    fixed: { text: 'Forty feet of rungs, half of them, and a vane that straightens with a crowbar and a word. From the top you can see the overpass. When you come down Dov has not moved. "Right," he says, which is a word people use here when they mean thank you.', effects: [{ set: 'jonah_fall_blocked' }, { set: 'vane_fixed' }, { decision: { id: 'jonah_tower_fixed', text: 'You climbed the windpump tower and straightened the vane yourself.' } }, { trust: { npc: 'npc_sh_09', by: 10 } }, { xp: 50 }, { time: 60 }], options: [{ text: '(Done.)', exit: true }] },
    fix_no: { text: 'Twenty feet up a rung lets go under you and you come down the hard way. The vane is still bent. Dov says nothing, which is kinder than it sounds.', effects: [{ time: 40 }], options: [{ text: '(Try again later.)', exit: true }] },
    paid: { text: 'Pardo takes the Tolls and looks at the tower like an old enemy. "Forty feet," he says. "I did it at sixty." He does it again.', options: [{ text: '(Done.)', exit: true }] },
    son: { text: 'He is quiet for a long time. "Half of them," he agrees. "Right." He goes to get the crowbar himself, and the hip, and the ladder.', options: [{ text: '(Done.)', exit: true }] },
    son_no: { text: '"Don\'t tell me what I know." He bangs the casing.', effects: [{ trust: { npc: 'npc_sh_09', by: -5 } }], options: [{ text: 'Never mind.', exit: true }] },
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
        { id: 'pardo.stranger', text: 'A tall old man bought water from you. With a ring.', if: { knows: 'ada_saw_stranger' }, next: 'stranger', once: true },
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
        { id: 'ruth.wheel_where', text: 'Where is the Wheel camped?', next: 'wheel_where' },
        { id: 'ruth.escort', text: 'Any work riding beside a wagon?', if: { not: { quest: 'q_a1_escort', status: 'done' } }, next: 'escort' },
        { id: 'ruth.letters', text: 'How do letters work?', next: 'letters', once: true },
        { id: 'ruth.wheel', text: 'The Wheel?', next: 'wheel', once: true },
        bye,
      ],
    },
    letters: { text: '"Write it where you sleep — Mags\'s room, a camp, anywhere with a table. I carry it. If the person\'s where you say they are, you get an answer in a few days. If they aren\'t, you get the letter back, eventually, with dust on it."', effects: [{ learn: 'letters_how' }], options: [{ text: 'Thanks.', next: 'intro' }] },
    wheel: { text: '"Nomads. Two hundred wagons across the Reach, in rings of forty. Neutral, armed, owed by everyone. We go where the Tollmen don\'t tax and we tax ourselves." She shrugs. "If you ever need to be somewhere else, and I mean *else*, the Wheel is how."', effects: [{ learn: 'wheel_what' }], options: [{ text: 'Noted.', next: 'intro' }] },
    escort: {
      text: [
        { if: { quest: 'q_a1_escort', status: 'active' }, text: '"You\'ve got it. The salt wagon, Tollhouse 9, the guild road. Keep it in your eye."' },
        { text: '"Sefa\'s salt wagon goes to Tollhouse 9 with the Tollmen\'s caravan, and the guild guards the guild\'s wagons and nobody else\'s. Sixty Tolls at the gate for walking beside it with a gun. It\'s the Wheel\'s job to give, but I can put your name on it; she\'ll have heard of you by the time you get there."' },
      ],
      options: [
        { id: 'ruth.escort.yes', text: 'Put my name on it.', if: { not: { quest: 'q_a1_escort', status: 'active' } }, effects: [{ quest: 'q_a1_escort', start: true }, { set: 'escort_active', value: 'wheel' }, { learn: 'escort_via_ruth' }], next: 'escort_yes' },
        { text: 'Not now.', next: 'intro' },
      ],
    },
    escort_yes: { text: '"Done. Walk the Tollhouse road from here; the wagon leaves when you do. If the road asks for something, it\'s asking the Wheel."', options: [{ text: 'Understood.', exit: true }] },
    wheel_where: {
      text: [
        { if: { flag: 'wheel_near', eq: 'shale' }, text: '"Close. On the pan south-west of town, where the old road was. Four days, then they turn east toward Dry Wells." She marks it on your map with a thumbnail. "Walk out before noon and you\'ll eat with them."' },
        { if: { flag: 'wheel_near', eq: 'drywells' }, text: '"Out on the Dry Wells pans this week, east. Four days, then north under the orchard." She marks it on your map. "Say Ruth sent you and Sefa will feed you before she asks what you want."' },
        { if: { flag: 'wheel_near', eq: 'orchard' }, text: '"North, under the Burnt Orchard. Four days, then the overpass side, which nobody likes." She marks it on your map. "Go by the orchard lane; the Choir will point you on."' },
        { text: '"The overpass side this week, where the Dogs can count them. Four days, then back by Shale." She marks it on your map. "Go in daylight and go slow. Sefa likes slow."' },
      ],
      effects: [{ learn: 'loc_wheel' }, { learn: 'wheel_told' }],
      options: [{ text: 'Thanks.', next: 'intro' }],
    },
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
