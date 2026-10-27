import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { Rng } from '../src/engine/core/rng';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { addItem, countItem, makeItem } from '../src/engine/inventory/inventory';
import { QuestEngine } from '../src/engine/quest/quest';
import { hunt, trapYield } from '../src/engine/world/hunting';

function talk(id: string, g: ReturnType<typeof newGameState>, q: QuestEngine, picks: string[]): DialogueRunner {
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

function onRoad(hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 8 * 1440 + hour * 60;
  g.locationId = 'wild_track';
  const q = new QuestEngine(QUESTS, g);
  return { g, q };
}

describe('the road: what people on it say', () => {
  it('the patrol takes a pass, a packet, the rate, a bluff, or is caught skimming', () => {
    let s = onRoad();
    addItem(s.g.pc.inventory, makeItem('k_pass_stamped'));
    talk('d_re_patrol', s.g, s.q, ['(Show the stamped pass.)', '(Walk on.)']);
    expect(s.g.world.knowledge.patrol_met).toBe(true);
    s = onRoad(); s.g.pc.inventory.tolls = 5;
    talk('d_re_patrol', s.g, s.q, ['(Pay the rate. 5 Tolls)', '(Walk on.)']);
    expect(s.g.pc.inventory.tolls).toBe(0);
    s = onRoad(); s.g.pc.sheet.skillBought.speech = 90; s.g.pc.sheet.skillBought.barter = 90;
    talk('d_re_patrol', s.g, s.q, ['There\'s no receipts column', '(Walk on.)']);
    expect(s.g.flags.patrol_caught_skimming).toBe(true);
    s = onRoad(); s.g.flags.th_raid = true;
    const r = new DialogueRunner(DIALOGUES.d_re_patrol, s.g, s.q);
    expect(r.view()!.text).toContain('with the Dogs');
    expect(s.g.flags.re_patrol_hostile).toBe(true);
  });

  it('the drifter can be treated, watered, or robbed, and tells of the kite', () => {
    let s = onRoad();
    addItem(s.g.pc.inventory, makeItem('c_knitkit')); addItem(s.g.pc.inventory, makeItem('c_bandage'));
    talk('d_re_drifter', s.g, s.q, ['What happened to the leg?', 'Noted.', '(Treat the leg.', '(Walk on.)']);
    expect(s.g.flags.drifter_saved).toBe(true);
    expect(s.g.world.leads.l_kite_on_the_pan).toBeTruthy();
    expect(countItem(s.g.pc.inventory, 'w_machete')).toBe(1);
    s = onRoad();
    talk('d_re_drifter', s.g, s.q, ['(Take the machete and the pack.)', '(Walk on.)']);
    expect(s.g.flags.drifter_robbed).toBe(true);
    expect(s.g.world.news.some((n) => n.tag === 'robbed_drifter')).toBe(true);
  });

  it('the scouts want water, or a name, or are already afraid', () => {
    let s = onRoad();
    addItem(s.g.pc.inventory, makeItem('c_water'));
    talk('d_re_scouts', s.g, s.q, ['(Hand over a water.)', '(Walk on.)']);
    expect(countItem(s.g.pc.inventory, 'c_water')).toBe(0);
    s = onRoad(); s.g.world.knowledge.kessler_name = true; s.g.pc.sheet.skillBought.speech = 90;
    talk('d_re_scouts', s.g, s.q, ['Kessler knows my face.', '(Walk on.)']);
    expect(s.g.world.reputation.rust_dogs?.respect ?? 0).toBeGreaterThan(0);
    s = onRoad(); s.g.world.party.push('npc_rd_03');
    const r = new DialogueRunner(DIALOGUES.d_re_scouts, s.g, s.q);
    expect(r.view()!.text).toContain('Calloway');
  });

  it('the Wheel rider says where the Wheel is; the walker can be stopped; the carter can be fixed', () => {
    let s = onRoad();
    talk('d_re_wheel', s.g, s.q, ['The Wheel. Forty wagons.', 'Noted.', 'Where is the Wheel now?', 'Noted.', '(Leave him to his horses.)']);
    expect(s.g.world.knowledge.wheel_sefa).toBe(true);
    expect(s.g.world.leads.l_wheel_where).toBeTruthy();
    s = onRoad(23); s.g.pc.sheet.baseAttrs.brawn = 8; addItem(s.g.pc.inventory, makeItem('c_water'));
    talk('d_re_walker', s.g, s.q, ['Where are you going?', '(Stop him.)', '(Water. Slowly.)', '(Walk on.)']);
    expect(s.g.flags.re_walker_helped).toBe(true);
    expect(s.g.world.leads.l_walker_warning).toBeTruthy();
    s = onRoad(); s.g.pc.sheet.skillBought.mechanics = 90;
    talk('d_re_caravan', s.g, s.q, ['(Get under and look at the axle.)', '(Walk on.)']);
    expect(s.g.pc.inventory.tolls).toBe(10);
    expect(countItem(s.g.pc.inventory, 'c_water')).toBe(2);
  });
});

describe('the windpump graveyard', () => {
  it('Marit tells of the pumps, the Wheel and the kite, which puts the wreck on the map', () => {
    const s = onRoad(); s.g.locationId = 'windpumps';
    s.g.world.knowledge.wheel_tracks = true; s.g.world.knowledge.drifter_kite = true;
    talk('d_wp_marit', s.g, s.q, ['What killed the pumps?', 'Noted.', 'The ruts going east.', 'Noted.', 'A drifter said a kite', 'Noted.', 'That\'s all.']);
    expect(s.g.world.knowledge.wp_pumps_locked).toBe(true);
    expect(s.g.world.knowledge.wheel_sefa).toBe(true);
    expect(s.g.world.knowledge.loc_lm_sallow_01).toBe(true);
  });

  it('the valve house ties the field to the network, and a mechanic can free the pumps', () => {
    const s = onRoad(); s.g.locationId = 'windpumps';
    s.g.pc.sheet.skillBought.science = 90; s.g.pc.sheet.skillBought.mechanics = 90;
    talk('d_wp_valvehouse', s.g, s.q, ['(Release the brakes by hand.)', '(Step back.)']);
    expect(s.g.world.knowledge.wp_same_network).toBe(true);
    expect(s.g.flags.wp_pumps_freed).toBe(true);
    expect(s.g.world.news.some((n) => n.tag === 'windpumps_turn')).toBe(true);
  });
});

describe('hunting and trapping', () => {
  it('a hunt needs Survival, pays more at dawn, and traps yield over days', () => {
    const g = newGameState('c9', 0, 0);
    g.pc.sheet.skillBought.survival = 0;
    for (const k of Object.keys(g.pc.sheet.baseAttrs) as (keyof typeof g.pc.sheet.baseAttrs)[]) g.pc.sheet.baseAttrs[k] = 1;
    expect(hunt(g.pc.sheet, 0.6, new Rng(1), 12).meat).toBe(0);
    g.pc.sheet.skillBought.survival = 90;
    const r = hunt(g.pc.sheet, 0.6, new Rng(1), 6);
    expect(r.meat).toBeGreaterThanOrEqual(2);
    expect(r.hours).toBe(3);
    const line = { mapId: 'windpumps', setAt: 0, count: 2 };
    expect(trapYield(line, 60 * 5, 0.6, g.pc.sheet)).toBe(0);
    expect(trapYield(line, 60 * 30, 0.6, g.pc.sheet)).toBeGreaterThan(0);
    expect(trapYield(line, 60 * 200, 0.6, g.pc.sheet)).toBeLessThanOrEqual(4);
  });
});
