import * as THREE from 'three';

const ISO_PITCH = Math.atan(1 / Math.SQRT2); // true isometric elevation (~35.26°)

/**
 * Orthographic isometric camera: follows a target, rotates around it (snapped or free),
 * zooms by changing the view height, and can be panned away from the target.
 */
export class IsoCamera {
  readonly camera: THREE.OrthographicCamera;
  /** Point the camera looks at (smoothed). */
  readonly focus = new THREE.Vector3();
  /** Desired focus (e.g. the player). */
  readonly target = new THREE.Vector3();
  /** Manual pan offset from target. */
  readonly pan = new THREE.Vector3();
  yaw = Math.PI / 4;
  private yawGoal = Math.PI / 4;
  pitch = ISO_PITCH * 1.25;
  /** World units visible vertically. */
  viewHeight = 16;
  private viewGoal = 16;
  minView = 7;
  maxView = 30;
  private aspect = 1;
  private shake = 0;

  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 300);
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.updateProjection();
  }

  /** Rotate by quarter-turn steps (keyboard / buttons). */
  rotateStep(dir: number): void {
    this.yawGoal += (dir * Math.PI) / 4;
  }

  /** Free rotation (touch twist). */
  rotateBy(rad: number): void {
    this.yawGoal += rad;
    this.yaw += rad;
  }

  zoomBy(factor: number): void {
    this.viewGoal = THREE.MathUtils.clamp(this.viewGoal * factor, this.minView, this.maxView);
  }

  /** Pan in screen space (pixels) → world XZ. */
  panScreen(dxPx: number, dyPx: number, screenH: number): void {
    const k = this.viewHeight / screenH;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.pan.addScaledVector(right, -dxPx * k);
    this.pan.addScaledVector(fwd, (dyPx * k) / Math.sin(this.pitch));
  }

  recentre(): void {
    this.pan.set(0, 0, 0);
  }

  addShake(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  /** Direction the camera looks (normalized, from camera into the scene). */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)).normalize();
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt * 8);
    this.yaw += (this.yawGoal - this.yaw) * k;
    this.viewHeight += (this.viewGoal - this.viewHeight) * k;
    const goal = this.target.clone().add(this.pan);
    this.focus.lerp(goal, 1 - Math.exp(-dt * 6));
    const dist = 60;
    const dir = this.forward();
    this.camera.position.copy(this.focus).addScaledVector(dir, -dist);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4;
      this.camera.position.z += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.lookAt(this.focus);
    this.updateProjection();
  }

  snapToTarget(): void {
    this.focus.copy(this.target).add(this.pan);
  }

  private updateProjection(): void {
    const h = this.viewHeight / 2, w = h * this.aspect;
    const c = this.camera;
    if (c.top !== h || c.right !== w) {
      c.left = -w; c.right = w; c.top = h; c.bottom = -h;
      c.updateProjectionMatrix();
    }
  }
}
