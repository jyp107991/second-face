import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { addItem, countItem, makeItem } from '../src/engine/inventory/inventory';
import { QuestEngine } from '../src/engine/quest/quest';

/** Play a conversation by choosing options whose text starts with the given prefixes, in order. */
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

function atTollhouse(hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 10 * 1440 + hour * 60;
  g.locationId = 'tollhouse';
  g.flags.visited_tollhouse = true;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_a1_tollhouse');
  return { g, q };
}

describe('Act 1 opens from the first name', () => {
  it('reading the map starts the road east and teaches where the Tollhouse is', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_name');
    g.world.knowledge.name1_decoded = true;
    q.update();
    expect(g.world.quests.q_ch1_name.status).toBe('done');
    expect(g.world.quests.q_a1_tollhouse?.stage).toBe('road');
    expect(g.world.knowledge.loc_tollhouse).toBe(true);
    expect(g.world.timers.some((t) => t.id === 'act1_card')).toBe(true);
  });
});

describe('The Wall on the Highway: every route through', () => {
  it('pays the toll at the gate', () => {
    const { g, q } = atTollhouse();
    g.pc.inventory.tolls = 30;
    talk('d_th_gate', g, q, ['(Pay. 20 Tolls)', '(Go through.)']);
    expect(g.pc.inventory.tolls).toBe(10);
    expect(countItem(g.pc.inventory, 'k_pass_stamped')).toBe(1);
    expect(g.flags.th_passed).toBe(true);
    expect(g.world.quests.q_a1_tollhouse.status).toBe('done');
    expect(g.world.knowledge.loc_signalhill).toBe(true);
  });

  it('a guild courier contract is free passage with a nine-day timer', () => {
    const { g, q } = atTollhouse();
    talk('d_th_clerk', g, q, ['Contracts. What kind?', 'What\'s in it?', 'I\'ll carry it.', '(Take it.)']);
    expect(countItem(g.pc.inventory, 'k_packet')).toBe(1);
    expect(g.flags.th_contract).toBe(true);
    expect(g.world.timers.some((t) => t.id === 'th_packet_due')).toBe(true);
    talk('d_th_gate', g, q, ['(Show the sealed packet.)', '(Go through.)']);
    expect(g.world.quests.q_a1_tollhouse.status).toBe('done');
  });

  it('a forged pass from Teo passes a speech check at the gate, or costs double when caught', () => {
    const { g, q } = atTollhouse();
    g.locationId = 'shale'; g.flags.teo_freed = true;
    talk('d_rd_teo', g, q, ['The Tollmen\'s wall', '(Take it.)']);
    expect(countItem(g.pc.inventory, 'k_pass_forged')).toBe(1);
    g.locationId = 'tollhouse';
    g.pc.sheet.skillBought.speech = 90;
    talk('d_th_gate', g, q, ['(Show the pass.)', '(Go through.)']);
    expect(g.flags.th_forged).toBe(true);
    expect(countItem(g.pc.inventory, 'k_pass_forged')).toBe(0);
    expect(g.world.quests.q_a1_tollhouse.status).toBe('done');
    // Caught: the pass is taken and the toll doubles.
    const c = atTollhouse();
    addItem(c.g.pc.inventory, makeItem('k_pass_forged'));
    c.g.pc.sheet.skillBought.speech = 0;
    for (const k of Object.keys(c.g.pc.sheet.baseAttrs) as (keyof typeof c.g.pc.sheet.baseAttrs)[]) c.g.pc.sheet.baseAttrs[k] = 1;
    c.g.pc.inventory.tolls = 40;
    talk('d_th_gate', c.g, c.q, ['(Show the pass.)', '(Pay. 40 Tolls)', '(Go through.)']);
    expect(c.g.pc.inventory.tolls).toBe(0);
    expect(c.g.flags.th_paid_fine).toBe(true);
  });

  it('Perpetua writes a pass for thirty Tolls, or for nothing if you freed Teo', () => {
    const { g, q } = atTollhouse();
    g.locationId = 'rustdogs'; g.flags.teo_freed = true;
    talk('d_rd_perpetua', g, q, ['The Tollmen\'s wall', 'I got Teo out.', '(Take it.)']);
    expect(countItem(g.pc.inventory, 'k_pass_forged')).toBe(1);
  });

  it('the gate terminal stamps a courier through at night', () => {
    const { g, q } = atTollhouse(23);
    g.pc.sheet.skillBought.science = 90;
    talk('d_th_terminal', g, q, ['(The pass format is a record format.', '(Take it.)']);
    expect(g.flags.th_hacked).toBe(true);
    expect(g.world.quests.q_a1_tollhouse.status).toBe('done');
    // By day, with the clerk a yard away, there is nothing to do.
    const d = atTollhouse(12);
    const r = new DialogueRunner(DIALOGUES.d_th_terminal, d.g, d.q);
    expect(r.view()!.options.map((o) => o.text)).toEqual(['(Not with him here.)']);
  });

  it('the chain-link goes over at night on a stealth check', () => {
    const { g, q } = atTollhouse(1);
    g.pc.sheet.skillBought.stealth = 90;
    talk('d_th_fence', g, q, ['(Wait for the lamp, then climb.)', '(Go.)']);
    expect(g.flags.th_sneaked).toBe(true);
    expect(g.world.quests.q_a1_tollhouse.status).toBe('done');
    const d = atTollhouse(12);
    const r = new DialogueRunner(DIALOGUES.d_th_fence, d.g, d.q);
    expect(r.view()!.text).toContain('daylight');
  });

  it('Vasha agrees to a raid and the gate talk turns to a fight', () => {
    const { g, q } = atTollhouse();
    g.locationId = 'rustdogs';
    talk('d_rd_vasha', g, q, ['What do you want from me?', 'Tollhouse 9.', 'Done.', '(Go.)']);
    expect(g.flags.rd_raid_agreed).toBe(true);
    g.locationId = 'tollhouse';
    talk('d_th_gate', g, q, ['Dogs. Now.']);
    expect(g.flags.th_fight).toBe(true);
    expect(g.flags.th_raid_started).toBe(true);
  });
});

describe('Tollhouse Ledger', () => {
  it('reads the entry at night, tears the page, and the sheriff keeps it', () => {
    const { g, q } = atTollhouse(23);
    talk('d_th_ledger', g, q, ['(Tear the page out.)']);
    expect(countItem(g.pc.inventory, 'k_ledger_page')).toBe(1);
    expect(g.world.leads.l_pike_paid).toBeTruthy();
    expect(g.world.quests.q_a1_ledger?.stage).toBe('evidence');
    g.locationId = 'shale'; g.flags.sh_ada_met = true;
    talk('d_sh_ada', g, q, ['Pike paid the outriders', 'Noted.']);
    expect(g.flags.ledger_shown_ada).toBe(true);
    expect(g.world.quests.q_a1_ledger.status).toBe('done');
    expect(countItem(g.pc.inventory, 'k_ledger_page')).toBe(0);
  });

  it('or Pike buys the page back and burns it', () => {
    const { g, q } = atTollhouse(23);
    talk('d_th_ledger', g, q, ['(Tear the page out.)']);
    g.locationId = 'shale'; g.flags.sh_pike_met = true;
    talk('d_sh_pike', g, q, ['(Put the Tollhouse ledger page', '(Sell it. 60 Tolls)', 'Later.']);
    expect(g.pc.inventory.tolls).toBe(60);
    expect(g.world.quests.q_a1_ledger.status).toBe('done');
    expect(g.world.quests.q_a1_ledger.stage).toBe('sold');
  });

  it('the outrider confesses to a strong talker, and the ledger line makes it easier', () => {
    const { g, q } = atTollhouse();
    g.world.knowledge.ledger_read = true;
    g.pc.sheet.skillBought.speech = 60;
    talk('d_th_sergeant', g, q, ['The outriders. Who are they?', 'That\'s all.']);
    talk('d_th_outrider_a', g, q, ['Three weeks ago.', 'Someone he walked', 'Say the name on the paper.', '(Walk away.)']);
    expect(g.world.knowledge.outriders_confessed).toBe(true);
    expect(g.world.leads.l_pike_paid).toBeTruthy();
  });
});
