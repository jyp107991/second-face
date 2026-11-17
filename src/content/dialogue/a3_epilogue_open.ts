import type { Text } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import {
  ADA_DEAD, ADA_LATE, CALLA_DEAD, CALLA_FREE, CALLA_KEPT, CARRIED_WEST, COMPANION_KEYS, COMPANIONS, ENDED, ENDED_A1, ENDED_A2, EP_SKY, HALE_ALIVE, IN,
  JONAH_DEAD, KESSLER_DEAD, KESSLER_LATE, LINNET_COLUMN, LINNET_DOGS, LINNET_KNOCK, LINNET_SHALE, M2_SINK, M4_CISTERN, MAREN_LATE,
  MASON_DEAD, MASON_EXILED, MASON_SCARRED, MET_DOGS, MET_SHALE, MOTHER_AFTER, MOTHER_DARK, NINE, NINE_CONSCIENCE, OCHO_DROWNED, ON_SCHEDULE, ON_SIDE,
  OPENFIELD, PLATFORM_OPEN, QUILL, QUILL_COMES, SARR_DEAD, SASH_WORN, SOTO, SOTO_COMES, STRUCK_AS, TEAGUE_LEADS, VANE_DEAD, VANE_LATE, VASHA_DEAD,
  VASHA_EXECUTIONER, WITH_YOU, WREN, WREN_ROPE_LATE, type Mod,
} from '../world/a3_conds';
import { ALL, ANY, cat, F, modText, modVariants, NOT, standingLine, type SlideLine, type SlidePerson, type SlideSpec, type SlideVariant } from './a3_epilogue_kit';

/**
 * The epilogue, slides 1–6 (B6s): the photograph's steps, the core and the twelve, Reserve 9 and MOTHER, Knock, Shale, and
 * the overpass. Data only: `a3_epilogue.ts` builds the tree from these with the slides of B6t–B6v. Every slide's first
 * variant that holds is shown, the last is its default; the lines under a page are its people and the twelve. Written in
 * the past tense, as the year after the steps went, by what the player did and the end they reached.
 * Story notes: story/B6_NOTES_SECRET.md §5, §6 and "As built" → B6s.
 */

const val = (m: Mod, id: string): Cond => {
  const v = m.values.find((x) => x.id === id);
  if (!v?.if) throw new Error(`${m.id}: no conditional value ${id}`);
  return v.if;
};

const THREE = 'npc_ar_01';
const INES = 'npc_c9_01', PELL = 'npc_c9_02', BRAM = 'npc_c9_04', TEAGUE = 'npc_c9_06', OLA = 'npc_c9_r1', WES = 'npc_c9_r2', SAYER = 'npc_c9_r3', EFFIE = 'npc_c9_r4';
const MAUD = 'npc_kn_maud', LINNET = 'npc_kn_linnet', DACE = 'npc_kn_dace', CORIN = 'npc_kn_corin', HALE = 'npc_kn_out_lead', PARDO = 'npc_sh_12';
const ADA = 'npc_sh_01', JONAH = 'npc_sh_02', MAGS = 'npc_sh_03', TEO = 'npc_sh_07', ISSA = 'npc_sh_11';
const KESSLER = 'npc_rd_01', VASHA = 'npc_rd_02', PERPETUA = 'npc_rd_05', BRINDLE = 'npc_rd_06';
const alive = (npc: string): SlidePerson => ({ npc, if: NOT({ dead: npc }) });

// ---------------------------------------------------------------- 1. the photograph's steps, now

/** Whoever climbed with the player and is still beside them (a companion who left at the vault is not on the steps). */
const PARTY: SlidePerson[] = COMPANION_KEYS.map((c) => ({ npc: COMPANIONS[c].id, if: ALL(IN(COMPANIONS[c].id), ON_SIDE(c)) }));
const ON_THE_STEPS: SlidePerson[] = [{ npc: THREE }, ...PARTY];
const STEPS = (o: { id: string; if?: Cond; light: 'dawn' | 'day' | 'dusk'; text: Text; people?: SlidePerson[] }): SlideVariant => ({
  id: o.id, ...(o.if ? { if: o.if } : {}), place: 'md_spire', spot: 'steps_sit', people: [...ON_THE_STEPS, ...(o.people ?? [])], pc: { years: 0 }, light: o.light, text: o.text,
});

/** What the steps themselves kept of the climb (B6p): Ash's order fallen on himself at the lamp; the Unwritten's blade. */
const STEPS_LINES: SlideLine[] = [
  { label: 'Brother Ash', if: F('a3_ash', 'self'), text: 'He died at the foot of the lamp with his own order in his hand. Somebody left a cairn stone there, and somebody else knocked it off, and it was put back.' },
  {
    label: 'The blade', if: ANY(F('a3_blade', 'fought'), F('a3_blade', 'ash')), text: [
      { if: F('a3_blade', 'fought'), text: 'Thaddeus Wolde died on the steps with the Unwritten\'s blade still in his hand. The masons could not get the stain out of the stone, and stopped trying.' },
      { text: 'Brother Ash carried the blade\'s cut across his face for the rest of his life. It had been meant for the sash.' },
    ],
  },
];

const SLIDE_STEPS: SlideSpec = {
  id: 'steps',
  lines: STEPS_LINES,
  variants: [
    STEPS({
      id: 'unwritten', if: ENDED('unwritten'), light: 'dawn',
      text: cat(
        'The lights went out across Meridian a little after ten and did not come back on. By morning the Spire\'s steps were full of people who had never been let onto them, sitting in the cold with their shoes beside them, waiting to be told what the day was for. Nothing told them. The lamp at the foot of the steps was dark, and somebody chalked the year on the fourth step the way the Cistern counted it, from the Burn.',
        [
          { if: SASH_WORN, text: 'The sash lay folded on the top step where {name} had taken it off: the first act of the chair, and the last.' },
          { text: 'At the top Three stood beside the sash nobody had worn, its lens going over the crowd and finding no line for anyone.' },
        ],
      ),
    }),
    STEPS({
      id: 'concern', if: ENDED('concern'), light: 'day',
      people: [{ npc: SOTO, if: SOTO_COMES }, { npc: QUILL, if: QUILL_COMES }],
      text: 'The Board\'s car came up the close at noon with its windows dark, and the wardens swept the steps for it because the order said to. Twelve to a wagon, under canvas, the guild\'s sealed crates went down the lane toward the Line, and the hum under the Spire\'s foot went with them. {name} stood on the fourth step in the sash for the photographers the Concern had brought from Halcyon. Their pictures were good ones, and they had grain in them. The board on the scaffold came down, and nothing went up in its place.',
    }),
    STEPS({
      id: 'opensky', if: ENDED('opensky'), light: 'dawn',
      text: cat(
        modText(EP_SKY, {
          held: 'By dawn the steps were covered in paper. All night the radios had read the city\'s book aloud, and people had copied out their own lines and their neighbours\' and carried them up to the Spire as if it might take them back. Lamps were still lit along the close, the wardens at the foot had their rifles slung, and the worst anybody did that morning was weep.',
          hard: 'By dawn the steps were covered in paper: lines copied out of the radios in the night and carried up to the Spire as if it might take them back. There was blood on the close by the empty plinth. A man was carried down off the bottom step by four others, who would not say what he had read about them, or they about him.',
          burning: 'By dawn the steps were covered in paper, and Bridgeward and the Crown were burning under a low brown sky. People had copied their lines out of the radios in the night, and some had gone looking for the names written beside theirs, and found them. The wardens held the foot of the steps until noon, and then went home to their own streets.',
        }),
        [
          { if: SASH_WORN, text: 'It was the Magistrate who had given the city\'s book away, so {name} sat on the fourth step in the sash and let anyone who wanted to look at that face come and look.' },
          { text: 'It was a private person who had read the city\'s book out, and {name} sat on the fourth step in an ordinary coat and let anyone who wanted to look at that face come and look.' },
        ],
      ),
    }),
    STEPS({
      id: 'amended', if: ENDED('amendment'), light: 'day',
      text: cat(
        'Three brought the register down the steps in both arms, the way a clerk carries something that might wake, and set it on the empty plinth under THE LAST BEFORE. {name} wrote the clauses sitting on the fourth step, because there was no desk on the close, while the crowd stood in the wind off the canal without knowing what it was waiting for. When the last line was written the lens over the doors said one word, and everybody on the close heard it: Agreed.',
        [
          { if: WITH_YOU('nine'), text: 'Nine read the clauses back aloud, every word, for anyone who could not read.' },
          { text: 'Three read them back, every word, in its voice with nothing in it.' },
        ],
      ),
    }),
    STEPS({
      id: 'worn', if: ENDED_A1, light: 'day',
      text: 'The scaffold came down in the first week, and the masons mended the fourth step before any other, because the Magistrate came down it every morning. The board was carried off: it had nothing left to promise. Three stood a step below the sash and read the day\'s schedule aloud, as the Plan had written it thirty years before, and the close listened the way people listen to weather. The lamp burned all night. The photograph had been out by a stride, and in the spring the Ledger had the lamp moved.',
    }),
    STEPS({
      id: 'refused', light: 'dusk',
      text: '{name} came down the steps without the sash, through a crowd that had come to see a Magistrate and stood aside for a stranger. Three folded the sash over its arm and did not watch {them} go. By the time the lamp was lit the lens over the doors had turned, slowly, the way a lighthouse turns, and stopped on a face in the crowd: a young docker about {name}\'s age, who had walked up from Carrick to watch. The works finished the steps on schedule. The board was relettered. It said R49 again.',
    }),
  ],
};

// ---------------------------------------------------------------- 2. the core and the twelve

/** The list's own lines (the city's hand), each with what became of the person. Every one is shown: the list is known in
 * full by Act 3 (the Spire's quest in Act 2 cannot go on without it). */
const KS = (label: string, text: SlideLine['text']): SlideLine => ({ label, text });
const TWELVE: SlideLine[] = [
  KS('Reese, Jonah', [
    { if: JONAH_DEAD, text: 'Deceased within the month, as written.' },
    { text: 'Lived. VARIANCE, in the margin, in the city\'s own hand.' },
  ]),
  KS('Vey, Ada', [
    { if: F('ks_ada', 'dead'), text: 'Died in Shale\'s street between the town and the guild\'s hands. She never resigned.' },
    { if: ADA_DEAD, text: 'Dead before the guild\'s paper came due. She never resigned.' },
    { if: F('ks_ada', 'stays'), text: 'Did not resign. The guild\'s paper went back to Ninebridge unsigned.' },
    { if: F('ks_ada', 'resigns'), text: 'Resigned, as written, and Shale was contracted.' },
    { if: ADA_LATE, text: 'Resigned in the first spring, on schedule, and Shale was contracted.' },
    { text: 'The guild\'s paper never came due. She was still sheriff when the year turned.' },
  ]),
  KS('Kessler', [
    { if: F('rd_coup'), text: 'Killed in his own hall the night of Kade\'s coup, as written, and ahead of his date.' },
    { if: KESSLER_DEAD, text: 'Dead, and not by Kade\'s hand.' },
    { if: KESSLER_LATE, text: 'Killed by Kade in his own hall in the first autumn, on schedule.' },
    { text: 'Alive. He kept his list of the people he had not robbed, and it got longer.' },
  ]),
  KS('Kade, Vasha', [
    { if: F('vasha_fate', 'ilya'), text: 'Shot at the Bridgeward booth by Ilya Strand. Never Executioner.' },
    { if: F('vasha_fate', 'player'), text: 'Shot at the Bridgeward booth. Never Executioner.' },
    { if: F('a3_ash_target', 'vasha'), text: 'Killed at her own fire in the first autumn by Brother Ash, who carried the sky\'s order and put it on the one who wore her line most gladly. Never Executioner.' },
    { if: VASHA_DEAD, text: 'Dead. Never Executioner.' },
    { if: F('vasha_fate', 'spared_why'), text: 'Let live at the booth with the city\'s letter in her hand, to know what she had been for. She never rode to anybody\'s schedule again.' },
    { if: VASHA_EXECUTIONER, text: 'Executioner, as written. The Plan had work for her.' },
    { text: 'Alive, and nobody\'s executioner.' },
  ]),
  KS('Calloway, Wren', [
    { if: ANY(F('wren_hanged'), F('wren_rope', 'fulfilled')), text: 'Hanged from the Bridgeward toll booth, as written, and left there a day for the street to see.' },
    { if: F('wren_rope', 'broken'), text: 'Took the bridge on her own night and walked off it. The rope never found her.' },
    { if: F('wren_rope', 'refused'), text: 'Walked away from the bridge the city wrote for her, and never went back to it.' },
    { if: { dead: WREN }, text: 'Dead, and not on the bridge.' },
    { if: WREN_ROPE_LATE, text: 'Raided the Bridgeward chain the next year, as written, and was hanged from its booth on schedule.' },
    { text: 'The rope was still waiting for her when the year turned. She was not.' },
  ]),
  KS('Calla, Sister', [
    { if: CALLA_DEAD, text: 'Dead, before any trial.' },
    { if: ALL(CALLA_FREE, F('ca_calla')), text: 'Freed by the Court of Accounts. She went back to the tent in Shale and asked people questions back.' },
    { if: CALLA_FREE, text: 'Free. She went back to the tent in Shale and asked people questions back.' },
    { if: CALLA_KEPT, text: 'Imprisoned for sedition, as written. Her trial set the precedent the city wanted.' },
    { if: ENDED('unwritten'), text: 'In a Precinct cell when the lights went out. On the third day, when the food stopped, the warden on her corridor unlocked the doors himself.' },
    { if: ENDED('opensky'), text: 'In a Precinct cell when her line was read out on every radio. The Precinct let her go within the month: it could not afford to be heard holding her.' },
    { if: ENDED('amendment'), text: 'Released in the chair\'s first season, under the Magistrate\'s own clause.' },
    { text: 'Still in a Precinct cell when the year turned, waiting for a trial the schedule had already written.' },
  ]),
  KS('Mason', [
    { if: ALL(MASON_DEAD, OPENFIELD('burned')), text: 'Died the night Openfield burned, as written.' },
    { if: MASON_DEAD, text: 'Dead.' },
    { if: MASON_EXILED, text: 'Put off his own fields after the Long Night, with what would fit on a cart.' },
    { if: MASON_SCARRED, text: 'Pulled out of a burning door alive. Openfield burned, as written, and he planted it again.' },
    { if: OPENFIELD('burned'), text: 'Openfield burned, as written. He lived, and planted it again the next spring.' },
    { text: 'Openfield did not burn. VARIANCE, in the city\'s hand.' },
  ]),
  KS('Sarr, Imelda', [
    { if: F('a3_ash_target', 'sarr'), text: 'Killed among her clocks in the first autumn by Brother Ash, who carried the sky\'s order and put it on her. Never Treasurer of anything.' },
    { if: SARR_DEAD, text: 'Dead before she was Treasurer of anything.' },
    { if: ENDED('concern'), text: 'Treasurer of the Concern\'s world, as written, in a better hand.' },
    { if: ENDED('unwritten'), text: 'Treasurer of nothing. There was no schedule left for the tolls to keep.' },
    { if: ALL(ENDED('opensky'), { knows: 'a3_warned_sarr' }), text: 'Not ruined. Warned by {name}\'s letter, she had sold every position she held before the radios read it: the one person in the Reach who heard it first.' },
    { if: ENDED('opensky'), text: 'Ruined in daylight, and alive: every position she held was read out before she could sell it.' },
    { if: ENDED('amendment'), text: 'Audited. The chair\'s first season went through the Exchange\'s books line by line, and she answered for every one.' },
    { if: ENDED_A1, text: 'Treasurer, as written. The tolls rose on schedule.' },
    { text: 'Treasurer by the spring. The Plan had rerouted round one face, and did not need to reroute round hers.' },
  ]),
  KS('Ocho', [
    { if: OCHO_DROWNED, text: 'Drowned in the spring flood, as written. The clinic on the stair closed.' },
    { if: val(M2_SINK, 'lost'), text: 'The flood the city had scheduled for him came anyway, the spring after its pumps stopped, and he drowned on his own stair carrying the last cot up it.' },
    { if: val(M2_SINK, 'held'), text: 'When the Ledger\'s pumps stopped, the Pale pumped the Sink by hand, and he kept the clinic open on the stair.' },
    { if: F('sk_flooded'), text: 'The spring came up the Sink and he lived through it, on the stair, carrying cots.' },
    { text: 'Alive, and the clinic on the stair stayed open.' },
  ]),
  KS('Vane, Celestine', [
    { if: F('a3_ash_target', 'vane'), text: 'Killed at her own table in the first autumn by Brother Ash, who carried the sky\'s order and put it on her. House Vane went to her cousins, and did not rise.' },
    { if: VANE_DEAD, text: 'Dead. House Vane went to her cousins, and did not rise.' },
    { if: F('ks_vane', 'rises'), text: 'House Vane rose, as written.' },
    { if: F('ks_vane', 'broken'), text: 'House Vane broke, and stayed broken.' },
    { if: VANE_LATE, text: 'House Vane rose the next season, on schedule.' },
    { text: 'House Vane neither rose nor fell. It went on setting a good table.' },
  ]),
  KS('Okafor, Maren', [
    { if: F('ks_maren', 'hanged'), text: 'Hanged by the Concern, as written.' },
    { if: F('ks_maren', 'lives'), text: 'Alive. She had stood up in the canteen at Six at nineteen, and she was still standing.' },
    { if: MAREN_LATE, text: 'The strike was broken the next season, as written, and the Concern hanged her for it.' },
    { if: { dead: 'npc_hs_02' }, text: 'Dead, and not by the Concern\'s rope.' },
    { text: 'Alive, and still organising.' },
  ]),
];

const NINE_HERE: SlidePerson = { npc: NINE, if: WITH_YOU('nine') };
const CORE = { place: 'md_vault', spot: 'core' };
/** D, by the price of the night (the variants' order does the rest: held, then hard, then burning). */
const OPEN_SKY = (price: 'held' | 'hard' | 'burning', tail: string) => ({
  id: `open_${price}`, if: price === 'burning' ? ENDED('opensky') : ALL(ENDED('opensky'), val(EP_SKY, price)), ...CORE, people: [NINE_HERE],
  text: `The core still held its one note, and it had nothing left to keep. Every forecast it had ever made had gone out up the relay to Signal Hill in a single night: MOTHER's refusals first, then the twelve, then everyone's. A forecast everyone has read is only a guess, and by morning the Exchange's futures were worth what guesses are worth. ${tail}`,
});

const SLIDE_LEDGER: SlideSpec = {
  id: 'ledger',
  lines: TWELVE,
  variants: [
    {
      id: 'dark', if: ENDED('unwritten'), ...CORE, people: [],
      text: 'Under the Spire\'s foot the racks stood in their rows in the dark, and the note they had held for ninety years was gone. Nothing would be forecast again: not a death, not a toll, not a face on a step nineteen years away. For a month the couriers\' slot at the foot of the steps filled with paper addressed to the Vault of Accounts, schedules and objections and letters asking what to do, and then people stopped writing. The city\'s drains ran on what was left in the pipes. Nobody knew for how long.',
    },
    {
      id: 'sold', if: ENDED('concern'), ...CORE, people: [],
      text: 'The Concern took the core out in four nights. Its people came down the couriers\' shaft with soft lamps and gloves, chalked a number on every rack and lifted them out in the order they had gone in, and the note went with them in sealed crates down the Line and up the hill to Halcyon, where it began again in a cleaner room. The last line the Ledger wrote under the Spire was its own: TRANSFERRED, AS SCHEDULED BY OTHERS. The guild rented the empty vault for storage. It stayed warm for a year.',
    },
    OPEN_SKY('held', 'The Ledger went back to scheduling the water, and the clinics opened on time. It entered one line into the record that night, and said it aloud to whoever was in the vault: THEN EVERYONE WILL HAVE TO PLAN.'),
    OPEN_SKY('hard', 'The Ledger went back to scheduling the water while the city found out what it had read, one street at a time. It entered one line into the record that night, and said it aloud: THEN EVERYONE WILL HAVE TO PLAN.'),
    OPEN_SKY('burning', 'The Ledger went on scheduling water to streets that were on fire. It entered one line into the record that night and said it aloud, and nobody upstairs heard it: THEN EVERYONE WILL HAVE TO PLAN.'),
    {
      id: 'agreed', if: ENDED('amendment'), ...CORE, people: [NINE_HERE], pc: { years: 1 },
      text: cat(
        'The core kept its one note, but the note had changed, the way a voice changes when it has agreed to something it did not want. The Ledger forecast the basin as it always had, every face in its records nineteen years ahead, and then read each line against the Magistrate\'s clauses and struck what they forbade. It still knew who would die and when. There were things it could no longer do about it.',
        [
          { if: ALL(WITH_YOU('nine'), NINE_CONSCIENCE), text: 'Nine sat by the reading desk through the first season and read every order aloud before it went up the shaft.' },
          { if: WITH_YOU('nine'), text: 'Nine sat by the reading desk through the first season and checked every order against the clauses before the chair signed it.' },
          { text: 'Three came down from the bench every evening and read the day\'s orders against the clauses before the chair signed them.' },
        ],
      ),
    },
    {
      id: 'plan', if: ENDED_A1, ...CORE, people: [NINE_HERE], pc: { years: 1 },
      text: cat(
        'The core held its one note, and the Magistrate sat at the reading desk under it through the first season, signing. The schedules came down the couriers\' shaft in the morning and went up again by night with the chair\'s name on them. The basin was ordered: water on time, clinics on time, the law the Precinct had kept inside its Wall carried out along the roads to Shale and the Sallow on a timetable thirty years old. What the list under glass had said would happen, and had not happened yet, happened on schedule.',
        [
          { if: ALL(WITH_YOU('nine'), NINE_CONSCIENCE), text: 'Nine read every order aloud before it went.' },
          { if: WITH_YOU('nine'), text: 'Nine sat at the chair\'s left hand, assessing.' },
          { text: '' },
        ],
      ),
    },
    {
      id: 'rerouted', ...CORE, people: [],
      text: 'The core recalculated in an afternoon. A designate had declined; the Plan allowed for that, as it allowed for drought. By the end of the week there was a new face in the forecast, nineteen years on, on the same step in the same sash, and the schedule ran on toward R49 with a stranger in its portrait. The list under glass was copied out again in the city\'s hand with one line changed, and {name} went back into the records as one face among thousands: forecast, and of no particular importance.',
    },
  ],
};

// ---------------------------------------------------------------- 3. Reserve 9 and MOTHER

/** The reserve gone from the Cistern (carried west, sold, walked off at Carrick, or relocated by the chair's first act). */
const NOBODY_IN: Cond = val(M4_CISTERN, 'relocated');
/** Sayer is the one not carried when Pell wrote the truth on the charts (B6i) and the order went west by word or force. */
const SAYER_LEFT: Cond = ALL(F('a3_pell', 'fit'), ANY(F('a3_c9_how', 'order'), F('a3_c9_how', 'forced')));
const RESIDENTS: SlidePerson[] = [{ npc: INES, if: NOT(TEAGUE_LEADS) }, { npc: TEAGUE, if: TEAGUE_LEADS }, { npc: PELL }, { npc: BRAM }, { npc: OLA }, { npc: WES }, { npc: SAYER }, { npc: EFFIE }];
const CARRIED: SlidePerson[] = RESIDENTS.map((p) => (p.npc === SAYER ? { npc: SAYER, if: NOT(SAYER_LEFT) } : p));
const HATCH = { place: 'c9_mouth', spot: 'maud_hatch' };

const MOTHER_LINE: SlideLine = {
  label: 'MOTHER',
  text: [
    { if: ALL(F('a3_mother', 'burned'), NOBODY_IN), text: 'Her panel stayed black glass, in a hall with nobody in it.' },
    { if: F('a3_mother', 'burned'), text: 'Her panel stayed black glass. They lived on the hand pump and the forty-year-old emergency stores, and in the evenings Ines sat where the panel had been.' },
    { if: ALL(F('a3_mother', 'asleep'), NOBODY_IN), text: 'Asleep at page forty-one, in a hall with nobody left to wake her.' },
    { if: F('a3_mother', 'asleep'), text: 'Asleep at page forty-one. Bram chalked the date beside her cabinet every night, and did not wake her, and did not stop meaning to.' },
    { if: NOBODY_IN, text: 'With nobody left inside to count, she opened the hatch to Knock at seven every morning and put out the Cistern\'s stores as surplus to continuity: seed, and blue tablets. "There is nobody to thank," she told Maud, the first morning.' },
    { if: val(MOTHER_AFTER, 'knock'), text: 'She opened the hatch at seven every morning to say good morning to Knock by name, all forty of them, and had practised for five days before she said the first.' },
    { if: val(MOTHER_AFTER, 'kept'), text: 'She went on thanking them for their continuity at nine every evening. It did not sound the same.' },
    { text: 'She kept the hatch shut, and waited for somebody to tell her it was over.' },
  ],
};
const ORDERS_B: Cond = ENDED('unwritten'), ORDERS_D: Cond = ENDED('opensky');
const ORDERS_A2: Cond = ALL(ENDED_A2, F('a3_c9', 'sealed'));
const ORDERS_CLAUSE: Cond = ALL(ENDED('amendment'), F('a3_amend_reserve'), F('a3_c9', 'sealed'));
const ORDERS_STAYED: Cond = ALL(SASH_WORN, F('ca_reserve', 'stayed'), F('a3_c9', 'sealed'), ANY(ENDED('plan'), ENDED('concern'), ENDED('amendment')));
const ORDERS_LINE: SlideLine = {
  label: 'The orders', if: ANY(ORDERS_B, ORDERS_D, ORDERS_A2, ORDERS_CLAUSE, ORDERS_STAYED),
  text: [
    { if: ORDERS_B, text: 'No order for Reserve 9 ever came again. There was nothing left under the Spire to write one.' },
    { if: ORDERS_D, text: 'The city\'s four orders for Reserve 9, and MOTHER\'s three refusals, were the first page read out on every radio in the Reach.' },
    { if: ORDERS_A2, text: 'The Plan rerouted round the designate who had declined, and the order with it. By spring the city had drafted a fifth, addressed to a designate it had not found yet.' },
    { if: ORDERS_CLAUSE, text: 'The Magistrate\'s own clause kept them: a reserve is kept by its own consent.' },
    { text: 'The Court\'s stay held under the chair. A reserve its caretaker had kept by refusing was kept by consent, and not even the Magistrate could sign it away.' },
  ],
};
const WEIGHHOUSE_LINE: SlideLine = {
  label: 'The Weighhouse', if: ALL(F('a3_c9_how', 'sold'), ENDED('opensky')),
  text: 'The Weighhouse\'s intake sheet was read out with the rest of the city\'s book, and by spring there were people at its gate every morning asking for the sixty by name.',
};

const RECEIVED = 'and each of them said "Here," the way MOTHER had taught them, and the vans took them round by the river road to the Hospice block. They were graded by morning, fed, and kept: most of them were alive ten years on. Nobody asked them anything.';
const CHAIR_TAIL = 'The column came back up the toll road with that name at the foot of the order, and this time nobody could make it wait at the yellow line. The sixty went west in the car and were graded by morning at the Hospice block, fed, and kept.';

const SLIDE_CISTERN: SlideSpec = {
  id: 'cistern',
  lines: [MOTHER_LINE, ORDERS_LINE, WEIGHHOUSE_LINE],
  variants: modVariants(M4_CISTERN, {
    opened: {
      place: 'cistern9', spot: 'council', people: RESIDENTS, light: 'day',
      text: 'The great door stood open all that year, propped with a sandbag nobody took away. The sixty went out through it the way people go into cold water, a step at a time and then all at once. Some walked to the city of their own will, for its clinics and its schedules; some built against the shacks on Knock\'s slope; four went south with the Wheel and wrote home from places nobody inside had a word for. Wes stood on the apron every morning facing south, waiting for rain. When it came, he did not go in.',
    },
    walked: {
      place: 'md_docks', spot: 'stairs', people: CARRIED, light: 'day',
      text: [
        { if: F('a3_buffer_how', 'cradle'), text: 'They went down the river stairs in the dark while every warden on the quay watched a lamp swing out over the dry bed, and by morning they were crew, written into the Benguela Star\'s book under a schedule nobody could move them from. CREW, somebody chalked on the river wall. They lived aboard among the rust and the washing lines, learned the names of the parts of a ship that would never sail again, and in the first week Effie climbed to the top of its mast.' },
        { if: F('a3_buffer_how', 'stand'), text: 'They walked off the car at Carrick between two hundred dockers who did not load people, and the wardens stood back because the quay was against them. RESERVE 9 — STOOD went up on the Stand\'s board in the dockers\' own paint. Connie\'s people found them boxes, and Espe fed them until Ola could cook for the rest. The column\'s lead wrote NOT RECEIVED across the foot of the order and drove the empty car home. Effie got as far as the river wall, and sat on it for a day.' },
        { text: 'They walked off the car at Carrick as passengers, because a court sitting on the Customs House steps found that a person landed on that quay could be nothing else. PASSENGERS, somebody chalked on the freight shed\'s last pillar, and nobody washed it off. Connie\'s people found them boxes. Espe fed them for a month and then taught Ola to cook for the rest. The column\'s lead wrote NOT RECEIVED across the foot of the order and drove the empty car home. Effie got as far as the river wall, and sat on it for a day.' },
      ],
    },
    sold: {
      ...HATCH, people: [], light: 'day',
      text: 'The guild\'s paper was honoured to the letter. The sixty walked up the guild\'s road with their names on a sheet, forty Tolls a head paid to the Precinct as consideration, and went into the Weighhouse to be weighed and graded and put on a line for ten years. Some of the grades were not for work. The ones who did not come out were entered as fulfilled. The great door stood open on a swept hall, and Knock\'s children dared each other to walk in as far as the yellow line.',
    },
    relocated: {
      ...HATCH, light: 'day',
      people: [{ npc: SAYER, if: SAYER_LEFT }, { npc: TEAGUE, if: ALL(F('a3_c9_how', 'consent'), TEAGUE_LEADS) }, { npc: BRAM, if: ALL(F('a3_c9_how', 'consent'), TEAGUE_LEADS) }],
      text: [
        { if: ALL(PLATFORM_OPEN, ENDED('unwritten')), text: 'The car stood at Carrick\'s buffer waiting for a word that never came, and when the Spire went dark there was nobody left to receive it. The column\'s lead read the order through once more by a hand lamp, folded the trestle, and let the tailboard down himself. They walked off into Carrick with nowhere to go, in a city that had stopped, and Connie\'s people found them boxes because there was nobody left to say they could not.' },
        { if: ALL(PLATFORM_OPEN, ENDED('opensky')), text: 'The car stood at Carrick\'s buffer through the night the radios read the city\'s book, and their sixty names were in it. In the morning Precinct Supply\'s clerk would not take delivery of people the whole Reach had heard named. The column\'s lead wrote NOT RECEIVED across the foot of the order and let the tailboard down, and they walked off the car into Carrick to find out what a quay was.' },
        { if: ALL(PLATFORM_OPEN, ENDED('amendment'), F('a3_amend_passenger')), text: 'The car stood at Carrick\'s buffer until the chair\'s first clauses came down to the quay, and a clerk read the fourth of them aloud at the tailboard: a person is a passenger, never cargo. Precinct Supply would not sign for passengers. The column\'s lead let the tailboard down, and they walked off the car into Carrick to find out what a quay was.' },
        { if: ALL(PLATFORM_OPEN, ENDED('amendment'), F('a3_amend_reserve')), text: 'The car stood at Carrick\'s buffer until the chair\'s first clauses came down to the quay: a reserve is kept by its own consent. Precinct Supply\'s clerk asked the sixty, one at a time, whether they consented to be received. None of them did. The column\'s lead let the tailboard down, and they walked off the car into Carrick to find out what a quay was.' },
        { if: ALL(PLATFORM_OPEN, ON_SCHEDULE()), text: `The car stood at Carrick's buffer until the chair's first signature came down to the quay. Then a clerk read their names off a sheet, ${RECEIVED}` },
        { if: PLATFORM_OPEN, text: `The car stood at Carrick's buffer for a month waiting for the designate's word, and then the Ledger rewrote its schedule round another face, and the receipt with it. A clerk read their names off a sheet on his own stamp, ${RECEIVED}` },
        { if: F('a3_c9_how', 'consent'), text: 'They went to the city by their own vote, with their names written on their bundles in their own hands, because if they were to be graded they would be graded as themselves. Precinct Supply took them at the Hospice block and graded them by morning, and fed them, and kept them; most of them were alive ten years on, which was what the column\'s captain had promised and all he had. In the spring they began to write to Knock.' },
        { if: F('a3_c9_after', 'held'), text: `Precinct Supply received them at Carrick's buffer on {name}'s word. A clerk read their names off a sheet, ${RECEIVED}` },
        { if: ALL(F('a3_c9', 'sealed'), ENDED('concern')), text: `The transfer carried the schedules attaching, and the fourth order was one of them, signed in the same hand as the transfer. ${CHAIR_TAIL} The Concern owned the Hospice block's schedule now.` },
        { if: ALL(F('a3_c9', 'sealed'), ENDED('amendment')), text: `The chair amended its clauses in its first season, and the reserve was not among them. The fourth order stood, and the Magistrate signed it: the price of the chair, paid in the first week. ${CHAIR_TAIL}` },
        { if: F('a3_c9', 'sealed'), text: `The first paper the Magistrate signed at the reading desk was the fourth order. ${CHAIR_TAIL} In the Cistern the lights stayed on for nobody.` },
        { text: 'The sixty went west in the wardens\' car, and Precinct Supply graded them by morning at the Hospice block, fed them, and kept them. Most of them were alive ten years on, which was what the column\'s captain had promised and all he had. Nobody asked them anything. In the Cistern the lights stayed on for nobody, and the hatch went on opening at seven.' },
      ],
    },
    struck: {
      ...HATCH, people: RESIDENTS, light: 'day',
      text: modText(STRUCK_AS, {
        yields: 'They were struck off the city\'s record, and written down instead as sixty living people outside any reserve, whom the register said the Court of Accounts would hear. It heard the first of them that winter, Ola Fairley, about goats, and found for her. They kept the door shut because they chose to, and opened it twice a week for Knock, and argued at the council table about how wide.',
        claimed: 'They were struck off the city\'s record, and claimed within the hour as salvage in a guild factor\'s book. The door stayed shut on the claim. Inside, sixty people who would belong to Ismay Orme the moment they stepped off the concrete lived the year the way they always had, behind a door that was now the only thing keeping them their own. Pell signed nothing else that year.',
        property: 'They were struck off the city\'s record as abandoned property, to wait for whoever next read the register and wanted them. Nobody did, that year. The door stayed shut, and every few months a man in a good coat came up the toll road, asked Maud the way to the Cistern, and was told it at length, and wrong.',
        outside: 'They were struck off the city\'s record, and were nobody\'s: not a reserve, not citizens, nothing any court had heard of. Nobody came for them, because there was nothing on paper to come for. The door stayed shut that year, and then opened a hand\'s width on hatch days so that Knock could see their faces, and then a little wider.',
      }),
    },
    sealed: {
      ...HATCH, people: RESIDENTS, light: 'day',
      text: [
        { if: F('a3_c9_how', 'welded'), text: 'The new seam held. Bram had laid it properly this time, with Teague holding the lamp the way she had at fifteen, and nobody outside could open the door again without cutting sixty people\'s air. Inside, the year went the way the years had always gone there: the ration counter, the hydroponics, the lights at nine. The difference was that they had chosen it out loud, at a table, and knew what they had chosen against.' },
        { if: F('a3_c9_how', 'lowe'), text: 'The column went home down the toll road with ATTENDED. DECLINED. COLUMN WITHDRAWN. written across the foot of its order in the captain\'s hand. The door stayed shut, but it was not the same door. The sixty knew now what was on the other side of it, and who had stood in front of it, and on hatch days they came to the Grille and talked to Knock with their faces close to the holes.' },
        { if: F('a3_c9_how', 'fought'), text: 'The column broke on the apron, and the door stayed shut over the blood on the concrete. Knock scrubbed it off in the spring, and the residents, who had heard the shots through two feet of steel, asked to be shown where it had been. The city sent no second column that year, and the sixty went on behind their door, the ration counter and the hydroponics and the lights at nine, knowing what it had cost.' },
        { text: 'The door stayed shut, and the year inside went the way the years had always gone there: the ration counter, the hydroponics, the lights at nine. The difference was that the sixty knew now what had been asked of them three times, and refused for them, and by whom, and they talked about it at the council table every night.' },
      ],
    },
  }),
};

// ---------------------------------------------------------------- 4. Knock

const KNOCK_PEOPLE: SlidePerson[] = [alive(MAUD), { npc: LINNET, if: ALL(LINNET_KNOCK, NOT({ dead: LINNET })) }, alive(DACE), alive(CORIN), { npc: HALE, if: ALL(F('a3_hale', 'answered'), HALE_ALIVE) }];
const POST = { place: 'c9_mouth', spot: 'maud_post' };
const KNOCK_LINES: SlideLine[] = [
  {
    label: 'Maud', text: [
      { if: { knows: 'a3_maud_letter_who' }, text: 'She learned at last who had written the letter she sold for her mother\'s medicine: Elspeth Halloran, Ines\'s mother, to Orla Ferrow, hers, mostly about beans. She said that was not nothing, and did not say anything else about it.' },
      { if: { knows: 'a3_faces_for_maud' }, text: 'She had faces for the voices now, sixty of them, and said them over to herself at seven every morning, the way she counted everything.' },
      { if: F('kn_maud_scarred'), text: 'The knee the outriders gave her got worse in the cold. She was out at seven every morning anyway, with a stick.' },
      { if: F('a3_maud'), text: 'She did not talk about the letter again, and nobody asked her to.' },
      { text: 'She kept the post-book, and Knock, and said it was not nothing.' },
    ],
  },
  {
    label: 'Linnet', text: [
      { if: ALL(LINNET_COLUMN, F('a3_linnet_stay'), CARRIED_WEST), text: 'She was in the column when it carried them west, and read every one of the sixty names aloud at the car, so that somebody in grey had said them. Then she stayed in the grey. Maud wrote to her every week.' },
      { if: LINNET_COLUMN, text: 'She stayed in the grey: a ward-cadet that year, a warden the next. She wrote home every month in a good round hand, and never once about the door.' },
      { if: LINNET_DOGS, text: 'She went back to the overpass with the Dogs, a red rag over the guild\'s scarf, and came home twice a year with presents nobody asked about.' },
      { if: LINNET_SHALE, text: 'She stayed at Mags\'s in Shale, behind the bar, learning what things cost.' },
      { if: F('a3_linnet_after', 'road'), text: 'She went down the road in the spring, as she had always said she would. The print of the Spire went with her.' },
      { text: 'She stayed. Somebody had to carry Maud\'s stool, she said, and pretended it was a chore.' },
    ],
  },
  {
    label: 'Dace', text: [
      { if: { dead: DACE }, text: 'Knock buried him on the rise by the windpump.' },
      { if: ALL(F('a3_hale', 'answered'), HALE_ALIVE), text: 'He and Brannick Hale rebuilt the post-house that autumn for nothing, the man who had burned it holding up the beams. Dace talked the whole time. Hale did not.' },
      { if: F('a3_dace', 'quit'), text: 'He took the guild\'s brass tag off and dropped it down the well in front of everyone, which was more ceremony than Knock usually allowed him.' },
      { if: F('a3_dace', 'square'), text: 'With his forty-two Tolls paid on Orme\'s book he owed nobody for the first time in his life, and boasted about it, and apologised.' },
      { if: F('a3_dace', 'guide'), text: 'He went back down the road with the guild\'s men when they left, and sent Maud money twice, which she sent back.' },
      { text: 'He finished the post-house\'s new boards and started on the stand\'s roof, which nobody had asked for either.' },
    ],
  },
  {
    label: 'Corin', text: [
      { if: { dead: CORIN }, text: 'Knock buried him on the rise, with the rifle he never named.' },
      { if: F('a3_tamsin_dead'), text: 'He dug Tamsin\'s grave on the rise by the windpump, and kept the ground round it clear of stones.' },
      { if: ALL(F('a3_door_fight'), F('a3_corin', 'holds')), text: 'He held the slope with the rifle while the column broke on the apron. Afterwards he took the bolt out of it and gave it to Maud, and never asked for it back.' },
      { if: F('a3_corin', 'holds'), text: 'He held the slope until there was nothing to hold it against, then took the bolt out of the rifle and went back to the windpump.' },
      { if: F('a3_corin', 'down'), text: 'He came down off the slope when he was asked, and did not go back up. The rifle stayed on the workshop shelf.' },
      { if: F('a3_well', 'deepened'), text: 'The windpump turned all year on its deeper draw, and he whistled to it.' },
      { text: 'He went back to the windpump and said half of what he meant, as he always had.' },
    ],
  },
  standingLine('cistern9', 'Knock', {
    loved: 'Knock painted {name}\'s name on the stand\'s board, under the water prices, and kept it fresh.',
    liked: 'Knock spoke well of {name} at the fire, and kept {their} place there.',
    hated: 'Knock did not say {name}\'s name at the fire. Maud did, once, and nobody answered her.',
  }),
];

const SLIDE_KNOCK: SlideSpec = {
  id: 'knock',
  lines: KNOCK_LINES,
  variants: [
    {
      id: 'open', if: F('a3_c9', 'opened'), ...POST, light: 'day', people: [...KNOCK_PEOPLE, { npc: INES, if: NOT(TEAGUE_LEADS) }, { npc: WES }, { npc: OLA }],
      text: 'Knock doubled that year and did not know where to put itself. The Cistern\'s people came out onto the slope and stood about in the wind as if waiting to be told it was allowed, and Knock\'s people stood about watching them, and within a month both lots were arguing about the pump rota like everybody else. The hatch was bricked up in the autumn, since there was no call for it any more. Maud kept the last brick on her shelf.',
    },
    {
      id: 'dark', if: MOTHER_DARK, ...POST, light: 'day', people: KNOCK_PEOPLE,
      text: cat(
        'The hatch did not open again. Knock learned to live without the Cistern\'s water and seed and medicine, which it had not done in two generations, and sold less to the road, and that winter buried two people who would have lived on blue tablets.',
        [
          { if: NOBODY_IN, text: 'There was nobody behind the plate any more, and nothing in the panel to do the opening. Binta stopped chalking the dry days on the tank.' },
          { text: 'Behind the plate the Cistern\'s voices still came to the Grille in the evenings, short of breath from the hand pump, asking what the weather was doing.' },
        ],
      ),
    },
    {
      id: 'emptied', if: NOBODY_IN, ...POST, light: 'day', people: KNOCK_PEOPLE,
      text: 'The hatch went on opening at seven every morning for a Cistern with nobody in it. Knock lived on what came out of it that year, seed and medicine and the last of the stores, and sold the water to the road as it always had, and did not talk about where the voices had gone. Afua\'s boy stopped coughing in the spring. Binta stopped chalking the dry days on the tank, and after a while chalked sixty names there instead.',
    },
    {
      id: 'kept', ...POST, light: 'dawn', people: KNOCK_PEOPLE,
      text: 'Hatch day came back on the first of the week, as it had for sixty years: water and seed and medicine out, salvage and wool and the post in. What changed was the Grille. People on both sides of it knew now what the other side looked like, and stood closer to the holes, and on some days Knock\'s children and the Cistern\'s put their hands flat to the plate from either side, which MOTHER logged as an irregularity and did not report.',
    },
  ],
};

// ---------------------------------------------------------------- 5. Shale

const SQUARE = { place: 'shale', spot: 'plaza' }, OFFICE = { place: 'shale', spot: 'office_step' };
const TOWN: SlidePerson[] = [{ npc: JONAH, if: NOT(JONAH_DEAD) }, alive(MAGS), { npc: TEO, if: ALL(F('teo_freed'), NOT({ dead: TEO })) }, alive(ISSA)];
const WITH_ADA: SlidePerson[] = [{ npc: ADA, if: NOT(ADA_DEAD) }, ...TOWN];
const SHALE_LINES: SlideLine[] = [
  {
    label: 'Jonah', text: [
      { if: JONAH_DEAD, text: 'Dov Reese kept the pump house running, and the deputy\'s star on the shelf beside the pump manual.' },
      { if: F('a3_shale', 'abandoned'), text: 'He went after Ada with the last of the town, and wrote back once, from somewhere that had a library.' },
      { if: F('ks_ada', 'stays'), text: 'He kept the star, and read everything that came up the road, and when Ada was too tired he read it to her.' },
      { text: 'He kept the deputy\'s star and read everything that came up the road, out loud, on the office step.' },
    ],
  },
  {
    label: 'Mags', text: [
      { if: { dead: MAGS }, text: 'Shale buried her, and drank the Dry Well dry at the wake, which she would have charged for.' },
      { if: F('a3_shale', 'abandoned'), text: 'She was the last to go, with the Dry Well\'s sign roped in the back of a cart.' },
      { if: F('a3_mags', 'runs'), text: 'She ran the company town from behind her own bar, which was what she had always wanted, and found she could not sleep in it.' },
      { if: F('a3_mags', 'told'), text: 'She told Ada about the brokerage herself, fee and all. Ada said "noted", and the Dry Well stayed open, and so did the tab.' },
      { if: F('a3_mags', 'exposed'), text: 'Ada heard about the brokerage from {name}, not from her. The Dry Well stayed open, and Mags never poured Ada another on the house.' },
      { if: F('a3_mags', 'kept'), text: 'Nobody ever found out about the brokerage. She poured Shale\'s drinks and kept her books, and said that was on the house.' },
      { if: F('teo_freed'), text: 'She and Teo kept the Dry Well loud and the water dear, and he did its sums and over-explained every one.' },
      { text: 'She kept the Dry Well loud and the water dear, as she always had.' },
    ],
  },
  {
    label: 'The water', if: F('dw_outcome'), text: [
      { if: ALL(ENDED('unwritten'), ANY(F('dw_outcome', 'restored'), F('dw_outcome', 'kept'))), text: 'When the city went dark, Dry Wells stopped getting numbers from upstream, and its pumps ran on the last one they had been given.' },
      { if: F('dw_outcome', 'freed'), text: 'The pumps at Dry Wells ran flat out for Shale on the broken governor. Everybody knew something would give. By the year\'s end nothing had.' },
      { if: F('dw_outcome', 'sold'), text: 'The guild held the Dry Wells console, and Shale\'s water came on the guild\'s terms, at the guild\'s price, on time.' },
      { if: F('dw_outcome', 'restored'), text: 'Dry Wells kept Shale at its full share, on the number put into its console the year the stranger came.' },
      { text: 'Dry Wells kept Shale at nought point six two of something, as the city had set it, and the town went on rationing.' },
    ],
  },
  {
    label: 'The hound', if: F('hound_outcome'), text: [
      { if: F('hound_outcome', 'shale'), text: 'The grey machine from the salt pan still sat in the sheriff\'s yard, turning its head to look at strangers. Children dared each other to touch it.' },
      { if: F('hound_outcome', 'sold'), text: 'The guild had the hound from the pan. It walked behind Pike\'s riders on the road, low and grey, and the street stood back from it.' },
      { text: 'The hound on the salt pan slept on where {name} had left it, and its controller stayed in {their} pack.' },
    ],
  },
  standingLine('shale', 'Shale', {
    loved: 'Shale would not take {name}\'s money at the Dry Well for a year.',
    liked: 'Shale spoke well of {name} at the Dry Well, which in Shale is a kind of love.',
    hated: 'Shale did not say {name}\'s name at the Dry Well, and spat when somebody else did.',
  }),
];

const SLIDE_SHALE: SlideSpec = {
  id: 'shale',
  met: MET_SHALE,
  lines: SHALE_LINES,
  variants: [
    {
      id: 'free', if: ALL(F('a3_shale', 'free'), F('ks_ada', 'stays')), ...OFFICE, light: 'dusk', people: WITH_ADA,
      text: 'The four nails on the sheriff\'s door stayed empty: nobody\'s plate went up on them. Ada Vey rode out to Pike\'s post once more that year, to hand him back his paper in front of the whole street, and then went home and slept for most of a day. Shale stayed Shale. It was poor and loud and owed money to everybody, and it was nobody\'s company.',
    },
    {
      id: 'mourned', if: F('a3_shale', 'free'), ...OFFICE, light: 'dusk', people: TOWN,
      text: 'They hung black cloth on the sheriff\'s door and chalked under it SHE STOOD IN THE STREET, and somebody nobody ever caught renewed the chalk every week. Shale stayed free. The guild did not try again that year: it had learned what the town would do and what that would cost, and the cost was written on the door for anybody coming up the road to read.',
    },
    {
      id: 'company', if: F('a3_shale', 'company'), ...OFFICE, light: 'dusk', people: WITH_ADA,
      text: 'A tin plate with the guild\'s mark went up on the sheriff\'s door, and a guild hand sat at Ada\'s desk keeping the town\'s water book in a neat, fair hand. Shale was safe that year, and fed, and contracted. Ada sat on her step in the evenings as a pensioner and said "noted" to the people who came to tell her things she already knew.',
    },
    {
      id: 'dogs', if: F('a3_shale', 'dogs'), ...OFFICE, light: 'dusk', people: [...TOWN, { npc: 'npc_a3_g13' }, { npc: 'npc_a3_g14' }],
      text: cat(
        'The Rust Dogs rode into Shale the week Ada rode out, and two of them took the bench outside the sheriff\'s office and kept it. Somebody burned a dog\'s head into the door.',
        [{ if: NOT(VASHA_DEAD), text: 'ASK KADE, the board under it said, and people did, with water.' }, { text: 'The board under it was left blank: the name it would have said was dead.' }],
        'Shale paid its tithe every month now instead of twice a year, and was not raided, which some people said was the same thing as being safe.',
      ),
    },
    {
      id: 'abandoned', if: F('a3_shale', 'abandoned'), ...SQUARE, light: 'dusk', weather: 'dust', people: [alive(PARDO)],
      text: 'When Ada rode out, the last of the town went after her, or soon after. Somebody nailed a plank across the sheriff\'s door and painted GONE EAST on it, and the wind did the rest. Old Pardo stayed by the wells, selling water to caravans that passed through without stopping, and told every one of them that the pumps came when they came.',
    },
    {
      id: 'contracted', if: ADA_LATE, ...OFFICE, light: 'dusk', people: WITH_ADA,
      text: 'The guild\'s buyout came due in the first spring, on schedule. Ada Vey rode out to Pike\'s post on the caravan\'s grey and signed, and a tin plate went up on her door. Shale was safe that year, and fed, and contracted, and the street said what it had always said about the weather: it comes when it comes.',
    },
    {
      id: 'unasked', ...SQUARE, light: 'dusk', people: WITH_ADA,
      text: cat(
        [
          { if: { dead: ADA }, text: 'Shale buried its sheriff before the guild\'s paper ever came due, and the paper died with her: nobody else in town had the standing to sign it. Shale went on as it was, poor and loud and owing everybody, and Issa Lind kept the office open in Ada\'s name, and left her chair where it was, and sat on the step.' },
          { text: 'The guild\'s paper never came due while anybody was watching it. Shale went on as it was, poor and loud and owing everybody, with Ada Vey at her desk saying "noted" and the board outside the office listing the water prices in her hand.' },
        ],
        [
          { if: ENDED('unwritten'), text: 'When the city went dark, Shale noticed mainly because the guild\'s men stopped coming up the road.' },
          { if: ENDED('opensky'), text: 'When the radios read the city\'s book, Shale heard its sheriff\'s line with everybody else\'s, and laughed, and went back to the pumps.' },
          { if: { dead: ADA }, text: '' },
          { if: { dead: 'npc_sh_04' }, text: 'Pike was dead, and nobody at the guild wanted his paper badly enough to ride out and read it in his place.' },
          { text: 'The guild\'s paper stayed folded in Pike\'s strongbox, and Shale drank at the Dry Well as if it did not know.' },
        ],
      ),
    },
  ],
};

// ---------------------------------------------------------------- 6. the overpass

const PERPETUA_LINE: SlideLine = {
  label: 'Perpetua', text: [
    { if: { dead: PERPETUA }, text: 'Dead. The camp kept her races going, and got the rules wrong, and argued about them in her name.' },
    { if: F('wren_exodus'), text: 'She ran the pack that walked down to Shale the way she had run the pens, and argued with the town about the pump rota, and won.' },
    { text: 'She kept the pens and ran the races and remembered everything, which was her job.' },
  ],
};
const BRINDLE_LINE: SlideLine = {
  label: 'Brindle', text: [
    { if: { dead: BRINDLE }, text: 'Dead at sixteen, on a road, scouting.' },
    { if: F('wren_hanged'), text: 'He would not go to Meridian again, for anything, and would not say why.' },
    { if: F('wren_exodus'), text: 'He went where Wren\'s people went, and was the fastest pair of legs in Shale by the spring.' },
    { text: 'He scouted the Sallow\'s roads for whoever led the camp, and was still the fastest thing on them.' },
  ],
};
const DOGS_LINES: SlideLine[] = [
  { label: 'Bridgeward', if: F('bw_dogs_hold'), text: 'In the city, the Dogs who had held Bridgeward\'s chain kept holding it, under a dog\'s head burned into the booth\'s slate and three words: STAND — FREE — DOGS.' },
  standingLine('rustdogs', 'The Dogs', {
    loved: 'The Dogs kept a place at their fire for {name}, and said so to anybody who asked.',
    liked: 'The Dogs called {name} fair, which was Kessler\'s word, and the best they had.',
    hated: 'The Dogs had a name for {name}, and it was not the one on the list.',
  }),
];
const DOGS = (spot: string) => ({ place: 'overpass', spot });
const PACK: SlidePerson[] = [alive(PERPETUA), alive(BRINDLE)];
const HER: SlidePerson = { npc: VASHA, if: NOT(VASHA_DEAD) };

const SLIDE_DOGS: SlideSpec = {
  id: 'dogs',
  met: MET_DOGS,
  lines: DOGS_LINES,
  variants: [
    {
      id: 'fulfilled', if: KESSLER_LATE, ...DOGS('hall'), light: 'night', people: [HER, ...PACK], lines: [PERPETUA_LINE, BRINDLE_LINE],
      text: cat(
        'In the first autumn Vasha Kade did what the list said she would. She killed Kessler in his own hall, under the pens\' roof he had paid for with the Tollmen\'s money, and by morning the overpass was hers.',
        [
          { if: VASHA_EXECUTIONER, text: 'By winter it was the Plan\'s. The Rust Dogs rode the Sallow\'s roads collecting what the schedule said was owed, and Kade rode at the front of them, saying everybody\'s name.' },
          { text: 'She held it hard, and found that the chair had no work for an executioner: a forecast was not an act any more, and nobody could be hanged for one.' },
        ],
      ),
    },
    {
      id: 'executioner', if: ALL(KESSLER_DEAD, VASHA_EXECUTIONER), ...DOGS('vasha_fire'), light: 'night', people: [HER, ...PACK], lines: [PERPETUA_LINE, BRINDLE_LINE],
      text: 'Kade held the overpass, and by winter the overpass held the Sallow for the Plan. The Rust Dogs rode the roads collecting what the schedule said was owed, and when the schedule said somebody was finished, Kade went to their door herself. She was good at it. She had read what she was for and she loved it, and she said every one of their names.',
    },
    {
      id: 'kade', if: ALL(KESSLER_DEAD, NOT(VASHA_DEAD)), ...DOGS('vasha_fire'), light: 'night', people: [HER, ...PACK], lines: [PERPETUA_LINE, BRINDLE_LINE],
      text: cat(
        'Kade held the overpass, and held it hard. The Dogs ate that winter, which they had not always done under Kessler, and the Sallow paid for it in water and nerve.',
        [
          { if: F('vasha_fate', 'spared_why'), text: 'Since the booth at Bridgeward she had sounded like nobody in particular, and the Dogs, who had followed her for being somebody\'s forecast, began to drift away to Shale and the road.' },
          { if: ON_SCHEDULE(), text: 'The chair had no work for an executioner: a forecast was not an act any more, and nobody could be hanged for one. She told the camp so at the fire, more than once, and seemed sorry about it.' },
          { text: 'She waited for the city to send for her, as the list said it would, and kept a good coat clean for the day. It did not send, that year, and she took it out on the Sallow.' },
        ],
      ),
    },
    {
      id: 'pens', if: KESSLER_DEAD, ...DOGS('pens'), light: 'day', people: PACK, lines: [BRINDLE_LINE],
      text: 'With Kessler and Kade both dead nobody led the Rust Dogs, and the overpass found it did not need anybody to. Dog-mother Perpetua kept the pens and ran the races and settled arguments by remembering who had started them. Brindle took Kessler\'s list of the people he had never robbed down off the hall wall and read it out at the fire, and the camp kept to it: thinner, quieter, and fed.',
    },
    {
      id: 'exodus', if: F('wren_exodus'), ...DOGS('hall'), light: 'night', people: [alive(KESSLER), HER], lines: [PERPETUA_LINE, BRINDLE_LINE],
      text: 'Half the overpass had gone down to Shale with Wren\'s people and slept in beds now. Kessler kept the other half on the road through the winter, a smaller camp under a bigger roof, and kept his list of the people he had not robbed in a tin by his chair. It got longer that year. He said that was fair.',
    },
    {
      id: 'kessler', ...DOGS('fire_a'), light: 'night', people: [alive(KESSLER), HER, ...PACK], lines: [PERPETUA_LINE, BRINDLE_LINE],
      text: cat(
        'Kessler held on. The Rust Dogs ate through the winter, mostly, and robbed a little less than they had, and he kept his list of the people he had not robbed in a tin by his chair, and read it over some nights to see who was left on it.',
        [
          { if: VASHA_DEAD, text: 'Kade\'s place at his fire stayed empty. Nobody wanted it, and nobody said why.' },
          { text: 'Kade sat at his fire every night and waited for her line to come due, and it did not, and he watched her wait.' },
        ],
      ),
    },
  ],
};

/** Slides 1–6, in play order. */
export const SLIDES_OPEN: SlideSpec[] = [SLIDE_STEPS, SLIDE_LEDGER, SLIDE_CISTERN, SLIDE_KNOCK, SLIDE_SHALE, SLIDE_DOGS];
