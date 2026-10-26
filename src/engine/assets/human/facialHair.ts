import * as THREE from 'three';
import type { StrandField } from './strands';

/**
 * Facial hair: where beard hair grows (anatomical zones in head-frame coordinates, 1 unit ≈ the head
 * radius ≈ 89 mm; landmarks measured on the base mesh: eyes y≈0.1, under the nose y≈-0.42, lips
 * -0.57..-0.86 with corners at ±0.22, chin bottom -1.22, earlobes y≈-0.35, ears beyond |x|≈0.89),
 * the style table (hair length per zone, mm) and the growth direction. Rendered as strands.
 */

const MM = 1 / 89;

function smoothstep(a: number, b: number, x: number) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

export interface BeardZones {
  /** Overall growth mask 0..1 (soft edges). */
  mask: number;
  tache: number; chin: number; corner: number; cheek: number; jaw: number; burn: number;
}

/** Beard-growth area and soft zone weights at head-frame point p. */
export function beardZones(p: THREE.Vector3): BeardZones | null {
  const ax = Math.abs(p.x), y = p.y;
  if (y > 0.3 || y < -1.35) return null;
  const th = (Math.atan2(ax, p.z) * 180) / Math.PI;
  if (th > 92) return null;
  if (ax > 0.89 && y > -0.5) return null;
  const wobble = 0.022 * Math.sin(th * 0.13) + 0.012 * Math.sin(th * 0.29 + 1.3);
  // Top: moustache under the nostrils following the smile lines, then the cheek line rising from just
  // outside the mouth corner to the sideburn base, then the sideburn.
  const tacheTop = -0.42 - Math.max(0, ax - 0.17) * 1.0;
  const tc = smoothstep(14, 22, th);
  const cheekTop = -0.64 + 0.32 * smoothstep(18, 70, th) + wobble;
  let top = tacheTop * (1 - tc) + cheekTop * tc;
  const sideburn = smoothstep(66, 71, th) * smoothstep(84, 80, th);
  top = top * (1 - sideburn) + 0.12 * sideburn;
  const topEdge = 0.04 + 0.07 * tc; // the cheek line thins out over ~1 cm
  // Bottom: the jawline (no neck growth).
  const bottom = -1.24 + 0.39 * Math.pow(Math.min(1, th / 78), 1.6);
  let mask = smoothstep(top + topEdge, top - topEdge, y) * smoothstep(bottom - 0.03, bottom + 0.05, y) * smoothstep(90, 82, th);
  const lip = Math.hypot(ax / 0.225, (y + 0.715) / 0.145);
  mask *= smoothstep(0.97, 1.04, lip);
  if (mask <= 0.002) return null;
  // Zone weights (soft partition). Moustache and chin are shaped around the mouth (by distance from the
  // midline, not by angle), so goatee-type styles have rounded, mouth-width outlines.
  const above = smoothstep(-0.78, -0.64, y);
  const tache = above * (1 - smoothstep(0.24, 0.32, ax));
  const chinR = Math.hypot(ax / 0.3, (y + 0.98) / 0.34); // rounded chin patch below the lower lip
  const chin = (1 - above) * (1 - smoothstep(0.9, 1.08, chinR));
  // Corners join moustache and chin beside the mouth (the circle-beard connection).
  const corner = (1 - smoothstep(0.32, 0.4, ax)) * smoothstep(0.18, 0.24, ax) * (1 - Math.max(tache, chin));
  const sideW = Math.max(0, 1 - tache - chin - corner);
  const burn = smoothstep(60, 70, th) * smoothstep(-0.55, -0.3, y) * sideW;
  const upper = smoothstep(-0.95, -0.75, y);
  const cheek = Math.max(0, sideW - burn) * upper;
  const jaw = Math.max(0, sideW - burn) * (1 - upper);
  return { mask, tache, chin, corner, cheek, jaw, burn };
}

/** Hair length per zone in mm (0 = shaved). `shadow` is the painted follicle shadow strength. */
export interface BeardStyle { tache: number; chin: number; corner: number; cheek: number; jaw: number; burn: number; shadow: number; dens?: number }

const all = (mm: number, shadow: number): BeardStyle => ({ tache: mm, chin: mm, corner: mm, cheek: mm, jaw: mm, burn: mm, shadow });

export const BEARD_STYLES: Record<string, BeardStyle> = {
  stubble_light: { ...all(0.8, 0.17), dens: 0.5 },
  stubble: { ...all(2, 0.28), dens: 0.85 },
  stubble_heavy: all(4, 0.32),
  short_beard: { tache: 7, chin: 9, corner: 8, cheek: 6, jaw: 8, burn: 6, shadow: 0.3 },
  full_beard: { tache: 12, chin: 22, corner: 16, cheek: 11, jaw: 18, burn: 10, shadow: 0.32 },
  goatee: { tache: 8, chin: 10, corner: 8, cheek: 0, jaw: 0, burn: 0, shadow: 0.28 },
  van_dyke: { tache: 9, chin: 11, corner: 0, cheek: 0, jaw: 0, burn: 0, shadow: 0.28 },
  moustache: { tache: 9, chin: 0, corner: 0, cheek: 0, jaw: 0, burn: 0, shadow: 0.25 },
  moustache_stubble: { tache: 9, chin: 2, corner: 3, cheek: 2, jaw: 2, burn: 2, shadow: 0.28 },
  chin_strap: { tache: 0, chin: 6, corner: 0, cheek: 0, jaw: 6, burn: 5, shadow: 0.25 },
};

/** Hair length (mm) and density at p for a style. */
export function beardAt(style: BeardStyle, p: THREE.Vector3): { mm: number; dens: number; z: BeardZones } | null {
  const z = beardZones(p);
  if (!z) return null;
  const parts: [number, number][] = [[z.tache, style.tache], [z.chin, style.chin], [z.corner, style.corner], [z.cheek, style.cheek], [z.jaw, style.jaw], [z.burn, style.burn]];
  let w = 0, mm = 0, grow = 0;
  for (const [zw, l] of parts) { w += zw; mm += zw * l; if (l > 0) grow += zw; }
  if (w <= 0 || mm <= 0) return null;
  const covered = grow / w;
  // Zones that are shaved stop sharply-but-softly (trimmed edge); natural edges thin out (mask).
  const dens = z.mask * smoothstep(0.4, 0.6, covered) * (1 - 0.3 * z.cheek / w) * (style.dens ?? 1);
  if (dens <= 0.01) return null;
  return { mm: mm / Math.max(grow, 1e-3), dens, z };
}

/** Growth direction: down the face, outward from the philtrum on the lip, down-forward on the chin. */
export function beardDir(p: THREE.Vector3, z: BeardZones, out = new THREE.Vector3()): THREE.Vector3 {
  const sx = Math.sign(p.x) || 1;
  out.set(sx * (0.15 + 0.6 * z.tache + 0.25 * z.corner), -1, 0.1 + 0.25 * z.chin);
  // Under the jaw hair lies back toward the throat instead of hanging.
  const under = smoothstep(-1.02, -1.15, p.y);
  out.lerp(new THREE.Vector3(sx * 0.2, -0.35, -1), under);
  return out;
}

/** Strand field for a beard style. Longer hair lies flatter against the skin. */
export function beardField(styleId: string): StrandField | null {
  const st = BEARD_STYLES[styleId];
  if (!st) return null;
  return (p) => {
    const b = beardAt(st, p);
    if (!b) return null;
    const len = b.mm * MM;
    const lift = Math.min(len * 0.55, len < 3 * MM ? len * 0.5 : len * 0.42);
    return { len, lift, dens: b.dens, dir: beardDir(p, b.z) };
  };
}

/** Painted follicle-shadow density under a style at p (0 where shaved). */
export function beardShadowAt(styleId: string, p: THREE.Vector3): number {
  const st = BEARD_STYLES[styleId];
  if (!st) return 0;
  const b = beardAt(st, p);
  return b ? b.dens * st.shadow : 0;
}
