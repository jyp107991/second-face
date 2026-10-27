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
export const FALLBACK: Record<string, number> = {
  sand: 0xc9ac7e, dirt: 0x8a7050, concrete: 0x9a968c, metal: 0x7a7e80, wood: 0x8a6a48, grate: 0x6a6e70, asphalt: 0x5a5a58, rubble: 0x8a8278, tile: 0xb0aca0,
  rock: 0x8a7a68, grass: 0x7a8a4a, grass_dry: 0xa8a060, mud: 0x6a5a48, forest: 0x5a5a38, gravel: 0x8a8478, snow: 0xe0e4e8, burned: 0x4a4440, salt: 0xd8d4c8, moss: 0x6a7a50, coast: 0xb0a890, cracked: 0x9a7a58,
};

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

/** Uniform array length: the world set is 30 surfaces. */
const MAX_LAYERS = 32;

/** The surface that stands for the outside of a map (its commonest open ground). */
export function outsideKey(map: MapDef, grid: Grid): string { return groundKeys(map, grid)[0]; }

/** Surface slots a mesh may blend (two vec4 weight attributes). */
export const SLOTS = 8;

export function buildGround(map: MapDef, grid: Grid, layers: GroundLayers | undefined): THREE.Mesh {
  // The map's surfaces take the mesh's slots (the commonest open one first: it stands in for the outside); every
  // vertex carries a weight per slot, so the blend interpolates cleanly whatever the layer indices are.
  const keys = groundKeys(map, grid).slice(0, SLOTS);
  const slotOf = new Map(keys.map((k, i) => [k, i]));
  const outside = 0;
  const W = grid.width, H = grid.height;
  const VW = W + 1;
  const kindAt = (x: number, y: number): number | undefined => {
    const t = grid.get(x, y);
    if (!t || t.def.empty) return map.ambience.indoor ? undefined : outside;
    if (t.def.floor === 'water') return undefined;
    const f = (t.def.floor ?? (map.ambience.indoor ? 'concrete' : 'sand')) as Exclude<FloorKind, 'water'>;
    return slotOf.get(FLOOR_KEY[f]) ?? outside;
  };
  const n = VW * (H + 1);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  const wA = new Float32Array(n * 4), wB = new Float32Array(n * 4), color = new Float32Array(n * 3);
  const c = new THREE.Color();
  const w = new Float32Array(SLOTS);
  for (let vy = 0; vy <= H; vy++) {
    for (let vx = 0; vx <= W; vx++) {
      const i = vy * VW + vx;
      pos[i * 3] = vx; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = vy;
      nrm[i * 3 + 1] = 1;
      w.fill(0);
      let total = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const k = kindAt(vx + dx, vy + dy);
        if (k !== undefined) { w[k] += 1; total++; }
      }
      if (!total) { w[outside] = 1; total = 1; }
      c.setRGB(0, 0, 0);
      for (let s = 0; s < SLOTS; s++) {
        w[s] /= total;
        if (s < 4) wA[i * 4 + s] = w[s]; else wB[i * 4 + s - 4] = w[s];
        if (w[s] > 0) c.add(new THREE.Color(FALLBACK[keys[s]] ?? 0x999999).multiplyScalar(w[s]));
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
  geo.setAttribute('aWeight', new THREE.BufferAttribute(wA, 4));
  geo.setAttribute('aWeight2', new THREE.BufferAttribute(wB, 4));
  geo.setAttribute('aOcc', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, layers ? splatMaterial(layers, keys) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  return mesh;
}

/**
 * The blended-surface material of one mesh: the world's arrays, and this mesh's slot table (which surface each of
 * the eight weight slots is). Every instance shares one shader program.
 */
export function splatMaterial(layers: GroundLayers, slotKeys: string[]): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1, color: 0xffffff });
  const scales = new Float32Array(MAX_LAYERS).fill(2), hard = new Float32Array(MAX_LAYERS), tints: THREE.Vector3[] = [];
  for (let i = 0; i < MAX_LAYERS; i++) {
    if (i < layers.keys.length) { scales[i] = layers.scales[i]; hard[i] = layers.hard[i]; }
    const t = layers.tints[i] ?? new THREE.Color(0xffffff);
    tints.push(new THREE.Vector3(t.r, t.g, t.b));
  }
  const slots = new Float32Array(SLOTS);
  for (let s = 0; s < SLOTS; s++) { const i = layers.keys.indexOf(slotKeys[s] ?? ''); slots[s] = i < 0 ? 0 : i; }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDiff = { value: layers.diff };
    shader.uniforms.uNor = { value: layers.nor };
    shader.uniforms.uArm = { value: layers.arm };
    shader.uniforms.uScale = { value: scales };
    shader.uniforms.uHard = { value: hard };
    shader.uniforms.uTint = { value: tints };
    shader.uniforms.uSlot = { value: slots };
    shader.uniforms.uWater = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aWeight; attribute vec4 aWeight2; attribute float aOcc; varying vec4 vW; varying vec4 vW2; varying vec2 vGUv; varying float vOcc; varying float vGH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = aWeight; vW2 = aWeight2; vOcc = aOcc; vec4 gWP = modelMatrix * vec4(position, 1.0); vGUv = gWP.xz; vGH = gWP.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uDiff; uniform sampler2DArray uNor; uniform sampler2DArray uArm;
uniform float uScale[${MAX_LAYERS}]; uniform float uHard[${MAX_LAYERS}]; uniform vec3 uTint[${MAX_LAYERS}]; uniform float uSlot[${SLOTS}];
varying vec4 vW; varying vec4 vW2; varying vec2 vGUv; varying float vOcc; varying float vGH;
uniform float uWater;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y); }
mat3 gTangentFrame(vec3 eye_pos, vec3 surf_norm, vec2 uv) {
  vec3 q0 = dFdx(eye_pos), q1 = dFdy(eye_pos); vec2 st0 = dFdx(uv), st1 = dFdy(uv);
  vec3 N = surf_norm; vec3 q1perp = cross(q1, N), q0perp = cross(N, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x; vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B)); float s = (det == 0.0) ? 0.0 : inversesqrt(det);
  return mat3(T * s, B * s, N);
}
vec2 gHash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// Stochastic tiling (Heitz & Neyret): the plane is cut into triangles, each corner shifts the texture by its own
// random offset and the three are blended, so no two stretches of ground repeat each other.
void gTriGrid(vec2 uv, out vec3 w, out vec2 o1, out vec2 o2, out vec2 o3) {
  vec2 sk = mat2(1.0, 0.0, -0.57735027, 1.15470054) * (uv * 3.464);
  vec2 base = floor(sk); vec3 t = vec3(fract(sk), 0.0); t.z = 1.0 - t.x - t.y;
  vec2 v1, v2, v3;
  if (t.z > 0.0) { w = vec3(t.z, t.y, t.x); v1 = base; v2 = base + vec2(0.0, 1.0); v3 = base + vec2(1.0, 0.0); }
  else { w = vec3(-t.z, 1.0 - t.y, 1.0 - t.x); v1 = base + vec2(1.0, 1.0); v2 = base + vec2(1.0, 0.0); v3 = base + vec2(0.0, 1.0); }
  w = w * w; w /= (w.x + w.y + w.z);
  o1 = gHash2(v1); o2 = gHash2(v2); o3 = gHash2(v3);
}
// Blending three samples would wash the texture out; the contrast is put back round the texture's mean (a very
// blurred sample stands in for it).
vec3 gTile(sampler2DArray tex, vec2 uv, float L, vec3 w, vec2 o1, vec2 o2, vec2 o3, vec2 dx, vec2 dy) {
  vec3 m = textureLod(tex, vec3(uv, L), 7.0).rgb;
  vec3 c = textureGrad(tex, vec3(uv + o1, L), dx, dy).rgb * w.x + textureGrad(tex, vec3(uv + o2, L), dx, dy).rgb * w.y + textureGrad(tex, vec3(uv + o3, L), dx, dy).rgb * w.z;
  return m + (c - m) / max(sqrt(dot(w, w)), 0.2);
}
void gSample(int slot, inout vec3 d, inout vec3 nn, inout vec3 ar, inout float sum, float w) {
  if (w < 0.004) return;
  int L = int(uSlot[slot] + 0.5);
  float sc = 1.0 / uScale[L];
  vec2 uv = vGUv * sc;
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  vec3 tw; vec2 o1, o2, o3;
  gTriGrid(uv, tw, o1, o2, o3);
  d += gTile(uDiff, uv, float(L), tw, o1, o2, o3, dx, dy) * uTint[L] * w;
  nn += (gTile(uNor, uv, float(L), tw, o1, o2, o3, dx, dy) * 2.0 - 1.0) * w;
  ar += gTile(uArm, uv, float(L), tw, o1, o2, o3, dx, dy) * w;
  sum += w;
}`)
      .replace('#include <map_fragment>', `
float gw[${SLOTS}]; gw[0] = vW.x; gw[1] = vW.y; gw[2] = vW.z; gw[3] = vW.w; gw[4] = vW2.x; gw[5] = vW2.y; gw[6] = vW2.z; gw[7] = vW2.w;
float gTot = 0.0;
for (int s = 0; s < ${SLOTS}; s++) { int L = int(uSlot[s] + 0.5); gw[s] = pow(max(gw[s], 0.0), mix(1.3, 7.0, uHard[L])); gTot += gw[s]; }
gTot = max(gTot, 1e-4);
vec3 gDiff = vec3(0.0), gNor = vec3(0.0), gArm = vec3(0.0); float gSum = 0.0;
for (int s = 0; s < ${SLOTS}; s++) gSample(s, gDiff, gNor, gArm, gSum, gw[s] / gTot);
gSum = max(gSum, 1e-4); gDiff /= gSum; gNor /= gSum; gArm /= gSum;
// Slow drift of tone and warmth across the ground (damp hollows, bleached rises) so no stretch reads the same.
float gM1 = gNoise(vGUv * 0.045 + 7.0), gM2 = gNoise(vGUv * 0.19 + 3.0);
float gMacro = 0.9 + 0.16 * gM1 + 0.06 * gM2;
vec3 gWarm = mix(vec3(0.97, 0.98, 1.02), vec3(1.03, 1.0, 0.95), gNoise(vGUv * 0.03 + 11.0));
diffuseColor.rgb *= gDiff * gMacro * gWarm * vOcc;
// The waterline: wet, darker ground just above the water, a thin pale line of dried foam, and the drowned ground
// seen through the water darker and bluer the deeper it lies.
float gAbove = vGH - uWater;
float gWet = 1.0 - smoothstep(0.05, 0.9, gAbove);
diffuseColor.rgb *= mix(1.0, 0.62, gWet * step(0.0, gAbove));
float gFoam = (1.0 - smoothstep(0.0, 0.16, abs(gAbove - 0.08))) * (0.55 + 0.45 * gNoise(vGUv * 1.7 + vec2(gM1 * 3.0)));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.84, 0.78), gFoam * 0.7);
float gDeep = clamp(-gAbove / 4.0, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.24, 0.27), gDeep * 0.7 * step(gAbove, 0.0));`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * clamp(gArm.g, 0.25, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * gArm.b;')
      .replace('#include <normal_fragment_maps>', 'normal = normalize(gTangentFrame(-vViewPosition, normal, vGUv) * normalize(vec3(gNor.xy * 0.9, max(gNor.z, 0.2))));')
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= mix(1.0, gArm.r, 0.8);');
  };
  m.customProgramCacheKey = () => 'ground_splat';
  return m;
}
