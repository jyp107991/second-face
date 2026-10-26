import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * The Rust Dogs' overpass — Chapter One. The camp is a place, not a dungeon: you can walk in with your hands
 * out, and the map changes hands by coin, a wager, fear, terms, a theft, or a coup.
 */

const bye = { text: 'Later.', exit: true };
const NIGHT = { hour: { from: 22, to: 5 } };
const HAVE_MAP = { flag: 'have_map' };
const MAP_EFFECTS = (how: string, text: string) => [{ give: 'k_map' }, { set: 'have_map' }, { set: `map_${how}` }, { decision: { id: `map_${how}`, text } }, { xp: 60 }];

export const d_rd_gate: DialogueDef = {
  id: 'd_rd_gate', owner: 'npc_rd_06',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Hold it. Hands out, palms up — that\'s the rule. Wren\'s rule. She\'s got you from the deck right now and she doesn\'t miss, so smile.',
      options: [
        { id: 'gate.kessler', text: 'I\'m here to talk to Kessler.', effects: [{ set: 'rd_admitted' }], next: 'in' },
        { id: 'gate.teo', text: 'I\'ve come about Teo Marsh.', if: { knows: 'teo_prisoner' }, effects: [{ set: 'rd_admitted' }, { learn: 'teo_seen' }], next: 'in_teo' },
        { id: 'gate.ada', text: 'Sheriff Vey sent me.', if: { knows: 'ada_saw_stranger' }, effects: [{ set: 'rd_admitted' }, { set: 'rd_said_ada' }, { memory: { npc: 'npc_rd_01', tag: 'came_from_vey', valence: -5 } }], next: 'in_ada' },
        { id: 'gate.presence', text: '(Look at him until he moves.)', if: { attr: 'presence', gte: 7 }, effects: [{ set: 'rd_admitted' }, { memory: { npc: 'npc_rd_06', tag: 'stared_down', valence: -10 } }], next: 'in_stare' },
        { id: 'gate.fight', text: 'Try and stop me.', effects: [{ set: 'rustdogs_hostile' }, { event: 'combat' }], exit: true },
      ],
    },
    in: { text: 'Everyone is. Walk slow. The hall\'s the coach under the deck. Don\'t touch the dogs, don\'t touch the tank, don\'t touch Vasha.', options: [{ text: '(Walk slow.)', exit: true }] },
    in_teo: { text: 'Mags\'s man. He\'s in the cage; he\'s fine; he does Perpetua\'s counting. Kessler decides about him, or Perpetua does if you pay her first. Walk slow.', options: [{ text: '(Walk slow.)', exit: true }] },
    in_ada: { text: '…She did? Then you\'re brave or you\'re stupid, and Kessler likes both. Walk slow, and don\'t say her name inside like it\'s a password.', options: [{ text: '(Walk slow.)', exit: true }] },
    in_stare: { text: 'He holds it for three seconds, which is two more than most. "…Fine. Fine! Walk slow. Wren\'s still got you."', options: [{ text: '(Walk slow.)', exit: true }] },
  },
};

export const d_rd_brindle: DialogueDef = {
  id: 'd_rd_brindle', owner: 'npc_rd_06',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Brindle. Gate. Nine years a Dog; I was seven. Wren says I talk too much, so I\'m not talking.',
      options: [
        { id: 'brindle.wren', text: 'Wren taught you?', next: 'wren', once: true },
        { id: 'brindle.before', text: 'Where were you before the Dogs?', next: 'before', once: true },
        bye,
      ],
    },
    wren: { text: '"Everything. Tracks, wind, where to stand so the sun\'s behind you." He glances at the deck. "She\'s leaving. Everybody knows. Nobody says. Don\'t tell her I did."', effects: [{ learn: 'wren_leaving' }], options: [bye] },
    before: { text: '"A wagon. The Tollmen took the wagon for a toll and my mum for the rest." Flat, practised. "Kessler took me for nothing. So."', effects: [{ learn: 'brindle_story' }, { trust: { npc: 'npc_rd_06', by: 5 } }], options: [bye] },
  },
};

export const d_rd_kessler: DialogueDef = {
  id: 'd_rd_kessler', owner: 'npc_rd_01',
  start: [
    { if: { flag: 'vasha_coup_agreed', eq: true }, node: 'intro_or_coup' },
    { if: HAVE_MAP, node: 'after' },
    { if: { flag: 'rd_kessler_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'Sit. No — stand; it\'s not a long talk. Brindle says you walked in with your hands out, so you\'ve got manners or no gun. Which?',
      effects: [{ set: 'rd_kessler_met' }],
      passives: [
        { attr: 'wits', dc: 7, text: 'A folded paper under the lamp on his table, held flat by a shotgun shell.', effects: [{ learn: 'kessler_map_seen' }] },
        { attr: 'senses', dc: 7, text: 'The coach smells of dog, and of soap. Somebody here washes.' },
      ],
      options: [
        { id: 'kessler.cut', text: 'Both. I\'m from the salt cut — Cistern 9. A man with a mask died at our door.', next: 'cut' },
        { id: 'kessler.manners', text: 'Manners. I\'d like to keep them.', next: 'menu' },
      ],
    },
    cut: {
      text: '"The bunker." He doesn\'t blink. "The old man said that too, at the end, when Wren brought him in across a dog. \'Tell the bunker.\' Tell them what, I asked. He didn\'t have the water left to answer, so I gave him some, and he gave me a paper, and he walked west to die on your step." A pause. "Fair?"',
      effects: [{ learn: 'kessler_met_stranger' }, { lead: 'l_kessler_stranger' }],
      options: [{ text: 'Fair. Tell me about the paper.', next: 'map', if: { not: HAVE_MAP } }, { text: 'What else?', next: 'menu' }],
    },
    menu: {
      text: 'Ask. I\'ll answer what\'s free. The rest has a price, like water.',
      options: [
        { id: 'kessler.map', text: 'The map he carried. I want it.', if: { all: [{ not: HAVE_MAP }, { any: [{ knows: 'kessler_has_map' }, { knows: 'kessler_map_seen' }, { knows: 'map_sold' }, { knows: 'kessler_met_stranger' }] }] }, next: 'map' },
        { id: 'kessler.teo', text: 'You\'re holding Teo Marsh.', if: { all: [{ knows: 'teo_prisoner' }, { not: { flag: 'teo_freed' } }] }, next: 'teo' },
        { id: 'kessler.tribute', text: 'Tribute Day. What do you take from Shale?', if: { any: [{ knows: 'tribute_due' }, { knows: 'shale_tribute' }] }, next: 'tribute', once: true },
        { id: 'kessler.who', text: 'Who are the Rust Dogs?', next: 'who', once: true },
        { text: 'I\'ll come back.', exit: true },
      ],
    },
    map: {
      text: 'Water for a paper. He said the paper was worth more than my camp, and I believed him, because a dying man doesn\'t lie about prices. I can\'t read it. Nobody here can. Vasha wants to sell it to the Tollmen. The Tollmen have already asked, which is why I haven\'t.',
      effects: [{ learn: 'kessler_has_map' }],
      options: [
        { id: 'kessler.price', text: 'Name a price.', next: 'price' },
        { id: 'kessler.wager', text: 'Play you for it. Dust. My stake against the paper.', if: { any: [{ item: 'tolls', count: 20 }, { item: 'w_bolt308' }] }, next: 'wager' },
        { id: 'kessler.fear', text: 'The Tollmen know you have it. Pike reported him — "as per".', if: { knows: 'pike_reported' }, check: { skill: 'speech', dc: 45 }, next: 'fear', fail: 'fear_no', once: true },
        { id: 'kessler.terms', text: 'Give it to me, and I\'ll carry your terms to Shale before Tribute Day.', if: { all: [{ any: [{ knows: 'tribute_due' }, { knows: 'shale_tribute' }] }, { not: { flag: 'rd_terms_carried' } }] }, check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'kessler_tribute_view' }, dc: -10, why: 'you know what he wants from Shale' }] }, next: 'terms', fail: 'terms_no', once: true },
        { text: 'Let me think.', next: 'menu' },
      ],
    },
    price: {
      text: 'Eighty Tolls. Or the rifle on your back, if it\'s the bolt gun — Jack says the bolt gun shoots straight, and nothing here does.',
      options: [
        { id: 'kessler.pay', text: '(Pay. 80 Tolls)', if: { item: 'tolls', count: 80 }, effects: [{ take: 'tolls', count: 80 }, ...MAP_EFFECTS('bought', 'You bought the stranger\'s map from Kessler for eighty Tolls.')], next: 'handover' },
        { id: 'kessler.rifle', text: '(Hand over the bolt rifle.)', if: { item: 'w_bolt308' }, effects: [{ take: 'w_bolt308' }, ...MAP_EFFECTS('rifle', 'You traded the Cistern\'s bolt rifle to Kessler for the stranger\'s map.')], next: 'handover' },
        { text: 'Too much.', next: 'map' },
      ],
    },
    wager: {
      text: '"Fair." He clears the table with his forearm. "Twenty Tolls or the rifle, against the paper. First to thirty. I don\'t cheat; I don\'t need to."',
      options: [
        { id: 'kessler.wager.tolls', text: '(Stake 20 Tolls.)', if: { item: 'tolls', count: 20 }, effects: [{ event: 'dust', data: { stake: 20, prize: { label: 'the stranger\'s map against twenty Tolls', win: MAP_EFFECTS('won', 'You won the stranger\'s map from Kessler at Dust.'), lose: [{ take: 'tolls', count: 20 }, { set: 'lost_to_kessler' }] } } }], exit: true },
        { id: 'kessler.wager.rifle', text: '(Stake the bolt rifle.)', if: { item: 'w_bolt308' }, effects: [{ event: 'dust', data: { stake: 0, prize: { label: 'the stranger\'s map against the bolt rifle', win: MAP_EFFECTS('won', 'You won the stranger\'s map from Kessler at Dust.'), lose: [{ take: 'w_bolt308' }, { set: 'lost_to_kessler' }] } } }], exit: true },
        { text: 'On second thought.', next: 'map' },
      ],
    },
    fear: {
      text: 'He is quiet for a while. "…Then it\'s a stone in my boot, not a paper." He takes it from under the lamp and pushes it across. "Take it out of my camp. When they come asking, you were never here, and I never had it. Fair?"',
      effects: [...MAP_EFFECTS('fear', 'Kessler gave you the map to be rid of it, once he knew the Tollmen were asking.'), { rep: { faction: 'rust_dogs', respect: 5 } }],
      options: [{ text: 'Fair.', next: 'handover' }],
    },
    fear_no: { text: '"Let them come. They\'ve come before." He puts a hand flat on the lamp. "Price is eighty."', options: [{ text: 'Name a price.', next: 'price' }, { text: 'Let me think.', next: 'menu' }] },
    terms: {
      text: '"You\'d do that." He thinks about it the way he does everything, slowly and once. "Half what we took last time. Water, not drink. Vey hears it from you, not from Vasha\'s truck. If she pays, nobody dies, and you keep the paper." He slides it across. "If she doesn\'t, I\'ll know who talked."',
      effects: [...MAP_EFFECTS('terms', 'Kessler gave you the map in exchange for carrying his tribute terms to Shale: half of last time, in water.'), { set: 'rd_terms_carried' }, { learn: 'tribute_terms' }, { rep: { faction: 'rust_dogs', respect: 5 } }],
      options: [{ text: 'She\'ll hear it.', next: 'handover' }],
    },
    terms_no: { text: '"She wouldn\'t take terms from me. She won\'t take them from a stranger with my paper in their pocket." He almost smiles. "Price is eighty."', options: [{ text: 'Name a price.', next: 'price' }, { text: 'Let me think.', next: 'menu' }] },
    handover: {
      text: 'The paper is soft as cloth from handling. Marks in blocks of five, a drawn line of road, and twelve places on it pricked with a pin. "Don\'t read it here," Kessler says. "Whatever it is."',
      options: [{ text: '(Put it away.)', exit: true }],
    },
    teo: {
      text: 'The trader. His partner\'s brother owed forty; he says it\'s not his debt. Debts are family here; it\'s how we\'ve lasted. Sixty with the keeping. Pay it, or make me a better offer, or talk to Perpetua — he counts for her, and she\'s fond.',
      effects: [{ learn: 'teo_seen' }, { learn: 'teo_price' }],
      options: [
        { id: 'kessler.teo.pay', text: '(Pay his debt. 60 Tolls)', if: { item: 'tolls', count: 60 }, effects: [{ take: 'tolls', count: 60 }, { set: 'teo_freed' }, { set: 'teo_freed_paid' }, { decision: { id: 'teo_freed_paid', text: 'You paid Teo Marsh\'s debt to the Rust Dogs.' } }, { news: { tag: 'freed_teo', text: 'someone bought Teo Marsh out of the Dogs\' cage', valence: 15, size: 5, at: 'rustdogs' } }], next: 'teo_free' },
        { id: 'kessler.teo.terms', text: 'A better offer: free him, and I carry your terms to Shale for Tribute Day.', if: { all: [{ any: [{ knows: 'tribute_due' }, { knows: 'shale_tribute' }] }, { not: { flag: 'rd_terms_carried' } }] }, check: { skill: 'speech', dc: 45 }, effects: [{ set: 'teo_freed' }, { set: 'rd_terms_carried' }, { learn: 'tribute_terms' }, { decision: { id: 'teo_freed_terms', text: 'Kessler freed Teo Marsh in exchange for your carrying his tribute terms to Shale.' } }, { news: { tag: 'freed_teo', text: 'the Dogs let Teo Marsh go', valence: 10, size: 4, at: 'rustdogs' } }], next: 'teo_free', fail: 'teo_no' },
        { text: 'Let me talk to him first.', next: 'menu' },
      ],
    },
    teo_free: { text: '"Fair." He raises his voice without seeming to. "Lute! The trader walks." Then, to you: "Tell Mags the count was right. She\'ll know what I mean."', options: [{ text: 'I will.', next: 'menu' }] },
    teo_no: { text: '"Sixty." Flat. "Or Perpetua."', options: [{ text: 'Let me think.', next: 'menu' }] },
    tribute: {
      text: 'Twice a year. Water, mostly; what Mags brews; a cow, when they had cows. They pay it and nobody dies. Vasha wants more and Vey wants to give nothing and I\'m the man in the middle who keeps a list of who I haven\'t robbed.',
      effects: [{ learn: 'kessler_tribute_view' }],
      options: [{ id: 'kessler.tribute.fight', text: 'What if Shale fought this time?', next: 'tribute_fight', once: true }, { text: 'Noted.', next: 'menu' }],
    },
    tribute_fight: { text: '"Then I\'d lose Dogs, and they\'d lose a town, and Vasha would be chief by morning. And you\'d have done that." He looks at you. "Fair?"', effects: [{ learn: 'vasha_would_be_chief' }], options: [{ text: 'Noted.', next: 'menu' }] },
    who: { text: '"Forty people the road dropped, under a road the sky dropped. We take the tithe; we don\'t take lives. That\'s mine. It\'s the only thing that is, and it\'s why Vasha counts."', effects: [{ learn: 'kessler_no_lives' }], options: [{ text: 'Noted.', next: 'menu' }] },
    again: { text: 'Back. Ask.', options: [{ text: 'A few things.', next: 'menu' }] },
    after: { text: 'You\'ve got your paper. Don\'t read it here, and don\'t tell Vasha what it says if you ever find out.', options: [{ text: 'A few things.', next: 'menu' }, { text: 'I\'ll be going.', exit: true }] },
    intro_or_coup: {
      text: [{ if: NIGHT, text: 'One lamp. The shotgun across his knees, where it always is. "Late," Kessler says. "Vasha sent you. She sends everyone, in the end."' }, { text: 'He looks at you, and then past you, to where Vasha stands by the fire. "Not yet, I think," he says, to nobody.' }],
      options: [
        { id: 'kessler.coup.draw', text: '(Draw on him.)', if: NIGHT, effects: [{ set: 'rd_coup' }, { decision: { id: 'rd_coup', text: 'You went for Kessler in his hall, with Vasha behind you.' } }, { event: 'fight' }], exit: true },
        { id: 'kessler.coup.warn', text: 'She did. I\'m telling you instead.', if: NIGHT, effects: [{ set: 'vasha_coup_agreed', value: false }, { set: 'warned_kessler' }, { trust: { npc: 'npc_rd_01', by: 20 }, }, { memory: { npc: 'npc_rd_02', tag: 'betrayed_coup', valence: -40, strength: 100 } }, { decision: { id: 'warned_kessler', text: 'You warned Kessler of Vasha\'s coup instead of carrying it out.' } }], next: 'warned' },
        { text: 'A few things.', next: 'menu' },
        { text: 'Not tonight.', exit: true },
      ],
    },
    warned: { text: 'He doesn\'t reach for the gun. "Fair," he says, after a long time. "Then you\'ll want the paper, and I\'ll want her out of my camp, and we\'ll both get one of those." He gives you the map.', effects: [...MAP_EFFECTS('warned', 'Kessler gave you the map after you warned him of the coup.'), { rep: { faction: 'rust_dogs', respect: 10 } }], options: [{ text: '(Put it away.)', exit: true }] },
  },
};

export const d_rd_vasha: DialogueDef = {
  id: 'd_rd_vasha', owner: 'npc_rd_02',
  start: [
    { if: { all: [{ dead: 'npc_rd_01' }, { flag: 'rd_coup' }] }, node: 'after_coup' },
    { if: { flag: 'warned_kessler' }, node: 'betrayed' },
    { if: { flag: 'vasha_coup_agreed', eq: true }, node: 'waiting' },
    { if: { flag: 'rd_vasha_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: '{name}. I\'ve heard it twice already today; it\'s a good name for a grave. Vasha. I run the part of this camp that bleeds; Kessler keeps the list.',
      effects: [{ set: 'rd_vasha_met' }, { learn: 'vasha_name' }],
      passives: [{ attr: 'senses', dc: 7, text: 'A pistol-grip submachine gun on a strap, and her thumb never leaves the safety.' }],
      options: [{ text: 'What do you want from me?', next: 'menu' }],
    },
    again: { text: 'Say it again. Your name. I like how it sounds when you\'re careful.', options: [{ text: 'What do you want?', next: 'menu' }] },
    menu: {
      text: 'Everything, eventually. Today I\'ll settle for a conversation.',
      options: [
        { id: 'vasha.map', text: 'The paper Kessler took off the old man.', if: { all: [{ not: HAVE_MAP }, { any: [{ knows: 'kessler_has_map' }, { knows: 'kessler_met_stranger' }] }] }, next: 'map' },
        { id: 'vasha.shale', text: 'What do you want with Shale?', next: 'shale', once: true },
        { id: 'vasha.kessler', text: 'You and Kessler.', next: 'kessler', once: true },
        { id: 'vasha.raid', text: 'Tollhouse 9. I want through it, and I don\'t want to pay.', if: { all: [{ quest: 'q_a1_tollhouse' }, { not: { flag: 'rd_raid_agreed' } }, { not: { flag: 'th_passed' } }, { not: { flag: 'th_raided' } }] }, next: 'raid' },
        bye,
      ],
    },
    map: {
      text: 'The paper. Kessler will sit on it until the Tollmen lift it off his corpse, or he dies of old age first, which is the same thing slower. You want it. I want a camp that isn\'t a charity. He\'s in that coach every night with one lamp and a shotgun he\'s never fired at a person. You see where I\'m going.',
      options: [
        { id: 'vasha.coup', text: 'You want me to kill Kessler.', next: 'coup' },
        { text: 'I see where you\'re going. I\'m not going there.', next: 'menu', effects: [{ memory: { npc: 'npc_rd_02', tag: 'refused_coup', valence: -10 } }] },
      ],
    },
    coup: {
      text: '"I want the hall. Tonight, after the fires. You go in; I come in behind you. What happens, happens. The paper\'s yours. The camp\'s mine. And Shale learns what tribute means when someone counts."',
      options: [
        { id: 'vasha.coup.yes', text: 'Done.', effects: [{ set: 'vasha_coup_agreed' }, { decision: { id: 'vasha_coup_agreed', text: 'You agreed to help Vasha take the camp from Kessler.' } }], next: 'coup_yes' },
        { id: 'vasha.coup.no', text: 'No.', effects: [{ memory: { npc: 'npc_rd_02', tag: 'refused_coup', valence: -15 } }], next: 'coup_no' },
      ],
    },
    coup_yes: { text: '"After the fires. Don\'t be clever; clever is Kessler\'s."', options: [{ text: '(Nod.)', exit: true }] },
    coup_no: { text: '"Then you\'re Kessler\'s. That\'s a shorter list than you think."', options: [{ text: 'We\'ll see.', exit: true }] },
    waiting: { text: [{ if: NIGHT, text: 'The fires are down. She tilts her head toward the coach. "Go on."' }, { text: 'After the fires. Not before.' }], options: [{ text: '(Go.)', exit: true }] },
    after_coup: {
      text: 'She steps over him without looking down and takes the paper from under the lamp. She holds it a moment, then holds it out. "A deal\'s a deal. I don\'t need to read it; I know what it says about me." Outside, the camp is very quiet.',
      effects: [...MAP_EFFECTS('coup', 'Kessler died in his hall. Vasha leads the Rust Dogs and gave you the map.'), { set: 'rd_leader', value: 'vasha' }, { rep: { faction: 'rust_dogs', fear: 25 } }, { news: { tag: 'kessler_dead', text: 'Kessler of the Rust Dogs was killed in his own hall; Vasha Kade leads now', valence: -25, size: 8, at: 'rustdogs' } }],
      options: [{ text: '(Take it.)', exit: true }],
    },
    betrayed: { text: 'She looks at you the way she looks at the pens. "You told him." Nothing else. The thumb is on the safety.', options: [{ text: '(Leave.)', exit: true }] },
    shale: { text: '"A well with people around it. I\'m going to take the well. The people can stay if they\'re useful."', effects: [{ learn: 'vasha_wants_shale' }], options: [{ text: 'Noted.', next: 'menu' }] },
    kessler: { text: '"He keeps a list of who he hasn\'t robbed. I keep count of who\'s hungry. Guess which list is longer."', options: [{ text: 'Noted.', next: 'menu' }] },
    raid: {
      text: '"The guild pays Kessler to leave the highway alone. The guild has never paid me." She looks east, where the wall is. "Four Dogs and me, at the verge, when you walk up to the gate. You start it. We finish it. The warehouse is ours, the road is yours, and the guild learns the Sallow has teeth." A beat. "Kessler won\'t know until it\'s done."',
      options: [
        { id: 'vasha.raid.yes', text: 'Done.', effects: [{ set: 'rd_raid_agreed' }, { decision: { id: 'rd_raid_agreed', text: 'You agreed to hit Tollhouse 9 with Vasha and four Dogs.' } }, { memory: { npc: 'npc_rd_02', tag: 'raid_agreed', valence: 15, strength: 80 } }, { lead: 'l_raid_plan' }], next: 'raid_yes' },
        { id: 'vasha.raid.no', text: 'No. Too many of them.', effects: [{ memory: { npc: 'npc_rd_02', tag: 'refused_raid', valence: -5 } }], next: 'raid_no' },
      ],
    },
    raid_yes: { text: '"We leave tonight. Walk the highway like you own it; we\'ll be in the salt. Don\'t pay them. If you pay them I\'ll know what you are."', options: [{ text: '(Go.)', exit: true }] },
    raid_no: { text: '"Then pay them. Everyone does."', options: [{ text: '(Leave.)', exit: true }] },
  },
};

export const d_rd_wren: DialogueDef = {
  id: 'd_rd_wren', owner: 'npc_rd_03',
  start: [
    { if: { inParty: 'npc_rd_03' }, node: 'party' },
    { if: { all: [{ flag: 'wren_deal' }, NIGHT, { not: HAVE_MAP }] }, node: 'steal_now' },
    { if: { flag: 'wren_deal' }, node: 'deal_wait' },
    { if: { flag: 'rd_wren_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'Don\'t stand on the skyline. — You\'re the salt-cut one. I found him, you know. Your old man with the mask. Out past the west track, sitting against a post with his boots off, talking to the boots.',
      effects: [{ set: 'rd_wren_met' }],
      options: [{ text: 'What did he say?', next: 'said' }, { text: 'You brought him in?', next: 'brought' }],
    },
    said: { text: '"That he\'d been shot by people who were paid to shoot him, and that he\'d rather give the paper to a thief than to a bank. He meant Kessler. He meant it as a compliment."', effects: [{ learn: 'wren_found_stranger' }, { lead: 'l_wren_found' }], options: [{ text: 'You brought him in?', next: 'brought' }, { text: 'More.', next: 'menu' }] },
    brought: { text: '"Across a dog. He weighed nothing." She looks west. "I wanted to let him go east, where he was pointed. Kessler wanted the paper. Kessler got the paper, the old man got water, and he walked west to die on your step. Everybody got what they wanted. That\'s the camp."', effects: [{ learn: 'wren_wanted_release' }, { trust: { npc: 'npc_rd_03', by: 5 } }], options: [{ text: 'More.', next: 'menu' }] },
    again: { text: 'Skyline. — What?', options: [{ text: 'A few things.', next: 'menu' }] },
    menu: {
      text: 'Ask. Quietly.',
      options: [
        { id: 'wren.map', text: 'The paper. I want it. Help me.', if: { all: [{ not: HAVE_MAP }, { any: [{ knows: 'kessler_has_map' }, { knows: 'kessler_met_stranger' }] }, { not: { flag: 'wren_deal' } }] }, next: 'steal' },
        { id: 'wren.exodus', text: 'Come to Shale. You and whoever follows you. Sheriff Vey will take you in, under her law.', if: { all: [{ flag: 'shale_exodus_ok' }, { not: { flag: 'wren_exodus' } }] }, next: 'exodus' },
        { id: 'wren.girl', text: 'Brindle says you\'re leaving.', if: { knows: 'wren_leaving' }, next: 'leaving', once: true },
        { id: 'wren.page', text: 'Did he have anything else on him? Besides the map.', if: { knows: 'wren_found_stranger' }, check: { skill: 'speech', dc: 40, mods: [{ if: { trust: { npc: 'npc_rd_03', gte: 5 } }, dc: -10, why: 'she has decided you are all right' }] }, next: 'page', fail: 'page_no', once: true },
        bye,
      ],
    },
    steal: {
      text: '"…You want me to lift it out of Kessler\'s coach." A long look at the west track. "I\'ll do it. Tonight. The price is you: when you leave, I leave with you, and you don\'t ask about the girl until I tell you."',
      options: [
        { id: 'wren.steal.yes', text: 'Deal.', effects: [{ set: 'wren_deal' }, { decision: { id: 'wren_steal_deal', text: 'Wren agreed to steal the map for you, for a place at your side when you leave.' } }], next: 'steal_yes' },
        { id: 'wren.steal.girl', text: 'What girl?', effects: [{ trust: { npc: 'npc_rd_03', by: -5 } }], next: 'girl' },
        { text: 'No.', next: 'menu' },
      ],
    },
    steal_yes: { text: '"After the fires. Find me here. Don\'t be near the hall."', options: [{ text: '(Nod.)', exit: true }] },
    girl: { text: '"That\'s asking." She goes back to watching the road, and the conversation is over for now.', options: [{ text: '(Leave it.)', next: 'menu' }] },
    deal_wait: { text: 'After the fires. Not before.', options: [{ text: '(Wait.)', exit: true }] },
    steal_now: {
      text: '"Wait here. Watch the road for me — it\'s the one thing nobody else does." She is gone an hour, and comes back with the paper and no expression at all. "Kessler sleeps like a man with a list. Let\'s go, before he reads it."',
      effects: [...MAP_EFFECTS('stolen', 'Wren stole the stranger\'s map from Kessler\'s hall. She leaves with you.'), { time: 60 }, { join: 'npc_rd_03' }, { set: 'wren_joined' }, { approval: { companion: 'npc_rd_03', by: 10 } }, { news: { tag: 'map_stolen', text: 'something was taken from Kessler\'s coach in the night', valence: -10, size: 4, at: 'rustdogs' } }, { memory: { npc: 'npc_rd_01', tag: 'map_vanished', valence: -20, strength: 80 } }],
      options: [{ text: 'Let\'s go.', exit: true }],
    },
    exodus: {
      text: '"…She said that." Wren is very still. "If it\'s true, I bring the girl, and Brindle, and Sprat, and the paper, and Kessler keeps his list and his camp. Tonight. If it isn\'t true, I\'ll know, and so will Vey."',
      effects: [...MAP_EFFECTS('exodus', 'Wren took the map and her people to Shale on your word that the sheriff would have them.'), { set: 'wren_exodus' }, { join: 'npc_rd_03' }, { set: 'wren_joined' }, { approval: { companion: 'npc_rd_03', by: 15 } }, { news: { tag: 'dogs_exodus', text: 'some of the Rust Dogs walked into Shale and asked for the sheriff', valence: 10, size: 7, at: 'shale' } }],
      options: [{ text: 'It\'s true.', exit: true }],
    },
    leaving: { text: '"Brindle talks." Not angry. "Everyone\'s leaving; most people just do it by dying. I\'d rather walk." She doesn\'t say where.', effects: [{ learn: 'wren_wants_out' }], options: [{ text: 'Noted.', next: 'menu' }] },
    page: { text: 'She takes a folded page from inside her hood: a leaf torn from a notebook, the same tight marks. "He was tearing it up to burn it when I found him. This one he dropped. I can\'t read it. Can you?"', effects: [{ give: 'k_notebook_page' }, { learn: 'wren_page' }, { lead: 'l_wren_page' }], options: [{ text: 'Not yet.', next: 'menu' }] },
    page_no: { text: '"A waterskin and a bad hip." She isn\'t going to say more today.', options: [{ text: 'Noted.', next: 'menu' }] },
    party: { text: '"Two riders, no dust." She means: nothing to report. "Where next?"', options: [{ text: 'Keep up.', exit: true }] },
  },
};

export const d_rd_teo: DialogueDef = {
  id: 'd_rd_teo', owner: 'npc_sh_07',
  start: [{ if: { all: [{ flag: 'teo_freed' }, { at: 'shale' }] }, node: 'home' }, { if: { flag: 'teo_freed' }, node: 'free' }, { node: 'intro' }],
  nodes: {
    home: {
      text: '"Home." He says it like a sum that finally came out. "Mags shouted for an hour and then fed me for two. I owe you a count, and I keep my counts." He is already behind the bar, where the books are.',
      options: [
        { id: 'teo.pass', text: 'The Tollmen\'s wall on the highway. Could you write a pass the gate would take?', if: { all: [{ quest: 'q_a1_tollhouse' }, { not: { item: 'k_pass_forged' } }, { not: { flag: 'th_passed' } }] }, next: 'pass' },
        { text: 'Keep your counts.', exit: true },
      ],
    },
    pass: { text: '"I kept Kessler\'s books and Kessler keeps the guild\'s waybills, because he can\'t read them and likes the paper." He takes a sheet from under the bar, and writes for a minute in a hand that isn\'t his. "Bearer and goods. Hold it like you\'ve had it for years."', effects: [{ give: 'k_pass_forged' }, { learn: 'teo_forged' }, { lead: 'l_pass_hands' }, { trust: { npc: 'npc_sh_07', by: 5 } }], options: [{ text: '(Take it.)', exit: true }] },
    intro: {
      text: 'You\'re not a Dog. You\'re — are you from Shale? Did Mags send you? Tell her I\'m fine. Tell her it\'s forty, not sixty, and I can prove it, I\'ve got the whole thing in my head —',
      effects: [{ learn: 'teo_seen' }],
      options: [
        { id: 'teo.mags', text: 'Mags sent me. She\'s running the bar alone.', if: { knows: 'promised_mags_teo' }, effects: [{ trust: { npc: 'npc_sh_07', by: 10 } }], next: 'mags' },
        { id: 'teo.how', text: 'How did you end up in here?', next: 'how', once: true },
        { id: 'teo.out', text: 'I\'ll get you out.', next: 'out' },
        bye,
      ],
    },
    mags: { text: 'He puts his face in his hands for a moment. "She\'ll kill me. She\'ll kill me and then she\'ll feed me. Tell her the count was right. The brother\'s debt was forty and it was never mine."', options: [{ text: 'How did you end up in here?', next: 'how' }, { text: 'I\'ll get you out.', next: 'out' }] },
    how: { text: '"Mags\'s brother ran salt east and owed the Dogs for passage. He died owing. The Dogs say debts are family. I say I\'m not family, I\'m a partner, and nobody out here can tell the difference." He laughs, badly. "I taught Perpetua to keep books. She likes me. It doesn\'t help."', effects: [{ learn: 'teo_debt_story' }], options: [{ text: 'I\'ll get you out.', next: 'out' }, bye] },
    out: { text: '"Kessler wants sixty. Perpetua would take forty, if you ask her like she\'s a person. And the lock on this gate is Jack\'s work, and Jack\'s work is bad — but there are eyes on it all day."', effects: [{ learn: 'cage_lock' }, { learn: 'teo_price' }], options: [bye] },
    free: { text: '"They let me out. They actually —" He stops, breathes. "I\'m going home. Walk with me as far as the road? I don\'t trust my legs."', effects: [{ set: 'teo_walking_home' }], options: [{ text: 'Go. I\'ll see you in Shale.', exit: true }] },
  },
};

export const d_rd_cage: DialogueDef = {
  id: 'd_rd_cage', owner: 'narrator',
  start: [{ if: { flag: 'teo_freed' }, node: 'open' }, { node: 'locked' }],
  nodes: {
    locked: {
      text: [{ if: NIGHT, text: 'The cage gate: a chain and a padlock that Sallow Jack made from two other padlocks. The fires are down; the nearest Dog is asleep against the pier.' }, { text: 'The cage gate: a chain and a padlock that Sallow Jack made from two other padlocks. Lute is watching you from the pens, and Brindle from the gate.' }],
      options: [
        { id: 'cage.pick', text: '(Pick the lock.)', if: NIGHT, check: { skill: 'security', dc: 40 }, effects: [{ set: 'teo_freed' }, { set: 'teo_freed_picked' }, { decision: { id: 'teo_freed_picked', text: 'You picked the cage open in the night and let Teo Marsh walk.' } }, { news: { tag: 'cage_opened', text: 'the trader walked out of the Dogs\' cage in the night', valence: -5, size: 5, at: 'rustdogs' } }, { xp: 40 }], next: 'picked', fail: 'pick_fail' },
        { id: 'cage.day', text: '(Try the lock anyway.)', if: { not: NIGHT }, effects: [{ set: 'rustdogs_hostile' }, { decision: { id: 'cage_in_daylight', text: 'You went at the cage lock in daylight, in front of the Dogs.' } }, { event: 'combat' }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
    picked: { text: 'The second padlock gives the way Jack\'s work gives. Teo is already standing.', options: [{ text: '(Go.)', exit: true }] },
    pick_fail: { text: 'Jack\'s work is bad, but it is bad in two places at once. You get the chain off and not the lock, and put it back before anyone turns over.', effects: [{ time: 20 }], options: [{ text: '(Leave it.)', exit: true }] },
    open: { text: 'The cage stands open. The cot still holds the shape of a man who counted to stay sane.', options: [{ text: '(Go.)', exit: true }] },
  },
};

export const d_rd_table: DialogueDef = {
  id: 'd_rd_table', owner: 'narrator',
  start: [{ if: HAVE_MAP, node: 'bare' }, { node: 'look' }],
  nodes: {
    look: {
      text: [{ if: NIGHT, text: 'Kessler\'s table, one lamp turned low. The folded paper under a shotgun shell. Kessler on the cot an arm\'s length away, breathing like a man with a list.' }, { text: 'Kessler\'s table. The folded paper under a shotgun shell, and Kessler at the table.' }],
      options: [
        { id: 'table.lift', text: '(Lift the shell, take the paper.)', if: NIGHT, check: { skill: 'stealth', dc: 45 }, effects: [...MAP_EFFECTS('lifted', 'You lifted the stranger\'s map from under Kessler\'s lamp while he slept.'), { news: { tag: 'map_stolen', text: 'something was taken from Kessler\'s coach in the night', valence: -10, size: 4, at: 'rustdogs' } }, { memory: { npc: 'npc_rd_01', tag: 'map_vanished', valence: -20, strength: 80 } }], next: 'lifted', fail: 'caught' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    lifted: { text: 'The shell rolls a quarter turn and stops. Kessler does not. You are out of the coach before you breathe.', options: [{ text: '(Go.)', exit: true }] },
    caught: { text: 'The shell rolls off the table. "Fair," Kessler says from the cot, without moving, and the shotgun is in his hands.', effects: [{ set: 'rustdogs_hostile' }, { decision: { id: 'caught_at_table', text: 'Kessler caught you at his table in the night.' } }, { event: 'combat' }], options: [{ text: '(—)', exit: true }] },
    bare: { text: 'Kessler\'s table. The shotgun shell, and nothing under it.', options: [{ text: '(Step back.)', exit: true }] },
  },
};

export const d_rd_perpetua: DialogueDef = {
  id: 'd_rd_perpetua', owner: 'npc_rd_05',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Dog-mother. Forty years in this camp; the dogs are mine, the races are mine, the memory\'s mine. The dogs say you\'re not afraid, which means you don\'t know enough yet.',
      options: [
        { id: 'perp.stranger', text: 'The man with the mask.', if: { any: [{ knows: 'kessler_met_stranger' }, { knows: 'wren_found_stranger' }, { knows: 'kessler_has_map' }] }, next: 'stranger', once: true },
        { id: 'perp.teo', text: 'Teo Marsh.', if: { all: [{ knows: 'teo_prisoner' }, { not: { flag: 'teo_freed' } }] }, next: 'teo' },
        { id: 'perp.races', text: 'The races?', next: 'races', once: true },
        { id: 'perp.pass', text: 'The Tollmen\'s wall. Can you write a pass the gate would take?', if: { all: [{ quest: 'q_a1_tollhouse' }, { not: { item: 'k_pass_forged' } }, { not: { flag: 'th_passed' } }] }, next: 'pass' },
        bye,
      ],
    },
    pass: {
      text: '"I kept the guild\'s books at Ninebridge for six years before I kept the Dogs\'. I know the paper and I know the hand." She holds out her own, palm up. "Thirty Tolls. Or nothing, if you\'re the one who got my bookkeeper out of that cage."',
      options: [
        { id: 'perp.pass.free', text: 'I got Teo out.', if: { flag: 'teo_freed' }, effects: [{ give: 'k_pass_forged' }, { learn: 'perpetua_forged' }, { trust: { npc: 'npc_rd_05', by: 5 } }], next: 'pass_done' },
        { id: 'perp.pass.pay', text: '(Pay. 30 Tolls)', if: { item: 'tolls', count: 30 }, effects: [{ take: 'tolls', count: 30 }, { give: 'k_pass_forged' }, { learn: 'perpetua_forged' }], next: 'pass_done' },
        { text: 'Not now.', exit: true },
      ],
    },
    pass_done: { text: 'She writes it on the back of a guild waybill she has had for six years, folds it twice, and gives it to you warm. "Hold it like it\'s yours. The sergeant looks at hands, not paper."', effects: [{ lead: 'l_pass_hands' }], options: [{ text: '(Take it.)', exit: true }] },
    stranger: { text: '"Wren brought him in across Biter. He paid Kessler in paper and me in a story, and the story was worth more." She waits to be asked.', options: [{ text: 'What story?', next: 'story' }, bye] },
    story: { text: '"That the city counts us. All of us, out here, under a road. That it has a list, and the paper is the list, and the names on it have dates." She shrugs. "I\'m sixty. My date\'s whatever it is. But I\'d like to know Kessler\'s."', effects: [{ learn: 'perpetua_story' }, { lead: 'l_city_counts' }], options: [bye] },
    teo: { text: '"Forty with me; sixty with Kessler, who adds the keeping. He taught me to keep books, that one, and then he kept them too well." She looks at the cage. "Pay me forty and I\'ll say I lost the count. I\'ve lost worse."', options: [{ id: 'perp.pay', text: '(Pay. 40 Tolls)', if: { item: 'tolls', count: 40 }, effects: [{ take: 'tolls', count: 40 }, { set: 'teo_freed' }, { set: 'teo_freed_paid' }, { decision: { id: 'teo_freed_perpetua', text: 'You paid Perpetua forty Tolls to lose the count on Teo Marsh\'s debt.' } }, { trust: { npc: 'npc_rd_05', by: 10 } }, { news: { tag: 'freed_teo', text: 'the Dog-mother let Teo Marsh go', valence: 10, size: 4, at: 'rustdogs' } }], next: 'paid' }, { text: 'Later.', exit: true }] },
    paid: { text: '"Lute. The trader\'s count is done." She doesn\'t look up from the dogs.', options: [bye] },
    races: { text: '"Race day\'s when I say. The Dogs settle things on it — who leads the next run, who eats first. Come back when I say, and bring something to lose."', effects: [{ learn: 'dog_races' }], options: [bye] },
  },
};

export const d_rd_jack: DialogueDef = {
  id: 'd_rd_jack', owner: 'npc_rd_07',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Sallow Jack. Everything shoots; nothing shoots straight. Brass is money, powder is money, a bolt rifle is a month\'s money. What are you carrying?',
      options: [
        { text: 'Let\'s see what you\'ve got.', effects: [{ event: 'barter' }], exit: true },
        { id: 'jack.tollmen', text: 'Who buys from you?', next: 'tollmen', once: true },
        { id: 'jack.bolt', text: 'You\'ve mentioned a bolt rifle.', if: { item: 'w_bolt308' }, next: 'bolt', once: true },
        bye,
      ],
    },
    tollmen: { text: '"Pike. Don\'t tell Kessler." He grins. "Kessler knows. Everyone sells to the Tollmen in the end; the trick is to be the last one."', effects: [{ learn: 'jack_sells_pike' }], options: [bye] },
    bolt: { text: '"That one." He looks at it the way other men look at water. "Kessler would give you the paper for it, I think. I\'d give you forty Tolls and my undying regret."', effects: [{ learn: 'bolt_is_valued' }], options: [bye] },
  },
};

export const d_rd_tank: DialogueDef = {
  id: 'd_rd_tank', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A road tanker\'s tank on blocks, SHALE WATER CO-OP still stencilled on the side under a painted dog. It is three-quarters full. A Dog with a revolver sits on the sandbags.',
      passives: [{ skill: 'mechanics', dc: 35, text: 'The outlet valve is a bad weld on a good fitting. It would take a wrench and a minute, and it would drain into sand.', effects: [{ learn: 'tank_valve' }] }],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

export const d_rd_chest: DialogueDef = {
  id: 'd_rd_chest', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: { text: 'Kessler\'s chest: a locker with a padlock, and on the lid in chalk a list of names with lines through most of them. The paper isn\'t in here. It\'s under the lamp.', effects: [{ learn: 'kessler_list' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};
