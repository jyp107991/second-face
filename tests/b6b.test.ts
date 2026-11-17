import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, QUESTS, SETTLEMENTS, WORLD_MAP, REGIONS, TRAITS, PERKS, CHROME } from '../src/content';
import {
  E_PREC, NINE, NINE_DEED, NINE_KEEPER_CITY, NINE_KEEPER_PLAYER, NINE_KEEPER_SELF, ON_SIDE, RECALL_OPEN, RESERVE_STAYED, TAMSIN, modValue,
} from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { test as cond, type Cond } from '../src/engine/world/logic';
import { actThree, hour, placed, saveAndLoad, stage, status, talk, trigger, view, type A3, type G, type Preset } from './a3_fixture';

/**
 * B6b — the fourth order's other papers, Unit 9's recall, and Reserve 9 at the Court of Accounts: the courier at the lane
 * to the Spire, the recall wardens at the Precinct gate (what the deed decides; every way of answering them), Nine hidden
 * outside the Wall and fetched back, and the Court's two Act 3 cases on its own bench with every ground, won and lost.
 */

const B6B = (id: string) => ['d_a3_courier', 'd_a3_recall', 'd_a3_nine_hid'].includes(id);
const set = (g: G, flags: Record<string, string | number | boolean>) => Object.assign(g.flags, flags);
const tolls = (g: G) => g.pc.inventory.tolls;
const ninePlacements = () => Object.values(MAPS).flatMap((m) => (m.npcs ?? []).filter((p) => p.def === NINE).map((p) => ({ map: m.id, p })));
const nineVisible = (g: G) => ninePlacements().filter(({ p }) => cond(p.if, g)).map(({ map, p }) => `${map}/${p.id ?? p.def}`);
const recallTrigger = () => trigger('md_precinct', 'a3_recall');
const wardensPlaced = (g: G) => ['npc_a3_g1', 'npc_a3_g2'].every((w) => cond(placed('md_precinct', w).if, g));
/** At the Precinct gate with Nine: the trigger fires the wardens' scene. */
function atGate(a: A3): DialogueRunner {
  a.g.locationId = 'md_precinct';
  expect(cond(recallTrigger().if, a.g), 'the recall trigger at the gate').toBe(true);
  expect(recallTrigger().effects).toEqual([{ event: 'dialogue', data: { tree: 'd_a3_recall', name: 'Recall wardens' } }]);
  return talk('d_a3_recall', a.g, a.q);
}
const opts = (r: DialogueRunner) => r.view()!.options.map((o) => o.text);
const pick = (r: DialogueRunner, a: A3, text: string) => {
  const o = r.view()!.options.find((x) => x.text.startsWith(text) && !x.locked);
  if (!o) throw new Error(`no option "${text}" in [${opts(r).join(' | ')}]`);
  r.choose(o.id);
  a.q.update();
  return r;
};
/** A city-titled Nine travelling with a prepared player (the deed names the city). */
const cityNine = (over: Parameters<typeof actThree>[1] = {}) => actThree('prepared', { ...over, flags: { nine_deed: 'city', prec_unit_keeper: false, ...(over.flags ?? {}) } });

// ---------------------------------------------------------------- the courier

describe('B6b: the courier at the lane to the Spire', () => {
  it('is at her post once the order has come, and not before; she points to the Court and to the drop', () => {
    const eve = actThree('truce', { point: 'eve' });
    expect(cond(placed('md_precinct', 'npc_a3_01').if, eve.g)).toBe(false);
    const { g, q } = actThree('truce');
    expect(cond(placed('md_precinct', 'npc_a3_01').if, g)).toBe(true);
    expect(view('d_a3_courier', g, q).text).toContain('Selma Ruud');
    talk('d_a3_courier', g, q, ['Can an order like that be answered?']);
    expect(g.world.knowledge.a3_court_heard).toBe(true);
    expect(g.world.quests.q_ca_court).toBeDefined();
    talk('d_a3_courier', g, q, ['Who gave you the order to carry?']);
    expect(g.world.knowledge.a3_drop_heard).toBe(true);
    // each topic once; the second visit opens on the hub
    const hub = view('d_a3_courier', g, q);
    expect(hub.text).toContain('Designate');
    expect(hub.options.map((o) => o.text)).not.toContain('Can an order like that be answered?');
    expect(hub.options.map((o) => o.text)).not.toContain('Who gave you the order to carry?');
  });

  it('carries a keeper\'s answer: Nine, its own keeper, declines by post; a citizen keeper refuses by post; the city\'s unit has no answer to send', () => {
    const a = actThree('prepared');
    expect(cond(NINE_KEEPER_SELF, a.g)).toBe(true);
    expect(view('d_a3_courier', a.g, a.q).options.map((o) => o.text).some((t) => t.startsWith('(Hand Nine the pen'))).toBe(false);
    const r = talk('d_a3_courier', a.g, a.q, ['There was a notice for Nine', '(Hand Nine the pen.']);
    expect(r.view()!.text).toContain('THE KEEPER OF UNIT 9 DECLINES TO PRESENT THE UNIT');
    expect(a.g.flags.a3_recall).toBe('declined');
    expect(stage(a.g, 'q_a3_recall')).toBe('declined');
    expect(status(a.g, 'q_a3_recall')).toBe('done');
    expect(a.g.world.party).toContain(NINE);
    expect(wardensPlaced(a.g)).toBe(false);

    const b = actThree('choir');
    expect(cond(NINE_KEEPER_PLAYER, b.g)).toBe(true);
    talk('d_a3_courier', b.g, b.q, ['There was a notice for Nine', '(Write the keeper\'s answer']);
    expect(b.g.flags.a3_recall).toBe('stayed');
    expect(stage(b.g, 'q_a3_recall')).toBe('stayed');

    const c = cityNine();
    const t = talk('d_a3_courier', c.g, c.q, ['There was a notice for Nine']).view()!.options.map((o) => o.text);
    expect(t.some((x) => x.startsWith('(Hand Nine') || x.startsWith('(Write the keeper'))).toBe(false);
  });
});

// ---------------------------------------------------------------- whose unit it is

describe('B6b: whose unit it is when the city recalls it (the schedule reads the register)', () => {
  const keeper = (flags: Record<string, string | boolean>): string => {
    const { g } = actThree('truce', { point: 'eve', flags: { nine_deed: false, nine_deed_how: false, nine_deed_made: false, ...flags } });
    return modValue(g, NINE_DEED);
  };
  it('an Act 3 outcome first, then the Court\'s registration, then a lawfully made deed; anything else is the city\'s', () => {
    expect(keeper({ nine_deed: 'self', nine_deed_how: 'witnessed' })).toBe('self');
    expect(keeper({ nine_deed: 'self', nine_deed_how: 'bought' })).toBe('self');
    expect(keeper({ nine_deed: 'self', nine_deed_how: 'forged' })).toBe('city');
    expect(keeper({ nine_deed: 'player', nine_deed_how: 'bought' })).toBe('player');
    expect(keeper({ nine_deed: 'player', nine_deed_how: 'forged' })).toBe('city');
    expect(keeper({ nine_deed: 'city', nine_deed_how: 'witnessed' })).toBe('city');
    expect(keeper({})).toBe('city');
    expect(keeper({ nine_deed: 'self', nine_deed_how: 'forged', ca_deed: 'irregular' })).toBe('self');
    expect(keeper({ nine_deed: 'self', nine_deed_how: 'witnessed', ca_deed: 'self' })).toBe('self');
    expect(keeper({ nine_deed: 'player', nine_deed_how: 'witnessed', ca_deed: 'citizen' })).toBe('player');
    expect(keeper({ nine_deed: 'city', nine_deed_how: 'witnessed', ca_deed: 'returned' })).toBe('city');
    expect(keeper({ nine_deed: 'self', nine_deed_how: 'forged', ca_deed: 'voided', nine_deed_void: true })).toBe('city');
    expect(keeper({ nine_deed: 'city', ca_deed: 'returned', a3_nine_keeper: 'player' })).toBe('player');
    expect(keeper({ nine_deed: 'city', a3_nine_keeper: 'self' })).toBe('self');
    // the three are exclusive
    for (const f of [{ nine_deed: 'self', nine_deed_how: 'witnessed' }, { nine_deed: 'player', nine_deed_how: 'bought' }, {}]) {
      const { g } = actThree('truce', { point: 'eve', flags: { nine_deed: false, nine_deed_how: false, ...f } });
      expect([NINE_KEEPER_SELF, NINE_KEEPER_PLAYER, NINE_KEEPER_CITY].filter((c) => cond(c, g))).toHaveLength(1);
    }
  });

  it('the wardens wait at the gate only while the recall is open, and stop Nine only when it comes through with the player', () => {
    const eve = actThree('prepared', { point: 'open' });
    expect(wardensPlaced(eve.g)).toBe(false);
    const a = actThree('prepared');
    expect(cond(RECALL_OPEN, a.g)).toBe(true);
    expect(wardensPlaced(a.g)).toBe(true);
    expect(cond(recallTrigger().if, a.g)).toBe(true);
    a.g.world.party = a.g.world.party.filter((p) => p !== NINE);
    expect(cond(recallTrigger().if, a.g), 'no Nine, no stop').toBe(false);
    expect(wardensPlaced(a.g), 'but they still wait').toBe(true);
    // a Nine never met is never recalled: no wardens, no trigger
    const h = actThree('hostile');
    expect(wardensPlaced(h.g) || cond(recallTrigger().if, h.g)).toBe(false);
  });
});

// ---------------------------------------------------------------- the gate

describe('B6b: every way of answering the recall wardens at the gate', () => {
  it('its own keeper declines: the city\'s first refused order from one of its units', () => {
    const a = actThree('prepared');
    const r = atGate(a);
    expect(r.view()!.text).toContain('The keeper of Unit 9 is Unit 9');
    expect(opts(r)).toEqual(['(Let Nine answer for itself.)', 'This goes before the Court of Accounts before it goes anywhere.', 'Not today.']);
    pick(r, a, '(Let Nine answer');
    expect(a.g.flags.a3_recall).toBe('declined');
    expect(a.g.world.party).toContain(NINE);
    expect(cond(ON_SIDE('nine'), a.g)).toBe(true);
    expect(a.g.world.decisions.some((d) => d.id === 'a3_recall_declined')).toBe(true);
    expect(wardensPlaced(a.g) || cond(recallTrigger().if, a.g)).toBe(false);
    expect(status(a.g, 'q_a3_recall')).toBe('done');
  });

  it('a citizen keeper is asked: refuses (stays), or hands it over (disposed), with a step back from the last', () => {
    const a = actThree('choir');
    const r = atGate(a);
    expect(r.view()!.text).toContain('The keeper of Unit 9 is a citizen. You.');
    expect(opts(r)).toEqual(['No. I\'m its keeper, and it stays with me.', 'Go with them, Nine.', 'This goes before the Court of Accounts before it goes anywhere.', 'Not today.']);
    pick(r, a, 'No. I\'m its keeper');
    expect(a.g.flags.a3_recall).toBe('stayed');
    expect(stage(a.g, 'q_a3_recall')).toBe('stayed');
    expect(a.g.world.party).toContain(NINE);

    const b = actThree('choir');
    const s = atGate(b);
    pick(s, b, 'Go with them, Nine.');
    expect(s.view()!.text).toContain('Is that an instruction from my keeper?');
    pick(s, b, 'No. Stay.');
    expect(b.g.flags.a3_recall).toBeUndefined();
    pick(s, b, 'Go with them, Nine.');
    pick(s, b, '(Yes.)');
    expect(b.g.flags.a3_recall).toBe('handed');
    expect(b.g.flags.nine_disposed).toBe(true);
    expect(b.g.world.party).not.toContain(NINE);
    expect(cond(ON_SIDE('nine'), b.g)).toBe(false);
    expect(status(b.g, 'q_a3_recall')).toBe('failed');
  });

  it('the city\'s unit: every way out is offered, and "not today" changes nothing (the wardens wait; nothing happens until the player answers)', () => {
    const a = cityNine();
    const r = atGate(a);
    expect(r.view()!.text).toContain('The title is the city\'s.');
    expect(opts(r)).toEqual([
      'This goes before the Court of Accounts before it goes anywhere.', 'Clause 9(b). A unit passes to a buyer at its assessed value. I\'m buying it. (121 Tolls)',
      '(While she reads the sheet, walk Nine back out through the gate.)', '(Step between them and Nine, with your hand on your weapon.)', '(Let them take it.)', 'Not today.',
    ]);
    const before = JSON.stringify(a.g.flags);
    pick(r, a, 'Not today.');
    expect(r.ended).toBe(true);
    expect(JSON.stringify({ ...a.g.flags })).toBe(JSON.stringify({ ...JSON.parse(before) }));
    for (let d = 0; d < 5; d++) hour(a.g, 7);
    expect(cond(recallTrigger().if, a.g), 'days later, still waiting at the gate').toBe(true);
    expect(a.g.flags.nine_disposed).toBeUndefined();
  });

  it('before the Court: the wardens stand aside for the ruling and stop nobody meanwhile', () => {
    const a = cityNine();
    pick(atGate(a), a, 'This goes before the Court');
    expect(a.g.flags.a3_recall_stay).toBe(true);
    expect(a.g.world.knowledge.a3_court_heard).toBe(true);
    expect(cond(recallTrigger().if, a.g)).toBe(false);
    expect(wardensPlaced(a.g)).toBe(true);
    const w = view('d_a3_recall', a.g, a.q);
    expect(w.text).toContain('We wait on the ruling');
    expect(w.options.map((o) => o.text)).not.toContain('This goes before the Court of Accounts before it goes anywhere.');
  });

  it('bought under clause 9(b) at assessed value: 121 Tolls, and the title is the player\'s', () => {
    const a = cityNine();
    const t0 = tolls(a.g);
    pick(atGate(a), a, 'Clause 9(b).');
    expect(tolls(a.g)).toBe(t0 - 121);
    expect(a.g.flags.a3_recall).toBe('bought');
    expect(cond(NINE_KEEPER_PLAYER, a.g)).toBe(true);
    expect(stage(a.g, 'q_a3_recall')).toBe('bought');
    const poor = cityNine({ tolls: 120 });
    expect(opts(atGate(poor)).some((t) => t.startsWith('Clause 9(b)'))).toBe(false);
  });

  it('hidden at Clover: out past the wardens, left on the halt\'s bench, written off; still on the player\'s side, placed there, and fetched back', () => {
    const a = cityNine();
    const t = a.g.minutes;
    const r = pick(atGate(a), a, '(While she reads the sheet');
    expect(r.view()!.text).toContain('every lens on the Wall faces in');
    expect(opts(r)).toEqual(['North along the Wall to Clover, the Loop\'s last halt.']);
    pick(r, a, 'North along the Wall');
    expect(a.g.flags.a3_recall).toBe('hidden');
    expect(a.g.flags.a3_nine_hid).toBe('clover');
    expect(a.g.world.party).not.toContain(NINE);
    expect(a.g.minutes).toBe(t + 90);
    expect(cond(ON_SIDE('nine'), a.g)).toBe(true);
    expect(nineVisible(a.g)).toEqual(['md_ring/npc_md_nine_clover']);
    expect(placed('md_ring', 'npc_md_nine_clover').dialogue).toBe('d_a3_nine_hid');
    expect(wardensPlaced(a.g)).toBe(false);
    expect(view('d_a3_nine_hid', a.g, a.q).text).toContain('written off');
    talk('d_a3_nine_hid', a.g, a.q, ['We\'re going.']);
    expect(a.g.world.party).toContain(NINE);
    expect(nineVisible(a.g)).toEqual([]);
  });

  it('hidden in the Hulls: offered only while the cradle runs, the Hulls stand and the player knows the way down', () => {
    const a = cityNine({ knows: ['dk_cradle_known'] });
    const r = pick(atGate(a), a, '(While she reads the sheet');
    expect(opts(r)).toContain('South by the river road to Carrick, and down to the Hulls.');
    pick(r, a, 'South by the river road');
    expect(a.g.flags.a3_nine_hid).toBe('hulls');
    expect(nineVisible(a.g)).toEqual(['md_docks/npc_md_nine_hulls']);
    expect(view('d_a3_nine_hid', a.g, a.q).text).toContain('forward hold');
    for (const flags of [{ dk_cradle: 'cut' }, { dk_hulls_empty: true }, { dk_hulls: 'cleared' }] as Record<string, string | boolean>[]) {
      const b = cityNine({ knows: ['dk_cradle_known'], flags });
      expect(opts(pick(atGate(b), b, '(While she reads the sheet')), JSON.stringify(flags)).toEqual(['North along the Wall to Clover, the Loop\'s last halt.']);
    }
    const c = cityNine();
    expect(opts(pick(atGate(c), c, '(While she reads the sheet'))).toHaveLength(1);
  });

  it('a slip that fails is seen: the young warden in the gate, the sneak gone, every other answer still there; the dark helps', () => {
    const a = cityNine({ skills: { stealth: 15 } });
    const r = atGate(a);
    const sneak = r.view()!.options.find((o) => o.text.startsWith('(While she reads'))!;
    expect(sneak.checkLabel).toBe('Stealth 40');
    expect(sneak.checkMet).toBe(false);
    pick(r, a, '(While she reads the sheet');
    expect(r.view()!.speaker).toBe('npc_a3_g2');
    expect(opts(r).some((t) => t.startsWith('(While she reads'))).toBe(false);
    expect(opts(r)).toContain('(Let them take it.)');
    expect(a.g.flags.a3_recall).toBeUndefined();

    const n = cityNine({ skills: { stealth: 15 } });
    hour(n.g, 22);
    const night = atGate(n).view()!.options.find((o) => o.text.startsWith('(While she reads'))!;
    expect(night.checkLabel).toBe('Stealth 30');
    expect(night.checkMet).toBe(true);
  });

  it('fought: the wardens drawn on, the fight starts, the wardens\' respect falls; they stay to be fought', () => {
    const events: string[] = [];
    const a = cityNine({ host: { event: (e) => events.push(e) }, rep: { wardens: 30 } });
    const r = pick(atGate(a), a, '(Step between them and Nine');
    expect(r.view()!.text).toContain('That is resistance');
    pick(r, a, '(Take your hand off it.)');
    expect(a.g.flags.a3_recall).toBeUndefined();
    pick(r, a, '(Step between them and Nine');
    pick(r, a, '(Draw.)');
    expect(events).toContain('combat');
    expect(a.g.flags.a3_recall).toBe('fought');
    expect(a.g.flags.a3_recall_fight).toBe(true);
    expect(a.g.world.reputation.wardens.respect).toBe(10);
    expect(cond(NPCS.npc_a3_g1.hostileIf!, a.g) && cond(NPCS.npc_a3_g2.hostileIf!, a.g)).toBe(true);
    expect(wardensPlaced(a.g)).toBe(true);
    expect(view('d_a3_recall', a.g, a.q).text).toContain('past talking');
    expect(stage(a.g, 'q_a3_recall')).toBe('fought');
    expect(a.g.world.party).toContain(NINE);
  });

  it('let go: disposed, as scheduled, with a step back from it; a deputy Nine says the order is lawful', () => {
    const a = cityNine({ flags: { nine_stance: 'deputy' } });
    const r = pick(atGate(a), a, '(Let them take it.)');
    expect(r.view()!.text).toContain('The record suggests I should go');
    pick(r, a, 'No.');
    expect(a.g.flags.a3_recall).toBeUndefined();
    pick(r, a, '(Let them take it.)');
    pick(r, a, '(Let it go.)');
    expect(a.g.flags.a3_recall).toBe('taken');
    expect(a.g.flags.nine_disposed).toBe(true);
    expect(status(a.g, 'q_a3_recall')).toBe('failed');
  });

  it('without Nine at the gate the wardens only wait: the keeper can refuse, buy or take it to the Court, but nothing is taken', () => {
    const a = cityNine({ companions: { nine: 'waiting' } });
    const v = view('d_a3_recall', a.g, a.q);
    expect(v.text).toContain('When it comes through the gate, it comes with us.');
    expect(v.options.map((o) => o.text)).toEqual(['This goes before the Court of Accounts before it goes anywhere.', 'Clause 9(b). A unit passes to a buyer at its assessed value. I\'m buying it. (121 Tolls)', 'Not today.']);
    const b = actThree('choir', { companions: { nine: 'waiting' } });
    expect(view('d_a3_recall', b.g, b.q).options.map((o) => o.text)).toEqual(['No. I\'m its keeper, and it stays with me.', 'This goes before the Court of Accounts before it goes anywhere.', 'Not today.']);
  });
});

// ---------------------------------------------------------------- the Court: the recall

const recallAtCourt = (a: A3, picks: string[]) => talk('d_ca_court', a.g, a.q, ['Unit 9\'s recall. Disposal', '(Step up to the rail.)', ...picks]);
const withEvidence = (ev: string[]) => ev.flatMap((e) => [e, '(Back to the rail.)']);

describe('B6b: the Court hears the recall', () => {
  it('is called only while the recall is open', () => {
    const calls = (a: A3) => view('d_ca_court', a.g, a.q).options.map((o) => o.text).filter((t) => t.startsWith('Unit 9\'s recall'));
    expect(calls(actThree('prepared', { point: 'open' }))).toEqual([]);
    const a = actThree('prepared');
    expect(calls(a)).toHaveLength(1);
    pick(atGate(a), a, '(Let Nine answer');
    expect(calls(a)).toEqual([]);
    expect(calls(actThree('hostile'))).toEqual([]);
  });

  it('the register already holds a unit its own keeper: no check; struck, a precedent, the unit its own keeper', () => {
    const a = actThree('prepared', { flags: { ca_deed: 'self' } });
    const p0 = a.g.flags.ca_precedents as number, h0 = a.g.flags.ca_cases_heard as number;
    const r = recallAtCourt(a, ['Your own register holds it already']);
    expect(r.view()!.text).toContain('Held: a unit that keeps a record may keep itself');
    expect(a.g.flags.ca_recall).toBe('kept');
    expect(a.g.flags.prec_recall).toBe('keeper');
    expect(a.g.flags.a3_recall).toBe('court');
    expect(a.g.flags.ca_precedents).toBe(p0 + 1);
    expect(a.g.flags.ca_cases_heard).toBe(h0 + 1);
    expect(stage(a.g, 'q_a3_recall')).toBe('court');
    expect(a.g.world.party).toContain(NINE);
  });

  it('a unit may be its own keeper (Speech 50): the evidence on the rail brings it down; the city\'s unit is then its own keeper', () => {
    const flags = { nine_deed: 'city', prec_unit_keeper: 'citizen', nine_log_given: true };
    const a = actThree('prepared', { flags, skills: { speech: 0 }, knows: ['ar_census_seen'] });
    const r = talk('d_ca_court', a.g, a.q, ['Unit 9\'s recall. Disposal', '(Step up to the rail.)', ...withEvidence(['(Put the deed on the rail.)', 'Unit 9 keeps a count', 'Read the register\'s heading', 'The census for Reserve 9'])]);
    const g0 = r.view()!.options.find((o) => o.text.startsWith('A unit may be its own keeper'))!;
    expect(g0.checkLabel).toBe('Speech 10'); // 50 − 15 log − 10 register − 10 census − 5 at the rail; the city's deed does not help
    pick(r, a, 'A unit may be its own keeper');
    expect(a.g.flags.ca_recall).toBe('kept');
    expect(cond(NINE_KEEPER_SELF, a.g)).toBe(true);
    expect(a.g.flags.nine_deed, 'U8\'s own flag is left alone').toBe('city');

    const b = cityNine({ skills: { speech: 0 } });
    recallAtCourt(b, ['A unit may be its own keeper']);
    expect(b.g.flags.ca_recall).toBe('returned');
    expect(b.g.flags.a3_recall).toBe('taken');
    expect(b.g.flags.nine_disposed).toBe(true);
    expect(b.g.world.party).not.toContain(NINE);
    expect(status(b.g, 'q_a3_recall')).toBe('failed');
  });

  it('the schedule reads the register (Science 45, a registered title): struck on the register, the keeper as registered', () => {
    const a = actThree('choir', { flags: { ca_deed: 'citizen', prec_unit_keeper: 'citizen' } });
    const r = recallAtCourt(a, [...withEvidence(['(Put the deed on the rail.)']), 'The schedule reads the register.']);
    expect(r.view()!.text).toContain('Held: the schedule reads the register');
    expect(a.g.flags.ca_recall).toBe('kept');
    expect(a.g.flags.a3_nine_keeper).toBeUndefined();
    expect(cond(NINE_KEEPER_PLAYER, a.g)).toBe(true);
    // no registered title, no register ground
    const b = cityNine();
    expect(recallAtCourt(b, []).view()!.options.map((o) => o.text).some((t) => t.startsWith('The schedule reads'))).toBe(false);
  });

  it('a stay at the gate, then the ruling: the wardens go home', () => {
    const a = cityNine();
    pick(atGate(a), a, 'This goes before the Court');
    recallAtCourt(a, ['A unit may be its own keeper']);
    expect(a.g.flags.a3_recall).toBe('court');
    expect(wardensPlaced(a.g)).toBe(false);
    expect(view('d_a3_recall', a.g, a.q).text).toContain('nobody waiting at it for Unit 9');
  });
});

// ---------------------------------------------------------------- the Court: Reserve 9

const reserveAtCourt = (a: A3, picks: string[]) => talk('d_ca_court', a.g, a.q, ['Reserve 9 against the fourth order', '(Step up to the rail.)', ...picks]);
const ALL_RESERVE_EVIDENCE = ['(Put the copy of the Cistern', 'The reserve\'s census', '(Put the slip from the Cistern', 'Unit 9 assessed that reserve', 'Read your own register back', 'And the heading for benefits'];

describe('B6b: Reserve 9 against the fourth order, at the Court', () => {
  it('is on the bench once the order is read, until the door is settled or the case ruled; the order\'s foot points there', () => {
    const calls = (a: A3) => view('d_ca_court', a.g, a.q).options.map((o) => o.text).filter((t) => t.startsWith('Reserve 9 against'));
    expect(calls(actThree('truce', { point: 'open' }))).toEqual([]);
    const a = actThree('truce');
    expect(calls(a)).toHaveLength(1);
    expect(view('d_a3_order_read', a.g, a.q).text).toContain('OBJECTIONS LIE TO THE COURT OF ACCOUNTS');
    set(a.g, { a3_c9: 'sealed' });
    expect(calls(a)).toEqual([]);
  });

  it('consent (Speech 50): every piece of evidence named on the check; won, the order stayed, a precedent', () => {
    const a = actThree('prepared', { skills: { speech: 0 } });
    const p0 = a.g.flags.ca_precedents as number;
    const r = reserveAtCourt(a, withEvidence(ALL_RESERVE_EVIDENCE));
    const ground = r.view()!.options.find((o) => o.text.startsWith('Three refusals'))!;
    expect(ground.checkLabel).toBe('Speech 15');
    expect(ground.checkNotes).toHaveLength(5);
    pick(r, a, 'Three refusals on your own record');
    expect(a.g.flags.ca_reserve).toBe('stayed');
    expect(a.g.flags.prec_reserve).toBe('consent');
    expect(a.g.flags.ca_precedents).toBe(p0 + 1);
    expect(cond(RESERVE_STAYED, a.g)).toBe(true);
    expect(a.g.world.decisions.some((d) => d.id === 'ca_reserve_stayed')).toBe(true);
    expect(view('d_ca_court', a.g, a.q).options.map((o) => o.text).some((t) => t.startsWith('Reserve 9 against'))).toBe(false);
  });

  it('a failed ground leaves the order upheld with the Court\'s endorsement, and no precedent', () => {
    const a = actThree('hostile', { skills: { speech: 0 } });
    const p0 = a.g.flags.ca_precedents as number;
    reserveAtCourt(a, ['Three refusals on your own record']);
    expect(a.g.flags.ca_reserve).toBe('upheld');
    expect(a.g.flags.prec_reserve).toBeUndefined();
    expect(a.g.flags.ca_precedents).toBe(p0);
    const b = actThree('hostile', { skills: { science: 0 } });
    reserveAtCourt(b, ['The order executes on the designate']);
    expect(b.g.flags.ca_reserve).toBe('upheld');
  });

  it('attendance (Science 45; the register\'s refused benefit helps): the order stands and cannot execute; a precedent', () => {
    const a = actThree('prepared', { skills: { science: 15 } });
    const r = reserveAtCourt(a, withEvidence(['And the heading for benefits']));
    const ground = r.view()!.options.find((o) => o.text.startsWith('The order executes'))!;
    expect(ground.checkLabel).toBe('Science 35');
    pick(r, a, 'The order executes on the designate');
    expect(a.g.flags.ca_reserve).toBe('attendance');
    expect(a.g.flags.prec_reserve).toBe('attendance');
    expect(cond(RESERVE_STAYED, a.g)).toBe(true);
  });

  it('an archive clerk reads the condition back with no check', () => {
    const a = actThree('hostile', { origin: 'archive_clerk', skills: { science: 0 } });
    const r = reserveAtCourt(a, []);
    expect(opts(r).some((t) => t.startsWith('The order executes'))).toBe(false);
    pick(r, a, 'Condition precedent.');
    expect(a.g.flags.ca_reserve).toBe('attendance');
  });

  it('privilege: always granted, a stay for the designate only; not a precedent and not the Court\'s stay on principle', () => {
    const a = actThree('hostile', { skills: { speech: 0, science: 0 } });
    const p0 = a.g.flags.ca_precedents as number, h0 = (a.g.flags.ca_cases_heard as number | undefined) ?? 0;
    const r = reserveAtCourt(a, ['I\'m the designate it names.']);
    expect(r.view()!.text).toContain('It is not a principle');
    expect(a.g.flags.ca_reserve).toBe('privilege');
    expect(a.g.flags.prec_reserve).toBeUndefined();
    expect(a.g.flags.ca_precedents).toBe(p0);
    expect(a.g.flags.ca_cases_heard).toBe(h0 + 1);
    expect(cond(RESERVE_STAYED, a.g)).toBe(false);
    const said = DIALOGUES.d_ca_court.nodes.reserve_r_privilege.interject!.map((i) => i.companion);
    expect(said).toEqual([TAMSIN, 'npc_of_03']);
  });
});

// ---------------------------------------------------------------- precedents, placement, saves

describe('B6b: what the act\'s rulings leave behind', () => {
  it('a player who made no precedent in Act 2 can make two in Act 3 (ending E\'s register)', () => {
    const a = actThree('hostile', { companions: { nine: 'party' } });
    expect(a.g.flags.ca_precedents).toBe(0);
    expect(cond(E_PREC, a.g)).toBe(false);
    expect(cond(RECALL_OPEN, a.g)).toBe(true);
    reserveAtCourt(a, ['Three refusals on your own record']);
    recallAtCourt(a, ['A unit may be its own keeper']);
    expect(a.g.flags.ca_reserve).toBe('stayed');
    expect(a.g.flags.ca_recall).toBe('kept');
    expect(a.g.flags.ca_precedents).toBe(2);
    expect(cond(E_PREC, a.g)).toBe(true);
  });

  it('a disposed Nine is never placed anywhere again, whichever way it went; a hidden one is, and survives a save', async () => {
    const handed = actThree('choir');
    pick(pick(atGate(handed), handed, 'Go with them, Nine.'), handed, '(Yes.)');
    const taken = cityNine();
    pick(pick(atGate(taken), taken, '(Let them take it.)'), taken, '(Let it go.)');
    const returned = cityNine({ skills: { speech: 0 } });
    recallAtCourt(returned, ['A unit may be its own keeper']);
    for (const [why, a] of Object.entries({ handed, taken, returned })) {
      expect(a.g.flags.nine_disposed, why).toBe(true);
      for (const h of [8, 14, 22, 3]) { hour(a.g, h); expect(nineVisible(a.g), `${why} at ${h}`).toEqual([]); }
      expect(cond(ON_SIDE('nine'), a.g), why).toBe(false);
    }

    const hid = cityNine();
    pick(pick(atGate(hid), hid, '(While she reads the sheet'), hid, 'North along the Wall');
    const loaded = await saveAndLoad(hid.g);
    expect(nineVisible(loaded.g)).toEqual(['md_ring/npc_md_nine_clover']);
    expect(cond(ON_SIDE('nine'), loaded.g)).toBe(true);
    talk('d_a3_nine_hid', loaded.g, loaded.q, ['We\'re going.']);
    expect(loaded.g.world.party).toContain(NINE);
  });

  it('every preset plays its recall to an end at the gate or by post (no recall without Nine on the player\'s side)', () => {
    const presets: Preset[] = ['prepared', 'hostile', 'choir', 'guild', 'ledger', 'truce', 'none'];
    for (const p of presets) {
      const a = actThree(p);
      if (!cond(RECALL_OPEN, a.g)) { expect(a.g.world.quests.q_a3_recall, p).toBeUndefined(); continue; }
      const r = atGate(a);
      const first = r.view()!.options[0].text;
      pick(r, a, first);
      a.q.update();
      // the first answer offered is never the one that loses the unit
      expect(['declined', 'stayed'].includes(String(a.g.flags.a3_recall)) || a.g.flags.a3_recall_stay, p).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------- conversation rules and the cast

describe('B6b: conversation rules, the cast, the content', () => {
  it('every node in the B6b trees has a line for coming back to it (U7), or only leaves; the Court\'s Act 3 cases are on its bench', () => {
    let nodes = 0;
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!B6B(id)) continue;
      for (const [nid, n] of Object.entries(d.nodes)) {
        nodes++;
        if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
      }
    }
    expect(nodes).toBeGreaterThanOrEqual(25);
    const court = DIALOGUES.d_ca_court.nodes;
    for (const n of ['reserve', 'reserve_rail', 'reserve_r_stayed', 'reserve_r_attendance', 'reserve_r_privilege', 'reserve_r_upheld', 'recall', 'recall_rail', 'recall_r_kept', 'recall_r_returned']) expect(court[n], n).toBeDefined();
    for (const n of ['intro', 'bench']) {
      const ids = court[n].options.map((o) => o.id ?? '');
      expect(ids.some((i) => i.startsWith('ca.reserve.call')) && ids.some((i) => i.startsWith('ca.recall.call')), n).toBe(true);
    }
  });

  it('the courier and the recall wardens: women narrow and men broad, hair true to ancestry, no grey under fifty-five; the wardens turn only if drawn on', () => {
    expect(NPCS.npc_a3_01.look.frame).toBe('narrow');
    expect(NPCS.npc_a3_g1.look.frame).toBe('narrow');
    expect(NPCS.npc_a3_g2.look.frame).toBe('broad');
    expect(['coily_twa', 'paint_buzz', 'paint_shaved', 'paint_fade', 'paint_cornrows', 'none']).toContain(NPCS.npc_a3_g2.look.over?.hair?.style);
    for (const id of ['npc_a3_01', 'npc_a3_g1', 'npc_a3_g2']) expect((NPCS[id].look.age ?? 0) < 55, id).toBe(true);
    const { g } = actThree('prepared');
    expect(cond(NPCS.npc_a3_g1.hostileIf as Cond, g)).toBe(false);
    for (const [map, key] of [['md_precinct', 'npc_a3_01'], ['md_precinct', 'npc_a3_g1'], ['md_precinct', 'npc_a3_g2'], ['md_ring', 'npc_md_nine_clover'], ['md_docks', 'npc_md_nine_hulls']]) expect(placed(map, key), `${map}/${key}`).toBeDefined();
  });

  it('the content validates', () => {
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|ca\.re|md_precinct|md_ring|md_docks|d_ca_court/.test(e))).toEqual([]);
  });
});
