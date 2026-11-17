import { describe, expect, it } from 'vitest';
import { DIALOGUES, MAPS } from '../src/content';
import { KES_GUILD_START, ROM_ON, WAY_HELD, WREN_GUILD_START, d_a3_fire } from '../src/content/dialogue/a3_fire';
import { COMPANIONS, COMPANION_KEYS, ILYA, KES, KES_NUMBED, ON_SIDE, TAMSIN, WITH_YOU, WREN } from '../src/content/world/a3_conds';
import type { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { test as cond, type Effect } from '../src/engine/world/logic';
import { actThree, hour, options, saveAndLoad, talk, view, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6n — Last nights I: the fire at the Spire's close the night before the steps. The hub (lit once the Ledger's card has
 * come; laid by day, waited for till dark; who is at it), and the scenes of Tamsin, Wren, Ilya and Kes: what each thinks is
 * possible (read from what the player holds), what each cannot walk beside, and the romance's last step by every state
 * (committed, one step short, unfinished, ended by the count or the list, closed by another's commitment) or the last
 * night as friends. The red line at the first Act 3 fire: Wren and Kes leave after a guild night they were not at, in their
 * own trees or at this fire. Nobody gone is at the fire. Played headless from the shared Act 3 fixture.
 */

const SP = 'md_spire';
/** Act 3, the Ledger's card come, standing on the close at nine at night. */
const fire = (preset: Preset = 'prepared', over: Over = {}, h = 21): A3 => {
  const a = actThree(preset, { ...over, at: SP });
  a.g.flags.a3_summoned = true;
  hour(a.g, h);
  a.q.update();
  return a;
};
const appr = (g: G, id: string) => g.world.approval[id] ?? 0;
const sits = (a: A3) => options('d_a3_fire', a.g, a.q).filter((t) => t.startsWith('(Sit by'));
/** Sit by someone at the fire and follow the picks. */
const sit = (a: A3, who: string, picks: string[] = []): DialogueRunner => talk('d_a3_fire', a.g, a.q, [`(Sit by ${who}.)`, ...picks]);
const at = (r: DialogueRunner) => r.node;
/** Walk the ways a companion talks through, from the opener: the node ids visited in order. */
function ways(a: A3, who: string, ask: string, more: string): string[] {
  const r = sit(a, who, [ask]);
  const seen = [r.node!];
  for (let i = 0; i < 10; i++) {
    const v = r.view()!;
    const go = v.options.find((o) => o.text === more);
    if (!go) { r.choose(v.options.find((o) => o.text === '(That\'s all of it.)')!.id); break; }
    r.choose(go.id);
    seen.push(r.node!);
  }
  return seen;
}

// ---------------------------------------------------------------- the fire, before and when it is lit

describe('B6n: the fire at the foot of the steps', () => {
  it('is a works barrel on the close from the start (the generator\'s prop), cold and nobody\'s until the Ledger\'s card comes', () => {
    expect(MAPS[SP].talk!.a3_fire).toEqual({ dialogue: 'd_a3_fire', name: 'A fire barrel' });
    const p = MAPS[SP].props!.find((x) => x.id === 'a3_fire')!;
    expect([p.kind, p.x, p.y]).toEqual(['fire_barrel', 29, 28]);
    const a = actThree('prepared', { at: SP });
    hour(a.g, 21);
    const r = talk('d_a3_fire', a.g, a.q);
    expect(at(r)).toBe('cold');
    expect(r.view()!.options.map((o) => o.text)).toEqual(['(Leave it.)']);
    a.g.flags.a3_pnr = true;
    a.g.flags.a3_summoned = true;
    expect(at(talk('d_a3_fire', a.g, a.q))).toBe('out');
  });

  it('by day it is laid for tonight; waiting by it brings the dark and the people at it, and sleeping there brings the morning', () => {
    const a = fire('prepared', {}, 10);
    const r = talk('d_a3_fire', a.g, a.q);
    expect(at(r)).toBe('day');
    expect(r.view()!.text).toContain('coats and packs');
    r.choose(r.view()!.options.find((o) => o.text.startsWith('(Sit down by it'))!.id);
    expect(at(r)).toBe('hub');
    expect((a.g.minutes % 1440) / 60).toBe(20);
    expect(r.view()!.options.map((o) => o.text)).toEqual(expect.arrayContaining(['(Sit by Tamsin.)', '(Sit by Wren.)', '(Sit by Ilya.)', '(Sit by Kes.)']));
    const s = talk('d_a3_fire', a.g, a.q, ['(Sleep by the fire.']);
    expect(s.ended).toBe(true);
    expect((a.g.minutes % 1440) / 60).toBe(7);
  });

  it('everyone still with the player has a place at it, travelling or gathered; nobody gone, left, broken or hunting is there', () => {
    expect(sits(fire('prepared'))).toEqual(['(Sit by Tamsin.)', '(Sit by Wren.)', '(Sit by Ilya.)', '(Sit by Kes.)', '(Sit by Odile.)', '(Sit by Ash.)', '(Sit by Nine.)']);
    // the worst Act 2: Tamsin alone of these four (Ilya left, the others never met)
    expect(sits(fire('hostile'))).toEqual(['(Sit by Tamsin.)']);
    const nobody = fire('prepared', { companions: 'nobody' });
    expect(sits(nobody)).toEqual([]);
    expect(view('d_a3_fire', nobody.g, nobody.q).text).toContain('nobody at it but you');
    expect(sits(fire('prepared', { companions: 'estranged' }))).toEqual([]);
    // Tamsin broken in Act 2 left the party without tam_left: ON_SIDE still counts her, the fire does not
    const broken = fire('prepared', { flags: { tam_broken: true } });
    broken.g.world.party = broken.g.world.party.filter((id) => id !== TAMSIN);
    expect([cond(ON_SIDE('tamsin'), broken.g), cond(WITH_YOU('tamsin'), broken.g)]).toEqual([true, false]);
    expect(sits(broken)).not.toContain('(Sit by Tamsin.)');
    // Ilya hunting Kade alone, Kes gone back to the Shift for good, Wren hanged
    const away = fire('prepared', { flags: { ilya_left: 'spared', kes_left: 'rafe', wren_hanged: true, wren_left: 'hanged' } });
    expect(sits(away)).toEqual(['(Sit by Tamsin.)', '(Sit by Odile.)', '(Sit by Ash.)', '(Sit by Nine.)']);
  });
});

// ---------------------------------------------------------------- what they think is possible

describe('B6n: what each thinks is possible, read from what the player holds and never named', () => {
  it('with nothing held but the sash, each says only the two ways that are always there', () => {
    const a = fire('prepared', { flags: { ar_verdict: 'refused' } });
    expect(cond(WAY_HELD.amendment, a.g)).toBe(false);
    expect(ways(a, 'Tamsin', 'Tomorrow. What do you think', '(Go on.)')).toEqual(['tam_w_plan']);
    expect(ways(a, 'Wren', 'Tomorrow. What roads', '(Go on.)')).toEqual(['wren_w_plan']);
  });

  it('with every way held, the chain visits each in order; Ilya counts them, and his numbers follow what is held', () => {
    const all = (): A3 => {
      const a = fire('prepared', { items: ['k_a3_charge', 'k_a3_transfer'], flags: { a3_concern_terms: 'accepted', a3_mast: 'raised' } });
      for (const w of ['plan', 'unwritten', 'concern', 'opensky', 'amendment'] as const) expect(cond(WAY_HELD[w], a.g), w).toBe(true);
      return a;
    };
    const full = ['w_plan', 'w_unwritten', 'w_concern', 'w_opensky', 'w_amendment'];
    expect(ways(all(), 'Kes', 'Tomorrow. What can I', '(Go on.)')).toEqual(full.map((n) => `kes_${n}`));
    const a = all();
    const r = sit(a, 'Ilya', ['Count tomorrow for me.']);
    const said: string[] = [r.view()!.text];
    while (r.view()!.options.some((o) => o.text === '(Let him count.)')) { r.choose(r.view()!.options.find((o) => o.text === '(Let him count.)')!.id); said.push(r.view()!.text); }
    expect(said.map((t) => t.match(/^"(\w+)\./)?.[1])).toEqual(['One', 'Three', 'Four', 'Five', 'Six']);
    // the means named are the ones held: the charge in the pack
    expect(said[1]).toContain('powder');
    // without the Concern's paper and the hill, the amendment is his fourth
    const b = fire('prepared', { items: ['k_a3_charge'] });
    const r2 = sit(b, 'Ilya', ['Count tomorrow for me.', '(Let him count.)', '(Let him count.)']);
    expect(at(r2)).toBe('ilya_w_amendment');
    expect(r2.view()!.text).toMatch(/^"Four\./);
  });

  it('the hill speaking wide without a reader is halfway: said as such, not as a way', () => {
    const a = fire('prepared', { flags: { a3_mast: 'raised' }, companions: { nine: 'waiting' }, skills: { science: 30 } });
    expect([cond(WAY_HELD.opensky, a.g), cond(WAY_HELD.part, a.g)]).toEqual([false, true]);
    const seen = ways(a, 'Wren', 'Tomorrow. What roads', '(Go on.)');
    expect(seen).toEqual(['wren_w_plan', 'wren_w_part', 'wren_w_amendment']);
    expect(DIALOGUES.d_a3_fire.nodes.wren_w_part.text).toContain('reads the city\'s hand');
  });

  it('B\'s means are named by where they came from: Petra\'s people, the Choir, Ash, the charge, Bram\'s trunk', () => {
    const t = (over: Over) => { const a = fire('prepared', over); return sit(a, 'Tamsin', ['Tomorrow. What do you think', '(Go on.)']).view()!.text; };
    expect(t({ flags: { a3_unwritten: 'with_you' } })).toContain('Petra');
    expect(t({ alliance: 'choir' })).toContain('Choir');
    expect(t({ companions: { ash: 'party' } })).toContain('Ash would hold the door');
    expect(t({ items: ['k_a3_charge'] })).toContain('powder');
    expect(t({ flags: { a3_bram_cut: true } })).toContain('Bram');
  });
});

// ---------------------------------------------------------------- what they cannot walk beside

describe('B6n: each says plainly what they cannot walk beside tomorrow, and the player\'s answer is remembered', () => {
  it('Tamsin: the door is the chair\'s first act if it is only sealed; a word, an honest no-promise, or "mine to decide"', () => {
    const a = fire('prepared', { flags: { a3_c9: 'sealed' } });
    const r = sit(a, 'Tamsin', ['What couldn\'t you stand']);
    expect(r.view()!.text).toContain('the first paper under it is the door');
    const before = appr(a.g, TAMSIN);
    r.choose(r.view()!.options.find((o) => o.text.startsWith('I won\'t. You have my word.'))!.id);
    expect([a.g.flags.a3_tamsin_word, appr(a.g, TAMSIN) - before]).toEqual([true, 3]);
    // stayed on consent by the Court, or opened: the door is not hers to fear
    const b = fire('prepared', { flags: { a3_c9: 'opened' } });
    expect(sit(b, 'Tamsin', ['What couldn\'t you stand']).view()!.text).toContain('Don\'t count people');
    const c = fire('prepared', { flags: { a3_c9: 'sealed', ca_reserve: 'stayed' } });
    const rc = sit(c, 'Tamsin', ['What couldn\'t you stand']);
    expect(rc.view()!.text).not.toContain('first paper');
    const cb = appr(c.g, TAMSIN);
    rc.choose(rc.view()!.options.find((o) => o.text.startsWith('That\'s mine to decide'))!.id);
    expect([c.g.flags.a3_tamsin_word, appr(c.g, TAMSIN) - cb]).toEqual([undefined, -3]);
    // the line is said once: it is not offered again
    expect(sit(c, 'Tamsin').view()!.options.map((o) => o.text)).not.toContain('What couldn\'t you stand to see me do?');
  });

  it('Wren: the Concern, and the rope while it is still on the board; Ilya: the chair; Kes: the eyes', () => {
    const open = fire('prepared', { flags: { wren_rope: false } });
    expect(sit(open, 'Wren', ['What won\'t you walk beside?']).view()!.text).toContain('R31');
    const broke = fire('prepared');
    const rw = sit(broke, 'Wren', ['What won\'t you walk beside?']);
    expect(rw.view()!.text).not.toContain('R31');
    rw.choose(rw.view()!.options.find((o) => o.text.startsWith('I won\'t sell it. My word.'))!.id);
    expect(broke.g.flags.a3_wren_word).toBe(true);
    const i = fire('prepared');
    expect(sit(i, 'Ilya', ['What would make you go?']).view()!.text).toContain('sit in its chair');
    const k = fire('prepared');
    const rk = sit(k, 'Kes', ['What would you walk out over?']);
    expect(rk.view()!.text).toContain('Hand them the eyes');
    const before = appr(k.g, KES);
    rk.choose(rk.view()!.options.find((o) => o.text.startsWith('That\'s not your call'))!.id);
    expect(appr(k.g, KES) - before).toBe(-3);
  });
});

// ---------------------------------------------------------------- Tamsin's last night

describe('B6n: Tamsin\'s last night by romance state', () => {
  const tam = (flags: Record<string, string | number | boolean>) => fire('prepared', { flags: { romance_partner: flags.tam_romance === 'open' || flags.tam_romance === 'together' ? TAMSIN : false, ...flags } });

  it('together: "what are we, after?" — together, not yet, or not waiting on it; her after is pictured by where the Act left her', () => {
    const shale = tam({ tam_romance: 'together', a3_shale: 'free', ks_ada: 'stays' });
    const r = sit(shale, 'Tamsin', ['After the steps. What are we?']);
    expect(r.view()!.text).toContain('Deputy');
    r.choose(r.view()!.options.find((o) => o.text.startsWith('Together.'))!.id);
    expect(shale.g.flags).toMatchObject({ a3_tamsin_last: 'together', a3_tamsin_night: true, tam_romance: 'together', romance_partner: TAMSIN });
    expect(sits(shale)).toEqual(expect.arrayContaining(['(Sit by Tamsin.)']));
    expect(options('d_a3_fire', shale.g, shale.q)).toContain('(Sit by Tamsin.)');
    const wheel = tam({ tam_romance: 'together' });
    expect(sit(wheel, 'Tamsin', ['After the steps.']).view()!.text).toContain('Sefa');
    const knock = tam({ tam_romance: 'together', a3_c9: 'opened' });
    knock.g.world.membership = {};
    expect(sit(knock, 'Tamsin', ['After the steps.']).view()!.text).toContain('a door that opens');
    const unsure = tam({ tam_romance: 'together' });
    sit(unsure, 'Tamsin', ['After the steps.', 'I don\'t know yet.']);
    expect([unsure.g.flags.a3_tamsin_last, unsure.g.flags.a3_tamsin_night, unsure.g.flags.tam_romance]).toEqual([undefined, true, 'together']);
    const no = tam({ tam_romance: 'together' });
    const before = appr(no.g, TAMSIN);
    sit(no, 'Tamsin', ['After the steps.', 'I don\'t know what I\'ll be']);
    expect(no.g.flags).toMatchObject({ a3_tamsin_last: 'apart', tam_romance: 'stopped', romance_partner: false });
    expect(appr(no.g, TAMSIN)).toBe(before);
  });

  it('open (the riddle answered, never the rain): she asks anyway — yes leads to "after", not tonight waits, no is an answer', () => {
    const yes = tam({ tam_romance: 'open' });
    const r = sit(yes, 'Tamsin', ['(Sit closer.)', 'Yes.']);
    expect(yes.g.flags.tam_romance).toBe('together');
    r.choose(r.view()!.options[0].id);
    expect(at(r)).toBe('tam_r3');
    const not = tam({ tam_romance: 'open' });
    sit(not, 'Tamsin', ['(Sit closer.)', 'Not tonight']);
    expect(not.g.flags).toMatchObject({ tam_r2_later: true, a3_tamsin_night: true, tam_romance: 'open' });
    expect(not.g.flags.a3_tamsin_last).toBeUndefined();
    const no = tam({ tam_romance: 'open' });
    sit(no, 'Tamsin', ['(Sit closer.)', 'No, Tam.']);
    expect(no.g.flags).toMatchObject({ tam_romance: 'declined', romance_partner: false, a3_tamsin_last: 'apart' });
  });

  it('no romance: the Grille, the last night as friends; two lies: the list comes first, and ends a romance', () => {
    const friend = fire('prepared');
    sit(friend, 'Tamsin', ['We\'re still the Grille', '(Listen till she runs out.)']);
    expect(friend.g.flags.a3_tamsin_last).toBe('none');
    const listed = tam({ tam_romance: 'together', tam_lies: 2 });
    const r = sit(listed, 'Tamsin');
    expect(at(r)).toBe('tam_list_r');
    expect(listed.g.flags).toMatchObject({ tam_listed: true, tam_romance: 'ended', romance_partner: false, a3_tamsin_last: 'apart' });
    r.choose(r.view()!.options[0].id);
    expect(at(r)).toBe('tam');
    expect(r.view()!.options.map((o) => o.text)).not.toContain('After the steps. What are we?');
    const listedFriend = fire('prepared', { flags: { tam_lies: 3 } });
    expect(at(sit(listedFriend, 'Tamsin'))).toBe('tam_list');
    expect(listedFriend.g.flags.a3_tamsin_last).toBeUndefined();
  });
});

// ---------------------------------------------------------------- Wren's last night

describe('B6n: Wren\'s last night by romance state', () => {
  const wren = (rom: string, extra: Record<string, string | number | boolean> = {}) => fire('prepared', { flags: { wren_rom: rom, romance_partner: rom === 'committed' ? WREN : false, ...extra } });

  it('committed: "still the stop?" — tonight and after, or not on my account (the rope said aloud while it is open)', () => {
    const yes = wren('committed', { wren_rope: false });
    const r = sit(yes, 'Wren', ['A route or a stop.']);
    expect(r.view()!.text).toContain('R31');
    r.choose(r.view()!.options.find((o) => o.text.startsWith('Tonight, and after.'))!.id);
    expect(yes.g.flags).toMatchObject({ a3_wren_last: 'together', wren_rom: 'committed', romance_partner: WREN });
    const no = wren('committed');
    sit(no, 'Wren', ['A route or a stop.', 'Don\'t stop for me']);
    expect(no.g.flags).toMatchObject({ a3_wren_last: 'apart', wren_rom: 'no', romance_partner: false });
  });

  it('the roof had, the route or the stop not asked: her r3 at the fire commits, or a kind no', () => {
    const yes = wren('roof');
    sit(yes, 'Wren', ['(Sit with your shoulder', 'It\'s a stop.']);
    expect(yes.g.flags).toMatchObject({ wren_rom: 'committed', romance_partner: WREN, a3_wren_last: 'together' });
    const no = wren('roof');
    sit(no, 'Wren', ['(Sit with your shoulder', 'It isn\'t that']);
    expect(no.g.flags).toMatchObject({ wren_rom: 'no', a3_wren_last: 'apart' });
  });

  it('one step short of the roof: the scaffold on the steps, the dream said aloud, then the route or the stop before light', () => {
    for (const rom of ['yes', 'later_roof']) {
      const a = wren(rom);
      const before = appr(a.g, WREN);
      const r = sit(a, 'Wren', ['(Follow her eyes', 'I want that.']);
      expect(a.g.flags.wren_rom).toBe('roof');
      expect(appr(a.g, WREN) - before).toBe(10);
      expect(r.view()!.text).toContain('R30');
      r.choose(r.view()!.options[0].id);
      expect(at(r)).toBe('wren_r3');
      r.choose(r.view()!.options.find((o) => o.text === 'It\'s a stop.')!.id);
      expect(a.g.flags).toMatchObject({ wren_rom: 'committed', a3_wren_last: 'together' });
    }
    const not = wren('yes');
    sit(not, 'Wren', ['(Follow her eyes', 'Not tonight']);
    expect(not.g.flags).toMatchObject({ wren_rom: 'yes', a3_wren_night: true });
    expect(not.g.flags.a3_wren_last).toBeUndefined();
    const no = wren('yes');
    sit(no, 'Wren', ['(Follow her eyes', 'No, Wren.']);
    expect(no.g.flags).toMatchObject({ wren_rom: 'no', a3_wren_last: 'apart' });
  });

  it('her count at 30 or below ends it first; a romance committed elsewhere closes hers kindly; no romance: the long version of the roads', () => {
    const low = wren('committed', {});
    low.g.world.approval[WREN] = 25;
    const r = sit(low, 'Wren');
    expect(at(r)).toBe('wren_rom_end');
    expect(low.g.flags).toMatchObject({ wren_rom: 'ended', a3_wren_last: 'apart' });
    r.choose(r.view()!.options[0].id);
    expect(low.g.flags.romance_partner).toBe(false);
    expect(at(r)).toBe('wren');
    const other = fire('prepared', { flags: { wren_rom: 'yes', ilya_rom: 'committed', romance_partner: ILYA, ilya_sober_days: 60 } });
    sit(other, 'Wren', ['(Sit with her.)']);
    expect(other.g.flags).toMatchObject({ wren_rom: 'no', a3_wren_last: 'apart', romance_partner: ILYA });
    const friend = fire('prepared', { flags: { nb_sable_outcome: 'freed' } });
    const f = sit(friend, 'Wren', ['(Sit with her and watch']);
    expect(f.view()!.text).toContain('The girl wrote');
    f.choose(f.view()!.options[0].id);
    expect(friend.g.flags.a3_wren_last).toBe('none');
  });
});

// ---------------------------------------------------------------- Ilya's last night

describe('B6n: Ilya\'s last night by romance state (only sober; a well, never a pipe)', () => {
  const ilya = (rom: string, sober = 60) => fire('prepared', { flags: { ilya_rom: rom, ilya_sober_days: sober, romance_partner: rom === 'committed' ? ILYA : false } });

  it('committed: a well in the after, or don\'t count on it; the well had: his r3 at the fire', () => {
    const yes = ilya('committed');
    sit(yes, 'Ilya', ['If there\'s an after.', 'There\'s a well in it.']);
    expect(yes.g.flags).toMatchObject({ a3_ilya_last: 'together', ilya_rom: 'committed' });
    const no = ilya('committed');
    sit(no, 'Ilya', ['If there\'s an after.', 'Don\'t count on an after']);
    expect(no.g.flags).toMatchObject({ a3_ilya_last: 'apart', ilya_rom: 'no', romance_partner: false });
    const well = ilya('well');
    sit(well, 'Ilya', ['(Sit on the step beside him', 'It\'s that.']);
    expect(well.g.flags).toMatchObject({ ilya_rom: 'committed', romance_partner: ILYA, a3_ilya_last: 'together' });
  });

  it('no well yet: not here, not in a city that counts its water; ask at a well before the steps (nothing is lost)', () => {
    for (const rom of ['yes', 'later_well']) {
      const a = ilya(rom);
      const r = sit(a, 'Ilya', ['(Sit on the step beside him']);
      expect(at(r)).toBe('ilya_nowell');
      expect(r.view()!.text).toContain('Shale has a well');
      expect(a.g.flags).toMatchObject({ ilya_rom: rom, a3_ilya_night: true });
      expect(a.g.flags.a3_ilya_last).toBeUndefined();
      // his own tree's well, at a camp in Shale, still holds the next step
      a.g.locationId = 'shale';
      a.g.world.party.push(ILYA);
      a.g.flags.at_camp = true;
      expect(options('d_sh_ilya', a.g, a.q).length).toBeGreaterThan(0);
    }
  });

  it('counting from one: not while; his count at 30 or below ends it; committed elsewhere: "somebody else counts with you"; or count with him', () => {
    // the opener's count: a relapse says so; a count never begun does not
    const relapsed = fire('prepared', { flags: { ilya_relapse: true, ilya_sober_days: 4 } });
    expect(sit(relapsed, 'Ilya').view()!.text).toContain('Starting again counts');
    expect(sit(fire('prepared'), 'Ilya').view()!.text).not.toContain('Starting again');
    const counting = ilya('yes', 10);
    expect(at(sit(counting, 'Ilya', ['(Sit on the step beside him']))).toBe('ilya_counting');
    expect(counting.g.flags.ilya_rom).toBe('yes');
    const low = ilya('committed');
    low.g.world.approval[ILYA] = 30;
    expect(at(sit(low, 'Ilya'))).toBe('ilya_rom_end');
    expect(low.g.flags).toMatchObject({ ilya_rom: 'ended', a3_ilya_last: 'apart' });
    const other = fire('prepared', { flags: { ilya_rom: 'yes', ilya_sober_days: 60, kes_rom: 'committed', romance_partner: KES } });
    sit(other, 'Ilya', ['(Sit with him.)']);
    expect(other.g.flags).toMatchObject({ ilya_rom: 'no', a3_ilya_last: 'apart', romance_partner: KES });
    const friend = fire('prepared', { flags: { ilya_after: 'shale' } });
    const f = sit(friend, 'Ilya', ['(Sit with him. Let him count.)']);
    expect(f.view()!.text).toContain('Ada\'d have me back');
    f.choose(f.view()!.options[0].id);
    expect(friend.g.flags.a3_ilya_last).toBe('none');
  });
});

// ---------------------------------------------------------------- Kes's last night

describe('B6n: Kes\'s last night by romance state, and what slack means now', () => {
  const kes = (rom: string, extra: Record<string, string | number | boolean> = {}) => fire('prepared', { flags: { kes_rom: rom, romance_partner: rom === 'committed' ? KES : false, ...extra } });

  it('committed: still a thing tomorrow, or no promise of an after; the dark hour had: "are we a thing?"', () => {
    const yes = kes('committed');
    sit(yes, 'Kes', ['Tomorrow. Are we still a thing?', 'Still what I want.']);
    expect(yes.g.flags).toMatchObject({ a3_kes_last: 'together', kes_rom: 'committed' });
    const no = kes('committed');
    sit(no, 'Kes', ['Tomorrow. Are we still a thing?', 'I can\'t promise']);
    expect(no.g.flags).toMatchObject({ a3_kes_last: 'apart', kes_rom: 'no', romance_partner: false });
    const dark = kes('dark');
    sit(dark, 'Kes', ['(Sit on the step beside her.)', 'We\'re a thing.']);
    expect(dark.g.flags).toMatchObject({ kes_rom: 'committed', romance_partner: KES, a3_kes_last: 'together' });
  });

  it('one step short: the dark hour (or the scar, if the link was cut), then the question before the hour is up', () => {
    const kept = kes('yes', { kes_link: 'kept' });
    const r = sit(kept, 'Kes', ['(Sit on the step beside her.)']);
    expect(r.view()!.text).toContain('That\'s my hour');
    const cut = kes('later_dark', { kes_link: 'cut' });
    expect(sit(cut, 'Kes', ['(Sit on the step beside her.)']).view()!.text).toContain('steal an hour');
    const yes = kes('yes');
    const y = sit(yes, 'Kes', ['(Sit on the step beside her.)', 'I want to.', '(Let her say it.)']);
    expect(at(y)).toBe('kes_r3');
    expect(yes.g.flags.kes_rom).toBe('dark');
    y.choose(y.view()!.options.find((o) => o.text.startsWith('We\'re a thing'))!.id);
    expect(yes.g.flags).toMatchObject({ kes_rom: 'committed', a3_kes_last: 'together' });
    const not = kes('yes');
    sit(not, 'Kes', ['(Sit on the step beside her.)', 'Not tonight']);
    expect(not.g.flags).toMatchObject({ kes_rom: 'yes', a3_kes_night: true });
    const no = kes('yes');
    sit(no, 'Kes', ['(Sit on the step beside her.)', 'I don\'t want this']);
    expect(no.g.flags).toMatchObject({ kes_rom: 'no', a3_kes_last: 'apart' });
  });

  it('slack by her link (cut, cut with fits, dark, kept); numbed at Knock, her hand goes to her neck; her count ends it; or the gardens', () => {
    const say = (flags: Record<string, string | boolean>) => { const a = fire('prepared', { flags }); return sit(a, 'Kes', ['Slack.']).view()!.text; };
    expect(say({ kes_link: 'cut' })).toContain('just wind');
    expect(say({ kes_link: 'cut', kes_fits: true })).toContain('fits');
    expect(say({ kes_link: 'dark' })).toContain('I\'m dark');
    expect(say({ kes_link: 'kept' })).toContain('an hour a night');
    const numbed = fire('prepared', { flags: { a3_kes_numbed: true } });
    expect(cond(KES_NUMBED, numbed.g)).toBe(true);
    expect(sit(numbed, 'Kes').view()!.text).toMatch(/^Kes is on the lowest step.*since Knock/);
    expect(sit(fire('prepared'), 'Kes').view()!.text).not.toContain('since Knock');
    const low = kes('dark');
    low.g.world.approval[KES] = 20;
    expect(at(sit(low, 'Kes'))).toBe('kes_rom_end');
    expect(low.g.flags).toMatchObject({ kes_rom: 'ended', a3_kes_last: 'apart' });
    const friend = fire('prepared');
    sit(friend, 'Kes', ['(Sit and let her talk', '(Let her run.)']);
    expect(friend.g.flags.a3_kes_last).toBe('none');
  });
});

// ---------------------------------------------------------------- the red line at the first Act 3 fire

describe('B6n: Wren and Kes leave after a guild night they were not at', () => {
  it('waiting through the night: the first word after it is their leaving, in their own trees; nothing for any other side', () => {
    const a = actThree('guild');
    expect([ON_SIDE('wren'), ON_SIDE('kes')].map((c) => cond(c, a.g))).toEqual([true, true]);
    const w = talk('d_rd_wren', a.g, a.q);
    expect(at(w)).toBe('a3_guild');
    expect(w.view()!.text).toContain('I waited to say this to your face');
    expect(a.g.flags.wren_left).toBe('guild');
    expect(a.g.world.approval[WREN]).toBe(25 - 40);
    const k = talk('d_hs_kes', a.g, a.q);
    expect(at(k)).toBe('a3_guild');
    expect(a.g.flags).toMatchObject({ kes_left: 'guild', kes_rom: 'ended' });
    // afterwards: their left nodes, with no way back offered for this
    expect(options('d_rd_wren', a.g, a.q)).toEqual(['(Leave her be.)']);
    expect(options('d_hs_kes', a.g, a.q)).toEqual(['(Leave her be.)']);
    for (const side of ['truce', 'choir', 'ledger', 'none'] as const) {
      const b = actThree(side, { alliance: side === 'truce' || side === 'none' ? side : undefined, companions: { wren: 'waiting', kes: 'waiting' } });
      expect(at(talk('d_rd_wren', b.g, b.q)), side).toBe('waiting');
      expect(at(talk('d_hs_kes', b.g, b.q)), side).toBe('waiting');
    }
  });

  it('fetched before Act 3 and travelling: she leaves at the first camp, not on the road; the ones at the night already went at its dawn', () => {
    const a = actThree('guild', { companions: { wren: 'party', kes: 'party' } });
    expect(at(talk('d_rd_wren', a.g, a.q))).toBe('party');
    a.g.flags.at_camp = true;
    const w = talk('d_rd_wren', a.g, a.q);
    expect(at(w)).toBe('a3_guild');
    expect(w.view()!.text).toContain('when you come back to the fire');
    expect(a.g.world.party).not.toContain(WREN);
    expect(at(talk('d_hs_kes', a.g, a.q))).toBe('a3_guild');
    const was = actThree('guild', { flags: { wren_left: 'longnight', kes_left: 'longnight' } });
    expect(at(talk('d_rd_wren', was.g, was.q))).toBe('left');
    expect(was.g.flags.wren_left).toBe('longnight');
    expect(cond(WREN_GUILD_START.if, was.g)).toBe(false);
    expect(cond(KES_GUILD_START.if, was.g)).toBe(false);
  });

  it('gathered at the close without a word since: they say it at the fire before anything else, a romance with them ends, then the fire', () => {
    const a = fire('guild', { flags: { wren_rom: 'committed', romance_partner: WREN } });
    const r = talk('d_a3_fire', a.g, a.q);
    expect(at(r)).toBe('wren_guild');
    expect(r.view()!.text).toContain('I\'ll not walk up those steps beside that');
    r.choose(r.view()!.options[0].id);
    expect(a.g.flags).toMatchObject({ wren_left: 'guild', wren_rom: 'ended', romance_partner: false });
    r.choose(r.view()!.options[0].id);
    expect(at(r)).toBe('kes_guild');
    r.choose(r.view()!.options[0].id);
    r.choose(r.view()!.options[0].id);
    // a guild night is a night against Openfield too: Ash, gathered at the close without a word, goes next (B6o)
    expect(at(r)).toBe('ash_ln');
    r.choose(r.view()!.options[0].id);
    r.choose(r.view()!.options[0].id);
    expect(at(r)).toBe('hub');
    expect(sits(a)).toEqual(['(Sit by Tamsin.)', '(Sit by Ilya.)', '(Sit by Odile.)', '(Sit by Nine.)']);
    // at the close, her own tree says it the close's way too
    const b = fire('guild');
    expect(view('d_rd_wren', b.g, b.q).text).toContain('I\'ll not walk up those steps');
  });
});

// ---------------------------------------------------------------- the conversations

describe('B6n: the fire keeps U7, consent and the romance rules', () => {
  it('every node has a line for coming back to it; topics are spent once; a companion leaves the hub when nothing is left to say', () => {
    for (const [nid, n] of Object.entries(d_a3_fire.nodes)) expect(n.again, nid).toBeDefined();
    for (const id of ['a3f.tam.ways', 'a3f.tam.line', 'a3f.wren.ways', 'a3f.wren.line', 'a3f.ilya.ways', 'a3f.ilya.line', 'a3f.kes.ways', 'a3f.kes.line', 'a3f.kes.slack']) {
      const o = Object.values(d_a3_fire.nodes).flatMap((n) => n.options).find((x) => x.id === id);
      expect(o?.once, id).toBe(true);
    }
    const a = fire('prepared');
    ways(a, 'Tamsin', 'Tomorrow. What do you think', '(Go on.)');
    sit(a, 'Tamsin', ['What couldn\'t you stand', 'I won\'t promise']);
    expect(sits(a)).toContain('(Sit by Tamsin.)');
    sit(a, 'Tamsin', ['We\'re still the Grille', '(Listen till she runs out.)']);
    expect(sits(a)).not.toContain('(Sit by Tamsin.)');
    expect(sits(a)).toEqual(['(Sit by Wren.)', '(Sit by Ilya.)', '(Sit by Kes.)', '(Sit by Odile.)', '(Sit by Ash.)', '(Sit by Nine.)']);
  });

  it('every companion has a word at the fire: the four as speakers, the other three across it', () => {
    const nodes = Object.values(d_a3_fire.nodes);
    const said = new Set([...nodes.map((n) => n.speaker), ...nodes.flatMap((n) => (n.interject ?? []).map((i) => i.companion))]);
    for (const k of COMPANION_KEYS) expect(said.has(COMPANIONS[k].id), k).toBe(true);
  });

  it('every romance step asks and takes no for an answer; nothing at the fire is bought, given or taken', () => {
    const effects = Object.values(d_a3_fire.nodes).flatMap((n) => [...(n.effects ?? []), ...n.options.flatMap((o) => o.effects ?? [])]);
    expect(effects.filter((e: Effect) => 'give' in e || 'take' in e)).toEqual([]);
    // each commitment node offers a no, and every no carries no approval cost
    for (const nid of ['tam_r3', 'tam_ask', 'wren_last', 'wren_r3', 'wren_roof', 'ilya_last', 'ilya_r3', 'kes_last', 'kes_r3', 'kes_hour']) {
      const opts = d_a3_fire.nodes[nid].options;
      expect(opts.length, nid).toBeGreaterThanOrEqual(2);
      const no = opts.filter((o) => (o.effects ?? []).some((e) => 'set' in e && e.value !== undefined && ['no', 'stopped', 'declined'].includes(String(e.value))));
      expect(no.length, nid).toBeGreaterThanOrEqual(1);
      for (const o of no) expect((o.effects ?? []).some((e) => 'approval' in e && e.approval.by < 0), `${nid}/${o.id}`).toBe(false);
    }
    // a commitment never opens while another companion holds the shared partner
    for (const k of ['tamsin', 'wren', 'ilya', 'kes'] as const) expect(ROM_ON[k]).toBeDefined();
    const busy = fire('prepared', { flags: { wren_rom: 'roof', ilya_rom: 'committed', ilya_sober_days: 60, romance_partner: ILYA } });
    expect(options('d_a3_fire', busy.g, busy.q)).toContain('(Sit by Wren.)');
    const r = sit(busy, 'Wren');
    expect(r.view()!.options.map((o) => o.text)).not.toContain('(Sit with your shoulder against hers.)');
  });

  it('the last night survives a save: written through the real codec and read back', async () => {
    const a = fire('prepared', { flags: { kes_rom: 'committed', romance_partner: KES } });
    sit(a, 'Kes', ['Tomorrow. Are we still a thing?', 'Still what I want.']);
    const b = await saveAndLoad(a.g);
    expect(b.g.flags).toMatchObject({ a3_kes_last: 'together', a3_kes_night: true, romance_partner: KES });
    expect(options('d_a3_fire', b.g, b.q)).toContain('(Sit by Kes.)');
  });
});
