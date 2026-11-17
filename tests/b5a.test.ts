import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, FAMILIES, MAPS, NPCS, QUESTS, ROAD_ENCOUNTERS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { SITES } from '../src/content/world/sites';
import { legs } from '../src/content/dialogue/rc_line';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';
import { eligibleEncounters } from '../src/engine/world/roads';
import { planTrip } from '../src/engine/world/travel';

/**
 * B5a — the Rail Corridor: Four Ways, the halts, Yard Nine and Kettle Cut as places; the Line as transport (fares, the
 * ride, the pass, the levy, the footplate, the rods, the handcar); the rail bandits' line by all five of its ends, the
 * stationmaster's sentence by all four of its; the twelve in the tower by all four; the dead engine by three; the east
 * length by five; the road encounters; companions' words; every event waiting for the player. Played headless.
 */

type G = ReturnType<typeof newGameState>;
const KES = 'npc_hs_01';
const ODILE = 'npc_nb_03';
const COMPANIONS = ['npc_c9_03', 'npc_rd_03', 'npc_sh_17', 'npc_nb_03', 'npc_of_03', 'npc_md_nine', 'npc_hs_01'];

function talk(id: string, g: G, q: QuestEngine, picks: string[] = []): DialogueRunner {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  r.view();
  q.update();
  for (const p of picks) {
    const v = r.view();
    if (!v) throw new Error(`${id}: ended before "${p}"`);
    const o = v.options.find((x) => x.text.startsWith(p));
    if (!o) throw new Error(`${id}: no option "${p}" in [${v.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    r.view();
    q.update();
  }
  return r;
}
const view = (id: string, g: G, q: QuestEngine) => new DialogueRunner(DIALOGUES[id], g, q).view()!;
const options = (id: string, g: G, q: QuestEngine) => view(id, g, q).options.map((o) => o.text);
const trigger = (map: string, id: string) => MAPS[map].triggers!.find((t) => t.id === id)!;
const skills = (g: G, s: Record<string, number>) => Object.assign(g.pc.sheet.skillBought, s);
const has = (g: G, item: string) => g.pc.inventory.items.some((i) => i.def === item);
const stage = (g: G, quest: string) => g.world.quests[quest]?.stage;
const status = (g: G, quest: string) => g.world.quests[quest]?.status;
const approval = (g: G, who: string) => g.world.approval[who] ?? 0;
function hour(g: G, h: number): void {
  let t = Math.floor(g.minutes / 1440) * 1440 + h * 60;
  if (t <= g.minutes) t += 1440;
  g.minutes = t;
}
/** Run world events now, then at the next `h` o'clock at `where`. */
function waitFor(g: G, q: QuestEngine, where: string, h: number): string[] {
  g.locationId = where;
  const fired = runWorldEvents(g, WORLD_EVENTS, q);   // already due: it fires as soon as the player is there
  hour(g, h);
  fired.push(...runWorldEvents(g, WORLD_EVENTS, q));
  q.update();
  return fired;
}

function at(map = 'rc_fourways', h = 10) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 120 * 1440 + h * 60;
  g.locationId = map;
  g.flags.ch1_done = true;
  g.pc.inventory.tolls = 800;
  const q = new QuestEngine(QUESTS, g);
  return { g, q };
}
function conclude(g: G, q: QuestEngine, id: string) {
  const c = tryConclude(g, CONCLUSIONS[id].from, CONCLUSIONS, q);
  expect(c?.id).toBe(id);
  q.update();
}
/** Kettle Cut by day: the blind's tag, then West Halt's watch board: the band named. */
function nameTheWatch(g: G, q: QuestEngine) {
  g.locationId = 'rc_kettle';
  apply(trigger('rc_kettle', 'arrive').effects, g, q); q.update();
  talk('d_rc_kt_blind', g, q, ['(Take the tag.)']);
  g.locationId = 'rc_halt_w';
  talk('d_rc_tagboard', g, q);
  conclude(g, q, 'c_rc_watch_tag');
  expect(g.world.knowledge.rc_watch_known).toBe(true);
}
/** The stationmaster confronted, the truth told, and his question put: what do you want? */
function confront(g: G, q: QuestEngine) {
  g.locationId = 'rc_fourways';
  talk('d_rc_brodsky', g, q, ['That\'s all.']);
  talk('d_rc_brodsky', g, q, ['West Halt\'s watch rides your release', 'Somebody was hurt.', 'So what now?']);
}

// ---------------------------------------------------------------- the places

describe('B5a: the Rail Corridor as places', () => {
  it('binds the corridor\'s four world locations to their maps and settlements, with Kettle Cut a hidden landmark between', () => {
    expect(WORLD_MAP.locations.junction).toMatchObject({ name: 'Four Ways', map: 'rc_fourways', settlement: 'fourways', region: 'rail_corridor' });
    expect(WORLD_MAP.locations.halt_w).toMatchObject({ map: 'rc_halt_w', settlement: 'west_halt' });
    expect(WORLD_MAP.locations.halt_e).toMatchObject({ map: 'rc_halt_e', settlement: 'east_halt' });
    expect(WORLD_MAP.locations.depot).toMatchObject({ name: 'Yard Nine', map: 'rc_yard', settlement: 'yard_nine' });
    expect(WORLD_MAP.locations.lm_rc_kettle).toMatchObject({ hidden: true, map: 'rc_kettle', region: 'rail_corridor' });
    for (const m of ['rc_fourways', 'rc_halt_w', 'rc_halt_e', 'rc_yard', 'rc_kettle']) expect(SITES[m]?.kind).toBe('open');
    // walkable on foot through the cut, once known
    const walk = planTrip(WORLD_MAP, 'halt_w', 'depot', { modes: [], networks: [], known: () => true, hour: 8 })!;
    expect(walk.legs.map((l) => l.to)).toContain('lm_rc_kettle');
  });

  it('gossip rides the Line both ways, and each stop has the spawns its neighbours arrive by', () => {
    for (const s of ['fourways', 'yard_nine', 'west_halt', 'east_halt']) {
      expect(SETTLEMENTS[s]).toMatchObject({ type: 'rail_halt', region: 'rail_corridor' });
      for (const [to, d] of Object.entries(SETTLEMENTS[s].roads)) expect(SETTLEMENTS[to].roads[s]).toBe(d);
    }
    const spawns = (m: string) => MAPS[m].spawns.map((s) => s.id);
    expect(spawns('rc_fourways')).toEqual(expect.arrayContaining(['platform', 'from_tollhouse', 'from_depot', 'from_halt_e']));
    expect(spawns('rc_halt_w')).toEqual(expect.arrayContaining(['platform', 'from_meridian', 'from_depot', 'from_openfield', 'from_lm_rc_kettle']));
    expect(spawns('rc_halt_e')).toEqual(expect.arrayContaining(['platform', 'from_junction', 'from_skirts', 'from_mine_teeth']));
    expect(spawns('rc_yard')).toEqual(expect.arrayContaining(['platform', 'from_junction', 'from_halt_w', 'from_lm_rc_kettle', 'from_timber']));
  });

  it('arriving anywhere on the corridor puts the place on the map; the guild\'s reward puts Kettle on it and opens the line', () => {
    const { g, q } = at();
    apply(trigger('rc_fourways', 'arrive').effects, g, q);
    expect(g.world.knowledge.loc_junction).toBe(true);
    talk('d_rc_poster', g, q);
    expect(g.world.knowledge.loc_lm_rc_kettle).toBe(true);
    expect(g.world.leads.l_rc_reward).toBe(true);
    expect(stage(g, 'q_rc_kettle')).toBe('reward');
  });

  it('the cast: one family shares a surname; women are drawn narrow and men broad; nobody\'s hair is grey before fifty-five', () => {
    expect(FAMILIES.Ortega).toEqual(['npc_rc_02', 'npc_rc_12']);
    const women = ['npc_rc_02', 'npc_rc_05', 'npc_rc_06', 'npc_rc_09', 'npc_rc_13', 'npc_rc_16', 'npc_rc_w3'];
    const men = ['npc_rc_01', 'npc_rc_03', 'npc_rc_04', 'npc_rc_07', 'npc_rc_08', 'npc_rc_10', 'npc_rc_11', 'npc_rc_12', 'npc_rc_14', 'npc_rc_15', 'npc_rc_17', 'npc_rc_18', 'npc_rc_19'];
    for (const w of women) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of men) expect(NPCS[m].look.frame, m).toBe('broad');
    const GREY = [0x8a8782, 0xd2d0c8];
    for (const n of Object.values(NPCS)) if (n.id.startsWith('npc_rc_') && GREY.includes(n.look.over?.hair?.color as number)) expect(n.look.age ?? 0, n.id).toBeGreaterThanOrEqual(55);
  });

  it('every node in the corridor\'s trees has a line for coming back to it (U7), or only leaves', () => {
    let trees = 0;
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!id.startsWith('d_rc_') && !id.startsWith('d_re_rc_')) continue;
      trees++;
      for (const [nid, n] of Object.entries(d.nodes)) if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
    }
    expect(trees).toBeGreaterThanOrEqual(55);
  });

  it('every one of the seven companions has a word somewhere on the corridor', () => {
    const said = new Set<string>();
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!id.startsWith('d_rc_') && !id.startsWith('d_re_rc_')) continue;
      for (const n of Object.values(d.nodes)) for (const ij of n.interject ?? []) said.add(ij.companion);
    }
    for (const c of COMPANIONS) expect(said.has(c), c).toBe(true);
  });
});

// ---------------------------------------------------------------- the Line

describe('the Line as transport', () => {
  it('counts legs and hours from the network itself, and knows which rides pass Kettle Cut', () => {
    expect(legs('junction', 'depot')).toEqual({ n: 1, hours: 6, kettle: false });
    expect(legs('junction', 'halt_w')).toEqual({ n: 2, hours: 12, kettle: true });
    expect(legs('skirts', 'meridian')).toMatchObject({ n: 5, kettle: true });
  });

  it('a ticket at Four Ways: twenty-five a leg, the wait for the seven o\'clock and the legs\' hours, Kettle seen from the car, off at the stop', () => {
    const { g, q } = at('rc_fourways', 10);
    const t0 = g.minutes;
    talk('d_rc_board_fw', g, q, ['(West Halt, 2 legs. 50 Tolls.)']);
    expect(g.pc.inventory.tolls).toBe(750);
    expect(g.minutes).toBe(Math.floor(t0 / 1440) * 1440 + 1440 + 7 * 60 + 12 * 60);
    expect(g.world.knowledge.loc_lm_rc_kettle).toBe(true);
    expect(g.world.knowledge.rc_kettle_from_car).toBe(true);
    talk('d_rc_board_fw', g, q, ['(West Halt, 2 legs. 50 Tolls.)', '(Off at West Halt.)']);
    expect(g.flags.rc_rode).toBe(true);
    expect(g.flags.visited_halt_w).toBe(true);
    expect(g.flags.rc_rides).toBe(1);
  });

  it('every stop has a ticket point to every other, the Skirts\' board opens one, and the map is offered', () => {
    const { g, q } = at();
    for (const id of ['d_rc_board_fw', 'd_rc_board_hw', 'd_rc_board_he', 'd_rc_board_yd', 'd_rc_board_sk']) {
      const o = options(id, g, q);
      expect(o.filter((t) => / Tolls\.\)$/.test(t)).length, id).toBe(5);
      expect(o).toContain('(Look at the map of the Line.)');
    }
    expect(DIALOGUES.d_hs_board.nodes.look.options.some((o) => o.id === 'board.ride')).toBe(true);
  });

  it('a pass or a guild hand rides free; after the silence at Kettle every fare carries the levy', () => {
    const { g, q } = at();
    apply([{ give: 'k_rc_pass' }], g, q);
    expect(options('d_rc_board_fw', g, q)).toContain('(Yard Nine, one leg. No fare.)');
    talk('d_rc_board_fw', g, q, ['(Yard Nine, one leg. No fare.)']);
    expect(g.pc.inventory.tolls).toBe(800);
    const b = at();
    b.g.flags.rc_kettle_levy = true;
    expect(options('d_rc_board_fw', b.g, b.q)).toContain('(Yard Nine, one leg. 30 Tolls, with the Kettle levy.)');
  });

  it('the footplate from Yard Nine earns one free ride, for a pair of hands or a pair of eyes', () => {
    const { g, q } = at('rc_yard');
    skills(g, { mechanics: 60 });
    talk('d_rc_board_yd', g, q, ['(Ask Willem Visser', '(Read the gauges for him.)', '(Back to the board.)', '(Four Ways, one leg. No fare.)', '(Off at Four Ways.)']);
    expect(g.pc.inventory.tolls).toBe(800);
    expect(g.flags.rc_free_ride).toBe(false);
    const f = at('rc_yard');
    skills(f.g, { mechanics: -100, firearms: -100 });
    talk('d_rc_board_yd', f.g, f.q, ['(Ask Willem Visser', '(Ride as his eyes at the cuttings.)']);
    expect(f.g.flags.rc_free_ride).toBeUndefined();
  });

  it('the rods: taught by a rider, the through hopped on Yard Nine\'s curve at two, or the guard\'s twenty', () => {
    const { g, q } = at('rc_yard', 12);
    talk('d_rc_ferris', g, q, ['Ride the rods how?']);
    expect(g.world.knowledge.rc_rods_known).toBe(true);
    hour(g, 2);
    skills(g, { stealth: 90 });
    talk('d_rc_curve', g, q, ['(Step off the stone', '(Drop off at Kettle']);
    expect(g.flags.rc_rode_rods).toBe(true);
    const c = at('rc_yard', 2);
    c.g.world.knowledge.rc_rods_known = true;
    skills(c.g, { stealth: -100 });
    c.g.pc.sheet.baseAttrs.reflex = 1;
    talk('d_rc_curve', c.g, c.q, ['(Step off the stone', '(Pay twenty.)', '(Ride her all the way']);
    expect(c.g.pc.inventory.tolls).toBe(780);
  });

  it('West Halt\'s handcar runs the length for those West Halt trusts, never into Four Ways', () => {
    const { g, q } = at('rc_halt_w');
    expect(view('d_rc_handcar', g, q).options.some((o) => o.text.startsWith('(To Kettle'))).toBe(false);
    g.flags.rc_hw_trust = true;
    const o = options('d_rc_handcar', g, q);
    expect(o).toContain('(To Kettle Cut.)');
    expect(o.some((t) => t.includes('Four Ways'))).toBe(false);
  });
});

// ---------------------------------------------------------------- Kettle Cut: the rail bandits

describe('Kettle Cut: every way the band\'s line ends', () => {
  it('the cut gives up its evidence: the sealed car, the stock car, the handcar\'s marks, the guard\'s cases, the tag', () => {
    const { g, q } = at('rc_kettle');
    apply(trigger('rc_kettle', 'arrive').effects, g, q); q.update();
    expect(stage(g, 'q_rc_kettle')).toBe('reward');
    skills(g, { survival: 60 });
    for (const id of ['d_rc_kt_car', 'd_rc_kt_stock', 'd_rc_kt_rails']) talk(id, g, q);
    talk('d_rc_kt_cases', g, q, ['(Pick them up.)']);
    talk('d_rc_kt_blind', g, q, ['(Take the tag.)']);
    for (const l of ['l_rc_sealed', 'l_rc_stockcar', 'l_rc_handcar', 'l_rc_casings', 'l_rc_tag']) expect(g.world.leads[l], l).toBe(true);
    expect(has(g, 'k_rc_casings') && has(g, 'k_rc_tag')).toBe(true);
  });

  it('the register and the handcar\'s marks name the band and the man who lets them on', () => {
    const { g, q } = at('rc_fourways');
    talk('d_rc_halina', g, q, ['That\'s all.']);
    talk('d_rc_halina', g, q, ['Can I read the register?']);
    talk('d_rc_register', g, q);
    expect(g.world.leads.l_rc_token).toBe(true);
    g.world.leads.l_rc_handcar = true;
    conclude(g, q, 'c_rc_watch');
    expect(g.world.knowledge.rc_brodsky_known).toBe(true);
    expect(stage(g, 'q_rc_kettle')).toBe('watch');
    talk('d_rc_halina', g, q, ['Would you write me a fair copy']);
    expect(has(g, 'k_rc_register')).toBe(true);
  });

  it('ambush (fight): the bounty taken, the watch\'s night run at Kettle, fire opened; the bounty claimed', () => {
    const { g, q } = at('rc_fourways');
    talk('d_rc_kask', g, q, ['The reward.', 'Something else.', 'I\'ll take your bounty.']);
    expect(g.flags.rc_kettle_run).toBe(true);
    g.locationId = 'rc_kettle';
    hour(g, 1);
    expect(cond(trigger('rc_kettle', 'night').if, g)).toBe(true);
    expect(MAPS.rc_kettle.npcs!.filter((n) => cond(n.if, g)).length).toBe(4);
    talk('d_rc_kettle_night', g, q, ['(Open fire.)']);
    expect(g.flags).toMatchObject({ rc_bandits: 'ambush', rc_line: 'guild', rc_halts: 'starving', rc_chela: 'dead', rc_abe: 'dead', rc_kettle_fight: true });
    expect(cond(NPCS.npc_rc_02.hostileIf, g)).toBe(true);
    expect(stage(g, 'q_rc_kettle')).toBe('ambush');
    expect(status(g, 'q_rc_kettle')).toBe('done');
    g.locationId = 'rc_fourways';
    talk('d_rc_kask', g, q, ['Kettle is done.']);
    expect(g.pc.inventory.tolls).toBe(1000);
    expect(has(g, 'k_rc_pass')).toBe(true);
    // West Halt no longer places them
    g.locationId = 'rc_halt_w';
    expect(cond(MAPS.rc_halt_w.npcs!.find((n) => n.def === 'npc_rc_02')!.if, g)).toBe(false);
  });

  it('exposed (knowledge): the tag shown to Kask; his riders take the watch at the next dawn at Four Ways', () => {
    const { g, q } = at('rc_fourways');
    nameTheWatch(g, q);
    g.locationId = 'rc_fourways';
    talk('d_rc_kask', g, q, ['That\'s all.']);
    talk('d_rc_kask', g, q, ['The band at Kettle is West Halt', '(Show him the brass tag']);
    expect(g.flags).toMatchObject({ rc_bandits: 'exposed', rc_line: 'guild', rc_bounty_paid: true });
    expect(g.pc.inventory.tolls).toBe(1000);
    expect(status(g, 'q_rc_kettle')).toBe('done');
    expect(waitFor(g, q, 'rc_fourways', 6)).toContain('rc_riders');
    expect(g.flags).toMatchObject({ rc_abe: 'hanged', rc_chela: 'stocks', rc_watch_gone: true });
    expect(cond(MAPS.rc_fourways.npcs!.find((n) => n.id === 'npc_rc_02_stocks')!.if, g)).toBe(true);
    talk('d_rc_chela_off', g, q, ['(Leave it.)']);
    expect(g.flags.rc_chela).toBe('off');
    expect(view('d_rc_kt_grave', g, q).text).toContain('a rope');
  });

  it('exposed on a story alone needs the words to carry it', () => {
    const { g, q } = at('rc_fourways');
    g.world.knowledge.rc_watch_known = true;
    skills(g, { speech: -100 });
    talk('d_rc_kask', g, q, ['That\'s all.']);
    talk('d_rc_kask', g, q, ['The band at Kettle is West Halt', '(My word.']);
    expect(g.flags.rc_bandits).toBeUndefined();
  });

  it('pilot (tech, no violence): the token system, rule 183, the signalwoman persuaded, the instrument failed at night', () => {
    const { g, q } = at('rc_fourways');
    nameTheWatch(g, q);
    g.locationId = 'rc_fourways';
    skills(g, { speech: 60 });
    talk('d_rc_halina', g, q, ['What do you do here?', 'Something else.', 'What happens if an instrument fails?', 'Something else.', 'Let it fail. Tonight.']);
    expect(g.flags.rc_halina_agrees).toBe(true);
    expect(has(g, 'k_rc_rulebook')).toBe(true);
    hour(g, 23);
    talk('d_rc_instrument', g, q, ['(Watch her write it.)']);
    expect(g.flags).toMatchObject({ rc_bandits: 'pilot', rc_pilot: true, rc_line: 'halts', rc_halts: 'paid', rc_hw_trust: true });
    expect(stage(g, 'q_rc_kettle')).toBe('pilot');
    expect(view('d_rc_instrument', g, q).text).toContain('FAILED');
    // the halts' boards and the ride read it
    expect(view('d_rc_board_hw', g, q).text).toContain('TRAINS STOP ON REQUEST');
  });

  it('pilot by your own hand at night needs the science; a slip rings the bell', () => {
    const { g, q } = at('rc_fourways', 23);
    g.world.knowledge.rc_pilot_known = true;
    skills(g, { science: -100 });
    talk('d_rc_instrument', g, q, ['(Set it to fail safe.)']);
    expect(g.flags.rc_bandits).toBeUndefined();
    expect(g.flags.rc_instrument_tried).toBe(true);
    const k = at('rc_fourways', 23);
    k.g.world.party.push(KES);
    talk('d_rc_instrument', k.g, k.q, ['(Kes:']);
    expect(k.g.flags.rc_pilot_how).toBe('kes');
  });

  it('deal (talk, no violence): the stationmaster confronted, then the factor at his desk; refused once, it stays refused', () => {
    const { g, q } = at('rc_fourways');
    nameTheWatch(g, q);
    confront(g, q);
    expect(g.world.knowledge.rc_joaquin_known).toBe(true);
    talk('d_rc_brodsky', g, q, ['About Kettle.', 'Stop the hold-ups.']);
    expect(g.flags.rc_deal_open).toBe(true);
    skills(g, { speech: 70 });
    talk('d_rc_kask', g, q, ['That\'s all.']);
    talk('d_rc_kask', g, q, ['Pay the halts', '(Lay it out']);
    expect(g.flags).toMatchObject({ rc_bandits: 'deal', rc_line: 'shared', rc_halts: 'paid' });
    expect(has(g, 'k_rc_pass')).toBe(true);
    expect(stage(g, 'q_rc_kettle')).toBe('deal');

    const f = at('rc_fourways');
    f.g.world.knowledge.rc_watch_known = true;
    f.g.flags.rc_deal_open = true;
    skills(f.g, { speech: -100 });
    talk('d_rc_kask', f.g, f.q, ['That\'s all.']);
    talk('d_rc_kask', f.g, f.q, ['Pay the halts', '(Lay it out']);
    expect(f.g.flags.rc_deal_failed).toBe(true);
    expect(options('d_rc_kask', f.g, f.q).some((t) => t.startsWith('Pay the halts'))).toBe(false);
  });

  it('the deal reads what the player knows and who is with them', () => {
    const { g, q } = at('rc_fourways');
    g.world.knowledge.rc_watch_known = true;
    g.world.knowledge.rc_east_known = true;
    g.world.leads.l_rc_length = true;
    g.world.party.push(ODILE);
    g.flags.rc_deal_open = true;
    talk('d_rc_kask', g, q, ['That\'s all.']);
    const r = talk('d_rc_kask', g, q, ['Pay the halts']);
    const o = r.view()!.options.find((x) => x.text.startsWith('(Lay it out'))!;
    expect(o.checkLabel).toBe('Speech 25');
    expect(o.checkNotes.length).toBe(4);
  });

  it('paid (barter): the stationmaster\'s price; the hold-ups go on and the guild levies the Line', () => {
    const { g, q } = at('rc_fourways');
    nameTheWatch(g, q);
    confront(g, q);
    talk('d_rc_brodsky', g, q, ['About Kettle.', 'What\'s my silence worth?', '(Take it.)']);
    expect(g.flags).toMatchObject({ rc_bandits: 'paid', rc_line: 'stationmaster', rc_kettle_levy: true });
    expect(g.pc.inventory.tolls).toBe(920);
    expect(view('d_rc_poster', g, q).text).toContain('KETTLE LEVY');
    expect(stage(g, 'q_rc_kettle')).toBe('paid');
  });

  it('the hold-up on the road: faces seen, the rule heard; drawing on them ends the line as the guild would', () => {
    const { g, q } = at('rc_fourways', 23);
    const leg = { from: 'junction', to: 'depot', by: 'foot' as const, hours: 20, fare: 0, risk: 1 };
    expect(eligibleEncounters(g, WORLD_MAP, leg, ROAD_ENCOUNTERS).some((e) => e.id === 're_rc_holdup')).toBe(true);
    g.pc.sheet.baseAttrs.senses = 8;
    talk('d_re_rc_holdup', g, q, ['What are you here for?', '(Something else.)', '(Sit on the bank and watch.)']);
    expect(g.world.knowledge).toMatchObject({ rc_held_up: true, rc_watch_look: true, rc_abe_named: true, rc_saw_holdup: true });
    // her face, at West Halt
    g.locationId = 'rc_halt_w';
    talk('d_rc_chela', g, q);
    expect(g.world.knowledge.rc_watch_known).toBe(true);
    const d = at('rc_fourways', 23);
    talk('d_re_rc_holdup', d.g, d.q, ['(Draw.)']);
    expect(d.g.flags.rc_bandits).toBe('ambush');
    expect(eligibleEncounters(d.g, WORLD_MAP, leg, ROAD_ENCOUNTERS).some((e) => e.id === 're_rc_holdup')).toBe(false);
    d.g.flags.rc_line = 'guild';
    expect(eligibleEncounters(d.g, WORLD_MAP, leg, ROAD_ENCOUNTERS).some((e) => e.id === 're_rc_riders')).toBe(true);
  });
});

// ---------------------------------------------------------------- Murder Hangs

describe('Murder Hangs: the boy who shot the guard', () => {
  function sentenced() {
    const { g, q } = at('rc_fourways');
    g.flags.rc_bandits = 'pilot';
    talk('d_rc_brodsky', g, q, ['(Say nothing.)']);
    expect(g.flags.rc_abe_sentenced).toBe(true);
    expect(stage(g, 'q_rc_abe')).toBe('sentence');
    return { g, q };
  }

  it('argued with the guard\'s cases and a witness: put off the Line, and a new line under the third rule', () => {
    const { g, q } = sentenced();
    apply([{ give: 'k_rc_casings' }], g, q);
    g.world.knowledge.rc_ferris_saw = true;
    skills(g, { speech: 30 });
    talk('d_rc_brodsky', g, q, ['The guard fired first.']);
    expect(g.flags.rc_abe).toBe('exiled');
    expect(stage(g, 'q_rc_abe')).toBe('exiled');
    expect(view('d_rc_law', g, q).text).toContain('UNLESS FIRED UPON FIRST');
    expect(waitFor(g, q, 'rc_fourways', 6)).not.toContain('rc_abe_rope');
  });

  it('left alone, he hangs at the next dawn the player is at Four Ways, and not before', () => {
    const { g, q } = sentenced();
    expect(waitFor(g, q, 'rc_halt_w', 6)).not.toContain('rc_abe_rope');
    expect(waitFor(g, q, 'rc_fourways', 6)).toContain('rc_abe_rope');
    expect(g.flags.rc_abe).toBe('hanged');
    expect(status(g, 'q_rc_abe')).toBe('failed');
  });

  it('taken out of the cell at night, or given to the guild for its hundred', () => {
    const a = sentenced();
    hour(a.g, 23);
    skills(a.g, { security: 70 });
    talk('d_rc_fw_watch', a.g, a.q, ['(Pick the cell']);
    expect(a.g.flags.rc_abe).toBe('fled');
    expect(stage(a.g, 'q_rc_abe')).toBe('fled');
    const b = sentenced();
    talk('d_rc_kask', b.g, b.q, ['That\'s all.']);
    talk('d_rc_kask', b.g, b.q, ['The one who shot Gorse']);
    expect(b.g.flags.rc_abe).toBe('guild');
    expect(b.g.pc.inventory.tolls).toBe(900);
  });
});

// ---------------------------------------------------------------- Stock Car

describe('Stock Car: the twelve in West Halt\'s tower', () => {
  function inside() {
    const { g, q } = at('rc_halt_w', 12);
    apply(trigger('rc_halt_w', 'tower').effects, g, q); q.update();
    expect(stage(g, 'q_rc_stock')).toBe('tower');
    skills(g, { speech: 60 });
    talk('d_rc_tower', g, q, ['(Call up softly']);
    expect(g.world.knowledge.rc_tower_inside).toBe(true);
    expect(has(g, 'k_rc_paper')).toBe(true);
    expect(stage(g, 'q_rc_stock')).toBe('twelve');
    return { g, q };
  }

  it('the keeper\'s key or the pilotman\'s bread also get you up; what intake means depends on what you know', () => {
    const { g, q } = at('rc_halt_w', 12);
    g.world.knowledge.rc_tower_cough = true;
    skills(g, { speech: 60 });
    talk('d_rc_socorro', g, q, ['That\'s all.']);
    talk('d_rc_socorro', g, q, ['Let me up the tower.']);
    expect(g.flags.rc_tower_leave).toBe(true);
    expect(view('d_rc_tower', g, q).text).toContain('Yaw Boateng');
    const n = at('rc_halt_w', 22);
    n.g.world.knowledge.rc_tower_cough = true;
    skills(n.g, { speech: 60 });
    talk('d_rc_eamon', n.g, n.q, ['I\'m not the guild. Let me up.']);
    expect(n.g.flags.rc_tower_leave).toBe(true);
    const p = inside();
    p.g.world.conclusions.c_hs_parts = true;
    const r = talk('d_rc_tower', p.g, p.q, ['INTAKE']);
    expect(r.view()!.text).toContain('We will not be going to the Weighhouse');
  });

  it('openfield (survival): walked south by night; Joaquin stays home; West Halt trusts you', () => {
    const { g, q } = inside();
    hour(g, 23);
    skills(g, { survival: 60 });
    talk('d_rc_tower', g, q, ['I can get you out.', '(Tonight, south to Openfield by the old track.']);
    expect(g.flags).toMatchObject({ rc_stock: 'openfield', rc_joaquin: 'home', rc_hw_trust: true });
    expect(status(g, 'q_rc_stock')).toBe('done');
    expect(cond(MAPS.rc_halt_w.npcs!.find((n) => n.def === 'npc_rc_12')!.if, g)).toBe(true);
    expect(view('d_rc_tower', g, q).text).toContain('12 — GONE — GOOD');
  });

  it('forged (tech) by hand or by Kes; bought (barter) at the Concern\'s desk, ninety with Odile', () => {
    const f = inside();
    skills(f.g, { science: 60 });
    talk('d_rc_tower', f.g, f.q, ['I can get you out.', '(Forge their discharges']);
    expect(f.g.flags.rc_stock).toBe('forged');
    expect(has(f.g, 'k_rc_discharges')).toBe(true);
    const k = inside();
    k.g.world.party.push(KES);
    talk('d_rc_tower', k.g, k.q, ['I can get you out.', '(Kes:']);
    expect(k.g.flags.rc_stock).toBe('forged');
    const b = inside();
    b.g.locationId = 'rc_yard';
    b.g.world.party.push(ODILE);
    talk('d_rc_whitlock', b.g, b.q, ['That\'s all.']);
    talk('d_rc_whitlock', b.g, b.q, ['The paper on those twelve.', '(Odile leans', '(Back to the desk.)', '(Pay ninety.)']);
    expect(b.g.flags.rc_stock).toBe('bought');
    expect(b.g.pc.inventory.tolls).toBe(710);
    expect(stage(b.g, 'q_rc_stock')).toBe('bought');
  });

  it('sold (the worst): fifteen a head, the companions\' disgust, and the Concern takes them at the next dawn at West Halt', () => {
    const { g, q } = inside();
    g.locationId = 'rc_yard';
    talk('d_rc_whitlock', g, q, ['That\'s all.']);
    talk('d_rc_whitlock', g, q, ['I know where your twelve are.', '(Tell him: West Halt']);
    expect(g.flags.rc_stock).toBe('sold');
    expect(g.pc.inventory.tolls).toBe(980);
    expect(approval(g, 'npc_rd_03')).toBe(-30);
    expect(waitFor(g, q, 'rc_yard', 6)).not.toContain('rc_stock_taken');
    expect(waitFor(g, q, 'rc_halt_w', 6)).toContain('rc_stock_taken');
    expect(g.flags.rc_joaquin).toBe('taken');
    expect(view('d_rc_chela', g, q).text).toContain('Get on your train');
  });
});

// ---------------------------------------------------------------- the dead engine

describe('Yard Nine\'s dead engine', () => {
  function leashed() {
    const { g, q } = at('rc_yard', 12);
    skills(g, { mechanics: 60 });
    talk('d_rc_dorcas', g, q, ['(Take the plate off']);
    expect(g.world.leads.l_rc_asleep).toBe(true);
    talk('d_rc_ida', g, q, ['What\'s wrong with Dorcas?', 'Something else.', 'When did she die?']);
    conclude(g, q, 'c_rc_leashed');
    expect(stage(g, 'q_rc_engine')).toBe('leashed');
    return { g, q };
  }

  it('contract (barter): the Concern\'s offer signed; Dorcas runs on its terms', () => {
    const { g, q } = leashed();
    talk('d_rc_whitlock', g, q, ['The engine.']);
    expect(has(g, 'k_rc_offer')).toBe(true);
    talk('d_rc_ida', g, q, ['Sign Whitlock\'s paper.', 'Sign it. Two engines.']);
    expect(g.flags).toMatchObject({ rc_engine: 'contract', rc_concern_paths: true });
    expect(has(g, 'k_rc_pass')).toBe(true);
    expect(status(g, 'q_rc_engine')).toBe('done');
  });

  it('dark (chrome): woken without its channel by Kes; the Concern\'s man leaves', () => {
    const { g, q } = leashed();
    g.world.party.push(KES);
    talk('d_rc_dorcas', g, q, ['(Kes: wake her']);
    expect(g.flags).toMatchObject({ rc_engine: 'dark', rc_concern_marked: true, rc_whitlock_gone: true });
    expect(cond(MAPS.rc_yard.npcs!.find((n) => n.def === 'npc_rc_19')!.if, g)).toBe(false);
    expect(approval(g, KES)).toBe(10);
  });

  it('spare (talk): the signalwoman\'s last board, fitted; Four Ways has no spare now', () => {
    const { g, q } = leashed();
    g.locationId = 'rc_fourways';
    skills(g, { speech: 60 });
    talk('d_rc_halina', g, q, ['That\'s all.']);
    talk('d_rc_halina', g, q, ['Yard Nine\'s engine needs a board']);
    expect(has(g, 'k_rc_spare')).toBe(true);
    g.locationId = 'rc_yard';
    talk('d_rc_dorcas', g, q, ['(Fit Halina']);
    expect(g.flags).toMatchObject({ rc_engine: 'spare', rc_box_nospare: true });
    expect(has(g, 'k_rc_spare')).toBe(false);
    expect(view('d_rc_slate', g, q).text).toContain('DORCAS — IN SERVICE');
  });
});

// ---------------------------------------------------------------- the east length

describe('Bolts on the East Length', () => {
  function plan() {
    const { g, q } = at('rc_halt_e', 12);
    talk('d_rc_gerrit', g, q, ['That\'s all.']);
    expect(stage(g, 'q_rc_east')).toBe('bolts');
    talk('d_rc_shed', g, q);
    skills(g, { speech: 60 });
    talk('d_rc_kofi', g, q, ['Seen anybody out on the line']);
    conclude(g, q, 'c_rc_east');
    expect(stage(g, 'q_rc_east')).toBe('plan');
    talk('d_rc_imani', g, q, ['That\'s all.']);
    return { g, q };
  }

  it('stopped (talk), told (the stationmaster\'s watch), or stood down once the halts are paid', () => {
    const s = plan();
    talk('d_rc_imani', s.g, s.q, ['You\'re loosening the east length yourself.', 'Don\'t.']);
    expect(s.g.flags.rc_east).toBe('stopped');
    expect(status(s.g, 'q_rc_east')).toBe('done');
    const t = plan();
    talk('d_rc_imani', t.g, t.q, ['You\'re loosening the east length yourself.', 'I\'m telling the stationmaster.']);
    expect(t.g.flags).toMatchObject({ rc_east: 'told', rc_imani: 'gone' });
    expect(cond(MAPS.rc_halt_e.npcs!.find((n) => n.def === 'npc_rc_13')!.if, t.g)).toBe(false);
    const p = plan();
    p.g.flags.rc_halts = 'paid';
    talk('d_rc_imani', p.g, p.q, ['The trains stop at the halts again.']);
    expect(p.g.flags.rc_east).toBe('stood_down');
  });

  it('fixed (tech) at night by your own hand, without needing to know who', () => {
    const { g, q } = at('rc_halt_e', 12);
    skills(g, { mechanics: 60 });
    talk('d_rc_joint', g, q, ['(Look at the bolts closely.)']);
    hour(g, 23);
    talk('d_rc_joint', g, q, ['(Tighten every bolt']);
    expect(g.flags.rc_east).toBe('fixed');
    expect(stage(g, 'q_rc_east')).toBe('fixed');
  });

  it('helped: the through comes off at the next two o\'clock the player is at East Halt; warned, its driver lives', () => {
    const h = plan();
    talk('d_rc_imani', h.g, h.q, ['You\'re loosening the east length yourself.', 'I\'ll help you.']);
    expect(waitFor(h.g, h.q, 'rc_yard', 2)).toHaveLength(0);
    expect(waitFor(h.g, h.q, 'rc_halt_e', 2)).toContain('rc_derail');
    expect(h.g.flags).toMatchObject({ rc_derailed: true, rc_willem_dead: true });
    expect(stage(h.g, 'q_rc_east')).toBe('derailed');
    expect(view('d_rc_cutting', h.g, h.q).text).toContain('WILLEM VISSER');
    const w = plan();
    talk('d_rc_imani', w.g, w.q, ['You\'re loosening the east length yourself.', 'I\'ll help you.']);
    w.g.locationId = 'rc_yard';
    talk('d_rc_willem', w.g, w.q, ['That\'s all.']);
    talk('d_rc_willem', w.g, w.q, ['Take the through slow']);
    expect(waitFor(w.g, w.q, 'rc_halt_e', 2)).toContain('rc_derail_slow');
    expect(w.g.flags.rc_willem_dead).toBeUndefined();
  });
});

// ---------------------------------------------------------------- the corridor's roads

describe('the corridor\'s road encounters', () => {
  it('the family fits the corridor\'s legs, and the track gang and the rod rider give what they know', () => {
    const { g, q } = at('rc_fourways', 10);
    const leg = { from: 'junction', to: 'halt_e', by: 'foot' as const, hours: 30, fare: 0, risk: 1 };
    const ids = eligibleEncounters(g, WORLD_MAP, leg, ROAD_ENCOUNTERS).map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['re_rc_wreck', 're_rc_gang', 're_rc_rods', 're_rc_drovers']));
    const sallow = { from: 'shale', to: 'drywells', by: 'foot' as const, hours: 10, fare: 0, risk: 1 };
    expect(eligibleEncounters(g, WORLD_MAP, sallow, ROAD_ENCOUNTERS).some((e) => e.id.startsWith('re_rc_'))).toBe(false);
    talk('d_re_rc_gang', g, q, ['Who pays you for this?']);
    expect(g.world.leads.l_rc_length).toBe(true);
    skills(g, { medicine: 60 });
    talk('d_re_rc_rods', g, q, ['(Set it with what\'s to hand.)']);
    expect(g.world.knowledge.rc_rods_known).toBe(true);
  });

  it('the halts\' tins and the length money tell why only the Concern\'s cars are opened', () => {
    const { g, q } = at('rc_halt_w', 12);
    talk('d_rc_stall_w', g, q);
    talk('d_rc_socorro', g, q, ['How does a halt live']);
    conclude(g, q, 'c_rc_why');
    expect(g.world.knowledge.rc_why_known).toBe(true);
  });
});
