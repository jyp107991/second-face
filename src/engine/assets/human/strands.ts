import * as THREE from 'three';
import { frame } from './skin';
import type { HumanData } from './data';
import type { BodySurface } from './coily';

/**
 * Directional hair strands rendered as stacked shells over the skin (one draw call). A field function
 * gives, per head-frame point, how long the hair is (distance travelled along the skin), how far it
 * stands off the skin, how dense it is and which way it grows. The shader draws individual tapered
 * hairs at screen resolution: each hair is followed from its root along the growth direction, so a
 * strand stays continuous across shells; hairs thinner than a pixel fade instead of aliasing.
 * Used for facial hair (stubble to trimmed beards) and short and medium haircuts.
 */

export interface StrandSample {
  /** Hair length along the skin (head units; 1 unit ≈ the head radius). */
  len: number;
  /** How far the hair mass stands off the skin (head units). */
  lift: number;
  /** Hair density 0..1 (probability a root grows a hair). */
  dens: number;
  /** Growth direction (head frame; projected onto the skin by the builder). */
  dir: THREE.Vector3;
}

export type StrandField = (p: THREE.Vector3, n: THREE.Vector3) => StrandSample | null;

export interface StrandLook {
  color: number;
  /** Root spacing (head units). */
  cell: number;
  /** Hair radius at the root (head units). */
  radius: number;
  /** Wave amplitude across the strand (fraction of a cell) and frequency along it. */
  wave?: number;
  /** Darkening at the roots (0 none .. 1 black). */
  rootShade?: number;
  /** Per-hair opacity. */
  opacity?: number;
}

/** Build strand shells from the body surface. Returns null when the field covers nothing. */
export function strandGeometry(d: HumanData, body: BodySurface, field: StrandField, layers: number, scale: number): THREE.BufferGeometry | null {
  const f = frame();
  const n = d.bodyMap.length;
  const samples: (StrandSample | null)[] = new Array(n).fill(null);
  const hp = new Float32Array(n * 3);
  const p = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromArray(d.base, d.bodyMap[i] * 3).sub(f.c).divideScalar(f.r);
    hp[i * 3] = p.x; hp[i * 3 + 1] = p.y; hp[i * 3 + 2] = p.z;
    if (p.y < -1.6 || p.length() > 2.2) continue;
    nn.fromArray(body.nrm, i * 3);
    const s = field(p, nn);
    if (s && s.dens > 0.01 && s.len > 0) {
      // Growth direction lies in the skin's tangent plane.
      s.dir.addScaledVector(nn, -s.dir.dot(nn));
      if (s.dir.lengthSq() < 1e-8) s.dir.set(0, -1, 0).addScaledVector(nn, nn.y);
      s.dir.normalize();
      samples[i] = s;
    }
  }
  // Grow the shell a few rings past the last roots (no new roots there) so hairs that travel beyond
  // the growth area are not clipped at the shell's edge.
  for (let ring = 0; ring < 2; ring++) {
    const add: [number, StrandSample][] = [];
    for (let t = 0; t < body.index.length; t += 3) {
      const tri = [body.index[t], body.index[t + 1], body.index[t + 2]];
      const src = tri.find((v) => samples[v]);
      if (src === undefined) continue;
      for (const v of tri) if (!samples[v]) { const s = samples[src]!; add.push([v, { len: s.len, lift: s.lift, dens: 0, dir: s.dir.clone() }]); }
    }
    for (const [v, s] of add) if (!samples[v]) samples[v] = s;
  }
  const tris: number[] = [];
  for (let t = 0; t < body.index.length; t += 3) {
    const a = body.index[t], b = body.index[t + 1], c = body.index[t + 2];
    if (samples[a] && samples[b] && samples[c]) tris.push(a, b, c);
  }
  if (!tris.length) return null;
  const remap = new Map<number, number>();
  for (const v of tris) if (!remap.has(v)) remap.set(v, remap.size);
  const nv = remap.size, total = nv * layers;
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), hpo = new Float32Array(total * 3);
  const dir = new Float32Array(total * 3), prm = new Float32Array(total * 4);
  const si = new Uint16Array(total * 4), sw = new Float32Array(total * 4);
  const metres = f.r * scale;
  for (const [src, k] of remap) {
    const s = samples[src];
    const lift = s ? s.lift * metres : 0;
    for (let l = 0; l < layers; l++) {
      const h = (l + 0.5) / layers, o = l * nv + k;
      for (let c = 0; c < 3; c++) {
        pos[o * 3 + c] = body.pos[src * 3 + c] + body.nrm[src * 3 + c] * (lift * h + 0.00015);
        nrm[o * 3 + c] = body.nrm[src * 3 + c];
        hpo[o * 3 + c] = hp[src * 3 + c];
      }
      dir[o * 3] = s ? s.dir.x : 0; dir[o * 3 + 1] = s ? s.dir.y : -1; dir[o * 3 + 2] = s ? s.dir.z : 0;
      prm[o * 4] = h; prm[o * 4 + 1] = s ? s.len : 0; prm[o * 4 + 2] = s ? s.dens : 0; prm[o * 4 + 3] = 1 / layers;
      for (let c = 0; c < 4; c++) { si[o * 4 + c] = body.skinIndex[src * 4 + c]; sw[o * 4 + c] = body.skinWeight[src * 4 + c]; }
    }
  }
  const idx: number[] = [];
  for (let l = 0; l < layers; l++) for (const v of tris) idx.push(l * nv + remap.get(v)!);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('hp', new THREE.BufferAttribute(hpo, 3));
  g.setAttribute('gdir', new THREE.BufferAttribute(dir, 3));
  g.setAttribute('sprm', new THREE.BufferAttribute(prm, 4));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(idx);
  return g;
}

/** Strand material: draws tapered, anti-aliased hairs; blended, inner shells first. */
export function strandMaterial(look: StrandLook): THREE.Material {
  const m = new THREE.MeshStandardMaterial({
    color: look.color, roughness: 0.6, metalness: 0, envMapIntensity: 0.2,
    transparent: true, depthWrite: false, alphaTest: 0.01, side: THREE.FrontSide,
  });
  const key = `strand_${look.cell}_${look.radius}_${look.wave ?? 0}_${look.rootShade ?? 0.5}_${look.opacity ?? 1}`;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 hp;\nattribute vec3 gdir;\nattribute vec4 sprm;\nvarying vec3 vHp;\nvarying vec3 vDir;\nvarying vec4 vPrm;\nvarying vec3 vSkinN;\nvarying vec3 vTanView;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHp = hp;\nvDir = gdir;\nvPrm = sprm;\nvSkinN = objectNormal;\nvTanView = normalize((modelViewMatrix * vec4(gdir, 0.0)).xyz);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vHp;
        varying vec3 vDir;
        varying vec4 vPrm;
        varying vec3 vSkinN;
        varying vec3 vTanView;
        float strandAlong = 0.0, strandVar = 0.5;
        vec3 strandHash(vec3 p) {
          p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
          return fract(sin(p) * 43758.5453);
        }
        float segDist(vec3 p, vec3 a, vec3 b) {
          vec3 ab = b - a; float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-10), 0.0, 1.0);
          return length(p - a - ab * t);
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          float h = vPrm.x, len = vPrm.y, dens = vPrm.z, dh = vPrm.w;
          vec3 n = normalize(vSkinN);
          vec3 dir = normalize(vDir - n * dot(vDir, n));
          vec3 side = normalize(cross(n, dir));
          float cs = ${look.cell.toFixed(5)};
          float pix = max(length(fwidth(vHp)), 1e-6);
          // Search for roots near where a hair passing through this point would have started.
          vec3 back = vHp - dir * len * h;
          vec3 cell = floor(back / cs);
          float cover = 0.0, along = 0.0, var = 0.5;
          for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
            vec3 c = cell + vec3(float(x), float(y), float(z));
            vec3 r = strandHash(c);
            if (r.x > dens) continue;
            float hl = 0.7 + 0.3 * r.y;                 // individual length
            if (h > hl) continue;
            vec3 root = (c + strandHash(c + 17.3)) * cs;
            root -= n * dot(root - vHp, n);             // roots sit on the skin
            float wv = ${(look.wave ?? 0).toFixed(3)} * cs * sin((h * 9.0 + r.z * 6.28));
            vec3 mid = root + dir * len * h + side * wv;
            vec3 a = mid - dir * len * dh * 0.6, b = mid + dir * len * dh * 0.6;
            float rad = ${look.radius.toFixed(5)} * (1.0 - 0.6 * h / hl);
            float reff = max(rad, pix * 0.6);
            float d = segDist(vHp, a, b);
            float cv = (1.0 - smoothstep(reff - pix * 0.5, reff + pix * 0.5, d)) * (rad / reff);
            if (cv > cover) { cover = cv; along = h / hl; var = r.z; }
          }
          if (cover < 0.01) discard;
          strandAlong = along; strandVar = var;
          float rs = ${(look.rootShade ?? 0.5).toFixed(3)};
          diffuseColor.rgb *= (1.0 - rs + rs * smoothstep(0.0, 0.7, along)) * (0.6 + 0.8 * var);
          diffuseColor.a *= min(1.0, cover * 1.15) * ${(look.opacity ?? 1).toFixed(3)};
        }`)
      .replace('#include <opaque_fragment>', `
        #if NUM_DIR_LIGHTS > 0
        {
          // Kajiya-Kay highlights along the hair: a sharp white one and a broader tinted one shifted
          // toward the root — the sheen that makes even black hair read as hair.
          // Each hair is angled slightly differently, so the highlight breaks up into strands.
          vec3 jit = (strandHash(vec3(strandVar * 91.0, strandAlong * 3.0, 7.0)) - 0.5) * 0.9;
          vec3 T = normalize(normalize(vTanView) + jit), V = normalize(vViewPosition);
          for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            vec3 L = directionalLights[i].direction;
            vec3 H = normalize(L + V);
            float th1 = dot(T, H), th2 = dot(normalize(T + 0.25 * normal), H);
            float s1 = pow(sqrt(max(0.0, 1.0 - th1 * th1)), 60.0);
            float s2 = pow(sqrt(max(0.0, 1.0 - th2 * th2)), 24.0);
            float vis = smoothstep(-0.1, 0.4, dot(normal, L));
            outgoingLight += directionalLights[i].color * vis * (0.12 * s1 + 0.06 * s2 * (0.5 + diffuseColor.rgb * 3.0)) * (0.3 + 1.2 * strandVar * strandVar) * (0.3 + 0.7 * strandAlong);
          }
        }
        #endif
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
