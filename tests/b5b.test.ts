import { describe, expect, it } from 'vitest';
import { DIALOGUES, MAPS, NPCS, QUESTS, ROAD_ENCOUNTERS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { SITES } from '../src/content/world/sites';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { eligibleEncounters } from '../src/engine/world/roads';
import { fastTravel } from '../src/engine/world/travel';
import { apply, test as cond } from '../src/engine/world/logic';
import { CONCLUSIONS } from '../src/content/world/leads';

/**
 * B5b — the Drowned Shore: Gull Stilts, the Rigs, Blackcap and the dike road. Oil on the Water by every way it ends (the
 * guild before the Stilt Court, the price, the Rig taken by word or by force, the sea, the barge burned, the tank shared),
 * the man the sea took (living, sold, written, quiet), the false light (stopped, exposed, the court, framed), the dives by
 * band, the press on the dike. Played headless.
 */

type G = ReturnType<typeof newGameState>;
const TAMSIN = 'npc_c9_03';
const WREN = 'npc_rd_03';
const ASH = 'npc_of_03';
const NINE = 'npc_md_nine';

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
const count = (g: G, item: string) => g.pc.inventory.items.filter((i) => i.def === item).reduce((t, i) => t + i.qty, 0);
const stage = (g: G, quest: string) => g.world.quests[quest]?.stage;
const status = (g: G, quest: string) => g.world.quests[quest]?.status;
function hour(g: G, h: number): void {
  let t = Math.floor(g.minutes / 1440) * 1440 + h * 60;
  if (t <= g.minutes) t += 1440;
  g.minutes = t;
}
/** Arm the events that wait for an hour, then go to that hour and run them. */
function at(g: G, q: QuestEngine, h: number, map = 'ds_stilts'): string[] {
  g.locationId = map;
  runWorldEvents(g, WORLD_EVENTS, q);
  hour(g, h);
  const fired = runWorldEvents(g, WORLD_EVENTS, q);
  q.update();
  return fired;
}
const kill = (g: G, key: string) => { (g.npcs as Record<string, unknown>)[key] = { dead: true }; };

function onShore(h = 10) {
  const g = newGameState('ds_stilts', 0, 0);
  g.minutes = 120 * 1440 + h * 60;
  g.locationId = 'ds_stilts';
  g.flags.ch1_done = true;
  g.pc.inventory.tolls = 600;
  const q = new QuestEngine(QUESTS, g);
  apply(trigger('ds_stilts', 'arrive').effects, g, q);
  q.update();
  return { g, q };
}
/** The burial and the keeper: Lua at the Ebb Steps, Oona on the Greta. */
function meet(g: G, q: QuestEngine) {
  apply(trigger('ds_stilts', 'ebb').effects, g, q);
  talk('d_ds_lua', g, q, ['I\'ll find out what happened.']);
  talk('d_ds_oona', g, q, ['What does the court need to hear?']);
}
/** Kai's net from under the Gut at slack water. */
function net(g: G, q: QuestEngine) {
  hour(g, 16);
  skills(g, { survival: 60 });
  talk('d_ds_dive', g, q, ['(Kai\'s net.']);
}
/** Out to Hum: the board, down the leg, the valve and its seal. */
function hum(g: G, q: QuestEngine) {
  g.locationId = 'ds_rigs';
  apply(trigger('ds_rigs', 'arrive').effects, g, q);
  talk('d_ds_board', g, q, ['(Read the pressure log']);
  q.update();
  g.locationId = 'ds_rig_leg';
  talk('d_ds_valve', g, q, ['(Cut the seal off']);
  q.update();
}
/** Call the court on Lua's claim and lay out what the player has. */
function court(g: G, q: QuestEngine, evidence: string[], argue: string, after: string[] = []) {
  g.locationId = 'ds_stilts';
  talk('d_ds_oona', g, q, ['I\'m ready. Call the court', '(The turn of the tide.)', ...evidence.flatMap((e) => [e, '(Go on.)']), argue, ...after]);
}

// ---------------------------------------------------------------- the place

describe('B5b: the Drowned Shore as a place', () => {
  it('binds Gull Stilts, the Rigs and Blackcap to their maps, settlements and sites in the one world', () => {
    expect(WORLD_MAP.locations.hamlet_shore).toMatchObject({ settlement: 'hamlet_shore', map: 'ds_stilts', region: 'drowned_shore' });
    expect(WORLD_MAP.locations.rigs).toMatchObject({ settlement: 'rigs', map: 'ds_rigs', region: 'drowned_shore' });
    expect(WORLD_MAP.locations.lm_shore_01).toMatchObject({ map: 'ds_terminal', hidden: true, region: 'drowned_shore' });
    expect(SETTLEMENTS.hamlet_shore).toMatchObject({ type: 'stilt_village', region: 'drowned_shore' });
    expect(SETTLEMENTS.meridian.roads.hamlet_shore).toBe(SETTLEMENTS.hamlet_shore.roads.meridian);
    expect(SETTLEMENTS.rigs.roads.hamlet_shore).toBe(SETTLEMENTS.hamlet_shore.roads.rigs);
    expect(SITES.ds_stilts).toMatchObject({ kind: 'open', at: 'hamlet_shore' });
    expect(SITES.ds_rigs).toMatchObject({ kind: 'open', at: 'rigs' });
    expect(SITES.ds_terminal).toMatchObject({ kind: 'open', at: 'lm_shore_01' });
    expect(SITES.ds_rig_leg.kind).toBe('cell');
    expect(SITES.ds_wade.kind).toBe('cell');
    for (const s of ['start', 'from_meridian', 'from_rigs', 'from_lm_shore_01', 'jetty', 'seawall', 'loft']) expect(MAPS.ds_stilts.spawns.some((x) => x.id === s)).toBe(true);
    for (const s of ['from_hamlet_shore', 'from_meridian', 'landing', 'hatch']) expect(MAPS.ds_rigs.spawns.some((x) => x.id === s)).toBe(true);
  });

  it('the tide boat is fast travel: Meridian to the Rigs by the network alone, by way of the Stilts', () => {
    const net = WORLD_MAP.networks.net_tide;
    expect(net.stops).toEqual(['meridian', 'hamlet_shore', 'rigs']);
    const trip = fastTravel(WORLD_MAP, 'meridian', 'rigs', { modes: [], networks: ['net_tide'], known: () => true, hour: 5 })!;
    expect(trip.fast).toBe(true);
    expect(trip.legs.map((l) => l.to)).toEqual(['hamlet_shore', 'rigs']);
  });

  it('every node in the shore\'s trees has a line for coming back to it (U7), or only leaves', () => {
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!id.startsWith('d_ds_') && !id.startsWith('d_re_ds_')) continue;
      for (const [nid, n] of Object.entries(d.nodes)) {
        if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
      }
    }
  });

  it('every boat, ladder and wall walk on the shore lands on a map and spawn that exist', () => {
    const gotos: { from: string; location: string; spawn: string }[] = [];
    const walk = (from: string, x: unknown): void => {
      if (!x || typeof x !== 'object') return;
      if (Array.isArray(x)) { x.forEach((v) => walk(from, v)); return; }
      const o = x as Record<string, unknown>;
      if (o.event === 'goto') { const d = o.data as { location: string; spawn: string }; gotos.push({ from, ...d }); }
      for (const v of Object.values(o)) walk(from, v);
    };
    for (const [id, d] of Object.entries(DIALOGUES)) if (id.startsWith('d_ds_')) walk(id, d);
    expect(gotos.length).toBeGreaterThanOrEqual(8);
    for (const g of gotos) expect(MAPS[g.location]?.spawns.some((s) => s.id === g.spawn), `${g.from} → ${g.location}/${g.spawn}`).toBe(true);
  });

  it('the cast: women narrow, men broad, kin listed, no religious headwear, and the guild\'s men turn only at the barge', () => {
    const shore = Object.values(NPCS).filter((n) => n.id.startsWith('npc_ds_'));
    expect(shore.length).toBeGreaterThanOrEqual(20);
    for (const n of shore) expect(n.look.frame, n.id).toBeDefined();
    expect(NPCS.npc_ds_01.look.frame).toBe('narrow');
    expect(NPCS.npc_ds_10.look.frame).toBe('broad');
    const g = newGameState('ds_terminal', 0, 0);
    expect(cond(NPCS.npc_ds_g1.hostileIf, g)).toBe(false);
    g.flags.ds_barge_fight = true;
    expect(cond(NPCS.npc_ds_g1.hostileIf, g)).toBe(true);
  });

  it('the dike road: the shore\'s encounters roll on its legs; the press waits until the player has seen the Stilts', () => {
    const g = newGameState('md_precinct', 0, 0);
    g.minutes = 10 * 1440 + 23 * 60;
    const leg = { from: 'meridian', to: 'hamlet_shore', by: 'foot' as const, hours: 20, fare: 0, risk: 1 };
    const ids = eligibleEncounters(g, WORLD_MAP, leg, ROAD_ENCOUNTERS).map((e) => e.id);
    expect(ids).toContain('re_ds_fog');
    expect(ids).toContain('re_ds_tide');
    expect(ids).not.toContain('re_ds_press');
    g.world.knowledge.seen_stilts = true;
    expect(eligibleEncounters(g, WORLD_MAP, leg, ROAD_ENCOUNTERS).map((e) => e.id)).toContain('re_ds_press');
    expect(ROAD_ENCOUNTERS.re_ds_press.map).toBe('ds_wade');
  });

  it('arriving starts the shore\'s line; the burial and the Book\'s keeper move it to the claim', () => {
    const { g, q } = onShore();
    expect(stage(g, 'q_ds_sheen')).toBe('burial');
    expect(cond(placed('ds_stilts', 'npc_ds_02_ebb').if, g)).toBe(true);
    meet(g, q);
    expect(stage(g, 'q_ds_sheen')).toBe('claim');
    expect(cond(placed('ds_stilts', 'npc_ds_02_ebb').if, g)).toBe(false);
    expect(cond(placed('ds_stilts', 'npc_ds_02').if, g)).toBe(true);
  });

  it('the Stilts\' companions speak where they would: Tamsin sees the sea on the Greta', () => {
    const { g, q } = onShore();
    g.world.party.push(TAMSIN);
    const ij = DIALOGUES.d_ds_oona.nodes.intro.interject!;
    expect(ij.some((i) => i.companion === TAMSIN && String(i.text).includes('sky lying down'))).toBe(true);
    expect(view('d_ds_oona', g, q).text).toContain('Oona Brack');
  });
});

// ---------------------------------------------------------------- Oil on the Water

describe('Oil on the Water: the investigation', () => {
  it('Kai\'s net under the Gut at slack water: the joint, and the oil, not the sea', () => {
    const { g, q } = onShore();
    meet(g, q);
    talk('d_ds_lua', g, q, ['Where was your net?']);
    hour(g, 12);
    expect(view('d_ds_dive', g, q).text).toContain('Not on this tide');
    net(g, q);
    expect(has(g, 'k_ds_net')).toBe(true);
    expect(g.world.knowledge.ds_joint).toBe(true);
    expect(tryConclude(g, ['l_ds_kai', 'l_ds_joint'], CONCLUSIONS)?.id).toBe('c_ds_kai');
  });

  it('Hum\'s board and the leg: the line reads open, and the guild\'s seal is on the valve', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    expect(stage(g, 'q_ds_sheen')).toBe('seal');
    expect(has(g, 'k_ds_seal')).toBe(true);
    expect(g.world.knowledge.ds_pressure).toBe(true);
    expect(g.world.leads.l_ds_seal).toBe(true);
  });

  it('with Kes along, Hum\'s board prints who turned the valve', () => {
    const { g, q } = onShore();
    const ij = DIALOGUES.d_ds_board.nodes.board.interject!;
    expect(ij.some((i) => i.companion === 'npc_hs_01' && (i.effects ?? []).some((e) => 'learn' in e && e.learn === 'ds_manual'))).toBe(true);
    skills(g, { science: 60 });
    talk('d_ds_board', g, q, ['(Find the event log.)']);
    expect(g.world.knowledge.ds_manual).toBe(true);
  });

  it('the guild line on the board: the seal, the night barge and the pressure', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    talk('d_ds_mele', g, q, ['Who goes out at night?']);
    expect(tryConclude(g, ['l_ds_seal', 'l_ds_barge', 'l_ds_pressure'], CONCLUSIONS)?.id).toBe('c_ds_guild_line');
  });

  it('the factor\'s offer: a hundred and fifty for a widow\'s grief to find the sea', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    talk('d_ds_thorne', g, q, ['That\'s all.']);
    g.flags.rc_line = 'guild';
    expect(new DialogueRunner(DIALOGUES.d_ds_thorne, g, q).view()!.options.some((o) => o.text.startsWith('I know what'))).toBe(true);
    talk('d_ds_thorne', g, q, ['I know what\'s in your barge', '(Take the purse.)']);
    expect(g.flags.ds_thorne_paid).toBe(true);
    expect(g.world.approval[WREN]).toBe(-10);
  });
});

describe('Oil on the Water: every way it ends', () => {
  it('the guild before the Stilt Court with the seal and the net: the barge burned for Kai, the post gone, the valve shut', () => {
    const { g, q } = onShore();
    meet(g, q);
    talk('d_ds_lua', g, q, ['Where was your net?']);
    net(g, q);
    hum(g, q);
    skills(g, { speech: 40 });
    talk('d_ds_book', g, q, ['(The anchorage.)']);
    talk('d_ds_oona', g, q, ['The guild\'s anchorage']);
    court(g, q, ['(Lay Kai\'s net', '(Lay the guild\'s seal'], 'The guild opened', ['The guild\'s barge at Blackcap.']);
    expect(g.flags.ds_claim).toBe('guild');
    expect(g.flags.ds_barge).toBe('pyre');
    expect(g.flags.ds_post).toBe('gone');
    expect(g.flags.ds_valve).toBe('shut');
    expect(g.flags.ds_rig).toBe('crew');
    expect(g.flags.ds_rig_leave).toBe(true);
    expect(g.flags.ds_boats_owed).toBe(true);
    expect(stage(g, 'q_ds_sheen')).toBe('ruled_guild');
    expect(status(g, 'q_ds_sheen')).toBe('done');
    expect(cond(placed('ds_stilts', 'npc_ds_04').if, g)).toBe(false);   // the tide post has cast off
    expect(view('d_ds_ebb', g, q).text).toContain('burned barge');
    expect(view('d_ds_lua', g, q).text).toContain('Kai\'s boat');
  });

  it('a story without what the water knows is adjourned, not lost; the court sits again', () => {
    const { g, q } = onShore();
    meet(g, q);
    skills(g, { speech: 0 });
    court(g, q, [], 'The guild opened');
    expect(g.flags.ds_claim).toBeUndefined();
    expect(g.flags.ds_adjourned).toBe(1);
    hum(g, q);
    skills(g, { speech: 60 });
    court(g, q, ['(Lay the guild\'s seal'], 'The guild opened', ['Let Lua say.', '(Let it stand.)']);
    expect(g.flags.ds_claim).toBe('guild');
  });

  it('the price, brokered: the guild pays the widows and keeps its post, humbled; nobody fights', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    skills(g, { speech: 60, barter: 60 });
    talk('d_ds_sunhee', g, q, ['Have you seen anyone', 'Will you say that']);
    expect(g.flags.ds_sunhee_word).toBe(true);
    skills(g, { speech: 60, barter: 60 });
    court(g, q, ['(Lay the guild\'s seal', '(Call Sun-hee Park'], 'The guild opened', ['The price of the barge']);
    expect(g.flags.ds_claim).toBe('guild');
    expect(g.flags.ds_claim_how).toBe('price');
    expect(g.flags.ds_post).toBe('stays');
    expect(g.flags.ds_barge).toBe('kept');
    expect(cond(placed('ds_stilts', 'npc_ds_04').if, g)).toBe(true);
  });

  it('the tally from the post\'s box and the guild\'s diver: proof without going under the sea', () => {
    const { g, q } = onShore();
    meet(g, q);
    apply([{ give: 'k_ds_tally' }], g, q);   // the tide post's box, Security 45 at night
    talk('d_ds_tally', g, q, ['(BLACKCAP']);
    expect(g.world.knowledge.ds_two_for_one).toBe(true);
    skills(g, { speech: 80 });
    talk('d_ds_marek', g, q, ['That\'s all.']);
    talk('d_ds_marek', g, q, ['You went down Hum\'s leg']);
    expect(g.flags.ds_marek_word).toBe(true);
    court(g, q, ['(Put the tide post\'s tally', '(Call Marek Zielinski'], 'The guild opened', ['The guild\'s barge at Blackcap.']);
    expect(g.flags.ds_claim).toBe('guild');
    expect(g.flags.ds_valve).toBe('shut');   // Hum's divers close the line once the seal is off it
  });

  it('the Rig blamed: the court gives Hum to the Stilts, and Hamid takes his crew away before the boats come', () => {
    const { g, q } = onShore();
    meet(g, q);
    talk('d_ds_lua', g, q, ['Where was your net?']);
    net(g, q);
    court(g, q, [], 'It was the Rig. Hum\'s line weeps');
    expect(g.flags.ds_claim).toBe('rig');
    expect(stage(g, 'q_ds_sheen')).toBe('taking');
    g.locationId = 'ds_rigs';
    skills(g, { speech: 80 });
    talk('d_ds_hamid', g, q, ['Take your crew and go']);
    expect(g.flags.ds_hamid).toBe('left');
    expect(g.flags.ds_rig).toBe('stilts');
    expect(stage(g, 'q_ds_sheen')).toBe('ruled_rig');
    expect(cond(placed('ds_rigs', 'npc_ds_10').if, g)).toBe(false);
  });

  it('the Rig blamed and Hamid will not go: the Stilts take her by force, and he dies on his deck', () => {
    const { g, q } = onShore();
    meet(g, q);
    talk('d_ds_lua', g, q, ['Where was your net?']);
    net(g, q);
    court(g, q, [], 'It was the Rig. Hum\'s line weeps');
    g.locationId = 'ds_rigs';
    skills(g, { speech: 0 });
    talk('d_ds_hamid', g, q, ['Take your crew and go', '(Then the Stilts will take her.']);
    expect(g.flags.ds_rig_fight).toBe(true);
    expect(cond(NPCS.npc_ds_10.hostileIf, g)).toBe(true);
    kill(g, 'ds_rigs/npc_ds_10');
    q.update();
    expect(stage(g, 'q_ds_sheen')).toBe('ruled_rig_blood');
    expect(g.flags.ds_hamid).toBe('dead');
    expect(g.flags.ds_rig).toBe('stilts');
  });

  it('the sea: the factor\'s money, the claim dismissed, Lua gone, and the guild reopens a line the player had shut', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    skills(g, { mechanics: 60 });
    talk('d_ds_valve', g, q, ['(Turn the wheel shut.)']);
    expect(g.flags.ds_valve).toBe('shut');
    talk('d_ds_thorne', g, q, ['That\'s all.']);
    talk('d_ds_thorne', g, q, ['I know what\'s in your barge', '(Take the purse.)']);
    court(g, q, [], 'The sea took him.', ['(Leave the Greta.)']);
    expect(g.flags.ds_claim).toBe('sea');
    expect(g.flags.ds_lua_gone).toBe(true);
    expect(g.flags.ds_rig).toBe('guild');
    expect(g.flags.ds_valve).toBe('open');
    expect(stage(g, 'q_ds_sheen')).toBe('ruled_sea');
    expect(cond(placed('ds_stilts', 'npc_ds_02').if, g)).toBe(false);
  });

  it('the night barge at Blackcap: the fight, the fire, and the factor gone from the shore at dawn', () => {
    const { g, q } = onShore();
    g.locationId = 'ds_terminal';
    hour(g, 23);
    expect(cond(placed('ds_terminal', 'npc_ds_g1').if, g)).toBe(true);
    talk('d_ds_barge', g, q, ['(Come at the barge.)']);
    expect(g.flags.ds_barge_fight).toBe(true);
    kill(g, 'ds_terminal/npc_ds_g1');
    talk('d_ds_barge', g, q, ['(Fire the barge.)']);
    expect(g.flags.ds_barge).toBe('burned');
    expect(at(g, q, 6)).toContain('ds_thorne_flees');
    expect(g.flags.ds_thorne).toBe('fled');
    expect(g.flags.ds_post).toBe('gone');
    expect(cond(placed('ds_stilts', 'npc_ds_04').if, g)).toBe(false);
  });

  it('a burned barge before the court: the Book writes it down as Kai\'s boat; the factor\'s bench is empty', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    g.flags.ds_barge = 'burned'; g.flags.ds_thorne = 'fled'; g.flags.ds_post = 'gone';
    skills(g, { speech: 60 });
    const r = talk('d_ds_oona', g, q, ['I\'m ready. Call the court', '(The turn of the tide.)']);
    expect(r.view()!.text).toContain('empty bench');
    const ruling = talk('d_ds_oona', g, q, ['I\'m ready. Call the court', '(The turn of the tide.)', '(Lay the guild\'s seal', '(Go on.)', 'The guild opened']);
    const boats = ruling.view()!.options.map((o) => o.text);
    expect(boats.some((o) => o.startsWith('The price'))).toBe(false);
    expect(boats.some((o) => o.startsWith('Let Lua say'))).toBe(false);
    ruling.choose(ruling.view()!.options.find((o) => o.text.startsWith('The guild\'s barge is already'))!.id);
    q.update();
    expect(g.flags.ds_claim).toBe('guild');
    expect(g.flags.ds_claim_how).toBe('burned');
    expect(g.flags.ds_valve).toBe('shut');
    expect(view('d_ds_lua', g, q).text).toContain('burned at Blackcap');
  });

  it('the sleeve and the terms: the line runs clean and Blackcap is the Stilts\' and Hum\'s, half each', () => {
    const { g, q } = onShore();
    meet(g, q);
    hum(g, q);
    g.locationId = 'ds_rigs';
    talk('d_ds_leila', g, q, ['That\'s all.']);
    talk('d_ds_leila', g, q, ['If the old line to Blackcap stays open']);
    expect(has(g, 'k_ds_sleeve')).toBe(true);
    g.locationId = 'ds_rig_leg';
    skills(g, { mechanics: 70, speech: 70 });
    talk('d_ds_valve', g, q, ['(Fit Leila\'s sleeve']);
    expect(g.flags.ds_valve).toBe('sleeved');
    court(g, q, ['(Lay the guild\'s seal'], 'The guild opened', ['The guild\'s barge at Blackcap.']);
    expect(g.flags.ds_valve).toBe('sleeved');
    g.locationId = 'ds_rigs';
    talk('d_ds_hamid', g, q, ['That\'s all.']);
    talk('d_ds_hamid', g, q, ['Blackcap\'s line is sleeved', 'Then shake on it']);
    expect(g.flags.ds_hamid_terms).toBe(true);
    expect(g.flags.ds_rig).toBe('crew');
    g.locationId = 'ds_stilts';
    talk('d_ds_oona', g, q, ['Blackcap\'s line is sleeved', 'It\'s the only thing out here']);
    expect(g.flags.ds_rig).toBe('shared');
  });

  it('a closed line brings the fish back: the next dawn in the village, and the nets come up clean', () => {
    const { g, q } = onShore();
    hum(g, q);
    skills(g, { mechanics: 60, survival: 60 });
    talk('d_ds_valve', g, q, ['(Turn the wheel shut.)']);
    expect(at(g, q, 5)).toContain('ds_fish_back');
    expect(g.flags.ds_fish_back).toBe(true);
    hour(g, 5);
    const before = count(g, 'c_smoked_fish');
    talk('d_ds_nets', g, q, ['(Go out with the nets.)']);
    expect(count(g, 'c_smoked_fish') - before).toBe(3);
  });
});

// ---------------------------------------------------------------- Stilt Court

function mateo(g: G, q: QuestEngine) {
  talk('d_ds_oona', g, q, ['That\'s all.']);
  expect(at(g, q, 9)).toContain('ds_mateo_back');
  expect(stage(g, 'q_ds_court')).toBe('back');
  expect(cond(placed('ds_stilts', 'npc_ds_05').if, g)).toBe(true);
  talk('d_ds_mateo', g, q, ['Where have you been?']);
  talk('d_ds_mateo', g, q, ['Stand up on the Greta']);
}

describe('Stilt Court: the man the sea took', () => {
  it('he walks in at nine the first morning the player is in the village after meeting the Book\'s keeper', () => {
    const { g, q } = onShore();
    mateo(g, q);
    expect(stage(g, 'q_ds_court')).toBe('book');
    expect(g.world.knowledge.ds_brand).toBe(true);
    expect(g.flags.ds_mateo_heard).toBe(true);
  });

  it('living: the brand, the oars and Nine\'s word; a new page, and Paz, not knowing, stays with the finder', () => {
    const { g, q } = onShore();
    mateo(g, q);
    talk('d_ds_mele', g, q, ['That\'s all.']);
    talk('d_ds_mele', g, q, ['You found the Curlew adrift']);
    g.world.party.push(NINE);
    skills(g, { speech: 40 });
    talk('d_ds_oona', g, q, ['Call the court for Mateo', '(The turn of the tide.)', '(Show the court the brand', '(Go on.)', '(Ask Mele Tui', '(Go on.)', 'The water gave him back.', '(Wait for her.)']);
    expect(g.flags.ds_court).toBe('living');
    expect(g.flags.ds_prec_living).toBe(true);
    expect(g.flags.ds_paz).toBe('rui');
    expect(stage(g, 'q_ds_court')).toBe('living');
    expect(cond(placed('ds_stilts', 'npc_ds_05_curlew').if, g)).toBe(true);
    expect(g.world.approval[NINE]).toBe(5);
    expect(view('d_ds_book', g, q).options.some((o) => o.text === '(The drowned.)')).toBe(true);
  });

  it('the city\'s precedent travels: a Court of Accounts ruling that the record yields to the living helps on the Greta', () => {
    const { g, q } = onShore();
    g.flags.prec_unrecorded = 'yields';
    mateo(g, q);
    skills(g, { speech: 25 });
    expect(view('d_ds_mateo', g, q).text).toBeDefined();
    talk('d_ds_oona', g, q, ['Call the court for Mateo', '(The turn of the tide.)', '(Show the court the brand', '(Go on.)', 'The water gave him back.', '(Wait for her.)']);
    expect(g.flags.ds_court).toBe('living');
  });

  it('sold: the guild\'s collections in the factor\'s day-book; the finder put off the stilts', () => {
    const { g, q } = onShore();
    mateo(g, q);
    apply([{ give: 'k_ds_tally' }], g, q);
    talk('d_ds_tally', g, q, ['(The pages headed COLLECTIONS.)']);
    expect(stage(g, 'q_ds_court')).toBe('turn');
    talk('d_ds_oona', g, q, ['Call the court for Mateo', '(The turn of the tide.)', 'He never went in the water.']);
    expect(g.flags.ds_court).toBe('sold');
    expect(g.flags.ds_rui).toBe('put_off');
    expect(g.flags.ds_paz).toBe('alone');
    expect(cond(placed('ds_stilts', 'npc_ds_07').if, g)).toBe(false);
    expect(status(g, 'q_ds_court')).toBe('done');
  });

  it('the finder says it himself, and Paz is told; at the court she chooses neither', () => {
    const { g, q } = onShore();
    mateo(g, q);
    skills(g, { speech: 70 });
    talk('d_ds_rui', g, q, ['That\'s all.']);
    talk('d_ds_rui', g, q, ['You told the guild\'s press']);
    expect(g.flags.ds_rui_confessed).toBe(true);
    talk('d_ds_paz', g, q, ['That\'s all.']);
    talk('d_ds_paz', g, q, ['Rui told the guild\'s press']);
    expect(g.flags.ds_paz_knows).toBe(true);
    talk('d_ds_oona', g, q, ['Call the court for Mateo', '(The turn of the tide.)', 'The water gave him back.', '(Wait for her.)']);
    expect(g.flags.ds_court).toBe('living');
    expect(g.flags.ds_paz).toBe('alone');
  });

  it('written: page twelve stands; Mateo goes out to Hum\'s crew', () => {
    const { g, q } = onShore();
    mateo(g, q);
    talk('d_ds_oona', g, q, ['Call the court for Mateo', '(The turn of the tide.)', 'The Book is the Book.']);
    expect(g.flags.ds_court).toBe('written');
    expect(cond(placed('ds_rigs', 'npc_ds_05_rig').if, g)).toBe(true);
    expect(cond(placed('ds_stilts', 'npc_ds_05').if, g)).toBe(false);
  });

  it('quiet: a bought skiff up the delta, and Paz never knows', () => {
    const { g, q } = onShore();
    mateo(g, q);
    talk('d_ds_mateo', g, q, ['Take a boat and go']);
    expect(g.flags.ds_court).toBe('quiet');
    expect(stage(g, 'q_ds_court')).toBe('quiet');
    expect(g.flags.ds_paz_knows).toBeUndefined();
  });
});

// ---------------------------------------------------------------- False Light

function wreckers(g: G, q: QuestEngine) {
  apply(trigger('ds_stilts', 'jesty').effects, g, q);
  q.update();
  expect(stage(g, 'q_ds_light')).toBe('wreck');
  g.locationId = 'ds_rigs';
  talk('d_ds_ewan', g, q, ['Mostly?']);
  g.locationId = 'ds_stilts';
  skills(g, { survival: 60 });
  talk('d_ds_jesty', g, q, ['(Search the parapet.)']);
  talk('d_ds_book', g, q, ['(The wrecks.)']);
  expect(tryConclude(g, ['l_ds_wrecks', 'l_ds_lamp_cut', 'l_ds_soot'], CONCLUSIONS)?.id).toBe('c_ds_false_light');
  talk('d_ds_yewande', g, q, ['That\'s all.']);
  talk('d_ds_yewande', g, q, ['You put out Lean\'s light']);
  q.update();
  expect(g.world.knowledge.ds_coker_wrecker).toBe(true);
  expect(stage(g, 'q_ds_light')).toBe('turn');
}

describe('False Light: who judges the wreckers', () => {
  it('stopped: once the line is shut, she drops the lamp into Ellery', () => {
    const { g, q } = onShore();
    wreckers(g, q);
    skills(g, { speech: 30 });
    g.flags.ds_valve = 'shut';
    talk('d_ds_yewande', g, q, ['Stop it. Nobody needs to know.']);
    expect(g.flags.ds_light).toBe('stopped');
    expect(stage(g, 'q_ds_light')).toBe('stopped');
  });

  it('exposed: a hundred from the factor; the guild hangs her at dawn and Ade runs the stage', () => {
    const { g, q } = onShore();
    wreckers(g, q);
    talk('d_ds_thorne', g, q, ['That\'s all.']);
    talk('d_ds_thorne', g, q, ['Your wrecker is Yewande Coker', '(Take the hundred.)']);
    expect(g.flags.ds_light).toBe('exposed');
    expect(at(g, q, 6)).toContain('ds_coker_hangs');
    expect(g.flags.ds_coker_dead).toBe(true);
    expect(cond(placed('ds_stilts', 'npc_ds_03').if, g)).toBe(false);
    hour(g, 16);
    expect(view('d_ds_dive', g, q).text).toContain('Ade Bankole');
  });

  it('the court: argued for her, the Stilts take her boat and keep her lungs; the guild gets no hanging', () => {
    const { g, q } = onShore();
    wreckers(g, q);
    skills(g, { speech: 50 });
    talk('d_ds_oona', g, q, ['That\'s all.']);
    talk('d_ds_oona', g, q, ['The salt barge on the Jesty', 'Yewande Coker.', 'The guild\'s line killed the fish']);
    expect(g.flags.ds_light).toBe('court');
    expect(g.flags.ds_sow_taken).toBe(true);
    expect(g.flags.ds_coker_off).toBeUndefined();
    expect(stage(g, 'q_ds_light')).toBe('court');
  });

  it('framed: the lamp-keeper hanged for wrecks he did not cause, and every companion knows it', () => {
    const { g, q } = onShore();
    wreckers(g, q);
    talk('d_ds_thorne', g, q, ['That\'s all.']);
    talk('d_ds_thorne', g, q, ['Your wrecker is Ewan Tulloch', '(Take the hundred.)']);
    expect(g.flags.ds_light).toBe('framed');
    expect(g.world.approval[TAMSIN]).toBe(-20);
    expect(g.world.approval[ASH]).toBe(-20);
    expect(at(g, q, 6)).toContain('ds_ewan_hangs');
    expect(cond(placed('ds_rigs', 'npc_ds_12').if, g)).toBe(false);
    expect(view('d_ds_yewande', g, q).text).toContain('Ewan Tulloch');
  });
});

// ---------------------------------------------------------------- the dives

describe('Diving Ellery: a repeatable activity, banded, scarce early', () => {
  it('slack water only; the roofs give three finds in order and then thin; each dive costs the hose', () => {
    const { g, q } = onShore();
    talk('d_ds_yewande', g, q, ['That\'s all.']);
    expect(stage(g, 'q_ds_dives')).toBe('first');
    hour(g, 10);
    expect(view('d_ds_dive', g, q).text).toContain('Not on this tide');
    skills(g, { survival: 40 });
    const t0 = g.pc.inventory.tolls;
    hour(g, 4);
    talk('d_ds_dive', g, q, ['(The roofs of Ellery.)']);
    expect(has(g, 'c_tin')).toBe(true);
    expect(g.pc.inventory.tolls).toBe(t0 - 6);
    expect(stage(g, 'q_ds_dives')).toBe('more');
    hour(g, 16); talk('d_ds_dive', g, q, ['(The roofs of Ellery.)']);
    expect(count(g, 'j_glass')).toBe(2);
    hour(g, 4); talk('d_ds_dive', g, q, ['(The roofs of Ellery.)']);
    expect(g.pc.inventory.tolls).toBe(t0 - 18 + 25);
    hour(g, 16); talk('d_ds_dive', g, q, ['(The roofs of Ellery.)']);
    expect(g.flags.ds_roofs_n).toBe(4);
  });

  it('the high street opens after the roofs; the bag makes the hose free and the bottom kinder', () => {
    const { g, q } = onShore();
    hour(g, 4);
    expect(options('d_ds_dive', g, q).some((t) => t.startsWith('(The high street'))).toBe(false);
    skills(g, { survival: 30 });
    apply([{ give: 't_rebreather' }], g, q);
    const t0 = g.pc.inventory.tolls;
    talk('d_ds_dive', g, q, ['(The roofs of Ellery.) (your own bag)']);
    hour(g, 16);
    talk('d_ds_dive', g, q, ['(The high street, eight fathoms.) (your own bag)']);
    expect(g.pc.inventory.tolls).toBe(t0);
    expect(has(g, 'c_bandage')).toBe(true);
    expect(g.flags.ds_dived_street).toBe(true);
  });

  it('Hum\'s legs at Stump: the crew\'s leave, then a controller on the second dive; all three bands end the quest', () => {
    const { g, q } = onShore();
    talk('d_ds_yewande', g, q, ['That\'s all.']);
    g.locationId = 'ds_rigs';
    hour(g, 16);
    expect(view('d_ds_stump', g, q).text).toContain('Hamid says who goes down');
    skills(g, { speech: 60, survival: 70 });
    talk('d_ds_hamid', g, q, ['That\'s all.']);
    talk('d_ds_hamid', g, q, ['Let me dive Stump.']);
    expect(g.flags.ds_rig_leave).toBe(true);
    talk('d_ds_stump', g, q, ['(Down Stump\'s legs.)']);
    hour(g, 4);
    talk('d_ds_stump', g, q, ['(Down Stump\'s legs.)']);
    expect(has(g, 'j_controller')).toBe(true);
    g.locationId = 'ds_stilts';
    hour(g, 16); talk('d_ds_dive', g, q, ['(The roofs of Ellery.)']);
    hour(g, 4); talk('d_ds_dive', g, q, ['(The high street']);
    expect(status(g, 'q_ds_dives')).toBe('done');
  });

  it('a failed dive comes up empty and still costs the hose', () => {
    const { g, q } = onShore();
    hour(g, 4);
    skills(g, { survival: 0 });
    g.pc.sheet.baseAttrs.grit = 3;
    const t0 = g.pc.inventory.tolls;
    talk('d_ds_dive', g, q, ['(The roofs of Ellery.)']);
    expect(g.pc.inventory.tolls).toBe(t0 - 6);
    expect(g.flags.ds_dived_roofs).toBeUndefined();
  });
});

// ---------------------------------------------------------------- the dike road

describe('The press on the dike', () => {
  it('bought free, the Sink boy turns up mending nets at the Netlofts; Wren approves', () => {
    const { g, q } = onShore();
    talk('d_re_ds_press', g, q, ['(To the boy.) Whose debt?', '(Back to the men.)', 'What\'s the paper for?']);
    expect(g.flags.ds_press_boy).toBe('freed');
    expect(g.world.approval[WREN]).toBe(10);
    expect(cond(placed('ds_stilts', 'npc_ds_w_boy_lofts').if, g)).toBe(true);
  });

  it('cutting the rope is a fight with the guild\'s men; standing aside sends him to the barges', () => {
    const { g, q } = onShore();
    talk('d_re_ds_press', g, q, ['(Cut the rope.)']);
    expect(cond(NPCS.npc_ds_w_press_a.hostileIf, g)).toBe(true);
    const h = onShore();
    talk('d_re_ds_press', h.g, h.q, ['(Stand aside.)']);
    expect(h.g.flags.ds_press_boy).toBe('pressed');
    expect(cond(placed('ds_stilts', 'npc_ds_w_boy_lofts').if, h.g)).toBe(false);
  });
});
