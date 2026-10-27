import type { DialogueDef } from '../../engine/dialogue/dialogue';

/**
 * Shallow talk for background people, by role: a line about the place and the day, a direction or two, and a way
 * out. Nobody here has a quest; everybody here has an opinion. Standing changes the tone.
 */

const bye = { text: 'Take care.', exit: true };
const warm = (settlement: string) => ({ standing: { settlement, gte: 15 } });
const cold = (settlement: string) => ({ standing: { settlement, lte: -15 } });

function tree(id: string, lines: { if?: unknown; text: string }[], asks: { text: string; reply: string }[]): DialogueDef {
  const nodes: DialogueDef['nodes'] = {
    hello: {
      text: lines as DialogueDef['nodes'][string]['text'],
      options: [...asks.map((a, i) => ({ id: `${id}.${i}`, text: a.text, next: `a${i}`, once: true })), bye],
    },
  };
  asks.forEach((a, i) => { nodes[`a${i}`] = { text: a.reply, options: [{ text: 'Thanks.', next: 'hello' }] }; });
  return { id, owner: 'narrator', start: [{ node: 'hello' }], nodes };
}

export const d_x_settler = tree('d_x_settler', [
  { if: warm('shale'), text: '"Oh, it\'s you." A nod, almost a smile. "Dust\'s up. Mind the wells, they\'re slippy when they run."' },
  { if: cold('shale'), text: '"Hm." They look past you. "Don\'t know anything. Ask the sheriff."' },
  { text: '"You\'re not from here." Not a question. "We get a few. Most go on east. Water\'s two a measure if you\'re asking."' },
], [
  { text: 'Where\'s the sheriff?', reply: '"Office is the one with the flag that was a sheet once. Knock; she doesn\'t like surprises."' },
  { text: 'Anywhere to sleep?', reply: '"Mags has a room behind the saloon, if you\'ve got ten and don\'t mind the noise. The Choir\'ll put you on a cot for nothing and pray at you for less."' },
  { text: 'How\'s the water?', reply: '"Comes when it comes. Twice a year somebody turns a dial somewhere and it comes less." A shrug. "Nobody here knows where the dial is."' },
]);

export const d_x_labourer = tree('d_x_labourer', [
  { if: warm('shale'), text: '"Give us a hand with this?" They laugh. "No. Go on. You\'ve done enough for one town."' },
  { text: '"Two more loads." They don\'t stop. "Talk fast."' },
], [
  { text: 'What are you hauling?', reply: '"Scrap, salt, water, whatever\'s heavy. The guild pays by the load and weighs it light."' },
  { text: 'Hard work.', reply: '"Work\'s work. Beats the overpass. Beats the road." They heft it. "Doesn\'t beat much else."' },
]);

export const d_x_trader = tree('d_x_trader', [
  { text: '"Looking or buying?" The stall is three planks and a cloth, and everything on it has been owned before.' },
], [
  { text: 'What have you got?', reply: '"Odds. Wire, a lamp that works, a boot that doesn\'t. Pike has the real stock; I have what Pike won\'t touch."' },
  { text: 'Who buys here?', reply: '"Anyone with Tolls. Drifters, Dogs on a quiet day, the Choir when they\'ve sold fruit. Guild scrip at a discount, and don\'t tell Pike I said so."' },
]);

export const d_x_drifter = tree('d_x_drifter', [
  { text: '"Don\'t." They say it before you have asked anything. Then, softer: "Spare a water?"' },
], [
  { text: 'Where are you from?', reply: '"Somewhere with a name. It\'s gone; I\'m not. That\'s the whole story, friend."' },
  { text: 'Where are you going?', reply: '"East, like everyone. Or west, if east doesn\'t want me." They look at the road. "The road doesn\'t care."' },
]);

export const d_x_pilgrim = tree('d_x_pilgrim', [
  { text: '"The sky is open, friend." A grey scarf, clean hands, a look that is kinder than the place. "Are you hurt? We don\'t charge for asking."' },
], [
  { text: 'What do you believe?', reply: '"That the sky keeps no books. That what\'s buried under it is free. That\'s most of it; the rest is farming."' },
  { text: 'Where is the mission?', reply: '"The tents by the west wall, with the sign on the pole. Sister Calla is there; she\'ll see to you before she sees to herself."' },
]);

export const d_x_raider = tree('d_x_raider', [
  { if: { rep: { faction: 'rust_dogs', respect: 20 } }, text: '"Kessler\'s friend." A nod with no warmth in it, which from a Dog is warmth. "Don\'t steal anything. That\'s our job."' },
  { text: '"What are you looking at." Scrap plates, a knife, a face that has been hit more than once. "Keep walking."' },
], [
  { text: 'What is it like, under the overpass?', reply: '"Dry. Loud. Nobody dies alone, which is more than Shale can say." They spit. "Kessler counts us. That\'s the deal."' },
]);

export const d_x_guard = tree('d_x_guard', [
  { text: '"Move along." The carbine stays where it is, which is the courtesy. "Nothing to see. If there was, you\'d have paid for it."' },
], [
  { text: 'Quiet post?', reply: '"Quiet is the job. Loud is a report I have to write." A glance at the road. "Dogs came by last month. I wrote it."' },
]);

export const d_x_nomad = tree('d_x_nomad', [
  { text: '"Horses first." They finish with the horse before they look at you. "Trade or go; the Wheel doesn\'t stop for talk."' },
], [
  { text: 'Where is the Wheel going?', reply: '"Where the water is. The mother decides; the rest of us find out at dawn." A shrug. "It\'s a good way to live if you don\'t need to know."' },
]);

export const d_x_street = tree('d_x_street', [
  { text: '"Got a light?" They don\'t want a light. They want to know what you are, and they decide fast.' },
], [
  { text: 'Who runs this corner?', reply: '"Whoever\'s standing on it. Right now that\'s me, and I\'m not selling, so."' },
]);

export const d_x_medic = tree('d_x_medic', [
  { text: '"Wash it. Then come back." They say it without looking up, to anyone, about anything.' },
], [
  { text: 'Busy?', reply: '"Always. Dust in the lungs, salt in the cuts, the water doing what the water does. Sit if you\'re bleeding; otherwise I\'m working."' },
]);

export const EXTRA_DIALOGUES = [d_x_settler, d_x_labourer, d_x_trader, d_x_drifter, d_x_pilgrim, d_x_raider, d_x_guard, d_x_nomad, d_x_street, d_x_medic];
