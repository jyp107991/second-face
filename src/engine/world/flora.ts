import * as THREE from 'three';
import { WORLD_W } from '../../content/world/sites';
import { loadModel, modelEntries, type Model } from '../assets/models';
import { impostorEntries, loadImpostor, loadImpostorManifest, type Impostor } from './impostors';
import { Rng } from '../core/rng';
import { heightAt, PAD, slopeAt, WATER_LEVEL } from './height';
import { openSites } from './sites';
import { CHUNK, chunkKey, fbm, regionAt } from './terrain';
import { ways, wayWeight } from './ways';

/**
 * What grows and lies on the land: per region, which models and how thickly, in patches (the land is never evenly
 * sown), thicker where water is near, never on a place's pad, a way, the water or a cliff. Each loaded chunk
 * places its own instances; one instanced mesh per model part draws them all, rebuilt as chunks come and go.
 * Trees, boulders and stumps block walking.
 */
interface Rule { key: string; /** Instances per 100 m². */ density: number; scale: [number, number]; /** Only on low ground by the water. */ wet?: boolean; /** How patchy (0 even, 1 in clumps). */ patch?: number }

const RULES: Record<string, Rule[]> = {
  sallow: [
    { key: 'shrub_dry_a', density: 2.0, scale: [0.9, 1.6], patch: 0.6 }, { key: 'shrub_dry_b', density: 1.6, scale: [1.0, 1.7], patch: 0.6 }, { key: 'shrub_dry_c', density: 1.4, scale: [0.9, 1.5], patch: 0.5 },
    { key: 'dry_branches', density: 0.8, scale: [0.9, 1.5], patch: 0.5 }, { key: 'quiver_tree', density: 0.2, scale: [0.9, 1.3], patch: 0.6 }, { key: 'quiver_tree_2', density: 0.16, scale: [0.8, 1.2], patch: 0.6 }, { key: 'thorn_tree', density: 0.12, scale: [0.8, 1.3], patch: 0.7 },
    { key: 'dead_quiver', density: 0.06, scale: [0.9, 1.2] }, { key: 'stones', density: 0.8, scale: [0.8, 1.6], patch: 0.4 }, { key: 'rock_small', density: 0.6, scale: [0.7, 1.5], patch: 0.4 },
    { key: 'boulder_desert', density: 0.06, scale: [0.6, 1.2], patch: 0.5 }, { key: 'dead_tree', density: 0.03, scale: [0.9, 1.3] }, { key: 'grass', density: 3, scale: [0.8, 1.3], wet: true, patch: 0.3 },
  ],
  glass_flats: [
    { key: 'shrub_dry_b', density: 0.14, scale: [0.7, 1.1], patch: 0.7 }, { key: 'dry_branches', density: 0.2, scale: [0.8, 1.3], patch: 0.6 }, { key: 'stones', density: 0.3, scale: [0.8, 1.5], patch: 0.4 },
    { key: 'boulder_desert', density: 0.03, scale: [0.6, 1.2], patch: 0.6 }, { key: 'quiver_tree', density: 0.04, scale: [0.9, 1.2], patch: 0.7 }, { key: 'thorn_tree', density: 0.03, scale: [0.8, 1.2], patch: 0.8 }, { key: 'dead_tree', density: 0.02, scale: [0.9, 1.3] },
    { key: 'grass', density: 2, scale: [0.8, 1.2], wet: true, patch: 0.3 },
  ],
  rail_corridor: [
    { key: 'grass', density: 6, scale: [0.8, 1.4], patch: 0.35 }, { key: 'weed', density: 1.5, scale: [0.8, 1.3], patch: 0.5 }, { key: 'shrub_dry_a', density: 0.4, scale: [0.8, 1.3], patch: 0.6 },
    { key: 'shrub_dry_c', density: 0.35, scale: [0.8, 1.2], patch: 0.6 }, { key: 'shrub_green', density: 0.35, scale: [0.8, 1.3], patch: 0.7 }, { key: 'bush_tree', density: 0.18, scale: [0.9, 1.3], patch: 0.6 }, { key: 'tree_small', density: 0.14, scale: [0.9, 1.3], patch: 0.7 }, { key: 'thorn_tree', density: 0.08, scale: [0.8, 1.2], patch: 0.7 },
    { key: 'dead_tree', density: 0.03, scale: [0.9, 1.3] }, { key: 'stump', density: 0.04, scale: [0.9, 1.3] }, { key: 'boulder', density: 0.03, scale: [0.5, 1.0], patch: 0.5 }, { key: 'rock_small', density: 0.3, scale: [0.7, 1.4], patch: 0.4 },
  ],
  drowned_shore: [
    { key: 'grass', density: 4, scale: [0.8, 1.4], patch: 0.4 }, { key: 'nettle', density: 1, scale: [0.8, 1.3], patch: 0.6 }, { key: 'weed', density: 1.2, scale: [0.8, 1.3], patch: 0.5 },
    { key: 'shrub_green', density: 0.3, scale: [0.8, 1.3], patch: 0.7 }, { key: 'broadleaf', density: 0.12, scale: [0.9, 1.3], patch: 0.6 }, { key: 'tree_small', density: 0.1, scale: [0.9, 1.3], patch: 0.7 }, { key: 'dead_tree', density: 0.04, scale: [0.9, 1.3] },
  ],
  meridian: [{ key: 'grass', density: 2, scale: [0.8, 1.2], patch: 0.5 }, { key: 'weed', density: 1.5, scale: [0.8, 1.3], patch: 0.5 }, { key: 'nettle', density: 0.5, scale: [0.8, 1.2], patch: 0.6 }],
  teeth: [
    { key: 'fir', density: 0.6, scale: [0.7, 1.3], patch: 0.5 }, { key: 'stones', density: 0.6, scale: [0.8, 1.6], patch: 0.3 }, { key: 'rock_small', density: 0.6, scale: [0.8, 1.6], patch: 0.3 },
    { key: 'boulder', density: 0.1, scale: [0.5, 1.1], patch: 0.4 }, { key: 'rock_moss', density: 0.1, scale: [0.9, 1.5], patch: 0.5 }, { key: 'grass', density: 1.5, scale: [0.7, 1.1], patch: 0.6 },
  ],
  ashlands: [
    { key: 'dry_branches', density: 0.3, scale: [0.8, 1.4], patch: 0.5 }, { key: 'rock_ash', density: 0.3, scale: [0.8, 1.8], patch: 0.4 }, { key: 'boulder_desert', density: 0.06, scale: [0.6, 1.2], patch: 0.5 },
    { key: 'dead_quiver', density: 0.05, scale: [0.9, 1.3] }, { key: 'dead_tree', density: 0.03, scale: [0.9, 1.4] },
  ],
  northern_wet: [
    { key: 'grass', density: 5, scale: [0.8, 1.4], patch: 0.35 }, { key: 'fern', density: 1.5, scale: [0.8, 1.4], patch: 0.6 }, { key: 'nettle', density: 1, scale: [0.8, 1.3], patch: 0.6 },
    { key: 'celandine', density: 2, scale: [0.8, 1.3], patch: 0.6 }, { key: 'shrub_green', density: 0.6, scale: [0.8, 1.4], patch: 0.6 }, { key: 'broadleaf', density: 0.3, scale: [0.9, 1.4], patch: 0.6 },
    { key: 'big_tree', density: 0.12, scale: [0.9, 1.3], patch: 0.6 }, { key: 'tree_small', density: 0.25, scale: [0.9, 1.3], patch: 0.6 }, { key: 'fir', density: 0.2, scale: [0.8, 1.3], patch: 0.6 }, { key: 'stump', density: 0.06, scale: [0.9, 1.3] },
    { key: 'rock_moss', density: 0.12, scale: [0.9, 1.5], patch: 0.5 }, { key: 'boulder', density: 0.04, scale: [0.5, 1.0], patch: 0.5 },
  ],
};

interface Placed { key: string; /** Variant of a model; -1 for an impostor card. */ v: number; m: THREE.Matrix4 }
interface ChunkFlora { placed: Placed[]; obstacles: Set<number> }

export class Flora {
  private chunks = new Map<string, ChunkFlora>();
  private meshes = new Map<string, THREE.InstancedMesh[]>();
  private models = new Map<string, Model>();
  private impostors = new Map<string, Impostor>();
  private dirty = false;
  private pending = 0;
  /** Where the last draw was built round; a move of a few tiles rebuilds it. */
  private at = { x: NaN, z: NaN };

  constructor(private root: THREE.Group) {}

  /** How far from the player growth is drawn: the view spans a hundred metres at most. */
  static readonly DRAW_R = 120;

  /** Place a chunk's growth (its models fetched first); the draw is rebuilt once it lands. */
  async addChunk(cx: number, cz: number): Promise<void> {
    const key = chunkKey(cx, cz);
    if (this.chunks.has(key)) return;
    const x0 = cx * CHUNK, z0 = cz * CHUNK;
    const region = regionAt(x0 + CHUNK / 2, z0 + CHUNK / 2);
    await loadImpostorManifest();
    // A tree with baked views is a card; everything else is a mesh.
    const rules = (RULES[region] ?? []).filter((r) => impostorEntries()[r.key] || modelEntries()[r.key]);
    this.pending++;
    try {
      const things = await Promise.all(rules.map((r) => (impostorEntries()[r.key] ? loadImpostor(r.key) : loadModel(r.key))));
      if (this.chunks.has(key)) return;
      const placed: Placed[] = [];
      const obstacles = new Set<number>();
      const rng = new Rng(cx * 73856093 ^ cz * 19349663 ^ 4111);
      const sites = openSites().filter((p) => p.x - PAD < x0 + CHUNK && p.x + p.w + PAD > x0 && p.z - PAD < z0 + CHUNK && p.z + p.h + PAD > z0);
      const near = ways().filter((w) => w.bbox[0] < x0 + CHUNK && w.bbox[2] > x0 && w.bbox[1] < z0 + CHUNK && w.bbox[3] > z0);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      rules.forEach((rule, ri) => {
        const thing = things[ri];
        if (!thing) return;
        const imp = 'material' in thing ? (thing as Impostor) : undefined;
        const model = imp ? undefined : (thing as Model);
        if (imp) this.impostors.set(rule.key, imp); else if (model) this.models.set(rule.key, model);
        const kind = imp ? 'tree' : model!.entry.kind;
        const blocks = imp ? imp.entry.blocks : model!.entry.blocks;
        const n = Math.round(rule.density * (CHUNK * CHUNK) / 100);
        const isGrass = kind === 'grass';
        for (let k = 0; k < n; k++) {
          const wx = x0 + rng.next() * CHUNK, wz = z0 + rng.next() * CHUNK;
          // Patches: the land is sown in clumps, with a different grain for each kind.
          if (rule.patch) { const v = fbm(wx * 0.03 + ri * 50, wz * 0.03 - ri * 30, 2100 + ri * 11, 2); if (rng.next() < rule.patch && v < 0.5 + rule.patch * 0.12) continue; }
          const h = heightAt(wx, wz);
          if (h < WATER_LEVEL + 0.25) continue;
          if (rule.wet ? h > WATER_LEVEL + 2.5 : false) continue;
          if (sites.some((p) => wx > p.x - PAD && wx < p.x + p.w + PAD && wz > p.z - PAD && wz < p.z + p.h + PAD)) continue;
          if (near.some((w) => wayWeight(w, wx, wz) > (isGrass ? 0.5 : 0.02))) continue;
          if (!isGrass && slopeAt(wx, wz) > (kind === 'rock' ? 1.2 : 0.85)) continue;
          const s = rule.scale[0] + rng.next() * (rule.scale[1] - rule.scale[0]);
          const v = model ? Math.floor(rng.next() * model.variants.length) : -1;
          q.setFromAxisAngle(up, rng.next() * Math.PI * 2);
          m.compose(pos.set(wx, h - 0.04, wz), q, sc.set(s, s, s));
          placed.push({ key: rule.key, v, m: m.clone() });
          if (blocks) {
            const r = Math.max(0.3, (model ? model.variants[v].radius : imp!.entry.radius) * s * 0.55);
            for (let tz = Math.floor(wz - r); tz <= Math.floor(wz + r); tz++) for (let tx = Math.floor(wx - r); tx <= Math.floor(wx + r); tx++) obstacles.add(tz * WORLD_W + tx);
          }
        }
      });
      this.chunks.set(key, { placed, obstacles });
      this.dirty = true;
    } finally {
      this.pending--;
    }
  }

  removeChunk(cx: number, cz: number): void {
    if (this.chunks.delete(chunkKey(cx, cz))) this.dirty = true;
  }

  clear(): void {
    this.chunks.clear();
    this.dirty = true;
    this.rebuild();
  }

  /** A tile something solid stands on. */
  obstacle(tx: number, tz: number): boolean {
    const c = this.chunks.get(chunkKey(Math.floor(tx / CHUNK), Math.floor(tz / CHUNK)));
    return !!c && c.obstacles.has(tz * WORLD_W + tx);
  }

  /** Redraw when chunks have changed or the player has moved on: one instanced mesh per model part, of what lies within reach. */
  rebuild(fx?: number, fz?: number): void {
    const moved = fx !== undefined && fz !== undefined && (Math.abs(fx - this.at.x) > 24 || Math.abs(fz - this.at.z) > 24);
    if (!this.dirty && !moved) return;
    if (fx !== undefined && fz !== undefined) this.at = { x: fx, z: fz };
    this.dirty = false;
    const cx = this.at.x, cz = this.at.z, r2 = Flora.DRAW_R * Flora.DRAW_R;
    const byKey = new Map<string, THREE.Matrix4[]>();
    for (const c of this.chunks.values()) for (const p of c.placed) {
      if (!Number.isNaN(cx)) { const e = p.m.elements; const dx = e[12] - cx, dz = e[14] - cz; if (dx * dx + dz * dz > r2) continue; }
      const id = `${p.key}#${p.v}`;
      let l = byKey.get(id); if (!l) { l = []; byKey.set(id, l); } l.push(p.m);
    }
    for (const [key, meshes] of this.meshes) {
      if (!byKey.has(key)) { for (const im of meshes) { this.root.remove(im); im.dispose(); } this.meshes.delete(key); }
    }
    for (const [id, mats] of byKey) {
      const [key, vs] = id.split('#');
      const imp = vs === '-1' ? this.impostors.get(key) : undefined;
      const model = imp ? undefined : this.models.get(key);
      const variant = model?.variants[Number(vs)];
      if (!imp && !variant) continue;
      let meshes = this.meshes.get(id);
      if (!meshes || meshes[0].instanceMatrix.count < mats.length) {
        if (meshes) for (const im of meshes) { this.root.remove(im); im.dispose(); }
        const cap = Math.ceil(mats.length * 1.3) + 16;
        const parts = imp ? [{ geometry: imp.geometry, material: imp.material }] : variant!.parts;
        meshes = parts.map((part) => {
          const im = new THREE.InstancedMesh(part.geometry, part.material, cap);
          im.castShadow = !!imp || model!.entry.kind === 'tree';
          im.receiveShadow = true;
          if (imp) im.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: (imp.material as THREE.MeshStandardMaterial).map, alphaTest: 0.45, side: THREE.DoubleSide });
          im.name = `flora ${id}`;
          im.frustumCulled = false;
          this.root.add(im);
          return im;
        });
        this.meshes.set(id, meshes);
      }
      for (const im of meshes) {
        for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
        im.count = mats.length;
        im.instanceMatrix.needsUpdate = true;
      }
    }
  }

  get count(): number { let n = 0; for (const c of this.chunks.values()) n += c.placed.length; return n; }
}
