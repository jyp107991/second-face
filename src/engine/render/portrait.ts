import * as THREE from 'three';
import { Humanoid, type HumanoidLook } from '../assets/humanoid';

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
  private key: THREE.DirectionalLight;
  private time = 0;

  constructor(background = 0x15120e) {
    this.scene.background = new THREE.Color(background);
    this.scene.fog = new THREE.Fog(background, 4, 9);
    this.key = new THREE.DirectionalLight(0xffe2b8, 3.2);
    this.key.position.set(1.4, 2.4, 2.2);
    const rim = new THREE.DirectionalLight(0x8ab0ff, 1.6);
    rim.position.set(-2, 1.8, -1.5);
    const fill = new THREE.HemisphereLight(0xb0a090, 0x2a2018, 1.1);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 1 }));
    this.scene.add(this.key, rim, fill, floor);
  }

  setLook(look: HumanoidLook): void {
    if (this.figure) { this.scene.remove(this.figure.root); this.figure.dispose(); }
    this.figure = new Humanoid(look);
    this.figure.root.rotation.y = this.yaw;
    this.scene.add(this.figure.root);
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
    const dist = THREE.MathUtils.lerp(1.15, 6.2, this.framing) * THREE.MathUtils.lerp(narrow * 1.15, narrow, this.framing);
    // Raise the subject on screen by aiming lower (fraction of visible height).
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    target.y -= this.offsetY * visH;
    this.camera.position.set(0, target.y + 0.04 + this.framing * 0.4, dist);
    this.camera.lookAt(target);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = dist + 1.5;
    fog.far = dist + 6;
    // Shift subject sideways in screen space.
    // Note: setViewOffset derives the camera aspect from fullWidth/fullHeight.
    const fw = 1000 * this.aspect;
    this.camera.setViewOffset(fw, 1000, -this.offsetX * fw * 0.25, 0, fw, 1000);
  }
}
