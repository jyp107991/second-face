import * as THREE from 'three';
import { softSprite } from '../assets/textures';
import { SCREEN_H } from './screen';
import type { WeatherKind } from '../world/weather';

/**
 * Small life in the open: now and then a flock of birds crosses high over the player; in the dry country a dust
 * devil wanders by on a hot clear day. Nothing here is a thing the player can touch; it is there so the world is
 * never still.
 */
const FLOCK = 7;
const DEVIL_MOTES = 90;

export class Life {
  private flock: THREE.InstancedMesh;
  private flockMat: THREE.ShaderMaterial;
  private flockFrom = new THREE.Vector3();
  private flockTo = new THREE.Vector3();
  private flockT = -1;
  private flockWait = 20;
  private flockSeeds: number[] = [];

  private devil: THREE.Points;
  private devilMat: THREE.ShaderMaterial;
  private devilT = -1;
  private devilWait = 40;
  private devilPos = new THREE.Vector3();
  private devilDir = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    // Birds: a quad each, a wingspan wide, the sprite drawn by the shader (a V that flaps).
    const geo = new THREE.PlaneGeometry(1.6, 0.6).rotateX(-Math.PI / 2);
    this.flockMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x2a2622) } },
      vertexShader: /* glsl */ `
        uniform float uTime; varying vec2 vUv; varying float vFlap;
        void main() {
          vUv = uv;
          float seed = float(gl_InstanceID) * 1.37;
          vFlap = sin(uTime * 9.0 + seed * 5.0);
          vec3 p = position;
          // The wings beat: the quad's outer edges rise and fall.
          p.y += abs(p.x) * vFlap * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec2 vUv; varying float vFlap;
        void main() {
          // A shallow V: a thin body line and two wings that thin toward the tips.
          float x = abs(vUv.x - 0.5) * 2.0, y = vUv.y - 0.5;
          float wing = 1.0 - smoothstep(0.08, 0.14, abs(y + x * 0.18 * (0.6 + 0.4 * vFlap)) ) ;
          float tip = 1.0 - smoothstep(0.75, 1.0, x);
          float a = wing * tip * (0.75 - 0.35 * x);
          if (a < 0.05) discard;
          gl_FragColor = vec4(uColor, a);
        }`,
    });
    this.flock = new THREE.InstancedMesh(geo, this.flockMat, FLOCK);
    this.flock.frustumCulled = false;
    this.flock.visible = false;
    for (let i = 0; i < FLOCK; i++) this.flockSeeds.push(Math.random());
    scene.add(this.flock);

    // A dust devil: motes spinning up a column that leans with its travel.
    const pos = new Float32Array(DEVIL_MOTES * 3), seed = new Float32Array(DEVIL_MOTES);
    for (let i = 0; i < DEVIL_MOTES; i++) seed[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.devilMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uScreen: SCREEN_H, uCentre: { value: new THREE.Vector3() }, uLean: { value: new THREE.Vector2() }, uMap: { value: softSprite() }, uColor: { value: new THREE.Color(0xc8b48c) }, uLife: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uScreen; uniform vec3 uCentre; uniform vec2 uLean; uniform float uLife;
        varying float vA;
        void main() {
          float h = mod(aSeed * 9.0 + uTime * (1.6 + aSeed), 9.0);
          float r = 0.4 + h * 0.28 + aSeed * 0.3;
          float ang = aSeed * 6.2831 + uTime * (4.0 - h * 0.2);
          vec3 p = uCentre + vec3(cos(ang) * r + uLean.x * h * 0.25, h, sin(ang) * r + uLean.y * h * 0.25);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.45 + h * 0.22) * projectionMatrix[1][1] * uScreen * 0.5;
          vA = (1.0 - h / 9.0) * 0.35 * uLife;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
        void main() { gl_FragColor = vec4(uColor, texture2D(uMap, gl_PointCoord).a * vA); }`,
    });
    this.devil = new THREE.Points(g, this.devilMat);
    this.devil.frustumCulled = false;
    this.devil.visible = false;
    scene.add(this.devil);
  }

  /** Once a frame: where the player is, what the land and the sky are, and whether we are in the open at all. */
  update(dt: number, time: number, focus: THREE.Vector3, region: string, weather: WeatherKind, open: boolean, hour: number, groundAt: (x: number, z: number) => number): void {
    const day = hour >= 6 && hour < 20;
    // Birds: not over the Ashlands, not in a storm, not at night.
    const birdsHere = open && day && region !== 'ashlands' && weather !== 'storm' && weather !== 'dust';
    if (this.flockT < 0) {
      this.flockWait -= dt;
      if (this.flockWait <= 0 && birdsHere) {
        const ang = Math.random() * Math.PI * 2, far = 90 + Math.random() * 40;
        this.flockFrom.set(focus.x + Math.cos(ang) * far, focus.y + 26 + Math.random() * 12, focus.z + Math.sin(ang) * far);
        const ang2 = ang + Math.PI + (Math.random() - 0.5) * 1.2;
        this.flockTo.set(focus.x + Math.cos(ang2) * far, this.flockFrom.y + (Math.random() - 0.5) * 8, focus.z + Math.sin(ang2) * far);
        this.flockT = 0;
        this.flock.visible = true;
      }
    } else {
      this.flockT += dt / 28;
      if (this.flockT >= 1 || !open) { this.flockT = -1; this.flock.visible = false; this.flockWait = (region === 'sallow' || region === 'glass_flats' ? 70 : 35) + Math.random() * 50; }
      else {
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
        const dir = this.flockTo.clone().sub(this.flockFrom);
        const yaw = Math.atan2(dir.x, dir.z);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        for (let i = 0; i < FLOCK; i++) {
          const sd = this.flockSeeds[i];
          // A loose V behind the leader, each bird a little off the line and bobbing.
          const back = (i === 0 ? 0 : Math.ceil(i / 2) * 2.2) + sd * 0.6, side = (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 1.6) + (sd - 0.5) * 0.8;
          p.copy(this.flockFrom).lerp(this.flockTo, this.flockT);
          p.x += -Math.sin(yaw) * back * 0 - Math.cos(yaw) * side - Math.sin(yaw) * back;
          p.z += Math.sin(yaw) * side - Math.cos(yaw) * back;
          p.y += Math.sin(time * 1.1 + sd * 9) * 0.6;
          m.compose(p, q, s);
          this.flock.setMatrixAt(i, m);
        }
        this.flock.instanceMatrix.needsUpdate = true;
        this.flockMat.uniforms.uTime.value = time;
      }
    }
    // Dust devils: the dry country, by day, in clear or hazy air.
    const devilsHere = open && day && (region === 'sallow' || region === 'glass_flats' || region === 'ashlands') && (weather === 'clear' || weather === 'haze' || weather === 'dust');
    if (this.devilT < 0) {
      this.devilWait -= dt;
      if (this.devilWait <= 0 && devilsHere) {
        const ang = Math.random() * Math.PI * 2, far = 30 + Math.random() * 50;
        this.devilPos.set(focus.x + Math.cos(ang) * far, 0, focus.z + Math.sin(ang) * far);
        const d = Math.random() * Math.PI * 2;
        this.devilDir.set(Math.cos(d), Math.sin(d));
        this.devilT = 0;
        this.devil.visible = true;
      }
    } else {
      this.devilT += dt / 24;
      if (this.devilT >= 1 || !open) { this.devilT = -1; this.devil.visible = false; this.devilWait = 50 + Math.random() * 70; }
      else {
        this.devilDir.rotateAround(new THREE.Vector2(), (Math.random() - 0.5) * dt * 0.8);
        this.devilPos.x += this.devilDir.x * dt * 2.2;
        this.devilPos.z += this.devilDir.y * dt * 2.2;
        this.devilPos.y = groundAt(this.devilPos.x, this.devilPos.z);
        const u = this.devilMat.uniforms;
        u.uTime.value = time;
        u.uCentre.value.copy(this.devilPos);
        u.uLean.value.copy(this.devilDir);
        u.uLife.value = Math.sin(this.devilT * Math.PI);
      }
    }
  }
}
