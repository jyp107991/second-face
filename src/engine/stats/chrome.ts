import type { CharacterSheet, Modifier } from './sheet';

/**
 * Chrome: rare cybernetic implants (DESIGN §2c.1). One piece per slot; each grants superhuman verbs
 * (ability flags checked by systems) and/or modifiers, adds to Drift, may need upkeep, and is installed by a
 * surgeon with a real chance of rejection. Pure rules: content supplies the catalogue (registerChrome).
 */

export const CHROME_SLOTS = ['eyes', 'neural', 'armL', 'armR', 'legs', 'spine', 'skin', 'organs'] as const;
export type ChromeSlot = (typeof CHROME_SLOTS)[number];

/** old: salvaged pre-Burn (uneven); dark: Mender-built (crude, unnetworked); concern: new, excellent, networked. */
export type ChromeGrade = 'old' | 'dark' | 'concern';

export interface ChromeDef {
  id: string;
  name: string;
  desc: string;
  slot: ChromeSlot;
  grade: ChromeGrade;
  /** Drift load this piece adds (before the wearer's Grit). */
  drift: number;
  /** Street price in Tolls (installation extra). */
  price: number;
  mods?: Modifier[];
  /** Ability flags (verbs) systems check with hasFlag, e.g. 'chrome_heat_vision'. */
  abilities?: string[];
  /** Visible on the body (recognised, feared, judged). Hidden chrome costs more. */
  visible: boolean;
  /** Consumable it needs every N days or it degrades. */
  upkeep?: { item: string; everyDays: number };
  surgery: { hours: number; /** Medicine skill at which the operation carries only the base risk. */ difficulty: number };
  /** Talks to Concern systems (convenient, and a leash). */
  networked?: boolean;
}

export interface InstalledChrome {
  id: string;
  /** 1 = perfect; below WORKING it stops working; degrades when upkeep is missed. */
  condition: number;
  installedDay: number;
  /** Day the next upkeep is due. */
  upkeepDue?: number;
}

/** Condition below which a piece stops working (abilities and mods off). */
export const CHROME_WORKING = 0.4;

let catalogue: Record<string, ChromeDef> = {};
export function registerChrome(defs: Record<string, ChromeDef>): void { catalogue = defs; }
export function chromeDef(id: string): ChromeDef | undefined { return catalogue[id]; }
export function chromeCatalogue(): Record<string, ChromeDef> { return catalogue; }

/** Installed pieces with their definitions. */
export function installedChrome(s: CharacterSheet): { slot: ChromeSlot; piece: InstalledChrome; def: ChromeDef }[] {
  const out: { slot: ChromeSlot; piece: InstalledChrome; def: ChromeDef }[] = [];
  for (const slot of CHROME_SLOTS) {
    const piece = s.chrome?.[slot];
    const def = piece && catalogue[piece.id];
    if (piece && def) out.push({ slot, piece, def });
  }
  return out;
}

/** Modifiers and abilities of working chrome (used by allMods / hasFlag). */
export function chromeMods(s: CharacterSheet): Modifier[] {
  return installedChrome(s).filter((c) => c.piece.condition >= CHROME_WORKING).flatMap((c) => c.def.mods ?? []);
}

export function chromeAbilities(s: CharacterSheet): string[] {
  return installedChrome(s).filter((c) => c.piece.condition >= CHROME_WORKING).flatMap((c) => c.def.abilities ?? []);
}

// --------------------------------------------------------------------------------------------
// Drift
// --------------------------------------------------------------------------------------------

/** Grade multipliers: old chrome is unpredictable, Concern chrome is smooth (until it isn't). */
const GRADE_DRIFT: Record<ChromeGrade, number> = { old: 1.15, dark: 1.25, concern: 0.8 };

/**
 * The Drift a body settles towards with its chrome: the sum of its pieces, eased by Grit (each point above 5
 * takes 4% off; below 5 adds it). Current Drift moves towards this baseline over days.
 */
export function driftBaseline(s: CharacterSheet, grit: number): number {
  const load = installedChrome(s).reduce((t, c) => t + c.def.drift * GRADE_DRIFT[c.def.grade], 0);
  return Math.max(0, Math.min(100, Math.round(load * (1 - 0.04 * (grit - 5)))));
}

export type DriftBand = 'steady' | 'cool' | 'cold' | 'drifting';

/** steady <25 · cool 25–49 (cold-logic options appear) · cold 50–74 (empathy options fade) · drifting 75+ (episodes). */
export function driftBand(drift: number): DriftBand {
  return drift >= 75 ? 'drifting' : drift >= 50 ? 'cold' : drift >= 25 ? 'cool' : 'steady';
}

/**
 * One day passes: current Drift moves a third of the way to the baseline (rest and companions' bonds pull it
 * down by `calm` points). Returns the new value.
 */
export function settleDrift(s: CharacterSheet, grit: number, calm = 0): number {
  const base = driftBaseline(s, grit);
  const cur = s.drift ?? 0;
  const next = cur + (base - cur) / 3 - calm;
  s.drift = Math.max(0, Math.min(100, Math.round(next * 10) / 10));
  return s.drift;
}

/** Chance (0..1) per tense moment of a Drift episode at the current Drift. */
export function episodeChance(drift: number): number {
  return drift < 75 ? 0 : Math.min(0.5, 0.05 + (drift - 75) * 0.018);
}

// --------------------------------------------------------------------------------------------
// Surgery & upkeep
// --------------------------------------------------------------------------------------------

export type SurgeryOutcome = 'clean' | 'complication' | 'rejected';

/**
 * Risk of the operation: base 5%, +1% per point the surgeon's Medicine falls short of the piece's difficulty,
 * old chrome +8%, each point of the patient's Grit above 5 −1.5%. Clamped to 3–65%.
 */
export function surgeryRisk(def: ChromeDef, surgeonMedicine: number, patientGrit: number): number {
  const r = 0.05 + Math.max(0, def.surgery.difficulty - surgeonMedicine) / 100 + (def.grade === 'old' ? 0.08 : 0) - (patientGrit - 5) * 0.015;
  return Math.max(0.03, Math.min(0.65, r));
}

/**
 * Install a piece (replacing whatever is in its slot). `roll` is 0..1 (from the game's RNG): under half the risk
 * the body rejects it (not installed); under the risk it goes in with a complication (condition 0.6).
 */
export function installChrome(s: CharacterSheet, id: string, day: number, surgeonMedicine: number, patientGrit: number, roll: number): SurgeryOutcome {
  const def = catalogue[id];
  if (!def) throw new Error(`Unknown chrome ${id}`);
  const risk = surgeryRisk(def, surgeonMedicine, patientGrit);
  if (roll < risk / 2) return 'rejected';
  const outcome: SurgeryOutcome = roll < risk ? 'complication' : 'clean';
  (s.chrome ??= {})[def.slot] = {
    id, condition: outcome === 'clean' ? 1 : 0.6, installedDay: day,
    upkeepDue: def.upkeep ? day + def.upkeep.everyDays : undefined,
  };
  return outcome;
}

export function removeChrome(s: CharacterSheet, slot: ChromeSlot): InstalledChrome | undefined {
  const p = s.chrome?.[slot];
  if (p) delete s.chrome![slot];
  return p;
}

/**
 * Daily upkeep: each piece whose upkeep is due tries to consume its item (`consume` returns false when the
 * wearer has none); without it the piece loses 0.1 condition per day overdue. Returns the slots that went
 * without.
 */
export function tickChromeUpkeep(s: CharacterSheet, day: number, consume: (item: string) => boolean): ChromeSlot[] {
  const missed: ChromeSlot[] = [];
  for (const { slot, piece, def } of installedChrome(s)) {
    if (!def.upkeep || piece.upkeepDue === undefined || day < piece.upkeepDue) continue;
    if (consume(def.upkeep.item)) piece.upkeepDue = day + def.upkeep.everyDays;
    else {
      piece.condition = Math.max(0, Math.round((piece.condition - 0.1) * 100) / 100);
      missed.push(slot);
    }
  }
  return missed;
}

/** Repair at a Mender or clinic: restores condition by `amount` (0..1). */
export function repairChrome(s: CharacterSheet, slot: ChromeSlot, amount: number): void {
  const p = s.chrome?.[slot];
  if (p) p.condition = Math.min(1, p.condition + amount);
}

/** Visible working-or-not chrome (how people read you). */
export function visibleChrome(s: CharacterSheet): ChromeDef[] {
  return installedChrome(s).filter((c) => c.def.visible).map((c) => c.def);
}
