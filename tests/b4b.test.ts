import { describe, expect, it } from 'vitest';
import { CONCLUSIONS, DIALOGUES, FACTIONS, ITEMS, MAPS, NPCS, QUESTS, SETTLEMENTS, WORLD_EVENTS, WORLD_MAP } from '../src/content';
import { SITES } from '../src/content/world/sites';
import { B4B, B4B_FLAGS, M1_LEASH, M3_HALCYON, modValue } from '../src/content/world/a3_conds';
import { newGameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond } from '../src/engine/world/logic';
import { SaveManager } from '../src/engine/save/saves';
import { MemoryBackend } from '../src/engine/save/storage';

/**
 * B4b — Halcyon, the arcology over the Skirts: the place and its people; beat 16 inside the gate by every way in and the
 * Board's offer by every answer; the Contract, the Leash and the Long-Lived by every route; Clinic Floor Nine, A Contract
 * for Kes, the Garden Heist and Funicular Pass by every route and every refusal; Kes inside; what B4a's flags change up the
 * hill; a save round-trip in the middle of it. Played headless.
 */

type G = ReturnType<typeof newGameState>;
const KES = 'npc_hs_01';
const COMPANIONS = ['npc_c9_03', 'npc_rd_03', 'npc_sh_17', 'npc_nb_03', 'npc_of_03', 'npc_md_nine', KES];
const HC = (id: string) => id.startsWith('d_hc_');

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
const approval = (g: G, who = KES) => g.world.approval[who] ?? 0;
function fire(g: G, q: QuestEngine, map: string, id: string) {
  apply(trigger(map, id).effects, g, q);
  q.update();
}

/** Beat 16 behind the player as far as the car (the strike settled as asked), standing at Halcyon's top station. */
function atGate(shift: 'won' | 'broken' | 'revolt' = 'won', h = 10) {
  const g = newGameState('c9', 0, 0);
  g.minutes = 120 * 1440 + h * 60;
  g.flags.ch1_done = true;
  g.flags.a2_spire_done = true;
  g.pc.inventory.tolls = 3000;
  const q = new QuestEngine(QUESTS, g);
  q.questStart('q_a2_halcyon');
  g.flags.visited_skirts = true;
  g.flags.hs_bell_met = true;
  g.flags.hs_shift = shift;
  if (shift === 'won') Object.assign(g.flags, { hs_marked: true, ks_maren: 'lives', hs_dysart_gone: true });
  if (shift === 'revolt') Object.assign(g.flags, { hs_car_down: true, hs_gate_shut: true, ks_maren: 'lives' });
  q.update();
  g.locationId = 'hc_terrace';
  return { g, q };
}
/** Through the arch as the Board's guest. */
function guest(shift: 'won' | 'broken' | 'revolt' = 'broken', h = 10) {
  const s = atGate(shift, h);
  talk('d_hc_gate', s.g, s.q, ['(Take the Board\'s card', '(Go through the arch.)']);
  return s;
}
function withKes(g: G, link?: 'cut' | 'dark' | 'kept') {
  g.world.party.push(KES);
  Object.assign(g.flags, { kes_met: true, kes_joined: true, kes_s1: true, kes_s2: true });
  g.world.knowledge.kes_backdoor = true;
  if (link) g.flags.kes_link = link;
}
const leashed = (g: G) => { g.pc.sheet.chrome = { neural: { id: 'ch_neural_lattice', condition: 1, installedDay: 0 } } as never; };
/** Soto met, the ball attended, the Chair heard out. */
function toBall(g: G, q: QuestEngine) {
  g.locationId = 'hc_board';
  fire(g, q, 'hc_board', 'floor');
  talk('d_hc_soto', g, q, ['That\'s all.']);
  talk('d_hc_chair', g, q, ['(Go to the Chair.)', 'What does the Board want with me?', '(Back.)']);
}

// ---------------------------------------------------------------- the place

describe('B4b: Halcyon as a place', () => {
  it('stands at the Teeth\'s Halcyon location with its own settlement, an open site and three cells; the road joins it to the Skirts', () => {
    expect(WORLD_MAP.locations.halcyon).toMatchObject({ settlement: 'halcyon', map: 'hc_terrace', region: 'teeth' });
    expect(SETTLEMENTS.halcyon).toMatchObject({ region: 'teeth', type: 'bastion', kit: 'arcology' });
    expect(SETTLEMENTS.halcyon.roads.skirts).toBe(SETTLEMENTS.skirts.roads.halcyon);
    expect(SITES.hc_terrace).toMatchObject({ kind: 'open', at: 'halcyon', rim: 'keep' });
    for (const m of ['hc_clinic', 'hc_board', 'hc_works']) {
      expect(SITES[m]).toMatchObject({ kind: 'cell' });
      expect(MAPS[m].interior).toBe(true);
      expect(MAPS[m].spawns.some((s) => s.id === 'lift')).toBe(true);
    }
    for (const s of ['start', 'from_skirts', 'road', 'car', 'concourse', 'tunnel', 'yard', 'lift']) expect(MAPS.hc_terrace.spawns.some((x) => x.id === s)).toBe(true);
    expect(FACTIONS.concern.initiation).toBe('q_hc_contract');
  });

  it('every person harmed on floor nine is an adult; the Saints\' Listener is twenty and says so', () => {
    for (const id of ['npc_hc_20', 'npc_hc_21', 'npc_hs_09', 'npc_hs_05', 'npc_hc_14']) expect(NPCS[id].look.age!).toBeGreaterThanOrEqual(19);
    for (const n of MAPS.hc_clinic.npcs!) expect(NPCS[n.def].look.age!, n.def).toBeGreaterThanOrEqual(19);
    const { g, q } = atGate();
    expect(view('d_hc_listener', g, q).text).toContain('A woman of twenty');
  });

  it('every node in the Halcyon trees has a line for coming back to it (U7), or only leaves; all seven companions speak up the hill', () => {
    let trees = 0, nodes = 0;
    const said = new Set<string>();
    for (const [id, d] of Object.entries(DIALOGUES)) {
      if (!HC(id) && id !== 'd_hs_kes') continue;
      trees++;
      for (const [nid, n] of Object.entries(d.nodes)) {
        nodes++;
        if (!n.options.every((o) => o.exit)) expect(n.again, `${id}/${nid}`).toBeDefined();
        for (const ij of n.interject ?? []) said.add(ij.companion);
      }
    }
    expect(trees).toBeGreaterThanOrEqual(55);
    expect(nodes).toBeGreaterThanOrEqual(250);
    for (const c of COMPANIONS) expect(said.has(c), c).toBe(true);
  });

  it('the seven lines are registered, every one with routes, and the beat keeps every Act 3 flag value', () => {
    for (const id of ['q_hc_contract', 'q_hc_leash', 'q_hc_longlived', 'q_hc_clinic', 'q_hc_kes', 'q_hc_garden', 'q_hc_funicular']) {
      expect(QUESTS[id].routes!.length).toBeGreaterThanOrEqual(4);
      expect(Object.values(QUESTS[id].stages).some((s) => s.end)).toBe(true);
    }
    expect(QUESTS.q_hc_garden.title).toBe('Garden Heist');
    const st = QUESTS.q_a2_halcyon.stages;
    expect(st.inside.end).toBeUndefined();
    for (const e of ['accepted', 'refused', 'feigned']) expect(st[e].end).toBe('done');
    for (const it of ['k_hc_guest_pass', 'k_hc_contract', 'k_hc_contract_forged', 'k_hc_daypass', 'k_hc_seat', 'k_hc_leash_key', 'k_hc_kes_contract', 'k_hc_jars', 'k_hc_linh_pass', 'k_hc_controller']) expect(ITEMS[it]).toBeDefined();
  });

  it('the conclusions on the notebook\'s board: the bank, the Board, the reserve', () => {
    const { g, q } = atGate();
    for (const l of ['l_hc_portrait', 'l_hc_minutes']) g.world.leads[l] = true;
    expect(tryConclude(g, CONCLUSIONS.c_hc_board.from, CONCLUSIONS, q)?.id).toBe('c_hc_board');
    expect(g.world.knowledge.hc_ages).toBe(true);
    expect(g.world.knowledge.hc_chair_drift).toBe(true);
  });
});

// ---------------------------------------------------------------- beat 16: the gate

describe('Beat 16: the gate by four ways in', () => {
  it('up the car from Footgate on paper; no paper, no car', () => {
    const { g, q } = atGate('won');
    g.locationId = 'hs_skirts';
    expect(options('d_hs_car', g, q)).toContain('(Show the clerk your paper and ride up to Halcyon.)');
    g.pc.inventory.items = g.pc.inventory.items.filter((i) => i.def !== 'k_hc_invitation');
    talk('d_hs_car', g, q, ['(Ride up.)']);
    expect(view('d_hs_car', g, q).options.map((o) => o.text)).not.toContain('(Show the clerk your paper and ride up to Halcyon.)');
  });

  it('T: the Board\'s guest at reception; inside sets the milestone, which arms the strike\'s default, and the beat goes on', () => {
    const { g, q } = atGate('broken');
    g.flags.hs_shift = undefined as never;
    delete g.flags.hs_shift;
    talk('d_hc_gate', g, q, ['(Take the Board\'s card', '(Go through the arch.)']);
    expect(g.flags).toMatchObject({ hc_inside: true, hc_entry: 'guest', hc_contract: 'guest' });
    expect(has(g, 'k_hc_guest_pass')).toBe(true);
    expect(stage(g, 'q_a2_halcyon')).toBe('inside');
    expect(stage(g, 'q_hc_contract')).toBe('guest');
    expect(status(g, 'q_hc_longlived')).toBe('active');
    expect(cond(WORLD_EVENTS.hs_strike_breaks.armedIf, g)).toBe(true);
  });

  it('marked by the Shift, the guest is received cold and watched; warm after Meridian', () => {
    const a = atGate('won');
    expect(view('d_hc_gate', a.g, a.q).options[0].text).toBe('(Take the Board\'s card to reception.)');
    const r = talk('d_hc_gate', a.g, a.q, ['(Take the Board\'s card']);
    expect(r.view()!.text).toContain('I say you are watched');
    const b = atGate('broken');
    b.g.flags.cr_concern = 'kept';
    expect(talk('d_hc_gate', b.g, b.q, ['(Take the Board\'s card']).view()!.text).toContain('Meridian sent word');
  });

  it('B: a citizen\'s contract earned at Bell\'s counter for a season\'s term (probationary in the Concern), or for something true', () => {
    const { g, q } = atGate('broken');
    g.locationId = 'hs_skirts';
    talk('d_hs_bell', g, q, ['I want a contract.']);
    talk('d_hs_bell', g, q, ['A citizen\'s contract, for a season\'s term.', '(Sign.)']);
    expect(g.flags).toMatchObject({ hc_contract: 'citizen', hc_term: 'owed', hc_contract_how: 'term' });
    expect(g.world.membership.concern).toMatchObject({ rank: 'probationary', status: 'member' });
    expect(stage(g, 'q_hc_contract')).toBe('citizen');
    g.locationId = 'hc_terrace';
    talk('d_hc_gate', g, q, ['(Face the lens with your contract.)', '(Go in.)']);
    expect(g.flags).toMatchObject({ hc_inside: true, hc_entry: 'contract' });

    const b = atGate('broken');
    talk('d_hs_bell', b.g, b.q, ['I want a contract.']);
    talk('d_hs_bell', b.g, b.q, ['They say you take one bribe.', 'The city wants me for its Magistrate.']);
    expect(b.g.flags.hc_contract).toBeUndefined();   // refused: a true thing said to get something
    skills(b.g, { speech: 90 });
    talk('d_hs_bell', b.g, b.q, ['They say you take one bribe.', 'I carry a dead man']);
    expect(b.g.flags).toMatchObject({ hc_contract: 'citizen', hc_confessed: 'map', hc_contract_how: 'confess' });
  });

  it('B, forged: Kes writes a citizen into the Window; or your own grid chrome at the registry; the lens believes both', () => {
    const { g, q } = atGate('broken');
    withKes(g);
    g.locationId = 'hs_skirts';
    talk('d_hs_grid', g, q, ['Write me a citizen\'s contract.']);
    expect(g.flags.hc_contract).toBe('infiltrator');
    g.locationId = 'hc_terrace';
    talk('d_hc_gate', g, q, ['(Face the lens with the Window', '(Go in.)']);
    expect(g.flags.hc_inside).toBe(true);
    expect(stage(g, 'q_hc_contract')).toBe('infiltrator');

    const b = guest('broken');
    b.g.flags.hc_contract = undefined as never;
    delete b.g.flags.hc_contract;
    leashed(b.g);
    skills(b.g, { science: 90 });
    talk('d_hc_registry', b.g, b.q, ['(Think your way in']);
    expect(b.g.flags.hc_contract).toBe('infiltrator');
    expect(has(b.g, 'k_hc_contract_forged')).toBe(true);
  });

  it('C: the Concern\'s work in the body reads as a citizen; a bare face is refused', () => {
    const { g, q } = atGate('broken');
    g.pc.inventory.items = g.pc.inventory.items.filter((i) => i.def !== 'k_hc_invitation');
    talk('d_hc_gate', g, q, ['(Walk into the lens.)']);
    expect(g.flags.hc_inside).toBeFalsy();
    expect(options('d_hc_gate', g, q)).not.toContain('(Walk into the lens.)');   // refused once, said once
    leashed(g);
    talk('d_hc_gate', g, q, ['(Walk into the lens and let it read', '(Go in.)']);
    expect(g.flags).toMatchObject({ hc_inside: true, hc_entry: 'chrome' });
  });

  it('S: the road and the gardeners\' tunnel at dawn: head down, a bought day stamp, or Kes at the lens; turned back otherwise', () => {
    const a = atGate('revolt', 5);
    expect(view('d_hc_roadpost', a.g, a.q).text).toContain('NOBODY FROM THE SLOPE COMES UP');
    talk('d_hc_tunnel', a.g, a.q, ['(Go in among them']);
    expect(a.g.flags.hc_inside).toBeFalsy();
    talk('d_hc_gardeners', a.g, a.q, ['(Offer the coughing woman']);
    expect(has(a.g, 'k_hc_daypass')).toBe(true);
    talk('d_hc_tunnel', a.g, a.q, ['(Show the lens a gardener', '(Up into the gardens.)']);
    expect(a.g.flags).toMatchObject({ hc_inside: true, hc_entry: 'tunnel' });
    expect(has(a.g, 'k_hc_daypass')).toBe(false);

    const b = atGate('revolt', 5);
    skills(b.g, { stealth: 90 });
    talk('d_hc_tunnel', b.g, b.q, ['(Go in among them', '(Up into the gardens.)']);
    expect(b.g.flags.hc_entry).toBe('tunnel');

    const c = atGate('revolt', 12);
    withKes(c.g);
    talk('d_hc_tunnel', c.g, c.q, ['(Kes puts her hand flat', '(Up into the gardens.)']);
    expect(c.g.flags.hc_entry).toBe('tunnel');
  });

  it('after the revolt the Board\'s guest still comes up by road, walked from the post to reception', () => {
    const { g, q } = atGate('revolt');
    talk('d_hc_roadpost', g, q, ['(Show them the Board\'s card.)', '(Go to reception.)']);
    talk('d_hc_gate', g, q, ['(Take the Board\'s card', '(Go through the arch.)']);
    expect(g.flags.hc_entry).toBe('guest');
    expect(view('d_hc_car', g, q).text).toContain('No car');
  });
});

// ---------------------------------------------------------------- beat 16: the offer

describe('Beat 16: the Board\'s offer', () => {
  it('Soto first, the ball, what the Board wants said once in full, and an answer: accepted', () => {
    const { g, q } = guest();
    toBall(g, q);
    expect(g.flags).toMatchObject({ hc_soto_met: true, hc_ball: true, hc_board_wants: true, hc_clinic_open: true });
    expect(stage(g, 'q_a2_halcyon')).toBe('offer');
    expect(view('d_hc_chair', g, q).text).toContain('Bramble');   // after the ball he keeps to his room
    talk('d_hc_soto', g, q, ['Yes. A seat at the table.']);
    expect(g.flags).toMatchObject({ hc_offer: 'accepted', a2_halcyon_done: true });
    expect(has(g, 'k_hc_seat')).toBe(true);
    expect(status(g, 'q_a2_halcyon')).toBe('done');
    expect(stage(g, 'q_a2_halcyon')).toBe('accepted');
  });

  it('the answers at the ball itself: no; yes-meaning-no (Speech); caught', () => {
    const a = guest();
    a.g.locationId = 'hc_board';
    talk('d_hc_soto', a.g, a.q, ['That\'s all.']);
    talk('d_hc_chair', a.g, a.q, ['(Go to the Chair.)', 'What does the Board want with me?', '(Back.)', 'No.']);
    expect(a.g.flags.hc_offer).toBe('refused');
    expect(stage(a.g, 'q_a2_halcyon')).toBe('refused');

    const b = guest();
    b.g.locationId = 'hc_board';
    skills(b.g, { speech: 90 });
    talk('d_hc_soto', b.g, b.q, ['That\'s all.']);
    talk('d_hc_chair', b.g, b.q, ['(Go to the Chair.)', 'What does the Board want with me?', '(Back.)', '(Say yes. Mean no.)']);
    expect(b.g.flags.hc_offer).toBe('feigned');
    expect(has(b.g, 'k_hc_seat')).toBe(true);

    const c = guest();
    c.g.locationId = 'hc_board';
    talk('d_hc_soto', c.g, c.q, ['That\'s all.']);
    talk('d_hc_chair', c.g, c.q, ['(Go to the Chair.)', 'What does the Board want with me?', '(Back.)', '(Say yes. Mean no.)']);
    expect(c.g.flags.hc_offer).toBe('refused');
    expect(has(c.g, 'k_hc_seat')).toBe(false);
  });

  it('the ball waits for the player; going to it while Joran Haber\'s boy is on nine means he is drawn for the Chair', () => {
    const { g, q } = guest();
    g.flags.hs_nils = 'up';
    g.locationId = 'hc_board';
    talk('d_hc_soto', g, q, ['That\'s all.']);
    expect(view('d_hc_chair', g, q).text).toContain('bed nineteen');
    talk('d_hc_chair', g, q, ['(Not yet.)']);
    expect(g.flags.hc_ball).toBeUndefined();
    talk('d_hc_chair', g, q, ['(Go to the Chair.)', 'You look well.']);
    expect(g.flags.hc_nils).toBe('dead');
    expect(cond(placed('hc_clinic', 'npc_hs_09_hc').if, g)).toBe(false);
  });
});

// ---------------------------------------------------------------- the Long-Lived

describe('The Long-Lived: every way to know, and every end', () => {
  it('the portraits and the minutes; then the toast at the ball: exposed', () => {
    const { g, q } = guest();
    g.locationId = 'hc_board';
    talk('d_hc_portraits', g, q, ['(Take the photograph']);
    talk('d_hc_boardtable', g, q, ['(Read the minutes.)', '(Close the binder.)', '(Take the binder.)']);
    expect(stage(g, 'q_hc_longlived')).toBe('known');
    skills(g, { speech: 90 });
    talk('d_hc_soto', g, q, ['That\'s all.']);
    talk('d_hc_chair', g, q, ['(Go to the Chair.)', '(Raise your glass']);
    expect(g.flags.hc_longlived).toBe('exposed');
    expect(status(g, 'q_hc_longlived')).toBe('done');
    expect(modValue(g, M3_HALCYON)).toBe('opened');
  });

  it('a failed toast is laughed off, once; the knowledge is still the player\'s to keep', () => {
    const { g, q } = guest();
    g.world.knowledge.hc_ages = true;
    g.world.knowledge.hc_chair_drift = true;
    g.locationId = 'hc_board';
    talk('d_hc_soto', g, q, ['That\'s all.']);
    const r = talk('d_hc_chair', g, q, ['(Go to the Chair.)', '(Raise your glass']);
    expect(r.view()!.text).toContain('laughs');
    expect(g.flags.hc_longlived).toBeUndefined();
    talk('d_hc_soto', g, q, ['I know what the Board is. I\'m keeping it.']);
    expect(g.flags.hc_longlived).toBe('kept');
  });

  it('watching the Chair (Medicine), Wray\'s snow; then Soto is given the Chair: by the minutes, by the house, by word; a word that is not enough', () => {
    const a = guest();
    a.g.locationId = 'hc_board';
    skills(a.g, { medicine: 90 });
    talk('d_hc_soto', a.g, a.q, ['That\'s all.']);
    talk('d_hc_chair', a.g, a.q, ['(Go to the Chair.)']);
    expect(a.g.world.knowledge.hc_chair_drift).toBe(true);
    talk('d_hc_wray', a.g, a.q, ['How long have you been on the Board?']);
    expect(a.g.world.knowledge.hc_ages).toBe(true);
    a.g.pc.inventory.items.push(...[] as never[]);
    apply([{ give: 'k_hc_minutes' }], a.g, a.q);
    talk('d_hc_soto', a.g, a.q, ['I can give you the Chair.', '(Give her the Board\'s own minutes']);
    expect(a.g.flags).toMatchObject({ hc_longlived: 'soto', hc_chair: 'retired' });
    expect(cond(placed('hc_terrace', 'npc_hc_01_bench').if, a.g)).toBe(true);
    expect(cond(placed('hc_board', 'npc_hc_01_room').if, a.g)).toBe(false);
    expect(view('d_hc_chair', a.g, a.q).text).toContain('bench');
    expect(modValue(a.g, M3_HALCYON)).toBe('reformed');

    const b = guest();
    withKes(b.g);
    b.g.flags.kes_lineage = 'speak';
    b.g.locationId = 'hc_board';
    talk('d_hc_soto', b.g, b.q, ['That\'s all.']);
    talk('d_hc_chair', b.g, b.q, ['(Go to the Chair.)', '(Kes speaks to him']);
    expect(b.g.world.knowledge).toMatchObject({ hc_house_heard: true, hc_reserve_known: true, hc_scald_owned: true });
    talk('d_hc_soto', b.g, b.q, ['I can give you the Chair.', 'The house spoke through him.']);
    expect(b.g.flags.hc_longlived).toBe('soto');

    const c = guest();
    Object.assign(c.g.world.knowledge, { hc_ages: true, hc_chair_drift: true });
    c.g.locationId = 'hc_board';
    talk('d_hc_soto', c.g, c.q, ['That\'s all.']);
    talk('d_hc_chair', c.g, c.q, ['(Go to the Chair.)']);
    talk('d_hc_soto', c.g, c.q, ['I can give you the Chair.', '(Tell the Board yourself']);
    expect(c.g.flags.hc_longlived).toBeUndefined();
    skills(c.g, { speech: 90 });
    expect(options('d_hc_soto', c.g, c.q)).toContain('I can give you the Chair.');
  });

  it('the console in the Chair\'s room: read it (Science, or Kes), then keep the controller or burn it; the door by invitation', () => {
    const a = guest();
    toBall(a.g, a.q);
    talk('d_hc_chairdoor', a.g, a.q, ['(Knock.']);
    skills(a.g, { science: 90 });
    a.g.flags.an_reserve = 'concern';
    expect(view('d_hc_controllers', a.g, a.q).text).toContain('ANSWERING');
    talk('d_hc_controllers', a.g, a.q, ['(Read the console properly.)', '(Back.)', '(Pull the controller']);
    expect(a.g.flags.hc_reserve).toBe('taken');
    expect(has(a.g, 'k_hc_controller')).toBe(true);

    const b = guest();
    withKes(b.g);
    b.g.locationId = 'hc_board';
    talk('d_hc_controllers', b.g, b.q, ['(Kes reads it', '(Back.)', '(Burn the console']);
    expect(b.g.flags.hc_reserve).toBe('burned');
  });
});

// ---------------------------------------------------------------- Clinic Floor Nine

/** On nine by the Board's own tour, the floor's board read. */
function nine(over: Record<string, unknown> = {}) {
  const s = guest();
  Object.assign(s.g.flags, over);
  s.g.locationId = 'hc_board';
  talk('d_hc_soto', s.g, s.q, ['That\'s all.']);
  s.g.locationId = 'hc_terrace';
  expect(options('d_hc_lift', s.g, s.q)).toContain('(NINE.)');
  s.g.locationId = 'hc_clinic';
  fire(s.g, s.q, 'hc_clinic', 'nine');
  return s;
}

describe('Clinic Floor Nine', () => {
  it('the lift says nine is for staff until the Board\'s tour, Dr Lisle\'s name, a fitting, Kes, or a screwdriver', () => {
    const a = guest();
    expect(view('d_hc_lift', a.g, a.q).options.find((o) => o.text === '(NINE.)')).toBeDefined();
    talk('d_hc_lift', a.g, a.q, ['(NINE.)']);
    expect(a.g.flags.hc_clinic_open).toBeUndefined();
    skills(a.g, { security: 90 });
    talk('d_hc_lift', a.g, a.q, ['(NINE.)', '(Open the panel']);
    expect(a.g.flags.hc_lift_shorted).toBe(true);
    const b = guest();
    withKes(b.g);
    talk('d_hc_lift', b.g, b.q, ['(NINE.)', '(Kes looks up at the lens.)']);
    expect(b.g.flags.hc_lift_kes).toBe(true);
    const c = guest();
    c.g.flags.hs_lisle_favour = true;
    expect(view('d_hc_lift', c.g, c.q).options.filter((o) => o.text === '(NINE.)')).toHaveLength(1);
    talk('d_hc_lift', c.g, c.q, ['(NINE.)']);
    expect(c.g.flags.hc_lift_shorted).toBeUndefined();
  });

  it('the charts, the cold store, the files; the ward by Abena; Dr Qadir\'s case; then she is persuaded to close it', () => {
    const { g, q } = nine({ hs_nils: 'up', hs_lev_met: true });
    talk('d_hc_charts', g, q);
    talk('d_hc_coldstore', g, q, ['(Peel Dawit Mekonnen']);
    expect(view('d_hc_coldstore', g, q).text).toContain('HELD FOR RENEWAL');
    skills(g, { security: 90, speech: 90 });
    talk('d_hc_qadir_files', g, q, ['(Open the drawer']);
    expect(has(g, 'k_hc_renewal_list')).toBe(true);
    expect(g.world.knowledge.hc_nils_listed).toBe(true);
    talk('d_hc_abena', g, q, ['That\'s all.']);
    talk('d_hc_abena', g, q, ['Lev Ostrander had your job.']);
    talk('d_hc_warddoor', g, q, ['(Abena lets you through.)']);
    fire(g, q, 'hc_clinic', 'ward');
    talk('d_hc_dawit', g, q, ['Saba\'s all right.']);
    talk('d_hc_qadir', g, q, ['That\'s all.']);
    talk('d_hc_qadir', g, q, ['What is service?', 'Why them?']);
    expect(stage(g, 'q_hc_clinic')).toBe('service');
    talk('d_hc_qadir', g, q, ['Close the service ward.', '(Lay it out']);
    expect(g.flags).toMatchObject({ hc_clinic: 'closed', hs_nils: 'freed', hc_nils: 'freed' });
    expect(status(g, 'q_hc_clinic')).toBe('done');
    expect(cond(placed('hc_clinic', 'npc_hc_20').if, g)).toBe(false);
    expect(cond(placed('hs_skirts', 'npc_hc_20_home').if, g)).toBe(true);
    expect(cond(placed('hs_skirts', 'npc_hs_09_free').if, g)).toBe(true);
    expect(view('d_hs_saba', g, q).text).toContain('carried him up Cascade');
  });

  it('Qadir refuses a weak case once; the player wakes them (Medicine) and takes them down the freight, the tunnel or by force', () => {
    const a = nine({ hc_mazur_paid: true });
    talk('d_hc_qadir', a.g, a.q, ['That\'s all.']);
    expect(options('d_hc_qadir', a.g, a.q)).not.toContain('What is service?');   // go and look first
    talk('d_hc_charts', a.g, a.q);
    talk('d_hc_qadir', a.g, a.q, ['What is service?', 'Why them?']);
    talk('d_hc_qadir', a.g, a.q, ['Close the service ward.', '(Lay it out']);
    expect(a.g.flags.hc_clinic).toBeUndefined();
    expect(options('d_hc_qadir', a.g, a.q)).not.toContain('Close the service ward.');
    skills(a.g, { medicine: 90 });
    talk('d_hc_wardboard', a.g, a.q, ['(Wake them. All of them.)', 'Now get them down the hill.', '(The freight at two.']);
    expect(a.g.flags).toMatchObject({ hc_clinic: 'freed', hc_clinic_how: 'freight', hc_wake: 'clean', hc_sleepers_woken: true });

    const b = nine();
    skills(b.g, { medicine: 10 });
    Object.assign(b.g.flags, { hc_yaw_trust: true, hc_yaw_tunnel: true });
    talk('d_hc_wardboard', b.g, b.q, ['(Wake them. All of them.)']);
    expect(b.g.flags.hc_wake).toBe('hard');
    talk('d_hc_wardboard', b.g, b.q, ['(Down the service stair']);
    expect(b.g.flags.hc_clinic_how).toBe('tunnel');

    const c = nine({ hs_shift: 'broken' });
    c.g.flags.hs_marked = undefined as never;
    skills(c.g, { medicine: 90 });
    talk('d_hc_wardboard', c.g, c.q, ['(Wake them. All of them.)', 'Now get them down the hill.']);
    expect(options('d_hc_wardboard', c.g, c.q).some((t) => t.startsWith('(The freight at two.'))).toBe(false);   // Mazur is not theirs
    talk('d_hc_wardboard', c.g, c.q, ['(Out through the concourse']);
    expect(c.g.flags).toMatchObject({ hc_clinic: 'freed', hc_clinic_how: 'force', hc_alarm: true });
  });

  it('left as it was, for Dr Qadir\'s offer: the quest fails and the ward stays', () => {
    const { g, q } = nine();
    talk('d_hc_coldstore', g, q);
    talk('d_hc_qadir', g, q, ['That\'s all.']);
    talk('d_hc_qadir', g, q, ['What is service?', 'Why them?']);
    talk('d_hc_qadir', g, q, ['What do you offer the designate', '(Take it.']);
    expect(g.flags).toMatchObject({ hc_clinic: 'left', hc_chart_open: true });
    expect(status(g, 'q_hc_clinic')).toBe('failed');
    expect(cond(placed('hc_clinic', 'npc_hc_20').if, g)).toBe(true);
  });

  it('an exposed Weighhouse left the floors short: 9-1182 drawn to the end; Saba told the truth; Dr Lisle up the hill helps', () => {
    const { g, q } = nine({ hs_parts: 'exposed', hs_lisle_gone: true });
    expect(cond(placed('hc_clinic', 'npc_hc_20').if, g)).toBe(false);
    expect(view('d_hc_coldstore', g, q).text).toContain('drew him to the end');
    expect(cond(placed('hc_clinic', 'npc_hs_07_hc').if, g)).toBe(true);
    talk('d_hc_lisle', g, q, ['Now you\'ve seen it.']);
    talk('d_hc_lisle', g, q, ['Then help me.']);
    expect(g.flags.hc_lisle_turned).toBe(true);
    g.locationId = 'hs_skirts';
    talk('d_hs_saba', g, q, ['(Tell her what you found']);
    expect(g.flags.hc_saba_told).toBe('truth');
  });

  it('Joran Haber\'s boy walked out alone before the ball (Stealth), or caught and put back; Dysart told he stays, or goes', () => {
    const a = nine({ hs_nils: 'up' });
    skills(a.g, { stealth: 90 });
    talk('d_hc_nils', a.g, a.q, ['(Wake him.)', '(Walk him out now']);
    expect(a.g.flags).toMatchObject({ hc_nils: 'freed', hs_nils: 'freed' });
    const b = nine({ hs_nils: 'up', hs_dysart_gone: true });
    talk('d_hc_nils', b.g, b.q, ['(Wake him.)', '(Walk him out now']);
    expect(b.g.flags.hc_nils).toBeUndefined();
    expect(cond(placed('hc_clinic', 'npc_hs_05_hc').if, b.g)).toBe(true);
    talk('d_hc_dysart', b.g, b.q, ['Why did you rob the pillars?', 'Something else.', 'If the ward goes down the hill, you stay.']);
    expect(b.g.flags.hc_dysart).toBe('stays');
    b.g.flags.hc_clinic = 'closed';
    expect(cond(placed('hc_clinic', 'npc_hs_05_hc').if, b.g)).toBe(true);
    b.g.flags.hc_dysart = 'down';
    expect(cond(placed('hc_clinic', 'npc_hs_05_hc').if, b.g)).toBe(false);
  });

  it('the Saints\' Listener taken off the wire (Science, or Kes); the girl from her tower bought back or printed a pass', () => {
    const a = nine({ bw_static: 'concern' });
    talk('d_hc_listener', a.g, a.q, ['Who are you?']);
    expect(a.g.world.knowledge.hc_immy_told).toBe(true);
    talk('d_hc_listener', a.g, a.q, ['(Take her off the wire.)']);
    expect(a.g.flags.hc_listener).toBeUndefined();
    expect(options('d_hc_listener', a.g, a.q)).not.toContain('(Take her off the wire.)');
    withKes(a.g);
    talk('d_hc_listener', a.g, a.q, ['(Kes, take her off the wire.)']);
    expect(a.g.flags.hc_listener).toBe('free');
    expect(cond(placed('hc_clinic', 'npc_hc_21').if, a.g)).toBe(false);
    a.g.locationId = 'hc_terrace';
    talk('d_hc_registry', a.g, a.q, ['There\'s a girl from the Saints\' tower']);
    expect(a.g.flags.hc_immy).toBe('home');

    const b = nine({ bw_static: 'concern' });
    skills(b.g, { science: 90 });
    talk('d_hc_listener', b.g, b.q, ['Who are you?', 'Something else.', '(Take her off the wire.)']);
    expect(b.g.flags.hc_listener).toBe('free');
    b.g.locationId = 'hc_board';
    talk('d_hc_soto', b.g, b.q, ['There\'s a girl from the Saints\' tower in your school.', '(Pay three hundred.)']);
    expect(b.g.flags.hc_immy).toBe('home');
  });
});

// ---------------------------------------------------------------- the Leash

/** Kes at the core door, the keeper heard out. */
function core(link?: 'cut' | 'dark' | 'kept', kes = true) {
  const s = guest();
  if (kes) withKes(s.g, link);
  s.g.locationId = 'hc_works';
  fire(s.g, s.q, 'hc_works', 'core');
  talk('d_hc_lawal', s.g, s.q, ['What are you?', 'Something else.', 'Why did you sit down?', 'Something else.', 'Can it be stopped?', 'Something else.']);
  return s;
}

describe('The Leash: every way the keeper\'s channel ends', () => {
  it('Kes points the way; the core by Kes, by Ono\'s leave, or by the lock at the change; the keeper heard out', () => {
    const a = guest();
    withKes(a.g);
    a.g.locationId = 'hc_works';
    talk('d_hs_kes', a.g, a.q, ['The door in your neck.']);
    expect(stage(a.g, 'q_hc_leash')).toBe('door');
    expect(options('d_hc_coredoor', a.g, a.q)).toContain('(Kes walks up to the door as if it were hers.)');
    const b = guest();
    b.g.locationId = 'hc_works';
    skills(b.g, { speech: 90 });
    talk('d_hc_ono', b.g, b.q, ['That\'s all.']);
    talk('d_hc_ono', b.g, b.q, ['What\'s behind the core door?', 'Something else.', 'Walk me past the guard.']);
    expect(options('d_hc_coredoor', b.g, b.q)).toContain('(Line inspection, with Ono.)');
    const c = core(undefined, false);
    expect(stage(c.g, 'q_hc_leash')).toBe('keeper');
    expect(c.g.world.knowledge.hc_kes_clause).toBe(true);
  });

  it('cut by the keeper himself, held (Speech): he lives, the Reach falls and rises, the Concern expels the player; a failed hold, once', () => {
    const a = core(undefined, false);
    a.g.world.membership.concern = { rank: 'probationary', since: 1, status: 'member' };
    skills(a.g, { speech: 90 });
    talk('d_hc_lawal', a.g, a.q, ['I\'ve decided', '(Hold his head']);
    expect(a.g.flags).toMatchObject({ hc_leash: 'cut', hc_lawal: 'free', hc_drift_fits: true });
    expect(a.g.world.membership.concern.status).toBe('expelled');
    expect(status(a.g, 'q_hc_leash')).toBe('done');
    expect(cond(placed('hc_terrace', 'npc_hc_12_free').if, a.g)).toBe(true);
    expect(modValue(a.g, M1_LEASH)).toBe('cut');

    const b = core(undefined, false);
    talk('d_hc_lawal', b.g, b.q, ['I\'ve decided', '(Hold his head']);
    expect(b.g.flags.hc_leash).toBeUndefined();
    expect(options('d_hc_lawal', b.g, b.q)).toContain('I\'ve decided what happens to the leash.');
  });

  it('Kes rides it: by hand with her port cut out (safe); dark, held quiet or bitten; live, home again or lost', () => {
    const a = core('cut');
    talk('d_hc_lawal', a.g, a.q, ['I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes.)']);
    expect(a.g.flags).toMatchObject({ hc_leash: 'cut', hc_leash_how: 'kes', hc_lawal: 'free' });
    expect(a.g.flags.kes_fits).toBeUndefined();

    const b = core('dark');
    skills(b.g, { science: 90 });
    talk('d_hc_lawal', b.g, b.q, ['I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes. Hold the channel quiet']);
    expect(b.g.flags.kes_fits).toBeUndefined();
    const c = core('dark');
    talk('d_hc_lawal', c.g, c.q, ['I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes. Hold the channel quiet']);
    expect(c.g.flags).toMatchObject({ hc_leash: 'cut', kes_fits: true });

    const d = core('kept');
    skills(d.g, { science: 90 });
    talk('d_hc_lawal', d.g, d.q, ['I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes. Hold the channel as still']);
    expect(d.g.world.party).toContain(KES);
    const e = core('kept');
    talk('d_hc_lawal', e.g, e.q, ['I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes. Hold the channel as still']);
    expect(e.g.flags).toMatchObject({ hc_leash: 'cut', kes_left: 'dead', kes_dead: true });
    expect(e.g.world.party).not.toContain(KES);
  });

  it('burned at the trunk\'s console (Science): through the keeper; blown (Explosives): the alarm; a live port beside you falls with the Reach', () => {
    const a = core('kept');
    skills(a.g, { science: 90 });
    talk('d_hc_trunk', a.g, a.q, ['(Burn the channel from the console.)', '(It is done.)']);
    expect(a.g.flags).toMatchObject({ hc_leash: 'cut', hc_leash_how: 'console', hc_lawal: 'dead', kes_fits: true });
    expect(view('d_hc_lawal', a.g, a.q).text).toContain('burned black');

    const b = core(undefined, false);
    skills(b.g, { explosives: 90 });
    talk('d_hc_trunk', b.g, b.q, ['(Set the cutting charges']);
    expect(b.g.flags).toMatchObject({ hc_leash: 'cut', hc_leash_how: 'blow', hc_alarm: true });

    const c = core(undefined, false);
    talk('d_hc_trunk', c.g, c.q, ['(Burn the channel from the console.)']);
    expect(c.g.flags.hc_leash).toBeUndefined();
    expect(options('d_hc_trunk', c.g, c.q)).not.toContain('(Burn the channel from the console.)');
  });

  it('seized: the key in the player\'s hand; then burned with the key, or sold to Soto, the guild or the Chair (Kes walks out)', () => {
    const a = core('dark');
    talk('d_hc_lawal', a.g, a.q, ['I\'ve decided', '(Cut the keeper\'s key']);
    expect(a.g.flags).toMatchObject({ hc_leash: 'seized', leash_holder: 'player', hc_lawal: 'free' });
    expect(stage(a.g, 'q_hc_leash')).toBe('seized');
    expect(modValue(a.g, M1_LEASH)).toBe('yours');
    talk('d_hc_trunk', a.g, a.q, ['(Put the keeper\'s key']);
    expect(a.g.flags.hc_leash).toBe('cut');
    expect(status(a.g, 'q_hc_leash')).toBe('done');

    const b = core('dark');
    talk('d_hc_lawal', b.g, b.q, ['I\'ve decided', '(Cut the keeper\'s key']);
    b.g.locationId = 'hc_board';
    talk('d_hc_soto', b.g, b.q, ['That\'s all.']);
    talk('d_hc_soto', b.g, b.q, ['(Put the keeper\'s key on her desk.)']);
    expect(b.g.flags).toMatchObject({ hc_leash: 'sold', leash_holder: 'soto', kes_left: 'leash' });
    expect(b.g.world.party).not.toContain(KES);
    expect(status(b.g, 'q_hc_leash')).toBe('failed');

    const c = core(undefined, false);
    talk('d_hc_lawal', c.g, c.q, ['I\'ve decided', '(Cut the keeper\'s key']);
    c.g.locationId = 'hc_terrace';
    talk('d_hc_voight', c.g, c.q, ['That\'s all.']);
    talk('d_hc_voight', c.g, c.q, ['(Put the keeper\'s key on his ledger.)']);
    expect(c.g.flags).toMatchObject({ hc_leash: 'sold', leash_holder: 'guild' });
    expect(c.g.flags.kes_left).toBeUndefined();

    const d = core(undefined, false);
    talk('d_hc_lawal', d.g, d.q, ['I\'ve decided', '(Cut the keeper\'s key']);
    toBall(d.g, d.q);
    talk('d_hc_chair', d.g, d.q, ['(Give him the keeper\'s key.)']);
    expect(d.g.flags.leash_holder).toBe('chair');
    expect(modValue(d.g, M1_LEASH)).toBe('sold');
  });

  it('left in his spine; and a sold door in the Skirts is a patch the keeper remembers', () => {
    const a = core(undefined, false);
    talk('d_hc_lawal', a.g, a.q, ['I\'ve decided', '(Leave it. Leave him.)']);
    expect(a.g.flags.hc_leash).toBe('left');
    expect(status(a.g, 'q_hc_leash')).toBe('done');
    expect(modValue(a.g, M1_LEASH)).toBe('theirs');
    const b = guest();
    b.g.flags.hs_leash_sold = true;
    b.g.locationId = 'hc_works';
    talk('d_hc_lawal', b.g, b.q, ['What are you?']);
    expect(b.g.world.knowledge.hc_lawal_told).toBe(true);
    expect(new DialogueRunner(DIALOGUES.d_hc_lawal, b.g, b.q).view()!.text).not.toBe('');
  });
});

// ---------------------------------------------------------------- A Contract for Kes

function kesOffered(link?: 'cut' | 'dark' | 'kept') {
  const s = guest();
  withKes(s.g, link);
  s.g.locationId = 'hc_board';
  talk('d_hc_soto', s.g, s.q, ['(There is a folder on her desk']);
  return s;
}

describe('A Contract for Kes: her red line tested', () => {
  it('the offer at Soto\'s desk; page thirty read (Barter), or not; torn up', () => {
    const { g, q } = kesOffered();
    expect(stage(g, 'q_hc_kes')).toBe('offer');
    expect(has(g, 'k_hc_kes_contract')).toBe(true);
    talk('d_hs_kes', g, q, ['The Concern\'s contract.', 'Let me read it.']);
    expect(g.world.knowledge.hc_kes_clause).toBeUndefined();
    skills(g, { barter: 90 });
    expect(options('d_hs_kes', g, q)).toContain('The Concern\'s contract.');
    const before = approval(g);
    talk('d_hs_kes', g, q, ['The Concern\'s contract.', 'Tear it up.']);
    expect(g.flags.hc_kes_contract).toBe('refused');
    expect(approval(g)).toBe(before + 10);
    expect(status(g, 'q_hc_kes')).toBe('done');
  });

  it('turned: signed for the keeper\'s door (Speech), after the clause is known; refused to sign once', () => {
    const a = kesOffered();
    skills(a.g, { barter: 90 });
    talk('d_hs_kes', a.g, a.q, ['The Concern\'s contract.', 'Let me read it.', '(Back to the contract.)', 'Sign it. Then use the door']);
    expect(a.g.flags.hc_kes_contract).toBeUndefined();
    const b = kesOffered();
    skills(b.g, { barter: 90, speech: 90 });
    talk('d_hs_kes', b.g, b.q, ['The Concern\'s contract.', 'Let me read it.', '(Back to the contract.)', 'Sign it. Then use the door']);
    expect(b.g.flags).toMatchObject({ hc_kes_contract: 'turned', hc_core_door: true });
    b.g.locationId = 'hc_works';
    expect(options('d_hc_coredoor', b.g, b.q)).toContain('(Kes shows the door her contract. The keeper\'s door opens for the keeper.)');
  });

  it('the keeper route: the man who signed it forty-one years ago, told to her, gives her page thirty', () => {
    const { g, q } = kesOffered();
    g.world.knowledge.hc_lawal_told = true;
    talk('d_hs_kes', g, q, ['The Concern\'s contract.', 'I met the man who signed this']);
    expect(g.world.knowledge.hc_kes_clause).toBe(true);
    expect(g.world.quests.q_hc_kes.stage).toBe('offer');
  });

  it('urged: telling her to take it is her red line; she leaves, and the quest fails', () => {
    const { g, q } = kesOffered();
    talk('d_hs_kes', g, q, ['The Concern\'s contract.', 'Take it, Kes.']);
    expect(g.flags).toMatchObject({ hc_kes_contract: 'urged', kes_left: 'contract' });
    expect(g.world.party).not.toContain(KES);
    expect(status(g, 'q_hc_kes')).toBe('failed');
  });

  it('her own words inside: the gardens at sixteen, once', () => {
    const { g, q } = guest();
    withKes(g);
    talk('d_hs_kes', g, q, ['Tell me about the first time']);
    expect(options('d_hs_kes', g, q)).not.toContain('Tell me about the first time you saw this.');
  });
});

// ---------------------------------------------------------------- the Garden Heist

function jars(over: Record<string, unknown> = {}) {
  const s = guest('broken');
  Object.assign(s.g.flags, over);
  skills(s.g, { speech: 90 });
  talk('d_hc_yaw', s.g, s.q, ['You\'re from the Skirts.']);
  talk('d_hc_yaw', s.g, s.q, ['What\'s in the seed vault?', 'Something else.', 'What do you grow for yourself?', 'Something else.']);
  return s;
}

describe('Garden Heist', () => {
  it('the keeper\'s trust and his jars; the vault read for what it is (Science); a keeper who will not trust', () => {
    const a = guest();
    talk('d_hc_yaw', a.g, a.q, ['You\'re from the Skirts.']);
    talk('d_hc_yaw', a.g, a.q, ['What do you grow for yourself?']);
    expect(a.g.flags.hc_yaw_trust).toBeUndefined();
    const b = jars();
    expect(has(b.g, 'k_hc_jars')).toBe(true);
    expect(stage(b.g, 'q_hc_garden')).toBe('jars');
    skills(b.g, { science: 90 });
    talk('d_hc_seedvault', b.g, b.q);
    expect(b.g.world.knowledge.hc_seed_f1).toBe(true);
  });

  it('the seed vault is a locked container (Security 50) holding the Concern\'s seed case', () => {
    expect(MAPS.hc_terrace.containers!.hc_seedvault).toMatchObject({ lock: 50, items: [['k_hc_seedcase', 1]] });
  });

  it('carried out as the unwatched guest to Nursery; down the freight to Openfield; the marked guest turned out', () => {
    const a = jars();
    talk('d_hc_yaw', a.g, a.q, ['The jars. How do we get them down?', '(Carry them out through the arch', 'Nursery.']);
    expect(a.g.flags).toMatchObject({ hc_garden: 'skirts', hc_garden_how: 'guest' });
    expect(has(a.g, 'k_hc_oranges')).toBe(true);
    expect(status(a.g, 'q_hc_garden')).toBe('done');

    const b = jars({ hs_shift: 'won' });
    talk('d_hc_yaw', b.g, b.q, ['The jars. How do we get them down?', '(The freight at two', 'Openfield.']);
    expect(b.g.flags).toMatchObject({ hc_garden: 'openfield', hc_garden_how: 'freight' });

    const c = jars({ hs_marked: true });
    talk('d_hc_yaw', c.g, c.q, ['The jars. How do we get them down?', '(Carry them out through the arch', '(Another way.)']);
    expect(c.g.flags.hc_garden).toBeUndefined();
  });

  it('down the tunnel at the search (Stealth), or caught and the keeper reviewed; sold to the guild\'s factor', () => {
    const a = jars();
    skills(a.g, { stealth: 90 });
    talk('d_hc_yaw', a.g, a.q, ['The jars. How do we get them down?', '(Down the tunnel', 'Nursery.']);
    expect(a.g.flags.hc_garden_how).toBe('tunnel');
    const b = jars();
    talk('d_hc_yaw', b.g, b.q, ['The jars. How do we get them down?', '(Down the tunnel']);
    expect(b.g.flags).toMatchObject({ hc_garden: 'caught', hc_yaw: 'review' });
    expect(status(b.g, 'q_hc_garden')).toBe('failed');
    expect(view('d_hc_yaw', b.g, b.q).text).toContain('apron');
    const c = jars();
    talk('d_hc_voight', c.g, c.q, ['That\'s all.']);
    talk('d_hc_voight', c.g, c.q, ['(Show him the keeper\'s jars.)', '(Sell.)']);
    expect(c.g.flags.hc_garden).toBe('sold');
    expect(status(c.g, 'q_hc_garden')).toBe('failed');
  });
});

// ---------------------------------------------------------------- Funicular Pass

function linh(shift: 'won' | 'broken' | 'revolt' = 'broken') {
  const s = guest(shift);
  talk('d_hc_linh', s.g, s.q, ['Why do you count it?']);
  return s;
}

describe('Funicular Pass', () => {
  it('why her pass was refused (the registry, or Kes for the match); the crew under the steward\'s stop; the freight paid', () => {
    const a = linh('won');
    talk('d_hc_registry', a.g, a.q, ['A citizen called Hoang, L.']);
    expect(stage(a.g, 'q_hc_funicular')).toBe('reserve');
    talk('d_hc_mazur', a.g, a.q, ['That\'s all.']);
    talk('d_hc_mazur', a.g, a.q, ['There\'s a citizen inside the arch', 'Under the steward\'s stop, then.']);
    expect(a.g.flags).toMatchObject({ hc_funicular: 'down', hc_funicular_how: 'crew' });
    expect(cond(placed('hc_terrace', 'npc_hc_14').if, a.g)).toBe(false);

    const b = linh('broken');
    talk('d_hc_mazur', b.g, b.q, ['That\'s all.']);
    talk('d_hc_mazur', b.g, b.q, ['(Put sixty Tolls on his brake.)', 'Something else.', 'There\'s a citizen inside the arch', 'The freight at two']);
    expect(b.g.flags.hc_funicular_how).toBe('freight');
  });

  it('a pass printed by Kes, or signed by Soto (Speech) or refused by her; given, she goes', () => {
    const a = linh();
    withKes(a.g);
    talk('d_hc_registry', a.g, a.q, ['Linh Hoang. Why was her pass refused?', 'Something else.', 'Print her a pass down.']);
    expect(a.g.world.knowledge.hc_linh_match).toBe(true);
    talk('d_hc_linh', a.g, a.q, ['(Give her the pass.)']);
    expect(a.g.flags).toMatchObject({ hc_funicular: 'down', hc_funicular_how: 'pass' });
    const b = linh();
    b.g.locationId = 'hc_board';
    talk('d_hc_soto', b.g, b.q, ['That\'s all.']);
    talk('d_hc_soto', b.g, b.q, ['Sign a pass down for Linh Hoang.']);
    expect(has(b.g, 'k_hc_linh_pass')).toBe(false);
    const c = linh();
    c.g.locationId = 'hc_board';
    skills(c.g, { speech: 90 });
    talk('d_hc_soto', c.g, c.q, ['That\'s all.']);
    talk('d_hc_soto', c.g, c.q, ['Sign a pass down for Linh Hoang.']);
    expect(has(c.g, 'k_hc_linh_pass')).toBe(true);
  });

  it('the road at night (Stealth) or walked back; told what RESERVE means she stays, or goes; reported, for money or not', () => {
    const a = linh();
    skills(a.g, { stealth: 90 });
    talk('d_hc_linh', a.g, a.q, ['Tonight. The road']);
    expect(a.g.flags.hc_funicular_how).toBe('road');
    const b = linh();
    talk('d_hc_linh', b.g, b.q, ['Tonight. The road']);
    expect(b.g.flags.hc_funicular).toBeUndefined();

    const c = linh();
    c.g.world.knowledge.hc_linh_reserve = true;
    talk('d_hc_linh', c.g, c.q, ['(Tell her what RESERVE means.)', 'They\'ll type another one.']);
    expect(c.g.flags.hc_funicular).toBe('stayed');
    expect(cond(placed('hc_terrace', 'npc_hc_14_stayed').if, c.g)).toBe(true);
    const d = linh();
    d.g.world.knowledge.hc_linh_reserve = true;
    talk('d_hc_linh', d.g, d.q, ['(Tell her what RESERVE means.)', 'That\'s not yours to carry.']);
    expect(d.g.flags.hc_linh_wants).toBe(true);

    const e = linh();
    const tolls = e.g.pc.inventory.tolls;
    talk('d_hc_registry', e.g, e.q, ['A citizen wants to go down', '(Take the money.)']);
    expect(e.g.flags.hc_funicular).toBe('reported');
    expect(e.g.pc.inventory.tolls).toBe(tolls + 80);
    expect(status(e.g, 'q_hc_funicular')).toBe('failed');
    const f = linh();
    talk('d_hc_registry', f.g, f.q, ['A citizen wants to go down', '(Leave the money']);
    expect(f.g.flags.hc_funicular).toBe('reported');
  });
});

// ---------------------------------------------------------------- the Contract's last step, the save, Act 3

describe('Halcyon end to end', () => {
  it('a probationary citizen fitted with the Concern\'s work registers as a contract citizen at the gate', () => {
    const { g, q } = atGate('broken');
    talk('d_hs_bell', g, q, ['I want a contract.']);
    talk('d_hs_bell', g, q, ['A citizen\'s contract, for a season\'s term.', '(Sign.)']);
    leashed(g);
    talk('d_hc_arata', g, q, ['That\'s all.']);
    talk('d_hc_arata', g, q, ['I\'m fitted.']);
    expect(g.world.membership.concern.rank).toBe('contract');
  });

  it('saves in the middle of the hill and plays on after loading: the ball, the ward and the leash pick up where they were', async () => {
    const { g, q } = guest();
    withKes(g, 'cut');
    g.flags.hs_nils = 'up';
    toBall(g, q);
    talk('d_hc_portraits', g, q);
    const sm = new SaveManager(new MemoryBackend());
    await sm.write('slot1', { label: 'Halcyon', locationId: g.locationId, locationName: 'Halcyon', minutes: g.minutes, playtimeSec: 1 }, g);
    const back = (await sm.read('slot1'))!;
    expect(back.state).toEqual(g);
    const g2 = back.state as G;
    const q2 = new QuestEngine(QUESTS, g2);
    expect(stage(g2, 'q_a2_halcyon')).toBe('offer');
    expect(g2.flags.hc_nils).toBe('dead');
    expect(view('d_hc_chair', g2, q2).text).toContain('Bramble');
    talk('d_hc_soto', g2, q2, ['No.']);
    expect(stage(g2, 'q_a2_halcyon')).toBe('refused');
    g2.locationId = 'hc_works';
    fire(g2, q2, 'hc_works', 'core');
    talk('d_hc_lawal', g2, q2, ['What are you?', 'Something else.', 'Can it be stopped?', 'Something else.', 'I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes.)']);
    expect(g2.flags.hc_leash).toBe('cut');
  });

  it('a whole Halcyon leaves every flag Act 3 reads with a value it knows', () => {
    const { g, q } = guest();
    withKes(g, 'cut');
    skills(g, { speech: 90, medicine: 90, barter: 90 });
    g.locationId = 'hc_board';
    talk('d_hc_soto', g, q, ['(There is a folder on her desk', 'Something else.', 'That\'s all.']);
    talk('d_hs_kes', g, q, ['The Concern\'s contract.', 'Tear it up.']);
    talk('d_hc_portraits', g, q);
    talk('d_hc_chair', g, q, ['(Go to the Chair.)', 'What does the Board want with me?', '(Back.)', 'How old are you?', '(Back.)', '(Say yes. Mean no.)', '(Back.)', '(Raise your glass']);
    g.locationId = 'hc_works';
    fire(g, q, 'hc_works', 'core');
    talk('d_hc_lawal', g, q, ['What are you?', 'Something else.', 'Can it be stopped?', 'Something else.', 'I\'ve decided', '(Kes. Ride the channel', '(Do it, Kes.)']);
    g.flags.hc_clinic = 'freed';
    g.flags.hc_garden = 'skirts';
    g.flags.hc_funicular = 'down';
    for (const f of B4B_FLAGS.filter((x) => x !== 'hc_reserve')) expect(g.flags[f], f).toBeDefined();
    expect(cond(B4B.offer('feigned'), g)).toBe(true);
    expect(cond(B4B.leash('cut'), g)).toBe(true);
    expect(cond(B4B.longlived('exposed'), g)).toBe(true);
    expect(cond(B4B.contract('guest'), g)).toBe(true);
  });
});

// ---------------------------------------------------------------- the Long Night reads the Board's answer (B6k, B4b's open hook)

describe('The Long Night reads the Board\'s answer: Roux, the Concern\'s envoy at Openfield (beat 17)', () => {
  /** The night's eve at Openfield, the Board answered on the hill (or not at all). */
  function eve(offer?: 'accepted' | 'refused' | 'feigned') {
    const g = newGameState('openfield', 0, 0);
    g.minutes = 160 * 1440 + 20 * 60;
    g.locationId = 'openfield';
    Object.assign(g.flags, { ch1_done: true, a2_spire_done: true, ln_called: true, ln_at_openfield: true });
    if (offer) Object.assign(g.flags, { hc_inside: true, hc_soto_met: true, hc_offer: offer });
    return { g, q: new QuestEngine(QUESTS, g) };
  }
  it('his first word is the Board\'s answer (accepted, feigned, refused), and he says once what it means tonight', () => {
    const cases: ['accepted' | 'refused' | 'feigned', string, string][] = [
      ['accepted', 'The Board wrote that you had taken its seat', 'A seat is not a leash. Not yet.'],
      ['feigned', 'The Board writes that you have a seat in waiting', 'If you did not, I will know by morning'],
      ['refused', 'The Board writes that you declined its seat', 'at a worse price, on the day you take the sash'],
    ];
    for (const [offer, first, seat] of cases) {
      const { g, q } = eve(offer);
      const r = talk('d_ln_roux', g, q);
      expect(r.view()!.text, offer).toContain(first);
      expect(talk('d_ln_roux', g, q, ['The Board\'s seat.']).view()!.text, offer).toContain(seat);
      const s = talk('d_ln_roux', g, q);
      expect(s.view()!.options.map((o) => o.text), offer).not.toContain('The Board\'s seat.');
      expect(g.world.knowledge.ln_roux_seat, offer).toBe(true);
    }
  });
  it('without the arcology\'s answer, Roux is as he was, and there is no seat to talk about', () => {
    const { g, q } = eve();
    const r = talk('d_ln_roux', g, q);
    expect(r.view()!.text).toContain('The Concern backs the guild\'s claim. I am here to see it honoured.');
    expect(talk('d_ln_roux', g, q).view()!.options.map((o) => o.text)).not.toContain('The Board\'s seat.');
    // the Weighbridge memory still comes first when the player billed the Bond
    const b = eve('accepted');
    b.g.flags.dk_concern_billed = true;
    expect(talk('d_ln_roux', b.g, b.q).view()!.text).toContain('Every box to the plate');
    expect(talk('d_ln_roux', b.g, b.q).view()!.options.map((o) => o.text)).toContain('The Board\'s seat.');
  });
});
