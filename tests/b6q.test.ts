import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_VAULT_DIALOGUES, VAULT_DOOR_NODES } from '../src/content/dialogue/a3_vault';
import {
  A1, A2, AT_VAULT, B, B_MEANS, C, CLAUSES, D, D_ARCHIVE, D_PEOPLE, D_READER, D_VOICE, DOWN_CHARGE, DOWN_COUPLING, DOWN_FIRE, E, E_FILE, E_PREC,
  E_REG, C_BUYER, READ_NINE, READ_SELF, READ_SEVENTEEN, READ_VERITY,
} from '../src/content/world/a3_conds';
import { SITES } from '../src/content/world/sites';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { Grid } from '../src/engine/scene/grid';
import type { SkillId } from '../src/engine/stats/rules';
import { skill } from '../src/engine/stats/sheet';
import { apply, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, saveAndLoad, stage, status, waitFor, at as bare, type A3, type G, type Over, type Preset } from './a3_fixture';
import { regenerate } from './map_gen';

/**
 * B6q — the Vault of Accounts and the choice. The steel door in the Spire's foot opens on its stair once the steps are done; the
 * map under the Spire (walkable, every spot and prop reachable, its generator's); the Ledger's last conversation, each topic once
 * and each by what the player did; what each way costs, asked only of the ways held; the choice at the desk offering exactly the
 * ways the player's holdings allow (the gates), the sash deciding the Plan's two forms and the worn ways; every choice and every
 * refusal ("(No. Not that.)", stepping back, the Ledger's own "I cannot", leaving, days going by); the no-lockout property from the
 * "Before the steps" save, played through the steps and down the stair for real; and a save round-trip in the vault. Played
 * headless with the shared Act 3 fixture.
 */

type Flags = Record<string, string | boolean | number>;
interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[]; saved: G[] };
const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down' };
const NINE = 'npc_md_nine';
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
/** In the vault: the steps done (B6m's faithful shortcut: the sash written as the steps write it), at the foot of the stair. */
function vault(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}, sash: 'worn' | 'refused' = 'worn'): Game {
  const a = close(preset, over, { a3_pnr: true, a3_steps_photo: true, a3_steps_sash: sash, a3_sash: sash, ...flags });
  a.g.locationId = 'md_vault';
  a.q.update();
  return a;
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
const ledger = (a: A3): DialogueRunner => { const r = new DialogueRunner(DIALOGUES.d_a3_ledger, a.g, a.q); a.q.update(); return r; };
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const has_ = (r: DialogueRunner, t: string) => opts(r).some((o) => o.startsWith(t));
const passives = (r: DialogueRunner) => r.view()!.passives.map((p) => `${p.label}: ${p.text}`);
/** Into the hall, through the first words, to the hub. */
function toHub(a: A3): DialogueRunner {
  const r = ledger(a);
  if (r.node === 'arrive') go(r, a, ['(Walk down the aisle', '(Listen.)']);
  expect(r.node).toBe('hub');
  return r;
}
const toDesk = (a: A3): DialogueRunner => go(toHub(a), a, ['(Go to the desk.)']);
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const kill = (g: G, id: string, map: string) => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };

/** The ways at the desk, by their act (never named as endings: these are the test's names for them). */
const WAY_TEXT: [string, string][] = [
  ['(Sit down in the chair, and sign', 'sign'], ['(Leave the chair empty', 'walk'], ['(Bring it down.)', 'down'],
  ['(Lay the Concern', 'sell'], ['(Turn the relay key', 'read'], ['(Sit down in the chair, and amend', 'amend'],
];
const ways = (r: DialogueRunner): string[] => opts(r).flatMap((t) => WAY_TEXT.filter(([p]) => t.startsWith(p)).map(([, w]) => w));
const GATES: [string, Cond][] = [['sign', A1], ['walk', A2], ['down', B], ['sell', C], ['read', D], ['amend', E]];
const held = (g: G): string[] => GATES.filter(([, c]) => cond(c, g)).map(([w]) => w);
const WAY_TO: Record<string, string> = { sign: '(Sit down in the chair, and sign', walk: '(Leave the chair empty', down: '(Bring it down.)', sell: '(Lay the Concern', read: '(Turn the relay key', amend: '(Sit down in the chair, and amend' };
const END_OF: Record<string, string> = { sign: 'plan', walk: 'plan', down: 'unwritten', sell: 'concern', read: 'opensky', amend: 'amendment' };

/** A thorough game holding every way's keys: the charge, the Concern's paper, the hill raised, the Unwritten turned. */
const ALL_KEYS: [Preset, Over, Flags] = ['prepared', { b4b: true, items: ['k_a3_transfer', 'k_a3_charge'] }, { a3_mast: 'raised', a3_mast_how: 'x', a3_mast_keeper: 'hollow', a3_concern_terms: 'accepted', a3_terms_how: 'taken', a3_terms_from: 'officer', a3_unwritten: 'with_you' }];
const allKeys = (sash: 'worn' | 'refused' = 'worn', flags: Flags = {}, over: Over = {}): Game => vault(ALL_KEYS[0], { ...ALL_KEYS[1], ...over }, { ...ALL_KEYS[2], ...flags }, sash);

// ---------------------------------------------------------------- the map

describe('B6q: the Vault of Accounts, under the Spire', () => {
  it('a cell entered instantly; validates; its generator reproduces it, and the close\'s with its new spawn', () => {
    expect(SITES.md_vault).toEqual({ kind: 'cell' });
    const m = MAPS.md_vault;
    expect(m.interior).toBe(true);
    expect(m.layout).toHaveLength(32);
    expect(m.layout.every((row) => row.length === 48)).toBe(true);
    expect(/vault/i.test(m.name)).toBe(false); // the naming bible's banned word: the in-world lettering keeps it, the place's name does not
    expect(readFileSync('src/content/maps/md_vault.ts', 'utf8')).toContain('Generated by tools/maps/gen_md_vault.py');
    for (const g of regenerate('gen_md_vault.py')) expect(g.generated, g.map).toBe(g.committed);
    for (const g of regenerate('gen_md_spire.py')) expect(g.generated, g.map).toBe(g.committed);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /md_vault|a3_vault|d_a3_ledger|d_ar_vault|md_spire|q_a3_spire/.test(e))).toEqual([]);
  });

  it('the stair, the drop, the racks and the desk: every spot and every prop that opens something can be walked to from the door', () => {
    const m = MAPS.md_vault, grid = new Grid(m);
    const door = m.spawns.find((s) => s.id === 'door')!;
    expect(m.spawns.map((s) => s.id).sort()).toEqual(['door', 'start']);
    expect(Object.keys(m.spots!).sort()).toEqual(['core', 'desk', 'door', 'drop']);
    for (const [k, p] of Object.entries(m.spots!)) {
      expect(grid.passable(p.x, p.y), k).toBe(true);
      if (p.x !== door.x || p.y !== door.y) expect(grid.findPath(door.x, door.y, p.x, p.y), k).not.toBeNull();
    }
    for (const [id, t] of Object.entries(m.talk!)) {
      const p = m.props!.find((x) => x.id === id)!;
      expect(p, id).toBeDefined();
      expect(DIALOGUES[t.dialogue], id).toBeDefined();
      expect(grid.findPath(door.x, door.y, p.x, p.y, { adjacentOk: true }), id).not.toBeNull();
    }
    expect(m.talk!.a3_vault_desk.dialogue).toBe('d_a3_ledger');
    expect(m.talk!.a3_vault_core.dialogue).toBe('d_a3_ledger');
    expect(m.talk!.a3_vault_drop.dialogue).toBe('d_a3_vault_drop');
    expect(m.talk!.a3_vault_trunk.dialogue).toBe('d_a3_vault_trunk');
    // the way up: the stair's top to the close, beside the steel door
    const up = m.exits!.find((e) => 'location' in e.to && e.to.location === 'md_spire')!;
    expect(up.to).toEqual({ location: 'md_spire', spawn: 'from_vault' });
    const fromVault = MAPS.md_spire.spawns.find((s) => s.id === 'from_vault')!;
    const steel = MAPS.md_spire.props!.find((p) => p.id === 'ar_vault')!;
    expect(Math.abs(fromVault.x - steel.x) + Math.abs(fromVault.y - steel.y)).toBe(1);
    expect(new Grid(MAPS.md_spire).passable(fromVault.x, fromVault.y)).toBe(true);
    // the Ledger is a voice: nobody is placed but B6r's stair wardens, who come only once drawn on after the core is brought down
    expect(m.npcs!.filter((n) => JSON.stringify(n.if) !== JSON.stringify({ all: [{ flag: 'a3_vault_fight' }, { not: { flag: 'a3_vault_out' } }] }))).toEqual([]);
  });

  it('the first step into the hall opens the last conversation, once, only after the steps and before the choice', () => {
    const t = MAPS.md_vault.triggers!.find((x) => x.id === 'a3_vault_hall')!;
    expect(t.effects).toEqual([{ event: 'dialogue', data: { tree: 'd_a3_ledger', name: 'Ledger' } }]);
    const a = vault('truce');
    expect(cond(t.if, a.g)).toBe(true);
    ledger(a);
    expect(a.g.flags.a3_vault_met).toBe(true);
    expect(cond(t.if, a.g)).toBe(false);
    const b = close('truce', {}, { a3_pnr: true });
    expect(cond(t.if, b.g)).toBe(false);
    expect(cond(t.if, vault('truce', {}, { a3_end: 'plan' }).g)).toBe(false);
  });
});

// ---------------------------------------------------------------- the steel door

describe('B6q: the steel door in the Spire\'s foot', () => {
  it('shut and warm before the steps are done (the Act 2 look, unchanged); open on its stair after them, the way down a goto', () => {
    const old = bare('md_spire');
    const d0 = new DialogueRunner(DIALOGUES.d_ar_vault, old.g, old.q);
    expect(d0.node).toBe('look');
    expect(opts(d0)).toEqual(['(Leave it.)']);
    for (const f of [{}, { a3_pnr: true }] as Flags[]) { const c = close('truce', {}, f); expect(new DialogueRunner(DIALOGUES.d_ar_vault, c.g, c.q).node, JSON.stringify(f)).toBe('look'); }
    for (const sash of ['worn', 'refused'] as const) {
      const a = close('truce', {}, { a3_pnr: true, a3_sash: sash });
      const r = new DialogueRunner(DIALOGUES.d_ar_vault, a.g, a.q);
      expect(r.node, sash).toBe('vault_open');
      expect(r.view()!.text).toContain('VAULT OF ACCOUNTS');
      expect(opts(r)).toEqual(['(Go down.)', '(Not yet.)']);
      const before = JSON.stringify(a.g.flags);
      go(r, a, ['(Go down.)']);
      expect(r.ended).toBe(true);
      expect(a.events.find((e) => e.name === 'goto')!.data).toEqual({ location: 'md_vault', spawn: 'door' });
      expect(JSON.stringify(a.g.flags)).toBe(before);
      expect(MAPS.md_vault.spawns.some((s) => s.id === 'door')).toBe(true);
    }
    const n = close('truce', {}, { a3_pnr: true, a3_sash: 'worn' });
    const before = JSON.stringify(n.g.flags);
    go(new DialogueRunner(DIALOGUES.d_ar_vault, n.g, n.q), n, ['(Not yet.)']);
    expect(JSON.stringify(n.g.flags)).toBe(before);
    expect(n.events).toEqual([]);
  });
});

// ---------------------------------------------------------------- the last conversation

describe('B6q: the Ledger\'s last conversation', () => {
  it('the hall first, then its first words by what happened on the steps, then the hub; coming back, the hub', () => {
    const cases: [Flags, 'worn' | 'refused', string][] = [
      [{ a3_file: 'contested' }, 'worn', 'You contested your file in front of the city, and then you took the sash'],
      [{ ar_verdict: 'noted' }, 'worn', 'The lens clicked twice'],
      [{ a3_steps_off: true }, 'refused', 'and took it off again'],
      [{ a3_file: 'contested' }, 'refused', 'and declined the sash. That is consistent'],
      [{ ar_verdict: 'noted' }, 'refused', 'You came down without the sash'],
    ];
    for (const [flags, sash, line] of cases) {
      const a = vault('truce', {}, flags, sash);
      const r = ledger(a);
      expect(r.node).toBe('arrive');
      expect(r.view()!.text).toContain('a desk');
      go(r, a, ['(Walk down the aisle']);
      expect(r.view()!.speaker).toBe('npc_ar_voice');
      expect(r.view()!.text, line).toContain(line);
      expect(r.view()!.text).toContain('Thank you for coming down.');
      expect(r.view()!.text.startsWith('The voice comes from the racks')).toBe(true);
      expect(r.view()!.text).toContain(sash === 'worn' ? '"Magistrate.' : '"Designate.');
      go(r, a, ['(Listen.)']);
      expect(r.node).toBe('hub');
      expect(ledger(a).node).toBe('hub');
    }
    // the round room "as you did" only for a designate who went up to the hearing
    const heard = vault('truce');
    expect(go(ledger(heard), heard, ['(Walk down the aisle']).view()!.text).toContain('spoke to a grille, as you did.');
    const never = vault('truce');
    delete never.g.flags.ar_verdict;
    const t = go(ledger(never), never, ['(Walk down the aisle']).view()!.text;
    expect(t).toContain('spoke to a grille."');
    expect(t).not.toContain('as you did');
  });

  it('each topic is asked once; the uncounted only when the player knows one of them; the letter and the hill only when they happened', () => {
    const a = vault('truce', { companions: 'nobody' });
    const r = toHub(a);
    expect(has_(r, 'The ones you couldn\'t count.')).toBe(false);
    expect(has_(r, 'The letter you sent me')).toBe(false);
    expect(has_(r, 'At Signal Hill')).toBe(false);
    for (const [t, k] of [['Why now?', 'a3_ledger_why'], ['Reserve 9.', 'a3_ledger_reserve'], ['What are you?', 'a3_ledger_for'], ['What do you want from me?', 'a3_ledger_want'], ['And if I do nothing at all?', 'a3_ledger_wait']]) {
      go(r, a, [t]);
      expect(a.g.world.knowledge[k], t).toBe(true);
      if (r.node === 'for') go(r, a, ['(Let it go on.)']);
      go(r, a, ['(Go on.)']);
      expect(r.node).toBe('hub');
      expect(has_(r, t), t).toBe(false);
    }
    // the letter read, the grid's GRANTED, Tamsin and Kes known
    const b = vault('truce', { knows: ['a3_ledger_granted', 'hc_scald_owned'] }, { a3_letter_read: true });
    const rb = toHub(b);
    go(rb, b, ['The letter you sent me']);
    expect(rb.view()!.text).toContain('YOU WILL BE ASKED. AGREE WHEN YOU ARE.');
    go(rb, b, ['(Go on.)', 'At Signal Hill']);
    expect(rb.view()!.text).toContain('GRANTED');
    go(rb, b, ['(Go on.)', 'What are you?', '(Let it go on.)']);
    expect(rb.view()!.text).toContain('You have heard on the hill who sent it');
    go(rb, b, ['(Go on.)', 'The ones you couldn\'t count.']);
    expect(rb.view()!.text).toContain('Tamsin Roe');
    expect(rb.view()!.text).toContain('She is standing in my aisle'); // she travels in the middling preset
    go(rb, b, ['And Kes?']);
    expect(rb.view()!.text).toContain('The girl from the Skirts');
    go(rb, b, ['(Go on.)']);
    expect(has_(rb, 'The ones you couldn\'t count.')).toBe(false);
    // Kes alone (Tamsin never met): her words come first, and no "And Kes?"
    const k = vault('truce', { companions: { tamsin: 'never', kes: 'party', nine: 'never' } }, { kes_link: 'cut' });
    const rk = go(toHub(k), k, ['The ones you couldn\'t count.']);
    expect(rk.view()!.text).toContain('The girl from the Skirts');
    expect(rk.view()!.text).toContain('the first who chose it');
    expect(has_(rk, 'And Kes?')).toBe(false);
    // the hill not heard of: the Ledger says where the Scald came from
    const s = vault('truce');
    expect(go(toHub(s), s, ['What are you?', '(Let it go on.)']).view()!.text).toContain('It came from a hill in the Teeth');
  });

  it('why now, by the side the player stood with at the Long Night', () => {
    const LINE: Record<string, string> = {
      choir: 'broken in the open, by people who keep no likeness', guild: 'A chair that stands empty can be bought', ledger: 'you showed me that the schedule holds',
      none: 'I do not know what to do with a preference', truce: 'every party in the Reach is in your debt',
    };
    for (const side of Object.keys(LINE)) {
      const a = vault(side as Preset);
      const r = go(toHub(a), a, ['Why now?']);
      expect(r.view()!.text, side).toContain(LINE[side]);
      expect(r.view()!.text).toContain('I am not permitted to be late.');
    }
  });

  it('the reserve, as the door left it, said truthfully; under the pen only while sealed and not stayed on consent', () => {
    const CASES: [Flags, string, boolean][] = [
      [{}, 'My captain stood down; my order did not', true],
      // struck from the record, still sealed: the chair's first paper all the same (M4 reads relocated before struck under the worn ways)
      [{ a3_c9_how: 'welded', a3_lowe: 'withdrawn' }, 'A weld does not stop paper', true],
      [{ a3_c9_how: 'fought', a3_lowe: 'yielded' }, 'You broke my column on the apron', true],
      [{ ca_reserve: 'attendance' }, 'formally decline to attend', true],
      [{ ca_reserve: 'stayed' }, 'stayed my order on consent', false],
      [{ a3_c9: 'opened', a3_c9_how: 'ines' }, 'opened its own door', false],
      [{ a3_c9: 'opened', a3_c9_how: 'ines', a3_mother: 'burned' }, 'Their caretaker is dark', false],
      [{ a3_c9_how: 'struck', prec_unrecorded: 'yields' }, 'entered by subtraction', true],
      [{ a3_c9_how: 'struck', a3_claim: 'held' }, 'CLAIMED — SALVAGE', true],
      [{ a3_c9_how: 'struck', prec_unrecorded: 'property' }, 'Somebody always reads the register', true],
      [{ a3_c9_how: 'struck', prec_unrecorded: 'outside' }, 'sixty people I could not see on purpose', true],
      [{ a3_c9: 'relocated', a3_c9_how: 'sold' }, 'The Concern has sixty sets of parts', false],
      [{ a3_c9: 'relocated', a3_c9_how: 'order' }, 'waiting on a word that went down a stair instead', false],
      [{ a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held' }, 'None of them were asked', false],
      [{ a3_c9: 'relocated', a3_c9_how: 'consent', a3_c9_after: 'walked', a3_buffer_how: 'court' }, 'a passenger and never cargo', false],
      [{ a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'stand' }, 'NOT RECEIVED', false],
      [{ a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'cradle' }, 'NOT FOUND AT RECEIPT', false],
      [{ a3_c9: 'relocated', a3_c9_how: 'forced', a3_tamsin_dead: true, a3_c9_after: 'held' }, 'RESIDENT ROE, SIXTY-ONE', false],
    ];
    for (const [flags, line, under] of CASES) {
      const a = vault('truce', {}, flags);
      const r = go(toHub(a), a, ['Reserve 9.']);
      const tag = JSON.stringify(flags);
      expect(r.view()!.text, tag).toContain(line);
      expect(r.view()!.text.includes('the first paper under your pen will be Reserve 9'), tag).toBe(under);
      expect(has_(r, 'Then let them go.'), tag).toBe(under);
    }
  });

  it('a refusal: asked to tear its own order up, it cannot, and says why; nothing changes', () => {
    const a = vault('truce');
    const r = go(toHub(a), a, ['Reserve 9.']);
    const before = { flags: JSON.stringify(a.g.flags), q: JSON.stringify(a.g.world.quests), d: a.g.world.decisions.length };
    go(r, a, ['Then let them go.']);
    expect(r.node).toBe('reserve_no');
    expect(r.view()!.text).toContain('"I cannot."');
    expect(r.view()!.text).toContain('Only someone else can.');
    expect(JSON.stringify(a.g.flags)).toBe(before.flags);
    expect(JSON.stringify(a.g.world.quests)).toBe(before.q);
    expect(a.g.world.decisions).toHaveLength(before.d);
    expect(a.g.world.knowledge.a3_ledger_refused).toBe(true);
    go(r, a, ['(Go on.)']);
    expect(has_(r, 'Reserve 9.')).toBe(false);
  });
});

// ---------------------------------------------------------------- what each way costs

describe('B6q: what each way costs, forecast truthfully, asked only of the ways held', () => {
  it('the costs offered are exactly the ways held; each once; the topic closes once all are heard', () => {
    for (const sash of ['worn', 'refused'] as const) {
      const a = allKeys(sash);
      const r = go(toHub(a), a, ['Whatever I do down here']);
      const asks = opts(r).filter((t) => t.startsWith('If I'));
      const want = held(a.g).map((w) => ({ sign: 'If I sit down in the chair and sign', walk: 'If I leave the chair empty', down: 'If I bring you down', sell: 'If I sign you over', read: 'If I read you out', amend: 'If I sit in the chair and change' })[w]!);
      expect(asks.length, sash).toBe(want.length);
      for (const w of want) expect(asks.some((t) => t.startsWith(w)), `${sash} ${w}`).toBe(true);
      for (const t of asks) {
        go(r, a, [t]);
        const node = r.node!;
        expect(a.g.world.knowledge[`a3_cost_${node.slice(5)}`], node).toBe(true);
        go(r, a, [r.view()!.options.some((o) => o.text === '(Ask about another.)') ? '(Ask about another.)' : '(That\'s enough.)']);
      }
      if (r.node !== 'hub') go(r, a, ['(That\'s enough.)']);
      expect(has_(r, 'Whatever I do down here'), sash).toBe(false);
    }
    // the hostile game holds only the first way: one cost
    const h = vault('hostile');
    const rh = go(toHub(h), h, ['Whatever I do down here']);
    expect(opts(rh).filter((t) => t.startsWith('If I'))).toEqual(['If I sit down in the chair and sign what it\'s given.']);
  });

  it('the forecasts read this game: the open lines that fall due, the night after reading by readiness, the rulings held, the seat', () => {
    // the chair: the reserve first, and every open line on the list
    const a = vault('hostile');
    const r = go(toHub(a), a, ['Whatever I do down here', 'If I sit down in the chair']);
    const p = passives(r);
    expect(p).toContain('RESERVE 9: "The first paper under your pen is Reserve 9. The charter puts it before every other. You will sign it first."');
    expect(p.some((x) => x.includes('VEY, ADA'))).toBe(true);
    expect(p.some((x) => x.includes('CALLA, SISTER'))).toBe(true);
    expect(p.some((x) => x.includes('VANE, CELESTINE')), 'House Vane already rose: no longer open').toBe(false);
    expect(p.some((x) => x.includes('SARR, IMELDA')), 'Sarr is dead in this game').toBe(false);
    // reading: the night after by the readiness count, and what was counted
    for (const [n, band] of [[6, 'You have prepared for it'], [3, 'You have prepared some of it'], [0, 'You have prepared nothing']] as const) {
      const d = allKeys('worn', { a3_ready: n, ...(n ? { a3_ready_choir: true } : {}) });
      const rd = go(toHub(d), d, ['Whatever I do down here', 'If I read you out']);
      const pd = passives(rd);
      expect(pd.filter((x) => x.startsWith('THE NIGHT AFTER')), String(n)).toHaveLength(1);
      expect(pd.find((x) => x.startsWith('THE NIGHT AFTER'))!, String(n)).toContain(band);
      expect(pd.some((x) => x.startsWith('COUNTED: "The Choir')), String(n)).toBe(n > 0);
    }
    // amending: exactly the rulings held
    const e = allKeys('worn');
    const re = go(toHub(e), e, ['Whatever I do down here', 'If I sit in the chair and change']);
    const rulings = passives(re).filter((x) => x.startsWith('YOUR RULINGS')).length;
    expect(rulings).toBe(CLAUSES.filter((c) => cond(c.needs, e.g)).length);
    expect(rulings).toBeGreaterThan(0);
    expect(re.view()!.text).toContain('I would agree to this.');
    // selling: the seat by the terms
    const s = allKeys('worn', { hs_marked: true, hs_gate_shut: true });
    expect(passives(go(toHub(s), s, ['Whatever I do down here', 'If I sign you over'])).some((x) => x.startsWith('YOUR SEAT') && x.includes('An annuity at Ninebridge'))).toBe(true);
    // walking out: the lens has another face
    const w = allKeys('refused');
    expect(go(toHub(w), w, ['Whatever I do down here', 'If I leave the chair empty']).view()!.text).toContain('I will write to her when she is fourteen.');
  });
});

// ---------------------------------------------------------------- the choice: exactly the ways held

describe('B6q: the choice at the desk offers exactly the ways the player\'s holdings allow', () => {
  it('everything held: the sash worn offers sign, bring down, sell, read and amend; refused, walk out, bring down and read', () => {
    const w = toDesk(allKeys('worn'));
    expect(ways(w)).toEqual(['sign', 'down', 'sell', 'read', 'amend']);
    expect(opts(w)).toContain('(Turn the relay key, and read it all out: every forecast it holds, to every receiver in the Reach, in the Magistrate\'s name.)');
    const r = toDesk(allKeys('refused'));
    expect(ways(r)).toEqual(['walk', 'down', 'read']);
    expect(opts(r)).toContain('(Turn the relay key, and read it all out: every forecast it holds, to every receiver in the Reach, in your own name.)');
    for (const d of [w, r]) expect(opts(d).slice(-2)).toEqual(['(Step back from the desk. Ask it something first.)', '(Step back from the desk, for now.)']);
    // the hostile game: the first way alone, worn or refused
    expect(ways(toDesk(vault('hostile')))).toEqual(['sign']);
    expect(ways(toDesk(vault('hostile', {}, {}, 'refused')))).toEqual(['walk']);
  });

  it('each way is offered by its gate and withdrawn with any one of its keys', () => {
    const without: [string, string, (a: Game) => void][] = [
      ['down', 'every means gone', (a) => { apply([{ take: 'k_a3_charge' }], a.g); delete a.g.flags.a3_unwritten; }],
      ['sell', 'no paper', (a) => apply([{ take: 'k_a3_transfer' }], a.g)],
      ['sell', 'no buyer', (a) => { for (const f of ['hc_offer', 'a3_concern_terms']) delete a.g.flags[f]; }],
      ['read', 'the hill narrow', (a) => { a.g.flags.a3_mast = 'narrow'; }],
      ['read', 'nobody to read', (a) => { a.g.world.party = a.g.world.party.filter((x) => x !== NINE); eff(a.g, 'science', 40); }],
      ['read', 'nobody to carry it', (a) => { a.g.world.news = a.g.world.news.filter((n) => n.origin !== 'openfield'); for (const f of ['ln_calla', 'a3_unwritten']) delete a.g.flags[f]; a.g.flags.ks_calla = 'imprisoned'; }],
      ['read', 'nothing the Cistern kept', (a) => { apply([{ take: 'k_ar_refusals' }], a.g); }],
      ['amend', 'no file', (a) => { a.g.flags.ar_verdict = 'refused'; }],
      ['amend', 'one ruling short', (a) => { a.g.flags.ca_precedents = 1; }],
      ['amend', 'the register sold', (a) => { a.g.flags.prec_register = 'catalogued'; }],
    ];
    for (const [way, why, take] of without) {
      const a = allKeys('worn');
      expect(ways(toDesk(a)), `${way} before: ${why}`).toContain(way);
      const b = allKeys('worn');
      take(b);
      b.q.update();
      expect(ways(toDesk(b)), `${way}: ${why}`).not.toContain(way);
      expect(ways(toDesk(b)).sort(), `${way}: ${why}`).toEqual(held(b.g).sort());
    }
  });

  it('over many games, the desk\'s ways are exactly the gates that hold (never more, never fewer), worn or refused', () => {
    const TWEAKS: Flags[] = [
      {}, { a3_unwritten: 'with_you' }, { a3_bram_cut: true }, { a3_concern_terms: 'accepted' }, { a3_mast: 'raised', a3_mast_keeper: 'knock' },
      { a3_file: 'contested', ca_precedents: 2, a3_register_back: true }, { a3_archive: 'open', a3_ally_wheel: true, a3_mast: 'raised', a3_mast_keeper: 'hollow' },
      { a3_ally_saints: true, bw_static: 'kept', a3_mast: 'raised', a3_mast_keeper: 'wheel', a3_c9: 'opened', a3_c9_how: 'ines' },
    ];
    let checked = 0;
    for (const preset of ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'] as Preset[]) {
      for (const t of TWEAKS) {
        for (const sash of ['worn', 'refused'] as const) {
          const a = vault(preset, { items: t.a3_concern_terms ? ['k_a3_transfer'] : [], skills: t.a3_bram_cut ? { mechanics: 60 } : {} }, t, sash);
          const desk = toDesk(a);
          expect(ways(desk).sort(), `${preset} ${sash} ${JSON.stringify(t)}`).toEqual(held(a.g).sort());
          expect(ways(desk)).toContain(sash === 'worn' ? 'sign' : 'walk');
          if (sash === 'refused') for (const w of ['sign', 'sell', 'amend']) expect(ways(desk)).not.toContain(w);
          checked++;
        }
      }
    }
    expect(checked).toBe(7 * TWEAKS.length * 2);
  });

  it('bringing it down offers exactly the means held, and reading out exactly the readers held (each a part of its key)', () => {
    const a = allKeys('worn', { a3_bram_cut: true, a3_ally_saints: true, a3_ally_seventeen: true }, { skills: { mechanics: 60, science: 70 } });
    const r = go(toDesk(a), a, ['(Bring it down.)']);
    expect(opts(r)).toEqual(['(Set the charge among the racks.)', '(Go along the trench to the trunk, and open the first coupling under load.)', '(Call up the stair for Petra\'s people, and their oil.)', '(No. Not that.)']);
    go(r, a, ['(No. Not that.)', '(Turn the relay key']);
    expect(opts(r)).toEqual(['(Read it yourself.)', '(Hold the key out to Nine.)', '(Call up the stair for Verity.)', '(Call up the stair for Assessor Seventeen.)', '(No. Not that.)']);
    // the unions are the keys, over many states
    const states: G[] = [];
    for (const preset of ['prepared', 'hostile', 'choir', 'truce'] as Preset[]) for (const f of [{}, { a3_unwritten: 'with_you' }, { a3_bram_cut: true }, { a3_ally_saints: true }, { a3_ally_seventeen: true }] as Flags[]) for (const sk of [40, 70]) {
      const v = vault(preset, { skills: { mechanics: sk, science: sk } }, f);
      states.push(v.g);
      const w = vault(preset, { companions: { ash: 'party' }, flags: { ash_orders: 'refused' } }, f);
      states.push(w.g);
    }
    for (const g of states) {
      expect(cond(B_MEANS, g)).toBe(cond({ any: [DOWN_FIRE, DOWN_CHARGE, DOWN_COUPLING] }, g));
      expect(cond(D_READER, g)).toBe(cond({ any: [READ_SELF, READ_NINE, READ_VERITY, READ_SEVENTEEN] }, g));
    }
    expect(states.some((g) => cond(DOWN_FIRE, g)) && states.some((g) => !cond(DOWN_FIRE, g))).toBe(true);
    // the fire's words follow who carries it: Juniper's people with Petra dead; Ash with his orders burned; the Choir's night
    const j = allKeys('worn');
    kill(j.g, 'npc_of_02', 'openfield');
    expect(opts(go(toDesk(j), j, ['(Bring it down.)']))).toContain('(Call up the stair for Juniper\'s people, and their oil.)');
    const ash = vault('truce', { companions: { ash: 'party' } }, { ash_orders: 'refused' });
    expect(opts(go(toDesk(ash), ash, ['(Bring it down.)']))).toEqual(['(Turn to Ash. He knows how the Unwritten burn a thing.)', '(No. Not that.)']);
    const ch = vault('choir');
    expect(opts(go(toDesk(ch), ch, ['(Bring it down.)']))).toEqual(['(Call up the stair for the Choir\'s people, and their oil.)', '(No. Not that.)']);
  });
});

// ---------------------------------------------------------------- every choice, and every refusal

describe('B6q: every choice, asked twice; every refusal changes nothing', () => {
  const CHOICES: ['worn' | 'refused', string, string[], Flags][] = [
    ['worn', 'sign', ['(Sign.)'], {}],
    ['refused', 'walk', ['(Go up the stair.)'], {}],
    ['worn', 'down', ['(Set the charge among the racks.)'], { a3_down_how: 'charge' }],
    ['worn', 'down', ['(Call up the stair for Petra'], { a3_down_how: 'fire' }],
    ['refused', 'down', ['(Set the charge among the racks.)'], { a3_down_how: 'charge' }],
    ['worn', 'sell', ['(Sign it.)'], {}],
    ['worn', 'read', ['(Hold the key out to Nine.)'], { a3_reader: 'nine' }],
    ['refused', 'read', ['(Hold the key out to Nine.)'], { a3_reader: 'nine' }],
    ['worn', 'amend', ['(Sit down, and wait for the register.)'], {}],
  ];
  it('each choice sets the end and its record, finishes the Spire\'s quest, and stands at its threshold for what follows', () => {
    for (const [sash, way, confirm, more] of CHOICES) {
      const a = allKeys(sash);
      const tag = `${sash} ${way} ${confirm[0]}`;
      const r = go(toDesk(a), a, [WAY_TO[way]]);
      expect(r.node, tag).toBe({ sign: 'c_sign', walk: 'c_walk', down: 'c_down', sell: 'c_sell', read: 'c_read', amend: 'c_amend' }[way]);
      expect(a.g.flags.a3_end, tag).toBeUndefined();
      go(r, a, confirm);
      expect(a.g.flags.a3_end, tag).toBe(END_OF[way]);
      for (const [k, v] of Object.entries(more)) expect(a.g.flags[k], `${tag} ${k}`).toBe(v);
      expect(a.g.world.decisions.filter((d) => d.id === 'a3_end'), tag).toHaveLength(1);
      expect(stage(a.g, 'q_a3_spire'), tag).toBe('ended');
      expect(status(a.g, 'q_a3_spire'), tag).toBe('done');
      expect(r.node, tag).toBe(`done_${way}`);
      const go_ = r.view()!.options;
      expect(go_.map((o) => [o.id, o.text, o.exit]), tag).toEqual([[`vault.go.${way}`, '(Go on.)', true]]);
      go(r, a, ['(Go on.)']);
      expect(r.ended).toBe(true);
      // the vault after the choice: the Ledger has nothing left to ask; the door at the top says something has changed
      expect(ledger(a).node, tag).toBe('v_after');
      expect(new DialogueRunner(DIALOGUES.d_ar_vault, a.g, a.q).view()!.text, tag).toContain('Something has.');
    }
    // the Plan's two forms by the sash, as the gates read them
    const w = allKeys('worn');
    go(toDesk(w), w, [WAY_TO.sign, '(Sign.)']);
    expect(cond(A1, w.g)).toBe(true);
    const f = allKeys('refused');
    go(toDesk(f), f, [WAY_TO.walk, '(Go up the stair.)']);
    expect(f.g.flags.a3_sash).toBe('refused');
    // bringing it down by the coupling; reading by each reader
    const c = allKeys('worn', { a3_bram_cut: true, a3_ally_saints: true, a3_ally_seventeen: true }, { skills: { mechanics: 60, science: 70 } });
    for (const [pick, flag, value] of [
      [['(Bring it down.)', '(Go along the trench'], 'a3_down_how', 'coupling'], [['(Turn the relay key', '(Read it yourself.)'], 'a3_reader', 'self'],
      [['(Turn the relay key', '(Call up the stair for Verity.)'], 'a3_reader', 'verity'], [['(Turn the relay key', '(Call up the stair for Assessor Seventeen.)'], 'a3_reader', 'seventeen'],
    ] as [string[], string, string][]) {
      const x = fork(c.g);
      go(toDesk(x), x, pick);
      expect(x.g.flags[flag], value).toBe(value);
      expect(x.g.flags.a3_end).toBe(flag === 'a3_down_how' ? 'unwritten' : 'opensky');
    }
  });

  it('"(No. Not that.)" at every way, and stepping back from the desk, change nothing at all', () => {
    for (const sash of ['worn', 'refused'] as const) {
      const a = allKeys(sash, { a3_bram_cut: true }, { skills: { mechanics: 60 } });
      const snap = () => JSON.stringify({ f: a.g.flags, q: a.g.world.quests, d: a.g.world.decisions, i: a.g.pc.inventory, k: a.g.world.knowledge });
      const r = toDesk(a);
      const before = snap();
      for (const w of ways(r)) {
        go(r, a, [WAY_TO[w], '(No. Not that.)']);
        expect(r.node, w).toBe('desk');
        expect(snap(), `${sash} ${w}`).toBe(before);
        expect(ways(r), `${sash} ${w}: still offered`).toContain(w);
      }
      go(r, a, ['(Step back from the desk. Ask it something first.)']);
      expect(r.node).toBe('hub');
      go(r, a, ['(Go to the desk.)', '(Step back from the desk, for now.)']);
      expect(r.ended).toBe(true);
      expect(snap()).toBe(before);
      go(toHub(a), a, ['(Step back from it, for now.)']);
      expect(snap()).toBe(before);
      expect(stage(a.g, 'q_a3_spire')).toBe('vault');
    }
  });

  it('nothing resolves unasked: days in the vault, or up on the close, settle nothing; doing nothing is answered and is nothing', () => {
    const a = allKeys('worn');
    go(toHub(a), a, ['And if I do nothing at all?']);
    expect(a.g.flags.a3_end).toBeUndefined();
    const strip = (f: Flags) => Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith('ev_armed_')));
    const before = strip(a.g.flags);
    for (let d = 0; d < 4; d++) { waitFor(a.g, a.q, 'md_vault', 7); waitFor(a.g, a.q, 'md_vault', 22); waitFor(a.g, a.q, 'md_spire', 12); }
    expect(strip(a.g.flags)).toEqual(before);
    expect(stage(a.g, 'q_a3_spire')).toBe('vault');
    expect(ways(toDesk(a))).toEqual(['sign', 'down', 'sell', 'read', 'amend']);
  });
});

// ---------------------------------------------------------------- no lockout from the save before the steps

describe('B6q: no lockout from "Before the steps"', () => {
  /** From a loaded "Before the steps" save: up the steps for real (the sash as asked), down the stair, to the desk. */
  function playDown(save: G, sash: 'worn' | 'refused', extra: string[] = []): { a: Game; desk: DialogueRunner } {
    const f = fork(save);
    eff(f.g, 'speech', 100);
    go(new DialogueRunner(DIALOGUES.d_a3_pnr, f.g, f.q), f, ['(Go up.)', '(Go up.)']);
    const r = go(new DialogueRunner(DIALOGUES.d_a3_steps, f.g, f.q), f, ['(Something is coming down the steps', ...extra, sash === 'worn' ? '(Take the sash.)' : '(Don\'t take it.)']);
    for (let i = 0; i < 12 && r.node !== 'st_end'; i++) {
      const o = r.view()!.options.find((x) => /^\(Go down|^\(Tamsin|^\(Ash|^\(Somebody|^\(Let Ash stand|^Nothing that counts|^Look at what|^Then hear what|^Ash\. Give me/.test(x.text) && !x.locked);
      if (!o) throw new Error(`stuck on the steps at ${r.node}: ${opts(r).join(' | ')}`);
      eff(f.g, 'speech', 100);
      r.choose(o.id);
      f.q.update();
    }
    expect(f.g.flags.a3_sash).toBe(sash);
    expect(cond(AT_VAULT, f.g)).toBe(true);
    f.events.length = 0;
    go(new DialogueRunner(DIALOGUES.d_ar_vault, f.g, f.q), f, ['(Go down.)']);
    const to = f.events.find((e) => e.name === 'goto')!.data as { location: string };
    f.g.locationId = to.location;
    expect(stage(f.g, 'q_a3_spire')).toBe('vault');
    return { a: f, desk: toDesk(f) };
  }
  /** Every way at the desk can be chosen from that copy, each from its own fork. */
  function chooseEach(g: G, want: string[]): void {
    for (const w of want) {
      const x = fork(g);
      const r = go(toDesk(x), x, [WAY_TO[w]]);
      const first = r.view()!.options.find((o) => o.text !== '(No. Not that.)')!;
      r.choose(first.id);
      x.q.update();
      expect(x.g.flags.a3_end, w).toBe(END_OF[w]);
      expect(stage(x.g, 'q_a3_spire'), w).toBe('ended');
    }
  }

  it('a thorough game reaches every way from the loaded save: worn, the chair, down, the sale, the reading and the amendment; refused, the walk, down and the reading', async () => {
    const p = close(ALL_KEYS[0], ALL_KEYS[1], ALL_KEYS[2]);
    go(new DialogueRunner(DIALOGUES.d_a3_pnr, p.g, p.q), p, ['(Go up.)', '(Go up.)']);
    const save = (await saveAndLoad(p.saved[0])).g;
    expect(save.flags.a3_pnr).toBeUndefined();
    const worn = playDown(save, 'worn');
    expect(ways(worn.desk)).toEqual(['sign', 'down', 'sell', 'read', 'amend']);
    chooseEach(worn.a.g, ['sign', 'down', 'sell', 'read', 'amend']);
    const refused = playDown(save, 'refused');
    expect(ways(refused.desk)).toEqual(['walk', 'down', 'read']);
    chooseEach(refused.a.g, ['walk', 'down', 'read']);
  });

  it('the hostile game reaches every way through its Act 3 alternates, from its own loaded save', async () => {
    const h = close('hostile', { tolls: 400, items: ['k_a3_transfer', 'k_a3_charge'] }, { ca_precedents: 2, a3_register_back: true, a3_concern_terms: 'accepted', a3_mast: 'raised', a3_mast_how: 'v', a3_mast_keeper: 'knock', ks_calla: 'free', a3_archive: 'open' });
    eff(h.g, 'science', 65);
    go(new DialogueRunner(DIALOGUES.d_a3_pnr, h.g, h.q), h, ['(Go up.)', '(Go up.)']);
    const hs = (await saveAndLoad(h.saved[0])).g;
    expect(cond(E_FILE, hs)).toBe(false);
    const worn = playDown(hs, 'worn', ['(Before anything else', 'I contest it.', '(Turn back to Three.)']);
    expect(worn.a.g.flags.a3_file).toBe('contested');
    expect(ways(worn.desk)).toEqual(['sign', 'down', 'sell', 'read', 'amend']);
    chooseEach(worn.a.g, ['sign', 'down', 'sell', 'read', 'amend']);
    const refused = playDown(hs, 'refused');
    expect(ways(refused.desk)).toEqual(['walk', 'down', 'read']);
    chooseEach(refused.a.g, ['walk', 'down', 'read']);
    // and with nothing gathered, the first way is still there, both forms
    const bare_ = close('hostile');
    go(new DialogueRunner(DIALOGUES.d_a3_pnr, bare_.g, bare_.q), bare_, ['(Go up.)', '(Go up.)']);
    const bs = (await saveAndLoad(bare_.saved[0])).g;
    expect(ways(playDown(bs, 'worn').desk)).toEqual(['sign']);
    expect(ways(playDown(bs, 'refused').desk)).toEqual(['walk']);
  });

  it('the Spire\'s quest declares its routes by the gates\' keys; the Plan needs none, so every build has a way through', () => {
    const routes = Object.fromEntries(QUESTS.q_a3_spire.routes!.map((r) => [r.id, r]));
    expect(Object.keys(routes)).toEqual(['plan', 'unwritten', 'concern', 'opensky', 'amendment']);
    expect(routes.plan.requires).toBeUndefined();
    for (const g of [allKeys('worn').g, vault('hostile').g, vault('choir').g, vault('guild', { items: ['k_a3_transfer'] }).g]) {
      expect(cond(routes.unwritten.requires, g)).toBe(cond(B_MEANS, g));
      expect(cond(routes.concern.requires, g)).toBe(cond({ all: [C_BUYER, { item: 'k_a3_transfer' }] }, g));
      expect(cond(routes.opensky.requires, g)).toBe(cond({ all: [D_VOICE, D_READER, D_PEOPLE, D_ARCHIVE] }, g));
      expect(cond(routes.amendment.requires, g)).toBe(cond({ all: [E_FILE, E_PREC, E_REG] }, g));
    }
  });
});

// ---------------------------------------------------------------- the save

describe('B6q: a save in the vault', () => {
  it('mid-conversation round-trips through the real codec: the topics spent stay spent, the desk the same; and a choice made survives it', async () => {
    const a = allKeys('worn');
    const r = go(toHub(a), a, ['Why now?', '(Go on.)', 'Reserve 9.', '(Go on.)', '(Go to the desk.)']);
    const deskBefore = opts(r);
    const l = await saveAndLoad(a.g);
    l.q.update();
    expect(stage(l.g, 'q_a3_spire')).toBe('vault');
    expect(l.g.flags.a3_vault_met).toBe(true);
    const lr = new DialogueRunner(DIALOGUES.d_a3_ledger, l.g, l.q);
    expect(lr.node).toBe('hub');
    expect(has_(lr, 'Why now?')).toBe(false);
    expect(has_(lr, 'Reserve 9.')).toBe(false);
    expect(has_(lr, 'What do you want from me?')).toBe(true);
    go(lr, l, ['(Go to the desk.)']);
    expect(opts(lr)).toEqual(deskBefore);
    go(lr, l, [WAY_TO.amend, '(Sit down, and wait for the register.)']);
    expect(l.g.flags.a3_end).toBe('amendment');
    const m = await saveAndLoad(l.g);
    m.q.update();
    expect(m.g.flags.a3_end).toBe('amendment');
    expect(stage(m.g, 'q_a3_spire')).toBe('ended');
    expect(m.g.world.decisions.some((d) => d.id === 'a3_end')).toBe(true);
    expect(new DialogueRunner(DIALOGUES.d_a3_ledger, m.g, m.q).node).toBe('v_after');
  });
});

// ---------------------------------------------------------------- the trees, the registry, the content

describe('B6q: the trees, the registry and the content', () => {
  it('every node has a line for coming back to it (U7), or only leaves; option ids are unique; all seven companions speak', () => {
    const speakers = new Set<string>();
    const trees = [...A3_VAULT_DIALOGUES, { id: 'd_ar_vault', nodes: VAULT_DOOR_NODES }];
    for (const d of trees) {
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
    // topics are spent (once), the desk and its ways are services (repeat)
    const hub = DIALOGUES.d_a3_ledger.nodes.hub.options;
    for (const o of hub) if (o.id && !['v.costs', 'v.desk', 'v.leave'].includes(o.id)) expect(o.once, o.id).toBe(true);
    for (const o of DIALOGUES.d_a3_ledger.nodes.desk.options) expect(o.repeat, o.id).toBe(true);
  });

  it('the flags are in the Act 3 registry, and every condition reads a real flag or Act 3\'s own', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6q (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_end', 'a3_down_how', 'a3_reader', 'a3_vault_met', 'a3_vault_seen', 'a3_vault_stair', 'a3_ledger_why', 'a3_ledger_reserve', 'a3_ledger_refused',
      'a3_ledger_unseen', 'a3_ledger_for', 'a3_ledger_want', 'a3_ledger_wait', 'a3_cost_', 'a3_vault_drop_seen', 'a3_vault_shaft', 'a3_vault_trunk_seen', 'vault.go.', 'v_after',
      'LEDGER_START', 'md_vault', 'from_vault', 'VAULT_DOOR_']) expect(block.includes(f), f).toBe(true);
    for (const v of ['plan', 'unwritten', 'concern', 'opensky', 'amendment', 'fire', 'charge', 'coupling', 'self', 'nine', 'verity', 'seventeen']) expect(block.includes(v), v).toBe(true);
    const SRC = Object.values(DIALOGUES).map((d) => JSON.stringify(d)).join('\n') + readFileSync('src/content/world/a3_conds.ts', 'utf8');
    for (const f of ['a3_letter_read', 'a3_steps_off', 'a3_file', 'a3_first_sign', 'a3_ilya_word', 'a3_wren_word', 'a3_nine_word', 'a3_terms_from', 'a3_terms_how', 'a3_mast_handle', 'a3_ready_choir', 'a3_buffer_how', 'a3_claim', 'a3_bram_cut']) {
      expect(SRC.includes(`"set":"${f}"`), f).toBe(true);
    }
    const ALL_SRC = Object.values(DIALOGUES).map((d) => JSON.stringify(d)).join('\n');
    for (const k of ['a3_ledger_granted', 'hc_scald_owned', 'a3_drop_heard', 'ar_drop_heard']) expect(ALL_SRC.includes(`"learn":"${k}"`), k).toBe(true);
  });
});
