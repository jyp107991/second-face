import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, MAPS, NPCS, QUESTS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { LEASHED } from '../src/content/chrome/catalogue';
import { SITES } from '../src/content/world/sites';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';

/**
 * B4a — the Skirts under Halcyon: the place and beat 16's opening, the Cave-In and the Shift's strike (every way it ends),
 * Spare Parts, Scrip, and Kes Oyelaran's arc (joining, four stages, her own quest by every route, the romance, the two
 * exchanges, her red line, leaving and coming back). Played headless.
 */

type G = ReturnType<typeof newGameState>;
const KES = 'npc_hs_01';
const NINE = 'npc_md_nine';
const ODILE = 'npc_nb_03';
const ASH = 'npc_of_03';
const WREN = 'npc_rd_03';

/** Play a conversation by choosing options whose text starts with the given prefixes, in order. */
function talk(id: string, g: G, q: QuestEngine, picks: string[] = []): DialogueRunner {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  r.view();   // what is on screen fires its passives
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
const approval = (g: G, who = KES) => g.world.approval[who] ?? 0;
const stage = (g: G, quest: string) => g.world.quests[quest]?.stage;
const status = (g: G, quest: string) => g.world.quests[quest]?.status;
/** Forward to the next time the clock shows `hour`:00. */
function hour(g: G, h: number): void {
  let t = Math.floor(g.minutes / 1440) * 1440 + h * 60;
  if (t <= g.minutes) t += 1440;
  g.minutes = t;
}

function inSkirts(h = 10) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 90 * 1440 + h * 60;
  g.locationId = 'hs_skirts';
  g.flags.ch1_done = true;
  g.flags.a2_spire_done = true;
  g.pc.inventory.tolls = 600;
  const q = new QuestEngine(QUESTS, g);
  apply(trigger('hs_skirts', 'arrive').effects, g, q);
  q.update();
  return { g, q };
}

/** Maren met, her leave, down the cage at night with Orrin, the board, the pillars, the fall, and back up. */
function gallery(g: G, q: QuestEngine) {
  apply(trigger('hs_skirts', 'pithead').effects, g, q); q.update();
  talk('d_hs_maren', g, q, ['What happened at Six?', 'Can I see the gallery?']);
  talk('d_hs_tomas', g, q, ['That\'s all.']);
  hour(g, 23);
  talk('d_hs_tomas', g, q, ['Maren says take me down.']);
  g.locationId = 'hs_six';
  skills(g, { survival: 90 });
  talk('d_hs_six_board', g, q, ['(Tear the log sheet off the board.)']);
  talk('d_hs_six_pillars', g, q);
  talk('d_hs_six_fall', g, q, ['(Dig carefully to the lamps at the edge.)']);
  talk('d_hs_six_cage', g, q, ['(Pull the bell. Go up.)']);
  g.locationId = 'hs_skirts';
}

/** The Concern's answer comes up the Line at seven (it waits for the player to be in the Skirts). */
function scabTrain(g: G, q: QuestEngine) {
  runWorldEvents(g, WORLD_EVENTS, q);
  hour(g, 7);
  expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('hs_scab_train');
  q.update();
}

/** Call the vote at the Lodge and speak for the side named. */
function vote(g: G, q: QuestEngine, picks: string[]) {
  talk('d_hs_maren', g, q, ['Call the vote.', '(The Lodge, that night.)', ...picks]);
}

// ---------------------------------------------------------------- the place

describe('B4a: the Skirts as a place', () => {
  it('stands at the Teeth\'s world location with a settlement, the Line\'s last stop and its site in the one world', () => {
    const loc = WORLD_MAP.locations.skirts;
    expect(loc).toMatchObject({ settlement: 'skirts', map: 'hs_skirts', region: 'teeth' });
    expect(WORLD_MAP.networks.net_line.stops).toContain('skirts');
    expect(SETTLEMENTS.skirts).toMatchObject({ region: 'teeth', crisis: 'strike' });
    expect(SETTLEMENTS.meridian.roads.skirts).toBe(SETTLEMENTS.skirts.roads.meridian);
    expect(SITES.hs_skirts).toMatchObject({ kind: 'open', at: 'skirts' });
    expect(SITES.hs_six).toMatchObject({ kind: 'cell' });
    expect(MAPS.hs_six.interior).toBe(true);
    for (const s of ['start', 'from_meridian', 'from_halt_e', 'from_mine_teeth', 'from_halcyon', 'cage']) expect(MAPS.hs_skirts.spawns.some((x) => x.id === s)).toBe(true);
  });

  it('the Spire\'s end opens beat 16: the Concern\'s letter, the card, and the Line east', () => {
    const g = newGameState('c9', 0, 0);
    const q = new QuestEngine(QUESTS, g);
    q.questStart('q_a2_spire');
    q.questStage('q_a2_spire', 'agreed');
    q.update();
    expect(stage(g, 'q_a2_halcyon')).toBe('invite');
    expect(g.pc.inventory.items.some((i) => i.def === 'k_hc_invitation')).toBe(true);
    expect(g.world.post?.some((p) => p.text.includes('THE BOARD OF THE CONCERN'))).toBe(true);
    g.flags.visited_skirts = true;
    q.update();
    expect(stage(g, 'q_a2_halcyon')).toBe('skirts');
  });

  it('arriving opens the beat for older saves; the car is stopped by the strike; the Line board hails the designate', () => {
    const { g, q } = inSkirts();
    expect(stage(g, 'q_a2_halcyon')).toBe('skirts');
    expect(view('d_hs_car', g, q).text).toContain('SERVICE SUSPENDED');
    apply(trigger('hs_skirts', 'hail').effects, g, q);
    expect(g.flags.kes_hailed).toBe(true);
    expect(cond(trigger('hs_skirts', 'hail').if, g)).toBe(false);   // once
    talk('d_hs_bell', g, q, ['When does the car run?']);
    expect(g.flags.hs_bell_met).toBe(true);
    expect(g.world.knowledge.hs_appointment).toBe(true);
  });

  it('two new Concern pieces are networked, fitted at the Weighhouse, and the Leash is a condition anyone can read', () => {
    expect(CHROME.ch_spine_hauler).toMatchObject({ grade: 'concern', networked: true });
    expect(CHROME.ch_neural_lattice).toMatchObject({ grade: 'concern', networked: true });
    expect(NPCS.npc_hs_07.surgeon!.stock).toContain('ch_spine_hauler');
    const g = newGameState('c9', 0, 0);
    expect(cond(LEASHED, g)).toBe(false);
    g.pc.sheet.chrome = { spine: { id: 'ch_spine_hauler', condition: 1, installedDay: 0 } };
    expect(cond(LEASHED, g)).toBe(true);
    g.pc.sheet.chrome = { spine: { id: 'ch_spine_load', condition: 1, installedDay: 0 } };
    expect(cond(LEASHED, g)).toBe(false);
  });

  it('every node in the Skirts\' trees has a line for coming back to it (U7), or only leaves', () => {
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!id.startsWith('d_hs_')) continue;
      for (const [nid, n] of Object.entries(d.nodes)) {
        const onlyExits = n.options.every((o) => o.exit);
        if (!onlyExits) expect(n.again, `${id}/${nid}`).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------- Six East and the Shift

describe('Six East: the cave-in', () => {
  it('down the cage with Maren\'s leave and Orrin at night: the log, the robbed pillars, the eleven\'s tags', () => {
    const { g, q } = inSkirts();
    gallery(g, q);
    expect(g.pc.inventory.items.some((i) => i.def === 'k_hs_log')).toBe(true);
    expect(g.pc.inventory.items.some((i) => i.def === 'k_hs_tags')).toBe(true);
    expect(g.world.knowledge.hs_robbed).toBe(true);
    expect(stage(g, 'q_hs_cavein')).toBe('robbed');
    expect(status(g, 'q_hs_shift')).toBe('active');
  });

  it('by day the Clean hold the cage; at night past the sleeper and the winch yourself', () => {
    const { g, q } = inSkirts(12);
    expect(options('d_hs_cage', g, q).some((t) => t.startsWith('(Slip past'))).toBe(false);
    hour(g, 23);
    skills(g, { stealth: 90, mechanics: 90 });
    talk('d_hs_cage', g, q, ['(Slip past the sleeping guard', '(Let the brake off by inches.)']);
    expect(g.flags.hs_six_visited).toBe(true);
  });

  it('the trapper boy: geological until the Shift feeds his mother, then the truth', () => {
    const { g, q } = inSkirts();
    talk('d_hs_pim', g, q, ['Why do you keep saying that word?']);
    expect(g.world.knowledge.hs_pim_rations).toBe(true);
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    talk('d_hs_maren', g, q, ['Pim Rasul says']);
    expect(g.flags.hs_pim_fed).toBe(true);
    talk('d_hs_pim', g, q, ['The Shift will feed your mother']);
    expect(g.flags.hs_pim_word).toBe(true);
    expect(g.world.knowledge.hs_robbed).toBe(true);
  });

  it('the proof sold back to Dysart: he burns it', () => {
    const { g, q } = inSkirts();
    gallery(g, q);
    talk('d_hs_dysart', g, q, ['That\'s all.']);
    talk('d_hs_dysart', g, q, ['Pillars fourteen to twenty-two', 'What\'s it worth to you', '(Put it on the desk.)']);
    expect(g.flags.hs_cavein).toBe('sold');
    expect(stage(g, 'q_hs_cavein')).toBe('sold');
    expect(g.pc.inventory.items.some((i) => i.def === 'k_hs_log')).toBe(false);
    expect(approval(g)).toBe(-15);
  });

  it('the eleven brought up with the Shift at night: graves on the slope, and the player is Shift', () => {
    const { g, q } = inSkirts();
    gallery(g, q);
    talk('d_hs_maren', g, q, ['I\'ve seen what happened in Six East', 'It\'s the Shift\'s. Use it.']);
    expect(stage(g, 'q_hs_cavein')).toBe('shift');
    talk('d_hs_maren', g, q, ['Bring the eleven up.', '(The slope, at dawn.)']);
    expect(g.flags.hs_dead_up).toBe(true);
    expect(cond({ member: 'the_shift' }, g)).toBe(true);
    expect(status(g, 'q_hs_cavein')).toBe('done');
    expect(view('d_hs_graves', g, q).text).toContain('filled');
  });
});

describe('No Lamps Down: every way the strike ends', () => {
  it('the claim at the Contract Office with the order: upheld as written, Maren lives, the car runs, Nils walks', () => {
    const { g, q } = inSkirts();
    gallery(g, q);
    skills(g, { speech: 60 });
    talk('d_hs_dysart', g, q, ['That\'s all.']);
    talk('d_hs_dysart', g, q, ['Pillars fourteen to twenty-two', 'The order.']);
    expect(g.pc.inventory.items.some((i) => i.def === 'k_hs_order')).toBe(true);
    talk('d_hs_maren', g, q, ['I\'ve seen what happened in Six East', 'It\'s the Shift\'s. Use it.']);
    talk('d_hs_maren', g, q, ['The claim. Let\'s take it', '(Go to the Contract Office with her.)']);
    talk('d_hs_bell', g, q, ['That\'s all.']);
    const v = view('d_hs_bell', g, q).options.find((o) => o.text.startsWith('A claim under Clause 11'))!;
    expect(v).toBeDefined();
    talk('d_hs_bell', g, q, ['A claim under Clause 11', '(Lay out the grounds']);
    expect(g.flags.hs_claim).toBe('upheld');
    expect(g.flags.hs_shift).toBe('won');
    expect(g.flags.ks_maren).toBe('lives');
    expect(g.flags.forecast_broken).toBe(true);
    expect(g.flags.hs_nils).toBe('freed');
    expect(status(g, 'q_hs_shift')).toBe('done');
    expect(stage(g, 'q_a2_halcyon')).toBe('car');
    expect(status(g, 'q_hs_cavein')).toBe('done');
    expect(cond(placed('hs_skirts', 'npc_hs_05').if, g)).toBe(false);   // Dysart recalled up the hill
    expect(view('d_hs_car', g, q).text).toContain('CONTRACTS AND THE BOARD');
  });

  it('a claim without the order is denied; it can be refiled once with it', () => {
    const { g, q } = inSkirts();
    gallery(g, q);
    skills(g, { speech: 0 });
    talk('d_hs_maren', g, q, ['I\'ve seen what happened in Six East', 'It\'s the Shift\'s. Use it.']);
    talk('d_hs_maren', g, q, ['The claim. Let\'s take it', '(Go to the Contract Office with her.)']);
    talk('d_hs_bell', g, q, ['That\'s all.']);
    talk('d_hs_bell', g, q, ['A claim under Clause 11', '(Lay out the grounds']);
    expect(g.flags.hs_claim).toBe('denied');
    expect(g.flags.hs_shift).toBeUndefined();
    apply([{ give: 'k_hs_order' }], g, q);
    skills(g, { speech: 60 });
    talk('d_hs_bell', g, q, ['We refile. With the order.']);
    expect(g.flags.hs_claim).toBe('upheld');
    expect(g.flags.hs_shift).toBe('won');
  });

  it('the scabs turned with the truth, then the vote to hold: Dysart brings the terms at dawn', () => {
    const { g, q } = inSkirts();
    gallery(g, q);
    scabTrain(g, q);
    expect(stage(g, 'q_hs_shift')).toBe('answer');
    expect(cond(placed('hs_skirts', 'npc_hs_13').if, g)).toBe(true);
    skills(g, { speech: 60 });
    talk('d_hs_nowak', g, q, ['Six East came down on eleven men']);
    expect(g.flags.hs_scabs).toBe('turned');
    expect(cond(placed('hs_skirts', 'npc_hs_13_lodge').if, g)).toBe(true);
    vote(g, q, ['(Speak for holding.)', '(Dawn.)', '(Go out into the morning.)']);
    expect(g.flags.hs_vote).toBe('hold');
    expect(g.flags.hs_shift).toBe('won');
    expect(g.flags.hs_shift_how).toBe('vote');
    expect(g.flags.ks_maren).toBe('lives');
    expect(stage(g, 'q_a2_halcyon')).toBe('car');
  });

  it('the scabs\' paper bought at the counter (Odile talks it down to eighty), then a silent vote holds', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    scabTrain(g, q);
    g.world.party.push(ODILE);
    talk('d_hs_bell', g, q, ['That\'s all.']);
    talk('d_hs_bell', g, q, ['Twenty contracts came up the Line', '(Odile leans on the counter', '(Back to the counter.)', '(Pay eighty.)']);
    expect(g.flags.hs_scabs).toBe('sent');
    expect(g.pc.inventory.tolls).toBe(520);
    vote(g, q, ['(Say nothing. It\'s theirs.)', '(Dawn.)', '(Go out into the morning.)']);
    expect(g.flags.hs_shift).toBe('won');
  });

  it('the scabs walked through for Dysart\'s sixty: holding is starving, and the Concern hangs Maren', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    scabTrain(g, q);
    talk('d_hs_dysart', g, q, ['That\'s all.']);
    talk('d_hs_dysart', g, q, ['The men off the Line.', '(Take it.)']);
    expect(g.flags.hs_scabs).toBe('through');
    skills(g, { speech: 90 });
    vote(g, q, ['(Speak for holding.)', '(Dawn.)']);
    expect(g.flags.hs_shift).toBe('broken');
    expect(g.flags.ks_maren).toBe('hanged');
    expect(status(g, 'q_hs_shift')).toBe('failed');
    expect(cond(placed('hs_skirts', 'npc_hs_02').if, g)).toBe(false);
    expect(view('d_hs_post', g, q).text).toContain('rag');
    expect(stage(g, 'q_a2_halcyon')).toBe('car');
  });

  it('the vote for the car: the cable house blown, Rafe dead, Maren leads an armed Shift, the hill shut', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    scabTrain(g, q);
    skills(g, { explosives: 90 });
    vote(g, q, ['(Speak for the car.)', '(Set the charge yourself']);
    expect(g.flags.hs_shift).toBe('revolt');
    expect(g.flags.hs_car_down).toBe(true);
    expect(g.flags.hs_revolt_clean).toBe(true);
    expect(g.flags.hs_rafe_dead).toBe(true);
    expect(g.flags.ks_maren).toBe('lives');
    expect(stage(g, 'q_a2_halcyon')).toBe('road');
    expect(cond(placed('hs_skirts', 'npc_hs_g5').if, g)).toBe(true);
    expect(view('d_hs_cablehouse', g, q).text).toContain('no roof');
  });

  it('a failed speech for holding carries the room for the car; a bad fuse costs the crew', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    scabTrain(g, q);
    skills(g, { speech: 0, explosives: 0 });
    vote(g, q, ['(Speak for holding.)', '(Footgate, that night.)', '(Set the charge yourself']);
    expect(g.flags.hs_shift).toBe('revolt');
    expect(g.flags.hs_revolt_clean).toBeFalsy();
  });

  it('Rafe talked down hands over the powder: the car is off the table and the vote holds', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    skills(g, { speech: 90 });
    talk('d_hs_rafe', g, q, ['What do you want?', 'Something else.', 'Don\'t. People ride that car']);
    expect(g.flags.hs_rafe).toBe('stood_down');
    expect(g.pc.inventory.items.some((i) => i.def === 'k_hs_powder')).toBe(true);
    scabTrain(g, q);
    talk('d_hs_nowak', g, q, ['Six East came down on eleven men']);
    const floor = view('d_hs_maren', g, q);
    expect(floor).toBeDefined();
    vote(g, q, ['(Speak for holding.)', '(Dawn.)', '(Go out into the morning.)']);
    expect(g.flags.hs_shift).toBe('won');
  });

  it('the strike sold to Dysart: the Clean take Maren, and Kes will never walk with you', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    talk('d_hs_dysart', g, q, ['That\'s all.']);
    talk('d_hs_dysart', g, q, ['I can tell you where the strike committee sits', '(Tell him']);
    expect(g.flags.hs_sold_out).toBe(true);
    expect(g.flags.hs_shift).toBe('broken');
    expect(g.flags.ks_maren).toBe('hanged');
    expect(view('d_hs_kes', g, q).text).toContain('committee');
  });

  it('left unsettled while the player goes up the hill, the strike breaks at the next dawn they are back', () => {
    const { g, q } = inSkirts();
    talk('d_hs_maren', g, q, ['What does the Shift want?']);
    g.flags.hc_inside = true;
    g.locationId = 'hc_terrace';
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toEqual([]);
    hour(g, 6);
    expect(runWorldEvents(g, WORLD_EVENTS, q)).not.toContain('hs_strike_breaks');   // it waits for the player
    g.locationId = 'hs_skirts';
    hour(g, 6);
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('hs_strike_breaks');
    q.update();
    expect(g.flags.hs_shift).toBe('broken');
    expect(g.flags.ks_maren).toBe('hanged');
    expect(stage(g, 'q_a2_halcyon')).toBe('inside');
  });
});

// ---------------------------------------------------------------- Spare Parts

function partsTurn(g: G, q: QuestEngine) {
  talk('d_hs_notice', g, q, ['(Read the neat notice.)']);
  talk('d_hs_saba', g, q, ['What happened?', 'Can I see the boots?']);
  apply([{ give: 'k_hs_weighbook' }], g, q);
  skills(g, { medicine: 90 });
  talk('d_hs_weighbook', g, q);
}

describe('Spare Parts', () => {
  it('the notice, the boots, the book read for what it is: the Weighhouse grades debtors for parts', () => {
    const { g, q } = inSkirts();
    partsTurn(g, q);
    expect(g.world.knowledge.hs_boots_tag).toBe(true);
    expect(g.world.knowledge.hs_yield_read).toBe(true);
    expect(g.world.knowledge.hs_nils_queued).toBe(true);
    expect(stage(g, 'q_hs_parts')).toBe('yield');
  });

  it('the ripper reads the yield column too, for anyone who cannot', () => {
    const { g, q } = inSkirts();
    apply([{ give: 'k_hs_boots' }], g, q);
    talk('d_hs_lev', g, q, ['That\'s all.']);
    talk('d_hs_lev', g, q, ['What does "yield" mean']);
    expect(g.world.knowledge.hs_yield_read).toBe(true);
  });

  it('exposed on the wall on Cascade: the Weighhouse shut, Lisle gone, Nils out with the crowd, prices up', () => {
    const { g, q } = inSkirts();
    partsTurn(g, q);
    talk('d_hs_notice', g, q, ['(Nail a page of the Weighhouse book']);
    expect(g.flags.hs_parts).toBe('exposed');
    expect(g.flags.hs_lisle_gone).toBe(true);
    expect(g.flags.hs_nils).toBe('freed');
    expect(g.flags.hs_prices_up).toBe(true);
    expect(status(g, 'q_hs_parts')).toBe('done');
    expect(cond(placed('hs_skirts', 'npc_hs_07').if, g)).toBe(false);
    expect(cond(placed('hs_skirts', 'npc_hs_09_free').if, g)).toBe(true);
  });

  it('covered for a favour: Nils off the board, and the Clinic floors will know the player\'s name', () => {
    const { g, q } = inSkirts();
    partsTurn(g, q);
    talk('d_hs_lisle', g, q, ['That\'s all.']);
    talk('d_hs_lisle', g, q, ['K, L, C, H.', 'I\'ll keep it quiet. Take one name']);
    expect(g.flags.hs_parts).toBe('covered');
    expect(g.flags.hs_lisle_favour).toBe(true);
    expect(g.flags.hs_nils).toBe('freed');
    expect(status(g, 'q_hs_parts')).toBe('done');
  });

  it('covered for money with Nils still queued: he goes up on the next freight at two the player is there', () => {
    const { g, q } = inSkirts();
    partsTurn(g, q);
    talk('d_hs_lisle', g, q, ['That\'s all.']);
    talk('d_hs_lisle', g, q, ['K, L, C, H.', 'What\'s it worth to you', '(Take it.)']);
    expect(g.flags.hs_parts).toBe('covered');
    runWorldEvents(g, WORLD_EVENTS, q);
    hour(g, 2);
    expect(runWorldEvents(g, WORLD_EVENTS, q)).toContain('hs_freight');
    expect(g.flags.hs_nils).toBe('up');
  });

  it('Nils walked out of the ward at night never goes up', () => {
    const { g, q } = inSkirts(23);
    skills(g, { stealth: 90 });
    talk('d_hs_nils', g, q, ['That\'s all.']);
    talk('d_hs_nils', g, q, ['Walk out with me.']);
    expect(g.flags.hs_nils).toBe('freed');
    expect(g.flags.hs_nils_how).toBe('walked');
  });

  it('the finder\'s fee: a name for a hundred, the line failed, and Kes refuses the player', () => {
    const { g, q } = inSkirts();
    partsTurn(g, q);
    talk('d_hs_lisle', g, q, ['That\'s all.']);
    talk('d_hs_lisle', g, q, ['K, L, C, H.', 'You pay for names', '(Give her a name.)']);
    expect(g.flags.hs_parts).toBe('profit');
    expect(status(g, 'q_hs_parts')).toBe('failed');
    expect(view('d_hs_kes', g, q).text).toContain('Scales');
  });

  it('the conclusions: the Weighhouse\'s parts, and Six East robbed', () => {
    const { g, q } = inSkirts();
    for (const l of ['l_hs_yield', 'l_hs_freight', 'l_hs_boots', 'l_hs_log', 'l_hs_robbed', 'l_hs_pim']) g.world.leads[l] = true;
    expect(tryConclude(g, ['l_hs_yield', 'l_hs_freight', 'l_hs_boots'], CONCLUSIONS, q)?.id).toBe('c_hs_parts');
    expect(tryConclude(g, ['l_hs_log', 'l_hs_robbed', 'l_hs_pim'], CONCLUSIONS, q)?.id).toBe('c_hs_robbed');
  });
});

// ---------------------------------------------------------------- Scrip

describe('Scrip', () => {
  it('the changer\'s own ledger has a par column; changed at par, Ama\'s family goes down the Line', () => {
    const { g, q } = inSkirts();
    talk('d_hs_ama', g, q, ['Let me see what the changer can do.']);
    expect(status(g, 'q_hs_scrip')).toBe('active');
    skills(g, { barter: 90 });
    talk('d_hs_vulpe', g, q, ['Who sets it?']);
    talk('d_hs_vulpe', g, q, ['Show me your ledger.']);
    expect(g.world.knowledge.hs_par).toBe(true);
    talk('d_hs_vulpe', g, q, ['Change Ama Owusu\'s tin at par.']);
    expect(g.flags.hs_scrip).toBe('par');
    expect(g.flags.hs_vulpe_docked).toBe(true);
    expect(stage(g, 'q_hs_scrip')).toBe('par');
    expect(cond(placed('hs_skirts', 'npc_hs_12').if, g)).toBe(false);
    expect(tryConclude(g, ['l_hs_par', 'l_hs_seal'], CONCLUSIONS, q)?.id).toBe('c_hs_toll_paper');
    expect(g.world.knowledge.hs_toll_paper).toBe(true);
  });

  it('the threat of the wall on Cascade works on a man in debt to the guild', () => {
    const { g, q } = inSkirts();
    talk('d_hs_ama', g, q, ['Let me see what the changer can do.']);
    skills(g, { barter: 90, speech: 60 });
    talk('d_hs_vulpe', g, q, ['Who sets it?']);
    talk('d_hs_vulpe', g, q, ['Show me your ledger.']);
    talk('d_hs_vulpe', g, q, ['Change it at par, or the Shift reads']);
    expect(g.flags.hs_scrip_how).toBe('threat');
  });

  it('paid out of pocket, forged by Kes for a day, or the changer\'s cut', () => {
    const a = inSkirts();
    talk('d_hs_ama', a.g, a.q, ['(Give her the difference.']);
    expect(a.g.flags.hs_scrip).toBe('paid');
    expect(a.g.pc.inventory.tolls).toBe(541);
    const b = inSkirts();
    talk('d_hs_ama', b.g, b.q, ['Let me see what the changer can do.']);
    b.g.world.party.push(KES);
    talk('d_hs_rates', b.g, b.q, ['(Kes:']);
    expect(b.g.flags.hs_scrip).toBe('forged');
    expect(b.g.flags.hs_guild_man).toBe(true);
    expect(view('d_hs_vulpe', b.g, b.q).text).toContain('Best day');
    const c = inSkirts();
    talk('d_hs_ama', c.g, c.q, ['Let me see what the changer can do.']);
    skills(c.g, { barter: 90 });
    talk('d_hs_vulpe', c.g, c.q, ['That\'s all.']);
    talk('d_hs_vulpe', c.g, c.q, ['Show me your ledger.']);
    talk('d_hs_vulpe', c.g, c.q, ['What would you pay me', '(Take it.']);
    expect(c.g.flags.hs_scrip).toBe('cut');
    expect(status(c.g, 'q_hs_scrip')).toBe('failed');
  });
});

// ---------------------------------------------------------------- Kes

/** Kes met, a thing done for the Shift, and walking with the player. */
function withKes() {
  const c = inSkirts();
  talk('d_hs_kes', c.g, c.q, ['Why do you care', 'Deal.']);
  c.g.world.knowledge.hs_robbed = true;
  talk('d_hs_kes', c.g, c.q, ['Walk with me.']);
  return c;
}
const camp = (g: G) => { g.flags.at_camp = true; };
const toApproval = (g: G, v: number) => { g.world.approval[KES] = v; };

describe('Kes: joining', () => {
  it('she makes a deal at the first meeting and walks with the player once they have done a thing for the Shift', () => {
    const { g, q } = withKes();
    expect(g.world.party).toContain(KES);
    expect(g.flags.kes_joined).toBe(true);
    expect(approval(g)).toBe(10);
    expect(view('d_hs_kes', g, q).text).toContain('touching things');
  });

  it('or at once, if the player can talk her into it', () => {
    const { g, q } = inSkirts();
    skills(g, { speech: 90 });
    talk('d_hs_kes', g, q, ['Why do you care', 'Come with me now.']);
    expect(g.world.party).toContain(KES);
  });

  it('she tells the player the city cannot see her, if they bring the list', () => {
    const { g, q } = inSkirts();
    g.world.knowledge.name12_decoded = true;
    talk('d_hs_kes', g, q, ['The city has a list with Maren on it.']);
    expect(g.world.knowledge.kes_blind_spot).toBe(true);
  });

  it('waits where she is told and comes when called', () => {
    const { g, q } = withKes();
    talk('d_hs_kes', g, q, ['Wait here for me.']);
    expect(g.world.party).not.toContain(KES);
    talk('d_hs_kes', g, q, ['We\'re going.']);
    expect(g.world.party).toContain(KES);
  });
});

describe('Kes: four stages and her quest', () => {
  function toStage3() {
    const c = withKes();
    camp(c.g);
    talk('d_hs_kes', c.g, c.q, ['(She is winding a cable', 'So you go up together']);
    expect(c.g.flags.kes_s1).toBe(true);
    expect(options('d_hs_kes', c.g, c.q).some((t) => t.startsWith('You go quiet'))).toBe(false);   // no line settled yet
    c.g.flags.hs_parts = 'exposed';
    toApproval(c.g, 30);
    talk('d_hs_kes', c.g, c.q, ['You go quiet at the same hour', 'Then it\'s yours.']);
    expect(c.g.world.knowledge.kes_backdoor).toBe(true);
    expect(c.g.flags.kes_redline_said).toBe(true);
    toApproval(c.g, 40);
    expect(options('d_hs_kes', c.g, c.q).some((t) => t.startsWith('What do you want, Kes'))).toBe(false);   // the strike first
    c.g.flags.hs_shift = 'won';
    talk('d_hs_kes', c.g, c.q, ['What do you want, Kes?', 'I\'ll find you a way.']);
    expect(c.g.flags.kes_s3).toBe(true);
    expect(stage(c.g, 'q_comp_kes')).toBe('ask');
    return c;
  }

  it('cut at Lev\'s table with steady hands: free, and blind on the grid', () => {
    const { g, q } = toStage3();
    g.flags.at_camp = false;
    skills(g, { medicine: 90 });
    talk('d_hs_lev', g, q, ['That\'s all.']);
    talk('d_hs_lev', g, q, ['Can you take a Concern port', '(Hold the channel']);
    expect(g.flags.kes_link).toBe('cut');
    expect(g.flags.kes_fits).toBeUndefined();
    expect(stage(g, 'q_comp_kes')).toBe('free');
    expect(status(g, 'q_comp_kes')).toBe('done');
  });

  it('Ash, who cut his own, tells her how; a slip still leaves her alive, with fits', () => {
    const { g, q } = toStage3();
    g.world.party.push(ASH);
    talk('d_hs_kes', g, q, ['(Ash is looking at the cable', '(Let her think about it.)']);
    expect(g.world.knowledge.kes_ash_word).toBe(true);
    expect(approval(g, ASH)).toBe(10);
    g.flags.at_camp = false;
    skills(g, { medicine: 0 });
    talk('d_hs_lev', g, q, ['That\'s all.']);
    const o = view('d_hs_lev', g, q);
    expect(o).toBeDefined();
    talk('d_hs_lev', g, q, ['Can you take a Concern port']);
    const cut = new DialogueRunner(DIALOGUES.d_hs_lev, g, q);
    cut.choose(cut.view()!.options.find((x) => x.text.startsWith('Can you take'))!.id);
    const hold = cut.view()!.options.find((x) => x.text.startsWith('(Hold the channel'))!;
    expect(hold.checkNotes.some((n) => n.includes('Ash'))).toBe(true);
    cut.choose(hold.id);
    q.update();
    expect(g.flags.kes_link).toBe('cut');
    expect(g.flags.kes_fits).toBe(true);
    expect(stage(g, 'q_comp_kes')).toBe('fits');
  });

  it('turned dark from the Window\'s exchange at night', () => {
    const { g, q } = toStage3();
    g.flags.at_camp = false;
    hour(g, 23);
    skills(g, { science: 90 });
    talk('d_hs_grid', g, q, ['Your link. Turn it dark']);
    expect(g.flags.kes_link).toBe('dark');
    expect(stage(g, 'q_comp_kes')).toBe('dark');
  });

  it('kept, by her own reasons; then stage four: the house\'s old hand, and after', () => {
    const { g, q } = toStage3();
    talk('d_hs_kes', g, q, ['Your link. Have you decided?', 'It\'s yours.']);
    expect(g.flags.kes_link).toBe('kept');
    expect(stage(g, 'q_comp_kes')).toBe('kept');
    toApproval(g, 50);
    talk('d_hs_kes', g, q, ['You\'ve been listening to something.', 'What does that mean you can do?', 'Then when we go up, we answer it.', 'The road. With me.']);
    expect(g.flags.kes_lineage).toBe('speak');
    expect(g.flags.kes_after).toBe('road');
    expect(g.world.knowledge.kes_old_hand).toBe(true);
  });

  it('the door sold at the counter behind her back: she leaves for good, and the quest fails', () => {
    const { g, q } = toStage3();
    g.flags.at_camp = false;
    talk('d_hs_kes', g, q, ['Wait here for me.']);
    talk('d_hs_bell', g, q, ['That\'s all.']);
    talk('d_hs_bell', g, q, ['I know how the leash in your chrome comes off', '(Take it.)']);
    expect(g.flags.hs_leash_sold).toBe(true);
    expect(status(g, 'q_comp_kes')).toBe('failed');
    talk('d_hs_kes', g, q, ['(Let her go.)']);
    expect(g.flags.kes_left).toBe('sold');
    expect(view('d_hs_kes', g, q).options.map((o) => o.text)).toEqual(['(Leave her be.)']);
  });

  it('the door handed to Rafe: she leaves for good', () => {
    const { g, q } = toStage3();
    g.flags.at_camp = false;
    talk('d_hs_rafe', g, q, ['That\'s all.']);
    talk('d_hs_rafe', g, q, ['There\'s a door in the Concern\'s chrome.']);
    talk('d_hs_kes', g, q, ['(Let her go.)']);
    expect(g.flags.kes_left).toBe('rafe');
    expect(g.world.party).not.toContain(KES);
  });
});

describe('Kes: the romance, the exchanges, the floor', () => {
  it('opt-in at every step: yes, the dark hour, and out loud', () => {
    const { g, q } = withKes();
    camp(g);
    talk('d_hs_kes', g, q, ['(She is winding a cable', 'So you go up together']);
    toApproval(g, 35);
    talk('d_hs_kes', g, q, ['(She keeps looking at you', 'I like you too.']);
    expect(g.flags.kes_rom).toBe('yes');
    g.flags.hs_shift = 'won';
    toApproval(g, 45);
    talk('d_hs_kes', g, q, ['You go quiet at the same hour', 'Show me.']);
    talk('d_hs_kes', g, q, ['(She turns her back to you', 'I want to.']);
    expect(g.flags.kes_rom).toBe('dark');
    g.flags.hs_parts = 'exposed';
    talk('d_hs_kes', g, q, ['What do you want, Kes?', 'Is it worth the risk?']);
    talk('d_hs_kes', g, q, ['You\'ve been chewing on something.', 'We\'re a thing. Tell Rosa.']);
    expect(g.flags.kes_rom).toBe('committed');
    expect(g.flags.romance_partner).toBe(KES);
  });

  it('never while someone else is the player\'s partner; it ends if her approval falls', () => {
    const a = withKes();
    camp(a.g);
    talk('d_hs_kes', a.g, a.q, ['(She is winding a cable', 'So you go up together']);
    toApproval(a.g, 40);
    a.g.flags.romance_partner = WREN;
    expect(options('d_hs_kes', a.g, a.q).some((t) => t.startsWith('(She keeps looking'))).toBe(false);
    const b = withKes();
    camp(b.g);
    b.g.flags.kes_rom = 'yes';
    toApproval(b.g, 20);
    talk('d_hs_kes', b.g, b.q, ['(Let her.)']);
    expect(b.g.flags.kes_rom).toBe('ended');
  });

  it('the exchanges at the fire: Nine logs the blind spot; Odile prices it at par', () => {
    const { g, q } = withKes();
    camp(g);
    talk('d_hs_kes', g, q, ['(She is winding a cable', 'Strikes get people hanged.']);
    g.world.party.push(NINE, ODILE);
    talk('d_hs_kes', g, q, ['(Nine\'s lens is on Kes', 'The record can\'t see her for a reason']);
    expect(g.flags.nine_kes_logged).toBe(true);
    talk('d_hs_kes', g, q, ['(Odile is reading by the fire', 'Odile. What would you price it at now?']);
    expect(g.flags.kes_odile_truce).toBe(true);
    expect(approval(g, ODILE)).toBe(2);
  });

  it('at the floor she leaves; the truth, undressed, brings her back once', () => {
    const { g, q } = withKes();
    camp(g);
    toApproval(g, -25);
    talk('d_hs_kes', g, q, ['(Let her go.)']);
    expect(g.flags.kes_left).toBe('floor');
    expect(g.world.party).not.toContain(KES);
    g.flags.at_camp = false;
    skills(g, { speech: 90 });
    talk('d_hs_kes', g, q, ['(Sit down across from her.']);
    expect(g.world.party).toContain(KES);
    expect(approval(g)).toBe(5);
    camp(g);
    toApproval(g, -25);
    talk('d_hs_kes', g, q, ['(Let her go.)']);
    g.flags.at_camp = false;
    expect(options('d_hs_kes', g, q)).toEqual(['(Leave her be.)']);
  });
});
