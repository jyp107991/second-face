import * as THREE from 'three';
import { frame, scalpMask } from './skin';
import type { HumanData } from './data';

/**
 * Volumetric afro-textured hair: the scalp region of the body mesh is extruded into stacked shells
 * (one draw call), and a shader carves tight coils through them — each coil a small helix whose
 * cross-section drifts round as it rises, with random lengths so the outer surface is soft and
 * uneven. Thickness tapers to zero at the hairline so the edge grows naturally out of the skin.
 */

export const COILY_STYLES: Record<string, { thickness: number; round: number }> = {
  /** Short natural coils (~1 cm). */
  coily_twa: { thickness: 0.13, round: 0 },
  /** Afro (~4 cm). */
  coily_afro: { thickness: 0.45, round: 0.35 },
  /** Big rounded afro (~7 cm). */
  coily_afro_big: { thickness: 0.8, round: 0.5 },
};

export interface BodySurface {
  pos: Float32Array; nrm: Float32Array; index: number[];
  skinIndex: Uint16Array; skinWeight: Float32Array;
}

/** Build the merged shell geometry for a coily style (layers 0 = automatic). Positions are in figure space (metres). */
export function coilyGeometry(d: HumanData, body: BodySurface, style: string, layers: number, scale: number): THREE.BufferGeometry | null {
  const cfg = COILY_STYLES[style];
  if (!cfg) return null;
  // 0 = automatic: enough layers to keep ~1.2 mm spacing (shells further apart read as stripes).
  if (layers <= 0) layers = Math.round(Math.min(48, Math.max(18, (cfg.thickness * 89) / 1.2)));
  const f = frame();
  const n = d.bodyMap.length;
  // Per render vertex: head-frame base position and scalp density.
  const hp = new Float32Array(n * 3), dens = new Float32Array(n), ramp = new Float32Array(n);
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromArray(d.base, d.bodyMap[i] * 3).sub(f.c).divideScalar(f.r);
    hp[i * 3] = p.x; hp[i * 3 + 1] = p.y; hp[i * 3 + 2] = p.z;
    if (p.y > -1.2 && p.length() < 2.2) {
      dens[i] = scalpMask(p);
      // Distance-like ramp inward from the hairline: hair builds up gradually instead of a wall.
      let r = 0;
      for (let k = 1; k <= 5; k++) r += scalpMask(p, 0, -0.1 * k);
      ramp[i] = (dens[i] * 0.3 + r * 0.14);
    }
  }
  const tris: number[] = [];
  for (let t = 0; t < body.index.length; t += 3) {
    const a = body.index[t], b = body.index[t + 1], c = body.index[t + 2];
    if (dens[a] + dens[b] + dens[c] > 0.05) tris.push(a, b, c);
  }
  if (!tris.length) return null;
  // Compact the used vertices.
  const remap = new Map<number, number>();
  for (const v of tris) if (!remap.has(v)) remap.set(v, remap.size);
  const nv = remap.size, total = nv * layers;
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), hpo = new Float32Array(total * 3), lay = new Float32Array(total);
  const si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
  const metres = f.r * scale;
  for (const [src, k] of remap) {
    const hy = hp[src * 3 + 1];
    // Taper at the hairline; an afro is rounder than the skull (fuller on top and at the back).
    const taper = cfg.thickness > 0.2 ? Math.min(1, ramp[src]) ** 1.3 : Math.min(1, dens[src] / 0.7) ** 0.8;
    const fuller = 1 + cfg.round * Math.max(0, Math.min(1, (hy - 0.2) / 1.0)) + cfg.round * 0.3 * Math.max(0, -hp[src * 3 + 2]);
    const T = cfg.thickness * taper * fuller * metres;
    for (let l = 0; l < layers; l++) {
      const h = (l + 0.5) / layers, o = (l * nv + k);
      for (let c = 0; c < 3; c++) {
        pos[o * 3 + c] = body.pos[src * 3 + c] + body.nrm[src * 3 + c] * T * h;
        nrm[o * 3 + c] = body.nrm[src * 3 + c];
        hpo[o * 3 + c] = hp[src * 3 + c];
      }
      lay[o] = h;
      for (let c = 0; c < 4; c++) { si[o * 4 + c] = body.skinIndex[src * 4 + c]; sw[o * 4 + c] = body.skinWeight[src * 4 + c]; }
    }
  }
  const idx: number[] = [];
  for (let l = 0; l < layers; l++) for (const v of tris) idx.push(l * nv + remap.get(v)!);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('hp', new THREE.BufferAttribute(hpo, 3));
  g.setAttribute('layer', new THREE.BufferAttribute(lay, 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(idx);
  return g;
}

/** Coil-carving material: hair colour, matte, dark at the roots, soft highlights at the coil tops. */
export function coilyMaterial(color: number): THREE.Material {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, envMapIntensity: 0.08, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 hp;\nattribute float layer;\nvarying vec3 vHp;\nvarying float vLayer;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHp = hp;\nvLayer = layer;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vHp;
        varying float vLayer;
        vec3 coilHash(vec3 p) {
          p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
          return fract(sin(p) * 43758.5453);
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          // Coils: feature points on a ~2.5 mm grid in head space; each coil spirals as it rises.
          float cs = 0.028;
          vec3 q = vHp / cs;
          vec3 cell = floor(q);
          float best = 9.0; vec3 bestH = vec3(0.0);
          for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
            vec3 c = cell + vec3(float(x), float(y), float(z));
            vec3 h = coilHash(c);
            float ang = vLayer * (5.0 + 4.0 * h.y) * 6.2832 + h.z * 6.2832;
            vec3 fp = c + 0.2 + 0.6 * h + 0.32 * vec3(cos(ang), sin(ang), cos(ang * 0.7 + 1.0));
            float dd = length(q - fp);
            if (dd < best) { best = dd; bestH = h; }
          }
          float len = 0.78 + 0.22 * bestH.x;          // coils end at slightly different heights
          float radius = 0.66 * (1.0 - 0.3 * vLayer / len);
          if (vLayer > len || best > radius) discard;
          float rootShade = 0.35 + 0.65 * smoothstep(0.0, 0.85, vLayer / len);
          float rim = 1.0 - best / radius;            // fibre-bundle shading across the coil
          diffuseColor.rgb *= rootShade * (0.75 + 0.45 * rim) * (0.85 + 0.3 * bestH.z);
          diffuseColor.rgb += 0.035 * rim * smoothstep(0.6, 1.0, vLayer / len);
        }`);
  };
  m.customProgramCacheKey = () => 'coily';
  return m;
}
