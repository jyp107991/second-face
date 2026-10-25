import * as THREE from 'three';

/**
 * Skin & hair shading helpers: subsurface-like wrapped diffuse, pore micro-normals, and per-vertex
 * cavity occlusion. Kept separate from figure assembly so materials can be tuned in one place.
 */

/** Patch a standard/physical material's direct diffuse with a skin scattering approximation. */
export function applySkinScatter(m: THREE.MeshStandardMaterial): void {
  m.defines = { ...(m.defines ?? {}), SKIN_SSS: '' };
  m.onBeforeCompile = (sh) => {
    // Includes are still unexpanded here: inline the lighting chunk and patch the diffuse term of
    // RE_Direct_Physical.
    const chunk = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );',
      `#ifdef SKIN_SSS
        float ndlRaw = dot( geometryNormal, directLight.direction );
        float wrapD = saturate( ( ndlRaw + 0.45 ) / 1.45 );
        vec3 scatter = vec3( 1.0, 0.38, 0.25 ) * max( 0.0, wrapD - saturate( ndlRaw ) ) * 1.15 * ( 1.0 - skinHairMask );
        vec3 skinIrr = ( vec3( saturate( ndlRaw ) ) + scatter ) * directLight.color;
        reflectedLight.directDiffuse += skinIrr * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
      #else
        reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
      #endif`,
    )
      // Light that reaches skin indirectly has scattered through it: keep shadows warm, never grey-green.
      .replace('reflectedLight.indirectDiffuse += diffuse;', 'reflectedLight.indirectDiffuse += diffuse * SKIN_AMBIENT_TINT;')
      .replace('reflectedLight.indirectDiffuse += indirectDiffuse;', 'reflectedLight.indirectDiffuse += indirectDiffuse * SKIN_AMBIENT_TINT;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', '#ifdef SKIN_SSS\n#define SKIN_AMBIENT_TINT vec3( 1.14, 0.95, 0.84 )\n#else\n#define SKIN_AMBIENT_TINT vec3( 1.0 )\n#endif\n#include <lights_physical_pars_fragment>');
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', 'float skinHairMask = 0.0;\n' + chunk);
    // The skin texture's alpha marks hair painted into it (scalp styles, stubble): 255 = bare skin,
    // lower = hair. Hair is matte, has no skin sheen and does not scatter light like skin.
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        #if defined( USE_MAP ) && defined( SKIN_SSS )
          skinHairMask = saturate( ( 1.0 - texture2D( map, vMapUv ).a ) * 2.0 );
          diffuseColor.a = opacity;
        #endif`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix( roughnessFactor, 0.93, skinHairMask );`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        material.specularColor *= 1.0 - 0.7 * skinHairMask;
        material.specularColorBlended *= 1.0 - 0.7 * skinHairMask;
        #ifdef USE_SHEEN
          material.sheenColor *= 1.0 - skinHairMask;
        #endif`);
  };
  m.customProgramCacheKey = () => 'skinSSS';
}

let poreMap: THREE.Texture | undefined;

/** Tiling micro-normal map of pores and fine skin grain (generated once). */
export function poreNormalMap(): THREE.Texture {
  if (poreMap) return poreMap;
  const S = 256;
  const h = new Float32Array(S * S);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // Fine grain
  for (let i = 0; i < S * S; i++) h[i] = rnd() * 0.25;
  // Pores: small soft pits, tileable.
  for (let k = 0; k < 900; k++) {
    const cx = rnd() * S, cy = rnd() * S, r = 1 + rnd() * 1.6, depth = 0.6 + rnd() * 0.6;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const d = Math.hypot(dx, dy) / r;
      if (d > 1.5) continue;
      const x = (Math.floor(cx + dx) + S) % S, y = (Math.floor(cy + dy) + S) % S;
      h[y * S + x] -= depth * Math.exp(-d * d * 2);
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)];
    const hy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
    const n = new THREE.Vector3(-hx * 1.5, -hy * 1.5, 1).normalize();
    const i = (y * S + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  poreMap = new THREE.CanvasTexture(canvas);
  poreMap.wrapS = poreMap.wrapT = THREE.RepeatWrapping;
  poreMap.repeat.set(36, 36);
  return poreMap;
}

/**
 * Per-vertex cavity occlusion from local concavity: vertices whose neighbours sit "above" them
 * along the normal (eye sockets, nostrils, lip corners, ear folds) get darkened. Returns 0..1 per vertex.
 */
export function cavityAO(pos: Float32Array, nrm: Float32Array, index: ArrayLike<number>, count: number): Float32Array {
  const sum = new Float32Array(count * 3), deg = new Float32Array(count), edge = new Float32Array(count);
  for (let t = 0; t < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = index[t + k], b = index[t + ((k + 1) % 3)];
      for (const [u, v] of [[a, b], [b, a]]) {
        sum[u * 3] += pos[v * 3]; sum[u * 3 + 1] += pos[v * 3 + 1]; sum[u * 3 + 2] += pos[v * 3 + 2];
        deg[u]++;
        edge[u] += Math.hypot(pos[v * 3] - pos[u * 3], pos[v * 3 + 1] - pos[u * 3 + 1], pos[v * 3 + 2] - pos[u * 3 + 2]);
      }
    }
  }
  let ao = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    if (!deg[i]) { ao[i] = 1; continue; }
    const cx = sum[i * 3] / deg[i] - pos[i * 3], cy = sum[i * 3 + 1] / deg[i] - pos[i * 3 + 1], cz = sum[i * 3 + 2] / deg[i] - pos[i * 3 + 2];
    const concave = (cx * nrm[i * 3] + cy * nrm[i * 3 + 1] + cz * nrm[i * 3 + 2]) / (edge[i] / deg[i] + 1e-6);
    ao[i] = Math.max(0.45, Math.min(1, 1 - Math.max(0, concave) * 1.6));
  }
  // Smooth twice over the same adjacency.
  for (let it = 0; it < 2; it++) {
    const acc = new Float32Array(count), n = new Float32Array(count);
    for (let t = 0; t < index.length; t += 3) for (let k = 0; k < 3; k++) {
      const a = index[t + k], b = index[t + ((k + 1) % 3)];
      acc[a] += ao[b]; n[a]++; acc[b] += ao[a]; n[b]++;
    }
    const next = new Float32Array(count);
    for (let i = 0; i < count; i++) next[i] = n[i] ? (ao[i] + acc[i] / n[i]) / 2 : ao[i];
    ao = next;
  }
  return ao;
}

let strandTex: THREE.Texture | undefined;

/** Tiling facial-hair strand texture (white strands with alpha; tinted by material colour). */
export function strandTexture(): THREE.Texture {
  if (strandTex) return strandTex;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.lineCap = 'round';
  for (let i = 0; i < 16000; i++) {
    const x = rnd() * S, y = rnd() * S, len = 10 + rnd() * 26, bend = (rnd() - 0.5) * 6;
    const v = 150 + rnd() * 105;
    g.strokeStyle = `rgba(${v},${v},${v},${0.6 + rnd() * 0.4})`;
    g.lineWidth = 0.6 + rnd() * 0.9;
    for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) {
      if (x + ox < -40 || x + ox > S + 40 || y + oy < -40 || y + oy > S + 40) continue;
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + bend, y + oy + len * 0.5, x + ox + bend * 0.5, y + oy + len);
      g.stroke();
    }
  }
  strandTex = new THREE.CanvasTexture(c);
  strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping;
  strandTex.colorSpace = THREE.SRGBColorSpace;
  strandTex.anisotropy = 8;
  return strandTex;
}
