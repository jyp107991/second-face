import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Tribute Day at the wells: Vasha and four Dogs, the sheriff and her rifles, the town leaning in. One
 * conversation, several ways out of it. Vasha's Shale placement speaks this tree; Ada's lines are hers.
 */

const ADA = 'npc_sh_01';
const SETTLE = (outcome: string, text: string) => [{ set: 'tribute_resolved' }, { set: 'tribute_outcome', value: outcome }, { decision: { id: `tribute_${outcome}`, text } }, { xp: 60 }];

export const d_tribute: DialogueDef = {
  id: 'd_tribute', owner: 'npc_rd_02',
  start: [{ if: { flag: 'tribute_resolved' }, node: 'done' }, { if: { flag: 'tribute_opened' }, node: 'menu' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: { flag: 'truck_sabotaged' }, text: 'Sheriff. Twice a year, and you still make me ask.\n\nWe walked. Somebody cut the truck\'s fuel line in the night, so we walked, with a cart, and I am not in a mood.' },
        { text: 'Sheriff. Twice a year, and you still make me ask.' },
      ],
      effects: [{ set: 'tribute_opened' }],
      options: [{ text: '(Listen.)', next: 'ada_asks' }],
    },
    ada_asks: { speaker: ADA, text: 'Say the number, Vasha.', options: [{ text: '(Listen.)', next: 'number' }] },
    number: {
      text: [
        { if: { flag: 'rd_terms_carried' }, text: 'Forty measures of water, everything the bar has brewed, and the salt-cut face there tells me what the bunker\'s worth. Kessler may have said less. Kessler isn\'t here.' },
        { text: 'Forty measures of water, everything the bar has brewed, and the salt-cut face there tells me what the bunker\'s worth.' },
      ],
      passives: [{ attr: 'wits', dc: 7, text: 'Four Dogs. Two revolvers, a sawn-off, a pipe. Issa has the bolt rifle on the office roof and Vasha has not looked up once, which means she knows.' }],
      options: [{ text: '(Answer.)', next: 'menu' }],
    },
    menu: {
      text: 'Well?',
      options: [
        { id: 'trib.terms.ok', text: 'Kessler\'s terms were half of last time, in water. The sheriff has agreed to them. Take it and go.', if: { flag: 'ada_terms_accepted' }, next: 'terms_ok' },
        { id: 'trib.terms', text: 'Kessler\'s terms were half, in water. I carried them. Sheriff — half.', if: { all: [{ flag: 'rd_terms_carried' }, { not: { flag: 'ada_terms_accepted' } }] }, check: { skill: 'speech', dc: 35, mods: [{ if: { trust: { npc: 'npc_sh_01', gte: 10 } }, dc: -10, why: 'the sheriff trusts you' }] }, next: 'terms_ok', fail: 'terms_fail' },
        { id: 'trib.zero', text: 'Shale pays nothing this year. Walk home, Vasha, and tell Kessler his list just got longer.', check: { skill: 'speech', dc: 60, mods: [{ if: { knows: 'issa_counts_you' }, dc: -10, why: 'the militia counts you as a rifle' }, { if: { flag: 'truck_sabotaged' }, dc: -10, why: 'they came on foot' }] }, next: 'zero', fail: 'zero_fail' },
        { id: 'trib.truck', text: 'Your truck\'s cut. You carry what you can carry, and you carry it now.', if: { flag: 'truck_sabotaged' }, next: 'truck' },
        { id: 'trib.pay', text: '(Pay it yourself.) Forty Tolls, and the water stays in Shale.', if: { item: 'tolls', count: 40 }, effects: [{ take: 'tolls', count: 40 }], next: 'pay_you' },
        { id: 'trib.ada', text: 'Sheriff. Your call.', next: 'ada_call' },
        { id: 'trib.fight', text: 'We fight.', next: 'fight' },
      ],
    },
    terms_ok: {
      text: '"Kessler\'s terms." She laughs, once, without anything in it. "Half, then, if the sheriff says and Kessler says and the salt cut says. Count it, Sheriff. I\'ll be counting too." The Dogs load twenty measures onto the cart. She looks at you the whole time.',
      effects: [...SETTLE('negotiated', 'Shale paid the Dogs half, on Kessler\'s terms you carried; Vasha Kade left with less than she came for.'), { set: 'ada_terms_accepted' }, { memory: { npc: 'npc_rd_02', tag: 'humiliated_on_tribute', valence: -25, strength: 90 } }, { trust: { npc: 'npc_sh_01', by: 10 } }, { rep: { faction: 'rust_dogs', respect: 5 } }, { news: { tag: 'tribute_halved', text: 'the Dogs took half the tithe this year, on the chief\'s own terms', valence: 15, size: 6, at: 'shale' } }],
      options: [{ text: '(Watch them go.)', exit: true }],
    },
    terms_fail: { speaker: ADA, text: '"I said nothing about half." Flat, in front of the town. "Say the number, Vasha."', effects: [{ trust: { npc: 'npc_sh_01', by: -5 } }], options: [{ text: '(Answer.)', next: 'menu' }] },
    zero: {
      text: 'A long silence. The Dogs look at her; the town looks at the Dogs. "…Then it\'s on you," Vasha says, very quietly, and takes only the drink. "Say your name again, salt cut. I want it right."',
      effects: [...SETTLE('negotiated', 'You talked Vasha Kade down to nothing on Tribute Day. The Dogs went home with drink and no water.'), { set: 'tribute_zero' }, { memory: { npc: 'npc_rd_02', tag: 'humiliated_on_tribute', valence: -40, strength: 100 } }, { trust: { npc: 'npc_sh_01', by: 15 } }, { rep: { faction: 'rust_dogs', fear: 10 } }, { news: { tag: 'tribute_refused', text: 'Shale paid the Dogs nothing this year and the Dogs walked', valence: 25, size: 8, at: 'shale' } }],
      options: [{ text: '(Watch them go.)', exit: true }],
    },
    zero_fail: { text: '"No." She doesn\'t raise her voice. "Forty measures. Now the salt cut has made it fifty."', effects: [{ set: 'tribute_raised' }], options: [{ text: '(Answer.)', next: 'menu_raised' }] },
    menu_raised: {
      text: 'Fifty. Well?',
      options: [
        { id: 'trib.pay50', text: '(Pay it yourself.) Fifty Tolls.', if: { item: 'tolls', count: 50 }, effects: [{ take: 'tolls', count: 50 }], next: 'pay_you' },
        { id: 'trib.ada50', text: 'Sheriff. Your call.', next: 'ada_call' },
        { id: 'trib.fight50', text: 'We fight.', next: 'fight' },
      ],
    },
    truck: {
      text: 'She looks at the cart, and at the four Dogs, and at the forty measures she cannot carry. "Ten measures. And the drink." The town hears it. "Whoever cut my truck: I\'ll find you. I find everyone."',
      effects: [...SETTLE('sabotaged', 'With their truck cut, the Dogs could carry only ten measures out of Shale on Tribute Day.'), { set: 'tribute_retaliation_due' }, { memory: { npc: 'npc_rd_02', tag: 'truck_cut', valence: -20, strength: 90 } }, { news: { tag: 'tribute_light', text: 'the Dogs came on foot and left with a quarter of the tithe', valence: 10, size: 6, at: 'shale' } }],
      options: [{ text: '(Watch them go.)', exit: true }],
    },
    pay_you: {
      text: 'Vasha weighs the Tolls in her hand and then, deliberately, does not count them. "The salt cut pays Shale\'s water." She pockets it. "That\'s a thing I\'ll remember." The Dogs take the drink and leave the water where it is.',
      effects: [...SETTLE('paid', 'You paid the Dogs\' tithe yourself, in Tolls, and Shale kept its water.'), { set: 'tribute_paid_by_you' }, { trust: { npc: 'npc_sh_01', by: 10 } }, { memory: { npc: 'npc_sh_03', tag: 'outsider_paid_tithe', valence: -5 } }, { news: { tag: 'tithe_paid_by_stranger', text: 'the one from the salt cut paid the Dogs\' tithe out of their own pocket', valence: 15, size: 7, at: 'shale' } }],
      options: [{ text: '(Watch them go.)', exit: true }],
    },
    ada_call: {
      speaker: ADA,
      text: [
        { if: { knows: 'ada_would_fight' }, text: '"Noted." She looks at Issa on the roof, and at Jonah, and at you. "We pay." Jonah\'s face does something. "Forty measures. Load it, and get out of my town."' },
        { text: '"We pay." She doesn\'t look at Jonah. "Forty measures. Load it, and get out of my town."' },
      ],
      effects: [...SETTLE('paid', 'Shale paid the Dogs\' tithe in full on Tribute Day, on the sheriff\'s word.'), { memory: { npc: 'npc_sh_02', tag: 'paid_again', valence: -10 } }, { news: { tag: 'tribute_paid', text: 'Shale paid the Dogs\' tithe in full', valence: -5, size: 5, at: 'shale' } }],
      options: [{ text: '(Watch them load the cart.)', exit: true }],
    },
    fight: {
      speaker: ADA,
      text: [
        { if: { knows: 'ada_would_fight' }, text: '"…Noted." The word she promised. "Issa."' },
        { text: '"You don\'t speak for Shale —" and then Issa, from the roof: "They do now." Ada closes her eyes for exactly one second. "Issa."' },
      ],
      effects: [{ set: 'tribute_fight' }, { decision: { id: 'tribute_fight', text: 'Shale fought the Rust Dogs at the wells on Tribute Day, on your word.' } }, { event: 'fight' }],
      options: [{ text: '(—)', exit: true }],
    },
    done: { text: 'It\'s settled. For now.', options: [{ text: '(Nod.)', exit: true }] },
  },
};

/** The Dogs' truck at the overpass: cut it, and they come to Shale on foot. */
export const d_rd_truck: DialogueDef = {
  id: 'd_rd_truck', owner: 'narrator',
  start: [{ if: { flag: 'truck_sabotaged' }, node: 'cut' }, { node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { hour: { from: 22, to: 5 } }, text: 'A pre-Burn flatbed kept alive by Sallow Jack and spite: the Dogs\' truck, the one that carries the tithe. The fires are down and the nearest Dog is asleep against a pier.' },
        { text: 'A pre-Burn flatbed kept alive by Sallow Jack and spite: the Dogs\' truck, the one that carries the tithe. Lute is twenty paces off, watching the pens — and you.' },
      ],
      options: [
        { id: 'truck.mech', text: '(Cut the fuel line where it won\'t show.)', if: { hour: { from: 22, to: 5 } }, check: { skill: 'mechanics', dc: 40 }, effects: [{ set: 'truck_sabotaged' }, { decision: { id: 'truck_sabotaged', text: 'You cut the Dogs\' truck in the night so they would come to Shale on foot.' } }, { xp: 40 }], next: 'done', fail: 'fail' },
        { id: 'truck.locks', text: '(Pull the distributor cap and the rotor, and pocket them.)', if: { hour: { from: 22, to: 5 } }, check: { skill: 'security', dc: 35 }, effects: [{ set: 'truck_sabotaged' }, { decision: { id: 'truck_sabotaged', text: 'You pulled the Dogs\' truck apart in the night so they would come to Shale on foot.' } }, { xp: 40 }], next: 'done', fail: 'fail' },
        { id: 'truck.day', text: '(Do it anyway, in daylight.)', if: { not: { hour: { from: 22, to: 5 } } }, effects: [{ set: 'rustdogs_hostile' }, { decision: { id: 'truck_in_daylight', text: 'You went at the Dogs\' truck in daylight, in front of them.' } }, { event: 'combat' }], exit: true },
        { text: '(Leave it.)', exit: true },
      ],
    },
    fail: { text: 'You get a hand on the line and the pier shifts: Lute, turning over. You let go and walk away slowly, and nobody says anything, and you don\'t try again tonight.', effects: [{ set: 'truck_attempt_failed' }, { time: 15 }], options: [{ text: '(Walk away.)', exit: true }] },
    done: { text: 'Done, and nothing to show for it but a wet thumb. They\'ll find out when they try to start it.', options: [{ text: '(Walk away.)', exit: true }] },
    cut: { text: 'The truck. It won\'t be going anywhere.', options: [{ text: '(Walk away.)', exit: true }] },
  },
};
