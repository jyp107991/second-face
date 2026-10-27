import * as THREE from 'three';
import { EventBus } from '../core/events';
import { Rng } from '../core/rng';
import type { Cover } from '../data/types';
import { reload, useConsumable } from '../inventory/inventory';
import type { Actor } from '../scene/actor';
import type { Grid } from '../scene/grid';
import { addXp, derived, hasFlag, type BodyPart } from '../stats/sheet';
import {
  attackAp, canAttack, chebyshev, hitChance, isMelee, itemAp, killXp, maxAp, moraleEvent, reloadAp, resolveAttack, swapAp,
  turnOrder, weaponOf, type AttackOpts, type CombatContext, type Combatant,
} from './rules';

export interface Unit {
  c: Combatant;
  actor: Actor;
  /** Hostile to the player's team. */
  hostile: boolean;
  fled?: boolean;
  surrendered?: boolean;
  leader?: boolean;
}

export type EncounterEvents = {
  start: { units: Unit[] };
  turn: { unit: Unit; round: number };
  changed: Record<string, never>;
  log: { text: string };
  end: { outcome: 'victory' | 'fled' | 'defeat' | 'truce'; xp: number };
};

export interface EncounterHost {
  grid: Grid;
  rng: Rng;
  fx: import('../render/fx').Fx;
  shake(amount: number): void;
  /** The player has been hit: show it. */
  hurt?(): void;
  context(x: number, y: number): CombatContext;
  /** Show a path preview (null clears). */
  previewPath(path: { x: number; y: number }[] | null, affordable: number): void;
  showReach(tiles: { x: number; y: number }[] | null): void;
  now(): number;
  /** Positional sound effect. */
  sound(id: import('../audio/audio').SfxId, at?: THREE.Vector3): void;
}

/** Animation pacing; the settings' combat speed divides every pause. */
export const pacing = { speed: 1, enemy: { hitMod: 0, dmgMul: 1 } };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms / pacing.speed));

/**
 * Turn-based combat over the live scene. The player acts through methods called by the HUD/input;
 * other units act through `aiTurn` (simple version here; full utility AI in combat/ai.ts).
 */
export class Encounter extends EventBus<EncounterEvents> {
  active = false;
  units: Unit[] = [];
  order: Unit[] = [];
  round = 0;
  current?: Unit;
  /** True while an action animates (input locked). */
  busy = false;
  target?: Unit;
  private turnDone?: () => void;
  private pendingMove?: { x: number; y: number };
  private xpEarned = 0;
  /** Pluggable AI; defaults to the simple approach-and-attack behaviour. */
  ai: (enc: Encounter, u: Unit) => Promise<void> = simpleAi;

  constructor(readonly host: EncounterHost) { super(); }

  get player(): Unit | undefined { return this.units.find((u) => u.c.isPlayer); }
  get isPlayerTurn(): boolean { return this.active && !!this.current?.c.isPlayer && !this.busy; }

  alive(u: Unit): boolean { return u.c.sheet.hp > 0; }
  enemiesOf(u: Unit): Unit[] {
    return this.units.filter((o) => this.alive(o) && !o.fled && (u.hostile ? !o.hostile : o.hostile));
  }

  start(units: Unit[]): void {
    if (this.active) return;
    this.active = true;
    this.units = units;
    this.round = 1;
    this.xpEarned = 0;
    for (const u of units) { u.c.x = u.actor.tx; u.c.y = u.actor.ty; u.actor.stop(); }
    this.order = turnOrder(this.host.rng, units.map((u) => u.c)).map((c) => units.find((u) => u.c === c)!);
    this.emit('start', { units });
    this.log('Combat!');
    void this.loop();
  }

  private log(text: string): void { this.emit('log', { text }); }

  private async loop(): Promise<void> {
    let idx = 0;
    while (this.active) {
      const u = this.order[idx % this.order.length];
      idx++;
      if (idx % this.order.length === 0) this.round++;
      if (!this.alive(u) || u.fled) continue;
      this.current = u;
      u.c.ap = maxAp(u.c);
      u.c.evasion = 0;
      if (u.c.stunned) {
        u.c.stunned = false;
        this.log(`${u.c.name} is stunned and loses the turn.`);
        await wait(400);
        continue;
      }
      this.emit('turn', { unit: u, round: this.round });
      if (u.c.isPlayer) {
        this.showReach();
        await new Promise<void>((r) => (this.turnDone = r));
        this.host.showReach(null);
        this.host.previewPath(null, 0);
      } else {
        await this.ai(this, u);
        await wait(250);
      }
      // Unused AP becomes evasion until the unit's next turn.
      u.c.evasion = Math.min(10, u.c.ap * 2);
      if (this.checkEnd()) break;
    }
  }

  private checkEnd(): boolean {
    const p = this.player;
    if (!p || !this.alive(p)) { this.finish('defeat'); return true; }
    const hostiles = this.units.filter((u) => u.hostile && this.alive(u) && !u.fled);
    if (!hostiles.length) {
      const anyFled = this.units.some((u) => u.hostile && u.fled && this.alive(u));
      this.finish(anyFled ? 'fled' : 'victory');
      return true;
    }
    return false;
  }

  private finish(outcome: 'victory' | 'fled' | 'defeat' | 'truce'): void {
    this.active = false;
    this.current = undefined;
    this.target = undefined;
    this.host.showReach(null);
    this.host.previewPath(null, 0);
    const p = this.player;
    if (p && outcome !== 'defeat' && this.xpEarned) {
      const levels = addXp(p.c.sheet, this.xpEarned);
      this.log(`+${this.xpEarned} XP${levels ? ' — LEVEL UP!' : ''}`);
      if (levels) this.host.sound('levelup');
    }
    this.emit('end', { outcome, xp: this.xpEarned });
  }

  /** Leave combat by ending it (all hostiles out of sight / talked down). */
  endTruce(): void { if (this.active) { this.finish('truce'); this.turnDone?.(); } }

  // --- Player actions ---------------------------------------------------------------------------

  endTurn(): void {
    if (!this.isPlayerTurn) return;
    const done = this.turnDone;
    this.turnDone = undefined;
    done?.();
  }

  private showReach(): void {
    const p = this.player;
    if (!p) return;
    this.host.showReach(reachable(this.host.grid, p.c.x, p.c.y, p.c.ap, p.c.id));
  }

  /** Tap on a tile during the player's turn: select target or move (tap again to confirm on touch). */
  tapTile(x: number, y: number, immediate = false): void {
    if (!this.isPlayerTurn) return;
    const p = this.player!;
    const hit = this.units.find((u) => u.c.x === x && u.c.y === y && this.alive(u) && u !== p);
    if (hit) {
      this.target = hit;
      this.pendingMove = undefined;
      this.host.previewPath(null, 0);
      this.emit('changed', {});
      return;
    }
    const path = this.host.grid.findPath(p.c.x, p.c.y, x, y, { ignore: p.c.id });
    if (!path || !path.length) return;
    const same = this.pendingMove && this.pendingMove.x === x && this.pendingMove.y === y;
    if (!same && !immediate) {
      this.pendingMove = { x, y };
      this.host.previewPath(path, p.c.ap);
      return;
    }
    this.pendingMove = undefined;
    void this.moveUnit(p, path.slice(0, p.c.ap));
  }

  hoverTile(x: number, y: number): void {
    if (!this.isPlayerTurn) return;
    const p = this.player!;
    if (this.units.some((u) => u.c.x === x && u.c.y === y && u !== p)) { this.host.previewPath(null, 0); return; }
    const path = this.host.grid.findPath(p.c.x, p.c.y, x, y, { ignore: p.c.id });
    this.pendingMove = path ? { x, y } : undefined;
    this.host.previewPath(path, p.c.ap);
  }

  async moveUnit(u: Unit, path: { x: number; y: number }[]): Promise<void> {
    if (!path.length || u.c.ap <= 0) return;
    this.busy = true;
    this.host.previewPath(null, 0);
    this.host.showReach(null);
    const steps = path.slice(0, u.c.ap);
    let moved = 0;
    const prev = u.actor.onArriveTile;
    u.actor.onArriveTile = (x, y) => { moved++; u.c.x = x; u.c.y = y; prev?.(x, y); };
    await u.actor.walk(steps);
    u.actor.onArriveTile = prev;
    u.c.x = u.actor.tx; u.c.y = u.actor.ty;
    u.c.ap = Math.max(0, u.c.ap - moved);
    this.busy = false;
    if (u.c.isPlayer) this.showReach();
    this.emit('changed', {});
  }

  /** Cover the defender has against the attacker (tile adjacent to the defender, toward the attacker). */
  coverBetween(att: Combatant, def: Combatant): Cover {
    const dx = Math.sign(att.x - def.x), dy = Math.sign(att.y - def.y);
    const g = this.host.grid;
    let best: Cover = 'none';
    for (const [cx, cy] of [[def.x + dx, def.y + dy], [def.x + dx, def.y], [def.x, def.y + dy]]) {
      if (cx === def.x && cy === def.y) continue;
      if (cx === att.x && cy === att.y) continue;
      const t = g.get(cx, cy);
      if (!t) continue;
      if (t.cover === 'full') return chebyshev(att.x, att.y, def.x, def.y) > 1 ? 'full' : 'half';
      if (t.cover === 'half') best = 'half';
    }
    return best;
  }

  attackOpts(att: Unit, def: Unit, extra: { aimed?: BodyPart | 'weapon'; burst?: boolean } = {}): AttackOpts {
    const diff = att.hostile ? pacing.enemy : { hitMod: 0, dmgMul: 1 };
    return { ...extra, ...diff, cover: isMelee(weaponOf(att.c).def) ? 'none' : this.coverBetween(att.c, def.c), ctx: this.host.context(def.c.x, def.c.y) };
  }

  /** Whether `att` could attack `def` right now and at what odds/cost. */
  preview(att: Unit, def: Unit, extra: { aimed?: BodyPart | 'weapon'; burst?: boolean } = {}): { ok: boolean; reason?: string; chance: number; ap: number } {
    const w = weaponOf(att.c).def;
    const ap = attackAp(att.c, { aimed: !!extra.aimed, burst: extra.burst });
    const ca = canAttack(att.c, extra.burst);
    if (!ca.ok) return { ok: false, reason: ca.reason, chance: 0, ap };
    const dist = chebyshev(att.c.x, att.c.y, def.c.x, def.c.y);
    if (isMelee(w) && dist > w.range) return { ok: false, reason: 'Out of reach', chance: 0, ap };
    if (!isMelee(w) && !this.host.grid.lineOfSight(att.c.x, att.c.y, def.c.x, def.c.y)) return { ok: false, reason: 'No line of sight', chance: 0, ap };
    if (att.c.ap < ap) return { ok: false, reason: `Needs ${ap} AP`, chance: hitChance(att.c, def.c, this.attackOpts(att, def, extra)), ap };
    return { ok: true, chance: hitChance(att.c, def.c, this.attackOpts(att, def, extra)), ap };
  }

  async attack(att: Unit, def: Unit, extra: { aimed?: BodyPart | 'weapon'; burst?: boolean } = {}): Promise<boolean> {
    const pv = this.preview(att, def, extra);
    if (!pv.ok) { if (att.c.isPlayer) this.log(pv.reason ?? 'Cannot attack'); return false; }
    this.busy = true;
    att.c.ap -= pv.ap;
    const w = weaponOf(att.c).def;
    const ao = att.actor.object.position, dp = def.actor.object.position;
    att.actor.faceTowards(dp.x, dp.z);
    att.actor.body.aim = 1;
    await wait(220);
    const res = resolveAttack(this.host.rng, att.c, def.c, this.attackOpts(att, def, extra));
    const from = new THREE.Vector3(ao.x, 1.25, ao.z);
    const to = new THREE.Vector3(dp.x, 1.1, dp.z);
    const dir = to.clone().sub(from).normalize();
    const shots = Math.max(1, res.roundsFired);
    for (let i = 0; i < shots; i++) {
      const h = res.hits[i];
      this.host.sound(w.kind === 'unarmed' ? 'unarmed' : w.kind, from);
      if (h?.hit) this.host.sound('impact', to);
      else if (!isMelee(w)) this.host.sound('miss', to);
      if (h?.hit && def.c.isPlayer) { this.host.sound('hurt', to); this.host.hurt?.(); }
      if (!isMelee(w)) {
        this.host.fx.muzzle(from.clone().addScaledVector(dir, 0.5), dir);
        const miss = !h?.hit;
        const end = miss ? to.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.3), (Math.random() - 0.5) * 1.5)) : to;
        if (w.dmgType !== 'fire') this.host.fx.tracer(from, end, w.dmgType === 'energy' ? 0x90ffd0 : 0xffe0a0);
        if (miss) this.host.fx.impact(end.setY(Math.max(0.05, end.y - 0.8)), 'dust');
        this.host.shake(0.15);
      }
      if (h?.hit) {
        this.host.fx.impact(to, 'blood', dir);
        def.actor.body.flinch = 1;
        this.host.fx.floatText(to.clone().setY(2.1), `${h.damage}${h.crit ? '!' : ''}`, h.crit ? '#ff7050' : '#ffd070');
      }
      await wait(burstDelay(w.kind, shots));
    }
    if (res.hits.every((h) => !h.hit) && res.roundsFired > 0) this.host.fx.floatText(to.clone().setY(2.1), 'miss', '#c0c0c0');
    // Explosives and fire splash around the impact point (a miss scatters to a neighbouring tile).
    const splashKilled: Unit[] = [];
    if (w.area && (w.dmgType === 'explosive' || w.dmgType === 'fire')) {
      const hitT = res.hits.some((h) => h.hit);
      const cx = def.c.x + (hitT ? 0 : this.host.rng.int(-1, 1)), cy = def.c.y + (hitT ? 0 : this.host.rng.int(-1, 1));
      this.host.fx.explosion(new THREE.Vector3(cx + 0.5, 0.3, cy + 0.5), w.area);
      this.host.sound('explosion', new THREE.Vector3(cx + 0.5, 0.3, cy + 0.5));
      this.host.shake(w.dmgType === 'explosive' ? 0.6 : 0.3);
      for (const o of this.units) {
        if (!this.alive(o) || (o === def && hitT)) continue;
        const d = chebyshev(o.c.x, o.c.y, cx, cy);
        if (d > w.area) continue;
        const dr = derived(o.c.sheet).dr;
        const dmg = Math.max(1, Math.round(this.host.rng.int(w.dmg[0], w.dmg[1]) * (d === 0 ? 1 : 0.5) * (1 - dr / 100)));
        o.c.sheet.hp = Math.max(0, o.c.sheet.hp - dmg);
        o.actor.body.flinch = 1;
        this.host.fx.floatText(o.actor.object.position.clone().setY(2.1), `${dmg}`, '#ff9050');
        this.log(`${o.c.name} is caught in the blast (${dmg}).`);
        if (o.c.sheet.hp <= 0) splashKilled.push(o);
      }
    }
    for (const m of res.messages) this.log(m);
    for (const h of res.hits) if (h.crippled) this.log(`${def.c.name}'s ${partName(h.crippled)} is crippled!`);
    att.actor.body.aim = 0;
    if (res.damage > 0) {
      const hpFrac = def.c.sheet.hp / derived(def.c.sheet).maxHp;
      moraleEvent(def.c, hpFrac < 0.3 ? 'badly_hurt' : 'hurt', hasFlag(att.c.sheet, 'terrifying'));
    }
    if (res.killed) await this.onKilled(def, att);
    for (const k of splashKilled) if (k !== def || !res.killed) await this.onKilled(k, att);
    this.busy = false;
    if (att.c.isPlayer) this.showReach();
    this.emit('changed', {});
    return true;
  }

  private async onKilled(dead: Unit, killer: Unit): Promise<void> {
    dead.actor.kill();
    if (killer.c.isPlayer || !killer.hostile) this.xpEarned += killXp(dead.c);
    moraleEvent(killer.c, 'scored_kill');
    for (const u of this.units) {
      if (u === dead || !this.alive(u) || u.hostile !== dead.hostile) continue;
      moraleEvent(u.c, dead.leader ? 'leader_down' : 'ally_down');
    }
    if (this.target === dead) this.target = undefined;
    await wait(300);
  }

  reloadUnit(u: Unit): boolean {
    const ap = reloadAp(u.c);
    if (u.c.ap < ap) return false;
    const n = reload(u.c.inv);
    if (!n) { if (u.c.isPlayer) this.log('No ammo to load.'); return false; }
    u.c.ap -= ap;
    this.host.sound('reload', u.actor.object.position);
    this.log(`${u.c.name} reloads.`);
    this.emit('changed', {});
    return true;
  }

  swapWeapon(u: Unit): boolean {
    const ap = swapAp(u.c);
    if (u.c.ap < ap) return false;
    u.c.inv.active = u.c.inv.active === 'primary' ? 'secondary' : 'primary';
    u.c.ap -= ap;
    this.emit('changed', {});
    return true;
  }

  useItem(u: Unit, itemId: string): boolean {
    const idx = u.c.inv.items.findIndex((i) => i.def === itemId);
    if (idx < 0) return false;
    const ap = itemAp(u.c.inv.items[idx]);
    if (u.c.ap < ap) { if (u.c.isPlayer) this.log(`Needs ${ap} AP`); return false; }
    const r = useConsumable(u.c.inv, idx, u.c.sheet, this.host.now(), () => this.host.rng.next());
    if (!r.ok) return false;
    u.c.ap -= ap;
    if (r.healed) this.host.fx.floatText(u.actor.object.position.clone().setY(2.1), `+${r.healed}`, '#80ffa0');
    this.log(`${u.c.name}: ${r.message}`);
    this.emit('changed', {});
    return true;
  }
}

function burstDelay(kind: string, shots: number): number {
  if (shots > 1) return 90;
  return kind === 'melee' || kind === 'unarmed' ? 260 : 200;
}

export function partName(p: BodyPart): string {
  return { head: 'head', eyes: 'eyes', torso: 'torso', armL: 'left arm', armR: 'right arm', legL: 'left leg', legR: 'right leg', groin: 'groin' }[p];
}

/** Tiles reachable with the given AP (Dijkstra over the grid). */
export function reachable(grid: Grid, sx: number, sy: number, ap: number, ignore: string): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const best = new Map<number, number>([[grid.index(sx, sy), 0]]);
  const q: [number, number, number][] = [[sx, sy, 0]];
  while (q.length) {
    q.sort((a, b) => a[2] - b[2]);
    const [x, y, c] = q.shift()!;
    if (c > 0) out.push({ x, y });
    if (c >= ap) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!grid.passable(nx, ny, ignore)) continue;
      if (dx && dy && (!grid.passable(x + dx, y, ignore) || !grid.passable(x, y + dy, ignore))) continue;
      const i = grid.index(nx, ny);
      if ((best.get(i) ?? Infinity) <= c + 1) continue;
      best.set(i, c + 1);
      q.push([nx, ny, c + 1]);
    }
  }
  return out;
}

// --- Simple AI (replaced by utility AI in combat/ai.ts) ------------------------------------------

export async function simpleAi(enc: Encounter, u: Unit): Promise<void> {
  for (let guard = 0; guard < 12 && enc.active && u.c.ap > 0; guard++) {
    const foes = enc.enemiesOf(u);
    if (!foes.length) return;
    const target = foes.sort((a, b) => chebyshev(u.c.x, u.c.y, a.c.x, a.c.y) - chebyshev(u.c.x, u.c.y, b.c.x, b.c.y))[0];
    const w = weaponOf(u.c).def;
    if (w.magazine && (u.c.inv.equipped[u.c.inv.active]?.loaded ?? 0) === 0) {
      if (enc.reloadUnit(u)) continue;
      if (enc.swapWeapon(u)) continue;
    }
    const pv = enc.preview(u, target);
    if (pv.ok && pv.chance >= 15) { await enc.attack(u, target); continue; }
    if (pv.ap > u.c.ap && pv.reason?.startsWith('Needs')) return;
    const path = enc.host.grid.findPath(u.c.x, u.c.y, target.c.x, target.c.y, { ignore: u.c.id, adjacentOk: true });
    if (!path || !path.length) return;
    const reachMelee = isMelee(w) ? path.length : Math.max(1, path.length - Math.min(path.length - 1, 4));
    const steps = Math.min(u.c.ap, reachMelee);
    if (steps <= 0) return;
    await enc.moveUnit(u, path.slice(0, steps));
  }
}
