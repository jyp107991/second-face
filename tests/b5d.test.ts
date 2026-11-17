import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, FAMILIES, MAPS, NPCS, QUESTS, ROAD_ENCOUNTERS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { CALLA_FREE, CALLA_HELD } from '../src/content/world/a3_conds';
import { SITES } from '../src/content/world/sites';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';
import { eligibleEncounters } from '../src/engine/world/roads';
import { planTrip } from '../src/engine/world/travel';
import { regenerate } from './map_gen';

/**
 * B5d — the Ashlands and the Long Night: Spindle, Kelso and its hall, Pemberton and Saddleback as places; What Sleeps at Kelso
 * by all four of its ends (and the contractor's three); A Kite Day by all four; A Board for Dorcas by all three (finishing
 * Yard Nine's open route); the picking runs; the remnant machines on the glass; and the act's alliance played headless as a
 * strong, a mixed, a thin and a truce-made night, with the order's first name freed at West Halt, at Carrick, or carried
 * west at dawn, and the companions whose red lines the night crosses. Every event waits for the player.
 */

type G = ReturnType<typeof newGameState>;
const WREN = 'npc_rd_03', ODILE = 'npc_nb_03', ASH = 'npc_of_03', NINE = 'npc_md_nine', KES = 'npc_hs_01';
const COMPANIONS = ['npc_c9_03', 'npc_rd_03', 'npc_sh_17', 'npc_nb_03', 'npc_of_03', 'npc_md_nine', 'npc_hs_01'];
const B5D = (id: string) => /^d_(an|ln|re_an)_/.test(id);

function talk(id: string, g: G, q: QuestEngine, picks: string[] = []): DialogueRunner {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  r.view();
  q.update();
  for (const p of picks) {
    const v = r.view();
    if (!v) throw new Error(`${id}: ended before "${p}"`);
    const o = v.options.find((x) => x.text.startsWith(p) && !x.locked);
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
  g.minutes = 200 * 1440 + h * 60;
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
const fire = (g: G, q: QuestEngine, map: string, id: string) => {
  const t = trigger(map, id);
  expect(cond(t.if, g), `${map}/${id}`).toBe(true);
  apply(t.effects, g, q);
  q.update();
};

// ---------------------------------------------------------------- the places

describe('B5d: the Ashlands as places', () => {
  it('binds the Ashlands\' four locations to their maps; Spindle is a settlement on the road from Dry Wells', () => {
    expect(WORLD_MAP.locations.spindle).toMatchObject({ name: 'Spindle', map: 'an_spindle', settlement: 'spindle', region: 'ashlands' });
    expect(WORLD_MAP.locations.lm_ash_01).toMatchObject({ name: 'Kelso', map: 'an_kelso', region: 'ashlands', hidden: true });
    expect(WORLD_MAP.locations.lm_ash_02).toMatchObject({ name: 'Pemberton', map: 'an_pemberton', hidden: true });
    expect(WORLD_MAP.locations.lm_ash_03).toMatchObject({ name: 'Saddleback', map: 'an_saddleback', hidden: true });
    for (const m of ['an_spindle', 'an_kelso', 'an_pemberton', 'an_saddleback']) expect(SITES[m]?.kind).toBe('open');
    for (const m of ['an_hall', 'an_glass']) expect(SITES[m]?.kind).toBe('cell');
    expect(planTrip(WORLD_MAP, 'drywells', 'spindle', { modes: [], networks: [], known: () => true, hour: 8 })!.legs.map((l) => l.to)).toEqual(['spindle']);
    expect(planTrip(WORLD_MAP, 'spindle', 'lm_ash_03', { modes: [], networks: [], known: () => true, hour: 8 })!.legs.map((l) => l.to)).toEqual(['lm_ash_01', 'lm_ash_03']);
    expect(SETTLEMENTS.spindle).toMatchObject({ region: 'ashlands', type: 'salvage_camp' });
    expect(SETTLEMENTS.drywells.roads.spindle).toBe(SETTLEMENTS.spindle.roads.drywells);
  });

  it('each map has the spawns its neighbours arrive by; arriving puts the place on the map', () => {
    const spawns = (m: string) => MAPS[m].spawns.map((s) => s.id);
    expect(spawns('an_spindle')).toEqual(expect.arrayContaining(['from_drywells', 'from_kelso', 'from_pemberton', 'bunk']));
    expect(spawns('an_kelso')).toEqual(expect.arrayContaining(['from_spindle', 'hall', 'from_saddleback', 'from_pemberton']));
    expect(spawns('an_hall')).toContain('stair');
    const { g, q } = at('an_spindle');
    for (const [map, loc] of [['an_spindle', 'loc_spindle'], ['an_kelso', 'loc_lm_ash_01'], ['an_pemberton', 'loc_lm_ash_02'], ['an_saddleback', 'loc_lm_ash_03']]) {
      apply(trigger(map, 'arrive').effects, g, q);
      expect(g.world.knowledge[loc], loc).toBe(true);
    }
  });

  it('the cast: one family shares a surname; women narrow and men broad; grey only from fifty-five; Black people\'s hair afro-textured', () => {
    expect(FAMILIES.Kwarteng).toEqual(['npc_an_01', 'npc_an_02']);
    const women = ['npc_an_01', 'npc_an_04', 'npc_an_06', 'npc_an_w1', 'npc_an_g2'];
    const men = ['npc_an_02', 'npc_an_03', 'npc_an_05', 'npc_an_07', 'npc_an_w2', 'npc_an_g1'];
    for (const w of women) expect(NPCS[w].look.frame, w).toBe('narrow');
    for (const m of men) expect(NPCS[m].look.frame, m).toBe('broad');
    const GREY = [0x8a8782, 0xd2d0c8];
    const AFRO = ['coily_twa', 'coily_afro', 'coily_afro_big', 'paint_shaved', 'paint_buzz', 'paint_fade', 'paint_coils', 'paint_cornrows', 'none'];
    for (const n of Object.values(NPCS)) {
      if (!/^npc_(an|ln)_/.test(n.id)) continue;
      if (GREY.includes(n.look.over?.hair?.color as number)) expect(n.look.age ?? 0, n.id).toBeGreaterThanOrEqual(55);
      if (/african/.test(n.look.ancestry ?? '')) expect(AFRO, n.id).toContain(n.look.over?.hair?.style);
    }
  });

  it('every node in the B5d trees has a line for coming back to it (U7), or only leaves; all seven companions speak', () => {
    let trees = 0, nodes = 0;
    const said = new Set<string>();
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!B5D(id)) continue;
      trees++;
      for (const [nid, n] of Object.entries(d.nodes)) {
        nodes++;
        if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
        for (const ij of n.interject ?? []) said.add(ij.companion);
      }
    }
    expect(trees).toBeGreaterThanOrEqual(55);
    expect(nodes).toBeGreaterThanOrEqual(220);
    for (const c of COMPANIONS) expect(said.has(c), c).toBe(true);
  });
});

// ---------------------------------------------------------------- What Sleeps at Kelso

describe('What Sleeps at Kelso: every way the thing in the rack is settled', () => {
  /** The board, the survivor, the dead, the tower's log, the ridge, the contractor's order: everything known. */
  function investigate(g: G, q: QuestEngine) {
    g.locationId = 'an_spindle';
    talk('d_an_board', g, q);
    expect(stage(g, 'q_an_kelso')).toBe('shut');
    skills(g, { medicine: 50, speech: 70, science: 50, survival: 50, mechanics: 60 });
    apply([{ give: 'c_bandage' }], g, q);
    talk('d_an_parveen', g, q, ['(Kneel and dress her hands.)', 'Kelso. The door. What happened?']);
    expect(g.world.leads.l_an_card).toBe(true);
    talk('d_an_dead', g, q, ['(Take the card out of his hand.)']);
    expect(has(g, 'k_an_card')).toBe(true);
    conclude(g, q, 'c_an_card');
    talk('d_an_tower_log', g, q, ['(Read the log.)']);
    talk('d_an_view', g, q);
    conclude(g, q, 'c_an_reserve');
    expect(stage(g, 'q_an_kelso')).toBe('reserve');
    talk('d_an_sorlie', g, q, ['A board recovery.', 'What board?', 'Something else.', 'Show me the work order.']);
    conclude(g, q, 'c_an_concern');
  }
  function down(g: G, q: QuestEngine) {
    hour(g, 10);
    g.locationId = 'an_kelso';
    expect(cond(trigger('an_kelso', 'apron').if, g)).toBe(true);
    talk('d_an_apron', g, q, ['(The long way round']);
    expect(g.flags.an_apron_ok).toBe(true);
    talk('d_an_hall_door', g, q, ['(Take the plate off and crank the release.)']);
    expect(g.flags.an_hall_open).toBe(true);
    g.locationId = 'an_hall';
  }

  it('held (talk): the thing is talked into sealing its reserve against every authority; the contractor goes home', () => {
    const { g, q } = at('an_spindle');
    investigate(g, q);
    down(g, q);
    talk('d_an_lt', g, q, ['Whose command would you call lawful?', 'Something else.', 'There is no lawful command left.']);
    expect(g.flags).toMatchObject({ an_kelso: 'held', an_key: 'none', an_reserve: 'sealed', an_kelso_quiet: true, an_sorlie: 'gone' });
    expect(stage(g, 'q_an_kelso')).toBe('held');
    expect(status(g, 'q_an_kelso')).toBe('done');
    expect(cond(placed('an_spindle', 'npc_an_07').if, g)).toBe(false);
    expect(view('d_an_view', g, q).text).toContain('Nothing circles over them now');
  });

  it('held (Kes or Nine): either companion puts it to the thing in its own terms, with no check', () => {
    for (const who of [KES, NINE]) {
      const { g, q } = at('an_hall');
      apply([{ join: who }], g, q);
      talk('d_an_lt', g, q, [who === KES ? '(Kes:' : '(Nine:']);
      expect(g.flags.an_reserve, who).toBe('sealed');
    }
  });

  it('taken (tech): its core comes out in the player\'s hands; hounds on the glass lie down for it', () => {
    const { g, q } = at('an_hall');
    skills(g, { mechanics: 60 });
    talk('d_an_lt', g, q, ['(Open the cowl and pull its core.)']);
    expect(g.flags).toMatchObject({ an_kelso: 'taken', an_key: 'player', an_reserve: 'player' });
    expect(has(g, 'k_an_core')).toBe(true);
    // the contractor stays, and will buy the core
    expect(cond(placed('an_spindle', 'npc_an_07').if, g)).toBe(true);
    expect(options('d_re_an_hound', g, q)).toContain('(Hold up the core out of Kelso\'s rack.)');
    talk('d_an_sorlie', g, q, ['A board recovery.', '(Show him the core out of Kelso\'s rack.)', 'Three hundred. Take it.']);
    expect(g.flags).toMatchObject({ an_key: 'concern', an_core_sold: true, an_sorlie: 'gone' });
    expect(g.pc.inventory.tolls).toBe(1100);
  });

  it('broken (fight): powder in its cowl; nobody holds the reserve now, and the glass gets worse', () => {
    const { g, q } = at('an_hall');
    apply([{ give: 'j_powder', count: 2 }], g, q);
    talk('d_an_lt', g, q, ['(Pack its cowl with blasting powder']);
    expect(g.flags).toMatchObject({ an_kelso: 'broken', an_reserve: 'leaderless', an_feral: true });
    const enc = eligibleEncounters(g, WORLD_MAP, { from: 'spindle', to: 'lm_ash_01', by: 'foot', hours: 10, risk: 1 } as never, ROAD_ENCOUNTERS).map((e) => e.id);
    expect(enc).toContain('re_an_feral');
  });

  it('sold (barter): guided in, the contractor\'s men lift it out and pay on delivery', () => {
    const { g, q } = at('an_spindle');
    talk('d_an_sorlie', g, q, ['A board recovery.', 'I\'ll guide you in.', 'At the blockhouse, by day.']);
    expect(g.flags.an_guiding).toBe(true);
    g.locationId = 'an_hall';
    expect(cond(placed('an_hall', 'an_sorlie_hall').if, g)).toBe(true);
    talk('d_an_sorlie_hall', g, q, ['Take it.']);
    expect(g.flags).toMatchObject({ an_kelso: 'sold', an_key: 'concern', an_reserve: 'concern' });
    expect(g.pc.inventory.tolls).toBe(1100);
    expect(stage(g, 'q_an_kelso')).toBe('sold');
  });

  it('the contractor in the hall can be sent home with his own order, without a fight', () => {
    const { g, q } = at('an_spindle');
    talk('d_an_sorlie', g, q, ['A board recovery.', 'I\'ll guide you in.', 'At the blockhouse, by day.']);
    skills(g, { speech: 50 });
    apply([{ give: 'k_an_order' }], g, q);
    talk('d_an_sorlie_hall', g, q, ['No. It stays.', 'Your order says dormant units']);
    expect(g.flags).toMatchObject({ an_sorlie: 'gone', an_guiding: false });
    expect(g.flags.an_kelso).toBeUndefined();
  });

  it('the card at the door wakes the patrol, as it did the four; by night the apron turns everyone back', () => {
    const { g, q } = at('an_kelso', 11);
    apply([{ give: 'k_an_card' }, { set: 'an_apron_ok' }], g, q);
    talk('d_an_hall_door', g, q, ['(Hold the white card to the slot.)']);
    expect(g.flags.an_kelso_alert).toBe(true);
    expect(g.flags.an_hall_open).toBeUndefined();
    hour(g, 23);
    expect(cond(trigger('an_kelso', 'apron_night').if, g)).toBe(true);
    apply([{ set: 'an_kelso_quiet' }], g, q);
    expect(cond(trigger('an_kelso', 'apron_night').if, g)).toBe(false);
  });

  it('Spindle chalks the dead and puts the contractor out once it knows what his card did', () => {
    const { g, q } = at('an_spindle');
    talk('d_an_hester', g, q, ['Understood.']);
    apply([{ learn: 'an_card_known' }], g, q);
    talk('d_an_hester', g, q, ['Your four died at Kelso']);
    expect(g.flags).toMatchObject({ an_sorlie: 'out', an_board_chalked: true });
    expect(cond(placed('an_kelso', 'an_sorlie_gate').if, g)).toBe(true);
    expect(view('d_an_board', g, q).text).toContain('DEAD AT KELSO');
  });
});

// ---------------------------------------------------------------- A Kite Day

describe('A Kite Day: the flag waits for the player at Spindle; four ends', () => {
  function kiteDay() {
    const s = at('an_spindle', 8);
    talk('d_an_hester', s.g, s.q, ['Understood.']);
    // elsewhere, the kite day does not come
    expect(waitFor(s.g, s.q, 'an_kelso', 11)).not.toContain('an_kite_day');
    expect(waitFor(s.g, s.q, 'an_spindle', 11)).toContain('an_kite_day');
    expect(stage(s.g, 'q_an_kite')).toBe('flag');
    expect(cond(placed('an_pemberton', 'an_kwesi_pem').if, s.g)).toBe(true);
    expect(cond(placed('an_spindle', 'npc_an_02').if, s.g)).toBe(false);
    return s;
  }

  it('waited (survival): the hut till dusk, home in the dark; the boy was paid in scrip to map the kites', () => {
    const { g, q } = kiteDay();
    talk('d_an_hester', g, q, ['Where\'s Kwesi?']);
    talk('d_an_kwesi_cot', g, q, ['(Look at the glass and the coin.)']);
    conclude(g, q, 'c_an_kwesi');
    talk('d_an_hester', g, q, ['Kwesi didn\'t go to the panels for cells.']);
    expect(g.flags.an_sorlie).toBe('out');
    g.locationId = 'an_pemberton';
    skills(g, { survival: 50 });
    talk('d_an_kwesi_pem', g, q, ['(Wait for dusk with him']);
    expect(g.flags).toMatchObject({ an_kite: 'waited', an_kwesi_home: true });
    expect(status(g, 'q_an_kite')).toBe('done');
    expect(cond(placed('an_spindle', 'npc_an_02').if, g)).toBe(true);
  });

  it('dark (tech): the inverter cut; the kites come down, the array opens to the pickers, the reserve goes blind', () => {
    const { g, q } = kiteDay();
    g.locationId = 'an_pemberton';
    skills(g, { mechanics: 50 });
    talk('d_an_inverter', g, q, ['(Break the padlock and cut the perches\' feed.)', '(Take Kwesi home to Spindle.)']);
    expect(g.flags).toMatchObject({ an_kite: 'dark', an_kites: 'down', an_reserve_blind: true, an_kwesi_home: true });
    expect(options('d_an_table', g, q)).toContain('(Pick Pemberton\'s array. Six hours.)');
    expect(view('d_an_table', g, q).options.find((o) => o.text.startsWith('(Pick Pemberton'))!.checkLabel).toBe('Science 20');
  });

  it('shot (fight): two kites out of the sky and a board for it; Kelso\'s patrol watches by day after', () => {
    const { g, q } = kiteDay();
    g.locationId = 'an_pemberton';
    skills(g, { firearms: 60 });
    talk('d_an_kwesi_pem', g, q, ['(Go out, draw them down']);
    expect(g.flags).toMatchObject({ an_kite: 'shot', an_kelso_alert: true });
    expect(has(g, 'j_an_kiteboard')).toBe(true);
    expect(view('d_an_apron', g, q).options.find((o) => o.text.startsWith('(The long way'))!.checkLabel).toBe('Survival 55');
  });

  it('left: the boy told to run at dark; he does not wait', () => {
    const { g, q } = kiteDay();
    g.locationId = 'an_pemberton';
    talk('d_an_kwesi_pem', g, q, ['Stay here till it\'s dark.']);
    expect(g.flags).toMatchObject({ an_kite: 'left', an_kwesi_dead: true });
    expect(status(g, 'q_an_kite')).toBe('failed');
    expect(cond(placed('an_spindle', 'npc_an_02').if, g)).toBe(false);
  });
});

// ---------------------------------------------------------------- A Board for Dorcas, and the picking runs

describe('A Board for Dorcas: the army board out of Kelso\'s shed', () => {
  it('Ida names it; pulled quietly by day; fitted at Yard Nine, Dorcas runs with no channel and Four Ways keeps its spare', () => {
    const { g, q } = at('rc_yard');
    talk('d_rc_ida', g, q, ['What\'s wrong with Dorcas?', 'Something else.', 'Is there a board anywhere with nobody else in it?']);
    expect(status(g, 'q_an_board')).toBe('active');
    g.locationId = 'an_kelso';
    skills(g, { mechanics: 45 });
    talk('d_an_shunter', g, q, ['(Open the hatch and pull the board, quietly.)']);
    expect(has(g, 'k_an_board')).toBe(true);
    g.locationId = 'rc_yard';
    talk('d_rc_dorcas', g, q, ['(Fit the army board out of Kelso\'s shunter.)']);
    expect(g.flags).toMatchObject({ rc_engine: 'ashlands', an_board: 'ida' });
    expect(g.flags.rc_box_nospare).toBeUndefined();
    expect(stage(g, 'q_rc_engine')).toBe('ashlands');
    expect(stage(g, 'q_an_board')).toBe('ida');
    expect(options('d_nw_north_track', g, q)).toContain('(Ride the timber train to Sawtown. 15 Tolls.)');
  });

  it('or Spindle\'s well pump; or the contractor\'s drawer', () => {
    const a = at('an_spindle');
    apply([{ give: 'k_an_board' }], a.g, a.q);
    talk('d_an_hester', a.g, a.q, ['Understood.', 'I\'ve an army board out of Kelso\'s shed.', 'Put it in your pump.']);
    expect(a.g.flags).toMatchObject({ an_board: 'spindle', an_well_clean: true, an_bunk_rented: true });
    expect(stage(a.g, 'q_an_board')).toBe('spindle');
    const b = at('an_spindle');
    apply([{ give: 'k_an_board' }], b.g, b.q);
    talk('d_an_sorlie', b.g, b.q, ['A board recovery.', '(Show him the army board', 'A hundred and twenty.']);
    expect(b.g.flags.an_board).toBe('sold');
    expect(b.g.pc.inventory.tolls).toBe(920);
  });

  it('the glass gives its best three times a band, then the plain wage', () => {
    const { g, q } = at('an_spindle');
    skills(g, { survival: 40 });
    const got: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = talk('d_an_table', g, q, ['(Pick the edge of the glass. Three hours.)']);
      got.push(r.node!);
    }
    expect(got).toEqual(['edge_1', 'edge_2', 'edge_3', 'run_wage']);
    expect(has(g, 'u_powercell')).toBe(true);
    expect(options('d_an_table', g, q).some((t) => t.startsWith('(Pick the crater field'))).toBe(false);
    apply([{ learn: 'loc_lm_ash_01' }], g, q);
    expect(options('d_an_table', g, q)).toContain('(Pick the crater field under Kelso. Five hours.)');
  });
});

describe('the remnant machines on the glass', () => {
  it('kites by day while they fly, a fallen one once they are down; a convoy on its loop, a warden calling curfew, a hound at dusk', () => {
    const { g } = at('an_spindle', 10);
    const leg = { from: 'spindle', to: 'lm_ash_01', by: 'foot', hours: 10, risk: 1 } as never;
    const ids = () => eligibleEncounters(g, WORLD_MAP, leg, ROAD_ENCOUNTERS).map((e) => e.id);
    expect(ids()).toEqual(expect.arrayContaining(['re_an_kite', 're_an_convoy', 're_an_storm', 're_an_burned', 're_an_pickers']));
    expect(ids()).not.toContain('re_an_kite_down');
    g.flags.an_kites = 'down';
    expect(ids()).toContain('re_an_kite_down');
    expect(ids()).not.toContain('re_an_kite');
    hour(g, 18);
    expect(ids()).toEqual(expect.arrayContaining(['re_an_warden', 're_an_hound']));
  });
});

// ---------------------------------------------------------------- the Long Night

/** Act 2's beats behind the player; the call comes; the player walks into Openfield on the eve. */
function eve(extra: Record<string, unknown> = {}) {
  const s = at('ninebridge', 7);
  const done = (id: string) => { s.g.world.quests[id] = { stage: 'x', status: 'done', startedAt: 0, log: [], done: [] }; };
  done('q_a2_spire'); done('q_a2_openfield');
  Object.assign(s.g.flags, extra);
  expect(waitFor(s.g, s.q, 'ninebridge', 9)).toContain('ln_call');
  expect(s.g.flags.ln_called).toBe(true);
  expect(stage(s.g, 'q_a2_longnight')).toBe('called');
  expect(s.g.world.post?.length).toBeGreaterThan(0);
  s.g.locationId = 'openfield';
  const t = cond(trigger('openfield', 'ln_arrive').if, s.g) ? 'ln_arrive' : 'ln_arrive_through';
  fire(s.g, s.q, 'openfield', t);
  expect(stage(s.g, 'q_a2_longnight')).toBe('gathering');
  expect(s.g.flags.ln_calla_taken).toBe(true);
  return s;
}
/** Dusk at Openfield: who comes. */
function dusk(g: G, q: QuestEngine): string[] {
  const fired = waitFor(g, q, 'openfield', 18);
  expect(g.flags.ln_mustered).toBe(true);
  return fired;
}
function night(g: G, q: QuestEngine, picks: string[]) {
  hour(g, 22);
  expect(cond(trigger('openfield', 'ln_night').if, g)).toBe(true);
  return talk('d_ln_night', g, q, picks);
}

describe('the Long Night: who comes, and what the night leaves', () => {
  it('waits for the player: the call needs the Spire\'s beat done, the envoys come only to Openfield, and dusk only with the player there', () => {
    const { g, q } = at('ninebridge', 7);
    expect(waitFor(g, q, 'ninebridge', 9)).not.toContain('ln_call');
    const s = eve({ rc_line: 'halts' });
    for (const k of ['ln_mason', 'ln_sarr', 'ln_roux', 'ln_lowe', 'npc_ln_w1', 'npc_ln_r1']) expect(cond(placed('openfield', k).if, s.g), k).toBe(true);
    expect(cond(placed('openfield', 'npc_of_01').if, s.g)).toBe(false);
    talk('d_ln_mason', s.g, s.q, ['Tell me how it stands.', 'I\'ll stand with Openfield.']);
    expect(stage(s.g, 'q_a2_longnight')).toBe('pledged');
    expect(waitFor(s.g, s.q, 'rc_halt_w', 18)).toEqual([]);
    expect(s.g.flags.ln_mustered).toBeUndefined();
    expect(dusk(s.g, s.q)).toEqual(expect.arrayContaining(['ln_dusk', 'ln_m_halts']));
  });

  it('a strong night for the Choir: the halts, the twelve, Number Four and the Rust Dogs come; Openfield stands; the order\'s first name goes west at dawn', () => {
    const { g, q } = eve({ rc_line: 'halts', rc_stock: 'openfield', tm_shift: 'joined', bw_dogs_hold: true });
    skills(g, { speech: 70 });
    g.flags.sky_rite = true;
    talk('d_ln_petra', g, q, ['Go on.', 'What do you mean to do', 'Something else.', 'Don\'t. Sarr dead']);
    expect(g.flags.ln_petra_down).toBe(true);
    talk('d_ln_mason', g, q, ['Tell me how it stands.', 'I\'ll stand with Openfield.']);
    expect(g.flags).toMatchObject({ ln_alliance: 'choir', ln_strength: 1 });
    dusk(g, q);
    expect(g.flags).toMatchObject({ ln_came_halts: true, ln_came_twelve: true, ln_came_four: true, ln_came_dogs: true, ln_strength: 5 });
    for (const k of ['ln_chela', 'ln_yaw', 'ln_desmond']) expect(cond(placed('openfield', k).if, g), k).toBe(true);
    night(g, q, ['(The night comes.)', '(Walk down the lane alone', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'strong', ln_openfield: 'stands', ln_stores: 'choir', ks_mason: 'lives', ln_precinct_short: true, ln_calla: 'taken', ks_calla: 'imprisoned', ln_done: true, act2_done: true });
    expect(stage(g, 'q_a2_longnight')).toBe('choir_stands');
    expect(status(g, 'q_a2_longnight')).toBe('done');
    expect(status(g, 'q_ln_calla')).toBe('failed');
    expect(cond(placed('openfield', 'npc_of_01').if, g)).toBe(true);
    expect(cond(trigger('openfield', 'ln_after_stands').if, g)).toBe(true);
  });

  it('a fight at midnight: the night waits while the lane is fought, and goes on once the riders are down', () => {
    const { g, q } = eve({ rc_line: 'halts', ln_sarr_warned: true });
    talk('d_ln_mason', g, q, ['Tell me how it stands.', 'I\'ll stand with Openfield.']);
    dusk(g, q);
    const r = night(g, q, ['(The night comes.)', '(Hold the lane against the guild\'s riders.)']);
    expect(r.ended).toBe(true);
    expect(g.flags).toMatchObject({ ln_riders_fight: true, ln_midnight_fought: true, ln_strength: 3 });
    expect(cond(placed('openfield', 'npc_ln_r1').if, g)).toBe(true);
    expect(cond(trigger('openfield', 'ln_night').if, g)).toBe(false);
    for (const id of ['npc_ln_r1', 'npc_ln_r2', 'npc_ln_r3']) (g.npcs as Record<string, { dead?: boolean }>)[`openfield/${id}`] = { dead: true };
    expect(cond(trigger('openfield', 'ln_night').if, g)).toBe(true);
    talk('d_ln_night', g, q, ['(The small hours.)', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'mixed', ln_openfield: 'scorched', ln_riders_fight: false });
  });

  it('a thin night for the Choir: the guild holds the Line and has dogs; Petra\'s knife finds the Grand Factor; Openfield burns and the seed with it; Odile pays her price', () => {
    const { g, q } = eve({ rc_line: 'guild', nw_controllers: 'guild', odile_price: 'sarr' });
    apply([{ join: ODILE }], g, q);
    g.pc.sheet.baseAttrs.grit = 8;
    talk('d_ln_mason', g, q, ['Tell me how it stands.', 'I\'ll stand with Openfield.']);
    dusk(g, q);
    expect(g.flags).toMatchObject({ ln_against_line: true, ln_against_kennel: true, ln_strength: -1 });
    night(g, q, ['(The night comes.)', '(Sit down in the lane', '(Let it happen.)', '(Dawn.)', '(See what the night left.)', '(He chose the door.)', '(Go on.)', '(Go on.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'thin', ln_openfield: 'burned', ln_stores: 'lost', ks_mason: 'dead', ln_sarr: 'dead', ks_sarr: 'dead', odile_gone: true, odile_left: 'longnight' });
    expect(g.world.party).not.toContain(ODILE);
    expect(stage(g, 'q_a2_longnight')).toBe('choir_burned');
  });

  it('a thin Choir night with the Line free and the shore\'s boats owed: the seed goes down the delta even though Openfield burns', () => {
    const { g, q } = eve({ rc_line: 'shared', ds_boats_owed: true, nw_controllers: 'guild', vasha_fate: 'spared', ln_sarr_warned: true });
    talk('d_ln_mason', g, q, ['Tell me how it stands.', 'I\'ll stand with Openfield.']);
    dusk(g, q);
    // the halts came (+1), the guild's dogs and Vasha's riders stand against (-2): 0
    expect(g.flags.ln_strength).toBe(0);
    g.pc.sheet.baseAttrs.brawn = 8;
    skills(g, { speech: 70 });
    night(g, q, ['(The night comes.)', '(Walk down the lane alone', '(Dawn.)', '(See what the night left.)', '(Go in after him.)', '(Go on.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'thin', ln_openfield: 'burned', ln_stores: 'shore', ks_mason: 'lives', ln_mason_burned: true });
  });

  it('a mixed night for the city: unit nine carries the order lawfully, the halts refuse the wardens; the rows burn by order; the people are heard by the Court\'s precedent; Ash goes', () => {
    const { g, q } = eve({ rc_line: 'halts', nine_stance: 'deputy', prec_unrecorded: 'yields' });
    apply([{ join: ASH }, { join: NINE }], g, q);
    skills(g, { speech: 40 });
    talk('d_ln_lowe', g, q, ['Tell me what the city wants.', 'Read me the order.', 'Something else.', 'I\'ll stand with the city.']);
    expect(g.flags).toMatchObject({ ln_alliance: 'ledger', ln_strength: 2 });
    dusk(g, q);
    expect(g.flags).toMatchObject({ ln_came_deputy: true, ln_against_halts: true, ln_strength: 2 });
    night(g, q, ['(The night comes.)', '(Take the order and read it at the well', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(Go on.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'mixed', ln_openfield: 'scorched', ln_stores: 'precinct', ks_mason: 'lives', ln_people: 'heard', ln_guild_evicted: true, ln_nine_back: true, ash_gone: true, ash_redline: 'longnight' });
    expect(g.world.party).not.toContain(ASH);
    expect(g.world.party).toContain(NINE);
    expect(stage(g, 'q_a2_longnight')).toBe('ledger_scorched');
  });

  it('a strong night for the guild and the Concern: the Line, a pack out of Kennel Seven and the shore\'s oil; Openfield a company farm; Wren and Kes go', () => {
    const { g, q } = eve({ rc_line: 'guild', an_key: 'concern', ds_rig: 'guild' });
    apply([{ join: WREN }, { join: KES }], g, q);
    skills(g, { barter: 60 });
    talk('d_ln_sarr', g, q, ['What does the guild want?', 'I\'ll stand with the guild.']);
    expect(g.pc.inventory.tolls).toBe(1050);
    dusk(g, q);
    expect(g.flags).toMatchObject({ ln_came_line: true, ln_came_pack: true, ln_came_fuel: true, ln_strength: 5 });
    night(g, q, ['(The night comes.)', '(Meet the order at the well', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'strong', ln_openfield: 'guild', ln_stores: 'guild', ks_mason: 'exiled', ln_leash: 'spreads', wren_left: 'longnight', kes_left: 'longnight' });
    expect(g.world.party).not.toContain(WREN);
    expect(g.world.party).not.toContain(KES);
    expect(cond(placed('openfield', 'npc_ln_r1').if, g)).toBe(true);
    expect(cond(placed('openfield', 'npc_of_01').if, g)).toBe(false);
  });

  it('a truce: all three at one table on two favours owed and Speech 75; everyone owes the player and nobody trusts them', () => {
    const one = eve({ rc_line: 'halts' });
    expect(view('d_ln_table', one.g, one.q).options.find((o) => o.text.startsWith('(Send to the lane'))?.locked).toBe(true);
    const { g, q } = eve({ rc_line: 'halts', dk_stand_owed: true });
    skills(g, { speech: 80 });
    talk('d_ln_table', g, q, ['(Send to the lane', '(Make the truce']);
    expect(g.flags).toMatchObject({ ln_alliance: 'truce', ln_mustered: true });
    night(g, q, ['(The night comes.)', '(Keep the night.)', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_band: 'truce', ln_openfield: 'stands', ln_stores: 'split', ks_mason: 'lives', ln_owed: true, ln_trust: 'none', ln_eviction_stayed: true });
    expect(stage(g, 'q_a2_longnight')).toBe('truce');
  });

  it('a truce that fails breaks the table for good; standing with none lets the forecast have it', () => {
    const { g, q } = eve({ rc_line: 'halts', dk_stand_owed: true });
    skills(g, { speech: 30 });
    talk('d_ln_table', g, q, ['(Send to the lane', '(Make the truce']);
    expect(g.flags.ln_table_broken).toBe(true);
    expect(g.flags.ln_alliance).toBeUndefined();
    talk('d_ln_table', g, q, ['(Stand with none of them.)', '(Stand with none of them. Let it come']);
    expect(g.flags.ln_alliance).toBe('none');
    night(g, q, ['(The night comes.)', '(Watch.)', '(Let it happen.)', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(g.flags).toMatchObject({ ln_openfield: 'burned', ks_mason: 'dead', ln_forecast_kept: true, ln_sarr: 'dead' });
    expect(stage(g, 'q_a2_longnight')).toBe('aside');
  });
});

describe('the order\'s first name, on the Line', () => {
  it('pilot working holds the car at West Halt, and the halt walks her out; back at Openfield she counts for the Choir', () => {
    const { g, q } = eve({ rc_pilot: true, rc_line: 'halts' });
    expect(g.flags.ln_car).toBe('west_halt');
    g.locationId = 'rc_halt_w';
    expect(cond(placed('rc_halt_w', 'ln_calla_wh').if, g)).toBe(true);
    talk('d_ln_car', g, q, ['(No pilotman will take the car on.']);
    expect(g.flags).toMatchObject({ ln_calla: 'freed', ks_calla: 'free', ln_calla_how: 'pilot' });
    expect(stage(g, 'q_ln_calla')).toBe('freed');
    expect(cond(placed('rc_halt_w', 'ln_calla_wh').if, g)).toBe(false);
    g.locationId = 'openfield';
    talk('d_ln_mason', g, q, ['Tell me how it stands.', 'I\'ll stand with Openfield.']);
    dusk(g, q);
    expect(g.flags.ln_came_calla).toBe(true);
    expect(cond(placed('openfield', 'ln_calla_of').if, g)).toBe(true);
  });

  it('with the guild holding the Line the car runs straight through to Carrick, where the Harbour court calls her a passenger', () => {
    const { g, q } = eve({ rc_line: 'guild', dk_prec_passenger: true });
    expect(g.flags.ln_car).toBe('carrick');
    g.locationId = 'md_docks';
    expect(cond(placed('md_docks', 'ln_calla_dk').if, g)).toBe(true);
    talk('d_ln_carrick', g, q, ['(On Carrick\'s quay a person is a passenger']);
    expect(g.flags).toMatchObject({ ln_calla: 'freed', ln_calla_how: 'harbour' });
    expect(g.pc.inventory.tolls).toBe(775);
  });

  it('with Four Ways\' box short of a spare the section fails, and she can be lifted out after dark; or the escort talked round', () => {
    const a = eve({ rc_box_nospare: true });
    expect(a.g.flags.ln_car).toBe('west_halt');
    a.g.locationId = 'rc_halt_w';
    hour(a.g, 23);
    skills(a.g, { stealth: 50 });
    talk('d_ln_car', a.g, a.q, ['(The token will not come tonight.']);
    expect(a.g.flags.ln_calla_how).toBe('lifted');
    const b = eve({ prec_unrecorded: 'yields' });
    b.g.locationId = 'rc_halt_w';
    skills(b.g, { speech: 50 });
    talk('d_ln_escort', b.g, b.q, ['She has a right to be heard']);
    expect(b.g.flags.ln_calla_how).toBe('heard');
  });

  it('Sister Calla stands in one place at a time: the mission, the car, Openfield once freed on the Line, nowhere while the city holds her, home once free', () => {
    const where = (g: G) => Object.entries(MAPS).flatMap(([m, d]) => (d.npcs ?? []).filter((n) => n.def === 'npc_sh_05' && cond(n.if, g)).map((n) => `${m}/${n.id ?? n.def}`));
    // before the night: the Choir's mission in Shale
    expect(where(at('shale').g)).toEqual(['shale/npc_sh_05']);
    // taken on the eve: on the car at the halt, not home; carried west at dawn and held by the city: nowhere
    const t = eve({ rc_line: 'halts', dk_stand_owed: true });
    expect(t.g.flags.ln_car).toBe('west_halt');
    expect(where(t.g)).toEqual(['rc_halt_w/ln_calla_wh']);
    skills(t.g, { speech: 80 });
    talk('d_ln_table', t.g, t.q, ['(Send to the lane', '(Make the truce']);
    night(t.g, t.q, ['(The night comes.)', '(Keep the night.)', '(Dawn.)', '(See what the night left.)', '(Go on.)', '(Go on.)', '(It is over.)']);
    expect(t.g.flags).toMatchObject({ ln_calla: 'taken', ks_calla: 'imprisoned', ln_done: true });
    expect(cond(CALLA_HELD, t.g)).toBe(true);
    expect(where(t.g)).toEqual([]);
    // released at the Court (B6l writes ks_calla = free): home again, and only there
    t.g.flags.ks_calla = 'free';
    expect(cond(CALLA_FREE, t.g)).toBe(true);
    expect(where(t.g)).toEqual(['shale/npc_sh_05']);
    // the night over with nothing written of her: held, by the safe default
    const d = at('shale');
    d.g.flags.ln_done = true;
    expect(cond(CALLA_HELD, d.g)).toBe(true);
    expect(where(d.g)).toEqual([]);
    // through to Carrick on the guild's Line: on the quay, not home
    expect(where(eve({ rc_line: 'guild' }).g)).toEqual(['md_docks/ln_calla_dk']);
    // freed at the halt: at Openfield, where she stays; home if the night leaves Openfield the guild's or the city's
    const f = eve({ rc_pilot: true, rc_line: 'halts' });
    f.g.locationId = 'rc_halt_w';
    talk('d_ln_car', f.g, f.q, ['(No pilotman will take the car on.']);
    expect(cond(CALLA_FREE, f.g)).toBe(true);
    expect(where(f.g)).toEqual(['openfield/ln_calla_of']);
    for (const v of ['stands', 'scorched', 'burned', 'guild', 'evicted']) {
      Object.assign(f.g.flags, { ln_done: true, ln_openfield: v });
      expect(where(f.g), v).toEqual(v === 'guild' || v === 'evicted' ? ['shale/npc_sh_05'] : ['openfield/ln_calla_of']);
    }
    // the mission's placement is the generator's
    for (const m of regenerate('gen_shale.py')) expect(m.generated, m.map).toBe(m.committed);
  });
});
