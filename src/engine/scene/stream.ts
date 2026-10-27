import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { worldLayers, type GroundLayers } from '../assets/pbr';
import { openSites, sitePlacement, type SitePlacement } from '../world/sites';
import { BIOMES, CHUNK, FAR, FEATHER, buildChunk, buildFar, chunkKey, regionAt, type NearSite } from '../world/terrain';
import { WorldGrid } from '../world/worldGrid';
import { heightAt, siteLevel, tileWalkable, WATER_LEVEL } from '../world/height';
import { Flora } from '../world/flora';
import { impostorView } from '../world/impostors';
import { loadModel, loadModelManifest } from '../assets/models';
import { outsideKey } from './ground';
import { Grid } from './grid';
import { buildLocation, type BuiltLocation } from './location';

/**
 * The world round the player: open sites stream in as they come within reach and out again as they fall behind;
 * terrain chunks fill the ground between them. A cell (an enclosed place) replaces the open world while you are
 * in it and gives it back when you leave. One site is built per update at most, so a frame is never swamped.
 */
export interface LoadedSite { place: SitePlacement; built: BuiltLocation; /** The pad's height: the place's ground level in the world. */ level: number }

export interface StreamHooks {
  /** Fetch what the site's people wear before it is built (clothing proxies). */
  prepare(place: SitePlacement): Promise<void>;
  loaded(site: LoadedSite): void;
  unloading(site: LoadedSite): void;
  changed(): void;
}

const LOAD_R = 150;
const UNLOAD_R = 230;
const CHUNK_RING = 1;
const CHUNK_KEEP = 2;

export class WorldScene {
  readonly root = new THREE.Group();
  readonly grid = new WorldGrid();
  readonly sites = new Map<string, LoadedSite>();
  private chunks = new Map<string, THREE.Mesh>();
  private inFlight = new Set<string>();
  private layersP?: Promise<GroundLayers | undefined>;
  private outside = new Map<string, string>();
  private bldBase = 0;
  mode: 'open' | 'cell' = 'open';
  cell?: string;
  private streaming = false;

  /** The sea and the drowned ground: one plane at the water level, following the focus. */
  private water: THREE.Mesh;
  /** What grows and lies on the land round the loaded chunks. */
  readonly flora: Flora;
  /** Coarse ground beyond the near chunks, rebuilt as the player moves on. */
  private far?: THREE.Mesh;
  private farAt = { x: NaN, z: NaN };

  constructor(scene: THREE.Scene, private hooks: StreamHooks) {
    this.root.name = 'world';
    scene.add(this.root);
    this.flora = new Flora(this.root);
    void loadModelManifest();
    this.grid.blocked = (x, y) => !tileWalkable(x, y) || this.flora.obstacle(x, y);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), waterMaterial());
    this.water.position.y = WATER_LEVEL;
    this.water.receiveShadow = true;
    this.water.name = 'water';
    this.root.add(this.water);
  }

  /** Ground height at a world point (a cell is flat). */
  heightAt(x: number, z: number): number { return this.mode === 'cell' ? 0 : heightAt(x, z); }

  /** The ground meshes a tap can land on (the places' floors and the terrain). */
  groundMeshes(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [...this.chunks.values()];
    for (const s of this.sites.values()) { const g = s.built.root.getObjectByName('ground'); if (g) out.push(g); }
    return out;
  }

  siteAt(x: number, z: number): LoadedSite | undefined {
    const s = this.grid.siteAt(x, z);
    return s ? this.sites.get(s.place.id) : undefined;
  }

  /** A site by id if it is loaded. */
  site(id: string): LoadedSite | undefined { return this.sites.get(id); }

  /** The world's one surface set (built on first use). */
  private layers(): Promise<GroundLayers | undefined> {
    return (this.layersP ??= worldLayers());
  }

  /** The surface a place's ground is made of at its edge (what the terrain runs up to). */
  private outsideKeyOf(place: SitePlacement): string {
    let k = this.outside.get(place.id);
    if (!k) { k = outsideKey(place.map, new Grid(place.map, { stripRim: place.rim === 'strip' })); this.outside.set(place.id, k); }
    return k;
  }

  /** Enter a cell: the open world is put away and the cell built. */
  async enterCell(id: string): Promise<LoadedSite | undefined> {
    const place = sitePlacement(id);
    if (!place) return undefined;
    for (const sid of [...this.sites.keys()]) if (sid !== id) this.unload(sid);
    this.clearChunks();
    this.mode = 'cell';
    this.cell = id;
    return this.ensureSite(place);
  }

  /** Back to the open world: the cell goes; sites and ground stream round the player again. */
  leaveCell(): void {
    if (this.mode !== 'cell') return;
    if (this.cell) this.unload(this.cell);
    this.cell = undefined;
    this.mode = 'open';
  }

  /** Have a site standing now (arrival): built if it is not. */
  async ensureSite(place: SitePlacement): Promise<LoadedSite | undefined> {
    const have = this.sites.get(place.id);
    if (have) return have;
    if (this.inFlight.has(place.id)) {
      while (this.inFlight.has(place.id)) await new Promise((r) => setTimeout(r, 30));
      return this.sites.get(place.id);
    }
    return this.build(place);
  }

  private async build(place: SitePlacement): Promise<LoadedSite | undefined> {
    this.inFlight.add(place.id);
    try {
      await this.hooks.prepare(place);
      await loadModelManifest();
      const layers = await this.layers();
      // Put away while it was loading (left the area, entered a cell): drop it.
      if (this.mode === 'cell' ? this.cell !== place.id : place.kind === 'cell') return undefined;
      const built = buildLocation(place.map, layers, { stripRim: place.rim === 'strip', bldBase: (this.bldBase += 4096), skirt: place.kind === 'cell' });
      const level = siteLevel(place);
      built.root.position.set(place.x, level, place.z);
      this.root.add(built.root);
      const site: LoadedSite = { place, built, level };
      this.sites.set(place.id, site);
      void this.attachModelProps(site);
      this.grid.addSite(place, built.grid);
      this.hooks.loaded(site);
      this.hooks.changed();
      return site;
    } finally {
      this.inFlight.delete(place.id);
    }
  }

  /** The place's model props, once their models are loaded: one instanced mesh per model variant and part. */
  private async attachModelProps(site: LoadedSite): Promise<void> {
    const byKey = new Map<string, typeof site.built.modelProps>();
    for (const p of site.built.modelProps) { let l = byKey.get(p.key); if (!l) { l = []; byKey.set(p.key, l); } l.push(p); }
    if (!byKey.size) return;
    const models = await Promise.all([...byKey.keys()].map((k) => loadModel(k)));
    if (this.sites.get(site.place.id) !== site) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const buckets = new Map<string, { material: THREE.Material; geos: THREE.BufferGeometry[]; key: string; count: number }>();
    let i = 0;
    for (const [, props] of byKey) {
      const model = models[i++];
      if (!model) continue;
      // Group by variant.
      const byVariant = new Map<number, THREE.Matrix4[]>();
      for (const p of props) {
        const v = Math.min(model.variants.length - 1, Math.floor(p.pick * model.variants.length));
        const variant = model.variants[v];
        let l = byVariant.get(v); if (!l) { l = []; byVariant.set(v, l); }
        for (let k = 0; k < p.stack; k++) {
          q.setFromAxisAngle(up, p.ry + (k ? (p.pick * 7 + k) % 1.2 : 0));
          m.compose(pos.set(p.x, k * variant.height * p.scale * 0.92, p.z), q, sc.set(p.scale, p.scale, p.scale));
          l.push(m.clone());
        }
      }
      // A place's props never move: everything that shares a material is merged into one mesh, so a town of
      // sixty props costs a dozen draws, not a hundred.
      for (const [v, mats] of byVariant) {
        for (const part of model.variants[v].parts) {
          const id = (part.material as THREE.Material).uuid;
          let bucket = buckets.get(id);
          if (!bucket) { bucket = { material: part.material, geos: [], key: model.key, count: 0 }; buckets.set(id, bucket); }
          for (const mm of mats) { bucket.geos.push(part.geometry.clone().applyMatrix4(mm)); bucket.count++; }
        }
      }
    }
    for (const b of buckets.values()) {
      const g = mergeGeometries(b.geos);
      for (const x of b.geos) x.dispose();
      if (!g) continue;
      const mesh = new THREE.Mesh(g, b.material);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.name = `prop ${b.key}`;
      mesh.userData.count = b.count;
      site.built.root.add(mesh);
    }
    this.hooks.changed();
  }

  private unload(id: string): void {
    const s = this.sites.get(id);
    if (!s) return;
    this.hooks.unloading(s);
    this.sites.delete(id);
    this.grid.removeSite(id);
    this.root.remove(s.built.root);
    s.built.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    this.hooks.changed();
  }

  private clearChunks(): void {
    for (const m of this.chunks.values()) { this.root.remove(m); m.geometry.dispose(); }
    this.chunks.clear();
    this.flora.clear();
  }

  /** Whether the ring of ground round a point is built (what a fade should wait for). */
  ringComplete(fx: number, fz: number): boolean {
    if (this.mode !== 'open') return true;
    const cx = Math.floor(fx / CHUNK), cz = Math.floor(fz / CHUNK);
    for (let dz = -CHUNK_RING; dz <= CHUNK_RING; dz++) for (let dx = -CHUNK_RING; dx <= CHUNK_RING; dx++) if (!this.chunks.has(chunkKey(cx + dx, cz + dz))) return false;
    return true;
  }

  /** Build everything within reach of a point before going on (arrivals: the ground is there when the fade lifts). */
  async fill(fx: number, fz: number): Promise<void> {
    for (let i = 0; i < 24 && !this.ringComplete(fx, fz); i++) await this.update(fx, fz, 4);
  }

  /** Stream round a focus (the player). Builds at most one site and `burst` chunks per call. */
  /** The water's clock (ripples move) and the camera's yaw (tree cards turn to face it). */
  tick(time: number, camYaw: number): void { waterTime.value = time; impostorView.yaw = camYaw; }

  async update(fx: number, fz: number, burst = 1): Promise<void> {
    this.water.visible = this.mode === 'open';
    this.water.position.x = fx; this.water.position.z = fz;
    if (this.far) this.far.visible = this.mode === 'open';
    if (this.mode !== 'open' || this.streaming) return;
    this.streaming = true;
    // The far ring: remade once the player is a quarter of it from where it was made.
    if (Math.abs(fx - this.farAt.x) > FAR / 4 || Math.abs(fz - this.farAt.z) > FAR / 4 || !this.far) {
      if (this.far) { this.root.remove(this.far); this.far.geometry.dispose(); }
      this.far = buildFar(fx, fz);
      this.farAt = { x: fx, z: fz };
      this.root.add(this.far);
    }
    try {
      // Sites: by distance from the focus to the site's rectangle.
      const dist = (p: SitePlacement) => Math.hypot(Math.max(p.x - fx, 0, fx - (p.x + p.w)), Math.max(p.z - fz, 0, fz - (p.z + p.h)));
      for (const s of [...this.sites.values()]) if (dist(s.place) > UNLOAD_R) this.unload(s.place.id);
      const want = openSites().filter((p) => !this.sites.has(p.id) && dist(p) < LOAD_R).sort((a, b) => dist(a) - dist(b));
      if (want.length) await this.build(want[0]);
      // Ground chunks round the focus.
      const cx = Math.floor(fx / CHUNK), cz = Math.floor(fz / CHUNK);
      for (const [k, m] of this.chunks) {
        const [x, z] = k.split(',').map(Number);
        if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) > CHUNK_KEEP) { this.chunks.delete(k); this.root.remove(m); m.geometry.dispose(); this.flora.removeChunk(x, z); }
      }
      let built = 0;
      outer: for (let r = 0; r <= CHUNK_RING; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const k = chunkKey(cx + dx, cz + dz);
          if (this.chunks.has(k)) continue;
          const layers = await this.layers();
          if (this.mode !== 'open') break outer;
          const X = (cx + dx) * CHUNK, Z = (cz + dz) * CHUNK;
          const near: NearSite[] = openSites()
            .filter((p) => p.x < X + CHUNK + FEATHER && p.x + p.w > X - FEATHER && p.z < Z + CHUNK + FEATHER && p.z + p.h > Z - FEATHER)
            .map((p) => ({ x: p.x, z: p.z, w: p.w, h: p.h, key: this.outsideKeyOf(p) }));
          const m = buildChunk(cx + dx, cz + dz, layers, near);
          this.chunks.set(k, m);
          this.root.add(m);
          void this.flora.addChunk(cx + dx, cz + dz).then(() => this.flora.rebuild(fx, fz));
          if (++built >= burst) break outer;
        }
      }
    } finally {
      this.streaming = false;
      this.flora.rebuild(fx, fz);
    }
  }

  /** The ambience where a world point is: the site's, else the region's. */
  ambienceAt(x: number, z: number) {
    const s = this.siteAt(x, z);
    return s ? s.built.map.ambience : (BIOMES[regionAt(x, z)] ?? BIOMES.sallow).ambience;
  }
}

const waterTime = { value: 0 };

/**
 * Still water seen from above: a dark, slightly see-through surface whose normal is stirred by two drifting
 * noise fields, so the sun lays a moving glint across it and the shore's edge wobbles.
 */
function waterMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0x33555c, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.8, depthWrite: false });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWUv = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; varying vec2 vWUv;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float wHeight(vec2 p) { return wNoise(p * 0.9 + vec2(uTime * 0.05, uTime * 0.03)) * 0.6 + wNoise(p * 2.7 - vec2(uTime * 0.07, -uTime * 0.04)) * 0.3 + wNoise(p * 7.0 + vec2(-uTime * 0.11, uTime * 0.09)) * 0.1; }`)
      .replace('#include <normal_fragment_maps>', `
float wE = 0.25;
float wH0 = wHeight(vWUv), wHx = wHeight(vWUv + vec2(wE, 0.0)), wHz = wHeight(vWUv + vec2(0.0, wE));
vec3 wN = normalize(vec3((wH0 - wHx) * 1.6, wE, (wH0 - wHz) * 1.6));
normal = normalize(normal * 0.35 + wN * 0.65);`)
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= 0.92 + 0.16 * wNoise(vWUv * 0.08 + uTime * 0.01);');
  };
  m.customProgramCacheKey = () => 'water_surface';
  return m;
}
