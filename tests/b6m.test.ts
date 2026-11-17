import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { FIRE_LIT } from '../src/content/dialogue/a3_fire';
import { A3_READY_DIALOGUES, PNR_NODES } from '../src/content/dialogue/a3_ready';
import { HOLD_KEYS, HOLD_LINES } from '../src/content/quests/a3';
import {
  A1, A2, AT_CLOSE, B, B_MEANS, C, CHARGE_OPEN, D, E, KEYS, M7_SKY, PNR_OPEN, RAFE_WIRES, READY_ACTS, READY_OPEN, modValue,
} from '../src/content/world/a3_conds';
import { A3_WARNINGS } from '../src/content/world/a3_letters';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import type { SkillId } from '../src/engine/stats/rules';
import { skill } from '../src/engine/stats/sheet';
import { availableLetters, sendLetter } from '../src/engine/world/letters';
import { apply, runTimers, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, has, saveAndLoad, stage, status, talk, trigger, waitFor, at as bare, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6m — readiness, what you hold, the point of no return. At the Spire's close, from the Ledger's card until the steps: the works'
 * trestle where the ones who came are asked for the night after (eight acts, each once, each read from its own need and whoever
 * does it); the warning letters to the living on the city's list; the charge, made up from powder by a hand that can wire it; the
 * notebook's "what you hold" page, filled with the gates' keys by where they came from, never naming a way to finish; and the
 * point of no return at the foot of the steps, signposted, warned once, saving first, final, and changing nothing on "(Not yet.)".
 * Each ending's readiness from the fixture's presets, the no-lockout property from the save before the steps (written through the
 * real codec and loaded), each refusal, and a save round-trip. Played headless with the shared Act 3 fixture.
 */

type Flags = Record<string, string | boolean | number>;
interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[]; saved: G[] };
const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down' };
/** A host that records events, and a copy of the state at the moment a save is asked for (what the runtime writes). */
function recorder(): { host: LogicHost; events: Ev[]; saved: G[]; bind: (g: G) => void } {
  const events: Ev[] = [], saved: G[] = [];
  let ref: G | undefined;
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); if (name === 'save' && ref) saved.push(structuredClone(ref)); } };
  return { host, events, saved, bind: (g) => { ref = g; } };
}
/** Act 3 after the door, at the Spire's close, the Ledger's card come (or not, with `card: false`). */
function close(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}, card = true): Game {
  const r = recorder();
  const a = actThree(preset, { at: 'md_spire', ...over, host: r.host, flags: { ...AFTER_DOOR, ...(card ? { a3_summoned: true } : {}), ...(over.flags ?? {}), ...flags } });
  r.bind(a.g);
  a.g.pc.sheet.name = 'Halden';
  if (card) { a.q.questStart('q_a3_spire'); a.q.questStart('q_a3_hold'); }
  a.q.update();
  r.events.length = 0; // the act's title card, from the fixture's reading of the order
  return { ...a, events: r.events, saved: r.saved };
}
/** A fresh game from a loaded state (each ending branched from its own copy of the save). */
function fork(g: G): Game {
  const r = recorder();
  const copy = structuredClone(g);
  r.bind(copy);
  return { g: copy, q: new QuestEngine(QUESTS, copy, r.host), fired: [], events: r.events, saved: r.saved };
}
function go(r: DialogueRunner, a: A3, picks: string[]): DialogueRunner {
  for (const p of picks) {
    const o = r.view()?.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`no option "${p}" at ${r.node} in [${r.view()?.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
  return r;
}
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const passives = (r: DialogueRunner) => r.view()!.passives;
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const kill = (g: G, id: string, map: string) => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const here = (g: G, map: string) => MAPS[map].npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const P = (key: string, map: string) => MAPS[map].npcs!.find((p) => (p.id ?? p.def) === key)!;
const meet = (g: G, ...ids: string[]) => { for (const id of ids) (g.world.met ??= {})[id] = { name: NPCS[id].name, day: 1 }; };
/** Open the trestle at the hub (its first words once, then the hub). */
function trestle(a: A3): DialogueRunner {
  const r = talk('d_a3_ready', a.g, a.q);
  return r;
}
const ACT_TEXT: Record<string, string> = {
  choir: 'Keziah.', stand: 'Ifeoma.', gangs: 'Tuan.', wheel: 'Lucan.', lowe: 'Captain.', saints: 'Verity.', nine: 'Nine.', warned: '(Tell them the living',
};
const ACT_NEED: Record<string, Flags> = {
  choir: { a3_ally_choir: true }, stand: { a3_ally_stand: true }, gangs: { a3_ally_gangs: true }, wheel: { a3_ally_wheel: true },
  lowe: { a3_lowe: 'stood_down' }, saints: { a3_ally_saints: true }, nine: { nine_stance: 'conscience' }, warned: { a3_warned: 3 },
};
const actsOffered = (r: DialogueRunner) => Object.entries(ACT_TEXT).filter(([, t]) => opts(r).some((o) => o.startsWith(t))).map(([k]) => k);
const ALL_ALLIES: Flags = { a3_ally_choir: true, a3_ally_stand: true, a3_ally_gangs: true, a3_ally_wheel: true, a3_ally_saints: true };
/** Every gate key's value, and C's paper (to show an act spends nothing an ending needs). */
const keys = (g: G) => ({ ...Object.fromEntries(Object.entries(KEYS).map(([k, c]) => [k, cond(c, g)])), C_PAPER: has(g, 'k_a3_transfer') });

// ---------------------------------------------------------------- the works' trestle

describe('B6m: the works\' trestle, where the ones who came are asked for the night after', () => {
  it('a plan table before Act 3, relettered before the card, the hub from the card until the steps, bare after them', () => {
    expect(MAPS.md_spire.props!.find((p) => p.id === 'a3_ready')).toMatchObject({ kind: 'table' });
    expect(MAPS.md_spire.talk!.a3_ready.dialogue).toBe('d_a3_ready');
    const early = bare('md_spire');
    expect(talk('d_a3_ready', early.g, early.q).node).toBe('plain');
    const before = close('truce', {}, {}, false);
    expect(talk('d_a3_ready', before.g, before.q).node).toBe('works');
    const a = close('truce');
    const r = trestle(a);
    expect(r.node).toBe('first');
    expect(r.view()!.text).toContain('FOR THE DESIGNATE');
    expect(trestle(a).node).toBe('hub');
    a.g.flags.a3_pnr = true;
    expect(trestle(a).node).toBe('cold');
    expect(opts(trestle(a))).toEqual(['(Leave it.)']);
  });

  it('each act is offered only with its own need and whoever does it, and counts once', () => {
    for (const [act, need] of Object.entries(ACT_NEED)) {
      const a = close('hostile', act === 'nine' ? { companions: { nine: 'party' } } : {}, { a3_lowe: 'withdrawn' });
      expect(actsOffered(trestle(a)), `${act}: nothing without its need`).toEqual([]);
      Object.assign(a.g.flags, need);
      const r = trestle(a);
      expect(actsOffered(r), act).toEqual([act]);
      go(r, a, [ACT_TEXT[act]]);
      expect(a.g.flags[`a3_ready_${act}`], act).toBe(true);
      expect(a.g.flags.a3_ready, act).toBe(1);
      expect(r.node, act).toMatch(/^r_/);
      go(r, a, ['(Back to the trestle.)']);
      expect(actsOffered(r), `${act} once`).toEqual([]);
      expect(cond(READY_OPEN(act), a.g), act).toBe(false);
      expect(trestle(a).node).toBe('hub');
      expect(actsOffered(trestle(a)), `${act} once, coming back`).toEqual([]);
      expect(a.g.flags.a3_ready, act).toBe(1);
      expect(a.g.world.decisions.some((d) => d.id === `a3_ready_${act}`), act).toBe(true);
    }
    expect(Object.keys(ACT_NEED).sort()).toEqual(READY_ACTS.map((x) => x.id).sort());
  });

  it('all eight on a thorough close: the count is eight, and the price of reading everything aloud falls with it', () => {
    const a = close('prepared', {}, { ...ALL_ALLIES, a3_warned: 3 });
    expect(modValue(a.g, M7_SKY)).toBe('burning');
    const r = trestle(a);
    expect(actsOffered(r).sort()).toEqual(Object.keys(ACT_TEXT).sort());
    const order = ['choir', 'stand', 'gangs', 'wheel', 'lowe', 'saints', 'nine', 'warned'];
    order.forEach((act, i) => {
      go(r, a, [ACT_TEXT[act], '(Back to the trestle.)']);
      expect(a.g.flags.a3_ready, act).toBe(i + 1);
      expect(modValue(a.g, M7_SKY), act).toBe(i + 1 >= 5 ? 'held' : i + 1 >= 2 ? 'hard' : 'burning');
    });
    expect(actsOffered(r)).toEqual([]);
    expect(r.view()!.text).toContain('no room left');
  });

  it('the column\'s act reads stood_down only (withdrawn, yielded, carried, dead never count); Lowe, else Reyes, else Kress says it', () => {
    for (const v of ['withdrawn', 'yielded', 'carried', 'dead']) {
      const a = close('truce', {}, { a3_lowe: v });
      expect(cond(READY_OPEN('lowe'), a.g), v).toBe(false);
      expect(actsOffered(trestle(a)), v).not.toContain('lowe');
    }
    const lowe = close('truce');
    const r = go(trestle(lowe), lowe, ['Captain.']);
    expect(r.node).toBe('r_lowe');
    expect(r.view()!.speaker).toBe('npc_md_01');
    expect(r.view()!.text).toContain('I told them before you asked');
    const reyes = close('truce');
    kill(reyes.g, 'npc_md_01', 'md_precinct');
    const rr = go(trestle(reyes), reyes, ['Reyes.']);
    expect(rr.view()!.speaker).toBe('npc_md_12');
    expect(reyes.g.flags.a3_ready_lowe).toBe(true);
    const kress = close('truce');
    kill(kress.g, 'npc_md_01', 'md_precinct');
    kill(kress.g, 'npc_md_12', 'md_precinct');
    const rk = go(trestle(kress), kress, ['(Send to the lane post']);
    expect(rk.node).toBe('r_kress');
    expect(kress.g.flags.a3_ready).toBe(1);
  });

  it('Nine\'s act: Nine on the player\'s side with its conscience or its count; or the fair copy without it; never a conscience Nine that has gone', () => {
    const party = close('truce', { companions: { nine: 'party' } }, { nine_stance: 'conscience' });
    const r = go(trestle(party), party, ['Nine.']);
    expect(r.view()!.speaker).toBe('npc_md_nine');
    const waiting = close('truce', { companions: { nine: 'waiting' } }, { nine_stance: 'deputy', nine_log_given: true });
    expect(actsOffered(trestle(waiting))).toContain('nine');
    const copy = close('truce', { companions: { nine: 'gone' } }, { nine_log_given: true });
    const rc = go(trestle(copy), copy, ['(Chalk the first page']);
    expect(rc.node).toBe('r_copy');
    expect(copy.g.flags.a3_ready_nine).toBe(true);
    const gone = close('truce', { companions: { nine: 'gone' } }, { nine_stance: 'conscience' });
    expect(cond(READY_OPEN('nine'), gone.g)).toBe(false);
    expect(opts(trestle(gone)).some((o) => o.startsWith('Nine.') || o.startsWith('(Chalk'))).toBe(false);
    const deputy = close('truce', { companions: { nine: 'party' } }, { nine_stance: 'deputy' });
    expect(actsOffered(trestle(deputy))).not.toContain('nine');
  });

  it('the Saints\' act is Verity\'s, or a Saints\' boy\'s if she died after answering', () => {
    const a = close('truce', {}, { a3_ally_saints: true, bw_static: 'kept' });
    expect(go(trestle(a), a, ['Verity.']).view()!.speaker).toBe('npc_bw_04');
    const b = close('truce', {}, { a3_ally_saints: true, bw_static: 'kept' });
    kill(b.g, 'npc_bw_04', 'md_bridgeward');
    const r = go(trestle(b), b, ['(Ask the Saints for what Verity promised.)']);
    expect(r.node).toBe('r_saints_boy');
    expect(b.g.flags.a3_ready_saints).toBe(true);
  });

  it('no act spends a means or a keeper: every key of every gate reads the same before and after all eight', () => {
    const a = close('prepared', { b4b: true, items: ['k_a3_transfer', 'k_a3_charge'] }, { ...ALL_ALLIES, a3_ally_seventeen: true, a3_warned: 3, a3_mast: 'raised', a3_mast_keeper: 'wheel', a3_concern_terms: 'accepted' });
    const before = keys(a.g);
    const r = trestle(a);
    for (const act of Object.keys(ACT_TEXT)) go(r, a, [ACT_TEXT[act], '(Back to the trestle.)']);
    expect(a.g.flags.a3_ready).toBe(8);
    expect(keys(a.g)).toEqual(before);
    expect(a.g.flags.a3_mast_keeper).toBe('wheel');
  });

  it('who isn\'t at the table: allies whose need is met but were never written to, a column that did not stand down, a count Nine keeps, the living on the list', () => {
    const a = close('prepared');
    const r = go(trestle(a), a, ['(Count who isn\'t at the table.)']);
    expect(passives(r).map((p) => p.label).sort()).toEqual(['CARRICK\'S STAND', 'THE CHAIN', 'THE CHOIR', 'THE SAINTS', 'THE SHIFT', 'THE WET', 'THE WHEEL']);
    go(r, a, ['(Back to the trestle.)']);
    // a service, asked as often as wanted: it follows the state
    Object.assign(a.g.flags, ALL_ALLIES, { a3_ally_shift: true, a3_ally_seventeen: true });
    const again = go(r, a, ['(Count who isn\'t at the table.)']);
    expect(passives(again)).toEqual([]);
    expect(again.view()!.text).toContain('everybody who could come, came');
    const h = close('hostile', { companions: { nine: 'party' }, knows: ['ar_cast_list'] }, { a3_lowe: 'withdrawn', nine_log_kept: true });
    const rh = go(trestle(h), h, ['(Count who isn\'t at the table.)']);
    expect(passives(rh).map((p) => p.label).sort()).toEqual(['NINE', 'THE CITY\'S LIST', 'THE COLUMN']);
    expect(passives(rh).find((p) => p.label === 'THE COLUMN')!.text).toContain('went home from your door without standing down');
  });

  it('what is laid out on the plank is the notebook\'s page, read live', () => {
    const a = close('prepared', { knows: [] });
    const lay = () => go(trestle(a), a, ['(Lay out what you hold on the plank.)']);
    const live = () => HOLD_LINES.filter((l) => cond(l.done, a.g)).map((l) => `${l.text}.`);
    expect(passives(lay()).map((p) => p.text)).toEqual(live());
    go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'I\'ll carry it.']);
    expect(passives(lay()).map((p) => p.text)).toContain('The Concern\'s paper.');
    go(talk('d_a3_quill', a.g, a.q), a, ['(Give the paper back.)']);
    expect(passives(lay()).map((p) => p.text)).not.toContain('The Concern\'s paper.');
    expect(passives(lay()).map((p) => p.text)).toEqual(live());
    // the notebook keeps a line once ticked (the engine's rule); the plank reads the pack
    expect(a.q.journal().find((j) => j.id === 'q_a3_hold')!.objectives.map((o) => o.text)).toContain('The Concern\'s paper');
  });
});

// ---------------------------------------------------------------- the living on the city's list, warned by letter

describe('B6m: the warning letters to the living on the city\'s list', () => {
  const RECIPIENTS = [...new Set(A3_WARNINGS.map((w) => w.to))];
  const warns = (g: G) => availableLetters(g, LETTERS).map((l) => l.id).filter((id) => id.startsWith('a3_warn_')).sort();
  it('offered after the order and before the steps, to someone met, still living, whose line the player knows', () => {
    const p = close('prepared', { knows: ['ar_cast_list'] });
    expect(warns(p.g)).toEqual([]); // never met by the fixture
    meet(p.g, ...RECIPIENTS);
    expect(warns(p.g)).toEqual(['a3_warn_ada', 'a3_warn_calla', 'a3_warn_jonah', 'a3_warn_kessler', 'a3_warn_maren', 'a3_warn_mason', 'a3_warn_ocho', 'a3_warn_sarr', 'a3_warn_vane']);
    const h = close('hostile', { knows: ['ar_cast_list'] });
    meet(h.g, ...RECIPIENTS);
    // Jonah, Kessler, Mason, Sarr, Ocho and Maren are dead by the city's forecast or the player's road; Calla is in the cells
    expect(warns(h.g)).toEqual(['a3_warn_ada', 'a3_warn_calla_held', 'a3_warn_vane', 'a3_warn_vasha']);
    // the line must be known: the docket read, or that person's own name
    const u = close('prepared');
    meet(u.g, ...RECIPIENTS);
    expect(warns(u.g)).toEqual([]);
    u.g.flags.jonah_named = true;
    u.g.world.knowledge.name12_decoded = true;
    expect(warns(u.g)).toEqual(['a3_warn_jonah', 'a3_warn_maren']);
    // not before the order is read, not after the steps, never to the dead
    const e = actThree('prepared', { point: 'open', knows: ['ar_cast_list'] });
    meet(e.g, ...RECIPIENTS);
    expect(warns(e.g)).toEqual([]);
    p.g.flags.a3_pnr = true;
    expect(warns(p.g)).toEqual([]);
    p.g.flags.a3_pnr = false;
    kill(p.g, 'npc_rd_01', 'overpass');
    expect(warns(p.g)).not.toContain('a3_warn_kessler');
  });

  it('each reply counts once, a duration after sending; three answered open the readiness act; one letter per person', () => {
    const a = close('prepared', { knows: ['ar_cast_list'] });
    meet(a.g, ...RECIPIENTS);
    for (const id of ['a3_warn_jonah', 'a3_warn_ada', 'a3_warn_sarr']) sendLetter(a.g, LETTERS[id]);
    expect(a.g.flags.a3_warned).toBeUndefined();
    expect(cond(READY_OPEN('warned'), a.g)).toBe(false);
    a.g.minutes += 3 * 1440;
    runTimers(a.g);
    expect(a.g.flags.a3_warned).toBe(3);
    expect(a.g.world.post!.filter((p) => ['npc_sh_02', 'npc_sh_01', 'npc_nb_01'].includes(p.from)).length).toBe(3);
    expect(warns(a.g)).not.toContain('a3_warn_jonah');
    expect(cond(READY_OPEN('warned'), a.g)).toBe(true);
    go(trestle(a), a, ['(Tell them the living']);
    expect(a.g.flags.a3_ready_warned).toBe(true);
    // Sister Calla's letter has two forms: written to her in the cells, the free form is not offered again once she walks out
    const c = close('hostile', { knows: ['ar_cast_list'] });
    meet(c.g, 'npc_sh_05');
    expect(warns(c.g)).toEqual(['a3_warn_calla_held']);
    sendLetter(c.g, LETTERS.a3_warn_calla_held);
    c.g.flags.ks_calla = 'free';
    expect(warns(c.g)).toEqual([]);
  });
});

// ---------------------------------------------------------------- the charge

describe('B6m: the charge, made at the close', () => {
  it('the Shift\'s cases come up with Rafe, who sits on them at the trestle and wires them with no check; he is not at home meanwhile', () => {
    const a = close('prepared', {}, { a3_ally_shift: true });
    expect(here(a.g, 'md_spire')).toContain('npc_hs_03_close');
    expect(P('npc_hs_03_close', 'md_spire').dialogue).toBe('d_a3_charge');
    expect(here(a.g, 'hs_skirts')).not.toContain('npc_hs_03');
    eff(a.g, 'explosives', 10);
    const r = talk('d_a3_charge', a.g, a.q);
    expect(r.node).toBe('ch_bench');
    expect(r.view()!.text).toContain('Two is what the Shift can spare');
    go(r, a, ['What would it take to bring a roof down?', '(Back.)', '(Let Rafe make it up.)']);
    expect(r.view()!.speaker).toBe('npc_hs_03');
    expect(has(a.g, 'k_a3_charge')).toBe(true);
    expect(a.g.flags.a3_charge_how).toBe('shift');
    expect(cond(B_MEANS, a.g)).toBe(true);
    expect(talk('d_a3_charge', a.g, a.q).node).toBe('ch_have');
    expect(cond(CHARGE_OPEN, a.g)).toBe(false);
    a.g.flags.a3_pnr = true;
    expect(here(a.g, 'md_spire')).not.toContain('npc_hs_03_close');
    expect(here(a.g, 'hs_skirts')).toContain('npc_hs_03');
  });

  it('Rafe dead in the revolt: Orrin from the cage brings the cases and wires them, at the trestle', () => {
    const a = close('prepared', {}, { a3_ally_shift: true, hs_rafe_dead: true });
    expect(here(a.g, 'md_spire')).not.toContain('npc_hs_03_close');
    const r = go(trestle(a), a, ['(Lay out the powder.)']);
    expect(r.view()!.text).toContain('Orrin');
    go(r, a, ['(Let Orrin make it up.)']);
    expect(r.node).toBe('ch_orrin');
    expect(a.g.flags.a3_charge_how).toBe('shift');
    go(r, a, ['(Back to the trestle.)']);
    expect(opts(r).some((o) => o.startsWith('(Lay out the powder.)'))).toBe(false);
  });

  it('Number Six\'s cases or black powder, wired with Explosives 40 or by Kes; a failure spends nothing and can be tried again', () => {
    const a = close('hostile', { items: ['k_hs_powder'] });
    eff(a.g, 'explosives', 30);
    const r = go(trestle(a), a, ['(Lay out the powder.)']);
    expect(r.view()!.options.find((o) => o.text.startsWith('(Pack the six cases'))!.checkLabel).toBe('Explosives 40');
    go(r, a, ['(Pack the six cases']);
    expect(r.node).toBe('ch_fumble');
    expect(has(a.g, 'k_hs_powder')).toBe(true);
    expect(has(a.g, 'k_a3_charge')).toBe(false);
    expect(a.g.flags.a3_charge_how).toBeUndefined();
    eff(a.g, 'explosives', 40);
    go(r, a, ['(Back.)', '(Pack the six cases']);
    expect(r.node).toBe('ch_made');
    expect(has(a.g, 'k_hs_powder')).toBe(false);
    expect(a.g.flags.a3_charge_how).toBe('cases');
    // black powder: four twists, and Kes's hands need no check
    const k = close('hostile', { companions: { kes: 'party' } });
    eff(k.g, 'explosives', 10);
    apply([{ give: 'j_powder', count: 3 }], k.g);
    expect(opts(trestle(k)).some((o) => o.startsWith('(Lay out the powder.)'))).toBe(false);
    apply([{ give: 'j_powder', count: 1 }], k.g);
    const rk = go(trestle(k), k, ['(Lay out the powder.)', '(Hand Kes the leads and the powder.)']);
    expect(rk.view()!.speaker).toBe('npc_hs_01');
    expect(k.g.flags.a3_charge_how).toBe('kes');
    expect(has(k.g, 'j_powder')).toBe(false);
  });

  it('nothing that burns hard enough: no charge; only at the close; never a second', () => {
    const a = close('hostile');
    expect(opts(trestle(a)).some((o) => o.startsWith('(Lay out the powder.)'))).toBe(false);
    expect(talk('d_a3_charge', a.g, a.q).view()!.options.map((o) => o.text)).toEqual(['(Leave it.)']);
    const early = close('hostile', { items: ['k_hs_powder'] }, {}, false);
    expect(cond(CHARGE_OPEN, early.g)).toBe(false);
    expect(talk('d_a3_charge', early.g, early.q).node).toBe('ch_late');
    const twice = close('hostile', { items: ['k_hs_powder', 'k_a3_charge'] });
    expect(cond(CHARGE_OPEN, twice.g)).toBe(false);
  });

  it('Rafe\'s placements mirror the shared conditions over many states', () => {
    const STATES: Flags[] = [{}, { a3_ally_shift: true }, { a3_ally_shift: true, hs_rafe_dead: true }, { a3_ally_shift: true, a3_pnr: true }, { a3_ally_shift: true, ks_maren: 'hanged' }];
    for (const flags of STATES)
      for (const card of [true, false]) for (const dead of [false, true]) {
        const a = close('prepared', {}, flags, card);
        if (dead) kill(a.g, 'npc_hs_03', 'hs_skirts');
        const tag = `${JSON.stringify(flags)} card=${card} dead=${dead}`;
        expect(cond(P('npc_hs_03_close', 'md_spire').if, a.g), tag).toBe(cond({ all: [AT_CLOSE, RAFE_WIRES] }, a.g));
        const home = MAPS.hs_skirts.npcs!.find((p) => p.def === 'npc_hs_03' && !p.id)!;
        expect(cond(home.if, a.g), tag).toBe(!a.g.flags.hs_rafe_dead && !(cond(AT_CLOSE, a.g) && !!a.g.flags.a3_ally_shift));
      }
  });
});

// ---------------------------------------------------------------- what you hold (the notebook's page)

describe('B6m: what you hold, the notebook\'s page', () => {
  const ID = new Map(QUESTS.q_a3_hold.stages.holding.objectives!.map((o) => [o.id, o]));
  const lines = (g: G, key: string) => HOLD_KEYS[key].some((id) => cond(ID.get(id)!.done, g));
  const KEY: Record<string, Cond> = { ...KEYS, C_PAPER: { item: 'k_a3_transfer' } };
  const TWEAKS: [Over, Flags][] = [
    [{}, {}], [{}, { a3_unwritten: 'with_you' }], [{ companions: { ash: 'party' } }, { ash_orders: 'refused_late' }], [{ items: ['k_a3_charge'] }, {}],
    [{ skills: { mechanics: 60 } }, { a3_bram_cut: true }], [{}, { a3_bram_cut: true }], [{ b4b: true }, {}], [{ alliance: 'guild' }, {}], [{ alliance: 'choir' }, {}],
    [{ items: ['k_a3_transfer'] }, { a3_concern_terms: 'accepted' }], [{}, { a3_mast: 'raised' }], [{ companions: { nine: 'party' } }, { nine_log_given: true }],
    [{}, { a3_ally_seventeen: true, nw_dam: 'truth' }], [{}, { a3_ally_seventeen: true }], [{}, { a3_ally_saints: true, bw_static: 'kept' }], [{ origin: 'archive_clerk' }, {}],
    [{ skills: { science: 80 } }, {}], [{ members: { choir: 'sibling' } }, {}], [{ standing: { openfield: 40 } }, {}], [{}, { ks_calla: 'free' }], [{}, { a3_ally_choir: true, a3_ally_wheel: true }],
    [{ standing: { cistern9: 40 } }, { a3_c9: 'opened' }], [{}, { a3_archive: 'open' }], [{ items: ['k_ar_refusals'] }, { tam_why: true }], [{}, { ar_verdict: 'agreed' }],
    [{}, { ca_precedents: 2 }], [{}, { a3_register_back: true }], [{}, { prec_register: 'kept' }],
  ];
  it('every key of every gate is exactly the disjunction of its lines on the page (so a held key always shows)', () => {
    expect(Object.keys(HOLD_KEYS).sort()).toEqual([...Object.keys(KEYS), 'C_PAPER'].sort());
    for (const id of Object.values(HOLD_KEYS).flat()) expect(ID.has(id), id).toBe(true);
    let held = 0;
    for (const preset of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) for (const [over, flags] of TWEAKS) {
      const a = close(preset, over, flags);
      for (const [k, c] of Object.entries(KEY)) {
        expect(lines(a.g, k), `${preset} ${JSON.stringify([over, flags])} ${k}`).toBe(cond(c, a.g));
        if (cond(c, a.g)) held++;
      }
    }
    expect(held).toBeGreaterThan(300);
  });

  it('each ending\'s readiness from the fixture\'s presets: which ways the player holds at the close, and the page shows each key held', () => {
    const ways = (g: G) => ({
      B: cond(B_MEANS, g), C: cond(KEYS.C_BUYER, g) && has(g, 'k_a3_transfer'),
      D: ['D_VOICE', 'D_READER', 'D_PEOPLE', 'D_ARCHIVE'].every((k) => cond(KEYS[k], g)), E: ['E_FILE', 'E_PREC', 'E_REG'].every((k) => cond(KEYS[k], g)),
    });
    const TABLE: Record<Preset, { B: boolean; C: boolean; D: boolean; E: boolean; keys: string[] }> = {
      prepared: { B: false, C: false, D: false, E: true, keys: ['D_ARCHIVE', 'D_PEOPLE', 'D_READER', 'E_FILE', 'E_PREC', 'E_REG'] },
      hostile: { B: false, C: false, D: false, E: false, keys: [] },
      // a middling game reads the city's hand itself (Science 65 with its attributes)
      choir: { B: true, C: false, D: false, E: false, keys: ['B_MEANS', 'D_PEOPLE', 'D_READER', 'E_REG'] },
      guild: { B: false, C: false, D: false, E: false, keys: ['C_BUYER', 'D_READER', 'E_REG'] },
      ledger: { B: false, C: false, D: false, E: false, keys: ['D_READER', 'E_REG'] },
      truce: { B: false, C: false, D: false, E: false, keys: ['D_READER', 'E_REG'] },
      none: { B: false, C: false, D: false, E: false, keys: ['D_READER', 'E_REG'] },
    };
    for (const [preset, want] of Object.entries(TABLE) as [Preset, (typeof TABLE)[Preset]][]) {
      const a = close(preset);
      const { keys: k, ...w } = want;
      expect(ways(a.g), preset).toEqual(w);
      const held = Object.entries(KEYS).filter(([, c]) => cond(c, a.g)).map(([n]) => n).sort();
      expect(held, preset).toEqual(k);
      // the page ticks a line for every key held, and its "up" line waits for the steps
      const done = a.g.world.quests.q_a3_hold!.done;
      for (const n of held) expect(HOLD_KEYS[n].some((id) => done.includes(id)), `${preset} ${n}`).toBe(true);
      expect(done).not.toContain('up');
      // the first of the ways is always open, whatever is held
      expect(cond({ all: [AT_CLOSE] }, a.g)).toBe(true);
    }
  });

  it('the page names what is held, never a way to finish', () => {
    for (const o of QUESTS.q_a3_hold.stages.holding.objectives!) {
      expect(o.text, o.id).not.toMatch(/ending|finish|open sky|amendment|the plan\b|\bway\b|unwritten end/i);
      if (o.id !== 'up') expect(o.hidden && o.optional, o.id).toBe(true);
    }
    expect(QUESTS.q_a3_hold.stages.holding.journal).toContain('no coming back down');
  });
});

// ---------------------------------------------------------------- the point of no return

describe('B6m: the point of no return at the foot of the steps', () => {
  const UP = ['(Go up.)', '(Go up.)'];
  it('signposted: the first step onto the steps after the card opens it; the lamp and the great doors carry it; not before the card', () => {
    const t = trigger('md_spire', 'a3_pnr');
    expect(t).toMatchObject({ x: 22, y: 16, w: 20, h: 10 });
    expect(t.effects).toEqual([{ event: 'dialogue', data: { tree: 'd_a3_pnr', name: 'The steps' } }]);
    const before = close('truce', {}, {}, false);
    expect(cond(t.if, before.g)).toBe(false);
    expect(talk('d_ar_steps', before.g, before.q).node).toBe('scene');
    expect(talk('d_ar_doors', before.g, before.q).node).toBe('look');
    const a = close('truce');
    expect(cond(t.if, a.g)).toBe(true);
    for (const tree of ['d_a3_pnr', 'd_ar_steps', 'd_ar_doors']) expect(talk(tree, a.g, a.q).node, tree).toBe('pnr_foot');
    const r = go(talk('d_a3_pnr', a.g, a.q), a, ['(Go up.)']);
    expect(r.node).toBe('pnr_warn');
    const warn = r.view()!.text;
    expect(warn).toContain('the story ends here');
    expect(warn).toContain('will be told as it stands');
    expect(warn).toContain('"Before the steps"');
    expect(QUESTS.q_a3_spire.stages.close.journal).toContain('lamp');
    // the props and trees before Act 3 are as they were
    const old = bare('md_spire');
    expect(talk('d_ar_steps', old.g, old.q).node).toBe('scene');
  });

  it('"(Not yet.)" changes nothing, at the foot or at the warning; going through what is held changes nothing either', () => {
    const a = close('prepared', {}, { a3_ally_choir: true });
    const state = () => JSON.stringify({ f: a.g.flags, q: a.g.world.quests, i: a.g.pc.inventory, p: a.g.world.post, t: a.g.world.timers, d: a.g.world.decisions, k: a.g.world.knowledge, m: a.g.minutes, party: a.g.world.party });
    const s0 = state();
    go(talk('d_a3_pnr', a.g, a.q), a, ['(Go through what you hold', '(Put it all back.)', '(Not yet.)']);
    expect(state()).toBe(s0);
    go(talk('d_ar_steps', a.g, a.q), a, ['(Go up.)', '(Not yet.)']);
    expect(state()).toBe(s0);
    expect(a.events).toEqual([]);
    expect(cond(PNR_OPEN, a.g)).toBe(true);
    // coming back: the foot remembers, and nothing else does
    expect(talk('d_ar_doors', a.g, a.q).view()!.text).toContain('again');
  });

  it('"(Go up.)" saves first, then climbs: the save of the state before the steps, then a3_pnr, then the goto; and it is final', () => {
    const a = close('prepared', { knows: ['ar_cast_list'] }, { a3_ally_shift: true });
    expect(stage(a.g, 'q_a3_spire')).toBe('close');
    go(talk('d_a3_pnr', a.g, a.q), a, UP);
    expect(a.events.map((e) => e.name)).toEqual(['save', 'goto', 'dialogue']); // B6p: the steps' scene opens after the goto
    expect(a.events[0].data).toEqual({ slot: 'steps', label: 'Before the steps' });
    expect(a.events[1].data).toEqual({ location: 'md_spire', spawn: 'steps' });
    expect(a.saved).toHaveLength(1);
    expect(a.saved[0].flags.a3_pnr).toBeUndefined();
    expect(a.g.flags.a3_pnr).toBe(true);
    expect(a.g.world.decisions.some((d) => d.id === 'a3_pnr')).toBe(true);
    expect(stage(a.g, 'q_a3_spire')).toBe('steps');
    expect(status(a.g, 'q_a3_hold')).toBe('done');
    // final: nothing of the close is offered again
    for (const tree of ['d_a3_pnr', 'd_ar_steps', 'd_ar_doors']) expect(talk(tree, a.g, a.q).node, tree).toBe('pnr_after');
    expect(talk('d_a3_ready', a.g, a.q).node).toBe('cold');
    expect(talk('d_a3_charge', a.g, a.q).node).toBe('ch_late');
    expect(cond(FIRE_LIT, a.g)).toBe(false);
    for (const x of READY_ACTS) expect(cond(READY_OPEN(x.id), a.g), x.id).toBe(false);
    meet(a.g, ...A3_WARNINGS.map((w) => w.to));
    expect(availableLetters(a.g, LETTERS).filter((l) => l.id.startsWith('a3_warn_'))).toEqual([]);
    expect(here(a.g, 'md_spire')).not.toContain('npc_hs_03_close');
    expect(cond(trigger('md_spire', 'a3_pnr').if, a.g)).toBe(false);
  });

  it('the save before the steps round-trips through the real codec, and loads at the close with the steps still to climb', async () => {
    const a = close('prepared', {}, { ...ALL_ALLIES });
    go(trestle(a), a, ['Keziah.', '(Back to the trestle.)', 'Captain.']);
    const pre = structuredClone(a.g.flags);
    go(talk('d_a3_pnr', a.g, a.q), a, UP);
    const l = await saveAndLoad(a.saved[0]);
    l.q.update();
    expect(l.g.flags.a3_pnr).toBeUndefined();
    expect(l.g.flags).toEqual(pre);
    expect(l.g.flags.a3_ready).toBe(2);
    expect(cond(AT_CLOSE, l.g)).toBe(true);
    expect(stage(l.g, 'q_a3_spire')).toBe('close');
    expect(stage(l.g, 'q_a3_hold')).toBe('holding');
    expect(l.g.world.decisions.some((d) => d.id === 'a3_pnr')).toBe(false);
    expect(here(l.g, 'md_spire').sort()).toEqual(here(a.saved[0], 'md_spire').sort());
    // loadable again and again: from the loaded copy the close goes on, and the steps can be climbed
    const f = fork(l.g);
    go(trestle(f), f, ['Lucan.']);
    expect(f.g.flags.a3_ready).toBe(3);
    go(talk('d_a3_pnr', f.g, f.q), f, UP);
    expect(f.events.map((e) => e.name)).toEqual(['save', 'goto', 'dialogue']);
    expect(f.saved[0].flags.a3_ready).toBe(3);
    expect(f.g.flags.a3_pnr).toBe(true);
  });

  /** Go up from a game at the close (its own save first), then the steps as B6p will: the sash, and the second hearing. */
  function climb(a: Game, sash: 'worn' | 'refused', steps: Flags = {}): void {
    go(talk('d_a3_pnr', a.g, a.q), a, UP);
    apply([{ set: 'a3_sash', value: sash }, ...Object.entries(steps).map(([k, v]) => ({ set: k, value: v }))], a.g, a.q);
    a.q.update();
  }

  it('no lockout (a thorough game): from the save before the steps, every ending is still reachable by its Act 3 alternates', async () => {
    const a = close('prepared');
    meet(a.g, 'npc_hs_02');
    go(talk('d_a3_pnr', a.g, a.q), a, UP);
    const save = (await saveAndLoad(a.saved[0])).g;
    expect(cond(AT_CLOSE, save)).toBe(true);
    // the two forms of the first way need nothing
    for (const [sash, gate] of [['worn', A1], ['refused', A2]] as const) { const f = fork(save); climb(f, sash); expect(cond(gate, f.g), sash).toBe(true); }
    // the core brought down: the Shift's powder, asked by letter after the load, made up at the close by its hand
    const b = fork(save);
    expect(availableLetters(b.g, LETTERS).map((l) => l.id)).toContain('let_a3_shift');
    sendLetter(b.g, LETTERS.let_a3_shift);
    b.g.minutes += LETTERS.let_a3_shift.days * 1440;
    runTimers(b.g);
    go(talk('d_a3_charge', b.g, b.q), b, ['(Let Rafe make it up.)']);
    climb(b, 'refused');
    expect(cond(B, b.g)).toBe(true);
    // the Concern's paper from its officer at the close
    const c = fork(save);
    go(talk('d_a3_quill', c.g, c.q), c, ['(Ask to see the paper.)', 'I\'ll sign it at the core.']);
    climb(c, 'worn');
    expect(cond(C, c.g)).toBe(true);
    // every radio: the hill raised and kept (B6d's routes), the rest already held
    const d = fork(save);
    apply([{ set: 'a3_mast_how', value: 'x' }, { set: 'a3_mast_keeper', value: 'hollow' }, { set: 'a3_mast', value: 'raised' }], d.g);
    climb(d, 'refused');
    expect(cond(D, d.g)).toBe(true);
    // the amendment: already held
    const e = fork(save);
    climb(e, 'worn');
    expect(cond(E, e.g)).toBe(true);
  });

  it('no lockout (the hostile game): from the save before the steps, the close\'s own alternates reach each ending', async () => {
    const a = close('hostile', { tolls: 400 }, { ca_reserve: 'stayed', prec_reserve: 'consent', ca_precedents: 1, a3_archive: 'open' });
    go(talk('d_a3_pnr', a.g, a.q), a, UP);
    const save = (await saveAndLoad(a.saved[0])).g;
    for (const [sash, gate] of [['worn', A1], ['refused', A2]] as const) { const f = fork(save); climb(f, sash); expect(cond(gate, f.g), sash).toBe(true); }
    // black powder bought on the road, wired by a player who learned how
    const b = fork(save);
    apply([{ give: 'j_powder', count: 4 }], b.g);
    eff(b.g, 'explosives', 40);
    go(talk('d_a3_ready', b.g, b.q), b, ['(Lay out the powder.)', '(Pack the black powder']);
    climb(b, 'refused');
    expect(cond(B, b.g)).toBe(true);
    // the officer always offers, on worse terms for this designate
    const c = fork(save);
    go(talk('d_a3_quill', c.g, c.q), c, ['(Ask to see the paper.)', 'I\'ll sign it at the core.']);
    climb(c, 'worn');
    expect(cond(C, c.g)).toBe(true);
    // Sister Calla spoken for at the Court (speech is not sedition: a precedent, and her people), the hill raised, a trained reader
    const d = fork(save);
    eff(d.g, 'speech', 55);
    go(talk('d_ca_court', d.g, d.q), d, ['Twelve-oh-four.', '(Step up to the rail.)', 'What she said is speech']);
    apply([{ set: 'a3_mast_how', value: 'v' }, { set: 'a3_mast_keeper', value: 'knock' }, { set: 'a3_mast', value: 'raised' }], d.g);
    eff(d.g, 'science', 65);
    climb(d, 'refused');
    expect(cond(D, d.g)).toBe(true);
    // the register bought back, the second precedent, and the file contested again on the steps (B6p's second hearing)
    const e = fork(save);
    eff(e.g, 'speech', 55);
    go(talk('d_ca_court', e.g, e.q), e, ['Twelve-oh-four.', '(Step up to the rail.)', 'What she said is speech']);
    go(talk('d_ar_keeper', e.g, e.q), e, ['The copyist\'s book.', '(Buy it back. 200 Tolls)']);
    climb(e, 'worn', { a3_file: 'contested' });
    expect(cond(E, e.g)).toBe(true);
  });

  it('nothing resolves unasked: days at the close settle no act, no charge, no climb', () => {
    const a = close('prepared', { items: ['k_hs_powder'] }, { ...ALL_ALLIES, a3_ally_shift: true, a3_warned: 3 });
    for (let d = 0; d < 6; d++) { waitFor(a.g, a.q, 'md_spire', 7); waitFor(a.g, a.q, 'md_spire', 23); }
    for (const f of ['a3_ready', 'a3_pnr', 'a3_charge_how', ...READY_ACTS.map((x) => `a3_ready_${x.id}`)]) expect(a.g.flags[f], f).toBeUndefined();
    expect(has(a.g, 'k_a3_charge')).toBe(false);
    expect(a.events.filter((e) => e.name === 'save')).toEqual([]);
    expect(stage(a.g, 'q_a3_spire')).toBe('close');
  });
});

// ---------------------------------------------------------------- the trees, the registry, the content

describe('B6m: the trees, the registry and the content', () => {
  it('every node has a line for coming back to it (U7), or only leaves; option ids are unique; all seven companions speak', () => {
    const speakers = new Set<string>();
    for (const d of A3_READY_DIALOGUES) {
      const ids = new Set<string>();
      for (const [k, n] of Object.entries(d.nodes)) {
        if (!n.options.every((o) => o.exit)) expect(n.again, `${d.id}/${k}`).toBeDefined();
        for (const o of n.options) if (o.id) { expect(ids.has(o.id), `${d.id} ${o.id}`).toBe(false); ids.add(o.id); }
        for (const ij of n.interject ?? []) speakers.add(ij.companion);
        if (n.speaker && n.speaker !== 'narrator') speakers.add(n.speaker);
      }
      expect(DIALOGUES[d.id], d.id).toBeDefined();
    }
    for (const c of ['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17']) expect(speakers.has(c), c).toBe(true);
    // the lamp and the doors carry the same foot of the steps
    for (const k of Object.keys(PNR_NODES)) { expect(DIALOGUES.d_ar_steps.nodes[k], k).toBe(PNR_NODES[k]); expect(DIALOGUES.d_ar_doors.nodes[k], k).toBe(PNR_NODES[k]); }
  });

  it('the flags are in the Act 3 registry; the maps are the generators\'; the content validates', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6m (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_ready', 'a3_ready_<act>', 'a3_warned', 'a3_charge_how', 'a3_pnr', 'a3_trestle', 'a3_warned_<who>', 'npc_hs_03_close', 'save', 'goto', 'stood_down']) expect(block.includes(f), f).toBe(true);
    for (const w of A3_WARNINGS) expect(block.includes(`_${w.who}`) || block.includes(`a3_warn_${w.who}`), w.who).toBe(true);
    expect(readFileSync('src/content/maps/md_spire.ts', 'utf8')).toContain('Generated by tools/maps/gen_md_spire.py');
    expect(readFileSync('src/content/maps/hs_skirts.ts', 'utf8')).toContain('Generated by tools/maps/gen_hs_skirts.py');
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3_ready|a3_charge|a3_pnr|a3_warn|md_spire|hs_skirts|d_ar_steps|d_ar_doors|q_a3_hold/.test(e))).toEqual([]);
  });
});
