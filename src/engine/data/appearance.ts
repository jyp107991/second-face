import { Rng } from '../core/rng';
import { defaultShape, type ShapeParams } from '../assets/human/shape';

/**
 * A character's look: body/face shape (MakeHuman-compatible), skin, eyes, hair and painted marks.
 * Facial hair, freckles, scars and tattoos are painted into the per-character skin texture.
 */

export const HAIR_STYLES = ['none', 'short01', 'short02', 'short03', 'short04', 'bob01', 'bob02', 'long01', 'ponytail01', 'braid01', 'afro01'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const BROW_STYLES = ['eyebrow001', 'eyebrow002', 'eyebrow003', 'eyebrow004', 'eyebrow005', 'eyebrow006', 'eyebrow007', 'eyebrow008', 'eyebrow009', 'eyebrow010', 'eyebrow011', 'eyebrow012'] as const;
export type BrowStyle = (typeof BROW_STYLES)[number];

export const EYE_COLORS = ['brown', 'brownlight', 'green', 'bluegreen', 'blue', 'lightblue', 'deepblue', 'grey', 'ice'] as const;
export type EyeColor = (typeof EYE_COLORS)[number];

export const FACIAL_HAIR = ['none', 'stubble', 'moustache', 'goatee', 'short_beard', 'full_beard', 'chops'] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];

export const SCARS = ['brow_cut', 'cheek_slash', 'lip_split', 'eye_scar', 'burn_left', 'burn_right', 'forehead_x', 'chin_nick'] as const;
export type ScarId = (typeof SCARS)[number];

export const TATTOOS = ['nine_neck', 'tear', 'chin_lines', 'brow_dots', 'cheek_tribal', 'temple_spiral', 'cheek_cross', 'jaw_stripes', 'forehead_star', 'eye_band'] as const;
export type TattooId = (typeof TATTOOS)[number];

export const HAIR_COLORS = [0x120e0b, 0x2b1d14, 0x46301f, 0x6a4a30, 0x8f6c45, 0xb8935f, 0xd9c18e, 0x7a3418, 0xa65126, 0x8a8782, 0xd2d0c8] as const;

export interface Appearance {
  shape: ShapeParams;
  /** 0 = lightest skin .. 1 = darkest */
  skinTone: number;
  /** Texture variant 0..2 (subtle differences in skin detail). */
  skinVariant: number;
  eyes: EyeColor;
  hair: { style: HairStyle; color: number };
  brows: BrowStyle;
  facialHair: FacialHair;
  freckles: number;
  scars: ScarId[];
  tattoos: TattooId[];
  tattooColor: number;
}

export function defaultAppearance(): Appearance {
  return {
    shape: defaultShape(),
    skinTone: 0.3,
    skinVariant: 0,
    eyes: 'brown',
    hair: { style: 'short02', color: HAIR_COLORS[2] },
    brows: 'eyebrow001',
    facialHair: 'none',
    freckles: 0,
    scars: [],
    tattoos: [],
    tattooColor: 0x2a3a4a,
  };
}

export interface RandomLookOptions {
  frame?: 'broad' | 'narrow';
  age?: number;
  over?: Partial<Omit<Appearance, 'shape'>> & { shape?: Partial<ShapeParams> };
}

/** Plausible random person (NPC generation). Deterministic per seed. */
export function randomAppearance(seed: number, opts: RandomLookOptions = {}): Appearance {
  const r = new Rng(seed);
  const a = defaultAppearance();
  const gauss = () => (r.next() + r.next() + r.next() - 1.5) / 1.5;
  const masc = opts.frame ? opts.frame === 'broad' : r.chance(0.5);
  const s = a.shape;
  s.gender = masc ? 0.8 + r.next() * 0.2 : r.next() * 0.2;
  s.age = opts.age ?? Math.round(19 + Math.pow(r.next(), 1.5) * 52);
  s.muscle = clamp(0.5 + gauss() * 0.35);
  s.weight = clamp(0.45 + gauss() * 0.3);
  s.height = clamp(0.5 + gauss() * 0.35);
  // Ninety years after the Burn people are thoroughly mixed: random ethnic blend.
  const e = [r.next() ** 2, r.next() ** 2, r.next() ** 2];
  const es = e[0] + e[1] + e[2];
  s.african = e[0] / es; s.asian = e[1] / es; s.caucasian = e[2] / es;
  s.breastSize = clamp(0.5 + gauss() * 0.3);
  s.breastFirmness = clamp(0.6 - (s.age - 25) / 100 + gauss() * 0.15);
  a.skinTone = clamp(s.african * 0.95 + s.asian * 0.25 + s.caucasian * 0.05 + gauss() * 0.12);
  a.skinVariant = r.int(0, 2);
  a.eyes = a.skinTone > 0.6 ? r.pick(['brown', 'brown', 'brownlight'] as const) : r.pick(EYE_COLORS);
  const hairPool: HairStyle[] = masc ? ['short01', 'short02', 'short03', 'short04', 'none', 'afro01', 'ponytail01'] : ['bob01', 'bob02', 'long01', 'ponytail01', 'braid01', 'short03', 'afro01'];
  a.hair = { style: r.pick(hairPool), color: a.skinTone > 0.55 ? r.pick(HAIR_COLORS.slice(0, 2)) : r.pick(HAIR_COLORS.slice(0, 9)) };
  a.brows = r.pick(BROW_STYLES);
  a.facialHair = masc && r.chance(0.6) ? r.pick(FACIAL_HAIR.slice(1)) : 'none';
  a.freckles = a.skinTone < 0.4 && r.chance(0.2) ? r.range(0.2, 0.8) : 0;
  if (r.chance(0.3)) a.scars = [r.pick(SCARS)];
  if (r.chance(0.15)) a.tattoos = [r.pick(TATTOOS)];
  // Individual facial variation: a handful of modifiers nudged off average.
  for (const id of FACE_VARIATION) if (r.chance(0.6)) s.modifiers[id] = gauss() * 0.45;
  const o = opts.over ?? {};
  return { ...a, ...o, shape: { ...s, ...(o.shape ?? {}), modifiers: { ...s.modifiers, ...(o.shape?.modifiers ?? {}) } } } as Appearance;
}

/** Modifiers used for random facial individuality (symmetric ones). */
const FACE_VARIATION = [
  'head-oval', 'head-square', 'head-round', 'head-scale-horiz|decr|incr', 'head-scale-vert|decr|incr',
  'nose-scale-horiz|decr|incr', 'nose-scale-vert|decr|incr', 'nose-hump|decr|incr', 'nose-nostrils-width|decr|incr',
  'nose-point-width|decr|incr', 'mouth-scale-horiz|decr|incr', 'mouth-lowerlip-height|decr|incr', 'mouth-upperlip-height|decr|incr',
  'chin-prominent|decr|incr', 'chin-width|decr|incr', 'chin-height|decr|incr', 'sym:cheek-bones|decr|incr', 'forehead-scale-vert|decr|incr',
  'eyebrows-trans|down|up', 'neck-scale-horiz|decr|incr', 'sym:eye-scale|decr|incr', 'sym:eye-trans|in|out', 'sym:ear-scale|decr|incr',
];

/** The same person, older (used for the photograph and epilogues). */
export function agedAppearance(a: Appearance, years: number): Appearance {
  const b = structuredClone(a);
  b.shape.age = Math.min(95, a.shape.age + years);
  b.shape.modifiers['head-age|decr|incr'] = Math.min(1, (b.shape.modifiers['head-age|decr|incr'] ?? 0) + years / 45);
  b.shape.weight = clamp(b.shape.weight + years * 0.004);
  b.shape.muscle = clamp(b.shape.muscle - Math.max(0, b.shape.age - 45) * 0.006);
  b.shape.breastFirmness = clamp(b.shape.breastFirmness - years * 0.01);
  return b;
}

/** 0 (young) .. 1 (very old): greying, wrinkles. */
export function ageFactor(age: number): number {
  return clamp((age - 30) / 50);
}

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
