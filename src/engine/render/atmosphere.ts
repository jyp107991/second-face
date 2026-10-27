import * as THREE from 'three';
import { softSprite } from '../assets/textures';
import type { AmbienceDef } from '../data/types';
import type { BuiltLocation } from '../scene/location';
import { roofBase } from '../scene/buildings';
import { MOOD_GRADE, skyLook, type WeatherKind } from '../world/weather';

interface LightSource { pos: THREE.Vector3; color: THREE.Color; intensity: number; range: number; flicker: number; phase: number; /** Lamps are lit at dusk and put out at dawn; fires and screens burn all day. */ lamp?: boolean; }

const KEY_TIMES: { h: number; sun: number; sunI: number; sky: number; ground: number; ambI: number; fog: number }[] = [
  { h: 0, sun: 0x4a5a8a, sunI: 0.25, sky: 0x1a2030, ground: 0x0e0c0a, ambI: 0.35, fog: 0x14161c },
  { h: 5, sun: 0x8a6a6a, sunI: 0.3, sky: 0x2a2a38, ground: 0x18140e, ambI: 0.4, fog: 0x2a2626 },
  { h: 7, sun: 0xffb070, sunI: 1.6, sky: 0x9a8a7a, ground: 0x4a3a28, ambI: 0.6, fog: 0x9a8270 },
  { h: 12, sun: 0xfff2dc, sunI: 2.8, sky: 0xc8bca0, ground: 0x6a5a40, ambI: 0.85, fog: 0xc4b094 },
  { h: 17, sun: 0xffc890, sunI: 2.0, sky: 0xb09a80, ground: 0x5a4a34, ambI: 0.7, fog: 0xb09070 },
  { h: 19.5, sun: 0xff7a40, sunI: 1.0, sky: 0x6a4a48, ground: 0x2a1e18, ambI: 0.5, fog: 0x6a4a3a },
  { h: 21, sun: 0x5a5a8a, sunI: 0.3, sky: 0x22243a, ground: 0x100e0c, ambI: 0.38, fog: 0x1a1a24 },
  { h: 24, sun: 0x4a5a8a, sunI: 0.25, sky: 0x1a2030, ground: 0x0e0c0a, ambI: 0.35, fog: 0x14161c },
];

/** Content light intensities are authored on a 0–10 scale; this maps them to physical units. */
const LIGHT_SCALE = 5;

const ca = new THREE.Color(), cb = new THREE.Color();
function lerpHex(a: number, b: number, t: number, out: THREE.Color) { return out.copy(ca.setHex(a)).lerp(cb.setHex(b), t); }

/** Owns scene lighting, fog, dust and pooled point lights. */
export class Atmosphere {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fog: THREE.Fog;
  /** Camera→focus distance, so fog starts around the focus plane (ortho camera sits far back). */
  focusDistance = 60;
  private pool: THREE.PointLight[] = [];
  private sources: LightSource[] = [];
  private dust?: THREE.Points;
  private clarity = 1;
  private dustMul = 1;
  private dustMat?: THREE.ShaderMaterial;
  private ambience!: AmbienceDef;
  /** Hour of day 0..24. */
  hour = 10;
  /** Today's weather where the player is (set by the game each frame). */
  weather: WeatherKind = 'clear';

  constructor(private scene: THREE.Scene, private quality: { shadowSize: number; pointLights: number; dust: number }) {
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = quality.shadowSize > 0;
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
      const s = this.sun.shadow.camera;
      s.left = -22; s.right = 22; s.top = 22; s.bottom = -22; s.near = 1; s.far = 120;
      this.sun.shadow.bias = -0.0008;
      this.sun.shadow.normalBias = 0.03;
    }
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xc8bca0, 0x4a3a28, 0.8);
    scene.add(this.hemi);
    this.fog = new THREE.Fog(0xc0aa88, 60, 100);
    scene.fog = this.fog;
    for (let i = 0; i < quality.pointLights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 1.6);
      l.castShadow = false;
      scene.add(l);
      this.pool.push(l);
    }
  }

  load(loc: BuiltLocation): void {
    this.ambience = loc.map.ambience;
    this.sources = [];
    // A light inside a roofed room stays under the roof (a lamp post's head would otherwise light the roof's top).
    const under = (x: number, z: number, y: number) => {
      if (loc.map.ambience.indoor) return y;
      const tx = Math.floor(x), tz = Math.floor(z);
      if (!loc.grid.inBounds(tx, tz)) return y;
      const id = loc.buildings.at[loc.grid.index(tx, tz)];
      return id >= 0 ? Math.min(y, roofBase(loc.buildings.list[id]) - 0.25) : y;
    };
    for (const l of loc.map.lights ?? []) {
      this.sources.push({ pos: new THREE.Vector3(l.x + 0.5, under(l.x + 0.5, l.y + 0.5, l.height ?? 2.2), l.y + 0.5), color: new THREE.Color(l.color), intensity: l.intensity * LIGHT_SCALE, range: l.range * 1.4, flicker: l.flicker ?? 0, phase: Math.random() * 10, lamp: (l.flicker ?? 0) < 0.25 });
    }
    for (const f of loc.features) {
      const base = { pos: new THREE.Vector3(f.wx + f.x, under(f.wx + f.x, f.wz + f.z, f.y), f.wz + f.z), color: new THREE.Color(f.color), phase: Math.random() * 10 };
      if (f.kind === 'fire') this.sources.push({ ...base, intensity: 6 * LIGHT_SCALE, range: 9, flicker: 0.35 });
      else if (f.kind === 'lamp') this.sources.push({ ...base, intensity: 5 * LIGHT_SCALE, range: 11, flicker: 0.05, lamp: true });
      else this.sources.push({ ...base, intensity: 1.2 * LIGHT_SCALE, range: 4, flicker: 0.04 });
    }
    this.buildDust(loc);
  }

  private buildDust(loc: BuiltLocation): void {
    if (this.dust) { this.scene.remove(this.dust); this.dust.geometry.dispose(); }
    const count = Math.floor(this.quality.dust * loc.map.ambience.dust);
    if (count <= 0) return;
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    const w = loc.grid.width, h = loc.grid.height;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * w; pos[i * 3 + 1] = Math.random() * 4; pos[i * 3 + 2] = Math.random() * h;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.dustMat ??= new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 40 }, uColor: { value: new THREE.Color(0xffe8c0) }, uMap: { value: softSprite() }, uBounds: { value: new THREE.Vector2(w, h) }, uWind: { value: new THREE.Vector2(0.35, 0.1) }, uDensity: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uSize; uniform vec2 uBounds; uniform vec2 uWind; uniform float uDensity;
        varying float vA;
        void main() {
          vec3 p = position;
          p.x = mod(p.x + uWind.x * uTime * (0.6 + aSeed), uBounds.x);
          p.z = mod(p.z + uWind.y * uTime * (0.6 + aSeed), uBounds.y);
          p.y += sin(uTime * 0.7 + aSeed * 40.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          // Weather thins the dust (a clear day shows only the motes with a low seed) or thickens it (bigger, denser motes).
          float thick = max(uDensity - 1.0, 0.0);
          gl_PointSize = uSize * (0.3 + aSeed * 0.7) * (1.0 + 0.25 * thick) * projectionMatrix[1][1];
          vA = 0.18 + 0.25 * sin(uTime * 1.3 + aSeed * 20.0) * 0.5 + 0.12;
          vA *= (1.0 + 0.35 * thick) * step(aSeed, uDensity);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uColor; varying float vA;
        void main() { gl_FragColor = vec4(uColor, texture2D(uMap, gl_PointCoord).a * vA); }`,
    });
    this.dustMat.uniforms.uBounds.value.set(w, h);
    this.dust = new THREE.Points(g, this.dustMat);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  /** 0 (dark) .. 1 (lit) at a world position: sun/ambient plus nearby light sources. */
  lightAt(x: number, z: number): number {
    let l = 0;
    if (this.ambience?.indoor) l = 0.35;
    else {
      const h = ((this.hour % 24) + 24) % 24;
      l = h >= 7 && h <= 18 ? 1 : h >= 5.5 && h <= 20 ? 0.6 : 0.25;
    }
    for (const s of this.sources) {
      const d = Math.hypot(s.pos.x - x, s.pos.z - z);
      if (d < s.range) l = Math.max(l, Math.min(1, (1 - d / s.range) * 1.4));
    }
    return Math.min(1, l);
  }

  /** Per-frame update. `focus` is where the camera looks (shadow frustum follows it). */
  update(_dt: number, time: number, focus: THREE.Vector3, post: { grade: number; tint: THREE.Color; exposure: number }): void {
    const a = this.ambience;
    if (!a) return;
    if (a.indoor) {
      this.sun.intensity = 0;
      this.hemi.color.setHex(a.ambient?.color ?? 0x8a8070);
      this.hemi.groundColor.setHex(0x1a1612);
      this.hemi.intensity = (a.ambient?.intensity ?? 0.6) * 2.2;
      this.fog.color.setHex(a.fogColor);
      this.scene.background = this.fog.color;
    } else {
      const h = ((this.hour % 24) + 24) % 24;
      let i = 0;
      while (i < KEY_TIMES.length - 2 && KEY_TIMES[i + 1].h <= h) i++;
      const k0 = KEY_TIMES[i], k1 = KEY_TIMES[i + 1];
      const t = (h - k0.h) / (k1.h - k0.h);
      lerpHex(k0.sun, k1.sun, t, this.sun.color);
      this.sun.intensity = k0.sunI + (k1.sunI - k0.sunI) * t;
      lerpHex(k0.sky, k1.sky, t, this.hemi.color);
      lerpHex(k0.ground, k1.ground, t, this.hemi.groundColor);
      this.hemi.intensity = k0.ambI + (k1.ambI - k0.ambI) * t;
      lerpHex(k0.fog, k1.fog, t, this.fog.color);
      // Map fog colour: blend the time-of-day fog with the map's own tint.
      this.fog.color.lerp(ca.setHex(a.fogColor), 0.3);
      // Weather and mood: a clear day is harder-lit, cooler from above and far-seeing; dust and storm close in.
      const look = skyLook(this.weather, a.mood);
      const noon = Math.max(0, 1 - Math.abs(h - 13) / 6);
      this.sun.intensity *= look.sun;
      if (look.blue > 0 && noon > 0) {
        // Clear sky: a whiter sun, blue fill from above (shadows go cool), paler distance.
        const b = look.blue * noon;
        this.sun.color.lerp(cb.setHex(0xfffaf2), 0.6 * b);
        this.hemi.color.lerp(cb.setHex(0x8fb0dc), 0.8 * b);
        this.fog.color.lerp(cb.setHex(0xd8d4cc), 0.45 * b);
        this.hemi.intensity *= 1 + 0.3 * b;
      }
      if (this.weather === 'dust' || this.weather === 'storm') {
        this.fog.color.lerp(cb.setHex(0xb08a5a), this.weather === 'storm' ? 0.55 : 0.35);
        this.sun.color.lerp(cb.setHex(0xe8a060), 0.4);
      }
      if (look.fogCool > 0) this.fog.color.lerp(cb.setHex(0x8c8a88), look.fogCool);
      this.fog.color.multiplyScalar(look.fogMul);
      this.clarity = look.clarity;
      this.dustMul = look.dust;
      this.scene.background = this.fog.color;
      // Sun arc: rises east (+x), sets west. At night the "sun" becomes moonlight from above.
      const day = h >= 6 && h <= 20;
      const ang = day ? ((h - 6) / 14) * Math.PI : ((h < 6 ? h + 24 : h) - 20) / 10 * Math.PI;
      const dir = new THREE.Vector3(Math.cos(ang) * 0.8, Math.max(0.25, Math.sin(ang)), 0.45).normalize();
      this.sun.position.copy(focus).addScaledVector(dir, 40);
      this.sun.target.position.copy(focus);
    }
    const look = a.indoor ? undefined : skyLook(this.weather, a.mood);
    post.grade = THREE.MathUtils.clamp((a.mood ? MOOD_GRADE[a.mood] : a.grade ?? 0.75) + (look ? look.grade : 0), 0.1, 0.88);
    post.exposure = look ? look.exposure : 1;
    const tint = look ? look.tint : [1.08, 0.95, 0.74];
    post.tint.setRGB(tint[0], tint[1], tint[2]);
    // fogDensity 0.02 ≈ fog fully opaque ~30 m beyond the focus point; starts a little in front of it. Weather scales it.
    const span = (0.6 / Math.max(0.002, a.fogDensity)) * (a.indoor ? 1 : this.clarity);
    this.fog.near = this.focusDistance - 6;
    this.fog.far = this.focusDistance + span;

    // Assign pooled point lights to the nearest sources.
    const sorted = this.sources
      .map((s) => ({ s, d: s.pos.distanceToSquared(focus) }))
      .sort((x, y) => x.d - y.d);
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i];
      const e = sorted[i];
      if (!e || e.d > 30 * 30) { l.intensity = 0; continue; }
      const s = e.s;
      l.position.copy(s.pos);
      l.color.copy(s.color);
      l.distance = s.range;
      const fl = s.flicker ? 1 - s.flicker * (0.5 + 0.5 * Math.sin(time * 13 + s.phase) * Math.sin(time * 7.3 + s.phase * 2)) : 1;
      // Outdoor lamps come on at dusk and go out after dawn (a trace stays, for the bulb and the glass).
      const h = this.hour;
      const lit = !s.lamp || a.indoor ? 1 : h >= 19 || h < 5.5 ? 1 : h >= 18 ? (h - 18) : h < 6.5 ? 1 - (h - 5.5) : 0.1;
      l.intensity = s.intensity * fl * Math.max(0.1, lit);
    }

    if (this.dustMat) {
      this.dustMat.uniforms.uTime.value = time;
      this.dustMat.uniforms.uDensity.value = a.indoor ? 1 : this.dustMul;
      this.dustMat.uniforms.uColor.value.copy(a.indoor ? ca.setHex(0xa09888) : this.sun.color).multiplyScalar(a.indoor ? 0.5 : 0.6);
    }
  }
}
