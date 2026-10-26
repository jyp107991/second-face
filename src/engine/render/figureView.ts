import * as THREE from 'three';
import type { HumanoidLook } from '../assets/humanoid';
import { PortraitStage } from './portrait';

/**
 * A live figure on a notebook page: the body as it is dressed right now, in its own small renderer so it can
 * sit inside the paper layout. Drag (or swipe) to turn it. Dispose when the page closes.
 */
export class FigureView {
  readonly canvas: HTMLCanvasElement;
  readonly stage: PortraitStage;
  private renderer: THREE.WebGLRenderer;
  private raf = 0;
  private last = 0;
  private disposed = false;
  private dragX?: number;
  private spin = 0;

  constructor(parent: HTMLElement, framing = 1, background = 0x17130f) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'figure';
    parent.append(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.stage = new PortraitStage(background);
    this.stage.setFraming(framing, true);
    this.stage.fitHeight = framing >= 1 ? 2.05 : 0;
    this.stage.yaw = -0.35;
    this.stage.useEnvironment(this.renderer, 0.22);
    this.canvas.addEventListener('pointerdown', (e) => { this.dragX = e.clientX; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener('pointermove', (e) => { if (this.dragX === undefined) return; this.spin = (e.clientX - this.dragX) * 0.012; this.stage.yaw += this.spin; this.dragX = e.clientX; });
    const up = () => { this.dragX = undefined; };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  setLook(look: HumanoidLook): void {
    this.stage.setLook(look);
  }

  /** Match the canvas to its CSS box (call after layout changes). */
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(64, Math.round(r.width)), h = Math.max(64, Math.round(r.height));
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(w, h, false);
    this.stage.setAspect(w / h);
  }

  private frame = (): void => {
    if (this.disposed) return;
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.dragX === undefined && Math.abs(this.spin) > 0.0005) { this.stage.yaw += this.spin; this.spin *= 0.9; }
    const r = this.canvas.getBoundingClientRect();
    if (Math.round(r.width) !== this.canvas.width / this.renderer.getPixelRatio() || Math.round(r.height) !== this.canvas.height / this.renderer.getPixelRatio()) this.resize();
    this.stage.update(dt);
    this.renderer.render(this.stage.scene, this.stage.camera);
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.stage.figure?.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
