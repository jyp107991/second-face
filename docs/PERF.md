# Performance log

Numbers from `node tools/qa/bench.cjs <quality>` against the dev server (headless Chromium, 1280×720).
**Headless Chromium renders on swiftshader (CPU), so frame times here are meaningless in absolute terms and
only loosely comparable between runs.** Draw calls, triangles, texture/geometry memory and JS load times are
real. Real frame times must come from a phone (see "How to measure on a device").

Budget (mid-range Android, 2021–2023 class: Adreno 6xx / Mali-G7x, 1080p at pixelRatio ≤ 1.5):
≤ 150 draw calls, ≤ 1.0 M triangles, ≤ 150 MB textures, ≤ 60 MB geometry in a normal scene (≤ 15 people);
the 40-person `bench_crowd` is a stress scene and may exceed the draw budget.

## Scenes
- `dev_yard` — test yard, player + 1 NPC, props.
- `bench_crowd` — 44×34 market, 40 NPCs (every role/faction look), the stress scene.
- `combat` — dev yard with 4 raiders in combat.

## A4.2 baseline (commit 60502cb, quality medium)
| scene | draws | tris | textures | tex MB (est.) | geo MB | load scene ms |
|---|---|---|---|---|---|---|
| dev_yard | 69 | 304,866 | 40 | 67 | 8.4 | — |
| bench_crowd | 450 | 7,445,914 | 169 | 364 | 184.8 | — |
| combat | 121 | 1,191,710 | 145 | 104 | 29.9 | — |

Where it went (one iso NPC): body 20 k tris, **strand-modelled eyebrows 35 k tris drawn twice (70 k)**,
beard strands 9 k, hair proxy up to 30 k, garments 11–40 k, eyes 2 k; a 1024² composited skin per NPC
(5.5 MB), every garment vertex buffer at full density.

## A4.3 step 1 — decimated iso LOD, plane brows, 512² iso skins, frustum culling (quality medium)
- `tools/mh/decimate.mjs` (`npm run decimate`): meshoptimizer quadric simplification with locked borders writes
  `<key>_index_lo` views for the body (26.7 k → 8 k tris), garments (×0.3), hair (×0.35), eyes (×0.45),
  beards (×0.5). Iso figures (`lod: 'low'`) draw the low index and compact away unused vertices; hair,
  beards and cards still grow on the full surface. Portrait/creator figures (`lod: 'high'`) are unchanged.
- Strand eyebrows (20–28 k vertices) are replaced by the textured plane at iso; brows and hair have no
  blended edge pass at iso.
- Iso skin textures 1024² → 512² (a figure is ≤ ~400 px tall at max zoom; the face ≤ ~60 px).
- Skinned meshes now carry a fixed bounding sphere and are frustum culled (off-screen people cost nothing).

| scene | draws | tris | textures | tex MB (est.) | geo MB | load scene ms |
|---|---|---|---|---|---|---|
| dev_yard | 67 | 187,448 | 42 | 64 | 6.0 | 141 |
| bench_crowd | 310 | 1,257,567 | 170 | 205 | 59.5 | 1,810 |
| combat | 109 | 341,096 | 147 | 85 | 12.3 | — |

Crowd: −83 % triangles, −31 % draws, −44 % texture memory, −68 % geometry memory. One iso NPC is now
~16 k tris in 5 draws (+2 shadow): body 5.4 k, beard 6 k, clothes 3.3 k, eyes 0.9 k, brows 0.2 k.
Visual check: `tools/qa/crowd.cjs` before/after at view 9 and 20 — no visible difference at iso distance.
"Load scene" is the wall time of rebuilding the scene with assets cached (≈45 ms per NPC of JS on this
machine; expect 3–4× on a phone, so a 15-person town ≈ 2 s — acceptable, a worker would hide it).

Remaining texture memory in the crowd: 40 × 512² skins (53 MB) + 40 per-figure garment atlases (512²/768²,
~60 MB) + the player's 2048² skin and portrait (~44 MB) + shared garment/hair source textures (~40 MB).

## Bundle
`vite build`: one JS chunk of 1,115 kB minified (three.js ≈ 450 kB of it; ~300 kB gzipped) + fonts. Human assets: `human.json` 0.37 MB,
`human.bin` 36 MB (fetched once; garments lazy per piece under `proxy/`), skins/eyes/hair textures as webp.
`human.bin` is the biggest first-load cost on a phone (it compresses to ~12 MB with gzip/brotli on Pages).

## Backlog (measure each before/after here)
1. Worker-thread skin compositing (hides ~45 ms/NPC of main-thread time at town load).
2. Share one garment atlas between figures wearing the same garment set (−1.3–3 MB per NPC).
3. `human.bin`: quantise `base_pos`/targets to int16 and split rarely used proxies (hair/beards) into lazy
   files (first load −20 MB).
4. KTX2/Basis for garment and hair source textures (GPU memory −75 % for those ~40 MB).
5. Code splitting: creator + portrait stage + notebook into lazy chunks (first paint −150 kB).
6. Static prop atlas merge (scene draws are ~30 today; revisit when towns have hundreds of props).
7. Adaptive pixel ratio when frame time exceeds 20 ms (quality tiers already set pixelRatio/shadows/bloom).

## How to measure on a device
Open the deployed build with `?dev`, tap DEV: the overlay prints `game.perf()` (fps, frame avg/p95 ms, draws,
tris, texture/geometry MB, heap, load ms). Walk the Shale market and a fight; note p95 frame ms per quality
tier. Target: p95 ≤ 33 ms (30 fps) on medium, ≤ 20 ms on low.
