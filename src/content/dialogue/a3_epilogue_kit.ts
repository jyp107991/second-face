import type { DialogueDef, NodeDef, OptionDef, PassiveDef, Text } from '../../engine/dialogue/dialogue';
import type { Cond, Effect } from '../../engine/world/logic';
import type { WeatherKind } from '../../engine/world/weather';
import { EP_SLIDES, M9_STANDING, type Mod } from '../world/a3_conds';

/**
 * The epilogue's builder (B6s). The epilogue is one narrator tree, `d_a3_epilogue`, built from data: an ordered list of
 * slides, each a page of text beside a still composed in the world. Slices B6s–B6v each write their slides as `SlideSpec`
 * data in their own file and add them to the list in `a3_epilogue.ts`; nothing else changes (no engine change, no other
 * tree touched).
 *
 * A slide has a `met` condition (the coordinator's default: only the slides whose subject the player met are shown; none
 * means always) and ordered `variants`, its selectors: the first whose `if` holds is shown, and the last has no `if`, so
 * every slide has a default. A variant is a still (`place`/`spot`, the `people` in it, the PC's age as `pc.years`, the
 * light and the weather), the page's text, and its `lines`: short lines under the text, each shown while its `if` holds
 * (the twelve's fates, the people of a place, a place's word on the player), rendered as the node's passives.
 *
 * How the tree runs. Each variant is one node, `<slide>_<variant>`. Entering it fires the runtime's `slide` event with the
 * still (§9.1) and sets `ep_<slide>` to the variant id (for tests and a later replay of the record). The routing is the
 * tree's own start list, which is first-match: one entry per variant, in slide order, each guarded by "this slide not yet
 * shown" (`ep_<slide>` unset), the slide's `met` and the variant's `if`; then the closing page. "(Next.)" is an exit that
 * asks for the same tree again (the existing `dialogue` event), so the next page is the first entry that still holds:
 * the first variant that applies of the next slide that applies. This keeps the tree linear in its slides (options
 * routed to every later variant would grow with the square of the slides), and an epilogue interrupted by a load resumes
 * at the first slide not yet shown. From the second page on, "(Skip to the end.)" sets `ep_skip` and goes to the closing
 * page. The closing page's one option fires `{ event: 'credits' }` (§9.4: the credits, then the title; the save before
 * the steps stays). The tree opens only once an end has been reached (`a3_end`).
 *
 * Story notes: story/B6_NOTES_SECRET.md §6 and "As built" → B6s.
 */

export const EP_TREE = 'd_a3_epilogue';
export type Light = 'dawn' | 'day' | 'dusk' | 'night';
/** Someone standing in a still, in their end state (the runtime dresses and ages them), shown while `if` holds. */
export interface SlidePerson { npc: string; if?: Cond }
/** A line under the page: shown while `if` holds; its text is first-match like any Text (an array ends in a default). */
export interface SlideLine { label: string; if?: Cond; text: Text }
export interface SlideVariant {
  id: string;
  /** The selector. Omitted only on the last variant (the default). */
  if?: Cond;
  /** Map id and one of its spots, where the still is composed. */
  place: string;
  spot: string;
  people: SlidePerson[];
  /** The PC in the still, aged `years` from now; `with`: the NPC beside them (B6v's partner). */
  pc?: { years: number; with?: string };
  light?: Light;
  weather?: WeatherKind;
  /** The page: past tense, 60–110 words. */
  text: Text;
  lines?: SlideLine[];
}
export interface SlideSpec {
  /** One of EP_SLIDES (a3_conds.ts): its place there is its place in the epilogue. */
  id: string;
  /** The player met the slide's subject. Omitted: always shown. */
  met?: Cond;
  variants: SlideVariant[];
  /** Lines shown under every variant's page, after the variant's own. */
  lines?: SlideLine[];
}
/** The `slide` event's data (§9.1): everything the runtime needs to compose the still. */
export interface SlideData { slide: string; variant: string; place: string; spot: string; people: SlidePerson[]; pc?: SlideVariant['pc']; light?: Light; weather?: WeatherKind }

export const F = (flag: string, eq?: string | number | boolean): Cond => (eq === undefined ? { flag } : { flag, eq });
export const ALL = (...c: Cond[]): Cond => ({ all: c });
export const ANY = (...c: Cond[]): Cond => ({ any: c });
export const NOT = (c: Cond): Cond => ({ not: c });

export const EP_FLAG = (slide: string): string => `ep_${slide}`;
export const EP_NODE = (slide: string, variant: string): string => `${slide}_${variant}`;
/** Ask for the epilogue again: the next page is the start list's first entry that still holds. */
export const EP_REOPEN: Effect = { event: 'dialogue', data: { tree: EP_TREE, name: 'Afterwards' } };

const parts = (t: Text): { if?: Cond; text: string }[] => (typeof t === 'string' ? [{ text: t }] : t);
const join = (a: string, b: string): string => (a && b ? `${a} ${b}` : a || b);
const both = (a?: Cond, b?: Cond): Cond | undefined => (a && b ? ALL(a, b) : a ?? b);

/** Sentences joined into one page: the product of each part's variants, in order. Because each part ends in a default,
 * the first entry that holds is each part's own first match, joined; an empty text drops that part from the page. Keep
 * products small (a few parts of a few variants each). */
export function cat(...ts: Text[]): Text {
  let acc: { if?: Cond; text: string }[] = [{ text: '' }];
  for (const t of ts) {
    const ps = parts(t);
    if (ps[ps.length - 1].if) throw new Error('cat: every part must end in a default (no if)');
    acc = acc.flatMap((a) => ps.map((p) => ({ ...(both(a.if, p.if) ? { if: both(a.if, p.if) } : {}), text: join(a.text, p.text) })));
  }
  return acc.length === 1 && !acc[0].if ? acc[0].text : acc;
}

/** A Text with one entry per value of a modifier, in the modifier's own order (so the text shown is the value `modValue`
 * gives). Values without a text are skipped; the modifier's default must have one. */
export function modText(m: Mod, texts: Record<string, string>): Text {
  const out = m.values.filter((v) => v.id in texts).map((v) => ({ ...(v.if ? { if: v.if } : {}), text: texts[v.id] }));
  if (!out.length || out[out.length - 1].if) throw new Error(`modText ${m.id}: the default value needs a text`);
  return out;
}

/** A slide's variants as a modifier's values, one each, in its order: the variant shown is the value `modValue` gives. */
export function modVariants(m: Mod, spec: Record<string, Omit<SlideVariant, 'id' | 'if'>>): SlideVariant[] {
  for (const k of Object.keys(spec)) if (!m.values.some((v) => v.id === k)) throw new Error(`modVariants ${m.id}: no value ${k}`);
  return m.values.map((v) => {
    if (!spec[v.id]) throw new Error(`modVariants ${m.id}: no variant for ${v.id}`);
    return { id: v.id, ...(v.if ? { if: v.if } : {}), ...spec[v.id] };
  });
}

/** A place's word on the player (M9: local standing by band, never karma): a line shown unless the band is `none`. */
export function standingLine(settlement: string, label: string, texts: { loved: string; liked: string; hated: string }): SlideLine {
  const m = M9_STANDING(settlement);
  const at = (id: string): Cond => m.values.find((v) => v.id === id)!.if!;
  return { label, if: ANY(at('loved'), at('liked'), at('hated')), text: [{ if: at('loved'), text: texts.loved }, { if: at('liked'), text: texts.liked }, { text: texts.hated }] };
}

function checkText(where: string, t: Text): void {
  const ps = parts(t);
  if (!ps.length || ps[ps.length - 1].if) throw new Error(`${where}: a text's last variant must have no if`);
  for (const p of ps) if (!p.text.trim()) throw new Error(`${where}: empty text`);
}

// ---------------------------------------------------------------- specialising a page to what its selector already says

/** A variant's node is entered only when its `if` holds, so the flags its `if` fixes by equality (at the top of its `all`s:
 * `a3_end`, `a3_sash`, `a3_c9`...) are known on that page. Lines and texts are partially evaluated against them: an entry
 * that can never show there is dropped, the first that always shows becomes the default. The page reads exactly as before
 * (tested against the unspecialised tree); the exported tree is smaller, because a slide's lines repeat on every variant. */
type Known = Map<string, string | number | boolean>;
const TRUE: Cond = { all: [] }, FALSE: Cond = { any: [] };
const isTrue = (c: Cond): boolean => 'all' in c && c.all.length === 0;
const isFalse = (c: Cond): boolean => 'any' in c && c.any.length === 0;
function facts(c: Cond | undefined, k: Known): Known {
  if (c && 'all' in c) for (const x of c.all) facts(x, k);
  else if (c && 'flag' in c && c.eq !== undefined && c.gte === undefined && c.lte === undefined && !c.flag.startsWith('ep_')) k.set(c.flag, c.eq);
  return k;
}
export function simplify(c: Cond, k: Known): Cond {
  if ('all' in c) {
    const xs = c.all.map((x) => simplify(x, k));
    if (xs.some(isFalse)) return FALSE;
    const ys = xs.filter((x) => !isTrue(x));
    return ys.length === 0 ? TRUE : ys.length === 1 ? ys[0] : { all: ys };
  }
  if ('any' in c) {
    const xs = c.any.map((x) => simplify(x, k));
    if (xs.some(isTrue)) return TRUE;
    const ys = xs.filter((x) => !isFalse(x));
    return ys.length === 0 ? FALSE : ys.length === 1 ? ys[0] : { any: ys };
  }
  if ('not' in c) {
    const x = simplify(c.not, k);
    return isTrue(x) ? FALSE : isFalse(x) ? TRUE : { not: x };
  }
  if ('flag' in c && k.has(c.flag)) {
    const v = k.get(c.flag)!;
    if (c.eq !== undefined) return v === c.eq ? TRUE : FALSE;
    if (c.gte === undefined && c.lte === undefined) return v ? TRUE : FALSE;
    return typeof v === 'number' && (c.gte === undefined || v >= c.gte) && (c.lte === undefined || v <= c.lte) ? TRUE : FALSE;
  }
  return c;
}
function specialText(t: Text, k: Known): Text {
  if (typeof t === 'string') return t;
  const out: { if?: Cond; text: string }[] = [];
  for (const p of t) {
    const c = p.if ? simplify(p.if, k) : TRUE;
    if (isFalse(c)) continue;
    if (isTrue(c)) { out.push({ text: p.text }); break; }
    out.push({ if: c, text: p.text });
  }
  return out.length === 1 && !out[0].if ? out[0].text : out;
}
function specialLines(ls: SlideLine[], k: Known): SlideLine[] {
  return ls.flatMap((l) => {
    const c = l.if ? simplify(l.if, k) : TRUE;
    return isFalse(c) ? [] : [{ label: l.label, ...(isTrue(c) ? {} : { if: c }), text: specialText(l.text, k) }];
  });
}
function specialPeople(ps: SlidePerson[], k: Known): SlidePerson[] {
  return ps.flatMap((p) => {
    const c = p.if ? simplify(p.if, k) : TRUE;
    return isFalse(c) ? [] : [{ npc: p.npc, ...(isTrue(c) ? {} : { if: c }) }];
  });
}

const NEXT: OptionDef = { text: '(Next.)', effects: [{ set: 'ep_turned' }, EP_REOPEN], exit: true };
const SKIP: OptionDef = { text: '(Skip to the end.)', if: F('ep_turned'), effects: [{ set: 'ep_skip' }, EP_REOPEN], exit: true };

/** Build the epilogue tree from its slides (any order: they are put in EP_SLIDES order). Throws on a malformed slide.
 * `specialise: false` builds the same tree without partial evaluation (the tests compare the two). */
export function epilogueTree(slides: SlideSpec[], close: Text, o: { closeOption?: string; specialise?: boolean } = {}): DialogueDef {
  const closeOption = o.closeOption ?? '(The end.)';
  const seen = new Set<string>();
  for (const s of slides) {
    if (!EP_SLIDES.includes(s.id)) throw new Error(`epilogue: ${s.id} is not one of EP_SLIDES`);
    if (seen.has(s.id)) throw new Error(`epilogue: slide ${s.id} twice`);
    seen.add(s.id);
    if (!s.variants.length) throw new Error(`epilogue ${s.id}: no variants`);
    const ids = new Set<string>();
    s.variants.forEach((v, i) => {
      const where = `epilogue ${s.id}/${v.id}`;
      if (!/^[a-z][a-z0-9_]*$/.test(v.id) || ids.has(v.id)) throw new Error(`${where}: bad or repeated variant id`);
      ids.add(v.id);
      const last = i === s.variants.length - 1;
      if (last && v.if) throw new Error(`${where}: the last variant is the default and has no if`);
      if (!last && !v.if) throw new Error(`${where}: only the last variant may have no if`);
      checkText(where, v.text);
      for (const l of [...(v.lines ?? []), ...(s.lines ?? [])]) checkText(`${where} line ${l.label}`, l.text);
    });
  }
  const ordered = [...slides].sort((a, b) => EP_SLIDES.indexOf(a.id) - EP_SLIDES.indexOf(b.id));
  const start: DialogueDef['start'] = [{ if: NOT(F('a3_end')), node: 'unended' }, { if: F('ep_skip'), node: 'end' }];
  const nodes: Record<string, NodeDef> = {};
  for (const s of ordered) {
    for (const v of s.variants) {
      const node = EP_NODE(s.id, v.id);
      start.push({ if: ALL(NOT(F(EP_FLAG(s.id))), ...(s.met ? [s.met] : []), ...(v.if ? [v.if] : [])), node });
      const k: Known = o.specialise === false ? new Map() : facts(v.if, new Map());
      const data: SlideData = {
        slide: s.id, variant: v.id, place: v.place, spot: v.spot, people: specialPeople(v.people, k),
        ...(v.pc ? { pc: v.pc } : {}), ...(v.light ? { light: v.light } : {}), ...(v.weather ? { weather: v.weather } : {}),
      };
      const passives: PassiveDef[] = specialLines([...(v.lines ?? []), ...(s.lines ?? [])], k).map((l) => ({ ...(l.if ? { if: l.if } : {}), label: l.label, text: l.text }));
      nodes[node] = {
        speaker: 'narrator', text: specialText(v.text, k), ...(passives.length ? { passives } : {}),
        effects: [{ event: 'slide', data }, { set: EP_FLAG(s.id), value: v.id }],
        options: [NEXT, SKIP],
      };
    }
  }
  start.push({ node: 'end' });
  nodes.end = { speaker: 'narrator', text: close, effects: [{ set: 'ep_done' }], options: [{ text: closeOption, effects: [{ event: 'credits' }], exit: true }] };
  nodes.unended = { speaker: 'narrator', text: 'Not yet.', options: [{ text: '(Close.)', exit: true }] };
  return { id: EP_TREE, owner: 'narrator', start, nodes };
}
