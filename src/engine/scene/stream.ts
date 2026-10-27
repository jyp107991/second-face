import * as THREE from 'three';
import { groundLayersFor, type GroundLayers } from '../assets/pbr';
import { openSites, sitePlacement, type SitePlacement } from '../world/sites';
import { BIOMES, CHUNK, buildChunk, chunkKey, regionAt } from '../world/terrain';
import { WorldGrid } from '../world/worldGrid';
import { groundKeys } from './ground';
import { Grid } from './grid';
import { buildLocation, type BuiltLocation } from './location';

/**
 * The world round the player: open sites stream in as they come within reach and out again as they fall behind;
 * terrain chunks fill the ground between them. A cell (an enclosed place) replaces the open world while you are
 * in it and gives it back when you leave. One site is built per update at most, so a frame is never swamped.
 */
export interface LoadedSite { place: SitePlacement; built: BuiltLocation }

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
  private layers = new Map<string, Promise<GroundLayers | undefined>>();
  private bldBase = 0;
  mode: 'open' | 'cell' = 'open';
  cell?: string;
  private streaming = false;

  constructor(scene: THREE.Scene, private hooks: StreamHooks) {
    this.root.name = 'world';
    scene.add(this.root);
  }

  siteAt(x: number, z: number): LoadedSite | undefined {
    const s = this.grid.siteAt(x, z);
    return s ? this.sites.get(s.place.id) : undefined;
  }

  /** A site by id if it is loaded. */
  site(id: string): LoadedSite | undefined { return this.sites.get(id); }

  private regionLayers(region: string): Promise<GroundLayers | undefined> {
    let p = this.layers.get(region);
    if (!p) { p = groundLayersFor((BIOMES[region] ?? BIOMES.sallow).layers); this.layers.set(region, p); }
    return p;
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
      const probe = new Grid(place.map, { stripRim: place.rim === 'strip' });
      const layers = await groundLayersFor(groundKeys(place.map, probe)).catch(() => undefined);
      // Put away while it was loading (left the area, entered a cell): drop it.
      if (this.mode === 'cell' ? this.cell !== place.id : place.kind === 'cell') return undefined;
      const built = buildLocation(place.map, layers, { stripRim: place.rim === 'strip', bldBase: (this.bldBase += 4096) });
      built.root.position.set(place.x, 0, place.z);
      this.root.add(built.root);
      const site: LoadedSite = { place, built };
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

  /** Stream round a focus (the player). Builds at most one site and one chunk per call. */
  async update(fx: number, fz: number): Promise<void> {
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
      outer: for (let r = 0; r <= CHUNK_RING; r++) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const k = chunkKey(cx + dx, cz + dz);
          if (this.chunks.has(k)) continue;
          const region = regionAt((cx + dx) * CHUNK + CHUNK / 2, (cz + dz) * CHUNK + CHUNK / 2);
          const layers = await this.regionLayers(region);
          if (this.mode !== 'open') break outer;
          const m = buildChunk(cx + dx, cz + dz, () => layers);
          this.chunks.set(k, m);
          this.root.add(m);
          break outer;
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
