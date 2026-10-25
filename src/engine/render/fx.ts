import * as THREE from 'three';
import { softSprite } from '../assets/textures';

interface Particle { p: THREE.Vector3; v: THREE.Vector3; life: number; max: number; color: THREE.Color; size: number; gravity: number; }
interface Timed { obj: THREE.Object3D; life: number; max: number; onUpdate?: (t: number) => void; }
interface FloatText { el: HTMLElement; pos: THREE.Vector3; life: number; }

const MAX_PARTICLES = 400;
const MAX_DECALS = 30;

/** Combat and world effects: particles, tracers, flashes, decals, floating text. */
export class Fx {
  private particles: Particle[] = [];
  private points: THREE.Points;
  private posAttr: THREE.BufferAttribute;
  private colAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private timed: Timed[] = [];
  private decals: THREE.Mesh[] = [];
  private flash: THREE.PointLight;
  private flashLife = 0;
  private texts: FloatText[] = [];
  private textLayer: HTMLElement;
  private decalGeo = new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2);

  constructor(private scene: THREE.Scene, private camera: () => THREE.Camera) {
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    this.colAttr = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('color', this.colAttr);
    g.setAttribute('aSize', this.sizeAttr);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      uniforms: { uMap: { value: softSprite() } },
      vertexShader: `attribute float aSize; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * projectionMatrix[1][1] * 40.0; }`,
      fragmentShader: `uniform sampler2D uMap; varying vec3 vC; void main(){ float a = texture2D(uMap, gl_PointCoord).a; if (a < 0.05) discard; gl_FragColor = vec4(vC, a); }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.flash = new THREE.PointLight(0xffc070, 0, 8, 1.5);
    scene.add(this.flash);
    this.textLayer = document.createElement('div');
    this.textLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15;overflow:hidden';
    document.body.appendChild(this.textLayer);
  }

  private emit(p: THREE.Vector3, v: THREE.Vector3, life: number, color: number, size: number, gravity = 0): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({ p: p.clone(), v, life, max: life, color: new THREE.Color(color), size, gravity });
  }

  muzzle(at: THREE.Vector3, dir: THREE.Vector3): void {
    this.flash.position.copy(at);
    this.flash.intensity = 30;
    this.flashLife = 0.07;
    for (let i = 0; i < 6; i++) {
      const v = dir.clone().multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.5, (Math.random() - 0.5)));
      this.emit(at, v, 0.12, 0xffd080, 0.25);
    }
    for (let i = 0; i < 3; i++) this.emit(at, new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4), 0.9, 0x8a8478, 0.35);
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, color = 0xffe0a0): void {
    const len = from.distanceTo(to);
    const geo = new THREE.BoxGeometry(0.025, 0.025, len);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(from).lerp(to, 0.5);
    m.lookAt(to);
    this.scene.add(m);
    this.timed.push({ obj: m, life: 0.12, max: 0.12, onUpdate: (t) => (mat.opacity = t * 0.9) });
  }

  impact(at: THREE.Vector3, kind: 'blood' | 'spark' | 'dust', dir?: THREE.Vector3): void {
    const n = kind === 'blood' ? 14 : 10;
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2);
      if (dir) v.addScaledVector(dir, 1.5);
      if (kind === 'blood') this.emit(at, v, 0.6, 0x6a0e08, 0.16, 6);
      else if (kind === 'spark') this.emit(at, v.multiplyScalar(2), 0.25, 0xffd070, 0.08, 4);
      else this.emit(at, v.multiplyScalar(0.4), 0.8, 0xa89878, 0.3, -0.2);
    }
    if (kind === 'blood') this.decal(at.clone().setY(0.012), 0x4a0a06, 0.3 + Math.random() * 0.4);
  }

  decal(at: THREE.Vector3, color: number, size: number): void {
    const m = new THREE.Mesh(this.decalGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.copy(at);
    m.scale.setScalar(size);
    m.rotation.y = Math.random() * 6;
    this.scene.add(m);
    this.decals.push(m);
    if (this.decals.length > MAX_DECALS) {
      const old = this.decals.shift()!;
      this.scene.remove(old);
      (old.material as THREE.Material).dispose();
    }
  }

  explosion(at: THREE.Vector3, radius: number): void {
    this.flash.position.copy(at).setY(1);
    this.flash.intensity = 80;
    this.flashLife = 0.25;
    for (let i = 0; i < 40; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5), Math.random(), (Math.random() - 0.5)).normalize().multiplyScalar(radius * (2 + Math.random() * 3));
      this.emit(at, v, 0.5 + Math.random() * 0.3, i % 3 ? 0xff9a40 : 0xffe080, 0.5, 2);
    }
    for (let i = 0; i < 20; i++) this.emit(at, new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2), 2.2, 0x3a3630, 0.9, -0.1);
    this.decal(at.clone().setY(0.011), 0x1a1612, radius * 1.4);
  }

  floatText(at: THREE.Vector3, text: string, color = '#ffd070'): void {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `position:absolute;font:bold 15px var(--font);color:${color};text-shadow:0 1px 3px #000,0 0 6px #000;transform:translate(-50%,-50%);white-space:nowrap`;
    this.textLayer.appendChild(el);
    this.texts.push({ el, pos: at.clone(), life: 1.3 });
  }

  clearDecals(): void {
    for (const d of this.decals) { this.scene.remove(d); (d.material as THREE.Material).dispose(); }
    this.decals = [];
  }

  update(dt: number): void {
    let n = 0;
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.v.y -= p.gravity * dt;
      p.p.addScaledVector(p.v, dt);
      if (p.p.y < 0.02) { p.p.y = 0.02; p.v.multiplyScalar(0.3); }
      const k = p.life / p.max;
      this.posAttr.setXYZ(n, p.p.x, p.p.y, p.p.z);
      this.colAttr.setXYZ(n, p.color.r, p.color.g, p.color.b);
      this.sizeAttr.setX(n, p.size * (0.4 + 0.6 * k));
      n++;
    }
    this.points.geometry.setDrawRange(0, n);
    this.posAttr.needsUpdate = this.colAttr.needsUpdate = this.sizeAttr.needsUpdate = true;

    this.timed = this.timed.filter((t) => {
      t.life -= dt;
      t.onUpdate?.(Math.max(0, t.life / t.max));
      if (t.life <= 0) {
        this.scene.remove(t.obj);
        const m = t.obj as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material)?.dispose();
        return false;
      }
      return true;
    });

    if (this.flashLife > 0) { this.flashLife -= dt; if (this.flashLife <= 0) this.flash.intensity = 0; }

    const cam = this.camera();
    const w = window.innerWidth, h = window.innerHeight;
    const v = new THREE.Vector3();
    this.texts = this.texts.filter((t) => {
      t.life -= dt;
      t.pos.y += dt * 0.8;
      v.copy(t.pos).project(cam);
      t.el.style.left = `${((v.x + 1) / 2) * w}px`;
      t.el.style.top = `${((1 - v.y) / 2) * h}px`;
      t.el.style.opacity = String(Math.min(1, t.life * 2));
      if (t.life <= 0) { t.el.remove(); return false; }
      return true;
    });
  }
}
