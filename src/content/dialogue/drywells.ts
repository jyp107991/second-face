import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Dry Wells: the rifle on the approach, the family in the shacks, and the station at the end of the line from
 * Signal Hill — a locked room, a console that holds Shale at a number, and the four things that can be done to it.
 */

const bye = { text: 'That\'s all.', exit: true };
const ADMIT = (how: string, text: string) => [{ set: 'dw_admitted' }, { set: `dw_${how}` }, { decision: { id: `dw_${how}`, text } }, { xp: 40 }];

export const d_dw_approach: DialogueDef = {
  id: 'd_dw_approach', owner: 'npc_dw_02',
  start: [{ if: { flag: 'dw_fight' }, node: 'hostile' }, { node: 'halt' }],
  nodes: {
    halt: {
      text: 'A rifle shot takes the top off the sandbag beside you, and then a voice from behind the fire barrel, flat as the ground: "Far enough. That was the one I had to spare." A woman in a hood with a bolt rifle, older than her voice. Somewhere behind her a kid is whistling, and stops.',
      passives: [
        { attr: 'senses', dc: 7, text: 'She worked the bolt and did not chamber. The next one is a bluff or a prayer, and she counted it out loud for a reason.', effects: [{ learn: 'dw_sable_short' }] },
        { skill: 'survival', dc: 30, text: 'Smoke from three shacks, a planter with something green in it, and a line worn in the dust where water has been carried every day for years. People live here, and not many.', effects: [{ learn: 'dw_family_seen' }] },
      ],
      options: [
        { id: 'dw.hill', text: 'I came from Signal Hill. The relay there feeds a line to this station. DW-4.', if: { lead: 'l_relay_west_line' }, effects: [...ADMIT('hill', 'You told the rifle at Dry Wells where the line comes from, and she let you by.'), { trust: { npc: 'npc_dw_02', by: 10 } }], next: 'hill' },
        { id: 'dw.pumphand', text: '(Look at the station, not at her.) Twin reciprocating, pre-Burn, a header tank on a tower. Same as the ones I grew up under.', if: { origin: 'pump_hand' }, effects: [...ADMIT('pumphand', 'The rifle at Dry Wells let you by because you knew the pumps by their sound.'), { trust: { npc: 'npc_dw_02', by: 10 } }], next: 'pumphand' },
        { id: 'dw.ilya', text: '(Let Ilya speak.)', if: { inParty: 'npc_sh_17' }, effects: [...ADMIT('ilya', 'Ilya Strand\'s name got you past the rifle at Dry Wells.'), { approval: { companion: 'npc_sh_17', by: 5 } }], next: 'ilya' },
        { id: 'dw.shale', text: 'I\'m from Shale.', next: 'shale' },
        { id: 'dw.pay', text: '(Hold up ten Tolls.) For the walk through.', if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }, ...ADMIT('paid', 'You paid the rifle at Dry Wells ten Tolls to walk through.')], next: 'through' },
        { id: 'dw.fight', text: '(Draw.)', effects: [{ set: 'dw_fight' }, { set: 'dw_admitted' }, { decision: { id: 'dw_fought', text: 'You drew on the family at Dry Wells.' } }, { event: 'combat' }], exit: true },
        { text: '(Back off.)', exit: true },
      ],
    },
    shale: {
      text: 'The rifle comes up the width of a hand. "Then you\'ve come for the valve."',
      options: [
        { id: 'dw.shale.talk', text: 'I don\'t know what valve. I came for the station. Whatever is in it sets Shale\'s water, and Shale is dying of it.', check: { skill: 'speech', dc: 35, mods: [{ if: { knows: 'dw_sable_short' }, dc: -10, why: 'she is low on rounds and you both know it' }] }, effects: [...ADMIT('talked', 'You talked your way past the rifle at Dry Wells without learning what the valve was.')], next: 'through', fail: 'shale_no' },
        { id: 'dw.shale.pay', text: '(Ten Tolls.) I\'m not here about any valve.', if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }, ...ADMIT('paid', 'You paid the rifle at Dry Wells ten Tolls to walk through.')], next: 'through' },
        { id: 'dw.shale.fight', text: '(Draw.)', effects: [{ set: 'dw_fight' }, { set: 'dw_admitted' }, { decision: { id: 'dw_fought', text: 'You drew on the family at Dry Wells.' } }, { event: 'combat' }], exit: true },
        { text: '(Back off.)', exit: true },
      ],
    },
    shale_no: { text: '"Shale doesn\'t send people who don\'t know what the valve is." The bolt goes back, and this time it comes forward. "Go home. Tell them the pressure drop is the drought."', options: [{ id: 'dw.shale.pay2', text: '(Ten Tolls.)', if: { item: 'tolls', count: 10 }, effects: [{ take: 'tolls', count: 10 }, ...ADMIT('paid', 'You paid the rifle at Dry Wells ten Tolls to walk through.')], next: 'through' }, { id: 'dw.shale.fight2', text: '(Draw.)', effects: [{ set: 'dw_fight' }, { set: 'dw_admitted' }, { event: 'combat' }], exit: true }, { text: '(Back off.)', exit: true }] },
    hill: { text: '"DW-4." The rifle comes down slowly, like something being put back where it lives. "Nobody\'s called it that since Grandmother\'s father. He had it painted on the door." She looks at you a long moment. "Then you know more than Shale does. Come and tell her what you know."', options: [{ text: '(Go in.)', next: 'through' }] },
    pumphand: { text: '"Grew up under." She says it twice, trying it. "Under." The rifle goes across her chest. "Then you\'ll know what the clock sounds like. Eleven. Come and tell Grandmother what it sounds like where you\'re from, because she\'s never heard anyone else say it."', options: [{ text: '(Go in.)', next: 'through' }] },
    ilya: { text: '"Sable." Ilya, beside you, not raising his voice. "It\'s Strand. I brought the cartridges in the spring. I brought this one." A silence in which the kid starts whistling again. "Strand," she says. "You still owe me three." The rifle goes down.', options: [{ text: '(Go in.)', next: 'through' }] },
    through: { text: 'She steps out from the barrel without lowering the rifle all the way, which is how she walks everywhere. "The shacks are ours. The station\'s Grandmother\'s. The tower\'s nobody\'s and don\'t climb it; Wick\'s up there and he bites." A nod at the long concrete building. "She\'ll want to see you before you touch anything that hums."', options: [{ text: '(Go in.)', exit: true }] },
    hostile: { text: 'Nobody is talking.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_dw_sable: DialogueDef = {
  id: 'd_dw_sable', owner: 'npc_dw_02',
  start: [{ if: { flag: 'dw_fight' }, node: 'hostile' }, { if: { flag: 'dw_sable_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Sable. I shoot things for the family and I count what I shoot with." The rifle lies across her knees on the sandbags. "Seven rounds. Six, now. I don\'t spend one on Shale unless Shale brings a wagon."',
      effects: [{ set: 'dw_sable_met' }],
      options: [
        { id: 'sable.shale', text: 'Why shoot at Shale?', next: 'why', once: true },
        { id: 'sable.station', text: 'What\'s in the station?', next: 'station', once: true },
        { id: 'sable.schedule', text: 'The pumps run on a schedule. Who sets it?', next: 'schedule', once: true },
        { id: 'sable.east', text: 'East. What\'s past the windpumps?', if: { all: [{ flag: 'dw_outcome' }, { not: { flag: 'escort_east' } }] }, next: 'east' },
        bye,
      ],
    },
    again: {
      text: '"Still counting."',
      options: [
        { id: 'sable.shale.again', text: 'Why shoot at Shale?', if: { not: { seen: 'sable.shale' } }, next: 'why' },
        { id: 'sable.station.again', text: 'What\'s in the station?', if: { not: { seen: 'sable.station' } }, next: 'station' },
        { id: 'sable.schedule.again', text: 'The pumps run on a schedule. Who sets it?', if: { not: { seen: 'sable.schedule' } }, next: 'schedule' },
        { id: 'sable.east.again', text: 'East. What\'s past the windpumps?', if: { all: [{ flag: 'dw_outcome' }, { not: { flag: 'escort_east' } }] }, next: 'east' },
        bye,
      ],
    },
    why: { text: '"Because the water under this floor is theirs, and the valve on the line is ours, and Shale has a sheriff who\'d call that a word that ends with a rope." She shrugs. "We take a trickle. A trickle in Shale is a bucket. A bucket here is five people alive."', effects: [{ learn: 'dw_bypass_known' }, { lead: 'l_dw_bypass' }], options: [{ text: 'Noted.', next: 'again' }] },
    station: { text: '"The pumps, and a room at the end with a door that was locked when Grandmother was a girl, and a light that\'s green on the other side of it. Her father had the key. She has it now. She doesn\'t go in." A beat. "It makes a noise before eleven. Every day. You\'ll hear it."', effects: [{ learn: 'dw_control_locked' }, { learn: 'dw_key_oriel' }], options: [{ text: 'Noted.', next: 'again' }] },
    schedule: { text: '"Not us. Not Shale; Shale thinks it\'s the weather, or God, or the Tollmen. Grandmother says the city. I say it doesn\'t matter who, it matters that it\'s on time." She looks east. "Something that\'s been on time for ninety years is a thing I don\'t want to meet."', effects: [{ learn: 'dw_schedule_upstream' }], options: [{ text: 'Noted.', next: 'again' }] },
    east: {
      text: [
        { if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, text: '"The graveyard, then the glass, then a bridge with a town on it. I\'ve walked it twice." She looks at the station, where the pumps are running outside the clock. "You did a thing in there that somebody east will come to look at. I\'ll walk you as far as the glass, so you\'re not the first thing they see. Past that you\'re on your own, and so is everyone."' },
        { text: '"East is east. Don\'t get shot." She goes back to counting.' },
      ],
      options: [
        { id: 'sable.escort', text: 'To the glass, then.', if: { any: [{ flag: 'dw_restored' }, { flag: 'dw_freed' }] }, effects: [{ set: 'escort_east', value: 'sable' }, { decision: { id: 'escort_sable', text: 'Sable Marr will walk you east as far as the glass.' } }, { trust: { npc: 'npc_dw_02', by: 10 } }], next: 'escort' },
        { text: 'Noted.', next: 'again' },
      ],
    },
    escort: { text: '"When you go, come past the sandbags and say so. I\'ll have the rounds I\'ve got."', options: [bye] },
    hostile: { text: 'She is behind the sandbags with the rifle.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_dw_oriel: DialogueDef = {
  id: 'd_dw_oriel', owner: 'npc_dw_01',
  start: [{ if: { flag: 'dw_fight' }, node: 'after_fight' }, { if: { flag: 'dw_oriel_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'An old woman in a chair that was built for sitting, hands folded on a stick, eyes that measured you from the window before you reached the door. "Sable let you by, so you said something true. Sit. I\'m Oriel Marr. My father was the pump man here, and his father before the Burn, and that chair you\'re not sitting in was his." She waits. Under the floor, something clicks, and the pumps begin.',
      effects: [{ set: 'dw_oriel_met' }, { learn: 'dw_oriel_met' }],
      passives: [
        { skill: 'medicine', dc: 25, text: 'The cough she is holding in is wet. Lungs, not dust. She has been holding it in for a long time.', effects: [{ learn: 'dw_oriel_cough' }] },
        { attr: 'wits', dc: 7, text: 'The key on the cord round her neck is brass, worn to gold where a thumb has rubbed it for sixty years and never once turned it in a lock.', effects: [{ learn: 'dw_key_seen' }] },
      ],
      options: [
        { id: 'oriel.who', text: 'Who are you people? Nobody in Shale knows you.', next: 'who', once: true },
        { id: 'oriel.clock', text: 'Eleven o\'clock. Sable said you\'d say listen.', next: 'clock', once: true },
        { id: 'oriel.station', text: 'The station. Sable says it\'s yours, and that there\'s a room at the end nobody goes in.', next: 'station' },
        { id: 'oriel.stay', text: 'Shale could take you in. Five people, under the sheriff\'s law.', if: { all: [{ knows: 'dw_origin_known' }, { not: { flag: 'dw_ghosts_decided' } }, { not: { flag: 'ada_ghosts_decided' } }] }, next: 'stay', once: true },
        { id: 'oriel.shale.yes', text: 'Sheriff Vey says yes. Under her law, as townsfolk, and the valve closes.', if: { all: [{ flag: 'ada_ghosts_ok' }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'go_shale' },
        { id: 'oriel.shale.no', text: 'Sheriff Vey says no.', if: { all: [{ flag: 'ada_ghosts_decided' }, { not: { flag: 'ada_ghosts_ok' } }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'no_shale' },
        { id: 'oriel.moveon', text: '(Forty Tolls.) For the road. The windpump graveyard, then the glass. There\'s nothing here once the schedule changes.', if: { all: [{ knows: 'dw_origin_known' }, { item: 'tolls', count: 40 }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'move_on' },
        { id: 'oriel.leave', text: 'Stay, then. I won\'t tell Shale about the valve.', if: { all: [{ knows: 'dw_bypass_known' }, { knows: 'dw_origin_known' }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'leave_be' },
        bye,
      ],
    },
    again: {
      text: [{ if: { flag: 'dw_key_forced' }, text: 'She does not look at you. The chair is still the only thing in the room built for sitting.' }, { if: { flag: 'dw_outcome' }, text: '"It\'s quiet under the floor, or it isn\'t. Either way, you did it." She looks at the chair, then at you. "Sit, this time."' }, { text: '"The chair\'s still empty."' }],
      options: [
        { id: 'oriel.who.again', text: 'Who are you people?', if: { not: { seen: 'oriel.who' } }, next: 'who' },
        { id: 'oriel.clock.again', text: 'Eleven o\'clock.', if: { not: { seen: 'oriel.clock' } }, next: 'clock' },
        { id: 'oriel.station.again', text: 'The room at the end of the station.', if: { not: { flag: 'dw_has_key' } }, next: 'station' },
        { id: 'oriel.stay.again', text: 'Shale could take you in.', if: { all: [{ knows: 'dw_origin_known' }, { not: { seen: 'oriel.stay' } }, { not: { flag: 'dw_ghosts_decided' } }, { not: { flag: 'ada_ghosts_decided' } }] }, next: 'stay' },
        { id: 'oriel.shale.yes.again', text: 'Sheriff Vey says yes. Under her law, as townsfolk, and the valve closes.', if: { all: [{ flag: 'ada_ghosts_ok' }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'go_shale' },
        { id: 'oriel.shale.no.again', text: 'Sheriff Vey says no.', if: { all: [{ flag: 'ada_ghosts_decided' }, { not: { flag: 'ada_ghosts_ok' } }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'no_shale' },
        { id: 'oriel.moveon.again', text: '(Forty Tolls.) For the road east.', if: { all: [{ knows: 'dw_origin_known' }, { item: 'tolls', count: 40 }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'move_on' },
        { id: 'oriel.leave.again', text: 'Stay, then. I won\'t tell Shale about the valve.', if: { all: [{ knows: 'dw_bypass_known' }, { knows: 'dw_origin_known' }, { not: { flag: 'dw_ghosts_decided' } }] }, next: 'leave_be' },
        bye,
      ],
    },
    who: {
      text: '"Ghosts. That\'s what the Tollmen call us, when they call us anything." She smiles with half her face. "We came out of a hole in the ground, same as you by the look of you. Not yours. Another one, east, with a number on it. Its pumps stopped when I was nine and the door didn\'t open, and my father opened it with a bar. Forty of us walked. Five of us are here."',
      effects: [{ learn: 'dw_origin_known' }, { lead: 'l_dw_ghosts' }, { quest: 'q_dw_ghosts', start: true }, { xp: 40 }],
      options: [{ text: 'Why here?', next: 'why_here' }, { text: 'Noted.', next: 'again' }],
    },
    why_here: { text: '"Because it was the only building on the road my father knew the inside of. He\'d been sent here once, before, to read a gauge. He read it again and said: this one still answers to somebody, and somebody is feeding Shale through it, and Shale will never come looking at the thing that feeds it." A click under the floor. "He was right for sixty years."', effects: [{ learn: 'dw_father_sent' }], options: [{ text: 'Noted.', next: 'again' }] },
    clock: { text: '"Six, eleven, four, nine. Every day since before I was born, and twice a year the numbers move and nobody here moves them." She taps the floor with the stick. "That\'s Shale drinking. When the numbers moved last spring, Shale got less. Shale thinks it\'s the drought. It isn\'t the drought."', effects: [{ learn: 'dw_schedule_shale' }, { lead: 'l_dw_schedule' }], options: [{ text: 'Noted.', next: 'again' }] },
    station: {
      text: '"My father\'s room. He said whatever was in there wasn\'t ours to touch, and then he died of the same thing I\'m dying of, and I\'ve kept it the way he left it." Her hand goes to the cord. "You want the key. Everybody who gets past Sable wants the key, in the end."',
      options: [
        { id: 'oriel.key.pumphand', text: '(Tell her what the clock sounds like where you come from.)', if: { origin: 'pump_hand' }, next: 'key_pumphand' },
        { id: 'oriel.key.stay', text: 'Give it to me and I\'ll see your family stays. Whatever is in there, I use it for them first.', check: { skill: 'speech', dc: 35, mods: [{ if: { flag: 'dw_oriel_treated' }, dc: -15, why: 'you treated her cough before you asked' }, { if: { knows: 'dw_father_sent' }, dc: -5, why: 'you listened to the whole story' }, { if: { trust: { npc: 'npc_dw_01', gte: 10 } }, dc: -10, why: 'she has decided to like you' }] }, next: 'key_given', fail: 'key_no' },
        { id: 'oriel.key.take', text: '(Take it off her neck.)', next: 'key_taken' },
        { text: 'Not yet.', next: 'again' },
      ],
    },
    key_pumphand: { text: '"Then it\'s the same clock." She lifts the cord over her head as if it weighs what it weighed when she was nine. "He\'d have given it to one of his own. Go and read his gauge." The key is warm. "And if the thing in there asks you for a word, the word is on the first page of his book. He never let me read past it."', effects: [{ give: 'k_station_key' }, { set: 'dw_has_key' }, { set: 'dw_oriel_key' }, { learn: 'dw_override_word' }, { trust: { npc: 'npc_dw_01', by: 15 } }, { decision: { id: 'dw_key_pumphand', text: 'Oriel Marr gave you her father\'s key because you knew his clock.' } }, { xp: 60 }], options: [{ text: '(Take it.)', next: 'again' }] },
    key_given: { text: 'She looks at you for the length of a pump run, and then lifts the cord over her head. "For them first." The key is warm from sixty years of being held. "If the thing in there asks you for a word, the word is on the first page of his book. He never let me read past it."', effects: [{ give: 'k_station_key' }, { set: 'dw_has_key' }, { set: 'dw_oriel_key' }, { set: 'dw_promised_stay' }, { learn: 'dw_override_word' }, { trust: { npc: 'npc_dw_01', by: 15 } }, { decision: { id: 'dw_key_promise', text: 'Oriel Marr gave you her father\'s key on your word that the family comes first.' } }, { xp: 60 }], options: [{ text: '(Take it.)', next: 'again' }] },
    key_no: { text: '"Everybody says first." Her hand closes on the key. "My father said it, about Shale. Come back when you\'ve done something for us that wasn\'t a sentence."', effects: [{ set: 'dw_key_refused' }], options: [{ text: 'Noted.', next: 'again' }] },
    key_taken: { text: 'She does not resist, which is worse than if she had. The cord comes over her head; her hair catches in it. "There," she says. "Now you\'re the same as the thing in there."', effects: [{ give: 'k_station_key' }, { set: 'dw_has_key' }, { set: 'dw_key_forced' }, { trust: { npc: 'npc_dw_01', by: -30 } }, { trust: { npc: 'npc_dw_02', by: -20 } }, { memory: { npc: 'npc_dw_01', tag: 'took_key', valence: -40, strength: 100 } }, { decision: { id: 'dw_key_forced', text: 'You took the station key off Oriel Marr\'s neck.' } }], options: [{ text: '(Go.)', exit: true }] },
    stay: { text: '"Under a rope, you mean. The valve\'s a hanging in Shale." She considers it anyway, which is more than you expected. "Juno would go. Wick would go and come back. Cato would stay for the valve and Sable would stay for Cato. Ask your sheriff. If she says yes and means it, I\'ll decide for all of them, which is what I\'m for."', effects: [{ learn: 'dw_oriel_would_go' }], options: [{ text: 'I\'ll ask her.', next: 'again' }] },
    go_shale: { text: '"As townsfolk." She says it like a word in another language. "Then close the valve yourself, so Cato can hate you and not me, and we\'ll walk. I have walked out of one place with less." She stands, which takes a while. "Tell your sheriff: five, and one of them coughs."', effects: [{ set: 'dw_ghosts_decided' }, { set: 'dw_ghosts_shale' }, { set: 'dw_valve_closed' }, { decision: { id: 'dw_ghosts_shale', text: 'The Dry Wells family walked to Shale under Sheriff Vey\'s law.' } }, { news: { tag: 'ghosts_in_shale', text: 'five people out of a dead cistern have come in off the Dry Wells track and the sheriff has given them the old tannery', valence: 5, size: 6, at: 'shale' } }, { trust: { npc: 'npc_dw_01', by: 20 } }, { xp: 100 }], options: [{ text: '(Help her up.)', exit: true }] },
    no_shale: { text: '"No." She nods as if she had bet on it. "Then we stay, and the valve stays, and when Shale comes it comes. It was always going to." A click under the floor.', effects: [{ set: 'dw_ghosts_decided' }, { set: 'dw_ghosts_left' }, { decision: { id: 'dw_ghosts_refused', text: 'Shale refused the Dry Wells family; they stay on their trickle.' } }, { xp: 40 }], options: [{ text: 'Noted.', next: 'again' }] },
    move_on: { text: 'She looks at the Tolls a long time before she takes them. "The graveyard, then the glass. My father walked it the other way." She puts the money in the stick, which is hollow. "Sable will say no and come anyway. Give us a week."', effects: [{ take: 'tolls', count: 40 }, { set: 'dw_ghosts_decided' }, { set: 'dw_ghosts_moved' }, { decision: { id: 'dw_ghosts_moved', text: 'You paid the Dry Wells family to move on east.' } }, { trust: { npc: 'npc_dw_01', by: 5 } }, { xp: 60 }], options: [{ text: 'Noted.', exit: true }] },
    leave_be: { text: '"Then you\'re the first from that direction who didn\'t." She closes her eyes. "Eleven o\'clock. Listen."', effects: [{ set: 'dw_ghosts_decided' }, { set: 'dw_ghosts_left' }, { decision: { id: 'dw_ghosts_left', text: 'You left the Dry Wells family on their trickle and told Shale nothing.' } }, { trust: { npc: 'npc_dw_01', by: 15 } }, { trust: { npc: 'npc_dw_02', by: 10 } }, { xp: 60 }], options: [{ text: 'Noted.', exit: true }] },
    after_fight: {
      text: 'She is in the chair. She has not moved. "You shot at my family from behind a sandbag they filled. Take the key. Take the chair. There\'s nothing in that room worth what you paid for it."',
      effects: [{ give: 'k_station_key' }, { set: 'dw_has_key' }, { set: 'dw_key_forced' }, { set: 'dw_ghosts_decided' }, { set: 'dw_ghosts_left' }, { memory: { npc: 'npc_dw_01', tag: 'shot_family', valence: -60, strength: 100 } }],
      options: [{ text: '(Take it.)', exit: true }],
    },
  },
};

export const d_dw_juno: DialogueDef = {
  id: 'd_dw_juno', owner: 'npc_dw_03',
  start: [{ if: { flag: 'dw_fight' }, node: 'hostile' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"Beans. In a planter. In Dry Wells." She does not look up from them. "Grandmother says that\'s a joke. I say it\'s beans. They don\'t care what they\'re a joke about."',
      options: [
        { id: 'juno.cough', text: 'Your grandmother\'s cough. (Give her a knit kit for it.)', if: { all: [{ knows: 'dw_oriel_cough' }, { item: 'c_knitkit' }, { not: { flag: 'dw_oriel_treated' } }] }, effects: [{ take: 'c_knitkit' }, { set: 'dw_oriel_treated' }, { trust: { npc: 'npc_dw_01', by: 15 } }, { trust: { npc: 'npc_dw_03', by: 15 } }, { decision: { id: 'dw_oriel_treated', text: 'You left medicine for Oriel Marr\'s lungs with her granddaughter.' } }, { xp: 40 }], next: 'cough' },
        { id: 'juno.cough.med', text: 'Your grandmother\'s cough. (Show her how to steam the lungs: a bucket, a cloth, the stove.)', if: { all: [{ knows: 'dw_oriel_cough' }, { not: { flag: 'dw_oriel_treated' } }] }, check: { skill: 'medicine', dc: 30 }, effects: [{ set: 'dw_oriel_treated' }, { trust: { npc: 'npc_dw_01', by: 10 } }, { trust: { npc: 'npc_dw_03', by: 15 } }, { decision: { id: 'dw_oriel_treated', text: 'You showed Juno Marr how to ease her grandmother\'s lungs.' } }, { xp: 40 }], next: 'cough', fail: 'cough_no' },
        { id: 'juno.shale', text: 'Would you go to Shale, if they\'d have you?', if: { knows: 'dw_origin_known' }, next: 'shale', once: true },
        bye,
      ],
    },
    cough: { text: 'She looks up for the first time. "She\'ll say she doesn\'t need it. Give it to me and I\'ll put it in the tea." A pause. "Thank you. Nobody from that way says thank you either, so."', options: [bye] },
    cough_no: { text: 'She listens, and nods, and you can see her deciding it is nonsense.', effects: [{ time: 15 }], options: [bye] },
    shale: { text: '"Tomorrow." No hesitation at all. "I\'ve never been anywhere with a second street. Don\'t tell Cato I said it. Don\'t tell them about the valve."', options: [bye] },
    hostile: { text: 'She has a knife and no idea what to do with it.', options: [{ text: '(Leave her.)', exit: true }] },
  },
};

export const d_dw_cato: DialogueDef = {
  id: 'd_dw_cato', owner: 'npc_dw_04',
  start: [{ if: { flag: 'dw_fight' }, node: 'hostile' }, { if: { flag: 'dw_valve_closed' }, node: 'closed' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: '"The valve\'s mine." He says it before you have asked anything. "Grandmother says when, I say how far. A quarter turn at eleven, back at noon. Shale never missed it. Shale never will."',
      options: [
        { id: 'cato.cut', text: 'Shale is missing it. The schedule has been cut; they\'re drinking at sixty-two parts in a hundred.', if: { knows: 'dw_schedule_shale' }, next: 'cut', once: true },
        { id: 'cato.valve', text: 'What if I closed it?', next: 'close' },
        bye,
      ],
    },
    cut: { text: '"Then it was the city cut it, not us." He does not move. "Our quarter turn was there before the cut and after it. You want somebody to blame for Shale, there\'s a room at the end of the station with a green light in it. Go and blame that."', effects: [{ learn: 'dw_cato_blames_room' }], options: [{ text: 'Noted.', exit: true }] },
    close: { text: '"You close it and I open it. You break it and we die here, slow, in front of Grandmother." He picks up the pipe, not to use it, just to have it. "Which do you want to be?"', options: [{ text: 'Neither.', exit: true }] },
    closed: { text: 'He is standing by the valve with the pipe in both hands and does not look at you. "Noon," he says. "It\'s past noon."', options: [{ text: '(Leave him.)', exit: true }] },
    hostile: { text: 'He has the pipe up.', options: [{ text: '(Fight.)', exit: true }] },
  },
};

export const d_dw_wick: DialogueDef = {
  id: 'd_dw_wick', owner: 'npc_dw_05',
  start: [{ if: { flag: 'dw_fight' }, node: 'hostile' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A kid on the tower ladder, barefoot, with a sling in his belt. "I can hear it. The click. Sable says it\'s the pipe cooling. It isn\'t. It\'s before, not after."',
      passives: [{ attr: 'senses', dc: 6, text: 'He is right. A click, then the pumps. Something counts first.', effects: [{ learn: 'dw_pumps_click' }, { lead: 'l_pumps_clock' }] }],
      options: [
        { id: 'wick.east', text: 'What\'s east of here?', next: 'east', once: true },
        { id: 'wick.shale', text: 'Have you ever seen Shale?', next: 'shale', once: true },
        bye,
      ],
    },
    east: { text: '"The graveyard. Pumps like ours with no water in them, standing up in a line. Past that it shines, all day, and you can\'t look at it." He points. "I went as far as the first one. There was a bird."', effects: [{ learn: 'loc_lm_sallow_02' }, { lead: 'l_windpumps' }], options: [bye] },
    shale: { text: '"I\'ve seen its water go past under the floor." He thinks about it. "Is it big? Does it have a tower?"', options: [{ text: 'It has a tower.', exit: true }, { text: 'It\'s small.', exit: true }] },
    hostile: { text: 'He is up the tower and has stones.', options: [{ text: '(Leave him.)', exit: true }] },
  },
};

/** The locked door at the east end of the pump hall. */
export const d_dw_door: DialogueDef = {
  id: 'd_dw_door', owner: 'narrator',
  start: [{ if: { flag: 'dw_control_open' }, node: 'open' }, { node: 'locked' }],
  nodes: {
    locked: {
      text: 'A steel door at the east end of the pump hall, painted with a number worn to a shape: 4. The lock is a good one, pre-Burn, oiled by someone who never opened it. Behind it something hums at a pitch you feel in your teeth.',
      effects: [{ learn: 'dw_control_locked' }],
      options: [
        { id: 'door.key', text: '(Use the brass key.)', if: { item: 'k_station_key' }, effects: [{ set: 'dw_control_open' }, { set: 'dw_door_keyed' }], next: 'opens' },
        { id: 'door.pick', text: '(Pick it.)', check: { skill: 'security', dc: 35, mods: [{ if: { origin: 'door_watch' }, dc: -10, why: 'you have stood on the other side of locks like this' }] }, effects: [{ set: 'dw_control_open' }, { set: 'dw_door_picked' }, { xp: 40 }], next: 'opens', fail: 'pick_no' },
        { id: 'door.force', text: '(Force it.)', check: { attr: 'brawn', dc: 8, mods: [{ if: { item: 'w_pipe' }, dc: -2, why: 'a pipe for a lever' }, { if: { item: 'w_sledge' }, dc: -3, why: 'a sledge' }] }, effects: [{ set: 'dw_control_open' }, { set: 'dw_door_forced' }, { trust: { npc: 'npc_dw_01', by: -15 } }, { trust: { npc: 'npc_dw_02', by: -10 } }, { memory: { npc: 'npc_dw_01', tag: 'forced_door', valence: -20, strength: 80 } }, { xp: 30 }], next: 'forced', fail: 'force_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    opens: { text: 'The lock turns like it was oiled yesterday. The hum gets louder, and greener.', options: [{ text: '(Go in.)', exit: true }] },
    forced: { text: 'The frame goes before the lock does, with a noise the whole of Dry Wells hears. Across the yard, somebody puts a rifle down on a sandbag very carefully.', options: [{ text: '(Go in.)', exit: true }] },
    pick_no: { text: 'The pins are pre-Burn and cut to a tolerance nobody has made since. Twenty minutes, and the pick comes out bent.', effects: [{ time: 20 }], options: [{ text: '(Leave it.)', exit: true }] },
    force_no: { text: 'The door does not care. Your shoulder does.', effects: [{ time: 10 }], options: [{ text: '(Leave it.)', exit: true }] },
    open: { text: 'The door stands open on the green light.', options: [{ text: '(Go in.)', exit: true }] },
  },
};

/** The schedule console: what Shale drinks, and who decides. */
export const d_dw_console: DialogueDef = {
  id: 'd_dw_console', owner: 'narrator',
  start: [{ if: { flag: 'dw_outcome' }, node: 'after' }, { node: 'wake' }],
  nodes: {
    wake: {
      text: 'A console the width of the wall, dust on everything but the screen, which is clean because it has never been off. DW-4 — SUPPLY SCHEDULE — NETWORK 4. Below, a table: downstream nodes, allocations, times. SHALE — 0.62 — 06:00 11:00 16:00 21:00. C9 RESERVE — HELD. UPSTREAM AUTH: LINK UP. LAST CHANGE: 194 DAYS. ORIGIN OF CHANGE: UPSTREAM.',
      effects: [{ learn: 'dw_schedule_read' }, { lead: 'l_dw_schedule' }, { set: 'dw_console_seen' }, { xp: 40 }],
      passives: [
        { skill: 'science', dc: 30, text: '0.62 is not a measure of water. It is a fraction of something else: a target. The schedule is written to hold Shale at a number.', effects: [{ learn: 'dw_allocation_target' }, { lead: 'l_dw_target' }] },
        { if: { origin: 'archive_clerk' }, text: 'The change log is in record shorthand. Your hand. Every entry is signed the way the Cistern\'s outbound logs are signed.', effects: [{ learn: 'dw_log_hand' }, { lead: 'l_dw_log_hand' }] },
      ],
      options: [
        { id: 'console.c9', text: '(Find the Cistern on the schedule.)', if: { any: [{ origin: 'pump_hand' }, { knows: 'c9_pressure_constant' }] }, next: 'c9', once: true },
        { id: 'console.word', text: '(Enter the pump man\'s credential and set Shale\'s allocation by hand.)', if: { knows: 'dw_override_word' }, effects: [{ set: 'dw_how', value: 'word' }], next: 'restored' },
        { id: 'console.restore', text: '(Override the schedule. Give Shale the full allocation.)', check: { skill: 'science', dc: 45, mods: [{ if: { knows: 'relay_log_read' }, dc: -10, why: 'you have seen the format upstream' }, { if: { origin: 'archive_clerk' }, dc: -10, why: 'the log is in your hand' }, { if: { knows: 'dw_allocation_target' }, dc: -5, why: 'you know what the number is' }] }, effects: [{ set: 'dw_how', value: 'science' }], next: 'restored', fail: 'restore_no' },
        { id: 'console.keep', text: '(Leave the schedule as it is.)', next: 'keep_sure' },
        { text: '(Step back.)', exit: true },
      ],
    },
    c9: {
      text: 'C9 RESERVE — HELD — INFLOW: NETWORK 4 — SETPOINT: CONSTANT. The reservoir you grew up under is not a reservoir. It is a tank on a line, and the line comes through here, and the needle you watched for twenty years never moved because this console was holding it still.',
      effects: [{ learn: 'c9_fed_from_outside' }, { lead: 'l_c9_fed' }, { decision: { id: 'pressure_answered', text: 'You found the Cistern on the Dry Wells schedule: its water was never its own.' } }, { xp: 80 }],
      options: [{ text: '(Read on.)', next: 'menu' }],
    },
    menu: {
      text: 'SHALE — 0.62. The cursor waits.',
      options: [
        { id: 'console.word2', text: '(Enter the pump man\'s credential and set Shale\'s allocation by hand.)', if: { knows: 'dw_override_word' }, effects: [{ set: 'dw_how', value: 'word' }], next: 'restored' },
        { id: 'console.restore2', text: '(Override the schedule. Give Shale the full allocation.)', check: { skill: 'science', dc: 45, mods: [{ if: { knows: 'relay_log_read' }, dc: -10, why: 'you have seen the format upstream' }, { if: { origin: 'archive_clerk' }, dc: -10, why: 'the log is in your hand' }, { if: { knows: 'dw_allocation_target' }, dc: -5, why: 'you know what the number is' }] }, effects: [{ set: 'dw_how', value: 'science' }], next: 'restored', fail: 'restore_no' },
        { id: 'console.keep2', text: '(Leave the schedule as it is.)', next: 'keep_sure' },
        { text: '(Step back.)', exit: true },
      ],
    },
    restored: {
      text: [
        { if: { flag: 'dw_oriel_key' }, text: 'MAINT AUTH: MARR. The console takes the word as if it had been waiting sixty years for someone to say it. SHALE — 1.00. It thinks for the length of a breath, and then, under the floor, both pumps start at once, outside the clock, and keep going. A new line at the bottom of the log: ORIGIN OF CHANGE: DW-4 LOCAL.' },
        { text: 'The table takes the number. SHALE — 1.00. The console thinks about it for the length of a breath, and then, under the floor, both pumps start at once, outside the clock, and keep going. UPSTREAM AUTH: LINK UP. A new line at the bottom of the log: ORIGIN OF CHANGE: DW-4 LOCAL.' },
      ],
      effects: [{ set: 'dw_outcome', value: 'restored' }, { set: 'dw_restored' }, { decision: { id: 'dw_restored', text: 'You set Shale\'s allocation at Dry Wells to the full measure. Something upstream will notice.' } }, { xp: 150 }],
      options: [{ text: '(Step back.)', exit: true }],
    },
    restore_no: { text: 'The console rejects the number twice, and the second time it logs you: a line in shorthand, the hour, the attempt. The screen goes back to the table. Patient.', effects: [{ set: 'dw_restore_failed' }, { time: 30 }], options: [{ text: '(Step back.)', exit: true }] },
    keep_sure: {
      text: 'SHALE — 0.62. The pumps on their clock. Shale thinner every year, in a way nobody there can name. Somewhere upstream, a line in a book stays as it was.',
      options: [
        { id: 'console.keep.yes', text: '(Leave it. It isn\'t yours to change, and whatever changed it can change it back.)', effects: [{ set: 'dw_outcome', value: 'kept' }, { set: 'dw_kept' }, { decision: { id: 'dw_kept', text: 'You left the Dry Wells schedule as you found it: Shale at 0.62.' } }, { xp: 100 }], next: 'kept' },
        { text: '(No. Look again.)', next: 'menu' },
      ],
    },
    kept: { text: 'The screen does not change, because nothing has. At eleven, under the floor, the pumps start on time.', options: [{ text: '(Step back.)', exit: true }] },
    after: {
      text: [
        { if: { flag: 'dw_restored' }, text: 'SHALE — 1.00. ORIGIN OF CHANGE: DW-4 LOCAL. The pumps are running outside the clock, and the log\'s last line is yours.' },
        { if: { flag: 'dw_freed' }, text: 'FAULT — GOVERNOR. The table is frozen at a number the pumps no longer read. Under the floor they run flat out, and the screen has stopped pretending to know.' },
        { if: { flag: 'dw_sold' }, text: 'GUILD OVERRIDE — POST NINE-WEST. The table has a new column, and the column is headed PAID.' },
        { text: 'SHALE — 0.62. Nothing has changed, which was the choice.' },
      ],
      options: [{ id: 'console.c9.after', text: '(Find the Cistern on the schedule.)', if: { all: [{ any: [{ origin: 'pump_hand' }, { knows: 'c9_pressure_constant' }] }, { not: { knows: 'c9_fed_from_outside' } }] }, next: 'c9_after' }, { text: '(Step back.)', exit: true }],
    },
    c9_after: {
      text: 'C9 RESERVE — HELD — INFLOW: NETWORK 4 — SETPOINT: CONSTANT. The reservoir you grew up under is not a reservoir. It is a tank on a line, and the line comes through here.',
      effects: [{ learn: 'c9_fed_from_outside' }, { lead: 'l_c9_fed' }, { decision: { id: 'pressure_answered', text: 'You found the Cistern on the Dry Wells schedule: its water was never its own.' } }, { xp: 80 }],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

/** The pressure panel and the governor under it. */
export const d_dw_panel: DialogueDef = {
  id: 'd_dw_panel', owner: 'narrator',
  start: [{ if: { flag: 'dw_governor_broken' }, node: 'broken' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A pressure panel, gauges in a row, one needle alive. Under them a governor box with a lead seal, and pressed into the lead a half-moon like the one on everything the Tollmen carry. Older, though. Much older.',
      effects: [{ learn: 'dw_panel_seen' }, { lead: 'l_dw_halfmoon' }],
      passives: [{ skill: 'mechanics', dc: 30, text: 'The governor is what listens to the console. Break it and the pumps run on their own pressure, flat out, until the aquifer or the bearings give up.', effects: [{ learn: 'dw_governor_known' }] }],
      options: [
        { id: 'panel.break', text: '(Break the governor.)', if: { all: [{ knows: 'dw_governor_known' }, { not: { flag: 'dw_outcome' } }] }, check: { skill: 'mechanics', dc: 35, mods: [{ if: { origin: 'pump_hand' }, dc: -15, why: 'you know where a governor is weak' }, { if: { item: 'w_sledge' }, dc: -10, why: 'a sledge' }] }, next: 'broken_now', fail: 'break_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    broken_now: {
      text: 'The seal goes, then the box. The pumps lurch, miss, and come up together at a pitch the hall was never built for; the floor hums; the tower pipe sings. Through the door the console says FAULT and then says nothing. Shale will have water tonight. All of it, until something gives.',
      effects: [{ set: 'dw_outcome', value: 'freed' }, { set: 'dw_freed' }, { set: 'dw_governor_broken' }, { set: 'dw_how', value: 'governor' }, { decision: { id: 'dw_freed', text: 'You broke the governor at Dry Wells. The pumps run flat out, for Shale, until something gives.' } }, { trust: { npc: 'npc_dw_01', by: -15 } }, { trust: { npc: 'npc_dw_04', by: -20 } }, { xp: 120 }],
      options: [{ text: '(Step back.)', exit: true }],
    },
    break_no: { text: 'The box is built like the door. You skin a knuckle on the seal and the needle does not so much as tremble.', effects: [{ time: 20 }], options: [{ text: '(Leave it.)', exit: true }] },
    broken: { text: 'The governor box is in pieces on the floor. The pumps do not stop.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_dw_valve: DialogueDef = {
  id: 'd_dw_valve', owner: 'narrator',
  start: [{ if: { flag: 'dw_valve_closed' }, node: 'closed' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A hand-wheel on the line where it leaves the hall, going north under the floor toward Shale. Off it, a branch, newer, hand-made, running west toward the shacks. The paint on the wheel is gone on exactly one quarter.',
      passives: [{ skill: 'mechanics', dc: 20, text: 'A bypass. The family\'s tap. Whatever Shale gets, this takes a little first.', effects: [{ learn: 'dw_bypass_known' }, { lead: 'l_dw_bypass' }] }],
      options: [
        { id: 'valve.close', text: '(Close the bypass.)', if: { knows: 'dw_bypass_known' }, check: { skill: 'mechanics', dc: 25 }, effects: [{ set: 'dw_valve_closed' }, { set: 'dw_valve_closed_by_you' }, { trust: { npc: 'npc_dw_01', by: -15 } }, { trust: { npc: 'npc_dw_02', by: -15 } }, { trust: { npc: 'npc_dw_04', by: -20 } }, { decision: { id: 'dw_valve_closed', text: 'You closed the family\'s bypass at Dry Wells.' } }, { xp: 30 }], next: 'closed_now', fail: 'close_no' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    closed_now: { text: 'A quarter turn, then another, against sixty years of habit. The branch line ticks as it drains. Across the yard a kid stops whistling.', options: [{ text: '(Step back.)', exit: true }] },
    close_no: { text: 'The wheel is seized at the quarter. Someone has made sure it only goes one way.', effects: [{ time: 10 }], options: [{ text: '(Leave it.)', exit: true }] },
    closed: { text: 'The wheel is shut. The branch line is dry and quiet.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

export const d_dw_pumps: DialogueDef = {
  id: 'd_dw_pumps', owner: 'narrator',
  start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { origin: 'pump_hand' }, text: 'Two pumps the size of houses, pre-Burn and patched since by somebody who knew them. You could strip the near one blind; you did, at home, every spring. The box on it that clicks before every run is the only thing on it you never saw there.' },
        { text: 'Two pumps the size of houses, pre-Burn and patched since by somebody who knew them: brass where there was brass, scrap where there wasn\'t. Between runs they tick as they cool. A box on the near one clicks before every run.' },
      ],
      passives: [{ attr: 'senses', dc: 6, text: 'The click is the click on the north pump in Shale\'s yard. The same box. Counting.', effects: [{ learn: 'dw_pumps_click' }, { lead: 'l_pumps_clock' }] }],
      effects: [{ learn: 'seen_dw_pumps' }],
      options: [{ text: '(Step back.)', exit: true }],
    },
  },
};

export const d_dw_diary_table: DialogueDef = {
  id: 'd_dw_diary_table', owner: 'narrator',
  start: [{ if: { item: 'k_pumpman_diary' }, node: 'gone' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'A table with one book on it, swollen with sixty years of being read: a pump man\'s diary. Gauges, dates, a drawing of a door. The first page is a line of block capitals, underlined twice.',
      options: [
        { id: 'diary.read', text: '(Read it.)', next: 'read' },
        { text: '(Leave it.)', exit: true },
      ],
    },
    read: {
      text: 'The first page: MAINT AUTH — MARR — DW4 — "ELEVEN". Then forty years of readings in a hand that gets smaller. The last entry, from before you were born: "Shale cut to .62. Not drought. Told no one. Who would I tell."',
      effects: [{ learn: 'dw_override_word' }, { learn: 'dw_diary_read' }, { lead: 'l_dw_diary' }, { xp: 40 }],
      options: [
        { id: 'diary.take', text: '(Take it.)', effects: [{ give: 'k_pumpman_diary' }], next: 'take' },
        { text: '(Put it back.)', exit: true },
      ],
    },
    take: {
      text: [
        { if: { flag: 'dw_oriel_key' }, text: '"Take it," says Oriel from the chair, without opening her eyes. "I know what\'s in it. I\'ve had sixty years."' },
        { if: { flag: 'dw_fight' }, text: 'Nobody says anything. The book is lighter than it looks.' },
        { text: 'She watches you put it under your coat and says nothing, which is worse than if she had.' },
      ],
      effects: [{ set: 'dw_diary_taken' }],
      options: [{ text: '(Go.)', exit: true }],
    },
    gone: { text: 'The table, and the mark where the book was.', options: [{ text: '(Leave it.)', exit: true }] },
  },
};

/** The Tollmen's engineer at the console, after the sale. */
export const d_dw_clerk: DialogueDef = {
  id: 'd_dw_clerk', owner: 'npc_dw_06',
  start: [{ node: 'intro' }],
  nodes: {
    intro: {
      text: '"Factor Pike\'s compliments." A guild engineer with a ledger open on the console and a flask of good water beside it. "Allocation is by the measure now, and the measure is posted. Shale will find it reliable. Everyone does, in the end."',
      options: [{ text: 'As per.', exit: true }],
    },
  },
};
