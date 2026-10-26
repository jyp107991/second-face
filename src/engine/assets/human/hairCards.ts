import * as THREE from 'three';
import { frame, scalpMask } from './skin';
import { Rng } from '../../core/rng';
import type { HumanData } from './data';
import type { BodySurface } from './coily';
import type { StrandField } from './strands';

/**
 * Procedural hair cards for haircuts: ribbons textured with fine strands, each traced from a root on
 * the scalp along the cut's comb direction while hugging the head surface (nearest-vertex snapping),
 * and stacked at different heights for volume. This is how game hair is built; generating the cards
 * from the cut's length/direction field means any number of cuts come from data alone.
 */

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

/** Spatial hash over head vertices for nearest-vertex lookups. */
class VertexGrid {
  private cells = new Map<string, number[]>();
  constructor(private pos: Float32Array, idx: number[], private cs: number) {
    for (const i of idx) {
      const k = this.key(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      let c = this.cells.get(k);
      if (!c) this.cells.set(k, (c = []));
      c.push(i);
    }
  }
  private key(x: number, y: number, z: number) { return `${Math.floor(x / this.cs)},${Math.floor(y / this.cs)},${Math.floor(z / this.cs)}`; }
  nearest(p: THREE.Vector3): number {
    const cx = Math.floor(p.x / this.cs), cy = Math.floor(p.y / this.cs), cz = Math.floor(p.z / this.cs);
    let best = -1, bd = Infinity;
    for (let r = 1; r <= 3 && best < 0; r++) {
      for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
        const c = this.cells.get(`${x},${y},${z}`);
        if (!c) continue;
        for (const i of c) {
          const d = (this.pos[i * 3] - p.x) ** 2 + (this.pos[i * 3 + 1] - p.y) ** 2 + (this.pos[i * 3 + 2] - p.z) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
      }
    }
    return best;
  }
}

let strandTex: THREE.Texture | undefined;

/** Card texture: many fine tapered strands (alpha) with brightness variation (RGB). */
function cardTexture(): THREE.Texture {
  if (strandTex) return strandTex;
  const W = 128, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const rng = new Rng(77);
  g.clearRect(0, 0, W, H);
  g.lineCap = 'round';
  // Strands gathered in a few clumps with gaps between them, so cards read as hair, not ribbons.
  const clumps = 5;
  for (let cI = 0; cI < clumps; cI++) {
    const cx = (cI + 0.5) / clumps * W + (rng.next() - 0.5) * 8, cw = 8 + rng.next() * 10;
    for (let i = 0; i < 34; i++) {
      const x = cx + (rng.next() - 0.5) * cw, start = rng.next() * 0.1 * H, end = H * (0.5 + 0.5 * rng.next());
      const v = 120 + rng.next() * 135, drift = (rng.next() - 0.5) * 8;
      const grad = g.createLinearGradient(0, start, 0, end);
      grad.addColorStop(0, `rgba(${v},${v},${v},0.95)`);
      grad.addColorStop(0.7, `rgba(${v},${v},${v},0.85)`);
      grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.strokeStyle = grad;
      g.lineWidth = 0.8 + rng.next() * 1.2;
      g.beginPath();
      g.moveTo(x, start);
      g.quadraticCurveTo(x + drift, (start + end) / 2, x + drift * 0.5 - (x - cx) * 0.3, end);
      g.stroke();
    }
  }
  strandTex = new THREE.CanvasTexture(c);
  strandTex.colorSpace = THREE.SRGBColorSpace;
  strandTex.anisotropy = 8;
  strandTex.wrapS = THREE.ClampToEdgeWrapping;
  return strandTex;
}

export interface CardOptions { cards: number; segments: number; minLengthMM: number; seed: number }

/** Build hair cards for a strand field (head-frame lengths/directions). Positions in figure metres. */
export function hairCardGeometry(d: HumanData, body: BodySurface, field: StrandField, scale: number, opt: CardOptions): THREE.BufferGeometry | null {
  const f = frame();
  const metres = f.r * scale;
  const n = d.bodyMap.length;
  const hp = new Float32Array(n * 3);
  const headIdx: number[] = [];
  const p = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromArray(d.base, d.bodyMap[i] * 3).sub(f.c).divideScalar(f.r);
    hp[i * 3] = p.x; hp[i * 3 + 1] = p.y; hp[i * 3 + 2] = p.z;
    if (p.y > -1.5 && p.length() < 2.3) headIdx.push(i);
  }
  const grid = new VertexGrid(body.pos, headIdx, 0.012);
  // Candidate root triangles on the scalp, weighted by area × density.
  const tris: number[] = [], weights: number[] = [];
  let total = 0;
  for (let t = 0; t < body.index.length; t += 3) {
    const a = body.index[t], b = body.index[t + 1], c = body.index[t + 2];
    p.fromArray(hp, a * 3).add(tmpA.fromArray(hp, b * 3)).add(tmpB.fromArray(hp, c * 3)).divideScalar(3);
    if (p.y < -1.2 || p.length() > 2.2) continue;
    const dens = scalpMask(p);
    if (dens < 0.05) continue;
    tmpA.fromArray(body.pos, b * 3).sub(p.fromArray(body.pos, a * 3));
    tmpB.fromArray(body.pos, c * 3).sub(p);
    const area = tmpA.cross(tmpB).length() / 2;
    tris.push(a, b, c); total += area * dens; weights.push(total);
  }
  if (!tris.length) return null;
  const rng = new Rng(opt.seed);
  const S = opt.segments;
  const P: number[] = [], N: number[] = [], UV: number[] = [], TAN: number[] = [], SI: number[] = [], SW: number[] = [], IDX: number[] = [];
  const pt = new THREE.Vector3(), dirW = new THREE.Vector3(), side = new THREE.Vector3(), headP = new THREE.Vector3();
  const vpos = new THREE.Vector3(), vn = new THREE.Vector3();
  for (let k = 0; k < opt.cards; k++) {
    // Pick a root triangle and a point in it.
    const r = rng.next() * total;
    let lo = 0, hi = weights.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (weights[m] < r) lo = m + 1; else hi = m; }
    const a = tris[lo * 3], b = tris[lo * 3 + 1], c = tris[lo * 3 + 2];
    let u = rng.next(), v = rng.next();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    pt.fromArray(body.pos, a * 3).multiplyScalar(1 - u - v).addScaledVector(tmpA.fromArray(body.pos, b * 3), u).addScaledVector(tmpB.fromArray(body.pos, c * 3), v);
    headP.fromArray(hp, a * 3).multiplyScalar(1 - u - v).addScaledVector(tmpA.fromArray(hp, b * 3), u).addScaledVector(tmpB.fromArray(hp, c * 3), v);
    nn.fromArray(body.nrm, a * 3);
    const root = field(headP, nn);
    if (!root || root.len * 89 < opt.minLengthMM) continue;
    const lenM = root.len * metres * (0.75 + 0.3 * rng.next());
    const layer = 0.25 + 0.75 * Math.sqrt(rng.next()); // stacking height within the volume (more near the top)
    const width = (0.0025 + 0.0022 * rng.next()) * Math.min(1, root.len * 89 / 25 + 0.4);
    // Trace the hair along the comb direction, hugging the head. A barber's cut is an envelope: the
    // hair ends where it has travelled further than the cut length allows at that spot, and it lies
    // as close to the head as the local length does (no top volume carried over short sides).
    const pts: THREE.Vector3[] = [], nrms: THREE.Vector3[] = [], dirs: THREE.Vector3[] = [], srcs: number[] = [];
    let sample = root, nearest = grid.nearest(pt), travelled = 0;
    const stepM = lenM / S;
    for (let s = 0; s <= S; s++) {
      const t = s / S;
      if (nearest >= 0) { vpos.fromArray(body.pos, nearest * 3); vn.fromArray(body.nrm, nearest * 3); } else vn.set(0, 1, 0);
      const h = Math.min(root.lift, sample.lift) * metres * layer * Math.sin(Math.min(1, t * 2.2) * Math.PI * 0.5) + 0.0006;
      if (nearest >= 0) { const off = tmpA.copy(pt).sub(vpos); pt.copy(vpos).add(off.addScaledVector(vn, -off.dot(vn))).addScaledVector(vn, h); }
      dirW.copy(sample.dir).addScaledVector(vn, -sample.dir.dot(vn)).normalize();
      pts.push(pt.clone()); nrms.push(vn.clone()); dirs.push(dirW.clone()); srcs.push(nearest >= 0 ? nearest : a);
      if (s === S) break;
      pt.addScaledVector(dirW, stepM);
      travelled += stepM;
      nearest = grid.nearest(pt);
      if (nearest >= 0) {
        headP.fromArray(hp, nearest * 3);
        const ns = field(headP, tmpB.fromArray(body.nrm, nearest * 3));
        if (ns) {
          sample = ns;
          if (travelled > ns.len * metres * 1.1 + stepM * 0.5) { pts.push(pt.clone()); nrms.push(tmpB.clone()); dirs.push(dirW.clone()); srcs.push(nearest); break; }
        }
      }
    }
    if (pts.length < 2) continue;
    const base = P.length / 3, last = pts.length - 1;
    for (let s = 0; s <= last; s++) {
      const t = s / last;
      side.crossVectors(nrms[s], dirs[s]).normalize();
      const w = width * (1 - 0.55 * t);
      for (const sgn of [-1, 1]) {
        P.push(pts[s].x + side.x * w * 0.5 * sgn, pts[s].y + side.y * w * 0.5 * sgn, pts[s].z + side.z * w * 0.5 * sgn);
        N.push(nrms[s].x, nrms[s].y, nrms[s].z);
        UV.push(sgn < 0 ? 0 : 1, t);
        TAN.push(dirs[s].x, dirs[s].y, dirs[s].z);
        for (let q = 0; q < 4; q++) { SI.push(body.skinIndex[srcs[s] * 4 + q]); SW.push(body.skinWeight[srcs[s] * 4 + q]); }
      }
      if (s < last) { const i0 = base + s * 2; IDX.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2); }
    }
  }
  if (!IDX.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('htan', new THREE.Float32BufferAttribute(TAN, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  g.setIndex(IDX);
  return g;
}

/** Card material (opaque core pass or blended edge pass) with strand highlights and darker roots. */
export function hairCardMaterial(color: number, blended: boolean): THREE.Material {
  const m = new THREE.MeshStandardMaterial({
    color, map: cardTexture(), roughness: 0.65, metalness: 0, envMapIntensity: 0.06, side: THREE.DoubleSide,
    ...(blended ? { transparent: true, depthWrite: false, alphaTest: 0.03 } : { alphaTest: 0.6 }),
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 htan;\nvarying vec3 vTanView;\nvarying float vAlong;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTanView = normalize((modelViewMatrix * vec4(htan, 0.0)).xyz);\nvAlong = uv.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTanView;\nvarying float vAlong;')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 texel = texture2D( map, vMapUv );
          diffuseColor.rgb *= (0.45 + 0.75 * texel.r) * (0.55 + 0.45 * smoothstep(0.0, 0.35, vAlong));
          diffuseColor.a *= texel.a * smoothstep(0.0, 0.18, min(vMapUv.x, 1.0 - vMapUv.x));
        #endif`)
      .replace('#include <opaque_fragment>', `
        #if NUM_DIR_LIGHTS > 0
        {
          vec3 T = normalize(vTanView), V = normalize(vViewPosition);
          for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            vec3 L = directionalLights[i].direction;
            vec3 H = normalize(L + V);
            float t1 = dot(T, H), t2 = dot(normalize(T + 0.2 * normal), H);
            float s1 = pow(sqrt(max(0.0, 1.0 - t1 * t1)), 80.0), s2 = pow(sqrt(max(0.0, 1.0 - t2 * t2)), 20.0);
            float vis = smoothstep(-0.1, 0.4, dot(normal, L));
            outgoingLight += directionalLights[i].color * vis * (0.04 * s1 + 0.12 * s2 * diffuseColor.rgb * 4.0);
          }
        }
        #endif
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'hairCard' + (blended ? 'B' : 'O');
  return m;
}
