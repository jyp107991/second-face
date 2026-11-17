import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAPS, NPCS } from '../src/content';
import { d_a3_epilogue, EP_CLOSE } from '../src/content/dialogue/a3_epilogue';
import { SLIDES_CITY } from '../src/content/dialogue/a3_epilogue_city';
import { epilogueTree } from '../src/content/dialogue/a3_epilogue_kit';
import { SLIDES_OPEN } from '../src/content/dialogue/a3_epilogue_open';
import { SLIDES_WILDS } from '../src/content/dialogue/a3_epilogue_wilds';
import {
  B4B_FLAGS, EP_SLIDES, M1_LEASH, M3_HALCYON, M5_HOUNDS, MET_ASHLANDS, MET_LINE, MET_SHORE, MET_SKIRTS, MET_TEETH, MET_WET, MET_WHEEL, modValue, STRIKE_OUT,
} from '../src/content/world/a3_conds';
import { test as cond } from '../src/engine/world/logic';
import type { G, Over, Preset } from './a3_fixture';
import {
  assembled, ended, endReadingPeople, ENDS, lengths, nodeOf, nodes, pageOf, play, PRESETS, treeBytes, unwritten, variants, type End, type Flags,
} from './epilogue_fixture';

/**
 * B6u — the epilogue's slides 13–19: Halcyon and the Skirts, the Line, the Drowned Shore, Number Four, the dam and the river, the
 * Wheel, the reserve in the Ashlands. Each end is set as B6q/B6r leave it on the shared Act 3 fixture after the door; the
 * arcology slice's outcomes are on or off (`b4b`), as the fixture's presets write them; the epilogue is played headless.
 */

const ALL_VARIANTS = variants(SLIDES_WILDS);
const SLIDE = (id: string) => SLIDES_WILDS.find((s) => s.id === id)!;
const page = (g: G, slide: string) => pageOf(play(g), slide);
const at = (preset: Preset, end: End, flags: Flags = {}, over: Over = {}) => ended(preset, end, flags, over).g;

describe('B6u — the epilogue, slides 13–19: Halcyon and the wilds', () => {
  it('the slides are the plan\'s thirteenth to nineteenth, assembled into the tree, each ending in a default, each still real', () => {
    expect(SLIDES_WILDS.map((s) => s.id)).toEqual(EP_SLIDES.slice(12, 19));
    expect(assembled(SLIDES_WILDS)).toBe(true);
    for (const s of SLIDES_WILDS) {
      expect(s.variants.at(-1)!.if, s.id).toBeUndefined();
      for (const v of s.variants.slice(0, -1)) expect(v.if, `${s.id}/${v.id}`).toBeDefined();
      for (const v of s.variants) {
        expect(MAPS[v.place]?.spots?.[v.spot], `${s.id}/${v.id} ${v.place}/${v.spot}`).toBeDefined();
        for (const p of v.people) expect(NPCS[p.npc], `${s.id}/${v.id} ${p.npc}`).toBeDefined();
      }
    }
    // who stands in a still never depends on the end (the runtime evaluates it; the builder specialises each page to its end)
    expect(endReadingPeople(SLIDES_WILDS)).toEqual([]);
    const order = d_a3_epilogue.start.map((s) => s.node).filter((n) => ALL_VARIANTS.includes(n));
    expect(order).toEqual(ALL_VARIANTS);
    // §6.3's C ids, and the modifiers' own orders where a slide is one modifier
    expect(SLIDE('line').variants[0].id).toBe('through');
    expect(SLIDE('ashlands').variants.map((v) => v.id)).toEqual(M5_HOUNDS.values.map((v) => v.id));
    expect(SLIDE('skirts').variants.map((v) => v.id)).toEqual(['opened', 'burned', 'risen', 'reformed', 'late', 'out', 'stands']);
  });

  it('every variant is reached from the fixture\'s presets, with flags as Acts 1–3 set them', () => {
    const reached = new Set<string>();
    const want = (slide: string, g: G, id: string) => {
      const n = nodeOf(g, slide);
      expect(n, `${slide} → ${id}`).toBe(`${slide}_${id}`);
      reached.add(n!);
    };
    // the Skirts: Halcyon by M3, the strike still out (or broken on schedule), else the Skirts as the strike left them
    want('skirts', at('prepared', 'A2', {}, { b4b: true }), 'opened');
    want('skirts', at('choir', 'A2'), 'burned');
    want('skirts', at('prepared', 'C'), 'risen');
    want('skirts', at('hostile', 'A2', {}, { b4b: { hc_longlived: 'soto', hc_chair: 'retired' } }), 'reformed');
    want('skirts', at('prepared', 'A1', { hs_shift: false, ks_maren: false, hs_maren_met: true }), 'late');
    want('skirts', at('prepared', 'A2', { hs_shift: false, ks_maren: false, hs_maren_met: true }), 'out');
    want('skirts', at('hostile', 'A2'), 'stands');
    // the Line: the through under C, else who holds the Line (B5a's Kettle Cut)
    want('line', at('prepared', 'C'), 'through');
    want('line', at('prepared', 'A2'), 'pilot');
    want('line', at('choir', 'A2'), 'shared');
    want('line', at('hostile', 'A2'), 'guild');
    want('line', at('prepared', 'A2', { rc_line: 'stationmaster', rc_kettle_levy: true }), 'levy');
    want('line', at('prepared', 'A2', { rc_line: false, rc_pilot: false, rc_brodsky_met: true }), 'timetable');
    // the shore: the Stilt Court's ruling on the sheen
    want('shore', at('prepared', 'A2', { ds_claim: 'guild', ds_barge: 'pyre', ds_post: 'gone', ds_valve: 'shut' }), 'guild');
    want('shore', at('prepared', 'A2', { ds_claim: 'rig', ds_rig: 'stilts', ds_hamid: 'left' }), 'rig');
    want('shore', at('hostile', 'A2', { ds_claim: 'sea', ds_lua_gone: true, ds_oona_met: true }), 'sea');
    want('shore', at('prepared', 'A2'), 'unheard');
    // Number Four: the arrangement
    want('teeth', at('prepared', 'A2', { tm_four: 'exposed', tm_ragna: 'gone' }), 'exposed');
    want('teeth', at('prepared', 'A2'), 'ended');
    want('teeth', at('prepared', 'A2', { tm_four: 'fought', tm_clean_fought: true }), 'fought');
    want('teeth', at('hostile', 'A2'), 'kept');
    want('teeth', at('choir', 'A2', { tm_ragna_met: true }), 'free');
    // the dam: the inspection
    want('wet', at('prepared', 'A2'), 'truth');
    want('wet', at('hostile', 'A2'), 'hidden');
    want('wet', at('choir', 'A2'), 'exposed');
    want('wet', at('prepared', 'A2', { nw_dam: 'sunk', nw_ledger_marked: true }), 'sunk');
    want('wet', at('prepared', 'A2', { nw_dam: false, nw_hedda_met: true }), 'waiting');
    // the Wheel
    want('wheel', at('prepared', 'D', { a3_ally_wheel: true }), 'receivers');
    want('wheel', at('prepared', 'A2', { a3_mast_keeper: 'wheel', a3_wheel_up: true }), 'hill');
    want('wheel', at('prepared', 'A2'), 'kin');
    want('wheel', at('choir', 'A2', {}, { knows: ['sefa_met'] }), 'turning');
    // the Ashlands: M5's value
    want('ashlands', at('choir', 'A2'), 'yours');
    want('ashlands', at('hostile', 'A2'), 'woken');
    want('ashlands', at('prepared', 'A2', { an_reserve: 'leaderless', an_feral: true }), 'feral');
    want('ashlands', at('prepared', 'A2'), 'dormant');
    expect([...reached].sort()).toEqual([...ALL_VARIANTS].sort());
  });

  it('M1, M3 and M5 under every value, with and without the arcology slice\'s flags; the page shown is the modifier\'s value', () => {
    // M3 Halcyon: without B4b only burned, risen and stands can come; with it, all five
    const m3: [string, G, RegExp][] = [
      ['opened', at('prepared', 'A2', {}, { b4b: true }), /stayed open that year, the way a wound stays open/],
      ['opened', at('prepared', 'C', {}, { b4b: true }), /read in it how long each of them had left/],
      ['burned', at('choir', 'A2'), /Kennel Seven's only command in Halden's pack/],
      ['burned', at('prepared', 'A2', {}, { b4b: { hc_longlived: 'kept' } }), /With the Leash cut/],
      ['burned', at('choir', 'B', {}, { b4b: true }), /gardens burned for two days/],
      ['risen', at('prepared', 'C'), /Halcyon rose/],
      ['risen', at('hostile', 'C', {}, { b4b: true }), /Halcyon rose/],
      ['reformed', at('hostile', 'A2', {}, { b4b: { hc_longlived: 'soto', hc_chair: 'retired' } }), /bench by the orange tree/],
      ['stands', at('prepared', 'A2'), /steward at the cage/],
      ['stands', at('hostile', 'B', {}, { b4b: true }), /Scabs worked Number Six/],
      ['stands', at('hostile', 'A2', { hs_shift: 'revolt', ks_maren: 'lives', hs_car_down: true, an_reserve: 'sealed' }), /cable house at Footgate was still a black stump/],
    ];
    for (const [v, g, text] of m3) {
      expect(modValue(g, M3_HALCYON), v).toBe(v);
      const p = page(g, 'skirts')!;
      expect(p.node, v).toBe(`skirts_${v}`);
      expect(p.text, v).toMatch(text);
    }
    const without = new Set<string>(), withB4b = new Set<string>();
    for (const preset of PRESETS) for (const end of ENDS) {
      without.add(modValue(at(preset, end), M3_HALCYON));
      withB4b.add(modValue(at(preset, end, {}, { b4b: true }), M3_HALCYON));
    }
    for (const g of [at('hostile', 'A2', {}, { b4b: { hc_longlived: 'soto' } })]) withB4b.add(modValue(g, M3_HALCYON));
    expect([...without].sort()).toEqual(['burned', 'risen', 'stands']);
    expect([...withB4b].sort()).toEqual(M3_HALCYON.values.map((v) => v.id).sort());
    // M1 the Leash, a line under the Skirts' page: without B4b it is spread (C) or theirs; with it, every value
    const leash: [string, G, RegExp][] = [
      ['cut', at('prepared', 'A2', {}, { b4b: true }), /^Cut\. Concern chrome across the Reach stayed quiet/],
      ['yours', at('hostile', 'A2', {}, { b4b: { hc_leash: 'seized' } }), /still in Halden's pocket/],
      ['sold', at('choir', 'A2', {}, { b4b: true }), /the hand Halden had sold it to/],
      ['spread', at('prepared', 'C'), /spread with the core/],
      ['spread', at('hostile', 'C', {}, { b4b: true }), /spread with the core/],
      ['theirs', at('hostile', 'A2'), /Femi Lawal's spine/],
      ['theirs', at('hostile', 'A2', {}, { b4b: true }), /Femi Lawal's spine/],
    ];
    for (const [v, g, text] of leash) {
      expect(modValue(g, M1_LEASH), v).toBe(v);
      expect(page(g, 'skirts')!.lines['THE LEASH'], v).toMatch(text);
    }
    // M5 the hounds, the Ashlands' page (no arcology flag reads it: the same with B4b on)
    const hounds: [string, G, RegExp][] = [
      ['yours', at('choir', 'A2'), /only lawful command left for them was in Halden's pack/],
      ['yours', at('choir', 'A1', {}, { b4b: true }), /the Ledger noted that it had not/],
      ['woken', at('hostile', 'A2'), /Concern held Kennel Seven's key, and in the spring it used it/],
      ['woken', at('hostile', 'C', {}, { b4b: true }), /a use for it.*beside the Concern's freight/s],
      ['woken', at('prepared', 'C'), /taught at Halcyon what lawful meant/],
      ['woken', at('prepared', 'A2', { a3_hounds_in: true }), /Kennel Seven never woke/],
      ['feral', at('prepared', 'A2', { an_reserve: 'leaderless' }), /no order and no rows/],
      ['dormant', at('prepared', 'A2', {}, { b4b: true }), /sealed it against all authority/],
      ['dormant', at('prepared', 'D', { an_reserve: false, an_key: false }), /awaiting lawful command.*KENNEL 7, DORMANT/s],
    ];
    for (const [v, g, text] of hounds) {
      expect(modValue(g, M5_HOUNDS), v).toBe(v);
      const p = page(g, 'ashlands')!;
      expect(p.node, v).toBe(`ashlands_${v}`);
      expect(p.text, v).toMatch(text);
    }
    // the arcology's lines are gated: none of its flags, none of its lines
    const bare = page(at('prepared', 'A2'), 'skirts')!.lines;
    for (const l of ['FLOOR NINE', 'LINH HOANG']) expect(bare[l], l).toBeUndefined();
    const full = page(at('prepared', 'A2', {}, { b4b: true }), 'skirts')!.lines;
    expect(full['FLOOR NINE']).toMatch(/service ward stayed empty/);
    expect(full['LINH HOANG']).toMatch(/laughed at the goats/);
    expect(page(at('hostile', 'A2', {}, { b4b: true }), 'skirts')!.lines['LINH HOANG']).toMatch(/stayed empty/);
  });

  it('the strike "still out": unsettled, it stays out under A2, B and D (the epilogue never breaks it behind the player\'s back); under A1 and E it breaks on schedule, as slide 2 says', () => {
    const out = { hs_shift: false, ks_maren: false, hs_maren_met: true };
    for (const end of ['A2', 'B', 'D'] as End[]) {
      const ps = play(at('prepared', end, out));
      expect(pageOf(ps, 'skirts')!.node, end).toBe('skirts_out');
      expect(pageOf(ps, 'skirts')!.text).toMatch(/still out when the year turned/);
      expect(pageOf(ps, 'ledger')!.lines['OKAFOR, MAREN'], end).toBe('Alive, and still organising.');
    }
    for (const end of ['A1', 'E'] as End[]) {
      const ps = play(at('prepared', end, out));
      expect(pageOf(ps, 'skirts')!.node, end).toBe('skirts_late');
      expect(pageOf(ps, 'skirts')!.text).toMatch(/hanged her from the post at Footgate/);
      expect(pageOf(ps, 'ledger')!.lines['OKAFOR, MAREN'], end).toMatch(/the Concern hanged her/);
    }
    // under C the core decides Halcyon's page; the strike's break is still told as on schedule
    const c = play(at('prepared', 'C', out));
    expect(pageOf(c, 'skirts')!.node).toBe('skirts_risen');
    expect(pageOf(c, 'skirts')!.text).toMatch(/strike was broken the next season, on schedule/);
    expect(cond(STRIKE_OUT, at('prepared', 'C', out))).toBe(true);
    // and a settled strike reads the same on slides 2 and 13
    const hanged = play(at('hostile', 'A2'));
    expect(pageOf(hanged, 'ledger')!.lines['OKAFOR, MAREN']).toBe('Hanged by the Concern, as written.');
    expect(pageOf(hanged, 'skirts')!.text).toMatch(/cut Maren Okafor down after a week/);
  });

  it('"met" hides a slide: each by any way of having met it; the Ashlands also when the hounds woke, wherever the player was', () => {
    const NEVER: Flags = {
      hs_shift: false, hs_parts: false, rc_line: false, rc_pilot: false, ds_claim: false, ds_boats_owed: false, tm_four: false, tm_shift: false,
      nw_dam: false, nw_barges_owed: false, an_kelso: false, an_key: false, an_reserve: false,
    };
    const stranger = (end: End = 'A2', flags: Flags = {}) => at('choir', end, { ...NEVER, ...flags });
    const g = stranger();
    for (const m of [MET_SKIRTS, MET_LINE, MET_SHORE, MET_TEETH, MET_WET, MET_WHEEL, MET_ASHLANDS]) expect(cond(m, g)).toBe(false);
    expect(nodes(play(g)).filter((n) => ALL_VARIANTS.includes(n))).toEqual([]);
    for (const s of SLIDES_WILDS) expect(g.flags[`ep_${s.id}`], s.id).toBeUndefined();
    const shows = (slide: string, flags: Flags, end: End = 'A2', over: Over = {}) => nodeOf(at('choir', end, { ...NEVER, ...flags }, over), slide);
    expect(shows('skirts', { hs_bell_met: true })).toBe('skirts_out');
    expect(shows('skirts', {}, 'A2', { b4b: true })).toBe('skirts_reformed');
    expect(shows('line', { rc_halina_met: true })).toBe('line_timetable');
    expect(shows('line', { rc_engine: 'spare' })).toBe('line_timetable');
    expect(shows('shore', { ds_oona_met: true })).toBe('shore_unheard');
    expect(shows('shore', { ds_light: 'court' })).toBe('shore_unheard');
    expect(shows('teeth', { tm_desmond_met: true })).toBe('teeth_free');
    expect(shows('teeth', { tm_digger: 'drowned' })).toBe('teeth_free');
    expect(shows('wet', { nw_berit_met: true })).toBe('wet_waiting');
    expect(shows('wet', { nw_feud: 'quiet' })).toBe('wet_waiting');
    expect(shows('wheel', {}, 'A2', { knows: ['sefa_met'] })).toBe('wheel_turning');
    expect(shows('wheel', {}, 'A2', { members: { wheel: 'guest' } })).toBe('wheel_turning');
    expect(shows('wheel', { a3_ally_wheel: true })).toBe('wheel_turning');
    expect(shows('ashlands', { hester_met: true })).toBe('ashlands_dormant');
    // the hounds woke: the Concern's end, its key, or its dogs at Knock; the slide comes though the player never went east
    expect(shows('ashlands', {}, 'C')).toBe('ashlands_woken');
    expect(shows('ashlands', { a3_hounds_in: true })).toBe('ashlands_woken');
    expect(page(stranger('C'), 'ashlands')!.text).toMatch(/did not need the Lieutenant's leave/);
    // every preset meets the Skirts (beat 16 runs through its strike), and the Ashlands (each history went to Kelso)
    for (const p of PRESETS) {
      const s = nodes(play(at(p, 'A2'))).map((n) => n.split('_')[0]);
      for (const slide of ['skirts', 'ashlands']) expect(s, `${p} ${slide}`).toContain(slide);
    }
  });

  it('selector order holds: where two selectors hold, the earlier wins', () => {
    const variant = (slide: string, id: string) => SLIDE(slide).variants.find((v) => v.id === id)!.if!;
    const both = (g: G, slide: string, first: string, second: string) => {
      expect(cond(variant(slide, first), g), `${slide}/${first}`).toBe(true);
      expect(cond(variant(slide, second), g), `${slide}/${second}`).toBe(true);
      expect(nodeOf(g, slide)).toBe(`${slide}_${first}`);
    };
    both(at('choir', 'A2', {}, { b4b: { hc_longlived: 'exposed' } }), 'skirts', 'opened', 'burned');
    both(at('choir', 'C', { an_reserve: 'sealed' }, { b4b: { hc_longlived: 'soto' } }), 'skirts', 'risen', 'reformed');
    both(at('prepared', 'A1', { hs_shift: false, ks_maren: false, hs_maren_met: true }), 'skirts', 'late', 'out');
    both(at('prepared', 'C'), 'line', 'through', 'pilot');
    both(at('prepared', 'D', { a3_ally_wheel: true, a3_mast_keeper: 'wheel' }), 'wheel', 'receivers', 'hill');
    both(at('prepared', 'A2', { a3_mast_keeper: 'wheel' }), 'wheel', 'hill', 'kin');
    // M5's own order: the core in the player's pack wins over the Concern's end
    const g = at('choir', 'C');
    expect(cond(variant('ashlands', 'woken'), g)).toBe(true);
    expect(nodeOf(g, 'ashlands')).toBe('ashlands_yours');
    // (a played state has its pages' ep_* set: read the text on a fresh one)
    expect(page(at('choir', 'C'), 'ashlands')!.text).toMatch(/came to Spindle twice that year/);
  });

  it('each end leaves its mark on the wilds: C\'s through, a tamed digger answering, B\'s Line and dam without the city, D\'s receivers', () => {
    const c = play(at('hostile', 'C'));
    expect(pageOf(c, 'line')!.text).toMatch(/carried the core east in sealed cars/);
    expect(pageOf(c, 'teeth')!.text).toMatch(/whose word it had been waiting for/);
    expect(pageOf(c, 'teeth')!.lines['THE DIGGER']).toMatch(/dug for the Concern now/);
    const b = play(at('prepared', 'B'));
    expect(pageOf(b, 'line')!.text).toMatch(/the Line did not notice/);
    expect(pageOf(b, 'wet')!.text).toMatch(/No schedule card came up the river/);
    expect(pageOf(b, 'wet')!.text).toMatch(/lights went out, and went home\. Hedda Wexford finished the work/);
    expect(pageOf(play(at('prepared', 'A2')), 'wet')!.text).not.toMatch(/lights went out/);
    expect(pageOf(b, 'shore')!.text).toMatch(/tide tables stopped coming down the delta/);
    expect(pageOf(play(at('prepared', 'D', { a3_ally_wheel: true })), 'wheel')!.text).toMatch(/whole Sallow heard it at once/);
    expect(pageOf(play(at('prepared', 'A1')), 'line')!.text).toMatch(/second law/);
    // the dam the keepers lied for, exposed: by the end
    expect(page(at('choir', 'B'), 'wet')!.text).toMatch(/Rhiannon Wexford walked back up the river/);
    expect(page(at('choir', 'D'), 'wet')!.text).toMatch(/Low Landing walked up the hill road before the thaw/);
    expect(page(at('choir', 'A1'), 'wet')!.text).toMatch(/Eleven were not/);
  });

  it('the people of a place are lines under its page', () => {
    const l = (g: G, slide: string) => page(g, slide)!.lines;
    expect(l(at('choir', 'A2'), 'skirts')['MAREN OKAFOR']).toMatch(/still standing/);
    expect(l(at('prepared', 'A2', { hs_parts: 'exposed' }), 'skirts')['THE WEIGHHOUSE']).toMatch(/stayed shut/);
    expect(l(at('prepared', 'A2', { hs_nils: 'up' }), 'skirts')['NILS HABER']).toMatch(/did not come down/);
    expect(l(at('prepared', 'A2', { hs_nils: 'up' }, { b4b: { hc_nils: 'dead' } }), 'skirts')['NILS HABER']).toMatch(/night of the ball/);
    expect(l(at('prepared', 'A2', {}, { standing: { skirts: 30 } }), 'skirts')['THE SKIRTS']).toMatch(/chalked on the Lodge's door/);
    expect(l(at('hostile', 'A2', { rc_abe: 'hanged' }), 'line')['ABE MUTASA']).toMatch(/Kettle Cut/);
    expect(l(at('prepared', 'A2', { rc_stock: 'openfield' }), 'line')["THE STOCK CAR'S TWELVE"]).toMatch(/lived at Openfield/);
    expect(l(at('prepared', 'A2', { rc_engine: 'contract' }), 'line').DORCAS).toMatch(/twenty-year contract/);
    expect(l(at('prepared', 'A2', { rc_east: 'helped', rc_derailed: true, rc_willem_dead: true }), 'line')['THE EAST LENGTH']).toMatch(/Willem Visser was buried/);
    expect(l(at('prepared', 'A2', { ds_valve: 'shut', ds_court: 'living', ds_light: 'framed' }), 'shore')['MATEO IBARRA']).toMatch(/Curlew back/);
    expect(l(at('prepared', 'A2', { ds_light: 'framed' }), 'shore')['THE FALSE LIGHT']).toMatch(/Ewan Tulloch hanged/);
    expect(l(at('prepared', 'A2', { ds_rig: 'crew' }), 'shore').HUM).toMatch(/one tanker a month/);
    expect(l(at('prepared', 'A2', { tm_family_in: 'taken' }), 'teeth')['THE NNADIS']).toMatch(/taken at the switchback/);
    expect(l(at('prepared', 'A2', { tm_ragna: 'stays' }), 'teeth')['RAGNA HOLM']).toMatch(/did not count aloud/);
    expect(l(at('prepared', 'A2', { nw_feud: 'truth', nw_run: 'river' }), 'wet').SAWTOWN).toMatch(/feud was over/);
    expect(l(at('prepared', 'A2', { nw_run: 'delivered', nw_controllers: 'guild' }), 'wet')['THE PATIENCE']).toMatch(/socket shaped for a neck/);
    expect(l(at('prepared', 'A2'), 'wheel')['SEFA ODUYA']).toMatch(/boots, then hands, then face/);
    expect(l(at('prepared', 'A2', { a3_mast_keeper: 'wheel' }), 'wheel')['DARIO ODUYA']).toBeUndefined();
    expect(l(at('prepared', 'A2', { an_kites: 'down', an_board_chalked: true }), 'ashlands')['THE KITES']).toMatch(/beacon stayed dark/);
    expect(l(at('prepared', 'A2', { an_board_chalked: true }), 'ashlands').SPINDLE).toMatch(/DEAD AT KELSO/);
  });

  it('every page reads as one page (55–115 words, lines at most 45), in every combination its parts can make; {name} is the player\'s', () => {
    for (const x of lengths(SLIDES_WILDS)) {
      if (x.line) expect(x.words, x.where).toBeLessThanOrEqual(45);
      else {
        expect(x.words, x.where).toBeGreaterThanOrEqual(55);
        expect(x.words, x.where).toBeLessThanOrEqual(115);
      }
    }
    const texts = new Set<string>();
    for (const preset of PRESETS) for (const end of ENDS) for (const b4b of [false, true]) {
      for (const p of play(at(preset, end, { ds_oona_met: true, tm_ragna_met: true }, { b4b, knows: ['sefa_met'] })).filter((x) => ALL_VARIANTS.includes(x.node))) {
        texts.add(p.text);
        expect(p.text).not.toMatch(/\{\w+\}/);
        for (const l of Object.values(p.lines)) expect(l).not.toMatch(/\{\w+\}/);
      }
    }
    expect(texts.size).toBeGreaterThanOrEqual(40);
  });

  it('specialising a page to its selector changes nothing a player sees (slides 1–19), and the pages stay within the size budget', () => {
    const specs = [...SLIDES_OPEN, ...SLIDES_CITY, ...SLIDES_WILDS];
    const tree = epilogueTree(specs, EP_CLOSE), plain = epilogueTree(specs, EP_CLOSE, { specialise: false });
    for (const preset of ['prepared', 'hostile', 'choir', 'guild'] as Preset[]) {
      for (const end of ENDS) {
        for (const [flags, b4b] of [[{}, false], [{}, true], [{ hs_shift: false, ks_maren: false, hs_maren_met: true }, false], [{ an_reserve: 'leaderless' }, true], [{ a3_mast_keeper: 'wheel', a3_ally_wheel: true }, false]] as [Flags, boolean][]) {
          expect(play(at(preset, end, flags, { b4b }), tree), `${preset} ${end} ${JSON.stringify(flags)} ${b4b}`).toEqual(play(at(preset, end, flags, { b4b }), plain));
        }
      }
    }
    expect(treeBytes(SLIDES_WILDS) / SLIDES_WILDS.length).toBeLessThan(40 * 1024);
  });

  it('every flag, quest, knowledge and person the slides read is one the content really has; the arcology\'s only through a3_conds', () => {
    expect(unwritten(SLIDES_WILDS)).toEqual([]);
    for (const m of [MET_SKIRTS, MET_LINE, MET_SHORE, MET_TEETH, MET_WET, MET_WHEEL, MET_ASHLANDS]) expect(unwritten([{ id: 'x', met: m, variants: [] }])).toEqual([]);
    const src = readFileSync('src/content/dialogue/a3_epilogue_wilds.ts', 'utf8');
    for (const f of [...B4B_FLAGS, 'hc_nils', 'hc_chair']) expect(src.includes(`'${f}'`), f).toBe(false);
    // and the Long Night's and the Ashlands' (B5d's) only through its aliases (a map's id, the still's place, is not a flag)
    expect((src.match(/'(an|ln)_[a-z_]+'/g) ?? []).filter((m) => !MAPS[m.slice(1, -1)])).toEqual([]);
  });

  it('the flags are in the Act 3 registry', () => {
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6u (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['ep_skirts', 'ep_line', 'ep_shore', 'ep_teeth', 'ep_wet', 'ep_wheel', 'ep_ashlands', 'MET_SKIRTS', 'MET_ASHLANDS', 'HC_CLINIC', 'AN_KITES_DOWN', 'a3_mast_keeper']) {
      expect(block.includes(f), f).toBe(true);
    }
  });
});
