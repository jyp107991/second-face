# The Unity port — plan, conventions, how to work

Owner decision (2026-10-28): the game ships as an installable app, full screen without a browser bar, landscape,
Android first; the engine is **Unity 6.3 LTS (6000.3) with the Universal Render Pipeline**. This document is the
plan and the working rules for the port. It overrides the content roadmap until the port reaches parity with the
web game (then content building resumes at B3.11, in Unity).

## 1. What is kept, what is redesigned (owner, 2026-10-28, pass 7)

The Unity game is a **redesign**, not a port with better graphics. The owner's words: "do not anchor on the web game…
keep only the narrative/thematic elements and redesign a new game with new textures and assets."

**Kept — the narrative and thematic layer**
- The story (`story/`, spoiler rule unchanged), the world and its history (`docs/WORLD.md`), the characters and
  their relationships, the factions, the regions and places as *concepts* (Cistern 9, Shale, the Overpass,
  Tollhouse 9, Signal Hill, Dry Wells, Ninebridge, Openfield, the megacity districts…), the fiction of the economy
  (Tolls, scrip), of chrome (bionics, Drift), of the Burn and the Ledger.
- The narrative content as data: dialogues, quests, leads and conclusions, letters, world events, road encounters,
  the people (name, role, faction, routine, what they say), items as fiction (names, categories, descriptions),
  settlements and regions. `src/content/` stays the source of truth, `npm run validate` keeps it coherent, and the
  export to JSON feeds Unity. **The C# Core keeps it playable**: dialogue and quest engines, flags, conditions and
  effects, reputation and news, world events (no time limits), journeys, saves. Rules the content leans on (skill
  checks, flags, items in quests) keep their meaning; everything else in the rules is open to redesign.
- The owner's binding rules in `CLAUDE.md` §2: no time limits, no Fallout IP, one open world without loading
  screens, touch-first with one-finger camera, full romance, mature realism, XP + perks and turn-based combat (its
  kind stays; its depth is redesigned, with DOS2/BG3 as the benchmark).

**Redesigned — everything the player sees, hears and touches**
- **The world**: not tile maps drawn in legend characters. Places are built in 3D in Unity (modular prefab kits on
  terrain, authored layouts, real lighting); the web maps are layout notes only. Scale, traversal, verticality and
  the camera's relationship to places are re-planned for a 3D isometric camera of BG3's kind.
- **Every asset**: textures, materials, models, people, clothes, props, vegetation, VFX, UI, audio are chosen or
  made for the design (§4 asset strategy). Nothing is carried over because it exists; the web-era downsizes are
  gone with the web game.
- **People**: a new character pipeline chosen by quality on a phone (faces, bodies, clothes, hair, animation), with
  the face sculptor on blend shapes; not the web figure.
- **Camera, UI, audio**: new, on Cinemachine, UI Toolkit and the Audio Mixer.
- **The play systems**: combat depth (elevation, cover, surfaces, reactions, an AP economy worth planning around,
  called shots, bionic abilities), stealth that reads real light, crowds and schedules across the open world,
  physics (ragdolls, destructible cover, projectiles), an inventory and wardrobe worth looking at, barter, camps,
  travel with montages, a photo mode, controller support. Where a redesigned system changes a rule, the Core rule
  and its tests change with it; the narrative content is re-validated.
- The web grid and A* survive only as the interior pathing fallback until NavMesh covers every place.

**The constraint**: it runs on a modern Android phone (§4 device targets), measured through the CI APK on the
owner's phone, never assumed. The aspiration (DOS2, BG3, Cyberpunk) sets the direction of every choice; the phone
sets the budget.

## 2. Project layout

```
unity/                      the Unity project (opened by the editor / built by CI)
  Assets/
    SecondFace/
      Core/                 SecondFace.Core.asmdef — pure C#, no UnityEngine: data model, rules, dialogue, quests,
                            saves, world logic (ports of src/engine/{data,stats,inventory,dialogue,quests,world,
                            npc,save}). Also compiled and unit-tested outside Unity with the .NET SDK.
      Game/                 SecondFace.Game.asmdef — Unity side: rendering, terrain, people, camera, UI, audio
                            (ports of src/engine/{render,scene,assets,ui,audio} and game.ts).
      Editor/               SecondFace.Editor.asmdef — import pipelines, build script, menu tools.
      Tests/                EditMode and PlayMode tests (NUnit via Unity Test Framework).
      Shaders/              URP shaders (HLSL): splat ground, water, impostor cards, skin, cloth, hair, precip.
      Scenes/Boot.unity     the only authored scene: one bootstrap object; everything else is built from data.
    StreamingAssets/content/*.json   exported content (generated; committed).
    StreamingAssets/human/, world/   our binary data (human.bin, clips.bin, impostors…), generated/copied.
  Packages/manifest.json    URP, Input System, glTFast, UGUI/TMP, Test Framework.
  ProjectSettings/          Android: landscape (sensor landscape), immersive/fullscreen, IL2CPP, ARM64,
                            Vulkan + GLES3, min API 26, target latest; colour space linear.
core/                       the .NET solution that compiles SecondFace.Core and its tests locally
  SecondFace.Core.csproj    (links ../unity/Assets/SecondFace/Core/**/*.cs; netstandard2.1 as Unity does)
  SecondFace.Core.Tests/    NUnit tests (the same files Unity's EditMode tests use)
tools/port/export.ts        content → JSON
tools/port/assets.sh        copies public/assets into unity/Assets (idempotent)
.github/workflows/android.yml   game-ci/unity-builder: APK on push to main, attached as an artifact/release
```

Conventions:
- Core must not reference `UnityEngine`. Vectors and maths in Core use `System.Numerics`; the Game assembly
  converts at the boundary. Randomness is our own seeded `Rng` (same algorithm as `src/engine/core/rng.ts`, so
  content seeds give the same results as the web game).
- One C# file per TypeScript module where the shapes match (`height.ts` → `Height.cs`), same names for the same
  concepts, so a reader of either engine finds the other.
- No per-frame allocations in hot loops; pooled lists; structs for vectors; jobs/Burst only where measured.
- Mobile budgets: ≤ 150 draw calls per view (SRP Batcher + GPU instancing), ≤ 1.2 M triangles, textures ASTC,
  shadows one cascade at medium, dynamic resolution. Measured on a real phone through the CI APK.
- Saves: JSON in `Application.persistentDataPath`, versioned, migrations as in the web game (the web save is not
  imported: the port starts a new line of saves; v1 = the port's first format).

## 3. How work is verified (no Unity editor here)

The Claude session cannot run the Unity editor (it needs a licence and a desktop). The loop is:
1. **Core**: `dotnet build core/ && dotnet test core/` locally — compiles the pure C# and runs its tests.
2. **Game**: compile-checked locally against the editor's managed assemblies (`UnityEngine*.dll`, URP, Input
   System, glTFast) extracted from the Unity 6000.3 Linux editor archive into the session's scratch space
   (`tools/port/refs.sh` fetches them; they are not committed). That catches API misuse before CI:
   `dotnet build core/Game.Check.csproj -p:UnityManaged=<Editor/Data/Managed>` for the Game assembly and
   `core/Editor.Check.csproj` for the Editor assembly (the URP types it uses are stubbed in `core/stubs/`).
3. **CI**: `.github/workflows/android.yml` builds the Android APK with `game-ci/unity-builder` on every push to
   `main` (Library cached). A failed build's log is read back through the GitHub API and fixed. The APK is a
   workflow artifact and, on a tag, a release asset the owner installs on the phone.
4. **Tests in Unity**: `game-ci/unity-test-runner` runs the EditMode/PlayMode tests in the same workflow.
5. **Visual checks**: PlayMode screenshot tests write PNGs the workflow uploads as artifacts (the port's
   `docs/evidence/unity/`), reviewed in the session the way the web probes were.

### What the owner must do once (licence and signing)
Unity Personal is free but must be activated through Unity Hub on a desktop; CI reuses the resulting file:
1. Create a Unity ID at unity.com (free).
2. On any desktop (Windows/Mac/Linux), install Unity Hub, sign in, then Preferences → Licenses → **Add** →
   "Get a free personal license" and finish the activation. (An editor install is not needed.)
3. Find the licence file: Windows `C:\ProgramData\Unity\Unity_lic.ulf`, Mac
   `/Library/Application Support/Unity/Unity_lic.ulf`, Linux `~/.local/share/unity3d/Unity/Unity_lic.ulf`.
4. In the GitHub repository: Settings → Secrets and variables → Actions → New repository secret, three times:
   `UNITY_LICENSE` (the whole text of the `.ulf` file), `UNITY_EMAIL`, `UNITY_PASSWORD` (the Unity ID's).
5. Signing: the first builds use a debug keystore (installable by sideloading). For the Play Store later, a
   release keystore is generated and stored as `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASS`,
   `ANDROID_KEYALIAS_NAME`, `ANDROID_KEYALIAS_PASS`.
GameCI does not see or store the credentials; they stay in the repository's secrets.

## 4. The standard (owner: highest aesthetic and functionality a modern Android phone can run)

**Benchmarks and device targets.** The aspiration is DOS2 / BG3 for the isometric RPG (lit, dense, reactive places;
cinematic conversation; deep turn-based combat) and Cyberpunk 2077 for the megacity (verticality, neon and volume
light, crowds, bionics, decadence against squalor). The budget is the phone. Targets, measured on device:
- *Flagship 2024–26* (Snapdragon 8 Gen 2/3/Elite, Dimensity 9200+ class, 12 GB): 60 fps at native-with-STP
  upscale, full feature set.
- *Mid-range 2023–25* (Snapdragon 7-series / Dimensity 8000 class, 8 GB): 30–40 fps with dynamic resolution,
  reduced shadows/VFX/view distance; nothing missing that affects play.
- *Floor*: Vulkan, 6 GB RAM, Android 8+ (minSdk 26). Below it the game may refuse to run rather than look poor.
- Budgets per view (flagship / mid): ≤ 2.5 M / 1.2 M triangles, ≤ 300 / 150 draw calls after the GPU Resident
  Drawer, ≤ 24 / 12 skinned figures at close LOD, texture memory ≤ 1.5 / 0.9 GB (ASTC), 16.6 / 30 ms frame.

**The engine contract.** In each area the Unity feature that gives the most on a phone is the one used; nothing is
hand-rolled where Unity has a system for it. *Must* items gate their phase; *then* items follow once the must set
runs smoothly on device. Fallbacks for GLES3 phones are listed where a feature needs Vulkan/compute.

*Rendering (URP 17, Unity 6)*
- Must: Forward+ with many real lights (lanterns, fires, neon, headlamps, light cookies); a realtime sun with soft
  cascaded shadows (2 cascades flagship, 1 mid); Screen Space Shadows; SSAO; Light Layers so interiors stay dark
  at noon; reflection probes per interior.
- Must: Adaptive Probe Volumes with sky occlusion for baked bounce across the streamed world under a dynamic sky.
- Must: GPU Resident Drawer + GPU occlusion culling for every prop, tree, rock and grass instance; LOD groups on
  everything; baked octahedral impostors (our tool) beyond ~80 m. GLES3: resident drawer off, instancing on,
  shorter view distance.
- Must: Shader Graph materials — height-blended terrain layers with parallax where it reads, triplanar rock and
  ruin, water (depth fog, refraction, foam, flow), skin (wrapped-diffuse subsurface, 2 K composited maps),
  anisotropic hair cards, cloth with sheen and re-dye, emissive neon and holograms, global wetness and dust driven
  by weather.
- Must: Decal Renderer Feature (blood, scorch, grime, graffiti, markings, bullet marks).
- Must: Volumes with HDR + ACES, grading per region and mood, bloom, vignette, depth of field in conversation; TAA
  on flagship (SMAA mid); STP upscaling with dynamic resolution.
- Must: VFX Graph (Vulkan) for dust, rain, embers, sparks, smoke, flies, muzzle flash; Shuriken fallback on GLES3.
- Must: Unity Terrain per chunk from our heightfield (layers, holes for interiors, instanced detail grass, tree
  instancing); our own meshes only where an authored floor cannot be terrain.
- Then: SSR on water, planar reflections in the canals, volumetric local fog.

*People and animation*
- Must: Humanoid Mecanim — captured motion as humanoid clips (CMU and other free captures, converted by Blender
  headless in the tool pipeline), blend trees by speed and turn, layers and masks for aim and carry, Humanoid
  retargeting across every build.
- Must: Animation Rigging — foot IK on terrain and stairs, look-at, weapon hand IK, two-bone IK for reaching,
  leaning and sitting.
- Must: blend-shape faces (the sculptor and the ageing photograph live on them); blinks and expressions keyed from
  dialogue tone; LOD groups per figure; a crowd budget measured on device.
- Must: ragdolls on death and on going down, blending back to standing; hit reactions by body part (colliders per
  part for called shots).
- Then: Cloth on hero ponchos and coats where it runs; capture-quality facial expression.

*World and systems*
- Must: Addressables for everything streamed (chunks, places, people, audio) under memory budgets; content
  catalogs so content patches ship without a store update.
- Must: AI Navigation — NavMesh built at runtime per chunk, agents with avoidance and carving; crowds that flow;
  schedules that walk the whole open world.
- Must: PhysX for cover, doors, props, projectiles (raycasts with per-part hit zones), knockback, destructible
  cover, shell casings.
- Must: Cinemachine — the iso rig (one-finger turn, pinch, two-finger pan, collision), conversation shots
  (over-shoulder, two-shot), combat focus, impulse shake; Timeline for scripted moments; a photo mode.
- Must: Input System (touch, gamepad, keyboard/mouse, rebinding); UI Toolkit for all UI (USS themes, runtime data
  binding, responsive to every phone aspect); Localization wired from day one.
- Must: Audio Mixer with snapshots (indoor, outdoor, combat, conversation), spatial sources, footsteps by terrain
  layer, ambient and reverb zones, occlusion by raycast.
- Must: Adaptive Performance (thermal, dynamic resolution), Vulkan with frame pacing, IL2CPP, Burst jobs for
  terrain, crowds and pathing; the Frame and Memory Profilers on device at the end of every phase; Unity Cloud
  Diagnostics for crash reports from the owner's phone.

*Play (the overhaul in function, not only in look)*
- Combat (turn-based, as the owner keeps it): elevation and cover that matter, surfaces (fire, oil, water, dust,
  electricity from chrome and salvaged tech) that interact, reactions/overwatch, an AP economy with movement and
  action trade-offs, called shots on real hit zones, bionic abilities with Drift as the cost, environmental kills,
  squad tactics with companions, a tactical camera.
- Stealth reads the light on the body and the noise of the surface; disguises and papers; crowds to vanish into.
- Conversation as scenes: framed shots, faces that react, interjections from companions standing there.
- A world that moves: crowds and schedules on NavMesh across the open world, weather that wets and blinds, day and
  night that change who is where and what is lit; vehicles and travel as montages; camps.
- Quality of life at BG3's level: inventory that reads, a notebook worth reading, map and pins, controller support,
  accessibility (UI scale, contrast, rebinding), saves with screenshots, a photo mode.

**Asset strategy (new textures and assets, created or existing, whichever is best).**
- *Rule*: the repository is public, so every committed asset is redistributable (CC0, CC-BY with credit in
  `CREDITS.md`, or a licence that allows redistribution with the project). Anything else is generated by our tools
  from such sources, or built from scratch. The owner decides exceptions.
- *Environment*: 2 K PBR sets from Poly Haven and ambientCG (CC0) re-authored into our material library (height
  blends, weathering masks, decals); photogrammetry models from Poly Haven and Sketchfab CC0 for rocks, ruins,
  props; modular architecture kits built in Blender by our scripts (shelter concrete, frontier timber and scrap,
  megacity curtain wall and neon), trees and scrub as real meshes with LODs (CC0 sources, re-processed), impostors
  by our tool.
- *People*: a bake-off in the first redesign phase between the candidate pipelines (MakeHuman CC0 base with our
  Blender re-authoring; MB-Lab (open source) bases; Unity UMA for modularity), judged on face quality at portrait
  distance, body variety, clothing at 2 K, hair, animation retargeting and crowd cost, with screenshots the owner
  reviews. Clothing re-authored or newly built; skin maps synthesised at 2 K; hair as cards. Every garment obeys the
  wardrobe rule (owner, 2026-10-28; DESIGN_UNITY §4): this world's salvage, re-dyed, patched and taped, clean
  synthetics only on the megacity rich; found meshes are silhouettes only and are always re-textured by our bake.
- *Motion*: CMU and other free captures converted to Humanoid clips; what captures lack (deaths, getting up, turns
  in place, aims) is built by our tools or from other free libraries.
- *VFX, audio, UI*: VFX Graph effects built in-project; audio from CC0/CC-BY libraries (Freesound, OpenGameArt)
  mixed in-project; UI drawn in-project (USS, vector), typefaces under OFL.
- *Creation pipeline*: Blender headless scripts in `tools/`, Unity editor scripts for import, material and prefab
  assembly (the session cannot open the editor; CI runs it in batch mode for imports, bakes and PlayMode screenshot
  tests under a virtual display), content exported from TypeScript as before.

## 4a. Phases (each ends with a CI-built APK the owner can install)

- **P0 Foundation** — project skeleton, packages, Android settings (landscape, immersive), assemblies, content
  export, local compile/test loop, CI workflow, the Boot scene on the phone. *(nearly done)*
- **P1 Narrative core** — the pure-C# layer that keeps the story content playable: content model and loader,
  `Rng`, sheet and checks, items, dialogue engine, quests, flags, leads, reputation, news, factions, world events,
  journeys, saves; the tile grid as the interior fallback; people as data. Tests ported. *(nearly done; rules
  change later as the redesign needs)*
- **P2 Redesign and bake-off** — the design document of the Unity game (`docs/DESIGN_UNITY.md`: the camera and the
  world's scale, places and districts as 3D spaces, combat and systems at the standard above, UI, audio), the
  asset strategy executed as tests: the people pipeline bake-off, the material library and a modular kit, a first
  lit place, a vegetation and terrain test — each with CI screenshots the owner judges; the CI screenshot loop
  itself; Addressables and the streaming skeleton; the package set.
- **P3 World** — terrain chunks, streaming, APV, the terrain/rock/water shaders, sky and weather, vegetation and
  props through the resident drawer, places built as 3D prefabs with real lights and decals, NavMesh at runtime,
  the first region to the bar, measured on device.
- **P4 People** — the chosen pipeline at full quality: faces on blend shapes, skin/hair/cloth, Mecanim locomotion
  from captures, rigging, ragdolls, LODs, in-engine portraits, outfits and chrome from the wardrobe.
- **P5 Camera, touch and UI** — Cinemachine rig and conversation cameras, UI Toolkit screens (radial menu, HUD,
  notebook, map and travel, dialogue, combat, menus, settings, the sculptor), photo mode, gamepad.
- **P6 Systems and combat** — NavMesh actors and crowds, schedules across the world, the redesigned combat with
  physics, stealth on light, interactions and loot, journeys and vehicles with Timeline, the soundscape, Adaptive
  Performance and the profiler pass.
- **P7 Chapter One on the phone** — the opening through the stranger's map at the standard, end to end on device;
  then Act 1, the megacity, U6–U8 and B3.11 continue in Unity.

## 5. Log
- 2026-10-28 P0: decision recorded; .NET SDK in the session; Unity 6000.3.27f1 Linux editor archive fetched and its
  managed assemblies and the URP cross-platform template extracted (scratch space); content export tool
  (`npm run export`, 22 registries, 1.5 MB JSON); project skeleton with settings taken from Unity's own mobile
  template; Core/Game/Editor/Tests assemblies; Rng and ContentDb; Bootstrap title card; ProjectSetup creates the
  scene/pipeline/player settings in code; core builds and tests locally; CI workflows written to `tools/ci/`
  (the session cannot create `.github/workflows` files: the owner copies them). Open: the owner's licence secrets;
  the first CI build; URP package assemblies for a local compile check of the Game assembly.
- 2026-10-28 Owner: the workflows are in `.github/workflows/` (the first Android run reached game-ci and stopped at
  the missing licence secrets, which is the expected state); the Core workflow is green. Owner directive recorded:
  no anchoring on the web game's graphics; assets re-judged and remade for quality on a 2026 phone.
- 2026-10-28 Owner (pass 7): redesign on Unity — keep the narrative/thematic layer, rebuild everything else to the
  highest standard a modern Android phone runs (DOS2/BG3/Cyberpunk aspirational). §1, §4 and §4a rewritten; the
  wardrobe/appearance ports paused (they belong to the people pipeline chosen in P2); P1 closes as the narrative
  core.
- 2026-10-28 P2.3 pipelines in place (session scratch holds Blender 4.5, the MakeHuman CC0 data and community packs,
  the CMU trials): `tools/unity/assets.py` (CC0 textures by manifest), `tools/unity/kits/*.py` (modular kits as FBX,
  shelter first), `tools/unity/people/mh_build.py` (candidate A: MakeHuman base + macro and feature targets baked,
  Mecanim game rig, face/expression blend shapes, eyes/brows/lashes/hair fitted from proxies, Humanoid FBX per
  person), `tools/unity/motion/cmu2fbx.py` (CMU ASF/AMC → gait-cut, seam-looped clips → BVH → Blender → Humanoid FBX
  with a sidecar JSON for loop and root settings). Editor side: import post-processors bind materials and set
  Humanoid imports; code-built scenes (terrain, material sheet, shelter place, people lineup) are captured by the
  PlayMode screenshot tests. Candidates B (MB-Lab) and C (UMA) are evaluated after A's captures are judged.
- 2026-10-28 P2.3 continued: the people pipeline's local checks (Cycles renders in the session scratch) showed the
  fit of eyes, brows, lashes and hair is right and faces carry age, build and ancestry; clothing from the CC0 packs is
  fitted with the body hidden beneath; the eye's cornea is in the texture's alpha (clipped in Unity). Kits: shelter
  (20) and frontier (22). All 28 captured clips converted. `tools/unity/models.py` fetches CC0 glTF trees, scrub and
  rocks by manifest for the vegetation test.
- 2026-10-28 P2.4: the owner's wardrobe rule (every clothing asset lore-consistent: post-apocalyptic, cyberpunk,
  anarchistic) recorded in CLAUDE.md §2 and DESIGN_UNITY §4. `mh_build.py` now dresses the six bake-off people from
  a curated set of silhouettes (work shirt, cargo and wool trousers, boots, a tool rig, a long coat as a duster, a
  hood, a hoodie, a wrapped tunic, a skinsuit and silk coat for the rich) and bakes every garment's texture itself
  (`bake_cloth`: desaturated weave under a palette tint, hem grime, sun-fade, patches, tape bands); the packs'
  textures are never shipped. The Poly Haven scans are photoscan-grade (a pine is 17M triangles), so
  `tools/unity/models_bake.py` (Blender) welds, decimates to per-model budgets (2–9 K; one 24 K hero tree) and packs
  1 K JPEG textures into committed `.glb` files under `Models/Nature/` (26 models, ~30 MB); the needle conifers are
  not baked — they become card trees built in Blender (Sapling + baked branch cards) in P3, with impostors. CI no
  longer fetches models. `VegetationTestScene` scatters the baked set over the Sallow terrain (`vegetation_*`).
- 2026-10-28 P2.5: run 9 green. `tools/unity/kits/cards.py` renders foliage cards (pine, fir, broadleaf cluster,
  whole pine crown) unlit from the scans; `MaterialLibrary.Card` makes cutout double-sided materials for
  `mat_card:<name>` slots; bark textures (pine, brown, willow) in the texture library; the people postprocessor
  strips the `mat_` prefix (people had generic materials in Unity until now). The owner's hair rule recorded.
  **`docs/BUILD_PLAN_V1.md` written as the binding hand-off plan** (architecture, phases, hard-part specs,
  verification, pitfalls, decisions, next twenty steps); it is read right after PROGRESS.md in every session.
