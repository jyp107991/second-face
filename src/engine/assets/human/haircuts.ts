import * as THREE from 'three';
import { scalpMask } from './skin';
import type { StrandField } from './strands';

/**
 * Short and medium haircuts rendered as strands. Each cut is a length map (top / sides / back, with an
 * optional fade), a comb direction and how much volume stands off the scalp. Head-frame coordinates
 * (1 unit ≈ 89 mm): the crown is around y≈1.2, the front hairline y≈0.95, ears at |x|≈0.9.
 */

const MM = 1 / 89;
function smoothstep(a: number, b: number, x: number) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

type Comb = 'back' | 'forward' | 'side' | 'quiff' | 'messy';

export interface Haircut {
  label: string;
  /** Lengths in mm. */
  top: number; sides: number; back: number;
  /** Fade: side length shrinks to `fadeTo` mm below the given height (head units). */
  fade?: { to: number; low: number; high: number };
  comb: Comb;
  /** Volume: fraction of the length that stands off the scalp. */
  volume: number;
  /** Side of the parting for 'side' (+1 = player's left), and its position. */
  part?: number;
  wave?: number;
}

export const HAIRCUTS: Record<string, Haircut> = {
  cut_crew: { label: 'Crew cut', top: 20, sides: 6, back: 8, comb: 'back', volume: 0.6, fade: { to: 2.5, low: 0.1, high: 0.55 } },
  cut_crop: { label: 'Textured crop', top: 42, sides: 5, back: 9, comb: 'messy', volume: 0.7, fade: { to: 1.5, low: 0.2, high: 0.62 }, wave: 1.2 },
  cut_sidepart: { label: 'Side part', top: 60, sides: 14, back: 18, comb: 'side', volume: 0.22, part: 1 },
  cut_slickback: { label: 'Slicked back', top: 95, sides: 5, back: 30, comb: 'back', volume: 0.16, fade: { to: 2, low: 0.25, high: 0.6 } },
  cut_quiff: { label: 'Quiff', top: 65, sides: 8, back: 14, comb: 'quiff', volume: 0.42, fade: { to: 3, low: 0.15, high: 0.6 } },
  cut_messy: { label: 'Messy medium', top: 85, sides: 55, back: 60, comb: 'messy', volume: 0.45, wave: 1.4 },
  cut_pixie: { label: 'Pixie', top: 55, sides: 22, back: 25, comb: 'side', volume: 0.25, part: -1, wave: 0.3 },
};

const tmp = new THREE.Vector3();

/** Strand field for a haircut. */
export function haircutField(id: string): StrandField | null {
  const cut = HAIRCUTS[id];
  if (!cut) return null;
  return (p) => {
    const dens = scalpMask(p);
    if (dens <= 0.01) return null;
    const ax = Math.abs(p.x);
    const th = (Math.atan2(ax, p.z) * 180) / Math.PI;
    const top = smoothstep(0.55, 0.95, p.y) * (1 - smoothstep(125, 160, th) * 0.4);
    const back = smoothstep(100, 140, th) * (1 - top);
    let sideMM = cut.sides;
    if (cut.fade) sideMM = cut.fade.to + (cut.sides - cut.fade.to) * smoothstep(cut.fade.low, cut.fade.high, p.y);
    let backMM = cut.back;
    if (cut.fade) backMM = cut.fade.to + (cut.back - cut.fade.to) * smoothstep(cut.fade.low - 0.3, cut.fade.high, p.y);
    const mm = cut.top * top + backMM * back + sideMM * Math.max(0, 1 - top - back);
    const sx = Math.sign(p.x) || 1;
    // Comb direction.
    const dir = new THREE.Vector3(0, -1, 0);
    const sideDir = tmp.set(sx * 0.15, -1, -0.25);
    switch (cut.comb) {
      case 'back': dir.set(0, -0.15, -1).lerp(sideDir, 1 - top); break;
      case 'forward': dir.set(0, -0.2, 1).lerp(sideDir, 1 - top); break;
      case 'side': {
        const part = (cut.part ?? 1) * 0.32;
        const away = Math.sign(p.x - part) || 1;
        dir.set(away, -0.25, 0.35 * smoothstep(0.3, 0.9, p.z)).lerp(sideDir, 1 - top);
        break;
      }
      case 'quiff': {
        const front = smoothstep(0.2, 0.75, p.z) * top;
        dir.set(0, -0.15, -1).lerp(new THREE.Vector3(0, 1, 0.35), front).lerp(sideDir, 1 - top);
        break;
      }
      case 'messy': {
        // Tousled: broadly forward and down, swirling gently across the head.
        const a = Math.sin(p.x * 4.1 + p.z * 2.3) * 0.9 + Math.cos(p.y * 3.3 - p.z * 2.1) * 0.6;
        dir.set(Math.sin(a) * 0.6, -0.5, 0.8).lerp(sideDir, (1 - top) * 0.8);
        break;
      }
    }
    // At the hairline hair grows out of the skin short and fine; full length a couple of cm in.
    let ramp = 0;
    for (let k = 1; k <= 3; k++) ramp += scalpMask(p, 0, -0.08 * k) / 3;
    const len = mm * MM * (0.45 + 0.55 * ramp);
    // Short hair stands up; longer hair lies down (volume caps the thickness).
    const lift = Math.min(len * cut.volume, (6 + mm * 0.12) * MM) * (cut.comb === 'quiff' ? 1 + smoothstep(0.2, 0.75, p.z) * top * 1.4 : 1);
    return { len, lift: lift * (0.3 + 0.7 * ramp), dens: Math.min(1, dens * 1.3), dir };
  };
}
