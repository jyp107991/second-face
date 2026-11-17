import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { A3_RING_DIALOGUES, CARD_HELD, RING_CAN_SIT } from '../src/content/dialogue/a3_ring';
import { B_MEANS, INES_PREPARED, STRUCK_AS, STRUCK_CLAIMED, TAMSIN, TEAGUE_LEADS, modValue } from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner, type NodeDef } from '../src/engine/dialogue/dialogue';
import { skill } from '../src/engine/stats/sheet';
import type { SkillId } from '../src/engine/stats/rules';
import { test as cond } from '../src/engine/world/logic';
import { actThree, saveAndLoad, stage, status, talk, view, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6i — the ring: Cistern 9's council table once the player is inside. What the eight want; Tamsin's card and whether Ines
 * stands or falls with it; Ines telling the ring herself, or reading the replies' copy aloud; Pell's sixty charts and what
 * striking the reserve means by the Act 2 precedent (the trap with the guild at Knock); Bram's trunk (B's means); the vote
 * by its leader and the player's one speech; Teague's order to put MOTHER to sleep, and stopping it. Played headless with the
 * shared Act 3 fixture.
 */

const T = 'd_a3_council';
const SIT = '(Sit in the ninth chair.)';
const CARD = 'Tamsin. It\'s yours to tell';
const VOTE = '(Ask for the vote.)';
const GO = '(Go on.)';

/** Inside the Cistern for the first time (B6h's flags), the door unsettled. */
function inside(preset: Preset, over: Over = {}, flags: Record<string, string | boolean> = {}): A3 {
  const a = actThree(preset, over);
  a.g.pc.sheet.name = 'Halden';
  a.g.locationId = 'cistern9';
  Object.assign(a.g.flags, { a3_in_sallow: true, a3_at_knock: true, a3_inside: true, a3_in_how: 'hatch', ...flags });
  a.q.update();
  return a;
}
const runner = (a: A3) => new DialogueRunner(DIALOGUES[T], a.g, a.q);
const opts = (a: A3) => view(T, a.g, a.q).options.map((o) => o.text);
function go(r: DialogueRunner, a: A3, picks: string[]): DialogueRunner {
  for (const p of picks) {
    const o = r.view()?.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`no option "${p}" in [${r.view()?.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
  return r;
}
/** The ring sitting: the runner waits at the hub. */
const sit = (a: A3) => talk(T, a.g, a.q, [SIT]);
/** Tamsin plays her card; the runner waits where Ines stands or falls. */
const card = (a: A3) => go(sit(a), a, [CARD, GO, GO]);
function eff(g: G, k: SkillId, v: number): void {
  g.pc.sheet.skillBought[k] = 0;
  g.pc.sheet.skillBought[k] = v - skill(g.pc.sheet, k);
}
const node = (id: string): NodeDef => DIALOGUES[T].nodes[id];
/** The interjection the runtime would show on a node (U7): the first whose companion travels and whose condition holds. */
const said = (id: string, g: G) => node(id).interject?.find((i) => g.world.party.includes(i.companion) && cond(i.if, g));
const checkOf = (r: DialogueRunner, prefix: string) => r.view()!.options.find((o) => o.text.startsWith(prefix))!.checkLabel;

// ---------------------------------------------------------------- the table and the ring called

describe('B6i: the council table, and the ring called', () => {
  it('the table is a talk prop on the Cistern\'s map: a plain table until the player is inside; the ring sits while the door is unsettled', () => {
    expect(MAPS.cistern9.talk!.council_table).toEqual({ dialogue: T, name: 'The council table' });
    expect(MAPS.cistern9.props!.some((p) => p.id === 'council_table' && p.kind === 'table')).toBe(true);
    const eve = actThree('prepared', { point: 'eve' });
    expect(runner(eve).node).toBe('table');
    expect(view(T, eve.g, eve.q).options.every((o) => o.exit)).toBe(true);
    const home = actThree('prepared');
    expect(cond(RING_CAN_SIT, home.g)).toBe(false);
    expect(runner(home).node).toBe('table');
    const a = inside('prepared');
    expect(stage(a.g, 'q_a3_cistern')).toBe('inside');
    expect(cond(RING_CAN_SIT, a.g)).toBe(true);
    const v = view(T, a.g, a.q);
    expect(v.speaker).toBe('npc_c9_01');
    expect(v.text).toContain('assessor');
    a.g.flags.a3_c9 = 'sealed';
    expect(runner(a).node).toBe('after');
  });

  it('calling the ring: Ines convenes it; every lever is on the table; getting up and coming back resumes it', () => {
    const a = inside('prepared');
    const r = sit(a);
    expect(a.g.world.knowledge.a3_ring_called).toBe(true);
    expect(r.view()!.text).toContain('Ask what you need to ask');
    const o = r.view()!.options.map((x) => x.text);
    for (const t of ['(Let them say', 'Teague. Why weld it?', CARD, '(Put your copy', 'Ines. Tell them', 'Doc. The forms', 'Bram. Could she', VOTE, '(Get up.']) expect(o.some((x) => x.startsWith(t)), t).toBe(true);
    expect(o.some((x) => x.startsWith('Sayer.'))).toBe(false);
    expect(runner(a).node).toBe('hub');
  });

  it('round the table: what each of the eight wants; Sayer asked after; Effie\'s answer follows what the room knows', () => {
    const a = inside('prepared');
    const r = go(sit(a), a, ['(Let them say']);
    expect(r.view()!.text).toContain('go out and come back');
    expect(r.view()!.text).toContain('I\'d go with the column');
    expect(r.view()!.text).toContain('what continuity means');
    go(r, a, [GO, 'Sayer. Why the column?']);
    expect(r.view()!.speaker).toBe('npc_c9_r3');
    expect(r.view()!.text).toContain('a name for it before it names me');
    go(r, a, [GO, 'Teague. Why weld it?']);
    expect(r.view()!.text).toContain('held the lamp');
    const b = inside('prepared');
    const rb = go(sit(b), b, ['(Put your copy', GO, '(Let them say']);
    expect(rb.view()!.text).toContain('It meant no');
  });
});

// ---------------------------------------------------------------- Tamsin's card, and Ines

describe('B6i: Tamsin\'s card, and whether Ines stands or falls', () => {
  it('the card is Tamsin\'s to play: travelling, her secret kept or told to MOTHER', () => {
    const cases: [string, Over, boolean][] = [
      ['told MOTHER, travelling', {}, true],
      ['kept', { flags: { tam_secret: 'kept' } }, true],
      ['told Ines (hers to tell)', { flags: { tam_secret: 'ines' } }, false],
      ['never learned', { flags: { tam_secret: false } }, false],
      ['waiting elsewhere', { companions: { tamsin: 'waiting' } }, false],
    ];
    for (const [tag, over, on] of cases) {
      const a = inside('prepared', over);
      expect(cond(CARD_HELD, a.g), tag).toBe(on);
      sit(a);
      expect(opts(a).some((t) => t.startsWith(CARD)), tag).toBe(on);
    }
  });

  it('unready, Ines falls: MOTHER owns the hiding, the room turns to Ines, and Teague takes the head of the table', () => {
    const a = inside('prepared');
    expect(cond(INES_PREPARED, a.g)).toBe(false);
    const r = go(sit(a), a, [CARD]);
    expect(r.view()!.speaker).toBe(TAMSIN);
    expect(a.g.flags.a3_tam_card).toBe(true);
    go(r, a, [GO]);
    expect(r.view()!.speaker).toBe('npc_c9_05');
    expect(r.view()!.text).toContain('I am sorry I did not tell you');
    go(r, a, [GO]);
    expect(r.node).toBe('card_falls');
    expect(a.g.flags.a3_ines).toBe('falls');
    expect(cond(TEAGUE_LEADS, a.g)).toBe(true);
    go(r, a, [GO]);
    expect(r.view()!.text).toContain('Teague has Ines\'s chair');
    expect(a.g.world.memories.npc_c9_01.some((m) => m.tag === 'a3_fell')).toBe(true);
  });

  type Ready = [string, Over, Record<string, string | boolean>, string[], string];
  const ready: Ready[] = [
    ['the Archive promised', {}, { a3_archive_promise: true }, [], 'copy came home'],
    ['the Archive opened', {}, { a3_archive: 'open' }, [], 'since I opened the Archive'],
    ['the copy read aloud first', {}, {}, ['(Put your copy', GO], 'a quarter of an hour ago'],
    ['her own telling first', { skills: { speech: 70 } }, {}, ['Ines. Tell them', GO], 'I told you myself'],
  ];
  for (const [tag, over, flags, first, cue] of ready) {
    it(`ready, Ines stands with Tamsin: ${tag}`, () => {
      const a = inside('prepared', over, flags);
      const r = go(sit(a), a, [...first, CARD, GO, GO]);
      expect(r.node).toBe('card_stands');
      expect(r.view()!.text).toContain(cue);
      expect(a.g.flags.a3_ines).toBe('opens');
      expect(cond(TEAGUE_LEADS, a.g)).toBe(false);
    });
  }

  it('Ines falls only with the card: without it the vote finds her sealing or opening, never fallen', () => {
    const a = inside('prepared', { companions: { tamsin: 'waiting' } });
    go(sit(a), a, [VOTE]);
    expect(a.g.flags.a3_ines).toBe('seals');
    const b = inside('prepared', { companions: { tamsin: 'waiting' } }, { a3_archive: 'open' });
    go(sit(b), b, [VOTE]);
    expect(b.g.flags.a3_ines).toBe('opens');
    const c = inside('prepared', { flags: { tam_secret: 'ines' } });
    go(sit(c), c, [VOTE]);
    expect(c.g.flags.a3_ines).toBe('seals');
  });

  it('her own telling (Speech 50, by what she has seen and promised); a failed word closes her, and the card then breaks her', () => {
    const a = inside('hostile', {}, { a3_archive: 'sealed' });
    const r = sit(a);
    // hostile: nothing lowers it; the Archive sealed against the player +10
    expect(checkOf(r, 'Ines. Tell them')).toBe('Speech 60');
    const b = inside('prepared', {}, { a3_archive_promise: true, a3_faces: true });
    // promised −10, the faces −10, Knock's standing −5
    expect(checkOf(sit(b), 'Ines. Tell them')).toBe('Speech 25');
    eff(a.g, 'speech', 40);
    go(r, a, ['Ines. Tell them']);
    expect(r.node).toBe('ines_seals');
    expect(a.g.flags.a3_ines).toBe('seals');
    go(r, a, [GO]);
    expect(r.view()!.options.some((o) => o.text.startsWith('Ines. Tell them'))).toBe(false);
    go(r, a, [CARD, GO, GO]);
    expect(r.node).toBe('card_falls');
    expect(a.g.flags.a3_ines).toBe('falls');
  });

  it('with MOTHER burned the grille is dark, and the card still breaks an unready Ines', () => {
    const a = inside('prepared', {}, { a3_mother: 'burned', a3_archive: 'burned' });
    const r = talk(T, a.g, a.q);
    expect(r.view()!.text).toContain('hand pump');
    go(r, a, [SIT, CARD, GO]);
    expect(r.node).toBe('card_dark');
    expect(r.view()!.text).toContain('can\'t say sorry now');
    go(r, a, [GO]);
    expect(a.g.flags.a3_ines).toBe('falls');
  });

  it('Tamsin\'s other question: the two at the hatch, and who told; it lowers the open vote against Teague', () => {
    const a = inside('prepared');
    const r = card(a);
    go(r, a, [GO, '(Tamsin has another question']);
    expect(r.view()!.text).toContain('Rosalind told me');
    expect(a.g.world.knowledge.a3_ring_hatch).toBe(true);
    expect(a.g.world.memories.npc_c9_06.some((m) => m.tag === 'a3_named_informer')).toBe(true);
    go(r, a, [GO, VOTE]);
    const b = inside('prepared');
    const rb = go(card(b), b, [GO, VOTE]);
    const dc = (x: DialogueRunner) => Number(checkOf(x, 'Open it').split(' ')[1]);
    expect(dc(rb) - dc(r)).toBe(10);
  });
});

// ---------------------------------------------------------------- Pell's certificate

describe('B6i: Pell\'s sixty charts, read three ways', () => {
  const toChoose = (a: A3) => go(sit(a), a, ['Doc. The forms', GO, GO]);
  function readOf(a: A3): string {
    const r = go(sit(a), a, ['Doc. The forms', GO]);
    expect(r.node).toBe('pell_struck');
    return r.view()!.text;
  }

  it('the readings by the Court\'s ruling: heard (yields), nobody\'s (outside, or no ruling), salvage (property), and the trap with the guild at Knock', () => {
    const y = inside('prepared');
    expect(modValue(y.g, STRUCK_AS)).toBe('yields');
    expect(readOf(y)).toContain('the Court will hear them');
    const o = inside('choir');
    expect(modValue(o.g, STRUCK_AS)).toBe('outside');
    expect(readOf(o)).toContain('Nobody can protect it either');
    const u = inside('prepared', { flags: { prec_unrecorded: false } });
    expect(modValue(u.g, STRUCK_AS)).toBe('outside');
    expect(readOf(u)).toContain('Nobody has ever asked the Court');
    const p = inside('hostile');
    expect(modValue(p.g, STRUCK_AS)).toBe('property');
    expect(readOf(p)).toContain('first time a buyer reads the register');
    const t = inside('hostile', {}, { a3_guild_in: true });
    expect(modValue(t.g, STRUCK_AS)).toBe('claimed');
    expect(readOf(t)).toContain('a book of claims');
    expect(said('pell_struck', t.g)!.text).toContain('That\'s what it did to me');
    // Orme dead: no claim on the spot
    (t.g.npcs as Record<string, unknown>)['c9_mouth/npc_kn_factor_a3'] = { dead: true };
    expect(modValue(t.g, STRUCK_AS)).toBe('property');
  });

  it('unfit by Speech 40 (Tamsin\'s card and a burned MOTHER lower it); the trap is live when it is signed into', () => {
    const a = inside('hostile', {}, { a3_guild_in: true });
    let r = toChoose(a);
    expect(checkOf(r, 'Tick no.')).toBe('Speech 40');
    eff(a.g, 'speech', 40);
    go(r, a, ['Tick no.']);
    expect(r.node).toBe('pell_unfit');
    expect(a.g.flags.a3_pell).toBe('unfit');
    expect(r.view()!.text).toContain('who comes for them now');
    expect(cond(STRUCK_CLAIMED, a.g)).toBe(true);
    const b = inside('prepared', {}, { a3_mother: 'burned' });
    r = go(card(b), b, [GO, 'Doc. The forms', GO, GO]);
    expect(checkOf(r, 'Tick no.')).toBe('Speech 20');
  });

  it('no check for a clinic aide; the truth is fit (Sayer the one no)', () => {
    const a = inside('choir', { origin: 'clinic_aide' });
    const r = toChoose(a);
    expect(r.view()!.options.some((o) => o.text.startsWith('Tick no.'))).toBe(false);
    const aide = r.view()!.options.find((o) => o.text.startsWith('You taught me to splint'))!;
    expect(aide.checkLabel).toBe('');
    go(r, a, ['You taught me to splint']);
    expect(a.g.flags.a3_pell).toBe('unfit');
    const b = inside('choir');
    go(toChoose(b), b, ['Write what\'s true.']);
    expect(b.g.flags.a3_pell).toBe('fit');
    expect(view(T, b.g, b.q).text).not.toContain('What do I write');
  });

  it('a failed word is refused and final: nothing goes to the city, and the charts are not offered again', () => {
    const a = inside('hostile');
    eff(a.g, 'speech', 30);
    const r = go(toChoose(a), a, ['Tick no.']);
    expect(r.node).toBe('pell_refused');
    expect(a.g.flags.a3_pell).toBe('refused');
    go(r, a, [GO]);
    expect(r.view()!.options.some((o) => /^Doc\./.test(o.text))).toBe(false);
  });

  it('"not yet" leaves the charts pending at the ring and after it; once the door is settled they are not offered', () => {
    const a = inside('choir');
    const r = go(toChoose(a), a, ['(Not yet.)']);
    expect(r.view()!.options.some((o) => o.text.startsWith('Doc. The charts.'))).toBe(true);
    go(r, a, [VOTE, 'It\'s yours.', GO]);
    expect(r.node).toBe('after');
    expect(r.view()!.options.some((o) => o.text.startsWith('Doc. The charts.'))).toBe(true);
    a.g.flags.a3_c9 = 'sealed';
    expect(opts(a).some((t) => t.startsWith('Doc.'))).toBe(false);
  });
});

// ---------------------------------------------------------------- Bram

describe('B6i: Bram knows how a caretaker sleeps, and tells how the city\'s core is fed', () => {
  it('he won\'t put her to sleep; asked about the core, he tells (Speech 40, his letter −15): B\'s means with Mechanics 50', () => {
    const a = inside('prepared');
    eff(a.g, 'mechanics', 50);
    expect(cond(B_MEANS, a.g)).toBe(false);
    const r = go(sit(a), a, ['Bram. Could she']);
    expect(r.view()!.text).toContain('She kept Tamsin');
    expect(checkOf(r, 'Not her.')).toBe('Speech 25');
    go(r, a, ['Not her.']);
    expect(r.node).toBe('bram_trunk');
    expect(r.view()!.text).toContain('page forty-one');
    expect(a.g.flags.a3_bram_cut).toBe(true);
    expect(cond(B_MEANS, a.g)).toBe(true);
    eff(a.g, 'mechanics', 40);
    expect(cond(B_MEANS, a.g)).toBe(false);
  });

  it('a stranger\'s word fails and is spent, here and after the vote', () => {
    const a = inside('hostile');
    eff(a.g, 'speech', 30);
    const r = go(sit(a), a, ['Bram. Could she', 'Not her.']);
    expect(r.node).toBe('bram_no');
    expect(a.g.flags.a3_bram_cut).toBeUndefined();
    go(r, a, [GO]);
    expect(r.view()!.options.some((o) => o.text.startsWith('Bram.'))).toBe(false);
    go(r, a, [VOTE, 'It\'s yours.', GO]);
    expect(r.view()!.options.some((o) => o.text.startsWith('Bram.'))).toBe(false);
  });

  it('with MOTHER burned he still tells (they burned her: −10); never asked at the ring, he can be asked after the vote', () => {
    const a = inside('hostile', {}, { a3_mother: 'burned', a3_archive: 'burned' });
    const r = go(sit(a), a, ['Bram. You know how a caretaker is fed.']);
    expect(r.view()!.text).toContain('They brought oil');
    expect(checkOf(r, 'Not her.')).toBe('Speech 30');
    const b = inside('choir');
    const rb = go(sit(b), b, [VOTE, 'It\'s yours.', GO, 'Bram. Could a caretaker']);
    expect(rb.node).toBe('bram');
    go(rb, b, ['Not her.']);
    expect(b.g.flags.a3_bram_cut).toBe(true);
    expect(view(T, b.g, b.q).options.some((o) => o.text.startsWith('Bram.'))).toBe(false);
  });
});

// ---------------------------------------------------------------- the vote

describe('B6i: the vote, by its leader and the player\'s one speech', () => {
  it('under an Ines who has told them: open is her default ("It\'s yours"), and the quest moves on to the door', () => {
    const a = inside('prepared', {}, { a3_faces: true });
    const r = go(sit(a), a, ['(Put your copy', GO, VOTE]);
    expect(r.view()!.passives.map((p) => p.text).join(' ')).toContain('three times');
    const o = r.view()!.options;
    expect(o.find((x) => x.text.startsWith('Open it'))!.checkLabel).toBe('');
    expect(o.find((x) => x.text.startsWith('It\'s yours'))!.checkLabel).toBe('');
    // shut against her: 40 +10 faces +10 the refusals known
    expect(o.find((x) => x.text.startsWith('Keep the door shut'))!.checkLabel).toBe('Speech 60');
    go(r, a, ['It\'s yours.']);
    expect(a.g.flags.a3_ring).toBe('open');
    expect(a.g.flags.a3_ring_word).toBe('yours');
    expect(r.view()!.text).toContain('Seven');
    expect(stage(a.g, 'q_a3_cistern')).toBe('door');
    expect(status(a.g, 'q_a3_cistern')).toBe('active');
  });

  it('under a sealing Ines: sealed by default, never followed by an order to put MOTHER to sleep; open argued (Speech 50) and lost', () => {
    const a = inside('choir', { companions: { tamsin: 'waiting' } });
    const r = go(sit(a), a, [VOTE]);
    expect(checkOf(r, 'Open it')).toBe('Speech 50');
    go(r, a, ['It\'s yours.']);
    expect(a.g.flags.a3_ring).toBe('sealed');
    go(r, a, [GO]);
    expect(r.node).toBe('after');
    expect(a.g.flags.a3_mother).toBeUndefined();
    const b = inside('choir', { companions: { tamsin: 'waiting' } });
    eff(b.g, 'speech', 45);
    const rb = go(sit(b), b, [VOTE, 'Open it']);
    expect(b.g.flags.a3_ring).toBe('sealed');
    expect(b.g.flags.a3_ring_word).toBe('open');
    expect(rb.view()!.text).toContain('not enough to move them');
    const c = inside('choir', { companions: { tamsin: 'waiting' } });
    eff(c.g, 'speech', 50);
    go(sit(c), c, [VOTE, 'Open it']);
    expect(c.g.flags.a3_ring).toBe('open');
  });

  it('the city argued (Speech 55, by what they know): won to the column, or the leader\'s default', () => {
    const a = inside('choir', { companions: { tamsin: 'waiting' } });
    const r = go(sit(a), a, [VOTE]);
    // nothing known, no faces −10
    expect(checkOf(r, 'Go with the column')).toBe('Speech 45');
    eff(a.g, 'speech', 45);
    go(r, a, ['Go with the column']);
    expect(a.g.flags.a3_ring).toBe('city');
    expect(r.view()!.text).toContain('tell the captain');
    const b = inside('prepared', {}, { a3_faces: true });
    const rb = go(sit(b), b, ['(Put your copy', GO, VOTE]);
    // the refusals known +15
    expect(checkOf(rb, 'Go with the column')).toBe('Speech 70');
    eff(b.g, 'speech', 60);
    go(rb, b, ['Go with the column']);
    expect(b.g.flags.a3_ring).toBe('open');
    expect(b.g.flags.a3_ring_word).toBe('city');
  });

  it('under Teague: shut is hers; open (Speech 55) and the city (with her +15) are checks', () => {
    const a = inside('prepared');
    const r = go(card(a), a, [GO, VOTE]);
    expect(r.view()!.text).toContain('The designate may speak. Once.');
    expect(checkOf(r, 'Keep the door shut')).toBe('');
    // 55 −10 the refusals (the card) −5 the card
    expect(checkOf(r, 'Open it')).toBe('Speech 40');
    // 55 +15 refusals +10 card +15 Teague −10 no faces
    expect(checkOf(r, 'Go with the column')).toBe('Speech 85');
    eff(a.g, 'speech', 40);
    go(r, a, ['Open it']);
    expect(a.g.flags.a3_ring).toBe('open');
    expect(r.view()!.text).toContain('I\'ll hold the lamp');
    go(r, a, [GO]);
    expect(r.node).toBe('after');
    expect(a.g.flags.a3_mother).toBeUndefined();
  });
});

// ---------------------------------------------------------------- Teague's order to Bram

describe('B6i: Bram puts MOTHER to sleep only under Teague, and can be stopped', () => {
  function sealedUnderTeague(over: Over = {}, flags: Record<string, string | boolean> = {}): { a: A3; r: DialogueRunner } {
    const a = inside('prepared', over, flags);
    const r = go(card(a), a, [GO, VOTE, 'Keep the door shut']);
    expect(a.g.flags.a3_ring).toBe('sealed');
    go(r, a, [GO]);
    return { a, r };
  }

  it('the order follows a sealed vote under Teague; stopped (Speech 45, his letter −15, the card −10): MOTHER stays awake', () => {
    const { a, r } = sealedUnderTeague();
    expect(r.node).toBe('cut');
    expect(r.view()!.speaker).toBe('npc_c9_06');
    expect(r.view()!.text).toContain('page forty');
    expect(checkOf(r, 'Bram. Don\'t.')).toBe('Speech 20');
    go(r, a, ['Bram. Don\'t.']);
    expect(r.node).toBe('cut_stopped');
    expect(a.g.flags.a3_bram_stopped).toBe(true);
    expect(a.g.flags.a3_mother).toBeUndefined();
    go(r, a, [GO]);
    expect(r.node).toBe('after');
  });

  it('let, or the word fails: MOTHER asleep; after hearing him say he won\'t, the word is easier', () => {
    const { a, r } = sealedUnderTeague();
    go(r, a, ['(Say nothing.']);
    expect(r.node).toBe('cut_done');
    expect(a.g.flags.a3_mother).toBe('asleep');
    expect(view(T, a.g, a.q).text).toContain('click over the door does not come');
    const b = sealedUnderTeague();
    // his letter never carried: 45 −10 the card
    b.a.g.world.quests.q_a1_bram.status = 'active';
    expect(checkOf(b.r, 'Bram. Don\'t.')).toBe('Speech 35');
    eff(b.a.g, 'speech', 30);
    go(b.r, b.a, ['Bram. Don\'t.']);
    expect(b.r.node).toBe('cut_done');
    expect(b.r.view()!.text).toContain('It nearly works');
    expect(b.a.g.flags.a3_mother).toBe('asleep');
    const c = inside('prepared');
    go(sit(c), c, ['Bram. Could she', GO]);
    const rc = go(talk(T, c.g, c.q), c, [CARD, GO, GO, GO, VOTE, 'Keep the door shut', GO]);
    expect(rc.view()!.options.find((o) => o.text.startsWith('Bram. You told me you won\'t'))!.checkLabel).toBe('Speech 10');
  });

  it('never under Ines; never with MOTHER burned', () => {
    const a = inside('prepared', {}, { a3_archive_promise: true });
    const r = go(card(a), a, [GO, VOTE, 'Keep the door shut', GO]);
    expect(a.g.flags.a3_ring).toBe('sealed');
    expect(r.node).toBe('after');
    const b = inside('prepared', {}, { a3_mother: 'burned', a3_archive: 'burned' });
    const rb = go(card(b), b, [GO, VOTE, 'Keep the door shut', GO]);
    expect(b.g.flags.a3_ines).toBe('falls');
    expect(rb.node).toBe('after');
    expect(b.g.flags.a3_mother).toBe('burned');
  });
});

// ---------------------------------------------------------------- saves, the trees, the content

describe('B6i: saves, the tree and the content', () => {
  it('a save mid-ring resumes the ring as it stood; a save after the vote keeps every outcome', async () => {
    const a = inside('prepared');
    card(a);
    const mid = await saveAndLoad(a.g);
    expect(mid.g.flags.a3_tam_card).toBe(true);
    expect(mid.g.flags.a3_ines).toBe('falls');
    expect(new DialogueRunner(DIALOGUES[T], mid.g, mid.q).node).toBe('hub');
    expect(view(T, mid.g, mid.q).text).toContain('Teague has Ines\'s chair');
    expect(view(T, mid.g, mid.q).options.some((o) => o.text.startsWith(CARD))).toBe(false);
    const r = go(talk(T, mid.g, mid.q), mid, ['Bram. Could she', 'Not her.', GO, 'Doc. The forms', GO, GO, 'Tick no.', GO, VOTE, 'Keep the door shut', GO, '(Say nothing.', GO]);
    expect(r.node).toBe('after');
    const end = await saveAndLoad(mid.g);
    for (const [k, v] of Object.entries({ a3_tam_card: true, a3_ines: 'falls', a3_bram_cut: true, a3_pell: 'unfit', a3_ring: 'sealed', a3_ring_word: 'shut', a3_mother: 'asleep' })) expect(end.g.flags[k], k).toBe(v);
    end.q.update();
    expect(stage(end.g, 'q_a3_cistern')).toBe('door');
    expect(new DialogueRunner(DIALOGUES[T], end.g, end.q).node).toBe('after');
  });

  it('every node has a line for coming back to it (U7), or only leaves; all seven companions speak', () => {
    const speakers = new Set<string>();
    for (const d of A3_RING_DIALOGUES) for (const [k, n] of Object.entries(d.nodes)) {
      if (!n.options.every((o) => o.exit)) expect(n.again, `${d.id}/${k}`).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    }
    expect(Object.keys(node('hub') && DIALOGUES[T].nodes).length).toBeGreaterThanOrEqual(30);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
  });

  it('the flags are in the Act 3 registry; the content validates', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6i (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['a3_tam_card', 'a3_ines', 'a3_pell', 'a3_bram_cut', 'a3_ring ', 'a3_ring_word', 'a3_mother', 'a3_bram_stopped', 'a3_ring_called', 'a3_ring_hatch', 'a3_pell_struck', 'a3_trunk']) expect(block.includes(f), f).toBe(true);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|cistern9|council/.test(e))).toEqual([]);
  });
});
