import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, FAMILIES, MAPS, NPCS, QUESTS, ROAD_ENCOUNTERS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { SITES } from '../src/content/world/sites';
import { reaches } from '../src/content/dialogue/nw_river';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';
import { eligibleEncounters } from '../src/engine/world/roads';
import { planTrip } from '../src/engine/world/travel';

/**
 * B5c — the Teeth mines and the Northern Wet: Number Four, Sawtown, Ashby Dam and Low Landing as places; the river barges,
 * the north track, the bucket line and the old drift as ways about; Number Four's line by all four of its ends and the family
 * by all three, the machine below it by three; the dam's audit by all four; Sawtown's feud by all four; the barge run by all
 * three; the activities; the road encounters; companions' words; every event waiting for the player. Played headless.
 */

type G = ReturnType<typeof newGameState>;
const KES = 'npc_hs_01';
const COMPANIONS = ['npc_c9_03', 'npc_rd_03', 'npc_sh_17', 'npc_nb_03', 'npc_of_03', 'npc_md_nine', 'npc_hs_01'];
const B5C = (id: string) => /^d_(tm|nw|re_tm|re_nw)_/.test(id);

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
const placed = (map: string, key: string) => MAPS[map].npcs!.find((n) => (n.id ?? n.def) === key)!;
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
function waitFor(g: G, q: QuestEngine, where: string, h: number): string[] {
  g.locationId = where;
  const fired = runWorldEvents(g, WORLD_EVENTS, q);
  hour(g, h);
  fired.push(...runWorldEvents(g, WORLD_EVENTS, q));
  q.update();
  return fired;
}
function at(map: string, h = 10) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 150 * 1440 + h * 60;
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

// ---------------------------------------------------------------- the places

describe('B5c: the Teeth mines and the Northern Wet as places', () => {
  it('binds the four world locations to their maps and settlements, each an open site, with four cells beside them', () => {
    expect(WORLD_MAP.locations.mine_teeth).toMatchObject({ name: 'Number Four Pit', map: 'tm_pit', settlement: 'number_four', region: 'teeth' });
    expect(WORLD_MAP.locations.timber).toMatchObject({ name: 'Sawtown', map: 'nw_sawtown', settlement: 'sawtown', region: 'northern_wet' });
    expect(WORLD_MAP.locations.dam).toMatchObject({ name: 'Ashby Dam', map: 'nw_dam', settlement: 'ashby' });
    expect(WORLD_MAP.locations.riverdock).toMatchObject({ name: 'Low Landing', map: 'nw_landing', settlement: 'low_landing' });
    for (const m of ['tm_pit', 'nw_sawtown', 'nw_dam', 'nw_landing']) expect(SITES[m]?.kind).toBe('open');
    for (const m of ['tm_level', 'tm_trail', 'nw_gallery', 'nw_bank']) expect(SITES[m]?.kind).toBe('cell');
    expect(MAPS.tm_pit.hunting).toBeGreaterThan(0.6);
    expect(MAPS.nw_sawtown.hunting).toBeGreaterThan(0.5);
    const walk = planTrip(WORLD_MAP, 'depot', 'dam', { modes: [], networks: [], known: () => true, hour: 8 })!;
    expect(walk.legs.map((l) => l.to)).toEqual(['timber', 'dam']);
    expect(planTrip(WORLD_MAP, 'halt_e', 'mine_teeth', { modes: [], networks: [], known: () => true, hour: 8 })!.legs.map((l) => l.to)).toEqual(['mine_teeth']);
  });

  it('gossip runs both ways along the river, the north track, the bucket line and over the col; each map has the spawns its neighbours arrive by', () => {
    for (const s of ['number_four', 'sawtown', 'ashby', 'low_landing']) {
      expect(SETTLEMENTS[s].region).toMatch(/teeth|northern_wet/);
      for (const [to, d] of Object.entries(SETTLEMENTS[s].roads)) expect(SETTLEMENTS[to].roads[s], `${s}-${to}`).toBe(d);
    }
    const spawns = (m: string) => MAPS[m].spawns.map((s) => s.id);
    expect(spawns('tm_pit')).toEqual(expect.arrayContaining(['from_halt_e', 'from_skirts', 'bucket', 'drift', 'cage', 'col']));
    expect(spawns('tm_level')).toEqual(expect.arrayContaining(['cage', 'mouth', 'adit']));
    expect(spawns('nw_sawtown')).toEqual(expect.arrayContaining(['landing', 'from_depot', 'railhead', 'from_dam']));
    expect(spawns('nw_dam')).toEqual(expect.arrayContaining(['lock', 'from_riverdock', 'from_timber', 'gatehouse']));
    expect(spawns('nw_landing')).toEqual(expect.arrayContaining(['quay', 'from_dam', 'from_meridian', 'berth']));
    expect(MAPS.md_precinct.spawns.some((s) => s.id === 'from_riverdock')).toBe(true);
    expect(MAPS.rc_yard.talk!.rc_yd_north.dialogue).toBe('d_nw_north_track');
    expect(MAPS.rc_halt_e.talk!.rc_he_bucket.dialogue).toBe('d_tm_bucket_foot');
  });

  it('arriving puts each place on the map', () => {
    const { g, q } = at('tm_pit');
    for (const [map, loc] of [['tm_pit', 'loc_mine_teeth'], ['nw_sawtown', 'loc_timber'], ['nw_dam', 'loc_dam'], ['nw_landing', 'loc_riverdock']]) {
      apply(trigger(map, 'arrive').effects, g, q);
      expect(g.world.knowledge[loc], loc).toBe(true);
    }
  });

  it('the cast: four families share surnames; women narrow and men broad; grey only from fifty-five; Black people\'s hair afro-textured', () => {
    expect(FAMILIES.Nnadi).toEqual(['npc_tm_06', 'npc_tm_07']);
    expect(FAMILIES.Wexford).toEqual(['npc_nw_01', 'npc_nw_02']);
    expect(FAMILIES.Brandvold).toEqual(['npc_nw_06', 'npc_nw_07']);
    expect(FAMILIES.Huaman).toEqual(['npc_nw_09', 'npc_nw_10']);
    const women = ['npc_tm_01', 'npc_tm_03', 'npc_tm_05', 'npc_tm_06', 'npc_nw_01', 'npc_nw_02', 'npc_nw_05', 'npc_nw_07', 'npc_nw_10', 'npc_nw_11', 'npc_nw_12', 'npc_nw_16', 'npc_tm_w2'];
    const men = ['npc_tm_02', 'npc_tm_04', 'npc_tm_07', 'npc_nw_03', 'npc_nw_04', 'npc_nw_06', 'npc_nw_08', 'npc_nw_09', 'npc_nw_13', 'npc_nw_14', 'npc_nw_15', 'npc_tm_w1', 'npc_nw_w1'];
    for (const w of women) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of men) expect(NPCS[m].look.frame, m).toBe('broad');
    const GREY = [0x8a8782, 0xd2d0c8];
    const AFRO = ['coily_twa', 'coily_afro', 'coily_afro_big', 'paint_shaved', 'paint_buzz', 'paint_fade', 'paint_coils', 'paint_cornrows', 'none'];
    for (const n of Object.values(NPCS)) {
      if (!/^npc_(tm|nw)_/.test(n.id)) continue;
      if (GREY.includes(n.look.over?.hair?.color as number)) expect(n.look.age ?? 0, n.id).toBeGreaterThanOrEqual(55);
      if (/african/.test(n.look.ancestry ?? '')) expect(AFRO, n.id).toContain(n.look.over?.hair?.style);
    }
  });

  it('every node in the B5c trees has a line for coming back to it (U7), or only leaves', () => {
    let trees = 0, nodes = 0;
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!B5C(id)) continue;
      trees++;
      for (const [nid, n] of Object.entries(d.nodes)) {
        nodes++;
        if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
      }
    }
    expect(trees).toBeGreaterThanOrEqual(70);
    expect(nodes).toBeGreaterThanOrEqual(250);
  });

  it('every one of the seven companions has a word somewhere in the Teeth and the Wet', () => {
    const said = new Set<string>();
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!B5C(id)) continue;
      for (const n of Object.values(d.nodes)) for (const ij of n.interject ?? []) said.add(ij.companion);
    }
    for (const c of COMPANIONS) expect(said.has(c), c).toBe(true);
  });
});

// ---------------------------------------------------------------- the ways about

describe('the ways about: the barges, the north track, the bucket line', () => {
  it('counts reaches and hours from the network itself, and knows which rides pass Ashby\'s lock', () => {
    expect(WORLD_MAP.networks.net_barge.every).toBe(24);
    expect(reaches('timber', 'dam')).toEqual({ n: 1, hours: 14, down: true, lock: false });
    expect(reaches('timber', 'riverdock')).toMatchObject({ n: 2, hours: 32, down: true, lock: true });
    expect(reaches('meridian', 'timber')).toMatchObject({ n: 3, down: false, lock: true });
  });

  it('a landing board: ten a reach, the wait for the six o\'clock and the reach\'s hours, off at the stop', () => {
    const { g, q } = at('nw_landing', 10);
    for (const id of ['d_nw_board_st', 'd_nw_board_dm', 'd_nw_board_ll']) {
      const o = options(id, g, q);
      expect(o.filter((t) => / Tolls\.\)$/.test(t)).length, id).toBe(3);
      expect(o).toContain('(Look at the map of the river.)');
    }
    const t0 = g.minutes;
    talk('d_nw_board_ll', g, q, ['(Ashby lock, one reach up. 10 Tolls.)', '(Off at Ashby lock.)']);
    expect(g.pc.inventory.tolls).toBe(790);
    expect(g.minutes).toBe(Math.floor(t0 / 1440) * 1440 + 1440 + 6 * 60 + 18 * 60);
    expect(g.flags).toMatchObject({ nw_rode: true, visited_dam: true, nw_rides: 1 });
  });

  it('a turn at the sweeps rides free once; the Patience\'s token rides free always', () => {
    const { g, q } = at('nw_sawtown');
    g.pc.sheet.baseAttrs.brawn = 8;
    talk('d_nw_board_st', g, q, ['(Work your passage', '(Take an oar', '(Back to the board.)', '(Low Landing, 2 reaches down. No fare.)', '(Off at Low Landing.)']);
    expect(g.pc.inventory.tolls).toBe(800);
    expect(g.flags.nw_sweeps_ride).toBe(false);
    apply([{ give: 'k_nw_token' }], g, q);
    expect(options('d_nw_board_ll', g, q)).toContain('(the city, one reach down. No fare.)');
  });

  it('the north track carries the timber train only while Dorcas runs; the pass rides free; the Concern\'s paths make you wait', () => {
    const { g, q } = at('rc_yard', 9);
    expect(options('d_nw_north_track', g, q).some((t) => t.startsWith('(Ride'))).toBe(false);
    g.flags.rc_engine = 'spare';
    expect(options('d_nw_north_track', g, q)).toContain('(Ride the timber train to Sawtown. 15 Tolls.)');
    const t0 = g.minutes;
    talk('d_nw_north_track', g, q, ['(Ride the timber train to Sawtown. 15 Tolls.)', '(Off at Sawtown.)']);
    expect(g.minutes).toBe(Math.floor(t0 / 1440) * 1440 + 12 * 60 + 9 * 60);
    expect(g.flags.nw_timber_train).toBe(true);
    apply([{ give: 'k_rc_pass' }], g, q);
    expect(options('d_nw_railhead', g, q)).toContain('(Ride the timber train to Yard Nine. The Line pass.)');
    g.flags.rc_engine = 'contract';
    expect(options('d_nw_railhead', g, q)).toContain('(Wait for the Concern\'s paths and ride to Yard Nine. 15 Tolls.)');
  });

  it('the bucket line goes up from East Halt\'s cutting by day and down from Four, easier with the winchwoman\'s word', () => {
    const { g, q } = at('rc_halt_e', 10);
    talk('d_tm_bucket_foot', g, q, ['(Climb into an empty bucket']);
    expect(g.world.knowledge.tm_rode_bucket).toBe(true);
    const n = at('rc_halt_e', 23);
    expect(view('d_tm_bucket_foot', n.g, n.q).options.length).toBe(1);
    const d = at('tm_pit', 10);
    d.g.pc.sheet.baseAttrs.reflex = 1;
    expect(view('d_tm_bucket', d.g, d.q).options[0].checkMet).toBe(false);
    d.g.flags.tm_bucket_leave = true;
    d.g.pc.sheet.baseAttrs.reflex = 4;
    expect(view('d_tm_bucket', d.g, d.q).options[0]).toMatchObject({ checkLabel: 'Reflex 0', checkMet: true });
  });
});

// ---------------------------------------------------------------- Number Four: Taken on the Path

describe('Taken on the Path: every way the arrangement ends', () => {
  /** The board, the cutter, the trapper, the set by night, the smelter, the card, the cutter again: everything known. */
  function investigate(g: G, q: QuestEngine) {
    g.locationId = 'tm_pit';
    talk('d_tm_board', g, q);
    expect(stage(g, 'q_tm_path')).toBe('taken');
    talk('d_tm_tova', g, q, ['The three who were taken']);
    talk('d_tm_sachiko', g, q, ['You know the col.']);
    conclude(g, q, 'c_tm_told');
    hour(g, 23);
    skills(g, { stealth: 60, barter: 60 });
    talk('d_tm_set', g, q, ['(Read the log']);
    conclude(g, q, 'c_tm_radio');
    expect(stage(g, 'q_tm_path')).toBe('arrangement');
    hour(g, 14);
    talk('d_tm_gaspard', g, q, ['That\'s all.']);
    talk('d_tm_gaspard', g, q, ['Where does the tin go?', 'Something else.', 'What does the guild pay']);
    expect(g.world.leads.l_tm_price).toBe(true);
    apply([{ give: 'k_tm_requests' }], g, q);
    talk('d_tm_card', g, q);
    talk('d_tm_tova', g, q, ['(Show her the Concern\'s card.)']);
    conclude(g, q, 'c_tm_arrangement');
    conclude(g, q, 'c_tm_parts');
    expect(g.world.knowledge.tm_parts_known).toBe(true);
  }

  it('exposed (knowledge): the card read at the lamp meeting; Four votes the winchwoman down the mountain', () => {
    const { g, q } = at('tm_pit');
    investigate(g, q);
    hour(g, 19);
    talk('d_tm_board', g, q, ['(Call the lamp meeting', '(Watch her go.)']);
    expect(g.flags).toMatchObject({ tm_four: 'exposed', tm_ragna: 'gone', tm_price_cut: true, tm_shift: 'joined', tm_marked: true, tm_set_smashed: true });
    expect(stage(g, 'q_tm_path')).toBe('exposed');
    expect(status(g, 'q_tm_path')).toBe('done');
    expect(cond(placed('tm_pit', 'npc_tm_01').if, g)).toBe(false);
    expect(view('d_tm_board', g, q).text).toContain('rubbed out');
    expect(view('d_tm_set', g, q).text).toContain('in pieces');
  });

  it('the lamp meeting needs the card and the dusk', () => {
    const { g, q } = at('tm_pit', 12);
    expect(options('d_tm_board', g, q).some((t) => t.startsWith('(Call'))).toBe(false);
    apply([{ give: 'k_tm_requests' }], g, q);
    expect(options('d_tm_board', g, q).some((t) => t.startsWith('(Call'))).toBe(false);
    hour(g, 19);
    expect(options('d_tm_board', g, q).some((t) => t.startsWith('(Call'))).toBe(true);
  });

  it('ended (talk, no violence): confronted with what the letters mean, she ends it herself; without the words she refuses', () => {
    const { g, q } = at('tm_pit');
    investigate(g, q);
    skills(g, { speech: 50 });
    talk('d_tm_ragna', g, q, ['That\'s all.']);
    talk('d_tm_ragna', g, q, ['You tell the Clean', 'Do you know what the letters', '(Wait.)']);
    expect(g.flags.tm_ragna_knows).toBe(true);
    const r = talk('d_tm_ragna', g, q, ['You tell the Clean']);
    const end = r.view()!.options.find((o) => o.text.startsWith('End it.'))!;
    expect(end.checkLabel).toBe('Speech 25');
    talk('d_tm_ragna', g, q, ['You tell the Clean', 'End it.']);
    expect(g.flags).toMatchObject({ tm_four: 'ended', tm_ragna: 'stays', tm_price_cut: true, tm_set_closed: true });
    expect(stage(g, 'q_tm_path')).toBe('ended');
    expect(cond(placed('tm_pit', 'npc_tm_01').if, g)).toBe(true);
    const f = at('tm_pit');
    f.g.world.knowledge.tm_arrangement_known = true;
    skills(f.g, { speech: -100 });
    talk('d_tm_ragna', f.g, f.q, ['That\'s all.']);
    talk('d_tm_ragna', f.g, f.q, ['You tell the Clean', 'End it.']);
    expect(f.g.flags.tm_four).toBeUndefined();
  });

  it('kept (barter): her tin money for silence, and the companions\' worst', () => {
    const { g, q } = at('tm_pit');
    g.world.knowledge.tm_arrangement_known = true;
    talk('d_tm_ragna', g, q, ['That\'s all.']);
    talk('d_tm_ragna', g, q, ['You tell the Clean', 'What\'s it worth', '(Take it.)']);
    expect(g.flags).toMatchObject({ tm_four: 'kept', tm_next_season: true });
    expect(g.pc.inventory.tolls).toBe(920);
    expect(approval(g, 'npc_rd_03')).toBe(-20);
    expect(approval(g, KES)).toBe(-20);
    expect(stage(g, 'q_tm_path')).toBe('kept');
  });

  it('fought: the Clean on the switchback by night while the family is due, fired on', () => {
    const { g, q } = at('tm_pit', 22);
    talk('d_tm_desmond', g, q, ['Who are you waiting for?', 'I\'ll bring them down.']);
    expect(g.flags.tm_family_due).toBe(true);
    expect(cond(placed('tm_pit', 'npc_tm_g1').if, g)).toBe(true);
    expect(cond(trigger('tm_pit', 'switchback').if, g)).toBe(true);
    talk('d_tm_clean', g, q, ['Who are you here for?', '(Open fire.)']);
    expect(g.flags).toMatchObject({ tm_four: 'fought', tm_clean_fought: true, tm_price_cut: true });
    expect(cond(NPCS.npc_tm_g1.hostileIf, g)).toBe(true);
    expect(stage(g, 'q_tm_path')).toBe('fought');
    // the path is clear now: the family comes down it
    talk('d_tm_family', g, q, ['Down the path.', '(Down to the lamps.)']);
    expect(g.flags.tm_family_in).toBe('path');
  });

  it('the family: the Clean step out on the path while the arrangement runs; stood aside, she is taken and the boy comes down alone', () => {
    const { g, q } = at('tm_pit', 22);
    g.flags.tm_family_due = true;
    expect(cond(placed('tm_pit', 'npc_tm_06_col').if, g)).toBe(true);
    hour(g, 12);
    expect(cond(placed('tm_pit', 'npc_tm_06_col').if, g)).toBe(false);
    hour(g, 22);
    const r = talk('d_tm_family', g, q, ['Down the path.']);
    expect(r.view()!.text).toContain('Nnadi, C.');
    talk('d_tm_family', g, q, ['Down the path.', '(Stand aside.)']);
    expect(g.flags.tm_family_in).toBe('taken');
    expect(cond(placed('tm_pit', 'npc_tm_07').if, g)).toBe(true);
    expect(cond(placed('tm_pit', 'npc_tm_06').if, g)).toBe(false);
    expect(view('d_tm_board', g, q).text).toContain('NNADI, C.');
    expect(view('d_tm_ikenna', g, q).text).toContain('turning it over');
  });

  it('the family down the old drift, whatever the arrangement: the trapper shows the way, a lamp or the knack finds it', () => {
    const { g, q } = at('tm_pit', 12);
    talk('d_tm_sachiko', g, q, ['You know the col.', 'Something else.', 'Is there another way down']);
    expect(g.world.knowledge.tm_adit_known).toBe(true);
    g.flags.tm_family_due = true;
    hour(g, 22);
    apply([{ give: 't_lamp' }], g, q);
    skills(g, { survival: 20 });
    talk('d_tm_family', g, q, ['There\'s another way.']);
    expect(g.flags.tm_family_in).toBe('adit');
    expect(cond(placed('tm_pit', 'npc_tm_06').if, g)).toBe(true);
    expect(g.flags.tm_four).toBeUndefined();
  });

  it('after the arrangement is ended the path is safe', () => {
    const { g, q } = at('tm_pit', 22);
    g.flags.tm_family_due = true;
    g.flags.tm_four = 'ended';
    expect(cond(placed('tm_pit', 'npc_tm_g1').if, g)).toBe(false);
    talk('d_tm_family', g, q, ['Down the path.', '(Down to the lamps.)']);
    expect(g.flags.tm_family_in).toBe('path');
  });
});

describe('What Moved Below Four: the machine in the old level', () => {
  function below() {
    const { g, q } = at('tm_pit', 12);
    talk('d_tm_gaspard', g, q, ['That\'s all.']);
    talk('d_tm_gaspard', g, q, ['What\'s down in the lower level?']);
    expect(stage(g, 'q_tm_digger')).toBe('below');
    g.locationId = 'tm_level';
    apply(trigger('tm_level', 'stope').effects, g, q); q.update();
    talk('d_tm_digger', g, q);
    expect(stage(g, 'q_tm_digger')).toBe('digger');
    return { g, q };
  }

  it('salvaged (tech): its controller pulled; the lower level opens to dig by hand', () => {
    const { g, q } = below();
    skills(g, { mechanics: 60 });
    talk('d_tm_digger', g, q, ['(Open the housing']);
    expect(g.flags.tm_digger).toBe('salvaged');
    expect(has(g, 'j_tm_controller')).toBe(true);
    expect(status(g, 'q_tm_digger')).toBe('done');
    expect(options('d_tm_cage', g, q)).toContain('(Work a shift in the lower level. 14 Tolls.)');
  });

  it('tamed (chrome) by Kes; drowned by stopping the pumps', () => {
    const k = below();
    k.g.world.party.push(KES);
    talk('d_tm_digger', k.g, k.q, ['(Kes:']);
    expect(k.g.flags).toMatchObject({ tm_digger: 'tamed', tm_digger_concern: true });
    const d = below();
    talk('d_tm_lv_pumps', d.g, d.q, ['(Stop the pumps']);
    expect(d.g.flags.tm_digger).toBe('drowned');
    expect(options('d_tm_cage', d.g, d.q)).not.toContain('(Work a shift in the lower level. 14 Tolls.)');
  });
});

describe('Number Four\'s activities: the face and the trap lines', () => {
  it('the old pillars give three finds in order, then the plain wage (scarcity)', () => {
    const { g, q } = at('tm_pit', 8);
    for (let i = 0; i < 3; i++) talk('d_tm_cage', g, q, ['(Work a shift in the old pillars']);
    expect(has(g, 'c_tin') && has(g, 't_lamp')).toBe(true);
    expect(g.pc.inventory.tolls).toBe(825);
    talk('d_tm_cage', g, q, ['(Work a shift in the old pillars']);
    expect(g.pc.inventory.tolls).toBe(831);
    expect(g.flags.tm_pillars).toBe(3);
  });

  it('the east stopes need a reader of roofs; the ridge line needs the knack', () => {
    const { g, q } = at('tm_pit', 8);
    skills(g, { survival: -100, mechanics: -100 });
    talk('d_tm_cage', g, q, ['(Work a shift in the east stopes']);
    expect(g.flags.tm_stopes).toBeUndefined();
    skills(g, { survival: 60 });
    talk('d_tm_cage', g, q, ['(Work a shift in the east stopes']);
    expect(has(g, 'j_powder')).toBe(true);
    talk('d_tm_traps', g, q, ['(Run the ridge line.)']);
    expect(has(g, 'j_pelt')).toBe(true);
  });
});

// ---------------------------------------------------------------- Ashby Dam: Low Water

describe('Low Water: every way the inspection ends', () => {
  function audit(map = 'nw_dam', h = 12) {
    const { g, q } = at(map, h);
    talk('d_nw_dm_notice', g, q);
    expect(g.flags.nw_audit).toBe(true);
    expect(stage(g, 'q_nw_dam')).toBe('audit');
    expect(cond(placed('nw_dam', 'npc_nw_04').if, g)).toBe(true);
    return { g, q };
  }
  /** The gauge, the well, the pins, the log, the controller: the lie, why, and what it costs. */
  function investigate(g: G, q: QuestEngine) {
    skills(g, { mechanics: 60, science: 60 });
    talk('d_nw_gauge', g, q);
    talk('d_nw_well', g, q, ['(Lie on the crest']);
    conclude(g, q, 'c_nw_lie');
    expect(stage(g, 'q_nw_dam')).toBe('lie');
    talk('d_nw_pins', g, q, ['(Read the pins.)']);
    talk('d_nw_log', g, q);
    conclude(g, q, 'c_nw_why');
    talk('d_nw_controller', g, q, ['(Read the card\'s footnote']);
    conclude(g, q, 'c_nw_sink');
  }

  it('truth (talk, no violence): the keeper tells it herself; the record corrected, the Sink\'s pumps its own, the warranty filed', () => {
    const { g, q } = audit();
    investigate(g, q);
    skills(g, { speech: 50 });
    talk('d_nw_lease', g, q, ['(Read it through.)']);
    expect(has(g, 'k_nw_contract')).toBe(true);
    talk('d_nw_hedda', g, q, ['That\'s all.']);
    talk('d_nw_hedda', g, q, ['There\'s a block in your gauge well.', 'Do you know what the shortfall', '(Wait.)', 'Tell the inspector yourself.']);
    expect(g.flags.nw_hedda_agrees).toBe(true);
    talk('d_nw_inspect', g, q, ['Something else.']);
    talk('d_nw_inspect', g, q, ['Before you read anything', '(Let Hedda tell it', 'And the mending?']);
    expect(g.flags).toMatchObject({ nw_dam: 'truth', nw_keepers: 'kept', nw_sink_relief: true, nw_precinct_short: true, nw_river: 'even', nw_barges_owed: true, nw_mend: 'house' });
    expect(stage(g, 'q_nw_dam')).toBe('truth');
    expect(view('d_nw_controller', g, q).text).toContain('CL. 31 — VOID FOR ASHBY');
    expect(cond(placed('nw_dam', 'npc_nw_04').if, g)).toBe(false);
    expect(view('d_nw_board_ll', g, q).options.length).toBeGreaterThan(3);
    g.flags.nw_rode = true;
    const ride = new DialogueRunner(DIALOGUES.d_nw_board_ll, g, q);
    ride.choose('d_nw_board_ll.timber.fare');
    expect(ride.view()!.text).toContain('full-loaded');
  });

  it('truth told without the keeper needs more words, and fines the keepers', () => {
    const { g, q } = audit();
    investigate(g, q);
    skills(g, { speech: 40 });
    talk('d_nw_inspect', g, q, ['Something else.']);
    talk('d_nw_inspect', g, q, ['Before you read anything', '(Tell it yourself']);
    expect(g.flags).toMatchObject({ nw_dam: 'truth', nw_keepers_fined: true });
  });

  it('hidden (tech, no violence): the drum re-spooled at night with Rhiannon\'s help; the inspector writes COMPLIANT', () => {
    const { g, q } = audit();
    investigate(g, q);
    talk('d_nw_rhiannon', g, q, ['That\'s all.']);
    talk('d_nw_rhiannon', g, q, ['Help me make the gauge']);
    expect(g.flags.nw_rhiannon_helps).toBe(true);
    skills(g, { mechanics: -100, security: 60 });
    g.pc.sheet.skillBought.mechanics = 30;
    talk('d_nw_well', g, q, ['(Pick the padlock.)']);
    hour(g, 23);
    talk('d_nw_well', g, q, ['(Re-spool the indicator']);
    expect(g.flags.nw_hidden_ready).toBe(true);
    talk('d_nw_inspect', g, q, ['Something else.']);
    talk('d_nw_inspect', g, q, ['Begin.', '(Watch it go.)']);
    expect(g.flags).toMatchObject({ nw_dam: 'hidden', nw_river: 'low' });
    expect(g.flags.nw_keepers).toBeUndefined();
    expect(stage(g, 'q_nw_dam')).toBe('hidden');
  });

  it('exposed: the inspection let in with the block in the well takes the keepers; wardens keep the dam and it strains', () => {
    const { g, q } = audit();
    talk('d_nw_inspect', g, q, ['Something else.']);
    talk('d_nw_inspect', g, q, ['Begin.', '(Watch them take her.)']);
    expect(g.flags).toMatchObject({ nw_dam: 'exposed', nw_keepers: 'taken', nw_dam_strain: true, nw_river: 'city' });
    expect(cond(placed('nw_dam', 'npc_nw_01').if, g)).toBe(false);
    expect(cond(placed('nw_dam', 'npc_nw_g1').if, g)).toBe(true);
    expect(view('d_nw_controller', g, q).text).toContain('STRAIN');
  });

  it('exposed for the bounty (barter): fifty from the record', () => {
    const { g, q } = audit();
    g.world.knowledge.nw_lie_known = true;
    talk('d_nw_inspect', g, q, ['Something else.']);
    talk('d_nw_inspect', g, q, ['There\'s a block in the gauge well.']);
    expect(g.flags.nw_dam).toBe('exposed');
    expect(g.pc.inventory.tolls).toBe(850);
  });

  it('sunk (fight): the inspection fought on the crest; the Ledger marks the Wet', () => {
    const { g, q } = audit();
    talk('d_nw_inspect', g, q, ['Something else.']);
    talk('d_nw_inspect', g, q, ['(Draw on it.)']);
    expect(g.flags).toMatchObject({ nw_dam: 'sunk', nw_ledger_marked: true, nw_inspection_fight: true });
    expect(cond(NPCS.npc_nw_04.hostileIf, g)).toBe(true);
    expect(stage(g, 'q_nw_dam')).toBe('sunk');
  });

  it('the city\'s notice at Low Landing and its courier start the line too; the Sink\'s pump board, once seen, reads the footnote', () => {
    const { g, q } = at('nw_landing');
    talk('d_nw_aurelio', g, q, ['What\'s the notice on the quay?']);
    expect(g.flags.nw_audit).toBe(true);
    expect(g.world.leads.l_nw_short).toBe(true);
    const s = at('nw_dam');
    s.g.world.knowledge.sk_schedule_known = true;
    skills(s.g, { science: 20 });
    expect(view('d_nw_controller', s.g, s.q).options[0]).toMatchObject({ checkMet: true, checkLabel: 'Science 15' });
  });
});

// ---------------------------------------------------------------- Sawtown: Marks at the Boom

describe('Marks at the Boom: every way the feud ends', () => {
  function cutter() {
    const { g, q } = at('nw_sawtown', 12);
    talk('d_nw_notice', g, q);
    expect(stage(g, 'q_nw_feud')).toBe('marks');
    g.pc.sheet.baseAttrs.senses = 7;
    talk('d_nw_pen', g, q, ['(Look closely']);
    hour(g, 23);
    expect(cond(placed('nw_sawtown', 'npc_nw_07_punt').if, g)).toBe(true);
    talk('d_nw_punt', g, q, ['Why cut your own', 'Something else.', '(Hold out your hand']);
    expect(has(g, 'k_nw_scribe')).toBe(true);
    conclude(g, q, 'c_nw_marker');
    expect(stage(g, 'q_nw_feud')).toBe('cutter');
    return { g, q };
  }
  function fault(g: G, q: QuestEngine) {
    hour(g, 12);
    skills(g, { survival: 60, speech: 60, barter: 60 });
    talk('d_nw_stump', g, q, ['(Read the stump.)']);
    talk('d_nw_cillian', g, q, ['Do what?']);
    talk('d_nw_cillian', g, q, ['Who sent Mikkel up']);
    conclude(g, q, 'c_nw_widowmaker');
    talk('d_nw_tally', g, q, ['(Add up']);
    conclude(g, q, 'c_nw_why_marks');
  }

  it('truth (talk): both crews at the mill; the father\'s fault said aloud; the feud over', () => {
    const { g, q } = cutter();
    fault(g, q);
    talk('d_nw_sigrun', g, q, ['That\'s all.']);
    talk('d_nw_sigrun', g, q, ['Will you stand up at the mill']);
    talk('d_nw_berit', g, q, ['That\'s all.']);
    talk('d_nw_berit', g, q, ['Call both crews', '(Say it all']);
    expect(g.flags).toMatchObject({ nw_feud: 'truth', nw_marks_end: true, nw_arvid_gone: true, nw_barges_owed: true });
    expect(stage(g, 'q_nw_feud')).toBe('truth');
    expect(cond(placed('nw_sawtown', 'npc_nw_06').if, g)).toBe(false);
    expect(cond(placed('nw_sawtown', 'npc_nw_07_punt').if, g)).toBe(false);
  });

  it('quiet (knowledge): the father told alone, with his son\'s scribe in your hand', () => {
    const { g, q } = cutter();
    fault(g, q);
    skills(g, { speech: 35 });
    talk('d_nw_arvid', g, q, ['That\'s all.']);
    talk('d_nw_arvid', g, q, ['You sent him up']);
    expect(g.flags).toMatchObject({ nw_feud: 'quiet', nw_marks_end: true, nw_arvid_knows: true });
    talk('d_nw_wayra', g, q, ['That\'s all.']);
    expect(view('d_nw_wayra', g, q).text).toContain('Arvid Brandvold');
  });

  it('caught (barter): the cutter named and no more; put on the Water at the next dawn the player is in Sawtown', () => {
    const { g, q } = cutter();
    talk('d_nw_berit', g, q, ['That\'s all.']);
    talk('d_nw_berit', g, q, ['I know who\'s cutting', 'Sigrun Brandvold.']);
    expect(g.flags.nw_feud).toBe('caught');
    expect(g.pc.inventory.tolls).toBe(860);
    expect(waitFor(g, q, 'nw_landing', 6)).not.toContain('nw_sigrun_on_water');
    expect(waitFor(g, q, 'nw_sawtown', 6)).toContain('nw_sigrun_on_water');
    expect(g.flags.nw_sigrun_gone).toBe(true);
    expect(cond(placed('nw_sawtown', 'npc_nw_07').if, g)).toBe(false);
  });

  it('burned: the Bottoms\' camp burns at the next two o\'clock the player is in Sawtown, and the Bottoms go down the river', () => {
    const { g, q } = at('nw_sawtown', 12);
    talk('d_nw_cillian', g, q, ['Do what?']);
    talk('d_nw_cillian', g, q, ['Do it, then.']);
    expect(g.flags.nw_feud).toBe('burned');
    expect(waitFor(g, q, 'nw_dam', 2)).not.toContain('nw_bottoms_burn');
    expect(waitFor(g, q, 'nw_sawtown', 2)).toContain('nw_bottoms_burn');
    expect(g.flags.nw_bottoms_gone).toBe(true);
    expect(cond(placed('nw_sawtown', 'npc_nw_09').if, g)).toBe(false);
    expect(view('d_nw_skid', g, q).text).toContain('black square');
  });

  it('where the money goes is told by the cookhouse as well as the punt; the drive pays twenty to those who stay up', () => {
    const { g, q } = at('nw_sawtown', 12);
    talk('d_nw_dorit', g, q, ['The girl with the baby.']);
    expect(g.world.leads.l_nw_baby).toBe(true);
    g.pc.sheet.baseAttrs.reflex = 8;
    talk('d_nw_drive', g, q, ['(Ride a log']);
    expect(g.pc.inventory.tolls).toBe(820);
  });
});

// ---------------------------------------------------------------- Low Landing: A Load for the City

describe('A Load for the City: every way the run ends', () => {
  function crew() {
    const { g, q } = at('nw_landing', 12);
    talk('d_nw_magda', g, q, ['Is there work?', 'I\'ll crew for you.']);
    expect(g.flags.nw_run_crew).toBe(true);
    expect(has(g, 'k_nw_waybill')).toBe(true);
    expect(stage(g, 'q_nw_run')).toBe('load');
    g.pc.sheet.baseAttrs.brawn = 8;
    skills(g, { speech: 60 });
    talk('d_nw_run', g, q, ['(Cast off', '(Pull.)', '(On down the river.)', '(Open a case', 'Let us by.', '(On down the river.)']);
    expect(g.world.leads.l_nw_kennel).toBe(true);
    conclude(g, q, 'c_nw_kennel');
    expect(g.flags.nw_run_stage).toBe('deep');
    return { g, q };
  }

  it('river: the load over the side in the deep reach; the guild takes the Patience at the next dawn at Low Landing, unless her mooring is paid', () => {
    const { g, q } = crew();
    talk('d_nw_run', g, q, ['(Put the cases over the side']);
    expect(g.flags).toMatchObject({ nw_run: 'river', nw_controllers: 'river' });
    expect(stage(g, 'q_nw_run')).toBe('river');
    expect(waitFor(g, q, 'md_precinct', 6)).not.toContain('nw_patience_seized');
    expect(waitFor(g, q, 'nw_landing', 6)).toContain('nw_patience_seized');
    expect(g.flags.nw_patience).toBe('seized');
    const p = crew();
    talk('d_nw_run', p.g, p.q, ['(Put the cases over the side']);
    talk('d_nw_magda', p.g, p.q, ['I\'ll pay your mooring.']);
    expect(p.g.flags.nw_patience).toBe('kept');
    expect(has(p.g, 'k_nw_token')).toBe(true);
    waitFor(p.g, p.q, 'nw_landing', 6);
    expect(p.g.world.events.nw_patience_seized).toBe('prevented');
  });

  it('delivered (barter): the guild\'s man paid; the token rides the river free', () => {
    const { g, q } = crew();
    talk('d_nw_run', g, q, ['(On to the city.)', '(Hand the load to the guild\'s man.)']);
    expect(g.flags).toMatchObject({ nw_run: 'delivered', nw_controllers: 'guild', nw_patience: 'kept' });
    expect(g.pc.inventory.tolls).toBe(875);
    expect(has(g, 'k_nw_token')).toBe(true);
    expect(options('d_nw_board_ll', g, q)).toContain('(Ashby lock, one reach up. No fare.)');
  });

  it('wardens (knowledge): the load and its waybill to the city gate; the guild remembers your face', () => {
    const { g, q } = crew();
    talk('d_nw_run', g, q, ['(On to the city.)', '(Take the load and the waybill']);
    expect(g.flags).toMatchObject({ nw_run: 'wardens', nw_controllers: 'ledger', nw_guild_wary: true });
    expect(stage(g, 'q_nw_run')).toBe('wardens');
    talk('d_nw_pryce', g, q, ['That\'s all.']);
    expect(view('d_nw_pryce', g, q).text).toContain('long memory');
  });

  it('the reed boats can be paid, warned off or given a case instead', () => {
    const { g, q } = at('nw_landing', 12);
    g.flags.nw_run_crew = true;
    g.flags.nw_run_stage = 'night';
    skills(g, { speech: -100, firearms: 60 });
    talk('d_nw_run', g, q, ['(Put a shot over their heads.)']);
    expect(g.flags).toMatchObject({ nw_run_stage: 'deep', nw_reeds_warned: true });
    const c = at('nw_landing', 12);
    c.g.flags.nw_run_stage = 'night';
    talk('d_nw_run', c.g, c.q, ['(Give her one case.)']);
    expect(c.g.flags.nw_one_crate).toBe(true);
  });

  it('a man on the guild\'s winch can be bought off his last month', () => {
    const { g, q } = at('nw_landing', 12);
    talk('d_nw_emeka', g, q, ['One month?']);
    talk('d_nw_pryce', g, q, ['That\'s all.']);
    talk('d_nw_pryce', g, q, ['What does Emeka Uzor\'s paper cost?', '(Pay thirty.)']);
    expect(g.flags.nw_emeka_free).toBe(true);
    expect(view('d_nw_emeka', g, q).text).toContain('Thirty Tolls');
  });
});

// ---------------------------------------------------------------- what the Teeth and the Wet read from earlier slices

describe('what the Teeth and the Wet read from earlier slices', () => {
  it('the Shift\'s runner, the col and the runaway mother read the Skirts\' outcomes; the courier reads the Sink\'s pumps', () => {
    const h = at('tm_pit');
    h.g.flags.ks_maren = 'hanged';
    expect(view('d_tm_desmond', h.g, h.q).text).toContain('hanged Maren');
    const r = at('tm_pit');
    r.g.flags.hs_shift = 'revolt'; r.g.flags.hs_gate_shut = true; r.g.flags.hs_car_down = true;
    expect(view('d_tm_desmond', r.g, r.q).text).toContain('doubled on the col');
    expect(view('d_tm_col', r.g, r.q).text).toContain('no car on it');
    const p = at('tm_pit');
    p.g.flags.hs_parts = 'exposed';
    expect(view('d_tm_chinwe', p.g, p.q).text).toContain('shut the Weighhouse');
    const s = at('nw_landing');
    talk('d_nw_aurelio', s.g, s.q, ['That\'s all.']);
    s.g.flags.sk_pumps = 'paid';
    const n = talk('d_nw_aurelio', s.g, s.q, ['What\'s the notice on the quay?']);
    expect(n.view()!.text).toContain('the Sink kept its relief pumps');
  });
});

// ---------------------------------------------------------------- the roads

describe('the Teeth\'s trails and the Wet\'s banks', () => {
  it('each family fits its own region\'s legs and not the Sallow\'s; the courier on the river starts the dam\'s line', () => {
    const { g, q } = at('nw_landing', 12);
    const wet = { from: 'riverdock', to: 'dam', by: 'foot' as const, hours: 20, fare: 0, risk: 1 };
    const teeth = { from: 'halt_e', to: 'mine_teeth', by: 'foot' as const, hours: 20, fare: 0, risk: 1 };
    const sallow = { from: 'shale', to: 'drywells', by: 'foot' as const, hours: 10, fare: 0, risk: 1 };
    const wetIds = eligibleEncounters(g, WORLD_MAP, wet, ROAD_ENCOUNTERS).map((e) => e.id);
    expect(wetIds).toEqual(expect.arrayContaining(['re_nw_rain', 're_nw_logjam', 're_nw_dredge', 're_nw_courier', 're_nw_mule']));
    expect(eligibleEncounters(g, WORLD_MAP, teeth, ROAD_ENCOUNTERS).map((e) => e.id)).toEqual(expect.arrayContaining(['re_tm_snow', 're_tm_cairn', 're_tm_trapper']));
    expect(eligibleEncounters(g, WORLD_MAP, sallow, ROAD_ENCOUNTERS).some((e) => /^re_(tm|nw)_/.test(e.id))).toBe(false);
    apply(ROAD_ENCOUNTERS.re_nw_courier.effects, g, q); q.update();
    expect(g.flags.nw_audit).toBe(true);
    expect(stage(g, 'q_nw_dam')).toBe('audit');
  });

  it('the trapper, the runaway, the mule and the reed boats each give something', () => {
    const { g, q } = at('tm_trail', 12);
    skills(g, { survival: 60 });
    talk('d_re_tm_trapper', g, q, ['(Help him peg', 'What\'s up the mountain?']);
    expect(has(g, 'j_hide')).toBe(true);
    expect(g.world.knowledge.tm_ostap_word).toBe(true);
    talk('d_re_tm_runaway', g, q, ['(Walk her to the cairns']);
    expect(g.world.knowledge.tm_ylva_helped).toBe(true);
    g.pc.sheet.baseAttrs.brawn = 8;
    talk('d_re_nw_mule', g, q, ['(Get your shoulder under it']);
    expect(g.flags.nw_sweeps_ride).toBe(true);
    talk('d_re_nw_reeds', g, q, ['Who are you, the river?']);
    expect(g.world.knowledge.nw_reeds_met).toBe(true);
  });
});
