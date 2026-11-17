import { describe, expect, it } from 'vitest';
import * as CONTENT from '../src/content';
import { DIALOGUES, MAPS, QUESTS } from '../src/content';
import { EP_SPECS } from '../src/content/dialogue/a3_epilogue';
import * as CONDS from '../src/content/world/a3_conds';
import {
  A1, A2, B_MEANS, C_BUYER, CLAUSES, D_ARCHIVE, D_PEOPLE, D_READER, D_VOICE, E_FILE, E_PREC, E_REG, KEYS, READ_NINE, READ_SELF, READ_SEVENTEEN, READ_VERITY, TERMS_WORSE,
} from '../src/content/world/a3_conds';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner, type DialogueDef } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { test as cond } from '../src/engine/world/logic';
import { actThree, hour, waitFor, type G, type Over, type Preset } from './a3_fixture';
import {
  archive, atDesk, charge, court, desk, door, down, drive, earliest, eff, epilogue, finish, fork, goUp, has, holds, home, mast, muster, officer, readOrder, register,
  SASH_FOR, summons, talk, train, WAYS, type Game, type Way,
} from './b6w_fixture';

/**
 * B6w — the no-lockout proof, and Act 3 checked whole. §3's table row by row, each alternate played in its own scene from the
 * hostile game (the worst plausible Acts 1–2: Nine and Ash gone, the verdict refused, the register sold, no ally, the Concern
 * refused, the mast dead, nobody stood with at the Long Night), each key then held at the save before the steps; the property
 * that from the earliest Act 3 save every preset reaches every ending §3 promises, to the credits; and across all of Act 3: no
 * conversation that cannot be left, and no flag (or thing known) read that nothing writes.
 */

// ---------------------------------------------------------------- the hostile game, as far as asked

/** The hostile game from its earliest save: the order read (the player trains), home at Knock. */
async function atKnock(over: Over = {}, preset: Preset = 'hostile'): Promise<Game> {
  const a = await earliest(preset, over);
  readOrder(a);
  home(a);
  return a;
}
/** ...the door settled (the column stood down) and the close. */
async function atClose(over: Over = {}, preset: Preset = 'hostile', before: (a: Game) => void = () => undefined): Promise<Game> {
  const a = await atKnock(over, preset);
  before(a);
  door(a);
  summons(a);
  return a;
}
/** The save before the steps, the steps (worn or refused), the stair: the ways the desk offers this game. */
async function ways(a: Game, sash: 'worn' | 'refused'): Promise<Way[]> {
  return desk(await down(goUp(fork(a.g)), sash));
}
/** The Unwritten at Knock, at night: what they came to do, and the real count burned instead (Speech 40 for the hostile game). */
function turnUnwritten(a: Game): void {
  hour(a.g, 22);
  drive(a, 'd_a3_petra', ['(Sit down.)', 'What did you come here to do?', 'Burn the real count', '(Go on.)']);
  expect(a.g.flags.a3_unwritten).toBe('with_you');
}

describe('B6w: no lockout, §3\'s table row by row, from the hostile game', () => {
  it('A: the sash is offered on the steps whatever the file\'s verdict was; worn or refused, the vault opens and the Plan is a way', async () => {
    for (const verdict of ['refused', 'contested', 'agreed', 'noted', 'silent', false] as const) {
      const a = await atClose({ flags: { ar_verdict: verdict } });
      const s = talk(fork(a.g), 'd_a3_pnr').pick('(Go up.)', '(Go up.)');
      s.pick('(Something is coming down the steps');
      expect(s.options(), String(verdict)).toEqual(expect.arrayContaining(['(Take the sash.)', '(Don\'t take it.)']));
      expect(await ways(a, 'worn')).toContain('sign');
      expect(await ways(a, 'refused')).toContain('walk');
    }
    const a = await atClose();
    const g = goUp(a);
    const w = await down(g, 'worn');
    expect(holds(w.g, A1)).toBe(true);
    const r = await down(g, 'refused');
    expect(holds(r.g, A2)).toBe(true);
  });

  it('B_MEANS: the Unwritten turned at Knock; the charge made at the close (black powder, or Number Six\'s cases, and a trained hand); Bram\'s telling and a mechanic\'s hand', async () => {
    const turned = await atKnock();
    expect(holds(turned.g, B_MEANS)).toBe(false);
    turnUnwritten(turned);
    expect(holds(turned.g, B_MEANS)).toBe(true);
    door(turned); summons(turned);
    expect(await ways(turned, 'worn')).toContain('down');
    expect(await ways(turned, 'refused')).toContain('down');

    for (const items of [[], ['k_hs_powder']]) {
      const c = await atClose({ items });
      expect(holds(c.g, B_MEANS)).toBe(false);
      charge(c);
      expect(c.g.flags.a3_charge_how).toBe(items.length ? 'cases' : 'powder');
      expect(await ways(c, 'refused')).toContain('down');
    }

    const b = await atKnock({ skills: { mechanics: 50 } });
    drive(b, 'd_kn_hatch', ['MOTHER. The order executes at the door.', '(Climb down the lift shaft.)']);
    expect(b.g.flags.a3_inside).toBe(true);
    drive(b, 'd_a3_council', ['(Sit in the ninth chair.)', 'Bram. Could she', 'Bram. You know how a caretaker', 'Not her.', '(Get up from the table.)']);
    expect(b.g.flags.a3_bram_cut).toBe(true);
    train(b.g, { mechanics: 50 });
    expect(holds(b.g, B_MEANS)).toBe(true);
    b.g.locationId = 'c9_mouth';
    door(b); summons(b);
    expect(await ways(b, 'worn')).toContain('down');
  });

  it('C_BUYER: the Concern\'s officer always offers its paper at the close (on worse terms for a designate the Shift marked); refused, the Grand Factor offers it again while she lives', async () => {
    const a = await atClose();
    expect(holds(a.g, C_BUYER)).toBe(false);
    expect(holds(a.g, TERMS_WORSE)).toBe(true);
    officer(a);
    expect(a.g.flags.a3_terms_from).toBe('officer');
    expect(await ways(a, 'worn')).toContain('sell');
    // refused at the close, then the Grand Factor's copy at Ninebridge (a game where she is alive: not the night that killed her)
    const s = await atClose({ alliance: 'truce' });
    drive(s, 'd_a3_quill', ['(Ask to see the paper.)', 'No.']);
    expect(s.g.flags.a3_concern_terms).toBe('refused');
    expect(holds(s.g, C_BUYER)).toBe(false);
    s.g.locationId = 'ninebridge';
    drive(s, 'd_nb_sarr', ['(Read the guild\'s copy.)', 'I\'ll sign it at the core.']);
    expect(s.g.flags.a3_terms_from).toBe('sarr');
    s.g.locationId = 'md_spire';
    expect(await ways(s, 'worn')).toContain('sell');
  });

  it('D_VOICE: Signal Hill raised by the feed cabinet, by the crown hauled up from the gully, or by the Hollow\'s own hands; Knock always offered as keeper', async () => {
    const x = await atKnock();
    expect(holds(x.g, D_VOICE)).toBe(false);
    mast(x);
    expect([x.g.flags.a3_mast_how, x.g.flags.a3_mast_keeper]).toEqual(['x', 'knock']);
    const v = await atKnock({ skills: { science: 0 } });
    eff(v.g, 'science', 20);
    eff(v.g, 'survival', 45);
    v.g.locationId = 'signalhill';
    drive(v, 'd_a3_aerial', ['(Dig it out of the stone']);
    drive(v, 'd_a3_mast', ['(Haul the crown', 'Knock keeps it.']);
    expect([v.g.flags.a3_mast_how, v.g.flags.a3_mast]).toEqual(['v', 'raised']);
    const t = await atKnock();
    t.g.locationId = 'signalhill';
    drive(t, 'd_a3_hollow', ['I want it to reach every radio', 'Keep it as yours']);
    expect([t.g.flags.a3_mast_how, t.g.flags.a3_mast_keeper, t.g.flags.a3_mast]).toEqual(['t', 'hollow', 'raised']);
    expect(holds(t.g, D_VOICE)).toBe(true);
  });

  it('D_READER: Science 65 trained; an archive clerk\'s own hand; Nine reading, when it is with the player; Seventeen and Verity, called by letter', async () => {
    const untrained = await earliest('hostile');
    readOrder(untrained, null);
    expect(holds(untrained.g, D_READER)).toBe(false);
    const a = await atKnock();
    expect([holds(a.g, READ_SELF), holds(a.g, D_READER)]).toEqual([true, true]);
    const clerk = await earliest('hostile', { origin: 'archive_clerk' });
    readOrder(clerk, null);
    expect(holds(clerk.g, READ_SELF)).toBe(true);
    const nine = await earliest('hostile', { companions: { nine: 'party' }, flags: { nine_stance: 'conscience' } });
    readOrder(nine, null);
    expect(holds(nine.g, READ_NINE)).toBe(true);
    // the Saints' and the Wet's readers come when their own need was met and they were written to (a thorough game)
    const p = await earliest('prepared');
    readOrder(p, null);
    eff(p.g, 'science', 30);
    p.g.world.party = p.g.world.party.filter((id) => id !== CONDS.NINE);
    expect(holds(p.g, D_READER)).toBe(false);
    const sent = muster(p);
    expect(sent).toEqual(expect.arrayContaining(['let_a3_saints', 'let_a3_seventeen']));
    expect([holds(p.g, READ_VERITY), holds(p.g, READ_SEVENTEEN)]).toEqual([true, true]);
  });

  it('D_PEOPLE: the Unwritten turned; Sister Calla freed at the Court; Knock behind a door the ring opened; the Choir or the Wheel by letter', async () => {
    const u = await atKnock();
    expect(holds(u.g, D_PEOPLE)).toBe(false);
    turnUnwritten(u);
    expect(holds(u.g, D_PEOPLE)).toBe(true);
    const c = await atKnock();
    court(c);
    expect(c.g.flags.ca_calla).toBe('speech');
    expect(holds(c.g, D_PEOPLE)).toBe(true);
    // the ring votes the door open (inside, at the council), the column stands down and goes, and Knock stands with the player
    const o = await atKnock({ standing: { cistern9: 25 } });
    drive(o, 'd_kn_hatch', ['MOTHER. The order executes at the door.', '(Climb down the lift shaft.)']);
    drive(o, 'd_a3_council', ['(Sit in the ninth chair.)', '(Ask for the vote.)', 'Open it', '(Go on.)', '(Get up from the table.)']);
    expect(o.g.flags.a3_ring).toBe('open');
    o.g.locationId = 'c9_mouth';
    door(o);
    expect(o.g.flags.a3_c9).toBe('opened');
    expect(holds(o.g, D_PEOPLE)).toBe(true);
    expect(holds(o.g, D_ARCHIVE)).toBe(true);
    // the Choir and the Wheel answer the muster when their own needs were met (a thorough game)
    const p = await earliest('prepared', { standing: { openfield: 0 } });
    readOrder(p, null);
    expect(muster(p)).toEqual(expect.arrayContaining(['let_a3_choir', 'let_a3_wheel']));
    expect([p.g.flags.a3_ally_choir, p.g.flags.a3_ally_wheel]).toEqual([true, true]);
  });

  it('D_ARCHIVE: the Archive opened by Ines (Speech 60 for this game, which turned her away in Act 1); the copy of the replies with Tamsin\'s why', async () => {
    const a = await atKnock();
    expect(holds(a.g, D_ARCHIVE)).toBe(false);
    archive(a);
    expect(holds(a.g, D_ARCHIVE)).toBe(true);
    const p = await earliest('prepared');
    expect([has(p.g, 'k_ar_refusals'), p.g.flags.tam_why, holds(p.g, D_ARCHIVE)]).toEqual([true, true, true]);
  });

  it('E_FILE: the second hearing on the steps wins the file back (a failed one is spent, and the amendment is not offered)', async () => {
    const h = await atClose({}, 'hostile', (a) => { court(a); register(a); });
    expect([holds(h.g, E_FILE), holds(h.g, E_PREC), holds(h.g, E_REG)]).toEqual([false, true, true]);
    const save = goUp(fork(h.g));
    const won = await down(save, 'worn');
    expect(won.g.flags.a3_file).toBe('contested');
    expect(desk(won)).toContain('amend');
    const lost = await down(save, 'worn', { speech: 20 });
    expect(lost.g.flags.a3_file).toBe('failed');
    expect(desk(lost)).not.toContain('amend');
  });

  it('E_PREC: the Act 3 cases are precedents: the reserve (consent, or attendance), the recall (kept), Sister Calla (speech)', async () => {
    const a = await atKnock();
    expect(holds(a.g, E_PREC)).toBe(false);
    court(a);
    expect(a.g.flags.ca_precedents).toBe(2);
    expect(['stayed', 'attendance']).toContain(a.g.flags.ca_reserve);
    expect(a.g.flags.ca_calla).toBe('speech');
    expect(holds(a.g, E_PREC)).toBe(true);
    // attendance (Science 45) when the word fails
    const s = await atKnock({ skills: { speech: 0 } });
    eff(s.g, 'speech', 20);
    s.g.locationId = 'md_spire';
    const r = talk(s, 'd_ca_court').pick('Reserve 9 against the fourth order', '(Step up to the rail.)');
    finish(r, ['The order executes on the designate']);
    expect(s.g.flags.ca_reserve).toBe('attendance');
    expect(s.g.flags.ca_precedents).toBe(1);
    // the recall, with Nine on the player's side: kept on its own keeping
    const n = await earliest('hostile', { companions: { nine: 'party' }, flags: { prec_unit_keeper: 'self' } });
    readOrder(n);
    expect(n.g.flags.a3_recall_due).toBe(true);
    n.g.locationId = 'md_spire';
    finish(talk(n, 'd_ca_court').pick('Unit 9\'s recall. Disposal', '(Step up to the rail.)'), ['Your own register holds it already', 'A unit may be its own keeper']);
    expect(n.g.flags.ca_recall).toBe('kept');
    expect(n.g.flags.ca_precedents).toBe(1);
  });

  /** The one history B6w found where the Court's bench alone does not keep §3's promise: Sister Calla freed at the Long Night (no
   * case for her), Nine gone (no recall), the Act 2 cases heard and lost or never opened (squatter lost, no fines contested, no deed):
   * the reserve's case is the only precedent the Court gives in Act 3, and E needs two. The coordinator's fix (after B6w): the Harbour
   * court's finding that a person landed on Carrick's quay is a passenger (`dk_prec_passenger`) counts as a precedent wherever E
   * counts them (`E_PREC`), once, when the game made it; in this history it is won at the buffer (B6k). */
  const SPENT: Over = { flags: { ks_calla: 'free', ln_calla: 'freed', ca_squatter: 'lost', ca_cases_heard: 1 } };
  it('E_PREC in that history: every case on the Court\'s bench in Act 3 heard and won gives one precedent, and the bench is then empty', async () => {
    const a = await atKnock(SPENT);
    court(a);
    expect(a.g.flags.ca_reserve).toBe('stayed');
    expect(a.g.flags.ca_precedents).toBe(1);
    // nothing else on the bench: no recall (Nine gone), no Calla (free), the squatter's case closed, no fines contested, no deed
    a.g.locationId = 'md_spire';
    expect(talk(a, 'd_ca_court').r.view()!.options.filter((o) => !o.locked && /^ca\.\w+\.call/.test(o.id)).map((o) => o.text)).toEqual([]);
    expect([a.g.flags.dk_prec_passenger, holds(a.g, E_PREC)]).toEqual([undefined, false]);
  });
  it('E_PREC, §3\'s promise for that history: the Harbour court\'s passenger finding at Carrick\'s buffer is the second; the page says so, the desk offers the amendment and the register takes its clause', async () => {
    // Tamsin waits elsewhere: at the door she would stand in it at the word, which is then forced over her or withdrawn (B6j)
    const a = await atKnock({ ...SPENT, companions: { tamsin: 'waiting' } });
    court(a);
    register(a);
    expect([a.g.flags.ca_precedents, holds(a.g, E_PREC)]).toEqual([1, false]);
    // the word at the door: Reserve 9 carried west, held at the buffer for the designate's word; the slip comes at seven
    door(a, ['Carry on, Captain.']);
    expect(a.g.flags).toMatchObject({ a3_c9: 'relocated', a3_c9_how: 'order' });
    expect(waitFor(a.g, a.q, a.g.locationId, 7)).toContain('a3_buffer_post');
    a.g.locationId = 'md_docks';
    drive(a, 'd_a3_platform', ['(Take it to the Harbour court at six']);
    expect(a.g.flags).toMatchObject({ dk_prec_passenger: true, a3_c9_after: 'walked', a3_buffer_how: 'court' });
    // the Court's own count is unchanged; the finding counts once beside it
    expect(a.g.flags.ca_precedents).toBe(1);
    expect(holds(a.g, E_PREC)).toBe(true);
    expect(a.q.journal().find((j) => j.id === 'q_a3_hold')!.objectives.map((o) => o.text)).toContain('Two rulings or more in the city\'s courts are yours');
    summons(a);
    const won = await down(goUp(fork(a.g)), 'worn');
    expect(won.g.flags.a3_file).toBe('contested');
    expect(desk(won)).toContain('amend');
    // the clause picker reads the same two rulings: the reserve's (the Court's) and the passenger's (the Harbour court's)
    const s = atDesk(won, 'amend').pick('(Carry it up to the steps');
    expect(s.node).toBe('e_write');
    expect(s.options().filter((t) => t.startsWith('(Write:'))).toEqual(['(Write: A reserve is kept by its own consent.)', '(Write: A person is a passenger, never cargo.)']);
  });
  it('E_PREC counts the passenger finding once, only when it was made, and never in place of both', () => {
    const g = (flags: G['flags']): G => Object.assign(newGameState('openfield', 0, 0), { flags });
    expect(holds(g({ dk_prec_passenger: true }), E_PREC)).toBe(false);
    expect(holds(g({ ca_precedents: 1 }), E_PREC)).toBe(false);
    expect(holds(g({ ca_precedents: 1, dk_prec_passenger: true }), E_PREC)).toBe(true);
    expect(holds(g({ ca_precedents: 1, dk_prec_passenger: false }), E_PREC)).toBe(false);
    expect(holds(g({ ca_precedents: 2 }), E_PREC)).toBe(true);
    // the clause picker's passenger clause reads the very same finding
    expect(cond(CLAUSES.find((c) => c.id === 'passenger')!.needs, g({ dk_prec_passenger: true }))).toBe(true);
  });

  it('E_REG: the register Marwood catalogued is bought back for two hundred, or lifted from the acquisitions drawer at night', async () => {
    const a = await atKnock({ tolls: 250 });
    expect(holds(a.g, E_REG)).toBe(false);
    register(a);
    expect(a.g.pc.inventory.tolls).toBe(50);
    expect(holds(a.g, E_REG)).toBe(true);
    const n = await atKnock();
    n.g.locationId = 'md_spire';
    hour(n.g, 2);
    eff(n.g, 'security', 60);
    drive(n, 'd_a3_acquisitions', ['(Work the drawer\'s lock']);
    expect(n.g.flags.a3_register_how).toBe('lifted');
    expect(holds(n.g, E_REG)).toBe(true);
  });
});

// ---------------------------------------------------------------- the property over the presets

describe('B6w: from the earliest Act 3 save, every preset reaches every ending §3 promises', () => {
  const PRESETS: Preset[] = ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'];
  it('each preset, played forward through Act 3\'s scenes and alternates to the save before the steps, then each way from the loaded copy to the credits', async () => {
    const table: Record<string, string[]> = {};
    for (const preset of PRESETS) {
      const a = await earliest(preset);
      const keysAtFirst = Object.entries(KEYS).filter(([, c]) => holds(a.g, c)).map(([k]) => k);
      readOrder(a);
      muster(a, preset === 'prepared');
      court(a);
      register(a);
      home(a);
      archive(a);
      door(a);
      mast(a);
      summons(a);
      officer(a);
      charge(a);
      const save = goUp(a);
      // the save comes back as it was: before the steps, every key the gates read still held
      for (const [k, c] of Object.entries(KEYS)) if (k !== 'E_FILE') expect(cond(c, save), `${preset} ${k}`).toBe(true);
      const reached: string[] = [];
      for (const way of WAYS) {
        const f = await down(save, SASH_FOR[way]);
        expect(desk(f), `${preset} ${way}`).toContain(way);
        finish(atDesk(f, way), ['Your house\'s line is read.', '(Get between them', '(Walk to the foot of the stair', '(Call the wardens', '(Nod to the wardens', '(Sit down on the fourth step.)']);
        expect(f.g.flags.a3_climax_done, `${preset} ${way}`).toBe(true);
        const ep = epilogue(f.g);
        expect(ep.credits, `${preset} ${way}`).toEqual([{ name: 'credits', data: undefined }]);
        reached.push(`${way}:${ep.first}`);
      }
      table[`${preset} (held at first: ${keysAtFirst.join(',') || 'none'})`] = reached;
    }
    // every preset reached all six, and each end opened on its own first page
    for (const [k, r] of Object.entries(table)) expect(r, k).toEqual(['sign:steps_worn', 'walk:steps_refused', 'down:steps_unwritten', 'sell:steps_concern', 'read:steps_opensky', 'amend:steps_amended']);
    expect(Object.keys(table)).toHaveLength(PRESETS.length);
  });
});

// ---------------------------------------------------------------- all of Act 3, checked whole

/** Act 3's conversations: its own trees and every older tree with an Act 3 entry. */
const A3_TREES = Object.values(DIALOGUES).filter((d) => /a3/.test(d.id) || /"a3_/.test(JSON.stringify(d.start)));

/** From every start, every node reachable along options (and their fail branches) can reach an exit. */
function trapped(d: DialogueDef): { reached: number; trapped: string[] } {
  const exits = new Set<string>();
  for (let changed = true; changed;) {
    changed = false;
    for (const [id, n] of Object.entries(d.nodes)) {
      if (exits.has(id)) continue;
      if (n.options.some((o) => o.exit || (!o.next && !o.fail) || (o.next && exits.has(o.next)) || (o.fail && exits.has(o.fail)))) { exits.add(id); changed = true; }
    }
  }
  const seen = new Set<string>();
  const stack = d.start.map((s) => s.node);
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id) || !d.nodes[id]) continue;
    seen.add(id);
    for (const o of d.nodes[id].options) for (const n of [o.next, o.fail]) if (n) stack.push(n);
  }
  return { reached: seen.size, trapped: [...seen].filter((id) => !exits.has(id)) };
}
/** Played: from the tree's start in this game, every node reached (each option tried from a copy) shows an open option, and the
 * nodes reached can reach an exit in play. */
function played(d: DialogueDef, g0: G): { nodes: Set<string>; stuck: string[]; trapped: string[] } {
  const host = { event: () => undefined };
  const g1 = structuredClone(g0);
  const r0 = new DialogueRunner(d, g1, new QuestEngine(QUESTS, g1, host));
  const nodes = new Set<string>();
  if (!r0.node) return { nodes, stuck: [], trapped: [] };
  const edges = new Map<string, Set<string>>();
  const stuck: string[] = [];
  const queue: [G, string][] = [[g1, r0.node]];
  nodes.add(r0.node);
  while (queue.length && edges.size < 400) {
    const [g, node] = queue.shift()!;
    const r = new DialogueRunner(d, structuredClone(g), host);
    r.node = node;
    const open = r.view()!.options.filter((o) => !o.locked);
    const out = new Set<string>();
    edges.set(node, out);
    if (!open.length) { stuck.push(node); continue; }
    for (const o of open) {
      const gc = structuredClone(g);
      const rc = new DialogueRunner(d, gc, new QuestEngine(QUESTS, gc, host));
      rc.node = node;
      rc.choose(o.id);
      if (rc.ended) { out.add('#exit'); continue; }
      out.add(rc.node!);
      if (!nodes.has(rc.node!)) { nodes.add(rc.node!); queue.push([gc, rc.node!]); }
    }
  }
  const ok = new Set<string>(['#exit']);
  for (let ch = true; ch;) { ch = false; for (const [k, s] of edges) if (!ok.has(k) && [...s].some((x) => ok.has(x))) { ok.add(k); ch = true; } }
  return { nodes, stuck, trapped: [...edges.keys()].filter((k) => !ok.has(k)) };
}
/** Where each tree is spoken (its NPC's or prop's map), so conditions on the place hold as they would. */
const HOME: Record<string, string> = {};
for (const [mid, m] of Object.entries(MAPS)) {
  for (const n of m.npcs ?? []) if (n.dialogue) HOME[n.dialogue] ??= mid;
  for (const t of Object.values(m.talk ?? {})) HOME[(t as { dialogue: string }).dialogue] ??= mid;
}
for (const n of Object.values(CONTENT.NPCS)) if (n.dialogue) HOME[n.dialogue] ??= HOME[n.dialogue];

describe('B6w: all of Act 3, checked whole', () => {
  it('no conversation loops: in every tree of the game, every node reachable from a start reaches an exit', () => {
    let nodes = 0;
    const bad: string[] = [];
    for (const d of Object.values(DIALOGUES)) {
      const t = trapped(d);
      nodes += t.reached;
      bad.push(...t.trapped.map((n) => `${d.id}/${n}`));
    }
    expect(bad).toEqual([]);
    expect(Object.keys(DIALOGUES).length).toBeGreaterThan(800);
    expect(nodes).toBeGreaterThan(5000);
    expect(A3_TREES.length).toBeGreaterThan(100);
  });

  /** The games to play every Act 3 tree under: each preset at each stage of the act (from the fixture), and the long run's own
   * states as it went (the order read, home, the door, the close, the alternates gathered, the vault worn and refused, each end). */
  const DOOR = { a3_summoned: true, a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down' };
  const HELD = { a3_mast: 'raised', a3_mast_how: 'x', a3_mast_keeper: 'hollow', a3_concern_terms: 'accepted', a3_terms_from: 'officer', a3_unwritten: 'with_you', a3_bram_cut: true };
  async function seeds(p: Preset): Promise<[string, G][]> {
    const out: [string, G][] = [];
    const fx = (name: string, over: Over) => out.push([`${p} ${name}`, actThree(p, over).g]);
    fx('eve', { point: 'eve' }); fx('read', {}); fx('knock', { flags: { a3_at_knock: true } }); fx('inside', { flags: { a3_at_knock: true, a3_inside: true } });
    fx('apron', { flags: { a3_at_knock: true, a3_column_apron: true } }); fx('close', { flags: DOOR });
    // everyone, or nobody, or all of them estranged (only where the history lets them be: a hostile Ash carried his orders and is gone)
    if (p === 'truce' || p === 'prepared') for (const c of ['everyone', 'estranged', 'nobody'] as const) { fx(`${c} knock`, { companions: c, flags: { a3_at_knock: true } }); fx(`${c} close`, { companions: c, flags: DOOR }); }
    if (p === 'prepared' || p === 'hostile' || p === 'guild') for (const sash of ['worn', 'refused']) for (const [end, more] of [['', {}], ['plan', {}], ['unwritten', { a3_down_how: 'charge' }], ['concern', {}], ['opensky', { a3_reader: 'self', a3_ready: 3 }], ['amendment', {}]] as const) {
      fx(`${end || 'vault'} ${sash}`, { items: ['k_a3_charge', 'k_a3_transfer'], flags: { ...DOOR, ...HELD, a3_pnr: true, a3_sash: sash, ...(end ? { a3_end: end } : {}), ...more } });
    }
    if (p !== 'prepared' && p !== 'hostile') return out;
    // the long run's own states, as it went
    const a = await earliest(p);
    const snap = (name: string, g: G = a.g) => out.push([`${p} run ${name}`, structuredClone(g)]);
    snap('first');
    readOrder(a); snap('read');
    muster(a, p === 'prepared'); court(a); register(a); home(a); snap('home');
    archive(a); door(a); snap('door');
    mast(a); summons(a); snap('close');
    officer(a); charge(a); snap('held');
    const save = goUp(fork(a.g));
    for (const sash of ['worn', 'refused'] as const) snap(`vault ${sash}`, (await down(save, sash)).g);
    for (const way of WAYS) { const f = await down(save, SASH_FOR[way]); atDesk(f, way); snap(`end ${way}`, f.g); }
    return out;
  }
  const REACHED = new Set<string>();
  for (const p of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) {
    it(`and in play (${p}): in every Act 3 tree, at every stage of the act and at every end, each node reached shows an option and can be left`, async () => {
      const problems: string[] = [];
      for (const [name, g] of await seeds(p)) {
        for (const d of A3_TREES) {
          g.locationId = HOME[d.id] ?? g.locationId;
          const r = played(d, g);
          for (const n of r.nodes) REACHED.add(`${d.id}/${n}`);
          problems.push(...r.stuck.map((n) => `${name}: ${d.id}/${n} shows no option`), ...r.trapped.map((n) => `${name}: ${d.id}/${n} cannot be left`));
        }
      }
      expect(problems).toEqual([]);
    }, 20000);
  }
  it('and the games played reach a large share of Act 3\'s conversations (the static check above covers every node)', () => {
    // the trees' own nodes and the older nodes they carry whole (Act 1–2 entries a game in Act 3 no longer reaches)
    const all = A3_TREES.reduce((n, d) => n + trapped(d).reached, 0);
    expect(REACHED.size / all, `${REACHED.size} of ${all}`).toBeGreaterThan(0.35);
  });

  it('every flag Act 3 reads is written somewhere, with every value it is read for; every thing known it reads is learned somewhere', () => {
    type R = Map<string, Set<string>>;
    const walk = (x: unknown, f: (o: Record<string, unknown>) => void, seen = new Set<unknown>()): void => {
      if (!x || typeof x !== 'object' || seen.has(x)) return;
      seen.add(x);
      if (Array.isArray(x)) { for (const v of x) walk(v, f, seen); return; }
      f(x as Record<string, unknown>);
      for (const v of Object.values(x as Record<string, unknown>)) walk(v, f, seen);
    };
    const ALL_CONTENT = [CONTENT.DIALOGUES, CONTENT.QUESTS, CONTENT.WORLD_EVENTS, CONTENT.MAPS, CONTENT.NPCS, CONTENT.LETTERS, CONTENT.LEADS, CONTENT.CONCLUSIONS, CONTENT.ITEMS, CONTENT.ROAD_ENCOUNTERS, CONTENT.FACTIONS, CONTENT.PERKS, CONTENT.TRAITS, CONTENT.CHROME, CONTENT.SETTLEMENTS, CONTENT.ORIGINS, CONTENT.FAMILIES, CONTENT.WORLD_MAP, CONTENT.REGIONS];
    const writes: R = new Map(), learned = new Set<string>();
    for (const reg of ALL_CONTENT) walk(reg, (o) => {
      if (typeof o.learn === 'string') learned.add(o.learn);
      const k = typeof o.set === 'string' ? o.set : typeof o.inc === 'string' ? o.inc : undefined;
      if (!k) return;
      const s = writes.get(k) ?? new Set<string>();
      s.add(typeof o.set === 'string' ? String(o.value ?? true) : '#num');
      writes.set(k, s);
    });
    // Act 3's reach: its own trees and quests, every older tree, event, trigger, placement, person and letter that reads or writes
    // an Act 3 flag, the shared conditions in a3_conds.ts (gates, modifiers, selectors) and every page of the epilogue
    const a3 = (x: unknown) => /"(a3_|ep_)/.test(JSON.stringify(x));
    const scope: unknown[] = [
      ...A3_TREES, ...Object.values(DIALOGUES).filter(a3), ...Object.values(QUESTS).filter((q) => /^q_a3/.test(q.id) || a3(q)),
      ...Object.values(CONTENT.WORLD_EVENTS).filter(a3), ...Object.values(MAPS).flatMap((m) => [...(m.triggers ?? []), ...(m.npcs ?? [])].filter(a3)),
      ...Object.values(CONTENT.NPCS).filter(a3), ...Object.values(CONTENT.LETTERS).filter(a3), ...Object.values(CONTENT.ROAD_ENCOUNTERS).filter(a3), ...Object.values(CONDS), EP_SPECS,
    ];
    const reads: R = new Map(), knows = new Set<string>();
    walk(scope, (o) => {
      if (typeof o.knows === 'string') knows.add(o.knows);
      if (typeof o.flag !== 'string') return;
      const s = reads.get(o.flag) ?? new Set<string>();
      s.add(o.eq !== undefined ? String(o.eq) : o.gte !== undefined || o.lte !== undefined ? '#num' : '*');
      reads.set(o.flag, s);
    });
    // written by the runtime, not by content: where the player has been, and the camp
    const RUNTIME = /^(visited_|at_camp$)/;
    const bad: string[] = [];
    for (const [f, vs] of reads) {
      if (RUNTIME.test(f)) continue;
      const w = writes.get(f);
      if (!w) { bad.push(f); continue; }
      for (const v of vs) {
        if (v === '#num') { if (![...w].some((x) => x === '#num' || /^-?\d+$/.test(x))) bad.push(`${f} (a number)`); }
        else if (v !== '*' && !w.has(v)) bad.push(`${f} = ${v}`);
      }
    }
    expect(bad).toEqual([]);
    expect([...knows].filter((k) => !learned.has(k))).toEqual([]);
    expect(reads.size).toBeGreaterThan(600);
    // no exemption: the old switch for a city-wide war on the player (`md_fight`) was read and never written, and its reads are gone
    expect(reads.has('md_fight')).toBe(false);
    // the gate keys, the modifiers and the clauses are among what was checked
    for (const f of ['a3_end', 'a3_sash', 'a3_mast', 'a3_unwritten', 'ca_precedents', 'a3_ready', 'ep_sky', 'a3_amend_fines', 'prec_reserve', 'a3_c9']) expect(reads.has(f), f).toBe(true);
    expect(CLAUSES.every((c) => writes.has(`a3_amend_${c.id}`))).toBe(true);
  });

  it('no war with the whole city: nothing reads or writes `md_fight`; each warden fight turns only the wardens in it, and the Precinct\'s doors stay open', () => {
    // nothing in the content ever turned every warden of the city at once, and nothing offered a way to end it, so its reads are gone
    expect(JSON.stringify([DIALOGUES, QUESTS, MAPS, CONTENT.NPCS, CONTENT.WORLD_EVENTS, CONTENT.LETTERS, CONTENT.ROAD_ENCOUNTERS])).not.toContain('md_fight');
    const g = (flags: G['flags']): G => Object.assign(newGameState('md_precinct', 0, 0), { flags });
    const wardens = Object.values(CONTENT.NPCS).filter((n) => n.team === 'wardens');
    const turned = (flags: G['flags']) => wardens.filter((n) => n.hostileIf && cond(n.hostileIf, g(flags))).map((n) => n.id).sort();
    expect(turned({})).toEqual([]);
    expect(turned({ a3_recall_fight: true })).toEqual(['npc_a3_g1', 'npc_a3_g2']);
    expect(turned({ a3_door_fight: true })).toEqual(['npc_a3_g3', 'npc_a3_g4', 'npc_a3_g5', 'npc_a3_g6', 'npc_md_01', 'npc_md_12']);
    expect(turned({ a3_door_fight: true, a3_c9: 'sealed' })).toEqual([]);
    expect(turned({ sk_fight_pumps: true })).toEqual(['npc_sk_w1', 'npc_sk_w2']);
    expect(turned({ ln_escort_fight: true, ln_city_warrant: true })).toEqual(['npc_ln_e1', 'npc_ln_e2']);
    // after every scoped fight at once, the gate, the captain, the Court, the catalogue and the stair still open on their own words
    const after = g({ a3_recall_fight: true, a3_door_fight: true, a3_c9: 'sealed', sk_fight_pumps: true, cr_fight_wardens: true, ln_wardens_fight: true, ln_escort_fight: true, ln_city_warrant: true });
    for (const id of ['d_md_gate', 'd_md_lowe', 'd_ca_court', 'd_ar_keeper', 'd_ar_stair']) {
      const gc = structuredClone(after);
      const r = new DialogueRunner(DIALOGUES[id], gc, new QuestEngine(QUESTS, gc, { event: () => undefined }));
      expect(r.view()!.text, id).not.toBe('Nothing.');
      expect(r.view()!.options.some((o) => !o.locked && o.text !== '(Nothing.)'), id).toBe(true);
    }
  });
});
