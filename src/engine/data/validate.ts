import type { MapDef } from './types';
import type { ItemDef } from '../inventory/items';
import type { PerkDef, TraitDef } from '../stats/sheet';
import { ATTRIBUTES, SKILLS } from '../stats/rules';
import type { NpcDef } from '../npc/defs';
import { Grid } from '../scene/grid';
import type { DialogueDef } from '../dialogue/dialogue';
import type { QuestDef } from '../quest/quest';
import { CHROME_SLOTS, type ChromeDef } from '../stats/chrome';
import { GARMENTS } from './garments';
import { OUTFIT_ROLES } from './outfits';
import { SETTLEMENT_TYPES, type SettlementType } from '../world/settlementTypes';
import { planTrip, type WorldMap } from '../world/travel';
import type { FactionDef } from '../world/factions';

export interface ContentBundle {
  maps: Record<string, MapDef>;
  items?: Record<string, ItemDef>;
  traits?: Record<string, TraitDef>;
  perks?: Record<string, PerkDef>;
  npcs?: Record<string, NpcDef>;
  dialogues?: Record<string, DialogueDef>;
  quests?: Record<string, QuestDef>;
  leads?: Record<string, { id: string }>;
  conclusions?: Record<string, { id: string; from: string[] }>;
  settlements?: Record<string, { id: string; roads: Record<string, number>; type?: SettlementType; region?: string; prosperity?: number }>;
  regions?: Record<string, { id: string; bounds: [number, number, number, number] }>;
  worldMap?: WorldMap;
  factions?: Record<string, FactionDef>;
  letters?: Record<string, { id: string; to: string; if?: unknown; effects?: unknown; reply?: { effects?: unknown } }>;
  chrome?: Record<string, ChromeDef>;
  /** Kin who share a surname: surname → npc ids of that one family (content/rules/families.ts). */
  families?: Record<string, string[]>;
}

/**
 * Checks every cross-reference in the content. Returns a list of human-readable problems.
 * Extended as new content types (dialogue, quests, items, NPCs) are added.
 */
export function validateContent(c: ContentBundle): string[] {
  const errs: string[] = [];
  for (const [key, map] of Object.entries(c.maps)) {
    const where = `map ${key}`;
    if (map.id !== key) errs.push(`${where}: id "${map.id}" does not match registry key`);
    if (map.settlement && c.settlements && !c.settlements[map.settlement]) errs.push(`${where}: unknown settlement ${map.settlement}`);
    for (const [sid, sp] of Object.entries(map.spots ?? {})) if (!new Grid(map).inBounds(sp.x, sp.y)) errs.push(`${where}: spot ${sid} out of bounds`);
    const used = new Set(map.layout.join(''));
    for (const ch of used) if (!(ch in map.legend) && ch !== ' ') errs.push(`${where}: layout char "${ch}" missing from legend`);
    const grid = new Grid(map);
    const ids = new Set<string>();
    for (const s of map.spawns) {
      if (ids.has(s.id)) errs.push(`${where}: duplicate spawn "${s.id}"`);
      ids.add(s.id);
      const t = grid.get(s.x, s.y);
      if (!t) errs.push(`${where}: spawn "${s.id}" out of bounds`);
      else if (!t.walkable) errs.push(`${where}: spawn "${s.id}" at ${s.x},${s.y} is not walkable`);
    }
    for (const p of map.props ?? []) {
      if (!grid.inBounds(p.x, p.y)) errs.push(`${where}: prop ${p.kind} at ${p.x},${p.y} out of bounds`);
      else if (map.legend[map.layout[p.y][p.x]]?.wall) errs.push(`${where}: prop ${p.kind} at ${p.x},${p.y} is inside a wall`);
    }
    const propIds = new Set((map.props ?? []).map((p) => p.id).filter(Boolean));
    for (const [cid, cdef] of Object.entries(map.containers ?? {})) {
      if (!propIds.has(cid)) errs.push(`${where}: container "${cid}" has no prop with that id`);
      for (const [item] of cdef.items) if (c.items && !c.items[item]) errs.push(`${where}: container "${cid}" unknown item ${item}`);
    }
    for (const p of map.npcs ?? []) {
      if (c.npcs && !c.npcs[p.def]) errs.push(`${where}: unknown npc ${p.def}`);
      for (const e of p.schedule ?? c.npcs?.[p.def]?.schedule ?? []) if (e.spot && !map.spots?.[e.spot]) errs.push(`${where}: npc ${p.def} schedule spot ${e.spot} missing from map.spots`);
      if (!grid.passable(p.x, p.y)) errs.push(`${where}: npc ${p.def} at ${p.x},${p.y} is not on a free walkable tile`);
    }
    for (const e of map.exits ?? []) {
      let reachable = false;
      for (let y = e.y; y < e.y + (e.h ?? 1); y++) for (let x = e.x; x < e.x + (e.w ?? 1); x++) if (grid.get(x, y)?.walkable) reachable = true;
      if (!reachable) errs.push(`${where}: exit at ${e.x},${e.y} has no walkable tile`);
      if ('location' in e.to) {
        const target = c.maps[e.to.location];
        if (!target) errs.push(`${where}: exit to unknown location "${e.to.location}"`);
        else if (!target.spawns.some((s) => s.id === (e.to as { spawn: string }).spawn)) errs.push(`${where}: exit to ${e.to.location} unknown spawn "${e.to.spawn}"`);
      }
    }
  }
  // Items
  const items = c.items ?? {};
  const ammoTypes = new Set(Object.values(items).filter((d) => d.ammo).map((d) => d.ammo!.type));
  for (const [key, d] of Object.entries(items)) {
    const where = `item ${key}`;
    if (d.armor && !d.wear) errs.push(`${where}: armour has no wear visual (what it looks like on the body)`);
    if (d.id !== key) errs.push(`${where}: id mismatch`);
    if (!(d.weight >= 0) || !(d.value >= 0)) errs.push(`${where}: bad weight/value`);
    if (d.category === 'weapon' && !d.weapon) errs.push(`${where}: weapon without weapon stats`);
    if (d.weapon) {
      const w = d.weapon;
      if (!SKILLS.includes(w.skill)) errs.push(`${where}: unknown skill ${w.skill}`);
      if (w.dmg[0] > w.dmg[1]) errs.push(`${where}: dmg min > max`);
      if (w.ammo && !ammoTypes.has(w.ammo)) errs.push(`${where}: no ammo item of type ${w.ammo}`);
      if (!d.held) errs.push(`${where}: weapon has no held shape (what it looks like in the hand)`);
      if (w.magazine && !w.ammo) errs.push(`${where}: magazine without ammo type`);
    }
    if (d.category === 'armor' && !d.armor) errs.push(`${where}: armor without armor stats`);
  }
  // Rules
  for (const [key, p] of Object.entries(c.perks ?? {})) {
    if (p.id !== key) errs.push(`perk ${key}: id mismatch`);
    for (const a of Object.keys(p.req.attrs ?? {})) if (!ATTRIBUTES.includes(a as never)) errs.push(`perk ${key}: unknown attribute ${a}`);
    for (const k of Object.keys(p.req.skills ?? {})) if (!SKILLS.includes(k as never)) errs.push(`perk ${key}: unknown skill ${k}`);
    for (const t of p.req.notTraits ?? []) if (!(t in (c.traits ?? {}))) errs.push(`perk ${key}: unknown trait ${t}`);
  }
  for (const [key, t] of Object.entries(c.traits ?? {})) if (t.id !== key) errs.push(`trait ${key}: id mismatch`);
  for (const [key, n] of Object.entries(c.npcs ?? {})) {
    if (n.id !== key) errs.push(`npc ${key}: id mismatch`);
    for (const [item] of n.inventory ?? []) if (c.items && !c.items[item]) errs.push(`npc ${key}: unknown item ${item}`);
    for (const item of n.equip ?? []) if (c.items && !c.items[item]) errs.push(`npc ${key}: unknown equip ${item}`);
    for (const t of n.traits ?? []) if (c.traits && !c.traits[t]) errs.push(`npc ${key}: unknown trait ${t}`);
    if (n.dialogue && c.dialogues && !c.dialogues[n.dialogue]) errs.push(`npc ${key}: unknown dialogue ${n.dialogue}`);
    if (n.role && !OUTFIT_ROLES.includes(n.role)) errs.push(`npc ${key}: unknown role ${n.role}`);
    for (const [item] of n.merchant?.stock ?? []) if (c.items && !c.items[item]) errs.push(`npc ${key}: merchant stocks unknown item ${item}`);
    for (const id of n.surgeon?.stock ?? []) if (c.chrome && !c.chrome[id]) errs.push(`npc ${key}: surgeon stocks unknown chrome ${id}`);
    for (const e of n.schedule ?? []) {
      if (!(e.from >= 0 && e.from <= 24 && e.to >= 0 && e.to <= 24)) errs.push(`npc ${key}: schedule hours out of range`);
      if (!e.spot && !e.at && e.activity !== 'away') errs.push(`npc ${key}: schedule entry has no spot`);
    }
    if (n.settlement && c.settlements && !c.settlements[n.settlement]) errs.push(`npc ${key}: unknown settlement ${n.settlement}`);
    for (const g of n.outfit?.layers ?? []) {
      if (!GARMENTS[g.name]) errs.push(`npc ${key}: unknown garment ${g.name}`);
      else if (GARMENTS[g.name].retired) errs.push(`npc ${key}: garment ${g.name} is retired (${GARMENTS[g.name].retired})`);
    }
  }
  for (const [key, st] of Object.entries(c.settlements ?? {})) {
    if (st.type && !SETTLEMENT_TYPES[st.type]) errs.push(`settlement ${key}: unknown type ${st.type}`);
    if (st.region && c.regions && !c.regions[st.region]) errs.push(`settlement ${key}: unknown region ${st.region}`);
    if (st.prosperity !== undefined && !(st.prosperity >= 0 && st.prosperity <= 1)) errs.push(`settlement ${key}: prosperity outside 0..1`);
  }
  if (c.worldMap) {
    const m = c.worldMap, locs = m.locations;
    for (const [key, l] of Object.entries(locs)) {
      const where = `location ${key}`;
      if (l.id !== key) errs.push(`${where}: id mismatch`);
      const reg = c.regions?.[l.region];
      if (c.regions && !reg) errs.push(`${where}: unknown region ${l.region}`);
      else if (reg && (l.x < reg.bounds[0] || l.y < reg.bounds[1] || l.x > reg.bounds[2] || l.y > reg.bounds[3])) errs.push(`${where}: (${l.x},${l.y}) outside ${l.region}`);
      if (l.settlement && c.settlements && !c.settlements[l.settlement]) errs.push(`${where}: unknown settlement ${l.settlement}`);
      if (l.map && !c.maps[l.map]) errs.push(`${where}: unknown map ${l.map}`);
    }
    for (const r of m.routes) {
      if (!locs[r.a] || !locs[r.b]) errs.push(`route ${r.a}-${r.b}: unknown endpoint`);
      if (!(r.danger >= 0 && r.danger <= 1)) errs.push(`route ${r.a}-${r.b}: danger outside 0..1`);
    }
    for (const [key, n] of Object.entries(m.networks)) {
      for (const s of n.stops) if (!locs[s]) errs.push(`network ${key}: unknown stop ${s}`);
      if (n.legHours.length !== n.stops.length - 1) errs.push(`network ${key}: needs ${n.stops.length - 1} leg times`);
    }
    // Every place must be reachable on foot from the first location (hidden ones once known).
    const start = Object.keys(locs)[0];
    if (start) for (const k of Object.keys(locs)) {
      if (!planTrip(m, start, k, { modes: [], networks: [], known: () => true, hour: 8 })) errs.push(`location ${k}: unreachable on foot from ${start}`);
    }
    for (const key of Object.keys(c.settlements ?? {})) if (!Object.values(locs).some((l) => l.settlement === key)) errs.push(`settlement ${key}: not on the world map`);
  }
  for (const [key, ch] of Object.entries(c.chrome ?? {})) {
    if (ch.id !== key) errs.push(`chrome ${key}: id mismatch`);
    if (!CHROME_SLOTS.includes(ch.slot)) errs.push(`chrome ${key}: unknown slot ${ch.slot}`);
    if (ch.upkeep && c.items && !c.items[ch.upkeep.item]) errs.push(`chrome ${key}: unknown upkeep item ${ch.upkeep.item}`);
    if (!(ch.drift > 0 && ch.drift <= 30)) errs.push(`chrome ${key}: drift ${ch.drift} outside 1..30`);
  }
  // Narrative: walk every condition/effect object for references.
  const refs = (where: string, x: unknown): void => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { x.forEach((v) => refs(where, v)); return; }
    const o = x as Record<string, unknown>;
    for (const k of ['item', 'give', 'take'] as const) if (typeof o[k] === 'string' && c.items && !c.items[o[k] as string]) errs.push(`${where}: unknown item ${o[k]}`);
    if (typeof o.quest === 'string' && c.quests) {
      const q = c.quests[o.quest];
      if (!q) errs.push(`${where}: unknown quest ${o.quest}`);
      else for (const st of [o.stage].flat()) if (typeof st === 'string' && !q.stages[st]) errs.push(`${where}: quest ${o.quest} has no stage ${st}`);
    }
    if (typeof o.skill === 'string' && !SKILLS.includes(o.skill as never)) errs.push(`${where}: unknown skill ${o.skill}`);
    if (typeof o.attr === 'string' && !ATTRIBUTES.includes(o.attr as never)) errs.push(`${where}: unknown attribute ${o.attr}`);
    if (typeof o.trait === 'string' && c.traits && !c.traits[o.trait]) errs.push(`${where}: unknown trait ${o.trait}`);
    if (typeof o.perk === 'string' && c.perks && !c.perks[o.perk]) errs.push(`${where}: unknown perk ${o.perk}`);
    if (typeof o.chrome === 'string' && c.chrome && !c.chrome[o.chrome]) errs.push(`${where}: unknown chrome ${o.chrome}`);
    for (const k of ['member', 'enlist', 'expel'] as const) {
      if (typeof o[k] !== 'string' || !c.factions) continue;
      const f = c.factions[o[k] as string];
      if (!f) errs.push(`${where}: unknown faction ${o[k]}`);
      else if (typeof o.rank === 'string' && !f.ranks.some((r) => r.id === o.rank)) errs.push(`${where}: faction ${o[k]} has no rank ${o.rank}`);
    }
    if (o.promote && typeof o.promote === 'object' && c.factions) {
      const p = o.promote as { faction: string; rank: string };
      if (!c.factions[p.faction]) errs.push(`${where}: unknown faction ${p.faction}`);
      else if (!c.factions[p.faction].ranks.some((r) => r.id === p.rank)) errs.push(`${where}: faction ${p.faction} has no rank ${p.rank}`);
    }
    if (typeof o.chromeSlot === 'string' && !CHROME_SLOTS.includes(o.chromeSlot as never)) errs.push(`${where}: unknown chrome slot ${o.chromeSlot}`);
    if (typeof o.lead === 'string' && c.leads && !c.leads[o.lead]) errs.push(`${where}: unknown lead ${o.lead}`);
    if (typeof o.concluded === 'string' && c.conclusions && !c.conclusions[o.concluded]) errs.push(`${where}: unknown conclusion ${o.concluded}`);
    const place = (o.news as { at?: string } | undefined)?.at ?? (o.heard as { settlement?: string } | undefined)?.settlement ?? (o.standing as { settlement?: string } | undefined)?.settlement;
    if (place && c.settlements && !c.settlements[place]) errs.push(`${where}: unknown settlement ${place}`);
    for (const v of Object.values(o)) if (v && typeof v === 'object') refs(where, v);
  };
  for (const [key, d] of Object.entries(c.dialogues ?? {})) {
    const where = `dialogue ${key}`;
    if (d.id !== key) errs.push(`${where}: id mismatch`);
    for (const s of d.start) if (!d.nodes[s.node]) errs.push(`${where}: start node ${s.node} missing`);
    if (!d.start.some((s) => !s.if)) errs.push(`${where}: needs an unconditional start entry`);
    const seenIds = new Set<string>();
    for (const [nid, n] of Object.entries(d.nodes)) {
      if (!n.options.length) errs.push(`${where}/${nid}: node has no options (add an exit)`);
      n.options.forEach((o, i) => {
        if (o.next && !d.nodes[o.next]) errs.push(`${where}/${nid}#${i}: next ${o.next} missing`);
        if (o.fail && !d.nodes[o.fail]) errs.push(`${where}/${nid}#${i}: fail ${o.fail} missing`);
        if (!o.next && !o.exit) errs.push(`${where}/${nid}#${i}: option needs next or exit`);
        if (o.id) { if (seenIds.has(o.id)) errs.push(`${where}: duplicate option id ${o.id}`); seenIds.add(o.id); }
      });
      for (const ij of n.interject ?? []) {
        if (c.npcs && !c.npcs[ij.companion]) errs.push(`${where}/${nid}: interjection by unknown companion ${ij.companion}`);
        refs(`${where}/${nid}/interject`, ij);
      }
      refs(`${where}/${nid}`, n);
    }
  }
  for (const [key, q] of Object.entries(c.quests ?? {})) {
    const where = `quest ${key}`;
    if (q.id !== key) errs.push(`${where}: id mismatch`);
    if (!q.stages[q.start]) errs.push(`${where}: start stage ${q.start} missing`);
    for (const [sid, st] of Object.entries(q.stages)) {
      for (const t of st.next ?? []) if (!q.stages[t.stage]) errs.push(`${where}/${sid}: next stage ${t.stage} missing`);
      refs(`${where}/${sid}`, st);
    }
    if (!Object.values(q.stages).some((st) => st.end)) errs.push(`${where}: no ending stage`);
    refs(`${where}/routes`, q.routes);
  }
  for (const [key, cn] of Object.entries(c.conclusions ?? {})) {
    if (cn.id !== key) errs.push(`conclusion ${key}: id mismatch`);
    for (const l of cn.from) if (c.leads && !c.leads[l]) errs.push(`conclusion ${key}: unknown lead ${l}`);
    if (cn.from.length < 2) errs.push(`conclusion ${key}: needs at least two leads`);
  }
  for (const [key, st] of Object.entries(c.settlements ?? {})) for (const to of Object.keys(st.roads)) {
    if (!c.settlements![to]) errs.push(`settlement ${key}: road to unknown ${to}`);
    else if (!(key in c.settlements![to].roads)) errs.push(`settlement ${key}: road to ${to} is one-way`);
  }
  for (const [key, l] of Object.entries(c.letters ?? {})) {
    if (l.id !== key) errs.push(`letter ${key}: id mismatch`);
    if (c.npcs && !c.npcs[l.to]) errs.push(`letter ${key}: unknown recipient ${l.to}`);
    refs(`letter ${key}`, l.if); refs(`letter ${key}`, l.effects); refs(`letter ${key} reply`, l.reply?.effects);
  }
  errs.push(...naming(c), ...peopleNames(c));
  for (const [key, f] of Object.entries(c.factions ?? {})) {
    if (f.id !== key) errs.push(`faction ${key}: id mismatch`);
    if (!f.ranks.length) errs.push(`faction ${key}: no ranks`);
    if (new Set(f.ranks.map((r) => r.id)).size !== f.ranks.length) errs.push(`faction ${key}: duplicate rank ids`);
    for (const o of f.conflicts ?? []) if (!c.factions![o]) errs.push(`faction ${key}: unknown conflict ${o}`);
    if (f.home && c.settlements && !c.settlements[f.home] && !c.worldMap?.locations[f.home]) errs.push(`faction ${key}: unknown home ${f.home}`);
    if (f.initiation && c.quests && !c.quests[f.initiation]) errs.push(`faction ${key}: unknown initiation quest ${f.initiation}`);
    for (const r of f.ranks) refs(`faction ${key} rank ${r.id}`, r.requires);
  }
  return errs;
}

/** The naming bible's mechanical checks (docs/DESIGN_UNITY.md §8.1, U6): a settlement, map, world location, faction,
 * quest or item is never named "The" + a noun alone, and no name uses a banned word. Regions (geography keeps its article
 * as English does) and map props (labels of things, not names) are not checked. */
export const BANNED_NAME_WORDS = ['wasteland', 'wastelander', 'vault', 'overseer', 'brotherhood', 'enclave', 'doom', 'neo-', 'cyber', 'topia'];

export function naming(c: ContentBundle): string[] {
  const errs: string[] = [];
  const check = (where: string, name: string | undefined) => {
    if (!name) return;
    if (/^the\s/i.test(name)) errs.push(`${where}: name "${name}" is "the" + a noun (naming bible: a found name)`);
    const low = name.toLowerCase();
    for (const w of BANNED_NAME_WORDS) if (low.includes(w)) errs.push(`${where}: name "${name}" uses the banned "${w}"`);
  };
  for (const [k, m] of Object.entries(c.maps ?? {})) check(`map ${k}`, (m as { name?: string }).name);
  for (const [k, st] of Object.entries(c.settlements ?? {})) check(`settlement ${k}`, (st as { name?: string }).name);
  for (const [k, l] of Object.entries(c.worldMap?.locations ?? {})) check(`location ${k}`, (l as { name?: string }).name);
  for (const [k, f] of Object.entries(c.factions ?? {})) check(`faction ${k}`, (f as { name?: string }).name);
  for (const [k, q] of Object.entries(c.quests ?? {})) check(`quest ${k}`, (q as { title?: string }).title);
  for (const [k, it] of Object.entries(c.items ?? {})) check(`item ${k}`, (it as { name?: string }).name);
  return errs;
}

/** Words that open a display name without being part of the person's name: titles, ranks and trades worn as titles
 * ("Sergeant", "Mother", "Cutter"), and the role words of a crowd ("Guild Guard", "Pale Sworn"). A display name made
 * only of these labels a role, not a person. */
export const NAME_TITLES = ['Assessor', 'Auctioneer', 'Auntie', 'Boss', 'Brother', 'Captain', 'Caravan', 'Carter', 'Clerk', 'Corporal', 'Cutter', 'Deputy', 'Desk', 'Digger', 'Doc', 'Dog-mother', 'Dr', 'Elder', 'Engineer', 'Factor', 'Gilt', 'Grand', 'Guard', 'Guild', 'Hand', 'House', 'Keeper', 'Lift', 'Listener', 'Madame', 'Mama', 'Mender', 'Mother', 'Mr', 'Mrs', 'Ms', 'Nines', 'Novice', 'Old', 'Outrider', 'Pale', 'Pit', 'Quartermaster', 'Rustmouth', 'Scrap', 'Scrapper', 'Sergeant', 'Sheriff', 'Sister', 'Steward', 'Sworn', 'Tanner', 'Toll-warden', 'Twelves', 'Warden', 'Watch'];

/** The person's own name in a display name, titles dropped: "Sergeant Freya Brecht" → [Freya, Brecht], "Rust Dog
 * (Burr)" → [Burr], "Girma of the Wheel" → [Girma]. Null for a role or a description ("Guild Guard", "A walker",
 * "Passer-by 3", "Grel's Man"). The first word is the given name; the last of two or more is the surname. */
export function personName(display: string): string[] | null {
  let s = display.trim();
  const nick = /\(([^)]+)\)$/.exec(s);
  if (nick) s = nick[1];
  s = s.replace(/\s+of\s.*$/, '');
  const words = s.split(/\s+/);
  if (words.some((w) => !/^[A-Z][A-Za-z'-]*$/.test(w) || /'s$/.test(w))) return null;
  while (words.length && NAME_TITLES.includes(words[0])) words.shift();
  return words.length ? words : null;
}

/** One name per person (naming bible, docs/DESIGN_UNITY.md §8.1): a surname belongs to one family, so two people share
 * it, or one's given name is another's surname, only when all of them are listed as kin under it in `families`; and no
 * two people in the same region share a given name. A person's region is their settlement's, else their map's. */
export function peopleNames(c: ContentBundle): string[] {
  const errs: string[] = [];
  if (!c.npcs) return errs;
  const families = c.families ?? {};
  const placedOn: Record<string, string> = {};
  for (const [mk, m] of Object.entries(c.maps)) for (const p of m.npcs ?? []) placedOn[p.def] ??= mk;
  const settlementRegion = (s?: string) => (s ? c.settlements?.[s]?.region : undefined);
  const regionOf = (n: NpcDef): string | undefined => {
    const mk = placedOn[n.id];
    return settlementRegion(n.settlement) ?? (mk ? settlementRegion(c.maps[mk].settlement) ?? Object.values(c.worldMap?.locations ?? {}).find((l) => l.map === mk)?.region : undefined);
  };
  const label = (id: string) => `${id} ("${c.npcs![id].name}")`;
  const people = Object.values(c.npcs).flatMap((n) => {
    const words = personName(n.name);
    return words ? [{ id: n.id, given: words[0], surname: words.length > 1 ? words[words.length - 1] : undefined, region: regionOf(n) }] : [];
  });
  const kin = (surname: string, ids: string[]) => ids.every((id) => families[surname]?.includes(id));
  const bySurname: Record<string, string[]> = {};
  for (const p of people) if (p.surname) (bySurname[p.surname] ??= []).push(p.id);
  for (const [s, ids] of Object.entries(bySurname)) if (ids.length > 1 && !kin(s, ids)) errs.push(`surname "${s}": ${ids.map(label).join(', ')} share it but are not listed as one family (content/rules/families.ts)`);
  for (const p of people) {
    const holders = (bySurname[p.given] ?? []).filter((id) => id !== p.id);
    if (holders.length && !kin(p.given, [p.id, ...holders])) errs.push(`npc ${label(p.id)}: name "${p.given}" is also the surname of ${holders.map(label).join(', ')}`);
  }
  const byGiven: Record<string, Record<string, string[]>> = {};
  for (const p of people) if (p.region) ((byGiven[p.region] ??= {})[p.given] ??= []).push(p.id);
  for (const [r, names] of Object.entries(byGiven)) for (const [g, ids] of Object.entries(names)) if (ids.length > 1) errs.push(`region ${r}: ${ids.map(label).join(', ')} share the given name "${g}"`);
  for (const [s, ids] of Object.entries(families)) for (const id of ids) {
    const words = c.npcs[id] && personName(c.npcs[id].name);
    if (!c.npcs[id]) errs.push(`families ${s}: unknown npc ${id}`);
    else if (!words || words[words.length - 1] !== s) errs.push(`families ${s}: ${label(id)} does not carry that surname`);
  }
  return errs;
}
