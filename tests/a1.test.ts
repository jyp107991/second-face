import { describe, expect, it } from 'vitest';
import { DIALOGUES, QUESTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { addItem, countItem, makeItem } from '../src/engine/inventory/inventory';
import { QuestEngine } from '../src/engine/quest/quest';
import { runTimers } from '../src/engine/world/logic';

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

  it('a guild courier contract is free passage with no clock on it', () => {
    const { g, q } = atTollhouse();
    talk('d_th_clerk', g, q, ['Contracts. What kind?', 'What\'s in it?', 'I\'ll carry it.', '(Take it.)']);
    expect(countItem(g.pc.inventory, 'k_packet')).toBe(1);
    expect(g.flags.th_contract).toBe(true);
    expect(g.world.timers.some((t) => t.id === 'th_packet_due')).toBe(false);
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

function atSignalHill(hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 12 * 1440 + hour * 60;
  g.locationId = 'signalhill';
  g.flags.visited_signalhill = true;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_a1_signal');
  return { g, q };
}

describe('The Hill with the Mast', () => {
  it('passing the wall starts the hill, and the hill ends pointing at Dry Wells', () => {
    const { g, q } = atTollhouse();
    g.pc.inventory.tolls = 20;
    talk('d_th_gate', g, q, ['(Pay. 20 Tolls)', '(Go through.)']);
    expect(g.world.quests.q_a1_signal?.stage).toBe('track');
    g.locationId = 'signalhill'; g.flags.visited_signalhill = true;
    g.pc.sheet.skillBought.speech = 90;
    talk('d_sg_camp', g, q, ['I\'m not here for copper', '(Go up.)']);
    expect(g.flags.sg_camp_passed).toBe(true);
  });

  it('the camp: pay, a board, speech, Wren, or the gully', () => {
    let s = atSignalHill();
    s.g.pc.inventory.tolls = 15;
    talk('d_sg_camp', s.g, s.q, ['(Pay the track toll. 15 Tolls)', '(Go up.)']);
    expect(s.g.flags.sg_camp_passed).toBe(true);
    s = atSignalHill();
    addItem(s.g.pc.inventory, makeItem('j_electronics'));
    talk('d_sg_camp', s.g, s.q, ['(Hold up a circuit board.)', '(Go up.)']);
    expect(s.g.flags.sg_traded).toBe(true);
    s = atSignalHill();
    s.g.pc.sheet.skillBought.speech = 90;
    talk('d_sg_camp', s.g, s.q, ['I\'m not here for copper', '(Go up.)']);
    expect(s.g.flags.sg_talked).toBe(true);
    s = atSignalHill();
    s.g.world.party.push('npc_rd_03');
    talk('d_sg_camp', s.g, s.q, ['Wren Calloway walks with me', '(Go up.)']);
    expect(s.g.flags.sg_wren).toBe(true);
    s = atSignalHill(2);
    s.g.pc.sheet.skillBought.stealth = 90;
    talk('d_sg_gully', s.g, s.q, ['(Go up quietly.)', '(Go on.)']);
    expect(s.g.flags.sg_sneaked).toBe(true);
    // A loud failure makes the camp alert and the price doubles.
    s = atSignalHill(12);
    for (const k of Object.keys(s.g.pc.sheet.baseAttrs) as (keyof typeof s.g.pc.sheet.baseAttrs)[]) s.g.pc.sheet.baseAttrs[k] = 1;
    s.g.pc.sheet.skillBought.stealth = 0;
    s.g.pc.inventory.tolls = 30;
    talk('d_sg_gully', s.g, s.q, ['(Go up quietly.)', '(Down.)']);
    expect(s.g.flags.sg_alert).toBe(true);
    const r = new DialogueRunner(DIALOGUES.d_sg_camp, s.g, s.q);
    expect(r.view()!.options.some((o) => o.text.includes('30 Tolls'))).toBe(true);
  });

  it('the relay answers east, feeds a line west, and takes a name', () => {
    const { g, q } = atSignalHill();
    g.flags.sg_camp_passed = true; g.flags.sg_station = true; q.update();
    expect(g.world.quests.q_a1_signal.stage).toBe('station');
    g.pc.sheet.skillBought.science = 90;
    talk('d_sg_relay', g, q, ['(Read the traffic log.)', '(Type at the cursor.)', '(Type a name that isn\'t yours.)', '(Step back.)']);
    expect(g.world.knowledge.relay_answers_city).toBe(true);
    expect(g.world.leads.l_relay_west_line).toBeTruthy();
    expect(g.flags.relay_named).toBe('false');
    expect(g.world.quests.q_a1_signal.status).toBe('done');
    expect(g.world.knowledge.loc_drywells).toBe(true);
  });

  it('the grid link option exists only with the implant', () => {
    const { g, q } = atSignalHill();
    const r = new DialogueRunner(DIALOGUES.d_sg_relay, g, q);
    expect(r.view()!.options.some((o) => o.text.includes('Listen through the link'))).toBe(false);
    g.pc.sheet.chrome = { neural: { id: 'ch_neural_link', condition: 1, installedDay: 1 } };
    talk('d_sg_relay', g, q, ['(Listen through the link.)', '(Pull out.)']);
    expect(g.world.knowledge.relay_grid_heard).toBe(true);
    expect(g.flags.relay_grid_filed).toBe(true);
  });

  it('the voice names the second pin; cut it or put it on the mast', () => {
    let s = atSignalHill();
    s.g.pc.sheet.skillBought.mechanics = 90;
    talk('d_sg_speaker', s.g, s.q, ['(Cut the speaker wire.)', '(Done.)']);
    expect(s.g.world.knowledge.name2_heard).toBe(true);
    expect(s.g.world.quests.q_a1_broadcast.stage).toBe('silenced');
    s = atSignalHill();
    s.g.pc.sheet.skillBought.science = 90;
    talk('d_sg_speaker', s.g, s.q, ['(Patch the speaker line', '(Done.)']);
    expect(s.g.flags.broadcast_amplified).toBe(true);
    expect(s.g.world.quests.q_a1_broadcast.status).toBe('done');
    expect(s.g.world.news.some((n) => n.tag === 'broadcast_kessler')).toBe(true);
  });
});

function inShale(day = 5) {
  const g = newGameState('c9', 0, 0);
  g.minutes = day * 1440 + 10 * 60;
  g.locationId = 'shale';
  g.flags.visited_shale = true;
  const q = new QuestEngine(QUESTS, g);
  return { g, q };
}

describe('The Month: Jonah Reese and the three ways', () => {
  it('reading the first name starts the month, which no clock ends: it ends with the water at Dry Wells', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_ch1_name');
    g.world.knowledge.name1_decoded = true;
    q.update();
    expect(g.world.quests.q_a1_jonah?.stage).toBe('month');
    expect(g.world.timers.find((x) => x.id === 'jonah_month')).toBeUndefined();
    g.minutes += 400 * 1440;
    runTimers(g, q); q.update();
    expect(g.world.quests.q_a1_jonah.stage).toBe('month');
    q.questStart('q_a1_drywells');
    g.flags.dw_admitted = true; g.flags.dw_control_open = true; g.flags.dw_kept = true; g.flags.dw_outcome = 'kept';
    q.update();
    expect(g.world.quests.q_a1_drywells.status).toBe('done');
    expect(g.flags.jonah_month_over).toBe(true);
    expect(g.world.quests.q_a1_jonah.stage).toBe('fell');
  });

  it('the month\'s end takes the first unblocked way, or none', () => {
    const run = (blocks: string[]) => {
      const { g, q } = inShale();
      q.questStart('q_a1_jonah');
      for (const b of blocks) g.flags[b] = true;
      g.flags.jonah_month_over = true;
      q.update();
      return g;
    };
    expect(run([]).world.quests.q_a1_jonah.stage).toBe('fell');
    expect(run([]).flags.jonah_death).toBe('fall');
    expect(run(['jonah_fall_blocked']).world.quests.q_a1_jonah.stage).toBe('fought');
    expect(run(['jonah_fall_blocked', 'jonah_fight_blocked']).world.quests.q_a1_jonah.stage).toBe('fevered');
    const lived = run(['jonah_fall_blocked', 'jonah_fight_blocked', 'jonah_fever_blocked']);
    expect(lived.world.quests.q_a1_jonah.stage).toBe('lived');
    expect(lived.flags.jonah_lived).toBe(true);
    expect(lived.flags.jonah_dead).toBeUndefined();
    expect(lived.world.leads.l_forecast_broken).toBeTruthy();
  });

  it('Jonah tells you his week, and can be talked off the tower', () => {
    const { g, q } = inShale();
    q.questStart('q_a1_jonah');
    g.flags.jonah_named = true;
    g.pc.sheet.skillBought.speech = 90;
    talk('d_sh_jonah', g, q, ['What does a deputy do with his week?', 'Noted.', 'Who walks the street at night?', 'Noted.', 'Where do you drink?', 'Noted.', 'Someone wrote your name on a list.', 'Then don\'t help them.', 'Good.', 'Something else.']);
    expect(g.world.knowledge.jonah_climbs && g.world.knowledge.jonah_patrols && g.world.knowledge.jonah_drinks).toBe(true);
    expect(g.flags.jonah_fall_blocked).toBe(true);
    expect(g.world.quests.q_a1_jonah.done).toContain('ways');
  });

  it('Dov\'s tower, Nell\'s water, and the Mender\'s filter each change a condition', () => {
    let s = inShale();
    s.g.world.knowledge.jonah_climbs = true; s.g.world.knowledge.dov_met = true;
    s.g.pc.sheet.skillBought.mechanics = 90;
    talk('d_sh_dov', s.g, s.q, ['Stop sending Jonah up the tower.', '(Go up and straighten the vane yourself.)', '(Done.)']);
    expect(s.g.flags.jonah_fall_blocked).toBe(true);
    s = inShale();
    s.g.world.knowledge.jonah_drinks = true;
    addItem(s.g.pc.inventory, makeItem('c_radflush'));
    talk('d_sh_nell', s.g, s.q, ['The east cistern\'s gone green.', '(Give her a Flush for him.)', 'Later.']);
    expect(s.g.flags.jonah_fever_blocked).toBe(true);
    expect(countItem(s.g.pc.inventory, 'c_radflush')).toBe(0);
    s = inShale();
    s.g.world.knowledge.jonah_drinks = true; s.g.pc.inventory.tolls = 30;
    talk('d_sh_yusra', s.g, s.q, ['The east cistern. Could you build a filter', '(Pay. 30 Tolls)', 'Done.']);
    expect(s.g.flags.jonah_fever_blocked).toBe(true);
  });

  it('drills put pairs on the street from the first night; three days later nine rifles shoot', () => {
    const { g, q } = inShale();
    q.questStart('q_a1_jonah');
    g.pc.sheet.skillBought.firearms = 40;
    talk('d_sh_issa', g, q, ['Your four that shoot could be nine.', 'Dawn, then.']);
    expect(g.flags.drills_started).toBe(true);
    expect(g.world.quests.q_sh_drills?.stage).toBe('drill');
    expect(g.flags.jonah_fight_blocked).toBe(true);
    g.minutes += 3 * 1440 + 1;
    runTimers(g, q);
    q.update();
    expect(g.flags.militia_drilled).toBe(true);
    expect(g.world.quests.q_sh_drills.status).toBe('done');
    expect(g.world.news.some((n) => n.tag === 'militia_drilled')).toBe(true);
  });

  it('Ilya can be shamed sober or taken east; the party knows him', () => {
    let s = inShale();
    s.g.flags.drills_started = true; s.g.world.knowledge.overpass_dogs = true;
    s.g.pc.sheet.skillBought.speech = 90;
    talk('d_sh_ilya', s.g, s.q, ['Who are you?', 'Before what?', 'Right.', 'Come east with me.', 'Because the militia has nine rifles', 'Keep up.']);
    expect(s.g.world.party).toContain('npc_sh_17');
    expect(s.g.flags.ilya_recruited).toBe(true);
    const r = new DialogueRunner(DIALOGUES.d_sh_ilya, s.g, s.q);
    expect(r.view()!.options.some((o) => o.text.startsWith('Wait here'))).toBe(true);
    s = inShale();
    s.g.flags.drills_started = true;
    s.g.pc.sheet.skillBought.speech = 90;
    talk('d_sh_ilya', s.g, s.q, ['You\'re drunk in front of boys', '(Leave him to it.)']);
    expect(s.g.flags.ilya_shamed).toBe(true);
    expect(s.g.world.party).not.toContain('npc_sh_17');
    // Outshooting him works without a silver tongue.
    s = inShale();
    s.g.flags.drills_started = true; s.g.world.knowledge.overpass_dogs = true;
    s.g.pc.sheet.skillBought.firearms = 90;
    talk('d_sh_ilya', s.g, s.q, ['Come east with me.', '(Pick up the bottle.', 'Keep up.']);
    expect(s.g.world.party).toContain('npc_sh_17');
  });

  it('Ada answers the month either way', () => {
    let s = inShale();
    s.g.flags.sh_ada_met = true; s.g.flags.jonah_dead = true; s.g.flags.jonah_death = 'fight';
    const r = talk('d_sh_ada', s.g, s.q, ['Jonah.']);
    expect(r.view()!.text).toContain('East street');
    expect(s.g.flags.ada_broke).toBe(true);
    s = inShale();
    s.g.flags.sh_ada_met = true; s.g.flags.jonah_lived = true;
    talk('d_sh_ada', s.g, s.q, ['The month\'s out. He\'s alive.', 'Noted.']);
    expect(s.g.world.knowledge.ada_threw_pike_out).toBe(true);
  });
});

function atDryWells(hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 12 * 1440 + hour * 60;
  g.locationId = 'drywells';
  g.flags.visited_drywells = true;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_a1_drywells');
  return { g, q };
}

describe('The Water Clock: Dry Wells', () => {
  it('the hill done starts the water clock; the approach has six ways past the rifle', () => {
    const { g, q } = atSignalHill();
    g.flags.sg_camp_passed = true; g.flags.sg_station = true; g.world.knowledge.relay_answers_city = true; q.update();
    expect(g.world.quests.q_a1_drywells?.stage).toBe('track');
    let s = atDryWells();
    s.g.world.leads.l_relay_west_line = { at: 0 } as never;
    talk('d_dw_approach', s.g, s.q, ['I came from Signal Hill', '(Go in.)', '(Go in.)']);
    expect(s.g.flags.dw_admitted).toBe(true);
    expect(s.g.world.quests.q_a1_drywells.stage).toBe('station');
    s = atDryWells();
    s.g.origin = 'pump_hand';
    talk('d_dw_approach', s.g, s.q, ['(Look at the station, not at her.)', '(Go in.)', '(Go in.)']);
    expect(s.g.flags.dw_pumphand).toBe(true);
    s = atDryWells();
    s.g.world.party.push('npc_sh_17');
    talk('d_dw_approach', s.g, s.q, ['(Let Ilya speak.)', '(Go in.)', '(Go in.)']);
    expect(s.g.flags.dw_ilya).toBe(true);
    s = atDryWells();
    s.g.pc.sheet.skillBought.speech = 90;
    talk('d_dw_approach', s.g, s.q, ['I\'m from Shale.', 'I don\'t know what valve.', '(Go in.)']);
    expect(s.g.flags.dw_talked).toBe(true);
    s = atDryWells();
    s.g.pc.inventory.tolls = 10;
    talk('d_dw_approach', s.g, s.q, ['(Hold up ten Tolls.)', '(Go in.)']);
    expect(s.g.flags.dw_paid).toBe(true);
    expect(s.g.pc.inventory.tolls).toBe(0);
    s = atDryWells();
    talk('d_dw_approach', s.g, s.q, ['(Draw.)']);
    expect(s.g.flags.dw_fight).toBe(true);
  });

  it('Oriel tells the family\'s story, which starts the ghosts, and gives the key on a promise or to a pump hand', () => {
    let s = atDryWells();
    s.g.flags.dw_admitted = true; s.q.update();
    s.g.pc.sheet.skillBought.speech = 90; s.g.world.knowledge.dw_control_locked = true;
    talk('d_dw_oriel', s.g, s.q, ['Who are you people?', 'Why here?', 'Noted.', 'The room at the end of the station.', 'Give it to me and I\'ll see your family stays.', '(Take it.)']);
    expect(s.g.world.quests.q_dw_ghosts?.stage).toBe('squat');
    expect(countItem(s.g.pc.inventory, 'k_station_key')).toBe(1);
    expect(s.g.flags.dw_promised_stay).toBe(true);
    expect(s.g.world.knowledge.dw_override_word).toBe(true);
    s = atDryWells();
    s.g.flags.dw_admitted = true; s.g.origin = 'pump_hand'; s.g.world.knowledge.dw_control_locked = true;
    talk('d_dw_oriel', s.g, s.q, ['The station. Sable says', '(Tell her what the clock sounds like', '(Take it.)']);
    expect(s.g.flags.dw_oriel_key).toBe(true);
    // Or it is taken, and the family remembers.
    s = atDryWells();
    s.g.flags.dw_admitted = true; s.g.world.knowledge.dw_control_locked = true;
    talk('d_dw_oriel', s.g, s.q, ['The station. Sable says', '(Take it off her neck.)', '(Go.)']);
    expect(s.g.flags.dw_key_forced).toBe(true);
    expect(countItem(s.g.pc.inventory, 'k_station_key')).toBe(1);
  });

  it('the door: key, picks, or a shoulder', () => {
    let s = atDryWells();
    addItem(s.g.pc.inventory, makeItem('k_station_key'));
    talk('d_dw_door', s.g, s.q, ['(Use the brass key.)', '(Go in.)']);
    expect(s.g.flags.dw_control_open).toBe(true);
    s = atDryWells();
    s.g.pc.sheet.skillBought.security = 90;
    talk('d_dw_door', s.g, s.q, ['(Pick it.)', '(Go in.)']);
    expect(s.g.flags.dw_door_picked).toBe(true);
    s = atDryWells();
    s.g.pc.sheet.baseAttrs.brawn = 10;
    talk('d_dw_door', s.g, s.q, ['(Force it.)', '(Go in.)']);
    expect(s.g.flags.dw_door_forced).toBe(true);
  });

  it('the console: science restores the water, the pump man\'s word restores it without a check, or it is left', () => {
    let s = atDryWells();
    s.g.flags.dw_admitted = true; s.g.flags.dw_control_open = true; s.q.update();
    expect(s.g.world.quests.q_a1_drywells.stage).toBe('console');
    s.g.pc.sheet.skillBought.science = 90;
    talk('d_dw_console', s.g, s.q, ['(Override the schedule.', '(Step back.)']);
    expect(s.g.flags.dw_outcome).toBe('restored');
    expect(s.g.world.quests.q_a1_drywells.status).toBe('done');
    expect(s.g.world.quests.q_a1_drywells.stage).toBe('restored');
    expect(s.g.flags.jonah_month_over).toBe(true);
    expect(s.g.flags.a1_finale).toBe('restored');
    expect(s.g.world.news.some((n) => n.tag === 'water_restored')).toBe(true);
    expect(s.g.world.timers.some((t) => t.id === 'a1_end_card')).toBe(true);
    s = atDryWells();
    s.g.flags.dw_admitted = true; s.g.flags.dw_control_open = true; s.g.world.knowledge.dw_override_word = true; s.g.flags.dw_oriel_key = true;
    const r = talk('d_dw_console', s.g, s.q, ['(Enter the pump man\'s credential']);
    expect(r.view()!.text).toContain('MAINT AUTH: MARR');
    expect(s.g.flags.dw_how).toBe('word');
    s = atDryWells();
    s.g.flags.dw_admitted = true; s.g.flags.dw_control_open = true;
    talk('d_dw_console', s.g, s.q, ['(Leave the schedule as it is.)', '(Leave it. It isn\'t yours to change', '(Step back.)']);
    expect(s.g.flags.dw_outcome).toBe('kept');
    expect(s.g.world.quests.q_a1_drywells.stage).toBe('kept');
    expect(s.g.flags.shale_withers).toBe(true);
  });

  it('the pump hand finds the Cistern on the schedule', () => {
    const s = atDryWells();
    s.g.origin = 'pump_hand';
    talk('d_dw_console', s.g, s.q, ['(Find the Cistern on the schedule.)', '(Read on.)', '(Step back.)']);
    expect(s.g.world.knowledge.c9_fed_from_outside).toBe(true);
    expect(s.g.world.leads.l_c9_fed).toBeTruthy();
    const r = new DialogueRunner(DIALOGUES.d_dw_console, atDryWells().g, atDryWells().q);
    expect(r.view()!.options.some((o) => o.text.includes('Find the Cistern'))).toBe(false);
  });

  it('the governor breaks for a mechanic, and the diary gives the word', () => {
    let s = atDryWells();
    s.g.flags.dw_admitted = true; s.g.flags.dw_control_open = true; s.q.update();
    s.g.pc.sheet.skillBought.mechanics = 90;
    talk('d_dw_panel', s.g, s.q, ['(Break the governor.)', '(Step back.)']);
    expect(s.g.flags.dw_outcome).toBe('freed');
    expect(s.g.world.quests.q_a1_drywells.stage).toBe('freed');
    s = atDryWells();
    talk('d_dw_diary_table', s.g, s.q, ['(Read it.)', '(Take it.)', '(Go.)']);
    expect(s.g.world.knowledge.dw_override_word).toBe(true);
    expect(countItem(s.g.pc.inventory, 'k_pumpman_diary')).toBe(1);
  });

  it('Pike buys the console; the guild takes the station and Ada throws you out', () => {
    const s = inShale();
    s.q.questStart('q_a1_drywells');
    s.g.flags.dw_admitted = true; s.g.flags.dw_control_open = true; s.g.flags.dw_console_seen = true; s.g.flags.sh_pike_met = true; s.q.update();
    talk('d_sh_pike', s.g, s.q, ['The console at Dry Wells.', '(Take the money.)', 'As per.']);
    expect(s.g.pc.inventory.tolls).toBe(150);
    expect(s.g.flags.dw_outcome).toBe('sold');
    expect(s.g.flags.escort_east).toBe('tollmen');
    expect(s.g.world.quests.q_a1_drywells.stage).toBe('sold');
    expect(s.g.flags.shale_company_town).toBe(true);
    s.g.flags.sh_ada_met = true;
    const r = talk('d_sh_ada', s.g, s.q, ['Dry Wells. The station there sets your water.']);
    expect(r.view()!.text).toContain('rate card');
    expect(r.view()!.options.map((o) => o.text)).toEqual(['(Go.)']);
    r.choose(r.view()!.options[0].id);
    expect(s.g.flags.ada_dw_told).toBe(true);
    expect(s.g.world.relations.npc_sh_01?.trust ?? 0).toBeLessThan(0);
  });

  it('the ghosts: Ada says yes or no, and the family walks, takes the road, or stays', () => {
    let s = inShale();
    s.g.flags.sh_ada_met = true; s.g.world.knowledge.dw_oriel_would_go = true; s.g.flags.dw_restored = true; s.g.pc.sheet.skillBought.speech = 50;
    s.q.questStart('q_dw_ghosts');
    talk('d_sh_ada', s.g, s.q, ['Five people live at Dry Wells', 'Three generations out of a cistern', 'Noted.']);
    expect(s.g.flags.ada_ghosts_ok).toBe(true);
    s.g.locationId = 'drywells'; s.g.flags.dw_oriel_met = true;
    talk('d_dw_oriel', s.g, s.q, ['Sheriff Vey says yes.', '(Help her up.)']);
    expect(s.g.flags.dw_ghosts_shale).toBe(true);
    expect(s.g.flags.dw_valve_closed).toBe(true);
    expect(s.g.world.quests.q_dw_ghosts.stage).toBe('shale');
    s = atDryWells();
    s.g.flags.dw_oriel_met = true; s.g.world.knowledge.dw_origin_known = true; s.g.pc.inventory.tolls = 40;
    s.q.questStart('q_dw_ghosts');
    talk('d_dw_oriel', s.g, s.q, ['(Forty Tolls.)', 'Noted.']);
    expect(s.g.world.quests.q_dw_ghosts.stage).toBe('moved');
    s = atDryWells();
    s.g.flags.dw_oriel_met = true; s.g.world.knowledge.dw_origin_known = true; s.g.world.knowledge.dw_bypass_known = true;
    s.q.questStart('q_dw_ghosts');
    talk('d_dw_oriel', s.g, s.q, ['Stay, then.', 'Noted.']);
    expect(s.g.world.quests.q_dw_ghosts.stage).toBe('left');
    // Sable walks you east only if the water runs.
    s = atDryWells();
    s.g.flags.dw_outcome = 'restored'; s.g.flags.dw_restored = true; s.g.flags.dw_sable_met = true;
    talk('d_dw_sable', s.g, s.q, ['East. What\'s past the windpumps?', 'To the glass, then.', 'That\'s all.']);
    expect(s.g.flags.escort_east).toBe('sable');
  });
});
