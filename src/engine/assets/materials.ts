import * as THREE from 'three';
import { surfaceTexture, type SurfaceKind } from './textures';

/**
 * Shared uniforms for the "cutaway": geometry between the camera and the focus point
 * (usually the player) is dithered away so walls never hide the action.
 */
export const cutawayUniforms = {
  uCutCenter: { value: new THREE.Vector3() },
  uCamDir: { value: new THREE.Vector3(0, -1, 0) },
  uCutRadius: { value: 3.2 },
  uCutEnabled: { value: 1 },
};

interface SurfaceParams { roughness: number; metalness: number; }
const PARAMS: Partial<Record<SurfaceKind, SurfaceParams>> = {
  metal: { roughness: 0.55, metalness: 0.55 },
  grate: { roughness: 0.6, metalness: 0.5 },
  rust: { roughness: 0.85, metalness: 0.25 },
  scrap: { roughness: 0.8, metalness: 0.3 },
  tile: { roughness: 0.5, metalness: 0 },
  paint: { roughness: 0.7, metalness: 0 },
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function surfaceMaterial(kind: SurfaceKind, opts: { cutaway?: boolean } = {}): THREE.MeshStandardMaterial {
  const key = `${kind}|${opts.cutaway ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = PARAMS[kind] ?? { roughness: 0.92, metalness: 0 };
  const m = new THREE.MeshStandardMaterial({
    map: surfaceTexture(kind),
    roughness: p.roughness,
    metalness: p.metalness,
    vertexColors: true,
    flatShading: true,
  });
  if (opts.cutaway) applyCutaway(m);
  cache.set(key, m);
  return m;
}

/** Plain vertex-coloured material (characters, small props). */
export function flatMaterial(opts: { cutaway?: boolean; emissive?: number } = {}): THREE.MeshStandardMaterial {
  const key = `flat|${opts.cutaway ? 1 : 0}|${opts.emissive ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.05,
    emissive: opts.emissive ?? 0x000000,
  });
  if (opts.cutaway) applyCutaway(m);
  cache.set(key, m);
  return m;
}

export function applyCutaway(m: THREE.Material): void {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cutawayUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCutWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vCutWorld;
uniform vec3 uCutCenter; uniform vec3 uCamDir; uniform float uCutRadius; uniform float uCutEnabled;`)
      .replace('void main() {', `void main() {
  if (uCutEnabled > 0.5 && vCutWorld.y > 0.35) {
    vec3 d = vCutWorld - uCutCenter;
    float along = dot(d, uCamDir);
    float perp = length(d - along * uCamDir);
    if (along < -0.6) {
      float edge = smoothstep(uCutRadius, uCutRadius * 0.6, perp);
      vec2 fc = floor(gl_FragCoord.xy);
      float dither = fract(dot(fc, vec2(0.5, 0.25)) + fract(fc.y * 0.5) * 0.5);
      if (edge > dither * 0.85 + 0.1) discard;
    }
  }`);
  };
  m.customProgramCacheKey = () => 'cutaway';
}

/**
 * Box-project world-space UVs onto a geometry (after its world transform is baked).
 * Lets merged static geometry share tiling textures without per-object UV work.
 */
export function applyWorldUVs(geo: THREE.BufferGeometry, metresPerTile = 2): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  let nrm = geo.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (!nrm) { geo.computeVertexNormals(); nrm = geo.getAttribute('normal') as THREE.BufferAttribute; }
  const uv = new Float32Array(pos.count * 2);
  const s = 1 / metresPerTile;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = x * s; uv[i * 2 + 1] = z * s; }
    else if (nx >= nz) { uv[i * 2] = z * s; uv[i * 2 + 1] = y * s; }
    else { uv[i * 2] = x * s; uv[i * 2 + 1] = y * s; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
