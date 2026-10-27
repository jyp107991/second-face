import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * The burnt orchard: the Choir's keeper, his novices, the shrine and the well, and the two who come over the north
 * wall at night for green fruit (q_orchard, Orchard Thieves).
 */

const bye = { text: 'That\'s all.', exit: true };

export const d_or_anselm: DialogueDef = {
  id: 'd_or_anselm', owner: 'npc_or_01',
  start: [{ if: { flag: 'or_anselm_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man on his knees at the foot of a tree with leaves on it, packing wet cloth round the roots with the care of someone dressing a wound. He does not get up. "Brother Anselm. You\'ll be from Shale, or through it. Mind the rows; the living ones are the ones with the cloth."',
      effects: [{ set: 'or_anselm_met' }, { learn: 'anselm_met' }],
      passives: [{ skill: 'survival', dc: 25, text: 'Twelve living trees out of a hundred-odd dead: root-stock that survived the Burn under the ash, coaxed up over years. Nobody else in the Sallow is growing anything on a tree.', effects: [{ learn: 'orchard_rare' }] }],
      options: [
        { id: 'anselm.seed', text: '(Give him the Cistern\'s seed case.)', if: { all: [{ item: 'k_seed_case' }, { quest: 'q_a1_seed', status: 'active' }] }, next: 'seed_given' },
       
        { id: 'anselm.trees', text: 'How do you keep a tree alive out here?', next: 'trees', once: true },
        { id: 'anselm.thieves', text: 'Sister Calla says something is robbing you.', if: { any: [{ knows: 'calla_orchard' }, { knows: 'or_thefts' }] }, next: 'thieves', once: true },
        { id: 'anselm.thieves.ask', text: 'You said they take the green ones. Who does?', if: { not: { knows: 'calla_orchard' } }, next: 'thieves', once: true },
        { id: 'anselm.leavings', text: 'There\'s a gap in the north wall with a Dog\'s plate dropped in it.', if: { all: [{ knows: 'or_leavings_dog' }, { not: { flag: 'or_stakeout' } }] }, next: 'stakeout' },
        { id: 'anselm.after', text: 'About the thieves.', if: { flag: 'or_thieves_caught' }, next: 'after' },
        { id: 'anselm.fruit', text: 'Could you spare any fruit?', if: { not: { flag: 'or_fruit_given' } }, next: 'fruit' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'or_thieves_caught' }, text: 'He is at the rows again, and the cloth is dry, and he looks up when you come as if he has been waiting to.' }, { text: '"Mind the rows."' }],
      options: [
        { id: 'anselm.trees.again', text: 'How do you keep a tree alive out here?', if: { not: { seen: 'anselm.trees' } }, next: 'trees' },
        { id: 'anselm.thieves.again', text: 'About what is robbing you.', if: { all: [{ not: { seen: 'anselm.thieves' } }, { not: { seen: 'anselm.thieves.ask' } }] }, next: 'thieves' },
        { id: 'anselm.leavings.again', text: 'There\'s a gap in the north wall with a Dog\'s plate dropped in it.', if: { all: [{ knows: 'or_leavings_dog' }, { not: { flag: 'or_stakeout' } }] }, next: 'stakeout' },
        { id: 'anselm.after.again', text: 'About the thieves.', if: { all: [{ flag: 'or_thieves_caught' }, { not: { flag: 'or_anselm_told' } }] }, next: 'after' },
        { id: 'anselm.fruit.again', text: 'Could you spare any fruit?', if: { not: { flag: 'or_fruit_given' } }, next: 'fruit' },
        bye,
      ],
    },
    trees: { text: '"You don\'t. The tree keeps itself alive; you keep the ground from killing it." He pats the cloth. "Shade the roots, water them at dusk so the sun doesn\'t take it, and bury what dies at the foot of what lives. The Burn didn\'t kill the roots. It killed everything above them and then it killed the people who\'d have waited." A breath. "The Choir waits. That\'s most of what we are."', effects: [{ learn: 'anselm_waits' }], options: [{ text: 'Noted.', next: 'again' }] },
    thieves: { text: '"Twice a week, since the fruit set. They come over the north wall and take the green ones, which nobody takes, because they\'re sour enough to take the skin off your tongue." He stands, finally, slowly. "Petra heard them. Two, small. Dun says the prints are a Dog\'s, and Dun would know." He looks at the rows. "I don\'t want them hurt. I want them to stop. Those are two different things and I only know how to ask for one."', effects: [{ learn: 'or_thefts' }, { quest: 'q_orchard', start: true }, { lead: 'l_orchard_thieves' }], options: [{ text: 'I\'ll look at the wall.', next: 'again' }] },
    stakeout: { text: '"A Dog\'s plate." He turns it over in his hand as if it might be a seed. "Then it\'s what Dun said. Small, and from the overpass, and hungry enough for green fruit." He gives it back. "Wait for them, if you will. By the beds, after the lamps are out. I\'ll tell the novices to sleep through it." A pause. "Don\'t hurt them."', effects: [{ set: 'or_stakeout' }, { decision: { id: 'or_stakeout', text: 'You agreed to wait for the orchard thieves by the seedbeds at night.' } }], options: [{ text: 'After the lamps.', next: 'again' }] },
    after: {
      text: [
        { if: { flag: 'or_thieves_choir' }, text: '"They\'re in Petra\'s tent. The small one cried for an hour and then ate four." He shakes his head. "Two Dogs, under the open sky. The overpass will want them back, or it won\'t, and either way they eat. Thank you. I don\'t know yet what I\'ve thanked you for."' },
        { if: { flag: 'or_thieves_returned' }, text: '"You took them back." He says it without blame, which is worse. "Then they\'ll come again when they\'re hungry, and someone with a gun will be waiting instead of you. Or they won\'t come, and I\'ll wonder what the Dogs do with children who get caught." He goes back to the cloth.' },
        { if: { flag: 'or_thieves_cell' }, text: '"The sheriff\'s cell." He looks at the north wall a long time. "She\'ll feed them. She\'ll send to the overpass. The overpass will say they\'re not theirs." He kneels again. "I asked you not to hurt them. I should have said what I meant."' },
        { text: '"You let them go." A nod, slow. "With fruit, Petra says. Then they\'ll come back, and I\'ll leave the green ones on the wall, and we\'ll call it a tithe and not a theft." He almost smiles. "The sky is open. So is the wall."' },
      ],
      effects: [{ set: 'or_anselm_told' }, { trust: { npc: 'npc_or_01', by: 10 } }],
      options: [bye],
    },
    fruit: { text: '"Two." He counts them into your hand from his pocket, small and hard. "Sour. Eat them anyway; you\'ll not have had one. Tell Shale the Choir grew them, and tell them it took nine years."', effects: [{ give: 'c_fruit', count: 2 }, { set: 'or_fruit_given' }, { trust: { npc: 'npc_or_01', by: 5 } }], options: [{ text: 'Thanks.', next: 'again' }] },
    seed_given: {
      text: 'He opens it there in the rows, which Calla would not have, and holds a single seed up to the light between finger and thumb like a jeweller. "Bean." His voice goes. "Ninety years in the dark and it\'s a bean." He closes the case. "Tomorrow. The south beds. Pike will hear; let him hear it from the plants."',
      effects: [{ take: 'k_seed_case' }, { rep: { faction: 'choir', respect: 12 } }, { enlist: 'choir', rank: 'lay' }, { trust: { npc: 'npc_or_01', by: 12 } }, { trust: { npc: 'npc_sh_05', by: 6 } }, { learn: 'seed_given_choir' }, { rep: { faction: 'tollmen', respect: -4 } }, { news: { tag: 'seed_choir', text: 'The Cistern\'s seed went into the Choir\'s beds.', valence: 1, at: 'shale' } }, { decision: { id: 'seed_given', text: 'You gave the Cistern\'s seed to the Choir.' } }],
      options: [{ text: 'From the plants.', exit: true }],
    },
  },
};

export const d_or_petra: DialogueDef = {
  id: 'd_or_petra', owner: 'npc_or_02',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'A girl with her braid full of dust, thinning seedlings in a bed with a knife no longer than her thumb. "You\'re not Choir. You walk like a wall." She says it as a fact, not a complaint.',
      options: [
        { id: 'petra.heard', text: 'Brother Anselm says you heard the thieves.', if: { knows: 'or_thefts' }, next: 'heard', once: true },
        { id: 'petra.choir', text: 'Why the Choir?', next: 'choir', once: true },
        bye,
      ],
    },
    heard: { text: '"Two nights. Whispering, by the beds, and the wall scraping." She points with the knife. "North. One of them said Mote, run. So one of them is Mote." She goes back to the seedlings. "They took the green ones. You\'d have to be starving. I was, once; I\'d have taken the green ones."', effects: [{ learn: 'or_two_small' }, { learn: 'or_name_mote' }], options: [bye] },
    choir: { text: '"Because they feed you first and ask what you believe after, and after goes on for a long time." A shrug. "Sister Calla took me off the road at Shale with a fever. I stayed. I\'d have stayed for the fruit."', options: [bye] },
  },
};

export const d_or_dun: DialogueDef = {
  id: 'd_or_dun', owner: 'npc_or_03',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: 'A big young man hauling at the well rope, with the look of someone who was built for something else and is working at this one. "Dun. I draw the water. The well\'s forty feet and the bucket\'s thirty-nine, so I draw it twice."',
      options: [
        { id: 'dun.prints', text: 'Anselm says you know a Dog\'s footprint.', if: { knows: 'or_thefts' }, next: 'prints', once: true },
        { id: 'dun.dog', text: 'You were a Dog?', next: 'dog', once: true },
        bye,
      ],
    },
    prints: { text: '"Scrap-plate sole, two straps, the left one mended with wire. Kids\' size." He lets the bucket down. "Kessler doesn\'t send kids over walls. Kids go over walls when there\'s nothing on the right side of them." He looks north. "Catch them and don\'t take them back. That\'s all I\'ll say."', effects: [{ learn: 'or_prints_kids' }, { learn: 'dun_was_dog' }], options: [bye] },
    dog: { text: '"Till I was twelve, and then Perpetua said I had a face for walls and gave me to the Choir with a sack of salt, as a trade." He draws the bucket up. "I don\'t go back. I don\'t say why."', effects: [{ learn: 'dun_was_dog' }], options: [bye] },
  },
};

export const d_or_shrine: DialogueDef = {
  id: 'd_or_shrine', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A post with a board on it, and on the board, burned in with a wire: an open circle, and under it, THE SKY IS OPEN. Below that, smaller, in another hand: and the wall is low. Someone has left two green fruit on the ledge.',
      effects: [{ learn: 'or_shrine_seen' }],
      options: [
        { id: 'shrine.take', text: '(Take the fruit.)', effects: [{ give: 'c_fruit', count: 2 }, { set: 'or_shrine_taken' }, { memory: { npc: 'npc_or_01', tag: 'took_from_shrine', valence: -8, strength: 50 } }], next: 'taken' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    taken: { text: 'They are very sour.', options: [{ text: '(Go.)', exit: true }] },
  },
};

export const d_or_well: DialogueDef = {
  id: 'd_or_well', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A well with a windlass and a rope that has been spliced four times. The water, when the bucket comes up, is clear and tastes of stone, not pipe: this is not the network\'s water. It is the orchard\'s own.',
      effects: [{ learn: 'or_well_own' }, { lead: 'l_orchard_well' }],
      options: [{ id: 'well.fill', text: '(Fill your bottles.)', if: { item: 'c_dirtywater' }, effects: [{ take: 'c_dirtywater' }, { give: 'c_water' }], next: 'filled' }, { text: '(Step back.)', exit: true }],
    },
    filled: { text: 'Clean water, for once, for nothing.', options: [{ text: '(Step back.)', exit: true }] },
  },
};

export const d_or_leavings: DialogueDef = {
  id: 'd_or_leavings', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A gap in the north wall where the stones have been taken down a course and put back wrong. In the rubble on the orchard side, scuffs, and a scrap of something that glints.',
      passives: [
        { skill: 'survival', dc: 20, text: 'Two sets of prints, small, scrap-plate soles. They come at night and go the same way, north-west, toward the overpass road.', effects: [{ learn: 'or_prints_kids' }] },
        { attr: 'senses', dc: 6, text: 'The glint is a Rust Dog\'s plate, the little kind they wear on a cord, snapped off its wire.', effects: [{ learn: 'or_leavings_dog' }] },
      ],
      effects: [{ learn: 'or_wall_seen' }],
      options: [{ id: 'wall.plate', text: '(Pick up the plate.)', if: { knows: 'or_leavings_dog' }, effects: [{ give: 'k_dog_plate' }], next: 'plate' }, { text: '(Step back.)', exit: true }],
    },
    plate: { text: 'A thumb-sized scrap of plate with a dog\'s head scratched on it, the way the overpass marks its own. A child\'s cord through it.', effects: [{ lead: 'l_orchard_thieves' }], options: [{ text: '(Pocket it.)', exit: true }] },
  },
};

/** Night, by the seedbeds: the thieves. */
export const d_or_thieves: DialogueDef = {
  id: 'd_or_thieves', owner: 'npc_or_04',
  start: [{ node: 'beds' }],
  nodes: {
    beds: {
      text: 'Two shapes at the beds in the dark, filling a sack with green fruit, so intent that you are three steps away before one of them looks up. A boy with a shiv and a girl with the sack, neither of them sixteen, both of them all eyes. "Mote," the boy says. "Run."',
      options: [
        { id: 'thieves.stop', text: 'Don\'t. Nobody here is going to hurt you. Put the sack down and sit.', check: { skill: 'speech', dc: 30, mods: [{ if: { knows: 'dun_was_dog' }, dc: -10, why: 'you can say Dun\'s name' }, { if: { rep: { faction: 'rust_dogs', respect: 15 } }, dc: -10, why: 'the Dogs have heard of you' }] }, next: 'sat', fail: 'ran' },
        { id: 'thieves.wren', text: '(Let Wren speak.)', if: { inParty: 'npc_rd_03' }, effects: [{ approval: { companion: 'npc_rd_03', by: 5 } }], next: 'wren' },
        { id: 'thieves.grab', text: '(Grab the boy before he moves.)', check: { attr: 'reflex', dc: 6 }, next: 'grabbed', fail: 'ran' },
        { text: '(Let them run.)', next: 'ran' },
      ],
    },
    wren: { text: '"Kip." Wren does not raise her voice. "Mote. Your mother\'s Fen, under the third pier, and she thinks you\'re at the salt." The boy\'s shiv goes down. The girl starts to cry, silently, the way children do who have learned not to be heard.', effects: [{ learn: 'or_thieves_names' }], options: [{ text: 'Sit. Both of you.', next: 'sat' }] },
    grabbed: { text: 'You have him by the collar before the shiv is up, and he goes limp the way a kid goes limp who has been grabbed before. The girl does not run. She will not leave him.', options: [{ text: 'Sit. Both of you.', next: 'sat' }] },
    sat: {
      text: 'They sit. The story comes out of the girl in pieces, with the sack in her lap: the overpass has been short since the tithe, the little ones eat last, the orchard has fruit on trees and nobody shoots at you here. "They\'re sour," she says, as if that were the crime. "We only take the sour ones."',
      effects: [{ set: 'or_thieves_caught' }, { learn: 'or_thieves_hungry' }],
      options: [
        { id: 'thieves.choir', text: 'Stay. The Choir feeds you first and asks after. Ask for Dun; he was one of you.', effects: [{ set: 'or_thieves_choir' }, { set: 'or_outcome', value: 'choir' }, { decision: { id: 'or_thieves_choir', text: 'The two Rust Dog children who robbed the orchard stayed with the Choir.' } }, { rep: { faction: 'choir', respect: 10 } }, { memory: { npc: 'npc_rd_05', tag: 'kept_kids', valence: -10, strength: 60 } }, { news: { tag: 'dog_kids_choir', text: 'two Rust Dog children are sleeping in the Choir\'s tents at the orchard', valence: 5, size: 5, at: 'shale' } }, { news: { tag: 'dog_kids_choir', text: 'two of the overpass\'s children went to the Choir and did not come back', valence: -5, size: 5, at: 'rustdogs' } }, { xp: 80 }], next: 'choir' },
        { id: 'thieves.return', text: 'I\'ll walk you back to the overpass. Tonight. Whoever is short there can answer to me.', effects: [{ set: 'or_thieves_returned' }, { set: 'or_outcome', value: 'returned' }, { decision: { id: 'or_thieves_returned', text: 'You walked the orchard thieves back to the overpass.' } }, { rep: { faction: 'rust_dogs', respect: 8 } }, { memory: { npc: 'npc_rd_05', tag: 'brought_kids', valence: 15, strength: 70 } }, { time: 240 }, { xp: 60 }], next: 'returned' },
        { id: 'thieves.cell', text: 'The sheriff\'s cell, and she can send to the overpass for you.', effects: [{ set: 'or_thieves_cell' }, { set: 'or_outcome', value: 'cell' }, { decision: { id: 'or_thieves_cell', text: 'You handed the orchard thieves to Sheriff Vey.' } }, { rep: { faction: 'shale_militia', respect: 5 } }, { rep: { faction: 'rust_dogs', respect: -8 } }, { memory: { npc: 'npc_rd_05', tag: 'jailed_kids', valence: -25, strength: 80 } }, { time: 120 }, { xp: 40 }], next: 'cell' },
        { id: 'thieves.go', text: 'Take the sack. Take the green ones, always, and nothing else, and go over the wall where the stones are loose.', effects: [{ set: 'or_thieves_let_go' }, { set: 'or_outcome', value: 'let_go' }, { decision: { id: 'or_thieves_let_go', text: 'You let the orchard thieves go with the green fruit.' } }, { rep: { faction: 'rust_dogs', respect: 4 } }, { xp: 50 }], next: 'go' },
      ],
    },
    choir: { text: 'The boy looks at the tents as if they were a trap with the teeth showing. The girl looks at the trees. "They\'ve got fruit on them," she says, and that decides it.', options: [{ text: '(Wake Petra.)', exit: true }] },
    returned: { text: 'Four hours in the dark, the girl asleep on your back for the last one, and a lamp at the overpass gate that knows you. Whoever is short there will be shorter. But they are home, and the Dogs will remember who walked them.', options: [{ text: '(Go.)', exit: true }] },
    cell: { text: 'Ada does not ask you what they did. She looks at their feet and sends Jonah for blankets, and the boy says one word, which is a Dog\'s word for a cage.', options: [{ text: '(Go.)', exit: true }] },
    go: { text: 'They are over the wall before you have finished the sentence. The sack goes over first. In the morning Anselm will find two green fruit left on the shrine, which is a kind of receipt.', options: [{ text: '(Go.)', exit: true }] },
    ran: { text: 'They are gone over the north wall with the sack, and the stones come down behind them. You will not catch them tonight, and tomorrow they will know the beds are watched.', effects: [{ set: 'or_thieves_fled' }], options: [{ text: '(Go.)', exit: true }] },
  },
};
