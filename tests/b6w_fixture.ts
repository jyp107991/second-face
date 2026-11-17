import { expect } from 'vitest';
import { DIALOGUES, LETTERS, MAPS, QUESTS } from '../src/content';
import {
  A1, A2, B, B_MEANS, C, C_BUYER, CALLA_HELD, D, D_ARCHIVE, D_VOICE, E, E_FILE, E_REG, READY_ACTS,
} from '../src/content/world/a3_conds';
import { DialogueRunner, type DialogueDef } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import type { SkillId } from '../src/engine/stats/rules';
import { skill } from '../src/engine/stats/sheet';
import { availableLetters, sendLetter } from '../src/engine/world/letters';
import { apply, runTimers, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, saveAndLoad, waitFor, type G, type Over, type Preset } from './a3_fixture';
import { open as openEp, play as playEp, turn, type Page } from './epilogue_fixture';

/**
 * B6w's playtest kit: Act 3 played the way a player plays it, from the earliest Act 3 save to the credits, through the real scenes.
 * A game here carries the runtime's host (every event recorded; a `save` event snapshots the state as it is when the event fires,
 * which is what the runtime's named slot must do, §9.3). A conversation is driven by preferences: the first open option matching
 * the earliest preference, else a "(Go on.)", else an exit; an exit's `goto` moves the player and an exit's `dialogue` event
 * opens that tree next (the epilogue is left to its own helpers). Nothing here sets an Act 3 flag: every flag the scripts read
 * back was written by a scene, a trigger, a world event, a letter's reply or a timer.
 *
 * Training (`TRAINED`): over Act 3's eight to ten hours a player levels; the §3 table's trainable alternates (Science 65 at the
 * reading desk, Explosives 40 for the charge, the Speech of the Court's rail and the second hearing) are reached by training.
 * The scripts raise those three skills once, at the order's reading, and say so.
 */

export interface Ev { name: string; data?: unknown }
export interface Game { g: G; q: QuestEngine; events: Ev[]; saved: G[]; trail: string[] }
export type Way = 'sign' | 'walk' | 'down' | 'sell' | 'read' | 'amend';
export const WAYS: Way[] = ['sign', 'walk', 'down', 'sell', 'read', 'amend'];
export const END_OF: Record<Way, string> = { sign: 'plan', walk: 'plan', down: 'unwritten', sell: 'concern', read: 'opensky', amend: 'amendment' };
export const GATE: Record<Way, Cond> = { sign: A1, walk: A2, down: B, sell: C, read: D, amend: E };
export const SASH_FOR: Record<Way, 'worn' | 'refused'> = { sign: 'worn', walk: 'refused', down: 'worn', sell: 'worn', read: 'refused', amend: 'worn' };
export const TRAINED: Partial<Record<SkillId, number>> = { speech: 60, science: 65, explosives: 40 };

/** A game with the runtime's host on it. */
export function recorded(g: G): Game {
  const a: Game = { g, q: undefined as unknown as QuestEngine, events: [], saved: [], trail: [] };
  const host: LogicHost = { event: (name, data) => { a.events.push({ name, data }); if (name === 'save') a.saved.push(structuredClone(a.g)); } };
  a.q = new QuestEngine(QUESTS, g, host);
  return a;
}
export const fork = (g: G): Game => recorded(structuredClone(g));
export async function reload(g: G): Promise<Game> { return recorded((await saveAndLoad(g)).g); }
/** Set a skill's value as checks read it. */
export function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
/** Train: raise each skill to at least the value (never lower one). */
export function train(g: G, s: Partial<Record<SkillId, number>> = TRAINED): void {
  for (const [k, v] of Object.entries(s) as [SkillId, number][]) if (skill(g.pc.sheet, k) < v) eff(g, k, v);
}
export const kill = (g: G, id: string, map: string) => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
export const has = (g: G, item: string) => g.pc.inventory.items.some((i) => i.def === item);
export const holds = (g: G, c: Cond) => cond(c, g);

// ---------------------------------------------------------------- conversations, driven

export type Pick = string | RegExp | { id: RegExp };
const matches = (o: { id: string; text: string }, p: Pick) => (typeof p === 'string' ? o.text.startsWith(p) : p instanceof RegExp ? p.test(o.text) : p.id.test(o.id));
const CONT = /^\((Go on|Let (her|him|it) go)\.\)$/;
/** What a player who never stops to refuse would never pick unless asked. */
export const REFUSE = /^\((Not yet|Put the pen down|Stand still in the dark|Stand by the steel door|Stay down here|Stay inside|Step back from the desk|Draw|Fight|Strike it out|Open it again|No\. Not that)/;

export interface Sess { a: Game; tree: string; r: DialogueRunner; readonly node: string | null; readonly ended: boolean; text: () => string; options: () => string[]; pick: (...p: Pick[]) => Sess }
export function talk(a: Game, tree: string): Sess {
  const s: Sess = {
    a, tree, r: new DialogueRunner(DIALOGUES[tree], a.g, a.q),
    get node() { return s.r.node; },
    get ended() { return s.r.ended; },
    text: () => s.r.view()!.text,
    options: () => s.r.view()!.options.filter((o) => !o.locked).map((o) => o.text),
    pick: (...picks: Pick[]) => {
      for (const p of picks) {
        if (s.r.ended) throw new Error(`${s.tree} ended before "${String(p)}"`);
        const o = s.r.view()!.options.find((x) => !x.locked && matches(x, p));
        if (!o) throw new Error(`no option "${String(p)}" at ${s.tree}/${s.r.node} in [${s.options().join(' | ')}]`);
        choose(s, o.id);
      }
      return s;
    },
  };
  a.q.update();
  if (s.r.node) a.trail.push(`${tree}/${s.r.node}`);
  return s;
}
function choose(s: Sess, id: string): void {
  const a = s.a, n = a.events.length;
  s.r.choose(id);
  a.q.update();
  const evs = a.events.slice(n);
  for (const e of evs) if (e.name === 'goto') a.g.locationId = (e.data as { location: string }).location;
  const d = evs.filter((e) => e.name === 'dialogue').pop();
  if (s.r.ended && d && (d.data as { tree: string }).tree !== 'd_a3_epilogue') {
    s.tree = (d.data as { tree: string }).tree;
    s.r = new DialogueRunner(DIALOGUES[s.tree], a.g, a.q);
    a.q.update();
  }
  if (s.r.node) a.trail.push(`${s.tree}/${s.r.node}`);
}
/** Drive a conversation to its end by preferences (earliest first), else "(Go on.)", else an exit that is not a refusal, else any
 * exit. `each` is called before every choice (for a save at each beat). */
export function drive(a: Game, tree: string, prefer: Pick[] = [], each?: (s: Sess) => void, max = 80): Sess {
  const s = talk(a, tree);
  return finish(s, prefer, each, max);
}
export function finish(s: Sess, prefer: Pick[] = [], each?: (s: Sess) => void, max = 80): Sess {
  for (let i = 0; i < max && !s.r.ended; i++) {
    each?.(s);
    if (s.r.ended) break;
    const open = s.r.view()!.options.filter((o) => !o.locked);
    const o = prefer.map((p) => open.find((x) => matches(x, p))).find(Boolean)
      ?? open.find((x) => CONT.test(x.text))
      ?? open.find((x) => x.exit && !REFUSE.test(x.text))
      ?? open.find((x) => !REFUSE.test(x.text))
      ?? open.find((x) => x.exit);
    if (!o) throw new Error(`nothing to choose at ${s.tree}/${s.r.node}`);
    choose(s, o.id);
  }
  return s;
}
/** Step onto a map trigger as the runtime does: applied only if its condition holds. */
export function trig(a: Game, map: string, id: string): boolean {
  const t = MAPS[map].triggers!.find((x) => x.id === id);
  if (!t) throw new Error(`no trigger ${map}/${id}`);
  if (!cond(t.if, a.g)) return false;
  apply(t.effects, a.g, a.q);
  a.q.update();
  return true;
}
export const opened = (a: Game) => a.events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);

// ---------------------------------------------------------------- the long run: the earliest Act 3 save to the point of no return

/** The earliest Act 3 save: Acts 1–2 closed on the preset's history, the post not yet come (the fixture's `eve`), written through
 * the real codec and read back. `metAll` marks the people a thorough Acts 1–2 met (the muster's recipients). */
export async function earliest(preset: Preset, over: Over = {}): Promise<Game> {
  const e = actThree(preset, { ...over, point: 'eve' });
  e.g.pc.sheet.name = 'Halden';
  const a = await reload(e.g);
  expect(a.g.flags.a3_open).toBeUndefined();
  return a;
}
/** The post at seven, the order read (and Unit 9's notice, when Nine is on the player's side). The player trains. */
export function readOrder(a: Game, trainTo: Partial<Record<SkillId, number>> | null = TRAINED): void {
  waitFor(a.g, a.q, a.g.locationId, 7);
  expect(a.g.flags.a3_open).toBe(true);
  drive(a, 'd_a3_order_read', ['(Break the seal.)', /^\(There is a fourth sheet/, /^\(Fold/]);
  expect(a.g.flags.a3_order_read).toBe(true);
  if (trainTo) train(a.g, trainTo);
}
/** Mark the muster's recipients met (a thorough Acts 1–2 met them all), send every Act 3 letter that is open, and let the replies come. */
export function muster(a: Game, meet = true, days = 7): string[] {
  const ls = Object.values(LETTERS).filter((l) => /^(let_a3_|a3_warn_)/.test(l.id));
  if (meet) for (const l of ls) (a.g.world.met ??= {})[l.to] ??= { name: l.to, day: 1 };
  const sent = availableLetters(a.g, LETTERS).filter((l) => /^(let_a3_|a3_warn_)/.test(l.id));
  for (const l of sent) sendLetter(a.g, l, a.q);
  a.g.minutes += days * 1440;
  runTimers(a.g, a.q);
  a.q.update();
  return sent.map((l) => l.id);
}
/** At the Court (md_spire), before the door: Reserve 9 against the fourth order (consent, else attendance), and Sister Calla's
 * case while she is held. Each heard only if it is on the bench. */
export function court(a: Game): void {
  const here = a.g.locationId;
  a.g.locationId = 'md_spire';
  const calls = () => talk(a, 'd_ca_court').options();
  if (calls().some((t) => t.startsWith('Reserve 9 against'))) {
    const s = talk(a, 'd_ca_court').pick('Reserve 9 against the fourth order', '(Step up to the rail.)');
    for (let i = 0; i < 8; i++) { const ev = s.options().find((t) => /^\(Put the|^The reserve's census|^Read your own register|^And the heading/.test(t)); if (!ev) break; s.pick(ev); }
    finish(s, ['Three refusals on your own record', 'The order executes on the designate', 'Condition precedent.']);
    expect(['stayed', 'attendance']).toContain(a.g.flags.ca_reserve);
  }
  if (holds(a.g, CALLA_HELD) && calls().some((t) => t.startsWith('Twelve-oh-four.'))) {
    const s = talk(a, 'd_ca_court').pick('Twelve-oh-four.', '(Step up to the rail.)');
    finish(s, ['What she said is speech']);
    expect(a.g.flags.ca_calla).toBe('speech');
  }
  a.g.locationId = here;
}
/** The Court's register asked back of the catalogue (bought, at two hundred: the player earns what is short). */
export function register(a: Game): void {
  if (holds(a.g, E_REG)) return;
  const here = a.g.locationId;
  a.g.locationId = 'md_spire';
  if (a.g.pc.inventory.tolls < 200) a.g.pc.inventory.tolls = 200;
  drive(a, 'd_ar_keeper', ['The copyist\'s book.', '(Buy it back. 200 Tolls)']);
  expect(a.g.flags.a3_register_back).toBe(true);
  a.g.locationId = here;
}
/** Home to Knock under the player's own steam: the first midnight on Knock's map; the arrival. */
export function home(a: Game): void {
  waitFor(a.g, a.q, 'c9_mouth', 0);
  expect(a.g.flags.a3_at_knock).toBe(true);
  if (trig(a, 'c9_mouth', 'a3_arrive')) drive(a, 'd_a3_home', ['(Go to the column']);
}
/** Inside the Cistern by MOTHER's tray lift, and the Archive opened by Ines (only if the game holds no archive yet). */
export function archive(a: Game): void {
  if (holds(a.g, D_ARCHIVE)) return;
  drive(a, 'd_kn_hatch', ['MOTHER. The order executes at the door.', '(Climb down the lift shaft.)']);
  expect(a.g.flags.a3_inside).toBe(true);
  expect(a.g.locationId).toBe('cistern9');
  drive(a, 'd_a3_ines', ['The Archive.', 'Open it, Ines.', '(Watch her open it.)']);
  expect(a.g.flags.a3_archive).toBe('open');
  a.g.locationId = 'c9_mouth';
}
/** The door: the column brought down the lane; at the yellow line, the captain stands it down (or the order is declined). */
export function door(a: Game, word: Pick[] = ['Stand them down, Captain.', '(Attend the door, and formally decline']): void {
  drive(a, 'd_a3_lowe', ['I\'m ready to attend.', '(Walk down the lane']);
  expect(a.g.flags.a3_column_apron).toBe(true);
  trig(a, 'c9_mouth', 'a3_door_line');
  drive(a, 'd_a3_door', [/^\(Look up/, ...word, '(Leave the apron.)']);
  expect(a.g.flags.a3_c9).toBeDefined();
}
/** The Ledger's card at the next seven, the road to the city, the close and who came to it. */
export function summons(a: Game): void {
  waitFor(a.g, a.q, a.g.locationId, 7);
  expect(a.g.flags.a3_summoned).toBe(true);
  a.g.locationId = 'md_spire';
  if (trig(a, 'md_spire', 'a3_close')) drive(a, 'd_a3_close');
}
/** Signal Hill raised (the feed cabinet, Science 50) and kept by Knock, which is always offered. */
export function mast(a: Game): void {
  if (holds(a.g, D_VOICE)) return;
  const here = a.g.locationId;
  a.g.locationId = 'signalhill';
  drive(a, 'd_a3_mast', ['(Work the feed cabinet', 'Knock keeps it.']);
  expect(a.g.flags.a3_mast).toBe('raised');
  a.g.locationId = here;
}
/** The Concern's officer at the close: the paper taken to sign at the core. */
export function officer(a: Game): void {
  if (has(a.g, 'k_a3_transfer')) return;
  drive(a, 'd_a3_quill', ['(Ask to see the paper.)', 'I\'ll sign it at the core.']);
  expect(has(a.g, 'k_a3_transfer')).toBe(true);
  expect(holds(a.g, C_BUYER)).toBe(true);
}
/** The charge at the works' trestle: the Shift's cases made up by its hand, or black powder (bought on the road) packed by a player
 * who learned how (Explosives 40). Only if the game holds no means yet. */
export function charge(a: Game, always = false): void {
  if (holds(a.g, B_MEANS) && !always) return;
  if (!has(a.g, 'j_powder') && !has(a.g, 'k_hs_powder') && !holds(a.g, { flag: 'a3_ally_shift' })) apply([{ give: 'j_powder', count: 4 }], a.g);
  drive(a, 'd_a3_ready', ['(Lay out the powder.)', '(Let Rafe make it up.)', '(Let Orrin make it up.)', '(Pack the six cases', '(Pack the black powder', '(Leave the trestle.)']);
  expect(has(a.g, 'k_a3_charge')).toBe(true);
}
/** `n` of the readiness acts at the trestle (each once; whoever promised it is there). Returns the count. */
export function ready(a: Game, n = 8): number {
  const acts = READY_ACTS.map((x) => new RegExp(`^a3r\\.(${x.id === 'lowe' ? 'lowe|reyes|kress' : x.id === 'saints' ? 'saints|saints\\.boy' : x.id === 'nine' ? 'nine|copy' : x.id})(\\.|$)`));
  for (let i = 0; i < n; i++) {
    const s = talk(a, 'd_a3_ready');
    const before = Number(a.g.flags.a3_ready ?? 0);
    const v = s.r.view();
    const o = v?.options.find((x) => !x.locked && acts.some((re) => re.test(x.id)));
    if (!o) break;
    s.pick({ id: new RegExp(`^${o.id.replace(/\./g, '\\.')}$`) });
    expect(Number(a.g.flags.a3_ready)).toBe(before + 1);
  }
  return Number(a.g.flags.a3_ready ?? 0);
}
/** The foot of the steps: "(Go up.)" twice; the save the runtime writes, as the event fired, comes back. */
export function goUp(a: Game): G {
  const n = a.saved.length;
  const s = drive(a, 'd_a3_pnr', ['(Go up.)', '(Go up.)'], undefined, 2);
  expect(a.saved.length).toBe(n + 1);
  expect(a.events.find((e) => e.name === 'save')!.data).toEqual({ slot: 'steps', label: 'Before the steps' });
  expect(a.g.flags.a3_pnr).toBe(true);
  expect(s.tree).toBe('d_a3_steps');
  return a.saved[n];
}

// ---------------------------------------------------------------- after the save: the steps, the stair, the desk, the climax

const STEP_ON = /^\(Go down|^\(Tamsin|^\(Ash|^\(Somebody|^\(Let Ash stand|^Nothing that counts|^Look at what|^Then hear what|^Ash\. Give me|^\(Look round for Ash|^Knock's door|^I don't know yet|^Whatever keeps/;
/** From a loaded "Before the steps" save: up the steps (the second hearing first if the file wants it), the sash as asked, down
 * the stair to the desk. `speech` is the word on the steps (Ash and the blade read it). */
export async function down(save: G, sash: 'worn' | 'refused', opts: { hearing?: boolean; speech?: number; steps?: Pick[] } = {}): Promise<Game> {
  const f = await reload(save);
  expect(f.g.flags.a3_pnr).toBeUndefined();
  if (opts.speech !== undefined) eff(f.g, 'speech', opts.speech);
  const up = drive(f, 'd_a3_pnr', ['(Go up.)', '(Go up.)'], undefined, 2);
  expect(up.tree).toBe('d_a3_steps');
  up.pick('(Something is coming down the steps');
  if (opts.hearing ?? !holds(f.g, E_FILE)) {
    if (up.options().some((t) => t.startsWith('(Before anything else'))) up.pick('(Before anything else', 'I contest it.', '(Turn back to Three.)');
  }
  up.pick(sash === 'worn' ? '(Take the sash.)' : '(Don\'t take it.)');
  for (let i = 0; i < 14 && up.node !== 'st_end'; i++) {
    const open = up.r.view()!.options.filter((x) => !x.locked);
    const o = (opts.steps ?? []).map((p) => open.find((x) => matches(x, p))).find(Boolean) ?? open.find((x) => STEP_ON.test(x.text));
    if (!o) throw new Error(`stuck on the steps at ${up.node}: ${up.options().join(' | ')}`);
    up.pick(o.text);
  }
  expect(f.g.flags.a3_sash).toBe(sash);
  f.events.length = 0;
  drive(f, 'd_ar_vault', ['(Go down.)'], undefined, 1);
  expect(f.g.locationId).toBe('md_vault');
  return f;
}
const DESK: Record<Way, Pick[]> = {
  sign: ['(Sit down in the chair, and sign', '(Sign.)'], walk: ['(Leave the chair empty', '(Go up the stair.)'],
  down: ['(Bring it down.)'], sell: ['(Lay the Concern', '(Sign it.)'],
  read: ['(Turn the relay key'], amend: ['(Sit down in the chair, and amend', '(Sit down, and wait for the register.)'],
};
const WAY_TEXT: [string, Way][] = [['(Sit down in the chair, and sign', 'sign'], ['(Leave the chair empty', 'walk'], ['(Bring it down.)', 'down'], ['(Lay the Concern', 'sell'], ['(Turn the relay key', 'read'], ['(Sit down in the chair, and amend', 'amend']];
/** The ways the desk offers this game. */
export function desk(a: Game): Way[] {
  const f = fork(a.g);
  const s = talk(f, 'd_a3_ledger');
  if (s.node === 'arrive') s.pick('(Walk down the aisle', '(Listen.)');
  s.pick('(Go to the desk.)');
  return s.options().flatMap((t) => WAY_TEXT.filter(([p]) => t.startsWith(p)).map(([, w]) => w));
}
/** At the desk, the way chosen and confirmed (the means or reader as picked), then its "(Go on.)" opens the climax. */
export function choose_(a: Game, way: Way, how: Pick[] = []): Sess {
  const s = talk(a, 'd_a3_ledger');
  if (s.node === 'arrive') s.pick('(Walk down the aisle', '(Listen.)');
  s.pick('(Go to the desk.)', ...DESK[way]);
  for (let i = 0; i < 4 && !s.options().includes('(Go on.)'); i++) {
    const open = s.r.view()!.options.filter((o) => !o.locked && !REFUSE.test(o.text));
    const o = how.map((p) => open.find((x) => matches(x, p))).find(Boolean) ?? open[0];
    s.pick(o.text);
  }
  expect(a.g.flags.a3_end).toBe(END_OF[way]);
  s.pick('(Go on.)');
  expect(s.tree).toBe(`d_a3_end_${END_OF[way]}`);
  return s;
}
export { choose_ as atDesk };

/** The epilogue as the climax leaves it: every page to the closing one, whose option rolls the credits. */
export function epilogue(g: G): { pages: Page[]; first: string; ids: string[]; credits: Ev[] } {
  const pages = playEp(g);
  expect(pages[pages.length - 1].node).toBe('end');
  const { r } = openEp(g);
  const credits = turn(r, '(The end.)');
  return { pages, first: pages[0].node, ids: pages.map((p) => p.node), credits };
}
export const tree = (id: string): DialogueDef => DIALOGUES[id];
