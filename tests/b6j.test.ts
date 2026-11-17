import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_DOOR_DIALOGUES, A3X_NODES, LOWE_GO_NODES } from '../src/content/dialogue/a3_door';
import {
  COLUMN_APRON, COMPANIONS, DOOR_BROKEN, DOOR_YIELDS, LED_BY_KRESS, LED_BY_LOWE, LED_BY_REYES, LOWE_DEAD, MOTHER_AFTER, NINE, ON_SIDE, STRUCK_AS, STRUCK_CLAIMED,
  TAMSIN, WREN, modValue,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { skill } from '../src/engine/stats/sheet';
import type { SkillId } from '../src/engine/stats/rules';
import { apply, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, saveAndLoad, stage, status, talk, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6j — the door: the column down the lane to Knock's apron and holding at the yellow line, and Reserve 9 settled there with
 * the designate in front of it. Every route to every outcome (sealed by the captain's stand-down or the formal declining, by the
 * weld, by Pell's charts and the trap in them, by the fight; opened by the ring's vote once the column has gone; relocated by
 * the word, by force, by the guild's paper, by the residents' own vote), each refusal and failed check, Tamsin's red line and
 * the one way she dies, Nine's break by whose keeper it is, Wren's red line, Kes numbed, MOTHER after, the props after, the
 * map's placements and triggers, and a save round-trip. Played headless with the shared Act 3 fixture.
 */

const T = 'd_a3_door';
const GO = '(Go on.)';
const NOT_YET = '(Not yet.)';
const DOWN = 'Stand them down, Captain.';
const ORDER = 'Carry on, Captain.';
const MAP = () => MAPS.c9_mouth;

interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[] };
type Flags = Record<string, string | boolean | number>;
/** Act 3 at Knock (the order read, home), with the events the trees raise caught. */
function game(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}): Game {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  const a = { ...actThree(preset, { at: 'c9_mouth', ...over, host, flags: { a3_at_knock: true, ...(over.flags ?? {}), ...flags } }), events };
  a.g.pc.sheet.name = 'Halden';
  a.q.update();
  return a;
}
/** The same game with the column down on the apron, at the yellow line. */
const apron = (preset: Preset = 'truce', over: Over = {}, flags: Flags = {}) => game(preset, over, { a3_column_apron: true, ...flags });
/** Nobody at the door who would stand in it or be ordered to take her out of it. */
const ALONE: Over = { companions: { tamsin: 'never', nine: 'never' } };
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
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
/** Open the door's scene and walk it to the line (through the first arrival, and Kes's moment if it comes). */
function atLine(a: A3): DialogueRunner {
  const r = talk(T, a.g, a.q);
  if (r.node === 'arrive') go(r, a, ['(Look up the slope.)']);
  while (r.node === 'arrive_slope' || r.node === 'kes') go(r, a, [GO]);
  expect(r.node).toBe('line');
  return r;
}
/** Walk the after-chain to its end: every "(Go on.)" and "(Let her go.)", then off the apron. The nodes passed. */
function finish(r: DialogueRunner, a: A3): string[] {
  const seen: string[] = [];
  for (let i = 0; i < 12 && r.node; i++) {
    seen.push(r.node);
    const o = r.view()!.options;
    const leave = o.find((x) => x.text === '(Leave the apron.)');
    if (leave) { r.choose(leave.id); a.q.update(); break; }
    const next = o.find((x) => x.text === GO || x.text === '(Let her go.)');
    if (!next) throw new Error(`stuck at ${r.node}: [${o.map((x) => x.text).join(' | ')}]`);
    r.choose(next.id);
    a.q.update();
  }
  return seen;
}
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const check = (r: DialogueRunner, prefix: string) => r.view()!.options.find((o) => o.text.startsWith(prefix))!.checkLabel;
const here = (g: G) => MAP().npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const kill = (g: G, id: string, map = 'c9_mouth') => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const trig = (id: string) => MAP().triggers!.find((t) => t.id === id)!;
const opened = (a: Game) => a.events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
const gotos = (a: Game) => a.events.filter((e) => e.name === 'goto').map((e) => e.data as { location: string; spawn: string });
function fireT(a: A3, id: string): void {
  const t = trig(id);
  expect(cond(t.if, a.g), id).toBe(true);
  a.g.flags[`trigger:c9_mouth/${id}`] = true;
  apply(t.effects, a.g, a.q);
  a.q.update();
}
const C9 = (g: G) => ({ c9: g.flags.a3_c9, how: g.flags.a3_c9_how, lowe: g.flags.a3_lowe });
const APRON_COLUMN = ['npc_md_01_apron', 'npc_a3_g3_apron', 'npc_a3_g4_apron', 'npc_a3_g5_apron', 'npc_a3_g6_apron'];
const CAMP_COLUMN = ['npc_md_01', 'npc_a3_g3', 'npc_a3_g4', 'npc_a3_g5', 'npc_a3_g6'];

// ---------------------------------------------------------------- down the lane, and the line

describe('B6j: the column comes down the lane and holds at the yellow line', () => {
  it('the designate tells the captain at the camp; the column steps off the camp and onto the apron; the line opens the scene', () => {
    const a = game('truce', ALONE);
    for (const id of CAMP_COLUMN) expect(here(a.g), id).toContain(id);
    for (const id of APRON_COLUMN) expect(here(a.g), id).not.toContain(id);
    expect(cond(trig('a3_door_line').if, a.g)).toBe(false);
    const r = talk('d_a3_lowe', a.g, a.q, ['(Go on.)', 'I\'m ready to attend.']);
    expect(r.node).toBe('a3j_go');
    expect(r.view()!.text).toContain('That is what attending means');
    go(r, a, ['(Walk down the lane ahead of the column.)']);
    expect(a.g.flags.a3_column_apron).toBe(true);
    expect(gotos(a)).toEqual([{ location: 'c9_mouth', spawn: 'door' }]);
    for (const id of CAMP_COLUMN) expect(here(a.g), id).not.toContain(id);
    for (const id of APRON_COLUMN) expect(here(a.g), id).toContain(id);
    expect(MAP().npcs!.find((p) => p.id === 'npc_md_01_apron')!.dialogue).toBe(T);
    // the spawn the walk ends on is inside the line's trigger, which opens the scene once
    const sp = MAP().spawns.find((s) => s.id === 'door')!, t = trig('a3_door_line');
    expect(sp.x >= t.x && sp.x < t.x + (t.w ?? 1) && sp.y >= t.y && sp.y < t.y + (t.h ?? 1)).toBe(true);
    fireT(a, 'a3_door_line');
    expect(opened(a)).toEqual([T]);
    expect(t.once).not.toBe(false);
    expect(talk(T, a.g, a.q).node).toBe('arrive');
    expect(atLine(a).view()!.text).toContain('Captain Lowe a pace in front of them');
    // "not yet" at the camp changes nothing
    const b = game('truce', ALONE);
    talk('d_a3_lowe', b.g, b.q, ['(Go on.)', 'I\'m ready to attend.', 'Not yet.']);
    expect(b.g.flags.a3_column_apron).toBeUndefined();
  });

  it('Reyes leads when Lowe died before; Kress when both did (the lead is fixed before the column comes down)', () => {
    const a = game('truce', ALONE);
    kill(a.g, 'npc_md_01');
    talk('d_a3_lowe', a.g, a.q, ['(Go on.)', 'I\'m ready to attend.', '(Walk down the lane ahead of the column.)']);
    expect(here(a.g)).toContain('npc_md_12_apron');
    expect(here(a.g)).not.toContain('npc_md_01_apron');
    expect(cond(LED_BY_REYES, a.g)).toBe(true);
    expect(atLine(a).view()!.text).toContain('Sergeant Reyes a pace in front of them');
    const b = apron('truce', ALONE);
    kill(b.g, 'npc_md_01'); kill(b.g, 'npc_md_12', 'md_precinct');
    expect(cond(LED_BY_KRESS, b.g)).toBe(true);
    expect(here(b.g).filter((id) => id.startsWith('npc_md_'))).toEqual([]);
    expect(MAP().npcs!.find((p) => p.id === 'npc_a3_g3_apron')!.dialogue).toBe(T);
    expect(atLine(b).view()!.text).toContain('Warden Kress a pace in front of them');
    // a death on the apron hands nothing on: Reyes is not brought down the lane mid-fight
    const c = apron('truce', ALONE);
    kill(c.g, 'npc_md_01_apron');
    expect(cond(LED_BY_LOWE, c.g)).toBe(true);
    expect(here(c.g)).not.toContain('npc_md_12_apron');
    expect(cond(LOWE_DEAD, c.g)).toBe(true);
  });

  it('the door cycled from outside (B6h) leaves the column on the apron; coming back out, the line opens the scene', () => {
    const a = game('truce', ALONE);
    eff(a.g, 'mechanics', 50);
    talk('d_kn_door', a.g, a.q, ['(Take the plate off', '(Throw the valve.)', '(Turn round.)', 'Hold them there.', '(Go in.)']);
    expect(a.g.flags).toMatchObject({ a3_column_apron: true, a3_door_cycled: true, a3_in_how: 'door' });
    expect(here(a.g)).toContain('npc_md_01_apron');
    expect(cond(trig('a3_door_line').if, a.g)).toBe(true);
    const r = atLine(a);
    expect(r.view()!.text).toContain('stands open on its manual cycle');
    expect(stage(a.g, 'q_a3_cistern')).toBe('door');
  });

  it('nothing settles unasked: "(Not yet.)" changes nothing, and days at Knock with the column on the apron settle nothing', () => {
    const a = apron('truce', ALONE);
    const r = atLine(a);
    const before = JSON.stringify(a.g.flags);
    go(r, a, [NOT_YET]);
    expect(r.ended).toBe(true);
    expect(JSON.stringify(a.g.flags)).toBe(before);
    for (let d = 0; d < 6; d++) { waitFor(a.g, a.q, 'c9_mouth', 7); waitFor(a.g, a.q, 'c9_mouth', 22); }
    expect(a.g.flags.a3_c9).toBeUndefined();
    expect(here(a.g)).toContain('npc_md_01_apron');
    expect(talk(T, a.g, a.q).node).toBe('line');
    expect(stage(a.g, 'q_a3_cistern')).toBe('knock');
  });

  it('the line: what the captain says about where they go and about "no"; every road out of the door is on it', () => {
    const a = apron('truce', ALONE);
    const r = atLine(a);
    for (const t of ['Where would they go', 'And if I say no', DOWN, ORDER, '(Break the column.)', NOT_YET]) expect(opts(r).some((x) => x.startsWith(t)), t).toBe(true);
    for (const t of ['(Attend the door', 'Doc Pell has', '(Go in, and weld', 'They\'ve voted to come']) expect(opts(r).some((x) => x.startsWith(t)), t).toBe(false);
    go(r, a, ['Where would they go']);
    expect(r.view()!.text).toContain('Hospice block');
    go(r, a, [GO, 'And if I say no']);
    expect(r.view()!.text).toContain('say it in a way the order can hear');
    go(r, a, [GO]);
    expect(opts(r).some((x) => x.startsWith('Where would they go'))).toBe(false);
  });
});

// ---------------------------------------------------------------- sealed: the captain stands down

describe('B6j: sealed — the captain stands the column down', () => {
  it('Speech 60 with the plan\'s evidence; passed, the column goes home, the door stays shut and MOTHER speaks', () => {
    const a = apron('prepared', { companions: { tamsin: 'waiting' } });
    const r = atLine(a);
    // −10 the replies, −5 the census, −10 Nine reading it (conscience, travelling), −10 his trust, −5 Jonah, −10 the warrant
    expect(check(r, DOWN)).toBe('Speech 10');
    go(r, a, [DOWN]);
    expect(r.node).toBe('down');
    expect(r.view()!.text).toContain('ATTENDED. DECLINED. COLUMN WITHDRAWN');
    expect(a.g.flags.a3_lowe).toBe('stood_down');
    go(r, a, [GO]);
    expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'lowe', lowe: 'stood_down' });
    expect(r.node).toBe('sealed');
    expect(finish(r, a)).toEqual(['sealed', 'mother_kept']);
    expect(a.g.flags.a3_mother).toBe('kept');
    expect(stage(a.g, 'q_a3_cistern')).toBe('sealed');
    expect(status(a.g, 'q_a3_cistern')).toBe('done');
    for (const id of APRON_COLUMN) expect(here(a.g), id).not.toContain(id);
    expect(a.g.world.news.some((n) => n.tag === 'a3_c9_sealed')).toBe(true);
    expect(talk(T, a.g, a.q).node).toBe('settled');
  });

  it('the stand-down\'s modifiers: the Court\'s stay −30, its courtesy −15, its endorsement +15, the car +10; a failure is spent', () => {
    const DC = (flags: Flags, preset: Preset = 'hostile') => check(atLine(apron(preset, {}, flags)), DOWN);
    expect(DC({})).toBe('Speech 60');
    expect(DC({ ca_reserve: 'stayed' })).toBe('Speech 30');
    expect(DC({ ca_reserve: 'privilege' })).toBe('Speech 45');
    expect(DC({ ca_reserve: 'upheld' })).toBe('Speech 75');
    expect(DC({ a3_route_home: 'column' })).toBe('Speech 70');
    expect(DC({ a3_ally_shale: true })).toBe('Speech 55');
    const a = apron('hostile');
    eff(a.g, 'speech', 40);
    const r = go(atLine(a), a, [DOWN]);
    expect(r.node).toBe('down_no');
    expect(r.view()!.text).toContain('Not on that');
    expect(a.g.flags.a3_c9).toBeUndefined();
    expect(a.g.flags.a3_lowe).toBeUndefined();
    go(r, a, [GO]);
    expect(opts(r).some((x) => x.startsWith(DOWN))).toBe(false);
    expect(opts(r)).toContain(ORDER);
  });

  it('with the Court\'s attendance ruling the designate formally declines, no check, and the column goes home', () => {
    const a = apron('hostile', {}, { ca_reserve: 'attendance', prec_reserve: 'attendance' });
    eff(a.g, 'speech', 10);
    const r = go(atLine(a), a, ['(Attend the door, and formally decline']);
    expect(r.node).toBe('decline');
    expect(r.view()!.text).toContain('Then it cannot execute');
    go(r, a, [GO]);
    expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'lowe', lowe: 'stood_down' });
    expect(a.g.world.knowledge.a3_door_declined).toBe(true);
  });

  it('opened: the ring voted to open the door once the column had gone, and the column has gone', () => {
    const a = apron('prepared', { companions: { tamsin: 'waiting' } }, { a3_inside: true, a3_ring: 'open', a3_ines: 'opens' });
    const r = go(atLine(a), a, [DOWN, GO]);
    expect(r.node).toBe('opened');
    expect(r.view()!.text).toContain('the door opens from inside, by hand');
    expect(a.g.flags).toMatchObject({ a3_c9: 'opened', a3_c9_how: 'ines', a3_c9_by: 'lowe', a3_lowe: 'stood_down' });
    expect(finish(r, a)).toEqual(['opened', 'mother_knock']);
    expect(a.g.flags.a3_mother).toBe('knock');
    expect(stage(a.g, 'q_a3_cistern')).toBe('opened');
  });
});

// ---------------------------------------------------------------- sealed: Pell's charts

describe('B6j: sealed — struck off by Pell\'s charts, and the trap in them', () => {
  it('UNFIT: the order lapses; what striking means follows the Court\'s ruling on the unrecorded', () => {
    const read: [Flags, string][] = [
      [{ prec_unrecorded: 'yields' }, 'the Court will hear them'],
      [{ prec_unrecorded: 'outside' }, 'Free, the way the flats are free'],
      [{ prec_unrecorded: 'property' }, 'Nobody here to write. Today.'],
    ];
    for (const [flags, text] of read) {
      const a = apron('truce', ALONE, { a3_pell: 'unfit', ...flags });
      const r = go(atLine(a), a, ['Doc Pell has something']);
      expect(r.node).toBe('struck');
      expect(r.view()!.text, text).toContain(text);
      expect(r.view()!.text).toContain('FIT FOR RELOCATION — NO');
      go(r, a, ['(Let the charts stand.)']);
      expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'struck', lowe: 'withdrawn' });
    }
    // taken back: nothing settles, and the charts can be brought again
    const b = apron('truce', ALONE, { a3_pell: 'unfit' });
    const rb = go(atLine(b), b, ['Doc Pell has something', '(Take the charts back.)', GO]);
    expect(b.g.flags.a3_c9).toBeUndefined();
    expect(opts(rb)).toContain('Doc Pell has something for you to read.');
  });

  it('the trap: property, the guild at the stand, Orme alive; she claims them; talked down (Speech 50) the charts stand clean', () => {
    const a = apron('hostile', {}, { a3_pell: 'unfit', a3_guild_in: true });
    expect(cond(STRUCK_CLAIMED, a.g)).toBe(true);
    expect(modValue(a.g, STRUCK_AS)).toBe('claimed');
    const r = go(atLine(a), a, ['Doc Pell has something']);
    expect(r.view()!.text).toContain('somebody is coming down the lane');
    expect(opts(r)).toEqual([GO]);
    go(r, a, [GO]);
    expect(r.node).toBe('claim');
    expect(r.view()!.speaker).toBe('npc_kn_factor');
    expect(check(r, '(Put your hand flat')).toBe('Speech 50');
    eff(a.g, 'speech', 50);
    go(r, a, ['(Put your hand flat', GO]);
    expect(a.g.flags.a3_claim).toBe('off');
    expect(cond(STRUCK_CLAIMED, a.g)).toBe(false);
    expect(modValue(a.g, STRUCK_AS)).toBe('property');
    expect(r.view()!.text).toContain('Nobody writing. Today.');
    go(r, a, ['(Let the charts stand.)']);
    expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'struck', lowe: 'withdrawn' });
    // with no possession man at Knock, the word is easier
    const b = apron('hostile', {}, { a3_pell: 'unfit', a3_guild_in: true, a3_hale: 'answered' });
    expect(check(go(atLine(b), b, ['Doc Pell has something', GO]), '(Put your hand flat')).toBe('Speech 35');
  });

  it('the trap: the word fails, then pay her stake; or let her write: sealed, struck, and the guild\'s claim on every one of them', () => {
    const a = apron('hostile', {}, { a3_pell: 'unfit', a3_guild_in: true });
    eff(a.g, 'speech', 30);
    const r = go(atLine(a), a, ['Doc Pell has something', GO, '(Put your hand flat']);
    expect(r.node).toBe('claim_no');
    const tolls = a.g.pc.inventory.tolls;
    go(r, a, ['Then the hundred and twenty', GO]);
    expect(a.g.pc.inventory.tolls).toBe(tolls - 120);
    expect(a.g.flags.a3_claim).toBe('paid');
    go(r, a, ['(Let the charts stand.)']);
    expect(a.g.flags.a3_c9_how).toBe('struck');
    const b = apron('hostile', { companions: { tamsin: 'party' } }, { a3_pell: 'unfit', a3_guild_in: true });
    const tam = b.g.world.approval[TAMSIN];
    const rb = go(atLine(b), b, ['Doc Pell has something', GO, '(Let her write.)']);
    expect(rb.node).toBe('claim_warn');
    go(rb, b, ['No. Not like this.']);
    expect(rb.node).toBe('claim');
    go(rb, b, ['(Let her write.)', '(Let her write.)']);
    expect(rb.node).toBe('claimed');
    expect(b.g.flags).toMatchObject({ a3_claim: 'held', a3_c9: 'sealed', a3_c9_how: 'struck', a3_lowe: 'withdrawn' });
    expect(modValue(b.g, STRUCK_AS)).toBe('claimed');
    expect(b.g.world.approval[TAMSIN]).toBeLessThan(tam);
    expect(b.g.flags.a3_tamsin_dead).toBeUndefined();
    expect(talk('d_kn_door', b.g, b.q).view()!.text).toContain('CLAIMED — SALVAGE');
    // or take the charts back from the claim: nothing settles
    const c = apron('hostile', {}, { a3_pell: 'unfit', a3_guild_in: true });
    go(atLine(c), c, ['Doc Pell has something', GO, '(Take Pell\'s charts back.)']);
    expect(c.g.flags.a3_c9).toBeUndefined();
    expect(c.g.flags.a3_claim).toBeUndefined();
  });
});

// ---------------------------------------------------------------- sealed: the weld

describe('B6j: sealed — welded from inside', () => {
  it('Mechanics 40 (−10 Teague\'s word on the seam): the door welded with Bram and Teague; the column will not cut it', () => {
    const a = apron('truce', ALONE, { a3_inside: true, a3_ring: 'sealed' });
    a.g.world.knowledge.a3_teague_weld = true;
    const r = atLine(a);
    expect(check(r, '(Go in, and weld')).toBe('Mechanics 30');
    eff(a.g, 'mechanics', 30);
    go(r, a, ['(Go in, and weld']);
    expect(r.node).toBe('weld');
    expect(r.view()!.text).toContain('SEALED FROM WITHIN');
    go(r, a, [GO]);
    expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'welded', lowe: 'withdrawn' });
    expect(talk('d_kn_door', a.g, a.q).view()!.text).toContain('grey as rope');
  });

  it('the weld fails (spent); never before the player has been inside, against the ring\'s open or city vote, or on a hand pump', () => {
    const a = apron('truce', ALONE, { a3_inside: true });
    eff(a.g, 'mechanics', 39);
    const r = go(atLine(a), a, ['(Go in, and weld']);
    expect(r.node).toBe('weld_no');
    expect(a.g.flags.a3_c9).toBeUndefined();
    go(r, a, [GO]);
    expect(opts(r).some((x) => x.startsWith('(Go in, and weld'))).toBe(false);
    for (const flags of [{}, { a3_inside: true, a3_ring: 'open' }, { a3_inside: true, a3_ring: 'city' }] as Flags[]) {
      expect(opts(atLine(apron('truce', ALONE, flags))).some((x) => x.startsWith('(Go in, and weld')), JSON.stringify(flags)).toBe(false);
    }
    const b = apron('truce', ALONE, { a3_inside: true, a3_mother: 'burned', a3_archive: 'burned' });
    const rb = go(atLine(b), b, ['(Go in, and weld']);
    expect(rb.node).toBe('weld_burned');
    expect(rb.view()!.speaker).toBe('npc_c9_02');
    expect(b.g.flags.a3_c9).toBeUndefined();
  });
});

// ---------------------------------------------------------------- sealed or opened: the fight

describe('B6j: the column broken on the apron', () => {
  it('drawing makes the column hostile (the wardens, the captain, his sergeant), with Corin and the slope\'s allies beside you', () => {
    const a = apron('truce', ALONE, { a3_ally_shale: true, a3_ally_dogs: true });
    for (const id of ['npc_a3_g15', 'npc_a3_g16', 'npc_a3_g17', 'npc_a3_g18']) expect(here(a.g), id).toContain(id);
    const r = go(atLine(a), a, ['(Break the column.)']);
    expect(r.node).toBe('fight_warn');
    expect(r.view()!.text).toContain('the rifles you called come up off knees');
    go(r, a, ['(Not like this.)']);
    expect(a.g.flags.a3_door_fight).toBeUndefined();
    go(r, a, ['(Break the column.)', '(Draw.)']);
    expect(r.ended).toBe(true);
    expect(a.g.flags.a3_door_fight).toBe(true);
    for (const id of ['npc_a3_g3', 'npc_a3_g4', 'npc_a3_g5', 'npc_a3_g6', 'npc_md_01', 'npc_md_12']) expect(cond(NPCS[id].hostileIf, a.g), id).toBe(true);
    for (const id of ['npc_kn_corin', 'npc_a3_g15', 'npc_a3_g16', 'npc_a3_g17', 'npc_a3_g18']) expect(cond(NPCS[id].ally, a.g), id).toBe(true);
    a.g.flags.a3_corin = 'down';
    expect(cond(NPCS.npc_kn_corin.ally, a.g)).toBe(false);
    expect(cond(DOOR_YIELDS, a.g) || cond(DOOR_BROKEN, a.g)).toBe(false);
  });

  it('two wardens down and the lead standing: he yields; the door sealed (or opened by the ring), the column no longer hostile', () => {
    const a = apron('truce', ALONE);
    go(atLine(a), a, ['(Break the column.)', '(Draw.)']);
    kill(a.g, 'npc_a3_g4_apron');
    expect(cond(DOOR_YIELDS, a.g)).toBe(false);
    kill(a.g, 'npc_a3_g6_apron');
    expect(cond(DOOR_YIELDS, a.g)).toBe(true);
    expect(cond(trig('a3_door_yields_open').if, a.g)).toBe(false);
    fireT(a, 'a3_door_yields_shut');
    expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'fought', lowe: 'yielded' });
    expect(cond(NPCS.npc_a3_g3.hostileIf, a.g)).toBe(false);
    for (const id of MAP().triggers!.filter((t) => t.id.startsWith('a3_door_')).map((t) => t.id)) expect(cond(trig(id).if, a.g), id).toBe(false);
    expect(opened(a)).toContain(T);
    const r = talk(T, a.g, a.q);
    expect(r.node).toBe('fought');
    expect(r.view()!.text).toContain('Yielded');
    expect(finish(r, a)).toEqual(['fought', 'mother_kept']);
    expect(talk(T, a.g, a.q).node).toBe('settled');
    const b = apron('truce', ALONE, { a3_inside: true, a3_ring: 'open', a3_ines: 'opens' });
    go(atLine(b), b, ['(Break the column.)', '(Draw.)']);
    kill(b.g, 'npc_a3_g3_apron'); kill(b.g, 'npc_a3_g5_apron');
    fireT(b, 'a3_door_yields_open');
    expect(b.g.flags).toMatchObject({ a3_c9: 'opened', a3_c9_how: 'ines', a3_c9_by: 'fought', a3_lowe: 'yielded' });
    expect(talk(T, b.g, b.q).view()!.text).toContain('the door opens from inside');
  });

  it('the lead down: the column broken; Lowe is dead to every later reader', () => {
    const a = apron('truce', ALONE);
    go(atLine(a), a, ['(Break the column.)', '(Draw.)']);
    kill(a.g, 'npc_md_01_apron');
    expect(cond(DOOR_BROKEN, a.g)).toBe(true);
    fireT(a, 'a3_door_broken_shut');
    expect(C9(a.g)).toEqual({ c9: 'sealed', how: 'fought', lowe: 'dead' });
    expect(cond(LOWE_DEAD, a.g)).toBe(true);
    // Reyes leading: her own death breaks it
    const b = apron('truce', ALONE);
    kill(b.g, 'npc_md_01');
    go(atLine(b), b, ['(Break the column.)', '(Draw.)']);
    kill(b.g, 'npc_md_12_apron');
    expect(cond(DOOR_BROKEN, b.g)).toBe(true);
  });
});

// ---------------------------------------------------------------- relocated: the word, and Tamsin in the door

describe('B6j: relocated — the designate\'s word, Tamsin\'s red line, and the one way she dies', () => {
  it('"carry on", asked twice: the column carries Reserve 9 west; MOTHER has nobody to thank; a waiting Tamsin does not come back', () => {
    const a = apron('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { a3_pell: 'fit' });
    const r = go(atLine(a), a, [ORDER]);
    expect(r.node).toBe('order_warn');
    expect(r.view()!.text).toContain('the word and not the weather');
    go(r, a, ['No. Not yet.']);
    expect(r.node).toBe('line');
    go(r, a, [ORDER, ORDER]);
    expect(r.node).toBe('order');
    expect(r.view()!.text).toContain('Sayer Quist does not go');
    expect(C9(a.g)).toEqual({ c9: 'relocated', how: 'order', lowe: 'carried' });
    expect(finish(r, a)).toEqual(['order', 'tam_hears', 'mother_empty']);
    expect(a.g.flags).toMatchObject({ tam_left: 'reserve', a3_mother: 'knock' });
    expect(a.g.flags.a3_tamsin_dead).toBeUndefined();
    expect(stage(a.g, 'q_a3_cistern')).toBe('relocated');
    expect(talk('d_c9_tamsin', a.g, a.q).node).toBe('a3_red');
    expect(talk('d_kn_hatch', a.g, a.q).view()!.text).toContain('runs back in');
  });

  it('with Tamsin travelling the word sends her into the door; "not over her" leaves it unsettled with her in it', () => {
    const a = apron('truce', { companions: { tamsin: 'party', nine: 'never' } });
    const r = go(atLine(a), a, [ORDER, ORDER]);
    expect(r.node).toBe('tam_stand');
    expect(r.view()!.speaker).toBe(TAMSIN);
    expect(r.view()!.text).toContain('gone from your side');
    expect(r.view()!.text).toContain('She looks at you once');
    expect(a.g.flags).toMatchObject({ a3_tam_door: true, tam_left: 'door', a3_door_word: 'order' });
    expect(a.g.world.party).not.toContain(TAMSIN);
    go(r, a, [GO]);
    expect(r.node).toBe('tam_door');
    go(r, a, [GO]);
    expect(r.node).toBe('force_ask');
    go(r, a, ['No. Not over her.']);
    expect(r.node).toBe('relent');
    expect(a.g.flags.a3_c9).toBeUndefined();
    expect(a.g.flags.a3_door_word).toBe(false);
    expect(here(a.g)).toContain('npc_c9_03_door');
    expect(MAPS.shale.npcs!.filter((p) => p.def === TAMSIN).some((p) => cond(p.if, a.g))).toBe(false);
    go(r, a, [GO]);
    expect(r.view()!.text).toContain('Tamsin sits in the door');
    expect(talk('d_a3_tam_door', a.g, a.q).view()!.text).toContain('does not look at you');
    // the word again goes straight to her in the door; force kills her there, and only then
    go(r, a, [ORDER, ORDER]);
    expect(r.node).toBe('tam_door');
    go(r, a, [GO, '(Give the word.) Force it.']);
    expect(r.node).toBe('forced');
    expect(a.g.flags).toMatchObject({ a3_tamsin_dead: true, a3_door_forced: true, a3_c9: 'relocated', a3_c9_how: 'forced', a3_lowe: 'carried' });
    expect(cond(ON_SIDE('tamsin'), a.g)).toBe(false);
    expect(cond(COMPANIONS.tamsin.gone!, a.g)).toBe(true);
    expect(here(a.g)).not.toContain('npc_c9_03_door');
    expect(finish(r, a)).toEqual(['forced', 'order', 'mother_empty']);
    expect(a.g.world.news.some((n) => n.tag === 'a3_tamsin_dead')).toBe(true);
  });

  it('Tamsin still inside (never out) stands in the door from inside; she is not in the party to leave it', () => {
    const a = apron('truce', { companions: { tamsin: 'inside', nine: 'never' } }, { a3_inside: true });
    const r = go(atLine(a), a, [ORDER, ORDER]);
    expect(r.node).toBe('tam_stand');
    expect(r.view()!.text).toContain('who never came out');
    expect(a.g.flags.a3_tam_door).toBe(true);
    expect(a.g.flags.tam_left).toBeUndefined();
  });

  it('her death needs the door forced while she stands in it: no other road to any outcome sets it', () => {
    const roads: [Preset, Over, Flags, string[]][] = [
      ['prepared', {}, {}, [DOWN, GO]],
      ['truce', {}, { a3_pell: 'unfit' }, ['Doc Pell has something', '(Let the charts stand.)']],
      ['truce', {}, { a3_inside: true, a3_ring: 'city' }, ['They\'ve voted to come', 'Let them come out.']],
      ['truce', { items: ['k_a3_intake'] }, { a3_guild_in: true, a3_guild: 'paper_held' }, ['(Take the guild\'s paper', '(Sign it.)', GO, GO, 'No. Not over her.']],
      ['truce', {}, {}, [ORDER, ORDER, GO, GO, 'No. Not over her.']],
    ];
    for (const [preset, over, flags, picks] of roads) {
      const a = apron(preset, { ...over, companions: { tamsin: 'party', nine: 'never' } }, flags);
      eff(a.g, 'speech', 70);
      go(atLine(a), a, picks);
      expect(a.g.flags.a3_tamsin_dead, picks.join(' > ')).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------- Nine's break

describe('B6j: Nine\'s break — the captain orders the city\'s unit to take her out of the door', () => {
  const toNine = (a: A3) => go(atLine(a), a, [ORDER, ORDER, GO, GO]);

  it('its own keeper: "the keeper declines"; Nine stays', () => {
    const a = apron('prepared', { companions: { tamsin: 'party', nine: 'party' } });
    const r = toNine(a);
    expect(r.node).toBe('nine_order');
    go(r, a, [GO]);
    expect(r.node).toBe('nine_self');
    expect(r.view()!.text).toContain('The keeper declines');
    go(r, a, [GO]);
    expect(r.node).toBe('force_ask');
    expect(a.g.world.party).toContain(NINE);
    // the break comes once: the word again goes straight to the force
    go(r, a, ['No. Not over her.', GO, ORDER, ORDER, GO]);
    expect(r.node).toBe('force_ask');
  });

  it('the player\'s unit: ordered, it refuses the only order it ever refuses and leaves for good; or the keeper declines for it', () => {
    const a = apron('truce', { companions: { tamsin: 'party', nine: 'party' } });
    const r = go(toNine(a), a, [GO]);
    expect(r.node).toBe('nine_keeper');
    go(r, a, ['Take her out of the door, Nine.']);
    expect(r.node).toBe('nine_refuses');
    expect(a.g.flags).toMatchObject({ nine_gone: true, nine_left: 'door' });
    expect(a.g.world.party).not.toContain(NINE);
    expect(cond(ON_SIDE('nine'), a.g)).toBe(false);
    const b = apron('truce', { companions: { tamsin: 'party', nine: 'party' } });
    const rb = go(toNine(b), b, [GO, 'No. It isn\'t.']);
    expect(rb.node).toBe('nine_not');
    expect(b.g.world.party).toContain(NINE);
  });

  it('the city\'s unit, conscience: it refuses and is struck off, unless the designate stands with it (Speech 45, or the fight)', () => {
    const conscience = () => apron('prepared', { companions: { tamsin: 'party', nine: 'party' } }, { nine_deed: 'city' });
    const a = conscience();
    const r = go(toNine(a), a, [GO]);
    expect(r.node).toBe('nine_conscience');
    // −10 his trust
    expect(check(r, 'Captain. It is a unit')).toBe('Speech 35');
    go(r, a, ['Captain. It is a unit']);
    expect(r.node).toBe('nine_spared');
    expect(a.g.flags.a3_nine_struck).toBeUndefined();
    expect(a.g.world.party).toContain(NINE);
    const b = conscience();
    eff(b.g, 'speech', 20);
    const rb = go(toNine(b), b, [GO, 'Captain. It is a unit']);
    expect(rb.node).toBe('nine_struck');
    expect(b.g.flags).toMatchObject({ a3_nine_struck: true, nine_gone: true });
    expect(cond(ON_SIDE('nine'), b.g)).toBe(false);
    const c = conscience();
    go(toNine(c), c, [GO, '(Say nothing.)']);
    expect(c.g.flags.a3_nine_struck).toBe(true);
    const d = conscience();
    const rd = go(toNine(d), d, [GO, '(Stand between the wardens and Nine.)']);
    expect(rd.ended).toBe(true);
    expect(d.g.flags.a3_door_fight).toBe(true);
    expect(d.g.flags.a3_door_word).toBe(false);
  });

  it('the city\'s unit, deputy: it asks to be told to refuse; refuse (the chair\'s first countermand), or obey and it carries her out', () => {
    const deputy = () => apron('truce', { companions: { tamsin: 'party', nine: 'party' } }, { nine_deed: 'city' });
    const a = deputy();
    const r = go(toNine(a), a, [GO]);
    expect(r.node).toBe('nine_deputy');
    go(r, a, ['Refuse, Nine.']);
    expect(r.view()!.text).toContain('first countermand');
    go(r, a, [GO]);
    expect(r.node).toBe('force_ask');
    const b = deputy();
    const rb = go(toNine(b), b, [GO, 'Do as he says.']);
    expect(rb.node).toBe('nine_obeys');
    expect(b.g.flags).toMatchObject({ a3_tam_door: false, a3_tam_carried: true });
    go(rb, b, [GO]);
    expect(rb.node).toBe('order');
    expect(C9(b.g)).toEqual({ c9: 'relocated', how: 'order', lowe: 'carried' });
    expect(b.g.flags.a3_tamsin_dead).toBeUndefined();
    expect(b.g.flags.tam_left).toBe('door');
  });
});

// ---------------------------------------------------------------- relocated: the guild's paper, and the residents' own vote

describe('B6j: relocated — sold to the Weighhouse, or walked out on the ring\'s vote', () => {
  it('the paper signed: the guild walks them up its road; a travelling Wren goes at once (her red line), a waiting one at her next word', () => {
    // (a truce with the guild at the stand: on the guild's own night side Wren's guild red line comes first, B6n)
    const a = apron('truce', { companions: { tamsin: 'never', nine: 'never', wren: 'party' }, items: ['k_a3_intake'], knows: ['a3_weighhouse'] }, { a3_guild_in: true, a3_guild: 'paper_held' });
    const r = go(atLine(a), a, ['(Take the guild\'s paper out of your pack.)']);
    expect(r.node).toBe('sold_warn');
    expect(r.view()!.text).toContain('written "fulfilled"');
    go(r, a, ['(Close the folder.)']);
    expect(a.g.flags.a3_c9).toBeUndefined();
    go(r, a, ['(Take the guild\'s paper out of your pack.)', '(Sign it.)']);
    expect(r.node).toBe('sold');
    expect(r.view()!.text).toContain('Brannick Hale walks them');
    expect(C9(a.g)).toEqual({ c9: 'relocated', how: 'sold', lowe: 'carried' });
    expect(a.g.flags.a3_guild).toBe('signed');
    expect(a.g.pc.inventory.items.some((i) => i.def === 'k_a3_intake')).toBe(false);
    expect(finish(r, a)).toEqual(['sold', 'wren_sold', 'mother_empty']);
    expect(a.g.flags.wren_left).toBe('sold');
    expect(a.g.world.party).not.toContain(WREN);
    const b = apron('truce', { companions: { tamsin: 'never', nine: 'never', wren: 'waiting' }, items: ['k_a3_intake'] }, { a3_guild_in: true, a3_guild: 'paper_held', a3_hale: 'answered' });
    const rb = go(atLine(b), b, ['(Take the guild\'s paper out of your pack.)', '(Sign it.)']);
    expect(rb.view()!.text).toContain('There is nobody at Knock to walk them');
    expect(finish(rb, b)).toEqual(['sold', 'mother_empty']);
    expect(b.g.flags.wren_left).toBeUndefined();
    const w = talk('d_rd_wren', b.g, b.q);
    expect(w.node).toBe('a3_sold');
    go(w, b, ['(Let her go.)']);
    expect(b.g.flags.wren_left).toBe('sold');
  });

  it('Orme offers the paper once more at the door when it was refused (take it, or refuse again); never once it is torn', () => {
    const a = apron('guild', { companions: { tamsin: 'never', nine: 'never' } }, { a3_guild_in: true, a3_guild: 'refused' });
    const r = go(atLine(a), a, ['(Orme has come down']);
    expect(r.view()!.speaker).toBe('npc_kn_factor');
    expect(r.view()!.text).toContain('Once more, love');
    go(r, a, ['No. Nobody behind that door is for sale.', GO]);
    expect(a.g.flags.a3_guild).toBe('refused');
    expect(opts(r).some((x) => x.startsWith('(Orme has come down'))).toBe(false);
    const b = apron('guild', { companions: { tamsin: 'never', nine: 'never' } }, { a3_guild_in: true });
    const rb = go(atLine(b), b, ['(Orme has come down']);
    expect(rb.view()!.text).toContain('CONCERN OF HALCYON');
    go(rb, b, ['(Take the folder.)']);
    expect(rb.node).toBe('sold_warn');
    expect(b.g.flags.a3_guild).toBe('paper_held');
    const c = apron('guild', { companions: { tamsin: 'never', nine: 'never' } }, { a3_guild_in: true, a3_guild: 'refused', a3_guild_torn: true });
    const oc = opts(atLine(c));
    expect(oc.some((x) => x.startsWith('(Orme has come down') || x.startsWith('(Take the guild\'s paper'))).toBe(false);
    const d = apron('truce', ALONE);
    expect(opts(atLine(d)).some((x) => x.startsWith('(Orme has come down'))).toBe(false);
  });

  it('the paper signed with Tamsin travelling: she goes into the door; forced over her, she dies and they go to the Weighhouse', () => {
    const a = apron('truce', { companions: { tamsin: 'party', nine: 'never' }, items: ['k_a3_intake'] }, { a3_guild_in: true, a3_guild: 'paper_held' });
    const r = go(atLine(a), a, ['(Take the guild\'s paper out of your pack.)', '(Sign it.)']);
    expect(r.node).toBe('tam_stand');
    expect(a.g.flags.a3_door_word).toBe('sold');
    go(r, a, [GO, GO, '(Give the word.) Force it.']);
    expect(a.g.flags).toMatchObject({ a3_tamsin_dead: true, a3_c9: 'relocated', a3_c9_how: 'sold', a3_guild: 'signed' });
    expect(finish(r, a)).toEqual(['forced', 'sold', 'mother_empty']);
  });

  it('the ring voted for the city: the residents walk out on their own feet; only that, Pell\'s charts or "not yet" at the line', () => {
    const a = apron('truce', { companions: { tamsin: 'party', nine: 'never' } }, { a3_inside: true, a3_ring: 'city' });
    const r = atLine(a);
    expect(opts(r).filter((x) => !x.startsWith('Where') && !x.startsWith('And if'))).toEqual(['They\'ve voted to come with you. On their own feet.', NOT_YET]);
    go(r, a, ['They\'ve voted to come', 'Not yet.']);
    expect(a.g.flags.a3_c9).toBeUndefined();
    go(r, a, ['They\'ve voted to come', 'Let them come out.']);
    expect(r.node).toBe('consent_done');
    expect(C9(a.g)).toEqual({ c9: 'relocated', how: 'consent', lowe: 'carried' });
    // not her red line: she stays with the player
    expect(a.g.flags.a3_tam_door).toBeUndefined();
    expect(a.g.world.party).toContain(TAMSIN);
    expect(finish(r, a)).toEqual(['consent_done', 'mother_empty']);
    const b = apron('truce', ALONE, { a3_inside: true, a3_ring: 'city', a3_pell: 'unfit' });
    expect(opts(atLine(b))).toContain('Doc Pell has something for you to read.');
  });
});

// ---------------------------------------------------------------- Kes, MOTHER, a broken Tamsin, the props after

describe('B6j: Kes numbed, MOTHER after, a broken Tamsin won back, Knock\'s hatch and door after', () => {
  it('Kes is numbed at the line when the guild or the Concern is in play and her link is kept; not when it is cut, or nobody is there', () => {
    const a = apron('prepared', { companions: { tamsin: 'waiting', kes: 'party' } }, { a3_guild_in: true });
    const r = go(talk(T, a.g, a.q), a, ['(Look up the slope.)', GO]);
    expect(r.node).toBe('kes');
    expect(r.view()!.speaker).toBe('npc_hs_01');
    expect(a.g.flags.a3_kes_numbed).toBe(true);
    go(r, a, [GO]);
    expect(r.node).toBe('line');
    for (const flags of [{ a3_guild_in: true, kes_link: 'cut' }, {}] as Flags[]) {
      const b = apron('prepared', { companions: { tamsin: 'waiting', kes: 'party' } }, flags);
      expect(go(talk(T, b.g, b.q), b, ['(Look up the slope.)', GO]).node).toBe('line');
      expect(b.g.flags.a3_kes_numbed).toBeUndefined();
    }
  });

  it('MOTHER after the door: kept, knock, or nobody to thank; asleep or burned, no line; MOTHER_AFTER reads it either way', () => {
    const a = apron('prepared', { companions: { tamsin: 'waiting' } }, { a3_mother_ask: 'sealed' });
    const r = go(atLine(a), a, [DOWN, GO, GO]);
    expect(r.node).toBe('mother_kept');
    expect(r.view()!.text).toContain('You told me to keep it shut');
    expect(r.view()!.text).toContain('Halden');
    const b = apron('prepared', { companions: { tamsin: 'waiting' } }, { a3_mother: 'asleep' });
    expect(finish(go(atLine(b), b, [DOWN, GO]), b)).toEqual(['sealed']);
    expect(b.g.flags.a3_mother).toBe('asleep');
    const g = actThree('truce').g;
    expect(modValue(g, MOTHER_AFTER)).toBe('lockdown');
    g.flags.a3_c9 = 'sealed';
    expect(modValue(g, MOTHER_AFTER)).toBe('kept');
    g.flags.a3_c9 = 'opened';
    expect(modValue(g, MOTHER_AFTER)).toBe('knock');
    g.flags.a3_mother = 'burned';
    expect(modValue(g, MOTHER_AFTER)).toBe('burned');
  });

  it('a Tamsin broken in Act 2 is won back by a sealed or opened door, and not by a relocation', () => {
    const a = apron('prepared', { companions: { tamsin: 'waiting' } }, { tam_broken: true });
    expect(finish(go(atLine(a), a, [DOWN, GO]), a)).toEqual(['sealed', 'tam_back', 'mother_kept']);
    expect(a.g.flags.tam_broken).toBe(false);
    const b = apron('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { tam_broken: true });
    expect(finish(go(atLine(b), b, [ORDER, ORDER]), b)).toEqual(['order', 'tam_hears', 'mother_empty']);
    expect(b.g.flags.tam_broken).toBe(true);
    expect(b.g.flags.tam_left).toBe('reserve');
  });

  it('Knock\'s hatch and door, once the door is settled, by how it was settled (the lift still there for a sealed door)', () => {
    const cases: [Flags, string, string][] = [
      [{ a3_c9: 'sealed', a3_c9_how: 'lowe' }, 'somebody on the other side knocks back', 'MOTHER says thank you as she always did'],
      [{ a3_c9: 'opened', a3_c9_how: 'ines' }, 'People go in and out of it', 'says good morning instead of thank you'],
      [{ a3_c9: 'relocated', a3_c9_how: 'order' }, 'open on an empty hall', 'runs back in'],
    ];
    for (const [flags, door, hatch] of cases) {
      const a = game('truce', ALONE, flags);
      expect(talk('d_kn_door', a.g, a.q).view()!.text, door).toContain(door);
      expect(talk('d_kn_hatch', a.g, a.q).view()!.text, hatch).toContain(hatch);
    }
    const s = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lift: 'hatch', a3_inside: true });
    expect(talk('d_kn_hatch', s.g, s.q).view()!.options.map((o) => o.text)).toContain('(Climb down the lift shaft.)');
    const o = game('truce', ALONE, { a3_c9: 'opened', a3_c9_how: 'ines' });
    expect(talk('d_kn_door', o.g, o.q).view()!.options.map((x) => x.text)).toContain('(Walk in.)');
  });
});

// ---------------------------------------------------------------- saves, the map, the trees, the content

describe('B6j: saves, the map, the trees and the content', () => {
  it('a save with Tamsin in the door resumes the line as it stood; settled after, a second save keeps every outcome', async () => {
    const a = apron('prepared', { companions: { tamsin: 'party', nine: 'never' } });
    go(atLine(a), a, [ORDER, ORDER, GO, GO, 'No. Not over her.']);
    const mid = await saveAndLoad(a.g);
    mid.q.update();
    expect(mid.g.flags).toMatchObject({ a3_tam_door: true, tam_left: 'door', a3_door_word: false, a3_column_apron: true });
    expect(mid.g.world.party).not.toContain(TAMSIN);
    expect(new DialogueRunner(DIALOGUES[T], mid.g, mid.q).node).toBe('line');
    expect(here(mid.g)).toContain('npc_c9_03_door');
    const r = go(talk(T, mid.g, mid.q), mid, [DOWN]);
    expect(r.node).toBe('down');
    finish(go(r, mid, [GO]), mid);
    const end = await saveAndLoad(mid.g);
    end.q.update();
    for (const [k, v] of Object.entries({ a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down', a3_mother: 'kept', a3_tam_door: true, tam_left: 'door' })) expect(end.g.flags[k], k).toBe(v);
    expect(end.g.flags.a3_tamsin_dead).toBeUndefined();
    expect(stage(end.g, 'q_a3_cistern')).toBe('sealed');
    expect(new DialogueRunner(DIALOGUES[T], end.g, end.q).node).toBe('settled');
    expect(here(end.g)).not.toContain('npc_c9_03_door');
    expect(talk('d_c9_tamsin', end.g, end.q).node).toBe('a3_red');
  });

  it('the map mirrors the shared conditions: the column\'s placements, the line\'s trigger and the fight\'s four ends', () => {
    const P = (id: string) => MAP().npcs!.find((p) => p.id === id)!.if as Cond;
    const RING_OPEN: Cond = { flag: 'a3_ring', eq: 'open' };
    const states: Flags[] = [
      {}, { a3_column_apron: true }, { a3_column_apron: true, a3_door_fight: true }, { a3_column_apron: true, a3_c9: 'sealed' },
      { a3_column_apron: true, a3_door_fight: true, a3_ring: 'open' },
    ];
    const deaths: string[][] = [[], ['npc_md_01'], ['npc_md_01', 'npc_md_12'], ['npc_md_01_apron'], ['npc_a3_g3_apron', 'npc_a3_g6_apron'], ['npc_md_01', 'npc_a3_g4', 'npc_a3_g5_apron'], ['npc_md_01', 'npc_md_12', 'npc_a3_g3_apron']];
    for (const flags of states) for (const dead of deaths) {
      const a = game('truce', ALONE, flags);
      for (const d of dead) kill(a.g, d);
      const tag = `${JSON.stringify(flags)} ${dead.join(',')}`;
      expect(cond(P('npc_md_01_apron'), a.g), tag).toBe(cond({ all: [COLUMN_APRON, LED_BY_LOWE] }, a.g));
      expect(cond(P('npc_md_12_apron'), a.g), tag).toBe(cond({ all: [COLUMN_APRON, LED_BY_REYES] }, a.g));
      expect(cond(trig('a3_door_line').if, a.g), tag).toBe(cond(COLUMN_APRON, a.g));
      expect(cond(trig('a3_door_broken_open').if, a.g), tag).toBe(cond({ all: [DOOR_BROKEN, RING_OPEN] }, a.g));
      expect(cond(trig('a3_door_broken_shut').if, a.g), tag).toBe(cond({ all: [DOOR_BROKEN, { not: RING_OPEN }] }, a.g));
      expect(cond(trig('a3_door_yields_open').if, a.g), tag).toBe(cond({ all: [DOOR_YIELDS, RING_OPEN] }, a.g));
      expect(cond(trig('a3_door_yields_shut').if, a.g), tag).toBe(cond({ all: [DOOR_YIELDS, { not: RING_OPEN }] }, a.g));
    }
    // the four on the slope: women narrow, men broad; found names; on open ground
    for (const id of ['npc_a3_g15', 'npc_a3_g18']) expect(NPCS[id].look.frame, id).toBe('narrow');
    for (const id of ['npc_a3_g16', 'npc_a3_g17']) expect(NPCS[id].look.frame, id).toBe('broad');
  });

  it('every node has a line for coming back to it (U7), or only leaves; all seven companions speak', () => {
    const speakers = new Set<string>();
    const nodes = [...A3_DOOR_DIALOGUES.flatMap((d) => Object.entries(d.nodes)), ...Object.entries(LOWE_GO_NODES), ...Object.entries(A3X_NODES)];
    for (const [k, n] of nodes) {
      if (!n.options.every((o) => o.exit)) expect(n.again, k).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    }
    expect(Object.keys(DIALOGUES[T].nodes).length).toBeGreaterThanOrEqual(45);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
    for (const n of ['a3_sold']) expect(DIALOGUES.d_rd_wren.nodes[n].again, n).toBeDefined();
    expect(DIALOGUES.d_c9_tamsin.nodes.a3_red.again).toBeDefined();
  });

  it('the flags are in the Act 3 registry; the quest has the door\'s routes; the content validates', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6j (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_c9 ', 'a3_c9_how', 'a3_c9_by', 'a3_lowe ', 'a3_tam_door', 'a3_tamsin_dead', 'a3_nine_struck', 'a3_door_fight', 'a3_mother', 'a3_claim', 'a3_door_word',
      'a3_door_forced', 'a3_tam_carried', 'a3_nine_asked', 'a3_nine_spared', 'a3_nine_countermand', 'a3_kes_numbed', 'a3_column_apron', 'wren_left', 'tam_left', 'nine_left',
      'a3_door_line', 'a3_door_declined', 'a3_attending', 'a3_door_fought_seen']) expect(block.includes(f), f).toBe(true);
    const routes = QUESTS.q_a3_cistern.routes!.map((r) => r.id);
    for (const r of ['lowe', 'stay', 'unfit', 'welded', 'fought', 'word', 'open', 'consent', 'sold']) expect(routes, r).toContain(r);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|c9_mouth|shale|d_kn_|d_rd_wren|d_c9_tamsin/.test(e))).toEqual([]);
  });
});
