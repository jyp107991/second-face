import { Rng } from '../core/rng';
import type { Outfit } from '../assets/humanoid';
import type { GarmentLook } from '../assets/human/cloth';
import { GARMENTS, garmentsFor, type GarmentSlot, type GarmentStyle } from './garments';
import type { HairContext, Lifestyle } from './appearance';
import { GEAR_HIDES_HAIR, type GearKind, type GearLook } from '../assets/human/gear';

/**
 * Outfit roles: who someone is shows in what they wear. Each role weights garment styles, sets how often
 * optional pieces appear (hats, eyewear, masks, gloves, vests), the dye palette, and how dirty and worn
 * things are. Wealth reads at a glance: the Crown's silks are clean and saturated, the Sink's are patched,
 * faded and filthy.
 */
export type OutfitRole =
  | 'vault' | 'settler' | 'labourer' | 'trader' | 'raider' | 'guard' | 'medic' | 'pilgrim' | 'nomad' | 'fisher'
  | 'street' | 'gilded' | 'corp' | 'tech' | 'drifter';

export const OUTFIT_ROLES: OutfitRole[] = ['vault', 'settler', 'labourer', 'trader', 'raider', 'guard', 'medic', 'pilgrim', 'nomad', 'fisher', 'street', 'gilded', 'corp', 'tech', 'drifter'];

interface RoleDef {
  styles: Partial<Record<GarmentStyle, number>>;
  /** Chance of a one-piece outfit instead of top + legs. */
  full: number;
  chance: Partial<Record<'head' | 'eyes' | 'face' | 'hands' | 'over' | 'gear', number>>;
  palette: readonly number[];
  /** Chance each dyeable piece is re-dyed from the palette. */
  dye: number;
  grime: [number, number];
  wear: [number, number];
  life: Lifestyle;
  /** Chance of dyed hair. */
  hairDye?: number;
  /** Which hairstyles fit the role's world. */
  hair: HairContext;
  /** Procedural gear and the chance of each piece. */
  gear?: [GearKind, number][];
}

// Dye palettes (P4.14, docs/WARDROBE.md; the owner: clothes chosen for function still come in many colours). What the
// Reach can dye or salvage: indigo and sun-faded blues, madder and rust reds, ochre and mustard, olive and moss, copper
// teal, plum, bleached bone, charcoal; salvage that keeps its colour (faded safety orange, hi-vis yellow, hospital teal,
// signal red); and the megacity's synthetics (magenta, cyan, acid green, electric violet, amber). Grime and wear fade
// them on the body; nothing is grey by default.
const EARTH = [0x8a3b1e, 0x2f4a73, 0xb8862b, 0x5c6b2f, 0x7a2e2e, 0x2f6f6a, 0xc46a2a, 0xc9bda4, 0x2c2a28, 0x5a2d4f, 0x6f8fb0, 0x4a6a3a] as const;
const WORK = [0xc9a227, 0xc46a2a, 0x2f4a73, 0x5c6b2f, 0x8a3b1e, 0x3b4d5c, 0x6f8fb0, 0x2c2a28, 0xb8862b] as const;
const TRADE = [0x7a2e2e, 0x2f6f6a, 0xb8862b, 0x2f4a73, 0x5a2d4f, 0xc9bda4, 0x3f6b4a, 0xc46a2a, 0x1f3a5a] as const;
const VAULT = [0x35506e, 0x3f5a78, 0x8a8f94, 0x2b3a4a, 0xc9a227, 0x6f8fb0] as const;
const RAIDER = [0x1d1b19, 0x8a1c1c, 0xb8ab90, 0x8a3b1e, 0x4a4a3a, 0x5a2a1e, 0x7fb81f, 0x3a3328] as const;
const STREET = [0xd23a8c, 0x2fb9c4, 0x7fb81f, 0x6a3ad6, 0x15161c, 0xf2c94c, 0xe2572b, 0x2a2a30, 0x8a2a5a, 0x2a6a70] as const;
const GILDED = [0xefe6d2, 0xc9a24a, 0x1f5b4a, 0x6e1f2e, 0x101014, 0x2a2350, 0xf4f1ea, 0x8a1c3c, 0x3f7fbf, 0xb04a8a] as const;
const CORP = [0x2a2d33, 0xe8e8ea, 0x4a5563, 0x1b2a3a, 0x15171a, 0x2fb9c4, 0xd9a441] as const;
const TECH = [0x2a2d33, 0x2fb9c4, 0xe2572b, 0x3b4d5c, 0x7fb81f, 0xe8e8ea, 0x6a3ad6, 0x15171a] as const;
const FAITH = [0xe9e2cf, 0xb9c8d6, 0xd8cfb8, 0xf4f2ec, 0x9fb3c2, 0xc9b27a] as const;
const MEDIC = [0xe8e8e2, 0x3a8a86, 0x8fb8a8, 0x6d8f86, 0xd9dcd6, 0x9fb3c2] as const;
const WATER = [0x3a5560, 0x2c4048, 0xc46a2a, 0x5c6c64, 0xb8862b, 0x2f4a73, 0x6f8fb0] as const;
const NOMAD = [0x8a3b1e, 0xc98a3a, 0x3a5a6a, 0x6a4a7a, 0xb8a060, 0x2f6f6a, 0x7a2e2e] as const;

export const ROLES: Record<OutfitRole, RoleDef> = {
  vault: { styles: { vault: 5, work: 2, casual: 1 }, full: 0.45, chance: { eyes: 0.08, gear: 0.05 }, palette: VAULT, dye: 0.9, grime: [0.02, 0.15], wear: [0.15, 0.35], life: 'settled', hair: 'frontier', gear: [['satchel', 0.2]] },
  settler: { styles: { work: 3, casual: 3, rag: 2, cold: 1 }, full: 0.1, chance: { head: 0.35, eyes: 0.08, hands: 0.15, over: 0.2, gear: 0.25}, palette: EARTH, dye: 0.85, grime: [0.35, 0.7], wear: [0.45, 0.8], life: 'hard', hair: 'frontier', gear: [['satchel', 0.35], ['goggles_up', 0.15]] },
  labourer: { styles: { work: 5, rag: 1, military: 1 }, full: 0.3, chance: { head: 0.4, eyes: 0.2, hands: 0.55, over: 0.25, gear: 0.3}, palette: WORK, dye: 0.8, grime: [0.55, 0.9], wear: [0.5, 0.9], life: 'hard', hair: 'frontier', gear: [['harness', 0.4], ['goggles_up', 0.35], ['satchel', 0.3]] },
  trader: { styles: { casual: 3, work: 2, formal: 1, nomad: 1 }, full: 0.1, chance: { head: 0.45, eyes: 0.25, hands: 0.15, gear: 0.2, over: 0.2}, palette: TRADE, dye: 0.85, grime: [0.2, 0.45], wear: [0.3, 0.6], life: 'settled', hair: 'frontier', gear: [['satchel', 0.7], ['goggles_up', 0.2]] },
  raider: { styles: { raider: 6, military: 2, rag: 2, street: 1 }, full: 0.05, chance: { head: 0.45, eyes: 0.35, hands: 0.5, over: 0.5, gear: 0.6}, palette: RAIDER, dye: 0.75, grime: [0.55, 0.95], wear: [0.55, 0.95], life: 'hard', hair: 'frontier', gear: [['goggles_up', 0.4], ['harness', 0.5], ['armband', 0.3]] },
  guard: { styles: { military: 5, work: 2, corp: 1 }, full: 0.1, chance: { head: 0.55, eyes: 0.25, hands: 0.5, over: 0.7, gear: 0.5 }, palette: WORK, dye: 0.85, grime: [0.25, 0.55], wear: [0.3, 0.6], life: 'settled', hair: 'frontier', gear: [['harness', 0.7], ['goggles_up', 0.3], ['armband', 0.6]] },
  medic: { styles: { medical: 5, casual: 2, work: 1 }, full: 0.2, chance: { eyes: 0.4, hands: 0.4, gear: 0.6 }, palette: MEDIC, dye: 0.9, grime: [0.1, 0.3], wear: [0.25, 0.5], life: 'settled', hair: 'frontier', gear: [['satchel', 0.8], ['goggles_up', 0.2]] },
  pilgrim: { styles: { faith: 6, rag: 1, nomad: 1 }, full: 0.45, chance: { head: 0.3, gear: 0.1 }, palette: FAITH, dye: 0.95, grime: [0.15, 0.4], wear: [0.35, 0.65], life: 'settled', hair: 'frontier', gear: [] },
  nomad: { styles: { nomad: 5, sport: 2, raider: 1, work: 1 }, full: 0.3, chance: { head: 0.5, eyes: 0.6, hands: 0.45, over: 0.45, gear: 0.6}, palette: NOMAD, dye: 0.8, grime: [0.45, 0.85], wear: [0.5, 0.9], life: 'hard', hair: 'frontier', gear: [['poncho', 0.7], ['goggles_up', 0.5], ['satchel', 0.4]] },
  fisher: { styles: { water: 5, work: 2, cold: 2 }, full: 0.25, chance: { head: 0.55, hands: 0.25, over: 0.2, gear: 0.3}, palette: WATER, dye: 0.8, grime: [0.3, 0.6], wear: [0.45, 0.85], life: 'hard', hair: 'frontier', gear: [['poncho', 0.4], ['satchel', 0.3]] },
  street: { styles: { street: 6, casual: 2, sport: 2, raider: 1 }, full: 0.12, chance: { head: 0.3, eyes: 0.35, hands: 0.15, gear: 0.4, over: 0.35}, palette: STREET, dye: 0.9, grime: [0.15, 0.55], wear: [0.2, 0.6], life: 'settled', hairDye: 0.45, hair: 'street', gear: [['goggles_up', 0.35], ['harness', 0.25], ['satchel', 0.2], ['armband', 0.4]] },
  gilded: { styles: { rich: 6, formal: 3 }, full: 0.55, chance: { head: 0.15, eyes: 0.3, hands: 0.25 }, palette: GILDED, dye: 0.85, grime: [0, 0], wear: [0, 0.05], life: 'pampered', hairDye: 0.2, hair: 'rich', gear: [] },
  corp: { styles: { corp: 5, formal: 3, tech: 2, military: 1 }, full: 0.45, chance: { eyes: 0.35, gear: 0.3, head: 0.1, hands: 0.15, over: 0.2}, palette: CORP, dye: 0.9, grime: [0, 0.05], wear: [0, 0.1], life: 'soft', hair: 'rich', gear: [['harness', 0.1]] },
  tech: { styles: { tech: 5, work: 2, street: 1 }, full: 0.35, chance: { eyes: 0.6, gear: 0.5, hands: 0.3, over: 0.3}, palette: TECH, dye: 0.8, grime: [0.15, 0.45], wear: [0.25, 0.55], life: 'settled', hairDye: 0.15, hair: 'street', gear: [['goggles_up', 0.6], ['satchel', 0.6], ['harness', 0.3]] },
  drifter: { styles: { rag: 6, work: 1, cold: 1, raider: 1 }, full: 0.15, chance: { head: 0.35, hands: 0.2, eyes: 0.1, over: 0.3, gear: 0.3}, palette: EARTH, dye: 0.55, grime: [0.7, 1], wear: [0.75, 1], life: 'starved', hair: 'frontier', gear: [['poncho', 0.6], ['satchel', 0.3]] },
};

/** How a faction's people look: colours, a marker piece, and extra style weight. Keyed by faction id. */
export interface FactionLook {
  palette?: readonly number[];
  marker?: { gear: GearKind; color: number; chance?: number };
  styles?: Partial<Record<GarmentStyle, number>>;
  grime?: [number, number];
}

export const FACTION_LOOK: Record<string, FactionLook> = {
  rust_dogs: { palette: [0x8a1c1c, 0x1d1b19, 0x8a3b1e, 0xb8ab90, 0x7fb81f, 0x4a4a3a], marker: { gear: 'armband', color: 0xb8321e, chance: 0.7 }, styles: { raider: 4 } },
  dev_raiders: { palette: [0x8a1c1c, 0x1d1b19, 0x8a3b1e, 0xb8ab90], marker: { gear: 'armband', color: 0xb8321e, chance: 0.7 }, styles: { raider: 4 } },
  shale_militia: { marker: { gear: 'armband', color: 0x2f5f9a, chance: 0.9 }, styles: { work: 1, military: 1 } },
  tollmen: { palette: [0x1f5b4a, 0x3f6b4a, 0x2a2e30, 0xc9a24a, 0x7a2e2e, 0x2f4a73], styles: { formal: 2, work: 1, corp: 1 }, grime: [0.1, 0.35] },
  choir: { palette: FAITH_PALETTE(), marker: { gear: 'armband', color: 0xe9e2cf, chance: 0.5 }, styles: { faith: 4 } },
  wardens: { palette: [0x2b3a4a, 0x3d4247, 0x9aa0a6, 0x2a2e33, 0x2fb9c4], marker: { gear: 'armband', color: 0x9aa0a6, chance: 0.8 }, styles: { military: 4, corp: 2 }, grime: [0.05, 0.25] },
  tenured: { styles: { rich: 4 }, grime: [0, 0.02] },
  gilt: { palette: [0xc9a24a, 0xd23a8c, 0x15161c, 0x2fb9c4, 0xe8d8a0], marker: { gear: 'armband', color: 0xc9a24a, chance: 0.6 }, styles: { street: 3, rich: 2 } },
  saints: { palette: [0xd8d8d8, 0x5a5a5a, 0x6a3ad6, 0x15161c, 0xb9c8d6], marker: { gear: 'armband', color: 0x8a8a8a, chance: 0.5 }, styles: { rag: 2, street: 1 } },
  pale: { palette: [0xe8e2d8, 0xcfc8ba, 0xf4f1ea, 0xbdb5a5], marker: { gear: 'armband', color: 0xe8e2d8, chance: 0.7 }, styles: { rag: 2, faith: 1 } },
  rustmouths: { palette: [0xa0522d, 0xc46a2a, 0x2a2a2a, 0x7a5a3a, 0xb8862b], marker: { gear: 'armband', color: 0xa0522d, chance: 0.7 }, styles: { work: 3, raider: 1 } },
  the_shift: { palette: [0xd2691e, 0x2f4a73, 0x8a6a3a, 0xc9a227, 0x3a3a3a], marker: { gear: 'armband', color: 0xd2691e, chance: 0.7 }, styles: { work: 4 } },
  concern: { palette: [0xf2f2f0, 0x1b1b1f, 0x2a2a30, 0xd8d8d8], styles: { corp: 4 }, grime: [0, 0.04] },
  wheel: { palette: [0x8a3a2a, 0xc98a3a, 0x3a5a6a, 0x6a4a7a, 0xb8a060], marker: { gear: 'poncho', color: 0x8a3a2a, chance: 0.6 }, styles: { nomad: 4 } },
  menders: { styles: { medical: 3 } },
  cistern9: { palette: [0x35506e, 0x3f5a78, 0x8a8f94, 0x2b3a4a, 0xc9a227], styles: { vault: 5 }, grime: [0.02, 0.15] },
};

function FAITH_PALETTE(): readonly number[] { return [0xe9e2cf, 0xd8cfb8, 0xb9c8d6, 0xf4f2ec]; }

function pickGarment(r: Rng, slot: GarmentSlot, fit: 'm' | 'f', role: { styles: Partial<Record<GarmentStyle, number>> }, avoid: Set<string>): string | undefined {
  const opts = garmentsFor(slot, fit).filter((id) => !avoid.has(id))
    .map((id) => [id, GARMENTS[id].tags.reduce((t, s) => t + (role.styles[s] ?? 0), 0)] as const)
    .filter(([, w]) => w > 0);
  const total = opts.reduce((t, [, w]) => t + w * w, 0);
  if (!total) return undefined;
  // Squared weights: pieces that match several of the role's styles are strongly preferred.
  let x = r.next() * total;
  for (const [id, w] of opts) if ((x -= w * w) < 0) return id;
  return opts[opts.length - 1][0];
}

/** A plausible outfit for someone in a role (and faction, if any). Deterministic per seed. */
export function dressFor(seed: number, role: OutfitRole, fit: 'm' | 'f', faction?: string): Outfit {
  const r = new Rng(seed * 7919 + 17);
  const R = ROLES[role], F = faction ? FACTION_LOOK[faction] : undefined;
  const styles = { ...R.styles };
  for (const [k, v] of Object.entries(F?.styles ?? {})) styles[k as GarmentStyle] = (styles[k as GarmentStyle] ?? 0) + (v ?? 0);
  const palette = F?.palette ?? R.palette;
  const used = new Set<string>();
  const layers: GarmentLook[] = [];
  const add = (slot: GarmentSlot) => {
    const id = pickGarment(r, slot, fit, { styles }, used);
    if (!id) return false;
    used.add(id);
    const g: GarmentLook = { name: id };
    if (GARMENTS[id].dye && r.chance(R.dye)) g.dye = r.pick(palette);
    layers.push(g);
    return true;
  };
  if (!(r.chance(R.full) && add('full'))) { add('legs'); add('top'); }
  add('feet');
  for (const slot of ['over', 'head', 'eyes', 'face', 'hands', 'gear'] as const) if (r.chance(R.chance[slot] ?? 0)) add(slot);
  // Procedural gear: at most one piece per head region, and nothing a library piece already covers.
  const gear: GearLook[] = [];
  const hasHead = layers.some((g) => GARMENTS[g.name].slot === 'head'), hasEyes = layers.some((g) => GARMENTS[g.name].slot === 'eyes'), hasFace = layers.some((g) => GARMENTS[g.name].slot === 'face');
  const taken = new Set<string>();
  const place = (kind: GearKind, color?: number) => {
    const region = kind === 'headwrap' ? 'head' : kind === 'goggles' || kind === 'goggles_up' ? 'eyes' : kind === 'bandana' || kind === 'respirator' ? 'face' : kind;
    if (taken.has(region) || (region === 'head' && hasHead) || (region === 'eyes' && hasEyes) || (region === 'face' && hasFace)) return;
    if ((kind === 'plates' || kind === 'harness') && layers.some((g) => GARMENTS[g.name].slot === 'over')) return;
    taken.add(region);
    const cloth = kind === 'poncho' || kind === 'wrap' || kind === 'headwrap' || kind === 'bandana' || kind === 'armband';
    gear.push({ kind, color: color ?? (cloth ? r.pick(palette) : undefined) });
  };
  if (F?.marker && r.chance(F.marker.chance ?? 0.7)) place(F.marker.gear, F.marker.color);
  for (const [kind, chance] of R.gear ?? []) if (r.chance(chance)) place(kind);
  const grimeRange = F?.grime ?? R.grime;
  return { layers, gear, grime: r.range(...grimeRange), wear: r.range(...R.wear) };
}

/** Body lifestyle, hair world and dye chance that go with a role (for randomAppearance). */
export function roleLook(role: OutfitRole): { life: Lifestyle; dyeChance?: number; hair: HairContext } {
  return { life: ROLES[role].life, dyeChance: ROLES[role].hairDye, hair: ROLES[role].hair };
}

/** How the head piece of an outfit treats the hair: hidden, cropped to the hairline, or untouched. */
export function outfitHairMode(o: Outfit): 'hide' | 'crop' | undefined {
  let mode: 'hide' | 'crop' | undefined;
  if (o.gear?.some((g) => GEAR_HIDES_HAIR.includes(g.kind))) return 'hide';
  for (const g of o.layers ?? []) {
    const h = GARMENTS[g.name]?.hair;
    if (h === 'hide') return 'hide';
    if (h) mode = h;
  }
  return mode;
}
