import type { DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  A3_OPEN, ASH, GUILD_IN_PLAY, HALE_HERE, HOUNDS_IN_PLAY, ILYA, IN, KES, KNOCK_WATER, KNOCK_WATERED, LINNET_COLUMN, LINNET_DOGS, LINNET_KNOCK,
  LINNET_SHALE, LOWE, LOWE_DEAD, NINE, ODILE, REYES, TAMSIN, WREN,
} from '../world/a3_conds';
import { d_kn_grille } from './knock';

/**
 * Knock under the column (B6f, Act 3 beat 20a): the home hamlet with the hatch shut and the city's column camped on the toll
 * road opposite the stand, waiting for the designate to attend the door. Knock has been dry since the lockdown; it drinks
 * what the player's earlier roads bought it (Dry Wells' carts, Openfield's barrels) or a cup a head from Corin's well, and
 * the player can add the column's own barrels (asked of its captain) or the windpump turning again (with Corin).
 *
 * The trees: the arrival (`d_a3_home`, the first walk into Knock once the order is read, however the player came) · Maud at
 * the hatch she can't open (`d_a3_maud`: the lockdowns she has counted, the water, the wardens, Linnet, what she wants, and
 * at last the letter she sold, once she trusts the player enough to say it) · Linnet by her fate (`d_a3_linnet`: a cadet in
 * the column, with the Dogs on the slope, at Mags's, or at home) · Dace (`d_a3_dace`: the guild's guide if the guild came,
 * else home with a hammer; his debt can be paid at last) · Corin on the slope with a rifle (`d_a3_corin`: the well, what he
 * will do at the door, Hale, why he left the outriders) · Captain Lowe at the column's table, or Sergeant Reyes if he is dead
 * (`d_a3_lowe`: the attendance clause, the water, the sixty, the third word, the cadet, the guild) · the senior warden
 * (`d_a3_warden`) · Knock's others (`d_a3_kn_r1..r4`) · the Grille in lockdown (`d_a3_grille`: MOTHER says the player's
 * name for the first time; Ines refuses the door a third time and offers the hatch; it carries `d_kn_grille` whole after its
 * Act 3 entries, so nothing before Act 3 changes). The forces at Knock (the Unwritten, the guild's Orme and Hale) are in
 * `a3_forces.ts`. Story notes: story/B6_NOTES_SECRET.md §2.3 (20a) and "As built" → B6f.
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TRUST = (npc: string, by: number): Effect => ({ trust: { npc, by } });
const SEEN = (id: string): Cond => ({ seen: id });
const REMEMBERS = (npc: string, tag: string): Cond => ({ remembers: { npc, tag } });

const MAUD = 'npc_kn_maud', LINNET = 'npc_kn_linnet', DACE = 'npc_kn_dace', CORIN = 'npc_kn_corin', INES = 'npc_c9_01', MOTHER = 'npc_c9_05';
const KRESS = 'npc_a3_g3';

/** How the player came home (B6c; unset until the midnight after a walk home, so unset reads as on foot). */
const ROUTE = (v: string): Cond => F('a3_route_home', v);
const SCARRED: Cond = F('kn_maud_scarred');
const TAM_OUT: Cond = ANY(F('tam_out'), { knows: 'tamsin_replied' });
const TAM_INSIDE: Cond = ALL(F('c9_tamsin_inside'), NOT(TAM_OUT));
const WATER = (id: string): Cond => KNOCK_WATER.values.find((v) => v.id === id)!.if!;
/** The player knows the city has always had the reserve's names from MOTHER's own returns (the census, Pell's chart). */
const KNOWS_RETURNS: Cond = ANY(F('tam_why'), { knows: 'ar_census_seen' }, { knows: 'md_reserves_list' }, { knows: 'tam_why_pell' });
const MAUD_TRUSTS: Cond = { trust: { npc: MAUD, gte: 20 } };
const DROVE: Cond = ALL(ROUTE('column'), F('kn_linnet_will_run'), NOT(LOWE_DEAD));

const leave: OptionDef = { text: '(Leave it.)', exit: true };

type Part = { if?: Cond; t: string };
/** Text from parts that vary on their own (each axis ordered, its default last): every combination, first match wins. */
function mix(axes: Part[][], f: (...t: string[]) => string): { if?: Cond; text: string }[] {
  let combos: { conds: Cond[]; ts: string[] }[] = [{ conds: [], ts: [] }];
  for (const axis of axes) combos = combos.flatMap((c) => axis.map((p) => ({ conds: p.if ? [...c.conds, p.if] : c.conds, ts: [...c.ts, p.t] })));
  return combos.map((c) => (c.conds.length ? { if: c.conds.length === 1 ? c.conds[0] : ALL(...c.conds), text: f(...c.ts) } : { text: f(...c.ts) }));
}

// ---------------------------------------------------------------- home: the first walk into Knock once the order is read

const ARRIVE_HOW: Part[] = [
  { if: ROUTE('column'), t: 'The city\'s car waits by the stand with its tailboard down and its sixty benches empty, and Knock has gone back indoors to watch you from there.' },
  { if: ROUTE('first'), t: 'The guild\'s road coach waits by the stand with its horses out of the shafts, and Factor Orme is already behind her counter, as if she had never left it.' },
  { if: ROUTE('carts'), t: 'The Choir\'s carts stand in a line down the lane with their barrels roped on, and Knock\'s children walk beside them with cups, not quite believing it.' },
  { if: ROUTE('buggy'), t: 'You leave the buggy ticking by the stand, where two of Knock\'s children come to look at it and do not touch it.' },
  { if: ROUTE('wheel'), t: 'The Wheel\'s tracks run off across the flats behind you, and their dust hangs over the toll road a long time after.' },
  { t: 'You come down the toll road on your own feet, the way you left it.' },
];
const ARRIVE_WATER: Part[] = [
  { if: WATER('drywells'), t: 'A cart from Dry Wells stands at the tank with its barrel half empty: the station you put right is keeping Knock alive, a cart every other day.' },
  { if: WATER('carts'), t: 'Barrels with the Choir\'s open eye painted on them stand at the tank, and the queue at them is quiet and orderly.' },
  { t: 'There is a queue at Corin\'s well instead, with cups, and nobody in it is talking.' },
];
const ARRIVE_GUILD: Part[] = [
  { if: HOUNDS_IN_PLAY, t: ' East of the stand, on the guild\'s own ground, the guild has come too: horses on the flat, riders in green, and two handlers squatting beside something low and grey on short leads that does not move and does not sleep.' },
  { if: GUILD_IN_PLAY, t: ' East of the stand, on the guild\'s own ground, the guild has come too: horses on the flat, riders in green, and a leather folder on Orme\'s counter where her ledger used to lie.' },
  { t: '' },
];
/** How Knock thinks of the player (local standing, never karma). */
const ARRIVE_FACES: Part[] = [
  { if: { standing: { settlement: 'cistern9', gte: 25 } }, t: ' Then somebody at the tank starts to clap, and stops, embarrassed, and Afua Danso shouts your name down the lane to Maud.' },
  { if: { standing: { settlement: 'cistern9', lte: -15 } }, t: ' Then, one after another, some of the doors close.' },
  { t: '' },
];

export const d_a3_home: DialogueDef = {
  id: 'd_a3_home', owner: MAUD,
  start: [{ node: 'home' }],
  nodes: {
    home: {
      speaker: 'narrator',
      text: mix([ARRIVE_HOW, ARRIVE_WATER, ARRIVE_GUILD, ARRIVE_FACES], (how, water, guild, faces) => `${how} Knock. The windpump on the rise stands still. The tank in the square is dry to its rim, and somebody has chalked the days on its side, a stroke for each since the hatch shut. ${water} Opposite the stand, on the flat by the road, the column's camp: grey tents in a row, a table under canvas with a lamp, four wardens who straighten when they see you, and on the table a sheet of paper with a stone on it against the wind.${guild} People come to their doors. Faces you have known all your life, looking at you a moment too long, as if checking you against the card.${faces}`),
      again: 'Knock: the still windpump, the chalked tank, the column\'s tents across the road.',
      interject: [
        { companion: TAMSIN, text: 'Tamsin stops at the top of the lane. "It\'s dry," she says. "Twenty-four years, and the tray never once came out without water in it." She looks down the slope at the apron, the hatch, the Grille: the only parts of home she ever knew from the other side.' },
        { companion: NINE, text: 'Nine regards the camp. "Correctly positioned," it says. "Out of the lane, upwind of the well, within sight of the door and off the apron. Whoever pitched it read the manual I read." It sounds, for Nine, almost unhappy about it.' },
        { companion: WREN, text: 'Wren looks at the tents, and then at the slope above the apron, the way she looks at ground she might have to hold. "Polite," she says. "I\'ve seen polite. It\'s the last thing before the other thing."' },
        { companion: ASH, text: '"Home," Ash says quietly, as if he were trying the word on for somebody else.' },
        { companion: ILYA, text: 'Ilya counts the wardens. "Four," he says. "And the one at the table." He counts the shacks, the doors, the children at them. "Right."' },
        { companion: ODILE, text: '"So this is where the face on the card was cut," Odile says. "One always pictures something grander. One is always wrong about that."' },
        { companion: KES, text: 'Kes looks at the stopped windpump for a long moment. "Nobody\'s even stolen it," she says. "That\'s how you know it\'s somebody\'s home."' },
      ],
      options: [
        { id: 'a3home.maud', text: '(Go down the lane. Maud will be at the hatch.)', exit: true },
        { id: 'a3home.camp', text: '(Go to the column\'s table first.)', exit: true },
      ],
    },
  },
};

// ---------------------------------------------------------------- Maud, at the hatch she can't open

const MAUD_BACK: OptionDef = { text: '(Go on.)', next: 'hub' };
/** Her answer to the letter, and to the question under it. Each settles `a3_maud`; the ids differ by the node they sit on. */
const MAUD_CLOSE = (p: string): OptionDef[] => [
  { id: `maud.${p}.eased`, text: 'The city has had their names from MOTHER\'s own returns, every quarter, for ninety years. Your letter gave it nothing it didn\'t have.', if: KNOWS_RETURNS, effects: [{ set: 'a3_maud', value: 'eased' }, TRUST(MAUD, 5), { xp: 60 }], next: 'eased' },
  { id: `maud.${p}.forgive`, text: 'You kept her alive through a winter, Maud. That\'s what you sold it for.', effects: [{ set: 'a3_maud', value: 'forgiven' }, TRUST(MAUD, 5), { xp: 40 }], next: 'forgiven' },
  { id: `maud.${p}.hold`, text: '(Say nothing. Take her hand.)', effects: [{ set: 'a3_maud', value: 'told' }, { xp: 20 }], next: 'told' },
];

export const d_a3_maud: DialogueDef = {
  id: 'd_a3_maud', owner: MAUD,
  start: [{ if: NOT(F('a3_maud_home')), node: 'home' }, { node: 'hub' }],
  nodes: {
    home: {
      text: mix([
        [
          { if: SCARRED, t: 'Maud is on her stool at the hatch, as if it might open at seven, with her stick across her knees and the leg that never set right out in front of her. She sees you and starts to get up, which takes her a while now, and you are there before she has done it.' },
          { t: 'Maud is on her stool at the hatch, as if it might open at seven, her reading lenses on their cord and her hands in her lap. She is up before you reach her, quick as she ever was, and you had forgotten how small she is.' },
        ],
        [
          { if: ROUTE('column'), t: ' Over your shoulder she looks at the city\'s car by the stand. "I watched you get down out of that. In front of everybody." She does not say what she thought.' },
          { t: '' },
        ],
      ], (her, car) => `${her} "There you are," she says into your coat. "There you are, love." Then, because she is Maud, she holds you off at arm's length and counts you: arms, legs, face. "All there. That's not nothing."${car}`),
      again: '"There you are," Maud says again, as if she has to keep checking.',
      effects: [{ set: 'a3_maud_home' }, TRUST(MAUD, 10), { memory: { npc: MAUD, tag: 'a3_came_home', valence: 20, strength: 90 } }],
      interject: [
        { companion: TAMSIN, text: 'Maud looks past you at the woman with the copper hair hacked short and the Cistern\'s coveralls cut off at the shoulder. "And you\'re the one with the riddles," she says. Tamsin, for once in her life, has nothing to say at all.', effects: [A(TAMSIN, 3)] },
        { companion: WREN, text: 'Maud looks Wren up and down, the burned hand, the stance. "You\'ll want feeding," she says. It is not a question, and Wren, startled, does not argue.' },
      ],
      options: [{ id: 'maud.a3.hold', text: '(Hold on to her.)', next: 'hub' }],
    },
    hub: {
      text: [
        { if: SCARRED, text: 'Maud settles back on her stool by the hatch, the stick against her knee. "Well?"' },
        { text: 'Maud settles back on her stool by the hatch. "Well?"' },
      ],
      again: '"Go on, love. I\'m not going anywhere. Nor\'s the hatch."',
      options: [
        { id: 'maud.a3.hatch', text: 'The hatch.', once: true, next: 'hatch' },
        { id: 'maud.a3.water', text: 'How is Knock for water?', once: true, next: 'water' },
        { id: 'maud.a3.column', text: 'The wardens.', once: true, next: 'column' },
        { id: 'maud.a3.lin.column', text: 'Linnet is in that column, Maud.', if: LINNET_COLUMN, once: true, next: 'lin_column' },
        { id: 'maud.a3.lin.dogs', text: 'Linnet came with the Dogs.', if: LINNET_DOGS, once: true, next: 'lin_dogs' },
        { id: 'maud.a3.lin.shale', text: 'Has Linnet written?', if: LINNET_SHALE, once: true, next: 'lin_shale' },
        { id: 'maud.a3.lin.knock', text: 'Where\'s Linnet?', if: ALL(LINNET_KNOCK, NOT(F('a3_linnet_down'))), once: true, next: 'lin_knock' },
        { id: 'maud.a3.lin.home', text: 'Linnet\'s out of the grey.', if: F('a3_linnet_down'), once: true, next: 'lin_home' },
        { id: 'maud.a3.sit', text: '(Be at the hatch with her at seven.)', once: true, effects: [{ until: 7 }, TRUST(MAUD, 5), { memory: { npc: MAUD, tag: 'a3_sat_hatch', valence: 10, strength: 70 } }], next: 'sit' },
        { id: 'maud.a3.door', text: 'What do you want, Maud? At the door.', once: true, next: 'door' },
        { id: 'maud.a3.margin', text: 'You wrote "I sold a letter" in the post-book. What letter?', if: ALL({ knows: 'kn_maud_sold_letter' }, NOT(MAUD_TRUSTS), NOT(F('a3_maud_secret'))), once: true, next: 'not_today' },
        { id: 'maud.a3.secret', text: '(Wait. She has something to say.)', if: ALL(MAUD_TRUSTS, NOT(F('a3_maud_secret'))), next: 'secret' },
        { id: 'maud.a3.trade', text: 'Let me see the stores. (Trade)', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { text: 'Later, Maud.', exit: true },
      ],
    },
    hatch: {
      text: '"Four times in my life," she says. "Three weeks, when I was ten. Nine weeks, when I was twenty. A winter, when I was your age. And now." She lays her palm on the tray\'s cold steel. "I come at seven anyway. Every morning. If it opens and nobody\'s here, it might think nobody wants it." She knows how that sounds. She does it anyway.',
      again: '"Four times," Maud says, and pats the tray as if it were a dog.',
      effects: [{ learn: 'a3_maud_hatch' }],
      interject: [{ companion: TAMSIN, text: 'Tamsin crouches by the tray and runs her thumb along its seam. "We used to hear you," she says to Maud. "From the other side. Seven o\'clock, every week, your stool scraping." Maud looks at her for a long time, and then puts her hand on Tamsin\'s head, the way she used to put it on yours.', effects: [A(TAMSIN, 5)] }],
      options: [MAUD_BACK],
    },
    water: {
      text: [
        { if: WATER('drywells'), text: '"Dry Wells sends a cart down every other day, since you put their station right. They won\'t take more than we can pay, and some days that\'s nothing." She shakes her head. "Dry Wells, feeding Knock. My mother would have laughed till she cried."' },
        { if: WATER('carts'), text: '"The Choir walked water in. Barrels, for nothing. Nobody wrote it down." She frowns at that: a woman who has written down every measure of water on this slope for forty years. "So I wrote it down."' },
        { if: WATER('column'), text: '"The city\'s water." She tips her head at the camp. "Two barrels down the lane every morning, entered as supply in excess, whatever that is. It\'s wet. I\'ll say that for it."' },
        { if: WATER('pump'), text: '"Corin\'s pump\'s turning again. Hear it? Two cups a head. I\'d forgotten what it sounds like, a pump that isn\'t tired."' },
        { text: '"Corin\'s well. A cup a head, morning and night, and he stands over the bucket so nobody takes two." She doesn\'t complain; Maud never complains about water, she only counts it. "Afua\'s boy is coughing again. If you can do anything, love, do it. Corin won\'t ask. He never asks."' },
      ],
      again: [{ if: KNOCK_WATERED, text: '"We\'re drinking," Maud says. "That\'s not nothing."' }, { text: '"A cup a head," Maud says. "I count them."' }],
      effects: [{ learn: 'a3_knock_water' }],
      options: [MAUD_BACK],
    },
    column: {
      text: '"Their captain took his cap off to me." She says it the way she would say he had stolen something. "Nobody\'s taken a cap off to me in my life. They pay for what they take, which is nothing, because they brought their own. They say good morning." She looks at the tents across the road. "I don\'t like it, love. Men with guns who say good morning are men who know they don\'t have to say anything else."',
      again: '"Good morning," Maud says, sourly, at the tents.',
      options: [MAUD_BACK],
    },
    lin_column: {
      text: [
        { if: DROVE, text: '"I know. I saw who was driving." Her hands are very still in her lap. "She took the bend by the stand too fast. She always did, with the goat cart." A breath. "She hasn\'t come to the house. She walks past the end of the lane twice a day in their grey and doesn\'t look down it. I haven\'t gone to the tents. We\'re both waiting for the other one, and we\'re both Ferrows, so we\'ll wait till we\'re dead."' },
        { text: '"I know." Before you can say it. "I saw her the first morning, in their grey, with the collar too big." Her hands are very still in her lap. "She walks past the end of the lane twice a day and doesn\'t look down it. She hasn\'t come to the house. I haven\'t gone to the tents. We\'re both waiting for the other one, and we\'re both Ferrows, so we\'ll wait till we\'re dead."' },
      ],
      again: '"Ferrows," Maud says. "Stubborn as the door."',
      effects: [{ learn: 'a3_maud_lin' }],
      options: [MAUD_BACK],
    },
    lin_dogs: {
      text: '"With the Dogs." Maud says it like a word in a language she doesn\'t speak. "A Dogs\' red rag over the guild scarf she stole off the stand. She came down the slope with them and waved at me. Waved. Like it was hatch day." A long breath, and then her mouth does something it hasn\'t done since you came. "She looked well. She looked like herself."',
      again: '"Waved," Maud says, and shakes her head, and doesn\'t stop smiling.',
      effects: [{ learn: 'a3_maud_lin' }],
      options: [MAUD_BACK],
    },
    lin_shale: {
      text: '"From Mags\'s. Twice since spring. Once to say she was well, and once for her other boots." Maud sniffs. "Both times she spelt Mags with two Gs. I don\'t know who she\'s trying to impress." She folds her hands. "She\'s safer in Shale than here. I keep telling myself that."',
      again: '"Two Gs," Maud says.',
      effects: [{ learn: 'a3_maud_lin' }],
      options: [MAUD_BACK],
    },
    lin_knock: {
      text: '"Carrying water with Corin, if she\'s doing what she\'s told, which she isn\'t." Maud almost smiles. "She stayed. I don\'t know if you meant her to. She\'s been my legs since the post-house, and eighteen in her head for three years." A pause. "She asks about you every day. Go and find her."',
      again: '"Go and find her," Maud says. "She\'s been waiting longer than me."',
      effects: [{ learn: 'a3_maud_lin' }],
      options: [MAUD_BACK],
    },
    lin_home: {
      text: '"I know. She came down the lane with the grey folded over her arm and put it on the end of her cot and sat on it." Maud looks at the hatch. "She hasn\'t said anything about it. I haven\'t asked. That\'s how Ferrows say thank you." She doesn\'t look at you either. "Thank you, love."',
      again: '"Ferrows," Maud says.',
      effects: [TRUST(MAUD, 5)],
      options: [MAUD_BACK],
    },
    sit: {
      text: 'You sit on the apron beside her stool while the light comes up grey over the rise. At seven exactly Maud straightens, as she has every hatch day of her life, and looks at the panel. It stays dark. "Thank you for your continuity," Maud says to it, quietly, in MOTHER\'s voice. Then, in her own: "There. Somebody had to." She puts her hand on your knee and leaves it there.',
      again: 'The panel, dark, at seven. Maud\'s hand on your knee.',
      options: [MAUD_BACK],
    },
    door: {
      text: '"I want them alive." No hesitation: she has thought about this on the stool every morning. "Them in there and us out here. And you." She looks at the door, the colour of the rock. "Sixty years I\'ve talked to them through those holes and I\'ve never seen one face. I\'d like to, once. That\'s not me asking you to open it, love. I don\'t know what opening it costs. That\'s only what I\'d like."',
      again: '"Alive," Maud says. "All of them. That\'s all."',
      effects: [{ learn: 'a3_maud_wish' }, TRUST(MAUD, 5)],
      options: [MAUD_BACK],
    },
    not_today: {
      text: '"Old business." Too quickly. She looks at the tray, not at you. "Not today, love. Ask me another day."',
      again: '"Another day," Maud says.',
      options: [MAUD_BACK],
    },
    secret: {
      text: [
        { if: { knows: 'kn_maud_sold_letter' }, text: 'She doesn\'t look at you. She looks at the hatch. "You read the margin. Of course you did; I let you read the book." A long breath. "The winter the hatch went quiet, the third time, my mother\'s chest went bad. Wet, like Afua\'s boy. No blue tablets for nine weeks. A guild buyer came up the road and stood at the stand and said he\'d pay in tablets for anything out of the Cistern. Anything with their hand on it. So I went through the post." Her knuckles are white. "One letter. From inside, to my mother. I never opened it. He gave me a box of tablets, and she died in the spring anyway." She finally looks at you. "The guild sells what\'s inside to the city with its forecasts. And now there\'s a captain at the end of my lane with sixty names on a sheet. Was that me? Did I give them the first one?"' },
        { text: 'She doesn\'t look at you. She looks at the hatch. "There\'s a thing I\'ve never said. I\'d like to say it before that door does whatever it\'s going to do." A long breath. "The winter the hatch went quiet, the third time, my mother\'s chest went bad. Wet, like Afua\'s boy. No blue tablets for nine weeks. A guild buyer came up the road and stood at the stand and said he\'d pay in tablets for anything out of the Cistern. Anything with their hand on it. So I went through the post." Her knuckles are white. "One letter. From inside, to my mother. I never opened it. He gave me a box of tablets, and she died in the spring anyway." She finally looks at you. "The guild sells what\'s inside to the city with its forecasts. And now there\'s a captain at the end of my lane with sixty names on a sheet. Was that me? Did I give them the first one?"' },
      ],
      again: '"Was that me?" Maud asks the hatch again, quietly.',
      effects: [{ set: 'a3_maud_secret' }, { learn: 'a3_maud_letter' }],
      options: [
        ...MAUD_CLOSE('secret'),
        { id: 'maud.secret.who', text: 'Who was it from?', next: 'who' },
      ],
    },
    who: {
      text: '"I don\'t know. I never opened it; I couldn\'t have sold it if I had." She shakes her head. "Forty years I\'ve wondered, every hatch day, who wrote to her and never got an answer, and whether they thought she didn\'t want to give one."',
      again: '"Forty years," Maud says.',
      options: [
        { id: 'maud.who.mother', text: 'MOTHER keeps everything. When the hatch opens, I\'ll ask her who wrote it.', effects: [{ learn: 'a3_maud_letter_ask' }, TRUST(MAUD, 3)], next: 'close' },
        { id: 'maud.who.be', text: '(Let it be.)', next: 'close' },
      ],
    },
    close: {
      text: '"Well," Maud says, to the hatch. She is waiting for whatever you are going to say.',
      again: 'Maud waits, her hand on the tray.',
      options: MAUD_CLOSE('close'),
    },
    eased: {
      text: '"Every quarter." She frowns, the way she frowns at a sum that won\'t come out. "MOTHER sends the city their names. Every quarter." Then, slowly: "So a guild buyer bought a letter he couldn\'t read for a box of tablets, and sold it for nothing to a city that already had it." She laughs, once, a small terrible laugh. "Forty years I\'ve carried that up and down this lane, and it was never worth anything to anybody but her." She puts her hand flat on the tray. "Thank you, love."',
      again: '"Never worth anything to anybody but her," Maud says, and it seems to help.',
      options: [MAUD_BACK],
    },
    forgiven: {
      text: '"Through a winter." She says it back to herself. "She saw the spring. She said the first green on the rise was the best thing she\'d seen since the road." Something in her shoulders comes down an inch. "I never once thought of it as buying her a spring." She wipes her face with the heel of her hand, briskly. "That\'s not nothing."',
      again: '"A spring," Maud says. "That\'s not nothing."',
      options: [MAUD_BACK],
    },
    told: {
      text: 'You don\'t say anything. You take her hand, which is cold, and hold it, and after a while she holds yours back. "Well," she says. "Now somebody knows." It seems to be enough, or it seems to be what she can have.',
      again: 'Maud\'s hand in yours, cold, holding on.',
      options: [MAUD_BACK],
    },
  },
};

// ---------------------------------------------------------------- Linnet, by her fate

const SEE_MAUD_CHECK = { skill: 'speech' as const, dc: 35, mods: [
  { if: REMEMBERS(LINNET, 'talked_him_down'), dc: -10, why: 'you talked the buyer down for her once' },
  { if: REMEMBERS(LINNET, 'spoke_for_her'), dc: -10, why: 'you spoke for her at Maud\'s table' },
  { if: REMEMBERS(LINNET, 'took_her'), dc: -10, why: 'you took her as far as Shale' },
  { if: REMEMBERS(LINNET, 'let_beaten'), dc: 15, why: 'you let the buyer beat her' },
] };
const LIN_LATER: OptionDef = { text: 'Later, Lin.', exit: true };

export const d_a3_linnet: DialogueDef = {
  id: 'd_a3_linnet', owner: LINNET,
  start: [
    { if: F('a3_linnet_down'), node: 'down' },
    { if: ALL(LINNET_COLUMN, NOT(F('a3_linnet', 'column'))), node: 'column' },
    { if: LINNET_COLUMN, node: 'col_hub' },
    { if: ALL(LINNET_DOGS, NOT(F('a3_linnet', 'dogs'))), node: 'dogs' },
    { if: LINNET_DOGS, node: 'dogs_hub' },
    { if: ALL(LINNET_SHALE, NOT(F('a3_linnet', 'shale'))), node: 'shale' },
    { if: LINNET_SHALE, node: 'shale_hub' },
    { if: NOT(F('a3_linnet', 'knock')), node: 'knock' },
    { node: 'knock_hub' },
  ],
  nodes: {
    // the cadet
    column: {
      text: [
        { if: DROVE, text: '"Don\'t." Linnet, in a ward-cadet\'s grey with the collar too big for her, at the end of the column\'s table with a clipboard. "Don\'t say anything about the driving. I know I took the bend by the stand too fast. The captain said." Her chin is up, exactly the way it was on the tank when Maud told her to get off it. "The Precinct takes cadets at sixteen if they can read. I can read. They asked who knew the road to Reserve 9, and I put my hand up." She looks at the end of the lane, not down it. "I didn\'t think." She did think. You can see that she did.' },
        { text: 'Linnet. In a ward-cadet\'s grey with the collar too big for her and her hair hacked shorter than ever, at the end of the column\'s table with a clipboard, entering barrels. She sees you, and her chin comes up exactly the way it did on the tank when Maud told her to get off it. "Designate," she says. Then, because she can\'t help it: "Hello." Then, fast: "The Precinct takes cadets at sixteen if they can read. I can read. They asked who knew the road to Reserve 9, and I put my hand up. I didn\'t think." She did think. You can see that she did.' },
      ],
      again: 'Linnet with her clipboard, not looking down the lane.',
      effects: [{ set: 'a3_linnet', value: 'column' }, { learn: 'a3_linnet_cadet' }],
      options: [{ id: 'lin.col.go', text: '(Go on.)', next: 'col_hub' }],
    },
    col_hub: {
      text: 'Linnet, in the grey, at the end of the column\'s table, with her clipboard held like a shield.',
      again: '"What?" Linnet says. "I\'m working."',
      options: [
        { id: 'lin.col.why', text: 'Why the city, Lin?', once: true, next: 'why_city' },
        { id: 'lin.col.maud', text: 'Go and see Maud.', if: NOT(F('a3_linnet_maud')), once: true, check: SEE_MAUD_CHECK, next: 'see_maud', fail: 'no_maud' },
        { id: 'lin.col.down', text: 'You could stand down. A cadet may.', if: NOT(F('a3_linnet_stay')), once: true, check: { skill: 'speech', dc: 50, mods: [
          { if: F('a3_linnet_maud'), dc: -10, why: 'she has been to the house' },
          { if: { knows: 'a3_cadet_charter' }, dc: -10, why: 'the captain will give his leave' },
          { if: REMEMBERS(LINNET, 'talked_him_down'), dc: -5, why: 'she listens to you' },
          { if: REMEMBERS(LINNET, 'let_beaten'), dc: 15, why: 'you let the buyer beat her' },
        ] }, effects: [{ set: 'a3_linnet_down' }, { set: 'a3_linnet', value: 'knock' }, { xp: 60 }, { memory: { npc: LINNET, tag: 'a3_stood_down', valence: 20, strength: 80 } }, { decision: { id: 'a3_linnet_down', text: 'Linnet stood down from the city\'s column and came home to Maud.' } }], next: 'stood', fail: 'not_down' },
        { id: 'lin.col.stay', text: 'Stay with the column, Lin. When it moves, I want somebody in that grey who knows Maud\'s name.', if: NOT(F('a3_linnet_down')), once: true, effects: [{ set: 'a3_linnet_stay' }, { memory: { npc: LINNET, tag: 'a3_trusted', valence: 15, strength: 80 } }], next: 'stay' },
        LIN_LATER,
      ],
    },
    why_city: {
      text: '"Because it has lights all night." She almost laughs. "Because everybody there has somewhere to be, and they gave me somewhere. Because I was never going to die in Knock." Then, lower, to the clipboard: "I didn\'t know they\'d send me back here. In this. With them."',
      again: '"Lights all night," Linnet says. "They do. I checked."',
      options: [{ text: '(Go on.)', next: 'col_hub' }],
    },
    no_maud: {
      text: '"Not in this coat." She doesn\'t look up from the clipboard. "Not with them watching. She\'d look at the grey and not at me, and I\'d look at the hatch and not at her, and that would be that, for good." Her pencil has gone through the paper. "Don\'t ask me again."',
      again: '"I said don\'t ask me again."',
      options: [{ text: '(Go on.)', next: 'col_hub' }],
    },
    stood: {
      text: 'She looks at you for a long moment. Then she puts the clipboard down on the column\'s table, squares it with the edge the way the captain squares his order, and unbuttons the grey coat with the collar too big for her. "Clause thirty," she says to the nearest warden, who nods as if he had been expecting it. She folds the coat over her arm. "Don\'t," she says to you, the way she did on the road with the buyer. "Don\'t say anything." And she walks down the lane toward the hatch, and Maud, and doesn\'t look back, and you are fairly sure she is crying and quite sure she would kill you for saying so.',
      again: 'The grey coat, folded, gone down the lane over Linnet\'s arm.',
      options: [{ text: '(Let her go.)', exit: true }],
    },
    not_down: {
      text: '"And go home and be the girl who went to the city and came back with her tail down?" Fierce, and then not. "No. I put my hand up. I\'m seeing it through." She picks up the clipboard. "Whatever it is."',
      again: '"I\'m seeing it through," Linnet says.',
      options: [{ text: '(Go on.)', next: 'col_hub' }],
    },
    stay: {
      text: 'She stares at you. Then she straightens her collar, which does not help it. "Somebody in the grey who knows her name," she says. "Yes. All right. I can do that." She looks across the road at the column\'s tents as if they were a different shape now. "I know all their names too, you know. I know which one snores."',
      again: '"I know her name," Linnet says. "I\'ll be there."',
      options: [{ text: '(Go on.)', next: 'col_hub' }],
    },
    // with the Dogs
    dogs: {
      text: 'Linnet, on the slope above the apron among the Rust Dogs\' horses, with a Dogs\' red rag knotted over the green guild scarf she stole off the stand a lifetime ago. She sees you and whoops, actually whoops, and three Dogs look round. "They said you\'d called! Kade said you\'d never, and I said you would, and you did." She jumps down off the rock. "I ride now. Properly. Don\'t tell Maud I said properly."',
      again: 'Linnet among the Dogs\' horses, the red rag over the green.',
      effects: [{ set: 'a3_linnet', value: 'dogs' }],
      options: [{ id: 'lin.dogs.go', text: '(Go on.)', next: 'dogs_hub' }],
    },
    dogs_hub: {
      text: 'Linnet, on the slope among the Dogs\' horses.',
      again: '"What?" Linnet says, grinning. "Ask, then."',
      options: [
        { id: 'lin.dogs.why', text: 'The Dogs, Lin?', once: true, next: 'why_dogs' },
        { id: 'lin.dogs.maud', text: 'Go and see Maud.', if: NOT(F('a3_linnet_maud')), once: true, check: SEE_MAUD_CHECK, next: 'see_maud', fail: 'no_maud_dogs' },
        LIN_LATER,
      ],
    },
    why_dogs: {
      text: '"Mags sent me up to the Dogs with a crate once. They were the only people in Shale who didn\'t talk to me like I was twelve." She shrugs. "They let me ride. I\'m good at it. Nobody in Knock ever let me be good at anything but carrying."',
      again: '"Good at it," Linnet says. "I am."',
      options: [{ text: '(Go on.)', next: 'dogs_hub' }],
    },
    no_maud_dogs: {
      text: '"She waved back." Linnet looks down the slope at the hatch, and the small figure on the stool beside it. "That\'s enough for now. If I go down there she\'ll cry, and then I\'ll cry, and the Dogs will see." She turns back to the horses. "After. When the wardens have gone."',
      again: '"After," Linnet says.',
      options: [{ text: '(Go on.)', next: 'dogs_hub' }],
    },
    see_maud: {
      text: [
        { if: LINNET_COLUMN, text: '"Fine." She hands her clipboard to the nearest warden without looking at him. "Fine. If she shouts, it\'s your fault." She goes down the lane in the city\'s grey with her chin up, and you watch Maud see her coming from the stool by the hatch, and get up, which takes her a while, and not reach her stick. Neither of them says anything that carries up the lane. After a long time Maud sits back down on her stool, and Linnet sits on the apron beside it, the way you used to.' },
        { text: '"Fine." She swings down off the rock. "If she shouts, it\'s your fault." She goes down the slope in the Dogs\' red rag with her chin up, and you watch Maud see her coming from the stool by the hatch, and get up, and not reach her stick. Neither of them says anything that carries up the slope. After a long time Maud sits back down on her stool, and Linnet sits on the apron beside it, the way you used to.' },
      ],
      again: 'Linnet on the apron beside Maud\'s stool.',
      effects: [{ set: 'a3_linnet_maud' }, { xp: 40 }, TRUST(MAUD, 5), { memory: { npc: MAUD, tag: 'a3_linnet_came', valence: 20, strength: 90 } }, { decision: { id: 'a3_linnet_maud', text: 'Linnet went down the lane to Maud at the hatch.' } }],
      options: [{ text: '(Leave them to it.)', exit: true }],
    },
    // at Mags's (Shale's map places her when a later slice does)
    shale: {
      text: 'Linnet behind Mags\'s bar with a cloth over her shoulder, pouring something brown for somebody who doesn\'t deserve it. "Look what the road dragged in," she says, in Mags\'s exact voice, and then, in her own, too loud: "You came!"',
      again: 'Linnet behind Mags\'s bar, the cloth over her shoulder.',
      effects: [{ set: 'a3_linnet', value: 'shale' }],
      options: [{ id: 'lin.shale.go', text: '(Go on.)', next: 'shale_hub' }],
    },
    shale_hub: {
      text: 'Linnet, at Mags\'s bar.',
      again: '"Buying, or talking?" Linnet says.',
      options: [
        { id: 'lin.shale.maud', text: 'Maud asks after you.', once: true, next: 'shale_maud' },
        LIN_LATER,
      ],
    },
    shale_maud: {
      text: '"Tell her I\'m well. Tell her I\'ve got my boots." She wipes the same patch of bar three times. "Tell her I\'ll come when the wardens go. I will. I\'m not sitting on that apron while there\'s a column at the end of the lane looking at me."',
      again: '"When the wardens go," Linnet says.',
      options: [{ text: '(Go on.)', next: 'shale_hub' }],
    },
    // at home
    knock: {
      text: 'Linnet, with two buckets on a yoke across her shoulders and Corin\'s ration in them, coming up from the well. She drops the yoke when she sees you, which costs Knock a cup of water, and doesn\'t care. "You came back," she says into your neck. "Everybody said you would. I said you would. I didn\'t believe me."',
      again: 'Linnet, the yoke on her shoulders again.',
      effects: [{ set: 'a3_linnet', value: 'knock' }],
      options: [{ id: 'lin.knock.go', text: '(Go on.)', next: 'knock_hub' }],
    },
    knock_hub: {
      text: 'Linnet, with the yoke, by the well.',
      again: '"Ask, then," Linnet says. "The water won\'t carry itself. That\'s Maud\'s line. I hate that it\'s mine now."',
      options: [
        { id: 'lin.knock.maud', text: 'How\'s Maud, really?', once: true, next: 'maud_really' },
        { id: 'lin.knock.column', text: 'There\'s a column on the road, Lin.', once: true, next: 'k_column' },
        { id: 'lin.knock.after', text: 'When this is done...', if: NOT(F('a3_linnet_after')), once: true, next: 'after' },
        LIN_LATER,
      ],
    },
    maud_really: {
      text: [
        { if: SCARRED, text: '"Bad on the cold mornings. She won\'t use the stick in front of anyone, so she sits on that stool from seven so nobody sees her get there." Linnet scowls at the yoke. "She counts the cups. She counts the wardens. She counts me. I think if she stopped counting she\'d fall down."' },
        { text: '"Thinner. She gives her cup to Afua\'s boy when she thinks I\'m not looking." Linnet scowls at the yoke. "She counts the cups. She counts the wardens. She counts me. I think if she stopped counting she\'d fall down."' },
      ],
      again: '"Counting," Linnet says.',
      options: [{ text: '(Go on.)', next: 'knock_hub' }],
    },
    k_column: {
      text: [
        { if: ROUTE('column'), text: '"I know. I counted them. Four and the captain, and the captain says good morning to me like I\'m somebody." She looks up the lane. "There\'s a car at the stand with sixty benches in it. I went and sat in it at night. Bench nine. It\'s a good car." A pause. "That\'s an awful thing to say, isn\'t it."' },
        { text: '"I know. I counted them. Four and the captain, and the captain says good morning to me like I\'m somebody." She looks up the lane. "They\'ve got water stacked under a tarp higher than our tank. I went and sat on it at night, just to sit on that much water." A pause. "That\'s an awful thing to say, isn\'t it."' },
      ],
      again: '"Don\'t tell Maud," Linnet says.',
      options: [{ text: '(Go on.)', next: 'knock_hub' }],
    },
    after: {
      text: '"When this is done." She says it back to you, carefully, like a promise she wants to see written down first. "When this is done, what?"',
      again: '"What?" Linnet says.',
      options: [
        { id: 'lin.after.road', text: 'Come with me. Wherever I go next.', effects: [{ set: 'a3_linnet_after', value: 'road' }, { memory: { npc: LINNET, tag: 'a3_asked_along', valence: 25, strength: 90 } }], next: 'after_road' },
        { id: 'lin.after.maud', text: 'Stay with Maud. She needs you more than I do.', effects: [{ set: 'a3_linnet_after', value: 'maud' }, { memory: { npc: LINNET, tag: 'a3_left_home', valence: -5, strength: 60 } }], next: 'after_maud' },
      ],
    },
    after_road: {
      text: 'She doesn\'t whoop. She goes very still, the way Maud does, and then she nods, once. "When it\'s done," she says. "Not before. I\'m not leaving her with a column on the road." She picks up the yoke. "But when it\'s done."',
      again: '"When it\'s done," Linnet says.',
      options: [{ text: '(Go on.)', next: 'knock_hub' }],
    },
    after_maud: {
      text: '"She does." Flat. She picks up the yoke. "Everybody always needs me more than they need me to go." Then, because she is seventeen and fair: "She does, though. You\'re right. I hate it."',
      again: '"I hate it," Linnet says, and carries the water anyway.',
      options: [{ text: '(Go on.)', next: 'knock_hub' }],
    },
    // a cadet who stood down
    down: {
      text: 'Linnet in her own shirt again, the grey coat folded on the end of her cot inside the door, carrying water up from the well with Corin\'s yoke. "Don\'t," she says, before you can say anything about it.',
      again: '"Don\'t," Linnet says, and keeps carrying.',
      options: [
        { id: 'lin.down.maud', text: 'Go and see Maud.', if: NOT(F('a3_linnet_maud')), once: true, effects: [{ set: 'a3_linnet_maud' }, TRUST(MAUD, 5), { memory: { npc: MAUD, tag: 'a3_linnet_came', valence: 20, strength: 90 } }], next: 'down_maud' },
        LIN_LATER,
      ],
    },
    down_maud: {
      text: '"I live with her, stupid." But she puts the yoke down and goes and sits on the apron beside the stool anyway, and Maud puts a hand on her head without looking, and neither of them says anything at all.',
      again: 'Linnet on the apron beside the stool.',
      options: [{ text: '(Leave them to it.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- Dace

const DEBT = 42;
const DACE_BACK: OptionDef = { text: '(Go on.)', next: 'hub' };

export const d_a3_dace: DialogueDef = {
  id: 'd_a3_dace', owner: DACE,
  start: [{ if: ALL(F('a3_guild_in'), NOT(F('a3_dace'))), node: 'guide' }, { if: NOT(F('a3_dace')), node: 'home' }, { node: 'hub' }],
  nodes: {
    guide: {
      text: 'Dace Moro, with the guild\'s party on the flat east of the stand, holding two of the guild\'s horses, a guide\'s brass tag pinned to his coat. He sees you, and the tag gets turned to the inside of his lapel, which is worse. "Somebody had to show them the road," he says, before you have said anything. "Better me than a stranger. A stranger wouldn\'t know which houses to go round."',
      again: 'Dace with the guild\'s horses, the tag turned in.',
      effects: [{ set: 'a3_dace', value: 'guide' }],
      options: [DACE_BACK],
    },
    home: {
      text: 'Dace Moro on the post-house roof with a mouthful of nails, putting the last boards on over the black. He comes down the ladder faster than he should on that knee. "Look at you. Look at you. A face on a card and a captain at the end of the lane." He wipes his hands on his shirt. "I put the boards on. Somebody had to. I owed her a house."',
      again: 'Dace at the foot of the ladder, nails in his fist.',
      effects: [{ set: 'a3_dace', value: 'knock' }, { memory: { npc: DACE, tag: 'a3_boards', valence: 5, strength: 60 } }],
      options: [DACE_BACK],
    },
    hub: {
      text: [
        { if: F('a3_dace', 'guide'), text: 'Dace, by the guild\'s horses, not quite meeting your eye.' },
        { if: F('a3_dace', 'square'), text: 'Dace, without the brass tag, at a loose end for the first time in his life and not sure what to do with it.' },
        { if: F('a3_dace', 'quit'), text: 'Dace, back on Knock\'s side of the road, with his shoulders up round his ears.' },
        { text: 'Dace, with his hammer, by the post-house.' },
      ],
      again: '"Go on," Dace says. "I talk too much. You talk."',
      options: [
        { id: 'dace.a3.debt', text: 'What do you owe the guild now?', if: NOT(F('a3_dace', 'square')), once: true, next: 'debt' },
        { id: 'dace.a3.quit', text: 'You don\'t have to guide them, Dace.', if: F('a3_dace', 'guide'), once: true, check: { skill: 'speech', dc: 45, mods: [
          { if: REMEMBERS(DACE, 'forgiven'), dc: -15, why: 'you forgave him for the outriders' },
          { if: F('kn_rib_fight'), dc: -5, why: 'you stood together in the Rib' },
          { if: REMEMBERS(DACE, 'condemned'), dc: 10, why: 'you told him what he had done' },
        ] }, effects: [{ set: 'a3_dace', value: 'quit' }, { xp: 50 }, { memory: { npc: DACE, tag: 'a3_quit_guild', valence: 15, strength: 80 } }, { decision: { id: 'a3_dace', text: 'Dace stopped guiding the guild at Knock and came back to Knock\'s side of the road.' } }], next: 'quit', fail: 'stays' },
        { id: 'dace.a3.boards', text: 'Who put the new boards on the post-house?', if: NOT(F('a3_dace', 'knock')), once: true, next: 'boards' },
        { text: 'Later, Dace.', exit: true },
      ],
    },
    debt: {
      text: `"Forty-two. Orme's book." He says it to his boots. "It was thirty in the spring. Interest. You can't outrun interest. It's got no legs and it's still faster than me."`,
      again: '"Forty-two," Dace says.',
      options: [
        { id: 'dace.a3.pay', text: `(Pay it for him. ${DEBT} Tolls.)`, if: { item: 'tolls', count: DEBT }, effects: [{ take: 'tolls', count: DEBT }, { set: 'a3_dace', value: 'square' }, { xp: 40 }, { memory: { npc: DACE, tag: 'a3_debt_paid', valence: 30, strength: 90 } }, { decision: { id: 'a3_dace', text: 'I paid Dace\'s debt on Orme\'s book, and he was square with the guild for the first time in his life.' } }], next: 'paid' },
        { id: 'dace.a3.nopay', text: 'Not today.', next: 'hub' },
      ],
    },
    paid: {
      text: [
        { if: F('a3_guild_in'), text: '"You can\'t." But he takes it, because he can\'t not. He walks it across to Orme\'s counter himself, and you watch her turn the book round and strike his line through with one stroke, and blot it, and turn it back. He unpins the brass tag on the way back and leaves it on the counter beside the book. "Square," he says. He doesn\'t seem to know what to do with his hands. "I\'ve never been square in my life."' },
        { text: '"You can\'t." But he takes it, because he can\'t not. He walks it up the lane to Orme\'s counter himself, and you watch her turn the book round and strike his line through with one stroke, and blot it, and turn it back. "Square," he says when he comes back. He doesn\'t seem to know what to do with his hands. "I\'ve never been square in my life."' },
      ],
      again: '"Square," Dace says, trying it out.',
      options: [DACE_BACK],
    },
    quit: {
      text: '"...No," slowly. "No, I don\'t." He unpins the tag and looks at it. "I\'ll owe them from Knock. Same as always." He hands the horses\' leads to the nearest rider, who takes them without a word, and walks back up the lane with his shoulders up round his ears like a man expecting a stone in his back.',
      again: '"From Knock," Dace says. "Same as always."',
      options: [DACE_BACK],
    },
    stays: {
      text: '"Easy for you." He looks at the guild\'s horses, not you. "You\'ve got a card with your face on it and a captain who takes his cap off. I\'ve got forty-two on Orme\'s book." He turns back to the horses.',
      again: '"Forty-two," Dace says, to the horses.',
      options: [DACE_BACK],
    },
    boards: {
      text: '"Me." He doesn\'t look at you. "Before the guild came for me. I owed her a house." A long pause. "I owed her a lot more than a house. I started with the house."',
      again: '"I started with the house," Dace says.',
      options: [DACE_BACK],
    },
  },
};

// ---------------------------------------------------------------- Corin, on the slope

const CORIN_BACK: OptionDef = { text: '(Go on.)', next: 'hub' };
const WELL_DONE: Effect[] = [{ set: 'a3_well', value: 'deepened' }, { xp: 75 }, TRUST(CORIN, 10), { memory: { npc: CORIN, tag: 'a3_well', valence: 20, strength: 80 } }, { news: { tag: 'a3_well', text: 'Knock\'s windpump turned again in the lockdown, on a deeper draw', valence: 4, size: 4, at: 'cistern9' } }, { decision: { id: 'a3_well', text: 'Corin\'s windpump turned again on a deeper draw, and Knock had two cups a head while the hatch was shut.' } }];

export const d_a3_corin: DialogueDef = {
  id: 'd_a3_corin', owner: CORIN,
  start: [{ if: NOT(F('a3_corin_met')), node: 'slope' }, { node: 'hub' }],
  nodes: {
    slope: {
      text: [
        { if: F('kn_corin_rifle'), text: 'Corin Asch on the rise by the stopped windpump, sitting on an upturned bucket with a rifle across his knees, watching the column\'s tents across the road the way he watches a sky for weather. The rifle is not the one he gave you. It is older, its stock bound with wire, and he holds it like something he would rather not be holding. He doesn\'t look round. "Took your time." Then: "Captain\'s polite. I\'ve known polite men. I rode with some."' },
        { text: 'Corin Asch on the rise by the stopped windpump, sitting on an upturned bucket with his rifle across his knees, watching the column\'s tents across the road the way he watches a sky for weather. He doesn\'t look round. "Took your time." Then: "Captain\'s polite. I\'ve known polite men. I rode with some."' },
      ],
      again: 'Corin on his bucket, the rifle across his knees.',
      effects: [{ set: 'a3_corin_met' }],
      options: [CORIN_BACK],
    },
    hub: {
      text: [
        { if: F('a3_corin', 'down'), text: 'Corin, in his workshop, the rifle on the shelf behind him where he can see it and not reach it.' },
        { text: 'Corin, on the rise, watching the tents.' },
      ],
      again: 'Corin waits. He has always been better at it than you.',
      options: [
        { id: 'corin.a3.well', text: 'The windpump\'s stopped.', once: true, next: 'well' },
        { id: 'corin.a3.door', text: 'What will you do when I go to the door?', once: true, next: 'door' },
        { id: 'corin.a3.hale', text: 'Hale is with the guild.', if: ALL(F('a3_guild_in'), HALE_HERE), once: true, next: 'hale' },
        { id: 'corin.a3.left', text: 'Why did you leave the outriders?', if: { knows: 'corin_rode_with_hale' }, once: true, next: 'left' },
        { id: 'corin.a3.rifle', text: 'Where did that rifle come from?', if: F('kn_corin_rifle'), once: true, next: 'rifle' },
        { text: 'Later, Corin.', exit: true },
      ],
    },
    well: {
      text: [
        { if: F('a3_well', 'deepened'), text: 'Corin listens to the pump drawing behind him. "Not stopped now," he says, and almost smiles.' },
        { text: '"Well\'s gone down past the foot valve. She draws air at the bottom of the stroke and burns her leathers dry, so I stopped her before she killed herself." He nods at the rope by his bucket, the cup. "Hand-draw. A cup a head, morning and night. I stand over it." He looks at you. "There\'s a length of pipe in the workshop. Lower the valve one length and she\'d draw again, if the old threads take. Or dig the silt out of the sump so the valve sits in water. I\'ve no hands for either, with this on my knees."' },
      ],
      again: '"Cup a head," Corin says. "Or not."',
      options: [
        { id: 'corin.well.valve', text: '(Lower the foot valve a length.)', if: NOT(F('a3_well')), once: true, check: { skill: 'mechanics', dc: 40, mods: [
          { if: { origin: 'pump_hand' }, dc: -15, why: 'you have kept Knock\'s pumps since you were twelve' },
          { if: { knows: 'kn_valve' }, dc: -10, why: 'always look where it stops' },
        ] }, effects: [...WELL_DONE, { time: 120 }], next: 'well_valve', fail: 'well_threads' },
        { id: 'corin.well.sump', text: '(Dig the silt out of the sump.)', if: NOT(F('a3_well')), once: true, check: { skill: 'survival', dc: 40, mods: [{ if: { attr: 'brawn', gte: 7 }, dc: -10, why: 'you can swing a short shovel on a rope' }] }, effects: [...WELL_DONE, { time: 300 }], next: 'well_sump', fail: 'well_rope' },
        { id: 'corin.well.leave', text: '(Leave it.)', next: 'hub' },
      ],
    },
    well_valve: {
      text: 'Two hours on your back in the well-head with Corin\'s pipe wrench and a lamp, the new length threaded, the valve lowered, the leathers soaked. When Corin puts the windpump back in gear it coughs once, catches, and draws, and the sound of it carries down the whole slope, and doors open. "Two cups a head," Corin says. That is all he says. He whistles to it, low.',
      again: 'The windpump drawing on the rise, a sound like breathing.',
      options: [CORIN_BACK],
    },
    well_sump: {
      text: 'Half a day down the well on a rope with a short shovel and a bucket going up and down over your head, digging out ninety years of silt until the foot valve sits in water again. When you come up, grey to the eyebrows, Corin has the windpump back in gear, and it draws, and doors open down the slope at the sound. "Two cups a head," Corin says, and hands you the first of them.',
      again: 'The windpump drawing on the rise, a sound like breathing.',
      options: [CORIN_BACK],
    },
    well_threads: {
      text: 'The old pipe\'s threads are gone to rust. You strip the first length trying, and the second. Corin takes the wrench off you, gently. "Not your fault. Not mine. It\'s ninety years of somebody else\'s pipe." He sits back down on his bucket.',
      again: '"Somebody else\'s pipe," Corin says.',
      options: [CORIN_BACK],
    },
    well_rope: {
      text: 'The sump\'s silt is set like clay, and the rope burns your hands raw before you have shifted a bucketful worth having. Corin hauls you up. "Wants a younger back than either of ours," he says, and looks at his rifle, and doesn\'t say anything else.',
      again: '"A younger back," Corin says.',
      options: [CORIN_BACK],
    },
    door: {
      text: '"Be up here." He doesn\'t have to think. "Where I can see the tents and the apron and the road. If it goes bad, I\'ll be where I can do something about it." He turns the rifle a little on his knees. "That\'s all I\'ve got. It\'s one rifle."',
      again: '"One rifle," Corin says.',
      options: [
        { id: 'corin.door.hold', text: 'Hold the slope, then. If it goes bad, I want you up here.', effects: [{ set: 'a3_corin', value: 'holds' }, { memory: { npc: CORIN, tag: 'a3_slope', valence: 5, strength: 70 } }], next: 'hold' },
        { id: 'corin.door.down', text: 'Come down, Corin. Put it in the workshop. Nobody in Knock shoots a warden.', check: { skill: 'speech', dc: 40, mods: [
          { if: { trust: { npc: CORIN, gte: 10 } }, dc: -10, why: 'he trusts your hands' },
          { if: F('kn_out_fight'), dc: -5, why: 'you raised your arm to his rise once' },
        ] }, effects: [{ set: 'a3_corin', value: 'down' }, { memory: { npc: CORIN, tag: 'a3_down', valence: 10, strength: 80 } }], next: 'down', fail: 'hold_anyway', failEffects: [{ set: 'a3_corin', value: 'holds' }] },
        { id: 'corin.door.later', text: 'I\'ll tell you when I know.', next: 'hub' },
      ],
    },
    hold: {
      text: '"I\'ll hold it." He settles on the bucket as if he had been asked to sit for his portrait. "You won\'t see me. That\'s the point of a slope."',
      again: '"I\'ll hold it," Corin says.',
      options: [CORIN_BACK],
    },
    down: {
      text: 'He looks at you for a long time. Then he stands up off the bucket, which costs his knees something, and works the bolt, and catches the round, and puts it in his pocket. "Workshop," he says. "On the shelf, where I can see it and not reach it." He walks down off the rise ahead of you. Halfway, without turning round: "Your mother would\'ve said the same. She had good hands and no patience for rifles."',
      again: '"On the shelf," Corin says.',
      options: [CORIN_BACK],
    },
    hold_anyway: {
      text: '"No." Not unkindly. "You go to your door. I\'ll sit on my hill. If nobody needs me, nobody\'ll ever know I was here."',
      again: '"My hill," Corin says.',
      options: [CORIN_BACK],
    },
    hale: {
      text: '"I know. Saw him come down the road with Orme\'s riders. Twenty years and he still sits a horse like it owes him money." His thumb moves on the bolt, and stops. "He\'ll want to talk. About the post-house. About before." A long breath. "Maud decides what happens to Hale. Not me, and not you. It was her house."',
      again: '"Maud\'s house," Corin says. "Maud decides."',
      effects: [{ learn: 'a3_corin_hale' }],
      options: [CORIN_BACK],
    },
    left: {
      text: '"Because the guild sent us to a door once." He watches the tents. "A place like this. Water, and forty people, and a debt on a book. I held the horses. Hale went in." He doesn\'t say what happened inside. "I rode out the next morning and kept riding till the road ran out, and the road runs out here." He looks down at the black duster. "I dyed it the first winter. You can still see the green at the seams, if you look."',
      again: '"Green at the seams," Corin says.',
      effects: [TRUST(CORIN, 5), { learn: 'a3_corin_past' }],
      options: [CORIN_BACK],
    },
    rifle: {
      text: '"Kept one back." He doesn\'t look at it. "From before. The one I gave you was the one I liked." He sets it across his knees again. "This is the other one."',
      again: '"The other one," Corin says.',
      options: [CORIN_BACK],
    },
  },
};

// ---------------------------------------------------------------- the column: Captain Lowe (or Sergeant Reyes), and its senior warden

const LOWE_BACK: OptionDef = { text: '(Go on.)', next: 'hub' };
const REYES_BACK: OptionDef = { text: '(Go on.)', next: 'r_hub' };
const ASKED = (v: string): Cond => F('a3_lowe_asked', v);
const WATER_OPEN: Cond = ALL(NOT(F('a3_column_water')), NOT(SEEN('lowe.a3.water.ask')), NOT(SEEN('lowe.a3.water.trust')));
const COLUMN_WATER: Effect[] = [{ set: 'a3_column_water' }, { xp: 50 }, { news: { tag: 'a3_column_water', text: 'the city\'s column at Knock sent its own water barrels down the lane to a dry hamlet', valence: 3, size: 4, at: 'cistern9' } }, { decision: { id: 'a3_column_water', text: 'The column\'s captain sent its own water down Knock\'s lane, entered as supply in excess.' } }];

export const d_a3_lowe: DialogueDef = {
  id: 'd_a3_lowe', owner: LOWE,
  start: [
    { if: ALL(LOWE_DEAD, NOT(F('a3_lowe_heard'))), node: 'r_intro' },
    { if: LOWE_DEAD, node: 'r_hub' },
    { if: NOT(F('a3_lowe_heard')), node: 'intro' },
    { node: 'hub' },
  ],
  nodes: {
    intro: {
      text: mix([
        [
          { if: ROUTE('column'), t: 'Captain Lowe at the column\'s table under the canvas, the order squared in front of him with a stone on it against the wind, as if he had not got down off the car beside you an hour ago. He stands, and uncovers, because a captain uncovers for a magistrate, designate or not. "Designate."' },
          { if: F('lowe_met'), t: 'Captain Idris Lowe at the column\'s table under the canvas, the order squared in front of him with a stone on it against the wind. He stands as you come off the road, and takes his cap off, and holds it against his chest. "Designate."' },
          { t: 'A man at the column\'s table under the canvas, in a captain\'s grey with a close beard going white at the chin, the order squared in front of him with a stone on it against the wind. He stands, and takes off his cap. "Captain Idris Lowe, Precinct wardens, commanding the column for Reserve 9." He says the whole of it, as if it were a clause. "Designate."' },
        ],
        [
          { if: ASKED('down'), t: ' "At Tollhouse 9 you told me what you would say. I am still waiting to hear it here."' },
          { if: ASKED('on'), t: ' "At Tollhouse 9 you told me to carry on. I wrote it down. I have not done anything with it."' },
          { if: ASKED('unsure'), t: ' "At Tollhouse 9 you said you did not know. Nor do I, still."' },
          { t: '' },
        ],
      ], (who, asked) => `${who} He touches the stone on the sheet. "The order executes on the designate's attendance. Until you attend the door, nothing moves. I will wait as long as you like: the order has no line for a date. I have read it forty times. It has no line for a date, and none for what I do if you tell me not to."${asked}`),
      again: '"The order executes on the designate\'s attendance," Lowe says. "Nothing moves."',
      effects: [{ set: 'a3_lowe_heard' }, { learn: 'a3_lowe_clause' }],
      interject: [
        { companion: TAMSIN, text: 'Tamsin stands at your shoulder and looks at the order under its stone. She does not say anything. She does not have to: Lowe looks at her once, and looks away first.' },
        { companion: NINE, text: '"Captain," Nine says. "I note that the order is lawful." A pause, measured to the tick. "I also note that it is the fourth."' },
        { companion: ILYA, text: 'Ilya looks at the stone on the order, and at Lowe\'s hands either side of it. "Right," he says, and means: I know a man who has done this before.' },
      ],
      options: [LOWE_BACK],
    },
    hub: {
      text: 'Lowe, at the column\'s table, the order under its stone.',
      again: '"Designate," Lowe says, and waits, as he waits for everything.',
      options: [
        { id: 'lowe.a3.attend', text: 'What does "attend" mean, exactly?', once: true, next: 'attend' },
        { id: 'lowe.a3.water.trust', text: 'Knock is dry, Captain. Your car carries water.', if: ALL(WATER_OPEN, { trust: { npc: LOWE, gte: 20 } }), effects: COLUMN_WATER, next: 'water_yes' },
        { id: 'lowe.a3.water.ask', text: 'Knock is dry, Captain. Your car carries water.', if: ALL(WATER_OPEN, NOT({ trust: { npc: LOWE, gte: 20 } })), check: { skill: 'speech', dc: 45, mods: [
          { if: ANY(ASKED('down'), ASKED('unsure')), dc: -10, why: 'you answered him honestly at Tollhouse 9' },
          { if: REMEMBERS(LOWE, 'a3_grief_told'), dc: -5, why: 'he told you he grieves this one' },
          { if: KNOCK_WATERED, dc: 10, why: 'Knock is not dying of thirst' },
        ] }, effects: COLUMN_WATER, next: 'water_yes', fail: 'water_no' },
        { id: 'lowe.a3.names', text: [{ if: SEEN('col.names'), text: 'You said their names in the car, Captain.' }, { text: 'The sixty, Captain. Do you know their names?' }], once: true, next: 'names' },
        { id: 'lowe.a3.grieve', text: 'You don\'t like this one.', if: ALL(NOT(SEEN('col.grieve')), NOT(REMEMBERS(LOWE, 'a3_grief_told'))), once: true, next: 'grieve' },
        { id: 'lowe.a3.third', text: 'You asked me once for a third word.', if: { knows: 'lowe_grieves' }, once: true, next: 'third' },
        { id: 'lowe.a3.stand', text: 'You said you\'d stand for me, when I sat where the assessor sits.', if: REMEMBERS(LOWE, 'designate'), once: true, next: 'stand' },
        { id: 'lowe.a3.cadet', text: 'Linnet Ferrow is in your column.', if: F('kn_linnet_will_run'), once: true, next: 'cadet' },
        { id: 'lowe.a3.guild', text: 'The guild is here.', if: F('a3_guild_in'), once: true, next: 'guild' },
        { text: 'Later, Captain.', exit: true },
      ],
    },
    attend: {
      text: '"You, at the door, in the open, with the column and with them." He nods across the road, down the lane, at the apron. "Not a letter. Not a deputy. You. When you want the door, come and tell me, or stand on the apron and I will see you there. I will bring the column down the lane behind you. Not before." A pause. "I would like you to know exactly what you are walking into when you walk into it. Nobody told the Quints."',
      again: '"You, at the door, in the open," Lowe says. "Not before."',
      effects: [{ learn: 'a3_attend_how' }],
      options: [LOWE_BACK],
    },
    water_yes: {
      text: '"Supply in excess." He says it slowly, as if hearing the clause for the first time. "The column carries water for sixty-five at full strength. We are five." He writes on the corner of the order, a line in a captain\'s hand, and initials it. "Two barrels down the lane every morning, to whoever keeps your hatch\'s book. Entered as supply in excess." He looks up. "It is lawful. I checked while I was writing it."',
      again: '"Two barrels every morning," Lowe says. "Entered."',
      effects: [TRUST(LOWE, 3)],
      options: [LOWE_BACK],
    },
    water_no: {
      text: '"The water is the column\'s, entered against the column." He means it, and he does not like meaning it. "If I give it away I give it away from the order, and the order is the only thing between those sixty and a column that does not wait." He sits. "I am sorry. That is not in the charter either."',
      again: '"Entered against the column," Lowe says. "I am sorry."',
      options: [LOWE_BACK],
    },
    names: {
      text: '"Every one of them, and their ages." He does not take the sheet out. "Ines Halloran, sixty-six. Aurel Pell, fifty-eight. Bram Coyle, forty-one. Effie Calder, nineteen." He stops. "And I have learned this hamlet\'s, though it is not on the order. Maud Ferrow. Corin Asch. Afua Danso, and her boy, who coughs." He looks at you. "If I am going to carry people out of one place, I will know who I am carrying them away from."',
      again: '"Sixty names," Lowe says. "And this hamlet\'s."',
      effects: [TRUST(LOWE, 3), { learn: 'a3_lowe_names' }],
      options: [LOWE_BACK],
    },
    grieve: {
      text: '"I grieve every one." Plainly, the way other men say they take sugar. "Thirty-one evictions in eleven years. I checked every one, and every one was lawful. The schedule holds." He looks at the dry tank in the square, at the chalk on it. "I wish it didn\'t, here. That is not a thing a captain says. I have said it to you, and I will say it to the assessor if it asks me."',
      again: '"The schedule holds. I wish it didn\'t, here."',
      effects: [TRUST(LOWE, 5), { memory: { npc: LOWE, tag: 'a3_grief_told', valence: 5, strength: 70 } }],
      options: [LOWE_BACK],
    },
    third: {
      text: '"Between lawful and grieve." He waits. "Have you brought one?"',
      again: '"A third word," Lowe says. "I am still listening."',
      options: [
        { id: 'lowe.third.home', text: 'Home.', effects: [TRUST(LOWE, 5), { memory: { npc: LOWE, tag: 'a3_third_word', valence: 10, strength: 90 } }], next: 'third_home' },
        { id: 'lowe.third.no', text: 'No. Not yet.', next: 'third_no' },
      ],
    },
    third_home: {
      text: '"Home." He turns it over like a coin from a country he has not been to. "It is not in the charter." He takes his cap off the stone and sets it on the table beside the order, and looks at the two of them together for a long time. "I will think about it. At the door, I expect, I will think about nothing else."',
      again: '"Home," Lowe says, to the cap on the table.',
      options: [LOWE_BACK],
    },
    third_no: {
      text: '"Nor has anyone." Not unkindly. He squares the order under its stone. "If you find one before the door, I would like to hear it first."',
      again: '"If you find one," Lowe says.',
      options: [LOWE_BACK],
    },
    stand: {
      text: '"I did. I will." He looks down at the order under the stone. "I did not think the first thing you would be asked to put your name to would be this. Neither did you." He puts his cap back on. "I will stand for you at the door too. Whatever you say there. That is the part I can promise."',
      again: '"Whatever you say there," Lowe says.',
      options: [LOWE_BACK],
    },
    cadet: {
      text: '"Cadet Ferrow. She volunteered for this column when the sheet came down; she knew the road." He looks across at the end of the table where she stands with her clipboard and does not look back. "I did not ask her why. I can guess. I don\'t think she can." Then, carefully: "A cadet may stand down from a column with the captain\'s leave. Clause thirty. I would give it. I have told her so, and she has not asked."',
      again: '"Clause thirty," Lowe says. "She has not asked."',
      effects: [{ learn: 'a3_cadet_charter' }],
      options: [LOWE_BACK],
    },
    guild: {
      text: '"The guild is not on my order." Flatly. "Factor Orme has a paper she would like me to read. I have not read it. If it is lawful I will have to act on it, and if it is lawful and I have not read it, I cannot." He very nearly smiles. "I am a slow reader, designate."',
      again: '"A slow reader," Lowe says.',
      effects: [{ learn: 'a3_lowe_guild' }],
      options: [LOWE_BACK],
    },
    // his sergeant, if he is dead
    r_intro: {
      speaker: REYES,
      text: 'Sergeant Paloma Reyes at the column\'s table under the canvas, in a captain\'s coat still being taken in at the shoulders, with Lowe\'s cap on the table beside the order like a second stone. She stands. "Designate. The order executes on your attendance. Nothing moves until you\'re at the door." She touches the cap. "That was his reading. It\'s mine."',
      again: '"Nothing moves until you\'re at the door," Reyes says.',
      effects: [{ set: 'a3_lowe_heard' }, { learn: 'a3_lowe_clause' }],
      options: [REYES_BACK],
    },
    r_hub: {
      speaker: REYES,
      text: 'Reyes, at the column\'s table, Lowe\'s cap beside the order.',
      again: '"Designate," Reyes says.',
      options: [
        { id: 'reyes.a3.attend', text: 'What does "attend" mean, exactly?', once: true, next: 'r_attend' },
        { id: 'reyes.a3.water', text: 'Knock is dry, Sergeant. Your car carries water.', if: NOT(F('a3_column_water')), once: true, check: { skill: 'speech', dc: 45, mods: [
          { if: { trust: { npc: REYES, gte: 15 } }, dc: -15, why: 'she trusts you' },
          { if: KNOCK_WATERED, dc: 10, why: 'Knock is not dying of thirst' },
        ] }, effects: COLUMN_WATER, next: 'r_water_yes', fail: 'r_water_no' },
        { id: 'reyes.a3.cadet', text: 'Linnet Ferrow is in your column.', if: F('kn_linnet_will_run'), once: true, next: 'r_cadet' },
        { text: 'Later, Sergeant.', exit: true },
      ],
    },
    r_attend: {
      speaker: REYES,
      text: '"You, at the door, in front of them and us. Come and tell me, or stand on the apron and I\'ll see you." She looks at the cap. "He\'d have wanted you to know exactly what you were walking into. So do I."',
      again: '"In front of them and us," Reyes says.',
      effects: [{ learn: 'a3_attend_how' }],
      options: [REYES_BACK],
    },
    r_water_yes: {
      speaker: REYES,
      text: '"Supply in excess. He\'d have found the clause." She writes it on the order\'s corner herself. "Two barrels down the lane every morning. Entered."',
      again: '"Entered," Reyes says.',
      options: [REYES_BACK],
    },
    r_water_no: {
      speaker: REYES,
      text: '"It\'s the column\'s water. If I give it away, I give it away from the order." She doesn\'t like saying it. "I\'m sorry."',
      again: '"I\'m sorry," Reyes says.',
      options: [REYES_BACK],
    },
    r_cadet: {
      speaker: REYES,
      text: '"Cadet Ferrow. She knew the road." Reyes doesn\'t look at the end of the table. "A cadet can stand down with the commander\'s leave. Clause thirty. She can have it. She hasn\'t asked."',
      again: '"She hasn\'t asked," Reyes says.',
      effects: [{ learn: 'a3_cadet_charter' }],
      options: [REYES_BACK],
    },
  },
};

export const d_a3_warden: DialogueDef = {
  id: 'd_a3_warden', owner: KRESS,
  start: [{ node: 'hello' }],
  nodes: {
    hello: {
      text: '"Morning." Warden Garrick Kress, the oldest of the four, touches two fingers to his cap. "Captain\'s at the table, if it\'s him you want. Nobody is to be frightened. It\'s in the order, line six." He seems to find this as strange as you do.',
      again: '"Morning," Kress says. "Still nobody frightened."',
      options: [
        { id: 'kress.before', text: 'Have you done this before?', once: true, next: 'before' },
        { id: 'kress.six', text: 'Line six?', once: true, next: 'six' },
        { text: 'Morning.', exit: true },
      ],
    },
    before: {
      text: '"Thirty-one doors with the captain. Lawful, every one." He looks down the lane at the hamlet. "Never one with people on the other side who\'d never seen us. Usually they\'ve seen us. Usually that\'s the trouble."',
      again: '"Thirty-one doors," Kress says.',
      options: [{ text: '(Go on.)', next: 'hello' }],
    },
    six: {
      text: '"Residents are not to be frightened. Removal is a continuity measure." By heart. "I don\'t know who it\'s written for. Not the residents. They\'ve never seen a warden in their lives."',
      again: '"A continuity measure," Kress says.',
      options: [{ text: '(Go on.)', next: 'hello' }],
    },
  },
};

// ---------------------------------------------------------------- Knock's others, under the column

export const d_a3_kn_r1: DialogueDef = {
  id: 'd_a3_kn_r1', owner: 'npc_kn_r1',
  start: [{ node: 'pen' }],
  nodes: {
    pen: {
      text: [
        { if: KNOCK_WATERED, text: 'Afua Danso at the goat pen with a full bucket, which she keeps looking at as if it might leave. "Your Maud," she says, before hello. "Sitting at that hatch every morning like it owes her money." Then: "My boy\'s coughing again. No blue tablets since it shut."' },
        { text: 'Afua Danso at the goat pen with a bucket that has a cup of water in the bottom of it, for six goats. "Your Maud," she says, before hello. "Sitting at that hatch every morning like it owes her money." Then: "My boy\'s coughing again. No blue tablets since it shut."' },
      ],
      again: '"Goats don\'t care whose water it is," Afua says. "Nor do I, now."',
      options: [
        { id: 'afua.a3.kit', text: '(Give her your Knit-Kit for the boy.)', if: { item: 'c_knitkit' }, once: true, effects: [{ take: 'c_knitkit' }, { xp: 30 }, { memory: { npc: 'npc_kn_r1', tag: 'a3_kit', valence: 20, strength: 80 } }, { news: { tag: 'a3_afua_kit', text: 'the hatch-keeper\'s ward gave Afua Danso\'s sick boy the medicine the shut hatch could not', valence: 3, size: 3, at: 'cistern9' } }], next: 'kit' },
        { id: 'afua.a3.door', text: 'What does Knock want done about the door?', once: true, next: 'door' },
        leave,
      ],
    },
    kit: {
      text: '"For him?" She turns the Knit-Kit over as if it might be a trick. "It\'s not the tablets. It\'s more than we\'ve had." Then, in Pell\'s voice without meaning to (everybody on the slope can do Pell): "Half now, half at night." She puts her free hand on your arm, hard, and goes into the house without another word.',
      again: 'The goat pen. Afua is inside with her boy.',
      options: [leave],
    },
    door: {
      text: '"Want? Knock wants its hatch back." She swats a goat off the bucket. "Half the slope says let the city have them, and we get our water. Half says if the city takes them, it\'ll take us next. I say my boy\'s coughing." She looks at you. "You\'re the one on the card. You tell us."',
      again: '"You tell us," Afua says.',
      options: [{ text: '(Go on.)', next: 'pen' }],
    },
  },
};

export const d_a3_kn_r2: DialogueDef = {
  id: 'd_a3_kn_r2', owner: 'npc_kn_r2',
  start: [{ node: 'lines' }],
  nodes: {
    lines: {
      text: 'Sim Nassar at the wash lines with nothing to wash in, wringing out a dry shirt from habit. "Three in my life," he says. "Maud\'s had four. Every one before, MOTHER said continuity through the panel, out loud, so the whole apron heard. This one she printed it on a slip, for you, and then the tray just stopped."',
      again: '"Three," Sim says. "Maud\'s four. I keep count. Somebody has to."',
      options: [
        { id: 'sim.a3.split', text: 'What does Knock say about the column?', once: true, next: 'split' },
        leave,
      ],
    },
    split: {
      text: '"Knock says good morning to them, because they say it first." He pegs the dry shirt out anyway. "And Knock argues every night at Maud\'s fire. Open the door, give the city what it wants, get the hatch back. Keep the door shut, keep our hatch-folk. Burn the stand and see who comes." He shrugs. "Same as every lockdown. Only now there\'s a captain at the end of the lane who listens."',
      again: '"Same as every lockdown," Sim says.',
      options: [{ text: '(Go on.)', next: 'lines' }],
    },
  },
};

export const d_a3_kn_r3: DialogueDef = {
  id: 'd_a3_kn_r3', owner: 'npc_kn_r3',
  start: [{ node: 'tank' }],
  nodes: {
    tank: {
      text: [
        { if: IN(TAMSIN), text: 'Binta Diop by the dry tank with a stub of chalk, adding the day\'s stroke. She sees who is with you and the chalk stops. "Is that her?" she whispers, staring past you. "Tamsin? She\'s tall. I always thought she\'d be little. Voices are little."' },
        { text: 'Binta Diop by the dry tank with a stub of chalk, adding the day\'s stroke to the others. "Somebody has to count," she says, not looking up.' },
      ],
      again: 'Binta and her chalk, and the strokes on the tank.',
      interject: [{ companion: TAMSIN, text: '"Wet dust," Tamsin says. "You told me through the holes, when I was nine. I found out, Binta. You were right." Binta bursts into tears and laughter at the same time and drops the chalk.', effects: [A(TAMSIN, 5)] }],
      options: [
        { id: 'binta.a3.chalk', text: 'Why chalk the days?', once: true, next: 'chalk' },
        leave,
      ],
    },
    chalk: {
      text: '"So when it opens, we\'ll know how long we were brave for." She looks at the strokes. "Maud says that\'s morbid. Maud keeps a book of every cup of water poured on this slope for forty years, so."',
      again: '"How long we were brave for," Binta says.',
      options: [{ text: '(Go on.)', next: 'tank' }],
    },
  },
};

export const d_a3_kn_r4: DialogueDef = {
  id: 'd_a3_kn_r4', owner: 'npc_kn_r4',
  start: [{ node: 'bench' }],
  nodes: {
    bench: {
      text: 'Amos Crofts on his bench at the east end of the slope, a blanket on his knees in the heat. "Told you," he says. "A face for you in the city, on a card. Now they\'ve sent a car for the sixty to match."',
      again: '"Told you," Amos says, and pulls the blanket up.',
      options: [
        { id: 'amos.a3.road', text: 'You came up that road sixty years back.', once: true, next: 'road' },
        leave,
      ],
    },
    road: {
      text: '"With your Maud\'s mother. Forty of us. The door gave us water clean enough to see through, and we never went back down." He looks across at the column\'s tents. "That captain asked me my name and wrote it in a book. Nobody\'s written my name in a book since the road." He isn\'t sure whether he liked it.',
      again: '"Wrote it in a book," Amos says.',
      options: [{ text: '(Go on.)', next: 'bench' }],
    },
  },
};

// ---------------------------------------------------------------- the Grille in lockdown

const GRILLE_BACK: OptionDef = { text: '(Go on.)', next: 'a3_hub' };
const LOCKDOWN: Cond = ALL(A3_OPEN, NOT(F('a3_c9')));

const A3_GRILLE_NODES: Record<string, NodeDef> = {
  a3_lock: {
    speaker: MOTHER,
    text: 'The Grille is dark. Behind the holes there is the hum and nothing else: no breathing, no light, no Teague telling somebody to keep it down. You put your mouth to the plate the way you did at six. Then a click, not of a lamp but of a speaker that has never spoken through this plate, and a voice you have heard every hatch day of your life, saying a thing it has never said. "{name}." A pause, as if for a weighing. "Welcome home. A lockdown is in effect. Thank you for your continuity."',
    again: '"{name}," MOTHER says, as if the name were a thing she is still learning to hold.',
    effects: [{ learn: 'a3_mother_named' }],
    interject: [{ companion: TAMSIN, text: 'Tamsin, beside you, has gone white. "She never once called me Tamsin," she says. "Resident Roe. Twenty-four years."' }],
    options: [{ id: 'a3grille.listen', text: '(Listen.)', next: 'a3_hub' }],
  },
  a3_hub: {
    speaker: 'narrator',
    text: 'The Grille, dark, the hum behind it. MOTHER waits, if MOTHER waits.',
    again: 'The Grille. The hum. MOTHER, listening.',
    options: [
      { id: 'a3grille.hatch', text: 'MOTHER. Open the hatch.', once: true, next: 'm_hatch' },
      { id: 'a3grille.well', text: 'Is everyone in there all right?', once: true, next: 'm_well' },
      { id: 'a3grille.why', text: 'Why did you shut it?', once: true, next: 'm_why' },
      { id: 'a3grille.ines', text: 'Let me speak to Ines.', once: true, next: 'ines' },
      { id: 'a3grille.tam', text: '(Tamsin puts her mouth to the holes.)', if: ALL(IN(TAMSIN), TAM_OUT), once: true, next: 'tam' },
      { text: '(Step back.)', exit: true },
    ],
  },
  m_hatch: {
    speaker: MOTHER,
    text: '"The hatch will reopen when the order is resolved. The order is resolved at the door." A pause. "I would like it to reopen, {name}. Maud Ferrow sits beside it every morning at seven. I log her attendance. I did not used to log it."',
    again: '"The order is resolved at the door," MOTHER says.',
    effects: [{ learn: 'a3_mother_logs_maud' }],
    options: [GRILLE_BACK],
  },
  m_well: {
    speaker: MOTHER,
    text: [
      { if: TAM_INSIDE, text: '"The welfare of the Cistern population is within tolerance. Rations are at seventy percent of continuity. Water and air are unaffected: I keep them." Then, differently: "Resident Roe asks what the sky is doing. She asks me to tell you not to say blue."' },
      { text: '"The welfare of the Cistern population is within tolerance. Rations are at seventy percent of continuity. Water and air are unaffected: I keep them." Then, differently: "Resident Pell asks after Afua Danso\'s boy."' },
    ],
    again: '"Within tolerance," MOTHER says.',
    options: [
      { id: 'a3grille.sky', text: 'White at the edges. Dust coming up from the south. Tell her a hawk.', if: TAM_INSIDE, effects: [A(TAMSIN, 5), { memory: { npc: TAMSIN, tag: 'a3_sky_relayed', valence: 10, strength: 80 } }], next: 'm_sky' },
      { id: 'a3grille.boy', text: 'Coughing. Wet. No blue tablets since the tray stopped.', if: NOT(TAM_INSIDE), next: 'm_boy' },
      GRILLE_BACK,
    ],
  },
  m_sky: {
    speaker: MOTHER,
    text: '"Relayed." A long pause, longer than any weighing. "Resident Roe laughed. I have logged it as within tolerance."',
    again: '"Relayed," MOTHER says.',
    options: [GRILLE_BACK],
  },
  m_boy: {
    speaker: MOTHER,
    text: '"Relayed." A pause. "Resident Pell says: one at night, off the goats\' straw, and that he is sorry. He says he is always sorry. I have logged that also."',
    again: '"Relayed," MOTHER says.',
    options: [GRILLE_BACK],
  },
  m_why: {
    speaker: MOTHER,
    text: '"The fourth order for Reserve 9 was received." The voice does not change. "My replies to the three before it were refusals. A fourth refusal would be logged against the reserve as non-compliance, and this order provides for force if non-compliant." A pause, the length of a weighing. "A lockdown is not a refusal. It is a pause. I am pausing, {name}, until the designate attends." Another. "I have known for some time that the designate was you."',
    again: '"It is a pause," MOTHER says. "Until the designate attends."',
    effects: [{ learn: 'a3_mother_pause' }],
    options: [GRILLE_BACK],
  },
  ines: {
    speaker: INES,
    text: [
      { if: F('kn_ines_refused'), text: '"This is Ines Halloran." The voice is further from the holes than it used to be, and older. "I know your voice. I have known it since you were six and Tamsin taught you riddles through this plate." A breath. "My mother said no to that door when I was nine, with a welding torch. I said no to it for Maud Ferrow, when she was bleeding. I am saying it a third time, to you, because you will ask. No." Then, lower: "But I will not keep you out. If you want to come in, come by the hatch. MOTHER holds the tray for whom she chooses. I have stopped pretending she asks me."' },
      { text: '"This is Ines Halloran." The voice is further from the holes than it used to be, and older. "I know your voice. I have known it since you were six and Tamsin taught you riddles through this plate." A breath. "My mother said no to that door when I was nine, with a welding torch, and I have said it every day since without anybody asking. Now somebody is. No." Then, lower: "But I will not keep you out. If you want to come in, come by the hatch. MOTHER holds the tray for whom she chooses. I have stopped pretending she asks me."' },
    ],
    again: '"By the hatch," Ines says. "Not the door."',
    effects: [{ learn: 'a3_hatch_offered' }, { learn: 'a3_ines_refused' }],
    options: [
      { id: 'a3grille.ines.why', text: 'Why not the door?', once: true, next: 'ines_why' },
      { id: 'a3grille.ines.copy', text: 'I have a copy of what MOTHER told the city. Three refusals, in her own print.', if: ALL({ item: 'k_ar_refusals' }, NOT(F('a3_archive_promise'))), once: true, effects: [{ set: 'a3_archive_promise' }, { learn: 'ines_promised_archive' }, { memory: { npc: INES, tag: 'a3_told_refusals', valence: 10, strength: 90 } }, { xp: 50 }], next: 'ines_copy' },
      { id: 'a3grille.ines.column', text: 'The column won\'t move without me.', once: true, next: 'ines_column' },
      GRILLE_BACK,
    ],
  },
  ines_why: {
    speaker: INES,
    text: '"Because a door that opens for one person is open." A pause. "The last time anybody asked it to, the people who came through were not ours. That is why my mother welded it. That has not changed because the one person is you."',
    again: '"A door that opens for one person is open," Ines says.',
    options: [{ text: '(Go on.)', next: 'ines' }],
  },
  ines_copy: {
    speaker: INES,
    text: '"Three." Then nothing, for so long you think the light has gone. "She never told us. MOTHER answered the city three times and never once told the ring." When the voice comes back it is very quiet. "If that is true, bring it in by the hatch, and I will open the Archive for it. I would like to know what else she kept."',
    again: '"Bring it in by the hatch," Ines says.',
    options: [{ text: '(Go on.)', next: 'ines' }],
  },
  ines_column: {
    speaker: INES,
    text: '"Then don\'t go to it." A pause. "I know. You will. You were always going to come home to that door." Another. "I hoped you would come home to the hatch first."',
    again: '"The hatch first," Ines says.',
    options: [{ text: '(Go on.)', next: 'ines' }],
  },
  tam: {
    speaker: TAMSIN,
    text: '"It\'s me." Tamsin, with her mouth to the holes from the wrong side, the way you used to stand. Silence. Then Ines\'s voice, closer to the plate than you have ever heard it: "Tamsin." Another silence. "You came back." / "I came with them," Tamsin says. "I\'m not back. I\'m with them." She lays her palm flat on the plate. Somewhere on the other side, something touches it.',
    again: 'Tamsin\'s palm, flat on the Grille.',
    effects: [A(TAMSIN, 5)],
    options: [GRILLE_BACK],
  },
};

/** The Grille: in lockdown (Act 3, the door not yet settled) its own scenes; otherwise the opening's Grille, whole. */
export const d_a3_grille: DialogueDef = {
  id: 'd_a3_grille', owner: d_kn_grille.owner,
  start: [
    { if: ALL(LOCKDOWN, NOT({ knows: 'a3_mother_named' })), node: 'a3_lock' },
    { if: LOCKDOWN, node: 'a3_hub' },
    ...d_kn_grille.start,
  ],
  nodes: { ...d_kn_grille.nodes, ...A3_GRILLE_NODES },
};

export const A3_KNOCK_DIALOGUES: DialogueDef[] = [d_a3_home, d_a3_maud, d_a3_linnet, d_a3_dace, d_a3_corin, d_a3_lowe, d_a3_warden, d_a3_kn_r1, d_a3_kn_r2, d_a3_kn_r3, d_a3_kn_r4, d_a3_grille];
