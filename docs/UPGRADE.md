# THE SECOND FACE — the upgrade (owner directive, 2026-10-27, pass 5)

The owner's verdict on the Act 2 build: the look is a decade behind what the web can do now; the world is a set
of square maps stitched by loading screens; people do not look or move like people; the ground is a puzzle of
tiles; the palette is dark and dusty; the UI's cursive and the farmer's dungarees are wrong for the setting; the
names are flat ("the Something"); conversations loop; touch controls need two fingers to turn the camera; rerolls
are timid. All of it is to be fixed, in order, before content building resumes. This document is the plan and the
record. Progress is ticked in `docs/PROGRESS.md` §2c.

## 0. Binding rules from the directive (also in CLAUDE.md §2)
- **One open world.** The whole playable world is one continuous terrain, walked without loading screens, streamed
  around the player in the background with distance-based detail. Hand-built places sit in it at their world-map
  positions. Interiors that are genuinely enclosed (a cistern, a tower floor) open instantly through their door; no
  loading screen, ever. NON-NEGOTIABLE.
- **The bar is a modern isometric RPG** (Divinity: Original Sin 2 is the aspiration) within a 2026 phone's budget:
  physically based materials, real terrain with many surfaces and surviving greenery, shadows, ambient occlusion,
  bloom, weather, a lit palette (not sepia dust by default), dense detail, living places.
- **Humans look and move like humans**: real proportions, captured motion, materials with skin and cloth response.
- **Style fits the setting**: no cursive; typefaces of a hard, printed, administrative world; outfits of survivors
  and city people, not farmers.
- **Names feel found, not invented**: places, factions, events and things are named the way real places are (a
  surname, a pre-Burn brand, a thing that happened there, a corruption of an old word), not "the [noun]".
- **Conversations progress**: a person remembers the conversation, moves on, reacts to the state of the world and
  the hour; nothing loops; exposition is rationed.
- **Touch**: one finger turns the camera; tap moves; pinch zooms; the scheme is the one tablet isometric RPGs use.
- **Rerolls** have real variance (well above and well below the mean).
- **Portraits** appear without a visible wait.
- **Characters** have distinct personalities and rational, varied motives; relationships and romances have depth.

## 1. Engine decision
**Stay on TypeScript + three.js (WebGL2), upgrade the renderer and the world model; do not change engine.**

Why not Unity/Unreal/Godot: the game must ship to phones through GitHub Pages as a web build with no store, no
native toolchain and no servers. Unity/Unreal web exports are hundreds of megabytes, slow to start and poor on
mobile browsers; Godot 4's web export needs cross-origin isolation and still underperforms three.js on phones. All
systems (dialogue, quests, combat, saves, 54 quests of content) are already TypeScript and engine-agnostic; only the
scene layer changes. three.js can do everything the bar needs: PBR, cascaded shadows, SSAO/GTAO, instancing,
skinned glTF with animation retargeting, texture arrays, streaming. The quality gap is **assets, lighting and world
structure**, not the library. Those are what this plan changes.

Asset policy: CC0 only, fetched by scripts into `public/assets/world/` with a licence manifest (`CREDITS.md`).
Sources: Poly Haven (PBR textures, glTF props and plants with LODs), ambientCG (textures), Carnegie Mellon mocap
(BVH; no restrictions) and Quaternius' Universal Animation Library (CC0) for motion, the CC0 MakeHuman base mesh
already in the project for people. Textures are shipped as WebP at 1024/512 px; models meshopt-compressed GLB.

## 2. Execution order (each step is a commit that builds, passes `npm run check` and has screenshots)
Content building (B3.11 onwards) is paused until U1–U5 are in.

- **U1 Foundation — materials, ground, light.** Asset pipeline; a material library of real PBR surfaces; every
  map's ground becomes one blended terrain mesh (surfaces splat into each other; no tile seams); walls and roofs
  get real brick/concrete/metal/tin/plaster; the sun, sky and fog curves are re-lit for a clear, coloured world
  (dust and sepia become weather and mood, not the default); shadows softened; ambient occlusion; tone mapping.
  Quick asks folded in because they are independent and small: typefaces, the default outfit, reroll variance,
  portrait pre-warming.
- **U2 Open world — one terrain.** World coordinates (1 km on the world map = 12 m walked: an 8.4 km × 6 km
  world); a continuous heightfield with climate by region (salt pans, fused glass, grass plains, delta coast,
  smog city, mountains with pine and snow, craters, rain forest, rivers, a sea); the hand-built places stamped in
  at their positions (Meridian's districts side by side; the wilds places in their regions); roads and rails laid
  between them; chunked streaming with detail rings and a far horizon; pathfinding over terrain; people and
  places persist in the world; the world map becomes a map of it (fast travel = vehicles in the world, with time
  passing); interiors as instant cells; save migration. No map exits, no loading screens.
- **U3 Living world.** Biome vegetation by instancing (grass, scrub, surviving and overgrown greenery where
  water is, dead stands where it is not, pine and snow in the mountains), rocks and ruins, real props from the
  model library, roadside detail, water and shorelines, weather per region, more background life.
- **U4 People.** Captured motion (CMU/UAL clips retargeted to the MakeHuman rig: idle, walk, run, turn, sit,
  talk gestures, combat), locomotion blending, skin/cloth/hair materials, a sharper close LOD, outfits per role
  and region without the farmer look, stronger visual variance; portraits pre-rendered and cached.
- **U5 Camera and touch.** One-finger drag turns (and tilts within limits), tap moves, pinch zooms, two-finger
  drag pans, a compass button to snap north and recentre; edge cases on phones (no accidental turns on taps).
- **U6 Naming.** A naming bible (how this world names things) and a rename of factions, places, events, items and
  quests across content and docs; neutral ids stay, so saves and tests survive.
- **U7 Conversation.** Topic memory and exhaustion, state-aware greetings, interjections, reactions to the
  hour/weather/news/companions, no re-openable loops, exposition rationed; a pass over existing trees.
- **U8 Characters and relationships.** Personality and motive bibles per named character, relationship arcs and
  romances rewritten to genre best practice, natural talk over exposition.
- **Then** B3.11+ resumes on the new foundation.

## 3. Targets and budgets (phones first)
- 30 fps on a 2022 mid-range phone at DPR ≤ 1.5; ≤ 200 draw calls in view; ≤ 120 MB GPU textures; first load ≤
  25 MB before play (the rest streams); chunk build ≤ 4 ms per frame slice.
- Visible world: full detail within ~60 m, reduced to ~160 m, silhouettes and haze beyond.
- Everything the owner judges is judged from screenshots at phone and tablet sizes (`docs/evidence/u*/`).

## 4. Log
(Each U-step appends a dated note here when it lands: what changed, what the evidence shows, what is left.)

- **2026-10-27 U1a — materials, ground, light.** `tools/assets/materials.py` fetches 30 CC0 Poly Haven surfaces
  (floors, walls, biomes) as WebP 1024/512 with a credits file; `assets/pbr.ts` serves them as 2D PBR maps (colour,
  normal, ARM) and as 512 px texture arrays; `scene/ground.ts` replaces the per-tile floor planes with one mesh whose
  vertices blend up to four surfaces (hard floors keep edges; a macro noise breaks the repeat); walls, roofs and props
  use the photographed surfaces with their tints softened to a wash; the sun/sky/fog curves are re-lit (blue sky
  fill at noon, warm dawn and dusk, clearer air), the sepia grade and film grain reduced to a light tint, shadows soft
  and larger, an environment map for metal and wet surfaces. Evidence `docs/evidence/u1/` (Shale, Dry Wells, the
  orchard, Ninebridge, Old Market, Lantern Row, the Crown). Left for U1b/c: typefaces, default outfit, reroll
  variance, portrait pre-warm, AO, rock walls (still faceted blobs until U3's real rocks), draw-call budget (Shale
  239 with shadows; U2/U3 restructure rendering anyway).
- **2026-10-27 U1b — the quick asks.** Typefaces: IBM Plex Mono for text and data, Barlow Condensed for headings,
  buttons and names, Special Elite (typewriter) in the notebook; the cursive is gone from the UI, the notebook and the
  world map. The default clothes are work trousers, a shirt and boots (`BASE_OUTFIT`, the Cistern issue item and the
  Cistern residents); no coverall. Rerolls are wide: each attribute lands between two below base and five above, so
  a roll's pool runs from well below the standard twelve to far above it (the player keeps the best). Conversation
  portraits: the figure a conversation needs is built during idle frames as you approach (cache of eight), one
  renderer is shared by every conversation and pre-created off screen, skin maps for close-ups are 1024 px. In the
  software-GL rig a cold open fell from 9.7 s to 0.37 s, a warmed one to 0.19 s, a reopen to 6 ms; on a phone GPU
  the cold case is a fraction of that. Ambient occlusion is deferred to U3 (it belongs with the renderer
  restructuring the streamed world needs). U1 is complete apart from that.
