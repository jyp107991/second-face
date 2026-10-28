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
- **2026-10-27 U2a — one world: coordinates, streaming, places in it.** The engine no longer loads a map at a
  time. `content/world/sites.ts` places every hand-built map in one tile grid (32768 × 8192 m; 1 km on the world
  map = 12 m walked): open places are stamped at their world-map positions with the rock or wall round their edges
  stripped so the ground runs on (Meridian's districts stand side by side), enclosed places (the cisterns, tower
  floors, roofs, the Crown) are cells kept apart and entered instantly through their doors. `world/worldGrid.ts`
  answers walking, fighting and standing for the whole world (the loaded sites where they stand, the region's
  terrain everywhere else; far goals are walked in legs of 120 m). `scene/stream.ts` builds sites as they come
  within 150 m and lets them go past 230 m, fills the ground between with 128 m terrain chunks blended from each
  region's four surfaces, and parks the open world while you are in a cell. Walking out of a place is walking: the
  location under your feet changes to the region (`wild:sallow`) and back with no screen; a door is a short fade.
  People, dropped things and the player persist map-local, so places may move in the world between versions (save
  v6). The world map, trips, schedules, extras, camps, encounters and the notebook all work in world tiles; the dev
  overlay and all 27 QA smokes were moved to the place-local helpers (`placeLocal`, `walkLocal`, `interactLocal`,
  `findPathLocal`). Evidence `docs/evidence/u2/` and `tools/qa/openworld.cjs`: the Cistern's door onto the mouth,
  the walk out into the Sallow with chunks streaming, Shale built as you near it and entered on foot with its people
  in it, saves in the wild and in a place, the mouth let go behind you. What it looks like is not yet what the
  directive asks: the ground is flat and its surfaces still read as a repeat, a place's floor meets the terrain at a
  straight edge, there are no roads, water, horizon or height. That is U2b, next: a heightfield with places
  flattened into it, world-space blending of a place's edge into the terrain (one shared surface array for the
  whole world; also fixes texture memory, 439 MB with three places loaded), roads and rails laid between places,
  rivers and the sea as unwalkable, a far horizon ring, the world map drawn from the world, vehicles as the fast
  travel. Draw calls at Shale with two neighbours loaded: 167 (budget 150; U3's instancing and U2b's merged chunks
  bring it down).
- **2026-10-27 U2b.1 — one surface set, no edges.** The whole world now draws its ground with one material: every
  library surface (30) in one texture array (`assets/pbr.ts worldLayers`; 256 px on medium detail, 512 on high), so a
  place's floor, the terrain round it and its neighbours share layer indices. The splat mesh changed shape: each mesh
  carries a fixed table of up to eight surfaces and its vertices carry weights only (`scene/ground.ts`), which
  interpolate cleanly (the old per-vertex layer indices smeared through unrelated layers between vertices once the
  array held 30, and gave a stair-stepped edge where a place's surface met the terrain). Terrain chunks list the
  region's four surfaces and the surfaces of the places they run up to, and within 14 m of a place the region's
  patches give way to that place's own ground (`world/terrain.ts FEATHER`); a stripped rim takes the map's commonest
  open floor (a district's rim is rubble, not sand); the old 400 m skirt plane is gone for open places (it was the
  tiled brown wallpaper in the first U2a shots). The repeat is broken for good by stochastic triangle tiling (Heitz &
  Neyret: three randomly offset samples per surface, contrast restored round the texture's mean) and a slow drift of
  tone and warmth; the region's patches come in clear, frayed shapes. Evidence `docs/evidence/u2/wild_*.png` (outside
  the Cistern mouth, Shale, Ninebridge, Openfield) and `edge_*.png` (inside them at the edge); `tools/qa/wild.cjs`,
  `tools/qa/edges.cjs`. Still flat; the heightfield is U2b.2. Texture memory barely moved (427 MB at Shale with two
  neighbours): the arrays were never the bulk, the people are (each figure its own skin and cloth maps) — U4's job.
- **2026-10-27 U2b.2 — the lie of the land.** One continuous heightfield over the world (`world/height.ts`): each
  region has its own relief (dunes with sharp crests in the Sallow, a near-flat pan on the Flats, plains along the
  Line, a shore that dips under the sea, mountains with ridges in the Teeth, craters in the Ashlands, hills in the
  Wet), three scales each (the region's sweep, walking-scale ridges and hummocks, fine ripples), blended across
  region borders. Hand-built places stand on pads: level at the place's own height (the natural ground under its
  centre), the terrain eased onto the pad over 28 m. Chunk vertices follow the field, carry true normals and a
  curvature term (hollows in shade, crests catching the sky), and throw shadows. Water lies at level 0 (one plane
  under the open world); ground below it or steeper than 0.75 is not walked (`WorldGrid.blocked`, from cached tile
  heights so pathing stays fast). Everything that stood on y = 0 now stands on the ground: actors (feet follow the
  field while walking), places and their lights, the tap pick (a ray against the terrain and the places' floors),
  the path marker, the cursor, dropped things, reach and path dots, decals. Streaming runs on the real clock, builds
  up to four chunks a tick, and an arrival fills its ring of ground before the fade lifts. Evidence
  `docs/evidence/u2/relief_*.png` (the Sallow's dunes, Shale on its pad, the Teeth, the shore, the Wet);
  `tools/qa/relief.cjs`; `openworld.cjs` all green on the heightfield. Flat-looking still: the gentler regions read
  as flat until U3 puts rocks, scrub and trees on them (parallax is what sells relief from above), and the sun arc
  stays high. Next U2b.3: roads and rails between places, rivers carved to the sea, a far horizon.
- **2026-10-27 U2b.3 — the ways and the water.** `world/ways.ts` turns the world map's routes into ways across the
  land: roads (asphalt, 5 m), tracks (dirt), rough going (gravel), glass and marsh crossings, each with a wander in
  it so nothing runs ruler-straight; the Line's rails (gravel ballast, with sleepers and two rails laid along it in
  every chunk it crosses); the river the barges run, from the timber country past the Dam and Low Landing to the
  city and on to the sea. Chunks lay each way's surface over the ground, fading over its verge; the heightfield
  carves the river's bed and banks and drops the land away west of a ragged coast at about 32 km, so the sea and
  the river are water (one plane at level 0) and are not walked, while a road, track or rail is walked whatever the
  slope. A far ring of coarse, vertex-coloured ground (1.15 km) follows the player under the near chunks so a zoomed-out
  or fast-moving view never ends in a void. Every place is kept above the water. Evidence `docs/evidence/u2/way_*.png`
  (the track to Shale, a road, the Line, the river's bank, the coast, a zoomed-out view); `tools/qa/ways.cjs`.
  Known and left for U3: the water is a flat tinted plane (a water shader with shore foam and depth comes with the
  shores work); the Overpass's old flat highway deck shows from afar as a cream slab (real props); the Drowned Shore
  sits largely at or below the water, as marsh should, but Gull Stilts and the Rigs will want stilts and causeways.
- **2026-10-27 U2b.4a — the field map is a map of the world.** `ui/mapImage.ts` samples the heightfield over the
  whole Reach (3 km to a pixel), colours it by region, lights it from the north-west, paints the sea and the drowned
  ground as water and the high Teeth as snow, built in idle time from the first frame and finished in earnest while
  the map is open. The map screen draws it under the paper, the river and the Line as the land is (everyone knows
  where they run), roads and tracks between known places as they actually wander (the same polylines the terrain
  lays), and a mark where you stand, to the kilometre, from your tile in the open world. Evidence
  `docs/evidence/u2/map_1_early.png` (the Cistern and Shale known, standing on the track between them) and
  `map_2_reach.png` (the Reach known); `tools/qa/fieldmap.cjs`. Next U2b.4b: travel from the map — on foot means
  walking the ways with the clock running fast, vehicles (the Line, the barges, the caravan) board at their stops.
- **2026-10-27 U2b.4b — travel is walking, or a ride.** From the map, "Walk there" sets the player walking the
  ways to a place, point by point, the way joined at the nearest point from wherever they stand, with the clock
  running at one game minute a real second (`Game.startJourney`, `world/ways.ts journeyHours`): the Cistern to
  Shale is a walk of about two hours. Each leg rolls its discoveries and its one chance of trouble as it begins;
  trouble that has a map of its own stops the walk there and the roadside map's exit carries the trip on as before.
  A tap, a fight or the arrival ends the walk (and the fast clock). Vehicles are the networks at their stops: the
  side panel offers the Line, the barges or the Tollmen caravan where one calls, with the fare and the hours
  (timetable waits included), "Board" pays and the world moves while you ride. Taps now work in the open country
  (they were gated on standing in a place). The old "Set out" teleport is gone. Evidence
  `docs/evidence/u2/journey_*.png`; `tools/qa/journey.cjs` (walk to Shale from the map; the caravan to Ninebridge
  with the fare paid). The caravan's timetable (every three days) makes a long wait of a short ride: the networks'
  schedules are content for M4 to tune. U2b is complete; U2c (budgets and phone profiling) follows U3's
  instancing, since the same work settles both.
- **2026-10-27 U3.1 — what grows and lies on the land.** A model library of CC0 plants, trees and rocks from Poly
  Haven (`tools/assets/models.py`: 25 assets fetched as glTF, decimated to phone counts — trees ≤ 1.5–2.5 k
  triangles, shrubs ≤ 400, grass ≤ 150, rocks ≤ 300–500 — textures at 512 px WebP, meshopt-compressed; 4.7 MB in
  all; `public/assets/world/MODEL_CREDITS.md`). `assets/models.ts` loads them (quantised positions read back to
  floats; a Poly Haven set laid out side by side is split into variants, each stood on the ground). `world/flora.ts`
  sows each region by rules — the Sallow's dry shrubs, quiver trees, dead trunks and stones; the Line's grass, weeds
  and bushy trees; the Shore's grass, nettles and dead trees; the Wet's ferns, celandine, broadleaf and big trees,
  firs; the Teeth's firs, boulders and scree; the Ashlands' dead scrub and black rock — in patches, thicker by the
  water (grass follows the waterline even in the dry country), never on a place's pad, a way, the water or a cliff.
  Each loaded chunk places its own; one instanced mesh per model variant and part draws what lies within 120 m of
  the player, rebuilt as chunks come and go and as the player moves; trees cast shadows; trees, boulders and stumps
  block walking. Trees are a different animal: Poly Haven's trees are photoscans of a million triangles with every
  leaf as geometry, and decimated to phone counts the leaves come apart. So trees are impostors
  (`tools/assets/impostors.py`, `tools/assets/bake/impostor.html`): each tree is rendered from eight directions at
  the game camera's pitch, from the full-detail model with its leaf alpha maps folded in, lit nearly flat, into one
  atlas (384 px tall cells, 30–125 KB a tree, eight trees in 0.7 MB); in the world each tree is a card that turns to
  face the camera and shows the view nearest its angle, lit by the game's sun on a normal that leans up and toward
  the camera, casting a tree-shaped shadow from its silhouette (`world/impostors.ts`). Two triangles a tree, so
  stands are cheap. At the Cistern mouth: ~5 000 things placed over nine chunks, ~620 k triangles drawn with
  shadows, 60 draw calls. Evidence `docs/evidence/u2/flora_closeup.png`, `flora_tree_closeup.png`, `relief_*.png`.
  Left to tune with eyes on a phone: densities per region, tree stands, a grass LOD that drops the far tufts, and
  the card's shading (a baked normal or a second atlas of lighting from the sun's side would give the canopy
  real form).
- **2026-10-27 U3.2 — the water and its edge.** The water is a moving surface: its normal is stirred by three
  drifting noise fields, so the sun lays a wandering glint across it and the shore's edge wobbles
  (`scene/stream.ts waterMaterial`). The ground has a waterline: wet, darker ground in the first metre above the
  water, a thin pale line of dried foam at the level, and the drowned ground seen through the water darker and bluer
  the deeper it lies (`scene/ground.ts`). The far ring takes the lowest ground in each cell and every surface's
  colour, so it no longer shows through the fine ground on a mountainside.
- **2026-10-27 U3.3 — real things in places.** Twenty-two CC0 prop models join the library (`tools/assets/models.py`
  `p_*`: steel drums, a rusted drum, a crate and a cardboard box, plastic and wooden chairs, a table and a picnic
  table, steel shelves, two street lamps, a car under a tarp, a tyre, a stone fire pit, a barrel stove, a power
  box, a bin, a tool chest, a bucket, a concrete barrier; 300–2 500 triangles each, 7 MB for the whole library).
  `assets/propModels.ts` says which built box props they stand in for (barrels, crates, chairs, tables, shelves,
  lamp posts, car wrecks, tyre piles, campfires, stoves, machines, rocks and dead trees); a place built from its
  map places the model instead of the boxes, keeps the boxes' features where they matter (a lamp's light, a fire),
  and once the models are loaded merges everything that shares a material into one static mesh, so a town of sixty
  props costs a dozen draws (`scene/stream.ts attachModelProps`). Signs, cots, counters, lockers, tents, debris and
  the rest stay built for now. Evidence `docs/evidence/u2/props_*.png` (Shale, the Old Market, the Overpass, Dry
  Wells); `tools/qa/props.cjs`. The Overpass's deck still reads as a pale slab from the terrain side (its map was
  drawn for a closed room); that is a map fix for the content pass, not the engine.
- **2026-10-27 U3.4 — weather by region, and small life.** The climate gains rain, fog and snow
  (`world/weather.ts`: the Wet and the Shore rain a quarter of their days and fog another sixth, the Teeth snow,
  the Sallow and the Flats never see any of it); each has its own sky (a rain-grey sun and a blue-grey fog, a pale
  close fog, a white snow light) and the rain its own sound (`audio.ts`). Rain and snow fall through a box that
  rides with the camera (`render/atmosphere.ts buildPrecip`: streaks that slant with the wind, flakes that sway)
  and stop under a roof. Smoke rises from the nearest fires (one cloud of motes for up to six fires, each mote
  born at its fire, drifting on the wind, swelling and thinning). `render/life.ts`: now and then a flock of seven
  birds crosses high over the player in a loose V, wings beating (not over the Ashlands, not in a storm, not at
  night; seldom over the dry country); in the Sallow, the Flats and the Ashlands a dust devil wanders by on a
  clear day. The sound bed in the open follows the region's ambience. Evidence `docs/evidence/u2/sky_*.png`;
  `tools/qa/sky.cjs`. U3 is in. Left on its list for the content pass: roadside detail along the ways (posts,
  wrecks, markers), which wants the naming and content work of U6 anyway.
- **2026-10-27 U4.1 — people move like people.** Every figure now runs on captured motion. The source is the CMU
  motion-capture database (free for any use with a credit, `public/assets/human/anim/MOTION_CREDITS.md`):
  `tools/assets/motion/cmu.mjs` reads a subject's skeleton and a trial, works out every bone's rotation in the
  world against the capture's own rest pose, turns the subject to face forward, and writes compact clips (int16
  quaternions at 30 fps, 615 KB for twenty-eight). A walk is one stride, found from the legs' rhythm and cut at
  the left foot's furthest swing, seam-blended into a loop and stamped with its true speed; a standing or sitting
  idle is a stretch of the trial cross-faded into a loop; a drink or a wave plays once. In the game the figure does
  not need the capture's proportions: for each bone it turns its own rest direction onto the source's and applies
  the captured rotation, so thighs, shins, arms and spine point where the captured ones pointed whatever the build,
  and the pelvis rides at the capture's height scaled to the body's own. Gaits are chosen by the pace the walk is
  heading for (so a start does not run through every gait) and played at the actor's speed over the clip's, which
  keeps the feet planted; clip changes cross-fade and a gait change keeps the stride's phase. The procedural layer
  stays on top for what captures cannot know: the head turning to whoever is near, a flinch, the aimed arm, the
  fall. People walk at a walking pace now (1.7 m/s) while the player keeps the jog of a modern isometric RPG; a
  companion matches the player. Standing people stretch or yawn now and then. Evidence
  `docs/evidence/u4/clips/*.png`, `docs/evidence/u4/motion_*.png`. Not yet captured: a death (the database's falls
  are stunts), getting up, a turn in place; they stay procedural for now.
- **2026-10-27 App directive (owner, pass 6).** The release must be an installable app running full screen, no
  browser bar, in landscape — not a web page. Speed is to be improved wherever it costs nothing in aesthetics or
  experience, by modern mobile best practice. Because the output is an app, alternative engines are to be weighed
  again if the only case against them was build size and poor browser running. Assessment given to the owner the
  same day (engine kept or ported is the owner's call; see the session's write-up). Work items opened either way:
  **U9 App shell** — a native shell around the game (Capacitor: Android APK/AAB first, iOS when a Mac and an Apple
  account are available), landscape locked, immersive full screen, splash, hardware back, saves in app storage,
  built by CI and attached to releases; the web build stays as the dev/test harness. **U2c Performance pass** moves
  up: on-device profiling through the shell, WebGL2 as the production path (WebGPU in the Android WebView is still
  behind a flag in 2026), KTX2/Basis texture compression, resolution scaling, draw-call and skinned-mesh budgets,
  allocation-free hot loops, workers for chunk building, LOD rings.
- **2026-10-28 Engine decision (owner): port to Unity.** Offered the choice between shipping the three.js game in a
  native shell (recommended for cost) and a port to Godot or Unity, the owner chose **Unity**, Android first. The
  port programme is `docs/PORT.md`; U4.2+ and U5–U8 are carried out in Unity rather than in the web engine. The
  web engine stays as the reference for behaviour and visuals (every U1–U4.1 result is the bar the port must meet
  or beat) and as the content validator.
