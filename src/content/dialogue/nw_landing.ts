import type { DialogueDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, IN, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './nw_river';
import { NOTICE } from './nw_dam';

/**
 * Low Landing (B5c): A Load for the City (`q_nw_run`: the Patience's sealed load, the run down the river, the reed boats in
 * the night reach, what the load is, and its three ends), the bargewoman, the guild's factor, the chandler and the berth, the
 * guild's winch and a man on paper, the city's notice. The quay's barge board is in nw_river.ts. Story notes:
 * story/B5c_NOTES_SECRET.md.
 */

const RUN_OPEN: Cond = { not: { flag: 'nw_run' } };
const CREW: Cond = { flag: 'nw_run_crew' };
const R = (v: string): Cond => ({ flag: 'nw_run', eq: v });
const STAGE = (v: string): Cond => ({ flag: 'nw_run_stage', eq: v });
const KNOWS_LOAD: Cond = { any: [{ lead: 'l_nw_crates' }, { knows: 'nw_kennel_known' }] };

// ---------------------------------------------------------------- the ends of the run

const RUN = (v: string, text: string, extra: Effect[]): Effect[] => [{ quest: 'q_nw_run', start: true }, { set: 'nw_run', value: v }, { set: 'nw_run_stage', value: 'done' }, ...extra, { decision: { id: `nw_run_${v}`, text } }];
const TO_CITY: Effect = { event: 'goto', data: { location: 'md_precinct', spawn: 'from_riverdock' } };
export const RUN_DELIVERED: Effect[] = RUN('delivered', 'I saw the Patience\'s sealed load to the guild\'s man at the city\'s canal basin. Magda Kowal has her mooring and her barge. The guild has twelve cases of the Concern\'s kennel boards.', [
  { set: 'nw_controllers', value: 'guild' }, { set: 'nw_patience', value: 'kept' }, { give: 'tolls', count: 75 }, { give: 'k_nw_token' }, { rep: { faction: 'tollmen', respect: 5 } }, { xp: 150 },
  A(KES, -10), A(WREN, -5), A(ASH, -5), A(NINE, -3),
]);
export const RUN_RIVER: Effect[] = RUN('river', 'I put the Patience\'s sealed load over the side in the deep reach above the city: twelve cases of the Concern\'s kennel boards, in the mud for good. Nobody was paid for them.', [
  { set: 'nw_controllers', value: 'river' }, { xp: 140 }, A(KES, 5), A(ASH, 3), A(WREN, 3), A(TAMSIN, 2),
  { news: { tag: 'nw_load_lost', text: 'a guild load bound for the city\'s Docks went into the river from the Patience', valence: 2, size: 4, at: 'low_landing' } },
]);
export const RUN_WARDENS: Effect[] = RUN('wardens', 'I took the Patience\'s sealed load and the guild\'s waybill to the wardens at the city gate. The record has twelve cases of the Concern\'s kennel boards, and the guild\'s name on the paper.', [
  { set: 'nw_controllers', value: 'ledger' }, { set: 'nw_guild_wary' }, { set: 'nw_patience', value: 'kept' }, { give: 'tolls', count: 50 }, { give: 'k_nw_token' },
  { rep: { faction: 'wardens', respect: 10 } }, { rep: { faction: 'tollmen', respect: -10 } }, { xp: 160 }, A(NINE, 5), A(KES, 3), A(ODILE, -2),
  { news: { tag: 'nw_load_seized', text: 'the wardens seized a guild load of Concern machine parts at the city gate, off the Patience', valence: 3, size: 6, at: 'meridian' } },
]);

// ---------------------------------------------------------------- the run

export const d_nw_run: DialogueDef = {
  id: 'd_nw_run', owner: 'npc_nw_12',
  start: [{ if: STAGE('deep'), node: 'deep' }, { if: STAGE('night'), node: 'night' }, { if: STAGE('chute'), node: 'chute' }, { node: 'cast' }],
  nodes: {
    cast: {
      text: '"First light," Magda says. "The river\'s highest at first light, when the dam lets the noon water down overnight." She hands you the bow sweep. "Pull when I say pull. Don\'t when I don\'t."',
      again: '"Pull when I say pull."',
      options: [
        { id: 'run.cast', text: '(Cast off at first light.)', effects: [{ until: 6 }, { set: 'nw_run_stage', value: 'chute' }], next: 'chute' },
        { text: 'Not yet.', exit: true },
      ],
    },
    chute: {
      speaker: 'narrator',
      text: 'Below the Landing the river goes into a gorge and down a long fall of water over rock, the Chute, and the Patience goes into it nose first with Magda at the stern oar shouting. Rock goes by close enough to touch. "Pull!" she shouts. "Now! Pull!"',
      again: 'The Chute, the rock going by.',
      interject: [{ companion: TAMSIN, text: 'Tamsin is holding on to the deckhouse with both arms and laughing so hard she cannot breathe. "AGAIN," she shouts at the river. "DO IT AGAIN."', effects: [A(TAMSIN, 2)] }],
      options: [
        { id: 'run.pull', text: '(Pull.)', check: { attr: 'brawn', dc: 6 }, effects: [{ time: 120 }, { set: 'nw_run_stage', value: 'night' }], next: 'through', fail: 'rock', failEffects: [{ time: 180 }, { set: 'nw_run_stage', value: 'night' }] },
        { id: 'run.read', text: '(Read the water and call the rocks for her.)', check: { skill: 'survival', dc: 40 }, effects: [{ time: 120 }, { set: 'nw_run_stage', value: 'night' }], next: 'through', fail: 'rock', failEffects: [{ time: 180 }, { set: 'nw_run_stage', value: 'night' }] },
      ],
    },
    through: { speaker: 'narrator', text: 'Through, and out into the long flat reach below with the gorge behind you and the Patience turning slowly in the eddy as if she were pleased with herself. Magda lets go of the oar and laughs out loud. "Twenty years," she says. "Never once dull."', again: 'Out into the long reach.', options: [{ text: '(On down the river.)', next: 'night' }] },
    rock: { speaker: 'narrator', text: 'A rock you did not see comes up under the bow with a sound like a door slamming, and the Patience slews and ships water, and for an hour after the Chute you bail with a bucket while Magda swears at you and the river by turns. She is not hurt. Neither is the load.', again: 'Bailing.', options: [{ text: '(On down the river.)', next: 'night' }] },
    night: {
      speaker: 'narrator',
      text: 'The night reach: a long slow river through reed beds higher than the barge, no moon, Magda\'s stern lamp the only light, and then other lamps, low on the water, shuttered, coming out of the reeds on both sides. Two flat boats. A woman with a rifle stands up in the first. "Evening, Patience," she calls. "Bryony. You know me, Magda." Magda does, by her face. "Guild load, is it? Let\'s have a look at what the guild doesn\'t write down."',
      again: 'The reed boats in the night reach.',
      effects: [{ learn: 'nw_reeds_met' }],
      options: [
        { id: 'run.open', text: '(Open a case for her.)', if: { not: { lead: 'l_nw_kennel' } }, effects: [{ lead: 'l_nw_crates' }, { lead: 'l_nw_kennel' }], next: 'kennel' },
        { id: 'run.talk', text: 'It\'s Magda\'s mooring in those cases. Let us by.', check: { skill: 'speech', dc: 40, mods: [{ if: { knows: 'nw_reeds_met' }, dc: -5, why: 'you have met her on the bank' }, { if: IN(WREN), dc: -5, why: 'Wren, who knows a brand when she sees one' }] }, effects: [{ set: 'nw_run_stage', value: 'deep' }], next: 'by', fail: 'toll' },
        { id: 'run.shot', text: '(Put a shot over their heads.)', check: { skill: 'firearms', dc: 40 }, effects: [{ set: 'nw_run_stage', value: 'deep' }, { set: 'nw_reeds_warned' }], next: 'warned', fail: 'toll' },
        { id: 'run.pay', text: '(Pay her twenty to let you by.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { set: 'nw_run_stage', value: 'deep' }], next: 'by' },
        { id: 'run.give', text: '(Give her one case.)', effects: [{ set: 'nw_one_crate' }, { set: 'nw_run_stage', value: 'deep' }], next: 'one' },
      ],
    },
    kennel: {
      text: 'You prise up the lid of the nearest case with Magda\'s knife. Straw, and in the straw a board potted in black resin with the Concern\'s closed eye etched on it, a tag wired to it, KENNEL 7, and on its underside a socket shaped for something\'s neck. Bryony looks at it a long time in her lamp. "A kennel board," she says. "The brain for a hound. One of the machine dogs." She looks at the eleven other cases. "Somebody means to wake dogs in the city."',
      again: '"Somebody means to wake dogs in the city."',
      interject: [{ companion: KES, text: 'Kes has gone very quiet. "Concern lineage," she says. "Fresh off the line. You put one of those in a sleeping hound and say the word, and it\'s a hound again." She looks down the dark river toward the city. "Twelve. That\'s a pack."', effects: [A(KES, 2)] }],
      options: [
        { id: 'run.kennel.talk', text: 'Let us by. I haven\'t decided what to do with them.', next: 'by_kennel' },
        { id: 'run.kennel.give', text: '(Give her one.)', effects: [{ set: 'nw_one_crate' }, { set: 'nw_run_stage', value: 'deep' }], next: 'one' },
      ],
    },
    by_kennel: { text: 'Bryony looks at you, and at the case, and sits down in her boat. "Decide well," she says. "We\'ll hear." The boats go back into the reeds.', again: '"Decide well."', effects: [{ set: 'nw_run_stage', value: 'deep' }], options: [{ text: '(On down the river.)', next: 'deep' }] },
    by: { speaker: 'narrator', text: 'Bryony looks at Magda a long moment and then sits down in her boat. "Go on, then, Patience," she says. "Tell the guild the river was asking after it." The reed boats go back into the dark as quietly as they came.', again: 'The reed boats going back into the dark.', options: [{ text: '(On down the river.)', next: 'deep' }] },
    warned: { speaker: 'narrator', text: 'The shot goes off over the reeds like a door slammed in a cathedral, and every heron in the night reach goes up at once. When it is quiet again the reed boats are gone. Magda lets her breath out. "They\'ll remember that," she says.', again: 'The herons going up.', options: [{ text: '(On down the river.)', next: 'deep' }] },
    toll: {
      text: '"No." Bryony does not raise her rifle; she does not need to. "Something from the cases, or twenty for the river, or we sit here till morning and the guild\'s tug finds you in the reeds." Magda is looking at you.',
      again: '"Something from the cases, or twenty."',
      options: [
        { id: 'run.toll.pay', text: '(Pay her twenty.)', if: TOLLS(20), effects: [{ take: 'tolls', count: 20 }, { set: 'nw_run_stage', value: 'deep' }], next: 'by' },
        { id: 'run.toll.give', text: '(Give her one case.)', effects: [{ set: 'nw_one_crate' }, { set: 'nw_run_stage', value: 'deep' }], next: 'one' },
        { id: 'run.toll.open', text: '(Open a case and show her what she\'s asking for.)', if: { not: { lead: 'l_nw_kennel' } }, effects: [{ lead: 'l_nw_crates' }, { lead: 'l_nw_kennel' }], next: 'kennel' },
      ],
    },
    one: { speaker: 'narrator', text: 'Two of the reed people lift a case down into their boat between them as if it were a coffin, and Bryony touches her hat to Magda, and they are gone. "That\'s a twelfth of my mooring," Magda says. "I hope it was worth something to somebody."', again: 'One case gone into the reeds.', options: [{ text: '(On down the river.)', next: 'deep' }] },
    deep: {
      speaker: 'narrator',
      text: [
        { if: KNOWS_LOAD, text: 'The deep reach above the city, before dawn: the river wide and black and slow, forty feet of it under the keel, the city\'s lamps on the horizon and the Wall\'s lens-towers blinking. Magda at the oar, not looking at the cases. "Your call," she says. "I carry what I\'m paid to carry. But your call."' },
        { text: 'The deep reach above the city, before dawn: the river wide and black and slow, forty feet of it under the keel, the city\'s lamps on the horizon and the Wall\'s lens-towers blinking. The cases sit under their tarp, sealed, ticking a little as they cool.' },
      ],
      again: 'The deep reach, the city\'s lamps.',
      options: [
        { id: 'run.deep.over', text: '(Put the cases over the side, here, where it\'s deep.)', effects: RUN_RIVER, next: 'drowned' },
        { id: 'run.deep.on', text: '(On to the city.)', next: 'city' },
      ],
    },
    drowned: {
      speaker: 'narrator',
      text: 'One by one, over the gunwale, and each goes down with a sound like a stone into a well, and the river closes over it and goes on being the river. Magda watches every one go and does not help and does not stop you. When the last is gone she says, very quietly, "That was my mooring." Then the city\'s basin, at dawn, and she ties up, and does not say goodbye.',
      again: 'The cases going down one by one.',
      interject: [{ companion: ASH, text: '"Dogs in the city," Ash says, watching the black water. "And children in the city." He looks at Magda. "We\'ll find her mooring. We have to."' }],
      options: [{ id: 'run.ashore', text: '(Ashore.)', effects: [TO_CITY], exit: true }],
    },
    city: {
      speaker: 'narrator',
      text: 'The city\'s canal basin outside the Wall at dawn, a grey square of water among warehouses, and on the quay a man in guild green with a cart and two porters, waiting, with a paper he holds out for the waybill. Beyond the warehouses, a hundred yards up the gate road, the wardens\' post at the Wall with its lens.',
      again: 'The basin, the guild\'s man with his cart.',
      options: [
        { id: 'run.city.deliver', text: '(Hand the load to the guild\'s man.)', effects: RUN_DELIVERED, next: 'delivered' },
        { id: 'run.city.wardens', text: '(Take the load and the waybill up the road to the wardens instead.)', effects: RUN_WARDENS, next: 'wardens' },
        { id: 'run.city.back', text: '(Push off again into the deep reach.)', next: 'deep' },
      ],
    },
    delivered: {
      speaker: 'narrator',
      text: 'The guild\'s man counts the cases onto his cart, and signs the waybill, and counts a hundred and fifty Tolls into Magda\'s hand without looking at her. She gives you half, and a copper ring off her finger stamped PATIENCE. "Ride on my account," she says, "anywhere on the river." The cart goes off toward the Docks\' bridge with its tarp down.',
      again: 'The cart going toward the Docks.',
      interject: [{ companion: KES, text: 'Kes watches the cart all the way to the bridge. "That\'s twelve dogs," she says. "Twelve. In a city." She does not look at you for the rest of the morning.' }],
      options: [{ id: 'run.ashore2', text: '(Ashore.)', effects: [TO_CITY], exit: true }],
    },
    wardens: {
      speaker: 'narrator',
      text: 'The guild\'s man says something sharp and then, seeing where you are pushing the cart, nothing at all. At the wardens\' post a sergeant reads the waybill twice and lifts the lid of a case and looks at the closed eye on the board for a long time, and sends a runner in through the gate. "The record thanks you," he says, and means it, and gives you the record\'s bounty, which you halve with Magda. Magda gives you a copper ring stamped PATIENCE. "Ride on my account," she says. "I\'ll not be carrying for the guild again for a while."',
      again: 'The sergeant and the closed eye.',
      interject: [{ companion: NINE, text: '"The record will want to know who ordered twelve hound controllers into a city it keeps," Nine says. "So will I."', effects: [A(NINE, 2)] }],
      options: [{ id: 'run.ashore3', text: '(Ashore.)', effects: [TO_CITY], exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the people of the Landing

export const d_nw_magda: DialogueDef = {
  id: 'd_nw_magda', owner: 'npc_nw_12',
  start: [{ if: { flag: 'nw_magda_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A woman with a weathered face and a chin with a scar across it, sitting on the Patience\'s deckhouse roof mending a sweep with wire, a black barge under her with nothing on it. "Kowal. The Patience." She pats the roof. "My father\'s, then mine. Then the guild\'s, if I\'m not careful." She looks at the river. "Half a season tied up on a low river and the mooring\'s due, wet or dry."',
      again: 'Magda, mending the sweep.',
      effects: [{ set: 'nw_magda_met' }],
      options: [
        { id: 'magda.river', text: 'Why is the river so low?', next: 'river' },
        { id: 'magda.load', text: 'Is there work?', next: 'load' },
        bye,
      ],
    },
    again: {
      text: [
        { if: { flag: 'nw_patience', eq: 'seized' }, text: 'Magda on the quay, not on the Patience. The barge has the guild\'s green painted on her bow. "They took her at dawn," Magda says. "For the mooring. I\'m on the winch Monday."' },
        { if: R('river'), text: 'Magda on the Patience\'s roof, not mending anything. "The mooring\'s due at dawn," she says. "Eighty. I haven\'t got it." She does not ask you for it.' },
        { if: { any: [R('delivered'), R('wardens')] }, text: '"Patience is paid up," Magda says. "First time in a year." She knocks on the deckhouse roof. "Ride when you like."' },
        { text: '"Mm?" Magda twists the wire.' },
      ],
      again: 'Magda, on the Patience.',
      options: [
        { id: 'magda.river2', text: 'Why is the river so low?', if: { not: { seen: 'magda.river' } }, next: 'river' },
        { id: 'magda.load2', text: 'Is there work?', if: { all: [RUN_OPEN, { not: CREW }] }, next: 'load' },
        { id: 'magda.go', text: 'Let\'s take the load down.', if: { all: [CREW, RUN_OPEN] }, effects: [{ event: 'dialogue', data: { tree: 'd_nw_run', name: 'The Patience' } }], exit: true },
        { id: 'magda.pay', text: 'I\'ll pay your mooring.', if: { all: [R('river'), { not: { flag: 'nw_patience' } }, TOLLS(80)] }, effects: [{ take: 'tolls', count: 80 }, { set: 'nw_patience', value: 'kept' }, { give: 'k_nw_token' }, { set: 'nw_barges_owed' }, A(ASH, 3), A(TAMSIN, 2)], next: 'paid' },
        bye,
      ],
    },
    river: { text: '"The dam." She jerks her head north. "The city keeps the Water up there and lets it down when its card says, and the card says hardly ever. We go down half-loaded and we come up behind the guild\'s tug for a fee. When it does let the Water down, it\'s all at once in the spring and the meadows go under to the doorsteps." She bends the wire. "My grandmother said the dam was cracked. Everybody\'s grandmother says that."', again: '"The card says hardly ever."', options: [{ text: 'Something else.', next: 'again' }] },
    load: {
      text: '"Pryce has a load for the city." She does not sound happy about it. "Sealed, twelve cases, a hundred and fifty Tolls, no questions. That\'s my mooring and some." She looks at you. "I need a second pair of arms at the sweeps through the Chute, and somebody awake on the night reach. The reed people come out there, and they know a guild load by its tarp. Half of it\'s yours."',
      again: '"Half of it\'s yours."',
      options: [
        { id: 'magda.load.yes', text: 'I\'ll crew for you.', effects: [{ set: 'nw_run_crew' }, { quest: 'q_nw_run', start: true }, { give: 'k_nw_waybill' }], next: 'crew' },
        { text: 'Not now.', next: 'again' },
      ],
    },
    crew: { text: '"Good." She hands you a folded paper. "Pryce\'s waybill. You carry the paper; I carry the oar." She nods at the cases under their tarp on the Patience\'s deck. "First light, when you\'re ready. Tell me."', again: '"First light, when you\'re ready."', options: [{ text: 'Something else.', next: 'again' }] },
    paid: { text: 'She looks at the money for a long time. Then she takes a copper ring off her finger, stamped PATIENCE, and puts it in your hand. "Ride on my account," she says. "Anywhere on the river. For as long as she floats."', again: 'The copper ring, PATIENCE.', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_pryce: DialogueDef = {
  id: 'd_nw_pryce', owner: 'npc_nw_13',
  start: [{ if: { flag: 'nw_pryce_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A man in a good coat with the guild\'s green on its cuff, at a desk in the barge office with a ledger open and a cup of something hot. "Factor Pryce. The guild\'s river." He does not get up. "Moorings, tows, the winch, freight. The river is a contract like any other. What can the guild do for you?"',
      again: 'Pryce, at his ledger.',
      effects: [{ set: 'nw_pryce_met' }],
      options: [
        { id: 'pryce.load', text: 'Magda Kowal\'s load.', next: 'load' },
        { id: 'pryce.winch', text: 'The men on your winch.', next: 'winch' },
        bye,
      ],
    },
    again: {
      text: [
        { if: R('wardens'), text: 'Pryce looks up from the ledger and looks at you for a long time. "The guild has a very long memory," he says pleasantly, "and a very large book."' },
        { if: R('river'), text: '"The river took a guild load," Pryce says, writing. "The guild will want its mooring from the Patience at dawn. Rivers are not insured."' },
        { if: R('delivered'), text: '"The guild thanks you," says Pryce, and makes a small note.' },
        { text: '"Yes?" Pryce turns a page.' },
      ],
      again: 'Pryce, at his ledger.',
      options: [
        { id: 'pryce.load2', text: 'Magda Kowal\'s load.', if: { not: { seen: 'pryce.load' } }, next: 'load' },
        { id: 'pryce.winch2', text: 'The men on your winch.', if: { not: { seen: 'pryce.winch' } }, next: 'winch' },
        { id: 'pryce.emeka', text: 'What does Emeka Uzor\'s paper cost?', if: { all: [{ knows: 'nw_emeka_paper' }, { not: { flag: 'nw_emeka_free' } }] }, next: 'emeka' },
        bye,
      ],
    },
    load: { text: '"Machine parts for the guild\'s floor at the city\'s Docks, sealed." He sips. "The guild carries what the guild is paid to carry. Kowal carries what the guild pays her to carry. Everybody eats." He looks at you over the cup. "The waybill is in order. The seals are the Concern\'s. Nobody on the river opens a Concern seal and stays on the river."', again: '"Nobody opens a Concern seal and stays on the river."', interject: [{ companion: ODILE, text: '"Machine parts," Odile murmurs outside. "Consigned to a guild floor that does not, to my knowledge, have any machines. Somebody is buying a future, my dear, and paying for its delivery in cash."' }], options: [{ text: 'Something else.', next: 'again' }] },
    winch: { text: '"Debtors on paper. The guild\'s paper, bought at the Ninebridge block." He turns a page. "They haul the barges up from the city on the towpath and work the winch. When the paper\'s paid, they walk off. Most of them." He smiles. "Breakages add a month. Things break."', again: '"Things break."', options: [{ text: 'Something else.', next: 'again' }] },
    emeka: {
      text: '"Uzor." He finds the page. "One month to run. Thirty Tolls, and he walks." He waits.',
      again: '"Thirty Tolls, and he walks."',
      options: [
        { id: 'pryce.emeka.pay', text: '(Pay thirty.)', if: TOLLS(30), effects: [{ take: 'tolls', count: 30 }, { set: 'nw_emeka_free' }, { xp: 40 }, A(WREN, 5), A(ASH, 3), { decision: { id: 'nw_emeka_free', text: 'I bought the last month of Emeka Uzor\'s paper off the guild at Low Landing.' } }], next: 'freed' },
        { text: 'Not now.', next: 'again' },
      ],
    },
    freed: { text: 'He writes PAID across the page and blots it. "The guild thanks you for your custom." He does not look up again.', again: 'PAID across the page.', options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_emeka: DialogueDef = {
  id: 'd_nw_emeka', owner: 'npc_nw_15',
  start: [{ if: { flag: 'nw_emeka_free' }, node: 'free' }, { if: { flag: 'nw_emeka_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A broad man on the winch house\'s capstan bar with four others, walking it round, with an old Ninebridge brand on his wrist and the guild\'s tally tag on a cord at his neck. He talks without stopping walking. "Uzor. On paper." Round. "Eleven months. One to go." Round. "Don\'t let him put you on paper. Whatever you owe. Don\'t."',
      again: 'Emeka, walking the capstan.',
      effects: [{ set: 'nw_emeka_met' }, { learn: 'nw_emeka_paper' }],
      options: [
        { id: 'emeka.month', text: 'One month?', next: 'month' },
        { id: 'emeka.others', text: 'Who else has walked this capstan?', next: 'others' },
        bye,
      ],
    },
    again: {
      text: '"Round," says Emeka, walking it. "Round."',
      again: 'Emeka, walking the capstan.',
      options: [
        { id: 'emeka.month2', text: 'One month?', if: { not: { seen: 'emeka.month' } }, next: 'month' },
        { id: 'emeka.others2', text: 'Who else has walked this capstan?', if: { not: { seen: 'emeka.others' } }, next: 'others' },
        bye,
      ],
    },
    month: { text: '"One month for nine." He laughs, without breath. "It was two months, last month. Then a hawser broke, and that\'s a month. Then the lamp in the bunkhouse broke, and that\'s a month." Round. "Things break."', again: '"Things break."', options: [{ text: 'Something else.', next: 'again' }] },
    others: {
      text: [
        { if: { any: [{ flag: 'ds_mateo_here' }, { flag: 'ds_court' }] }, text: '"A man from the shore. Ibarra." Round. "Two years. Never said much. Said he had a wife on the stilts and a boat called a bird\'s name. He walked off when his paper ran out, south, toward the sea." Round. "I heard he got home. I hope he got home."' },
        { text: '"Everybody." Round. "Men off the block, men off the shore, a boy from the Sink who cried every night for a month and then stopped. A man from the shore, two years: Ibarra. Said he had a wife on the stilts. Walked off south when his paper ran out." Round. "They all walk off, after. If they walk."' },
      ],
      again: '"They all walk off, after."',
      options: [{ text: 'Something else.', next: 'again' }],
    },
    free: { text: 'Emeka on the quay with a sack on his shoulder and no tag at his neck, looking at the river as if he had never seen it from this side. "Thirty Tolls," he says. "That\'s what I was." He shakes your hand, hard. "I\'m going home. Wherever that is now."', again: 'Emeka, with the sack on his shoulder.', options: [bye] },
  },
};

export const d_nw_bao: DialogueDef = {
  id: 'd_nw_bao', owner: 'npc_nw_14',
  start: [{ if: { flag: 'nw_bao_met' }, node: 'again' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'A grey-moustached man behind a counter of coiled rope, cans of fuel and boxes of rivets, a pencil behind each ear. "Tran. Chandler." He spreads his hands at the shop. "Rope, rings, rivets. Everything a barge forgets. And a berth on the old hulk, dry, twenty-five a week, if the guild\'s doss house is too lively for you."',
      again: 'Bao, behind the rope.',
      effects: [{ set: 'nw_bao_met' }],
      options: [
        { id: 'bao.trade', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'bao.berth', text: 'The berth.', if: { not: { flag: 'nw_berth_rented' } }, next: 'berth' },
        { id: 'bao.halls', text: 'What were the big halls behind the town?', next: 'halls' },
        bye,
      ],
    },
    again: {
      text: '"Rope?" says Bao hopefully.',
      again: 'Bao, behind the rope.',
      options: [
        { id: 'bao.trade2', text: '(Buy something.)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'bao.berth2', text: 'The berth.', if: { not: { flag: 'nw_berth_rented' } }, next: 'berth' },
        { id: 'bao.halls2', text: 'What were the big halls behind the town?', if: { not: { seen: 'bao.halls' } }, next: 'halls' },
        bye,
      ],
    },
    berth: {
      text: '"The old hulk at the bottom of the quay. A cabin with a bed and a locker and a stove, and the river talking all night." He holds out a key. "Twenty-five."',
      again: '"Twenty-five."',
      options: [
        { id: 'bao.berth.pay', text: '(Pay twenty-five.)', if: TOLLS(25), effects: [{ take: 'tolls', count: 25 }, { set: 'nw_berth_rented' }], next: 'berthed' },
        { text: 'Not now.', next: 'again' },
      ],
    },
    berthed: { text: 'He gives you the key and goes back to his rope. "Mind the plank. Everybody falls off the plank once."', again: '"Mind the plank."', options: [{ text: 'Something else.', next: 'again' }] },
    halls: { text: '"The campus." He says it like a word from a story. "Before the Burn there were machines in those halls that thought, my grandfather said, thousands of them, so hot they needed a river to cool them. That\'s why the dam. That\'s why the Landing: this was the campus\'s lower landing, where the barges brought the concrete." He shrugs. "Now it\'s where we keep the rain off the fuel."', again: '"That\'s why the dam."', effects: [{ learn: 'nw_campus_known' }], interject: [{ companion: NINE, text: '"A compute campus," Nine says, looking at the shells through the window. "Ashby Station. It is in the old record, under losses." A pause. "The record still lists its water."' }], options: [{ text: 'Something else.', next: 'again' }] },
  },
};

export const d_nw_bryony: DialogueDef = {
  id: 'd_nw_bryony', owner: 'npc_nw_16', start: [{ node: 'b' }],
  nodes: { b: { text: '"Quiet on the water," says Bryony Sedge, and that is all she will say here.', again: '"Quiet on the water."', options: [bye] } },
};

// ---------------------------------------------------------------- the Landing as a place

export const d_nw_crates: DialogueDef = {
  id: 'd_nw_crates', owner: 'narrator',
  start: [{ if: { flag: 'nw_run' }, node: 'gone' }, { node: 'look' }],
  nodes: {
    look: {
      text: 'Twelve wooden cases on the Patience\'s deck under a guild tarp, each banded with steel and sealed with the Concern\'s closed eye in lead. Stencilled on the end of each: MACHINE PARTS — CONCERN — THE DOCKS. One of them ticks, very faintly, as it warms in the sun.',
      again: 'The twelve sealed cases.',
      interject: [{ companion: KES, if: { not: { lead: 'l_nw_crates' } }, text: 'Kes crouches by the ticking case and puts her ear to it, and then her palm, and sits back on her heels. "Kennel boards," she says. "Concern lineage. Asleep, waiting for a dog to put them in." She looks up at you. "Obviously."', effects: [{ lead: 'l_nw_crates' }, { lead: 'l_nw_kennel' }, A(KES, 2)] }],
      options: [
        { id: 'crates.open', text: '(Lift a seal, carefully.)', if: { not: { lead: 'l_nw_crates' } }, check: { skill: 'security', dc: 35 }, effects: [{ lead: 'l_nw_crates' }], next: 'inside', fail: 'seal' },
        { id: 'crates.look', text: '(Look closely at the tags through the slats.)', if: { not: { lead: 'l_nw_crates' } }, check: { attr: 'senses', dc: 6, mods: [{ if: { skill: 'science', gte: 40 }, dc: -2, why: 'you know a board when you see one' }] }, effects: [{ lead: 'l_nw_crates' }], next: 'tags', fail: 'straw' },
        leave,
      ],
    },
    inside: { text: 'The seal comes up on its wire and goes back down again as if it had never moved. Inside, in straw: boards potted in black resin with the closed eye etched on each, a tag wired to each, KENNEL and a number, and on each underside a socket shaped for something\'s neck.', again: 'KENNEL, and a socket for a neck.', options: [leave] },
    tags: { text: 'Through the slats, in straw: a black resin board with a wire tag: KENNEL 3. A socket on its underside, round and deep, as if for a neck.', again: 'KENNEL 3.', options: [leave] },
    seal: { text: 'The lead is thicker than it looks and the wire is braided steel. You would leave a mark, and a Concern seal with a mark on it is a story the whole river would tell.', again: 'The seal, untouched.', options: [leave] },
    straw: { text: 'Straw, slats, shadow.', again: 'Straw.', options: [leave] },
    gone: { text: 'The Patience\'s deck, bare, swept, the guild\'s tarp folded at the stern.', again: 'The bare deck.', options: [leave] },
  },
};

export const d_nw_patience: DialogueDef = {
  id: 'd_nw_patience', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: { flag: 'nw_patience', eq: 'seized' }, text: 'The Patience, the guild\'s green slapped across the name on her bow, a guild padlock on her deckhouse.' },
        { text: 'The Patience: a black flat barge forty feet long with a deckhouse aft, two sweeps lashed along her sides and a stern oar as long as a tree, her name painted on the bow in faded orange by somebody who had not done much lettering. PATIENCE. Her plank has a rope rail.' },
      ],
      again: 'The Patience.',
      options: [leave],
    },
  },
};

export const d_nw_berth: DialogueDef = {
  id: 'd_nw_berth', owner: 'narrator',
  start: [{ if: { flag: 'nw_berth_rented' }, node: 'mine' }, { node: 'let' }],
  nodes: {
    let: { text: 'A cabin on the old hulk at the quay\'s foot: a bed, a locker, a stove. Chalked on the door: BERTH — 25 — SEE TRAN.', again: 'The hulk\'s berth, SEE TRAN.', options: [leave] },
    mine: { text: 'Your berth on the hulk: the bed, the locker, the stove ticking, and the river going by under the planks all night, talking to itself.', again: 'Your berth on the hulk.', options: [{ id: 'berth.rest', text: '(Rest, mend, write.)', effects: [{ event: 'camp' }], exit: true, repeat: true }, leave] },
  },
};

export const d_nw_winch: DialogueDef = {
  id: 'd_nw_winch', owner: 'narrator', start: [{ node: 'w' }],
  nodes: {
    w: {
      text: 'The guild\'s winch: a pre-war capstan the height of a man on the quay\'s edge, a cable from it out to a barge in the stream, and men on paper walking its bars round. A chalked board: HANDS WANTED — A DAY — 10 TOLLS — NO PAPER FOR DAY HANDS.',
      again: 'The winch, the men on paper walking it.',
      options: [
        { id: 'winch.day', text: '(Take a bar for a day. 10 Tolls.)', check: { attr: 'brawn', dc: 6 }, effects: [{ time: 240 }, { give: 'tolls', count: 10 }], failEffects: [{ time: 240 }, { give: 'tolls', count: 4 }], next: 'day', fail: 'short', repeat: true },
        leave,
      ],
    },
    day: { speaker: 'narrator', text: 'Four hours walking the capstan round with men who are not allowed to stop, the cable groaning, a barge coming in out of the stream a yard at a time. You are paid at the end in guild Tolls. They are not.', again: 'A day on the winch.', options: [leave] },
    short: { speaker: 'narrator', text: 'Your legs give out before the barge comes in, and the man on the bar behind you walks your share without a word. The guild pays you for half.', again: 'Half a day on the winch.', options: [leave] },
  },
};

export const d_nw_ll_notice: DialogueDef = {
  id: 'd_nw_ll_notice', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A notice on the quay under oilcloth, with the city\'s seal: AUDIT OF DELIVERY — ASHBY — ELEVEN SEASONS SHORT OF SCHEDULE. INSPECTION PENDING. BY ORDER OF THE WATER OFFICE. Under it, smaller: THE CITY REGRETS ANY INCONVENIENCE TO RIVER TRAFFIC.',
      again: 'The city\'s notice on the quay.',
      effects: NOTICE,
      options: [leave],
    },
  },
};

export const d_nw_ll_road: DialogueDef = {
  id: 'd_nw_ll_road', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A milestone at the foot of the embankment road, pre-war, its face scrubbed clean by somebody: MERIDIAN 198. Under it, cut with a knife: THREE DAYS IF YOU\'RE LUCKY.',
      again: 'MERIDIAN 198.',
      options: [{ id: 'llroad.map', text: '(Look at the map.)', effects: [{ event: 'map' }], exit: true, repeat: true }, leave],
    },
  },
};

export const LANDING_DIALOGUES: DialogueDef[] = [d_nw_run, d_nw_magda, d_nw_pryce, d_nw_emeka, d_nw_bao, d_nw_bryony, d_nw_crates, d_nw_patience, d_nw_berth, d_nw_winch, d_nw_ll_notice, d_nw_ll_road];
