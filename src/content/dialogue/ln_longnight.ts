import type { CheckDef, DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A, ASH, IN, ILYA, KES, NINE, ODILE, TAMSIN, TOLLS, WREN, bye, leave } from './rc_line';

/**
 * The Long Night (B5d, beat 17, `q_a2_longnight`): Openfield's stores claimed on one night by the guild (futures fallen due,
 * the Concern behind it) and by the city (an eviction order on the well), and the Choir sitting in front of the door. The
 * envoys and their terms (each reads what the player did across Act 2), the one table where a truce can be made, the
 * exclusive alliance, the allies who come at dusk (world events in `world/b5d_ashlands.ts`: each region answers each
 * alliance differently), the night itself in one chain (dusk, midnight, the small hours, dawn), keystone 8 resolved at
 * dawn, and keystone 7 carried west on the Line in a warden car (`q_ln_calla`: held at West Halt or run through to Carrick by
 * who holds the Line). Act 2 closes at the night's dawn. Every outcome is exported as flags (story/B5d_NOTES_SECRET.md).
 */

// ---------------------------------------------------------------- state

const LN = (v: string): Cond => ({ flag: 'ln_alliance', eq: v });
export const PLEDGED: Cond = { flag: 'ln_alliance' };
export const CALLED: Cond = { flag: 'ln_called' };
export const DONE: Cond = { flag: 'ln_done' };
const OPEN: Cond = { all: [CALLED, { not: PLEDGED }, { not: DONE }] };
const S = (gte?: number, lte?: number): Cond => ({ flag: 'ln_strength', ...(gte !== undefined ? { gte } : {}), ...(lte !== undefined ? { lte } : {}) });
/** The night's strength at dawn: four or more holds, two or three half-holds, one or less is thin (the routes' last case). */
const STRONG = S(4), MIXED = S(2, 3);
const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const PREC = (v: string): Cond => F('prec_unrecorded', v);
const CORE: Cond = { item: 'k_an_core' };
/** Petra's knife goes along the lane for the Treasurer in the small hours: only when the Choir holds the night (or nobody
 * does), nobody has warned the Grand Factor, and nobody has talked Petra down. */
const KNIFE: Cond = { all: [{ any: [LN('choir'), LN('none')] }, { not: F('ln_sarr_warned') }, { not: F('ln_petra_down') }] };
/** The Line and the water can carry the Choir's seed away from a burning Openfield: the halts hold the Line (or work it by
 * pilot), and boats, barges or the Stand at Carrick owe the player. */
const LINE_FREE: Cond = { any: [F('rc_line', 'halts'), F('rc_line', 'shared'), F('rc_pilot')] };
const SEED_SHORE: Cond = { all: [LINE_FREE, { any: [F('ds_boats_owed'), F('dk_stand_owed')] }] };
const SEED_NORTH: Cond = { all: [LINE_FREE, F('nw_barges_owed'), { not: F('ds_boats_owed') }, { not: F('dk_stand_owed') }] };
const VASHA_ALIVE: Cond = { any: [F('vasha_fate', 'spared'), F('vasha_fate', 'spared_why')] };

/** Favours owed to the player that will bring all three to one table (the truce needs two). */
export const FAVOURS: { id: string; cond: Cond; label: string; text: string }[] = [
  { id: 'halts', cond: { any: [F('rc_line', 'halts'), F('rc_line', 'shared')] }, label: 'West Halt', text: 'The Line\'s halts owe you their trains: no guild rider or warden car moves on the west sections tonight without them.' },
  { id: 'boats', cond: F('ds_boats_owed'), label: 'Gull Stilts', text: 'The Stilt Court owes you its boats: whatever comes down the delta comes in hulls the shore lends.' },
  { id: 'barges', cond: F('nw_barges_owed'), label: 'Low Landing', text: 'The Wet owes you its barges: the river carries what you say it carries.' },
  { id: 'stand', cond: F('dk_stand_owed'), label: 'Carrick', text: 'The Stand at Carrick owes you: the dockers can black any freight on the quay, the guild\'s and the Concern\'s.' },
  { id: 'shift', cond: { any: [F('hs_shift', 'won'), F('tm_shift', 'joined')] }, label: 'The Shift', text: 'The Shift owes you: the miners of the Teeth will send people, and the Concern knows it.' },
  { id: 'court', cond: { any: [PREC('yields'), F('ar_verdict', 'contested')] }, label: 'The Court', text: 'The city\'s own court has a ruling of yours in its register: a record yields to a person who stands up.' },
  { id: 'sealed', cond: F('an_reserve', 'sealed'), label: 'Kelso', text: 'You sealed the Concern\'s sleeping army in the Ashlands against every code, and the Concern knows whose doing it was.' },
  { id: 'dogs', cond: F('bw_dogs_hold'), label: 'Bridgeward', text: 'The Rust Dogs hold Bridgeward\'s near end and owe you for it: the Crown\'s road and the guild\'s go round them.' },
  { id: 'calla', cond: F('ln_calla', 'freed'), label: 'Sister Calla', text: 'You took the order\'s first name back off the Line. The Choir owes you, and the city knows it was you.' },
];
const pairs = <T>(xs: T[]): [T, T][] => xs.flatMap((a, i) => xs.slice(i + 1).map((b): [T, T] => [a, b]));
export const TWO_FAVOURS: Cond = { any: pairs(FAVOURS).map(([a, b]) => ({ all: [a.cond, b.cond] })) };

/** Options that go on to the first of several nodes whose condition holds (exactly one is ever shown), else to `last`. */
function route(idp: string, steps: { if: Cond; node: string }[], last: string, text = '(Go on.)'): OptionDef[] {
  const prior: Cond[] = [];
  const out: OptionDef[] = [];
  steps.forEach((s, i) => {
    out.push({ id: `${idp}.${i}`, text, if: { all: [s.if, ...prior.map((p): Cond => ({ not: p }))] }, next: s.node });
    prior.push(s.if);
  });
  out.push({ id: `${idp}.last`, text, ...(prior.length ? { if: { all: prior.map((p): Cond => ({ not: p })) } } : {}), next: last });
  return out;
}

// ---------------------------------------------------------------- the pledge

const PLEDGE = (v: string, base: number, text: string, extra: Effect[]): Effect[] => [
  { quest: 'q_a2_longnight', start: true }, { set: 'ln_alliance', value: v }, { set: 'ln_strength', value: base }, ...extra,
  { decision: { id: 'ln_alliance', text } },
];
export const PLEDGE_CHOIR = PLEDGE('choir', 1, 'I stood with the Choir for Openfield\'s Long Night: the store, the people and the fields against the guild\'s paper and the city\'s order.', [
  A(TAMSIN, 5), A(ASH, 10), A(WREN, 5), A(KES, 5), A(ODILE, -3), A(ILYA, 2),
  { news: { tag: 'ln_for_choir', text: 'a stranger has said they will stand at Openfield\'s store with the Choir when the guild and the city come for it', valence: 6, size: 7, at: 'openfield' } },
]);
export const PLEDGE_GUILD = PLEDGE('guild', 1, 'I stood with the guild and the Concern for Openfield\'s Long Night: their contracts honoured, the store theirs, and the city kept off it.', [
  A(TAMSIN, -10), A(ASH, -15), A(WREN, -15), A(KES, -20), A(ODILE, 3), A(NINE, -5), A(ILYA, -5),
  { news: { tag: 'ln_for_guild', text: 'a stranger has signed on with the guild\'s riders for Openfield\'s harvest', valence: -4, size: 6, at: 'openfield' } },
]);
export const PLEDGE_LEDGER = PLEDGE('ledger', 2, 'I stood with the city for Openfield\'s Long Night: the order read and kept, the stores to the Precinct, the guild put off the Flats with the Choir.', [
  A(TAMSIN, -15), A(ASH, -15), A(WREN, -10), A(KES, -5), A(ODILE, -5), A(NINE, 3),
  { news: { tag: 'ln_for_city', text: 'a stranger has taken the city\'s side at Openfield, with the wardens and the order on the well', valence: -5, size: 6, at: 'openfield' } },
]);
export const PLEDGE_TRUCE = PLEDGE('truce', 0, 'I put the guild, the city and the Choir at one table in Openfield\'s common hall and made a truce out of what each of them owed me.', [
  A(TAMSIN, 5), A(ASH, 3), A(WREN, -3), A(KES, -3), A(ODILE, 10), A(NINE, 5), { set: 'ln_mustered' },
  { news: { tag: 'ln_truce', text: 'the guild, the city and the Choir sat at one table at Openfield because one stranger had a hold on all three', valence: 4, size: 8, at: 'openfield' } },
]);
export const PLEDGE_NONE = PLEDGE('none', 0, 'I stood with none of them for Openfield\'s Long Night, and let it come as it was written.', [
  A(TAMSIN, -10), A(ASH, -15), A(WREN, -5), A(KES, -5), A(ODILE, -3), A(NINE, -3), A(ILYA, -3), { set: 'ln_mustered' },
]);

// ---------------------------------------------------------------- Elder Mason, at the store door

const SEED_HISTORY: { if?: Cond; text: string }[] = [
  { if: F('of_seed_outcome', 'chaff'), text: '"The guild\'s paper is on six crates of seed that will grow nothing." He almost smiles. "They bought chaff at a future\'s price, and now they want the real thing for it. You were there. You know what they hold is a lie we sold them."' },
  { if: F('of_seed_outcome', 'exposed'), text: '"Ishan sold a crate a night to the guild\'s hand, and their factor wrote each crate down as a share of this harvest. The boy keeps the yard. The guild keeps the paper." He looks at the store. "The paper is what they came for."' },
  { if: F('of_seed_outcome', 'cut'), text: '"Seed walked out of here all season and somebody took a tenth of it." He does not look at you. "The guild wrote every crate down as a share of this harvest. I do not know who else wrote it down."' },
  { text: '"The Choir\'s children sold the harvest forward, a crate at a time, to a guild hand on the lane who paid twelve Tolls and wrote each one down as a share. Now the shares fall due, all at once, on one night, and the guild\'s riders are here to collect."' },
];

export const d_ln_mason: DialogueDef = {
  id: 'd_ln_mason', owner: 'npc_of_01',
  start: [{ if: PLEDGED, node: 'pledged' }, { if: { knows: 'ln_mason_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Elder Mason on a bench in front of the seed store\'s door with his hands on his knees and his hat on the bench beside him, the way a man sits who means to be there all night. Behind him the guild\'s notice is nailed over the Choir\'s tally board, and across the green the city\'s order is nailed to the well. "You came." He does not get up. "The sky keeps no books. The guild does, and the city does, and both of them have written this store down as theirs, on the same night."',
      again: 'Mason on the bench before the store.',
      effects: [{ learn: 'ln_mason_met' }, { quest: 'q_a2_longnight', start: true }],
      interject: [
        { companion: ASH, text: 'Ash takes his hat off and stands by the bench, and says nothing at all, and Mason puts a hand on his arm without looking up.' },
        { companion: TAMSIN, text: '"They want the seed," Tamsin says, very low, to you. "The guild and the city. The same seed. And these people want to sit in front of it."' },
      ],
      options: [{ id: 'ln.mason.go', text: 'Tell me how it stands.', next: 'hub' }],
    },
    hub: {
      text: '"Ask," Mason says. "I have the night."',
      again: 'Mason waits on the bench.',
      options: [
        { id: 'ln.mason.plan', text: 'What will you do when they come?', if: { not: { seen: 'ln.mason.plan' } }, next: 'plan' },
        { id: 'ln.mason.paper', text: 'Where did the guild get a claim on your harvest?', if: { not: { seen: 'ln.mason.paper' } }, next: 'paper' },
        { id: 'ln.mason.petra', text: 'Petra.', if: { not: { seen: 'ln.mason.petra' } }, next: 'petra' },
        { id: 'ln.mason.calla', text: 'The wardens took Calla.', if: { all: [F('ln_calla_taken'), { not: F('ln_calla') }, { not: { seen: 'ln.mason.calla' } }] }, next: 'calla' },
        { id: 'ln.mason.table', text: 'What if they all sat at one table?', if: { not: { seen: 'ln.mason.table' } }, next: 'table' },
        { id: 'ln.mason.pledge', text: 'I\'ll stand with Openfield.', if: OPEN, effects: PLEDGE_CHOIR, next: 'pledge' },
        bye,
      ],
    },
    plan: {
      text: '"Sit." He means it exactly. "In front of the door, all of us, the old ones in front. We will not fight for seed. Seed is for planting, not for killing over." He looks across at the lane, where the guild\'s lamps are. "Petra will not sit. Some of the young ones will not. I cannot make them. I have tried for nine years." His voice does not change. "The city\'s paper says Openfield burns tonight. I have read it. I would rather it burned with us sitting than with us shooting."',
      again: '"I would rather it burned with us sitting."',
      effects: [{ learn: 'ln_mason_sits' }],
      interject: [{ companion: ILYA, text: 'Ilya looks at the lane, and the riders\' lamps, and the bench. "Sitting," he says. "I\'ve seen men ride through sitting people." He does not say what he did about it.', effects: [A(ILYA, 1)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    paper: { text: SEED_HISTORY, again: 'The guild\'s shares on the harvest.', effects: [{ lead: 'l_ln_futures' }], options: [{ text: 'Something else.', next: 'hub' }] },
    petra: {
      text: '"My daughter keeps no likeness and has her own night planned." He turns his hat over on the bench. "The Grand Factor of the guild is sleeping on our lane tonight, in a wagon, and is on the city\'s list as its Treasurer. Petra has read that list too." He is quiet. "Ask her. I do not. If I ask, she will tell me, and then I will have to choose between her and what I believe, tonight, and I am too old to do it well."',
      again: '"Ask her. I do not."',
      effects: [{ learn: 'ln_knife_hint' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    calla: {
      text: '"The order\'s first name." He closes his eyes. "She came from Shale to sit with us. They read her name off the paper at the well and took her to the Line before she had put her bag down. A warden car, west." He opens them. "I will not ask you to go after her. I will tell you that the Line is not the guild\'s everywhere, and that the halts have their own rules about which trains move."',
      again: '"The Line is not the guild\'s everywhere."',
      effects: [{ learn: 'ln_calla_west' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    table: {
      text: '"The common hall has a table forty feet long." He considers it, honestly. "They would not sit at it for me. They might for someone each of them owed. A guild factor sits for a debt. A warden captain sits for a lawful reason. Petra sits for nobody." He looks at you. "If you can make all three of them owe you on one night, you are a more dangerous person than I took you for."',
      again: '"A more dangerous person than I took you for."',
      effects: [{ learn: 'ln_table_known' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    pledge: {
      text: 'He looks at you for a long time. Then he picks his hat up off the bench and puts it down on the other side of him, leaving the place next to him empty. "At dusk, then," he says. "Whoever comes, comes. Sit with us, or stand at the lane, or go where you are needed. The sky does not mind which."',
      again: '"At dusk, then."',
      interject: [
        { companion: ASH, text: 'Ash sits down in the hat\'s place on the bench, slowly, like a man getting into cold water. "Then I\'ll be here," he says. "At the door. Not first. Never first."', effects: [A(ASH, 2), { learn: 'ash_at_door' }] },
        { companion: TAMSIN, text: 'Tamsin lets out a breath. "Good," she says. "Good. I didn\'t want to have to argue with you."', effects: [A(TAMSIN, 2)] },
        { companion: WREN, text: '"The Dogs\'ll come if they\'re asked," Wren says. "Some of them. They hate a rider more than they hate a farmer." She grins. "That\'s what passes for love, with us."' },
        { companion: NINE, if: F('nine_stance', 'deputy'), text: '"The city will call its units in tonight," Nine says. "I will answer. I will be on the other side of the lane. Lawfully." It pauses. "I will be careful whom I count."' },
        { companion: NINE, text: '"The city will call its units in tonight," Nine says. "I will answer, and I will read its order aloud at the well, and I will log every line of it that cannot be made lawful as an error." It looks at the store. "There will be several."', effects: [{ learn: 'nine_reads_order' }] },
        { companion: ODILE, text: '"You\'ll starve the Precinct a winter," Odile says, not unkindly. "My dear, I approve. I just want you to know you\'re doing it."' },
      ],
      options: [bye],
    },
    pledged: {
      text: [
        { if: DONE, text: 'Mason at the store\'s door, his hat in his hands, looking at what the night left.' },
        { if: LN('choir'), text: '"At dusk," Mason says. "Whoever comes."' },
        { if: LN('truce'), text: '"A table forty feet long," Mason says, "and all of them at it." He shakes his head slowly. "I do not know whether to thank you or pray for you. The sky does not need either."' },
        { text: 'Mason on the bench, with the place beside him empty. He looks at you, and away. "Go and stand with them, then," he says. "We will sit."' },
      ],
      again: 'Mason, on the bench.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- Petra Mason, at the shrine

export const d_ln_petra: DialogueDef = {
  id: 'd_ln_petra', owner: 'npc_of_02',
  start: [{ if: { knows: 'ln_petra_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Petra at the sky-shrine\'s fire with her scarf at her throat and her back to the green, the way a person sits who does not want to be counted. She does not look round. "You came for the store," she says. "Everyone came for the store. My father is going to sit in front of it and let them have it gently." She feeds the fire a stick. "The guild\'s Grand Factor is sleeping on our lane tonight. She is on the city\'s list. Treasurer. Did you know?"',
      again: 'Petra at the shrine\'s fire.',
      effects: [{ learn: 'ln_petra_met' }, { learn: 'ln_knife_hint' }],
      options: [{ id: 'ln.petra.go', text: 'Go on.', next: 'hub' }],
    },
    hub: {
      text: [
        { if: F('ln_petra_down'), text: 'Petra at the fire, her knife in its sheath on the stone beside her, where you can see it. "I said I wouldn\'t," she says. "I keep what I say. It\'s the only thing I keep."' },
        { if: DONE, text: 'Petra at the shrine\'s cold fire. She does not look up.' },
        { text: '"Well?" Petra feeds the fire.' },
      ],
      again: 'Petra waits.',
      options: [
        { id: 'ln.petra.knife', text: 'What do you mean to do about the Grand Factor?', if: { all: [{ not: { seen: 'ln.petra.knife' } }, { not: DONE }] }, next: 'knife' },
        { id: 'ln.petra.down', text: 'Don\'t. Sarr dead won\'t save one seed, and the city will have its reason to burn you.', if: { all: [{ seen: 'ln.petra.knife' }, { not: F('ln_petra_down') }, { not: DONE }] },
          check: { skill: 'speech', dc: 55, mods: [{ if: { all: [IN(ASH), F('ash_orders', 'refused')] }, dc: -15, why: 'Ash stands beside you and has refused his own orders' }, { if: F('sky_rite'), dc: -10, why: 'you are a sister or brother of the Open Sky' }, { if: { seen: 'ln.mason.petra' }, dc: -5, why: 'her father would not ask her, and you did' }, { if: F('ln_calla', 'freed'), dc: -5, why: 'you brought Calla back without a knife' }] },
          effects: [{ set: 'ln_petra_down' }, { xp: 100 }, A(ASH, 5), A(NINE, 3), A(ODILE, 5), { decision: { id: 'ln_petra_down', text: 'I talked Petra Mason out of the knife she meant for the guild\'s Grand Factor on the Long Night.' } }], next: 'down', fail: 'down_no' },
        { id: 'ln.petra.yes', text: 'Do what you have to. I won\'t stand in your way.', if: { all: [{ seen: 'ln.petra.knife' }, { not: F('ln_knife_blessed') }, { not: F('ln_petra_down') }, { not: DONE }] }, effects: [{ set: 'ln_knife_blessed' }, A(ASH, -5), A(ODILE, -10), A(NINE, -5)], next: 'yes' },
        bye,
      ],
    },
    knife: {
      text: '"The city wrote her down as its Treasurer. Tolls on schedule. The Plan needs her alive and counting." Petra turns the stick in the fire. "The Unwritten break what the Plan needs. Some of us with words. Tonight, some of us with a knife, on the lane, in the small hours, while my father sits with his hands in his lap." She looks at you for the first time. "The sky keeps no books. Somebody has to tear the pages out of theirs."',
      again: '"Somebody has to tear the pages out of theirs."',
      effects: [{ lead: 'l_ln_knife' }],
      interject: [
        { companion: ASH, if: F('ash_orders', 'refused'), text: 'Ash has gone very still. "I burned my letter, Petra," he says. "I\'m not burning anybody else\'s."', effects: [A(ASH, 3)] },
        { companion: ASH, if: F('ash_orders', 'other'), text: 'Ash says nothing. He is looking at the lane, and at the guild\'s wagons, and his face is the face of a man doing a sum.', effects: [{ learn: 'ash_eyes_lane' }] },
        { companion: ODILE, if: F('odile_price', 'sarr'), text: 'Odile\'s hand has closed on Petra\'s wrist before anyone sees her move. "That is my student," she says, very pleasantly. "That is the price I told you about, my dear. Don\'t make me pay it."', effects: [{ learn: 'odile_named_price' }] },
      ],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    down: { text: 'She is quiet a long time. Then she takes the knife off her belt, sheath and all, and lays it on the shrine\'s stone where anyone can see it, and sits back. "Not tonight," she says. "Not because you\'re right. Because if I\'m wrong my father burns for it, and if you\'re wrong it\'s only you."', again: 'The knife on the shrine\'s stone.', options: [bye] },
    down_no: { text: '"No." Not angry. "You came here with the city\'s face on a paper in your pack. You don\'t get to tell me what the Plan needs."', again: '"No."', options: [{ text: 'Something else.', next: 'hub' }] },
    yes: { text: '"I didn\'t ask your leave." But she nods, once, the way Unwritten nod to each other on a road. "Stay off the lane in the small hours."', again: '"Stay off the lane in the small hours."', options: [bye] },
  },
};

// ---------------------------------------------------------------- the guild: Imelda Sarr and the Concern's Lucien Roux, on the lane

export const d_ln_sarr: DialogueDef = {
  id: 'd_ln_sarr', owner: 'npc_nb_01',
  start: [{ if: { knows: 'ln_sarr_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: 'Imelda Sarr, the Grand Factor of the guild, on a folding chair in the lee of three wagons on Openfield\'s lane with a rug over her knees and a clock open on her lap, its back off, its works in the lamplight. She does not get up; she never gets up. "The harvest\'s shares fall due tonight," she says. "Every one of them signed. I came to collect in person because I wanted to see the Elder\'s face when I did." She closes the clock. "And because the city has nailed a paper to his well that says it is all theirs. Not at that price."',
      again: 'Sarr, on her folding chair, with the clock.',
      effects: [{ learn: 'ln_sarr_met' }, { quest: 'q_a2_longnight', start: true }],
      interject: [{ companion: ODILE, text: 'Odile stops at the wagons\' edge. "Imelda." "Odile." Neither says anything else for a moment; it is a long moment. Then Sarr says, "You look well, for a woman who left," and Odile says, "You look rich, for a woman who stayed," and both of them almost smile.', effects: [A(ODILE, 2)] }],
      options: [{ id: 'ln.sarr.go', text: 'What does the guild want?', next: 'hub' }],
    },
    hub: {
      text: [
        { if: DONE, text: 'Sarr, packing her clock into its case.' },
        { text: '"Ask," Sarr says, "and I will tell you the price."' },
      ],
      again: 'Sarr waits.',
      options: [
        { id: 'ln.sarr.claim', text: 'What\'s your claim?', if: { not: { seen: 'ln.sarr.claim' } }, next: 'claim' },
        { id: 'ln.sarr.offer', text: 'What do I get, standing with you?', if: { all: [OPEN, { not: { seen: 'ln.sarr.offer' } }] }, next: 'offer' },
        { id: 'ln.sarr.warn', text: 'Someone means to put a knife in you tonight, on this lane.', if: { all: [{ lead: 'l_ln_knife' }, { not: F('ln_sarr_warned') }, { not: DONE }] }, effects: [{ set: 'ln_sarr_warned' }, { trust: { npc: 'npc_nb_01', by: 15 } }, A(ODILE, 5), A(ASH, -2), { rep: { faction: 'tollmen', respect: 5 } }], next: 'warned' },
        { id: 'ln.sarr.pledge', text: 'I\'ll stand with the guild.', if: OPEN, effects: [...PLEDGE_GUILD, { give: 'tolls', count: 250 }], next: 'pledge' },
        bye,
      ],
    },
    claim: {
      text: [
        { if: F('of_seed_outcome', 'chaff'), text: '"Six crates of chaff, sold to my hand at a future\'s price, and every crate written down as a share of this year\'s seed." She does not raise her voice. "I do not mind being cheated. I mind being cheated by people who pray. The shares stand. I will take good seed for them, or I will take the store."' },
        { text: '"Shares in this harvest, bought a crate at a time from the Choir\'s children by my hand on the lane, paid in coin, signed, witnessed. A contract." She folds her hands on the clock. "The city\'s Ledger cannot void a lawful contract. It has tried, in its fashion: it has nailed up an order that says the store is the Precinct\'s. Tonight we find out which paper the glass believes."' },
      ],
      again: 'The guild\'s shares.',
      effects: [{ lead: 'l_ln_futures' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    offer: {
      text: '"Two hundred and fifty Tolls, tonight, as a factor\'s fee. The guild\'s gratitude, which is worth more and is rarer." She tilts her head at the next wagon, where a man in a clean coat sits writing. "The Concern\'s man will tell you what Halcyon offers the Choir\'s people: contracts, terraces, a roof. Order, on the Flats, for once." She opens the clock again. "And the city goes home with its paper. I am told you have reasons to want that."',
      again: '"Order, on the Flats, for once."',
      interject: [{ companion: KES, text: '"Contracts," Kes says. "Terraces. A roof." She touches her neck. "And the thing in your neck that comes with the roof. Ask him about that."', effects: [A(KES, -1)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    warned: {
      text: 'She is not surprised. That is the worst of it. "I have known since the docket," she says. "The city wrote me down as its Treasurer forty years before I was one, and the Choir\'s hard children read the same list." She winds the clock, three turns. "Thank you. It is a debt. I pay my debts." She looks at you over it. "I will not sleep on the lane."',
      again: '"I will not sleep on the lane."',
      interject: [{ companion: ODILE, text: 'Odile lets out a breath you did not know she had been holding. "Imelda," she says, "for once in your life, do as you\'re told."' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    pledge: {
      text: 'She counts two hundred and fifty onto the rug from a purse that does not get lighter, and pushes it toward you with one finger. "Good," she says. "At dusk the riders take the lane. At midnight the city will try its paper on the store, and the Elder\'s daughter will try something worse. Be where I need you." She closes the clock. "Not at that price, I said, to the city. To you, at this one."',
      again: '"Be where I need you."',
      interject: [
        { companion: WREN, text: 'Wren looks at the riders, and at the Tolls on the rug, and at you. "I\'ll see this night out," she says. "Because I said I\'d walk with you. Then I\'m gone." She does not raise her voice either.', effects: [{ learn: 'wren_warned_tc' }] },
        { companion: KES, text: 'Kes has gone white. "You\'ve handed them the Flats," she says. "Obviously you know that. I\'ll stay till it\'s light. Don\'t talk to me."', effects: [{ learn: 'kes_warned_tc' }] },
        { companion: ASH, text: 'Ash turns his hat in his hands. "Then tomorrow I\'ll be at the store door," he says, "on the other side of you." He walks away down the lane toward the green.', effects: [{ learn: 'ash_warned_tc' }] },
        { companion: ILYA, if: VASHA_ALIVE, text: '"She rides with them," Ilya says. He does not need to say who. "You know that. You\'ve put me on her side of the lane." He checks his rifle\'s bolt twice.', effects: [A(ILYA, -10)] },
        { companion: ODILE, text: '"Well," Odile says, "Imelda always paid on the nail." She pockets nothing; it is your money. "My dear, I hope you know what the nail is."' },
      ],
      options: [bye],
    },
  },
};

export const d_ln_roux: DialogueDef = {
  id: 'd_ln_roux', owner: 'npc_dk_05',
  start: [{ if: { knows: 'ln_roux_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: F('dk_concern_billed'), text: 'Lucien Roux, the Concern\'s bond officer from Carrick, at a camp desk in the next wagon, in a clean coat, writing. He recognises you and finishes his line before he looks up. "The weighbridge," he says. "Every box to the plate, now. That was you." No heat in it. "The Concern backs the guild tonight. It also remembers."' },
        { text: 'A man in a clean coat at a camp desk in the next wagon along, writing in a ledger by a hooded lamp: Lucien Roux, the Concern\'s bond officer from Carrick, here because the guild\'s claim on Openfield\'s seed is underwritten by Halcyon. He finishes his line before he looks up. "Good evening. The Concern backs the guild\'s claim. I am here to see it honoured."' },
      ],
      again: 'Roux, at the camp desk.',
      effects: [{ learn: 'ln_roux_met' }],
      options: [{ id: 'ln.roux.go', text: 'Why does the Concern want seed?', next: 'vault' }],
    },
    hub: {
      text: '"Yes?" Roux keeps his pen on the line.',
      again: 'Roux waits, pen on the line.',
      options: [
        { id: 'ln.roux.vault', text: 'Why does the Concern want seed?', if: { not: { seen: 'ln.roux.go' } }, next: 'vault' },
        { id: 'ln.roux.people', text: 'And the Choir\'s people?', if: { not: { seen: 'ln.roux.people' } }, next: 'people' },
        { id: 'ln.roux.dogs', text: 'What have you brought for the night?', if: { not: { seen: 'ln.roux.dogs' } }, next: 'dogs' },
        { id: 'ln.roux.pledge', text: 'I\'ll stand with the guild.', if: OPEN, effects: [...PLEDGE_GUILD, { give: 'tolls', count: 250 }], next: 'pledged' },
        bye,
      ],
    },
    vault: {
      text: '"Halcyon keeps a seed vault under its gardens: every grain line the old world bred, held cold. Openfield\'s seed is ninety years of the glass selecting what will grow in it. There is nothing like it anywhere." He sets the pen down at last. "In a timber shed it will rot, or burn, or go to the Precinct\'s ration bins. In the vault it will outlast all of us. That is not a threat. It is the best argument I have, and it happens to be true."',
      again: '"It happens to be true."',
      effects: [{ lead: 'l_ln_vault' }],
      interject: [{ companion: TAMSIN, text: '"Kept cold under a mountain where nobody can plant it," Tamsin says. "Like the Cistern." She looks at Roux. "We were kept too. Ask us how that went."', effects: [A(TAMSIN, 2)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    people: {
      text: '"Contracts." He says it as a kindness. "Terraces on the Teeth, rooms, rations, a clinic. The Concern takes anyone who signs. A farmer who can grow in glass is worth a great deal to us." He pauses. "Chrome, for those who want it. It is better chrome than anyone else\'s. It does come with terms of service. Everything does."',
      again: '"It does come with terms of service."',
      interject: [{ companion: KES, text: 'Kes laughs, short and ugly. "Terms of service," she says. "Ask me what\'s in mine."', effects: [A(KES, -2)] }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    dogs: {
      text: [
        { if: F('an_key', 'concern'), text: '"Kennel Seven\'s first pack walked west out of the Ashlands four days ago." He says it as a man reads a delivery note. "Recovered thanks to you, I believe. They will be on the lane by dusk. I would ask your friends not to run from them."' },
        { if: F('nw_controllers', 'guild'), text: '"Kennel boards, delivered to the guild\'s floor at Carrick by barge this season, and the units they speak to." He nods toward the dark beyond the wagons, where something on four legs is sitting very still. "A few. Enough to keep a lane."' },
        { if: F('an_reserve', 'sealed'), text: '"Riders. Rifles. Paper." He looks at you a moment longer than he needs to. "There was to be more. A reserve in the Ashlands we expected to recover this season. Somebody sealed it against us." He picks the pen up. "We noticed."' },
        { text: '"The guild\'s riders and the guild\'s paper. The Concern does not bring its own people to a farm." He picks the pen up. "Unless it has to."' },
      ],
      again: 'What the Concern has brought.',
      effects: [{ learn: 'ln_roux_dogs' }],
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    pledged: { text: 'Roux writes a line, blots it, and turns the ledger so you can see your name in it in a clean hand under the day\'s date. "The Concern remembers its friends," he says, "in writing." Two wagons down, Sarr\'s purse comes open.', again: 'Your name in the Concern\'s ledger.', options: [bye] },
  },
};

// ---------------------------------------------------------------- the city: Captain Lowe and the order on the well

const ORDER_TERMS: { if?: Cond; text: string }[] = [
  { if: PREC('yields'), text: 'PERSONS: AS THE RECORD HOLDS, SAVE THAT ANY PERSON STANDING AT THE READING MAY BE ENTERED LIVING AND HEARD (COURT OF ACCOUNTS, R30: THE RECORD YIELDS TO A LIVING PERSON).' },
  { if: PREC('outside'), text: 'PERSONS: THE RECORD DOES NOT HOLD THE OCCUPIERS (UNRECORDED). THE CITY CAN NEITHER MOVE NOR SHELTER THEM (COURT OF ACCOUNTS, R30). THEY REMAIN ON THE HOLDING WITHOUT STORES.' },
  { if: PREC('property'), text: 'PERSONS: OCCUPIERS UNRECORDED; REMOVED WITH THE HOLDING\'S CONTENTS AS PROPERTY (COURT OF ACCOUNTS, R30) TO PRECINCT LABOUR.' },
  { text: 'PERSONS: AS THE RECORD HOLDS. RELOCATION ON SCHEDULE.' },
];
const ORDER_TEXT: { if?: Cond; text: string }[] = ORDER_TERMS.map((t) => ({ ...t, text: `The city's order, in a clerk's square hand under the Ledger's seal, nailed to Openfield's well post: THE HOLDING KNOWN AS OPENFIELD IS RETURNED TO THE SCHEDULE. CLAIMS UPON ITS STORES BY ANY PARTY ARE VOID AGAINST THE CITY. STORES: TO PRECINCT SUPPLY. ${t.text} FIRST NAME TO BE READ: CALLA, SISTER, OF SHALE — SEDITION. And under it, the date the order takes effect, which is tonight's.` }));

export const d_ln_order: DialogueDef = {
  id: 'd_ln_order', owner: 'narrator', start: [{ if: CALLED, node: 'order' }, { node: 'post' }],
  nodes: {
    post: { text: 'A post by Openfield\'s well where the Choir pins its notices: a call for hands at harvest, a child\'s drawing of the sky, nothing that wants anything of you.', again: 'The well post.', options: [leave] },
    order: {
      text: ORDER_TEXT,
      again: 'The city\'s order on the well post.',
      effects: [{ lead: 'l_ln_order' }],
      interject: [
        { companion: NINE, text: 'Nine reads it twice, the way it reads a form it has been asked to sign. "Claims by any party void against the city," it says. "That clause cannot void a lawful contract. It can only say so." It touches the seal. "The Precinct\'s clerks know that. They wrote it anyway, because the schedule says Openfield burns tonight, and a paper that says so makes it easier."', effects: [A(NINE, 2), { learn: 'ln_order_weak' }] },
        { companion: TAMSIN, text: '"Relocation on schedule," Tamsin reads. Her voice has gone thin. "That\'s the word. That\'s the word MOTHER said no to. Three times."', effects: [A(TAMSIN, 1)] },
      ],
      options: [{ id: 'order.copy', text: '(Copy it out.)', if: { not: { item: 'k_ln_order' } }, effects: [{ give: 'k_ln_order' }, { time: 15 }], next: 'copied' }, leave],
    },
    copied: { text: 'You copy it out on the back of something, every word, the seal drawn as a circle.', again: 'Your copy of the order.', options: [leave] },
  },
};

export const d_ln_notice: DialogueDef = {
  id: 'd_ln_notice', owner: 'narrator', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: [
        { if: F('ln_openfield', 'burned'), text: 'The seed store\'s door, charred to its frame, and the tally board beside it burned to a black square. Somebody has chalked on the stone of the step, in a child\'s hand: WE SAT.' },
        { if: F('ln_openfield', 'guild'), text: 'The seed store\'s door with a new lock on it and the guild\'s half-moon branded into the wood, and under it a Concern stencil: PROPERTY OF HALCYON SEED VAULT — CONSIGNED.' },
        { if: F('ln_openfield', 'evicted'), text: 'The seed store\'s door under the city\'s seal, a strip of grey paper across the jamb: STORES TO PRECINCT SUPPLY — EMPTIED — R30. The store is empty. So is the green.' },
        { if: F('ln_stores', 'split'), text: 'The seed store\'s door with three marks on it in three hands: the guild\'s half-moon, the city\'s seal, and a circle for the sky. Under them a tally of thirds, kept by Doria, checked by a clerk and countersigned by a factor\'s hand.' },
        { if: DONE, text: 'The seed store\'s door, scorched along its foot where the fire got that far and no further, and the Choir\'s tally board back over the guild\'s notice. COUNTED AT DUSK. COUNTED AT DAWN.' },
        { if: CALLED, text: 'The guild\'s notice, nailed over the Choir\'s tally board on the seed store\'s door: SHARES IN THE OPENFIELD HARVEST FALL DUE THIS NIGHT. CLAIMED UNDER CONTRACT, GUILD OF TOLLS. I. SARR, GRAND FACTOR. Somebody has written under it in pencil, very small: THE SKY KEEPS NO BOOKS.' },
        { text: 'The seed store\'s tally board on its door: COUNTED AT DUSK. COUNTED AT DAWN. Doria\'s marks, every day of the season.' },
      ],
      again: 'The seed store\'s door.',
      effects: [],
      options: [{ id: 'notice.read', text: '(Read the guild\'s notice closely.)', if: { all: [CALLED, { not: DONE }, { not: { lead: 'l_ln_futures' } }] }, effects: [{ lead: 'l_ln_futures' }], next: 'read' }, leave],
    },
    read: { text: 'Under the notice, pinned behind it, a sheaf of the guild\'s chits: OPENFIELD — ONE CRATE — ONE SHARE — 12 T — witnessed by the guild\'s hand on the lane, a season of them. Every one of them a child of the Choir\'s name, signed.', again: 'The guild\'s chits.', options: [leave] },
  },
};

export const d_ln_lowe: DialogueDef = {
  id: 'd_ln_lowe', owner: 'npc_md_01',
  start: [{ if: { knows: 'ln_lowe_met' }, node: 'hub' }, { node: 'intro' }],
  nodes: {
    intro: {
      text: [
        { if: F('ar_verdict', 'agreed'), text: 'Captain Idris Lowe of the Precinct\'s wardens by Openfield\'s well, in grey, with the order\'s copy in a case at his hip. He straightens when he sees you, which he has never done before. "Designate." He does not like saying it. He says it. "The schedule holds. Tonight it holds here. I would rather it held with your hand on the paper than mine."' },
        { text: 'Captain Idris Lowe of the Precinct\'s wardens by Openfield\'s well, in grey, a long way from the city, with the order\'s copy in a case at his hip and three wardens at the lane\'s west end. He looks tired in the way of a man who has carried out a great many lawful things. "The schedule holds," he says. "Tonight it holds here. I am not going to pretend to you that I like it."' },
      ],
      again: 'Lowe, by the well.',
      effects: [{ learn: 'ln_lowe_met' }, { quest: 'q_a2_longnight', start: true }],
      interject: [{ companion: NINE, text: '"Captain." "Unit nine." Lowe looks at it a long moment. "You were called in." "I was," Nine says. "I am here." Neither of them says on which side.' }],
      options: [{ id: 'ln.lowe.go', text: 'Tell me what the city wants.', next: 'hub' }],
    },
    hub: {
      text: '"Ask," Lowe says. "I will answer what I lawfully can."',
      again: 'Lowe waits.',
      options: [
        { id: 'ln.lowe.order', text: 'Read me the order.', if: { not: { seen: 'ln.lowe.order' } }, effects: [{ lead: 'l_ln_order' }], next: 'order' },
        { id: 'ln.lowe.calla', text: 'Why Calla?', if: { all: [F('ln_calla_taken'), { not: { seen: 'ln.lowe.calla' } }] }, next: 'calla' },
        { id: 'ln.lowe.why', text: 'What does the city get from this?', if: { not: { seen: 'ln.lowe.why' } }, next: 'why' },
        { id: 'ln.lowe.pledge', text: 'I\'ll stand with the city.', if: OPEN, effects: PLEDGE_LEDGER, next: 'pledge' },
        bye,
      ],
    },
    order: { text: ORDER_TERMS.map((t) => ({ ...t, text: `He takes the copy out of its case and reads it to you in full, the way he would read it to the holding, without leaving a word out: the holding returned to the schedule, every claim on its stores void against the city, the stores to Precinct supply. "${t.text}" He folds it. "And the first name to be read. You know whose."` })), again: 'The order, read in full.', options: [{ text: 'Something else.', next: 'hub' }] },
    calla: {
      text: [
        { if: F('ca_calla_listed'), text: '"She is on the Court of Accounts\' docket. Sedition, listed." He does not look away. "You have seen the docket. The order reads the docket\'s names first, wherever they are found. She was found here."' },
        { text: '"The record holds a sedition docket in her name. The order reads the docket\'s names first, wherever they are found." He does not look away. "She was found here. She is on her way to the city to be heard."' },
      ],
      again: '"She is on her way to the city to be heard."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    why: {
      text: [
        { if: { any: [F('sk_pumps', 'paid'), F('nw_sink_relief')] }, text: '"Bread." He says it plainly. "The Sink kept its pumps this spring and the Precinct\'s supply came in short, and it will be short again this winter. The schedule makes the shortfall good from the Flats, from this store. Without it the Precinct rations by the spring, and you have seen what the Precinct does when it rations." He breathes out. "I will not tell you the Sink should have drowned. I will tell you there is a bill, and this is where it is sent."' },
        { if: F('nw_precinct_short'), text: '"Water and bread. The city\'s plan was recomputed on a smaller lake this season, and the Precinct\'s growth with it. The schedule makes up the difference here." He looks at the store. "Somebody told the truth about a dam. This is what the truth costs, on paper."' },
        { text: '"The Precinct eats this winter." He says it as if he has said it to himself many times. "The schedule writes Openfield\'s stores into the Precinct\'s supply, and the guild off the Flats with them. Order, and bread, for four hundred thousand people inside the Wall." He looks at the Choir on the green. "And these people somewhere else. The schedule holds."' },
      ],
      again: '"The schedule holds."',
      options: [{ text: 'Something else.', next: 'hub' }],
    },
    pledge: {
      text: [
        { if: F('ar_verdict', 'agreed'), text: 'He hands you the order\'s copy out of its case, and does not let go of it for a moment. "Then you read it," he says. "At the well, when it is time. It is better coming from you." He lets go. "Designate."' },
        { text: 'He nods once, the nod of a man whose night has become slightly easier and much worse. "At dusk the line forms at the west end. At midnight the order is read at the well. The guild will contest it. So will the Elder\'s daughter." He looks at you. "Be at the well."' },
      ],
      again: '"Be at the well."',
      interject: [
        { companion: TAMSIN, text: '"This is what they\'d do to the Cistern," Tamsin says. She is not shouting; it is worse. "Exactly this. A paper on the door and a captain who doesn\'t like it." She walks away from you across the green.', effects: [{ learn: 'tamsin_saw_order' }] },
        { companion: ASH, text: 'Ash looks at you for a long time. "I\'ll see it," he says. "I owe them that. I owe you nothing after."', effects: [{ learn: 'ash_warned_city' }] },
        { companion: NINE, if: F('nine_stance', 'conscience'), text: '"I will stand at the well with you," Nine says. "And when the order is read, I will log every line of it that cannot be made lawful. Aloud." It does not look at Lowe. "That is what I am for."', effects: [{ learn: 'nine_reads_order' }] },
        { companion: NINE, text: '"Then we will make it lawful," Nine says, "line by line, and I will log what could not be softened." It sounds, for once, very old.' },
        { companion: WREN, text: '"The city," Wren says. She has her goggles down. "The rope\'s city." She does not say anything else, and does not look at you.' },
      ],
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- the table: a truce, or the end of one

const TRUCE_CHECK: CheckDef = {
  skill: 'speech', dc: 75,
  mods: [
    ...FAVOURS.map((f) => ({ if: f.cond, dc: -3, why: `what ${f.label} owes you` })),
    { if: IN(ODILE), dc: -10, why: 'Odile reads the guild\'s paper to the guild' },
    { if: { all: [IN(NINE), F('nine_stance', 'conscience')] }, dc: -10, why: 'Nine names the order\'s void clause to the captain' },
    { if: { concluded: 'c_ln_three' }, dc: -5, why: 'you know all three claims on the one shed' },
    { if: F('ar_verdict', 'agreed'), dc: -5, why: 'the city listens to its designate' },
    { if: F('odile_sheet', 'player'), dc: -5, why: 'you hold the guild\'s own sheet on Shale' },
    { if: F('ln_sarr_warned'), dc: -5, why: 'the Grand Factor owes you her life' },
    { if: F('of_seed_outcome', 'chaff'), dc: 5, why: 'the guild was sold dead seed and remembers' },
    { if: F('an_key', 'concern'), dc: 10, why: 'the Concern has an army walking west and needs no truce' },
  ],
};

export const d_ln_table: DialogueDef = {
  id: 'd_ln_table', owner: 'narrator',
  start: [{ if: DONE, node: 'after' }, { if: PLEDGED, node: 'pledged' }, { if: F('ln_table_broken'), node: 'broken' }, { if: CALLED, node: 'table' }, { node: 'plain' }],
  nodes: {
    plain: { text: 'The common hall\'s long table: forty feet of scrubbed planks, benches down both sides, a bowl of something at the end for whoever is hungry.', again: 'The long table.', options: [leave] },
    table: {
      text: 'The common hall\'s long table, empty, forty feet of it under the lamps. Through the door: the guild\'s wagons on the lane east, the wardens\' line at the west end, the Choir on the green between them. Each of them is here for the same shed. None of them will sit down for the others. They might sit down for you, if each of them owed you something they could not refuse.',
      again: 'The long table, empty.',
      effects: [{ learn: 'ln_table_known' }],
      passives: FAVOURS.map((f) => ({ if: f.cond, label: f.label, text: f.text })),
      options: [
        { id: 'table.call', text: '(Send to the lane, the well and the green: all three to sit at this table at dusk, on two favours owed.)', if: { all: [TWO_FAVOURS, OPEN] }, showLocked: true, next: 'sit' },
        { id: 'table.none', text: '(Stand with none of them.)', if: OPEN, next: 'none' },
        leave,
      ],
    },
    sit: {
      text: 'They come, because you have called in what they owe. Sarr with her rug and her clock and Roux at her shoulder; Lowe with the order\'s case, and two wardens he leaves at the door; Mason, with his hat, and Doria with the tally book; and, last, Petra, who does not sit, and stands against the wall with her arms folded where she can see everyone\'s hands. Nobody speaks. Every one of them is looking at you.',
      again: 'All of them at the long table, looking at you.',
      interject: [{ companion: ODILE, text: 'Odile takes the bench beside you and lays a pencil down on the planks in front of her, square to the edge. "Shall we begin, my dears?" she says to the whole table. "I\'ll keep the book."', effects: [A(ODILE, 3)] }],
      options: [
        { id: 'table.truce', text: '(Make the truce: a third of the store to each claim, the eviction stayed at the rail, the people stay, and every one of you owes me.)', check: TRUCE_CHECK, effects: PLEDGE_TRUCE, next: 'truce', fail: 'broke', failEffects: [{ set: 'ln_table_broken' }, { trust: { npc: 'npc_nb_01', by: -5 } }, A(ODILE, -2)] },
        { id: 'table.leave', text: '(Let them go back to their sides. Choose one.)', effects: [{ set: 'ln_table_broken' }], next: 'broke' },
      ],
    },
    truce: {
      text: 'It takes until the lamps are low. Sarr prices every word and you pay for each one with something she owes you; Lowe will not void his order and you do not ask him to, only to stay it at the rail, a season, person by person, which the record allows; Roux writes everything down and says nothing; Mason says "yes" once, at the end, to everything, and Petra unfolds her arms. A third of the store to the guild\'s shares at the price they were bought at. A third to the Precinct\'s ration, by the city\'s carts. A third stays in the shed, counted at dusk and at dawn. The people stay. When it is done every one of them stands up and looks at you the same way, and it is not gratitude. It is the way people look at somebody who now holds a piece of each of them.',
      again: 'The truce, written, and the way they looked at you.',
      interject: [
        { companion: WREN, text: '"Everybody owes you," Wren says on the step after, quietly. "Nobody\'ll stand next to you." She bumps your shoulder. "Except us, I suppose. Somebody has to."', effects: [A(WREN, 3)] },
        { companion: TAMSIN, text: 'Tamsin is shaking. "Nobody got shot," she says. "Nobody got shot." She sits down on the step quite suddenly.' },
      ],
      options: [bye],
    },
    broke: {
      text: 'It does not hold. Sarr prices a word you cannot pay; Lowe will not stay what the schedule holds; Petra laughs, once, against the wall. One by one they stand up and go back to their sides of the green, Mason last, his hat in his hand. The table is empty, and will not be full again. You will have to stand with one of them, or none.',
      again: 'The empty table.',
      options: [leave],
    },
    none: {
      text: 'You could walk away from all of them. The guild\'s paper and the city\'s order would meet at the store in the small hours without you, and the Choir would sit in front of it, and the night would go the way the city\'s forecast wrote it: Openfield burns, the Elder with it, the stores to the Precinct.',
      again: 'The night, as it is written.',
      options: [
        { id: 'table.none.yes', text: '(Stand with none of them. Let it come as it is written.)', effects: PLEDGE_NONE, next: 'none_said' },
        { text: '(Not yet.)', next: 'table' },
      ],
    },
    none_said: { text: 'You say so, to nobody in particular, in an empty hall. Nobody comes to argue. It is not that kind of night.', again: 'The empty hall.', options: [leave] },
    broken: { text: 'The long table, empty under the lamps. They will not sit at it again.', again: 'The empty table.', options: [{ id: 'broken.none', text: '(Stand with none of them.)', if: OPEN, next: 'none' }, leave] },
    pledged: { text: [{ if: LN('truce'), text: 'The long table, three marks on its end in three hands, and Doria asleep at it over the tally book.' }, { text: 'The long table, empty under the lamps. You have chosen your side; the table is for people who have not.' }], again: 'The long table.', options: [leave] },
    after: { text: 'The common hall\'s long table, scrubbed, the benches pushed under it.', again: 'The long table.', options: [leave] },
  },
};

// ---------------------------------------------------------------- the night

const ROLL = (flag: string, label: string, text: string) => ({ if: F(flag), label, text });
const ROLL_CALL = [
  ROLL('ln_came_halts', 'West Halt', 'West Halt\'s watch walk down the track from the Line at dusk: Chela Ortega in front with her rifle slung, a dozen behind her, the brass tags on their collars catching the lamps. "The halts were fed when nobody else would feed them," she says. "Openfield fed the twelve."'),
  ROLL('ln_came_twelve', 'The twelve', 'The twelve off the stock car, who have lived at Openfield since they walked south from West Halt, come out of the long hall together and sit down in front of the store with the old ones, without being asked. Yaw Boateng in the middle.'),
  ROLL('ln_came_four', 'Number Four', 'Desmond Achebe and six of Number Four\'s miners off the evening\'s barge and the long walk, lamps on their caps, picks on their shoulders. "No paper past the cage," Desmond says. "No paper past the store, either."'),
  ROLL('ln_came_shift', 'The Shift', 'A committee from the Skirts off the Line: a dozen of the Shift with their lamps down, the way they go up from a mine, and a note in Maren Okafor\'s hand: WE GO UP TOGETHER. THIS IS UP.'),
  ROLL('ln_came_shift_armed', 'The Shift, armed', 'Rafe Ansel and twenty of the Shift\'s armed, with the Lodge\'s powder in their packs and their faces set. They do not sit. They take the lane\'s hedge and lie down behind it with their rifles.'),
  ROLL('ln_came_dogs', 'The Rust Dogs', 'Rust Dogs, a ragged twenty of them, down from the road on bikes with no lamps, Bridgeward\'s paint still on their jackets, and they put themselves across the east end of the lane between the guild\'s wagons and the green, and grin.'),
  ROLL('ln_came_calla', 'Sister Calla', 'Sister Calla, back off the Line, walking among the people sitting at the store with a basin and a cloth, the way she walked her tent in Shale. Where she passes, people sit straighter.'),
  ROLL('ln_came_nine', 'Unit nine', 'At the well, when the wardens\' line forms, Assessor Nine steps out of it and reads the order aloud before the captain can, every line, and after each line it cannot make lawful says, level, "Logged as an error." The wardens shift their feet.'),
  ROLL('ln_came_line', 'The guild\'s Line', 'The seven o\'clock comes into West Halt with guild riders in every coach, and they are at Openfield by dusk, forty of them, the guild\'s green on their cords.'),
  ROLL('ln_came_paths', 'The Concern\'s freight', 'A sealed Concern car on the through\'s path, run west on green and stopping for nobody but this: men in clean grey get down from it at West Halt\'s siding and walk south.'),
  ROLL('ln_came_kennel', 'Kennel boards', 'In the dark beyond the guild\'s wagons, things on four legs sit in a row, very still, their lenses lit, waiting to be told what a lane is.'),
  ROLL('ln_came_pack', 'Kennel Seven', 'Out of the east at dusk, a pack: thirty hounds off the March at a steady run that does not tire, grey plates under the glass dust, and they lie down in rows behind the guild\'s wagons like a sown field.'),
  ROLL('ln_came_vasha', 'Vasha Kade', 'Vasha Kade rides in with the guild\'s riders at the head of a dozen of her own, sitting her bike like a judge, and looks across the green at the store the way she looks at everything: as if it were already written.'),
  ROLL('ln_came_fuel', 'The shore\'s oil', 'Guild trucks, running on Hum\'s oil off the shore, grind up the lane in low gear with empty beds for the store.'),
  ROLL('ln_came_deputy', 'Unit nine', 'Assessor Nine stands in the wardens\' line at the well, its cap square, and when the order is read it makes each line lawful as it goes, and the wardens stand straighter for it.'),
  ROLL('ln_came_designate', 'The designate\'s warrant', 'The wardens\' line knows whose hand is on the order. They stand differently for it: like men who will be thanked.'),
  ROLL('ln_came_wardens_kennel', 'The city\'s kennel', 'Behind the wardens\' line, the kennel boards the city seized off a barge, and what they speak to: three hounds in the city\'s grey paint, sitting.'),
];
const AGAINST = [
  ROLL('ln_against_kennel', 'Against: hounds', 'Across the lane, things on four legs in a row behind the guild\'s wagons, lenses lit.'),
  ROLL('ln_against_pack', 'Against: Kennel Seven', 'Out of the east at dusk, a pack off the March that lies down in rows behind the guild\'s wagons.'),
  ROLL('ln_against_vasha', 'Against: Vasha Kade', 'Vasha Kade, at the head of a dozen riders, looking at the store as if it were already written.'),
  ROLL('ln_against_line', 'Against: the guild\'s Line', 'Forty guild riders off the seven o\'clock, at the lane by dusk.'),
  ROLL('ln_against_deputy', 'Against: unit nine', 'Assessor Nine in the wardens\' line, making each line of the order lawful as it is read.'),
  ROLL('ln_against_conscience', 'Against: unit nine', 'Assessor Nine stepping out of the line to log the order\'s errors aloud, and the wardens shifting their feet.'),
  ROLL('ln_against_halts', 'Against: West Halt', 'The halts will not carry your side\'s men on their sections tonight: the request flags stay down and the pilots stay home.'),
  ROLL('ln_against_shift', 'Against: the Shift', 'Rafe Ansel\'s armed men behind the lane\'s hedge, rifles out, for the Choir.'),
  ROLL('ln_against_dogs', 'Against: the Rust Dogs', 'Rust Dogs across the east end of the lane, for the farmers, grinning.'),
];

/** The night's crisis at midnight, by alliance: the player's own act adds to the night's strength. */
const WIN = (how: string, extra: Effect[] = []): Effect[] => [{ inc: 'ln_strength' }, { set: 'ln_midnight', value: how }, ...extra];
const FIGHT = (how: string, flag: string): Effect[] => [{ inc: 'ln_strength' }, { set: 'ln_midnight', value: how }, { set: flag }, { set: 'ln_midnight_fought' }, { event: 'combat' }];

/** After the outcome: Calla's car leaves at dawn if nobody took her off it; the city's unit comes back; the companions whose
 * red lines the night crossed say so and go. */
const CALLA_DEFAULT: Cond = { all: [F('ln_calla_taken'), { not: F('ln_calla') }] };
const NINE_BACK: Cond = IN(NINE);
const RL_ASH: Cond = { all: [IN(ASH), { any: [LN('guild'), LN('ledger')] }, { not: F('ash_gone') }] };
const RL_WREN: Cond = { all: [IN(WREN), LN('guild')] };
const RL_KES: Cond = { all: [IN(KES), LN('guild')] };
const RL_ODILE: Cond = { all: [IN(ODILE), F('odile_price', 'sarr'), F('ln_sarr', 'dead')] };
const TAIL: { if: Cond; node: string }[] = [
  { if: CALLA_DEFAULT, node: 'calla' }, { if: NINE_BACK, node: 'nine' }, { if: RL_ASH, node: 'rl_ash' }, { if: RL_WREN, node: 'rl_wren' }, { if: RL_KES, node: 'rl_kes' }, { if: RL_ODILE, node: 'rl_odile' },
];
const tailFrom = (node: string): OptionDef[] => {
  const i = TAIL.findIndex((t) => t.node === node);
  return route(`tail.${node}`, TAIL.slice(i + 1), 'close');
};
const toTail = (idp: string): OptionDef[] => route(idp, TAIL, 'close');

/** The outcome at dawn: what Openfield is, where its stores went, keystone 8, and how every faction reckons it. */
const END = (_alliance: string, openfield: string, stores: string | null, mason: string | null, text: string, extra: Effect[]): Effect[] => [
  { set: 'ln_openfield', value: openfield }, ...(stores ? [{ set: 'ln_stores', value: stores } as Effect] : []), ...(mason ? [{ set: 'ks_mason', value: mason } as Effect] : []),
  ...extra, { decision: { id: 'ln_dawn', text } },
];
const PRECINCT_SHORT: Effect[] = [{ set: 'ln_precinct_short' }, { set: 'ln_city_warrant' }];
const LEASH: Effect[] = [{ set: 'ln_leash', value: 'spreads' }, { set: 'ln_guild_holds_flats' }];
const EVICT_GUILD: Effect[] = [{ set: 'ln_guild_evicted' }, { set: 'ln_precinct_fed' }];

const N = (text: NodeDef['text'], again: string, options: OptionDef[], extra: Partial<NodeDef> = {}): NodeDef => ({ speaker: 'narrator', text, again, options, ...extra });

const NIGHT_NODES: Record<string, NodeDef> = {
  dusk: N([
    { if: LN('choir'), text: 'Dusk at Openfield. The Choir sits down in front of the seed store, the old ones in front, Mason on his bench with his hat beside him, children sent to the long hall and not staying there. On the lane east the guild\'s lamps come on one by one. At the west end the wardens\' line forms in grey, very straight. Between them, the green, and the well with the order on it, and you.' },
    { if: LN('guild'), text: 'Dusk at Openfield. The guild\'s riders take the lane in pairs and the wagons are drawn across it, beds empty, waiting for the store. At the west end the wardens\' line forms in grey. On the green the Choir sits down in front of the seed store, the old ones in front, and does not look at you.' },
    { if: LN('ledger'), text: 'Dusk at Openfield. The wardens\' line forms at the west end, very straight, and moves up to the well, and Lowe stands by the order with its copy in his hand. On the lane east the guild\'s lamps come on. On the green the Choir sits down in front of the store, the old ones in front, and Petra and her young ones are nowhere you can see.' },
    { if: LN('truce'), text: 'Dusk at Openfield, and for once nobody forms a line. The guild\'s carts come up the lane with a clerk walking beside them; the city\'s carts come from the west with a warden walking beside them; Doria opens the store\'s door and stands in it with her tally book, and counts the first third out, crate by crate, and nobody shouts.' },
    { text: 'Dusk at Openfield. The Choir sits down in front of the store. The guild\'s lamps come on along the lane. The wardens\' line forms at the west end. Nobody looks at you, because you have told them you are nobody\'s tonight.' },
  ], 'Dusk at Openfield.', [{ id: 'night.dusk', text: '(The night comes.)', next: 'midnight' }], {
    passives: [...ROLL_CALL, ...AGAINST],
    interject: [
      { companion: WREN, if: F('ln_came_dogs'), text: 'Wren is off the green and among the Dogs before you can say a word, slapping backs, swearing, laughing. She comes back with her goggles up. "Told you," she says. "They hate riders worse than farmers."', effects: [A(WREN, 5)] },
      { companion: KES, if: F('ln_came_shift'), text: 'Kes sees Maren\'s note in the committee\'s hands and has to sit down. "We go up together," she reads, and wipes her nose with the back of her hand. "Obviously she\'d say that. Obviously."', effects: [A(KES, 5)] },
      { companion: ILYA, if: F('ln_came_vasha'), text: 'Ilya has seen Vasha. He does not say anything. He lies down behind the well\'s wall with his rifle and does not take his eye from the glass for the rest of the night.', effects: [{ learn: 'ilya_saw_vasha' }] },
      { companion: ILYA, if: F('ln_against_vasha'), text: 'Ilya has seen Vasha, across the lane, at the head of her riders. He does not say anything. He lies down behind the well\'s wall with his rifle and does not take his eye from the glass for the rest of the night.', effects: [{ learn: 'ilya_saw_vasha' }] },
      { companion: TAMSIN, text: 'Tamsin sits down among the Choir on the step of the store, between an old woman and a boy, and folds her hands in her lap the way they do. "I want to see what it\'s like," she says, "sitting in front of a door." She does not look at you.', effects: [A(TAMSIN, 2)] },
      { companion: NINE, text: '"The city has called its units in," Nine says. "I will be at the well. I will come back." It goes, and does not look back, and you are not sure, until the order is read, which way it will turn.' },
    ],
  }),
  midnight: N([
    { if: LN('choir'), text: 'Midnight. The guild\'s riders come up the lane at a walk with lamps and the wagons behind them, for the store; and from the west, the wardens\' line, at a walk, for the well and the order. The Choir sits. Somebody in it has started singing, badly, and the others have joined in to cover for them.' },
    { if: LN('guild'), text: 'Midnight. The wardens\' line comes up to the well and Lowe begins to read the order aloud. The riders draw in round the store. And from the store\'s side, low, fast, three of Petra\'s young ones are moving along the long hall\'s wall with something that smells of lamp oil.' },
    { if: LN('ledger'), text: 'Midnight. Lowe stands at the well with the order in his hand and the wardens at his back. The guild\'s riders draw up on the lane to contest it with their paper and their rifles. The Choir sits in front of the store, and does not move, and has started to sing.' },
    { if: LN('truce'), text: 'Midnight. The second third goes out on the city\'s carts. A rider and a warden share a cigarette by the well, not speaking. Mason sleeps sitting up on his bench. It is the strangest night anybody here has ever kept.' },
    { text: 'Midnight. The riders come up the lane. The wardens come up to the well. The Choir sits. You watch.' },
  ], 'Midnight at Openfield.', [
    // the Choir's night
    { id: 'night.c.fight', text: '(Hold the lane against the guild\'s riders.)', if: LN('choir'), effects: FIGHT('fought', 'ln_riders_fight'), exit: true },
    { id: 'night.c.talk', text: '(Walk down the lane alone and talk the riders\' captain round.)', if: LN('choir'),
      check: { skill: 'speech', dc: 50, mods: [{ if: F('ln_sarr_warned'), dc: -10, why: 'the Grand Factor owes you her life and her captain knows it' }, { if: IN(ODILE), dc: -5, why: 'Odile walks beside you and knows the guild\'s riders by name' }, { if: { concluded: 'c_ln_three' }, dc: -5, why: 'you know whose paper is a lie' }, { if: F('ln_against_line'), dc: 10, why: 'forty riders off the Line' }, { if: { any: [F('ln_against_kennel'), F('ln_against_pack')] }, dc: 10, why: 'they have dogs' }] },
      effects: WIN('talked', [{ xp: 80 }]), next: 'small', fail: 'mid_fail' },
    { id: 'night.c.sit', text: '(Sit down in the lane in front of the riders, with the Choir.)', if: LN('choir'), check: { attr: 'grit', dc: 7, mods: [{ if: F('ln_came_calla'), dc: -1, why: 'Calla is walking among the people sitting' }, { if: IN(ASH), dc: -1, why: 'Ash sits down beside you' }] }, effects: WIN('sat', [{ xp: 80 }, A(ASH, 5), A(TAMSIN, 5)]), next: 'small', fail: 'sit_fail' },
    { id: 'night.c.core', text: '(Hold up the core out of Kelso\'s rack and tell the guild\'s hounds to lie down.)', if: { all: [LN('choir'), CORE, { any: [F('ln_against_kennel'), F('ln_against_pack')] }] }, effects: WIN('core', [{ set: 'ln_hounds', value: 'stood_down' }, { xp: 80 }, A(KES, -3), A(ILYA, 3)]), next: 'core' },
    // the guild's night
    { id: 'night.g.fire', text: '(Get to Petra\'s people before they reach the store with the oil.)', if: LN('guild'), check: { attr: 'reflex', dc: 7, mods: [{ if: { lead: 'l_ln_knife' }, dc: -1, why: 'you knew the Unwritten would try something' }] }, effects: WIN('saved_store', [{ xp: 80 }]), next: 'small', fail: 'fire_fail', failEffects: [{ set: 'ln_store_fired' }] },
    { id: 'night.g.paper', text: '(Meet the order at the well with the guild\'s paper: the city cannot void a lawful contract.)', if: LN('guild'),
      check: { skill: 'barter', dc: 50, mods: [{ if: IN(ODILE), dc: -10, why: 'Odile wrote contracts like these' }, { if: { knows: 'ln_order_weak' }, dc: -5, why: 'you know the void clause cannot do what it says' }, { if: F('of_seed_outcome', 'chaff'), dc: 10, why: 'half the guild\'s shares are on dead seed' }] },
      effects: WIN('paper', [{ xp: 80 }]), next: 'small', fail: 'mid_fail' },
    { id: 'night.g.fight', text: '(Break the wardens\' line at the well.)', if: LN('guild'), effects: [...FIGHT('fought', 'ln_wardens_fight'), { set: 'ln_city_warrant' }], exit: true },
    // the city's night
    { id: 'night.l.read', text: '(Take the order and read it at the well yourself, a person at a time.)', if: LN('ledger'),
      check: { skill: 'speech', dc: 50, mods: [{ if: PREC('yields'), dc: -15, why: 'the record yields to a person who stands: each one can be heard' }, { if: IN(NINE), dc: -10, why: 'Nine reads the lines with you' }, { if: F('ar_verdict', 'agreed'), dc: -5, why: 'the designate reads it' }] },
      effects: WIN('read', [{ xp: 80 }]), next: 'small', fail: 'mid_fail' },
    { id: 'night.l.fight', text: '(Hold the lane against the guild\'s riders for the wardens.)', if: LN('ledger'), effects: FIGHT('fought', 'ln_riders_fight'), exit: true },
    { id: 'night.l.clear', text: '(Stand back and let the wardens clear the holding.)', if: LN('ledger'), effects: [{ set: 'ln_midnight', value: 'cleared' }, A(ASH, -5), A(TAMSIN, -5)], next: 'small' },
    { id: 'night.l.core', text: '(Hold up the core out of Kelso\'s rack and tell the guild\'s hounds to lie down.)', if: { all: [LN('ledger'), CORE, { any: [F('ln_against_kennel'), F('ln_against_pack')] }] }, effects: WIN('core', [{ set: 'ln_hounds', value: 'stood_down' }, { xp: 80 }]), next: 'core' },
    // a truce kept, or nobody's
    { id: 'night.t.keep', text: '(Keep the night.)', if: LN('truce'), effects: [{ set: 'ln_midnight', value: 'kept' }], next: 'small' },
    { id: 'night.n.watch', text: '(Watch.)', if: LN('none'), effects: [{ set: 'ln_midnight', value: 'watched' }], next: 'small' },
  ], {
    interject: [
      { companion: ASH, if: LN('choir'), text: 'Ash is on his feet. Then, slowly, he sits down again on the store\'s step, beside Mason\'s bench, and puts his shotgun on the ground in front of him, and leaves it there.', effects: [A(ASH, 3)] },
      { companion: KES, if: LN('guild'), text: 'Kes stands with her back to the riders\' wagons and her eyes on the Choir sitting in front of the store. She does not say anything at all.' },
      { companion: TAMSIN, if: LN('ledger'), text: 'Tamsin is sitting among the Choir, on the wrong side of the order, and looks up at you when the line moves, and does not get up.', effects: [A(TAMSIN, -3)] },
    ],
  }),
  core: N('The core is warm in your hand, its lamp green, and across the lane every lens on four legs turns to it at once. Then, one after another, as if their names had been said, the guild\'s hounds lie down on the dirt and put their heads on their forelegs, and do not get up again whatever their handlers shout. The riders look at their dogs, and at you, and at each other.', 'The hounds, lying down.', [{ id: 'night.core.on', text: '(The small hours.)', next: 'small' }], {
    interject: [{ companion: KES, text: '"Don\'t," Kes says, very quietly, at your shoulder. "Don\'t ever do that again. Please." Her hand is on her neck.', effects: [A(KES, -2)] }],
  }),
  mid_fail: N('It does not go your way. Words are not enough tonight, or not yours, or not these; the night goes on past you and you have to run to keep up with it.', 'The night, going past you.', [{ id: 'night.fail.on', text: '(The small hours.)', next: 'small' }]),
  sit_fail: N('You sit, and the riders come on at a walk, and you are up and out of the way before the first horse reaches you, with the Choir\'s old ones sitting on behind you while the riders go round them, and you are ashamed of it all night.', 'Up and out of the way.', [{ id: 'night.sit.on', text: '(The small hours.)', next: 'small' }], { interject: [{ companion: ASH, text: 'Ash does not get up. The riders go round him. When you look back he is still there, beside Mason, his shotgun on the ground in front of him.' }] }),
  fire_fail: N('You are a breath too late. The oil goes over the store\'s back wall and a lamp after it, and the fire goes up the old timber like a word said aloud. The riders get half the store out before the roof comes in. Petra\'s people are gone into the dark.', 'The store\'s back wall, burning.', [{ id: 'night.fire.on', text: '(The small hours.)', next: 'small' }]),
  after_fight: N([
    { if: F('ln_riders_fight'), text: 'The lane, after: the guild\'s lamps out, a wagon on its side, riders down and riders gone back to Sarr\'s chair at a run, and the Choir still sitting in front of the store as if nothing had happened, because to them nothing has that they did.' },
    { text: 'The well, after: the wardens\' line broken and gone back to the west end in pieces, the order torn off the post, Lowe on one knee by a man in grey who is not getting up.' },
  ], 'After the fight.', [{ id: 'night.fight.on', text: '(The small hours.)', next: 'small' }]),
  small: N([
    { if: KNIFE, text: 'The small hours. The lamps on the lane are low. Down among the guild\'s wagons, where the Grand Factor sleeps in the middle one on her rug with her clock, something moves that is not a rider: three shapes in grey scarves, along the wagons\' shadow, low.' },
    { text: 'The small hours. The lamps on the lane are low, the wardens\' line is a row of grey shapes sitting on their packs, the Choir sleeps sitting up against each other in front of the store. Nothing moves that does not have to.' },
  ], 'The small hours.', [
    { id: 'night.k.ash', text: '(Ash is already moving.)', if: { all: [KNIFE, IN(ASH), F('ash_orders', 'refused')] }, effects: [{ set: 'ln_sarr', value: 'lives' }, { set: 'ln_ash_stood' }, A(ASH, 5), A(ODILE, 5)], next: 'ash_stands' },
    { id: 'night.k.ashknife', text: '(Ash is already moving. Toward the wagons.)', if: { all: [KNIFE, IN(ASH), F('ash_orders', 'other')] }, next: 'ash_knife' },
    { id: 'night.k.between', text: '(Get between the knives and the Grand Factor\'s wagon.)', if: { all: [KNIFE, { not: { all: [IN(ASH), { any: [F('ash_orders', 'refused'), F('ash_orders', 'other')] }] } }] },
      check: { attr: 'reflex', dc: 7, mods: [{ if: { lead: 'l_ln_knife' }, dc: -1, why: 'you knew they would come' }, { if: { all: [IN(ODILE), F('odile_price', 'sarr')] }, dc: -1, why: 'Odile is running beside you' }] },
      effects: [{ set: 'ln_sarr', value: 'lives' }, { xp: 80 }, A(ODILE, 5), { trust: { npc: 'npc_nb_01', by: 20 } }], next: 'knife_stopped', fail: 'knife_late', failEffects: [{ set: 'ln_sarr', value: 'dead' }, { set: 'ks_sarr', value: 'dead' }] },
    { id: 'night.k.shout', text: '(Shout for the riders.)', if: { all: [KNIFE, { not: { all: [IN(ASH), { any: [F('ash_orders', 'refused'), F('ash_orders', 'other')] }] } }] }, effects: [{ set: 'ln_sarr', value: 'lives' }, { set: 'ln_petra_taken' }, { rep: { faction: 'choir', respect: -10 } }, A(ASH, -5), A(ODILE, 3)], next: 'knife_shout' },
    { id: 'night.k.let', text: '(Let it happen.)', if: { all: [KNIFE, { not: { all: [IN(ASH), { any: [F('ash_orders', 'refused'), F('ash_orders', 'other')] }] } }] }, effects: [{ set: 'ln_sarr', value: 'dead' }, { set: 'ks_sarr', value: 'dead' }, A(ODILE, -20), A(NINE, -5)], next: 'knife_done' },
    { id: 'night.dawn', text: '(Dawn.)', if: { not: KNIFE }, next: 'dawn' },
  ]),
  ash_stands: N('Ash goes down the lane in the dark faster than a man that size should, and when the three grey shapes reach the Grand Factor\'s wagon he is already standing in front of its step with his empty hands out. One of them is Petra. "Brother," she says. "Sister," he says, and does not move, and the knife that was meant for the wagon goes into his forearm instead, and he does not move then either. They go. Sarr wakes to a man bleeding on her step and a clock that has stopped.', 'Ash on the wagon\'s step.', [{ id: 'night.ash.dawn', text: '(Dawn.)', next: 'dawn' }]),
  ash_knife: N('Ash goes down the lane in the dark with his shotgun left on the store\'s step and his knife in his hand, and you understand what the sum on his face was, and you have a breath to decide.', 'Ash, going down the lane.', [
    { id: 'night.ashk.stop', text: '(Say his name, the way he once said yours.)', check: { skill: 'speech', dc: 50, mods: [{ if: { approval: { companion: ASH, gte: 30 } }, dc: -15, why: 'he trusts you' }, { if: F('ash_s2_done'), dc: -5, why: 'you heard the Gully from him' }] }, effects: [{ set: 'ln_sarr', value: 'lives' }, { set: 'ash_orders', value: 'refused_late' }, A(ASH, 10)], next: 'ashk_stopped', fail: 'ashk_done', failEffects: [{ set: 'ln_sarr', value: 'dead' }, { set: 'ks_sarr', value: 'dead' }, { set: 'ash_orders', value: 'carried' }, { leave: ASH }, { set: 'ash_gone' }, { set: 'ash_unwritten' }] },
    { id: 'night.ashk.let', text: '(Let him go.)', effects: [{ set: 'ln_sarr', value: 'dead' }, { set: 'ks_sarr', value: 'dead' }, { set: 'ash_orders', value: 'carried' }, { leave: ASH }, { set: 'ash_gone' }, { set: 'ash_unwritten' }, A(ODILE, -20)], next: 'ashk_done' },
  ]),
  ashk_stopped: N('He stops in the middle of the lane with the knife in his hand. He stands there a long time. Then he puts it away and walks back up to the store\'s step and sits down beside Mason\'s bench and puts his face in his hands, and does not say anything until it is light.', 'Ash, on the step.', [{ id: 'night.ashks.dawn', text: '(Dawn.)', next: 'dawn' }]),
  ashk_done: N('He does not stop. You hear the wagon\'s door, and nothing else, because he is good at it, he always was; and then he walks back past you up the lane, and does not look at you, and does not stop at the store, and goes on west into the glass with Petra\'s three behind him, and you do not see him again.', 'Ash, gone west.', [{ id: 'night.ashkd.dawn', text: '(Dawn.)', next: 'dawn' }]),
  knife_stopped: N('You reach the wagon\'s step a breath before they do, and they see you, and stop, and one of them is Petra, and she looks at you over her scarf with an expression you will remember. Then they are gone into the dark the way they came. Sarr, awake, sits up on her rug with the clock in her lap. "Thank you," she says. "That is a debt."', 'The wagon\'s step, and Petra\'s look.', [{ id: 'night.ks.dawn', text: '(Dawn.)', next: 'dawn' }]),
  knife_late: N('You are a breath too late. They are already coming back past you along the wagons\' shadow, and one of them is Petra, and her knife is in her hand and not clean. In the middle wagon the clock has stopped.', 'The stopped clock.', [{ id: 'night.kl.dawn', text: '(Dawn.)', next: 'dawn' }]),
  knife_shout: N('You shout, and the riders\' lamps swing, and the three grey shapes break and run, and two of them get away into the glass. The third does not: the riders bring Petra Mason back up the lane by the arms with her scarf torn off her face, the face she has kept from every lens for ten years, in the lamplight, in front of the whole Choir.', 'Petra, in the lamplight.', [{ id: 'night.ksh.dawn', text: '(Dawn.)', next: 'dawn' }]),
  knife_done: N('You do not move. Neither does anything else on the lane, for a while. Then three grey shapes go back along the wagons\' shadow the way they came, unhurried, and in the middle wagon a clock has stopped.', 'The stopped clock.', [{ id: 'night.kd.dawn', text: '(Dawn.)', next: 'dawn' }]),
  dawn: N('Dawn comes up over the glass.', 'Dawn.', [
    ...route('dawn', [
      { if: { all: [LN('choir'), STRONG] }, node: 'choir_stands' }, { if: { all: [LN('choir'), MIXED] }, node: 'choir_scorched' }, { if: LN('choir'), node: 'choir_thin' },
      { if: { all: [LN('guild'), STRONG, { not: F('ln_store_fired') }] }, node: 'guild_company' }, { if: { all: [LN('guild'), { any: [STRONG, MIXED] }] }, node: 'guild_scorched' }, { if: LN('guild'), node: 'guild_burned' },
      { if: { all: [LN('ledger'), STRONG] }, node: 'ledger_evicted' }, { if: { all: [LN('ledger'), MIXED] }, node: 'ledger_scorched' }, { if: LN('ledger'), node: 'ledger_burned' },
      { if: LN('truce'), node: 'truce_dawn' },
    ], 'none_dawn', '(See what the night left.)'),
  ]),
  // ------------------------------------------------ the Choir's dawn
  choir_stands: N('The guild\'s wagons go back down the lane at first light with their beds empty, and the wardens\' line folds its tents at the west end and walks away west behind Lowe, slowly, the way men walk who will have to explain. The order is still on the well. Nobody has taken it down; nobody needs to. Openfield stands. The store stands, counted at dawn. Mason gets up off his bench at last, very stiffly, and goes to the store\'s door and puts his hand flat on it, and stands there a long time.', 'Openfield, standing.', toTail('end.cs'), {
    effects: END('choir', 'stands', 'choir', 'lives', 'Openfield stood through the Long Night: the guild went home with its paper and the city with its order, and the store was counted at dawn. The Precinct will be short this winter.', [
      { set: 'ln_band', value: 'strong' }, ...PRECINCT_SHORT, { rep: { faction: 'choir', respect: 20 } }, { rep: { faction: 'tollmen', respect: -15 } }, { rep: { faction: 'concern', respect: -10 } }, { rep: { faction: 'wardens', respect: -15 } }, { xp: 500 },
      A(TAMSIN, 5), A(ASH, 5), A(WREN, 3), A(KES, 3),
      { news: { tag: 'ln_openfield_stood', text: 'Openfield stood its Long Night: the guild and the city both went home without the store', valence: 10, size: 9, at: 'openfield' } },
    ]),
    interject: [{ companion: TAMSIN, text: 'Tamsin is asleep against the store\'s door when the light comes, among the old ones, her hands still folded in her lap. When she wakes she looks at the empty lane for a long time. "We sat," she says. "We just sat. And they went home."', effects: [A(TAMSIN, 3)] }],
  }),
  choir_scorched: N('At first light the guild\'s riders go back down the lane, and as they go they put their lamps to the rows. By the time the Choir is on its feet the east fields are burning, a year\'s harvest going up into the sky the Choir keeps no books for. The wardens watch from the west end and do not help and do not stop it, and fold their tents. The store stands. The seed is counted at dawn. The halls stand. Mason watches the rows burn with his hat in his hands.', 'The east fields, burning.', toTail('end.csc'), {
    effects: END('choir', 'scorched', 'choir', 'lives', 'Openfield held its store through the Long Night, but the guild burned the east fields as it went. The seed is safe; the year\'s harvest is not. The Precinct will be short this winter.', [
      { set: 'ln_band', value: 'mixed' }, ...PRECINCT_SHORT, { rep: { faction: 'choir', respect: 15 } }, { rep: { faction: 'tollmen', respect: -10 } }, { rep: { faction: 'wardens', respect: -10 } }, { xp: 400 },
      A(TAMSIN, 3), A(ASH, 3),
      { news: { tag: 'ln_openfield_scorched', text: 'Openfield kept its seed store through the Long Night; the guild\'s riders burned its fields as they left', valence: 4, size: 8, at: 'openfield' } },
    ]),
  }),
  choir_thin: N('Too few. At midnight\'s end the riders and the wardens reach the store together from two sides, and in the dark nobody can say afterwards who threw the first lamp. The store goes up. The long hall after it. The Choir goes on sitting, and then the old ones in front are not sitting, and then everybody is running, and Mason is not: he is in the store\'s doorway with his back to the fire, as if he could keep it in.', 'Mason, in the burning doorway.', [
    { id: 'end.ct.pull', text: '(Go in after him.)', check: { attr: 'brawn', dc: 7, mods: [{ if: IN(ASH), dc: -1, why: 'Ash goes in with you' }] }, effects: [{ set: 'ks_mason', value: 'lives' }, { set: 'ln_mason_burned' }, { xp: 100 }, A(ASH, 5), A(TAMSIN, 5)], next: 'ct_pulled', fail: 'ct_lost', failEffects: [{ set: 'ks_mason', value: 'dead' }] },
    { id: 'end.ct.let', text: '(He chose the door.)', effects: [{ set: 'ks_mason', value: 'dead' }, A(ASH, -5)], next: 'ct_lost' },
  ], {
    effects: [{ set: 'ln_band', value: 'thin' }, { set: 'ln_openfield', value: 'burned' }, ...PRECINCT_SHORT, { rep: { faction: 'choir', respect: 5 } }, { rep: { faction: 'wardens', respect: -10 } }, { rep: { faction: 'tollmen', respect: -5 } }, { xp: 300 },
      { news: { tag: 'ln_openfield_burned', text: 'Openfield burned in the Long Night, as the city\'s forecast said it would', valence: -6, size: 9, at: 'openfield' } }],
  }),
  ct_pulled: N('You go in. You do not remember most of it. You remember the heat and the sound, and that he was heavier than he looked, and that he did not help, and then the green under you and the sky over you and Mason beside you on the grass with his beard burned off one side, breathing.', 'Mason, on the grass, breathing.', route('end.ctp', [{ if: SEED_SHORE, node: 'seed_shore' }, { if: SEED_NORTH, node: 'seed_north' }], 'seed_lost')),
  ct_lost: N('The roof comes in. The doorway goes with it, and the man in it. In the morning the Choir builds his cairn in the burial ground under the dead windpump, without his name on it, as he would have wanted, and every one of them puts a stone on it.', 'The cairn under the windpump.', route('end.ctl', [{ if: SEED_SHORE, node: 'seed_shore' }, { if: SEED_NORTH, node: 'seed_north' }], 'seed_lost')),
  seed_shore: N('But not the seed. In the small hours, while the riders and the wardens watched the store, Doria and the twelve carried the seed out of its back in sacks and down the track to West Halt, where the halt\'s pilot would not let the guild\'s trains move, and on the seven o\'clock it went west to Carrick, and off the quay into hulls the shore had lent, and down the delta into the drowned town where nobody will ever find it but the people who put it there.', 'The seed, gone down the delta.', toTail('end.ss'), { effects: [{ set: 'ln_stores', value: 'shore' }, { decision: { id: 'ln_seed_shore', text: 'Openfield burned, but its seed went west on the Line and down the delta in the Stilts\' boats, hidden in the drowned town.' } }] }),
  seed_north: N('But not the seed. In the small hours Doria and the twelve carried it out of the store\'s back in sacks and down the track to West Halt, where the halt\'s pilot would not let the guild\'s trains move, and on the seven o\'clock it went west, and at the river onto a barge the Wet had promised you, and up the Water to Sawtown, where it is in a loft over the cookhouse under Dorit Avraham\'s eye.', 'The seed, gone up the river.', toTail('end.sn'), { effects: [{ set: 'ln_stores', value: 'north' }, { decision: { id: 'ln_seed_north', text: 'Openfield burned, but its seed went west on the Line and up the river on the Wet\'s barges, to a loft at Sawtown.' } }] }),
  seed_lost: N('And the seed with it: ninety years of the glass choosing what would grow in it, gone up into the sky in one night. Doria sits in the ashes of the store with the tally book in her lap and does not write anything in it.', 'Doria, in the ashes.', toTail('end.sl'), { effects: [{ set: 'ln_stores', value: 'lost' }, { decision: { id: 'ln_seed_lost', text: 'Openfield burned in the Long Night, and its seed store with it.' } }] }),
  // ------------------------------------------------ the guild's dawn
  guild_company: N('The order is read at the well and meets the guild\'s paper and the guild\'s rifles, and the city\'s line goes home with it at first light. The store is opened with the guild\'s keys and emptied onto the guild\'s wagons, crate by counted crate, and the Concern\'s stencil goes on every one: HALCYON SEED VAULT — CONSIGNED. Roux sits at his desk on the green and signs the Choir\'s people onto contracts as they come to him, one by one, the young first. Mason does not come. At noon he picks up his hat and walks out of Openfield west with the ones who will not sign, and does not look back.', 'Openfield, under the guild\'s mark.', toTail('end.gc'), {
    effects: END('guild', 'guild', 'guild', 'exiled', 'The guild took Openfield\'s store through the Long Night and the Concern consigned its seed to Halcyon\'s vault. Openfield is a company farm now; the Elder walked out with those who would not sign.', [
      { set: 'ln_band', value: 'strong' }, ...LEASH, { rep: { faction: 'tollmen', respect: 20 } }, { rep: { faction: 'concern', respect: 15 } }, { rep: { faction: 'choir', respect: -25 } }, { rep: { faction: 'wardens', respect: -10 } }, { xp: 450 },
      { news: { tag: 'ln_openfield_company', text: 'Openfield is the guild\'s now, and its seed the Concern\'s; the Elder walked out west with the ones who would not sign', valence: -8, size: 9, at: 'openfield' } },
    ]),
    interject: [{ companion: ODILE, text: '"Order," Odile says, watching Roux\'s queue. "On the Flats, for once." She does not sound pleased. She sounds like a woman reading a price she wrote herself.', effects: [A(ODILE, 2)] }],
  }),
  guild_scorched: N('The guild holds the lane and the city\'s line goes home at first light, but the store is half ash: whatever Petra\'s people threw over the back wall at midnight took the old timber and half the seed with it before the riders beat it out. What is left goes onto the guild\'s wagons under the Concern\'s stencil. Roux signs contracts on the green. Mason walks out west at noon with the ones who will not sign, and the halls stand empty behind him.', 'The store, half ash, under the guild\'s mark.', toTail('end.gs'), {
    effects: END('guild', 'scorched', 'half', 'exiled', 'The guild took what was left of Openfield\'s store through the Long Night; the Unwritten burned half the seed rather than let it go to Halcyon. The Elder walked out west.', [
      { set: 'ln_band', value: 'mixed' }, ...LEASH, { rep: { faction: 'tollmen', respect: 10 } }, { rep: { faction: 'concern', respect: 10 } }, { rep: { faction: 'choir', respect: -25 } }, { xp: 350 },
      { news: { tag: 'ln_openfield_company', text: 'Openfield is the guild\'s now; half its seed burned rather than go to the Concern', valence: -6, size: 8, at: 'openfield' } },
    ]),
  }),
  guild_burned: N('Not enough. The city\'s line and the guild\'s riders meet at the store in the dark, paper against paper and then rifle against rifle, and the Choir sitting between them. Somebody\'s lamp goes into the timber. The store goes, and the long hall, and the riders fall back down the lane with nothing on their wagons, and the wardens fall back west with nothing in their hands, and in the store\'s doorway, with his back to the fire, as if he could keep it in, is Mason.', 'Mason, in the burning doorway.', [
    { id: 'end.gb.pull', text: '(Go in after him.)', check: { attr: 'brawn', dc: 7 }, effects: [{ set: 'ks_mason', value: 'lives' }, { set: 'ln_mason_burned' }, { xp: 100 }, A(ASH, 3), A(TAMSIN, 3)], next: 'gb_pulled', fail: 'gb_lost', failEffects: [{ set: 'ks_mason', value: 'dead' }] },
    { id: 'end.gb.let', text: '(He chose the door.)', effects: [{ set: 'ks_mason', value: 'dead' }], next: 'gb_lost' },
  ], {
    effects: [{ set: 'ln_band', value: 'thin' }, { set: 'ln_openfield', value: 'burned' }, { set: 'ln_stores', value: 'lost' }, { set: 'ln_guild_beaten' }, { rep: { faction: 'tollmen', respect: -10 } }, { rep: { faction: 'concern', respect: -5 } }, { rep: { faction: 'choir', respect: -25 } }, { xp: 250 },
      { news: { tag: 'ln_openfield_burned', text: 'Openfield burned in the Long Night between the guild\'s riders and the city\'s wardens', valence: -8, size: 9, at: 'openfield' } }],
  }),
  gb_pulled: N('You go in, and come out with him, and lie on the green with his weight on you and the sky going grey over the smoke. Nobody thanks you. The guild\'s wagons are going down the lane empty.', 'Mason, alive, on the green.', toTail('end.gbp'), { effects: [{ decision: { id: 'ln_dawn', text: 'Openfield burned in the Long Night between the guild\'s riders and the city\'s wardens, with the store. I pulled the Elder out of its doorway.' } }] }),
  gb_lost: N('The roof comes in, and the doorway with it, and the man in it. The guild\'s wagons go down the lane empty. Petra stands in the ashes at noon and does not let anyone near her.', 'The doorway, gone.', toTail('end.gbl'), { effects: [{ decision: { id: 'ln_dawn', text: 'Openfield burned in the Long Night between the guild\'s riders and the city\'s wardens, and the Elder with his store.' } }] }),
  // ------------------------------------------------ the city's dawn
  ledger_evicted: N('The order is read at the well, every line, and kept. The guild\'s riders contest it with paper and lose, and are put off the Flats with their wagons by a line of grey that does not raise its voice; the city\'s carts come up the lane and the store is emptied onto them, crate by counted crate, under the Ledger\'s seal, for the Precinct. Nothing burns. Openfield is returned to the schedule. Mason walks out west at noon, alive, with his hat, at the head of whoever is let go.', 'Openfield, returned to the schedule.', route('end.le', [{ if: PREC('yields'), node: 'people_heard' }, { if: PREC('outside'), node: 'people_outside' }, { if: PREC('property'), node: 'people_property' }], 'people_relocated'), {
    effects: END('ledger', 'evicted', 'precinct', 'lives', 'The city\'s order was kept at Openfield through the Long Night: the store went to the Precinct under the Ledger\'s seal, the guild was put off the Flats, and the holding was returned to the schedule without burning.', [
      { set: 'ln_band', value: 'strong' }, ...EVICT_GUILD, { rep: { faction: 'wardens', respect: 20 } }, { rep: { faction: 'tollmen', respect: -15 } }, { rep: { faction: 'concern', respect: -10 } }, { rep: { faction: 'choir', respect: -25 } }, { give: 'tolls', count: 150 }, { xp: 450 },
      { news: { tag: 'ln_openfield_evicted', text: 'the city emptied Openfield in its Long Night, the store to the Precinct, the guild off the Flats, and nothing burned', valence: -4, size: 9, at: 'openfield' } },
    ]),
  }),
  ledger_scorched: N('The order is read and kept. The guild\'s riders contest it and are put off the Flats. Then, at first light, by the order\'s own last line, the wardens clear the holding: they put the rows to the torch so nothing grows here that the schedule did not plant. The halls stand, empty. The store goes west on the city\'s carts under the Ledger\'s seal. Mason watches his fields burn from the lane with his hat in his hands, and then walks west, alive, with whoever is let go.', 'The rows, burning, by the order\'s last line.', route('end.lsc', [{ if: PREC('yields'), node: 'people_heard' }, { if: PREC('outside'), node: 'people_outside' }, { if: PREC('property'), node: 'people_property' }], 'people_relocated'), {
    effects: END('ledger', 'scorched', 'precinct', 'lives', 'The city\'s order was kept at Openfield through the Long Night; the guild was put off the Flats, the store went to the Precinct, and the wardens burned the rows at dawn.', [
      { set: 'ln_band', value: 'mixed' }, ...EVICT_GUILD, { rep: { faction: 'wardens', respect: 15 } }, { rep: { faction: 'tollmen', respect: -10 } }, { rep: { faction: 'choir', respect: -25 } }, { give: 'tolls', count: 150 }, { xp: 400 },
      { news: { tag: 'ln_openfield_cleared', text: 'the city cleared Openfield in its Long Night and burned the rows by order', valence: -6, size: 9, at: 'openfield' } },
    ]),
  }),
  ledger_burned: N('Too thin a line, and too many against it. The order is read at the well and the guild\'s riders and Petra\'s young ones both answer it at once, and in the dark between them the store goes up, and the long hall after it, and the wardens fall back to the west end with the order still in Lowe\'s hand. Openfield burns, exactly as the city\'s forecast wrote it would. In the store\'s doorway, with his back to the fire, is Mason.', 'Mason, in the burning doorway.', [
    { id: 'end.lb.pull', text: '(Go in after him.)', check: { attr: 'brawn', dc: 7 }, effects: [{ set: 'ks_mason', value: 'lives' }, { set: 'ln_mason_burned' }, { xp: 100 }, A(ASH, 3), A(TAMSIN, 5)], next: 'lb_pulled', fail: 'lb_lost', failEffects: [{ set: 'ks_mason', value: 'dead' }] },
    { id: 'end.lb.let', text: '(He chose the door.)', effects: [{ set: 'ks_mason', value: 'dead' }], next: 'lb_lost' },
  ], {
    effects: [{ set: 'ln_band', value: 'thin' }, { set: 'ln_openfield', value: 'burned' }, { set: 'ln_stores', value: 'lost' }, { set: 'ln_forecast_kept' }, { rep: { faction: 'wardens', respect: 5 } }, { rep: { faction: 'choir', respect: -30 } }, { xp: 250 },
      { news: { tag: 'ln_openfield_burned', text: 'Openfield burned in the Long Night, as the city\'s forecast said it would', valence: -8, size: 9, at: 'openfield' } }],
  }),
  lb_pulled: N('You go in, and come out with him, and the wardens at the west end watch you do it and do not move. When Lowe comes to look at the ashes at noon he stands by Mason on the grass for a while and then takes his cap off, which you have never seen him do.', 'Lowe, with his cap off.', route('end.lbp', [{ if: PREC('yields'), node: 'people_heard' }, { if: PREC('outside'), node: 'people_outside' }, { if: PREC('property'), node: 'people_property' }], 'people_relocated'), { effects: [{ decision: { id: 'ln_dawn', text: 'Openfield burned in the Long Night, as the city\'s forecast said it would. I pulled the Elder out of the store\'s doorway.' } }] }),
  lb_lost: N('The roof comes in, and the doorway with it. The forecast is kept, to the letter. Lowe reads the order\'s last line to the ashes at noon, because the schedule says it must be read, and his voice does not change, and his hands do.', 'The order\'s last line, read to the ashes.', route('end.lbl', [{ if: PREC('yields'), node: 'people_heard' }, { if: PREC('outside'), node: 'people_outside' }, { if: PREC('property'), node: 'people_property' }], 'people_relocated'), { effects: [{ decision: { id: 'ln_dawn', text: 'Openfield burned in the Long Night, as the city\'s forecast said it would, and the Elder with his store.' } }] }),
  people_heard: N('And the people, by the precedent in the Court\'s register: every one of them who stood up at the reading and gave a name was entered living and heard. Forty-one of them did, which is forty-one faces the Ledger never had, and they are tenants of the holding now, on the record, under the schedule. The rest walked west with the Elder rather than be seen.', 'Forty-one faces given to the record.', toTail('end.ph'), { effects: [{ set: 'ln_people', value: 'heard' }, { set: 'ln_faces_given' }] }),
  people_outside: N('And the people, by the precedent in the Court\'s register: the city can neither move nor shelter a person the record does not hold. So it did neither. The Choir\'s people sit on the holding they no longer own, with no store and no fields, in the open, and nobody is obliged to help them.', 'The Choir, on land it does not own.', toTail('end.po'), { effects: [{ set: 'ln_people', value: 'outside' }] }),
  people_property: N('And the people, by the precedent in the Court\'s register: unrecorded occupiers of a vacant holding are removed with its contents, as property. They go west on the city\'s carts with the store, counted with the crates, for the Precinct\'s labour lines. The wardens are gentle about it, the way you are gentle with things on an inventory.', 'The Choir, counted with the crates.', toTail('end.pp'), { effects: [{ set: 'ln_people', value: 'removed' }, A(TAMSIN, -10), A(WREN, -10), A(ASH, -10)] }),
  people_relocated: N('And the people, as the record holds: relocated on schedule, to wherever the schedule has room. Some go. Most walk west with the Elder before anybody can read them a destination.', 'The Choir, relocated on schedule.', toTail('end.pr'), { effects: [{ set: 'ln_people', value: 'relocated' }] }),
  // ------------------------------------------------ a truce, and nobody's
  truce_dawn: N('Dawn, and the last third still in the shed, counted by Doria with a guild clerk and a city clerk reading over her shoulder. The guild\'s carts are gone east with their third; the city\'s carts west with theirs. The order on the well has a second paper pinned over it: STAYED AT THE RAIL — ONE SEASON — PERSONS TO BE HEARD. The Choir gets up off the step, stiff and astonished, and goes back to the fields. Nobody thanks you. Each of them, passing, looks at you the way you look at a creditor.', 'Openfield, standing, and every side in your debt.', toTail('end.tr'), {
    effects: END('truce', 'stands', 'split', 'lives', 'I made a truce at Openfield on its Long Night: the store split three ways, the eviction stayed at the rail a season, the people kept their fields. The guild, the city and the Choir all owe me now, and none of them trusts me.', [
      { set: 'ln_band', value: 'truce' }, { set: 'ln_owed' }, { set: 'ln_trust', value: 'none' }, { set: 'ln_eviction_stayed' },
      { rep: { faction: 'choir', respect: -10 } }, { rep: { faction: 'tollmen', respect: -10 } }, { rep: { faction: 'concern', respect: -10 } }, { rep: { faction: 'wardens', respect: -10 } }, { xp: 500 },
      { news: { tag: 'ln_truce_kept', text: 'Openfield came through its Long Night whole: the store split three ways at one stranger\'s table', valence: 6, size: 9, at: 'openfield' } },
    ]),
  }),
  none_dawn: N('It goes as it was written. The riders and the wardens reach the store together in the dark and nobody can say afterwards who threw the first lamp; the store goes up, and the long hall, and the Choir runs at last, all but one. Mason is in the store\'s doorway with his back to the fire when the roof comes in. At first light the city\'s carts come up the lane and take what the fire left, under the Ledger\'s seal, and the guild goes home with its paper, and the order on the well is exactly right.', 'Openfield, burned as it was written.', toTail('end.nd'), {
    effects: END('none', 'burned', 'precinct', 'dead', 'I stood with nobody on Openfield\'s Long Night, and it went as the city\'s forecast wrote it: Openfield burned, the Elder with his store, and what was left went to the Precinct.', [
      { set: 'ln_band', value: 'none' }, { set: 'ln_forecast_kept' }, { rep: { faction: 'choir', respect: -20 } }, { xp: 100 },
      { news: { tag: 'ln_openfield_burned', text: 'Openfield burned in the Long Night, as the city\'s forecast said it would, and a stranger watched', valence: -8, size: 9, at: 'openfield' } },
    ]),
  }),
  // ------------------------------------------------ after: Calla's car, the city's unit, the ones who go
  calla: N('At the Line, at dawn, the warden car the order\'s first name was put into goes west to the city on the seven o\'clock, because nobody took her off it. Sister Calla will be heard by the Court of Accounts, as the docket holds. She will be heard, and then she will be written down, as the forecast said.', 'Calla\'s car, gone west.', tailFrom('calla'), { effects: [{ set: 'ln_calla', value: 'taken' }, { set: 'ks_calla', value: 'imprisoned' }, { quest: 'q_ln_calla', start: true }, { decision: { id: 'ln_calla_taken', text: 'Sister Calla was carried west on the Line to the city in a warden car on the morning after the Long Night, to be heard for sedition.' } }] }),
  nine: N([
    { if: F('nine_stance', 'conscience'), text: 'Nine comes back from the well at first light with its cap in its hand and dust on its grey. "I logged eleven errors in the order," it says. "Aloud. The captain wrote down that I had. The schedule will have to read them." It stands beside you. "I came back. I said I would."' },
    { text: 'Nine comes back from the well at first light, its cap square. "Every line of it made lawful," it says, "that could be. I have logged the ones that could not be softened." It is quiet a moment. "There were fewer than I wished. I came back. I said I would."' },
  ], 'Nine, back from the well.', tailFrom('nine'), { effects: [{ set: 'ln_nine_back' }] }),
  rl_ash: N('Ash finds you on the lane when it is light. He does not raise his voice; he never has. "I said I\'d see it. I saw it." He looks at Openfield, at what the night did to it, and then at you, for a long time, the way he looks at a cairn. "You stood with them. Against this." He puts his hat on. "Go well, friend. Not with me." He walks west into the glass toward the burial ground, and does not look back.', 'Ash, walking west.', tailFrom('rl_ash'), { effects: [{ leave: ASH }, { set: 'ash_gone' }, { set: 'ash_redline', value: 'longnight' }, A(ASH, -50), { decision: { id: 'ash_left', text: 'Brother Ash left me after Openfield\'s Long Night, for standing against the Choir.' } }] }),
  rl_wren: N('Wren is waiting by your gear when you come back up the lane, with her own pack on her shoulder. "I saw it out," she says. "Like I said I would." She pulls her goggles down. "You shook their hands. The ones who sell people on paper. I can\'t walk next to that. I won\'t learn it." She goes east down the lane past the guild\'s wagons without looking at them, and is a long way off before you understand she meant it.', 'Wren, going east.', tailFrom('rl_wren'), { effects: [{ leave: WREN }, { set: 'wren_left', value: 'longnight' }, A(WREN, -40), { decision: { id: 'wren_left_longnight', text: 'Wren left me after Openfield\'s Long Night, for standing with the guild and the Concern.' } }] }),
  rl_kes: N('Kes has not spoken to you since the pledge. She speaks now, once, at the edge of the green, with her hand on the back of her neck. "You handed them the Flats. And everyone on them who signs." She does not cry; she has decided not to. "I said I\'d stay till it was light. It\'s light." She goes north toward the Line, and the Teeth, and the Shift.', 'Kes, going north.', tailFrom('rl_kes'), { effects: [{ leave: KES }, { set: 'kes_left', value: 'longnight' }, { set: 'kes_rom', value: 'ended' }, A(KES, -40), { decision: { id: 'kes_left', text: 'Kes left me after Openfield\'s Long Night, for standing with the Concern.' } }] }),
  rl_odile: N('Odile sits in the middle wagon a long time with the stopped clock in her lap. When she comes out her coat is buttoned to the throat. "I told you my price, my dear," she says. "You heard it. That is a cost." She walks east down the lane toward the bridge where she was born, and does not hurry, and does not look back.', 'Odile, going east.', tailFrom('rl_odile'), { effects: [{ leave: ODILE }, { set: 'odile_gone' }, { set: 'odile_left', value: 'longnight' }, A(ODILE, -40), { decision: { id: 'odile_left_longnight', text: 'Odile left me after Openfield\'s Long Night, because the Grand Factor did not walk out of it alive.' } }] }),
  close: N([
    { if: F('ln_openfield', 'stands'), text: 'Openfield, in the morning, getting up off its step and going back to the rows. The basin will hear of this night all winter, every telling different. Somewhere west, in the city, a schedule is being recomputed.' },
    { if: F('ln_openfield', 'guild'), text: 'Openfield, in the morning, under the guild\'s half-moon and the Concern\'s stencil, its young ones in a queue at a desk on the green. The basin will hear of this night all winter. Somewhere west, in the city, a schedule is being recomputed.' },
    { if: F('ln_openfield', 'evicted'), text: 'Openfield, in the morning, empty, its store under the city\'s seal, its green trodden flat by carts. The basin will hear of this night all winter. In the city, the schedule holds.' },
    { text: 'Openfield, in the morning, and the smoke going up straight into a sky that keeps no books. The basin will hear of this night all winter, every telling different.' },
  ], 'The morning after the Long Night.', [{ id: 'night.close', text: '(It is over.)', exit: true }], {
    effects: [{ set: 'ln_done' }, { set: 'act2_done' }, { set: 'ln_mustered', value: false }, { set: 'ln_riders_fight', value: false }, { set: 'ln_wardens_fight', value: false }],
  }),
};

export const d_ln_night: DialogueDef = {
  id: 'd_ln_night', owner: 'narrator',
  start: [{ if: { all: [F('ln_midnight_fought'), { not: F('ln_small_seen') }] }, node: 'after_fight' }, { node: 'dusk' }],
  nodes: { ...NIGHT_NODES, small: { ...NIGHT_NODES.small, effects: [{ set: 'ln_small_seen' }] } },
};

// ---------------------------------------------------------------- the city's people, the guild's riders

export const d_ln_warden: DialogueDef = {
  id: 'd_ln_warden', owner: 'npc_ln_w1', start: [{ node: 'look' }],
  nodes: { look: { text: [{ if: DONE, text: 'A warden by the well, in grey, very tired. "The holding is returned to the schedule," he says, as if he had been told to say it to anyone who asked.' }, { text: 'A warden of the Precinct in grey with a carbine across his chest, a long way from the city. "Stand clear of the line. The order will be read at the well."' }], again: 'The warden, in grey.', options: [leave] } },
};

export const d_ln_rider: DialogueDef = {
  id: 'd_ln_rider', owner: 'npc_ln_r1', start: [{ node: 'look' }],
  nodes: { look: { text: 'One of the guild\'s riders, the half-moon on his cord, dust to the knee, rifle slung. "Contract business," he says. "Nobody has to get hurt over seed." He does not sound sure.', again: '"Nobody has to get hurt over seed."', options: [leave] } },
};

// ---------------------------------------------------------------- the order's first name, on the Line

const CALLA_FREE = (how: string, text: string, extra: Effect[]): Effect[] => [
  { quest: 'q_ln_calla', start: true }, { set: 'ln_calla', value: 'freed' }, { set: 'ks_calla', value: 'free' }, { set: 'ln_calla_how', value: how }, ...extra,
  A(TAMSIN, 5), A(ASH, 5), A(WREN, 3), A(KES, 3), { rep: { faction: 'choir', respect: 10 } },
  { decision: { id: 'ln_calla_freed', text } },
  { news: { tag: 'ln_calla_freed', text: 'the Choir\'s sister of Shale was taken off the city\'s warden car before it reached the Wall', valence: 6, size: 6, at: 'openfield' } },
];
const CHELA_HERE: Cond = { all: [{ not: { dead: 'npc_rc_02' } }, { not: F('rc_chela', 'off') }, { not: F('rc_chela', 'dead') }] };

export const d_ln_car: DialogueDef = {
  id: 'd_ln_car', owner: 'npc_sh_05', start: [{ node: 'car' }],
  nodes: {
    car: {
      text: [
        { if: F('rc_pilot'), text: 'A warden car on West Halt\'s platform road, its windows plated, its door chained, standing where it has stood since it came in, because the section past West Halt is worked by pilot and no pilotman of West Halt will take it on. Through the slot in its door, Sister Calla, sitting on the bench inside with her hands in her lap. "You came," she says. "You shouldn\'t have. Don\'t get yourself shot for me."' },
        { if: F('rc_box_nospare'), text: 'A warden car on West Halt\'s platform road, waiting on the section\'s token from Four Ways\' box, which has not come and will not come tonight: the box\'s instrument for this section is down, and there is no spare. Through the slot, Sister Calla, on the bench inside. "They say a wire has to say yes," she says. "It keeps saying nothing. I have been praying to it."' },
        { text: 'A warden car on West Halt\'s platform road, its windows plated, its door chained, waiting for the seven o\'clock to take it west. Through the slot in its door, Sister Calla, sitting on the bench inside with her hands in her lap. "You came," she says. "You shouldn\'t have. Don\'t get yourself shot for me."' },
      ],
      again: 'Calla, through the slot.',
      effects: [{ learn: 'ln_car_found' }, { quest: 'q_ln_calla', start: true }],
      interject: [{ companion: TAMSIN, text: 'Tamsin has her fingers through the slot before anybody can stop her. Calla takes them. Neither of them says anything.', effects: [A(TAMSIN, 2)] }],
      options: [
        { id: 'car.pilot', text: '(No pilotman will take the car on. Ask Eamon to walk her out of the halt while the wardens argue with the rule book.)', if: F('rc_pilot'), effects: CALLA_FREE('pilot', 'West Halt\'s pilot rule held the warden car at the platform, and the halt walked Sister Calla out of it while the escort argued with the book.', [{ xp: 150 }, A(NINE, 3)]), next: 'freed_pilot' },
        { id: 'car.chela', text: '(Ask Chela\'s watch to hide her.)', if: { all: [{ any: [F('rc_line', 'halts'), F('rc_line', 'shared')] }, CHELA_HERE] }, check: { skill: 'speech', dc: 40, mods: [{ if: F('rc_hw_trust'), dc: -10, why: 'West Halt trusts you' }] }, effects: CALLA_FREE('watch', 'West Halt\'s watch took Sister Calla out of the warden car and hid her in the halt.', [{ xp: 150 }, A(WREN, 2)]), next: 'freed_watch', fail: 'chela_no' },
        { id: 'car.lift', text: '(The token will not come tonight. Lift her out of the car after dark.)', if: { all: [F('rc_box_nospare'), { hour: { from: 22, to: 5 } }] }, check: { skill: 'stealth', dc: 45, mods: [{ if: { skill: 'security', gte: 40 }, dc: -10, why: 'the car\'s chain is an old city lock' }] }, effects: CALLA_FREE('lifted', 'I lifted Sister Calla out of the warden car at West Halt in the night, while it waited on a token that never came.', [{ xp: 150 }]), next: 'freed_lift', fail: 'lift_no' },
        { id: 'car.fight', text: '(Break the chain and fight the escort for her.)', effects: [{ set: 'ln_escort_fight' }, { set: 'ln_city_warrant' }, { rep: { faction: 'wardens', respect: -20 } }, ...CALLA_FREE('fought', 'I fought the city\'s escort for Sister Calla at the warden car.', [{ xp: 100 }, A(ASH, -5), A(NINE, -5)]), { event: 'combat' }], exit: true },
        { id: 'car.cant', text: 'I can\'t, yet.', next: 'cant' },
        leave,
      ],
    },
    freed_pilot: { text: 'Eamon Fahy tells the escort, very politely, that the rule book says no train moves on this section without a pilotman, and that every pilotman of West Halt is, regrettably, indisposed; and while the wardens read the rule book, two of the halt\'s children open the car\'s back door with the halt\'s own key, and Calla walks down the track south toward Openfield with a basket on her arm, like a woman going to market.', again: 'Calla, walking south.', options: [leave] },
    freed_watch: { text: 'Chela listens, and nods, and at the change of the escort\'s watch the car\'s door is open and Calla is in West Halt\'s water tower, where twelve people hid before her, and by morning she is walking south with the twelve\'s old route in her head.', again: 'The water tower, again.', options: [leave] },
    freed_lift: { text: 'In the dark the car\'s chain is an old city lock and gives with a sigh, and Calla comes out of the door into your arms as light as a bundle of sticks, and you are off the platform road and into the scrub before the escort has finished its cigarette.', again: 'Calla, into the scrub.', options: [leave] },
    chela_no: { text: '"Not for you," Chela says. "Not a city prisoner, with the city looking straight at us. Not yet." She looks at the car. "Ask me when you\'ve got something better than asking."', again: '"Not yet."', options: [leave] },
    lift_no: { text: 'The chain rattles. The escort\'s lamp comes round. You are flat in the ditch by the rails for an hour before it goes back, and the car is still chained.', again: 'The rattling chain.', options: [leave] },
    cant: { text: '"Then don\'t." She smiles, which she has never stopped doing, even here. "Go back to Openfield. Sit with them. That is what I would have been doing."', again: '"Go back to Openfield."', options: [leave] },
  },
};

export const d_ln_escort: DialogueDef = {
  id: 'd_ln_escort', owner: 'npc_ln_e1', start: [{ node: 'look' }],
  nodes: {
    look: {
      text: 'A warden of the Precinct by the car\'s door with the prisoner\'s docket in a case. "The prisoner travels to the city to be heard," she says. "Stand back from the car."',
      again: 'The escort, by the car.',
      options: [
        { id: 'escort.talk', text: 'She has a right to be heard before she is moved. Release her to me.', check: { skill: 'speech', dc: 55, mods: [{ if: PREC('yields'), dc: -10, why: 'the record yields to a living person who stands up' }, { if: { all: [IN(NINE), F('nine_stance', 'conscience')] }, dc: -15, why: 'Nine reads the docket\'s defect to her' }, { if: F('ar_verdict', 'agreed'), dc: -10, why: 'the designate asks' }, { if: { item: 'k_ln_order' }, dc: -5, why: 'you have the order\'s text' }] },
          effects: CALLA_FREE('heard', 'I talked the city\'s escort into releasing Sister Calla into my keeping, to be heard.', [{ xp: 150 }, A(NINE, 3)]), next: 'released', fail: 'no' },
        leave,
      ],
    },
    released: { text: 'She reads the docket again, and you, and writes a line in it, and signs, and unchains the door. "Released to be heard, in the keeping of the bearer," she says. "The record will want her when it wants her." Calla comes down the step and looks at you, and then at the escort, and thanks the escort first.', again: 'The unchained door.', options: [leave] },
    no: { text: '"Noted." She does not move. "Stand back from the car."', again: '"Stand back from the car."', options: [leave] },
  },
};

export const d_ln_carrick: DialogueDef = {
  id: 'd_ln_carrick', owner: 'npc_sh_05', start: [{ node: 'car' }],
  nodes: {
    car: {
      text: 'A warden car at Carrick\'s buffer stop under the freight shed, run straight through from West Halt on the guild\'s green with no stop, its door chained, two wardens beside it waiting for the city\'s van at six. Through the slot, Sister Calla. "All the way to the sea," she says. "I have never seen it. They won\'t let me look."',
      again: 'Calla, through the slot, at the buffer.',
      effects: [{ learn: 'ln_car_found' }, { quest: 'q_ln_calla', start: true }],
      options: [
        { id: 'dk.passenger', text: '(On Carrick\'s quay a person is a passenger, never cargo. Pay her fare at the Harbour court and walk her off. 25 Tolls.)', if: { all: [F('dk_prec_passenger'), TOLLS(25)] }, effects: [{ take: 'tolls', count: 25 }, ...CALLA_FREE('harbour', 'At Carrick, by the Harbour court\'s own ruling that a person landed on the quay is a passenger, I paid Sister Calla\'s fare and walked her off the warden car.', [{ xp: 150 }, A(NINE, 5)])], next: 'freed_fare' },
        { id: 'dk.court', text: '(Put it to the Harbour court at the change of shift: a person on this quay is not the city\'s freight.)', if: { not: F('dk_prec_passenger') }, check: { skill: 'speech', dc: 50, mods: [{ if: { any: [F('dk_crane', 'bond'), F('dk_weighbridge', 'on')] }, dc: -10, why: 'the Harbour Master has ruled for you before' }, { if: PREC('yields'), dc: -5, why: 'the city\'s own court says the record yields to a living person' }] },
          effects: CALLA_FREE('harbour', 'I put Sister Calla\'s case to Carrick\'s Harbour court and the Harbour Master ruled her a passenger, not the city\'s freight.', [{ set: 'dk_prec_passenger' }, { xp: 150 }]), next: 'freed_court', fail: 'court_no' },
        { id: 'dk.cradle', text: '(Get her into Kobby\'s cradle over the dry river in the dark.)', if: { all: [{ not: F('dk_cradle', 'cut') }, { hour: { from: 20, to: 4 } }] }, check: { skill: 'stealth', dc: 40 }, effects: CALLA_FREE('cradle', 'I got Sister Calla off the warden car at Carrick and over the dry river in the cradle at night.', [{ xp: 150 }, A(WREN, 3)]), next: 'freed_cradle', fail: 'cradle_no' },
        { id: 'dk.fight', text: '(Break the chain and fight the escort for her.)', effects: [{ set: 'ln_escort_fight' }, { set: 'ln_city_warrant' }, { rep: { faction: 'wardens', respect: -20 } }, ...CALLA_FREE('fought', 'I fought the city\'s escort for Sister Calla at Carrick\'s buffer.', [{ xp: 100 }, A(ASH, -5), A(NINE, -5)]), { event: 'combat' }], exit: true },
        leave,
      ],
    },
    freed_fare: { text: 'Henrike Dahl reads the Act off her knee on the Customs House steps at six, the way she reads it every morning: a person landed on this quay is a passenger who owes her fare. You pay it. The wardens look at the Act, and at the Harbour Master, and at each other, and unchain the door, because the Ledger enforces the Harbour Act and nothing else here, and the Harbour Act has been read.', again: 'The Act, read on the steps.', options: [leave] },
    freed_court: { text: 'Dahl hears it on the steps at six with the Act on her knee and the wardens standing in front of her. She reads Schedule 2 aloud: no persons. "A person on my quay is a passenger," she says. "Pay her fare, or work it, but she is not freight." The wardens unchain the door. Somebody on the Stand cheers, once, and is hushed.', again: 'Schedule 2, read aloud.', options: [leave] },
    freed_cradle: { text: 'In the dark, past the Bond\'s white lights, to Crane One and the basket on its cable, and Kobby at the winch saying nothing at all. Calla goes out over the dry riverbed among the hulls with her hands on the basket\'s rim and her face turned, at last, toward the sea.', again: 'The cradle, going over.', options: [leave] },
    court_no: { text: '"The Act says cargo, livestock, mails, stores, ballast," Dahl says. "It does not say prisoners, and it does not say persons." She closes it. "Bring me something the Act can read."', again: '"Bring me something the Act can read."', options: [leave] },
    cradle_no: { text: 'The escort\'s lamp swings across the quay as you reach the car, and holds on you. You walk on, as if you had been going somewhere else.', again: 'The lamp, holding on you.', options: [leave] },
  },
};

export const d_ln_calla: DialogueDef = {
  id: 'd_ln_calla', owner: 'npc_sh_05', start: [{ node: 'hello' }],
  nodes: {
    hello: {
      text: [
        { if: DONE, text: 'Calla among the Choir with a basin and a cloth. "You took me off a train," she says. "I have been thinking what to give you for it, and I have decided it is this: I will not tell anyone it was you." She wrings the cloth. "They will know anyway."' },
        { text: 'Calla, back at Openfield, walking among the people at the store with a basin and a cloth as if she had never been away. "You shouldn\'t have," she says. "Thank you."' },
      ],
      again: 'Calla, with the basin.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- the ones who came

/** A word from someone who came to Openfield for its night: said once, then a greeting. */
const ally = (id: string, owner: string, text: string, again: string, interject?: NodeDef['interject']): DialogueDef => ({
  id, owner, start: [{ node: 'word' }],
  nodes: { word: { text, again, ...(interject ? { interject } : {}), options: [bye] } },
});

export const d_ln_chela = ally('d_ln_chela', 'npc_rc_02', 'Chela Ortega at the lane\'s west end with her rifle across her knees and West Halt\'s watch spread along the hedge behind her. "The halts got fed when nobody else would feed us," she says. "Openfield took the twelve and asked nothing. So." She shrugs. "Nobody hurt, if we can help it. That\'s still my rule."', 'Chela, at the hedge.', [{ companion: WREN, text: '"Not raiders," Wren says to you, watching the watch settle along the hedge. "Told you. Raiders don\'t sweep the brass."' }]);
export const d_ln_yaw = ally('d_ln_yaw', 'npc_rc_11', 'Yaw Boateng sits on the store\'s step among the Choir\'s old ones with his hands in his lap, the way they sit. "They walked us here in the night when we were paper," he says. "I can sit in front of a door for them. It\'s not hard. It\'s just long."', 'Yaw, on the step.');
export const d_ln_desmond = ally('d_ln_desmond', 'npc_tm_02', 'Desmond Achebe with his cap lamp off and six of Number Four\'s miners at his back on the green. "No paper past the cage," he says. "Four said it. Four meant it. Here\'s Four." He looks at the guild\'s wagons. "They paid us double for tin for fifteen winters. We know what their paper is worth."', 'Desmond, on the green.', [{ companion: KES, text: 'Kes grips Desmond\'s arm. "You came down off the mountain for farmers," she says. "Obviously you did. Obviously."', effects: [A(KES, 2)] }]);
export const d_ln_maren = ally('d_ln_maren', 'npc_hs_02', 'Maren Okafor herself, off the Line with the Shift\'s committee, coughing into a rag and folding it. "We go up together," she says. "This is up. A store of seed and some people who won\'t be moved off it." She puts her hand flat on the store\'s door, the way she puts it on a table when she has decided. "I know what a lockout looks like."', 'Maren, at the store\'s door.', [{ companion: KES, text: '"You came," Kes says. She cannot say anything else. Maren puts a hand on the back of her neck, over the place, and leaves it there.', effects: [A(KES, 5)] }]);
export const d_ln_rafe = ally('d_ln_rafe', 'npc_hs_03', 'Rafe Ansel behind the lane\'s hedge with the Shift\'s armed, the Lodge\'s powder in their packs. "Maren\'s way is to sit," he says. "Mine isn\'t. I say what I\'ll do and then I do it." He checks a fuse. "If they ride at the old ones, I\'ll do it."', 'Rafe, behind the hedge.');
export const d_ln_vasha = ally('d_ln_vasha', 'npc_rd_02', 'Vasha Kade at the head of her riders, sitting her bike like a judge. "It\'s written," she says, of the store, of the night, of all of it, and smiles. "Somebody holds the pen. Tonight it\'s whoever has the most rifles on the lane."', 'Vasha, on her bike.', [{ companion: ILYA, text: 'Ilya does not speak to her. He looks at her for a long time over the bike\'s bars, and then he walks away, and his hands are steady, and that is the frightening part.', effects: [A(ILYA, -3)] }]);

export const LONGNIGHT_DIALOGUES: DialogueDef[] = [d_ln_chela, d_ln_yaw, d_ln_desmond, d_ln_maren, d_ln_rafe, d_ln_vasha, d_ln_mason, d_ln_petra, d_ln_sarr, d_ln_roux, d_ln_order, d_ln_notice, d_ln_lowe, d_ln_table, d_ln_night, d_ln_warden, d_ln_rider, d_ln_car, d_ln_escort, d_ln_carrick, d_ln_calla];
