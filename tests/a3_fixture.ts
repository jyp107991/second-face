import { expect } from 'vitest';
import { CONCLUSIONS, DIALOGUES, MAPS, NPCS, QUESTS, WORLD_EVENTS } from '../src/content';
import { COMPANIONS, type CompanionKey, type Side } from '../src/content/world/a3_conds';
import { dayOf, newGameState, type GameState } from '../src/engine/core/state';
import { DialogueRunner } from '../src/engine/dialogue/dialogue';
import { QuestEngine } from '../src/engine/quest/quest';
import { SaveManager, type SlotId } from '../src/engine/save/saves';
import { MemoryBackend } from '../src/engine/save/storage';
import type { AttributeId, SkillId } from '../src/engine/stats/rules';
import { runWorldEvents, tryConclude } from '../src/engine/world/frontier';
import { apply, test as cond, type LogicHost } from '../src/engine/world/logic';

/**
 * The shared Act 3 fixture (B6a; every B6 slice builds its game states here). `actThree(preset, over)` returns a game
 * whose Acts 1–2 are behind the player as the preset writes them, the Long Night closed on an alliance and a band, the
 * companions each in a state, the arcology slice's hook on or off, and Act 3 opened to the point asked: `eve` (Act 2
 * closed, the post not yet come), `open` (the post has come) or `read` (the order read: the default).
 *
 * Presets: `prepared` (a thorough Acts 1–2: precedents, debts owed, allies' needs met, the mast's groundwork, Nine with
 * the player as its own keeper; a truce at the Long Night) · `hostile` (the worst plausible: Nine gone, Ash gone, the
 * verdict refused, the register catalogued, no ally's need met, the Concern refused, the mast dead; nobody stood with at
 * the Long Night) · `choir` | `guild` | `ledger` | `truce` | `none` (a plain, middling Acts 1–2 closed on that alliance;
 * `band` strong | mixed | thin for the first three). Everything can be overridden with `over`.
 *
 * Also exported: the headless helpers of the B5 tests (`talk`, `view`, `options`, `waitFor`, `hour`, `at`, `conclude`,
 * `fire`, `placed`, `trigger`, `skills`, `has`, `stage`, `status`) and `saveAndLoad`, which writes the state through the
 * real save codec (`SaveManager` on a `MemoryBackend`) and reads it back.
 */

export type G = GameState;
export type Preset = 'prepared' | 'hostile' | Side;
export type NightBand = 'strong' | 'mixed' | 'thin';
/** never met · met (not joined) · travelling · joined and waiting · left (can be won back) · gone for good ·
 * (Tamsin only) still inside the Cistern, never out · gone home into it. */
export type CompanionState = 'never' | 'met' | 'party' | 'waiting' | 'left' | 'gone' | 'inside' | 'home';
export type Company = Partial<Record<CompanionKey, CompanionState>> | 'everyone' | 'nobody' | 'estranged';
export type Point = 'eve' | 'open' | 'read';
type Flags = Record<string, number | string | boolean>;

export interface Over {
  alliance?: Side;
  band?: NightBand;
  companions?: Company;
  approval?: Partial<Record<CompanionKey, number>>;
  /** The arcology slice's hook: true for the preset's own B4b outcomes, or the hc_* flags to set over them. */
  b4b?: boolean | Flags;
  flags?: Flags;
  knows?: string[];
  items?: string[];
  tolls?: number;
  skills?: Partial<Record<SkillId, number>>;
  attrs?: Partial<Record<AttributeId, number>>;
  origin?: string | null;
  /** A settlement's standing, as a story heard there (it fades as stories do: leave a margin over a threshold). */
  standing?: Record<string, number>;
  rep?: Record<string, number>;
  trust?: Record<string, number>;
  /** Faction memberships (faction → rank). */
  members?: Record<string, string>;
  /** The map the player is on (default: Openfield, the morning after its night). */
  at?: string;
  point?: Point;
  /** Outer host for the quest engine (to catch `event` effects such as the title card). */
  host?: LogicHost;
}
export interface A3 { g: G; q: QuestEngine; fired: string[] }

// ---------------------------------------------------------------- the histories

interface History { flags: Flags; knows: string[]; items: string[]; tolls: number; skills: Partial<Record<SkillId, number>>; standing: Record<string, number>; rep: Record<string, number>; trust: Record<string, number>; members: Record<string, string>; company: Partial<Record<CompanionKey, CompanionState>>; approval: number; b4b: Flags }

const PREPARED: History = {
  flags: {
    kn_maud_saved: true, kn_linnet_stays: true, kn_hatch_haggled: true, c9_knows_shale: true, tam_why: true, tam_secret: 'mother', tam_pledge: 'door',
    jonah_lived: true, militia_drilled: true, dw_outcome: 'restored', ledger_shown_ada: true, hound_outcome: 'kept', wren_exodus: true, teo_freed: true, broadcast_amplified: true,
    of_blight_outcome: 'exposed', of_seed_outcome: 'exposed', sky_rite: true,
    ar_verdict: 'contested', ca_precedents: 3, ca_cases_heard: 3, prec_forecast_fine: 'void', prec_unrecorded: 'yields', prec_refuse_benefit: true, prec_register: 'kept', prec_unit_keeper: 'self',
    sk_saved: true, sk_pumps: 'paid', ks_vane: 'broken', cr_concern: 'exposed', bw_static: 'kept', bw_turf: 'peace', bw_three_crews: true, bw_raid: 'won', bw_dogs_hold: true, vasha_fate: 'ilya', vasha_dead: true, dr_buggy: 'heron',
    hs_shift: 'won', ks_maren: 'lives',
    rc_line: 'halts', rc_pilot: true, ds_boats_owed: true, nw_barges_owed: true, dk_stand_owed: true, dk_prec_passenger: true, nw_dam: 'truth', nw_controllers: 'river', tm_four: 'ended', tm_shift: 'joined',
    an_kelso: 'held', an_key: 'none', an_reserve: 'sealed',
    nine_deed: 'self', nine_deed_how: 'witnessed', nine_deed_made: true, nine_stance: 'conscience', nine_log_given: true,
    ash_orders: 'refused', ash_stance: 'knowing', ash_gully_outcome: 'spoken', odile_price: 'none', odile_sheet: 'torn', kes_link: 'kept', kes_lineage: 'speak', wren_rope: 'broken',
    ks_calla: 'free', ln_calla: 'freed', ln_calla_how: 'pilot',
  },
  knows: ['mast_powered', 'relay_log_read', 'mags_exposed', 'bram_answered_truth'],
  items: ['k_ar_refusals', 'k_ar_warrant'],
  tolls: 900,
  skills: { speech: 70, science: 50, mechanics: 50, stealth: 45, barter: 50, survival: 45, firearms: 50, medicine: 40, security: 50, explosives: 30 },
  standing: { cistern9: 30, shale: 30, openfield: 25, meridian: 15, wheel: 20 },
  rep: { rust_dogs: 20 },
  trust: { npc_md_01: 30 },
  members: { wheel: 'roadkin', shale_militia: 'volunteer' },
  company: { tamsin: 'party', nine: 'party', ash: 'waiting', wren: 'waiting', ilya: 'waiting', odile: 'waiting', kes: 'waiting' },
  approval: 40,
  b4b: { hc_inside: true, a2_halcyon_done: true, hc_soto_met: true, hc_ball: true, hc_board_wants: true, hc_offer: 'feigned', hc_contract: 'infiltrator', hc_leash: 'cut', hc_longlived: 'exposed', hc_clinic: 'freed', hc_garden: 'skirts', hc_funicular: 'down' },
};

const HOSTILE: History = {
  flags: {
    kn_maud_scarred: true, kn_linnet_will_run: true, kn_ines_refused: true, c9_told_city: true, tam_secret: 'kept',
    jonah_dead: true, shale_withers: true, dw_outcome: 'sold', ledger_sold: true, hound_outcome: 'sold', rd_coup: true, rd_leader: 'vasha', broadcast_silenced: true,
    of_blight_outcome: 'unwritten', of_seed_outcome: 'chaff', nb_archive_burned: true,
    ar_verdict: 'refused', ca_precedents: 0, prec_register: 'catalogued', prec_unrecorded: 'property', prec_forecast_fine: 'upheld', prec_unit_keeper: 'citizen',
    sk_flooded: true, ks_ocho: 'drowned', ks_vane: 'rises', cr_concern: 'kept', cr_crown_hostile: true, bw_static: 'silenced', bw_turf: 'gilt', vasha_fate: 'spared',
    hs_shift: 'broken', ks_maren: 'hanged', hs_marked: true, hs_gate_shut: true,
    rc_line: 'guild', dk_cradle: 'cut', nw_dam: 'hidden', nw_controllers: 'guild', tm_four: 'kept', tm_digger_concern: true,
    an_kelso: 'sold', an_key: 'concern', an_reserve: 'concern',
    nine_deed: 'city', nine_stance: 'deputy', ash_orders: 'carried', ash_unwritten: true,
    ks_calla: 'imprisoned', ln_calla: 'taken',
  },
  knows: [],
  items: [],
  tolls: 150,
  skills: { speech: 40, science: 40, mechanics: 35, stealth: 35, barter: 35, survival: 40, firearms: 50, medicine: 30, security: 30, explosives: 20 },
  standing: { cistern9: 0, shale: -20, openfield: -10, meridian: -5 },
  rep: {},
  trust: {},
  members: {},
  company: { tamsin: 'party', wren: 'never', ilya: 'left', odile: 'never', ash: 'gone', nine: 'gone', kes: 'never' },
  approval: 15,
  b4b: { hc_inside: true, a2_halcyon_done: true, hc_ball: true, hc_board_wants: true, hc_offer: 'refused', hc_contract: 'guest', hc_leash: 'left', hc_longlived: 'kept', hc_garden: 'sold', hc_funicular: 'reported' },
};

const MIDDLING: History = {
  flags: {
    kn_maud_saved: true, kn_linnet_to_shale: true, tam_secret: 'kept',
    jonah_lived: true, dw_outcome: 'freed', hound_outcome: 'shale',
    of_blight_outcome: 'mercy', of_seed_outcome: 'cut',
    ar_verdict: 'noted', ca_precedents: 1, ca_cases_heard: 2, prec_unrecorded: 'outside', prec_register: 'kept',
    sk_pumps: 'retimed', sk_saved: true, ks_vane: 'rises', cr_concern: 'kept', bw_static: 'concern', bw_turf: 'rustmouths',
    hs_shift: 'won', ks_maren: 'lives',
    rc_line: 'shared', nw_dam: 'exposed', nw_controllers: 'ledger',
    an_kelso: 'taken', an_key: 'player', an_reserve: 'player',
    nine_deed: 'player', nine_deed_how: 'bought', nine_deed_made: true, nine_stance: 'deputy', ash_orders: 'warned', ash_stance: 'clean', odile_price: 'refused', odile_sheet: 'kept', kes_link: 'kept',
    ks_calla: 'imprisoned', ln_calla: 'taken',
  },
  knows: ['mast_powered'],
  items: ['k_ar_refusals', 'k_an_core'],
  tolls: 400,
  skills: { speech: 55, science: 50, mechanics: 45, stealth: 45, barter: 45, survival: 45, firearms: 55, medicine: 40, security: 40, explosives: 30 },
  standing: { cistern9: 15, shale: 15, openfield: 10, meridian: 5 },
  rep: {},
  trust: { npc_md_01: 10 },
  members: {},
  company: { tamsin: 'party', nine: 'party', ash: 'waiting', wren: 'waiting', ilya: 'waiting', odile: 'waiting', kes: 'waiting' },
  approval: 25,
  b4b: { hc_inside: true, a2_halcyon_done: true, hc_soto_met: true, hc_ball: true, hc_board_wants: true, hc_offer: 'accepted', hc_contract: 'citizen', hc_leash: 'sold', hc_longlived: 'soto', hc_garden: 'openfield', hc_funicular: 'stayed' },
};

/** What the Long Night left at its dawn, by side and band (B5d's table, as its own dawn sets them). */
function night(side: Side, band: NightBand, prec?: string): Flags {
  const strength = { strong: 5, mixed: 3, thin: 0 }[band];
  const people = prec === 'yields' ? 'heard' : prec === 'outside' ? 'outside' : prec === 'property' ? 'removed' : 'relocated';
  switch (side) {
    case 'choir': return { ln_band: band, ln_strength: strength, ...{
      strong: { ln_openfield: 'stands', ln_stores: 'choir', ks_mason: 'lives', ln_precinct_short: true, ln_city_warrant: true },
      mixed: { ln_openfield: 'scorched', ln_stores: 'choir', ks_mason: 'lives', ln_precinct_short: true, ln_city_warrant: true },
      thin: { ln_openfield: 'burned', ln_stores: 'lost', ks_mason: 'dead' },
    }[band] };
    case 'guild': return { ln_band: band, ln_strength: strength, ...{
      strong: { ln_openfield: 'guild', ln_stores: 'guild', ks_mason: 'exiled', ln_leash: 'spreads', ln_guild_holds_flats: true },
      mixed: { ln_openfield: 'scorched', ln_stores: 'half', ks_mason: 'exiled' },
      thin: { ln_openfield: 'burned', ln_stores: 'lost', ks_mason: 'dead', ln_guild_beaten: true },
    }[band] };
    case 'ledger': return { ln_band: band, ln_strength: strength, ...{
      strong: { ln_openfield: 'evicted', ln_stores: 'precinct', ks_mason: 'lives', ln_guild_evicted: true, ln_precinct_fed: true, ln_people: people, ...(people === 'heard' ? { ln_faces_given: true } : {}) },
      mixed: { ln_openfield: 'scorched', ln_stores: 'precinct', ks_mason: 'lives', ln_guild_evicted: true, ln_people: people },
      thin: { ln_openfield: 'burned', ln_stores: 'lost', ks_mason: 'dead', ln_forecast_kept: true },
    }[band] };
    case 'truce': return { ln_band: 'truce', ln_openfield: 'stands', ln_stores: 'split', ks_mason: 'lives', ln_owed: true, ln_trust: 'none', ln_eviction_stayed: true };
    case 'none': return { ln_band: 'none', ln_openfield: 'burned', ln_stores: 'precinct', ks_mason: 'dead', ln_forecast_kept: true, ln_sarr: 'dead', ks_sarr: 'dead' };
  }
}
const NIGHT_END: Record<Side, Partial<Record<NightBand, string>> & { any?: string }> = {
  choir: { strong: 'choir_stands', mixed: 'choir_scorched', thin: 'choir_burned' },
  guild: { strong: 'guild_company', mixed: 'guild_scorched', thin: 'guild_burned' },
  ledger: { strong: 'ledger_evicted', mixed: 'ledger_scorched', thin: 'ledger_burned' },
  truce: { any: 'truce' }, none: { any: 'aside' },
};

// ---------------------------------------------------------------- the companions

const MET: Record<CompanionKey, string | null> = { tamsin: 'tam_met', wren: null, ilya: 'ilya_met', odile: 'odile_met', ash: 'ash_met', nine: 'nine_met', kes: 'kes_met' };
const LEFT: Record<CompanionKey, Flags> = {
  tamsin: { tam_left: true }, wren: { wren_left: 'floor' }, ilya: { ilya_left: 'floor' }, odile: { odile_left: true }, ash: { ash_left: true }, nine: { nine_left: true }, kes: { kes_left: 'floor' },
};
const GONE: Record<CompanionKey, Flags> = {
  tamsin: { tam_left: true, tam_home: true }, wren: { wren_left: 'sold' }, ilya: { ilya_left: 'bottle' }, odile: { odile_left: true, odile_gone: true },
  ash: { ash_left: true, ash_gone: true }, nine: { nine_left: true, nine_gone: true }, kes: { kes_left: 'rafe' },
};
const COMPANY: Record<'everyone' | 'nobody' | 'estranged', Partial<Record<CompanionKey, CompanionState>>> = {
  everyone: { tamsin: 'party', nine: 'party', wren: 'waiting', ilya: 'waiting', odile: 'waiting', ash: 'waiting', kes: 'waiting' },
  nobody: { tamsin: 'never', wren: 'never', ilya: 'never', odile: 'never', ash: 'never', nine: 'never', kes: 'never' },
  estranged: { tamsin: 'left', wren: 'gone', ilya: 'left', odile: 'gone', ash: 'gone', nine: 'gone', kes: 'left' },
};

function companion(g: G, key: CompanionKey, state: CompanionState): void {
  const c = COMPANIONS[key], day = dayOf(g.minutes);
  const meet = () => { if (MET[key]) g.flags[MET[key]!] = true; (g.world.met ??= {})[c.id] = { name: NPCS[c.id].name, day }; };
  if (key === 'tamsin' && state !== 'inside' && state !== 'never') g.flags.tam_out = true;
  switch (state) {
    case 'never': return;
    case 'inside': if (key !== 'tamsin') throw new Error('only Tamsin can still be inside'); g.flags.c9_tamsin_inside = true; return;
    case 'met': meet(); return;
    case 'home': if (key !== 'tamsin') throw new Error('only Tamsin goes home into the Cistern'); meet(); g.flags.tam_joined = true; g.flags.tam_home = true; return;
    default:
      meet();
      g.flags[c.joined] = true;
      if (state === 'party') g.world.party.push(c.id);
      if (state === 'left') Object.assign(g.flags, LEFT[key]);
      if (state === 'gone') Object.assign(g.flags, GONE[key]);
  }
}

// ---------------------------------------------------------------- the fixture

function questDone(g: G, id: string, stage: string): void {
  if (!QUESTS[id]?.stages[stage]?.end) throw new Error(`fixture: ${id} has no ending stage ${stage}`);
  g.world.quests[id] = { stage, status: QUESTS[id].stages[stage].end!, startedAt: 0, log: [], done: [] };
}

export function actThree(preset: Preset = 'prepared', over: Over = {}): A3 {
  const h = preset === 'prepared' ? PREPARED : preset === 'hostile' ? HOSTILE : MIDDLING;
  const side: Side = over.alliance ?? (preset === 'prepared' ? 'truce' : preset === 'hostile' ? 'none' : preset);
  const band: NightBand = over.band ?? 'strong';
  const g = newGameState(over.at ?? 'openfield', 0, 0);
  g.minutes = 200 * 1440 + 6 * 60; // the Long Night's dawn
  g.locationId = over.at ?? 'openfield';
  g.pc.sheet.level = 24;
  g.pc.inventory.tolls = over.tolls ?? h.tolls;
  if (over.origin !== null) g.origin = over.origin ?? undefined;

  // Acts 1–2 behind the player
  Object.assign(g.flags, { ch1_done: true, visited_shale: true, ln_called: true, ln_calla_taken: true, ln_at_openfield: true, ln_done: true, act2_done: true, ln_alliance: side });
  Object.assign(g.flags, h.flags, night(side, band, h.flags.prec_unrecorded as string | undefined));
  // Dry Wells' console writes its outcome twice, as `dw_outcome` and as its own flag (drywells.ts, shale.ts): Ada's Act 1 topic
  // offered on `dw_outcome` answers on the second, so a history with only the first would leave her with nothing to say (B6w).
  g.flags[`dw_${String(g.flags.dw_outcome)}`] = true;
  for (const k of h.knows.concat(over.knows ?? [])) g.world.knowledge[k] = true;
  const b4b = over.b4b ? { ...h.b4b, ...(typeof over.b4b === 'object' ? over.b4b : {}) } : {};
  Object.assign(g.flags, b4b);
  for (const [id, stage] of Object.entries({
    q_ch1_knock: 'done', q_ch1_outriders: 'done', q_ch1_door: 'done', q_ch1_shale: 'done', q_ch1_map: 'done', q_ch1_tribute: 'negotiated', q_ch1_name: 'read',
    q_a1_tollhouse: 'through', q_a1_signal: 'done', q_a1_jonah: g.flags.jonah_lived ? 'lived' : 'fell', q_a1_drywells: String(g.flags.dw_outcome),
    q_a2_ninebridge: 'paid', q_a2_openfield: String(g.flags.of_blight_outcome), q_a2_cistern4: 'proof', q_a2_precinct: 'inside', q_a2_calendar: 'future', q_a2_spire: String(g.flags.ar_verdict),
    q_a2_longnight: NIGHT_END[side].any ?? NIGHT_END[side][band]!,
    ...(preset === 'prepared' ? { q_a1_bram: 'truth' } : {}),
    // beat 16 finished at the Board's answer (B4b: accepted | refused | feigned are its end stages)
    ...(g.flags.hc_inside ? { q_a2_halcyon: String(g.flags.hc_offer ?? 'refused') } : {}),
  })) questDone(g, id, stage);
  // the events of Acts 1–2 that the history has already settled
  Object.assign(g.world.events, { tribute_day: 'happened', tribute_settled: 'happened', ln_call: 'happened', ln_dusk: 'happened', sink_spring: g.flags.sk_pumps ? 'prevented' : 'happened' });

  // who is with the player, and what they think
  const company = over.companions === undefined ? h.company : typeof over.companions === 'string' ? COMPANY[over.companions] : { ...h.company, ...over.companions };
  for (const key of Object.keys(COMPANIONS) as CompanionKey[]) {
    const state = company[key] ?? 'never';
    companion(g, key, state);
    if (state !== 'never' && state !== 'inside') g.world.approval[COMPANIONS[key].id] = over.approval?.[key] ?? h.approval;
  }
  if (g.flags.tam_met) g.world.events.tamsin_out = 'prevented';

  // the player's sheet, pack and standing
  Object.assign(g.pc.sheet.skillBought, h.skills, over.skills ?? {});
  Object.assign(g.pc.sheet.baseAttrs, over.attrs ?? {});
  for (const id of h.items.concat(over.items ?? [])) apply([{ give: id }], g);
  const day = dayOf(g.minutes);
  for (const [settlement, n] of Object.entries({ ...h.standing, ...over.standing })) {
    if (n) g.world.news.push({ id: `fx_${settlement}`, tag: 'fx_standing', about: 'player', valence: n, size: 10, origin: settlement, day, heard: { [settlement]: { day, distortion: 0 } } });
  }
  for (const [f, n] of Object.entries({ ...h.rep, ...over.rep })) g.world.reputation[f] = { respect: n, fear: 0 };
  for (const [npc, n] of Object.entries({ ...h.trust, ...over.trust })) g.world.relations[npc] = { trust: n, affection: 0 };
  for (const [f, rank] of Object.entries({ ...h.members, ...over.members })) g.world.membership[f] = { rank, since: 1, status: 'member' };
  Object.assign(g.flags, over.flags ?? {});

  // Act 3, as far as asked
  const q = new QuestEngine(QUESTS, g, over.host);
  const fired: string[] = [];
  const point = over.point ?? 'read';
  if (point !== 'eve') {
    fired.push(...runWorldEvents(g, WORLD_EVENTS, q));
    hour(g, 7);
    fired.push(...runWorldEvents(g, WORLD_EVENTS, q));
    q.update();
  }
  if (point === 'read') {
    const r = talk('d_a3_order_read', g, q, ['(Break the seal.)']);
    const v = r.view()!;
    const sheet = v.options.find((o) => o.text.startsWith('(There is a fourth sheet'));
    r.choose(sheet ? sheet.id : v.options.find((o) => o.text === '(Fold it.)')!.id);
    if (sheet) r.choose(r.view()!.options[0].id);
    q.update();
  }
  return { g, q, fired };
}

/** Write the state through the real save codec and read it back: the loaded copy, with a fresh quest engine on it. */
export async function saveAndLoad(g: G, slot: SlotId = 'slot1', label = 'Before the steps', host?: LogicHost): Promise<A3> {
  const saves = new SaveManager(new MemoryBackend());
  await saves.write(slot, { label, locationId: g.locationId, locationName: g.locationId, minutes: g.minutes, playtimeSec: g.playtimeSec }, g);
  const file = await saves.read(slot);
  if (!file) throw new Error('save did not come back');
  return { g: file.state, q: new QuestEngine(QUESTS, file.state, host), fired: [] };
}

// ---------------------------------------------------------------- the headless helpers (the B5 tests' pattern)

export function talk(id: string, g: G, q: QuestEngine, picks: string[] = []): DialogueRunner {
  const r = new DialogueRunner(DIALOGUES[id], g, q);
  r.view();
  q.update();
  for (const p of picks) {
    const v = r.view();
    if (!v) throw new Error(`${id}: ended before "${p}"`);
    const o = v.options.find((x) => x.text.startsWith(p) && !x.locked);
    if (!o) throw new Error(`${id}: no option "${p}" in [${v.options.map((x) => x.text).join(' | ')}]`);
    r.choose(o.id);
    r.view();
    q.update();
  }
  return r;
}
export const view = (id: string, g: G, q: QuestEngine) => new DialogueRunner(DIALOGUES[id], g, q).view()!;
export const options = (id: string, g: G, q: QuestEngine) => view(id, g, q).options.map((o) => o.text);
export const trigger = (map: string, id: string) => MAPS[map].triggers!.find((t) => t.id === id)!;
export const placed = (map: string, key: string) => MAPS[map].npcs!.find((n) => (n.id ?? n.def) === key)!;
export const skills = (g: G, s: Partial<Record<SkillId, number>>) => Object.assign(g.pc.sheet.skillBought, s);
export const has = (g: G, item: string) => g.pc.inventory.items.some((i) => i.def === item);
export const stage = (g: G, quest: string) => g.world.quests[quest]?.stage;
export const status = (g: G, quest: string) => g.world.quests[quest]?.status;
/** Move the clock on to the next time it shows `h` o'clock. */
export function hour(g: G, h: number): void {
  let t = Math.floor(g.minutes / 1440) * 1440 + h * 60;
  if (t <= g.minutes) t += 1440;
  g.minutes = t;
}
/** Be at `where`, let what is due happen, wait for `h` o'clock, and let what is due then happen. */
export function waitFor(g: G, q: QuestEngine, where: string, h: number): string[] {
  g.locationId = where;
  const fired = runWorldEvents(g, WORLD_EVENTS, q);
  hour(g, h);
  fired.push(...runWorldEvents(g, WORLD_EVENTS, q));
  q.update();
  return fired;
}
/** A bare game on a map at an hour (no history): for the places' own tests. */
export function at(map: string, h = 10): { g: G; q: QuestEngine } {
  const g = newGameState(map, 0, 0);
  g.minutes = 200 * 1440 + h * 60;
  g.locationId = map;
  g.flags.ch1_done = true;
  g.pc.inventory.tolls = 800;
  return { g, q: new QuestEngine(QUESTS, g) };
}
export function conclude(g: G, q: QuestEngine, id: string): void {
  const c = tryConclude(g, CONCLUSIONS[id].from, CONCLUSIONS, q);
  expect(c?.id).toBe(id);
  q.update();
}
export function fire(g: G, q: QuestEngine, map: string, id: string): void {
  const t = trigger(map, id);
  expect(cond(t.if, g), `${map}/${id}`).toBe(true);
  apply(t.effects, g, q);
  q.update();
}
