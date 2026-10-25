import type { MapDef } from './types';
import type { ItemDef } from '../inventory/items';
import type { PerkDef, TraitDef } from '../stats/sheet';
import { ATTRIBUTES, SKILLS } from '../stats/rules';
import type { NpcDef } from '../npc/defs';
import { Grid } from '../scene/grid';

export interface ContentBundle {
  maps: Record<string, MapDef>;
  items?: Record<string, ItemDef>;
  traits?: Record<string, TraitDef>;
  perks?: Record<string, PerkDef>;
  npcs?: Record<string, NpcDef>;
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
    for (const p of map.npcs ?? []) if (c.npcs && !c.npcs[p.def]) errs.push(`${where}: unknown npc ${p.def}`);
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
    if (d.id !== key) errs.push(`${where}: id mismatch`);
    if (!(d.weight >= 0) || !(d.value >= 0)) errs.push(`${where}: bad weight/value`);
    if (d.category === 'weapon' && !d.weapon) errs.push(`${where}: weapon without weapon stats`);
    if (d.weapon) {
      const w = d.weapon;
      if (!SKILLS.includes(w.skill)) errs.push(`${where}: unknown skill ${w.skill}`);
      if (w.dmg[0] > w.dmg[1]) errs.push(`${where}: dmg min > max`);
      if (w.ammo && !ammoTypes.has(w.ammo)) errs.push(`${where}: no ammo item of type ${w.ammo}`);
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
  }
  return errs;
}
