import * as THREE from 'three';
import type { FloorKind, MapDef } from '../data/types';
import type { GroundLayers } from '../assets/pbr';
import type { Grid } from './grid';

/**
 * The ground of a map as one mesh: a vertex at every tile corner, each carrying up to four surface layers with
 * weights taken from the tiles round it, so sand runs into dirt and asphalt frays into rubble instead of meeting at
 * a seam. Hard floors (tile, plate, boards) keep a sharp edge. Heights are flat for now; the open world gives the
 * same mesh a heightfield.
 */

/** Floor kind → material library key. Water is drawn separately (its own shader). */
export const FLOOR_KEY: Record<Exclude<FloorKind, 'water'>, string> = {
  sand: 'sand', dirt: 'dirt', concrete: 'concrete', metal: 'metal', wood: 'wood', grate: 'grate', asphalt: 'asphalt', rubble: 'rubble', tile: 'tile',
};
const OUTDOOR = new Set<FloorKind>(['sand', 'dirt', 'rubble', 'asphalt']);
/** Vertex-colour stand-ins when the library is not loaded (tests, offline). */
const FALLBACK: Record<string, number> = { sand: 0xc9ac7e, dirt: 0x8a7050, concrete: 0x9a968c, metal: 0x7a7e80, wood: 0x8a6a48, grate: 0x6a6e70, asphalt: 0x5a5a58, rubble: 0x8a8278, tile: 0xb0aca0 };

/** The surface keys a map's ground needs, in a stable order (the first is the kind that stands in for the outside). */
export function groundKeys(map: MapDef, grid: Grid): string[] {
  const count = new Map<string, number>();
  for (const t of grid.tiles) {
    if (t.def.empty || t.def.floor === 'water') continue;
    const f = (t.def.floor ?? (map.ambience.indoor ? 'concrete' : 'sand')) as Exclude<FloorKind, 'water'>;
    count.set(FLOOR_KEY[f], (count.get(FLOOR_KEY[f]) ?? 0) + (OUTDOOR.has(f) ? 1 : 0.001));
  }
  const keys = [...count.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  if (!keys.length) keys.push(map.ambience.indoor ? 'concrete' : 'sand');
  return keys.slice(0, 8);
}

const MAX_LAYERS = 8;

export function buildGround(map: MapDef, grid: Grid, layers: GroundLayers | undefined): THREE.Mesh {
  const keys = layers?.keys ?? groundKeys(map, grid);
  const index = new Map(keys.map((k, i) => [k, i]));
  const W = grid.width, H = grid.height;
  const VW = W + 1;
  const kindAt = (x: number, y: number): number | undefined => {
    const t = grid.get(x, y);
    if (!t || t.def.empty) return map.ambience.indoor ? undefined : 0;
    if (t.def.floor === 'water') return undefined;
    const f = (t.def.floor ?? (map.ambience.indoor ? 'concrete' : 'sand')) as Exclude<FloorKind, 'water'>;
    return index.get(FLOOR_KEY[f]) ?? 0;
  };
  const n = VW * (H + 1);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  const aLayer = new Float32Array(n * 4), aWeight = new Float32Array(n * 4), color = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let vy = 0; vy <= H; vy++) {
    for (let vx = 0; vx <= W; vx++) {
      const i = vy * VW + vx;
      pos[i * 3] = vx; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = vy;
      nrm[i * 3 + 1] = 1;
      const tally = new Map<number, number>();
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const k = kindAt(vx + dx, vy + dy);
        if (k !== undefined) tally.set(k, (tally.get(k) ?? 0) + 1);
      }
      if (!tally.size) tally.set(0, 1);
      const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const total = top.reduce((s, e) => s + e[1], 0);
      c.setRGB(0, 0, 0);
      for (let s = 0; s < 4; s++) {
        const e = top[s];
        aLayer[i * 4 + s] = e ? e[0] : 0;
        const w = e ? e[1] / total : 0;
        aWeight[i * 4 + s] = w;
        if (e) c.add(new THREE.Color(FALLBACK[keys[e[0]]] ?? 0x999999).multiplyScalar(w));
      }
      color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b;
    }
  }
  const idx: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = grid.get(x, y);
      if (!t || t.def.empty || t.def.floor === 'water') continue;
      const a = y * VW + x, b = a + 1, d = a + VW, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('aLayer', new THREE.BufferAttribute(aLayer, 4));
  geo.setAttribute('aWeight', new THREE.BufferAttribute(aWeight, 4));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, layers ? splatMaterial(layers) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  return mesh;
}

const splatCache = new WeakMap<GroundLayers, THREE.MeshStandardMaterial>();

function splatMaterial(layers: GroundLayers): THREE.MeshStandardMaterial {
  const hit = splatCache.get(layers);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1, color: 0xffffff });
  const scales = new Float32Array(MAX_LAYERS).fill(2), hard = new Float32Array(MAX_LAYERS), tints: THREE.Vector3[] = [];
  for (let i = 0; i < MAX_LAYERS; i++) {
    if (i < layers.keys.length) { scales[i] = layers.scales[i]; hard[i] = layers.hard[i]; }
    const t = layers.tints[i] ?? new THREE.Color(0xffffff);
    tints.push(new THREE.Vector3(t.r, t.g, t.b));
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDiff = { value: layers.diff };
    shader.uniforms.uNor = { value: layers.nor };
    shader.uniforms.uArm = { value: layers.arm };
    shader.uniforms.uScale = { value: scales };
    shader.uniforms.uHard = { value: hard };
    shader.uniforms.uTint = { value: tints };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aLayer; attribute vec4 aWeight; varying vec4 vLayer; varying vec4 vWeight; varying vec2 vGUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLayer = aLayer; vWeight = aWeight; vGUv = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uDiff; uniform sampler2DArray uNor; uniform sampler2DArray uArm;
uniform float uScale[${MAX_LAYERS}]; uniform float uHard[${MAX_LAYERS}]; uniform vec3 uTint[${MAX_LAYERS}];
varying vec4 vLayer; varying vec4 vWeight; varying vec2 vGUv;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y); }
mat3 gTangentFrame(vec3 eye_pos, vec3 surf_norm, vec2 uv) {
  vec3 q0 = dFdx(eye_pos), q1 = dFdy(eye_pos); vec2 st0 = dFdx(uv), st1 = dFdy(uv);
  vec3 N = surf_norm; vec3 q1perp = cross(q1, N), q0perp = cross(N, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x; vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B)); float s = (det == 0.0) ? 0.0 : inversesqrt(det);
  return mat3(T * s, B * s, N);
}
void gSample(int slot, inout vec3 d, inout vec3 nn, inout vec3 ar, inout float sum, float w) {
  if (w < 0.004) return;
  int L = int(vLayer[slot] + 0.5);
  float sc = 1.0 / uScale[L];
  vec2 uv = vGUv * sc;
  // Two scales of the same texture break the repeat; the second is rotated a quarter turn.
  vec3 c1 = texture(uDiff, vec3(uv, float(L))).rgb;
  vec3 c2 = texture(uDiff, vec3(vec2(-uv.y, uv.x) * 0.37 + 0.5, float(L))).rgb;
  d += mix(c1, c2, 0.4) * uTint[L] * w;
  nn += (texture(uNor, vec3(uv, float(L))).rgb * 2.0 - 1.0) * w;
  ar += texture(uArm, vec3(uv, float(L))).rgb * w;
  sum += w;
}`)
      .replace('#include <map_fragment>', `
vec4 gw = vWeight;
for (int s = 0; s < 4; s++) { int L = int(vLayer[s] + 0.5); gw[s] = pow(max(gw[s], 0.0), mix(1.3, 7.0, uHard[L])); }
gw /= max(gw.x + gw.y + gw.z + gw.w, 1e-4);
vec3 gDiff = vec3(0.0), gNor = vec3(0.0), gArm = vec3(0.0); float gSum = 0.0;
gSample(0, gDiff, gNor, gArm, gSum, gw.x); gSample(1, gDiff, gNor, gArm, gSum, gw.y); gSample(2, gDiff, gNor, gArm, gSum, gw.z); gSample(3, gDiff, gNor, gArm, gSum, gw.w);
gSum = max(gSum, 1e-4); gDiff /= gSum; gNor /= gSum; gArm /= gSum;
// Slow drift of tone across the ground so no stretch reads as the same tile twice.
float gMacro = 0.9 + 0.2 * gNoise(vGUv * 0.09) + 0.06 * gNoise(vGUv * 0.41);
diffuseColor.rgb *= gDiff * gMacro;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * clamp(gArm.g, 0.25, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * gArm.b;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize(gTangentFrame(-vViewPosition, normal, vGUv) * normalize(vec3(gNor.xy * 0.9, max(gNor.z, 0.2))));')
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= mix(1.0, gArm.r, 0.8);');
  };
  m.customProgramCacheKey = () => 'ground_splat';
  splatCache.set(layers, m);
  return m;
}
