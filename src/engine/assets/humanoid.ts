import * as THREE from 'three';
import { defaultAppearance, type Appearance } from '../data/appearance';
import { HumanFigure } from './human/figure';
import type { GarmentLook } from './human/cloth';
import { makeSkinTexture } from './human/skin';
import { outfitHairMode } from '../data/outfits';
import { addGear, type GearLook } from './human/gear';
import { addHeld, closeFist } from './human/weapons';
import type { HeldShape } from '../inventory/items';
import { BEARD_PROXY } from './human/facialHair';

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
  /** The weapon in the right hand (assets/human/weapons.ts). */
  held?: HeldShape;
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
  /** Skin texture size; defaults to 2048 for close-ups and 512 for the iso view. */
  skinSize?: number;
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
  'upperarm01.L', 'lowerarm01.L', 'wrist.L', 'upperarm01.R', 'lowerarm01.R', 'wrist.R'];
const Z = new THREE.Vector3(0, 0, 1);

/**
 * A character body: a realistic HumanFigure plus procedural animation (walk, idle breathing,
 * aiming, flinch, death). Animation sets each bone's figure-space rotation relative to rest;
 * local rotations are derived through the chain of animated ancestors.
 */
export type IdleKind = 'stand' | 'alert' | 'talk' | 'work' | 'sit' | 'lean' | 'pray' | 'drink' | 'sleep';
type Fidget = 'none' | 'scratch' | 'hands' | 'hips' | 'cross' | 'neck' | 'look';
type ArmPose = { upper: [number, number, number]; lower: [number, number, number]; blend: number };

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
  /** Per-person idle timing offsets so a crowd never moves in unison. */
  private idleSeed = Math.random() * 100;
  private parentAnimated = new Map<string, string | undefined>();
  private W = new Map<string, THREE.Quaternion>();
  private rootRestY: number;
  private posture = 0;
  /** What the body does when it is not walking: the idle loop its activity calls for. */
  idle: IdleKind = 'stand';
  private fidget: Fidget = 'none';
  private fidgetT = 2 + Math.random() * 5;
  private fidgetLeft = 0;
  private fidgetBlend = 0;
  private poseBlend = 0;
  private workPhase = Math.random() * 10;
  private sipT = 4 + Math.random() * 6;

  constructor(look: HumanoidLook) {
    const o = look.outfit;
    const app = underHeadwear(look.appearance, outfitHairMode(o));
    // Iso figures are a few hundred pixels tall at most: 512² is plenty and a quarter of the memory and compositing.
    this.skin = makeSkinTexture(app, look.skinSize ?? (look.lod === 'low' ? 512 : 2048));
    const clothes = outfitGarments(o);
    this.figure = new HumanFigure({
      shape: app.shape, skin: this.skin, eyes: app.eyes, brows: app.brows, hair: app.hair, clothes, lod: look.lod,
      browColor: app.browColor ?? app.hair.color, facialHair: app.facialHair, beardProxies: app.beardProxies ?? BEARD_PROXY[app.facialHair], skinDetail: app.shape.age > 40 ? 'old' : 'm',
      // Creases deepen with age and sun; the source maps are from adult men, so soften them for young/feminine faces.
      skinDetailStrength: Math.min(0.85, Math.max(0.2, 0.25 + (app.shape.age - 20) / 60 + (app.weathering ?? 0) * 0.3)) * (0.7 + 0.3 * app.shape.gender),
    });
    this.root = this.figure.root;
    this.eyeHeight = this.figure.eyeHeight;
    this.posture = app.posture ?? 0;
    const f = this.figure;
    for (const n of ANIMATED) this.parentAnimated.set(n, nearestAnimatedAncestor(f, n));
    this.rootRestY = f.bones.get('root')!.position.y;
    if (o.mask) this.addMask();
    for (const g of o.gear ?? []) {
      const meshes = addGear(this.figure, { grime: o.grime, wear: o.wear, ...g });
      if (look.lod === 'low') for (const m of meshes) m.castShadow = false;
    }
    if (o.held) {
      const meshes = addHeld(this.figure, o.held);
      if (meshes.length) closeFist(this.figure, 'R');
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
  /** Where the head turns to (world space) while someone is near; cleared when they go. */
  lookTarget?: THREE.Vector3;
  private lookBlend = 0;
  private lookYaw = 0;
  private lookPitch = 0;

  /** Head yaw/pitch toward the look target in the body's own frame, blended in and out over a third of a second. */
  private updateLook(dt: number): void {
    const want = this.lookTarget ? 1 : 0;
    this.lookBlend += (want - this.lookBlend) * Math.min(1, dt * 5);
    if (!this.lookTarget) return;
    const local = this.root.worldToLocal(this.lookTarget.clone());
    const yaw = Math.max(-1.1, Math.min(1.1, Math.atan2(local.x, local.z)));
    const flat = Math.hypot(local.x, local.z);
    const pitch = Math.max(-0.35, Math.min(0.3, -Math.atan2(local.y - 1.55, Math.max(0.3, flat))));
    this.lookYaw += (yaw - this.lookYaw) * Math.min(1, dt * 6);
    this.lookPitch += (pitch - this.lookPitch) * Math.min(1, dt * 6);
  }

  animate(dt: number, speed: number): void {
    this.updateLook(dt);
    const f = this.figure;
    this.breathe += dt;
    const movingGoal = speed > 0.05 ? 1 : 0;
    // Ease into a walk and settle out of one; stride, swing and bob scale with how fast the body is actually going.
    this.moveBlend += (movingGoal - this.moveBlend) * Math.min(1, dt * (movingGoal ? 7 : 5));
    const amp = THREE.MathUtils.clamp(speed / 1.3, 0.55, 1.35);
    this.walkPhase += dt * speed * 3.6;
    const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);
    const w = this.moveBlend;
    const breath = Math.sin(this.breathe * 1.5);
    const W = this.W;
    const t = this.breathe + this.idleSeed;
    const idle = this.idle;
    this.updateFidget(dt, w);
    const fb = this.fidgetBlend;
    const posed = idle !== 'stand' && idle !== 'talk' && idle !== 'alert';
    this.poseBlend += (((posed && w < 0.5) ? 1 : 0) - this.poseBlend) * Math.min(1, dt * 3);
    const pb = this.poseBlend;
    const lying = idle === 'sleep' ? pb : 0;
    this.workPhase += dt;
    if (idle === 'drink') { this.sipT -= dt; if (this.sipT < -1.6) this.sipT = 5 + Math.random() * 7; }
    const sip = idle === 'drink' && this.sipT < 0 ? Math.sin(Math.min(1, -this.sipT / 1.6) * Math.PI) : 0;
    // Idle: weight shifts slowly from foot to foot; the pelvis and shoulders counter-tilt; the head wanders.
    const shift = Math.sin(t * 0.35) * (1 - w);
    const lean = idle === 'lean' ? pb * (this.idleSeed % 2 < 1 ? 1 : -1) : 0;
    // Walking: the pelvis rolls and yaws with the stride, the shoulders counter it.
    W.set('root', qAxis(Z, shift * 0.025 + s * 0.035 * w * amp + lean * 0.1).multiply(qAxis(Y, s * 0.06 * w)));
    // Posture: a slouch rounds the upper back and the head comes forward and up to compensate.
    const sl = this.posture;
    const workBend = idle === 'work' ? pb * (0.22 + Math.max(0, Math.sin(this.workPhase * 5.5)) * 0.08) : 0;
    const prayBend = idle === 'pray' ? pb * 0.12 : 0;
    const sitBend = idle === 'sit' ? pb * 0.08 : 0;
    W.set('spine05', qAxis(X, 0.04 * w - this.flinch * 0.25 + sl * 0.07 + workBend + prayBend + sitBend - (idle === 'alert' ? 0.03 : 0)).multiply(qAxis(Z, -shift * 0.02 - lean * 0.06)));
    W.set('spine03', qAxis(Y, -s * 0.08 * w - (this.fidget === 'look' ? fb * 0.18 : 0) + this.lookYaw * 0.3 * this.lookBlend).multiply(qAxis(X, breath * 0.012 + sl * 0.08 + workBend * 0.6)).multiply(qAxis(Z, -shift * 0.02 - s * 0.03 * w * amp)));
    W.set('neck01', qAxis(X, -0.03 * w + this.flinch * 0.2 - sl * 0.09));
    const scan = idle === 'alert' ? 2.2 : 1;
    const look = (Math.sin(t * 0.31) * 0.09 + Math.sin(t * 0.07) * 0.06) * scan + (this.fidget === 'look' ? fb * 0.45 * (this.idleSeed % 3 < 1.5 ? 1 : -1) : 0);
    const headPitch = -sl * 0.05 + Math.sin(t * 0.19) * 0.02 * (1 - w) + (this.fidget === 'hands' ? fb * 0.38 : 0) + (idle === 'pray' ? pb * 0.45 : 0) + (idle === 'work' ? pb * 0.2 : 0) - sip * 0.28;
    const lk = this.lookBlend * (1 - w * 0.6);
    W.set('head', qAxis(Y, look * (1 - w) * (1 - lk) + this.lookYaw * 0.7 * lk).multiply(qAxis(X, headPitch + this.lookPitch * lk)).multiply(qAxis(Z, Math.sin(t * 0.13) * 0.02 * (1 - w))));
    // Legs: forward swing is a negative rotation about X (figure faces +Z). Idle: the unweighted knee softens;
    // sitting folds both; working and leaning bend one.
    const sitLeg = idle === 'sit' ? pb : 0;
    for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
      const soft = Math.max(0, -shift * sign) * 0.06 + (idle === 'work' ? pb * 0.12 : 0) + (lean !== 0 && sign * lean > 0 ? Math.abs(lean) * 0.18 : 0);
      const upperA = -s * sign * 0.55 * w * amp - sitLeg * 1.45;
      const knee = Math.max(0, sign * c) * 0.9 * w * amp + 0.03 + soft + sitLeg * 1.45;
      const upper = qAxis(X, upperA);
      W.set(`upperleg01.${side}`, upper);
      W.set(`lowerleg01.${side}`, upper.clone().multiply(qAxis(X, knee)));
      // The foot lifts toe-down through the swing and lands flat.
      W.set(`foot.${side}`, upper.clone().multiply(qAxis(X, knee * 0.4 - Math.max(0, sign * s) * 0.25 * w * amp - sitLeg * 1.4)));
    }
    // Arms hang beside the thighs with a soft elbow; walking swings them opposite to the legs with the elbow
    // folding on the forward swing. An idle pose or a fidget steers the arms somewhere else and blends back.
    const override = this.armOverride(sip);
    for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
      const swing = qAxis(X, s * sign * 0.5 * w * amp + breath * 0.012 + Math.sin(t * 0.23 + sign) * 0.01 * (1 - w));
      let upperDir = new THREE.Vector3(sign * 0.07, -1, 0.04).normalize().applyQuaternion(swing);
      let elbow = 0.2 + 0.3 * w + Math.max(0, s * sign) * 0.35 * w;
      if (side === 'R' && this.aim > 0) {
        upperDir = upperDir.lerp(new THREE.Vector3(-0.05, 0.05, 1).normalize(), this.aim).normalize();
        elbow *= 1 - this.aim;
      }
      let lowerDir = upperDir.clone().applyQuaternion(qAxis(X, -elbow));
      const o = override[side];
      if (o && o.blend > 0 && this.aim === 0) {
        const ou = new THREE.Vector3(sign * o.upper[0], o.upper[1], o.upper[2]).normalize();
        const ol = new THREE.Vector3(sign * o.lower[0], o.lower[1], o.lower[2]).normalize();
        upperDir = upperDir.lerp(ou, o.blend).normalize();
        lowerDir = lowerDir.lerp(ol, o.blend).normalize();
      }
      // The hand continues the forearm, turned a little in toward the thigh and relaxed.
      const handDir = lowerDir.clone().applyQuaternion(qAxis(Z, -sign * 0.12)).applyQuaternion(qAxis(X, -0.08 * (1 - this.aim)));
      W.set(`upperarm01.${side}`, f.aimRotation(`upperarm01.${side}`, upperDir).clone());
      W.set(`lowerarm01.${side}`, f.aimRotation(`lowerarm01.${side}`, lowerDir).clone());
      W.set(`wrist.${side}`, f.aimRotation(`wrist.${side}`, handDir).clone());
    }
    for (const n of ANIMATED) {
      const wq = W.get(n)!;
      const pa = this.parentAnimated.get(n);
      f.rotateFigure(n, pa ? W.get(pa)!.clone().invert().multiply(wq) : wq);
    }
    // Body bob and sway, the idle weight shift, sitting, lying down, and the death fall.
    const rootB = f.bones.get('root')!;
    rootB.position.y = this.rootRestY + Math.abs(c) * 0.03 * w * amp - 0.01 * w - sitLeg * 0.5;
    rootB.position.x = shift * 0.012 + s * 0.01 * w * amp;
    rootB.position.z = 0;
    const fall = this.dead > 0 ? 1 - Math.pow(1 - Math.min(1, this.dead), 3) : 0;
    const down = Math.max(fall, lying);
    if (down > 0) {
      f.rotateFigure('root', qAxis(X, (-Math.PI / 2) * down));
      rootB.position.y = this.rootRestY * (1 - 0.82 * down);
      rootB.position.z = -0.35 * down;
    }
    this.flinch = Math.max(0, this.flinch - dt * 4);
  }

  /** Every few seconds of standing, something small: a scratch, a glance at the hands, arms crossed for a while. */
  private updateFidget(dt: number, w: number): void {
    const can = w < 0.5 && (this.idle === 'stand' || this.idle === 'talk' || this.idle === 'alert');
    if (!can) { this.fidgetLeft = 0; this.fidgetBlend = Math.max(0, this.fidgetBlend - dt * 3); if (this.fidgetBlend === 0) this.fidget = 'none'; return; }
    if (this.fidgetLeft > 0) {
      this.fidgetLeft -= dt;
      this.fidgetBlend = Math.min(1, this.fidgetBlend + dt * 2.5);
      if (this.fidgetLeft <= 0) this.fidgetT = 3 + Math.random() * 7;
      return;
    }
    this.fidgetBlend = Math.max(0, this.fidgetBlend - dt * 2);
    if (this.fidgetBlend === 0) this.fidget = 'none';
    this.fidgetT -= dt;
    if (this.fidgetT > 0 || this.fidgetBlend > 0) return;
    const pool: [Fidget, number][] = this.idle === 'talk' ? [['hands', 2], ['neck', 1], ['look', 2], ['scratch', 1]]
      : this.idle === 'alert' ? [['look', 3], ['hips', 2], ['neck', 1]]
      : [['scratch', 1], ['hands', 1], ['hips', 2], ['cross', 3], ['neck', 1], ['look', 2]];
    const total = pool.reduce((a, [, n]) => a + n, 0);
    let r = Math.random() * total;
    this.fidget = pool[0][0];
    for (const [k, n] of pool) { r -= n; if (r <= 0) { this.fidget = k; break; } }
    this.fidgetLeft = this.fidget === 'cross' ? 6 + Math.random() * 10 : this.fidget === 'hips' ? 4 + Math.random() * 6 : 1.2 + Math.random() * 1.2;
  }

  /** Where the arms go for the current fidget or idle pose (x is outward from the body's centre on each side). */
  private armOverride(sip: number): { L?: ArmPose; R?: ArmPose } {
    const fb = this.fidgetBlend, pb = this.poseBlend;
    switch (this.fidget) {
      case 'scratch': return { R: { upper: [0.3, 0.25, 0.92], lower: [0.15, 0.95, -0.5], blend: fb } };
      case 'neck': return { L: { upper: [0.3, 0.1, 0.95], lower: [-0.1, 0.9, -0.6], blend: fb } };
      case 'hands': return { L: { upper: [0.1, -0.6, 0.8], lower: [-0.2, 0.2, 1], blend: fb }, R: { upper: [0.1, -0.6, 0.8], lower: [-0.2, 0.2, 1], blend: fb } };
      case 'hips': return { L: { upper: [0.55, -0.8, 0.05], lower: [-0.85, -0.3, 0.45], blend: fb }, R: { upper: [0.55, -0.8, 0.05], lower: [-0.85, -0.3, 0.45], blend: fb } };
      case 'cross': return { L: { upper: [0.2, -0.85, 0.45], lower: [-0.95, 0.1, 0.3], blend: fb }, R: { upper: [0.2, -0.8, 0.5], lower: [-0.95, 0.18, 0.3], blend: fb } };
      default: break;
    }
    switch (this.idle) {
      case 'work': {
        const raise = (1 + Math.sin(this.workPhase * 5.5)) / 2;
        return { R: { upper: [0.1, -0.4 + raise, 0.9], lower: [0, -0.9 + raise * 0.6, 0.6], blend: pb }, L: { upper: [0.15, -0.75, 0.6], lower: [-0.2, -0.3, 1], blend: pb } };
      }
      case 'sit': return { L: { upper: [0.1, -0.6, 0.75], lower: [0, -0.2, 1], blend: pb }, R: { upper: [0.1, -0.6, 0.75], lower: [0, -0.2, 1], blend: pb } };
      case 'lean': return { L: { upper: [0.2, -0.85, 0.45], lower: [-0.95, 0.1, 0.3], blend: pb }, R: { upper: [0.2, -0.8, 0.5], lower: [-0.95, 0.18, 0.3], blend: pb } };
      case 'pray': return { L: { upper: [0.08, -0.75, 0.62], lower: [-0.55, 0.25, 0.8], blend: pb }, R: { upper: [0.08, -0.75, 0.62], lower: [-0.55, 0.25, 0.8], blend: pb } };
      case 'alert': return { L: { upper: [0.15, -0.92, 0.3], lower: [-0.45, 0.15, 0.9], blend: 0.55 }, R: { upper: [0.15, -0.92, 0.3], lower: [-0.45, 0.15, 0.9], blend: 0.55 } };
      case 'drink': return sip > 0 ? { R: { upper: [0.15, -0.3, 0.9], lower: [0.1, 0.95, -0.35], blend: sip } } : {};
      default: return {};
    }
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
