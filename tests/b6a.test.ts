import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { A3_QUESTS } from '../src/content/quests/a3';
import { A3_EVENTS } from '../src/content/world/a3_events';
import * as A3C from '../src/content/world/a3_conds';
import {
  A, A1, A2, ALLY_NEEDS, AT_VAULT, B, B4B_FLAGS, C, C_BUYER_B4B, CALLA_DEAD, CALLA_FREE, CALLA_HELD, COMPANIONS, COMPANION_KEYS, D, E, ENDS, EP_HOME, HOUNDS_ASLEEP,
  HOUNDS_CONCERN, HOUNDS_FERAL, HOUNDS_PLAYER, KEYS, KES_LINEAGE_HEARD, LN, LN_DONE, M1_LEASH, M2_SINK, M3_HALCYON, M4_CISTERN, M5_HOUNDS, M6_SASH, M7_SKY, M9_STANDING,
  MASON_BURNED, MASON_DEAD, MASON_EXILED, MASON_LIVES, MASON_SCARRED, ON_SIDE, READY_ACTS, SARR_ALIVE, SARR_DEAD, SIDES, modValue, type Mod,
} from '../src/content/world/a3_conds';
import { checkCoverage } from '../src/engine/data/coverage';
import { naming, validateContent } from '../src/engine/data/validate';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { apply as effects, test as cond } from '../src/engine/world/logic';
import { ACT_LEVEL, REFERENCE_BUILDS } from '../src/content/rules/builds';
import { actThree, has, hour, saveAndLoad, stage, status, talk, view, waitFor, type G, type Preset } from './a3_fixture';

/**
 * B6a — Act 3's groundwork: the shared conditions (the Long Night's real flags behind the plan's aliases, the arcology
 * slice's hook, the five gates, the modifiers), the act's quest skeletons, its papers, its world events, the order read
 * in the pack, and the shared fixture every later B6 slice builds on. Nothing opens before Act 2 is closed; nothing waits
 * on a date.
 */

const fresh = () => newGameState('openfield', 0, 0);
const give = (g: G, id: string) => effects([{ give: id }], g);
const set = (g: G, flags: Record<string, string | number | boolean>) => { Object.assign(g.flags, flags); return g; };
const PRESETS: Preset[] = ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'];

// ---------------------------------------------------------------- the act opens

describe('B6a: Act 3 opens once Act 2 is closed, wherever the player is', () => {
  it('never before the Long Night is over, once after it, and never again', () => {
    const { g, q } = actThree('choir', { point: 'eve', flags: { ln_done: false, act2_done: false } });
    for (let d = 0; d < 4; d++) expect(waitFor(g, q, 'openfield', 7)).not.toContain('a3_order');
    expect(g.flags.a3_open).toBeUndefined();
    expect(g.world.quests.q_a3_order).toBeUndefined();
    g.flags.ln_done = true;
    expect(waitFor(g, q, 'openfield', 7)).toEqual(['a3_order']);
    expect(g.flags.a3_open).toBe(true);
    expect(stage(g, 'q_a3_order')).toBe('post');
    expect(has(g, 'k_a3_order') && has(g, 'k_a3_mother_letter')).toBe(true);
    const posts = g.world.post!.length;
    expect(g.world.post!.map((p) => p.from)).toEqual(['npc_kn_maud', 'npc_c9_05', 'npc_ar_voice']);
    for (let d = 0; d < 3; d++) expect(waitFor(g, q, 'shale', 7)).not.toContain('a3_order');
    expect(g.world.post!.length).toBe(posts);
  });

  it('the post reaches the player anywhere: a town, the city, Knock, the wild between places', () => {
    for (const where of ['openfield', 'md_precinct', 'shale', 'c9_mouth', 'rc_halt_w', 'wild:glass_flats']) {
      const { g, q } = actThree('ledger', { point: 'eve', at: where });
      expect(waitFor(g, q, where, 7), where).toEqual(['a3_order']);
      expect(g.flags.a3_open, where).toBe(true);
    }
  });

  it('every Act 3 world event is armed by a flag and keeps an hour, with no day number (nothing on a date)', () => {
    for (const e of Object.values(A3_EVENTS)) {
      expect(e.armedIf, e.id).toBeDefined();
      expect('day' in e.at, e.id).toBe(false);
      expect(WORLD_EVENTS[e.id]).toBe(e);
    }
  });
});

// ---------------------------------------------------------------- the order read

describe('B6a: the fourth order, read in the pack', () => {
  it('the seal, the order, the Ledger\'s reason by alliance, the steps\' date corrected, the Act Three card; the road home starts', () => {
    const WHY: Record<string, string> = { choir: 'BROKEN IN THE OPEN AT OPENFIELD', guild: 'PRIVATE BID FOR THE CITY\'S CORE', ledger: 'SCHEDULE HOLDS. THERE IS NO CAUSE', truce: 'IN THE DESIGNATE\'S DEBT', none: 'STOOD ASIDE' };
    for (const side of SIDES) {
      const events: [string, unknown][] = [];
      const { g, q } = actThree(side, { point: 'open', host: { event: (n, d) => events.push([n, d]) } });
      expect(stage(g, 'q_a3_order')).toBe('post');
      expect(view('d_a3_order_read', g, q).text).toContain('BY COURIER — TO THE DESIGNATE');
      const r = talk('d_a3_order_read', g, q, ['(Break the seal.)']);
      const v = r.view()!;
      expect(v.text, side).toContain(WHY[side]);
      expect(v.text).toContain('EXECUTION ON THE DESIGNATE\'S ATTENDANCE');
      expect(v.text).toContain('PUBLIC STEPS REOPEN R49, the 49 ruled through and 30');
      for (const other of SIDES.filter((s) => s !== side)) expect(v.text, `${side} reads ${other}`).not.toContain(WHY[other]);
      expect(events).toContainEqual(['title', { text: 'ACT THREE\nTHE DOOR' }]);
      expect(g.flags.a3_order_read).toBe(true);
      expect(stage(g, 'q_a3_order')).toBe('read');
      expect(status(g, 'q_a3_order')).toBe('done');
      expect(stage(g, 'q_a3_return')).toBe('west');
      expect(g.world.decisions.some((d) => d.id === 'a3_order_read')).toBe(true);
    }
  });

  it('read again later: a shorter page, no second card, nothing started twice', () => {
    const events: string[] = [];
    const { g, q } = actThree('guild', { host: { event: (n) => events.push(n) } });
    expect(events.filter((e) => e === 'title')).toHaveLength(1);
    const v = view('d_a3_order_read', g, q);
    expect(v.text).toContain('the seal broken');
    talk('d_a3_order_read', g, q, ['(Fold it.)']);
    expect(events.filter((e) => e === 'title')).toHaveLength(1);
    expect(g.world.quests.q_a3_return.log).toHaveLength(1);
  });

  it('the notice for Unit 9 is in the packet only with Nine on the player\'s side; it starts the recall once', () => {
    const a = actThree('prepared', { point: 'open' });
    const r = talk('d_a3_order_read', a.g, a.q, ['(Break the seal.)', '(There is a fourth sheet']);
    expect(r.view()!.text).toContain('UNIT 9 (ASSESSOR, CIVIL) — DISPOSAL — AS SCHEDULED — R31 BROUGHT FORWARD');
    expect(a.g.flags.a3_recall_due).toBe(true);
    expect(stage(a.g, 'q_a3_recall')).toBe('notice');
    expect(view('d_a3_order_read', a.g, a.q).options.map((o) => o.text)).toEqual(['(Fold it.)']);
    for (let d = 0; d < 2; d++) expect(waitFor(a.g, a.q, 'openfield', 7)).not.toContain('a3_recall_notice');

    const b = actThree('hostile');
    expect(b.g.world.party).not.toContain(A3C.NINE);
    expect(b.g.world.quests.q_a3_recall).toBeUndefined();
    for (let d = 0; d < 2; d++) expect(waitFor(b.g, b.q, 'openfield', 7)).toEqual([]);
    expect(b.g.world.quests.q_a3_recall).toBeUndefined();
  });

  it('a Nine who joins after the order was read gets its notice at the next seven o\'clock; one who left does not', () => {
    const { g, q } = actThree('truce', { companions: { nine: 'left' } });
    expect(g.world.quests.q_a3_recall).toBeUndefined();
    // (B6c: a truce's offers of a ride home come by post the same morning; they are not the recall)
    expect(waitFor(g, q, 'md_precinct', 7).filter((e) => !/^a3_offer_/.test(e))).toEqual([]);
    g.flags.nine_left = false;
    g.world.party.push(A3C.NINE);
    expect(waitFor(g, q, 'md_precinct', 7)).toEqual(['a3_recall_notice']);
    expect(stage(g, 'q_a3_recall')).toBe('notice');
    expect(g.flags.a3_recall_due).toBe(true);
  });

  it('every node of the order tree has a line for coming back to it (U7), and every companion has a word on the order', () => {
    const d = DIALOGUES.d_a3_order_read;
    for (const [nid, n] of Object.entries(d.nodes)) expect(n.again, nid).toBeDefined();
    const said = new Set(Object.values(d.nodes).flatMap((n) => (n.interject ?? []).map((i) => i.companion)));
    for (const k of COMPANION_KEYS) expect(said.has(COMPANIONS[k].id), k).toBe(true);
    // the first companion with the player has the word: it is Tamsin's home, then the city's own unit
    expect(d.nodes.order.interject!.slice(0, 2).map((i) => i.companion)).toEqual([A3C.TAMSIN, A3C.NINE]);
    const { g, q } = actThree('prepared', { point: 'open' });
    const r = new DialogueRunner(d, g, q);
    expect(r.view()!.options.map((o) => o.text)).toEqual(['(Break the seal.)', '(Not yet.)']);
  });
});

// ---------------------------------------------------------------- the quests

describe('B6a: Act 3\'s quests as skeletons', () => {
  it('ten quests, all of Act 3; the four critical ones declare routes, and every build has one at level 24', () => {
    expect(A3_QUESTS.map((x) => x.id)).toEqual(['q_a3_order', 'q_a3_recall', 'q_a3_return', 'q_a3_mast', 'q_a3_ride', 'q_a3_cistern', 'q_a3_unwritten', 'q_a3_platform', 'q_a3_spire', 'q_a3_hold']);
    for (const x of A3_QUESTS) {
      expect(x.act, x.id).toBe('a3');
      expect(QUESTS[x.id]).toBe(x);
      expect(Object.values(x.stages).some((s) => s.end), x.id).toBe(true);
    }
    expect(A3_QUESTS.filter((x) => x.critical).map((x) => x.id)).toEqual(['q_a3_order', 'q_a3_return', 'q_a3_cistern', 'q_a3_spire']);
    const critical = Object.fromEntries(A3_QUESTS.filter((x) => x.critical).map((x) => [x.id, x]));
    expect(checkCoverage(critical, REFERENCE_BUILDS, ACT_LEVEL)).toEqual([]);
    // every beat with routes has three or more, one of them without violence
    for (const x of A3_QUESTS.filter((y) => y.routes && y.id !== 'q_a3_order')) {
      expect(x.routes!.length, x.id).toBeGreaterThanOrEqual(3);
      expect(x.routes!.some((r) => r.kind !== 'fight'), x.id).toBe(true);
    }
  });

  it('the road home: from wherever the order was read, to the Sallow, to Knock', () => {
    const { g, q } = actThree('choir');
    expect(stage(g, 'q_a3_return')).toBe('west');
    g.locationId = 'md_precinct'; q.update();
    expect(stage(g, 'q_a3_return')).toBe('west');
    g.locationId = 'tollhouse'; q.update();
    expect(stage(g, 'q_a3_return')).toBe('sallow');
    expect(g.world.quests.q_a3_cistern).toBeUndefined();
    g.flags.a3_at_knock = true; q.update();
    expect(stage(g, 'q_a3_return')).toBe('knock');
    expect(status(g, 'q_a3_return')).toBe('done');
    expect(stage(g, 'q_a3_cistern'), 'home starts the Cistern').toBe('knock');
    // read in Shale: straight to the Sallow; a road scene's flag does the same in the wild
    expect(stage(actThree('ledger', { at: 'shale' }).g, 'q_a3_return')).toBe('sallow');
    const w = actThree('guild', { at: 'wild:rail_corridor' });
    w.g.flags.a3_in_sallow = true; w.q.update();
    expect(stage(w.g, 'q_a3_return')).toBe('sallow');
  });

  it('the Cistern: Knock, inside, the ring, the door; the door\'s own way in goes straight to the door; every outcome ends it', () => {
    const { g, q } = actThree('prepared');
    apply(g, q, { a3_at_knock: true });
    expect(stage(g, 'q_a3_cistern')).toBe('knock');
    apply(g, q, { a3_inside: true, a3_in_how: 'shaft' });
    expect(stage(g, 'q_a3_cistern')).toBe('inside');
    apply(g, q, { a3_ring: 'sealed' });
    expect(stage(g, 'q_a3_cistern')).toBe('door');
    apply(g, q, { a3_c9: 'sealed', a3_c9_how: 'lowe' });
    expect(status(g, 'q_a3_cistern')).toBe('done');
    const b = actThree('hostile');
    b.q.questStart('q_a3_cistern');
    apply(b.g, b.q, { a3_inside: true, a3_in_how: 'door' });
    expect(stage(b.g, 'q_a3_cistern')).toBe('door');
    for (const v of ['opened', 'relocated']) {
      const c = actThree('ledger');
      c.q.questStart('q_a3_cistern');
      apply(c.g, c.q, { a3_c9: v });
      expect(stage(c.g, 'q_a3_cistern'), v).toBe(v);
    }
  });

  it('the side quests end on the flag their slice sets, each value its own stage', () => {
    const cases: [string, string, string[]][] = [
      ['q_a3_recall', 'a3_recall', ['declined', 'stayed', 'court', 'bought', 'hidden', 'fought', 'handed', 'taken']],
      ['q_a3_mast', 'a3_mast', ['raised', 'narrow']],
      ['q_a3_ride', 'ks_ada', ['stays', 'resigns', 'dead']],
      ['q_a3_unwritten', 'a3_unwritten', ['with_you', 'gone', 'stopped', 'burning']],
      ['q_a3_platform', 'a3_c9_after', ['walked', 'held']],
    ];
    for (const [id, flag, values] of cases) {
      for (const v of values) {
        const { g, q } = actThree('truce');
        q.questStart(id);
        apply(g, q, { [flag]: v });
        expect(status(g, id), `${id} ${v}`).not.toBe('active');
        expect(QUESTS[id].stages[stage(g, id)!].end, `${id} ${v}`).toBeDefined();
      }
    }
    for (const v of ['handed', 'taken']) { const { g, q } = actThree('truce'); q.questStart('q_a3_recall'); apply(g, q, { a3_recall: v }); expect(status(g, 'q_a3_recall')).toBe('failed'); }
  });

  it('the Ledger\'s card comes only once the door is settled, at the next seven o\'clock anywhere; then the close, the steps, the vault', () => {
    const { g, q } = actThree('prepared');
    for (let d = 0; d < 2; d++) expect(waitFor(g, q, 'c9_mouth', 7)).not.toContain('a3_summons');
    g.flags.a3_c9 = 'sealed';
    expect(waitFor(g, q, 'wild:sallow', 7)).toEqual(['a3_summons']);
    expect(has(g, 'k_a3_summons')).toBe(true);
    expect(g.flags.a3_summoned).toBe(true);
    expect(stage(g, 'q_a3_spire')).toBe('close');
    expect(stage(g, 'q_a3_hold')).toBe('holding');
    apply(g, q, { a3_pnr: true });
    expect(stage(g, 'q_a3_spire')).toBe('steps');
    expect(status(g, 'q_a3_hold')).toBe('done');
    apply(g, q, { a3_sash: 'refused' });
    expect(stage(g, 'q_a3_spire')).toBe('vault');
    apply(g, q, { a3_end: 'plan' });
    expect(stage(g, 'q_a3_spire')).toBe('ended');
    expect(status(g, 'q_a3_spire')).toBe('done');
    expect(waitFor(g, q, 'md_spire', 7)).toEqual([]);
  });

  it('what you hold: only what is held shows (allies, things carried, standing), never a way to finish by name', () => {
    const { g, q } = actThree('prepared', { standing: { meridian: 0 } });
    g.flags.a3_c9 = 'sealed';
    waitFor(g, q, 'c9_mouth', 7);
    const lines = () => q.journal().find((j) => j.id === 'q_a3_hold')!.objectives.map((o) => o.text);
    // B6m filled the page with what is held toward the gates' keys (`key_*`), named as the thing held, never as a way to finish
    expect(lines()).toEqual([
      'Nine walks with you, and reads the record as it is written', 'You can read the city\'s record yourself, every line of it', 'Openfield would walk out under any sky behind you',
      'Sister Calla is free', 'MOTHER\'s replies and Tamsin\'s count, side by side', 'The Ledger wrote CONTESTED on your file', 'Two rulings or more in the city\'s courts are yours',
      'The Court\'s register is in the Court\'s keeping',
      'The copy of the Cistern\'s replies', 'The designate\'s warrant', 'Knock thinks well of you', 'Shale thinks well of you', 'Openfield thinks well of you', 'Climb the steps when you are ready',
    ]);
    apply(g, q, { a3_ally_shale: true, a3_ally_stand: true });
    give(g, 'k_a3_charge');
    q.update();
    expect(lines()).toEqual(expect.arrayContaining(['Shale\'s militia will come', 'Carrick\'s dockers stand with you', 'A charge, made up and wired']));
    for (const o of QUESTS.q_a3_hold.stages.holding.objectives!) expect(o.id, o.id).toMatch(/^(ally|item|place|key)_|^up$/);
  });
});

// ---------------------------------------------------------------- the gates

describe('B6a: the gates of the five endings', () => {
  it('every gate is false on a fresh state; every key too, except a register nobody has touched', () => {
    const g = fresh();
    for (const [id, c] of Object.entries({ A, A1, A2, B, C, D, E })) expect(cond(c, g), id).toBe(false);
    for (const [id, c] of Object.entries(KEYS)) expect(cond(c, g), id).toBe(id === 'E_REG');
  });

  it('the vault is open with the steps done, the sash worn or refused; A is always open there, as A1 or A2', () => {
    expect(cond(AT_VAULT, set(fresh(), { a3_pnr: true }))).toBe(false);
    const worn = set(fresh(), { a3_pnr: true, a3_sash: 'worn' }), refused = set(fresh(), { a3_pnr: true, a3_sash: 'refused' });
    expect([cond(A, worn), cond(A1, worn), cond(A2, worn)]).toEqual([true, true, false]);
    expect([cond(A, refused), cond(A1, refused), cond(A2, refused)]).toEqual([true, false, true]);
  });

  it('B: each of its means alone opens it', () => {
    const vault = () => set(fresh(), { a3_pnr: true, a3_sash: 'refused' });
    const means: ((g: G) => void)[] = [
      (g) => set(g, { a3_unwritten: 'with_you' }),
      (g) => set(g, { ln_alliance: 'choir' }),
      (g) => { set(g, { ash_orders: 'refused' }); g.world.party.push(A3C.ASH); },
      (g) => { set(g, { ash_orders: 'refused_late' }); g.world.party.push(A3C.ASH); },
      (g) => { give(g, 'k_a3_charge'); },
      (g) => { set(g, { a3_bram_cut: true }); g.pc.sheet.skillBought.mechanics = 50; },
    ];
    for (const [i, m] of means.entries()) { const g = vault(); expect(cond(B, g), `none ${i}`).toBe(false); m(g); expect(cond(B, g), `means ${i}`).toBe(true); }
    const g = vault(); set(g, { ash_orders: 'refused' }); expect(cond(B, g), 'Ash refused but not with the player').toBe(false);
    const h = vault(); set(h, { a3_bram_cut: true }); expect(cond(B, h), 'Bram\'s route without the hands for it').toBe(false);
  });

  it('C: any buyer, the Concern\'s paper, and the sash worn', () => {
    const paper = (g: G) => { give(g, 'k_a3_transfer'); return g; };
    const buyers: Record<string, string>[] = [{ hc_offer: 'accepted' }, { hc_offer: 'feigned' }, { ln_alliance: 'guild' }, { a3_concern_terms: 'accepted' }];
    for (const buyer of buyers) {
      expect(cond(C, paper(set(fresh(), { a3_pnr: true, a3_sash: 'worn', ...buyer }))), JSON.stringify(buyer)).toBe(true);
      expect(cond(C, paper(set(fresh(), { a3_pnr: true, a3_sash: 'refused', ...buyer }))), 'refused sash').toBe(false);
      expect(cond(C, set(fresh(), { a3_pnr: true, a3_sash: 'worn', ...buyer })), 'no paper').toBe(false);
    }
    expect(cond(C, paper(set(fresh(), { a3_pnr: true, a3_sash: 'worn', hc_offer: 'refused', a3_concern_terms: 'refused' })))).toBe(false);
  });

  it('D: a voice, a reader, people and the archive, as a private person or in the sash; each reader alone', () => {
    const base = { a3_pnr: true, a3_sash: 'refused', a3_mast: 'raised', a3_ally_wheel: true, a3_archive: 'open' };
    expect(cond(D, set(fresh(), base))).toBe(false);
    const readers: ((g: G) => void)[] = [
      (g) => { set(g, { nine_stance: 'conscience' }); g.world.party.push(A3C.NINE); },
      (g) => { set(g, { nine_log_given: true }); g.world.party.push(A3C.NINE); },
      (g) => set(g, { a3_ally_seventeen: true, nw_dam: 'truth' }),
      (g) => set(g, { a3_ally_saints: true, bw_static: 'kept' }),
      (g) => { g.origin = 'archive_clerk'; },
      (g) => { g.pc.sheet.skillBought.science = 65; },
    ];
    for (const [i, r] of readers.entries()) { const g = set(fresh(), base); r(g); expect(cond(D, g), `reader ${i}`).toBe(true); }
    const worn = set(fresh(), { ...base, a3_sash: 'worn' }); worn.origin = 'archive_clerk';
    expect(cond(D, worn)).toBe(true);
    const noMast = set(fresh(), { ...base, a3_mast: 'narrow' }); noMast.origin = 'archive_clerk';
    expect(cond(D, noMast)).toBe(false);
    // the archive by the copies alone
    const copies = set(fresh(), { ...base, a3_archive: 'sealed', tam_why: true }); copies.origin = 'archive_clerk';
    expect(cond(D, copies)).toBe(false);
    give(copies, 'k_ar_refusals');
    expect(cond(D, copies)).toBe(true);
  });

  it('E: the sash worn, a contested or agreed file, two precedents, and the register in the Court\'s keeping or bought back', () => {
    const base = { a3_pnr: true, a3_sash: 'worn', ar_verdict: 'refused', a3_file: 'contested', ca_precedents: 2 };
    expect(cond(E, set(fresh(), base))).toBe(true);
    expect(cond(E, set(fresh(), { ...base, ca_precedents: 1 }))).toBe(false);
    expect(cond(E, set(fresh(), { ...base, a3_file: 'failed' }))).toBe(false);
    expect(cond(E, set(fresh(), { ...base, a3_file: 'failed', ar_verdict: 'agreed' }))).toBe(true);
    expect(cond(E, set(fresh(), { ...base, prec_register: 'catalogued' }))).toBe(false);
    expect(cond(E, set(fresh(), { ...base, prec_register: 'catalogued', a3_register_back: true }))).toBe(true);
    expect(cond(E, set(fresh(), { ...base, a3_sash: 'refused' }))).toBe(false);
  });

  it('with every key held: the sash worn opens all five; refused, only the Plan (walked away), the core destroyed, and the open sky', () => {
    const all = (sash: string) => {
      const g = set(fresh(), { a3_pnr: true, a3_sash: sash, a3_unwritten: 'with_you', a3_concern_terms: 'accepted', a3_mast: 'raised', a3_archive: 'open', ar_verdict: 'contested', ca_precedents: 3, a3_ally_choir: true });
      g.origin = 'archive_clerk';
      give(g, 'k_a3_transfer');
      return g;
    };
    const open = (g: G) => Object.entries(ENDS).filter(([, c]) => cond(c, g)).map(([e]) => e);
    expect(open(all('worn'))).toEqual(['plan', 'unwritten', 'concern', 'opensky', 'amendment']);
    expect(open(all('refused'))).toEqual(['plan', 'unwritten', 'opensky']);
  });
});

// ---------------------------------------------------------------- the reconciled aliases

/** Every flag a condition reads, walked out of the object. */
function flagsOf(x: unknown, out = new Set<string>()): Set<string> {
  if (!x || typeof x !== 'object') return out;
  if (Array.isArray(x)) { x.forEach((v) => flagsOf(v, out)); return out; }
  const o = x as Record<string, unknown>;
  if (typeof o.flag === 'string') out.add(o.flag);
  for (const v of Object.values(o)) flagsOf(v, out);
  return out;
}
/** The content's source files, Act 3's own left out. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.ts$/.test(n) && !/(^|_)a3(_|\.ts)/.test(n) ? [readFileSync(p, 'utf8')] : [];
  });
}

describe('B6a: the Long Night read through the plan\'s aliases, reconciled to the flags B5d writes', () => {
  const FILES = sources('src/content');
  const SRC = FILES.join('\n');
  /** A flag some file writes, and (for each value) a file that writes the flag holds that value: literally, or as an
   * argument to the helper that sets it (B5d's dawn sets `ks_mason` and `ln_openfield` through one function). */
  const writes = (flag: string, v?: string) => FILES.some((f) => new RegExp(`(set|inc): '${flag}'`).test(f) && (v === undefined || f.includes(`'${v}'`)));
  /** Act 3's own flags and the slices still to come, and the arcology slice's (not on main). `ca_deed` is real: courtCase()
   * writes every case's ruling as `ca_<case>` (B6b reads the deed's registration). */
  const LATER = /^(a3_|ep_|ev_armed_)|^(ks_ada|ca_reserve|ca_recall|prec_reserve|prec_recall|prec_sedition|nine_disposed|ca_deed)$/;

  it('every flag the shared conditions, the quests and the events read is one some content really writes (or Act 3\'s own, or the arcology\'s)', () => {
    const read = new Set<string>();
    for (const v of Object.values(A3C)) flagsOf(typeof v === 'function' ? null : v, read);
    for (const s of SIDES) flagsOf(LN(s), read);
    for (const k of COMPANION_KEYS) flagsOf(ON_SIDE(k), read);
    flagsOf([A3C.LN_BAND('strong'), A3C.OPENFIELD('stands'), A3C.LN_PEOPLE('heard'), A3C.LN_STORES('choir')], read);
    for (const k of ['nine_log_given', 'ilya_recruited', 'tam_home', 'odile_gone', 'wren_hanged', 'ln_band', 'ln_people', 'ln_stores', 'sk_flooded', 'a3_c9']) expect(read.has(k), k).toBe(true);
    for (const m of [M9_STANDING('shale')]) flagsOf(m, read);
    flagsOf(A3_QUESTS, read);
    flagsOf(Object.values(A3_EVENTS), read);
    flagsOf(DIALOGUES.d_a3_order_read, read);
    const missing = [...read].filter((f) => !LATER.test(f) && !B4B_FLAGS.includes(f) && !new RegExp(`(set|inc): '${f}'`).test(SRC));
    expect(missing).toEqual([]);
    expect(read.size).toBeGreaterThan(80);
  });

  it('the Long Night\'s aliases: the plan\'s assumed names do not exist; the real ones do, with the values the aliases read', () => {
    for (const assumed of ['a2_longnight_done']) expect(SRC.includes(`'${assumed}'`), assumed).toBe(false);
    expect(/set: 'ks_mason', value: 'burned'/.test(SRC)).toBe(false);
    expect(/set: 'ks_calla', value: '(held|freed|dead)'/.test(SRC)).toBe(false);
    for (const [flag, values] of Object.entries({
      ln_done: [], ln_band: ['strong', 'mixed', 'thin', 'truce', 'none'], ln_openfield: ['burned'], ks_mason: ['dead', 'lives', 'exiled'], ln_mason_burned: [],
      ks_calla: ['free', 'imprisoned'], ln_calla: ['freed', 'taken'], ks_sarr: ['dead'], ln_sarr: ['lives', 'dead'],
      an_reserve: ['concern', 'sealed', 'player', 'leaderless'], ln_hounds: ['stood_down'], ash_redline: ['longnight'], ash_gone: [], ash_orders: ['refused', 'refused_late'],
      nine_stance: ['conscience', 'deputy'], ln_nine_back: [], ln_people: ['heard', 'outside', 'removed', 'relocated'], ln_owed: [], ln_leash: ['spreads'],
    })) {
      expect(writes(flag), flag).toBe(true);
      for (const v of values) expect(writes(flag, v), `${flag} = ${v}`).toBe(true);
    }
    for (const v of SIDES) expect(writes('ln_alliance', v), `ln_alliance = ${v}`).toBe(true);
    for (const npc of ['npc_sh_05', 'npc_nb_01', 'npc_md_01', 'npc_md_12', 'npc_of_02', 'npc_kn_out_lead', 'npc_cr_11']) expect(NPCS[npc], npc).toBeDefined();
  });

  it('the alliance: one side true at a time; a closed night with no side set reads as the truce', () => {
    for (const s of SIDES) {
      const g = set(fresh(), { ln_done: true, ln_alliance: s });
      expect(SIDES.filter((x) => cond(LN(x), g)), s).toEqual([s]);
    }
    expect(SIDES.filter((x) => cond(LN(x), set(fresh(), { ln_done: true })))).toEqual(['truce']);
    expect(SIDES.filter((x) => cond(LN(x), fresh()))).toEqual([]);
    expect(cond(LN_DONE, set(fresh(), { act2_done: true }))).toBe(false);
  });

  it('keystones 7, 8 and 9 and the reserve as the night leaves them', () => {
    expect(cond(MASON_LIVES, fresh())).toBe(true);
    expect([cond(MASON_DEAD, set(fresh(), { ks_mason: 'dead' })), cond(MASON_LIVES, set(fresh(), { ks_mason: 'dead' }))]).toEqual([true, false]);
    expect(cond(MASON_EXILED, set(fresh(), { ks_mason: 'exiled' }))).toBe(true);
    expect(cond(MASON_BURNED, set(fresh(), { ln_openfield: 'burned' }))).toBe(true);
    expect(cond(MASON_BURNED, set(fresh(), { ln_openfield: 'scorched' }))).toBe(false);
    expect(cond(MASON_SCARRED, set(fresh(), { ks_mason: 'lives', ln_mason_burned: true }))).toBe(true);
    const calla = (f: Record<string, string | boolean>) => [cond(CALLA_HELD, set(fresh(), f)), cond(CALLA_FREE, set(fresh(), f))];
    expect(calla({ ln_done: true, ks_calla: 'imprisoned', ln_calla: 'taken' })).toEqual([true, false]);
    expect(calla({ ln_done: true, ks_calla: 'free', ln_calla: 'freed' })).toEqual([false, true]);
    expect(calla({ ln_done: true })).toEqual([true, false]);
    expect(calla({})).toEqual([false, false]);
    const dead = set(fresh(), { ln_done: true, ks_calla: 'imprisoned' }); dead.npcs['md_precinct/npc_sh_05'] = { dead: true };
    expect([cond(CALLA_DEAD, dead), cond(CALLA_HELD, dead), cond(CALLA_FREE, dead)]).toEqual([true, false, false]);
    expect([cond(SARR_ALIVE, fresh()), cond(SARR_DEAD, set(fresh(), { ln_sarr: 'dead' })), cond(SARR_DEAD, set(fresh(), { ks_sarr: 'dead' })), cond(SARR_DEAD, set(fresh(), { ln_sarr: 'lives' }))]).toEqual([true, true, true, false]);
    const hounds = (v?: string) => [HOUNDS_PLAYER, HOUNDS_CONCERN, HOUNDS_FERAL, HOUNDS_ASLEEP].map((c) => cond(c, v ? set(fresh(), { an_reserve: v }) : fresh()));
    expect(hounds('player')).toEqual([true, false, false, false]);
    expect(hounds('concern')).toEqual([false, true, false, false]);
    expect(hounds('leaderless')).toEqual([false, false, true, false]);
    expect(hounds('sealed')).toEqual([false, false, false, true]);
    expect(hounds()).toEqual([false, false, false, true]);
  });
});

// ---------------------------------------------------------------- the modifiers

describe('B6a: the modifiers pick their value on hand-made states (first match wins; every one has a default)', () => {
  const pick = (m: Mod, f: Record<string, string | number | boolean>, more?: (g: G) => void) => { const g = set(fresh(), f); more?.(g); return modValue(g, m); };
  it('every modifier ends on a default', () => {
    for (const m of [M1_LEASH, M2_SINK, M3_HALCYON, M4_CISTERN, M5_HOUNDS, M6_SASH, M7_SKY, M9_STANDING('shale'), EP_HOME]) expect(m.values[m.values.length - 1].if, m.id).toBeUndefined();
  });
  it('M1 the Leash', () => {
    expect([pick(M1_LEASH, { hc_leash: 'cut' }), pick(M1_LEASH, { hc_leash: 'seized' }), pick(M1_LEASH, { hc_leash: 'sold' }), pick(M1_LEASH, { a3_end: 'concern' }), pick(M1_LEASH, { hc_leash: 'left' }), pick(M1_LEASH, {})]).toEqual(['cut', 'yours', 'sold', 'spread', 'theirs', 'theirs']);
  });
  it('M2 the Sink', () => {
    expect([pick(M2_SINK, { a3_end: 'unwritten', sk_pumps: 'paid' }), pick(M2_SINK, { a3_end: 'unwritten', sk_pumps: 'seized' }), pick(M2_SINK, { sk_saved: true }), pick(M2_SINK, { sk_flooded: true, nw_sink_relief: true }), pick(M2_SINK, { sk_flooded: true }), pick(M2_SINK, {})]).toEqual(['lost', 'held', 'saved', 'relieved', 'flooded', 'flooded']);
  });
  it('M3 Halcyon: burned works without the arcology slice, through the reserve held by the player', () => {
    const shift = { hs_shift: 'revolt', ks_maren: 'lives' };
    expect([pick(M3_HALCYON, { hc_longlived: 'exposed' }), pick(M3_HALCYON, { ...shift, an_reserve: 'player' }), pick(M3_HALCYON, { ...shift, hc_leash: 'cut' }), pick(M3_HALCYON, { ...shift, an_reserve: 'player', a3_end: 'concern' }), pick(M3_HALCYON, { hc_longlived: 'soto' }), pick(M3_HALCYON, { ...shift })]).toEqual(['opened', 'burned', 'burned', 'risen', 'reformed', 'stands']);
    expect(pick(M3_HALCYON, { hs_shift: 'won', ks_maren: 'hanged', an_reserve: 'player' })).toBe('stands');
  });
  it('M4 the Cistern: a sealed reserve is relocated by the chair\'s first act unless the clause or the Court\'s consent stays it', () => {
    expect([pick(M4_CISTERN, { a3_c9: 'opened' }), pick(M4_CISTERN, { a3_c9: 'relocated', a3_c9_after: 'walked' }), pick(M4_CISTERN, { a3_c9: 'relocated', a3_c9_how: 'sold' }), pick(M4_CISTERN, { a3_c9: 'relocated', a3_c9_how: 'order' }), pick(M4_CISTERN, { a3_c9: 'sealed', a3_c9_how: 'struck' }), pick(M4_CISTERN, { a3_c9: 'sealed', a3_c9_how: 'lowe' })]).toEqual(['opened', 'walked', 'sold', 'relocated', 'struck', 'sealed']);
    const sealed = { a3_c9: 'sealed', a3_c9_how: 'welded', a3_sash: 'worn' };
    expect([pick(M4_CISTERN, { ...sealed, a3_end: 'plan' }), pick(M4_CISTERN, { ...sealed, a3_end: 'concern' }), pick(M4_CISTERN, { ...sealed, a3_end: 'amendment' }), pick(M4_CISTERN, { ...sealed, a3_end: 'amendment', a3_amend_reserve: true }), pick(M4_CISTERN, { ...sealed, a3_end: 'plan', ca_reserve: 'stayed' }), pick(M4_CISTERN, { ...sealed, a3_end: 'opensky' }), pick(M4_CISTERN, { ...sealed, a3_sash: 'refused', a3_end: 'plan' })]).toEqual(['relocated', 'relocated', 'relocated', 'sealed', 'sealed', 'sealed', 'sealed']);
  });
  it('M5 Kennel Seven, with B5d\'s fourth state', () => {
    expect([pick(M5_HOUNDS, { an_reserve: 'player', a3_end: 'concern' }), pick(M5_HOUNDS, { a3_end: 'concern' }), pick(M5_HOUNDS, { an_reserve: 'concern' }), pick(M5_HOUNDS, { a3_hounds_in: true }), pick(M5_HOUNDS, { an_reserve: 'leaderless' }), pick(M5_HOUNDS, { an_reserve: 'sealed' }), pick(M5_HOUNDS, {})]).toEqual(['yours', 'woken', 'woken', 'woken', 'feral', 'dormant', 'dormant']);
  });
  it('M6 the sash, M7 the sky, M9 a place\'s standing, R49\'s home', () => {
    expect([pick(M6_SASH, { a3_end: 'amendment', a3_sash: 'worn' }), pick(M6_SASH, { a3_sash: 'worn' }), pick(M6_SASH, { a3_sash: 'refused' })]).toEqual(['amended', 'worn', 'refused']);
    expect([pick(M7_SKY, { a3_ready: 8 }), pick(M7_SKY, { a3_ready: 5 }), pick(M7_SKY, { a3_ready: 4 }), pick(M7_SKY, { a3_ready: 2 }), pick(M7_SKY, { a3_ready: 1 }), pick(M7_SKY, {})]).toEqual(['held', 'held', 'hard', 'hard', 'burning', 'burning']);
    const bands = [30, 25, 12, 0, -14, -15, -40].map((n) => modValue(actThree('truce', { point: 'eve', standing: { shale: n } }).g, M9_STANDING('shale')));
    expect(bands).toEqual(['loved', 'loved', 'liked', 'none', 'none', 'hated', 'hated']);
    expect([pick(EP_HOME, { a3_sash: 'worn', a3_end: 'amendment', a3_c9: 'opened' }), pick(EP_HOME, { a3_sash: 'refused', a3_end: 'plan', a3_c9: 'opened' }), pick(EP_HOME, { a3_end: 'opensky', wren_after: 'road' }), pick(EP_HOME, { a3_end: 'unwritten' })]).toEqual(['city', 'knock', 'road', 'nowhere']);
  });
});

// ---------------------------------------------------------------- the fixture

describe('B6a: the shared fixture', () => {
  it('every preset closes Act 2 on its alliance and opens Act 3 to the order read, with only Act 3\'s own event firing', () => {
    for (const p of PRESETS) {
      const { g, fired } = actThree(p);
      const side = p === 'prepared' ? 'truce' : p === 'hostile' ? 'none' : p;
      expect(fired, p).toEqual(['a3_order']);
      expect(SIDES.filter((s) => cond(LN(s), g)), p).toEqual([side]);
      expect(g.flags).toMatchObject({ ln_done: true, act2_done: true, a3_open: true, a3_order_read: true });
      expect(status(g, 'q_a2_longnight'), p).toBe('done');
      expect(status(g, 'q_a2_spire'), p).toBe('done');
      expect(stage(g, 'q_a3_return'), p).toBe('west');
      expect(g.pc.sheet.level).toBe(24);
    }
  });

  it('the points: Act 2 closed only, the post come, the order read', () => {
    const eve = actThree('choir', { point: 'eve' });
    expect([eve.g.flags.a3_open, eve.g.world.quests.q_a3_order]).toEqual([undefined, undefined]);
    const open = actThree('choir', { point: 'open' });
    expect([open.g.flags.a3_open, open.g.flags.a3_order_read, stage(open.g, 'q_a3_order')]).toEqual([true, undefined, 'post']);
  });

  it('the bands of the Long Night for each side that has them, as B5d\'s dawn leaves Openfield', () => {
    const out = (side: 'choir' | 'guild' | 'ledger') => (['strong', 'mixed', 'thin'] as const).map((band) => { const { g } = actThree(side, { band }); return [g.flags.ln_band, g.flags.ln_openfield, g.flags.ks_mason, stage(g, 'q_a2_longnight')].join(' '); });
    expect(out('choir')).toEqual(['strong stands lives choir_stands', 'mixed scorched lives choir_scorched', 'thin burned dead choir_burned']);
    expect(out('guild')).toEqual(['strong guild exiled guild_company', 'mixed scorched exiled guild_scorched', 'thin burned dead guild_burned']);
    expect(out('ledger')).toEqual(['strong evicted lives ledger_evicted', 'mixed scorched lives ledger_scorched', 'thin burned dead ledger_burned']);
    expect(actThree('ledger').g.flags.ln_people).toBe('outside');
    expect(actThree('prepared', { alliance: 'ledger' }).g.flags).toMatchObject({ ln_people: 'heard', ln_faces_given: true });
    expect(actThree('truce').g.flags).toMatchObject({ ln_band: 'truce', ln_owed: true, ln_eviction_stayed: true });
    expect(actThree('none').g.flags).toMatchObject({ ln_band: 'none', ln_forecast_kept: true, ln_sarr: 'dead' });
  });

  it('prepared and hostile differ where the plan says: Nine, Ash, the verdict, the register, the allies, the Concern, the mast', () => {
    const p = actThree('prepared', { b4b: true }).g, h = actThree('hostile', { b4b: true }).g;
    expect([cond(ON_SIDE('nine'), p), cond(ON_SIDE('ash'), p)]).toEqual([true, true]);
    expect([cond(ON_SIDE('nine'), h), cond(ON_SIDE('ash'), h)]).toEqual([false, false]);
    expect([p.flags.ar_verdict, h.flags.ar_verdict, p.flags.prec_register, h.flags.prec_register]).toEqual(['contested', 'refused', 'kept', 'catalogued']);
    const needs = (g: G) => Object.entries(ALLY_NEEDS).filter(([, c]) => cond(c, g)).map(([a]) => a);
    expect(needs(h)).toEqual([]);
    expect(needs(p)).toEqual(['shale', 'dogs', 'choir', 'wheel', 'shift', 'stand', 'boats', 'barges', 'gangs', 'saints', 'seventeen']);
    expect([cond(C_BUYER_B4B, p), cond(C_BUYER_B4B, h), cond(KEYS.C_BUYER, h)]).toEqual([true, false, false]);
    expect([p.world.knowledge.mast_powered, h.world.knowledge.mast_powered, h.flags.broadcast_silenced]).toEqual([true, undefined, true]);
    expect(READY_ACTS.filter((r) => cond(r.needs, p)).map((r) => r.id)).toEqual(['nine']);
    for (const k of Object.keys(KEYS)) if (k !== 'E_REG' && k !== 'E_PREC' && k !== 'E_FILE') expect(cond(KEYS[k], h), `hostile ${k}`).toBe(false);
  });

  it('the companions in each state the slices need', () => {
    const states = ['never', 'met', 'party', 'waiting', 'left', 'gone'] as const;
    for (const k of COMPANION_KEYS) {
      for (const s of states) {
        const { g } = actThree('truce', { companions: { [k]: s } });
        const id = COMPANIONS[k].id;
        expect(cond(ON_SIDE(k), g), `${k} ${s}`).toBe(s === 'party' || s === 'waiting');
        expect(g.world.party.includes(id), `${k} ${s}`).toBe(s === 'party');
        expect(!!g.world.met?.[id], `${k} ${s}`).toBe(s !== 'never');
      }
    }
    const inside = actThree('prepared', { companions: { tamsin: 'inside' } }).g;
    expect([inside.flags.c9_tamsin_inside, inside.flags.tam_out, cond(ON_SIDE('tamsin'), inside)]).toEqual([true, undefined, false]);
    expect(cond(ON_SIDE('tamsin'), actThree('prepared', { companions: { tamsin: 'home' } }).g)).toBe(false);
    expect(actThree('prepared', { companions: 'nobody' }).g.world.party).toEqual([]);
    expect(COMPANION_KEYS.filter((k) => cond(ON_SIDE(k), actThree('prepared', { companions: 'estranged' }).g))).toEqual([]);
    expect(COMPANION_KEYS.filter((k) => cond(ON_SIDE(k), actThree('hostile', { companions: 'everyone' }).g))).toEqual(COMPANION_KEYS);
  });

  it('with and without the arcology slice\'s hook', () => {
    const off = actThree('prepared').g, on = actThree('prepared', { b4b: true }).g, mine = actThree('guild', { b4b: { hc_leash: 'seized' } }).g;
    expect(B4B_FLAGS.filter((f) => off.flags[f] !== undefined)).toEqual([]);
    expect(B4B_FLAGS.filter((f) => on.flags[f] !== undefined)).toEqual(B4B_FLAGS.filter((f) => !['hc_reserve', 'hc_kes_contract'].includes(f)));
    expect([status(off, 'q_a2_halcyon'), status(on, 'q_a2_halcyon')]).toEqual([undefined, 'done']);
    expect([modValue(off, M1_LEASH), modValue(on, M1_LEASH), modValue(mine, M1_LEASH)]).toEqual(['theirs', 'cut', 'yours']);
    expect([cond(KES_LINEAGE_HEARD, off), cond(KES_LINEAGE_HEARD, on)]).toEqual([false, true]);
  });

  it('saves through the real codec and loads back whole: the loaded copy plays on', async () => {
    for (const p of PRESETS) {
      const a = actThree(p, { b4b: p === 'guild' });
      const b = await saveAndLoad(a.g);
      expect(b.g).not.toBe(a.g);
      expect(b.g.flags).toEqual(a.g.flags);
      expect(b.g.world.quests).toEqual(a.g.world.quests);
      expect(b.g.world.party).toEqual(a.g.world.party);
      expect(b.g.pc.inventory.items).toEqual(a.g.pc.inventory.items);
      for (const [id, c] of Object.entries(ENDS)) expect(cond(c, b.g), `${p} ${id}`).toBe(cond(c, a.g));
      b.g.flags.a3_c9 = 'opened';
      hour(b.g, 7);
      waitFor(b.g, b.q, 'c9_mouth', 7);
      expect(stage(b.g, 'q_a3_spire'), p).toBe('close');
      expect(a.g.world.quests.q_a3_spire).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------- validation

describe('B6a: validation, coverage and names pass with the skeletons', () => {
  it('the validator and the naming bible find nothing in Act 3\'s content', () => {
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, leads: LEADS, conclusions: CONCLUSIONS, settlements: SETTLEMENTS, chrome: CHROME, regions: REGIONS, worldMap: WORLD_MAP, factions: FACTIONS, letters: LETTERS, families: FAMILIES });
    expect(errs).toEqual([]);
    expect(naming({ quests: QUESTS, items: ITEMS } as never).filter((e) => /a3/.test(e))).toEqual([]);
    for (const id of ['k_a3_order', 'k_a3_mother_letter', 'k_a3_first_letter', 'k_a3_summons', 'k_a3_transfer', 'k_a3_charge']) expect(ITEMS[id], id).toBeDefined();
    expect(ITEMS.k_a3_order.read).toBe('d_a3_order_read');
  });
});

function apply(g: G, q: QuestEngine, flags: Record<string, string | number | boolean>): void {
  Object.assign(g.flags, flags);
  q.update();
}
