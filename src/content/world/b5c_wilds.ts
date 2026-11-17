import type { ConclusionDef, LeadDef, WorldEventDef } from '../../engine/world/frontier';
import type { RoadEncounterDef } from '../../engine/world/roads';

/**
 * The Teeth mines and the Northern Wet (B5c): their leads and conclusions, the world events that wait for the player, and
 * the mountain trails' and the river roads' encounters. Registered in leads.ts, events.ts and encounters.ts. Story notes:
 * story/B5c_NOTES_SECRET.md.
 */

export const B5C_LEADS: LeadDef[] = [
  // Number Four
  { id: 'l_tm_taken', label: 'Taken on the path', text: 'Three names chalked under a line on Number Four\'s lamp board this year: runaways from the Skirts taken by the Clean at the switchback below the col, before they reached the pit.' },
  { id: 'l_tm_cut', label: 'Nothing to track', text: 'Four\'s cutter took the Concern\'s chrome out of all three of the taken, weeks before. Nothing in them could have told the Clean where they were.' },
  { id: 'l_tm_waiting', label: 'Told the hour', text: 'The Clean were at the switchback on the col at dawn before the last taking, waiting, with no lamp: men who had been told the hour.' },
  { id: 'l_tm_radio', label: 'VISITORS', text: 'The winding house\'s old field set, and its log in the winchwoman\'s hand: FOUR — CLEAR — SNOW ON THE COL every dawn, and on three nights this year, the nights before the takings, VISITORS.' },
  { id: 'l_tm_price', label: 'Double for tin', text: 'The guild\'s buyer at East Halt pays twelve a bar for Number Four\'s tin. Ninebridge pays six. Nobody pays double for tin.' },
  { id: 'l_tm_requests', label: 'The requests card', text: 'A Concern card in the winchwoman\'s locker: a name a season for fifteen winters, a letter or two after each name, and this season\'s line a woman\'s name. FOUR — ARRANGEMENT — RENEWED.' },
  { id: 'l_tm_yield', label: 'The Weighhouse\'s letters', text: 'The letters after the names on the card are the Weighhouse\'s yield grades: kidney, liver, cornea, heart. Four\'s cutter wrote them herself for nine years.' },
  { id: 'l_tm_digger', label: 'The digger', text: 'In the old level under Number Four, a pre-war mining machine with the Concern\'s closed eye on it lies where it stopped, and its lamp has started blinking since the water went off it.' },
  // Ashby Dam
  { id: 'l_nw_short', label: 'Eleven seasons short', text: 'The city\'s notice: Ashby has delivered short of its schedule for eleven seasons, and an inspector is coming up the river to read the gauge.' },
  { id: 'l_nw_gauge', label: 'The sixth mark', text: 'The staff gauge painted on Ashby\'s upstream face shows the Water at the sixth mark of ten. The controller in the gatehouse reads it full.' },
  { id: 'l_nw_jam', label: 'A block in the well', text: 'In the gauge-well hut on Ashby\'s crest, the float that tells the controller how full the Water is has been wedged at the top of its well with an oak block, old and black with handling.' },
  { id: 'l_nw_crack', label: 'The pins', text: 'In the gallery inside the dam, a crack runs down the west wall, pinned and chalked with sixty years of dates. It has opened a finger\'s width in that time, a little more every wet season.' },
  { id: 'l_nw_keepers_log', label: 'Never above the sixth', text: 'The keepers\' own log, Year 60, in Hedda Wexford\'s grandmother\'s hand: NEVER ABOVE THE SIXTH MARK. SHE WILL NOT HOLD IT.' },
  { id: 'l_nw_clause31', label: 'Shortfall from the Sink', text: 'The footnote on Ashby\'s schedule card: SPRING RELIEF TO PRECINCT SUPPLY (CL. 31, GROWTH) — SHORTFALL MET FROM SINK RELIEF. When Ashby comes in short, the city takes the Sink\'s pumps.' },
  { id: 'l_nw_warranty', label: 'The lessor warrants the works', text: 'Ashby\'s lease, framed in the gatehouse: the Water is the city\'s for a hundred and fifty years, and in its eleventh clause the Ashby trust, whose heirs are a house of the Crown, warrants the works for the term.' },
  // Sawtown
  { id: 'l_nw_marks', label: 'Marks cut over', text: 'In Sawtown\'s north pen: the Ridge\'s crow\'s feet shaved off logs\' butts and the Bottoms\' hook cut over the place with a scribe. The boom paid the Bottoms for them.' },
  { id: 'l_nw_punt', label: 'A lamp at the north pen', text: 'At night a punt with a shuttered lamp goes out to the north pen and a girl in it cuts marks: Sigrun Brandvold, the Ridge foreman\'s own daughter.' },
  { id: 'l_nw_tally', label: 'Half again', text: 'The boom\'s tally: the Bottoms have been paid this season for half again what four saws on the flats can fell.' },
  { id: 'l_nw_baby', label: 'A woman\'s board', text: 'Rufino Huaman of the Bottoms pays Dorit at the cookhouse for a woman\'s board: his daughter Wayra, and her baby, whom the Ridge will not look at.' },
  { id: 'l_nw_stump', label: 'A barber chair', text: 'The stump where Mikkel Brandvold died: cut from the Ridge\'s own side, the back-cut too low, the trunk split up the middle as it went. A tree felled in a hurry, in the wet, by somebody told to fell it.' },
  { id: 'l_nw_order', label: 'Up in the rain', text: 'Arvid Brandvold sent his son up to fell the big leaner on the boundary in the rain, the morning before the Bottoms meant to cut it, so the Ridge would have it first.' },
  // Low Landing
  { id: 'l_nw_crates', label: 'KENNEL', text: 'The Patience\'s sealed cases: boards potted in black resin with the Concern\'s closed eye, each in straw, each tagged KENNEL and a number, each with a socket shaped for something\'s neck.' },
  { id: 'l_nw_kennel', label: 'Dogs\' brains', text: 'The reed people of the river know a kennel board when they see one: a controller for a hound, a machine dog. Somebody means to wake dogs in the city.' },
];

export const B5C_CONCLUSIONS: ConclusionDef[] = [
  { id: 'c_tm_told', from: ['l_tm_cut', 'l_tm_waiting'], text: 'Nothing in the taken could have told the Clean where they were, and the Clean knew the hour. Somebody at Number Four tells them who is coming over the col.', effects: [{ learn: 'tm_told_known' }] },
  { id: 'c_tm_radio', from: ['l_tm_taken', 'l_tm_radio'], text: 'The nights before the takings are the nights the winding house\'s set said VISITORS. It is the boss\'s own set.', effects: [{ learn: 'tm_radio_known' }, { learn: 'tm_told_known' }] },
  { id: 'c_tm_arrangement', from: ['l_tm_price', 'l_tm_requests'], text: 'The free pit is free by arrangement: the Concern pays double for its tin through the guild, and takes a name a season off its path.', effects: [{ learn: 'tm_arrangement_known' }, { learn: 'tm_told_known' }] },
  { id: 'c_tm_parts', from: ['l_tm_requests', 'l_tm_yield'], text: 'The people the Concern asks Number Four for are graded by what is in them. They do not go back to the Window. They go up to the Clinic floors.', effects: [{ learn: 'tm_parts_known' }] },
  { id: 'c_nw_lie', from: ['l_nw_gauge', 'l_nw_jam'], text: 'Ashby has never been full. Its keepers have wedged the gauge so the city\'s controller reads a lake that is not there.', effects: [{ learn: 'nw_lie_known' }] },
  { id: 'c_nw_why', from: ['l_nw_crack', 'l_nw_keepers_log'], text: 'The keepers hold the Water at the sixth mark because the dam is cracked and would not hold it higher. Above the sixth mark it fails, and everything down the river with it.', effects: [{ learn: 'nw_why_known' }] },
  { id: 'c_nw_sink', from: ['l_nw_short', 'l_nw_clause31'], text: 'Every spring Ashby comes in short of a schedule written for a full lake, and every spring the city makes the shortfall good with the Sink\'s pumps. The keepers\' lie is one reason the Sink drowns.', effects: [{ learn: 'nw_sink_link' }] },
  { id: 'c_nw_marker', from: ['l_nw_marks', 'l_nw_punt'], text: 'The mark-cutter at Sawtown\'s boom is Sigrun Brandvold: she cuts her own family\'s marks off their logs and puts the Bottoms\' hook on them.', effects: [{ learn: 'nw_marker_known' }] },
  { id: 'c_nw_why_marks', from: ['l_nw_tally', 'l_nw_baby'], text: 'The money from the Ridge\'s re-marked logs goes to the Bottoms, and Rufino Huaman gives it to his daughter and Mikkel Brandvold\'s child, whom the Ridge will not own.', effects: [{ learn: 'nw_why_marks' }] },
  { id: 'c_nw_widowmaker', from: ['l_nw_stump', 'l_nw_order'], text: 'Nobody on the Bottoms dropped anything on Mikkel Brandvold. His father sent him up to fell a leaner in the rain, and the tree split and came back on him.', effects: [{ learn: 'nw_fault_known' }] },
  { id: 'c_nw_kennel', from: ['l_nw_crates', 'l_nw_kennel'], text: 'The Patience\'s load is twelve hound controllers from the Concern, consigned to the guild\'s floor at the city\'s Docks.', effects: [{ learn: 'nw_kennel_known' }] },
];

export const B5C_EVENTS: Record<string, WorldEventDef> = {
  /** Marks at the Boom: the cutter given to the boom-keeper without the why is put on the Water at the next dawn the player
   * is in Sawtown. */
  nw_sigrun_on_water: {
    id: 'nw_sigrun_on_water', at: { hour: 6, where: 'nw_sawtown' }, armedIf: { flag: 'nw_feud', eq: 'caught' },
    effects: [
      { set: 'nw_sigrun_gone' },
      { decision: { id: 'nw_sigrun_gone', text: 'Sawtown put Sigrun Brandvold on the Water at dawn, with one oar, for cutting marks. Her father watched from the shore and did not call to her.' } },
      { news: { tag: 'nw_sigrun_gone', text: 'Sawtown put the Ridge foreman\'s daughter on the Water for cutting marks at the boom', valence: -1, size: 4, at: 'sawtown' } },
    ],
  },
  /** Marks at the Boom, Cillian's way: the Bottoms' skid camp burns at the next two o'clock the player is in Sawtown. */
  nw_bottoms_burn: {
    id: 'nw_bottoms_burn', at: { hour: 2, where: 'nw_sawtown' }, armedIf: { flag: 'nw_feud', eq: 'burned' },
    effects: [
      { set: 'nw_bottoms_gone' },
      { decision: { id: 'nw_bottoms_burned', text: 'The Bottoms\' skid camp burned at two in the morning. They took the next barge down the river, all of them, Wayra Huaman and her baby with them.' } },
      { news: { tag: 'nw_bottoms_burned', text: 'the Bottoms\' camp at Sawtown burned in the night and the crew went down the river', valence: -6, size: 5, at: 'sawtown' } },
    ],
  },
  /** A Load for the City: the load put in the river and nobody paid; the guild takes the Patience for her mooring at the next
   * dawn the player is at Low Landing, unless the mooring has been paid. */
  nw_patience_seized: {
    id: 'nw_patience_seized', at: { hour: 6, where: 'nw_landing' }, armedIf: { flag: 'nw_run', eq: 'river' }, preventedIf: { flag: 'nw_patience', eq: 'kept' },
    effects: [
      { set: 'nw_patience', value: 'seized' },
      { decision: { id: 'nw_patience_seized', text: 'The guild took the Patience for Magda Kowal\'s mooring at dawn and put its green on her bow.' } },
      { news: { tag: 'nw_patience_seized', text: 'the guild seized the Patience at Low Landing for her mooring', valence: -2, size: 3, at: 'low_landing' } },
    ],
  },
};

export const B5C_ENCOUNTERS: RoadEncounterDef[] = [
  // --- the Teeth: passing things
  {
    id: 're_tm_snow', regions: ['teeth'], terrain: ['mountain', 'track'], weight: 3,
    text: 'Snow comes down off the Teeth between one step and the next, sideways, so thick the pines go grey and then go. You walk with your hand on the rock face and count your steps, and an hour later it stops as if somebody had turned it off, and the whole mountain is white and ticking.',
    effects: [{ time: 60 }, { learn: 'seen_teeth_snow' }],
  },
  {
    id: 're_tm_cairn', regions: ['teeth'], weight: 2, once: true,
    text: 'A cairn beside the path where it crosses a scree, knee-high, and on its top stone a brass lamp tag with a number stamped in it and a name scratched under the number. Somebody came over from the Skirts and did not get further than this. Somebody else stopped to pile the stones.',
    effects: [{ learn: 'seen_tm_cairn' }, { xp: 15 }],
  },
  {
    id: 're_tm_hare', regions: ['teeth'], hours: { from: 5, to: 9 }, weight: 2,
    text: 'A snow hare in a dead man\'s wire on the edge of the pines, the snare rusted to its stake and the hare fresh in it. Whoever set the line has not been back for a long time. You take the hare, and reset the wire, because somebody should.',
    effects: [{ give: 'c_meat', count: 1 }, { time: 20 }],
  },
  {
    id: 're_tm_clean', regions: ['teeth'], hours: { from: 6, to: 18 }, weight: 2, once: true,
    text: 'Far up the slope, against the snow, four figures in grey moving in a line along a ridge path with the patience of people who are paid by the day: the Clean, walking the Concern\'s side of the mountain. They do not look down. You are fairly sure they know you are there.',
    effects: [{ learn: 'seen_tm_clean' }],
  },
  // --- the Teeth: things that stop you on the trail
  {
    id: 're_tm_trapper', regions: ['teeth'], weight: 3, once: true, map: 'tm_trail', dialogue: 'd_re_tm_trapper',
    npcs: [{ def: 'npc_tm_w1', spot: 'fire', facing: 3 }],
  },
  {
    id: 're_tm_runaway', regions: ['teeth'], hours: { from: 18, to: 6 }, weight: 3, once: true, map: 'tm_trail', dialogue: 'd_re_tm_runaway',
    npcs: [{ def: 'npc_tm_w2', spot: 'side', facing: 3 }],
  },
  // --- the Wet: passing things
  {
    id: 're_nw_rain', regions: ['northern_wet'], weight: 4,
    text: 'The rain, which has been rain, becomes something heavier, a grey wall walking up the valley toward you with a sound like applause. You stand under a pine with your collar up for an hour and watch the path become a stream and the stream become a river and the river go on not caring.',
    effects: [{ time: 60 }, { learn: 'seen_wet_rain' }],
  },
  {
    id: 're_nw_logjam', regions: ['northern_wet'], weight: 2, once: true,
    text: 'Where the river bends hard under a cliff, a jam of logs that got away from Sawtown\'s boom in some flood, piled like straw and silver with age. On the freshest of them, at the top, a butt with a crow\'s foot shaved half off it and a hook cut over the place, still pale.',
    effects: [{ lead: 'l_nw_marks' }, { learn: 'seen_nw_logjam' }, { xp: 10 }],
  },
  {
    id: 're_nw_dredge', regions: ['northern_wet'], weight: 2, once: true,
    text: 'In the reeds of a backwater, a pre-war dredger the size of a house, rusted to the colour of the bank, with its bucket chain still hanging from its boom into the water; and, as you watch, the chain moves, a link, another link, turned by the current through some gear that has never been told to stop. On the bank beside it a heron stands and waits for whatever the buckets bring up.',
    effects: [{ learn: 'seen_nw_dredge' }, { xp: 15 }],
  },
  {
    id: 're_nw_courier', regions: ['northern_wet'], weight: 3, once: true, if: { not: { flag: 'nw_audit' } },
    text: 'A launch on the river with the city\'s grey pennant at its stern, and in it, under an umbrella that is losing, a man in Precinct grey with a leather case chained to his wrist. He calls across the water when he sees you: "Ashby? Is this the way to Ashby?" It is. "They\'re short," he calls, as if you had asked. "Eleven seasons short. There\'s to be an inspection." Then the current has him round the bend.',
    effects: [{ lead: 'l_nw_short' }, { learn: 'nw_courier_seen' }, { set: 'nw_audit' }, { quest: 'q_nw_dam', start: true }, { learn: 'loc_dam' }],
  },
  // --- the Wet: things that stop you on the bank
  {
    id: 're_nw_mule', regions: ['northern_wet'], weight: 3, once: true, map: 'nw_bank', dialogue: 'd_re_nw_mule',
    npcs: [{ def: 'npc_nw_w1', spot: 'ahead', facing: 3 }],
  },
  {
    id: 're_nw_reeds', regions: ['northern_wet'], hours: { from: 20, to: 5 }, weight: 3, once: true, map: 'nw_bank', dialogue: 'd_re_nw_reeds',
    if: { not: { flag: 'nw_reeds_fight' } },
    npcs: [{ def: 'npc_nw_16', id: 'npc_nw_16_bank', spot: 'boat', facing: 0 }, { def: 'npc_nw_g3', spot: 'boat2', facing: 0 }],
  },
];
