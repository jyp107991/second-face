import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAPS, NPCS } from '../src/content';
import { d_a3_epilogue, EP_CLOSE, EP_SPECS } from '../src/content/dialogue/a3_epilogue';
import { epilogueTree, type SlideData } from '../src/content/dialogue/a3_epilogue_kit';
import { SLIDES_PEOPLE } from '../src/content/dialogue/a3_epilogue_people';
import {
  COMPANIONS, EP_HOME, EP_SLIDES, EP_STAYED, EP_TOGETHER, MET_COMPANION, ON_SIDE, modValue, type CompanionKey,
} from '../src/content/world/a3_conds';
import { test as cond } from '../src/engine/world/logic';
import type { G, Over, Preset } from './a3_fixture';
import {
  assembled, ended, endReadingPeople, ENDS, lengths, nodeOf, nodes, pageOf, play, PRESETS, treeBytes, unwritten, variants, words, type End, type Flags, type Page,
} from './epilogue_fixture';

/**
 * B6v — the epilogue's slides 20–27: the seven companions (§7's end states and romance ends) and R49, the portrait's own date (the
 * end × the home the player's life found, the partner beside them only when together). Each end is set as the plan names it for
 * B6q/B6r (`a3_end`, `a3_sash`, `a3_amend_*`; the vault's leavings `wren_left` / `kes_left` = concern and `nine_left` = core, which
 * B6r writes with `leave`), on the shared Act 3 fixture after the door, with the flags the earlier slices write. Played headless
 * through the whole epilogue, as the runtime does.
 */

const MINE = variants(SLIDES_PEOPLE);
const R49 = 'r49';
const still = (p: Page): SlideData => p.events.find((e) => e.name === 'slide')!.data as SlideData;
/** Whether an NPC stands in a page's still on this state (the runtime evaluates each person's `if`). */
const stands = (g: G, p: Page, npc: string) => still(p).people.some((x) => x.npc === npc && (!x.if || cond(x.if, g)));
const page = (g: G, slide: string) => pageOf(play(g), slide);
const ID: Record<CompanionKey, string> = Object.fromEntries(Object.entries(COMPANIONS).map(([k, v]) => [k, v.id])) as Record<CompanionKey, string>;
const LABEL: Partial<Record<CompanionKey, string>> = { tamsin: 'TAMSIN', wren: 'WREN', ilya: 'ILYA', kes: 'KES' };

describe('B6v — the epilogue\'s slides 20–27: the companions and R49', () => {
  it('the slides are the last eight of EP_SLIDES, assembled, each ending in a default; every still resolves to a real map, spot and person', () => {
    expect(SLIDES_PEOPLE.map((s) => s.id)).toEqual(EP_SLIDES.slice(19));
    expect(assembled(SLIDES_PEOPLE)).toBe(true);
    for (const s of SLIDES_PEOPLE) {
      expect(s.variants.at(-1)!.if, `${s.id}'s default`).toBeUndefined();
      for (const v of s.variants.slice(0, -1)) expect(v.if, `${s.id}/${v.id}`).toBeDefined();
    }
    // the tree's start list holds every variant, in slide order
    expect(d_a3_epilogue.start.map((s) => s.node).filter((n) => MINE.includes(n))).toEqual(MINE);
    // R49's ids (§6.3): the chair, the board, chosen; the broken steps, the known face and elsewhere, by home
    expect(SLIDES_PEOPLE.at(-1)!.variants.map((v) => v.id)).toEqual(['chair', 'board', 'chosen',
      'broken_knock', 'broken_shale', 'broken_road', 'broken', 'known_knock', 'known_shale', 'known_road', 'known', 'elsewhere_knock', 'elsewhere_shale', 'elsewhere_road', 'elsewhere']);
    for (const id of MINE) {
      const n = d_a3_epilogue.nodes[id];
      const data = (n.effects![0] as { data: SlideData }).data;
      expect(MAPS[data.place]?.spots?.[data.spot], `${id}: ${data.place}/${data.spot}`).toBeDefined();
      for (const p of data.people) expect(NPCS[p.npc], `${id}: ${p.npc}`).toBeDefined();
      if (id.startsWith('r49_')) expect(data.pc).toEqual({ years: 19 });
    }
    // a person's condition never reads the end or the sash (the runtime evaluates it; R49 has a page per end, and its cast is
    // evaluated against that end): so every still is the same whether the builder specialised its page or not
    expect(endReadingPeople(SLIDES_PEOPLE)).toEqual([]);
    const plain = epilogueTree(EP_SPECS, EP_CLOSE, { specialise: false });
    for (const id of MINE) expect(d_a3_epilogue.nodes[id].effects![0], id).toEqual(plain.nodes[id].effects![0]);
  });

  it('every variant is reached, by the end states the slices write (§7)', () => {
    const reached = new Set<string>();
    const at = (slide: string, preset: Preset, end: End, flags: Flags, want: string, over: Over = {}, text?: RegExp) => {
      const a = ended(preset, end, flags, over);
      const p = page(a.g, slide);
      expect(p?.node, `${slide} ${preset} ${end} ${JSON.stringify(flags)} ${JSON.stringify(over)}`).toBe(want);
      expect(a.g.flags[`ep_${slide}`]).toBe(want.slice(slide.length + 1));
      if (text) expect(p!.text, want).toMatch(text);
      reached.add(want);
    };
    // Tamsin (always met: the voice at the Grille)
    at('tamsin', 'prepared', 'A1', { a3_tamsin_dead: true, a3_door_forced: true, a3_c9: 'relocated', a3_c9_how: 'forced', tam_left: 'door', tam_romance: 'ended' }, 'tamsin_door', {}, /rise by the windpump/);
    at('tamsin', 'prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'held' }, 'tamsin_taken', { companions: { tamsin: 'inside' } }, /sixty-one/);
    at('tamsin', 'guild', 'C', { a3_c9: 'relocated', a3_c9_how: 'sold', a3_guild: 'signed' }, 'tamsin_taken', { companions: { tamsin: 'inside' } }, /told him nobody/);
    at('tamsin', 'prepared', 'A1', { a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked', a3_buffer_how: 'court' }, 'tamsin_taken', { companions: { tamsin: 'inside' } }, /Carrick as a passenger/);
    at('tamsin', 'prepared', 'A2', {}, 'tamsin_inside', { companions: { tamsin: 'inside' } }, /stayed behind the door/);
    at('tamsin', 'prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines' }, 'tamsin_inside', { companions: { tamsin: 'inside' } }, /through it before the count/);
    at('tamsin', 'prepared', 'B', {}, 'tamsin_inside', { companions: { tamsin: 'home' } }, /did not ask after Halden/);
    at('tamsin', 'prepared', 'B', { tam_left: 'door', a3_c9: 'relocated', a3_c9_how: 'order', a3_c9_after: 'walked' }, 'tamsin_stood', {}, /quay at Carrick/);
    at('tamsin', 'prepared', 'B', { tam_left: 'door' }, 'tamsin_stood', {}, /the door held/);
    at('tamsin', 'prepared', 'A2', { tam_left: 'reserve', a3_c9: 'relocated', a3_c9_how: 'order' }, 'tamsin_reserve', { companions: { tamsin: 'waiting' } }, /Hospice block/);
    at('tamsin', 'prepared', 'A1', {}, 'tamsin_chair', {}, /fourth order/);
    at('tamsin', 'prepared', 'B', {}, 'tamsin_gone', { companions: { tamsin: 'left' } }, /cot Nell had/);
    at('tamsin', 'prepared', 'A2', { tam_broken: true, a3_c9: 'relocated', a3_c9_how: 'order' }, 'tamsin_gone', {}, /walked out of Halden's camp/);
    at('tamsin', 'prepared', 'B', { tam_out: true }, 'tamsin_waited', { companions: { tamsin: 'never' } }, /only knew by its voice/);
    at('tamsin', 'prepared', 'B', { a3_shale: 'free', ks_ada: 'stays' }, 'tamsin_deputy');
    at('tamsin', 'prepared', 'B', { a3_shale: 'free', ks_ada: 'dead' }, 'tamsin_sheriff');
    at('tamsin', 'prepared', 'B', {}, 'tamsin_wheel');
    at('tamsin', 'choir', 'B', { a3_c9: 'opened', a3_c9_how: 'ines' }, 'tamsin_knock');
    at('tamsin', 'choir', 'B', {}, 'tamsin_after', {}, /outside of her own door/);
    at('tamsin', 'choir', 'A2', { a3_c9: 'relocated', a3_c9_how: 'consent' }, 'tamsin_after', {}, /by their own vote/);
    // Wren
    at('wren', 'prepared', 'B', { wren_hanged: true, wren_left: 'hanged', wren_rope: 'fulfilled' }, 'wren_hanged', {}, /night the raid went wrong/);
    at('wren', 'prepared', 'A1', { wren_rope: false }, 'wren_rope_late', {}, /hanged her from the toll booth on its date/);
    at('wren', 'prepared', 'B', { wren_left: 'sold', a3_c9: 'relocated', a3_c9_how: 'sold' }, 'wren_gone_sold', {}, /Knock's slope/);
    at('wren', 'prepared', 'B', { wren_left: 'sold' }, 'wren_gone_sold', {}, /sold the girl on/);
    at('wren', 'prepared', 'C', {}, 'wren_gone_concern');
    at('wren', 'prepared', 'C', { wren_left: 'concern' }, 'wren_gone_concern');
    at('wren', 'prepared', 'B', { wren_left: 'longnight' }, 'wren_gone_guild');
    at('wren', 'prepared', 'B', { wren_left: 'block' }, 'wren_gone_girl', {}, /went after the buyer/);
    at('wren', 'prepared', 'B', { wren_left: 'kept' }, 'wren_gone_girl', {}, /kept the girl's paper/);
    at('wren', 'prepared', 'B', {}, 'wren_gone_floor', { companions: { wren: 'left' } });
    at('wren', 'prepared', 'B', { wren_after: 'shale' }, 'wren_shale');
    at('wren', 'prepared', 'B', { wren_after: 'bridge' }, 'wren_bridge');
    at('wren', 'prepared', 'B', { wren_after: 'road' }, 'wren_road', {}, /walked the road with Halden/);
    at('wren', 'prepared', 'A1', { wren_after: 'road' }, 'wren_road', {}, /sat down in a chair instead/);
    at('wren', 'prepared', 'B', {}, 'wren_scout', {}, /walking it/);
    at('wren', 'prepared', 'B', { rd_wren_met: true }, 'wren_scout', { companions: { wren: 'met' } }, /never walked with Halden/);
    // Ilya
    at('ilya', 'prepared', 'B', { ilya_left: 'spared', ilya_sober_days: 40, vasha_fate: 'spared', vasha_dead: false }, 'ilya_hunter', {}, /had her twice/);
    at('ilya', 'prepared', 'B', { ilya_left: 'spared', ilya_sober_days: 4, vasha_fate: 'spared' }, 'ilya_hunter', {}, /somebody else got to her first/);
    at('ilya', 'prepared', 'B', { ilya_left: 'spared', ilya_sober_days: 4, vasha_fate: 'spared', vasha_dead: false }, 'ilya_hunted');
    at('ilya', 'prepared', 'B', { ilya_left: 'bottle' }, 'ilya_drunk', {}, /better shot/);
    at('ilya', 'hostile', 'B', {}, 'ilya_drunk', {}, /bad night/);
    at('ilya', 'prepared', 'A1', {}, 'ilya_chair');
    at('ilya', 'prepared', 'B', { ilya_after: 'shale' }, 'ilya_shale');
    at('ilya', 'prepared', 'B', { ilya_after: 'road' }, 'ilya_road');
    at('ilya', 'prepared', 'B', { ilya_after: 'rest' }, 'ilya_rest');
    at('ilya', 'prepared', 'B', {}, 'ilya_own');
    at('ilya', 'prepared', 'B', {}, 'ilya_own', { companions: { ilya: 'met' } }, /never walked with Halden/);
    // Odile
    at('odile', 'prepared', 'B', {}, 'odile_gone', { companions: { odile: 'gone' } });
    at('odile', 'prepared', 'B', { odile_gone: true, odile_archive: 'burned', nb_archive_burned: true }, 'odile_gone', {}, /lamp past her hand/);
    at('odile', 'prepared', 'B', { odile_gone: true, odile_left: 'price', odile_price: 'sarr', ks_sarr: 'dead' }, 'odile_gone', {}, /my price, my dear/);
    at('odile', 'prepared', 'C', {}, 'odile_exchange');
    at('odile', 'prepared', 'E', {}, 'odile_auditor');
    at('odile', 'prepared', 'B', {}, 'odile_shale');
    at('odile', 'choir', 'B', {}, 'odile_kitchen');
    at('odile', 'prepared', 'B', {}, 'odile_span', { companions: { odile: 'met' } });
    // Ash
    at('ash', 'prepared', 'A1', { a3_ash: 'self' }, 'ash_self');
    at('ash', 'prepared', 'A1', { a3_ash: 'away', a3_ash_target: 'vasha', ash_left: 'orders', vasha_dead: true }, 'ash_unwritten', {}, /Vasha Kade's fire/);
    at('ash', 'prepared', 'B', {}, 'ash_gone', { companions: { ash: 'gone' } });
    at('ash', 'prepared', 'A1', { a3_ash: 'struck', ash_left: 'struck' }, 'ash_gone', {}, /stock of his own gun/);
    at('ash', 'prepared', 'C', {}, 'ash_gone', {}, /crates went down the Line/);
    at('ash', 'prepared', 'A1', { a3_ash: 'between', a3_ash_scarred: true, a3_blade: 'ash' }, 'ash_between', {}, /blade's cut/);
    at('ash', 'prepared', 'B', {}, 'ash_digs');
    at('ash', 'choir', 'B', {}, 'ash_burial');
    at('ash', 'prepared', 'B', {}, 'ash_burial', { companions: { ash: 'met' } }, /never walked with Halden/);
    // Nine
    at('nine', 'prepared', 'A1', { a3_nine_struck: true, nine_gone: true }, 'nine_struck');
    at('nine', 'prepared', 'A1', { nine_disposed: true, a3_recall: 'taken' }, 'nine_disposed', {}, /spring of R31/);
    at('nine', 'prepared', 'E', { nine_disposed: true, a3_recall: 'handed', a3_amend_keeper: true }, 'nine_disposed', {}, /its own keeper/);
    at('nine', 'prepared', 'B', {}, 'nine_withdrawn');
    at('nine', 'prepared', 'B', { nine_left: 'core' }, 'nine_withdrawn');
    at('nine', 'hostile', 'A1', {}, 'nine_gone');
    at('nine', 'prepared', 'A1', { nine_left: 'door', nine_gone: true }, 'nine_gone', {}, /only order it ever refused/);
    at('nine', 'prepared', 'D', {}, 'nine_reader', {}, /read the clauses into the record/);
    at('nine', 'prepared', 'D', { a3_reader: 'verity' }, 'nine_reader', {}, /stood by the reading desk/);
    at('nine', 'prepared', 'A1', {}, 'nine_conscience');
    at('nine', 'choir', 'A1', {}, 'nine_assessor');
    at('nine', 'prepared', 'A2', {}, 'nine_desk', {}, /walked home without the sash/);
    at('nine', 'prepared', 'C', {}, 'nine_desk', {}, /sealed crates/);
    at('nine', 'prepared', 'B', {}, 'nine_desk', { companions: { nine: 'met' } }, /never walked with Halden/);
    // Kes
    at('kes', 'prepared', 'B', { kes_dead: true, kes_left: 'dead' }, 'kes_dead');
    at('kes', 'prepared', 'C', {}, 'kes_gone_concern');
    at('kes', 'prepared', 'B', {}, 'kes_gone', { companions: { kes: 'left' } });
    at('kes', 'prepared', 'B', { kes_left: 'contract' }, 'kes_gone', {}, /contract down unsigned/);
    at('kes', 'prepared', 'B', { kes_fits: true }, 'kes_fits');
    at('kes', 'prepared', 'B', { kes_after: 'shift' }, 'kes_shift');
    at('kes', 'prepared', 'B', { kes_after: 'road' }, 'kes_road');
    at('kes', 'prepared', 'B', { kes_after: 'gardens' }, 'kes_gardens');
    at('kes', 'prepared', 'B', {}, 'kes_slack');
    at('kes', 'prepared', 'B', {}, 'kes_slack', { companions: { kes: 'met' } }, /never walked with Halden/);
    // R49: the end, then the home (the steps for the chair, the board and the clauses)
    at(R49, 'prepared', 'A1', {}, 'r49_chair');
    at(R49, 'prepared', 'C', {}, 'r49_board');
    at(R49, 'prepared', 'E', {}, 'r49_chosen');
    const homes: [string, Over][] = [['knock', {}], ['shale', { standing: { cistern9: 0 } }], ['road', { standing: { cistern9: 0, shale: 0 } }]];
    for (const [end, id] of [['B', 'broken'], ['D', 'known'], ['A2', 'elsewhere']] as [End, string][]) {
      for (const [home, over] of homes) at(R49, 'prepared', end, { a3_shale: 'free' }, `r49_${id}_${home}`, over);
      at(R49, 'hostile', end, {}, `r49_${id}`);
    }
    expect([...reached].sort()).toEqual([...MINE].sort());
  });

  it('only the companions the player met have a slide (Tamsin always: the voice at the Grille); R49 is always shown', () => {
    const a = ended('prepared', 'B', {}, { companions: 'nobody' });
    for (const c of ['wren', 'ilya', 'odile', 'ash', 'nine', 'kes'] as CompanionKey[]) expect(cond(MET_COMPANION[c]!, a.g), c).toBe(false);
    const ps = play(a.g);
    expect(nodes(ps).filter((n) => MINE.includes(n)).map((n) => n.split('_')[0])).toEqual(['tamsin', R49]);
    expect(nodes(ps).at(-1)).toBe('end');
    for (const c of ['wren', 'ilya', 'odile', 'ash', 'nine', 'kes']) expect(a.g.flags[`ep_${c}`], c).toBeUndefined();
    // each companion's own first meeting, or joining, shows their slide
    const met: [CompanionKey, Flags][] = [['wren', { rd_wren_met: true }], ['wren', { wren_joined: true }], ['ilya', { ilya_met: true }], ['ilya', { ilya_recruited: true }],
      ['odile', { odile_met: true }], ['ash', { ash_met: true }], ['nine', { nine_met: true }], ['kes', { kes_met: true }], ['kes', { kes_joined: true }]];
    for (const [c, flags] of met) expect(nodeOf(ended('prepared', 'B', flags, { companions: 'nobody' }).g, c), `${c} ${JSON.stringify(flags)}`).toBeDefined();
    // every preset meets the companions it travelled with
    expect(nodes(play(ended('prepared', 'A2').g)).filter((n) => MINE.includes(n)).map((n) => n.split('_')[0])).toEqual(EP_SLIDES.slice(19));
    expect(nodes(play(ended('hostile', 'A2').g)).filter((n) => MINE.includes(n)).map((n) => n.split('_')[0])).toEqual(['tamsin', 'ilya', 'ash', 'nine', R49]);
  });

  it('selector order holds: where two selectors hold, the earlier wins', () => {
    const variant = (slide: string, id: string) => SLIDES_PEOPLE.find((s) => s.id === slide)!.variants.find((v) => v.id === id)!.if!;
    const both = (g: G, slide: string, first: string, second: string) => {
      expect(cond(variant(slide, first), g), `${slide}/${first}`).toBe(true);
      expect(cond(variant(slide, second), g), `${slide}/${second}`).toBe(true);
      expect(nodeOf(g, slide)).toBe(`${slide}_${first}`);
    };
    both(ended('prepared', 'A1', { a3_tamsin_dead: true, tam_left: 'door' }).g, 'tamsin', 'door', 'gone');
    both(ended('prepared', 'A2', { a3_c9: 'relocated', a3_c9_how: 'order' }, { companions: { tamsin: 'inside' } }).g, 'tamsin', 'taken', 'inside');
    both(ended('prepared', 'B', { a3_shale: 'free', ks_ada: 'stays' }).g, 'tamsin', 'deputy', 'wheel');
    both(ended('prepared', 'B', { a3_c9: 'opened', a3_c9_how: 'ines', a3_shale: 'free', ks_ada: 'dead' }).g, 'tamsin', 'sheriff', 'knock');
    both(ended('prepared', 'A1', { wren_rope: false }, { companions: { wren: 'left' } }).g, 'wren', 'rope_late', 'gone_floor');
    both(ended('prepared', 'B', { wren_hanged: true, wren_left: 'hanged', wren_rope: 'fulfilled' }).g, 'wren', 'hanged', 'gone_floor');
    both(ended('prepared', 'C', { wren_after: 'road' }).g, 'wren', 'gone_concern', 'road');
    both(ended('prepared', 'B', { ilya_left: 'spared', ilya_sober_days: 40, vasha_dead: false }).g, 'ilya', 'hunter', 'hunted');
    both(ended('prepared', 'A1', { ilya_after: 'shale' }).g, 'ilya', 'chair', 'shale');
    both(ended('prepared', 'C').g, 'odile', 'exchange', 'shale');
    both(ended('prepared', 'B', { odile_gone: true }).g, 'odile', 'gone', 'kitchen');
    both(ended('prepared', 'A1', { a3_ash: 'between' }).g, 'ash', 'between', 'digs');
    both(ended('prepared', 'B', { nine_left: 'core', nine_gone: true }).g, 'nine', 'withdrawn', 'gone');
    both(ended('prepared', 'A1').g, 'nine', 'conscience', 'assessor');
    both(ended('prepared', 'B', { kes_dead: true, kes_left: 'dead' }).g, 'kes', 'dead', 'gone');
    both(ended('prepared', 'B', { kes_fits: true, kes_after: 'shift' }).g, 'kes', 'fits', 'shift');
    both(ended('prepared', 'A2', {}).g, R49, 'elsewhere_knock', 'elsewhere_road');
    both(ended('prepared', 'B', { a3_shale: 'free' }).g, R49, 'broken_knock', 'broken_shale');
  });

  it('a dead or departed companion is never shown alive or beside the player: not in R49\'s still, not on the steps, no partner\'s line', () => {
    const cases: [CompanionKey, End, Flags, Over, string[]][] = [
      ['tamsin', 'A1', { a3_tamsin_dead: true, tam_left: 'door', tam_romance: 'together', romance_partner: ID.tamsin }, {}, ['door']],
      ['tamsin', 'B', { tam_left: 'door', tam_romance: 'ended' }, {}, ['stood']],
      ['tamsin', 'A2', { tam_left: 'reserve', a3_c9: 'relocated', a3_c9_how: 'order', tam_romance: 'together' }, {}, ['reserve']],
      ['tamsin', 'A1', { tam_romance: 'together' }, {}, ['chair']],
      ['tamsin', 'B', { tam_broken: true, tam_romance: 'together', a3_c9: 'relocated', a3_c9_how: 'order' }, {}, ['gone']],
      ['tamsin', 'D', { tam_home: true }, {}, ['inside']],
      ['wren', 'B', { wren_hanged: true, wren_left: 'hanged', wren_rope: 'fulfilled', wren_rom: 'committed' }, {}, ['hanged']],
      ['wren', 'A1', { wren_rope: false, wren_rom: 'committed', romance_partner: ID.wren }, {}, ['rope_late']],
      ['wren', 'C', { wren_rope: false, wren_rom: 'committed', wren_left: 'concern' }, {}, ['rope_late']],
      ['wren', 'C', { wren_rom: 'committed', wren_left: 'concern' }, {}, ['gone_concern']],
      ['wren', 'C', { wren_rom: 'committed' }, {}, ['gone_concern']],
      ['wren', 'B', { wren_left: 'sold', wren_rom: 'committed' }, {}, ['gone_sold']],
      ['ilya', 'B', { ilya_left: 'spared', ilya_sober_days: 4, vasha_dead: false, ilya_rom: 'committed' }, {}, ['hunted']],
      ['ilya', 'D', { ilya_left: 'spared', ilya_sober_days: 40, vasha_dead: false, ilya_after: 'road' }, {}, ['hunter']],
      ['ilya', 'B', { ilya_left: 'bottle', ilya_rom: 'committed' }, {}, ['drunk']],
      ['ilya', 'A1', { ilya_rom: 'committed', romance_partner: ID.ilya }, {}, ['chair']],
      ['odile', 'B', { odile_gone: true, odile_left: 'price' }, {}, ['gone']],
      ['ash', 'A1', { a3_ash: 'self' }, {}, ['self']],
      ['ash', 'A1', { a3_ash: 'away', a3_ash_target: 'sarr', ash_left: 'orders', ks_sarr: 'dead' }, {}, ['unwritten']],
      ['ash', 'C', {}, {}, ['gone']],
      ['nine', 'A1', { a3_nine_struck: true, nine_gone: true }, {}, ['struck']],
      ['nine', 'E', { nine_disposed: true, a3_recall: 'taken' }, {}, ['disposed']],
      ['nine', 'B', { nine_left: 'core' }, {}, ['withdrawn']],
      ['nine', 'B', {}, {}, ['withdrawn']],
      ['kes', 'B', { kes_dead: true, kes_left: 'dead', kes_rom: 'committed' }, {}, ['dead']],
      ['kes', 'C', { kes_rom: 'committed', romance_partner: ID.kes, kes_after: 'road' }, {}, ['gone_concern']],
      ['kes', 'D', { kes_left: 'leash', kes_rom: 'ended', kes_after: 'road' }, {}, ['gone']],
    ];
    for (const [c, end, flags, over, want] of cases) {
      const a = ended('prepared', end, flags, over);
      const ps = play(a.g);
      const where = `${c} ${end} ${JSON.stringify(flags)}`;
      expect(want.map((v) => `${c}_${v}`), where).toContain(pageOf(ps, c)!.node);
      expect(cond(EP_STAYED[c], a.g), where).toBe(false);
      const r = pageOf(ps, R49)!;
      expect(stands(a.g, r, ID[c]), `${where}: in R49's still`).toBe(false);
      if (LABEL[c]) expect(r.lines[LABEL[c]!], `${where}: R49's line`).toBeUndefined();
      // the photograph's steps, a year back, show only who climbed and is still beside the player
      if (!cond(ON_SIDE(c), a.g)) expect(stands(a.g, ps[0], ID[c]), `${where}: on the steps`).toBe(false);
      // and no other companion's slide puts them in its still
      for (const p of ps.filter((x) => MINE.includes(x.node) && !x.node.startsWith(`${c}_`) && !x.node.startsWith('r49_'))) expect(stands(a.g, p, ID[c]), `${where}: ${p.node}`).toBe(false);
    }
    // the dead are never in a still of their own slide either
    for (const [c, flags] of [['tamsin', { a3_tamsin_dead: true }], ['ilya', { ilya_left: 'spared', ilya_sober_days: 1, vasha_dead: false }], ['ash', { a3_ash: 'self' }], ['nine', { a3_nine_struck: true, nine_gone: true }], ['kes', { kes_dead: true, kes_left: 'dead' }], ['wren', { wren_hanged: true, wren_left: 'hanged' }]] as [CompanionKey, Flags][]) {
      const a = ended('prepared', 'A1', flags);
      expect(stands(a.g, page(a.g, c)!, ID[c]), c).toBe(false);
    }
  });

  it('the partner stands beside the PC at R49 only when the romance\'s end is together; apart, a letter; failed, nothing', () => {
    const r49 = (end: End, flags: Flags, over: Over = {}) => {
      const a = ended('prepared', end, flags, over);
      const p = page(a.g, R49)!;
      const partners = (['tamsin', 'wren', 'ilya', 'kes'] as CompanionKey[]).filter((c) => stands(a.g, p, ID[c]) && cond(EP_TOGETHER[c as 'tamsin'], a.g));
      return { g: a.g, p, partners };
    };
    // Tamsin: together under B, D, A2, or E with the living clause; apart and still writing under A1, C, or E without it
    for (const end of ['B', 'D', 'A2'] as End[]) {
      const { p, partners } = r49(end, { tam_romance: 'together', romance_partner: ID.tamsin });
      expect(partners, end).toEqual(['tamsin']);
      expect(p.lines.TAMSIN, end).toMatch(/beside Halden, forty-three/);
      expect(still(p).people[0].npc).toBe(ID.tamsin);
    }
    expect(r49('E', { tam_romance: 'together', a3_amend_living: true, a3_amend_reserve: true }).partners).toEqual(['tamsin']);
    for (const [end, flags] of [['A1', { ca_reserve: 'stayed' }], ['C', { ca_reserve: 'stayed' }], ['E', { a3_amend_reserve: true }]] as [End, Flags][]) {
      const { p, partners } = r49(end, { tam_romance: 'together', ...flags });
      expect(partners, end).toEqual([]);
      expect(p.lines.TAMSIN, end).toMatch(/every week for nineteen years/);
      expect(pageOf(play(ended('prepared', end, { tam_romance: 'together', ...flags }).g), 'tamsin')!.lines['BETWEEN THEM'], end).toMatch(/They wrote every week/);
    }
    // Wren: together unless C, or A1 with the rope still open
    expect(r49('B', { wren_rom: 'committed' }).partners).toEqual(['wren']);
    expect(r49('A1', { wren_rom: 'committed', ca_reserve: 'stayed' }).partners).toEqual(['wren']);
    expect(r49('A1', { wren_rom: 'committed', wren_rope: false }).partners).toEqual([]);
    expect(r49('C', { wren_rom: 'committed' }).p.lines.WREN).toBeUndefined();
    // Ilya: together at a well unless A1 or C; under E only at approval 50 and up
    expect(r49('B', { ilya_rom: 'committed' }).partners).toEqual(['ilya']);
    expect(r49('A1', { ilya_rom: 'committed' }).partners).toEqual([]);
    expect(r49('C', { ilya_rom: 'committed' }).p.lines.ILYA).toMatch(/counting something/);
    expect(r49('E', { ilya_rom: 'committed' }, { approval: { ilya: 40 } }).partners).toEqual([]);
    expect(r49('E', { ilya_rom: 'committed' }, { approval: { ilya: 60 } }).partners).toEqual(['ilya']);
    // Kes: together unless C; under A1 only at approval 60 and up (the Ledger cannot see her)
    expect(r49('B', { kes_rom: 'committed' }).partners).toEqual(['kes']);
    expect(r49('A1', { kes_rom: 'committed' }, { approval: { kes: 40 } }).partners).toEqual([]);
    expect(r49('A1', { kes_rom: 'committed' }, { approval: { kes: 40 } }).p.lines.KES).toMatch(/written in the dark/);
    expect(r49('A1', { kes_rom: 'committed' }, { approval: { kes: 70 } }).partners).toEqual(['kes']);
    expect(r49('C', { kes_rom: 'committed' }).partners).toEqual([]);
    // a romance that failed leaves nobody beside the PC, and its own page says so
    const failed: [CompanionKey, Flags, RegExp][] = [
      ['tamsin', { tam_romance: 'ended', tam_listed: true, tam_lies: 2 }, /on her list, under Ines/],
      ['tamsin', { tam_romance: 'stopped' }, /asked her not to/],
      ['wren', { wren_rom: 'ended', wren_after: 'shale' }, /kept a count/],
      ['ilya', { ilya_rom: 'ended', ilya_after: 'shale' }, /bottom of what he could stand/],
      ['kes', { kes_rom: 'ended', kes_after: 'shift' }, /ran out of her slack/],
    ];
    for (const [c, flags, text] of failed) {
      const a = ended('prepared', 'B', flags);
      const ps = play(a.g);
      expect(pageOf(ps, c)!.lines['BETWEEN THEM'], c).toMatch(text);
      const r = pageOf(ps, R49)!;
      expect((['tamsin', 'wren', 'ilya', 'kes'] as CompanionKey[]).filter((x) => cond(EP_TOGETHER[x as 'tamsin'], a.g)), c).toEqual([]);
      expect(r.lines[LABEL[c]!], c).toBeUndefined();
    }
    // together, the companion's own page says so too
    expect(pageOf(play(ended('prepared', 'B', { tam_romance: 'together', a3_shale: 'free', ks_ada: 'stays' }).g), 'tamsin')!.lines['BETWEEN THEM']).toMatch(/never once said blue/);
    expect(pageOf(play(ended('prepared', 'B', { wren_rom: 'committed', wren_after: 'shale' }).g), 'wren')!.lines['BETWEEN THEM']).toMatch(/chosen the stop/);
    expect(pageOf(play(ended('prepared', 'B', { ilya_rom: 'committed', ilya_after: 'rest' }).g), 'ilya')!.lines['BETWEEN THEM']).toMatch(/There was a well/);
    expect(pageOf(play(ended('prepared', 'A1', { kes_rom: 'committed', kes_after: 'shift' }, { approval: { kes: 70 } }).g), 'kes')!.lines['BETWEEN THEM']).toMatch(/Magistrate's house/);
    // never two partners at once
    const a = ended('prepared', 'B', { tam_romance: 'together', wren_rom: 'no', kes_rom: 'no' });
    expect((['tamsin', 'wren', 'ilya', 'kes'] as CompanionKey[]).filter((c) => cond(EP_TOGETHER[c as 'tamsin'], a.g))).toEqual(['tamsin']);
  });

  it('a romance keeps its weight when the companion died or walked, or when it was left unfinished; the last night as friends is remembered', () => {
    const line = (c: string, end: End, flags: Flags, want: string, label: string, over: Over = {}) => {
      const p = pageOf(play(ended('prepared', end, flags, over).g), c)!;
      expect(p.node, `${c} ${JSON.stringify(flags)}`).toBe(`${c}_${want}`);
      return p.lines[label];
    };
    const B = 'BETWEEN THEM', L = 'THE LAST NIGHT';
    // the dead, with something between them
    expect(line('tamsin', 'A1', { a3_tamsin_dead: true, tam_left: 'door', tam_romance: 'ended' }, 'door', B)).toMatch(/windpump once that year/);
    expect(line('wren', 'B', { wren_hanged: true, wren_left: 'hanged', wren_rope: 'fulfilled', wren_rom: 'committed' }, 'hanged', B)).toMatch(/rope did not wait/);
    expect(line('wren', 'A1', { wren_rope: false, wren_rom: 'committed' }, 'rope_late', B)).toMatch(/under Halden's own chair/);
    expect(line('wren', 'C', { wren_rope: false, wren_rom: 'committed', wren_left: 'concern' }, 'rope_late', B)).toMatch(/morning sheet/);
    expect(line('ilya', 'B', { ilya_left: 'spared', ilya_sober_days: 4, vasha_dead: false, ilya_rom: 'yes' }, 'hunted', B)).toMatch(/up the wash with him/);
    expect(line('kes', 'B', { kes_dead: true, kes_left: 'dead', kes_rom: 'dark' }, 'dead', B)).toMatch(/into the channel with her/);
    // the departed: ended, or walked away from unfinished
    expect(line('tamsin', 'B', { tam_left: 'door', tam_romance: 'ended' }, 'stood', B)).toMatch(/kept the riddle/);
    expect(line('tamsin', 'B', { tam_romance: 'open' }, 'gone', B, { companions: { tamsin: 'left' } })).toMatch(/unfinished/);
    expect(line('wren', 'B', { wren_rom: 'ended' }, 'gone_floor', B, { companions: { wren: 'left' } })).toMatch(/said once, and meant/);
    expect(line('wren', 'B', { wren_left: 'block', wren_rom: 'roof' }, 'gone_girl', B)).toMatch(/a route after all/);
    expect(line('ilya', 'B', { ilya_left: 'bottle', ilya_rom: 'well' }, 'drunk', B)).toMatch(/did not survive the bottle/);
    expect(line('ilya', 'B', { ilya_left: 'spared', ilya_sober_days: 40, vasha_dead: false, ilya_rom: 'committed' }, 'hunter', B)).toMatch(/took the number with him/);
    expect(line('kes', 'B', { kes_rom: 'ended' }, 'gone', B, { companions: { kes: 'left' } })).toMatch(/straight out, and then quietly/);
    // a romance never begun has no such line
    expect(line('kes', 'B', { kes_rom: 'no' }, 'gone', B, { companions: { kes: 'left' } })).toBeUndefined();
    expect(line('wren', 'B', {}, 'gone_floor', B, { companions: { wren: 'left' } })).toBeUndefined();
    // unfinished, beside the player: asked on the last night and put off, or never asked
    expect(line('tamsin', 'B', { tam_romance: 'open', a3_tamsin_night: true, a3_shale: 'free', ks_ada: 'stays' }, 'deputy', B)).toMatch(/said after/);
    expect(line('tamsin', 'B', { tam_romance: 'later', a3_shale: 'free', ks_ada: 'stays' }, 'deputy', B)).toMatch(/never got a name/);
    expect(line('wren', 'B', { wren_rom: 'roof', a3_wren_night: true, wren_after: 'shale' }, 'shale', B)).toMatch(/said not tonight/);
    expect(line('wren', 'B', { wren_rom: 'yes', wren_after: 'shale' }, 'shale', B)).toMatch(/never asked Halden the last question/);
    expect(line('ilya', 'B', { ilya_rom: 'later_well', a3_ilya_night: true, ilya_after: 'shale' }, 'shale', B)).toMatch(/by the cup/);
    expect(line('ilya', 'B', { ilya_rom: 'yes', ilya_after: 'shale' }, 'shale', B)).toMatch(/not finished counting/);
    expect(line('kes', 'B', { kes_rom: 'later_dark', a3_kes_night: true, kes_after: 'shift' }, 'shift', B)).toMatch(/said not tonight/);
    expect(line('kes', 'B', { kes_rom: 'dark', kes_after: 'shift' }, 'shift', B)).toMatch(/as far as a name/);
    // the last night as friends
    expect(line('tamsin', 'B', { a3_tamsin_last: 'none', a3_tamsin_night: true, a3_shale: 'free', ks_ada: 'stays' }, 'deputy', L)).toMatch(/Grille's game turned round/);
    expect(line('wren', 'B', { a3_wren_last: 'none', a3_wren_night: true, wren_after: 'shale' }, 'shale', L)).toMatch(/long version of every road/);
    expect(line('ilya', 'B', { a3_ilya_last: 'none', a3_ilya_night: true, ilya_after: 'rest' }, 'rest', L)).toMatch(/counted together/);
    expect(line('kes', 'B', { a3_kes_last: 'none', a3_kes_night: true, kes_after: 'road' }, 'road', L)).toMatch(/gardens on the hill/);
    expect(line('nine', 'A2', { a3_nine_last: 'none', a3_nine_night: true }, 'desk', L)).toMatch(/drains, one last time/);
    expect(line('tamsin', 'B', { a3_tamsin_last: 'together', tam_romance: 'together', a3_shale: 'free', ks_ada: 'stays' }, 'deputy', L)).toBeUndefined();
    // Ash: his word at the fire against a sash put on anyway; the letter burned that night
    expect(line('ash', 'A1', { a3_ash: 'between', a3_ash_word: true, a3_ash_last: 'burned', ash_orders: 'refused' }, 'between', 'HIS WORD')).toMatch(/had put it on/);
    expect(line('ash', 'A1', { a3_ash: 'between', a3_ash_word: true, a3_ash_last: 'burned', ash_orders: 'refused' }, 'between', 'THE LETTER')).toMatch(/burned the letter/);
    expect(line('ash', 'A2', { a3_ash_word: true }, 'digs', 'HIS WORD')).toBeUndefined();
  });

  it('R49 by the end and the home: the steps in the sash for the chair, the board and the clauses; at home, nineteen years on, otherwise', () => {
    for (const preset of PRESETS) {
      for (const end of ENDS) {
        const a = ended(preset, end);
        const ps = play(a.g);
        const p = pageOf(ps, R49)!;
        const d = still(p);
        expect(d.pc).toEqual({ years: 19 });
        const home = modValue(a.g, EP_HOME);
        if (end === 'A1' || end === 'C' || end === 'E') {
          expect(home, `${preset} ${end}`).toBe('city');
          expect(p.node).toBe({ A1: 'r49_chair', C: 'r49_board', E: 'r49_chosen' }[end]);
          expect(d).toMatchObject({ place: 'md_spire', spot: 'steps_sit' });
        } else {
          const id = { A2: 'elsewhere', B: 'broken', D: 'known' }[end];
          expect(p.node, `${preset} ${end} ${home}`).toBe(home === 'nowhere' ? `r49_${id}` : `r49_${id}_${home}`);
          expect(d.place).toBe({ knock: 'c9_mouth', shale: 'shale', road: 'wheel', nowhere: 'wild_track' }[home]);
          expect(p.text).toMatch(/nineteen years older/);
        }
        expect(nodes(ps).at(-2), `${preset} ${end}`).toBe(p.node);
      }
    }
    // A2's face on the steps is slide 1's docker from Carrick; B's steps were never finished; D's face is everyone's
    expect(page(ended('prepared', 'A2').g, R49)!.text).toMatch(/docker from Carrick/);
    expect(play(ended('prepared', 'A2').g)[0].text).toMatch(/young docker about Halden's age, who had walked up from Carrick/);
    expect(page(ended('prepared', 'B').g, R49)!.text).toMatch(/never been finished/);
    expect(page(ended('prepared', 'D').g, R49)!.text).toMatch(/best-known face in the basin/);
    // the companions who stayed near stand with the PC at home
    const near = ended('prepared', 'B', { a3_shale: 'free', ilya_after: 'shale', wren_after: 'shale' }, { standing: { cistern9: 0 } });
    const np = page(near.g, R49)!;
    expect(np.node).toBe('r49_broken_shale');
    for (const c of ['ilya', 'wren', 'odile', 'tamsin'] as CompanionKey[]) expect(stands(near.g, np, ID[c]), c).toBe(true);
    expect(stands(near.g, np, ID.kes)).toBe(false);
    // the chair keeps Nine a step below it when it stayed
    const chair = ended('prepared', 'A1');
    const cp = page(chair.g, R49)!;
    expect(stands(chair.g, cp, ID.nine)).toBe(true);
    expect(cp.text).toMatch(/Nine stood a step below/);
  });

  it('the companions\' slides agree with the slides before them: the rope, Brother Ash\'s hand, Kade alive while Ilya hunts', () => {
    // Wren's rope comes due under A1 or C only, as the twelve say
    for (const end of ENDS) {
      const ps = play(ended('prepared', end, { wren_rope: false }).g);
      const late = end === 'A1' || end === 'C';
      expect(pageOf(ps, 'wren')!.node, end).toBe(late ? 'wren_rope_late' : 'wren_scout');
      expect(pageOf(ps, 'ledger')!.lines['CALLOWAY, WREN'], end).toMatch(late ? /on schedule/ : /still waiting for her/);
    }
    // Ash's orders put on a keystone: his slide names the same person slide 2 does
    for (const [t, dead, name] of [['vasha', { vasha_dead: true, vasha_fate: false }, /Vasha Kade/], ['sarr', { ks_sarr: 'dead' }, /Imelda Sarr/], ['vane', { cr_celestine_dead: true, ks_vane: 'rises' }, /Celestine Vane/]] as [string, Flags, RegExp][]) {
      const ps = play(ended('prepared', 'A1', { a3_ash: 'away', a3_ash_target: t, ash_left: 'orders', ...dead }).g);
      expect(pageOf(ps, 'ash')!.text, t).toMatch(name);
      expect(Object.values(pageOf(ps, 'ledger')!.lines).some((l) => /by Brother Ash/.test(l)), t).toBe(true);
    }
    // a hunter who found her walked away: the twelve still have Kade alive
    const h = play(ended('prepared', 'B', { ilya_left: 'spared', ilya_sober_days: 40, vasha_fate: 'spared', vasha_dead: false }).g);
    expect(pageOf(h, 'ilya')!.node).toBe('ilya_hunter');
    expect(pageOf(h, 'ledger')!.lines['KADE, VASHA']).toMatch(/^Alive/);
    // the steps' Ash at the lamp is Ash's own end
    expect(pageOf(play(ended('prepared', 'A1', { a3_ash: 'self' }).g), 'ash')!.text).toMatch(/foot of the lamp/);
    // Nine at the reading desk on slide 2 is its own conscience or assessor page
    for (const [preset, end, want] of [['prepared', 'A1', 'nine_conscience'], ['choir', 'A1', 'nine_assessor'], ['prepared', 'E', 'nine_conscience'], ['choir', 'E', 'nine_assessor']] as [Preset, End, string][]) {
      const ps = play(ended(preset, end).g);
      expect(pageOf(ps, 'nine')!.node).toBe(want);
      expect(pageOf(ps, 'ledger')!.text).toMatch(/Nine/);
    }
  });

  it('the chain plays to the end on every preset and end, the slides in order; every page one page; {name} is the player\'s; within the size cap', () => {
    const texts = new Set<string>();
    for (const preset of PRESETS) {
      for (const end of ENDS) {
        for (const extra of [{}, { a3_c9: 'opened', a3_c9_how: 'ines' }, { a3_shale: 'free', ks_ada: 'stays', tam_romance: 'together' }] as Flags[]) {
          const ps = play(ended(preset, end, extra).g);
          expect(ps.at(-1)!.node).toBe('end');
          const mine = ps.filter((p) => MINE.includes(p.node));
          const order = mine.map((p) => EP_SLIDES.indexOf(p.node.split('_')[0]));
          expect(order, `${preset} ${end}`).toEqual([...order].sort((x, y) => x - y));
          expect(mine.at(-1)!.node.startsWith('r49_')).toBe(true);
          for (const p of mine) {
            texts.add(p.text);
            expect(words(p.text), `${p.node}: ${p.text}`).toBeGreaterThanOrEqual(55);
            expect(words(p.text), p.node).toBeLessThanOrEqual(115);
            expect(p.text).not.toMatch(/\{\w+\}/);
            for (const l of Object.values(p.lines)) expect(l).not.toMatch(/\{\w+\}/);
          }
        }
      }
    }
    expect(texts.size).toBeGreaterThanOrEqual(40);
    // every text entry and line entry any state can show
    for (const x of lengths(SLIDES_PEOPLE)) {
      if (x.line) expect(x.words, x.where).toBeLessThanOrEqual(45);
      else {
        expect(x.words, x.where).toBeGreaterThanOrEqual(55);
        expect(x.words, x.where).toBeLessThanOrEqual(115);
      }
    }
    // B6s's budget, held by these eight slides on their own: about 40 KB a slide on average
    expect(treeBytes(SLIDES_PEOPLE)).toBeLessThan(40 * 1024 * SLIDES_PEOPLE.length);
  });

  it('reads only flags content writes (the vault\'s leavings are B6r\'s, as B6s set them out), and the flags are in the Act 3 registry', () => {
    const PENDING_B6R = ['wren_left = concern', 'kes_left = concern', 'nine_left = core'];
    const bad = unwritten(SLIDES_PEOPLE);
    expect(bad.filter((b) => !PENDING_B6R.includes(b))).toEqual([]);
    const src = readFileSync('src/content/world/a3_conds.ts', 'utf8');
    const block = src.slice(src.indexOf(' * B6v (built'), src.indexOf(' * Planned (the slice'));
    for (const f of ['ep_tamsin', 'ep_wren', 'ep_ilya', 'ep_odile', 'ep_ash', 'ep_nine', 'ep_kes', 'ep_r49', 'ep_home', 'MET_COMPANION', 'CHAIR_TOOK', 'EP_STAYED', 'EP_TOGETHER',
      'wren_left / kes_left = concern', 'nine_left = core', 'tam_romance', 'ilya_sober_days', 'odile_price', 'a3_ash_target', 'NINE_DEED', 'kes_link']) expect(block.includes(f), f).toBe(true);
  });
});
