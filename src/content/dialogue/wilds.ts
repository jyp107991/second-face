import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * The road: what the people on it say when a trip stops. Each tree opens on arrival at a roadside map; leaving the
 * map continues the trip. Fights happen on the roadside map through the usual combat event.
 */

const on = { text: '(Walk on.)', exit: true };

/** The guild's outriders, who insure the road for guild custom and nobody else. */
export const d_re_patrol: DialogueDef = {
  id: 'd_re_patrol', owner: 'npc_w_outrider_a',
  start: [{ if: { flag: 're_patrol_hostile' }, node: 'hostile' }, { if: { flag: 'th_raid' }, node: 'raid' }, { node: 'halt' }],
  nodes: {
    halt: {
      text: 'Two bikes across the track, engines ticking as they cool, and a man with a ledger open on the tank. "Guild road." He does not look up yet. "Papers, or the rate."',
      passives: [{ skill: 'barter', dc: 30, text: 'The ledger has a column headed FEES and no column headed RECEIPTS. Whatever you pay here stays here.', effects: [{ learn: 'patrol_skims' }] }],
      options: [
        { id: 'patrol.pass', text: '(Show the stamped pass.)', if: { item: 'k_pass_stamped' }, next: 'passed' },
        { id: 'patrol.packet', text: '(Show the sealed packet.) Courier. Ninebridge.', if: { item: 'k_packet' }, next: 'courier' },
        { id: 'patrol.pay', text: '(Pay the rate. 5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }, { rep: { faction: 'tollmen', respect: 2 } }], next: 'paid' },
        { id: 'patrol.skim', text: 'There\'s no receipts column in that book. I\'ll pay the post, not you.', if: { knows: 'patrol_skims' }, check: { skill: 'speech', dc: 35 }, next: 'skim', fail: 'skim_no' },
        { id: 'patrol.fence', text: '(The pass is forged, or there is no pass.) I came through the gate like anyone.', if: { not: { item: 'k_pass_stamped' } }, check: { skill: 'speech', dc: 40, mods: [{ if: { flag: 'th_forged' }, dc: -10, why: 'you have told this story before' }] }, next: 'bluffed', fail: 'bluff_no' },
        { id: 'patrol.fight', text: '(Draw.)', effects: [{ set: 're_patrol_hostile' }, { rep: { faction: 'tollmen', fear: 6, respect: -12 } }, { event: 'combat' }], exit: true },
        { text: '(Turn back and go round.)', effects: [{ time: 90 }], exit: true },
      ],
    },
    passed: { text: 'He checks the stamp against a card from his pocket, writes a line, and closes the book. "Bearer and goods. As per." The bikes do not move; you go round them.', effects: [{ learn: 'patrol_met' }], options: [on] },
    courier: { text: 'The seal gets a longer look than you do. "Courier." He writes your description in the book, not your name, the way the clerk did. "The road is yours. Don\'t open it."', effects: [{ learn: 'patrol_met' }, { rep: { faction: 'tollmen', respect: 3 } }], options: [on] },
    paid: { text: 'The coins go into a pocket, not the tank bag. A line in the book. "Guild thanks you for your custom."', effects: [{ learn: 'patrol_met' }], options: [on] },
    skim: { text: 'The pen stops. The other rider finds something interesting on the horizon. "Post nine-west will have your description," he says, and then, closing the book: "Go on."', effects: [{ learn: 'patrol_met' }, { set: 'patrol_caught_skimming' }, { memory: { npc: 'npc_w_outrider_a', tag: 'caught_skimming', valence: -20, strength: 80 } }, { xp: 40 }], options: [on] },
    skim_no: { text: '"The rate is the rate." He writes something longer than a line. "Five. Or the road is closed to you between here and the post, which is a long way round."', options: [{ id: 'patrol.skim.pay', text: '(Pay. 5 Tolls)', if: { item: 'tolls', count: 5 }, effects: [{ take: 'tolls', count: 5 }], next: 'paid' }, { text: '(Turn back and go round.)', effects: [{ time: 90 }], exit: true }] },
    bluffed: { text: 'He looks at you the way the gate did. "Everyone comes through the gate like anyone." But he writes nothing, and the bikes do not move, and you go round.', effects: [{ learn: 'patrol_met' }, { xp: 30 }], options: [on] },
    bluff_no: { text: '"No stamp." He says it to the other rider, not to you. "No stamp is a fee." Ten Tolls, or the road closes.', options: [{ id: 'patrol.bluff.pay', text: '(Pay. 10 Tolls)', if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }], next: 'paid' }, { id: 'patrol.bluff.fight', text: '(Draw.)', effects: [{ set: 're_patrol_hostile' }, { rep: { faction: 'tollmen', fear: 6, respect: -12 } }, { event: 'combat' }], exit: true }, { text: '(Turn back and go round.)', effects: [{ time: 90 }], exit: true }] },
    raid: { text: 'The ledger closes before you have reached the bikes. "You." The rider\'s hand is on the carbine. "The gate at nine. You were with the Dogs." There is nothing to show him.', effects: [{ set: 're_patrol_hostile' }], options: [{ id: 'patrol.raid.fight', text: '(Draw.)', effects: [{ event: 'combat' }], exit: true }, { text: '(Run for the rough.)', check: { attr: 'reflex', dc: 6 }, effects: [{ time: 30 }], next: 'ran', fail: 'ran_no' }] },
    ran: { text: 'The bikes don\'t do rock. You lose them in the first gully and your breath in the second.', options: [on] },
    ran_no: { text: 'The first shot is over your head. The second is not meant to be.', effects: [{ event: 'combat' }], options: [{ text: '(Fight.)', exit: true }] },
    hostile: { text: 'Nobody is talking.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

/** A drifter at a dead fire with a leg gone bad, and a story nobody believes. */
export const d_re_drifter: DialogueDef = {
  id: 'd_re_drifter', owner: 'npc_w_drifter',
  start: [{ if: { flag: 're_drifter_done' }, node: 'again' }, { node: 'fire' }],
  nodes: {
    fire: {
      text: 'A man by a fire that went out a day ago, one leg out straight in front of him and the trouser cut away above a knee that is the wrong colour. He has the machete across his lap and does not lift it. "Don\'t," he says. "Whatever it is. Just don\'t."',
      passives: [
        { skill: 'medicine', dc: 25, text: 'Not a bite: a cut, deep, a week old, gone septic. A knitkit and a clean dressing would save the leg today. Tomorrow is a different question.', effects: [{ learn: 'drifter_septic' }] },
        { skill: 'survival', dc: 30, text: 'His pack has been gone through, by him, several times. Water: none. He has been here two days.', effects: [{ learn: 'drifter_dry' }] },
      ],
      options: [
        { id: 'drifter.treat', text: '(Treat the leg. A knitkit, a bandage.)', if: { all: [{ item: 'c_knitkit' }, { item: 'c_bandage' }] }, effects: [{ take: 'c_knitkit' }, { take: 'c_bandage' }, { set: 're_drifter_done' }, { set: 'drifter_saved' }, { trust: { npc: 'npc_w_drifter', by: 40 } }, { decision: { id: 'drifter_saved', text: 'You treated a dying drifter\'s leg on the road.' } }, { news: { tag: 'saved_drifter', text: 'the salt-cut stranger stopped for a drifter on the road and doctored a leg nobody else would have', valence: 10, size: 4, at: 'shale' } }, { xp: 60 }], next: 'treated' },
        { id: 'drifter.water', text: '(Give him water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { trust: { npc: 'npc_w_drifter', by: 15 } }, { xp: 20 }], next: 'water' },
        { id: 'drifter.kite', text: 'What happened to the leg?', next: 'kite', once: true },
        { id: 'drifter.rob', text: '(Take the machete and the pack.)', effects: [{ set: 're_drifter_done' }, { set: 'drifter_robbed' }, { give: 'w_machete' }, { give: 'j_cloth', count: 2 }, { decision: { id: 'drifter_robbed', text: 'You robbed a dying drifter on the road.' } }, { news: { tag: 'robbed_drifter', text: 'someone stripped a crippled drifter on the salt track and left him', valence: -15, size: 4, at: 'shale' } }], next: 'robbed' },
        { text: '(Leave him.)', effects: [{ set: 're_drifter_done' }], exit: true },
      ],
    },
    kite: { text: '"A kite." He watches you not believe it. "Big wings, no bird in them. It came down on the pan at dusk and sat, and I went to look, because I\'m a fool, and something on it opened and I ran, and I fell on my own blade. I know. I know how it sounds." A shrug. "It\'s still out there. South, on the white."', effects: [{ learn: 'drifter_kite' }, { lead: 'l_kite_seen' }, { lead: 'l_kite_on_the_pan' }], options: [{ text: 'Noted.', next: 'fire' }] },
    treated: { text: 'He makes a noise through his teeth while the knitkit does its work, and then another, different noise. "Amory," he says. "Pell Amory. I don\'t forget a face. I\'ll be in Shale if the leg holds and at the overpass if it doesn\'t, and either way I owe you a thing I can\'t name yet." He gives you the machete. "I\'ll get another."', effects: [{ give: 'w_machete' }, { lead: 'l_drifter_owes' }], options: [on] },
    water: { text: 'He drinks half and stops himself, which is the hardest thing you have seen anyone do this week. "Amory. Pell." He looks at the leg. "If you\'ve got anything for this, I\'m listening. If you haven\'t, go on, and don\'t look back, I hate that."', options: [{ id: 'drifter.treat2', text: '(Treat the leg. A knitkit, a bandage.)', if: { all: [{ item: 'c_knitkit' }, { item: 'c_bandage' }] }, effects: [{ take: 'c_knitkit' }, { take: 'c_bandage' }, { set: 're_drifter_done' }, { set: 'drifter_saved' }, { trust: { npc: 'npc_w_drifter', by: 40 } }, { decision: { id: 'drifter_saved', text: 'You treated a dying drifter\'s leg on the road.' } }, { xp: 60 }], next: 'treated' }, { text: '(Leave him.)', effects: [{ set: 're_drifter_done' }], exit: true }] },
    robbed: { text: 'He does not fight you for it. "Fine," he says, to the fire that is out. "Fine."', options: [on] },
    again: { text: 'He has nothing left to say to you.', options: [on] },
  },
};

/** Rust Dog scouts a long way from the overpass, wanting water. */
export const d_re_scouts: DialogueDef = {
  id: 'd_re_scouts', owner: 'npc_w_scout_a',
  start: [{ if: { flag: 're_scouts_fight' }, node: 'hostile' }, { if: { rep: { faction: 'rust_dogs', respect: 30 } }, node: 'known' }, { if: { inParty: 'npc_rd_03' }, node: 'wren' }, { node: 'halt' }],
  nodes: {
    halt: {
      text: 'Two of them come up out of the ditch where they were lying in the shade, scrap plates and a sawn-off and a zip gun, and the one with the gun says what they all say. "Water. Then we\'ll see."',
      passives: [{ attr: 'senses', dc: 7, text: 'They are a long way from the overpass on foot, and the one with the zip gun is counting her rounds with her thumb. Scouts, not a raid.', effects: [{ learn: 'scouts_thin' }] }],
      options: [
        { id: 'scouts.water', text: '(Hand over a water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { rep: { faction: 'rust_dogs', respect: 3 } }], next: 'watered' },
        { id: 'scouts.kessler', text: 'Kessler knows my face. Say my name at the overpass and see what it buys you.', if: { knows: 'kessler_name' }, check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'scouts_thin' }, dc: -10, why: 'they want a reason to go home' }, { if: { rep: { faction: 'rust_dogs', respect: 15 } }, dc: -10, why: 'the Dogs have heard of you' }] }, next: 'named', fail: 'named_no' },
        { id: 'scouts.fear', text: '(Say nothing. Let them look at you.)', if: { rep: { faction: 'rust_dogs', fear: 20 } }, next: 'feared' },
        { id: 'scouts.fight', text: '(Draw.)', effects: [{ set: 're_scouts_fight' }, { event: 'combat' }], exit: true },
        { text: '(Back off into the rough.)', effects: [{ time: 60 }], exit: true },
      ],
    },
    watered: { text: 'He drinks, passes it, and the woman drinks the rest without taking her eyes off you. "Shale\'s," he says, of the water, tasting it. "Pipe. Go on, then."', options: [on] },
    named: { text: 'The name does something to the man\'s face. "Kessler\'s." He looks at the woman. She shrugs. "Then you\'re Kessler\'s problem," he says, and sits back down in the ditch.', effects: [{ rep: { faction: 'rust_dogs', respect: 3 } }, { xp: 30 }], options: [on] },
    named_no: { text: '"Everybody knows Kessler." The sawn-off comes up a little. "Water."', options: [{ id: 'scouts.water2', text: '(Hand over a water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }], next: 'watered' }, { id: 'scouts.fight2', text: '(Draw.)', effects: [{ set: 're_scouts_fight' }, { event: 'combat' }], exit: true }, { text: '(Back off into the rough.)', effects: [{ time: 60 }], exit: true }] },
    feared: { text: 'You do not say anything. After a while the woman says a name that is yours, and something that was done at the overpass, and the man lowers the sawn-off and looks at the ditch as if it had been his idea to sit there.', effects: [{ xp: 30 }], options: [on] },
    known: { text: 'They know you before you are close enough to be a threat, and the greeting is a lifted hand and a lowered gun. "Kessler\'s friend." The man grins with what teeth he has. "Water, if you\'ve got it. We\'re a long way from the pipe."', options: [{ id: 'scouts.known.water', text: '(Hand over a water.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { rep: { faction: 'rust_dogs', respect: 3 } }], next: 'watered' }, on] },
    wren: { text: '"Calloway." The man says it before Wren has said anything. "Thought you were dead, or Shale, which is the same." Wren says nothing for long enough that he looks away first. "Go on," he says, to you.', effects: [{ approval: { companion: 'npc_rd_03', by: 3 } }], options: [on] },
    hostile: { text: 'Nobody is talking.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

/** A rider of the Wheel at a trough that should be dry. */
export const d_re_wheel: DialogueDef = {
  id: 'd_re_wheel', owner: 'npc_w_wheel',
  start: [{ if: { flag: 're_wheel_met' }, node: 'again' }, { node: 'trough' }],
  nodes: {
    trough: {
      text: 'Two horses at a stone trough with water in it, which is impossible, and a grey man in a long coat filling it from a skin without hurry. He has seen you for a mile. "Horses first," he says. "Then you."',
      effects: [{ set: 're_wheel_met' }, { learn: 'wheel_met_rider' }, { lead: 'l_wheel_passing' }],
      passives: [{ skill: 'survival', dc: 30, text: 'The trough is fed: a buried line, a tap, a stone to hide it. The Wheel has water on roads nobody else knows have it.', effects: [{ learn: 'wheel_troughs' }] }],
      options: [
        { id: 'wheel.who', text: 'The Wheel. Forty wagons. I\'ve heard of you.', next: 'who', once: true },
        { id: 'wheel.trade', text: 'Trade?', effects: [{ event: 'barter' }], exit: true },
        { id: 'wheel.where', text: 'Where is the Wheel now?', if: { seen: 'wheel.who' }, next: 'where', once: true },
        { text: '(Leave him to his horses.)', exit: true },
      ],
    },
    who: { text: '"Forty-one, since spring." He pats the near horse. "A town that moves. We trade with everyone and owe no one, and we go where the water is, which is never where the map says." He looks at you properly for the first time. "You walk like someone with a long way to go and no horse. The Wheel has horses."', effects: [{ learn: 'wheel_has_horses' }], options: [{ text: 'Noted.', next: 'trough' }] },
    where: { text: '"East of the dead pumps, this month, in the lee of the hill. Next month, who knows; the mother does." He names her: Sefa. "Come with something to trade and a horse\'s worth of manners and they\'ll feed you. Come with the guild\'s paper and they\'ll feed you to the dogs."', effects: [{ learn: 'wheel_sefa' }, { learn: 'wheel_near_windpumps' }, { lead: 'l_wheel_where' }, { xp: 30 }], options: [{ text: 'Noted.', next: 'trough' }] },
    again: { text: '"Still here. The horses drink slow."', options: [{ id: 'wheel.trade.again', text: 'Trade?', effects: [{ event: 'barter' }], exit: true }, { id: 'wheel.where.again', text: 'Where is the Wheel now?', if: { all: [{ seen: 'wheel.who' }, { not: { seen: 'wheel.where' } }] }, next: 'where' }, { text: '(Leave him to his horses.)', exit: true }] },
  },
};

/** A man walking the wrong way at night with his hand on the air. */
export const d_re_walker: DialogueDef = {
  id: 'd_re_walker', owner: 'npc_w_walker',
  start: [{ node: 'night' }],
  nodes: {
    night: {
      text: 'A man on the track at night, walking east with one hand held out in front of him flat, palm down, as if the air were a wall he was following. No pack. No water. He does not stop when he sees you; he does not see you.',
      passives: [
        { skill: 'medicine', dc: 30, text: 'Dehydrated three days at least. Pupils wrong. He should be dead and is walking instead, which happens, for a while.', effects: [{ learn: 'walker_dying' }] },
        { attr: 'senses', dc: 8, text: 'On the back of his hand, where it catches your lamp: a mark burned off, the way the stranger\'s was.', effects: [{ learn: 'walker_burned_mark' }, { lead: 'l_walker_mark' }] },
      ],
      options: [
        { id: 'walker.stop', text: '(Stop him.)', check: { attr: 'brawn', dc: 5 }, next: 'stopped', fail: 'slipped' },
        { id: 'walker.ask', text: 'Where are you going?', next: 'east' },
        { text: '(Let him go.)', effects: [{ set: 're_walker_gone' }, { lead: 'l_walker_east' }], exit: true },
      ],
    },
    east: { text: '"East." He says it to the air in front of his hand. "It said east. It said my name and then it said east and then it said a number, and the number is where I stop." He walks on. He is not hurrying. He will not get there.', effects: [{ learn: 'walker_said_east' }, { lead: 'l_walker_east' }], options: [{ id: 'walker.stop2', text: '(Stop him.)', check: { attr: 'brawn', dc: 5 }, next: 'stopped', fail: 'slipped' }, { text: '(Let him go.)', effects: [{ set: 're_walker_gone' }], exit: true }] },
    stopped: {
      text: 'He is lighter than he should be and does not struggle; he just keeps leaning east, the way a plant leans. Up close his lips are cracked white and his eyes are somewhere else. "I had a name," he says. "It\'s in the book now."',
      options: [
        { id: 'walker.water', text: '(Water. Slowly.)', if: { item: 'c_water' }, effects: [{ take: 'c_water' }, { set: 're_walker_helped' }, { learn: 'walker_helped' }, { decision: { id: 'walker_helped', text: 'You stopped a man walking east to die and gave him water.' } }, { xp: 40 }], next: 'watered' },
        { text: '(Let him go.)', effects: [{ set: 're_walker_gone' }], exit: true },
      ],
    },
    watered: { text: 'He drinks like a child, and for a moment the eyes come back from wherever they were and look at you, and are afraid. "Don\'t let it read yours," he says, quite clearly. Then the hand goes out flat again, and he leans. You can walk him to Shale, if you are going that way, and he will go east again the first night.', effects: [{ lead: 'l_walker_warning' }], options: [on] },
    slipped: { text: 'He goes past you like water round a stone and does not look back, and in a minute the dark has him.', effects: [{ set: 're_walker_gone' }, { lead: 'l_walker_east' }], options: [on] },
  },
};

/** A guild carter halted with an axle in the dirt, between posts. */
export const d_re_caravan: DialogueDef = {
  id: 'd_re_caravan', owner: 'npc_w_carter',
  start: [{ if: { flag: 're_caravan_done' }, node: 'again' }, { node: 'axle' }],
  nodes: {
    axle: {
      text: 'A guild wagon down on one corner, the mule looking at the horizon, a carter on his back under the bed and a guard with a shotgun who watches you instead of the road. "Axle," says the carter, from under the wagon. "If you\'ve got hands, I\'ve got water. If you\'ve got a gun, he\'s got a bigger one."',
      options: [
        { id: 'caravan.fix', text: '(Get under and look at the axle.)', check: { skill: 'mechanics', dc: 30, mods: [{ if: { origin: 'pump_hand' }, dc: -10, why: 'you have had worse things apart' }] }, next: 'fixed', fail: 'fix_no' },
        { id: 'caravan.trade', text: 'Water, you said. Trade?', effects: [{ event: 'barter' }], exit: true },
        { id: 'caravan.rob', text: '(Draw on the guard.)', effects: [{ set: 're_caravan_done' }, { set: 're_caravan_hostile' }, { rep: { faction: 'tollmen', fear: 8, respect: -15 } }, { event: 'combat' }], exit: true },
        { text: '(Walk on.)', exit: true },
      ],
    },
    fixed: { text: 'A split block and a bent pin; an hour with a bar, a wedge and a lot of the carter\'s opinions, and the wagon stands up. He pays like a man who has been told to: ten Tolls and two waters, counted twice. "Guild thanks you for your custom." The guard lowers the gun a finger.', effects: [{ set: 're_caravan_done' }, { give: 'tolls', count: 10 }, { give: 'c_water', count: 2 }, { rep: { faction: 'tollmen', respect: 6 } }, { time: 60 }, { decision: { id: 'caravan_fixed', text: 'You put a guild wagon back on its wheels on the road.' } }, { xp: 50 }], options: [on] },
    fix_no: { text: 'The block is split through and the pin is not coming out for anyone without a forge. You get grease to the elbow and the carter\'s respect, which is worth nothing. "Post will send a wagon," he says. "Eventually."', effects: [{ set: 're_caravan_done' }, { time: 40 }], options: [{ id: 'caravan.trade2', text: 'Water, you said. Trade?', effects: [{ event: 'barter' }], exit: true }, on] },
    again: { text: '"Still here." The mule has not moved either.', options: [{ id: 'caravan.trade3', text: 'Trade?', effects: [{ event: 'barter' }], exit: true }, on] },
  },
};
