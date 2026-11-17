import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, ROAD_ENCOUNTERS, SETTLEMENTS, TRAITS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { A3_LETTERS } from '../src/content/world/a3_letters';
import { ALLY_NEEDS, HOME_OPEN, LOWE, ORME, REYES, RIDE_COLUMN, type Ally } from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { availableLetters, sendLetter } from '../src/engine/world/letters';
import { apply, runTimers, test as cond, type Cond, type LogicHost } from '../src/engine/world/logic';
import { eligibleEncounters } from '../src/engine/world/roads';
import type { TripLeg } from '../src/engine/world/travel';
import { actThree, at, has, saveAndLoad, stage, status, talk, view, waitFor, type A3, type G, type Over, type Preset } from './a3_fixture';

/**
 * B6c — Toll Road Home: the rides home by the Long Night's side (the wardens' car, the guild's first class, Openfield's
 * carts), the player's own buggy, the Wheel on the road, and the player's own feet; each ends at Knock. The muster by letter
 * (each ally only with its own need, its reply setting the ally) and the Archive promise (Act 2 and Act 3). The road's
 * people. Played headless with the shared Act 3 fixture.
 */

interface Ev { name: string; data?: unknown }
/** An Act 3 game whose host records every `event` effect (goto, dialogue, combat). */
function game(preset: Preset, over: Over = {}): A3 & { events: Ev[] } {
  const events: Ev[] = [];
  const host: LogicHost = { event: (name, data) => { events.push({ name, data }); } };
  return { ...actThree(preset, { ...over, host }), events };
}
const opened = (events: Ev[]) => events.filter((e) => e.name === 'dialogue').map((e) => (e.data as { tree: string }).tree);
const wentTo = (events: Ev[]) => events.filter((e) => e.name === 'goto').map((e) => (e.data as { location: string }).location);
const opts = (id: string, g: G, q: A3['q']) => view(id, g, q).options.map((o) => o.text);
const kill = (g: G, id: string) => { (g.npcs as Record<string, unknown>)[id] = { dead: true }; };
const member = (g: G, f: string, rank = 'member') => { g.world.membership[f] = { rank, since: 1, status: 'member' } as never; };
const posts = (g: G) => (g.world.post ?? []).map((p) => p.from);
/** Home at Knock however they came: be on Knock's map, let what is due happen. */
function home(a: A3): void { waitFor(a.g, a.q, 'c9_mouth', 1); }
function expectHome(a: A3, how: string): void {
  expect(a.g.flags.a3_route_home).toBe(how);
  expect(a.g.flags.a3_at_knock).toBe(true);
  a.g.locationId = 'c9_mouth';
  a.q.update();
  expect(stage(a.g, 'q_a3_return')).toBe('knock');
  expect(status(a.g, 'q_a3_return')).toBe('done');
  expect(stage(a.g, 'q_a3_cistern')).toBe('knock');
}
/** Go on with the same conversation (a fresh `talk` starts again from the tree's start entries). */
function go(r: DialogueRunner, a: A3, picks: string[]): DialogueRunner {
  for (const p of picks) {
    const o = r.view()?.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`no option "${p}" in [${r.view()?.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    a.q.update();
  }
  return r;
}
const LEG = (from: string, to: string): TripLeg => ({ from, to, by: 'foot', hours: 10, fare: 0, risk: 0.5 });
const eligible = (g: G, from: string, to: string) => eligibleEncounters(g, WORLD_MAP, LEG(from, to), ROAD_ENCOUNTERS).map((e) => e.id);

const B6C_TREES = ['d_a3_column', 'd_a3_first', 'd_a3_carts', 'd_a3_buggy', 'd_re_a3_wheel', 'd_re_a3_refugees', 'd_re_a3_riders', 'd_re_a3_trader'];
const COLUMN_HOME = ['(Climb up into the back.)', 'Why carry me at all?', '(Let the road go by.)', 'You don\'t like this one.', '(Let the road go by.)', '(Sleep on the bench', 'Stand down, Captain.', '(Sleep.)', '(Ride on up the track to Knock.)', '(Get down.)'];

// ---------------------------------------------------------------- the offers

describe('B6c: the rides home are offered by side, by post, wherever the player is', () => {
  it('the city\'s side gets the wardens\' car; the guild\'s the first class; the Choir\'s the carts; a truce all three, by asking; nobody\'s, none', () => {
    const cases: [Preset, string[]][] = [['ledger', [LOWE]], ['guild', [ORME]], ['choir', ['npc_of_06']], ['truce', [LOWE, ORME, 'npc_of_06']], ['none', []], ['hostile', []]];
    for (const [preset, from] of cases) {
      const a = game(preset);
      waitFor(a.g, a.q, 'openfield', 9);
      const got = posts(a.g).filter((p) => [LOWE, REYES, ORME, 'npc_of_06'].includes(p));
      expect(got.sort(), preset).toEqual([...from].sort());
      if (from.includes(LOWE)) expect(a.g.world.knowledge.a3_ride_column, preset).toBe(true);
    }
  });

  it('nothing is offered before the order is read, or once the player has a way home', () => {
    const before = game('ledger', { point: 'open' });
    waitFor(before.g, before.q, 'openfield', 9);
    expect(posts(before.g)).not.toContain(LOWE);
    const after = game('ledger', { flags: { a3_route_home: 'foot' } });
    waitFor(after.g, after.q, 'openfield', 9);
    expect(posts(after.g)).not.toContain(LOWE);
  });

  it('a member of a side may ride with it whatever the night; with Lowe dead the car is his sergeant\'s', () => {
    const w = game('none');
    expect(cond(RIDE_COLUMN, w.g)).toBe(false);
    member(w.g, 'wardens', 'citizen');
    expect(cond(RIDE_COLUMN, w.g)).toBe(true);

    const r = game('ledger');
    kill(r.g, LOWE);
    waitFor(r.g, r.q, 'md_precinct', 9);
    expect(posts(r.g)).toContain(REYES);
    expect(posts(r.g)).not.toContain(LOWE);
    expect(view('d_md_reyes', r.g, r.q).text).toContain('Lowe\'s car for Reserve 9');
    talk('d_md_reyes', r.g, r.q, ['Take me home, Sergeant.']);
    const ride = talk('d_a3_column', r.g, r.q, ['(Climb up into the back.)']);
    expect(ride.view()!.options.map((o) => o.text)).toContain('What would Lowe have done with this order?');
    expect(ride.view()!.options.map((o) => o.text)).not.toContain('You don\'t like this one.');
    go(ride, r, ['What would Lowe have done', '(Let the road go by.)', '(Sleep on the bench', '(Sleep.)', '(Ride on up the track to Knock.)', '(Get down.)']);
    expectHome(r, 'column');
  });
});

// ---------------------------------------------------------------- each way home ends at Knock

describe('B6c: every way home ends at Knock', () => {
  it('the wardens\' car: Lowe offers it at his desk; the ride, his answers, the night at Tollhouse 9; Knock watches the designate get down', () => {
    const a = game('ledger');
    a.g.locationId = 'md_precinct';
    const lowe = view('d_md_lowe', a.g, a.q);
    expect(lowe.text).toContain('car for Reserve 9');
    talk('d_md_lowe', a.g, a.q, ['Take me home, Captain.']);
    expect(opened(a.events)).toEqual(['d_a3_column']);
    const t0 = a.g.minutes, trust0 = a.g.world.relations[LOWE]?.trust ?? 0;
    talk('d_a3_column', a.g, a.q, COLUMN_HOME);
    expect(a.g.minutes - t0).toBeGreaterThan(1.5 * 1440);
    expect(a.g.flags.a3_lowe_asked).toBe('down');
    expect(a.g.world.relations[LOWE].trust).toBeGreaterThan(trust0);
    expect(wentTo(a.events)).toEqual(['c9_mouth']);
    expect(a.g.flags.a3_in_sallow).toBe(true);
    expect(a.g.world.decisions.some((d) => d.id === 'a3_route_home')).toBe(true);
    expectHome(a, 'column');
    // the hook is spent: Lowe's tree opens as it always did
    a.g.locationId = 'md_precinct';
    expect(new DialogueRunner(DIALOGUES.d_md_lowe, a.g, a.q).node).not.toBe('a3_car');
  });

  it('the car\'s topics are asked once each; every answer to Lowe\'s question is entered; Linnet at the wheel when she ran to the city', () => {
    for (const [pick, v] of [['Stand down', 'down'], ['I don\'t know yet', 'unsure'], ['Carry on, Captain', 'on'], ['(Say nothing', 'none']] as const) {
      const a = game('ledger');
      talk('d_a3_column', a.g, a.q, ['(Climb up into the back.)', 'Who are the benches for', '(Let the road go by.)', '(Sleep on the bench', pick, '(Sleep.)']);
      expect(a.g.flags.a3_lowe_asked).toBe(v);
    }
    const a = game('ledger', { flags: { kn_linnet_will_run: true } });
    const r = talk('d_a3_column', a.g, a.q, ['(Climb up into the back.)', 'What happens when I\'m standing at the door?', '(Let the road go by.)']);
    expect(r.view()!.text).toContain('Linnet');
    expect(a.g.world.knowledge.a3_lowe_clause).toBe(true);
    expect(r.view()!.options.map((o) => o.text)).not.toContain('What happens when I\'m standing at the door?');
    expect(r.view()!.options.map((o) => o.text)).toContain('You don\'t like this one.');
  });

  it('a truce asks for the car rather than being given it; Tamsin can be sat with at the night stop', () => {
    const a = game('prepared');
    a.g.locationId = 'md_precinct';
    expect(view('d_md_lowe', a.g, a.q).options.map((o) => o.text)).toContain('I\'m asking, Captain. Carry me home.');
    const r = talk('d_a3_column', a.g, a.q, ['(Climb up into the back.)', '(Sleep on the bench', '(Go and sit with Tamsin', '(Sit with her until she sleeps.)']);
    expect(r.view()!.options.map((o) => o.text).some((t) => t.startsWith('(Go and sit with Tamsin'))).toBe(false);
    expect(r.view()!.options.map((o) => o.text)).toContain('I don\'t know yet. That\'s the truth.');
  });

  it('getting down in Shale: the way home is the car, and Knock\'s own arrival sees the player home when they walk in', () => {
    const a = game('ledger');
    talk('d_a3_column', a.g, a.q, ['(Climb up into the back.)', '(Sleep on the bench', '(Say nothing', '(Sleep.)', '(Get down in Shale.']);
    expect(wentTo(a.events)).toEqual(['shale']);
    expect(a.g.flags.a3_route_home).toBe('column');
    expect(a.g.flags.a3_at_knock).toBeUndefined();
    waitFor(a.g, a.q, 'shale', 1);
    expect(a.g.flags.a3_at_knock).toBeUndefined();
    expect(stage(a.g, 'q_a3_return')).toBe('sallow');
    home(a);
    expectHome(a, 'column');
  });

  it('a ride broken off on the road picks up again from the save, in the Sallow', async () => {
    const a = game('ledger');
    talk('d_a3_column', a.g, a.q, ['(Climb up into the back.)']);
    expect(a.g.flags.a3_ride).toBe('column');
    const b = await saveAndLoad(a.g);
    expect(new DialogueRunner(DIALOGUES.d_a3_column, b.g, b.q).node).toBe('sallow');
  });

  it('the guild\'s first class: Femi\'s window at Carrick, the through at four, Orme and her folder, the guild\'s coach down its own road', () => {
    const a = game('guild');
    a.g.locationId = 'md_docks';
    talk('d_dk_line', a.g, a.q, ['(Show Femi the guild\'s letter']);
    expect(opened(a.events)).toEqual(['d_a3_first']);
    const r = talk('d_a3_first', a.g, a.q, ['(Step up into the guild\'s car.)', 'What\'s in the folder on your knee?']);
    expect(r.view()!.text).toContain('Guild business at the stand');
    go(r, a, ['(Watch the dark go by.)', 'Why is the guild carrying me?', '(Watch the dark go by.)', '(Sleep, while the through runs east.)', '(On down into the Sallow.)', '(Ride on up the track to Knock.)', '(Get down.)']);
    expect(a.g.world.knowledge.a3_first_folder).toBe(true);
    expect(wentTo(a.events)).toEqual(['c9_mouth']);
    expectHome(a, 'first');
    // no guild in play: the folder is only the stand's book
    const b = game('truce', { flags: { rc_line: 'halts', nw_controllers: 'river' } });
    const s = talk('d_a3_first', b.g, b.q, ['(Step up into the guild\'s car.)', 'What\'s in the folder']);
    expect(s.view()!.text).toContain('The stand\'s book');
    // the city's side has no seat on the through
    const c = game('ledger');
    c.g.locationId = 'md_docks';
    expect(opts('d_dk_line', c.g, c.q).some((t) => t.startsWith('(Show Femi'))).toBe(false);
  });

  it('Openfield\'s carts: the seed-keeper\'s count, the old south bed, the sky; water for a dry Knock', () => {
    const a = game('choir');
    a.g.locationId = 'openfield';
    expect(view('d_of_doria', a.g, a.q).text).toContain('six carts');
    talk('d_of_doria', a.g, a.q, ['I\'ll walk with them.']);
    expect(opened(a.events)).toEqual(['d_a3_carts']);
    const y = talk('d_a3_carts', a.g, a.q);
    expect(y.view()!.text).toContain('Elder Mason');
    const w = talk('d_a3_carts', a.g, a.q, ['(Walk with the carts.)', 'Why water for Knock?']);
    expect(w.view()!.text).toContain('the guild with hymns');
    go(w, a, ['(Look at the fire a while.)', '(Lie back and look up', '(Sit up.)', '(Sleep under the sky', '(Walk on with the carts', '(Help them with the barrels.)']);
    expect(a.g.flags.a3_carts_water).toBe(true);
    expect(a.g.world.news.some((n) => n.tag === 'a3_carts_water')).toBe(true);
    expectHome(a, 'carts');
    // a burned Openfield sends what it has, and the keeper walks at the head
    const b = game('choir', { band: 'thin' });
    b.g.locationId = 'openfield';
    expect(view('d_of_doria', b.g, b.q).text).toContain('two carts that will roll');
    expect(talk('d_a3_carts', b.g, b.q).view()!.text).toContain('Doria walks at the head');
    // a Choir with its people removed has no carts to send
    const c = game('ledger', { flags: { ln_people: 'removed' }, members: { choir: 'lay' } });
    expect(view('d_of_doria', c.g, c.q).text).not.toContain('carts');
  });

  it('the player\'s own buggy at the Ring: fuel bought or siphoned, the Tollhouse\'s bar lifted, home', () => {
    const a = game('prepared');
    a.g.locationId = 'md_ring';
    expect(opts('d_dr_heron', a.g, a.q)).toContain('(Drive it home to Knock.)');
    const tolls = a.g.pc.inventory.tolls;
    talk('d_a3_buggy', a.g, a.q, ['(Start it up and go.)', '(Buy fuel at Ninebridge.', '(Down into the Sallow.)', '(Drive on up the track', '(Switch it off.)']);
    expect(a.g.pc.inventory.tolls).toBe(tolls - 20);
    expectHome(a, 'buggy');
    const b = game('prepared', { skills: { mechanics: 0, survival: 0 }, tolls: 0 });
    const r = talk('d_a3_buggy', b.g, b.q, ['(Start it up and go.)', '(Siphon a wreck']);
    expect(r.view()!.text).toContain('Three wrecks, three dry tanks');
    // a damaged buggy goes nowhere; no buggy, no hook
    const c = game('prepared', { flags: { dr_buggy_hurt: true } });
    expect(opts('d_dr_heron', c.g, c.q)).not.toContain('(Drive it home to Knock.)');
  });

  it('the Wheel find road-kin and friends on the road, and carry them home across the pan', () => {
    const a = game('prepared');
    expect(eligible(a.g, 'ninebridge', 'tollhouse')).toContain('re_a3_wheel');
    talk('d_re_a3_wheel', a.g, a.q, ['(Climb up on the second wagon.)', '(Ride the last of it to Knock.)', '(Climb down.)']);
    expectHome(a, 'wheel');
    expect(eligible(a.g, 'ninebridge', 'tollhouse')).not.toContain('re_a3_wheel');
    const h = game('hostile');
    expect(eligible(h.g, 'ninebridge', 'tollhouse')).not.toContain('re_a3_wheel');
  });

  it('under their own steam (on foot, the Line, a caravan): home when they walk onto Knock\'s map, and not before', () => {
    for (const preset of ['none', 'hostile'] as Preset[]) {
      const a = game(preset);
      a.g.locationId = 'md_precinct';
      expect(new DialogueRunner(DIALOGUES.d_md_lowe, a.g, a.q).node, preset).not.toBe('a3_car');
      waitFor(a.g, a.q, 'tollhouse', 12);
      expect(a.g.flags.a3_at_knock).toBeUndefined();
      expect(stage(a.g, 'q_a3_return')).toBe('sallow');
      home(a);
      expectHome(a, 'foot');
      expect(a.g.world.decisions.some((d) => d.id === 'a3_route_home')).toBe(true);
    }
  });

  it('the road home is critical and lists its routes; its journal points east, home', () => {
    const r = QUESTS.q_a3_return;
    expect(r.critical).toBe(true);
    expect(r.routes!.map((x) => x.id)).toEqual(['line', 'column', 'first', 'carts', 'wheel', 'buggy', 'foot']);
    expect(r.routes!.filter((x) => !x.requires).map((x) => x.id)).toEqual(['line', 'foot']);
    expect(r.stages.west.journal).toContain('east');
    expect(r.stages.west.journal).not.toContain('west');
  });
});

// ---------------------------------------------------------------- the muster

const RECIPIENTS = [...new Set(A3_LETTERS.map((l) => l.to))];
const meetAll = (g: G) => { for (const id of RECIPIENTS) (g.world.met ??= {})[id] = { name: NPCS[id].name, day: 1 }; };
const a3Letters = (g: G) => availableLetters(g, LETTERS).map((l) => l.id).filter((id) => id.startsWith('let_a3_') || id === 'let_ines_refusals').sort();
/** Send a letter and wait out its round trip. */
function sendAndWait(g: G, id: string): void {
  sendLetter(g, LETTERS[id]);
  g.minutes += LETTERS[id].days * 1440;
  runTimers(g);
}

describe('B6c: the muster by letter', () => {
  it('a thorough game can call every ally, each to the right person; the hostile one none; nobody before the order is read', () => {
    const p = game('prepared');
    meetAll(p.g);
    expect(a3Letters(p.g)).toEqual(['let_a3_barges', 'let_a3_boats', 'let_a3_choir', 'let_a3_dogs', 'let_a3_gangs', 'let_a3_saints', 'let_a3_seventeen', 'let_a3_shale', 'let_a3_shift', 'let_a3_stand', 'let_a3_wheel', 'let_ines_refusals']);
    const h = game('hostile');
    meetAll(h.g);
    expect(a3Letters(h.g)).toEqual([]);
    const e = game('prepared', { point: 'open' });
    meetAll(e.g);
    expect(a3Letters(e.g)).toEqual(['let_ines_refusals']);
  });

  it('only to people the player has met, and never to the dead', () => {
    const a = game('prepared');
    expect(a3Letters(a.g)).toEqual([]);
    meetAll(a.g);
    kill(a.g, 'npc_bw_04');
    expect(a3Letters(a.g)).not.toContain('let_a3_saints');
  });

  /** One ally's own need, given to a game where nobody owes the player anything. */
  const NEEDS: [Ally, (g: G) => void, string][] = [
    ['shale', (g) => member(g, 'shale_militia', 'volunteer'), 'let_a3_shale'],
    ['dogs', (g) => { g.flags.wren_exodus = true; }, 'let_a3_dogs'],
    ['choir', (g) => { g.flags.sky_rite = true; }, 'let_a3_choir_doria'],
    ['wheel', (g) => member(g, 'wheel', 'roadkin'), 'let_a3_wheel'],
    ['shift', (g) => { g.flags.hs_shift = 'revolt'; }, 'let_a3_shift_rafe'],
    ['stand', (g) => { g.flags.dk_stand_owed = true; }, 'let_a3_stand'],
    ['boats', (g) => { g.flags.ds_boats_owed = true; }, 'let_a3_boats'],
    ['barges', (g) => { g.flags.nw_barges_owed = true; }, 'let_a3_barges'],
    ['gangs', (g) => { g.flags.bw_turf = 'peace'; }, 'let_a3_gangs'],
    ['saints', (g) => { g.flags.bw_static = 'kept'; }, 'let_a3_saints'],
    ['seventeen', (g) => { g.flags.nw_dam = 'truth'; }, 'let_a3_seventeen'],
  ];
  it('each letter is offered only with its own ally\'s need, and its reply (a duration, not a deadline) sets that ally', () => {
    expect(NEEDS.map(([a]) => a).sort()).toEqual((Object.keys(ALLY_NEEDS) as Ally[]).sort());
    for (const [ally, give, letter] of NEEDS) {
      const a = game('hostile');
      meetAll(a.g);
      give(a.g);
      expect(cond(ALLY_NEEDS[ally], a.g), ally).toBe(true);
      expect(a3Letters(a.g), ally).toEqual([letter]);
      sendLetter(a.g, LETTERS[letter]);
      expect(a.g.flags[`a3_ally_${ally}`], `${ally} before the reply`).toBeUndefined();
      a.g.minutes += (LETTERS[letter].days * 1440) - 60;
      runTimers(a.g);
      expect(a.g.flags[`a3_ally_${ally}`], `${ally} an hour short`).toBeUndefined();
      a.g.minutes += 60;
      runTimers(a.g);
      expect(a.g.flags[`a3_ally_${ally}`], ally).toBe(true);
      expect(a.g.world.post!.some((p) => p.from === LETTERS[letter].to && p.text === LETTERS[letter].reply!.text), ally).toBe(true);
      expect(a3Letters(a.g), `${ally} once`).toEqual([]);
      a.q.update();
    }
  });

  it('alternates by recipient: who leads the Dogs, who is at Openfield, whether the Shift\'s leader lives', () => {
    const dogs = (flags: Record<string, string | boolean>) => {
      const a = game('hostile', { flags, rep: { rust_dogs: 20 } });
      meetAll(a.g);
      return a3Letters(a.g);
    };
    expect(dogs({})).toEqual(['let_a3_dogs_vasha']);
    expect(dogs({ rd_coup: false })).toEqual(['let_a3_dogs_kessler']);
    expect(dogs({ vasha_dead: true })).toEqual([]);
    const choir = (flags: Record<string, string | boolean>) => {
      const a = game('hostile', { flags: { sky_rite: true, ...flags } });
      meetAll(a.g);
      return a3Letters(a.g);
    };
    expect(choir({ ks_mason: 'lives' })).toEqual(['let_a3_choir']);
    expect(choir({ ks_mason: 'exiled', ks_calla: 'free' })).toEqual(['let_a3_choir_calla']);
    expect(choir({})).toEqual(['let_a3_choir_doria']);
    const shift = game('hostile', { flags: { hs_shift: 'won', ks_maren: 'lives' } });
    meetAll(shift.g);
    expect(a3Letters(shift.g)).toEqual(['let_a3_shift']);
    // a sheriff who has resigned does not call out the militia
    const shale = game('prepared', { flags: { ks_ada: 'resigns' } });
    meetAll(shale.g);
    expect(a3Letters(shale.g)).not.toContain('let_a3_shale');
  });

  it('the road home\'s tracker shows the muster once an ally at Knock is called', () => {
    const a = game('prepared');
    meetAll(a.g);
    sendAndWait(a.g, 'let_a3_shale');
    a.q.update();
    expect(a.g.world.quests.q_a3_return.done).toContain('muster');
  });
});

describe('B6c: the copy of MOTHER\'s replies sent home, and the Archive promise', () => {
  it('in Act 2, with the copy held: Ines answers with the promise, and the copy stays in the pack', () => {
    const { g } = at('md_precinct');
    meetAll(g);
    expect(availableLetters(g, LETTERS).map((l) => l.id)).not.toContain('let_ines_refusals');
    apply([{ give: 'k_ar_refusals' }], g);
    expect(availableLetters(g, LETTERS).map((l) => l.id)).toContain('let_ines_refusals');
    sendAndWait(g, 'let_ines_refusals');
    expect(g.flags.a3_archive_promise).toBe(true);
    expect(g.world.knowledge.ines_promised_archive).toBe(true);
    expect(has(g, 'k_ar_refusals')).toBe(true);
    expect(availableLetters(g, LETTERS).map((l) => l.id)).not.toContain('let_ines_refusals');
  });

  it('in Act 3 too; not without the copy, and not once the door is settled', () => {
    for (const preset of ['prepared', 'choir'] as Preset[]) {
      const a = game(preset);
      meetAll(a.g);
      expect(a3Letters(a.g), preset).toContain('let_ines_refusals');
      sendAndWait(a.g, 'let_ines_refusals');
      expect(a.g.flags.a3_archive_promise, preset).toBe(true);
    }
    const h = game('hostile');
    meetAll(h.g);
    expect(a3Letters(h.g)).not.toContain('let_ines_refusals');
    const d = game('prepared', { flags: { a3_c9: 'sealed' } });
    meetAll(d.g);
    expect(a3Letters(d.g)).not.toContain('let_ines_refusals');
  });
});

// ---------------------------------------------------------------- the road's people

describe('B6c: the people on the road home', () => {
  it('the column\'s supply car passes on the toll road (not for one who rode in the car)', () => {
    const a = game('truce');
    expect(eligible(a.g, 'ninebridge', 'tollhouse')).toContain('re_a3_column');
    expect(ROAD_ENCOUNTERS.re_a3_column.map).toBeUndefined();
    a.g.flags.a3_route_home = 'column';
    expect(eligible(a.g, 'ninebridge', 'tollhouse')).not.toContain('re_a3_column');
    a.g.flags.a3_at_knock = true;
    expect(eligible(a.g, 'shale', 'tollhouse')).not.toContain('re_a3_column');
  });

  it('Openfield\'s walkers, after a night that cost it; water, Tolls, the wheel or the way to the Wheel', () => {
    expect(eligible(game('truce').g, 'ninebridge', 'tollhouse')).not.toContain('re_a3_refugees');
    for (const band of ['mixed', 'thin'] as const) expect(eligible(game('choir', { band }).g, 'ninebridge', 'tollhouse'), band).toContain('re_a3_refugees');
    expect(eligible(game('ledger').g, 'ninebridge', 'tollhouse')).toContain('re_a3_refugees');
    const a = game('ledger', { items: ['c_water', 'c_water'] });
    expect(view('d_re_a3_refugees', a.g, a.q).text).toContain('Returned to the schedule');
    talk('d_re_a3_refugees', a.g, a.q, ['(Give them two of your waters.)']);
    expect(a.g.flags.a3_refugees).toBe('water');
    expect(has(a.g, 'c_water')).toBe(false);
    expect(a.g.world.news.some((n) => n.tag === 'a3_refugees_helped')).toBe(true);
    expect(view('d_re_a3_refugees', a.g, a.q).text).toContain('The handcart, going on');
    const b = game('choir', { band: 'thin' });
    talk('d_re_a3_refugees', b.g, b.q, ['Knock\'s dry.']);
    expect(b.g.flags.a3_refugees).toBe('told');
    const c = game('choir', { band: 'thin', skills: { mechanics: 50 } });
    talk('d_re_a3_refugees', c.g, c.q, ['(Put the wheel back']);
    expect(c.g.flags.a3_refugees).toBe('wheel');
  });

  it('the guild\'s riders only for those who stood against it: paid, talked past, or fought', () => {
    for (const p of ['guild', 'truce', 'none'] as Preset[]) expect(eligible(game(p).g, 'junction', 'tollhouse'), p).not.toContain('re_a3_riders');
    for (const p of ['choir', 'ledger'] as Preset[]) expect(eligible(game(p).g, 'junction', 'tollhouse'), p).toContain('re_a3_riders');
    const hand = game('choir');
    member(hand.g, 'tollmen', 'hand');
    expect(eligible(hand.g, 'junction', 'tollhouse')).not.toContain('re_a3_riders');

    const pay = game('choir');
    const t = pay.g.pc.inventory.tolls;
    talk('d_re_a3_riders', pay.g, pay.q, ['(Pay the fifty.)']);
    expect(pay.g.flags.a3_riders).toBe('paid');
    expect(pay.g.pc.inventory.tolls).toBe(t - 50);
    const words = game('choir', { skills: { speech: 50 } });
    talk('d_re_a3_riders', words.g, words.q, ['The guild wants the designate']);
    expect(words.g.flags.a3_riders).toBe('talked');
    const weak = game('choir', { skills: { speech: 20 } });
    const r = talk('d_re_a3_riders', weak.g, weak.q, ['The guild wants the designate']);
    expect(r.view()!.text).toContain('Brave');
    expect(weak.g.flags.a3_riders).toBeUndefined();
    const fight = game('ledger');
    expect(cond(NPCS.npc_a3_g9.hostileIf as Cond, fight.g)).toBe(false);
    talk('d_re_a3_riders', fight.g, fight.q, ['(Draw.)']);
    expect(fight.g.flags.a3_riders).toBe('fought');
    expect(cond(NPCS.npc_a3_g9.hostileIf as Cond, fight.g)).toBe(true);
    expect(cond(NPCS.npc_a3_g10.hostileIf as Cond, fight.g)).toBe(true);
    expect(fight.events.some((e) => e.name === 'combat')).toBe(true);
  });

  it('a Hollow trader with Signal Hill\'s news: the station reads the designate, and the mast could reach everyone', () => {
    const a = game('hostile');
    expect(eligible(a.g, 'tollhouse', 'signalhill')).toContain('re_a3_trader');
    talk('d_re_a3_trader', a.g, a.q, ['Who else hears it?']);
    expect(a.g.world.knowledge.a3_trader_news).toBe(true);
    expect(a.g.world.knowledge.loc_signalhill).toBe(true);
    expect(status(a.g, 'q_a3_mast')).toBe('active');
    const hub = opts('d_re_a3_trader', a.g, a.q);
    expect(hub).toContain('(Listen.)');
    expect(hub).not.toContain('Who else hears it?');
    a.g.flags.a3_mast = 'narrow';
    expect(eligible(a.g, 'tollhouse', 'signalhill')).not.toContain('re_a3_trader');
  });
});

// ---------------------------------------------------------------- the trees and the people

describe('B6c: the trees, the hooks and the people', () => {
  it('every node in the B6c trees and hooks has a line for coming back to it (U7), or only leaves; all seven companions speak', () => {
    const speakers = new Set<string>();
    let nodes = 0;
    const check = (id: string, nid: string) => {
      const n = DIALOGUES[id].nodes[nid];
      nodes++;
      if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
      for (const ij of n.interject ?? []) speakers.add(ij.companion);
    };
    for (const id of B6C_TREES) for (const nid of Object.keys(DIALOGUES[id].nodes)) check(id, nid);
    for (const [id, nid] of [['d_md_lowe', 'a3_car'], ['d_md_reyes', 'a3_car'], ['d_of_doria', 'a3_carts']]) check(id, nid);
    expect(nodes).toBeGreaterThanOrEqual(60);
    expect([...speakers].sort()).toEqual(['npc_c9_03', 'npc_hs_01', 'npc_md_nine', 'npc_nb_03', 'npc_of_03', 'npc_rd_03', 'npc_sh_17'].sort());
  });

  it('the hooks only open while the road home is open', () => {
    const a = game('truce', { point: 'open' });
    a.g.locationId = 'md_precinct';
    expect(cond(HOME_OPEN, a.g)).toBe(false);
    expect(new DialogueRunner(DIALOGUES.d_md_lowe, a.g, a.q).node).not.toBe('a3_car');
    expect(new DialogueRunner(DIALOGUES.d_of_doria, a.g, a.q).node).not.toBe('a3_carts');
    expect(opts('d_dk_line', a.g, a.q).some((t) => t.startsWith('(Show Femi'))).toBe(false);
    const b = game('truce', { flags: { a3_at_knock: true } });
    expect(new DialogueRunner(DIALOGUES.d_of_doria, b.g, b.q).node).not.toBe('a3_carts');
    for (const id of ['d_a3_column', 'd_a3_first', 'd_a3_carts', 'd_a3_buggy']) expect(new DialogueRunner(DIALOGUES[id], b.g, b.q).node, id).toBe('done');
  });

  it('the road\'s new people: women narrow and men broad, hair true to ancestry, grey only from fifty-five; placed on the roadside maps\' own spots', () => {
    const women = ['npc_a3_03', 'npc_a3_g10'], men = ['npc_a3_02', 'npc_a3_04', 'npc_a3_g9'];
    for (const w of women) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of men) expect(NPCS[m].look.frame, m).toBe('broad');
    const AFRO = ['coily_twa', 'coily_afro', 'coily_afro_big', 'paint_shaved', 'paint_buzz', 'paint_fade', 'paint_coils', 'paint_cornrows', 'none'];
    const GREY = [0x8a8782, 0xd2d0c8, 0xb8b2a8];
    for (const id of [...women, ...men]) {
      const n = NPCS[id];
      if (/african/.test(n.look.ancestry ?? '')) expect(AFRO, id).toContain(n.look.over?.hair?.style);
      if (GREY.includes(n.look.over?.hair?.color as number)) expect(n.look.age ?? 0, id).toBeGreaterThanOrEqual(55);
    }
    expect(NPCS.npc_a3_02.look.over?.hair?.color).toBe(0xb8b2a8);
    for (const id of ['re_a3_refugees', 're_a3_riders', 're_a3_trader', 're_a3_wheel']) {
      const e = ROAD_ENCOUNTERS[id];
      expect(MAPS[e.map!], id).toBeDefined();
      for (const n of e.npcs ?? []) expect(MAPS[e.map!].spots?.[n.spot], `${id}/${n.spot}`).toBeDefined();
      expect(DIALOGUES[e.dialogue!], id).toBeDefined();
    }
    expect(Object.keys(WORLD_EVENTS).filter((k) => /^a3_(offer|home)/.test(k)).sort()).toEqual(['a3_home', 'a3_home_road', 'a3_offer_carts', 'a3_offer_column', 'a3_offer_column_reyes', 'a3_offer_first']);
    // each event is armed by a flag and waits for its hour; none is on a date
    for (const k of ['a3_home', 'a3_home_road', 'a3_offer_carts', 'a3_offer_column', 'a3_offer_column_reyes', 'a3_offer_first']) expect('day' in WORLD_EVENTS[k].at, k).toBe(false);
  });

  it('the content validates', () => {
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /a3|d_md_lowe|d_md_reyes|d_of_doria|d_dk_line|d_dr_heron|d_dr_mule|let_/.test(e))).toEqual([]);
  });
});
