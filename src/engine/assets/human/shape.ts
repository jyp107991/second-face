import type { HumanData } from './data';

/**
 * Body/face shape parameters (MakeHuman-compatible semantics) and the morph evaluation.
 * Macro weighting re-implements MakeHuman's documented blend rules for gender/age/muscle/weight/
 * height/ethnicity/breast; detail modifiers are simple decr/incr target pairs.
 */
export interface ShapeParams {
  /** 0 = female .. 1 = male */
  gender: number;
  /** Age in years (18–90). */
  age: number;
  /** 0..1 (0.5 average) */
  muscle: number;
  weight: number;
  height: number;
  african: number;
  asian: number;
  caucasian: number;
  breastSize: number;
  breastFirmness: number;
  /** Modifier id (e.g. "nose-scale-horiz|decr|incr") → -1..1 (or 0..1 for single targets). */
  modifiers: Record<string, number>;
}

export function defaultShape(): ShapeParams {
  return { gender: 0.5, age: 25, muscle: 0.5, weight: 0.5, height: 0.5, african: 1 / 3, asian: 1 / 3, caucasian: 1 / 3, breastSize: 0.5, breastFirmness: 0.5, modifiers: {} };
}

/** min/average/max triple weights for a 0..1 slider (0.5 = average). */
function tri(v: number): { min: number; average: number; max: number } {
  v = Math.max(0, Math.min(1, v));
  return v < 0.5 ? { min: (0.5 - v) / 0.5, average: v / 0.5, max: 0 } : { min: 0, average: (1 - v) / 0.5, max: (v - 0.5) / 0.5 };
}

/** Years → young/old weights (adults only: under 25 counts as fully young). */
export function ageWeights(years: number): { young: number; old: number } {
  const old = Math.max(0, Math.min(1, (years - 25) / (90 - 25)));
  return { young: 1 - old, old };
}

/** All (targetName, weight) pairs contributing to the macro shape. */
export function macroTargets(p: ShapeParams): { sparse: [string, number][]; height: [string, number][] } {
  const g = { female: 1 - p.gender, male: p.gender };
  const a = ageWeights(p.age);
  const mu = tri(p.muscle), we = tri(p.weight);
  const ethSum = p.african + p.asian + p.caucasian || 1;
  const eth = { african: p.african / ethSum, asian: p.asian / ethSum, caucasian: p.caucasian / ethSum };
  const h = p.height < 0.5 ? { minheight: (0.5 - p.height) / 0.5, maxheight: 0 } : { minheight: 0, maxheight: (p.height - 0.5) / 0.5 };
  const cup = tri(p.breastSize), firm = tri(p.breastFirmness);
  const sparse: [string, number][] = [];
  const height: [string, number][] = [];
  for (const [gn, gw] of Object.entries(g)) {
    if (gw <= 0) continue;
    for (const [an, aw] of Object.entries(a)) {
      if (aw <= 0) continue;
      for (const [en, ew] of Object.entries(eth)) if (ew > 0) sparse.push([`macro/macrodetails/${en}-${gn}-${an}`, gw * aw * ew]);
      for (const [mn, mw] of Object.entries(mu)) {
        if (mw <= 0) continue;
        for (const [wn, ww] of Object.entries(we)) {
          if (ww <= 0) continue;
          const base = gw * aw * mw * ww;
          sparse.push([`macro/macrodetails/universal-${gn}-${an}-${mn}muscle-${wn}weight`, base]);
          for (const [hn, hw] of Object.entries(h)) if (hw > 0) height.push([`macrodetails/height/${gn}-${an}-${mn}muscle-${wn}weight-${hn}`, base * hw]);
          if (gn === 'female') {
            for (const [cn, cw] of Object.entries(cup)) for (const [fn, fw] of Object.entries(firm)) {
              if (cw <= 0 || fw <= 0 || (cn === 'average' && fn === 'average')) continue;
              sparse.push([`macro/breast/female-${an}-${mn}muscle-${wn}weight-${cn}cup-${fn}firmness`, base * cw * fw]);
            }
          }
        }
      }
    }
  }
  return { sparse, height };
}

/** Evaluate final vertex positions (MakeHuman units) for a shape. */
export function evaluateShape(d: HumanData, p: ShapeParams): Float32Array {
  const out = new Float32Array(d.base);
  const addSparse = (name: string, w: number) => {
    const meta = d.m.detail[name];
    if (!meta || w === 0) return;
    const [off, count, scale] = meta;
    const k = w * scale;
    for (let i = 0; i < count; i++) {
      const vi = d.detailIdx[off + i] * 3, j = (off + i) * 3;
      out[vi] += d.detailVal[j] * k;
      out[vi + 1] += d.detailVal[j + 1] * k;
      out[vi + 2] += d.detailVal[j + 2] * k;
    }
  };
  const mt = macroTargets(p);
  for (const [n, w] of mt.sparse) addSparse(n, w);
  // Height: project target weights onto the PCA basis.
  if (mt.height.length) {
    const K = d.m.pca.k, coef = new Float32Array(K);
    for (const [n, w] of mt.height) {
      const i = d.m.heightTargets.indexOf(n);
      if (i < 0) continue;
      const row = d.m.pca.proj[i];
      for (let k = 0; k < K; k++) coef[k] += w * row[k];
    }
    const N = d.m.vertexCount * 3;
    for (let k = 0; k < K; k++) {
      const c = coef[k] * d.m.pca.scale[k];
      if (Math.abs(c) < 1e-9) continue;
      const o = k * N;
      for (let i = 0; i < N; i++) out[i] += d.pca[o + i] * c;
    }
  }
  // Detail modifiers. "sym:<id>" drives both the l- and r- variants of a paired modifier.
  for (const mod of d.m.modifiers) {
    const side = mod.id.startsWith('l-') || mod.id.startsWith('r-');
    const v = (p.modifiers[mod.id] ?? 0) + (side ? p.modifiers['sym:' + mod.id.slice(2)] ?? 0 : 0);
    if (!v) continue;
    if (mod.min) addSparse(v < 0 ? mod.min : mod.max, Math.abs(v));
    else addSparse(mod.max, Math.max(0, v));
  }
  return out;
}
