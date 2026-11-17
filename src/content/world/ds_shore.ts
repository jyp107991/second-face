import type { ConclusionDef, LeadDef, WorldEventDef } from '../../engine/world/frontier';
import type { RoadEncounterDef } from '../../engine/world/roads';

/**
 * The Drowned Shore (B5b): its leads and conclusions, the world events that wait for the player, and the dike road's
 * encounters. Registered in leads.ts, events.ts and encounters.ts. Story notes: story/B5b_NOTES_SECRET.md.
 */

export const DS_LEADS: LeadDef[] = [
  { id: 'l_ds_sheen', label: 'The sheen', text: 'Since the thaw Gull Stilts\' water has a skin on it like a bruise, purple and gold, thickest toward the east. The fish taste of it.' },
  { id: 'l_ds_kai', label: 'Kai Tanoa', text: 'Kai Tanoa, eleven, dove under the Gut by the third pile from the Greta to free his mother\'s net, in black water, and did not come up.' },
  { id: 'l_ds_joint', label: 'Joint fourteen', text: 'The old export line from the Rigs runs along the bottom under the Gut to Blackcap. Its joint fourteen has split and breathes crude. Kai\'s net was caught on its collar.' },
  { id: 'l_ds_blackcap', label: 'Blackcap', text: 'The drowned terminal\'s last tank, full to the brim, with a new guild pump on its rim and the water round it black.' },
  { id: 'l_ds_barge', label: 'The night barge', text: 'A guild barge loads at Blackcap at night with no lamps, three nights in four, and goes up the delta low in the water.' },
  { id: 'l_ds_pressure', label: 'Eleven points', text: 'Hum\'s export pressure has fallen eleven points since the thaw. Hamid Farouk says Hum is tired. His daughter says something is drinking.' },
  { id: 'l_ds_seal', label: 'LINE ACCOUNT', text: 'A fresh lead seal on Hum\'s export valve under the sea: TOLLMEN — LINE ACCOUNT. The guild seals what it means to bill.' },
  { id: 'l_ds_two_tankers', label: 'Two for one', text: 'The tide post\'s day-book: two loads a month off Blackcap entered to the Line\'s fuel book, one tanker a month paid to Hum, and a column headed SHRINKAGE.' },
  { id: 'l_ds_tide_table', label: 'Never wrong yet', text: 'The tide table at Gull Stilts\' Landing is printed by the Precinct, two low waters a day to the minute. Someone has pencilled under it: NEVER WRONG YET.' },
  { id: 'l_ds_brand', label: 'N-B 4471', text: 'Mateo Ibarra\'s wrist carries a Ninebridge block brand, N-B 4471, two years healed. He was sold, not drowned.' },
  { id: 'l_ds_curlew_adrift', label: 'Oars shipped', text: 'Moana Tui found the Curlew adrift off the Jesty with her oars shipped and lashed and Mateo\'s coat folded in the bow. A drowning man does neither.' },
  { id: 'l_ds_finders_fee', label: 'Finder\'s fee', text: 'The guild\'s collections: IBARRA, M. — TAKEN AT THE GUT, NIGHT — GIVEN BY J. SOUSA — FINDER\'S FEE: HIS BOAT. VESSEL SET ADRIFT, COAT ABOARD.' },
  { id: 'l_ds_wrecks', label: 'Five barges', text: 'The Book of Water: five guild barges wrecked on the Jesty since the fish went black, and none in the eleven years before while Lean\'s light burned.' },
  { id: 'l_ds_lamp_cut', label: 'Lean\'s lamp', text: 'Lean\'s light has been dark on five foggy nights since the thaw: its gas line cut clean with a knife each time, and spliced each morning.' },
  { id: 'l_ds_soot', label: 'Soot on the Jesty', text: 'A new iron hook on the Jesty\'s seaward parapet, and a fan of lamp soot above it on the concrete.' },
  { id: 'l_ds_roof_lamp', label: 'A lamp on the roofs', text: 'From the dike at night, in fog, a lamp moving low over the drowned roofs off Gull Stilts, where nobody lives.' },
];

export const DS_CONCLUSIONS: ConclusionDef[] = [
  { id: 'c_ds_kai', from: ['l_ds_kai', 'l_ds_joint'], text: 'Kai Tanoa did not drown of the sea. He drowned freeing his net from a leaking joint on the Rigs\' old export line, in water the oil had blacked so he could not see his hand.', effects: [{ learn: 'ds_kai_line' }] },
  { id: 'c_ds_guild_line', from: ['l_ds_seal', 'l_ds_barge', 'l_ds_pressure'], text: 'The guild opened Hum\'s old line to its tank at Blackcap and loads Hum\'s oil at night for its own account; the line leaks the difference under Gull Stilts, and Hum\'s keeper thinks his platform is dying.', effects: [{ learn: 'ds_guild_line' }] },
  { id: 'c_ds_sold', from: ['l_ds_curlew_adrift', 'l_ds_finders_fee'], text: 'Mateo Ibarra never went in the water. The guild\'s press took him on Nuno Sousa\'s word and paid Nuno with his boat, and set the Curlew adrift so the Book would write him drowned.', effects: [{ learn: 'ds_nuno_sold' }] },
  { id: 'c_ds_false_light', from: ['l_ds_wrecks', 'l_ds_lamp_cut', 'l_ds_soot'], text: 'Somebody on the shore cuts Lean\'s gas line in fog and hangs a false light on the Jesty, and the guild\'s barges steer onto the roof for it. Only guild barges, and only since the fish died.', effects: [{ learn: 'ds_wreckers' }] },
];

export const DS_EVENTS: Record<string, WorldEventDef> = {
  /** Stilt Court: the first nine o'clock the player is in Gull Stilts after meeting the Book's keeper, a man the Book wrote
   * drowned walks in on the Meridian road. He waits at the Landing for as long as it takes. */
  ds_mateo_back: {
    id: 'ds_mateo_back', at: { hour: 9, where: 'ds_stilts' }, armedIf: { flag: 'ds_oona_met' },
    effects: [
      { set: 'ds_mateo_here' }, { quest: 'q_ds_court', start: true },
      { news: { tag: 'ds_mateo_back', text: 'a man the Stilts\' Book wrote drowned two years ago walked into Gull Stilts on the city road', valence: 0, size: 4, at: 'hamlet_shore' } },
    ],
  },
  /** False Light: given to the guild, the dive master gives herself up so nobody asks about her girl, and is hanged from the
   * tide post at the next dawn the player is in the village. */
  ds_coker_hangs: {
    id: 'ds_coker_hangs', at: { hour: 6, where: 'ds_stilts' }, armedIf: { flag: 'ds_light', eq: 'exposed' },
    effects: [
      { set: 'ds_coker_dead' },
      { decision: { id: 'ds_coker_dead', text: 'The guild hanged Yewande Coker from the tide post at dawn for the false light. Her girl was not asked about.' } },
      { news: { tag: 'ds_coker_hanged', text: 'the guild hanged Gull Stilts\' dive master from its tide post for wrecking its barges', valence: -8, size: 7, at: 'hamlet_shore' } },
    ],
  },
  /** False Light, framed: the guild hangs Lean's lamp-keeper at the next dawn the player is in the village. */
  ds_ewan_hangs: {
    id: 'ds_ewan_hangs', at: { hour: 6, where: 'ds_stilts' }, armedIf: { flag: 'ds_light', eq: 'framed' },
    effects: [
      { set: 'ds_ewan_dead' },
      { decision: { id: 'ds_ewan_dead', text: 'The guild hanged Ewan Tulloch, Lean\'s lamp-keeper, from the tide post at dawn for wrecks he did not cause.' } },
      { news: { tag: 'ds_ewan_hanged', text: 'the guild hanged the Rigs\' old lamp-keeper from its tide post at Gull Stilts', valence: -3, size: 5, at: 'rigs' } },
    ],
  },
  /** Hum's line shut or sleeved: the sheen thins and the next dawn the player is in the village the nets come up clean. */
  ds_fish_back: {
    id: 'ds_fish_back', at: { hour: 5, where: 'ds_stilts' }, armedIf: { any: [{ flag: 'ds_valve', eq: 'shut' }, { flag: 'ds_valve', eq: 'sleeved' }] },
    effects: [
      { set: 'ds_fish_back' },
      { news: { tag: 'ds_fish_back', text: 'the mackerel came into Gull Stilts\' nets clean for the first time since the thaw', valence: 4, size: 4, at: 'hamlet_shore' } },
    ],
  },
  /** The barge burned at Blackcap: the factor leaves the shore at the next dawn the player is in the village, and takes the
   * tide post with him. */
  ds_thorne_flees: {
    id: 'ds_thorne_flees', at: { hour: 6, where: 'ds_stilts' }, armedIf: { flag: 'ds_barge', eq: 'burned' },
    effects: [
      { set: 'ds_thorne', value: 'fled' }, { set: 'ds_post', value: 'gone' },
      { decision: { id: 'ds_thorne_fled', text: 'After the night barge burned, Factor Thorne cast off the tide post and left the shore.' } },
      { news: { tag: 'ds_post_gone', text: 'the guild\'s tide post cast off from Gull Stilts in the night; its factor has gone up the delta', valence: 0, size: 6, at: 'hamlet_shore' } },
    ],
  },
};

export const DS_ENCOUNTERS: RoadEncounterDef[] = [
  // --- passing things
  {
    id: 're_ds_fog', regions: ['drowned_shore'], weight: 3,
    text: 'A sea fog comes in over the delta in the space of a breath, and the dike road becomes a yard of wet asphalt in a white room. You walk by the sound of the sea on your right hand, and twice the sound is somewhere it should not be. An hour later it lifts all at once, and you are where you meant to be, which surprises you.',
    effects: [{ time: 60 }, { learn: 'seen_sea_fog' }],
  },
  {
    id: 're_ds_tide', regions: ['drowned_shore'], terrain: ['marsh'], weight: 2,
    text: 'The tide comes up over a low stretch of the old road faster than you can walk it, and for an hour you wade waist-deep along the line of posts with your pack on your head and the water pulling at your knees, toward the next rise.',
    effects: [{ time: 90 }, { learn: 'seen_delta_tide' }],
  },
  {
    id: 're_ds_tideline', regions: ['drowned_shore'], weight: 2, once: true,
    text: 'The tide line along the dike is a mile of plastic: bottle caps, the heads of toys, combs, a thousand coloured shards the sea has rounded like pebbles, ninety years old and as bright as the day they were made. A child\'s shoe with a light in its heel that has not lit since the Burn. Gulls walk on it as if it were a beach.',
    effects: [{ learn: 'seen_tideline' }, { xp: 10 }],
  },
  {
    id: 're_ds_roof_lamp', regions: ['drowned_shore'], hours: { from: 21, to: 5 }, weight: 6, once: true,
    if: { all: [{ quest: 'q_ds_light' }, { not: { flag: 'ds_light' } }] },
    text: 'From the dike, across the bay in the fog, a light moves low over the water toward the drowned roofs off Gull Stilts: a lamp, carried in a boat, steady, rowed by someone who knows the way. It stops on the tallest roof and stays there. Out to the west, where Lean\'s light should be, there is nothing.',
    effects: [{ lead: 'l_ds_roof_lamp' }, { learn: 'ds_roof_lamp_seen' }],
  },
  // --- things that stop you on the dike
  {
    id: 're_ds_eelers', regions: ['drowned_shore'], weight: 3, once: true, map: 'ds_wade', dialogue: 'd_re_ds_eelers',
    npcs: [{ def: 'npc_ds_w_eeler', spot: 'fire', facing: 3 }],
  },
  {
    id: 're_ds_press', regions: ['drowned_shore'], weight: 4, once: true, map: 'ds_wade', dialogue: 'd_re_ds_press',
    if: { any: [{ knows: 'seen_stilts' }, { flag: 'visited_hamlet_shore' }] },
    npcs: [{ def: 'npc_ds_w_press_a', spot: 'ahead', facing: 3 }, { def: 'npc_ds_w_press_b', spot: 'ahead2', facing: 3 }, { def: 'npc_ds_w_boy', spot: 'side', facing: 3 }],
  },
];
