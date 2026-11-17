import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { QUESTS } from '../quests';
import { WREN_GUILD_NODES, WREN_GUILD_START } from './a3_fire';

/**
 * The Rust Dogs' overpass — Chapter One. The camp is a place, not a dungeon: you can walk in with your hands
 * out, and the map changes hands by coin, a wager, fear, terms, a theft, or a coup.
 * Wren Calloway's companion arc (U8) lives in her tree below: her camp, her leaving and returning, her romance.
 */

const bye = { text: 'Later.', exit: true };
const NIGHT = { hour: { from: 22, to: 5 } };
const HAVE_MAP = { flag: 'have_map' };
const MAP_EFFECTS = (how: string, text: string) => [{ give: 'k_map' }, { set: 'have_map' }, { set: `map_${how}` }, { decision: { id: `map_${how}`, text } }, { xp: 60 }];

/** Companions who can be at the player's side here (U7 interjections, U8 arcs). */
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';
const ODILE = 'npc_nb_03';
const CAMP: Cond = { flag: 'at_camp' };
const W_IN: Cond = { inParty: WREN };
const wApp = (gte: number): Cond => ({ approval: { companion: WREN, gte } });
const W = (by: number): Effect => ({ approval: { companion: WREN, by } });
const I = (by: number): Effect => ({ approval: { companion: ILYA, by } });
/** Wren's personal quest opens once it is registered in quests/index.ts (U8); until then her arc runs on flags alone. */
const OPEN_ROPE: Effect[] = QUESTS.q_comp_wren ? [{ quest: 'q_comp_wren', start: true }] : [];
/** Her red line is selling people; her floor is approval -20 (U8: story/U8_wren_SECRET.md). */
const W_SOLD: Cond = { flag: 'nb_sable_resold' };
const W_BLOCK: Cond = { flag: 'nb_sable_outcome', eq: 'sold_on' };
const W_FLOOR: Cond = { approval: { companion: WREN, lte: -20 } };
const W_KEPT: Cond = { all: [{ flag: 'nb_sable_kept' }, { item: 'k_sable_contract' }, { not: { flag: 'wren_kept_asked' } }] };
const W_FREED: Cond = { any: [{ flag: 'nb_sable_outcome', eq: 'freed' }, { flag: 'nb_sable_torn' }] };
const W_PAST_ROPE: Cond = { any: [{ flag: 'wren_bridge', eq: 'stood_down' }, { flag: 'bw_raid', eq: 'won' }] };
const W_ROM_ON: Cond = { any: ['yes', 'later_roof', 'roof', 'committed'].map((v) => ({ flag: 'wren_rom', eq: v })) };
const W_ROM_FREE: Cond = { any: [{ not: { flag: 'romance_partner' } }, { flag: 'romance_partner', eq: WREN }] };
const W_SOLD_SOMEONE: Cond = { any: [{ flag: 'cr_tillie', eq: 'sold' }, { flag: 'nb_lot7_sold' }, { flag: 'bw_static', eq: 'sold' }, { flag: 'bw_static', eq: 'concern' }, { flag: 'nb_rook_reported' }, { flag: 'hs_parts', eq: 'profit' }] };
const W_PROMISE: Effect[] = [{ set: 'wren_promise_sable' }, W(5), { decision: { id: 'wren_promise', text: 'You promised Wren you would buy the girl\'s paper back at Ninebridge.' } }];
const W_HONEST: Effect[] = [{ set: 'wren_s1_honest' }, W(3)];
const W_RAID: Effect[] = [{ set: 'wren_bridge', value: 'raid' }, W(5), { decision: { id: 'wren_bridge_raid', text: 'You told Wren you would take the bridge with her, on a night the two of you choose.' } }];
const W_ALONE: Effect[] = [{ set: 'wren_bridge', value: 'alone' }, W(-10), { decision: { id: 'wren_bridge_alone', text: 'Wren is going to take the bridge without you.' } }];
const W_ROOF: Effect[] = [{ set: 'wren_rom', value: 'roof' }, W(10), { decision: { id: 'wren_roof', text: 'You stayed up on the roof with Wren.' } }];
const W_COMMIT = (text: string): Effect[] => [{ set: 'wren_rom', value: 'committed' }, { set: 'romance_partner', value: WREN }, W(5), { decision: { id: 'wren_committed', text } }];
const W_GONE = (why: string, text: string): Effect[] => [{ leave: WREN }, { set: 'wren_left', value: why }, { decision: { id: 'wren_left', text } }];
const rest = { text: 'Rest.', exit: true };

export const d_rd_gate: DialogueDef = {
  id: 'd_rd_gate', owner: 'npc_rd_06',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Hold it. Hands out, palms up — that\'s the rule. Wren\'s rule. She\'s got you from the deck right now and she doesn\'t miss, so smile.',
      again: 'Hands out, palms up. Same rule as last time. Same deck, too.',
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
      again: 'Still not talking. Mostly. What?',
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
        { id: 'kessler.cut', text: 'Both. I\'m from the salt cut — Knock, under Cistern 9\'s door. A man died at that door.', next: 'cut' },
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
      again: 'What else? Free or priced, ask.',
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
      again: '"The paper." He has not moved. "Well?"',
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
        { id: 'kessler.rifle', text: '(Hand over the bolt rifle.)', if: { item: 'w_bolt308' }, effects: [{ take: 'w_bolt308' }, ...MAP_EFFECTS('rifle', 'You traded Corin\'s bolt rifle to Kessler for the stranger\'s map.')], next: 'handover' },
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
    again: { text: 'Back. Ask.', again: 'Sit, then. Or stand. You know the rule about prices.', options: [{ text: 'A few things.', next: 'menu' }] },
    after: { text: 'You\'ve got your paper. Don\'t read it here, and don\'t tell Vasha what it says if you ever find out.', again: '"Still in my camp?" He doesn\'t look up from the list. "Ask, then."', options: [{ text: 'A few things.', next: 'menu' }, { text: 'I\'ll be going.', exit: true }] },
    intro_or_coup: {
      text: [{ if: NIGHT, text: 'One lamp. The shotgun across his knees, where it always is. "Late," Kessler says. "Vasha sent you. She sends everyone, in the end."' }, { text: 'He looks at you, and then past you, to where Vasha stands by the fire. "Not yet, I think," he says, to nobody.' }],
      options: [
        { id: 'kessler.coup.draw', text: '(Draw on him.)', if: NIGHT, effects: [{ set: 'rd_coup' }, { decision: { id: 'rd_coup', text: 'You went for Kessler in his hall, with Vasha behind you.' } }, { event: 'fight' }], exit: true },
        { id: 'kessler.coup.warn', text: 'She did. I\'m telling you instead.', if: NIGHT, effects: [{ set: 'vasha_coup_agreed', value: false }, { set: 'warned_kessler' }, { trust: { npc: 'npc_rd_01', by: 20 }, }, { memory: { npc: 'npc_rd_02', tag: 'betrayed_coup', valence: -40, strength: 100 } }, { decision: { id: 'warned_kessler', text: 'You warned Kessler of Vasha\'s coup instead of carrying it out.' } }], next: 'warned' },
        { text: 'A few things.', next: 'menu' },
        { text: 'Not tonight.', exit: true },
      ],
    },
    warned: { text: 'He doesn\'t reach for the gun. "Fair," he says, after a long time. "Then you\'ll want the paper, and I\'ll want her out of my camp, and we\'ll both get one of those." He gives you the map.', interject: [{ companion: ILYA, text: '"Right," Ilya says, when the coach door has shut behind you, and for once it sounds like he means only the one thing. "Let her wait for it."', effects: [I(5)] }], effects: [...MAP_EFFECTS('warned', 'Kessler gave you the map after you warned him of the coup.'), { rep: { faction: 'rust_dogs', respect: 10 } }], options: [{ text: '(Put it away.)', exit: true }] },
  },
};

export const d_rd_vasha: DialogueDef = {
  id: 'd_rd_vasha', owner: 'npc_rd_02',
  start: [
    /** Ilya's hunt ends here (U8, q_comp_ilya): the Bridgeward raid (B3.12) puts her at the booth and sets `vasha_cornered`. */
    { if: { all: [{ flag: 'vasha_cornered' }, { not: { flag: 'vasha_fate' } }] }, node: 'cornered' },
    /** The booth's hand in Bridgeward once the season has closed (B3.12); at night she can be walked up to alone. */
    { if: { all: [{ at: 'md_bridgeward' }, { flag: 'bw_raid', eq: 'lost' }] }, node: 'bw_after' },
    { if: { at: 'md_bridgeward' }, node: 'bw_hand' },
    { if: { all: [{ dead: 'npc_rd_01' }, { flag: 'rd_coup' }] }, node: 'after_coup' },
    { if: { flag: 'warned_kessler' }, node: 'betrayed' },
    { if: { flag: 'vasha_coup_agreed', eq: true }, node: 'waiting' },
    { if: { flag: 'rd_vasha_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: '{name}. I\'ve heard it twice already today; it\'s a good name for a grave. Vasha. I run the part of this camp that bleeds; Kessler keeps the list.',
      interject: [{ companion: ILYA, text: 'Ilya has stopped dead at the edge of the firelight, the rifle slung, and does not unsling it. "Kade," he says. She looks at him for a long, pleased moment. "Strand. You got old." He says nothing at all. Outside, later, without being asked: "Not in her camp. Not with her people round her. Right."' }],
      effects: [{ set: 'rd_vasha_met' }, { learn: 'vasha_name' }],
      passives: [{ attr: 'senses', dc: 7, text: 'A pistol-grip submachine gun on a strap, and her thumb never leaves the safety.' }],
      options: [{ text: 'What do you want from me?', next: 'menu' }],
    },
    again: { text: 'Say it again. Your name. I like how it sounds when you\'re careful.', again: 'You keep coming back. People who keep coming back end up staying.', options: [{ text: 'What do you want?', next: 'menu' }] },
    menu: {
      text: 'Everything, eventually. Today I\'ll settle for a conversation.',
      again: 'Go on. I\'m enjoying this.',
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
    coup_yes: { text: '"After the fires. Don\'t be clever; clever is Kessler\'s."', interject: [{ companion: ILYA, text: '"You\'d give her his chair." Ilya says it outside, to the road, not to you. He says nothing else that night, and sleeps with the rifle.', effects: [I(-20)] }, { companion: 'npc_c9_03', text: '"She enjoys it," Tamsin says, very low, when Vasha has gone. "You gave it to the one who enjoys it."', effects: [{ approval: { companion: 'npc_c9_03', by: -10 } }] }], options: [{ text: '(Nod.)', exit: true }] },
    coup_no: { text: '"Then you\'re Kessler\'s. That\'s a shorter list than you think."', options: [{ text: 'We\'ll see.', exit: true }] },
    waiting: { text: [{ if: NIGHT, text: 'The fires are down. She tilts her head toward the coach. "Go on."' }, { text: 'After the fires. Not before.' }], options: [{ text: '(Go.)', exit: true }] },
    after_coup: {
      text: 'She steps over him without looking down and takes the paper from under the lamp. She holds it a moment, then holds it out. "A deal\'s a deal. I don\'t need to read it; I know what it says about me." Outside, the camp is very quiet.',
      interject: [{ companion: ILYA, text: 'Ilya watches her step over Kessler. "Right," he says, and for once it means only one thing, and the thing is not good.', effects: [I(-15)] }],
      effects: [...MAP_EFFECTS('coup', 'Kessler died in his hall. Vasha leads the Rust Dogs and gave you the map.'), { set: 'rd_leader', value: 'vasha' }, { rep: { faction: 'rust_dogs', fear: 25 } }, { news: { tag: 'kessler_dead', text: 'Kessler of the Rust Dogs was killed in his own hall; Vasha Kade leads now', valence: -25, size: 8, at: 'rustdogs' } }],
      options: [{ text: '(Take it.)', exit: true }],
    },
    betrayed: { text: 'She looks at you the way she looks at the pens. "You told him." Nothing else. The thumb is on the safety.', again: 'She doesn\'t speak. The thumb hasn\'t moved.', options: [{ text: '(Leave.)', exit: true }] },
    shale: { text: '"A well with people around it. I\'m going to take the well. The people can stay if they\'re useful."', effects: [{ learn: 'vasha_wants_shale' }], options: [{ text: 'Noted.', next: 'menu' }] },
    kessler: { text: '"He keeps a list of who he hasn\'t robbed. I keep count of who\'s hungry. Guess which list is longer."', options: [{ text: 'Noted.', next: 'menu' }] },
    raid: {
      text: '"The guild pays Kessler to leave the highway alone. The guild has never paid me." She looks east, where the wall is. "Four Dogs and me, at the verge, when you walk up to the gate. You start it. We finish it. The warehouse is ours, the road is yours, and the guild learns the Sallow has teeth." A beat. "Kessler won\'t know until it\'s done."',
      options: [
        { id: 'vasha.raid.yes', text: 'Done.', effects: [{ set: 'rd_raid_agreed' }, { decision: { id: 'rd_raid_agreed', text: 'You agreed to hit Tollhouse 9 with Vasha and four Dogs.' } }, { memory: { npc: 'npc_rd_02', tag: 'raid_agreed', valence: 15, strength: 80 } }, { lead: 'l_raid_plan' }], next: 'raid_yes' },
        { id: 'vasha.raid.no', text: 'No. Too many of them.', effects: [{ memory: { npc: 'npc_rd_02', tag: 'refused_raid', valence: -5 } }], next: 'raid_no' },
      ],
    },
    raid_yes: { text: '"We leave tonight. Walk the highway like you own it; we\'ll be in the salt. Don\'t pay them. If you pay them I\'ll know what you are."', interject: [{ companion: ILYA, text: '"Riding with Kade." Ilya counts the Dogs round her fire under his breath. "At the gate I stand where I can see her. Not next to her. Right."', effects: [I(-10)] }], options: [{ text: '(Go.)', exit: true }] },
    raid_no: { text: '"Then pay them. Everyone does."', options: [{ text: '(Leave.)', exit: true }] },

    // ---- Bridgeward, once the season has closed (B3.12): the booth's hand, waiting for the night the Dogs come back
    bw_hand: {
      text: [
        { if: { inParty: ILYA }, text: 'Vasha Kade, on the pavement by the toll booth, with a coil of new rope at her feet, the submachine gun on its strap and her thumb on the safety. She sees Ilya before she sees you, and is delighted. "Strand. And {name}. You\'ve both come all this way."' },
        { if: { flag: 'rd_vasha_met' }, text: '"{name}." Vasha Kade, on the pavement by the toll booth, with a coil of new rope at her feet. "I said people who keep coming back end up staying. Here we both are."' },
        { text: 'A woman on the pavement by the toll booth with a coil of new rope at her feet, a submachine gun on a strap and her thumb on its safety. "{name}," she says, as if she has been waiting all week to say it. "Vasha. Kade. I hold the rope here now."' },
      ],
      again: 'Vasha, by the booth, the rope coiled at her feet. "Say it again," she says. "Your name."',
      effects: [{ set: 'rd_vasha_met' }, { learn: 'vasha_name' }, { learn: 'vasha_bw_seen' }],
      interject: [{ companion: ILYA, text: 'Ilya stands very still, the way he stands on a ridge before he lies down on it. "Not here," he says, low, to you and to nobody else. "Not with the Rustmouths round her. At night, when they\'ve gone in. Right."' }],
      options: [
        { id: 'vasha.bw.who', text: 'Who hired you?', next: 'bw_who', once: true },
        { id: 'vasha.bw.wren', text: 'Wren.', if: { flag: 'wren_joined' }, next: 'bw_wren', once: true },
        { id: 'vasha.bw.read', text: 'You\'ve read your own forecast, and you like it.', next: 'bw_read', once: true },
        { id: 'vasha.bw.night', text: '(Wait until the Rustmouths have gone in, and walk up to the booth.)', if: { hour: { from: 0, to: 4 } }, effects: [{ set: 'vasha_cornered' }], next: 'cornered' },
        bye,
      ],
    },
    bw_who: { text: '"The woman in the clean coat. Tuesdays, ten to four." She means the house\'s agent at the booth. "House Vane holds the paper on this bridge, and the near end wants a hand on it when the Dogs come back for it. They will. It\'s written." She smiles. "I read it. I paid a guild factor in the Sallow a month\'s take to read it to me, and then I paid him again to read it twice."', effects: [{ learn: 'vasha_hired' }], options: [{ text: 'Noted.', next: 'bw_hand' }] },
    bw_wren: { text: '"The scout." Something that is almost fondness. "BRIDGEWARD — A ROPE — THE SCOUT. Mine says EXECUTIONER. I like mine better than she\'ll like hers." She nudges the coil with her boot. "If it\'s written, somebody holds the pen. I\'d rather it was me than some Rustmouth who\'d make a mess of the knot."', effects: [{ learn: 'vasha_wren_line' }], interject: [{ companion: WREN, text: '"Hold it, then," Wren says, from behind you, flat. "See how long you can."' }], options: [{ text: 'Noted.', next: 'bw_hand' }] },
    bw_read: { text: '"Everybody\'s somebody\'s forecast and doesn\'t know it. I know mine. That\'s the only difference between me and you." She tilts her head, interested. "Have you read yours, {name}? You have. I can see it on you. You didn\'t like it."', effects: [{ learn: 'vasha_read_hers' }], options: [{ text: 'Noted.', next: 'bw_hand' }] },
    bw_after: {
      text: 'Vasha, on the booth\'s step, with the rope gone from her feet. She doesn\'t look up at the beam. "It was written," she says. "I only held it." She looks at you, pleased and, under the pleasure, listening. "Somebody has to."',
      again: 'Vasha on the booth\'s step. She doesn\'t look up at the beam.',
      interject: [{ companion: ILYA, text: 'Ilya says nothing at all. He looks at the beam, and then at her, and then at the street, and counts the Rustmouths in it under his breath, and gets to four, and stops.' }],
      options: [
        { id: 'vasha.after.night', text: '(Wait until the Rustmouths have gone in, and walk up to the booth.)', if: { hour: { from: 0, to: 4 } }, effects: [{ set: 'vasha_cornered' }], next: 'cornered' },
        bye,
      ],
    },

    // ---- Ilya's hunt ends at the booth (U8; asleep until the Bridgeward raid sets `vasha_cornered`)
    cornered: {
      text: [
        { if: { inParty: ILYA }, text: 'Her back is to the toll booth and her thumb is on the safety, and she is smiling. "Strand." She says it warmly. "You took your time. Eleven years. I\'d have come sooner."' },
        { text: 'Her back is to the toll booth and her thumb is on the safety, and she is smiling. "{name}. I wondered which of you it would be."' },
      ],
      again: 'Vasha, the booth, the thumb on the safety. She is waiting to see what you are.',
      options: [
        { id: 'vasha.c.ilya', text: '(Let Ilya speak.)', if: { inParty: ILYA }, next: 'c_ilya' },
        { id: 'vasha.c.shoot', text: '(Shoot her.)', next: 'c_shot' },
        { id: 'vasha.c.go', text: '(Lower your gun.) Go.', next: 'c_go' },
      ],
    },
    c_ilya: {
      text: '"Agi Strand," Ilya says. "Shale. The medicine store, eleven springs back. Two girls in it." "I remember the store." Vasha tilts her head. "Fat store. Dark night. A good wash to come up." She is enjoying this, and she is also, you see, listening. "You want me to know why. Go on, then."',
      again: 'Vasha is still listening. So is the rifle.',
      options: [
        { id: 'vasha.c.letter', text: '(Give her the letter Ilya carries.)', if: { flag: 'ilya_letter_read' }, next: 'c_letter' },
        { id: 'vasha.c.nod', text: '(Nod to Ilya.)', next: 'c_fires' },
        { id: 'vasha.c.stop', text: '(Put your hand on Ilya\'s rifle.) Not like this.', next: 'c_stopped' },
      ],
    },
    c_letter: {
      text: 'She reads it twice. "By the local instrument." She laughs, and it is not her laugh. "I picked that night. I sat on the rim and watched the wind and picked it." She lets the paper go and the wind takes it along the deck. "It was written." For the first time since you have known her name, she sounds like nobody in particular.',
      again: 'The letter is somewhere along the deck. She hasn\'t moved.',
      effects: [{ set: 'vasha_knows_why' }],
      options: [
        { id: 'vasha.c.nod2', text: '(Nod to Ilya.)', next: 'c_fires' },
        { id: 'vasha.c.carry', text: '(Put your hand on Ilya\'s rifle.) She knows now. Let her carry it.', if: { approval: { companion: ILYA, gte: 40 } }, next: 'c_carry' },
        { id: 'vasha.c.carry.low', text: '(Put your hand on Ilya\'s rifle.) She knows now. Let her carry it.', if: { approval: { companion: ILYA, lte: 39 } }, next: 'c_fires_anyway' },
      ],
    },
    c_fires: {
      text: '"Right," Ilya says. One round. He watches her fall against the booth a second longer than anyone else would, and then he stops counting.',
      again: 'The booth. Ilya, not counting.',
      effects: [{ set: 'vasha_fate', value: 'ilya' }, { set: 'vasha_dead' }, I(10), { decision: { id: 'vasha_fate', text: 'Ilya Strand shot Vasha Kade at the Bridgeward booth.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    c_fires_anyway: {
      text: 'He lifts your hand off the rifle with his ruined one, gently, the way you move a branch out of a path. "Not your round to hold," he says. "Right." One round.',
      again: 'The booth. Ilya, not counting.',
      effects: [{ set: 'vasha_fate', value: 'ilya' }, { set: 'vasha_dead' }, I(-5), { decision: { id: 'vasha_fate', text: 'Ilya Strand shot Vasha Kade at the Bridgeward booth, over your hand.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    c_carry: {
      text: 'Ilya looks at your hand on the rifle for a long time. Then at her. "Every day," he tells her. "Every day you\'re alive you\'ll know what you were for." He lowers the rifle. "That\'s longer than a round. Right." Vasha doesn\'t move from the booth until you have both gone.',
      again: 'Vasha, at the booth, not moving.',
      effects: [{ set: 'vasha_fate', value: 'spared_why' }, { decision: { id: 'vasha_fate', text: 'Vasha Kade read the city\'s letter at the booth, and Ilya let her live with it.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    c_stopped: {
      text: 'Ilya looks at your hand on the rifle, and at her, and at you, and something in his face shuts. "Without the why," he says. "For nothing." He takes your hand off the rifle and walks away along the deck after her, and doesn\'t look back, and Vasha laughs.',
      again: 'Nobody at the booth now. Ilya went the way she went.',
      effects: [{ set: 'vasha_fate', value: 'spared' }, { leave: ILYA }, { set: 'ilya_left', value: 'spared' }, I(-30), { decision: { id: 'vasha_fate', text: 'You stopped Ilya\'s rifle and let Vasha Kade walk, without the why. Ilya went after her alone.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    c_shot: {
      text: [
        { if: { inParty: ILYA }, text: 'One round, yours. She falls against the booth. Ilya lowers the rifle he hadn\'t yet raised, and stands there.' },
        { text: 'One round. She falls against the booth, still smiling, as if she had read it somewhere.' },
      ],
      again: 'The booth, and what is against it.',
      interject: [{ companion: ILYA, text: '"You took it." Not angry, or not only. "I\'d have done it worse. Right."', effects: [I(-10)] }],
      effects: [{ set: 'vasha_fate', value: 'player' }, { set: 'vasha_dead' }, { decision: { id: 'vasha_fate', text: 'You shot Vasha Kade at the Bridgeward booth.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
    c_go: {
      text: '"Huh." She pushes off the booth. "Nobody\'s ever let me go. I\'ll have to work out what that\'s for." She walks off along the deck, slowly, so you can watch her do it.',
      again: 'The deck, empty the way she went.',
      interject: [{ companion: ILYA, text: 'Ilya watches her go. Then he walks after her, and you understand that you are not invited.' }],
      effects: [{ set: 'vasha_fate', value: 'spared' }, { leave: ILYA }, { set: 'ilya_left', value: 'spared' }, { decision: { id: 'vasha_fate', text: 'You let Vasha Kade walk away from the Bridgeward booth.' } }],
      options: [{ text: '(Go.)', exit: true }],
    },
  },
};

export const d_rd_wren: DialogueDef = {
  id: 'd_rd_wren', owner: 'npc_rd_03',
  start: [
    // At a fire (U8): her leaving comes before anything else she would say.
    { if: { all: [W_IN, CAMP, W_KEPT] }, node: 'c_kept' },
    { if: { all: [W_IN, CAMP, W_SOLD] }, node: 'c_sold' },
    { if: { all: [W_IN, CAMP, W_BLOCK] }, node: 'c_block' },
    { if: { all: [W_IN, CAMP, W_FLOOR] }, node: 'c_floor' },
    WREN_GUILD_START,
    { if: { all: [W_IN, CAMP, W_ROM_ON, { approval: { companion: WREN, lte: 30 } }] }, node: 'c_rom_end' },
    { if: { all: [W_IN, CAMP] }, node: 'camp' },
    { if: W_IN, node: 'party' },
    { if: { flag: 'wren_left' }, node: 'left' },
    { if: { all: [{ flag: 'wren_joined' }, { any: [W_SOLD, W_BLOCK] }] }, node: 'gone_away' },
    { if: { flag: 'wren_joined' }, node: 'waiting' },
    { if: { all: [{ flag: 'wren_deal' }, NIGHT, { not: HAVE_MAP }] }, node: 'steal_now' },
    { if: { flag: 'wren_deal' }, node: 'deal_wait' },
    { if: { flag: 'rd_wren_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'Don\'t stand on the skyline. — You\'re the salt-cut one. I found him, you know. Your old man from the salt cut. Out past the west track, sitting against a post with his boots off, talking to the boots.',
      effects: [{ set: 'rd_wren_met' }],
      options: [{ text: 'What did he say?', next: 'said' }, { text: 'You brought him in?', next: 'brought' }],
    },
    said: { text: '"That he\'d been shot by people who were paid to shoot him, and that he\'d rather give the paper to a thief than to a bank. He meant Kessler. He meant it as a compliment."', effects: [{ learn: 'wren_found_stranger' }, { lead: 'l_wren_found' }], options: [{ text: 'You brought him in?', next: 'brought' }, { text: 'More.', next: 'menu' }] },
    brought: { text: '"Across a dog. He weighed nothing." She looks west. "I wanted to let him go east, where he was pointed. Kessler wanted the paper. Kessler got the paper, the old man got water, and he walked west to die on your step. Everybody got what they wanted. That\'s the camp."', effects: [{ learn: 'wren_wanted_release' }, { trust: { npc: 'npc_rd_03', by: 5 } }], options: [{ text: 'More.', next: 'menu' }] },
    again: { text: 'Skyline. — What?', again: 'West track\'s quiet. What?', options: [{ text: 'A few things.', next: 'menu' }] },
    menu: {
      text: 'Ask. Quietly.',
      again: 'What else. Keep it low.',
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
    deal_wait: { text: 'After the fires. Not before.', again: 'Still not after the fires. Go and be seen somewhere else.', options: [{ text: '(Wait.)', exit: true }] },
    steal_now: {
      text: '"Wait here. Watch the road for me — it\'s the one thing nobody else does." She is gone an hour, and comes back with the paper and no expression at all. "Kessler sleeps like a man with a list. Let\'s go, before he reads it."',
      effects: [...MAP_EFFECTS('stolen', 'Wren stole the stranger\'s map from Kessler\'s hall. She leaves with you.'), { time: 60 }, { join: 'npc_rd_03' }, { set: 'wren_joined' }, { approval: { companion: 'npc_rd_03', by: 10 } }, { news: { tag: 'map_stolen', text: 'something was taken from Kessler\'s coach in the night', valence: -10, size: 4, at: 'rustdogs' } }, { memory: { npc: 'npc_rd_01', tag: 'map_vanished', valence: -20, strength: 80 } }],
      options: [{ text: 'Let\'s go.', exit: true }],
    },
    exodus: {
      text: '"…She said that." Wren is very still. "If it\'s true, I bring Brindle, and Sprat, and whoever else is tired of sleeping under a road, and the paper, and Kessler keeps his list and his camp. Tonight. If it isn\'t true, I\'ll know, and so will Vey."',
      effects: [...MAP_EFFECTS('exodus', 'Wren took the map and her people to Shale on your word that the sheriff would have them.'), { set: 'wren_exodus' }, { join: 'npc_rd_03' }, { set: 'wren_joined' }, { approval: { companion: 'npc_rd_03', by: 15 } }, { news: { tag: 'dogs_exodus', text: 'some of the Rust Dogs walked into Shale and asked for the sheriff', valence: 10, size: 7, at: 'shale' } }],
      options: [{ text: 'It\'s true.', exit: true }],
    },
    leaving: { text: '"Brindle talks." Not angry. "Everyone\'s leaving; most people just do it by dying. I\'d rather walk." She doesn\'t say where.', effects: [{ learn: 'wren_wants_out' }], options: [{ text: 'Noted.', next: 'menu' }] },
    page: { text: 'She takes a folded page from inside her hood: a leaf torn from a notebook, the same tight marks. "He was tearing it up to burn it when I found him. This one he dropped. I can\'t read it. Can you?"', effects: [{ give: 'k_notebook_page' }, { learn: 'wren_page' }, { lead: 'l_wren_page' }], options: [{ text: 'Not yet.', next: 'menu' }] },
    page_no: { text: '"A waterskin and a bad hip." She isn\'t going to say more today.', options: [{ text: 'Noted.', next: 'menu' }] },
    party: {
      text: [{ if: { at: 'md_bridgeward' }, text: 'She has stopped on the pavement across from the boarded garage and is not looking at it. "Dogs had that." It is all she says for a while. "I was six. Perpetua carried me down the stair the night the Rustmouths took the bridge, and Kessler carried the cache key, and Kibet stayed because of his knees." She looks at it now. "He\'s still in there. I can smell the stove."' }, { text: '"Two riders, no dust." She means: nothing to report. "Where next?"' }],
      again: 'She is watching the road behind you, the way she does.',
      options: [
        { id: 'wren.haunt', text: 'Show me the garage.', if: { all: [{ at: 'md_bridgeward' }, { not: { knows: 'bw_wren_haunt' } }] }, next: 'haunt' },
        { id: 'wren.p.tower', text: 'The girl at the tower. What she said.', if: { all: [{ knows: 'bw_wren_foretold' }, { not: { flag: 'wren_s3' } }, { not: { seen: 'wren.p.tower' } }] }, next: 'p_tower' },
        { id: 'wren.p.wait', text: 'Wait here for me.', effects: [{ leave: WREN }], exit: true, repeat: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    haunt: { text: '"The cache is under the bench by the south wall; Kibet sits on it, which is the point of Kibet. The key was Kessler\'s and went with Kessler." She breathes out. "Kibet will open it for me. He won\'t open it for you. Let me do the talking, for once."', effects: [{ learn: 'bw_wren_haunt' }, { lead: 'l_bw_haunt' }, { approval: { companion: 'npc_rd_03', by: 5 } }], options: [{ text: 'Go on, then.', exit: true }] },
    p_tower: { text: '"At a fire." She doesn\'t slow down. "Not on a street with ears on it."', options: [{ text: 'Keep up.', exit: true }] },
    waiting: {
      text: '"Back." She is on her feet before you reach her, pack already on. "Where?"',
      again: 'Wren, on her feet, pack on.',
      options: [{ id: 'wren.wait.go', text: 'We\'re going.', effects: [{ join: WREN }], exit: true, repeat: true }, { text: 'Wait here a while longer.', exit: true }],
    },

    // ---------------------------------------------------------------- at a fire (U8)
    camp: {
      text: [
        { if: { approval: { companion: WREN, lte: 4 } }, text: 'Wren sits on the far side of the fire with her back half turned to you, watching the dark. With Wren that is a whole sentence.' },
        { if: W_PAST_ROPE, text: 'She sits this side of the fire, close enough to share it. "Wind\'s dropping. Nobody on the track." For once she sounds as if she isn\'t waiting for anyone.' },
        { text: 'She sits where she can see past the fire, never into it. "Fire blinds you for an hour after. Sit this side."' },
      ],
      again: 'Wren has moved round the fire so she can see the dark, and waits.',
      options: [
        // her arc, one conversation a stage
        { id: 'wren.c.s1', text: '(Sit with her. Don\'t ask.)', if: { all: [{ not: { seen: 'wren.c.s1' } }, { not: { flag: 'nb_sable_settled' } }, wApp(5)] }, next: 's1' },
        { id: 'wren.c.s2', text: 'Sable.', if: { all: [W_FREED, { not: { flag: 'wren_promise_sable' } }, { not: { flag: 'wren_s2' } }, wApp(25)] }, next: 's2' },
        { id: 'wren.c.s2p', text: 'Sable. I said I would.', if: { all: [W_FREED, { flag: 'wren_promise_sable' }, { not: { flag: 'wren_s2' } }, wApp(25)] }, next: 's2p' },
        { id: 'wren.c.s3', text: 'The girl at the tower said your name.', if: { all: [{ knows: 'bw_wren_foretold' }, { not: { flag: 'wren_s3' } }, wApp(35)] }, next: 's3' },
        { id: 'wren.c.s3low', text: 'The girl at the tower said your name.', if: { all: [{ knows: 'bw_wren_foretold' }, { not: { flag: 'wren_s3' } }, { approval: { companion: WREN, lte: 34 } }] }, next: 's3_low' },
        { id: 'wren.c.s4', text: 'You slept through. I\'ve never seen you do that.', if: { all: [W_PAST_ROPE, { not: { seen: 'wren.c.s4' } }, wApp(45)] }, next: 's4' },
        // romance: she asks, every step, and any answer is allowed
        { id: 'wren.c.r1', text: '(Sit beside her, this side of the fire.)', if: { all: [{ flag: 'wren_s2' }, { not: { flag: 'wren_rom' } }, wApp(40), W_ROM_FREE] }, next: 'r1' },
        { id: 'wren.c.r1b', text: '(Sit beside her again.)', if: { all: [{ flag: 'wren_rom', eq: 'later' }, { flag: 'wren_s3' }, wApp(40), W_ROM_FREE] }, next: 'r1b' },
        { id: 'wren.c.r2', text: '(She nods at the roofline above the camp. Follow her up.)', if: { all: [{ flag: 'wren_rom', eq: 'yes' }, { flag: 'wren_s3' }, wApp(50), W_ROM_FREE] }, next: 'r2' },
        { id: 'wren.c.r2b', text: '(She has gone up on a roof again. Climb up after her.)', if: { all: [{ flag: 'wren_rom', eq: 'later_roof' }, { seen: 'wren.c.s4' }, wApp(50), W_ROM_FREE] }, next: 'r2b' },
        { id: 'wren.c.r3', text: 'What are we, Wren?', if: { all: [{ flag: 'wren_rom', eq: 'roof' }, { seen: 'wren.c.s4' }] }, next: 'r3' },
        // the others at the fire
        { id: 'wren.c.ilya', text: '(Ilya is cleaning his rifle across the fire. Wren is watching him do it.)', if: { all: [{ inParty: ILYA }, { not: { seen: 'wren.c.ilya' } }] }, next: 'x_ilya' },
        { id: 'wren.c.odile', text: '(Odile is reading by the fire. Wren has not sat down.)', if: { all: [{ inParty: ODILE }, { flag: 'nb_sable_settled' }, { not: { seen: 'wren.c.odile' } }] }, next: 'x_odile' },
        // lighter talk
        { id: 'wren.c.roads', text: 'How do you read a road?', if: { not: { seen: 'wren.c.roads' } }, next: 't_roads' },
        { id: 'wren.c.goggles', text: 'You never take the goggles off.', if: { not: { seen: 'wren.c.goggles' } }, next: 't_goggles' },
        { id: 'wren.c.kessler', text: 'Kessler.', if: { all: [{ not: { flag: 'rd_coup' } }, { not: { seen: 'wren.c.kessler' } }] }, next: 't_kessler' },
        { id: 'wren.c.coup', text: 'Kessler.', if: { all: [{ flag: 'rd_coup' }, { not: { seen: 'wren.c.coup' } }] }, next: 't_coup' },
        { id: 'wren.c.page', text: 'The old man\'s page. Why did you keep it?', if: { all: [{ knows: 'wren_page' }, { not: { seen: 'wren.c.page' } }] }, next: 't_page' },
        { id: 'wren.c.shale', text: 'What do you make of Shale?', if: { all: [{ flag: 'visited_shale' }, { not: { seen: 'wren.c.shale' } }] }, next: 't_shale' },
        { id: 'wren.c.city', text: 'Meridian.', if: { all: [{ flag: 'a2_precinct_done' }, { not: { seen: 'wren.c.city' } }] }, next: 't_city' },
        rest,
      ],
    },

    // stage 1 — the terms (Act 1): she tells you about the girl
    s1: {
      text: 'For a long while she says nothing, which is how Wren decides things. Then she picks a burr out of the cuff of her glove. "You kept the terms. Didn\'t ask once." She turns the burr over. "So. The girl."',
      again: 'Wren turns the burr over, and waits for you to be ready.',
      effects: [{ set: 'wren_s1' }],
      options: [{ id: 'wren.s1.on', text: 'Go on.', next: 's1_block' }],
    },
    s1_block: {
      text: '"There\'s a block at Ninebridge where the guild sells paper on people. Debt. Whoever holds the paper holds the person, till it clears." She flicks the burr into the fire. "Our brother signed for a bike and rode it east. The paper didn\'t care who signed. It went to her."',
      again: 'She is watching the fire take the burr.',
      effects: [{ learn: 'wren_told_girl' }],
      options: [
        { id: 'wren.s1.why', text: 'Why haven\'t you gone for her yourself?', next: 's1_why' },
        { id: 'wren.s1.promise', text: 'Then we buy her paper back. I promise you.', effects: W_PROMISE, next: 's1_promise' },
        { id: 'wren.s1.honest', text: 'I won\'t promise what I can\'t pay for. I\'ll stand at that block with you.', effects: W_HONEST, next: 's1_honest' },
        { id: 'wren.s1.cold', text: 'That\'s your debt, not mine.', effects: [W(-5)], next: 's1_cold' },
      ],
    },
    s1_why: {
      text: '"Nineteen Tolls." She shows you a twist of cloth with coins in it. "The block opens at sixty. And a Dog who walks onto the guild\'s bridge is a Dog the guild sells next." She puts the cloth away. "You\'re going east anyway. The old man\'s road goes over that bridge."',
      again: 'The twist of cloth is back inside her jacket.',
      options: [
        { id: 'wren.s1.promise2', text: 'Then we buy her paper back. I promise you.', effects: W_PROMISE, next: 's1_promise' },
        { id: 'wren.s1.honest2', text: 'I won\'t promise what I can\'t pay for. I\'ll stand at that block with you.', effects: W_HONEST, next: 's1_honest' },
        { id: 'wren.s1.cold2', text: 'That\'s your debt, not mine.', effects: [W(-5)], next: 's1_cold' },
      ],
    },
    s1_promise: { text: '"Don\'t — " She stops herself. "Don\'t say it unless it\'s true. I keep mine to the letter. I hold people to theirs the same way, and I don\'t let go." She looks at you over the fire for a long time. "…Fine. It\'s said."', again: '"It\'s said," Wren repeats, to the fire, as if filing it.', options: [rest] },
    s1_honest: { text: '"Good." Something in her shoulders lets go a notch. "Everybody promises. Kessler promised. Nobody\'s ever told me what they could pay for before." She gets up to walk the edge of the light. "Stand at the block, then. That\'s plenty."', again: 'She is walking the edge of the firelight, the way she does.', options: [rest] },
    s1_cold: { text: '"No," she agrees, which is worse than an argument. "It isn\'t." She goes back to watching the dark past the fire, and you get nothing else from her tonight.', again: 'Her back, and the dark.', options: [rest] },

    // stage 2 — the block (Ninebridge, the girl freed)
    s2: {
      text: 'She has a scrap of paper and is tearing it, in half and in half again, without looking at it. "Four pieces. She\'s torn things in four since she was four." She feeds the pieces to the fire one at a time.',
      again: 'The last of the four pieces curls up in the fire.',
      effects: [{ set: 'wren_s2' }],
      options: [{ id: 'wren.s2.how', text: 'How did you lose her?', next: 's2_burn' }],
    },
    s2p: {
      text: '"You said it." She has a scrap of paper and is tearing it in four, without looking. "Then you did it. To the letter." She feeds the pieces to the fire one at a time. "I don\'t know what to do with that yet. I\'ll work it out."',
      again: 'The last of the four pieces curls up in the fire.',
      effects: [{ set: 'wren_s2' }, W(10), { decision: { id: 'wren_promise_kept', text: 'You kept your promise to Wren at the Ninebridge block, to the letter.' } }],
      options: [{ id: 'wren.s2p.how', text: 'How did you lose her?', next: 's2_burn' }],
    },
    s2_burn: {
      text: 'She turns her left hand over to the light: the old burn across the palm and fingers, the shape of a grip. "A stove-truck went up on the Flats with her in the back. I got her out by the arm." She closes the hand. "She\'s got the other half of this. Then I went scouting for Kessler, because he paid, and left her with our brother, because he was family." A beat. "You saw what family did."',
      again: 'Her burned hand is closed on her knee.',
      effects: [{ learn: 'wren_burn_story' }],
      options: [
        { id: 'wren.s2.feed', text: 'You went scouting to feed her.', next: 's2_true' },
        { id: 'wren.s2.west', text: 'She said she was going west. To Shale.', next: 's2_west' },
      ],
    },
    s2_true: {
      text: '"That\'s the story." She says it without heat. "The true one is I wanted out of the Flats more than I wanted to keep her, and Kessler was out." She looks at the fire. "I don\'t say it twice."',
      again: 'She has said it once.',
      effects: [{ learn: 'wren_left_for_out' }, { trust: { npc: WREN, by: 5 } }],
      options: [{ id: 'wren.s2.west2', text: 'She said she was going west. To Shale.', next: 's2_west' }],
    },
    s2_west: {
      text: '"Where there might be — " She doesn\'t finish it. "Shale. Brindle\'s there. Vey\'s there. Doors that lock from the inside." She thinks. "She told me to come and buy her myself. You did it instead."',
      again: 'She is thinking about doors.',
      options: [
        { id: 'wren.s2.go', text: 'Go to her. I\'ll manage the road.', effects: [W(5), { set: 'wren_offered_shale' }], next: 's2_go' },
        { id: 'wren.s2.stay', text: 'I\'d rather you stayed.', effects: [W(3)], next: 's2_stay' },
        { id: 'wren.s2.owe', text: 'Then you owe me.', effects: [W(-5)], next: 's2_owe' },
      ],
    },
    s2_go: { text: '"No." Kind, and certain. "She doesn\'t want me yet. She wants a door that locks from her side, and a year of nobody owning anything of hers." She looks east. "And the old man\'s road isn\'t walked. I\'ll go to Shale when it is."', again: 'She is looking east.', options: [rest] },
    s2_stay: { text: '"Then I stay." Just that. She settles a little nearer the fire than she usually sits.', again: 'She is nearer the fire than usual.', options: [rest] },
    s2_owe: { text: '"I know what I owe." Flat. "You didn\'t need to say it out loud. Now it\'s a number." She turns away from the fire.', again: 'Her back, and the dark.', options: [rest] },

    // stage 3 — the rope (Meridian): her name on the list, and the bridge
    s3: {
      text: [
        { if: { flag: 'wren_heard_rope' }, text: '"I heard her." She doesn\'t look up. "Calloway. Wren. Bridgeward. The rope. Before the Long Night." She says it in the girl\'s flat voice, exactly, the way she says a route back to herself to keep it.' },
        { text: 'You tell her what the girl at the tower said, all of it, in the order it was said. She listens the way she listens to a road: once, all the way through, and then it\'s hers. "The rope," she says. "Before the Long Night."' },
      ],
      again: 'She says the line again under her breath, the way she says a road to keep it.',
      effects: [...OPEN_ROPE, { learn: 'wren_knows_rope' }, { set: 'wren_s3' }],
      options: [{ id: 'wren.s3.on', text: 'What do you want to do?', next: 's3_bridge' }],
    },
    s3_bridge: {
      text: '"Take it." No pause at all. "The bridge. Kessler said the Dogs would go back for it when they were a crew again; it\'s on that garage wall in a six-year-old\'s burning." She looks at you. "The city wants a Dog hanging off that booth by the Long Night. I want the Dogs on that bridge on a night I pick. Same bridge. Different rope." A beat. "I\'m asking you to stand there."',
      again: '"I\'m asking," she says again, and waits.',
      options: [
        { id: 'wren.s3.take', text: 'Then we take it. On a night we pick, not the one it wrote.', effects: W_RAID, next: 's3_take' },
        { id: 'wren.s3.down', text: 'Don\'t. That\'s the rope\'s road, and you know it.', check: { skill: 'speech', dc: 50, mods: [{ if: { flag: 'bw_three_crews' }, dc: -15, why: 'the chain is split three ways already: there is nothing left to take' }, { if: wApp(60), dc: -10, why: 'she trusts you further than she trusts the city' }] }, effects: [{ set: 'wren_bridge', value: 'stood_down' }, { decision: { id: 'wren_bridge_down', text: 'You talked Wren off the bridge the city wrote for her.' } }], next: 's3_down', fail: 's3_down_no' },
        { id: 'wren.s3.yours', text: 'It\'s your name. Your call.', next: 's3_yours' },
      ],
    },
    s3_take: { text: '"Good." She lets out a breath she has been holding since the tower. "Not yet. When the chain\'s worth taking and the Rustmouths are looking the other way. I\'ll know the night. So will you."', again: 'She is already counting nights.', options: [rest] },
    s3_down: { text: 'She is quiet for a long time. "If I don\'t go," she says, "it isn\'t my bridge. It\'s just a bridge." She tests that the way she tests a plank before she puts her weight on it. It holds. "Fine. The Dogs stay a crew in the Sallow. Somebody else can be the example." She doesn\'t thank you. She does sit closer.', again: 'She is sitting closer than she was.', options: [rest] },
    s3_down_no: {
      text: '"No." Not angry. "You\'re asking me to let it be the city\'s bridge. I\'ve been letting things be other people\'s since I was six." She waits. "With you or without you."',
      again: '"With you or without you," she says again.',
      options: [
        { id: 'wren.s3.with', text: 'With me, then.', effects: W_RAID, next: 's3_take' },
        { id: 'wren.s3.without', text: 'Without me.', effects: W_ALONE, next: 's3_alone' },
      ],
    },
    s3_yours: {
      text: '"It is." She seems surprised to be handed it. "Then it\'s the bridge." She looks at you. "Will you be there?"',
      again: '"Will you be there?" she asks again.',
      options: [
        { id: 'wren.s3.with2', text: 'I\'ll be there.', effects: W_RAID, next: 's3_take' },
        { id: 'wren.s3.without2', text: 'No. Not for this.', effects: W_ALONE, next: 's3_alone' },
      ],
    },
    s3_alone: { text: '"Fair." It is Kessler\'s word; she hears herself use it, and looks annoyed. "I\'ll pick the night. I won\'t tell you which."', again: 'She doesn\'t look at you.', options: [rest] },
    s3_low: {
      text: '"I heard." Flat. "I\'ll see to the bridge." She doesn\'t say how, and she doesn\'t ask you for anything.',
      again: 'She is not going to say more about the bridge tonight.',
      effects: [...OPEN_ROPE, { learn: 'wren_knows_rope' }, { set: 'wren_s3' }, { set: 'wren_bridge', value: 'alone' }],
      options: [
        { id: 'wren.s3low.ask', text: 'Not alone. Let me stand there with you.', check: { skill: 'speech', dc: 55, mods: [{ if: W_FREED, dc: -10, why: 'you got the girl\'s paper out of the guild\'s hands' }] }, next: 's3_bridge', fail: 's3_low_no' },
        rest,
      ],
    },
    s3_low_no: { text: '"No." She doesn\'t explain. That\'s the explanation.', again: 'Her back, and the dark.', options: [rest] },

    // stage 4 — after (past the rope: she stood down, or the Dogs hold the bridge)
    s4: {
      text: [
        { if: { flag: 'wren_rom', eq: 'roof' }, text: '"I slept." She says it like a sighting, and then, because it\'s you: "No rope. Nothing in it at all. First time since I was twelve."' },
        { text: '"I slept." She says it like a sighting. "All night. I don\'t, usually. There\'s a thing I see when I sleep, and it wasn\'t there."' },
      ],
      again: 'She keeps checking for it, the way you check a pocket.',
      effects: [{ set: 'wren_s4' }, { learn: 'wren_slept' }],
      options: [{ id: 'wren.s4.after', text: 'What will you do, after all this?', next: 's4_after' }],
    },
    s4_after: {
      text: '"After." She tries the word. "Nobody\'s asked me that like there\'d be one." She draws in the dirt with a stick: a road, a town, a bridge. "Shale\'s got the girl, and doors. The bridge has the Dogs, if they hold it. The road has you." She looks up. "Say what you think. I\'ll still choose."',
      again: 'The road, the town and the bridge are still drawn in the dirt.',
      options: [
        { id: 'wren.s4.shale', text: 'Shale. Be where she is.', effects: [{ set: 'wren_after', value: 'shale' }, W(3)], next: 's4_shale' },
        { id: 'wren.s4.bridge', text: 'The bridge. The Dogs need somebody who keeps her word.', if: { flag: 'bw_raid', eq: 'won' }, effects: [{ set: 'wren_after', value: 'bridge' }, W(3)], next: 's4_bridge' },
        { id: 'wren.s4.road', text: 'The road. With me.', effects: [{ set: 'wren_after', value: 'road' }, W(3)], next: 's4_road' },
        { id: 'wren.s4.yours', text: 'That\'s yours to say, Wren.', effects: [{ set: 'wren_after', value: 'shale' }, W(5)], next: 's4_yours' },
      ],
    },
    s4_shale: { text: '"Shale." She rubs out the bridge with her boot. "I\'ll knock. She can open it or not. That\'s hers."', again: 'Only the road and the town are left in the dirt.', options: [rest] },
    s4_bridge: { text: '"Somebody has to keep the count." She rubs out the town, then, after a moment, draws it back in, smaller. "I\'ll send for her. She can say no."', again: 'The bridge, and a small town beside it, in the dirt.', options: [rest] },
    s4_road: { text: '"The road." She looks at you a while. "When it\'s walked, I\'ll go and knock on a door in Shale. Till then — " She doesn\'t finish. She doesn\'t need to.', again: 'She has drawn the road a little longer.', options: [rest] },
    s4_yours: { text: 'She looks at the drawing for a long time. "Shale," she says. "When the road\'s walked. I\'ll knock on her door, and she can open it or not." She rubs out the bridge with her boot. "Nobody\'s ever let me say before."', again: 'Only the road and the town are left in the dirt.', options: [rest] },

    // the romance: opt-in at a fire, she asks at every step, any answer is allowed; it can end
    r1: {
      text: 'She doesn\'t move away. After a while she moves closer, until her shoulder is against yours, and stays there, watching the dark as if it were any other night. "This all right?" She doesn\'t look at you to ask it.',
      again: 'Her shoulder is still against yours.',
      options: [
        { id: 'wren.r1.yes', text: 'Yes.', effects: [{ set: 'wren_rom', value: 'yes' }, W(5)], next: 'r1_yes' },
        { id: 'wren.r1.later', text: 'Not tonight.', effects: [{ set: 'wren_rom', value: 'later' }], next: 'r1_later' },
        { id: 'wren.r1.no', text: 'Not like that, Wren.', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r1_no' },
      ],
    },
    r1b: {
      text: 'This time she is the one who sits down beside you, close enough that the question has already been asked. "Still not?" It is a real question; she will take either answer.',
      again: 'She is waiting for an answer, and will take either one.',
      options: [
        { id: 'wren.r1b.yes', text: 'Not "not". Yes.', effects: [{ set: 'wren_rom', value: 'yes' }, W(5)], next: 'r1_yes' },
        { id: 'wren.r1b.no', text: 'Still not. Not like that.', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r1_no' },
      ],
    },
    r1_yes: { text: 'She nods, once, at the dark. Nothing else happens, and it is the best thing that has happened in a while. "Good," she says eventually. "Don\'t make a speech about it."', again: 'Her shoulder, against yours.', options: [rest] },
    r1_later: { text: '"Fair enough." She stays where she is, a hand\'s width further off. "Nights are long. There\'ll be others."', again: 'A hand\'s width between you.', options: [rest] },
    r1_no: { text: '"Good. Saves us both a route." She means it kindly, and moves back to her own side of the fire, and it is not strange in the morning, because she won\'t let it be.', again: 'She is on her own side of the fire.', options: [rest] },
    r2: {
      text: 'Up a drainpipe and a stair with no wall to a roof of tar and pigeon bones, the dark country laid out below like a map she has already walked. She sits with her knees up. "I\'ve dreamed a rope since I was twelve," she says to the horizon, very plainly. "Before I knew there was a list. Same rope. A bridge under it. I wake with my hand at my throat." She takes the goggles off, which you have never once seen her do. "That\'s the thing. One other person\'s heard it."',
      again: 'The goggles are in her lap. She is still looking at the horizon.',
      effects: [{ learn: 'wren_dream' }],
      options: [
        { id: 'wren.r2.hand', text: '(Take her hand. The burned one.)', next: 'r2_ask' },
        { id: 'wren.r2.dream', text: 'It\'s a dream. It isn\'t a forecast.', next: 'r2_both' },
        { id: 'wren.r2.down', text: '(Go back down. Leave her the roof.)', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r2_down' },
      ],
    },
    r2_both: {
      text: '"It\'s both." She almost smiles. "That\'s the trouble with it." She puts her burned hand palm up on the tar between you, and leaves it there.',
      again: 'Her hand is still on the tar between you.',
      options: [
        { id: 'wren.r2.take', text: '(Take it.)', next: 'r2_ask' },
        { id: 'wren.r2.down2', text: '(Go back down. Leave her the roof.)', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r2_down' },
      ],
    },
    r2_down: { text: '"Right." She puts the goggles back on. "Mind the third rung. It isn\'t there." In the morning she is exactly as she always is, which is its own kind of kindness.', again: 'She is exactly as she always is.', options: [rest] },
    r2_ask: {
      text: 'Her fingers close on yours, hard, and then not hard. "Stay up here," she says, and it starts as an order and turns into a question halfway through. "With me. Tonight. If you want to. Say if you don\'t."',
      again: 'She is waiting for an answer, and will take either one.',
      options: [
        { id: 'wren.r2.yes', text: 'I want to.', effects: W_ROOF, next: 'r2_fade' },
        { id: 'wren.r2.later', text: 'Not tonight. I\'ll sit up here with you, though.', effects: [{ set: 'wren_rom', value: 'later_roof' }], next: 'r2_sit' },
        { id: 'wren.r2.no', text: 'I don\'t want this, Wren.', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r2_down' },
      ],
    },
    r2_fade: { text: 'She kisses you the way she does everything, quickly and without wasting any of it, and then not quickly at all. Below, the fire burns down and nobody minds it. Later the city\'s lamps go out one district at a time, on schedule, and neither of you counts them.', again: 'The roof, and the lamps going out.', options: [{ text: '(Morning.)', exit: true }] },
    r2_sit: { text: '"Fair." She leaves her hand where it is. You sit up there till the cold comes, and climb down, and she says nothing about it, which from Wren is a great deal.', again: 'She says nothing about the roof.', options: [rest] },
    r2b: {
      text: 'You find her the way you found her the first time: by looking up. She doesn\'t pretend to be surprised. "Came up to see if it was still a not-tonight," she says. "It\'s allowed to be."',
      again: 'She is waiting for an answer, and will take either one.',
      options: [
        { id: 'wren.r2b.yes', text: 'It isn\'t.', effects: W_ROOF, next: 'r2_fade' },
        { id: 'wren.r2b.no', text: 'It\'s a no. Not because of you.', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r2b_no' },
      ],
    },
    r2b_no: { text: '"I know." She puts the goggles back on. "Go on down. I\'ll watch the road a while."', again: 'She is watching the road from the roof.', options: [rest] },
    r3: {
      text: '"A route or a stop." She has been chewing on it for days; you can tell. "That\'s what I keep asking. What we are." She doesn\'t look away. "You don\'t have to answer tonight."',
      again: '"A route or a stop," she says again, and waits.',
      options: [
        { id: 'wren.r3.stop', text: 'A stop. Wherever you are.', effects: W_COMMIT('You told Wren you would stop wherever she is.'), next: 'r3_stop' },
        { id: 'wren.r3.route', text: 'A route. I don\'t know where it ends. I want to walk it with you.', effects: W_COMMIT('You told Wren you would walk her road with her, wherever it ends.'), next: 'r3_route' },
        { id: 'wren.r3.no', text: 'I don\'t think I can be either.', effects: [{ set: 'wren_rom', value: 'no' }], next: 'r3_no' },
      ],
    },
    r3_stop: { text: '"A stop." She tries it out. "I\'ve never been one of those." She puts her head on your shoulder, quickly, as if somebody might see. "Fine. It\'s said."', again: 'Her head on your shoulder.', options: [rest] },
    r3_route: { text: '"Good. Routes are honest." She takes your hand and draws a line on the back of it with her thumb, knuckle to wrist. "That\'s us. Not finished."', again: 'Her thumb on the back of your hand.', options: [rest] },
    r3_no: { text: '"Fair." She doesn\'t look away, which costs her. "Then that\'s what it was. It was good." In the morning she has moved her bedroll a little, not far.', again: 'Her bedroll, moved a little.', options: [rest] },
    c_rom_end: {
      text: [
        { if: W_SOLD_SOMEONE, text: '"I\'m sleeping that side of the fire." Her bedroll is already there. "You sold a person. I watched you do the sum." She doesn\'t raise her voice. "I can walk next to that. I can\'t lie down next to it."' },
        { text: '"I\'m sleeping that side of the fire." Her bedroll is already there. "You know why. I keep a count, and you\'re on the wrong side of it lately." She doesn\'t raise her voice. "I can walk next to that. I can\'t lie down next to it."' },
      ],
      again: 'Her bedroll, on the far side of the fire.',
      effects: [{ set: 'wren_rom', value: 'ended' }, { decision: { id: 'wren_rom_ended', text: 'Wren ended it, at a fire. She keeps a count.' } }],
      options: [{ id: 'wren.romend.plead', text: 'Wren — ', next: 'c_rom_end2' }, { text: '(Let her.)', exit: true }],
    },
    c_rom_end2: { text: '"Don\'t." Not unkindly. "I keep my word and I keep my count. That isn\'t the same thing as keeping you." She lies down with her back to the fire.', again: 'Her back to the fire.', options: [{ text: '(Let her.)', exit: true }] },

    // the others at the fire (U8 conflicts: at most two)
    x_ilya: {
      text: 'Across the fire Ilya is cleaning the rifle, piece by piece, counting the pieces under his breath. Wren watches every one of them go back in. "Four hundred paces," she says. "The east road. I was holding the can." Ilya doesn\'t look up. "I was aiming at the can." "I know." She means it as the worst thing she can say. "You could have had me. You didn\'t bother."',
      again: 'The rifle is back together. Neither of them has moved.',
      effects: [{ set: 'wren_ilya_x1' }],
      options: [
        { id: 'wren.x.ilya.why', text: 'Why the can, Ilya?', next: 'x_ilya_why' },
        { id: 'wren.x.ilya.quiet', text: '(Say nothing. Let them have it out.)', next: 'x_ilya_quiet' },
      ],
    },
    x_ilya_why: {
      text: '"Because you weren\'t Kade." He slides the bolt home. "Six. Right. You were a Dog on her road, that summer. It isn\'t the same thing." A pause. "It isn\'t enough, either." "Enough for what?" Wren says. "For me to stop seeing her when I see you." Wren considers that the way she considers a wash before she crosses it.',
      again: 'Wren is still considering it.',
      options: [
        { id: 'wren.x.ilya.wren', text: 'Wren left the Dogs to get out. She isn\'t Kade\'s.', effects: [W(3), I(-2)], next: 'x_ilya_w' },
        { id: 'wren.x.ilya.ilya', text: 'He told you the truth, Wren. That\'s more than most give.', effects: [I(3), W(-2)], next: 'x_ilya_i' },
        { id: 'wren.x.ilya.both', text: 'You both want the same woman gone. Start there.', if: { knows: 'ilya_raid' }, effects: [W(2), I(2), { set: 'wren_ilya_truce' }], next: 'x_ilya_b' },
      ],
    },
    x_ilya_w: { text: '"Got out," Ilya repeats. "Right." He doesn\'t argue. He doesn\'t agree. Wren looks at you, briefly, the way she looks at someone who covered her on a road.', again: 'Ilya is counting something else now.', options: [rest] },
    x_ilya_i: { text: '"More than most," Wren allows. She looks at Ilya, and then at you, and goes to walk the edge of the light, and is longer about it than usual.', again: 'Wren is still out at the edge of the light.', options: [rest] },
    x_ilya_b: { text: 'Neither of them says anything for a while. Then Wren says, "Fair," which is Kessler\'s word, and hears herself say it, and looks annoyed. Ilya almost smiles. "Right," he says.', again: 'The fire, and the two of them not quite looking at each other.', options: [rest] },
    x_ilya_quiet: { text: 'They let it lie. It doesn\'t go anywhere; it lies there between them all night, like a third bedroll.', again: 'It is still lying there.', options: [rest] },
    x_odile: {
      text: 'Odile reads by the fire with the glasses on their chain. Wren stands; she has not once sat down near Odile. "You wrote paper like hers," Wren says. "The girl\'s." Odile takes the glasses off. "I wrote the first of it, my dear. On a crate, on that bridge. Lot one was a man who owed for seed." She doesn\'t look away. "I would like to tell you I didn\'t know what it was for."',
      again: 'Odile has the glasses in her hand. Wren is still standing.',
      effects: [{ set: 'wren_odile_x1' }],
      options: [
        { id: 'wren.x.odile.pay', text: 'Don\'t tell her what you knew, Odile. Tell her what you\'ll pay.', effects: [W(5), { approval: { companion: ODILE, by: -3 } }], next: 'x_odile_pay' },
        { id: 'wren.x.odile.try', text: 'She left the Exchange, Wren. She\'s trying to undo it.', effects: [W(-3), { approval: { companion: ODILE, by: 3 } }], next: 'x_odile_try' },
        { id: 'wren.x.odile.quiet', text: '(Say nothing.)', next: 'x_odile_quiet' },
      ],
    },
    x_odile_pay: { text: '"That is a cost," Odile says after a long moment, which is the nearest thing to an apology anyone has had from her. "I\'ll pay it in paper. One sheet unwritten for every one I wrote. It will take the rest of my life, and the arithmetic still won\'t come out." Wren looks at her for a long time. Then she sits down, on the far side of the fire, which is nearer than she has ever sat.', again: 'Wren is sitting, on the far side of the fire.', options: [rest] },
    x_odile_try: { text: '"Trying." Wren says it like a measure she has been short-changed on. "The block opens at nine every morning. Tell her to try faster." She goes to walk the edge of the light. Odile puts the glasses back on, and does not read.', again: 'Odile is holding a page she isn\'t reading.', options: [rest] },
    x_odile_quiet: { text: 'Odile waits to be answered, and isn\'t, and puts the glasses back on. Wren stays standing all night.', again: 'Wren is still standing.', options: [rest] },

    // lighter talk at the fire
    t_roads: {
      text: '"You want the long version." She is already drawing in the dirt with a stick: the track, the wash, the cut, the salt. "Dust tells you who. Wind tells you when. Birds tell you water, if there are birds. Never walk a wash in the hills after rain, even if it\'s dry where you stand; the water\'s on its way and it doesn\'t knock." She goes on for most of an hour, and you learn more about the country between Shale and the glass than in all your life before. At the end she looks up, startled. "You let me finish."',
      again: 'The map in the dirt is still there, half scuffed.',
      effects: [{ learn: 'wren_routes' }, W(2), { xp: 20 }],
      options: [rest],
    },
    t_goggles: { text: '"Sun. Dust. Faces." She doesn\'t take them off. "People look at your eyes and think they\'ve read you. Let them read glass."', again: 'The goggles stay on.', options: [rest] },
    t_kessler: {
      text: [
        { if: { flag: 'warned_kessler' }, text: '"You told him." She knows; the whole overpass knows. "He\'ll have put you on his list of people he hasn\'t robbed. It\'s a short list. He reads it at night." She almost smiles. "He found me on a stair when I was six. Charged me for it every day since."' },
        { if: { flag: 'map_stolen' }, text: '"He\'ll know it was me by now. He knew before he woke." She doesn\'t sound sorry. "He found me on a stair when I was six and he\'s been charging me for it since. That was the last payment."' },
        { text: '"Found me on a stair when I was six. Charged me for it every day since." A beat. "He\'d hate you. He\'d give you water first."' },
      ],
      again: 'She is not going to say more about Kessler.',
      options: [rest],
    },
    t_coup: {
      text: '"You walked in front of her into his coach." Flat. "I waited to see if you\'d bring it up. You didn\'t, so I am." She looks at you. "He kept a list of who he hadn\'t robbed. I was on it. So were you."',
      again: 'She is not going to say more about Kessler.',
      effects: [W(-10), { memory: { npc: WREN, tag: 'you_killed_kessler', valence: -30, strength: 90 } }],
      options: [rest],
    },
    t_page: { text: '"He was burning them, a page at a time, when I found him. Said nobody should read what was on them who didn\'t have to." She turns her burned hand over. "I wanted one thing of his he didn\'t get to decide about. Stupid." A beat. "I argued to let him go east. Kessler wanted the paper. You know who won."', again: 'She is looking west, where the old man walked.', options: [rest] },
    t_shale: {
      text: [
        { if: { flag: 'wren_exodus' }, text: '"Brindle sleeps indoors now. Sprat thinks a door that shuts is a miracle." She considers. "Vey kept her word. I didn\'t expect that. I\'ve started expecting it, which is worse."' },
        { text: '"A well with a sheriff round it. Vey\'s straight. Half the rest are waiting to see who buys the well."' },
      ],
      again: 'She has said what she makes of Shale.',
      options: [rest],
    },
    t_city: {
      text: [
        { if: { flag: 'visited_md_bridgeward' }, text: '"Too many walls, and a lens on every one." She means the faces. "Bridgeward\'s the only street here that smells right. Stove smoke and rust. I was six there." She stops. "That\'s all the city I want."' },
        { text: '"Too many walls, and a lens on every one. Nobody here watches the road; there isn\'t one. They watch each other."' },
      ],
      again: 'She has said what she makes of the city.',
      options: [rest],
    },

    // leaving (U8): at a fire, with a scene; some ways back, not all
    c_kept: {
      text: '"Her paper." Wren doesn\'t sit. "It\'s in your pack. I can hear it rustle when you walk." She keeps her voice very level. "Tear it, or I go. Tonight."',
      again: '"Tear it, or I go," she says again.',
      effects: [{ set: 'wren_kept_asked' }],
      options: [
        { id: 'wren.kept.tear', text: '(Take it out. Tear it in four.)', effects: [{ take: 'k_sable_contract' }, { set: 'nb_sable_torn' }, W(40), { decision: { id: 'nb_sable_torn', text: 'You tore Sable Calloway\'s contract in four, in front of Wren.' } }, { memory: { npc: 'npc_nb_08', tag: 'freed_me', valence: 30, strength: 90 } }], next: 'c_kept_torn' },
        { id: 'wren.kept.keep', text: 'I paid for it. It\'s mine.', effects: [...W_GONE('kept', 'Wren left your fire over Sable Calloway\'s paper.'), W(-10)], next: 'c_kept_go' },
      ],
    },
    c_kept_torn: { text: '"Four." She picks the pieces up out of the dirt and puts them in her own pocket. "I\'ll give them to her." She sits down at last. She doesn\'t say anything else tonight, and it isn\'t a punishment.', again: 'Wren, sitting, with four pieces of paper in her pocket.', options: [rest] },
    c_kept_go: { text: '"Then I go." Her pack is on before you have finished the sentence; it was already packed. "If you ever tear it, I\'ll hear. I always hear."', again: 'The place where her pack was.', options: [{ text: '(Let her go.)', exit: true }] },
    c_sold: {
      text: '"Ninety." She is already packed. "Sixty in, ninety out. That\'s what she was to you." She shoulders the pack. "I keep my count. You know where you are on it."',
      again: 'The place where her pack was.',
      effects: [...W_GONE('sold', 'Wren left you for selling Sable Calloway\'s paper on.'), { memory: { npc: WREN, tag: 'sold_the_girl', valence: -100, strength: 100 } }],
      options: [{ text: '(Let her go.)', exit: true }],
    },
    c_block: {
      text: [
        { if: { flag: 'wren_promise_sable' }, text: '"You said it." She is already packed. "To the letter, I told you. You let the cup come down on the counter." She shoulders the pack. "I\'m going after the coat. He went east with her paper in his pocket. I\'ll find which door."' },
        { text: '"I\'m going after the coat." She is already packed. "He went east with her paper in his pocket. I\'ll find which door." She stops at the edge of the light. "You could have bid. You didn\'t."' },
      ],
      again: 'The place where her pack was.',
      effects: [...W_GONE('block', 'Wren left to go after the man who bought Sable Calloway\'s paper at the block.')],
      options: [{ text: '(Let her go.)', exit: true }],
    },
    c_floor: {
      text: '"I\'m done walking your road." Her pack is on. She doesn\'t list anything; she doesn\'t need to, and she knows you know it. "Don\'t come after me. I\'ll see you first."',
      again: 'The place where her pack was.',
      effects: [...W_GONE('floor', 'Wren left your fire. She keeps a count, and you were on the wrong side of it.')],
      options: [{ text: '(Let her go.)', exit: true }],
    },
    left: {
      text: [
        { if: { flag: 'wren_left', eq: 'kept' }, text: '"Is it torn?" She doesn\'t look up from the knot she is tying.' },
        { if: { flag: 'wren_left', eq: 'floor' }, text: '"I said I\'d see you first." She did.' },
        { if: { flag: 'wren_left', eq: 'block' }, text: 'Wren, packed, studying a guild waybill she has lifted from somewhere. She doesn\'t look up. "Still looking for the door."' },
        { text: 'Wren, packed, with her back to you. She doesn\'t turn round.' },
      ],
      again: 'Wren doesn\'t look up.',
      options: [
        { id: 'wren.left.tear', text: '(Take out the girl\'s paper and tear it in four in front of her.)', if: { all: [{ flag: 'wren_left', eq: 'kept' }, { item: 'k_sable_contract' }] }, effects: [{ take: 'k_sable_contract' }, { set: 'nb_sable_torn' }, { set: 'wren_left', value: false }, W(45), { join: WREN }, { decision: { id: 'wren_back', text: 'You tore the girl\'s paper in front of Wren, and she came back.' } }, { memory: { npc: 'npc_nb_08', tag: 'freed_me', valence: 30, strength: 90 } }], next: 'left_back' },
        { id: 'wren.left.talk', text: '(Sit down across from her. Tell her what you did, and why, and don\'t dress it up.)', if: { all: [{ flag: 'wren_left', eq: 'floor' }, { not: { seen: 'wren.left.talk' } }] }, check: { skill: 'speech', dc: 55 }, effects: [{ set: 'wren_left', value: false }, W(30), { join: WREN }, { decision: { id: 'wren_back', text: 'You told Wren the truth, undressed, and she came back. Once, she said.' } }], next: 'left_back2', fail: 'left_no' },
        { text: '(Leave her be.)', exit: true },
      ],
    },
    left_back: { text: '"Four." She takes the pieces. "Fine. Walk." She is ahead of you before you have stood up.', again: 'She is ahead of you on the road.', options: [{ text: 'Keep up.', exit: true }] },
    left_back2: { text: '"That\'s the first true thing you\'ve said in a while." She stands. "Once. I do this once."', again: 'She is ahead of you on the road.', options: [{ text: 'Keep up.', exit: true }] },
    left_no: { text: '"No." She doesn\'t look up. "Go on."', again: 'She doesn\'t look up.', options: [{ text: '(Leave her be.)', exit: true }] },
    gone_away: {
      text: [
        { if: W_SOLD, text: '"Ninety." She is packed. "Brindle had it off a caravan: lot four, in at sixty, out at ninety, the same day." She shoulders the pack. "I keep my count."' },
        { if: { knows: 'wren_told_girl' }, text: '"Lot four went to a coat at ninety. Brindle had it off a caravan." She is packed. "I told you about the block. You were there." She shoulders the pack. "I\'m going after the coat."' },
        { text: '"Lot four went to a coat at ninety. Brindle had it off a caravan." She is packed. "You weren\'t to know. I never told you; that\'s mine." She shoulders the pack. "I\'m going after the coat."' },
      ],
      again: 'The place where her pack was.',
      effects: [{ set: 'wren_left', value: 'away' }, { decision: { id: 'wren_left', text: 'Wren went east after the girl\'s paper, on her own.' } }],
      options: [{ text: '(Let her go.)', exit: true }],
    },
    // Act 3 (B6n): her red line after a guild night she was not at (a3_fire.ts)
    ...WREN_GUILD_NODES,
  },
};

export const d_rd_teo: DialogueDef = {
  id: 'd_rd_teo', owner: 'npc_sh_07',
  start: [{ if: { all: [{ flag: 'teo_freed' }, { at: 'shale' }] }, node: 'home' }, { if: { flag: 'teo_freed' }, node: 'free' }, { node: 'intro' }],
  nodes: {
    home: {
      text: '"Home." He says it like a sum that finally came out. "Mags shouted for an hour and then fed me for two. I owe you a count, and I keep my counts." He is already behind the bar, where the books are.',
      again: '"Count\'s still right." He doesn\'t look up from the books, but he smiles at them.',
      options: [
        { id: 'teo.pass', text: 'The Tollmen\'s wall on the highway. Could you write a pass the gate would take?', if: { all: [{ quest: 'q_a1_tollhouse' }, { not: { item: 'k_pass_forged' } }, { not: { flag: 'th_passed' } }] }, next: 'pass' },
        { text: 'Keep your counts.', exit: true },
      ],
    },
    pass: { text: '"I kept Kessler\'s books and Kessler keeps the guild\'s waybills, because he can\'t read them and likes the paper." He takes a sheet from under the bar, and writes for a minute in a hand that isn\'t his. "Bearer and goods. Hold it like you\'ve had it for years."', effects: [{ give: 'k_pass_forged' }, { learn: 'teo_forged' }, { lead: 'l_pass_hands' }, { trust: { npc: 'npc_sh_07', by: 5 } }], options: [{ text: '(Take it.)', exit: true }] },
    intro: {
      text: 'You\'re not a Dog. You\'re — are you from Shale? Did Mags send you? Tell her I\'m fine. Tell her it\'s forty, not sixty, and I can prove it, I\'ve got the whole thing in my head —',
      again: 'You came back. Forty, not sixty. I\'ve counted it again since, twice.',
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
    free: { text: '"They let me out. They actually —" He stops, breathes. "I\'m going home. Walk with me as far as the road? I don\'t trust my legs."', again: '"Still here. So am I. My legs keep forgetting which way Shale is."', effects: [{ set: 'teo_walking_home' }], options: [{ text: 'Go. I\'ll see you in Shale.', exit: true }] },
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
    open: { text: 'The cage stands open. The cot still holds the shape of a man who counted to stay sane.', again: 'The cage, open. Nobody has bothered to shut it.', options: [{ text: '(Go.)', exit: true }] },
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
    bare: { text: 'Kessler\'s table. The shotgun shell, and nothing under it.', again: 'The table, the shell, the empty place under the lamp.', options: [{ text: '(Step back.)', exit: true }] },
  },
};

export const d_rd_perpetua: DialogueDef = {
  id: 'd_rd_perpetua', owner: 'npc_rd_05',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'Dog-mother. Forty years in this camp; the dogs are mine, the races are mine, the memory\'s mine. The dogs say you\'re not afraid, which means you don\'t know enough yet.',
      again: 'The dogs remember you. So do I. What?',
      options: [
        { id: 'perp.stranger', text: 'The old man from the salt cut.', if: { any: [{ knows: 'kessler_met_stranger' }, { knows: 'wren_found_stranger' }, { knows: 'kessler_has_map' }] }, next: 'stranger', once: true },
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
      again: 'Back. Still nothing shoots straight. What are you after?',
      options: [
        { text: 'Let\'s see what you\'ve got.', effects: [{ event: 'barter' }], exit: true, repeat: true },
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
      again: 'The tank on its blocks, the Dog on the sandbags. Neither has moved.',
      passives: [{ skill: 'mechanics', dc: 35, text: 'The outlet valve is a bad weld on a good fitting. It would take a wrench and a minute, and it would drain into sand.', effects: [{ learn: 'tank_valve' }] }],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

export const d_rd_chest: DialogueDef = {
  id: 'd_rd_chest', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: { text: 'Kessler\'s chest: a locker with a padlock, and on the lid in chalk a list of names with lines through most of them. The paper isn\'t in here. It\'s under the lamp.', again: 'Kessler\'s locker and its chalk list. The lines through the names haven\'t changed.', effects: [{ learn: 'kessler_list' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};
