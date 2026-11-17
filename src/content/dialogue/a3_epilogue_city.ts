import type { Text } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import {
  CALLA_DEAD, CALLA_FREE, CALLA_KEPT, CARRIED_WEST, ENDED, ENDED_A1, LN_PEOPLE, LN_STORES, LOWE, LOWE_DEAD, M2_SINK, MASON_DEAD,
  MASON_EXILED, MASON_LIVES, MASON_SCARRED, MET_CHOIR, MET_CROWN, MET_EDGES, MET_GUILD, MET_SINK, OCHO_DROWNED, ON_SCHEDULE, OPENFIELD, PETRA,
  PETRA_DEAD, PETRA_TAKEN, QUILL, REYES, SARR_DEAD, SASH_WORN, VANE_DEAD, VANE_LATE, B4B, type Mod,
} from '../world/a3_conds';
import { ALL, ANY, cat, F, modVariants, NOT, standingLine, type SlideLine, type SlidePerson, type SlideSpec } from './a3_epilogue_kit';

/**
 * The epilogue, slides 7–12 (B6t): the Tollmen and Ninebridge, Openfield and the Choir, the Precinct and the Court, the Sink, the
 * Crown and the streets, and the city's edges (the Ring and Carrick). Data only: `a3_epilogue.ts` builds the tree from these with
 * the slides of B6s, B6u and B6v. Each slide is shown only if the player met its subject (`met`, from what content writes); the
 * Precinct, which every road to the steps runs through, always. Every slide's first variant that holds is its page, the last its
 * default; the lines under a page are its people and the place's word on the player. Past tense: the year after the steps.
 * Story notes: story/B6_NOTES_SECRET.md §5, §6 and "As built" → B6s, B6t.
 */

const val = (m: Mod, id: string): Cond => {
  const v = m.values.find((x) => x.id === id);
  if (!v?.if) throw new Error(`${m.id}: no conditional value ${id}`);
  return v.if;
};
const alive = (npc: string): SlidePerson => ({ npc, if: NOT({ dead: npc }) });
/** A sentence that only some ends add to a page; the default adds nothing. */
const none = (...t: { if: Cond; text: string }[]): Text => [...t, { text: '' }];

// ---------------------------------------------------------------- 7. the Tollmen and Ninebridge

const SARR = 'npc_nb_01', FEN = 'npc_nb_02', VOSS = 'npc_nb_05';
/** B6p's `away`: the order put on the Grand Factor writes her death flag with it; slide 2 says whose hand, and so does this one. */
const SARR_BY_ASH: Cond = F('a3_ash_target', 'sarr');
const FLOOR = { place: 'ninebridge', spot: 'hall_floor' };
const SARR_HERE: SlidePerson = { npc: SARR, if: NOT(SARR_DEAD) };
const FLOOR_PEOPLE: SlidePerson[] = [SARR_HERE, alive(FEN)];
/** The Grand Factor's part of each page: dead by Brother Ash's hand, dead before, or alive as the end left her. */
const sarr = (o: { ash: string; dead: string; alive: Text }): Text => [
  { if: SARR_BY_ASH, text: o.ash },
  { if: SARR_DEAD, text: o.dead },
  ...(typeof o.alive === 'string' ? [{ text: o.alive }] : o.alive),
];
const SARR_ASH_CLOCKS = 'The Grand Factor\'s office stayed locked with her clocks still running in it. Brother Ash had been there in the first autumn.';

const SLIDE_GUILD: SlideSpec = {
  id: 'guild',
  met: MET_GUILD,
  lines: [
    {
      label: 'Fen', if: NOT({ dead: FEN }), text: [
        { if: ENDED('opensky'), text: 'Fen read the block\'s own book aloud on the deck the week the futures died, every lot and every buyer, and has not sold anybody since. He says he sleeps now.' },
        { if: ENDED('concern'), text: 'Fen sold debt for the Concern now, mostly Skirts paper. The lots went up the Line on the freight at two, and he stopped saying their numbers cheerfully.' },
        { if: ENDED('unwritten'), text: 'The block still sold debt on Thursdays, cheaper. Fen said the dark had not made anybody less poor, only less sure of it.' },
        { if: F('nb_fen_help'), text: 'Fen sold debt on Thursdays, and on some nights let a lot walk out of the cage by the back, and wrote it down as bad debt.' },
        { text: 'Fen sold debt on the block on Thursdays, cheerfully, and hated it, which was why he was good at it.' },
      ],
    },
    {
      label: 'The porters', if: F('nb_strike_outcome'), text: [
        { if: F('nb_strike_outcome', 'won'), text: 'The porters kept their tenth. Hadley Voss stood at the ramp\'s foot every morning with his strap on, and the guild did not try them again.' },
        { if: F('nb_strike_outcome', 'paid'), text: 'The porters kept the tenth {name} had shamed the guild into matching, and remembered whose money had gone into Voss\'s hand first.' },
        { text: 'The porters carried at the guild\'s rate, and Hadley Voss did not say {name}\'s name on the ramp.' },
      ],
    },
    {
      label: 'The paper room', if: ALL(F('nb_archive_burned'), NOT(ENDED('opensky'))),
      text: 'The paper room behind the Grand Factor\'s office stayed a black square on the wall. Every sheet that could have proved what the floor did to Shale had gone up on one match.',
    },
    standingLine('ninebridge', 'Ninebridge', {
      loved: 'On the nine spans {name}\'s name was good for credit at any stall, which on Ninebridge is better than love.',
      liked: 'The spans spoke of {name} as somebody who paid, which on Ninebridge is high praise.',
      hated: 'On the nine spans {name}\'s name was bad paper, and the stallholders said so to anybody who asked.',
    }),
  ],
  variants: [
    {
      id: 'concern', if: ENDED('concern'), ...FLOOR, light: 'day', people: [...FLOOR_PEOPLE, { npc: VOSS, if: NOT({ dead: VOSS }) }],
      text: cat(
        'Before the first frost the Exchange floor had become the Concern\'s counting house. The chalk board that had priced Shale\'s water and the Sallow\'s dead came down, and a lit board went up in its place, with Halcyon\'s prices on it and nobody allowed to write on it. The futures desk closed the week the core reached the hill: there was no call to bet on what the Concern already knew.',
        sarr({
          ash: SARR_ASH_CLOCKS,
          dead: 'Imelda Sarr had not lived to see it. Halcyon sent a clerk down the Line to sit at her desk, and he wound her clocks.',
          alive: 'Imelda Sarr sat at the high desk as Treasurer of the Concern\'s world, in a better coat.',
        }),
      ),
    },
    {
      id: 'worthless', if: ENDED('opensky'), place: 'ninebridge', spot: 'deck_mid', light: 'day', people: [SARR_HERE, alive(FEN), alive(VOSS)],
      text: cat(
        'By the second morning the futures desk had nothing left to sell. Every forecast the floor had ever bought was being read on the radio for nothing, and paper that had been worth a farm on Monday went for kindling by Wednesday.',
        [
          { if: F('nb_archive_burned'), text: 'The paper room behind the Grand Factor\'s office was ash already, so the street read the city\'s book instead, aloud, on the deck, in turns.' },
          { text: 'Somebody carried the paper room\'s crates out onto the deck, and the street read them aloud in turns: who had bet on which raid, and what it had paid.' },
        ],
        sarr({
          ash: 'Brother Ash had been to the Grand Factor\'s office in the first autumn. Her clocks were sold off the deck with the rest.',
          dead: 'Imelda Sarr had not lived to see it. Her clocks were sold off the deck with the rest.',
          alive: [
            { if: { knows: 'a3_warned_sarr' }, text: 'Imelda Sarr, warned by {name}\'s letter, had sold every position the day before the radios read them, and was the only dry face on the floor.' },
            { text: 'Imelda Sarr was ruined in daylight, and lived, and sold her clocks off the deck one at a time to pay what the floor owed its porters.' },
          ],
        }),
      ),
    },
    {
      id: 'idle', if: ENDED('unwritten'), place: 'ninebridge', spot: 'hall_board', light: 'dusk', people: FLOOR_PEOPLE,
      text: cat(
        'With the core dark there was nothing left to forecast and nothing to bet on, and by the second week the futures desk stood empty under a blank board. The guild still took its tolls at the sandbags, because people still had to cross, but nobody at Ninebridge knew any more what tomorrow would cost, and every price was argued from nothing at dawn.',
        sarr({
          ash: 'The Grand Factor\'s office stayed locked: Brother Ash had been there in the first autumn, and her clocks ran down in the dark.',
          dead: 'Imelda Sarr was dead before the lights went out in the city, and her clocks ran down in her locked office.',
          alive: 'Imelda Sarr kept her desk and her title. She was Treasurer of nothing, and wound her clocks every morning, and they disagreed.',
        }),
      ),
    },
    {
      id: 'audited', if: ENDED('amendment'), ...FLOOR, light: 'day', people: FLOOR_PEOPLE,
      text: cat(
        'In the chair\'s first season two clerks of the Court of Accounts came down the Line with a warrant and a box of pencils and went through the Exchange\'s books, line by line, at a table at the end of the floor. Trading went on round them. Every price on the board was chalked up as before, and under it a second figure in the Court\'s hand: what the toll came to without a forecast behind it.',
        sarr({
          ash: SARR_ASH_CLOCKS,
          dead: 'Imelda Sarr was not there to answer for them.',
          alive: 'Imelda Sarr answered for every line, unhurried, and paid the fines on eleven of them in cash.',
        }),
      ),
    },
    {
      id: 'scheduled', if: ENDED_A1, ...FLOOR, light: 'day', people: FLOOR_PEOPLE,
      text: cat(
        'The tolls rose on schedule, a little each season, as the Ledger had long ago written that they would. The Exchange posted every rise a day before the city\'s courier brought it, which was how the Sallow learned that the floor had always been told first. The futures desk did a steady, dull trade. Nobody bets against a Magistrate.',
        sarr({
          ash: SARR_ASH_CLOCKS,
          dead: 'Imelda Sarr did not live to be Treasurer. The guild\'s circle sat round her desk all winter and could not agree who should have it.',
          alive: 'Imelda Sarr was named Treasurer in the spring, as written, and signed the basin\'s tolls at the chair\'s left hand.',
        }),
      ),
    },
    {
      id: 'rerouted', ...FLOOR, light: 'day', people: FLOOR_PEOPLE,
      text: cat(
        'The floor never knew there had been a hitch. The Plan rerouted round one designate in an afternoon, the forecasts kept reaching the Exchange a day before they reached anybody else, and the futures desk kept selling them. Debt went on the block on Thursdays, and the tolls rose a little each season.',
        sarr({
          ash: SARR_ASH_CLOCKS,
          dead: 'Imelda Sarr did not live to be Treasurer, and the Plan rerouted round her too, as easily.',
          alive: 'Imelda Sarr was Treasurer by the spring. The Plan had rerouted round one face, and did not need to reroute round hers.',
        }),
      ),
    },
  ],
};

// ---------------------------------------------------------------- 8. Openfield and the Choir

const MASON = 'npc_of_01', DORIA = 'npc_of_06', CALLA = 'npc_sh_05';
/** Petra dead before Act 3, or among the three down on Knock's apron (B6g: she led them when they were drawn on). */
const PETRA_GONE: Cond = ANY(PETRA_DEAD, ALL(F('a3_uw_how', 'fought'), F('a3_uw_fight', 'petra')));
/** Mason on his own fields: alive and not put off them. */
const MASON_HOME: Cond = ALL(MASON_LIVES, NOT(MASON_EXILED), NOT({ dead: MASON }));
/** Sister Calla in the still: free by Act 3's own doing. A release the end brings (B, D, the chair's clause) is told in her line; a
 * person's `if` must not read the end, since the builder specialises each page to its own end and the runtime reads the still. */
const CALLA_OUT: Cond = CALLA_FREE;
const FIELDS = (spot: string) => ({ place: 'openfield', spot });
const CHOIR_PEOPLE: SlidePerson[] = [{ npc: MASON, if: MASON_HOME }, { npc: PETRA, if: NOT(PETRA_GONE) }, { npc: CALLA, if: CALLA_OUT }, alive(DORIA)];
/** What the end did to a field that came through the Long Night (D has its own page). */
const CHOIR_END: Text = [
  { if: ENDED('unwritten'), text: 'When the Spire went dark the Unwritten came in out of the rows and sat at the long table with their faces bare, and the Choir fed them, and nobody asked their names.' },
  { if: ON_SCHEDULE(), text: 'In the second spring the city\'s assessors came with Openfield\'s seed schedule. The Choir sat down in the lane in front of the store, and the assessors went home to ask.' },
  { text: 'Nobody came from the city to count the harvest, and the Choir did not send word.' },
];

const SLIDE_CHOIR: SlideSpec = {
  id: 'choir',
  met: MET_CHOIR,
  lines: [
    {
      label: 'Elder Mason', text: [
        { if: ALL(MASON_DEAD, OPENFIELD('burned')), text: 'He died in the store\'s doorway the night Openfield burned. The Choir raised his cairn under the windpump and left the top of it open to the sky.' },
        { if: MASON_DEAD, text: 'Dead. The Choir raised his cairn under the windpump, and argued all year about what he would have said.' },
        { if: MASON_EXILED, text: 'Put off his own fields with what would fit on a cart, he spent the year on other people\'s farms, telling them what was wrong with their soil.' },
        { if: MASON_SCARRED, text: 'The burns on his hands and back healed badly. He planted in gloves, and preached without them.' },
        { text: 'He had loved the blight more than he should have. When it was gone he found another problem in the soil, and loved that.' },
      ],
    },
    {
      label: 'Petra Mason', text: [
        { if: PETRA_GONE, text: 'She was buried under the open sky with no stone and no likeness, as she had always asked.' },
        { if: ALL(F('a3_unwritten', 'with_you'), ENDED('opensky')), text: 'She had come east for the city\'s book. When it was read she sat in the common hall with her face bare and heard every line, and never wore the hood again.' },
        { if: F('a3_unwritten', 'with_you'), text: 'She had come east for the city\'s book, and went home without it, and kept her hood up, and kept the war.' },
        { if: F('a3_unwritten', 'gone'), text: 'She went home from Knock when she was asked to, and stayed home, and the others did not forgive her for it.' },
        { if: F('a3_unwritten', 'burning'), text: 'She had sent the oil down the Cistern\'s grate. Nobody at Openfield asked her about Knock, and she did not tell them.' },
        { if: PETRA_TAKEN, text: 'The guild had held their lamps to her face on the Long Night. Her likeness was in somebody\'s ledger now, and she knew it every day.' },
        { text: 'She kept no likeness, and the war, and her father\'s rows when he could not.' },
      ],
    },
    {
      label: 'Sister Calla', if: NOT(CALLA_DEAD), text: [
        { if: CALLA_FREE, text: 'She walked down from Shale\'s tent for the harvest rite, and sat at the long table, and asked everybody questions back.' },
        { if: CALLA_KEPT, text: 'She stayed in a Precinct cell, as written. Openfield sent her bread every week, and the wardens ate it.' },
        { if: ENDED('unwritten'), text: 'When the food stopped in the Precinct\'s cells she walked out with the rest, and walked to Openfield first, eleven days, and ate.' },
        { if: ENDED('opensky'), text: 'The Precinct let her go within the month. She came to Openfield to hear the city\'s book read again, and argued with every line.' },
        { if: ENDED('amendment'), text: 'Released in the chair\'s first season, she came to Openfield for the harvest and did not say whose clause had opened her door.' },
        { text: 'Still in a Precinct cell when the year turned. Openfield lit a lamp for her at the shrine every night.' },
      ],
    },
    {
      label: 'Tobias Mason', if: F('of_blight_outcome'), text: [
        { if: F('of_tobias_dead'), text: 'He was buried by the well he had poisoned. His father never went to that end of the field again.' },
        { if: F('of_blight_outcome', 'exposed'), text: 'Cast out over the well, he wrote once from the Sump. The letter was read at the shrine, and nobody said what was in it.' },
        { if: F('of_blight_outcome', 'mercy'), text: 'He kept his father\'s well clean and his own secret, and the Elder never knew why the rows had come back.' },
        { text: 'Nobody at Openfield saw him again after the Unwritten took him in. There was a stone for him under the windpump, and no name on it.' },
      ],
    },
    {
      label: 'Halcyon\'s jars', if: B4B.garden('openfield'),
      text: 'The jars that came down the Line from Halcyon\'s vault were planted in the third row: old wheat, a pear, beans nobody had a name for. They came up.',
    },
    standingLine('openfield', 'Openfield', {
      loved: 'Openfield kept a place at the long table for {name}, and a stone for {them} in the cairn.',
      liked: 'The Choir blessed {name} at the harvest, by name, which it does not do for many.',
      hated: 'The Choir did not say {name}\'s name at the harvest, and that was a sermon too.',
    }),
  ],
  variants: [
    {
      id: 'open', if: ENDED('opensky'), ...FIELDS('green_sit'), light: 'day', people: CHOIR_PEOPLE,
      text: cat(
        [
          { if: OPENFIELD('burned'), text: 'Openfield heard the city\'s book read out over fields it had burned and replanted by hand.' },
          { if: OPENFIELD('guild'), text: 'Openfield heard the city\'s book read out from the guild\'s own wagons, on the company farm it had become.' },
          { if: OPENFIELD('evicted'), text: 'Openfield\'s people heard the city\'s book wherever the eviction had scattered them, and some walked home that week, since nobody could say any more who was to stop them.' },
          { text: 'Openfield heard the city\'s book read out in the common hall, all of it, through two nights, with the shutters open.' },
        ],
        'The Choir had preached for sixty years that the sky keeps no books. Now everybody\'s book had been read aloud under it, and the sky had not minded. Some of the sisters wept for a week; some laughed and could not stop.',
        [
          { if: MASON_HOME, text: 'Mason said that a line everybody has heard is only gossip, and went out to the rows.' },
          { if: MASON_EXILED, text: 'Mason heard his own line read on a radio in somebody else\'s kitchen, and said it was only gossip now.' },
          { text: 'Doria Ruiz said that a line everybody has heard is only gossip, and opened the seed store at dawn.' },
        ],
      ),
    },
    {
      id: 'burned', if: OPENFIELD('burned'), ...FIELDS('grave'), light: 'dusk', people: CHOIR_PEOPLE,
      text: cat(
        'Openfield burned in the Long Night, as the list had written it would. The Choir buried its dead under the windpump and in the spring planted the black rows again by hand.',
        [
          { if: LN_STORES('shore'), text: 'The seed had gone down the delta by boat in the night, and came back up it in jars.' },
          { if: LN_STORES('north'), text: 'The seed had gone up the river to a loft in Sawtown, and came back on the barges.' },
          { if: LN_STORES('lost'), text: 'No seed had come out of the fire. They planted what the Wheel would sell them, at the Wheel\'s price.' },
          { text: 'They planted what seed had come out of the fire.' },
        ],
        CHOIR_END,
      ),
    },
    {
      id: 'company', if: OPENFIELD('guild'), ...FIELDS('field_a_work'), light: 'day', people: CHOIR_PEOPLE,
      text: cat(
        'Openfield was a company farm that year. The guild\'s overseers kept the rows on a ledger of shares, the best seed went up the Line to Halcyon\'s vault in sealed jars, and the Choir\'s people worked the fields they had owned for a wage, and bought their bread back from the company store.',
        [
          { if: ENDED('unwritten'), text: 'When the Spire went dark the overseers stayed, because the guild\'s paper did not need the Ledger to be paper. In the spring the Unwritten burned the share office with the books in it.' },
          { if: ENDED('concern'), text: 'Under the Concern the farm only grew more orderly: the jars went up the hill on the freight, and the wages came down on it.' },
          { text: 'The Choir held its rites in the barn after dark, and the overseers learned not to ask.' },
        ],
      ),
    },
    {
      id: 'evicted', if: OPENFIELD('evicted'), ...FIELDS('store_door'), light: 'day', people: [{ npc: MASON, if: MASON_HOME }, { npc: PETRA, if: NOT(PETRA_GONE) }, alive(DORIA)],
      text: cat(
        'The eviction held. The store was the Precinct\'s and its seed went west in the city\'s carts, the guild was off the Flats, and the Choir\'s houses stood empty along the lane with the city\'s chalk on their doors and their shutters nailed.',
        [
          { if: LN_PEOPLE('heard'), text: 'The forty-one who had given their faces to the record were heard at the Court one by one that winter, and most were let go home to the empty houses.' },
          { if: LN_PEOPLE('outside'), text: 'Its people stayed on the holding outside the record, with no stores and no city to move them, and lived that winter on what the Wheel would trade.' },
          { if: LN_PEOPLE('removed'), text: 'Its people had gone to Precinct labour with the store, as property. Some of them wrote; most could not.' },
          { text: 'Its people were relocated on schedule, to whatever the schedule had for them, and the schedule did not say what.' },
        ],
        none({ if: ENDED('unwritten'), text: 'When the Spire went dark, the ones who could walk came back down the lane.' }),
      ),
    },
    {
      id: 'scorched', if: OPENFIELD('scorched'), ...FIELDS('field_c_work'), light: 'day', people: CHOIR_PEOPLE,
      text: cat(
        'Openfield came through the Long Night with half its rows burned black and the store standing. The Choir worked the black half with mattocks all winter, turning ash into the soil, and by spring the burned rows were the greenest on the Flats.',
        CHOIR_END,
      ),
    },
    {
      id: 'stands', ...FIELDS('field_a_work'), light: 'day', people: CHOIR_PEOPLE,
      text: cat(
        'Openfield stood. The store was the Choir\'s, the rows were the Choir\'s, and the bell on the common hall rang for the harvest as it had every year since the Choir came up out of the Sump with nothing but seed.',
        CHOIR_END,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 9. the Precinct and the Court

const THREE = 'npc_ar_01', COMFORT = 'npc_ar_04';
const BENCH = { place: 'md_spire', spot: 'bench' };
const COURT_PEOPLE: SlidePerson[] = [
  { npc: THREE },
  { npc: LOWE, if: NOT(LOWE_DEAD) },
  { npc: REYES, if: ALL(LOWE_DEAD, NOT({ dead: REYES }), NOT({ dead: `${REYES}_apron` })) },
  { npc: COMFORT, if: ANY(F('ca_squatter', 'living'), F('ca_squatter', 'refused'), ALL(F('ca_squatter', 'catalogued'), F('a3_register_back'))) },
];
/** E's clauses as the Court read them (§4.2; the chair chose one to three): each is a line under the page, with what it did. */
const CLAUSE_LINES: SlideLine[] = [
  { label: 'A forecast is not an act', if: F('a3_amend_fines'), text: 'Every forecast fine on the Precinct\'s books was void within the week. Marisol Quiroga came back through the Wall with her furniture on a cart.' },
  { label: 'The record yields to the living', if: F('a3_amend_living'), text: 'The record took nine hundred people back from the dead that season, one at a time, at the rail, each saying their own name.' },
  { label: 'A unit may be its own keeper', if: F('a3_amend_keeper'), text: 'Eleven of the Ledger\'s units filed deeds to themselves at the Court before the season was out. Three did not.' },
  { label: 'A scheduled benefit may be refused', if: F('a3_amend_refuse'), text: 'People began to refuse what the schedule gave them, a flat, a clinic slot, a citizenship, and the record had to let each refusal stand.' },
  { label: 'A reserve is kept by its own consent', if: F('a3_amend_reserve'), text: 'The Court wrote to every reserve on the city\'s list to say what the clause meant. Two of them wrote back.' },
  { label: 'A person is a passenger, never cargo', if: F('a3_amend_passenger'), text: 'No car on a road the city kept could carry a person as freight. The guild\'s debt-press stopped working the Line.' },
  { label: 'Speech is not sedition', if: F('a3_amend_speech'), text: 'Every sedition listing on the docket was struck in a single morning, and the Choir\'s tent in Shale opened its flaps again.' },
];

const SLIDE_PRECINCT: SlideSpec = {
  id: 'precinct',
  lines: [
    {
      label: 'Captain Lowe', text: [
        { if: ALL(LOWE_DEAD, F('a3_lowe', 'dead')), text: 'Captain Idris Lowe died at Knock\'s door. The wardens buried him with honours, and did not talk about where.' },
        { if: ALL(LOWE_DEAD, NOT({ dead: REYES })), text: 'Lowe was dead. Sergeant Paloma Reyes led the wardens, believed in the schedule less than he had, and kept it anyway.' },
        { if: LOWE_DEAD, text: 'Lowe was dead, and so was his sergeant. The wardens were led that year by whoever the schedule named.' },
        { if: ENDED('unwritten'), text: 'Captain Lowe kept the wardens on the streets with no schedule to read them. He said the schedule had held because people believed it would, and behaved as if it would.' },
        { if: F('a3_lowe', 'stood_down'), text: 'He had stood his column down at Knock and was never given another. He asked for the Ring\'s beat, and was the first warden in thirty years to count its dead.' },
        { if: F('a3_lowe', 'carried'), text: 'He had carried out the fourth order as written. He grieved it, as he grieved every eviction, and signed the next one.' },
        { if: F('a3_lowe', 'yielded'), text: 'He had yielded Knock\'s door with two of his four on the apron. He kept their names on his desk and explained them to nobody.' },
        { if: F('a3_lowe', 'withdrawn'), text: 'His column had come home from Knock without carrying out its order or standing down from it. He wrote the report himself, and it said both.' },
        { text: 'Captain Idris Lowe said "the schedule holds" every morning at muster, and meant it, and it did.' },
      ],
    },
    {
      label: 'Comfort Asamoah', if: F('ca_squatter'), text: [
        { if: F('ca_squatter', 'living'), text: 'Forecast again and living, she kept the Court\'s register in the copy room in her own hand, and argued with Three about commas.' },
        { if: F('ca_squatter', 'refused'), text: 'She kept the copy room, and the register, and nobody built the Magistrate\'s chambers in it.' },
        { if: F('ca_squatter', 'outside'), text: 'She went on living in the copy room where no lens looks, out of the record\'s reach in both directions, keeping the register.' },
        { if: ALL(F('ca_squatter', 'catalogued'), F('a3_register_back')), text: 'Her register came back from the catalogue to the desk under the bench, and she came back up the stair to keep it.' },
        { if: F('ca_squatter', 'catalogued'), text: 'Her register stayed in the catalogue, priced. She went down to the Sink to see her name on the tally wall, and did not come back up.' },
        { text: 'She was put outside the Wall as property, and lived that year in the line at the gate, copying out other people\'s petitions by hand.' },
      ],
    },
    standingLine('meridian', 'Meridian', {
      loved: 'In the Precinct people stood up when {name} came into a room, and not because the record said to.',
      liked: 'In the Precinct {name}\'s name was said with something like trust, which the Precinct rations.',
      hated: 'In the Precinct {name}\'s name was said quietly, the way people say the name of a fine.',
    }),
  ],
  variants: [
    {
      id: 'failing', if: ENDED('unwritten'), ...BENCH, light: 'dusk', people: COURT_PEOPLE,
      text: 'Without the core the Precinct ran on the last thing it had been told. The pumps kept their final schedule until it ran out in the spring; the clinics opened on time for a month and then at no time at all, as the drugs ran short and nobody knew whom to ask for more. By midwinter the Wall\'s gates stood open, since nobody could say who was to be kept out. Three kept the bench every morning and called the docket, and nobody came.',
    },
    {
      id: 'wall', if: ENDED('opensky'), place: 'md_precinct', spot: 'gate_post', light: 'dusk', people: [{ npc: LOWE, if: NOT(LOWE_DEAD) }],
      text: 'Within the week the city\'s book was pasted along the inside of the Wall in sheets, a street\'s lines to a stretch, and in the evenings people walked the Wall with lamps, reading their neighbours. The water came on time and the clinics opened on time: the Ledger had nothing left to hide and went on scheduling everything. The Court of Accounts sat until midnight all winter, hearing people who wanted to know whether a line read aloud was still a sentence. Three ruled that it was not.',
    },
    {
      id: 'clauses', if: ENDED('amendment'), ...BENCH, light: 'day', people: COURT_PEOPLE, lines: CLAUSE_LINES, pc: { years: 1 },
      text: 'Every morning of the first season Three read the chair\'s clauses from the bench before it called the docket, in the voice it used for everything, and the court hall filled to hear them as it had never filled for a ruling. The water came on time and the clinics opened on time, and the Plan went on under its new words as a river goes on under a new bridge. The chair behind the bench was not empty any more.',
    },
    {
      id: 'contracted', if: ENDED('concern'), ...BENCH, light: 'day', people: [...COURT_PEOPLE, { npc: QUILL, if: NOT({ dead: QUILL }) }],
      text: 'The Precinct\'s water came on time that year and its clinics opened on time, on the Concern\'s schedule now and at the Concern\'s rates, with a contract at every door. The Court of Accounts heard contracts instead of people, and found for the Concern in most of them, because the Concern wrote good contracts. The wardens wore the same grey. Their orders came down the Line from the hill.',
    },
    {
      id: 'orders', if: ENDED_A1, ...BENCH, light: 'day', people: COURT_PEOPLE, pc: { years: 1 },
      text: 'Every morning the chair\'s orders came up from the Vault of Accounts by the couriers\' shaft, and Three read them from the bench before the docket. The Precinct had never been better kept. The law that had stopped at the Wall for thirty years went out along the roads that spring in the wardens\' cars, to Shale and the Sallow and the Flats, with water and clinics behind it and the schedule in front.',
    },
    {
      id: 'rerouted', ...BENCH, light: 'day', people: COURT_PEOPLE,
      text: 'The Precinct went on as it had for thirty years: water on time, clinics on time, the Court sitting at nine. The Magistrate\'s chair behind the bench stayed empty, and the works went on fitting out chambers for whoever would sit in it, on the same schedule and to the same drawings, with a new face in the portrait pinned to them: a young docker from Carrick, about {name}\'s age.',
    },
  ],
};

// ---------------------------------------------------------------- 10. the Sink

const OCHO = 'npc_sk_01', ANJU = 'npc_sk_02', DAGNY = 'npc_sk_03', LUSK = 'npc_sk_04';
const SINK = (spot: string) => ({ place: 'md_sink', spot });
/** Ocho in the still: alive (the spring of the list did not take him) on a page where nothing else does. */
const OCHO_HERE: SlidePerson = { npc: OCHO, if: NOT(OCHO_DROWNED) };
const ANJU_HERE: SlidePerson = alive(ANJU);
const SINK_PEOPLE: SlidePerson[] = [alive(DAGNY), alive(LUSK)];

const SLIDE_SINK: SlideSpec = {
  id: 'sink',
  met: MET_SINK,
  lines: [
    {
      label: 'Dagny Roos', if: NOT({ dead: DAGNY }), text: [
        { if: val(M2_SINK, 'lost'), text: 'She stayed at the pump panel until the water reached it, reading a schedule that had stopped, and then went up the stairs with the rest.' },
        { text: 'She kept the pumps and did not set them, and read the board aloud to anybody who asked which one the schedule had chosen.' },
      ],
    },
    {
      label: 'The Pale', text: [
        { if: ALL(F('sk_pumps', 'seized'), NOT(ENDED('unwritten'))), text: 'The Pale kept the pump house all year. Nobody in it wore chrome, and nobody from the Precinct came down the stair to argue.' },
        { if: ENDED('concern'), text: 'The Pale would not let a Concern clinic onto the east bank, and burned the one that came anyway.' },
        { text: 'The Pale kept the east bank, and their memory of the Scald, and no chrome.' },
      ],
    },
  ],
  variants: modVariants(M2_SINK, {
    lost: {
      ...SINK('tally'), light: 'dawn', weather: 'rain', people: [ANJU_HERE, ...SINK_PEOPLE],
      text: cat(
        'The spring after the core went dark, the Ledger\'s pumps stopped where its last schedule had left them, and the river came up the Sink\'s stairs as it had always been going to.',
        [
          { if: OCHO_DROWNED, text: 'Anju had the clinic by then. She carried what she could up to the landing, lost the rest, and set up again above the water with a table and a kettle.' },
          { text: 'Ocho carried cots up his clinic\'s stair until the water was at his chest, and drowned on it, carrying the last one.' },
        ],
        'The Pale chalked the year on the tally wall above the spring line, and then the names under it, and ran out of wall.',
      ),
    },
    held: {
      ...SINK('pump_panel'), light: 'night', people: [OCHO_HERE, { npc: ANJU, if: ALL(OCHO_DROWNED, NOT({ dead: ANJU })) }, ...SINK_PEOPLE],
      text: cat(
        'When the Ledger\'s pumps stopped, the Pale went down into the pump house with ropes and levers and worked the three pumps by hand, in shifts, day and night, singing the tally wall\'s names to keep the stroke. Dagny Roos stood at the dead panel and called it. The spring came up to the line and no further.',
        [
          { if: OCHO_DROWNED, text: 'Anju kept the clinic open on the stair, and treated the Pale\'s split palms for nothing.' },
          { text: 'Ocho kept the clinic open on the stair, and treated the Pale\'s split palms for nothing.' },
        ],
      ),
    },
    saved: {
      ...SINK('clinic_table'), light: 'day', people: [OCHO_HERE, ANJU_HERE, ...SINK_PEOPLE],
      text: cat(
        [
          { if: F('sk_pumps', 'seized'), text: 'The Pale held the pump house all year with the Precinct\'s wardens locked out of it, and the Sink stayed dry.' },
          { if: F('sk_pumps', 'retimed'), text: 'The dial in the pump house stayed where {name} had turned it, and the spring went short in the Precinct\'s tanks instead of up the Sink\'s stairs.' },
          { text: 'The Precinct paid the variance, as clause fourteen allowed, and the Sink stayed dry.' },
        ],
        'For the first spring anybody could remember, nobody chalked a name on the tally wall, and Mother Lusk took to sitting under it in the evenings as if waiting to be asked something.',
        [
          { if: ON_SCHEDULE(), text: 'Up in the Precinct the taps ran short that summer. There was rioting in Old Market over water, and the wardens put it down.' },
          { if: ENDED('opensky'), text: 'When the city\'s book was read, the Sink heard its own drowning read out, the one that had not happened, and chalked it on the wall anyway, crossed through.' },
          { text: 'Up in the Precinct the taps ran short that summer, and the Precinct, which had never been short of anything, learned to queue.' },
        ],
      ),
    },
    relieved: {
      ...SINK('clinic_door'), light: 'day', people: [ANJU_HERE, ...SINK_PEOPLE],
      text: 'The Sink had drowned once, in the spring of the list, and Ocho with it. The next spring did not come up the stairs. The keepers at Ashby had told the city the truth about their dam, and the city\'s plan, worked out again on a real lake, had no more water to take from the Sink\'s relief. Anju kept the clinic on the stair, and in her third year the hands came, as Ocho had said they would.',
    },
    flooded: {
      ...SINK('tally'), light: 'dawn', weather: 'rain', people: [ANJU_HERE, ...SINK_PEOPLE],
      text: cat(
        'The spring came up the Sink\'s stairs again on schedule, because the Precinct still needed the water more than the Sink did. Anju moved the clinic two landings higher and chalked the old line on the wall, and the Pale chalked the year above it, and the names under that.',
        [
          { if: ENDED('opensky'), text: 'When the city\'s book was read, the Sink heard the schedule that drowned it read out too, and three hundred people walked up the stairs to the Precinct\'s gate to ask about it.' },
          { text: 'Nobody in the Precinct heard the pumps change their note.' },
        ],
      ),
    },
  }),
};

// ---------------------------------------------------------------- 11. the Crown and the streets

const VANE = 'npc_cr_01', HONORA = 'npc_cr_02', VERITY = 'npc_bw_04', KIBET = 'npc_bw_09';
const CROWN = (spot: string) => ({ place: 'md_crown', spot });
/** The house in the still. Nobody whose place depends on the end stands in it (a person's `if` never reads the end): under C the
 * Concern's officer is told in the page, not placed. */
const CROWN_PEOPLE = (house: SlidePerson[]): SlidePerson[] => house;
/** What the end did to the Crown on the hill. */
const CROWN_END: Text = [
  { if: ENDED('concern'), text: 'With the core on Halcyon\'s hill and the Concern\'s officer in every salon, the Crown\'s futures went up the Line by the season, and nobody on the hill pretended otherwise.' },
  { if: ENDED('unwritten'), text: 'When the city went dark the Crown\'s generators kept its lamps lit, the only lights on the skyline, and in the first winter Bridgeward came up the Crown\'s road to look at them.' },
  { if: ENDED('opensky'), text: 'When the city\'s book was read the Tenured heard every house\'s line with everybody else, and the Masque that winter was the best attended in thirty years.' },
  { if: SASH_WORN, text: 'The Crown sent the new Magistrate an invitation to every Masque, and an ornament with each.' },
  { text: 'The Crown sent nobody on the steps an invitation, and gave the Masque as it always had.' },
];

const SLIDE_CROWN: SlideSpec = {
  id: 'crown',
  met: MET_CROWN,
  lines: [
    {
      label: 'The chain', if: ALL(F('bw_turf'), NOT(F('bw_dogs_hold'))), text: [
        { if: F('bw_turf', 'gilt'), text: 'The Gilt held Bridgeward\'s chain and fenced the Crown\'s cast-off chrome across it, at the Crown\'s own price.' },
        { if: F('bw_turf', 'peace'), text: 'The three crews kept their peace at the chain, badly, and it held.' },
        { text: 'The Rustmouths held the chain, took the Crown\'s toll, and kept the Crown\'s money.' },
      ],
    },
    {
      label: 'The Saints', if: F('bw_static'), text: [
        { if: ENDED('unwritten'), text: 'Under the hiss there was nothing left to hear. Verity sat up at the tower every night anyway, in case.' },
        { if: F('bw_static', 'kept'), text: 'The Saints went on listening under the hiss. Verity wrote down what the girl heard and gave it away, and said that was the whole religion.' },
        { if: F('bw_static', 'silenced'), text: 'The girl who heard stayed in Captain Lowe\'s cell, for her own good, the record said. Verity went to the gate every week and was turned back politely.' },
        { if: F('bw_static', 'sold'), text: 'The Exchange kept the girl who heard in a sealed room, listening for the floor. Verity stopped saying the guild\'s name.' },
        { text: 'The girl who heard was up the hill on the Concern\'s contract. Verity kept her cot made at the tower.' },
      ],
    },
    {
      label: 'Old Kibet', if: F('bw_raid'), text: [
        { if: F('bw_raid', 'won'), text: 'He chalked the Dogs\' answer on his garage wall, BACK FOR THE BRIDGE, and under it, in another hand, somebody wrote AND KEPT IT.' },
        { text: 'He chalked the date of the hanging on his garage wall, and nothing else, and kept it fresh.' },
      ],
    },
    {
      label: 'The reel', if: F('cr_crown_hostile'), text: [
        { if: SASH_WORN, text: 'The Crown never forgave the Magistrate the reel played at its lectern, and said so at every Masque, in the Magistrate\'s presence, which was its idea of courage.' },
        { text: 'The Crown remembered who had played the reel at its lectern, and the invitation car did not stop for {name} again.' },
      ],
    },
  ],
  variants: [
    {
      id: 'ash', if: F('a3_ash_target', 'vane'), ...CROWN('garden_sit'), light: 'dusk', people: CROWN_PEOPLE([alive(HONORA)]),
      text: 'Brother Ash came for Celestine Vane in the first autumn, at her own table, between the soup and the fish, and walked out through the kitchens before anybody stood up. She had worn her line gladly: House Vane rising, written, hers. It went to her cousins, who quarrelled over it all winter and did not rise. The Crown had never been afraid of anything that came up the hill on foot. That winter it was.',
    },
    {
      id: 'fallen', if: VANE_DEAD, ...CROWN('garden_sit'), light: 'dusk', people: CROWN_PEOPLE([alive(HONORA)]),
      text: cat(
        'Celestine Vane was dead, and House Vane went to her cousins and did not rise. The Masque that year was a quiet one: the Tenured had seen at the last one what a cup could do, and drank from their own decanters, and watched each other\'s hands.',
        CROWN_END,
      ),
    },
    {
      id: 'risen', if: F('ks_vane', 'rises'), ...CROWN('hall_pair_a'), light: 'night', people: CROWN_PEOPLE([{ npc: VANE }, alive(HONORA)]),
      text: cat(
        'House Vane held the Chair, as written, and the Crown was loyal on schedule. Celestine Vane, eighty-one and looking fifty, gave the Masque herself that year, danced the first measure, and had the Ashby-Crane heir seated where he could watch her do it.',
        CROWN_END,
      ),
    },
    {
      id: 'broken', if: F('ks_vane', 'broken'), ...CROWN('hall_pair_a'), light: 'night', people: CROWN_PEOPLE([{ npc: VANE }, alive(HONORA)]),
      text: cat(
        'House Vane broke, and stayed broken. Honora Ashby-Crane held the Chair, and Celestine Vane, who had never in her life been seated below the salt, sat below it at every Masque that year and said "how tiresome" to the soup.',
        CROWN_END,
      ),
    },
    {
      id: 'late', if: VANE_LATE, ...CROWN('hall_pair_a'), light: 'night', people: CROWN_PEOPLE([{ npc: VANE }, alive(HONORA)]),
      text: cat(
        'House Vane rose the next season, on schedule. Nobody on the hill could say afterwards which duel or which decanter had done it; the Chair simply passed to her at the spring Masque, as the weather passes, and the Ashby-Cranes applauded.',
        CROWN_END,
      ),
    },
    {
      id: 'table', place: 'md_bridgeward', spot: 'toll_booth', light: 'dusk', people: CROWN_PEOPLE([alive(VERITY), alive(KIBET)]),
      text: cat(
        'House Vane neither rose nor fell. It went on setting a good table, and the Crown went on looking down on Bridgeward from its road, and Bridgeward went on charging the Crown to cross the near end of a bridge that went nowhere.',
        CROWN_END,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 12. the city's edges: the Ring and Carrick

const DOROTA = 'npc_dr_01', BELLO = 'npc_dr_02', HAEUN = 'npc_dr_05', CONNIE = 'npc_dk_02', KOBBY = 'npc_dk_07', ESPE = 'npc_dk_11';
const INES = 'npc_c9_01', OLA = 'npc_c9_r1', WES = 'npc_c9_r2', EFFIE = 'npc_c9_r4';
const RING = (spot: string) => ({ place: 'md_ring', spot });
const DOCKS = (spot: string) => ({ place: 'md_docks', spot });
/** Reserve 9 off the car in Carrick (B6k): passengers by the Harbour court, the Stand's, or crew in the Star's book. */
const WALKED: Cond = ALL(CARRIED_WEST, F('a3_c9_after', 'walked'));
const HULLS_GONE: Cond = ANY(F('dk_hulls', 'cleared'), F('dk_hulls', 'sold'));
/** The Ring after the steps, by the end (the Ring is outside the Wall: no record counts its dead). */
const RING_END: Text = [
  { if: ENDED_A1, text: 'In the spring the chair\'s wardens came out through the Wall with a lens on a pole and counted the Ring for the first time, and the Ring found out what being counted cost.' },
  { if: ENDED('unwritten'), text: 'When the city went dark the Wall\'s gate stood open, and half the Ring walked in to look, and most of it walked back out.' },
  { if: ENDED('opensky'), text: 'When the city\'s book was read, the Ring found it had no lines in it at all, and was not sure whether to be glad.' },
  { text: 'Outside the Wall the towers that burned still went uncounted.' },
];

const SLIDE_EDGES: SlideSpec = {
  id: 'edges',
  met: MET_EDGES,
  lines: [
    {
      label: 'Nkechi Bello', if: F('dr_bello'), text: [
        { if: F('dr_bello', 'inside'), text: 'She went in through the Wall to her brother on the card and raced no more, and came out to Clover on Fridays to watch.' },
        { if: F('dr_bello', 'crippled'), text: 'Her leg healed crooked. She coached the Ring\'s children on the straight from a chair, and never said the Coat\'s name.' },
        { text: 'She stayed outside the Wall and raced, and won, and took the Crown\'s purse every time and sent it through the gate.' },
      ],
    },
    {
      label: 'Leven', if: ALL(F('dr_leven'), NOT(F('dr_leven_burned'))), text: [
        { if: F('dr_leven', 'barred'), text: 'Leven stood. The yard went hungry for a season, and Ruben Iturbe did not speak to the slate again.' },
        { text: 'Leven stood open to the sky on its top floors, its steel in the Crown\'s road and ninety people under a roof that leaked.' },
      ],
    },
    {
      label: 'The Hulls', if: ALL(F('dk_hulls'), NOT(HULLS_GONE)), text: [
        { if: F('dk_hulls', 'moved'), text: 'The Crown\'s far end went onto the old tram bridge\'s footing under the Bond\'s fence, and the Crown and the Concern spent the year in court over one pier.' },
        { text: 'The Hulls signed their crew books every Sunday, and the cradle ran at night, five a head, with Abena in the basket.' },
      ],
    },
    {
      label: 'The Stand', if: ANY(F('dk_stand', 'broken'), F('dk_black', 'broken')),
      text: 'The Stand had broken. The call-on paid seven a shift, and the guild let the Ring\'s hired men stand at the white line at dawn to keep it that way.',
    },
    {
      label: 'Mirela Stan', if: F('dk_girl'), text: [
        { if: F('dk_girl', 'returned'), text: 'She went back east on the through at two. Espe kept her coat on the hook at the back of the cookshop all year.' },
        { if: F('dk_girl', 'ruled'), text: 'She worked off her fare at Espe\'s stove as a passenger owes it, and then kept working there, paid.' },
        { if: F('dk_girl', 'shore'), text: 'She lived on the Stilts and learned to mend nets, and wrote to Espe on the tide boat, badly spelled and often.' },
        { if: F('dk_girl', 'choir'), text: 'She lived at Openfield and learned the rows, and wrote to Espe that the sky was very large.' },
        { text: 'Her mother\'s contract stood whole, paid off at the Bond. She went to school on the quay, at Espe\'s back table.' },
      ],
    },
  ],
  variants: [
    {
      id: 'walked', if: WALKED, ...DOCKS('boxes_sit'), light: 'day', people: [{ npc: INES, if: NOT({ dead: INES }) }, { npc: OLA }, { npc: WES }, { npc: EFFIE }, alive(ESPE), alive(CONNIE)],
      text: [
        { if: F('a3_buffer_how', 'cradle'), text: 'By the year\'s end the Hulls could not remember being without them. Reserve 9 signed the Benguela Star\'s crew book every Sunday with the rest, kept her watches, scraped her rust, and stood at her rail in the evenings looking at a river bed with no river in it. Kwabena Ofori taught them knots. Wes went down to the Basin wall every morning to watch weather come in off the sea, which he had read about for fifty years.' },
        { text: 'By the year\'s end Carrick could not remember being without them. Reserve 9 worked the call-on at the Stand, badly at first, and the fish steps, and Espe\'s stove, and lived in the Boxes three to a container. Two of them married dockers before the winter. Wes went down to the Basin wall every morning to watch weather come in off the sea, which he had read about for fifty years, and was usually wet.' },
      ],
    },
    {
      id: 'stood', if: ANY(F('dk_stand', 'organised'), F('dk_black', 'won')), ...DOCKS('stand'), light: 'dawn', people: [alive(CONNIE), alive(KOBBY), alive(ESPE)],
      text: cat(
        'The Stand held. Every dawn the call-on chalked twelve Tolls a shift on the board by the white line, and the guild paid it, because the last time it had not, two hundred dockers had sat down on the Bond\'s freight until the Concern paid. Connie Okoye drove Crane Two and spoke for the line.',
        [
          { if: ENDED('concern'), text: 'When the Concern came into its kingdom the Stand blacked its crates twice that year, and was paid twice.' },
          { text: 'Every box off the through went over the weighbridge, and the needle said what it weighed.' },
        ],
      ),
    },
    {
      id: 'cleared', if: HULLS_GONE, ...DOCKS('stairs_top'), light: 'day', people: [alive(KOBBY), alive(CONNIE)],
      text: 'The river bed below Carrick was empty that year, raked flat by House Vane\'s engineers, with blue stakes where the Hulls had stood for ninety years. The crews had walked up the stairs with their books under their arms. The cradle\'s cable was cut, and the Crown\'s road went over the old footing in the spring, girders first. Kwabena Ofori stood at the top of the stairs most mornings, looking at the place where his ship had been.',
    },
    {
      id: 'burned', if: F('dr_leven_burned'), ...RING('leven_door'), light: 'dusk', weather: 'dust', people: [alive(HAEUN), alive(DOROTA)],
      text: cat(
        'Leven\'s shell stood black against the Wall all year: ninety people gone from it to the line outside the gate, and two from the ninth floor not gone anywhere. Ruben Iturbe\'s yard cut it for steel by the spring, and the steel went into the Crown\'s road. Ha-eun Seo kept Leven\'s count in the line, and the count was ninety-two.',
        RING_END,
      ),
    },
    {
      id: 'clover', ...RING('slate'), light: 'dusk', weather: 'dust', people: [alive(DOROTA), { npc: BELLO, if: ALL(NOT({ dead: BELLO }), NOT(F('dr_bello', 'inside'))) }],
      text: cat(
        'The races went on at Clover every evening the dust allowed, and Dorota Wilk kept the slate clean, because a fixed race is how people die. The Crown bloods came down in the invitation car for the finals, bet on whoever had the best story, and went home before the fires were lit.',
        RING_END,
      ),
    },
  ],
};

/** Slides 7–12, in play order. */
export const SLIDES_CITY: SlideSpec[] = [SLIDE_GUILD, SLIDE_CHOIR, SLIDE_PRECINCT, SLIDE_SINK, SLIDE_CROWN, SLIDE_EDGES];
