import type { GeoBuilder } from './builder';
import type { PropKind } from '../data/types';
import type { Rng } from '../core/rng';

/** Extra runtime features a prop needs (lights, animated flames, glowing screens). */
export interface PropFeature { kind: 'fire' | 'screen' | 'lamp'; x: number; y: number; z: number; color: number; }

type PropFn = (b: GeoBuilder, r: Rng) => PropFeature[] | void;

const C = {
  wood: 0x8a6a48, darkWood: 0x5c4430, metal: 0x8a9090, darkMetal: 0x4a4e50, rust: 0xa0603a,
  canvas: 0xa89a7a, olive: 0x6b6b45, red: 0x8a3a2a, bone: 0xd8ccb0, black: 0x1c1a18, cloth: 0x7a6a58,
  cactus: 0x6a7a48, sand: 0xb09a72, screen: 0x7dffb0, fire: 0xffa040,
};

const P: Record<PropKind, PropFn> = {
  crate: (b, r) => {
    const s = 0.7 + r.next() * 0.15;
    b.box(s, s, s, 0, s / 2, 0, 'wood', C.wood, r.next() * 0.3);
    b.box(s + 0.02, 0.08, s + 0.02, 0, s * 0.15, 0, 'wood', C.darkWood);
    b.box(s + 0.02, 0.08, s + 0.02, 0, s * 0.85, 0, 'wood', C.darkWood);
    if (r.chance(0.4)) b.box(s * 0.6, s * 0.6, s * 0.6, 0.05, s + s * 0.3, 0.02, 'wood', C.wood, r.next());
  },
  barrel: (b) => {
    b.cyl(0.32, 0.32, 0.95, 10, 0, 0.475, 0, 'metal', 0x5a6a5a);
    b.cyl(0.335, 0.335, 0.05, 10, 0, 0.2, 0, 'metal', C.darkMetal);
    b.cyl(0.335, 0.335, 0.05, 10, 0, 0.75, 0, 'metal', C.darkMetal);
  },
  barrel_rust: (b, r) => {
    const tilt = r.next() * 0.15;
    b.cyl(0.32, 0.31, 0.92, 9, 0, 0.46, 0, 'rust', C.rust, { rz: tilt });
    b.cyl(0.335, 0.335, 0.05, 9, 0, 0.75, 0, 'rust', 0x6a3a20, { rz: tilt });
  },
  locker: (b) => {
    b.box(0.6, 1.9, 0.5, 0, 0.95, 0, 'metal', 0x6a7a74);
    b.box(0.02, 1.7, 0.02, 0, 0.95, 0.26, 'metal', C.darkMetal);
    for (let i = 0; i < 3; i++) b.box(0.4, 0.02, 0.02, 0, 1.6 - i * 0.06, 0.26, 'metal', C.darkMetal);
  },
  table: (b) => {
    b.box(1.2, 0.06, 0.8, 0, 0.76, 0, 'wood', C.wood);
    for (const [x, z] of [[-0.52, -0.33], [0.52, -0.33], [-0.52, 0.33], [0.52, 0.33]]) b.box(0.06, 0.74, 0.06, x, 0.37, z, 'wood', C.darkWood);
  },
  chair: (b) => {
    b.box(0.45, 0.05, 0.45, 0, 0.46, 0, 'wood', C.wood);
    b.box(0.45, 0.5, 0.05, 0, 0.72, -0.2, 'wood', C.wood);
    for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) b.box(0.04, 0.46, 0.04, x, 0.23, z, 'wood', C.darkWood);
  },
  bed: (b) => {
    b.box(0.9, 0.35, 1.9, 0, 0.18, 0, 'metal', C.darkMetal);
    b.box(0.86, 0.14, 1.84, 0, 0.42, 0, 'fabric', 0x8a8070);
    b.box(0.6, 0.1, 0.3, 0, 0.53, -0.7, 'fabric', C.bone);
    b.box(0.88, 0.04, 1.0, 0, 0.5, 0.35, 'fabric', 0x6a5a48);
  },
  terminal: (b) => {
    b.box(0.9, 0.9, 0.6, 0, 0.45, 0, 'metal', 0x7a7a6a);
    b.box(0.7, 0.55, 0.45, 0, 1.18, -0.05, 'metal', 0x6a6a5a);
    b.box(0.5, 0.36, 0.02, 0, 1.2, 0.18, 'glow', 0x1a6a40);
    b.box(0.7, 0.04, 0.25, 0, 0.92, 0.25, 'metal', C.darkMetal);
    return [{ kind: 'screen', x: 0, y: 1.2, z: 0.4, color: C.screen }];
  },
  pipe_h: (b) => {
    b.cyl(0.18, 0.18, 1.0, 8, 0, 0.6, 0, 'rust', C.rust, { rz: Math.PI / 2 });
    b.box(0.1, 0.6, 0.1, 0, 0.3, 0, 'metal', C.darkMetal);
  },
  lamp_post: (b) => {
    b.cyl(0.06, 0.08, 3.2, 6, 0, 1.6, 0, 'metal', C.darkMetal);
    b.box(0.6, 0.06, 0.06, 0.28, 3.15, 0, 'metal', C.darkMetal);
    b.box(0.25, 0.1, 0.18, 0.55, 3.08, 0, 'glow', 0xffd890);
    return [{ kind: 'lamp', x: 0.55, y: 3.0, z: 0, color: 0xffd090 }];
  },
  car_wreck: (b, r) => {
    const col = r.pick([0x7a5a3a, 0x5a6a6a, 0x8a4a3a, 0x6a6a4a]);
    b.box(1.9, 0.55, 4.0, 0, 0.55, 0, 'rust', col);
    b.box(1.7, 0.5, 2.0, 0, 1.08, -0.2, 'rust', col);
    b.box(1.6, 0.42, 0.04, 0, 1.08, 0.82, 'flat', 0x2a2e30);
    b.box(1.6, 0.42, 0.04, 0, 1.08, -1.22, 'flat', 0x2a2e30);
    for (const [x, z] of [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]]) {
      if (r.chance(0.7)) b.cyl(0.34, 0.34, 0.24, 8, x, 0.3, z, 'flat', C.black, { rz: Math.PI / 2 });
    }
    b.box(1.95, 0.12, 0.2, 0, 0.42, 2.02, 'metal', C.darkMetal);
  },
  rock: (b, r) => {
    b.rock(0.75 + r.next() * 0.3, 0, 0.4, 0, 0x8a7458, 1);
    if (r.chance(0.6)) b.rock(0.35, 0.5, 0.2, 0.3, 0x7a6448, 0);
  },
  rock_small: (b, r) => {
    b.rock(0.3 + r.next() * 0.15, 0, 0.15, 0, 0x8a7458, 0);
    b.rock(0.18, 0.25, 0.08, -0.2, 0x7a6448, 0);
  },
  tire_pile: (b, r) => {
    const n = 2 + r.int(0, 2);
    for (let i = 0; i < n; i++) b.cyl(0.38, 0.38, 0.22, 10, r.range(-0.05, 0.05), 0.11 + i * 0.22, r.range(-0.05, 0.05), 'flat', C.black);
  },
  tank: (b) => {
    b.cyl(0.9, 0.9, 2.6, 12, 0, 1.3, 0, 'rust', 0x8a6a4a);
    b.cyl(0.92, 0.92, 0.08, 12, 0, 2.0, 0, 'metal', C.darkMetal);
    b.cyl(0.92, 0.92, 0.08, 12, 0, 0.6, 0, 'metal', C.darkMetal);
    b.cyl(0.95, 0.4, 0.4, 12, 0, 2.8, 0, 'rust', 0x7a5a3a);
  },
  vault_door: (b) => {
    // Massive round pressure door (Cistern style), facing +z.
    b.cyl(1.7, 1.7, 0.5, 20, 0, 1.75, 0, 'metal', 0x8a8a7a, { rx: Math.PI / 2 });
    b.cyl(1.3, 1.3, 0.56, 20, 0, 1.75, 0, 'metal', 0x9a9a88, { rx: Math.PI / 2 });
    b.cyl(0.35, 0.35, 0.64, 10, 0, 1.75, 0, 'metal', 0xb0a060, { rx: Math.PI / 2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.box(0.24, 0.24, 0.62, Math.cos(a) * 1.5, 1.75 + Math.sin(a) * 1.5, 0, 'metal', C.darkMetal);
    }
    b.box(0.7, 0.12, 0.66, 0, 1.75, 0, 'metal', 0xb0a060);
  },
  /** A windpump: a lattice tower with a bladed vane and a tail at the top, locked side-on to the wind. */
  windpump: (b, r) => {
    const h = 7.2, col = C.darkMetal;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      // legs lean in: a thin leg from a wide foot to a narrow head
      const x0 = sx * 0.55, z0 = sz * 0.55, x1 = sx * 0.16, z1 = sz * 0.16;
      const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, h, dz);
      b.cyl(0.035, 0.045, len, 5, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, 'rust', col, { rz: -Math.atan2(dx, h), rx: Math.atan2(dz, h) });
    }
    for (let y = 1.2; y < h; y += 1.5) {
      const t = 1 - y / h, s = 0.16 + 0.39 * t;
      b.box(s * 2, 0.03, 0.03, 0, y, -s, 'rust', col); b.box(s * 2, 0.03, 0.03, 0, y, s, 'rust', col);
      b.box(0.03, 0.03, s * 2, -s, y, 0, 'rust', col); b.box(0.03, 0.03, s * 2, s, y, 0, 'rust', col);
    }
    b.box(0.3, 0.3, 0.3, 0, h + 0.1, 0, 'metal', col);
    // the vane: a disc of blades on a short axle, and the tail fin behind it
    const ry = r.range(-0.4, 0.4);
    b.at(0, 0, ry, 1, () => {
      b.cyl(0.05, 0.05, 0.5, 6, 0, h + 0.2, 0.3, 'metal', col, { rx: Math.PI / 2 });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b.box(0.22, 1.1, 0.02, Math.cos(a) * 0.65, h + 0.2 + Math.sin(a) * 0.65, 0.55, 'rust', 0x8a7a62, 0, { rz: a + Math.PI / 2 } as never);
      }
      b.box(0.02, 0.7, 1.2, 0, h + 0.3, -1.0, 'rust', 0x8a7a62);
      b.box(0.04, 0.04, 1.4, 0, h + 0.1, -0.5, 'metal', col);
    });
  },
  /** A machine the size of a big dog, sat down with its legs folded: grey plates, a single lens, a light inside it. */
  hound_dormant: (b) => {
    const grey = 0x6a6e70;
    b.box(0.6, 0.42, 1.2, 0, 0.5, 0, 'metal', grey);
    b.box(0.5, 0.2, 0.9, 0, 0.78, -0.05, 'metal', 0x5a5e60);
    b.box(0.34, 0.3, 0.42, 0, 0.72, 0.72, 'metal', grey);
    b.cyl(0.09, 0.09, 0.08, 10, 0, 0.74, 0.95, 'glow', 0x3ab0ff, { rx: Math.PI / 2 });
    for (const [x, z] of [[-0.36, 0.35], [0.36, 0.35], [-0.36, -0.4], [0.36, -0.4]]) {
      b.box(0.14, 0.18, 0.5, x, 0.2, z, 'metal', 0x5a5e60);
      b.box(0.12, 0.12, 0.3, x, 0.08, z + 0.25, 'metal', 0x4a4e50);
    }
    return [{ kind: 'lamp', x: 0, y: 0.8, z: 1.0, color: 0x3ab0ff }];
  },
  dead_tree: (b, r) => {
    b.cyl(0.08, 0.16, 2.4, 6, 0, 1.2, 0, 'wood', 0x4a3a2a, { rz: r.range(-0.1, 0.1) });
    for (let i = 0; i < 4; i++) {
      const a = r.next() * Math.PI * 2, h = 1.2 + r.next() * 1.0;
      b.cyl(0.02, 0.05, 0.9, 5, Math.cos(a) * 0.3, h, Math.sin(a) * 0.3, 'wood', 0x4a3a2a, { rz: Math.cos(a) * 0.9, rx: Math.sin(a) * 0.9 });
    }
  },
  sandbags: (b, r) => {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3; i++) {
        b.box(0.34, 0.2, 0.42, -0.34 + i * 0.34 + (row % 2) * 0.12 - 0.06, 0.1 + row * 0.2, r.range(-0.03, 0.03), 'fabric', 0x9a8a62, r.range(-0.15, 0.15));
      }
    }
  },
  shelf: (b, r) => {
    b.box(1.0, 1.9, 0.4, 0, 0.95, 0, 'wood', C.darkWood);
    for (let i = 0; i < 4; i++) {
      b.box(0.94, 0.04, 0.38, 0, 0.25 + i * 0.5, 0.02, 'wood', C.wood);
      for (let k = 0; k < 3; k++) if (r.chance(0.6)) b.box(0.12 + r.next() * 0.1, 0.18, 0.15, -0.35 + k * 0.32, 0.37 + i * 0.5, 0.05, 'flat', r.pick([0x8a5a3a, 0x6a7a6a, 0xa09060, 0x5a4a6a]));
    }
  },
  stove: (b) => {
    b.box(0.8, 0.85, 0.6, 0, 0.42, 0, 'metal', 0x5a5a52);
    b.cyl(0.08, 0.08, 1.6, 6, 0.25, 1.6, -0.2, 'rust', C.rust);
    b.box(0.5, 0.25, 0.02, 0, 0.35, 0.31, 'glow', 0x6a2a10);
  },
  fire_barrel: (b) => {
    b.cyl(0.3, 0.3, 0.9, 9, 0, 0.45, 0, 'rust', C.rust);
    b.cyl(0.2, 0.05, 0.4, 6, 0, 1.02, 0, 'glow', C.fire);
    return [{ kind: 'fire', x: 0, y: 1.2, z: 0, color: 0xff8a30 }];
  },
  campfire: (b, r) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.rock(0.14, Math.cos(a) * 0.42, 0.06, Math.sin(a) * 0.42, 0x6a5a48, 0);
    }
    for (let i = 0; i < 3; i++) b.cyl(0.05, 0.05, 0.7, 5, 0, 0.12, 0, 'wood', 0x3a2a1a, { rz: Math.PI / 2, ry: (i / 3) * Math.PI + r.next() * 0.3 });
    b.cyl(0.22, 0.02, 0.5, 6, 0, 0.35, 0, 'glow', C.fire);
    return [{ kind: 'fire', x: 0, y: 0.6, z: 0, color: 0xff8a30 }];
  },
  cactus: (b, r) => {
    const h = 1.2 + r.next() * 0.8;
    b.cyl(0.16, 0.18, h, 7, 0, h / 2, 0, 'flat', C.cactus);
    if (r.chance(0.7)) { b.cyl(0.09, 0.1, 0.5, 6, 0.28, h * 0.55, 0, 'flat', C.cactus); b.cyl(0.09, 0.09, 0.28, 6, 0.16, h * 0.42, 0, 'flat', C.cactus, { rz: Math.PI / 2 }); }
  },
  sign: (b) => {
    b.box(0.08, 1.6, 0.08, -0.5, 0.8, 0, 'wood', C.darkWood);
    b.box(0.08, 1.6, 0.08, 0.5, 0.8, 0, 'wood', C.darkWood);
    b.box(1.3, 0.6, 0.05, 0, 1.4, 0, 'paint', 0xc8b890);
  },
  counter: (b) => {
    b.box(1.0, 1.0, 0.6, 0, 0.5, 0, 'wood', C.darkWood);
    b.box(1.04, 0.06, 0.66, 0, 1.03, 0, 'wood', C.wood);
  },
  planter: (b, r) => {
    b.box(0.95, 0.5, 0.95, 0, 0.25, 0, 'metal', 0x5a6a5a);
    b.box(0.85, 0.05, 0.85, 0, 0.48, 0, 'flat', 0x3a2a1a);
    for (let i = 0; i < 5; i++) b.cyl(0.0, 0.08, 0.35 + r.next() * 0.3, 5, r.range(-0.3, 0.3), 0.65, r.range(-0.3, 0.3), 'flat', r.pick([0x5a8a3a, 0x6a9a48, 0x7a8a3a]));
  },
  machine: (b) => {
    b.box(0.9, 2.0, 0.8, 0, 1.0, 0, 'metal', 0x6a6a60);
    b.box(0.6, 0.3, 0.02, 0, 1.4, 0.41, 'glow', 0x2a5a3a);
    for (let i = 0; i < 4; i++) b.box(0.06, 0.06, 0.03, -0.25 + i * 0.16, 1.0, 0.41, 'glow', i % 2 ? 0xffa030 : 0x60ff90);
    b.cyl(0.08, 0.08, 1.2, 6, 0.3, 2.4, -0.2, 'metal', C.darkMetal);
    return [{ kind: 'screen', x: 0, y: 1.4, z: 0.6, color: 0x60ff90 }];
  },
  cot: (b) => {
    b.box(0.75, 0.08, 1.85, 0, 0.42, 0, 'fabric', C.olive);
    for (const [x, z] of [[-0.33, -0.85], [0.33, -0.85], [-0.33, 0.85], [0.33, 0.85]]) b.box(0.04, 0.42, 0.04, x, 0.21, z, 'metal', C.darkMetal);
    b.box(0.55, 0.1, 0.28, 0, 0.51, -0.7, 'fabric', C.bone);
  },
  tent: (b) => {
    // Simple A-frame
    b.box(1.6, 0.05, 2.2, 0, 0.9, 0, 'fabric', C.canvas, 0, { rz: 0.9 });
    b.box(1.6, 0.05, 2.2, 0, 0.9, 0, 'fabric', C.canvas, 0, { rz: -0.9 });
    b.box(0.06, 1.6, 0.06, 0, 0.8, 1.1, 'wood', C.darkWood);
  },
  fence_post: (b) => {
    b.box(0.1, 1.3, 0.1, 0, 0.65, 0, 'wood', C.darkWood);
  },
  pump: (b) => {
    // A well pump: cast-iron column and head on a concrete plinth, a long lever, a spout over a trough, a drive wheel.
    b.box(1.0, 0.22, 1.0, 0, 0.11, 0, 'concrete', 0x9a9488);
    b.cyl(0.11, 0.14, 1.35, 8, 0, 0.9, 0, 'metal', C.darkMetal);
    b.box(0.38, 0.32, 0.3, 0, 1.68, 0, 'metal', 0x3e4244);
    b.cyl(0.06, 0.06, 0.2, 6, 0, 1.92, 0, 'metal', C.darkMetal);
    b.box(0.95, 0.05, 0.06, 0.38, 1.82, 0, 'metal', C.darkMetal, 0, { rz: 0.32 });
    b.cyl(0.03, 0.03, 0.22, 6, 0.8, 1.98, 0, 'wood', C.wood, { rz: Math.PI / 2 });
    b.box(0.09, 0.09, 0.4, 0, 1.4, 0.3, 'metal', C.darkMetal);
    b.box(0.09, 0.3, 0.09, 0, 1.25, 0.5, 'metal', C.darkMetal);
    b.box(0.9, 0.34, 0.42, 0, 0.39, 0.62, 'rust', 0x7a5a42);
    b.box(0.82, 0.02, 0.34, 0, 0.55, 0.62, 'flat', 0x3a4a48, 0, { shadow: false });
    b.cyl(0.3, 0.3, 0.06, 10, -0.34, 1.05, 0, 'metal', C.darkMetal, { rz: Math.PI / 2 });
    b.cyl(0.07, 0.07, 0.5, 6, -0.3, 0.3, -0.3, 'rust', C.rust, { rx: Math.PI / 2 });
    b.box(0.7, 0.02, 0.5, 0.1, 0.23, -0.1, 'flat', 0x6a5a48, 0.4, { shadow: false });
  },
  debris: (b, r) => {
    for (let i = 0; i < 4; i++) b.box(r.range(0.1, 0.4), r.range(0.03, 0.12), r.range(0.1, 0.4), r.range(-0.35, 0.35), 0.04, r.range(-0.35, 0.35), r.pick(['concrete', 'rust', 'wood'] as const), r.pick([0x8a8478, 0x8a5a3a, 0x6a5a48]), r.next() * 3);
  },
};

export function buildProp(kind: PropKind, b: GeoBuilder, r: Rng): PropFeature[] {
  return P[kind](b, r) ?? [];
}

export const PROP_KINDS = Object.keys(P) as PropKind[];
