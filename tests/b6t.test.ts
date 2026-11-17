import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHROME, CONCLUSIONS, DIALOGUES, FACTIONS, FAMILIES, ITEMS, LEADS, LETTERS, MAPS, NPCS, PERKS, QUESTS, REGIONS, SETTLEMENTS, TRAITS, WORLD_MAP } from '../src/content';
import { d_a3_epilogue } from '../src/content/dialogue/a3_epilogue';
import { SLIDES_CITY } from '../src/content/dialogue/a3_epilogue_city';
import { CALLA_HELD, EP_SLIDES, M2_SINK, MET_CHOIR, MET_CROWN, MET_EDGES, MET_GUILD, MET_SINK, modValue, SARR_ALIVE } from '../src/content/world/a3_conds';
import { validateContent } from '../src/engine/data/validate';
import { test as cond } from '../src/engine/world/logic';
import type { G, Preset } from './a3_fixture';
import {
  assembled, ended, endReadingPeople, ENDS, lengths, nodeOf, nodes, pageOf, play, PRESETS, treeBytes, unwritten, variants, type End, type Flags,
} from './epilogue_fixture';

/**
 * B6t — the epilogue's slides 7–12: the Tollmen and Ninebridge, Openfield and the Choir, the Precinct and the Court, the Sink, the
 * Crown and the streets, the city's edges (the Ring and Carrick). Each end is set as B6q/B6r leave it (`a3_end`, `a3_sash`,
 * `a3_amend_*`) on the shared Act 3 fixture after the door, with the flags the earlier slices and Acts 1–2 write; the epilogue is
 * played headless page by page, as the runtime reopens it.
 */

const ALL_VARIANTS = variants(SLIDES_CITY);
const SLIDE = (id: string) => SLIDES_CITY.find((s) => s.id === id)!;
const page = (g: G, slide: string) => pageOf(play(g), slide);

describe('B6t — the epilogue, slides 7–12: the guild, the Choir, the city', () => {
  it('the slides are the plan\'s seventh to twelfth, assembled into the tree, and each ends in a default', () => {
    expect(SLIDES_CITY.map((s) => s.id)).toEqual(EP_SLIDES.slice(6, 12));
    expect(assembled(SLIDES_CITY)).toBe(true);
    expect(DIALOGUES.d_a3_epilogue).toBe(d_a3_epilogue);
    const errs = validateContent({ maps: MAPS, items: ITEMS, perks: PERKS, traits: TRAITS, npcs: NPCS, dialogues: DIALOGUES, quests: QUESTS, settlements: SETTLEMENTS, regions: REGIONS, worldMap: WORLD_MAP, chrome: CHROME, factions: FACTIONS, letters: LETTERS, leads: LEADS, conclusions: CONCLUSIONS, families: FAMILIES });
    expect(errs.filter((e) => /epilogue/.test(e))).toEqual([]);
    for (const s of SLIDES_CITY) {
      expect(s.variants.at(-1)!.if, s.id).toBeUndefined();
      for (const v of s.variants.slice(0, -1)) expect(v.if, `${s.id}/${v.id}`).toBeDefined();
    }
    // every page of slides 7–12 sits in the start list in slide order, after slides 1–6
    const order = d_a3_epilogue.start.map((s) => s.node).filter((n) => ALL_VARIANTS.includes(n));
    expect(order).toEqual(ALL_VARIANTS);
    // the plan's §6.3 ids where it names one (B: precinct_failing, sink_lost|held; D: guild_worthless, choir_open; E: precinct_clauses)
    expect(SLIDE('precinct').variants.map((v) => v.id)).toEqual(expect.arrayContaining(['failing', 'clauses']));
    expect(SLIDE('guild').variants.map((v) => v.id)).toContain('worthless');
    expect(SLIDE('choir').variants.map((v) => v.id)).toContain('open');
    expect(SLIDE('sink').variants.map((v) => v.id)).toEqual(M2_SINK.values.map((v) => v.id));
    // each page's still resolves to a real map, spot and people
    for (const s of SLIDES_CITY) for (const v of s.variants) {
      expect(MAPS[v.place]?.spots?.[v.spot], `${s.id}/${v.id} ${v.place}/${v.spot}`).toBeDefined();
      for (const p of v.people) expect(NPCS[p.npc], `${s.id}/${v.id} ${p.npc}`).toBeDefined();
    }
    // who stands in a still never depends on the end (the runtime evaluates it; the builder specialises each page to its end)
    expect(endReadingPeople(SLIDES_CITY)).toEqual([]);
  });

  it('every variant is reached from the fixture\'s presets, with flags as Acts 1–3 set them', () => {
    const reached = new Set<string>();
    const at = (slide: string, preset: Preset, end: End, flags: Flags, want: string) => {
      const n = nodeOf(ended(preset, end, flags).g, slide);
      expect(n, `${slide} ${preset} ${end} ${JSON.stringify(flags)}`).toBe(`${slide}_${want}`);
      reached.add(n!);
    };
    // the guild: by the end
    for (const [end, want] of [['C', 'concern'], ['D', 'worthless'], ['B', 'idle'], ['E', 'audited'], ['A1', 'scheduled'], ['A2', 'rerouted']] as [End, string][]) at('guild', 'prepared', end, {}, want);
    // the Choir: D first, then Openfield as the Long Night left it (B5d's dawn, by alliance and band)
    at('choir', 'prepared', 'D', {}, 'open');
    at('choir', 'none', 'B', {}, 'burned');
    at('choir', 'guild', 'A1', {}, 'company');
    at('choir', 'ledger', 'A2', {}, 'evicted');
    at('choir', 'choir', 'E', { ln_openfield: 'scorched', ln_band: 'mixed' }, 'scorched');
    at('choir', 'prepared', 'A2', {}, 'stands');
    // the Precinct: by the end
    for (const [end, want] of [['B', 'failing'], ['D', 'wall'], ['E', 'clauses'], ['C', 'contracted'], ['A1', 'orders'], ['A2', 'rerouted']] as [End, string][]) at('precinct', 'hostile', end, {}, want);
    // the Sink: M2's value (the pumps kept or not in Act 2; the dam's truth; the core destroyed)
    at('sink', 'prepared', 'B', {}, 'lost');
    at('sink', 'prepared', 'B', { sk_pumps: 'seized' }, 'held');
    at('sink', 'prepared', 'A1', {}, 'saved');
    at('sink', 'hostile', 'A2', { ocho_met: true, nw_sink_relief: true }, 'relieved');
    at('sink', 'hostile', 'A2', { ocho_met: true }, 'flooded');
    // the Crown: the house's fate at the Masque, or on schedule, or at Brother Ash's hand (B6p)
    at('crown', 'choir', 'A1', { a3_ash: 'away', a3_ash_target: 'vane', cr_celestine_dead: true }, 'ash');
    at('crown', 'prepared', 'B', { cr_celestine_dead: true }, 'fallen');
    at('crown', 'hostile', 'D', {}, 'risen');
    at('crown', 'prepared', 'C', {}, 'broken');
    at('crown', 'choir', 'E', { ks_vane: false }, 'late');
    at('crown', 'choir', 'A2', { ks_vane: false }, 'table');
    // the edges: the reserve walked off at Carrick (B6k), the Stand, the Hulls, Leven, Clover
    at('edges', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'court' }, 'walked');
    at('edges', 'prepared', 'B', { dk_stand: 'organised', dk_black: 'won' }, 'stood');
    at('edges', 'prepared', 'C', { dk_hulls: 'cleared', dk_hulls_empty: true, dk_cradle: 'cut' }, 'cleared');
    at('edges', 'hostile', 'A1', { dr_leven: 'paid', dr_leven_burned: true }, 'burned');
    at('edges', 'prepared', 'A2', {}, 'clover');
    expect([...reached].sort()).toEqual([...ALL_VARIANTS].sort());
    // the walked page follows how they walked (slide 3 tells the buffer; this one the year on the quay)
    expect(page(ended('prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'cradle' }).g, 'edges')!.text).toMatch(/Benguela Star's crew book/);
    expect(page(ended('prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'forced', a3_c9_after: 'walked', a3_buffer_how: 'stand' }).g, 'edges')!.text).toMatch(/lived in the Boxes/);
  });

  it('"met" hides a slide: each by any way of having met it; the Precinct is always shown', () => {
    // a game that never set foot in these places (the fixture's middling Acts 1–2 never went to the Ring, Carrick or the Sink)
    const stranger = () => {
      const a = ended('choir', 'A2', { ks_vane: false, cr_concern: false, bw_turf: false, bw_static: false, sk_pumps: false });
      for (const q of ['q_a2_ninebridge', 'q_a2_openfield']) delete a.g.world.quests[q];
      return a;
    };
    const a = stranger();
    for (const m of [MET_GUILD, MET_CHOIR, MET_SINK, MET_CROWN, MET_EDGES]) expect(cond(m, a.g)).toBe(false);
    const seen = nodes(play(a.g)).filter((n) => ALL_VARIANTS.includes(n));
    expect(seen).toEqual(['precinct_rerouted']);
    for (const s of ['guild', 'choir', 'sink', 'crown', 'edges']) expect(a.g.flags[`ep_${s}`], s).toBeUndefined();
    const shows = (slide: string, setup: (g: G) => void) => {
      const b = stranger();
      setup(b.g);
      return nodeOf(b.g, slide);
    };
    const done = (stage: string) => ({ stage, status: 'done' as const, startedAt: 0, log: [], done: [] });
    expect(shows('guild', (g) => { g.world.quests.q_a2_ninebridge = done('paid'); })).toBe('guild_rerouted');
    expect(shows('guild', (g) => { g.flags.nb_sarr_met = true; })).toBe('guild_rerouted');
    expect(shows('choir', (g) => { g.world.quests.q_a2_openfield = done('mercy'); })).toBe('choir_stands');
    expect(shows('choir', (g) => { g.flags.petra_met = true; })).toBe('choir_stands');
    expect(shows('sink', (g) => { g.flags.ocho_met = true; })).toBe('sink_saved');
    expect(shows('sink', (g) => { g.flags.sk_pumps = 'retimed'; })).toBe('sink_saved');
    expect(shows('crown', (g) => { g.flags.celestine_met = true; })).toBe('crown_table');
    expect(shows('crown', (g) => { g.flags.bw_raid = 'won'; })).toBe('crown_table');
    expect(shows('edges', (g) => { g.flags.dr_slate_met = true; })).toBe('edges_clover');
    expect(shows('edges', (g) => { g.flags.dk_connie_met = true; })).toBe('edges_clover');
    expect(shows('edges', (g) => { Object.assign(g.flags, { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'court' }); })).toBe('edges_walked');
    // the Sink's flood alone is not meeting it: the spring comes on the Spire's verdict wherever the player is
    expect(shows('sink', (g) => { Object.assign(g.flags, { sk_flooded: true, ks_ocho: 'drowned' }); })).toBeUndefined();
    // every preset meets the guild, the Choir, the Precinct and the Crown (Act 2's critical path and its city lines)
    for (const p of PRESETS) {
      const s = nodes(play(ended(p, 'A2').g)).map((n) => n.split('_')[0]);
      for (const slide of ['guild', 'choir', 'precinct', 'crown']) expect(s, `${p} ${slide}`).toContain(slide);
    }
  });

  it('selector order holds: where two selectors hold, the earlier wins', () => {
    const variant = (slide: string, id: string) => SLIDE(slide).variants.find((v) => v.id === id)!.if!;
    const both = (g: G, slide: string, first: string, second: string) => {
      expect(cond(variant(slide, first), g), `${slide}/${first}`).toBe(true);
      expect(cond(variant(slide, second), g), `${slide}/${second}`).toBe(true);
      expect(nodeOf(g, slide)).toBe(`${slide}_${first}`);
    };
    both(ended('choir', 'D', {}, { band: 'thin' }).g, 'choir', 'open', 'burned');
    both(ended('choir', 'A1', { a3_ash: 'away', a3_ash_target: 'vane', cr_celestine_dead: true }).g, 'crown', 'ash', 'fallen');
    both(ended('prepared', 'A2', { cr_celestine_dead: true }).g, 'crown', 'fallen', 'broken');
    both(ended('prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', dk_stand: 'organised' }).g, 'edges', 'walked', 'stood');
    both(ended('prepared', 'A2', { dk_hulls: 'cleared', dr_leven: 'paid', dr_leven_burned: true }).g, 'edges', 'cleared', 'burned');
    // the Sink is M2's own order: under B the core's pumps decide, even where Act 2 saved it
    const g = ended('prepared', 'B').g;
    expect(cond(variant('sink', 'saved'), g)).toBe(true);
    expect(nodeOf(g, 'sink')).toBe('sink_lost');
    // within a line too: Kade's slide's rule holds here: a Grand Factor killed by Brother Ash is told as his, never as "dead"
    const ash = page(ended('choir', 'C', { a3_ash: 'away', a3_ash_target: 'sarr', ks_sarr: 'dead' }).g, 'guild')!;
    expect(ash.text).toMatch(/Brother Ash had been there in the first autumn/);
  });

  it('the Sink under every value of M2; Ocho as slide 2 tells it (B6s): drowned on his own stair, or the Pale pumped by hand', () => {
    const cases: [string, Preset, End, Flags, RegExp][] = [
      ['lost', 'choir', 'B', { sk_pumps: 'retimed' }, /drowned on it, carrying the last one/],
      ['lost', 'hostile', 'B', { ocho_met: true }, /Anju had the clinic by then/],
      ['held', 'choir', 'B', { sk_pumps: 'seized' }, /Ocho kept the clinic open on the stair/],
      ['saved', 'prepared', 'A1', {}, /Precinct paid the variance.*rioting in Old Market/s],
      ['saved', 'choir', 'A2', { sk_pumps: 'retimed' }, /dial in the pump house stayed where Halden had turned it/],
      ['saved', 'prepared', 'D', { sk_pumps: 'seized' }, /Pale held the pump house.*crossed through/s],
      ['relieved', 'hostile', 'E', { ocho_met: true, nw_sink_relief: true }, /truth about their dam/],
      ['flooded', 'hostile', 'A1', { ocho_met: true }, /again on schedule.*change their note/s],
      ['flooded', 'hostile', 'D', { ocho_met: true }, /three hundred people walked up the stairs/],
    ];
    const seen = new Set<string>();
    for (const [want, preset, end, flags, text] of cases) {
      const a = ended(preset, end, flags);
      expect(modValue(a.g, M2_SINK), `${want} ${JSON.stringify(flags)}`).toBe(want);
      const ps = play(a.g);
      expect(pageOf(ps, 'sink')!.node).toBe(`sink_${want}`);
      expect(a.g.flags.ep_sink).toBe(want);
      expect(pageOf(ps, 'sink')!.text).toMatch(text);
      seen.add(want);
    }
    expect([...seen].sort()).toEqual(M2_SINK.values.map((v) => v.id).sort());
    // slides 2 and 10 tell Ocho the same way
    const lost = play(ended('choir', 'B', { sk_pumps: 'retimed' }).g);
    expect(pageOf(lost, 'ledger')!.lines.OCHO).toMatch(/drowned on his own stair/);
    expect(pageOf(lost, 'sink')!.text).toMatch(/Ocho carried cots up his clinic's stair/);
    const held = play(ended('choir', 'B', { sk_pumps: 'seized' }).g);
    expect(pageOf(held, 'ledger')!.lines.OCHO).toMatch(/kept the clinic open/);
    // the still: Ocho stands in it only where he lives
    const still = (g: G) => (play(g).flatMap((p) => p.events).find((e) => e.name === 'slide' && (e.data as { slide: string }).slide === 'sink')!.data as { people: { npc: string }[] }).people.map((p) => p.npc);
    expect(still(ended('choir', 'B', { sk_pumps: 'retimed' }).g)).not.toContain('npc_sk_01');
    expect(still(ended('choir', 'B', { sk_pumps: 'seized' }).g)).toContain('npc_sk_01');
  });

  it('B\'s failing city: nothing to trade, the Precinct on its last orders, the Sink to the river unless the Pale pump, the Crown lit', () => {
    for (const preset of ['prepared', 'hostile', 'choir'] as Preset[]) {
      const ps = play(ended(preset, 'B', { ocho_met: true }).g);
      expect(pageOf(ps, 'guild')!.node, preset).toBe('guild_idle');
      expect(pageOf(ps, 'precinct')!.node, preset).toBe('precinct_failing');
      expect(['sink_lost', 'sink_held']).toContain(pageOf(ps, 'sink')!.node);
      expect(pageOf(ps, 'precinct')!.text).toMatch(/clinics opened on time for a month and then at no time at all/);
      expect(pageOf(ps, 'guild')!.text).toMatch(/nothing left to forecast and nothing to bet on/);
    }
    expect(pageOf(play(ended('hostile', 'B').g), 'crown')!.text).toMatch(/generators kept its lamps lit/);
    expect(pageOf(play(ended('prepared', 'B').g), 'precinct')!.lines['CAPTAIN LOWE']).toMatch(/no schedule to read them/);
    // and Openfield under the Unwritten's sky
    expect(pageOf(play(ended('prepared', 'B').g), 'choir')!.text).toMatch(/Unwritten came in out of the rows/);
  });

  it('E\'s clauses are read at the bench: one line per clause the chair chose, and none it did not', () => {
    const lines = (flags: Flags) => pageOf(play(ended('prepared', 'E', flags).g), 'precinct')!.lines;
    const CLAUSE: Record<string, [string, RegExp]> = {
      fines: ['A FORECAST IS NOT AN ACT', /Marisol Quiroga/], living: ['THE RECORD YIELDS TO THE LIVING', /nine hundred people/],
      keeper: ['A UNIT MAY BE ITS OWN KEEPER', /filed deeds to themselves/], refuse: ['A SCHEDULED BENEFIT MAY BE REFUSED', /refuse what the schedule gave them/],
      reserve: ['A RESERVE IS KEPT BY ITS OWN CONSENT', /wrote back/], passenger: ['A PERSON IS A PASSENGER, NEVER CARGO', /debt-press stopped/],
      speech: ['SPEECH IS NOT SEDITION', /sedition listing/],
    };
    const LABELS = Object.values(CLAUSE).map((c) => c[0]);
    for (const chosen of [['fines', 'living', 'reserve'], ['keeper'], ['refuse', 'passenger'], ['speech'], []]) {
      const l = lines(Object.fromEntries(chosen.map((c) => [`a3_amend_${c}`, true])));
      expect(Object.keys(l).filter((k) => LABELS.includes(k)).sort(), chosen.join()).toEqual(chosen.map((c) => CLAUSE[c][0]).sort());
      for (const c of chosen) expect(l[CLAUSE[c][0]]).toMatch(CLAUSE[c][1]);
    }
    // the clause pages are E's alone; the chair's chamber is filled and the PC is a year older in it
    expect(pageOf(play(ended('prepared', 'A1', { a3_amend_fines: true }).g), 'precinct')!.lines['A FORECAST IS NOT AN ACT']).toBeUndefined();
    const ev = play(ended('prepared', 'E', { a3_amend_speech: true }).g).flatMap((p) => p.events).find((e) => e.name === 'slide' && (e.data as { slide: string }).slide === 'precinct')!;
    expect(ev.data).toMatchObject({ variant: 'clauses', place: 'md_spire', spot: 'bench', pc: { years: 1 } });
    // A2: the chair stays empty and the works fit it out for the face the lens found on the steps (slide 1's young docker)
    const a2 = play(ended('prepared', 'A2').g);
    expect(pageOf(a2, 'steps')!.text).toMatch(/a young docker about Halden's age/);
    expect(pageOf(a2, 'precinct')!.text).toMatch(/a young docker from Carrick, about Halden's age/);
    // and the guild's books are audited under E, whatever the clauses
    expect(pageOf(play(ended('prepared', 'E', { a3_amend_speech: true }).g), 'guild')!.node).toBe('guild_audited');
  });

  it('the Long Night\'s aliases\' defaults: with none of B5d\'s flags, Openfield stands, Mason lives, Calla is held, Sarr is alive', () => {
    const B5D = ['ks_mason', 'ln_mason_burned', 'ln_openfield', 'ln_stores', 'ln_people', 'ks_calla', 'ln_calla', 'ln_calla_how', 'ks_sarr', 'ln_sarr', 'ln_petra_taken', 'ln_alliance', 'ln_band'];
    const bare = (end: End) => {
      const a = ended('truce', end);
      for (const f of B5D) delete a.g.flags[f];
      return a;
    };
    const a = bare('A2');
    expect(cond(CALLA_HELD, a.g)).toBe(true);
    expect(cond(SARR_ALIVE, a.g)).toBe(true);
    const ps = play(a.g);
    expect(pageOf(ps, 'choir')!.node).toBe('choir_stands');
    expect(pageOf(ps, 'choir')!.lines['ELDER MASON']).toMatch(/loved the blight/);
    expect(pageOf(ps, 'choir')!.lines['SISTER CALLA']).toMatch(/^Still in a Precinct cell/);
    expect(pageOf(ps, 'guild')!.text).toMatch(/Imelda Sarr was Treasurer by the spring/);
    // the same defaults read through each end: Calla let go under B and D as slide 2 says, kept on schedule under A1
    expect(pageOf(play(bare('B').g), 'choir')!.lines['SISTER CALLA']).toMatch(/walked out with the rest/);
    expect(pageOf(play(bare('D').g), 'choir')!.lines['SISTER CALLA']).toMatch(/let her go within the month/);
    expect(pageOf(play(bare('A1').g), 'choir')!.lines['SISTER CALLA']).toMatch(/^She stayed in a Precinct cell, as written/);
    expect(pageOf(play(bare('E').g), 'choir')!.lines['SISTER CALLA']).toMatch(/^She stayed in a Precinct cell/);
    expect(pageOf(play(ended('truce', 'E', { a3_amend_speech: true }, {}).g), 'choir')!.lines['SISTER CALLA']).toMatch(/harvest rite|Released in the chair's first season/);
  });

  it('the twelve agree across slides: Brother Ash\'s hand (B6p\'s target), Sarr by end, Calla, Mason', () => {
    // Ash's order put on the Grand Factor or on House Vane: slide 2's line and the place's own page both say whose hand
    const sarr = play(ended('choir', 'A1', { a3_ash: 'away', a3_ash_target: 'sarr', ks_sarr: 'dead' }).g);
    expect(pageOf(sarr, 'ledger')!.lines['SARR, IMELDA']).toMatch(/by Brother Ash/);
    expect(pageOf(sarr, 'guild')!.text).toMatch(/Brother Ash/);
    const vane = play(ended('choir', 'A1', { a3_ash: 'away', a3_ash_target: 'vane', cr_celestine_dead: true }).g);
    expect(pageOf(vane, 'ledger')!.lines['VANE, CELESTINE']).toMatch(/at her own table .* by Brother Ash/);
    expect(pageOf(vane, 'crown')!.text).toMatch(/Brother Ash came for Celestine Vane .* at her own table/);
    expect(pageOf(vane, 'crown')!.text).toMatch(/went to her cousins/);
    // Sarr by the end, the same on slides 2 and 7
    const by = (end: End, flags: Flags = {}, knows: string[] = []) => play(ended('choir', end, flags, { knows }).g);
    expect(pageOf(by('C'), 'guild')!.text).toMatch(/Treasurer of the Concern's world/);
    expect(pageOf(by('B'), 'guild')!.text).toMatch(/Treasurer of nothing/);
    expect(pageOf(by('D'), 'guild')!.text).toMatch(/ruined in daylight, and lived/);
    expect(pageOf(by('D', {}, ['a3_warned_sarr']), 'guild')!.text).toMatch(/warned by Halden's letter/);
    expect(pageOf(by('D', {}, ['a3_warned_sarr']), 'ledger')!.lines['SARR, IMELDA']).toMatch(/^Not ruined/);
    expect(pageOf(by('E'), 'guild')!.text).toMatch(/paid the fines on eleven of them/);
    expect(pageOf(by('A1'), 'guild')!.text).toMatch(/named Treasurer in the spring, as written/);
    expect(pageOf(by('A2'), 'guild')!.text).toMatch(/Treasurer by the spring/);
    expect(pageOf(play(ended('none', 'A1').g), 'guild')!.text).toMatch(/did not live to be Treasurer/);
    // Mason: the night Openfield burned (slide 2) and his cairn (slide 8)
    const burned = play(ended('none', 'B').g);
    expect(pageOf(burned, 'ledger')!.lines.MASON).toMatch(/night Openfield burned/);
    expect(pageOf(burned, 'choir')!.lines['ELDER MASON']).toMatch(/night Openfield burned/);
    // Calla held under B: walked out when the food stopped (slide 2), then to Openfield (slide 8)
    const held = play(ended('hostile', 'B').g);
    expect(pageOf(held, 'ledger')!.lines['CALLA, SISTER']).toMatch(/food stopped/);
    expect(pageOf(held, 'choir')!.lines['SISTER CALLA']).toMatch(/food stopped/);
  });

  it('the people of a place are lines under its page', () => {
    const l = (preset: Preset, end: End, slide: string, flags: Flags = {}, standing: Record<string, number> = {}) => page(ended(preset, end, flags, { standing }).g, slide)!.lines;
    expect(l('prepared', 'D', 'guild').FEN).toMatch(/read the block's own book/);
    expect(l('prepared', 'A2', 'guild', { nb_strike_outcome: 'won' })['THE PORTERS']).toMatch(/kept their tenth/);
    expect(l('hostile', 'A2', 'guild')['THE PAPER ROOM']).toMatch(/black square/);
    expect(l('hostile', 'D', 'guild')['THE PAPER ROOM']).toBeUndefined();
    expect(page(ended('hostile', 'D').g, 'guild')!.text).toMatch(/paper room behind the Grand Factor's office was ash already/);
    expect(l('prepared', 'A2', 'guild', {}, { ninebridge: 30 }).NINEBRIDGE).toMatch(/good for credit/);
    expect(l('prepared', 'A2', 'choir', { of_blight_outcome: 'mercy' })['TOBIAS MASON']).toMatch(/kept his father's well clean/);
    expect(l('prepared', 'A2', 'choir', { a3_unwritten: 'gone' })['PETRA MASON']).toMatch(/went home from Knock/);
    expect(l('prepared', 'A2', 'choir', { a3_uw_how: 'fought', a3_uw_fight: 'petra', a3_unwritten: 'stopped' })['PETRA MASON']).toMatch(/no stone and no likeness/);
    expect(page(ended('prepared', 'A2', {}, { b4b: true }).g, 'choir')!.lines["HALCYON'S JARS"]).toBeUndefined();
    expect(page(ended('choir', 'A2', {}, { b4b: { hc_garden: 'openfield' } }).g, 'choir')!.lines["HALCYON'S JARS"]).toMatch(/They came up/);
    expect(l('prepared', 'A2', 'precinct', { ca_squatter: 'living' })['COMFORT ASAMOAH']).toMatch(/argued with Three about commas/);
    expect(l('prepared', 'A2', 'precinct', { a3_lowe: 'carried' })['CAPTAIN LOWE']).toMatch(/fourth order as written/);
    expect(l('prepared', 'A2', 'precinct')['CAPTAIN LOWE']).toMatch(/first warden in thirty years to count its dead/);
    expect(l('prepared', 'A2', 'precinct', {}, { meridian: -30 }).MERIDIAN).toMatch(/name of a fine/);
    expect(l('prepared', 'A2', 'crown')['THE SAINTS']).toMatch(/gave it away/);
    expect(l('hostile', 'A2', 'crown')['THE SAINTS']).toMatch(/Captain Lowe's cell/);
    expect(l('choir', 'A2', 'crown')['THE REEL']).toBeUndefined();
    expect(l('hostile', 'A2', 'crown')['THE REEL']).toMatch(/invitation car did not stop for Halden/);
    expect(l('prepared', 'A1', 'crown', { cr_crown_hostile: true })['THE REEL']).toMatch(/never forgave the Magistrate/);
    expect(l('prepared', 'A2', 'crown', { bw_raid: 'lost', bw_dogs_hold: false })['OLD KIBET']).toMatch(/date of the hanging/);
    expect(l('prepared', 'A2', 'crown', { bw_dogs_hold: false })['THE CHAIN']).toMatch(/three crews kept their peace/);
    expect(l('prepared', 'A2', 'crown')['THE CHAIN']).toBeUndefined(); // the Dogs hold it: slide 6 tells that
    expect(l('prepared', 'A2', 'edges', { dr_bello: 'crippled' })['NKECHI BELLO']).toMatch(/healed crooked/);
    expect(l('prepared', 'A2', 'edges', { dr_leven: 'stripped' }).LEVEN).toMatch(/open to the sky/);
    expect(l('prepared', 'A2', 'edges', { dk_hulls: 'crewed' })['THE HULLS']).toMatch(/crew books every Sunday/);
    expect(l('prepared', 'A2', 'edges', { dk_girl: 'returned' })['MIRELA STAN']).toMatch(/through at two/);
    expect(l('prepared', 'A2', 'sink', { sk_pumps: 'seized' })['THE PALE']).toMatch(/kept the pump house all year/);
  });

  it('every page reads as one page (55–115 words, lines at most 45), in every combination its parts can make; {name} is the player\'s', () => {
    for (const x of lengths(SLIDES_CITY)) {
      if (x.line) expect(x.words, x.where).toBeLessThanOrEqual(45);
      else {
        expect(x.words, x.where).toBeGreaterThanOrEqual(55);
        expect(x.words, x.where).toBeLessThanOrEqual(115);
      }
    }
    const texts = new Set<string>();
    for (const preset of PRESETS) {
      for (const end of ENDS) {
        for (const p of play(ended(preset, end, { ocho_met: true, dr_slate_met: true }).g).filter((x) => ALL_VARIANTS.includes(x.node))) {
          texts.add(p.text);
          expect(p.text).not.toMatch(/\{\w+\}/);
          for (const l of Object.values(p.lines)) expect(l).not.toMatch(/\{\w+\}/);
        }
      }
    }
    expect(texts.size).toBeGreaterThanOrEqual(40);
  });

  it('the pages stay within the epilogue\'s size budget (40 KB a slide on average)', () => {
    expect(treeBytes(SLIDES_CITY) / SLIDES_CITY.length).toBeLessThan(40 * 1024);
  });

  it('every flag, quest, knowledge and person the slides read is one the content really has', () => {
    expect(unwritten(SLIDES_CITY)).toEqual([]);
    // and the conditions it added to a3_conds read only written flags (B6a's test reads every export too)
    for (const m of [MET_GUILD, MET_CHOIR, MET_SINK, MET_CROWN, MET_EDGES]) expect(unwritten([{ id: 'x', met: m, variants: [] }])).toEqual([]);
  });

  it('the flags are in the Act 3 registry', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6t (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['ep_guild', 'ep_choir', 'ep_precinct', 'ep_sink', 'ep_crown', 'ep_edges', 'MET_GUILD', 'MET_CHOIR', 'MET_SINK', 'MET_CROWN', 'MET_EDGES', 'a3_amend_', 'a3_ash_target']) {
      expect(block.includes(f), f).toBe(true);
    }
  });
});
