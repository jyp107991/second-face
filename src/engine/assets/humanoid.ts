import * as THREE from 'three';
import { defaultAppearance, type Appearance } from '../data/appearance';
import { HumanFigure } from './human/figure';
import type { GarmentLook } from './human/cloth';
import { makeSkinTexture } from './human/skin';
import { outfitHairMode } from '../data/outfits';
import { addGear, type GearLook } from './human/gear';

/**
 * What a character wears. Suits/shoes are the base full outfits; `layers` are separate garments (see
 * data/garments.ts) worn inner to outer. `grime`/`wear` apply to every garment that does not set its own.
 */
export interface Outfit {
  suit?: string;
  suitTint?: number;
  shoes?: string;
  shoeTint?: number;
  /** Gas mask over the face. */
  mask?: boolean;
  layers?: GarmentLook[];
  /** Procedural pieces (poncho, wraps, goggles, plates…) from assets/human/gear.ts. */
  gear?: GearLook[];
  grime?: number;
  wear?: number;
}

/** Every garment an outfit puts on the figure, in draw order. */
export function outfitGarments(o: Outfit): GarmentLook[] {
  const out: GarmentLook[] = [];
  if (o.suit) out.push({ name: o.suit, tint: o.suitTint });
  if (o.shoes) out.push({ name: o.shoes, tint: o.shoeTint });
  for (const g of o.layers ?? []) out.push(g);
  return out.map((g) => ({ ...g, grime: g.grime ?? o.grime, wear: g.wear ?? o.wear }));
}

/** Proxy keys to fetch (ensureProxies) before building figures wearing these outfits. */
export function outfitProxyKeys(...outfits: Outfit[]): string[] {
  return [...new Set(outfits.flatMap((o) => outfitGarments(o).map((g) => `clothes_${g.name}`)))];
}

export interface HumanoidLook {
  appearance: Appearance;
  outfit: Outfit;
  lod?: 'high' | 'low';
}

export function lookFrom(appearance: Appearance | undefined, outfit: Outfit, lod?: 'high' | 'low'): HumanoidLook {
  return { appearance: appearance ?? defaultAppearance(), outfit, lod };
}

/** Hair under a hat or helmet: hidden entirely, or cropped to the painted hairline. */
function underHeadwear(a: Appearance, mode: 'hide' | 'crop' | undefined): Appearance {
  if (!mode || a.hair.style === 'none' || a.hair.style.startsWith('paint_')) return a;
  return { ...a, hair: { ...a.hair, style: mode === 'hide' ? 'none' : 'paint_buzz' } };
}

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
const qAxis = (axis: THREE.Vector3, a: number) => new THREE.Quaternion().setFromAxisAngle(axis, a);

const ANIMATED = ['root', 'spine05', 'spine03', 'neck01', 'head', 'upperleg01.L', 'lowerleg01.L', 'foot.L', 'upperleg01.R', 'lowerleg01.R', 'foot.R',
  'upperarm01.L', 'lowerarm01.L', 'upperarm01.R', 'lowerarm01.R'];

/**
 * A character body: a realistic HumanFigure plus procedural animation (walk, idle breathing,
 * aiming, flinch, death). Animation sets each bone's figure-space rotation relative to rest;
 * local rotations are derived through the chain of animated ancestors.
 */
export class Humanoid {
  readonly figure: HumanFigure;
  readonly root: THREE.Group;
  readonly eyeHeight: number;
  private walkPhase = 0;
  private breathe = Math.random() * 10;
  moveBlend = 0;
  aim = 0;
  dead = 0;
  flinch = 0;
  private skin: THREE.Texture;
  private armDown: { L: THREE.Quaternion; R: THREE.Quaternion };
  private aimRot: THREE.Quaternion;
  private parentAnimated = new Map<string, string | undefined>();
  private W = new Map<string, THREE.Quaternion>();
  private rootRestY: number;
  private posture = 0;

  constructor(look: HumanoidLook) {
    const o = look.outfit;
    const app = underHeadwear(look.appearance, outfitHairMode(o));
    // Iso figures are a few hundred pixels tall at most: 512² is plenty and a quarter of the memory and compositing.
    this.skin = makeSkinTexture(app, look.lod === 'low' ? 512 : 2048);
    const clothes = outfitGarments(o);
    this.figure = new HumanFigure({
      shape: app.shape, skin: this.skin, eyes: app.eyes, brows: app.brows, hair: app.hair, clothes, lod: look.lod,
      browColor: app.browColor ?? app.hair.color, facialHair: app.facialHair, skinDetail: app.shape.age > 40 ? 'old' : 'm',
      // Creases deepen with age and sun; the source maps are from adult men, so soften them for young/feminine faces.
      skinDetailStrength: Math.min(0.85, Math.max(0.2, 0.25 + (app.shape.age - 20) / 60 + (app.weathering ?? 0) * 0.3)) * (0.7 + 0.3 * app.shape.gender),
    });
    this.root = this.figure.root;
    this.eyeHeight = this.figure.eyeHeight;
    this.posture = app.posture ?? 0;
    const f = this.figure;
    // Arms hang from the A-pose rest: aim each upper arm slightly out from straight down.
    this.armDown = {
      L: f.aimRotation('upperarm01.L', new THREE.Vector3(0.1, -1, 0.03)).clone(),
      R: f.aimRotation('upperarm01.R', new THREE.Vector3(-0.1, -1, 0.03)).clone(),
    };
    this.aimRot = f.aimRotation('upperarm01.R', new THREE.Vector3(-0.05, 0.05, 1)).clone();
    for (const n of ANIMATED) this.parentAnimated.set(n, nearestAnimatedAncestor(f, n));
    this.rootRestY = f.bones.get('root')!.position.y;
    if (o.mask) this.addMask();
    for (const g of o.gear ?? []) {
      const meshes = addGear(this.figure, { grime: o.grime, wear: o.wear, ...g });
      if (look.lod === 'low') for (const m of meshes) m.castShadow = false;
    }
    this.animate(0, 0);
  }

  private addMask(): void {
    const head = this.figure.bones.get('head');
    const eye = this.figure.restWorld.get('eye.L');
    const hr = this.figure.restWorld.get('head');
    if (!head || !eye || !hr) return;
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3e3e38, roughness: 0.75 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x6a7a62, roughness: 0.15, metalness: 0.3 });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62).rotateX(Math.PI / 2).scale(0.95, 1.15, 0.7), mat);
    face.position.set(0, -0.035, 0.07);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.06, 12).rotateX(Math.PI / 2.4), mat);
    can.position.set(0, -0.085, 0.125);
    g.add(face, can);
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14).rotateX(Math.PI / 2), glass);
      lens.position.set(s * 0.032, 0.002, 0.125);
      g.add(lens);
    }
    // Express a figure-space placement (at eye height, centred) in the head bone's frame.
    const inv = new THREE.Matrix4().compose(hr.head, hr.q, new THREE.Vector3(1, 1, 1)).invert();
    g.position.copy(new THREE.Vector3(0, eye.head.y, eye.head.z - 0.02).applyMatrix4(inv));
    g.quaternion.copy(hr.q.clone().invert());
    head.add(g);
  }

  dispose(): void {
    this.figure.dispose();
    this.skin.dispose();
  }

  /** Advance procedural animation. `speed` is world units/sec of locomotion. */
  animate(dt: number, speed: number): void {
    const f = this.figure;
    this.breathe += dt;
    this.moveBlend += ((speed > 0.05 ? 1 : 0) - this.moveBlend) * Math.min(1, dt * 10);
    this.walkPhase += dt * speed * 3.6;
    const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);
    const w = this.moveBlend;
    const breath = Math.sin(this.breathe * 1.5);
    const W = this.W;
    W.set('root', new THREE.Quaternion());
    // Posture: a slouch rounds the upper back and the head comes forward and up to compensate.
    const sl = this.posture;
    W.set('spine05', qAxis(X, 0.04 * w - this.flinch * 0.25 + sl * 0.07));
    W.set('spine03', qAxis(Y, s * 0.06 * w).multiply(qAxis(X, breath * 0.012 + sl * 0.08)));
    W.set('neck01', qAxis(X, -0.03 * w + this.flinch * 0.2 - sl * 0.09));
    W.set('head', qAxis(Y, Math.sin(this.breathe * 0.31) * 0.08 * (1 - w)).multiply(qAxis(X, -sl * 0.05)));
    // Legs: forward swing is a negative rotation about X (figure faces +Z).
    for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
      const upper = qAxis(X, -s * sign * 0.55 * w);
      const knee = Math.max(0, sign * c) * 0.9 * w + 0.03;
      W.set(`upperleg01.${side}`, upper);
      W.set(`lowerleg01.${side}`, upper.clone().multiply(qAxis(X, knee)));
      W.set(`foot.${side}`, upper.clone().multiply(qAxis(X, knee * 0.4)));
    }
    // Arms: hang, swing opposite to legs; right arm can aim forward.
    for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
      let upper = qAxis(X, s * sign * 0.4 * w + breath * 0.015).multiply(this.armDown[side]);
      let elbow = 0.18 + 0.25 * w;
      if (side === 'R' && this.aim > 0) {
        upper = upper.clone().slerp(this.aimRot, this.aim);
        elbow *= 1 - this.aim;
      }
      W.set(`upperarm01.${side}`, upper);
      W.set(`lowerarm01.${side}`, qAxis(X, -elbow).multiply(upper));
    }
    for (const n of ANIMATED) {
      const wq = W.get(n)!;
      const pa = this.parentAnimated.get(n);
      f.rotateFigure(n, pa ? W.get(pa)!.clone().invert().multiply(wq) : wq);
    }
    // Body bob and death fall.
    const rootB = f.bones.get('root')!;
    rootB.position.y = this.rootRestY + Math.abs(c) * 0.03 * w - 0.01 * w;
    if (this.dead > 0) {
      const t = 1 - Math.pow(1 - Math.min(1, this.dead), 3);
      f.rotateFigure('root', qAxis(X, (-Math.PI / 2) * t));
      rootB.position.y = this.rootRestY * (1 - 0.82 * t);
      rootB.position.z = -0.35 * t;
    }
    this.flinch = Math.max(0, this.flinch - dt * 4);
  }
}

function nearestAnimatedAncestor(f: HumanFigure, name: string): string | undefined {
  let b = f.bones.get(name)?.parent;
  while (b && (b as THREE.Bone).isBone) {
    if (ANIMATED.includes(b.name)) return b.name;
    b = b.parent;
  }
  return undefined;
}
