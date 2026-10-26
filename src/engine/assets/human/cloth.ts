import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ProxyMeta } from './data';
import { humanTexture, loadImage } from './textures';

/** One worn garment and how it looks. */
export interface GarmentLook {
  name: string;
  /** Multiplies the texture colour. */
  tint?: number;
  /** Re-dye: the fabric keeps its weave/shading but takes this colour. */
  dye?: number;
  /** 0..1 dirt, heaviest towards the hem and feet. */
  grime?: number;
  /** 0..1 sun-fading and wear. */
  wear?: number;
}

/**
 * Shared GLSL: re-dye (keeps the weave's shading), sun-fading, and dirt that follows rest-pose height
 * (boots and hems get the worst of it), broken up by noise so no two pieces wear the same way.
 */
const CLOTH_GLSL = `
float gHash(vec3 p, float s) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719)) + s) * 43758.5453); }
float gNoise(vec3 p, float s) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gHash(i, s), gHash(i + vec3(1,0,0), s), f.x), mix(gHash(i + vec3(0,1,0), s), gHash(i + vec3(1,1,0), s), f.x), f.y),
             mix(mix(gHash(i + vec3(0,0,1), s), gHash(i + vec3(1,0,1), s), f.x), mix(gHash(i + vec3(0,1,1), s), gHash(i + vec3(1,1,1), s), f.x), f.y), f.z);
}
vec3 clothLook(vec3 c, vec3 dye, float dyeAmt, float grime, float wear, float seed, vec3 rest) {
  float l = dot(c, vec3(0.3, 0.55, 0.15));
  c = mix(c, dye * clamp(0.25 + l * 1.9, 0.0, 1.6), dyeAmt);
  float n = gNoise(rest * 9.0, seed) * 0.6 + gNoise(rest * 31.0, seed) * 0.4;
  float lw = dot(c, vec3(0.3, 0.55, 0.15));
  // Faded and yellowed: whites go dingy, colours lose their saturation.
  c = mix(c, vec3(lw) * vec3(0.82, 0.78, 0.68) + vec3(0.05, 0.045, 0.035), wear * (0.45 + 0.35 * n));
  // Patches: a few cells of different cloth sewn over worn spots; shown once wear passes a third.
  // Patch cells are small (≈6 cm), skewed so they don't line up, and only some cells become patches.
  vec3 pr = rest * 16.0 + vec3(rest.y * 3.1, rest.z * 2.3, rest.x * 1.7) + vec3(seed);
  vec3 cell = floor(pr);
  vec3 cf = fract(pr);
  float pc = gHash(cell, seed + 3.0);
  float pt = step(1.0 - clamp((wear - 0.4) * 0.2, 0.0, 0.1), pc);
  // Stitched edge: a faint darker rim just inside the cell.
  float rim = 1.0 - smoothstep(0.0, 0.1, min(min(cf.x, 1.0 - cf.x), min(cf.y, 1.0 - cf.y)));
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  vec3 other = mix(vec3(0.3, 0.26, 0.2), vec3(0.42, 0.4, 0.36), gHash(cell, seed + 9.0)) * clamp(lum * 1.6 + 0.3, 0.4, 1.1);
  vec3 patchCol = mix(c * 0.7, other, 0.6) * (1.0 - 0.2 * rim);
  c = mix(c, patchCol, pt * 0.85);
  // Stains: oily blotches, more with grime.
  float st = smoothstep(0.62, 0.8, gNoise(rest * 5.5 + vec3(seed * 0.3), seed + 5.0));
  c = mix(c, c * vec3(0.45, 0.4, 0.35), st * clamp(grime * 1.4, 0.0, 0.9));
  float low = 1.0 - smoothstep(0.0, 1.1, rest.y);
  float gm = grime * clamp((0.4 + 0.8 * low) * smoothstep(0.25, 0.75, n + low * 0.3), 0.0, 1.0);
  return mix(c, vec3(0.20, 0.165, 0.12) * (0.7 + 0.6 * n), gm * 0.75);
}`;

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h / 97;
}

/** A single garment's material (close-ups and high detail). */
export function clothMaterial(meta: ProxyMeta | undefined, g: GarmentLook): THREE.Material {
  const mat = new THREE.MeshStandardMaterial({
    map: meta?.texture ? humanTexture(meta.texture) : null, color: g.tint ?? 0xffffff, roughness: 0.92, metalness: 0,
    alphaTest: meta?.transparent ? 0.4 : 0, side: meta?.transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
  // Outer layers (higher MakeHuman z-depth) win depth ties against the layers beneath them.
  const z = meta?.zDepth ?? 0;
  if (z) { mat.polygonOffset = true; mat.polygonOffsetFactor = -z / 25; mat.polygonOffsetUnits = -z / 5; }
  const dye = g.dye !== undefined ? new THREE.Color(g.dye) : undefined;
  if (!dye && !g.grime && !g.wear) return mat;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDye = { value: dye ?? new THREE.Color(1, 1, 1) };
    sh.uniforms.uLook = { value: new THREE.Vector4(dye ? 1 : 0, g.grime ?? 0, g.wear ?? 0, hashName(g.name)) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vRest;\nuniform vec3 uDye; uniform vec4 uLook;${CLOTH_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb = clothLook(diffuseColor.rgb, uDye, uLook.x, uLook.y, uLook.z, uLook.w, vRest);`);
  };
  mat.customProgramCacheKey = () => 'cloth';
  return mat;
}

/**
 * All of a figure's garments as one mesh (low detail / iso view): one draw call instead of one per piece.
 * Each garment's texture is drawn into a cell of a small per-figure atlas; its dye, dirt and tint ride on
 * vertex attributes; layers are separated by a hair's breadth along the normal (no per-piece polygon offset).
 */
export function mergeClothes(parts: { geo: THREE.BufferGeometry; meta: ProxyMeta; look: GarmentLook }[], cellPx = 256): { geo: THREE.BufferGeometry; mat: THREE.Material } {
  const grid = Math.ceil(Math.sqrt(parts.length));
  const size = grid * cellPx;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  const geos = parts.map(({ geo, meta, look }, i) => {
    const g = geo.clone();
    const n = g.attributes.position.count;
    const cx = i % grid, cy = Math.floor(i / grid);
    const cell = new Float32Array(n * 3), dye = new Float32Array(n * 4), wear = new Float32Array(n * 3), tint = new Float32Array(n * 3);
    const dc = new THREE.Color(look.dye ?? 0xffffff), tc = new THREE.Color(look.tint ?? 0xffffff), seed = hashName(look.name);
    const pos = g.attributes.position.array as Float32Array, nrm = g.attributes.normal.array as Float32Array;
    const push = meta.zDepth * 0.00004;
    for (let v = 0; v < n; v++) {
      cell.set([cx / grid, cy / grid, 1 / grid], v * 3);
      dye.set([dc.r, dc.g, dc.b, look.dye !== undefined ? 1 : 0], v * 4);
      wear.set([look.grime ?? 0, look.wear ?? 0, seed], v * 3);
      tint.set([tc.r, tc.g, tc.b], v * 3);
      for (let k = 0; k < 3; k++) pos[v * 3 + k] += nrm[v * 3 + k] * push;
    }
    g.setAttribute('aCell', new THREE.BufferAttribute(cell, 3));
    g.setAttribute('aDye', new THREE.BufferAttribute(dye, 4));
    g.setAttribute('aWear', new THREE.BufferAttribute(wear, 3));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    // Atlas cell, drawn when the garment's texture arrives. Textures are flipped on upload (v runs up the
    // canvas), so cell row cy counts from the bottom.
    if (meta.texture) {
      void loadImage(meta.texture).then((img) => {
        ctx.drawImage(img, cx * cellPx, (grid - 1 - cy) * cellPx, cellPx, cellPx);
        atlas.needsUpdate = true;
      }).catch(() => undefined);
    }
    return g;
  });
  const geo = mergeGeometries(geos)!;
  for (const g of geos) g.dispose();
  const mat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.92, metalness: 0, alphaTest: 0.4, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aCell; attribute vec4 aDye; attribute vec3 aWear; attribute vec3 aTint;
varying vec3 vRest; varying vec3 vCell; varying vec4 vDye; varying vec3 vWear; varying vec3 vTint;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vRest = position; vCell = aCell; vDye = aDye; vWear = aWear; vTint = aTint;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vRest; varying vec3 vCell; varying vec4 vDye; varying vec3 vWear; varying vec3 vTint;${CLOTH_GLSL}`)
      .replace('#include <map_fragment>', `{
  // Tiled garment UVs wrap inside their own cell; a small inset keeps neighbouring cells from bleeding in.
  vec2 cuv = vCell.xy + (0.004 + fract(vMapUv) * 0.992) * vCell.z;
  diffuseColor *= texture2D(map, cuv);
  diffuseColor.rgb *= vTint;
  diffuseColor.rgb = clothLook(diffuseColor.rgb, vDye.rgb, vDye.a, vWear.x, vWear.y, vWear.z, vRest);
}`);
  };
  mat.customProgramCacheKey = () => 'cloth-merged';
  return { geo, mat };
}
