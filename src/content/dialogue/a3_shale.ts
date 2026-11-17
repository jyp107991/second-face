import type { CheckDef, DialogueDef, NodeDef, OptionDef } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import { A3_OPEN, ASH, ILYA, IN, KES, NINE, ODILE, TAMSIN, WREN } from '../world/a3_conds';
import { d_sh_ada, d_sh_issa, d_sh_jonah, d_sh_mags, d_sh_pike } from './shale';

/**
 * Sheriff's Last Ride (B6e, Act 3 beat 19c): the guild's buyout of Shale comes due. The hook is a notice nailed to the
 * sheriff's door the morning the city brought its schedule forward (SHALE — CONTRACT OF PROTECTION — ON THE SHERIFF'S
 * RESIGNATION), two guild hands standing at that door as witnesses, and Ada Vey at her desk with the paper and the pen,
 * not signing, because she said she would sign when she had heard from the player. Nothing happens until the player is in
 * Shale: the buyout comes due on arrival (the map's road triggers) or the first Act 3 word in the town, and then everybody
 * waits for the player, as everything in Act 3 does.
 *
 * The investigation: Ada (why she would sign, what the paper says, why she has not), Pike (what it costs: three hundred
 * Tolls of the town's paper, valued against a sheet on the Ninebridge floor that has Shale failing two springs off; who
 * brokered it; why now), Mags (her hand in it), Teo (the arithmetic), Issa (what the militia would do). The turn: the
 * contract is a ruin price on a forecast, brought forward the morning after Openfield's night by the sheet's holder, and
 * Mags brokered it to get her friend out of a chair that has buried two sheriffs, and her bar back with it.
 *
 * The routes: T Ada talked into staying (Speech 50) · B the town's paper paid (300), or repriced on a living town (Odile, or
 * Teo's figures and Barter 50: 150), or nothing at all if the sheet it rests on was unwound · K the sheet torn at Pike's
 * counter (the player's, Odile's, or Nine's second ledger), or the Tollhouse page laid beside his ledger (the player's, or
 * Ada's own) · S the guild's copy out of Pike's strongbox at night (Security 50) · F the guild's hands put off the street
 * with the militia (counted off without a shot when nine rifles shoot, or a Presence check; or a fight) · or she signs.
 * Ada dies only in the fight, and only when nobody can keep her standing: the militia never drilled and Jonah dead. The
 * town's fate (`a3_shale`) follows from how Ada went and from what Acts 1–2 left: free, a company town, the Dogs' town
 * (the coup's Dogs ride in), or abandoned (the pumps on their clock). Shale's own trees (`d_sh_*`) are carried whole after
 * each Act 3 tree's own entries, so every service and Act 1 thread still plays. Story notes: story/B6_NOTES_SECRET.md §2.3
 * (19c), §8 B6e and its "As built".
 */

const F = (flag: string, eq?: string): Cond => (eq === undefined ? { flag } : { flag, eq });
const ALL = (...c: Cond[]): Cond => ({ all: c });
const ANY = (...c: Cond[]): Cond => ({ any: c });
const NOT = (c: Cond): Cond => ({ not: c });
const A = (companion: string, by: number): Effect => ({ approval: { companion, by } });
const TOLLS = (n: number): Cond => ({ item: 'tolls', count: n });
const bye: OptionDef = { text: 'That\'s all.', exit: true };
const leave: OptionDef = { text: '(Leave it.)', exit: true };

const ADA = 'npc_sh_01', JONAH = 'npc_sh_02', MAGS = 'npc_sh_03', PIKE = 'npc_sh_04', TEO = 'npc_sh_07', ISSA = 'npc_sh_11';
export const ESKO = 'npc_a3_g7', TAMAR = 'npc_a3_g8';

// ---------------------------------------------------------------- state

/** The buyout is open: Act 3, Ada and Pike both alive, and nothing settled yet. */
export const RIDE_OPEN: Cond = ALL(A3_OPEN, NOT(F('ks_ada')), NOT({ dead: ADA }), NOT({ dead: PIKE }));
/** The buyout comes due in front of the player: the first of the road in, the door, or an Act 3 word in Shale. */
export const BUYOUT_DUE: Effect[] = [{ set: 'a3_buyout' }, { quest: 'q_a3_ride', start: true }];
/** The guild's hands drawn on, and the street not yet told how it ended. */
export const FIGHTING: Cond = ALL(F('a3_sh_fight'), NOT(F('a3_sh_after')));
export const HANDS_DOWN: Cond = ALL({ dead: ESKO }, { dead: TAMAR });
const JONAH_ALIVE: Cond = ALL(NOT(F('jonah_dead')), NOT({ dead: JONAH }));
/** The one case in which Ada dies: shooting in her street, and nobody to keep her standing (the conditions, never chance). */
export const ADA_FALLS: Cond = ALL(NOT(F('militia_drilled')), ANY(F('jonah_dead'), { dead: JONAH }));
const DRILLED: Cond = F('militia_drilled');
const WITHERS: Cond = F('shale_withers');
const COUP: Cond = F('rd_coup');
const VASHA: Cond = NOT(F('vasha_dead'));
const ISSA_HERE: Cond = NOT({ dead: ISSA });
const TEO_HERE: Cond = ALL(F('teo_freed'), NOT({ dead: TEO }));
const WATER: Cond = ANY(F('dw_outcome', 'restored'), F('dw_outcome', 'freed'));
const NIGHT: Cond = { hour: { from: 22, to: 8 } };
const MAGS_KNOWN_TO_ADA: Cond = ANY({ knows: 'mags_exposed' }, F('a3_mags', 'told'), F('a3_mags', 'exposed'));
/** Odile's sheet on Shale, by who has it (U8: torn | kept | player | nine). */
const SHEET = (v: string): Cond => F('odile_sheet', v);
const PRICE_KNOWN: Cond = { knows: 'a3_buyout_terms' };
const SHEET_KNOWN: Cond = { knows: 'a3_buyout_sheet' };

type Part = { if?: Cond; t: string };
/** Text from parts that vary on their own (each axis ordered, its default last): every combination, first match wins. */
function mix(axes: Part[][], f: (...t: string[]) => string): { if?: Cond; text: string }[] {
  let combos: { conds: Cond[]; ts: string[] }[] = [{ conds: [], ts: [] }];
  for (const axis of axes) combos = combos.flatMap((c) => axis.map((p) => ({ conds: p.if ? [...c.conds, p.if] : c.conds, ts: [...c.ts, p.t] })));
  return combos.map((c) => (c.conds.length ? { if: c.conds.length === 1 ? c.conds[0] : ALL(...c.conds), text: f(...c.ts) } : { text: f(...c.ts) }));
}

// ---------------------------------------------------------------- the outcomes

export type Fate = 'free' | 'company' | 'dogs' | 'abandoned';
const FATE_NEWS: Record<Fate, { text: string; valence: number }> = {
  free: { text: 'the guild\'s contract came down off the sheriff\'s door in Shale, and Ada Vey kept the star', valence: 10 },
  company: { text: 'Sheriff Vey rode across the street to the Tollmen\'s post and signed; Shale is under guild protection now', valence: -6 },
  dogs: { text: 'with the sheriff gone the Rust Dogs rode into Shale and took the office; the water is the tithe now', valence: -14 },
  abandoned: { text: 'Shale has no sheriff, and families are loading carts on the east road', valence: -12 },
};
/** The town's fate, and what it shows: the company town is Mags's to run. */
const FATE = (v: Fate): Effect[] => [
  { set: 'a3_shale', value: v },
  ...(v === 'company' ? [{ set: 'a3_mags', value: 'runs' } as Effect] : []),
  { news: { tag: `a3_shale_${v}`, text: FATE_NEWS[v].text, valence: FATE_NEWS[v].valence, size: 7, at: 'shale' } },
];
/** Ada stays: Pike's contract is paper, by whichever route. */
const STAYS = (pike: string, text: string, extra: Effect[] = []): Effect[] => [
  { set: 'ks_ada', value: 'stays' }, { set: 'a3_pike', value: pike }, ...FATE('free'),
  { trust: { npc: ADA, by: 15 } }, { memory: { npc: ADA, tag: 'a3_kept', valence: 40, strength: 100 } },
  { rep: { faction: 'shale_militia', respect: 10 } }, { xp: 150 },
  { decision: { id: `a3_shale_${pike}`, text } }, ...extra,
];
/** Ada signs (the forecast): she resigns, and the town's fate follows from what Acts 1–2 left it. */
const SIGNED = (v: Fate): Effect[] => [
  { set: 'ks_ada', value: 'resigns' }, { set: 'a3_pike', value: 'signed' }, ...FATE(v),
  { memory: { npc: ADA, tag: 'a3_signed', valence: -10, strength: 100 } }, { rep: { faction: 'shale_militia', respect: -10 } }, { rep: { faction: 'tollmen', respect: 5 } },
  { decision: { id: 'a3_shale_signed', text: 'I told Ada Vey to sign the guild\'s contract, and she rode across the street and signed it.' } },
];
/** Ada fell in her own street (only under ADA_FALLS). */
const FELL = (v: Fate): Effect[] => [
  { set: 'ks_ada', value: 'dead' }, { set: 'a3_sh_after' }, ...FATE(v),
  { memory: { npc: ISSA, tag: 'a3_ada_fell', valence: -30, strength: 100 } }, { rep: { faction: 'shale_militia', respect: 5 } },
  { news: { tag: 'a3_ada_dead', text: 'Sheriff Ada Vey was shot dead in front of her own door when the guild\'s men were put off Shale\'s street', valence: -12, size: 9, at: 'shale' } },
  { decision: { id: 'a3_shale_fell', text: 'Ada Vey died in front of her own door when I put the guild\'s hands off Shale\'s street.' } },
];

// ---------------------------------------------------------------- the checks

/** T: Ada stays (the plan's five, plus what the player brought her). */
const STAY_CHECK: CheckDef = { skill: 'speech', dc: 50, mods: [
  { if: F('jonah_lived'), dc: -10, why: 'Jonah lived his month, and she knows who was in town' },
  { if: DRILLED, dc: -5, why: 'nine rifles shoot now' },
  { if: { standing: { settlement: 'shale', gte: 15 } }, dc: -10, why: 'Shale says your name without spitting' },
  { if: F('ledger_shown_ada'), dc: -10, why: 'she has the page that proves Pike paid the outriders' },
  { if: MAGS_KNOWN_TO_ADA, dc: -5, why: 'she knows whose hand is in the paper' },
  { if: { knows: 'a3_buyout_why' }, dc: -5, why: 'you let her say what she is afraid of' },
  { if: WATER, dc: -5, why: 'the pumps run' },
  { if: { member: 'shale_militia' }, dc: -5, why: 'you are one of her militia' },
  { if: F('shale_broke'), dc: 10, why: 'the town broke when Jonah died' },
  { if: WITHERS, dc: 5, why: 'the town is drying up under her' },
] };
/** Pike names his broker only to someone who has earned it at the rate. */
const BROKER_CHECK: CheckDef = { skill: 'barter', dc: 45, mods: [
  { if: { knows: 'mags_cooked' }, dc: -15, why: 'you have read the Dry Well\'s second book' },
  { if: { remembers: { npc: PIKE, tag: 'sold_station' } }, dc: -10, why: 'you have done the guild\'s business before' },
  { if: F('ledger_sold'), dc: -5, why: 'you sold him back his page' },
] };
/** Mags owns up, without the ledger to show her. */
const MAGS_CHECK: CheckDef = { skill: 'speech', dc: 45, mods: [
  { if: { knows: 'mags_helped' }, dc: -15, why: 'you hid her books for her once' },
  { if: { trust: { npc: MAGS, gte: 20 } }, dc: -10, why: 'she trusts you' },
  { if: F('mags_told_teo'), dc: -5, why: 'you brought Teo home' },
  { if: { knows: 'mags_squeezed' }, dc: 10, why: 'you sold her her own silence once' },
] };
/** Teo's figures put to Pike, without Odile. */
const REPRICE_CHECK: CheckDef = { skill: 'barter', dc: 50, mods: [{ if: WATER, dc: -10, why: 'the pumps run, and he can see them from his window' }] };
/** The hands counted off by an undrilled militia. */
const COUNT_CHECK: CheckDef = { attr: 'presence', dc: 7, mods: [
  { if: IN(ILYA), dc: -2, why: 'Ilya Strand is standing behind you with his rifle' },
  { if: F('wren_exodus'), dc: -1, why: 'Calloway\'s people have come out of the tannery to watch' },
  { if: F('hound_outcome', 'shale'), dc: -1, why: 'the machine in the sheriff\'s yard has turned its head to look at them' },
] };
const SAFE_CHECK: CheckDef = { skill: 'security', dc: 50 };

// ---------------------------------------------------------------- the door

export const d_a3_notice: DialogueDef = {
  id: 'd_a3_notice', owner: 'narrator',
  start: [
    { if: RIDE_OPEN, node: 'notice' },
    { if: F('a3_shale', 'company'), node: 'tin' },
    { if: F('a3_shale', 'dogs'), node: 'branded' },
    { if: F('a3_shale', 'abandoned'), node: 'barred' },
    { if: F('ks_ada', 'dead'), node: 'black' },
    { if: F('ks_ada', 'stays'), node: 'torn' },
    { node: 'board' },
  ],
  nodes: {
    board: {
      text: 'The sheriff\'s door. Nailed to it, one over another: the militia\'s rota in Issa Lind\'s square hand, the Tollmen\'s rate card for water by the measure, and a sheet about the Dogs\' tithe that someone has written NO across in charcoal and someone else has half rubbed out.',
      again: 'The sheriff\'s door: the rota, the rate card, the tithe sheet.',
      options: [leave],
    },
    notice: {
      text: 'Over the rota and the rate card, square at eye height on four new nails, a guild notice in a clerk\'s hand: SHALE — CONTRACT OF PROTECTION — ON THE SHERIFF\'S RESIGNATION. On the resignation of the sheriff of Shale the Tollmen, post nine-west, assume the protection of the town, its roads, its water and its office, and the town\'s paper with the guild is settled in full. The sheriff retires on the guild\'s pension, paid at this post. Possession on the sheriff\'s mark. Posted as per. O. Pike, Factor. Under it, the line for the mark, blank.',
      again: 'SHALE — CONTRACT OF PROTECTION — ON THE SHERIFF\'S RESIGNATION. The line for the mark is still blank.',
      effects: [...BUYOUT_DUE, { learn: 'a3_buyout_notice' }],
      passives: [{ attr: 'senses', dc: 6, text: 'The nails are new and the paper is not: it has been carried folded in a coat for months, waiting for a door.' }],
      options: [leave],
    },
    torn: {
      text: [
        { if: F('a3_pike', 'paid'), text: 'The four nails are still in the sheriff\'s door with a strip of the guild\'s notice under them, and across the strip, in the factor\'s even hand: SETTLED. AS PER. Under it the rota has a new line in Issa Lind\'s hand: PAIRS. ALL NIGHT. A.V.' },
        { text: 'The four nails are still in the sheriff\'s door. The guild\'s notice is gone from between them; someone took it down hard enough to leave the corners. Under them the rota has a new line in Issa Lind\'s hand: PAIRS. ALL NIGHT. A.V.' },
      ],
      again: 'Four nails, and the corners of a notice that isn\'t there.',
      options: [leave],
    },
    tin: {
      text: 'A guild plate is screwed to the sheriff\'s door where the notices were, tin with the half-moon stamped in it: TOLLMEN — POST NINE-WEST — PROTECTION. The rota is gone. The rate card is still there, and the water on it is dearer.',
      again: 'TOLLMEN — POST NINE-WEST — PROTECTION.',
      options: [leave],
    },
    branded: {
      text: [
        { if: VASHA, text: 'The notices are gone from the sheriff\'s door. Somebody has burned a dog\'s head into the wood with a hot iron, crude and deep, and chalked under it: WATER. TWICE A YEAR. ASK KADE.' },
        { text: 'The notices are gone from the sheriff\'s door. Somebody has burned a dog\'s head into the wood with a hot iron, crude and deep, and chalked under it: WATER. TWICE A YEAR.' },
      ],
      again: 'The dog\'s head burned into the sheriff\'s door.',
      options: [leave],
    },
    barred: {
      text: [
        { if: F('ks_ada', 'resigns'), text: 'A plank is nailed across the sheriff\'s door. The guild\'s notice is still under it, the sheriff\'s mark on the line now, and beside it, chalked by a child: GONE EAST.' },
        { text: 'A plank is nailed across the sheriff\'s door, a strip of black cloth on the plank, and under it, chalked by a child: GONE EAST.' },
      ],
      again: 'GONE EAST, in chalk, under a plank.',
      options: [leave],
    },
    black: {
      text: 'The notices are gone from the sheriff\'s door, and a strip of black cloth is nailed across it at eye height, the way Shale marks a house that has had a death. Somebody has chalked under it, carefully, in a hand that learned its letters late: SHERIFF VEY. SHE STOOD IN THE STREET.',
      again: 'SHERIFF VEY. SHE STOOD IN THE STREET.',
      options: [leave],
    },
  },
};

// ---------------------------------------------------------------- Ada

const ADA_DESK = mix([
  [{ if: NOT(JONAH_ALIVE), t: ' The deputy\'s chair against the wall has a coat over it that nobody has moved since spring.' }, { t: '' }],
], (dep) => `Ada Vey is at her desk with the guild's paper on the blotter in front of her and a pen beside it, uncapped, as if she put it down a moment ago and has been putting it down all morning.${dep} She looks up. "{name}." Not "you": she has never used your name before. "You'll have read my door."`);

const WHY_TEXT = mix([
  [{ if: DRILLED, t: 'Nine rifles that shoot, and Issa the only one who\'s ever shot at a man.' }, { t: 'Four rifles that shoot, and five that point the right way.' }],
  [{ if: JONAH_ALIVE, t: 'A deputy who reads and would stand in front of a cart for me.' }, { t: 'No deputy.' }],
  [{ if: F('dw_outcome', 'sold'), t: 'Water I buy by the measure from Pike\'s chair by my own pumps.' }, { if: WITHERS, t: 'Pumps on a clock that runs a little slower every month.' }, { t: 'Water, now, which brings people.' }],
], (rifles, deputy, water) => `"Look at the street." She doesn't. "${rifles} ${deputy} ${water} And since the Openfield night there are people on the west road every morning with what they could carry, and every one of them stops at my pumps." She turns the pen over. "Pike's paper says the guild feeds what stops here and guards what it feeds. And I'm forty-eight. I was deputy to the last two sheriffs of Shale, and they're both in the yard behind the pump house, and I dug the second one myself. I'd sooner be the last sheriff of Shale than the third one in that yard."`);

/** Ada rides the forty yards to Pike's post and signs (the opening of every resignation). */
const RIDE = 'She goes out through the yard and comes back leading the grey from the caravan post, saddled, and the whole street comes out to see why. She mounts in front of her own door, which takes her two tries, and rides the forty yards to Pike\'s post at a walk with her hat on and her back straight, because, she says to nobody in particular, a sheriff rides out. She ties the grey to his rail. You don\'t hear what Pike says. You see her take the star off her coat and set it on his counter, and then the pen, and then you see her sign.';
const RIDE_INTERJECT: NodeDef['interject'] = [
  { companion: ILYA, text: '"Right," Ilya says, when she ties the grey. He doesn\'t say anything else for a long time.', effects: [A(ILYA, -10)] },
  { companion: TAMSIN, text: '"She rode out," Tamsin says, very low. "So nobody can say she was carried."', effects: [A(TAMSIN, -5)] },
  { companion: WREN, text: '"A sheriff who signs is a sheriff who was bought," Wren says. "She knows it. That\'s why the horse."', effects: [A(WREN, -3)] },
  { companion: ASH, text: '"She signed what was written for her," Ash says. "Most people do."', effects: [A(ASH, -3)] },
  { companion: KES, text: '"Protection," Kes says, watching her sign. "They always call it that."', effects: [A(KES, -3)] },
  { companion: NINE, text: '"VEY, ADA. RESIGNS. SHALE CONTRACTED," Nine says, very quietly, at the speed of a line read off a list. "The record would mark that fulfilled. I would rather it did not."' },
];
const ride = (v: Fate, tail: string): NodeDef => ({
  text: `${RIDE} ${tail}`,
  again: 'The star on Pike\'s counter, and the line for the mark filled in.',
  effects: SIGNED(v),
  interject: RIDE_INTERJECT,
  options: [{ text: '(Go on.)', exit: true }],
});

const ADA_TOPICS: OptionDef[] = [
  { id: 'a3sa.why', text: 'Why would you sign it?', once: true, next: 'why' },
  { id: 'a3sa.paper', text: 'What does the paper say that the door doesn\'t?', once: true, next: 'paper' },
  { id: 'a3sa.wait', text: 'Why haven\'t you signed it yet?', once: true, next: 'wait' },
  { id: 'a3sa.mags', text: 'Mags brokered it. The Dry Well\'s account is settled as her fee.', if: ALL({ knows: 'a3_mags_hand' }, NOT(F('a3_mags'))), next: 'mags_tell' },
  { id: 'a3sa.page', text: 'You\'ve still got Post Nine\'s page. You said you\'d use it when it cost him more than it cost Shale.', if: ALL(F('ledger_shown_ada'), NOT(F('ledger_sold'))), next: 'page' },
  { id: 'a3sa.contract', text: '(Put the guild\'s own copy of the contract on her blotter.)', if: { item: 'k_a3_contract' }, next: 'burn' },
  { id: 'a3sa.stay', text: 'Stay. Shale doesn\'t need the guild\'s paper. It needs its sheriff.', check: STAY_CHECK, next: 'stays_t', fail: 'stay_no' },
  { id: 'a3sa.sign', text: 'Sign it, then. It\'s your town and your life.', next: 'sign_ask' },
  { id: 'a3sa.more', text: '(Something else.)', next: 'again' },
  { text: '(Leave her to it.)', exit: true },
];

export const d_a3_ada: DialogueDef = {
  id: 'd_a3_ada', owner: ADA,
  start: [
    { if: RIDE_OPEN, node: 'desk' },
    { if: F('ks_ada', 'stays'), node: 'kept' },
    { if: F('ks_ada', 'resigns'), node: 'resigned' },
    ...d_sh_ada.start,
  ],
  nodes: {
    ...d_sh_ada.nodes,
    desk: {
      text: ADA_DESK,
      again: '"Still here," Ada says. The pen has not moved.',
      effects: [...BUYOUT_DUE, { set: 'sh_ada_met' }],
      interject: [
        { companion: ILYA, text: 'Ilya takes his hat off in the doorway, which you have never seen him do. Ada looks at him for a long moment. "Strand," she says. "You\'re sober." "Mostly," he says, and stays by the door.' },
        { companion: ODILE, text: 'Odile reads the paper upside down from across the desk, and goes very still at its last line. "My dear," she says, to you and very quietly, "that is my arithmetic on her blotter."' },
        { companion: WREN, text: '"She hasn\'t signed," Wren says under her breath. "Look at the pen. She\'s been not signing it all morning."' },
        { companion: TAMSIN, text: 'Tamsin stays by the door, where people from Knock stand in Shale. "She waited," she says, low. "For you. Why would she wait for you?"' },
        { companion: NINE, text: '"Possession on the sheriff\'s mark," Nine says. "A transfer that executes on a resignation. The record would call that a schedule."' },
        { companion: KES, text: '"Protection," Kes says. "That\'s what the Concern calls a leash when it\'s being polite."' },
        { companion: ASH, text: '"They wrote her name somewhere first," Ash says, not quite to you. "They always write it somewhere first."' },
      ],
      options: ADA_TOPICS,
    },
    why: {
      text: WHY_TEXT,
      again: '"The third one in that yard," Ada says. "That\'s why."',
      effects: [{ learn: 'a3_buyout_why' }],
      options: [{ text: '(Go on.)', next: 'desk' }],
    },
    paper: {
      text: '"Protection." She taps the paper without looking at it. "The town\'s paper with the guild, settled: the Dry Well\'s loan, the water they\'ve sold us on credit, Pike\'s rate since the spring. The office and the cell to the guild, and their hands on my street. A pension for me, paid at his counter every month, for doing nothing, which I\'m told I\'ll get used to." A breath. "There\'s a line at the bottom about how they valued it. I can read everything Pike\'s ever written, and I can\'t read that."',
      again: '"The line at the bottom," Ada says. "Ask him what it means. He\'ll tell you, at the rate."',
      effects: [{ learn: 'a3_buyout_read' }],
      options: [{ text: '(Go on.)', next: 'desk' }],
    },
    wait: {
      text: '"Because I told Pike I\'d sign when I\'d heard from you." She says it to the paper. "You\'ve been where the paper comes from. The city, the Spire, whatever writes the rest of us down. If there\'s a line in their books that says Shale lasts, you\'d have seen it. If there isn\'t, I\'d like to hear that from somebody who isn\'t selling me anything." She looks up. "So. I\'m hearing."',
      again: '"I\'m hearing," Ada says.',
      effects: [{ learn: 'a3_ada_waits' }],
      options: [{ text: '(Go on.)', next: 'desk' }],
    },
    mags_tell: {
      text: '"Mags." She says it once and lets it sit. "The Dry Well\'s account." She doesn\'t ask whether you\'re sure: she has done the arithmetic already, and from the look of her she did it in the spring and decided not to see the answer. "She\'s been trying to get me out of this chair since the second sheriff. She thinks I don\'t know." A long breath. "Noted."',
      again: '"Mags," Ada says. "Noted."',
      effects: [{ set: 'a3_mags', value: 'exposed' }, { trust: { npc: MAGS, by: -20 } }, { memory: { npc: MAGS, tag: 'a3_hand_told', valence: -25, strength: 90 } }, { memory: { npc: ADA, tag: 'a3_mags_hand', valence: 5, strength: 80 } }],
      interject: [{ companion: TAMSIN, text: '"She did it so you\'d live," Tamsin says. Ada looks at her. "I know what she did it for," she says. "That\'s the trouble with it."' }],
      options: [{ text: '(Go on.)', next: 'desk' }],
    },
    page: {
      text: '"I did say that." She takes it out of her shirt, where it has been since you gave it to her, folded small and soft as cloth. "Post nine-west. One traveller, westbound, confirmed." She stands and puts her hat on and goes out without the guild\'s paper. Through the window you watch her cross the street to Pike\'s counter at a walk, the whole street watching her do it. She is in there a long time. When she comes back she has the notice off her own door in one hand and the page in the other. "He\'s withdrawn it," she says. "As per. He\'d like his page back." She puts the notice in the stove, and the page back in her shirt. "He isn\'t getting it."',
      again: 'The page back in her shirt, and the notice in the stove.',
      effects: STAYS('exposed', 'Ada Vey laid Post Nine\'s ledger page on Pike\'s counter, and the guild withdrew its contract on Shale.', [{ memory: { npc: PIKE, tag: 'a3_page', valence: -30, strength: 100 } }, { rep: { faction: 'tollmen', respect: -10 } }]),
      interject: [{ companion: WREN, text: '"That\'s how you use a page," Wren says. "You walk it across the street in daylight."', effects: [A(WREN, 5)] }, { companion: ILYA, text: 'Ilya watches her come back across the street. "Right," he says, and this time it sounds like something else.', effects: [A(ILYA, 5)] }],
      options: [{ text: '(Go on.)', next: 'kept' }],
    },
    burn: {
      text: '"This is the guild\'s copy." She reads it to the bottom, the valuation line twice, and the line under it where Pike has countersigned in advance. "From his box." It isn\'t a question. She opens the stove with the poker and feeds it in a fold at a time and watches each one go. "I didn\'t see where that came from, and I\'m not going to ask, and that\'s the first law I\'ve broken in nine years in this chair." She shuts the stove. "No paper, no possession. Even Pike says so."',
      again: 'The stove door shut on the guild\'s copy.',
      effects: [{ take: 'k_a3_contract' }, ...STAYS('robbed', 'I took the guild\'s copy of the contract out of Pike\'s strongbox in the night, and Ada Vey burned it in her stove.', [{ memory: { npc: PIKE, tag: 'a3_robbed', valence: -15, strength: 80 } }])],
      interject: [{ companion: WREN, text: '"Clean," Wren says. "Nobody shot, nobody bought."', effects: [A(WREN, 3)] }, { companion: NINE, text: '"The contract existed," Nine says. "Its copy does not. The record will note the difference, and I will not tell it which."', effects: [A(NINE, -2)] }],
      options: [{ text: '(Go on.)', next: 'kept' }],
    },
    stays_t: {
      text: 'She hears you out. She doesn\'t interrupt, which in Ada Vey is a kind of agreement. When you have finished she looks at the pen for a long time. Then she caps it, and puts it in the drawer, and locks the drawer, and puts the key in her shirt where she keeps things. She takes the guild\'s paper off the blotter, goes out, and pulls the notice off her own door, four nails and all; and across the street, at a walk, with the whole street watching, she lays both on Pike\'s counter. "Return to sender," you hear her say. "Noted." On Pike\'s word the guild\'s hands go back to the post.',
      again: 'The pen locked in the drawer.',
      effects: STAYS('refused', 'I talked Ada Vey out of signing the guild\'s contract; she walked it back across the street to Pike herself.', [{ memory: { npc: PIKE, tag: 'a3_refused', valence: -5, strength: 60 } }]),
      interject: [
        { companion: ILYA, text: 'Ilya watches her cross the street. "Right," he says, and this time it sounds like something else.', effects: [A(ILYA, 5)] },
        { companion: TAMSIN, text: '"You talked her into staying," Tamsin says. "Good. Somebody should stay somewhere."', effects: [A(TAMSIN, 5)] },
        { companion: WREN, text: '"She said it to his face," Wren says. "That\'s worth more than the paper."', effects: [A(WREN, 3)] },
      ],
      options: [{ text: '(Go on.)', next: 'kept' }],
    },
    stay_no: {
      text: '"You\'ve said it well," she says, and means it. "And it\'s still the same street, and I\'m still the one standing in it." The pen stays where it is. She doesn\'t pick it up, either.',
      again: '"Still the same street," Ada says.',
      options: [{ text: '(Go on.)', next: 'desk' }],
    },
    sign_ask: {
      text: '"Sign it." She repeats it the way she repeats everything, to be sure she heard it. "All right." She sits with it a moment longer than she needs to. "Then I\'ll do it properly."',
      again: '"Properly," Ada says.',
      options: [
        { id: 'a3sa.ride.abandoned', text: '(Watch her go.)', if: WITHERS, next: 'ride_abandoned' },
        { id: 'a3sa.ride.dogs', text: '(Watch her go.)', if: ALL(NOT(WITHERS), COUP), next: 'ride_dogs' },
        { id: 'a3sa.ride.company', text: '(Watch her go.)', if: ALL(NOT(WITHERS), NOT(COUP)), next: 'ride_company' },
        { id: 'a3sa.ride.no', text: 'Wait. Not yet.', next: 'desk' },
      ],
    },
    ride_company: ride('company', 'When she comes out, the guild\'s hands are already crossing to her office, and one of them sits down at her desk and takes his hat off, which is a courtesy. Ada walks the grey back to the caravan post and sits down on her own step. "Noted," she says, to the street.'),
    ride_dogs: ride('dogs', [
      'By dusk there are riders on the west road, and they are not the guild\'s. The guild\'s hands meet them at the office door and talk, and the talk is short, and the Dogs go in and the guild\'s hands go back to the post: protection, it turns out, is a thing the guild buys wholesale.',
      'Ada is gone west on a horse of her own before the lamps are lit. She doesn\'t say goodbye to anyone, which is how you know.',
    ].join(' ')),
    ride_abandoned: ride('abandoned', 'The guild\'s hands take the office and find nothing in it worth keeping. By the end of the week there are carts on the east road with families on them, because a town with no sheriff and pumps on a clock is a town that will be gone by the date on somebody\'s sheet, and everybody in Shale can read a date. Ada takes a horse of her own west, and doesn\'t come back.'),
    kept: {
      text: [
        { if: F('a3_pike', 'paid'), text: '"You paid my town\'s paper." The receipt is on the blotter where the contract was, SETTLED across it in Pike\'s hand. "I don\'t know yet whether that makes Shale yours. It doesn\'t make it his." A pause. "Thank you. I\'ll only say it the once."' },
        { if: F('a3_pike', 'void'), text: '"Pike came over himself," Ada says. "Hat in his hand. Said the thing the price rested on had been unwound, and a contract that can\'t be valued can\'t be executed, as per, and he was very sorry for my trouble, as per." She almost smiles. "I\'ve never seen a man so relieved to lose."' },
        { if: F('a3_pike', 'exposed'), text: '"He still wants his page back," Ada says, and touches her shirt. "He isn\'t getting it."' },
        { if: F('a3_pike', 'robbed'), text: '"Nobody\'s asked me where the guild\'s copy went," Ada says, "and I\'ve not told anybody I don\'t know." She does not look at you while she says it.' },
        { if: F('a3_pike', 'put_off'), text: '"Issa says you stood in the street with them," Ada says. "So did I, by the end." She looks at the door. "Noted."' },
        { text: '"Still here," Ada says. "Pike sends his compliments, as per, and says the offer doesn\'t expire. I told him neither do I."' },
      ],
      again: '"Sheriff\'s office," Ada says. "Still."',
      interject: [
        { companion: TAMSIN, if: JONAH_ALIVE, text: '"Your deputy reads," Tamsin says. "I\'ve seen him." "He does," Ada says. "He could use a second who argues." She looks at Tamsin for a long moment. "Ask me in a year."' },
        { companion: TAMSIN, text: '"You need a deputy," Tamsin says, as if it were nothing. Ada looks at her for a long moment. "I\'ve had one," she says. "Ask me again in a year."' },
      ],
      options: [{ id: 'a3sa.kept.more', text: '(Something else.)', next: 'again' }, bye],
    },
    resigned: {
      text: '"Pensioner," Ada says from her step, before you can ask. "Paid at his counter, every month, for doing nothing. I\'m told I\'ll get used to it." She doesn\'t look at the office behind her, or at the man at her desk. "Don\'t stand there feeling sorry, {name}. You told me to sign and I signed. Noted."',
      again: '"Noted," Ada says, from her step.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- Pike

const PAID_TEXT = (sum: string) => `"${sum}." He counts it twice, the second time for the form of it, and writes SETTLED across the contract in the same hand as everything else he writes, signs it, blots it and turns it to face you. "A town with no paper owes the guild nothing, and a contract that settles nothing executes nothing, as per." He takes his hat from the peg, crosses the street himself, and takes his notice down off the sheriff's door, four nails and all; the hands go back to the post with him. When he comes back he hangs his hat up again. "The offer does not expire," he says. "But it has nothing to stand on."`;
const VOID_TAIL = 'Then the valuation clause refers to an instrument that does not exist, and a contract that cannot be valued cannot be executed, as per." He looks, for a moment, almost relieved. "I do not like a contract I cannot read." He crosses the street himself and takes his notice down off the sheriff\'s door.';

const PIKE_ROUTES: OptionDef[] = [
  { id: 'a3sp.pay', text: '(Pay the town\'s paper. 300 Tolls)', if: ALL(PRICE_KNOWN, TOLLS(300)), next: 'paid' },
  { id: 'a3sp.odile', text: 'Odile. You wrote the instrument.', if: ALL(SHEET_KNOWN, IN(ODILE), NOT(SHEET('torn'))), next: 'odile' },
  { id: 'a3sp.reprice', text: '(Put Teo Marsh\'s figures on the counter.) A living town owes half that, and you can read.', if: ALL({ knows: 'a3_buyout_priced' }, NOT(IN(ODILE))), check: REPRICE_CHECK, next: 'priced', fail: 'reprice_no' },
  { id: 'a3sp.unwound', text: 'The sheet your price rests on is ash. Odile tore it up by a fire outside Meridian.', if: ALL(SHEET_KNOWN, SHEET('torn')), next: 'unwound' },
  { id: 'a3sp.tear', text: '(Lay Odile\'s sheet on his ledger and tear it in half.)', if: ALL(SHEET_KNOWN, SHEET('player')), next: 'tear' },
  { id: 'a3sp.nine', text: 'Nine. The sheet in your other ledger.', if: ALL(SHEET_KNOWN, SHEET('nine'), IN(NINE)), next: 'nine_sheet' },
  { id: 'a3sp.page', text: '(Lay the Tollhouse page beside his ledger.)', if: { item: 'k_ledger_page' }, next: 'page_lay' },
];

export const d_a3_pike: DialogueDef = {
  id: 'd_a3_pike', owner: PIKE,
  start: [
    { if: FIGHTING, node: 'shut' },
    { if: RIDE_OPEN, node: 'counter' },
    { if: ALL(A3_OPEN, F('a3_pike')), node: 'after' },
    ...d_sh_pike.start,
  ],
  nodes: {
    ...d_sh_pike.nodes,
    counter: {
      text: [
        { if: F('a3_sh_safe'), text: '"Good day." Pike does not look up until he has finished the line. "The post\'s strongbox was opened in the night and a paper taken from it. Possession waits on paper, as per." He looks at you exactly as long as courtesy allows. "Stock, or something further?"' },
        { if: F('ledger_sold'), text: '"Good day. We have done business before, you and I." Pike finishes his line. "You will have read the sheriff\'s door. The contract is in order, the terms are as posted, and the guild waits on the sheriff\'s mark. Stock, or something further?"' },
        { text: '"Good day." Pike does not look up from the ledger until he has finished the line. "You will have read the sheriff\'s door. The contract is in order, the terms are as posted, and the guild waits on the sheriff\'s mark. Stock, or something further?"' },
      ],
      again: '"Something further?" Pike says.',
      effects: [...BUYOUT_DUE, { set: 'sh_pike_met' }],
      passives: [{ if: { knows: 'odile_counterparty' }, label: 'insight', text: 'Somewhere behind this paper is a sheet on the Ninebridge floor, and on its back a client\'s acceptance in the hand that is too even to be a hand.' }],
      interject: [
        { companion: ODILE, text: '"Ozias," Odile says pleasantly. Pike\'s pen stops. "Miss Marchetti." It is the first time you have seen him surprised by anything.' },
        { companion: WREN, text: '"As per," Wren says, in his voice. He does not look at her.' },
        { companion: KES, text: 'Kes reads the rate card on the wall behind him and laughs once, without anything in it.' },
      ],
      options: [
        { id: 'a3sp.terms', text: 'What does the paper actually cost Shale?', once: true, next: 'paper' },
        { id: 'a3sp.now', text: 'Why now?', once: true, next: 'now' },
        { id: 'a3sp.broker', text: 'Who brokered it?', if: NOT({ knows: 'a3_mags_hand' }), check: BROKER_CHECK, next: 'broker', fail: 'broker_no' },
        ...PIKE_ROUTES,
        { id: 'a3sp.refuse', text: 'Shale isn\'t for sale.', once: true, next: 'refuse' },
        { id: 'a3sp.stock', text: 'Stock.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'a3sp.more', text: '(Something else.)', next: 'again' },
        bye,
      ],
    },
    paper: {
      text: [
        { if: NOT(JONAH_ALIVE), text: '"Three hundred Tolls of paper." He turns the ledger so you can read it, which is a courtesy and a demonstration. "The Dry Well\'s loan against its deed. Water sold to the town on credit since the pumps went short. Protection at the posted rate since the spring, which the sheriff did not pay and did not refuse. Valued, as per, against an instrument on the Ninebridge floor: SHALE — FAILS — two springs off. A debt owed by a town that fails is worth the town; the guild would rather have the town, and the town would rather be fed." He closes the ledger. "Settle the paper, and there is nothing for the contract to settle. That is not a threat. It is a clause."' },
        { text: '"Three hundred Tolls of paper." He turns the ledger so you can read it, which is a courtesy and a demonstration. "The Dry Well\'s loan against its deed. Water sold to the town on credit since the pumps went short. Protection at the posted rate, which the sheriff declined in the spring, as was her right, and has had the benefit of since, as is the guild\'s. Valued, as per, against an instrument on the Ninebridge floor: SHALE — FAILS — two springs off. A debt owed by a town that fails is worth the town; the guild would rather have the town, and the town would rather be fed." He closes the ledger. "Settle the paper, and there is nothing for the contract to settle. That is not a threat. It is a clause."' },
      ],
      again: '"Three hundred, as per," Pike says. "Valued against the instrument."',
      effects: [{ learn: 'a3_buyout_terms' }, { learn: 'a3_buyout_sheet' }],
      interject: [
        { companion: ODILE, text: 'Odile has gone very still. "Two springs off," she says, to nobody. "That\'s my date. That\'s my hand."' },
        { companion: NINE, text: '"A debt valued against a forecast of the debtor\'s death," Nine says. "The record has a word for that. The word is efficient."' },
        { companion: ILYA, text: 'Ilya counts the lines on the ledger with one finger and gets to the end. "Three hundred," he says. "For a town." He puts the finger away.' },
      ],
      options: [{ text: '(Go on.)', next: 'counter' }],
    },
    now: {
      text: '"The floor\'s book on Shale was brought forward the morning after Openfield\'s night." He says it the way he says a rate. "The holder of the instrument exercised early, and when a holder exercises, the post executes. As per." And when you ask who holds it: "A client of the floor. The floor does not say, and the post does not ask. That is what makes it a floor."',
      again: '"Brought forward," Pike says. "As per."',
      effects: [{ learn: 'a3_buyout_forward' }],
      interject: [
        { companion: TAMSIN, text: '"The morning after," Tamsin says. "The same morning the city\'s post found you. I\'d bet it\'s the same hand."' },
        { companion: NINE, text: '"Brought forward," Nine says. "The phrase is the city\'s. I have filed it four hundred times."' },
      ],
      options: [{ text: '(Go on.)', next: 'counter' }],
    },
    broker: {
      text: '"A party in Shale." He lets that stand exactly as long as a courtesy, and then, because you have earned it at the rate, he turns one page back. The Dry Well\'s account: the loan, the interest, the deed bought out, and a line in red ink across all of it: SETTLED — AS BROKERAGE — SHALE CONTRACT. "Brokers are paid on completion, as per," he says. "Mrs Durrow is not yet paid."',
      again: '"Not yet paid," Pike says.',
      effects: [{ learn: 'a3_mags_hand' }],
      options: [{ text: '(Go on.)', next: 'counter' }],
    },
    broker_no: {
      text: '"A party in Shale, as per." The ledger stays shut. "The guild does not name its brokers. Nobody would broker for it again."',
      again: '"A party in Shale," Pike says.',
      options: [{ text: '(Go on.)', next: 'counter' }],
    },
    paid: {
      text: PAID_TEXT('Three hundred'),
      again: 'SETTLED, across the contract, in Pike\'s hand.',
      effects: [{ take: 'tolls', count: 300 }, ...STAYS('paid', 'I paid Shale\'s three hundred Tolls of paper with the guild, and Pike\'s contract had nothing left to settle.', [{ trust: { npc: MAGS, by: 15 } }, { memory: { npc: PIKE, tag: 'a3_paid', valence: 10, strength: 70 } }])],
      interject: [{ companion: ODILE, text: '"Face value for a ruin," Odile says on the step outside. "My dear, I could have saved you half." But she is smiling.' }],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    odile: {
      text: [
        { if: WATER, text: 'Odile leans on the counter and lays the chrome hand flat on his ledger, over the valuation line. "Ozias. You\'ve priced a living town on my sheet as if the date were tomorrow. It\'s two springs off, my dear, and the pumps are running: you can hear them from here. A town that lives owes what a town that lives owes, which is a hundred and fifty, and you know it, because you can read and so can I." Pike looks at the hand, and then at her, for a long time. "One hundred and fifty," he says. "As per."' },
        { text: 'Odile leans on the counter and lays the chrome hand flat on his ledger, over the valuation line. "Ozias. You\'ve priced a living town on my sheet as if the date were tomorrow. It\'s two springs off, my dear, and the town is still standing in the street outside your window. A town that lives owes what a town that lives owes, which is a hundred and fifty, and you know it, because you can read and so can I." Pike looks at the hand, and then at her, for a long time. "One hundred and fifty," he says. "As per."' },
      ],
      again: '"One hundred and fifty," Pike says. "As per."',
      options: [
        { id: 'a3sp.odile.pay', text: '(Pay it. 150 Tolls)', if: TOLLS(150), next: 'paid_half' },
        { id: 'a3sp.odile.tear', text: 'Odile. The sheet.', if: SHEET('kept'), next: 'odile_tear' },
        { text: '(Not now.)', next: 'counter' },
      ],
    },
    priced: {
      text: 'He reads Teo\'s figures twice, with a finger on each line, the way he reads rates. "Marsh," he says. "He always could count." He closes the ledger on them. "One hundred and fifty, as per. The rate does move, it seems, when the buyer is right."',
      again: '"One hundred and fifty," Pike says.',
      options: [
        { id: 'a3sp.priced.pay', text: '(Pay it. 150 Tolls)', if: TOLLS(150), next: 'paid_half' },
        { text: '(Not now.)', next: 'counter' },
      ],
    },
    reprice_no: {
      text: '"Three hundred." He does not look at the figures a second time. "The rate does not move because the buyer is clever."',
      again: '"Three hundred," Pike says.',
      options: [{ text: '(Go on.)', next: 'counter' }],
    },
    paid_half: {
      text: PAID_TEXT('One hundred and fifty'),
      again: 'SETTLED, across the contract, in Pike\'s hand.',
      effects: [{ take: 'tolls', count: 150 }, ...STAYS('paid', 'Shale\'s paper with the guild was repriced on a living town, and I paid it: a hundred and fifty Tolls, and Pike\'s contract had nothing left to settle.', [{ trust: { npc: MAGS, by: 15 } }, { memory: { npc: PIKE, tag: 'a3_paid', valence: 5, strength: 70 } }])],
      interject: [{ companion: ODILE, text: '"Half," Odile says on the step outside, and does not hide that she is pleased. "That is what a town is worth when it is alive, my dear. Write it down."', effects: [A(ODILE, 5)] }],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    unwound: {
      text: `Pike takes a thin book from under the counter: the floor's list of what has been written and what unwound, which comes down the toll road a month late and is read the day it comes. He runs a finger down a page and stops. "SHALE — FAILS. Unwound. By its writer." He reads it again, which you have never seen him do. "${VOID_TAIL}`,
      again: 'UNWOUND, in the floor\'s list, under his finger.',
      effects: STAYS('void', 'The sheet Pike\'s price on Shale rested on had been torn up by the woman who wrote it, and his contract could not be valued; he took it down himself.', [{ memory: { npc: PIKE, tag: 'a3_void', valence: 0, strength: 60 } }]),
      interject: [{ companion: ODILE, text: '"I told you it was a cost," Odile says outside. "I didn\'t tell you what it would buy."', effects: [A(ODILE, 5)] }],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    tear: {
      text: `You lay it on his ledger: SHALE — FAILS — and the date, in Odile Marchetti's hand, and on the back the client's acceptance in a hand too even to be a hand. Pike knows it before you have flattened it. You tear it across, and across again, and he watches every piece. "That was the instrument," he says. "${VOID_TAIL}`,
      again: 'The pieces of the sheet in Pike\'s stove.',
      effects: [{ set: 'odile_sheet', value: 'torn' }, ...STAYS('void', 'I tore Odile\'s sheet on Shale in half on Pike\'s counter, and the guild\'s contract could not be valued; he took it down himself.', [{ memory: { npc: PIKE, tag: 'a3_void', valence: -5, strength: 60 } }])],
      interject: [{ companion: ODILE, text: '"Thank you," Odile says, very quietly, and does not say "my dear".', effects: [A(ODILE, 10)] }],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    odile_tear: {
      text: `Odile takes the sheet out of the lining of her coat, where it has lain against her ribs since the fire outside Meridian. She lays it on his ledger and smooths it once with the chrome hand. "Mine," she says. "My hand, my date. Shale was never mine to sell." She tears it across and across again, and Pike watches every piece. "${VOID_TAIL}`,
      again: 'The pieces of the sheet in Pike\'s stove.',
      effects: [{ set: 'odile_sheet', value: 'torn' }, A(ODILE, 10), ...STAYS('void', 'Odile tore her sheet on Shale in half on Pike\'s counter, and the guild\'s contract could not be valued; he took it down himself.', [{ memory: { npc: PIKE, tag: 'a3_void', valence: -5, strength: 60 } }])],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    nine_sheet: {
      text: `"There is an instrument in my second ledger," Nine says, "entered as unexercisable: written on a town by a party who has since withdrawn it, accepted by a party that does not appear in any book the floor keeps." It reads the entry to Pike word for word, at the speed it reads everything. Pike listens to the end. "An instrument the floor cannot exercise," he says at last, "is not an instrument. ${VOID_TAIL}`,
      again: 'Nine\'s second ledger, shut.',
      effects: [A(NINE, 5), ...STAYS('void', 'Assessor Nine read Odile\'s sheet on Shale out of its second ledger as unexercisable, and the guild\'s contract could not be valued; Pike took it down himself.', [{ memory: { npc: PIKE, tag: 'a3_void', valence: 0, strength: 60 } }])],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    page_lay: {
      text: 'Pike reads it the way he reads rates, and then he does not read anything for a while. "Post nine\'s hand," he says. "A road contract, confirmed and paid." He looks at the page and not at you. "Ninebridge would read this as a post that pays for a killing and loses its own ledger pages. I would not be promoted. I would not be employed." He takes up his pen and writes WITHDRAWN across the contract, as neatly as he writes everything. "The guild withdraws its offer to Shale. As per." He does not ask for the page. "Keep it," he says. "We both know what it says."',
      again: 'WITHDRAWN, across the contract, in Pike\'s hand.',
      effects: STAYS('exposed', 'I laid the Tollhouse page beside Pike\'s ledger, and the guild withdrew its contract on Shale rather than have Ninebridge read it.', [{ memory: { npc: PIKE, tag: 'a3_page', valence: -40, strength: 100 } }, { rep: { faction: 'tollmen', respect: -10 } }]),
      interject: [{ companion: WREN, text: '"He fears his own guild more than he fears you," Wren says outside. "Remember that. It\'s useful."' }],
      options: [{ text: '(Go on.)', next: 'after' }],
    },
    refuse: {
      text: '"Then the contract waits on the sheriff\'s mark, as contracts do." He is not unkind about it. "My hands keep her office until she signs; that is their right, as witnesses. Should anyone in Shale break the peace with them, the contract executes on the sheriff\'s failure to keep it: clause four." He turns the ledger so you can read clause four. "I do not threaten, {name}. I read clauses aloud."',
      again: '"Clause four," Pike says.',
      effects: [{ learn: 'a3_buyout_clause' }],
      options: [{ text: '(Go on.)', next: 'counter' }],
    },
    after: {
      text: [
        { if: F('a3_pike', 'paid'), text: '"Paid, as per." Pike does not look up. "The guild is always paid, in the end. It is the one thing about the guild that is never a surprise."' },
        { if: F('a3_pike', 'void'), text: '"The post holds no paper on Shale." He seems to find it restful. "Stock?"' },
        { if: F('a3_pike', 'exposed'), text: '"The guild has withdrawn its offer to Shale," Pike says, without warmth or its opposite. "Stock?"' },
        { if: F('a3_pike', 'robbed'), text: '"The post\'s strongbox was opened, and a paper taken," Pike says. "The guild will not pursue it. There is no longer a contract to pursue it under, as per."' },
        { if: F('a3_pike', 'put_off'), text: '"The post\'s hands were put off the sheriff\'s street," Pike says. "The guild will remember it, as per. The guild remembers everything; that is what a ledger is."' },
        { if: F('a3_pike', 'signed'), text: '"The office is kept, as per." Pike writes a line. "The sheriff\'s pension is paid on the first of the month, at this counter. She is very prompt."' },
        { text: '"The offer does not expire," Pike says. "The guild\'s offers never do. That is what the guild is."' },
      ],
      again: '"Something further?" Pike says.',
      options: [
        { id: 'a3sp.after.stock', text: 'Stock.', effects: [{ event: 'barter' }], exit: true, repeat: true },
        { id: 'a3sp.after.more', text: '(Something else.)', next: 'again' },
        bye,
      ],
    },
    shut: {
      text: '"The post does not trade during a breach of the peace." The shutter comes down between you.',
      again: 'The shutter, down.',
      options: [{ text: '(Leave.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- Mags (and Teo, at his table)

export const d_a3_mags: DialogueDef = {
  id: 'd_a3_mags', owner: MAGS,
  start: [
    { if: FIGHTING, node: 'down' },
    { if: RIDE_OPEN, node: 'a3' },
    { if: ALL(A3_OPEN, F('a3_shale')), node: 'after' },
    ...d_sh_mags.start,
  ],
  nodes: {
    ...d_sh_mags.nodes,
    a3: {
      text: [
        { if: F('a3_mags', 'told'), text: '"I told her," Mags says. "She said noted. Thirty years, and she said noted." She pours you one anyway. "That\'s on the house."' },
        { if: F('a3_mags', 'exposed'), text: '"You told her." Mags puts the glass down. "Course you did. Somebody had to, and it was never going to be me." She pours. "Drink?"' },
        { if: F('a3_mags', 'kept'), text: '"Our secret, love," Mags says, and pours before you ask.' },
        { text: '"Well, look at you." Mags doesn\'t look at you. She is polishing the same glass she was polishing when you came in, and it was clean then. "Drink? It\'s on the house. Everything\'s on the house today, love. I\'ve decided."' },
      ],
      again: '"Anything else, love?"',
      effects: [...BUYOUT_DUE, { set: 'sh_mags_met' }],
      options: [
        { id: 'a3sm.door', text: 'You\'ve seen the sheriff\'s door.', if: NOT(F('a3_mags')), once: true, next: 'door' },
        { id: 'a3sm.hand', text: 'The Dry Well\'s account. SETTLED, AS BROKERAGE, SHALE CONTRACT, in red, in Pike\'s ledger.', if: ALL({ knows: 'a3_mags_hand' }, NOT(F('a3_mags'))), next: 'confess' },
        { id: 'a3sm.ask', text: 'Who brokered it, Mags?', if: ALL(NOT({ knows: 'a3_mags_hand' }), NOT(F('a3_mags')), { seen: 'a3sm.door' }), check: MAGS_CHECK, next: 'confess', fail: 'ask_no' },
        { id: 'a3sm.teo', text: 'Teo. You read numbers. Read this for me.', if: ALL(TEO_HERE, ANY(PRICE_KNOWN, { knows: 'a3_buyout_read' }), NOT(WITHERS), NOT({ knows: 'a3_buyout_priced' })), next: 'teo_reads' },
        { id: 'a3sm.teo.fair', text: 'Teo. You read numbers. Read this for me.', if: ALL(TEO_HERE, ANY(PRICE_KNOWN, { knows: 'a3_buyout_read' }), WITHERS, NOT({ knows: 'a3_buyout_fair' })), next: 'teo_fair' },
        { id: 'a3sm.menu', text: 'Let\'s see what you\'ve got.', next: 'menu' },
        bye,
      ],
    },
    door: {
      text: '"Everybody\'s seen it, love. Half the town\'s seen nothing else since the morning it went up." She holds the glass to the window. "Ada\'s been at that desk with the pen since. Hasn\'t signed. Hasn\'t not. Comes in here at seven and has one and doesn\'t talk, which for Ada is the same as talking." She puts the glass down. "Pike\'s two stand at her door all night like a pair of coats on a peg. Drink?"',
      again: '"A pair of coats on a peg," Mags says.',
      options: [{ text: '(Go on.)', next: 'a3' }],
    },
    confess: {
      text: [
        { if: NOT(JONAH_ALIVE), text: '"Course it\'s me." She sets the glass down. "Pike lent against the deed when the pumps went short; you know that, you read it. What you didn\'t read: in the spring he came back with that paper and said bring the sheriff to the table and the brokerage settles my account. Deed back. Clean." She pours two and drinks neither. "After Jonah she stopped sleeping. And I thought: she\'ll sign, and she\'ll live. I\'ve known three sheriffs in this town, love, and two of them are in the yard behind the pump house. I bought her a way out that doesn\'t end in that yard, and I got my bar back for it, and I\'m not going to stand here and pretend I didn\'t want the bar." She pushes one glass across. "That\'s on the house."' },
        { text: '"Course it\'s me." She sets the glass down. "Pike lent against the deed when the pumps went short; you know that, you read it. What you didn\'t read: in the spring he came back with that paper and said bring the sheriff to the table and the brokerage settles my account. Deed back. Clean." She pours two and drinks neither. "And I thought: she\'ll sign, and she\'ll live. I\'ve known three sheriffs in this town, love, and two of them are in the yard behind the pump house. I bought her a way out that doesn\'t end in that yard, and I got my bar back for it, and I\'m not going to stand here and pretend I didn\'t want the bar." She pushes one glass across. "That\'s on the house."' },
      ],
      again: '"I bought her a way out," Mags says. "And my bar."',
      effects: [{ learn: 'a3_mags_hand' }],
      interject: [
        { companion: TAMSIN, text: '"You did it for both of you," Tamsin says. "That isn\'t the same as doing it for her." Mags looks at her a long time. "No, love," she says. "It isn\'t."' },
        { companion: ODILE, text: '"A broker who believes in the trade," Odile says. "The most dangerous kind, my dear. I should know."' },
        { companion: ILYA, text: '"Two in the yard," Ilya says. "I carried the second one." Mags doesn\'t answer him, which is an answer.' },
      ],
      options: [
        { id: 'a3sm.tell', text: 'Then tell her yourself, Mags. Before somebody else does.', next: 'told' },
        { id: 'a3sm.expose', text: 'She should hear it. I\'ll tell her.', next: 'will_tell' },
        { id: 'a3sm.keep', text: 'It stays between us.', next: 'kept' },
      ],
    },
    told: {
      text: '"Before somebody else does." She looks at you a long time, and then she takes her apron off, which you have never seen her without, and folds it on the bar. "Nell. Bar." She goes out and across the street to the sheriff\'s office, and the door shuts behind her, and it is a long while before it opens again. When she comes back her eyes are dry and her face is not. "She said noted," Mags says. "Thirty years, and she said noted." She ties the apron back on. "Drink?"',
      again: 'The apron back on, and the bar between you.',
      effects: [{ set: 'a3_mags', value: 'told' }, { trust: { npc: MAGS, by: 10 } }, { memory: { npc: ADA, tag: 'a3_mags_told', valence: 10, strength: 90 } }, { memory: { npc: MAGS, tag: 'a3_told_ada', valence: 15, strength: 90 } }],
      interject: [{ companion: TAMSIN, text: '"That took something," Tamsin says when Mags is back. "Whatever she sold, that took something."', effects: [A(TAMSIN, 3)] }],
      options: [{ text: '(Go on.)', next: 'a3' }],
    },
    will_tell: {
      text: '"Then go on." She takes the glass you didn\'t drink and pours it back in the bottle, which you have never seen her do either. "Go and tell her, love. I\'ll be here. I\'m always here. That was the whole point."',
      again: '"Go on, then," Mags says.',
      options: [{ text: '(Go.)', exit: true }],
    },
    kept: {
      text: '"Between us." She breathes out, all the way, the way people do when they have been holding it since spring. "Then there\'s a room in this town for you for as long as there\'s a town. And a bottle." She pours. "That one\'s on the house as well."',
      again: '"Between us," Mags says, and pours.',
      effects: [{ set: 'a3_mags', value: 'kept' }, { trust: { npc: MAGS, by: 10 } }, { set: 'shale_room' }, { memory: { npc: MAGS, tag: 'a3_kept_hand', valence: 20, strength: 90 } }],
      options: [{ text: '(Go on.)', next: 'a3' }],
    },
    ask_no: {
      text: '"Who brokers anything in Shale?" A big smile, all teeth. "The weather, love. Drink?"',
      again: '"The weather," Mags says.',
      options: [{ text: '(Go on.)', next: 'a3' }],
    },
    teo_reads: {
      speaker: TEO,
      text: 'Teo reads it the way he reads everything, with his lips moving and a finger under the line, apologising to it. "Well, it\'s — I\'m sorry, it\'s priced on a corpse. Three hundred is what Shale owes if Shale is gone in two springs: a dead town\'s paper is worth the town, so they take the town. But a town that lives pays what it owes over years, and a living Shale owes —" the finger goes down three lines and comes back "— a hundred and forty. A hundred and fifty, to a man who likes round numbers." He looks up. "Pike likes round numbers. I\'m sorry. I\'ve explained the numbers. Nobody ever wants the numbers explained."',
      again: '"A hundred and fifty," Teo says, "to a man who likes round numbers."',
      effects: [{ learn: 'a3_buyout_priced' }, { learn: 'a3_buyout_sheet' }],
      options: [{ text: '(Go on.)', next: 'a3' }],
    },
    teo_fair: {
      speaker: TEO,
      text: 'Teo reads it with his lips moving and a finger under the line, and then reads it again, hoping. "I\'m sorry," he says. "It\'s priced on a town that fails in two springs, and the pumps are on their clock, and the clock\'s slowing. I\'ve been counting the bursts." He puts the paper down very gently. "It\'s a fair price. That\'s the worst thing I can tell you about it."',
      again: '"A fair price," Teo says. "I\'m sorry."',
      effects: [{ learn: 'a3_buyout_fair' }, { learn: 'a3_buyout_sheet' }],
      options: [{ text: '(Go on.)', next: 'a3' }],
    },
    after: {
      text: [
        { if: F('a3_shale', 'company'), text: '"Guild bar now, love," Mags says, and pours. "Guild town. Somebody\'s got to run it who knows everybody\'s name, and it\'s me." She doesn\'t look happy about it. She doesn\'t look unhappy. "First one\'s still on the house."' },
        { if: F('a3_shale', 'dogs'), text: '"Dogs drink for free now," Mags says. "House rule, theirs. So I\'m giving it away to everybody, and they can sort out who\'s who."' },
        { if: F('a3_shale', 'abandoned'), text: '"Half the street went east this week," Mags says, counting barrels. "I\'ll go when these are empty. Not before."' },
        { if: F('ks_ada', 'dead'), text: '"Don\'t," Mags says, before you can say anything. "Just drink." She pours two and drinks both.' },
        { text: '"She\'s still in that chair," Mags says, and pours you one without being asked. "Stubborn cow. That\'s on the house."' },
      ],
      again: '"Anything else, love?"',
      options: [{ id: 'a3sm.after.menu', text: 'Let\'s see what you\'ve got.', next: 'menu' }, bye],
    },
    down: {
      text: '"Not now, love!" Mags is behind the bar with Nell pulled down beside her and the bottle she keeps for emergencies in her other hand, by the neck.',
      again: '"Not now!"',
      options: [{ text: '(Leave.)', exit: true }],
    },
  },
};

// ---------------------------------------------------------------- the guild's hands at the sheriff's door

/** The guild's hands drawn on: the militia join the player (their `ally`), and the street's end is told after. */
const FOUGHT: Effect[] = [
  { set: 'a3_sh_fight' }, { set: 'a3_pike', value: 'put_off' }, { rep: { faction: 'tollmen', respect: -15, fear: 5 } },
  { decision: { id: 'a3_shale_fight', text: 'I drew on the guild\'s two hands at the sheriff\'s door in Shale.' } },
  { event: 'combat' },
];
/** Counted off the street without a shot. */
const COUNTED: Effect[] = STAYS('put_off', 'Shale\'s militia came out into the street behind me and the guild\'s hands counted them and walked back to the post.', [
  { rep: { faction: 'tollmen', respect: -10, fear: 5 } }, { trust: { npc: ISSA, by: 10 } }, { memory: { npc: PIKE, tag: 'a3_put_off', valence: -15, strength: 80 } },
]);

const MUSTER_TEXT = mix([
  [{ if: DRILLED, t: 'Issa Lind comes out of the yard at a walk with the militia behind her in pairs, nine of them, rifles at the port, and spreads them along the street without a word, and every one of them is looking at the guild\'s two hands and at nothing else.' },
    { t: 'Issa Lind comes out of the yard with what the militia has: four who shoot and five who hold a rifle the right way round, and she puts the four in front.' }],
  [{ if: JONAH_ALIVE, t: ' Jonah Reese comes last, and stands at the sheriff\'s door with his hand on the frame, the way a man stands who has decided where he is going to be.' }, { t: '' }],
  [{ if: F('wren_exodus'), t: ' Up the street, Calloway\'s people come out of the tannery to watch, and do not go back in.' }, { t: '' }],
], (militia, jonah, wren) => `${militia}${jonah}${wren} Harth looks at them all, one at a time, the way his factor reads a ledger.`);

export const d_a3_hands: DialogueDef = {
  id: 'd_a3_hands', owner: ESKO,
  start: [
    { if: F('a3_sh_fight'), node: 'hostile' },
    { if: RIDE_OPEN, node: 'door' },
    { node: 'office' },
  ],
  nodes: {
    door: {
      text: '"Afternoon." The older of the two guild hands at the sheriff\'s door touches his hat. He wears a guild coat faded to the colour of the road and holds a shotgun the way a man holds a broom. "Esko Harth, post nine-west, and that\'s Tamar Quaid. We\'re witnesses. When the sheriff makes her mark, we see the office kept." The woman with him says nothing. She is counting the militia on the street, and from her face she has counted them before. "Nobody\'s going anywhere," Harth says. "That\'s the job."',
      again: '"Still witnesses," Harth says. "Still nobody going anywhere."',
      effects: BUYOUT_DUE,
      options: [
        { id: 'a3sg.long', text: 'How long will you stand here?', once: true, next: 'long' },
        { id: 'a3sg.off', text: 'Get off Shale\'s street.', next: 'street' },
        bye,
      ],
    },
    long: {
      text: '"Till she signs." He shrugs. "Pike pays by the day, and the day\'s long. I\'ve stood at worse doors. I stood at one in Ninebridge for a man who never came out." Quaid says, without turning her head: "He came out." "Not the way he went in."',
      again: '"Till she signs," Harth says.',
      options: [{ text: '(Go on.)', next: 'door' }],
    },
    street: {
      text: '"On whose word?" Harth doesn\'t move his hands. "The sheriff hasn\'t said it, and the sheriff\'s is the only word on this street that isn\'t Pike\'s." Quaid has stopped counting the militia and started looking at you.',
      again: '"On whose word?" Harth says again.',
      options: [
        { id: 'a3sg.muster', text: '(Call the militia out.)', if: ANY(ISSA_HERE, { member: 'shale_militia' }), next: 'muster' },
        { id: 'a3sg.draw', text: '(Put your hand on your weapon.)', next: 'draw_ask' },
        { text: 'Never mind.', next: 'door' },
      ],
    },
    muster: {
      text: MUSTER_TEXT,
      again: 'The militia along the street, and the guild\'s two hands at the door.',
      interject: [{ companion: ILYA, text: 'Ilya unslings the rifle and stands at the end of the militia\'s line, where he used to stand, and does not say anything at all.' }],
      options: [
        { id: 'a3sg.count', text: '(Tell them to count.)', if: DRILLED, next: 'put_off' },
        { id: 'a3sg.count.few', text: '(Tell them to count.)', if: NOT(DRILLED), check: COUNT_CHECK, next: 'put_off', fail: 'hold' },
        { id: 'a3sg.draw.muster', text: '(Put your hand on your weapon.)', next: 'draw_ask' },
        { text: '(Send the militia back to the yard.)', next: 'door' },
      ],
    },
    hold: {
      text: '"Four," Quaid says. It is the first word she has said. "I count four." Harth sighs, the way a man sighs at a long day. "We\'re witnesses," he says. "We don\'t leave because somebody counted."',
      again: '"We don\'t leave because somebody counted," Harth says.',
      options: [
        { id: 'a3sg.draw.hold', text: '(Put your hand on your weapon.)', next: 'draw_ask' },
        { text: '(Send the militia back to the yard.)', next: 'door' },
      ],
    },
    put_off: {
      text: 'Harth counts. It doesn\'t take him long. "Well," he says to Quaid, "we were witnesses." He breaks the shotgun over his arm, which in the Sallow is a whole sentence, and the two of them walk back to the post at a pace that is not a retreat and is not anything else either. Pike watches them come in through his window, and comes out, and takes his notice down off the sheriff\'s door himself, four nails and all. "No witnesses, no possession," he says, to nobody. "As per." Behind you, in the office, Ada Vey puts the pen in the drawer.',
      again: 'The street, and the militia going back to the yard in pairs.',
      effects: COUNTED,
      interject: [
        { companion: WREN, text: '"Nobody shot," Wren says. "Write that down somewhere."', effects: [A(WREN, 5)] },
        { companion: KES, text: '"They counted," Kes says. "Guild people always count. It\'s the only thing you can rely on."', effects: [A(KES, 3)] },
        { companion: TAMSIN, text: '"Knock should have had a militia," Tamsin says, watching them go back to the yard. "Once. Just once."', effects: [A(TAMSIN, 3)] },
      ],
      options: [{ text: '(Go on.)', exit: true }],
    },
    draw_ask: {
      text: '"You\'ll be breaking the peace on her street," Harth says, very calmly, "and clause four says what happens then." His hands still haven\'t moved. Quaid\'s have. Behind you the office door is open, and if it comes to shooting in Shale\'s street, the sheriff will come out into it. She always comes out.',
      again: 'Harth\'s hands, still. Quaid\'s, not.',
      options: [
        { id: 'a3sg.draw.yes', text: '(Draw.)', effects: FOUGHT, exit: true },
        { id: 'a3sg.draw.no', text: '(Take your hand off it.)', next: 'door' },
      ],
    },
    hostile: { text: 'The guild\'s hands are past talking.', again: 'Past talking.', options: [{ text: '(Nothing.)', exit: true }] },
    office: {
      text: [
        { if: F('a3_shale', 'company'), text: '"The office is kept," Harth says from the sheriff\'s chair, his hat on her desk. "As per. You want something filed, it goes through the post." He does not seem to enjoy saying it, or not to.' },
        { text: 'Nobody is keeping the door.' },
      ],
      again: '"Through the post," Harth says.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- the street, after a fight (the trigger, or Issa)

const AFTER_TEXT = mix([
  [{ if: ADA_FALLS, t: 'Ada Vey is lying in front of her own door with her revolver in her hand. She came out when the shooting started, the way she always said she would, and there was nobody at her shoulder: four rifles that shoot and no deputy. Issa Lind is kneeling by her with both hands pressed where they will do no good, saying her name the way you say a name you have said every day for nine years. Ada looks at the sky over the pumps. "Noted," she says, or something like it, and then she doesn\'t say anything.' },
    { if: JONAH_ALIVE, t: 'Ada Vey is on her own step with her revolver in her hand and Jonah Reese in front of her, where he put himself when the shooting started and stayed, with a hole in his coat and none in him. She looks at the guild\'s two hands in her street, and then at you, and puts the revolver away. "Noted," she says.' },
    { t: 'Ada Vey is in the street with her revolver in her hand, and Issa Lind\'s pairs closed round her so tight when the shooting started that she never got a clear shot at anything. She looks at you over Issa\'s shoulder, at the guild\'s two hands in her street, and puts the revolver away. "Noted," she says.' }],
], (ada) => `When it is over the street is very quiet, and then it isn't. ${ada}`);

const AFTER_NODES: Record<string, NodeDef> = {
  after: {
    speaker: 'narrator',
    text: AFTER_TEXT,
    again: 'The street, after.',
    options: [
      { id: 'a3sx.fell.abandoned', text: '(Go on.)', if: ALL(ADA_FALLS, WITHERS), next: 'fell_abandoned' },
      { id: 'a3sx.fell.dogs', text: '(Go on.)', if: ALL(ADA_FALLS, NOT(WITHERS), COUP), next: 'fell_dogs' },
      { id: 'a3sx.fell.free', text: '(Go on.)', if: ALL(ADA_FALLS, NOT(WITHERS), NOT(COUP)), next: 'fell_free' },
      { id: 'a3sx.stood', text: '(Go on.)', if: NOT(ADA_FALLS), next: 'stood' },
    ],
  },
  stood: {
    speaker: 'narrator',
    text: 'Pike comes out of the post when the street is quiet and takes his notice down off her door himself, four nails and all. "No witnesses, no possession," he says, to nobody. "As per." He goes back in. The guild sends no more hands to Shale.',
    again: 'Four nails in the sheriff\'s door.',
    effects: [{ set: 'a3_sh_after' }, ...STAYS('put_off', 'I put the guild\'s hands off Shale\'s street with the militia, and Ada Vey kept the star.', [{ memory: { npc: PIKE, tag: 'a3_put_off', valence: -30, strength: 100 } }])],
    interject: [{ companion: NINE, text: '"Two dead for a contract that would have executed on a signature," Nine says. "The record will enter it as a breach of the peace. I will enter it as a cost."', effects: [A(NINE, -3)] }],
    options: [{ text: '(Go on.)', exit: true }],
  },
  fell_free: {
    speaker: 'narrator',
    text: 'They bury her in the yard behind the pump house the next morning, beside the two sheriffs she was deputy to. Issa Lind takes the star off her coat before they close the box and pins it on her own, and nobody in Shale says anything about it, because there is nothing to say. Pike sends no more hands. Shale is nobody\'s but its own, and it paid for that today.',
    again: 'A new mound in the yard behind the pump house.',
    effects: FELL('free'),
    interject: [
      { companion: ILYA, text: 'Ilya stands at the back while they fill it in. "I carried the second one," he says, to nobody. "I should have carried this one."', effects: [A(ILYA, -10)] },
      { companion: TAMSIN, text: '"She came out," Tamsin says. "Everyone said she would."', effects: [A(TAMSIN, -5)] },
    ],
    options: [{ text: '(Go on.)', exit: true }],
  },
  fell_dogs: {
    speaker: 'narrator',
    text: 'They bury her in the yard behind the pump house the next morning, beside the two sheriffs she was deputy to. By the next dusk there are riders on the west road. With no sheriff, and the militia still black-banded from the burying, nobody stops the Dogs at the pumps; they ride in at a walk and take the office the way you would take a chair somebody had got up from. Pike sends no more hands. He does not need to.',
    again: 'Dogs at the sheriff\'s door.',
    effects: FELL('dogs'),
    interject: [{ companion: ILYA, text: 'Ilya watches the Dogs ride in from the end of the street, with the rifle across his chest. He doesn\'t raise it. "Not today," he says. "Not on her day."', effects: [A(ILYA, -10)] }],
    options: [{ text: '(Go on.)', exit: true }],
  },
  fell_abandoned: {
    speaker: 'narrator',
    text: 'They bury her in the yard behind the pump house the next morning, beside the two sheriffs she was deputy to. By the end of the week there are carts on the east road with families on them, because a town with no sheriff and pumps on a clock is a town that will be gone by the date on somebody\'s sheet, and everybody in Shale can read a date.',
    again: 'Carts on the east road.',
    effects: FELL('abandoned'),
    interject: [{ companion: TAMSIN, text: '"Everybody\'s leaving," Tamsin says. "That\'s what it looks like from the outside. I never knew."', effects: [A(TAMSIN, -5)] }],
    options: [{ text: '(Go on.)', exit: true }],
  },
};

export const d_a3_street: DialogueDef = {
  id: 'd_a3_street', owner: 'narrator',
  start: [
    { if: ALL(F('a3_sh_fight'), NOT(F('ks_ada')), HANDS_DOWN), node: 'after' },
    { if: ALL(F('a3_sh_fight'), NOT(F('ks_ada'))), node: 'still' },
    { node: 'quiet' },
  ],
  nodes: {
    ...AFTER_NODES,
    still: { text: 'The guild\'s hands are still in the street.', again: 'Still in the street.', options: [{ text: '(Fight.)', exit: true }] },
    quiet: { text: 'Shale\'s main street: the pumps, the saloon, the sheriff\'s door.', again: 'The main street.', options: [{ text: '(Go on.)', exit: true }] },
  },
};

// ---------------------------------------------------------------- Issa and Jonah

const ISSA_RIDE = mix([
  [{ if: DRILLED, t: 'Nine rifles that shoot, and they\'d all be in that street if she said the word.' }, { t: 'Four that shoot. Five that hold a rifle the right way round.' }],
], (rifles) => `"You've seen the door." Issa Lind doesn't stop cleaning the rifle. "She hasn't signed. She hasn't said she won't. ${rifles} She won't say it." She sights down the barrel at nothing. "Nine years and she's never once said the word."`);

export const d_a3_militia: DialogueDef = {
  id: 'd_a3_militia', owner: ISSA,
  start: [
    { if: ALL(F('a3_sh_fight'), NOT(F('ks_ada')), HANDS_DOWN), node: 'after' },
    { if: FIGHTING, node: 'busy' },
    { if: RIDE_OPEN, node: 'ride' },
    { if: ALL(A3_OPEN, F('ks_ada')), node: 'settled' },
    ...d_sh_issa.start,
  ],
  nodes: {
    ...d_sh_issa.nodes,
    ...AFTER_NODES,
    ride: {
      text: ISSA_RIDE,
      again: '"Say what you need," Issa says. "They\'re waiting on me."',
      effects: BUYOUT_DUE,
      options: [
        { id: 'a3si.street', text: 'If it came to the guild\'s men in the street?', once: true, next: 'if_street' },
        { id: 'a3si.more', text: '(Something else.)', next: 'intro' },
        bye,
      ],
    },
    if_street: {
      text: [
        { if: ADA_FALLS, text: '"Then we\'re in the street." Flat. "And so\'s she, because she\'d come out. She always comes out; that\'s the thing nobody in this town says." She looks at the office door. "If she comes out with four rifles behind her and no deputy beside her, I don\'t know that I can keep her standing. I\'ve thought about it. I don\'t know."' },
        { if: DRILLED, text: '"Then we\'re in the street, in pairs, and she\'s in the middle of us, because she\'d come out. She always comes out." She almost smiles. "That\'s what the pairs are for. We keep her standing."' },
        { text: '"Then we\'re in the street. And so\'s she, because she\'d come out; she always comes out. And the deputy would be in front of her before she was off the step." She looks at the office door. "He would. That\'s the trouble with him."' },
      ],
      again: '"She always comes out," Issa says.',
      effects: [{ learn: 'a3_buyout_street' }],
      options: [{ text: '(Go on.)', next: 'ride' }],
    },
    busy: { text: '"Not now!" Issa is already moving, two of hers behind her.', again: '"Not now!"', options: [{ text: '(Fight.)', exit: true }] },
    settled: {
      text: [
        { if: F('ks_ada', 'dead'), text: 'Issa wears the star now, on her coat where it doesn\'t sit right. "Don\'t," she says, before you can. "Pairs on the street. All night. That was the last thing she signed, and I\'m keeping it."' },
        { if: F('ks_ada', 'resigns'), text: '"She rode out," Issa says. "The guild\'s hands walk my street now. I walk it behind them, and they don\'t like it, and I don\'t care."' },
        { text: '"Pairs on the street," Issa says. "Ada signed it again. Different paper."' },
      ],
      again: '"Eyes up," Issa says.',
      options: [{ id: 'a3si.settled.more', text: '(Something else.)', next: 'intro' }, bye],
    },
  },
};

export const d_a3_jonah: DialogueDef = {
  id: 'd_a3_jonah', owner: JONAH,
  start: [
    { if: RIDE_OPEN, node: 'ride' },
    { if: ALL(A3_OPEN, F('ks_ada')), node: 'settled' },
    ...d_sh_jonah.start,
  ],
  nodes: {
    ...d_sh_jonah.nodes,
    ride: {
      text: '"{name}." He has stopped saying sir or ma\'am to you; he says your name now, as if he has been practising. He is on the office step with his books shut on his knee, which you have never seen. "She hasn\'t signed it. She keeps picking up the pen." He looks at the door behind him. "I told her I\'m not going anywhere. I don\'t think she heard me. I don\'t think she wants to."',
      again: '"Still on the step," Jonah says.',
      effects: BUYOUT_DUE,
      options: [
        { id: 'a3sj.see', text: 'Then stay where she can see you.', once: true, next: 'see' },
        bye,
      ],
    },
    see: {
      text: '"I\'m on the step," he says. "She has to step over me to get to Pike\'s." He almost smiles. "She will, if she means it. But she\'ll have to step over me."',
      again: '"She\'ll have to step over me," Jonah says.',
      options: [{ text: '(Go on.)', next: 'ride' }],
    },
    settled: {
      text: [
        { if: F('ks_ada', 'resigns'), text: '"I gave the guild my badge," Jonah says. "They gave me a receipt for it." He shows you. "I kept the books."' },
        { if: F('a3_shale', 'dogs'), text: '"The Dogs have the office," Jonah says. "I have the step. I\'m not giving them the step."' },
        { text: '"Still deputy," Jonah says. "Still reading." He holds up a book: it is a book about law, very old, with most of the pages. "Somebody has to know what it says."' },
      ],
      again: '"Still here," Jonah says.',
      options: [bye],
    },
  },
};

// ---------------------------------------------------------------- the strongbox, and the Dogs in a Dogs' town

export const d_a3_safe: DialogueDef = {
  id: 'd_a3_safe', owner: 'narrator',
  start: [
    { if: F('a3_sh_safe'), node: 'empty' },
    { if: RIDE_OPEN, node: 'box' },
    { node: 'look' },
  ],
  nodes: {
    look: {
      text: 'A guild strongbox bolted to the floor behind the counter: plate steel, two locks, the half-moon stamped on the lid. The post\'s paper lives in it, and Pike has the only keys, on a chain he does not take off.',
      again: 'The guild\'s strongbox, two locks.',
      options: [leave],
    },
    box: {
      text: [
        { if: NIGHT, text: 'The post is dark, and Pike gone to wherever Pike sleeps. The guild\'s strongbox squats behind the counter, two locks, the half-moon on the lid. Whatever paper the post holds on Shale is in it.' },
        { text: 'The guild\'s strongbox squats behind the counter, two locks, the half-moon on the lid, and Pike sits three feet from it writing in his ledger. Not now.' },
      ],
      again: 'The strongbox, two locks.',
      options: [
        { id: 'a3ss.open', text: '(Work the locks.)', if: NIGHT, check: SAFE_CHECK, next: 'taken', fail: 'stuck' },
        leave,
      ],
    },
    taken: {
      text: 'The first lock gives at the second pick and the second at the fourth. Inside, in a guild folder, the post\'s own copy of the contract: SHALE — CONTRACT OF PROTECTION, the town\'s debts in a column, the valuation clause, the brokerage line, a blank for the sheriff\'s mark and under it, signed and dated in advance, Pike\'s countersignature. Without it the guild has a notice on a door and nothing to execute.',
      again: 'The strongbox, locked again, and lighter.',
      effects: [{ give: 'k_a3_contract' }, { set: 'a3_sh_safe' }, { time: 30 }, { learn: 'a3_buyout_terms' }, { learn: 'a3_buyout_sheet' }, { decision: { id: 'a3_shale_safe', text: 'I opened the guild\'s strongbox in Shale at night and took out the post\'s copy of the contract on the town.' } }],
      interject: [{ companion: KES, text: '"Two locks," Kes says. "Guild people always think two is a lot."' }],
      options: [{ text: '(Lock it again and go.)', exit: true }],
    },
    stuck: {
      text: 'The second lock does not give. Not tonight, and not to these hands.',
      again: 'The second lock, which does not give.',
      options: [leave],
    },
    empty: {
      text: 'The strongbox, locked again, and lighter than it was.',
      again: 'The strongbox.',
      options: [leave],
    },
  },
};

export const d_a3_dogs: DialogueDef = {
  id: 'd_a3_dogs', owner: 'npc_a3_g13',
  start: [{ node: 'door' }],
  nodes: {
    door: {
      text: [
        { if: VASHA, text: '"Office is Kade\'s." The Dog on the sheriff\'s bench doesn\'t get up. "Water\'s the tithe. Twice a year, every year, and nobody has to be shot about it. Kade says that\'s protection." He grins. "Guild pays us to say it, too."' },
        { text: '"Office is the pack\'s." The Dog on the sheriff\'s bench doesn\'t get up. "Water\'s the tithe. Twice a year, every year, and nobody has to be shot about it. That\'s protection." He grins. "Guild pays us to say it, too."' },
      ],
      again: '"Twice a year," the Dog says. "Every year."',
      options: [bye],
    },
  },
};

export const A3_SHALE_DIALOGUES: DialogueDef[] = [d_a3_notice, d_a3_ada, d_a3_pike, d_a3_mags, d_a3_hands, d_a3_street, d_a3_militia, d_a3_jonah, d_a3_safe, d_a3_dogs];
