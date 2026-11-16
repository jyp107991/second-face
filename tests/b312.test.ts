import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, MAPS, QUESTS, WORLD_EVENTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { addItem, countItem, makeItem } from '../src/engine/inventory/inventory';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';

/**
 * B3.12 — the Dead Ring outside the Wall (the Loop's last halt, the races at Clover and their rivalry, Fire at Leven),
 * Bridgeward's raid (the odds, both outcomes, the booth) and Meridian end to end: from the gate to the Spire's verdict
 * through every district the Loop reaches. Played headless.
 */

type G = ReturnType<typeof newGameState>;
const WREN = 'npc_rd_03';
const ILYA = 'npc_sh_17';

/** Play a conversation by choosing options whose text starts with the given prefixes, in order. */
function talk(id: string, g: G, q: QuestEngine, picks: string[]): DialogueRunner {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
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
const placed = (map: string, id: string) => MAPS[map].npcs!.find((n) => (n.id ?? n.def) === id)!;

function inCity(map = 'md_ring', hour = 19) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 60 * 1440 + hour * 60;
  g.locationId = map;
  g.flags.ch1_done = true;
  g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true; g.flags.md_lantern_open = true; g.flags.md_bridgeward_open = true;
  g.pc.inventory.tolls = 500;
  const q = new QuestEngine(QUESTS, g);
  return { g, q };
}
const attrs = (g: G, a: Partial<Record<'reflex' | 'senses' | 'grit', number>>) => Object.assign(g.pc.sheet.baseAttrs, a);

// ---------------------------------------------------------------- the place and the Loop

describe('B3.12: the Ring and the Loop complete', () => {
  it('the Ring is north along the Wall from the gate road, and the gate road runs back', () => {
    const north = MAPS.md_precinct.exits!.find((e) => 'location' in e.to && e.to.location === 'md_ring')!;
    expect(north).toBeDefined();
    expect(north.if).toBeUndefined();   // outside the Wall: no papers needed
    const south = MAPS.md_ring.exits!.find((e) => 'location' in e.to && e.to.location === 'md_precinct')!;
    expect(south.to).toEqual({ location: 'md_precinct', spawn: 'from_ring' });
    expect(MAPS.md_ring.settlement).toBe('meridian');
  });

  it('every board inside the Wall sells a seat to Clover, and Clover\'s board sells them back to anyone counted in', () => {
    const { g, q } = inCity('md_precinct');
    const boards: [string, string][] = [['md_precinct', 'd_md_loop'], ['md_market', 'd_mk_loop'], ['md_lantern', 'd_lr_loop'], ['md_stacks', 'd_st_loop'], ['md_bridgeward', 'd_bw_loop']];
    for (const [map, board] of boards) {
      g.locationId = map;
      talk(board, g, q, ['Clover, outside the Wall. (4 Tolls)']);
    }
    expect(g.pc.inventory.tolls).toBe(480);
    g.locationId = 'md_ring';
    for (const seat of ['The Precinct.', 'Old Market.', 'Lantern Row.', 'The Stacks.', 'Bridgeward.']) talk('d_dr_loop', g, q, [seat]);
    expect(g.pc.inventory.tolls).toBe(460);
    expect(g.world.knowledge.dr_loop_seen).toBe(true);
    // the stale chalk is gone: only the Docks are still struck through
    g.locationId = 'md_precinct';
    expect(view('d_md_loop', g, q).text).toContain('THE DOCKS');
    expect(view('d_md_loop', g, q).text).not.toContain('WORKS');
  });

  it('the turnstile counts people back in, not the first time', () => {
    const { g, q } = inCity();
    g.flags.md_inside = false;
    const opts = options('d_dr_loop', g, q);
    expect(opts.some((t) => t.startsWith('The Precinct.'))).toBe(false);
    talk('d_dr_loop', g, q, ['(Face the lens.)', '(Leave it.)']);
    expect(g.world.knowledge.dr_lens_red).toBe(true);
  });
});

// ---------------------------------------------------------------- the races

const HIRE = ['(Hire the Mule for tonight. 10 Tolls)', '(Back.)', 'That\'s all.'];
const WIN = ['(Enter tonight\'s heat. 20 Tolls)', '(Go.)', '(Push: flat out', '(The cloverleaf.)', '(Cut: straight across', '(The last straight.)', '(Push: everything', '(Collect the purse.)', '(Step back from the booth.)'];
const HOLD = ['(Enter tonight\'s heat. 20 Tolls)', '(Go.)', '(Hold your line.)', '(The cloverleaf.)', '(Hold your line through', '(The last straight.)', '(Hold it to the line.)', '(Walk back to the slate.)', '(Step back from the booth.)'];
function heat(g: G, q: QuestEngine, picks = WIN) {
  talk('d_dr_emil', g, q, HIRE);
  talk('d_dr_slate', g, q, picks);
}
/** Two heats run, and the final on the slate. */
function toFinal() {
  const c = inCity();
  attrs(c.g, { reflex: 9, senses: 9 });
  talk('d_dr_slate_sign', c.g, c.q, ['(Leave it.)']);
  heat(c.g, c.q);
  heat(c.g, c.q);
  return c;
}
const FINAL_FAST = ['(Enter the final. 40 Tolls)', '(Go.)', '(Push: flat out', '(The cloverleaf.)', '(Cut: straight across', '(The last straight.)', '(Hold it to the line.)', '(Walk up to the booth.)', '(Step back from the booth.)'];
const FINAL_SLOW = ['(Enter the final. 40 Tolls)', '(Go.)', '(Hold your line.)', '(The cloverleaf.)', '(Hold your line through', '(The last straight.)', '(Hold it to the line.)', '(Walk up to the booth.)', '(Step back from the booth.)'];

describe('Racing at Clover: the heats', () => {
  it('a heat at dusk: the Mule hired, push, cut, push, and first pays seventy', () => {
    const { g, q } = inCity();
    attrs(g, { reflex: 9, senses: 9 });
    expect(options('d_dr_slate', g, q).some((t) => t.startsWith('(Enter tonight'))).toBe(false);   // nothing to race in
    heat(g, q);
    expect(g.pc.inventory.tolls).toBe(500 - 10 - 20 + 70);
    expect(g.flags.dr_heats).toBe(1);
    expect(g.flags.dr_hired).toBe(false);
    expect(g.world.quests.q_dr_clover.stage).toBe('rival');
  });

  it('the meet runs at dusk only', () => {
    const { g, q } = inCity('md_ring', 12);
    talk('d_dr_emil', g, q, HIRE);
    expect(options('d_dr_slate', g, q).some((t) => t.startsWith('(Enter tonight'))).toBe(false);
  });

  it('holding every segment keeps your place, and fourth pays nothing', () => {
    const { g, q } = inCity();
    heat(g, q, HOLD);
    expect(g.pc.inventory.tolls).toBe(470);
    expect(g.flags.dr_pos).toBe(4);
  });

  it('a failed cut is a crash: the buggy is hurt, the tune lost, and Emil wants twenty-five before he hires again', () => {
    const { g, q } = inCity();
    attrs(g, { reflex: 9, senses: 1 });
    talk('d_dr_emil', g, q, HIRE);
    talk('d_dr_emil', g, q, ['(Pay him to tune it. 15 Tolls)', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_tuned).toBe(true);
    talk('d_dr_slate', g, q, ['(Enter tonight\'s heat. 20 Tolls)', '(Go.)', '(Push: flat out', '(The cloverleaf.)', '(Cut: straight across', '(Climb out.)', '(Walk back to the slate.)', '(Step back from the booth.)']);
    expect(g.flags.dr_buggy_hurt).toBe(true);
    expect(g.flags.dr_tuned).toBe(false);
    expect(options('d_dr_emil', g, q).some((t) => t.startsWith('(Hire the Mule'))).toBe(false);
    talk('d_dr_emil', g, q, ['(Pay for the repairs. 25 Tolls)', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_buggy_hurt).toBe(false);
    expect(options('d_dr_emil', g, q).some((t) => t.startsWith('(Hire the Mule'))).toBe(true);
  });

  it('a coughing engine on the straight costs a place and makes the next push harder; the walked ramp and the tune make it easier', () => {
    const { g, q } = inCity();
    attrs(g, { reflex: 5, senses: 7 });
    talk('d_dr_emil', g, q, HIRE);
    const r = talk('d_dr_slate', g, q, ['(Enter tonight\'s heat. 20 Tolls)', '(Go.)', '(Push: flat out', '(The cloverleaf.)']);
    expect(g.flags.dr_pos).toBe(5);
    const push = r.view()!.options.find((o) => o.text.startsWith('(Push through'))!;
    expect(push.checkLabel).toBe('Reflex 9');
    talk('d_dr_cut', g, q, ['(Leave it.)']);
    expect(g.world.knowledge.dr_cut_line).toBe(true);   // senses 7: the good line is on the left
    const cut = r.view()!.options.find((o) => o.text.startsWith('(Cut:'))!;
    expect(cut.checkLabel).toBe('Senses 6');
    expect(cut.checkMet).toBe(true);
  });

  it('the book pays short on a winner after three wins', () => {
    const { g, q } = inCity();
    attrs(g, { reflex: 9, senses: 9 });
    g.flags.dr_final_posted = true; g.flags.dr_final = 'won';   // past the final: heats still run, as a service
    for (let i = 0; i < 3; i++) heat(g, q);
    const before = g.pc.inventory.tolls;
    heat(g, q);
    expect(g.pc.inventory.tolls - before).toBe(45 - 30);
    expect(g.flags.dr_wins).toBe(4);
  });
});

describe('Racing at Clover: the rivalry and the final', () => {
  it('two heats post the final; Bello says what she races for', () => {
    const { g, q } = toFinal();
    expect(g.flags.dr_final_posted).toBe(true);
    expect(g.world.quests.q_dr_clover.stage).toBe('final');
    talk('d_dr_bello', g, q, ['What are you racing for?', '(Back.)', 'That\'s all.']);
    expect(g.world.leads.l_dr_fine).toBe(true);
    expect(options('d_dr_slate', g, q).some((t) => t.startsWith('(Enter tonight'))).toBe(false);   // the slate is the final's
  });

  it('the Coat\'s money and silence: the Heron\'s brakes go at the cloverleaf', () => {
    const { g, q } = toFinal();
    talk('d_dr_haverty', g, q, ['What\'s in the book?', '(Back.)', 'You need Bello not to finish.', '(Take it.)', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_paid).toBe(true);
    talk('d_dr_emil', g, q, HIRE);
    const r = talk('d_dr_slate', g, q, ['(Enter the final. 40 Tolls)', '(Go.)', '(Push: flat out', '(The cloverleaf.)']);
    expect(g.flags.dr_bello).toBe('crippled');
    expect(r.view()!.text).toContain('brake light');
    for (const p of ['(Hold your line through', '(The last straight.)', '(Hold it to the line.)', '(Walk up to the booth.)', '(Step back from the booth.)']) {
      r.choose(r.view()!.options.find((o) => o.text.startsWith(p))!.id); q.update();
    }
    expect(g.world.quests.q_dr_clover.stage).toBe('crippled');
    expect(g.world.quests.q_dr_clover.status).toBe('failed');
    expect(view('d_dr_bello', g, q).text).toContain('somebody was paid');
  });

  it('the cut found and mended, the Coat put off the Ring, the final won and the card given: Bello goes in, and leaves the Heron', () => {
    const { g, q } = toFinal();
    g.pc.sheet.skillBought.mechanics = 90;
    talk('d_dr_heron', g, q, ['(Mend the cut line yourself.)', '(Leave it.)']);   // the passive reads the cut first
    expect(g.flags.dr_line).toBe('fixed');
    expect(countItem(g.pc.inventory, 'k_dr_line')).toBe(1);
    talk('d_dr_slate', g, q, ['(Put the cut brake line on the counter.)', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_haverty).toBe('barred');
    expect(cond(placed('md_ring', 'npc_dr_04').if, g)).toBe(false);
    talk('d_dr_emil', g, q, HIRE);
    talk('d_dr_slate', g, q, FINAL_FAST);
    expect(g.flags.dr_final).toBe('won');
    expect(countItem(g.pc.inventory, 'k_dr_card')).toBe(1);
    expect(g.world.quests.q_dr_clover.stage).toBe('card');
    talk('d_dr_bello', g, q, ['(Give her the card.)', 'That\'s all.']);
    expect(g.flags.dr_bello).toBe('inside');
    expect(g.flags.dr_buggy).toBe('heron');
    expect(countItem(g.pc.inventory, 'k_dr_card')).toBe(0);
    expect(g.world.quests.q_dr_clover.stage).toBe('inside');
    expect(g.world.quests.q_dr_clover.status).toBe('done');
    expect(cond(placed('md_ring', 'npc_dr_02').if, g)).toBe(false);
  });

  it('warned: she mends it herself; she wins the final, writes her own name and goes in', () => {
    const { g, q } = toFinal();
    talk('d_dr_haverty', g, q, ['What\'s in the book?', '(Back.)', 'You need Bello not to finish.', 'No.', '(Back.)', 'That\'s all.']);
    talk('d_dr_bello', g, q, ['Watch the Heron tonight.', 'Mend it. Then win.', 'That\'s all.']);
    expect(g.flags.dr_line).toBe('told');
    talk('d_dr_emil', g, q, HIRE);
    talk('d_dr_slate', g, q, FINAL_SLOW);
    expect(g.flags.dr_final).toBe('bello');
    expect(g.world.quests.q_dr_clover.stage).toBe('hers');
    talk('d_dr_bello', g, q, ['(Let her go.)', 'That\'s all.']);
    expect(g.flags.dr_bello).toBe('inside');
    expect(g.flags.dr_bello_how).toBe('race');
    expect(g.world.quests.q_dr_clover.stage).toBe('inside');
  });

  it('the card won and kept, or sold back to the Coat', () => {
    const a = toFinal();
    a.g.pc.sheet.skillBought.mechanics = 90;
    talk('d_dr_heron', a.g, a.q, ['(Mend the cut line yourself.)', '(Leave it.)']);
    talk('d_dr_emil', a.g, a.q, HIRE);
    talk('d_dr_slate', a.g, a.q, FINAL_FAST);
    talk('d_dr_bello', a.g, a.q, ['(Keep it.)', 'That\'s all.']);
    expect(a.g.flags.dr_card).toBe('kept');
    expect(a.g.world.quests.q_dr_clover.stage).toBe('champion');
    const tolls = a.g.pc.inventory.tolls;
    talk('d_dr_haverty', a.g, a.q, ['(Sell him the card back.', '(Back.)', 'That\'s all.']);
    expect(a.g.pc.inventory.tolls - tolls).toBe(150);
    expect(a.g.flags.dr_card).toBe('sold');
    // Emil sells the Mule once the final has run
    talk('d_dr_emil', a.g, a.q, ['(Buy the Mule. 120 Tolls)', '(Back.)', 'That\'s all.']);
    expect(a.g.flags.dr_buggy).toBe('mule');
  });

  it('the Court\'s ruling on forecast fines: she goes to the rail after the final, and gives back the card', () => {
    const { g, q } = toFinal();
    g.flags.prec_forecast_fine = 'void';
    talk('d_dr_bello', g, q, ['What are you racing for?', '(Back.)', 'The Court of Accounts voided', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_bello_court).toBe(true);
    g.pc.sheet.skillBought.mechanics = 90;
    talk('d_dr_heron', g, q, ['(Mend the cut line yourself.)', '(Leave it.)']);
    talk('d_dr_emil', g, q, HIRE);
    talk('d_dr_slate', g, q, FINAL_FAST);
    expect(options('d_dr_bello', g, q).some((t) => t.startsWith('(Give her the card.)'))).toBe(false);
    talk('d_dr_bello', g, q, ['(Let her go.)', 'That\'s all.']);
    expect(g.flags.dr_bello_how).toBe('court');
    expect(g.flags.dr_card).toBe('kept');
    expect(countItem(g.pc.inventory, 'k_dr_card')).toBe(1);
    expect(g.world.quests.q_dr_clover.stage).toBe('inside');
  });

  it('Emil or the boy in the pits saw the Coat at night', () => {
    const { g, q } = toFinal();
    talk('d_dr_emil', g, q, ['Who\'s been at the Heron at night?', '(Back.)', '(Pay him to look at the Heron', '(Back.)', 'That\'s all.']);
    expect(g.world.leads.l_dr_coat).toBe(true);
    expect(g.flags.dr_line).toBe('fixed');
  });
});

// ---------------------------------------------------------------- Fire at Leven

function atLeven(hour = 12) {
  const c = inCity('md_ring', hour);
  talk('d_dr_leven_door', c.g, c.q, ['(Leave it.)']);
  return c;
}

describe('Fire at Leven', () => {
  it('the chalk on the door is on the yard\'s own tally: the yard chalks the towers that burn', () => {
    const { g, q } = atLeven();
    expect(g.world.quests.q_dr_leven.stage).toBe('door');
    talk('d_dr_yard_board', g, q, ['(Leave it.)']);
    expect(g.world.knowledge.dr_mark_who).toBe(true);
    expect(g.world.leads.l_dr_mark).toBe(true);
    expect(g.world.quests.q_dr_leven.stage).toBe('yard');
  });

  it('the boy at the door in the small hours, caught, says who pays him; Emil takes him on', () => {
    const { g, q } = atLeven(1);
    attrs(g, { reflex: 9 });
    talk('d_dr_sami', g, q, ['(Get the can off him', 'That\'s all.']);
    expect(g.world.knowledge.dr_sami_told).toBe(true);
    expect(g.world.quests.q_dr_leven.stage).toBe('yard');
    g.pc.sheet.skillBought.speech = 90;
    talk('d_dr_emil', g, q, ['There\'s a boy who chalks towers', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_sami).toBe('pits');
    expect(cond(placed('md_ring', 'npc_dr_07_pits').if, g)).toBe(true);
    expect(cond(placed('md_ring', 'npc_dr_07').if, g)).toBe(false);
  });

  it('barred: the yard\'s book read out at the slate', () => {
    const { g, q } = atLeven();
    addItem(g.pc.inventory, makeItem('k_dr_yardbook'));
    talk('d_dr_yardbook', g, q, ['(Close it.)']);
    expect(tryConclude(g, ['l_dr_mark', 'l_dr_steel'], CONCLUSIONS, q)?.id).toBe('c_dr_fires');
    talk('d_dr_slate', g, q, ['(Put the yard\'s tally book on the counter.)', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_leven).toBe('barred');
    expect(g.world.quests.q_dr_leven.stage).toBe('barred');
    expect(g.world.quests.q_dr_leven.status).toBe('done');
    expect(view('d_dr_ruben', g, q).text).toContain('Nobody buys a pound');
  });

  it('stripped: the keeper agrees to sell her own empty floors, and the yard takes the deal', () => {
    const { g, q } = atLeven();
    talk('d_dr_yard_board', g, q, ['(Leave it.)']);
    g.pc.sheet.skillBought.speech = 90; g.pc.sheet.skillBought.barter = 30;
    talk('d_dr_haeun', g, q, ['It\'s the yard.', 'Sell him the steel yourselves', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_leven_offer).toBe(true);
    const r = talk('d_dr_ruben', g, q, ['Leven has your mark on its door.']);
    const broker = r.view()!.options.find((o) => o.text.startsWith('(Broker it.)'))!;
    expect(broker.checkLabel).toBe('Barter 30');
    talk('d_dr_ruben', g, q, ['Leven has your mark on its door.', '(Broker it.)', '(Back.)', 'That\'s all.']);
    expect(g.flags.dr_leven).toBe('stripped');
    expect(g.world.quests.q_dr_leven.stage).toBe('stripped');
    expect(tryConclude(g, ['l_dr_steel', 'l_bw_tenured_road'], CONCLUSIONS, q)).toBeNull();   // the road's lead is Bridgeward's
    g.world.leads.l_bw_tenured_road = true;
    expect(tryConclude(g, ['l_dr_steel', 'l_bw_tenured_road'], CONCLUSIONS, q)?.id).toBe('c_dr_road');
  });

  it('paid: the yard\'s sixty, and Leven burns at the next three o\'clock the player is in the Ring', () => {
    const { g, q } = atLeven();
    talk('d_dr_yard_board', g, q, ['(Leave it.)']);
    talk('d_dr_ruben', g, q, ['Leven has your mark on its door.', 'How much to look the other way?', '(Take it.)', 'That\'s all.']);
    expect(g.flags.dr_leven).toBe('paid');
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toEqual([]);
    g.locationId = 'md_precinct';
    g.minutes += 16 * 60;
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toEqual([]);   // it waits for the player
    g.locationId = 'md_ring';
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('leven_fire');
    q.update();
    expect(g.flags.dr_leven_burned).toBe(true);
    expect(g.world.quests.q_dr_leven.stage).toBe('burned');
    expect(g.world.quests.q_dr_leven.status).toBe('failed');
    expect(cond(placed('md_ring', 'npc_dr_05').if, g)).toBe(false);
    expect(cond(placed('md_precinct', 'npc_dr_05_line').if, g)).toBe(true);
    g.locationId = 'md_precinct';
    expect(view('d_dr_haeun', g, q).text).toContain('Eighty-nine');
  });
});

// ---------------------------------------------------------------- Bridgeward's raid

function raidNight(wrenBridge: 'raid' | 'alone' = 'raid') {
  const c = inCity('md_bridgeward', 23);
  const { g, q } = c;
  g.world.party.push(WREN); g.flags.wren_joined = true; g.flags.wren_bridge = wrenBridge;
  g.flags.a2_spire_done = true;
  q.questStart('q_bw_turf');
  q.questStart('q_comp_wren');
  q.update();
  return c;
}
const raidTrigger = () => MAPS.md_bridgeward.triggers!.find((t) => t.id === 'raid')!;

describe('Bridgeward: the night the Dogs come back for the bridge', () => {
  it('the trigger waits for the season to close, a night, and Wren travelling with her mind made up', () => {
    const { g } = raidNight();
    expect(cond(raidTrigger().if, g)).toBe(true);
    g.flags.a2_spire_done = false;
    expect(cond(raidTrigger().if, g)).toBe(false);
    g.flags.a2_spire_done = true; g.minutes += 12 * 60;   // midday
    expect(cond(raidTrigger().if, g)).toBe(false);
    expect(raidTrigger().effects).toEqual([{ event: 'dialogue', data: { tree: 'd_bw_raid', name: 'The bridge' } }]);
  });

  it('Vasha is the booth\'s hand once the season has closed, and no longer at the overpass', () => {
    const { g } = raidNight();
    expect(cond(placed('md_bridgeward', 'npc_rd_02_booth').if, g)).toBe(true);
    expect(cond(placed('overpass', 'npc_rd_02').if, g)).toBe(false);
  });

  it('the odds are a check the player can read', () => {
    const { g, q } = raidNight();
    g.flags.bw_turf = 'rustmouths';
    let o = talk('d_bw_raid', g, q, ['Tonight.']).view()!.options.find((x) => x.text.startsWith('Over the chain'))!;
    expect(o.checkLabel).toBe('Firearms 80');   // 55, +15 the Rustmouths, +10 Vasha at the booth
    g.world.approval[WREN] = 50; g.flags.ilya_wren_bridge = true; g.world.party.push(ILYA);
    g.world.knowledge.bw_fenn_opens = true;
    o = talk('d_bw_raid', g, q, ['Tonight.']).view()!.options.find((x) => x.text.startsWith('Over the chain'))!;
    expect(o.checkLabel).toBe('Firearms 55');
    expect(o.checkNotes.length).toBe(5);
  });

  it('won over the chain: the Dogs hold the bridge, Vasha is cornered at the booth, and Wren walks off it', () => {
    const { g, q } = raidNight();
    g.pc.sheet.skillBought.firearms = 90;
    talk('d_bw_raid', g, q, ['Tonight.', 'Over the chain, all at once.', '(The booth.)', '(Go.)']);
    expect(g.flags.bw_raid).toBe('won');
    expect(g.flags.bw_dogs_hold).toBe(true);
    expect(g.flags.vasha_cornered).toBe(true);
    expect(g.world.party).toContain(WREN);
    expect(g.world.quests.q_comp_wren.stage).toBe('walked');
    expect(g.flags.wren_rope).toBe('broken');
    expect(g.world.quests.q_bw_turf.stage).toBe('dogs');
    expect(view('d_bw_chain', g, q).text).toContain('DOGS');
    expect(view('d_rd_vasha', g, q).text).toContain('back is to the toll booth');
  });

  it('the booth: Ilya, the letter, and his round; Vasha is gone from the map after', () => {
    const { g, q } = raidNight();
    g.pc.sheet.skillBought.firearms = 90;
    g.world.party.push(ILYA); g.flags.ilya_letter_read = true;
    q.questStart('q_comp_ilya'); q.update();
    talk('d_bw_raid', g, q, ['Tonight.', 'Over the chain, all at once.', '(The booth.)', '(Go.)']);
    talk('d_rd_vasha', g, q, ['(Let Ilya speak.)', '(Give her the letter Ilya carries.)', '(Nod to Ilya.)', '(Go.)']);
    expect(g.flags.vasha_fate).toBe('ilya');
    expect(g.world.quests.q_comp_ilya.stage).toBe('shot');
    expect(cond(placed('md_bridgeward', 'npc_rd_02_booth').if, g)).toBe(false);
  });

  it('lost: the chain holds, and Wren hangs from the booth at dawn as the city wrote', () => {
    const { g, q } = raidNight();
    g.pc.sheet.skillBought.firearms = 0;
    talk('d_bw_raid', g, q, ['Tonight.', 'Over the chain, all at once.', '(…)']);
    expect(g.flags.bw_raid).toBe('lost');
    expect(g.flags.wren_hanged).toBe(true);
    expect(g.world.party).not.toContain(WREN);
    expect(g.world.quests.q_comp_wren.stage).toBe('hanged');
    expect(g.world.quests.q_comp_wren.status).toBe('failed');
    expect(g.flags.wren_rope).toBe('fulfilled');
    expect(cond(placed('overpass', 'npc_rd_03').if, g)).toBe(false);
    expect(view('d_bw_chain', g, q).text).toContain('cut off short');
    // Vasha stays at the booth; at night she can still be walked up to, for Ilya's line
    expect(view('d_rd_vasha', g, q).text).toContain('I only held it');
  });

  it('her call carries only with something on her side, and never against a Rustmouth chain', () => {
    const a = raidNight();
    a.g.world.approval[WREN] = 50;
    talk('d_bw_raid', a.g, a.q, ['Tonight.', 'It\'s your bridge. Your call.', '(The booth.)', '(Go.)']);
    expect(a.g.flags.bw_raid).toBe('won');
    const b = raidNight();
    b.g.world.approval[WREN] = 50; b.g.flags.bw_turf = 'rustmouths';
    talk('d_bw_raid', b.g, b.q, ['Tonight.', 'It\'s your bridge. Your call.', '(…)']);
    expect(b.g.flags.bw_raid).toBe('lost');
  });

  it('a fourth crew under the mast, where the chain is split three ways', () => {
    const { g, q } = raidNight();
    g.flags.bw_turf = 'peace'; g.flags.bw_three_crews = true; g.pc.sheet.skillBought.speech = 90;
    talk('d_bw_raid', g, q, ['Tonight.', 'Walk them in under the mast', '(The booth.)', '(Go.)']);
    expect(g.flags.bw_raid).toBe('won');
    expect(g.flags.bw_raid_how).toBe('fourth');
  });

  it('alone: she goes on her own night; staying back loses it, unless the chain is soft and the booth empty', () => {
    const a = raidNight('alone');
    expect(a.g.world.quests.q_comp_wren.stage).toBe('alone');
    talk('d_bw_raid', a.g, a.q, ['(Stay back. It\'s her night.)', '(…)']);
    expect(a.g.flags.bw_raid).toBe('lost');
    const b = raidNight('alone');
    b.g.flags.bw_turf = 'gilt'; b.g.flags.vasha_dead = true;
    talk('d_bw_raid', b.g, b.q, ['(Stay back. It\'s her night.)', '(Go.)']);
    expect(b.g.flags.bw_raid).toBe('won');
    expect(b.g.world.quests.q_comp_wren.stage).toBe('walked');
    const c = raidNight('alone');
    c.g.pc.sheet.skillBought.stealth = 90;
    const r = talk('d_bw_raid', c.g, c.q, ['(Go after her.)']);
    expect(r.view()!.options.find((o) => o.text.startsWith('Along the parapet'))!.checkLabel).toBe('Stealth 75');   // +10 Vasha, +10 late
  });

  it('a hauler who raids the Rustmouths\' chain is struck off their bench', () => {
    const { g, q } = raidNight();
    apply([{ enlist: 'rustmouths', rank: 'runner' }], g, q);
    g.pc.sheet.skillBought.firearms = 90;
    talk('d_bw_raid', g, q, ['Tonight.', 'Over the chain, all at once.', '(The booth.)', '(Go.)', '(Go.)']);
    expect(g.world.membership.rustmouths?.status).toBe('expelled');
  });

  it('not tonight leaves it for another night; Kibet answers the raid either way', () => {
    const { g, q } = raidNight();
    talk('d_bw_raid', g, q, ['Not tonight.']);
    expect(g.flags.bw_raid).toBeUndefined();
    g.pc.sheet.skillBought.firearms = 90; g.flags.fenn_met = true;
    talk('d_bw_raid', g, q, ['Tonight.', 'Over the chain, all at once.', '(The booth.)', '(Go.)']);
    expect(view('d_bw_fenn', g, q).text).toContain('BACK');
    talk('d_bw_fenn', g, q, ['That\'s all.']);
    expect(g.flags.fenn_raid_said).toBe(true);
  });

  it('without any raid, Vasha can be walked up to at the booth at night', () => {
    const { g, q } = inCity('md_bridgeward', 1);
    g.flags.a2_spire_done = true;
    talk('d_rd_vasha', g, q, ['Who hired you?', 'Noted.', '(Wait until the Rustmouths have gone in', '(Lower your gun.) Go.', '(Go.)']);
    expect(g.world.knowledge.vasha_hired).toBe(true);
    expect(g.flags.vasha_cornered).toBe(true);
    expect(g.flags.vasha_fate).toBe('spared');
  });
});

// ---------------------------------------------------------------- Meridian end to end

describe('Meridian end to end: the gate, every district on the Loop, the date, the Spire', () => {
  it('plays from the face at the gate to the season closed', () => {
    const g = newGameState('c9', 0, 0);
    g.minutes = 32 * 1440 + 12 * 60;
    g.locationId = 'md_precinct';
    g.flags.ch1_done = true; g.flags.visited_md_precinct = true;
    g.pc.inventory.tolls = 100;
    addItem(g.pc.inventory, makeItem('k_photo'));
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_a2_precinct');

    // the gate: the lens knows the face, and the file admits on sight
    talk('d_md_gate', g, q, ['(Face the lens.)', 'What status?', 'Then admit me on sight.', '(Through.)']);
    apply(MAPS.md_precinct.triggers!.find((t) => t.id === 'inside')!.effects, g, q); q.update();
    expect(g.world.quests.q_a2_precinct.status).toBe('done');
    expect(g.world.quests.q_a2_calendar?.stage).toBe('back');

    // the date: the pencil on the back, the Wall's year
    talk('d_photo_read', g, q, ['(Turn it over.)', '(Put it away.)']);
    talk('d_md_wall_sign', g, q, ['(Leave it.)']);

    // the Loop, round every district it reaches, and out to the Ring
    const ride = (board: string, seat: string, to: string) => { talk(board, g, q, [seat]); g.locationId = to; };
    ride('d_md_loop', 'Old Market. (2 Tolls)', 'md_market');
    ride('d_mk_loop', 'Lantern Row. (2 Tolls)', 'md_lantern');
    ride('d_lr_loop', 'The Stacks. (3 Tolls)', 'md_stacks');
    ride('d_st_loop', 'Bridgeward. (3 Tolls)', 'md_bridgeward');
    apply(MAPS.md_bridgeward.triggers!.find((t) => t.id === 'arrive_loop')!.effects, g, q); q.update();
    expect(g.world.quests.q_bw_turf?.status).toBe('active');
    ride('d_bw_loop', 'Clover, outside the Wall. (4 Tolls)', 'md_ring');
    apply(MAPS.md_ring.triggers!.find((t) => t.id === 'arrive_loop')!.effects, g, q); q.update();
    expect(g.flags.md_ring_open).toBe(true);
    ride('d_dr_loop', 'The Precinct.', 'md_precinct');
    expect(g.pc.inventory.tolls).toBe(100 - 2 - 2 - 3 - 3 - 4 - 4);

    // the Spire close: the restoration board gives the date its R, and the beat opens
    g.locationId = 'md_spire'; g.flags.visited_md_spire = true;
    talk('d_ar_board', g, q, ['(Leave it.)']);
    expect(tryConclude(g, ['l_cal_pencil', 'l_cal_year', 'l_cal_r49'], CONCLUSIONS, q)?.id).toBe('c_cal_future');
    q.update();
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
    expect(g.world.quests.q_a2_spire?.stage).toBe('close');

    // up the stair on the file, the drawers and the docket, the hearing
    talk('d_ar_stair', g, q, ['(Face the lens on the post.)', '(Climb.)']);
    g.locationId = 'md_spire_top';
    talk('d_ar_reserves', g, q, ['(Drawer 9.)', '(Close the drawer.)', '(Leave them.)']);
    talk('d_ar_list', g, q, ['(Read on.)', '(Read on.)', '(Read on.)', '(Step back from the glass.)']);
    expect(g.world.quests.q_a2_spire.stage).toBe('summons');
    talk('d_ar_hearing', g, q, ['(Go in.)', '(Sit in the chair.)', '(Listen.)', 'Why me?', '(Go on.)', '(Answer it.)', 'No.']);
    expect(g.flags.ar_verdict).toBe('refused');
    expect(g.world.quests.q_a2_spire.status).toBe('done');
    expect(g.flags.a2_spire_done).toBe(true);

    // the season closed: the Sink's spring comes up the stair at dawn; Bridgeward's booth has its hand
    runWorldEvents(g, WORLD_EVENTS, q);
    g.minutes += 24 * 60;
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('sink_spring');
    expect(cond(placed('md_bridgeward', 'npc_rd_02_booth').if, g)).toBe(true);
    for (const id of ['q_a2_precinct', 'q_a2_calendar', 'q_a2_spire']) expect(g.world.quests[id].status).toBe('done');
  });
});
