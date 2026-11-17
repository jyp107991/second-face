import type { ConclusionDef, LeadDef, WorldEventDef } from '../../engine/world/frontier';
import type { RoadEncounterDef } from '../../engine/world/roads';
import type { Cond, Effect } from '../../engine/world/logic';

/**
 * The Ashlands and the Long Night (B5d): their leads and conclusions, the world events that wait for the player (the kite
 * day at Spindle; the Long Night's call; who comes to Openfield at dusk for each alliance), and the remnant machines met on
 * the glass (the Ashlands' road encounters) with the Long Night's traffic on the Flats' roads. Registered in leads.ts,
 * events.ts and encounters.ts. Story notes: story/B5d_NOTES_SECRET.md.
 */

export const B5D_LEADS: LeadDef[] = [
  // Spindle and Kelso
  { id: 'l_an_four', label: 'Four not ticked', text: 'Four names at the foot of Spindle\'s board, a Kelso run in the spring, never ticked back: MATEI, SUNNIVA, OLU, DRAGOS. The weigher has shut Kelso since.' },
  { id: 'l_an_card', label: 'Held to the door', text: 'The one who came back from Kelso: their guide held a white card the Concern\'s contractor gave him to the hall\'s door. The door did not open. The base\'s three hounds stood up, all at once.' },
  { id: 'l_an_body', label: 'A card in his hand', text: 'On Kelso\'s apron, four pickers a season dead, fallen running toward the gate, and in the first one\'s hand a white Concern card: HALVERSON DEFENCE SERVICES — MAINTENANCE — MARCH.' },
  { id: 'l_an_patrol', label: 'By day, by night', text: 'Kelso\'s three hounds lie in the motor pool\'s shade by day, drinking the sun, and do not get up for feet. By night they walk the whole apron, and nothing crosses it.' },
  { id: 'l_an_order', label: 'A work order', text: 'The contractor\'s work order: RESERVE AUDIT — KENNEL 7 — COMMAND UNIT TO BE RECOVERED INTACT AND RETURNED TO HALCYON. LOSSES OF LOCAL LABOUR TO BE COSTED TO THE CONTRACT.' },
  { id: 'l_an_dormancy', label: 'LT-7 holding', text: 'Kelso\'s last order, the week of the Burn: RESERVE (KENNEL 7) TO DORMANCY. COMMAND UNIT LT-7 TO HOLD RESERVE DORMANT AND AWAIT LAWFUL COMMAND. And every day since: LT-7 HOLDING.' },
  { id: 'l_an_reserve', label: 'Kennel Seven', text: 'From Saddleback ridge: a valley under grey netting, and in it, in rows like a sown field, hundreds of border hounds asleep in their cradles, with kites circling over them.' },
  { id: 'l_an_shunter', label: 'A crown and a gear', text: 'In Kelso\'s engine shed, an army yard engine whose controller bears the army\'s own makers\' mark, a crown over a gear: pre-war, pre-Scald, with no channel in it.' },
  // Pemberton and the kites
  { id: 'l_an_kites', label: 'What moves', text: 'The kites fly on the sun and quarter the glass by day, and stoop at anything that moves. At dusk they go down to Pemberton\'s panels to drink on perches at the rows\' ends.' },
  { id: 'l_an_inverter', label: 'Priority load', text: 'Pemberton\'s inverter feeds the perches first and runs a beacon that calls every kite in the March home at dusk. The kites do not live on the sun; they live on the hut.' },
  { id: 'l_an_kwesi_map', label: 'A month of turns', text: 'Under the weigher\'s grandson\'s cot, a sheet of glass scratched with a month of the kites\' turns over Pemberton, every morning dated: how they fly round, and where they do not look.' },
  { id: 'l_an_scrip', label: 'A white coin', text: 'Wedged into the boy\'s cot frame, a coin that is not a Toll: white metal, the closed eye, a number. Concern scrip, the kind a contractor pays with.' },
  // the Long Night
  { id: 'l_ln_futures', label: 'Shares fall due', text: 'The guild\'s notice on Openfield\'s seed store: shares in the harvest, bought a crate at a time from the Choir\'s children on the lane, all falling due on one night. I. SARR, GRAND FACTOR.' },
  { id: 'l_ln_order', label: 'The order on the well', text: 'The city\'s order on Openfield\'s well: the holding returned to the schedule, every claim on its stores void against the city, the stores to Precinct supply, and a first name to be read: Sister Calla, for sedition.' },
  { id: 'l_ln_vault', label: 'Kept cold', text: 'The Concern backs the guild\'s claim because Halcyon keeps a seed vault under its gardens and wants Openfield\'s seed in it: ninety years of the glass choosing what will grow.' },
  { id: 'l_ln_knife', label: 'The small hours', text: 'Petra Mason means to put a knife in the guild\'s Grand Factor on the lane in the small hours of the Long Night, because the city\'s list names her its Treasurer.' },
];

export const B5D_CONCLUSIONS: ConclusionDef[] = [
  { id: 'c_an_card', from: ['l_an_card', 'l_an_body'], text: 'The four at Kelso were killed by the base doing what it was built to do: the contractor\'s card is a maintenance credential that wakes the patrol to escort its holder. Nobody told the man holding it. Somebody wanted to see what got up.', effects: [{ learn: 'an_card_known' }] },
  { id: 'c_an_reserve', from: ['l_an_dormancy', 'l_an_reserve'], text: 'Kelso\'s hall holds the command for an army: the March\'s border reserve, hundreds of hounds held asleep in the valley past Saddleback for ninety years, waiting for a lawful command.', effects: [{ learn: 'an_reserve_known' }] },
  { id: 'c_an_concern', from: ['l_an_order', 'l_an_reserve'], text: 'The Concern\'s contractor is not after a board. He is sent to bring home the one thing that can wake the reserve in Kennel Seven: its command unit, intact.', effects: [{ learn: 'an_concern_known' }] },
  { id: 'c_an_kwesi', from: ['l_an_kwesi_map', 'l_an_scrip'], text: 'The weigher\'s grandson went to Pemberton because the Concern\'s contractor paid him in scrip to map the kites\' turns: how they guard the valley, and where they do not look.', effects: [{ learn: 'an_kwesi_paid' }] },
  { id: 'c_an_eyes', from: ['l_an_kites', 'l_an_inverter'], text: 'The kites are the reserve\'s eyes, and Pemberton\'s inverter is what keeps them flying. Whoever cuts it blinds the March.', effects: [{ learn: 'an_eyes_known' }] },
  { id: 'c_ln_three', from: ['l_ln_futures', 'l_ln_order', 'l_ln_vault'], text: 'Three claims on one shed, each with its own paper: the guild\'s shares, bought from children; the city\'s order, which says it voids them and cannot; and behind the guild, the Concern, which wants the seed in a vault under a mountain. None of them can take the store without the others standing in the way.', effects: [{ learn: 'ln_claims_known' }] },
];

// ---------------------------------------------------------------- events

const LN = (v: string): Cond => ({ flag: 'ln_alliance', eq: v });
const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const OPEN_NIGHT: Cond = { not: F('ln_done') };

/**
 * Who comes to Openfield at dusk, by alliance: each a world event at the next dusk the player is at Openfield after the
 * pledge. `by` is what they add to (or, for the other side, take from) the night's strength. Each region answers each
 * alliance differently (story/B5d_NOTES_SECRET.md, "Who comes").
 */
interface Muster { id: string; alliances: string[]; cond: Cond; by: number; against?: boolean; news?: string }
const MUSTER: Muster[] = [
  // for the Choir
  { id: 'halts', alliances: ['choir'], cond: { all: [{ any: [F('rc_line', 'halts'), F('rc_line', 'shared')] }, { not: F('rc_chela', 'dead') }, { not: F('rc_chela', 'off') }] }, by: 1, news: 'West Halt\'s watch walked south to Openfield for its Long Night' },
  { id: 'twelve', alliances: ['choir'], cond: F('rc_stock', 'openfield'), by: 1 },
  { id: 'four', alliances: ['choir'], cond: F('tm_shift', 'joined'), by: 1, news: 'miners from Number Four came down to Openfield for its Long Night' },
  { id: 'shift', alliances: ['choir'], cond: { all: [F('hs_shift', 'won'), F('ks_maren', 'lives')] }, by: 1, news: 'the Shift sent a committee from the Skirts to Openfield' },
  { id: 'shift_armed', alliances: ['choir'], cond: F('hs_shift', 'revolt'), by: 1 },
  { id: 'dogs', alliances: ['choir'], cond: F('bw_dogs_hold'), by: 1, news: 'Rust Dogs rode to Openfield and stood across its lane' },
  { id: 'calla', alliances: ['choir'], cond: F('ln_calla', 'freed'), by: 1 },
  { id: 'nine', alliances: ['choir'], cond: F('nine_stance', 'conscience'), by: 1 },
  // for the guild and the Concern
  { id: 'line', alliances: ['guild'], cond: F('rc_line', 'guild'), by: 1 },
  { id: 'paths', alliances: ['guild'], cond: F('rc_concern_paths'), by: 1 },
  { id: 'kennel', alliances: ['guild'], cond: F('nw_controllers', 'guild'), by: 1 },
  { id: 'pack', alliances: ['guild'], cond: F('an_key', 'concern'), by: 2, news: 'a pack of machine hounds walked out of the Ashlands toward Openfield' },
  { id: 'vasha', alliances: ['guild'], cond: { any: [F('vasha_fate', 'spared'), F('vasha_fate', 'spared_why')] }, by: 1 },
  { id: 'fuel', alliances: ['guild'], cond: F('ds_rig', 'guild'), by: 1 },
  // for the city
  { id: 'deputy', alliances: ['ledger'], cond: F('nine_stance', 'deputy'), by: 1 },
  { id: 'designate', alliances: ['ledger'], cond: F('ar_verdict', 'agreed'), by: 1 },
  { id: 'wardens_kennel', alliances: ['ledger'], cond: F('nw_controllers', 'ledger'), by: 1 },
  // against the side the player stands with
  { id: 'kennel', alliances: ['choir', 'ledger'], cond: F('nw_controllers', 'guild'), by: -1, against: true },
  { id: 'pack', alliances: ['choir', 'ledger'], cond: F('an_key', 'concern'), by: -2, against: true },
  { id: 'vasha', alliances: ['choir', 'ledger'], cond: { any: [F('vasha_fate', 'spared'), F('vasha_fate', 'spared_why')] }, by: -1, against: true },
  { id: 'line', alliances: ['choir', 'ledger'], cond: F('rc_line', 'guild'), by: -1, against: true },
  { id: 'deputy', alliances: ['choir'], cond: F('nine_stance', 'deputy'), by: -1, against: true },
  { id: 'conscience', alliances: ['ledger'], cond: F('nine_stance', 'conscience'), by: -1, against: true },
  { id: 'halts', alliances: ['guild', 'ledger'], cond: { any: [F('rc_line', 'halts'), F('rc_line', 'shared')] }, by: -1, against: true },
  { id: 'shift', alliances: ['guild', 'ledger'], cond: F('hs_shift', 'revolt'), by: -1, against: true },
  { id: 'dogs', alliances: ['guild', 'ledger'], cond: F('bw_dogs_hold'), by: -1, against: true },
];

function musterEvent(m: Muster): WorldEventDef {
  const flag = `${m.against ? 'ln_against' : 'ln_came'}_${m.id}`;
  const effects: Effect[] = [{ inc: 'ln_strength', by: m.by }, { set: flag }];
  if (m.news) effects.push({ news: { tag: `ln_m_${m.id}`, text: m.news, valence: 2, size: 5, at: 'openfield' } });
  return { id: `ln_m_${m.against ? 'x_' : ''}${m.id}`, at: { hour: 18, where: 'openfield' }, armedIf: { all: [{ any: m.alliances.map(LN) }, m.cond, OPEN_NIGHT] }, effects };
}

export const B5D_EVENTS: Record<string, WorldEventDef> = {
  /** A Kite Day: the first ten o'clock the player is at Spindle after meeting the weigher, the flag goes up; her grandson is
   * out at Pemberton, and he waits there, pinned, until the player comes or chooses not to. */
  an_kite_day: {
    id: 'an_kite_day', at: { hour: 10, where: 'an_spindle' }, armedIf: { all: [{ knows: 'an_hester_met' }, { not: F('an_kites', 'down') }, { not: F('an_kite') }] },
    effects: [
      { set: 'an_kite_day' }, { quest: 'q_an_kite', start: true },
      { news: { tag: 'an_kite_day', text: 'a kite day at Spindle: the flag up on the tower and the weigher\'s grandson out on the glass', valence: 0, size: 3, at: 'spindle' } },
    ],
  },
  /** The Long Night is called once the Spire's beat is done and Openfield's is behind the player: a letter, and the news on
   * every road. Nothing happens at Openfield until the player is there; the night itself waits for the player's pledge. */
  ln_call: {
    id: 'ln_call', at: { hour: 8 }, armedIf: { all: [{ quest: 'q_a2_spire', status: 'done' }, { quest: 'q_a2_openfield', status: 'done' }, { not: F('ln_called') }] },
    effects: [
      { set: 'ln_called' }, { quest: 'q_a2_longnight', start: true }, { learn: 'loc_openfield' },
      { post: { from: 'Openfield', text: 'The guild has called in every share it bought in our harvest, all on one night, and the city has nailed an order to our well that says the store is the Precinct\'s and the holding returned to its schedule, the same night. Both are here. Both are waiting. We are going to sit in front of the door. My father would not ask you. I am not my father. Come. — the shrine, Openfield' } },
      { news: { tag: 'ln_called', text: 'the guild and the city both mean to have Openfield\'s seed store on the same night; the Choir has sent for its friends', valence: 0, size: 8, at: 'openfield' } },
    ],
  },
  /** Dusk at Openfield after the pledge, whoever comes: the muster is in, and the night can begin. */
  ln_dusk: {
    id: 'ln_dusk', at: { hour: 18, where: 'openfield' }, armedIf: { all: [{ any: [LN('choir'), LN('guild'), LN('ledger')] }, OPEN_NIGHT] },
    effects: [{ set: 'ln_mustered' }],
  },
  ...Object.fromEntries(MUSTER.map((m) => { const e = musterEvent(m); return [e.id, e]; })),
};

// ---------------------------------------------------------------- the glass: remnant machines

export const B5D_ENCOUNTERS: RoadEncounterDef[] = [
  // passing things
  {
    id: 're_an_kite', regions: ['ashlands'], hours: { from: 7, to: 19 }, weight: 4, if: { not: F('an_kites', 'down') },
    text: 'A shadow goes over the glass ahead of you, and another, and you are flat on the crust before you have decided to be, with your face in your arms and the light off the ground coming up through your eyelids. Something turns in the sky above you, slow, patient, quartering. It takes an hour to go away. You are not sure it has.',
    effects: [{ time: 60 }, { learn: 'seen_an_kite' }, { lead: 'l_an_kites' }],
  },
  {
    id: 're_an_kite_down', regions: ['ashlands'], weight: 2, once: true, if: F('an_kites', 'down'),
    text: 'On the glass a mile off the road, a kite where it came down when its light ran out, one wing up like a hand, its lens dull. Pickers have already been at it: its belly plate is off and its board is gone. Somebody has stood a stick in the glass beside it with a rag tied on, the way you mark a grave or a find.',
    effects: [{ learn: 'seen_an_kite_down' }, { xp: 10 }],
  },
  {
    id: 're_an_convoy', regions: ['ashlands'], weight: 2, once: true,
    text: 'Across the glass, at walking pace, a convoy truck: pre-war, armoured, its cab empty, its lamps lit in broad day, driving a loop it was given ninety years ago. Its tyres are long gone; it runs on its rims, grinding a groove into the crust that goes all the way to the horizon and comes back. You stand and watch it go by at fifty yards. It does not know you are there. It does not know anything except the loop.',
    effects: [{ learn: 'seen_an_convoy' }, { xp: 15 }],
  },
  {
    id: 're_an_warden', regions: ['ashlands'], hours: { from: 17, to: 21 }, weight: 2, once: true,
    text: 'At dusk, on the stump of a crossroads where a town was, a warden walker: two-legged, taller than a man, its plates sun-bleached to bone, standing where the junction\'s lights were. As the sun touches the glass it lifts its head and says, in a pleasant woman\'s voice, to nobody, "Curfew is now in effect. Please return to your homes." Then it waits, the way it has waited every dusk for ninety years, for somebody to go home.',
    effects: [{ learn: 'seen_an_warden' }, { xp: 15 }],
  },
  {
    id: 're_an_storm', regions: ['ashlands'], weight: 3,
    text: 'A glass storm: wind off the plateau carrying the crust\'s own dust, fine as flour and sharp as what it is. You get your scarf over your mouth and your back to it and wait it out in the lee of a fused car, an hour, listening to it scour the paint off the world.',
    effects: [{ time: 60 }, { learn: 'seen_an_storm' }],
  },
  {
    id: 're_an_feral', regions: ['ashlands'], weight: 3, if: F('an_feral'),
    text: 'On a ridge to the south, against the sky, a hound: one of Kelso\'s heavy three, or one of the reserve that has walked out of its cradle with nobody to tell it not to. It stands. It watches you the whole length of the ridge. You walk the long way round, and it watches that too.',
    effects: [{ time: 45 }, { learn: 'seen_an_feral' }],
  },
  {
    id: 're_an_orbital', regions: ['ashlands'], weight: 2, once: true,
    text: 'In a crater of its own making, half buried, the burned shell of a thing that fell out of the sky in the years after the Burn: a satellite, or a piece of one, its panels fanned and fused, a plate on its flank in a script you cannot read. Pickers have stripped most of it. In a seam they missed, you find a coil of fine wire and a scorched board.',
    effects: [{ give: 'j_electronics', count: 1 }, { give: 'j_wiring', count: 1 }, { learn: 'seen_an_orbital' }, { xp: 20 }],
  },
  // things that stop you on the glass
  {
    id: 're_an_burned', regions: ['ashlands'], weight: 3, once: true, map: 'an_glass', dialogue: 'd_re_an_burned',
    npcs: [{ def: 'npc_an_w1', spot: 'side', facing: 3 }],
  },
  {
    id: 're_an_hound', regions: ['ashlands'], hours: { from: 16, to: 21 }, weight: 3, once: true, map: 'an_glass', dialogue: 'd_re_an_hound',
    npcs: [],
  },
  {
    id: 're_an_pickers', regions: ['ashlands'], hours: { from: 7, to: 18 }, weight: 3, once: true, map: 'an_glass', dialogue: 'd_re_an_pickers',
    npcs: [{ def: 'npc_an_w2', spot: 'ahead', facing: 3 }],
  },
  // the Long Night's traffic on the Flats' roads
  {
    id: 're_ln_wagons', regions: ['glass_flats', 'rail_corridor'], weight: 3, once: true, if: { all: [F('ln_called'), { not: F('ln_done') }] },
    text: 'Guild wagons on the road, six of them in a line with empty beds, outriders on bikes at front and back, the half-moon on every tailboard and the drivers not talking. They are going to Openfield. One of the outriders looks at you a long time as he passes, the way a man looks at somebody he may see again tonight.',
    effects: [{ learn: 'seen_ln_wagons' }],
  },
  {
    id: 're_ln_column', regions: ['glass_flats', 'rail_corridor', 'meridian'], weight: 3, once: true, if: { all: [F('ln_called'), { not: F('ln_done') }] },
    text: 'A column of wardens on the road east out of the city, in grey, in step, two by two, a captain walking at their head with a case at his hip and his eyes on the ground. They give you the road\'s edge and do not look at you. At the back, a warden car on a flatbed, its windows plated, empty, waiting for somebody.',
    effects: [{ learn: 'seen_ln_column' }],
  },
];
