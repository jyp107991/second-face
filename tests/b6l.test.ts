import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_CLOSE_DIALOGUES, COMFORT_WORD_NODES, MARWOOD_BACK_NODES, SARR_TERMS_NODES } from '../src/content/dialogue/a3_close';
import {
  AT_CLOSE, CALLA_CASE_OPEN, CALLA_FREE, CALLA_HELD, CLAUSES, COMPANIONS, COMPANION_KEYS, C_BUYER, E_PREC, E_REG, LOWE_CLOSE, NINE, NINE_WALKIN, QUILL_COMES, REYES_CLOSE,
  SOTO_COMES, UW_CLOSE, WITH_YOU, type CompanionKey,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { skill } from '../src/engine/stats/sheet';
import type { SkillId } from '../src/engine/stats/rules';
import { apply, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, has, saveAndLoad, talk, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6l — the close: who came. After the Cistern's door and the Ledger's card, the Spire's close gathers whoever the player's road
 * made, each by the flags that decide it: the companions on their side round the fire barrel, a hidden Nine walking in, the
 * Concern's officer (Soto or Quill) and the paper he always offers, the Grand Factor's copy after a refusal, the column's lead
 * (Lowe or Reyes) by what the door made of him, the Unwritten turned at Knock, the allies' envoys and readers. Also the Court's
 * register asked back of the catalogue (three routes), and keystone 7's trial at the Court (only while Calla is held). Every
 * route, each refusal and failed check, nothing resolving unasked, the map's mirror of the shared conditions, and a save
 * round-trip. Played headless with the shared Act 3 fixture.
 */

type Flags = Record<string, string | boolean | number>;
interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[] };
const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down' };
/** Act 3 after the door, at the Spire's close, with the Ledger's card come (or not, with `card: false`). */
function close(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}, card = true): Game {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  const a = { ...actThree(preset, { at: 'md_spire', ...over, host, flags: { ...AFTER_DOOR, ...(card ? { a3_summoned: true } : {}), ...(over.flags ?? {}), ...flags } }), events };
  a.g.pc.sheet.name = 'Halden';
  a.q.update();
  return a;
}
const MAP = () => MAPS.md_spire;
const here = (g: G, map = 'md_spire') => MAPS[map].npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const P = (key: string, map = 'md_spire') => MAPS[map].npcs!.find((p) => (p.id ?? p.def) === key)!;
const kill = (g: G, id: string, map = 'md_spire') => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const passives = (r: DialogueRunner) => r.view()!.passives.map((p) => p.label);
function go(r: DialogueRunner, a: A3, picks: string[]): DialogueRunner {
  for (const p of picks) {
    const o = r.view()?.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`no option "${p}" at ${r.node} in [${r.view()?.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
  return r;
}
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const at = (g: G, h: number) => { g.minutes = Math.floor(g.minutes / 1440) * 1440 + h * 60; };
const tolls = (g: G) => g.pc.inventory.tolls;
/** Every placement this slice adds to the close. */
const CLOSE_KEYS = [...COMPANION_KEYS.map((c) => COMPANIONS[c].id), 'npc_md_nine_walkin', 'npc_hc_02', 'npc_cr_11', 'npc_md_01', 'npc_md_12', 'npc_of_02', 'npc_a3_u1', 'npc_a3_u2', 'npc_a3_u3', 'npc_a3_31', 'npc_a3_32', 'npc_a3_33', 'npc_a3_34', 'npc_bw_04', 'npc_nw_04'];
const ALLIES = { npc_a3_31: 'choir', npc_a3_32: 'wheel', npc_a3_33: 'stand', npc_a3_34: 'gangs', npc_bw_04: 'saints', npc_nw_04: 'seventeen' } as const;
const ALL_ALLIES: Flags = Object.fromEntries(Object.values(ALLIES).map((a) => [`a3_ally_${a}`, true]));

// ---------------------------------------------------------------- who came

describe('B6l: who came to the close, each by the flags that decide it', () => {
  it('nobody is gathered before the Ledger\'s card or after the steps; after the card, the ones on the player\'s side and not on the road', () => {
    const before = close('prepared', {}, ALL_ALLIES, false);
    for (const k of CLOSE_KEYS) expect(here(before.g), k).not.toContain(k);
    const a = close('prepared');
    // prepared: Tamsin and Nine travel; the other five wait
    for (const c of ['ash', 'wren', 'ilya', 'odile', 'kes'] as CompanionKey[]) expect(here(a.g), c).toContain(COMPANIONS[c].id);
    for (const c of ['tamsin', 'nine'] as CompanionKey[]) expect(here(a.g), c).not.toContain(COMPANIONS[c].id);
    expect(here(a.g)).toContain('npc_cr_11');
    expect(here(a.g)).toContain('npc_md_01');
    const after = close('prepared', {}, { ...ALL_ALLIES, a3_pnr: true, a3_unwritten: 'with_you' });
    for (const k of CLOSE_KEYS) expect(here(after.g), k).not.toContain(k);
    // the companions' own trees take them back into the party from the fire
    const r = talk('d_of_ash', a.g, a.q);
    expect(r.node).toBe('waiting');
    go(r, a, ['We\'re going.']);
    expect(a.g.world.party).toContain('npc_of_03');
    expect(here(a.g)).not.toContain('npc_of_03');
  });

  it('a companion who left, is gone, never joined, or is a Tamsin broken in Act 2 does not come; the left come back when won back', () => {
    const est = close('prepared', { companions: 'estranged' });
    for (const c of COMPANION_KEYS) expect(here(est.g), c).not.toContain(COMPANIONS[c].id);
    const none = close('prepared', { companions: 'nobody' });
    for (const c of COMPANION_KEYS) expect(here(none.g), c).not.toContain(COMPANIONS[c].id);
    const broken = close('prepared', { companions: { tamsin: 'waiting' } }, { tam_broken: true });
    expect(here(broken.g)).not.toContain('npc_c9_03');
    broken.g.flags.tam_broken = false;
    expect(here(broken.g)).toContain('npc_c9_03');
    const dead = close('prepared', { companions: { tamsin: 'waiting' } }, { a3_tamsin_dead: true });
    expect(here(dead.g)).not.toContain('npc_c9_03');
    const struck = close('prepared', { companions: { nine: 'waiting' } }, { a3_nine_struck: true });
    expect(here(struck.g)).not.toContain('npc_md_nine');
  });

  it('the placements mirror the shared conditions over many states (companions, the officer, the captain, the Unwritten)', () => {
    const states: [Preset, Over, Flags][] = [
      ['prepared', {}, {}], ['prepared', { companions: 'everyone' }, {}], ['prepared', { companions: 'estranged' }, {}], ['hostile', {}, {}],
      ['prepared', { b4b: true }, {}], ['guild', { b4b: true }, { tam_broken: true }], ['truce', { companions: { nine: 'waiting' } }, { a3_nine_hid: 'clover' }],
      ['truce', { companions: { nine: 'waiting' } }, { a3_nine_hid: 'hulls', a3_nine_fetched: true }], ['choir', {}, { a3_unwritten: 'with_you' }],
      ['ledger', {}, { a3_unwritten: 'gone', a3_pnr: true }],
    ];
    const deaths: string[][] = [[], ['npc_md_01'], ['npc_md_01_apron', 'npc_md_12'], ['npc_cr_11'], ['npc_hc_02', 'npc_of_02']];
    for (const [preset, over, flags] of states) for (const dead of deaths) for (const card of [true, false]) {
      const a = close(preset, over, flags, card);
      for (const d of dead) kill(a.g, d, d.endsWith('_apron') ? 'c9_mouth' : 'md_precinct');
      const tag = `${preset} ${JSON.stringify(flags)} ${dead.join(',')} card=${card}`;
      for (const c of COMPANION_KEYS) {
        const id = COMPANIONS[c].id;
        const want: Cond = { all: [AT_CLOSE, WITH_YOU(c), { not: { inParty: id } }, ...(c === 'nine' ? [{ not: NINE_WALKIN }] : [])] };
        expect(cond(P(id).if, a.g), `${c} ${tag}`).toBe(cond(want, a.g));
      }
      expect(cond(P('npc_md_nine_walkin').if, a.g), tag).toBe(cond({ all: [AT_CLOSE, WITH_YOU('nine'), { not: { inParty: NINE } }, NINE_WALKIN] }, a.g));
      expect(cond(P('npc_hc_02').if, a.g), tag).toBe(cond({ all: [AT_CLOSE, SOTO_COMES] }, a.g));
      expect(cond(P('npc_cr_11').if, a.g), tag).toBe(cond({ all: [AT_CLOSE, QUILL_COMES] }, a.g));
      expect(cond(P('npc_md_01').if, a.g), tag).toBe(cond(LOWE_CLOSE, a.g));
      expect(cond(P('npc_md_12').if, a.g), tag).toBe(cond(REYES_CLOSE, a.g));
      expect(cond(P('npc_of_02').if, a.g) || cond(P('npc_a3_u1').if, a.g), tag).toBe(cond(UW_CLOSE, a.g) && !(cond({ dead: 'npc_of_02' }, a.g) && cond({ dead: 'npc_a3_u1' }, a.g)));
    }
  });

  it('the Concern sends Director Soto if the player met her at Halcyon, else Mr Quill; nobody if both are dead', () => {
    const q = close('prepared');
    expect(here(q.g)).toContain('npc_cr_11');
    expect(here(q.g)).not.toContain('npc_hc_02');
    expect(P('npc_cr_11').dialogue).toBe('d_a3_quill');
    const s = close('prepared', { b4b: true });
    expect(here(s.g)).toContain('npc_hc_02');
    expect(here(s.g)).not.toContain('npc_cr_11');
    kill(s.g, 'npc_hc_02', 'hc_board');
    expect(here(s.g)).toContain('npc_cr_11');
    kill(s.g, 'npc_cr_11', 'md_crown');
    expect(here(s.g).filter((k) => k === 'npc_hc_02' || k === 'npc_cr_11')).toEqual([]);
    // their home placements step aside while they are at the close
    expect(here(q.g, 'md_crown')).not.toContain('npc_cr_11');
    expect(here(close('truce', {}, {}, false).g, 'md_crown')).toContain('npc_cr_11'); // (prepared exposed the Concern at the Crown: he left)
    expect(here(close('prepared', {}, {}, false).g, 'md_crown')).not.toContain('npc_cr_11');
    expect(here(s.g, 'hc_board')).not.toContain('npc_hc_02');
    expect(here(close('prepared', { b4b: true }, {}, false).g, 'hc_board')).toContain('npc_hc_02');
  });

  it('Lowe keeps the close while he lives (and leaves his desk); Reyes if he died before the door or on its apron; nobody if both did', () => {
    const a = close('truce');
    expect(here(a.g)).toContain('npc_md_01');
    expect(here(a.g, 'md_precinct')).not.toContain('npc_md_01');
    expect(here(close('truce', {}, {}, false).g, 'md_precinct')).toContain('npc_md_01');
    const b = close('truce');
    kill(b.g, 'npc_md_01_apron', 'c9_mouth');
    expect(here(b.g)).toContain('npc_md_12');
    expect(here(b.g)).not.toContain('npc_md_01');
    expect(here(b.g, 'md_precinct')).not.toContain('npc_md_01');
    expect(here(b.g, 'md_precinct')).not.toContain('npc_md_12');
    const rr = talk('d_a3_lowe_close', b.g, b.q);
    expect(rr.node).toBe('r_intro');
    expect(rr.view()!.speaker).toBe('npc_md_12');
    expect(rr.view()!.text).toContain('since your apron');
    expect(talk('d_a3_lowe_close', b.g, b.q).node).toBe('r_hub');
    const c = close('truce');
    kill(c.g, 'npc_md_01', 'md_precinct'); kill(c.g, 'npc_md_12', 'md_precinct');
    expect(here(c.g).filter((k) => k === 'npc_md_01' || k === 'npc_md_12')).toEqual([]);
    // a Lowe killed on Knock's apron is never at his desk again either (before the card too)
    const d = close('truce', {}, {}, false);
    kill(d.g, 'npc_md_01_apron', 'c9_mouth');
    expect(here(d.g, 'md_precinct')).not.toContain('npc_md_01');
  });

  it('the Unwritten come only when turned at Knock (with_you): Petra and her two, or Juniper leading when Petra is dead; Petra leaves Openfield', () => {
    for (const v of [undefined, 'gone', 'stopped', 'burning']) {
      const a = close('choir', {}, v ? { a3_unwritten: v } : {});
      for (const k of ['npc_of_02', 'npc_a3_u1', 'npc_a3_u2', 'npc_a3_u3']) expect(here(a.g), `${v} ${k}`).not.toContain(k);
    }
    const a = close('choir', {}, { a3_unwritten: 'with_you' });
    expect(here(a.g)).toEqual(expect.arrayContaining(['npc_of_02', 'npc_a3_u2', 'npc_a3_u3']));
    expect(here(a.g)).not.toContain('npc_a3_u1');
    expect(here(a.g, 'openfield')).not.toContain('npc_of_02');
    const r = talk('d_a3_petra_close', a.g, a.q);
    expect(r.node).toBe('p_intro');
    expect(r.view()!.text).toContain('Not for you. For the book.');
    go(r, a, ['And if I come down those steps in their sash?']);
    expect(r.view()!.text).toContain('You\'re the book.');
    go(r, a, ['(Back.)']);
    expect(opts(r).some((o) => o.startsWith('And if I come down'))).toBe(false);
    expect(talk('d_a3_thaddeus_close', a.g, a.q).view()!.text).toContain('I\'ll watch you go up.');
    const j = close('choir', {}, { a3_unwritten: 'with_you' });
    kill(j.g, 'npc_of_02', 'c9_mouth');
    expect(here(j.g)).toContain('npc_a3_u1');
    expect(here(j.g)).not.toContain('npc_of_02');
    const rj = talk('d_a3_petra_close', j.g, j.q);
    expect(rj.node).toBe('j_intro');
    expect(rj.view()!.speaker).toBe('npc_a3_u1');
    expect(opts(rj).some((o) => o.startsWith('Your father'))).toBe(false);
  });

  it('each ally that counts at the close sends its own (or its reader comes) only when called; the readers leave home for it', () => {
    const none = close('truce');
    for (const k of Object.keys(ALLIES)) expect(here(none.g), k).not.toContain(k);
    for (const [k, ally] of Object.entries(ALLIES)) {
      const a = close('truce', {}, { [`a3_ally_${ally}`]: true });
      expect(here(a.g), ally).toContain(k);
      for (const other of Object.keys(ALLIES).filter((o) => o !== k)) expect(here(a.g), `${ally} ${other}`).not.toContain(other);
      const tree = P(k).dialogue ?? NPCS[k].dialogue!;
      const r = talk(tree, a.g, a.q);
      expect(r.node, ally).toBe('intro');
      expect(a.g.world.knowledge[`a3_close_${ally}`], ally).toBe(true);
      expect(talk(tree, a.g, a.q).node).toBe('hub');
    }
    // Verity leaves the Saints' tower for the close; Seventeen has no home placement once the dam's truth is out
    const v = close('truce', {}, { a3_ally_saints: true });
    expect(here(v.g, 'md_bridgeward')).not.toContain('npc_bw_04');
    expect(here(close('truce').g, 'md_bridgeward')).toContain('npc_bw_04');
    // the four envoys: women narrow, men broad; found names, one each
    for (const id of ['npc_a3_31', 'npc_a3_33']) expect(NPCS[id].look.frame, id).toBe('narrow');
    for (const id of ['npc_a3_32', 'npc_a3_34']) expect(NPCS[id].look.frame, id).toBe('broad');
  });

  it('a Nine hidden from the recall and never fetched walks in written off; fetched, it is the waiting Nine at the fire', () => {
    const a = close('truce', { companions: { nine: 'waiting' } }, { a3_recall: 'hidden', a3_nine_hid: 'clover' });
    expect(here(a.g)).toContain('npc_md_nine_walkin');
    expect(here(a.g)).not.toContain('npc_md_nine');
    const r = talk('d_a3_nine_walkin', a.g, a.q);
    expect(r.view()!.text).toContain('NOT FOUND');
    go(r, a, ['Wait here by the fire.']);
    expect(a.g.flags.a3_nine_fetched).toBe(true);
    expect(here(a.g)).not.toContain('npc_md_nine_walkin');
    expect(here(a.g)).toContain('npc_md_nine');
    expect(here(a.g, 'md_ring')).not.toContain('npc_md_nine_clover');
    const b = close('truce', { companions: { nine: 'waiting' } }, { a3_recall: 'hidden', a3_nine_hid: 'hulls' });
    go(talk('d_a3_nine_walkin', b.g, b.q), b, ['We\'re going. Come on.']);
    expect(b.g.world.party).toContain(NINE);
    expect(here(b.g)).not.toContain('npc_md_nine');
  });

  it('the first time on the close after the card, the trigger shows who came, by what is true', () => {
    const t = MAP().triggers!.find((x) => x.id === 'a3_close')!;
    expect(cond(t.if, close('prepared', {}, {}, false).g)).toBe(false);
    const a = close('prepared', {}, { ...ALL_ALLIES, a3_unwritten: 'with_you', ca_squatter: 'catalogued', prec_register: 'catalogued' });
    expect(cond(t.if, a.g)).toBe(true);
    expect(t.once).not.toBe(false);
    apply(t.effects, a.g, a.q);
    expect(a.events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree)).toEqual(['d_a3_close']);
    const r = talk('d_a3_close', a.g, a.q);
    expect(passives(r)).toEqual(expect.arrayContaining(['THE ONES WHO WALKED WITH YOU', 'THE CONCERN', 'THE COLUMN\'S CAPTAIN', 'THE UNWRITTEN', 'THE CHOIR', 'THE WHEEL', 'CARRICK\'S STAND', 'THE CHAIN', 'THE SAINTS', 'AN ASSESSOR OF THE WET', 'THE CATALOGUE']));
    expect(passives(r)).not.toContain('THE DOCKET'); // prepared: Calla is free
    expect(a.g.world.knowledge.a3_close_seen).toBe(true);
    const h = close('hostile', { companions: 'nobody' });
    const rh = talk('d_a3_close', h.g, h.q);
    expect(passives(rh)).toEqual(expect.arrayContaining(['THE CONCERN', 'THE COLUMN\'S CAPTAIN', 'THE CATALOGUE', 'THE DOCKET']));
    expect(passives(rh)).not.toContain('THE ONES WHO WALKED WITH YOU');
    // the trigger spans the square: the lane's spawn and the court's are inside it
    for (const sp of ['start', 'court']) {
      const s = MAP().spawns.find((x) => x.id === sp)!;
      const inside = s.x >= t.x && s.x < t.x + (t.w ?? 1) && s.y >= t.y && s.y < t.y + (t.h ?? 1);
      expect(inside || sp === 'court', sp).toBe(true);
    }
  });
});

// ---------------------------------------------------------------- the Concern's paper

describe('B6l: the Concern\'s officer always offers its paper; taken, carried, refused, or given back', () => {
  it('in every preset, with and without the arcology slice, an officer is at the close and offers the paper with its terms', () => {
    for (const preset of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) for (const b4b of [false, true]) {
      const a = close(preset, { b4b });
      const soto = cond(SOTO_COMES, a.g);
      expect(here(a.g), `${preset} ${b4b}`).toContain(soto ? 'npc_hc_02' : 'npc_cr_11');
      const r = talk('d_a3_quill', a.g, a.q);
      expect(r.node, `${preset} ${b4b}`).toBe(soto ? 's_intro' : 'q_intro');
      if (soto) expect(r.view()!.speaker).toBe('npc_hc_02');
      go(r, a, ['(Ask to see the paper.)']);
      expect(r.view()!.text, `${preset} ${b4b}`).toContain('INSTRUMENT OF TRANSFER');
      expect(opts(r)).toEqual(['I\'ll sign it at the core. Give it here.', 'I\'ll carry it. That\'s all I\'ll promise.', 'No.', 'Not yet.']);
      go(r, a, ['Not yet.']);
      expect(a.g.flags.a3_concern_terms).toBeUndefined();
      expect(has(a.g, 'k_a3_transfer')).toBe(false);
    }
  });

  it('the officer\'s first words read the night, the terrace, the Crown and the Weighhouse', () => {
    const g = close('guild', {}, { cr_concern: 'exposed', a3_c9_how: 'sold', a3_c9: 'relocated' });
    expect(passives(talk('d_a3_quill', g.g, g.q))).toEqual(['THE NIGHT AT OPENFIELD', 'THE CROWN', 'THE WEIGHHOUSE']);
    const s = close('prepared', { b4b: true });
    expect(passives(talk('d_a3_quill', s.g, s.q))).toEqual(['THE TERRACE']);
    const h = close('hostile', { b4b: true });
    const rh = talk('d_a3_quill', h.g, h.q);
    expect(rh.node).toBe('q_intro');
    expect(passives(rh)).toEqual(['THE TERRACE', 'THE CROWN']);
    expect(rh.view()!.passives[0].text).toContain('You told the Board no');
  });

  it('the terms are worse for a designate the Shift marked and the Clean shut out, and said so', () => {
    const h = close('hostile');
    const r = go(talk('d_a3_quill', h.g, h.q), h, ['And what is in it for me?']);
    expect(r.view()!.text).toContain('The seat is withdrawn');
    go(r, h, ['(Back.)', '(Ask to see the paper.)']);
    expect(passives(r)).toEqual(['THE CONSIDERATION']);
    const p = close('prepared');
    const rp = go(talk('d_a3_quill', p.g, p.q), p, ['And what is in it for me?']);
    expect(rp.view()!.text).toContain('A seat at the Board\'s table');
    go(rp, p, ['(Back.)', '(Ask to see the paper.)']);
    expect(passives(rp)).toEqual([]);
    const s = close('hostile', { b4b: { hc_soto_met: true } });
    expect(go(talk('d_a3_quill', s.g, s.q), s, ['And what is in it for me?']).view()!.text).toContain('I argued. I lost.');
  });

  it('taken to sign at the core: the paper in the pack, the terms accepted, C\'s buyer held; the companions mind', () => {
    const a = close('prepared', { companions: 'everyone' });
    expect(cond(C_BUYER, a.g)).toBe(false);
    const kes = a.g.world.approval.npc_hs_01, odile = a.g.world.approval.npc_nb_03;
    const r = go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'I\'ll sign it at the core.']);
    expect(r.node).toBe('q_taken');
    expect(a.g.flags).toMatchObject({ a3_concern_terms: 'accepted', a3_terms_how: 'taken', a3_terms_from: 'officer' });
    expect(has(a.g, 'k_a3_transfer')).toBe(true);
    expect(cond(C_BUYER, a.g)).toBe(true);
    expect(a.g.world.approval.npc_hs_01).toBe(kes - 10);
    expect(a.g.world.approval.npc_nb_03).toBe(odile + 2);
    go(r, a, ['(Back.)']);
    expect(r.view()!.text).toContain('You have it');
    expect(opts(r)).not.toContain('(Ask to see the paper.)');
    expect(opts(r)).toContain('(Give the paper back.)');
  });

  it('carried with no promise: accepted all the same, and said to mean yes', () => {
    const a = close('truce', { b4b: { hc_soto_met: true } });
    const r = go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'I\'ll carry it.']);
    expect(r.node).toBe('s_carried');
    expect(a.g.flags).toMatchObject({ a3_concern_terms: 'accepted', a3_terms_how: 'carried' });
    expect(has(a.g, 'k_a3_transfer')).toBe(true);
  });

  it('refused: no paper; the officer never offers twice, and names the Grand Factor\'s copy', () => {
    const a = close('truce');
    const r = go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'No.']);
    expect(r.node).toBe('q_refused');
    expect(r.view()!.text).toContain('The Grand Factor at Ninebridge holds the same paper');
    expect(a.g.flags.a3_concern_terms).toBe('refused');
    expect(a.g.world.knowledge.a3_sarr_holds).toBe(true);
    expect(has(a.g, 'k_a3_transfer')).toBe(false);
    expect(cond(C_BUYER, a.g)).toBe(false);
    const again = talk('d_a3_quill', a.g, a.q);
    expect(again.node).toBe('q_hub');
    expect(opts(again)).not.toContain('(Ask to see the paper.)');
    expect(opts(again)).not.toContain('And if I say no?');
  });

  it('given back unsigned: refused, the paper gone, and C\'s buyer gone with it (unless the night or the terrace hold one)', () => {
    const a = close('truce');
    go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'I\'ll sign it at the core.']);
    const r = go(talk('d_a3_quill', a.g, a.q), a, ['(Give the paper back.)']);
    expect(r.node).toBe('q_returned');
    expect(a.g.flags).toMatchObject({ a3_concern_terms: 'refused', a3_terms_returned: true });
    expect(has(a.g, 'k_a3_transfer')).toBe(false);
    expect(cond(C_BUYER, a.g)).toBe(false);
    const g = close('guild');
    go(talk('d_a3_quill', g.g, g.q), g, ['(Ask to see the paper.)', 'No.']);
    expect(cond(C_BUYER, g.g)).toBe(true); // the guild's night still counts as a buyer; the paper does not
    expect(has(g.g, 'k_a3_transfer')).toBe(false);
  });
});

// ---------------------------------------------------------------- the Grand Factor's copy

describe('B6l: the Grand Factor\'s second chance at Ninebridge', () => {
  const SARR = 'd_nb_sarr';
  it('not before the officer has been refused; after it, her own start opens on the guild\'s copy', () => {
    const a = close('truce', {}, { nb_office_ok: true, nb_sarr_met: true });
    expect(talk(SARR, a.g, a.q).node).toBe('again');
    go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'No.']);
    const r = talk(SARR, a.g, a.q);
    expect(r.node).toBe('a3_sarr');
    expect(r.view()!.text).toContain('turned his paper down');
    go(r, a, ['(Something else.)']);
    expect(r.node).toBe('again');
  });

  it('taken from her: accepted, from the floor, with the paper; she does not offer again', () => {
    const a = close('truce');
    go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'No.']);
    const r = go(talk(SARR, a.g, a.q), a, ['(Read the guild\'s copy.)']);
    expect(r.view()!.text).toContain('BROKERAGE TO THE FLOOR');
    go(r, a, ['I\'ll sign it at the core.']);
    expect(r.node).toBe('a3_sarr_taken');
    expect(a.g.flags).toMatchObject({ a3_concern_terms: 'accepted', a3_terms_from: 'sarr', a3_sarr_terms: 'accepted' });
    expect(has(a.g, 'k_a3_transfer')).toBe(true);
    expect(cond(C_BUYER, a.g)).toBe(true);
    expect(talk(SARR, a.g, a.q).node).not.toBe('a3_sarr');
  });

  it('refused twice: final; and nothing from a dead Grand Factor', () => {
    const a = close('truce');
    go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'No.']);
    const r = go(talk(SARR, a.g, a.q), a, ['(Read the guild\'s copy.)', 'No. Not from you either.']);
    expect(r.node).toBe('a3_sarr_no');
    expect(a.g.flags.a3_sarr_terms).toBe('refused');
    expect(has(a.g, 'k_a3_transfer')).toBe(false);
    expect(talk(SARR, a.g, a.q).node).not.toBe('a3_sarr');
    const d = close('truce', {}, { ln_sarr: 'dead' });
    go(talk('d_a3_quill', d.g, d.q), d, ['(Ask to see the paper.)', 'No.']);
    expect(talk(SARR, d.g, d.q).node).not.toBe('a3_sarr');
    const n = close('none'); // Sarr died on the night
    go(talk('d_a3_quill', n.g, n.q), n, ['(Ask to see the paper.)', 'No.']);
    expect(talk(SARR, n.g, n.q).node).not.toBe('a3_sarr');
  });

  it('with no officer alive to offer it, the Grand Factor holds the only copy and offers it unasked-for at her desk', () => {
    const a = close('truce');
    kill(a.g, 'npc_cr_11', 'md_crown');
    const r = talk(SARR, a.g, a.q);
    expect(r.node).toBe('a3_sarr');
    expect(r.view()!.text).toContain('not in a position to call on you');
    go(r, a, ['(Read the guild\'s copy.)', 'I\'ll carry it.']);
    expect(a.g.flags).toMatchObject({ a3_concern_terms: 'accepted', a3_terms_how: 'carried', a3_terms_from: 'sarr' });
  });
});

// ---------------------------------------------------------------- the register back

describe('B6l: the Court\'s register asked back of the catalogue (E_REG\'s alternate)', () => {
  const SOLD: Flags = { prec_register: 'catalogued', ca_squatter: 'catalogued' };
  const ASK = 'The copyist\'s book. I want it back, for the Court.';
  it('only when it was sold to the catalogue; the register kept by the Court needs nothing', () => {
    const p = close('prepared');
    expect(cond(E_REG, p.g)).toBe(true);
    expect(opts(talk('d_ar_keeper', p.g, p.q))).not.toContain(ASK);
    expect(talk('d_a3_acquisitions', p.g, p.q).node).toBe('shut');
    const h = close('hostile', {}, SOLD);
    expect(cond(E_REG, h.g)).toBe(false);
    expect(opts(talk('d_ar_keeper', h.g, h.q))).toContain(ASK);
    // asked in Act 3 before the card as well, never before the order
    expect(opts(talk('d_ar_keeper', close('hostile', {}, SOLD, false).g, h.q))).toContain(ASK);
  });

  it('bought back for two hundred: the porter carries it to the desk under the bench', () => {
    const h = close('hostile', { tolls: 150 }, SOLD);
    const r = go(talk('d_ar_keeper', h.g, h.q), h, [ASK]);
    expect(r.node).toBe('mb_ask');
    expect(opts(r).some((o) => o.startsWith('(Buy it back.'))).toBe(false); // 150 Tolls: not enough
    h.g.pc.inventory.tolls = 260;
    const b = talk('d_ar_keeper', h.g, h.q);
    go(b, h, [ASK, '(Buy it back. 200 Tolls)']);
    expect(b.node).toBe('mb_bought');
    expect(tolls(h.g)).toBe(60);
    expect(h.g.flags).toMatchObject({ a3_register_back: true, a3_register_how: 'bought' });
    expect(cond(E_REG, h.g)).toBe(true);
    expect(h.g.flags.prec_register).toBe('catalogued'); // Act 2 is never rewritten
    expect(opts(talk('d_ar_keeper', h.g, h.q))).not.toContain(ASK);
    expect(talk('d_a3_acquisitions', h.g, h.q).view()!.text).toContain('DEACCESSIONED');
  });

  it('asked back on Comfort Asamoah\'s word: only once she has given it; Speech 50, once; a failure leaves the price', () => {
    const h = close('hostile', {}, SOLD);
    expect(opts(go(talk('d_ar_keeper', h.g, h.q), h, [ASK]))).not.toContain('Comfort Asamoah says she lent it to me. Lent isn\'t sold.');
    const c = talk('d_ar_copyist', h.g, h.q);
    expect(c.node).toBe('tally');
    go(c, h, ['Keeper Marwood has your book']);
    expect(c.view()!.text).toContain('a person does not sell their own case');
    expect(h.g.world.knowledge.a3_comfort_word).toBe(true);
    expect(opts(talk('d_ar_copyist', h.g, h.q))).not.toContain('Keeper Marwood has your book in her acquisitions drawer. Will you say it was lent?');
    eff(h.g, 'speech', 30);
    const r = go(talk('d_ar_keeper', h.g, h.q), h, [ASK]);
    const o = r.view()!.options.find((x) => x.text.startsWith('Comfort Asamoah says'))!;
    expect(o.checkLabel).toBe('Speech 50');
    go(r, h, ['Comfort Asamoah says']);
    expect(r.node).toBe('mb_word_no');
    expect(h.g.flags.a3_register_back).toBeUndefined();
    go(r, h, ['(Back.)']);
    expect(opts(r).some((x) => x.startsWith('Comfort Asamoah says'))).toBe(false);
    // with her word and the evidence, the check falls and passes
    const w = close('hostile', { knows: ['a3_comfort_word', 'ar_keeper_confessed'], items: ['k_ar_warrant'] }, SOLD);
    eff(w.g, 'speech', 30);
    const rw = go(talk('d_ar_keeper', w.g, w.q), w, [ASK]);
    expect(rw.view()!.options.find((x) => x.text.startsWith('Comfort Asamoah says'))!.checkLabel).toBe('Speech 30');
    go(rw, w, ['Comfort Asamoah says']);
    expect(rw.node).toBe('mb_word');
    expect(w.g.flags).toMatchObject({ a3_register_back: true, a3_register_how: 'word' });
    expect(cond(E_REG, w.g)).toBe(true);
    expect(talk('d_ar_copyist', w.g, w.q).view()!.text).toContain('on the desk under the bench');
  });

  it('lifted from the acquisitions drawer at night: Security 45, once; by day the keeper sits in front of it; a failure wakes her', () => {
    const h = close('hostile', {}, SOLD);
    expect(MAP().talk!.ar_acquisitions.dialogue).toBe('d_a3_acquisitions');
    at(h.g, 11);
    expect(talk('d_a3_acquisitions', h.g, h.q).node).toBe('day');
    at(h.g, 23);
    eff(h.g, 'security', 30);
    const r = talk('d_a3_acquisitions', h.g, h.q);
    expect(r.node).toBe('night');
    go(r, h, ['(Work the drawer\'s lock']);
    expect(r.node).toBe('woken');
    expect(h.g.flags.a3_acq_woken).toBe(true);
    expect(h.g.flags.a3_register_back).toBeUndefined();
    expect(talk('d_a3_acquisitions', h.g, h.q).node).toBe('watched');
    const s = close('hostile', {}, SOLD);
    at(s.g, 2);
    eff(s.g, 'security', 45);
    const rs = talk('d_a3_acquisitions', s.g, s.q);
    expect(rs.view()!.options.find((o) => o.text.startsWith('(Work the drawer'))!.checkLabel).toBe('Security 50'); // Tamsin, not breathing
    eff(s.g, 'security', 50);
    go(rs, s, ['(Work the drawer\'s lock']);
    expect(s.g.flags).toMatchObject({ a3_register_back: true, a3_register_how: 'lifted' });
    expect(cond(E_REG, s.g)).toBe(true);
    expect(talk('d_a3_acquisitions', s.g, s.q).view()!.text).toContain('MISSING');
  });
});

// ---------------------------------------------------------------- keystone 7: case calla

describe('B6l: case calla at the Court, only while Sister Calla is held', () => {
  const CALL = 'Twelve-oh-four.';
  const bench = (a: A3) => talk('d_ca_court', a.g, a.q);
  it('with Calla held the case opens at the bench and the docket says so; without it, it does not', () => {
    const h = close('hostile');
    expect(cond(CALLA_HELD, h.g)).toBe(true);
    expect(opts(bench(h)).some((o) => o.startsWith(CALL))).toBe(true);
    expect(talk('d_ca_docket', h.g, h.q).view()!.text).toContain('AWAITING A SPEAKER');
    const p = close('prepared'); // freed on the Line
    expect(cond(CALLA_HELD, p.g)).toBe(false);
    expect(opts(bench(p)).some((o) => o.startsWith(CALL))).toBe(false);
    expect(talk('d_ca_docket', p.g, p.q).view()!.text).toContain('LISTED, NOT CALLED');
    const dead = close('hostile');
    kill(dead.g, 'npc_sh_05', 'shale');
    expect(opts(bench(dead)).some((o) => o.startsWith(CALL))).toBe(false);
    // and not before the night is over
    const eve = actThree('hostile', { point: 'eve', flags: { ln_done: false } });
    expect(cond(CALLA_CASE_OPEN, eve.g)).toBe(false);
  });

  it('speech is not sedition (Speech 55 with what is on the rail): a precedent, the amendment\'s speech clause, and Calla free', () => {
    const h = close('hostile', { companions: { tamsin: 'never' } });
    eff(h.g, 'speech', 40);
    const before = Number(h.g.flags.ca_precedents ?? 0);
    const r = go(bench(h), h, [CALL, '(Step up to the rail.)', 'Bring the respondent up', '(Back to the rail.)', 'Read the particulars', '(Back to the rail.)']);
    const g = r.view()!.options.find((o) => o.text.startsWith('What she said is speech'))!;
    expect(g.checkLabel).toBe('Speech 35');
    go(r, h, ['What she said is speech']);
    expect(r.node).toBe('calla_r_speech');
    expect(h.g.flags).toMatchObject({ ca_calla: 'speech', prec_sedition: 'speech', ks_calla: 'free' });
    expect(Number(h.g.flags.ca_precedents)).toBe(before + 1);
    expect(cond(CALLA_FREE, h.g)).toBe(true);
    expect(cond(CALLA_HELD, h.g)).toBe(false);
    expect(cond(CLAUSES.find((c) => c.id === 'speech')!.needs, h.g)).toBe(true);
    expect(opts(bench(h)).some((o) => o.startsWith(CALL))).toBe(false);
    expect(talk('d_ca_docket', h.g, h.q).view()!.text).toContain('RELEASED');
  });

  it('a failed speech is upheld: she stays held, the case is closed, and the docket says the sedition stands', () => {
    const h = close('hostile');
    eff(h.g, 'speech', 30);
    go(bench(h), h, [CALL, '(Step up to the rail.)', 'What she said is speech']);
    expect(h.g.flags.ca_calla).toBe('upheld');
    expect(h.g.flags.ks_calla).toBe('imprisoned');
    expect(h.g.flags.prec_sedition).toBeUndefined();
    expect(cond(CALLA_HELD, h.g)).toBe(true);
    expect(opts(bench(h)).some((o) => o.startsWith(CALL))).toBe(false);
    expect(talk('d_ca_docket', h.g, h.q).view()!.text).toContain('THE SEDITION STANDS');
  });

  it('void on the old heading (listed on a forecast, and a forecast is not an act): free, but no new precedent', () => {
    const h = close('hostile', { knows: ['ca_calla_listed'] }, { prec_forecast_fine: 'void' });
    const before = Number(h.g.flags.ca_precedents ?? 0);
    const r = go(bench(h), h, [CALL, '(Step up to the rail.)']);
    expect(opts(r).some((o) => o.startsWith('She was listed on a forecast'))).toBe(false); // the card must be on the rail first
    go(r, h, ['(Read the docket\'s card back to it.)', '(Back to the rail.)', 'She was listed on a forecast']);
    expect(r.node).toBe('calla_r_void');
    expect(h.g.flags).toMatchObject({ ca_calla: 'void', ks_calla: 'free' });
    expect(h.g.flags.prec_sedition).toBeUndefined();
    expect(Number(h.g.flags.ca_precedents)).toBe(before);
  });

  it('released as a favour to the designate: free, not a precedent', () => {
    const h = close('hostile');
    const before = Number(h.g.flags.ca_precedents ?? 0);
    const r = go(bench(h), h, [CALL, '(Step up to the rail.)', 'I\'m the designate. Release her.']);
    expect(r.node).toBe('calla_r_privilege');
    expect(h.g.flags).toMatchObject({ ca_calla: 'privilege', ks_calla: 'free' });
    expect(h.g.flags.prec_sedition).toBeUndefined();
    expect(Number(h.g.flags.ca_precedents)).toBe(before);
    expect(cond(E_PREC, h.g)).toBe(false);
  });

  it('the Choir\'s sister at the close tells of her while she is held, and not after', () => {
    const h = close('hostile', {}, { a3_ally_choir: true });
    expect(opts(talk('d_a3_keziah', h.g, h.q))).toContain('Sister Calla.');
    go(talk('d_a3_keziah', h.g, h.q), h, ['Sister Calla.']);
    expect(h.g.world.knowledge.a3_calla_told).toBe(true);
    const p = close('prepared', {}, { a3_ally_choir: true });
    expect(opts(talk('d_a3_keziah', p.g, p.q))).not.toContain('Sister Calla.');
  });
});

// ---------------------------------------------------------------- the captain at the close

describe('B6l: the column\'s lead at the close, by what the door made of him', () => {
  const T = 'd_a3_lowe_close';
  it('his first words by a3_lowe: stood down, withdrawn, yielded, carried (and carried over Tamsin)', () => {
    const cases: [Flags, string][] = [
      [{ a3_lowe: 'stood_down' }, 'ATTENDED. DECLINED. COLUMN WITHDRAWN.'],
      [{ a3_lowe: 'withdrawn', a3_c9_how: 'welded' }, 'with a pin through it'],
      [{ a3_lowe: 'yielded', a3_c9_how: 'fought' }, 'I yielded on your apron'],
      [{ a3_lowe: 'carried', a3_c9: 'relocated', a3_c9_how: 'order' }, 'Lawful, every one.'],
      [{ a3_lowe: 'carried', a3_c9: 'relocated', a3_c9_how: 'forced', a3_tamsin_dead: true }, 'I knelt by one of them.'],
    ];
    for (const [flags, line] of cases) {
      const a = close('truce', {}, flags);
      const r = talk(T, a.g, a.q);
      expect(r.node).toBe('intro');
      expect(r.view()!.text, line).toContain(line);
      expect(a.g.flags.a3_lowe_close).toBe(true);
      expect(talk(T, a.g, a.q).node).toBe('hub');
    }
  });

  it('his topics: the sixty by the door, the steps by his trust, and his list once he has said what comes next', () => {
    const a = close('prepared', {}, { a3_lowe: 'stood_down' }); // trust 30
    const r = go(talk(T, a.g, a.q), a, ['Will you be on the steps?']);
    expect(r.view()!.text).toContain('I will be a slow reader');
    go(r, a, ['(Back.)', 'The sixty.']);
    expect(r.view()!.text).toContain('knocked on it');
    go(r, a, ['(Back.)']);
    expect(opts(r).some((o) => o.startsWith('You keep touching'))).toBe(false);
    go(r, a, ['What happens to you now?']);
    expect(r.view()!.text).toContain('Order is a habit before it is a schedule');
    go(r, a, ['(Back.)', 'You keep touching your breast pocket.']);
    expect(r.view()!.text).toContain('KNOCK');
    expect(a.g.world.knowledge.a3_lowe_list).toBe(true);
    go(r, a, ['(Back.)']);
    expect(opts(r)).toEqual(['(Leave him to the close.)']);
    const low = close('truce', {}, { a3_lowe: 'stood_down' }); // no trust
    expect(go(talk(T, low.g, low.q), low, ['Will you be on the steps?']).view()!.text).not.toContain('slow reader');
    const opened = close('truce', {}, { a3_c9: 'opened', a3_c9_how: 'ines' });
    expect(go(talk(T, opened.g, opened.q), opened, ['The sixty.']).view()!.text).toContain('Ola Fairley');
  });
});

// ---------------------------------------------------------------- nothing unasked, saves, and the content

describe('B6l: nothing resolves unasked; saves; the trees, the registry and the content', () => {
  it('days at the close settle nothing: no paper, no register, no ruling, and everyone still standing where they came to', () => {
    const a = close('hostile', {}, { prec_register: 'catalogued', ca_squatter: 'catalogued', ...ALL_ALLIES, a3_unwritten: 'with_you' });
    const before = here(a.g).sort();
    for (let d = 0; d < 5; d++) { waitFor(a.g, a.q, 'md_spire', 7); waitFor(a.g, a.q, 'md_spire', 23); }
    for (const f of ['a3_concern_terms', 'a3_register_back', 'ca_calla', 'a3_sarr_terms', 'prec_sedition']) expect(a.g.flags[f], f).toBeUndefined();
    expect(has(a.g, 'k_a3_transfer')).toBe(false);
    expect(a.g.flags.ks_calla).toBe('imprisoned');
    expect(here(a.g).sort()).toEqual(before);
  });

  it('a save at the close keeps every answer: the paper, the register, the ruling, and who is where', async () => {
    const a = close('hostile', { alliance: 'truce', tolls: 400, knows: ['ca_calla_listed'] }, { prec_register: 'catalogued', ca_squatter: 'catalogued', prec_forecast_fine: 'void', a3_ally_choir: true });
    go(talk('d_a3_quill', a.g, a.q), a, ['(Ask to see the paper.)', 'I\'ll carry it.']);
    go(talk('d_ar_keeper', a.g, a.q), a, ['The copyist\'s book.', '(Buy it back. 200 Tolls)']);
    go(talk('d_ca_court', a.g, a.q), a, ['Twelve-oh-four.', '(Step up to the rail.)', '(Read the docket\'s card back to it.)', '(Back to the rail.)', 'She was listed on a forecast']);
    const l = await saveAndLoad(a.g);
    l.q.update();
    for (const [k, v] of Object.entries({ a3_concern_terms: 'accepted', a3_terms_how: 'carried', a3_terms_from: 'officer', a3_register_back: true, a3_register_how: 'bought', ca_calla: 'void', ks_calla: 'free', a3_summoned: true })) expect(l.g.flags[k], k).toBe(v);
    expect(has(l.g, 'k_a3_transfer')).toBe(true);
    expect(cond(E_REG, l.g)).toBe(true);
    expect(cond(CALLA_FREE, l.g)).toBe(true);
    expect(new DialogueRunner(DIALOGUES.d_a3_quill, l.g, l.q).view()!.text).toContain('You have it');
    expect(new DialogueRunner(DIALOGUES.d_nb_sarr, l.g, l.q).node).not.toBe('a3_sarr');
    expect(here(l.g).sort()).toEqual(here(a.g).sort());
    // give it back after the load, and the Grand Factor's copy opens
    go(new DialogueRunner(DIALOGUES.d_a3_quill, l.g, l.q), l, ['(Give the paper back.)']);
    expect(new DialogueRunner(DIALOGUES.d_nb_sarr, l.g, l.q).node).toBe('a3_sarr');
  });

  it('every node has a line for coming back to it (U7), or only leaves; option ids are unique; all seven companions speak', () => {
    const speakers = new Set<string>();
    const nodes = [...A3_CLOSE_DIALOGUES.flatMap((d) => Object.entries(d.nodes)), ...Object.entries(SARR_TERMS_NODES), ...Object.entries(MARWOOD_BACK_NODES), ...Object.entries(COMFORT_WORD_NODES)];
    for (const [k, n] of nodes) {
      if (!n.options.every((o) => o.exit)) expect(n.again, k).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    }
    for (const c of ['calla_r_speech', 'calla_r_void', 'calla_r_privilege', 'calla_r_upheld', 'calla']) expect(DIALOGUES.d_ca_court.nodes[c], c).toBeDefined();
    for (const id of A3_CLOSE_DIALOGUES.map((d) => d.id)) expect(DIALOGUES[id], id).toBeDefined();
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
  });

  it('the flags are in the Act 3 registry; the map is the generator\'s; the content validates', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6l (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_concern_terms', 'a3_terms_how', 'a3_terms_from', 'a3_terms_returned', 'a3_sarr_terms', 'a3_register_back', 'a3_register_how', 'a3_acq_woken', 'a3_lowe_close',
      'a3_nine_fetched', 'ca_calla', 'prec_sedition', 'ks_calla', 'a3_close_seen', 'a3_officer_met', 'a3_sarr_holds', 'a3_comfort_word', 'a3_lowe_list', 'a3_uw_close_met', 'a3_calla_told', 'a3_calla_freed']) expect(block.includes(f), f).toBe(true);
    expect(readFileSync('src/content/maps/md_spire.ts', 'utf8')).toContain('Generated by tools/maps/gen_md_spire.py');
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3_close|a3_3[1-4]|md_spire|md_crown|md_precinct|md_bridgeward|hc_board|openfield|d_ar_keeper|d_ar_copyist|d_nb_sarr|d_ca_|d_a3_(quill|lowe_close|petra_close|keziah|lucan|ifeoma|tuan|verity|seventeen|acquisitions|nine_walkin)/.test(e))).toEqual([]);
  });
});

describe('B6l: first meetings read what was before them', () => {
  it('Quill remembers the Masque only when they met there; the close names him once', () => {
    const met = close('truce', {}, { quill_met: true });
    expect(talk('d_a3_quill', met.g, met.q).view()!.text).toContain('We met at a Masque');
    expect(talk('d_a3_close', met.g, met.q).view()!.passives.filter((p) => p.label === 'THE CONCERN')).toHaveLength(1);
    const not = close('truce');
    expect(talk('d_a3_quill', not.g, not.q).view()!.text).toContain('"Quill. The Concern\'s."');
    expect(talk('d_a3_close', not.g, not.q).view()!.passives.filter((p) => p.label === 'THE CONCERN')).toHaveLength(1);
  });
});
