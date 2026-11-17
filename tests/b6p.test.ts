import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_STEPS_DIALOGUES } from '../src/content/dialogue/a3_steps';
import {
  A1, A2, ASH_MODE, AT_VAULT, B, BLADE_DUE, C, COMPANIONS, COMPANION_KEYS, D, E, E_FILE, HEARING_OPEN, LOWE_DEAD, NINE_WALKIN, ON_STEPS,
  STEPS_OPEN, STEPS_WORN, THADDEUS_DEAD, WITH_YOU, modValue, type CompanionKey,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import type { SkillId } from '../src/engine/stats/rules';
import { skill } from '../src/engine/stats/sheet';
import { apply, test as cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, saveAndLoad, stage, trigger, waitFor, at as bare, type A3, type G, type Over, type Preset } from './a3_fixture';
import { regenerate } from './map_gen';

/**
 * B6p — the steps. From the point of no return (B6m's "(Go up.)", which opens the scene): the photograph made again at the
 * designate's own age, the close come up to the foot of the steps and the ones who walked with the player on them; Assessor Three
 * with the sash (worn or refused, and taken off again once under a blade or a friend's gun); the second hearing on the file
 * (E_FILE's third way); Tamsin's question; Ash's orders played out in every branch, the order falling on himself only under its
 * conditions; the Unwritten's blade by every route, its fight included. The no-lockout property from the "Before the steps" save for
 * the endings the steps decide (A1, A2, C, E by the sash and the file; B and D through the steps either way), each refusal, a save
 * round-trip in the middle of the steps. Played headless with the shared Act 3 fixture.
 */

type Flags = Record<string, string | boolean | number>;
interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[]; saved: G[] };
const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down' };
const ASH = 'npc_of_03', TAMSIN = 'npc_c9_03', THAD_STEPS = 'npc_a3_u2_steps';
function recorder(): { host: LogicHost; events: Ev[]; saved: G[]; bind: (g: G) => void } {
  const events: Ev[] = [], saved: G[] = [];
  let ref: G | undefined;
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); if (name === 'save' && ref) saved.push(structuredClone(ref)); } };
  return { host, events, saved, bind: (g) => { ref = g; } };
}
/** Act 3 at the Spire's close after the card, a sealed door behind it. */
function close(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}): Game {
  const r = recorder();
  const a = actThree(preset, { at: 'md_spire', ...over, host: r.host, flags: { ...AFTER_DOOR, a3_summoned: true, ...(over.flags ?? {}), ...flags } });
  r.bind(a.g);
  a.g.pc.sheet.name = 'Halden';
  a.q.questStart('q_a3_spire');
  a.q.questStart('q_a3_hold');
  a.q.update();
  r.events.length = 0;
  return { ...a, events: r.events, saved: r.saved };
}
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
const open = (a: A3): DialogueRunner => { const r = new DialogueRunner(DIALOGUES.d_a3_steps, a.g, a.q); a.q.update(); return r; };
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const has_ = (r: DialogueRunner, t: string) => opts(r).some((o) => o.startsWith(t));
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const kill = (g: G, id: string, map: string) => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const here = (g: G, map = 'md_spire') => MAPS[map].npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const P = (key: string, map = 'md_spire') => MAPS[map].npcs!.find((p) => (p.id ?? p.def) === key)!;
const UP = ['(Go up.)', '(Go up.)'];
/** From the close up the steps (B6m's point of no return: its save first), and into the steps' scene as the event opens it. */
function climb(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}): Game {
  const a = close(preset, over, flags);
  go(new DialogueRunner(DIALOGUES.d_a3_pnr, a.g, a.q), a, UP);
  return a;
}
/** The steps up to Three's sash (the arrival read). */
const toSash = (a: A3): DialogueRunner => go(open(a), a, ['(Something is coming down the steps']);
/** Go on to the steel door (answering Tamsin's question, if she asks it, with the honest "I don't know yet"). */
function finish(r: DialogueRunner, a: A3): void {
  for (let i = 0; i < 12 && r.node !== 'st_end'; i++) {
    const o = r.view()!.options.find((x) => ['(Go down to the steel door.)', '(Tamsin is looking at you', 'I don\'t know yet'].some((t) => x.text.startsWith(t)));
    if (!o) throw new Error(`not at the door: ${r.node} [${opts(r).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
}
const NOBODY: Over = { companions: 'nobody' };

// ---------------------------------------------------------------- the opening: the photograph made again

describe('B6p: the steps open where the point of no return leaves the player', () => {
  it('"(Go up.)" saves, climbs and opens the steps\' scene; the photograph is made once, at the photograph\'s own spot', () => {
    const a = climb('truce');
    expect(a.events.map((e) => e.name)).toEqual(['save', 'goto', 'dialogue']);
    expect(a.events[2].data).toEqual({ tree: 'd_a3_steps', name: 'The steps' });
    expect(a.g.flags.a3_pnr).toBe(true);
    expect(cond(STEPS_OPEN, a.g)).toBe(true);
    expect(stage(a.g, 'q_a3_spire')).toBe('steps');
    const r = open(a);
    expect(r.node).toBe('arrive');
    expect(a.events.filter((e) => e.name === 'photo')).toEqual([{ name: 'photo', data: { place: 'md_spire', spot: 'steps_sit' } }]);
    expect(MAPS.md_spire.spots!.steps_sit).toBeDefined();
    expect(MAPS.md_spire.spawns!.find((s) => s.id === 'steps')).toBeDefined();
    go(r, a, ['(Something is coming down the steps']);
    expect(r.node).toBe('three');
    expect(r.view()!.speaker).toBe('npc_ar_01');
    expect(r.view()!.text).toContain('MAGISTRATE OF ACCOUNTS');
    // coming back: straight to the sash, no second photograph
    expect(open(a).node).toBe('three');
    expect(a.events.filter((e) => e.name === 'photo')).toHaveLength(1);
  });

  it('not before the point of no return; after the steps, Three only points to the vault; the map\'s trigger reopens a scene that was left', () => {
    const before = close('truce');
    expect(open(before).node).toBe('st_none');
    const t = trigger('md_spire', 'a3_steps');
    expect(t.effects).toEqual([{ event: 'dialogue', data: { tree: 'd_a3_steps', name: 'The steps' } }]);
    expect(cond(t.if, before.g)).toBe(false);
    const a = climb('truce', NOBODY);
    expect(cond(t.if, a.g)).toBe(true);
    const r = toSash(a);
    go(r, a, ['(Take the sash.)']);
    finish(r, a);
    expect(cond(t.if, a.g)).toBe(false);
    expect(open(a).node).toBe('st_after');
    expect(opts(open(a))).toEqual(['(Leave it.)']);
  });

  it('who is on the steps: the ones who waited at the close come up from it (named), the travelling ones speak for themselves; the city at the foot', () => {
    const a = climb('prepared', {}, { a3_ally_choir: true, a3_ally_wheel: true, a3_unwritten: 'with_you' });
    const p = open(a).view()!.passives.map((x) => x.label);
    // prepared: Tamsin and Nine travel; the other five waited at the close
    expect(p).toEqual(expect.arrayContaining(['WREN', 'ILYA', 'ODILE', 'ASH', 'KES', 'THE COLUMN', 'THE CHOIR', 'THE WHEEL', 'THE UNWRITTEN', 'THE CLOSE']));
    expect(p).not.toContain('TAMSIN');
    expect(p).not.toContain('NINE');
    const h = climb('hostile');
    expect(open(h).view()!.passives.map((x) => x.label)).toEqual(['THE COLUMN', 'THE CLOSE']);
  });
});

// ---------------------------------------------------------------- the sash

describe('B6p: the sash, worn or refused; written once, as the player goes down to the steel door', () => {
  it('worn: the sash is the chair\'s only when the steps are done; the vault is open, and the first way\'s worn form', () => {
    const a = climb('truce', NOBODY);
    const r = go(toSash(a), a, ['(Take the sash.)']);
    expect(r.node).toBe('worn');
    expect(a.g.flags.a3_steps_sash).toBe('worn');
    expect(a.g.flags.a3_sash).toBeUndefined();
    expect(cond(AT_VAULT, a.g)).toBe(false);
    expect(stage(a.g, 'q_a3_spire')).toBe('steps');
    finish(r, a);
    expect(a.g.flags.a3_sash).toBe('worn');
    expect(r.view()!.text).toContain('The Ledger will see the Magistrate now');
    expect(cond(AT_VAULT, a.g)).toBe(true);
    expect(cond(A1, a.g)).toBe(true);
    expect(stage(a.g, 'q_a3_spire')).toBe('vault');
    expect(a.g.world.decisions.some((d) => d.id === 'a3_sash')).toBe(true);
  });

  it('refused: noted, the lens turns to the crowd, the vault opens all the same, and the first way\'s refused form', () => {
    const a = climb('truce', NOBODY);
    const r = go(toSash(a), a, ['(Don\'t take it.)']);
    expect(r.node).toBe('refused');
    expect(r.view()!.text).toContain('The designate declines the sash');
    expect(r.view()!.text).toContain('looking');
    finish(r, a);
    expect(a.g.flags.a3_sash).toBe('refused');
    expect(cond(A2, a.g)).toBe(true);
    expect(cond(A1, a.g)).toBe(false);
    expect(stage(a.g, 'q_a3_spire')).toBe('vault');
  });

  it('what the sash does and whose it was, each asked once; the vault opens either way, as Three says', () => {
    const a = climb('truce', NOBODY);
    const r = go(toSash(a), a, ['What does it do, if I put it on?']);
    expect(r.view()!.text).toContain('whether the sash is worn or not');
    go(r, a, ['(Back to the sash.)', 'Whose was it?', '(Back to the sash.)']);
    expect(has_(r, 'What does it do')).toBe(false);
    expect(has_(r, 'Whose was it?')).toBe(false);
    expect(opts(r)).toEqual(expect.arrayContaining(['(Take the sash.)', '(Don\'t take it.)']));
  });
});

// ---------------------------------------------------------------- the second hearing

describe('B6p: the second hearing on the file (E_FILE\'s third way)', () => {
  const HEAR = '(Before anything else: ask to be heard on your file again.)';
  it('offered once before the sash is answered, unless the file already says CONTESTED; the plan\'s modifiers, exactly', () => {
    for (const v of ['noted', 'refused', 'silent', 'agreed', undefined]) {
      const a = climb('truce', NOBODY, v ? { ar_verdict: v } : {});
      if (!v) delete a.g.flags.ar_verdict;
      expect(cond(HEARING_OPEN, a.g), String(v)).toBe(true);
      expect(has_(toSash(a), HEAR), String(v)).toBe(true);
    }
    const c = climb('prepared'); // its file says CONTESTED
    expect(has_(toSash(c), HEAR)).toBe(false);
    // the plan's DC: Speech 55; every mod
    const a = climb('truce', { companions: { nine: 'party' } }, { ar_verdict: 'noted', ca_reserve: 'stayed', a3_c9: 'opened', a3_recall: 'court', nine_log_given: true, jonah_lived: true });
    const o = go(toSash(a), a, [HEAR]).view()!.options.find((x) => x.text.startsWith('I contest it.'))!;
    expect(o.checkLabel).toBe('Speech 10');
    expect(o.checkNotes).toHaveLength(6);
    a.g.flags.cr_crown_hostile = true;
    expect(open(a).view()).toBeTruthy();
    const b = climb('truce', NOBODY, { ar_verdict: 'refused', cr_crown_hostile: true });
    delete b.g.flags.jonah_lived;
    expect(go(toSash(b), b, [HEAR]).view()!.options.find((x) => x.text.startsWith('I contest it.'))!.checkLabel).toBe('Speech 65');
  });

  it('won: CONTESTED on the file, and with the sash worn, the precedents and the register, the amendment\'s gate; lost: failed, and never offered again', () => {
    const a = climb('hostile', { tolls: 400 }, { ca_precedents: 2, a3_register_back: true });
    expect(cond(E_FILE, a.g)).toBe(false);
    eff(a.g, 'speech', 70);
    const r = go(toSash(a), a, [HEAR, 'I contest it.']);
    expect(r.node).toBe('heard_contested');
    expect(a.g.flags.a3_file).toBe('contested');
    expect(cond(E_FILE, a.g)).toBe(true);
    expect(a.q.journal().find((j) => j.id === 'q_a3_spire')!.objectives.map((o) => o.text)).toContain('Be heard on my file again');
    go(r, a, ['(Turn back to Three.)']);
    expect(has_(r, HEAR)).toBe(false);
    go(r, a, ['(Take the sash.)']);
    finish(r, a);
    expect(cond(E, a.g)).toBe(true);
    // lost
    const f = climb('hostile', {}, { ca_precedents: 2, a3_register_back: true });
    eff(f.g, 'speech', 20);
    const rf = go(toSash(f), f, [HEAR, 'I contest it.']);
    expect(rf.node).toBe('heard_noted');
    expect(f.g.flags.a3_file).toBe('failed');
    expect(cond(E_FILE, f.g)).toBe(false);
    go(rf, f, ['(Turn back to Three.)']);
    expect(has_(rf, HEAR)).toBe(false);
    // "(Say nothing more.)" changes nothing and leaves it open
    const n = climb('truce', NOBODY);
    go(toSash(n), n, [HEAR, '(Say nothing more.']);
    expect(n.g.flags.a3_file).toBeUndefined();
    expect(has_(open(n), HEAR)).toBe(true);
  });
});

// ---------------------------------------------------------------- Tamsin's question

describe('B6p: Tamsin\'s question, "What\'s the first thing you\'ll sign?"', () => {
  it('asked once the sash is on and she is on the steps, travelling or come up from the close; each answer is kept', () => {
    for (const [answer, value] of [['Nothing that counts', 'people'], ['Knock\'s door', 'door'], ['Nothing. I\'ll wear it', 'nothing'], ['Whatever keeps the water', 'water'], ['I don\'t know yet', 'unsure']] as const) {
      for (const state of ['party', 'waiting'] as const) {
        const a = climb('truce', { companions: { tamsin: state, nine: 'never', ash: 'never', wren: 'never', ilya: 'never', odile: 'never', kes: 'never' } });
        const r = go(toSash(a), a, ['(Take the sash.)', '(Tamsin is looking at you', answer]);
        expect(r.view()!.speaker, value).toBe(TAMSIN);
        expect(a.g.flags.a3_first_sign, `${value} ${state}`).toBe(value);
        expect(has_(r, '(Tamsin is looking')).toBe(false);
        finish(r, a);
      }
    }
  });

  it('never when the sash is refused, never without her (gone into the door, broken in Act 2, never met)', () => {
    const a = climb('truce', { companions: { tamsin: 'party' } });
    expect(has_(go(toSash(a), a, ['(Don\'t take it.)']), '(Tamsin is looking')).toBe(false);
    for (const [over, flags] of [[{ companions: { tamsin: 'never' } }, {}], [{ companions: { tamsin: 'waiting' } }, { tam_broken: true }], [{ companions: { tamsin: 'waiting' } }, { tam_left: 'door' }]] as [Over, Flags][]) {
      const b = climb('truce', over, flags);
      expect(has_(go(toSash(b), b, ['(Take the sash.)']), '(Tamsin is looking'), JSON.stringify(flags)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------- Ash's orders

/** Ash alone with the player (the others never met), his orders and approval as given. */
const ashOnly = (orders: string | null, approval = 30, extra: Over = {}): Over => ({
  companions: { ash: 'waiting', tamsin: 'never', nine: 'never', wren: 'never', ilya: 'never', odile: 'never', kes: 'never', ...(extra.companions as object ?? {}) },
  approval: { ash: approval }, ...extra,
  flags: { ash_orders_known: true, ash_stance: 'knowing', ...(orders ? { ash_orders: orders } : {}), ...(extra.flags ?? {}) },
});
function ashSteps(orders: string | null, approval = 30, extra: Over = {}, flags: Flags = {}): { a: Game; r: DialogueRunner } {
  const a = climb('truce', ashOnly(orders, approval, extra), { ash_orders: orders ?? false, ...flags });
  if (orders === null) delete a.g.flags.ash_orders;
  const r = go(toSash(a), a, ['(Take the sash.)']);
  return { a, r };
}

describe('B6p: Ash\'s orders, played out on the steps', () => {
  it('nothing is owed when the sash is refused: no Ash beat, whatever his orders, and a3_ash stays unset', () => {
    for (const o of ['refused', 'warned', 'undecided', 'other']) {
      const a = climb('truce', ashOnly(o, 15, { flags: { ash_stance: 'clean' } }));
      const r = go(toSash(a), a, ['(Don\'t take it.)']);
      expect(opts(r), o).toEqual(['(Go down to the steel door.)']);
      finish(r, a);
      expect(a.g.flags.a3_ash, o).toBeUndefined();
      expect(cond(WITH_YOU('ash'), a.g), o).toBe(true);
    }
  });

  it('the letter burned: he stands on the step below (between), with or without a blade to stand in front of', () => {
    for (const o of ['refused', 'refused_late']) {
      const { a, r } = ashSteps(o, 50, {}, { a3_uw_how: 'fought' }); // nobody left to send
      go(r, a, ['(Ash is coming up the steps behind you.)']);
      expect(r.view()!.speaker, o).toBe(ASH);
      expect(a.g.flags.a3_ash, o).toBe('between');
      expect(cond(BLADE_DUE, a.g), o).toBe(false);
      finish(r, a);
      expect(r.view()!.text).toContain('for a long time after there is any need to');
    }
  });

  it('warned: he comes to the face; heard out (Speech 50 with his modifiers) he gives the player his shells; or the sash comes off; or he strikes', () => {
    const t = ashSteps('warned', 45, { flags: { ash_gully_outcome: 'spoken' } });
    go(t.r, t.a, ['(Ash is coming up the steps to you.)']);
    const o = t.r.view()!.options.find((x) => x.text.startsWith('Then hear what'))!;
    expect(o.checkLabel).toBe('Speech 25');
    eff(t.a.g, 'speech', 30);
    go(t.r, t.a, ['Then hear what']);
    expect(t.r.node).toBe('ash_faced');
    expect(t.a.g.flags.a3_ash).toBe('faced');
    expect(cond(WITH_YOU('ash'), t.a.g)).toBe(true);
    finish(t.r, t.a);
    expect(t.a.g.flags.a3_sash).toBe('worn');
    // a broken word makes it harder; failing it, he draws and the vow holds: struck, and he walks away
    const f = ashSteps('warned', 30, { flags: { a3_ash_word: true } });
    eff(f.a.g, 'speech', 50);
    go(f.r, f.a, ['(Ash is coming up the steps to you.)']);
    expect(f.r.view()!.options.find((x) => x.text.startsWith('Then hear what'))!.checkLabel).toBe('Speech 65');
    go(f.r, f.a, ['Then hear what']);
    expect(f.r.node).toBe('ash_struck');
    expect(f.a.g.flags.a3_ash).toBe('struck');
    expect(f.a.g.flags.ash_left).toBe('struck');
    expect(cond(WITH_YOU('ash'), f.a.g)).toBe(false);
    expect(here(f.a.g)).not.toContain(`${ASH}_steps`);
    finish(f.r, f.a);
    expect(f.a.g.flags.a3_sash).toBe('worn');
    // "do what you came to do": struck
    const d = ashSteps('warned');
    go(d.r, d.a, ['(Ash is coming up the steps to you.)', 'Do what you came up here to do']);
    expect(d.a.g.flags.a3_ash).toBe('struck');
    // the sash off in front of him: faced, and the sash refused at the door
    const s = ashSteps('warned');
    go(s.r, s.a, ['(Ash is coming up the steps to you.)', '(Unhook the clasp.']);
    expect(s.a.g.flags.a3_ash).toBe('faced');
    expect(s.a.g.flags.a3_steps_sash).toBe('refused');
    finish(s.r, s.a);
    expect(s.a.g.flags.a3_sash).toBe('refused');
    expect(cond(A2, s.a.g)).toBe(true);
    expect(s.a.g.world.decisions.find((x) => x.id === 'a3_sash')!.text).toContain('took it off again');
  });

  it('undecided: he decides by what the player says they will sign first, asked by Tamsin or by himself', () => {
    // he asks, and the answer is one a friend can stand beside: he tears up the letter and stands on the step below
    const a = ashSteps('undecided');
    go(a.r, a.a, ['(Ash is coming up the steps to you.)']);
    expect(a.r.node).toBe('ash_ask');
    go(a.r, a.a, ['Nothing that counts a person.']);
    expect(a.r.node).toBe('ash_friend');
    expect(a.a.g.flags.a3_ash).toBe('between');
    expect(a.a.g.flags.ash_orders).toBe('undecided'); // U8's own flag is not rewritten
    // another answer: he comes to the face
    const w = ashSteps('undecided');
    go(w.r, w.a, ['(Ash is coming up the steps to you.)', 'Whatever keeps the water']);
    expect(w.r.node).toBe('ash_face');
    expect(w.a.g.flags.a3_ash).toBeUndefined();
    // Tamsin asked first: he heard it
    const t = climb('truce', ashOnly('undecided', 30, { companions: { tamsin: 'party' } }));
    const rt = go(toSash(t), t, ['(Take the sash.)', '(Tamsin is looking at you', 'Nothing. I\'ll wear it', '(Ash is coming up the steps to you.)']);
    expect(rt.node).toBe('ash_friend');
    expect(t.g.flags.a3_ash).toBe('between');
    // his orders known and never answered read as undecided; never told, he tells it to the face
    const k = ashSteps(null);
    expect(modValue(k.a.g, ASH_MODE)).toBe('weigh');
    const u = ashSteps(null, 30, { flags: { ash_orders_known: false } });
    expect(modValue(u.a.g, ASH_MODE)).toBe('face');
    go(u.r, u.a, ['(Ash is coming up the steps to you.)']);
    expect(u.r.view()!.text).toContain('I said I\'d tell you to your face if I had to');
  });

  it('other: he walks away to put it on a keystone who wears theirs gladly (named, and dead by morning); with nobody left, he comes to the face', () => {
    const v = ashSteps('other', 30, {}, { ks_vane: 'rises' });
    go(v.r, v.a, ['(Look round for Ash.)']);
    expect(v.r.node).toBe('ash_away_vane');
    expect(v.a.g.flags.a3_ash).toBe('away');
    expect(v.a.g.flags.a3_ash_target).toBe('vane');
    expect(v.a.g.flags.cr_celestine_dead).toBe(true);
    expect(cond(WITH_YOU('ash'), v.a.g)).toBe(false);
    go(v.r, v.a, ['(Shout his name.)']);
    finish(v.r, v.a);
    const s = ashSteps('other', 30, {}, { ks_vane: 'broken' });
    go(s.r, s.a, ['(Look round for Ash.)']);
    expect(s.a.g.flags.a3_ash_target).toBe('sarr');
    expect(s.a.g.flags.ks_sarr).toBe('dead');
    const n = ashSteps('other', 30, {}, { ks_vane: 'broken', ks_sarr: 'dead' });
    expect(modValue(n.a.g, ASH_MODE)).toBe('face');
    go(n.r, n.a, ['(Ash is coming up the steps to you.)']);
    expect(n.r.view()!.text).toContain('nobody left on Petra\'s board');
  });

  it('the order falls on himself only under its conditions: "make it clean", approval 19 or less, not taken back, the letter not burned', () => {
    const SELF = (approval: number, flags: Flags = {}, orders = 'warned') => modValue(climb('truce', ashOnly(orders, approval, { flags: { ash_stance: 'clean', ...flags } })).g, ASH_MODE);
    expect(SELF(19)).toBe('self');
    expect(SELF(19, {}, 'undecided')).toBe('self');
    expect(SELF(19, {}, 'other')).toBe('self');
    expect(SELF(20)).toBe('face');
    expect(SELF(10, { a3_ash_clean_back: true })).toBe('face');
    expect(SELF(10, {}, 'refused')).toBe('between');
    expect(SELF(10, { ash_stance: 'knowing' })).toBe('face');
    // and only once the sash is on: refused, he is never at the lamp
    const no = climb('truce', ashOnly('warned', 10, { flags: { ash_stance: 'clean' } }));
    expect(has_(go(toSash(no), no, ['(Don\'t take it.)']), '(Ash has gone back down')).toBe(false);
  });

  it('at the lamp: the player can reach him (Speech 60 with his modifiers), or tear the sash off; silence, or a failed word, and he pays it himself, on the steps', () => {
    const at = (flags: Flags = {}) => {
      const x = ashSteps('warned', 15, { flags: { ash_stance: 'clean', ...flags } });
      go(x.r, x.a, ['(Ash has gone back down the steps, to the lamp.)']);
      return x;
    };
    const s = at({ ash_gully_outcome: 'spoken', a3_ash_night: true });
    expect(s.r.view()!.options.find((x) => x.text.startsWith('Ash. Give me the gun.'))!.checkLabel).toBe('Speech 35');
    eff(s.a.g, 'speech', 40);
    go(s.r, s.a, ['Ash. Give me the gun.']);
    expect(s.r.node).toBe('ash_saved');
    expect(s.a.g.flags.a3_ash).toBe('faced');
    expect(cond(WITH_YOU('ash'), s.a.g)).toBe(true);
    const off = at();
    go(off.r, off.a, ['(Tear the clasp open.']);
    expect(off.a.g.flags.a3_ash).toBe('faced');
    expect(off.a.g.flags.a3_steps_sash).toBe('refused');
    finish(off.r, off.a);
    expect(off.a.g.flags.a3_sash).toBe('refused');
    const fail = at();
    eff(fail.a.g, 'speech', 30);
    go(fail.r, fail.a, ['Ash. Give me the gun.']);
    expect(fail.r.node).toBe('ash_self');
    const none = at();
    go(none.r, none.a, ['(Say nothing.)']);
    expect(none.r.node).toBe('ash_self');
    expect(none.a.g.flags.a3_ash).toBe('self');
    expect(cond(WITH_YOU('ash'), none.a.g)).toBe(false);
    expect(here(none.a.g)).not.toContain(`${ASH}_steps`);
    finish(none.r, none.a);
    expect(none.a.g.flags.a3_sash).toBe('worn');
  });
});

// ---------------------------------------------------------------- the Unwritten's blade

describe('B6p: the Unwritten\'s blade', () => {
  const BLADE = '(Somebody is coming up the steps.)';
  /** The blade on its own (no Ash): the Unwritten came east. */
  const east = (flags: Flags = {}, over: Over = NOBODY) => {
    const a = climb('truce', over, { a3_unwritten: 'with_you', ...flags });
    const r = go(toSash(a), a, ['(Take the sash.)']);
    return { a, r };
  };
  it('comes only with the sash on and the sky owed (the Unwritten came east, or Ash refused his orders), and only while Thaddeus lives', () => {
    expect(has_(east().r, BLADE)).toBe(true);
    const refused = climb('truce', NOBODY, { a3_unwritten: 'with_you' });
    expect(has_(go(toSash(refused), refused, ['(Don\'t take it.)']), BLADE)).toBe(false);
    expect(has_(east({ a3_uw_how: 'fought' }).r, BLADE)).toBe(false);
    const gone = climb('truce', NOBODY, { a3_unwritten: 'gone' });
    expect(has_(go(toSash(gone), gone, ['(Take the sash.)']), BLADE)).toBe(false);
    // Ash refused, and the Unwritten were never turned: another hand comes for what his letter said
    const ash = ashSteps('refused', 50);
    go(ash.r, ash.a, ['(Ash is coming up the steps behind you.)']);
    expect(has_(ash.r, BLADE)).toBe(true);
    go(ash.r, ash.a, [BLADE]);
    expect(ash.r.view()!.text).toContain('Brother Ash burned his letter');
    expect(opts(ash.r)).toContain('(Let Ash stand.)');
  });

  it('Ash stands between: he takes the cut, and the man who held it cannot cut him twice', () => {
    const { a, r } = ashSteps('refused', 50, {}, { a3_unwritten: 'with_you' });
    go(r, a, ['(Ash is coming up the steps behind you.)', BLADE]);
    expect(r.view()!.text).toContain('Petra Mason stands up');
    go(r, a, ['(Let Ash stand.)']);
    expect(a.g.flags.a3_blade).toBe('ash');
    expect(a.g.flags.a3_ash_scarred).toBe(true);
    expect(a.g.flags.a3_ash).toBe('between');
    finish(r, a);
    expect(a.g.flags.a3_sash).toBe('worn');
  });

  it('talked down (Speech 50 with its modifiers); a failed word with Ash between is his cut, without him a fight, the wardens or the sash', () => {
    const t = east({}, NOBODY);
    eff(t.a.g, 'speech', 60);
    go(t.r, t.a, [BLADE]);
    // 50, −10 what they can see carried down (the Unwritten turned are B's means themselves), −5 they came east for the book
    expect(t.r.view()!.options.find((x) => x.text.startsWith('Look at what'))!.checkLabel).toBe('Speech 35');
    go(t.r, t.a, ['Look at what']);
    expect(t.r.node).toBe('blade_talked');
    expect(t.a.g.flags.a3_blade).toBe('talked');
    const f = east();
    eff(f.a.g, 'speech', 10);
    go(f.r, f.a, [BLADE, 'Look at what']);
    expect(f.r.node).toBe('blade_failed');
    expect(opts(f.r)).toEqual(['(Shout for the wardens.)', '(Draw.)', '(Get the sash off.)']);
    const fa = ashSteps('refused', 50, {}, { a3_unwritten: 'with_you' });
    eff(fa.a.g, 'speech', 10);
    go(fa.r, fa.a, ['(Ash is coming up the steps behind you.)', BLADE, 'Look at what']);
    expect(opts(fa.r)).toEqual(['(Ash steps into it.)']);
    go(fa.r, fa.a, ['(Ash steps into it.)']);
    expect(fa.a.g.flags.a3_blade).toBe('ash');
  });

  it('the wardens take him; or the sash comes off and nothing is owed', () => {
    const w = east();
    go(w.r, w.a, [BLADE, '(Call the wardens up the steps.)']);
    expect(w.a.g.flags.a3_blade).toBe('wardens');
    expect(w.r.view()!.text).toContain('First thing you signed');
    expect(here(w.a.g)).not.toContain(THAD_STEPS);
    finish(w.r, w.a);
    const o = east();
    go(o.r, o.a, [BLADE, '(Take the sash off']);
    expect(o.a.g.flags.a3_blade).toBe('off');
    expect(o.a.g.flags.a3_steps_sash).toBe('refused');
    finish(o.r, o.a);
    expect(o.a.g.flags.a3_sash).toBe('refused');
  });

  it('fought on the steps: he turns hostile and stays placed until he is down; the map\'s trigger and the scene settle it', () => {
    const { a, r } = east();
    expect(here(a.g)).toContain(THAD_STEPS);
    expect(P(THAD_STEPS).dialogue).toBe('d_a3_steps');
    expect(cond(NPCS.npc_a3_u2.hostileIf, a.g)).toBe(false);
    go(r, a, [BLADE, '(Draw on him.)']);
    expect(a.events.some((e) => e.name === 'combat')).toBe(true);
    expect(a.g.flags.a3_blade_fight).toBe(true);
    expect(cond(NPCS.npc_a3_u2.hostileIf, a.g)).toBe(true);
    go(r, a, ['(Fight.)']);
    expect(r.ended).toBe(true);
    expect(open(a).node).toBe('st_fighting');
    const t = trigger('md_spire', 'a3_blade_after');
    expect(cond(t.if, a.g)).toBe(false);
    kill(a.g, THAD_STEPS, 'md_spire');
    expect(cond(THADDEUS_DEAD, a.g)).toBe(true);
    expect(here(a.g)).not.toContain(THAD_STEPS);
    expect(cond(t.if, a.g)).toBe(true);
    const rr = open(a);
    expect(rr.node).toBe('blade_fought');
    expect(a.g.flags.a3_blade).toBe('fought');
    expect(cond(NPCS.npc_a3_u2.hostileIf, a.g)).toBe(false);
    finish(rr, a);
    expect(a.g.flags.a3_sash).toBe('worn');
  });
});

// ---------------------------------------------------------------- the map

describe('B6p: the steps\' people, placed by the shared conditions', () => {
  it('Three is on the steps from the point of no return and never on its bench as well; the waiting companions stand on the steps; the lead at the foot', () => {
    const STATES: [Preset, Over, Flags][] = [
      ['prepared', {}, {}], ['prepared', {}, { a3_pnr: true }], ['prepared', {}, { a3_pnr: true, a3_sash: 'worn' }], ['truce', {}, { a3_pnr: true }],
      ['hostile', {}, { a3_pnr: true }], ['truce', { companions: 'everyone' }, { a3_pnr: true, a3_nine_hid: 'clover' }], ['truce', { companions: 'everyone' }, { a3_pnr: true, a3_nine_hid: 'clover', a3_nine_fetched: true }],
      ['truce', { companions: { ash: 'waiting' } }, { a3_pnr: true, a3_ash: 'self' }], ['truce', { companions: { ash: 'waiting' } }, { a3_pnr: true, ash_left: 'struck' }],
    ];
    for (const [preset, over, flags] of STATES) {
      const a = close(preset, over, flags);
      const tag = `${preset} ${JSON.stringify(flags)}`;
      const threes = here(a.g).filter((k) => k.startsWith('npc_ar_01'));
      expect(threes, tag).toEqual([a.g.flags.a3_pnr ? 'npc_ar_01_steps' : 'npc_ar_01']);
      for (const k of COMPANION_KEYS as CompanionKey[]) {
        const id = COMPANIONS[k].id;
        expect(cond(P(`${id}_steps`).if, a.g), `${tag} ${k}`).toBe(cond({ all: [{ flag: 'a3_pnr' }, ON_STEPS(k), { not: { inParty: id } }] }, a.g));
        // never on the steps and at the close at once
        if (cond(P(`${id}_steps`).if, a.g)) expect(here(a.g), `${tag} ${k}`).not.toContain(id);
      }
      expect(cond(P('npc_md_01_steps').if, a.g), tag).toBe(!!a.g.flags.a3_pnr && !cond(LOWE_DEAD, a.g));
    }
    // a hidden Nine never fetched stays written off at the close (B6l), and is not on the steps
    const h = close('truce', { companions: { nine: 'waiting' } }, { a3_pnr: true, a3_nine_hid: 'hulls' });
    expect(cond(NINE_WALKIN, h.g)).toBe(true);
    expect(here(h.g)).not.toContain('npc_md_nine_steps');
    // Reyes keeps the foot when Lowe is dead
    const r = close('truce', {}, { a3_pnr: true });
    kill(r.g, 'npc_md_01', 'md_precinct');
    expect(here(r.g)).toContain('npc_md_12_steps');
    expect(here(r.g)).not.toContain('npc_md_01_steps');
    expect(new DialogueRunner(DIALOGUES.d_a3_steps_lowe, r.g, r.q).view()!.speaker).toBe('npc_md_12');
  });

  it('the blade\'s placement mirrors its conditions: with the ones who came east from the steps on, or once the sash is on and Ash burned his letter', () => {
    const STATES: Flags[] = [
      { a3_unwritten: 'with_you' }, { a3_unwritten: 'with_you', a3_steps_sash: 'refused' }, { a3_unwritten: 'with_you', a3_uw_how: 'fought' },
      { ash_orders: 'refused' }, { ash_orders: 'refused', a3_steps_sash: 'worn' }, { ash_orders: 'refused_late', a3_steps_sash: 'worn', a3_blade: 'wardens' },
      { ash_orders: 'warned', a3_steps_sash: 'worn' }, { a3_unwritten: 'with_you', a3_sash: 'worn' },
    ];
    for (const flags of STATES) {
      const a = close('truce', {}, { a3_pnr: true, ...flags });
      const want = cond({ all: [STEPS_OPEN, { not: THADDEUS_DEAD }, { not: { flag: 'a3_blade', eq: 'wardens' } }, { any: [{ flag: 'a3_unwritten', eq: 'with_you' }, { all: [{ any: [{ flag: 'ash_orders', eq: 'refused' }, { flag: 'ash_orders', eq: 'refused_late' }] }, STEPS_WORN] }] }] }, a.g);
      expect(cond(P(THAD_STEPS).if, a.g), JSON.stringify(flags)).toBe(want);
    }
  });
});

// ---------------------------------------------------------------- no lockout from the save before the steps

describe('B6p: no lockout from "Before the steps"', () => {
  /** Every way through the steps' tree, choosing every option and passing and failing every check, ends at the steel door. */
  function walk(g0: G): { ends: Set<string>; paths: number } {
    const ends = new Set<string>();
    let paths = 0;
    const seen = new Set<string>();
    const stack: { g: G; node: string | null; depth: number }[] = [{ g: structuredClone(g0), node: null, depth: 0 }];
    while (stack.length) {
      const s = stack.pop()!;
      const q = new QuestEngine(QUESTS, s.g);
      const r = new DialogueRunner(DIALOGUES.d_a3_steps, s.g, q);
      if (s.node) { (r as unknown as { node: string }).node = s.node; }
      const v = r.view();
      if (!v) continue;
      const key = `${r.node}|${JSON.stringify(s.g.flags)}`;
      if (seen.has(key) || s.depth > 40) continue;
      seen.add(key);
      for (const o of v.options) {
        for (const pass of o.checkLabel ? [true, false] : [true]) {
          const g = structuredClone(s.g);
          if (o.checkLabel) eff(g, 'speech', pass ? 100 : 0);
          const qq = new QuestEngine(QUESTS, g);
          const rr = new DialogueRunner(DIALOGUES.d_a3_steps, g, qq);
          (rr as unknown as { node: string }).node = r.node!;
          rr.choose(o.id);
          qq.update();
          if (rr.ended) {
            paths++;
            if (g.flags.a3_blade_fight && !g.flags.a3_blade) { kill(g, THAD_STEPS, 'md_spire'); stack.push({ g, node: null, depth: s.depth + 1 }); continue; }
            expect(g.flags.a3_sash, `ended at ${r.node} via "${o.text}" without the sash answered`).toBeDefined();
            expect(stage(g, 'q_a3_spire')).toBe('vault');
            ends.add(String(g.flags.a3_sash));
          } else stack.push({ g, node: rr.node, depth: s.depth + 1 });
        }
      }
    }
    return { ends, paths };
  }

  it('every way through the steps reaches the vault, the sash worn or refused, from every kind of game (both always reachable)', () => {
    const GAMES: [Preset, Over, Flags][] = [
      ['prepared', {}, { a3_unwritten: 'with_you' }],
      ['truce', ashOnly('warned', 15, { companions: { tamsin: 'party' }, flags: { ash_stance: 'clean' } }), { a3_unwritten: 'with_you' }],
      ['truce', ashOnly('undecided', 30), {}],
      ['truce', ashOnly('other', 30), { ks_vane: 'rises' }],
      ['hostile', {}, {}],
    ];
    for (const [preset, over, flags] of GAMES) {
      const a = climb(preset, over, flags);
      const { ends, paths } = walk(a.g);
      expect([...ends].sort(), preset).toEqual(['refused', 'worn']);
      expect(paths).toBeGreaterThan(2);
    }
  });

  it('from the loaded save, the steps played for real reach A1, A2, B, C, D and E (a thorough game) and each of them from the hostile one', async () => {
    // a thorough game: the close as B6m left it, plus the hill raised, the charge, the Concern's paper
    const p = close('prepared', { b4b: true, items: ['k_a3_transfer', 'k_a3_charge'] }, { a3_mast: 'raised', a3_mast_how: 'x', a3_mast_keeper: 'hollow', a3_concern_terms: 'accepted', a3_unwritten: 'with_you' });
    go(new DialogueRunner(DIALOGUES.d_a3_pnr, p.g, p.q), p, UP);
    const save = (await saveAndLoad(p.saved[0])).g;
    expect(save.flags.a3_pnr).toBeUndefined();
    const play = (g: G, sash: 'worn' | 'refused', extra: string[] = []): Game => {
      const f = fork(g);
      eff(f.g, 'speech', 100);
      go(new DialogueRunner(DIALOGUES.d_a3_pnr, f.g, f.q), f, UP);
      const r = go(toSash(f), f, [...extra, sash === 'worn' ? '(Take the sash.)' : '(Don\'t take it.)']);
      // the beats, as a player who wants to keep the sash on would answer them: talk, or let Ash stand
      for (let i = 0; i < 10 && r.node !== 'st_end'; i++) {
        const o = r.view()!.options.find((x) => /^\(Go down|^\(Tamsin|^\(Ash|^\(Somebody|^\(Let Ash stand|^Nothing that counts|^Look at what|^Then hear what|^Ash\. Give me/.test(x.text) && !x.locked)!;
        if (!o) throw new Error(`stuck at ${r.node}: ${opts(r).join(' | ')}`);
        eff(f.g, 'speech', 100);
        r.choose(o.id);
        f.q.update();
      }
      return f;
    };
    const worn = play(save, 'worn');
    expect(worn.g.flags.a3_sash).toBe('worn');
    for (const [name, gate] of [['A1', A1], ['B', B], ['C', C], ['D', D], ['E', E]] as const) expect(cond(gate, worn.g), name).toBe(true);
    const refused = play(save, 'refused');
    for (const [name, gate] of [['A2', A2], ['B', B], ['D', D]] as const) expect(cond(gate, refused.g), name).toBe(true);
    for (const [name, gate] of [['A1', A1], ['C', C], ['E', E]] as const) expect(cond(gate, refused.g), name).toBe(false);
    // the hostile game: its file refused in Act 2, contested again on the steps; the register bought back and two rulings won at the close
    const h = close('hostile', { tolls: 400, items: ['k_a3_transfer', 'k_a3_charge'] }, { ca_precedents: 2, a3_register_back: true, a3_concern_terms: 'accepted', a3_mast: 'raised', a3_mast_how: 'v', a3_mast_keeper: 'knock', ks_calla: 'free', a3_archive: 'open' });
    eff(h.g, 'science', 65);
    go(new DialogueRunner(DIALOGUES.d_a3_pnr, h.g, h.q), h, UP);
    const hs = (await saveAndLoad(h.saved[0])).g;
    expect(cond(E_FILE, hs)).toBe(false);
    const he = play(hs, 'worn', ['(Before anything else', 'I contest it.', '(Turn back to Three.)']);
    expect(he.g.flags.a3_file).toBe('contested');
    for (const [name, gate] of [['A1', A1], ['B', B], ['C', C], ['D', D], ['E', E]] as const) expect(cond(gate, he.g), `hostile ${name}`).toBe(true);
    const hr = play(hs, 'refused');
    for (const [name, gate] of [['A2', A2], ['B', B], ['D', D]] as const) expect(cond(gate, hr.g), `hostile ${name}`).toBe(true);
  });
});

// ---------------------------------------------------------------- the save, and nothing unasked

describe('B6p: a save in the middle of the steps, and nothing resolves unasked', () => {
  it('a save with the sash on and Ash still to come round-trips through the real codec and resumes at the same beat', async () => {
    const a = climb('truce', ashOnly('warned', 30, { companions: { tamsin: 'party' } }));
    const r = go(toSash(a), a, ['(Take the sash.)', '(Tamsin is looking at you', 'I don\'t know yet']);
    const l = await saveAndLoad(a.g);
    l.q.update();
    expect(l.g.flags.a3_steps_sash).toBe('worn');
    expect(l.g.flags.a3_first_sign).toBe('unsure');
    expect(l.g.flags.a3_sash).toBeUndefined();
    expect(stage(l.g, 'q_a3_spire')).toBe('steps');
    const lr = new DialogueRunner(DIALOGUES.d_a3_steps, l.g, l.q);
    expect(lr.node).toBe('st_resume');
    expect(lr.view()!.options.map((o) => o.text)).toEqual(['(Ash is coming up the steps to you.)']);
    expect(r.view()!.options.map((o) => o.text)).toEqual(['(Ash is coming up the steps to you.)']);
    expect(here(l.g).sort()).toEqual(here(a.g).sort());
    // a fight in progress also survives the save: still fighting, then settled once he is down
    const b = climb('truce', NOBODY, { a3_unwritten: 'with_you' });
    go(toSash(b), b, ['(Take the sash.)', '(Somebody is coming up the steps.)', '(Draw on him.)']);
    const lb = await saveAndLoad(b.g);
    expect(new DialogueRunner(DIALOGUES.d_a3_steps, lb.g, lb.q).node).toBe('st_fighting');
    expect(cond(NPCS.npc_a3_u2.hostileIf, lb.g)).toBe(true);
  });

  it('days on the steps settle nothing: no sash, no orders, no blade, until the player answers', () => {
    const a = climb('truce', ashOnly('warned', 15, { flags: { ash_stance: 'clean' } }), { a3_unwritten: 'with_you' });
    go(toSash(a), a, ['(Take the sash.)']);
    const before = JSON.stringify(a.g.flags);
    for (let d = 0; d < 4; d++) { waitFor(a.g, a.q, 'md_spire', 7); waitFor(a.g, a.q, 'md_spire', 22); }
    const after = JSON.parse(JSON.stringify(a.g.flags));
    for (const k of Object.keys(after)) if (k.startsWith('ev_armed_')) delete after[k];
    const was = JSON.parse(before);
    for (const k of Object.keys(was)) if (k.startsWith('ev_armed_')) delete was[k];
    expect(after).toEqual(was);
    for (const f of ['a3_sash', 'a3_ash', 'a3_blade', 'a3_blade_fight', 'a3_first_sign']) expect(a.g.flags[f], f).toBeUndefined();
    expect(cond(WITH_YOU('ash'), a.g)).toBe(true);
  });

  it('the steps before Act 3 are as they were', () => {
    const old = bare('md_spire');
    expect(new DialogueRunner(DIALOGUES.d_a3_steps, old.g, old.q).node).toBe('st_none');
    expect(here(old.g)).toContain('npc_ar_01');
    expect(here(old.g).some((k) => k.endsWith('_steps'))).toBe(false);
    apply([{ give: 'k_photo' }], old.g);
    expect(new DialogueRunner(DIALOGUES.d_ar_steps, old.g, old.q).node).toBe('scene');
  });
});

// ---------------------------------------------------------------- the trees, the registry, the content

describe('B6p: the trees, the registry and the content', () => {
  it('every node has a line for coming back to it (U7), or only leaves; option ids are unique; all seven companions speak', () => {
    const speakers = new Set<string>();
    for (const d of A3_STEPS_DIALOGUES) {
      const ids = new Set<string>();
      for (const [k, n] of Object.entries(d.nodes)) {
        if (!n.options.every((o) => o.exit)) expect(n.again, `${d.id}/${k}`).toBeDefined();
        for (const o of n.options) if (o.id) { expect(ids.has(o.id), `${d.id} ${o.id}`).toBe(false); ids.add(o.id); }
        for (const ij of n.interject ?? []) speakers.add(ij.companion);
        if (n.speaker && n.speaker !== 'narrator') speakers.add(n.speaker);
        for (const o of n.options) if (o.next) expect(d.nodes[o.next], `${d.id}/${k} → ${o.next}`).toBeDefined();
      }
      expect(DIALOGUES[d.id], d.id).toBeDefined();
    }
    for (const c of ['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17']) expect(speakers.has(c), c).toBe(true);
  });

  it('the flags are in the Act 3 registry; the map is the generator\'s; the content validates', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6p (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_sash', 'a3_steps_sash', 'a3_steps_off', 'a3_file', 'a3_first_sign', 'a3_ash', 'a3_ash_target', 'a3_ash_scarred', 'a3_ash_saved', 'a3_sash_torn',
      'a3_blade', 'a3_blade_fight', 'a3_steps_photo', 'a3_steps_seen', 'photo', 'npc_ar_01_steps', 'npc_a3_u2_steps', 'a3_blade_after', 'ash_left', 'cr_celestine_dead', 'vasha_dead', 'ks_sarr']) expect(block.includes(f), f).toBe(true);
    for (const v of ['between', 'faced', 'struck', 'self', 'away', 'contested', 'failed', 'people', 'door', 'nothing', 'water', 'unsure', 'talked', 'wardens', 'fought', 'off']) expect(block.includes(v), v).toBe(true);
    expect(readFileSync('src/content/maps/md_spire.ts', 'utf8')).toContain('Generated by tools/maps/gen_md_spire.py');
    for (const m of regenerate('gen_md_spire.py')) expect(m.generated, m.map).toBe(m.committed);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3_steps|md_spire|npc_a3_u2|q_a3_spire/.test(e))).toEqual([]);
  });

  it('the steps\' conditions read only real flags or Act 3\'s own', () => {
    const SRC = readFileSync('src/content/dialogue/a3_steps.ts', 'utf8') + readFileSync('src/content/world/a3_conds.ts', 'utf8');
    for (const f of ['ash_orders', 'ash_stance', 'a3_ash_clean_back', 'a3_ash_word', 'a3_ash_heard', 'a3_ash_night', 'ash_gully_outcome', 'a3_tamsin_word', 'a3_uw_how', 'a3_unwritten', 'ks_vane', 'rd_coup', 'cr_crown_hostile', 'nine_log_given', 'jonah_lived']) expect(SRC.includes(`'${f}'`), f).toBe(true);
    const ALL_SRC = Object.values(DIALOGUES).map((d) => JSON.stringify(d)).join('\n');
    for (const f of ['a3_ash_clean_back', 'a3_ash_word', 'a3_ash_heard', 'a3_ash_night', 'a3_tamsin_word']) expect(ALL_SRC.includes(`"set":"${f}"`) || ALL_SRC.includes(`"${f}"`), f).toBe(true);
  });
});
