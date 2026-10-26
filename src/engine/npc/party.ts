import type { Grid } from '../scene/grid';
import type { CharacterSheet } from '../stats/sheet';
import { derived } from '../stats/sheet';
import type { Inventory } from '../inventory/inventory';

/**
 * Companions in the scene (DESIGN §7.4): they follow at a short distance, fight on the player's side,
 * go down instead of dying in combat (there is no permanent-death mode), and keep their sheet and pack
 * between maps. Pure helpers here; the Game wires them to actors and the encounter.
 */

export interface CompanionSave {
  sheet: CharacterSheet;
  inv: Inventory;
  /** Where a dismissed companion waits (location + tile) until asked to rejoin. */
  waitingAt?: { location: string; x: number; y: number };
}

/** Nearest free walkable tile to (x, y), searching rings outward (radius ≤ 6). */
export function freeTileNear(grid: Grid, x: number, y: number, ignore?: string, maxR = 6): { x: number; y: number } | undefined {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = x + dx, ty = y + dy;
        if (grid.inBounds(tx, ty) && grid.passable(tx, ty, ignore)) return { x: tx, y: ty };
      }
    }
  }
  return undefined;
}

/** Follow when further than `slack` tiles (a little further while the leader is still walking). */
export function shouldFollow(dist: number, leaderMoving: boolean, slack = 2): boolean {
  return dist > slack + (leaderMoving ? 1 : 0);
}

/**
 * Path for a companion toward a tile adjacent to the leader. Prefers the tile behind the leader's heading
 * so companions trail rather than crowd; falls back to any adjacent tile.
 */
export function followPath(grid: Grid, c: { id: string; x: number; y: number }, leader: { x: number; y: number; facing: number }): { x: number; y: number }[] | null {
  const bx = leader.x - Math.round(Math.sin(leader.facing)), by = leader.y - Math.round(Math.cos(leader.facing));
  if (grid.inBounds(bx, by) && grid.passable(bx, by, c.id) && !(bx === c.x && by === c.y)) {
    const p = grid.findPath(c.x, c.y, bx, by, { ignore: c.id, maxCost: 40 });
    if (p) return p;
  }
  return grid.findPath(c.x, c.y, leader.x, leader.y, { ignore: c.id, adjacentOk: true, maxCost: 40 });
}

/** After a fight, a companion at 0 HP gets up wounded rather than dying. Returns true if they were down. */
export function reviveDowned(s: CharacterSheet, now: number): boolean {
  if (s.hp > 0) return false;
  s.hp = Math.max(1, Math.round(derived(s).maxHp * 0.1));
  s.effects = s.effects.filter((e) => e.id !== 'downed');
  s.effects.push({ id: 'downed', name: 'Wounded', mods: [{ target: 'attr:grit', add: -1 }, { target: 'attr:reflex', add: -1 }], until: now + 24 * 60 });
  return true;
}
