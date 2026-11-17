import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';
import { NPCS, QUESTS } from '../src/content';
import { d_a3_epilogue, EP_SPECS } from '../src/content/dialogue/a3_epilogue';
import { EP_NODE, EP_TREE, type SlideSpec } from '../src/content/dialogue/a3_epilogue_kit';
import { B4B_FLAGS } from '../src/content/world/a3_conds';
import { DialogueRunner, type DialogueDef, type Text } from '../src/engine/dialogue/dialogue';
import type { Cond } from '../src/engine/world/logic';
import { actThree, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * The epilogue's headless play (B6s's pattern, shared by B6t and B6u): set an end as B6q/B6r leave it (`a3_end`, `a3_sash`), open
 * the tree as the runtime does, read the page, turn it, open it again. Plus the slices' common checks: every page combination's
 * length, and every flag a slide reads is one the content really writes.
 */

export type Flags = Record<string, string | number | boolean>;
export type End = 'A1' | 'A2' | 'B' | 'C' | 'D' | 'E';
export const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down', a3_summoned: true, a3_pnr: true };
export const END_FLAGS: Record<End, Flags> = {
  A1: { a3_end: 'plan', a3_sash: 'worn' }, A2: { a3_end: 'plan', a3_sash: 'refused' }, B: { a3_end: 'unwritten', a3_sash: 'worn' },
  C: { a3_end: 'concern', a3_sash: 'worn' }, D: { a3_end: 'opensky', a3_sash: 'refused' }, E: { a3_end: 'amendment', a3_sash: 'worn' },
};
export const ENDS = Object.keys(END_FLAGS) as End[];
export const PRESETS: Preset[] = ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'];

/** Act 3 over: the door settled (sealed by the column standing down, unless `flags` say otherwise), the steps climbed, an end reached. */
export function ended(preset: Preset, end: End, flags: Flags = {}, over: Over = {}): A3 {
  const a = actThree(preset, { at: 'md_spire', ...over, flags: { ...AFTER_DOOR, ...END_FLAGS[end], ...(over.flags ?? {}), ...flags } });
  a.g.pc.sheet.name = 'Halden';
  return a;
}

export interface Ev { name: string; data?: unknown }
export interface Page { node: string; text: string; lines: Record<string, string>; options: string[]; events: Ev[] }
export function open(g: G, tree: DialogueDef = d_a3_epilogue): { r: DialogueRunner; page: Page } {
  const events: Ev[] = [];
  const r = new DialogueRunner(tree, g, { event: (name, data) => events.push({ name, data }) });
  const v = r.view()!;
  return { r, page: { node: r.node!, text: v.text, lines: Object.fromEntries(v.passives.map((p) => [p.label, p.text])), options: v.options.map((o) => o.text), events } };
}
export function turn(r: DialogueRunner, option: string): Ev[] {
  const events: Ev[] = [];
  (r as unknown as { host: { event: (n: string, d?: unknown) => void } }).host.event = (name, data) => events.push({ name, data });
  const o = r.view()!.options.find((x) => x.text === option);
  if (!o) throw new Error(`no option "${option}" at ${r.node}`);
  r.choose(o.id);
  return events;
}
/** The epilogue from where it stands to its closing page; every page's "(Next.)" asks for the tree again. */
export function play(g: G, tree: DialogueDef = d_a3_epilogue, pages = 60): Page[] {
  const out: Page[] = [];
  for (let i = 0; i < pages; i++) {
    const { r, page } = open(g, tree);
    out.push(page);
    if (page.node === 'end' || page.node === 'unended') break;
    const fired = turn(r, '(Next.)');
    expect(fired, page.node).toEqual([{ name: 'dialogue', data: { tree: EP_TREE, name: 'Afterwards' } }]);
  }
  return out;
}
export const nodes = (ps: Page[]) => ps.map((p) => p.node);
export const pageOf = (ps: Page[], slide: string) => ps.find((p) => p.node.startsWith(`${slide}_`));
export const nodeOf = (g: G, slide: string) => pageOf(play(g), slide)?.node;
export const variants = (specs: SlideSpec[]) => specs.flatMap((s) => s.variants.map((v) => EP_NODE(s.id, v.id)));
export const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Every page a variant can show (its text entries, `cat` products already expanded) and every line entry, with their word counts:
 * a page 55–115 words (one page, 60–110 by the plan, a little slack either way), a line at most 45. */
export function lengths(specs: SlideSpec[]): { where: string; words: number; line: boolean }[] {
  const entries = (t: Text) => (typeof t === 'string' ? [t] : t.map((p) => p.text));
  return specs.flatMap((s) => s.variants.flatMap((v) => [
    ...entries(v.text).map((t) => ({ where: `${s.id}/${v.id}: ${t}`, words: words(t), line: false })),
    ...[...(v.lines ?? []), ...(s.lines ?? [])].flatMap((l) => entries(l.text).map((t) => ({ where: `${s.id}/${v.id} ${l.label}: ${t}`, words: words(t), line: true }))),
  ]));
}

/** The JSON size of the tree's pages for these slides (their nodes and start entries), a slide's share of the export. */
export function treeBytes(specs: SlideSpec[]): number {
  const ids = new Set(variants(specs));
  return JSON.stringify(Object.entries(d_a3_epilogue.nodes).filter(([id]) => ids.has(id))).length
    + JSON.stringify(d_a3_epilogue.start.filter((s) => ids.has(s.node))).length;
}

// ---------------------------------------------------------------- what the slides read, against what content writes

/** The content's source files, the epilogue's own left out (Act 3's own flags are checked by their prefix). */
function sources(dir: string): { path: string; src: string }[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.ts$/.test(n) && !/a3_epilogue/.test(n) ? [{ path: p, src: readFileSync(p, 'utf8') }] : [];
  });
}
let FILES: { path: string; src: string }[] | undefined;
const files = () => (FILES ??= sources('src/content'));

interface Reads { flags: Map<string, Set<string>>; quests: Set<string>; knows: Set<string>; npcs: Set<string> }
function readsOf(x: unknown, out: Reads): Reads {
  if (!x || typeof x !== 'object') return out;
  if (Array.isArray(x)) { x.forEach((v) => readsOf(v, out)); return out; }
  const o = x as Record<string, unknown>;
  if (typeof o.flag === 'string') {
    const vs = out.flags.get(o.flag) ?? new Set<string>();
    if (typeof o.eq === 'string') vs.add(o.eq);
    out.flags.set(o.flag, vs);
  }
  if (typeof o.quest === 'string') out.quests.add(o.quest);
  if (typeof o.knows === 'string') out.knows.add(o.knows);
  if (typeof o.dead === 'string') out.npcs.add(o.dead);
  if (typeof o.npc === 'string') out.npcs.add(o.npc);
  for (const v of Object.values(o)) readsOf(v, out);
  return out;
}
/** What a set of slides reads (selectors, `met`, lines, text entries, the people in the stills). */
export function reads(specs: SlideSpec[]): Reads {
  return readsOf(specs as unknown as Cond[], { flags: new Map(), quests: new Set(), knows: new Set(), npcs: new Set() });
}
/** Act 3's and the epilogue's own flags (their slices' tests prove them); the arcology's (B6a's list); a Court case's ruling, which
 * courtCase() writes as `ca_<case>` from its rulings' ids. */
const OWN = /^(a3_|ep_)/;
const COURT = /^ca_/;
export function unwritten(specs: SlideSpec[]): string[] {
  const r = reads(specs);
  const bad: string[] = [];
  for (const [flag, values] of r.flags) {
    if (OWN.test(flag) || B4B_FLAGS.includes(flag)) continue;
    const writers = files().filter((f) => new RegExp(`(set|inc): '${flag}'`).test(f.src) || (COURT.test(flag) && f.src.includes(`'${flag.slice(3)}'`)));
    if (!writers.length) { bad.push(flag); continue; }
    for (const v of values) if (!writers.some((f) => f.src.includes(`'${v}'`))) bad.push(`${flag} = ${v}`);
  }
  for (const q of r.quests) if (!QUESTS[q]) bad.push(`quest ${q}`);
  for (const k of r.knows) if (!OWN.test(k) && !files().some((f) => f.src.includes(`learn: '${k}'`))) bad.push(`knows ${k}`);
  for (const n of r.npcs) if (!NPCS[n] && !NPCS[n.replace(/_(apron|steps|a3)$/, '')]) bad.push(`npc ${n}`);
  return bad;
}
/** The plan's slides for a slice, in the epilogue's own order, all present in the assembly. */
export function assembled(specs: SlideSpec[]): boolean {
  return specs.every((s) => EP_SPECS.includes(s));
}

/** The people whose `if` reads the end (`a3_end`, `a3_sash`): none may. Who stands in a still is the runtime's to evaluate, and
 * the builder specialises each page to what its selector fixes, so a person's `if` stays end-free (B6t's rule). */
export function endReadingPeople(specs: SlideSpec[]): string[] {
  const out: string[] = [];
  for (const s of specs) for (const v of s.variants) for (const p of v.people) {
    const f = readsOf(p.if, { flags: new Map(), quests: new Set(), knows: new Set(), npcs: new Set() }).flags;
    if (f.has('a3_end') || f.has('a3_sash')) out.push(`${s.id}/${v.id} ${p.npc}`);
  }
  return out;
}
