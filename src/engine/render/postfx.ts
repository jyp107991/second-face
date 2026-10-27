import * as THREE from 'three';

const quadVS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const brightFS = /* glsl */ `
uniform sampler2D tScene; uniform float uThreshold; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.5, l), 1.0);
}`;

const blurFS = /* glsl */ `
uniform sampler2D tInput; uniform vec2 uDir; varying vec2 vUv;
void main() {
  vec3 s = texture2D(tInput, vUv).rgb * 0.227;
  s += texture2D(tInput, vUv + uDir * 1.384).rgb * 0.316;
  s += texture2D(tInput, vUv - uDir * 1.384).rgb * 0.316;
  s += texture2D(tInput, vUv + uDir * 3.230).rgb * 0.070;
  s += texture2D(tInput, vUv - uDir * 3.230).rgb * 0.070;
  gl_FragColor = vec4(s, 1.0);
}`;

const compositeFS = /* glsl */ `
uniform sampler2D tScene; uniform sampler2D tBloom;
uniform float uBloom, uGrade, uGrain, uVignette, uTime, uExposure, uFlash, uHurt;
uniform vec3 uTint; uniform vec2 uRes;
varying vec2 vUv;

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c = aces(c * uExposure);
  // Washed-out sepia grade: desaturate toward a warm tint, lift blacks, soften highlights.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 sepia = vec3(l) * uTint;
  c = mix(c, sepia, uGrade * 0.55);
  c = mix(c, vec3(l), uGrade * 0.15);
  c = c * 0.92 + vec3(0.035, 0.03, 0.02) * uGrade;
  // Vignette
  vec2 d = vUv - 0.5; d.x *= uRes.x / uRes.y;
  c *= mix(1.0, smoothstep(0.95, 0.25, length(d)), uVignette);
  c = toSRGB(c);
  // Film grain (applied in display space so it reads evenly)
  float g = rand(vUv * uRes + fract(uTime * 13.37)) - 0.5;
  c += g * uGrain;
  c += vec3(uFlash);
  // Hurt: blood at the edges of sight, fading.
  c = mix(c, vec3(0.42, 0.03, 0.02), uHurt * smoothstep(0.3, 1.1, length(d)));
  gl_FragColor = vec4(c, 1.0);
}`;

export interface PostSettings { bloom: number; grade: number; grain: number; vignette: number; exposure: number; tint: THREE.Color; }

export class PostFX {
  readonly settings: PostSettings = { bloom: 0.6, grade: 0.75, grain: 0.06, vignette: 0.75, exposure: 1.0, tint: new THREE.Color(1.08, 0.95, 0.74) };
  private sceneRT: THREE.WebGLRenderTarget;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.Camera();
  private bright: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;
  bloomEnabled = true;
  private dirH = new THREE.Vector2();
  private dirV = new THREE.Vector2();
  flash = 0;
  /** 1 when the player has just been hit; decays over about a second. */
  hurt = 0;
  private lastTime = 0;

  constructor(private renderer: THREE.WebGLRenderer, samples: number) {
    const type = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type, samples, depthBuffer: true });
    this.rtA = new THREE.WebGLRenderTarget(1, 1, { type });
    this.rtB = new THREE.WebGLRenderTarget(1, 1, { type });
    this.bright = new THREE.ShaderMaterial({ vertexShader: quadVS, fragmentShader: brightFS, uniforms: { tScene: { value: null }, uThreshold: { value: 0.75 } } });
    this.blur = new THREE.ShaderMaterial({ vertexShader: quadVS, fragmentShader: blurFS, uniforms: { tInput: { value: null }, uDir: { value: new THREE.Vector2() } } });
    this.composite = new THREE.ShaderMaterial({
      vertexShader: quadVS, fragmentShader: compositeFS,
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0 }, uGrade: { value: 0 }, uGrain: { value: 0 },
        uVignette: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 1 }, uTint: { value: new THREE.Color() },
        uRes: { value: new THREE.Vector2() }, uFlash: { value: 0 }, uHurt: { value: 0 },
      },
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  setSize(w: number, h: number): void {
    this.sceneRT.setSize(w, h);
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    this.rtA.setSize(bw, bh);
    this.rtB.setSize(bw, bh);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, time: number): void {
    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    const s = this.settings;
    if (this.bloomEnabled && s.bloom > 0) {
      this.pass(this.bright, { tScene: this.sceneRT.texture }, this.rtA);
      const w = this.rtA.width, h = this.rtA.height;
      for (let i = 0; i < 2; i++) {
        this.pass(this.blur, { tInput: this.rtA.texture, uDir: this.dirH.set(1 / w, 0) }, this.rtB);
        this.pass(this.blur, { tInput: this.rtB.texture, uDir: this.dirV.set(0, 1 / h) }, this.rtA);
      }
    }
    const u = this.composite.uniforms;
    u.tScene.value = this.sceneRT.texture;
    u.tBloom.value = this.rtA.texture;
    u.uBloom.value = this.bloomEnabled ? s.bloom : 0;
    u.uGrade.value = s.grade;
    u.uGrain.value = s.grain;
    u.uVignette.value = s.vignette;
    u.uExposure.value = s.exposure;
    u.uTint.value.copy(s.tint);
    u.uTime.value = time;
    u.uFlash.value = this.flash;
    const dt = Math.min(0.1, Math.max(0, time - this.lastTime)); this.lastTime = time;
    this.hurt = Math.max(0, this.hurt - dt * 1.4);
    u.uHurt.value = this.hurt;
    u.uRes.value.set(this.sceneRT.width, this.sceneRT.height);
    this.quad.material = this.composite;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  private pass(mat: THREE.ShaderMaterial, uniforms: Record<string, unknown>, target: THREE.WebGLRenderTarget): void {
    for (const [k, v] of Object.entries(uniforms)) mat.uniforms[k].value = v;
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }
}
