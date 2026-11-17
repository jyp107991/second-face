import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_END_DIALOGUES, END_TREE } from '../src/content/dialogue/a3_ends';
import { SLIDES_OPEN } from '../src/content/dialogue/a3_epilogue_open';
import { SLIDES_PEOPLE } from '../src/content/dialogue/a3_epilogue_people';
import {
  CLAUSES, CRATES_BLADE, CRATES_FIGHTING, EP_SKY, M7_SKY, SKY_BURNING, SKY_FIGHTING, SKY_GUARDS, VAULT_FIGHTING, VAULT_WARDENS, modValue,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import type { SkillId } from '../src/engine/stats/rules';
import { skill } from '../src/engine/stats/sheet';
import { apply, test as cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, saveAndLoad, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';
import { open as openEp, play, turn } from './epilogue_fixture';
import { regenerate } from './map_gen';

/**
 * B6r — the five ends played out. From the desk's "(Go on.)" (B6q) to the epilogue (B6s–B6v): each end from the "Before the steps"
 * save, through the real codec, up the steps and down the stair for real, to its climax, the epilogue's first page and the credits;
 * every route through every climax (B's four ways out of the dark, C's four answers to the blade, D's three prices and their routes,
 * E's clause picker); every refusal ("(Not yet.)" and its kind change nothing, and the climax resumes where it stood); nothing
 * resolving unasked (days pass and nothing moves, nobody turns hostile undrawn on); the red lines firing only for the companions
 * present; a save in the middle of a fight, a reading and a register; the maps' mirrors; one face for A2's ending in the vault, the
 * climax and the slides. Played headless with the shared Act 3 fixture.
 */

type Flags = Record<string, string | boolean | number>;
interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[]; saved: G[] };
const AFTER_DOOR: Flags = { a3_at_knock: true, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_lowe: 'stood_down' };
const TAMSIN = 'npc_c9_03', WREN = 'npc_rd_03', KES = 'npc_hs_01', NINE = 'npc_md_nine', ILYA = 'npc_sh_17';

function recorder(): { host: LogicHost; events: Ev[]; saved: G[]; bind: (g: G) => void } {
  const events: Ev[] = [], saved: G[] = [];
  let ref: G | undefined;
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); if (name === 'save' && ref) saved.push(structuredClone(ref)); } };
  return { host, events, saved, bind: (g) => { ref = g; } };
}
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
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const kill = (g: G, id: string, map: string) => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const passives = (r: DialogueRunner) => r.view()!.passives.map((p) => `${p.label}: ${p.text}`);

/** A thorough game holding every way's keys (B6q's): the charge, the Concern's paper, the hill raised, the Unwritten turned. */
const ALL_KEYS: [Preset, Over, Flags] = ['prepared', { b4b: true, items: ['k_a3_transfer', 'k_a3_charge'] }, { a3_mast: 'raised', a3_mast_how: 'x', a3_mast_keeper: 'hollow', a3_concern_terms: 'accepted', a3_terms_how: 'taken', a3_terms_from: 'officer', a3_unwritten: 'with_you' }];
const allKeys = (sash: 'worn' | 'refused' = 'worn', flags: Flags = {}, over: Over = {}): Game => vault(ALL_KEYS[0], { ...ALL_KEYS[1], ...over }, { ...ALL_KEYS[2], ...flags }, sash);
/** At the end's climax: the choice made at the desk (as B6q leaves it), standing in the vault. */
const at = (end: string, more: Flags = {}, sash: 'worn' | 'refused' = 'worn', over: Over = {}): Game => allKeys(sash, { a3_end: end, ...more }, over);

/** E's clauses as the precinct's page labels them (B6t), upper-cased as a page's lines are. */
const CLAUSE_LABEL: Record<string, string> = {
  fines: 'A FORECAST IS NOT AN ACT', living: 'THE RECORD YIELDS TO THE LIVING', keeper: 'A UNIT MAY BE ITS OWN KEEPER', refuse: 'A SCHEDULED BENEFIT MAY BE REFUSED',
  reserve: 'A RESERVE IS KEPT BY ITS OWN CONSENT', passenger: 'A PERSON IS A PASSENGER, NEVER CARGO', speech: 'SPEECH IS NOT SEDITION',
};
const CLAUSE_LABELS = Object.values(CLAUSE_LABEL);

type Pick = string | RegExp;
const matches = (t: string, p: Pick) => (typeof p === 'string' ? t.startsWith(p) : p.test(t));
/** A conversation played the way the runtime plays it: picks by prefix (or pattern) from wherever it stands; an exit's goto moves
 * the player; an exit's dialogue event opens that tree next (the epilogue is left for the epilogue's own helpers). */
interface Sess { a: Game; tree: string; r: DialogueRunner; pick: (...picks: Pick[]) => Sess; readonly node: string | null; text: () => string }
function talk(a: Game, tree: string): Sess {
  const s: Sess = {
    a, tree, r: new DialogueRunner(DIALOGUES[tree], a.g, a.q),
    get node() { return s.r.node; },
    text: () => s.r.view()!.text,
    pick: (...picks: Pick[]) => {
      for (const p of picks) {
        if (s.r.ended) throw new Error(`${s.tree} ended before "${p}"`);
        const o = s.r.view()!.options.find((x) => matches(x.text, p) && !x.locked);
        if (!o) throw new Error(`no option "${p}" at ${s.tree}/${s.r.node} in [${opts(s.r).join(' | ')}]`);
        const before = a.events.length;
        s.r.choose(o.id);
        a.q.update();
        const evs = a.events.slice(before);
        for (const e of evs) if (e.name === 'goto') a.g.locationId = (e.data as { location: string }).location;
        const d = evs.filter((e) => e.name === 'dialogue').pop();
        if (s.r.ended && d && (d.data as { tree: string }).tree !== 'd_a3_epilogue') {
          s.tree = (d.data as { tree: string }).tree;
          s.r = new DialogueRunner(DIALOGUES[s.tree], a.g, a.q);
          a.q.update();
        }
      }
      return s;
    },
  };
  a.q.update();
  return s;
}
const run = (a: Game, tree: string, picks: Pick[] = []): Sess => talk(a, tree).pick(...picks);
const node = (a: Game, tree: string) => new DialogueRunner(DIALOGUES[tree], a.g, a.q).node;
const opened = (a: Game) => a.events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
/** Every map trigger whose condition holds now, applied as the runtime does when the player steps into it. */
function step(a: Game, map: string, id: string): void {
  const t = MAPS[map].triggers!.find((x) => x.id === id)!;
  expect(cond(t.if, a.g), `${map}/${id}`).toBe(true);
  apply(t.effects, a.g, a.q);
  a.q.update();
  const d = a.events.filter((e) => e.name === 'dialogue').pop()!;
  expect((d.data as { tree: string }).tree).toMatch(/^d_a3_end_/);
}
/** The epilogue as the climax leaves it: its first page, then every page to the closing one, whose option rolls the credits. */
function epilogue(g: G): { first: string; credits: Ev[] } {
  const pages = play(g);
  const last = pages[pages.length - 1];
  expect(last.node).toBe('end');
  const { r } = openEp(g);
  const credits = turn(r, '(The end.)');
  return { first: pages[0].node, credits };
}

// ---------------------------------------------------------------- from the save before the steps, each end to the credits

/** Plays a climax to its end the way a player who never stops to refuse would: the first option open at each beat, or the first of
 * `prefer` that is open; never a refusal and never a fight unless preferred. Stops when the conversation ends. */
const REFUSE = /^\((Not yet|Put the pen down|Stand still in the dark|Stand by the steel door|Stay down here|Stay inside|Step back from the desk|Draw|Fight|Strike it out|Open it again)/;
function finish(s: Sess, prefer: Pick[] = [], max = 40): Sess {
  for (let i = 0; i < max && !s.r.ended; i++) {
    const open_ = s.r.view()!.options.filter((o) => !o.locked);
    const o = prefer.map((p) => open_.find((x) => matches(x.text, p))).find(Boolean) ?? open_.find((x) => !REFUSE.test(x.text));
    if (!o) throw new Error(`nothing to choose at ${s.tree}/${s.r.node}: ${opts(s.r).join(' | ')}`);
    s.pick(o.text);
  }
  return s;
}

describe('B6r: each end from "Before the steps", through the codec, to its climax, the epilogue and the credits', () => {
  const WAY: Record<string, Pick[]> = {
    sign: ['(Sit down in the chair, and sign', '(Sign.)'], walk: ['(Leave the chair empty', '(Go up the stair.)'],
    down: ['(Bring it down.)', '(Set the charge among the racks.)'], sell: ['(Lay the Concern', '(Sign it.)'],
    read: ['(Turn the relay key', '(Hold the key out to Nine.)'], amend: ['(Sit down in the chair, and amend', '(Sit down, and wait for the register.)'],
  };
  /** From a loaded "Before the steps" save: up the steps for real (the sash as asked), down the stair, to the desk (B6q's helper). */
  function playDown(save: G, sash: 'worn' | 'refused'): Game {
    const f = fork(save);
    eff(f.g, 'speech', 100);
    const s = run(f, 'd_a3_pnr', ['(Go up.)', '(Go up.)']);
    expect(s.tree).toBe('d_a3_steps'); // B6m's "(Go up.)" opens the steps
    s.pick('(Something is coming down the steps', sash === 'worn' ? '(Take the sash.)' : '(Don\'t take it.)');
    for (let i = 0; i < 12 && s.node !== 'st_end'; i++) {
      eff(f.g, 'speech', 100);
      s.pick(/^\(Go down|^\(Tamsin|^\(Ash|^\(Somebody|^\(Let Ash stand|^Nothing that counts|^Look at what|^Then hear what|^Ash\. Give me/);
    }
    expect(f.g.flags.a3_sash).toBe(sash);
    f.events.length = 0;
    run(f, 'd_ar_vault', ['(Go down.)']);
    expect(f.g.locationId).toBe('md_vault');
    return f;
  }
  /** At the desk: the way chosen and confirmed, then its "(Go on.)" opens the climax (B6q's threshold, B6r's hook). */
  function choose(f: Game, way: string): Sess {
    const s = run(f, 'd_a3_ledger', ['(Walk down the aisle', '(Listen.)', '(Go to the desk.)', ...WAY[way], '(Go on.)']);
    expect(f.events.filter((e) => e.name === 'dialogue').pop()!.data).toEqual(END_TREE[way]);
    expect(s.tree).toBe(END_TREE[way].tree);
    return s;
  }

  it('every way at the desk opens its own climax, and the vault\'s racks reopen it from wherever it was left', () => {
    for (const [way, end] of [['sign', 'plan'], ['walk', 'plan'], ['down', 'unwritten'], ['sell', 'concern'], ['read', 'opensky'], ['amend', 'amendment']] as const) {
      const o = DIALOGUES.d_a3_ledger.nodes[`done_${way}`].options[0];
      expect(o.id).toBe(`vault.go.${way}`);
      expect(o.effects).toEqual([{ event: 'dialogue', data: END_TREE[way] }]);
      expect(END_TREE[way].tree).toBe(`d_a3_end_${end}`);
      const a = at(end, {}, way === 'walk' ? 'refused' : 'worn');
      const r = new DialogueRunner(DIALOGUES.d_a3_ledger, a.g, a.q);
      expect(r.node).toBe('v_after');
      expect(r.view()!.options.map((x) => x.id)).toEqual([`vault.after.${way}`]);
      r.choose(`vault.after.${way}`);
      expect(a.events.pop()!.data).toEqual(END_TREE[way]);
    }
  });

  it('the thorough game: the chair (A1), the walk (A2), down (B), the sale (C), the reading (D) and the amendment (E), each from its own loaded save', async () => {
    const p = close(ALL_KEYS[0], ALL_KEYS[1], ALL_KEYS[2]);
    run(p, 'd_a3_pnr', ['(Go up.)', '(Go up.)']);
    expect(p.saved).toHaveLength(1);
    const save = (await saveAndLoad(p.saved[0])).g;
    expect(save.flags.a3_pnr).toBeUndefined();

    const CLIMAX: Record<string, { sash: 'worn' | 'refused'; prefer: Pick[]; first: string; check: (g: G) => void }> = {
      sign: {
        sash: 'worn', first: 'steps_worn', prefer: [],
        check: (g) => { expect(g.flags.a3_signed).toBe(true); expect(g.flags.a3_saluted).toBe(true); expect(g.world.decisions.some((d) => d.id === 'a3_first_paper')).toBe(true); },
      },
      walk: {
        sash: 'refused', first: 'steps_refused', prefer: ['(Go down through the crowd', 'There isn\'t.'],
        check: (g) => { expect(g.flags.a3_child).toBe('met'); expect(g.world.knowledge.a3_child_told).toBe(true); },
      },
      down: {
        sash: 'worn', first: 'steps_unwritten', prefer: ['(Walk to the foot of the stair'],
        check: (g) => { expect(g.flags.a3_down).toBe(true); expect(g.flags.a3_vault_out).toBe('lowe'); expect(g.flags.a3_dark).toBe(true); },
      },
      sell: {
        sash: 'worn', first: 'steps_concern', prefer: ['(Get between them'],
        check: (g) => { expect(g.flags.a3_sold).toBe(true); expect(g.flags.a3_sold_up).toBe(true); expect(['talked', 'none']).toContain(g.flags.a3_crates); },
      },
      read: {
        sash: 'worn', first: 'steps_opensky', prefer: ['(Draw.)', '(Fight.)'],
        check: (g) => { expect(g.flags.a3_read).toBe(true); expect(g.flags.ep_sky).toBe('burning'); },
      },
      amend: {
        sash: 'worn', first: 'steps_amended', prefer: ['(Write: A forecast is not an act.)', '(Write: The record yields to the living.)', '(Close the register.)', '(Close it.)'],
        check: (g) => { expect(g.flags.a3_amend_fines).toBe(true); expect(g.flags.a3_amend_living).toBe(true); expect(g.flags.a3_amends).toBe(2); expect(g.flags.a3_amended).toBe(true); },
      },
    };
    for (const [way, c] of Object.entries(CLIMAX)) {
      const f = playDown(save, c.sash);
      eff(f.g, 'speech', 100);
      const s = finish(choose(f, way), c.prefer);
      if (way === 'read') {
        // the night's price (nothing made ready in this run: burning), fought: the house's men down on the close, the morning goes on
        expect(f.g.locationId).toBe('md_spire');
        expect(f.g.flags.a3_sky_fight).toBe(true);
        for (const id of SKY_GUARDS) kill(f.g, id, 'md_spire');
        step(f, 'md_spire', 'a3_sky_after');
        finish(talk(f, s.tree));
      }
      c.check(f.g);
      expect(f.g.flags.a3_climax_done, way).toBe(true);
      expect(opened(f).pop(), way).toBe('d_a3_epilogue');
      const ep = epilogue(f.g);
      expect(ep.first, way).toBe(c.first);
      expect(ep.credits, way).toEqual([{ name: 'credits', data: undefined }]);
    }
  });

  it('the hostile game\'s first way, worn and refused, from its own loaded save, to the credits', async () => {
    const h = close('hostile');
    run(h, 'd_a3_pnr', ['(Go up.)', '(Go up.)']);
    const save = (await saveAndLoad(h.saved[0])).g;
    const w = playDown(save, 'worn');
    finish(choose(w, 'sign'));
    expect(w.g.flags.a3_signed).toBe(true);
    expect(epilogue(w.g).first).toBe('steps_worn');
    const r = playDown(save, 'refused');
    finish(choose(r, 'walk'), ['(Go down the far side']);
    expect(r.g.flags.a3_child).toBe('passed');
    expect(epilogue(r.g).first).toBe('steps_refused');
  });
});

// ---------------------------------------------------------------- A: the chair, and the chair left empty

describe('B6r: the Plan', () => {
  it('A1: the first sheet is the reserve while it is under the pen; Tamsin walks only then, and only if she is there; Ilya walks; the stack signs every open line', () => {
    const a = at('plan', {}, 'worn', { companions: { tamsin: 'party', ilya: 'party', nine: 'waiting' } });
    const s = run(a, 'd_a3_end_plan');
    expect(s.node).toBe('p_first');
    expect(s.text()).toContain('RESERVE 9 (THE MOUTH)');
    expect(opts(s.r)).toEqual(['(Pick up the pen.)', '(Put the pen down. Not tonight.)']);
    s.pick('(Pick up the pen.)');
    expect(a.g.world.party).not.toContain(TAMSIN);
    expect(a.g.flags.tam_left).toBeUndefined(); // her slide reads the chair (B6v's `chair`), not a leaving of her own
    expect(a.g.flags.a3_tam_walked).toBe(true);
    s.pick('(Say her name.)', '(Sign it.)', '(Turn it over', '(Go on.)');
    expect(s.node).toBe('p_ilya');
    expect(s.text()).toContain('"Right,"');
    expect(a.g.world.party).not.toContain(ILYA);
    s.pick('(Go on.)');
    expect(s.node).toBe('p_stack');
    expect(passives(s.r)).toEqual(['SIGNED: "VEY, ADA — RESIGNS; SHALE CONTRACTED." Your name under it.', 'SIGNED: "SARR, IMELDA — TREASURER." Your name under it.']);
    // a reserve stayed on consent: water first, and Tamsin stays at the desk
    const b = at('plan', { ca_reserve: 'stayed' }, 'worn', { companions: { tamsin: 'party' } });
    const sb = run(b, 'd_a3_end_plan');
    expect(sb.text()).toContain('The first sheet is water.');
    finish(sb);
    expect(b.g.world.party).toContain(TAMSIN);
    expect(b.g.flags.a3_tam_walked).toBeUndefined();
    // Tamsin waiting on the close (not at the desk): no scene for her in the vault
    const c = at('plan', {}, 'worn', { companions: { tamsin: 'waiting' } });
    expect(opts(run(c, 'd_a3_end_plan').r)).toContain('(Sign it.)');
  });

  it('A1: the column\'s lead salutes for the first time (Lowe, else Reyes, else a warden); the morning\'s schedules come down at six', () => {
    const cases: [(g: G) => void, string][] = [
      [() => undefined, 'Captain Idris Lowe comes down'],
      [(g) => kill(g, 'npc_md_01', 'knock'), 'Sergeant Paloma Reyes comes down'],
      [(g) => { kill(g, 'npc_md_01', 'knock'); kill(g, 'npc_md_12', 'knock'); }, 'a warden comes down the stair'],
    ];
    for (const [k, line] of cases) {
      const a = at('plan', { ca_reserve: 'stayed' });
      k(a.g);
      const s = run(a, 'd_a3_end_plan', ['(Sign it.)', '(Turn it over', '(Go on.)', '(Go on.)']);
      expect(s.node).toBe('p_lowe');
      expect(s.text()).toContain(line);
      s.pick('(Nod, and go on signing.)');
      expect(s.node).toBe('p_end');
      expect(a.g.minutes % 1440).toBe(6 * 60);
    }
  });

  it('A2: up the stair, the lens turns over the close and stops on a docker\'s girl of six; nothing harms her; home', () => {
    const a = at('plan', {}, 'refused');
    const s = run(a, 'd_a3_end_plan', ['(Step out onto the close.)']);
    expect(a.g.locationId).toBe('md_spire');
    expect(s.node).toBe('w_close');
    expect(s.text()).toContain('A young docker from Carrick, about your age');
    expect(s.text()).toContain('a girl of six');
    s.pick('(Go down through the crowd', '(Say nothing. Wave back');
    expect(s.text()).toContain('takes her home down the lane to Carrick');
    const before = JSON.stringify({ npcs: a.g.npcs, party: a.g.world.party });
    s.pick('(Go on.)', '(Afterwards.)');
    expect(JSON.stringify({ npcs: a.g.npcs, party: a.g.world.party })).toBe(before);
    expect(a.g.flags.a3_climax_done).toBe(true);
  });
});

// ---------------------------------------------------------------- B: the core brought down

describe('B6r: the core brought down', () => {
  const down = (how: string, more: Flags = {}, over: Over = {}) => at('unwritten', { a3_down_how: how, ...more }, 'worn', over);
  const toWardens = (a: Game): Sess => {
    const s = run(a, 'd_a3_end_unwritten');
    if (s.node === 'b_nine') s.pick('(Let it go.)');
    s.pick(/^\((Wait for ten|Light the fuse|Put your weight|Strike the match)/, '(Go on.)', '(Go on.)');
    expect(s.node).toBe('b_wardens');
    return s;
  };

  it('Nine\'s one plea at the core\'s door, and it withdraws (only if it is there); a Nine waiting on the steps says it on the close', () => {
    const a = down('charge');
    const s = run(a, 'd_a3_end_unwritten');
    expect(s.node).toBe('b_nine');
    expect(s.text()).toContain('A city is a thing that decides where its water goes');
    expect(a.g.flags.nine_left).toBe('core');
    expect(a.g.world.party).not.toContain(NINE);
    // Nine never met: no plea, no leaving written
    const n = down('charge', {}, { companions: { nine: 'never' } });
    expect(run(n, 'd_a3_end_unwritten').node).toBe('b_act');
    expect(n.g.flags.nine_left).toBeUndefined();
    // Nine waiting on the steps: on the close, after the dark
    const w = down('charge', {}, { companions: { nine: 'waiting' } });
    const sw = run(w, 'd_a3_end_unwritten');
    expect(sw.node).toBe('b_act');
    sw.pick(/^\(Wait for ten/, '(Go on.)', '(Go on.)', '(Put your hands', '(Up, with them.)', '(Take off the sash.');
    expect(w.g.flags.nine_left).toBeUndefined();
    sw.pick('(Go on.)');
    expect(sw.node).toBe('b_nine_close');
    expect(w.g.flags.nine_left).toBe('core');
    sw.pick('(Let it go.)');
    expect(sw.node).toBe('b_end');
  });

  it('the act by its means, at ten when the tower is empty; the Ledger\'s last words are a clause; the city goes dark', () => {
    for (const [how, more, over, line] of [
      ['charge', {}, {}, 'Then the charge goes.'], ['coupling', { a3_bram_cut: true }, { skills: { mechanics: 60 } }, 'the first coupling opens under load'],
      ['fire', {}, {}, 'Then the match.'],
    ] as [string, Flags, Over, string][]) {
      const a = down(how, more, { companions: { nine: 'never' }, ...over });
      const s = run(a, 'd_a3_end_unwritten');
      expect(s.node).toBe('b_act');
      const acts = opts(s.r).filter((t) => t !== '(Not yet.)');
      expect(acts.length, how).toBeGreaterThan(0);
      expect(acts.every((t) => t.startsWith('(Wait for ten')), how).toBe(true); // the morning: the tower is full
      s.pick(acts[0]);
      expect(a.g.minutes % 1440).toBe(22 * 60);
      expect(a.g.flags.a3_down).toBe(true);
      expect(a.g.world.decisions.some((d) => d.id === 'a3_down')).toBe(true);
      expect(a.g.pc.inventory.items.some((i) => i.def === 'k_a3_charge')).toBe(how !== 'charge');
      s.pick('(Go on.)', '(Go on.)');
      expect(s.node).toBe('b_wardens');
      const b = down(how, more, { companions: { nine: 'never' }, ...over });
      b.g.minutes = Math.floor(b.g.minutes / 1440) * 1440 + 22 * 60;
      const sb = run(b, 'd_a3_end_unwritten', [/^\((Light the fuse|Put your weight|Strike the match)/]);
      expect(sb.node).toBe('b_last');
      expect(sb.text()).toContain('Clause two hundred and twelve');
      expect(sb.text()).toContain('It is ten o\'clock.');
      expect(sb.text()).toContain(line);
    }
    // the fire's carrier: Ash with his orders burned holds the matches out, and will not strike first
    const ash = down('fire', { a3_unwritten: 'gone', ash_orders: 'refused' }, { companions: { ash: 'party', nine: 'never' } });
    const sa = run(ash, 'd_a3_end_unwritten');
    expect(sa.text()).toContain('"Never first.');
    expect(opts(sa.r).some((t) => t.includes('Give the matches back'))).toBe(false);
  });

  it('the stair wardens come down: Lowe lets the party by only if he stood his column down and trusts the player', () => {
    const ok = down('charge', {}, { companions: { nine: 'never' } });
    expect(opts(toWardens(ok).r)[0]).toMatch(/^\(Walk to the foot of the stair/);
    for (const [why, flags, trust] of [['withdrew', { a3_lowe: 'withdrawn' }, 30], ['little trust', {}, 10]] as [string, Flags, number][]) {
      const a = down('charge', flags, { companions: { nine: 'never' }, trust: { npc_md_01: trust } });
      expect(opts(toWardens(a).r).some((t) => t.startsWith('(Walk to the foot')), why).toBe(false);
    }
    const dead = down('charge', {}, { companions: { nine: 'never' } });
    kill(dead.g, 'npc_md_01', 'knock');
    expect(opts(toWardens(dead).r).some((t) => t.startsWith('(Walk to the foot'))).toBe(false);
  });

  it('every way out: Lowe, the drop (and its failure), hands up (nothing in the clause about you), the fight (and losing it); each ends on the dark close', () => {
    const routes: [string, Pick[], (a: Game) => void, string][] = [
      ['lowe', ['(Walk to the foot of the stair', '(Go up past them.)'], () => undefined, 'sits down on the bottom step'],
      ['drop', ['(Back into the drop room', '(Out onto the close.)'], (a) => eff(a.g, 'stealth', 80), 'On the close it is darker'],
      ['taken', ['(Back into the drop room', '(Come down, hands', '(Up, with them.)'], (a) => eff(a.g, 'stealth', 10), 'nothing on here about you'],
      ['taken', ['(Put your hands', '(Up, with them.)'], () => undefined, 'nothing on here about you'],
    ];
    for (const [out, picks, prep, line] of routes) {
      const a = down('charge', {}, { companions: { nine: 'never' } });
      prep(a);
      const s = toWardens(a).pick(...picks);
      expect(a.g.flags.a3_vault_out, out).toBe(out);
      expect(a.g.locationId).toBe('md_spire');
      expect(s.node).toBe('b_close');
      expect(s.text()).toContain(line);
      expect(s.text()).toContain('there are stars over the close');
      expect(opts(s.r)).toEqual(['(Take off the sash. Fold it. Leave it on the top step.)']);
      s.pick('(Take off the sash.', '(Go on.)', '(Afterwards.)');
      expect(a.g.world.decisions.some((d) => d.id === 'a3_sash_left')).toBe(true);
      expect(a.g.flags.a3_climax_done).toBe(true);
    }
    // the fight: hostile only once drawn on; the after-trigger once all four are down; the climax goes on
    const f = down('charge', {}, { companions: { nine: 'never' } });
    const sf = toWardens(f);
    for (const id of VAULT_WARDENS) { expect(cond(NPCS[id].hostileIf, f.g)).toBe(false); expect(cond(MAPS.md_vault.npcs!.find((n) => n.def === id)!.if, f.g)).toBe(false); }
    sf.pick('(Draw.)', '(Fight.)');
    expect(f.events.some((e) => e.name === 'combat')).toBe(true);
    for (const id of VAULT_WARDENS) { expect(cond(NPCS[id].hostileIf, f.g)).toBe(true); expect(cond(MAPS.md_vault.npcs!.find((n) => n.def === id)!.if, f.g)).toBe(true); }
    expect(node(f, 'd_a3_end_unwritten')).toBe('b_fighting');
    expect(cond(MAPS.md_vault.triggers!.find((t) => t.id === 'a3_vault_after')!.if, f.g)).toBe(false);
    for (const id of VAULT_WARDENS) kill(f.g, id, 'md_vault');
    step(f, 'md_vault', 'a3_vault_after');
    run(f, 'd_a3_end_unwritten', ['(Up the stair.)']);
    expect(f.g.flags.a3_vault_out).toBe('fought');
    for (const id of VAULT_WARDENS) expect(cond(NPCS[id].hostileIf, f.g)).toBe(false);
    // losing it: beaten, the wardens take the player up, and the clause has nothing in it about them
    const l = down('charge', {}, { companions: { nine: 'never' } });
    toWardens(l).pick('(Draw.)', '(Fight.)');
    apply(NPCS.npc_a3_g19.beaten, l.g);
    step(l, 'md_vault', 'a3_vault_after');
    const sl = run(l, 'd_a3_end_unwritten');
    expect(sl.node).toBe('b_beaten');
    sl.pick('(Up, with them.)');
    expect(l.g.flags.a3_vault_out).toBe('taken');
    expect(sl.text()).toContain('nothing on here about you');
  });

  it('the sash refused: nothing to take off on the close; the blade who sat to watch walks into the dark', () => {
    const a = at('unwritten', { a3_down_how: 'charge', a3_blade: 'talked' }, 'refused', { companions: { nine: 'never' } });
    const s = toWardens(a).pick('(Put your hands', '(Up, with them.)');
    expect(opts(s.r)).toEqual(['(Go on.)']);
    expect(passives(s.r).some((p) => p.includes('Thaddeus'))).toBe(true);
  });
});

// ---------------------------------------------------------------- C: the core signed over

describe('B6r: the core signed over', () => {
  const sold = (more: Flags = {}, over: Over = {}) => at('concern', more, 'worn', over);

  it('signed slowly and read back; Wren and Kes walk out of the vault only if they are there, Tamsin only if the reserve goes with it', () => {
    const a = sold({}, { companions: { tamsin: 'party', wren: 'party', kes: 'party', nine: 'never' } });
    a.g.world.party = [TAMSIN, WREN, KES];
    const s = run(a, 'd_a3_end_concern', ['(Sign it, slowly.)']);
    expect(s.text()).toContain('TRANSFERRED, AS SCHEDULED BY OTHERS.');
    expect(a.g.pc.inventory.items.some((i) => i.def === 'k_a3_transfer')).toBe(false);
    s.pick('(Go on.)');
    expect(s.node).toBe('c_tamsin');
    expect(a.g.flags.a3_tam_walked).toBe(true);
    s.pick('(Go on.)');
    expect(s.node).toBe('c_wren');
    expect(a.g.flags.wren_left).toBe('concern');
    s.pick('(Wren—)', '(Go on.)');
    expect(s.node).toBe('c_kes');
    expect(s.text()).toContain('"You handed them the eyes," she says. "They already had the leash."');
    expect(a.g.flags.kes_left).toBe('concern');
    expect(a.g.world.party).toEqual([]);
    // never met, or already gone their own way: nothing written for them
    const b = sold({ wren_left: 'floor' }, { companions: { tamsin: 'never', wren: 'met', kes: 'never', nine: 'never' } });
    expect(run(b, 'd_a3_end_concern', ['(Sign it, slowly.)', '(Go on.)']).node).toBe('c_shaft');
    expect(b.g.flags.kes_left).toBeUndefined();
    expect(b.g.flags.wren_left).toBe('floor');
    // waiting on the steps: their places are empty when the player comes up, and the leaving is written there
    const w = sold({}, { companions: { wren: 'waiting', kes: 'waiting', tamsin: 'never', nine: 'never' } });
    const sw = run(w, 'd_a3_end_concern', ['(Sign it, slowly.)', '(Go on.)']);
    expect(sw.node).toBe('c_shaft');
    expect(w.g.flags.wren_left).toBeUndefined();
    sw.pick('(Go up to the close.)');
    expect(sw.node).toBe('c_wren_gone');
    expect(w.g.flags.wren_left).toBe('concern');
    sw.pick('(Go on.)');
    expect(sw.node).toBe('c_kes_gone');
    expect(w.g.flags.kes_left).toBe('concern');
  });

  it('the blade for the courier: talked down, shot by the Concern\'s men (or past a failed word), fought, or let burn a courtesy copy; nobody if the blade is spent', () => {
    const toBlade = (more: Flags = {}, speech = 100): Sess => {
      const a = sold(more, { companions: { tamsin: 'never', wren: 'never', kes: 'never', nine: 'never' } });
      eff(a.g, 'speech', speech);
      const s = run(a, 'd_a3_end_concern', ['(Sign it, slowly.)', '(Go on.)', '(Go up to the close.)']);
      expect(a.g.locationId).toBe('md_spire');
      return s;
    };
    const crates = MAPS.md_spire.npcs!.find((n) => n.id === 'npc_a3_u2_crates')!;
    for (const [pick, value, speech] of [['(Get between them', 'talked', 100], ['(Get between them', 'guards', 0], ['(Shout for', 'guards', 100], ['(Stand back', 'let', 100]] as [string, string, number][]) {
      const s = toBlade({}, speech);
      expect(s.node).toBe('c_blade');
      expect(cond(crates.if, s.a.g)).toBe(true);
      s.pick(pick);
      expect(s.a.g.flags.a3_crates, `${pick} ${speech}`).toBe(value);
      if (value === 'guards' && speech === 0) expect(s.text()).toContain('He goes past you as if you were a lamp post.');
      s.pick('(Go on.)', '(Afterwards.)');
      expect(cond(crates.if, s.a.g)).toBe(false);
    }
    // the fight
    const f = toBlade();
    expect(cond(NPCS.npc_a3_u2.hostileIf, f.a.g)).toBe(false);
    f.pick('(Draw on him.)', '(Fight.)');
    expect(cond(NPCS.npc_a3_u2.hostileIf, f.a.g)).toBe(true);
    expect(cond(CRATES_FIGHTING, f.a.g)).toBe(true);
    kill(f.a.g, 'npc_a3_u2_crates', 'md_spire');
    step(f.a, 'md_spire', 'a3_crates_after');
    run(f.a, 'd_a3_end_concern', ['(Go on.)']);
    expect(f.a.g.flags.a3_crates).toBe('fought');
    expect(cond(NPCS.npc_a3_u2.hostileIf, f.a.g)).toBe(false);
    // the blade spent: given to the wardens on the steps, or dead at Knock
    for (const more of [{ a3_blade: 'wardens' }, { a3_uw_how: 'fought' }] as Flags[]) {
      const q = toBlade(more);
      expect(cond(CRATES_BLADE, q.a.g)).toBe(false);
      expect(q.node).toBe('c_quiet');
      expect(q.a.g.flags.a3_crates).toBe('none');
      expect(q.text()).toContain('"Signed for," she says as she passes you. "Carried."');
    }
  });
});

// ---------------------------------------------------------------- D: every forecast read out

describe('B6r: every forecast read out', () => {
  const reading = (ready: number, more: Flags = {}, over: Over = {}) => at('opensky', { a3_reader: 'nine', a3_ready: ready, ...more }, 'worn', over);
  const up = (a: Game): Sess => run(a, 'd_a3_end_opensky', ['(Go on.)', '(Go on.)', '(Go on.)', '(Go up.)']);

  it('the reading: MOTHER\'s replies first, then the twelve, then everyone\'s and the player\'s own line, through the night; the Ledger\'s one line', () => {
    const a = reading(6);
    const s = run(a, 'd_a3_end_opensky');
    expect(s.node).toBe('d_first');
    expect(s.text()).toContain('POPULATION VARIANCE UNCHANGED. THANK YOU FOR YOUR CONTINUITY.');
    expect(s.text().indexOf('MOTHER')).toBeLessThan(s.text().indexOf('what a reserve was for'));
    expect(passives(s.r)).toEqual(['SIGNAL HILL: Thanh throws the knife switch at the mast\'s foot when the first word comes up the wire, and the hill speaks wide.']);
    expect(a.g.minutes % 1440).toBe(20 * 60);
    s.pick('(Go on.)');
    expect(s.text()).toContain('And the twelfth line, which is the designate\'s');
    s.pick('(Go on.)');
    expect(s.text()).toContain('the line after that, which is the last one, and has a date in it');
    expect(a.g.minutes % 1440).toBe(5 * 60);
    s.pick('(Go on.)');
    expect(s.text()).toContain('"Then everyone will have to plan."');
    // each reader reads in their own way
    for (const [reader, words] of [['self', 'you read it into the key'], ['verity', 'Verity puts her receiver down'], ['seventeen', 'Assessor Seventeen enters']] as const) {
      expect(run(reading(6, { a3_reader: reader }), 'd_a3_end_opensky').text(), reader).toContain(words);
    }
  });

  it('Knock keeps the hill with nobody on it: the handle goes west first (a duration, never a deadline); with Amos up the hill, it does not', () => {
    const a = reading(6, { a3_mast_keeper: 'knock' });
    const s = run(a, 'd_a3_end_opensky');
    expect(s.node).toBe('d_handle');
    expect(opts(s.r)).toEqual(['(Send it west by the courier, by hand, with the hour written down.)', '(Not yet.)']);
    const day = Math.floor(a.g.minutes / 1440);
    s.pick('(Send it west', '(Go on.)');
    expect(s.node).toBe('d_first');
    expect(Math.floor(a.g.minutes / 1440)).toBeGreaterThanOrEqual(day + 4);
    expect(passives(s.r).some((p) => p.includes('Selma Ruud'))).toBe(true);
    const w = reading(6, { a3_mast_keeper: 'knock', a3_ally_wheel: true });
    expect(opts(run(w, 'd_a3_end_opensky').r)).toContain('(Give it to the Wheel\'s rider on the close, with the hour written down.)');
    const amos = reading(6, { a3_mast_keeper: 'knock', a3_mast_handle: 'amos' });
    const sa = run(amos, 'd_a3_end_opensky');
    expect(sa.node).toBe('d_first');
    expect(passives(sa.r)[0]).toContain('Amos Crofts');
  });

  it('the three prices, each reachable, each by the readiness count; the night\'s price is what the epilogue reads (ep_sky)', () => {
    const PRICES: [number, string, Pick[], Flags][] = [
      [6, 'held', ['(Sit down on the fourth step.)'], {}],
      [3, 'hard', ['Read it to me.'], { a3_sky_walk: 'read' }],
      [3, 'hard', ['(Nod to the wardens'], { a3_sky_walk: 'wardens' }],
      [3, 'hard', ['(Stand still'], { a3_sky_walk: 'still' }],
      [0, 'burning', ['(Call the wardens'], {}],
      [0, 'burning', ['Your house\'s line is read.'], {}],
    ];
    for (const [ready, price, picks, more] of PRICES) {
      const a = reading(ready);
      eff(a.g, 'speech', 100);
      const s = up(a);
      expect(a.g.locationId).toBe('md_spire');
      expect(s.node).toBe('d_close');
      expect(modValue(a.g, M7_SKY)).toBe(price);
      s.pick(...picks, '(Go on.)', '(Afterwards.)');
      expect(a.g.flags.ep_sky, `${price} ${picks[0]}`).toBe(price);
      for (const [k, v] of Object.entries(more)) expect(a.g.flags[k]).toBe(v);
      expect(modValue(a.g, EP_SKY)).toBe(price);
      expect(epilogue(a.g).first).toBe('steps_opensky');
    }
    // the failed words: Speech 45 at the knife becomes standing still; Speech 55 at the house's men leaves the fight or the wardens
    const h = reading(3);
    eff(h.g, 'speech', 10);
    up(h).pick('Read it to me.');
    expect(h.g.flags.a3_sky_walk).toBe('still');
    const b = reading(0);
    eff(b.g, 'speech', 10);
    expect(opts(up(b).pick('Your house\'s line is read.').r)).toEqual(['(Draw.)', '(Call the wardens at the foot of the steps.)']);
    // the house's men: on the close only at the worst price, only before it is settled, hostile only once drawn on
    const g0 = reading(0);
    const s0 = up(g0);
    for (const id of SKY_GUARDS) {
      expect(cond(MAPS.md_spire.npcs!.find((n) => n.def === id)!.if, g0.g)).toBe(true);
      expect(cond(NPCS[id].hostileIf, g0.g)).toBe(false);
    }
    const g3 = reading(3);
    up(g3);
    for (const id of SKY_GUARDS) expect(cond(MAPS.md_spire.npcs!.find((n) => n.def === id)!.if, g3.g)).toBe(false);
    s0.pick('(Draw.)', '(Fight.)');
    expect(cond(SKY_FIGHTING, g0.g)).toBe(true);
    for (const id of SKY_GUARDS) expect(cond(NPCS[id].hostileIf, g0.g)).toBe(true);
    apply(NPCS.npc_a3_g23.beaten, g0.g);
    step(g0, 'md_spire', 'a3_sky_after');
    const sf = run(g0, 'd_a3_end_opensky');
    expect(sf.node).toBe('d_fought');
    expect(sf.text()).toContain('You come to on the steps');
    sf.pick('(Go on.)');
    expect(g0.g.flags.ep_sky).toBe('burning');
  });
});

// ---------------------------------------------------------------- E: the Magistrate's Amendment

describe('B6r: the Magistrate\'s Amendment', () => {
  const amend = (more: Flags = {}, over: Over = {}) => at('amendment', more, 'worn', over);
  const toPage = (a: Game): Sess => run(a, 'd_a3_end_amendment', ['(Carry it up to the steps']);

  it('Three brings the register down; it is written on the steps at nine, in the open', () => {
    const a = amend();
    const s = run(a, 'd_a3_end_amendment');
    expect(s.node).toBe('e_three');
    expect(s.r.view()!.speaker).toBe('npc_ar_01');
    s.pick('(Carry it up to the steps');
    expect(a.g.locationId).toBe('md_spire');
    expect(a.events.find((e) => e.name === 'goto')!.data).toEqual({ location: 'md_spire', spawn: 'steps' });
    expect(a.g.minutes % 1440).toBe(9 * 60);
    expect(s.node).toBe('e_write');
    expect(s.text()).toContain('AMENDMENTS — FIRST SEASON');
  });

  it('the picker offers exactly the clauses whose rulings are held, at most three, struck out and rewritten freely until closed; the precinct\'s page reads them', () => {
    const a = amend();
    const s = toPage(a);
    const held = CLAUSES.filter((c) => cond(c.needs, a.g)).map((c) => c.id);
    expect(held.length).toBeGreaterThanOrEqual(4);
    const writes = () => opts(s.r).filter((t) => t.startsWith('(Write:'));
    expect(writes()).toHaveLength(held.length);
    expect(opts(s.r)).not.toContain('(Close the register.)');
    for (let i = 0; i < 3; i++) s.pick(writes()[0]);
    expect(s.text()).toContain('The register will take no more this season.');
    expect(writes()).toEqual([]);
    expect(a.g.flags.a3_amends).toBe(3);
    s.pick(opts(s.r).find((t) => t.startsWith('(Strike it out:'))!);
    expect(a.g.flags.a3_amends).toBe(2);
    expect(writes()).toHaveLength(held.length - 2);
    s.pick('(Close the register.)', '(Open it again.)', '(Close the register.)', '(Close it.)');
    const chosen = CLAUSES.filter((c) => a.g.flags[`a3_amend_${c.id}`] === true).map((c) => c.id);
    expect(chosen).toHaveLength(2);
    expect(chosen.every((c) => held.includes(c))).toBe(true);
    expect(a.g.flags.a3_amended).toBe(true);
    finish(s);
    const precinct = play(a.g).find((p) => p.node === 'precinct_clauses')!;
    expect(Object.keys(precinct.lines).filter((k) => CLAUSE_LABELS.includes(k)).sort()).toEqual(chosen.map((c) => CLAUSE_LABEL[c]).sort());
  });

  it('"Agreed." and the clauses read back (Nine if with the player, else Three); Tamsin walks away only if the reserve is left under the pen', () => {
    const a = amend({}, { companions: { tamsin: 'party', nine: 'waiting' } });
    const s = toPage(a).pick('(Write: A forecast is not an act.)', '(Close the register.)', '(Close it.)');
    expect(s.text()).toContain('"Agreed."');
    expect(s.text()).toContain('Nine comes down two steps and reads the clauses back');
    expect(passives(s.r)).toEqual(['READ BACK: A forecast is not an act.']);
    s.pick('(Go on.)');
    expect(s.node).toBe('e_tamsin');
    expect(a.g.flags.a3_tam_walked).toBe(true);
    expect(a.g.world.party).not.toContain(TAMSIN);
    // the reserve clause written: she stays
    const b = amend({ prec_reserve: 'consent' }, { companions: { tamsin: 'party', nine: 'never' } });
    const sb = toPage(b).pick('(Write: A reserve is kept by its own consent.)', '(Close the register.)', '(Close it.)');
    expect(sb.text()).toContain('Then Three reads the clauses back');
    sb.pick('(Go on.)', '(Afterwards.)');
    expect(b.g.flags.a3_tam_walked).toBeUndefined();
    expect(b.g.world.party).toContain(TAMSIN);
  });

  it('no ruling held that the charter can carry: the page closes empty, and the Ledger agrees to that too', () => {
    const h = vault('hostile', {}, { a3_end: 'amendment', ca_precedents: 2, a3_register_back: true, a3_file: 'contested' });
    expect(CLAUSES.some((c) => cond(c.needs, h.g))).toBe(false);
    const s = toPage(h);
    expect(opts(s.r)).toEqual(['(Close the register with nothing written in it.)', '(Not yet. Leave it open on the plinth.)']);
    s.pick('(Close the register with nothing', '(Close it.)');
    expect(s.text()).toContain('You close the register on an empty page.');
    finish(s);
    expect(h.g.flags.a3_climax_done).toBe(true);
    expect(epilogue(h.g).first).toBe('steps_amended');
  });
});

// ---------------------------------------------------------------- refusals, and nothing unasked

describe('B6r: every refusal changes nothing; nothing resolves unasked', () => {
  const snap = (a: Game) => JSON.stringify({ f: a.g.flags, q: a.g.world.quests, d: a.g.world.decisions, i: a.g.pc.inventory, k: a.g.world.knowledge, p: a.g.world.party, m: a.g.minutes, loc: a.g.locationId });
  const REFUSALS: [string, () => Game, string, Pick[], string, Pick[]][] = [
    ['A1 the pen', () => at('plan', { ca_reserve: 'stayed' }), 'd_a3_end_plan', [], 'p_first', ['(Put the pen down. Not tonight.)', '(Step back from the desk.)']],
    ['A2 the stair', () => at('plan', {}, 'refused'), 'd_a3_end_plan', [], 'w_stair', ['(Not yet.)']],
    ['A2 the close', () => at('plan', {}, 'refused'), 'd_a3_end_plan', ['(Step out onto the close.)'], 'w_close', ['(Stand by the steel door']],
    ['B the act', () => at('unwritten', { a3_down_how: 'charge' }, 'worn', { companions: { nine: 'never' } }), 'd_a3_end_unwritten', [], 'b_act', ['(Not yet.)']],
    ['B the wardens', () => at('unwritten', { a3_down_how: 'charge' }, 'worn', { companions: { nine: 'never' } }), 'd_a3_end_unwritten', [/^\(Wait for ten/, '(Go on.)', '(Go on.)'], 'b_wardens', ['(Stand still in the dark']],
    ['C the pen', () => at('concern', {}, 'worn', { companions: 'nobody' }), 'd_a3_end_concern', [], 'c_pen', ['(Put the pen down. Not yet.)']],
    ['C the shaft', () => at('concern', {}, 'worn', { companions: 'nobody' }), 'd_a3_end_concern', ['(Sign it, slowly.)', '(Go on.)'], 'c_shaft', ['(Stay down here a while.)']],
    ['D the handle', () => at('opensky', { a3_reader: 'nine', a3_mast_keeper: 'knock' }), 'd_a3_end_opensky', [], 'd_handle', ['(Not yet.)']],
    ['D the blank sheet', () => at('opensky', { a3_reader: 'nine' }), 'd_a3_end_opensky', ['(Go on.)', '(Go on.)', '(Go on.)'], 'd_plan', ['(Not yet. Sit a while']],
    ['D the close', () => at('opensky', { a3_reader: 'nine', a3_ready: 0 }), 'd_a3_end_opensky', ['(Go on.)', '(Go on.)', '(Go on.)', '(Go up.)'], 'd_close', ['(Stay inside the steel door']],
    ['E the register', () => at('amendment'), 'd_a3_end_amendment', [], 'e_three', ['(Not yet.)']],
    ['E the page', () => at('amendment'), 'd_a3_end_amendment', ['(Carry it up to the steps', '(Write: A forecast is not an act.)'], 'e_write', ['(Not yet. Leave it open']],
  ];
  it('each refusal: nothing changes, and the climax opens again at the same beat', () => {
    for (const [what, make, tree, lead, at_, refuse] of REFUSALS) {
      const a = make();
      const s = run(a, tree, lead);
      expect(s.node, what).toBe(at_);
      const before = snap(a);
      const n = a.events.length;
      s.pick(...refuse);
      expect(s.r.ended, what).toBe(true);
      expect(snap(a), what).toBe(before);
      expect(a.events.slice(n), what).toEqual([]);
      expect(node(a, tree), what).toBe(at_);
    }
  });

  it('days pass at every beat and nothing moves: no flag, no epilogue, nobody hostile who was not drawn on', () => {
    const strip = (f: Flags) => Object.fromEntries(Object.entries(f).filter(([k]) => !k.startsWith('ev_armed_')));
    for (const [what, make, tree, lead, at_] of REFUSALS) {
      const a = make();
      run(a, tree, lead);
      const before = strip(a.g.flags);
      const here = a.g.locationId;
      for (let d = 0; d < 3; d++) { waitFor(a.g, a.q, here, 7); waitFor(a.g, a.q, here, 23); }
      expect(strip(a.g.flags), what).toEqual(before);
      expect(node(a, tree), what).toBe(at_);
      expect(opened(a).includes('d_a3_epilogue'), what).toBe(false);
      for (const id of [...VAULT_WARDENS, ...SKY_GUARDS, 'npc_a3_u2']) expect(cond(NPCS[id].hostileIf, a.g), `${what} ${id}`).toBe(false);
    }
  });

  it('every end\'s tree is shut to the other ends, and to a game with no end chosen', () => {
    const none = vault('truce');
    for (const d of A3_END_DIALOGUES) expect(new DialogueRunner(d, none.g, none.q).node, d.id).toBe('none');
    const a = at('plan');
    for (const d of A3_END_DIALOGUES.filter((x) => x.id !== 'd_a3_end_plan')) expect(new DialogueRunner(d, a.g, a.q).node, d.id).toBe('none');
  });
});

// ---------------------------------------------------------------- saves in the middle of a climax

/** A loaded copy with its own recorder (the runtime's host). */
async function reload(g: G): Promise<Game> {
  const l = await saveAndLoad(g);
  const rec = recorder();
  rec.bind(l.g);
  return { g: l.g, q: new QuestEngine(QUESTS, l.g, rec.host), fired: [], events: rec.events, saved: rec.saved };
}

describe('B6r: a save in the middle of a climax', () => {
  it('mid-fight in the dark under the Spire: loaded, the fight is still on; the wardens down, the climax goes on to the credits', async () => {
    const a = at('unwritten', { a3_down_how: 'charge' }, 'worn', { companions: { nine: 'never' } });
    run(a, 'd_a3_end_unwritten', [/^\(Wait for ten/, '(Go on.)', '(Go on.)', '(Draw.)', '(Fight.)']);
    kill(a.g, 'npc_a3_g19', 'md_vault');
    kill(a.g, 'npc_a3_g20', 'md_vault');
    const b = await reload(a.g);
    expect(cond(VAULT_FIGHTING, b.g)).toBe(true);
    expect(node(b, 'd_a3_end_unwritten')).toBe('b_fighting');
    for (const id of VAULT_WARDENS) expect(cond(NPCS[id].hostileIf, b.g)).toBe(true);
    expect(cond(MAPS.md_vault.triggers!.find((t) => t.id === 'a3_vault_after')!.if, b.g)).toBe(false);
    kill(b.g, 'npc_a3_g21', 'md_vault');
    kill(b.g, 'npc_a3_g22', 'md_vault');
    step(b, 'md_vault', 'a3_vault_after');
    finish(run(b, 'd_a3_end_unwritten'));
    expect(b.g.flags.a3_vault_out).toBe('fought');
    expect(epilogue(b.g).credits).toEqual([{ name: 'credits', data: undefined }]);
  });

  it('mid-register with two clauses written, and mid-reading after the twelve: each loaded copy resumes at its beat and finishes', async () => {
    const e = at('amendment');
    run(e, 'd_a3_end_amendment', ['(Carry it up to the steps', '(Write: A forecast is not an act.)', '(Write: The record yields to the living.)', '(Not yet. Leave it open']);
    const ge = await reload(e.g);
    const s = run(ge, 'd_a3_end_amendment');
    expect(s.node).toBe('e_write');
    expect(passives(s.r).filter((p) => p.startsWith('WRITTEN:'))).toEqual(['WRITTEN: A forecast is not an act.', 'WRITTEN: The record yields to the living.']);
    expect(ge.g.flags.a3_amends).toBe(2);
    finish(s, ['(Close the register.)', '(Close it.)']);
    expect(ge.g.flags.a3_amended).toBe(true);
    expect(epilogue(ge.g).first).toBe('steps_amended');

    const d = at('opensky', { a3_reader: 'nine', a3_ready: 3 });
    run(d, 'd_a3_end_opensky', ['(Go on.)']);
    const gd = await reload(d.g);
    const sd = run(gd, 'd_a3_end_opensky');
    expect(sd.node).toBe('d_all');
    sd.pick('(Go on.)', '(Go up.)', '(Nod to the wardens', '(Go on.)', '(Afterwards.)');
    expect(gd.g.flags.ep_sky).toBe('hard');
  });
});

// ---------------------------------------------------------------- one face for A2, and the slices' hand-offs

describe('B6r: the slides, the vault and the climax agree', () => {
  it('A2\'s face is one person throughout: the vault\'s child of six on the hip of a docker from Carrick, the climax\'s, slide 1\'s and R49\'s', () => {
    const w = allKeys('refused');
    const cost = run(w, 'd_a3_ledger', ['(Walk down the aisle', '(Listen.)', 'Whatever I do down here', 'If I leave the chair empty']).text();
    expect(cost).toContain('There is a docker from Carrick on the close, a woman about your age, holding her child up on her hip');
    expect(cost).toContain('I will write to her when she is fourteen.');
    const c = allKeys('refused');
    const cw = run(c, 'd_a3_ledger', ['(Walk down the aisle', '(Listen.)', '(Go to the desk.)', '(Leave the chair empty']).text();
    expect(cw).toContain('found a child on her mother\'s hip. Her mother is a docker, about your age, who walked up from Carrick to see a Magistrate. The child is six.');
    const a = at('plan', {}, 'refused');
    const s = run(a, 'd_a3_end_plan', ['(Step out onto the close.)']);
    expect(s.text()).toMatch(/A young docker from Carrick, about your age.*a girl of six who is looking straight back up at the lens/s);
    const steps = SLIDES_OPEN.find((x) => x.id === 'steps')!.variants.find((v) => v.id === 'refused')!.text as string;
    expect(steps).toContain('stopped on a face in the crowd: a girl of six on the hip of a young docker about {name}\'s age, who had walked up from Carrick to watch.');
    expect(JSON.stringify(SLIDES_PEOPLE.find((x) => x.id === 'r49'))).toContain('a docker from Carrick, the girl the lens had found on her mother\'s hip nineteen years before');
    finish(s, ['(Go down the far side']);
    const pages = play(a.g);
    expect(pages[0].text).toContain('a girl of six on the hip of a young docker about Halden\'s age, who had walked up from Carrick');
    expect(pages.find((p) => p.node.startsWith('r49_'))!.text).toContain('the girl the lens had found on her mother\'s hip nineteen years before');
  });

  it('the leavings the epilogue reads are written where the ends set them (wren_left / kes_left = concern, nine_left = core), with leave', () => {
    const src = A3_END_DIALOGUES.map((d) => JSON.stringify(d)).join('\n');
    for (const [flag, value] of [['wren_left', 'concern'], ['kes_left', 'concern'], ['nine_left', 'core']]) expect(src).toContain(`{"set":"${flag}","value":"${value}"}`);
    for (const id of [WREN, KES, NINE, TAMSIN, ILYA]) expect(src).toContain(`{"leave":"${id}"}`);
  });

  it('B6s\'s shale page in its free state reads no ks_ada in its people (its own selector fixes it)', () => {
    const free = SLIDES_OPEN.find((s) => s.id === 'shale')!.variants.find((v) => v.id === 'free')!;
    expect(JSON.stringify(free.people)).not.toContain('ks_ada');
  });
});

// ---------------------------------------------------------------- the maps, the people, the trees, the registry

describe('B6r: the maps, the new people, the trees and the registry', () => {
  it('the generators reproduce both maps; the vault\'s wardens and the close\'s placements mirror the shared conditions', () => {
    for (const s of ['gen_md_vault.py', 'gen_md_spire.py']) for (const m of regenerate(s)) expect(m.generated, m.map).toBe(m.committed);
    expect(readFileSync('src/content/maps/md_vault.ts', 'utf8')).toContain('Generated by tools/maps/gen_md_vault.py');
    const v = MAPS.md_vault.npcs!;
    expect(v.map((n) => n.def)).toEqual(VAULT_WARDENS);
    for (const n of v) expect(n.if).toEqual(VAULT_FIGHTING);
    const crates = MAPS.md_spire.npcs!.find((n) => n.id === 'npc_a3_u2_crates')!;
    expect(JSON.stringify(crates.if)).toContain(JSON.stringify(CRATES_BLADE));
    for (const id of SKY_GUARDS) expect(JSON.stringify(MAPS.md_spire.npcs!.find((n) => n.def === id)!.if)).toContain(JSON.stringify(SKY_BURNING));
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3_end|md_vault|md_spire|npc_a3_g(19|2[0-5])|d_a3_ledger/.test(e))).toEqual([]);
  });

  it('the new people: women narrow and men broad, hair true to ancestry, nobody grey under fifty-five; faces bare; losing forward', () => {
    const AFRO = ['coily_twa', 'coily_afro', 'coily_afro_big', 'paint_shaved', 'paint_buzz', 'paint_fade', 'paint_coils', 'paint_cornrows', 'none'];
    const women = ['npc_a3_g19', 'npc_a3_g22', 'npc_a3_g25'], men = ['npc_a3_g20', 'npc_a3_g21', 'npc_a3_g23', 'npc_a3_g24'];
    for (const w of women) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of men) expect(NPCS[m].look.frame, m).toBe('broad');
    for (const id of [...women, ...men]) {
      const n = NPCS[id];
      if (/african/.test(n.look.ancestry ?? '')) expect(AFRO, id).toContain(n.look.over?.hair?.style);
      expect(n.look.over?.hair?.style, id).not.toMatch(/bob|bang|slick|quiff/);
      expect(n.look.age ?? 0, id).toBeLessThan(55);
      expect(n.beaten, id).toBeDefined();
    }
  });

  it('every node has a line for coming back to it (U7), or only leaves; option ids are unique; all seven companions speak', () => {
    const speakers = new Set<string>();
    for (const d of A3_END_DIALOGUES) {
      const ids = new Set<string>();
      for (const [k, n] of Object.entries(d.nodes)) {
        if (!n.options.every((o) => o.exit)) expect(n.again, `${d.id}/${k}`).toBeDefined();
        for (const o of n.options) if (o.id) { expect(ids.has(o.id), `${d.id} ${o.id}`).toBe(false); ids.add(o.id); }
        for (const ij of n.interject ?? []) speakers.add(ij.companion);
        if (n.speaker && n.speaker !== 'narrator') speakers.add(n.speaker);
      }
      expect(d.start[d.start.length - 1].if, d.id).toBeUndefined();
      // every beat is reachable as a start entry: a climax left anywhere resumes
      for (const s of d.start) expect(d.nodes[s.node], `${d.id} ${s.node}`).toBeDefined();
    }
    for (const c of [TAMSIN, KES, NINE, 'npc_nb_03', 'npc_of_03', WREN, ILYA]) expect(speakers.has(c), c).toBe(true);
    // the words the ends are to be read by: no speeches, and the last option of each is the epilogue
    for (const d of A3_END_DIALOGUES) {
      const last = Object.values(d.nodes).flatMap((n) => n.options).filter((o) => o.text === '(Afterwards.)');
      expect(last.length, d.id).toBeGreaterThan(0);
      for (const o of last) expect(o.effects).toEqual([{ set: 'a3_climax_done' }, { event: 'dialogue', data: { tree: 'd_a3_epilogue', name: 'Afterwards' } }]);
    }
  });

  it('the flags are in the Act 3 registry; the epilogue\'s inputs are set before it opens', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6r (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_climax_done', 'a3_signed', 'a3_stacked', 'a3_saluted', 'a3_tam_walked', 'a3_walked_up', 'a3_child', 'a3_child_told', 'a3_first_paper', 'a3_down',
      'a3_dark', 'a3_vault_fight', 'a3_vault_out', 'a3_vault_beaten', 'a3_sash_left', 'a3_nine_core', 'nine_left', 'a3_sold', 'a3_sold_up', 'wren_left', 'kes_left', 'a3_crates',
      'a3_crates_fight', 'a3_handle_sent', 'a3_reading', 'a3_read_twelve', 'a3_read_all', 'a3_read', 'a3_read_up', 'ep_sky', 'a3_sky_fight', 'a3_sky_beaten', 'a3_sky_walk',
      'a3_sky', 'a3_register_up', 'a3_amend_', 'a3_amends', 'a3_amended', 'vault.after.', 'npc_a3_g19', 'npc_a3_g23', 'npc_a3_u2_crates', 'npc_a3_01_crates', 'a3_vault_after',
      'a3_crates_after', 'a3_sky_after']) expect(block.includes(f), f).toBe(true);
    for (const v of ['lowe', 'drop', 'taken', 'fought', 'talked', 'guards', 'let', 'none', 'held', 'hard', 'burning', 'courier', 'wheel', 'read', 'wardens', 'still', 'met', 'passed']) expect(block.includes(v), v).toBe(true);
  });
});
