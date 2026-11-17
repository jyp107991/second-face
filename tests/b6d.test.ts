import { describe, expect, it } from 'vitest';
import { DIALOGUES, MAPS, QUESTS, WORLD_EVENTS } from '../src/content';
import { A3_MAST_DIALOGUES, MAST_OPEN } from '../src/content/dialogue/a3_mast';
import { d_sg_mast, d_sg_speaker } from '../src/content/dialogue/signalhill';
import { COMPANIONS, COMPANION_KEYS, D_VOICE, KES } from '../src/content/world/a3_conds';
import { effectiveSkill } from '../src/engine/stats/checks';
import type { SkillId } from '../src/engine/stats/rules';
import { runTimers, test as cond } from '../src/engine/world/logic';
import { actThree, at, fire, has, options, saveAndLoad, stage, status, talk, view, waitFor, type G, type Over, type Preset } from './a3_fixture';
import type { QuestEngine } from '../src/engine/quest/quest';

/**
 * B6d — Every Dead Radio: Signal Hill in Act 3. The station's voice reads the designate's line; the rack, the mast's foot,
 * the crown in the gully and the Hollow are the investigation; the Hollow name the turn (a mast that reaches everyone is a
 * target, and standing on one costs); six routes make it able to speak, none of them violent; the keeper is chosen (the
 * Hollow, the Wheel, Knock) or it is left narrow, for good; and the hill shows who keeps it. Played headless from the
 * shared Act 3 fixture.
 */

const SG = 'signalhill';
/** The hill in Act 3 (the order read), the Hollow passed in Act 1 by paying the track. */
const hill = (preset: Preset = 'prepared', over: Over = {}) => {
  const a = actThree(preset, { ...over, at: SG, flags: { sg_camp_passed: true, sg_paid: true, sg_tally_met: true, ...over.flags } });
  a.q.update();
  return a;
};
/** Set a skill's effective value exactly (base from the attributes, tag bonus and tools included). */
const exact = (g: G, k: SkillId, v: number) => { g.pc.sheet.skillBought[k] += v - effectiveSkill(g.pc.sheet, g.pc.inventory, k); expect(effectiveSkill(g.pc.sheet, g.pc.inventory, k)).toBe(v); };
const here = (g: G, map = SG) => MAPS[map].npcs!.filter((n) => cond(n.if, g)).map((n) => n.id ?? n.def);
const later = (g: G, q: QuestEngine, minutes: number) => { g.minutes += minutes; runTimers(g, q); q.update(); };
const link = (g: G, id = 'ch_neural_link') => { g.pc.sheet.chrome = { neural: { id, condition: 1, installedDay: 1 } }; };
const MAST_ROUTES = ['(Work the feed cabinet', '(Open the band through your neural port.)', 'Kes. Can you talk to it?', '(Set the feed by the figures in Verity', '(Haul the crown up the lattice', '(Climb with the crown on your back'];
const routesOffered = (g: G, q: QuestEngine) => options('d_a3_mast', g, q).filter((o) => MAST_ROUTES.some((r) => o.startsWith(r)));
const own = (id: string) => {
  const inherited = id === 'd_a3_mast' ? d_sg_mast.nodes : id === 'd_a3_station' ? d_sg_speaker.nodes : {};
  return Object.entries(DIALOGUES[id].nodes).filter(([nid]) => !(nid in inherited));
};

// ---------------------------------------------------------------- the place

describe('B6d: Signal Hill before and in Act 3', () => {
  it('before Act 3 the hill is as Act 1 left it: the Hollow\'s first placements, and the mast and speaker open their Act 1 scenes', () => {
    const { g, q } = at(SG);
    expect(here(g)).toEqual(['npc_sg_01', 'npc_sg_02', 'npc_sg_03']);
    expect(MAPS[SG].talk).toMatchObject({ mast_base: { dialogue: 'd_a3_mast' }, speaker: { dialogue: 'd_a3_station' }, mast_crown: { dialogue: 'd_a3_aerial' }, relay_term: { dialogue: 'd_sg_relay' } });
    // (a view enters its node, so each tree is looked at on a fresh hill)
    const pair = (act3: string, act1: string) => { const a = at(SG), b = at(SG); return [view(act3, a.g, a.q).text, view(act1, b.g, b.q).text]; };
    for (const [act3, act1] of [['d_a3_mast', 'd_sg_mast'], ['d_a3_station', 'd_sg_speaker']]) { const [x, y] = pair(act3, act1); expect(x).toBe(y); }
    for (const [act3, act1] of [['d_a3_mast', d_sg_mast], ['d_a3_station', d_sg_speaker]] as const) {
      for (const [nid, n] of Object.entries(act1.nodes)) expect(DIALOGUES[act3].nodes[nid], `${act3}/${nid}`).toBe(n);
    }
    // the Act 1 speaker's choices still play from the map's prop
    exact(g, 'mechanics', 40);
    talk('d_a3_station', g, q, ['(Cut the speaker wire.)', '(Done.)']);
    expect(g.flags.broadcast_silenced).toBe(true);
    expect(view('d_a3_aerial', g, q).text).toContain('Somebody let it down here on purpose');
    expect(g.world.quests.q_a3_mast).toBeUndefined();
  });

  it('in Act 3 the Hollow are their Act 3 placements, Tally with her Act 3 tree; arriving starts the quest once', () => {
    const { g, q } = hill('prepared');
    expect(here(g)).toEqual(['npc_sg_01_a3', 'npc_sg_02_a3', 'npc_sg_03_a3']);
    expect(MAPS[SG].npcs!.find((n) => n.id === 'npc_sg_01_a3')!.dialogue).toBe('d_a3_hollow');
    expect(g.world.quests.q_a3_mast).toBeUndefined();
    fire(g, q, SG, 'a3_arrive');
    expect(stage(g, 'q_a3_mast')).toBe('list');
    expect(QUESTS.q_a3_mast.stages.list.journal).toContain('my line is at the top of it');
  });

  it('the station reads the designate\'s line with the city\'s new year, cut, on the mast, or to a room, as Act 1 left the speaker', () => {
    for (const [flags, mark] of [[{ broadcast_silenced: true }, 'small as a fly in a jar'], [{ broadcast_amplified: true }, 'the whole Sallow is hearing your line'], [{ broadcast_amplified: false }, 'and to nobody else']] as const) {
      const { g, q } = hill('choir', { flags });
      const v = view('d_a3_station', g, q);
      expect(v.text).toContain('"— the Spire. The designate. Year thirty. Magistrate. —"');
      expect(v.text).toContain(mark);
      talk('d_a3_station', g, q);
      expect(stage(g, 'q_a3_mast')).toBe('list');
      expect(g.world.knowledge.a3_list_heard).toBe(true);
    }
  });
});

// ---------------------------------------------------------------- the investigation

describe('B6d: the investigation: the rack, the mast\'s foot, the crown in the gully, the Hollow', () => {
  it('the rack: the circuit marked BROADCAST, isolated by order (Science 35; easier for an archive clerk, with Nine or with Kes); failing is content', () => {
    const a = hill('choir', { companions: 'nobody', origin: null });
    exact(a.g, 'science', 34);
    expect(view('d_a3_station', a.g, a.q).options.find((o) => o.text.startsWith('(Follow the wire'))!.checkLabel).toBe('Science 35');
    talk('d_a3_station', a.g, a.q, ['(Follow the wire']);
    expect(a.g.world.knowledge.a3_broadcast_seen).toBeUndefined();
    const b = hill('choir', { companions: 'nobody', origin: 'archive_clerk' });
    exact(b.g, 'science', 20);
    const r = talk('d_a3_station', b.g, b.q, ['(Follow the wire']);
    expect(r.view()!.text).toContain('ISOLATED BY ORDER');
    expect(b.g.world.knowledge).toMatchObject({ relay_log_read: true, a3_broadcast_seen: true });
    expect(b.g.world.quests.q_a3_mast.done).toContain('band');
    // Nine reads the routing table aloud
    const c = hill('choir', { companions: { nine: 'party' }, origin: null });
    exact(c.g, 'science', 20);
    talk('d_a3_station', c.g, c.q, ['(Follow the wire']);
    expect(c.g.world.knowledge.a3_broadcast_seen).toBe(true);
    // the log read in Act 1: the circuit is seen without a check
    const d = hill('prepared');
    expect(options('d_a3_station', d.g, d.q)).toContain('(Look at the rack again, with the city\'s order in your pack.)');
    talk('d_a3_station', d.g, d.q, ['(Look at the rack again']);
    expect(d.g.world.knowledge.a3_broadcast_seen).toBe(true);
  });

  it('the mast\'s foot shows the meter live and the stub\'s empty plates; Tally tells where the crown is; the gully gives it up', () => {
    const { g, q } = hill('choir', { knows: [] });
    delete g.world.knowledge.mast_powered;
    talk('d_a3_mast', g, q);
    expect(g.world.knowledge.mast_powered).toBe(true);
    expect(g.world.quests.q_a3_mast.done).toContain('power');
    expect(view('d_a3_mast', g, q).text).toContain('four empty plates');
    talk('d_a3_hollow', g, q, ['The mast. What would it take']);
    expect(g.world.knowledge.a3_crown_told).toBe(true);
    expect(options('d_a3_hollow', g, q)).not.toContain('The mast. What would it take to make it reach past the Sallow?');
    talk('d_a3_aerial', g, q, ['(Dig it out of the stone']);
    expect(g.flags.a3_aerial_found).toBe(true);
    expect(g.world.quests.q_a3_mast.done).toContain('top');
    expect(view('d_a3_aerial', g, q).text).toContain('ready to go up');
    expect(options('d_a3_aerial', g, q)).toEqual(['(Leave it.)']);
    expect(view('d_a3_mast', g, q).text).toContain('was made for those plates');
  });

  it('the turn: the Hollow name the price of standing on a target before any of their routes is offered', () => {
    const { g, q } = hill('prepared');
    const before = options('d_a3_hollow', g, q);
    expect(before.some((o) => o.startsWith('Keep it as yours'))).toBe(false);
    const r = talk('d_a3_hollow', g, q, ['I want it to reach every radio']);
    expect(r.view()!.text).toContain('If you want us standing on a target, it costs. Sixty');
    expect(g.world.knowledge.a3_hollow_price).toBe(true);
    expect(r.view()!.options.map((o) => o.text)).toEqual(expect.arrayContaining(['Keep it as yours. A hill everyone needs is a hill everyone pays.', 'Then I\'ll leave it as it is. Nobody climbs your track for it.']));
  });
});

// ---------------------------------------------------------------- the six routes

describe('B6d: the six routes, each with its requirement', () => {
  it('X: the feed cabinet at Science 50, 40 with the relay\'s log read; a failure changes nothing', () => {
    const a = hill('choir', { companions: 'nobody' });
    delete a.g.world.knowledge.relay_log_read;
    exact(a.g, 'science', 49);
    talk('d_a3_mast', a.g, a.q, ['(Work the feed cabinet']);
    expect(a.g.flags.a3_mast_how).toBeUndefined();
    exact(a.g, 'science', 50);
    const r = talk('d_a3_mast', a.g, a.q, ['(Work the feed cabinet']);
    expect(r.view()!.text).toContain('a white one lights beside it');
    expect(a.g.flags.a3_mast_how).toBe('x');
    expect(a.g.flags.a3_mast).toBeUndefined();
    expect(cond(MAST_OPEN, a.g)).toBe(true);
    const b = hill('prepared');
    exact(b.g, 'science', 40);
    expect(view('d_a3_mast', b.g, b.q).options.find((o) => o.text.startsWith('(Work the feed cabinet'))!.checkLabel).toBe('Science 40');
    talk('d_a3_mast', b.g, b.q, ['(Work the feed cabinet', '(Go on.)']);
    expect(b.g.flags.a3_mast_how).toBe('x');
  });

  it('C: through a neural port (the Gridjack or a lattice port), the grid grants the designate; or Kes, unless her link was cut', () => {
    for (const chrome of ['ch_neural_link', 'ch_neural_lattice']) {
      const { g, q } = hill('choir', { companions: 'nobody' });
      expect(routesOffered(g, q).some((o) => o.startsWith('(Open the band'))).toBe(false);
      link(g, chrome);
      const r = talk('d_a3_mast', g, q, ['(Open the band through your neural port.)']);
      expect(r.view()!.text).toContain('REQUEST FROM THE DESIGNATE');
      expect(r.view()!.text).toContain('GRANTED');
      expect(g.flags.a3_mast_how).toBe('c');
      expect(g.world.knowledge.a3_ledger_granted).toBe(true);
    }
    const k = hill('prepared', { companions: { kes: 'party' } });
    const before = k.g.world.approval[KES];
    const r = talk('d_a3_mast', k.g, k.q, ['Kes. Can you talk to it?']);
    expect(r.view()!.speaker).toBe(KES);
    expect(r.view()!.text).toContain('the log says nobody did it');
    expect(k.g.flags.a3_mast_how).toBe('c');
    expect(k.g.world.approval[KES]).toBe(before + 3);
    const cut = hill('prepared', { companions: { kes: 'party' }, flags: { kes_link: 'cut' } });
    expect(options('d_a3_mast', cut.g, cut.q)).not.toContain('Kes. Can you talk to it?');
    const waiting = hill('prepared');
    expect(options('d_a3_mast', waiting.g, waiting.q)).not.toContain('Kes. Can you talk to it?');
  });

  it('K: with the Saints\' girl kept, Verity\'s letter with the band comes at the next seven o\'clock wherever the player is; then the feed is set by it', () => {
    const { g, q } = hill('prepared');
    // nothing comes before the player has taken up the mast
    expect(waitFor(g, q, SG, 7)).not.toContain('a3_verity_band');
    expect(options('d_a3_mast', g, q).some((o) => o.startsWith('(Set the feed'))).toBe(false);
    expect(stage(g, 'q_a3_mast')).toBe('list');
    expect(waitFor(g, q, 'shale', 7)).toEqual(['a3_verity_band']);
    expect(g.world.post!.at(-1)).toMatchObject({ from: 'npc_bw_04' });
    expect(g.world.post!.at(-1)!.text).toContain('the hiss band, midnight to two');
    expect(g.world.knowledge.a3_verity_band).toBe(true);
    expect(waitFor(g, q, 'shale', 7)).not.toContain('a3_verity_band');
    g.locationId = SG;
    const r = talk('d_a3_mast', g, q, ['(Set the feed by the figures in Verity']);
    expect(r.view()!.text).toContain('the one the wire wakes on');
    expect(g.flags.a3_mast_how).toBe('k');
    expect(WORLD_EVENTS.a3_verity_band.at).toEqual({ hour: 7 });
    for (const flags of [{ bw_static: 'silenced' }, { bw_static: 'kept' }]) {
      const b = hill('choir', { flags });
      if (flags.bw_static === 'kept') b.g.npcs['md_bridgeward/npc_bw_04'] = { dead: true } as never;
      talk('d_a3_station', b.g, b.q);
      for (let d = 0; d < 2; d++) expect(waitFor(b.g, b.q, 'shale', 7)).not.toContain('a3_verity_band');
      expect(b.g.world.knowledge.a3_verity_band).toBeUndefined();
    }
  });

  it('V: only once the crown is out of the gully; Survival 45 or Reflex 7 takes it up the lattice; a fall changes nothing', () => {
    const { g, q } = hill('choir', { companions: 'nobody', attrs: { reflex: 6 } });
    expect(routesOffered(g, q).some((o) => o.startsWith('(Haul') || o.startsWith('(Climb'))).toBe(false);
    talk('d_a3_aerial', g, q, ['(Dig it out of the stone']);
    exact(g, 'survival', 44);
    const v = view('d_a3_mast', g, q);
    expect(v.options.find((o) => o.text.startsWith('(Haul the crown'))!.checkLabel).toBe('Survival 45');
    expect(v.options.find((o) => o.text.startsWith('(Climb with the crown'))!.checkLabel).toBe('Reflex 7');
    talk('d_a3_mast', g, q, ['(Haul the crown', '(Step back.)', '(Climb with the crown']);
    expect(g.flags.a3_mast_how).toBeUndefined();
    exact(g, 'survival', 45);
    const r = talk('d_a3_mast', g, q, ['(Haul the crown']);
    expect(r.view()!.text).toContain('the four plates take its foot');
    expect(g.flags.a3_mast_how).toBe('v');
    expect(view('d_a3_aerial', g, q).text).toContain('a long pale scar');
    const n = hill('choir', { companions: 'nobody', attrs: { reflex: 7 } });
    talk('d_a3_aerial', n.g, n.q, ['(Dig it out of the stone']);
    exact(n.g, 'survival', 20);
    talk('d_a3_mast', n.g, n.q, ['(Climb with the crown']);
    expect(n.g.flags.a3_mast_how).toBe('v');
  });

  it('B: a pre-Scald board and sixty for the Hollow\'s climb, each board; the shunter\'s board ends Dorcas\'s quest at the mast', () => {
    for (const board of ['j_controller', 'j_tm_controller', 'k_an_board']) {
      const { g, q } = hill('prepared', { items: [board], tolls: 60 });
      if (board === 'k_an_board') q.questStart('q_an_board');
      talk('d_a3_hollow', g, q, ['I want it to reach every radio', '(Show her a board.)']);
      expect(options('d_a3_hollow', g, q).length).toBeGreaterThan(0);
      const r = talk('d_a3_hollow', g, q, ['(Show her a board.)', '(Hand over']);
      expect(r.view()!.text).toContain('Sixty bought the climb');
      expect(has(g, board)).toBe(false);
      expect(g.pc.inventory.tolls).toBe(0);
      expect(g.flags).toMatchObject({ a3_mast_how: 'b', a3_hollow_paid: true });
      if (board === 'k_an_board') { expect(g.flags.an_board).toBe('mast'); expect(stage(g, 'q_an_board')).toBe('mast'); expect(status(g, 'q_an_board')).toBe('done'); }
      // the sixty was the keeping too
      talk('d_a3_hollow', g, q, ['You do. You\'ve had the sixty.']);
      expect(g.flags).toMatchObject({ a3_mast: 'raised', a3_mast_keeper: 'hollow' });
      expect(g.pc.inventory.tolls).toBe(0);
    }
    const poor = hill('prepared', { items: ['j_controller'], tolls: 59 });
    poor.g.pc.inventory.tolls = 59;
    talk('d_a3_hollow', poor.g, poor.q, ['I want it to reach every radio']);
    expect(talk('d_a3_hollow', poor.g, poor.q, ['(Show her a board.)']).view()!.options.map((o) => o.text)).toEqual(['I haven\'t sixty on me.', 'Not yet.']);
    const none = hill('prepared');
    talk('d_a3_hollow', none.g, none.q, ['I want it to reach every radio']);
    expect(options('d_a3_hollow', none.g, none.q).some((o) => o.startsWith('(Show her a board.)'))).toBe(false);
  });

  it('T: the Hollow keep it as theirs at Speech 45 (easier if the voice was cut in Act 1, harder if it was put on the mast); they raise it themselves', () => {
    const silenced = hill('choir', { companions: 'nobody', flags: { broadcast_silenced: true } });
    exact(silenced.g, 'speech', 35);
    talk('d_a3_hollow', silenced.g, silenced.q, ['I want it to reach every radio']);
    expect(view('d_a3_hollow', silenced.g, silenced.q).options.find((o) => o.text.startsWith('Keep it as yours'))!.checkLabel).toBe('Speech 35');
    const t0 = silenced.g.minutes;
    const r = talk('d_a3_hollow', silenced.g, silenced.q, ['Keep it as yours']);
    expect(r.view()!.text).toContain('"Mind. Ours."');
    expect(silenced.g.flags).toMatchObject({ a3_mast: 'raised', a3_mast_how: 't', a3_mast_keeper: 'hollow', a3_aerial_found: true });
    expect(silenced.g.minutes - t0).toBe(360);
    expect(stage(silenced.g, 'q_a3_mast')).toBe('hollow');
    expect(status(silenced.g, 'q_a3_mast')).toBe('done');

    const loud = hill('choir', { companions: 'nobody', flags: { broadcast_amplified: true } });
    exact(loud.g, 'speech', 54);
    talk('d_a3_hollow', loud.g, loud.q, ['I want it to reach every radio', 'Keep it as yours']);
    expect(loud.g.flags.a3_mast).toBeUndefined();
    exact(loud.g, 'speech', 55);
    talk('d_a3_hollow', loud.g, loud.q, ['Keep it as yours']);
    expect(loud.g.flags.a3_mast_keeper).toBe('hollow');
  });
});

// ---------------------------------------------------------------- the keeper, and what the hill shows

describe('B6d: the keeper chosen, or the mast left narrow, and the hill shows it', () => {
  const spoke = (preset: Preset = 'prepared', over: Over = {}) => {
    const a = hill(preset, over);
    exact(a.g, 'science', 60);
    talk('d_a3_mast', a.g, a.q, ['(Work the feed cabinet', '(Go on.)']);
    return a;
  };

  it('made to speak, it needs a keeper: the turn said at the mast; the Hollow asked at their fire, the Wheel only with the Wheel, Knock always', () => {
    const a = spoke('prepared');
    const v = view('d_a3_mast', a.g, a.q);
    expect(v.text).toContain('Somebody has to keep the switch down until you send word');
    expect(v.options.map((o) => o.text)).toEqual(['The Hollow should keep it. I\'ll go down and ask Tally.', 'The Wheel will keep it. They go everywhere; let them hold the one place that reaches everywhere.', 'Knock keeps it. It\'s my home\'s, not the Hollow\'s.', '(Pull out what you wired and put it back as the city built it.)', '(Not yet.)']);
    const b = spoke('choir', { flags: { sg_fight: true } });
    expect(options('d_a3_mast', b.g, b.q)).toEqual(['Knock keeps it. It\'s my home\'s.', '(Pull out what you wired and put it back as the city built it.)', '(Not yet.)']);
    // not settled until kept: the hill is not raised yet, and D cannot read it
    expect(cond(D_VOICE, a.g)).toBe(false);
  });

  it('the Hollow keep it: paid sixty, or talked into it; Brick goes up to watch the track and Thanh sits at the switch, outside', () => {
    const pay = spoke('prepared', { tolls: 100 });
    pay.g.pc.inventory.tolls = 100;
    talk('d_a3_mast', pay.g, pay.q, ['The Hollow should keep it']);
    expect(view('d_a3_hollow', pay.g, pay.q).text).toContain('Who sits on it?');
    talk('d_a3_hollow', pay.g, pay.q, ['You do. Sixty, for water and cartridges.']);
    expect(pay.g.pc.inventory.tolls).toBe(40);
    expect(pay.g.flags).toMatchObject({ a3_mast: 'raised', a3_mast_keeper: 'hollow', a3_hollow_paid: true });
    expect(stage(pay.g, 'q_a3_mast')).toBe('hollow');
    expect(here(pay.g)).toEqual(['npc_sg_01_a3', 'npc_sg_02_mast', 'npc_sg_03_mast']);
    expect(cond(D_VOICE, pay.g)).toBe(true);
    expect(view('d_a3_mast', pay.g, pay.q).text).toContain('Thanh sits on the feed cabinet');
    expect(view('d_a3_hollow', pay.g, pay.q).text).toContain('Still ours');

    const talked = spoke('prepared');
    exact(talked.g, 'speech', 60);
    talk('d_a3_hollow', talked.g, talked.q, ['You do. Keep it as yours']);
    expect(talked.g.flags.a3_mast_keeper).toBe('hollow');
    expect(talked.g.flags.a3_hollow_paid).toBeUndefined();
  });

  it('the Wheel keep it: word goes down the road, and the day after Sefa\'s son is on the hill, not at the Wheel', () => {
    const { g, q } = spoke('prepared');
    talk('d_a3_mast', g, q, ['The Wheel will keep it']);
    expect(g.flags).toMatchObject({ a3_mast: 'raised', a3_mast_keeper: 'wheel' });
    expect(stage(g, 'q_a3_mast')).toBe('wheel');
    expect(g.world.news.some((n) => n.tag === 'a3_mast_wheel' && n.origin === 'wheel')).toBe(true);
    expect(here(g)).toEqual(['npc_sg_01_a3', 'npc_sg_02_a3', 'npc_sg_03_a3']);
    expect(here(g, 'wheel')).toContain('npc_wh_02');
    later(g, q, 1440);
    expect(g.flags.a3_wheel_up).toBe(true);
    expect(here(g)).toContain('npc_wh_02_sg');
    expect(here(g, 'wheel')).not.toContain('npc_wh_02');
    expect(MAPS[SG].npcs!.find((n) => n.id === 'npc_wh_02_sg')!.dialogue).toBe('d_a3_keeper');
    expect(view('d_a3_keeper', g, q).text).toContain('It stays down till your word comes up the wire');
    expect(view('d_a3_hollow', g, q).text).toContain('Sefa\'s boy swept the step');
    // the Hollow stay on their camp under the Wheel
    expect(here(g)).toEqual(expect.arrayContaining(['npc_sg_01_a3', 'npc_sg_02_a3', 'npc_sg_03_a3']));
    // Dario wanted a door: the option says so when the player heard it
    const d = spoke('prepared', { knows: ['dario_town'] });
    expect(options('d_a3_mast', d.g, d.q)).toContain('The Wheel will keep it. Sefa\'s son wanted a door that shuts.');
  });

  it('Knock keeps it: KNOCK on the cabinet door; over the Hollow\'s heads they walk west by morning; with the Hollow gone, nobody is displaced', () => {
    const { g, q } = spoke('prepared');
    const wren = g.world.approval.npc_rd_03;
    talk('d_a3_mast', g, q, ['Knock keeps it']);
    expect(g.flags).toMatchObject({ a3_mast: 'raised', a3_mast_keeper: 'knock' });
    expect(stage(g, 'q_a3_mast')).toBe('knock');
    expect(g.world.news.some((n) => n.tag === 'a3_mast_knock' && n.origin === 'cistern9')).toBe(true);
    expect(g.world.approval.npc_rd_03).toBe(wren - 5);
    expect(view('d_a3_hollow', g, q).text).toContain('We\'re going');
    expect(here(g)).toEqual(['npc_sg_01_a3', 'npc_sg_02_a3', 'npc_sg_03_a3']);
    later(g, q, 480);
    expect(g.flags.a3_hollow_gone).toBe(true);
    expect(here(g)).toEqual([]);
    expect(view('d_a3_mast', g, q).text).toContain('KNOCK chalked on the cabinet door');
    const b = spoke('choir', { flags: { sg_fight: true } });
    talk('d_a3_mast', b.g, b.q, ['Knock keeps it']);
    expect(b.g.flags.a3_mast_keeper).toBe('knock');
    expect(b.g.world.timers.some((t) => t.id === 'a3_hollow_leave')).toBe(false);
  });

  it('left narrow, at the mast or at the Hollow\'s asking or after it was made to speak: for good, and D can never read it', () => {
    const a = hill('prepared');
    talk('d_a3_mast', a.g, a.q, ['(Leave the mast as the city built it.)', '(Leave it narrow.)']);
    expect(a.g.flags.a3_mast).toBe('narrow');
    expect(stage(a.g, 'q_a3_mast')).toBe('narrow');
    expect(routesOffered(a.g, a.q)).toEqual([]);
    expect(view('d_a3_mast', a.g, a.q).text).toContain('speaking narrow');
    expect(view('d_a3_station', a.g, a.q).text).toContain('you left it there');
    expect(cond(D_VOICE, a.g)).toBe(false);

    const b = hill('prepared');
    const trust = b.g.world.relations.npc_sg_01?.trust ?? 0;
    talk('d_a3_hollow', b.g, b.q, ['I want it to reach every radio', 'Then I\'ll leave it as it is', 'Leave it be.']);
    expect(b.g.flags.a3_mast).toBe('narrow');
    expect(b.g.world.relations.npc_sg_01.trust).toBe(trust + 10);
    expect(view('d_a3_hollow', b.g, b.q).text).toContain('Still narrow');

    const c = spoke('prepared');
    talk('d_a3_hollow', c.g, c.q, ['Nobody. I\'ll put it back as it was.', 'Put it back.']);
    expect(c.g.flags).toMatchObject({ a3_mast: 'narrow', a3_mast_how: 'x' });
    expect(c.g.flags.a3_mast_keeper).toBeUndefined();
    expect(cond(D_VOICE, c.g)).toBe(false);
  });

  it('a mast made to speak and not yet kept is still waiting for its keeper after a save and a load', async () => {
    const { g } = spoke('prepared');
    const loaded = await saveAndLoad(g);
    expect(cond(MAST_OPEN, loaded.g)).toBe(true);
    expect(view('d_a3_mast', loaded.g, loaded.q).text).toContain('It can speak to every radio in the Reach now');
    talk('d_a3_mast', loaded.g, loaded.q, ['Knock keeps it']);
    expect(cond(D_VOICE, loaded.g)).toBe(true);
  });
});

// ---------------------------------------------------------------- no route without its requirement

describe('B6d: no route without its requirement', () => {
  it('from the worst Act 2 (no log, no chrome, no Kes, no board, no Verity, no crown): only the feed cabinet\'s check and the Hollow\'s word are on offer', () => {
    const { g, q } = hill('hostile');
    for (const k of ['relay_log_read', 'a3_verity_band', 'mast_powered']) delete g.world.knowledge[k];
    exact(g, 'science', 49);
    exact(g, 'speech', 34);
    exact(g, 'survival', 44);
    const offered = routesOffered(g, q);
    expect(offered).toHaveLength(1);
    expect(view('d_a3_mast', g, q).options.find((o) => o.text.startsWith('(Work the feed cabinet'))!.checkMet).toBe(false);
    talk('d_a3_mast', g, q, ['(Work the feed cabinet']);
    expect(g.flags.a3_mast_how).toBeUndefined();
    // the Hollow: their word fails below Speech 35 here (the voice was cut in Act 1); no board, no route of theirs
    talk('d_a3_hollow', g, q, ['I want it to reach every radio']);
    const v = view('d_a3_hollow', g, q);
    expect(v.options.some((o) => o.text.startsWith('(Show her a board.)'))).toBe(false);
    expect(v.options.find((o) => o.text.startsWith('Keep it as yours'))!.checkMet).toBe(false);
    talk('d_a3_hollow', g, q, ['Keep it as yours']);
    expect(g.flags.a3_mast).toBeUndefined();
    // and the trainable routes open it: Speech 35 here
    exact(g, 'speech', 35);
    talk('d_a3_hollow', g, q, ['Keep it as yours']);
    expect(cond(D_VOICE, g)).toBe(true);
  });

  it('the Hollow fought in Act 1: their routes and their keeping are never offered; the hill\'s own routes still are', () => {
    const { g, q } = hill('prepared', { flags: { sg_fight: true } });
    expect(view('d_a3_hollow', g, q).text).toBe('Nobody is talking.');
    expect(options('d_a3_mast', g, q)).not.toContain('(Think about who knows this mast best.)');
    exact(g, 'science', 50);
    talk('d_a3_mast', g, q, ['(Work the feed cabinet', '(Go on.)']);
    expect(options('d_a3_mast', g, q).some((o) => o.startsWith('The Hollow'))).toBe(false);
    talk('d_a3_mast', g, q, ['The Wheel will keep it']);
    expect(g.flags.a3_mast_keeper).toBe('wheel');
  });

  it('the quest\'s routes declare what each needs, as the scenes do', () => {
    const r = Object.fromEntries(QUESTS.q_a3_mast.routes!.map((x) => [x.id, x.requires]));
    expect(Object.keys(r)).toEqual(['x', 'c', 'b', 't', 'v', 'k']);
    const { g } = hill('hostile');
    for (const id of ['c', 'b', 'k']) expect(cond(r[id]!, g), id).toBe(false);
    link(g);
    expect(cond(r.c!, g)).toBe(true);
  });
});

// ---------------------------------------------------------------- the conversations

describe('B6d: the conversations keep U7, and every companion has a word', () => {
  it('every node B6d wrote has a line for coming back to it; topics are spent once and trade is a service', () => {
    for (const d of A3_MAST_DIALOGUES) for (const [nid, n] of own(d.id)) expect(n.again, `${d.id}/${nid}`).toBeDefined();
    const opts = A3_MAST_DIALOGUES.flatMap((d) => own(d.id).flatMap(([, n]) => n.options));
    for (const o of opts.filter((x) => x.text === 'Trade.')) expect(o.repeat).toBe(true);
    for (const id of ['a3h.mast', 'a3h.raise', 'a3h.keeping.come', 'a3k.come', 'a3m.hollow']) expect(opts.find((o) => o.id === id)?.once, id).toBe(true);
  });

  it('every companion speaks somewhere on the hill', () => {
    const said = new Set(A3_MAST_DIALOGUES.flatMap((d) => own(d.id).flatMap(([, n]) => (n.interject ?? []).map((i) => i.companion))));
    for (const k of COMPANION_KEYS) expect(said.has(COMPANIONS[k].id), k).toBe(true);
  });

  it('nothing on the hill waits on a date: the one event is armed by flags and keeps an hour', () => {
    const e = WORLD_EVENTS.a3_verity_band;
    expect(e.armedIf).toBeDefined();
    expect('day' in e.at).toBe(false);
    const { g, q } = hill('prepared');
    for (let d = 0; d < 5; d++) waitFor(g, q, SG, 7);
    expect(g.flags.a3_mast).toBeUndefined();
    expect(g.world.quests.q_a3_mast).toBeUndefined();
  });
});
