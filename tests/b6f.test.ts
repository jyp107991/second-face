import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_FORCES_DIALOGUES } from '../src/content/dialogue/a3_forces';
import { A3_KNOCK_DIALOGUES } from '../src/content/dialogue/a3_knock';
import { A3_KNOCK_NPCS } from '../src/content/npcs/a3_knock';
import {
  GUILD_IN_PLAY, HOUNDS_IN_PLAY, KNOCK_WATER, KNOCK_WATERED, LINNET_AT, LINNET_COLUMN, LINNET_DOGS, LINNET_KNOCK, LOWE, ORDER_READ, REYES, TAMSIN, modValue,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { skill } from '../src/engine/stats/sheet';
import type { SkillId } from '../src/engine/stats/rules';
import { apply, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, at, has, hour, saveAndLoad, stage, status, talk, view, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6f — Knock under the column: the home hamlet in Act 3. The opening's placements step aside and their Act 3 selves take
 * their places (Maud at the hatch, Linnet by her fate, Dace, Corin on the slope, Orme, Knock's others); the column camps
 * opposite the stand under Lowe or Reyes; the guild's party and its hounds by what Acts 1–2 left; the Unwritten by night;
 * the first walk home whatever brought the player; the trees (Maud's secret, the water, Lowe's clause and its gates, the
 * Grille in lockdown). Played headless with the shared Act 3 fixture.
 */

interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[] };
function game(preset: Preset, over: Over = {}): Game {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  const a = { ...actThree(preset, { ...over, host }), events };
  a.g.pc.sheet.name = 'Halden';
  return a;
}
const MAP = () => MAPS.c9_mouth;
/** Who stands on Knock's map in this state (placement ids). */
const here = (g: G) => MAP().npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const kill = (g: G, id: string) => { (g.npcs as Record<string, unknown>)[`c9_mouth/${id}`] = { dead: true }; };
const trig = (id: string) => MAP().triggers!.find((t) => t.id === id)!;
const opened = (events: Ev[]) => events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
/** Walk into the north half of Knock: every Act 3 trigger there whose condition holds fires, once, in the map's order. */
function arrive(a: Game): void {
  a.g.locationId = 'c9_mouth';
  for (const t of MAP().triggers!.filter((x) => ['a3_guild', 'a3_hounds', 'a3_arrive', 'a3_camp'].includes(x.id))) {
    const key = `trigger:c9_mouth/${t.id}`;
    if (a.g.flags[key] || !cond(t.if, a.g)) continue;
    a.g.flags[key] = true;
    apply(t.effects, a.g, a.q);
  }
  a.q.update();
}
function go(r: DialogueRunner, a: A3, picks: string[]): DialogueRunner {
  for (const p of picks) {
    const o = r.view()?.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`no option "${p}" in [${r.view()?.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
  return r;
}
const opts = (id: string, a: A3) => view(id, a.g, a.q).options.map((o) => o.text);
const trust = (g: G, npc: string) => g.world.relations[npc]?.trust ?? 0;
const appr = (g: G, npc: string) => g.world.approval[npc] ?? 0;
/** Set a skill's effective value (the fixture's numbers are points bought over the attributes' base). */
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}

const ACT1 = ['npc_kn_maud', 'npc_kn_linnet', 'npc_kn_dace', 'npc_kn_corin', 'npc_kn_factor', 'npc_kn_r1', 'npc_kn_r2', 'npc_kn_r3', 'npc_kn_r4'];
const ACT3_KNOCK = ['npc_kn_maud_a3', 'npc_kn_corin_a3', 'npc_kn_factor_a3', 'npc_kn_r1_a3', 'npc_kn_r2_a3', 'npc_kn_r3_a3', 'npc_kn_r4_a3'];
const WARDENS = ['npc_a3_g3', 'npc_a3_g4', 'npc_a3_g5', 'npc_a3_g6'];

// ---------------------------------------------------------------- the opening is untouched; Act 3 takes its places

describe('B6f: Knock before Act 3 is as the opening left it; in Act 3 its people stand where Act 3 puts them', () => {
  it('before the order nobody from Act 3 is placed, and the opening\'s people are', () => {
    const { g } = at('c9_mouth', 10);
    const now = here(g);
    for (const id of ACT1) expect(now, id).toContain(id);
    for (const id of [...ACT3_KNOCK, ...WARDENS, 'npc_md_01', 'npc_md_12', 'npc_kn_out_lead_a3', 'npc_a3_g11', 'npc_a3_g12', 'npc_of_02', 'npc_a3_u1', 'npc_a3_u2', 'npc_a3_u3']) expect(now, id).not.toContain(id);
    for (const t of ['a3_guild', 'a3_hounds', 'a3_arrive', 'a3_camp']) expect(cond(trig(t).if, g), t).toBe(false);
  });

  it('the Grille before Act 3 is the opening\'s Grille, node for node', () => {
    const states: Record<string, unknown>[] = [{}, { kn_night: true }, { kn_maud_hurt: true }, { kn_free_to_leave: true }, { kn_free_to_leave: true, tam_out: true }, { kn_free_to_leave: true, kn_tamsin_farewell: true }];
    for (const flags of states) {
      const { g, q } = at('c9_mouth', 10);
      Object.assign(g.flags, flags);
      const a = new DialogueRunner(DIALOGUES.d_a3_grille, g, q), b = new DialogueRunner(DIALOGUES.d_kn_grille, g, q);
      expect(a.node, JSON.stringify(flags)).toBe(b.node);
      expect(a.view()!.text).toBe(b.view()!.text);
      expect(a.view()!.options.map((o) => o.text)).toEqual(b.view()!.options.map((o) => o.text));
    }
    expect(MAP().talk!.grille.dialogue).toBe('d_a3_grille');
  });

  it('once Act 3 is open the opening\'s people step aside and their Act 3 selves, the column and its captain take their places', () => {
    const a = game('prepared');
    const now = here(a.g);
    for (const id of ACT1) expect(now, id).not.toContain(id);
    for (const id of [...ACT3_KNOCK, ...WARDENS, 'npc_md_01']) expect(now, id).toContain(id);
    expect(now).not.toContain('npc_md_12');
    const p = MAP().npcs!.find((x) => x.id === 'npc_kn_maud_a3')!;
    expect(p.dialogue).toBe('d_a3_maud');
    // the column leaves with the door settled (B6j and B6k say where it goes)
    a.g.flags.a3_c9 = 'sealed';
    for (const id of [...WARDENS, 'npc_md_01']) expect(here(a.g), id).not.toContain(id);
    expect(here(a.g)).toContain('npc_kn_maud_a3');
  });
});

// ---------------------------------------------------------------- the first walk home

describe('B6f: home, however the player came', () => {
  it('walking in after the order is read sets the player home and opens the scene; before it, nothing', () => {
    const early = game('truce', { point: 'open' });
    expect(cond(trig('a3_arrive').if, early.g)).toBe(false);
    const a = game('truce');
    expect(stage(a.g, 'q_a3_return')).toBe('west');
    arrive(a);
    expect(a.g.flags.a3_at_knock).toBe(true);
    expect(a.g.flags.a3_in_sallow).toBe(true);
    expect(opened(a.events)).toEqual(['d_a3_home']);
    expect(status(a.g, 'q_a3_return')).toBe('done');
    expect(stage(a.g, 'q_a3_cistern')).toBe('knock');
    expect(view('d_a3_home', a.g, a.q).text).toContain('on your own feet');
    // walking on does not open it again
    arrive(a);
    expect(opened(a.events)).toEqual(['d_a3_home']);
  });

  it('the scene plays whether or not the road\'s own arrival has fired, and reads how the player came', () => {
    const cases: [string, string][] = [['column', 'sixty benches'], ['first', 'guild\'s road coach'], ['carts', 'Choir\'s carts'], ['buggy', 'buggy ticking'], ['wheel', 'Wheel\'s tracks']];
    for (const [how, cue] of cases) {
      const a = game('truce', { flags: { a3_route_home: how, a3_at_knock: true } });
      arrive(a);
      expect(opened(a.events), how).toEqual(['d_a3_home']);
      expect(view('d_a3_home', a.g, a.q).text, how).toContain(cue);
    }
    // B6c's own world event at Knock (midnight, on foot) first: the walk in still plays the scene
    const w = game('truce');
    waitFor(w.g, w.q, 'c9_mouth', 1);
    expect(w.g.flags.a3_at_knock).toBe(true);
    expect(w.g.flags.a3_route_home).toBe('foot');
    arrive(w);
    expect(opened(w.events)).toEqual(['d_a3_home']);
  });

  it('Knock\'s water on arrival: Dry Wells\' carts, Openfield\'s barrels, or a queue at Corin\'s well', () => {
    const dw = game('prepared');
    expect(view('d_a3_home', dw.g, dw.q).text).toContain('cart from Dry Wells');
    const carts = game('hostile', { flags: { a3_carts_water: true } });
    expect(view('d_a3_home', carts.g, carts.q).text).toContain('open eye painted');
    expect(view('d_a3_home', dw.g, dw.q).text).toContain('starts to clap');
    const dry = game('hostile', { standing: { cistern9: -25 } });
    expect(view('d_a3_home', dry.g, dry.q).text).toContain('queue at Corin\'s well');
    expect(view('d_a3_home', dry.g, dry.q).text).toContain('some of the doors close');
    expect(modValue(dry.g, KNOCK_WATER)).toBe('ration');
    expect(cond(KNOCK_WATERED, dry.g)).toBe(false);
  });

  it('the guild and its hounds are in play by what Acts 1–2 left; the map\'s conditions agree with the shared ones', () => {
    const cases: [Preset, Over, boolean, boolean][] = [
      ['guild', {}, true, true], ['choir', {}, false, false], ['ledger', {}, false, false], ['truce', {}, false, false],
      ['prepared', {}, false, false], ['prepared', { b4b: true }, true, false], ['hostile', {}, true, true], ['choir', { flags: { rc_line: 'guild' } }, true, false],
      ['truce', { flags: { rc_line: 'guild', an_reserve: 'concern' } }, true, true],
    ];
    for (const [preset, over, guild, hounds] of cases) {
      const a = game(preset, over);
      const tag = `${preset} ${JSON.stringify(over)}`;
      expect(cond(GUILD_IN_PLAY, a.g), tag).toBe(guild);
      expect(cond(HOUNDS_IN_PLAY, a.g), tag).toBe(hounds);
      expect(cond(trig('a3_guild').if, a.g), tag).toBe(cond({ all: [ORDER_READ, GUILD_IN_PLAY] }, a.g));
      expect(cond(trig('a3_hounds').if, a.g), tag).toBe(cond({ all: [ORDER_READ, HOUNDS_IN_PLAY] }, a.g));
      arrive(a);
      expect(!!a.g.flags.a3_guild_in, tag).toBe(guild);
      expect(!!a.g.flags.a3_hounds_in, tag).toBe(hounds);
      const now = here(a.g);
      expect(now.includes('npc_kn_out_lead_a3'), tag).toBe(guild);
      expect(now.includes('npc_a3_g11') && now.includes('npc_a3_g12'), tag).toBe(hounds);
      expect(now.includes('npc_kn_dace_guild'), tag).toBe(guild);
      expect(now.includes('npc_kn_dace_a3'), tag).toBe(!guild);
      if (hounds) expect(view('d_a3_home', a.g, a.q).text, tag).toContain('short leads');
    }
  });

  it('Hale only while he lives and is not sent off; Orme at her stand while she lives', () => {
    const a = game('guild');
    arrive(a);
    expect(here(a.g)).toContain('npc_kn_out_lead_a3');
    a.g.flags.a3_hale = 'gone';
    expect(here(a.g)).not.toContain('npc_kn_out_lead_a3');
    const b = game('guild');
    arrive(b);
    (b.g.npcs as Record<string, unknown>)['tollhouse/npc_kn_out_lead'] = { dead: true };
    expect(here(b.g)).not.toContain('npc_kn_out_lead_a3');
    expect(here(b.g)).toContain('npc_kn_factor_a3');
    kill(b.g, 'npc_kn_factor_a3');
    expect(here(b.g)).not.toContain('npc_kn_factor_a3');
  });
});

// ---------------------------------------------------------------- Linnet, by her fate

describe('B6f: Linnet stands where her fate put her', () => {
  const FATES: [string, Preset, Record<string, unknown>, string, string | null][] = [
    ['ran to the city', 'hostile', {}, 'column', 'npc_kn_linnet_column'],
    ['taken to Shale', 'choir', {}, 'shale', null],
    ['taken to Shale, the Dogs called', 'choir', { a3_ally_dogs: true }, 'dogs', 'npc_kn_linnet_dogs'],
    ['stayed', 'prepared', {}, 'knock', 'npc_kn_linnet_a3'],
    ['never asked', 'choir', { kn_linnet_to_shale: false }, 'knock', 'npc_kn_linnet_a3'],
  ];
  it('placements by every fate, and the map\'s conditions agree with the shared ones', () => {
    const LIN = ['npc_kn_linnet_a3', 'npc_kn_linnet_column', 'npc_kn_linnet_dogs'];
    const mirror: [string, Cond][] = [['npc_kn_linnet_a3', LINNET_KNOCK], ['npc_kn_linnet_column', LINNET_COLUMN], ['npc_kn_linnet_dogs', LINNET_DOGS]];
    for (const [fate, preset, flags, at3, placedAs] of FATES) {
      const a = game(preset, { flags: flags as Over['flags'] });
      expect(modValue(a.g, LINNET_AT), fate).toBe(at3);
      expect(here(a.g).filter((id) => LIN.includes(id)), fate).toEqual(placedAs ? [placedAs] : []);
      for (const [id, c] of mirror) expect(cond(MAP().npcs!.find((p) => p.id === id)!.if, a.g), `${fate} ${id}`).toBe(cond(c, a.g));
    }
  });

  it('the cadet: met in the column; the driving if she drove; to Maud\'s; standing down brings her home; or she stays for Knock', () => {
    const a = game('hostile', { flags: { a3_route_home: 'column' }, skills: { speech: 50 } });
    const r = talk('d_a3_linnet', a.g, a.q);
    expect(r.view()!.text).toContain('Don\'t say anything about the driving');
    expect(a.g.flags.a3_linnet).toBe('column');
    go(r, a, ['(Go on.)', 'Why the city, Lin?', '(Go on.)']);
    expect(r.view()!.options.map((o) => o.text)).not.toContain('Why the city, Lin?');
    // hostile: Linnet let the buyer beat her? not in this history; the plain check at 35 passes on 50
    go(r, a, ['Go and see Maud.']);
    expect(a.g.flags.a3_linnet_maud).toBe(true);
    expect(trust(a.g, 'npc_kn_maud')).toBe(5);
    const b = game('hostile', { skills: { speech: 50 } });
    talk('d_a3_lowe', b.g, b.q, ['(Go on.)', 'Linnet Ferrow is in your column.']);
    expect(b.g.world.knowledge.a3_cadet_charter).toBe(true);
    talk('d_a3_linnet', b.g, b.q, ['(Go on.)', 'You could stand down.']);
    expect(b.g.flags.a3_linnet_down).toBe(true);
    expect(b.g.flags.a3_linnet).toBe('knock');
    expect(modValue(b.g, LINNET_AT)).toBe('knock');
    expect(here(b.g)).toContain('npc_kn_linnet_a3');
    expect(here(b.g)).not.toContain('npc_kn_linnet_column');
    expect(view('d_a3_linnet', b.g, b.q).text).toContain('own shirt again');
    expect(opts('d_a3_maud', b) .length).toBeGreaterThan(0);
    const c = game('hostile');
    eff(c.g, 'speech', 30);
    const s = talk('d_a3_linnet', c.g, c.q, ['(Go on.)', 'You could stand down.']);
    expect(s.view()!.text).toContain('seeing it through');
    expect(c.g.flags.a3_linnet_down).toBeUndefined();
    go(s, c, ['(Go on.)', 'Stay with the column, Lin.']);
    expect(c.g.flags.a3_linnet_stay).toBe(true);
    expect(c.g.world.memories.npc_kn_linnet.some((m) => m.tag === 'a3_trusted')).toBe(true);
  });

  it('with the Dogs; at Mags\'s; at home with her yoke and what comes after', () => {
    const d = game('choir', { flags: { a3_ally_dogs: true } });
    expect(talk('d_a3_linnet', d.g, d.q).view()!.text).toContain('red rag');
    expect(d.g.flags.a3_linnet).toBe('dogs');
    const s = game('choir');
    expect(talk('d_a3_linnet', s.g, s.q).view()!.text).toContain('Mags\'s bar');
    // she was met at Mags's, then the Dogs were called: she rides in with them, and is met again
    s.g.flags.a3_ally_dogs = true;
    expect(view('d_a3_linnet', s.g, s.q).text).toContain('red rag');
    const k = game('prepared');
    const r = talk('d_a3_linnet', k.g, k.q, ['(Go on.)', 'When this is done...', 'Come with me.']);
    expect(k.g.flags.a3_linnet).toBe('knock');
    expect(k.g.flags.a3_linnet_after).toBe('road');
    expect(r.view()!.text).toContain('When it\'s done');
  });
});

// ---------------------------------------------------------------- the column

describe('B6f: the column, and its captain\'s tree', () => {
  it('Lowe, or Sergeant Reyes if he is dead; either one hears the player out', () => {
    const a = game('ledger');
    expect(here(a.g)).toContain('npc_md_01');
    const r = talk('d_a3_lowe', a.g, a.q);
    expect(r.view()!.text).toContain('The order executes on the designate\'s attendance');
    expect(a.g.flags.a3_lowe_heard).toBe(true);
    expect(a.g.world.knowledge.a3_lowe_clause).toBe(true);
    const b = game('ledger');
    kill(b.g, LOWE);
    expect(here(b.g)).toContain('npc_md_12');
    expect(here(b.g)).not.toContain('npc_md_01');
    const rr = talk('d_a3_lowe', b.g, b.q);
    expect(rr.view()!.speaker).toBe(REYES);
    expect(b.g.flags.a3_lowe_heard).toBe(true);
    arrive(b);
    b.q.update();
    expect(b.q.journal().find((j) => j.id === 'q_a3_cistern')!.objectives.find((o) => o.text.startsWith('Hear the column'))!.done).toBe(true);
  });

  it('the intro reads what the player said at Tollhouse 9, and whether they ever met him', () => {
    for (const [v, cue] of [['down', 'still waiting to hear it here'], ['on', 'I wrote it down'], ['unsure', 'Nor do I, still']] as const) {
      const a = game('ledger', { flags: { a3_lowe_asked: v, lowe_met: true } });
      expect(view('d_a3_lowe', a.g, a.q).text, v).toContain(cue);
    }
    const stranger = game('choir');
    expect(view('d_a3_lowe', stranger.g, stranger.q).text).toContain('commanding the column for Reserve 9');
    const rode = game('ledger', { flags: { a3_route_home: 'column' } });
    expect(view('d_a3_lowe', rode.g, rode.q).text).toContain('got down off the car beside you');
  });

  it('his topics are gated: the cadet, the guild, the third word, the old promise, the grief once', () => {
    const plain = game('choir');
    expect(opts('d_a3_lowe', plain)).toEqual(['(Go on.)']); // the intro (and its effects: heard)
    const base = opts('d_a3_lowe', plain);
    for (const t of ['Linnet Ferrow is in your column.', 'The guild is here.', 'You asked me once for a third word.', 'You said you\'d stand for me, when I sat where the assessor sits.']) expect(base, t).not.toContain(t);
    expect(base).toContain('You don\'t like this one.');
    expect(base).toContain('The sixty, Captain. Do you know their names?');

    const rich = game('hostile', { knows: ['lowe_grieves'], flags: { a3_guild_in: true } });
    rich.g.world.memories[LOWE] = [{ tag: 'designate', valence: 5, strength: 80, day: 1, source: 'witnessed' }, { tag: 'a3_grief_told', valence: 5, strength: 70, day: 1, source: 'witnessed' }];
    talk('d_a3_lowe', rich.g, rich.q, ['(Go on.)']);
    const more = opts('d_a3_lowe', rich);
    for (const t of ['Linnet Ferrow is in your column.', 'The guild is here.', 'You asked me once for a third word.', 'You said you\'d stand for me, when I sat where the assessor sits.']) expect(more, t).toContain(t);
    expect(more).not.toContain('You don\'t like this one.');
    talk('d_a3_lowe', rich.g, rich.q, ['You asked me once for a third word.', 'Home.']);
    expect(rich.g.world.memories[LOWE].some((m) => m.tag === 'a3_third_word')).toBe(true);
    talk('d_a3_lowe', rich.g, rich.q, ['The guild is here.']);
    expect(rich.g.world.knowledge.a3_lowe_guild).toBe(true);
    // a topic asked in the car is asked differently at the table
    const car = game('ledger');
    car.g.world.seen['col.names'] = 1;
    talk('d_a3_lowe', car.g, car.q, ['(Go on.)']);
    expect(opts('d_a3_lowe', car)).toContain('You said their names in the car, Captain.');
  });

  it('the column\'s water: given at once on his trust, or argued for; once asked, not asked again', () => {
    const t = game('prepared');
    talk('d_a3_lowe', t.g, t.q, ['(Go on.)', 'Knock is dry, Captain.']);
    expect(t.g.flags.a3_column_water).toBe(true);
    expect(opts('d_a3_lowe', t).some((o) => o.startsWith('Knock is dry'))).toBe(false);

    const fail = game('hostile');
    eff(fail.g, 'speech', 40);
    const r = talk('d_a3_lowe', fail.g, fail.q, ['(Go on.)', 'Knock is dry, Captain.']);
    expect(r.view()!.text).toContain('entered against the column');
    expect(fail.g.flags.a3_column_water).toBeUndefined();
    expect(opts('d_a3_lowe', fail).some((o) => o.startsWith('Knock is dry'))).toBe(false);

    const win = game('hostile');
    eff(win.g, 'speech', 50);
    talk('d_a3_lowe', win.g, win.q, ['(Go on.)', 'Knock is dry, Captain.']);
    expect(win.g.flags.a3_column_water).toBe(true);
    expect(modValue(win.g, KNOCK_WATER)).toBe('column');
    expect(view('d_a3_maud', win.g, win.q).text.length).toBeGreaterThan(0);

    const honest = game('hostile', { flags: { a3_lowe_asked: 'down' } });
    eff(honest.g, 'speech', 40);
    const h = new DialogueRunner(DIALOGUES.d_a3_lowe, honest.g, honest.q);
    h.choose(h.view()!.options[0].id);
    const o = h.view()!.options.find((x) => x.text.startsWith('Knock is dry'))!;
    expect(o.checkLabel).toBe('Speech 35');
    expect(o.checkMet).toBe(true);
  });

  it('the senior warden talks; the column is polite and armed, hostile only if the door comes to a fight', () => {
    const a = game('ledger');
    talk('d_a3_warden', a.g, a.q, ['Line six?']);
    expect(opts('d_a3_warden', a)).not.toContain('Line six?');
    for (const id of WARDENS) {
      expect(cond(NPCS[id].hostileIf, a.g), id).toBe(false);
      a.g.flags.a3_door_fight = true;
      expect(cond(NPCS[id].hostileIf, a.g), id).toBe(true);
      delete a.g.flags.a3_door_fight;
    }
  });
});

// ---------------------------------------------------------------- the Grille in lockdown

describe('B6f: the Grille in lockdown', () => {
  it('MOTHER says the player\'s name for the first time; Ines refuses the door again and offers the hatch', () => {
    const a = game('prepared');
    const r = talk('d_a3_grille', a.g, a.q);
    expect(r.node).toBe('a3_lock');
    expect(r.view()!.text).toContain('"Halden."');
    expect(r.view()!.speaker).toBe('npc_c9_05');
    expect(a.g.world.knowledge.a3_mother_named).toBe(true);
    go(r, a, ['(Listen.)', 'Why did you shut it?']);
    expect(r.view()!.text).toContain('A lockdown is not a refusal. It is a pause.');
    go(r, a, ['(Go on.)', 'Let me speak to Ines.']);
    expect(r.view()!.speaker).toBe('npc_c9_01');
    expect(r.view()!.text).toContain('come by the hatch');
    expect(a.g.world.knowledge.a3_hatch_offered).toBe(true);
    // the copy of MOTHER's replies, told through the holes: the Archive promise, as the letter would have given it
    expect(a.g.flags.a3_archive_promise).toBeUndefined();
    go(r, a, ['I have a copy of what MOTHER told the city.']);
    expect(a.g.flags.a3_archive_promise).toBe(true);
    expect(a.g.world.knowledge.ines_promised_archive).toBe(true);
    // next time, the hub, not the name again
    expect(new DialogueRunner(DIALOGUES.d_a3_grille, a.g, a.q).node).toBe('a3_hub');
  });

  it('the third refusal reads whether Ines refused Maud; Tamsin at the holes; Tamsin still inside asks after the sky', () => {
    const refused = game('hostile');
    expect(talk('d_a3_grille', refused.g, refused.q, ['(Listen.)', 'Let me speak to Ines.']).view()!.text).toContain('I said no to it for Maud Ferrow, when she was bleeding. I am saying it a third time');
    const not = game('prepared');
    expect(talk('d_a3_grille', not.g, not.q, ['(Listen.)', 'Let me speak to Ines.']).view()!.text).toContain('every day since without anybody asking');
    const tam = game('prepared');
    const before = appr(tam.g, TAMSIN);
    talk('d_a3_grille', tam.g, tam.q, ['(Listen.)', '(Tamsin puts her mouth to the holes.)']);
    expect(appr(tam.g, TAMSIN)).toBe(before + 5);
    const inside = game('prepared', { companions: { tamsin: 'inside' } });
    const w = talk('d_a3_grille', inside.g, inside.q, ['(Listen.)', 'Is everyone in there all right?']);
    expect(w.view()!.text).toContain('Resident Roe asks what the sky is doing');
    expect(w.view()!.options.map((o) => o.text)).not.toContain('(Tamsin puts her mouth to the holes.)');
    go(w, inside, ['White at the edges.']);
    expect(appr(inside.g, TAMSIN)).toBe(5);
  });

  it('with the door settled, the Grille is B6k\'s after-the-door Grille (MOTHER by what the door left), not the lockdown\'s', () => {
    const a = game('prepared', { flags: { a3_c9: 'sealed' } });
    expect(new DialogueRunner(DIALOGUES.d_a3_grille, a.g, a.q).node).toBe('a3k_grille');
    // before Act 3 it is still the opening's Grille, whole
    const b = game('prepared', { point: 'eve' });
    b.g.flags.a3_open = false;
    expect(new DialogueRunner(DIALOGUES.d_a3_grille, b.g, b.q).node).toBe(new DialogueRunner(DIALOGUES.d_kn_grille, b.g, b.q).node);
  });
});

// ---------------------------------------------------------------- Maud

describe('B6f: Maud at the hatch she can\'t open', () => {
  it('coming home: lame or not, and how the player came; she trusts more for it', () => {
    const lame = game('hostile');
    expect(view('d_a3_maud', lame.g, lame.q).text).toContain('stick across her knees');
    const well = game('prepared', { flags: { a3_route_home: 'column' } });
    const r = talk('d_a3_maud', well.g, well.q);
    expect(r.view()!.text).toContain('quick as she ever was');
    expect(r.view()!.text).toContain('get down out of that');
    expect(well.g.flags.a3_maud_home).toBe(true);
    expect(trust(well.g, 'npc_kn_maud')).toBe(10);
    expect(new DialogueRunner(DIALOGUES.d_a3_maud, well.g, well.q).node).toBe('hub');
  });

  it('her secret only once she trusts the player enough; the margin asked too early is old business', () => {
    const a = game('prepared', { knows: ['kn_maud_sold_letter'] });
    talk('d_a3_maud', a.g, a.q, ['(Hold on to her.)']);
    expect(opts('d_a3_maud', a)).not.toContain('(Wait. She has something to say.)');
    talk('d_a3_maud', a.g, a.q, ['You wrote "I sold a letter"']);
    expect(opts('d_a3_maud', a)).not.toContain('You wrote "I sold a letter" in the post-book. What letter?');
    talk('d_a3_maud', a.g, a.q, ['(Be at the hatch with her at seven.)']);
    expect(Math.floor((a.g.minutes % 1440) / 60)).toBe(7);
    expect(opts('d_a3_maud', a)).not.toContain('(Wait. She has something to say.)');
    talk('d_a3_maud', a.g, a.q, ['What do you want, Maud?']);
    expect(trust(a.g, 'npc_kn_maud')).toBe(20);
    expect(opts('d_a3_maud', a)).toContain('(Wait. She has something to say.)');
    const r = talk('d_a3_maud', a.g, a.q, ['(Wait. She has something to say.)']);
    expect(r.view()!.text).toContain('You read the margin');
    expect(a.g.flags.a3_maud_secret).toBe(true);
  });

  it('three answers to it, the first only for a player who knows the city keeps MOTHER\'s returns; and who it was from', () => {
    const answers: [Preset, Record<string, unknown>, string[], string][] = [
      ['prepared', {}, ['The city has had their names'], 'eased'],
      ['prepared', {}, ['You kept her alive through a winter'], 'forgiven'],
      ['prepared', {}, ['(Say nothing. Take her hand.)'], 'told'],
      ['prepared', {}, ['Who was it from?', 'MOTHER keeps everything.', 'You kept her alive'], 'forgiven'],
    ];
    for (const [preset, flags, picks, v] of answers) {
      const a = game(preset, { flags: flags as Over['flags'], trust: { npc_kn_maud: 25 } });
      a.g.flags.a3_maud_home = true;
      talk('d_a3_maud', a.g, a.q, ['(Wait. She has something to say.)', ...picks]);
      expect(a.g.flags.a3_maud, picks.join(' / ')).toBe(v);
      expect(a.g.flags.a3_maud_secret).toBe(true);
    }
    const asked = game('prepared', { trust: { npc_kn_maud: 25 } });
    asked.g.flags.a3_maud_home = true;
    talk('d_a3_maud', asked.g, asked.q, ['(Wait. She has something to say.)', 'Who was it from?', 'MOTHER keeps everything.']);
    expect(asked.g.world.knowledge.a3_maud_letter_ask).toBe(true);
    const blind = game('hostile', { trust: { npc_kn_maud: 25 } });
    blind.g.flags.a3_maud_home = true;
    const r = talk('d_a3_maud', blind.g, blind.q, ['(Wait. She has something to say.)']);
    expect(r.view()!.text).toContain('There\'s a thing I\'ve never said');
    expect(r.view()!.options.map((o) => o.text).some((t) => t.startsWith('The city has had their names'))).toBe(false);
  });

  it('Knock\'s water in her words, and Linnet by her fate', () => {
    const cases: [Preset, Record<string, unknown>, string][] = [
      ['prepared', {}, 'Dry Wells sends a cart'], ['hostile', { a3_carts_water: true }, 'The Choir walked water in'],
      ['hostile', { a3_column_water: true }, 'The city\'s water'], ['hostile', { a3_well: 'deepened' }, 'pump\'s turning again'], ['hostile', {}, 'A cup a head'],
    ];
    for (const [preset, flags, cue] of cases) {
      const a = game(preset, { flags: flags as Over['flags'] });
      a.g.flags.a3_maud_home = true;
      expect(talk('d_a3_maud', a.g, a.q, ['How is Knock for water?']).view()!.text, cue).toContain(cue);
    }
    const lin: [Preset, Record<string, unknown>, string][] = [
      ['hostile', {}, 'Linnet is in that column, Maud.'], ['choir', { a3_ally_dogs: true }, 'Linnet came with the Dogs.'], ['choir', {}, 'Has Linnet written?'], ['prepared', {}, 'Where\'s Linnet?'],
    ];
    for (const [preset, flags, topic] of lin) {
      const a = game(preset, { flags: flags as Over['flags'] });
      a.g.flags.a3_maud_home = true;
      const o = opts('d_a3_maud', a);
      expect(o, topic).toContain(topic);
      expect(o.filter((t) => /Linnet/.test(t)).length, topic).toBe(1);
    }
  });
});

// ---------------------------------------------------------------- Corin and Dace

describe('B6f: Corin on the slope, Dace by the guild or the post-house', () => {
  it('the windpump: the valve lowered or the sump dug; either way two cups a head; a failure leaves the other way open', () => {
    const a = game('hostile', { skills: { mechanics: 50 } });
    talk('d_a3_corin', a.g, a.q, ['(Go on.)', 'The windpump\'s stopped.', '(Lower the foot valve a length.)']);
    expect(a.g.flags.a3_well).toBe('deepened');
    expect(modValue(a.g, KNOCK_WATER)).toBe('pump');
    expect(trust(a.g, 'npc_kn_corin')).toBe(10);
    const b = game('hostile');
    eff(b.g, 'mechanics', 30);
    const r = talk('d_a3_corin', b.g, b.q, ['(Go on.)', 'The windpump\'s stopped.', '(Lower the foot valve a length.)']);
    expect(r.view()!.text).toContain('threads are gone to rust');
    expect(b.g.flags.a3_well).toBeUndefined();
    const c = game('hostile', { origin: 'pump_hand' });
    eff(c.g, 'mechanics', 30);
    talk('d_a3_corin', c.g, c.q, ['(Go on.)', 'The windpump\'s stopped.', '(Lower the foot valve a length.)']);
    expect(c.g.flags.a3_well).toBe('deepened');
    const d = game('hostile');
    eff(d.g, 'survival', 40);
    talk('d_a3_corin', d.g, d.q, ['(Go on.)', 'The windpump\'s stopped.', '(Dig the silt out of the sump.)']);
    expect(d.g.flags.a3_well).toBe('deepened');
  });

  it('the slope at the door: held, or the rifle put on the shelf; his placement follows', () => {
    const a = game('prepared');
    talk('d_a3_corin', a.g, a.q, ['(Go on.)', 'What will you do when I go to the door?', 'Come down, Corin.']);
    expect(a.g.flags.a3_corin).toBe('down');
    expect(here(a.g)).toContain('npc_kn_corin_down');
    expect(here(a.g)).not.toContain('npc_kn_corin_a3');
    const b = game('hostile');
    eff(b.g, 'speech', 30);
    talk('d_a3_corin', b.g, b.q, ['(Go on.)', 'What will you do when I go to the door?', 'Come down, Corin.']);
    expect(b.g.flags.a3_corin).toBe('holds');
    const c = game('prepared');
    talk('d_a3_corin', c.g, c.q, ['(Go on.)', 'What will you do when I go to the door?', 'Hold the slope']);
    expect(c.g.flags.a3_corin).toBe('holds');
    expect(here(c.g)).toContain('npc_kn_corin_a3');
  });

  it('Hale only with the guild here and Hale alive; the outriders and the rifle only for those who know', () => {
    const g = game('guild', { knows: ['corin_rode_with_hale'], flags: { kn_corin_rifle: true } });
    arrive(g);
    talk('d_a3_corin', g.g, g.q, ['(Go on.)']);
    const o = opts('d_a3_corin', g);
    for (const t of ['Hale is with the guild.', 'Why did you leave the outriders?', 'Where did that rifle come from?']) expect(o, t).toContain(t);
    const c = game('choir');
    talk('d_a3_corin', c.g, c.q, ['(Go on.)']);
    const p = opts('d_a3_corin', c);
    for (const t of ['Hale is with the guild.', 'Why did you leave the outriders?', 'Where did that rifle come from?']) expect(p, t).not.toContain(t);
  });

  it('Dace: the guild\'s guide when it came, home with a hammer when not; his debt paid, or talked out of guiding', () => {
    const a = game('guild');
    arrive(a);
    expect(view('d_a3_dace', a.g, a.q).text).toContain('guide\'s brass tag');
    expect(a.g.flags.a3_dace).toBe('guide');
    const tolls = a.g.pc.inventory.tolls;
    talk('d_a3_dace', a.g, a.q, ['What do you owe the guild now?', '(Pay it for him.']);
    expect(a.g.flags.a3_dace).toBe('square');
    expect(a.g.pc.inventory.tolls).toBe(tolls - 42);
    expect(here(a.g)).toContain('npc_kn_dace_a3');
    expect(here(a.g)).not.toContain('npc_kn_dace_guild');

    const b = game('guild');
    eff(b.g, 'speech', 50);
    arrive(b);
    talk('d_a3_dace', b.g, b.q, ['(Go on.)', 'You don\'t have to guide them, Dace.']);
    expect(b.g.flags.a3_dace).toBe('quit');
    expect(here(b.g)).toContain('npc_kn_dace_a3');

    const c = game('choir');
    arrive(c);
    expect(view('d_a3_dace', c.g, c.q).text).toContain('post-house roof');
    expect(c.g.flags.a3_dace).toBe('knock');
    expect(opts('d_a3_dace', c)).not.toContain('You don\'t have to guide them, Dace.');
  });
});

// ---------------------------------------------------------------- Knock's others, the forces by night, the people

describe('B6f: Knock\'s others, the forces by night, and the new people', () => {
  it('Afua\'s boy gets the blue box if the player still has one; Binta meets Tamsin\'s face', () => {
    const a = game('prepared', { items: ['c_knitkit'] });
    talk('d_a3_kn_r1', a.g, a.q, ['(Give her your Knit-Kit for the boy.)']);
    expect(has(a.g, 'c_knitkit')).toBe(false);
    expect(a.g.world.memories.npc_kn_r1.some((m) => m.tag === 'a3_kit')).toBe(true);
    const b = game('prepared');
    expect(opts('d_a3_kn_r1', b)).not.toContain('(Give her your Knit-Kit for the boy.)');
    expect(view('d_a3_kn_r3', b.g, b.q).text).toContain('Is that her?');
    for (const id of ['d_a3_kn_r2', 'd_a3_kn_r4']) expect(view(id, b.g, b.q).text.length, id).toBeGreaterThan(80);
  });

  it('the Unwritten only by night, led by Petra or, with her dead, by one of their own; gone once B6g settles them', () => {
    const a = game('prepared');
    a.g.locationId = 'c9_mouth';
    hour(a.g, 10);
    expect(here(a.g).filter((id) => /npc_of_02|npc_a3_u/.test(id))).toEqual([]);
    hour(a.g, 22);
    expect(here(a.g).filter((id) => /npc_of_02|npc_a3_u/.test(id))).toEqual(['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']);
    hour(a.g, 3);
    expect(here(a.g)).toContain('npc_of_02');
    kill(a.g, 'npc_of_02');
    expect(here(a.g).filter((id) => /npc_of_02|npc_a3_u/.test(id))).toEqual(['npc_a3_u1', 'npc_a3_u2', 'npc_a3_u3']);
    expect(view('d_a3_petra', a.g, a.q).speaker).toBe('npc_a3_u1');
    a.g.flags.a3_unwritten = 'gone';
    expect(here(a.g).filter((id) => /npc_of_02|npc_a3_u/.test(id))).toEqual([]);
  });

  it('the new people: women narrow and men broad, hair true to ancestry, nobody grey under fifty-five; faces bare', () => {
    const AFRO = ['coily_twa', 'coily_afro', 'coily_afro_big', 'paint_shaved', 'paint_buzz', 'paint_fade', 'paint_coils', 'paint_cornrows', 'none'];
    const women = ['npc_a3_g4', 'npc_a3_g6', 'npc_a3_g12', 'npc_a3_u1', 'npc_a3_u3'], men = ['npc_a3_g3', 'npc_a3_g5', 'npc_a3_g11', 'npc_a3_u2'];
    expect([...women, ...men].sort()).toEqual(A3_KNOCK_NPCS.map((n) => n.id).sort());
    for (const w of women) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of men) expect(NPCS[m].look.frame, m).toBe('broad');
    for (const n of A3_KNOCK_NPCS) {
      if (/african/.test(n.look.ancestry ?? '')) expect(AFRO, n.id).toContain(n.look.over?.hair?.style);
      expect(n.look.over?.hair?.style, n.id).not.toMatch(/bob|bang|slick|quiff/);
    }
  });

  it('a state at Knock survives the save codec with the same people standing', async () => {
    const a = game('guild', { flags: { kn_linnet_will_run: true } });
    arrive(a);
    talk('d_a3_lowe', a.g, a.q, ['(Go on.)']);
    const b = await saveAndLoad(a.g);
    expect(here(b.g)).toEqual(here(a.g));
    expect(b.g.flags.a3_guild_in).toBe(true);
    expect(new DialogueRunner(DIALOGUES.d_a3_lowe, b.g, b.q).node).toBe('hub');
  });
});

// ---------------------------------------------------------------- the trees and the content

describe('B6f: the trees and the content', () => {
  it('every node in the B6f trees has a line for coming back to it (U7), or only leaves; every companion speaks at home', () => {
    const speakers = new Set<string>();
    let nodes = 0;
    for (const d of [...A3_KNOCK_DIALOGUES, ...A3_FORCES_DIALOGUES]) {
      const own = d.id === 'd_a3_grille' ? Object.entries(d.nodes).filter(([nid]) => !DIALOGUES.d_kn_grille.nodes[nid]) : Object.entries(d.nodes);
      for (const [nid, n] of own) {
        nodes++;
        if (!n.options.every((o) => o.exit)) expect(n.again, `${d.id}/${nid}`).toBeDefined();
        for (const ij of n.interject ?? []) speakers.add(ij.companion);
      }
    }
    expect(nodes).toBeGreaterThanOrEqual(90);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
  });

  it('every Act 3 placement on Knock points at a tree that exists and at spots on Knock\'s own map', () => {
    for (const p of MAP().npcs!) {
      if (p.dialogue) expect(DIALOGUES[p.dialogue], `${p.id ?? p.def} → ${p.dialogue}`).toBeDefined();
      for (const e of p.schedule ?? NPCS[p.def].schedule ?? []) if (e.spot) expect(MAP().spots![e.spot], `${p.id ?? p.def} ${e.spot}`).toBeDefined();
    }
    for (const s of ['tam_door', 'apron_1', 'apron_2', 'apron_3', 'apron_4']) expect(MAP().spots![s], s).toBeDefined();
  });

  it('the content validates', () => {
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|c9_mouth|d_kn_|npc_kn_|Kress|Pahl|Okeke|Tolland|Wilmot|Nkemelu|Lowry|Wolde|Kalder/.test(e))).toEqual([]);
  });
});
