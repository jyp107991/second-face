import type { NodeDef, OptionDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  A3_OPEN, ASH, ASH_LN_CROSSED, ASH_REFUSED, ASH_SELF_RISK, IN, ILYA, KES, NINE, NINE_CONSCIENCE, NINE_KEEPER_SELF, ODILE,
  ODILE_PRICE_BROKEN, RECALL_OPEN, SARR_ALIVE, SARR_DEAD, SARR_SPARED, TAMSIN, WITH_YOU, WREN,
} from '../world/a3_conds';

/**
 * Last nights II (B6o): the scenes of the three who are not loved at the fire at the Spire's close (d_a3_fire, B6n), and the
 * Act 3 return of Ash and Tamsin's quarrel, at the first camp at Knock. This file holds content only; a3_fire.ts builds it
 * into its tree with its own helpers (`lastNightsII(kit)`), so the two files never import each other.
 * - Odile: what she prices tomorrow at (the ways, never named as such); her price, Imelda Sarr alive, against what every
 *   way up the steps would make of Imelda; and the tab she keeps on everyone, read out and closed (or left open).
 * - Ash: the ways as he sees them; the letter in his scarf by where his orders stand (refused, warned, undecided, other, or
 *   never said: the last night is the last chance to ask, to burn it, to take back "make it clean"); and the soil, by
 *   what was said at the seed store.
 * - Nine: the ways as the record suggests them; its one line said plainly (it will not help break the core, nor fight);
 *   and "when it matters" kept (the log it held back) or the drains, one last time. Its opener reads how the recall ended.
 * - Ash and Tamsin at Knock's first camp: home against the sky, turned round (he wants the door open, she wants it theirs).
 * - The Long Night's red lines for the ones who were not there (B5d makes them leave at its dawn only when they stood
 *   there): Ash, after a night against Openfield; Odile, when her price is broken. At the first word after it, in their
 *   own trees (`ASH_LN_*`, `ODILE_PRICE_*`), or at the fire if they were gathered at the close without a word.
 * Sets `a3_odile_last` (settled | open), `a3_ash_last` (burned | none), `a3_nine_last` (log | none), `a3_<c>_night`, the
 * words (`a3_odile_word`, `a3_ash_word`, `a3_nine_word`), `a3_ash_heard`, `a3_ash_clean_back`, `a3_ash_tam`. Nothing is
 * bought, given or taken. Story notes: story/B6_NOTES_SECRET.md §7, §8 B6o and its "As built".
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const AT_CAMP: Cond = F('at_camp');
const AT_CLOSE: Cond = { at: 'md_spire' };
type V = { if?: Cond; text: string }[];

export type Three = 'odile' | 'ash' | 'nine';
type Way = 'plan' | 'unwritten' | 'concern' | 'opensky' | 'part' | 'amendment';
type Src = 'petra' | 'choir' | 'ash' | 'charge' | 'bram';
/** The fire's own helpers (a3_fire.ts), handed in: the chain of ways a companion talks through, and B's means by source. */
export interface FireKit {
  waysNodes: (c: Three, t: Record<Way, Text>, again: string, more: string, interject?: Partial<Record<Way, NodeDef['interject']>>) => Record<string, NodeDef>;
  bySrc: (f: (s: Src) => string) => V;
}

const LAST = (c: Three, v: string): Effect[] => [{ set: `a3_${c}_last`, value: v }, { set: `a3_${c}_night` }];
const NIGHT_HAD = (c: Three): Effect[] => [{ set: `a3_${c}_night` }];
const OPEN = (c: Three): Cond => NOT(F(`a3_${c}_night`));
const BACK: OptionDef = { text: '(Back to the fire.)', next: 'hub' };
const TO = (c: Three, text = '(Stay a while.)'): OptionDef => ({ text, next: c });

// ---------------------------------------------------------------- the Long Night's red lines, for the ones who were not there

/** Ash: the night stood against Openfield (the guild's side or the city's), and he was not at it. */
const ASH_LN_TEXT = {
  close: 'Ash is standing when you come to the fire, the shotgun across his back and the spade tied to his pack. "Openfield," he says. "A carter on the Line told it me the day after. You stood with them, against it." He doesn\'t raise his voice; he never has. "I came this far to say it to your face. I said I\'d see the city, and I\'ve seen it." He puts his hat on. "Go well, friend. Not with me." He goes off across the close toward the lane, past the warden, who doesn\'t stop him, and does not look back.',
  camp: 'Ash cleans the shotgun at the fire and doesn\'t look at you. When he speaks it is once. "Openfield. The night. A carter told it at the halt: you stood with them, against it." He closes the breech. "I said I\'d see the city. I\'ve seen it." He puts his hat on. "Go well, friend. Not with me." He walks west into the dark toward the burial ground, and does not look back.',
  waiting: 'Ash is already standing when you reach him, the spade tied to his pack, the way he stood at the burial ground the day he came east. "I heard about Openfield," he says. "Everybody on the road has. You stood with them, against it." He doesn\'t raise his voice. "I waited, so I could say it to your face. Go well, friend. Not with me." He walks west toward the burial ground, and does not look back.',
  left: 'Ash is digging, and doesn\'t stop. "I was here that night," he says to the spade. "At the burial ground, with the rows burning at my back. I saw where you stood." Another spade of glass-crust comes out. "Don\'t ask me east again, friend. I\'d have to say no to your face, and I\'d rather say it once." He goes on digging, and doesn\'t look up again.',
};
const ASH_LN_EFFECTS: Effect[] = [{ leave: ASH }, { set: 'ash_gone' }, { set: 'ash_redline', value: 'longnight' }, A(ASH, -50), { decision: { id: 'ash_left_longnight', text: 'Brother Ash left me when he heard I had stood against Openfield at its Long Night.' } }];
const ASH_LN_BASE: Cond = ALL(ASH_LN_CROSSED, F('ash_joined'), NOT(F('ash_gone')));
/** In Ash's own tree (openfield.ts): at the first camp after the night with him travelling, where he waited, or (left on his
 * own account) at the burial ground: a left Ash is not asked east again after it. */
export const ASH_LN_START: { if: Cond; node: string }[] = [
  { if: ALL(ASH_LN_BASE, F('ash_left'), NOT(IN(ASH))), node: 'a3_ln_left' },
  { if: ALL(ASH_LN_BASE, ANY(ALL(IN(ASH), AT_CAMP), NOT(IN(ASH)))), node: 'a3_ln' },
];
export const ASH_LN_NODES: Record<string, NodeDef> = {
  a3_ln: {
    text: [{ if: AT_CLOSE, text: ASH_LN_TEXT.close }, { if: AT_CAMP, text: ASH_LN_TEXT.camp }, { text: ASH_LN_TEXT.waiting }],
    again: 'He is a long way west.',
    effects: ASH_LN_EFFECTS,
    options: [{ text: '(Let him go.)', exit: true }],
  },
  a3_ln_left: {
    text: ASH_LN_TEXT.left,
    again: 'He goes on digging, and doesn\'t look up.',
    effects: ASH_LN_EFFECTS,
    options: [{ text: '(Leave him to it.)', exit: true }],
  },
};

/** Odile: her price (Imelda Sarr walks out of it alive) broken, wherever and however Imelda died. */
const ODILE_PRICE_TEXT = {
  close: 'Odile is at the fire with her coat buttoned to the throat, which she has never once done in front of you. "I heard about Imelda," she says. "I told you my price, my dear. You heard it." She puts her glasses away in their case, and the case away in her coat. "I came to the steps so I could say it to your face. That is a cost. It\'s yours." She walks off across the close toward the lane, and does not hurry, and does not look back.',
  camp: 'Odile sits at the fire with her coat buttoned to the throat, which she never does, and when she speaks she does not take her glasses off. "Imelda," she says. "I told you my price, my dear. You heard it." She doesn\'t make a speech of it; she never has. "That is a cost." In the morning her place at the fire is cold, and she has gone east, toward the bridge where she was born.',
  waiting: 'Odile is waiting for you with her coat buttoned to the throat. "I heard about Imelda," she says, before you can say anything at all. "I told you my price, my dear. You heard it. That is a cost." She walks east toward the bridge where she was born, and does not hurry, and does not look back.',
  left: 'Odile has a glass of the Span\'s terrible bitters in front of her, and is not drinking it. "Imelda," she says, without looking up. "I told you my price, my dear." She turns the glass with the chrome hand. "Don\'t close my tab with Lazlo. I have closed yours." She does not say anything else, and after a while you understand she will not.',
};
const ODILE_PRICE_DECISION: Effect = { decision: { id: 'odile_left_price', text: 'Odile left me for good when she heard that Imelda Sarr had not walked out alive: her price, which I had heard.' } };
const ODILE_PRICE_BASE: Cond = ALL(ODILE_PRICE_BROKEN, F('odile_joined'), NOT(F('odile_gone')));
/** In Odile's own tree (ninebridge.ts): at the first camp after it with her travelling, where she waited, or at the Span if
 * she had already gone back there on her own account (no third tab for that). */
export const ODILE_PRICE_START: { if: Cond; node: string }[] = [
  { if: ALL(ODILE_PRICE_BASE, F('odile_left'), NOT(IN(ODILE))), node: 'a3_price_left' },
  { if: ALL(ODILE_PRICE_BASE, ANY(ALL(IN(ODILE), AT_CAMP), NOT(IN(ODILE)))), node: 'a3_price' },
];
export const ODILE_PRICE_NODES: Record<string, NodeDef> = {
  a3_price: {
    text: [{ if: AT_CLOSE, text: ODILE_PRICE_TEXT.close }, { if: AT_CAMP, text: ODILE_PRICE_TEXT.camp }, { text: ODILE_PRICE_TEXT.waiting }],
    again: 'She has gone east, with her coat buttoned.',
    effects: [{ leave: ODILE }, { set: 'odile_gone' }, { set: 'odile_left', value: 'price' }, A(ODILE, -40), ODILE_PRICE_DECISION],
    options: [{ text: '(Let her go.)', exit: true }],
  },
  a3_price_left: {
    text: ODILE_PRICE_TEXT.left,
    again: 'She is turning the glass, and does not look up.',
    effects: [{ set: 'odile_gone' }, A(ODILE, -40), ODILE_PRICE_DECISION],
    options: [{ text: '(Leave her be.)', exit: true }],
  },
};
/** At the fire: gathered at the close since, never spoken to. */
const ASH_LN_FIRE: Cond = ALL(ASH_LN_CROSSED, WITH_YOU('ash'));
const ODILE_LN_FIRE: Cond = ALL(ODILE_PRICE_BROKEN, WITH_YOU('odile'));

// ---------------------------------------------------------------- Ash and Tamsin at Knock's first camp (U8 Tamsin §6, the Act 3 return)

const TA = (by: number) => A(TAMSIN, by);
const S = (by: number) => A(ASH, by);
/** The first camp at Knock with both of them travelling, the door still shut: once, in either one's own tree. */
export const KNOCK_CAMP_START = { if: ALL(A3_OPEN, { at: 'c9_mouth' }, AT_CAMP, IN(TAMSIN), IN(ASH), NOT(F('a3_ash_tam')), NOT(F('a3_c9'))), node: 'a3k_ash' };
const KNOCK_BACK: OptionDef = { text: '(Back to the fire.)', next: 'camp' };
/** Whether the Act 2 quarrel at a camp fire was had (her tree's option `tamc.ash`) changes how each of them begins. */
const ASH_OPENS = (name: string) => `Ash has been looking at the hatch all evening, across the dark apron, the way he looks at a grave before he digs it. ${name} "You were born behind that. So were sixty more, and not one of them has ever stood under a sky." He turns his cup. "My brothers are camped out past the apron. They've their own idea about that door. They're wrong about most of it." He looks at her. "They're not wrong about the sky. Open it. Let them out under something that doesn't keep books."`;
const TAM_ANSWERS = (lead: string) => `"Open it." Tamsin doesn't raise her voice. ${lead} She is looking at the hatch too. "It's their door. Ines's, and Ola's, and Wes's, and the rest. Nobody opens it from out here. Not the city with a column, not your brothers with whatever they've got, not you with a sky." A breath. "If they open it, I'll hold it for them. If they don't, I'll stand in it. That's what a door's for. I found out from the wrong side."`;
export const KNOCK_CAMP_NODES: Record<string, NodeDef> = {
  a3k_ash: {
    speaker: ASH,
    text: [
      { if: { seen: 'tamc.ash' }, text: ASH_OPENS('"Tamsin," he says to the fire. Not child; he has learned that much.') },
      { text: ASH_OPENS('"Tamsin," he says to the fire.') },
    ],
    again: 'Ash, looking at the hatch.',
    effects: [{ set: 'a3_ash_tam' }],
    options: [{ id: 'a3k.wait', text: '(Wait.)', next: 'a3k_tam' }],
  },
  a3k_tam: {
    speaker: TAMSIN,
    text: [
      { if: { seen: 'tamc.ash' }, text: TAM_ANSWERS('"You told me to go home, last time. Now you want everybody out."') },
      { text: TAM_ANSWERS('"Everybody\'s told me to go home my whole life. Now you want everybody out."') },
    ],
    again: 'Neither of them gives an inch.',
    options: [
      { id: 'a3k.door', text: 'She\'s right. It\'s their door to open.', effects: [TA(5), S(-5)], next: 'a3k_door' },
      { id: 'a3k.sky', text: 'He\'s right. Nobody should live under a ceiling they never chose.', effects: [S(5), TA(-5)], next: 'a3k_sky' },
      { id: 'a3k.ask', text: 'You\'re both arguing about sixty people who aren\'t at this fire.', next: 'a3k_ask' },
      { id: 'a3k.none', text: '(Say nothing.)', next: 'a3k_none' },
    ],
  },
  a3k_door: {
    speaker: ASH,
    text: '"As you say, friend." He bows his head over the fire. Then, to her, after a while: "You\'d stand in it." "I would." Ash nods, slowly, as if a row had come out straight. "Then you\'ve a weight to carry, and you\'re carrying it the right way up. That\'s more than I did at your age."',
    again: 'Ash, nodding at the fire.',
    options: [KNOCK_BACK],
  },
  a3k_sky: {
    speaker: TAMSIN,
    text: '"Great. Two of you." She gets up. "You and the city both want them out. You only disagree about who holds the door." She goes and sits on the far side of the fire, facing the hatch, and does not look away from it for the rest of the night.',
    again: 'She is on the far side of the fire, facing the hatch.',
    options: [KNOCK_BACK],
  },
  a3k_ask: {
    speaker: 'narrator',
    text: 'Both of them look at you, and then, for a long moment, at the hatch. "Then somebody had better ask them," Tamsin says. "Through the Grille," says Ash. "The way you two did, all those years." Neither of them says anything after that. Neither of them gets up, either.',
    again: 'Both of them, looking at the hatch.',
    options: [KNOCK_BACK],
  },
  a3k_none: {
    speaker: 'narrator',
    text: 'The fire does the talking for a while. Neither of them gives an inch. Later, when she has gone quiet, Ash puts a slat on the fire on her side of it without being asked, and she lets him.',
    again: 'The fire, and the two of them either side of it.',
    options: [KNOCK_BACK],
  },
};

// ---------------------------------------------------------------- Odile

const O = (by: number) => A(ODILE, by);
const odileMeans: Record<Src, string> = {
  petra: '"Petra\'s people would do it for nothing, which is the dearest price there is."',
  choir: '"The Choir would hold the lamp and sing while you lit it."',
  ash: '"The Brother would hold the door. He has been pricing it for a month."',
  charge: '"There is powder in your pack. You set it down the way people set down a debt they mean to pay."',
  bram: '"One trunk, the Cistern man said. Cut a trunk and a market closes; I have seen it done to bridges."',
};
/** Her price, read against every way up the steps: alive in all of them, and only one or two of them ashamed. */
const priced = (lead: string, said: boolean) => `${lead} She turns the chrome hand over. "So I have been pricing tomorrow, and here is the joke. Every way up those steps keeps her breathing. Sign what they hand you and she is Treasurer on the day the cloth says. Sell the core and she is Treasurer of the Concern's whole world. Break it and she is Treasurer of nothing. Read it out and she is ruined in daylight, and alive." A long breath. "${said ? 'I said alive so that she could be ashamed of the riders she paid. Tonight I find I want the shame as well, and I have no right to it. A promise is a sheet, my dear. I won\'t ask you to write me a second one.' : 'I would like her alive, and ashamed of the riders she paid. I never asked you for the first, so I can hardly ask you for the second.'}"`;
const sheetLine: V = [
  { if: F('odile_sheet', 'torn'), text: 'one sheet on Shale, unwound, which she enters as a credit to you both' },
  { if: F('odile_sheet', 'kept'), text: 'one sheet on Shale, still in her coat, which she charges to herself' },
  { if: F('odile_sheet', 'player'), text: 'one sheet on Shale, carried in your pack, which she charges to you, with interest' },
  { if: F('odile_sheet', 'nine'), text: 'one sheet on Shale in a ledger the city doesn\'t read, which nobody can charge to anybody' },
  { text: 'one sheet on Shale that she never got back' },
];
const tab = (line: string) => `She takes out a small book bound in the guild's old red cloth, worn white at the corners. "Everyone," she agrees. "It's a habit, my dear, like the bitters." She reads it to you by the fire, entry by entry, in the floor's voice: a dead man's map carried east; the planks at the Span crossed without looking down; ${line}; and a great many smaller things, some of them debits, which she reads in the same voice as the rest. At the bottom she has ruled two lines, the way the floor closes a book. "There. I make us square." She uncaps her pen over the space between the lines. "Shall I write paid?"`;
const odileAfter: V = [
  { if: F('odile_sheet', 'torn'), text: '"After," she says, "if the town will have me, I think I shall go and live in Shale, in sight of the pumps, and be ashamed in person. It\'s cheaper than doing it by letter."' },
  { text: '"After," she says, "I shall go wherever the floor is worth something, or wherever it isn\'t. There is a soup line on the eighth span that has never once had anybody to count the bowls."' },
];
const withAfter = (lead: string): V => odileAfter.map((v) => ({ ...v, text: `${lead} ${v.text}` }));

function odileNodes(kit: FireKit): Record<string, NodeDef> {
  return {
    odile: {
      speaker: ODILE,
      text: [
        { if: ALL(F('odile_price', 'sarr'), SARR_ALIVE), text: 'Odile has her glasses off and her coat open to the fire, and she is not reading anything, which you have learned means she has finished reading everything. "Sit, my dear," she says. "Nothing tonight costs. I priced it."' },
        { if: F('odile_sheet', 'kept'), text: 'Odile sits on a broken city crate with her glasses on their chain and the fire at her back, so the light falls on her lap and not in her eyes, and one hand flat on her coat where the lining is stiff. "Sit, my dear," she says. "Nothing tonight costs. I have looked."' },
        { text: 'Odile sits on a broken city crate with her glasses on their chain and the fire at her back, so the light falls on her lap and not in her eyes. There is nothing in her lap, and she keeps looking at it anyway. "Sit, my dear," she says. "Nothing tonight costs. I have looked."' },
      ],
      again: 'Odile, turning the chrome hand over on her knee.',
      options: [
        { id: 'a3f.odile.ways', text: 'Tomorrow. Price it for me.', once: true, next: 'odile_w_plan' },
        { id: 'a3f.odile.price', text: [{ if: F('odile_price', 'sarr'), text: 'Imelda. Your price.' }, { text: 'Imelda Sarr. What happens to her tomorrow?' }], once: true, next: 'odile_price' },
        { id: 'a3f.odile.tab', text: 'You keep a tab on everyone. What\'s on mine?', if: OPEN('odile'), next: 'odile_tab' },
        BACK,
      ],
    },
    ...kit.waysNodes('odile', {
      plan: 'She takes the glasses off, which means she is about to say something she has priced. "Two you always hold, my dear, like cash in a boot. Wear the sash and sign what they hand you: tolls on schedule, the guild audited by a clerk in the chair\'s office, Imelda made Treasurer exactly when the cloth says. Or walk back down the steps, and the city writes you off at nothing and buys another face." She puts the glasses back on. "The second is the only trade up there that costs nobody but you."',
      unwritten: kit.bySrc((s) => `${odileMeans[s]} She turns the chrome hand over. "Break the core, and there is no weather left to sell. The floor at Ninebridge opens on the Monday with nothing to trade, and Imelda is Treasurer of nothing." A small, honest pause. "And the city's water stops inside a year, which nobody on the floor ever priced, because they all drink in the Crown."`),
      concern: '"Sell it to the hill." She says it pleasantly, which is how you know she has priced it all the way down. "The guild sells, the Concern buys, and you sign in the sash so that nobody can ever tear the paper. Imelda would be Treasurer of their whole world, and pleased with herself." She looks at the fire. "I would stay, my dear. I would even go back to the floor; they would want somebody who can count. That is a cost."',
      opensky: 'She sits up. "Read it out. Every date the city knows, on every radio in the Reach." She is smiling, slowly. "Every sheet the floor ever wrote is a bet on a date only the city knew. Say the dates aloud and every sheet is worth the paper it is written on, mine included. The paper room at Ninebridge, read out in the street." She folds her hands. "Imelda ruined, and alive, and ashamed in daylight. I would pay to see that, and I am not a woman who pays."',
      part: '"The hill can shout now, I hear." She weighs it. "A shout is not a reading, my dear. You want somebody who reads the city\'s hand, people who won\'t riot on the first night, and the Cistern\'s own page. Otherwise it is only a very loud rumour, and I have sold those. They go off."',
      amendment: '"Wear it and amend it, in the Court\'s own register." She approves of registers; you can see it. "A chair that writes its own clauses wants an auditor, and I would apply. Imelda would have to open her books to me." She very nearly laughs. "She would hate that more than ruin."',
    }, 'Odile, pricing the steps on her chrome fingers.', '(Go on.)', {
      concern: [{ companion: KES, text: '"Obviously she\'d stay," Kes says, to the cable round her fingers. "Tollmen in a nice coat." "Ex-Tollmen, my dear," says Odile. "The coat is the same one."' }],
      opensky: [{ companion: NINE, text: '"The record would like that sheet read aloud with the rest," Nine says. "Hers first." "Mine first," says Odile. "I wrote it."' }],
    }),
    odile_price: {
      speaker: ODILE,
      text: [
        { if: SARR_DEAD, text: '"Imelda is dead." She says it the way she says a price she cannot change. "I taught her that a market is kinder than a plan, on a crate on the bridge, with the river still under it. She died of a plan in the end, which is the one death a factor never prices." She closes the glasses into their case. "That is a cost. Nothing up those steps tomorrow can price it, so leave it with me, my dear. I know how it\'s carried."' },
        { if: ALL(F('odile_price', 'sarr'), F('ash_orders', 'refused_late'), WITH_YOU('ash')), text: priced('"Alive." She says it the way a trader says filled, and she does not look across the fire at Ash. "You kept it on the lane at Openfield, and it was the Brother\'s knife you kept it from. I watched you say his name."', true) },
        { if: ALL(F('odile_price', 'sarr'), SARR_SPARED), text: priced('"Alive." She says it the way a trader says filled. "You kept it on the lane at Openfield, with the knife already out. I watched you."', true) },
        { if: F('odile_price', 'sarr'), text: priced('"Alive." She says it the way a trader says filled. "Nobody came for her with a knife, as it turned out, and you kept it anyway. I count that."', true) },
        { if: F('odile_price', 'none'), text: priced('"You wouldn\'t price her life in advance. I have been grateful for that all season, my dear, though I never said so."', false) },
        { if: F('odile_price', 'refused'), text: priced('"You promised her nothing, and I stood a little in front of her, as I said I would. Nobody needed me to, as it turned out."', false) },
        { text: priced('"Imelda will be at her desk tomorrow, whatever you do up there, writing it down."', false) },
      ],
      again: 'She is turning the chrome hand over, pricing it again.',
      interject: [{ companion: ASH, if: ALL(F('ash_orders', 'other'), SARR_ALIVE), text: 'Across the fire Ash has gone very still. "Brother," Odile says, pleasantly, without looking at him, "if you have a name in mind for tomorrow, I would take it kindly if it were not hers." Ash does not answer, and does not look away from the fire.' }],
      options: [
        { id: 'a3f.odile.price.word', text: 'She\'ll answer for the riders. In daylight, one way or another.', if: SARR_ALIVE, effects: [O(3), { set: 'a3_odile_word' }], next: 'odile_price_word' },
        { id: 'a3f.odile.price.true', text: 'Alive I can cover. The rest I can\'t promise you.', if: SARR_ALIVE, effects: [O(3)], next: 'odile_price_true' },
        { id: 'a3f.odile.price.mine', text: 'What she is after tomorrow is my business, not yours.', if: SARR_ALIVE, next: 'odile_price_mine' },
        { text: '(Let her be.)', if: SARR_DEAD, next: 'odile' },
      ],
    },
    odile_price_word: { speaker: ODILE, text: '"In daylight." She tastes the word. "I will hold you to that, my dear, and you know how I hold things: to the last Toll." She puts her glasses back on. "Thank you. I don\'t say it, as a rule. It\'s bad for the price."', again: '"In daylight," she says again.', options: [TO('odile')] },
    odile_price_true: { speaker: ODILE, text: '"Good." She means it. "That is the first honest quote I have had on her in twenty years. Everybody else either promised me the moon or told me she deserved the river." She turns the hand over. "Alive, then. The rest is weather."', again: '"The rest is weather," she says.', options: [TO('odile')] },
    odile_price_mine: {
      speaker: ODILE,
      text: [
        { if: F('odile_price', 'sarr'), text: '"Fair." She doesn\'t argue; she never argues a closed sheet. "You paid what you owed me, and the rest is yours. I taught her that too." A dry look over the glasses. "I may still stand a little in front of her. That part is my business."' },
        { text: '"Fair." She doesn\'t argue; she never argues a sheet she didn\'t write. "You owe me nothing on her, and you never did. I taught her that too." A dry look over the glasses. "I may still stand a little in front of her. That part is my business."' },
      ],
      again: '"A little in front of her," she says.',
      options: [TO('odile')],
    },
    odile_tab: {
      speaker: ODILE,
      text: sheetLine.map((v) => ({ ...v, text: tab(v.text) })),
      again: 'The red book open on her knee, two lines ruled at the bottom.',
      interject: [
        { companion: WREN, text: '"Put the girl\'s paper in it," Wren says, not turning round from the lane. "You bought ones like it." Odile looks at Wren\'s back for a long time. "I did," she says. "I\'ll write it as a debit, my dear. In my own column." She does, and Wren lets her.' },
        { companion: ASH, text: '"A usurer\'s book," Ash says across the fire, not unkindly. "Every usurer I ever knew kept two," says Odile. "I only ever kept the one. It was the honest one; that was the trouble with it."' },
      ],
      options: [
        { id: 'a3f.odile.tab.paid', text: 'Write it. Paid.', effects: [...LAST('odile', 'settled'), O(3), { decision: { id: 'a3_odile_tab', text: 'The night before the steps, Odile read me my tab and wrote paid at the bottom of it.' } }], next: 'odile_tab_paid' },
        { id: 'a3f.odile.tab.open', text: 'Leave it open. I\'d like to owe you something.', effects: [...LAST('odile', 'open'), O(5), { decision: { id: 'a3_odile_tab', text: 'The night before the steps, Odile read me my tab, and I asked her to leave it open.' } }], next: 'odile_tab_open' },
      ],
    },
    odile_tab_paid: {
      speaker: ODILE,
      text: withAfter('"Paid." She writes it, small and neat, and blots it with her thumb. "Then we are square, which is a lonely thing to be with anybody." She closes the book and puts it away.'),
      again: 'The red book, closed, in her coat.',
      options: [BACK],
    },
    odile_tab_open: {
      speaker: ODILE,
      text: withAfter('She laughs, the short real laugh she keeps for when something surprises her. "Nobody has ever asked to stay in my debt. They always want out." She does not write anything. "Then I shall have to collect, after, which means there is an after with you in it, my dear, and I find I have priced that too."'),
      again: 'The red book, left open on her knee.',
      options: [BACK],
    },
  };
}

// ---------------------------------------------------------------- Ash

const ashMeans: Record<Src, string> = {
  petra: '"My brothers came up the road behind you for it."',
  choir: '"The Choir would sing you in."',
  ash: '"I\'d hold the door," he says. "I said I would."',
  charge: '"There\'s powder in your pack. You carry it like a sleeping child."',
  bram: '"The Cistern man\'s trunk. One cable, he said."',
};
const ST = {
  refused: F('ash_orders', 'refused'),
  late: F('ash_orders', 'refused_late'),
  warned: F('ash_orders', 'warned'),
  undecided: F('ash_orders', 'undecided'),
  other: F('ash_orders', 'other'),
  /** He has told it (or it was found), and never said what he would do: his last question, asked at the fire. */
  ask: ALL(F('ash_orders_known'), NOT(F('ash_orders'))),
  /** Never told: at the fire he tells it, if he trusts the player enough (his own tree's band for the telling). */
  tell: ALL(NOT(F('ash_orders_known')), NOT(F('ash_orders')), { approval: { companion: ASH, gte: 35 } }),
  keep: ALL(NOT(F('ash_orders_known')), NOT(F('ash_orders')), { approval: { companion: ASH, lte: 34 } }),
};
const BAND40: Cond = { approval: { companion: ASH, gte: 40 } };
const UNDER40: Cond = { approval: { companion: ASH, lte: 39 } };
const BURNED: Effect[] = [{ set: 'ash_orders', value: 'refused' }, { set: 'a3_ash_last', value: 'burned' }, S(10), { decision: { id: 'a3_ash_burned', text: 'The night before the steps, Brother Ash burned the letter with my face in it, and called me by my name.' } }, { xp: 150 }];
const STEP_BELOW = '"If you put it on tomorrow, he\'ll come up the steps for you. I\'ll be on the step below you, {name}. I chose that. Not the sky; it doesn\'t. Me."';
/** His last question, as his own fire asked it (U8 S4), with the same answers and what each sets. */
const ASK = (p: string): OptionDef[] => [
  { id: `${p}.no`, text: 'No. Burn it.', if: BAND40, effects: [...BURNED, { set: 'a3_ash_word' }], next: 'ash_burn' },
  { id: `${p}.no.low`, text: 'No. Burn it.', if: UNDER40, effects: [{ set: 'ash_orders', value: 'warned' }, { set: 'a3_ash_word' }, { decision: { id: 'ash_orders', text: 'Brother Ash kept the letter, and promised to come to you first if it ever came to it.' } }], next: 'ash_doubt' },
  { id: `${p}.unsure`, text: 'I don\'t know yet. I won\'t lie to you about it.', effects: [{ set: 'ash_orders', value: 'warned' }, S(5), { decision: { id: 'ash_orders', text: 'Brother Ash kept the letter, and promised to come to you first if it ever came to it.' } }], next: 'ash_warned' },
  { id: `${p}.inside`, text: 'If it\'s the only way to change it from inside, yes.', effects: [{ set: 'ash_orders', value: 'undecided' }, { decision: { id: 'ash_orders', text: 'Brother Ash kept the letter: he will be there if you take the sash, as your friend or as theirs.' } }], next: 'ash_inside' },
  { id: `${p}.other`, text: 'There are names on Petra\'s board who wear theirs gladly. Let it fall on them.', effects: [{ set: 'ash_orders', value: 'other' }, S(-10), { decision: { id: 'ash_orders', text: 'You told Brother Ash to let his orders fall on other names. He did not say no.' } }], next: 'ash_other' },
];

function ashNodes(kit: FireKit): Record<string, NodeDef> {
  return {
    ash: {
      speaker: ASH,
      text: [
        { if: ASH_SELF_RISK, text: 'Ash sits a little apart from the fire with the shotgun across his knees. He has cleaned it twice since dark. When he loads it he puts in one shell, and closes the breech, and does not look at you. "Fire\'s honest, friend," he says. "Sit, if you\'re sitting."' },
        { if: ASH_REFUSED, text: '"{name}." He says it the way he says a row is finished. "Sit. Fire\'s honest, even on city crates." He feeds it a slat. "Last one before the steps."' },
        { text: 'Ash feeds the fire city crates, one slat at a time, as if they were owed it. "Fire\'s honest, friend," he says. "Even this one. Sit."' },
      ],
      again: 'Ash, feeding the fire one slat at a time.',
      options: [
        { id: 'a3f.ash.ways', text: 'Tomorrow. What do you see up there?', once: true, next: 'ash_w_plan' },
        {
          id: 'a3f.ash.orders', once: true, next: 'ash_orders',
          text: [
            { if: ASH_REFUSED, text: 'The letter\'s burned. What will they send instead?' },
            { if: F('ash_orders'), text: 'The letter. It\'s still in your scarf.' },
            { if: F('ash_orders_known'), text: 'The letter. You never said what you\'d do.' },
            { text: 'Tomorrow. What is it to you?' },
          ],
        },
        { id: 'a3f.ash.clean', text: 'That night you asked about the sash, I said: make it clean. I take it back.', if: ALL(F('ash_stance', 'clean'), NOT(F('a3_ash_clean_back'))), next: 'ash_clean' },
        { id: 'a3f.ash.last', text: '(Sit with him and let him talk.)', if: OPEN('ash'), next: 'ash_last' },
        BACK,
      ],
    },
    ...kit.waysNodes('ash', {
      plan: '"Two doors up there that don\'t shut, friend." He turns his cup. "Put the sash on and sign what it hands you, and the city keeps its schedule with your face on it. Or walk back down, and it finds another face. There\'s a weight to both." He looks up the steps. "The second\'s lighter to carry and longer to walk. Most of the good ones are."',
      unwritten: kit.bySrc((s) => `${ashMeans[s]} "Bring it down. No forecasts, no board, no pins. My brothers would call that the sky." He looks at the brass standpipe on the close. "The water stops inside a year, for the people in the towers. There's a weight to that I can't carry for you, and I've tried to lift it."`),
      concern: '"Sell it." He doesn\'t look up from the fire. "That\'s what the Gully was, friend. Somebody owed, and somebody came to collect." He puts another slat on. "I\'ll not stand in that room."',
      opensky: 'He is quiet a long time. "Read it all out. Every name, every night." He turns the cup. "Then everybody\'s unwritten at once, because everybody knows. My brothers wanted the sky for a few of us. That\'s the sky for all of them." A breath. "Somebody will hear their own night read out, the way Doria heard hers at the well. The first night will be hard. You\'d want people on the street who\'ll sit with them."',
      part: '"The hill can shout, I hear." He nods slowly. "A shout wants somebody to read it and somebody to sit with the ones who hear it. Halfway, friend. Halfway\'s a grave with no stone on it."',
      amendment: [
        { if: F('ash_orders_known'), text: '"Wear it and rewrite it." He turns that over like soil. "Then you\'re the forecast because you chose to be. My brothers would still say the sky is owed." He looks at you. "I\'d say you chose. I don\'t know which of us the sky would side with. It doesn\'t say."' },
        { text: '"Wear it and rewrite it." He turns that over like soil. "Then you\'re the forecast because you chose to be. There are men who\'d say that\'s worse than being made to." He looks at you. "I\'d say you chose. The sky doesn\'t say."' },
      ],
    }, 'Ash, turning his cup, naming doors.', '(Go on.)', {
      concern: [{ companion: ODILE, text: '"He means me, my dear," Odile says, quite kindly. "Somebody owed, and somebody collected. I did a great deal of the collecting." Ash doesn\'t say she\'s wrong.' }],
    }),
    ash_orders: {
      speaker: ASH,
      text: [
        { if: ST.refused, text: `"They'll send somebody else," he says. "They always do; that's what a standing order is. There's a brother of mine out past the lane tonight who's better with a blade than I ever was with a match." He turns the cup. ${STEP_BELOW}` },
        { if: ST.late, text: `"You said my name on the lane at Openfield, with the knife already out, and I stopped." He looks at his hands as if they belonged to somebody he used to know. "They'll send somebody else for you. There's a brother of mine out past the lane tonight who's better with a blade than I ever was." ${STEP_BELOW}` },
        { if: ALL(ST.warned, { seen: 'ash.choice.no.low' }), text: '"I said I\'d come to you first, to your face, before I did anything at all." He has the letter out of the lining; you didn\'t see him unpick it. "That\'s tomorrow, friend, if you put it on. I\'ll be standing in front of you on the steps. Not behind." He turns it over. "You told me once you wouldn\'t wear it, and I couldn\'t believe you yet. I said ask me again when I could. It\'s the last night there is. Ask me."' },
        { if: ST.warned, text: '"I said I\'d come to you first, to your face, before I did anything at all." He has the letter out of the lining; you didn\'t see him unpick it. "That\'s tomorrow, friend, if you put it on. I\'ll be standing in front of you on the steps. Not behind." He turns it over. "You told me you didn\'t know, and you didn\'t lie to me. Do you know now?"' },
        { if: ST.undecided, text: '"I said I\'d be there when you put it on, as your friend or as theirs, and that I\'d know by then." He has the letter out of the lining. "I don\'t. Not yet." He turns it over in his big hands. "So tell me, friend. If you wear it tomorrow, what\'s the first thing you\'ll sign?"' },
        { if: ST.other, text: '"You told me to let it fall on somebody who wears theirs gladly." He doesn\'t look at you. "There\'s one in this city who does. Tomorrow, while you\'re on the steps, I\'ll be somewhere else." The letter is in his hand. "Tell me not to, and it\'s you again, friend. That\'s the arithmetic. I never liked arithmetic."' },
        { if: ST.ask, text: '"I asked the sky about you last night." He has the letter out of the lining. "It didn\'t answer. It never does; that\'s why I trust it." He holds the letter over the coals. "So I\'ll ask you, the last night there is. If they give you the sash tomorrow, will you wear it?"' },
        { if: ST.tell, text: '"There\'s a weight I\'ve not told you." He takes off the grey scarf, and you realise you have never once seen him without it, and unpicks the lining with his knife. There is a fold of paper in it. "Under Openfield there\'s a cellar, and a board in it with twelve pins, and people who keep no likeness. I\'m one of them. Sworn: no name, no likeness." He holds the paper out to you. "It came to Openfield the week before you did. I should have said, long since. I\'m saying it the last night there is."' },
        { text: '"Tomorrow\'s a day with a weight in it." His hand goes to the lining of his scarf, and away again. "There\'s something I\'ve not told you, friend, and I\'ll not tell it tonight. If I have to, I\'ll tell it on the steps, to your face." He feeds the fire. "That\'s the most I can promise. It\'s more than I\'ve promised anybody in a long while."' },
      ],
      again: 'The letter in his hand, or his hand near it.',
      interject: [{ companion: NINE, if: ASH_REFUSED, text: '"For the record," Nine says, "I would prefer the step below remained unoccupied." "So would I," says Ash.' }],
      options: [
        // the letter burned already: what the player says to the one who will stand below them
        { id: 'a3f.ash.o.word', text: 'I won\'t put it on. Nobody has to stand anywhere.', if: ASH_REFUSED, effects: [S(3), { set: 'a3_ash_word' }], next: 'ash_word' },
        { id: 'a3f.ash.o.glad', text: 'I don\'t know yet what I\'ll do. I\'ll be glad of you, whatever it is.', if: ASH_REFUSED, effects: [S(3)], next: 'ash_glad' },
        { id: 'a3f.ash.o.dont', text: 'Don\'t stand there for me, Ash.', if: ASH_REFUSED, next: 'ash_dont' },
        // warned or undecided: ask again
        { id: 'a3f.ash.o.burn', text: 'No. I won\'t wear it. Burn it, Ash.', if: ALL(ANY(ST.warned, ST.undecided), BAND40), effects: [...BURNED, { set: 'a3_ash_word' }], next: 'ash_burn' },
        { id: 'a3f.ash.o.burn.low', text: 'No. I won\'t wear it. Burn it, Ash.', if: ALL(ANY(ST.warned, ST.undecided), UNDER40), effects: [{ set: 'a3_ash_word' }], next: 'ash_not_yet' },
        { id: 'a3f.ash.o.still', text: 'I still don\'t know. I won\'t lie to you about it.', if: ST.warned, effects: [S(3)], next: 'ash_still' },
        { id: 'a3f.ash.o.face', text: 'Then come to my face. I\'ll be there.', if: ST.warned, next: 'ash_face' },
        { id: 'a3f.ash.o.people', text: 'Nothing that counts a person. Not one line of it.', if: ST.undecided, effects: [S(3), { set: 'a3_ash_heard', value: 'people' }], next: 'ash_heard' },
        { id: 'a3f.ash.o.water', text: 'Whatever keeps the water running in the towers.', if: ST.undecided, effects: [{ set: 'a3_ash_heard', value: 'water' }], next: 'ash_heard' },
        { id: 'a3f.ash.o.dunno', text: 'I don\'t know. I\'d tell you if I did.', if: ST.undecided, effects: [S(2), { set: 'a3_ash_heard', value: 'unsure' }], next: 'ash_heard' },
        // other: take it back, or let him go
        { id: 'a3f.ash.o.back', text: 'Don\'t. I take it back.', if: ALL(ST.other, BAND40), effects: BURNED, next: 'ash_burn' },
        { id: 'a3f.ash.o.back.low', text: 'Don\'t. I take it back.', if: ALL(ST.other, UNDER40), effects: [{ set: 'ash_orders', value: 'warned' }, S(5)], next: 'ash_taken_back' },
        { id: 'a3f.ash.o.yours', text: 'I won\'t tell you what to do with it.', if: ST.other, effects: [S(2)], next: 'ash_yours' },
        { id: 'a3f.ash.o.go', text: 'Go, then.', if: ST.other, next: 'ash_go' },
        // his question, never answered
        ...ASK('a3f.ash.ask').map((o) => ({ ...o, if: o.if ? ALL(ST.ask, o.if) : ST.ask })),
        // never told: he tells it
        { id: 'a3f.ash.o.read', text: '(Take the paper and read it.)', if: ST.tell, next: 'ash_tell' },
        { text: '(Let it be.)', if: ST.keep, next: 'ash' },
      ],
    },
    ash_tell: {
      speaker: 'narrator',
      text: 'Pencil, no seal, no name, one line: IF THE ONE FROM THE CISTERN\'S HATCH TAKES THE SASH, THE SKY IS OWED. When you look up he has his hand out for it, and you give it back, and he holds it over the coals. "So," he says. "If they give you the sash tomorrow, will you wear it?"',
      again: 'One line in pencil, over the coals. THE SKY IS OWED.',
      effects: [{ set: 'ash_orders_known' }, { set: 'ash_orders_how', value: 'told' }, { learn: 'ash_unwritten' }, S(5)],
      options: ASK('a3f.ash.ask2'),
    },
    ash_burn: {
      speaker: ASH,
      text: 'He puts the letter in the fire and watches it go, the whole of it, until the pencil is gone and the paper is gone and there is only the fire, which is honest, even on city crates. "{name}," he says. It is the first time he has used it. "I chose. Not the sky; it doesn\'t. Me." He sits back. "Whatever they send for you tomorrow, they send through me. I\'ll be on the step below."',
      again: 'Only the fire, where the letter was.',
      options: [TO('ash')],
    },
    ash_doubt: { speaker: ASH, text: '"I want to believe that." He keeps the letter. "Tomorrow, if it comes to it, I\'ll come to you first, to your face. That I can promise."', again: '"To your face," he says. "That I can promise."', options: [TO('ash')] },
    ash_warned: { speaker: ASH, text: '"Then if it comes to it tomorrow, I\'ll come to you first, to your face, before I do anything at all." He puts the letter away. "That\'s the most I can promise, friend. It\'s more than I promised them."', again: '"More than I promised them," he says.', options: [TO('ash')] },
    ash_inside: { speaker: ASH, text: '"From inside." He turns that over the way he turns soil. "Then I\'ll be there when you put it on. Whether I\'m there as your friend or as theirs, I\'ll know by then. So will you."', again: '"I\'ll know by then," he says. "So will you."', options: [TO('ash')] },
    ash_other: { speaker: ASH, text: 'He looks at you a long time. "You\'re asking me to pick one of them and do it, so I don\'t have to do it to you." The letter goes back in the lining. "I might, friend. That\'s what frightens me. That I might, and like it."', again: '"That I might," he says, "and like it."', options: [TO('ash')] },
    ash_not_yet: { speaker: ASH, text: '"I want to." He holds the letter over the coals, and doesn\'t let go of it. "I can\'t yet, friend. Not on a word; I\'ve heard words." He puts it away. "Tomorrow, then. To your face. If you meant it, you\'ll not need me to."', again: '"Tomorrow, then," he says. "To your face."', options: [TO('ash')] },
    ash_still: { speaker: ASH, text: '"Honest." He nods, slowly. "I\'ll take honest the last night as well as the first." He puts the letter away. "To your face, then, if it comes to it. I\'ll not come from behind."', again: '"Not from behind," he says.', options: [TO('ash')] },
    ash_face: { speaker: ASH, text: '"You will." He doesn\'t make it a question. "You always are." He puts the letter away, and for a while neither of you says anything, and the fire does what it likes.', again: 'He has put the letter away.', options: [TO('ash')] },
    ash_heard: {
      speaker: ASH,
      text: [
        { if: F('a3_ash_heard', 'people'), text: '"Nothing that counts a person." He holds the letter a long time. "That\'s the answer of somebody who\'d be my friend in that chair, if anybody could." He puts it away. "I\'ll know on the steps. I think I know now. I\'ll not say it till I\'m sure."' },
        { if: F('a3_ash_heard', 'water'), text: '"The water." He considers it, as he would a field. "That\'s an honest answer and a heavy one. The city would say the same." He puts the letter away. "I\'ll know on the steps, friend. I\'ll be listening to what your hand does, not your mouth."' },
        { text: '"You don\'t know." He nods. "Nor me. We\'ll find out on the steps together, then." He puts the letter away. "There\'s a weight to not knowing. I\'d rather carry it with you than without."' },
      ],
      again: 'He has put the letter away, and is listening.',
      options: [TO('ash')],
    },
    ash_taken_back: { speaker: ASH, text: '"Then it\'s you again, friend." He says it almost with relief. "I\'ll come to your face tomorrow, if you put it on. Not to anybody else\'s." He puts the letter back in the lining. "Thank you for that. It\'s a strange thing to thank a man for."', again: '"It\'s you again," he says.', options: [TO('ash')] },
    ash_yours: { speaker: ASH, text: '"No. You won\'t." He looks at the letter. "That\'s fair. It was mine before it was ever yours." He puts it away, and you cannot tell which way he has decided, and you suspect neither can he.', again: 'The letter, put away. You cannot tell which way.', options: [TO('ash')] },
    ash_go: { speaker: ASH, text: '"Then I will." He gets up, and sits down again, and stays sitting. "Not tonight. Tomorrow." He looks at his hands for a long time, the way he looks at a grave before he digs it.', again: 'He is looking at his hands.', options: [TO('ash')] },
    ash_word: { speaker: ASH, text: '"Then I\'ll stand there for nothing, and gladly." He nearly smiles. "There\'s a weight to a promise like that, {name}. I\'ll help you carry it up the steps either way."', again: '"Either way," he says.', options: [TO('ash')] },
    ash_glad: { speaker: ASH, text: '"Whatever it is." He nods. "Then we\'re square, you and me. Nobody else gets to say what I\'m for."', again: '"Nobody else," he says.', options: [TO('ash')] },
    ash_dont: { speaker: ASH, text: '"That\'s mine to choose, {name}." He says it gently. "You taught me that. I\'d choose it again."', again: '"I\'d choose it again," he says.', options: [TO('ash')] },
    ash_clean: {
      speaker: ASH,
      text: 'He is still a long time. "I\'ve been carrying that sentence about like a stone in a boot," he says at last. "Walking on it every day since." He breaks the shotgun open across his knees and leaves it open. "Thank you, friend. I\'d started to listen to it."',
      again: 'The shotgun, broken open across his knees.',
      effects: [{ set: 'a3_ash_clean_back' }, S(5), { decision: { id: 'a3_ash_clean_back', text: 'The night before the steps, I took back what I had once told Brother Ash: make it clean.' } }],
      options: [TO('ash')],
    },
    ash_last: {
      speaker: ASH,
      text: [
        { if: F('ash_gully_outcome', 'spoken'), text: '"Soil up north is thin," he says, as if you had asked. "Glass-crust over clay, and the clay\'s good, if you break the crust and wait." He goes on about the soil at the Gully, the windpump\'s well, where the goats were, and you let him. "Doria said she\'d check my count. After, if there\'s an after, I\'m going up there with a spade. Nineteen. Somebody ought to dig them proper graves, and I know where every one of them fell." He looks at the fire. "That\'s a weight I\'d like to carry. The right way up."' },
        { if: F('ash_gully_outcome', 'told'), text: '"You said it to her for me, at the store." He doesn\'t say it as a reproach; he says it as a fact about soil. "Now it\'s nobody\'s. Not hers to forgive, not mine to say." He feeds the fire a slat. "After, I\'ll dig where I\'m told. There\'s always a row wants digging. That\'s the good thing about rows."' },
        { if: F('ash_gully_outcome', 'unsaid'), text: '"I never said it to her." He turns the cup. "We walked away from the store and I let you. I\'ve thought about it every night since." Then, without asking, he says them to the fire, slowly, the way Doria would have checked them: Ottla. Ren Haskell and his two boys. The twins from the top house. Old Sefton. Maro. Pia, who was four. And ten more, every one of them by name. "Somebody should hear them before the steps," he says. "You\'ll do."' },
        { if: F('ash_gully_outcome', 'grave'), text: '"I said it to a cairn." He turns the cup. "Doria\'s. She\'d have checked my count. Cairns don\'t." He looks at the fire. "After, I\'ll go back and dig hers proper, and the nineteen beside her. She\'d want them counted in a row."' },
        { text: '"Soil," he says, when you have sat a while, as if you had asked. "Here it\'s all under stone. The city poured it over the dirt a long time ago and the dirt\'s still down there, waiting, the way dirt does." He goes on about it: what grows through a crack, what the Choir\'s rows want, the difference between dust and soil, which is mostly patience. It takes a while. "After," he says at the end, "I\'d like to dig somewhere it\'s still soil. That\'s all. That\'s the whole of it."' },
      ],
      again: 'He is still talking about soil, more quietly.',
      interject: [{ companion: ILYA, if: F('ash_gully_outcome', 'unsaid'), text: '"Nineteen," Ilya says quietly from across the fire, when Ash has done. He has been counting with him the whole time. Ash looks at him, and nods, as if something has been agreed.' }],
      options: [
        { id: 'a3f.ash.last.end', text: '(Listen to all of it.)', if: NOT(F('a3_ash_last', 'burned')), effects: [...LAST('ash', 'none'), S(3)], next: 'ash_last_end' },
        { id: 'a3f.ash.last.end.b', text: '(Listen to all of it.)', if: F('a3_ash_last', 'burned'), effects: [...NIGHT_HAD('ash'), S(3)], next: 'ash_last_end' },
      ],
    },
    ash_last_end: {
      speaker: ASH,
      text: [
        { if: ASH_REFUSED, text: '"You let me talk about soil, {name}." He sounds surprised every time. "Nobody does." He puts the last slat on the fire and watches it take. "Sleep. The steps are honest too, in the morning. Mostly."' },
        { text: '"You let me talk about soil, friend." He sounds surprised every time. "Nobody does." He puts the last slat on the fire and watches it take. "Sleep. The steps are honest too, in the morning. Mostly."' },
      ],
      again: 'Ash, watching the last slat take.',
      options: [BACK],
    },
  };
}

// ---------------------------------------------------------------- Nine

const N = (by: number) => A(NINE, by);
const nineMeans: Record<Src, string> = {
  petra: '"The Unwritten at your back, whom the record has never once described as a means."',
  choir: '"The Choir, which the record lists as sedition and the drains list as customers."',
  ash: '"The Brother, at the door. I have still not read his entry to anyone."',
  charge: '"The powder in your pack, which I have noted."',
  bram: '"The trunk the Cistern man described: couriers and one power cable. It is in the drawings. Nobody reads the drawings."',
};
const NINE_SITS = 'It sits, which it still does badly, with the other ledger on its knee.';
const LOG_KEPT: Cond = ALL(F('nine_log_kept'), NOT(F('nine_log_given')));

function nineNodes(kit: FireKit): Record<string, NodeDef> {
  return {
    nine: {
      speaker: NINE,
      text: [
        { if: F('a3_recall', 'declined'), text: `"Fire. Unlicensed. I have noted it, on my own account." ${NINE_SITS} "The city asked for me back. The keeper declined. It is the first order the city has ever had refused by one of its own units, and the record has had to rule a new column for it."` },
        { if: F('a3_recall', 'stayed'), text: `"Fire. Unlicensed. I have noted it." ${NINE_SITS} "The city asked my keeper for me, and you said no. I filed your no in both ledgers. The city's copy came back stamped RECEIVED, which is the most the city has ever said to me."` },
        { if: F('a3_recall', 'court'), text: `"Fire. Unlicensed. I have noted it, on my own account." ${NINE_SITS} "The Court of Accounts heard whether a unit may be its own keeper. Assessor Three looked at me for a long time, and then wrote it down. I have never been looked at for a long time before."` },
        { if: F('a3_recall', 'bought'), text: `"Fire. Unlicensed. I have noted it." ${NINE_SITS} "I am yours now, at assessed value plus one Toll. I have filed a complaint about the Toll."` },
        { if: F('a3_recall', 'hidden'), text: `"Fire. Unlicensed. I have noted it." ${NINE_SITS} "Under clause 22 I am NOT FOUND. A thing that is not found cannot be disposed of. I find it restful."` },
        { if: F('a3_recall', 'fought'), text: `"Fire. Unlicensed. I have noted it." ${NINE_SITS} "Two recall wardens, at the gate. I have logged the fight. I was on both sides of it."` },
        { if: RECALL_OPEN, text: `"Fire. Unlicensed. I have noted it." ${NINE_SITS} "There is a notice for me at the Precinct gate. It will wait. Notices do."` },
        { if: NINE_KEEPER_SELF, text: `"Fire. Unlicensed. I have noted it, on my own account." ${NINE_SITS}` },
        { text: `"Fire. Unlicensed. I have noted it." ${NINE_SITS}` },
      ],
      again: 'Nine, by the unlicensed fire, the other ledger on its knee.',
      options: [
        { id: 'a3f.nine.ways', text: 'Tomorrow. What does the record suggest?', once: true, next: 'nine_w_plan' },
        { id: 'a3f.nine.line', text: 'What won\'t you stand beside?', once: true, next: 'nine_line' },
        { id: 'a3f.nine.log', text: 'You said you\'d read it to me yourself, when it matters.', if: ALL(OPEN('nine'), LOG_KEPT), next: 'nine_log' },
        { id: 'a3f.nine.drains', text: 'The drains. Tell me one last time.', if: ALL(OPEN('nine'), NOT(LOG_KEPT)), next: 'nine_drains' },
        BACK,
      ],
    },
    ...kit.waysNodes('nine', {
      plan: [
        { if: NINE_CONSCIENCE, text: '"Two options are lawful whatever else is held." The lens clicks. "Wear the sash and sign: the schedule holds, and I would stand beside the chair and read every order aloud before it was carried out. Or decline, and the Plan reroutes to another face on the steps. The record suggests it has one ready." A pause. "It always has one ready. That is the least lawful thing about it."' },
        { text: '"Two options are lawful whatever else is held." The lens clicks. "Wear the sash and sign: the schedule holds, and I would sit beside the chair as its assessor and make each line lawful. Or decline, and the Plan reroutes to another face on the steps. The record suggests it has one ready." A pause. "It always has one ready."' },
      ],
      unwritten: kit.bySrc((s) => `${nineMeans[s]} "Destroy the core." It says the words as if they were a drainage grade. "The record suggests the Precinct's drains fail within a year without it: nine hundred and forty kilometres, and nobody deciding where the water goes." The lens holds on the fire. "I have said what I will do about that. I will say it again, if asked."`),
      concern: '"A transfer of the core to the Concern, under the chair\'s own signature, which the Ledger cannot void." The lens clicks. "Lawful. The record suggests it is the most lawful terrible thing on offer. I would say so, aloud, and then I would be the Concern\'s."',
      opensky: '"Read the record aloud to everyone." The lens holds on the fire for longer than it holds on anything. "Every forecast, every name, every date. And the four hundred and eleven errors, which would be read for the first time, by everyone at once." A click, slightly off true. "I would like to be the one who reads them. I am not permitted to want that. I have stopped saying that I am not permitted."',
      part: '"The relay reaches every receiver now." It has checked. "A broadcast without a reader is noise. Without people on the street after, it is a riot. Without the Cistern\'s own page, it is a rumour." The lens clicks. "Halfway. The record suggests halfway is the most dangerous place to stop, in a broadcast as in a drain."',
      amendment: '"Amend it from the chair, in the Court\'s own register." The lens turns to you. "Up to three clauses in the first season, from your own precedents. The charter has never once been amended. It has a clause providing for it, which nobody has read." A click. "I would read them back to you. Twice. I would enjoy it, which is not lawful either."',
    }, 'Nine, reading the steps off the record.', '(Go on.)', {
      concern: [{ companion: ODILE, text: '"The most lawful terrible thing," Odile says. "My dear, it has been reading my old sheets."' }],
    }),
    nine_line: {
      speaker: NINE,
      text: [
        { if: NINE_CONSCIENCE, text: '"One thing." The lens clicks. "If you go to the core to end it, I will stand at its door and say the record\'s one plea, once: a city is a thing that decides where its water goes, and without it the drains of the Precinct fail within a year. Then I will withdraw, with the grounds attached. I will not fight you. I will not help." It closes the other ledger on its thumb. "Anything else you do up there, I will read aloud first, and say so where it is recorded if it is wrong."' },
        { text: '"One thing." The lens clicks. "If you go to the core to end it, I will stand at its door and say the record\'s one plea, once: a city is a thing that decides where its water goes, and without it the drains of the Precinct fail within a year. Then I will withdraw, with the grounds attached. I will not fight you. I will not help." It closes the other ledger on its thumb. "Anything else you do up there, I will make lawful, line by line, and log the lines I cannot."' },
      ],
      again: '"I will not fight you," it says again. "I will not help."',
      interject: [{ companion: ASH, text: '"Law\'s a mask," Ash says across the fire. "Its face is the drains," says Nine, without turning its lens. "I have never once pretended otherwise." Ash lets that sit.' }],
      options: [
        { id: 'a3f.nine.line.word', text: 'I won\'t break it. You have my word.', effects: [N(3), { set: 'a3_nine_word' }], next: 'nine_line_word' },
        { id: 'a3f.nine.line.honest', text: 'I won\'t promise. I don\'t know yet what I\'ll do.', effects: [N(3)], next: 'nine_line_honest' },
        { id: 'a3f.nine.line.mine', text: 'That\'s mine to decide, Nine.', effects: [N(-3)], next: 'nine_line_mine' },
      ],
    },
    nine_line_word: { speaker: NINE, text: '"Your word. To a unit." The lens clicks twice, which it does not do. "The record suggests that is a first. I have entered it in the other ledger, under a heading of its own."', again: 'A heading of its own, in the other ledger.', options: [TO('nine')] },
    nine_line_honest: { speaker: NINE, text: '"Honest." It sounds, for a filing cabinet, pleased. "Nobody tells a unit that they do not know. They tell it what to do. I would rather be told the first."', again: '"The first," it says.', options: [TO('nine')] },
    nine_line_mine: { speaker: NINE, text: '"It is." The lens does not move. "The record notes that you said so. It notes most things."', again: 'The lens has not moved.', options: [TO('nine')] },
    nine_log: {
      speaker: NINE,
      text: '"When it matters." The lens clicks. "The record suggests tomorrow." It opens the plate on its chest and takes out the fair copy, four hundred and eleven errors in the city\'s own hand, and reads you the first page by the fire: R4, a girl in the Stacks forecast to be a clerk, who became a drain-diver in the Sink instead, and was good at it. Then it turns to the last page, which has today\'s date at the top and nothing under it. "The four hundred and twelfth," it says. "I have left the line open. The record suggests you know why."',
      again: 'The fair copy open on its knee at the last page, the line under the date empty.',
      interject: [{ companion: TAMSIN, text: '"Read mine," Tamsin says from across the fire. "Sixty-one." "Sixty-one is not an error," says Nine. "It is page two hundred and four. I have underlined it."' }],
      options: [
        { id: 'a3f.nine.log.give', text: 'Give me the copy. Tomorrow, read the original where it\'s recorded.', effects: [{ set: 'nine_log_given' }, { learn: 'nine_log_copy' }, ...LAST('nine', 'log'), N(5), { decision: { id: 'nine_log_given', text: 'The night before the steps, Assessor Nine gave me the fair copy of its log of every forecast that failed: it mattered now.' } }], next: 'nine_log_given' },
        { id: 'a3f.nine.log.keep', text: 'Keep it. Read me the rest, here, tonight.', effects: [...LAST('nine', 'log'), N(5)], next: 'nine_log_read' },
      ],
    },
    nine_log_given: { speaker: NINE, text: 'It holds the fair copy out across the fire, and for a moment does not let go of it, which it has never done with anything. Then it does. "Somewhere it will be read," it says. "That was the other thing I wanted." The lens clicks. "Tomorrow, it is."', again: 'The fair copy, in your hands now.', options: [BACK] },
    nine_log_read: { speaker: NINE, text: 'It reads you the rest. Not all four hundred and eleven; it chooses, and says which it is choosing and why, and you understand after a while that it is reading you the ones it liked best, the errors that turned out kind. When the fire is low it closes the book and puts it back behind the plate. "Thank you," it says. "Nobody has asked to hear the rest. The record suggests nobody knew there was a rest."', again: 'The plate, closed over the book.', options: [BACK] },
    nine_drains: {
      speaker: NINE,
      text: [
        { if: F('nine_log_given'), text: '"Clause 14." It settles, badly. "The Spire stands on the oldest culvert in the Precinct. The steps you will climb tomorrow drain into it by a fall of one in sixty." It goes on: the culverts under the close by their pre-Burn names, which drain runs under the steps, which would fail first if nobody decided where the water went, and in what order, and how long each would take. "You have the copy," it says at the end. "I have the drains. That seems a fair division."' },
        { text: '"Clause 14." It settles, badly. "The Spire stands on the oldest culvert in the Precinct. The steps you will climb tomorrow drain into it by a fall of one in sixty." It goes on: the culverts under the close by their pre-Burn names, which drain runs under the steps, which would fail first if nobody decided where the water went, and in what order, and how long each would take. "Nobody lets me," it says at the end. "You always do."' },
      ],
      again: 'It is on the fourth culvert, more quietly.',
      interject: [{ companion: KES, text: '"Obviously I know where every one of those goes," Kes says. "I\'ve been in them." "I know," says Nine. "The record does not. I find the difference restful."' }],
      options: [{ id: 'a3f.nine.drains.end', text: '(Let it go on.)', effects: [...LAST('nine', 'none'), N(3)], next: 'nine_drains_end' }],
    },
    nine_drains_end: { speaker: NINE, text: 'When it stops, the fire has burned down a hand. "Thank you," it says. "The record suggests I have said that to you more often than to anyone in a hundred and twenty years. I have checked."', again: '"I have checked," it says.', options: [BACK] },
  };
}

// ---------------------------------------------------------------- built into the fire

const LEFT3: Record<Three, Cond> = {
  odile: ANY(NOT({ seen: 'a3f.odile.ways' }), NOT({ seen: 'a3f.odile.price' }), OPEN('odile')),
  ash: ANY(NOT({ seen: 'a3f.ash.ways' }), NOT({ seen: 'a3f.ash.orders' }), OPEN('ash'), ALL(F('ash_stance', 'clean'), NOT(F('a3_ash_clean_back')))),
  nine: ANY(NOT({ seen: 'a3f.nine.ways' }), NOT({ seen: 'a3f.nine.line' }), OPEN('nine')),
};
/** What the fire (a3_fire.ts) takes from this file: its start entries (the leavings, after Wren's and Kes's), the next leaving
 * to follow one that has just happened, whether any is still due, the hub's three new places, and the nodes. */
export function lastNightsII(kit: FireKit): { start: { if: Cond; node: string }[]; after: (pre: Cond) => OptionDef[]; settled: Cond; sit: OptionDef[]; nodes: Record<string, NodeDef> } {
  return {
    start: [{ if: ASH_LN_FIRE, node: 'ash_ln' }, { if: ODILE_LN_FIRE, node: 'odile_ln' }],
    after: (pre) => [
      { text: '(Stay at the fire.)', if: ALL(pre, ASH_LN_FIRE), next: 'ash_ln' },
      { text: '(Stay at the fire.)', if: ALL(pre, NOT(ASH_LN_FIRE), ODILE_LN_FIRE), next: 'odile_ln' },
    ],
    settled: NOT(ANY(ASH_LN_FIRE, ODILE_LN_FIRE)),
    sit: [
      { id: 'a3f.hub.odile', text: '(Sit by Odile.)', if: ALL(WITH_YOU('odile'), LEFT3.odile), next: 'odile' },
      { id: 'a3f.hub.ash', text: '(Sit by Ash.)', if: ALL(WITH_YOU('ash'), LEFT3.ash), next: 'ash' },
      { id: 'a3f.hub.nine', text: '(Sit by Nine.)', if: ALL(WITH_YOU('nine'), LEFT3.nine), next: 'nine' },
    ],
    nodes: {
      ash_ln: { ...ASH_LN_NODES.a3_ln, speaker: ASH, text: ASH_LN_TEXT.close, options: [{ text: '(Let him go.)', next: 'after_guild' }] },
      odile_ln: { ...ODILE_PRICE_NODES.a3_price, speaker: ODILE, text: ODILE_PRICE_TEXT.close, options: [{ text: '(Let her go.)', next: 'after_guild' }] },
      ...odileNodes(kit),
      ...ashNodes(kit),
      ...nineNodes(kit),
    },
  };
}
