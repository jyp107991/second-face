import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { d_a3_epilogue, EP_CLOSE, EP_SPECS } from '../src/content/dialogue/a3_epilogue';
import { EP_NODE, EP_TREE, epilogueTree, F, type SlideData, type SlideSpec } from '../src/content/dialogue/a3_epilogue_kit';
import { SLIDES_OPEN } from '../src/content/dialogue/a3_epilogue_open';
import {
  EP_SKY, EP_SLIDES, KESSLER_LATE, M4_CISTERN, MET_DOGS, MET_SHALE, MOTHER_AFTER, STRUCK_AS, VASHA_EXECUTIONER, modValue,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner, type DialogueDef } from '../src/engine/dialogue/dialogue';
import { test as cond } from '../src/engine/world/logic';
import { actThree, saveAndLoad, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6s — the epilogue builder and slides 1–6 (the photograph's steps, the core and the twelve, Reserve 9 and MOTHER, Knock, Shale,
 * the overpass). The epilogue is one tree built from slide data: each page is the first variant that holds of the next slide whose
 * subject the player met; "(Next.)" asks for the tree again (the runtime reopens it), so the tree's start list routes. Each end is
 * set as the plan names it for B6q/B6r (`a3_end`, `a3_sash`, `a3_amend_*`, `ep_sky`), on the shared Act 3 fixture after the door,
 * with the flags the earlier slices write. Played headless: open the tree, read the page, choose, open it again.
 */

type Flags = Record<string, string | number | boolean>;
type End = 'A1' | 'A2' | 'B' | 'C' | 'D' | 'E';
const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down', a3_summoned: true, a3_pnr: true };
const END_FLAGS: Record<End, Flags> = {
  A1: { a3_end: 'plan', a3_sash: 'worn' }, A2: { a3_end: 'plan', a3_sash: 'refused' }, B: { a3_end: 'unwritten', a3_sash: 'worn' },
  C: { a3_end: 'concern', a3_sash: 'worn' }, D: { a3_end: 'opensky', a3_sash: 'refused' }, E: { a3_end: 'amendment', a3_sash: 'worn' },
};
const ENDS = Object.keys(END_FLAGS) as End[];
/** Act 3 over: the door settled (sealed by the column standing down, unless `flags` say otherwise), the steps climbed, an end reached. */
function ended(preset: Preset, end: End, flags: Flags = {}, over: Over = {}): A3 {
  const a = actThree(preset, { at: 'md_spire', ...over, flags: { ...AFTER_DOOR, ...END_FLAGS[end], ...(over.flags ?? {}), ...flags } });
  a.g.pc.sheet.name = 'Halden';
  return a;
}

interface Ev { name: string; data?: unknown }
interface Page { node: string; text: string; lines: Record<string, string>; options: string[]; events: Ev[] }
/** Open the epilogue (the runtime does, after each page) and read the page it opens on. */
function open(g: G, tree: DialogueDef = d_a3_epilogue): { r: DialogueRunner; page: Page } {
  const events: Ev[] = [];
  const r = new DialogueRunner(tree, g, { event: (name, data) => events.push({ name, data }) });
  const v = r.view()!;
  return { r, page: { node: r.node!, text: v.text, lines: Object.fromEntries(v.passives.map((p) => [p.label, p.text])), options: v.options.map((o) => o.text), events } };
}
/** Turn the page: choose an option and return what it fired. */
function turn(r: DialogueRunner, option: string): Ev[] {
  const events: Ev[] = [];
  (r as unknown as { host: { event: (n: string, d?: unknown) => void } }).host.event = (name, data) => events.push({ name, data });
  const o = r.view()!.options.find((x) => x.text === option);
  if (!o) throw new Error(`no option "${option}" at ${r.node}`);
  r.choose(o.id);
  return events;
}
/** Play the epilogue from where it stands to its closing page (or `pages` pages); every page's "(Next.)" asks for the tree again. */
function play(g: G, tree: DialogueDef = d_a3_epilogue, pages = 60): Page[] {
  const out: Page[] = [];
  for (let i = 0; i < pages; i++) {
    const { r, page } = open(g, tree);
    out.push(page);
    if (page.node === 'end' || page.node === 'unended') break;
    const fired = turn(r, '(Next.)');
    expect(fired, page.node).toEqual([{ name: 'dialogue', data: { tree: EP_TREE, name: 'Afterwards' } }]);
    expect(r.ended).toBe(true);
  }
  return out;
}
const nodes = (ps: Page[]) => ps.map((p) => p.node);
const pageOf = (ps: Page[], slide: string) => ps.find((p) => p.node.startsWith(`${slide}_`));
const nodeOf = (g: G, slide: string) => pageOf(play(g), slide)?.node;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const ALL_VARIANTS = SLIDES_OPEN.flatMap((s) => s.variants.map((v) => EP_NODE(s.id, v.id)));

describe('B6s — the epilogue builder; slides 1–6', () => {
  it('the tree is registered, validates, and is built from the slides in EP_SLIDES order (each slide ends in a default)', () => {
    expect(DIALOGUES[EP_TREE]).toBe(d_a3_epilogue);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /epilogue/.test(e))).toEqual([]);
    // slides 1–6 are the first six of EP_SLIDES, in the epilogue's own order (B6t–B6v add theirs; the builder sorts them)
    expect(SLIDES_OPEN.map((s) => s.id)).toEqual(EP_SLIDES.slice(0, 6));
    for (const sl of SLIDES_OPEN) expect(EP_SPECS).toContain(sl);
    const order = d_a3_epilogue.start.map((s) => s.node).filter((n) => ALL_VARIANTS.includes(n));
    expect(order).toEqual(ALL_VARIANTS);
    expect(d_a3_epilogue.start.slice(2, 2 + ALL_VARIANTS.length).map((s) => s.node)).toEqual(ALL_VARIANTS);
    expect(d_a3_epilogue.start[0]).toEqual({ if: { not: { flag: 'a3_end' } }, node: 'unended' });
    expect(d_a3_epilogue.start.at(-1)).toEqual({ node: 'end' });
    for (const s of EP_SPECS) {
      expect(s.variants.at(-1)!.if, `${s.id}'s default`).toBeUndefined();
      for (const v of s.variants.slice(0, -1)) expect(v.if, `${s.id}/${v.id}`).toBeDefined();
    }
    // the plan's variant ids for slides 1–2 (§6.3) and the Cistern's M4 values
    expect(SLIDES_OPEN[0].variants.map((v) => v.id)).toEqual(['unwritten', 'concern', 'opensky', 'amended', 'worn', 'refused']);
    expect(SLIDES_OPEN[1].variants.map((v) => v.id)).toEqual(['dark', 'sold', 'open_held', 'open_hard', 'open_burning', 'agreed', 'plan', 'rerouted']);
    expect(SLIDES_OPEN[2].variants.map((v) => v.id)).toEqual(M4_CISTERN.values.map((v) => v.id));
  });

  it('the builder: "met" hides a slide, the first selector that holds wins, the last variant is the default, and malformed slides are refused', () => {
    const page = (text: string) => ({ place: 'c9_mouth', spot: 'maud_post', people: [], text });
    const specs: SlideSpec[] = [
      { id: 'knock', variants: [{ id: 'b', ...page('Knock.') }] },
      { id: 'steps', variants: [{ id: 'one', if: F('x'), ...page('One.') }, { id: 'two', if: F('y'), ...page('Two.') }, { id: 'def', ...page('Default.') }] },
      { id: 'ledger', met: F('met_ledger'), variants: [{ id: 'only', ...page('Ledger.') }], lines: [{ label: 'Line', if: F('z'), text: [{ if: F('x'), text: 'Lx.' }, { text: 'Ld.' }] }] },
    ];
    const tree = epilogueTree(specs, 'Closed.');
    const run = (flags: Flags) => {
      const a = ended('truce', 'A1', flags);
      return nodes(play(a.g, tree));
    };
    expect(run({ x: true, y: true })).toEqual(['steps_one', 'knock_b', 'end']); // given out of order; ledger not met
    expect(run({ y: true })).toEqual(['steps_two', 'knock_b', 'end']);
    expect(run({})).toEqual(['steps_def', 'knock_b', 'end']);
    expect(run({ met_ledger: true })).toEqual(['steps_def', 'ledger_only', 'knock_b', 'end']);
    const a = ended('truce', 'A1', { met_ledger: true, z: true });
    turn(open(a.g, tree).r, '(Next.)');
    expect(open(a.g, tree).page.lines).toEqual({ LINE: 'Ld.' });
    // refused: a default with a selector, a non-default without, a slide not in EP_SLIDES, a slide twice, a text with no default
    expect(() => epilogueTree([{ id: 'steps', variants: [{ id: 'a', if: F('x'), ...page('A.') }] }], 'C.')).toThrow(/default/);
    expect(() => epilogueTree([{ id: 'steps', variants: [{ id: 'a', ...page('A.') }, { id: 'b', ...page('B.') }] }], 'C.')).toThrow(/only the last/);
    expect(() => epilogueTree([{ id: 'nowhere', variants: [{ id: 'a', ...page('A.') }] }], 'C.')).toThrow(/EP_SLIDES/);
    expect(() => epilogueTree([specs[0], specs[0]], 'C.')).toThrow(/twice/);
    expect(() => epilogueTree([{ id: 'steps', variants: [{ id: 'a', ...page('A.'), text: [{ if: F('x'), text: 'A.' }] }] }], 'C.')).toThrow(/no if/);
  });

  it('each end opens on the plan\'s first two pages (§6.3), on the thorough Acts 1–2 and the worst, and D\'s price follows readiness or B6r\'s record', () => {
    const want: Record<End, [string, string]> = {
      A1: ['steps_worn', 'ledger_plan'], A2: ['steps_refused', 'ledger_rerouted'], B: ['steps_unwritten', 'ledger_dark'],
      C: ['steps_concern', 'ledger_sold'], D: ['steps_opensky', 'ledger_open_burning'], E: ['steps_amended', 'ledger_agreed'],
    };
    for (const preset of ['prepared', 'hostile'] as Preset[]) {
      for (const end of ENDS) {
        const a = ended(preset, end);
        const ps = play(a.g);
        expect(nodes(ps).slice(0, 2), `${preset} ${end}`).toEqual(want[end]);
        expect(a.g.flags.ep_steps).toBe(want[end][0].replace('steps_', ''));
        expect(a.g.flags.ep_ledger).toBe(want[end][1].replace('ledger_', ''));
        expect(nodes(ps).at(-1)).toBe('end');
      }
    }
    // D's three prices: by the readiness count (M7), unless B6r recorded the night's price (ep_sky)
    expect(nodeOf(ended('prepared', 'D', { a3_ready: 6 }).g, 'ledger')).toBe('ledger_open_held');
    expect(nodeOf(ended('prepared', 'D', { a3_ready: 3 }).g, 'ledger')).toBe('ledger_open_hard');
    expect(nodeOf(ended('prepared', 'D', { a3_ready: 1 }).g, 'ledger')).toBe('ledger_open_burning');
    expect(nodeOf(ended('prepared', 'D', { a3_ready: 6, ep_sky: 'burning' }).g, 'ledger')).toBe('ledger_open_burning');
    expect(nodeOf(ended('prepared', 'D', { a3_ready: 0, ep_sky: 'held' }).g, 'ledger')).toBe('ledger_open_held');
    for (const [r, sky] of [[6, 'held'], [3, 'hard'], [0, 'burning']] as const) expect(modValue(ended('prepared', 'D', { a3_ready: r }).g, EP_SKY)).toBe(sky);
    // the sash changes B's and D's steps: worn, the first and last act of the chair; refused, a private person
    expect(play(ended('prepared', 'B').g)[0].text).toContain('the first act of the chair, and the last');
    expect(play(ended('prepared', 'B', { a3_sash: 'refused' }).g)[0].text).toContain('the sash nobody had worn');
    expect(play(ended('prepared', 'D', { a3_sash: 'worn', a3_ready: 6 }).g)[0].text).toMatch(/Magistrate who had given the city's book away.*in the sash/);
    expect(play(ended('prepared', 'D', { a3_ready: 6 }).g)[0].text).toContain('a private person who had read the city\'s book out');
    // the photograph's still: the PC at their age now, Three, and whoever climbed with them; the Concern's officer under C
    const steps = (play(ended('prepared', 'C').g)[0].events.find((e) => e.name === 'slide')!.data as SlideData);
    expect(steps).toMatchObject({ slide: 'steps', variant: 'concern', place: 'md_spire', spot: 'steps_sit', pc: { years: 0 } });
    expect(steps.people.map((p) => p.npc)).toEqual(expect.arrayContaining(['npc_ar_01', 'npc_c9_03', 'npc_md_nine', 'npc_hc_02']));
    // what the steps kept of the climb (B6p): Ash's order fallen on himself at the lamp; the blade, killed there or taken by Ash
    expect(play(ended('prepared', 'A1', { a3_ash: 'self' }).g)[0].lines['BROTHER ASH']).toMatch(/foot of the lamp/);
    expect(play(ended('prepared', 'A1', { a3_blade: 'fought' }).g)[0].lines['THE BLADE']).toMatch(/Thaddeus Wolde died on the steps/);
    expect(play(ended('prepared', 'B', { a3_blade: 'ash', a3_ash: 'between', a3_ash_scarred: true }).g)[0].lines['THE BLADE']).toMatch(/meant for the sash/);
    expect(play(ended('prepared', 'A1', { a3_blade: 'talked' }).g)[0].lines).toEqual({});
  });

  it('the Cistern under every value of M4 (the page shown is the modifier\'s value), and MOTHER\'s line by her state', () => {
    const cases: [string, Preset, End, Flags, RegExp][] = [
      ['opened', 'prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines', a3_c9_by: 'lowe', a3_mother: 'knock' }, /propped with a sandbag/],
      ['walked', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'court', a3_lowe: 'carried' }, /PASSENGERS/],
      ['walked', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'forced', a3_c9_after: 'walked', a3_buffer_how: 'stand', a3_lowe: 'carried' }, /RESERVE 9 — STOOD/],
      ['walked', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'cradle', a3_lowe: 'carried' }, /Benguela Star/],
      ['sold', 'guild', 'C', { a3_c9: 'relocated', a3_c9_how: 'sold', a3_guild: 'signed', a3_lowe: 'carried' }, /Weighhouse/],
      ['relocated', 'prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held', a3_lowe: 'carried' }, /on Halden's word/],
      ['relocated', 'prepared', 'A1', {}, /first paper the Magistrate signed/],
      ['relocated', 'prepared', 'C', {}, /schedules attaching/],
      ['relocated', 'prepared', 'E', {}, /the reserve was not among them/],
      ['relocated', 'prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'consent', a3_c9_after: 'held', a3_lowe: 'carried' }, /their own vote/],
      ['relocated', 'prepared', 'B', { a3_c9: 'relocated', a3_c9_how: 'order', a3_lowe: 'carried' }, /nobody left to receive it/],
      ['relocated', 'prepared', 'D', { a3_c9: 'relocated', a3_c9_how: 'order', a3_lowe: 'carried' }, /whole Reach had heard named/],
      ['relocated', 'prepared', 'E', { a3_c9: 'relocated', a3_c9_how: 'order', a3_lowe: 'carried', a3_amend_passenger: true }, /passenger, never cargo/],
      ['relocated', 'prepared', 'E', { a3_c9: 'relocated', a3_c9_how: 'order', a3_lowe: 'carried', a3_amend_reserve: true }, /None of them did/],
      ['relocated', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_lowe: 'carried' }, /chair's first signature/],
      ['relocated', 'prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'order', a3_lowe: 'carried' }, /waiting for the designate's word/],
      ['struck', 'prepared', 'B', { a3_c9_how: 'struck', a3_pell: 'unfit', a3_lowe: 'withdrawn' }, /the Court of Accounts would hear/],
      ['sealed', 'prepared', 'A2', { a3_c9_how: 'welded', a3_lowe: 'withdrawn' }, /The new seam held/],
      ['sealed', 'prepared', 'A1', { ca_reserve: 'stayed' }, /ATTENDED\. DECLINED/],
      ['sealed', 'hostile', 'D', { a3_c9_how: 'fought', a3_lowe: 'dead', a3_door_fight: true }, /The column broke on the apron/],
    ];
    const seen = new Set<string>();
    for (const [want, preset, end, flags, text] of cases) {
      const a = ended(preset, end, flags);
      expect(modValue(a.g, M4_CISTERN), `${want} ${JSON.stringify(flags)}`).toBe(want);
      const p = pageOf(play(a.g), 'cistern')!;
      expect(p.node).toBe(`cistern_${want}`);
      expect(a.g.flags.ep_cistern).toBe(want);
      expect(p.text, `${want} ${JSON.stringify(flags)}`).toMatch(text);
      seen.add(want);
    }
    expect([...seen].sort()).toEqual(M4_CISTERN.values.map((v) => v.id).sort());
    // struck, by what striking means (the Court's Act 2 ruling; the guild's claim)
    const struck: [string, Flags, RegExp][] = [
      ['yields', { prec_unrecorded: 'yields' }, /Ola Fairley, about goats/],
      ['claimed', { prec_unrecorded: 'property', a3_claim: 'held' }, /salvage in a guild factor's book/],
      ['property', { prec_unrecorded: 'property', a3_claim: 'off' }, /abandoned property/],
      ['outside', { prec_unrecorded: 'outside' }, /were nobody's/],
    ];
    for (const [how, flags, text] of struck) {
      const a = ended('prepared', 'B', { a3_c9_how: 'struck', a3_pell: 'unfit', a3_lowe: 'withdrawn', ...flags });
      expect(modValue(a.g, STRUCK_AS)).toBe(how);
      expect(pageOf(play(a.g), 'cistern')!.text).toMatch(text);
    }
    // MOTHER's line: by what the door left her, and whether anyone is left inside to count
    const mother: [Flags, string, RegExp][] = [
      [{ a3_mother: 'kept' }, 'kept', /thanking them for their continuity/],
      [{ a3_c9: 'opened', a3_c9_how: 'ines', a3_mother: 'knock' }, 'knock', /good morning to Knock by name/],
      [{ a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held', a3_mother: 'knock' }, 'knock', /nobody left inside to count/],
      [{ a3_mother: 'burned', a3_archive: 'burned' }, 'burned', /hand pump/],
      [{ a3_mother: 'burned', a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held' }, 'burned', /in a hall with nobody in it/],
      [{ a3_mother: 'asleep' }, 'asleep', /Bram chalked the date/],
    ];
    for (const [flags, state, text] of mother) {
      const a = ended('prepared', 'A2', flags);
      expect(modValue(a.g, MOTHER_AFTER)).toBe(state);
      expect(pageOf(play(a.g), 'cistern')!.lines.MOTHER).toMatch(text);
    }
    // the orders' line: none after B, the first page read under D, a fifth drafted after A2, the chair bound by its clause or the Court
    expect(pageOf(play(ended('prepared', 'B').g), 'cistern')!.lines['THE ORDERS']).toMatch(/ever came again/);
    expect(pageOf(play(ended('prepared', 'D').g), 'cistern')!.lines['THE ORDERS']).toMatch(/the first page read out/);
    expect(pageOf(play(ended('prepared', 'A2').g), 'cistern')!.lines['THE ORDERS']).toMatch(/a fifth/);
    expect(pageOf(play(ended('prepared', 'E', { a3_amend_reserve: true }).g), 'cistern')!.lines['THE ORDERS']).toMatch(/its own consent/);
    expect(pageOf(play(ended('prepared', 'A1', { ca_reserve: 'stayed' }).g), 'cistern')!.lines['THE ORDERS']).toMatch(/Court's stay held/);
    expect(pageOf(play(ended('prepared', 'C').g), 'cistern')!.lines['THE ORDERS']).toBeUndefined();
    // the still: the residents at the council table when opened; nobody at the door when sold; Sayer left behind when Pell wrote the truth
    const still = (g: G) => play(g).flatMap((p) => p.events).find((e) => e.name === 'slide' && (e.data as SlideData).slide === 'cistern')!.data as SlideData;
    expect(still(ended('prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines' }).g)).toMatchObject({ place: 'cistern9', spot: 'council' });
    expect(still(ended('guild', 'C', { a3_c9: 'relocated', a3_c9_how: 'sold' }).g).people).toEqual([]);
    const sayer = still(ended('prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held', a3_pell: 'fit' }).g).people.find((p) => p.npc === 'npc_c9_r3')!;
    expect(sayer.if).toBeDefined();
  });

  it('every variant of every slide is reached from the fixture\'s presets, with flags as the slices set them', () => {
    const reached = new Set<string>();
    const at = (slide: string, preset: Preset, end: End, flags: Flags, want: string, over: Over = {}) => {
      const a = ended(preset, end, flags, over);
      const n = nodeOf(a.g, slide);
      expect(n, `${slide} ${preset} ${end} ${JSON.stringify(flags)}`).toBe(want);
      reached.add(n!);
    };
    for (const end of ENDS) at('steps', 'prepared', end, {}, { A1: 'steps_worn', A2: 'steps_refused', B: 'steps_unwritten', C: 'steps_concern', D: 'steps_opensky', E: 'steps_amended' }[end]);
    for (const end of ENDS) at('ledger', 'hostile', end, end === 'D' ? { a3_ready: 6 } : {}, { A1: 'ledger_plan', A2: 'ledger_rerouted', B: 'ledger_dark', C: 'ledger_sold', D: 'ledger_open_held', E: 'ledger_agreed' }[end]);
    at('ledger', 'hostile', 'D', { a3_ready: 2 }, 'ledger_open_hard');
    at('ledger', 'hostile', 'D', {}, 'ledger_open_burning');
    // the Cistern (B6j/B6k's door and buffer)
    at('cistern', 'prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines' }, 'cistern_opened');
    at('cistern', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'court' }, 'cistern_walked');
    at('cistern', 'guild', 'C', { a3_c9: 'relocated', a3_c9_how: 'sold', a3_guild: 'signed' }, 'cistern_sold');
    at('cistern', 'prepared', 'A1', {}, 'cistern_relocated');
    at('cistern', 'prepared', 'B', { a3_c9_how: 'struck', a3_pell: 'unfit' }, 'cistern_struck');
    at('cistern', 'prepared', 'A2', {}, 'cistern_sealed');
    // Knock (B6f–B6k)
    at('knock', 'prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines', a3_mother: 'knock' }, 'knock_open');
    at('knock', 'prepared', 'A2', { a3_mother: 'burned', a3_archive: 'burned' }, 'knock_dark');
    at('knock', 'prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held', a3_mother: 'knock' }, 'knock_emptied');
    at('knock', 'prepared', 'A2', { a3_mother: 'kept' }, 'knock_kept');
    // Shale (B6e)
    at('shale', 'prepared', 'B', { ks_ada: 'stays', a3_shale: 'free', a3_pike: 'refused' }, 'shale_free');
    at('shale', 'hostile', 'B', { ks_ada: 'dead', a3_shale: 'free', a3_sh_fight: true }, 'shale_mourned');
    at('shale', 'truce', 'B', { ks_ada: 'resigns', a3_shale: 'company', a3_mags: 'runs', a3_pike: 'signed' }, 'shale_company');
    at('shale', 'hostile', 'D', { ks_ada: 'resigns', a3_shale: 'dogs', a3_pike: 'signed' }, 'shale_dogs');
    at('shale', 'hostile', 'B', { ks_ada: 'resigns', a3_shale: 'abandoned', a3_pike: 'signed' }, 'shale_abandoned');
    at('shale', 'prepared', 'A1', {}, 'shale_contracted');
    at('shale', 'prepared', 'B', {}, 'shale_unasked');
    // the overpass (Chapter One's succession, the booth at Bridgeward)
    at('dogs', 'guild', 'A1', {}, 'dogs_fulfilled');
    at('dogs', 'hostile', 'A1', {}, 'dogs_executioner');
    at('dogs', 'hostile', 'B', {}, 'dogs_kade');
    at('dogs', 'hostile', 'A1', { vasha_fate: 'ilya', vasha_dead: true }, 'dogs_pens');
    at('dogs', 'prepared', 'B', {}, 'dogs_exodus');
    at('dogs', 'choir', 'B', {}, 'dogs_kessler');
    expect([...reached].sort()).toEqual([...ALL_VARIANTS].sort());
  });

  it('only the slides whose subject the player met are shown: Shale and the overpass by any way of having met them', () => {
    const stranger = () => {
      const a = ended('choir', 'B', {}, { companions: { wren: 'never' } });
      for (const q of ['q_ch1_shale', 'q_ch1_map', 'q_ch1_tribute']) delete a.g.world.quests[q];
      return a;
    };
    const a = stranger();
    expect(cond(MET_SHALE, a.g)).toBe(false);
    expect(cond(MET_DOGS, a.g)).toBe(false);
    const seen = nodes(play(a.g));
    expect(seen.filter((n) => ALL_VARIANTS.includes(n))).toEqual(['steps_unwritten', 'ledger_dark', 'cistern_sealed', 'knock_kept']);
    expect(seen.at(-1)).toBe('end');
    expect(a.g.flags.ep_shale).toBeUndefined();
    expect(a.g.flags.ep_dogs).toBeUndefined();
    // each way of having met them shows the slide
    const shows = (slide: string, setup: (g: G) => void) => {
      const b = stranger();
      setup(b.g);
      return !!nodeOf(b.g, slide);
    };
    const quest = (stage: string) => ({ stage, status: 'done' as const, startedAt: 0, log: [], done: [] });
    expect(shows('shale', (g) => { g.world.quests.q_ch1_shale = quest('done'); })).toBe(true);
    expect(shows('shale', (g) => { g.flags.a3_buyout = true; })).toBe(true);
    expect(shows('dogs', (g) => { g.flags.rd_kessler_met = true; })).toBe(true);
    expect(shows('dogs', (g) => { g.world.quests.q_ch1_map = quest('done'); })).toBe(true);
    for (const slide of ['shale', 'dogs']) {
      expect(shows(slide, (g) => { g.world.quests.q_ch1_tribute = quest('fought'); }), slide).toBe(true);
      // Tribute Day settled without the player is not meeting anybody
      expect(shows(slide, (g) => { g.world.quests.q_ch1_tribute = quest('settled'); }), slide).toBe(false);
    }
    // every preset met both (Chapter One goes through Shale and the overpass)
    for (const p of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) {
      const ps = play(ended(p, 'A2').g);
      expect(ps.filter((x) => ALL_VARIANTS.includes(x.node)).map((x) => x.node.split('_')[0]), p).toEqual(EP_SLIDES.slice(0, 6));
    }
  });

  it('selector order holds: where two selectors hold, the earlier wins', () => {
    const variant = (slide: string, id: string) => SLIDES_OPEN.find((s) => s.id === slide)!.variants.find((v) => v.id === id)!.if!;
    const both = (g: G, slide: string, first: string, second: string) => {
      expect(cond(variant(slide, first), g), `${slide}/${first}`).toBe(true);
      expect(cond(variant(slide, second), g), `${slide}/${second}`).toBe(true);
      expect(nodeOf(g, slide)).toBe(`${slide}_${first}`);
    };
    both(ended('prepared', 'B', { ks_ada: 'stays', a3_shale: 'free' }).g, 'shale', 'free', 'mourned');
    both(ended('prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked' }).g, 'cistern', 'walked', 'relocated');
    both(ended('guild', 'A1', { wren_exodus: true }).g, 'dogs', 'fulfilled', 'exodus');
    both(ended('hostile', 'A1').g, 'dogs', 'executioner', 'kade');
    both(ended('prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines', a3_mother: 'burned' }).g, 'knock', 'open', 'dark');
    both(ended('prepared', 'D', { a3_ready: 6 }).g, 'ledger', 'open_held', 'open_burning');
    // within a line too: Kade shot at the booth is never the executioner, whatever the end
    const g = ended('prepared', 'A1', { vasha_fate: 'player', vasha_dead: true }).g;
    expect(pageOf(play(g), 'ledger')!.lines['KADE, VASHA']).toBe('Shot at the Bridgeward booth. Never Executioner.');
  });

  it('the twelve: each name\'s line by its fate; a fate still open is fulfilled on schedule under A1 and C, and under E unless a clause covers it', () => {
    // fates still open: the buyout never came due, House Vane and the Shift untouched, Wren never met, Calla held, Kessler and Kade both alive
    const open: Flags = { ks_vane: false, ks_maren: false, vasha_fate: false, vasha_dead: false };
    const twelve = (end: End, flags: Flags = {}) => pageOf(play(ended('choir', end, { ...open, ...flags }, { companions: { wren: 'never' } }).g), 'ledger')!.lines;
    const a1 = twelve('A1');
    expect(a1['VEY, ADA']).toMatch(/first spring, on schedule/);
    expect(a1.KESSLER).toMatch(/Killed by Kade .* on schedule/);
    expect(a1['KADE, VASHA']).toMatch(/^Executioner, as written/);
    expect(a1['CALLOWAY, WREN']).toMatch(/hanged from its booth on schedule/);
    expect(a1['CALLA, SISTER']).toMatch(/^Imprisoned for sedition/);
    expect(a1['VANE, CELESTINE']).toMatch(/next season, on schedule/);
    expect(a1['OKAFOR, MAREN']).toMatch(/the Concern hanged her/);
    expect(a1['SARR, IMELDA']).toMatch(/^Treasurer, as written/);
    expect(twelve('C')['CALLOWAY, WREN']).toMatch(/on schedule/);
    for (const end of ['A2', 'B', 'D'] as End[]) {
      const l = twelve(end);
      expect(l['VEY, ADA'], end).toMatch(/never came due/);
      expect(l.KESSLER, end).toMatch(/^Alive/);
      expect(l['KADE, VASHA'], end).toBe('Alive, and nobody\'s executioner.');
      expect(l['CALLOWAY, WREN'], end).toMatch(/still waiting for her/);
      expect(l['VANE, CELESTINE'], end).toMatch(/neither rose nor fell/);
      expect(l['OKAFOR, MAREN'], end).toBe('Alive, and still organising.');
    }
    expect(twelve('B')['CALLA, SISTER']).toMatch(/unlocked the doors himself/);
    expect(twelve('D')['CALLA, SISTER']).toMatch(/could not afford to be heard holding her/);
    expect(twelve('A2')['CALLA, SISTER']).toMatch(/^Still in a Precinct cell/);
    // E: the chair's clauses cover some fates (a forecast is not an act; speech is not sedition); Wren's rope is §7's, A1 and C only
    const bare = twelve('E');
    expect(bare['CALLA, SISTER']).toMatch(/^Imprisoned/);
    expect(bare['KADE, VASHA']).toMatch(/^Executioner/);
    expect(bare['VEY, ADA']).toMatch(/on schedule/);
    expect(bare['CALLOWAY, WREN']).toMatch(/still waiting for her/);
    const covered = twelve('E', { a3_amend_fines: true, a3_amend_speech: true });
    expect(covered['CALLA, SISTER']).toMatch(/^Released in the chair's first season/);
    expect(covered['KADE, VASHA']).toBe('Alive, and nobody\'s executioner.');
    expect(covered.KESSLER).toMatch(/on schedule/);
    // the Sarr of each end; warned by letter before the radios read it (B6m), she sold first
    expect(twelve('C')['SARR, IMELDA']).toMatch(/Concern's world/);
    expect(twelve('B')['SARR, IMELDA']).toMatch(/^Treasurer of nothing/);
    expect(twelve('D')['SARR, IMELDA']).toMatch(/^Ruined in daylight/);
    expect(twelve('E')['SARR, IMELDA']).toMatch(/^Audited/);
    expect(pageOf(play(ended('choir', 'D', { ...open }, { knows: ['a3_warned_sarr'] }).g), 'ledger')!.lines['SARR, IMELDA']).toMatch(/^Not ruined/);
    // Ash's orders put on a keystone who wore the line gladly (B6p's `away`, which writes the death flag too): the line says whose hand
    const ash = (flags: Flags) => pageOf(play(ended('choir', 'A1', { a3_ash: 'away', ...flags }).g), 'ledger')!.lines;
    expect(ash({ a3_ash_target: 'vasha', vasha_dead: true })['KADE, VASHA']).toMatch(/by Brother Ash/);
    expect(ash({ a3_ash_target: 'sarr', ks_sarr: 'dead' })['SARR, IMELDA']).toMatch(/by Brother Ash/);
    expect(ash({ a3_ash_target: 'vane', ks_vane: 'rises', cr_celestine_dead: true })['VANE, CELESTINE']).toMatch(/by Brother Ash/);
    expect(ash({ a3_ash_target: 'vasha', vasha_dead: true })['SARR, IMELDA']).toMatch(/^Treasurer, as written/);
    // Ocho after the core is gone: the Ledger's pumps die with it, unless the Pale hold them (M2)
    expect(pageOf(play(ended('choir', 'B', { sk_pumps: 'retimed' }).g), 'ledger')!.lines.OCHO).toMatch(/drowned on his own stair/);
    expect(pageOf(play(ended('choir', 'B', { sk_pumps: 'seized' }).g), 'ledger')!.lines.OCHO).toMatch(/the Pale pumped the Sink by hand/);
    expect(pageOf(play(ended('hostile', 'B').g), 'ledger')!.lines.OCHO).toMatch(/^Drowned in the spring flood, as written/);
    // the fixed fates read as they were settled
    const h = pageOf(play(ended('hostile', 'B').g), 'ledger')!.lines;
    expect(h['REESE, JONAH']).toBe('Deceased within the month, as written.');
    expect(h.KESSLER).toMatch(/night of Kade's coup/);
    expect(h['OKAFOR, MAREN']).toBe('Hanged by the Concern, as written.');
    expect(h['VANE, CELESTINE']).toBe('House Vane rose, as written.');
    expect(h.MASON).toBe('Died the night Openfield burned, as written.');
    expect(h['SARR, IMELDA']).toBe('Dead before she was Treasurer of anything.');
    expect(cond(KESSLER_LATE, ended('choir', 'A1', open).g)).toBe(true);
    expect(cond(VASHA_EXECUTIONER, ended('choir', 'A1', { ...open, vasha_fate: 'spared_why' }).g)).toBe(false);
  });

  it('the people of a place are lines under its page: Knock\'s four and its word on the player, Shale\'s, the overpass\'s', () => {
    const k = (preset: Preset, flags: Flags, over: Over = {}) => pageOf(play(ended(preset, 'A2', flags, over).g), 'knock')!.lines;
    expect(k('prepared', { a3_maud: 'eased' }, { knows: ['a3_maud_letter_who'] }).MAUD).toMatch(/Elspeth Halloran/);
    expect(k('prepared', {}, { knows: ['a3_faces_for_maud'] }).MAUD).toMatch(/faces for the voices/);
    expect(k('hostile', {}).MAUD).toMatch(/knee the outriders gave her/);
    expect(k('hostile', {}).LINNET).toMatch(/stayed in the grey/);
    expect(k('hostile', { a3_linnet_stay: true, a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held' }).LINNET).toMatch(/read every one of the sixty names/);
    expect(k('choir', { a3_ally_dogs: true }).LINNET).toMatch(/back to the overpass with the Dogs/);
    expect(k('choir', {}).LINNET).toMatch(/at Mags's in Shale/);
    expect(k('prepared', { a3_linnet_after: 'road' }).LINNET).toMatch(/down the road in the spring/);
    expect(k('prepared', { a3_hale: 'answered' }).DACE).toMatch(/rebuilt the post-house/);
    expect(k('prepared', { a3_dace: 'quit' }).DACE).toMatch(/brass tag/);
    expect(k('prepared', { a3_tamsin_dead: true }).CORIN).toMatch(/Tamsin's grave/);
    expect(k('prepared', { a3_door_fight: true, a3_corin: 'holds' }).CORIN).toMatch(/gave it to Maud/);
    expect(k('prepared', { a3_corin: 'down' }).CORIN).toMatch(/workshop shelf/);
    expect(k('prepared', {}, { standing: { cistern9: 30 } }).KNOCK).toMatch(/painted Halden's name/);
    expect(k('hostile', {}, { standing: { cistern9: -30 } }).KNOCK).toMatch(/did not say Halden's name/);
    expect(k('hostile', {}, { standing: { cistern9: 0 } }).KNOCK).toBeUndefined();
    const s = (preset: Preset, flags: Flags) => pageOf(play(ended(preset, 'A2', flags).g), 'shale')!.lines;
    expect(s('hostile', {})['THE WATER']).toMatch(/guild held the Dry Wells console/);
    expect(s('prepared', {})['THE WATER']).toMatch(/full share/);
    expect(s('choir', {})['THE WATER']).toMatch(/flat out/);
    expect(pageOf(play(ended('prepared', 'B').g), 'shale')!.lines['THE WATER']).toMatch(/last one they had been given/);
    expect(s('choir', {})['THE HOUND']).toMatch(/sheriff's yard/);
    expect(s('prepared', { a3_mags: 'told' }).MAGS).toMatch(/told Ada about the brokerage herself/);
    expect(s('prepared', {}).JONAH).toMatch(/deputy's star/);
    expect(s('hostile', {}).JONAH).toMatch(/Dov Reese/);
    const d = (preset: Preset, flags: Flags = {}, over: Over = {}) => pageOf(play(ended(preset, 'B', flags, over).g), 'dogs')!.lines;
    expect(d('prepared').BRIDGEWARD).toMatch(/STAND — FREE — DOGS/);
    expect(d('prepared').PERPETUA).toMatch(/walked down to Shale/);
    expect(d('choir').PERPETUA).toMatch(/kept the pens/);
    expect(d('choir', { wren_hanged: true }).BRINDLE).toMatch(/would not go to Meridian again/);
    expect(d('prepared', {}, { standing: { rustdogs: 30 } })['THE DOGS']).toMatch(/kept a place at their fire/);
    expect(d('hostile', {}, { standing: { rustdogs: -30 } })['THE DOGS']).toMatch(/not the one on the list/);
    expect(d('hostile')['THE DOGS']).toBeUndefined();
  });

  it('the sequence is stable across a save round-trip, and an epilogue interrupted by a load resumes where it stopped', async () => {
    for (const [preset, end, flags] of [['prepared', 'A1', {}], ['hostile', 'D', { a3_ready: 3 }], ['guild', 'C', { a3_c9: 'relocated', a3_c9_how: 'sold' }], ['choir', 'B', {}], ['truce', 'E', { a3_amend_fines: true }]] as [Preset, End, Flags][]) {
      const a = ended(preset, end, flags);
      const before = play(structuredClone(a.g));
      const loaded = await saveAndLoad(a.g);
      expect(play(loaded.g), `${preset} ${end}`).toEqual(before);
      // three pages, a save, a load, the rest
      const b = ended(preset, end, flags);
      const first = play(b.g, d_a3_epilogue, 3);
      const resumed = await saveAndLoad(b.g);
      for (const p of first) expect(resumed.g.flags[`ep_${p.node.split('_')[0]}`]).toBe(p.node.slice(p.node.indexOf('_') + 1));
      const rest = play(resumed.g);
      expect(nodes([...first, ...rest])).toEqual(nodes(before));
      expect([...first, ...rest].map((p) => p.text)).toEqual(before.map((p) => p.text));
    }
  });

  it('the `slide` event\'s data is complete: each page\'s place, spot and people resolve to real maps and NPCs (md_vault is B6q\'s to build)', () => {
    const PENDING_MAPS: Record<string, string[]> = {}; // B6q built the Vault of Accounts (md_vault): every page's place is a real map
    for (const [id, n] of Object.entries(d_a3_epilogue.nodes)) {
      if (id === 'end' || id === 'unended') continue;
      const [slide, variant] = [id.split('_')[0], id.slice(id.indexOf('_') + 1)];
      expect(n.effects![0]).toMatchObject({ event: 'slide' });
      expect(n.effects![1]).toEqual({ set: `ep_${slide}`, value: variant });
      const data = (n.effects![0] as { data: SlideData }).data;
      expect(data.slide).toBe(slide);
      expect(data.variant).toBe(variant);
      if (PENDING_MAPS[data.place]) expect(PENDING_MAPS[data.place]).toContain(data.spot);
      else {
        expect(MAPS[data.place], `${id}: map ${data.place}`).toBeDefined();
        expect(MAPS[data.place].spots?.[data.spot], `${id}: spot ${data.place}/${data.spot}`).toBeDefined();
      }
      for (const p of data.people) expect(NPCS[p.npc], `${id}: ${p.npc}`).toBeDefined();
      if (data.pc) expect(data.pc.years).toBeGreaterThanOrEqual(0);
      if (data.light) expect(['dawn', 'day', 'dusk', 'night']).toContain(data.light);
      if (data.weather) expect(['clear', 'haze', 'dust', 'storm', 'rain', 'fog', 'snow']).toContain(data.weather);
    }
    expect(MAPS.md_vault.spots?.core, 'B6q built md_vault, with the core').toBeDefined();
    // played, each page fires exactly one slide event, with its own data, before anything else
    for (const p of play(ended('prepared', 'A1').g).filter((x) => x.node !== 'end')) {
      expect(p.events.filter((e) => e.name === 'slide')).toHaveLength(1);
      expect((p.events[0].data as SlideData).slide).toBe(p.node.split('_')[0]);
    }
  });

  it('the chain never dead-ends: one way on from every page, a skip after the first, and the closing page rolls the credits once', () => {
    for (const preset of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) {
      for (const end of ENDS) {
        const ps = play(ended(preset, end).g);
        expect(ps.at(-1)!.node, `${preset} ${end}`).toBe('end');
        ps.slice(0, -1).forEach((p, i) => expect(p.options, `${preset} ${end} ${p.node}`).toEqual(i === 0 ? ['(Next.)'] : ['(Next.)', '(Skip to the end.)']));
        expect(new Set(nodes(ps)).size).toBe(ps.length);
      }
    }
    // the closing page: EP_CLOSE, and its one option fires the credits
    const a = ended('prepared', 'E');
    play(a.g);
    const { r, page } = open(a.g);
    expect(page).toMatchObject({ node: 'end', text: EP_CLOSE, options: ['(The end.)'] });
    expect(a.g.flags.ep_done).toBe(true);
    expect(turn(r, '(The end.)')).toEqual([{ name: 'credits', data: undefined }]);
    expect(r.ended).toBe(true);
    // skipping from the second page goes straight to the close, and the slides not shown stay unrecorded
    const b = ended('prepared', 'A1');
    play(b.g, d_a3_epilogue, 1);
    const second = open(b.g);
    expect(second.page.node).toBe('ledger_plan');
    expect(turn(second.r, '(Skip to the end.)')).toEqual([{ name: 'dialogue', data: { tree: EP_TREE, name: 'Afterwards' } }]);
    expect(open(b.g).page.node).toBe('end');
    expect(b.g.flags.ep_skip).toBe(true);
    expect(b.g.flags.ep_cistern).toBeUndefined();
    // the tree waits for an end: before one, it opens on a page that changes nothing
    const c = actThree('prepared', { at: 'md_spire', flags: AFTER_DOOR });
    const flags = { ...c.g.flags };
    const none = open(c.g);
    expect(none.page.node).toBe('unended');
    turn(none.r, '(Close.)');
    expect(c.g.flags).toEqual(flags);
  });

  it('every page reads as one page (about 60–110 words, the lines short); {name} is the player\'s', () => {
    const texts = new Set<string>();
    for (const preset of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) {
      for (const end of ENDS) {
        for (const extra of [{}, { a3_ready: 3 }, { a3_c9: 'opened', a3_c9_how: 'ines' }, { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked' }, { a3_c9_how: 'struck', a3_pell: 'unfit' }] as Flags[]) {
          for (const p of play(ended(preset, end, extra).g).filter((x) => ALL_VARIANTS.includes(x.node))) {
            texts.add(p.text);
            expect(words(p.text), `${p.node}: ${p.text}`).toBeGreaterThanOrEqual(55);
            expect(words(p.text), p.node).toBeLessThanOrEqual(115);
            for (const [label, l] of Object.entries(p.lines)) expect(words(l), `${p.node} ${label}`).toBeLessThanOrEqual(45);
            expect(p.text).not.toMatch(/\{\w+\}/);
          }
        }
      }
    }
    expect(texts.size).toBeGreaterThanOrEqual(40);
  });

  it('specialising a page to what its selector says changes nothing a player sees, and keeps the tree linear', () => {
    const plain = epilogueTree(EP_SPECS, EP_CLOSE, { specialise: false });
    for (const preset of ['prepared', 'hostile', 'choir', 'guild'] as Preset[]) {
      for (const end of ENDS) {
        for (const extra of [{}, { a3_ready: 6 }, { a3_c9: 'relocated', a3_c9_how: 'order' }, { a3_mother: 'burned' }, { a3_amend_fines: true, a3_amend_speech: true }] as Flags[]) {
          expect(play(ended(preset, end, extra).g), `${preset} ${end} ${JSON.stringify(extra)}`).toEqual(play(ended(preset, end, extra).g, plain));
        }
      }
    }
    const size = (d: DialogueDef) => JSON.stringify(d).length;
    expect(size(d_a3_epilogue)).toBeLessThan(size(plain));
    // budget for B6t–B6v: the tree grows with its slides, not with their square (about 34 KB a slide here)
    expect(size(d_a3_epilogue)).toBeLessThan(40 * 1024 * EP_SPECS.length);
    expect(d_a3_epilogue.start).toHaveLength(EP_SPECS.flatMap((x) => x.variants).length + 3);
  });

  it('the flags are in the Act 3 registry', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6s (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['ep_steps', 'ep_ledger', 'ep_cistern', 'ep_knock', 'ep_shale', 'ep_dogs', 'ep_turned', 'ep_skip', 'ep_done', 'ep_sky', 'a3_end', 'a3_sash', 'a3_amend_',
      'q_ch1_tribute', 'rd_kessler_met', 'a3_ash_target', 'd_a3_epilogue', 'slide', 'credits']) expect(block.includes(f), f).toBe(true);
  });
});
