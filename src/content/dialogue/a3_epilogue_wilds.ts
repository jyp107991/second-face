import type { Text } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import {
  ALLY, AN_BOARD_CHALKED, AN_KITES_DOWN, AN_KWESI_DEAD, AN_SEALED, AN_SORLIE, B4B, ENDED, ENDED_A1, HC_CHAIR_RETIRED, HC_CLINIC, HC_NILS, HOUNDS_CONCERN, KES,
  M1_LEASH, M3_HALCYON, M5_HOUNDS, MAREN_LATE, MET_ASHLANDS, MET_LINE, MET_SHORE, MET_SKIRTS, MET_TEETH, MET_WET, MET_WHEEL, STRIKE_OUT, type Mod,
} from '../world/a3_conds';
import { ALL, ANY, cat, F, modText, modVariants, NOT, standingLine, type SlidePerson, type SlideSpec } from './a3_epilogue_kit';

/**
 * The epilogue, slides 13–19 (B6u): Halcyon and the Skirts, the Line and its halts, the Drowned Shore, Number Four in the Teeth,
 * the dam and the river, the Wheel, and the reserve asleep (or not) in the Ashlands. Data only: `a3_epilogue.ts` builds the tree.
 * Each slide is shown only if the player met its subject (`met`, from what content writes; the Ashlands also when the hounds woke,
 * wherever the player was). The first variant that holds is the page, the last the default; the lines under a page are its people
 * and the place's word on the player. Past tense: the year after the steps. The arcology slice's flags are read only through
 * a3_conds (`B4B`, `HC_*`), the Long Night's and the Ashlands' only through its aliases (`HOUNDS_*`, `AN_*`).
 * Story notes: story/B6_NOTES_SECRET.md §5, §6 and "As built" → B6s, B6t, B6u.
 */

const val = (m: Mod, id: string): Cond => {
  const v = m.values.find((x) => x.id === id);
  if (!v?.if) throw new Error(`${m.id}: no conditional value ${id}`);
  return v.if;
};
const alive = (npc: string): SlidePerson => ({ npc, if: NOT({ dead: npc }) });
/** A sentence that only some ends add to a page; the default adds nothing. */
const none = (...t: { if: Cond; text: string }[]): Text => [...t, { text: '' }];

// ---------------------------------------------------------------- 13. Halcyon and the Skirts

const MAREN = 'npc_hs_02', BELL = 'npc_hs_04', NILS = 'npc_hs_09';
const FOOTGATE = { place: 'hs_skirts', spot: 'station' };
const MAREN_HERE: SlidePerson = { npc: MAREN, if: ALL(F('ks_maren', 'lives'), NOT({ dead: MAREN })) };
const NILS_HERE: SlidePerson = { npc: NILS, if: ALL(ANY(F('hs_nils', 'freed'), HC_NILS('freed')), NOT({ dead: NILS })) };
/** Kes at home in the Skirts, never having joined (her own slide, B6v, tells the rest). */
const KES_HERE: SlidePerson = { npc: KES, if: ALL(NOT(F('kes_joined')), NOT({ dead: KES })) };
const SKIRTS_PEOPLE: SlidePerson[] = [MAREN_HERE, alive(BELL), NILS_HERE, KES_HERE];
const GLOW = 'Halcyon\'s gardens glowed over the rim at night, as they always had, and the freight went up the hill at two, and the boots came down it.';

const SLIDE_SKIRTS: SlideSpec = {
  id: 'skirts',
  met: MET_SKIRTS,
  lines: [
    {
      label: 'Maren Okafor', if: ALL(F('ks_maren', 'lives'), NOT({ dead: MAREN })),
      text: 'She had stood up in the canteen at Six at nineteen. She was still standing, still on the committee, and still answered the Window\'s letters by hand, in capitals.',
    },
    {
      label: 'The Leash', text: modText(M1_LEASH, {
        cut: 'Cut. Concern chrome across the Reach stayed quiet, and the Window could no longer stop an arm it had sold, or start one.',
        yours: 'The keeper\'s key was still in {name}\'s pocket. Every Concern piece in the Reach answered to it, and the Board knew whose hand that was.',
        sold: 'It answered to the hand {name} had sold it to, and the Skirts learned whose that was by which arms went dead in which queues.',
        spread: 'It spread with the core: every Concern piece in the Reach answered to a Board that now also knew where its wearer would be in nineteen years.',
        theirs: 'It stayed where it had always been, in Femi Lawal\'s spine in the grid core, in the Concern\'s hand.',
      }),
    },
    {
      label: 'The Weighhouse', if: F('hs_parts'), text: [
        { if: F('hs_parts', 'exposed'), text: 'It stayed shut. Provision\'s prices stayed up, and the Skirts paid them, and did not go back.' },
        { if: F('hs_parts', 'covered'), text: 'It stayed open, the Skirts\' only door out, and Dr Lisle weighed whoever came through it and wrote down what they would yield.' },
        { text: 'It stayed open. Dr Lisle still sent {name} the odd name on a folded slip, unasked, with a figure beside it.' },
      ],
    },
    {
      label: 'Floor nine', if: B4B.clinic, text: [
        { if: HC_CLINIC('freed'), text: 'The service ward stayed empty. The sleepers who reached the bottom of the hill lived on Nursery, and some of them could work.' },
        { if: HC_CLINIC('closed'), text: 'Dr Qadir kept the service ward shut by her own signature, and the floors took from the dead and the willing, and the Board learned what a short season was.' },
        { text: 'Floor nine kept its sleepers asleep, the machines breathed for them, and the boots came down.' },
      ],
    },
    {
      label: 'Nils Haber', if: ANY(F('hs_nils'), HC_NILS('dead'), HC_NILS('freed')), text: [
        { if: HC_NILS('dead'), text: 'He died on floor nine the night of the ball, whole, as he had been reserved.' },
        { if: ANY(F('hs_nils', 'freed'), HC_NILS('freed')), text: 'His father\'s debt was void, and so was his. He dug on Six, and did not talk about the ward.' },
        { text: 'He went up the hill on the freight at two, and did not come down.' },
      ],
    },
    {
      label: 'Linh Hoang', if: ANY(B4B.funicular('down'), B4B.funicular('stayed'), B4B.funicular('reported')), text: [
        { if: B4B.funicular('down'), text: 'She lived on Cascade in clean shoes gone grey, and laughed at the goats, and would not go back up.' },
        { if: B4B.funicular('stayed'), text: 'She stayed on the terraces by the orange tree, where she could watch them watch her.' },
        { text: 'Her place inside the arch at the top station stayed empty all year.' },
      ],
    },
    standingLine('skirts', 'The Skirts', {
      loved: 'In the Skirts {name}\'s name was chalked on the Lodge\'s door, under the eleven, and nobody rubbed it off.',
      liked: 'The Skirts spoke of {name} at Lampblack as somebody who had come down the hill and stayed a while.',
      hated: 'In the Skirts {name}\'s name was said the way the Window\'s is.',
    }),
  ],
  variants: [
    {
      id: 'opened', if: val(M3_HALCYON, 'opened'), ...FOOTGATE, light: 'night', people: SKIRTS_PEOPLE,
      text: cat(
        'Halcyon stayed open that year, the way a wound stays open. Everybody on the hill had heard their Board\'s ages read out at its own toast, and what those years had been paid for with, and nobody up there could say any more that they had not known.',
        [
          { if: ANY(HC_CLINIC('freed'), HC_CLINIC('closed')), text: 'With floor nine empty and nothing coming up on the freight at two, the Board began, one by one, to look its age. Three of the twelve were dead by the spring.' },
          { text: 'The freight still went up at two, but the Skirts stood along the track in the dark now and counted the cars, and the Board began, one by one, to look its age.' },
        ],
        none({ if: ENDED('concern'), text: 'The core went up the funicular all the same, in sealed crates, and the Board read in it how long each of them had left.' }),
      ),
    },
    {
      id: 'burned', if: val(M3_HALCYON, 'burned'), place: 'hs_skirts', spot: 'lodge_maren', light: 'night', people: [alive(MAREN), alive(BELL), NILS_HERE, KES_HERE],
      text: cat(
        [
          { if: B4B.leash('cut'), text: 'With the Leash cut, the Clean\'s Concern arms answered to nobody but the men wearing them, and when the Shift went up the road to the gate in the first winter with Maren Okafor at its head, half of them put down their rifles and the rest went over the rim.' },
          { text: 'With Kennel Seven\'s only command in {name}\'s pack, the Concern had no hounds to send, and when the Shift went up the road to the gate in the first winter with Maren Okafor at its head, half the Clean put down their rifles and the rest went over the rim.' },
        ],
        'Halcyon\'s gardens burned for two days. The Board went down into the Clinic floors and did not come up again. The citizens came down the hill on foot in their clean shoes, into the Skirts, and found out what scrip was worth.',
      ),
    },
    {
      id: 'risen', if: val(M3_HALCYON, 'risen'), ...FOOTGATE, light: 'night', people: SKIRTS_PEOPLE,
      text: cat(
        'Halcyon rose. The core came up the funicular in sealed crates in the first month and was installed in a clean room under the Board\'s floor, and the Board read its own futures in it and found them long. The freight went up at two every night now, full.',
        [
          { if: MAREN_LATE, text: 'The strike was broken the next season, on schedule, and the Clean hanged Maren Okafor from the post at Footgate.' },
          { text: 'In the Skirts the Window opened on time and read out everybody\'s debt, and now and then, in the same voice, somebody\'s future.' },
        ],
      ),
    },
    {
      id: 'reformed', if: val(M3_HALCYON, 'reformed'), place: 'hc_terrace', spot: 'garden_sit', light: 'day', people: [{ npc: 'npc_hc_02', if: NOT({ dead: 'npc_hc_02' }) }],
      text: cat(
        [
          { if: HC_CHAIR_RETIRED, text: 'Pilar Soto chaired the Board. The old Chair sat on his bench by the orange tree with his name on a brass plate, polite to the gardeners, and did not always know them.' },
          { text: 'Pilar Soto chaired the Board, and the old Chair kept to his rooms with a dormant hound by the fire, and was not consulted.' },
        ],
        'She would rather buy the future than take it, and that year she bought a great deal of it: contracts, paths on the Line, the Skirts\' debt at a discount from the guild.',
        [
          { if: F('hs_shift', 'won'), text: 'She honoured the Shift\'s stop to the letter, because it was in a contract, and the lamps went down Six with a steward at the cage.' },
          { if: MAREN_LATE, text: 'The strike was broken the next season, on schedule, and Soto signed the order to hang Maren Okafor without reading it twice.' },
          { text: 'In the Skirts nothing changed that anybody could eat.' },
        ],
      ),
    },
    {
      id: 'late', if: ALL(STRIKE_OUT, MAREN_LATE), ...FOOTGATE, light: 'dawn', people: [alive(BELL), KES_HERE],
      text: cat(
        'The strike at Number Six was broken the next season, as the list had written it would be. The Clean took Maren Okafor from the Lodge at dawn and hanged her from the post at Footgate, and the lamps went down Six again on the Concern\'s terms, with no steward at the cage.',
        GLOW,
      ),
    },
    {
      id: 'out', if: STRIKE_OUT, place: 'hs_skirts', spot: 'picket', light: 'day', people: SKIRTS_PEOPLE,
      text: 'The strike at Number Six was still out when the year turned. No lamps went down the pit, and the cable crew would not run the car, so whatever Halcyon needed came up the road on carts, slowly, past a picket that sang at it. Maren Okafor held the Lodge. The Window cut the strikers\' rations, the Shift fed itself out of Lev Ostrander\'s back room and the Pond\'s takings, and nobody on either side would be the first to say it was over.',
    },
    {
      id: 'stands', ...FOOTGATE, light: 'dusk', people: SKIRTS_PEOPLE,
      text: cat(
        [
          { if: F('hs_shift', 'revolt'), text: 'The cable house at Footgate was still a black stump, and the car still hung where the blast had stopped it, halfway up the hill. Maren Okafor led an armed Shift from the Lodge, the Clean stood on the rim, and neither came down.' },
          { if: F('hs_shift', 'broken'), text: 'Scabs worked Number Six on the Concern\'s terms, and the Window paid them what it liked. The post at Footgate stood empty again; the Clean had cut Maren Okafor down after a week.' },
          { text: 'The lamps went down Number Six every morning with a steward at the cage who had the right to stop work on bad ground. He used it twice, and nobody died under Six that year.' },
        ],
        GLOW,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 14. the Line and its halts

const BRODSKY = 'npc_rc_01', HALINA = 'npc_rc_05', CHELA = 'npc_rc_02';
const PLATFORM = { place: 'rc_fourways', spot: 'brodsky_platform' };
/** Chela Ortega still on the Line (every value of `rc_chela` takes her off it). */
const CHELA_HERE: SlidePerson = { npc: CHELA, if: ALL(NOT({ dead: CHELA }), NOT(F('rc_chela'))) };
const LINE_PEOPLE: SlidePerson[] = [alive(BRODSKY), alive(HALINA), CHELA_HERE];
const LINE_END: Text = [
  { if: ENDED('unwritten'), text: 'When the city went dark the Line did not notice. Its law had always been the clock at Four Ways, and the clock was right.' },
  { if: ENDED_A1, text: 'In the spring the chair\'s wardens began to ride the Line in a car of their own, and the timetable acquired a second law.' },
  { if: ENDED('opensky'), text: 'The night the radios read the city\'s book, Brodsky switched Four Ways\' set off at ten, as the timetable said, and heard his own line the next night like anybody else.' },
  { text: '' },
];

const SLIDE_LINE: SlideSpec = {
  id: 'line',
  met: MET_LINE,
  lines: [
    {
      label: 'Abe Mutasa', if: F('rc_abe'), text: [
        { if: F('rc_abe', 'hanged'), text: 'He hanged at Kettle Cut for the guard he had shot back at. The gibbet stood all year; West Halt would not take it down, and would not let the guild.' },
        { if: F('rc_abe', 'dead'), text: 'He was buried at West Halt, nineteen, under the watch board with his peg empty.' },
        { if: F('rc_abe', 'exiled'), text: 'Put off the Line for the guard who fired first, he walked south to Openfield, and was still sick most mornings.' },
        { if: F('rc_abe', 'guild'), text: 'He was handed to the guild. Nobody on the Line knew where he went, and nobody at West Halt asked {name}.' },
        { text: 'He went out through the watch-house cell one night and was not seen on the Line again.' },
      ],
    },
    {
      label: 'Chela Ortega', if: NOT({ dead: CHELA }), text: [
        { if: F('rc_chela', 'dead'), text: 'She was buried at West Halt, under a board that said NOBODY HURT in her own hand.' },
        { if: ANY(F('rc_chela', 'off'), F('rc_chela', 'stocks')), text: 'Put off the Line in what she stood in, she kept West Halt\'s watch from the road, where the timetable could not reach her.' },
        { text: 'She kept West Halt\'s watch, and her rule: nobody hurt.' },
      ],
    },
    {
      label: 'The stock car\'s twelve', if: F('rc_stock'), text: [
        { if: F('rc_stock', 'sold'), text: 'They went to the Weighhouse in the Concern\'s car. Chela Ortega did not say {name}\'s name again.' },
        { if: F('rc_stock', 'openfield'), text: 'They lived at Openfield and worked the rows, and Joaquin Ortega came home to West Halt every month on the handcar.' },
        { text: 'They went where they liked. Four of them stayed on as West Halt\'s line-keepers and were better at it than anybody.' },
      ],
    },
    {
      label: 'Dorcas', if: F('rc_engine'), text: [
        { if: F('rc_engine', 'contract'), text: 'She ran on her new board under a twenty-year contract, its lamp steady green, wherever the Concern\'s paths allowed.' },
        { if: F('rc_engine', 'dark'), text: 'She ran on a dark board the Concern could not reach, and Yard Nine was marked for it.' },
        { if: F('rc_engine', 'spare'), text: 'She ran on Halina\'s spare board, and Four Ways had no spare now if its own failed.' },
        { text: 'She ran on the army\'s old board out of the Ashlands, a crown over a gear, with nobody in it.' },
      ],
    },
    {
      label: 'The east length', if: F('rc_east'), text: [
        { if: ALL(F('rc_derailed'), F('rc_willem_dead')), text: 'The through\'s wreck lay in the cutting east of East Halt all year, stripped to the ribs. Willem Visser was buried at Yard Nine.' },
        { if: F('rc_derailed'), text: 'The through\'s wreck lay in the cutting east of East Halt all year, stripped to the ribs. Willem Visser had jumped in time.' },
        { if: F('rc_east', 'fixed'), text: 'Its bolts held. Gerrit Haas walked it every morning and never found out who had tightened them.' },
        { if: F('rc_east', 'told'), text: 'East Halt\'s keeper was put off the Line for the bolts, and the halt went down to nine people.' },
        { text: 'East Halt\'s keeper put her long spanner back on its nail in the shed, and left it there.' },
      ],
    },
    standingLine('fourways', 'Four Ways', {
      loved: 'At Four Ways the signal box let {name} ride the footplate anywhere on the Line, which the timetable did not allow for anybody.',
      liked: 'At Four Ways Brodsky nodded to {name} on the platform, which from Brodsky was a speech.',
      hated: 'At Four Ways {name}\'s name was on the guild\'s window with a line through it.',
    }),
  ],
  variants: [
    {
      id: 'through', if: ENDED('concern'), ...PLATFORM, light: 'day', people: LINE_PEOPLE,
      text: cat(
        'In the first month the through carried the core east in sealed cars, on green, stopping nowhere, and after that it ran on every path the timetable had. The Concern\'s freight had first call on every engine on the Line, and the halts watched it go by at forty miles an hour with their water towers dry.',
        [
          { if: ANY(F('rc_line', 'halts'), F('rc_line', 'shared')), text: 'The pilot clause and the request stops were struck out of the timetable by a contract the guild signed in the spring. Halina Wrona wrote the date in her register, and nothing else.' },
          { text: 'Casimir Brodsky checked his watch against the clock at every through, and the clock was right, and the timetable regretted.' },
        ],
      ),
    },
    {
      id: 'pilot', if: F('rc_line', 'halts'), ...PLATFORM, light: 'day', people: LINE_PEOPLE,
      text: cat(
        'Every train on the Line stopped at both halts that year, the through included, to take on a pilotman, because by Halina Wrona\'s rule book the token instruments at Four Ways were still out of order. The guild paid the pilots. West Halt\'s watch stood down and kept its length, East Halt\'s platform had people on it again, and nobody held up a train at Kettle Cut.',
        LINE_END,
      ),
    },
    {
      id: 'shared', if: F('rc_line', 'shared'), ...PLATFORM, light: 'day', people: LINE_PEOPLE,
      text: cat(
        'The guild kept its word from the table at Four Ways. The request stops came back at both halts, and the length money with them, and the hold-ups at Kettle Cut ended without anybody being told whose watch it had been. Severin Kask never asked. He had his paths, and the halts had their bread, and Brodsky said it was the timetable\'s doing.',
        LINE_END,
      ),
    },
    {
      id: 'guild', if: F('rc_line', 'guild'), place: 'rc_fourways', spot: 'kask', light: 'day', people: [alive(BRODSKY), alive(HALINA), alive('npc_rc_04')],
      text: cat(
        'The guild held the Line from the coast to Two-Twelve, end to end, and its riders kept the Line road. The halts were shut: the through stopped nowhere and paid nothing, West Halt\'s watch board stood empty peg by peg, and East Halt went on shrinking. Casimir Brodsky kept his box under Severin Kask\'s eye, and the timetable was right, and regretted nothing.',
        LINE_END,
      ),
    },
    {
      id: 'levy', if: F('rc_line', 'stationmaster'), ...PLATFORM, light: 'dusk', people: LINE_PEOPLE,
      text: cat(
        'Fares on the Line stayed at thirty a leg, the guild\'s levy for the trouble at Kettle Cut, and the trouble went on. West Halt\'s watch stopped the Concern\'s sealed freight in the cutting on dark nights and shared it down the Line, and Brodsky kept his own halt\'s secret in his box with {name}\'s silence, which he had paid for.',
        LINE_END,
      ),
    },
    {
      id: 'timetable', ...PLATFORM, light: 'day', people: LINE_PEOPLE,
      text: cat(
        'The through ran past the halts on green, as it had for two years, stopping nowhere and paying nothing for the lengths it ran on. East Halt was down to fourteen people, and West Halt\'s tower debt stood where it had. The seven o\'clock left Four Ways on the minute, every morning, and Brodsky checked it against his watch.',
        LINE_END,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 15. the Drowned Shore

const OONA = 'npc_ds_01', LUA = 'npc_ds_02', HAMID = 'npc_ds_10';
const GRETA = { place: 'ds_stilts', spot: 'court_sit' };
const SHORE_PEOPLE: SlidePerson[] = [alive(OONA), { npc: LUA, if: ALL(NOT(F('ds_lua_gone')), NOT({ dead: LUA })) }, { npc: HAMID, if: ALL(NOT(F('ds_hamid')), NOT({ dead: HAMID })) }];
const SHORE_END: Text = [
  { if: ENDED('unwritten'), text: 'When the city went dark its tide tables stopped coming down the delta. Oona Brack wrote the tides into the Book by hand from forty years of watching, and was wrong by a day twice.' },
  { if: ENDED('opensky'), text: 'The radios read the city\'s book down the delta in the night, and the Stilts found the city had written nothing about any of them but the tides.' },
  { text: '' },
];

const SLIDE_SHORE: SlideSpec = {
  id: 'shore',
  met: MET_SHORE,
  lines: [
    {
      label: 'The water', if: F('ds_valve'), text: [
        { if: F('ds_valve', 'shut'), text: 'Blackcap went dry, the sheen cleared over the season, and the fish came back to the Gut.' },
        { if: F('ds_valve', 'sleeved'), text: 'Hum\'s line ran clean to Blackcap, and the Stilts had a tank of fuel to defend, and defended it.' },
        { text: 'The sheen stayed on the water, thickest east, and the mussel beds under the Netlofts did not come back.' },
      ],
    },
    {
      label: 'Hum', if: ALL(F('ds_rig'), NOT(F('ds_rig', 'stilts'))), text: [
        { if: F('ds_rig', 'crew'), text: 'Hamid Farouk kept the turbine humming, and sold the guild one tanker a month off his own deck.' },
        { if: F('ds_rig', 'shared'), text: 'Blackcap was half the Stilts\' and half Hum\'s, and both sides argued over the gauge every Sunday, which was how it worked.' },
        { text: 'The guild held Hum\'s oil, and the Line ran on it.' },
      ],
    },
    {
      label: 'Mateo Ibarra', if: F('ds_court'), text: [
        { if: F('ds_court', 'living'), text: 'He had the Curlew back, by the Book\'s new page: what the water gives back is not the water\'s.' },
        { if: F('ds_court', 'sold'), text: 'Rui Sousa rowed out of Gull Stilts for good. Mateo moored the Curlew under Paz\'s loft, and waited, and was still waiting.' },
        { if: F('ds_court', 'quiet'), text: 'He went up the delta in Mele\'s old skiff. Paz never knew he had come back.' },
        { text: 'He was the water\'s, by page twelve, and worked on Hum, and did not come to the village.' },
      ],
    },
    {
      label: 'The false light', if: F('ds_light'), text: [
        { if: F('ds_light', 'exposed'), text: 'Yewande Coker hanged from the tide post for the false light. Ade Bankole took the dive stage, and Amara would not dive.' },
        { if: F('ds_light', 'court'), text: 'The court took Yewande Coker\'s boat for the bargemen\'s kin. She taught the divers from Ade\'s.' },
        { if: F('ds_light', 'framed'), text: 'Ewan Tulloch hanged from the tide post for a light he never lit. Yewande Coker never looked at {name} again.' },
        { text: 'No lamp was hung on the Jesty again, and nobody on the Stilts said why.' },
      ],
    },
    standingLine('hamlet_shore', 'Gull Stilts', {
      loved: 'Oona Brack wrote {name}\'s name into the Book, on the page for those the water owes.',
      liked: 'The Stilts let {name} tie up anywhere on the Gut without asking, which is the Book\'s courtesy to a friend.',
      hated: 'The Stilts would not sell {name} a fish.',
    }),
  ],
  variants: [
    {
      id: 'guild', if: F('ds_claim', 'guild'), ...GRETA, light: 'day', people: SHORE_PEOPLE,
      text: cat(
        'The Stilt Court had found against the guild by page nine of the Book: a life for a life, or a boat for a life.',
        [
          { if: F('ds_barge', 'pyre'), text: 'Lua Tanoa sent the guild\'s barge out burning on the ebb as Kai\'s boat. The guild cast off its tide post and went, and that year salt and medicine came dearer by the tide boat.' },
          { if: F('ds_post', 'stays'), text: 'The guild paid three hundred into the widows\' fund and kept its tide post at the Greta\'s stern, humbled, weighing fish at a fair price because the whole village watched it weigh.' },
          { text: 'The barge was already ash at Blackcap, so the court wrote it down as Kai\'s boat, and Lua Tanoa let that stand.' },
        ],
        'The sheen thinned over the season, and the mussels came back on the Gut\'s piles in the autumn.',
        SHORE_END,
      ),
    },
    {
      id: 'rig', if: F('ds_claim', 'rig'), place: 'ds_stilts', spot: 'stage_work', light: 'day', people: SHORE_PEOPLE,
      text: cat(
        'By the Book anything that floats and works is a boat, and the court gave Hum to the Stilts for Kai Tanoa.',
        [
          { if: F('ds_hamid', 'dead'), text: 'Hamid Farouk died on his own deck rather than leave it, and the Stilts\' men learned his turbine from his daughter\'s notes, slowly, and it did not stop.' },
          { text: 'Hamid Farouk took his crew up the Line to the Skirts, and the Stilts\' men learned his turbine from the notes he left on the board, slowly, and it did not stop.' },
        ],
        'The Stilts ate that year, and burned Hum\'s gas in every lamp on the Gut, and did not talk about how they had come by it.',
        SHORE_END,
      ),
    },
    {
      id: 'sea', if: F('ds_claim', 'sea'), ...GRETA, light: 'dusk', weather: 'fog', people: SHORE_PEOPLE,
      text: cat(
        'The court found that the sea had taken Kai Tanoa, and the sea answers to nobody. Lua Tanoa packed her nets and took the tide boat to Meridian, and her loft on the Gut stood empty.',
        [
          { if: F('ds_valve', 'shut'), text: 'The sheen cleared anyway once the valve was shut, and the fish came back, and the Stilts never knew whose hand had shut it.' },
          { text: 'The sheen stayed on the water, and the guild\'s barge loaded at Blackcap on dark nights, and the court did not sit on it again.' },
        ],
        SHORE_END,
      ),
    },
    {
      id: 'unheard', ...GRETA, light: 'dusk', people: SHORE_PEOPLE,
      text: cat(
        'Nobody stood up at the Stilt Court with what the water knew, so Lua Tanoa\'s claim for her son was never heard. Oona Brack kept it on the Book\'s open page all year, waiting, the way the Book waits. The guild\'s barge loaded at Blackcap on dark nights, and the sheen came and went with the tide.',
        SHORE_END,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 16. Number Four, in the Teeth

const RAGNA = 'npc_tm_01', DESMOND = 'npc_tm_02', TOVA = 'npc_tm_03';
const LAMP_BOARD = { place: 'tm_pit', spot: 'ragna_board' };
const FOUR_PEOPLE: SlidePerson[] = [{ npc: RAGNA, if: ALL(NOT(F('tm_ragna', 'gone')), NOT({ dead: RAGNA })) }, alive(DESMOND), alive(TOVA)];
const TAMED: Cond = ANY(F('tm_digger', 'tamed'), F('tm_digger_concern'));
const FOUR_END: Text = [
  { if: ALL(ENDED('concern'), TAMED), text: 'In the spring the digger in the lower level stopped in the middle of a face, turned its lamp up the cage shaft, and waited, and Four learned whose word it had been waiting for.' },
  { if: ENDED('opensky'), text: 'When the city\'s book was read, Four heard its own sixty names in it. No lens had ever come over the col; the Ledger had counted them from the Window\'s books.' },
  { text: '' },
];

const SLIDE_TEETH: SlideSpec = {
  id: 'teeth',
  met: MET_TEETH,
  lines: [
    {
      label: 'Ragna Holm', text: [
        { if: F('tm_ragna', 'gone'), text: 'Nobody at Four heard from her. Gaspard worked the bucket line\'s winch, and did not say her name at the lamp meeting.' },
        { if: F('tm_ragna', 'stays'), text: 'She worked the winch and counted the tags every night, sixty, and did not count aloud the ones she had said VISITORS for.' },
        { text: 'She counted the tags on the lamp board every night: sixty, and some years fifty-nine.' },
      ],
    },
    {
      label: 'The digger', if: ANY(F('tm_digger'), F('tm_digger_concern')), text: [
        { if: F('tm_digger', 'salvaged'), text: 'Its controller was gone, sold for a rifle\'s worth, and the lower level was dug by hand, which was slower and answered to nobody.' },
        { if: F('tm_digger', 'drowned'), text: 'The water was let back over it, and the lower level was lost, and Gaspard said that was the cheapest thing Four ever did.' },
        { if: ALL(TAMED, ENDED('concern')), text: 'It dug for the Concern now, and Four dug round it.' },
        { text: 'It dug for Four, and Four\'s tin doubled, and nobody went down to the lower level alone with it.' },
      ],
    },
    {
      label: 'The Nnadis', if: F('tm_family_in'), text: [
        { if: F('tm_family_in', 'taken'), text: 'Chinwe Nnadi was taken at the switchback. Ikenna lived in the bunkhouse, and would not go near the col.' },
        { text: 'Chinwe Nnadi worked the smelter with Gaspard, and Ikenna learned the trap lines from Sachiko and was better at them than he let on.' },
      ],
    },
    {
      label: 'Tova Lindqvist', if: NOT({ dead: TOVA }), text: [
        { if: ANY(F('tm_four', 'exposed'), F('tm_four', 'ended')), text: 'She went on taking the Concern\'s chrome out of everyone who came over the col, and stopped writing the Weighhouse\'s letters in her sleep.' },
        { text: 'She went on taking the Concern\'s chrome out of everyone who came over the col.' },
      ],
    },
    standingLine('number_four', 'Number Four', {
      loved: 'Four hung a sixty-first tag on its lamp board, with {name}\'s name on it, on a peg nobody else used.',
      liked: 'Four would take {name} down the cage without asking whose leave, which at Four is trust.',
      hated: 'Four would not let {name} over the col again, and said so on the set.',
    }),
  ],
  variants: [
    {
      id: 'exposed', if: F('tm_four', 'exposed'), ...LAMP_BOARD, light: 'dusk', weather: 'snow', people: FOUR_PEOPLE,
      text: cat(
        'Four had read the requests card at the lamp meeting and voted, and Ragna Holm went down the bucket line and was not seen at Four again. The set in the winding house was smashed. Four sold its tin over the col to the Shift now, at a price honest enough to be hungry on, and the Concern had marked it, and the col was watched.',
        FOUR_END,
      ),
    },
    {
      id: 'ended', if: F('tm_four', 'ended'), ...LAMP_BOARD, light: 'dawn', weather: 'snow', people: FOUR_PEOPLE,
      text: cat(
        'Ragna Holm said it on the set herself one dawn, FOUR — CLOSED — NO VISITORS, and told the lamp meeting why, and stepped down, and stayed to work the winch. Four lived poorer without the double price, and watched, and nobody chalked a name under the line on the lamp board that year, or the next.',
        FOUR_END,
      ),
    },
    {
      id: 'fought', if: F('tm_four', 'fought'), place: 'tm_pit', spot: 'desmond_col', light: 'dusk', weather: 'snow', people: [alive(DESMOND), alive(TOVA)],
      text: cat(
        'Two cairns stood at the switchback below the col, where the Clean\'s collection party had waited once too often. The Concern ended the arrangement itself, which Four had not known it had: the double price stopped, the Clean doubled on the col, and the Shift\'s runaways came over by the high path in the dark, fewer of them, alive.',
        FOUR_END,
      ),
    },
    {
      id: 'kept', if: F('tm_four', 'kept'), ...LAMP_BOARD, light: 'dawn', weather: 'snow', people: FOUR_PEOPLE,
      text: cat(
        'The arrangement went on. Once a season Ragna Holm said VISITORS on the set at dawn, and the Clean waited at the switchback for whoever the Concern had requested, and Four stayed free, and was paid double for its tin. A new name went up under the line on the lamp board every season: TAKEN ON THE PATH.',
        FOUR_END,
      ),
    },
    {
      id: 'free', ...LAMP_BOARD, light: 'day', weather: 'snow', people: FOUR_PEOPLE,
      text: cat(
        'Number Four stayed free that year, by an arrangement nobody there but its boss knew it had. The Shift\'s runaways came over the col, and most of them reached the pit, and the lamp board grew a name a season under the line. The tin went down the bucket line to East Halt and the guild paid twelve a bar for it.',
        FOUR_END,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 17. the dam and the river

const HEDDA = 'npc_nw_01', RHIANNON = 'npc_nw_02', SEVENTEEN = 'npc_nw_04';
const CREST = { place: 'nw_dam', spot: 'hedda_crest' };
const KEEPERS: SlidePerson[] = [{ npc: HEDDA, if: ALL(NOT(F('nw_keepers', 'taken')), NOT({ dead: HEDDA })) }, { npc: RHIANNON, if: ALL(NOT(F('nw_keepers', 'taken')), NOT({ dead: RHIANNON })) }];
/** No schedule card ever comes up the river once the core is gone: the keepers decide. */
const NO_CARD: Text = none({ if: ENDED('unwritten'), text: 'No schedule card came up the river after the city went dark. Hedda Wexford kept the Water at the sixth mark because she always had, and nobody wrote down why.' });

const SLIDE_WET: SlideSpec = {
  id: 'wet',
  met: MET_WET,
  lines: [
    {
      label: 'Sawtown', if: F('nw_feud'), text: [
        { if: F('nw_feud', 'truth'), text: 'The feud was over. Arvid Brandvold went up the hill alone, and Wayra Huaman and the baby ate at the Ridge\'s table.' },
        { if: F('nw_feud', 'quiet'), text: 'The feud ended and nobody knew why but Arvid Brandvold, who was seen at the cookhouse door some evenings, holding the child.' },
        { if: F('nw_feud', 'caught'), text: 'Sigrun Brandvold was put on the Water with one oar, and the feud went on, worse.' },
        { text: 'The Bottoms\' skid camp burned, and the Bottoms took the next barge down with Wayra and the baby. Nobody at Sawtown knew anything.' },
      ],
    },
    {
      label: 'The Patience', if: F('nw_run'), text: [
        { if: F('nw_run', 'delivered'), text: 'The crates she carried down the river were on the guild\'s floor at the Docks, and what was in them had a socket shaped for a neck.' },
        { if: ALL(F('nw_run', 'river'), F('nw_patience', 'seized')), text: 'The crates lay in the deep reach below the Landing. The guild took the Patience for her mooring, and Magda Kowal worked the winch.' },
        { if: F('nw_run', 'river'), text: 'The crates lay in the deep reach below the Landing, and Magda Kowal kept her father\'s barge.' },
        { text: 'The crates were in the Precinct\'s store under the Ledger\'s seal, and Magda Kowal kept her father\'s barge on the city\'s bounty.' },
      ],
    },
    standingLine('ashby', 'Ashby', {
      loved: 'The Wexfords painted a seventh mark on the gauge, high and useless, and called it {name}\'s.',
      liked: 'At Ashby the keepers let {name} walk the crest at night, which they let nobody do.',
      hated: 'At Ashby the keepers shut the gatehouse door when {name} came up the river.',
    }),
  ],
  variants: [
    {
      id: 'truth', if: F('nw_dam', 'truth'), ...CREST, light: 'day', weather: 'rain', people: KEEPERS,
      text: cat(
        'The record was corrected, and the city\'s water plan worked out again on the lake as it was. Clause thirty-one\'s diversion was void, the Sink kept its spring pumps, and the river ran even, so the barges went down full.',
        [
          { if: ENDED('unwritten'), text: 'The city\'s engineers had begun grouting the west gallery from inside when the lights went out, and went home. Hedda Wexford finished the work with Sawtown\'s men and the grout they left behind.' },
          { if: F('nw_mend', 'house'), text: 'Ashby-Crane was made to pay for the mending under the lease\'s warranty, and the city\'s engineers grouted the west gallery from inside while Hedda Wexford told them where.' },
          { text: 'The city mended the west gallery out of its own works, slowly, with Hedda Wexford telling its engineers where.' },
        ],
        NO_CARD,
      ),
    },
    {
      id: 'hidden', if: F('nw_dam', 'hidden'), place: 'nw_dam', spot: 'rhiannon_lock', light: 'dusk', weather: 'rain', people: KEEPERS,
      text: cat(
        'The lie went on. The float in the gauge well ran free on its respooled drum and read FULL, the assessor\'s report said COMPLIANT, and the Water stayed at the sixth mark. The Sink\'s spring relief went on being diverted to make up a lake that was not there, and the west gallery went unmended, and Rhiannon Wexford stopped asking when the city would be told.',
        NO_CARD,
      ),
    },
    {
      id: 'exposed', if: F('nw_dam', 'exposed'), ...CREST, light: 'day', weather: 'rain', people: [],
      text: [
        { if: ENDED('unwritten'), text: 'The keepers were in the Precinct\'s cells when the city went dark, and the wardens on the crest went home. The gates stood where the last card had left them, with the Water rising toward its full line, until Rhiannon Wexford walked back up the river from an unlocked cell in the spring and let it down to the sixth mark by hand. Nobody came to tell her not to.' },
        { if: ENDED('opensky'), text: 'With the keepers taken and wardens on the crest the Water was raised toward its full line, on schedule. Then the radios read the dam\'s own line with everybody else\'s, and Low Landing walked up the hill road before the thaw. The west gallery let go in April, as Hedda Wexford\'s grandmother had written that it would, and took the town\'s empty houses down the river.' },
        { text: 'With the keepers taken down the river and wardens on the crest, the Water was raised to its full line, on schedule. The west gallery let go in the April thaw, as Hedda Wexford\'s grandmother had written that it would. Bao Tran had been ringing the chandlery bell for an hour, and most of Low Landing was on the hill road when the river came down. Eleven were not.' },
      ],
    },
    {
      id: 'sunk', if: F('nw_dam', 'sunk'), ...CREST, light: 'dusk', weather: 'fog', people: KEEPERS,
      text: cat(
        'The Ledger wrote Assessor Seventeen down as LOST IN THE WET, and the Wet down as marked, and sent no second assessor. The schedule cards still came up the river every season in their sealed envelopes, with a red stripe across them now. The Wexfords kept the block in the gauge well and the Water at the sixth mark, and the wardens on the river roads stopped greeting them.',
        NO_CARD,
      ),
    },
    {
      id: 'waiting', ...CREST, light: 'day', weather: 'rain', people: [...KEEPERS, alive(SEVENTEEN)],
      text: cat(
        'Assessor Seventeen waited in the gatehouse at Ashby all year with its cap on its knee, ready to begin the inspection whenever someone let it. The schedule allows for delay. The block stayed wedged in the gauge well, the controller read FULL, and the Water stayed at the sixth mark while the Sink made up the difference.',
        NO_CARD,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 18. the Wheel and the roads

const SEFA = 'npc_wh_01', DARIO = 'npc_wh_02', MIRREN = 'npc_wh_03';
const CAMP = { place: 'wheel', spot: 'sefa_fire_sit' };
const KEEPS_HILL: Cond = F('a3_mast_keeper', 'wheel');
const WHEEL_PEOPLE: SlidePerson[] = [alive(SEFA), { npc: DARIO, if: ALL(NOT(KEEPS_HILL), NOT({ dead: DARIO })) }, alive(MIRREN)];
const WHEEL_END: Text = [
  { if: ENDED('unwritten'), text: 'The Wheel never noticed the city go dark. Its roads had never been on anybody\'s schedule.' },
  { if: ENDED_A1, text: 'The chair\'s tolls caught up with the Wheel at Tollhouse 9 in the spring, and Sefa paid them in horses, the worst she had.' },
  { if: ENDED('concern'), text: 'With the Concern\'s freight on every path of the Line, more of the Sallow\'s trade went by the Wheel\'s carts, and Sefa raised her prices.' },
  { text: '' },
];

const SLIDE_WHEEL: SlideSpec = {
  id: 'wheel',
  met: MET_WHEEL,
  lines: [
    { label: 'Sefa Oduya', if: NOT({ dead: SEFA }), text: 'She held the ring and fed the guests first, and looked at every stranger\'s boots, then hands, then face, in that order.' },
    {
      label: 'Dario Oduya', if: ALL(NOT(KEEPS_HILL), NOT({ dead: DARIO })),
      text: 'He still wanted a town, and said so at every fire, and turned south with the carts in the autumn anyway.',
    },
    standingLine('wheel', 'The Wheel', {
      loved: 'The Wheel kept a place at its fire for {name} on every road it turned, and fed {them} before the guests.',
      liked: 'The Wheel called {name} road-kin at its fires, and meant it.',
      hated: 'The Wheel fed {name} as a guest, and no more, which on the road is a sentence.',
    }),
  ],
  variants: [
    {
      id: 'receivers', if: ALL(ENDED('opensky'), ANY(ALLY('wheel'), KEEPS_HILL)), ...CAMP, light: 'night', people: WHEEL_PEOPLE,
      text: cat(
        'The Wheel had gone out ahead of the steps along every road it knew, with carts of old receivers wrapped in sacking, and left one turned up loud in every village, camp and halt it had ever watered at. When the relay carried the city\'s book out of Signal Hill, the whole Sallow heard it at once, in the same voice, and nobody could say it had been told first.',
        [
          { if: KEEPS_HILL, text: 'Dario Oduya threw the switch at the mast\'s foot himself.' },
          { text: 'Sefa Oduya listened at her own fire with her stick across her knees.' },
        ],
      ),
    },
    {
      id: 'hill', if: KEEPS_HILL, place: 'signalhill', spot: 'hill_watch', light: 'dusk', weather: 'haze', people: [alive(DARIO)],
      text: cat(
        'Dario Oduya kept Signal Hill. He had wanted a door that shuts, and the hill gave him one: a hut at the mast\'s foot with a stove, a log, the knife switch, and a view of every road the Wheel used. His mother came up the hill road twice that year and sat with him and did not ask him to come down.',
        WHEEL_END,
      ),
    },
    {
      id: 'kin', if: { member: 'wheel', rank: 'roadkin' }, ...CAMP, light: 'night', people: WHEEL_PEOPLE,
      text: cat(
        'The Wheel turned south in the autumn as it always did, and kept {name}\'s name on the ring\'s count as road-kin, whether {they} rode with it or not. Wherever the carts stopped that winter, somebody asked after {them} at the fire, and somebody else told a story about {them} that was mostly true, and improved with the telling.',
        WHEEL_END,
      ),
    },
    {
      id: 'turning', ...CAMP, light: 'night', people: WHEEL_PEOPLE,
      text: cat(
        'The Wheel turned south in the autumn as it always did, the carts in a line on the old salt road and the horses counted twice a day. It fed its guests first, traded what walked up to it, carried what towns wanted between towns that did not trust each other, and asked nothing about what was under the sacking. Nine families, seven wagons, four horses, no address.',
        WHEEL_END,
      ),
    },
  ],
};

// ---------------------------------------------------------------- 19. the reserve in the Ashlands

const RADU = 'npc_an_05';
const VIEW = { place: 'an_saddleback', spot: 'view' };

const SLIDE_ASHLANDS: SlideSpec = {
  id: 'ashlands',
  met: MET_ASHLANDS,
  lines: [
    {
      label: 'Spindle', if: ANY(AN_SORLIE('out'), AN_SORLIE('dead'), AN_BOARD_CHALKED, AN_KWESI_DEAD), text: [
        { if: AN_KWESI_DEAD, text: 'Kwesi Kwarteng\'s name stayed on Spindle\'s board, never ticked, and his grandmother weighed fair for everyone but the Concern.' },
        { if: AN_BOARD_CHALKED, text: 'The board still said DEAD AT KELSO — A CARD THEY WERE GIVEN, and Hester Kwarteng renewed the chalk every week.' },
        { if: AN_SORLIE('dead'), text: 'Benedikt Sorlie was buried at Kelso\'s gate, costed to the contract.' },
        { text: 'Benedikt Sorlie camped at Kelso\'s gate all year, waiting for a board recovery nobody would guide him to.' },
      ],
    },
    {
      label: 'The kites', if: AN_KITES_DOWN,
      text: 'Pemberton\'s beacon stayed dark. The kites came down one by one over the year and did not get up, and the pickers walked the plateau by daylight.',
    },
    standingLine('spindle', 'Spindle', {
      loved: 'Spindle wrote {name}\'s name on its board the day {they} left and never ticked it, so that {they} would always be coming back.',
      liked: 'Hester Kwarteng weighed {name}\'s finds fair, and said so, which she did not say about anyone.',
      hated: 'Spindle took {name}\'s name off its board, which on the plateau means you are on your own.',
    }),
  ],
  variants: modVariants(M5_HOUNDS, {
    yours: {
      ...VIEW, light: 'dusk', weather: 'haze', people: [alive(RADU)],
      text: cat(
        'Four hundred and twelve hounds slept on under the netting past Saddleback, and the only lawful command left for them was in {name}\'s pack, wrapped in a shirt. In Kelso\'s hall the Lieutenant\'s rack stood open and empty and logged every dawn: COMMAND UNIT ABSENT. RESERVE DORMANT.',
        [
          { if: ENDED('concern'), text: 'The Concern\'s men came to Spindle twice that year to ask where the core was, politely, and the second time not.' },
          { if: ENDED_A1, text: 'The chair could have woken them with a word. Every season, the Ledger noted that it had not.' },
          { text: 'The kites drank at Pemberton\'s panels at dusk and went back to watching cradles nobody would empty.' },
        ],
      ),
    },
    woken: {
      ...VIEW, light: 'dawn', weather: 'dust', people: [],
      text: [
        { if: ALL(HOUNDS_CONCERN, ENDED('concern')), text: 'The Concern held Kennel Seven\'s key, and with the core on its hill it had a use for it. The cradles past Saddleback emptied in a single night in the spring: four hundred and twelve hounds standing up under the netting at once and walking west along the old border belt in their rows, the kites over them. By summer they walked the Line\'s road beside the Concern\'s freight, and nobody stopped it.' },
        { if: HOUNDS_CONCERN, text: 'The Concern held Kennel Seven\'s key, and in the spring it used it. The cradles past Saddleback emptied in a single night: four hundred and twelve hounds standing up under the netting at once and walking west along the old border belt in their rows, the kites over them. Where they went, the Sallow learned to keep its children in at dusk.' },
        { if: ENDED('concern'), text: 'With the core on its hill the Concern did not need the Lieutenant\'s leave. Its engineers cut the command unit out of Kelso\'s rack in the autumn and carried it up the Line, and by spring it had been taught at Halcyon what lawful meant. The cradles past Saddleback emptied in a single night, and by summer the hounds walked the Line\'s road beside the Concern\'s freight.' },
        { text: 'Kennel Seven never woke. The hounds that walked the Reach that year were the guild\'s, off the kennel boards the Concern had floated down the river, and the reserve slept on under its netting past Saddleback while they did, four hundred and twelve of them, waiting for a lawful command that nobody alive could give.' },
      ],
    },
    feral: {
      ...VIEW, light: 'dusk', weather: 'dust', people: [],
      text: cat(
        'With the Lieutenant broken there was nothing left in Kelso\'s hall to tell Kennel Seven what it was for. The hounds came awake one at a time over the year, with no order and no rows, and walked the March as they had been built to, and killed what crossed it. Spindle flew the black flag more days than not, and its pickers went out in fours.',
        none({ if: ENDED('concern'), text: 'The Concern\'s engineers came for the reserve in the autumn with their white cards, and did not come back.' }),
      ),
    },
    dormant: {
      ...VIEW, light: 'dusk', weather: 'haze', people: [alive(RADU)],
      text: cat(
        [
          { if: AN_SEALED, text: 'Kennel Seven slept. The Lieutenant had sealed it against all authority, and logged it, and its patrol lay down in the motor pool\'s shade for good. The Concern\'s officers wrote to Spindle about it, and Spindle used the letters to start fires.' },
          { text: 'Kennel Seven slept on under its netting past Saddleback, as it had for ninety years, and LT-7 held it in Kelso\'s hall, awaiting lawful command, refusing everyone who came to offer it some.' },
        ],
        [
          { if: ENDED('opensky'), text: 'When the radios read the city\'s book, the reserve was in it: KENNEL 7, DORMANT, four hundred and twelve. The Ledger had counted them too.' },
          { text: 'At dusk the kites came home to Pemberton\'s panels to drink, and the pickers counted them from Spindle\'s tower, and the count did not change.' },
        ],
      ),
    },
  }),
};

/** Slides 13–19, in play order. */
export const SLIDES_WILDS: SlideSpec[] = [SLIDE_SKIRTS, SLIDE_LINE, SLIDE_SHORE, SLIDE_TEETH, SLIDE_WET, SLIDE_WHEEL, SLIDE_ASHLANDS];
