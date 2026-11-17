import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIALOGUES } from '../src/content';
import { d_a3_fire } from '../src/content/dialogue/a3_fire';
import { ASH_LN_NODES, KNOCK_CAMP_NODES, ODILE_PRICE_NODES } from '../src/content/dialogue/a3_fire_ii';
import { ASH, ASH_SELF_RISK, B_MEANS, D_READER, NINE, ODILE, TAMSIN, WITH_YOU } from '../src/content/world/a3_conds';
import type { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { test as cond, type Effect } from '../src/engine/world/logic';
import { actThree, hour, options, saveAndLoad, talk, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6o — Last nights II: Odile, Ash and Nine at the fire at the Spire's close (B6n's hub), the night before the steps: what
 * each sees up there (read from what the player holds, never named), Odile's price against what every way makes of Imelda
 * Sarr and her tab, Ash's letter by where his orders stand (and the last chance to ask, to burn it, to take back "make it
 * clean"), Nine's line and "when it matters"; Ash and Tamsin's quarrel at Knock's first camp, once; and the Long Night's
 * red lines for Ash and Odile when they were not at it (in their own trees, or at the fire). Played headless from the
 * shared Act 3 fixture.
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
const sit = (a: A3, who: string, picks: string[] = []): DialogueRunner => talk('d_a3_fire', a.g, a.q, [`(Sit by ${who}.)`, ...picks]);
const at = (r: DialogueRunner) => r.node;
const text = (r: DialogueRunner) => r.view()!.text;
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
/** The node a tree opens on for this game. */
const opens = (id: string, a: A3) => at(talk(id, a.g, a.q));
const pick = (r: DialogueRunner, start: string) => { r.choose(r.view()!.options.find((o) => o.text.startsWith(start) && !o.locked)!.id); return r; };
function ways(a: A3, who: string, ask: string): string[] {
  const r = sit(a, who, [ask]);
  const seen = [r.node!];
  for (let i = 0; i < 10; i++) {
    const v = r.view()!;
    const go = v.options.find((o) => o.text === '(Go on.)');
    if (!go) { r.choose(v.options.find((o) => o.text === '(That\'s all of it.)')!.id); break; }
    r.choose(go.id);
    seen.push(r.node!);
  }
  return seen;
}

// ---------------------------------------------------------------- who is at the fire

describe('B6o: Odile, Ash and Nine at the fire', () => {
  it('each still with the player has a place at it, travelling or gathered; nobody gone, left or disposed is there', () => {
    expect(sits(fire('prepared')).slice(-3)).toEqual(['(Sit by Odile.)', '(Sit by Ash.)', '(Sit by Nine.)']);
    // the worst Act 2: Odile never met, Ash and Nine gone
    expect(sits(fire('hostile')).filter((t) => /Odile|Ash|Nine/.test(t))).toEqual([]);
    expect(sits(fire('prepared', { companions: 'estranged' }))).toEqual([]);
    const away: Record<string, boolean>[] = [{ odile_left: true }, { odile_gone: true }, { ash_left: true }, { ash_gone: true }, { nine_disposed: true }, { a3_nine_struck: true }, { nine_left: true }];
    for (const flags of away) {
      const who = Object.keys(flags)[0].startsWith('odile') ? 'Odile' : Object.keys(flags)[0].startsWith('ash') ? 'Ash' : 'Nine';
      expect(sits(fire('prepared', { flags })), JSON.stringify(flags)).not.toContain(`(Sit by ${who}.)`);
    }
    // a hidden Nine, written off as not found, walks in to the close with the rest (B6b's suggestion) and says so
    const hid = fire('prepared', { flags: { a3_recall: 'hidden', a3_nine_hid: 'clover' } });
    hid.g.world.party = hid.g.world.party.filter((id) => id !== NINE);
    expect(cond(WITH_YOU('nine'), hid.g)).toBe(true);
    expect(text(sit(hid, 'Nine'))).toContain('NOT FOUND');
  });

  it('with nothing held but the sash, each sees only the two ways always there; with every way held, the chain visits each in order', () => {
    const bare = () => fire('prepared', { flags: { ar_verdict: 'refused' } });
    expect(ways(bare(), 'Odile', 'Tomorrow. Price it')).toEqual(['odile_w_plan']);
    expect(ways(bare(), 'Ash', 'Tomorrow. What do you see')).toEqual(['ash_w_plan']);
    expect(ways(bare(), 'Nine', 'Tomorrow. What does the record')).toEqual(['nine_w_plan']);
    const all = () => fire('prepared', { items: ['k_a3_charge', 'k_a3_transfer'], flags: { a3_concern_terms: 'accepted', a3_mast: 'raised' } });
    const full = ['w_plan', 'w_unwritten', 'w_concern', 'w_opensky', 'w_amendment'];
    expect(ways(all(), 'Odile', 'Tomorrow. Price it')).toEqual(full.map((n) => `odile_${n}`));
    expect(ways(all(), 'Ash', 'Tomorrow. What do you see')).toEqual(full.map((n) => `ash_${n}`));
    expect(ways(all(), 'Nine', 'Tomorrow. What does the record')).toEqual(full.map((n) => `nine_${n}`));
    // the hill wide without a reader is halfway, in each voice
    const half = fire('prepared', { flags: { a3_mast: 'raised', ar_verdict: 'refused' }, companions: { nine: 'waiting' }, skills: { science: 30 } });
    expect(ways(half, 'Ash', 'Tomorrow. What do you see')).toEqual(['ash_w_plan', 'ash_w_part']);
  });

  it('B\'s means are named by where they came from, in their own voices; Ash speaks for himself when it is him', () => {
    const t = (who: string, ask: string, over: Over) => text(sit(fire('prepared', over), who, [ask, '(Go on.)']));
    expect(t('Ash', 'Tomorrow. What do you see', { companions: { ash: 'party' } })).toContain('I\'d hold the door');
    expect(t('Odile', 'Tomorrow. Price it', { companions: { ash: 'party' } })).toContain('The Brother would hold the door');
    expect(t('Nine', 'Tomorrow. What does the record', { items: ['k_a3_charge'] })).toContain('powder in your pack');
    expect(t('Odile', 'Tomorrow. Price it', { flags: { a3_unwritten: 'with_you' } })).toContain('Petra');
    // each names its own cost: the water, the drains
    expect(t('Nine', 'Tomorrow. What does the record', { items: ['k_a3_charge'] })).toContain('drains fail within a year');
  });
});

// ---------------------------------------------------------------- Odile

describe('B6o: Odile\'s price against Imelda\'s fate, and her tab', () => {
  it('her price kept (Imelda alive): every way keeps her breathing; she wants the shame too and will not ask for it', () => {
    const spared = fire('prepared', { flags: { odile_price: 'sarr', ln_sarr: 'lives' } });
    expect(text(sit(spared, 'Odile'))).toContain('I priced it');
    const r = sit(spared, 'Odile', ['Imelda. Your price.']);
    expect(text(r)).toContain('knife already out');
    for (const s of ['Treasurer on the day the cloth says', 'Treasurer of the Concern\'s whole world', 'Treasurer of nothing', 'ruined in daylight']) expect(text(r)).toContain(s);
    expect(text(r)).toContain('I won\'t ask you to write me a second one');
    const before = appr(spared.g, ODILE);
    pick(r, 'She\'ll answer for the riders');
    expect([spared.g.flags.a3_odile_word, appr(spared.g, ODILE) - before]).toEqual([true, 3]);
    expect(text(sit(fire('prepared', { flags: { odile_price: 'sarr' } }), 'Odile', ['Imelda. Your price.']))).toContain('Nobody came for her with a knife');
    // the knife stopped was the Brother's own: she says so, and does not look at him
    expect(text(sit(fire('prepared', { flags: { odile_price: 'sarr', ln_sarr: 'lives', ash_orders: 'refused_late' } }), 'Odile', ['Imelda. Your price.']))).toContain('the Brother\'s knife');
  });

  it('no price asked, or refused: the same pricing in another key; "my business" costs nothing with her', () => {
    const none = fire('prepared');
    const r = sit(none, 'Odile', ['Imelda Sarr. What happens']);
    expect(text(r)).toContain('grateful for that all season');
    const before = appr(none.g, ODILE);
    pick(r, 'What she is after tomorrow is my business');
    expect(appr(none.g, ODILE)).toBe(before);
    expect(text(sit(fire('truce'), 'Odile', ['Imelda Sarr. What happens']))).toContain('a little in front of her');
    // the topic is spent once
    expect(opts(sit(none, 'Odile'))).not.toContain('Imelda Sarr. What happens to her tomorrow?');
  });

  it('Imelda dead (her price never staked on it): a grief, not a quote, and only "let her be"', () => {
    const a = fire('prepared', { flags: { ks_sarr: 'dead' } });
    const r = sit(a, 'Odile', ['Imelda Sarr. What happens']);
    expect(text(r)).toContain('Imelda is dead');
    expect(opts(r)).toEqual(['(Let her be.)']);
    pick(r, '(Let her be.)');
    expect(at(r)).toBe('odile');
  });

  it('the tab: read entry by entry by where her sheet went, then paid or left open; her after follows the sheet', () => {
    const torn = fire('prepared');
    const r = sit(torn, 'Odile', ['You keep a tab on everyone.']);
    expect(text(r)).toContain('unwound');
    pick(r, 'Write it. Paid.');
    expect(torn.g.flags).toMatchObject({ a3_odile_last: 'settled', a3_odile_night: true });
    expect(text(r)).toContain('live in Shale');
    const kept = fire('truce');
    const before = appr(kept.g, ODILE);
    const k = sit(kept, 'Odile', ['You keep a tab on everyone.']);
    expect(text(k)).toContain('still in her coat');
    pick(k, 'Leave it open.');
    expect([kept.g.flags.a3_odile_last, appr(kept.g, ODILE) - before]).toEqual(['open', 5]);
    expect(text(k)).toContain('eighth span');
    expect(text(sit(fire('prepared', { flags: { odile_sheet: 'nine' } }), 'Odile', ['You keep a tab']))).toContain('a ledger the city doesn\'t read');
    expect(text(sit(fire('prepared', { flags: { odile_sheet: 'player' } }), 'Odile', ['You keep a tab']))).toContain('carried in your pack');
  });

  it('when all three are said she leaves the hub; nothing at her place is bought, given or taken', () => {
    const a = fire('prepared');
    ways(a, 'Odile', 'Tomorrow. Price it');
    sit(a, 'Odile', ['Imelda Sarr. What happens', 'Alive I can cover.']);
    expect(sits(a)).toContain('(Sit by Odile.)');
    sit(a, 'Odile', ['You keep a tab on everyone.', 'Write it. Paid.']);
    expect(sits(a)).not.toContain('(Sit by Odile.)');
  });
});

// ---------------------------------------------------------------- Ash

describe('B6o: Ash\'s last night, by where his orders stand', () => {
  it('refused: he will stand on the step below; the player\'s answer is remembered (a word not to wear it)', () => {
    const a = fire('prepared');
    expect(text(sit(a, 'Ash'))).toContain('Last one before the steps');
    const r = sit(a, 'Ash', ['The letter\'s burned.']);
    expect(text(r)).toContain('step below you');
    expect(opts(r)).toEqual(['I won\'t put it on. Nobody has to stand anywhere.', 'I don\'t know yet what I\'ll do. I\'ll be glad of you, whatever it is.', 'Don\'t stand there for me, Ash.']);
    const before = appr(a.g, ASH);
    pick(r, 'I won\'t put it on.');
    expect([a.g.flags.a3_ash_word, appr(a.g, ASH) - before]).toEqual([true, 3]);
    expect(text(sit(fire('prepared', { flags: { ash_orders: 'refused_late' } }), 'Ash', ['The letter\'s burned.']))).toContain('lane at Openfield');
  });

  it('warned: ask again; at 40 or more he burns it (refused, and B\'s means if he travels), below it he cannot yet', () => {
    const low = fire('truce', { companions: { ash: 'party' } });
    const r = sit(low, 'Ash', ['The letter. It\'s still in your scarf.']);
    expect(text(r)).toContain('Do you know now?');
    expect(opts(r)).toEqual(['No. I won\'t wear it. Burn it, Ash.', 'I still don\'t know. I won\'t lie to you about it.', 'Then come to my face. I\'ll be there.']);
    pick(r, 'No. I won\'t wear it. Burn it');
    expect(at(r)).toBe('ash_not_yet');
    expect(low.g.flags).toMatchObject({ ash_orders: 'warned', a3_ash_word: true });
    const hi = fire('truce', { companions: { ash: 'party' }, approval: { ash: 45 } });
    expect(cond(B_MEANS, hi.g)).toBe(false);
    const before = appr(hi.g, ASH);
    const h = sit(hi, 'Ash', ['The letter. It\'s still in your scarf.', 'No. I won\'t wear it. Burn it']);
    expect(at(h)).toBe('ash_burn');
    expect(hi.g.flags).toMatchObject({ ash_orders: 'refused', a3_ash_last: 'burned' });
    expect(appr(hi.g, ASH) - before).toBe(10);
    expect(hi.g.world.decisions.map((d) => d.id)).toContain('a3_ash_burned');
    expect(cond(B_MEANS, hi.g)).toBe(true);
    // told "no" once before he could believe it: he says so
    const doubted = fire('truce');
    doubted.g.world.seen['ash.choice.no.low'] = 1;
    expect(text(sit(doubted, 'Ash', ['The letter.']))).toContain('couldn\'t believe you yet');
    // or the honest answer again, or "come to my face"
    const still = fire('truce');
    sit(still, 'Ash', ['The letter.', 'I still don\'t know.']);
    expect(still.g.flags.ash_orders).toBe('warned');
  });

  it('undecided: "what\'s the first thing you\'ll sign?", heard and remembered for the steps; other: taken back, or let go', () => {
    const u = fire('truce', { flags: { ash_orders: 'undecided' } });
    const r = sit(u, 'Ash', ['The letter.']);
    expect(text(r)).toContain('first thing you\'ll sign');
    pick(r, 'Nothing that counts a person.');
    expect(u.g.flags.a3_ash_heard).toBe('people');
    expect(text(r)).toContain('my friend in that chair');
    for (const [p, v] of [['Whatever keeps the water', 'water'], ['I don\'t know. I\'d tell you', 'unsure']] as const) {
      const b = fire('truce', { flags: { ash_orders: 'undecided' } });
      sit(b, 'Ash', ['The letter.', p]);
      expect(b.g.flags.a3_ash_heard).toBe(v);
    }
    const back = fire('truce', { flags: { ash_orders: 'other' } });
    const rb = sit(back, 'Ash', ['The letter.']);
    expect(text(rb)).toContain('somebody who wears theirs gladly');
    pick(rb, 'Don\'t. I take it back.');
    expect([back.g.flags.ash_orders, at(rb)]).toEqual(['warned', 'ash_taken_back']);
    const burn = fire('truce', { flags: { ash_orders: 'other' }, approval: { ash: 40 } });
    sit(burn, 'Ash', ['The letter.', 'Don\'t. I take it back.']);
    expect(burn.g.flags).toMatchObject({ ash_orders: 'refused', a3_ash_last: 'burned' });
    const go = fire('truce', { flags: { ash_orders: 'other' } });
    sit(go, 'Ash', ['The letter.', 'Go, then.']);
    expect(go.g.flags.ash_orders).toBe('other');
  });

  it('told but never answered: his last question, with his own fire\'s answers; never told: he tells it at 35, keeps it below', () => {
    const ask = fire('prepared', { flags: { ash_orders: false, ash_orders_known: true } });
    const r = sit(ask, 'Ash', ['The letter. You never said']);
    expect(text(r)).toContain('will you wear it?');
    expect(opts(r)).toEqual(['No. Burn it.', 'I don\'t know yet. I won\'t lie to you about it.', 'If it\'s the only way to change it from inside, yes.', 'There are names on Petra\'s board who wear theirs gladly. Let it fall on them.']);
    pick(r, 'If it\'s the only way');
    expect(ask.g.flags.ash_orders).toBe('undecided');
    const tell = fire('prepared', { flags: { ash_orders: false, ash_orders_known: false } });
    const t = sit(tell, 'Ash', ['Tomorrow. What is it to you?']);
    expect(text(t)).toContain('twelve pins');
    pick(t, '(Take the paper');
    expect(text(t)).toContain('THE SKY IS OWED');
    expect(tell.g.flags).toMatchObject({ ash_orders_known: true, ash_orders_how: 'told' });
    expect(tell.g.world.knowledge.ash_unwritten).toBe(true);
    pick(t, 'No. Burn it.');
    expect(tell.g.flags).toMatchObject({ ash_orders: 'refused', a3_ash_last: 'burned', a3_ash_word: true });
    const keep = fire('prepared', { flags: { ash_orders: false, ash_orders_known: false }, approval: { ash: 20 } });
    const k = sit(keep, 'Ash', ['Tomorrow. What is it to you?']);
    expect(text(k)).toContain('tell it on the steps');
    expect(opts(k)).toEqual(['(Let it be.)']);
    expect(keep.g.flags.ash_orders_known).toBeFalsy();
  });

  it('"make it clean" at low approval: the warning is plain (one shell), and the sentence can be taken back', () => {
    const a = fire('truce', { approval: { ash: 15 } });
    expect(cond(ASH_SELF_RISK, a.g)).toBe(true);
    expect(text(sit(a, 'Ash'))).toContain('one shell');
    const before = appr(a.g, ASH);
    const r = sit(a, 'Ash', ['That night you asked about the sash']);
    expect(text(r)).toContain('stone in a boot');
    expect([a.g.flags.a3_ash_clean_back, appr(a.g, ASH) - before, a.g.flags.ash_stance]).toEqual([true, 5, 'clean']);
    expect(cond(ASH_SELF_RISK, a.g)).toBe(false);
    expect(text(sit(a, 'Ash'))).not.toContain('one shell');
    // the retraction is offered at any approval while it stands, and never once it is taken back
    expect(opts(sit(fire('truce'), 'Ash'))).toContain('That night you asked about the sash, I said: make it clean. I take it back.');
    expect(opts(sit(a, 'Ash'))).not.toContain('That night you asked about the sash, I said: make it clean. I take it back.');
    expect(opts(sit(fire('prepared'), 'Ash'))).not.toContain('That night you asked about the sash, I said: make it clean. I take it back.');
  });

  it('the soil, by what was said at the seed store; a burned letter stays burned through it', () => {
    const spoken = fire('prepared');
    const r = sit(spoken, 'Ash', ['(Sit with him and let him talk.)']);
    expect(text(r)).toContain('proper graves');
    pick(r, '(Listen to all of it.)');
    expect(spoken.g.flags).toMatchObject({ a3_ash_last: 'none', a3_ash_night: true });
    expect(text(sit(fire('prepared', { flags: { ash_gully_outcome: 'unsaid' } }), 'Ash', ['(Sit with him']))).toContain('Pia, who was four');
    expect(text(sit(fire('prepared', { flags: { ash_gully_outcome: 'told' } }), 'Ash', ['(Sit with him']))).toContain('nobody\'s');
    expect(text(sit(fire('prepared', { flags: { ash_gully_outcome: false } }), 'Ash', ['(Sit with him']))).toContain('still soil');
    const burned = fire('truce', { approval: { ash: 45 } });
    sit(burned, 'Ash', ['The letter.', 'No. I won\'t wear it. Burn it']);
    sit(burned, 'Ash', ['(Sit with him', '(Listen to all of it.)']);
    expect(burned.g.flags).toMatchObject({ a3_ash_last: 'burned', a3_ash_night: true });
  });
});

// ---------------------------------------------------------------- Nine

describe('B6o: Nine\'s last night, by deed and stance', () => {
  it('its opener reads how the recall ended (or that the notice still waits at the gate)', () => {
    const say = (over: Over) => text(sit(fire('prepared', over), 'Nine'));
    expect(say({})).toContain('notice for me at the Precinct gate');
    expect(say({ flags: { a3_recall: 'declined' } })).toContain('The keeper declined');
    expect(say({ flags: { a3_recall: 'stayed' } })).toContain('you said no');
    expect(say({ flags: { a3_recall: 'court' } })).toContain('Assessor Three');
    expect(say({ flags: { a3_recall: 'bought' } })).toContain('plus one Toll');
    expect(say({ flags: { a3_recall: 'fought' } })).toContain('both sides of it');
  });

  it('its one line, said plainly: it will not help break the core, nor fight; the rest by stance; the answer remembered', () => {
    const c = fire('prepared');
    const r = sit(c, 'Nine', ['What won\'t you stand beside?']);
    expect(text(r)).toContain('I will not fight you. I will not help.');
    expect(text(r)).toContain('read aloud first');
    const before = appr(c.g, NINE);
    pick(r, 'I won\'t break it.');
    expect([c.g.flags.a3_nine_word, appr(c.g, NINE) - before]).toEqual([true, 3]);
    const d = fire('truce');
    const rd = sit(d, 'Nine', ['What won\'t you stand beside?']);
    expect(text(rd)).toContain('line by line');
    const db = appr(d.g, NINE);
    pick(rd, 'That\'s mine to decide');
    expect(appr(d.g, NINE) - db).toBe(-3);
  });

  it('"when it matters": the log it held back, given (a reader for tomorrow) or read aloud by the fire', () => {
    const a = fire('truce', { flags: { nine_log_kept: true }, skills: { science: 20 } });
    expect(cond(D_READER, a.g)).toBe(false);
    expect(opts(sit(a, 'Nine'))).not.toContain('The drains. Tell me one last time.');
    const r = sit(a, 'Nine', ['You said you\'d read it to me yourself']);
    expect(text(r)).toContain('The four hundred and twelfth');
    pick(r, 'Give me the copy.');
    expect(a.g.flags).toMatchObject({ nine_log_given: true, a3_nine_last: 'log', a3_nine_night: true });
    expect(a.g.world.knowledge.nine_log_copy).toBe(true);
    expect(cond(D_READER, a.g)).toBe(true);
    const b = fire('truce', { flags: { nine_log_kept: true } });
    sit(b, 'Nine', ['You said you\'d read it', 'Keep it. Read me the rest']);
    expect(b.g.flags).toMatchObject({ a3_nine_last: 'log' });
    expect(b.g.flags.nine_log_given).toBeUndefined();
  });

  it('otherwise the drains, one last time; with the copy already given it says so', () => {
    const a = fire('prepared');
    expect(opts(sit(a, 'Nine'))).not.toContain('You said you\'d read it to me yourself, when it matters.');
    const r = sit(a, 'Nine', ['The drains.']);
    expect(text(r)).toContain('You have the copy');
    pick(r, '(Let it go on.)');
    expect(a.g.flags).toMatchObject({ a3_nine_last: 'none', a3_nine_night: true });
    expect(text(sit(fire('truce'), 'Nine', ['The drains.']))).toContain('Nobody lets me');
  });
});

// ---------------------------------------------------------------- the Long Night's red lines, for the ones who were not there

describe('B6o: Ash and Odile leave after a Long Night that crossed their lines while they were away', () => {
  it('Ash, after a night against Openfield (the guild\'s side or the city\'s): the first word after it, waiting, at camp, or left', () => {
    for (const side of ['ledger', 'guild'] as const) {
      const a = actThree(side);
      const r = talk('d_of_ash', a.g, a.q);
      expect(at(r), side).toBe('a3_ln');
      expect(text(r)).toContain('I waited, so I could say it to your face');
      expect(a.g.flags).toMatchObject({ ash_gone: true, ash_redline: 'longnight' });
      expect(appr(a.g, ASH)).toBe(25 - 50);
      expect(at(talk('d_of_ash', a.g, a.q))).toBe('gone');
    }
    const t = actThree('ledger', { companions: { ash: 'party' } });
    expect(at(talk('d_of_ash', t.g, t.q))).toBe('party');
    t.g.flags.at_camp = true;
    expect(at(talk('d_of_ash', t.g, t.q))).toBe('a3_ln');
    expect(t.g.world.party).not.toContain(ASH);
    const left = actThree('ledger', { companions: { ash: 'left' } });
    expect(at(talk('d_of_ash', left.g, left.q))).toBe('a3_ln_left');
    expect(left.g.flags.ash_gone).toBe(true);
    // no line crossed: no leaving; the ones at the night already went at its dawn
    for (const side of ['choir', 'truce', 'none'] as const) expect(opens('d_of_ash', actThree(side)), side).toBe('waiting');
    const was = actThree('ledger', { flags: { ash_gone: true, ash_redline: 'longnight' } });
    expect(at(talk('d_of_ash', was.g, was.q))).toBe('gone');
  });

  it('Odile, when her price is broken (Imelda dead): waiting, at camp, or back at the Span; never while Imelda lives', () => {
    const a = actThree('none', { flags: { odile_price: 'sarr' } });
    const r = talk('d_nb_odile', a.g, a.q);
    expect(at(r)).toBe('a3_price');
    expect(text(r)).toContain('That is a cost');
    expect(a.g.flags).toMatchObject({ odile_gone: true, odile_left: 'price' });
    expect(appr(a.g, ODILE)).toBe(25 - 40);
    expect(at(talk('d_nb_odile', a.g, a.q))).toBe('gone');
    const left = actThree('none', { flags: { odile_price: 'sarr' }, companions: { odile: 'left' } });
    expect(at(talk('d_nb_odile', left.g, left.q))).toBe('a3_price_left');
    expect(left.g.flags.odile_gone).toBe(true);
    const camp = actThree('none', { flags: { odile_price: 'sarr' }, companions: { odile: 'party' } });
    expect(at(talk('d_nb_odile', camp.g, camp.q))).toBe('party');
    camp.g.flags.at_camp = true;
    expect(at(talk('d_nb_odile', camp.g, camp.q))).toBe('a3_price');
    // Imelda alive, or no price staked on her: no leaving
    expect(opens('d_nb_odile', actThree('truce', { flags: { odile_price: 'sarr' } }))).toBe('waiting');
    expect(opens('d_nb_odile', actThree('none'))).toBe('waiting');
  });

  it('gathered at the close without a word since: they say it at the fire before anything else, after Wren and Kes', () => {
    const a = fire('ledger');
    const r = talk('d_a3_fire', a.g, a.q);
    expect(at(r)).toBe('ash_ln');
    expect(text(r)).toContain('I came this far to say it to your face');
    pick(r, '(Let him go.)');
    expect(at(r)).toBe('after_guild');
    pick(r, '(Stay at the fire.)');
    expect(at(r)).toBe('hub');
    expect(sits(a)).not.toContain('(Sit by Ash.)');
    const o = fire('none', { flags: { odile_price: 'sarr' } });
    const ro = talk('d_a3_fire', o.g, o.q);
    expect(at(ro)).toBe('odile_ln');
    pick(ro, '(Let her go.)');
    pick(ro, '(Stay at the fire.)');
    expect(at(ro)).toBe('hub');
    expect(sits(o)).not.toContain('(Sit by Odile.)');
    // by day, the leaving still comes first, and the fire is laid after it
    const day = fire('ledger', {}, 10);
    const rd = talk('d_a3_fire', day.g, day.q);
    expect(at(rd)).toBe('ash_ln');
    pick(rd, '(Let him go.)');
    pick(rd, '(Stay at the fire.)');
    expect(at(rd)).toBe('day');
  });
});

// ---------------------------------------------------------------- Ash and Tamsin at Knock

describe('B6o: Ash and Tamsin at Knock\'s first camp (home against the sky, turned round)', () => {
  const knock = (over: Over = {}) => actThree('prepared', { at: 'c9_mouth', companions: { tamsin: 'party', ash: 'party' }, ...over, flags: { at_camp: true, ...over.flags } });

  it('plays once, at the first camp at Knock with both travelling, from whichever of them is spoken to first', () => {
    const a = knock();
    const r = talk('d_c9_tamsin', a.g, a.q);
    expect(at(r)).toBe('a3k_ash');
    expect(r.view()!.speaker).toBe(ASH);
    expect(text(r)).toContain('Tamsin');
    expect(text(r)).toContain('Open it');
    expect(text(r)).not.toContain('Not child');
    pick(r, '(Wait.)');
    expect(text(r)).toContain('It\'s their door');
    expect(text(r)).toContain('Everybody\'s told me to go home');
    // after the Act 2 quarrel at a camp fire (her tree's tamc.ash), both of them remember it
    const again = knock();
    again.g.world.seen['tamc.ash'] = 1;
    const ra = talk('d_c9_tamsin', again.g, again.q);
    expect(text(ra)).toContain('Not child');
    expect(text(pick(ra, '(Wait.)'))).toContain('You told me to go home, last time');
    const t0 = appr(a.g, TAMSIN), s0 = appr(a.g, ASH);
    pick(r, 'She\'s right.');
    expect([appr(a.g, TAMSIN) - t0, appr(a.g, ASH) - s0]).toEqual([5, -5]);
    pick(r, '(Back to the fire.)');
    expect(at(r)).toBe('camp');
    // once: neither tree opens on it again
    expect(at(talk('d_c9_tamsin', a.g, a.q))).toBe('camp');
    expect(at(talk('d_of_ash', a.g, a.q))).toBe('camp');
    const b = knock();
    const s1 = appr(b.g, ASH);
    const rb = talk('d_of_ash', b.g, b.q);
    expect(at(rb)).toBe('a3k_ash');
    pick(pick(rb, '(Wait.)'), 'He\'s right.');
    expect(appr(b.g, ASH) - s1).toBe(5);
    for (const p of ['You\'re both arguing', '(Say nothing.)']) {
      const c = knock();
      const rc = talk('d_c9_tamsin', c.g, c.q, ['(Wait.)', p]);
      expect(rc.view()!.options.map((o) => o.text)).toEqual(['(Back to the fire.)']);
    }
  });

  it('not elsewhere, not on the road, not without both of them, and not once the door is settled', () => {
    expect(opens('d_c9_tamsin', knock({ at: 'shale' }))).toBe('camp');
    const road = knock();
    road.g.flags.at_camp = false;
    expect(at(talk('d_c9_tamsin', road.g, road.q))).toBe('party');
    const alone = knock({ companions: { tamsin: 'party', ash: 'waiting' } });
    expect(at(talk('d_c9_tamsin', alone.g, alone.q))).toBe('camp');
    const settled = knock({ flags: { a3_c9: 'sealed' } });
    expect(at(talk('d_c9_tamsin', settled.g, settled.q))).toBe('camp');
    // before Act 3, a camp at Knock is only a camp
    const early = knock({ point: 'eve' });
    expect(at(talk('d_c9_tamsin', early.g, early.q))).toBe('camp');
  });
});

// ---------------------------------------------------------------- the conversations

describe('B6o: the three keep U7, and nothing is bought', () => {
  const NEW = [...Object.keys(d_a3_fire.nodes).filter((n) => /^(odile|ash|nine)(_|$)/.test(n))];

  it('every new node has a line for coming back to it; topics are spent once; each leaves the hub when nothing is left', () => {
    expect(NEW.length).toBeGreaterThan(50);
    for (const n of NEW) expect(d_a3_fire.nodes[n].again, n).toBeDefined();
    for (const [n, def] of Object.entries({ ...KNOCK_CAMP_NODES, ...ASH_LN_NODES, ...ODILE_PRICE_NODES })) expect(def.again, n).toBeDefined();
    for (const id of ['a3f.odile.ways', 'a3f.odile.price', 'a3f.ash.ways', 'a3f.ash.orders', 'a3f.nine.ways', 'a3f.nine.line']) {
      const o = Object.values(d_a3_fire.nodes).flatMap((n) => n.options).find((x) => x.id === id);
      expect(o?.once, id).toBe(true);
    }
    const a = fire('prepared');
    ways(a, 'Nine', 'Tomorrow. What does the record');
    sit(a, 'Nine', ['What won\'t you stand beside?', 'I won\'t promise.']);
    expect(sits(a)).toContain('(Sit by Nine.)');
    sit(a, 'Nine', ['The drains.', '(Let it go on.)']);
    expect(sits(a)).not.toContain('(Sit by Nine.)');
    ways(a, 'Ash', 'Tomorrow. What do you see');
    sit(a, 'Ash', ['The letter\'s burned.', 'Don\'t stand there']);
    sit(a, 'Ash', ['(Sit with him', '(Listen to all of it.)']);
    expect(sits(a)).not.toContain('(Sit by Ash.)');
  });

  it('nothing at their places is bought, given or taken; the other companions speak across the fire', () => {
    const effects = [...NEW.map((n) => d_a3_fire.nodes[n]), ...Object.values(KNOCK_CAMP_NODES)].flatMap((n) => [...(n.effects ?? []), ...n.options.flatMap((o) => o.effects ?? [])]);
    expect(effects.filter((e: Effect) => 'give' in e || 'take' in e)).toEqual([]);
    const across = new Set(NEW.flatMap((n) => (d_a3_fire.nodes[n].interject ?? []).map((i) => i.companion)));
    for (const c of [TAMSIN, 'npc_rd_03', 'npc_sh_17', 'npc_hs_01', ODILE, ASH, NINE]) expect(across.has(c), c).toBe(true);
    expect(DIALOGUES.d_c9_tamsin.nodes.a3k_tam).toBeDefined();
    expect(DIALOGUES.d_of_ash.nodes.a3k_tam).toBeDefined();
  });

  it('the last nights survive a save, and the registry names every flag the slice writes', async () => {
    const a = fire('truce', { flags: { nine_log_kept: true }, approval: { ash: 45 } });
    sit(a, 'Odile', ['You keep a tab on everyone.', 'Leave it open.']);
    sit(a, 'Ash', ['The letter.', 'No. I won\'t wear it. Burn it']);
    sit(a, 'Nine', ['You said you\'d read it', 'Give me the copy.']);
    const b = await saveAndLoad(a.g);
    expect(b.g.flags).toMatchObject({ a3_odile_last: 'open', a3_ash_last: 'burned', ash_orders: 'refused', a3_nine_last: 'log', nine_log_given: true });
    const reg = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    for (const f of ['a3_odile_last', 'a3_ash_last', 'a3_nine_last', 'a3_odile_night', 'a3_odile_word', 'a3_ash_word', 'a3_nine_word', 'a3_ash_heard', 'a3_ash_clean_back', 'a3_ash_tam']) expect(reg, f).toContain(f);
    const src = readFileSync('src/content/dialogue/a3_fire_ii.ts', 'utf8');
    for (const m of src.matchAll(/set: '(a3_\w+)'/g)) expect(reg, m[1]).toContain(m[1]);
  });
});
