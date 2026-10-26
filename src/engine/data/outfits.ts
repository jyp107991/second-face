import { Rng } from '../core/rng';
import type { Outfit } from '../assets/humanoid';
import type { GarmentLook } from '../assets/human/cloth';
import { GARMENTS, garmentsFor, type GarmentSlot, type GarmentStyle } from './garments';
import type { Lifestyle } from './appearance';

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
}

const EARTH = [0x6b5a43, 0x4f5a3a, 0x7a4a2c, 0x3d3a35, 0x8a7f6a, 0x5a4636, 0x6e6e66, 0x2f3a44] as const;
const VAULT = [0x35506e, 0x3f5a78, 0x8a8f94, 0x2b3a4a] as const;
const RAIDER = [0x1d1b19, 0x5a2a1e, 0x7a1f1a, 0xb8ab90, 0x3a3328, 0x4a4a3a] as const;
const STREET = [0xd23a8c, 0x2fb9c4, 0xd8d23a, 0x15161c, 0xeeeeee, 0x9b3fd1, 0xff6a2a, 0x2a2a30] as const;
const GILDED = [0xefe6d2, 0xc9a24a, 0x1f5b4a, 0x6e1f2e, 0x101014, 0x2a2350, 0xf4f1ea, 0x8a1c3c] as const;
const CORP = [0x2a2d33, 0xe8e8ea, 0x4a5563, 0x1b2a3a, 0x15171a] as const;
const FAITH = [0xe9e2cf, 0xb9c8d6, 0xd8cfb8, 0xf4f2ec, 0x9fb3c2] as const;
const MEDIC = [0xe8e8e2, 0x8fb8a8, 0x6d8f86, 0xd9dcd6] as const;
const WATER = [0x3a5560, 0x2c4048, 0x8a6a3a, 0x5c6c64, 0x6b5a43] as const;

export const ROLES: Record<OutfitRole, RoleDef> = {
  vault: { styles: { vault: 5, work: 2, casual: 1 }, full: 0.45, chance: { eyes: 0.08, gear: 0.05 }, palette: VAULT, dye: 0.9, grime: [0, 0.12], wear: [0.1, 0.3], life: 'settled' },
  settler: { styles: { work: 3, casual: 3, rag: 2, cold: 1 }, full: 0.1, chance: { head: 0.35, eyes: 0.08, hands: 0.15, face: 0.04 }, palette: EARTH, dye: 0.7, grime: [0.25, 0.6], wear: [0.35, 0.7], life: 'hard' },
  labourer: { styles: { work: 5, rag: 1, military: 1 }, full: 0.3, chance: { head: 0.4, eyes: 0.2, hands: 0.55, face: 0.12, over: 0.05 }, palette: EARTH, dye: 0.6, grime: [0.45, 0.85], wear: [0.4, 0.8], life: 'hard' },
  trader: { styles: { casual: 3, work: 2, formal: 1, nomad: 1 }, full: 0.1, chance: { head: 0.45, eyes: 0.25, hands: 0.15, gear: 0.05 }, palette: EARTH, dye: 0.7, grime: [0.15, 0.4], wear: [0.25, 0.55], life: 'settled' },
  raider: { styles: { raider: 6, military: 2, rag: 2, street: 1 }, full: 0.05, chance: { head: 0.45, eyes: 0.35, face: 0.4, hands: 0.5, over: 0.35 }, palette: RAIDER, dye: 0.6, grime: [0.5, 0.95], wear: [0.5, 0.9], life: 'hard' },
  guard: { styles: { military: 5, work: 2, corp: 1 }, full: 0.1, chance: { head: 0.55, eyes: 0.25, hands: 0.5, over: 0.7, face: 0.1, gear: 0.15 }, palette: EARTH, dye: 0.8, grime: [0.2, 0.5], wear: [0.25, 0.55], life: 'settled' },
  medic: { styles: { medical: 5, casual: 2, work: 1 }, full: 0.2, chance: { eyes: 0.4, face: 0.35, hands: 0.4, gear: 0.6 }, palette: MEDIC, dye: 0.9, grime: [0.05, 0.25], wear: [0.2, 0.45], life: 'settled' },
  pilgrim: { styles: { faith: 6, rag: 1, nomad: 1 }, full: 0.45, chance: { head: 0.3, gear: 0.1 }, palette: FAITH, dye: 0.95, grime: [0.1, 0.35], wear: [0.3, 0.6], life: 'settled' },
  nomad: { styles: { nomad: 5, sport: 2, raider: 1, work: 1 }, full: 0.3, chance: { head: 0.5, eyes: 0.6, face: 0.35, hands: 0.45, over: 0.15 }, palette: EARTH, dye: 0.6, grime: [0.4, 0.8], wear: [0.45, 0.85], life: 'hard' },
  fisher: { styles: { water: 5, work: 2, cold: 2 }, full: 0.25, chance: { head: 0.55, hands: 0.25 }, palette: WATER, dye: 0.7, grime: [0.2, 0.55], wear: [0.4, 0.8], life: 'hard' },
  street: { styles: { street: 6, casual: 2, sport: 2, raider: 1 }, full: 0.12, chance: { head: 0.3, eyes: 0.35, face: 0.15, hands: 0.15, gear: 0.1 }, palette: STREET, dye: 0.75, grime: [0.1, 0.5], wear: [0.15, 0.55], life: 'settled', hairDye: 0.45 },
  gilded: { styles: { rich: 6, formal: 3 }, full: 0.55, chance: { head: 0.15, eyes: 0.3, hands: 0.25, face: 0.06 }, palette: GILDED, dye: 0.85, grime: [0, 0], wear: [0, 0.05], life: 'pampered', hairDye: 0.2 },
  corp: { styles: { corp: 5, formal: 3, tech: 2, military: 1 }, full: 0.45, chance: { eyes: 0.35, gear: 0.3, head: 0.1, hands: 0.15 }, palette: CORP, dye: 0.9, grime: [0, 0.05], wear: [0, 0.1], life: 'soft' },
  tech: { styles: { tech: 5, work: 2, street: 1 }, full: 0.35, chance: { eyes: 0.6, gear: 0.4, hands: 0.3, face: 0.1 }, palette: CORP, dye: 0.6, grime: [0.1, 0.4], wear: [0.2, 0.5], life: 'settled', hairDye: 0.15 },
  drifter: { styles: { rag: 6, work: 1, cold: 1, raider: 1 }, full: 0.15, chance: { head: 0.35, face: 0.15, hands: 0.2, eyes: 0.1 }, palette: EARTH, dye: 0.3, grime: [0.65, 1], wear: [0.7, 1], life: 'starved' },
};

function pickGarment(r: Rng, slot: GarmentSlot, fit: 'm' | 'f', role: RoleDef, avoid: Set<string>): string | undefined {
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

/** A plausible outfit for someone in a role. Deterministic per seed. */
export function dressFor(seed: number, role: OutfitRole, fit: 'm' | 'f'): Outfit {
  const r = new Rng(seed * 7919 + 17);
  const R = ROLES[role];
  const used = new Set<string>();
  const layers: GarmentLook[] = [];
  const add = (slot: GarmentSlot) => {
    const id = pickGarment(r, slot, fit, R, used);
    if (!id) return false;
    used.add(id);
    const g: GarmentLook = { name: id };
    if (GARMENTS[id].dye && r.chance(R.dye)) g.dye = r.pick(R.palette);
    layers.push(g);
    return true;
  };
  if (!(r.chance(R.full) && add('full'))) { add('legs'); add('top'); }
  add('feet');
  for (const slot of ['over', 'head', 'eyes', 'face', 'hands', 'gear'] as const) if (r.chance(R.chance[slot] ?? 0)) add(slot);
  return { layers, grime: r.range(...R.grime), wear: r.range(...R.wear) };
}

/** Body lifestyle and hair dye chance that go with a role (for randomAppearance). */
export function roleLook(role: OutfitRole): { life: Lifestyle; dyeChance?: number } {
  return { life: ROLES[role].life, dyeChance: ROLES[role].hairDye };
}

/** How the head piece of an outfit treats the hair: hidden, cropped to the hairline, or untouched. */
export function outfitHairMode(o: Outfit): 'hide' | 'crop' | undefined {
  let mode: 'hide' | 'crop' | undefined;
  for (const g of o.layers ?? []) {
    const h = GARMENTS[g.name]?.hair;
    if (h === 'hide') return 'hide';
    if (h) mode = h;
  }
  return mode;
}
