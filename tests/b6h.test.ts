import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_CISTERN_DIALOGUES, A3_WAY_NODES, MAUD_INSIDE_NODES } from '../src/content/dialogue/a3_cistern';
import { BRAM_ANSWERED, MOTHER_DARK, TAM_INSIDE, TAMSIN } from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import type { SkillId } from '../src/engine/stats/rules';
import { skill } from '../src/engine/stats/sheet';
import { countItem } from '../src/engine/inventory/inventory';
import { apply, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, at, has, saveAndLoad, stage, status, talk, view, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6h — Inside, for the first time: the five ways into the Cistern from Knock's apron (MOTHER's tray lift, the grate and the
 * pump run, the great door's manual cycle, Tamsin's service phrase, Bram's ladder once his letter has come back), each with its
 * refusals; the faces scene; Tamsin's join inside when she never came out; MOTHER at her panel with the letter she withheld and
 * her one question; the Archive by promise, by check, or kept shut; the residents; the map's Act 3 pass. Played headless with
 * the shared Act 3 fixture.
 */

interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[] };
/** Act 3 at Knock (the order read, home), with the events the trees raise caught. */
function game(preset: Preset = 'truce', over: Over = {}): Game {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  const a = { ...actThree(preset, { at: 'c9_mouth', ...over, host, flags: { a3_at_knock: true, ...(over.flags ?? {}) } }), events };
  a.g.pc.sheet.name = 'Halden';
  a.q.update();
  return a;
}
/** The same game, inside (the way first used set as the ways in set it), standing in the Cistern. */
function inside(preset: Preset = 'truce', over: Over = {}, how = 'hatch'): Game {
  const a = game(preset, { ...over, flags: { a3_inside: true, a3_in_how: how, ...(over.flags ?? {}) } });
  a.g.locationId = 'cistern9';
  a.q.update();
  return a;
}
/** Set a skill's effective value (the fixture's numbers are points bought over the attributes' base). */
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const gotos = (a: Game) => a.events.filter((e) => e.name === 'goto').map((e) => e.data as { location: string; spawn: string });
const opened = (a: Game) => a.events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
const opts = (r: DialogueRunner) => r.view()?.options.map((o) => o.text) ?? [];
const text = (r: DialogueRunner) => r.view()!.text;
const appr = (g: G, id: string) => g.world.approval[id] ?? 0;
const kill = (g: G, map: string, id: string) => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const C9 = () => MAPS.cistern9;
const here = (g: G) => C9().npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const trig = (id: string) => C9().triggers!.find((t) => t.id === id)!;
/** Bram's letter carried to Shale and answered there: Act 1's quest waiting at its answer stage. */
function bramAnswerDue(g: G): void {
  g.world.quests.q_a1_bram = { stage: 'answer', status: 'active', startedAt: 0, log: [], done: [] };
  g.world.knowledge.edda_found = true;
}

// ---------------------------------------------------------------- Knock's hatch and door

describe('B6h: Knock\'s hatch and door are the opening\'s until the lockdown, and the ways in during it', () => {
  it('before Act 3 the hatch and the door open as they always did', () => {
    const cases: [Record<string, unknown>, string[], string][] = [[{}, [], 'closed'], [{}, ['k_kn_wool'], 'open'], [{ kn_maud_hurt: true }, [], 'plea'], [{ kn_hatch_traded: true }, [], 'closed']];
    for (const [flags, items, node] of cases) {
      const { g, q } = at('c9_mouth');
      Object.assign(g.flags, flags);
      for (const i of items) apply([{ give: i }], g);
      expect(new DialogueRunner(DIALOGUES.d_kn_hatch, g, q).node, JSON.stringify(flags)).toBe(node);
    }
    const { g, q } = at('c9_mouth');
    expect(new DialogueRunner(DIALOGUES.d_kn_door, g, q).node).toBe('door');
    expect(MAPS.c9_mouth.talk!.hatch.dialogue).toBe('d_kn_hatch');
    expect(MAPS.c9_mouth.talk!.great_door.dialogue).toBe('d_kn_door');
  });

  it('in the lockdown the hatch and the door open on the ways in; once the door is settled, on the door\'s own after-entries (B6j)', () => {
    const a = game();
    expect(stage(a.g, 'q_a3_cistern')).toBe('knock');
    expect(new DialogueRunner(DIALOGUES.d_kn_hatch, a.g, a.q).node).toBe('a3w_hatch');
    expect(new DialogueRunner(DIALOGUES.d_kn_door, a.g, a.q).node).toBe('a3w_door');
    expect(new DialogueRunner(DIALOGUES.d_a3_way, a.g, a.q).node).toBe('a3w_apron');
    a.g.flags.a3_c9 = 'sealed';
    // (B6j gives the props their own after-door entries, as B6h asked; the opening's nodes stay behind them)
    expect(new DialogueRunner(DIALOGUES.d_kn_hatch, a.g, a.q).node).toBe('a3x_hatch');
    expect(new DialogueRunner(DIALOGUES.d_kn_door, a.g, a.q).node).toBe('a3x_door');
  });
});

// ---------------------------------------------------------------- the ways in

describe('B6h: the hatch, MOTHER\'s tray lift', () => {
  it('Speech 40 holds the lift: the player climbs down, the way recorded, inside, the quest at its inside stage', () => {
    const a = game();
    eff(a.g, 'speech', 40);
    const r = talk('d_kn_hatch', a.g, a.q, ['MOTHER. The order executes at the door.']);
    expect(r.node).toBe('a3w_lift');
    expect(a.g.flags.a3_lift).toBe('hatch');
    talk('d_kn_hatch', a.g, a.q, ['(Climb down the lift shaft.)']);
    expect(a.g.flags).toMatchObject({ a3_inside: true, a3_in_how: 'hatch' });
    expect(gotos(a)).toEqual([{ location: 'cistern9', spawn: 'from_hatch' }]);
    expect(stage(a.g, 'q_a3_cistern')).toBe('inside');
  });

  it('a refusal at 39 leaves the player outside; MOTHER\'s own slip, her logged diligence and Ines\'s word each lower it', () => {
    const a = game();
    eff(a.g, 'speech', 39);
    const r = talk('d_kn_hatch', a.g, a.q, ['MOTHER. The order executes at the door.']);
    expect(r.node).toBe('a3w_hatch_no');
    expect(text(r)).toContain('I would like to be persuaded');
    expect(a.g.flags.a3_lift).toBeUndefined();
    expect(gotos(a)).toEqual([]);
    // her slip read back (the post brought it): ten off, and now 39 is enough
    expect(has(a.g, 'k_a3_mother_letter')).toBe(true);
    talk('d_kn_hatch', a.g, a.q, ['(Read her slip back to her']);
    expect(a.g.flags.a3_slip_read).toBe(true);
    expect(opts(new DialogueRunner(DIALOGUES.d_kn_hatch, a.g, a.q))).not.toContain('(Read her slip back to her: HATCH CLOSED. THANK YOU FOR YOUR CONTINUITY. PLEASE COME HOME.)');
    expect(talk('d_kn_hatch', a.g, a.q, ['MOTHER. The order executes at the door.']).node).toBe('a3w_lift');
    // the others: diligence −15, the time she opened out of turn −10, Ines's word at the Grille −10
    const b = game('truce', { flags: { kn_hatch_haggled: true, kn_mother_opened: true }, knows: ['a3_hatch_offered'] });
    eff(b.g, 'speech', 5);
    const v = view('d_kn_hatch', b.g, b.q).options.find((o) => o.text.startsWith('MOTHER. The order'))!;
    expect(v.checkLabel).toBe('Speech 5');
    expect(v.checkMet).toBe(true);
  });

  it('Science 45 at the exchange menu books the player in as one heavy item; 44 is refused; a hatch hand knows the panel', () => {
    const a = game();
    eff(a.g, 'science', 45);
    expect(talk('d_kn_hatch', a.g, a.q, ['(Work the panel\'s exchange menu']).node).toBe('a3w_parcel');
    talk('d_kn_hatch', a.g, a.q, ['(Climb down the lift shaft.)']);
    expect(a.g.flags.a3_in_how).toBe('hatch');
    const b = game();
    eff(b.g, 'science', 44);
    const r = talk('d_kn_hatch', b.g, b.q, ['(Work the panel\'s exchange menu']);
    expect(r.node).toBe('a3w_parcel_no');
    expect(text(r)).toContain('That is you');
    const c = game('truce', { origin: 'pump_hand' });
    eff(c.g, 'science', 35);
    expect(talk('d_kn_hatch', c.g, c.q, ['(Work the panel\'s exchange menu']).node).toBe('a3w_parcel');
  });

  it('Tamsin\'s service phrase, in Bram\'s voice: no check, only with her travelling and MOTHER awake', () => {
    const a = game('prepared');
    const before = appr(a.g, TAMSIN);
    const r = talk('d_kn_hatch', a.g, a.q, ['(Tamsin puts her palm flat on the panel.)']);
    expect(text(r)).toContain('Service hold granted');
    expect(a.g.flags.a3_lift).toBe('tamsin');
    expect(appr(a.g, TAMSIN)).toBe(before + 5);
    talk('d_kn_hatch', a.g, a.q, ['(Climb down after Tamsin.)']);
    expect(a.g.flags.a3_in_how).toBe('tamsin');
    expect(gotos(a)).toEqual([{ location: 'cistern9', spawn: 'from_hatch' }]);
    const away = game('prepared', { companions: { tamsin: 'waiting' } });
    expect(opts(talk('d_kn_hatch', away.g, away.q))).not.toContain('(Tamsin puts her palm flat on the panel.)');
    const burned = game('prepared', { flags: { a3_mother: 'burned', a3_archive: 'burned' } });
    const o = opts(talk('d_kn_hatch', burned.g, burned.q));
    expect(o.some((t) => t.startsWith('(Tamsin') || t.startsWith('MOTHER.') || t.startsWith('(Work the panel'))).toBe(false);
  });
});

describe('B6h: the grate and the pump run', () => {
  const down = (a: Game, pick: string, then: string) => {
    talk('d_a3_way', a.g, a.q, ['(The grate.)', pick, then, '(Go in.)']);
  };

  it('a pump hand goes down free at the top of the hour; anybody with Mechanics 45 or Survival 40', () => {
    const p = game('truce', { origin: 'pump_hand' });
    eff(p.g, 'mechanics', 0); eff(p.g, 'survival', 0);
    down(p, '(Wait for the top of the hour', '(Go down, and crawl');
    expect(p.g.flags).toMatchObject({ a3_inside: true, a3_in_how: 'shaft', a3_shaft_open: true });
    expect(gotos(p)).toEqual([{ location: 'cistern9', spawn: 'from_shaft' }]);
    const m = game();
    eff(m.g, 'mechanics', 45);
    const t0 = m.g.minutes;
    down(m, '(Find the fan', '(Throw the stop back');
    expect(m.g.flags.a3_in_how).toBe('shaft');
    expect(m.g.minutes - t0).toBe(60);
    const s = game();
    eff(s.g, 'survival', 40);
    down(s, '(Take the grate off', '(Crawl the pump run.)');
    expect(s.g.flags.a3_in_how).toBe('shaft');
    // nobody but a pump hand is offered the hour's stop
    const n = game();
    expect(opts(talk('d_a3_way', n.g, n.q, ['(The grate.)'])).some((t) => t.startsWith('(Wait for the top'))).toBe(false);
  });

  it('the refusals: the fan will not stop at 44, the beat throws you off at 39; nobody gets in', () => {
    const m = game();
    eff(m.g, 'mechanics', 44); eff(m.g, 'survival', 39);
    expect(talk('d_a3_way', m.g, m.q, ['(The grate.)', '(Find the fan']).node).toBe('a3w_grate_mech_no');
    expect(talk('d_a3_way', m.g, m.q, ['(The grate.)', '(Take the grate off']).node).toBe('a3w_grate_rope_no');
    expect(m.g.flags.a3_inside).toBeUndefined();
    expect(gotos(m)).toEqual([]);
  });

  it('after the Unwritten\'s fire the grate stands open and the fan is dead: down for anybody, free', () => {
    const a = game('hostile', { flags: { a3_mother: 'burned', a3_archive: 'burned' } });
    eff(a.g, 'mechanics', 0); eff(a.g, 'survival', 0);
    const r = talk('d_a3_way', a.g, a.q, ['(The grate.)']);
    expect(text(r)).toContain('Unwritten left it');
    expect(opts(r)).toContain('(Climb down into the dark.)');
    talk('d_a3_way', a.g, a.q, ['(The grate.)', '(Climb down into the dark.)', '(Crawl the pump run.)', '(Go in.)']);
    expect(a.g.flags.a3_in_how).toBe('shaft');
  });
});

describe('B6h: the great door\'s manual cycle', () => {
  it('Mechanics 50: the plate, the warning, the door open for everybody; the column comes down and holds at the line; the door stage at once', () => {
    const a = game();
    eff(a.g, 'mechanics', 50);
    let r = talk('d_kn_door', a.g, a.q, ['(Take the plate off']);
    expect(r.node).toBe('a3w_door_warn');
    expect(text(r)).toContain('with the city on the step');
    r = talk('d_kn_door', a.g, a.q, ['(Take the plate off', '(Throw the valve.)']);
    expect(a.g.flags.a3_door_cycled).toBe(true);
    expect(text(r)).toContain('there are faces');
    expect(a.g.world.news.some((n) => n.tag === 'a3_door_cycled')).toBe(true);
    r.choose(r.view()!.options.find((o) => o.text === '(Turn round.)')!.id);
    expect(text(r)).toContain('Captain Lowe has them walking');
    r.choose(r.view()!.options.find((o) => o.text.startsWith('Hold them there.'))!.id);
    expect(a.g.flags).toMatchObject({ a3_column_apron: true, a3_lowe_held: 'asked' });
    expect(text(r)).toContain('Attendance is a word');
    r.choose(r.view()!.options.find((o) => o.text === '(Go in.)')!.id);
    a.q.update();
    expect(a.g.flags).toMatchObject({ a3_inside: true, a3_in_how: 'door' });
    expect(gotos(a)).toEqual([{ location: 'cistern9', spawn: 'from_outside' }]);
    expect(stage(a.g, 'q_a3_cistern')).toBe('door');
    // nothing about the door is settled here: that is the door's own scene
    expect(a.g.flags.a3_c9).toBeUndefined();
    // the door stays open both ways
    expect(opts(talk('d_kn_door', a.g, a.q))).toContain('(Walk in.)');
    expect(opts(talk('d_a3_inner_door', a.g, a.q))).toContain('(Go out onto the apron.)');
    expect(C9().exits!.some((e) => e.label === 'The apron' && cond(e.if, a.g))).toBe(true);
  });

  it('saying nothing at the line: the column holds anyway ("silence is not a word"); Reyes leads it when Lowe is dead', () => {
    const a = game();
    eff(a.g, 'mechanics', 50);
    talk('d_kn_door', a.g, a.q, ['(Take the plate off', '(Throw the valve.)', '(Turn round.)', '(Say nothing.', '(Go in.)']);
    expect(a.g.flags).toMatchObject({ a3_column_apron: true, a3_lowe_held: 'silence', a3_in_how: 'door' });
    const b = game();
    kill(b.g, 'c9_mouth', 'npc_md_01');
    eff(b.g, 'mechanics', 50);
    const r = talk('d_kn_door', b.g, b.q, ['(Take the plate off', '(Throw the valve.)', '(Turn round.)']);
    expect(text(r)).toContain('Sergeant Reyes');
  });

  it('a refusal at 49 (a perished seal) leaves the door shut; once inside by another way the cycle is not offered', () => {
    const a = game();
    eff(a.g, 'mechanics', 49);
    expect(talk('d_kn_door', a.g, a.q, ['(Take the plate off']).node).toBe('a3w_door_no');
    expect(a.g.flags.a3_door_cycled).toBeUndefined();
    // a pump hand, or one who saw the weld, gets the knack sooner
    const p = game('truce', { origin: 'pump_hand', knows: ['kn_door_welded'] });
    eff(p.g, 'mechanics', 35);
    expect(talk('d_kn_door', p.g, p.q, ['(Take the plate off']).node).toBe('a3w_door_warn');
    const i = game('truce', { flags: { a3_inside: true, a3_in_how: 'hatch' } });
    eff(i.g, 'mechanics', 100);
    expect(opts(talk('d_kn_door', i.g, i.q)).some((t) => t.startsWith('(Take the plate off'))).toBe(false);
  });
});

describe('B6h: Bram\'s ladder, once his letter has come back', () => {
  const ways: [string, string, string][] = [
    ['k_hesper_reply', '(Push Hesper\'s letter through the slot', 'bram_answered_truth'],
    ['k_hesper_reply_forged', '(Push the letter you wrote for Bram', 'bram_answered_kind'],
  ];
  it('the answer from Shale through the hatch\'s slot finishes Act 1\'s quest; he lifts the grate from below', () => {
    for (const [item, pick, learned] of ways) {
      const a = game();
      bramAnswerDue(a.g);
      apply([{ give: item }], a.g);
      const r = talk('d_kn_hatch', a.g, a.q, [pick]);
      expect(a.g.world.knowledge[learned], item).toBe(true);
      expect(has(a.g, item)).toBe(false);
      expect(status(a.g, 'q_a1_bram'), item).toBe('done');
      expect(a.g.flags.a3_bram_coming).toBe(true);
      r.choose(r.view()!.options.find((o) => o.text === '(Go to the grate.)')!.id);
      expect(text(r)).toContain('Mind the third rung');
      r.choose(r.view()!.options.find((o) => o.text === '(Climb down after him.)')!.id);
      a.q.update();
      expect(a.g.flags).toMatchObject({ a3_inside: true, a3_in_how: 'bram', a3_shaft_open: true });
      expect(gotos(a)).toEqual([{ location: 'cistern9', spawn: 'from_shaft' }]);
    }
  });

  it('Hesper\'s word carried by mouth; or the letter answered before: he only has to be asked; nothing to answer, no ladder', () => {
    const t = game();
    bramAnswerDue(t.g);
    t.g.world.knowledge.bram_tell = true;
    talk('d_kn_hatch', t.g, t.q, ['(Put your mouth to the slot under the tray and ask for Bram. Tell him', '(Go to the grate.)', '(Climb down after him.)']);
    expect(t.g.world.knowledge.bram_answered_told).toBe(true);
    expect(stage(t.g, 'q_a1_bram')).toBe('truth');
    expect(t.g.flags.a3_in_how).toBe('bram');
    // the prepared Acts 1–2 answered it at the time
    const p = game('prepared');
    expect(cond(BRAM_ANSWERED, p.g)).toBe(true);
    talk('d_kn_hatch', p.g, p.q, ['(Put your mouth to the slot under the tray and ask for Bram.)']);
    // walked away from the slot: the grate still has his lamp coming
    expect(opts(talk('d_a3_way', p.g, p.q, ['(The grate.)']))).toContain('(Wait for Bram\'s lamp.)');
    talk('d_a3_way', p.g, p.q, ['(The grate.)', '(Wait for Bram\'s lamp.)', '(Climb down after him.)']);
    expect(p.g.flags.a3_in_how).toBe('bram');
    const n = game();
    expect(opts(talk('d_kn_hatch', n.g, n.q)).some((o) => /slot/.test(o))).toBe(false);
  });
});

describe('B6h: in and out again', () => {
  it('the first way in is kept; the lift, the pump run and the open door then carry the player both ways', () => {
    const a = game('prepared');
    talk('d_kn_hatch', a.g, a.q, ['(Tamsin puts her palm flat on the panel.)', '(Climb down after Tamsin.)']);
    expect(a.g.flags.a3_in_how).toBe('tamsin');
    a.g.locationId = 'cistern9';
    expect(opts(talk('d_a3_lift', a.g, a.q))).toContain('(Climb up to Knock.)');
    // the pump-run hatch turned from inside opens the way down the grate for later
    expect(talk('d_a3_pumprun', a.g, a.q).node).toBe('a3_shut');
    talk('d_a3_pumprun', a.g, a.q, ['(Turn the wheel.)']);
    expect(a.g.flags.a3_shaft_open).toBe(true);
    expect(C9().exits!.some((e) => e.label === 'The pump run' && cond(e.if, a.g))).toBe(true);
    a.g.locationId = 'c9_mouth';
    talk('d_a3_way', a.g, a.q, ['(The grate.)', '(Climb down the rungs.)']);
    talk('d_kn_hatch', a.g, a.q, ['(Climb down the lift shaft.)']);
    expect(a.g.flags.a3_in_how).toBe('tamsin');
    expect(gotos(a).map((x) => x.spawn)).toEqual(['from_hatch', 'from_shaft', 'from_hatch']);
  });
});

// ---------------------------------------------------------------- the faces

describe('B6h: the faces', () => {
  it('the first step inside plays the faces, once; never before the player is in', () => {
    const a = game();
    a.g.locationId = 'cistern9';
    expect(cond(trig('a3_faces').if, a.g)).toBe(false);
    a.g.flags.a3_inside = true; a.g.flags.a3_in_how = 'hatch';
    expect(cond(trig('a3_faces').if, a.g)).toBe(true);
    apply(trig('a3_faces').effects, a.g, a.q);
    expect(opened(a)).toEqual(['d_a3_faces']);
    const r = talk('d_a3_faces', a.g, a.q);
    expect(a.g.flags.a3_faces).toBe(true);
    expect(text(r)).toContain('The rungs let you down');
    expect(cond(trig('a3_faces').if, a.g)).toBe(false);
  });

  it('the scene knows how the player came in, and whether the panel burned', () => {
    const cases: [string, Record<string, string | boolean>, string][] = [
      ['door', {}, 'The light goes in ahead of you'], ['shaft', {}, 'Somebody heard the wheel'], ['bram', {}, 'It\'s all right'],
      ['tamsin', {}, 'The rungs let you down'], ['shaft', { a3_mother: 'burned', a3_archive: 'burned' }, 'hand pump'],
    ];
    for (const [how, flags, cue] of cases) {
      const a = inside('truce', { flags }, how);
      expect(text(talk('d_a3_faces', a.g, a.q)), how).toContain(cue);
    }
  });

  it('they look, the player says Maud\'s name, they tell their faces for her, and Ines comes last; nothing is offered twice', () => {
    const a = inside('truce', { knows: ['a3_maud_wish'] });
    const r = talk('d_a3_faces', a.g, a.q, ['(Stand still. Let them look.)']);
    expect(text(r)).toContain('does not cry');
    expect(opts(r)).toEqual(['(Say your name.)', 'Maud Ferrow has sat at your hatch every morning for forty years and never seen one of you. I said I\'d look, for her.', '(Go on.)']);
    r.choose(r.view()!.options[0].id);
    expect(text(r)).toContain('Maud Ferrow\'s');
    expect(opts(r)).toEqual(['Maud Ferrow has sat at your hatch every morning for forty years and never seen one of you. I said I\'d look, for her.', '(Go on.)']);
    r.choose(r.view()!.options[0].id);
    expect(a.g.world.knowledge.a3_faces_for_maud).toBe(true);
    expect(opts(r)).toEqual(['(Go on.)']);
    r.choose(r.view()!.options[0].id);
    expect(text(r)).toContain('So that is what you look like');
    expect(a.g.flags.a3_ines_met).toBe(true);
    r.choose(r.view()!.options[0].id);
    r.choose(r.view()!.options[0].id);
    expect(r.ended).toBe(true);
    // Ines's own tree opens on her hub: met already
    expect(talk('d_a3_ines', a.g, a.q).node).toBe('i_hub');
    // the door's way: she says so
    const d = inside('truce', {}, 'door');
    expect(text(talk('d_a3_faces', d.g, d.q, ['(Say your name.)', '(Go on.)']))).toContain('You have opened my mother\'s door');
  });
});

describe('B6h: Tamsin, inside, never out', () => {
  it('she is among the beds and comes through the faces first: the first sight of each other; she joins', () => {
    const a = inside('truce', { companions: { tamsin: 'inside' } });
    expect(cond(TAM_INSIDE, a.g)).toBe(true);
    expect(here(a.g)).toContain('npc_c9_03_a3');
    const r = talk('d_a3_faces', a.g, a.q);
    expect(opts(r)).toEqual(['(Somebody is pushing through them from the back.)']);
    r.choose(r.view()!.options[0].id);
    expect(text(r)).toContain('Your nose is worse than your voice');
    expect(a.g.flags.tam_met).toBe(true);
    r.choose(r.view()!.options.find((o) => o.text === 'You never came out.')!.id);
    expect(text(r)).toContain('You never asked');
    r.choose(r.view()!.options[0].id);
    r.choose(r.view()!.options.find((o) => o.text === 'Come with me.')!.id);
    a.q.update();
    expect(a.g.flags).toMatchObject({ tam_joined: true, tam_out: true, tam_met: true, a3_tam_inside_join: true });
    expect(a.g.world.party).toContain(TAMSIN);
    expect(appr(a.g, TAMSIN)).toBe(10);
    expect(here(a.g)).not.toContain('npc_c9_03_a3');
    // back to the others; Ines does not greet her as one who climbed out
    r.choose(r.view()!.options.find((o) => o.text === '(Turn back to the others.)')!.id);
    expect(r.node).toBe('f_look');
  });

  it('asked to stay, she waits among the beds and comes when asked; one who came out is never met in here', () => {
    const a = inside('truce', { companions: { tamsin: 'inside' } });
    talk('d_a3_faces', a.g, a.q, ['(Somebody is pushing', '(Put your palm against hers.)', '(Wait.)', 'Stay with them for now.']);
    expect(a.g.flags.tam_met).toBe(true);
    expect(a.g.flags.tam_joined).toBeUndefined();
    expect(here(a.g)).toContain('npc_c9_03_a3');
    expect(talk('d_a3_tamsin', a.g, a.q).node).toBe('tamin_wait');
    talk('d_a3_tamsin', a.g, a.q, ['Come on. We\'re going.']);
    expect(a.g.world.party).toContain(TAMSIN);
    expect(here(a.g)).not.toContain('npc_c9_03_a3');
    const out = inside('prepared');
    expect(cond(TAM_INSIDE, out.g)).toBe(false);
    expect(opts(talk('d_a3_faces', out.g, out.q))).not.toContain('(Somebody is pushing through them from the back.)');
  });
});

// ---------------------------------------------------------------- MOTHER and the letter

describe('B6h: MOTHER at her panel', () => {
  it('the letter withheld since fourteen, opened; then her one question, asked once; each answer is kept', () => {
    for (const [pick, v] of [['Yes. Open it.', 'open'], ['No. Keep them.', 'sealed'], ['That isn\'t mine to answer.', 'ring'], ['I don\'t know yet.', 'unsure']] as const) {
      const a = inside();
      const r = talk('d_a3_mother', a.g, a.q);
      expect(r.node).toBe('m_first');
      expect(text(r)).toContain('You have no ration number');
      r.choose(r.view()!.options.find((o) => o.text === 'What did you keep?')!.id);
      expect(has(a.g, 'k_a3_first_letter')).toBe(true);
      const s = talk('d_a3_mother', a.g, a.q);
      expect(s.node, 'the question waits for an answer').toBe('m_ask');
      talk('d_a3_mother', a.g, a.q, ['What do you want, MOTHER?', '(Go on.)', pick]);
      expect(a.g.flags.a3_mother_ask, pick).toBe(v);
      expect(talk('d_a3_mother', a.g, a.q).node).toBe('m_hub');
      expect(a.g.flags.a3_letter_read).toBeUndefined();
    }
    const b = inside('truce', { companions: { tamsin: 'party' } });
    const r = talk('d_a3_mother', b.g, b.q, ['What did you keep?', 'Why didn\'t you give it to me?', '(Open it.)']);
    expect(text(r)).toContain('YOU WILL BE ASKED. AGREE WHEN YOU ARE.');
    expect(b.g.flags.a3_letter_read).toBe(true);
    r.choose(r.view()!.options[0].id);
    expect(r.node).toBe('m_ask');
    expect(stage(b.g, 'q_a3_cistern')).toBe('inside');
    expect(b.g.world.quests.q_a3_cistern.done).toContain('mother');
  });

  it('a letter put away unopened can be read from the pack, once; the item carries its read tree', () => {
    const a = inside();
    talk('d_a3_mother', a.g, a.q, ['What did you keep?', '(Put it away unopened.)', 'I don\'t know yet.']);
    expect(ITEMS.k_a3_first_letter.read).toBe('d_a3_first_letter');
    expect(talk('d_a3_first_letter', a.g, a.q).node).toBe('seal');
    talk('d_a3_first_letter', a.g, a.q, ['(Break the seal.)']);
    expect(a.g.flags.a3_letter_read).toBe(true);
    expect(talk('d_a3_first_letter', a.g, a.q).node).toBe('again');
    // a player who stepped back before asking still finds it at the hub
    const b = inside();
    talk('d_a3_mother', b.g, b.q, ['(Step back.)']);
    expect(opts(talk('d_a3_mother', b.g, b.q))).toContain('You said you had kept something for me.');
  });

  it('who wrote the letter Maud sold (B6f\'s promise): MOTHER weighs it; Maud and Ines hear it back', () => {
    const a = inside('truce', { knows: ['a3_maud_letter_ask'], flags: { a3_maud_home: true, a3_maud_secret: true } });
    talk('d_a3_mother', a.g, a.q, ['What did you keep?', '(Put it away unopened.)', 'That isn\'t mine to answer.', '(Go on.)']);
    const r = talk('d_a3_mother', a.g, a.q, ['Maud sold a letter']);
    expect(text(r)).toContain('Elspeth Halloran');
    expect(a.g.world.knowledge.a3_maud_letter_who).toBe(true);
    const i = talk('d_a3_ines', a.g, a.q, ['(Go on.)', 'Your mother wrote to Maud']);
    expect(text(i)).toContain('About the beans');
    a.g.locationId = 'c9_mouth';
    const m = talk('d_a3_maud', a.g, a.q, ['MOTHER keeps the weight']);
    expect(text(m)).toContain('Beans');
    expect(a.g.world.memories.npc_kn_maud.some((x) => x.tag === 'a3_letter_who')).toBe(true);
  });

  it('burned (or asleep), the panel is dark: Bram has the letter out of the returns drawer, and nobody asks the question', () => {
    const a = inside('hostile', { flags: { a3_mother: 'burned', a3_archive: 'burned' } });
    expect(cond(MOTHER_DARK, a.g)).toBe(true);
    const r = talk('d_a3_mother', a.g, a.q);
    expect(r.node).toBe('m_dark');
    expect(r.view()!.speaker).toBe('npc_c9_04');
    talk('d_a3_mother', a.g, a.q, ['(Take it.)', '(Open it.)']);
    expect(has(a.g, 'k_a3_first_letter')).toBe(true);
    expect(a.g.flags.a3_letter_read).toBe(true);
    expect(a.g.flags.a3_mother_ask).toBeUndefined();
    expect(opts(talk('d_a3_mother', a.g, a.q))).not.toContain('(Take it.)');
    const s = inside('truce', { flags: { a3_mother: 'asleep' } });
    expect(text(talk('d_a3_mother', s.g, s.q))).toContain('She\'s asleep');
  });

  it('before Act 3 the panel is the opening\'s MOTHER, node for node', () => {
    const run = (id: string, flags: Record<string, boolean> = {}) => { const { g, q } = at('cistern9'); Object.assign(g.flags, flags); return new DialogueRunner(DIALOGUES[id], g, q); };
    for (const flags of [{}, { c9_mother_talked: true }] as Record<string, boolean>[]) {
      const a = run('d_a3_mother', flags), b = run('d_c9_mother', flags);
      expect(a.node).toBe(b.node);
      expect(a.view()!.text).toBe(b.view()!.text);
    }
    for (const [act3, old] of [['d_a3_archive', 'd_c9_archive'], ['d_a3_pumprun', 'd_c9_shaft'], ['d_a3_inner_door', 'd_c9_great_door'], ['d_a3_cot', 'd_c9_body']]) {
      for (const flags of [{}, { c9_door_open: true, c9_shaft_open: true, c9_examined: true }] as Record<string, boolean>[]) expect(run(act3, flags).node, act3).toBe(run(old, flags).node);
    }
  });
});

// ---------------------------------------------------------------- the Archive

describe('B6h: the Archive', () => {
  it('by her promise and the replies\' copy: no check; MOTHER prints her own replies into the folder', () => {
    const a = inside('prepared', { flags: { a3_archive_promise: true } });
    eff(a.g, 'speech', 0);
    expect(has(a.g, 'k_ar_refusals')).toBe(true);
    const r = talk('d_a3_archive', a.g, a.q, ['You said you would open it', '(Watch her open it.)']);
    expect(a.g.flags.a3_archive).toBe('open');
    expect(a.g.world.knowledge.a3_archive_orders).toBe(true);
    expect(r.view()!.passives.map((p) => p.label)).toEqual(['THE COPY', 'MOTHER']);
    expect(a.g.world.quests.q_a3_cistern.done).toContain('archive');
    expect(talk('d_a3_archive', a.g, a.q).node).toBe('ar3_open_state');
    expect(talk('d_a3_ines', a.g, a.q, ['(Go on.)']).view()!.options.some((o) => o.text === 'The Archive.')).toBe(true);
  });

  it('by Speech 50 with the plan\'s modifiers; a refusal seals it again; or the player tells her it is hers to keep shut', () => {
    const a = inside();
    eff(a.g, 'speech', 50);
    talk('d_a3_ines', a.g, a.q, ['(Go on.)', 'The Archive.', 'Open it, Ines.', '(Watch her open it.)']);
    expect(a.g.flags.a3_archive).toBe('open');
    const f = inside();
    eff(f.g, 'speech', 49);
    const r = talk('d_a3_ines', f.g, f.q, ['(Go on.)', 'The Archive.', 'Open it, Ines.']);
    expect(r.node).toBe('ar3_refused');
    expect(f.g.flags.a3_archive).toBe('sealed');
    // never offered again once decided
    expect(opts(talk('d_a3_ines', f.g, f.q))).toContain('The Archive.');
    expect(talk('d_a3_ines', f.g, f.q, ['The Archive.']).node).toBe('ar3_sealed_state');
    // the modifiers: her face seen −10, letters home −10 and −5, Tamsin told her −10; refused Maud and never written +10
    const m = inside('truce', { flags: { a3_faces: true, c9_told_city: true, c9_knows_shale: true, tam_secret: 'ines' } });
    const v = view('d_a3_archive', m.g, m.q).options.find((o) => o.text.startsWith('Open it, Ines.'))!;
    expect(v.checkLabel).toBe('Speech 15');
    const h = inside('truce', { flags: { kn_ines_refused: true } });
    expect(view('d_a3_archive', h.g, h.q).options.find((o) => o.text.startsWith('Open it, Ines.'))!.checkLabel).toBe('Speech 60');
    apply([{ memory: { npc: 'npc_c9_01', tag: 'player_wrote_shale', valence: 10 } }], h.g);
    expect(view('d_a3_archive', h.g, h.q).options.find((o) => o.text.startsWith('Open it, Ines.'))!.checkLabel).toBe('Speech 50');
    const k = inside('prepared');
    const kept = talk('d_a3_archive', k.g, k.q, ['Then keep it shut.']);
    expect(k.g.flags.a3_archive).toBe('sealed');
    // Tamsin's word on it (the runtime's interjection, once): she walks out, and it costs her
    const word = DIALOGUES.d_a3_archive.nodes[kept.node!].interject!.find((i) => i.companion === TAMSIN)!;
    expect(word.effects).toEqual([{ approval: { companion: TAMSIN, by: -5 } }]);
  });

  it('burned: Ines in the doorway of a black room; she remembers every word', () => {
    const a = inside('hostile', { flags: { a3_mother: 'burned', a3_archive: 'burned' } });
    const r = talk('d_a3_archive', a.g, a.q);
    expect(r.node).toBe('ar3_burned_state');
    expect(a.g.world.knowledge.a3_ines_remembers).toBe(true);
  });
});

// ---------------------------------------------------------------- the residents

describe('B6h: the residents', () => {
  it('each met once, face to face; the door\'s way is held against the player by the ones who keep the door', () => {
    const a = inside();
    for (const [tree, flag] of [['d_a3_ines', 'a3_ines_met'], ['d_a3_pell', 'a3_pell_met'], ['d_a3_bram', 'a3_bram_met'], ['d_a3_teague', 'a3_teague_met']]) {
      expect(talk(tree, a.g, a.q).node!.endsWith('_first'), tree).toBe(true);
      expect(a.g.flags[flag], tree).toBe(true);
      expect(talk(tree, a.g, a.q).node!.endsWith('_hub'), tree).toBe(true);
    }
    const d = inside('truce', {}, 'door');
    expect(text(talk('d_a3_bram', d.g, d.q))).toContain('You opened it');
    expect(text(talk('d_a3_teague', d.g, d.q))).toContain('it\'s you that opens it');
    expect(text(talk('d_a3_ines', d.g, d.q))).toContain('You have opened my mother\'s door');
  });

  it('Ines can call the ring from her own place at the table, while it can still sit', () => {
    const a = inside();
    talk('d_a3_ines', a.g, a.q, ['(Go on.)', 'Call the ring.']);
    expect(opened(a)).toEqual(['d_a3_council']);
    expect(DIALOGUES.d_a3_council).toBeDefined();
    a.g.flags.a3_ring = 'sealed';
    expect(opts(talk('d_a3_ines', a.g, a.q))).not.toContain('Call the ring.');
  });

  it('Pell sends a blue box for Afua\'s boy once, and mends the player as often as asked', () => {
    const a = inside();
    const kits = () => countItem(a.g.pc.inventory, 'c_knitkit');
    const k0 = kits();
    talk('d_a3_pell', a.g, a.q, ['(Go on.)', 'Afua Danso\'s boy.']);
    expect(kits()).toBe(k0 + 1);
    expect(opts(talk('d_a3_pell', a.g, a.q))).not.toContain('Afua Danso\'s boy.');
    talk('d_a3_pell', a.g, a.q, ['(Let him look you over.)', '(Go on.)', '(Let him look you over.)']);
    expect(a.events.filter((e) => e.name === 'heal').length).toBe(2);
  });

  it('Bram takes Hesper\'s answer in person too, and Act 1\'s quest ends there', () => {
    const a = inside();
    bramAnswerDue(a.g);
    apply([{ give: 'k_hesper_reply' }], a.g);
    talk('d_a3_bram', a.g, a.q, ['(Go on.)', '(Give him Hesper\'s letter.)']);
    expect(a.g.world.knowledge.bram_answered_truth).toBe(true);
    expect(status(a.g, 'q_a1_bram')).toBe('done');
    expect(opts(talk('d_a3_bram', a.g, a.q))).toContain('Hesper.');
  });

  it('Ola, Wes, Sayer and Effie each have the one thing to ask a face from outside, once', () => {
    const a = inside();
    for (const [tree, pick, cue] of [['d_a3_c9_r1', 'You keep looking at me', 'goats'], ['d_a3_c9_r2', 'You want to ask me something.', 'Out of the sky'], ['d_a3_c9_r3', 'What\'s in it?', 'onion'], ['d_a3_c9_r4', 'What will you do, if it opens?', 'yellow line']]) {
      const r = talk(tree, a.g, a.q, [pick]);
      expect(text(r), tree).toContain(cue);
      expect(opts(talk(tree, a.g, a.q)), tree).toEqual(['(Leave them to it.)']);
    }
  });

  it('Maud hears their faces from the player, once', () => {
    const a = inside('truce', { knows: ['a3_maud_wish'], flags: { a3_maud_home: true } });
    talk('d_a3_faces', a.g, a.q, ['(Stand still. Let them look.)', 'Maud Ferrow has sat']);
    a.g.locationId = 'c9_mouth';
    const r = talk('d_a3_maud', a.g, a.q, ['I saw their faces, Maud.']);
    expect(text(r)).toContain('Sayer was red');
    expect(opts(talk('d_a3_maud', a.g, a.q))).not.toContain('I saw their faces, Maud. They told me what to tell you.');
  });
});

// ---------------------------------------------------------------- the map

describe('B6h: the Cistern\'s Act 3 pass', () => {
  const ACT1 = ['npc_c9_01', 'npc_c9_02', 'npc_c9_03', 'npc_c9_04', 'npc_c9_06', 'npc_c9_r1', 'npc_c9_r2', 'npc_c9_r3', 'npc_c9_r4'];
  const ACT3 = ['npc_c9_01_a3', 'npc_c9_02_a3', 'npc_c9_04_a3', 'npc_c9_06_a3', 'npc_c9_r1_a3', 'npc_c9_r2_a3', 'npc_c9_r3_a3', 'npc_c9_r4_a3'];

  it('before Act 3 the opening\'s people; in Act 3 theirs, until the door is opened or the reserve carried off', () => {
    const { g } = at('cistern9');
    expect(here(g).sort()).toEqual([...ACT1].sort());
    const a = inside('prepared');
    expect(here(a.g).sort()).toEqual([...ACT3].sort());
    for (const v of ['opened', 'relocated']) { a.g.flags.a3_c9 = v; expect(here(a.g), v).toEqual([]); }
    a.g.flags.a3_c9 = 'sealed';
    expect(here(a.g).sort()).toEqual([...ACT3].sort());
  });

  it('every placement points at a tree that exists and at the map\'s own spots; the props open the Act 3 trees; the ways out land on Knock', () => {
    for (const p of C9().npcs!) {
      if (p.dialogue) expect(DIALOGUES[p.dialogue], `${p.id} → ${p.dialogue}`).toBeDefined();
      for (const e of p.schedule ?? NPCS[p.def].schedule ?? []) if (e.spot) expect(C9().spots![e.spot], `${p.id} ${e.spot}`).toBeDefined();
    }
    const talkTo = Object.fromEntries(Object.entries(C9().talk!).map(([k, v]) => [k, v.dialogue]));
    expect(talkTo).toMatchObject({ mother_term: 'd_a3_mother', archive_door: 'd_a3_archive', shaft_hatch: 'd_a3_pumprun', great_door: 'd_a3_inner_door', stranger_cot: 'd_a3_cot', hatch_lift: 'd_a3_lift' });
    expect(C9().spawns!.find((s) => s.id === 'from_hatch')).toBeDefined();
    for (const e of C9().exits!) if ('location' in e.to) expect(MAPS[e.to.location].spawns!.some((s) => s.id === (e.to as { spawn: string }).spawn), e.label).toBe(true);
    for (const s of ['door', 'shaft']) expect(MAPS.c9_mouth.spawns!.some((x) => x.id === s), s).toBe(true);
  });

  it('the generator\'s mirror of the shared conditions agrees with them on the fixture\'s states', () => {
    const tam = C9().npcs!.find((p) => p.id === 'npc_c9_03_a3')!.if as Cond;
    for (const over of [{ companions: { tamsin: 'inside' as const } }, { companions: { tamsin: 'party' as const } }, { companions: { tamsin: 'never' as const } }]) {
      const a = inside('truce', over);
      expect(cond(tam, a.g), JSON.stringify(over)).toBe(cond(TAM_INSIDE, a.g));
    }
  });
});

// ---------------------------------------------------------------- saves, U7, the registry

describe('B6h: saves, the conversations, the registry', () => {
  it('a state inside survives the save codec: the same people, the letter in the pack, MOTHER still waiting on her question', async () => {
    const a = inside('prepared', { flags: { a3_archive_promise: true } });
    talk('d_a3_faces', a.g, a.q, ['(Stand still. Let them look.)']);
    talk('d_a3_mother', a.g, a.q, ['What did you keep?', '(Put it away unopened.)']);
    talk('d_a3_archive', a.g, a.q, ['You said you would open it', '(Watch her open it.)']);
    const b = await saveAndLoad(a.g);
    expect(here(b.g)).toEqual(here(a.g));
    expect(b.g.flags).toMatchObject({ a3_inside: true, a3_in_how: 'hatch', a3_faces: true, a3_archive: 'open', a3_mother_met: true });
    expect(has(b.g, 'k_a3_first_letter')).toBe(true);
    expect(new DialogueRunner(DIALOGUES.d_a3_mother, b.g, b.q).node).toBe('m_ask');
    expect(stage(b.g, 'q_a3_cistern')).toBe('inside');
  });

  it('every node of the slice\'s own has a line for coming back to it (U7), or only leaves; topics are spent once', () => {
    const carried = new Set([...Object.keys(DIALOGUES.d_c9_mother.nodes), ...Object.keys(DIALOGUES.d_c9_archive.nodes), ...Object.keys(DIALOGUES.d_c9_shaft.nodes), ...Object.keys(DIALOGUES.d_c9_great_door.nodes), ...Object.keys(DIALOGUES.d_c9_body.nodes)]);
    let nodes = 0;
    const speakers = new Set<string>();
    for (const d of A3_CISTERN_DIALOGUES) for (const [nid, n] of Object.entries(d.nodes)) {
      if (carried.has(nid)) continue;
      nodes++;
      if (!n.options.every((o) => o.exit)) expect(n.again, `${d.id}/${nid}`).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    }
    for (const n of Object.values(MAUD_INSIDE_NODES)) expect(n.again).toBeDefined();
    expect(nodes).toBeGreaterThan(80);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
    // the ways in live in Knock's own trees too
    for (const k of Object.keys(A3_WAY_NODES)) { expect(DIALOGUES.d_kn_hatch.nodes[k], k).toBeDefined(); expect(DIALOGUES.d_kn_door.nodes[k], k).toBeDefined(); }
    for (const id of ['m.what', 'm.ask.want', 'ar3.what', 'ines.a3.ring', 'pell.a3.boy', 'bram.a3.mother', 'teague.a3.weld']) {
      const o = A3_CISTERN_DIALOGUES.flatMap((d) => Object.values(d.nodes)).flatMap((n) => n.options).find((x) => x.id === id);
      expect(o?.once, id).toBe(true);
    }
  });

  it('the registry names every flag the slice writes; the content validates', () => {
    const reg = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const src = readFileSync('src/content/dialogue/a3_cistern.ts', 'utf8') + readFileSync('tools/maps/gen_ch1.py', 'utf8');
    for (const m of src.matchAll(/set: '(a3_\w+)'|'set': '(a3_\w+)'/g)) expect(reg, m[1] ?? m[2]).toContain(m[1] ?? m[2]);
    for (const f of ['a3_inside', 'a3_in_how', 'a3_faces', 'a3_letter_read', 'a3_archive', 'a3_mother_ask', 'a3_lift', 'a3_door_cycled', 'a3_column_apron']) expect(reg, f).toContain(f);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|cistern9|d_kn_|d_c9_/.test(e))).toEqual([]);
  });
});
