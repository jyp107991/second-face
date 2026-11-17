import { describe, expect, it } from 'vitest';
import { DIALOGUES, MAPS, NPCS, QUESTS } from '../src/content';
import { A3_SHALE_DIALOGUES, ADA_FALLS, ESKO, RIDE_OPEN, TAMAR } from '../src/content/dialogue/a3_shale';
import { d_sh_ada, d_sh_issa, d_sh_jonah, d_sh_mags, d_sh_pike } from '../src/content/dialogue/shale';
import { NINE, ODILE } from '../src/content/world/a3_conds';
import type { DialogueDef } from '../src/engine/dialogue/dialogue';
import { effectiveSkill } from '../src/engine/stats/checks';
import { attr } from '../src/engine/stats/sheet';
import type { AttributeId, SkillId } from '../src/engine/stats/rules';
import { test as cond, type Cond, type Effect } from '../src/engine/world/logic';
import type { QuestEngine } from '../src/engine/quest/quest';
import { actThree, at, fire, has, hour, options, placed, saveAndLoad, stage, status, talk, trigger, view, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6e — Sheriff's Last Ride: the guild's buyout of Shale comes due once the player is in Shale in Act 3 and waits on them;
 * the hook (the notice on the sheriff's door, the guild's two hands, Ada at her desk with the pen), the investigation (Ada,
 * Pike, Mags, Teo, Issa), the turn (a ruin price on a forecast, brought forward; Mags's hand, for Ada's sake and her bar's),
 * every route to its outcome (talk, pay or reprice, unwind the sheet, the Tollhouse page, the strongbox, the militia
 * counted, the fight, or her signature), Ada's death only under its conditions, and what the town shows after. Played
 * headless from the shared Act 3 fixture.
 */

const SH = 'shale';
/** Act 3 with the order read, standing in Shale. */
const town = (preset: Preset = 'prepared', over: Over = {}): A3 => {
  const a = actThree(preset, { ...over, at: SH });
  a.q.update();
  return a;
};
/** Walk in by the west road: the buyout comes due. */
const arrive = (a: A3): A3 => { fire(a.g, a.q, SH, 'a3_arrive_w'); return a; };
const exact = (g: G, k: SkillId, v: number) => { g.pc.sheet.skillBought[k] += v - effectiveSkill(g.pc.sheet, g.pc.inventory, k); expect(effectiveSkill(g.pc.sheet, g.pc.inventory, k)).toBe(v); };
const exactAttr = (g: G, k: AttributeId, v: number) => { g.pc.sheet.baseAttrs[k] += v - attr(g.pc.sheet, k); expect(attr(g.pc.sheet, k)).toBe(v); };
const here = (g: G) => MAPS[SH].npcs!.filter((n) => cond(n.if, g)).map((n) => n.id ?? n.def);
const kill = (g: G, id: string) => { g.npcs[`${SH}/${id}`] = { dead: true } as never; };
const tolls = (g: G) => g.pc.inventory.tolls;
const text = (id: string, g: G, q: QuestEngine) => view(id, g, q).text;
const ACT1: [string, DialogueDef][] = [['d_a3_ada', d_sh_ada], ['d_a3_pike', d_sh_pike], ['d_a3_mags', d_sh_mags], ['d_a3_militia', d_sh_issa], ['d_a3_jonah', d_sh_jonah]];
const PEOPLE = ['npc_sh_01_a3', 'npc_sh_02_a3', 'npc_sh_03_a3', 'npc_sh_04_a3', 'npc_sh_11_a3'];
const HANDS = [ESKO, TAMAR];
/** Ada kept the star: every route that ends with her staying ends here. */
function kept(a: A3, pike: string) {
  const { g, q } = a;
  q.update();
  expect(g.flags).toMatchObject({ ks_ada: 'stays', a3_pike: pike, a3_shale: 'free' });
  expect(stage(g, 'q_a3_ride')).toBe('stays');
  expect(status(g, 'q_a3_ride')).toBe('done');
  expect(here(g)).toEqual(expect.arrayContaining(['npc_sh_01_a3']));
  for (const h of HANDS) expect(here(g)).not.toContain(h);
  expect(cond(RIDE_OPEN, g)).toBe(false);
  expect(view('d_a3_ada', g, q).text).not.toContain('pen beside it');
  expect(text('d_a3_notice', g, q)).toContain('four nails');
  expect(g.world.news.some((n) => n.tag === 'a3_shale_free')).toBe(true);
}
/** Draw on the guild's hands, then put them down, and read the street. */
function fight(a: A3): string {
  talk('d_a3_hands', a.g, a.q, ['Get off Shale\'s street.', '(Put your hand on your weapon.)', '(Draw.)']);
  for (const h of HANDS) kill(a.g, h);
  a.q.update();
  const r = talk('d_a3_street', a.g, a.q);
  const after = r.view()!.text;
  talk('d_a3_street', a.g, a.q, ['(Go on.)']);
  return after;
}

// ---------------------------------------------------------------- the place, before and in Act 3

describe('B6e: the buyout waits for the player in Shale', () => {
  it('before Act 3 Shale is as Act 1 left it: Act 1\'s people, the door a board, the strongbox locked, nobody at the door', () => {
    const { g, q } = at(SH);
    const ids = here(g);
    for (const id of ['npc_sh_01', 'npc_sh_02', 'npc_sh_03', 'npc_sh_04', 'npc_sh_11']) expect(ids).toContain(id);
    for (const id of [...PEOPLE, ...HANDS, 'npc_a3_g13', 'npc_a3_g14', 'npc_sh_01_step']) expect(ids).not.toContain(id);
    expect(MAPS[SH].talk).toMatchObject({ office_notice: { dialogue: 'd_a3_notice' }, pike_safe: { dialogue: 'd_a3_safe' } });
    expect(text('d_a3_notice', g, q)).toContain('the Dogs\' tithe');
    expect(text('d_a3_safe', g, q)).toContain('two locks');
    expect(options('d_a3_safe', g, q)).toEqual(['(Leave it.)']);
    // the Act 3 trees carry Shale's own trees whole, so every service and Act 1 thread still plays
    for (const [id, act1] of ACT1) {
      for (const [nid, n] of Object.entries(act1.nodes)) expect(DIALOGUES[id].nodes[nid], `${id}/${nid}`).toBe(n);
      expect(DIALOGUES[id].start.slice(-act1.start.length)).toEqual(act1.start);
      const a = at(SH), b = at(SH);
      expect(view(id, a.g, a.q).text, id).toBe(view(act1.id, b.g, b.q).text);
    }
    for (const t of ['a3_arrive_w', 'a3_arrive_e', 'a3_arrive_c', 'a3_street_after']) expect(cond(trigger(SH, t).if, g), t).toBe(false);
    expect(g.world.quests.q_a3_ride).toBeUndefined();
  });

  it('in Act 3 the town\'s people are their Act 3 instances, the guild\'s hands keep the sheriff\'s door, and the road in brings the buyout due once', () => {
    const { g, q } = town('choir');
    const ids = here(g);
    for (const id of [...PEOPLE, ...HANDS]) expect(ids).toContain(id);
    for (const id of ['npc_sh_01', 'npc_sh_02', 'npc_sh_03', 'npc_sh_04', 'npc_sh_11']) expect(ids).not.toContain(id);
    expect(placed(SH, 'npc_sh_01_a3').dialogue).toBe('d_a3_ada');
    expect(placed(SH, 'npc_sh_04_a3').dialogue).toBe('d_a3_pike');
    expect(NPCS[ESKO].dialogue).toBe('d_a3_hands');
    expect(g.world.quests.q_a3_ride).toBeUndefined();
    fire(g, q, SH, 'a3_arrive_w');
    expect(stage(g, 'q_a3_ride')).toBe('notice');
    expect(g.flags.a3_buyout).toBe(true);
    expect(QUESTS.q_a3_ride.stages.notice.journal).toContain('waiting to hear from me');
    for (const t of ['a3_arrive_w', 'a3_arrive_e', 'a3_arrive_c']) expect(cond(trigger(SH, t).if, g), t).toBe(false);
    expect(text('d_a3_notice', g, q)).toContain('SHALE — CONTRACT OF PROTECTION — ON THE SHERIFF\'S RESIGNATION');
  });

  it('nothing happens until the player is in Shale; once there, nothing happens until the player acts; any first word in town brings it due', () => {
    const { g, q } = actThree('choir');
    for (const where of ['openfield', 'md_precinct', 'tollhouse', 'c9_mouth', 'wild:sallow']) for (let d = 0; d < 2; d++) waitFor(g, q, where, 9);
    expect(g.world.quests.q_a3_ride).toBeUndefined();
    expect(g.flags.ks_ada).toBeUndefined();
    expect(cond(RIDE_OPEN, g)).toBe(true);
    // no trigger walked: the first word with anyone in the buyout brings it due
    for (const tree of ['d_a3_mags', 'd_a3_pike', 'd_a3_hands', 'd_a3_militia', 'd_a3_jonah', 'd_a3_notice', 'd_a3_ada']) {
      const b = actThree('choir', { at: SH });
      talk(tree, b.g, b.q);
      expect(stage(b.g, 'q_a3_ride'), tree).toBe('notice');
    }
    g.locationId = SH;
    talk('d_a3_ada', g, q);
    for (let d = 0; d < 6; d++) waitFor(g, q, SH, d % 2 ? 23 : 10);
    expect(g.flags.ks_ada).toBeUndefined();
    expect(stage(g, 'q_a3_ride')).toBe('notice');
    for (const h of HANDS) expect(here(g)).toContain(h);
    expect(text('d_a3_ada', g, q)).toContain('pen beside it');
  });

  it('a sheriff or a factor dead before Act 3 means no buyout: no notice, no hands, no ride', () => {
    for (const who of ['npc_sh_01', 'npc_sh_04']) {
      const { g, q } = town('choir');
      kill(g, who);
      expect(cond(trigger(SH, 'a3_arrive_w').if, g), who).toBe(false);
      for (const h of HANDS) expect(here(g)).not.toContain(h);
      expect(text('d_a3_notice', g, q)).toContain('the Dogs\' tithe');
      if (who === 'npc_sh_04') expect(view('d_a3_ada', g, q).text).not.toContain('pen beside it');
      expect(g.world.quests.q_a3_ride).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------- the investigation

describe('B6e: the investigation', () => {
  it('Ada: why she would sign (by the rifles, the deputy and the water Acts 1–2 left her), what the paper says, why she has waited', () => {
    const a = arrive(town('prepared'));
    expect(options('d_a3_ada', a.g, a.q)).toEqual(expect.arrayContaining(['Why would you sign it?', 'What does the paper say that the door doesn\'t?', 'Why haven\'t you signed it yet?']));
    const r = talk('d_a3_ada', a.g, a.q, ['Why would you sign it?']);
    expect(r.view()!.text).toContain('Nine rifles that shoot');
    expect(r.view()!.text).toContain('A deputy who reads');
    expect(r.view()!.text).toContain('the third one in that yard');
    expect(a.g.world.knowledge.a3_buyout_why).toBe(true);
    expect(a.g.world.quests.q_a3_ride.done).toContain('why');
    expect(options('d_a3_ada', a.g, a.q)).not.toContain('Why would you sign it?');
    talk('d_a3_ada', a.g, a.q, ['What does the paper say', '(Go on.)', 'Why haven\'t you signed']);
    expect(a.g.world.knowledge).toMatchObject({ a3_buyout_read: true, a3_ada_waits: true });
    const b = arrive(town('hostile'));
    const why = talk('d_a3_ada', b.g, b.q, ['Why would you sign it?']).view()!.text;
    for (const s of ['Four rifles that shoot', 'No deputy.', 'Water I buy by the measure']) expect(why).toContain(s);
    expect(text('d_a3_ada', b.g, b.q)).toContain('coat over it that nobody has moved since spring');
  });

  it('Pike: three hundred Tolls of paper valued against a sheet on the Ninebridge floor; brought forward the morning after Openfield\'s night', () => {
    const a = arrive(town('choir'));
    const r = talk('d_a3_pike', a.g, a.q, ['What does the paper actually cost Shale?']);
    expect(r.view()!.text).toContain('Three hundred Tolls of paper');
    expect(r.view()!.text).toContain('SHALE — FAILS — two springs off');
    expect(r.view()!.text).toContain('declined in the spring');
    expect(a.g.world.knowledge).toMatchObject({ a3_buyout_terms: true, a3_buyout_sheet: true });
    talk('d_a3_pike', a.g, a.q, ['Why now?']);
    expect(a.g.world.knowledge.a3_buyout_forward).toBe(true);
    expect(options('d_a3_pike', a.g, a.q)).not.toContain('Why now?');
    // with Jonah dead the guild has billed its protection since
    const b = arrive(town('hostile'));
    expect(talk('d_a3_pike', b.g, b.q, ['What does the paper actually cost Shale?']).view()!.text).toContain('did not pay and did not refuse');
    // a player who has seen the back of Odile's sheet sees whose hand is behind the paper
    const c = arrive(town('choir', { knows: ['odile_counterparty'] }));
    expect(view('d_a3_pike', c.g, c.q).passives.map((p) => p.text).join(' ')).toContain('too even to be a hand');
    expect(view('d_a3_pike', a.g, a.q).passives).toEqual([]);
  });

  it('Pike names the broker at the rate (Barter 45; easier with the Dry Well\'s second book read); Mags owns up, and the player decides who tells Ada', () => {
    const a = arrive(town('choir'));
    exact(a.g, 'barter', 44);
    expect(talk('d_a3_pike', a.g, a.q, ['Who brokered it?']).view()!.text).toContain('A party in Shale, as per');
    expect(a.g.world.knowledge.a3_mags_hand).toBeUndefined();
    a.g.world.knowledge.mags_cooked = true;
    expect(view('d_a3_pike', a.g, a.q).options.find((o) => o.text === 'Who brokered it?')!.checkLabel).toBe('Barter 30');
    expect(talk('d_a3_pike', a.g, a.q, ['Who brokered it?']).view()!.text).toContain('SETTLED — AS BROKERAGE — SHALE CONTRACT');
    expect(a.g.world.quests.q_a3_ride.done).toContain('broker');
    expect(options('d_a3_pike', a.g, a.q)).not.toContain('Who brokered it?');
    // Mags, told what the ledger says: she tells Ada herself
    const before = a.g.world.relations.npc_sh_03?.trust ?? 0;
    const r = talk('d_a3_mags', a.g, a.q, ['The Dry Well\'s account.']);
    expect(r.view()!.text).toContain('I bought her a way out');
    talk('d_a3_mags', a.g, a.q, ['The Dry Well\'s account.', 'Then tell her yourself']);
    expect(a.g.flags.a3_mags).toBe('told');
    expect(a.g.world.relations.npc_sh_03.trust).toBe(before + 10);
    expect(view('d_a3_ada', a.g, a.q).options.find((o) => o.text.startsWith('Stay.'))!.checkNotes.join(' ')).toContain('whose hand is in the paper');
    expect(options('d_a3_ada', a.g, a.q).some((o) => o.startsWith('Mags brokered it'))).toBe(false);
    // or it stays between them
    const b = arrive(town('choir', { knows: ['a3_mags_hand'] }));
    talk('d_a3_mags', b.g, b.q, ['The Dry Well\'s account.', 'It stays between us.']);
    expect(b.g.flags).toMatchObject({ a3_mags: 'kept', shale_room: true });
    // or the player tells Ada
    const c = arrive(town('choir', { knows: ['a3_mags_hand'] }));
    talk('d_a3_mags', c.g, c.q, ['The Dry Well\'s account.', 'She should hear it.']);
    expect(c.g.flags.a3_mags).toBeUndefined();
    talk('d_a3_ada', c.g, c.q, ['Mags brokered it.']);
    expect(c.g.flags.a3_mags).toBe('exposed');
    expect(text('d_a3_mags', c.g, c.q)).toContain('You told her.');
    // asked straight, without the ledger: after the door, Speech 45
    const d = arrive(town('choir', { knows: [] }));
    expect(options('d_a3_mags', d.g, d.q)).not.toContain('Who brokered it, Mags?');
    talk('d_a3_mags', d.g, d.q, ['You\'ve seen the sheriff\'s door.']);
    exact(d.g, 'speech', 45);
    expect(talk('d_a3_mags', d.g, d.q, ['Who brokered it, Mags?']).view()!.text).toContain('Course it\'s me');
    expect(d.g.world.knowledge.a3_mags_hand).toBe(true);
  });

  it('Teo reads the figures: a living town owes half; a dying one owes what it is asked', () => {
    const a = arrive(town('choir', { flags: { teo_freed: true } }));
    expect(options('d_a3_mags', a.g, a.q)).not.toContain('Teo. You read numbers. Read this for me.');
    talk('d_a3_pike', a.g, a.q, ['What does the paper actually cost Shale?']);
    const r = talk('d_a3_mags', a.g, a.q, ['Teo. You read numbers.']);
    expect(r.view()!.speaker).toBe('npc_sh_07');
    expect(r.view()!.text).toContain('priced on a corpse');
    expect(a.g.world.knowledge.a3_buyout_priced).toBe(true);
    const b = arrive(town('choir', { flags: { teo_freed: true, shale_withers: true }, knows: ['a3_buyout_terms'] }));
    expect(talk('d_a3_mags', b.g, b.q, ['Teo. You read numbers.']).view()!.text).toContain('It\'s a fair price');
    expect(b.g.world.knowledge).toMatchObject({ a3_buyout_fair: true });
    expect(b.g.world.knowledge.a3_buyout_priced).toBeUndefined();
    // no Teo, no reading
    const c = arrive(town('choir', { knows: ['a3_buyout_terms'] }));
    expect(options('d_a3_mags', c.g, c.q).some((o) => o.startsWith('Teo.'))).toBe(false);
  });

  it('Issa says out loud the one case in which she cannot keep Ada standing', () => {
    const a = arrive(town('hostile'));
    expect(cond(ADA_FALLS, a.g)).toBe(true);
    expect(talk('d_a3_militia', a.g, a.q, ['If it came to the guild\'s men']).view()!.text).toContain('I don\'t know that I can keep her standing');
    expect(a.g.world.knowledge.a3_buyout_street).toBe(true);
    const b = arrive(town('prepared'));
    expect(talk('d_a3_militia', b.g, b.q, ['If it came to the guild\'s men']).view()!.text).toContain('We keep her standing');
    const c = arrive(town('choir'));
    expect(talk('d_a3_militia', c.g, c.q, ['If it came to the guild\'s men']).view()!.text).toContain('the deputy would be in front of her');
  });
});

// ---------------------------------------------------------------- the routes

describe('B6e: every route, each to its outcome', () => {
  it('T: Ada talked into staying (Speech 50 with the plan\'s modifiers and the player\'s own); a failure changes nothing', () => {
    const a = arrive(town('prepared'));
    const stay = view('d_a3_ada', a.g, a.q).options.find((o) => o.text.startsWith('Stay.'))!;
    expect(stay.checkMet).toBe(true);
    for (const why of ['Jonah lived his month', 'nine rifles shoot now', 'the page that proves Pike paid', 'the pumps run', 'one of her militia']) expect(stay.checkNotes.join(' ')).toContain(why);
    const r = talk('d_a3_ada', a.g, a.q, ['Stay.']);
    expect(r.view()!.text).toContain('Return to sender');
    kept(a, 'refused');
    expect(text('d_a3_ada', a.g, a.q)).toContain('neither do I');
    const b = arrive(town('hostile'));
    const no = view('d_a3_ada', b.g, b.q).options.find((o) => o.text.startsWith('Stay.'))!;
    expect(no.checkLabel).toBe('Speech 65');
    expect(no.checkMet).toBe(false);
    expect(no.checkNotes.join(' ')).toContain('the town broke when Jonah died');
    expect(talk('d_a3_ada', b.g, b.q, ['Stay.']).view()!.text).toContain('still the same street');
    expect(b.g.flags.ks_ada).toBeUndefined();
    expect(stage(b.g, 'q_a3_ride')).toBe('notice');
    // the conditions, not a lockout: the same hostile town, argued by a better speaker
    exact(b.g, 'speech', 65);
    talk('d_a3_ada', b.g, b.q, ['Stay.']);
    kept(b, 'refused');
  });

  it('B: the town\'s paper paid (300), or repriced on a living town by Odile or by Teo\'s figures (150); nothing to pay once Odile\'s sheet is torn', () => {
    const a = arrive(town('choir'));
    expect(options('d_a3_pike', a.g, a.q).some((o) => o.startsWith('(Pay the town'))).toBe(false); // the sum not yet asked
    talk('d_a3_pike', a.g, a.q, ['What does the paper actually cost Shale?']);
    const t0 = tolls(a.g), m0 = a.g.world.relations.npc_sh_03?.trust ?? 0;
    expect(talk('d_a3_pike', a.g, a.q, ['(Pay the town\'s paper. 300 Tolls)']).view()!.text).toContain('has nothing to stand on');
    expect(tolls(a.g)).toBe(t0 - 300);
    expect(a.g.world.relations.npc_sh_03.trust).toBe(m0 + 15);
    kept(a, 'paid');
    expect(text('d_a3_notice', a.g, a.q)).toContain('SETTLED. AS PER.');
    expect(text('d_a3_ada', a.g, a.q)).toContain('You paid my town\'s paper');
    // Odile reprices it
    const b = arrive(town('choir', { companions: { odile: 'party' }, knows: ['a3_buyout_terms', 'a3_buyout_sheet'] }));
    const t1 = tolls(b.g);
    expect(talk('d_a3_pike', b.g, b.q, ['Odile. You wrote the instrument.']).view()!.text).toContain('One hundred and fifty');
    talk('d_a3_pike', b.g, b.q, ['Odile. You wrote the instrument.', '(Pay it. 150 Tolls)']);
    expect(tolls(b.g)).toBe(t1 - 150);
    kept(b, 'paid');
    // Teo's figures, put to Pike by the player (Barter 50, −10 with the pumps running)
    const c = arrive(town('choir', { flags: { teo_freed: true } }));
    talk('d_a3_pike', c.g, c.q, ['What does the paper actually cost Shale?']);
    talk('d_a3_mags', c.g, c.q, ['Teo. You read numbers.']);
    exact(c.g, 'barter', 39);
    const fig = view('d_a3_pike', c.g, c.q).options.find((o) => o.text.startsWith('(Put Teo Marsh'))!;
    expect(fig.checkLabel).toBe('Barter 40');
    expect(talk('d_a3_pike', c.g, c.q, ['(Put Teo Marsh']).view()!.text).toContain('because the buyer is clever');
    exact(c.g, 'barter', 40);
    talk('d_a3_pike', c.g, c.q, ['(Put Teo Marsh', '(Pay it. 150 Tolls)']);
    kept(c, 'paid');
    // torn by the woman who wrote it: the contract cannot be valued
    const d = arrive(town('prepared'));
    expect(d.g.flags.odile_sheet).toBe('torn');
    const t2 = tolls(d.g);
    talk('d_a3_pike', d.g, d.q, ['What does the paper actually cost Shale?']);
    expect(talk('d_a3_pike', d.g, d.q, ['The sheet your price rests on is ash.']).view()!.text).toContain('Unwound. By its writer');
    expect(tolls(d.g)).toBe(t2);
    kept(d, 'void');
    expect(text('d_a3_ada', d.g, d.q)).toContain('relieved to lose');
  });

  it('K: the sheet torn at Pike\'s counter (carried by the player, by Odile, or in Nine\'s second ledger); the Tollhouse page beside his ledger, or in Ada\'s hand', () => {
    const KNOW = { knows: ['a3_buyout_terms', 'a3_buyout_sheet'] };
    const a = arrive(town('choir', { ...KNOW, flags: { odile_sheet: 'player' } }));
    talk('d_a3_pike', a.g, a.q, ['(Lay Odile\'s sheet on his ledger']);
    expect(a.g.flags.odile_sheet).toBe('torn');
    kept(a, 'void');
    const b = arrive(town('choir', { ...KNOW, companions: { odile: 'party' }, approval: { odile: 30 } }));
    expect(b.g.flags.odile_sheet).toBe('kept');
    talk('d_a3_pike', b.g, b.q, ['Odile. You wrote the instrument.', 'Odile. The sheet.']);
    expect(b.g.flags.odile_sheet).toBe('torn');
    expect(b.g.world.approval[ODILE]).toBe(40);
    kept(b, 'void');
    const c = arrive(town('choir', { ...KNOW, flags: { odile_sheet: 'nine' } }));
    expect(c.g.world.party).toContain(NINE);
    talk('d_a3_pike', c.g, c.q, ['Nine. The sheet in your other ledger.']);
    kept(c, 'void');
    // the page in the player's pack: Pike withdraws rather than have Ninebridge read it
    const d = arrive(town('choir', { items: ['k_ledger_page'], flags: { th_page_taken: true } }));
    expect(talk('d_a3_pike', d.g, d.q, ['(Lay the Tollhouse page']).view()!.text).toContain('WITHDRAWN');
    expect(has(d.g, 'k_ledger_page')).toBe(true);
    kept(d, 'exposed');
    // the page Ada has kept since Act 1: she walks it across herself
    const e = arrive(town('choir', { flags: { ledger_shown_ada: true } }));
    expect(talk('d_a3_ada', e.g, e.q, ['You\'ve still got Post Nine\'s page.']).view()!.text).toContain('He isn\'t getting it');
    kept(e, 'exposed');
    // sold back to Pike in Act 1, and burned: no page to lay anywhere
    const f = arrive(town('hostile'));
    expect(options('d_a3_ada', f.g, f.q).some((o) => o.startsWith('You\'ve still got'))).toBe(false);
    expect(options('d_a3_pike', f.g, f.q).some((o) => o.startsWith('(Lay the Tollhouse page'))).toBe(false);
  });

  it('S: the guild\'s copy out of Pike\'s strongbox at night (Security 50), and Ada burns it; by day, or with clumsier hands, nothing', () => {
    const a = arrive(town('choir'));
    hour(a.g, 10);
    expect(options('d_a3_safe', a.g, a.q)).toEqual(['(Leave it.)']);
    expect(text('d_a3_safe', a.g, a.q)).toContain('Pike sits three feet from it');
    hour(a.g, 23);
    exact(a.g, 'security', 49);
    expect(talk('d_a3_safe', a.g, a.q, ['(Work the locks.)']).view()!.text).toContain('does not give');
    expect(has(a.g, 'k_a3_contract')).toBe(false);
    exact(a.g, 'security', 50);
    talk('d_a3_safe', a.g, a.q, ['(Work the locks.)']);
    expect(has(a.g, 'k_a3_contract')).toBe(true);
    expect(a.g.flags.a3_sh_safe).toBe(true);
    expect(text('d_a3_safe', a.g, a.q)).toContain('lighter than it was');
    hour(a.g, 10);
    expect(text('d_a3_pike', a.g, a.q)).toContain('strongbox was opened in the night');
    expect(a.g.flags.ks_ada).toBeUndefined(); // nothing until it is in Ada's hands
    expect(talk('d_a3_ada', a.g, a.q, ['(Put the guild\'s own copy']).view()!.text).toContain('the first law I\'ve broken');
    expect(has(a.g, 'k_a3_contract')).toBe(false);
    kept(a, 'robbed');
    expect(text('d_a3_pike', a.g, a.q)).toContain('no longer a contract to pursue it under');
  });

  it('F without a shot: the militia counted off the street (nine rifles that shoot, or a Presence check with four)', () => {
    const a = arrive(town('prepared'));
    const r = talk('d_a3_hands', a.g, a.q, ['Get off Shale\'s street.', '(Call the militia out.)']);
    expect(r.view()!.text).toContain('nine of them');
    expect(r.view()!.text).toContain('Jonah Reese comes last');
    expect(r.view()!.text).toContain('walked down with Wren Calloway');
    talk('d_a3_hands', a.g, a.q, ['Get off Shale\'s street.', '(Call the militia out.)', '(Tell them to count.)']);
    expect(a.g.flags.a3_sh_fight).toBeUndefined();
    kept(a, 'put_off');
    expect(text('d_a3_ada', a.g, a.q)).toContain('count something that wasn\'t money');
    // four rifles: Presence 7 (6 here: Shale's hound watches them from the yard), eased by Ilya's rifle at the end of the line
    const b = arrive(town('choir'));
    expect(b.g.flags.hound_outcome).toBe('shale');
    exactAttr(b.g, 'presence', 5);
    expect(talk('d_a3_hands', b.g, b.q, ['Get off Shale\'s street.', '(Call the militia out.)', '(Tell them to count.)']).view()!.text).toContain('I count four');
    expect(b.g.flags.ks_ada).toBeUndefined();
    exactAttr(b.g, 'presence', 6);
    talk('d_a3_hands', b.g, b.q, ['Get off Shale\'s street.', '(Call the militia out.)', '(Tell them to count.)']);
    kept(b, 'put_off');
    const c = arrive(town('choir', { companions: { ilya: 'party' } }));
    exactAttr(c.g, 'presence', 4);
    expect(talk('d_a3_hands', c.g, c.q, ['Get off Shale\'s street.', '(Call the militia out.)']).view()!.options.find((o) => o.text === '(Tell them to count.)')!.checkLabel).toBe('Presence 4');
    talk('d_a3_hands', c.g, c.q, ['Get off Shale\'s street.', '(Call the militia out.)', '(Tell them to count.)']);
    kept(c, 'put_off');
    // with Issa gone, one of the militia can still call them out; with neither, there is nobody to call
    const d = arrive(town('choir', { members: { shale_militia: 'volunteer' } }));
    kill(d.g, 'npc_sh_11');
    expect(talk('d_a3_hands', d.g, d.q, ['Get off Shale\'s street.']).view()!.options.map((o) => o.text)).toContain('(Call the militia out.)');
    const e = arrive(town('choir'));
    kill(e.g, 'npc_sh_11');
    expect(talk('d_a3_hands', e.g, e.q, ['Get off Shale\'s street.']).view()!.options.map((o) => o.text)).not.toContain('(Call the militia out.)');
  });

  it('F with shots: the hands drawn on; the militia fight beside the player; Ada is out in the street; the street tells how it ended', () => {
    const events: string[] = [];
    const a = arrive(town('choir', { host: { event: (n) => { events.push(n); } } }));
    talk('d_a3_hands', a.g, a.q, ['Get off Shale\'s street.', '(Put your hand on your weapon.)', '(Draw.)']);
    expect(events).toContain('combat');
    expect(a.g.flags).toMatchObject({ a3_sh_fight: true, a3_pike: 'put_off' });
    for (const h of HANDS) expect(cond(NPCS[h].hostileIf, a.g), h).toBe(true);
    for (const m of ['npc_sh_11', 'npc_sh_16']) expect(cond(NPCS[m].ally, a.g), m).toBe(true);
    for (const m of ['npc_sh_01', 'npc_sh_02']) expect(cond(NPCS[m].ally, a.g), `${m} is not a combatant`).toBe(false);
    expect(here(a.g)).not.toContain('npc_sh_01_a3');
    expect(cond(trigger(SH, 'a3_street_after').if, a.g)).toBe(false);
    expect(text('d_a3_pike', a.g, a.q)).toContain('breach of the peace');
    expect(text('d_a3_mags', a.g, a.q)).toContain('Not now, love');
    expect(text('d_a3_hands', a.g, a.q)).toContain('past talking');
    expect(a.g.flags.ks_ada).toBeUndefined();
    for (const h of HANDS) kill(a.g, h);
    expect(cond(trigger(SH, 'a3_street_after').if, a.g)).toBe(true);
    expect(trigger(SH, 'a3_street_after').effects).toEqual([{ event: 'dialogue', data: { tree: 'd_a3_street', name: 'Shale' } }]);
    expect(talk('d_a3_street', a.g, a.q).view()!.text).toContain('Jonah Reese in front of her');
    talk('d_a3_street', a.g, a.q, ['(Go on.)']);
    kept(a, 'put_off');
    expect(a.g.flags.a3_sh_after).toBe(true);
    expect(cond(trigger(SH, 'a3_street_after').if, a.g)).toBe(false);
    expect(text('d_a3_ada', a.g, a.q)).toContain('Issa says you stood in the street');
    // Issa tells the same street, if she is found first
    const b = arrive(town('prepared'));
    talk('d_a3_hands', b.g, b.q, ['Get off Shale\'s street.', '(Put your hand on your weapon.)', '(Draw.)']);
    expect(text('d_a3_militia', b.g, b.q)).toContain('Not now');
    for (const h of HANDS) kill(b.g, h);
    expect(talk('d_a3_militia', b.g, b.q).view()!.text).toContain('Jonah Reese in front of her');
    talk('d_a3_militia', b.g, b.q, ['(Go on.)']);
    kept(b, 'put_off');
  });

  it('or she signs: Ada rides the forty yards to Pike\'s post; the guild holds the town, or the Dogs ride in, or it empties east', () => {
    const a = arrive(town('choir'));
    talk('d_a3_ada', a.g, a.q, ['Sign it, then.', 'Wait. Not yet.']);
    expect(a.g.flags.ks_ada).toBeUndefined();
    const r = talk('d_a3_ada', a.g, a.q, ['Sign it, then.', '(Watch her go.)']);
    expect(r.view()!.text).toContain('a sheriff rides out');
    expect(a.g.flags).toMatchObject({ ks_ada: 'resigns', a3_pike: 'signed', a3_shale: 'company', a3_mags: 'runs' });
    expect(stage(a.g, 'q_a3_ride')).toBe('resigned');
    expect(status(a.g, 'q_a3_ride')).toBe('done');
    const ids = here(a.g);
    for (const id of ['npc_sh_01_step', 'npc_a3_g7_desk', 'npc_a3_g8_door']) expect(ids).toContain(id);
    for (const id of ['npc_sh_01_a3', ...HANDS]) expect(ids).not.toContain(id);
    expect(text('d_a3_notice', a.g, a.q)).toContain('TOLLMEN — POST NINE-WEST — PROTECTION');
    expect(text('d_a3_ada', a.g, a.q)).toContain('Pensioner');
    expect(text('d_a3_mags', a.g, a.q)).toContain('Guild bar now');
    expect(text('d_a3_pike', a.g, a.q)).toContain('pension is paid on the first of the month');
    expect(text('d_a3_hands', a.g, a.q)).toContain('from the sheriff\'s chair');
    expect(text('d_a3_militia', a.g, a.q)).toContain('She rode out');
    // the coup's Dogs ride in
    const b = arrive(town('choir', { flags: { rd_coup: true } }));
    talk('d_a3_ada', b.g, b.q, ['Sign it, then.', '(Watch her go.)']);
    expect(b.g.flags).toMatchObject({ ks_ada: 'resigns', a3_shale: 'dogs' });
    expect(stage(b.g, 'q_a3_ride')).toBe('dogs');
    expect(here(b.g)).toEqual(expect.arrayContaining(['npc_a3_g13', 'npc_a3_g14']));
    expect(here(b.g)).not.toContain('npc_sh_01_step');
    expect(text('d_a3_notice', b.g, b.q)).toContain('ASK KADE');
    b.g.flags.vasha_dead = true;
    expect(text('d_a3_notice', b.g, b.q)).not.toContain('KADE');
    // the pumps on their clock: the town empties
    const c = arrive(town('hostile'));
    talk('d_a3_ada', c.g, c.q, ['Sign it, then.', '(Watch her go.)']);
    expect(c.g.flags).toMatchObject({ ks_ada: 'resigns', a3_shale: 'abandoned' });
    expect(stage(c.g, 'q_a3_ride')).toBe('abandoned');
    expect(status(c.g, 'q_a3_ride')).toBe('failed');
    expect(here(c.g)).not.toContain('npc_sh_11_a3');
    expect(text('d_a3_notice', c.g, c.q)).toContain('GONE EAST');
  });
});

// ---------------------------------------------------------------- Ada's death, and what holds

describe('B6e: Ada dies only under the stated conditions, and every outcome holds', () => {
  it('in the fight she dies only when the militia never drilled and Jonah is dead; the town then goes free, to the Dogs, or empty', () => {
    for (const drilled of [true, false]) for (const jonahDead of [true, false]) {
      const a = arrive(town('choir', { flags: { militia_drilled: drilled, jonah_dead: jonahDead, jonah_lived: !jonahDead } }));
      const street = fight(a);
      const dies = !drilled && jonahDead;
      expect(a.g.flags.ks_ada, `drilled ${drilled}, Jonah dead ${jonahDead}`).toBe(dies ? 'dead' : 'stays');
      expect(street).toContain(dies ? 'nobody at her shoulder' : 'puts the revolver away');
    }
    for (const [flags, fate, stageId] of [[{}, 'free', 'dead'], [{ rd_coup: true }, 'dogs', 'dogs'], [{ shale_withers: true, rd_coup: true }, 'abandoned', 'abandoned']] as const) {
      const a = arrive(town('choir', { flags: { militia_drilled: false, jonah_dead: true, jonah_lived: false, ...flags } }));
      fight(a);
      expect(a.g.flags).toMatchObject({ ks_ada: 'dead', a3_shale: fate, a3_sh_after: true });
      expect(stage(a.g, 'q_a3_ride')).toBe(stageId);
      expect(status(a.g, 'q_a3_ride')).toBe('failed');
      expect(here(a.g)).not.toContain('npc_sh_01_a3');
      if (fate === 'free') {
        expect(text('d_a3_notice', a.g, a.q)).toContain('SHE STOOD IN THE STREET');
        expect(text('d_a3_militia', a.g, a.q)).toContain('Issa wears the star now');
      }
    }
    // the hostile Acts 1–2 are the case itself
    const h = arrive(town('hostile'));
    fight(h);
    expect(h.g.flags).toMatchObject({ ks_ada: 'dead', a3_shale: 'abandoned' });
  });

  it('no other route can kill her: only the street\'s three burials set it, and each is reached only through ADA_FALLS', () => {
    const sets = (effects: Effect[] | undefined) => (effects ?? []).some((e) => 'set' in e && e.set === 'ks_ada' && e.value === 'dead');
    const deadly: string[] = [];
    for (const d of A3_SHALE_DIALOGUES) for (const [nid, n] of Object.entries(d.nodes)) {
      if (sets(n.effects)) deadly.push(`${d.id}/${nid}`);
      for (const o of n.options) expect(sets(o.effects), `${d.id}/${nid}: an option sets it`).toBe(false);
      for (const o of n.options) if (o.next && /^fell_/.test(o.next)) {
        const gated = (c: Cond | undefined): boolean => !!c && (c === ADA_FALLS || ('all' in c && c.all.some(gated)));
        expect(gated(o.if), `${d.id}/${nid} → ${o.next}`).toBe(true);
      }
    }
    expect(deadly.sort()).toEqual(['d_a3_militia/fell_abandoned', 'd_a3_militia/fell_dogs', 'd_a3_militia/fell_free', 'd_a3_street/fell_abandoned', 'd_a3_street/fell_dogs', 'd_a3_street/fell_free']);
  });

  it('the hostile Acts 1–2 leave the street, the strongbox and her signature, and no way that needs what they took', () => {
    const a = arrive(town('hostile'));
    const ada = options('d_a3_ada', a.g, a.q);
    expect(ada.some((o) => o.startsWith('You\'ve still got'))).toBe(false);
    talk('d_a3_pike', a.g, a.q, ['What does the paper actually cost Shale?']);
    const pike = options('d_a3_pike', a.g, a.q);
    for (const p of ['(Pay the town', 'Odile.', 'The sheet your price', '(Lay Odile', '(Lay the Tollhouse', '(Put Teo']) expect(pike.some((o) => o.startsWith(p)), p).toBe(false);
    expect(talk('d_a3_hands', a.g, a.q, ['Get off Shale\'s street.']).view()!.options.map((o) => o.text)).toEqual(expect.arrayContaining(['(Call the militia out.)', '(Put your hand on your weapon.)']));
    hour(a.g, 23);
    expect(options('d_a3_safe', a.g, a.q)).toContain('(Work the locks.)');
    expect(ada).toContain('Sign it, then. It\'s your town and your life.');
    // the routes are conditions, not lockouts: give the same player the Tolls and the page is still gone, but the paper can be paid
    a.g.pc.inventory.tolls = 300;
    expect(options('d_a3_pike', a.g, a.q)).toContain('(Pay the town\'s paper. 300 Tolls)');
  });

  it('the open buyout survives a save and a load; a settled one stays settled, and no tree loops back to the ride', async () => {
    const a = arrive(town('choir'));
    talk('d_a3_ada', a.g, a.q, ['Why would you sign it?']);
    const b = await saveAndLoad(a.g);
    expect(stage(b.g, 'q_a3_ride')).toBe('notice');
    expect(b.g.world.knowledge.a3_buyout_why).toBe(true);
    const opts = options('d_a3_ada', b.g, b.q);
    expect(opts).not.toContain('Why would you sign it?');
    expect(opts.some((o) => o.startsWith('Stay.'))).toBe(true);
    talk('d_a3_ada', b.g, b.q, ['Stay.']);
    const c = await saveAndLoad(b.g);
    kept(c, 'refused');
    for (const tree of ['d_a3_ada', 'd_a3_pike', 'd_a3_mags', 'd_a3_hands', 'd_a3_militia', 'd_a3_jonah']) {
      const o = options(tree, c.g, c.q);
      for (const route of ['Stay.', 'Sign it', '(Pay the town', 'Get off Shale', 'Shale isn\'t for sale']) expect(o.some((x) => x.startsWith(route)), `${tree}: ${route}`).toBe(false);
    }
    expect(cond(trigger(SH, 'a3_arrive_w').if, c.g)).toBe(false);
    for (const h of HANDS) expect(here(c.g)).not.toContain(h);
  });

  it('the quest declares seven routes, five of them without a shot fired, and every node keeps an again for the conversation\'s return', () => {
    const routes = QUESTS.q_a3_ride.routes!;
    expect(routes.map((r) => r.id)).toEqual(['stays', 'paid', 'void', 'page', 'safe', 'street', 'signed']);
    expect(routes.filter((r) => r.kind !== 'fight').length).toBeGreaterThanOrEqual(5);
    for (const d of A3_SHALE_DIALOGUES) {
      const own = Object.entries(d.nodes).filter(([nid]) => !ACT1.some(([id, act1]) => id === d.id && nid in act1.nodes));
      for (const [nid, n] of own) expect(n.again, `${d.id}/${nid}`).toBeDefined();
      expect(DIALOGUES[d.id]).toBe(d);
    }
    // services stay services: the trade at Pike's counter is repeatable, the Act 1 menu still reachable from the bar
    const a = arrive(town('choir'));
    expect(options('d_a3_pike', a.g, a.q)).toContain('Stock.');
    expect(talk('d_a3_mags', a.g, a.q, ['Let\'s see what you\'ve got.']).view()!.text).toContain('Drink\'s on the house');
  });
});
