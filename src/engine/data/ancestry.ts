import type { EyeColor } from './appearance';

/**
 * Ancestry presets: realistic clusters of face shape (MakeHuman ethnic macro blend), skin tone and
 * undertone, eye and hair colour, and hair texture. Random NPCs mostly come from one preset, some
 * from a mix of two. The creator offers them as starting points; every value stays editable.
 */

export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily';

export interface AncestryPreset {
  id: string;
  label: string;
  /** MakeHuman ethnic macro blend (normalised at use). */
  shape: { african: number; asian: number; caucasian: number };
  /** Skin tone range on the 0..1 ladder (see SKIN_LADDER). */
  tone: [number, number];
  /** Undertone range: -1 rosy/cool .. 0 neutral .. +1 golden/olive. */
  undertone: [number, number];
  eyes: [EyeColor, number][];
  /** Natural hair colours (hex) with weights. */
  hair: [number, number][];
  texture: [HairTexture, number][];
  freckleChance: number;
  /** Share of the general population (relative). */
  weight: number;
}

const BLACK = 0x120e0b, DARK = 0x2b1d14, BROWN = 0x46301f, MID = 0x6a4a30, LIGHT = 0x8f6c45, DIRTY = 0xb8935f;
const BLOND = 0xd9c18e, AUBURN = 0x7a3418, RED = 0xa65126;

export const ANCESTRIES: AncestryPreset[] = [
  {
    id: 'west_african', label: 'West / Central African', shape: { african: 0.95, asian: 0, caucasian: 0.05 },
    tone: [0.72, 1], undertone: [-0.2, 0.5], eyes: [['brown', 9], ['brownlight', 1]],
    hair: [[BLACK, 7], [DARK, 3]], texture: [['coily', 10]], freckleChance: 0.02, weight: 14,
  },
  {
    id: 'east_african', label: 'East African', shape: { african: 0.7, asian: 0, caucasian: 0.3 },
    tone: [0.66, 0.92], undertone: [0, 0.6], eyes: [['brown', 9], ['brownlight', 1]],
    hair: [[BLACK, 7], [DARK, 3]], texture: [['coily', 10]], freckleChance: 0.02, weight: 5,
  },
  {
    id: 'north_european', label: 'Northern European', shape: { african: 0, asian: 0, caucasian: 1 },
    tone: [0, 0.22], undertone: [-0.8, 0.1],
    eyes: [['blue', 4], ['lightblue', 2], ['grey', 2], ['green', 2], ['bluegreen', 2], ['brownlight', 2], ['brown', 2]],
    hair: [[BLOND, 3], [DIRTY, 3], [LIGHT, 3], [MID, 3], [BROWN, 2], [AUBURN, 1], [RED, 1]],
    texture: [['straight', 6], ['wavy', 4]], freckleChance: 0.3, weight: 14,
  },
  {
    id: 'mediterranean', label: 'Mediterranean / Middle Eastern', shape: { african: 0.08, asian: 0.04, caucasian: 0.88 },
    tone: [0.25, 0.5], undertone: [0.2, 0.9], eyes: [['brown', 7], ['brownlight', 2], ['green', 1], ['bluegreen', 1]],
    hair: [[BLACK, 4], [DARK, 5], [BROWN, 3]], texture: [['wavy', 5], ['curly', 3], ['straight', 2]], freckleChance: 0.05, weight: 12,
  },
  {
    id: 'south_asian', label: 'South Asian', shape: { african: 0.15, asian: 0.18, caucasian: 0.67 },
    tone: [0.42, 0.78], undertone: [0.2, 0.8], eyes: [['brown', 9], ['brownlight', 1]],
    hair: [[BLACK, 7], [DARK, 3]], texture: [['straight', 4], ['wavy', 5], ['curly', 1]], freckleChance: 0.02, weight: 11,
  },
  {
    id: 'east_asian', label: 'East Asian', shape: { african: 0, asian: 0.95, caucasian: 0.05 },
    tone: [0.12, 0.38], undertone: [0.3, 0.9], eyes: [['brown', 8], ['brownlight', 2]],
    hair: [[BLACK, 7], [DARK, 3]], texture: [['straight', 9], ['wavy', 1]], freckleChance: 0.03, weight: 12,
  },
  {
    id: 'southeast_asian', label: 'Southeast Asian / Pacific', shape: { african: 0.1, asian: 0.75, caucasian: 0.15 },
    tone: [0.35, 0.65], undertone: [0.3, 0.9], eyes: [['brown', 9], ['brownlight', 1]],
    hair: [[BLACK, 7], [DARK, 3]], texture: [['straight', 6], ['wavy', 3], ['curly', 1]], freckleChance: 0.02, weight: 7,
  },
  {
    id: 'indigenous_american', label: 'Indigenous American', shape: { african: 0.03, asian: 0.6, caucasian: 0.37 },
    tone: [0.35, 0.62], undertone: [0.1, 0.7], eyes: [['brown', 9], ['brownlight', 1]],
    hair: [[BLACK, 8], [DARK, 2]], texture: [['straight', 9], ['wavy', 1]], freckleChance: 0.02, weight: 7,
  },
  {
    id: 'latin_american', label: 'Latin American (mestizo)', shape: { african: 0.12, asian: 0.3, caucasian: 0.58 },
    tone: [0.28, 0.6], undertone: [0.1, 0.8], eyes: [['brown', 8], ['brownlight', 2], ['green', 1]],
    hair: [[BLACK, 5], [DARK, 4], [BROWN, 2]], texture: [['straight', 4], ['wavy', 5], ['curly', 1]], freckleChance: 0.04, weight: 12,
  },
];

export function ancestry(id: string): AncestryPreset | undefined {
  return ANCESTRIES.find((a) => a.id === id);
}

/**
 * Skin albedo ladder (sRGB), fair → very deep, calibrated against measured skin reflectance and the
 * Monk Skin Tone scale. Tone 0..1 interpolates along it.
 */
export const SKIN_LADDER: [number, number, number][] = [
  [232, 194, 172], [222, 180, 153], [210, 166, 136], [200, 156, 122], [182, 136, 100],
  [160, 114, 80], [134, 92, 62], [108, 72, 50], [82, 55, 40], [58, 40, 31],
];

/** Target skin albedo (sRGB 0..255) for a tone and undertone. */
export function skinAlbedo(tone: number, undertone = 0): [number, number, number] {
  const t = Math.max(0, Math.min(1, tone)) * (SKIN_LADDER.length - 1);
  const i = Math.min(SKIN_LADDER.length - 2, Math.floor(t)), f = t - i;
  const c = SKIN_LADDER[i].map((v, k) => v + (SKIN_LADDER[i + 1][k] - v) * f) as [number, number, number];
  const u = Math.max(-1, Math.min(1, undertone));
  // Golden/olive: more yellow (less blue, a touch less red). Rosy: more red, less green.
  const m = u >= 0 ? [1 + 0.01 * u, 1 + 0.005 * u, 1 - 0.07 * u] : [1 - 0.035 * u, 1 + 0.03 * u, 1 + 0.015 * u];
  return [c[0] * m[0], c[1] * m[1], c[2] * m[2]];
}

/** Swatch colours for the creator (hex), one per ladder step, neutral undertone. */
export function skinSwatches(): number[] {
  return SKIN_LADDER.map((_, i) => {
    const [r, g, b] = skinAlbedo(i / (SKIN_LADDER.length - 1));
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  });
}

export function weighted<T>(next: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = next() * total;
  for (const [v, w] of items) if ((x -= w) < 0) return v;
  return items[items.length - 1][0];
}
