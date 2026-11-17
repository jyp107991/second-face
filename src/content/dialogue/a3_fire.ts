import type { DialogueDef, NodeDef, OptionDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import {
  A3_OPEN, ALLY, ASH, ASH_REFUSED, B_MEANS, C_BUYER, D_ARCHIVE, D_PEOPLE, D_READER, D_VOICE, E_FILE, E_PREC, E_REG, ILYA, IN, KES,
  KES_NUMBED, LN, LN_DONE, NINE, ODILE, TAMSIN, WITH_YOU, WREN,
} from '../world/a3_conds';

/**
 * Last nights I (B6n): the fire at the Spire's close, the night before the steps. A works barrel at the foot of the steps
 * (prop `a3_fire` on md_spire) is lit once the Ledger's card has come (`a3_summoned`); every companion still with the player
 * (WITH_YOU: travelling, or waiting and gathered at the close) has a place at it. This file holds the hub and the scenes of
 * the four who can be loved: Tamsin, Wren, Ilya and Kes. Each scene, said in the companion's own voice (node speaker = the
 * companion, so no companion's own tree is edited for it):
 * - what they think is possible up there (the ways to finish, read from what the player holds, never named as such);
 * - what they cannot walk beside tomorrow (their red line in the ending, said plainly the night before, never sprung);
 * - the romance's last step, consent-forward as every step was: committed romances asked once more, an unfinished one
 *   offered its last step (Wren's route or stop, Ilya's after, Kes's "a thing", Tamsin's ask and her "what are we, after"),
 *   with "not tonight" and "no" always answers; or, with no romance, the last night as friends.
 * The romance rules of each tree hold here too: Tamsin's list after two lies, the others' count at approval 30 or below,
 * the shared `romance_partner` (a committed romance elsewhere closes the others kindly), Ilya only sober. Nothing is a
 * reward for a gift.
 * Sets `a3_<c>_last` = together | apart | none (the romance committed at the last night / ended there / friends) and
 * `a3_<c>_night` (the last night's beat was had, deferrals included). Odile, Ash and Nine's scenes are B6o's (they join the
 * hub's options; the three speak here through interjections).
 *
 * Also here: Wren's and Kes's leaving after a guild night they were not at (B5d makes them leave at its dawn only when they
 * stood there): at the first fire or meeting after it, in their own trees (`WREN_GUILD_*`, `KES_GUILD_*`, spread into
 * overpass.ts and hs_kes.ts), or at this fire if they were gathered at the close without a word. Story notes:
 * story/B6_NOTES_SECRET.md §7 and §8 B6n, and its "As built".
 */

const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const AT_CAMP: Cond = F('at_camp');
type V = { if?: Cond; text: string }[];

/** The fire is lit: Act 3, the Ledger's card come (the close gathers), and the steps not yet climbed. */
export const FIRE_LIT: Cond = ALL(A3_OPEN, F('a3_summoned'), NOT(F('a3_pnr')));
const DAY: Cond = { hour: { from: 7, to: 19 } };
/** The Long Night stood with the guild (B5d makes Wren and Kes leave at its dawn, but only when they were there). */
const GUILD_NIGHT: Cond = ALL(LN_DONE, LN('guild'));

// ---------------------------------------------------------------- the companions' states at the fire

type Key = 'tamsin' | 'wren' | 'ilya' | 'kes';
const ID: Record<Key, string> = { tamsin: TAMSIN, wren: WREN, ilya: ILYA, kes: KES };
const SHORT: Record<Key, string> = { tamsin: 'tam', wren: 'wren', ilya: 'ilya', kes: 'kes' };
const LAST = (c: Key, v: 'together' | 'apart' | 'none'): Effect[] => [{ set: `a3_${c}_last`, value: v }, { set: `a3_${c}_night` }];
const NIGHT_HAD = (c: Key): Effect[] => [{ set: `a3_${c}_night` }];
const OPEN_N = (c: Key): Cond => NOT(F(`a3_${c}_night`));
const FREE = (c: Key): Cond => ANY(NOT(F('romance_partner')), F('romance_partner', ID[c]));
const LOW = (c: Key): Cond => ({ approval: { companion: ID[c], lte: 30 } });
const ROM = (flag: string, vals: string[]): Cond => ANY(...vals.map((v) => F(flag, v)));
/** Each romance "on" (U8: the states a step can follow from). */
export const ROM_ON: Record<Key, Cond> = {
  tamsin: ROM('tam_romance', ['open', 'together']),
  wren: ROM('wren_rom', ['yes', 'later_roof', 'roof', 'committed']),
  ilya: ROM('ilya_rom', ['yes', 'later_well', 'well', 'committed']),
  kes: ROM('kes_rom', ['yes', 'later_dark', 'dark', 'committed']),
};
const TAM_LIST: Cond = ALL({ flag: 'tam_lies', gte: 2 }, NOT(F('tam_listed')));
const ILYA_SOBER: Cond = { flag: 'ilya_sober_days', gte: 30 };
const ROPE_OPEN: Cond = NOT(F('wren_rope'));
/** Topics still to say at the fire (the hub offers a companion only while one is left: U7). */
const LEFT = (c: Key): Cond => ANY(NOT({ seen: `a3f.${SHORT[c]}.ways` }), NOT({ seen: `a3f.${SHORT[c]}.line` }), OPEN_N(c), ...(c === 'kes' ? [NOT({ seen: 'a3f.kes.slack' })] : []));
const BACK = (_c: Key): OptionDef => ({ text: '(Back to the fire.)', next: 'hub' });
const TO = (c: Key, text = '(Stay a while.)'): OptionDef => ({ text, next: SHORT[c] });

// ---------------------------------------------------------------- what they think is possible (the ways, never named)

type Way = 'plan' | 'unwritten' | 'concern' | 'opensky' | 'part' | 'amendment';
const WAYS: Way[] = ['plan', 'unwritten', 'concern', 'opensky', 'part', 'amendment'];
/** What the player holds, by way (the §4.1 keys): `part` is the hill speaking wide without the rest of what reading needs. */
export const WAY_HELD: Record<Way, Cond> = {
  plan: ALL(),
  unwritten: B_MEANS,
  concern: ALL(C_BUYER, { item: 'k_a3_transfer' }),
  opensky: ALL(D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE),
  part: ALL(D_VOICE, NOT(ALL(D_READER, D_PEOPLE, D_ARCHIVE))),
  amendment: ALL(E_FILE, E_PREC, E_REG),
};
/** The chain of ways a companion talks through: from each, "go on" to the next one held, or back when none is left. */
function waysNodes(c: Key, t: Record<Way, Text>, again: string, more: string, interject: Partial<Record<Way, NodeDef['interject']>> = {}): Record<string, NodeDef> {
  const k = SHORT[c], out: Record<string, NodeDef> = {};
  WAYS.forEach((w, i) => {
    const later = WAYS.slice(i + 1);
    const options: OptionDef[] = later.map((w2, j) => ({ text: more, if: ALL(WAY_HELD[w2], ...later.slice(0, j).map((x) => NOT(WAY_HELD[x]))), next: `${k}_w_${w2}` }));
    options.push({ text: '(That\'s all of it.)', if: NOT(ANY(...later.map((x) => WAY_HELD[x]))), next: k });
    out[`${k}_w_${w}`] = { speaker: ID[c], text: t[w], again, options, ...(interject[w] ? { interject: interject[w] } : {}) };
  });
  return out;
}
/** B's means, by where they came from (first match: the node is reached only when one holds). */
type Src = 'petra' | 'choir' | 'ash' | 'charge' | 'bram';
const SRC: { id: Src; if: Cond }[] = [
  { id: 'petra', if: F('a3_unwritten', 'with_you') }, { id: 'choir', if: LN('choir') }, { id: 'ash', if: ALL(IN(ASH), ASH_REFUSED) },
  { id: 'charge', if: { item: 'k_a3_charge' } }, { id: 'bram', if: ALL(F('a3_bram_cut'), { skill: 'mechanics', gte: 50 }) },
];
const bySrc = (f: (s: Src) => string): V => [...SRC.slice(0, -1).map((s) => ({ if: s.if, text: f(s.id) })), { text: f('bram') }];
/** Ilya counts the ways aloud; his numbers follow what is held before each one. */
const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const COUNTED: Way[] = ['unwritten', 'concern', 'opensky', 'amendment'];
function counted(w: Way, f: (n: string) => string): V {
  const before = COUNTED.slice(0, COUNTED.indexOf(w));
  const out: V = [];
  for (let m = 0; m < 1 << before.length; m++) {
    const conds = before.map((b, i) => ((m >> i) & 1 ? WAY_HELD[b] : NOT(WAY_HELD[b])));
    const n = 3 + before.filter((_, i) => (m >> i) & 1).length;
    out.push(conds.length ? { if: ALL(...conds), text: f(NUM[n]) } : { text: f(NUM[n]) });
  }
  out[out.length - 1] = { text: out[out.length - 1].text };
  return out;
}

// ---------------------------------------------------------------- Wren's and Kes's leaving after a guild night they missed

const W_GUILD_TEXT = {
  camp: 'Wren is on her feet when you come back to the fire, pack on her shoulder, goggles down. "I heard," she says. "Everybody on the road\'s heard. Openfield. You stood with the guild and the Concern and shook their hands, the ones who sell people on paper." She doesn\'t raise her voice; she never has. "I can\'t walk next to that. I won\'t learn it." She is a long way down the road before you understand she meant it.',
  waiting: 'Wren is already standing when you reach her, pack on, the way she always is, and she doesn\'t say "Back." "I heard about Openfield," she says. "Everybody\'s heard. You stood with the guild, and the Concern, and shook their hands." She pulls her goggles down. "I said I\'d wait. I waited to say this to your face. I can\'t walk next to that. I won\'t learn it." She goes, and does not look back.',
  close: 'Wren gets up from the fire when you sit down at it, and you see that her pack is already on. "I came this far to say it to your face," she says. "Openfield. You stood with the guild and the Concern, and shook their hands, the ones who sell people on paper." She pulls her goggles down. "I\'ll not walk up those steps beside that. I won\'t learn it." She goes off across the close toward the lane, past the warden, who doesn\'t stop her, and does not look back.',
};
const W_GUILD_EFFECTS: Effect[] = [{ leave: WREN }, { set: 'wren_left', value: 'guild' }, A(WREN, -40), { decision: { id: 'wren_left_guild', text: 'Wren left me when she heard I had stood with the guild and the Concern at Openfield\'s Long Night.' } }];
/** Letting her go; a committed romance with her ends with her and frees the shared partner. */
const W_GO = (then: Pick<OptionDef, 'exit' | 'next'>): OptionDef[] => [
  { text: '(Let her go.)', if: F('romance_partner', WREN), effects: [{ set: 'wren_rom', value: 'ended' }, { set: 'romance_partner', value: false }], ...then },
  { text: '(Let her go.)', if: NOT(F('romance_partner', WREN)), ...then },
];
/** In Wren's own tree (overpass.ts): at the first camp after a guild night with her travelling, or where she waited. (The
 * text keys on the camp, not the party: a node's text is read after its effects, and she has left the party by then.) */
export const WREN_GUILD_START = { if: ALL(GUILD_NIGHT, F('wren_joined'), NOT(F('wren_left')), ANY(ALL(IN(WREN), AT_CAMP), NOT(IN(WREN)))), node: 'a3_guild' };
export const WREN_GUILD_NODES: Record<string, NodeDef> = {
  a3_guild: {
    text: [{ if: { at: 'md_spire' }, text: W_GUILD_TEXT.close }, { if: AT_CAMP, text: W_GUILD_TEXT.camp }, { text: W_GUILD_TEXT.waiting }],
    again: 'She is a long way down the road.',
    effects: W_GUILD_EFFECTS,
    options: W_GO({ exit: true }),
  },
};

const K_GUILD_TEXT = {
  camp: 'Kes hasn\'t wound the cable all evening. When she speaks it is once, with her hand on the back of her neck. "Openfield. You stood with the guild and the Concern." She doesn\'t cry; she has decided not to. "You handed them the Flats. And everyone on them who signs." She gets up. "I said I\'d stay till I\'d said it to your face. I\'ve said it." She goes north, toward the Line and the Shift.',
  waiting: 'Kes is where you left her, and she doesn\'t get up to meet you. "I heard about Openfield," she says, with her hand on the back of her neck. "You stood with the guild and the Concern. You handed them the Flats, and everyone on them who signs." She doesn\'t cry; she has decided not to. "I waited so I could say it to your face. I\'ve said it." She goes north, toward the Line, and the Shift.',
  close: 'Kes is at the fire with her hand on the back of her neck, and she doesn\'t look at you when you sit. "I heard about Openfield the day after," she says. "You stood with the guild and the Concern. You handed them the Flats, and everyone on them who signs." She doesn\'t cry; she has decided not to. "I came to the steps to say it to your face. I\'m not going up them with you." She goes off across the close, north, toward the Line.',
};
const K_GUILD_EFFECTS: Effect[] = [{ leave: KES }, { set: 'kes_left', value: 'guild' }, { set: 'kes_rom', value: 'ended' }, A(KES, -40), { decision: { id: 'kes_left_guild', text: 'Kes left me when she heard I had stood with the guild and the Concern at Openfield\'s Long Night.' } }];
const K_GO = (then: Pick<OptionDef, 'exit' | 'next'>): OptionDef[] => [
  { text: '(Let her go.)', if: F('romance_partner', KES), effects: [{ set: 'romance_partner', value: false }], ...then },
  { text: '(Let her go.)', if: NOT(F('romance_partner', KES)), ...then },
];
/** In Kes's own tree (hs_kes.ts): at the first camp after a guild night with her travelling, or where she waited. */
export const KES_GUILD_START = { if: ALL(GUILD_NIGHT, F('kes_joined'), NOT(F('kes_left')), ANY(ALL(IN(KES), AT_CAMP), NOT(IN(KES)))), node: 'a3_guild' };
export const KES_GUILD_NODES: Record<string, NodeDef> = {
  a3_guild: {
    text: [{ if: { at: 'md_spire' }, text: K_GUILD_TEXT.close }, { if: AT_CAMP, text: K_GUILD_TEXT.camp }, { text: K_GUILD_TEXT.waiting }],
    again: 'She has gone north.',
    effects: K_GUILD_EFFECTS,
    options: K_GO({ exit: true }),
  },
};
/** At the fire: a Wren or Kes gathered at the close after a guild night, never spoken to since. */
const WREN_GUILD_FIRE: Cond = ALL(GUILD_NIGHT, WITH_YOU('wren'));
const KES_GUILD_FIRE: Cond = ALL(GUILD_NIGHT, WITH_YOU('kes'));

// ---------------------------------------------------------------- Tamsin

const T = (by: number) => A(TAMSIN, by);
const TAM_FREE = FREE('tamsin');
const TAM_ROM = ROM_ON.tamsin;
const tamAfter = (bit: string) => `"After." She says it like a word in a language she is still learning. "I keep trying to picture it and I only get bits." She counts on her fingers, which is Ilya's habit, and doesn't notice. "${bit}" She stops counting. "So. What are we? After. You can say you don't know. That's allowed. That's always allowed."`;
const tamMeans: Record<Src, string> = {
  petra: '"Or you break it. Petra\'s lot walked up the road behind you for that. Burn the count, only the right count this time."',
  choir: '"Or you break it. The Choir would hold your coat while you did."',
  ash: '"Or you break it. Ash would hold the door. He\'s been saying so with his face for a month."',
  charge: '"Or you break it. You\'ve got powder in your pack. Don\'t think I haven\'t seen you carry it like eggs."',
  bram: '"Or you break it. Bram told you how a thing like that is fed. One trunk. Cut the trunk and it goes to sleep and doesn\'t wake."',
};

const TAM_NODES: Record<string, NodeDef> = {
  tam: {
    speaker: TAMSIN,
    text: [
      { if: F('a3_c9', 'opened'), text: 'Tamsin has her boots off and her feet too close to the fire, the way people sit who grew up without one. "They walked out," she says, without looking round. "Ola sat in the sun for an hour. Teague timed it, and then Teague sat down next to her." She pokes the fire with a stick. "Go on, then. It\'s the last night of something. Everybody keeps saying."' },
      { if: F('a3_c9', 'sealed'), text: 'Tamsin has her boots off and her feet too close to the fire, the way people sit who grew up without one. "The door held," she says, without looking round. "Fourth time. The fridge said no again, and this time somebody stood next to it." She pokes the fire with a stick. "Go on, then. It\'s the last night of something. Everybody keeps saying."' },
      { text: 'Tamsin has her boots off and her feet too close to the fire, the way people sit who grew up without one. She is looking up the steps into the dark, at the doors you can\'t see from here. "Go on, then," she says. "It\'s the last night of something. Everybody keeps saying."' },
    ],
    again: 'Tamsin, her feet to the fire, looking up the steps.',
    options: [
      { id: 'a3f.tam.ways', text: 'Tomorrow. What do you think I can do up there?', once: true, next: 'tam_w_plan' },
      { id: 'a3f.tam.line', text: 'What couldn\'t you stand to see me do?', once: true, next: 'tam_line' },
      { id: 'a3f.tam.r3', text: 'After the steps. What are we?', if: ALL(OPEN_N('tamsin'), F('tam_romance', 'together'), TAM_FREE), next: 'tam_r3' },
      { id: 'a3f.tam.ask', text: '(Sit closer.)', if: ALL(OPEN_N('tamsin'), F('tam_romance', 'open'), TAM_FREE), next: 'tam_ask' },
      { id: 'a3f.tam.friend', text: 'We\'re still the Grille, aren\'t we?', if: ALL(OPEN_N('tamsin'), ANY(NOT(TAM_ROM), NOT(TAM_FREE))), next: 'tam_friend' },
      BACK('tamsin'),
    ],
  },
  ...waysNodes('tamsin', {
    plan: 'She holds up a hand to count, Ilya\'s habit, and makes a face at herself. "Two doors up there that never shut. You put the sash on and do what the city wrote for you. Or you don\'t, and you walk back down these steps, and it finds somebody else to stand where you were standing." She drops the hand. "Walking down\'s always there. That\'s the one nobody tells you."',
    unwritten: bySrc((s) => `${tamMeans[s]} She looks up the steps. "No more forecasts, ever, for anybody. Nobody written down. I'd like that. I'd like it too much; that's the trouble with it. The city's water's on that machine too."`),
    concern: '"Or you sell it." Her mouth goes flat. "The Concern\'s paper\'s in your pack. You\'d have to wear the sash to sign it; they want the chair\'s name on it so nobody can ever tear it up. Then the hill knows everything that\'s going to happen to everybody, and owns it." She spits in the fire. "Rust it. Don\'t."',
    opensky: 'She sits up. "Or you read it out. All of it. Every name and every date, out of every radio from here to the Wet, so everybody knows what the city knows and it\'s worth nothing to anyone." She\'s grinning. "The fridge\'s page first. Sixty-one. Read out loud." The grin goes. "People will hear things about themselves they never wanted to. Some of them will do something about it. I know. I\'d still pick it."',
    part: '"The hill can talk to every radio now. I heard it go wide." She pulls a face. "Somebody would have to read the city\'s hand into it, all of it, and there\'d have to be people in the streets after who\'d keep their heads. I\'m only saying it\'s halfway to something."',
    amendment: 'Slower. "Or you wear it and change it. The Court\'s got your rulings in its book. You\'d be the forecast, the actual photograph, the chair at twenty-whatever, and you\'d write the rules it runs on." She looks at you a long time. "You\'d be good at it. That\'s what scares me."',
  }, 'She is counting on her fingers, and stops when she notices.', '(Go on.)'),
  tam_line: {
    speaker: TAMSIN,
    text: [
      { if: ALL(F('a3_c9', 'sealed'), NOT(F('ca_reserve', 'stayed'))), text: '"If you put it on." She doesn\'t make it a question. "They hand you a pen, and the first paper under it is the door. Reserve 9. The chair\'s first act; it\'s written on the order in your pack." She looks at you. "Don\'t sign it. Whatever else you sign up there. Don\'t make me stand in that door against you."' },
      { if: F('a3_c9', 'opened'), text: '"They walked out." She thinks about it. "Nobody carries people back into a hole they walked out of, not even the city. So it isn\'t that." She looks at you. "Don\'t become the thing that counted me. That\'s all. Wear what you like up there. Don\'t count people."' },
      { text: '"Don\'t count people," she says. "That\'s it. That\'s the whole of my list. Whatever you wear up there, don\'t do to anybody what it did to me."' },
    ],
    again: '"Don\'t count people," she says again, to the fire.',
    interject: [{ companion: ASH, text: '"Home is a weight," Ash says across the fire, to nobody in particular. "She carries hers the right way up."' }],
    options: [
      { id: 'a3f.tam.line.word', text: 'I won\'t. You have my word.', effects: [T(3), { set: 'a3_tamsin_word' }], next: 'tam_line_word' },
      { id: 'a3f.tam.line.true', text: 'I won\'t promise what I\'ll do up there. I don\'t know yet.', effects: [T(2)], next: 'tam_line_true' },
      { id: 'a3f.tam.line.mine', text: 'That\'s mine to decide, Tam.', effects: [T(-3)], next: 'tam_line_mine' },
    ],
  },
  tam_line_word: { speaker: TAMSIN, text: '"Okay." She nods once, like signing something. "I\'m writing it down. Not on the list. The other list. It\'s shorter."', again: 'She is writing it down, somewhere.', options: [TO('tamsin')] },
  tam_line_true: { speaker: TAMSIN, text: '"Good." She means it. "Everyone else would\'ve promised. Ines would\'ve promised and then decided for me." She pokes the fire. "Tell me the truth on the steps, then. I\'ll be right behind you."', again: '"Right behind you," she says.', options: [TO('tamsin')] },
  tam_line_mine: { speaker: TAMSIN, text: '"It is." She doesn\'t argue, which is worse. "Everybody always says that to me about something that\'s mine too."', again: 'She is looking at the fire, not at you.', options: [TO('tamsin')] },
  tam_r3: {
    speaker: TAMSIN,
    text: [
      { if: ALL(F('a3_shale', 'free'), F('ks_ada', 'stays')), text: tamAfter('Ada asked me to stand behind her for a year. In Shale. A star on me. Rust it. Deputy.') },
      { if: ALL(F('a3_shale', 'free'), F('ks_ada', 'dead')), text: tamAfter('Shale hasn\'t got a sheriff. Nobody wants it. I keep thinking somebody should.') },
      { if: ANY(ALLY('wheel'), { member: 'wheel' }), text: tamAfter('Sefa says the Wheel could use somebody who isn\'t scared of doors, or roads, or anything.') },
      { if: F('a3_c9', 'opened'), text: tamAfter('Somebody has to keep a door that opens. Knock\'s. I\'d be good at it. I\'d be unbearable.') },
      { text: tamAfter('I don\'t know where. That\'s the thing. Every after I ever had was the same room.') },
    ],
    again: '"What are we, after?" she asks again, quieter.',
    options: [
      { id: 'a3f.tam.r3.yes', text: 'Together. After the steps, and after that.', effects: [...LAST('tamsin', 'together'), T(5), { affection: { npc: TAMSIN, by: 10 } }, { decision: { id: 'a3_tamsin_last', text: 'The night before the steps, I told Tamsin we would be together after them.' } }], next: 'tam_r3_yes' },
      { id: 'a3f.tam.r3.unsure', text: 'I don\'t know yet. Ask me on the other side of the steps.', effects: NIGHT_HAD('tamsin'), next: 'tam_r3_unsure' },
      { id: 'a3f.tam.r3.no', text: 'I don\'t know what I\'ll be after it. Don\'t wait on me, Tam.', effects: [...LAST('tamsin', 'apart'), { set: 'tam_romance', value: 'stopped' }, { set: 'romance_partner', value: false }, { decision: { id: 'a3_tamsin_last', text: 'The night before the steps, I told Tamsin not to wait on me.' } }], next: 'tam_r3_no' },
    ],
  },
  tam_r3_yes: { speaker: TAMSIN, text: '"Together." She tries that one out too. "Okay. Good word." She puts her hand on the stone between you, palm up, the way it used to come through the holes in the Grille, and this time she doesn\'t have to wait. Much later, half asleep against you: "Tell me what the sky\'s doing." It\'s clear, and the city keeps it from being properly dark, and you tell her so. "Write it down," she says, and sleeps.', again: 'She is asleep against you.', options: [BACK('tamsin')] },
  tam_r3_unsure: { speaker: TAMSIN, text: '"Okay. The other side of the steps." She takes your hand anyway, and keeps it. "Riddles keep. You taught me that."', again: 'She has your hand.', options: [BACK('tamsin')] },
  tam_r3_no: { speaker: TAMSIN, text: '"Okay." She keeps looking at the fire. "Thanks for saying it to my face. Tonight of all nights." After a while: "We\'re still the Grille. That doesn\'t stop." She means it, and it costs her, and she pays it.', again: '"Still the Grille," she says.', options: [BACK('tamsin')] },
  tam_ask: {
    speaker: TAMSIN,
    text: '"No rain tonight." She looks up at the dark over the close, which the city\'s lamps keep from being properly dark. "I wanted it to rain. I was going to ask in the rain." She looks at you. "I\'m asking anyway. I always ask. You can say no, and I\'ll still be at the bottom of those steps in the morning, being annoying. Can I?"',
    again: '"I asked," she says. "You can still say no."',
    options: [
      { id: 'a3f.tam.ask.yes', text: 'Yes.', effects: [{ set: 'tam_romance', value: 'together' }, T(5), { affection: { npc: TAMSIN, by: 15 } }, { decision: { id: 'tam_together', text: 'Tamsin asked, the night before the steps, and I said yes.' } }], next: 'tam_ask_yes' },
      { id: 'a3f.tam.ask.not', text: 'Not tonight, Tam. Ask me after.', effects: [{ set: 'tam_r2_later' }, ...NIGHT_HAD('tamsin')], next: 'tam_ask_not' },
      { id: 'a3f.tam.ask.no', text: 'No, Tam.', effects: [...LAST('tamsin', 'apart'), { set: 'tam_romance', value: 'declined' }, { set: 'romance_partner', value: false }], next: 'tam_ask_no' },
    ],
  },
  tam_ask_yes: { speaker: TAMSIN, text: '"Good," she says, close enough that you feel it more than hear it, and then neither of you says anything for a long while, and the fire does what it likes. Much later, her head on your shoulder: "There\'s a thing I was saving to ask after. I\'m asking it now. I don\'t trust after."', again: 'Her head is on your shoulder.', options: [{ text: '(Ask it.)', next: 'tam_r3' }] },
  tam_ask_not: { speaker: TAMSIN, text: '"Okay." And it is; you can hear that it is. "After, then. I\'ll be there." She tips her face up at the dark as if it might rain anyway.', again: 'She is watching the dark for rain.', options: [BACK('tamsin')] },
  tam_ask_no: { speaker: TAMSIN, text: '"Okay." She keeps her face up to the dark a while longer, so you can\'t see it. "Thanks for saying it to my face. People mostly don\'t." When she looks back at the fire she is herself again, and she doesn\'t make you pay for it.', again: 'She is herself again.', options: [BACK('tamsin')] },
  tam_friend: {
    speaker: TAMSIN,
    text: '"The Grille." She grins, the chipped tooth. "Still. Always." She lies back on the stone with her hands behind her head. "My turn. I\'ll tell you what the sky\'s doing." She does: the city\'s glow on the haze, two lamps out on the Crown\'s glass, something moving up there that might be a satellite or might be a bird that doesn\'t know it\'s night. She gets most of it wrong and none of it boring.',
    again: 'She is still telling you what the sky is doing.',
    interject: [{ companion: KES, text: '"That\'s a satellite," Kes says. "Obviously." "It\'s a bird," Tamsin says. "It\'s a bird with a satellite in it." Kes considers this, and lets her have it.' }],
    options: [{ id: 'a3f.tam.friend.end', text: '(Listen till she runs out.)', effects: [...LAST('tamsin', 'none'), T(3)], next: 'tam_friend_end' }],
  },
  tam_friend_end: { speaker: TAMSIN, text: '"That\'s what it\'s doing," she says at last. "Write it down." She puts her hand flat on the stone between you, palm up, and you put yours on it, and that is all, and it is plenty.', again: 'Her hand on the stone, palm up.', options: [BACK('tamsin')] },
  tam_list_r: {
    speaker: TAMSIN,
    text: 'She doesn\'t sit down. She has a scrap of paper, folded small and soft with handling, and she unfolds it so you can see: a list of names in her square hand. Ines. Teague. A Tollman whose name she never knew. The last line is fresh, and it is you. "Twice," she says. "I keep a list. I\'ve kept it since I was six." She folds it. "So we\'re done. The other thing. Tonight of all nights; I know. I\'m still going up those steps behind you. But that\'s done."',
    again: 'The list is folded away. She doesn\'t take it out again.',
    effects: [{ set: 'tam_listed' }, { set: 'tam_romance', value: 'ended' }, { set: 'romance_partner', value: false }, T(-10), ...LAST('tamsin', 'apart'), { decision: { id: 'tam_listed', text: 'I lied to Tamsin twice. I am on her list, and what was between us is over.' } }],
    options: [{ text: '(There is nothing to say.)', next: 'tam' }],
  },
  tam_list: {
    speaker: TAMSIN,
    text: 'She doesn\'t sit down. She has a scrap of paper, folded small and soft with handling, and she unfolds it so you can see: a list of names in her square hand. Ines. Teague. A Tollman whose name she never knew. The last line is fresh, and it is you. "Twice," she says. "I keep a list. I\'ve kept it since I was six." She folds it. "That\'s all. I wanted you to know where you are, before the steps."',
    again: 'The list is folded away. She doesn\'t take it out again.',
    effects: [{ set: 'tam_listed' }, T(-10), { decision: { id: 'tam_listed', text: 'I lied to Tamsin twice. I am on her list.' } }],
    options: [{ text: '(There is nothing to say.)', next: 'tam' }],
  },
};

// ---------------------------------------------------------------- Wren

const W = (by: number) => A(WREN, by);
const W_FREE = FREE('wren');
const W_ON = ROM_ON.wren;
const W_COMMIT: Effect[] = [{ set: 'wren_rom', value: 'committed' }, { set: 'romance_partner', value: WREN }, W(5), ...LAST('wren', 'together'), { decision: { id: 'wren_committed', text: 'The night before the steps, I told Wren it was a stop.' } }];
const W_NO: Effect[] = [{ set: 'wren_rom', value: 'no' }, { set: 'romance_partner', value: false }, ...LAST('wren', 'apart')];
const wrenMeans: Record<Src, string> = {
  petra: '"Petra\'s people came up the road behind you for one thing."',
  choir: '"The Choir would carry the lamp."',
  ash: '"Ash would stand in the door while you did it."',
  charge: '"There\'s powder in your pack. You walk like it."',
  bram: '"The trunk the Cistern man told you about. One cable."',
};

const WREN_NODES: Record<string, NodeDef> = {
  wren: {
    speaker: WREN,
    text: 'Wren has her back to the fire, which is how she sits at every fire: facing out, at the four ways onto the close. "Wardens change at two," she says. "Lamp by the lane\'s been out since dusk. Nobody\'s come to see to it." She glances round. "Old habit. Sit."',
    again: 'Wren, back to the fire, watching the four ways in.',
    options: [
      { id: 'a3f.wren.ways', text: 'Tomorrow. What roads are open, up there?', once: true, next: 'wren_w_plan' },
      { id: 'a3f.wren.line', text: 'What won\'t you walk beside?', once: true, next: 'wren_line' },
      { id: 'a3f.wren.last', text: 'A route or a stop. Is it still the stop?', if: ALL(OPEN_N('wren'), F('wren_rom', 'committed'), W_FREE), next: 'wren_last' },
      { id: 'a3f.wren.r3', text: '(Sit with your shoulder against hers.)', if: ALL(OPEN_N('wren'), F('wren_rom', 'roof'), W_FREE), next: 'wren_r3' },
      { id: 'a3f.wren.roof', text: '(Follow her eyes up to the scaffold on the steps.)', if: ALL(OPEN_N('wren'), ANY(F('wren_rom', 'yes'), F('wren_rom', 'later_roof')), W_FREE), next: 'wren_roof' },
      { id: 'a3f.wren.other', text: '(Sit with her.)', if: ALL(OPEN_N('wren'), W_ON, NOT(W_FREE)), next: 'wren_other' },
      { id: 'a3f.wren.friend', text: '(Sit with her and watch the ways in.)', if: ALL(OPEN_N('wren'), NOT(W_ON)), next: 'wren_friend' },
      BACK('wren'),
    ],
  },
  ...waysNodes('wren', {
    plan: '"Two roads up there that are always open." She doesn\'t take her eyes off the lane. "Wear it and sign. Or don\'t, and walk back down. The second\'s the long way round. Most good routes are."',
    unwritten: bySrc((s) => `${wrenMeans[s]} "Bring it down. Short route. No forecasts after, for anyone. No rope." A pause. "No drains either, inside a year. That's the toll on that road."`),
    concern: '"The Concern\'s man, with his paper." She doesn\'t turn round. "You know what I\'ll say. That\'s a road I don\'t walk."',
    opensky: 'She thinks about it the way she thinks about a road at night. "Read it out. All of it, from the hill, to every radio. My name\'s on it, and the girl\'s, and everybody\'s." A breath. "Everyone hears the rope at once, and then nobody owns it. Not them. Not me. The first night\'ll be bad. You\'d want people on the streets who don\'t run."',
    part: '"The hill can shout now." She heard it too. "Shouting needs somebody who reads the city\'s hand, and a street that won\'t burn when it hears."',
    amendment: 'Flat. "Wear it and rewrite it. You\'d be the rope\'s keeper. You\'d have to cut it every year, with your own hand, for the rest of your life." She glances round. "Some people could. I don\'t know if you\'re one."',
  }, 'Wren, watching the lane, listing roads.', '(Go on.)'),
  wren_line: {
    speaker: WREN,
    text: [
      { if: ROPE_OPEN, text: '"Two things." She counts them on the burned hand. "Sell it to the Concern and I walk out of that vault and I don\'t look back." Second finger. "And the rope. R31. It\'s still on their board for me. If you put that sash on and sign their schedule, you sign that too. I\'ll not sleep beside the rope."' },
      { text: '"One thing." She holds up the burned hand. "Sell it to the Concern and I walk out of that vault and I don\'t look back. They own the girl\'s kind of paper. They\'d own the rest." She puts the hand away. "The rest you\'ll do how you do it. I\'ve watched how you do it."' },
    ],
    again: 'She has put the burned hand away.',
    interject: [
      { companion: NINE, if: ROPE_OPEN, text: '"For the record," Nine says, "R31 is still on the schedule. I would prefer it were not read."' },
      { companion: ODILE, text: '"She means paper, my dear," Odile says, very quietly. "The kind I used to write."' },
    ],
    options: [
      { id: 'a3f.wren.line.word', text: 'I won\'t sell it. My word.', effects: [W(3), { set: 'a3_wren_word' }], next: 'wren_line_word' },
      { id: 'a3f.wren.line.honest', text: 'I won\'t give you a word I might not keep.', effects: [W(3)], next: 'wren_line_honest' },
      { id: 'a3f.wren.line.mine', text: 'It\'s my road to choose.', effects: [W(-3)], next: 'wren_line_mine' },
    ],
  },
  wren_line_word: { speaker: WREN, text: '"It\'s said." She nods once. That is the whole of it, with Wren, and it is a great deal.', again: '"It\'s said."', options: [TO('wren')] },
  wren_line_honest: { speaker: WREN, text: '"Good." She almost smiles at the lane. "Nobody ever told me what they could pay for. You keep doing it."', again: 'She is almost smiling at the lane.', options: [TO('wren')] },
  wren_line_mine: { speaker: WREN, text: '"It is." Flat. "And mine\'s mine."', again: '"Mine\'s mine," she says.', options: [TO('wren')] },
  wren_last: {
    speaker: WREN,
    text: [
      { if: ROPE_OPEN, text: '"Still the stop." She doesn\'t turn round. "I said a route or a stop, and you said, and I\'ve not changed it." The burned hand finds yours on the stone without her looking. "If it goes wrong up there, it\'s the rope for me in R31, and I\'d want tonight to be the last thing I had. So. Tonight, and after, if there\'s an after. Say if you don\'t."' },
      { text: '"Still the stop." She doesn\'t turn round. "I said a route or a stop, and you said, and I\'ve not changed it." The burned hand finds yours on the stone without her looking. "Tonight, and after, if there\'s an after. Say if you don\'t."' },
    ],
    again: '"Say if you don\'t," she says again.',
    options: [
      { id: 'a3f.wren.last.yes', text: 'Tonight, and after.', effects: [W(5), ...LAST('wren', 'together'), { decision: { id: 'a3_wren_last', text: 'The night before the steps, I told Wren: tonight, and after.' } }], next: 'wren_last_yes' },
      { id: 'a3f.wren.last.no', text: 'Don\'t stop for me, Wren. Not on my account.', effects: [...W_NO, { decision: { id: 'a3_wren_last', text: 'The night before the steps, I told Wren not to stop for me.' } }], next: 'wren_last_no' },
    ],
  },
  wren_last_yes: { speaker: WREN, text: 'She turns round, finally, and puts her back to the ways in, which she has never once done at a fire. "Then somebody else can watch the lane," she says. Later, her goggles off on the stone beside you, she sleeps with the burned hand flat on your chest, and does not dream, or does not say.', again: 'She is asleep, her back to the ways in.', options: [BACK('wren')] },
  wren_last_no: { speaker: WREN, text: '"Right." It costs her; she keeps her face on the lane so it costs her in private. "It was a good stop." She stays at the fire all night, back to it, and in the morning she is exactly Wren.', again: 'She is watching the lane.', options: [BACK('wren')] },
  wren_r3: {
    speaker: WREN,
    text: '"Route or a stop." She says it to the lane. "I\'ve been on routes since I was six. Perpetua carried me down a stair and I\'ve been walking since." Her shoulder stays against yours. "I\'d like a stop. Here, or wherever after. Say if it isn\'t."',
    again: '"Say if it isn\'t," she says.',
    options: [
      { id: 'a3f.wren.r3.yes', text: 'It\'s a stop.', if: W_FREE, effects: W_COMMIT, next: 'wren_last_yes' },
      { id: 'a3f.wren.r3.no', text: 'It isn\'t that, Wren.', effects: W_NO, next: 'wren_r3_no' },
    ],
  },
  wren_r3_no: { speaker: WREN, text: '"Kind of you to say it straight." She doesn\'t move her shoulder away, not straight off. "Most people let you find out on the road."', again: 'Her shoulder, still against yours, for now.', options: [BACK('wren')] },
  wren_roof: {
    speaker: WREN,
    text: [
      { if: ROPE_OPEN, text: '"The works on the steps." She has seen you looking. "Nobody counts the planks at night. I could get us up there in two minutes and the wardens wouldn\'t look; they never look up." She pulls her goggles down round her neck. "I\'ve had a dream since I was twelve. I want to say it out loud somewhere high, once, with you there. Say if you don\'t want that."' },
      { text: '"The works on the steps." She has seen you looking. "Nobody counts the planks at night. I could get us up there in two minutes and the wardens wouldn\'t look; they never look up." She pulls her goggles down round her neck. "I had a dream since I was twelve. I don\'t have it now. I want to say it out loud somewhere high, once, with you there, so it knows it\'s done. Say if you don\'t want that."' },
    ],
    again: '"Say if you don\'t," she says.',
    options: [
      { id: 'a3f.wren.roof.yes', text: 'I want that.', effects: [{ set: 'wren_rom', value: 'roof' }, W(10), { decision: { id: 'wren_roof', text: 'I went up the scaffold on the Spire\'s steps with Wren, the night before them, and stayed.' } }], next: 'wren_roof_yes' },
      { id: 'a3f.wren.roof.not', text: 'Not tonight, Wren.', effects: NIGHT_HAD('wren'), next: 'wren_roof_not' },
      { id: 'a3f.wren.roof.no', text: 'No, Wren.', effects: W_NO, next: 'wren_roof_no' },
    ],
  },
  wren_roof_yes: {
    speaker: WREN,
    text: 'The scaffold\'s top boards, R30 stencilled on every one, and the whole close under you: the fire, the warden, the dark lane. She takes her goggles off and says the dream, all of it, flat, the way she reads a road: the booth, the street, her own boots and how far off the ground they are, and the girl\'s face in the crowd. "And then I wake up." She is quiet a long time. Then she kisses you like somebody who has decided, and the planks are cold, and neither of you minds. Before light, lying on the boards: "A route or a stop?"',
    again: 'The top boards of the scaffold, and the light not up yet.',
    options: [{ text: '(Answer her.)', next: 'wren_r3' }],
  },
  wren_roof_not: { speaker: WREN, text: '"Fine." She means it. "The planks\'ll be there. So will I." She goes back to watching the lane.', again: 'She is watching the lane.', options: [BACK('wren')] },
  wren_roof_no: { speaker: WREN, text: '"Clear." She nods. "Thanks for saying it plain." She doesn\'t look at the scaffold again, and she doesn\'t make you pay for it.', again: 'She doesn\'t look at the scaffold.', options: [BACK('wren')] },
  wren_other: {
    speaker: WREN,
    text: '"You\'ve got somebody." It isn\'t a question. "Good. I keep my word and I hold people to theirs, and you\'ve given yours." She shifts along the stone to make room anyway. "Sit. Watch the lane with me. That I\'ll have."',
    again: 'She has made room on the stone.',
    effects: [{ set: 'wren_rom', value: 'no' }, ...LAST('wren', 'apart')],
    options: [BACK('wren')],
  },
  wren_friend: {
    speaker: WREN,
    text: [
      { if: ANY(F('nb_sable_outcome', 'freed'), F('nb_sable_torn')), text: '"The girl wrote." She has a letter in her coat, and she doesn\'t take it out; she knows it. "Somebody on a barge wrote it for her. She\'s learning knots. She says the river doesn\'t go where the map says." Wren nearly smiles. "Then she gets onto routes, and I\'ve got to listen, because I made her." She tells you the long version of a road out of the city instead: four ways off the close, which lamps are out, where the wall is low.' },
      { text: '"I\'ve been working out the ways off the close." Of course she has. She tells you, the long version: four ways out, which lamps are out, where the Wall is low, the culvert, the bridge, which warden sleeps. It takes an hour. It is the most you have ever heard her say.' },
    ],
    again: 'She is on the third way off the close.',
    interject: [{ companion: ILYA, text: '"Four hundred paces from the lane lamp to the Wall," Ilya says, not looking up. "I counted." "Four hundred and twelve," Wren says. "Right," says Ilya.' }],
    options: [{ id: 'a3f.wren.friend.end', text: '(Listen to the long version.)', effects: [...LAST('wren', 'none'), W(2)], next: 'wren_friend_end' }],
  },
  wren_friend_end: { speaker: WREN, text: '"That\'s the routes." She looks at you sideways. "You listened to all of it. Nobody does." She goes back to the lane. "If it goes wrong tomorrow, the second way. Under the lamp that\'s out."', again: '"The second way," she says. "Under the lamp that\'s out."', options: [BACK('wren')] },
  wren_rom_end: {
    speaker: WREN,
    text: '"I\'m sleeping that side of the fire." Her bedroll is already there. "I keep a count. You know I do. It\'s been going the wrong way for a while." She doesn\'t raise her voice. "I\'ll go up the steps with you. I said I would. I\'ll not lie down next to it."',
    again: 'Her bedroll is on the far side of the fire.',
    effects: [{ set: 'wren_rom', value: 'ended' }, ...LAST('wren', 'apart'), { decision: { id: 'wren_rom_ended', text: 'Wren ended it, at the fire before the steps. She keeps a count.' } }],
    options: [
      { text: '(Let her.)', if: F('romance_partner', WREN), effects: [{ set: 'romance_partner', value: false }], next: 'wren' },
      { text: '(Let her.)', if: NOT(F('romance_partner', WREN)), next: 'wren' },
    ],
  },
};

// ---------------------------------------------------------------- Ilya

const I = (by: number) => A(ILYA, by);
const I_FREE = FREE('ilya');
const I_ON = ROM_ON.ilya;
const I_COMMIT: Effect[] = [{ set: 'ilya_rom', value: 'committed' }, { set: 'romance_partner', value: ILYA }, I(5), ...LAST('ilya', 'together'), { decision: { id: 'ilya_committed', text: 'The night before the steps, I told Ilya there would be an after, and that I would be in it with him.' } }];
const I_NO: Effect[] = [{ set: 'ilya_rom', value: 'no' }, { set: 'romance_partner', value: false }, ...LAST('ilya', 'apart')];
const ilyaMeans: Record<Src, string> = { petra: 'Petra\'s people would.', choir: 'The Choir would.', ash: 'Ash would hold the door.', charge: 'You\'ve the powder.', bram: 'The trunk the Cistern man told of.' };

const ILYA_NODES: Record<string, NodeDef> = {
  ilya: {
    speaker: ILYA,
    text: [
      { if: { flag: 'ilya_sober_days', gte: 100 }, text: 'Ilya sits with his back to the steps and the long rifle across his knees, counting the close\'s lamps under his breath. "Fourteen. Two out." He doesn\'t count his days aloud any more; you noticed when he stopped. "Sit. Right."' },
      { if: ILYA_SOBER, text: 'Ilya sits with his back to the steps and the long rifle across his knees, counting the close\'s lamps under his breath. "Fourteen. Two out." He doesn\'t look at you. "Sober. Before you ask. Every day of it counted. Sit."' },
      { if: F('ilya_relapse'), text: 'Ilya sits with his back to the steps and the long rifle across his knees, counting under his breath, and the number he is counting is small, and he says it anyway. "Starting again counts. Right. Sit."' },
      { text: 'Ilya sits with his back to the steps and the long rifle across his knees, counting the close\'s lamps under his breath. "Fourteen. Two out." He doesn\'t look at you. "Sit. Right."' },
    ],
    again: 'Ilya, counting the lamps under his breath.',
    options: [
      { id: 'a3f.ilya.ways', text: 'Count tomorrow for me.', once: true, next: 'ilya_w_plan' },
      { id: 'a3f.ilya.line', text: 'What would make you go?', once: true, next: 'ilya_line' },
      { id: 'a3f.ilya.last', text: 'If there\'s an after.', if: ALL(OPEN_N('ilya'), F('ilya_rom', 'committed'), I_FREE, ILYA_SOBER), next: 'ilya_last' },
      { id: 'a3f.ilya.r3', text: '(Sit on the step beside him, close.)', if: ALL(OPEN_N('ilya'), F('ilya_rom', 'well'), I_FREE, ILYA_SOBER), next: 'ilya_r3' },
      { id: 'a3f.ilya.nowell', text: '(Sit on the step beside him, close.)', if: ALL(OPEN_N('ilya'), ANY(F('ilya_rom', 'yes'), F('ilya_rom', 'later_well')), I_FREE, ILYA_SOBER), next: 'ilya_nowell' },
      { id: 'a3f.ilya.counting', text: '(Sit on the step beside him, close.)', if: ALL(OPEN_N('ilya'), I_ON, I_FREE, NOT(ILYA_SOBER)), next: 'ilya_counting' },
      { id: 'a3f.ilya.other', text: '(Sit with him.)', if: ALL(OPEN_N('ilya'), I_ON, NOT(I_FREE)), next: 'ilya_other' },
      { id: 'a3f.ilya.friend', text: '(Sit with him. Let him count.)', if: ALL(OPEN_N('ilya'), NOT(I_ON)), next: 'ilya_friend' },
      BACK('ilya'),
    ],
  },
  ...waysNodes('ilya', {
    plan: '"One." He holds up a finger of the good hand. "Wear it. Sign. Two. Don\'t. Walk back down the steps." He lowers the hand. "Those two are always there. Right."',
    unwritten: bySrc((s) => `"Three." Another finger. "Bring it down. ${ilyaMeans[s]} Nothing timed again. Nobody's raid on anybody's schedule." He looks at the brass standpipe on the close. "The city's water stops inside a year. Count that too."`),
    concern: counted('concern', (n) => `"${n}. Sell it to the hill." He doesn't say anything for a while. "I'd not watch. Right."`),
    opensky: counted('opensky', (n) => `"${n}. Read it out. Every name." He turns the ruined hand over. "Agi's. Read out on every radio, what they wrote for her and when." A long breath. "Right. I'd stand in the street for that."`),
    part: '"Not a number yet." He nods east, where the relay goes. "The hill can talk. You\'d want a reader, and a street that holds. Then it\'s a number."',
    amendment: counted('amendment', (n) => `"${n}. Wear it and change what it says." He nearly smiles. "That's the long count. Years. Right."`),
  }, 'Ilya, counting on his fingers.', '(Let him count.)'),
  ilya_line: {
    speaker: ILYA,
    text: '"The Plan timed Agi\'s night." He says it plainly; he has had a long time to learn how. "If you put on its sash and sit in its chair and sign its book, I\'ll say right. And I\'ll go." A pause. "And if you sell it to the hill, I\'ll stay to watch, because somebody ought to. But I\'ll not lie down next to it."',
    again: '"I\'ll say right," he says. "And I\'ll go."',
    interject: [{ companion: ASH, text: '"He counts what he can carry," Ash says across the fire. "A man ought to know that number."' }],
    options: [
      { id: 'a3f.ilya.line.word', text: 'I won\'t sit in that chair. You have my word.', effects: [I(3), { set: 'a3_ilya_word' }], next: 'ilya_line_word' },
      { id: 'a3f.ilya.line.honest', text: 'I don\'t know yet, Ilya.', effects: [I(2)], next: 'ilya_line_honest' },
      { id: 'a3f.ilya.line.chair', text: 'You\'d leave over a chair?', next: 'ilya_line_chair' },
    ],
  },
  ilya_line_word: { speaker: ILYA, text: '"Right." It means one thing, this time, and he lets you hear which.', again: '"Right."', options: [TO('ilya')] },
  ilya_line_honest: { speaker: ILYA, text: '"Right. Better than a promise." He goes back to the lamps. "Fifteen. Somebody lit one."', again: 'He is counting lamps.', options: [TO('ilya')] },
  ilya_line_chair: { speaker: ILYA, text: '"Over that chair." He doesn\'t raise his voice. "It sat somebody down eleven springs ago and wrote: the healer, the dark of the moon, the store. Somebody sat in it and read that and said right." He looks at you. "I\'d not stand next to the next one."', again: 'He is looking at the steps.', options: [TO('ilya')] },
  ilya_last: {
    speaker: ILYA,
    text: '"No well here." He nods at the brass standpipe on the close, the city\'s mark on its tap. "The city pipes it and counts it by the cup." He turns his ruined hand over. "If there\'s an after, there\'s a well in it. Somebody\'s mornings. A bucket." He looks at you. "Still that? You can say it isn\'t. Right."',
    again: '"Still that?" he asks again.',
    options: [
      { id: 'a3f.ilya.last.yes', text: 'There\'s a well in it. And me.', effects: [I(5), ...LAST('ilya', 'together'), { decision: { id: 'a3_ilya_last', text: 'The night before the steps, I told Ilya there was a well in the after, and me.' } }], next: 'ilya_last_yes' },
      { id: 'a3f.ilya.last.no', text: 'Don\'t count on an after, Ilya.', effects: [...I_NO, { decision: { id: 'a3_ilya_last', text: 'The night before the steps, I told Ilya not to count on an after.' } }], next: 'ilya_last_no' },
    ],
  },
  ilya_last_yes: { speaker: ILYA, text: '"Right." A whole sentence. He puts the rifle down, which he does not do at fires, and sits with his shoulder against yours until the close\'s lamps go off at dawn, and he doesn\'t count them.', again: 'His shoulder against yours, and the rifle on the stone.', options: [BACK('ilya')] },
  ilya_last_no: { speaker: ILYA, text: '"Right." It costs him; he pays it. "It was good to count, for a while." He picks the rifle up again, and goes back to the lamps.', again: 'He is counting the lamps.', options: [BACK('ilya')] },
  ilya_r3: {
    speaker: ILYA,
    text: '"I stopped saying the number." He has noticed you noticed. "Somewhere. I don\'t know which day." He looks worried about it, and then not. "If there\'s an after, I\'d like to be in it with you. You can say it isn\'t that. Right."',
    again: 'He is waiting, and will take either answer.',
    options: [
      { id: 'a3f.ilya.r3.yes', text: 'It\'s that.', if: I_FREE, effects: I_COMMIT, next: 'ilya_last_yes' },
      { id: 'a3f.ilya.r3.no', text: 'It isn\'t that, Ilya.', effects: I_NO, next: 'ilya_last_no' },
    ],
  },
  ilya_nowell: {
    speaker: ILYA,
    text: '"Not here." He says it before you have said anything. "Not in this city. There\'s no water here I\'d remember her by; it comes out of a pipe the Ledger counts." He looks at the standpipe. "Shale has a well. Openfield. The pumps on the salt road. If there\'s a day before the steps and a well in it, ask me there." A shrug. "If there isn\'t, then I counted something good, and it stays counted."',
    again: '"A well," he says. "Not a pipe."',
    effects: NIGHT_HAD('ilya'),
    options: [BACK('ilya')],
  },
  ilya_counting: {
    speaker: ILYA,
    text: '"Not while I\'m counting from one." He doesn\'t look away; that would be a kind of lie. "You know the rule. I made it. Ask me when it\'s a bigger number. I\'ll still be here."',
    again: '"A bigger number," he says.',
    effects: NIGHT_HAD('ilya'),
    options: [BACK('ilya')],
  },
  ilya_other: {
    speaker: ILYA,
    text: '"Right." He moves the rifle so you can sit. "Somebody else counts with you now. Good." He means it, which is the hard part. "Sit anyway. I\'ll do the lamps."',
    again: 'He is doing the lamps.',
    effects: [{ set: 'ilya_rom', value: 'no' }, ...LAST('ilya', 'apart')],
    options: [BACK('ilya')],
  },
  ilya_friend: {
    speaker: ILYA,
    text: [
      { if: F('ilya_after', 'shale'), text: '"Count with me." He does the lamps, the wardens, the windows lit up in the Crown\'s glass. "A hundred and six." He looks at you. "Ada\'d have me back. Drilling boys at dawn. I said I could stand that. Right."' },
      { if: F('ilya_after', 'road'), text: '"Count with me." He does the lamps, the wardens, the windows lit up in the Crown\'s glass. "A hundred and six." He looks at you. "Somebody has to tell you where the wind is. After. Right."' },
      { text: '"Count with me." He does the lamps, the wardens, the windows lit up in the Crown\'s glass. "A hundred and six." He looks at you. "After, I don\'t know. Nothing\'s allowed now. Right."' },
    ],
    again: 'He is counting the Crown\'s windows.',
    interject: [{ companion: TAMSIN, text: '"Forty-one fence posts," Tamsin says from across the fire. "He said right." "It was forty-two," Ilya says. "I didn\'t want to tell you."' }],
    options: [{ id: 'a3f.ilya.friend.end', text: '(Count with him.)', effects: [...LAST('ilya', 'none'), I(2)], next: 'ilya_friend_end' }],
  },
  ilya_friend_end: { speaker: ILYA, text: 'You count with him: the lamps, the windows, a warden\'s pipe glowing on the lane. Somewhere past two hundred he stops, mid-number, and doesn\'t start again. "Right," he says, to nothing, and it sounds like rest.', again: 'He has stopped counting.', options: [BACK('ilya')] },
  ilya_rom_end: {
    speaker: ILYA,
    text: '"Take the watch with somebody else tonight." He says it to the dark. "I count what\'s good for me now. You haven\'t been, lately." He doesn\'t list it. He doesn\'t need to. "I\'ll go up the steps. I said I would."',
    again: 'He is facing the dark.',
    effects: [{ set: 'ilya_rom', value: 'ended' }, ...LAST('ilya', 'apart'), { decision: { id: 'ilya_rom_ended', text: 'Ilya ended it, at the fire before the steps. He counts what is good for him now.' } }],
    options: [
      { text: '(Let him.)', if: F('romance_partner', ILYA), effects: [{ set: 'romance_partner', value: false }], next: 'ilya' },
      { text: '(Let him.)', if: NOT(F('romance_partner', ILYA)), next: 'ilya' },
    ],
  },
};

// ---------------------------------------------------------------- Kes

const K = (by: number) => A(KES, by);
const K_FREE = FREE('kes');
const K_ON = ROM_ON.kes;
const K_CUT: Cond = F('kes_link', 'cut');
const K_COMMIT: Effect[] = [{ set: 'kes_rom', value: 'committed' }, { set: 'romance_partner', value: KES }, K(5), ...LAST('kes', 'together'), { decision: { id: 'kes_committed', text: 'The night before the steps, I told Kes we were a thing, out loud.' } }];
const K_NO: Effect[] = [{ set: 'kes_rom', value: 'no' }, { set: 'romance_partner', value: false }, ...LAST('kes', 'apart')];
const kesMeans: Record<Src, string> = {
  petra: 'Petra\'s lot want to.', choir: 'The Choir would cheer.', ash: 'Ash would hold the door.', charge: 'You\'ve got powder; I can smell it.', bram: 'Couriers and one trunk; your Cistern man said.',
};
/** Her opener: the scar if the link was cut; else the cable, and (numbed at Knock, which only a kept link can be) her other
 * hand at her neck, shown and not explained. */
const kesOpen = (numbed: boolean, cut: boolean) => (cut
  ? 'Kes is on the lowest step with her collar open to the fire, the scar at her nape pink in the light. "Every lens on this close turns when you walk past," she says. "Obviously I can\'t do anything about it now. I just watch them do it."'
  : 'Kes is on the lowest step with the cable round her fingers, and every lens on the close has its shutter down. "Obviously that was me," she says. "They\'ll put it down to the damp."'
  + (numbed ? ' Her other hand keeps going to the back of her neck. It has since Knock. She doesn\'t mention it, and she doesn\'t let go of the cable.' : ''));

const KES_NODES: Record<string, NodeDef> = {
  kes: {
    speaker: KES,
    text: [
      { if: ALL(KES_NUMBED, NOT(K_CUT)), text: kesOpen(true, false) },
      { if: K_CUT, text: kesOpen(false, true) },
      { text: kesOpen(false, false) },
    ],
    again: 'Kes, on the lowest step, the cable round her fingers.',
    options: [
      { id: 'a3f.kes.ways', text: 'Tomorrow. What can I actually do up there?', once: true, next: 'kes_w_plan' },
      { id: 'a3f.kes.line', text: 'What would you walk out over?', once: true, next: 'kes_line' },
      { id: 'a3f.kes.slack', text: 'Slack. What does it mean now?', once: true, next: 'kes_slack' },
      { id: 'a3f.kes.last', text: 'Tomorrow. Are we still a thing?', if: ALL(OPEN_N('kes'), F('kes_rom', 'committed'), K_FREE), next: 'kes_last' },
      { id: 'a3f.kes.r3', text: '(Sit on the step beside her.)', if: ALL(OPEN_N('kes'), F('kes_rom', 'dark'), K_FREE), next: 'kes_r3' },
      { id: 'a3f.kes.hour', text: '(Sit on the step beside her.)', if: ALL(OPEN_N('kes'), ANY(F('kes_rom', 'yes'), F('kes_rom', 'later_dark')), K_FREE), next: 'kes_hour' },
      { id: 'a3f.kes.other', text: '(Sit with her.)', if: ALL(OPEN_N('kes'), K_ON, NOT(K_FREE)), next: 'kes_other' },
      { id: 'a3f.kes.friend', text: '(Sit and let her talk about the gardens.)', if: ALL(OPEN_N('kes'), NOT(K_ON)), next: 'kes_friend' },
      BACK('kes'),
    ],
  },
  ...waysNodes('kes', {
    plan: '"Two you\'ve always got." Quick. "Sash on, sign what it hands you, and the Plan runs on schedule with your face on it. Sash off, walk down, and the Plan reroutes to whoever\'s standing behind you. Obviously it\'s got a spare. Everything they build has a spare."',
    unwritten: bySrc((s) => `"Brick it." She makes a small exploding noise. "${kesMeans[s]} No core, no forecasts, no schedule. Also no drains, no clinics, no city water inside a year. Nothing's free. Obviously."`),
    concern: 'She doesn\'t make a noise for this one. "Hand it to the hill. The transfer\'s in your pack; I can feel the seal on it hum when I stand close." She looks away. "You know where I stand on that."',
    opensky: 'She lights up. "Pipe it. Every forecast down the relay to the hill and out of every speaker in the Reach at once. The futures floor\'s worthless by breakfast. The Concern\'s prize is a box of yesterday\'s news." Then, honestly: "And people hear their own dates. Obviously that goes badly somewhere. It\'s still the best one."',
    part: '"The hill\'s lit wide. I\'d know." She taps her neck. "You\'d still need somebody who reads the city\'s hand, and people on the ground for the first night."',
    amendment: '"Patch it. Wear it, and push a change to the Ledger from inside." She whistles. "Nobody\'s ever pushed it a change. You\'d be the first. You\'d also be in that chair till you die, so."',
  }, 'Kes, running the options like a circuit.', '(Go on.)'),
  kes_line: {
    speaker: KES,
    text: '"Hand them the eyes and I\'m gone." Quick, flat, no "obviously". "The core. The Concern\'s already got the leash; it\'s in my neck and in half the Skirts. You give them the thing that sees, and there\'s nowhere left to stand where they can\'t." She winds the cable tight. "Anything else, I\'ll argue with you. That one I won\'t."',
    again: '"That one I won\'t," she says.',
    interject: [{ companion: ODILE, text: '"One never sells the same customer twice, my dear," Odile says, to her book. "She is quite right."' }],
    options: [
      { id: 'a3f.kes.line.word', text: 'I won\'t hand them the eyes. My word.', effects: [K(3), { set: 'a3_kes_word' }], next: 'kes_line_word' },
      { id: 'a3f.kes.line.honest', text: 'I won\'t promise you anything tonight.', effects: [K(2)], next: 'kes_line_honest' },
      { id: 'a3f.kes.line.mine', text: 'That\'s not your call, Kes.', effects: [K(-3)], next: 'kes_line_mine' },
    ],
  },
  kes_line_word: { speaker: KES, text: '"Good." She lets the cable go slack. "Obviously I believed you anyway. Obviously I\'m writing it in my log."', again: 'The cable has gone slack.', options: [TO('kes')] },
  kes_line_honest: { speaker: KES, text: '"Fair." She doesn\'t like it, and she likes that you said it. "Then I\'ll be watching your hands on the steps. I watch everything."', again: 'She is watching your hands.', options: [TO('kes')] },
  kes_line_mine: { speaker: KES, text: '"No. It\'s mine whether I stay." She says it lightly; it isn\'t light. "That\'s the only call I\'ve got. I\'m keeping it."', again: '"I\'m keeping it," she says.', options: [TO('kes')] },
  kes_slack: {
    speaker: KES,
    text: [
      { if: ALL(K_CUT, F('kes_fits')), text: '"Slack." She touches the scar. "Lev cut it and I got the fits with it. Two this month. They\'re mine, though. Nobody up the hill knows when I\'m going to fall over, which is more than they ever knew before." She grins, not much fun in it. "That\'s slack. It\'s not what I pictured. I\'d still pick it."' },
      { if: K_CUT, text: '"Slack." She touches the scar. "I wanted one day without them in my neck. I\'ve had every day since Lev. I still wait for the hour, out of habit, and then I remember every hour\'s mine." She listens to something that isn\'t there. "The grid used to hum. Now it\'s just wind."' },
      { if: F('kes_link', 'dark'), text: '"I\'m dark. All the time now. Up the hill they think I\'m dead, or in a ditch." She grins. "Slack isn\'t an hour any more. It\'s me. Obviously I\'m insufferable about it."' },
      { if: F('kes_link', 'kept'), text: '"Still an hour a night." She shrugs. "I kept it. My reasons. They can see me the other twenty-three." She looks up the steps. "If tomorrow goes the right way, maybe nobody looks down anybody\'s neck again. That\'d be slack for everyone."' },
      { text: '"Slack\'s an hour. Still." She winds the cable. "One day without them. That\'s all I ever asked for, and the hill still thinks it\'s a lot."' },
    ],
    again: 'She is listening to the wind, not the grid.',
    effects: [K(2)],
    options: [TO('kes')],
  },
  kes_last: {
    speaker: KES,
    text: '"So." She doesn\'t wind the cable. "Tomorrow we go up and you do the thing, whatever it is. And after, we\'re a thing, out loud, and I tell Rosa, and she pours me a free one and pretends she isn\'t pleased." She looks at you. "That\'s still what you want? You can say no. I\'d rather hear it tonight than on the steps."',
    again: '"Tonight, not on the steps," she says.',
    options: [
      { id: 'a3f.kes.last.yes', text: 'Still what I want.', effects: [K(5), ...LAST('kes', 'together'), { decision: { id: 'a3_kes_last', text: 'The night before the steps, I told Kes we were still a thing.' } }], next: 'kes_last_yes' },
      { id: 'a3f.kes.last.no', text: 'I can\'t promise you an after, Kes.', effects: [...K_NO, { decision: { id: 'a3_kes_last', text: 'The night before the steps, I told Kes I could not promise her an after.' } }], next: 'kes_last_no' },
    ],
  },
  kes_last_yes: { speaker: KES, text: '"Good." To the fire, then to you, then to the fire again, grinning. "Obviously. I knew." She didn\'t, and you both know it. She falls asleep on the step with her head on your knee and the cable still round her fingers, and every lens on the close stays shut all night.', again: 'She is asleep with her head on your knee.', options: [BACK('kes')] },
  kes_last_no: { speaker: KES, text: '"Fair." She doesn\'t look away, which is brave of her. "Then it was good. It was really good." She moves along the step a little. Not far.', again: 'She has moved along the step. Not far.', options: [BACK('kes')] },
  kes_r3: {
    speaker: KES,
    text: '"I don\'t do slow." She is very serious for once, which looks wrong on her. "And there isn\'t any slow left; it\'s tomorrow. So: are we a thing? A real one, out loud." She waits. "You can say no. I\'ll still be insufferable on the steps."',
    again: '"Are we a thing?"',
    options: [
      { id: 'a3f.kes.r3.yes', text: 'We\'re a thing. Out loud.', if: K_FREE, effects: K_COMMIT, next: 'kes_last_yes' },
      { id: 'a3f.kes.r3.no', text: 'I don\'t think I can be that.', effects: K_NO, next: 'kes_last_no' },
    ],
  },
  kes_hour: {
    speaker: KES,
    text: [
      { if: K_CUT, text: 'She pulls her collar down. Where the port was there is a puckered scar and Lev\'s neat stitches. "I don\'t have to steal an hour any more," she says. "Every lens on this close can watch for all I care. I\'d still like to spend one with you. The last night before something. Say if you don\'t want to."' },
      { text: 'She pulls her collar down. The port at the top of her spine, a ring of dull metal with the cable seated in it. She touches her neck and the night goes a degree quieter. "There. Now they don\'t know where I am. That\'s my hour. The last one before something." She turns round. "I\'d like to spend it with you. Say if you don\'t want to."' },
    ],
    again: 'Kes, with her collar down, waiting for an answer.',
    options: [
      { id: 'a3f.kes.hour.yes', text: 'I want to.', effects: [{ set: 'kes_rom', value: 'dark' }, K(10), { decision: { id: 'kes_dark_hour', text: 'I spent Kes\'s dark hour with her, the night before the steps.' } }], next: 'kes_hour_yes' },
      { id: 'a3f.kes.hour.not', text: 'Not tonight. I\'ll sit the hour with you, though.', effects: NIGHT_HAD('kes'), next: 'kes_hour_not' },
      { id: 'a3f.kes.hour.no', text: 'I don\'t want this, Kes.', effects: K_NO, next: 'kes_hour_no' },
    ],
  },
  kes_hour_yes: {
    speaker: KES,
    text: 'She kisses you like she does everything, fast and showing off, and then not fast at all and not showing off. For an hour nobody on the hill knows where she is, and for an hour she doesn\'t care where the hill is either. Afterwards, with her head on your chest, before the hour runs out: "I don\'t do slow. You know that."',
    again: 'Kes, her head on your chest, the hour not quite up.',
    options: [{ text: '(Let her say it.)', next: 'kes_r3' }],
  },
  kes_hour_not: { speaker: KES, text: '"Fine." She leans on your shoulder for the hour instead, and tells you about the orange tree again, and when the hour is up she sits up and says, "Thanks," and means more than the word holds.', again: 'Kes, leaning on your shoulder.', options: [BACK('kes')] },
  kes_hour_no: { speaker: KES, text: '"Okay." She pulls her collar up. "Okay. Clear." She doesn\'t make it strange, which you can see costs her something.', again: 'Kes, collar up.', options: [BACK('kes')] },
  kes_other: {
    speaker: KES,
    text: '"You\'ve got someone." She noticed before you did; she notices everything. "Obviously I noticed. It\'s fine. It\'s good, actually." She shifts along the step. "Sit anyway. I\'ll talk about the gardens and you can pretend to listen."',
    again: 'She is talking about the gardens.',
    effects: [{ set: 'kes_rom', value: 'no' }, ...LAST('kes', 'apart')],
    options: [BACK('kes')],
  },
  kes_friend: {
    speaker: KES,
    text: '"The gardens." She doesn\'t need asking twice. The orange tree, the rain out of a pipe on a timer, the smell that wasn\'t a smell, the woman who pruned it and never looked at the girl from the Skirts once. It takes a while. "If tomorrow goes the right way," she says at the end, "somebody from Nursery\'s going to stand under that tree in the rain and laugh at it. Obviously I want it to be me."',
    again: 'She is still in the gardens.',
    interject: [{ companion: WREN, text: '"Two people found by the wrong side," Wren says, not turning round from the lane. Kes looks at her back a long while. "Yeah," she says. "Obviously."' }],
    options: [{ id: 'a3f.kes.friend.end', text: '(Let her run.)', effects: [...LAST('kes', 'none'), K(2)], next: 'kes_friend_end' }],
  },
  kes_friend_end: { speaker: KES, text: '"You let me run." She sounds surprised every time. "Nobody lets me run." She bumps your shoulder with hers. "Tomorrow. Don\'t be boring up there."', again: '"Don\'t be boring up there," she says.', options: [BACK('kes')] },
  kes_rom_end: {
    speaker: KES,
    text: '"I\'m sleeping over there." Her bedroll already is. "You know why. I watch everything, and lately I don\'t like what I\'m watching." She doesn\'t raise her voice. "I\'ll go up the steps with you. I won\'t lie down next to it."',
    again: 'Her bedroll, over there.',
    effects: [{ set: 'kes_rom', value: 'ended' }, ...LAST('kes', 'apart'), { decision: { id: 'kes_rom_ended', text: 'Kes ended it, at the fire before the steps. She watches everything.' } }],
    options: [
      { text: '(Let her.)', if: F('romance_partner', KES), effects: [{ set: 'romance_partner', value: false }], next: 'kes' },
      { text: '(Let her.)', if: NOT(F('romance_partner', KES)), next: 'kes' },
    ],
  },
};

// ---------------------------------------------------------------- the hub

const HERE = (c: Key): Cond => WITH_YOU(c);
const NOBODY: Cond = NOT(ANY(...(['tamsin', 'wren', 'ilya', 'odile', 'ash', 'nine', 'kes'] as const).map((c) => WITH_YOU(c))));
/** Who is at the fire, and the way to each one's scene (a failed romance and a list come first, as in their own trees).
 * B6o adds Odile's, Ash's and Nine's here. */
const SIT: OptionDef[] = [
  { id: 'a3f.hub.tam.list.r', text: '(Sit by Tamsin.)', if: ALL(HERE('tamsin'), TAM_LIST, TAM_ROM), next: 'tam_list_r' },
  { id: 'a3f.hub.tam.list', text: '(Sit by Tamsin.)', if: ALL(HERE('tamsin'), TAM_LIST, NOT(TAM_ROM)), next: 'tam_list' },
  { id: 'a3f.hub.tam', text: '(Sit by Tamsin.)', if: ALL(HERE('tamsin'), NOT(TAM_LIST), LEFT('tamsin')), next: 'tam' },
  ...(['wren', 'ilya', 'kes'] as const).flatMap((c): OptionDef[] => {
    const name = { wren: 'Wren', ilya: 'Ilya', kes: 'Kes' }[c];
    return [
      { id: `a3f.hub.${c}.end`, text: `(Sit by ${name}.)`, if: ALL(HERE(c), ROM_ON[c], LOW(c)), next: `${c}_rom_end` },
      { id: `a3f.hub.${c}`, text: `(Sit by ${name}.)`, if: ALL(HERE(c), NOT(ALL(ROM_ON[c], LOW(c))), LEFT(c)), next: c },
    ];
  }),
];

export const d_a3_fire: DialogueDef = {
  id: 'd_a3_fire', owner: 'narrator',
  start: [
    { if: NOT(ALL(A3_OPEN, F('a3_summoned'))), node: 'cold' },
    { if: F('a3_pnr'), node: 'out' },
    // the ones who will not go up the steps beside a guild night say so before anything else
    { if: WREN_GUILD_FIRE, node: 'wren_guild' },
    { if: KES_GUILD_FIRE, node: 'kes_guild' },
    { if: DAY, node: 'day' },
    { node: 'hub' },
  ],
  nodes: {
    cold: {
      text: [
        { if: A3_OPEN, text: 'A works barrel at the foot of the steps, black inside, with the stubs of the day\'s planks in it. The R30 works have been brought forward; the labourers warm their hands at it at the end of a shift, faster than they used to, and the warden on the close pretends not to see.' },
        { text: 'A works barrel at the foot of the steps, black inside, with the stubs of the day\'s planks in it. The labourers on the steps warm their hands at it at the end of a shift, and the warden on the close pretends not to see.' },
      ],
      again: 'The works barrel, cold.',
      options: [{ text: '(Leave it.)', exit: true }],
    },
    out: { text: 'The fire at the foot of the steps has burned down to ash. Nobody is at it now.', again: 'Ash in the barrel.', options: [{ text: '(Leave it.)', exit: true }] },
    day: {
      text: [
        { if: NOBODY, text: 'The works barrel at the foot of the steps has been laid for tonight with city crates broken up for kindling. Nobody is waiting by it. The steps the Ledger\'s card named go up past it into the haze.' },
        { text: 'The works barrel at the foot of the steps has been laid for tonight with city crates broken up for kindling, and coats and packs are folded on the stone round it, the way people mark a place they mean to come back to. The steps the Ledger\'s card named go up past it into the haze.' },
      ],
      again: 'The barrel, laid for tonight.',
      options: [
        { id: 'a3f.wait', text: '(Sit down by it and wait for dark.)', effects: [{ until: 20 }], next: 'hub', repeat: true },
        { text: '(Later.)', exit: true },
      ],
    },
    hub: {
      text: [
        { if: NOBODY, text: 'The fire at the foot of the steps, and nobody at it but you. Up the steps the Spire goes into the dark, the scaffold of the works black against the city\'s glow. Somewhere on the close a warden coughs, and counts the lamps.' },
        { text: 'The fire at the foot of the steps, burning city crates. The ones who came to the close sit round it the way people sit round the last fire of anything: closer than they need to, and quieter. Up the steps the Spire goes into the dark.' },
      ],
      again: 'The fire, lower now. The steps go up into the dark.',
      options: [
        ...SIT,
        { id: 'a3f.sleep', text: '(Sleep by the fire. The steps are there in the morning.)', effects: [{ until: 7 }], exit: true, repeat: true },
        { text: '(Leave the fire.)', exit: true },
      ],
    },
    wren_guild: {
      ...WREN_GUILD_NODES.a3_guild, speaker: WREN, text: W_GUILD_TEXT.close,
      options: [...W_GO({ next: 'after_guild' })],
    },
    kes_guild: {
      ...KES_GUILD_NODES.a3_guild, speaker: KES, text: K_GUILD_TEXT.close,
      options: [...K_GO({ next: 'after_guild' })],
    },
    after_guild: {
      text: 'The fire settles. Whoever is left at it moves up a little to close the gap, without anybody saying so.',
      again: 'The gap at the fire, closed.',
      options: [
        { text: '(Stay at the fire.)', if: KES_GUILD_FIRE, next: 'kes_guild' },
        { text: '(Stay at the fire.)', if: ALL(NOT(KES_GUILD_FIRE), DAY), next: 'day' },
        { text: '(Stay at the fire.)', if: ALL(NOT(KES_GUILD_FIRE), NOT(DAY)), next: 'hub' },
      ],
    },
    ...TAM_NODES,
    ...WREN_NODES,
    ...ILYA_NODES,
    ...KES_NODES,
  },
};

export const A3_FIRE_DIALOGUES: DialogueDef[] = [d_a3_fire];
