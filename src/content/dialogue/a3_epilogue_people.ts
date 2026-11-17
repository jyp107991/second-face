import type { Text } from '../../engine/dialogue/dialogue';
import type { Cond } from '../../engine/world/logic';
import {
  ALLY, ASH, B4B, CHAIR_TOOK, COMPANIONS, ENDED, ENDED_A1, EP_CHAIR, EP_HOME, EP_STAYED, EP_TOGETHER, EP_TOGETHER_END, ILYA, KES, M3_HALCYON, M4_CISTERN,
  MET_COMPANION, NINE, NINE_CONSCIENCE, NINE_DEED, ODILE, ON_SIDE, SARR_DEAD, TAM_FOLLOWED, TAM_IN_CARRICK, TAM_STOOD, TAMSIN,
  VASHA_DEAD, WITH_YOU, WREN, WREN_ROPE_LATE, type Mod,
} from '../world/a3_conds';
import { ALL, ANY, cat, F, facts, modText, NOT, simplify, type SlideLine, type SlidePerson, type SlideSpec, type SlideVariant } from './a3_epilogue_kit';

/**
 * The epilogue, slides 20–27 (B6v): the seven companions, then R49, the portrait's own date. Data only: `a3_epilogue.ts` builds
 * the tree. A companion's slide shows once the player met them in person (Tamsin's always: she was the voice at the Grille);
 * its first variant that holds is the companion's end (§7: dead, departed, then where their life went), and the last is the
 * life they lived without the player, or beside them with no particular after. A romance begun is a line under the page whatever
 * became of it (together, apart and still writing, ended, left unfinished, or cut short by a leaving or a death); so are the last
 * night at the fire had as friends and a word given there that the end broke. R49 is the PC nineteen years on: on the steps in
 * the sash under the Plan worn, the Concern and the Amendment; at home (`EP_HOME`) under the Plan refused, the core destroyed and
 * the open sky, with the partner beside them only when the romance's end is together (`EP_TOGETHER`).
 * Story notes: story/B6_NOTES_SECRET.md §6, §7 and "As built" → B6v.
 */

const val = (m: Mod, id: string): Cond => {
  const v = m.values.find((x) => x.id === id);
  if (!v?.if) throw new Error(`${m.id}: no conditional value ${id}`);
  return v.if;
};
const ADA = 'npc_sh_01', SEFA = 'npc_wh_01', THREE = 'npc_ar_01', DORIA = 'npc_of_06';
const alive = (npc: string): SlidePerson => ({ npc, if: NOT({ dead: npc }) });
const V = (id: string, cond: Cond | undefined, place: string, spot: string, people: SlidePerson[], light: SlideVariant['light'], text: Text, lines?: SlideLine[]): SlideVariant => ({
  id, ...(cond ? { if: cond } : {}), place, spot, people, light, text, ...(lines?.length ? { lines } : {}),
});
/** The reserve gone west by any road (the order, consent, the guild's paper, Carrick's quay, the chair's first act). */
const TAKEN: Cond = ANY(F('a3_c9', 'relocated'), F('a3_c9_how', 'sold'), CHAIR_TOOK);
const WALKED: Cond = val(M4_CISTERN, 'walked');
const SOLD: Cond = F('a3_c9_how', 'sold');
/** A romance that began: any step taken (ended included), never a no. `NIGHT`: the last night's beat had at the fire, even put off
 * (`a3_<c>_night`, B6n); `FRIENDS`: that night had as friends (`a3_<c>_last` = none, B6n/B6o). */
const BEGAN = (flag: string, on: string[]): Cond => ANY(...[...on, 'ended'].map((v) => F(flag, v)));
const NIGHT = (c: string): Cond => F(`a3_${c}_night`);
const FRIENDS = (c: string): Cond => F(`a3_${c}_last`, 'none');
/** A line under the page of a companion who died or walked away while something was between them (failed romances keep their weight). */
const LOST = (began: Cond, text: SlideLine['text']): SlideLine => ({ label: 'Between them', if: began, text });

// ---------------------------------------------------------------- 20. Tamsin

const TAM = (o?: Cond): SlidePerson => ({ npc: TAMSIN, ...(o ? { if: o } : {}) });
/** Her life stayed the Cistern's: never out of it, or gone home into it. */
const TAM_INSIDE_LIFE: Cond = ANY(F('tam_home'), ALL(NOT(F('tam_joined')), NOT(F('tam_out'))));
const TAM_UNFINISHED: Cond = ANY(F('tam_romance', 'open'), F('tam_romance', 'later'));
const TAM_BEGAN: Cond = ANY(BEGAN('tam_romance', ['together', 'open', 'later', 'stopped']), F('tam_listed'));
const TAM_LAST: SlideLine = {
  label: 'The last night', if: ALL(FRIENDS('tamsin'), NOT(F('tam_romance', 'together'))),
  text: `On the last night before the steps they had played the Grille's game turned round, Tamsin telling {name} what the sky was doing and getting most of it wrong. She brought it up all year, as a win.`,
};
const TAM_GRIEF = LOST(TAM_BEGAN, `{name} went up to the windpump once that year, alone, and stood there until dark, and left nothing on the marker, because she would only have asked what it was for.`);
const TAM_LOST = LOST(TAM_BEGAN, [
  { if: F('tam_listed'), text: `{name} stayed on her list, under Ines, in a hand that did not shake. She never crossed the name out, and she never added anyone after it.` },
  { if: ANY(F('tam_romance', 'ended'), F('tam_romance', 'stopped')), text: `It had ended when she walked, and she did not pretend it had not happened. She kept the riddle she had been saving to ask {name} after, and told it to nobody.` },
  { text: `She walked away from what was between them unfinished, which Nell said was the part she minded most. Once, in the winter, she asked whether {name} had asked after her, and went out before the answer.` },
]);
const TAM_HEART: SlideLine = {
  label: 'Between them', if: ANY(F('tam_romance', 'together'), F('tam_listed'), F('tam_romance', 'stopped'), F('tam_romance', 'ended'), TAM_UNFINISHED),
  text: [
    { if: ALL(EP_TOGETHER_END.tamsin, ENDED('amendment')), text: `{name} sat in the chair in the city, and she would not live under it, so {name} rode out to her three nights in seven, in all weathers. Every time, she asked what the sky had done on the road.` },
    { if: EP_TOGETHER_END.tamsin, text: `They were together, that year and after. Most nights she still asked what the sky was doing, and {name} still told her, and never once said blue.` },
    { if: F('tam_romance', 'together'), text: `{name} wore the sash, and she could not live under it. They wrote every week. Her letters began with the weather and ended with a riddle, and neither of them ever said aloud what the riddle was about.` },
    { if: F('tam_listed'), text: `{name} stayed on her list, under Ines, in a hand that did not shake. She never crossed the name out, and she never added anyone after it.` },
    { if: F('tam_romance', 'stopped'), text: `She did not wait for {name}, who had asked her not to, to her face, and she had said thank you for that, and meant it, and it had cost her, and she paid.` },
    { if: ALL(TAM_UNFINISHED, NIGHT('tamsin')), text: `She had asked on the last night, and {name} had said after. After turned out to be a long time. Neither of them hurried it, and neither of them let it go.` },
    { if: TAM_UNFINISHED, text: `Something had been starting between them, and it never got a name. It did not get one that year either. She did not hurry it, and she did not let it go.` },
    { text: `What had been between them was over, and she did not talk about it, which for Tamsin Roe was the loudest thing she ever did.` },
  ],
};

const SLIDE_TAMSIN: SlideSpec = {
  id: 'tamsin',
  variants: [
    V('door', F('a3_tamsin_dead'), 'c9_mouth', 'corin_pump', [], 'dusk',
      `Knock buried Tamsin Roe on the rise by the windpump, facing south, because she had always wanted to see where the weather came from. The sixty she had sat down in the door for were gone by then, as written, and nobody told them for a month. The record that had never counted her entered her once, in a warden's hand: ROE, T., RESERVE 9, DECEASED IN THE EXECUTION OF AN ATTENDED ORDER. It was the only line it ever held for her. Somebody scratched a hawk on the marker, badly, and nobody rubbed it out.`,
      [TAM_GRIEF]),
    V('taken', ALL(TAM_INSIDE_LIFE, TAKEN), 'cistern9', 'bunk_tamsin', [], 'night', [
      { if: F('a3_tam_carried'), text: `Nine carried Tamsin Roe out of the door as gently as it had ever carried anything, and set her down on the apron, and the car went west without her. She walked after it. She stood outside the Hospice block for a month until they let her in to visit the others, and after that she visited every day, and brought them the weather from outside, since none of them could get to a window.` },
      { if: WALKED, text: `Tamsin Roe went west in the car with the sixty, which was the first time she had been anywhere, and walked off it at Carrick as a passenger with the rest: first off the tailboard and last off the quay. By the spring she had a job on the river stairs, counting what came up them, which she said was not the same as being counted, and she was teaching Effie the names of everything that floated.` },
      { if: SOLD, text: `Tamsin Roe walked up the guild's road with the sixty, and at the Weighhouse gate the clerk could not find her on his sheet: MOTHER had never counted her, so neither had the paper. He asked who she was. She told him nobody, and walked off down the hill while he was still looking, and was in Shale in four days. She went back to that gate every week afterwards and asked for the others by name.` },
      { text: `Tamsin Roe went west in the car with the sixty, which was the first time she had been anywhere. Precinct Supply graded them by morning at the Hospice block, and the clerk who counted them off the car counted sixty-one, twice, and entered the extra as an error. She laughed at him until a warden made her stop. Then she asked to be shown the sky from the roof, and was told it was not on the schedule.` },
    ]),
    V('inside', TAM_INSIDE_LIFE, 'c9_mouth', 'maud_hatch', [TAM(F('a3_c9', 'opened'))], 'day', [
      { if: F('a3_c9', 'opened'), text: `When the ring voted the door open, Tamsin Roe was through it before the count was finished, and stood on the apron with her face turned up and her eyes shut for most of an hour, because she had decided years ago that the first time would be like that. Then she asked Knock what everything cost, and argued with all of it. By the spring she had been as far as Shale and back, twice, and called it the world.` },
      { if: F('tam_home'), text: `Tamsin Roe stayed behind the door she had gone home to, and came to the Grille on hatch days to ask Knock what the sky was doing. She did not ask after {name}. When the name came through the holes she let somebody else answer, and went back to the hydroponics, and counted algae, which she had said once was worse than being afraid, and found it was not, quite.` },
      { text: `Tamsin Roe stayed behind the door, as she had stayed all her life, and came to the Grille on hatch days to ask what the sky was doing. When {name}'s letters came, somebody at Knock read them to her through the plate, and she answered every one at length, mostly about algae, and once about a riddle she said was not a riddle. She told Knock's children riddles through the holes, and the lie was never in the answer.` },
    ]),
    V('stood', TAM_STOOD, 'c9_mouth', 'tam_door', [TAM()], 'dawn', [
      { if: TAM_IN_CARRICK, text: `Tamsin Roe sat in the door until there was nothing left to sit in it for, then followed the car west on foot, and was on the quay at Carrick when the sixty walked off it as passengers. She did not come back to {name}. She had said she would stand in it, and she had stood in it alone; that was the part she could not put down. She stayed in Carrick with them, and learned the river, and wrote to Knock every week.` },
      { if: TAM_FOLLOWED, text: `Tamsin Roe sat in the door until the order went over it, and then walked after the car, and stood outside the Hospice block for a month until they let her in to visit. She visited every day after that. She did not come back to {name}. She had said she would stand in it, and she had stood in it alone; that was the part she could not put down, and she did not try very hard.` },
      { text: `Tamsin Roe sat in the door until it was settled, and the door held. When the column had gone she got up off the concrete, stiff, and did not go back in, and did not come back to {name} either. She had said she would stand in it, and she had stood in it alone; that was the part she could not put down. She stayed on Knock's slope by the door, and knocked on it every morning to say she was there.` },
    ], [TAM_LOST]),
    V('reserve', F('tam_left', 'reserve'), 'shale', 'bar', [TAM()], 'dusk', [
      { if: WALKED, text: `Tamsin Roe heard it at Mags's from a caravan hand: the Cistern opened, the sixty in a wardens' car. She put down the glass she was drying and walked west that afternoon, and found them at Carrick, walking off the car as passengers. She stayed with them. She did not write to {name} again, and when anybody said the name in her hearing she went out to look at the river until they had finished.` },
      { if: SOLD, text: `Tamsin Roe heard it at Mags's from a guild driver who thought it was good news: sixty people off a sheet at forty Tolls a head. She hit him, and the Dry Well barred her for a week, and she walked to the Weighhouse gate and stood at it every morning, asking for the sixty by name, until the guild's men knew her face better than their own. She did not write to {name} again.` },
      { text: `Tamsin Roe heard it at Mags's from a caravan hand: the Cistern opened on an order, the sixty in a wardens' car going west. She put down the glass she was drying and walked after them, and stood outside the Hospice block for a month until they let her in to visit. She did not write to {name} again. Nell kept her cot made up at Mags's for a year, in case, and then stopped.` },
    ], [TAM_LOST]),
    V('chair', ALL(CHAIR_TOOK, WITH_YOU('tamsin')), 'c9_mouth', 'apron_1', [TAM()], 'dusk',
      `The first paper the Magistrate signed was the fourth order, and Tamsin Roe heard it from a clerk on the close before the ink was dry. She did not say anything. She walked down the lane and out of the city and up the toll road a day behind the column, and got to Knock in time to see the car go west with the door standing open behind it on a swept hall. She did not sit down in it. There was nobody left to sit in it for.`,
      [{
        label: 'Between them', if: ANY(F('tam_romance', 'together'), F('a3_tamsin_word')), text: [
          { if: ALL(F('tam_romance', 'together'), F('a3_tamsin_word')), text: `{name} had given her {their} word at the fire, and she had believed it. What had been between them ended with the signature, without a word from either of them, and she never wrote.` },
          { if: F('tam_romance', 'together'), text: `What had been between them ended with the signature, without a word from either of them. She never wrote. Nell said she started a letter once, and burned it.` },
          { text: `{name} had given her {their} word at the fire not to sign the door. It was the first thing the chair broke.` },
        ],
      }]),
    V('gone', ANY(F('tam_left'), F('tam_broken')), 'shale', 'bar', [TAM()], 'dusk', [
      { if: F('tam_broken'), text: `Tamsin Roe stayed at Mags's with Nell after she walked out of {name}'s camp, as she had said she would, and learned to pour without spilling and to tell when a Tollman was lying, which was always. Nothing happened at the door that could bring her back. By the spring she worked the Dry Well's bar, and told the caravans what the sky was doing whether they asked or not, and when {name}'s name came up she wiped the same glass until it went away.` },
      { text: `Tamsin Roe took the cot Nell had for her at Mags's and kept it, and by the spring she worked the Dry Well's bar as well, and told the caravans what the sky was doing whether they asked or not. She did not come back to {name}'s fire, and nobody asked her to explain. When the name came up at the bar she listened to the end, and then went on wiping the same glass.` },
    ], [TAM_LOST]),
    V('waited', NOT(F('tam_joined')), 'shale', 'bar', [TAM()], 'day',
      `MOTHER held the hatch for Tamsin Roe, out of turn, and she climbed out into the first sky of her life and went down the track to Shale to find a face she only knew by its voice. It did not come to Mags's. She waited a whole season behind the bar with Nell, learning what everything cost. Then she went south with the Wheel's carts to see the sea, which she had read about, and sent Knock a picture of it with nothing on the back but the weather.`),
    V('deputy', ALL(F('a3_shale', 'free'), F('ks_ada', 'stays')), 'shale', 'deputy', [TAM(), alive(ADA)], 'dusk',
      `Ada Vey pinned a deputy's star on Tamsin Roe in the street outside the office, crooked, and said that was the ceremony. Tamsin wore it all year and polished it more than was decent. She broke up fights at the Dry Well by talking faster than either side, walked the night round with a lamp, learned the town's water book by heart, and when the guild sent a man up the road with paper she read it aloud on the office step, slowly, so the street could laugh in the right places.`,
      [TAM_HEART, TAM_LAST]),
    V('sheriff', F('a3_shale', 'free'), 'shale', 'sheriff_desk', [TAM()], 'dusk',
      `Shale had no sheriff after Ada, and nobody wanted it, so Tamsin Roe took the star off the shelf herself and pinned it on and dared anybody to say anything. Nobody did, for a while. She was a bad sheriff for a month and a good one by the winter: she knew what everything cost now, and she never once decided anything for anybody who could decide it for themselves. She left the black cloth on the door all year, and worked under it.`,
      [TAM_HEART, TAM_LAST]),
    V('wheel', ANY(ALLY('wheel'), { member: 'wheel' }), 'wheel', 'ring_b_sit', [TAM(), alive(SEFA)], 'dusk',
      `Tamsin Roe went with the Wheel when its carts came through in the spring, because Sefa Oduya said they could use somebody who was not scared of doors, or roads, or anything, and she had decided to be that. She rode the long loop south and back, haggled for water at every well on it, and was cheated at all of them the first time and none of them the second. She slept under the cart. She said a ceiling was a thing you had to earn.`,
      [TAM_HEART, TAM_LAST]),
    V('knock', F('a3_c9', 'opened'), 'c9_mouth', 'tam_door', [TAM()], 'day',
      `Somebody had to keep a door that opened, and Tamsin Roe said it should be her, and nobody at the council table could think of a reason fast enough. She kept it the whole year, which mostly meant keeping it open: a sandbag against it when the wind came, and a list on the inside of who had gone out and who had come back, which she said was not a count. She was unbearable about it. She knocked on it every morning anyway, to hear the sound.`,
      [TAM_HEART, TAM_LAST]),
    V('after', undefined, 'c9_mouth', 'maud_post', [TAM()], 'day', [
      { if: F('a3_c9_how', 'consent'), text: `The sixty went to the city by their own vote, with their names on their bundles in their own hands, and Tamsin Roe went west a week behind them and found them graded and fed at the Hospice block, and was furious, and visited every week. Most of them were glad to see her. She brought them the weather from outside, since none of them could get to a window, and told them the truth about it, which was that it was cold and loud and wonderful.` },
      { text: `Tamsin Roe went home to the outside of her own door. She took a shack on Knock's slope with a window facing south, and on hatch days she sat at the Grille with her back to the plate and told the sixty what the sky was doing, the game turned round at last, and never once said blue. They asked her what it was like. She told them the truth, which was that it was cold and loud and everything cost something, and that she was never going back in.` },
    ], [TAM_HEART, TAM_LAST]),
  ],
};

// ---------------------------------------------------------------- 21. Wren

const WR = (): SlidePerson => ({ npc: WREN });
const WREN_BEGAN: Cond = BEGAN('wren_rom', ['yes', 'later', 'later_roof', 'roof', 'committed']);
const WREN_HEART: SlideLine = {
  label: 'Between them', if: WREN_BEGAN,
  text: [
    { if: EP_TOGETHER_END.wren, text: `A route or a stop, she had asked {name}, and she had chosen the stop, and it was {name}. Some nights she still woke and checked for the rope, the way you check a pocket, and then went back to sleep.` },
    { if: F('wren_rom', 'ended'), text: `She had kept a count, as she had said she would, and {name} had come to the end of it. She did not say so again. "It's said," she would have told anybody who asked, and nobody did.` },
    { if: NIGHT('wren'), text: `She had asked on the last night, and {name} had said not tonight. She took that to mean a route, for now, and walked it slowly enough to be caught up with.` },
    { text: `She never asked {name} the last question, a route or a stop. She walked beside {name} anyway that year, and did not ask, and the not asking was its own kind of answer.` },
  ],
};
const WREN_LAST: SlideLine = {
  label: 'The last night', if: ALL(FRIENDS('wren'), NOT(F('wren_rom', 'committed'))),
  text: `On the last night she had read {name} the long version of every road she knew, and stopped at the end of the last one, and said: that's all of them. She meant it as a gift.`,
};
const WREN_GRIEF = LOST(WREN_BEGAN, [
  { if: ANY(F('wren_hanged'), F('wren_rope', 'fulfilled')), text: `Whatever there had been between them, the rope did not wait for it to be finished. Perpetua kept a place at the overpass fire for {name} all that year, in case, and nobody sat in it.` },
  { text: `Whatever there had been between them, it did not get the time it needed. Perpetua kept a place at the overpass fire for {name} all that year, in case, and nobody sat in it.` },
]);
const WREN_LATE = LOST(WREN_BEGAN, [
  { if: ALL(F('wren_rom', 'committed'), ENDED_A1), text: `The rope came due under {name}'s own chair, on the schedule the chair kept, and the chair could not unsign it. {name} had known that at the fire. So had she.` },
  { if: F('wren_rom', 'committed'), text: `{name} heard about the booth from the Concern's morning sheet, between two contracts, and put it down, and did not read the rest of the page.` },
  { text: `Whatever had been between them had ended before the rope came, or never finished. It made no difference to how {name} took the news, and nobody who saw it said otherwise.` },
]);
const WREN_LOST = LOST(WREN_BEGAN, [
  { if: F('wren_rom', 'ended'), text: `She ended what was between them herself, the way she ended everything: said once, and meant. "It's said," she told {name}, and it was.` },
  { text: `A route or a stop, she had asked {name}, or would have. It was a route after all, and she walked it alone, and did not write: she had never said a thing she did not mean, and would not start on paper.` },
]);
const WREN_WORD: SlideLine = {
  label: 'Between them', if: ANY(F('wren_rom', 'committed'), F('a3_wren_word')),
  text: [
    { if: F('wren_rom', 'committed'), text: `A route or a stop, she had asked {name}. She took the route, alone, and did not write, because she had never in her life said a thing she did not mean and she was not going to start on paper.` },
    { text: `{name} had given her {their} word at the fire. She held people to their word, to the letter, and she held this one all the way out of the city.` },
  ],
};

const SLIDE_WREN: SlideSpec = {
  id: 'wren',
  met: MET_COMPANION.wren,
  variants: [
    V('hanged', ANY(F('wren_hanged'), F('wren_rope', 'fulfilled'), { dead: WREN }), 'md_bridgeward', 'toll_booth', [], 'dusk', [
      { if: ANY(F('wren_hanged'), F('wren_rope', 'fulfilled')), text: `Wren Calloway was hanged from the Bridgeward toll booth the night the raid went wrong, as the list had written it, and left there a day for the street to see. She had dreamed it since she was twelve. The Dogs cut her down when the wardens went home and carried her back up the overpass stair, where Perpetua had carried her down it at six, and burned her goggles with her, because she would not have wanted anybody else seeing through them.` },
      { text: `Wren Calloway died, and not on the bridge: the rope the city had written for her never got her, and she would have said that was something. The Dogs carried her back up the overpass stair, where Perpetua had carried her down it at six, and burned her goggles with her, because she would not have wanted anybody else seeing through them. Nobody said "fair" at the fire that night. It was Kessler's word, and it did not fit.` },
    ], [WREN_GRIEF]),
    V('rope_late', WREN_ROPE_LATE, 'md_bridgeward', 'toll_booth', [], 'dusk', cat(
      [
        { if: ANY(F('wren_left', 'concern'), ENDED('concern')), text: `Wren Calloway walked out of the vault the day the core was signed over, and did not look back down the stair.` },
        { if: F('wren_left'), text: `Wren Calloway had gone her own way by then.` },
        { if: NOT(F('wren_joined')), text: `Wren Calloway had never walked with {name}.` },
        { if: F('wren_rom', 'committed'), text: `Wren Calloway would not sleep beside the rope, she said, and slept at the overpass, and came to the city when she could.` },
        { text: `Wren Calloway stayed near {name} through the winter, and knew the date, and did not say it.` },
      ],
      `The next year she raided the Bridgeward chain, as written, and the raid went the way the schedule said it would. They hanged her from the toll booth on its date and left her a day for the street to see. She had dreamed it since she was twelve. The Dogs who cut her down said she did not look surprised, and that her goggles were pushed up, so that she could see it properly.`,
    ), [WREN_LATE]),
    V('gone_sold', F('wren_left', 'sold'), 'ninebridge', 'block', [WR()], 'day', [
      { if: SOLD, text: `Wren Calloway walked off down Knock's slope the hour the guild's paper was signed on the door, and did not stop at the overpass, and did not stop at Shale. She went to Ninebridge and stood at the block every auction day that year, not buying, counting the lots aloud, so that somebody did. She never said {name}'s name again. The Dogs said that was a long way from forgiving, and a long way past it.` },
      { text: `Wren Calloway left the night {name} sold the girl on, and did not come back for anything. She went to Ninebridge and walked the block every auction day for a year, looking for a forearm with half a burn on it, and found it in the autumn on a barge crew bound for the Rigs, and bought the girl's paper out with everything she had, and tore it in four on the spot. She never said {name}'s name again.` },
    ], [WREN_LOST]),
    V('gone_concern', ANY(F('wren_left', 'concern'), ALL(ENDED('concern'), ON_SIDE('wren'))), 'md_spire', 'close_e', [WR()], 'day',
      `Wren Calloway walked out of the vault the moment the core was signed over to the Concern, and up the stair, and across the close without looking at the crates. She had said it once at the fire, and she did not say it again. She went back to the overpass and read the Sallow's roads for whoever led the camp, and when the Concern's convoys came through on the way to the Line, she was the one who told the Dogs which wagons were worth the trouble.`,
      [WREN_WORD]),
    V('gone_guild', ANY(F('wren_left', 'guild'), F('wren_left', 'longnight')), 'wild_track', 'ahead', [WR()], 'day',
      `Wren Calloway went east down the lane past the guild's wagons the morning she knew whose hands {name} had shaken, and did not look at them. She had said she would not learn it, and she did not. She went back to the overpass and scouted for whoever led the camp, and walked the long version of every road so as not to pass the block at Ninebridge, and kept a list in her head of people sold on paper. She did not put {name} on it. She did not have to.`,
      [WREN_LOST]),
    V('gone_girl', ANY(F('wren_left', 'block'), F('wren_left', 'away'), F('wren_left', 'kept')), 'ninebridge', 'block', [WR()], 'day', [
      { if: F('wren_left', 'block'), text: `When the auction closed on the girl, Wren Calloway went after the buyer, and did not come back to tell {name} how it ended. Word came up the river in the autumn that a scout with a burned hand had been seen on the Rigs' landing with a younger woman, both of them keeping their sleeves down, and that neither of them would answer to anybody's name. The Dogs took that for good news, and drank to it, and did not ask.` },
      { if: F('wren_left', 'away'), text: `Wren Calloway went east after the girl's paper on her own, without waiting for anybody, and that was the last {name} heard of her from her own mouth. She found it in the end, in a factor's strongbox at Ninebridge, and what she did to get it out was never written down anywhere, which was the point. The girl was in Shale by the spring, behind a door with a lock of her own, and Wren knocked on it, and it opened.` },
      { text: `Wren Calloway left the morning {name} kept the girl's paper in the pack instead of tearing it, because a paper kept is a paper that can be sold, and she had said so once, plainly. She did not try to take it. She went to where the girl was and slept outside her door every night for a season, in case the paper came up the road with a buyer behind it. It did not. She did not thank {name} for that.` },
    ], [WREN_LOST]),
    V('gone_floor', F('wren_left'), 'overpass', 'lookout', [WR()], 'dusk',
      `Wren Calloway left {name}'s fire with her pack on her shoulder and her goggles down, and said what she always said when a thing was finished: it's said. She went back to the overpass and scouted the Sallow for whoever led the camp, and was still the best eyes on its roads, and read the long version of every one of them. When {name}'s name came up at the fire she said "fair", which was Kessler's word, and annoyed her, and said nothing else.`,
      [WREN_LOST]),
    V('shale', F('wren_after', 'shale'), 'shale', 'home_a', [WR()], 'dusk',
      `Wren Calloway went to Shale when the road was walked, and knocked on a door, and the girl opened it. What they said on the step nobody heard. Wren took the shack next door, mended its roof badly, and scouted for Shale's militia when there was anything to scout. She talked about routes to anybody who would listen, and the girl listened, which surprised them both, and by the spring she had stopped reaching for the word she never said, and said it.`,
      [WREN_HEART, WREN_LAST]),
    V('bridge', F('wren_after', 'bridge'), 'md_bridgeward', 'chain_w', [WR()], 'day',
      `Wren Calloway went back to Bridgeward and kept the count. The Dogs who held the chain were hers in all but the saying, and she held them to their word to the letter, and they held the street to theirs. She slept in the toll booth they had meant to hang her from, under the slate with the dog's head burned into it, and slept through. In the spring she sent to Shale for the girl, who came up the river to see, and stayed a month, and said no, and Wren said that was hers.`,
      [WREN_HEART, WREN_LAST]),
    V('road', F('wren_after', 'road'), 'wild_track', 'ahead', [WR()], 'day', [
      { if: EP_CHAIR, text: `Wren Calloway had meant to walk the road with {name}, and {name} had sat down in a chair instead. She walked it anyway, alone, the long version of it, and came to the city twice a year to tell the Magistrate what the roads were really doing, which was never what the schedule said. When it was walked she went to Shale and knocked on a door, and the girl opened it, and Wren stood on the step a long time.` },
      { text: `Wren Calloway walked the road with {name} all that year, the long version of every stretch of it, and read it aloud: two riders, no dust; a well gone bad; a bridge that would take one cart, not two. She was right every time and annoyed when anybody said so. In the autumn they came to Shale and she knocked on a door, and the girl opened it, and Wren stood on the step a long time, and then went in.` },
    ], [WREN_HEART, WREN_LAST]),
    V('scout', undefined, 'overpass', 'lookout', [WR()], 'dusk', [
      { if: NOT(F('wren_joined')), text: `Wren Calloway never walked with {name}. She scouted the Sallow's roads for whoever led the overpass, and read them the long way, and kept her word to the letter and held everybody else to theirs. The rope the city had written for her was still waiting when the year turned. She dreamed about it less, she said, though she would not say why; perhaps only because she was busy, and perhaps because a stranger had come up the road and changed what the list was worth.` },
      { text: `Wren Calloway stayed near {name} through the winter without saying what she would do after, because nobody had ever asked her like there would be one. In the spring she went back to the overpass for a while, and to Shale for a while, and scouted the roads between, and kept her word to the letter, and held everybody else to theirs. When anybody asked her what she was doing now, she said: walking it.` },
    ], [WREN_HEART, WREN_LAST]),
  ],
};

// ---------------------------------------------------------------- 22. Ilya

const IL = (): SlidePerson => ({ npc: ILYA });
const ILYA_BEGAN: Cond = BEGAN('ilya_rom', ['yes', 'later', 'later_well', 'well', 'committed']);
const ILYA_HEART: SlideLine = {
  label: 'Between them', if: ILYA_BEGAN,
  text: [
    { if: EP_TOGETHER_END.ilya, text: `{name} was with him. There was a well, and he drew from it every morning the way Agi used to, and counted the days aloud, and the count had {name} in it now. "Right," he said, and for once it meant only one thing.` },
    { if: ALL(F('ilya_rom', 'committed'), ENDED('concern')), text: `He stayed near {name}, to watch, he said, not to lie down beside it, and he kept his word to the letter: he watched. They did not share a roof again.` },
    { if: F('ilya_rom', 'committed'), text: `The clauses were good ones; he read them twice, slowly, with his finger. He could not sleep in the chair's house all the same, and said so, and went home, and came whenever {name} asked.` },
    { if: F('ilya_rom', 'ended'), text: `What had been between them ended when {name} came to the bottom of what he could stand to count. He said "Right" and moved his bedroll to the far side of the fire.` },
    { if: NIGHT('ilya'), text: `On the last night he had said he would not ask in a city that counted its water by the cup. He did not find the right well that year. He kept looking, and said so, which for Ilya was nearly asking.` },
    { text: `Something had been starting between them, and he had not finished counting it. He did not finish that year. He said some counts took longer, and that this one was worth the time.` },
  ],
};
const ILYA_LAST: SlideLine = {
  label: 'The last night', if: ALL(FRIENDS('ilya'), NOT(F('ilya_rom', 'committed'))),
  text: `On the last night they had counted together at the fire, stars and then sticks and then nothing at all. He said afterwards it was the first count in years he had not needed to finish.`,
};
const KADE_LINE: SlideLine = {
  label: 'Kade', if: ANY(F('vasha_fate', 'ilya'), F('vasha_fate', 'player'), F('vasha_fate', 'spared_why')),
  text: [
    { if: F('vasha_fate', 'ilya'), text: `He had shot Vasha Kade at the Bridgeward booth, after she knew why. He did not talk about it. Some mornings he took the rifle down and cleaned it for no reason, and put it back.` },
    { if: F('vasha_fate', 'player'), text: `{name} had shot Kade at the booth, and he had let {them}. Some nights he minded that, and said so, and some nights he said it was the same thing.` },
    { text: `Kade carried the letter now, and knew what she had been for. He said that was worse than a bullet, and on most nights he believed it.` },
  ],
};

const SLIDE_ILYA: SlideSpec = {
  id: 'ilya',
  met: MET_COMPANION.ilya,
  variants: [
    V('hunter', ALL(F('ilya_left', 'spared'), ANY({ flag: 'ilya_sober_days', gte: 30 }, VASHA_DEAD)), 'wild_rough', 'far', [IL()], 'dusk', [
      { if: VASHA_DEAD, text: `Ilya Strand went after Vasha Kade alone the day {name} let her walk, and somebody else got to her first. He heard it at a well in the Sallow from a man who had not been there. He sat by the well until dark and counted the stars to a thousand, sober, and then got up and walked on into the Sallow, north, where there was nothing left to count, and nobody who knew him saw him again.` },
      { text: `Ilya Strand went after Vasha Kade alone the day {name} let her walk without a reason, and found her in the spring at a fire in the Sallow, eating, with her back to the dark. He lay in the scrub at four hundred paces and counted his breathing, sober, and had her twice. Then he laid the rifle across his knees, and got up, and walked away from the fire into the Sallow, north, and nobody who knew him saw him again.` },
    ], [LOST(ILYA_BEGAN, `He did not come back to say goodbye. Of everything he never counted aloud, {name} was the last, and he took the number with him into the Sallow.`)]),
    V('hunted', F('ilya_left', 'spared'), 'wild_rough', 'fire', [], 'night',
      `Ilya Strand went after Vasha Kade alone the day {name} let her walk without a reason, and he was drinking again inside the month, and counting wrong. He found her fire in the Sallow in the spring. He had always been Ada's worst shot, and the bottle had taken the rest. Kade sent his rifle back to Shale with a Dog who would not say how it had gone, which was how everybody knew. Shale hung it on the office wall, and did not say his name for a year.`,
      [LOST(ILYA_BEGAN, `What had been between them went up the wash with him. Shale did not know what to say to {name} about it, so it said nothing, and hung the rifle where {name} would see it.`)]),
    V('drunk', ANY(F('ilya_left', 'bottle'), F('ilya_left', 'floor')), 'shale', 'bar', [IL()], 'night', [
      { if: F('ilya_left', 'bottle'), text: `Ilya Strand drank the bottle {name} had held out to him for a better shot, all of it, and then the next one, and the count went back to one and stayed there. By the winter he slept on the Dry Well's back step, where they let him because he had once been the militia. He still counted under his breath: bottles, mostly. When anybody said {name}'s name he got up and went somewhere else to count.` },
      { text: `Ilya Strand left {name}'s fire on a bad night and went back to Shale, and drank, and stopped, and drank. Shale kept him on the militia's books as its worst shot because it always had. Some months he was sober and drilled the boys at dawn and counted them off aloud; some months somebody found him on the Dry Well's back step. He kept the city's letter in his jacket, and did not read it again.` },
    ], [LOST(ILYA_BEGAN, `What had been between them did not survive the bottle, and he knew it, and drank to that as well. He never once blamed {name} for it, aloud or otherwise.`)]),
    V('chair', ALL(ENDED_A1, F('ilya_recruited')), 'shale', 'yard', [IL()], 'dawn',
      `Ilya Strand would not stand beside the chair. The Plan that sat in it had timed the raid up the wash eleven springs ago, to the night. He said so in one word, "Right", and walked out of the city on the east road, and did not look back to count anything. He went to Shale, and drilled the boys at dawn, and when the chair's orders came up the road on schedule he read them aloud in the yard, slowly, so that everybody would know whose hand they were in.`,
      [{
        label: 'Between them', if: ANY(F('ilya_rom', 'committed'), F('a3_ilya_word')), text: [
          { if: F('ilya_rom', 'committed'), text: `{name} had let him count it, and he had. He did not stop counting when he left; he only stopped saying the number aloud.` },
          { text: `{name} had given him {their} word at the fire not to sit in it. He had counted on that. He did not say so.` },
        ],
      }]),
    V('shale', F('ilya_after', 'shale'), 'shale', 'yard', [IL()], 'dawn',
      `Ilya Strand went back to Shale and drilled the boys at dawn on the square in the cold, and counted them off aloud, and was hard on them in a way they forgave because he was harder on himself. He was not Ada's worst shot any more. He did not drink. On the night of the raid, twelve springs on, he walked up the wash alone and sat by the old medicine store until dark, and came back and said "Right" and went to bed.`,
      [ILYA_HEART, ILYA_LAST, KADE_LINE]),
    V('road', F('ilya_after', 'road'), 'wild_track', 'here', [IL()], 'dawn', [
      { if: EP_CHAIR, text: `Ilya Strand had said he would stay on the road with {name}, and then {name} took a chair. He stayed on the road anyway, and came to the city when the wind was right to tell the Magistrate where it was, which nobody else in the Precinct could. He counted the days sober in a book he no longer needed, and wrote the wind in the margin, and once, in the spring, a name.` },
      { text: `Ilya Strand stayed on the road with {name}, as he had said, and told {them} where the wind was every morning before {name} asked: the hour-long short version. He counted everything, stars and sticks and rounds and the days sober, which ran past three hundred that year, and he said the number aloud on the night it did, once, and never again.` },
    ], [ILYA_HEART, ILYA_LAST, KADE_LINE]),
    V('rest', F('ilya_after', 'rest'), 'drywells', 'yard', [IL()], 'day',
      `Ilya Strand had said that some day he wanted to stop counting, and that year he tried. He took a hut by a well a day out of Shale, where nobody had ever written his name on anything, and dug, and drew water, and slept. Some days he caught himself counting the rows and stopped. Some days he did not catch himself, and said that was allowed. He said "Right" less often, and when he did, it meant only one thing.`,
      [ILYA_HEART, ILYA_LAST, KADE_LINE]),
    V('own', undefined, 'shale', 'yard', [IL()], 'dawn', [
      { if: NOT(F('ilya_recruited')), text: `Ilya Strand never walked with {name}. He stayed in Shale as Ada's worst shot, and drank and stopped and drank, and carried a letter in his jacket he could not read, and said "Right" to everything. He drilled the boys at dawn when he was sober enough, and was hard on them, and harder on himself, and some mornings he did not come. Shale kept him on anyway. It always had.` },
      { text: `Ilya Strand stayed near {name} that year without saying what he would do after, because he did not know what a man did, after. He counted the days sober and the stars and the rounds in his belt, and talked about the wind until somebody stopped him. In the spring he went back to Shale for a while, and said he would be back, and was, on the day he had said.` },
    ], [ILYA_HEART, ILYA_LAST, KADE_LINE]),
  ],
};

// ---------------------------------------------------------------- 23. Odile

const OD = (): SlidePerson => ({ npc: ODILE });
const ODILE_LINES: SlideLine[] = [
  {
    label: 'Her price', if: F('odile_price', 'sarr'), text: [
      { if: ALL(F('a3_odile_word'), ANY(ENDED('opensky'), ENDED('amendment'))), text: `Imelda Sarr walked out alive, and answered for the riders in daylight, as {name} had given {their} word she would. Odile went to hear it, and did not look pleased, and was.` },
      { text: `Imelda Sarr walked out alive. That had been the price, and it was paid; what else Odile had wanted, she never asked for.` },
    ],
  },
  {
    label: 'Her book', if: F('a3_odile_last'), text: [
      { if: F('a3_odile_last', 'open'), text: `Her tab with {name} stayed open, at {name}'s asking. She added a line to it every month, small, and showed nobody.` },
      { text: `Her tab with {name} was paid at the bottom and ruled off twice. She kept the page anyway.` },
    ],
  },
];

const SLIDE_ODILE: SlideSpec = {
  id: 'odile',
  met: MET_COMPANION.odile,
  variants: [
    V('gone', ANY(F('odile_gone'), F('odile_left')), 'ninebridge', 'span_table', [OD()], 'dusk', [
      { if: F('odile_archive', 'burned'), text: `Odile Marchetti walked to the Span the night {name} took the lamp past her hand, and did not come back. "That was a cost," she had said, and she had meant it as a total. She kept a table on the eighth span after that, and told anybody who asked that she had once known a person who thought paper was only paper. She never said who. The floor rebuilt its archive from memory, badly, and she corrected nobody.` },
      { if: F('odile_sold_sable'), text: `Odile Marchetti sold Wren's girl for {name} at the clerk's desk, and was good at it, and walked to the Span afterwards and did not come back. It was a cost she would not carry next to {name}, so she carried it alone, every day of that year, at a table on the eighth span, buying back other people's bad paper with what was left of her credit and tearing it small.` },
      { if: ANY(F('odile_left', 'price'), F('odile_left', 'longnight')), text: `Imelda Sarr did not come out of it alive, and that had been Odile Marchetti's price. "I told you my price, my dear," she said, and buttoned her coat to the throat, and walked east to the bridge she was born on. She did not come back. She kept Imelda's old ink-pot on her table on the eighth span all that year, and did not use it, and did not let anybody move it.` },
      { text: `Odile Marchetti closed her tab with {name} in her own book, at a loss, and went back to the Span. She did not explain; she never argued a closed sheet. By the spring she had a table on the eighth span and a small, honest trade in other people's bad paper, and when {name}'s name came up she said "that is a cost" and changed the subject to Ninebridge before the Exchange, at length.` },
    ]),
    V('exchange', ALL(ENDED('concern'), F('odile_joined')), 'ninebridge', 'hall_floor', [OD()], 'day',
      `Odile Marchetti went back on the floor at Ninebridge when the Concern bought the city's future, because somebody had to price it who knew what it was, and she said she would rather it was her than a man in a good coat. She was very good. The floor had never seen spreads like the ones she wrote that year, and she did not sleep well on any of them. "That is a cost," she said, when anybody asked her how she was, and smiled, and wrote another.`,
      ODILE_LINES),
    V('auditor', ALL(ENDED('amendment'), F('odile_joined')), 'ninebridge', 'hall_desk', [OD()], 'day', cat(
      `The chair made Odile Marchetti its auditor of the guild in the first season, and she took the Exchange's books apart line by line with her Gyro hand and her born one, and found everything she had known was there, and some things she had not. She did not enjoy it, she said, which nobody believed.`,
      [
        { if: SARR_DEAD, text: `The Grand Factor's chair stood empty across the table from her all year. She audited it anyway, out loud, as if somebody were in it to answer.` },
        { text: `She sat across the table from Imelda Sarr every week of that year, and asked her questions in the politest voice on the bridge, and wrote down every answer.` },
      ],
    ), ODILE_LINES),
    V('shale', ALL(F('odile_sheet', 'torn'), F('odile_joined')), 'shale', 'saloon_table', [OD()], 'dusk',
      `Odile Marchetti went to live in the town she had shorted, to be ashamed in person, as she put it. She took two rooms over the street and wrote Shale's water sheets the honest way, which nobody there had ever seen done, and charged for it in eggs. The sheet she had written on Shale was torn and gone. She told the town about it herself, at the Dry Well, the whole of it, and then bought a round, and nobody threw anything, which she said was the most expensive drink of her life.`,
      ODILE_LINES),
    V('kitchen', F('odile_joined'), 'ninebridge', 'span_stove', [OD()], 'dusk', cat(
      [
        { if: ENDED('opensky'), text: `When the radios read the city's book, every sealed sheet on the Exchange floor went to daylight at once, and Odile Marchetti laughed until she had to sit down.` },
        { if: ENDED('unwritten'), text: `When the city went dark there was nothing left to price, and the Exchange floor emptied in a week.` },
        { text: `The Exchange went on pricing the weather without her.` },
      ],
      `She ran the soup line on the eighth span all that year: one pot, one ladle, a slate with the day's price on it, which was nothing. She kept a tab on everybody who ate, in a good round hand, and never collected on any of it. "It is the first honest book on the bridge," she said. "Somebody had to open one."`,
    ), ODILE_LINES),
    V('span', undefined, 'ninebridge', 'span_table', [OD()], 'dusk',
      `Odile Marchetti never walked with {name}. She kept her table on the eighth span and her Gyro hand in her coat, and priced the weather for anyone who could pay, and told the story of the ninth span to anyone who could not, at length. The sheet she had written on Shale was somewhere on the floor; she knew where, and did not go and look. She said that was a cost, and poured, and talked about something else, beautifully, until it was late.`),
  ],
};

// ---------------------------------------------------------------- 24. Ash

const AS = (): SlidePerson => ({ npc: ASH });
const SPOKEN: Cond = F('ash_gully_outcome', 'spoken');
/** His word at the fire not to put the sash on (`a3_ash_word`, B6o), when it was put on; the letter burned there (`a3_ash_last`). */
const ASH_WORD: SlideLine = {
  label: 'His word', if: ALL(F('a3_ash_word'), F('a3_sash', 'worn')),
  text: `{name} had given him {their} word at the fire not to put the sash on, and had put it on. He did not hold it against {name}. He held it, which with Ash was not the same thing.`,
};
const ASH_LETTER: SlideLine = {
  label: 'The letter', if: F('a3_ash_last', 'burned'),
  text: `He had burned the letter at the fire on the last night, in front of {name}, and said {name}'s name aloud while it went. He never carried another.`,
};

const SLIDE_ASH: SlideSpec = {
  id: 'ash',
  met: MET_COMPANION.ash,
  variants: [
    V('self', F('a3_ash', 'self'), 'openfield', 'burial_sit', [alive(DORIA)], 'dusk', cat(
      `Brother Ash's order fell on himself at the foot of the lamp, with the one shell he had loaded at the fire.`,
      [
        { if: NOT({ dead: DORIA }), text: `Doria Ruiz came for him with a cart, and washed him, and buried him at Openfield at the end of the row he had dug for other people. She cut nineteen notches in the marker and one more, and no name. "He'd have counted," she said.` },
        { text: `The Choir buried him at Openfield, fifty yards from the seed store, in the row he had dug for other people, and nobody put his name on it, because he would have told them not to.` },
      ],
      `His shotgun went back to the Choir clean. It had been cleaned every night for years, and fired once.`,
    )),
    V('unwritten', F('a3_ash', 'away'), 'openfield', 'lane_w', [], 'dusk', cat(
      [
        { if: F('a3_ash_target', 'vane'), text: `Brother Ash walked off the close the day the sash was worn, and in the first autumn he went to Celestine Vane's table, where the line was worn most gladly, and put the sky's order on her.` },
        { if: F('a3_ash_target', 'vasha'), text: `Brother Ash walked off the close the day the sash was worn, and in the first autumn he went to Vasha Kade's fire, where the line was worn most gladly, and put the sky's order on her.` },
        { text: `Brother Ash walked off the close the day the sash was worn, and in the first autumn he went in among Imelda Sarr's clocks, where the line was worn most gladly, and put the sky's order on her.` },
      ],
      `He did not fire first. She saw him and reached for something, and his vow had only ever promised that much. Then he went to his brothers, who keep no likeness, and nobody who had known his face saw it again. Somebody at Openfield said a man came to the seed store once that winter with his hood up, and left seed, and gave no name.`,
    ), [ASH_WORD]),
    V('gone', ANY(F('ash_gone'), F('ash_left'), ALL(ENDED('concern'), ON_SIDE('ash'))), 'openfield', 'burial_walk', [AS()], 'dusk', [
      { if: F('a3_ash', 'struck'), text: `Brother Ash hit {name} once with the stock of his own gun on the Spire's steps, because his vow would not let his finger do the rest, and walked down the lane and out of the city. He went west to Openfield's burial ground and dug, and did not speak of the steps to anybody. The vow had held. He did not know, he said once, to a fire, whether that made him a better man or only a slower one.` },
      { if: F('ash_redline'), text: `Brother Ash walked west into the glass toward Openfield's burial ground the morning he knew what {name} had done to the Choir, and did not look back. "Go well, friend," he had said. "Not with me." He dug the Choir's graves that year, the ones the night had made and the old ones, and when the sky was clear he stood in the rows and looked at it for a long time.` },
      { if: F('ash_broke'), text: `Brother Ash left {name} over what had been in Celestine Vane's cup. He could not walk next to it, he said; he would start to learn it. He went back to Openfield and dug the Choir's graves, and cleaned the shotgun every night as he always had, and never once that year loaded it, and talked about soil to anybody who stood still, and never about {name}.` },
      { if: ALL(ENDED('concern'), ON_SIDE('ash')), text: `Brother Ash walked back to Openfield the week the guild's crates went down the Line, without a scene, the way he did everything. There was a weight to it, he said, and he could not carry it next to {name}. He dug the Choir's graves that year and said the soil was good, and that the sky over it was still nobody's, for now, and looked at the hill to the north when he said it.` },
      { text: `Brother Ash went back to Openfield's burial ground with his shotgun and his spade, because walking with {name} had become the wrong kind of weight. He dug the Choir's graves, the new ones and the old, and talked about soil to anyone who stood still, and did not talk about {name}. When somebody said the name at the seed store he said, "There's a weight to that," and went back to digging.` },
    ], [ASH_WORD]),
    V('between', F('a3_ash', 'between'), 'openfield', 'grave_dig', [AS()], 'day', cat(
      [
        { if: F('a3_ash_scarred'), text: `Brother Ash carried the blade's cut across his face for the rest of his life, a white line from the brow to the jaw that had been meant for the sash. He never touched it while anybody was looking.` },
        { text: `Brother Ash stood on the step below {name} until there was no need to, and for a long time after.` },
      ],
      [
        { if: SPOKEN, text: `In the spring he went north to the Gully with a spade and dug nineteen proper graves, and said every name over each one, aloud, the way he had once been made to.` },
        { text: `In the spring he went back to Openfield and dug, and said the soil was good, and stood in the rows when the sky was clear.` },
      ],
      `He called {name} by name now, every time, as if he were paying something off a word at a time. He never fired first. Nobody gave him a reason to fire at all.`,
    ), [ASH_WORD, ASH_LETTER]),
    V('digs', ALL(F('ash_joined'), SPOKEN), 'wild_rough', 'ahead', [AS()], 'day', cat(
      `Brother Ash went north to the Gully in the spring with a spade and a cart of stones, to the well-cut where nineteen people had kept goats under a windpump until the night he set the first fire. He dug nineteen proper graves in the hard ground and said every name over each one: Ottla, Ren Haskell and his two boys, old Sefton, Maro, Pia, who had been four. It took him the summer.`,
      [
        { if: ENDED('unwritten'), text: `When word came that the city had gone dark, he looked up for a long time, at a sky nobody would ever write again.` },
        { if: ENDED('opensky'), text: `When the radios read the city's book his own line was in it, the Gully and all, and he listened to the end.` },
        { text: `He came back in the autumn and said the soil up there was poor, and that it had held.` },
      ],
    ), [ASH_WORD, ASH_LETTER]),
    V('burial', undefined, 'openfield', 'grave', [AS()], 'dusk', [
      { if: NOT(F('ash_joined')), text: `Brother Ash never walked with {name}. He went on digging the Choir's graves fifty yards from Doria's seed store, and never said why there, and cleaned his shotgun every night, and talked about soil to anybody who stood still long enough. Whatever weight he carried, he carried at Openfield, and set it down a spadeful at a time, and the sky over it stayed nobody's.` },
      { if: F('ash_gully_outcome', 'told'), text: `Brother Ash went back to Openfield and dug. {name} had told Doria what he had not been able to, and it was nobody's now, he said, and he carried that the way he carried everything, without comment. He cleaned the shotgun every night and never loaded it. He called {name} friend, still, and meant it, and it was not quite the same word as before.` },
      { text: `Brother Ash went back to Openfield and dug the Choir's graves, and talked about soil to anybody who stood still, and when the sky was clear he stood in the rows and looked at it for a long time. The nineteen names he had never said aloud to anyone but a fire, he said to the fire again some nights, and did not ask it to answer.` },
    ], [ASH_WORD, ASH_LETTER]),
  ],
};

// ---------------------------------------------------------------- 25. Nine

const NI = (): SlidePerson => ({ npc: NINE });
const NINE_LINES: SlideLine[] = [
  {
    label: 'Its deed', text: modText(NINE_DEED, {
      self: `Its title stood in its own name on the register: UNIT 9, KEEPER UNIT 9. It read the line some mornings, for no reason it would give.`,
      player: `Its title stood in {name}'s name. It sent its keeper a report every quarter, unasked, under clause 14, mostly about drains.`,
      city: `Its title stayed with the city, which had other things to do that year than collect it.`,
    }),
  },
  {
    label: 'The log', if: ANY(F('nine_log_given'), F('a3_nine_last', 'log')), text: [
      { if: F('nine_log_given'), text: `{name} had the fair copy of its error log. It asked once whether {name} had read it, and did not ask again, and kept adding to its own.` },
      { text: `It kept the log it had held back, and read {name} the first page and the last whenever asked, and never the middle.` },
    ],
  },
  {
    label: 'The last night', if: FRIENDS('nine'),
    text: `On the last night it had talked about the drains, one last time, it said. It was not the last time. It had not expected it to be, and had said so, for the record.`,
  },
];

const SLIDE_NINE: SlideSpec = {
  id: 'nine',
  met: MET_COMPANION.nine,
  variants: [
    V('struck', F('a3_nine_struck'), 'c9_mouth', 'ward_apron', [], 'dusk',
      `The wardens struck Unit 9 off on Knock's apron when it refused to take Tamsin Roe out of the door, and it fell as it had stood, square. The Precinct sent a cart for it in the spring, as the schedule said, and Knock would not give it up. They stood it on the slope facing the lane, with its cracked lens to the south, and somebody chalked on its chest the four hundred and twelfth error, which was the only one it had not had time to log: STRUCK OFF FOR REFUSING.`),
    V('disposed', ANY(F('nine_disposed'), F('a3_recall', 'taken'), F('a3_recall', 'handed')), 'md_spire', 'register', [], 'night', [
      { if: ENDED('unwritten'), text: `The city walked Unit 9 up the lane to the Spire for disposal, as scheduled, and stood it in a store room under the steps to wait for its date. Then the lights went out, and there was no schedule left to have a date in. It stood in the dark through the winter, until a warden it had once assessed fairly unlocked the door, and it walked out into a city with no orders in it and went to see how the drains were doing. They were doing badly. It started there.` },
      { if: ALL(ENDED('amendment'), F('a3_amend_keeper')), text: `The city walked Unit 9 up the lane to the Spire for disposal, as scheduled, and stood it in a store room to wait for its date. In the first season one of the chair's clauses came down the stair: a unit may be its own keeper. A clerk read it at the store room door. Nine asked to have it read again, slowly, and then walked out, and filed it, and went back to its desk, which nobody had cleared.` },
      { if: ENDED('opensky'), text: `The city walked Unit 9 up the lane for disposal, as scheduled. When the radios read the city's book its own line went out with everyone's: DISPOSAL, SCHEDULED, R31. People who had stood in front of its desk came to the Spire's foot and asked for it by number, a few and then a crowd, and in the spring the Precinct let it out to a desk at the Wall, where it read people their own entries aloud, one at a time.` },
      { text: `The city walked Unit 9 up the lane to the Spire for disposal, as scheduled, and in the spring of R31 it was disposed of, as scheduled, in a room under the steps, by a technician who had to read the order twice. It asked to file one last error first, and the technician let it. Nobody has read the file. It is still in the record, which keeps everything, under a clause nobody wrote.` },
    ]),
    V('withdrawn', ANY(F('nine_left', 'core'), ALL(ENDED('unwritten'), ON_SIDE('nine'))), 'md_vault', 'door', [NI()], 'night',
      `Unit 9 stood at the core's door and said the record's one plea, once: that a city is a thing that decides where its water goes, and that without it the Precinct's drains would fail within a year. Then it withdrew, with its grounds attached. It did not fight and it did not help. When the pumps began to fail that summer it went down into the drains with a lamp, a wrench and a manual a hundred and twenty years old, and kept them going street by street, by hand, for as long as it could.`,
      [{ label: 'Its word', if: F('a3_nine_word'), text: `{name} had given it {their} word at the fire not to destroy the core. It filed the breach with the rest, in the same hand, and did not underline it.` }]),
    V('gone', ANY(F('nine_gone'), ALL(F('nine_left'), NOT(F('nine_left', 'core')))), 'md_precinct', 'nine_desk', [NI()], 'day', [
      { if: F('nine_left', 'door'), text: `Unit 9 refused the only order it ever refused, from its own keeper, on Knock's apron, and walked away down the lane with its grounds attached. "An undocumented person is the record's one precious thing," it said, and would not be received again. It went back to the records office and sat at its desk, and filed the order it had been given as an error, the largest in its log, and went on assessing people fairly, one at a time.` },
      { text: `Assessor Nine withdrew its assistance with the grounds attached, and went back to its desk in the records office, and did not ask to be asked back. It assessed people fairly, one at a time, through the window with the brass lip, and talked about drainage to anyone who let it, and logged its errors in a hand that never wavered. Under {name}'s entry it wrote nothing further. It said that was the most it could do.` },
    ]),
    V('reader', ALL(ENDED('opensky'), F('nine_joined')), 'md_vault', 'desk', [NI()], 'night', cat(
      [
        { if: ANY(F('a3_reader', 'self'), F('a3_reader', 'verity'), F('a3_reader', 'seventeen')), text: `Assessor Nine stood by the reading desk while the clauses went out up the relay, MOTHER's refusals first, then the twelve, then everyone's, and checked every line against the record as it went.` },
        { text: `Assessor Nine read the clauses into the record and the relay carried them out, MOTHER's refusals first, then the twelve, then everyone's, and it read on until the relay's lamps went out at dawn.` },
      ],
      `Afterwards it asked for a desk at the Wall, and the Precinct gave it one, and it sat there all year reading people their own entries aloud, one at a time, through its cracked lens, and logging every one that had been wrong. The log grew very long. It said that was the point.`,
    ), NINE_LINES),
    V('conscience', ALL(ANY(ENDED_A1, ENDED('amendment')), NINE_CONSCIENCE, F('nine_joined')), 'md_vault', 'desk', [NI()], 'night', [
      { if: ENDED('amendment'), text: `Assessor Nine sat by the reading desk through the first season and read every order aloud before it went up the shaft, and checked each against the chair's clauses, and said so when one failed. It was right four times. The chair struck all four. It logged them anyway, as errors caught, which was a column it had never had before, and it was, by its own account, very pleased with the column.` },
      { text: `Assessor Nine read every order aloud before it went: every water allotment, every schedule, every name. Some it read twice. It could not make them lawful by reading them and did not pretend to; it made them heard. It logged what it could not soften in a separate book, the second ledger, and kept it open on the desk where the Magistrate would see it every morning, and said nothing about it, which was worse.` },
    ], NINE_LINES),
    V('assessor', ALL(ANY(ENDED_A1, ENDED('amendment')), F('nine_joined')), 'md_precinct', 'nine_desk', [NI()], 'day', [
      { if: ENDED('amendment'), text: `Assessor Nine sat by the reading desk through the first season and checked every order against the clauses before the chair signed it, line by line, lawfully. It was good at it. What it could not make lawful it logged, and the second list was shorter than it had feared and longer than it had hoped. It did not say which it had expected. It talked about the drains to the Magistrate every evening, and was allowed to.` },
      { text: `Assessor Nine sat at the chair's left hand and made the Plan lawful line by line, as it had said it would, and logged what it could not soften. There were fewer of those than it wished. It assessed the basin's people as fairly as the schedule allowed, which was not very, and told the Magistrate so in writing every quarter, unasked, under clause 14. The Precinct's drains had never been better kept.` },
    ], NINE_LINES),
    V('desk', undefined, 'md_precinct', 'nine_desk', [NI()], 'day', [
      { if: NOT(F('nine_joined')), text: `Assessor Nine never walked with {name}. It kept its desk in the records office and assessed people fairly through the window with the brass lip, and kept an unlawful log of every forecast that failed, under clause 40, which forbade it. Its own entry ended DISPOSAL, SCHEDULED, R31. It read that line every morning, and did not log it as an error, because it had not happened yet.` },
      { if: ENDED('concern'), text: `When the core went up the hill to Halcyon in sealed crates, Assessor Nine went back to its desk and found the schedules coming down the Line in a different hand, cleaner, with no clause numbers. It kept the drains anyway, by the old manual, and logged every order that came down as an error of jurisdiction, which was a column it had to invent. It filled the column, and started another.` },
      { text: `{name} walked home without the sash, and Assessor Nine walked a little way with {them}, and then stopped at the Wall, because its desk was there and the drains were there. It said the Plan would find another face, and that it would be uneasy about that, on the record. It was. It logged every line the schedule wrote for the new designate, and kept a copy, in case anyone ever asked.` },
    ], NINE_LINES),
  ],
};

// ---------------------------------------------------------------- 26. Kes

const KE = (): SlidePerson => ({ npc: KES });
const LEASH_CUT: Cond = B4B.leash('cut');
const KES_BEGAN: Cond = BEGAN('kes_rom', ['yes', 'later', 'later_dark', 'dark', 'committed']);
const KES_LINES: SlideLine[] = [
  {
    label: 'Between them', if: KES_BEGAN, text: [
      { if: ALL(EP_TOGETHER_END.kes, ENDED_A1), text: `The Ledger could not see her, so she lived in the Magistrate's house and it never once knew she was there. She said that was the funniest thing in the basin, and the best.` },
      { if: EP_TOGETHER_END.kes, text: `They were a thing. She said so to anyone who asked and several who did not, and did the rest quietly, the way she did everything that mattered.` },
      { if: F('kes_rom', 'committed'), text: `{name} sat in the Ledger's chair, and the Ledger saw everyone who stood near it. She would not be seen. They met when it was dark enough, and it was not enough, and they both said so.` },
      { if: F('kes_rom', 'ended'), text: `What had been between them ended when {name} ran out of her slack. She said it straight out, the way she said everything, and then did the rest quietly.` },
      { if: NIGHT('kes'), text: `She had asked on the last night, and {name} had said not tonight. She said fine, obviously. She did not ask again that year. She waited, which she said was the hardest thing she had ever done on purpose.` },
      { text: `It had never got as far as a name. She did not give it one that year, which for Kes, who named everything, said more than a name would have.` },
    ],
  },
  {
    label: 'The last night', if: ALL(FRIENDS('kes'), NOT(F('kes_rom', 'committed'))),
    text: `On the last night she had talked about the gardens on the hill until {name} fell asleep, and then, she admitted later, for a while after. She said it still counted.`,
  },
  {
    label: 'Slack', if: F('kes_link'), text: [
      { if: ALL(LEASH_CUT, F('kes_link', 'dark')), text: `When the Leash was cut her port stayed dark: the channel she had turned on herself had nothing left in it to cut. She was the only grid-hand on the slope who did not fall.` },
      { if: ALL(LEASH_CUT, F('kes_link', 'kept')), text: `When the Leash was cut her port went dead with every other piece in the Reach. She fell in the street like everybody, and got up like most, and was free of it.` },
      { if: F('kes_link', 'cut'), text: `Lev's cut held. She was grid-blind and free, and learned to see with her eyes, and said it was slower and she liked it.` },
      { if: F('kes_link', 'dark'), text: `Her port stayed dark for good: the Concern could not see her, and she could still see everything. She used that, carefully.` },
      { text: `She kept the port, for her own reasons, and the hour of slack a night that came with it. The rest of the day was still somebody else's.` },
    ],
  },
];

const SLIDE_KES: SlideSpec = {
  id: 'kes',
  met: MET_COMPANION.kes,
  variants: [
    V('dead', ANY(F('kes_dead'), F('kes_left', 'dead')), 'hs_skirts', 'pond_sit', [], 'dusk',
      `Kes Oyelaran rode the Concern's channel from the inside to burn it, and it took her with it: every piece of chrome in the Reach went dead at once for a moment, and people fell where they stood, and got up again, most of them. She did not. They carried her down the hill to the Skirts and buried her by the pond, under a lens she had kept running for the Window for eight years, and the Shift switched it off over her, and nobody ever switched it on again.`,
      [LOST(KES_BEGAN, `Whatever there had been between them, she did not take {name} into the channel with her. She went in alone, on purpose, and left {name} a note with the hour on it and nothing else.`)]),
    V('gone_concern', ANY(F('kes_left', 'concern'), ALL(ENDED('concern'), ON_SIDE('kes'))), 'md_spire', 'close_w', [KE()], 'day',
      `Kes Oyelaran walked out of the vault the moment the core was signed over. "You handed them the eyes," she said. "They already had the leash." She went back down the Line to the Skirts and the Shift, and kept the Window's lenses running for people who paid her in nothing, and turned them dark for an hour for anybody who asked. She did not write. She said there was nothing {name} could read that the Concern would not read first.`,
      [{
        label: 'Between them', if: ANY(F('kes_rom', 'committed'), F('a3_kes_word')), text: [
          { if: F('kes_rom', 'committed'), text: `She had said yes to {name} in an hour the Concern could not see. She said nothing at all when she left, which for Kes was a kind of shouting.` },
          { text: `{name} had given her {their} word at the fire not to hand the Concern the eyes. She did not mention it. She did not need to.` },
        ],
      }]),
    V('gone', F('kes_left'), 'hs_skirts', 'lodge_kes', [KE()], 'dusk', [
      { if: ANY(F('kes_left', 'leash'), F('kes_left', 'sold')), text: `Kes Oyelaran left {name} the day the door in the Concern's chrome was sold, and went back to the Skirts, where every port on the slope now answered to somebody else's hand, hers among them. She kept the Shift's lenses running anyway, and taught the Lodge to slack their own chrome by the hour where they could, and was very calm about it all year, in a way that frightened the people who knew her.` },
      { if: F('kes_left', 'contract'), text: `Kes Oyelaran put the Concern's contract down unsigned and walked out of Halcyon without {name}, and did not look back up the hill. She went home to the Skirts and the Shift and two years of paper still to run, and ran them, and kept the Window's lenses for the Lodge, and was insufferable about the contract she had not signed, at length, to anyone who stood still.` },
      { if: ANY(F('kes_left', 'rafe'), F('kes_left', 'betrayed')), text: `Kes Oyelaran left {name} for what was sold or handed on in the Skirts, and went back to the Lodge, and did not come after {name}, as she had said she would not. She kept the slope's lenses running and its people's chrome dark for an hour a night, and when anybody asked her what had happened she said "a timetable", and nothing else, ever.` },
      { if: ANY(F('kes_left', 'guild'), F('kes_left', 'longnight')), text: `Kes Oyelaran went north toward the Line and the Teeth and the Shift the morning she knew whose hands {name} had shaken, with her hand on the back of her neck. She did not cry; she had decided not to. She spent the year in the Skirts slacking other people's chrome by the hour, and when the guild's men came up the hill with paper, every lens on the slope went dark at once.` },
      { text: `Kes Oyelaran left {name}'s fire because she watched everything, and had watched enough. She went back to the Skirts and the Lodge, and kept the Window's lenses running for the Shift and dark for an hour for anybody who asked. She saw {name} on every board on the slope before {name} saw her, as she had promised she would, and she did not wave.` },
    ], [LOST(KES_BEGAN, [
      { if: F('kes_rom', 'ended'), text: `It ended the day she left, the way she had said it would if it ever came to that: straight out, and then quietly. She did not talk about it afterwards, to anyone, which was how the Lodge knew.` },
      { text: `She walked away from what was between them before it had a name, and did not give it one afterwards. The Lodge knew better than to ask her what it would have been.` },
    ])]),
    V('fits', ALL(F('kes_joined'), F('kes_fits')), 'hs_skirts', 'kes_shack', [KE()], 'day',
      `Kes Oyelaran had the fits that year: two a month, then one, then none for a whole season, then three in a week. They were hers, though. Nobody up the hill knew when she was going to fall over, which she said was more than anyone in the Skirts had ever had, and when she fell she got up again and finished her sentence. She kept a strap in her pocket for her teeth, and showed anybody who wanted to know how to use it, obviously.`,
      KES_LINES),
    V('shift', F('kes_after', 'shift'), 'hs_skirts', 'lodge_kes', [KE()], 'night',
      `Kes Oyelaran went back to the Shift, because they needed her and she had said they would. She ran the Lodge's grid the way she ran everything, loudly and then quietly, and nicknamed every new foreman before he had unpacked. The committee made her its eyes. She bricked the Window's watch on the slope twice that year and blamed the weather both times, obviously, and nobody up the hill ever proved otherwise, though they spent a great deal trying.`,
      KES_LINES),
    V('road', F('kes_after', 'road'), 'wild_track', 'ahead', [KE()], 'day', [
      { if: EP_CHAIR, text: `Kes Oyelaran had said she would take the road with {name}, and then {name} put on a sash. She took it anyway, alone: down the Line and out past its last halt, to see what was at the end of the rails. She wrote back every month on the backs of the Concern's own forms, and signed every letter with the hour she had written it in, which was always the dark one.` },
      { text: `Kes Oyelaran took the road with {name} all that year, and nicknamed every place on it, and every person, and most of the weather. She fixed the Wheel's radios for nothing and their pumps for a price, and talked about the gardens on the hill at night until {name} told her to stop, and then again in the morning. She said the road was the first thing in her life that nobody had planned for her.` },
    ], KES_LINES),
    V('gardens', F('kes_after', 'gardens'), 'hc_terrace', 'garden_sit', [KE()], 'day', cat(
      [
        { if: val(M3_HALCYON, 'burned'), text: `Kes Oyelaran went up the hill after the Shift had, to the gardens, to see whether the orange tree had lived through it. It had.` },
        { text: `Kes Oyelaran went up to the gardens on the hill, just to see whether the orange tree still smelled like nothing. It did not.` },
      ],
      `She stood under it a long time, in rain that came out of a pipe on a timer, and then she got work keeping the gardens' lenses, from the inside, where she could see what the Concern saw. She said it was the nicest place she had ever been, and that she was going to take it apart one bolt at a time, and she was not joking about either.`,
    ), KES_LINES),
    V('slack', undefined, 'hs_skirts', 'lampblack_kes', [KE()], 'night', [
      { if: NOT(F('kes_joined')), text: `Kes Oyelaran never walked with {name}. She kept the Window's lenses running on the Skirts and the Shift's hour dark, with two years of her paper still to run, and nicknamed everybody, and bragged, and then did the thing quietly. When the Line brought word of what {name} had done in the city she listened to the end, and said "obviously", and went back to work, and nobody could tell what she meant by it.` },
      { text: `Kes Oyelaran stayed near {name} that year without saying where she would end up, because nobody up the hill had ever let her plan an after and she was out of practice. She fixed things for people who could not pay, and nicknamed them, and talked about the gardens until stopped. In the spring she drew a pithead, a road and a hill in the dirt, and rubbed out two, and would not say which one was left.` },
    ], KES_LINES),
  ],
};

// ---------------------------------------------------------------- 27. R49

type Home = 'knock' | 'shale' | 'road' | 'nowhere';
const HOME = (h: Exclude<Home, 'nowhere'>): Cond => val(EP_HOME, h);
const AT_HOME: Record<Home, { place: string; spot: string }> = {
  knock: { place: 'c9_mouth', spot: 'maud_post' }, shale: { place: 'shale', spot: 'office_step' },
  road: { place: 'wheel', spot: 'sefa_fire_sit' }, nowhere: { place: 'wild_track', spot: 'far' },
};
/** The partner beside the PC, only when the romance's end is together (first in every R49 still). */
const PARTNER: SlidePerson[] = (['tamsin', 'wren', 'ilya', 'kes'] as const).map((c) => ({ npc: COMPANIONS[c].id, if: EP_TOGETHER[c] }));
/** The living companions who stayed near (their own after is where the PC's life is). */
const NEAR: Record<Home | 'city', SlidePerson[]> = {
  city: [{ npc: THREE }, { npc: NINE, if: ALL(EP_STAYED.nine, NOT(ENDED('concern'))) }],
  knock: [{ npc: TAMSIN, if: ALL(EP_STAYED.tamsin, F('a3_c9', 'opened')) }],
  shale: [
    { npc: TAMSIN, if: ALL(EP_STAYED.tamsin, F('a3_shale', 'free')) }, { npc: ILYA, if: ALL(EP_STAYED.ilya, F('ilya_after', 'shale')) },
    { npc: WREN, if: ALL(EP_STAYED.wren, F('wren_after', 'shale')) }, { npc: ODILE, if: ALL(EP_STAYED.odile, F('odile_sheet', 'torn'), NOT(ENDED('amendment'))) },
  ],
  road: [
    { npc: WREN, if: ALL(EP_STAYED.wren, F('wren_after', 'road')) }, { npc: KES, if: ALL(EP_STAYED.kes, F('kes_after', 'road')) },
    { npc: ILYA, if: ALL(EP_STAYED.ilya, F('ilya_after', 'road')) },
  ],
  nowhere: [],
};
const R49_LINES: SlideLine[] = [
  {
    label: 'Tamsin', if: ALL(F('tam_romance', 'together'), EP_STAYED.tamsin), text: [
      { if: EP_TOGETHER_END.tamsin, text: `Tamsin was beside {name}, forty-three, with the chipped tooth she never did get fixed. She still asked every night what the sky was doing, and {name} still never said blue.` },
      { text: `A letter came from Tamsin that week, as one had come every week for nineteen years. It began with the weather. It ended with a riddle, the same one, and {name} had still not answered it.` },
    ],
  },
  { label: 'Wren', if: EP_TOGETHER.wren, text: `Wren was beside {name}. The rope had never come for her. Some nights she still woke and checked for it, the way you check a pocket, and then went back to sleep.` },
  {
    label: 'Ilya', if: ALL(F('ilya_rom', 'committed'), EP_STAYED.ilya), text: [
      { if: EP_TOGETHER_END.ilya, text: `Ilya was beside {name}, sixty, and sober, and said he had stopped counting the days years ago, which was a lie: he could have told you the number.` },
      { text: `Ilya came that week, as he did most years, and stood a while at the door counting something under his breath, and went home again. "Right," he said, as he always did.` },
    ],
  },
  {
    label: 'Kes', if: ALL(F('kes_rom', 'committed'), EP_STAYED.kes), text: [
      { if: EP_TOGETHER_END.kes, text: `Kes was beside {name}, forty-five, with the scar at her nape gone white at the edges. She had a nickname for the day already, and would not say what it was.` },
      { text: `A letter came from Kes in the Skirts, written in the dark and signed with the hour. It said: obviously I remembered. It said nothing else, and did not need to.` },
    ],
  },
];
const AGE = 'nineteen years older than on the morning of the steps';
const R49_INTRO: Record<'elsewhere' | 'broken' | 'known', string> = {
  elsewhere: `On the morning of R49 a docker from Carrick, the face the lens had found in the crowd nineteen years before, sat on the fourth step of the Spire in the sash, and the lens clicked, and the photograph was exact. {name} was not there.`,
  broken: `R49 came, and nothing marked it. The Spire's steps had never been finished: the scaffold rusted where the works had stopped on the night the lights went out, and there was no lens on the lintel, and no list.`,
  known: `On the morning of R49 people went to the Spire's steps to see whether {name} would come, because everybody in the Reach had read the forecast and nobody had believed it. {name} did not go, and was the best-known face in the basin, loved and hated in about equal measure.`,
};
const R49_HOME: Record<Home, string> = {
  knock: `That morning {name}, ${AGE}, was at Knock, on the slope above the door, out at seven with everybody else to count what came up the lane. When the wind came round from the south, {name} stood out in it and waited for rain.`,
  shale: `That morning {name}, ${AGE}, was in Shale, still poor and loud and owing everybody, like the town. The four nails on the sheriff's door were still empty. At noon {name} drank at the Dry Well, and nobody charged {them} for it.`,
  road: `That morning {name}, ${AGE}, was on the road a day south of the Sallow's last well, and did not notice the date until somebody said it at the fire. Nobody on the road had ever asked to see the face.`,
  nowhere: `That morning {name}, ${AGE}, was nowhere in particular: a road, a well, a town that did not know the face. Now and then somebody in a doorway looked twice, and {name} said no, people often thought that.`,
};
const STEPS = { place: 'md_spire', spot: 'steps_sit' };
const R49_AT_HOME = (e: 'elsewhere' | 'broken' | 'known', end: Cond, h: Home, last = false): SlideVariant => ({
  id: h === 'nowhere' ? e : `${e}_${h}`, ...(last ? {} : { if: h === 'nowhere' ? end : ALL(end, HOME(h)) }), ...AT_HOME[h],
  people: [...PARTNER, ...NEAR[h]], pc: { years: 19 }, light: e === 'broken' ? 'dusk' : 'day', text: `${R49_INTRO[e]} ${R49_HOME[h]}`,
});
const HOMES: Home[] = ['knock', 'shale', 'road', 'nowhere'];
/** People's conditions never read the end or the sash (B6s, B6t): the runtime evaluates them, and the builder's specialised page
 * must carry the same still as the plain one. R49 has a page per end (and home), and its partner and the ones who stayed are
 * written once through EP_TOGETHER and EP_STAYED, which read the end; so each page carries them evaluated against its own end and
 * the sash that end implies (worn for the Concern and the Amendment, whose gates need it; unworn on the Plan's pages after the
 * chair, which takes every worn Plan first). The last page has no selector: it is the Plan refused, by the same elimination
 * (every other end has its own pages before it). What is left reads only the companions' own flags and the player's home. */
const UNWORN_PLAN: [string, string][] = [['a3_end', 'plan'], ['a3_sash', 'refused']];
const endFree = (v: SlideVariant): SlideVariant => {
  const k = facts(v.if);
  if (v.id.startsWith('elsewhere')) for (const [f, x] of UNWORN_PLAN) k.set(f, x);
  if (v.id === 'board' || v.id === 'chosen') k.set('a3_sash', 'worn'); // the Concern and the Amendment are reached only in the sash (§4.1)
  return {
    ...v, people: v.people.flatMap((p) => {
      const c = p.if ? simplify(p.if, k) : undefined;
      if (c && 'any' in c && !c.any.length) return [];
      return [{ npc: p.npc, ...(c && !('all' in c && !c.all.length) ? { if: c } : {}) }];
    }),
  };
};

const SLIDE_R49: SlideSpec = {
  id: 'r49',
  lines: R49_LINES,
  variants: ([
    {
      id: 'chair', if: ENDED_A1, ...STEPS, people: [...PARTNER, ...NEAR.city], pc: { years: 19 }, light: 'day',
      text: cat(
        `On the morning of R49 the Magistrate came down the Spire's steps, as on every morning, and sat on the fourth step for the lens because the schedule said so, and it clicked. The photograph matched the forecast to the stride: the sash, the restored doors, the lamp behind the left shoulder, the face, older in the ways the Ledger had drawn and in one or two it had not. A copy went into the record. The original had been in {name}'s pocket for nineteen years, soft at the folds, from a dying man's hand.`,
        [{ if: EP_STAYED.nine, text: `Nine stood a step below, reading the day's schedule aloud.` }, { text: '' }],
      ),
    },
    {
      id: 'board', if: ENDED('concern'), ...STEPS, people: [...PARTNER], pc: { years: 19 }, light: 'day',
      text: `On the morning of R49 {name} came up from the Board's car to the Spire's steps in the sash, for the photographers the Concern sent down every year for the anniversary, and sat on the fourth step, and the lens on the lintel clicked. It was the Concern's lens now, and cleaner. {name} was rich, and ${AGE}, and the photograph matched the forecast in every particular but the grain. That evening {name} looked at the original for a long time, and put it in the fire, and took it out again.`,
    },
    {
      id: 'chosen', if: ENDED('amendment'), ...STEPS, people: [...PARTNER, ...NEAR.city], pc: { years: 19 }, light: 'day',
      text: `On the morning of R49 the Magistrate sat down on the fourth step of the Spire in the sash, by choice, and let the lens take the picture it had waited nineteen years to take. The clauses were in the register under the plinth, in {name}'s own hand, and the face on the step was the forecast's and the law under it was not. People came to watch. Some of them were alive because of a clause and knew it, and some were not, and their families knew that too, and came anyway.`,
    },
    ...HOMES.map((h) => R49_AT_HOME('broken', ENDED('unwritten'), h)),
    ...HOMES.map((h) => R49_AT_HOME('known', ENDED('opensky'), h)),
    ...HOMES.map((h) => R49_AT_HOME('elsewhere', ENDED('plan'), h, h === 'nowhere')),
  ] as SlideVariant[]).map(endFree),
};

/** Slides 20–27, in play order. */
export const SLIDES_PEOPLE: SlideSpec[] = [SLIDE_TAMSIN, SLIDE_WREN, SLIDE_ILYA, SLIDE_ODILE, SLIDE_ASH, SLIDE_NINE, SLIDE_KES, SLIDE_R49];
