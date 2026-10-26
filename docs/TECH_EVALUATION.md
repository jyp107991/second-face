# Technology evaluation — engine and pipeline (A4.1)

**Question:** should THE SECOND FACE move off its custom three.js engine to an open-source engine, and which
rendering/pipeline upgrades are worth taking regardless?

**Where we are:** TypeScript + Vite + three.js r186 (WebGL 2), ~12k lines of engine code, all game logic
engine-agnostic (data modules, pure TS systems with tests), deployed as a static site to GitHub Pages,
installable as a PWA. Target: browsers on desktop and **mid-range Android phones**, with a path to a native
Android build.

## Options
| Option | Quality ceiling | Mobile (browser) perf | Pages deploy | Migration cost | Risk |
|---|---|---|---|---|---|
| **Stay: three.js WebGL2** (+ pipeline upgrades below) | Good for detailed low-poly iso: PBR, shadows, post FX, custom shaders. No clustered lighting (point lights capped per scene). | Known; tunable; we control every draw call. | Trivial (static). | None. | Everything is ours to maintain; no editor (maps are data + generators). |
| **three.js WebGPU** (WebGPURenderer + TSL node materials; automatic WebGL2 fallback) | Same assets, better batching, compute for skinning/particles later. | Android Chrome has WebGPU on capable devices; fallback covers the rest. | Trivial. | Medium: our GLSL `onBeforeCompile` shaders (skin, cloth, hair) must be rewritten in TSL. | Renderer still maturing; two code paths to test. **Keep as an upgrade path, not now.** |
| **Godot 4.x** | Excellent editor, GI, animation tools; Forward+ renderer on desktop/native; Compatibility (GLES3) renderer on web. | **Weak on mobile browsers:** large wasm (tens of MB), long loads, single-threaded web builds are slow, Safari issues. Native Android export is strong. | Works but heavy. | **Total rewrite:** engine, UI, validators, tests, content formats (GDScript/C#); months. | Highest. Would trade a working web game for a better native one. |
| **Bevy** (Rust ECS) | Modern renderer, WebGPU/WebGL2, good perf. | Web/mobile usable but immature; no editor. | Works (wasm). | Total rewrite in Rust. | Highest; wrong size of team. |
| **Babylon.js** | Comparable to three.js; mature WebGPU, built-in PBR/post pipeline, GUI, inspector. | Similar to three.js. | Trivial. | Medium: rendering layer (~3–4k lines) only. | Low, but the gain is marginal; churn for little. |
| **PlayCanvas** | Good mobile-first engine (MIT). | Good. | Works. | Medium, and the **editor is a proprietary cloud service** (lock-in). | Medium. |

## Recommendation
**Stay on three.js.** The game's look (detailed low-poly, orthographic iso, heavy atmosphere) is well within
WebGL2's ceiling; the hard problems here are content, systems and asset quality, not renderer features. An
engine migration would spend months re-building what works and would weaken the primary target (the browser
on a phone). Keep **three.js WebGPU** as the upgrade path once its renderer stabilises and our shaders are
worth porting. For a native Android build use a **TWA/Capacitor wrapper** of the PWA, not an engine change.

Adopt now (within the current stack), in order of payoff:
1. **Texture compression (KTX2 / Basis UASTC+ETC1S)** for all static textures (garments, skins, props):
   4–8× less GPU memory and faster uploads; one build step (`toktx`/`basisu`), one transcoder wasm.
2. **Generated-texture discipline:** composite NPC skins at 512² for iso LOD (1024/2048 only in portraits),
   cache by appearance hash, build them in a Worker (OffscreenCanvas) so crowds don't stall the main thread.
3. **Geometry:** keep props instanced/merged; add a far LOD (impostor billboard) for distant NPCs; quantise
   and meshopt-compress the human base data (`human.bin` 35 MB) and split by need.
4. **Lighting:** bake per-map vertex AO at build time (cheap, big atmosphere win on walls/floors); AgX tone
   mapping; keep the shadow map to the key light; GTAO only on the High tier.
5. **Code splitting:** lazy-load the creator, notebook map, combat HUD and content chunks by act; keep the
   first paint under ~600 kB.
6. **Adaptive resolution + quality tiers** driven by measured frame time, not device guesses.
Everything is measured before and after (`docs/PERF.md`); nothing that costs visible quality goes in silently.

## Performance budget (mid-range Android, Chrome, medium tier)
≥30 fps in crowds (≥60 on Low), ≤150 draw calls, ≤300k triangles, ≤150 MB texture memory, ≤300 MB JS heap,
first interactive ≤15 s on 4G, ≤8 s on Wi-Fi.

**Owner decision requested:** confirm "stay on three.js" (recommended) or ask for a migration study of a
specific engine. Content work is engine-agnostic and continues either way.
