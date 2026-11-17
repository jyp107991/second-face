import { describe, expect, it } from 'vitest';
import { DIALOGUES, FAMILIES, MAPS, NPCS, QUESTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { SITES } from '../src/content/world/sites';
import { CONCLUSIONS } from '../src/content/world/leads';
import { STOPS, legs } from '../src/content/dialogue/rc_line';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';

/**
 * B5b, the last piece — Carrick, Meridian's docks across the dry river: the Line's real Meridian stop and the tide boat's city
 * landing (both networks ridden to and from every stop), its joins to the city (the river road round by the Wall, the quay
 * tram to Clover, the Loop boards' answer to NO BRIDGE, the Hulls' cradle to Bridgeward's drop at night); Crane Six by every
 * way it ends (the whole truth before the Harbour court, the short gang, the Stand's stoppage held or broken, the guild's
 * private bill, the Bond's money), the girl off the through by five, the Hulls by four; the call-on and the fish steps;
 * companions' words. Played headless.
 */

type G = ReturnType<typeof newGameState>;
const COMPANIONS = ['npc_c9_03', 'npc_rd_03', 'npc_sh_17', 'npc_nb_03', 'npc_of_03', 'npc_md_nine', 'npc_hs_01'];
const KES = 'npc_hs_01';
const WREN = 'npc_rd_03';

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
    q.update();
  }
  return r;
}
const view = (id: string, g: G, q: QuestEngine) => new DialogueRunner(DIALOGUES[id], g, q).view()!;
const options = (id: string, g: G, q: QuestEngine) => view(id, g, q).options.map((o) => o.text);
const trigger = (map: string, id: string) => MAPS[map].triggers!.find((t) => t.id === id)!;
const placed = (map: string, id: string) => MAPS[map].npcs!.find((n) => (n.id ?? n.def) === id)!;
const skills = (g: G, s: Record<string, number>) => Object.assign(g.pc.sheet.skillBought, s);
const has = (g: G, item: string) => g.pc.inventory.items.some((i) => i.def === item);
const stage = (g: G, quest: string) => g.world.quests[quest]?.stage;
const status = (g: G, quest: string) => g.world.quests[quest]?.status;
function hour(g: G, h: number): void {
  let t = Math.floor(g.minutes / 1440) * 1440 + h * 60;
  if (t <= g.minutes) t += 1440;
  g.minutes = t;
}
/** Arm the events that wait for an hour, then go to that hour at Carrick and run them. */
function at(g: G, q: QuestEngine, h: number): string[] {
  g.locationId = 'md_docks';
  runWorldEvents(g, WORLD_EVENTS, q);
  hour(g, h);
  const fired = runWorldEvents(g, WORLD_EVENTS, q);
  q.update();
  return fired;
}
function conclude(g: G, q: QuestEngine, id: string) {
  const c = tryConclude(g, CONCLUSIONS[id].from, CONCLUSIONS, q);
  expect(c?.id).toBe(id);
  q.update();
}
/** The goto effects a tree's options carry, wherever they are. */
function gotos(x: unknown, out: { location: string; spawn: string }[] = []): { location: string; spawn: string }[] {
  if (!x || typeof x !== 'object') return out;
  if (Array.isArray(x)) { x.forEach((v) => gotos(v, out)); return out; }
  const o = x as Record<string, unknown>;
  if (o.event === 'goto') { const d = o.data as { location: string; spawn: string }; out.push({ location: d.location, spawn: d.spawn }); }
  for (const v of Object.values(o)) gotos(v, out);
  return out;
}

function onQuay(h = 10) {
  const g = newGameState('md_docks', 0, 0);
  g.minutes = 120 * 1440 + h * 60;
  g.locationId = 'md_docks';
  g.flags.ch1_done = true;
  g.pc.inventory.tolls = 800;
  const q = new QuestEngine(QUESTS, g);
  apply(trigger('md_docks', 'arrive').effects, g, q);
  q.update();
  return { g, q };
}
/** The hook: the box under Crane Six, and Connie on the Stand (who gives you her relief's leave for the cab). */
function hook(g: G, q: QuestEngine) {
  apply(trigger('md_docks', 'box').effects, g, q);
  talk('d_dk_box', g, q, ['(Leave it.)']);
  talk('d_dk_connie', g, q, ['Can I get up into Six\'s cab?', 'Thank you.', 'That\'s all.']);
  q.update();
}
/** Six's cab: the tape. */
function cab(g: G, q: QuestEngine) {
  skills(g, { mechanics: 60 });
  talk('d_dk_cab', g, q, ['(Unhook the chain and climb', '(Read the load recorder.)']);
}
/** The widow: met, then shown the tape, and she gives up the tin and the truth. */
function widow(g: G, q: QuestEngine) {
  talk('d_dk_oksana', g, q, ['That\'s all.']);
  talk('d_dk_oksana', g, q, ['(Show her the load tape']);
}
/** Call the Harbour court on Crane Six and lay out what the player has. */
function court(g: G, q: QuestEngine, evidence: string[], argue: string, after: string[] = []) {
  if (!g.flags.dk_dahl_met) talk('d_dk_dahl', g, q, ['That\'s all.']);
  talk('d_dk_dahl', g, q, ['I want to bring something', 'Gang Nine\'s appeal.', ...evidence.flatMap((e) => [e, '(Go on.)']), argue, ...after]);
}

// ---------------------------------------------------------------- the place

describe('Carrick as a place', () => {
  it('is a Meridian district beside Bridgeward across the dry river, with the spawns its ways in arrive by', () => {
    expect(MAPS.md_docks).toMatchObject({ settlement: 'meridian' });
    expect(MAPS.md_docks.name.startsWith('The ')).toBe(false);
    expect(SITES.md_docks).toMatchObject({ kind: 'open', beside: { site: 'md_bridgeward', side: 'e' } });
    for (const s of ['start', 'from_precinct', 'platform', 'yard', 'stairs', 'barge', 'tram', 'hulls', 'cradle', 'bunk', 'court']) expect(MAPS.md_docks.spawns.some((x) => x.id === s), s).toBe(true);
  });

  it('the river road runs round by the Wall from the Precinct\'s gate and back, an hour each way', () => {
    const south = MAPS.md_precinct.exits!.find((e) => 'location' in e.to && e.to.location === 'md_docks')!;
    expect(south.to).toEqual({ location: 'md_docks', spawn: 'from_precinct' });
    expect(south.if).toBeUndefined();
    expect(south.effects).toEqual([{ time: 60 }]);
    const north = MAPS.md_docks.exits!.find((e) => 'location' in e.to && e.to.location === 'md_precinct')!;
    expect(north.to).toEqual({ location: 'md_precinct', spawn: 'from_docks' });
    // the field map's arrivals from the Line and the shore come up the same road to the gate
    for (const s of ['from_halt_w', 'from_hamlet_shore', 'from_rigs', 'from_docks']) expect(MAPS.md_precinct.spawns.find((x) => x.id === s)).toMatchObject({ x: 5, y: 57 });
  });

  it('every node in Carrick\'s trees has a line for coming back to it (U7), or only leaves', () => {
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!id.startsWith('d_dk_') && id !== 'd_md_river_sign') continue;
      for (const [nid, n] of Object.entries(d.nodes)) if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
    }
  });

  it('every ride, rope, tram and stair out of Carrick lands on a map and spawn that exist', () => {
    const all: { from: string; location: string; spawn: string }[] = [];
    for (const [id, d] of Object.entries(DIALOGUES)) if (id.startsWith('d_dk_')) for (const g of gotos(d)) all.push({ from: id, ...g });
    expect(all.length).toBeGreaterThanOrEqual(10);
    for (const g of all) expect(MAPS[g.location]?.spawns.some((s) => s.id === g.spawn), `${g.from} → ${g.location}/${g.spawn}`).toBe(true);
    for (const t of MAPS.md_docks.triggers ?? []) for (const e of t.effects ?? []) if ('event' in e && e.event === 'dialogue') expect(DIALOGUES[(e.data as { tree: string }).tree]).toBeDefined();
  });

  it('the cast: women narrow, men broad, kin listed, names their own, and the guards and hired men turn only on their flags', () => {
    const cast = Object.values(NPCS).filter((n) => n.id.startsWith('npc_dk_'));
    expect(cast.length).toBeGreaterThanOrEqual(20);
    for (const n of cast) expect(n.look.frame, n.id).toBeDefined();
    for (const w of ['npc_dk_01', 'npc_dk_02', 'npc_dk_04', 'npc_dk_06', 'npc_dk_08', 'npc_dk_09', 'npc_dk_11', 'npc_dk_14']) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of ['npc_dk_03', 'npc_dk_05', 'npc_dk_07', 'npc_dk_10', 'npc_dk_12', 'npc_dk_13']) expect(NPCS[m].look.frame, m).toBe('broad');
    expect(FAMILIES.Ofori).toEqual(['npc_dk_07', 'npc_dk_08']);
    const g = newGameState('md_docks', 0, 0);
    expect(cond(NPCS.npc_dk_h1.hostileIf, g)).toBe(false);
    expect(cond(NPCS.npc_dk_c1.hostileIf, g)).toBe(false);
    g.flags.dk_breakers_fight = true; g.flags.dk_bond_fight = true;
    expect(cond(NPCS.npc_dk_h1.hostileIf, g)).toBe(true);
    expect(cond(NPCS.npc_dk_c1.hostileIf, g)).toBe(true);
    // a lost fight on the Stand is the stoppage broken, not the end of the game
    expect(NPCS.npc_dk_h1.beaten).toEqual(expect.arrayContaining([{ set: 'dk_black', value: 'broken' }]));
  });

  it('every one of the seven companions has a word somewhere in Carrick', () => {
    const said = new Set<string>();
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!id.startsWith('d_dk_')) continue;
      for (const n of Object.values(d.nodes)) for (const ij of n.interject ?? []) said.add(ij.companion);
    }
    for (const c of COMPANIONS) expect(said.has(c), c).toBe(true);
  });
});

// ---------------------------------------------------------------- the networks

describe('the Line\'s end and the tide boat\'s landing', () => {
  it('the Line\'s Meridian stop is Carrick\'s platform, from every ticket point on the corridor, and the through drops you at the yard throat', () => {
    expect(WORLD_MAP.networks.net_line.stops[0]).toBe('meridian');
    expect(STOPS.meridian).toEqual({ name: 'Meridian Docks', map: 'md_docks', spawn: 'platform' });
    for (const id of ['d_rc_board_fw', 'd_rc_board_hw', 'd_rc_board_he', 'd_rc_board_yd', 'd_rc_board_sk']) {
      expect(gotos(DIALOGUES[id].nodes.ride_meridian)).toEqual([{ location: 'md_docks', spawn: 'platform' }]);
    }
    expect(gotos(DIALOGUES.d_rc_curve.nodes.rods.options.find((o) => o.id === 'rods.city'))).toEqual([{ location: 'md_docks', spawn: 'yard' }]);
    const { g, q } = onQuay();
    talk('d_rc_board_fw', g, q, ['(Meridian Docks, 3 legs. 75 Tolls.)', '(Off at Meridian Docks.)']);
    expect(g.pc.inventory.tolls).toBe(725);
    expect(g.flags.visited_meridian).toBe(true);
  });

  it('Carrick\'s own window sells the Line to every other stop at the network\'s fare, and the map', () => {
    const { g, q } = onQuay();
    const o = options('d_dk_line', g, q);
    expect(o.filter((t) => / Tolls\.\)$/.test(t)).length).toBe(5);
    expect(o).toContain(`(Two-Twelve, ${legs('meridian', 'skirts').n} legs. ${25 * legs('meridian', 'skirts').n} Tolls.)`);
    expect(o).toContain('(Look at the map of the Line.)');
    for (const to of ['halt_w', 'depot', 'junction', 'halt_e', 'skirts']) expect(gotos(DIALOGUES.d_dk_line.nodes[`ride_${to}`]).length, to).toBe(1);
    expect(NPCS.npc_dk_12.dialogue).toBe('d_dk_line');
    talk('d_dk_line', g, q, ['What about the through?']);
    expect(g.world.knowledge.dk_through_heard).toBe(true);
  });

  it('the tide boat goes down the delta from the water stairs to the Stilts and the Rigs, and comes up from both to the stairs', () => {
    const { g, q } = onQuay(12);
    const t0 = g.minutes;
    talk('d_dk_tide', g, q, ['(Down the delta to Gull Stilts. 6 Tolls)']);
    expect(g.pc.inventory.tolls).toBe(794);
    expect(g.minutes).toBe(Math.floor(t0 / 1440) * 1440 + 17 * 60 + 480);
    expect(g.flags.visited_hamlet_shore).toBe(true);
    expect(gotos(DIALOGUES.d_dk_tide)).toEqual([{ location: 'ds_stilts', spawn: 'jetty' }, { location: 'ds_rigs', spawn: 'landing' }]);
    // up from the shore: Mele's boat and the boat itself, and the tide boat calling at the Rigs
    for (const id of ['d_ds_mele', 'd_ds_tideboat', 'd_ds_launch']) expect(gotos(DIALOGUES[id]).some((x) => x.location === 'md_docks' && x.spawn === 'stairs'), id).toBe(true);
    const s = newGameState('ds_stilts', 0, 0);
    s.minutes = 10 * 1440 + 8 * 60; s.locationId = 'ds_stilts'; s.pc.inventory.tolls = 50;
    const sq = new QuestEngine(QUESTS, s);
    talk('d_ds_tideboat', s, sq, ['Up the delta to the city at six']);
    expect(s.pc.inventory.tolls).toBe(44);
    expect(s.minutes).toBe(11 * 1440 + 6 * 60 + 480);
  });

  it('the Wet\'s barges tie up at the barge quay: the river\'s boards land there, and its own board sells every reach up', () => {
    for (const id of ['d_nw_board_st', 'd_nw_board_dm', 'd_nw_board_ll']) expect(gotos(DIALOGUES[id].nodes.ride_meridian), id).toEqual([{ location: 'md_docks', spawn: 'barge' }]);
    const { g, q } = onQuay();
    const o = options('d_dk_barge', g, q);
    expect(o.filter((t) => / Tolls\.\)$/.test(t)).length).toBe(3);
    expect(o.some((t) => t.startsWith('(Low Landing, one reach up.'))).toBe(true);
  });

  it('the quay tram runs to Clover and back, outside the Wall, without the lens', () => {
    const { g, q } = onQuay();
    talk('d_dk_tram', g, q, ['Clover, for the Loop. (2 Tolls)']);
    expect(g.pc.inventory.tolls).toBe(798);
    expect(gotos(DIALOGUES.d_dk_tram)).toEqual([{ location: 'md_ring', spawn: 'loop' }]);
    g.locationId = 'md_ring';
    g.flags.md_inside = false;
    expect(options('d_dr_loop', g, q)).toContain('The quay tram, round the ring road to the Docks. (2 Tolls)');
    talk('d_dr_loop', g, q, ['The quay tram']);
    expect(g.pc.inventory.tolls).toBe(796);
  });

  it('every Loop board inside the Wall answers NO BRIDGE: round by the Wall, by Clover\'s tram, and a basket on a wire', () => {
    const { g, q } = onQuay();
    g.flags.md_inside = true; g.flags.md_market_open = true;
    const boards: [string, string[]][] = [['d_md_loop', ['(The chalk through the Docks.)', '(THE DOCKS: NO BRIDGE.)']], ['d_mk_loop', ['(THE DOCKS: NO BRIDGE.)']], ['d_lr_loop', ['(THE DOCKS: NO BRIDGE.)']], ['d_st_loop', ['(THE DOCKS: NO BRIDGE.)']], ['d_bw_loop', ['(THE DOCKS: NO BRIDGE.)']]];
    for (const [board, picks] of boards) {
      delete g.world.knowledge.dk_far_bank;
      talk(board, g, q, [...picks, '(Back to the board.)']);
      expect(g.world.knowledge.dk_far_bank, board).toBe(true);
    }
    expect(g.world.knowledge.dk_cradle_heard).toBe(true);
    expect(view('d_md_loop', g, q).text).toContain('THE DOCKS');
    expect(view('d_md_loop', g, q).text).not.toContain('WORKS');
  });

  it('the Hulls\' cradle crosses the dry bed to Bridgeward\'s drop at night, both ways, once the Hulls have taught you the lamp', () => {
    const { g, q } = onQuay(22);
    talk('d_dk_cradle', g, q, ['(Ride the basket over the dry river']);
    expect(g.pc.inventory.tolls).toBe(795);
    expect(g.world.knowledge.dk_cradle_known).toBe(true);
    g.locationId = 'md_bridgeward';
    expect(options('d_bw_drop', g, q).some((t) => t.startsWith('(Swing a lamp'))).toBe(true);
    talk('d_bw_drop', g, q, ['(Swing a lamp']);
    expect(g.pc.inventory.tolls).toBe(790);
    expect(gotos(DIALOGUES.d_bw_drop)).toEqual([{ location: 'md_docks', spawn: 'cradle' }]);
    // by day, the basket is chained and the lamp means nothing
    hour(g, 12);
    expect(options('d_bw_drop', g, q).some((t) => t.startsWith('(Swing a lamp'))).toBe(false);
    expect(view('d_dk_cradle', g, q).options.some((o) => o.text.startsWith('(Ride'))).toBe(false);
  });
});

// ---------------------------------------------------------------- Crane Six

describe('Crane Six', () => {
  it('the hook: the box, the board, Connie; the box weighs twice its bill and the cab\'s tape says why', () => {
    const { g, q } = onQuay();
    hook(g, q);
    expect(stage(g, 'q_dk_crane')).toBe('digging');
    expect(g.world.leads.l_dk_box).toBeDefined();
    cab(g, q);
    expect(has(g, 'k_dk_tape')).toBe(true);
    conclude(g, q, 'c_dk_override');
    expect(stage(g, 'q_dk_crane')).toBe('override');
    // a failed read still gives the tape; the weighbridge clerk reads it
    const f = onQuay();
    hook(f.g, f.q);
    skills(f.g, { mechanics: -100, science: -100 });
    talk('d_dk_cab', f.g, f.q, ['(Unhook the chain and climb', '(Read the load recorder.)']);
    expect(has(f.g, 'k_dk_tape')).toBe(true);
    expect(f.g.world.leads.l_dk_tape).toBeUndefined();
    talk('d_dk_tomas', f.g, f.q, ['That\'s all.']);
    talk('d_dk_tomas', f.g, f.q, ['(Show him the load tape']);
    expect(f.g.world.leads.l_dk_tape).toBeDefined();
  });

  it('the turn: the widow sees KEY 6/N and gives up the tin; or the tin\'s two leads conclude it', () => {
    const { g, q } = onQuay();
    hook(g, q);
    cab(g, q);
    widow(g, q);
    expect(has(g, 'k_dk_tin')).toBe(true);
    expect(g.world.knowledge.dk_paid).toBe(true);
    expect(stage(g, 'q_dk_crane')).toBe('turn');
    const c = onQuay();
    c.g.world.leads.l_dk_key = { at: 0 } as never; c.g.world.leads.l_dk_medicine = { at: 0 } as never;
    conclude(c.g, c.q, 'c_dk_paid');
    expect(c.g.world.knowledge.dk_paid).toBe(true);
  });

  it('bond: the whole of it before the Harbour court; every through box to the plate; the funeral paid by the player', () => {
    const { g, q } = onQuay();
    hook(g, q);
    cab(g, q);
    widow(g, q);
    skills(g, { speech: 40 });
    court(g, q, ['(The load tape', '(Dmytro\'s tin'], 'Dmytro turned the cutout himself', ['(Put thirty on the step']);
    expect(g.flags.dk_crane).toBe('bond');
    expect(g.flags.dk_weighbridge).toBe('on');
    expect(g.flags.dk_buried).toBe('paid');
    expect(stage(g, 'q_dk_crane')).toBe('bond');
    expect(status(g, 'q_dk_crane')).toBe('done');
    expect(view('d_dk_weighbridge', g, q).text).toContain('needle');
    expect(view('d_dk_stand', g, q).text).toContain('ALL THROUGH BOXES TO THE PLATE');
  });

  it('without enough on the table the court adjourns and sits again; it never closes the appeal on a failed argument', () => {
    const { g, q } = onQuay();
    hook(g, q);
    cab(g, q);
    widow(g, q);
    skills(g, { speech: -100 });
    court(g, q, [], 'Dmytro turned the cutout himself');
    expect(g.flags.dk_adjourned).toBe(true);
    expect(g.flags.dk_crane).toBeUndefined();
    skills(g, { speech: 60 });
    court(g, q, ['(The load tape'], 'Dmytro turned the cutout himself', ['(Leave the steps.)']);
    expect(g.flags.dk_crane).toBe('bond');
  });

  it('gang: the short gang argued, the tin kept out of it; the negligence struck and the funeral paid by the guild', () => {
    const { g, q } = onQuay();
    hook(g, q);
    skills(g, { speech: 40 });
    talk('d_dk_platt', g, q, ['How many were on Six that night?', 'Something else.', 'Show me the order']);
    expect(has(g, 'k_dk_order')).toBe(true);
    court(g, q, ['(Platt\'s order'], 'Nine was five where Six wants eight');
    expect(g.flags.dk_crane).toBe('gang');
    expect(g.flags.dk_buried).toBe('guild');
    expect(stage(g, 'q_dk_crane')).toBe('gang');
    // with the tin on the table the court knows, and the short gang is no longer an argument
    const t = onQuay();
    hook(t.g, t.q);
    cab(t.g, t.q);
    widow(t.g, t.q);
    talk('d_dk_platt', t.g, t.q, ['How many were on Six that night?']);
    talk('d_dk_dahl', t.g, t.q, ['That\'s all.']);
    const r = talk('d_dk_dahl', t.g, t.q, ['I want to bring something', 'Gang Nine\'s appeal.', '(Dmytro\'s tin', '(Go on.)']);
    expect(r.view()!.options.some((o) => o.text.startsWith('Nine was five'))).toBe(false);
  });

  it('black: the Stand blacks the Bond, and at dawn the Ring\'s men are talked home; the Concern settles', () => {
    const { g, q } = onQuay();
    hook(g, q);
    cab(g, q);
    widow(g, q);
    g.pc.inventory.items.push({ def: 'k_dk_slip', qty: 1 } as never);
    skills(g, { speech: 40 });
    talk('d_dk_connie', g, q, ['It was Dmytro.', 'Tell them the Bond paid him', 'Black the Bond.']);
    expect(g.flags.dk_crane).toBe('black');
    expect(stage(g, 'q_dk_crane')).toBe('stoppage');
    // the hired men are on the Stand at dawn, and the Stand's trigger opens their scene
    const brk = trigger('md_docks', 'breakers');
    hour(g, 12);
    expect(cond(placed('md_docks', 'npc_dk_h1').if, g)).toBe(false);
    expect(cond(brk.if, g)).toBe(false);
    hour(g, 5);
    expect(cond(placed('md_docks', 'npc_dk_h1').if, g)).toBe(true);
    expect(cond(brk.if, g)).toBe(true);
    skills(g, { speech: 60 });
    talk('d_dk_breakers', g, q, ['You\'re from the Ring.']);
    expect(g.flags.dk_black).toBe('won');
    expect(g.flags.dk_stand).toBe('organised');
    expect(g.flags.dk_stand_owed).toBe(true);
    expect(g.flags.dk_weighbridge).toBe('on');
    expect(stage(g, 'q_dk_crane')).toBe('black_won');
    expect(cond(placed('md_docks', 'npc_dk_h1').if, g)).toBe(false);
    hour(g, 12);
    expect(view('d_dk_stand', g, q).text).toContain('WE STOOD');
    // the call-on pays a full gang's wage now
    hour(g, 5);
    const before = g.pc.inventory.tolls;
    talk('d_dk_stand', g, q, ['(Stand on the line', '(Take your tallies.)']);
    expect(g.pc.inventory.tolls).toBe(before + 12);
  });

  it('black, broken: stepping off the line at dawn; and a fight on the Stand turns only the hired men', () => {
    const b = onQuay();
    b.g.flags.dk_crane = 'black';
    hour(b.g, 5);
    talk('d_dk_breakers', b.g, b.q, ['(Step off the line and out of it.)']);
    expect(b.g.flags.dk_black).toBe('broken');
    expect(view('d_dk_connie', b.g, b.q).text).toContain('does not look up');
    const f = onQuay();
    f.g.flags.dk_crane = 'black';
    talk('d_dk_breakers', f.g, f.q, ['(Step off the line at them.)']);
    expect(f.g.flags.dk_breakers_fight).toBe(true);
    expect(cond(NPCS.npc_dk_h2.hostileIf, f.g)).toBe(true);
    expect(cond(NPCS.npc_dk_c1.hostileIf, f.g)).toBe(false);
  });

  it('guild: the tin given in private; a finder\'s fee, a quiet bill, the board left as it was', () => {
    const { g, q } = onQuay();
    hook(g, q);
    cab(g, q);
    widow(g, q);
    talk('d_dk_dahl', g, q, ['That\'s all.']);
    talk('d_dk_dahl', g, q, ['(Give her Dmytro\'s tin', '(Take the fee.)']);
    expect(g.flags.dk_crane).toBe('guild');
    expect(has(g, 'k_dk_tin')).toBe(false);
    expect(g.pc.inventory.tolls).toBe(900);
    expect(stage(g, 'q_dk_crane')).toBe('guild');
    expect(view('d_dk_stand', g, q).text).toContain('STOOD DOWN');
  });

  it('bought: the Bond\'s hundred and fifty for the papers, or the same paid to the widow', () => {
    const { g, q } = onQuay();
    hook(g, q);
    cab(g, q);
    widow(g, q);
    talk('d_dk_roux', g, q, ['That\'s all.']);
    talk('d_dk_roux', g, q, ['(Lay what you\'ve found', '(Take the hundred and fifty.)']);
    expect(g.flags.dk_crane).toBe('bought');
    expect(g.pc.inventory.tolls).toBe(950);
    expect(stage(g, 'q_dk_crane')).toBe('bought');
    const w = onQuay();
    hook(w.g, w.q);
    cab(w.g, w.q);
    widow(w.g, w.q);
    skills(w.g, { speech: 60 });
    talk('d_dk_roux', w.g, w.q, ['That\'s all.']);
    talk('d_dk_roux', w.g, w.q, ['(Lay what you\'ve found', 'Pay the widow']);
    expect(w.g.flags.dk_widow_paid).toBe(true);
    expect(w.g.pc.inventory.tolls).toBe(800);
  });

  it('the skim: the Bond\'s drawer at night, and the register, conclude it; a caught thief is put out, not killed', () => {
    const { g, q } = onQuay(23);
    skills(g, { security: 70 });
    talk('d_dk_bond_desk', g, q, ['(Pick the drawer.)']);
    expect(has(g, 'k_dk_slip')).toBe(true);
    talk('d_dk_weighbridge', g, q, ['(Read the register']);
    conclude(g, q, 'c_dk_skim');
    expect(g.world.knowledge.dk_skim).toBe(true);
    const c = onQuay(23);
    skills(c.g, { security: -100, speech: -100 });
    c.g.pc.sheet.baseAttrs.reflex = 1;
    talk('d_dk_bond_desk', c.g, c.q, ['(Pick the drawer.)', '(Run for the gate.)']);
    expect(c.g.flags.dk_bond_barred).toBe(true);
    expect(c.g.flags.dk_bond_fight).toBeUndefined();
  });
});

// ---------------------------------------------------------------- Mirela's Paper

describe('Mirela\'s Paper', () => {
  /** The notice, Connie's word, Espe, and the girl. */
  function find(g: G, q: QuestEngine) {
    talk('d_dk_floor_notice', g, q, ['(Leave it.)']);
    talk('d_dk_connie', g, q, ['That\'s all.']);
    talk('d_dk_espe', g, q, ['That\'s all.']);
    talk('d_dk_connie', g, q, ['Espe\'s niece']);
    talk('d_dk_espe', g, q, ['The Bond has lost a returnable.']);
    expect(g.flags.dk_mirela_known).toBe(true);
    talk('d_dk_mirela', g, q, ['Why won\'t you take the coat off?']);
    expect(g.flags.dk_mirela_met).toBe(true);
    expect(stage(g, 'q_dk_girl')).toBe('paper');
  }

  it('shore: down the delta on the tide boat; she leaves the cookshop', () => {
    const { g, q } = onQuay();
    find(g, q);
    talk('d_dk_mirela', g, q, ['Where do you want to go?', 'The tide boat goes down the delta']);
    expect(g.flags.dk_girl).toBe('shore');
    expect(stage(g, 'q_dk_girl')).toBe('shore');
    expect(cond(placed('md_docks', 'npc_dk_09').if, g)).toBe(false);
  });

  it('choir: the Line east and the track south; the twelve walked it, so West Halt sees her down it without a check', () => {
    const { g, q } = onQuay();
    find(g, q);
    skills(g, { survival: -100 });
    g.flags.rc_stock = 'openfield';
    talk('d_dk_mirela', g, q, ['Where do you want to go?', 'The seven o\'clock east to West Halt']);
    expect(g.flags.dk_girl).toBe('choir');
    expect(stage(g, 'q_dk_girl')).toBe('choir');
  });

  it('bought: her surety discharged off the Bond, talked down to ninety', () => {
    const { g, q } = onQuay();
    find(g, q);
    skills(g, { barter: 60 });
    talk('d_dk_roux', g, q, ['That\'s all.']);
    talk('d_dk_roux', g, q, ['What would the girl\'s paper cost', 'That balance is padded.', '(Pay ninety.)', '(Take it to her.)']);
    expect(g.flags.dk_girl).toBe('bought');
    expect(g.pc.inventory.tolls).toBe(710);
    expect(cond(placed('md_docks', 'npc_dk_09').if, g)).toBe(true);
    expect(view('d_dk_mirela', g, q).text).toContain('burned the paper');
  });

  it('ruled: the Harbour court reads the schedule of goods and finds a person is a passenger, never cargo', () => {
    const { g, q } = onQuay();
    find(g, q);
    talk('d_dk_act', g, q, ['(Leave it.)']);
    skills(g, { speech: 45 });
    talk('d_dk_dahl', g, q, ['That\'s all.']);
    talk('d_dk_dahl', g, q, ['I want to bring something', 'Mirela Stan', '(Her paper', '(Go on.)', '(Schedule 2', '(Go on.)', 'A person is not goods.', 'She\'ll work it off', '(Leave the steps.)']);
    expect(g.flags.dk_girl).toBe('ruled');
    expect(g.flags.dk_prec_passenger).toBe(true);
    expect(stage(g, 'q_dk_girl')).toBe('ruled');
  });

  it('returned: the Bond\'s sixty; she goes east on the through at two, the next night the player is at Carrick', () => {
    const { g, q } = onQuay();
    find(g, q);
    talk('d_dk_roux', g, q, ['That\'s all.']);
    talk('d_dk_roux', g, q, ['(Tell him where the girl is', '(Take the sixty.)']);
    expect(g.flags.dk_girl).toBe('returned');
    expect(g.pc.inventory.tolls).toBe(860);
    g.locationId = 'md_precinct';
    runWorldEvents(g, WORLD_EVENTS, q);
    hour(g, 3);
    expect(runWorldEvents(g, WORLD_EVENTS, q)).not.toContain('dk_girl_taken');
    g.locationId = 'md_docks';
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('dk_girl_taken');
    expect(g.flags.dk_girl_gone).toBe(true);
    expect(view('d_dk_espe', g, q).text).toContain('Not yours');
  });
});

// ---------------------------------------------------------------- Stakes on the Hulls

describe('Stakes on the Hulls', () => {
  function meet(g: G, q: QuestEngine) {
    apply(trigger('md_docks', 'hulls').effects, g, q);
    talk('d_dk_kwabena', g, q, ['The blue stakes.']);
    talk('d_dk_imogen', g, q, ['And the people in the ships?']);
    expect(stage(g, 'q_dk_far')).toBe('masters');
  }

  it('crewed: Schedule 3 and ninety years of Sundays before the Harbour court; the cradle runs on', () => {
    const { g, q } = onQuay();
    meet(g, q);
    talk('d_dk_act', g, q, ['(Leave it.)']);
    talk('d_dk_abena', g, q, ['The crew books.']);
    talk('d_dk_abena', g, q, ['Could I take the Star\'s book']);
    expect(has(g, 'k_dk_crewbook')).toBe(true);
    conclude(g, q, 'c_dk_crewed');
    skills(g, { speech: 30 });
    talk('d_dk_dahl', g, q, ['That\'s all.']);
    talk('d_dk_dahl', g, q, ['I want to bring something', 'The Hulls\' berths.', '(Schedule 3', '(Go on.)', '(The Benguela Star', '(Go on.)', 'The Hulls are vessels in port', '(Leave the steps.)']);
    expect(g.flags.dk_hulls).toBe('crewed');
    expect(stage(g, 'q_dk_far')).toBe('crewed');
    hour(g, 22);
    expect(view('d_dk_cradle', g, q).options.some((o) => o.text.startsWith('(Ride'))).toBe(true);
  });

  it('cleared: House Vane\'s purse carried to the masters; the Harbour\'s men clear the bed at the next dawn and cut the cradle', () => {
    const { g, q } = onQuay();
    meet(g, q);
    skills(g, { barter: 60 });
    talk('d_dk_imogen', g, q, ['I\'ll carry your purse', '(Go down the river stairs']);
    expect(g.flags.dk_hulls).toBe('cleared');
    expect(stage(g, 'q_dk_far')).toBe('cleared');
    expect(at(g, q, 6)).toContain('dk_hulls_cleared');
    expect(g.flags.dk_hulls_empty).toBe(true);
    expect(cond(placed('md_docks', 'npc_dk_07').if, g)).toBe(false);
    hour(g, 22);
    expect(view('d_dk_cradle', g, q).text).toContain('cut');
  });

  it('sold: all nine together at three times the price; moved: the far end worked onto the tram bridge\'s footing under the Bond', () => {
    const s = onQuay();
    meet(s.g, s.q);
    skills(s.g, { barter: 60 });
    talk('d_dk_imogen', s.g, s.q, ['Buy all nine hulls together', 'A hundred and twenty a hull']);
    expect(s.g.flags.dk_hulls).toBe('sold');
    expect(stage(s.g, 'q_dk_far')).toBe('sold');
    const m = onQuay();
    meet(m.g, m.q);
    skills(m.g, { science: 60 });
    talk('d_dk_plate', m.g, m.q, ['(Read the depths to rock.)']);
    talk('d_dk_imogen', m.g, m.q, ['Build on the tram bridge\'s footing', '(Work the old tram bridge']);
    expect(m.g.flags.dk_hulls).toBe('moved');
    expect(m.g.flags.dk_abutment).toBe('bond');
    expect(stage(m.g, 'q_dk_far')).toBe('moved');
    expect(view('d_dk_stakes', m.g, m.q).text).toContain('Bond\'s fence');
  });

  it('the Crown\'s road reads the Ring\'s steel and Bridgeward\'s near end', () => {
    const { g, q } = onQuay();
    talk('d_dk_imogen', g, q, ['That\'s all.']);
    g.flags.dr_leven = 'stripped';
    expect(new DialogueRunner(DIALOGUES.d_dk_imogen, g, q).view()).toBeTruthy();
    const r = talk('d_dk_imogen', g, q, ['Where is the steel coming from?']);
    expect(r.view()!.text).toContain('LEVEN');
    g.flags.bw_dogs_hold = true;
    expect(view('d_dk_imogen', g, q).text).toContain('dog');
  });
});

// ---------------------------------------------------------------- the quay's work, and what it reads

describe('the quay\'s work and its reads', () => {
  it('the call-on at dawn pays a day\'s tallies, or passes you over; Grigor\'s lines at dawn', () => {
    const { g, q } = onQuay(5);
    g.pc.sheet.baseAttrs.brawn = 8;
    talk('d_dk_stand', g, q, ['(Stand on the line', '(Take your tallies.)']);
    expect(g.pc.inventory.tolls).toBe(807);
    const f = onQuay(5);
    f.g.pc.sheet.baseAttrs.brawn = 1;
    talk('d_dk_stand', f.g, f.q, ['(Stand on the line', '(Try tomorrow.)']);
    expect(f.g.pc.inventory.tolls).toBe(800);
    const h = onQuay(5);
    skills(h.g, { survival: 60 });
    talk('d_dk_grigor', h.g, h.q, ['That\'s all.']);
    talk('d_dk_grigor', h.g, h.q, ['(Rent a line']);
    expect(has(h.g, 'c_dk_mullet')).toBe(true);
  });

  it('a factor the shore put off copies dues at the Customs House; the cookshop has the twelve\'s news; Kes knows the girl\'s terrace', () => {
    const { g, q } = onQuay();
    const thorne = placed('md_docks', 'npc_ds_04_carrick');
    expect(thorne.dialogue).toBe('d_dk_thorne');
    expect(cond(thorne.if, g)).toBe(false);
    g.flags.ds_thorne = 'fled';
    expect(cond(thorne.if, g)).toBe(true);
    g.flags.rc_stock = 'openfield';
    const r = talk('d_dk_espe', g, q, ['What\'s the news on the quay?']);
    expect(r.view()!.text).toContain('Choir');
    expect(DIALOGUES.d_dk_mirela.nodes.intro.interject!.some((i) => i.companion === KES)).toBe(true);
    expect(DIALOGUES.d_dk_mirela.nodes.why.interject!.some((i) => i.companion === WREN)).toBe(true);
  });
});
