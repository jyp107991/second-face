import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, MAPS, QUESTS, WORLD_EVENTS } from '../src/content';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { addItem, countItem, makeItem } from '../src/engine/inventory/inventory';
import { QuestEngine } from '../src/engine/quest/quest';
import { installChrome } from '../src/engine/stats/chrome';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';

/**
 * B3.11 — the date on the photograph (q_a2_calendar), the Archive Spire (q_a2_spire), the Court of Accounts (q_ca_court)
 * and Court Case: the Squatter (q_ca_squatter), played headless through every route to its outcome.
 */

type G = ReturnType<typeof newGameState>;

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

const options = (id: string, g: G, q: QuestEngine) => new DialogueRunner(DIALOGUES[id], g, q).view()?.options.map((o) => o.text) ?? [];

function inCity(map = 'md_spire', hour = 12) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 50 * 1440 + hour * 60;
  g.locationId = map;
  g.flags.ch1_done = true;
  g.flags.md_inside = true; g.flags.md_status = 'citizen'; g.flags.md_market_open = true;
  g.flags.visited_md_precinct = true; g.flags.visited_md_spire = true;
  addItem(g.pc.inventory, makeItem('k_photo'));
  const q = new QuestEngine(QUESTS, g);
  return { g, q };
}

/** Up the stair and read both drawers: the beat at its summons. */
function readTop(g: G, q: QuestEngine) {
  q.questStart('q_a2_spire');
  g.flags.ar_up = true; g.locationId = 'md_spire_top';
  talk('d_ar_reserves', g, q, ['(Drawer 9.)', '(Close the drawer.)', '(Leave them.)']);
  talk('d_ar_list', g, q, ['(Read on.)', '(Read on.)', '(Read on.)', '(Step back from the glass.)']);
}

describe('B3.11 places', () => {
  it('the Spire close is a lane north of the Precinct, and landing ninety-one is up its stair', () => {
    const lane = MAPS.md_precinct.exits?.find((e) => 'location' in e.to && e.to.location === 'md_spire');
    expect(lane).toBeDefined();
    expect(MAPS.md_spire.exits?.some((e) => 'location' in e.to && e.to.location === 'md_precinct')).toBe(true);
    const stair = MAPS.md_spire.exits?.find((e) => 'location' in e.to && e.to.location === 'md_spire_top');
    expect(stair?.if).toEqual({ flag: 'ar_up' });
    expect(MAPS.md_spire_top.exits?.some((e) => 'location' in e.to && e.to.location === 'md_spire')).toBe(true);
  });
});

describe('Forty-Nine: the date on the photograph', () => {
  it('starts when the Precinct beat ends', () => {
    const { g, q } = inCity('md_precinct');
    g.flags.md_status = undefined as never; g.flags.md_inside = false;
    q.questStart('q_a2_precinct');
    g.flags.md_inside = true; g.flags.md_status = 'citizen';
    q.update();
    expect(g.world.quests.q_a2_precinct.status).toBe('done');
    expect(g.world.quests.q_a2_calendar?.stage).toBe('back');
  });

  it('the board: the pencil, the Wall\'s year and the file\'s date make a conclusion, and the Spire opens', () => {
    const { g, q } = inCity('md_precinct');
    talk('d_photo_read', g, q, ['(Turn it over.)', '(Put it away.)']);
    talk('d_md_wall_sign', g, q, ['(Leave it.)']);
    expect(g.world.quests.q_a2_calendar?.stage).toBe('back');
    g.locationId = 'md_spire';
    talk('d_ar_board', g, q, ['(Leave it.)']);
    expect(g.world.leads.l_cal_pencil && g.world.leads.l_cal_year && g.world.leads.l_cal_r49).toBe(true);
    expect(tryConclude(g, ['l_cal_pencil', 'l_cal_year', 'l_cal_r49'], CONCLUSIONS, q)?.id).toBe('c_cal_future');
    q.update();
    expect(g.world.knowledge.cal_future).toBe(true);
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
    expect(g.world.quests.q_a2_spire?.stage).toBe('close');
  });

  it('Nine reads a date (clause 40 forbids a forecast, not a date)', () => {
    const { g, q } = inCity('md_precinct');
    q.questStart('q_a2_calendar');
    g.world.party.push('npc_md_nine'); g.flags.nine_joined = true;
    talk('d_photo_read', g, q, ['(Turn it over.)', '(Show Nine the back.)', '(Put it away.)']);
    expect(g.flags.cal_how).toBe('nine');
    expect(g.world.approval.npc_md_nine).toBe(3);
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
  });

  it('Odile reads a delivery date', () => {
    const { g, q } = inCity('md_precinct');
    q.questStart('q_a2_calendar');
    g.world.party.push('npc_nb_03');
    talk('d_photo_read', g, q, ['(Turn it over.)', '(Hand it to Odile.)', '(Put it away.)']);
    expect(g.flags.cal_how).toBe('odile');
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
  });

  it('the render code in the margin, typed into the records terminal', () => {
    const { g, q } = inCity('md_precinct');
    q.questStart('q_a2_calendar');
    g.pc.sheet.skillBought.science = 90;
    expect(options('d_md_records_term', g, q).some((t) => t.startsWith('(Type the code'))).toBe(false);
    talk('d_photo_read', g, q, ['(Turn it over.)', '(Put it away.)']);
    talk('d_md_records_term', g, q, ['(Type the code', '(Step back.)']);
    expect(g.flags.cal_how).toBe('render');
    expect(g.world.knowledge.cal_render).toBe(true);
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
  });

  it('eyes that are not your own read the microprint', () => {
    const { g, q } = inCity('md_precinct');
    q.questStart('q_a2_calendar');
    expect(installChrome(g.pc.sheet, 'ch_eye_heat', 1, 100, 5, 0.99)).toBe('clean');
    talk('d_photo_read', g, q, ['(Turn it over.)', '(Let your eyes find the microprint.)', '(Put it away.)']);
    expect(g.flags.cal_how).toBe('eyes');
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
  });

  it('the Saints\' wire, if the girl who hears was kept', () => {
    const { g, q } = inCity('md_bridgeward');
    q.questStart('q_a2_calendar');
    g.flags.bw_static = 'kept'; g.flags.verity_met = true;
    talk('d_bw_verity', g, q, ['(Show her the back of the photograph.)', 'That\'s all.']);
    expect(g.flags.cal_how).toBe('wire');
    expect(g.world.quests.q_a2_calendar.status).toBe('done');
  });
});

describe('Ninety-One Landings: up the stair', () => {
  const up = (g: G) => expect(g.flags.ar_up).toBe(true);

  it('the lens reads the file: admit on sight', () => {
    const { g, q } = inCity();
    g.world.knowledge.md_magistrate_designate = true;
    talk('d_ar_stair', g, q, ['(Face the lens on the post.)', '(Climb.)']);
    up(g);
    expect(g.flags.ar_entry).toBe('designate');
  });

  it('Nine makes a records request', () => {
    const { g, q } = inCity();
    g.world.party.push('npc_md_nine');
    talk('d_ar_stair', g, q, ['Nine. Make a records request.', '(Climb.)']);
    up(g);
    expect(g.flags.ar_entry).toBe('nine');
    expect(g.world.approval.npc_md_nine).toBe(5);
  });

  it('the keeper writes a next-of-kin slip, and the porter takes it', () => {
    const { g, q } = inCity();
    g.pc.sheet.skillBought.speech = 90;
    talk('d_ar_keeper', g, q, ['Reserve 9. I grew up at its door.', 'That\'s all.']);
    expect(countItem(g.pc.inventory, 'k_ar_slip')).toBe(1);
    expect(g.flags.ar_slip_how).toBe('petition');
    talk('d_ar_stair', g, q, ['(Give him the reading slip.)', '(Climb.)']);
    up(g);
    expect(countItem(g.pc.inventory, 'k_ar_slip')).toBe(0);
  });

  it('the keeper confesses the stranger\'s slip to someone who knows his stair', () => {
    const { g, q } = inCity();
    g.world.leads.l_rev_spire = true;
    talk('d_ar_keeper', g, q, ['A man came down your stair', 'Then give me one.', 'That\'s all.']);
    expect(g.world.knowledge.ar_keeper_confessed).toBe(true);
    expect(g.flags.ar_slip_how).toBe('keeper');
  });

  it('the catalogue terminal issues a clerk-grade slip', () => {
    const { g, q } = inCity();
    g.pc.sheet.skillBought.science = 90;
    talk('d_ar_catalogue', g, q, ['(Issue a reading slip', '(Step back.)']);
    expect(countItem(g.pc.inventory, 'k_ar_slip')).toBe(1);
  });

  it('fifty Tolls in the lamp-oil drawer', () => {
    const { g, q } = inCity();
    g.pc.inventory.tolls = 60;
    talk('d_ar_stair', g, q, ['(Put fifty Tolls on the desk.)', '(Climb.)']);
    up(g);
    expect(g.pc.inventory.tolls).toBe(10);
    expect(g.flags.ar_entry).toBe('paid');
  });

  it('past the sleeping porter at night; a creaking tread wakes him', () => {
    const a = inCity('md_spire', 23);
    a.g.pc.sheet.skillBought.stealth = 90;
    talk('d_ar_stair', a.g, a.q, ['(Up the stair past him', '(Climb.)']);
    expect(a.g.flags.ar_entry).toBe('stair');
    const b = inCity('md_spire', 23);
    b.g.pc.sheet.skillBought.stealth = 0;
    talk('d_ar_stair', b.g, b.q, ['(Up the stair past him', '(Leave it.)']);
    expect(b.g.flags.ar_up).toBeUndefined();
  });

  it('a Gridjack calls the dead service lift', () => {
    const { g, q } = inCity();
    expect(installChrome(g.pc.sheet, 'ch_neural_link', 1, 100, 5, 0.99)).toBe('clean');
    talk('d_ar_stair', g, q, ['(Think at the dead service lift.)', '(Climb.)']);
    expect(g.flags.ar_entry).toBe('lift');
  });
});

describe('Ninety-One Landings: the refusals, the list, the hearing', () => {
  it('Reserve 9\'s drawer holds MOTHER\'s three replies, and a copy can be made', () => {
    const { g, q } = inCity('md_spire_top');
    talk('d_ar_reserves', g, q, ['(Drawer 9.)', '(Copy the replies', '(Close the drawer.)', '(Leave them.)']);
    expect(g.world.knowledge.ar_refusals).toBe(true);
    expect(countItem(g.pc.inventory, 'k_ar_refusals')).toBe(1);
    expect(tryConclude(g, ['l_ar_refusals', 'l_c4_same_order'], CONCLUSIONS, q)?.id).toBe('c_ar_refusals');
  });

  it('the census answers Tamsin\'s question', () => {
    const { g, q } = inCity('md_spire_top');
    g.world.party.push('npc_c9_03'); g.flags.tam_s3 = true;
    q.questStart('q_comp_tamsin');
    talk('d_ar_reserves', g, q, ['(The census on the table.)', '(Let Tamsin read it.)', '(Back to the drawers.)', '(Leave them.)']);
    expect(g.flags.tam_why).toBe(true);
    expect(g.world.quests.q_comp_tamsin.stage).toBe('choice');
  });

  it('the list in full: twelve names decoded, the summons, and the plate warns about the Sink', () => {
    const { g, q } = inCity();
    readTop(g, q);
    expect(g.world.knowledge.ar_cast_list).toBe(true);
    for (let n = 1; n <= 12; n++) expect(g.world.knowledge[`name${n}_decoded`]).toBe(true);
    expect(g.world.quests.q_a2_spire.stage).toBe('summons');
    const plate = new DialogueRunner(DIALOGUES.d_ar_hearing, g, q).view()!;
    expect(plate.text).toContain('DIVERTED TO PRECINCT');
    g.flags.sk_pumps = 'paid';
    expect(new DialogueRunner(DIALOGUES.d_ar_hearing, g, q).view()!.text).toContain('VARIED');
  });

  const hear = (pick: string, speech = 0) => {
    const { g, q } = inCity();
    readTop(g, q);
    g.pc.sheet.skillBought.speech = speech;
    const r = talk('d_ar_hearing', g, q, ['(Go in.)', '(Sit in the chair.)', '(Listen.)', 'Why me?', '(Go on.)', '(Answer it.)', pick]);
    return { g, q, r };
  };

  it('agreed: the warrant, and the beat ends', () => {
    const { g, q } = hear('I agree.');
    expect(g.flags.ar_verdict).toBe('agreed');
    expect(countItem(g.pc.inventory, 'k_ar_warrant')).toBe(1);
    q.update();
    expect(g.world.quests.q_a2_spire.stage).toBe('agreed');
    expect(g.world.quests.q_a2_spire.status).toBe('done');
    expect(g.flags.a2_spire_done).toBe(true);
  });

  it('contested on the strength of the register; or noted when the argument fails', () => {
    const a = hear('I contest it.', 90);
    expect(a.g.flags.ar_verdict).toBe('contested');
    expect(a.g.world.quests.q_a2_spire.stage).toBe('contested');
    const b = hear('I contest it.', 0);
    expect(b.g.flags.ar_verdict).toBe('noted');
    expect(b.g.world.quests.q_a2_spire.stage).toBe('noted');
  });

  it('refused, or silent: both close the season', () => {
    const a = hear('No.');
    expect(a.g.flags.ar_verdict).toBe('refused');
    expect(a.g.world.quests.q_a2_spire.stage).toBe('refused');
    const b = hear('(Say nothing.');
    expect(b.g.flags.ar_verdict).toBe('silent');
    expect(b.g.world.quests.q_a2_spire.status).toBe('done');
  });

  it('the verdict closes the season: the Sink floods at dawn if its relief was left diverted', () => {
    const { g, q } = hear('No.');
    q.questStart('q_sk_highwater');
    q.questStart('q_sk_organ');
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toEqual([]);
    g.minutes += 24 * 60;
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('sink_spring');
    q.update();
    expect(g.flags.sk_flooded).toBe(true);
    expect(g.flags.ks_ocho).toBe('drowned');
    expect(g.world.quests.q_sk_highwater.stage).toBe('flooded');
    expect(g.world.quests.q_sk_highwater.status).toBe('failed');
    expect(g.world.quests.q_sk_organ.stage).toBe('drowned');
    expect(MAPS.md_sink.npcs?.find((n) => n.def === 'npc_sk_01')?.if).toEqual({ not: { flag: 'sk_flooded' } });
    g.locationId = 'md_sink';
    expect(new DialogueRunner(DIALOGUES.d_sk_pell, g, q).view()!.text).toContain('held the door');
  });

  it('a Sink already settled prevents the flood', () => {
    const { g, q } = hear('I agree.');
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toEqual([]);
    g.flags.sk_pumps = 'retimed';
    g.minutes += 24 * 60;
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('sink_spring');
    expect(g.world.events.sink_spring).toBe('prevented');
    expect(g.flags.sk_flooded).toBeUndefined();
  });
});

describe('Court of Accounts: forecast fines', () => {
  const court = () => {
    const c = inCity();
    c.g.flags.md_fines_contested = true; c.g.world.knowledge.md_court_heard = true;
    addItem(c.g.pc.inventory, makeItem('k_md_fine_notice'));
    c.q.questStart('q_ca_court');
    return c;
  };

  it('a forecast is not an act: the notice and the margin on the rail, and the fines are void', () => {
    const { g, q } = court();
    g.pc.sheet.skillBought.speech = 40;
    talk('d_ca_court', g, q, ['My fines.', '(Step up to the rail.)', '(Put the notice on the rail.)', '(Back to the rail.)', 'The desk warden said', '(Back to the rail.)', 'A forecast is not an act.', '(Step back from the rail.)']);
    expect(g.flags.ca_fines).toBe('void');
    expect(g.flags.prec_forecast_fine).toBe('void');
    expect(g.flags.ca_cases_heard).toBe(1);
    expect(g.flags.ca_precedents).toBe(1);
    expect(g.world.quests.q_ca_court.stage).toBe('docket');
    expect(options('d_ca_court', g, q).some((t) => t.startsWith('My fines.'))).toBe(false);
  });

  it('priced at its odds, the designate\'s courtesy, or upheld', () => {
    const a = court();
    a.g.pc.sheet.skillBought.barter = 90; a.g.pc.inventory.tolls = 40;
    talk('d_ca_court', a.g, a.q, ['My fines.', '(Step up to the rail.)', 'Then charge them at their odds.', '(Step back from the rail.)']);
    expect(a.g.flags.prec_forecast_fine).toBe('priced');
    expect(a.g.pc.inventory.tolls).toBe(13);
    const b = court();
    b.g.world.knowledge.md_magistrate_designate = true;
    talk('d_ca_court', b.g, b.q, ['My fines.', '(Step up to the rail.)', 'Read my file.', '(Step back from the rail.)']);
    expect(b.g.flags.prec_forecast_fine).toBe('designate');
    const c = court();
    c.g.pc.sheet.skillBought.speech = 0;
    talk('d_ca_court', c.g, c.q, ['My fines.', '(Step up to the rail.)', 'A forecast is not an act.', '(Step back from the rail.)']);
    expect(c.g.flags.prec_forecast_fine).toBe('upheld');
    expect(c.g.flags.ca_precedents).toBeUndefined();
  });

  it('an adjournment leaves the case on the docket and the rail as it was', () => {
    const { g, q } = court();
    talk('d_ca_court', g, q, ['My fines.', '(Step up to the rail.)', '(Put the notice on the rail.)', '(Back to the rail.)', '(Ask for an adjournment.)']);
    expect(g.flags.ca_fines).toBeUndefined();
    const r = talk('d_ca_court', g, q, ['My fines.', '(Step up to the rail.)']);
    expect(r.view()!.options.some((o) => o.text.startsWith('(Put the notice'))).toBe(false);
  });
});

describe('Court Case: the Squatter', () => {
  /** The hook (the usher), the occupant met, and the turn (the petition's schedule reference). */
  const investigate = () => {
    const c = inCity();
    talk('d_ca_usher', c.g, c.q, ['Who has nobody', 'That\'s all.']);
    expect(c.g.world.quests.q_ca_squatter?.stage).toBe('docket');
    talk('d_ar_copyist', c.g, c.q, ['Late?', '(Back.)', 'That\'s all.']);
    expect(c.g.world.quests.q_ca_squatter.stage).toBe('room');
    c.g.pc.inventory.tolls = 20;
    talk('d_ca_usher', c.g, c.q, ['A copy of the petition', 'That\'s all.']);
    expect(c.g.world.knowledge.ca_squatter_for_you).toBe(true);
    expect(countItem(c.g.pc.inventory, 'k_ca_petition')).toBe(1);
    return c;
  };

  it('living: she stands at the rail with the usher as witness; the record yields', () => {
    const { g, q } = investigate();
    talk('d_ca_usher', g, q, ['You bring her bread.', 'That\'s all.']);
    expect(g.flags.ca_florin_witness).toBe(true);
    g.pc.sheet.skillBought.speech = 45;
    talk('d_ar_copyist', g, q, ['Come down and stand', '(Back.)', 'Lend me the book', '(Back.)', 'That\'s all.']);
    expect(g.flags.ca_comfort_stands).toBe(true);
    talk('d_ca_court', g, q, ['Case 1187.', '(Step up to the rail.)', '(Step aside. Let her speak.)', '(Back to the rail.)', '(Call the usher.)', '(Back to the rail.)', '(Put the copyist\'s book on the rail.)', '(Back to the rail.)', 'She is alive.', '(Step back from the rail.)']);
    expect(g.flags.ca_squatter).toBe('living');
    expect(g.flags.prec_unrecorded).toBe('yields');
    expect(g.flags.prec_register).toBe('kept');
    expect(g.world.quests.q_ca_squatter.stage).toBe('living');
    expect(g.world.quests.q_ca_squatter.status).toBe('done');
    talk('d_ar_copyist', g, q, ['(Give the book back.)', 'That\'s all.']);
    expect(countItem(g.pc.inventory, 'k_ca_copybook')).toBe(0);
    expect(MAPS.md_spire.npcs?.find((n) => n.id === 'npc_ar_04_register')?.if).toEqual({ flag: 'ca_squatter', eq: 'living' });
  });

  it('living, on a doctor\'s certificate', () => {
    const { g, q } = investigate();
    g.pc.inventory.tolls = 30; g.locationId = 'md_precinct';
    talk('d_md_hast', g, q, ['There\'s a woman in the Spire', '(Pay. 25 Tolls)', 'That\'s all.']);
    expect(countItem(g.pc.inventory, 'k_ca_certificate')).toBe(1);
    g.locationId = 'md_spire'; g.pc.sheet.skillBought.speech = 30;
    talk('d_ca_court', g, q, ['Case 1187.', '(Step up to the rail.)', '(Put Dr Hast\'s certificate on the rail.)', '(Back to the rail.)', 'She is alive.', '(Step back from the rail.)']);
    expect(g.flags.ca_squatter).toBe('living');
  });

  it('outside: the record read against itself', () => {
    const { g, q } = investigate();
    g.pc.sheet.skillBought.science = 90;
    talk('d_ca_court', g, q, ['Case 1187.', '(Step up to the rail.)', 'Then there\'s no petition.', '(Step back from the rail.)']);
    expect(g.flags.ca_squatter).toBe('outside');
    expect(g.flags.prec_unrecorded).toBe('outside');
    expect(g.world.quests.q_ca_squatter.stage).toBe('outside');
  });

  it('refused: the designate refuses the room on the record', () => {
    const { g, q } = investigate();
    g.world.knowledge.md_magistrate_designate = true;
    g.pc.sheet.skillBought.speech = 90;
    talk('d_ca_court', g, q, ['Case 1187.', '(Step up to the rail.)', 'Read the petition\'s schedule reference', '(Back to the rail.)', 'The room is being cleared for me.', '(Step back from the rail.)']);
    expect(g.flags.ca_squatter).toBe('refused');
    expect(g.flags.prec_refuse_benefit).toBe(true);
    expect(new DialogueRunner(DIALOGUES.d_ar_board, g, q).view()!.text).toContain('REROUTED');
  });

  it('catalogued: her book sold to the keeper before the case is called', () => {
    const { g, q } = investigate();
    talk('d_ar_copyist', g, q, ['Lend me the book', '(Back.)', 'That\'s all.']);
    g.pc.inventory.tolls = 0;
    talk('d_ar_keeper', g, q, ['(Put the copyist\'s book on the counter.)', '(Sell it.', 'That\'s all.']);
    expect(g.pc.inventory.tolls).toBe(150);
    expect(g.flags.ca_squatter).toBe('catalogued');
    expect(g.flags.prec_register).toBe('catalogued');
    expect(g.world.quests.q_ca_squatter.stage).toBe('catalogued');
    expect(MAPS.md_sink.npcs?.some((n) => n.def === 'npc_ar_04' && JSON.stringify(n.if).includes('catalogued'))).toBe(true);
  });

  it('lost: a failed ground, and she is put outside the Wall as property', () => {
    const { g, q } = investigate();
    g.pc.sheet.skillBought.speech = 0;
    talk('d_ca_court', g, q, ['Case 1187.', '(Step up to the rail.)', 'She is alive.', '(Step back from the rail.)']);
    expect(g.flags.ca_squatter).toBe('lost');
    expect(g.flags.prec_unrecorded).toBe('property');
    expect(g.world.quests.q_ca_squatter.status).toBe('failed');
    expect(MAPS.md_precinct.npcs?.some((n) => n.def === 'npc_ar_04' && JSON.stringify(n.if).includes('lost'))).toBe(true);
  });

  it('two rulings close the Court\'s first docket; the register reads them back', () => {
    const { g, q } = investigate();
    q.questStart('q_ca_court');
    g.pc.sheet.skillBought.science = 90; g.pc.sheet.skillBought.speech = 90;
    talk('d_ca_court', g, q, ['Case 1187.', '(Step up to the rail.)', 'Then there\'s no petition.', '(Step back from the rail.)']);
    g.flags.md_fines_contested = true;
    talk('d_ca_court', g, q, ['My fines.', '(Step up to the rail.)', 'A forecast is not an act.', '(Step back from the rail.)']);
    expect(g.world.quests.q_ca_court.status).toBe('done');
    const r = talk('d_ca_docket', g, q, ['(The register of rulings', '(The unrecorded.)']);
    expect(r.view()!.text).toContain('NEITHER MOVE NOR SHELTER');
  });
});

describe('Court of Accounts: registration of Unit 9\'s title', () => {
  const deed = (how: string, name: string) => {
    const c = inCity();
    c.g.flags.nine_deed_made = true; c.g.flags.nine_deed_how = how; c.g.flags.nine_deed = name;
    c.g.world.party.push('npc_md_nine');
    return c;
  };

  it('a witnessed deed naming the unit: a unit may be its own keeper', () => {
    const { g, q } = deed('witnessed', 'self');
    talk('d_ca_court', g, q, ['Register a title.', '(Step up to the rail.)', 'Captain Lowe witnessed it', '(Back to the rail.)', '(Put the deed on the rail.) The keeper\'s line names Unit 9.', '(Step back from the rail.)']);
    expect(g.flags.ca_deed).toBe('self');
    expect(g.flags.prec_unit_keeper).toBe('self');
    // the unit's own word on it is an interjection (the Unity runtime applies its approval once)
    expect(DIALOGUES.d_ca_court.nodes.deed_r_self.interject?.[0]).toMatchObject({ companion: 'npc_md_nine', effects: [{ approval: { companion: 'npc_md_nine', by: 10 } }] });
  });

  it('a forged deed is voided, unless the argument carries it as irregular', () => {
    const a = deed('forged', 'self');
    talk('d_ca_court', a.g, a.q, ['Register a title.', '(Step up to the rail.)', '(Put the deed on the rail and say nothing.)', '(Step back from the rail.)']);
    expect(a.g.flags.ca_deed).toBe('voided');
    expect(a.g.flags.nine_deed_void).toBe(true);
    const b = deed('forged', 'self');
    b.g.pc.sheet.skillBought.speech = 90;
    talk('d_ca_court', b.g, b.q, ['Register a title.', '(Step up to the rail.)', 'Clause 9(b) says', '(Step back from the rail.)']);
    expect(b.g.flags.ca_deed).toBe('irregular');
    expect(b.g.flags.prec_unit_keeper).toBe('irregular');
  });
});

describe('B3.11 threads in other places', () => {
  it('the captain hears of the cup, the girl\'s sleep-talk and the verdict', () => {
    const { g, q } = inCity('md_precinct');
    g.flags.lowe_met = true; g.flags.cr_celestine_dead = true; g.flags.bw_static = 'silenced'; g.flags.ar_verdict = 'contested';
    talk('d_md_lowe', g, q, ['The Crown\'s hostess died', 'It was my hand.', 'That\'s all.']);
    expect(g.world.knowledge.lowe_cup_told).toBe(true);
    talk('d_md_lowe', g, q, ['The girl from the Saints\' tower.', 'That\'s all.']);
    expect(g.world.leads.l_ar_season).toBe(true);
    const r = talk('d_md_lowe', g, q, ['I was heard at the top of the Spire.']);
    expect(r.view()!.text).toContain('Contested');
    expect(options('d_md_lowe', g, q).some((t) => t.startsWith('The Crown\'s hostess'))).toBe(false);
  });

  it('the Sink\'s tally wall carries the copyist\'s name', () => {
    const { g, q } = inCity('md_sink');
    g.world.knowledge.ca_comfort_name = true;
    talk('d_sk_tally', g, q, ['(Look for ASAMOAH.)', '(Leave it.)']);
    expect(g.world.leads.l_ca_tally).toBe(true);
  });
});
