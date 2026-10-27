import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * Ninebridge: the guild's Exchange on the broken bridge. The toll at the sandbags, the porters sitting down
 * under the ramp, the Span and its berths, the floor where paper is sold, the block where people are, and an
 * old trader with a tab who knows the hand on the map.
 */

const bye = { text: 'That\'s all.', exit: true };
const NIGHT = { hour: { from: 23, to: 6 } };
const BLOCK_HOURS = { hour: { from: 9, to: 18 } };
// The Broker's board at Old Market: a sealed case for the floor clerk, and lot seven off the block.
const GIG_CASE: Cond = { all: [{ item: 'k_gig_case' }, { quest: 'q_gig_case' }, { not: { flag: 'gig_case_delivered' } }] };
const GIG_CASE_DONE: Effect[] = [{ take: 'k_gig_case' }, { set: 'gig_case_delivered' }, { xp: 30 }];
const GIG_LOT7: Cond = { all: [{ quest: 'q_gig_lot7' }, { not: { item: 'k_gig_lot7' } }, { not: { flag: 'nb_lot7_sold' } }] };
const LOT7_SOLD: Effect[] = [{ give: 'k_gig_lot7' }, { set: 'nb_lot7_sold' }, { approval: { companion: 'npc_rd_03', by: -15 } }, { approval: { companion: 'npc_nb_03', by: -10 } }];
const TRUTH = (how: string) => [{ learn: 'nb_paid_truth' }, { lead: 'l_exchange_paid' }, { set: `nb_truth_${how}` }, { xp: 120 }];

// ---------------------------------------------------------------- the west bank: toll and strike

export const d_nb_toll: DialogueDef = {
  id: 'd_nb_toll', owner: 'npc_nb_04',
  start: [{ if: { flag: 'nb_fight' }, node: 'fight' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'nb_toll_rate', eq: 'fair' }, text: 'The toll-warden lifts a hand from the sandbags without getting up. "Twelve to cross. One of that\'s the porters\' now, so you can feel good about it. Pay, ticket, or courier."' },
        { text: 'The toll-warden steps out from the sandbags with a shotgun on a sling and a face that has said the next sentence ten thousand times. "Ninebridge. Twelve to cross. Pay, ticket, or courier — there\'s no fourth thing."' },
      ],
      passives: [
        { skill: 'barter', dc: 30, text: 'The porters sitting under the ramp with their straps off are the reason the warden looks tired. Nothing has moved up the ramp today but people.', effects: [{ learn: 'nb_strike_seen' }] },
      ],
      options: [
        { id: 'toll.ticket', text: '(Show the guild ticket.)', if: { member: 'tollmen' }, effects: [{ set: 'nb_toll_paid' }, { learn: 'nb_crossed' }], next: 'in' },
        { id: 'toll.packet', text: '(Show the sealed packet.) Courier. For the Exchange.', if: { item: 'k_packet' }, effects: [{ set: 'nb_toll_paid' }, { learn: 'nb_crossed' }, { set: 'nb_courier_seen' }], next: 'courier' },
        { id: 'toll.pay', text: '(Pay. 12 Tolls)', if: { item: 'tolls', count: 12 }, effects: [{ take: 'tolls', count: 12 }, { set: 'nb_toll_paid' }, { learn: 'nb_crossed' }], next: 'in' },
        { id: 'toll.stamp', text: '(Show the Tollhouse stamp.) I\'ve paid the guild once.', if: { item: 'k_pass_stamped' }, check: { skill: 'barter', dc: 35 }, next: 'stamp_ok', fail: 'stamp_no' },
        { id: 'toll.strike', text: 'What are they doing under the ramp?', next: 'strike', once: true },
        { id: 'toll.no', text: 'I\'m not paying twelve to walk on a road.', next: 'threat' },
        { text: 'I\'ll come back.', exit: true },
      ],
    },
    stamp_ok: { text: 'He looks at the stamp, and at you, and decides it is not worth the sentence. "Wall\'s stamp. Not the bridge\'s. Eight, and don\'t tell the bridge."', options: [{ id: 'toll.eight', text: '(Pay. 8 Tolls)', if: { item: 'tolls', count: 8 }, effects: [{ take: 'tolls', count: 8 }, { set: 'nb_toll_paid' }, { learn: 'nb_crossed' }, { xp: 20 }], next: 'in' }, { text: 'Twelve, then.', next: 'intro' }] },
    stamp_no: { text: '"That\'s the wall\'s stamp. This is a bridge. Different thing, same guild, twelve."', options: [{ text: 'Twelve, then.', next: 'intro' }] },
    strike: {
      text: '"Sitting. Straps off. They want a tenth of the crossing for carrying it up the ramp, which they will not get, because the guild has it in writing that they\'re back on the third day." He says it flatly, like a man reading off a card. "Goods wait. People can walk."',
      passives: [{ attr: 'senses', dc: 7, text: 'In writing. He glanced at his pocket when he said it, where a folded paper makes a square under the cloth.', effects: [{ learn: 'nb_sheet_strike' }, { lead: 'l_strike_forecast' }] }],
      effects: [{ learn: 'nb_strike_heard' }, { quest: 'q_nb_strike', start: true }],
      options: [{ text: 'Twelve, you said.', next: 'intro' }],
    },
    courier: { text: '"Courier." He touches the seal with one finger as if it might be hot. "Hall\'s mid-span. The Grand Factor signs for paper herself. Don\'t drop it in the river." He waves you through.', options: [{ text: '(Cross.)', exit: true }] },
    in: { text: '"Guild deck past the sandbags. Mind the ninth span — planks on the south side. Block\'s on the far bank if you\'re buying people, Exchange is mid-span if you\'re buying paper, the Span if you\'re buying the other thing."', options: [{ text: '(Cross.)', exit: true }] },
    threat: {
      text: 'The shotgun does not move. A guard you had not seen steps out of the booth behind you. "Then you\'re a loss to the bridge, and we write losses in the river." He waits. "Twelve."',
      options: [
        { id: 'toll.draw', text: '(Draw.)', effects: [{ set: 'nb_fight' }, { set: 'nb_toll_paid' }, { decision: { id: 'nb_fought_toll', text: 'You drew on the guild at the Ninebridge toll.' } }, { rep: { faction: 'tollmen', fear: 10, respect: -25 } }, { event: 'combat' }], exit: true },
        { text: 'Twelve. Fine.', next: 'intro' },
      ],
    },
    fight: { text: 'The warden has nothing to say to you now that the guns are out.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_nb_toll_warden: DialogueDef = {
  id: 'd_nb_toll_warden', owner: 'npc_nb_04',
  start: [{ if: { flag: 'nb_fight' }, node: 'fight' }, { if: { flag: 'nb_break_claim' }, node: 'paid_out' }, { if: { all: [{ flag: 'nb_strike_outcome', eq: 'broken' }, { not: { flag: 'nb_break_claim' } }] }, node: 'claim' }, { if: { flag: 'nb_strike_over' }, node: 'after' }, { if: { flag: 'nb_warden_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Esk Varga. Toll-warden, Ninebridge west." He does not offer a hand; he has a count going. "If it\'s about the rate, the rate\'s on the sign. If it\'s about the porters, I\'ve a job going."',
      effects: [{ set: 'nb_warden_met' }],
      options: [
        { id: 'esk.job', text: 'What job?', next: 'job' },
        { id: 'esk.third', text: 'You said they\'re back on the third day. Who says?', if: { knows: 'nb_strike_heard' }, next: 'third', once: true },
        { id: 'esk.bridge', text: 'Tell me about the bridge.', next: 'bridge', once: true },
        bye,
      ],
    },
    again: { text: '"Warden." The count goes on behind his eyes.', options: [{ id: 'esk.job.again', text: 'The job.', if: { not: { flag: 'nb_strike_over' } }, next: 'job' }, { id: 'esk.third.again', text: 'Who says the third day?', if: { all: [{ knows: 'nb_strike_heard' }, { not: { seen: 'esk.third' } }] }, next: 'third' }, { id: 'esk.bridge.again', text: 'The bridge.', if: { not: { seen: 'esk.bridge' } }, next: 'bridge' }, bye] },
    job: {
      text: '"Forty backs under the ramp. Talk them up the ramp with their straps on, on the guild\'s terms, and the guild pays eighty. I\'d do it myself but they know my face, and I\'m the face." He shrugs. "They\'re back on the third day regardless. You\'d be saving them two days of hungry. Call it charity."',
      effects: [{ set: 'nb_break_offer' }, { quest: 'q_nb_strike', start: true }, { learn: 'nb_strike_heard' }],
      options: [{ text: 'I\'ll think about it.', exit: true }, { text: 'What makes you sure about the third day?', next: 'third' }],
    },
    third: {
      text: '"The guild." A beat too long. "The guild is sure about a lot of things. It has paper on most of them." He looks at the camp, and for one second he is a man and not a post. "Third day. I\'ve seen the paper."',
      effects: [{ learn: 'nb_sheet_strike' }, { lead: 'l_strike_forecast' }],
      options: [{ text: 'Paper.', exit: true }],
    },
    bridge: { text: '"Nine spans when it was built. Eight when the river stopped — the ninth went into the bed the same year, with the market on it, and the guild bought the other eight from whoever was standing on them. Planks across the gap. Twelve to cross. That\'s the history."', effects: [{ learn: 'nb_history' }], options: [bye] },
    claim: { text: 'He has heard. "Straps on, terms unchanged, and the Grand Factor asked me who did it." He counts eighty from a belt pouch into your hand without looking at it. "Don\'t drink it here. They\'re watching."', effects: [{ give: 'tolls', count: 80 }, { set: 'nb_break_claim' }, { rep: { faction: 'tollmen', respect: 12 } }], options: [bye] },
    paid_out: { text: '"Paid. We\'re square." He looks at the ramp, where the goods are moving.', options: [bye] },
    after: {
      text: [
        { if: { flag: 'nb_toll_rate', eq: 'fair' }, text: 'A new line is painted on the rates board, and the warden has a new way of not looking at you. "A tenth to the porters. First time the bridge ever paid for its own legs. The Grand Factor says it\'s a cost."' },
        { text: '"Straps on. Goods moving. The paper was right, which it usually is." He does not say thank you; the guild does not.' },
      ],
      options: [bye],
    },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_nb_rates: DialogueDef = {
  id: 'd_nb_rates', owner: 'narrator',
  start: [{ node: 'read' }],
  nodes: {
    read: {
      text: [
        { if: { flag: 'nb_toll_rate', eq: 'fair' }, text: 'NINEBRIDGE — CROSSING 12 — GOODS BY THE MEASURE — TICKET-HOLDERS FREE — COURIERS FREE — and under it, fresh paint over old: PORTERS\' TENTH, PAID AT THE RAMP.' },
        { text: 'NINEBRIDGE — CROSSING 12 — GOODS BY THE MEASURE — TICKET-HOLDERS FREE — COURIERS FREE — NO CREDIT — THE GUILD IS CREDIT. Someone has scratched FOR WHOM under the last line and someone else has painted over it, badly.' },
      ],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_nb_strike_sign: DialogueDef = {
  id: 'd_nb_strike_sign', owner: 'narrator',
  start: [{ node: 'read' }],
  nodes: {
    read: { text: 'A plank painted in tar: STRAPS OFF. A TENTH OR NOTHING MOVES. — THE BACKS OF NINEBRIDGE. Under it, smaller and newer: DAY TWO.', effects: [{ quest: 'q_nb_strike', start: true }, { learn: 'nb_strike_heard' }], options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_nb_voss: DialogueDef = {
  id: 'd_nb_voss', owner: 'npc_nb_05',
  start: [{ if: { flag: 'nb_strike_outcome', eq: 'broken' }, node: 'broken' }, { if: { flag: 'nb_strike_over' }, node: 'won' }, { if: { flag: 'nb_voss_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man with a porter\'s shoulders and a porter\'s ruined knees sits by the fire with his strap coiled beside him like a sleeping dog. "If you\'re the guild\'s, say so and I\'ll save us both the breath. If you\'re not, sit. We\'ve water. We\'ve nothing else."',
      effects: [{ set: 'nb_voss_met' }, { quest: 'q_nb_strike', start: true }, { learn: 'nb_strike_heard' }],
      options: [
        { id: 'voss.what', text: 'What do you want?', next: 'what', once: true },
        { id: 'voss.third', text: 'The warden says you\'re back on the third day.', if: { knows: 'nb_strike_heard' }, next: 'third', once: true },
        { id: 'voss.sheet', text: '(Give him the guild\'s sheet.)', if: { item: 'k_strike_sheet' }, next: 'sheet' },
        { id: 'voss.carry', text: '(Pick up a strap.) Where do you want it?', next: 'carry' },
        { id: 'voss.pay', text: '(Pay the tenth yourself. 60 Tolls) Call it a loan against the guild.', if: { item: 'tolls', count: 60 }, next: 'pay' },
        { id: 'voss.break', text: 'You\'ll lose. The guild has it written. Go up the ramp and keep your knees.', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'nb_sheet_strike' }, dc: -10, why: 'you have seen the paper and can describe it' }, { if: { rep: { faction: 'tollmen', fear: 15 } }, dc: -5, why: 'they have heard what you did to the guild' }] }, next: 'break_ok', fail: 'break_no' },
        bye,
      ],
    },
    again: { text: '"Still sitting."', options: [{ id: 'voss.what.again', text: 'What do you want?', if: { not: { seen: 'voss.what' } }, next: 'what' }, { id: 'voss.third.again', text: 'The warden says the third day.', if: { all: [{ knows: 'nb_strike_heard' }, { not: { seen: 'voss.third' } }] }, next: 'third' }, { id: 'voss.sheet.again', text: '(Give him the guild\'s sheet.)', if: { item: 'k_strike_sheet' }, next: 'sheet' }, { id: 'voss.carry.again', text: '(Pick up a strap.)', next: 'carry' }, { id: 'voss.pay.again', text: '(Pay the tenth yourself. 60 Tolls)', if: { item: 'tolls', count: 60 }, next: 'pay' }, { id: 'voss.break.again', text: 'You\'ll lose. Go up the ramp.', if: { not: { seen: 'voss.break' } }, check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'nb_sheet_strike' }, dc: -10, why: 'you have seen the paper' }] }, next: 'break_ok', fail: 'break_no' }, bye] },
    what: { text: '"A tenth of the crossing. Twelve Tolls a head comes over this bridge and not one of them goes to the backs that carry the goods up the ramp. One in ten. The guild says the bridge can\'t afford it." He looks up at eight spans of concrete. "The bridge was free when it was built."', effects: [{ learn: 'nb_strike_demand' }], options: [{ text: 'And the guild?', next: 'third' }] },
    third: { text: '"They said that before we sat down. Third day. Like weather." He turns the strap over. "I don\'t know how they know. I know that if a man tells you how a fight ends before it starts, he\'s either lying or he\'s fixed it. And the guild doesn\'t lie; it\'s too dear."', effects: [{ learn: 'nb_voss_suspects' }], options: [bye] },
    sheet: {
      text: 'He reads slowly, lips moving over the guild\'s capitals. NINEBRIDGE — PORTERS\' STOPPAGE — ENDS THIRD DAY, STRAPS ON, TERMS UNCHANGED. Dated the day before they sat down. He reads it twice. Then he stands, which takes a while, and holds it up so the fire can see it. "They wrote our ending before we started," he says, not loudly. "Then we\'re off their page." Forty people put their straps down harder.',
      effects: [{ take: 'k_strike_sheet' }, { set: 'nb_strike_sheet_given' }, { set: 'nb_strike_outcome', value: 'won' }, { set: 'nb_strike_over' }, { learn: 'nb_forecast_broken' }, { decision: { id: 'nb_strike_sheet', text: 'You gave the Ninebridge porters the guild\'s forecast of their defeat. They sat past the third day and won.' } }, { xp: 150 }, { time: 60 }],
      options: [{ text: '(Watch them sit.)', next: 'won_now' }],
    },
    won_now: { text: 'On the fourth morning the goods are still at the foot of the ramp and the Grand Factor sends the warden down to the fire with a rate painted on a board. A tenth. Voss does not gloat; he puts his strap on. "First time," he says, "the bridge paid for its legs."', options: [bye] },
    carry: {
      text: '"We\'re not carrying. That\'s the point." He looks at your shoulders. "But the goods at the foot of the ramp are the guild\'s, and if a stranger carried them up — for free, mind, and slow — the guild would have to decide whether that was a strike broken or a strike with help. Make the warden decide something. I\'d like to see his face."',
      options: [
        { id: 'voss.carry.do', text: '(Carry. All day.)', check: { attr: 'grit', dc: 6, mods: [{ if: { attr: 'brawn', gte: 7 }, dc: -1, why: 'you have the back for it' }] }, next: 'carry_ok', fail: 'carry_no' },
        { text: 'Not today.', exit: true },
      ],
    },
    carry_ok: { text: 'You carry from the foot of the ramp to the sandbags from first light to dusk, slow, alone, in front of forty people who do not help and do not stop watching, and by the afternoon the warden has sent for the Grand Factor twice. At dusk a board comes down the ramp with a rate on it. A tenth. "He decided," Voss says, and puts his strap on.', effects: [{ time: 600 }, { set: 'nb_strike_carried' }, { set: 'nb_strike_outcome', value: 'won' }, { set: 'nb_strike_over' }, { decision: { id: 'nb_strike_carried', text: 'You carried the guild\'s goods up the Ninebridge ramp alone until the guild gave the porters their tenth.' } }, { xp: 120 }], options: [bye] },
    carry_no: { text: 'Your shoulders go at noon. Voss sits you down by the fire kindly and does not say anything, which is worse. "Tomorrow, maybe. Or not. Nobody\'s counting but the guild."', effects: [{ time: 300 }], options: [bye] },
    pay: {
      text: 'He looks at the coin for a long time. "That\'s a day\'s tenth. One day." He does not take it yet. "If the guild sees a stranger pay what the bridge won\'t, either they match it or they\'re shamed in front of their own deck. The Grand Factor doesn\'t like to be seen. Try it."',
      options: [{ id: 'voss.pay.do', text: '(Put it in his hand.)', effects: [{ take: 'tolls', count: 60 }, { set: 'nb_strike_paid' }, { set: 'nb_strike_outcome', value: 'paid' }, { set: 'nb_strike_over' }, { time: 240 }, { decision: { id: 'nb_strike_paid', text: 'You paid the Ninebridge porters a day\'s tenth out of your own pocket and shamed the guild into matching it.' } }, { xp: 90 }], next: 'pay_done' }, { text: 'Keep it. For now.', exit: true }] },
    pay_done: { text: 'By evening a board comes down the ramp with a rate painted on it, and a guild clerk with a face like a closed drawer to say the guild had always meant to. A tenth. Voss hands you back twelve of your sixty. "The first day\'s. Ours now."', effects: [{ give: 'tolls', count: 12 }], options: [bye] },
    break_ok: {
      text: 'You talk the way the guild talks, in numbers, and you do not raise your voice, and you describe the paper. Something goes out of the fire. Voss looks at the ramp for a long time. "Third day," he says. "Straps on." Forty people stand up slower than they sat down, and none of them look at you, which is its own kind of looking.',
      effects: [{ set: 'nb_strike_outcome', value: 'broken' }, { set: 'nb_strike_over' }, { set: 'nb_strike_broke' }, { decision: { id: 'nb_strike_broken', text: 'You talked the Ninebridge porters back up the ramp on the guild\'s terms.' } }, { rep: { faction: 'tollmen', respect: 8 } }, { memory: { npc: 'npc_nb_05', tag: 'broke_strike', valence: -40, strength: 90 } }, { time: 60 }],
      options: [{ text: '(Go and collect from the warden.)', exit: true }],
    },
    break_no: { text: '"Keep your knees." He says it back to you, slowly. "That\'s what they said to my father when the ninth span fell with him on it. Sit down or go up the ramp, stranger, but don\'t tell a porter about his knees."', effects: [{ memory: { npc: 'npc_nb_05', tag: 'tried_to_break', valence: -15, strength: 50 } }], options: [bye] },
    broken: { text: 'He is carrying. He does not stop, and he does not look at you, and the forty behind him have learned your face the way porters learn a step that gives.', options: [{ text: '(Nothing.)', exit: true }] },
    won: { text: 'He is carrying, with his strap on, and when he passes you he lifts two fingers off the strap. A tenth. "Off the page," he says, and goes up the ramp.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the deck: the Span and the berths

export const d_nb_span_sign: DialogueDef = {
  id: 'd_nb_span_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'THE SPAN — BITTERS · WATER · DUST · BERTHS — NAMED FOR THE ONE THAT\'S MISSING. A hull door in a wall of welded scrap, and lamplight under it.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_nb_hall_sign: DialogueDef = {
  id: 'd_nb_hall_sign', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'THE EXCHANGE — NINEBRIDGE — PAPER BOUGHT AND SOLD — TICKET-HOLDERS AND COURIERS — THE FLOOR CLOSES AT NINE. The guild\'s half-moon, cast in brass, bolted to a shipping container.', effects: [{ learn: 'nb_hall_seen' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_nb_planks: DialogueDef = {
  id: 'd_nb_planks', owner: 'narrator', start: [{ node: 'read' }],
  nodes: { read: { text: 'Four planks, bolted to the south parapet where the ninth span used to be, over forty feet of air and a riverbed of concrete pieces. A sign: SINGLE FILE. NO GOODS. The guild charges twelve to cross a bridge and will not spend two to mend it.', effects: [{ learn: 'seen_ninth_span' }], options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_nb_dust_table: DialogueDef = {
  id: 'd_nb_dust_table', owner: 'narrator', start: [{ node: 'look' }],
  nodes: { look: { text: 'A table scarred with dice-cup rings, three stools, and a chalk tally nobody has rubbed out since the river stopped. Lazlo deals. Ask at the bar.', options: [{ text: '(Leave it.)', exit: true }] } },
};

export const d_nb_lazlo: DialogueDef = {
  id: 'd_nb_lazlo', owner: 'npc_nb_11',
  start: [{ if: { flag: 'nb_lazlo_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The man behind the bar has forearms like bridge cable and a beard with bitters in it. "The Span. Bitters, water, Dust, a berth if you\'re clean and thirty if you\'re not." He nods at the corner table without looking at it. "Don\'t buy her a drink. She\'ll let you."',
      effects: [{ set: 'nb_lazlo_met' }],
      options: [
        { id: 'lazlo.trade', text: 'Let me see what you\'ve got.', effects: [{ event: 'barter' }], exit: true },
        { id: 'lazlo.dust', text: 'A game of Dust. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ event: 'dust', data: { stake: 5 } }], exit: true },
        { id: 'lazlo.berth', text: 'The berth. Thirty?', if: { not: { flag: 'nb_berth' } }, next: 'berth' },
        { id: 'lazlo.her', text: 'Who\'s at the corner table?', next: 'her', once: true },
        { id: 'lazlo.news', text: 'What\'s the talk?', next: 'news', once: true },
        bye,
      ],
    },
    again: { text: '"Bitters, water, Dust." He is already pouring something.', options: [{ id: 'lazlo.trade.again', text: 'Let me see what you\'ve got.', effects: [{ event: 'barter' }], exit: true }, { id: 'lazlo.dust.again', text: 'A game of Dust. (5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ event: 'dust', data: { stake: 5 } }], exit: true }, { id: 'lazlo.berth.again', text: 'The berth. Thirty?', if: { not: { flag: 'nb_berth' } }, next: 'berth' }, { id: 'lazlo.her.again', text: 'Who\'s at the corner table?', if: { not: { seen: 'lazlo.her' } }, next: 'her' }, { id: 'lazlo.news.again', text: 'What\'s the talk?', if: { not: { seen: 'lazlo.news' } }, next: 'news' }, bye] },
    berth: {
      text: '"Berth A. A bed, a locker, a door that locks from your side. Thirty, once, and it\'s yours for as long as I\'m alive and you don\'t bring the guild to my door." He puts a brass tag on the bar. "Berth B is hers. Has been for years. Don\'t ask."',
      options: [{ id: 'lazlo.berth.pay', text: '(Pay. 30 Tolls)', if: { item: 'tolls', count: 30 }, effects: [{ take: 'tolls', count: 30 }, { give: 'k_berth_token' }, { set: 'nb_berth' }, { learn: 'nb_berth_rented' }, { xp: 20 }], next: 'berth_done' }, { text: 'Not yet.', exit: true }] },
    berth_done: { text: '"South side, first box. Sleep well. Nobody does, on the bridge; the river talks even when it\'s dry."', options: [bye] },
    her: { text: '"Odile. She was the Exchange, before there was a Grand Factor to be it. Wrote the first paper they ever sold, they say. Drinks on a tab older than the bridge and the Grand Factor pays it, which tells you something, and I\'ve never worked out what." He wipes the bar. "She\'ll talk to you. She talks to everyone. Listen anyway."', effects: [{ learn: 'odile_told' }], options: [bye] },
    news: {
      text: [
        { if: { flag: 'nb_strike_over' }, text: '"The porters, mostly. And a stranger from the salt cut asking after things on the floor." He looks at you. "That\'ll be you."' },
        { text: '"The porters sat down. Guild says third day. Lot four on the block\'s young, which draws a crowd. And the Grand Factor\'s had a packet coming from the west for a week and keeps asking the warden if it\'s come."' },
      ],
      effects: [{ learn: 'nb_news_heard' }],
      options: [bye],
    },
  },
};

export const d_nb_berth: DialogueDef = {
  id: 'd_nb_berth', owner: 'narrator',
  start: [{ if: { flag: 'nb_berth' }, node: 'yours' }, { node: 'not_yours' }],
  nodes: {
    not_yours: { text: 'Berth A: a shipping container with a bed in it and a bolt on the inside of the door. Lazlo rents it. Thirty, he said.', options: [{ text: '(Leave it.)', exit: true }] },
    yours: { text: 'Your berth. A bed with a real mattress, a locker, a door that locks from your side, and the river talking under the deck all night though it has been dry for ninety years.', options: [{ text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true }, { text: '(Leave it.)', exit: true }] },
  },
};

export const d_nb_berth_b: DialogueDef = {
  id: 'd_nb_berth_b', owner: 'narrator',
  start: [{ if: { flag: 'odile_joined' }, node: 'gone' }, { node: 'hers' }],
  nodes: {
    hers: { text: 'Berth B. The door is bolted from inside though nobody is in it: Odile\'s, Lazlo said, for years. A reading-glasses chain hangs on the handle.', options: [{ text: '(Leave it.)', exit: true }] },
    gone: { text: 'Berth B. Empty now but for a shabby coat on a nail she did not come back for, and the tab, which Lazlo says the Grand Factor will keep paying because nobody has told her to stop.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- Odile

export const d_nb_odile: DialogueDef = {
  id: 'd_nb_odile', owner: 'npc_nb_03',
  start: [
    { if: { all: [{ inParty: 'npc_nb_03' }, { flag: 'at_camp' }] }, node: 'camp' },
    { if: { inParty: 'npc_nb_03' }, node: 'party' },
    { if: { flag: 'odile_joined' }, node: 'waiting' },
    { if: { flag: 'odile_met' }, node: 'again' },
    { node: 'intro' },
  ],
  nodes: {
    intro: {
      text: 'A woman of fifty-some in a good coat gone shabby sits at the corner table with reading glasses on a chain and a glass of bitters she is not drinking. She looks at your boots, your pack, the way you stand, and has priced you before you sit. "You came in over the planks and you didn\'t look down. Either brave or from somewhere flat. Sit, my dear. I don\'t bite; I negotiate."',
      effects: [{ set: 'odile_met' }, { learn: 'odile_seen' }],
      passives: [
        { attr: 'senses', dc: 7, text: 'Her left hand is chrome: an old, beautiful piece, every joint visible, that she uses to turn the glass the way other people use a breath.', effects: [{ learn: 'odile_hand' }] },
        { skill: 'barter', dc: 40, text: 'Three rounds on the table, none paid for, and the barkeep has not pressed her once. Somebody pays her tab and it is not her.', effects: [{ learn: 'odile_tab' }] },
      ],
      options: [
        { id: 'odile.who', text: 'Who are you?', next: 'who', once: true },
        { id: 'odile.exchange', text: 'What does the Exchange sell?', next: 'exchange', once: true },
        { id: 'odile.map', text: '(Show her the map.)', if: { item: 'k_map' }, next: 'map', once: true },
        { id: 'odile.packet', text: '(Show her the packet, sealed.) What is this?', if: { item: 'k_packet' }, next: 'packet', once: true },
        { id: 'odile.paid', text: 'Who paid for the riders who shot a man at Tollhouse 9?', if: { quest: 'q_a2_ninebridge' }, next: 'paid', once: true },
        { id: 'odile.join', text: 'Come with me. Unwind your trade on the road.', if: { flag: 'odile_offer' }, next: 'join' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'odile_offer' }, text: '"My dear." She turns the glass. "The offer stands. Offers are the only things I keep."' }, { text: '"Back. Sit. The bitters are terrible; that\'s why they\'re free."' }],
      options: [
        { id: 'odile.who.again', text: 'Who are you?', if: { not: { seen: 'odile.who' } }, next: 'who' },
        { id: 'odile.exchange.again', text: 'What does the Exchange sell?', if: { not: { seen: 'odile.exchange' } }, next: 'exchange' },
        { id: 'odile.map.again', text: '(Show her the map.)', if: { all: [{ item: 'k_map' }, { not: { seen: 'odile.map' } }] }, next: 'map' },
        { id: 'odile.packet.again', text: '(Show her the packet, sealed.)', if: { all: [{ item: 'k_packet' }, { not: { seen: 'odile.packet' } }] }, next: 'packet' },
        { id: 'odile.paid.again', text: 'Who paid for the riders at Tollhouse 9?', if: { all: [{ quest: 'q_a2_ninebridge' }, { not: { seen: 'odile.paid' } }] }, next: 'paid' },
        { id: 'odile.join.again', text: 'Come with me.', if: { flag: 'odile_offer' }, next: 'join' },
        bye,
      ],
    },
    who: {
      text: '"Odile Marchetti. I was the Exchange, before there was a hall to put it in — I wrote the first sheet the guild ever sold, on this bridge, on a crate, and the girl who held the ink is the Grand Factor now." She does not sound bitter; she sounds like someone quoting a contract. "I left. One leaves. There is a trade I made that I would like to unwind, and one cannot unwind a trade from inside the house that holds it."',
      effects: [{ learn: 'odile_history' }],
      options: [{ text: 'What trade?', next: 'trade' }, { text: 'Go on.', exit: true }],
    },
    trade: { text: '"I shorted a town." She says it plainly. "Bet that it would fail, by a date, and sold the bet. The town is called Shale, and the counterparty is — well. The counterparty is the reason I drink here and not there." She finishes the bitters at last. "You\'ve a Sallow look. Is it still there? Shale?"', effects: [{ learn: 'odile_short' }, { set: 'odile_offer' }], options: [{ text: 'It\'s still there.', next: 'shale_yes' }, { text: 'For now.', next: 'shale_yes' }] },
    shale_yes: { text: '"Good." Something in her unclenches by one notch. "Then the trade is still open, and I am still wrong, and that is the best news I have had in a year. Take me with you, my dear, when you go east. I\'ll pay my way. I know what the paper means, and I know the hand on most of it, and I have one chrome hand that has never lost at Dust."', options: [{ id: 'odile.join.now', text: 'Come with me.', next: 'join' }, { text: 'I\'ll think about it.', exit: true }] },
    exchange: {
      text: '"Futures." She taps the table with the chrome finger. "Sealed sheets: a place, a date, a thing that happens. Bought from somebody who knows; sold to somebody who wants to be on the right side of it when it does. The seal is the product — open it and it\'s only news." She watches you work that out. "Yes. Somebody knows. No, I won\'t say who, at this table, for free."',
      effects: [{ learn: 'nb_futures' }, { lead: 'l_futures' }],
      options: [{ text: 'Who knows?', next: 'who_knows' }, { text: 'Go on.', exit: true }],
    },
    who_knows: { text: '"The city." She says it the way the Sallow says *rain*. "Its machine keeps books on everyone it has ever seen the face of, and it writes down what they\'ll do, and some of what it writes leaks out through the guild, for a price, in sealed sheets. The outriders who shot your man were protecting the trade. Everyone on this deck is." She turns the glass. "That\'s free. Everything after this costs."', effects: [{ learn: 'nb_city_source' }, { learn: 'nb_paid_hint' }], options: [bye] },
    map: {
      text: 'She puts the glasses on and does not touch the cloth. For a long time she reads the blocks beside the pins the way other people read faces. "Oh, my dear." Very quietly. "That\'s ours. That\'s the Exchange\'s hand — the notation, I mean; I taught it to the girl who taught it to the clerks. Twelve lots." She takes the glasses off. "I can read every one of these. Two a night; more and the eyes go, and the eyes are the only thing I have that isn\'t borrowed."',
      effects: [{ learn: 'odile_knows_hand' }, { lead: 'l_odile_hand' }, { set: 'odile_offer' }, { xp: 60 }],
      options: [{ id: 'odile.map.price', text: 'Your price?', next: 'price' }, { id: 'odile.join.map', text: 'Come with me.', next: 'join' }],
    },
    price: { text: '"A seat at your fire, east. And when we reach the place that holds my trade, one hour of your time and no questions until it\'s done." She holds out the chrome hand. "That is the whole contract. I\'ve written longer ones for less."', options: [{ id: 'odile.join.price', text: '(Take her hand.) Come with me.', next: 'join' }, { text: 'I\'ll think about it.', exit: true }] },
    packet: {
      text: 'She weighs the packet in the chrome hand without touching the seal, turns it to the lamp, and sniffs the wax. "Water." She hands it back. "That\'s a schedule. A number and a date for a town\'s water — the seal\'s the floor\'s, the paper\'s the Precinct\'s, and the number is written in a hand that has never been thirsty. Somebody here buys a town\'s water by the measure, in advance." She looks at your Sallow boots. "Yours, I expect. Deliver it or don\'t. Opening it costs more than you have."',
      effects: [{ learn: 'packet_water' }, { lead: 'l_packet_water' }, { xp: 40 }],
      options: [bye],
    },
    paid: {
      text: [
        { if: { flag: 'odile_joined' }, text: '"The floor. The protection account, out of the Sarr ledger, by the floor\'s order — two riders, four days, *westbound traveller, confirmed*. I\'d swear to it, and I\'ve read the line." She looks at you steadily. "You wanted it from someone who was there. I wasn\'t. I was here, hearing it done."' },
        { if: { flag: 'odile_offer' }, text: '"You\'ll want it from the ledgers, in the hand that wrote it, and you\'ll want to be sure. I can tell you where it is written: the floor\'s protection account, the Sarr ledger, after the closing line for the week the Tollhouse paid two riders four days\' wage." She shrugs. "Or ask the Grand Factor. She\'ll sell it to you. She sells everything."' },
        { text: '"That costs, my dear, and I don\'t know you yet." She turns the glass. "Ask me again when you do."' },
      ],
      effects: [{ learn: 'nb_paid_hint' }],
      options: [{ id: 'odile.paid.sworn', text: 'I\'ll take your word.', if: { flag: 'odile_joined' }, effects: [...TRUTH('odile'), { approval: { companion: 'npc_nb_03', by: 5 } }], exit: true }, bye],
    },
    join: {
      text: 'She stands, which she does well for someone who has been sitting for a year, puts the glasses in the coat, and leaves the glass. "Lazlo. The tab stays open; let her keep paying it." At the door she takes your arm with the hand that is not hers. "Two blocks a night, my dear. Any more and the eyes go."',
      effects: [{ join: 'npc_nb_03' }, { set: 'odile_joined' }, { give: 'k_odile_note' }, { approval: { companion: 'npc_nb_03', by: 10 } }, { decision: { id: 'odile_joined', text: 'Odile Marchetti, who was the Exchange once, left the Span with you to unwind a trade.' } }, { news: { tag: 'odile_left', text: 'the old trader with the tab left the Span with a stranger from the salt cut', valence: 0, size: 5, at: 'ninebridge' } }, { xp: 100 }],
      options: [{ text: '(Go.)', exit: true }],
    },
    waiting: { text: '"Well? Are we going, or shall I order?"', options: [{ text: 'We\'re going.', effects: [{ join: 'npc_nb_03' }], exit: true }, { text: 'Wait here a while.', exit: true }] },
    party: {
      text: [{ if: { at: 'ninebridge' }, text: '"Don\'t let me near the floor. I\'ll start pricing things." She says it lightly. She is not joking.' }, { text: '"Weather\'s turning, my dear. I mean the money. I always mean the money."' }],
      options: [
        { id: 'odile.party.paid', text: 'Who paid for the riders at Tollhouse 9?', if: { all: [{ quest: 'q_a2_ninebridge' }, { not: { knows: 'nb_paid_truth' } }] }, next: 'paid' },
        { id: 'odile.party.trade', text: 'Tell me about the trade.', if: { not: { seen: 'odile.party.trade' } }, next: 'party_trade', once: true },
        { id: 'odile.party.wait', text: 'Wait here.', effects: [{ leave: 'npc_nb_03' }], exit: true },
        { text: 'Keep up.', exit: true },
      ],
    },
    party_trade: { text: '"Not here. At a fire, with the map out, and nobody\'s ledger within a day\'s walk." She looks east. "I\'ll read you two names a night. You\'ll wish I read slower."', options: [{ text: 'Keep up.', exit: true }] },
    camp: {
      text: [{ if: { knows: 'odile_read_two' }, text: 'She has the glasses on and the fire at her back, so the light falls on the cloth and not in her eyes. "The next two, then. Or let me rest them."' }, { text: 'She has the glasses on and your map weighted flat with a tin. "Two a night. Sit; this is slow, and I want you to see how it\'s done so that when I\'m gone you can do it badly yourself."' }],
      options: [
        { id: 'odile.camp.read', text: '(Read two blocks with her.)', if: { all: [{ item: 'k_map' }, { not: { knows: 'odile_read_two' } }] }, next: 'read_two' },
        { id: 'odile.camp.more', text: '(Read on.)', if: { knows: 'odile_read_two' }, next: 'read_more' },
        { id: 'odile.camp.trade', text: 'The trade. Tell me now.', if: { not: { knows: 'odile_trade_told' } }, next: 'camp_trade' },
        { text: 'Rest your eyes.', exit: true },
      ],
    },
    read_two: {
      text: 'She reads the way a surveyor walks: the first block, the second, back to the road. "The second lot: KESSLER, the overpass, day forty-five — *by Kade\'s hand*. The third: VEY, ADA, Shale, four months — *resigns; a company town*." She takes the glasses off and presses the bridge of her nose. "That\'s two. Your sheriff and your raider. Both written on the same cloth as your deputy." She folds the map for you. "The eyes go. Tomorrow."',
      effects: [{ learn: 'name2_decoded' }, { learn: 'name3_decoded' }, { lead: 'l_broadcast_kessler' }, { lead: 'l_name_vey' }, { learn: 'odile_read_two' }, { xp: 80 }, { time: 60 }, { decision: { id: 'odile_read_names', text: 'Odile read the second and third names on the stranger\'s map by firelight.' } }],
      options: [{ text: '(Fold it.)', exit: true }],
    },
    read_more: { text: '"The next blocks are east of here — names from the farms and the city, and I\'d rather read them with the places under our feet; the notation leans on the place." She closes the glasses. "Get us east, my dear. I\'ll read as we go."', options: [{ text: 'East, then.', exit: true }] },
    camp_trade: { text: '"I shorted Shale: sold a sheet that said the town fails by a date, to a buyer who wanted it to. The buyer was the city\'s machine, through the guild — it buys its own forecasts back when they go against it, to see who\'s selling. I didn\'t know that then. I know it now, and the sheet is in the Exchange archive with my name on it, and I would like to tear it up with the hand I have left." She looks at the chrome one. "That is the whole of the trade."', effects: [{ learn: 'odile_trade_told' }, { approval: { companion: 'npc_nb_03', by: 5 } }], options: [{ text: 'We\'ll get it.', effects: [{ approval: { companion: 'npc_nb_03', by: 5 } }], exit: true }, { text: 'Rest your eyes.', exit: true }] },
  },
};

// ---------------------------------------------------------------- the Exchange

export const d_nb_floor_door: DialogueDef = {
  id: 'd_nb_floor_door', owner: 'npc_nb_g2',
  start: [{ if: { flag: 'nb_fight' }, node: 'fight' }, { if: NIGHT, node: 'night' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A guard in guild grey fills the hall door with a carbine held the easy way. "Floor\'s for ticket-holders and couriers. Day ticket\'s fifteen if you\'ve business and no paper."',
      options: [
        { id: 'floor.ticket', text: '(Show the guild ticket.)', if: { member: 'tollmen' }, effects: [{ set: 'nb_floor_ok' }], next: 'in' },
        { id: 'floor.packet', text: '(Show the sealed packet.) Courier, for the Grand Factor.', if: { item: 'k_packet' }, effects: [{ set: 'nb_floor_ok' }, { set: 'nb_office_ok' }], next: 'courier' },
        { id: 'floor.pay', text: '(Pay. 15 Tolls)', if: { item: 'tolls', count: 15 }, effects: [{ take: 'tolls', count: 15 }, { set: 'nb_floor_ok' }], next: 'in' },
        { id: 'floor.odile', text: 'Odile Marchetti sent me.', if: { knows: 'odile_history' }, check: { skill: 'speech', dc: 30 }, next: 'odile_ok', fail: 'odile_no' },
        { id: 'floor.talk', text: 'I\'m expected.', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'nb_news_heard' }, dc: -10, why: 'you know the Grand Factor is waiting on a packet from the west' }] }, next: 'talk_ok', fail: 'talk_no' },
        { text: 'Another time.', exit: true },
      ],
    },
    night: {
      text: 'The night guard at the hall door is asleep on his feet, the way guards learn to be, carbine hooked in an elbow. The door behind him is on a latch.',
      options: [
        { id: 'floor.sneak', text: '(Slip past him.)', check: { skill: 'stealth', dc: 40 }, effects: [], next: 'sneak_ok', fail: 'sneak_no' },
        { id: 'floor.n.ticket', text: '(Wake him. Show the ticket.)', if: { member: 'tollmen' }, effects: [{ set: 'nb_floor_ok' }], next: 'in' },
        { text: 'Another time.', exit: true },
      ],
    },
    sneak_ok: { text: 'The latch lifts on a breath and you are in the dark of the hall with the board humming to itself and the clerk asleep over her ledgers.', effects: [{ set: 'nb_floor_ok' }, { set: 'nb_floor_sneaked' }, { xp: 40 }], options: [{ text: '(In.)', exit: true }] },
    sneak_no: { text: 'The latch clicks. The guard\'s eyes open without the rest of him moving. "Fifteen. Daylight." The carbine is pointed at the deck, which is a courtesy.', effects: [{ rep: { faction: 'tollmen', respect: -3 } }], options: [{ text: 'Daylight.', exit: true }] },
    courier: { text: 'He checks the seal against a card and steps aside so fast you feel the draught. "Office is at the east end. She\'s been asking."', options: [{ text: '(In.)', exit: true }] },
    odile_ok: { text: 'The name does something to his face. "Her." He steps aside. "She still drinks here? Tell her the tab\'s — never mind. In."', effects: [{ set: 'nb_floor_ok' }, { xp: 30 }], options: [{ text: '(In.)', exit: true }] },
    odile_no: { text: '"Odile Marchetti sends everyone. Fifteen."', options: [{ text: 'Fifteen, then.', next: 'intro' }] },
    talk_ok: { text: 'You say it the way the guild says things, and he decides that whoever is expecting you outranks him. "In. Don\'t touch the board."', effects: [{ set: 'nb_floor_ok' }, { xp: 40 }], options: [{ text: '(In.)', exit: true }] },
    talk_no: { text: '"Everyone\'s expected. Fifteen."', options: [{ text: 'Fifteen, then.', next: 'intro' }] },
    in: { text: 'He steps aside. "Clerk\'s at the desk. Board\'s not for touching. Office at the east end is by appointment, and she makes them."', options: [{ text: '(In.)', exit: true }] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_nb_office_door: DialogueDef = {
  id: 'd_nb_office_door', owner: 'narrator',
  start: [{ node: 'door' }],
  nodes: {
    door: {
      text: 'A container door with GRAND FACTOR stencilled on it and a brass half-moon for a knocker. From inside, the sound of a pen.',
      options: [
        { id: 'office.packet', text: '(Knock.) Courier. A packet from Tollhouse 9.', if: { item: 'k_packet' }, effects: [{ set: 'nb_office_ok' }], next: 'open' },
        { id: 'office.ticket', text: '(Knock.) Ticket-holder, with business.', if: { member: 'tollmen' }, effects: [{ set: 'nb_office_ok' }], next: 'open' },
        { id: 'office.rook', text: '(Knock.) The clerk sent me up.', if: { flag: 'nb_rook_vouch' }, effects: [{ set: 'nb_office_ok' }], next: 'open' },
        { id: 'office.talk', text: '(Knock.) I\'ve something to sell that she\'ll want to buy.', check: { skill: 'speech', dc: 45, mods: [{ if: { knows: 'odile_history' }, dc: -10, why: 'you can drop a name she has not heard in years' }] }, next: 'talk_ok', fail: 'talk_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    open: { text: '"Come." The pen does not stop.', options: [{ text: '(In.)', exit: true }] },
    talk_ok: { text: 'A pause in the pen. "Everything is for sale. Come in and name it."', effects: [{ set: 'nb_office_ok' }, { xp: 30 }], options: [{ text: '(In.)', exit: true }] },
    talk_no: { text: '"Not at that price." The pen goes on.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_nb_clerk: DialogueDef = {
  id: 'd_nb_clerk', owner: 'npc_nb_06',
  start: [{ if: { flag: 'nb_fight' }, node: 'fight' }, { if: NIGHT, node: 'asleep' }, { if: { flag: 'nb_rook_reported' }, node: 'reported' }, { if: { flag: 'nb_rook_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The floor clerk has ink on three fingers and a face arranged for not being looked at. "Lots are on the board. Sealed sheets are by the lot number; the floor takes a tenth on resale. If you\'re selling a contract, I need the paper and a thumb. If you\'re buying, I need the sum first." She does not ask what you want. People on the floor say.',
      effects: [{ set: 'nb_rook_met' }],
      passives: [
        { attr: 'senses', dc: 7, text: 'A folded sheet in her sleeve, the guild\'s paper, with the seal cut clean — a copy, by the ink on her fingers, and not for the board.', effects: [{ learn: 'nb_rook_leak' }] },
        { skill: 'science', dc: 35, text: 'The board shows lots and sums. Accounts — who paid whom — are not on it; they are in the two ledgers under her hand, which she turns face down when you look.', effects: [{ learn: 'nb_ledgers_desk' }] },
      ],
      options: [
        { id: 'rook.what', text: 'What is it you sell?', next: 'what', once: true },
        { id: 'rook.protection', text: 'The protection account. Two riders, four days, Tollhouse 9.', if: { quest: 'q_a2_ninebridge' }, next: 'protection', once: true },
        { id: 'rook.leak', text: 'You\'re copying paper. For whom?', if: { knows: 'nb_rook_leak' }, next: 'leak', once: true },
        { id: 'rook.sell', text: 'I\'ve a debt contract to sell.', if: { item: 'k_sable_contract' }, next: 'sell_contract' },
        { id: 'rook.case', text: '(Put the sealed case on the desk.) From the board at Old Market. By hand, unopened.', if: GIG_CASE, effects: GIG_CASE_DONE, next: 'case' },
        bye,
      ],
    },
    again: { text: '"Lots are on the board."', options: [{ id: 'rook.what.again', text: 'What is it you sell?', if: { not: { seen: 'rook.what' } }, next: 'what' }, { id: 'rook.protection.again', text: 'The protection account.', if: { all: [{ quest: 'q_a2_ninebridge' }, { not: { seen: 'rook.protection' } }] }, next: 'protection' }, { id: 'rook.leak.again', text: 'You\'re copying paper.', if: { all: [{ knows: 'nb_rook_leak' }, { not: { seen: 'rook.leak' } }] }, next: 'leak' }, { id: 'rook.line', text: 'The line. You said you\'d get it.', if: { all: [{ flag: 'nb_rook_deal' }, { not: { item: 'k_exchange_line' } }, { not: { knows: 'nb_paid_truth' } }] }, next: 'line' }, { id: 'rook.sell.again', text: 'I\'ve a debt contract to sell.', if: { item: 'k_sable_contract' }, next: 'sell_contract' }, { id: 'rook.case.again', text: '(Put the sealed case on the desk.) From the board at Old Market.', if: GIG_CASE, effects: GIG_CASE_DONE, next: 'case' }, bye] },
    case: { text: 'She does not open it. She does not ask. A receipt comes across the desk already written, as if the case had been expected since morning: RECEIVED — EXCHANGE FLOOR — ONE CASE, SEALED. "Tell the hatch it still ticks," she says, not looking up. "They like to know."', effects: [{ learn: 'nb_case_received' }], options: [bye] },
    case_new: { text: 'The new clerk weighs it, listens to it, and puts it under the desk without a receipt. "Half-Price\'s," he says, to the board. "Tell the hatch the floor has it."', options: [bye] },
    what: { text: '"Futures. A sealed sheet says what happens at a place on a date. You buy it, you\'re on the right side of the date. You don\'t open it; opened, it\'s news, and news is free." She says it like the rates. "Where they come from is not a floor question."', effects: [{ learn: 'nb_futures' }, { lead: 'l_futures' }], options: [bye] },
    protection: { text: 'Her pen stops for exactly as long as it takes to decide. "Accounts aren\'t lots. Accounts are the Grand Factor\'s." She turns the ledgers a quarter-inch further face down. "The floor closes at nine. I lock them in this desk." It is not clear whether that is a warning or a map.', effects: [{ learn: 'nb_ledgers_desk' }], options: [bye] },
    leak: {
      text: 'The colour goes out of her. "For — " She looks at the hall door, where the guard is, and back. "For people who\'ll be on the wrong side of a date and can\'t afford to know it. The porters. A farmer in Openfield, once." Her hands are flat on the ledgers. "Tell her and I\'m on the block by nine."',
      effects: [{ learn: 'nb_rook_confessed' }],
      options: [
        { id: 'rook.deal', text: 'Get me the protection line — two riders, four days — and I never saw a sleeve.', check: { skill: 'speech', dc: 30 }, next: 'deal_ok', fail: 'deal_no' },
        { id: 'rook.report', text: 'The Grand Factor will want to know.', effects: [{ set: 'nb_rook_told' }], next: 'report_warn' },
        { id: 'rook.keep', text: 'I didn\'t see anything.', effects: [{ set: 'nb_rook_kept' }, { trust: { npc: 'npc_nb_06', by: 20 } }, { xp: 30 }], next: 'kept' },
      ],
    },
    deal_ok: { text: '"Come back before nine." Her voice is steady and her hands are not. "And when you go up to her, say the clerk sent you. She\'ll believe that. She thinks I\'m hers."', effects: [{ set: 'nb_rook_deal' }, { set: 'nb_rook_vouch' }, { trust: { npc: 'npc_nb_06', by: 10 } }, { xp: 40 }], options: [bye] },
    deal_no: { text: '"I copy forecasts. I don\'t copy accounts. There\'s a difference and it\'s the difference between the block and the river." She will not look at you again today.', options: [bye] },
    report_warn: { text: 'She does not beg. She squares the ledgers. "Then do it before nine. I\'d rather be sold in daylight."', options: [bye] },
    kept: { text: 'She breathes out. "Thank you is a floor word. I\'ll say it anyway." A beat. "If you need the office — say the clerk sent you."', effects: [{ set: 'nb_rook_vouch' }], options: [bye] },
    line: {
      text: 'She slides a torn corner of guild paper across the desk under a lot card. In her small clerk\'s hand: PROTECTION — TOLLHOUSE 9 — TWO RIDERS, FOUR DAYS — "WESTBOUND TRAVELLER, CONFIRMED" — PAID FROM THE SARR ACCOUNT, BY ORDER OF THE FLOOR. "That\'s the line. That\'s all of it. Don\'t read it here."',
      effects: [{ give: 'k_exchange_line' }, ...TRUTH('rook')],
      options: [{ text: '(Pocket it.)', exit: true }],
    },
    sell_contract: {
      text: '"Lot four. Sable Calloway, fifty-eight and interest." She reads the paper, not the person. "The floor pays ninety; it takes its tenth off the buyer\'s end, not yours. Thumb here." She does not ask where the debtor is. The floor never does.',
      options: [
        { id: 'rook.sell.do', text: '(Sell. 90 Tolls)', effects: [{ take: 'k_sable_contract' }, { give: 'tolls', count: 90 }, { set: 'nb_sable_outcome', value: 'resold' }, { set: 'nb_sable_settled' }, { set: 'nb_sable_resold' }, { approval: { companion: 'npc_rd_03', by: -40 } }, { approval: { companion: 'npc_nb_03', by: -20 } }, { rep: { faction: 'tollmen', respect: 4 } }], next: 'sold' },
        { text: 'Not today.', exit: true },
      ],
    },
    sold: { text: 'The thumb. The sum. The paper goes into a drawer with others like it. "Lot four," she says to nobody, and writes.', options: [bye] },
    asleep: { text: 'The clerk is asleep on her folded arms over the two ledgers, ink on her cheek. The floor is dark but for the board\'s green.', options: [{ text: '(Leave her.)', exit: true }] },
    reported: { text: 'The desk is empty. The ledgers are in the Grand Factor\'s office now, and a new clerk with no ink on him is learning the board. Lot nine on the block this morning was young and knew her numbers.', options: [{ id: 'rook.case.new', text: '(Put the sealed case on the desk.) From the board at Old Market.', if: GIG_CASE, effects: GIG_CASE_DONE, next: 'case_new' }, { text: '(Nothing.)', exit: true }] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_nb_board: DialogueDef = {
  id: 'd_nb_board', owner: 'narrator',
  start: [{ if: { flag: 'nb_board_locked' }, node: 'locked' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'The board: a pre-Burn screen in a brass frame, green on black, lots scrolling — a place, a date, a sum, SEALED. NINEBRIDGE PORTERS 3RD DAY, 40. OPENFIELD HARVEST, 120. SHALE WATER 0.62, 200. A keyboard under a hinged lid, the lid padlocked, the padlock open.',
      effects: [{ learn: 'nb_board_seen' }],
      options: [
        { id: 'board.pull', text: '(Lift the lid. Find the accounts behind the lots.)', check: { skill: 'science', dc: 45, mods: [{ if: { knows: 'nb_ledgers_desk' }, dc: -5, why: 'you know the accounts are kept apart from the lots' }, { if: NIGHT, dc: -10, why: 'nobody is watching the screen but you' }] }, next: 'pull_ok', fail: 'pull_no' },
        { id: 'board.shale', text: '(Read the Shale line.)', next: 'shale', once: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
    shale: { text: 'SHALE WATER 0.62 — a sealed sheet for sale at two hundred, dated the month you were at Dry Wells. Somebody has bought one already; the lot count has gone from three to two.', effects: [{ learn: 'nb_shale_lot' }, { lead: 'l_packet_water' }], options: [{ text: '(Leave it.)', exit: true }] },
    pull_ok: {
      text: 'Behind the lots, three keys deep, the floor keeps its books in the same green. PROTECTION. The week the Tollhouse paid two riders four days: TOLLHOUSE 9 — WESTBOUND TRAVELLER, CONFIRMED — PAID, SARR ACCT, BY ORDER OF THE FLOOR. You copy it onto the back of a lot card in the dark and close the lid.',
      effects: [{ give: 'k_exchange_line' }, { set: 'nb_board_pulled' }, ...TRUTH('board')],
      options: [{ text: '(Close the lid.)', exit: true }],
    },
    pull_no: { text: 'The screen blinks, thinks, and shows you a single word — LOCKED — and a sum: FIFTEEN, for the clerk to open it again. The guard at the door has turned his head.', effects: [{ set: 'nb_board_locked' }, { rep: { faction: 'tollmen', respect: -4 } }], options: [{ text: '(Step away.)', exit: true }] },
    locked: { text: 'LOCKED, in green. The clerk will open it for fifteen and a look.', options: [{ id: 'board.unlock', text: '(Pay the clerk. 15 Tolls)', if: { all: [{ item: 'tolls', count: 15 }, { not: NIGHT }] }, effects: [{ take: 'tolls', count: 15 }, { set: 'nb_board_locked', value: false }], next: 'look' }, { text: '(Leave it.)', exit: true }] },
  },
};

export const d_nb_ledgers: DialogueDef = {
  id: 'd_nb_ledgers', owner: 'narrator',
  start: [{ if: { knows: 'nb_paid_truth' }, node: 'done' }, { if: NIGHT, node: 'night' }, { node: 'day' }],
  nodes: {
    day: {
      text: 'Two ledgers under the clerk\'s hands, face down. She does not move them and she does not look up.',
      options: [
        { id: 'ledgers.nose', text: '(Turn one over while she writes.)', check: { skill: 'stealth', dc: 55, mods: [{ if: { knows: 'nb_ledgers_desk' }, dc: -5, why: 'you know which of the two to turn' }] }, next: 'read', fail: 'caught_day' },
        { text: '(Leave them.)', exit: true },
      ],
    },
    night: {
      text: 'The clerk is asleep across the two ledgers with her cheek on the open page. The other is under her elbow.',
      options: [
        { id: 'ledgers.night', text: '(Ease the lower one out and read by the board\'s green.)', check: { skill: 'stealth', dc: 40 }, next: 'read', fail: 'caught_night' },
        { text: '(Leave them.)', exit: true },
      ],
    },
    read: {
      text: 'PROTECTION, in the clerk\'s small hand, week after week: outriders\' wages, posts, "confirmed". The week after the stranger reached your door: TOLLHOUSE 9 — TWO RIDERS, FOUR DAYS — "WESTBOUND TRAVELLER, CONFIRMED" — PAID FROM THE SARR ACCOUNT, BY ORDER OF THE FLOOR. You copy the line onto a lot card and put the ledger back the way it lay.',
      effects: [{ give: 'k_exchange_line' }, { set: 'nb_ledgers_read' }, ...TRUTH('ledgers')],
      options: [{ text: '(Put it back.)', exit: true }],
    },
    caught_day: { text: 'Her hand comes down flat on the page before yours reaches it. "Accounts aren\'t lots." The guard at the door has turned round. "Floor\'s closed to you today."', effects: [{ set: 'nb_floor_ok', value: false }, { rep: { faction: 'tollmen', respect: -5 } }, { memory: { npc: 'npc_nb_06', tag: 'grabbed_ledger', valence: -15, strength: 60 } }], options: [{ text: '(Go.)', exit: true }] },
    caught_night: { text: 'She wakes the way clerks wake, all at once and quietly. "Don\'t." A whisper. "He\'ll hear. Go out the north door and I never saw you, and don\'t come back tonight."', effects: [{ set: 'nb_floor_ok', value: false }, { memory: { npc: 'npc_nb_06', tag: 'night_ledger', valence: -10, strength: 50 } }], options: [{ text: '(Go.)', exit: true }] },
    done: { text: 'Two ledgers. You have what was in them.', options: [{ text: '(Leave them.)', exit: true }] },
  },
};

export const d_nb_sarr: DialogueDef = {
  id: 'd_nb_sarr', owner: 'npc_nb_01',
  start: [{ if: { flag: 'nb_fight' }, node: 'fight' }, { if: { not: { flag: 'nb_office_ok' } }, node: 'closed' }, { if: { flag: 'nb_sarr_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    static: { text: 'The pen stops. "For nothing." She says it the way other people say a death. "A sealed sheet is worth what it is worth because it is sealed. A girl who says the sheet aloud in a gang street is a hole in the floor." She writes a figure and turns it to you: two hundred. "The name of the street, and the tower. Riders will fetch her at dawn, with a sheet of her own, and she will be sealed where sealed things are kept, and fed, and listened to by people who pay."', options: [{ id: 'static.sell', text: 'The Saints\' tower in Bridgeward. Under the mast. (200 Tolls)', effects: [{ give: 'tolls', count: 200 }, { set: 'bw_static', value: 'sold' }, { rep: { faction: 'tollmen', respect: 8 } }, { rep: { faction: 'saints', respect: -30 } }, { xp: 80 }, { decision: { id: 'bw_static_sold', text: 'You sold the Exchange the Saints\' girl who hears the city\'s wire.' } }], next: 'static_sold' }, { text: 'I haven\'t decided.', exit: true }] },
    static_sold: { text: '"Sealed." The figure goes into the ledger under a line that says nothing about a girl. "The floor thanks you. The floor always thanks you; it is the floor\'s only expense."', options: [bye] },
    closed: { text: 'The Grand Factor does not look up. "By appointment."', options: [{ text: '(Go.)', exit: true }] },
    intro: {
      text: 'A woman of nearly sixty with silver hair swept back and a pen she has not put down since you came in. Clocks on every shelf, none of them agreeing. "Imelda Sarr. Grand Factor." She looks at you once, the way the board looks at a lot. "Everything is for sale. Say what you want and I\'ll say what it costs, and we\'ll save each other the part where you pretend it\'s free."',
      effects: [{ set: 'nb_sarr_met' }, { learn: 'sarr_seen' }],
      passives: [{ attr: 'wits', dc: 7, text: 'The clocks: each is set to a different day, not a different hour. She keeps time by dates.', effects: [{ learn: 'sarr_clocks' }] }],
      options: [
        { id: 'sarr.packet', text: '(Put the packet on the desk.) From Tollhouse 9. Sealed.', if: { all: [{ item: 'k_packet' }, { not: { flag: 'packet_opened' } }] }, next: 'packet_ok' },
        { id: 'sarr.packet.open', text: '(Put the packet on the desk.)', if: { all: [{ item: 'k_packet' }, { flag: 'packet_opened' }] }, next: 'packet_opened' },
        { id: 'sarr.what', text: 'What is it you sell here?', next: 'what', once: true },
        { id: 'sarr.paid', text: 'Who paid for the riders who shot a man at Tollhouse 9?', if: { all: [{ quest: 'q_a2_ninebridge' }, { not: { knows: 'nb_paid_truth' } }] }, next: 'paid' },
        { id: 'sarr.water', text: 'You sell Shale\'s water by the number.', if: { knows: 'packet_water' }, next: 'water', once: true },
        { id: 'sarr.rook', text: 'Your clerk copies paper for the porters.', if: { all: [{ knows: 'nb_rook_confessed' }, { not: { flag: 'nb_rook_reported' } }, { not: { flag: 'nb_rook_kept' } }] }, next: 'rook' },
        { id: 'sarr.hand', text: 'I broke your strike. I\'d like more than eighty.', if: { all: [{ flag: 'nb_strike_outcome', eq: 'broken' }, { member: 'tollmen' }, { not: { member: 'tollmen', rank: 'hand' } }] }, next: 'hand' },
        { id: 'sarr.odile', text: 'Odile Marchetti sends her regards.', if: { knows: 'odile_history' }, next: 'odile', once: true },
        { id: 'sarr.static', text: 'I know where your forecasts leak. A girl in Bridgeward hears them off the city\'s wire and says them for nothing.', if: { all: [{ knows: 'bw_immy_heard' }, { not: { flag: 'bw_static' } }] }, next: 'static' },
        { id: 'sarr.sell', text: 'I\'ve a debt contract. Lot four.', if: { item: 'k_sable_contract' }, next: 'contract' },
        bye,
      ],
    },
    again: {
      text: '"Grand Factor." The pen. "What costs?"',
      options: [
        { id: 'sarr.packet.again', text: '(Put the packet on the desk.) Sealed.', if: { all: [{ item: 'k_packet' }, { not: { flag: 'packet_opened' } }] }, next: 'packet_ok' },
        { id: 'sarr.packet.open.again', text: '(Put the packet on the desk.)', if: { all: [{ item: 'k_packet' }, { flag: 'packet_opened' }] }, next: 'packet_opened' },
        { id: 'sarr.what.again', text: 'What is it you sell here?', if: { not: { seen: 'sarr.what' } }, next: 'what' },
        { id: 'sarr.paid.again', text: 'Who paid for the riders at Tollhouse 9?', if: { all: [{ quest: 'q_a2_ninebridge' }, { not: { knows: 'nb_paid_truth' } }] }, next: 'paid' },
        { id: 'sarr.water.again', text: 'You sell Shale\'s water by the number.', if: { all: [{ knows: 'packet_water' }, { not: { seen: 'sarr.water' } }] }, next: 'water' },
        { id: 'sarr.rook.again', text: 'Your clerk copies paper for the porters.', if: { all: [{ knows: 'nb_rook_confessed' }, { not: { flag: 'nb_rook_reported' } }, { not: { flag: 'nb_rook_kept' } }] }, next: 'rook' },
        { id: 'sarr.hand.again', text: 'I broke your strike. I\'d like more than eighty.', if: { all: [{ flag: 'nb_strike_outcome', eq: 'broken' }, { member: 'tollmen' }, { not: { member: 'tollmen', rank: 'hand' } }] }, next: 'hand' },
        { id: 'sarr.odile.again', text: 'Odile Marchetti sends her regards.', if: { all: [{ knows: 'odile_history' }, { not: { seen: 'sarr.odile' } }] }, next: 'odile' },
        { id: 'sarr.static.again', text: 'A girl in Bridgeward says your forecasts for nothing.', if: { all: [{ knows: 'bw_immy_heard' }, { not: { flag: 'bw_static' } }] }, next: 'static' },
        { id: 'sarr.sell.again', text: 'I\'ve a debt contract. Lot four.', if: { item: 'k_sable_contract' }, next: 'contract' },
        { id: 'sarr.service', text: 'About the broken seal. The service.', if: { all: [{ flag: 'nb_packet_debt' }, { flag: 'nb_strike_outcome', eq: 'broken' }] }, next: 'service_done' },
        bye,
      ],
    },
    packet_ok: {
      text: 'She checks the seal against the pad of her thumb, not a card, and for the first time the pen stops. "Unopened. Nine days." She counts forty onto the desk without looking at the coins. "Bearer\'s fee. And a ticket, if you haven\'t one — the guild likes a courier who doesn\'t read." She puts the packet in a drawer that locks. "That was water, if you wondered. You didn\'t wonder. Good."',
      effects: [{ take: 'k_packet' }, { give: 'tolls', count: 40 }, { set: 'nb_packet_delivered' }, { enlist: 'tollmen', rank: 'ticket' }, { rep: { faction: 'tollmen', respect: 12 } }, { learn: 'packet_water' }, { lead: 'l_packet_water' }, { decision: { id: 'nb_packet_delivered', text: 'You carried the guild\'s packet from Tollhouse 9 to the Exchange unopened and were paid for it.' } }, { xp: 100 }],
      options: [{ text: 'Water.', next: 'water' }, bye],
    },
    packet_opened: {
      text: 'She looks at the seal for a long second and then at you with something like interest. "Opened. Then it\'s news, and news is worth nothing, and the bearer owes the floor the price of the lot." She writes a number: three hundred. "Or a service. The guild prefers services. Coin is so impersonal."',
      effects: [{ take: 'k_packet' }, { set: 'nb_packet_debt' }, { rep: { faction: 'tollmen', respect: -8 } }],
      options: [
        { id: 'sarr.debt.pay', text: '(Pay. 300 Tolls)', if: { item: 'tolls', count: 300 }, effects: [{ take: 'tolls', count: 300 }, { set: 'nb_packet_debt', value: false }, { set: 'nb_packet_paid' }], next: 'debt_paid' },
        { id: 'sarr.debt.service', text: 'What service?', next: 'service' },
        { text: 'I\'ll be back.', exit: true },
      ],
    },
    debt_paid: { text: '"Square." The number is crossed out with one line. "Most people choose the service. I\'ll remember that you didn\'t."', options: [bye] },
    service: { text: [{ if: { flag: 'nb_strike_over' }, text: '"There was a stoppage under my ramp. It\'s over, one way or the other, so that\'s gone. There\'ll be another thing. There always is." She writes DEFERRED beside the number. "I\'ll send."' }, { text: '"Forty porters under my ramp with their straps off. Put the straps on them. Esk will pay you the eighty he pays anyone; the debt is what I\'ll forgive." She goes back to the pen. "Go on."' }], effects: [{ set: 'nb_sarr_service' }, { quest: 'q_nb_strike', start: true }], options: [bye] },
    service_done: { text: '"Straps on. The number\'s gone." She crosses it out. "You\'d make a factor, if you had the patience. You don\'t."', effects: [{ set: 'nb_packet_debt', value: false }, { set: 'nb_packet_served' }, { xp: 50 }], options: [bye] },
    what: { text: '"Certainty." She does not smile. "Sealed sheets: a place, a date, what happens. Most people want to be on the right side of a date. Some want to be the date. Both pay." The pen moves. "Where the certainty comes from is a floor matter and the floor is me."', effects: [{ learn: 'nb_futures' }, { lead: 'l_futures' }], options: [bye] },
    paid: {
      text: '"The protection account." She does not pretend not to know. "Two riders, four days, a traveller walking west with something that was ours. It\'s a line in a book, and lines in books are for sale." She writes a number without looking: two hundred. "Or make me want to tell you, which is cheaper and takes longer."',
      options: [
        { id: 'sarr.paid.buy', text: '(Pay. 200 Tolls)', if: { item: 'tolls', count: 200 }, effects: [{ take: 'tolls', count: 200 }, { give: 'k_exchange_line' }, ...TRUTH('bought'), { decision: { id: 'nb_bought_line', text: 'You bought the Exchange\'s protection line from the Grand Factor for two hundred Tolls.' } }], next: 'paid_told' },
        { id: 'sarr.paid.talk', text: 'You\'ll tell me for nothing, because then I\'ll remember who told me.', check: { skill: 'speech', dc: 50, mods: [{ if: { knows: 'odile_history' }, dc: -10, why: 'Odile taught her, and you can say so' }, { if: { member: 'tollmen', rank: 'hand' }, dc: -15, why: 'a factor\'s hand is owed the floor\'s books' }, { if: { flag: 'nb_packet_delivered' }, dc: -5, why: 'you carried her paper unopened' }] }, effects: [], next: 'paid_free', fail: 'paid_no' },
        { id: 'sarr.paid.hand', text: 'I\'m a factor\'s hand. The books are mine to read.', if: { member: 'tollmen', rank: 'hand' }, effects: [{ give: 'k_exchange_line' }, ...TRUTH('hand')], next: 'paid_told' },
        { text: 'Not at that price.', exit: true },
      ],
    },
    paid_free: { text: 'She considers that for longer than she has considered anything since you came in, and then she laughs, once, short. "Yes. All right." She writes the line on a lot card in a hand like a knife and slides it across. "Two riders, four days, the Sarr account, by order of the floor. The floor is me. Remember who told you." The pen goes back to work. "That cost me nothing. Everything after it will cost you."', effects: [{ give: 'k_exchange_line' }, ...TRUTH('talked'), { xp: 60 }, { memory: { npc: 'npc_nb_01', tag: 'talked_the_line', valence: 10, strength: 60 } }], options: [bye] },
    paid_no: { text: '"No." Not unkindly. "Two hundred."', options: [{ text: 'Not at that price.', exit: true }] },
    paid_told: { text: '"The traveller was carrying paper that was ours, and paper that was ours is the floor\'s business, and the floor protects its business. That is the whole of it. It cost us two riders\' wages and it cost him more, and I would do it again at that price." She looks at you properly. "You came a long way to be told something you knew."', options: [bye] },
    water: { text: '"The city rebalances. We buy the rebalancing." She says it like a rate. "A number for a town\'s water, a date; whoever holds the sheet knows what the town will drink before the town does. Pike sells the water; I sell the knowing. The town has it worst, but the town always does."', effects: [{ learn: 'nb_water_buyer' }, { learn: 'nb_city_source' }], options: [bye] },
    rook: {
      text: 'The pen stops. "Does she." Not a question. "Amity Rook. Six years. Never late." She looks at the door to the floor. "Lot nine tomorrow, then. The floor can\'t have a leak; the whole product is the seal." A beat. "You\'ll have told me for a reason. Name it."',
      options: [
        { id: 'sarr.rook.hand', text: 'A hand\'s ticket. I\'d like to be more than a bearer.', if: { member: 'tollmen' }, effects: [{ set: 'nb_rook_reported' }, { promote: { faction: 'tollmen', rank: 'hand' } }, { decision: { id: 'nb_rook_sold', text: 'You gave the Exchange\'s clerk to the Grand Factor for a factor\'s hand\'s ticket. She went on the block.' } }, { rep: { faction: 'tollmen', respect: 15 } }, { approval: { companion: 'npc_nb_03', by: -25 } }, { approval: { companion: 'npc_rd_03', by: -15 } }, { xp: 60 }], next: 'rook_sold' },
        { id: 'sarr.rook.coin', text: 'Coin.', effects: [{ set: 'nb_rook_reported' }, { give: 'tolls', count: 100 }, { decision: { id: 'nb_rook_sold', text: 'You sold the Exchange\'s clerk to the Grand Factor for a hundred Tolls. She went on the block.' } }, { rep: { faction: 'tollmen', respect: 6 } }, { approval: { companion: 'npc_nb_03', by: -25 } }, { approval: { companion: 'npc_rd_03', by: -15 } }], next: 'rook_sold' },
        { id: 'sarr.rook.back', text: 'Nothing. Forget I said it.', effects: [{ set: 'nb_rook_told_back' }], next: 'rook_back' },
      ],
    },
    rook_sold: { text: '"Done." She writes a name on a lot card. The clocks go on disagreeing. "Fen will have her by nine. Don\'t be on the east bank; people find it hard to watch."', options: [bye] },
    rook_back: { text: '"The floor doesn\'t forget. It defers." She writes something small. "She\'ll be watched. You\'ve bought her a month, perhaps. That\'s not nothing; months are what we sell."', effects: [{ set: 'nb_rook_watched' }], options: [bye] },
    hand: { text: '"You put the straps back on forty backs with words. That\'s a factor\'s work." She takes a brass ticket with a notch in it from a drawer. "Factor\'s hand. The floor\'s books open to you; the floor\'s enemies too. Don\'t drink at the Span with it in your pocket; Lazlo\'s fond of the porters."', effects: [{ promote: { faction: 'tollmen', rank: 'hand' } }, { decision: { id: 'nb_hand', text: 'The Grand Factor made you a factor\'s hand for breaking the porters\' strike.' } }, { xp: 80 }], options: [bye] },
    odile: { text: 'The pen stops for the second time. "Does she." Something old crosses her face and is filed. "Her tab is paid. Tell her it will go on being paid. Tell her — " She stops. "Tell her nothing. She hears everything anyway." Then, drier: "Whatever she told you about me is true, and whatever she told you about herself is a trade."', effects: [{ learn: 'sarr_odile' }, { memory: { npc: 'npc_nb_01', tag: 'odile_named', valence: 5, strength: 70 } }], options: [bye] },
    contract: { text: '"The floor pays ninety for lot four. The clerk handles it; I don\'t touch paper that small." She goes back to the pen. "Unless you were going to ask me to tear it up, in which case: not at that price."', options: [bye] },
    fight: { text: 'She has not moved from the desk. "You\'ll find the guild is credit, and I am the guild. Go on, then."', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

export const d_nb_captain: DialogueDef = {
  id: 'd_nb_captain', owner: 'npc_nb_07',
  start: [{ if: { flag: 'nb_fight' }, node: 'fight' }, { if: { flag: 'nb_captain_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The captain of the deck guard stands mid-span where he can see both ramps and the planks, and does not stop seeing them to talk to you. "Dent. Weapons stay down on the deck. Trouble goes in the river. The ninth span fell on its own; everything since, somebody pushed."',
      effects: [{ set: 'nb_captain_met' }],
      options: [
        { id: 'dent.strike', text: 'The porters.', if: { knows: 'nb_strike_heard' }, next: 'strike', once: true },
        { id: 'dent.block', text: 'The block on the east bank.', next: 'block', once: true },
        { id: 'dent.span', text: 'Why hasn\'t the guild mended the span?', next: 'span', once: true },
        bye,
      ],
    },
    again: { text: '"Captain." His eyes are on the ramps.', options: [{ id: 'dent.strike.again', text: 'The porters.', if: { all: [{ knows: 'nb_strike_heard' }, { not: { seen: 'dent.strike' } }] }, next: 'strike' }, { id: 'dent.block.again', text: 'The block.', if: { not: { seen: 'dent.block' } }, next: 'block' }, { id: 'dent.span.again', text: 'The span.', if: { not: { seen: 'dent.span' } }, next: 'span' }, bye] },
    strike: { text: '"Voss is a decent man with ruined knees and the guild will starve him anyway, because it has paper that says it can." He does not lower his voice. "I keep the deck. I don\'t keep the ramp. That\'s Esk\'s, and I thank the river for it."', effects: [{ learn: 'dent_sympathy' }], options: [bye] },
    block: { text: '"Fen sells debt. Somebody has to; the guild is credit and credit has to go somewhere when it goes bad." He watches a porter not carrying. "He hates it, which is why he\'s good at it. The ones who like it get careless."', options: [bye] },
    span: { text: '"Two Tolls of planks against twelve a head to cross one at a time, slow, in sight of the guard." He almost smiles. "The guild doesn\'t mend things that pay better broken."', effects: [{ learn: 'nb_span_reason' }], options: [bye] },
    fight: { text: 'Nothing.', options: [{ text: '(Nothing.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the block

export const d_nb_lots: DialogueDef = {
  id: 'd_nb_lots', owner: 'narrator',
  start: [{ node: 'read' }],
  nodes: {
    read: {
      text: [
        { if: { flag: 'nb_sable_settled' }, text: 'TODAY\'S LOTS, in chalk. Lot four has a line through it.' },
        { text: 'TODAY\'S LOTS, in chalk. 1 — PORTER, 40, SUM 31. 2 — COOK, 55, SUM 19. 3 — CLERK, 23, SUM 70. 4 — CALLOWAY, S., 19, SUM 58 AND INTEREST. 5 — MECHANIC, 48, SUM 44. Under the fourth, smaller: OPENS 60.' },
      ],
      effects: [{ learn: 'sable_name' }, { quest: 'q_nb_auction', start: true }],
      passives: [{ if: { knows: 'wren_met' }, attr: 'wits', dc: 6, text: 'Calloway. Wren\'s name. The Sallow is not so large that it is a common one.', effects: [{ lead: 'l_sable' }, { learn: 'sable_is_wren_sister' }] }],
      options: [{ text: '(Leave it.)', exit: true }],
    },
  },
};

export const d_nb_fen: DialogueDef = {
  id: 'd_nb_fen', owner: 'npc_nb_02',
  start: [{ if: { flag: 'nb_sable_settled' }, node: 'settled' }, { if: { all: [NIGHT, { flag: 'nb_fen_help' }] }, node: 'night_help' }, { if: { not: BLOCK_HOURS }, node: 'off' }, { if: { flag: 'nb_fen_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The auctioneer is young for the voice: a bright, carrying, cheerful voice that does not reach his eyes. "Lots at nine, settled by six, no credit, the guild is credit. Lot four\'s young, if that\'s what you came for. Everyone\'s come for lot four today. I open at sixty."',
      effects: [{ set: 'nb_fen_met' }, { learn: 'sable_name' }, { quest: 'q_nb_auction', start: true }],
      passives: [{ attr: 'senses', dc: 6, text: 'His hands are shaking very slightly, and he keeps them on the counter so they don\'t show. He has looked at the cage exactly once.', effects: [{ learn: 'fen_hates_it' }] }],
      options: [
        { id: 'fen.four', text: 'Lot four.', next: 'four', once: true },
        { id: 'fen.bid', text: '(Bid.) Sixty.', if: { item: 'tolls', count: 60 }, next: 'bid' },
        { id: 'fen.hate', text: 'You hate this.', if: { knows: 'fen_hates_it' }, check: { skill: 'speech', dc: 40 }, next: 'hate_ok', fail: 'hate_no' },
        { id: 'fen.let', text: '(Let it go. Someone else will buy her.)', next: 'let_go' },
        { id: 'fen.lot7', text: 'Lot seven. The mechanic.', if: GIG_LOT7, next: 'lot7' },
        bye,
      ],
    },
    again: { text: '"Lot four. Sixty opens it."', options: [{ id: 'fen.four.again', text: 'Lot four.', if: { not: { seen: 'fen.four' } }, next: 'four' }, { id: 'fen.bid.again', text: '(Bid.) Sixty.', if: { item: 'tolls', count: 60 }, next: 'bid' }, { id: 'fen.hate.again', text: 'You hate this.', if: { all: [{ knows: 'fen_hates_it' }, { not: { seen: 'fen.hate' } }] }, check: { skill: 'speech', dc: 40 }, next: 'hate_ok', fail: 'hate_no' }, { id: 'fen.let.again', text: '(Let it go.)', next: 'let_go' }, { id: 'fen.lot7.again', text: 'Lot seven. The mechanic.', if: GIG_LOT7, next: 'lot7' }, bye] },
    lot7: {
      text: '"Lot seven. Bexley, forty-one, a mechanic, forty-eight and interest. Signed for parts he fitted to a truck that then left without him." The voice, and under it: "Nobody comes for mechanics. He\'s been on the board since spring." He looks at you properly for the first time. "Seventy opens it. There is nobody to bid against you. There never is."',
      effects: [{ learn: 'lot7_story' }],
      options: [
        { id: 'fen.lot7.pay', text: '(Bid.) Seventy.', if: { item: 'tolls', count: 70 }, effects: [{ take: 'tolls', count: 70 }, ...LOT7_SOLD], next: 'lot7_sold' },
        { id: 'fen.lot7.low', text: 'Nobody\'s bidding. Fifty, and your board is a card shorter.', if: { item: 'tolls', count: 50 }, check: { skill: 'barter', dc: 30 }, next: 'lot7_low', fail: 'lot7_firm' },
        { text: 'Not today.', exit: true },
      ],
    },
    lot7_low: { text: '"Fifty." He writes it in the voice that says sums. "Going — gone, to the stranger at fifty, and the guild can take the twenty out of my cheer." The paper comes across.', effects: [{ take: 'tolls', count: 50 }, ...LOT7_SOLD, { xp: 30 }], options: [{ text: '(Take the paper.)', next: 'lot7_sold' }] },
    lot7_firm: { text: '"Seventy opens it. The guild counts what I open at, not what I close at."', options: [{ id: 'fen.lot7.pay2', text: '(Bid.) Seventy.', if: { item: 'tolls', count: 70 }, effects: [{ take: 'tolls', count: 70 }, ...LOT7_SOLD], next: 'lot7_sold' }, { text: 'Not today.', exit: true }] },
    lot7_sold: { text: '"Lot seven." The thumb-print on the paper is a working man\'s, broad and oil-dark. "He\'s wherever the guild has him working till the paper says otherwise. Whoever you\'re buying for — " He stops himself. "I say the sums."', effects: [{ learn: 'lot7_held' }], options: [bye] },
    four: { text: '"Sable Calloway, nineteen, fifty-eight and interest. Her brother\'s debt, if you want the story — he signed and ran, and the paper doesn\'t care who signed." The voice does not change. "Service until cleared. Most buyers want a cook or a carrier. Some want nineteen." He looks at the counter. "I say the sums. I don\'t say the rest."', effects: [{ learn: 'sable_story' }], options: [bye] },
    bid: {
      text: '"Sixty from the stranger." The voice rises and the crowd leans. "Seventy from the back. Eighty — the gentleman in the coat, thank you, eighty." He looks at you. He is very slightly, under the voice, on your side.',
      options: [
        { id: 'fen.bid.ninety', text: 'Ninety.', if: { item: 'tolls', count: 90 }, effects: [{ take: 'tolls', count: 90 }, { give: 'k_sable_contract' }, { set: 'nb_sable_bought' }, { set: 'nb_sable_price', value: 90 }], next: 'sold' },
        { id: 'fen.bid.barter', text: '(Talk the room down.) The coat bought lot two for a cook. He doesn\'t want a girl, he wants to be seen.', check: { skill: 'barter', dc: 40 }, next: 'bid_low', fail: 'bid_high' },
        { text: '(Drop out.)', exit: true },
      ],
    },
    bid_low: { text: 'The coat colours, and finds he has business elsewhere, and the back goes quiet. "Seventy, then. Going — gone, to the stranger at seventy." The hammer is a tin cup on the counter.', effects: [{ take: 'tolls', count: 70 }, { give: 'k_sable_contract' }, { set: 'nb_sable_bought' }, { set: 'nb_sable_price', value: 70 }, { xp: 40 }], options: [{ text: '(Take the paper.)', next: 'sold' }] },
    bid_high: { text: '"Ninety from the coat." He will not look at you. "Against you, stranger."', options: [{ id: 'fen.bid.hundred', text: 'A hundred.', if: { item: 'tolls', count: 100 }, effects: [{ take: 'tolls', count: 100 }, { give: 'k_sable_contract' }, { set: 'nb_sable_bought' }, { set: 'nb_sable_price', value: 100 }], next: 'sold' }, { text: '(Drop out.)', exit: true }] },
    sold: { text: '"Sold." The contract comes across the counter with a thumb-print already on it that is not yours. "She\'s yours till it clears. The cage key\'s on the paper. I don\'t ask what for." Very quietly, under the voice: "Please don\'t make me wish I had."', effects: [{ learn: 'sable_held' }], options: [bye] },
    hate_ok: {
      text: 'The voice stops. What is left is a man of thirty with shaking hands. "Every day. Every lot." He looks at the cage, the second time. "I can\'t lose a lot in daylight; the guild counts. But the box isn\'t counted till nine, and I lock it badly, and I sleep by the fire on the east bank." He does not say anything else. He does not need to.',
      effects: [{ set: 'nb_fen_help' }, { trust: { npc: 'npc_nb_02', by: 20 } }, { learn: 'fen_box_tonight' }, { xp: 40 }],
      options: [{ text: 'After dark, then.', exit: true }],
    },
    hate_no: { text: 'The voice does not even flicker. "Everybody hates it, friend. I\'m paid to say the sums." He turns to the crowd. "Lot four, sixty, do I hear sixty."', options: [bye] },
    night_help: {
      text: 'He is by the fire on the east bank, awake, not looking at the block. "Box is open. Paper\'s on top. The cage key\'s under it." He looks into the fire. "If anyone asks, you stole it, and I\'ll say so with my whole chest."',
      options: [{ id: 'fen.take', text: '(Take the contract.)', effects: [{ give: 'k_sable_contract' }, { set: 'nb_sable_fen' }, { learn: 'sable_held' }, { xp: 60 }], next: 'took' }, { text: 'Not tonight.', exit: true }] },
    took: { text: '"Lot four, stolen in the night," he says to the fire, in the voice, and then not in it: "Thank you."', options: [bye] },
    let_go: { text: '"Lot four, sixty — seventy — ninety to the gentleman in the coat, going, gone." The cup on the counter. The crowd moves to lot five. Somebody opens the cage.', effects: [{ set: 'nb_sable_outcome', value: 'sold_on' }, { set: 'nb_sable_settled' }], options: [{ text: '(Walk away.)', exit: true }] },
    off: { text: 'Off the block he is somebody else: smaller, by the fire, with a cup. "Lots at nine. I don\'t sell at night; it\'s the one rule I made myself."', options: [bye] },
    settled: { text: [{ if: { all: [{ flag: 'nb_sable_outcome', eq: 'freed' }, { not: { flag: 'nb_lot7_sold' } }] }, text: '"Lot four, stolen, lost, mislaid — I\'ve said all three to the guild and they wrote down the one they liked." He almost smiles. "Lot seven\'s a mechanic. Nobody comes for mechanics."' }, { if: { flag: 'nb_lot7_sold' }, text: '"Lot eight. A carrier, thirty." The voice is back, and the board is one card shorter.' }, { text: '"Lot seven. A mechanic, forty-eight." The voice is back.' }], options: [{ id: 'fen.lot7.settled', text: 'Lot seven. The mechanic.', if: GIG_LOT7, next: 'lot7' }, bye] },
  },
};

export const d_nb_sable: DialogueDef = {
  id: 'd_nb_sable', owner: 'npc_nb_08',
  start: [{ if: { item: 'k_sable_contract' }, node: 'held' }, { if: { flag: 'nb_sable_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A young woman on a cot in a cage, knees up, who looks at you the way the lots look at the crowd: as a sum. "Sixty. I heard him. If you\'ve sixty, don\'t stand there being sorry about it."',
      effects: [{ set: 'nb_sable_met' }],
      passives: [{ if: { knows: 'wren_met' }, attr: 'senses', dc: 7, text: 'A burn scar on the inside of her left forearm, old, the shape of a hand that grabbed. Wren has one like it, on the right.', effects: [{ lead: 'l_sable' }, { learn: 'sable_is_wren_sister' }] }],
      options: [
        { id: 'sable.name', text: 'Your name?', next: 'name', once: true },
        { id: 'sable.wren', text: 'Wren.', if: { inParty: 'npc_rd_03' }, next: 'wren', once: true },
        { id: 'sable.sister', text: 'You\'ve a sister. A scout, with the Dogs.', if: { all: [{ knows: 'sable_is_wren_sister' }, { not: { inParty: 'npc_rd_03' } }] }, next: 'sister', once: true },
        bye,
      ],
    },
    again: { text: '"Still sixty."', options: [{ id: 'sable.name.again', text: 'Your name?', if: { not: { seen: 'sable.name' } }, next: 'name' }, { id: 'sable.wren.again', text: 'Wren.', if: { all: [{ inParty: 'npc_rd_03' }, { not: { seen: 'sable.wren' } }] }, next: 'wren' }, { id: 'sable.sister.again', text: 'You\'ve a sister.', if: { all: [{ knows: 'sable_is_wren_sister' }, { not: { inParty: 'npc_rd_03' } }, { not: { seen: 'sable.sister' } }] }, next: 'sister' }, bye] },
    name: { text: '"Sable. Calloway, if the paper wants it. My brother signed for a bike and rode it away and the paper doesn\'t care who signed." She looks at the chalk board. "I had a sister. Everyone had a sister once."', effects: [{ learn: 'sable_name' }, { learn: 'sable_story' }], options: [bye] },
    wren: {
      text: 'Wren has not said a word since the block came in sight. Now she steps up to the cage and says, "Sable," and the girl on the cot looks up and says nothing at all for a long time, and then, "You left," and Wren says, "I know," and that is all either of them can manage.',
      effects: [{ lead: 'l_sable' }, { learn: 'sable_is_wren_sister' }, { set: 'wren_found_sable' }, { approval: { companion: 'npc_rd_03', by: 15 } }, { memory: { npc: 'npc_rd_03', tag: 'found_sable', valence: 20, strength: 90 } }],
      options: [{ text: '(Give them a minute.)', exit: true }],
    },
    sister: { text: 'Something goes across her face and is put away. "Wren." Not a question. "Is she alive?" You tell her. "Then she can come and buy me herself." But she has turned so you cannot see her eyes.', effects: [{ learn: 'sable_knows_wren' }], options: [bye] },
    held: {
      text: [
        { if: { inParty: 'npc_rd_03' }, text: 'You hold her paper. Wren is looking at you, not at her sister.' },
        { text: 'You hold her paper. She has seen the thumb-print on it and has stopped looking at you as a sum and started looking at you as weather.' },
      ],
      options: [
        { id: 'sable.free', text: '(Give her the contract.) It\'s yours. Tear it.', effects: [{ take: 'k_sable_contract' }, { set: 'nb_sable_outcome', value: 'freed' }, { set: 'nb_sable_settled' }, { set: 'nb_sable_freed' }, { decision: { id: 'nb_sable_freed', text: 'You put Sable Calloway\'s debt contract in her own hands at the Ninebridge block.' } }, { approval: { companion: 'npc_rd_03', by: 30 } }, { approval: { companion: 'npc_nb_03', by: 10 } }, { memory: { npc: 'npc_nb_08', tag: 'freed_me', valence: 40, strength: 100 } }, { xp: 100 }], next: 'freed' },
        { id: 'sable.keep', text: '(Keep it.) You work for me until it clears.', effects: [{ set: 'nb_sable_outcome', value: 'kept' }, { set: 'nb_sable_settled' }, { set: 'nb_sable_kept' }, { approval: { companion: 'npc_rd_03', by: -35 } }, { approval: { companion: 'npc_nb_03', by: -10 } }, { memory: { npc: 'npc_nb_08', tag: 'kept_me', valence: -40, strength: 100 } }], next: 'kept' },
        { text: '(Not yet.)', exit: true },
      ],
    },
    freed: { text: 'She tears it in half and in half again, slowly, as if it might be a trick, and then she is standing outside the cage with four pieces of paper in her fist and nowhere to put them. "I\'m going west," she says. "To Shale. There was a sister." She does not thank you; she has decided not to. Then, at the ramp, she does, without turning round.', options: [{ text: '(Let her go.)', exit: true }] },
    kept: { text: 'She stands up off the cot and folds the blanket and does not look at you. "Where do you sleep? I\'ll keep it." Her voice is level. Wren, if she is here, has walked away down the deck and will not be found until morning.', options: [{ text: '(Go.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- the stalls

export const d_nb_oyo: DialogueDef = {
  id: 'd_nb_oyo', owner: 'npc_nb_09',
  start: [{ node: 'intro' }],
  nodes: {
    intro: { text: '"Guns, cells, and things that were somebody\'s." A broad woman behind a counter of oiled steel, a machine pistol slung and a boxed something under the counter she does not mention. "Guild price on the sign; your price on your face."', options: [{ text: 'Let\'s see.', effects: [{ event: 'barter' }], exit: true }, { id: 'oyo.chrome', text: 'What\'s in the box?', next: 'chrome', once: true }, bye] },
    chrome: { text: '"Chrome. Concern-made, sealed, a leg that doesn\'t tire. I don\'t fit it; the Sink has people for that, or the Mender in Shale if you\'re going back." She does not open the box. "Ask when you\'ve the coin. Everyone asks before."', effects: [{ learn: 'oyo_chrome' }], options: [bye] },
  },
};

export const d_nb_pim: DialogueDef = {
  id: 'd_nb_pim', owner: 'npc_nb_10',
  start: [{ node: 'intro' }],
  nodes: {
    intro: { text: '"Water, jerky, tins. Fruit from Openfield when the Choir sends it, and they haven\'t — blight, they say, or the guild says it for them." An old man with a goatee and a tin cup. "Eat something. You look like a forecast."', effects: [{ learn: 'openfield_blight_heard' }], options: [{ text: 'Let\'s see.', effects: [{ event: 'barter' }], exit: true }, bye] },
  },
};

// ---------------------------------------------------------------- papers

export const d_nb_futures_read: DialogueDef = {
  id: 'd_nb_futures_read', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'Guild paper, wax, the half-moon. On the outside: LOT 3 — NINEBRIDGE — DAY 2. Odile said the seal is the product. Opened, it is only news.',
      options: [
        { id: 'futures.open', text: '(Break the seal.)', effects: [{ take: 'k_futures_paper' }, { give: 'k_strike_sheet' }, { learn: 'nb_sheet_strike' }, { lead: 'l_strike_forecast' }, { xp: 30 }], next: 'read' },
        { text: '(Keep it sealed.)', exit: true },
      ],
    },
    read: { text: 'NINEBRIDGE — PORTERS\' STOPPAGE — ENDS THIRD DAY, STRAPS ON, TERMS UNCHANGED. Dated the day before the porters sat down. The hand is not the clerk\'s; it is nobody\'s — too even, every letter the same.', options: [{ text: '(Fold it.)', exit: true }] },
  },
};

export const d_packet_read: DialogueDef = {
  id: 'd_packet_read', owner: 'narrator',
  start: [{ if: { flag: 'packet_opened' }, node: 'opened' }, { node: 'sealed' }],
  nodes: {
    sealed: {
      text: 'Oilcloth, wax, the guild\'s half-moon. Lighter than it should be. The clerk at Tollhouse 9 said: opened, the bearer owes a sum nobody has.',
      options: [
        { id: 'packet.open', text: '(Break the seal.)', effects: [{ set: 'packet_opened' }, { learn: 'packet_water' }, { lead: 'l_packet_water' }, { decision: { id: 'packet_opened', text: 'You broke the seal on the guild\'s packet and read it.' } }, { xp: 20 }], next: 'opened' },
        { text: '(Leave it sealed.)', exit: true },
      ],
    },
    opened: { text: 'One sheet. SHALE — WATER — 0.62 — and a date a month after you stood at Dry Wells, and a sum, and no signature, in a hand too even to be a hand. A schedule for a town\'s thirst, sold in advance to whoever wanted to know.', options: [{ text: '(Fold it.)', exit: true }] },
  },
};

export const NINEBRIDGE_DIALOGUES: DialogueDef[] = [
  d_nb_toll, d_nb_toll_warden, d_nb_rates, d_nb_strike_sign, d_nb_voss,
  d_nb_span_sign, d_nb_hall_sign, d_nb_planks, d_nb_dust_table, d_nb_lazlo, d_nb_berth, d_nb_berth_b, d_nb_odile,
  d_nb_floor_door, d_nb_office_door, d_nb_clerk, d_nb_board, d_nb_ledgers, d_nb_sarr, d_nb_captain,
  d_nb_lots, d_nb_fen, d_nb_sable, d_nb_oyo, d_nb_pim, d_nb_futures_read, d_packet_read,
];
