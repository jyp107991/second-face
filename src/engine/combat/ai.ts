import { countItem } from '../inventory/inventory';
import { derived } from '../stats/sheet';
import { reachable, type Encounter, type Unit } from './encounter';
import { canAttack, chebyshev, hitChance, isMelee, reloadAp, weaponOf } from './rules';

/**
 * Utility AI: every step, score all candidate actions and take the best.
 * Pure scoring (`chooseAction`) is separated from execution so it can be unit-tested.
 */

export type AiAction =
  | { kind: 'attack'; target: Unit; score: number; burst?: boolean }
  | { kind: 'move'; to: { x: number; y: number }; path: { x: number; y: number }[]; score: number; why: string }
  | { kind: 'reload'; score: number }
  | { kind: 'heal'; score: number }
  | { kind: 'flee'; to?: { x: number; y: number }; path?: { x: number; y: number }[]; score: number }
  | { kind: 'surrender'; score: number }
  | { kind: 'wait'; score: number };

const HEAL_ITEM = 'c_knitkit';

function avgDamage(u: Unit): number {
  const w = weaponOf(u.c).def;
  return (w.dmg[0] + w.dmg[1]) / 2;
}

/** Score of standing at (x,y): offence (best hit chance) + defence (cover vs nearest foe). */
function positionScore(enc: Encounter, u: Unit, x: number, y: number, foes: Unit[], apLeft: number): { score: number; why: string } {
  const ox = u.c.x, oy = u.c.y;
  u.c.x = x; u.c.y = y;
  const w = weaponOf(u.c).def;
  const atkAp = enc.preview(u, foes[0]).ap;
  let best = 0;
  for (const f of foes) {
    const melee = isMelee(w);
    const dist = chebyshev(x, y, f.c.x, f.c.y);
    if (melee) {
      best = Math.max(best, dist <= w.range && apLeft >= atkAp ? 60 : 40 - dist * 4);
    } else if (enc.host.grid.lineOfSight(x, y, f.c.x, f.c.y)) {
      const ch = hitChance(u.c, f.c, enc.attackOpts(u, f));
      best = Math.max(best, ch * (apLeft >= atkAp ? 0.8 : 0.4));
    }
  }
  // Defence: cover against each foe that can see this tile.
  let defence = 0;
  for (const f of foes) {
    const cov = enc.coverBetween(f.c, u.c);
    defence += cov === 'full' ? 18 : cov === 'half' ? 9 : enc.host.grid.lineOfSight(f.c.x, f.c.y, x, y) ? -4 : 6;
  }
  u.c.x = ox; u.c.y = oy;
  return { score: best + defence / Math.max(1, foes.length), why: best > 0 ? 'attack position' : 'cover' };
}

export function chooseAction(enc: Encounter, u: Unit): AiAction {
  const foes = enc.enemiesOf(u);
  if (!foes.length) return { kind: 'wait', score: 0 };
  const s = u.c.sheet;
  const maxHp = derived(s).maxHp;
  const hpFrac = s.hp / maxHp;
  const actions: AiAction[] = [{ kind: 'wait', score: 1 }];

  // Break and run, or give up.
  if (u.c.morale < 10 && hpFrac < 0.35) actions.push({ kind: 'surrender', score: 120 });
  if (u.c.morale < 20) {
    const tiles = reachable(enc.host.grid, u.c.x, u.c.y, u.c.ap, u.c.id);
    let bestT: { x: number; y: number } | undefined, bestD = -Infinity;
    for (const t of tiles) {
      const minD = Math.min(...foes.map((f) => chebyshev(t.x, t.y, f.c.x, f.c.y)));
      const hidden = foes.every((f) => !enc.host.grid.lineOfSight(f.c.x, f.c.y, t.x, t.y)) ? 6 : 0;
      if (minD + hidden > bestD) { bestD = minD + hidden; bestT = t; }
    }
    const path = bestT ? enc.host.grid.findPath(u.c.x, u.c.y, bestT.x, bestT.y, { ignore: u.c.id }) ?? undefined : undefined;
    actions.push({ kind: 'flee', to: bestT, path, score: 100 });
  }

  // Patch up.
  if (hpFrac < 0.4 && countItem(u.c.inv, HEAL_ITEM) > 0 && u.c.ap >= 2) actions.push({ kind: 'heal', score: 55 + (1 - hpFrac) * 40 });

  // Reload when empty (or nearly, between fights).
  const it = u.c.inv.equipped[u.c.inv.active];
  const wd = weaponOf(u.c).def;
  if (wd.magazine && it && (it.loaded ?? 0) === 0 && u.c.ap >= reloadAp(u.c)) {
    const spare = u.c.inv.items.some((i) => i.def.startsWith('a_') && i.qty > 0);
    if (spare) actions.push({ kind: 'reload', score: 50 });
  }

  // Attacks.
  if (canAttack(u.c).ok) {
    for (const f of foes) {
      const pv = enc.preview(u, f);
      if (!pv.ok) continue;
      const exp = (pv.chance / 100) * avgDamage(u);
      const killBonus = f.c.sheet.hp <= avgDamage(u) ? 25 : 0;
      const playerBias = f.c.isPlayer ? 3 : 0;
      actions.push({ kind: 'attack', target: f, score: 20 + exp * 3 + killBonus + playerBias + (pv.chance < 12 ? -25 : 0) });
      if (wd.burst) {
        const pb = enc.preview(u, f, { burst: true });
        if (pb.ok) actions.push({ kind: 'attack', target: f, burst: true, score: 18 + (pb.chance / 100) * avgDamage(u) * wd.burst.rounds * 0.7 + killBonus });
      }
    }
  }

  // Reposition: best reachable tile vs current tile.
  if (u.c.ap > 0) {
    const here = positionScore(enc, u, u.c.x, u.c.y, foes, u.c.ap).score;
    const tiles = reachable(enc.host.grid, u.c.x, u.c.y, u.c.ap, u.c.id);
    // Melee units without anything in reach should close distance even beyond one turn.
    let best: { x: number; y: number; score: number; why: string } | undefined;
    for (const t of tiles.slice(0, 220)) {
      const cost = Math.max(Math.abs(t.x - u.c.x), Math.abs(t.y - u.c.y));
      const ps = positionScore(enc, u, t.x, t.y, foes, u.c.ap - cost);
      const sc = ps.score - cost * 1.5;
      if (!best || sc > best.score) best = { ...t, score: sc, why: ps.why };
    }
    if (isMelee(wd) && (!best || best.score - here < 5)) {
      const target = foes.sort((a, b) => chebyshev(u.c.x, u.c.y, a.c.x, a.c.y) - chebyshev(u.c.x, u.c.y, b.c.x, b.c.y))[0];
      const path = enc.host.grid.findPath(u.c.x, u.c.y, target.c.x, target.c.y, { ignore: u.c.id, adjacentOk: true });
      if (path && path.length) actions.push({ kind: 'move', to: path[Math.min(path.length, u.c.ap) - 1], path: path.slice(0, u.c.ap), score: 30, why: 'close in' });
    } else if (best && best.score - here > 4) {
      const path = enc.host.grid.findPath(u.c.x, u.c.y, best.x, best.y, { ignore: u.c.id });
      if (path) actions.push({ kind: 'move', to: best, path, score: 10 + (best.score - here), why: best.why });
    }
  }
  return actions.sort((a, b) => b.score - a.score)[0];
}

export async function utilityAi(enc: Encounter, u: Unit): Promise<void> {
  for (let guard = 0; guard < 10 && enc.active && u.c.ap > 0 && enc.alive(u) && !u.fled; guard++) {
    const a = chooseAction(enc, u);
    const apBefore = u.c.ap;
    switch (a.kind) {
      case 'wait': return;
      case 'attack': if (!(await enc.attack(u, a.target, { burst: a.burst }))) return; break;
      case 'reload': if (!enc.reloadUnit(u)) return; break;
      case 'heal': if (!enc.useItem(u, HEAL_ITEM)) return; break;
      case 'move': await enc.moveUnit(u, a.path); break;
      case 'surrender':
        u.fled = true;
        u.surrendered = true;
        enc.emit('log', { text: `${u.c.name} throws down their weapon and surrenders!` });
        return;
      case 'flee':
        if (a.path?.length) await enc.moveUnit(u, a.path);
        if (enc.enemiesOf(u).every((f) => !enc.host.grid.lineOfSight(f.c.x, f.c.y, u.c.x, u.c.y) || chebyshev(f.c.x, f.c.y, u.c.x, u.c.y) > 12)) {
          u.fled = true;
          enc.emit('log', { text: `${u.c.name} flees!` });
        } else enc.emit('log', { text: `${u.c.name} is trying to run.` });
        return;
    }
    if (u.c.ap === apBefore) return; // nothing changed — avoid spinning
  }
}
