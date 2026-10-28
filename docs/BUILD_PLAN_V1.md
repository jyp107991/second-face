# THE SECOND FACE — the build plan to v1 (Unity 6, Android)

**Status: binding hand-off plan, written 2026-10-28.** It exists so that the build continues at the same standard
whichever model or session executes it. It is prescriptive on purpose: where it says *do X this way*, do X that way
unless the owner says otherwise. Where it leaves a choice, it says so. Read it top to bottom once before the first
step of any session, then keep it open beside `docs/PROGRESS.md`.

Reading order for a fresh session: `CLAUDE.md` → `docs/PROGRESS.md` → this file → `docs/PORT.md` →
`docs/DESIGN_UNITY.md`. Story truth is only in `story/` and `src/content/` and is never quoted anywhere else.

---

## 0. Rules of engagement for whoever executes this

1. **Small steps, each verified, each committed and pushed to `main`** (CLAUDE.md §0). A step is at most an hour
   of work and ends with: the local checks green (§7), `docs/PROGRESS.md` updated (what is done, the exact next
   action), one commit, one push (retry 2/4/8/16 s). A WIP commit must still compile.
2. **Never invent an architecture.** §4 fixes the assemblies, the runtime object graph, the scene plan and the data
   flow. Add classes inside it; do not restructure it. If something in §4 is impossible, write why in PROGRESS.md
   and take the nearest shape that keeps the names.
3. **Never anchor on the web game** (`src/`). It is the content validator and the rules reference where a quest or
   check depends on a number. Its visuals, scene code and UI are not a reference (CLAUDE.md §2, pass 7).
4. **Everything visible is judged by screenshots the owner sees.** Every visual step ends with a capture in the
   PlayMode `ScreenshotTests` (CI artifact `Unity-screenshots`) and, while the editor is unavailable locally, a
   Cycles sanity render in the session scratch copied downscaled into `docs/evidence/unity/`. Do not describe a
   look you have not rendered.
5. **Licences**: the repository is public. Committed assets are CC0, CC-BY (credited in `docs/CREDITS.md`) or built
   by our tools. No other source. Nothing from Fallout, Cyberpunk or any other IP.
6. **No time limits in play** (CLAUDE.md §2). No spoilers anywhere outside `story/` and `src/content/`. Ids never
   change (saves and tests depend on them).
7. **Owner directives are law**: one open world without loading screens; Android first, landscape, full screen;
   the wardrobe rule (§3.3); the hair rule (§3.4); turn-based combat with the depth of DESIGN_UNITY §5.2.
8. **Do not widen a step.** If you see a second problem, write it in PROGRESS.md §5 (half-finished work) and finish
   the step you are on.
9. **Ask the owner only spoiler-free questions and only when a wrong assumption would waste more than a day.**
   Otherwise choose, write the choice in PROGRESS.md, and go on.
10. **Binary assets**: committed only when baked to their final phone form (a `.glb`, an `.fbx`, a 1–2 K texture).
    Source scans, raw photogrammetry and editor caches are never committed (`unity/.gitignore`). A commit over
    ~60 MB needs a reason written in its message.

---

## 1. What v1 is

**v1 is an installable Android app (APK from CI, later an AAB) that plays everything that exists in
`src/content/` at the standard of `docs/DESIGN_UNITY.md`, on one streamed open world, end to end, saved and
resumed, at a smooth frame rate on a 2024–2026 mid-range phone.** Today that content is the opening (Chapter
One, which ends when the player has the stranger's map), Act 1 (the frontier: the town, the toll fort, the relay,
the pump station, the wilds, the nomad camp) and the megacity districts of Act 2 built so far (B3.1–B3.10). The
remaining Act 2 content (B3.11 on) and the owner's later story passes are built in Unity after v1's systems are
in, on the same pipelines.

v1 acceptance (all must hold):
- Fresh install → title → character creation (face sculptor, body, skin, hair, scars, tattoos, clothing colours,
  attribute pool with reroll) → the opening → Chapter One complete → Act 1 complete → the megacity reached and
  every existing district playable → saves survive app restarts and a version bump (migrations tested).
- No loading screen after the title: places open as the player walks in; interiors open instantly; fast travel is
  a montage, not a load.
- 30 fps minimum on the Mid tier (PORT.md §4 device tiers), 60 on Flagship, with the frame budget measured on
  device at the end of every phase.
- The screenshot set of every system (§7.3) judged acceptable by the owner.

---

## 2. State of the repository on 2026-10-28

What exists and is verified:
- **`unity/`** Unity 6000.3.27f1, URP 17.3, Android IL2CPP ARM64, landscape immersive. `ProjectSetup.cs` creates
  the URP asset, player settings and the committed `Scenes/Boot.unity`; `BuildGuard` fails a build whose settings
  drifted. CI (`.github/workflows/android.yml`, owner-copied from `tools/ci/android.yml`) builds the APK on every
  push (GameCI unity-builder@v4; runs 5–9 green; artifact `SecondFace-Android-APK`). The second CI job
  (`tools/ci/android.yml` → *Unity tests and screenshots*: EditMode + PlayMode tests, uploads `unity/Screenshots`)
  exists in the template but **the owner has not yet copied the updated template over the workflow** (the
  session's token lacks the `workflow` scope). Until that happens, no engine screenshot exists; the evidence is
  Cycles renders in `docs/evidence/unity/`.
- **`SecondFace.Core`** (pure C#, 86 NUnit tests green locally via `core/SecondFace.Core.Tests`): content model
  (`Content/Model/*`: items, NPCs, maps, quests, dialogue, rules, roads, travel, world), `Registry`, `ContentDb`
  over `StreamingAssets/content/*.json` (exported by `npm run export` = `tools/port/export.ts`), `Rng` (the web
  sequence), `Stats` (sheet, checks, chrome/Drift), `Inventory` (items, barter), `Dialogue/DialogueRunner`,
  `Quest/QuestEngine`, `World/*` (factions, frontier, letters, logic, roads, travel, state), `Save/Saves`
  (versioned), `Scene/Grid` (A*, line of sight: the interior fallback), `Npc/*` (outfits, party, schedule),
  `Combat/Rules` (the web rules, to be redesigned per §6.G).
- **`SecondFace.Game`**: `Bootstrap` (full screen, loads content, title card), `World/TextureLibrary`
  (manifest of `tools/unity/assets.py`), `World/ModelLibrary` (manifest of the baked nature models).
- **`SecondFace.Editor`** (`Editor/Build/*`): `ExternalTexturePostprocessor`, `MaterialLibrary` (URP Lit from
  the texture library; `card:<name>` foliage materials) + `KitImportPostprocessor` (kits get library materials by
  slot name `mat_<key>`), `PeopleImportPostprocessor` (Humanoid people; materials by slot kind
  `skin:/eyes:/hair:/brows:/lashes:/cloth:<texture>`), `MotionImportPostprocessor` (Humanoid clips, loop from the
  sidecar JSON), and code-built test scenes: `TerrainTestScene`, `MaterialSheetScene`, `ShelterTestScene`,
  `FrontierTestScene`, `PeopleTestScene`, `VegetationTestScene`. `Tests/PlayMode/ScreenshotTests.cs` builds each
  and captures `unity/Screenshots/*.png`.
- **Asset pipelines (Python; Blender 4.5.9 headless for the heavy ones)**:
  - `tools/unity/assets.py` — CC0 textures (Poly Haven) by manifest → `unity/Assets/External/` (gitignored, CI
    caches by script hash): 36 materials at 2 K (`d`, `n`, `mask` = R metallic / G AO / B height / A smoothness,
    `h`), GUIDs = md5(`second-face:` + asset path).
  - `tools/unity/models.py` — CC0 glTF scans (Poly Haven) → `External/Models/` (gitignored, local only).
  - `tools/unity/models_bake.py` — Blender: welds, decimates to per-model budgets (2–9 K; one 24 K hero tree),
    1 K JPEG inside `.glb` → **committed** `unity/Assets/SecondFace/Models/Nature/*.glb` + `models.json`
    (size, `place: scatter|patch`). 27 models, 30 MB. Needle conifers are *not* baked (card trees, §6.L).
  - `tools/unity/kits/{kitlib,shelter,frontier}.py` — modular kits as FBX with `mat_<key>` slots (20 + 22 pieces,
    committed under `Kits/Shelter`, `Kits/Frontier`).
  - `tools/unity/kits/cards.py` — foliage cards rendered unlit from the conifer and broadleaf scans → committed
    `Kits/Trees/tex/card_*.png` (+ JSON sidecar with the card's metres). **Just written; the rotated (root at the
    bottom) bake was running when this plan was written — verify the four PNGs have the branch root at the
    bottom and coverage > 0 (§6.L) before using them.**
  - `tools/unity/people/mh_build.py` — people pipeline candidate A (MakeHuman CC0 base + community packs):
    macro/feature targets baked, the game rig (55 Mecanim-named bones), 69 face/expression blend shapes, proxies
    fitted by mhclo (eyes, brows, lashes, hair, clothes with the body hidden beneath), `bake_cloth` (the wardrobe
    rule applied per garment), Humanoid FBX + textures → committed `People/Bakeoff/p1..p6` (22 MB FBX + 110 MB
    textures: **too heavy; §6.B.6 says how to cut it before the full cast**).
  - `tools/unity/motion/cmu2fbx.py` — CMU ASF/AMC → canonical, gait-cut, seam-looped rows → BVH → Blender →
    Humanoid FBX with sidecar `{loop, root, speed, hip}` → committed `Motion/*.fbx` (28 clips).
- **Docs**: `docs/DESIGN_UNITY.md` (the redesigned game), `docs/PORT.md` (§1 kept/redesigned, §3 verification
  loop, §4 standard/tiers/asset strategy, §4a phases, §5 log), `docs/UPGRADE.md`, `docs/CREDITS.md`,
  `docs/evidence/unity/` (Cycles renders of the bake-off, README).

What is known broken or unverified:
- The people's materials in Unity were built with the `mat_` prefix left on the slot kind (fixed in
  `PeopleImportPostprocessor` on 2026-10-28, in the same commit as this plan); nothing in Unity has rendered a
  person yet (the screenshot job is not enabled). First thing after the owner copies the workflow: read the
  `people_lineup`, `portrait_*`, `motion_*` captures.
- The `.glb` import of the baked models relies on glTFast's editor importer (`com.unity.cloud.gltfast` 6.20) with
  a minimal `.meta` (guid only): verify in the first CI log that the 27 models import without errors and that
  `Test_Vegetation` shows them. If glTFast refuses the minimal meta, write a full ScriptedImporter meta (copy the
  one Unity writes for one `.glb` in the Library log) into `models_bake.py`.
- `bake_cloth` palette tones are first guesses; judge on the engine capture, not the Cycles render.
- Hair proxies on the bake-off people violate the hair rule (§3.4); replace per §6.C before any portrait is shown
  as "done".
- `tools/unity/kits/trees.py` (Sapling card trees) is **not written**; §6.L specifies it.
- The Addressables skeleton (P2) is not started; §6.A.7 specifies it.

Session scratch (ephemeral, must be re-provisioned in a new session, §7.1): Blender 4.5.9, the MakeHuman data and
community packs, the CMU trials, the Unity editor's managed DLLs, the .NET SDK, the Sapling extension.

---

## 3. Binding rules distilled (the owner's words are in CLAUDE.md §2; these are the operative forms)

### 3.1 World and presentation
- One continuous world, streamed, no loading screens after the title; interiors open instantly (§6.A).
- Modern isometric RPG bar on a phone: PBR, real terrain with many surfaces and surviving greenery, a lit palette
  (not dark/dusty by default), dense living places; the camera turns with one finger, pinch zooms, two fingers pan,
  tap moves (§6.F).
- Names that feel found; no "the [noun]"; no cursive type; no farmer's dungarees; no masks as a motif
  (DESIGN.md "Masks are not a motif": dust covers when the wind is up, hoods and scarves for disguise).

### 3.2 Play
- XP levels + perks; classic turn-based combat, redesigned to DESIGN_UNITY §5.2 (§6.G). No global karma;
  reputation is local and travels with people. Field notebook and map, not a wrist computer.
- No time limits of any kind. Scheduled events wait for the player; durations are allowed.
- Conversations progress and never loop; romance opt-in and consent-forward; mature themes without filter where
  coherent; text only.

### 3.3 Wardrobe (owner, 2026-10-28)
Every clothing asset is this world's: post-apocalyptic, cyberpunk, anarchistic. Salvaged, re-dyed in the found
palette, patched with other cloth, grimed from the hem up, sun-faded, taped at knee and cuff, carried in rigs and
straps; the megacity street adds reflective tape, cable and cheap synthetics; the rich wear clean synthetics and
silk with lit trims. Nothing modern-fashion, printed, logoed, costume or uniform-as-such. Found meshes are
silhouettes only; their textures are never shipped (`bake_cloth` re-textures every garment).

### 3.4 Hair and grooming (owner, 2026-10-28, new)
**Hair is gritty and functional, never a styled modern cut, never gel, never a salon shape.** Allowed: shaved or
buzzed scalps; hair cropped short and uneven as if cut with a knife; hair tied back, in a rough bun or a work
braid; long hair matted or wind-blown and usually under a scarf, wrap or hood; receding and balding; beards
unkempt or roughly trimmed. Hair is dull (low smoothness), dusty, often sun-bleached at the ends or greying in
streaks; never glossy, never a clean highlight. Bobs, bangs, blow-dried volume, undercuts with product, sculpted
waves are forbidden. The same grit applies to faces (sun, dirt in creases, chapped lips, old scars) and to every
other aesthetic choice: functional, worn, weathered, except in the megacity's rich districts where cleanliness is
itself the costume. §6.C is the implementation.

### 3.5 Engineering
- Assemblies and layout of §4; Core stays pure C# and tested outside Unity.
- Mobile budgets: ≤ 150 draw calls visible for a scene before the resident drawer, instanced scatter, atlases,
  ≤ 2 K textures (1 K for scatter and cards), ≤ 60 K triangles on screen on Mid, skinned people ≤ 15 K triangles
  at LOD0 with 3 LODs.
- Save format versioned with migrations (Core `Save/Saves`); every schema change adds a migration and a test.

---

## 4. Architecture (follow exactly)

### 4.1 Assemblies
- `SecondFace.Core` — pure C#, no UnityEngine. Content model, rules, state, saves, dialogue, quests, grid.
  Tested by `core/SecondFace.Core.Tests` (NUnit, `dotnet test`) and mirrored by `Tests/EditMode`.
- `SecondFace.Game` — runtime. Folders (one namespace each, `SecondFace.Game.<Folder>`): `Boot`, `World`
  (streaming, terrain, places, time/weather, scatter), `People` (actors, wardrobe, animation, LOD, portraits),
  `Camera` (rig, touch), `UI` (UI Toolkit screens), `Play` (interactions, exploration, stealth, schedules),
  `Combat`, `Travel`, `Audio`, `Save` (bridges Core saves to the device). Add an asmdef per folder only when compile
  time demands it.
- `SecondFace.Editor` — import post-processors, code-built scenes, build steps, asset bakes that need the editor.
- `SecondFace.Tests.EditMode`, `SecondFace.Tests.PlayMode` — the latter owns `ScreenshotTests`.

### 4.2 Runtime object graph (the service layer)
A single `GameRoot` prefab lives in `Boot.unity`, `DontDestroyOnLoad`, and owns these components (plain
MonoBehaviours, no DI framework, found through `GameRoot.Instance.<Service>`):
`ContentService` (loads `StreamingAssets/content` into `Registry`), `SaveService` (Core `Saves` + device files,
slots, autosave), `WorldService` (the streamed world: §6.A), `TimeService` (world clock, day/night, weather by
region), `PeopleService` (actor spawn/despawn, wardrobe, schedules), `CameraService` (§6.F),
`InputService` (new Input System, touch + gamepad), `UIService` (UI Toolkit root, screen stack), `CombatService`
(§6.G), `TravelService` (journeys, vehicles, montage), `AudioService` (mixer, soundscape), `QualityService`
(tier, Adaptive Performance). Each service exposes plain C# events; nothing polls another service in `Update`.

### 4.3 Scenes
- `Boot.unity` (committed, in Build Settings): GameRoot + title. The only scene in the build list.
- The world is **not scenes**: chunks are Addressables prefabs instantiated by `WorldService` (§6.A). Interiors
  are prefabs too, instantiated under the chunk when the player is within 40 m of their door and positioned at
  their world coordinates (no additive scene loads: those stall).
- Test scenes (`Scenes/Test_*.unity`) are generated by `Editor/Build/*Scene.cs`, gitignored, captured by tests.

### 4.4 Data flow
`src/content` (TypeScript, validated by `npm run validate`) → `npm run export` → `StreamingAssets/content/*.json`
→ `ContentDb`/`Registry` (Core) → services. Places, kits, people, clips, cards, audio and materials are
Addressables groups keyed by region and place (§6.A.7). Content ids are the join keys everywhere; never derive
ids from names.

### 4.5 Naming and conventions
- Material slots from Blender: `mat_<library key>` for kits; `mat_<kind>:<texture>` for people
  (`skin`, `eyes`, `hair`, `brows`, `lashes`, `cloth`); `mat_card:<card>` for foliage. Post-processors strip the
  `mat_` prefix (both do now).
- Stable GUIDs for generated metas: md5(`second-face:` + asset path). Never let Unity invent a GUID for a
  generated asset (the scene references would break on regeneration).
- Generated-at-import assets live under `Assets/SecondFace/Generated/` (gitignored).
- Baked committed assets: `Models/Nature/*.glb`, `Kits/<Kit>/*.fbx`, `Kits/Trees/*.fbx` + `tex/`,
  `People/<Set>/*.fbx` + `tex/`, `Motion/*.fbx` + `.json`.

---

## 5. The phases, step by step

Each phase ends with a CI-built APK the owner installs and a screenshot set the owner judges. Steps are in order;
each is one commit or a few WIP commits. Budgets and acceptance are part of the step.

### P2 — close the bake-off (in progress; finish in this order)
1. **Verify the cards** (`Kits/Trees/tex/card_*.png`): coverage > 15 %, root at the bottom; if the rotation
   produced a transposed or mirrored image, fix `cards.py` (`np.rot90` direction) and re-bake. Commit.
2. **Hair rule on the bake-off people** (§6.C): change the six `hair` entries, add the scalp cap and `bake_hair`,
   rebuild, render, commit. The lineup and portraits in `docs/evidence/unity/` are refreshed.
3. **Skin grit** (§6.C.4): `bake_skin` (sun, dirt in creases, chapped lips) applied to the six skins; rebuild;
   commit.
4. **People asset weight** (§6.B.6): textures to 1 K for cloth and hair, 2 K skin kept, FBX without the unused
   expression shapes on NPCs (keep them on the player prefab only). Target ≤ 8 MB per person.
5. **`trees.py`** (§6.L): three species × three variants as FBX under `Kits/Trees/`, ≤ 3 K triangles each, and a
   `Test_Vegetation` second capture (`vegetation_teeth`) on a conifer hillside. Commit.
6. **Addressables skeleton** (§6.A.7): groups, labels, the `AddressablesBuild` editor step in CI before the APK
   build, a smoke test that loads one kit prefab by address in PlayMode. Commit.
7. **Owner action**: copy `tools/ci/android.yml` → `.github/workflows/android.yml`. Then read every capture, fix
   what they show (one commit per fix), and write the P2 verdict in PORT.md §5: candidate A is the people pipeline
   unless the portraits fail the bar, in which case run candidate B (MB-Lab, GPL-safe only as a tool: export
   results, never its code) on the same six briefs and compare.

### P3 — World
1. `WorldService` + chunk grid + the control map + runtime terrain generation (§6.A.1–A.4), with a PlayMode test
   that walks a camera across 4 chunks and asserts no frame over 33 ms on the CI machine and no missing chunk.
2. Terrain shader: URP Terrain Lit with 8 layers, height-blended, triplanar on steep slopes (§6.J). Capture
   `world_sallow`, `world_teeth`, `world_shore`.
3. Sky, sun and weather: Unity 6 URP physically based sky is HDRP-only, so use a gradient + procedural sky
   shader (§6.J), a `TimeService` day cycle, fog by region, dust and rain as particle layers. Capture at 7:00,
   13:00, 19:00, night.
4. Scatter through the GPU Resident Drawer (URP 17: enable in the URP asset; instanced `MeshRenderer`s with
   `LODGroup`s) from the baked nature models and the card trees, placed by the rules in `VegetationTestScene`
   generalised into `ScatterRules` (biome × slope × height × wash × noise), generated per chunk at load with the
   chunk's seed. Grass as terrain detail. Capture `world_scatter_dense` with the frame time printed.
5. Places as prefabs: the kit pieces assembled by `PlaceBuilder` from a place layout file
   (`src/content/maps` → exported JSON; §6.A.5) with real lights (baked none; realtime point lights ≤ 4 visible,
   emissive materials for the rest), decals (URP Decal Projector: grime, cracks, posters), and the NavMesh built
   at runtime per chunk (AI Navigation `NavMeshSurface` with `CollectObjects.Children`, async). Capture
   `place_shale_street`, `place_shelter_hall`.
6. Water: planar shore and flooded under-city shader (§6.J), no reflections on Floor tier.
7. **Measured on device**: the owner installs the APK; the debug overlay (§7.4) shows ms/frame, draw calls,
   memory; fix until Mid ≥ 30 fps in the densest frontier place.

### P4 — People
1. The full pipeline to `People/Cast/`: a `people.json` brief per role and region (body, face, ancestry mix,
   lifestyle, skin, hair, wardrobe) → `mh_build.py` builds all; LOD1 (6 K) and LOD2 (2 K) by Blender decimate
   with the same rig; `LODGroup` set by the postprocessor. Budget ≤ 8 MB per person, ≤ 15 K triangles LOD0.
2. The player prefab with all face shapes; the sculptor UI binds to blend-shape weights (§6.B.5).
3. Wardrobe runtime (§6.D): garments as separate skinned meshes on the shared rig, swapped on equip; dye and
   grime as material parameters, not textures.
4. Locomotion: Animator controller from the 28 clips (idle, walk, jog, run, turn, strafe, sit, stand, drink,
   alert, …) in a 2D freeform blend tree by speed and turn; root motion off; a `CharacterMotor` on NavMesh
   (`NavMeshAgent` with `updatePosition` true, animation driven by velocity); foot IK through Animation Rigging
   `TwoBoneIKConstraint` with ground raycasts (§6.E).
5. Ragdoll per rig (`RagdollBuilder` editor step: capsules per Humanoid bone, joints with limits), switched on
   at death and heavy knockback; blended back for stand-ups.
6. Portraits in engine: a `PortraitCamera` renders the head to a 256² RT with the face lit by a fixed key/fill,
   cached per actor per outfit state; the UI shows the RT (no wait).
7. Capture `people_cast_lineup` (30 people), `people_lod`, `people_walk`, `people_portraits`.

### P5 — Camera, touch and UI
1. `CameraService` with Cinemachine 3: an orbit rig around the party leader (§6.F), tactical camera in combat,
   conversation cameras (over-shoulder two-shot, portrait inserts), the photo mode.
2. `InputService`: new Input System actions (touch gestures recognised in code per §6.F.2; gamepad bindings).
3. UI Toolkit screens in `UI/` with one USS theme (no cursive; the field-notebook look): HUD, radial action menu,
   dialogue, notebook (quests, leads, people, letters), map and travel, inventory with the live paper doll,
   barter, camp, combat bar and log, settings, title, character creation and the sculptor. Every screen has a
   PlayMode test that opens it with fixture state and captures it.
4. Safe areas and notches; landscape only; 16 px gutters; text at 1.0 scale readable at 6.1″.

### P6 — Systems and combat
1. Interactions and loot (`Play/`): tap on a thing → radial of verbs from content (`talk`, `look`, `take`, `use`,
   `steal`, `sneak`); containers, doors, beds, benches, terminals; the Core quest/flag engine drives them.
2. Schedules across the world (`Npc/Schedule` → `PeopleService`): actors exist as data when far (position
   advanced by schedule), as agents when within 120 m, as full actors within 60 m.
3. Stealth on light: a light-level probe at the actor (sum of lights within range by a cheap estimate, sun by
   shadow raycast), noise from actions; detection per DESIGN rules.
4. Combat (§6.G) with the tactical camera, the turn bar, the log, undo, overwatch, hit zones, cover by raycast,
   surfaces, physics feedback, ragdolls, decals.
5. Journeys and vehicles: `TravelService` runs Core journeys; the montage is a Timeline over the streamed road
   with a cut-in for encounters.
6. Soundscape: `AudioService` with mixer snapshots (explore, tense, combat, interior), ambient beds by region and
   weather, footsteps by surface from the terrain layer under the foot, UI sounds. Music per §9 decision 3.
7. Adaptive Performance and the quality tiers (§6.K); the profiler pass with the owner's devices.

### P7 — Chapter One on the phone
The opening through the stranger's map, end to end on device, at the standard: every scene, conversation, check
and reward of Chapter One works from the content, saved and resumed. A playtest script (PlayMode, fixture-driven)
runs the whole chapter headless and asserts the quest states; the owner plays it on the phone.

### P8 — Act 1 and the megacity on device
All Act 1 and the existing Act 2 districts: places built from their layouts, the cast dressed and scheduled, the
systems exercised. The headless playtest scripts cover every quest line in `src/content/quests`. Then U6 (naming
pass), U7 (conversation system), U8 (characters and relationships) and B3.11 continue in Unity.

### P9 — Release hardening (v1)
Save migrations from the first public build onwards; crash reporting (Cloud Diagnostics); the AAB with asset
packs if the APK passes 150 MB; signing (owner's keystore via secrets); store listing assets; the accessibility
pass (text scale, colour-blind palettes for the combat UI); the final profiler pass on the Floor tier.

---

## 6. Prescriptive specifications for the hard parts

### 6.A World: streaming, terrain, places, Addressables

**A.1 Coordinates and chunks.** World space is metres, Y up, origin at the south-west corner of the 24 × 16 km
world (DESIGN_UNITY §3). Chunks are 512 × 512 m, indexed `(cx, cz)`, 47 × 32 of them. Unity's float precision
is fine for 24 km at the camera's scale (positions ≤ 24 000 → ~2 mm precision); do **not** add floating-origin
shifting in v1 (it complicates saves and NavMesh); re-evaluate only if jitter is seen.

**A.2 Control map (authored, tiny).** `tools/unity/world.py` writes `StreamingAssets/world/control.png` (375 × 250,
64 m per texel, RGBA16): R base height (0–1 → 0–600 m), G roughness (0–1), B biome id (× 16), A water mask;
plus `roads.json` (polylines with width) and `places.json` (bounds, entry yaw, elevation). Source: the web world's
region layout (`src/content/world`), converted once by the tool and then edited by hand in the PNG. The control
map is bilinear-sampled at any world position.

**A.3 Runtime terrain generation (Burst job per chunk, deterministic).** For a chunk: heightmap resolution 257
(2 m texels). `h = base(x,z) + roughness(x,z) · fbm(x,z; 6 octaves, lacunarity 2.0, gain 0.5, base frequency
1/900 m, amplitude 120 m) + ridged(x,z; 3 octaves, 1/350 m, 40 m) · steepBiomeMask − roadCut(x,z) − waterCut`.
`roadCut` flattens to the road's centreline height within half its width with a 12 m smooth shoulder; `waterCut`
lowers by 3 m inside the water mask with an 8 m shore ramp. Then 2 passes of talus (if slope > 38°, move 0.5 of
the excess to the lower neighbour). Then **place stamps**: for every place whose bounds intersect the chunk,
blend the authored place heightmap (1 m, from the place prefab's `PlaceHeight` asset) with weight 1 inside the
bounds falling to 0 over 24 m outside. Seed = hash(cx, cz, worldSeed). Output: `TerrainData` (heights, 8 splat
weights from biome + slope + height + noise, detail density maps). Build ≤ 4 ms on a phone (Burst, `IJobParallelFor`
over rows); apply to a pooled `Terrain` (pre-created, 16 in the pool). Set `Terrain.SetNeighbors` after load.
Holes under interiors via `TerrainData.SetHoles`.

**A.4 Streaming policy.** Load radius 2 chunks (5 × 5 = 25 loaded, 1.5 km visible), prewarm radius 3 (terrain
only, no scatter), unload at radius 4. Order by distance to the camera's look-at point, one chunk per frame at
most, terrain first, scatter next frame, places when within 600 m, interiors within 40 m of a door. Memory
budget: 25 terrains × (257² × 4 B heights + 8 × 257² splat) ≈ 60 MB; scatter instances as `GraphicsBuffer`
transforms (resident drawer handles culling); people per §P6.2. If a frame exceeds 25 ms, the loader pauses the
next frame (never two loads in a row above budget).

**A.5 Places.** A place is a prefab (`Places/<id>.prefab`, Addressable) built by `PlaceBuilder` from the exported
layout: the kit pieces (walls, floors, roofs, props from `Kits/*`), lights, decals, the NavMesh modifier volumes,
the door triggers with interior ids, the spawn/talk/container/trigger markers from `MapDef`. Interiors are
separate prefabs positioned at their world coordinates under the place (walls with the outside culled by a
`RendererOcclusion` flag when the player is inside). The grid/tile data of the web maps is used only as the
layout source (tile → piece rules in `PlaceBuilder`), never at runtime; Core `Grid` is the interior fallback for
pathing when NavMesh is unavailable.

**A.6 Day, weather, light.** `TimeService` keeps world minutes; sun elevation by hour and region latitude;
`Light` directional with `shadows.distance` 80 m (Mid), cascades 2; ambient from the sky gradient (trilight);
fog colour and density per region/weather with exponential-squared mode. Point lights realtime ≤ 4 visible,
others emissive-only. No baked lighting in v1 (CI cannot afford bakes; APV revisited after v1 if the Floor tier
needs it).

**A.7 Addressables.** Groups: `world-chunks-<region>` (nothing in v1: terrain is generated), `places-<region>`,
`kits-<kit>`, `people-<set>`, `motion`, `cards`, `audio-<region>`, `ui`. Labels by region. Local build path in
`StreamingAssets` (no remote in v1). Editor step `Editor/Build/AddressablesBuild.cs` (`-executeMethod` before the
player build in CI, in `tools/ci/android.yml`). Loading: `Addressables.InstantiateAsync` with a handle cache per
chunk; release on unload. A PlayMode smoke test loads `kits-shelter/wall_a` by address.

### 6.B People pipeline (candidate A, MakeHuman base re-authored)

**B.1 Build.** `tools/unity/people/mh_build.py <mh data> <community packs> <out dir>`; `ONLY=<id>` env limits
the set. Per person: base mesh → macro targets (gender, age, muscle, weight, height, ancestry) + feature mods
(`sym:` prefix mirrors) baked into the vertex positions → body mesh (body group only, minus the vertices the
clothes hide via mhclo `delete_verts`) → game rig (MakeHuman default skeleton reduced to 55 Mecanim-named bones,
weights from `default_weights.mhw`) → blend shapes (`FACE_SHAPES` incr/decr pairs + expression units; relative to
the baked body) → proxies fitted by mhclo (`scale = |v[a]−v[b]| / den` per axis, offsets × scale; skin weights
copied from the first reference vertex; eyes bound to `Head`) → textures copied/baked beside the model → FBX
(`apply_scale_options='FBX_SCALE_ALL'`, `-Z` forward, `Y` up, `mesh_smooth_type='FACE'`, no leaf bones).
Coordinates: MakeHuman decimetres → metres (`SCALE = 0.1`), feet grounded by subtracting the lowest body vertex.

**B.2 Unity import.** `PeopleImportPostprocessor`: `animationType = Humanoid`, `avatarSetup = CreateFromThisModel`,
`importBlendShapes = true`, `materialImportMode = None`, materials by slot kind (§4.5). If Unity's auto-mapper
misses a bone, set `humanDescription.human` explicitly in the postprocessor from the fixed name list in
`mh_build.py` (`GAME_RIG`), never by hand in the editor.

**B.3 Eyes.** The MakeHuman high-poly eye has the cornea in the texture's alpha; the material clips at 0.5. In
Cycles previews use `image.alpha_mode = 'CHANNEL_PACKED'` or the iris disappears behind a premultiplied cornea.
Eye colour = tint on the one brown texture (`_BaseColor`), per `eyes` field.

**B.4 Variance.** Every NPC brief draws: ancestry mix (three weights), age 16–75, muscle/weight/height, 6–10
feature mods from the pool with signs, skin from the region's set, hair per §6.C, wardrobe per role per §6.D,
scars/tattoos as decals on the skin texture (`bake_skin`). Rerolls must change silhouette and face visibly
(UPGRADE directive): enforce a minimum distance in the macro vector between consecutive rerolls.

**B.5 The player and the sculptor.** The player prefab keeps all 69 shapes; the sculptor maps sliders to
incr/decr pairs (slider −1..1 → one of the pair at |v|). The ageing photograph: the same head at age 41+ (apply
the `age` macro delta on the base before the shapes — the tool exports an `_aged` body shape key for the player
only; the portrait camera renders both).

**B.6 Weight.** Per person today: 22 MB FBX for six = ~3.7 MB each (fine), but 110 MB of textures for six. Rules:
skin 2 K (player and companions), 1 K for everyone else; cloth and hair cards 1 K; brows/lashes have no texture
(strand geometry); normal maps only on skin and cloth with real relief. Shared garments share one baked texture
per (garment, look), named `<look>__<garment>_d` instead of per person. Target ≤ 8 MB per person, ≤ 4 MB for
extras.

### 6.C Hair and grooming (the hair rule in practice)

1. **Allowed proxies from the packs** (CC0 `hair01`): `cortu_short_messy_hair` (cropped, uneven),
   `elvs_unkempt_french_braid` (work braid), `rehmanpolanski_hair_bun_brown` and `elvs_reverse_french_braid_bun`
   (tied back), `o4saken_long01` only under a wrap or hood (matted long). **Forbidden**: every bob
   (`toigo_*bob*`, `littleright_bobcut_hair`), bangs, `culturalibre_hair_05/06` (swept), `learning_anime_hair`,
   `cortu_strawberry_cloud_hair`, `sonntag78_blond_with_headband`, `elvs_double_mh_braid` (too neat),
   `faydaen_hair_1`. The bake-off mapping to apply now: p1 → `cortu_short_messy_hair`; p2 →
   `elvs_unkempt_french_braid`; p3 → none (balding) + beard from the skin; p4 → `rehmanpolanski_hair_bun_brown`
   (the rich keep it tidy: that is their costume); p5 → scalp cap, buzzed (§C.2); p6 → `o4saken_long01` under a
   headwrap (§C.3).
2. **Scalp cap for shaved and buzzed heads.** Build a cap mesh in `mh_build.py` from the base head's hair region:
   the MakeHuman base has a "helper-hair" helper group (`read_obj(..., keep_groups={'helper-hair'})`); fit it like
   a proxy (it is already in base coordinates: apply the same baked vertex deltas by index), shrink along normals
   by 1 mm, skin to `Head`. Material `hair:<id>__scalp` with a texture baked by `bake_hair` (§C.4): stubble
   density by noise, dark on the skin tone, with the hairline faded over 8 mm; a "receding" parameter raises the
   front edge. Alpha 1 everywhere (no cards): a buzz cut is a texture.
3. **Headwraps and scarves.** Model once in Blender as proxies on the base head/neck (a wrap: a torus-ish band
   with a knot; a scarf: a loose loop at the neck), exported as garments with `mhclo`-style reference vertices
   (write them with the same fitting code path: pick the nearest base vertex per proxy vertex and store offsets
   in base space). Until modelled, a hood (`culturalibre_hero-heroine_hood_1`) covers long hair.
4. **`bake_hair` and `bake_skin`** (same shape as `bake_cloth`): hair → desaturate 0.4, darken 0.75, multiply by
   a large-scale noise (dust lightening at the ends: v-based), grey streaks for age > 50 (thin noise bands
   lightened), smoothness in Unity 0.25. Skin → sun darkening on the face/neck/forearms (UV regions of the
   MakeHuman layout: face is the upper-left quadrant of the texture; forearms and hands in the lower band),
   dirt in creases (multiply by the normal map's cavity: darken where the normal map's blue channel is low),
   chapped lips (desaturate + lighten the lip region slightly), scars as decal strokes from a small CC0 scar
   atlas we paint ourselves (3–4 greyscale strokes), tattoos as decals (ink colour multiply) only for roles that
   have them. Parameters per person in the brief: `sun 0..1`, `grime 0..1`, `scars [ (region, n) ]`, `tattoos []`.
5. **Beards**: the chosen skins include beard variants (`jartur69_…_beard`); unkempt beards otherwise as a stubble
   mask in `bake_skin` (jaw region of the UV layout) with density per brief.

### 6.D Wardrobe runtime
- Garments are skinned meshes on the shared rig; equip = enable the garment's renderer, disable hidden body parts
  (vertex groups from `delete_verts` exported as a per-garment hidden-vertex mask: the body material uses a
  per-vertex `_Hidden` channel in UV2.x; the shader clips it). Draw order: body, skinsuit, trousers, shirt, coat,
  boots, rig, hood.
- Dye and grime at runtime are material parameters (`_Tint`, `_Grime`, `_Wear`) layered over the baked texture
  (the baked texture is the garment's own worn state; the parameters move it ±20 %). No per-equip texture bakes
  at runtime.
- `ItemDef.Wear` (Core) names the garment proxy per fit, tint/dye indices, grime/wear; the `Outfits` rules choose
  per role/region (`Core/Npc/Outfits.cs`, the web RNG sequence kept for content parity).

### 6.E Motion
- `cmu2fbx.py` keeps the canonical processing: CMU ASF/AMC at 120 Hz → 30 Hz; gait cut at the left-foot contact
  minima; seam loop by blending the last 8 frames into the first; hip height normalised to the game rig (1.0 m
  hip at rest) with speed in the sidecar. BVH rotation order ZXY; Blender import then FBX with Mecanim names.
- Unity: `MotionImportPostprocessor` → Humanoid, `CreateFromThisModel`, clips `loopTime` from the sidecar,
  `loopBlend` on for cycles, root transform rotation baked (bake into pose), root position Y baked, root XZ
  **not** baked for locomotion clips (the motor drives the position; the clip's XZ root motion is ignored by
  `applyRootMotion = false`). Foot IK on.
- Blend tree: 2D freeform directional on `Speed` (0–5 m/s) × `Turn` (−1..1): idle, walk 1.3, jog 2.6, run 4.5,
  turn-left/right in place, strafes from the mirrored walk. Transitions 0.15 s. A `Gesture` layer (upper body
  mask) for conversation and work loops; an `Additive` layer for breathing on idle.
- Crowd cost: GPU skinning on, `SkinnedMeshRenderer.updateWhenOffscreen = false`, LOD2 switches to a 1-bone
  "billboard sway" rig; ≤ 40 full actors in view on Mid.

### 6.F Camera and touch
**F.1 Rig.** Cinemachine 3: a `CinemachineCamera` with `OrbitalFollow` around a `LookTarget` (the leader's chest +
a lead by velocity · 0.4 s), yaw 0–360, pitch 35–62°, distance 8–26 m (orthographic *feel* via a 28° FOV at
distance; true orthographic is not used because fog/scatter/impostors read better in perspective at this FOV).
Collision: `CinemachineDeoccluder` against `Occluder` layer only (walls, large rocks), never scatter.

**F.2 Gestures (code in `InputService`, not a plugin).** Per frame read `Touchscreen.current.touches`:
- 1 finger, moved > 12 px: **orbit** (Δx → yaw at 0.22°/px, Δy → pitch at 0.12°/px, both with 0.08 s smoothing
  and velocity fling decaying over 0.5 s). Started on a UI element: ignored (UI Toolkit `panel.Pick`).
- 1 finger tap (< 220 ms, < 12 px travel): **tap-to-act**: raycast from the camera; hit an actor/thing → radial
  menu at the point; hit the ground/NavMesh → move there (long press > 450 ms on the ground: a waypoint pin).
- 2 fingers: pinch distance Δ → distance (log scale, 0.35 % per px); centroid Δ → **pan** of the look target on
  the ground plane (projected ray), limited to 30 m from the leader; two-finger twist Δangle → yaw (optional,
  behind a setting, off by default).
- Double tap on the leader: recentre. A compass button recentres yaw to north.
Gamepad: right stick orbit, left stick move, triggers zoom, bumpers rotate 90°.

**F.3 Conversation cameras.** On talk: a two-shot over the player's shoulder (`CinemachineCamera` per role,
blended 0.6 s), portrait inserts from the cached RT; the world keeps running behind with the mix ducked.
**F.4 Tactical camera (combat).** Pitch locked 55°, distance 14–22 m, free pan, snaps to the acting unit on turn
start with a 0.4 s blend, a top-down toggle at 80°.

### 6.G Combat (turn-based, the redesign)
Data model (Core, pure C#, tested): `Encounter { Units, Round, TurnOrder, Surfaces, Log }`,
`Unit { Id, Side, Sheet, AP, Position, Facing, Stance, Cover, Statuses, Overwatch }`, `Action` records
(move, attack(aimed zone), burst, reload, item, ability, minor, wait/overwatch, surrender, talk), `Resolution`
records with every roll logged (seeded `Rng` so replays are deterministic and tests exact).
- Initiative: `Reflex + d10`, rerolled each round; ties by Senses. AP per turn `= 5 + floor(Reflex / 2)`; unused
  AP → evasion bonus `+3 % per AP` until the next turn.
- Movement: cost = path length on NavMesh / 2 m per AP, walking; the reachable area is the NavMesh region within
  AP · 2 m (compute with `NavMesh.CalculatePath` samples on a 1 m grid around the unit, cached per turn; show as
  a decal). Difficult surfaces double cost; prone halves speed.
- Attacks: hit chance = skill + situational (range band, cover −25/−50, height +10, aimed zone penalty, flanking
  +15, stance, light level) clamped 5–95; damage per Core item rules; hit zones by raycast from the muzzle to zone
  colliders (head, eyes, torso, arms, legs, groin, weapon); criticals on the table with crippling effects.
- Cover: at each unit's position, raycast to the attacker's muzzle from the zone centres: zones blocked / total →
  none (< 25 %), half (25–65 %), full (> 65 %). Destructible cover has HP and swaps to its broken prefab.
- Surfaces: a 1 m grid layer per chunk with `{ kind, intensity, ttl }` (oil, water, fire, smoke, dust, chem,
  electrified); spread rules each round (fire to adjacent oil/scrub with 70 %, smoke rises and thins, water douses,
  arc electrifies connected water/metal). Rendered as decals + particles.
- Reactions: overwatch stores a cone; any enemy move through it triggers one shot at −15; interrupts from perks;
  companion cover fire as an overwatch granted by a perk.
- Bionic abilities raise Drift (Core `Chrome`); an episode at the threshold forces a lost turn or a random move.
- Party: direct control of every companion; undo of a move not yet observed by an enemy (store the pre-move state
  and replay); surrender when morale (a per-side value from losses) breaks; talk out on an enemy's turn start if
  a dialogue is marked `inCombat`.
- Feedback: tracers (line renderer, 60 ms), impact decals by surface, shell casings (pooled), ragdoll on death,
  knockback by force, blood as decals, camera shake 0.1 s at hits on the party.
- UI: the turn bar (portraits in order), AP pips, the action radial with costs, hit chance on hover/tap-hold,
  the log panel, the undo button.
Rules live in `Core/Combat/*` with NUnit tests for every formula and a replay test over a fixture encounter.

### 6.H Conversation and quests binding
`DialogueRunner` and `QuestEngine` (Core) already run the content. The UI shows the node text, the choices with
their check odds, the speaker's portrait RT, and the topic memory: never re-offer a topic marked exhausted (U7
rules). `talk` starts the conversation camera; barks come from `NpcDef` lines through a world-space label with a
2.5 s life. Letters, the notebook and leads bind to `World/Letters`, `Quest/*` and `World/Logic`.

### 6.I Saves
Core `Saves` serialises `GameState` (JSON, versioned, migrations in `Core/Save`). The Game adds: party world
positions and chunk, time, weather, scatter is never saved (deterministic by seed), place state (opened doors,
emptied containers by id), combat encounter if mid-fight (full `Encounter`), the camera yaw/distance, a 512 × 288
screenshot per slot. Autosave on place entry, quicksave button, three manual slots. A PlayMode test saves at three
points of the fixture game and reloads each, asserting state equality.

### 6.J Shaders (Shader Graph, URP, all with a Floor-tier variant)
- **Terrain**: URP Terrain Lit (8 layers, height-based blend from the mask's B channel, 2 layers per texel on
  Floor), triplanar on slopes > 45° (Shader Graph custom terrain shader after v1 if the stock one shows stretch).
- **Foliage card**: cutout, double-sided, normals bent towards the tree's centre ("fluffy" normals: normal =
  normalize(worldPos − treePivot) blended 70 % with the face normal, pivot from the mesh's bounds centre passed
  as a per-instance vector), wind: vertex offset by `sin(time · 1.3 + worldPos.x · 0.2) · 0.03 · uv.y`, subsurface
  approximated by a wrapped diffuse term. Dithered cross-fade between LODs.
- **Skin**: URP Lit + a wrapped diffuse and a red-shifted rim ("cheap SSS") in a Shader Graph; no real SSS.
- **Hair cards**: cutout, anisotropic highlight off (dull), smoothness 0.25, dithered LOD fade.
- **Water**: a flat plane with scrolling normals (two layers), depth fade, shore foam by depth, no reflections on
  Floor, planar reflection on Flagship.
- **Sky**: a gradient sky with a sun disc and horizon haze driven by `TimeService` (procedural; no HDRI at
  runtime), clouds as a scrolling noise layer on the dome.
- **Decals**: URP Decal Projector (grime, cracks, posters, blood, scorch).

### 6.K Performance
Tiers (PORT.md §4): Flagship (2024+ flagship SoC): 60 fps, 1.0× render scale, shadows 2 cascades 100 m,
SSAO on, scatter density 1.0; Mid: 30 fps, 0.85× scale, 1 cascade 60 m, SSAO off, density 0.7; Floor: 30 fps,
0.7× scale, no realtime shadows beyond the sun at 30 m, density 0.4, LOD bias 0.7. `QualityService` picks the
tier on first run from `SystemInfo` (GPU name list + memory + core count), Adaptive Performance lowers render
scale under thermal warning. Budgets per frame on Mid: ≤ 150 draw calls before the resident drawer, ≤ 60 K
triangles, ≤ 4 realtime lights, ≤ 8 ms CPU main thread. The debug overlay (§7.4) is always one gesture away in
development builds. Textures ASTC 6×6 (albedo) / 5×5 (normals), mipmaps on, no readable meshes.

### 6.L Card trees (`tools/unity/kits/trees.py`, to write)
- Blender's Sapling Tree Gen is installed as an extension (§7.1). Call
  `bpy.ops.curve.tree_add(**params)` with params from a preset file
  (`<ext>/presets/<name>.py`, a dict; parse with `ast.literal_eval` after stripping the licence comment) plus
  overrides. Species → preset + overrides: pine (the Teeth) ← `douglas_fir` with `levels=2`, `branches=(0,28,0,0)`,
  `scale=14, scaleV=3`, `bevelRes=1, resU=2`, `leaves=7, leafShape='rect', leafScale=<card height_m>,
  leafScaleX=<card width_m / height_m>, leafDownAngle=25, leafRotate=137.5, horzLeaves=False, showLeaves=True`;
  fir ← `douglas_fir` with `branches=(0,34,0,0)`, `scale=11`; broadleaf (sheltered ground) ← `small_maple`
  with `levels=2`, `branches=(0,18,0,0)`, `scale=6`, `leaves=9`, the broadleaf cluster card. Three seeds per
  species (`seed=1,2,3`).
- Sapling makes a curve (trunk/branches) and a `leaves` mesh. Convert the curve to a mesh (`object.convert`),
  set `use_uv_as_generated` before converting so the bark has UVs, then scale all UVs by
  `sqrt(Σ world area / Σ uv area)` so one UV unit is one metre (the library tiles bark at 2 m). Material slot
  `mat_bark_pine` / `mat_bark_brown`. Leaves mesh: material `mat_card:pine_branch` (Sapling's `rect` leaf UV is
  v = 0 at the stem, v = 1 at the tip, u across; the cards are baked root-down to match). Join into one object,
  export FBX via `kitlib.export_fbx`, write the model meta. Budget ≤ 3 K triangles per tree; if over, lower
  `curveRes`/`resU` before `branches`.
- `Test_Vegetation` gets a second camera on a conifer slope (`vegetation_teeth`); `ScatterRules` place pines where
  biome = Teeth, slope < 0.5, height > 0.45.
- LOD: LOD1 = same trunk with half the cards (every other leaf), LOD2 = a two-quad cross impostor using
  `card_pine_crown.png` (the whole-sapling card). The postprocessor builds the `LODGroup` from the three FBX
  variants named `<species>_<seed>_lod0/1/2`.

### 6.M Content export and parity
`npm run export` writes `StreamingAssets/content/*.json` from `src/content`; `Registry` loads them. When a rule
changes in the redesign (combat, checks), change Core and its tests and leave `src/` alone; the content stays
valid because ids and fields do not change. Add new content fields in `src/content` types first (validated by
`npm run validate`), then in the Core model, then in the exporter.

### 6.N Judging a capture (the rubric; a capture that fails any line is not done)
- **Terrain/world**: no visible tiling at the iso distance (layers tile at their metres, detail noise breaks
  repeats), no hard splat edges, slopes read as rock, flats as soil/sand, a wash reads as a wash; the horizon has
  haze; shadows are soft and the palette is lit (midtones above 40 % luminance by day).
- **Scatter**: no floating or sunken props (feet −3 cm into the ground), no scale lies (a boulder is 1–3 m, a
  shrub 0.5–2 m), clumps and clearings rather than an even sprinkle, grass where the rules say, nothing
  intersecting a building footprint.
- **Place**: walls meet floors without gaps, roofs overhang, doors are 2.1 m, props touch surfaces, three light
  sources at most read as the lighting of a room, decals carry ninety years of use, nothing is clean except in
  the rich districts.
- **People (lineup)**: height variance visible (1.55–1.95 m), silhouettes differ (build, posture, layers), every
  garment obeys §3.3, every head obeys §3.4, skin tones and ages vary, no two outfits identical in colour.
- **People (portrait)**: iris visible and wet, lashes present, brows readable, hairline natural, skin with pores
  and sun, no seam at the neck, teeth not visible through lips, the expression neutral but alive (slight
  asymmetry).
- **Motion**: feet do not slide (the hip speed matches the clip's), the idle breathes, turns pivot on the planted
  foot, no popping at loop seams.
- **UI**: readable at 6.1″ at arm's length (body text ≥ 14 px at 1080p-wide), nothing under the notch, 16 px
  gutters, one type family, no cursive, contrast ≥ 4.5:1.
- **Combat**: the reachable area, the hit chance and the cover state are visible before committing an action;
  hits land where aimed; the log explains every number.

### 6.O Brief schemas (JSON the tools read; keep these names)
- `people.json` (per set): `[{ id, role, region, gender 0..1, age, muscle, weight, height, ancestry {african,
  asian, caucasian}, mods { "<target>": w }, breastSize?, breastFirmness?, skin, hair | null, scalp? {stubble,
  receding}, wrap?, brows, eyes, beard? {density}, sun, grime, scars [[region, n]], tattoos [[region, id]],
  clothes [[garment, look]] }]` — `look` as in `mh_build.py`'s `W(...)`.
- `scatter_rules.json`: `[{ group, keys [model keys], tries, biome [ids], slope [min,max], height [min,max],
  wash [min,max], noise { scale, min }, scale [min,max], sink }]` evaluated per chunk with the chunk's seed.
- `places.json` (from the exporter): `{ id, bounds {x,z,w,d}, yaw, elevation, interiors [{ id, door {x,z},
  bounds }] }`; `control.png` channels as §6.A.2.

---

## 7. Verification protocol (exact)

### 7.1 Re-provisioning a session's scratch (everything below is ephemeral)
Scratch root `S` = the session's scratchpad directory (write every tool's absolute path from it).
- .NET SDK and the Unity editor's managed DLLs: `docs/PORT.md` §3 (the DLLs come from the Unity Linux editor
  archive, extracted to `S/unity/x/Editor/Data/Managed`; the compile checks take `-p:UnityManaged=<that path>`).
- Blender 4.5.9: `https://download.blender.org/release/Blender4.5/blender-4.5.9-linux-x64.tar.xz` → `S/blender/`.
  Sapling: `curl https://extensions.blender.org/api/v1/extensions/?blender_version=4.5.0`, find
  `sapling_tree_gen`'s `archive_url`, download, then
  `blender -b --command extension install-file -r user_default -e sapling.zip`.
- MakeHuman data (CC0): `git clone --depth 1 https://github.com/makehumancommunity/makehuman.git S/mh` → data at
  `S/mh/makehuman/makehuman/data` (`3dobjs/base.obj`, `targets/`, `rigs/default.mhskel`,
  `rigs/default_weights.mhw`, `eyes/`, `eyebrows/`, `eyelashes/`, `hair/`, `clothes/`, `skins/`).
- Community packs: `http://files.makehumancommunity.org/asset_packs/<pack>/<pack>_cc0.zip` (and `_cc-by`), packs
  used: skins01/02, hair01, eyebrows01, eyelashes01, shirts01–03, pants01–02, shoes01–03, suits02–03, hats01–03,
  masks01–02, equipment03, gloves01, glasses01 → unzipped under `S/mhc/<pack>/`.
- CMU mocap: `http://mocap.cs.cmu.edu/subjects/<subject>/<subject>_<trial>.asf|amc` for the subject/trial pairs
  listed in `tools/unity/motion/cmu2fbx.py` → `S/cmu/<subject>/`.
- Poly Haven scans: `python3 tools/unity/models.py` (2.2 GB into `unity/Assets/External/Models`, gitignored).

### 7.2 Local checks (run before every commit that touches the thing)
```
export PATH=/home/user/.dotnet:$PATH DOTNET_CLI_HOME=/home/user
dotnet test core/SecondFace.Core.Tests -nologo -v q                                   # Core (86+ tests)
dotnet build core/Game.Check.csproj  -p:UnityManaged=$S/unity/x/Editor/Data/Managed -nologo -v q   # Game compiles
dotnet build core/Editor.Check.csproj -p:UnityManaged=$S/unity/x/Editor/Data/Managed -nologo -v q  # Editor compiles
npm run check                                                                          # web validator (content)
python3 -c "import ast;ast.parse(open('tools/unity/people/mh_build.py').read())"      # any edited Blender script
```
Blender scripts are run headless (`blender -b --python <script> -- <args>`) and their output rendered with the
preview scripts (people lineup + portraits, kit places, nature grid) before the assets are committed; copy the
renders downscaled into `docs/evidence/unity/` with a line in its README.

### 7.3 CI
`android.yml`: *Build APK* (artifact `SecondFace-Android-APK`) and *Unity tests and screenshots* (artifacts
`Unity-test-results`, `Unity-screenshots`). Concurrency cancels an in-progress run on a new push: **do not push
while a run you need is in progress**; wait for it (`gh run view <id> --json status,conclusion`), then push. Read
failures with `gh run view <id> --log-failed`. The required captures per phase: P2 `terrain_*`, `materials_sheet`,
`place_shelter_*`, `place_frontier_*`, `people_lineup`, `portrait_*`, `motion_*`, `vegetation_*`; P3 `world_*`,
`place_*`; P4 `people_*`; P5 every UI screen; P6 `combat_*`, `travel_*`; P7/P8 the playtest scripts' end states.

### 7.4 On device
The owner installs the APK. Development builds show a debug overlay (three-finger tap): ms/frame (CPU/GPU),
draw calls, visible triangles, memory, the loaded chunk count, the tier. Every phase ends with the owner's
numbers from the densest place written into PORT.md §5.

---

## 8. Pitfall log (errors met, with the fix; check here before debugging)

- **CI "Cannot build untitled scene"**: `EditorApplication.delayCall` never runs in batch mode. The Boot scene is
  committed and listed in `EditorBuildSettings`; `BuildGuard` throws if missing.
- **`NamedBuildTarget` unknown**: `using UnityEditor.Build;`.
- **Editor compile check: duplicate types**: reference only `$(UnityManaged)/UnityEngine/*.dll`, never
  `UnityEditor.dll` together with `UnityEditor.CoreModule`.
- **Blender's Python has no PIL**: use `bpy.data.images` for pixels; import PIL lazily in tools that run outside
  Blender.
- **`StructRNA of type Material has been removed`** after `read_factory_settings`: clear the kit material cache
  (`K._mats.clear()`) per build.
- **Proxy fit stretched** (hair 0.56 m tall): the mhclo scale is `|v[a]−v[b]| / den`, not a multiply.
- **Figures sunk to the hips**: ground by subtracting the lowest body vertex; convert directions with
  `to_bl_dir` (no ground offset).
- **Eyes black in Cycles**: premultiplied alpha; `image.alpha_mode = 'CHANNEL_PACKED'`.
- **Eyes blank/white in a preview**: the material slot name carries the `mat_` prefix; strip it before parsing
  the kind (both the Unity postprocessor and the preview scripts do now).
- **`ModelImporter.importMaterials` obsolete**: `materialImportMode = ModelImporterMaterialImportMode.None`.
- **FBX clip baked 2–251 frames**: set `scene.frame_start/frame_end` to the clip's range before exporting.
- **Cycles camera stale `matrix_world`**: call `bpy.context.view_layer.update()` after moving the camera.
- **`ModelLibrary.Path` shadows `System.IO.Path`**: never name a static method `Path`; qualify `System.IO.Path`.
- **Decimation stops far above the budget**: glTF scans arrive unwelded (`merge_vertices=True` on import) and
  photogrammetry UV atlases pin seams; iterate the collapse and weld within 1 mm; a few scans still floor
  (boulder_01 at 26 K) — accept or drop them.
- **Scans that are terrain patches** (10–60 m rock beds): classify by footprint (`place: patch`) and place
  deliberately; never scatter them.
- **Card renders empty**: the scan's variants sit side by side in the file; frame the slab relative to the
  variant's own centre (median of its vertices).
- **`pkill -f` kills the calling shell**: the shell's own command line matches the pattern; kill by PID list
  excluding `$$` and `$PPID`.
- **Palette colours looked washed out**: node colour sockets are linear; convert sRGB-looking palette values with
  `c ** 2.2` before use in a bake.
- **Shared garment textures overwrite each other**: name baked cloth per (person or look, garment).
- **CI run cancelled by a push**: concurrency `cancel-in-progress`; wait for the run first.
- **The owner's token lacks the `workflow` scope**: workflow files cannot be pushed from the session; the owner
  copies `tools/ci/*.yml` into `.github/workflows/`.

---

## 9. Open decisions for the owner (spoiler-free; defaults in force until answered)

1. Combat stays turn-based with the §6.G depth (default: yes).
2. Asset licence exceptions beyond CC0/CC-BY/ours (default: none).
3. Music: commissioned later vs CC-licensed library (default: library under CC-BY, credited; swapped later).
4. World scale 24 × 16 km with places at 1:1 and compressed land between (default: yes).
5. Floating origin: not in v1 (default) — revisit only if jitter appears beyond 20 km from the origin.
6. Baked lighting (APV) in v1: no (default); realtime + SSAO + emissive; revisit for the Floor tier after v1.

---

## 10. Hand-off checklist and the next twenty steps

Before the session ends: PROGRESS.md names the step in progress and the exact next action; everything compiles;
committed and pushed; the CI run id noted; the scratch re-provisioning needs nothing beyond §7.1.

Next twenty steps, in order (each one commit; P2 steps 1–6 of §5 expanded):
1. Verify the four cards (root at the bottom, coverage), fix `cards.py` if needed; commit.
2. Hair rule: six `hair` entries per §6.C.1; rebuild; render; evidence; commit.
3. Scalp cap + `bake_hair` (§6.C.2, C.4) for p5 (buzzed) and p3 (balding); rebuild; commit.
4. `bake_skin` (sun, creases, lips, stubble); rebuild; commit.
5. People weight to ≤ 8 MB each (§6.B.6); commit.
6. `trees.py` pine (one species, three seeds), capture; commit. 7. Fir and broadleaf; LOD variants; commit.
8. `ScatterRules` extracted from `VegetationTestScene`; `vegetation_teeth` capture; commit.
9. Addressables skeleton + CI step + smoke test; commit.
10. (Owner) workflow copied; read captures; fixes, one commit each.
11. P3.1 `WorldService` + chunk grid + control map tool (§6.A.1–A.2); commit.
12. P3.1 runtime terrain job (§6.A.3) + the 4-chunk PlayMode test; commit.
13. P3.1 streaming policy (§6.A.4) + pooled terrains; commit.
14. P3.2 terrain layers per biome + `world_*` captures; commit.
15. P3.3 `TimeService`, sky, fog, weather; captures at four hours; commit.
16. P3.4 resident drawer scatter per chunk + grass; `world_scatter_dense` with frame time; commit.
17. P3.5 `PlaceBuilder` from the exported layout for the first town; lights, decals, NavMesh; capture; commit.
18. P3.5 interiors as positioned prefabs with instant open; capture; commit.
19. P3.6 water; commit. 20. P3.7 device measurement with the debug overlay; numbers in PORT.md §5; commit.
