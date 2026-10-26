import { Rng } from '../core/rng';
import { defaultShape, type ShapeParams } from '../assets/human/shape';
import { ANCESTRIES, weighted, type AncestryPreset, type HairTexture } from './ancestry';

/**
 * A character's look: body/face shape (MakeHuman-compatible), skin, eyes, hair and painted marks.
 * Facial hair, freckles, scars and tattoos are painted into the per-character skin texture.
 */

/** Hair meshes, 'coily_*' volumetric afro-textured hair, and 'paint_*' styles painted into the scalp. */
export const HAIR_STYLES = ['none', 'cut_crew', 'cut_crop', 'cut_sidepart', 'cut_slickback', 'cut_quiff', 'cut_messy', 'cut_pixie', 'coily_twa', 'coily_afro', 'coily_afro_big', 'paint_shaved', 'paint_buzz', 'paint_fade', 'paint_coils', 'paint_cornrows', 'short01', 'short02', 'short04', 'culturalibre_hair_02', 'culturalibre_hair_01', 'bob02', 'toigo_inverted_bob', 'toigo_blunt_bob', 'long01', 'ponytail01', 'elvs_unkempt_french_braid'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const BROW_STYLES = ['mindfront_eyebrows_01', 'mindfront_eyebrows_02', 'mindfront_eyebrows_03', 'mindfront_eyebrows_04', 'mindfront_eyebrows_05', 'mindfront_eyebrows_06', 'mindfront_eyebrows_07', 'mindfront_eyebrows_08', 'mindfront_eyebrows_09', 'mindfront_eyebrows_10', 'mindfront_eyebrows_11', 'mindfront_eyebrows_12', 'mindfront_eyebrows_13', 'mindfront_eyebrows_14', 'eyebrow001', 'eyebrow002', 'eyebrow003', 'eyebrow004', 'eyebrow005', 'eyebrow006', 'eyebrow007', 'eyebrow008', 'eyebrow009', 'eyebrow010', 'eyebrow011', 'eyebrow012'] as const;
export type BrowStyle = (typeof BROW_STYLES)[number];

export const EYE_COLORS = ['brown', 'brownlight', 'green', 'bluegreen', 'blue', 'lightblue', 'deepblue', 'grey', 'ice'] as const;
export type EyeColor = (typeof EYE_COLORS)[number];

/** Facial hair styles (strand-rendered; see assets/human/facialHair.ts). */
export const FACIAL_HAIR = [
  'none', 'stubble_light', 'stubble', 'stubble_heavy', 'short_beard', 'full_beard', 'goatee', 'van_dyke', 'moustache',
  'moustache_stubble', 'chin_strap',
] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];

/** How common each option is among generated men (few razors after the Burn: stubble is the norm). */
const FACIAL_HAIR_WEIGHTS: [FacialHair, number][] = [
  ['none', 28], ['stubble_light', 12], ['stubble', 14], ['stubble_heavy', 12], ['short_beard', 10], ['full_beard', 6],
  ['goatee', 5], ['van_dyke', 3], ['moustache', 3], ['moustache_stubble', 5], ['chin_strap', 2],
];

export const SCARS = ['brow_cut', 'cheek_slash', 'lip_split', 'eye_scar', 'burn_left', 'burn_right', 'forehead_x', 'chin_nick'] as const;
export type ScarId = (typeof SCARS)[number];

export const TATTOOS = ['nine_neck', 'tear', 'chin_lines', 'brow_dots', 'cheek_tribal', 'temple_spiral', 'cheek_cross', 'jaw_stripes', 'forehead_star', 'eye_band'] as const;
export type TattooId = (typeof TATTOOS)[number];

export const HAIR_COLORS = [0x120e0b, 0x2b1d14, 0x46301f, 0x6a4a30, 0x8f6c45, 0xb8935f, 0xd9c18e, 0x7a3418, 0xa65126, 0x8a8782, 0xd2d0c8] as const;

export interface Appearance {
  shape: ShapeParams;
  /** 0 = lightest skin .. 1 = darkest */
  skinTone: number;
  /** -1 rosy/cool .. 0 neutral .. +1 golden/olive. */
  skinUndertone?: number;
  /** Ancestry preset this look was generated from (informational; see data/ancestry.ts). */
  ancestry?: string;
  /** Texture variant 0..2 (subtle differences in skin detail). */
  skinVariant: number;
  eyes: EyeColor;
  hair: { style: HairStyle; color: number };
  brows: BrowStyle;
  /** Brow colour; defaults to the hair colour. */
  browColor?: number;
  facialHair: FacialHair;
  freckles: number;
  scars: ScarId[];
  tattoos: TattooId[];
  tattooColor: number;
  /** 0..1 dirt and sun on the skin (painted). */
  grime?: number;
}

export function defaultAppearance(): Appearance {
  return {
    shape: defaultShape(),
    skinTone: 0.3,
    skinVariant: 0,
    eyes: 'brown',
    hair: { style: 'short02', color: HAIR_COLORS[2] },
    brows: 'mindfront_eyebrows_01',
    facialHair: 'none',
    freckles: 0,
    scars: [],
    tattoos: [],
    tattooColor: 0x2a3a4a,
  };
}

/** How someone has lived: shapes body (hunger, labour, comfort) and how much grime they carry. */
export type Lifestyle = 'starved' | 'hard' | 'settled' | 'soft' | 'pampered';

/** Dye colours seen on city heads (bleach, neon, ink). */
export const HAIR_DYES = [0xe6d9b0, 0xf0ece2, 0xd23a8c, 0x9b3fd1, 0x2fb9c4, 0x3a62d8, 0xd8452c, 0x56c45a, 0x15161c, 0xb9b9c8] as const;

export interface RandomLookOptions {
  frame?: 'broad' | 'narrow';
  age?: number;
  life?: Lifestyle;
  /** Chance of dyed hair (city youth and the Crown's fashionable). */
  dyeChance?: number;
  /** Force an ancestry preset id (no mixing). */
  ancestry?: string;
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
  // Body extremes: hunger, heavy labour, comfort; plus the occasional very tall/short or heavy person.
  const life = opts.life ?? 'settled';
  const LIFE: Record<Lifestyle, [number, number]> = { starved: [-0.3, -0.15], hard: [-0.1, 0.15], settled: [0, 0], soft: [0.15, -0.15], pampered: [0.1, -0.1] };
  s.weight = clamp(s.weight + LIFE[life][0]);
  s.muscle = clamp(s.muscle + LIFE[life][1]);
  const body = r.next();
  if (body < 0.07) { s.weight = r.range(0.85, 1); s.muscle = r.range(0.2, 0.6); }
  else if (body < 0.14 && life !== 'pampered') { s.weight = r.range(0, 0.12); s.muscle = r.range(0.1, 0.45); }
  else if (body < 0.2) { s.muscle = r.range(0.8, 1); s.weight = r.range(0.4, 0.7); }
  if (r.chance(0.08)) s.height = r.chance(0.5) ? r.range(0.9, 1) : r.range(0, 0.1);
  // Most people come from one ancestry cluster; about a fifth are visibly mixed.
  const next = () => r.next();
  const pool = ANCESTRIES.map((x) => [x, x.weight] as [AncestryPreset, number]);
  const forced = ANCESTRIES.find((x) => x.id === opts.ancestry);
  const pa = forced ?? weighted(next, pool);
  const pb = !forced && r.chance(0.22) ? weighted(next, pool) : pa;
  const w = pb === pa ? 1 : r.range(0.35, 0.65);
  const mixv = (fa: number, fb: number) => fa * w + fb * (1 - w);
  const jitter = () => r.range(-0.06, 0.06);
  s.african = Math.max(0, mixv(pa.shape.african, pb.shape.african) + jitter());
  s.asian = Math.max(0, mixv(pa.shape.asian, pb.shape.asian) + jitter());
  s.caucasian = Math.max(0, mixv(pa.shape.caucasian, pb.shape.caucasian) + jitter());
  const es = s.african + s.asian + s.caucasian || 1;
  s.african /= es; s.asian /= es; s.caucasian /= es;
  s.breastSize = clamp(0.5 + gauss() * 0.3);
  s.breastFirmness = clamp(0.6 - (s.age - 25) / 100 + gauss() * 0.15);
  a.ancestry = pa === pb ? pa.id : `${pa.id}+${pb.id}`;
  a.skinTone = clamp(mixv(r.range(...pa.tone), r.range(...pb.tone)));
  a.skinUndertone = mixv(r.range(...pa.undertone), r.range(...pb.undertone));
  a.skinVariant = r.int(0, 2);
  const src = () => (r.chance(w) ? pa : pb);
  a.eyes = weighted(next, src().eyes);
  const texture = weighted(next, src().texture);
  let hairColor = weighted(next, src().hair);
  const natural = hairColor;
  // Greying from the late thirties.
  const grey = clamp((s.age - 38) / 35) * 0.75 * r.range(0.6, 1.2);
  if (grey > 0) hairColor = mixHex(hairColor, 0xb8b6ae, clamp(grey));
  a.hair = { style: r.pick(hairPool(texture, masc)), color: hairColor };
  if (opts.dyeChance && s.age < 50 && r.chance(opts.dyeChance)) a.hair.color = r.pick(HAIR_DYES);
  // Brows grey later and less than scalp hair.
  a.browColor = grey > 0.3 ? mixHex(natural, 0xb8b6ae, clamp((grey - 0.3) * 0.6)) : natural;
  a.brows = r.pick(BROW_STYLES.slice(0, 14));
  a.facialHair = masc ? weighted(next, FACIAL_HAIR_WEIGHTS) : 'none';
  a.freckles = r.chance(mixv(pa.freckleChance, pb.freckleChance)) ? r.range(0.2, 0.8) : 0;
  if (r.chance(0.3)) a.scars = [r.pick(SCARS)];
  if (r.chance(0.15)) a.tattoos = [r.pick(TATTOOS)];
  // Individual facial variation: a handful of modifiers nudged off average.
  for (const id of FACE_VARIATION) if (r.chance(0.7)) s.modifiers[id] = gauss() * 0.6;
  // One or two distinctive features (a strong nose, heavy jaw, wide mouth...) make faces memorable.
  for (let k = r.int(1, 2); k > 0; k--) s.modifiers[r.pick(FACE_VARIATION)] = (r.chance(0.5) ? 1 : -1) * r.range(0.75, 1);
  // Weathering: outdoor lives show in the face before the body.
  if (life === 'starved' || life === 'hard') s.modifiers['head-age|decr|incr'] = Math.max(s.modifiers['head-age|decr|incr'] ?? 0, r.range(0.05, 0.3));
  if (life === 'starved') s.modifiers['sym:cheek-volume|decr|incr'] = -r.range(0.4, 0.9);
  a.grime = { starved: r.range(0.4, 0.8), hard: r.range(0.2, 0.55), settled: r.range(0, 0.25), soft: 0, pampered: 0 }[life];
  const o = opts.over ?? {};
  return { ...a, ...o, shape: { ...s, ...(o.shape ?? {}), modifiers: { ...s.modifiers, ...(o.shape?.modifiers ?? {}) } } } as Appearance;
}

/** Hairstyles that suit each hair texture (random NPC generation). */
export const HAIR_BY_TEXTURE: Record<HairTexture, { masc: HairStyle[]; fem: HairStyle[] }> = {
  straight: {
    masc: ['cut_crew', 'cut_crop', 'cut_sidepart', 'cut_slickback', 'cut_quiff', 'cut_messy', 'paint_buzz', 'paint_fade', 'paint_shaved', 'ponytail01', 'culturalibre_hair_01'],
    fem: ['cut_pixie', 'bob02', 'toigo_inverted_bob', 'toigo_blunt_bob', 'long01', 'culturalibre_hair_01', 'ponytail01', 'elvs_unkempt_french_braid'],
  },
  wavy: {
    masc: ['cut_crew', 'cut_crop', 'cut_sidepart', 'cut_slickback', 'cut_quiff', 'cut_messy', 'paint_buzz', 'paint_fade'],
    fem: ['cut_pixie', 'bob02', 'long01', 'ponytail01', 'elvs_unkempt_french_braid', 'culturalibre_hair_01'],
  },
  curly: {
    masc: ['cut_crop', 'cut_messy', 'paint_buzz', 'paint_fade', 'coily_twa'],
    fem: ['coily_twa', 'coily_afro', 'ponytail01'],
  },
  coily: {
    masc: ['coily_twa', 'coily_twa', 'coily_twa', 'paint_fade', 'paint_fade', 'paint_buzz', 'paint_cornrows', 'coily_afro', 'paint_shaved'],
    fem: ['coily_twa', 'coily_twa', 'coily_afro', 'coily_afro', 'coily_afro_big', 'paint_cornrows', 'paint_cornrows'],
  },
};

function hairPool(t: HairTexture, masc: boolean): HairStyle[] {
  return masc ? HAIR_BY_TEXTURE[t].masc : HAIR_BY_TEXTURE[t].fem;
}

/** Modifiers used for random facial individuality (symmetric ones). */
const FACE_VARIATION = [
  'head-oval', 'head-square', 'head-round', 'head-scale-horiz|decr|incr', 'head-scale-vert|decr|incr',
  'nose-scale-horiz|decr|incr', 'nose-scale-vert|decr|incr', 'nose-hump|decr|incr', 'nose-nostrils-width|decr|incr',
  'nose-point-width|decr|incr', 'mouth-scale-horiz|decr|incr', 'mouth-lowerlip-height|decr|incr', 'mouth-upperlip-height|decr|incr',
  'chin-prominent|decr|incr', 'chin-width|decr|incr', 'chin-height|decr|incr', 'sym:cheek-bones|decr|incr', 'forehead-scale-vert|decr|incr',
  'eyebrows-trans|down|up', 'neck-scale-horiz|decr|incr', 'sym:eye-scale|decr|incr', 'sym:eye-trans|in|out', 'sym:ear-scale|decr|incr',
  'head-rectangular', 'head-triangular', 'head-invertedtriangular', 'head-diamond', 'head-fat|decr|incr', 'nose-curve|concave|convex',
  'nose-greek|decr|incr', 'nose-volume|decr|incr', 'nose-point|down|up', 'nose-width1|decr|incr', 'nose-width2|decr|incr',
  'mouth-upperlip-volume|decr|incr', 'mouth-lowerlip-volume|decr|incr', 'mouth-cupidsbow|decr|incr', 'mouth-angles|down|up',
  'chin-bones|decr|incr', 'chin-prognathism|decr|incr', 'chin-cleft|decr|incr', 'sym:cheek-volume|decr|incr', 'sym:cheek-inner|decr|incr',
  'sym:eye-bag|decr|incr', 'sym:eye-eyefold-angle|down|up', 'sym:eye-corner1|down|up', 'sym:eye-height2|decr|incr',
  'sym:eye-epicanthus|in|out', 'forehead-trans|backward|forward', 'eyebrows-angle|down|up', 'sym:ear-lobe|decr|incr', 'sym:ear-wing|decr|incr',
];

/** The same person, older (used for the photograph and epilogues). */
export function agedAppearance(a: Appearance, years: number): Appearance {
  const b = structuredClone(a);
  b.shape.age = Math.min(95, a.shape.age + years);
  b.shape.modifiers['head-age|decr|incr'] = Math.min(1, (b.shape.modifiers['head-age|decr|incr'] ?? 0) + years / 45);
  b.shape.weight = clamp(b.shape.weight + years * 0.004);
  b.shape.muscle = clamp(b.shape.muscle - Math.max(0, b.shape.age - 45) * 0.006);
  b.shape.breastFirmness = clamp(b.shape.breastFirmness - years * 0.01);
  // Greying starts in the late thirties.
  const grey = clamp((b.shape.age - 38) / 35) * 0.75;
  if (grey > 0) b.hair.color = mixHex(a.hair.color, 0xb8b6ae, grey);
  return b;
}

/** 0 (young) .. 1 (very old): greying, wrinkles. */
export function ageFactor(age: number): number {
  return clamp((age - 30) / 50);
}

function mixHex(a: number, b: number, t: number): number {
  const ch = (x: number, s: number) => (x >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
  return m(16) | m(8) | m(0);
}

function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
