import type { Rng } from '../core/rng';
import { activeWeapon, countItem, wear, type Inventory, type ItemInst } from '../inventory/inventory';
import { itemDef, type WeaponDef } from '../inventory/items';
import type { Cover } from '../data/types';
import { attr, derived, hasFlag, modSum, modValue, allMods, skill, type BodyPart, type CharacterSheet } from '../stats/sheet';

/** Anything that fights. Player, companions and NPCs all share the character sheet model. */
export interface Combatant {
  id: string;
  name: string;
  team: string;
  sheet: CharacterSheet;
  inv: Inventory;
  x: number;
  y: number;
  ap: number;
  /** 0..100. Breaks below ~20 (flee), surrenders below ~10 if able. */
  morale: number;
  /** Evasion bonus from AP left unspent last turn. */
  evasion: number;
  /** Loses the next turn (groin/head criticals). */
  stunned?: boolean;
  /** Natural attack when unarmed (creatures). */
  natural?: WeaponDef;
  isPlayer?: boolean;
  /** Personality courage 0..100 (NPCs) — affects morale. */
  courage?: number;
}

export interface CombatContext {
  indoor: boolean;
  night: boolean;
  /** 0 (lit) .. 1 (pitch dark) at the target's tile. */
  darkness: number;
}

export const FIST: WeaponDef = { skill: 'melee', kind: 'unarmed', hands: 1, dmg: [1, 4], dmgType: 'blunt', ap: 3, range: 1, durability: 0 };

export const AIM_PENALTY: Record<BodyPart, number> = { torso: 0, head: 40, eyes: 60, armL: 30, armR: 30, legL: 20, legR: 20, groin: 30 };
export const AIM_CRIT: Record<BodyPart, number> = { torso: 0, head: 15, eyes: 30, armL: 5, armR: 5, legL: 5, legR: 5, groin: 15 };
/** Aimed at the weapon (perk: jam shot). */
export const AIM_WEAPON_PENALTY = 50;

export function weaponOf(c: Combatant): { def: WeaponDef; item?: ItemInst } {
  const it = activeWeapon(c.inv);
  if (it) {
    const w = itemDef(it.def).weapon;
    if (w) return { def: w, item: it };
  }
  return { def: c.natural ?? FIST };
}

export function isMelee(w: WeaponDef): boolean {
  return w.kind === 'melee' || w.kind === 'unarmed';
}

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// --- AP -----------------------------------------------------------------------------------------

export function maxAp(c: Combatant): number {
  let ap = derived(c.sheet).ap;
  if (hasFlag(c.sheet, 'last_stand') && c.sheet.hp < derived(c.sheet).maxHp * 0.25) ap += 2;
  return Math.max(1, ap);
}

export function attackAp(c: Combatant, opts: { aimed?: boolean; burst?: boolean } = {}): number {
  const w = weaponOf(c).def;
  let ap = opts.burst && w.burst ? w.burst.ap : w.ap;
  if (opts.aimed) ap += 1;
  if (w.kind === 'pistol' && hasFlag(c.sheet, 'gunslinger')) ap -= 1;
  return Math.max(1, ap);
}

export function reloadAp(c: Combatant): number {
  return hasFlag(c.sheet, 'quick_draw') ? 1 : 2;
}

export function swapAp(c: Combatant): number {
  return hasFlag(c.sheet, 'quick_draw') ? 0 : 1;
}

export function itemAp(it: ItemInst): number {
  return itemDef(it.def).consumable?.ap ?? 2;
}

/** Whether the weapon can fire now (ammo loaded, not broken). */
export function canAttack(c: Combatant, burst = false): { ok: boolean; reason?: string } {
  const { def, item } = weaponOf(c);
  if (item && item.cond !== undefined && item.cond <= 0) return { ok: false, reason: 'Weapon is broken' };
  if (def.magazine && (item?.loaded ?? 0) < 1) return { ok: false, reason: burst ? 'Out of ammo' : 'Out of ammo — reload' };
  if (def.minBrawn && attr(c.sheet, 'brawn') < def.minBrawn - 2) return { ok: false, reason: 'Too heavy to use' };
  return { ok: true };
}

// --- Hit chance ---------------------------------------------------------------------------------

export interface AttackOpts {
  aimed?: BodyPart | 'weapon';
  burst?: boolean;
  cover?: Cover;
  ctx?: CombatContext;
}

export function hitChance(att: Combatant, def: Combatant, opts: AttackOpts = {}): number {
  const w = weaponOf(att).def;
  const s = att.sheet;
  const dist = chebyshev(att.x, att.y, def.x, def.y);
  const melee = isMelee(w);
  if (melee && dist > w.range) return 0;
  let chance = skill(s, w.skill);
  if (melee) chance += modSum(s, 'hit_melee');
  else {
    chance += modSum(s, 'hit_ranged');
    const sight = derived(s).sightRange;
    chance -= Math.max(0, dist - sight) * 4;
    chance -= Math.max(0, dist - w.range) * 8;
    const cov = opts.cover ?? 'none';
    chance -= cov === 'full' ? 40 : cov === 'half' ? 20 : 0;
    if (w.kind === 'shotgun' && dist <= 3) chance += 10;
  }
  // Defender evasion
  chance -= attr(def.sheet, 'reflex') + def.evasion;
  // Strength requirement
  if (w.minBrawn) chance -= Math.max(0, w.minBrawn - attr(s, 'brawn')) * 15;
  // Aimed shots
  if (opts.aimed === 'weapon') chance -= AIM_WEAPON_PENALTY;
  else if (opts.aimed) chance -= AIM_PENALTY[opts.aimed];
  if (opts.burst) chance -= 10;
  // Darkness (lamp halves the penalty; good senses reduce it)
  const ctx = opts.ctx;
  if (ctx && ctx.darkness > 0) {
    let pen = 25 * ctx.darkness - attr(s, 'senses');
    if (countItem(att.inv, 't_lamp') > 0) pen *= 0.5;
    chance -= Math.max(0, pen);
  }
  // Trait / perk context
  if (hasFlag(s, 'one_hand')) chance += w.hands === 1 ? 15 : -40;
  if (hasFlag(s, 'hesitant') && def.morale < 20) chance -= 10;
  if (ctx && hasFlag(s, 'cistern_pale')) chance += ctx.indoor ? 10 : !ctx.night ? -5 : 0;
  if (hasFlag(s, 'last_stand') && s.hp < derived(s).maxHp * 0.25) chance += 10;
  if (s.crippled.eyes) chance -= 15;
  return Math.round(Math.max(5, Math.min(95, chance)));
}

export function critChance(att: Combatant, opts: AttackOpts = {}): number {
  let c = derived(att.sheet).crit;
  if (opts.aimed && opts.aimed !== 'weapon') {
    c += AIM_CRIT[opts.aimed];
    if (hasFlag(att.sheet, 'aimed_crit')) c += 5 * (att.sheet.perks.sniper_eye ?? 1);
  }
  return Math.max(0, Math.min(90, c));
}

// --- Resolution ---------------------------------------------------------------------------------

export interface HitResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  part: BodyPart;
  crippled?: BodyPart;
  killed: boolean;
  stunned?: boolean;
  bypassedArmour?: boolean;
}

export interface AttackResult {
  hits: HitResult[];
  /** Total damage dealt. */
  damage: number;
  killed: boolean;
  jammed?: boolean;
  /** Critical failure: something went wrong for the attacker. */
  fumble?: 'drop' | 'hurt_self' | 'jam';
  weaponBroke?: boolean;
  roundsFired: number;
  messages: string[];
}

const RANDOM_PARTS: BodyPart[] = ['torso', 'torso', 'torso', 'torso', 'armL', 'armR', 'legL', 'legR', 'head'];

/** Resolve an attack and apply damage/effects to the defender's sheet. Mutates both combatants. */
export function resolveAttack(rng: Rng, att: Combatant, def: Combatant, opts: AttackOpts = {}): AttackResult {
  const { def: w, item } = weaponOf(att);
  const res: AttackResult = { hits: [], damage: 0, killed: false, roundsFired: 0, messages: [] };
  const burst = !!(opts.burst && w.burst);
  let rounds = burst ? w.burst!.rounds : 1;
  if (w.magazine && item) rounds = Math.min(rounds, item.loaded ?? 0);
  if (rounds <= 0) { res.messages.push('Click. Empty.'); return res; }

  // Jam check for worn weapons
  if (item && item.cond !== undefined && item.cond < 0.3 && rng.chance((0.3 - item.cond) * 0.5)) {
    res.jammed = true;
    res.messages.push(`${att.name}'s weapon jams.`);
    return res;
  }

  const chance = hitChance(att, def, opts);
  const crit = critChance(att, opts);
  for (let r = 0; r < rounds && def.sheet.hp > 0; r++) {
    const roll = rng.next() * 100;
    if (roll >= chance) {
      res.hits.push({ hit: false, crit: false, damage: 0, part: 'torso', killed: false });
      // Critical failure: rolls in the top band scaled by Fortune.
      if (r === 0 && !burst && roll >= 100 - Math.max(1, 6 - attr(att.sheet, 'fortune') / 2)) {
        res.fumble = isMelee(w) ? (rng.chance(0.5) ? 'drop' : 'hurt_self') : rng.chance(0.6) ? 'jam' : 'drop';
      }
      continue;
    }
    const isCrit = roll < chance * (crit / 100);
    const part: BodyPart = opts.aimed && opts.aimed !== 'weapon' ? opts.aimed : rng.pick(RANDOM_PARTS);
    const h = applyHit(rng, att, def, w, item, part, isCrit, opts.aimed === 'weapon');
    res.hits.push(h);
    res.damage += h.damage;
    if (h.killed) res.killed = true;
  }
  res.roundsFired = rounds;
  if (w.magazine && item) item.loaded = Math.max(0, (item.loaded ?? 0) - rounds);
  // Thrown weapons are used up.
  if (w.consumable && item) {
    item.qty -= 1;
    if (item.qty <= 0) delete att.inv.equipped[att.inv.active];
  }
  if (item && w.durability > 1 && wear(item, rounds)) {
    res.weaponBroke = true;
    res.messages.push(`${att.name}'s ${itemDef(item.def).name} breaks.`);
  }
  if (res.fumble === 'hurt_self') {
    const d = rng.int(1, 4);
    att.sheet.hp = Math.max(1, att.sheet.hp - d);
    res.messages.push(`${att.name} fumbles and is hurt (${d}).`);
  } else if (res.fumble === 'drop') res.messages.push(`${att.name} fumbles the weapon.`);
  else if (res.fumble === 'jam') { res.jammed = true; res.messages.push(`${att.name}'s weapon jams.`); }

  const hitsN = res.hits.filter((x) => x.hit).length;
  if (hitsN === 0) res.messages.push(`${att.name} misses ${def.name}.`);
  else res.messages.push(`${att.name} hits ${def.name}${hitsN > 1 ? ` ${hitsN} times` : ''} for ${res.damage}${res.hits.some((x) => x.crit) ? ' (critical!)' : ''}.`);
  if (res.killed) res.messages.push(`${def.name} is killed.`);
  return res;
}

function applyHit(rng: Rng, att: Combatant, def: Combatant, w: WeaponDef, item: ItemInst | undefined, part: BodyPart, isCrit: boolean, atWeapon: boolean): HitResult {
  const as = att.sheet, ds = def.sheet;
  const mods = allMods(as);
  let dmg = rng.int(w.dmg[0], w.dmg[1]);
  const ammo = item?.loadedAmmo ? itemDef(item.loadedAmmo).ammo : undefined;
  if (isMelee(w)) {
    dmg += Math.max(0, attr(as, 'brawn') - 5);
    dmg = modValue(mods, 'dmg_melee', dmg);
  } else {
    dmg = modValue(mods, 'dmg_ranged', dmg);
    if (ammo) dmg *= ammo.dmgMult;
  }
  const dd = derived(ds);
  let dt = Math.max(0, dd.dt - (ammo?.dtPen ?? 0));
  let dr = Math.max(0, Math.min(90, dd.dr + (ammo?.drMod ?? 0)));
  if (hasFlag(ds, 'cover_dt')) dt += 3;
  let bypassedArmour = false;
  let stunned = false;
  let crippled: BodyPart | undefined;
  if (isCrit) {
    dmg *= (w.critMult ?? 1.5) * modValue(mods, 'crit_dmg', 1);
    switch (part) {
      case 'torso': if (rng.chance(0.5)) { dt = 0; dr = Math.floor(dr / 2); bypassedArmour = true; } break;
      case 'head': if (rng.chance(0.5)) stunned = true; break;
      case 'groin': stunned = true; break;
      case 'eyes': crippled = 'eyes'; break;
      default: crippled = part;
    }
  }
  let final = Math.max(0, Math.round((dmg - dt) * (1 - dr / 100)));
  if (isCrit) final = Math.max(1, final);
  // Non-critical crippling: big hits to aimed limbs.
  if (!crippled && part !== 'torso' && part !== 'head' && part !== 'groin') {
    const thresh = dd.maxHp * (isMelee(w) && hasFlag(as, 'easy_cripple_melee') ? 0.12 : 0.25);
    if (final >= thresh) crippled = part;
  }
  if (atWeapon) {
    // Jam shot: damage goes to the weapon instead.
    const target = activeWeapon(def.inv);
    if (target && hasFlag(as, 'jam_shot')) wear(target, final * 4);
    final = Math.round(final * 0.3);
  }
  ds.hp -= final;
  if (crippled) ds.crippled[crippled] = true;
  if (stunned) def.stunned = true;
  const killed = ds.hp <= 0;
  if (killed) ds.hp = 0;
  return { hit: true, crit: isCrit, damage: final, part, crippled, killed, stunned, bypassedArmour };
}

// --- Turn order & morale ------------------------------------------------------------------------

export function turnOrder(rng: Rng, cs: Combatant[]): Combatant[] {
  return cs
    .map((c) => ({ c, k: derived(c.sheet).initiative + rng.next() * 3 + (c.isPlayer ? 0.5 : 0) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.c);
}

export type MoraleEvent = 'ally_down' | 'leader_down' | 'hurt' | 'badly_hurt' | 'scored_kill' | 'enemy_fled' | 'outnumbered';

export function moraleEvent(c: Combatant, e: MoraleEvent, attackerTerrifying = false): void {
  const brave = (c.courage ?? 50) / 100;
  const delta: Record<MoraleEvent, number> = { ally_down: -20, leader_down: -35, hurt: -8, badly_hurt: -20, scored_kill: 10, enemy_fled: 8, outnumbered: -10 };
  let d = delta[e];
  if (d < 0) d *= 1.4 - brave * 0.8;
  if (d < 0 && attackerTerrifying) d *= 1.5;
  c.morale = Math.max(0, Math.min(100, c.morale + d));
}

export function initialMorale(courage = 50): number {
  return Math.round(40 + courage * 0.5);
}

export const XP_PER_KILL_BASE = 10;
/** Kill XP is deliberately small (DESIGN §3.6): scaled by victim level. */
export function killXp(victim: Combatant): number {
  return XP_PER_KILL_BASE * Math.max(1, victim.sheet.level);
}
