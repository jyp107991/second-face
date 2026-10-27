import * as THREE from 'three';

/**
 * Trees as impostors: each tree is a vertical card that turns to face the camera, showing the one of eight baked
 * views (`tools/assets/impostors.py`) nearest the angle the camera sees it from, given the tree's own yaw. One
 * instanced mesh draws every tree of a kind; the card's shading comes from the game's light on a normal tilted
 * toward the camera, so trees sit in the same light as everything else and take the sun's shadow map.
 */
export interface ImpostorEntry { file: string; id: string; cells: number; spanW: number; spanH: number; baseFrac: number; height: number; radius: number; blocks: boolean; biomes: string[]; note?: string }
interface ImpostorManifest { impostors: Record<string, ImpostorEntry> }

const base = () => `${import.meta.env.BASE_URL ?? '/'}assets/world/`.replace(/\/\/+/g, '/');

let manifest: ImpostorManifest | undefined;
let manifestP: Promise<ImpostorManifest | undefined> | undefined;

export function loadImpostorManifest(): Promise<ImpostorManifest | undefined> {
  manifestP ??= (typeof fetch === 'function' ? fetch(base() + 'impostors.json').then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined) : Promise.resolve(undefined))
    .then((m: ImpostorManifest | undefined) => (manifest = m));
  return manifestP;
}
export function impostorEntries(): Record<string, ImpostorEntry> { return manifest?.impostors ?? {}; }

export interface Impostor { key: string; entry: ImpostorEntry; material: THREE.MeshStandardMaterial; geometry: THREE.BufferGeometry }

/** The camera's yaw, shared by every impostor material (set each frame by the scene). */
export const impostorView = { yaw: 0 };

const loaded = new Map<string, Promise<Impostor | undefined>>();
const texLoader = new THREE.TextureLoader();

export function loadImpostor(key: string): Promise<Impostor | undefined> {
  let p = loaded.get(key);
  if (!p) {
    p = (async () => {
      const m = await loadImpostorManifest();
      const entry = m?.impostors[key];
      if (!entry || typeof document === 'undefined') return undefined;
      const tex = await texLoader.loadAsync(base() + entry.file);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
      const material = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uCamYaw = { value: impostorView };
        shader.uniforms.uCells = { value: entry.cells };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
uniform float uCells;
struct ImpostorView { float yaw; };
uniform ImpostorView uCamYaw;`)
          .replace('#include <begin_vertex>', `
// The instance matrix carries position, scale and the tree's own yaw; the card itself faces the camera.
float iScale = length(vec3(instanceMatrix[0].x, instanceMatrix[0].y, instanceMatrix[0].z));
float iYaw = atan(-instanceMatrix[0].z, instanceMatrix[0].x);
vec3 iPos = vec3(instanceMatrix[3].x, instanceMatrix[3].y, instanceMatrix[3].z);
float cy = uCamYaw.yaw;
vec3 iRight = vec3(cos(cy), 0.0, -sin(cy));
vec3 transformed = iPos + iRight * (position.x * iScale) + vec3(0.0, position.y * iScale, 0.0);
// Which baked view: the angle the camera sees the tree from, in the tree's own frame.
float rel = mod(cy - iYaw, 6.2831853);
float cellIdx = mod(floor(rel / 6.2831853 * uCells + 0.5), uCells);
vMapUv = vec2(uv.x + cellIdx / uCells, uv.y);`)
          .replace('#include <project_vertex>', `
vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
gl_Position = projectionMatrix * mvPosition;`)
          .replace('#include <beginnormal_vertex>', `
// Lit as a rounded thing: the normal leans up and toward the camera (the normal block runs before the position one).
float ncy = uCamYaw.yaw;
vec3 objectNormal = normalize(vec3(-sin(ncy) * 0.5, 0.75, -cos(ncy) * 0.5) + vec3(cos(ncy), 0.0, -sin(ncy)) * position.x * 0.4);`)
          .replace('#include <defaultnormal_vertex>', `
vec3 transformedNormal = normalize(mat3(viewMatrix) * objectNormal);`)
          .replace('#include <worldpos_vertex>', `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4(transformed, 1.0);
#endif`);
        // The shadow pass draws the same card (facing the sun's camera it would be a line; it keeps the view camera's facing, which throws a tree-shaped shadow).
      };
      material.customProgramCacheKey = () => `impostor_${entry.cells}`;
      // The card: unit width/height, its base at y = 0 (the manifest says where the base sits in the cell).
      const w = entry.spanW * 2, h = entry.spanH * 2;
      const geometry = new THREE.PlaneGeometry(w, h);
      geometry.translate(0, h * (0.5 - entry.baseFrac), 0);
      // The card's own UVs cover the first cell; the shader shifts them to the view in use. The shadow pass
      // (which knows nothing of views) then cuts the first view's silhouette.
      const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) / entry.cells);
      return { key, entry, material, geometry };
    })().catch((err) => { console.warn('impostor', key, err); return undefined; });
    loaded.set(key, p);
  }
  return p;
}
