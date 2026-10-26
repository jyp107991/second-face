import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Tollhouse 9: the wall on the highway. Every way through is a way the guild can see or a way it cannot;
 * both are remembered somewhere east.
 */

const bye = { text: 'That\'s all.', exit: true };
const PASS_EFFECTS = (how: string, text: string) => [{ set: 'th_admitted' }, { set: 'th_passed' }, { set: `th_${how}` }, { decision: { id: `th_${how}`, text } }, { xp: 60 }];
const NIGHT = { hour: { from: 22, to: 5 } };

export const d_th_gate: DialogueDef = {
  id: 'd_th_gate', owner: 'npc_th_01',
  start: [{ if: { flag: 'th_passed' }, node: 'stamped' }, { if: { all: [{ flag: 'rd_raid_agreed' }, { not: { flag: 'th_raided' } }] }, node: 'raid_intro' }, { if: NIGHT, node: 'night' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'The sergeant comes out from behind the sandbags with a shotgun held the easy way, pointed at the ground. "Tollhouse 9. Rates are posted. Bearer, twenty; goods by the measure; animals, we\'ll look. Pass, contract, or coin — pick one and we\'ll both have a nice day."',
      passives: [
        { attr: 'senses', dc: 7, text: 'The guard on the tower has a rifle. The one by the far posts has a stamp on a chain round his neck.', effects: [{ learn: 'th_stamp_far_posts' }] },
        { skill: 'barter', dc: 35, text: 'Twenty a head is the posted rate for strangers. The caravan people behind you paid twelve.', effects: [{ learn: 'th_toll_rate' }] },
      ],
      options: [
        { id: 'gate.pay', text: '(Pay. 20 Tolls)', if: { item: 'tolls', count: 20 }, effects: [{ take: 'tolls', count: 20 }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('paid', 'You paid the guild\'s toll at Tollhouse 9: twenty Tolls and a stamp.'), { rep: { faction: 'tollmen', respect: 3 } }], next: 'stamped_now' },
        { id: 'gate.pike', text: 'Factor Pike sends me. Post nine-west. I\'m on the seed.', if: { all: [{ knows: 'pike_seed_offer' }, { item: 'tolls', count: 10 }] }, effects: [{ take: 'tolls', count: 10 }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('pike_rate', 'You passed Tollhouse 9 at the guild\'s own rate, on Factor Pike\'s name.'), { memory: { npc: 'npc_th_01', tag: 'pike_runner', valence: 5 } }], next: 'pike_ok' },
        { id: 'gate.forged', text: '(Show the pass.)', if: { item: 'k_pass_forged' }, check: { skill: 'speech', dc: 35, mods: [{ if: NIGHT, dc: -10, why: 'lamplight is kind to paper' }, { if: { knows: 'th_stamp_far_posts' }, dc: -5, why: 'you hold it the way the stamped ones do' }] }, next: 'forged_ok', fail: 'forged_caught' },
        { id: 'gate.contract', text: '(Show the sealed packet.) Courier. Ninebridge.', if: { item: 'k_packet' }, effects: [{ give: 'k_pass_stamped' }, ...PASS_EFFECTS('contract', 'You passed Tollhouse 9 as a guild courier, carrying a sealed packet to the Exchange.')], next: 'contract_ok' },
        { id: 'gate.stranger', text: 'A masked man came west on this road three weeks ago. Shot.', if: { quest: 'q_ch1_name' }, next: 'stranger', once: true },
        { id: 'gate.who', text: 'Who are you people?', next: 'who', once: true },
        { id: 'gate.fight', text: 'I\'m not paying, and I\'m going through.', next: 'threat' },
        { text: 'I\'ll think about it.', exit: true },
      ],
    },
    night: {
      text: 'The night guard is a shape behind the sandbags and a voice behind the shape. "Rates are posted. Night rate\'s the same as the day rate. Pass, contract or coin."',
      options: [
        { id: 'gate.n.pay', text: '(Pay. 20 Tolls)', if: { item: 'tolls', count: 20 }, effects: [{ take: 'tolls', count: 20 }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('paid', 'You paid the guild\'s toll at Tollhouse 9: twenty Tolls and a stamp.'), { rep: { faction: 'tollmen', respect: 3 } }], next: 'stamped_now' },
        { id: 'gate.n.forged', text: '(Show the pass.)', if: { item: 'k_pass_forged' }, check: { skill: 'speech', dc: 25 }, next: 'forged_ok', fail: 'forged_caught' },
        { id: 'gate.n.contract', text: '(Show the sealed packet.) Courier. Ninebridge.', if: { item: 'k_packet' }, effects: [{ give: 'k_pass_stamped' }, ...PASS_EFFECTS('contract', 'You passed Tollhouse 9 as a guild courier, carrying a sealed packet to the Exchange.')], next: 'contract_ok' },
        { text: 'I\'ll come back in daylight.', exit: true },
      ],
    },
    who: {
      text: '"The guild. We own the road from here to the bridge and the bridge and the road after it. You pay us, nobody robs you between posts; if they do, we pay you. That\'s the whole idea and it works." She looks you over. "Most people have heard of us."',
      effects: [{ learn: 'th_guild_insurance' }, { learn: 'loc_ninebridge' }],
      options: [{ text: 'Rates, then.', next: 'intro' }],
    },
    stranger: {
      text: 'She doesn\'t look at the yard, which is how you know. "Nobody came through this gate in a mask. What happens on the road past the posts is the road\'s business." A pause. "If you\'ve a complaint about the road, the clerk takes complaints. In writing."',
      effects: [{ learn: 'th_sergeant_dodged' }, { lead: 'l_outriders' }],
      options: [{ text: 'Rates, then.', next: 'intro' }],
    },
    threat: {
      text: 'The shotgun comes up one inch. On the tower the rifle finds you. "Then you\'re going through the ledger as a loss, and I\'ll write it myself." Behind her the night guard has woken up. Nobody is in a hurry.',
      options: [
        { id: 'gate.draw', text: '(Draw.)', effects: [{ set: 'th_fight' }, { set: 'th_admitted' }, { decision: { id: 'th_fought_gate', text: 'You drew on the guild at the gate of Tollhouse 9.' } }, { rep: { faction: 'tollmen', fear: 10, respect: -20 } }, { event: 'combat' }], exit: true },
        { text: 'Easy. Rates, then.', next: 'intro' },
      ],
    },
    raid_intro: {
      text: 'The sergeant looks past you at the verge, where four Rust Dogs are not quite hiding, and back at you, and something in her face closes like a ledger. "Well. That answers that." The shotgun comes up.',
      options: [
        { id: 'gate.raid', text: 'Dogs. Now.', effects: [{ set: 'th_fight' }, { set: 'th_admitted' }, { set: 'th_raid_started' }, { decision: { id: 'th_raid', text: 'You brought Vasha\'s Dogs down on Tollhouse 9.' } }, { rep: { faction: 'tollmen', fear: 20, respect: -30 } }, { rep: { faction: 'rust_dogs', respect: 15 } }, { event: 'combat' }], exit: true },
        { id: 'gate.raid.off', text: 'They\'re with me. They\'ll wait. (Pay. 20 Tolls)', if: { item: 'tolls', count: 20 }, check: { skill: 'speech', dc: 50 }, effects: [{ take: 'tolls', count: 20 }, { give: 'k_pass_stamped' }, { set: 'rd_raid_agreed', value: false }, { set: 'th_raided' }, ...PASS_EFFECTS('paid', 'You paid the toll with Vasha\'s Dogs at your back, and called the raid off.'), { memory: { npc: 'npc_rd_02', tag: 'called_off_raid', valence: -25, strength: 80 } }], next: 'stamped_now', fail: 'raid_forced' },
      ],
    },
    raid_forced: { text: '"No," she says, and fires.', effects: [{ set: 'th_fight' }, { set: 'th_admitted' }, { set: 'th_raid_started' }, { decision: { id: 'th_raid', text: 'The raid on Tollhouse 9 started whether you wanted it or not.' } }, { rep: { faction: 'tollmen', fear: 20, respect: -30 } }, { event: 'combat' }], options: [{ text: '(Fight.)', exit: true }] },
    stamped_now: { text: 'The clerk stamps a pass without looking up, the sergeant tears it off and hands it over. "Bearer and goods. Keep it dry. The far posts will want to see it, and so will the bridge." She steps aside. The highway runs on east.', options: [{ text: '(Go through.)', exit: true }] },
    pike_ok: { text: '"Nine-west." She says it like a password she doesn\'t like. "Guild rate for guild business. Ten." The stamp comes down. "Tell the Factor the road\'s clear to the bridge. Tell him that\'s the last free thing he gets from me."', options: [{ text: '(Go through.)', exit: true }] },
    forged_ok: { text: 'She tilts the pass at the lamp, once, and hands it back. "Bearer and goods." The stamp comes down on it, and now it is real. The highway runs on east.', effects: [{ take: 'k_pass_forged' }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('forged', 'You passed Tollhouse 9 on a forged pass, and the guild stamped it real.')], options: [{ text: '(Go through.)', exit: true }] },
    forged_caught: { text: 'She tilts the pass at the lamp, and then at the clerk, who shakes his head. "Wrong hand. Right paper, though — I\'d like to know where you got the paper." She folds it into her pocket. "That\'s twenty for the toll and twenty for my time, or you walk back the way you came."', effects: [{ take: 'k_pass_forged' }, { memory: { npc: 'npc_th_01', tag: 'forged_pass', valence: -15, strength: 70 } }, { rep: { faction: 'tollmen', respect: -5 } }], options: [{ id: 'gate.fine', text: '(Pay. 40 Tolls)', if: { item: 'tolls', count: 40 }, effects: [{ take: 'tolls', count: 40 }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('paid_fine', 'Caught with a forged pass at Tollhouse 9, you paid double and went through.')], next: 'stamped_now' }, { text: 'I\'ll walk.', exit: true }] },
    contract_ok: { text: 'She checks the seal against a card from her pocket and her face changes by exactly one degree. "Courier." The stamp comes down free. "Don\'t open it. Don\'t lose it. Don\'t be late. The Exchange counts days." The highway runs on east.', options: [{ text: '(Go through.)', exit: true }] },
    stamped: { text: '"Stamped." The sergeant doesn\'t stop you.', options: [{ text: '(Go through.)', exit: true }] },
  },
};

export const d_th_sergeant: DialogueDef = {
  id: 'd_th_sergeant', owner: 'npc_th_01',
  start: [{ if: { flag: 'th_fight' }, node: 'hostile' }, { if: { flag: 'th_sergeant_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Sergeant Brecht. I keep the gate and the people who keep the gate." She has the look of someone who has been asked every question twice. "If it\'s about rates, they\'re posted. If it\'s about the road, the road is east, and it\'s ours."',
      effects: [{ set: 'th_sergeant_met' }],
      options: [
        { id: 'sgt.riders', text: 'The outriders. Who are they?', next: 'riders', once: true },
        { id: 'sgt.hill', text: 'What\'s the hill with the mast, east of here?', next: 'hill', once: true },
        { id: 'sgt.cage', text: 'There\'s a man in a cage in your warehouse.', if: { knows: 'seen_debt_cage' }, next: 'cage', once: true },
        { id: 'sgt.stranger', text: 'A masked man was shot on this road three weeks ago.', if: { all: [{ quest: 'q_ch1_name' }, { not: { knows: 'th_sergeant_dodged' } }] }, next: 'stranger', once: true },
        bye,
      ],
    },
    again: { text: '"Still here." It isn\'t a question.', options: [
      { id: 'sgt.riders.again', text: 'The outriders.', if: { not: { seen: 'sgt.riders' } }, next: 'riders' },
      { id: 'sgt.hill.again', text: 'The hill with the mast.', if: { not: { seen: 'sgt.hill' } }, next: 'hill' },
      { id: 'sgt.cage.again', text: 'The man in the cage.', if: { all: [{ knows: 'seen_debt_cage' }, { not: { seen: 'sgt.cage' } }] }, next: 'cage' },
      { id: 'sgt.page', text: 'Your clerk\'s ledger says the guild paid for a killing.', if: { item: 'k_ledger_page' }, next: 'page', once: true },
      bye,
    ] },
    riders: { text: '"Cass and Nikko. They ride the road between posts and they keep it clear, which is what you pay for. What they do between posts is in the ledger and the ledger is guild property." She looks at the yard for the first time. "They\'re not mine. I\'d like that written down somewhere too."', effects: [{ learn: 'outriders_named' }, { lead: 'l_outriders' }], options: [bye] },
    hill: { text: '"Signal Hill. A mast and a dead station and a voice that talks to itself. The guild doesn\'t go up there, and the guild goes everywhere." A shrug. "Track leaves the highway a day east. You\'d see the mast before you saw the track."', effects: [{ learn: 'signal_mast' }, { learn: 'loc_signalhill' }, { lead: 'l_signal_mast' }], options: [bye] },
    cage: { text: '"Tulley. He owes. The guild doesn\'t hang people and doesn\'t hit them; it counts. He\'ll count his way out by spring." She doesn\'t sound like she believes it. "Buy his paper from Rask if it bothers you. It\'s thirty-five. It bothers everyone for about a day."', effects: [{ learn: 'debtor_price' }], options: [bye] },
    stranger: { text: '"Nobody came through this gate in a mask." She says it to the wall. "Past the posts it\'s the road\'s business. The clerk takes complaints."', effects: [{ learn: 'th_sergeant_dodged' }, { lead: 'l_outriders' }], options: [bye] },
    page: { text: 'She reads it without touching it. "That\'s Sayle\'s hand and that\'s Pike\'s name." A long breath out. "I keep the gate. I don\'t keep that. Take it to someone who wants it and don\'t tell me who." She turns back to the road.', effects: [{ memory: { npc: 'npc_th_01', tag: 'saw_ledger_page', valence: 0, strength: 60 } }, { trust: { npc: 'npc_th_01', by: 5 } }], options: [bye] },
    hostile: { text: 'She has nothing to say to you that the shotgun hasn\'t.', options: [{ text: '(Back off.)', exit: true }] },
  },
};

export const d_th_clerk: DialogueDef = {
  id: 'd_th_clerk', owner: 'npc_th_02',
  start: [{ if: { flag: 'th_fight' }, node: 'hostile' }, { if: { flag: 'th_clerk_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Name, cargo, destination." He has a pen in his hand before you\'ve answered. "Stamps are twenty. Contracts are free. Complaints are in writing, and there is a fee for the paper."',
      effects: [{ set: 'th_clerk_met' }],
      passives: [{ attr: 'wits', dc: 7, text: 'The ledger is open on the desk behind him: columns of names, sums, and a column headed ROAD.', effects: [{ learn: 'ledger_on_desk' }] }],
      options: [
        { id: 'clerk.stamp', text: 'A stamp. (Pay. 20 Tolls)', if: { all: [{ item: 'tolls', count: 20 }, { not: { flag: 'th_passed' } }] }, effects: [{ take: 'tolls', count: 20 }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('paid', 'You bought a stamp at the Tollhouse 9 booth: twenty Tolls.'), { rep: { faction: 'tollmen', respect: 3 } }], next: 'stamped' },
        { id: 'clerk.contract', text: 'Contracts. What kind?', next: 'contract', once: true },
        { id: 'clerk.complaint', text: 'A complaint. A masked man was shot on your road.', if: { quest: 'q_ch1_name' }, next: 'complaint', once: true },
        { id: 'clerk.forged', text: '(Put the forged pass on the counter with ten Tolls under it.)', if: { all: [{ item: 'k_pass_forged' }, { item: 'tolls', count: 10 }] }, check: { skill: 'barter', dc: 40 }, next: 'forged_stamp', fail: 'forged_no' },
        bye,
      ],
    },
    again: { text: '"As before. Stamps, contracts, complaints."', options: [
      { id: 'clerk.stamp.again', text: 'A stamp. (Pay. 20 Tolls)', if: { all: [{ item: 'tolls', count: 20 }, { not: { flag: 'th_passed' } }] }, effects: [{ take: 'tolls', count: 20 }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('paid', 'You bought a stamp at the Tollhouse 9 booth: twenty Tolls.'), { rep: { faction: 'tollmen', respect: 3 } }], next: 'stamped' },
      { id: 'clerk.contract.again', text: 'The courier contract.', if: { all: [{ not: { seen: 'clerk.contract' } }, { not: { flag: 'th_contract' } }] }, next: 'contract' },
      { id: 'clerk.take', text: 'I\'ll take the packet.', if: { all: [{ seen: 'clerk.contract' }, { not: { flag: 'th_contract' } }, { not: { flag: 'th_passed' } }] }, next: 'contract_yes' },
      { id: 'clerk.forged.again', text: '(Put the forged pass on the counter with ten Tolls under it.)', if: { all: [{ item: 'k_pass_forged' }, { item: 'tolls', count: 10 }, { not: { seen: 'clerk.forged' } }] }, check: { skill: 'barter', dc: 40 }, next: 'forged_stamp', fail: 'forged_no' },
      bye,
    ] },
    contract: {
      text: '"One, at present. A sealed packet for the Exchange at Ninebridge. Bearer carries it unopened, by hand, within nine days. Passage free both ways on this road for the term." He turns a page toward you with a half-moon seal printed on it. "The guild pays the toll; the guild owns the days."',
      passives: [{ skill: 'barter', dc: 40, text: 'Free passage for nine days is worth more than twenty Tolls. Which means the packet is worth more than that to them.', effects: [{ learn: 'packet_worth_more' }] }],
      options: [
        { id: 'clerk.contract.yes', text: 'I\'ll carry it.', if: { not: { flag: 'th_passed' } }, next: 'contract_yes' },
        { id: 'clerk.contract.what', text: 'What\'s in it?', next: 'contract_what', once: true },
        { text: 'Not today.', next: 'again' },
      ],
    },
    contract_what: { text: '"Paper. The Exchange buys and sells paper; this is some." He does not smile. "If the seal is broken at Ninebridge the bearer owes the face value, and the face value is not written on the outside. People find that very motivating."', effects: [{ learn: 'packet_penalty' }], options: [{ id: 'clerk.contract.yes2', text: 'I\'ll carry it.', if: { not: { flag: 'th_passed' } }, next: 'contract_yes' }, { text: 'Not today.', next: 'again' }] },
    contract_yes: { text: 'He writes your description — not your name, you notice — in a column, stamps a pass, and hands you the packet. It is lighter than it looks. "Nine days. The Exchange counts them from now."', effects: [{ give: 'k_packet' }, { give: 'k_pass_stamped' }, { set: 'th_contract' }, { set: 'th_contract_day' }, { decision: { id: 'th_took_contract', text: 'You took a guild courier contract: a sealed packet to the Exchange at Ninebridge, nine days.' } }, { after: { minutes: 9 * 1440, id: 'th_packet_due', effects: [{ set: 'th_packet_late' }] } }, { lead: 'l_packet' }], options: [{ text: '(Take it.)', exit: true }] },
    complaint: { text: 'The pen stops. "The road between posts is insured for guild custom. Was the deceased guild custom?" He waits exactly long enough. "Then there is nothing to record." The pen starts again, on something else.', effects: [{ learn: 'th_clerk_stonewalled' }, { lead: 'l_outriders' }], options: [bye] },
    forged_stamp: { text: 'The ten Tolls go somewhere and the stamp comes down without the pass ever being looked at. "Bearer and goods." He is already writing the next line.', effects: [{ take: 'tolls', count: 10 }, { take: 'k_pass_forged' }, { give: 'k_pass_stamped' }, ...PASS_EFFECTS('forged', 'The clerk stamped your forged pass for ten Tolls he did not write down.'), { memory: { npc: 'npc_th_02', tag: 'took_bribe', valence: 5, strength: 60 } }], options: [{ text: '(Take it.)', exit: true }] },
    forged_no: { text: 'He looks at the pass, and then at the ten Tolls, and slides both back. "The hand is wrong and I am not that cheap." He does not call anyone. That, you understand, costs extra.', effects: [{ memory: { npc: 'npc_th_02', tag: 'refused_bribe', valence: -5 } }], options: [bye] },
    stamped: { text: '"Bearer and goods. The far posts will want to see it."', options: [{ text: '(Take it.)', exit: true }] },
    hostile: { text: 'He is under the desk and not coming out.', options: [{ text: '(Leave him.)', exit: true }] },
  },
};

/** The toll ledger on the clerk's desk: the outriders' pay, with Pike's name beside it. */
export const d_th_ledger: DialogueDef = {
  id: 'd_th_ledger', owner: 'narrator',
  start: [{ if: { flag: 'th_page_taken' }, node: 'torn' }, { if: { any: [NIGHT, { flag: 'th_fight' }] }, node: 'open' }, { node: 'watched' }],
  nodes: {
    watched: {
      text: 'The ledger lies open on the desk a yard from the clerk\'s elbow. Names, sums, a column headed ROAD. He has not looked up; he does not need to.',
      options: [
        { id: 'ledger.lift', text: '(Turn the pages while he writes.)', check: { skill: 'stealth', dc: 40, mods: [{ if: { knows: 'ledger_on_desk' }, dc: -5, why: 'you already know where to look' }] }, next: 'open', fail: 'caught' },
        { text: '(Leave it. Come back when the booth is empty.)', exit: true },
      ],
    },
    caught: { text: '"That is guild property." He hasn\'t raised his voice; he has raised a hand, and the guard at the gate has turned round. "Thirty Tolls for the paper you were about to damage, or the sergeant can explain it."', effects: [{ memory: { npc: 'npc_th_02', tag: 'caught_at_ledger', valence: -15, strength: 70 } }, { rep: { faction: 'tollmen', respect: -5 } }], options: [{ id: 'ledger.fine', text: '(Pay. 30 Tolls)', if: { item: 'tolls', count: 30 }, effects: [{ take: 'tolls', count: 30 }], exit: true }, { text: '(Walk away.)', effects: [{ rep: { faction: 'tollmen', respect: -5 } }], exit: true }] },
    open: {
      text: 'Pay lines, toll lines, a column headed ROAD. Three weeks back, in the clerk\'s tidy hand: OUTRIDERS MOHR, VANCE — four days — "one masked traveller, confirmed" — eighty Tolls — as per Factor Pike, post nine-west. A tick beside it.',
      effects: [{ learn: 'ledger_read' }, { lead: 'l_pike_paid' }, { quest: 'q_a1_ledger', start: true }],
      options: [
        { id: 'ledger.tear', text: '(Tear the page out.)', effects: [{ give: 'k_ledger_page' }, { set: 'th_page_taken' }, { decision: { id: 'th_page_taken', text: 'You tore the page naming Pike out of the Tollhouse 9 ledger.' } }, { news: { tag: 'ledger_torn', text: 'a page went missing from the Tollhouse ledger', valence: -5, size: 3, at: 'tollhouse' } }], exit: true },
        { id: 'ledger.copy', text: '(Copy the line into the notebook and leave the book as it was.)', effects: [{ set: 'th_page_copied' }], exit: true },
        { text: '(Close it.)', exit: true },
      ],
    },
    torn: { text: 'The ledger lies open where a page is missing. The clerk has not noticed, or has decided not to.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

/** The gate terminal: the stamp, in a machine, for anyone who can talk to it. */
export const d_th_terminal: DialogueDef = {
  id: 'd_th_terminal', owner: 'narrator',
  start: [{ if: { flag: 'th_passed' }, node: 'done' }, { if: { any: [NIGHT, { flag: 'th_fight' }] }, node: 'alone' }, { node: 'watched' }],
  nodes: {
    watched: { text: 'A guild terminal, pre-Burn casing, a slot for passes and a screen that says TRANSIT — POST 9 — INSERT. The clerk is a yard away.', options: [{ text: '(Not with him here.)', exit: true }] },
    alone: {
      text: 'A guild terminal, pre-Burn casing, a slot for passes and a screen that says TRANSIT — POST 9 — INSERT. Nobody is a yard away.',
      options: [
        { id: 'term.science', text: '(The pass format is a record format. Write yourself one.)', check: { skill: 'science', dc: 40, mods: [{ if: { origin: 'archive_clerk' }, dc: -15, why: 'you know the record format' }] }, next: 'hacked', fail: 'alarm' },
        { id: 'term.security', text: '(Open the casing; the stamp solenoid has a manual lever.)', check: { skill: 'security', dc: 45, mods: [{ if: { skill: 'mechanics', gte: 40 }, dc: -10, why: 'you know solenoids' }] }, next: 'hacked', fail: 'alarm' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    hacked: { text: 'The screen says COURIER — BEARER AND GOODS — POST 9 and the slot hums and gives you a pass that is, in every way the guild can check, real. Somewhere east a record says the same.', effects: [{ give: 'k_pass_stamped' }, ...PASS_EFFECTS('hacked', 'You stamped yourself through Tollhouse 9 on the gate terminal.'), { lead: 'l_terminal_record' }], options: [{ text: '(Take it.)', exit: true }] },
    alarm: { text: 'The screen says FAULT and something in the tower begins to ring, flat and patient. Boots on the apron.', effects: [{ set: 'th_alarm' }, { rep: { faction: 'tollmen', respect: -10 } }], options: [{ id: 'term.run', text: '(Get out of the booth.)', effects: [{ time: 5 }], exit: true }, { id: 'term.fight', text: '(Draw.)', effects: [{ set: 'th_fight' }, { set: 'th_admitted' }, { event: 'combat' }], exit: true }] },
    done: { text: 'TRANSIT — POST 9 — INSERT. You already have what it gives.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

/** The chain-link at the wall's north end: climbable, at night, if the lamp is looking elsewhere. */
export const d_th_fence: DialogueDef = {
  id: 'd_th_fence', owner: 'narrator',
  start: [{ if: NIGHT, node: 'night' }, { node: 'day' }],
  nodes: {
    day: { text: 'Where the concrete runs out the guild finished the wall with chain-link and barbed wire. In daylight the tower sees every inch of it.', effects: [{ learn: 'fence_climbable' }, { lead: 'l_fence_night' }], options: [{ text: '(Not now.)', exit: true }] },
    night: {
      text: 'Chain-link, barbed wire, and the tower lamp sweeping across it every minute or so. Between sweeps the wire is just wire.',
      options: [
        { id: 'fence.climb', text: '(Wait for the lamp, then climb.)', check: { skill: 'stealth', dc: 45, mods: [{ if: { inParty: 'npc_rd_03' }, dc: -10, why: 'Wren goes first and holds the wire' }] }, next: 'over', fail: 'seen' },
        { text: '(Not tonight.)', exit: true },
      ],
    },
    over: { text: 'The wire takes a piece of your sleeve and nothing else. You drop into the dark on the guild\'s side of the wall with the lamp still sweeping the road.', effects: [{ set: 'th_admitted' }, ...PASS_EFFECTS('sneaked', 'You went over the chain-link at Tollhouse 9 in the dark.'), { time: 10 }], options: [{ text: '(Go.)', exit: true }] },
    seen: { text: 'Halfway up, the lamp comes back early. You drop and lie in the salt crust with the light on your back for a long ten seconds, and then it moves on. Not this sweep.', effects: [{ time: 20 }, { learn: 'fence_lamp_early' }], options: [{ text: '(Wait, then try again.)', exit: true }] },
  },
};

export const d_th_rates: DialogueDef = {
  id: 'd_th_rates', owner: 'narrator',
  start: [{ node: 'read' }],
  nodes: { read: { text: 'TOLLHOUSE 9 — RATES POSTED. Bearer 20. Goods by the measure. Animals by inspection. Guild custom 12. Contracts at the booth. THE ROAD IS INSURED BETWEEN POSTS. Someone has scratched under it: FOR WHOM.', effects: [{ learn: 'th_toll_rate' }], options: [{ text: '(Done.)', exit: true }] } },
};

export const d_th_bikes: DialogueDef = {
  id: 'd_th_bikes', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: { look: { text: 'Two bikes on their stands, fuel cans chained to the frames, the guild\'s half-moon on each tank. One has a rifle scabbard, oiled. The tyres have salt in the tread from somewhere west.', passives: [{ skill: 'survival', dc: 35, text: 'The salt is salt-pan salt. The pan is the road the stranger took to Shale.', effects: [{ lead: 'l_bikes_salt' }] }], effects: [{ learn: 'seen_outrider_bikes' }], options: [{ text: '(Leave them.)', exit: true }] } },
};

export const d_th_outrider_a: DialogueDef = {
  id: 'd_th_outrider_a', owner: 'npc_th_04',
  start: [{ if: { any: [{ flag: 'th_fight' }, { flag: 'th_outriders_hostile' }] }, node: 'hostile' }, { if: { knows: 'outriders_confessed' }, node: 'after' }, { if: { flag: 'th_cass_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'He is cleaning a carbine on an oilcloth across his knees and does not stop. "Yard\'s guild. You\'re not." He looks up. "Unless you\'re buying fuel, in which case you\'re not either, because we don\'t sell it."',
      effects: [{ set: 'th_cass_met' }],
      options: [
        { id: 'cass.road', text: 'You ride the road west. Toward Shale.', next: 'road', once: true },
        { id: 'cass.mask', text: 'Three weeks ago. A man in a mask, on the salt pan. You shot him.', if: { any: [{ quest: 'q_ch1_name' }, { lead: 'l_outriders' }] }, next: 'mask' },
        { text: 'Just looking.', exit: true },
      ],
    },
    again: { text: '"Still not buying fuel."', options: [{ id: 'cass.mask.again', text: 'The man in the mask, on the salt pan.', if: { any: [{ quest: 'q_ch1_name' }, { lead: 'l_outriders' }] }, next: 'mask' }, { text: 'Just looking.', exit: true }] },
    road: { text: '"Between posts. That\'s the job. Nobody robs guild custom between posts, and if somebody tries, somebody doesn\'t get to try twice." The cloth moves. "Shale isn\'t a post. Shale\'s a place the road goes past."', effects: [{ learn: 'outriders_patrol_west' }], options: [{ id: 'cass.mask2', text: 'Three weeks ago. A man in a mask, on the salt pan.', if: { any: [{ quest: 'q_ch1_name' }, { lead: 'l_outriders' }] }, next: 'mask' }, { text: 'Noted.', exit: true }] },
    mask: {
      text: 'The cloth stops. Across the yard Nikko has stopped too. "Lot of people on the road," he says. "Lot of masks. Choir wear them. Dust-walkers wear them." He looks at the carbine instead of you. "Who\'s asking?"',
      options: [
        { id: 'cass.page', text: '(Show him the ledger page.) The guild\'s asking. Eighty Tolls, four days, confirmed.', if: { item: 'k_ledger_page' }, next: 'confess' },
        { id: 'cass.speech', text: 'Someone he walked thirty miles to die in front of. He had my face. You\'ll have seen it.', check: { skill: 'speech', dc: 45, mods: [{ if: { knows: 'ledger_read' }, dc: -15, why: 'you know the sum and the days' }, { if: { attr: 'presence', gte: 7 }, dc: -5, why: 'he can\'t quite look away' }] }, next: 'confess', fail: 'deny' },
        { id: 'cass.draw', text: '(Draw.)', effects: [{ set: 'th_outriders_hostile' }, { decision: { id: 'th_outriders_fought', text: 'You drew on the guild\'s outriders in their own yard.' } }, { rep: { faction: 'tollmen', fear: 8, respect: -15 } }, { event: 'combat' }], exit: true },
        { text: 'Nobody. Yet.', exit: true },
      ],
    },
    deny: { text: '"Then nobody shot anybody." He goes back to the carbine. Nikko doesn\'t.', effects: [{ memory: { npc: 'npc_th_04', tag: 'asked_about_mask', valence: -10, strength: 60 } }], options: [{ text: '(Leave it. For now.)', exit: true }] },
    confess: {
      text: 'He puts the cloth down. "A contract. Paper from nine-west: one traveller, masked, westbound, confirmed and paid on confirmation." He says it flat, like reading it. "We confirmed. He walked off it. I\'ve never seen anyone walk off that." Nikko, behind you: "Cass."  "She can hear it. Everyone can hear it. Contracts don\'t have faces." He looks at yours. "His did."',
      effects: [{ learn: 'outriders_confessed' }, { lead: 'l_outriders_confessed' }, { decision: { id: 'outriders_confessed', text: 'The guild\'s outriders admitted shooting the stranger on a contract from Pike.' } }, { xp: 60 }],
      options: [
        { id: 'cass.kill', text: '(Draw.)', effects: [{ set: 'th_outriders_hostile' }, { decision: { id: 'th_outriders_fought', text: 'You drew on the outriders after they admitted it.' } }, { rep: { faction: 'tollmen', fear: 8, respect: -15 } }, { event: 'combat' }], exit: true },
        { id: 'cass.name', text: 'Say the name on the paper.', next: 'name', once: true },
        { text: '(Walk away.)', exit: true },
      ],
    },
    name: { text: '"Pike. Factor, post nine-west. It\'s on the paper, and the paper is in the booth, and the booth is the guild\'s." He picks the cloth up again. "You want someone to be sorry, you\'re in the wrong yard. Sorry isn\'t a column."', effects: [{ lead: 'l_pike_paid' }], options: [{ text: '(Walk away.)', exit: true }] },
    after: { text: 'He doesn\'t look up. "Said what I said."', options: [{ id: 'cass.kill.after', text: '(Draw.)', effects: [{ set: 'th_outriders_hostile' }, { rep: { faction: 'tollmen', fear: 8, respect: -15 } }, { event: 'combat' }], exit: true }, { text: '(Leave him.)', exit: true }] },
    hostile: { text: 'The carbine is not on the oilcloth any more.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_th_outrider_b: DialogueDef = {
  id: 'd_th_outrider_b', owner: 'npc_th_05',
  start: [{ if: { any: [{ flag: 'th_fight' }, { flag: 'th_outriders_hostile' }] }, node: 'hostile' }, { if: { knows: 'outriders_confessed' }, node: 'after' }, { node: 'intro' }],
  nodes: {
    intro: { text: '"Cass does the talking." She is sitting on a tyre with her boots off, and she does not stop looking at the gate. "I do the other thing. Ask him."', passives: [{ attr: 'senses', dc: 8, text: 'Her hands are not steady. She has put them under her thighs so you won\'t see.', effects: [{ learn: 'nikko_shaken' }] }], options: [{ id: 'nikko.sleep', text: 'You said you sleep fine.', if: { knows: 'nikko_shaken' }, next: 'sleep', once: true }, { text: 'I will.', exit: true }] },
    sleep: { text: '"I do." A long pause. "He said something. When he was down. Not to us — past us, west. One word." She looks at you for the first time. "If you\'re from where he was going, you know it. I don\'t want to."', effects: [{ learn: 'nikko_heard_word' }, { lead: 'l_nikko_word' }], options: [{ text: '(Leave her.)', exit: true }] },
    after: { text: '"Told you. Cass does the talking." She has her boots on now.', options: [{ text: '(Leave her.)', exit: true }] },
    hostile: { text: 'The revolver is already out.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_th_quartermaster: DialogueDef = {
  id: 'd_th_quartermaster', owner: 'npc_th_03',
  start: [{ if: { flag: 'th_fight' }, node: 'hostile' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Guild prices. Guild water. Guild everything." She doesn\'t get up. "Shelf\'s for sale. Cage isn\'t, unless you\'re buying the paper on him, which is thirty-five, which nobody ever does."',
      options: [
        { text: 'Let\'s see the shelf.', effects: [{ event: 'barter' }], exit: true },
        { id: 'qm.debtor', text: 'The paper on the man in the cage. (Pay. 35 Tolls)', if: { all: [{ item: 'tolls', count: 35 }, { not: { flag: 'th_debtor_freed' } }] }, effects: [{ take: 'tolls', count: 35 }, { set: 'th_debtor_freed' }, { decision: { id: 'th_debtor_freed', text: 'You bought Oren Tulley\'s debt from the guild and let him walk.' } }, { news: { tag: 'debtor_freed', text: 'someone bought a debtor out of the Tollhouse cage', valence: 10, size: 4, at: 'tollhouse' } }, { rep: { faction: 'tollmen', respect: 2 } }, { xp: 40 }], next: 'freed' },
        bye,
      ],
    },
    freed: { text: 'She writes PAID across a line without looking at it and shouts "Tulley!" toward the cage. "Gate\'s open. Don\'t fix anything on the way out."', options: [bye] },
    hostile: { text: 'She has a shotgun under the counter and both hands on it.', options: [{ text: '(Back off.)', exit: true }] },
  },
};

export const d_th_debtor: DialogueDef = {
  id: 'd_th_debtor', owner: 'npc_th_06',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: '"Thirty-one days." He says it before you ask. "I fixed their pump for a tank of water and the tank was short, so I said so, and saying so is a fee." He sits on the cot like a man who has learned the exact size of it. "Rask has the paper. Thirty-five. I had thirty-four once."',
      effects: [{ learn: 'debtor_price' }, { learn: 'debtor_story' }],
      options: [
        { id: 'debtor.pumps', text: 'You fix pumps?', next: 'pumps', once: true },
        { text: 'I\'ll see what I can do.', exit: true },
      ],
    },
    pumps: { text: '"Fixed. Past tense. There\'s a well-town west of here with two pumps that run on their own clock, and I\'d have liked a look at those." He shrugs. "Dry Wells, east, the station there — that one answers to somebody. Everything with a pipe in it answers to somebody."', effects: [{ learn: 'debtor_pump_talk' }, { lead: 'l_drywells_station' }], options: [{ text: 'Noted.', exit: true }] },
  },
};

export const d_th_caravan: DialogueDef = {
  id: 'd_th_caravan', owner: 'npc_th_07',
  start: [{ if: { flag: 'th_caravan_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Oduya. I run the guild\'s caravan from Shale to the bridge and back, which means I run it from here to the bridge and back, because Shale can\'t pay for the other leg." She pours you something from a kettle without asking. "Walking east? Everyone is. It\'s where the road goes."',
      effects: [{ set: 'th_caravan_met' }, { learn: 'loc_ninebridge' }],
      options: [
        { id: 'car.east', text: 'What\'s east?', next: 'east', once: true },
        { id: 'car.ride', text: 'Can I ride with you?', next: 'ride', once: true },
        { id: 'car.stranger', text: 'A masked man came west on this road. Did you see him?', if: { quest: 'q_ch1_name' }, next: 'stranger', once: true },
        bye,
      ],
    },
    again: { text: '"Kettle\'s on."', options: [{ id: 'car.east.again', text: 'What\'s east?', if: { not: { seen: 'car.east' } }, next: 'east' }, { id: 'car.ride.again', text: 'Riding with you.', if: { not: { seen: 'car.ride' } }, next: 'ride' }, bye] },
    east: { text: '"A day of highway, then the track north to the hill with the mast — don\'t — then the glass, then Ninebridge, which is a bridge with a town on it and a market where they sell things that haven\'t happened yet." She lets that sit. "Then the city. I don\'t go to the city."', effects: [{ learn: 'loc_signalhill' }, { learn: 'loc_ninebridge' }, { learn: 'signal_mast' }], options: [bye] },
    ride: { text: '"Twelve to ride, or work your passage: guard, cook, carry. Leaves when the guild says, every three days, from the gate." She nods at the wall. "Stamp first. The caravan doesn\'t argue with the wall either."', effects: [{ learn: 'caravan_fare' }], options: [bye] },
    stranger: { text: '"Saw where he\'d been. Blood on the salt pan a day west, going the wrong way — toward the salt cut, not away from it." She looks into her cup. "The outriders came back that night with the bikes very clean."', effects: [{ learn: 'caravan_saw_blood' }, { lead: 'l_outriders' }], options: [bye] },
  },
};
