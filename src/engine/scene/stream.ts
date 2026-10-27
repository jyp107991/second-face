import * as THREE from 'three';
import { worldLayers, type GroundLayers } from '../assets/pbr';
import { openSites, sitePlacement, type SitePlacement } from '../world/sites';
import { BIOMES, CHUNK, FEATHER, buildChunk, chunkKey, regionAt, type NearSite } from '../world/terrain';
import { WorldGrid } from '../world/worldGrid';
import { heightAt, siteLevel, tileWalkable, WATER_LEVEL } from '../world/height';
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

  constructor(scene: THREE.Scene, private hooks: StreamHooks) {
    this.root.name = 'world';
    scene.add(this.root);
    this.grid.blocked = (x, y) => !tileWalkable(x, y);
    const wm = new THREE.MeshStandardMaterial({ color: 0x4a6a70, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.86 });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), wm);
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
      const layers = await this.layers();
      // Put away while it was loading (left the area, entered a cell): drop it.
      if (this.mode === 'cell' ? this.cell !== place.id : place.kind === 'cell') return undefined;
      const built = buildLocation(place.map, layers, { stripRim: place.rim === 'strip', bldBase: (this.bldBase += 4096), skirt: place.kind === 'cell' });
      const level = siteLevel(place);
      built.root.position.set(place.x, level, place.z);
      this.root.add(built.root);
      const site: LoadedSite = { place, built, level };
      this.sites.set(place.id, site);
      this.grid.addSite(place, built.grid);
      this.hooks.loaded(site);
      this.hooks.changed();
      return site;
    } finally {
      this.inFlight.delete(place.id);
    }
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
  async update(fx: number, fz: number, burst = 1): Promise<void> {
    this.water.visible = this.mode === 'open';
    this.water.position.x = fx; this.water.position.z = fz;
    if (this.mode !== 'open' || this.streaming) return;
    this.streaming = true;
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
        if (Math.max(Math.abs(x - cx), Math.abs(z - cz)) > CHUNK_KEEP) { this.chunks.delete(k); this.root.remove(m); m.geometry.dispose(); }
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
          if (++built >= burst) break outer;
        }
      }
    } finally {
      this.streaming = false;
    }
  }

  /** The ambience where a world point is: the site's, else the region's. */
  ambienceAt(x: number, z: number) {
    const s = this.siteAt(x, z);
    return s ? s.built.map.ambience : (BIOMES[regionAt(x, z)] ?? BIOMES.sallow).ambience;
  }
}
