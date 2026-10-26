import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../src/content';
import { REFERENCE_BUILDS } from '../src/content/rules/builds';
import { newGameState } from '../src/engine/core/state';
import { checkCoverage, projectBuild } from '../src/engine/data/coverage';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine, type QuestDef } from '../src/engine/quest/quest';
import { countItem } from '../src/engine/inventory/inventory';

/** Play a conversation by choosing options whose text starts with the given prefixes, in order. */
function talk(id: string, g: ReturnType<typeof newGameState>, q: QuestEngine, picks: string[]): void {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  for (const p of picks) {
    const v = r.view();
    if (!v) throw new Error(`${id}: ended before "${p}"`);
    const o = v.options.find((x) => x.text.startsWith(p));
    if (!o) throw new Error(`${id}: no option "${p}" in [${v.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    q.update();
  }
}

describe('Chapter One opening', () => {
  it('a character with no useful skills can still get out (critical path never gated)', () => {
    const g = newGameState('c9', 0, 0);
    for (const k of Object.keys(g.pc.sheet.baseAttrs) as (keyof typeof g.pc.sheet.baseAttrs)[]) g.pc.sheet.baseAttrs[k] = 1;
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_door');
    talk('d_c9_pell', g, q, ['Who was he', 'Did he carry', '(Look at', 'I need to see']);
    expect(countItem(g.pc.inventory, 'k_photo')).toBe(1);
    talk('d_c9_ines', g, q, ['I\'ll go.', 'I\'ll make do']);
    expect(g.world.quests.q_ch1_door.stage).toBe('door');
    talk('d_c9_bram', g, q, ['(Hand him', 'Open it', '(Step into']);
    expect(g.world.quests.q_ch1_door.stage).toBe('leave');
    g.flags.c9_left = true;
    q.update();
    expect(g.world.quests.q_ch1_door.status).toBe('done');
  });

  it('origins change lines and open routes', () => {
    const g = newGameState('c9', 0, 0);
    g.origin = 'door_watch';
    g.flags.c9_examined = true;
    const r = new DialogueRunner(DIALOGUES.d_c9_ines, g);
    expect(r.view()!.text).toContain('You were on the door');
    expect(r.view()!.options.some((o) => o.text.includes('Larkspur'))).toBe(true);
  });

  it('the pump-run hatch is a quiet way out for a Pump Hand', () => {
    const g = newGameState('c9', 0, 0);
    g.origin = 'pump_hand';
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_door');
    g.flags.c9_examined = true; g.flags.c9_council_done = true;
    q.update();
    expect(g.world.quests.q_ch1_door.stage).toBe('door');
    talk('d_c9_shaft', g, q, ['You\'ve cycled this hatch', '(Leave it open.)']);
    expect(g.flags.c9_shaft_open).toBe(true);
    expect(g.world.quests.q_ch1_door.stage).toBe('leave');
    expect(g.world.decisions.map((d) => d.id)).toContain('c9_shaft');
  });

  it('MOTHER yields leads to a clerk, and the leads conclude', () => {
    const g = newGameState('c9', 0, 0);
    g.origin = 'archive_clerk';
    g.pc.sheet.baseAttrs.wits = 9;
    g.world.knowledge.stranger_mark = true;
    const q = new QuestEngine(QUESTS, g);
    talk('d_c9_mother', g, q, ['I have questions', '(Read the log display.)', 'Another question', 'Did he come from the city?', 'Another question']);
    expect(g.world.leads.l_mother_sealed).toBe(true);
    expect(g.world.leads.l_mother_city).toBe(true);
  });

  it('refusing sends Tamsin alone, with a recorded decision', () => {
    const g = newGameState('c9', 0, 0);
    g.flags.c9_examined = true;
    const q = new QuestEngine(QUESTS, g);
    talk('d_c9_ines', g, q, ['I won\'t go', 'Send her', '…Give me the order', 'I\'ll make do']);
    expect(g.flags.c9_tamsin_sent_alone).toBe(true);
    expect(g.world.decisions.map((d) => d.id)).toContain('c9_tamsin_alone');
    expect(g.world.approval.npc_c9_03).toBeLessThan(0);
  });
});

describe('build coverage', () => {
  it('projects builds into specialists', () => {
    const s = projectBuild(REFERENCE_BUILDS.find((b) => b.id === 'technician')!, 16);
    expect(s.skillBought.science).toBeGreaterThan(40);
    expect(s.skillBought.melee).toBe(0);
  });
  it('flags critical quests that some build cannot pass', () => {
    const gated: QuestDef = { id: 'q_gated', title: 'Gated', act: 'ch1', critical: true, start: 's', stages: { s: { journal: '', end: 'done' } },
      routes: [{ id: 'x', kind: 'tech', label: 'science only', requires: { skill: 'science', gte: 60 } }] };
    const errs = checkCoverage({ q_gated: gated }, REFERENCE_BUILDS, { ch1: 2 });
    expect(errs.length).toBeGreaterThan(5);
    expect(errs.some((e) => e.includes('bruiser'))).toBe(true);
  });
});

describe('Shale: tracing the stranger', () => {
  it('starts when the Cistern quest ends and advances on the sheriff\'s word', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_door');
    g.flags.c9_examined = true; g.flags.c9_council_done = true; g.flags.c9_door_open = true; g.flags.c9_left = true;
    q.update();
    expect(g.world.quests.q_ch1_door.status).toBe('done');
    expect(g.world.quests.q_ch1_shale?.stage).toBe('road');
    g.flags.visited_shale = true;
    talk('d_sh_ada', g, q, ['The salt cut.', 'Did he say his name?', 'Thanks.', 'Understood.']);
    expect(g.world.quests.q_ch1_shale.stage).toBe('overpass');
    g.flags.visited_overpass = true;
    q.update();
    expect(g.world.quests.q_ch1_shale.status).toBe('done');
  });

  it('the rumour can be bought from Pike, and Mags takes a promise instead of coin', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_shale');
    g.flags.visited_shale = true;
    g.pc.inventory.tolls = 20;
    talk('d_sh_pike', g, q, ['A masked man came through', '(Pay. 15 Tolls)', 'Noted.']);
    expect(g.pc.inventory.tolls).toBe(5);
    expect(g.world.knowledge.kessler_has_map).toBe(true);
    expect(g.world.quests.q_ch1_shale.stage).toBe('overpass');
    const g2 = newGameState('c9', 0, 0);
    const q2 = new QuestEngine(QUESTS, g2);
    q2.questStart('q_ch1_shale');
    g2.world.knowledge.teo_prisoner = true;
    talk('d_sh_mags', g2, q2, ['What have you got', 'A tall old man with a mask', 'Tell me, and I\'ll ask after Teo', 'Thank you.']);
    expect(g2.world.decisions.map((d) => d.id)).toContain('promised_mags_teo');
    expect(g2.world.knowledge.mags_saw_stranger).toBe(true);
  });
});

describe('The Paper (overpass)', () => {
  it('Kessler sells the map, and the quest ends', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_map');
    g.pc.inventory.tolls = 100;
    talk('d_rd_kessler', g, q, ['Both. I\'m from the salt cut', 'Fair. Tell me about the paper.', 'Name a price.', '(Pay. 80 Tolls)', '(Put it away.)']);
    expect(countItem(g.pc.inventory, 'k_map')).toBe(1);
    expect(g.pc.inventory.tolls).toBe(20);
    expect(g.world.quests.q_ch1_map.status).toBe('done');
  });

  it('fear works with Pike\'s report and enough Speech; terms free Teo', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_map'); q.questStart('q_sh_prisoner');
    g.world.knowledge.pike_reported = true; g.world.knowledge.kessler_has_map = true; g.world.knowledge.teo_prisoner = true; g.world.knowledge.tribute_due = true;
    g.pc.sheet.skillBought.speech = 60;
    talk('d_rd_kessler', g, q, ['Manners.', 'You\'re holding Teo Marsh.', 'A better offer', 'I will.', 'The map he carried', 'The Tollmen know you have it', 'Fair.', '(Put it away.)']);
    expect(g.flags.teo_freed).toBe(true);
    expect(g.flags.have_map).toBe(true);
    expect(g.world.quests.q_sh_prisoner.stage).toBe('home');
    g.flags.sh_mags_met = true;
    talk('d_sh_mags', g, q, ['Teo\'s out.', 'I won\'t.', 'Later.']);
    expect(g.world.quests.q_sh_prisoner.status).toBe('done');
  });

  it('Wren steals it at night and joins', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_map');
    g.world.knowledge.kessler_has_map = true;
    talk('d_rd_wren', g, q, ['What did he say?', 'More.', 'The paper. I want it.', 'Deal.', '(Nod.)']);
    expect(g.flags.wren_deal).toBe(true);
    g.minutes = 23 * 60;
    talk('d_rd_wren', g, q, ['Let\'s go.']);
    expect(g.flags.have_map).toBe(true);
    expect(g.world.party).toContain('npc_rd_03');
  });
});
