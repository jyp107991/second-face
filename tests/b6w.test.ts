import { beforeAll, describe, expect, it } from 'vitest';
import { DIALOGUES, MAPS, NPCS } from '../src/content';
import { EP_SPECS } from '../src/content/dialogue/a3_epilogue';
import { EP_NODE } from '../src/content/dialogue/a3_epilogue_kit';
import {
  B_MEANS, C_BUYER, CLAUSES, D_ARCHIVE, D_PEOPLE, D_READER, D_VOICE, E_FILE, E_PREC, E_REG, EP_SKY, EP_SLIDES, M1_LEASH, M2_SINK, M3_HALCYON, M4_CISTERN,
  M5_HOUNDS, M6_SASH, M7_SKY, MODS, CRATES_FIGHTING, SKY_FIGHTING, SKY_GUARDS, THAD_CRATES, VAULT_FIGHTING, VAULT_WARDENS, modValue, type Mod,
} from '../src/content/world/a3_conds';
import { DialogueRunner, type OptionDef } from '../src/engine/dialogue/dialogue';
import { apply, test as cond, type Cond, type Effect } from '../src/engine/world/logic';
import { actThree, type G, type Over, type Preset } from './a3_fixture';
import {
  archive, atDesk, charge, has, court, desk, door, down, earliest, eff, epilogue, finish, fork, goUp, holds, home, kill, mast, muster, officer, readOrder, ready,
  recorded, REFUSE, register, reload, SASH_FOR, summons, talk, trig, WAYS, type Game, type Pick, type Sess, type Way,
} from './b6w_fixture';

/**
 * B6w — the ending playtests. Act 3 played as a player plays it: from the earliest Act 3 save (Acts 1–2 closed, the post not yet
 * come) through the order, the road home, the door, the card and the close, gathering the Act 3 alternates in their own scenes;
 * then "(Go up.)", the "Before the steps" save written as the event fired and read back through the real codec; and from that
 * loaded copy, every ending: the steps, the stair, the desk, the climax, every page of the epilogue and the credits. On the
 * prepared game and the hostile one; every route through every climax with each failed check; the modifiers and every slide
 * against what the climaxes write; companions waiting and travelling; a save at every beat; and every modifier value reached by a
 * script. Headless, with the shared Act 3 fixture and B6w's playtest kit (tests/b6w_fixture.ts).
 */

type Flags = Record<string, string | number | boolean>;
const TAMSIN = 'npc_c9_03', WREN = 'npc_rd_03', ILYA = 'npc_sh_17';

// ---------------------------------------------------------------- the runs

/** The long run to the close: the order read (and the player trains), the muster written (a thorough game met everyone), the Court
 * and the register, home, the Archive, the door, the hill, the card and the close, the officer's paper and the charge. */
async function toClose(preset: Preset, over: Over = {}): Promise<Game> {
  const a = await earliest(preset, over);
  readOrder(a);
  muster(a, preset === 'prepared');
  court(a);
  register(a);
  home(a);
  archive(a);
  door(a);
  mast(a);
  summons(a);
  officer(a);
  charge(a);
  return a;
}
/** A close state from the fixture with the door already settled as `flags` say (the door's own routes are B6j's), the card come
 * at seven and the close shown, as a played game would have it (`gather` then plays the alternates each end needs). */
function closeAt(preset: Preset, over: Over = {}, flags: Flags = {}): Game {
  const x = actThree(preset, { at: 'c9_mouth', ...over, flags: { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down', ...(over.flags ?? {}), ...flags } });
  x.g.pc.sheet.name = 'Halden';
  const a = recorded(x.g);
  summons(a);
  return a;
}
/** Every key an end needs, by its Act 3 alternates. */
function gather(a: Game): void {
  for (const f of [mast, officer, charge]) {
    const here = a.g.locationId;
    f(a);
    a.g.locationId = here;
  }
}

/** The climax as a player plays it: the given preferences, else on. */
const ON: Pick[] = ['Your house\'s line is read.', '(Get between them', '(Walk to the foot of the stair'];
async function end(save: G, way: Way, prefer: Pick[] = ON, opts: { hearing?: boolean; speech?: number; how?: Pick[]; steps?: Pick[] } = {}): Promise<{ f: Game; s: Sess }> {
  const f = await down(save, SASH_FOR[way], opts);
  expect(desk(f), way).toContain(way);
  const s = finish(atDesk(f, way, opts.how), prefer);
  return { f, s };
}

// ---------------------------------------------------------------- what the epilogue must show

const PAGE_OF = (ids: string[], slide: string) => ids.find((n) => n.startsWith(`${slide}_`));
/** Every slide against the end state: shown exactly when its subject was met, and then on the first variant whose selector holds;
 * `ep_<slide>` records it. Then §6.3's ids for the end, and the pages that are the modifiers' own. */
function agree(g: G, ids: string[], way: Way): void {
  for (const s of EP_SPECS) {
    const page = PAGE_OF(ids, s.id);
    expect(!!page, `${s.id} shown`).toBe(cond(s.met, g));
    if (!page) continue;
    const v = s.variants.find((x) => cond(x.if, g))!;
    expect(page, s.id).toBe(EP_NODE(s.id, v.id));
    expect(g.flags[`ep_${s.id}`], s.id).toBe(v.id);
  }
  // the pages in the epilogue's own order, each slide once, the closing page last
  const order = ids.slice(0, -1).map((n) => EP_SLIDES.findIndex((x) => n.startsWith(`${x}_`)));
  expect(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), ids.join(' ')).toBe(true);
  expect(ids[ids.length - 1]).toBe('end');
  const has_ = (id: string) => ids.includes(id);
  const r49 = PAGE_OF(ids, 'r49')!;
  switch (way) {
    case 'sign': expect([has_('steps_worn'), has_('ledger_plan'), r49]).toEqual([true, true, 'r49_chair']); break;
    case 'walk': expect([has_('steps_refused'), has_('ledger_rerouted')]).toEqual([true, true]); expect(r49).toMatch(/^r49_elsewhere/); break;
    case 'down':
      expect([has_('steps_unwritten'), has_('ledger_dark'), has_('precinct_failing')]).toEqual([true, true, true]);
      expect(r49).toMatch(/^r49_broken/);
      if (PAGE_OF(ids, 'sink')) expect(PAGE_OF(ids, 'sink')).toMatch(/^sink_(lost|held)$/);
      break;
    case 'sell':
      expect([has_('steps_concern'), has_('ledger_sold'), r49]).toEqual([true, true, 'r49_board']);
      if (PAGE_OF(ids, 'line')) expect(PAGE_OF(ids, 'line')).toBe('line_through');
      if (PAGE_OF(ids, 'ashlands')) expect(PAGE_OF(ids, 'ashlands')).toBe('ashlands_woken');
      if (PAGE_OF(ids, 'skirts')) expect(PAGE_OF(ids, 'skirts')).toMatch(/^skirts_(risen|opened)$/);
      break;
    case 'read':
      expect([has_('steps_opensky'), has_(`ledger_open_${modValue(g, EP_SKY)}`)]).toEqual([true, true]);
      expect(r49).toMatch(/^r49_known/);
      if (PAGE_OF(ids, 'guild')) expect(PAGE_OF(ids, 'guild')).toBe('guild_worthless');
      if (PAGE_OF(ids, 'choir')) expect(PAGE_OF(ids, 'choir')).toBe('choir_open');
      break;
    case 'amend': expect([has_('steps_amended'), has_('ledger_agreed'), has_('precinct_clauses'), r49]).toEqual([true, true, true, 'r49_chosen']); break;
  }
  // the modifiers' own pages: the reserve (M4), the Sink (M2), the hounds (M5), Halcyon (M3) when the page is its, the sash (M6)
  expect(PAGE_OF(ids, 'cistern')).toBe(`cistern_${modValue(g, M4_CISTERN)}`);
  if (PAGE_OF(ids, 'sink')) expect(PAGE_OF(ids, 'sink')).toBe(`sink_${modValue(g, M2_SINK)}`);
  if (PAGE_OF(ids, 'ashlands')) expect(PAGE_OF(ids, 'ashlands')).toBe(`ashlands_${modValue(g, M5_HOUNDS)}`);
  if (PAGE_OF(ids, 'skirts') && modValue(g, M3_HALCYON) !== 'stands') expect(PAGE_OF(ids, 'skirts')).toBe(`skirts_${modValue(g, M3_HALCYON)}`);
  if (END_OF_WAY[way] === 'plan') expect(PAGE_OF(ids, 'steps')).toBe(`steps_${modValue(g, M6_SASH)}`);
}
const END_OF_WAY: Record<Way, string> = { sign: 'plan', walk: 'plan', down: 'unwritten', sell: 'concern', read: 'opensky', amend: 'amendment' };
/** The Leash's line under the Skirts' page, by M1 (B6u's words). */
const LEASH_LINE: Record<string, RegExp> = { cut: /^Cut\./, yours: /still in Halden's pocket/, sold: /the hand Halden had sold it to/, spread: /spread with the core/, theirs: /Femi Lawal's spine/ };

/** A climax played to the end, then the epilogue to the credits; every check above. */
function closeOut(f: Game, way: Way): { ids: string[]; mods: Record<string, string> } {
  expect(f.g.flags.a3_climax_done, way).toBe(true);
  expect(f.events.filter((e) => e.name === 'dialogue').pop()!.data).toEqual({ tree: 'd_a3_epilogue', name: 'Afterwards' });
  const mods = Object.fromEntries(MODS.map((m) => [m.id, modValue(f.g, m)]));
  const ep = epilogue(f.g);
  expect(ep.credits, way).toEqual([{ name: 'credits', data: undefined }]);
  agree(f.g, ep.ids, way);
  const skirts = ep.pages.find((p) => p.node.startsWith('skirts_'));
  if (skirts) expect(skirts.lines['THE LEASH'], way).toMatch(LEASH_LINE[mods.leash]);
  return { ids: ep.ids, mods };
}

let PREPARED: Game, HOSTILE: Game, PREP_SAVE: G, HOST_SAVE: G;
const HOSTILE_KEYS_AT_FIRST: Record<string, boolean> = {};
beforeAll(async () => {
  // the hostile game's keys at its earliest save, before any Act 3 alternate
  const h0 = await earliest('hostile');
  for (const [k, c] of Object.entries({ B_MEANS, C_BUYER, D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE, E_FILE, E_PREC, E_REG })) HOSTILE_KEYS_AT_FIRST[k] = holds(h0.g, c);
  PREPARED = await toClose('prepared');
  HOSTILE = await toClose('hostile');
  const p = fork(PREPARED.g);
  ready(p);
  PREP_SAVE = goUp(p);
  const h = fork(HOSTILE.g);
  ready(h);
  HOST_SAVE = goUp(h);
});

// ---------------------------------------------------------------- each end, from the save, on both games

describe('B6w: each end from the loaded "Before the steps" save, through its climax, the epilogue and the credits', () => {
  it('the prepared game, played from its earliest Act 3 save: every way the desk offers, each from its own loaded copy', async () => {
    expect(PREP_SAVE.flags.a3_pnr).toBeUndefined();
    expect(PREP_SAVE.flags.a3_ready).toBe(7);
    const seen: Record<string, string[]> = {};
    for (const way of WAYS) {
      const { f } = await end(PREP_SAVE, way);
      expect(f.g.flags.a3_end).toBe(END_OF_WAY[way]);
      expect(f.g.flags.a3_sash).toBe(SASH_FOR[way]);
      seen[way] = closeOut(f, way).ids;
    }
    // no two ends tell the same story
    const all = Object.values(seen).map((x) => x.join(' '));
    expect(new Set(all).size).toBe(all.length);
  });

  it('the hostile game holds no key at its earliest save; its Act 3 alternates gather every one; every way, each from its own loaded copy', async () => {
    expect(HOSTILE_KEYS_AT_FIRST).toEqual({ B_MEANS: false, C_BUYER: false, D_VOICE: false, D_READER: false, D_PEOPLE: false, D_ARCHIVE: false, E_FILE: false, E_PREC: false, E_REG: false });
    // what the alternates were: the Court's two precedents (the reserve, Sister Calla), the register bought back, the Archive opened
    // by Ines, the hill raised and kept by Knock, the officer's paper, black powder packed by a trained hand
    expect(HOSTILE.g.flags.ca_precedents).toBe(2);
    expect(HOSTILE.g.flags.ca_calla).toBe('speech');
    expect(HOSTILE.g.flags.a3_register_back).toBe(true);
    expect(HOSTILE.g.flags.a3_archive).toBe('open');
    expect(HOSTILE.g.flags.a3_mast_keeper).toBe('knock');
    expect(HOSTILE.g.flags.a3_terms_from).toBe('officer');
    expect(HOSTILE.g.flags.a3_charge_how).toBe('powder');
    for (const k of ['B_MEANS', 'C_BUYER', 'D_VOICE', 'D_READER', 'D_PEOPLE', 'D_ARCHIVE', 'E_PREC', 'E_REG']) {
      expect(holds(HOST_SAVE, { B_MEANS, C_BUYER, D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE, E_PREC, E_REG }[k]!), k).toBe(true);
    }
    // the file: still refused at the save; contested again on the steps (the second hearing)
    expect(holds(HOST_SAVE, E_FILE)).toBe(false);
    for (const way of WAYS) {
      const { f } = await end(HOST_SAVE, way);
      expect(f.g.flags.a3_file, way).toBe('contested');
      expect(f.g.flags.a3_end).toBe(END_OF_WAY[way]);
      closeOut(f, way);
    }
  });

  it('D at each of its three prices, each from the prepared game\'s own save: the readiness count by the acts asked at the trestle', async () => {
    for (const [n, price] of [[7, 'held'], [3, 'hard'], [1, 'burning']] as const) {
      const p = fork(PREPARED.g);
      expect(ready(p, n)).toBe(n);
      const save = goUp(p);
      expect(modValue(save, M7_SKY)).toBe(price);
      const { f } = await end(save, 'read', ['(Sit down on the fourth step.)', '(Nod to the wardens', '(Call the wardens']);
      expect(f.g.flags.ep_sky).toBe(price);
      const { ids } = closeOut(f, 'read');
      expect(ids).toContain(`ledger_open_${price}`);
    }
  });
});

// ---------------------------------------------------------------- every route through every climax

/** A save before the steps holding every means of bringing it down (the charge, the Unwritten turned east, Bram's cut and a
 * mechanic's hand), the Unwritten's blade sat to watch on the steps. History the slices B6g and B6i write in their own scenes. */
let ALL_MEANS: G;
let PRICED: Record<'held' | 'hard' | 'burning', G>;
beforeAll(async () => {
  const a = closeAt('prepared', { skills: { mechanics: 60 } }, { a3_unwritten: 'with_you', a3_uw_how: 'core', a3_bram_cut: true });
  gather(a);
  charge(a, true);
  ready(a);
  ALL_MEANS = goUp(a);
  PRICED = {} as typeof PRICED;
  for (const [n, price] of [[7, 'held'], [3, 'hard'], [0, 'burning']] as const) {
    const p = fork(PREPARED.g);
    ready(p, n);
    PRICED[price] = goUp(p);
  }
});

describe('B6w: B, the core brought down: every means, every way out of the dark', () => {
  it('each means held is offered and works: the charge, the fire, the coupling; the act waits for ten', async () => {
    for (const how of ['charge', 'fire', 'coupling']) {
      const f = await down(ALL_MEANS, 'worn');
      const s = atDesk(f, 'down', [{ id: new RegExp(`^v\\.do\\.down\\.${how}$`) }]);
      expect(f.g.flags.a3_down_how, how).toBe(how);
      finish(s, ['(Walk to the foot of the stair']);
      expect(f.g.flags.a3_down, how).toBe(true);
      expect(f.g.world.decisions.some((d) => d.id === 'a3_down'), how).toBe(true);
      expect(has(f.g, 'k_a3_charge'), how).toBe(how !== 'charge');
      closeOut(f, 'down');
    }
  });

  it('the four ways out (Lowe, the drop, hands up, the fight won), the failed climb (taken, or the fight), and the fight lost', async () => {
    const at = async (stealth?: number) => {
      const f = await down(PREP_SAVE, 'worn');
      if (stealth !== undefined) eff(f.g, 'stealth', stealth);
      const s = atDesk(f, 'down');
      for (let i = 0; i < 12 && s.node !== 'b_wardens'; i++) s.pick(s.options().find((t) => !/^\((Not yet|Let it go)/.test(t)) ?? '(Let it go.)');
      expect(s.node).toBe('b_wardens');
      return { f, s };
    };
    const ROUTES: [string, number | undefined, Pick[], string][] = [
      ['lowe', undefined, ['(Walk to the foot of the stair', '(Go up past them.)'], 'b_close'],
      ['drop', 90, ['(Back into the drop room', '(Out onto the close.)'], 'b_close'],
      ['taken', undefined, ['(Put your hands', '(Up, with them.)'], 'b_close'],
      ['taken', 0, ['(Back into the drop room', '(Come down, hands', '(Up, with them.)'], 'b_close'],
    ];
    for (const [out, stealth, picks, after] of ROUTES) {
      const { f, s } = await at(stealth);
      s.pick(...picks);
      expect(f.g.flags.a3_vault_out, out).toBe(out);
      expect(s.node).toBe(after);
      expect(f.g.locationId).toBe('md_spire');
      finish(s);
      closeOut(f, 'down');
    }
    // the failed climb, and then the fight; won
    for (const [via, beaten] of [[['(Back into the drop room', '(Drop, and draw.)', '(Fight.)'], false], [['(Draw.)', '(Fight.)'], false], [['(Draw.)', '(Fight.)'], true]] as [Pick[], boolean][]) {
      const { f, s } = await at(0);
      s.pick(...via);
      expect(f.events.some((e) => e.name === 'combat')).toBe(true);
      expect(cond(VAULT_FIGHTING, f.g)).toBe(true);
      for (const id of VAULT_WARDENS) expect(cond(NPCS[id].hostileIf, f.g)).toBe(true);
      if (beaten) apply(NPCS.npc_a3_g19.beaten!, f.g, f.q);
      else for (const id of VAULT_WARDENS) kill(f.g, id, 'md_vault');
      expect(trig(f, 'md_vault', 'a3_vault_after')).toBe(true);
      const b = talk(f, 'd_a3_end_unwritten');
      expect(b.node).toBe(beaten ? 'b_beaten' : 'b_fought');
      finish(b);
      expect(f.g.flags.a3_vault_out).toBe(beaten ? 'taken' : 'fought');
      for (const id of VAULT_WARDENS) expect(cond(NPCS[id].hostileIf, f.g)).toBe(false);
      closeOut(f, 'down');
    }
  });
});

describe('B6w: C, the core signed over: the four answers to the blade, the failed word, and nobody coming', () => {
  const toBlade = async (save: G, speech?: number, steps: Pick[] = []): Promise<{ f: Game; s: Sess }> => {
    const f = await down(save, 'worn', { steps });
    const s = atDesk(f, 'sell');
    if (speech !== undefined) eff(f.g, 'speech', speech);
    for (let i = 0; i < 12 && !['c_blade', 'c_quiet'].includes(s.node!); i++) s.pick(s.options().find((t) => /^\(Sign it, slowly|^\(Go on\.\)|^\(Let her go\.\)|^\(Go up to the close/.test(t))!);
    return { f, s };
  };
  it('talked down, shot by the Concern\'s men (asked, or past a failed word), let burn a copy, or fought; nobody when the blade is spent', async () => {
    for (const [pick, speech, value] of [['(Get between them', 100, 'talked'], ['(Get between them', 0, 'guards'], ['(Shout for', undefined, 'guards'], ['(Stand back', undefined, 'let']] as [string, number | undefined, string][]) {
      const { f, s } = await toBlade(ALL_MEANS, speech);
      expect(s.node).toBe('c_blade');
      s.pick(pick);
      expect(f.g.flags.a3_crates, `${pick} ${speech}`).toBe(value);
      finish(s);
      closeOut(f, 'sell');
    }
    const { f, s } = await toBlade(ALL_MEANS);
    s.pick('(Draw on him.)', '(Fight.)');
    expect(cond(NPCS.npc_a3_u2.hostileIf, f.g)).toBe(true);
    kill(f.g, 'npc_a3_u2_crates', 'md_spire');
    expect(trig(f, 'md_spire', 'a3_crates_after')).toBe(true);
    finish(talk(f, 'd_a3_end_concern'));
    expect(f.g.flags.a3_crates).toBe('fought');
    closeOut(f, 'sell');
    // the blade spent: given to the wardens on the steps, nobody comes for the courier
    const q = await toBlade(ALL_MEANS, undefined, ['(Call the wardens up the steps.)']);
    expect(q.f.g.flags.a3_blade).toBe('wardens');
    expect(q.s.node).toBe('c_quiet');
    finish(q.s);
    expect(q.f.g.flags.a3_crates).toBe('none');
    closeOut(q.f, 'sell');
  });
});

describe('B6w: D, every forecast read out: every route at every price, and each failed check', () => {
  const toClose_ = async (price: 'held' | 'hard' | 'burning', speech?: number): Promise<{ f: Game; s: Sess }> => {
    const f = await down(PRICED[price], 'refused');
    const s = atDesk(f, 'read');
    if (speech !== undefined) eff(f.g, 'speech', speech);
    for (let i = 0; i < 12 && s.node !== 'd_close'; i++) s.pick(s.options().find((t) => /^\(Go on\.\)|^\(Go up\.\)|^\(Send it west/.test(t))!);
    expect(s.node).toBe('d_close');
    expect(modValue(f.g, M7_SKY)).toBe(price);
    return { f, s };
  };
  it('held: a quiet close (its one way); hard: read to him, the wardens, standing still, and the failed word; burning: talked off, the wardens, the fight won and lost, and the failed word with each way after it', async () => {
    const ROUTES: ['held' | 'hard' | 'burning', number | undefined, Pick[], Flags][] = [
      ['held', undefined, ['(Sit down on the fourth step.)'], {}],
      ['hard', 100, ['Read it to me.'], { a3_sky_walk: 'read' }],
      ['hard', 0, ['Read it to me.'], { a3_sky_walk: 'still' }],
      ['hard', undefined, ['(Nod to the wardens'], { a3_sky_walk: 'wardens' }],
      ['hard', undefined, ['(Stand still'], { a3_sky_walk: 'still' }],
      ['burning', 100, ['Your house\'s line is read.'], {}],
      ['burning', undefined, ['(Call the wardens'], {}],
      ['burning', 0, ['Your house\'s line is read.', '(Call the wardens'], {}],
    ];
    for (const [price, speech, picks, more] of ROUTES) {
      const { f, s } = await toClose_(price, speech);
      s.pick(...picks);
      finish(s);
      expect(f.g.flags.ep_sky, `${price} ${String(picks[0])}`).toBe(price);
      for (const [k, v] of Object.entries(more)) expect(f.g.flags[k], `${price} ${k}`).toBe(v);
      closeOut(f, 'read');
    }
    // the house's men at the plinth: fought and won, fought and lost; and the failed word, then the fight
    for (const [via, beaten] of [[['(Draw.)', '(Fight.)'], false], [['(Draw.)', '(Fight.)'], true], [['Your house\'s line is read.', '(Draw.)', '(Fight.)'], false]] as [Pick[], boolean][]) {
      const { f, s } = await toClose_('burning', 0);
      for (const id of SKY_GUARDS) expect(cond(MAPS.md_spire.npcs!.find((n) => n.def === id)!.if, f.g), id).toBe(true);
      s.pick(...via);
      for (const id of SKY_GUARDS) expect(cond(NPCS[id].hostileIf, f.g)).toBe(true);
      if (beaten) apply(NPCS.npc_a3_g23.beaten!, f.g, f.q);
      else for (const id of SKY_GUARDS) kill(f.g, id, 'md_spire');
      expect(trig(f, 'md_spire', 'a3_sky_after')).toBe(true);
      const b = talk(f, 'd_a3_end_opensky');
      expect(b.node).toBe('d_fought');
      finish(b);
      expect(f.g.flags.ep_sky).toBe('burning');
      for (const id of SKY_GUARDS) expect(cond(NPCS[id].hostileIf, f.g)).toBe(false);
      closeOut(f, 'read');
    }
  });

  it('each reader held reads (the player, Nine, Verity, Seventeen); the readers offered are exactly the ones held', async () => {
    const a = closeAt('prepared', { skills: { science: 70 } }, { a3_ally_saints: true, a3_ally_seventeen: true });
    gather(a);
    const save = goUp(a);
    for (const [reader, words] of [['self', 'you read it into the key'], ['nine', 'Nine'], ['verity', 'Verity puts her receiver down'], ['seventeen', 'Assessor Seventeen enters']] as const) {
      const f = await down(save, 'refused');
      const s = atDesk(f, 'read', [{ id: new RegExp(`^v\\.do\\.read\\.${reader}$`) }]);
      expect(f.g.flags.a3_reader, reader).toBe(reader);
      if (s.node === 'd_handle') s.pick('(Send it west', '(Go on.)');
      expect(s.node).toBe('d_first');
      expect(s.text(), reader).toContain(words);
      finish(s, ['(Sit down on the fourth step.)', 'Your house\'s line is read.', '(Nod to the wardens']);
      closeOut(f, 'read');
    }
  });
});

describe('B6w: E, the Magistrate\'s Amendment: the clause picker', () => {
  const toPage = async (save: G): Promise<{ f: Game; s: Sess }> => {
    const f = await down(save, 'worn');
    const s = atDesk(f, 'amend').pick('(Carry it up to the steps');
    expect(s.node).toBe('e_write');
    return { f, s };
  };
  const writes = (s: Sess) => s.options().filter((t) => t.startsWith('(Write:'));
  const LABEL: Record<string, string> = {
    fines: 'A FORECAST IS NOT AN ACT', living: 'THE RECORD YIELDS TO THE LIVING', keeper: 'A UNIT MAY BE ITS OWN KEEPER', refuse: 'A SCHEDULED BENEFIT MAY BE REFUSED',
    reserve: 'A RESERVE IS KEPT BY ITS OWN CONSENT', passenger: 'A PERSON IS A PASSENGER, NEVER CARGO', speech: 'SPEECH IS NOT SEDITION',
  };
  it('one, two and three clauses; struck out and rewritten; the precinct\'s page reads exactly the ones written', async () => {
    for (const n of [1, 2, 3]) {
      const { f, s } = await toPage(PREP_SAVE);
      const held = CLAUSES.filter((c) => cond(c.needs, f.g)).map((c) => c.id);
      expect(held.length).toBeGreaterThanOrEqual(4);
      expect(writes(s)).toHaveLength(held.length);
      for (let i = 0; i < n; i++) s.pick(writes(s)[i === 0 ? 0 : writes(s).length - 1]);
      expect(f.g.flags.a3_amends).toBe(n);
      if (n === 3) expect(writes(s)).toEqual([]);
      s.pick('(Close the register.)', '(Close it.)');
      finish(s);
      const chosen = CLAUSES.filter((c) => f.g.flags[`a3_amend_${c.id}`] === true).map((c) => c.id);
      expect(chosen).toHaveLength(n);
      const { ids } = closeOut(f, 'amend');
      expect(ids).toContain('precinct_clauses');
    }
    // struck and rewritten, opened again after closing, then closed
    const { f, s } = await toPage(PREP_SAVE);
    for (let i = 0; i < 3; i++) s.pick(writes(s)[0]);
    const first3 = CLAUSES.filter((c) => f.g.flags[`a3_amend_${c.id}`] === true).map((c) => c.id);
    s.pick(s.options().find((t) => t.startsWith('(Strike it out:'))!);
    expect(f.g.flags.a3_amends).toBe(2);
    s.pick(writes(s)[writes(s).length - 1]);
    expect(f.g.flags.a3_amends).toBe(3);
    s.pick('(Close the register.)', '(Open it again.)');
    expect(s.node).toBe('e_write');
    s.pick(s.options().find((t) => t.startsWith('(Strike it out:'))!, '(Close the register.)', '(Close it.)');
    const chosen = CLAUSES.filter((c) => f.g.flags[`a3_amend_${c.id}`] === true).map((c) => c.id);
    expect(chosen).toHaveLength(2);
    expect(chosen).not.toEqual(first3.slice(0, 2));
    finish(s);
    const ep = epilogue(f.g);
    const precinct = ep.pages.find((p) => p.node === 'precinct_clauses')!;
    expect(Object.keys(precinct.lines).filter((k) => Object.values(LABEL).includes(k)).sort()).toEqual(chosen.map((c) => LABEL[c]).sort());
  });

  it('the empty page: two precedents the charter cannot carry (the city\'s own rulings), the register back and the file contested again', async () => {
    const a = closeAt('hostile', { tolls: 400 }, { ca_precedents: 2 });
    register(a);
    gather(a);
    const save = goUp(a);
    const f = await down(save, 'worn', { speech: 80 });
    expect(f.g.flags.a3_file).toBe('contested');
    expect(CLAUSES.some((c) => cond(c.needs, f.g))).toBe(false);
    const s = atDesk(f, 'amend').pick('(Carry it up to the steps');
    expect(s.options()).toEqual(['(Close the register with nothing written in it.)', '(Not yet. Leave it open on the plinth.)']);
    s.pick('(Close the register with nothing', '(Close it.)');
    finish(s);
    expect(f.g.flags.a3_amended).toBe(true);
    const { ids } = closeOut(f, 'amend');
    expect(ids).toContain('precinct_clauses');
  });
});

// ---------------------------------------------------------------- what the climaxes write, and the companions there or waiting

describe('B6w: the slides read what the climaxes write; companions travelling or waiting', () => {
  /** A save before the steps with the companions placed as asked (the reserve left under the pen: no Court stay). */
  const withCompany = (company: Over['companions'], flags: Flags = {}): G => {
    const a = closeAt('prepared', { companions: company, b4b: false }, flags);
    gather(a);
    ready(a, 3);
    return goUp(a);
  };
  it('C: Wren and Kes walk out of the vault when travelling, are found gone from the steps when waiting; both ways their slides read the Concern', async () => {
    for (const [state, beat] of [['party', 'c_wren'], ['waiting', 'c_wren_gone']] as const) {
      const save = withCompany({ wren: state, kes: state, tamsin: 'never', nine: 'never' });
      const { f } = await end(save, 'sell');
      expect(f.trail.some((t) => t.endsWith(`/${beat}`)), state).toBe(true);
      expect([f.g.flags.wren_left, f.g.flags.kes_left]).toEqual(['concern', 'concern']);
      expect(f.g.world.party).not.toContain(WREN);
      const { ids } = closeOut(f, 'sell');
      expect(ids).toEqual(expect.arrayContaining(['wren_gone_concern', 'kes_gone_concern']));
    }
    // never met: nothing written, and their slides are their own lives
    const { f } = await end(withCompany({ wren: 'never', kes: 'never', tamsin: 'never', nine: 'never' }), 'sell');
    expect([f.g.flags.wren_left, f.g.flags.kes_left]).toEqual([undefined, undefined]);
    const { ids } = closeOut(f, 'sell');
    expect(ids.some((n) => n.startsWith('wren_') || n.startsWith('kes_'))).toBe(false);
  });

  it('B: Nine says its plea at the core\'s door when travelling, on the dark close when waiting; withdrawn either way', async () => {
    for (const [state, beat] of [['party', 'b_nine'], ['waiting', 'b_nine_close']] as const) {
      const save = withCompany({ nine: state, tamsin: 'never' });
      const { f } = await end(save, 'down', ['(Walk to the foot of the stair', '(Let it go.)']);
      expect(f.trail.some((t) => t.endsWith(`/${beat}`)), state).toBe(true);
      expect(f.g.flags.nine_left).toBe('core');
      const { ids } = closeOut(f, 'down');
      expect(ids).toContain('nine_withdrawn');
    }
  });

  it('A1 and E: Tamsin walks away from the chair\'s first paper only at the desk (A1) or with the player (E), the reserve under the pen; her slide is the chair\'s; Ilya walks at the desk (A1)', async () => {
    const save = withCompany({ tamsin: 'party', ilya: 'party', nine: 'never' });
    const a1 = await end(save, 'sign');
    expect(a1.f.g.flags.a3_tam_walked).toBe(true);
    expect(a1.f.g.world.party).not.toContain(TAMSIN);
    expect(a1.f.g.world.party).not.toContain(ILYA);
    expect(closeOut(a1.f, 'sign').ids).toEqual(expect.arrayContaining(['tamsin_chair', 'ilya_chair', 'cistern_relocated']));
    const e = await end(save, 'amend', ['(Write: A forecast is not an act.)', '(Close the register.)', '(Close it.)']);
    expect(e.f.g.flags.a3_amend_reserve).toBeUndefined();
    expect(e.f.g.flags.a3_tam_walked).toBe(true);
    expect(closeOut(e.f, 'amend').ids).toEqual(expect.arrayContaining(['tamsin_chair', 'cistern_relocated']));
    // waiting on the close: no scene at the desk; the chair's paper still reaches her slide
    const w = await end(withCompany({ tamsin: 'waiting', nine: 'never' }), 'sign');
    expect(w.f.g.flags.a3_tam_walked).toBeUndefined();
    expect(closeOut(w.f, 'sign').ids).toContain('tamsin_chair');
  });

  it('D: the night\'s price as played (ep_sky) is the ledger\'s page and the steps\' line, whatever the count says afterwards', async () => {
    for (const price of ['held', 'hard', 'burning'] as const) {
      const { f } = await end(PRICED[price], 'read', ['(Sit down on the fourth step.)', '(Nod to the wardens', '(Call the wardens']);
      expect(f.g.flags.ep_sky).toBe(price);
      f.g.flags.a3_ready = price === 'held' ? 0 : 9; // the count read afterwards cannot move the price that was played
      expect(modValue(f.g, EP_SKY)).toBe(price);
      expect(closeOut(f, 'read').ids).toContain(`ledger_open_${price}`);
    }
  });
});

// ---------------------------------------------------------------- a save at every beat

describe('B6w: a save at each beat of each climax', () => {
  it('saved at any beat (and mid-fight, and after the climax) and loaded, it resumes there and plays on to the same end and the same pages', async () => {
    const company = (c: Over['companions']): G => { const a = closeAt('prepared', { companions: c, b4b: false }); gather(a); ready(a, 3); return goUp(a); };
    const TRAVELLING = company({ tamsin: 'party', ilya: 'party', wren: 'party', kes: 'party', nine: 'party' });
    const WAITING = company({ tamsin: 'waiting', ilya: 'waiting', wren: 'waiting', kes: 'waiting', nine: 'waiting' });
    const WARDENS: Pick[] = ['(Call the wardens up the steps.)'];
    const CASES: [Way, G, Pick[], Pick[]?, boolean?][] = [
      ['sign', PREP_SAVE, []], ['walk', PREP_SAVE, ['(Go down through the crowd']], ['down', PREP_SAVE, ['(Walk to the foot of the stair']],
      ['sell', ALL_MEANS, ['(Get between them']], ['read', PRICED.hard, ['(Nod to the wardens']], ['amend', PREP_SAVE, ['(Write: A forecast', '(Close the register.)', '(Close it.)']],
      ['sign', TRAVELLING, ['(Pick up the pen.)', '(Say her name.)']], ['down', TRAVELLING, ['(Let it go.)', '(Put your hands', '(Up, with them.)']], ['sell', TRAVELLING, ['(Wren—)']],
      ['amend', TRAVELLING, ['(Write: A forecast', '(Close the register.)', '(Close it.)']], ['down', WAITING, ['(Put your hands', '(Up, with them.)']], ['sell', WAITING, []],
      ['read', PRICED.burning, ['(Call the wardens']], ['walk', WAITING, ['(Go down the far side']],
      // the fights, and nobody at the crates
      ['down', ALL_MEANS, ['(Draw.)', '(Fight.)']], ['sell', ALL_MEANS, ['(Draw on him.)', '(Fight.)']], ['read', PRICED.burning, ['(Draw.)', '(Fight.)']], ['sell', ALL_MEANS, [], WARDENS],
      ['down', ALL_MEANS, ['(Draw.)', '(Fight.)'], undefined, true], ['read', PRICED.burning, ['(Draw.)', '(Fight.)'], undefined, true],
    ];
    const FIGHTS: { fighting: Cond; map: string; ids: string[]; trigger: string; beaten?: string }[] = [
      { fighting: VAULT_FIGHTING, map: 'md_vault', ids: VAULT_WARDENS, trigger: 'a3_vault_after', beaten: VAULT_WARDENS[0] },
      { fighting: CRATES_FIGHTING, map: 'md_spire', ids: [THAD_CRATES], trigger: 'a3_crates_after' },
      { fighting: SKY_FIGHTING, map: 'md_spire', ids: SKY_GUARDS, trigger: 'a3_sky_after', beaten: SKY_GUARDS[0] },
    ];
    /** The fight ends: won (they are down), or lost (their `beaten`: losing forward). */
    const settle = (a: Game, fight: (typeof FIGHTS)[number], lose?: boolean) => {
      if (lose) apply(NPCS[fight.beaten!].beaten!, a.g, a.q);
      else for (const id of fight.ids) kill(a.g, id, fight.map);
      expect(trig(a, fight.map, fight.trigger)).toBe(true);
    };
    let beats = 0, passed = 0;
    const covered = new Set<string>();
    for (const [way, save, prefer, steps, lose] of CASES) {
      // the straight run, for the end and the pages it comes to (a fight won the same way)
      const straight = await down(save, SASH_FOR[way], { steps });
      let st = atDesk(straight, way);
      for (let k = 0; k < 3; k++) {
        finish(st, prefer);
        const fight = FIGHTS.find((x) => cond(x.fighting, straight.g));
        if (!fight) break;
        settle(straight, fight, lose);
        st = talk(straight, st.tree);
      }
      const want = closeOut(straight, way).ids;
      // the same run, saved and loaded at every beat on the way
      const f = await down(save, SASH_FOR[way], { steps });
      let sess = atDesk(f, way);
      const tree = DIALOGUES[sess.tree];
      const starts = new Set(tree.start.map((x) => x.node));
      const order = tree.start.map((x) => x.node);
      let cur: Game = f, last: string | null = null;
      for (let i = 0; i < 80; i++) {
        if (sess.r.ended) {
          const fight = FIGHTS.find((x) => cond(x.fighting, cur.g));
          if (!fight) break;
          // saved mid-fight: loaded, the fight is still on, and its beat is the climax's
          const l = await reload(cur.g);
          expect(cond(fight.fighting, l.g), way).toBe(true);
          const at_ = new DialogueRunner(tree, structuredClone(l.g), {}).node!;
          expect(at_, way).toMatch(/_fighting$/);
          covered.add(`${tree.id}/${at_}`);
          beats++;
          cur = l;
          settle(cur, fight, lose);
          sess = talk(cur, tree.id);
          last = null;
          continue;
        }
        const at_ = sess.node!;
        if (starts.has(at_) && at_ !== last) {
          // saved here, and loaded
          const l = await reload(cur.g);
          const resumed = new DialogueRunner(tree, structuredClone(l.g), {}).node!;
          if (resumed !== at_) {
            // its entry already ended it: the climax resumes at a later beat
            expect(order.indexOf(resumed), `${way} ${at_} → ${resumed}`).toBeGreaterThan(order.indexOf(at_));
            // and nothing is lost by it: every way on from there changes nothing but the clock on its way to a beat (or out)
            // (or the beat it resumes at offers the same act again: the stair up out of the dark)
            const clock = (es: Effect[] = []) => es.every((e) => 'until' in e || 'time' in e);
            const again = (o: OptionDef) => tree.nodes[resumed].options.some((x) => JSON.stringify(x.effects) === JSON.stringify(o.effects) && x.exit === o.exit && x.next === o.next);
            const harmless = (o: OptionDef, depth = 0): boolean => again(o) || (clock(o.effects) && (o.exit || starts.has(o.next!)
              || (depth < 4 && clock(tree.nodes[o.next!].effects) && tree.nodes[o.next!].options.every((x) => harmless(x, depth + 1)))));
            const ids = sess.r.view()!.options.filter((o) => !o.locked && !REFUSE.test(o.text)).map((o) => o.id);
            for (const o of tree.nodes[at_].options.filter((x, k) => ids.includes(x.id ?? `${tree.id}.${at_}.${k}`))) expect(harmless(o), `${way} ${at_} ${o.id}`).toBe(true);
            passed++;
          }
          cur = l;
          sess = talk(l, tree.id);
          expect(sess.node).toBe(resumed);
          beats++;
          covered.add(`${tree.id}/${at_}`);
          last = at_;
          continue;
        }
        finish(sess, prefer, undefined, 1);
      }
      expect(cur.g.flags.a3_climax_done, way).toBe(true);
      // saved after the climax, before the epilogue: the racks and the after-triggers reopen it on its last page
      const l = await reload(cur.g);
      const after = talk(l, tree.id);
      expect(after.node).toBe('after');
      covered.add(`${tree.id}/after`);
      after.pick('(Afterwards.)');
      expect(l.events.pop()!.data).toEqual({ tree: 'd_a3_epilogue', name: 'Afterwards' });
      expect(l.g.flags.a3_end).toBe(straight.g.flags.a3_end);
      expect(epilogue(l.g).ids, way).toEqual(want);
    }
    expect(passed).toBeLessThan(beats / 2);
    // every beat of every climax (the wrong end's guard aside) was saved at and loaded
    const all = new Set(Object.values(DIALOGUES).filter((d) => /^d_a3_end_/.test(d.id)).flatMap((d) => d.start.map((x) => `${d.id}/${x.node}`)).filter((x) => !x.endsWith('/none')));
    expect([...all].filter((x) => !covered.has(x))).toEqual([]);
    expect(beats).toBeGreaterThanOrEqual(all.size);
  });
});

// ---------------------------------------------------------------- the coverage table

describe('B6w: every modifier value is reached by a script, and its page shows it', () => {
  it('M1–M7: each value from a played save (the history and the door as the earlier slices write them), on the slide that reads it', async () => {
    const reached: Record<string, Set<string>> = Object.fromEntries(MODS.map((m) => [m.id, new Set<string>()]));
    const note = (g: G) => { for (const m of MODS) reached[m.id].add(modValue(g, m)); };
    // the two long runs' ends
    for (const save of [PREP_SAVE, HOST_SAVE, PRICED.hard, PRICED.burning]) for (const way of WAYS) {
      const { f } = await end(save, way, [...ON, '(Sit down on the fourth step.)', '(Nod to the wardens', '(Call the wardens']);
      note(f.g);
      closeOut(f, way);
    }
    // the histories that drive the rest: each played from its own save to its end and every page
    const SCRIPTS: [string, Preset, Over, Flags, Way][] = [
      ['M1 cut, M3 opened', 'prepared', { b4b: true }, {}, 'walk'],
      ['M1 sold', 'choir', { b4b: true }, {}, 'walk'],
      ['M3 reformed', 'hostile', { b4b: { hc_longlived: 'soto' } }, {}, 'walk'],
      ['M1 yours', 'hostile', { b4b: { hc_leash: 'seized' } }, { dagny_met: true }, 'walk'],
      ['M2 held', 'prepared', {}, { sk_pumps: 'seized' }, 'down'],
      ['M2 relieved', 'hostile', {}, { nw_sink_relief: true, dagny_met: true }, 'walk'],
      ['M2 flooded', 'hostile', {}, { dagny_met: true }, 'sign'],
      ['M3 burned, M5 yours', 'choir', {}, {}, 'walk'],
      ['M4 opened', 'prepared', {}, { a3_c9: 'opened', a3_c9_how: 'ines', a3_mother: 'kept' }, 'sign'],
      ['M4 walked', 'prepared', {}, { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked' }, 'walk'],
      ['M4 sold', 'prepared', {}, { a3_c9: 'relocated', a3_c9_how: 'sold' }, 'walk'],
      ['M4 relocated', 'truce', {}, {}, 'sign'],
      ['M4 struck', 'prepared', {}, { a3_c9_how: 'struck', a3_pell: 'unfit' }, 'read'],
      ['M5 feral', 'prepared', {}, { an_reserve: 'leaderless' }, 'walk'],
    ];
    for (const [what, preset, over, flags, way] of SCRIPTS) {
      const a = closeAt(preset, over, flags);
      gather(a);
      ready(a);
      const { f } = await end(goUp(a), way, [...ON, '(Sit down on the fourth step.)', '(Nod to the wardens', '(Call the wardens']);
      note(f.g);
      const { ids } = closeOut(f, way);
      expect(ids.length, what).toBeGreaterThan(10);
    }
    const all = (m: Mod) => m.values.map((v) => v.id).sort();
    for (const m of [M1_LEASH, M2_SINK, M3_HALCYON, M4_CISTERN, M5_HOUNDS, M6_SASH, M7_SKY]) expect([...reached[m.id]].sort(), m.id).toEqual(all(m));
  });
});
