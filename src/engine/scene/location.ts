import * as THREE from 'three';
import { GeoBuilder } from '../assets/builder';
import { applyWorldUVs } from '../assets/materials';
import { buildProp, type PropFeature } from '../assets/props';
import { Rng, hash2 } from '../core/rng';
import type { FloorKind, MapDef, WallKind } from '../data/types';
import { Grid } from './grid';
import type { SurfaceKind } from '../assets/textures';
import { buildRoofs, buildWalls, detectBuildings, type Buildings } from './buildings';
import { buildGround, groundKeys } from './ground';
import { pbrMapsSync, type GroundLayers } from '../assets/pbr';

export interface BuiltLocation {
  map: MapDef;
  grid: Grid;
  /** Added to building ids in the roof geometry so several loaded sites can hide roofs independently. */
  bldBase: number;
  /** Static merged geometry. */
  root: THREE.Group;
  features: (PropFeature & { wx: number; wz: number })[];
  bounds: THREE.Box3;
  /** The rooms the walls enclose (roofs hide while the player is in one). */
  buildings: Buildings;
}

const FLOOR_SURFACE: Record<FloorKind, SurfaceKind> = {
  sand: 'sand', dirt: 'dirt', concrete: 'concrete', metal: 'metal', wood: 'wood', grate: 'grate',
  asphalt: 'asphalt', rubble: 'rubble', tile: 'tile', water: 'water',
};
const FLOOR_TINT: Record<FloorKind, number> = {
  sand: 0xffffff, dirt: 0xffffff, concrete: 0xe8e4dc, metal: 0xd0d4d0, wood: 0xffffff, grate: 0xffffff,
  asphalt: 0xffffff, rubble: 0xffffff, tile: 0xffffff, water: 0xffffff,
};
const WALL_SURFACE: Record<WallKind, SurfaceKind> = {
  concrete: 'concrete', metal: 'metal', wood: 'wood', rock: 'rock', fence: 'wood', brick: 'brick', scrap: 'scrap', adobe: 'adobe',
};

/** Tile (x, y) → world centre. Row y grows south (+z). */
export function tileToWorld(x: number, y: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(x + 0.5, 0, y + 0.5);
}

export function worldToTile(p: THREE.Vector3): { x: number; y: number } {
  return { x: Math.floor(p.x), y: Math.floor(p.z) };
}

export function buildLocation(map: MapDef, layers?: GroundLayers, opts: { stripRim?: boolean; bldBase?: number; /** A wide ground plane round the map (places that stand alone); the open world's terrain replaces it. */ skirt?: boolean } = {}): BuiltLocation {
  const grid = new Grid(map, { stripRim: opts.stripRim });
  const bldBase = opts.bldBase ?? 0;
  const rng = new Rng(map.seed ?? 1234);
  const b = new GeoBuilder(rng);
  const features: BuiltLocation['features'] = [];
  const floorGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const buildings = detectBuildings(grid, rng);

  for (const t of grid.tiles) {
    const { x, y, def } = t;
    if (def.empty) continue;
    const wx = x + 0.5, wz = y + 0.5;
    const floor = def.floor ?? (map.ambience.indoor ? 'concrete' : 'sand');
    // Floors are one blended ground mesh (below); only water keeps a plane of its own shader.
    if (floor === 'water') b.add(floorGeo, FLOOR_SURFACE[floor], FLOOR_TINT[floor], new THREE.Matrix4().makeTranslation(wx, 0, wz), { shadow: false, jitter: 0.04 });

    if (def.wall === 'rock' || def.wall === 'fence') buildWall(b, def.wall, def.wallHeight ?? 2.6, x, y, grid, rng);

    if (def.prop) {
      b.cutawayDefault = true;
      b.at(wx, wz, ((def.propRot ?? 0) * Math.PI) / 2, 1, () => {
        for (const f of buildProp(def.prop!, b, rng)) features.push({ ...f, wx, wz });
      });
      b.cutawayDefault = false;
    }

    // Outdoor ground scatter: pebbles and dry tufts on open sand/dirt.
    if (!map.ambience.indoor && !def.wall && !def.prop && (floor === 'sand' || floor === 'dirt')) {
      const h = hash2(x, y, map.seed ?? 0);
      if (h < 0.12) b.rock(0.06 + h * 0.6, wx + (h - 0.06) * 6, 0.02, wz - (h - 0.06) * 5, 0x8a7a5a, 0, 0.5);
      else if (h > 0.9) {
        for (let i = 0; i < 4; i++) b.cyl(0, 0.03, 0.22 + i * 0.03, 3, wx + Math.cos(i * 1.7) * 0.12, 0.12, wz + Math.sin(i * 1.7) * 0.12, 'flat', 0x8a7a48, { shadow: false, rz: Math.cos(i * 2.1) * 0.4 });
      }
    }
  }

  for (const p of map.props ?? []) {
    const wx = p.x + 0.5, wz = p.y + 0.5;
    const ry = p.rad ? p.rot ?? 0 : ((p.rot ?? 0) * Math.PI) / 2;
    b.cutawayDefault = true;
    b.at(wx, wz, ry, p.scale ?? 1, () => {
      for (const f of buildProp(p.kind, b, rng)) {
        const c = Math.cos(ry), s = Math.sin(ry);
        features.push({ ...f, x: f.x * c + f.z * s, z: -f.x * s + f.z * c, wx, wz });
      }
    });
    b.cutawayDefault = false;
  }

  buildWalls(b, grid, map, buildings, rng);
  buildRoofs(b, grid, map, buildings, rng, bldBase);
  const root = b.build();
  root.add(buildGround(map, grid, layers));

  // Outdoor maps standing alone: a wide ground skirt beyond the playable bounds that fades into fog, in the outside surface.
  if (!map.ambience.indoor && opts.skirt !== false) {
    const outside = pbrMapsSync(groundKeys(map, grid)[0]);
    const skirtMat = outside
      ? new THREE.MeshStandardMaterial({ map: outside.map, normalMap: outside.normalMap, roughnessMap: outside.arm, aoMap: outside.arm, roughness: 1, metalness: 0, color: 0xd8d0c0 })
      : new THREE.MeshStandardMaterial({ color: 0x9a8462, roughness: 1 });
    const skirtGeo = new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2);
    applyWorldUVs(skirtGeo, 3);
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.set(grid.width / 2, -0.02, grid.height / 2);
    skirt.receiveShadow = true;
    root.add(skirt);
  }

  const bounds = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(grid.width, 3, grid.height));
  return { map, grid, bldBase, root, features, bounds, buildings };
}

function buildWall(b: GeoBuilder, kind: WallKind, h: number, x: number, y: number, grid: Grid, rng: Rng): void {
  const wx = x + 0.5, wz = y + 0.5;
  const surf = WALL_SURFACE[kind];
  const isWall = (dx: number, dy: number) => !!grid.get(x + dx, y + dy)?.def.wall;
  switch (kind) {
    case 'rock': {
      // Cliff/boulder walls: clustered rocks instead of a box.
      b.cutawayDefault = true;
      b.rock(0.8, wx, h * 0.3, wz, 0x8a7458, 1, 1.0);
      b.rock(0.6, wx + rng.range(-0.3, 0.3), h * 0.65, wz + rng.range(-0.3, 0.3), 0x7a6448, 0, 1.0);
      b.cutawayDefault = false;
      return;
    }
    case 'fence': {
      b.box(0.1, h, 0.1, wx, h / 2, wz, 'wood', 0x5c4430, rng.range(-0.05, 0.05));
      if (isWall(1, 0)) for (const yy of [0.35, 0.9]) b.box(1.0, 0.08, 0.04, wx + 0.5, yy * (h / 1.3), wz, 'wood', 0x7a5c3c, 0, { cutaway: true });
      if (isWall(0, 1)) for (const yy of [0.35, 0.9]) b.box(0.04, 0.08, 1.0, wx, yy * (h / 1.3), wz + 0.5, 'wood', 0x7a5c3c, 0, { cutaway: true });
      return;
    }
    default:
      // Built walls are the buildings module's.
      b.box(1, h, 1, wx, h / 2, wz, surf, 0xffffff, 0, { cutaway: true });
  }
}
