import type { MapDef } from './types';
import { Grid } from '../scene/grid';

export interface ContentBundle {
  maps: Record<string, MapDef>;
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
  return errs;
}
