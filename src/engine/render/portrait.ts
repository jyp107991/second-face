import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Humanoid, type HumanoidLook } from '../assets/humanoid';

const envByRenderer = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
/** Neutral studio environment (reflections in eyes and skin). Built once per renderer. */
export function portraitEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  // One per renderer: a PMREM texture belongs to the context that generated it.
  let tex = envByRenderer.get(renderer);
  if (!tex) {
    const pm = new THREE.PMREMGenerator(renderer);
    tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    envByRenderer.set(renderer, tex);
  }
  return tex;
}

/**
 * A small lit stage for close-ups of one character (creator, dialogue "talking heads", the photo).
 * Rendered by the main renderer in place of the world while active.
 */
export class PortraitStage {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(22, 1, 0.05, 50);
  figure?: Humanoid;
  /** 0 = face close-up, 1 = full body. */
  framing = 0;
  private framingGoal = 0;
  yaw = 0;
  /** Horizontal offset of the subject in view (to leave room for side panels), -1..1. */
  offsetX = 0;
  /** Vertical offset (positive = subject higher on screen, for bottom panels). */
  offsetY = 0;
  /** When set, the camera backs off just enough to fit this many metres of height (narrow columns), ignoring framing. */
  fitHeight = 0;
  private key: THREE.DirectionalLight;
  private time = 0;

  constructor(background = 0x15120e) {
    this.scene.background = new THREE.Color(background);
    this.scene.fog = new THREE.Fog(background, 4, 9);
    // Cinematic three-point lighting: warm soft key with shadows (nose, brow, jaw), dim warm fill,
    // cool rim to separate the head from the background.
    this.key = new THREE.DirectionalLight(0xffe4c4, 1.5);
    this.key.position.set(1.5, 2.1, 2.3);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -0.6; sc.right = 0.6; sc.top = 0.6; sc.bottom = -0.6; sc.near = 0.5; sc.far = 8;
    this.key.shadow.bias = -0.0002;
    this.key.shadow.normalBias = 0.004;
    this.key.shadow.radius = 4;
    const rim = new THREE.DirectionalLight(0xa8c4ff, 0.9);
    rim.position.set(-2.2, 1.9, -1.8);
    // A soft fill from camera-left lifts the shadow side so the face keeps its shape without going hot.
    const fill = new THREE.DirectionalLight(0xd8d0c8, 0.32);
    fill.position.set(-2, 1.2, 2.5);
    const ambient = new THREE.HemisphereLight(0xc8b4a0, 0x1e1812, 0.28);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 1 }));
    floor.receiveShadow = true;
    this.scene.add(this.key, this.key.target, rim, fill, ambient, floor);
  }

  setLook(look: HumanoidLook): void {
    if (this.figure) { this.scene.remove(this.figure.root); this.figure.dispose(); }
    this.figure = new Humanoid(look);
    this.figure.root.rotation.y = this.yaw;
    this.scene.add(this.figure.root);
  }

  /** Attach the studio environment (call once with the game renderer). */
  useEnvironment(renderer: THREE.WebGLRenderer, intensity = 0.22): void {
    this.scene.environment = portraitEnvironment(renderer);
    this.scene.environmentIntensity = intensity;
  }

  setFraming(f: number, snap = false): void {
    this.framingGoal = f;
    if (snap) this.framing = f;
  }

  private aspect = 1;

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    this.time += dt;
    this.framing += (this.framingGoal - this.framing) * Math.min(1, dt * 6);
    const f = this.figure;
    if (!f) return;
    f.root.rotation.y = this.yaw;
    f.animate(dt, 0);
    const eye = f.eyeHeight;
    const target = new THREE.Vector3(0, THREE.MathUtils.lerp(eye - 0.03, 0.95, this.framing), 0);
    // Narrow (portrait) screens need more distance to fit the subject's width.
    const narrow = Math.max(1, 0.85 / this.aspect);
    const dist = this.fitHeight
      ? this.fitHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * Math.max(1, 0.5 / this.aspect)
      : THREE.MathUtils.lerp(1.15, 6.2, this.framing) * THREE.MathUtils.lerp(narrow * 1.15, narrow, this.framing);
    // Raise the subject on screen by aiming lower (fraction of visible height).
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    target.y -= this.offsetY * visH;
    this.camera.position.set(0, target.y + 0.04 + this.framing * 0.4, dist);
    this.camera.lookAt(target);
    // Keep the key light's shadow frustum on the subject's head/body.
    const k = this.key;
    k.target.position.copy(target);
    k.position.copy(target).add(new THREE.Vector3(1.5, 2.1, 2.3));
    k.target.updateMatrixWorld();
    const half = THREE.MathUtils.lerp(0.35, 1.3, this.framing);
    const sc = k.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
    const fog = this.scene.fog as THREE.Fog;
    fog.near = dist + 1.5;
    fog.far = dist + 6;
    // Shift subject sideways in screen space.
    // Note: setViewOffset derives the camera aspect from fullWidth/fullHeight.
    const fw = 1000 * this.aspect;
    this.camera.setViewOffset(fw, 1000, -this.offsetX * fw * 0.25, 0, fw, 1000);
  }
}
