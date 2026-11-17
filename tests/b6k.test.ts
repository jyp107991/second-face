import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { A3_AFTER_DIALOGUES, GRILLE_AFTER_NODES, INSIDE_AFTER, KNOCK_R_AFTER, MAUD_AFTER_NODES, CORIN_AFTER_NODES, LINNET_AFTER_NODES } from '../src/content/dialogue/a3_after';
import { CARRIED_WEST, PLATFORM_OPEN, TAM_AT_BUFFER, TAM_AT_KNOCK_AFTER, TAM_IN_CARRICK, TAMSIN } from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { skill } from '../src/engine/stats/sheet';
import type { SkillId } from '../src/engine/stats/rules';
import { apply, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { actThree, has, hour, saveAndLoad, stage, status, talk, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6k — after the door: the reserve carried west to Carrick's buffer in the wardens' car and held there for the designate's word
 * (the Harbour court, the Stand, the cradle and the Hulls, or Supply's receipt), never resolved unasked; consent at the buffer and
 * the guild's sale that never reaches it; the Ledger's card arriving anywhere whatever the door; Tamsin placed where the door left
 * her; Knock after the door by how it was settled (Maud, Corin, Linnet, Knock's others, MOTHER at the Grille and the hatch opening
 * to Knock, the residents on the apron, the residents inside); Amos and the mast's handle; a save round-trip. Played headless.
 */

interface Ev { name: string; data?: unknown }
type Game = A3 & { events: Ev[] };
type Flags = Record<string, string | boolean | number>;
const P = 'd_a3_platform';
const GO = '(Go on.)';
const COURT = '(Take it to the Harbour court at six';
const STAND = '(Go to the Stand and ask Constance Okoye.)';
const CRADLE = '(Get them out of the car tonight';
const HELD = 'Let Supply receive them.';
const ALONE: Over = { companions: { tamsin: 'never', nine: 'never' } };

function game(preset: Preset = 'truce', over: Over = {}, flags: Flags = {}): Game {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  const a = { ...actThree(preset, { ...over, host, flags: { a3_at_knock: true, ...(over.flags ?? {}), ...flags } }), events };
  a.g.pc.sheet.name = 'Halden';
  a.q.update();
  return a;
}
/** The door settled by relocation (the word, by default), the player at Carrick in the morning. */
const carried = (preset: Preset = 'truce', over: Over = {}, flags: Flags = {}, how = 'order') =>
  game(preset, { at: 'md_docks', ...over }, { a3_c9: 'relocated', a3_c9_how: how, a3_lowe: 'carried', a3_door_word: false, ...flags });
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
/** Open the platform's scene and walk to the tailboard (through the first arrival). */
function atCar(a: A3): DialogueRunner {
  const r = talk(P, a.g, a.q);
  if (r.node === 'arrive') go(r, a, [GO]);
  expect(r.node).toBe('car');
  return r;
}
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const has_ = (r: DialogueRunner, prefix: string) => opts(r).some((x) => x.startsWith(prefix));
const check = (r: DialogueRunner, prefix: string) => r.view()!.options.find((o) => o.text.startsWith(prefix))!.checkLabel;
const here = (map: string, g: G) => MAPS[map].npcs!.filter((p) => cond(p.if, g)).map((p) => p.id ?? p.def);
const kill = (g: G, id: string, map = 'c9_mouth') => { (g.npcs as Record<string, unknown>)[`${map}/${id}`] = { dead: true }; };
const trig = (map: string, id: string) => MAPS[map].triggers!.find((t) => t.id === id)!;
const opened = (a: Game) => a.events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
const hourOf = (g: G) => (g.minutes % 1440) / 60;
const AFTER = (g: G) => ({ after: g.flags.a3_c9_after, how: g.flags.a3_buffer_how });
const TAMS = ['npc_c9_03_after', 'npc_c9_03_door', 'npc_c9_03_buffer', 'npc_c9_03_carrick', 'npc_c9_03_hulls'];
const tamsins = (g: G) => [...here('c9_mouth', g), ...here('md_docks', g)].filter((id) => TAMS.includes(id));

// ---------------------------------------------------------------- the car comes to the buffer

describe('B6k: the reserve carried west comes to Carrick\'s buffer, and only then', () => {
  it('the word, forced, or the ring\'s own vote: the car at the buffer, with its lead, a warden, Ines and Effie; never for the guild\'s sale or a door kept', () => {
    for (const how of ['order', 'forced', 'consent']) {
      const a = carried('truce', ALONE, {}, how);
      expect(cond(PLATFORM_OPEN, a.g), how).toBe(true);
      for (const id of ['npc_md_01_buffer', 'npc_a3_g3_buffer', 'npc_a3_g4_buffer', 'npc_c9_01_buffer', 'npc_c9_r4_buffer']) expect(here('md_docks', a.g), `${how} ${id}`).toContain(id);
      expect(MAPS.md_docks.npcs!.find((p) => p.id === 'npc_md_01_buffer')!.dialogue).toBe(P);
    }
    const states: Flags[] = [
      { a3_c9: 'relocated', a3_c9_how: 'sold' }, { a3_c9: 'sealed', a3_c9_how: 'lowe' }, { a3_c9: 'opened', a3_c9_how: 'ines' }, {},
    ];
    for (const f of states) {
      const a = game('truce', { at: 'md_docks', ...ALONE }, f);
      expect(cond(PLATFORM_OPEN, a.g), JSON.stringify(f)).toBe(false);
      expect(here('md_docks', a.g).filter((id) => id.endsWith('_buffer')), JSON.stringify(f)).toEqual([]);
      expect(talk(P, a.g, a.q).node, JSON.stringify(f)).toBe('none');
    }
  });

  it('who leads at the tailboard is who led at the door: Lowe, Reyes when he died before, Kress when both did', () => {
    const r = carried('truce', ALONE);
    kill(r.g, 'npc_md_01');
    expect(here('md_docks', r.g)).toContain('npc_md_12_buffer');
    expect(here('md_docks', r.g)).not.toContain('npc_md_01_buffer');
    expect(talk(P, r.g, r.q).view()!.text).toContain('Sergeant Reyes stands at the tailboard');
    const k = carried('truce', ALONE);
    kill(k.g, 'npc_md_01'); kill(k.g, 'npc_md_12', 'md_precinct');
    expect(here('md_docks', k.g).filter((id) => id.startsWith('npc_md_'))).toEqual([]);
    expect(here('md_docks', k.g)).toContain('npc_a3_g3_buffer');
    expect(talk(P, k.g, k.q).view()!.text).toContain('Warden Kress sits on the tailboard');
  });

  it('end to end: "carry on" at the door; the next seven o\'clock brings the Ledger\'s card and the receipt slip anywhere; the platform\'s trigger opens the scene', () => {
    const a = game('truce', ALONE, { a3_column_apron: true });
    const r = talk('d_a3_door', a.g, a.q);
    if (r.node === 'arrive') go(r, a, ['(Look up the slope.)']);
    while (r.node === 'arrive_slope') go(r, a, [GO]);
    go(r, a, ['Carry on, Captain.', 'Carry on, Captain.']);
    expect(a.g.flags).toMatchObject({ a3_c9: 'relocated', a3_c9_how: 'order' });
    const fired = waitFor(a.g, a.q, 'wild:sallow', 7);
    expect(fired.sort()).toEqual(['a3_buffer_post', 'a3_summons']);
    expect(status(a.g, 'q_a3_platform')).toBe('active');
    expect(stage(a.g, 'q_a3_platform')).toBe('buffer');
    expect((a.g.world.post ?? []).some((m) => /TO BE RECEIVED AT THE BUFFER/.test(m.text))).toBe(true);
    // at Carrick, the first step onto the platform's end opens the scene once
    a.g.locationId = 'md_docks';
    const t = trig('md_docks', 'a3_buffer');
    expect(cond(t.if, a.g)).toBe(true);
    expect(t.once).not.toBe(false);
    apply(t.effects, a.g, a.q);
    expect(opened(a)).toContain(P);
    const arrive = talk(P, a.g, a.q);
    expect(arrive.node).toBe('arrive');
    expect(arrive.view()!.text).toContain('PRECINCT SUPPLY — RECEIVING');
    expect(arrive.view()!.text).toContain('The tailboard is up and chained');
    expect(arrive.view()!.text).toContain('Captain Lowe sits on an upturned crate');
    // the slip is not posted for a sale, or a kept door, and it comes once
    expect(waitFor(a.g, a.q, 'md_docks', 7)).toEqual([]);
    for (const f of [{ a3_c9: 'relocated', a3_c9_how: 'sold' }, { a3_c9: 'sealed', a3_c9_how: 'lowe' }] as Flags[]) {
      const b = game('truce', ALONE, f);
      const f2 = waitFor(b.g, b.q, 'c9_mouth', 7);
      expect(f2, JSON.stringify(f)).toContain('a3_summons');
      expect(f2, JSON.stringify(f)).not.toContain('a3_buffer_post');
    }
  });

  it('nothing resolves unasked: "(Not yet.)" changes nothing, and days at the buffer or anywhere else settle nothing', () => {
    const a = carried('truce', ALONE);
    const r = atCar(a);
    const before = JSON.stringify(a.g.flags);
    go(r, a, ['(Not yet.)']);
    expect(r.ended).toBe(true);
    expect(JSON.stringify(a.g.flags)).toBe(before);
    for (let d = 0; d < 5; d++) { waitFor(a.g, a.q, 'md_docks', 7); waitFor(a.g, a.q, 'md_docks', 18); waitFor(a.g, a.q, 'shale', 22); }
    expect(a.g.flags.a3_c9_after).toBeUndefined();
    expect(here('md_docks', a.g)).toContain('npc_md_01_buffer');
    expect(talk(P, a.g, a.q).node).toBe('car');
    expect(stage(a.g, 'q_a3_platform')).toBe('buffer');
  });

  it('the tailboard: why the column waits, what the receipt is (and whose quay this is), the faces through the slats', () => {
    const a = carried('hostile', {});
    const r = atCar(a);
    go(r, a, ['Why wait for me']);
    expect(r.view()!.text).toContain('Silence is not a word, designate');
    go(r, a, [GO, 'What happens at the receipt?']);
    expect(r.view()!.text).toContain('the Ledger enforces one book, and it is not the one in my pocket');
    expect(a.g.world.knowledge.a3_buffer_receipt).toBe(true);
    go(r, a, [GO, '(Go to the slats.)']);
    expect(r.view()!.text).toContain('I had thought being moved would feel different from being counted');
    go(r, a, [GO]);
    for (const t of ['Why wait for me', 'What happens at the receipt?', '(Go to the slats.)']) expect(has_(r, t), t).toBe(false);
    // the cadet reads the names at the car, when she stayed in the column (the hostile Linnet ran to the city)
    const b = carried('hostile', {});
    expect(talk(P, b.g, b.q).view()!.text).toContain('Cadet Ferrow sits at the far end of the tailboard');
  });
});

// ---------------------------------------------------------------- the ways off the car

describe('B6k: the Harbour court at six', () => {
  it('with the court\'s own finding (Mirela\'s, or Calla\'s), no check: passengers; the column folds the trestle; the quest is done', () => {
    const a = carried('prepared', { companions: { tamsin: 'waiting' } }, { dk_girl: 'ruled' });
    expect(a.g.flags.dk_prec_passenger).toBe(true);
    const r = atCar(a);
    expect(check(r, COURT)).toBe('');
    expect(r.view()!.options.find((o) => o.text.startsWith(COURT))!.text).toContain('The court has already found');
    go(r, a, [COURT]);
    expect(r.node).toBe('court');
    expect(hourOf(a.g)).toBe(18);
    expect(r.view()!.text).toContain('It found it for a girl of fifteen off the through');
    expect(r.view()!.text).toContain('Fold the trestle');
    expect(AFTER(a.g)).toEqual({ after: 'walked', how: 'court' });
    go(r, a, [GO]);
    expect(r.node).toBe('walked');
    expect(r.view()!.text).toContain('NOT RECEIVED');
    expect(r.view()!.text).toContain('Connie\'s people find them boxes');
    expect(stage(a.g, 'q_a3_platform')).toBe('walked');
    expect(status(a.g, 'q_a3_platform')).toBe('done');
    expect(here('md_docks', a.g)).toEqual(expect.arrayContaining(['npc_c9_01_carrick', 'npc_c9_r4_carrick']));
    expect(here('md_docks', a.g).filter((id) => id.endsWith('_buffer'))).toEqual([]);
    expect(talk(P, a.g, a.q).view()!.text).toContain('PASSENGERS');
  });

  it('without it, Speech 45 with Dahl (her trust, Nine, the Act read, her rulings, the Court\'s); won, the finding is made and is a precedent', () => {
    const DC = (over: Over, flags: Flags = {}) => check(atCar(carried('truce', { companions: { tamsin: 'never', nine: 'never' }, ...over }, flags)), COURT);
    expect(DC({})).toBe('Speech 45');
    expect(DC({ companions: { tamsin: 'never', nine: 'party' } })).toBe('Speech 35');
    expect(DC({ trust: { npc_dk_01: 25 }, knows: ['dk_act_read'] })).toBe('Speech 25');
    expect(DC({}, { dk_weighbridge: 'on', prec_unrecorded: 'yields', ca_reserve: 'stayed' })).toBe('Speech 30');
    const a = carried('truce', ALONE);
    eff(a.g, 'speech', 45);
    const r = go(atCar(a), a, [COURT]);
    expect(r.node).toBe('court');
    expect(r.view()!.text).toContain('Stores are a ship\'s');
    expect(a.g.flags.dk_prec_passenger).toBe(true);
    expect(AFTER(a.g)).toEqual({ after: 'walked', how: 'court' });
  });

  it('a failed argument adjourns the court and is spent; the other ways stay; Dahl dead, no court', () => {
    const a = carried('truce', ALONE, { dk_stand_owed: true });
    eff(a.g, 'speech', 30);
    const r = go(atCar(a), a, [COURT]);
    expect(r.node).toBe('court_no');
    expect(r.view()!.text).toContain('Adjourned');
    expect(hourOf(a.g)).toBe(18);
    expect(a.g.flags.a3_buffer_court).toBe('adjourned');
    expect(a.g.flags.a3_c9_after).toBeUndefined();
    go(r, a, [GO]);
    expect(has_(r, COURT)).toBe(false);
    expect(has_(r, STAND)).toBe(true);
    expect(has_(r, HELD)).toBe(true);
    const b = carried('truce', ALONE);
    kill(b.g, 'npc_dk_01', 'md_docks');
    expect(has_(atCar(b), COURT)).toBe(false);
  });
});

describe('B6k: the Stand blacks the car', () => {
  it('owed (Crane Six) or called: the cranes stop, the dockers line the platform, the column stands back; never otherwise', () => {
    for (const f of [{ dk_stand_owed: true }, { a3_ally_stand: true }] as Flags[]) {
      const a = carried('truce', ALONE, f);
      const r = go(atCar(a), a, [STAND]);
      expect(r.node).toBe('stand');
      expect(r.view()!.text).toContain('We don\'t load people');
      expect(r.view()!.text).toContain('I am not going to shoot dockers on a quay for the Hospice block');
      expect(AFTER(a.g)).toEqual({ after: 'walked', how: 'stand' });
      go(r, a, [GO]);
      expect(r.node).toBe('walked');
    }
    expect(has_(atCar(carried('truce', ALONE)), STAND)).toBe(false);
    const c = carried('truce', ALONE, { dk_stand_owed: true });
    kill(c.g, 'npc_dk_02', 'md_docks');
    expect(has_(atCar(c), STAND)).toBe(false);
    // Reyes leading: she stands back too, once the quay is against her
    const d = carried('truce', ALONE, { dk_stand_owed: true });
    kill(d.g, 'npc_md_01');
    expect(go(atCar(d), d, [STAND]).view()!.text).toContain('And I\'ve the quay');
  });
});

describe('B6k: the cradle and the Hulls, by night', () => {
  const night = (over: Over = ALONE, flags: Flags = {}) => {
    const a = carried('truce', over, { dk_cradle_known: true, ...flags });
    a.g.world.knowledge.dk_cradle_known = true;
    hour(a.g, 22);
    return a;
  };
  it('only at night, with the cradle running and known; by day, Kobby says when to come back', () => {
    const day = carried('truce', ALONE);
    day.g.world.knowledge.dk_cradle_known = true;
    const r = atCar(day);
    expect(has_(r, CRADLE)).toBe(false);
    go(r, day, ['(Kobby Ofori\'s cradle runs at night.)']);
    expect(r.view()!.text).toContain('Come back when the Bond\'s lights are the only lights');
    go(r, day, [GO]);
    expect(has_(r, '(Kobby Ofori\'s cradle runs at night.)')).toBe(false);
    expect(has_(atCar(night()), CRADLE)).toBe(true);
    const unknown = carried('truce', ALONE);
    hour(unknown.g, 22);
    expect(has_(atCar(unknown), CRADLE)).toBe(false);
    for (const f of [{ dk_cradle: 'cut' }, { dk_hulls_empty: true }, { dk_hulls: 'cleared' }] as Flags[]) expect(has_(atCar(night(ALONE, f)), CRADLE), JSON.stringify(f)).toBe(false);
  });

  it('Stealth 45 (the lead looking away, the Hulls owing you, the basket known, Wren; Reyes walking the car); won, they are crew', () => {
    expect(check(atCar(night()), CRADLE)).toBe('Stealth 45');
    expect(check(atCar(night(ALONE, { dk_hulls: 'crewed', dk_cradle_ridden: true })), CRADLE)).toBe('Stealth 30');
    expect(check(atCar(night({ ...ALONE, trust: { npc_md_01: 30 } })), CRADLE)).toBe('Stealth 35');
    const reyes = night();
    kill(reyes.g, 'npc_md_01');
    expect(check(atCar(reyes), CRADLE)).toBe('Stealth 55');
    const a = night();
    eff(a.g, 'stealth', 45);
    const r = go(atCar(a), a, [CRADLE]);
    expect(r.node).toBe('cradle');
    expect(r.view()!.text).toContain('Schedule 3. A crewed vessel in port');
    expect(r.view()!.text).toContain('NOT FOUND AT RECEIPT');
    expect(AFTER(a.g)).toEqual({ after: 'walked', how: 'cradle' });
    go(r, a, [GO]);
    expect(r.view()!.text).toContain('the Hulls have more crew than they had');
    expect(here('md_docks', a.g)).toEqual(expect.arrayContaining(['npc_c9_01_hulls', 'npc_c9_r4_hulls']));
    expect(here('md_docks', a.g)).not.toContain('npc_c9_01_carrick');
    expect(talk('d_a3_ck_ines', a.g, a.q).view()!.text).toContain('crew book');
  });

  it('caught: the lamp holds on you, the watch is doubled, and the cradle is not offered again; the other ways stay', () => {
    const a = night(ALONE, { dk_stand_owed: true });
    eff(a.g, 'stealth', 30);
    const r = go(atCar(a), a, [CRADLE]);
    expect(r.node).toBe('cradle_no');
    expect(a.g.flags.a3_buffer_watched).toBe(true);
    expect(a.g.flags.a3_c9_after).toBeUndefined();
    go(r, a, [GO]);
    expect(has_(r, CRADLE)).toBe(false);
    expect(has_(r, STAND)).toBe(true);
  });
});

describe('B6k: Supply receives them on the designate\'s word', () => {
  it('asked once more; "not yet" goes back; said, the clerk reads the names, the vans go, the quest fails', () => {
    const a = carried('truce', ALONE);
    const r = go(atCar(a), a, [HELD]);
    expect(r.node).toBe('held_warn');
    go(r, a, ['No. Not yet.']);
    expect(r.node).toBe('car');
    expect(a.g.flags.a3_c9_after).toBeUndefined();
    go(r, a, [HELD, '(Say it.) Supply may receive them.']);
    expect(r.node).toBe('held');
    expect(r.view()!.text).toContain('is written RECEIVED');
    expect(a.g.flags.a3_c9_after).toBe('held');
    expect(stage(a.g, 'q_a3_platform')).toBe('held');
    expect(status(a.g, 'q_a3_platform')).toBe('failed');
    expect(here('md_docks', a.g).filter((id) => id.startsWith('npc_c9_'))).toEqual([]);
    expect(talk(P, a.g, a.q).view()!.text).toContain('turned to the brick');
  });
});

// ---------------------------------------------------------------- consent and the sale

describe('B6k: consent at the buffer, and the sale that never reaches it', () => {
  it('by their own vote: the tailboard down, their names on their bundles; they say what they want; received, they went (done); walked, Sayer goes in by choice', () => {
    const a = carried('truce', { companions: { tamsin: 'party', nine: 'never' } }, {}, 'consent');
    const arrive = talk(P, a.g, a.q);
    expect(arrive.view()!.text).toContain('The tailboard is down. Nobody has chained it');
    const r = go(arrive, a, [GO, '(Ask them what they want']);
    expect(r.view()!.speaker).toBe('npc_c9_01');
    expect(r.view()!.text).toContain('We did not want to be graded');
    go(r, a, [GO, HELD, '(Say it.)']);
    expect(r.view()!.text).toContain('Sayer Quist with his hand over his ribs, gladly');
    expect(stage(a.g, 'q_a3_platform')).toBe('went');
    expect(status(a.g, 'q_a3_platform')).toBe('done');
    const b = carried('truce', { companions: { tamsin: 'party', nine: 'never' } }, { dk_stand_owed: true }, 'consent');
    const tam = b.g.world.approval[TAMSIN];
    const rb = go(atCar(b), b, [STAND, GO]);
    expect(rb.view()!.text).toContain('Sayer Quist shakes everybody\'s hand');
    expect(b.g.world.approval[TAMSIN]).toBeGreaterThan(tam);
  });

  it('the guild\'s paper takes them up its own road: no car at Carrick, no slip, no platform; Hale and the handlers have gone with them', () => {
    const a = game('guild', { companions: { tamsin: 'never', nine: 'never' } }, { a3_guild_in: true, a3_hounds_in: true, a3_c9: 'relocated', a3_c9_how: 'sold', a3_guild: 'signed' });
    expect(cond(CARRIED_WEST, a.g)).toBe(false);
    expect(here('c9_mouth', a.g)).not.toContain('npc_kn_out_lead_a3');
    for (const id of ['npc_a3_g11', 'npc_a3_g12']) expect(here('c9_mouth', a.g)).not.toContain(id);
    expect(here('c9_mouth', a.g)).toContain('npc_kn_factor_a3');
    // a sealed door keeps the guild's people at Knock (Hale stays to stand in front of Maud)
    const b = game('guild', ALONE, { a3_guild_in: true, a3_hounds_in: true, a3_c9: 'sealed', a3_c9_how: 'lowe' });
    expect(here('c9_mouth', b.g)).toEqual(expect.arrayContaining(['npc_kn_out_lead_a3', 'npc_a3_g11', 'npc_a3_g12']));
  });

  it('forced: the car whispers; Tamsin is placed nowhere, and the place where she died is marked on the apron', () => {
    const a = carried('truce', { companions: { tamsin: 'never', nine: 'never' } }, { a3_tamsin_dead: true, a3_door_forced: true, tam_left: 'door' }, 'forced');
    expect(talk(P, a.g, a.q).view()!.text).toContain('All of them saw the door');
    expect(tamsins(a.g)).toEqual([]);
    const t = trig('c9_mouth', 'a3_tam_line');
    expect(cond(t.if, a.g)).toBe(true);
    expect(t.text).toContain('TAMSIN');
  });
});

// ---------------------------------------------------------------- the Ledger's card, anywhere

describe('B6k: the summons arrives anywhere, once, whatever the door', () => {
  it('sealed, opened, relocated (each way), at Knock, Carrick, Shale, the wild, the Spire: the card, the close, the tracker', () => {
    const outcomes: Flags[] = [
      { a3_c9: 'sealed', a3_c9_how: 'lowe' }, { a3_c9: 'sealed', a3_c9_how: 'welded' }, { a3_c9: 'opened', a3_c9_how: 'ines' },
      { a3_c9: 'relocated', a3_c9_how: 'order' }, { a3_c9: 'relocated', a3_c9_how: 'sold' }, { a3_c9: 'relocated', a3_c9_how: 'consent' },
    ];
    const places = ['c9_mouth', 'md_docks', 'shale', 'wild:sallow', 'md_spire'];
    outcomes.forEach((f, i) => {
      const where = places[i % places.length];
      const a = game('truce', ALONE, f);
      const fired = waitFor(a.g, a.q, where, 7);
      expect(fired, `${JSON.stringify(f)} at ${where}`).toContain('a3_summons');
      expect(has(a.g, 'k_a3_summons')).toBe(true);
      expect(a.g.flags.a3_summoned).toBe(true);
      expect(stage(a.g, 'q_a3_spire')).toBe('close');
      expect(stage(a.g, 'q_a3_hold')).toBe('holding');
      expect(waitFor(a.g, a.q, where, 7)).not.toContain('a3_summons');
    });
    // never before the door is settled
    const b = game('truce', ALONE);
    for (let d = 0; d < 3; d++) expect(waitFor(b.g, b.q, 'md_docks', 7)).not.toContain('a3_summons');
    expect(WORLD_EVENTS.a3_summons.effects).toEqual(expect.arrayContaining([{ set: 'a3_summoned' }, { give: 'k_a3_summons' }, { quest: 'q_a3_spire', start: true }]));
  });
});

// ---------------------------------------------------------------- Tamsin, where the door left her

describe('B6k: Tamsin after the door, placed in one place only', () => {
  const stood: Flags = { tam_left: 'door', a3_tam_door: true };
  it('a kept door: by it on the apron; she will not come back, and says why; once in a place, never twice', () => {
    const a = game('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { ...stood, a3_c9: 'sealed', a3_c9_how: 'lowe', tam_pledge: 'door' });
    expect(cond(TAM_AT_KNOCK_AFTER, a.g)).toBe(true);
    expect(tamsins(a.g)).toEqual(['npc_c9_03_after']);
    expect(MAPS.c9_mouth.npcs!.find((p) => p.id === 'npc_c9_03_after')!.dialogue).toBe('d_a3_tam_after');
    const r = talk('d_a3_tam_after', a.g, a.q);
    expect(r.node).toBe('sealed');
    expect(r.view()!.text).toContain('I know which one you said first');
    go(r, a, [GO, 'Come back with me, Tam.']);
    expect(r.view()!.text).toContain('the word and not the weather');
    go(r, a, [GO, 'What will you do now?']);
    expect(r.view()!.text).toContain('Somebody should, who\'s been on both sides of it');
    go(r, a, [GO]);
    expect(opts(r)).toEqual(['I\'m sorry.', '(Leave her.)']);
    expect(talk('d_a3_tam_after', a.g, a.q).node).toBe('hub');
    expect(cond({ inParty: TAMSIN }, a.g)).toBe(false);
  });

  it('carried out of the door and the reserve carried west: behind the car at the buffer; with them in Carrick or the Hulls; home if they were received', () => {
    const base = { ...stood, a3_tam_door: false, a3_tam_carried: true };
    const a = carried('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, base);
    expect(cond(TAM_AT_BUFFER, a.g)).toBe(true);
    expect(tamsins(a.g)).toEqual(['npc_c9_03_buffer']);
    expect(talk(P, a.g, a.q).view()!.text).toContain('a woman with copper hair hacked short is talking through the slats');
    expect(talk('d_a3_tam_after', a.g, a.q).view()!.text).toContain('Get them off this car');
    a.g.flags.dk_stand_owed = true;
    const r = go(atCar(a), a, [STAND, GO]);
    expect(r.view()!.text).toContain('Don\'t think it makes us square');
    expect(cond(TAM_IN_CARRICK, a.g)).toBe(true);
    expect(tamsins(a.g)).toEqual(['npc_c9_03_carrick']);
    expect(talk('d_a3_tam_after', a.g, a.q).node).toBe('carrick');
    const h = carried('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, base);
    const rh = go(atCar(h), h, [HELD, '(Say it.)']);
    expect(rh.view()!.text).toContain('"Not listed," he says, politely');
    expect(tamsins(h.g)).toEqual(['npc_c9_03_after']);
    expect(talk('d_a3_tam_after', h.g, h.q).node).toBe('held');
  });

  it('the sale, an opened door: by the door at Knock in each, by her own words; dead, nowhere; never at Knock and Carrick at once', () => {
    const sold = game('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { ...stood, a3_tam_door: false, a3_tam_carried: true, a3_c9: 'relocated', a3_c9_how: 'sold' });
    expect(tamsins(sold.g)).toEqual(['npc_c9_03_after']);
    expect(talk('d_a3_tam_after', sold.g, sold.q).view()!.text).toContain('Spare parts');
    const op = game('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { ...stood, a3_c9: 'opened', a3_c9_how: 'ines' });
    expect(tamsins(op.g)).toEqual(['npc_c9_03_after']);
    expect(talk('d_a3_tam_after', op.g, op.q).view()!.text).toContain('They opened it');
    const unsettled = game('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, stood);
    expect(tamsins(unsettled.g)).toEqual(['npc_c9_03_door']);
    const dead = game('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { ...stood, a3_tamsin_dead: true, a3_c9: 'relocated', a3_c9_how: 'forced' });
    expect(tamsins(dead.g)).toEqual([]);
    // a Tamsin who never stood in the door is never placed by these
    expect(tamsins(game('truce', { companions: { tamsin: 'waiting' } }, { a3_c9: 'sealed', a3_c9_how: 'lowe' }).g)).toEqual([]);
  });
});

// ---------------------------------------------------------------- Knock after the door

describe('B6k: Knock after the door, by how it was settled', () => {
  const home: Flags = { a3_maud_home: true };
  it('Maud: her first word by outcome, then her lockdown topics are gone and the after\'s are there', () => {
    const cases: [Flags, string][] = [
      [{ a3_c9: 'sealed', a3_c9_how: 'lowe' }, 'First time in my life I\'ve said it back'],
      [{ a3_c9: 'sealed', a3_c9_how: 'welded' }, 'Bram knocked'],
      [{ a3_c9: 'sealed', a3_c9_how: 'struck', a3_claim: 'held' }, 'CLAIMED — SALVAGE'],
      [{ a3_c9: 'sealed', a3_c9_how: 'fought' }, 'I fetched the bucket'],
      [{ a3_c9: 'opened', a3_c9_how: 'ines' }, 'She\'s shorter than her voice'],
      [{ a3_c9: 'relocated', a3_c9_how: 'order' }, 'I saw their faces'],
      [{ a3_c9: 'relocated', a3_c9_how: 'consent' }, 'They chose it'],
      [{ a3_c9: 'relocated', a3_c9_how: 'sold' }, 'Forty a head'],
      [{ a3_c9: 'relocated', a3_c9_how: 'forced', a3_tamsin_dead: true }, 'Continuity. That\'s what I said over her'],
      [{ a3_c9: 'sealed', a3_c9_how: 'lowe', a3_mother: 'burned' }, 'Bram passes the water out through the slot by hand'],
    ];
    for (const [f, text] of cases) {
      const a = game('truce', ALONE, { ...home, ...f });
      const r = talk('d_a3_maud', a.g, a.q);
      expect(r.node, JSON.stringify(f)).toBe('a3k_maud');
      expect(r.view()!.text, JSON.stringify(f)).toContain(text);
      go(r, a, [GO]);
      const o = opts(r);
      for (const gone of ['The hatch.', 'How is Knock for water?', 'The wardens.', '(Be at the hatch with her at seven.)', 'What do you want, Maud? At the door.']) expect(o, `${JSON.stringify(f)} ${gone}`).not.toContain(gone);
      expect(o, JSON.stringify(f)).toContain('What will Knock do now?');
    }
    // before the door, nothing of it
    const b = game('truce', ALONE, home);
    const rb = talk('d_a3_maud', b.g, b.q);
    expect(rb.node).toBe('hub');
    expect(opts(rb)).toContain('The hatch.');
    expect(opts(rb)).not.toContain('What will Knock do now?');
  });

  it('MOTHER opening the hatch to Knock at seven: thanks kept, good morning for an open door, the stores given to Knock for an empty one', () => {
    const cases: [Flags, string][] = [
      [{ a3_c9: 'sealed', a3_c9_how: 'lowe' }, 'Thank you for yours'],
      [{ a3_c9: 'opened', a3_c9_how: 'ines' }, 'Good morning, Maud Ferrow'],
      [{ a3_c9: 'relocated', a3_c9_how: 'order' }, 'They are Knock\'s'],
    ];
    for (const [f, text] of cases) {
      const a = game('truce', ALONE, { ...home, ...f, a3_mother: f.a3_c9 === 'sealed' ? 'kept' : 'knock' });
      const r = go(talk('d_a3_maud', a.g, a.q), a, [GO, '(Be at the hatch with her at seven, now it opens.)']);
      expect(hourOf(a.g)).toBe(7);
      expect(r.view()!.text, JSON.stringify(f)).toContain(text);
    }
    const dark = game('truce', ALONE, { ...home, a3_c9: 'sealed', a3_c9_how: 'lowe', a3_mother: 'asleep' });
    expect(opts(go(talk('d_a3_maud', dark.g, dark.q), dark, [GO]))).not.toContain('(Be at the hatch with her at seven, now it opens.)');
  });

  it('Maud on Tamsin (her grave, the slip MOTHER printed; or where she sits) and on Linnet gone with the column', () => {
    const a = game('hostile', {}, { ...home, a3_c9: 'relocated', a3_c9_how: 'forced', a3_tamsin_dead: true, a3_mother: 'knock' });
    const r = go(talk('d_a3_maud', a.g, a.q), a, [GO, 'Tamsin.']);
    expect(r.view()!.text).toContain('RESIDENT ROE. SIXTY-ONE. CONTINUITY ENDED. THANK YOU.');
    go(r, a, [GO, 'Linnet went with the column.']);
    expect(r.view()!.text).toContain('read every name out');
  });

  it('Corin, Linnet and Knock\'s others each say one thing after it; the column\'s topics are gone', () => {
    const a = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'lowe', a3_corin_met: true, kn_linnet_to_shale: false, kn_linnet_stays: true, a3_linnet: 'knock', a3_linnet_after: 'road' });
    const c = talk('d_a3_corin', a.g, a.q);
    expect(c.view()!.text).toContain('its bolt out and in his pocket');
    expect(opts(c)).not.toContain('What will you do when I go to the door?');
    go(c, a, ['It\'s done, Corin.']);
    expect(c.view()!.text).toContain('The pump\'s always the next thing');
    const l = talk('d_a3_linnet', a.g, a.q);
    expect(opts(l)).not.toContain('There\'s a column on the road, Lin.');
    go(l, a, ['It\'s done, Lin.']);
    expect(l.view()!.text).toContain('Maud knows. She\'s been packing my bag');
    for (const [id, text] of [['d_a3_kn_r1', 'Hatch ran out at seven'], ['d_a3_kn_r2', 'That one was the worst and the shortest'], ['d_a3_kn_r3', 'how long we were brave for'], ['d_a3_kn_r4', 'Car went home empty']] as [string, string][]) {
      const r = talk(id, a.g, a.q);
      expect(r.node, id).toBe('a3k');
      expect(r.view()!.text, id).toContain(text);
      expect(talk(id, a.g, a.q).node, `${id} again`).toBe('a3k');
    }
    const o = game('truce', ALONE, { a3_c9: 'opened', a3_c9_how: 'ines' });
    expect(talk('d_a3_kn_r1', o.g, o.q).view()!.text).toContain('Ola Fairley');
  });

  it('Amos goes up Signal Hill with the switch\'s handle when Knock keeps the mast, and only then', () => {
    const a = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'lowe', a3_mast: 'raised', a3_mast_keeper: 'knock' });
    const r = go(talk('d_a3_kn_r4', a.g, a.q), a, ['Signal Hill\'s switch needs somebody']);
    expect(r.view()!.text).toContain('I\'m old, not deaf');
    expect(a.g.flags.a3_mast_handle).toBe('amos');
    expect(opts(talk('d_a3_kn_r4', a.g, a.q))).not.toContain('Signal Hill\'s switch needs somebody from Knock to keep it.');
    const b = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'lowe', a3_mast: 'raised', a3_mast_keeper: 'hollow' });
    expect(opts(talk('d_a3_kn_r4', b.g, b.q)).some((x) => x.startsWith('Signal Hill'))).toBe(false);
  });

  it('the Grille: MOTHER by what the door left (put through to Effie; good morning; nobody to put you through to); asleep, Bram\'s chalk; burned, dark', () => {
    const s = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'welded', a3_mother: 'kept' });
    const r = talk('d_a3_grille', s.g, s.q);
    expect(r.node).toBe('a3k_grille');
    expect(r.view()!.text).toContain('Would you like me to put you through to someone?');
    go(r, s, ['(Ask for Effie Calder.)']);
    expect(r.view()!.speaker).toBe('npc_c9_r4');
    expect(r.view()!.text).toContain('Bram let me hold the rod');
    const o = game('truce', ALONE, { a3_c9: 'opened', a3_c9_how: 'ines', a3_mother: 'knock' });
    expect(talk('d_a3_grille', o.g, o.q).view()!.text).toContain('Good morning, Halden');
    const e = game('truce', ALONE, { a3_c9: 'relocated', a3_c9_how: 'order', a3_mother: 'knock' });
    const re = talk('d_a3_grille', e.g, e.q);
    expect(re.view()!.text).toContain('There is nobody to put you through to');
    go(re, e, ['What will you do now, MOTHER?']);
    expect(re.view()!.text).toContain('Log Maud Ferrow\'s attendance');
    const asleep = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'lowe', a3_mother: 'asleep' });
    expect(talk('d_a3_grille', asleep.g, asleep.q).view()!.text).toContain('PAGE 41. ASK ME.');
    const burned = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'lowe', a3_mother: 'burned', a3_archive: 'burned' });
    expect(talk('d_a3_grille', burned.g, burned.q).node).toBe('a3_burned');
  });

  it('an opened door: Ines, Wes, Ola and Effie out on the apron and the slope, each with their own after; nobody inside', () => {
    const a = game('truce', ALONE, { a3_c9: 'opened', a3_c9_how: 'ines', a3_c9_by: 'lowe' });
    const ids = ['npc_c9_01_apron', 'npc_c9_r2_apron', 'npc_c9_r1_apron', 'npc_c9_r4_apron'];
    for (const id of ids) expect(here('c9_mouth', a.g), id).toContain(id);
    expect(here('cistern9', a.g).filter((id) => id.startsWith('npc_c9_'))).toEqual([]);
    const ines = talk('d_a3_ap_ines', a.g, a.q);
    expect(ines.view()!.text).toContain('Everything out here is a different size from its voice');
    go(ines, a, ['What will you do now?']);
    expect(ines.view()!.text).toContain('She practised on Bram');
    expect(talk('d_a3_ap_wes', a.g, a.q).view()!.text).toContain('I\'m not going to miss it');
    expect(talk('d_a3_ap_ola', a.g, a.q).view()!.text).toContain('You didn\'t say sleeves');
    expect(talk('d_a3_ap_effie', a.g, a.q).view()!.text).toContain('How far is Shale?');
    const f = game('truce', ALONE, { a3_c9: 'opened', a3_c9_how: 'ines', a3_c9_by: 'fought' });
    expect(talk('d_a3_ap_ines', f.g, f.q).view()!.text).toContain('I stepped round them');
    for (const st of [{ a3_c9: 'sealed', a3_c9_how: 'lowe' }, { a3_c9: 'relocated', a3_c9_how: 'order' }] as Flags[]) {
      const b = game('truce', ALONE, st);
      for (const id of ids) expect(here('c9_mouth', b.g), `${JSON.stringify(st)} ${id}`).not.toContain(id);
    }
  });

  it('a sealed door, inside: one word each from the ring and the residents, then their own talk, with the lockdown\'s questions gone', () => {
    const a = game('truce', ALONE, { a3_c9: 'sealed', a3_c9_how: 'welded', a3_inside: true, a3_ines_met: true, a3_pell_met: true, a3_bram_met: true, a3_teague_met: true });
    const cases: [string, string, string][] = [
      ['d_a3_ines', 'I am writing to Maud', 'i_hub'], ['d_a3_pell', 'Rations back to full continuity', 'p_hub'],
      ['d_a3_bram', 'Laid it properly', 'b_hub'], ['d_a3_teague', 'I know what I asked for', 't_hub'],
    ];
    for (const [id, text, hub] of cases) {
      const r = talk(id, a.g, a.q);
      expect(r.node, id).toBe('a3k_in');
      expect(r.view()!.text, id).toContain(text);
      go(r, a, [GO]);
      expect(r.node, id).toBe(hub);
      expect(talk(id, a.g, a.q).node, `${id} again`).toBe(hub);
    }
    expect(opts(talk('d_a3_ines', a.g, a.q))).not.toContain('What will the ring do?');
    expect(opts(talk('d_a3_pell', a.g, a.q))).not.toContain('How are they? Really.');
    expect(opts(talk('d_a3_teague', a.g, a.q))).not.toContain('You want it welded.');
    for (const [id, text] of [['d_a3_c9_r1', 'Hatch ran at seven'], ['d_a3_c9_r2', 'The door held'], ['d_a3_c9_r3', 'Door or no door'], ['d_a3_c9_r4', 'And one new seam']] as [string, string][]) {
      const r = talk(id, a.g, a.q);
      expect(r.node, id).toBe('a3k_hi');
      expect(r.view()!.text, id).toContain(text);
      go(r, a, [r.view()!.options[0].text, GO]);
      expect(r.node, id).toBe('a3k_hi');
    }
    // before the door, the lockdown's own words
    const b = game('truce', ALONE, { a3_inside: true });
    expect(talk('d_a3_c9_r1', b.g, b.q).view()!.text).toContain('The beds don\'t know there\'s a lockdown');
  });
});

// ---------------------------------------------------------------- saves, the maps, the trees, the content

describe('B6k: saves, the maps, the trees and the content', () => {
  it('a save with the car at the buffer and the court adjourned resumes as it stood; settled after, a second save keeps every outcome', async () => {
    const a = carried('truce', { companions: { tamsin: 'waiting', nine: 'never' } }, { tam_left: 'door', a3_tam_carried: true, dk_stand_owed: true });
    eff(a.g, 'speech', 30);
    go(atCar(a), a, [COURT]);
    const mid = await saveAndLoad(a.g);
    mid.q.update();
    expect(mid.g.flags).toMatchObject({ a3_c9: 'relocated', a3_c9_how: 'order', a3_buffer_court: 'adjourned' });
    expect(mid.g.flags.a3_c9_after).toBeUndefined();
    expect(stage(mid.g, 'q_a3_platform')).toBe('buffer');
    expect(new DialogueRunner(DIALOGUES[P], mid.g, mid.q).node).toBe('car');
    expect(tamsins(mid.g)).toEqual(['npc_c9_03_buffer']);
    const r = atCar(mid);
    expect(has_(r, COURT)).toBe(false);
    go(r, mid, [STAND, GO]);
    const end = await saveAndLoad(mid.g);
    end.q.update();
    expect(AFTER(end.g)).toEqual({ after: 'walked', how: 'stand' });
    expect(stage(end.g, 'q_a3_platform')).toBe('walked');
    expect(new DialogueRunner(DIALOGUES[P], end.g, end.q).node).toBe('after');
    expect(tamsins(end.g)).toEqual(['npc_c9_03_carrick']);
    expect(here('md_docks', end.g)).toEqual(expect.arrayContaining(['npc_c9_01_carrick', 'npc_c9_r4_carrick']));
  });

  it('the maps mirror the shared conditions: the platform\'s placements and trigger, and Tamsin\'s after the door', () => {
    const states: Flags[] = [
      {}, { a3_c9: 'sealed', a3_c9_how: 'lowe' }, { a3_c9: 'relocated', a3_c9_how: 'order' }, { a3_c9: 'relocated', a3_c9_how: 'consent', a3_c9_after: 'walked' },
      { a3_c9: 'relocated', a3_c9_how: 'forced', a3_c9_after: 'held' }, { a3_c9: 'relocated', a3_c9_how: 'sold' },
    ];
    const tam: Flags[] = [{}, { tam_left: 'door' }, { tam_left: 'door', a3_tamsin_dead: true }, { tam_left: 'reserve' }];
    const pl = (map: string, id: string) => MAPS[map].npcs!.find((p) => p.id === id)!.if as Cond;
    for (const f of states) for (const t of tam) {
      const a = game('truce', ALONE, { ...f, ...t });
      const tag = JSON.stringify({ ...f, ...t });
      expect(cond(trig('md_docks', 'a3_buffer').if, a.g), tag).toBe(cond(PLATFORM_OPEN, a.g));
      expect(cond(pl('md_docks', 'npc_c9_01_buffer'), a.g), tag).toBe(cond(PLATFORM_OPEN, a.g));
      expect(cond(pl('md_docks', 'npc_c9_03_buffer'), a.g), tag).toBe(cond(TAM_AT_BUFFER, a.g));
      expect(cond({ any: [pl('md_docks', 'npc_c9_03_carrick'), pl('md_docks', 'npc_c9_03_hulls')] }, a.g), tag).toBe(cond(TAM_IN_CARRICK, a.g));
      expect(cond(pl('c9_mouth', 'npc_c9_03_after'), a.g), tag).toBe(cond(TAM_AT_KNOCK_AFTER, a.g));
      expect(tamsins(a.g).length, tag).toBeLessThanOrEqual(1);
    }
  });

  it('a Nine hidden in the Hulls steps out of its hold once the Ledger\'s card has come (it walks in to the close, B6l)', () => {
    const a = game('truce', { at: 'md_docks', companions: { nine: 'waiting' } }, { a3_recall: 'hidden', a3_nine_hid: 'hulls' });
    expect(here('md_docks', a.g)).toContain('npc_md_nine_hulls');
    a.g.flags.a3_summoned = true;
    expect(here('md_docks', a.g)).not.toContain('npc_md_nine_hulls');
  });

  it('every node has a line for coming back to it (U7), or only leaves; the companions speak at the buffer', () => {
    const speakers = new Set<string>();
    const nodes: [string, { again?: unknown; options: { exit?: boolean }[]; interject?: { companion: string }[] }][] = [
      ...A3_AFTER_DIALOGUES.flatMap((d) => Object.entries(d.nodes)),
      ...Object.entries(MAUD_AFTER_NODES), ...Object.entries(CORIN_AFTER_NODES), ...Object.entries(LINNET_AFTER_NODES), ...Object.entries(GRILLE_AFTER_NODES),
      ...Object.values(KNOCK_R_AFTER).flatMap((r) => Object.entries(r.nodes)), ...Object.values(INSIDE_AFTER).flatMap((r) => Object.entries(r.nodes)),
    ];
    for (const [k, n] of nodes) {
      if (!n.options.every((o) => o.exit)) expect(n.again, k).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    }
    expect(Object.keys(DIALOGUES[P].nodes).length).toBeGreaterThanOrEqual(17);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
  });

  it('the flags are in the Act 3 registry; the quest has the platform\'s routes and stages; the content validates', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6k (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_c9_after', 'a3_buffer_how', 'a3_buffer_court', 'a3_buffer_watched', 'dk_prec_passenger', 'a3_mast_handle', 'a3_buffer_seen', 'a3_buffer_receipt', 'a3_buffer_asked',
      'a3k_maud', 'a3k_grille', 'a3k_hatch_seven', 'a3k_tam_line', 'a3_summoned', 'a3_buffer_post']) expect(block.includes(f), f).toBe(true);
    expect(QUESTS.q_a3_platform.routes!.map((r) => r.id)).toEqual(['harbour', 'stand', 'cradle']);
    expect(Object.keys(QUESTS.q_a3_platform.stages)).toEqual(['buffer', 'walked', 'went', 'held']);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|c9_mouth|md_docks|d_kn_|d_dk_|cistern9/.test(e))).toEqual([]);
  });
});
