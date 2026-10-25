import { Rng } from '../core/rng';

/** Face shape sliders, each -1..1 (0 = average). */
export const FACE_PARAMS = [
  'headWidth', 'headHeight', 'headDepth',
  'jawWidth', 'jawLength', 'chinProtrude', 'chinWidth',
  'cheekbones', 'cheekFullness',
  'browRidge', 'browHeight',
  'eyeSize', 'eyeSpacing', 'eyeTilt', 'eyeDepth',
  'noseLength', 'noseWidth', 'noseBridge', 'noseTip',
  'lipFullness', 'mouthWidth', 'mouthHeight',
  'earSize', 'earAngle',
  'neckWidth',
] as const;
export type FaceParam = (typeof FACE_PARAMS)[number];

export const FACE_PARAM_INFO: Record<FaceParam, { label: string; group: string }> = {
  headWidth: { label: 'Head width', group: 'Head' }, headHeight: { label: 'Head height', group: 'Head' }, headDepth: { label: 'Head depth', group: 'Head' },
  jawWidth: { label: 'Jaw width', group: 'Jaw' }, jawLength: { label: 'Jaw length', group: 'Jaw' }, chinProtrude: { label: 'Chin forward', group: 'Jaw' }, chinWidth: { label: 'Chin width', group: 'Jaw' },
  cheekbones: { label: 'Cheekbones', group: 'Cheeks' }, cheekFullness: { label: 'Cheek fullness', group: 'Cheeks' },
  browRidge: { label: 'Brow ridge', group: 'Brow' }, browHeight: { label: 'Brow height', group: 'Brow' },
  eyeSize: { label: 'Eye size', group: 'Eyes' }, eyeSpacing: { label: 'Eye spacing', group: 'Eyes' }, eyeTilt: { label: 'Eye tilt', group: 'Eyes' }, eyeDepth: { label: 'Eye depth', group: 'Eyes' },
  noseLength: { label: 'Nose length', group: 'Nose' }, noseWidth: { label: 'Nose width', group: 'Nose' }, noseBridge: { label: 'Nose bridge', group: 'Nose' }, noseTip: { label: 'Nose tip', group: 'Nose' },
  lipFullness: { label: 'Lip fullness', group: 'Mouth' }, mouthWidth: { label: 'Mouth width', group: 'Mouth' }, mouthHeight: { label: 'Mouth height', group: 'Mouth' },
  earSize: { label: 'Ear size', group: 'Ears' }, earAngle: { label: 'Ear angle', group: 'Ears' },
  neckWidth: { label: 'Neck width', group: 'Neck' },
};

export const HAIR_STYLES = ['bald', 'buzz', 'short', 'side_part', 'curly', 'afro', 'long', 'long_wavy', 'ponytail', 'bun', 'braids', 'mohawk', 'undercut', 'locs'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const FACIAL_HAIR = ['none', 'stubble', 'moustache', 'goatee', 'short_beard', 'full_beard', 'chops', 'long_beard'] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];

export const SCARS = ['brow_cut', 'cheek_slash', 'lip_split', 'eye_scar', 'burn_left', 'burn_right', 'forehead_x', 'chin_nick'] as const;
export type ScarId = (typeof SCARS)[number];

export const TATTOOS = ['nine_neck', 'tear', 'chin_lines', 'brow_dots', 'cheek_tribal', 'temple_spiral', 'cheek_cross', 'jaw_stripes', 'forehead_star', 'eye_band'] as const;
export type TattooId = (typeof TATTOOS)[number];

export const SKIN_TONES = [0xf2d3bd, 0xe8b996, 0xd9a07a, 0xc68863, 0xae7350, 0x8d5a3b, 0x6e4329, 0x523020, 0x3c2418] as const;
export const HAIR_COLORS = [0x15110e, 0x2e1f16, 0x4a3020, 0x6e4a2e, 0x8a6a42, 0xb8925a, 0xd8c08a, 0x8a3a1e, 0xb05a2a, 0x7a7a78, 0xc8c8c0] as const;
export const EYE_COLORS = [0x3a2418, 0x5a3a20, 0x7a5a2a, 0x4a6a3a, 0x3a5a6a, 0x4a6a8a, 0x6a7a8a] as const;

export interface Appearance {
  face: Record<FaceParam, number>;
  /** Apparent age in years (18–90). */
  age: number;
  skin: number;
  eyes: number;
  hair: { style: HairStyle; color: number };
  facialHair: FacialHair;
  /** Eyebrow thickness -1..1. */
  brows: number;
  freckles: number;
  scars: ScarId[];
  tattoos: TattooId[];
  tattooColor: number;
  body: { height: number; mass: number; muscle: number; shoulders: number; hips: number; chest: number };
}

export function defaultAppearance(): Appearance {
  return {
    face: Object.fromEntries(FACE_PARAMS.map((p) => [p, 0])) as Record<FaceParam, number>,
    age: 24,
    skin: SKIN_TONES[3],
    eyes: EYE_COLORS[1],
    hair: { style: 'short', color: HAIR_COLORS[2] },
    facialHair: 'none',
    brows: 0,
    freckles: 0,
    scars: [],
    tattoos: [],
    tattooColor: 0x2a3a4a,
    body: { height: 0, mass: 0, muscle: 0, shoulders: 0, hips: 0, chest: 0 },
  };
}

/** Random but plausible appearance (NPC generation). Overrides are applied on top. */
export function randomAppearance(seed: number, over: Partial<Appearance> & { frame?: 'broad' | 'narrow' } = {}): Appearance {
  const r = new Rng(seed);
  const a = defaultAppearance();
  for (const p of FACE_PARAMS) a.face[p] = clamp((r.next() + r.next() + r.next() - 1.5) * 0.9, -1, 1);
  a.age = Math.round(18 + Math.pow(r.next(), 1.4) * 55);
  a.skin = r.pick(SKIN_TONES);
  a.eyes = r.pick(EYE_COLORS);
  a.hair = { style: r.pick(HAIR_STYLES), color: r.pick(HAIR_COLORS.slice(0, 9)) };
  const broad = over.frame ? over.frame === 'broad' : r.chance(0.5);
  a.facialHair = broad && r.chance(0.55) ? r.pick(FACIAL_HAIR.slice(1)) : 'none';
  a.brows = r.range(-0.6, 0.8);
  a.freckles = r.chance(0.2) ? r.range(0.2, 0.9) : 0;
  if (r.chance(0.35)) a.scars = [r.pick(SCARS)];
  if (r.chance(0.2)) a.tattoos = [r.pick(TATTOOS)];
  a.body = {
    height: r.range(-0.7, 0.7) + (broad ? 0.25 : -0.2), mass: r.range(-0.6, 0.7), muscle: r.range(-0.6, 0.6),
    shoulders: broad ? r.range(0, 0.8) : r.range(-0.8, 0), hips: broad ? r.range(-0.6, 0.1) : r.range(0, 0.8), chest: broad ? r.range(-0.2, 0.3) : r.range(0.1, 0.9),
  };
  if (broad) { a.face.jawWidth = clamp(a.face.jawWidth + 0.4, -1, 1); a.face.browRidge = clamp(a.face.browRidge + 0.3, -1, 1); }
  else { a.face.lipFullness = clamp(a.face.lipFullness + 0.3, -1, 1); a.face.jawWidth = clamp(a.face.jawWidth - 0.3, -1, 1); }
  return { ...a, ...over, face: { ...a.face, ...(over.face ?? {}) }, body: { ...a.body, ...(over.body ?? {}) } };
}

/** The same person, older (used for the photograph and epilogues). */
export function agedAppearance(a: Appearance, years: number): Appearance {
  const b = structuredClone(a);
  b.age = Math.min(95, a.age + years);
  if (b.age > 50 && (b.hair.style === 'afro' || b.hair.style === 'curly' || b.hair.style === 'side_part')) b.hair.style = 'short';
  if (b.age > 55 && b.facialHair === 'stubble') b.facialHair = 'short_beard';
  b.body.mass = clamp(b.body.mass + years * 0.008, -1, 1);
  b.body.muscle = clamp(b.body.muscle - Math.max(0, b.age - 45) * 0.015, -1, 1);
  return b;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** 0 (young) .. 1 (very old): drives sag, wrinkles, greying. */
export function ageFactor(age: number): number {
  return clamp((age - 28) / 55, 0, 1);
}
