import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import {
  A3_FORCES_DIALOGUES, GRILLE_BURNED_NODES, HALE_DOWN, HALE_FIGHTING, HALE_KILLED, UW_DOWN, UW_FIGHTING, UW_FOUGHT, UW_PLACED,
} from '../src/content/dialogue/a3_forces';
import { A3_EVENTS } from '../src/content/world/a3_events';
import { B_MEANS, D_PEOPLE, GUILD_IN_PLAY, HALE_HERE, PETRA_DEAD } from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { skill } from '../src/engine/stats/sheet';
import type { SkillId } from '../src/engine/stats/rules';
import { apply, test as cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, has, hour, saveAndLoad, stage, status, talk, view, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6g — Knock at night: the Unwritten (their aim, their rule, the turn, and the four ways it ends), Factor Orme's paper when
 * the guild is in play, Brannick Hale and Maud's judgement, the hound handlers, the burning and the dark Grille after it.
 * Played headless with the shared Act 3 fixture.
 */

interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[] };
function game(preset: Preset, over: Over = {}): Game {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  const a = { ...actThree(preset, { ...over, host }), events };
  a.g.pc.sheet.name = 'Halden';
  a.g.locationId = 'c9_mouth';
  return a;
}
const MAP = () => MAPS.c9_mouth;
const here = (g: G) => MAP().npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const UW_IDS = (g: G) => here(g).filter((id) => /npc_of_02|npc_a3_u/.test(id));
const kill = (g: G, id: string) => { (g.npcs as Record<string, unknown>)[`c9_mouth/${id}`] = { dead: true }; };
const trig = (id: string) => MAP().triggers!.find((t) => t.id === id)!;
const opts = (id: string, a: A3) => view(id, a.g, a.q).options.map((o) => o.text);
const opt = (id: string, a: A3, prefix: string) => view(id, a.g, a.q).options.find((o) => o.text.startsWith(prefix));
const opened = (events: Ev[]) => events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
function go(r: DialogueRunner, a: A3, picks: string[]): DialogueRunner {
  for (const p of picks) {
    const o = r.view()?.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`no option "${p}" in [${r.view()?.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
  return r;
}
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
/** Night at Knock, the Unwritten met and their aim heard: the runner waits at their hub. */
function aim(a: A3): DialogueRunner {
  hour(a.g, 22);
  return talk('d_a3_petra', a.g, a.q, ['(Sit down.)', 'What did you come here to do?', '(Go on.)']);
}
/** The aim, then how, then the turn. */
function turned(a: A3): DialogueRunner {
  return go(aim(a), a, ['How?', '(Go on.)', 'That grate is how they breathe.', '(Go on.)']);
}
/** Walk onto Knock's map: the after-triggers fire if their condition holds (they are not once-only). */
function step(a: A3): void {
  for (const t of MAP().triggers!.filter((x) => ['a3_uw_after', 'a3_hale_after'].includes(x.id))) if (cond(t.if, a.g)) { apply(t.effects, a.g, a.q); a.q.update(); }
}

// ---------------------------------------------------------------- the Unwritten: where they are

describe('B6g: the Unwritten at Knock, by night, until they are answered', () => {
  it('the map\'s conditions are the shared ones; by night only, Petra or Juniper leading, and two more', () => {
    for (const id of ['npc_a3_u2', 'npc_a3_u3']) expect(MAP().npcs!.find((p) => p.def === id)!.if, id).toEqual(UW_PLACED);
    expect(MAP().npcs!.find((p) => p.def === 'npc_of_02')!.if).toEqual({ all: [UW_PLACED, { not: PETRA_DEAD }] });
    expect(trig('a3_uw_after').if).toEqual({ all: [UW_FIGHTING, UW_DOWN] });
    expect(trig('a3_uw_after').effects).toEqual(UW_FOUGHT);
    expect(trig('a3_hale_after').if).toEqual({ all: [HALE_FIGHTING, HALE_DOWN] });
    expect(trig('a3_hale_after').effects).toEqual(HALE_KILLED);
    const a = game('prepared');
    hour(a.g, 12);
    expect(UW_IDS(a.g)).toEqual([]);
    hour(a.g, 23);
    expect(UW_IDS(a.g)).toEqual(['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']);
    kill(a.g, 'npc_of_02');
    expect(UW_IDS(a.g)).toEqual(['npc_a3_u1', 'npc_a3_u2', 'npc_a3_u3']);
    const j = view('d_a3_petra', a.g, a.q);
    expect(j.speaker).toBe('npc_a3_u1');
    expect(j.text).toContain('Juniper Lowry');
  });

  it('nothing happens without the player\'s answer: nights pass at Knock and away, and nobody goes down the grate', () => {
    const a = game('prepared');
    for (let i = 0; i < 3; i++) { waitFor(a.g, a.q, 'c9_mouth', 3); waitFor(a.g, a.q, 'shale', 3); }
    expect(a.g.flags.a3_unwritten).toBeUndefined();
    expect(a.g.world.events.a3_burning).toBeUndefined();
    hour(a.g, 22);
    a.g.locationId = 'c9_mouth';
    expect(UW_IDS(a.g)).toEqual(['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']);
    // they say they act only with the player on the slope
    const r = talk('d_a3_petra', a.g, a.q, ['(Sit down.)', 'Why tell me?']);
    expect(r.view()!.text).toContain('You\'re the only book we allow');
  });

  it('the chalk by day and the aim by night start the quest; the turn is told by whoever knows it', () => {
    const a = game('prepared');
    hour(a.g, 9);
    expect(cond(trig('a3_chalk').if, a.g)).toBe(true);
    apply(trig('a3_chalk').effects, a.g, a.q); a.q.update();
    expect(stage(a.g, 'q_a3_unwritten')).toBe('chalk');
    const b = game('choir', { companions: { tamsin: 'waiting' } });
    const r = aim(b);
    expect(status(b.g, 'q_a3_unwritten')).toBe('active');
    expect(b.g.world.knowledge.a3_uw_aim).toBe(true);
    go(r, b, ['How?', '(Go on.)', 'That grate is how they breathe.']);
    expect(r.view()!.text).toContain('what a sealed room needs');
    expect(r.view()!.text).toContain('Into a column');
    // Tamsin travelling says it herself; MOTHER said it at the Grille; a pump hand knows the grate
    const t = game('prepared');
    expect(turned(t).view()).toBeTruthy();
    expect(view('d_a3_petra', t.g, t.q).text).toContain('since you told her what it is');
    const tam = game('prepared');
    const rt = go(aim(tam), tam, ['How?', '(Go on.)', 'That grate is how they breathe.']);
    expect(rt.view()!.text).toContain('That\'s the intake');
    const m = game('choir', { companions: { tamsin: 'waiting' } });
    m.g.world.seen['a3grille.well'] = 1;
    expect(go(aim(m), m, ['How?', '(Go on.)', 'That grate is how they breathe.']).view()!.text).toContain('I keep them');
    const p = game('choir', { companions: { tamsin: 'waiting' }, origin: 'pump_hand' });
    const rp = go(aim(p), p, ['How?']);
    expect(rp.view()!.passives.map((x) => x.text).join(' ')).toContain('the Cistern\'s intake');
  });

  it('not once the reserve is out of the door; still while it is sealed again', () => {
    const a = game('prepared');
    hour(a.g, 23);
    a.g.flags.a3_c9 = 'sealed';
    expect(UW_IDS(a.g)).toHaveLength(3);
    a.g.flags.a3_c9 = 'opened';
    expect(UW_IDS(a.g)).toEqual([]);
    a.g.flags.a3_c9 = 'relocated';
    expect(UW_IDS(a.g)).toEqual([]);
  });
});

// ---------------------------------------------------------------- the four answers

describe('B6g: the Unwritten answered', () => {
  it('turned to the city\'s book (Speech 50, the plan\'s modifiers): with you, gone from Knock, and B\'s and D\'s keys held', () => {
    const a = game('hostile', { companions: { tamsin: 'party' } });
    expect(cond(B_MEANS, a.g)).toBe(false);
    expect(cond(D_PEOPLE, a.g)).toBe(false);
    const r = aim(a);
    // hostile: the poisoner given to the cellar −10, the verdict refused (not agreed): DC 40
    const o = r.view()!.options.find((x) => x.text.startsWith('Burn the real count'))!;
    expect(o.checkLabel).toBe('Speech 40');
    eff(a.g, 'speech', 40);
    go(r, a, ['Burn the real count']);
    expect(a.g.flags.a3_unwritten).toBe('with_you');
    expect(a.g.flags.a3_uw_how).toBe('core');
    expect(r.view()!.text).toContain('We\'ll come east');
    expect(status(a.g, 'q_a3_unwritten')).toBe('done');
    expect(stage(a.g, 'q_a3_unwritten')).toBe('with_you');
    expect(cond(B_MEANS, a.g)).toBe(true);
    expect(cond(D_PEOPLE, a.g)).toBe(true);
    hour(a.g, 23);
    expect(UW_IDS(a.g)).toEqual([]);
  });

  it('the modifiers: Ash with his orders burned, the rite, Larkspur, the turn, Rhoda, the Long Night; the verdict agreed costs', () => {
    const a = game('prepared', { companions: { ash: 'party', nine: 'waiting' }, origin: 'door_watch', flags: { ln_petra_down: true } });
    const r = turned(a);
    // 50 −15 Ash −10 rite −5 Larkspur −5 turn −5 her word kept = 10
    expect(r.view()!.options.find((x) => x.text.startsWith('Burn the real count'))!.checkLabel).toBe('Speech 10');
    const b = game('prepared', { flags: { ln_petra_taken: true, ar_verdict: 'agreed' } });
    // 50 −10 rite +10 shouted for the riders +10 agreed = 60
    expect(aim(b).view()!.options.find((x) => x.text.startsWith('Burn the real count'))!.checkLabel).toBe('Speech 60');
    expect(talk('d_a3_petra', b.g, b.q, ['The Long Night.']).view()!.text).toContain('You shouted');
    // with Petra dead, her own history does not count
    const c = game('prepared', { flags: { ln_petra_taken: true } });
    kill(c.g, 'npc_of_02');
    expect(aim(c).view()!.options.find((x) => x.text.startsWith('Burn the real count'))!.checkLabel).toBe('Speech 40');
    expect(opts('d_a3_petra', c)).not.toContain('The Long Night.');
    expect(opts('d_a3_petra', c)).toContain('Petra.');
  });

  it('a failed word is spent; the other ways stay; Rhoda setting the oil aside lowers them', () => {
    const a = game('choir', { companions: { tamsin: 'waiting' } });
    eff(a.g, 'speech', 20);
    const r = aim(a);
    go(r, a, ['Burn the real count']);
    expect(r.view()!.text).toContain('We came for this door');
    expect(a.g.flags.a3_unwritten).toBeUndefined();
    go(r, a, ['(Go on.)']);
    const left = r.view()!.options.map((o) => o.text);
    expect(left.some((t) => t.startsWith('Burn the real count'))).toBe(false);
    for (const t of ['Go home.', '(Leave them. Come back in the dark', 'I won\'t stand in your way.', '(Draw on them.)']) expect(left.some((x) => x.startsWith(t)), t).toBe(true);
    // the turn heard, then Rhoda
    go(r, a, ['How?', '(Go on.)', 'That grate is how they breathe.', '(Go on.)']);
    const before = r.view()!.options.find((x) => x.text.startsWith('Go home.'))!.checkLabel;
    talk('d_a3_rhoda', a.g, a.q, ['(Go on.)', 'You came to burn paper.']);
    expect(a.g.flags.a3_uw_rhoda).toBe(true);
    const after = view('d_a3_petra', a.g, a.q).options.find((x) => x.text.startsWith('Go home.'))!.checkLabel;
    expect(Number(after.split(' ')[1])).toBe(Number(before.split(' ')[1]) - 10);
    expect(view('d_a3_rhoda', a.g, a.q).text).toContain('an arm\'s length away');
  });

  it('sent home (Speech 40): gone, and Openfield\'s state moves the word', () => {
    const a = game('choir', { companions: { tamsin: 'waiting' } });
    eff(a.g, 'speech', 40);
    const r = turned(a);
    // choir strong: Openfield stands, Mason at home −5, the turn −10: DC 25
    expect(r.view()!.options.find((x) => x.text.startsWith('Go home.'))!.checkLabel).toBe('Speech 25');
    go(r, a, ['Go home.']);
    expect(a.g.flags.a3_unwritten).toBe('gone');
    expect(stage(a.g, 'q_a3_unwritten')).toBe('gone');
    const b = game('choir', { band: 'thin', companions: { tamsin: 'waiting' } });
    // Openfield burned: home is ash +10
    expect(aim(b).view()!.options.find((x) => x.text.startsWith('Go home.'))!.checkLabel).toBe('Speech 50');
    expect(talk('d_a3_petra', b.g, b.q, ['Your father.']).view()!.text).toContain('Under a cairn');
  });

  it('the lamp and the oil lifted in the dark (Stealth 45): stopped; one try, and a failure leaves the others', () => {
    const a = game('prepared');
    eff(a.g, 'stealth', 45);
    go(aim(a), a, ['(Leave them. Come back in the dark']);
    expect(a.g.flags.a3_unwritten).toBe('stopped');
    expect(a.g.flags.a3_uw_how).toBe('lamp');
    expect(stage(a.g, 'q_a3_unwritten')).toBe('stopped');
    const b = game('prepared');
    eff(b.g, 'stealth', 30);
    const r = go(aim(b), b, ['(Leave them. Come back in the dark']);
    expect(r.view()!.text).toContain('"No," she says');
    expect(b.g.flags.a3_uw_watched).toBe(true);
    expect(b.g.flags.a3_unwritten).toBeUndefined();
    go(r, b, ['(Go on.)']);
    expect(r.view()!.options.some((o) => o.text.startsWith('(Leave them. Come back'))).toBe(false);
    expect(r.view()!.options.some((o) => o.text.startsWith('(Draw on them.)'))).toBe(true);
  });

  it('drawn on: Petra and the two turn hostile and stay placed at any hour until they are down; then stopped, and gone', () => {
    const a = game('prepared');
    const r = aim(a);
    go(r, a, ['(Draw on them.)']);
    expect(a.g.flags.a3_uw_fight).toBeUndefined();
    go(r, a, ['(Not like this.)']);
    go(r, a, ['(Draw on them.)', '(Draw.)']);
    expect(a.g.flags.a3_uw_fight).toBe('petra');
    for (const id of ['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']) expect(cond(NPCS[id].hostileIf, a.g), id).toBe(true);
    expect(cond(NPCS.npc_a3_u1.hostileIf, a.g)).toBe(true);
    hour(a.g, 6);
    expect(UW_IDS(a.g)).toEqual(['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']);
    kill(a.g, 'npc_of_02');
    // nobody steps into a fallen leader's place mid-fight
    expect(UW_IDS(a.g)).toEqual(['npc_a3_u2', 'npc_a3_u3']);
    step(a);
    expect(a.g.flags.a3_unwritten).toBeUndefined();
    kill(a.g, 'npc_a3_u2'); kill(a.g, 'npc_a3_u3');
    step(a);
    expect(a.g.flags.a3_unwritten).toBe('stopped');
    expect(a.g.flags.a3_uw_how).toBe('fought');
    expect(stage(a.g, 'q_a3_unwritten')).toBe('stopped');
    for (const id of ['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']) expect(cond(NPCS[id].hostileIf, a.g), id).toBe(false);
    hour(a.g, 23);
    expect(UW_IDS(a.g)).toEqual([]);
    // Juniper's fight: she leads it, and its end reads her
    const b = game('prepared');
    kill(b.g, 'npc_of_02');
    go(aim(b), b, ['(Draw on them.)', '(Draw.)']);
    expect(b.g.flags.a3_uw_fight).toBe('juniper');
    for (const id of ['npc_a3_u1', 'npc_a3_u2', 'npc_a3_u3']) kill(b.g, id);
    step(b);
    expect(b.g.flags.a3_unwritten).toBe('stopped');
  });

  it('let go down the grate: confirmed to her face; burning only the next time the clock passes two with the player at Knock', () => {
    const a = game('prepared');
    const r = aim(a);
    go(r, a, ['I won\'t stand in your way.']);
    expect(r.view()!.text).toContain('Say it to my face');
    go(r, a, ['No. Not yet.']);
    expect(a.g.flags.a3_unwritten).toBeUndefined();
    go(r, a, ['I won\'t stand in your way.', 'Burn it.']);
    expect(a.g.flags.a3_unwritten).toBe('burning');
    expect(status(a.g, 'q_a3_unwritten')).toBe('failed');
    expect(view('d_a3_petra', a.g, a.q).text).toContain('You\'re on it');
    // away from Knock the night passes and nothing burns; back at Knock by day, nothing yet
    expect(waitFor(a.g, a.q, 'shale', 2)).not.toContain('a3_burning');
    expect(waitFor(a.g, a.q, 'shale', 3)).not.toContain('a3_burning');
    expect(waitFor(a.g, a.q, 'c9_mouth', 11)).not.toContain('a3_burning');
    hour(a.g, 23);
    expect(UW_IDS(a.g)).toEqual(['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']);
    expect(waitFor(a.g, a.q, 'c9_mouth', 2)).toContain('a3_burning');
    expect(a.g.minutes % 1440).toBe(2 * 60);
    expect(a.g.flags.a3_mother).toBe('burned');
    expect(a.g.flags.a3_archive).toBe('burned');
    expect(opened(a.events)).toContain('d_a3_burning');
    hour(a.g, 23);
    expect(UW_IDS(a.g)).toEqual([]);
    expect(A3_EVENTS.a3_burning.at).toEqual({ hour: 2, where: 'c9_mouth' });
  });

  it('a save with the burning promised keeps it, and it still waits for the player at Knock', async () => {
    const a = game('prepared');
    go(aim(a), a, ['I won\'t stand in your way.', 'Burn it.']);
    const b = await saveAndLoad(a.g);
    expect(b.g.flags.a3_unwritten).toBe('burning');
    expect(waitFor(b.g, b.q, 'c9_mouth', 2)).toContain('a3_burning');
    expect(b.g.flags.a3_mother).toBe('burned');
  });

  it('the Grille after the fire is dark: Pell (or Tamsin, still inside) on the hand pump; before it, MOTHER\'s lockdown', () => {
    const a = game('prepared');
    expect(new DialogueRunner(DIALOGUES.d_a3_grille, a.g, a.q).node).not.toBe('a3_burned');
    a.g.flags.a3_mother = 'burned';
    const v = view('d_a3_grille', a.g, a.q);
    expect(v.speaker).toBe('npc_c9_02');
    expect(v.text).toContain('hand pump');
    talk('d_a3_grille', a.g, a.q, ['I let them.']);
    expect(a.g.world.memories.npc_c9_02.some((m) => m.tag === 'a3_told_burning')).toBe(true);
    const b = game('prepared', { companions: { tamsin: 'inside' } });
    b.g.flags.a3_mother = 'burned';
    expect(view('d_a3_grille', b.g, b.q).text).toContain('Don\'t say blue');
    for (const id of Object.keys(GRILLE_BURNED_NODES)) expect(DIALOGUES.d_kn_grille.nodes[id], id).toBeUndefined();
  });
});

// ---------------------------------------------------------------- Factor Orme's paper

describe('B6g: Orme\'s paper, only with the guild in play', () => {
  it('without the guild: the stand and its trade, no folder', () => {
    const a = game('choir');
    expect(cond(GUILD_IN_PLAY, a.g)).toBe(false);
    const o = opts('d_a3_orme', a);
    expect(o).toContain('What are you selling? (Trade)');
    expect(o).not.toContain('What\'s in the folder?');
  });

  it('read, asked about, taken (the item, paper_held), given back (refused), and taken again', () => {
    const a = game('guild', { knows: ['a3_lowe_guild'] });
    const r = talk('d_a3_orme', a.g, a.q, ['What\'s in the folder?']);
    expect(r.view()!.text).toContain('forty Tolls a head');
    go(r, a, ['(Go on.)', 'Who signs it?', '(Go on.)', 'What do you get out of it?', '(Go on.)', 'Captain Lowe says he hasn\'t read it.']);
    expect(r.view()!.text).toContain('Everything on this slope waits for you');
    go(r, a, ['(Go on.)', 'Give me the paper.']);
    expect(has(a.g, 'k_a3_intake')).toBe(true);
    expect(a.g.flags.a3_guild).toBe('paper_held');
    go(r, a, ['(Go on.)', '(Put the folder back on her counter.)']);
    expect(has(a.g, 'k_a3_intake')).toBe(false);
    expect(a.g.flags.a3_guild).toBe('refused');
    go(r, a, ['(Go on.)', 'Give me the paper.']);
    expect(a.g.flags.a3_guild).toBe('paper_held');
  });

  it('refused to her face; torn on her counter (final: never offered again)', () => {
    const a = game('guild');
    talk('d_a3_orme', a.g, a.q, ['What\'s in the folder?', '(Go on.)', 'Put it away.']);
    expect(a.g.flags.a3_guild).toBe('refused');
    expect(a.g.world.memories.npc_kn_factor.some((m) => m.tag === 'a3_paper_refused')).toBe(true);
    const b = game('guild');
    talk('d_a3_orme', b.g, b.q, ['What\'s in the folder?', '(Go on.)', 'Give me the paper.', '(Go on.)', '(Take the folder out of your pack']);
    expect(has(b.g, 'k_a3_intake')).toBe(false);
    expect(b.g.flags.a3_guild).toBe('refused');
    expect(b.g.flags.a3_guild_torn).toBe(true);
    const o = opts('d_a3_orme', b);
    expect(o.some((t) => t.startsWith('Give me the paper.') || t.startsWith('(Take it off her counter'))).toBe(false);
  });

  it('the debt for Linnet called in: carry it, and square', () => {
    const a = game('guild', { flags: { kn_owes_orme: true } });
    talk('d_a3_orme', a.g, a.q, ['What\'s in the folder?', '(Go on.)', 'You said I\'d owe you, for Linnet.', 'Done. Give it here.']);
    expect(a.g.flags.a3_guild).toBe('paper_held');
    expect(a.g.flags.kn_owes_orme).toBe(false);
    expect(opt('d_a3_orme', a, 'You said I\'d owe you')).toBeUndefined();
  });
});

// ---------------------------------------------------------------- Brannick Hale and Maud's judgement

describe('B6g: Hale, only while he lives; Maud decides', () => {
  function hale(over: Over = {}): Game {
    const a = game('guild', over);
    a.g.flags.a3_guild_in = true;
    return a;
  }
  it('placed with the guild while alive; never once dead (the opening\'s fight or this one)', () => {
    const a = hale();
    expect(here(a.g)).toContain('npc_kn_out_lead_a3');
    const b = hale({ flags: { kn_out_choice: 'fought' } });
    (b.g.npcs as Record<string, unknown>)['c9_mouth/npc_kn_out_lead'] = { dead: true };
    expect(cond(HALE_HERE, b.g)).toBe(false);
    expect(here(b.g)).not.toContain('npc_kn_out_lead_a3');
    const c = game('choir');
    expect(here(c.g)).not.toContain('npc_kn_out_lead_a3');
  });

  it('his first words read how the outriders went in the opening', () => {
    const cases: [string, string][] = [['gave', 'You gave me a book once'], ['lied', 'buried with his things'], ['caught', 'Carrow found the book'], ['hid', 'in your boot'], ['beaten', 'Corin missed']];
    for (const [how, cue] of cases) {
      const h = hale({ flags: { kn_out_choice: how } });
      expect(view('d_a3_hale', h.g, h.q).text, how).toContain(cue);
    }
    const a = hale();
    const r = talk('d_a3_hale', a.g, a.q, ['(Go on.)', 'What are you here for?', '(Go on.)', 'What is the Weighhouse?']);
    expect(r.view()!.text).toContain('fulfilled');
    expect(a.g.world.knowledge.a3_weighhouse).toBe(true);
    expect(opts('d_a3_hale', a)).not.toContain('(Take him down the lane to Maud.)');
  });

  type Case = [string, Over, string, string];
  const cases: Case[] = [
    ['answer, Maud whole', {}, 'Let him answer for it.', 'answered'],
    ['send off, nothing told', {}, 'Send him off the slope.', 'gone'],
    ['hers, trust low', {}, 'It\'s yours to say, Maud.', 'gone'],
    ['hers, trust high', { trust: { npc_kn_maud: 25 } }, 'It\'s yours to say, Maud.', 'answered'],
    ['answer, Maud lame', { flags: { kn_maud_saved: false, kn_maud_scarred: true } }, 'Let him answer for it.', 'gone'],
    ['send off, her letter told', { flags: { a3_maud: 'forgiven' } }, 'Send him off the slope.', 'answered'],
    ['answer, lame but her letter told', { flags: { kn_maud_saved: false, kn_maud_scarred: true, a3_maud: 'told' } }, 'Let him answer for it.', 'answered'],
  ];
  for (const [tag, over, pick, out] of cases) {
    it(`Maud's judgement: ${tag} → ${out}`, () => {
      const a = hale(over);
      talk('d_a3_hale', a.g, a.q, ['(Go on.)', 'The post-house.', '(Go on.)', '(Take him down the lane to Maud.)', pick]);
      expect(a.g.flags.a3_hale).toBe(out);
      const now = here(a.g);
      expect(now.includes('npc_kn_out_lead_boards'), tag).toBe(out === 'answered');
      expect(now.includes('npc_kn_out_lead_a3'), tag).toBe(false);
      if (out === 'answered') {
        expect(a.g.world.memories.npc_kn_maud.some((m) => m.tag === 'a3_judged_hale')).toBe(true);
        expect(view('d_a3_hale', a.g, a.q).text).toContain('new frame with a hammer');
        expect(opts('d_a3_hale', a)).not.toContain('(Draw on him.)');
      }
    });
  }

  it('drawn on: hostile until he is down, then dead and never placed again', () => {
    const a = hale({ flags: { kn_out_choice: 'gave', kn_out_fight: false } });
    expect(cond(NPCS.npc_kn_out_lead.hostileIf, a.g)).toBe(false);
    talk('d_a3_hale', a.g, a.q, ['(Go on.)', '(Draw on him.)', '(Draw.)']);
    expect(a.g.flags.a3_hale_fight).toBe(true);
    expect(cond(NPCS.npc_kn_out_lead.hostileIf, a.g)).toBe(true);
    step(a);
    expect(a.g.flags.a3_hale).toBeUndefined();
    kill(a.g, 'npc_kn_out_lead_a3');
    step(a);
    expect(a.g.flags.a3_hale).toBe('dead');
    expect(cond(NPCS.npc_kn_out_lead.hostileIf, a.g)).toBe(false);
    expect(here(a.g)).not.toContain('npc_kn_out_lead_a3');
    expect(here(a.g)).not.toContain('npc_kn_out_lead_boards');
  });

  it('the opening\'s fight is unchanged: hostile only while it lasts', () => {
    const { g } = actThree('prepared');
    g.flags.kn_out_fight = true;
    expect(cond(NPCS.npc_kn_out_lead.hostileIf, g)).toBe(true);
    g.flags.kn_out_beaten = true;
    expect(cond(NPCS.npc_kn_out_lead.hostileIf, g)).toBe(false);
  });
});

// ---------------------------------------------------------------- the handlers, the trees, the content

describe('B6g: the handlers, the trees and the content', () => {
  it('the handlers speak with the hounds; their tree says what the hounds are for', () => {
    const a = game('guild');
    a.g.flags.a3_hounds_in = true;
    expect(here(a.g)).toContain('npc_a3_g11');
    expect(NPCS.npc_a3_g11.dialogue).toBe('d_a3_handlers');
    expect(NPCS.npc_a3_g12.dialogue).toBe('d_a3_handlers');
    const r = talk('d_a3_handlers', a.g, a.q, ['(Go on.)', 'What are they for, here?']);
    expect(r.view()!.text).toContain('sixty people walk up that road');
  });

  it('Thaddeus and Rhoda have their own trees', () => {
    expect(NPCS.npc_a3_u2.dialogue).toBe('d_a3_thaddeus');
    expect(NPCS.npc_a3_u3.dialogue).toBe('d_a3_rhoda');
    const a = game('prepared');
    hour(a.g, 22);
    expect(talk('d_a3_thaddeus', a.g, a.q, ['(Go on.)', 'Who are you?']).view()!.text).toContain('supply lines');
    expect(talk('d_a3_rhoda', a.g, a.q, ['(Go on.)', 'What did you do, before?']).view()!.text).toContain('Printed faces');
  });

  it('every node has a line for coming back to it (U7), or only leaves; all seven companions speak', () => {
    const speakers = new Set<string>();
    let nodes = 0;
    const trees = [...A3_FORCES_DIALOGUES.map((d) => Object.entries(d.nodes).map(([k, n]) => [`${d.id}/${k}`, n] as const)).flat(), ...Object.entries(GRILLE_BURNED_NODES).map(([k, n]) => [`grille/${k}`, n] as const)];
    for (const [key, n] of trees) {
      nodes++;
      if (!n.options.every((o) => o.exit)) expect(n.again, key).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    }
    expect(nodes).toBeGreaterThanOrEqual(70);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
  });

  it('the opening is untouched: none of B6g\'s people or triggers before Act 3', () => {
    const g = actThree('prepared', { point: 'eve' }).g;
    g.locationId = 'c9_mouth';
    hour(g, 23);
    expect(here(g).filter((id) => /npc_of_02|npc_a3_u|npc_kn_out_lead_(a3|boards)/.test(id))).toEqual([]);
    for (const t of ['a3_chalk', 'a3_uw_after', 'a3_hale_after']) expect(cond(trig(t).if, g), t).toBe(false);
  });

  it('the content validates', () => {
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|c9_mouth|openfield|npc_kn_|npc_of_02|Lowry|Wolde|Kalder|Wilmot|Nkemelu|Weighhouse/.test(e))).toEqual([]);
    expect(ITEMS.k_a3_intake.name).toBe('Weighhouse Intake');
  });
});
