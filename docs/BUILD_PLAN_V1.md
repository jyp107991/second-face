# THE SECOND FACE — the build plan to v1 (Unity 6, Android)

**Status: binding hand-off plan, written 2026-10-28; revised the same day once the real Unity editor ran inside
the session (§0 rule 4, §2, §5 P2, §7.0–7.3, §10).** It exists so that the build continues at the same standard
whichever model or session executes it. It is prescriptive on purpose: where it says *do X this way*, do X that way
unless the owner says otherwise. Where it leaves a choice, it says so. Read it top to bottom once before the first
step of any session, then keep it open beside `docs/PROGRESS.md`.

Reading order for a fresh session: `CLAUDE.md` → `docs/PROGRESS.md` → this file → **`docs/UNITY_PRACTICES.md`**
(Unity's own rules for this project, with sources; it overrides this file where they disagree) → `docs/PORT.md` →
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
4. **The real editor runs in the session; use it first, CI confirms.** Every step that touches Unity-side code or
   assets runs the working loop of §7.0: local compile checks, `tools/unity/editor.sh test all`, read the full logs,
   **open every capture you changed with the Read tool and judge it against §6.N**, then commit and push. CI does
   not discover errors any more; it confirms and builds the APK. A push that CI turns red is a missed local check:
   add the check to §7.0 or the pitfall to §8. Do not describe a look you have not rendered in the engine (Cycles
   renders are only for fit and geometry inside the Blender pipelines). The owner judges the captures copied
   downscaled into `docs/evidence/unity/` at the end of each phase.
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

**v1 is the complete game (owner, 2026-10-28: "V1 is complete game"): an installable Android app (APK from CI,
later an AAB) that plays the whole story, from character creation through Chapter One, Act 1, Act 2 and Act 3 to
every ending, at the standard of `docs/DESIGN_UNITY.md`, on one streamed open world, end to end, saved and
resumed, at a smooth frame rate on a 2024–2026 mid-range phone, as a single playthrough of 60 hours or more.**
Part of that story already exists in `src/content/`: the opening (Chapter One, which ends when the player has the
stranger's map), Act 1 (the frontier: the town, the toll fort, the relay, the pump station, the wilds, the nomad
camp) and the megacity districts of Act 2 built so far (B3.1–B3.10). The rest is written inside this roadmap
(P9–P12) on the same pipelines, after the systems that carry it are in (P2–P8).

**How the older phases map onto this plan** (they were built in the web game, which is now frozen as the reference
for behaviour; content is still written in `src/content/`, validated by `npm run check` and exported to Unity):
- **Phase A** (design and depth pass, A0–A5) is done as design: its rules, systems and story work live in the
  content and in `SecondFace.Core`. What it left half-done is absorbed here: A2.4's economy simulation → P13
  balance; A2.6's activities that come with content (fight pits, hunting, dives, heists) → P6 and P8; A4.3
  performance → P3.7/P6.7; A5.9's presentation sweep → P5/P6 (the web presentation itself is not ported).
- **Phase B** (content slices) built Chapter One (B1), Act 1 (B2) and Act 2 part 1 up to B3.10 in `src/content/`;
  all of it is exported to Unity (P7, P8). The slices not yet written are all inside v1: B3.11, B4 and B5 → P10
  (Act 2 completed); B6 (Act 3 and the endings) → P11; B7 (systemic depth) → P12; B8 (balance and release) →
  P13, where the release is the app, not the web page.
- **The upgrade list U1–U8**: U1–U4 were done in the web game and are redone at the Unity standard by P2–P4; U5
  (camera and touch) is P5; U6 (naming pass), U7 (conversation system) and U8 (characters and relationships) →
  P9, before any new content is written, so the new content is written once, to their rules.
- So the order is: **systems and the existing content at the standard (P2–P8) → the passes every later line of
  content depends on (P9) → the rest of the story (P10–P11) → systemic depth (P12) → release hardening (P13) =
  v1.**

v1 acceptance (all must hold):
- Fresh install → title → character creation (face sculptor, body, skin, hair, scars, tattoos, clothing colours,
  attribute pool with reroll) → the opening → Chapter One complete → Act 1 complete → Act 2 complete (every
  megacity district and the Act 2 wilds) → Act 3 complete → an ending and its epilogue; every ending reachable
  (each covered by a headless playtest script); saves survive app restarts and a version bump (migrations tested).
- One playthrough takes 60 hours or more for a player doing the main story and a reasonable share of what the
  world offers (not completionist), measured by the playtest pacing model of P13 and by the owner's own play.
- Conversations progress and never loop (U7); names follow the naming bible (U6); every named companion and major
  character has a motive bible and an arc, romances included (U8).
- No loading screen after the title: places open as the player walks in; interiors open instantly; fast travel is
  a montage, not a load.
- 30 fps minimum on the Mid tier (PORT.md §4 device tiers), 60 on Flagship, with the frame budget measured on
  device at the end of every phase.
- The screenshot set of every system (§7.3) judged acceptable by the owner.

**Playable builds on the way to v1** (asked by the owner 2026-10-28). Each is an APK from CI that the owner installs on
the phone; it is tagged `play-<name>` on the commit that passes its line below, and `docs/PLAYTEST.md` says what it
holds and how to install it. A save from one playable build may not load in the next until P13's migrations; the
build says so on load instead of failing. Step counts are rough (±30 %) and are refined when each phase starts.

| Build | After | What the owner can play | Steps from now (≈) |
|---|---|---|---|
| `play-walkabout` | P3 + P5.1–P5.2 (camera and input pulled forward) | Walk the first region of the one world (the Sallow and Shale) with the one-finger camera, tap to move, pinch zoom; the P2 people stand in town. A feel-and-frame-rate build, not a game. | 20 |
| `play-ch1` | P7 | Character creation → the opening → Chapter One to the stranger's map: talk, checks, quests, combat, saving. The first real playtest. | 70 |
| `play-act1` | P8, first half | All of Act 1 to its finale (the old `act1-test-1` cut, at the new standard). | 85 |
| `play-act2a` | P8 | Act 1 and the megacity districts written so far (Act 2 part 1). | 105 |
| `play-voices` | P9 | The same, renamed to the naming bible, with the conversation system that never loops and the rewritten companions and romances. | 125 |
| `play-act2` | P10 | Act 2 complete: the rest of the megacity and the Act 2 wilds. | 165 |
| `play-story` (beta) | P11 | The whole story to every ending: feature-complete beta. | 190 |
| **v1** | P12 + P13 | The complete game: systemic depth, balance, accessibility, signed release build. | 215 |

---

## 2. State of the repository (updated 2026-10-28, after the first local-editor passes)

**Where the build is (2026-10-29):** P0, P1 and **P2 are closed** (verdict in PORT.md §5); **P3 (world) is next**,
from §10 step 13. What follows was the state while P2 was closing: **P2 (the bake-off) is closing**: the
pipelines exist and render in the engine; what remains is the people at the hair and skin standard, their weight,
the nature set moved to FBX, the card trees, and the Addressables skeleton (§5 P2). Then P3 (world) → P4 (people
at full quality) → P5 (camera, touch, UI) → P6 (systems and combat) → P7 (Chapter One on the phone) → P8 (Act 1 and
the megacity) → P9 (names, conversation, characters) → P10 (Act 2 completed) → P11 (Act 3 and the endings) →
P12 (systemic depth) → P13 (release hardening) = v1, the complete game (§1).

What exists and is verified:
- **`unity/`** Unity 6000.3.27f1, URP 17.3, Android IL2CPP ARM64, landscape immersive. `ProjectSetup.cs` creates
  the URP asset, player settings and the committed `Scenes/Boot.unity`; `BuildGuard` fails a build whose settings
  drifted. CI (`.github/workflows/android.yml`, identical to `tools/ci/android.yml`; the session can push workflow
  files now) runs two jobs on every push: *Build APK* (artifact `SecondFace-Android-APK`) and *Unity tests and
  screenshots* (EditMode + PlayMode except the `Heavy` category; artifacts `Unity-test-results`,
  `Unity-screenshots`).
- **The editor in the session** (§7.1a): `tools/unity/editor.sh` installs the same editor as CI into `/opt/unity`,
  activates it with the owner's Unity account (`UNITY_EMAIL`, `UNITY_PASSWORD` in the cloud environment) and runs
  the tests headless. On 2026-10-28: **87 EditMode and 8 PlayMode tests pass locally, 23 captures** in
  `unity/Screenshots/` (gitignored). `Editor/Build/Diagnostics.cs` prints what the importers produced
  (`editor.sh run SecondFace.EditorTools.Diagnostics.Report`).
- **`SecondFace.Core`** (pure C#, NUnit tests via `core/SecondFace.Core.Tests` and in the editor): content model
  (`Content/Model/*`: items, NPCs, maps, quests, dialogue, rules, roads, travel, world), `Registry`, `ContentDb`
  over `StreamingAssets/content/*.json` (exported by `npm run export` = `tools/port/export.ts`), `Rng` (the web
  sequence), `Stats` (sheet, checks, chrome/Drift), `Inventory` (items, barter), `Dialogue/DialogueRunner`,
  `Quest/QuestEngine`, `World/*` (factions, frontier, letters, logic, roads, travel, state), `Save/Saves`
  (versioned), `Scene/Grid` (A*, line of sight: the interior fallback), `Npc/*` (outfits, party, schedule),
  `Combat/Rules` (the web rules, to be redesigned per §6.G).
- **`SecondFace.Game`**: `Bootstrap` (full screen, loads content, title card), `World/TextureLibrary`
  (manifest of `tools/unity/assets.py`), `World/ModelLibrary` (manifest of the baked nature models).
- **`SecondFace.Editor`** (`Editor/Build/*`): import post-processors, all with `GetVersion()` (bump it when a rule
  changes): `ExternalTexturePostprocessor`, `KitImportPostprocessor` (axis conversion baked, no mesh compression,
  slot names kept), `PeopleImportPostprocessor` (Humanoid, blend shapes; slot names kept), `MotionImportPostprocessor`
  (Humanoid clips, loop from the sidecar JSON), `CiImportSettings` (no crunch in Linux batch mode). Materials are
  **bound by the builders after instantiating, never in an import callback**: `MaterialLibrary.Bind(go)` (kits:
  URP Lit from the texture library by slot `mat_<key>`; `Card(name)` for foliage) and
  `PeopleMaterials.Bind(go, dir)` (people: slot `mat_<kind>:<texture>`, arriving as `mat_<kind>_<texture>` after
  the FBX round trip). Code-built test scenes: `TerrainTestScene`, `MaterialSheetScene`, `ShelterTestScene`,
  `FrontierTestScene`, `PeopleTestScene`, `VegetationTestScene`. `Tests/PlayMode/ScreenshotTests.cs`
  (`IPrebuildSetup` builds the six scenes and restores the runner's scene; each test loads its scene additively,
  captures through a URP render request, unloads it).
- **Asset pipelines (Python; Blender 4.5.9 headless for the heavy ones)**:
  - `tools/unity/assets.py` — CC0 textures (Poly Haven) by manifest → `unity/Assets/External/` (gitignored, CI
    caches by script hash; `--only` keeps the manifest whole): 36 materials at 2 K (`d`, `n`, `mask` = R metallic /
    G AO / B height / A smoothness, `h`), GUIDs = md5(`second-face:` + asset path).
  - `tools/unity/models.py` — CC0 glTF scans (Poly Haven) → `.scans/models/` at the repository root, outside the
    Unity project so the editor never imports them (2.2 GB, gitignored, local only;
    fetch only for a nature re-bake).
  - `tools/unity/models_bake.py` — Blender: welds, decimates to per-model budgets (2–9 K; one 24 K hero tree),
    1 K JPEG inside `.glb` → committed `unity/Assets/SecondFace/Models/Nature/*.glb` + `models.json`
    (size, `place: scatter|patch`). 27 models, 30 MB. **To move to FBX with library materials** (§6.Q; glTFast's
    own shaders ignore our material library) and to split multi-variant scans into one model per variant.
  - `tools/unity/kits/{kitlib,shelter,frontier}.py` — modular kits as FBX with `mat_<key>` slots (20 + 22 pieces,
    committed under `Kits/Shelter`, `Kits/Frontier`; metas with `bakeAxisConversion: 1`, `meshCompression: 0`).
  - `tools/unity/kits/cards.py` — foliage cards → committed `Kits/Trees/tex/card_*.png` + JSON sidecars. Verified:
    coverage 16–32 %, branch root at the bottom.
  - `tools/unity/people/mh_build.py` — people pipeline candidate A (MakeHuman CC0 base + community packs):
    macro/feature targets baked, the game rig (55 Mecanim-named bones, every bone exported), 69 face/expression
    blend shapes, proxies fitted by mhclo with weights from every base vertex, `bake_cloth` (the wardrobe rule per
    garment, per person), Humanoid FBX + textures → committed `People/Bakeoff/p1..p6` (22 MB FBX + 110 MB
    textures: **too heavy; §6.B.6 says how to cut it before the full cast**).
  - `tools/unity/motion/cmu2fbx.py` — CMU ASF/AMC → canonical, gait-cut, seam-looped rows → BVH → Blender →
    Humanoid FBX with sidecar `{loop, root, speed, hip}` → committed `Motion/*.fbx` (28 clips).
- **Docs**: `docs/UNITY_PRACTICES.md` (Unity's own rules, binding), `docs/DESIGN_UNITY.md` (the redesigned game),
  `docs/PORT.md`, `docs/UPGRADE.md`, `docs/CREDITS.md`, `docs/evidence/unity/` (evidence for the owner, README).

What the engine captures show is still wrong (each has a step in §5 P2 or §10):
- **Eyes render as pale blanks**: the MakeHuman eye's cornea shell maps onto a tiny transparent patch of the
  texture that the mip levels blur opaque, so the shell covers the iris; drop the shell in `mh_build.py`
  (§6.B.3, §10 step 3).
- **Hair breaks the hair rule** (§3.4) on the bake-off people (§10 step 2).
- ~~Leaves near-black, rows of identical plants~~: fixed by the move to FBX with one model per variant (§10 step 6).
- **The vegetation camera sees the terrain edge** (`vegetation_iso`): frame inside the terrain (§10 step 7).
- **EditMode tests are compiled by the dotnet Core test build too** (`core/SecondFace.Core.Tests` includes
  `Tests/EditMode/**`): no `UnityEngine` in them; run `dotnet test core/SecondFace.Core.Tests` before pushing (P5.3f).
- **The default theme's disabled colours show through**: `.unity-button:disabled` sets a background, which a
  transparent or plate button of ours does not override with one class; every `:disabled` rule of ours sets its
  background too (P5.3d).
- **Safe-area padding does not move absolutely placed children**: in UI Toolkit (Yoga) an absolute child is placed
  against its parent's padding edge, so padding a `.sf-safe` wrapper moves its flow children only; absolutely placed
  HUD pieces go in a child that fills the wrapper (P5.3a).
- **TextCore's `FontAsset.clearDynamicDataOnBuild` is internal** in 6000.3; set `m_ClearDynamicDataOnBuild` through a
  `SerializedObject` (UIBuild). A rebuilt font asset (Second Face/Rebuild UI fonts) gets a new GUID: the theme's
  `url()`s are resolved at import, so `UIBuild` re-imports `Theme.uss` after a rebuild.
- **A panel with a `targetTexture` draws in batch mode** (the PlayMode tests' editor): yield a few frames after a change
  and read the texture; no `WaitForEndOfFrame` (it never comes in batch mode).
- **The boot capture lacks the UI**: a camera render does not include UI Toolkit; P5 captures render the panel
  through `PanelSettings.targetTexture` (§8).
- ~~The captured walk holds the forearms raised in front~~ on every person: fixed in P4.8 (§6.E "As built (P4.8)":
  the BVH angles decomposed in the wrong order, each clip's reference its own first frame).
- ~~Some frontier walls lean~~: every kit piece lay on its side (the export axis, §8); fixed 2026-10-28.
- `bake_cloth` palette tones are first guesses; judge them on the engine captures.
- `tools/unity/kits/trees.py` (Sapling card trees) is **not written**; §6.L specifies it.
- The Addressables skeleton is built (§6.A.7): five groups, committed bound prefabs and library materials.

Session machine (ephemeral; a new session re-provisions per §7.1): the Unity editor (`/opt/unity`, 8.3 GB), the
project's `unity/Library` (about 4 GB, rebuilt by the first import, about 12 minutes), `unity/Assets/External`
(textures, 0.6 GB), Blender 4.5.9, the MakeHuman data and community packs, the CMU trials, the .NET SDK, the
Sapling extension. **The disk allowance is about 30 GB and it is the binding limit**: see §7.1 for the budget.

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
  (`skin`, `eyes`, `hair`, `brows`, `lashes`, `cloth`); `mat_card:<card>` for foliage. The FBX round trip turns
  ':' into '_', so parsers accept either after the kind. Imports keep the names on placeholder materials; the
  builders bind the real materials (`MaterialLibrary.Bind`, `PeopleMaterials.Bind`) and strip the `mat_` prefix.
- Stable GUIDs for generated metas: md5(`second-face:` + asset path). Never let Unity invent a GUID for a
  generated asset (the scene references would break on regeneration).
- Generated-at-import assets live under `Assets/SecondFace/Generated/` (gitignored).
- Baked committed assets: `Models/Nature/*.fbx` (today `.glb`, moving to FBX in P2), `Kits/<Kit>/*.fbx`, `Kits/Trees/*.fbx` + `tex/`,
  `People/<Set>/*.fbx` + `tex/`, `Motion/*.fbx` + `.json`.

---

## 5. The phases, step by step

Each phase ends with a CI-built APK the owner installs and a screenshot set the owner judges. Steps are in order;
each is one commit or a few WIP commits, and each runs the working loop of §7.0. Budgets and acceptance are part
of the step.

### P2 — close the bake-off (closed 2026-10-29; verdict in PORT.md §5)
Every step below runs the working loop of §7.0. Blender steps also re-run the Blender script and commit the baked
output it changed. "Read" means: open the PNG with the Read tool and judge it against §6.N.
1. ~~**Verify the cards**~~ — done 2026-10-28 (coverage 16–32 %, root at the bottom).
2. **Hair rule on the six bake-off people** (§6.C.1–C.2, C.4): apply the mapping in §6.C.1; `bake_hair` for the
   card hair; stubble painted into the skin for p5 (buzzed) and p3 (balding). Rebuild with `mh_build.py`; read `people_lineup` and
   `portrait_*`. Every head must pass §3.4.
3. **Eyes** (§6.B.3): drop the cornea faces in `mh_build.py`; make the eye material opaque in `PeopleMaterials`;
   rebuild; read `portrait_*`: iris and pupil visible, highlight on the eye.
4. **Skin grit** (§6.C.4–C.5): `bake_skin` (sun, dirt in creases, chapped lips, stubble) on the six skins;
   rebuild; read the portraits.
5. ~~**People weight**~~ (§6.B.6) — done 2026-10-28: garment normal maps shared per garment at 1 K, all normal maps
   1 K and RGB, skin diffuse 2 K (own per person), the sculptor's shapes only on the player (`sculpt`), 102 → 66 MB
   in the repository; per person in the build (ASTC 6×6 + mesh file) 7.8–10.6 MB plus 5 MB shared. The rest is
   mesh weight (FBX 3–5 MB): LODs and decimation in P4.1.
6. ~~**Nature to FBX, one model per variant**~~ — done 2026-10-28: 27 models, 75 variants, 35 MB; glTFast removed.
   As built: variants come from the scan's own objects (Poly Haven ships them as <key>_a, _b ...), and a single long
   thin object (a row of seedlings) is cut at the empty stretches along its length (distance grouping fails:
   neighbouring shrubs touch); base colour JPEG when opaque, PNG only when it has real transparency (the quiver
   tree's succulent leaves are flagged "blend" but solid); normals 512. The original spec, for reference:
   `models_bake.py` exports FBX instead of `.glb`; it splits a scan into variants by its separate mesh objects,
   or, if the scan is one object, by connected parts grouped by a gap over 0.5 m on the ground plane, and
   re-centres each variant on its own origin (median x/z, lowest y) as `<key>_v<n>.fbx`. Material slots are
   `mat_nature:<texture>` with the textures written beside the FBX as PNG (1 K); `MaterialLibrary.Bind` gains the
   `nature` kind (URP Lit; leaves cutout at 0.5, double-sided, smoothness 0.2; bark and rock opaque). Metas as
   the kits' (`bakeAxisConversion: 1`, `meshCompression: 0`, stable GUIDs). `models.json` lists the variants;
   `ModelLibrary` reads them. Delete the `.glb` files and remove `com.unity.cloud.gltfast` from
   `Packages/manifest.json` once no `.glb` remains. Read `vegetation_iso`: leaves are green and lit, variants
   differ.
7. **Vegetation scene** (§6.L, §P3.4): frame `vegetation_iso` inside the terrain (no edge in view); extract the
   placement rules from `VegetationTestScene` into `ScatterRules` (biome × slope × height × wash × noise) in the
   Game assembly with EditMode tests on the rules. Commit.
8. **`trees.py`** (§6.L): pine first (three seeds), then fir and broadleaf, with LOD1/LOD2; ≤ 3 K triangles
   each; `vegetation_teeth` capture on a conifer slope. Two commits (pine; fir, broadleaf and LODs).
9. ~~**Frontier kit check**~~ — done with step 6: the export axis (§8); the town reads as a town now.
10. **Addressables skeleton** (§6.A.7): groups, labels, the content build step (an editor method run by
    `editor.sh run` locally and by CI before the APK build), a PlayMode smoke test that loads one kit prefab by
    address. Commit.
11. **P2 verdict**: copy the final captures downscaled (1280 px wide, JPEG 85) into `docs/evidence/unity/` with a
    line each in its README; write the verdict in PORT.md §5: candidate A is the people pipeline unless the
    portraits fail §6.N, in which case run candidate B (MB-Lab, used only as a tool: export results, never its
    code) on the same six briefs and compare. Tell the owner the evidence is in (spoiler-free); go on to P3
    without waiting.

### P3 — World
1. `WorldService` + chunk grid + the control map + runtime terrain generation (§6.A.1–A.4), with a PlayMode test
   that walks a camera across 4 chunks and asserts no frame over 33 ms on the CI machine and no missing chunk.
2. Terrain shader: URP Terrain Lit with at most 4 layers per tile, height-blended, triplanar on steep slopes (§6.J). Capture
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
1. **Built (P4.1, 2026-10-29; §6.B.7–B.8; captures `people_cast_1..4`, `people_lod_0..2`; retired in P4.13 step 6).** The full pipeline to `People/Cast/`: a `people.json` brief per role and region (body, face, ancestry mix,
   lifestyle, skin, hair, wardrobe) → `mh_build.py` builds all; LOD1 (6 K) and LOD2 (2 K) by Blender decimate
   with the same rig; `LODGroup` set by the postprocessor. Budget ≤ 8 MB per person, ≤ 15 K triangles LOD0.
2. **Built (P4.2a, 2026-10-29; §6.B.5 "As built"; captures `people_sculpt_*`): the shapes, their binding and the
   rerolls; the sculptor screen itself is P5.** The player prefab with all face shapes; the sculptor UI binds to blend-shape weights (§6.B.5).
3. **Built (P4.3a, 2026-10-29; §6.D "As built"; capture `people_wardrobe_*`): the player's wardrobe, swapped at
   runtime, skin hidden by mask; NPC merging and body sliders open.** Wardrobe runtime (§6.D, §6.Q): the player's garments are separate skinned meshes on the shared rig, swapped on
   equip; every NPC's outfit is merged into one SkinnedMeshRenderer when the NPC prefab is baked (two renderers
   roughly double the skinning cost). Dye and grime are material parameters, not textures.
4. **Built (P4.4a, 2026-10-29; §6.E "As built"; capture `people_motion_slope`): speed blend with idle variants, a
   gesture layer, foot planting by Humanoid IK; turn and strafe clips open.** Locomotion: Animator controller from the 28 clips (idle, walk, jog, run, turn, strafe, sit, stand, drink,
   alert, …) in a 2D freeform blend tree by speed and turn; root motion off; a `CharacterMotor` on NavMesh
   (`NavMeshAgent` with `updatePosition` true, animation driven by velocity); foot IK through Animation Rigging
   `TwoBoneIKConstraint` with ground raycasts (§6.E).
5. **Built (P4.5a, 2026-10-29; capture `people_ragdoll`): built at runtime on the first fall instead of an editor
   step (the many who never fall carry no physics).** `Game/People/Ragdoll`: twelve bodies on the Humanoid bones
   (hips, spine, chest, head, upper and lower arms and legs; ~70 kg shared like a body's), capsules along each bone to
   its child and a sphere for the head, character joints to the nearest part above in the skeleton (an avatar without
   a chest joins arms and head to the spine) with twist and swing limits by bone. `Fall(impulse, at)`: the animator,
   agent, walker, foot planting and gestures stop, the nearest part takes the push. `StandUp()`: the person is put
   under the hips facing the hips' way and the lying pose is blended into the animation over 0.7 s. Test: a 55 N·s push
   to the chest, the body lies (hips 0.1 m up), no part's centre under the ground, settled in 3 s, standing again 1.2 s
   after `StandUp`. Open: a captured get-up clip (face up and face down) instead of the blend; partial ragdoll for hits
   (P6 combat). Ragdoll per rig (`RagdollBuilder` editor step: capsules per Humanoid bone, joints with limits), switched on
   at death and heavy knockback; blended back for stand-ups.
6. **Built (P4.6a, 2026-10-29; capture `people_portraits`).** `Game/People/Portraits`: `Of(person, key)` draws the
   person where they stand, alone (their renderers on layer 31 for the one render, LOD0 forced), framed three-quarter
   from the front left by the head bone and facing by the eyes (a person not yet animated stands in the model's own
   pose, which faces away from the Humanoid forward), under a fixed studio light (warm key, cool fill, rim, neutral
   trilight ambient, no fog; the world's lights, ambient and fog set aside for the render and put back) into a 256²
   texture, kept per person and key (an outfit state; "aged" draws `FaceSculpt.Aged` = 1); `Forget` drops a person's.
   118 ms each in the batch editor (cached, so paid once). Open: the aged skin bake for the photograph (geometry alone
   barely ages the face); portraits from the sculptor screen (P5). Portraits in engine: a `PortraitCamera` renders the head to a 256² RT with the face lit by a fixed key/fill,
   cached per actor per outfit state; the UI shows the RT (no wait).
7. **Built (P4.7a, 2026-10-29; §6.C.1 "Hair of our own"; capture `people_hair`).** Generated card hair in four forms of
   the hair rule (`hairgen.py`), judged in Blender with Unity's alpha cut-off (fast: one person in ~15 s) and then in the
   engine from the front, the side and the back (`HairTestScene`, `briefs/hairtest.json`, people built locally into
   `People/HairTest`, not committed). Eight of the cast and both player bases re-haired with it.
8. **Built (P4.8, P4.9, 2026-10-29).** Natural motion (§6.E "As built (P4.8)"): the captured clips retargeted
   correctly, Foot IK, the gaze level; faces (§6.C.4 "P4.9"): painted brows, lips by skin tone, the aged skin.
9. **Done**: `people_cast_1..4` (32 people), `people_lod_0..2`, `people_walk`, `people_portraits`, plus
   `people_sculpt_*`, `people_wardrobe_*`, `people_motion_slope`, `people_ragdoll`. Capture `people_cast_lineup` (30 people), `people_lod`, `people_walk`, `people_portraits`.
10. **Built (P4.10, 2026-10-29; captures `people_wardrobe`, `ui_pack_figure`).** `SecondFace/Cloth`, the player's
   garments' shader (`PeopleMaterials` gives it to cloth under People/Player; everyone else keeps URP Lit with their
   look baked): URP PBR like `SecondFace/Skin`, double-sided with the 0.5 alpha cut the Lit cloth had, plus three values
   the wardrobe sets per garment through its property block: `_Inflate`, how far a layer stands off the ones under it
   along its normals (`Wardrobe.StandOff`: over 12 mm, feet 4 mm; a coat and the shirt under it were both fitted to the
   bare body, so the shirt showed through the coat in patches), `_Grime` (darker, duller, a dirt colour, heaviest
   towards the hem by the garment's height above the feet, in noise patches) and `_Wear` (sun-faded: paler, greyer),
   from the content's garment looks (`Dresser`; the player's own clothes are `LivedIn`, 0.2). Every pass (forward,
   shadow, depth, depth-normals) inflates and cuts the same way, so the shadow and the depth prepass match.
11. **Built (P4.11, 2026-10-29; owner: "dimorphism is more pronounced in real life, as is shape diversity, even if ...
   people tend to skew slimmer"; evidence `people_bodies.jpg`, `people_cast_lineup.jpg`, `people_wardrobe.jpg`).** Measured
   first: `tools/unity/people/measure/measure.py` applies a spec's targets to the MakeHuman base mesh in plain Python
   (the build's own `macro_targets` and `body_mods`) and reads stature and the deltoid, waist and hip breadths (torso told
   from arms by each vertex's dominant bone in the default skin weights). Against adult anthropometry (ANSUR II means)
   MakeHuman's men were close (shoulders over hips 1.46 against 1.44) but its women stood on a near-male frame (1.36
   against 1.17, hips no wider than a man's), and the cast's heights ran from 150 to 197 cm. `mh_build.py` now gives
   every body a sex baseline, `DIMORPH` (women: the torso narrowed and V-shaped inward, hips wider, a waist, a slighter
   neck, upper arm and wrist, smaller hands and feet, a fuller seat and thigh; men: a V, narrower hips, a thicker neck
   and wrists, larger hands and feet), scaled per person by `dimorph`; a `shape` from MakeHuman's body-shape targets
   (women: column, rectangle, pear, hourglass, full, wedge, apple, diamond; men: column, rectangle, pear, wedge,
   trapezoid, apple) with a weight; `legs` and `torso` lengths (-1..1); the person's own `mods` on top (`body_mods`).
   `measure/design.py` gave each of the 32 a shape, build and stature by role (labourers broad, scavengers gaunt, a
   stocky miner, a barrel-chested fisher, a lanky salt worker; the comfortable heavier: the Tollmen clerk, a trader, one
   of the Tenured; most lean, weight 0.05 to 0.45) and solved the height macro to the stature: men 174.6 ± 7.5 cm,
   women 162.4 ± 6.1 cm (real 175 ± 7, 162 ± 6.5); shoulders over hips men 1.57, women 1.18; women's hips some 9 %
   wider than men's (real ~4 %; a little past it, as asked). The player bases take the baseline and no shape (the
   sculptor's neutral start; the body sliders move from there): 164 and 177 cm. `measure/silhouettes.py` draws every body
   front-on, before and after, at one scale (`people_bodies.jpg`). Rebuilt: the cast, the player bases, their wardrobes,
   the bound prefabs. Not yet: stooped age and posture, the bake-off people (test-only), a third body slider for shape in
   creation.

12. **Built (P4.12, 2026-10-29; owner: "arms are clipping body … her hands are melded into her hips"; evidence
   `docs/evidence/unity/p4/people_arms.jpg`, before | after).** The captures were taken from bodies narrower at the hip
   than ours, so a hanging arm or a hand at the back went 6 cm into the walker. Each person prefab now carries a
   `TorsoProfile`: measured at build time by `Editor/Build/TorsoMeasure` (`Second Face/Measure torsos`, and in every
   `WorldAssetsBuild.Build`; garments' own prefabs are skipped) from the LOD0 body and its clothes baked at rest,
   leaving out every vertex whose strongest bone is an arm's, a lower leg's or the hair's, as an ellipse per 2.5 cm of
   height in the hips' frame from 45 cm below to 75 cm above them, with each `body-*` shape (the player's build and
   muscle) at full weight as a change (the meshes are not readable on the phone: measuring there is impossible).
   `Game/People/ArmClearance` runs after the animation and its IK each frame: the elbow, mid-forearm, wrist and hand are
   tested against the torso grown by 2 cm, in a frame that turns with the hips (the sneak's lean), and the upper arm is
   turned at the shoulder about the axis that moves the deepest point straight out, then once more for what is left;
   the turn comes at once and eases off at 90° a second. On the walker and on the townsfolk seen in full; off while
   seated (hands on the lap). Test `BootTests.ArmsStayOutOfTheBody`: 6.2 cm in without it; 0.0 cm standing, sneaking
   and walking with it, and 0.0 for all 18 townsfolk.
13. **P4.13, the cast as data (owner's notes 2026-10-29: "dimorphism still does not account for realistic wide bodily
   variation like breasts and butt for women and height/muscle tone for men"; "for a 60+ hour playthrough there must
   be far more [than 32]"). Steps 1-2 done 2026-10-29; steps 3-6 planned.** A body each the P4.1 way is ~3 MB of mesh
   and ~2.7 MB of textures (32 = 214 MB): hundreds would not fit the repository or the app. Everyone is instead a
   **base body** (the player's two, already carrying the face sculptor's shapes, with every garment and hair refitted
   to them) with **parameters**.
   *As built (steps 1-2):* the bases carry the body's own shapes, each refitted on every proxy and kept on LOD2 (the
   far level shows a body's shape too): `body-weight`, `body-muscle` (a step either way), a woman's `body-bust`
   (MakeHuman's cup macro to 0 and to 1) and `body-firm`, the measures `body-seat` (buttocks volume), `-hips`,
   `-waist`, `-shoulders` (torso width), `-chest` (bust girth), `-belly` (MakeHuman's stomach, a full one at +1),
   `-arms`, `-thighs`, `-tone` (each `-decr`/`-incr`), and the single `body-age-incr` (the macro to 70) and
   `body-african`/`-asian`/`-caucasian` (the whole mix to each one: weights summing to 1 give any mix exactly). Every
   macro shape is built at the base's own stature (`keep_stature`, pitfall §8). 30 shapes on the woman, 26 on the man,
   all measured by `TorsoMeasure` as changes to the torso (the arms' clearance follows every body; `WardrobeBuild`
   measures each base as it builds it). Core `Sculpt.Body` drives them (`Sculpt.WomanOnly` for the bust pair);
   `PlayerLook` gained `Shape` (the body's shapes by slider) and `Stature` (cm; 0 keeps the Height slider);
   `Looks.Shape` merges them for `FaceSculpt`; `LookView.Scale` takes a stature against the base's own (164 / 177 cm).
   Core `Npc.Bodies.For(id, male, age, role, means, frame, ancestry)` is the population model, seeded by the id:
   stature N(175, 7.5) for men and N(162, 6.5) for women clamped at ±2.5σ, less 0.08 cm a year after 45; build by
   means (destitute 0.10, working 0.22, comfortable 0.45, rich 0.50 on the weight macro, with age and less with labour),
   muscle by labour and sex; a woman's cup N(0.45, 0.25) and more with weight (the chest's girth with it), firmness
   falling with the years, seat, hips and thighs; a man's shoulders, chest and arms with his muscle; a belly only with
   weight past 0.45 and age past 45; ancestry from the content's tag, else the Reach's own mix; the face from the
   sculptor's reroll; skin, undertone and freckles from ancestry and outdoor work; hair by the grooming rule, greying
   with age. 9 Core tests (`BodiesTests`: statures and their spread, the same id the same person, the bust's range and
   none on a man, heavy bodies for the comfortable only, muscle with the work, content tags win, the shapes reach the
   sculptor). The creation's body page has the shapes as sliders (shoulders, chest, bust and lift on the woman's body,
   arms, waist, belly, tone, hips, seat, thighs). Evidence: `ScreenshotTests.BodiesVaryAsInLife`, nine women and nine
   men by trade, means and age on the bases, front, side and close (`docs/evidence/unity/p4/people_bodies_*.jpg`):
   women 147-169 cm, hips 33-38 cm, men 165-183 cm, hips 29-37 cm, the arms 0.0 cm in on every one.
   *As built (steps 3-4, 2026-10-29):* the bases' wardrobe holds every garment the content dresses people in
   (`garments.json`, brief key `wardrobe_content`: 85 for the woman, 84 for the man by fit, beside each base's own five),
   each built with the body shapes that touch it (a hat carries the face's too) and one texture shared by both bases:
   dyeable cloth baked light and undyed with salvage patches (`undyed`), the rest in its own colours, muted (`own`);
   dye, grime and wear at runtime. A garment hides the body under it by slot (top, legs, full, feet, hands, face), a hat
   the hair. Each garment is measured over the bare base at build (`TorsoMeasure.Garment`: sleeves and lower legs left
   out) and the arms keep clear of what is worn too (`TorsoProfile.Wearing`, from `Wardrobe`). `full` replaces top and
   legs. Size: People/Player 245 MB on disk (FBX 145, textures 98; garment normals stored at 512, diffuse at 1K, the
   phone's import caps them there); the build takes ~3.5 s a garment (about 12 minutes for both bases). `PeopleService`
   makes everyone from the bases when they are set (`BaseF`, `BaseM` from `WorldAssets.PlayerF/M`): their look from
   `Bodies.For(id, sex, age, trade, ancestry)`, their outfit the content's own or `Outfits.DressFor(look seed, trade,
   fit, faction)` as the web game seeded it, dressed by `Dresser`, then the look over it; their stature as scale. The
   content's `frame` is the web game's sex marker (`Routine.Male`), not a build: it is not passed to `Bodies`.
   Evidence: `ScreenshotTests.TheCastWearsTheContent` (ten women and ten men by trade, every garment of their fit built,
   dressed, shod, arms 0.0 cm in; `docs/evidence/unity/p4/people_cast_wardrobe.jpg`) and Shale's 18 townsfolk made from
   the two bases (`BootTests.ShaleKeepsItsHours`, `walkabout_town_bases.jpg`).
   *As built (step 5, 2026-10-29):* Core `Npc.Extras` ports the web game's `makeExtras`: a map's `extras` (count,
   trades, ages, faction, team, area and spots, hours, barks, talk) made from the map's seed into people of their own
   (`Bodies` for sex, body and face; a first name from their ancestry's pool; the trade's small talk `d_x_<role>`, the
   settler's where a trade has none; the trade's barks), each with a routine: at their spot through their hours (a
   spot's name says the activity: `*_work` work, `*_pair_a/b` talking, else idle), or about a tile of their area (the
   patrol wander), away outside their hours. `PeopleService` brings them beside the named people of every standing
   place (a spot the place as built lacks leaves its extra out; an area is the surface map's). 207 extras in 20 places
   now: the content's 204 in 17, and new day workers in three wild places (`tools/maps/gen_*.py`): the Choir's novices
   in the orchard's rows, scavengers among the fallen windpumps, salt cutters on the salt pan's east crust. Dry Wells
   and Signal Hill keep only their own people (their quests are about who is there); Cistern 9 waits for the new
   opening (P7). Shale: 32 people (18 named, 14 extras), 29 about at noon, 3 extras still about at 23:30; arms 0.0 cm
   in for all 29. The catalogue's diving suit is the water trades' only (it was tagged `work` too, and a labourer in
   fins stood in the plaza). Tests: `ExtrasTests` (every place's count, ids, names, trades, talk, barks, sex, spots;
   the same people every time; hours and away), `BootTests.ShaleIsAliveWithItsExtras` (`walkabout_town_crowd.jpg`).
   *As built (step 6, 2026-10-30):* the per-person cast models are retired (214 MB: People/Cast, the cast prefabs,
   `Test_Cast` and `CastTestScene`; `WorldAssets.Cast` empty; the P2 people stand in only while the bases are not
   built). The content's look overrides reach the bodies (`Bodies.Over`: hair colour, hair style by the grooming rule,
   scars, skin tone, undertone, freckles, eyes; a beard waits for a beard on the bases). The conversation-camera and
   motion tests use the bases. Evidence: `ScreenshotTests.SixtyOfTheReach`, thirty women and thirty men of every trade
   and age, made and dressed (`docs/evidence/unity/p4/people_sixty.jpg`): men 175.3 ± 6.2 cm (163-189), women
   161.0 ± 7.5 cm (146-178), busts ± 0.51 and seats ± 0.41 on their sliders, men's muscle ± 0.51.
   *Open (visual pass):* undyed cloth bakes too light (a crowd of near-white shirts; bake `undyed` duller), the
   runtime grime barely shows at the game camera, a loose shirt hangs off a deep chest like a belly in profile, and
   no beard on the bases yet (`facialHair` in 61 people's looks).
   *Planned:* (5b) extras for the roads (travellers, caravans, patrols between places).
14. **P4.14, people to the standard (owner's notes 2026-10-30, binding; CLAUDE.md §2).** The Shale showcase
   (`ScreenshotTests.ShaleResidentsAsTheyAre`, `docs/evidence/unity/p4/shale/`) showed: a crowd in grey and beige;
   masks, sack hoods, goggles, headsets and helmets hiding faces; men's shirt pockets reading as breasts; women all
   pear-shaped, busts unconvincing; children with adult bodies; ancestries converging (the Reach's mix drew mostly
   mixed, so faces and skin are alike); flat light and plain materials; printed lettering left on suits. Steps, each
   ending with the Shale showcase re-rendered beside the last:
   (1) the wardrobe cleared: no garment that hides the face (masks, sacks, gas masks, plague masks, goggles over the
   eyes, opaque glasses, closed helmets) or an oversized headset; no shirt whose pockets sit on the chest; printed suits
   out; children made as children (a `body-child` shape: the age macro to 11 at the base's stature, then their
   stature by a growth chart). (2) the Reach's people by ancestry: a person is mostly one ancestry (some mixed),
   skin from very dark to pale as ancestry and sun make it, eyes, hair colour and texture by ancestry, the face's
   features through the ancestry macros at full strength. (3) colour: palettes from the research (`docs/WARDROBE.md`)
   by trade, faction and means; most pieces dyed; saturated accents; the bake keeps a garment's own colour where it has
   one. (4) bodies: women's figure types at real frequencies (straight, hourglass, inverted triangle, apple, pear),
   breasts by size, projection, spacing and lift at realistic scale, and tops that drape rather than shrink-wrap; men's
   chests as pectorals, never a bust. (5) a cyberpunk wardrobe from the research: new pieces built for the bases
   (high-collar jackets and shells, techwear and layered panels, harnesses and rigs, utility belts, armour panels, ponchos
   and wraps, knee and shin guards, wrist rigs, visible chrome), re-textured by our pipeline. (6) graphics: skin
   (subsurface-like diffusion, specular lobes, pore detail), hair (anisotropic highlights), cloth (sheen, fabric detail,
   wear in the normal), the people's lighting and URP's post (tonemapping, colour grading, ambient occlusion, bloom),
   judged at the game camera and in conversation.
   *As built (steps 1-4, 2026-10-30; the rebuild and the showcase pending):* `GarmentDef.retired` keeps a piece in
   the frozen web catalogue but out of the world (`garmentsFor` skips it, `garmentsInWorld()` is what the exporter
   writes, the validator refuses an authored outfit in one); the outfit tables lost their face chances, their
   respirators and their goggles over the eyes (goggles go up on the brow). `Bodies.Child(male, age)` is how much of
   the eleven-year-old is left (all to 11, gone at 17/16) and `Bodies.Growth` the chart's stature; `Young()` scales
   the grown measures out, removes the bust and the tattoo, softens the face. `Bodies.Clusters`, `Community(seed)`
   (two or three clusters raised, per place: `Extras` passes the map's), `Cluster`, `Mix` (a quarter of people of two
   clusters), `Tone`, `Undertone`, `HairShade`, `LightEyes`; the skin shader's `_Tone` now spans the whole human range
   (to a third of the bake's shade at 1, lifted most of the way to white at -1). `Bodies.Figures` (straight 42 %,
   pear 20 %, inverted triangle 14 %, hourglass 15 %, apple 9 %, apples rising with weight) centre the figure
   sliders; new shapes `body-vshape`, `body-pecs`, `body-legs`, and for the woman `body-lift`, `body-spacing`,
   `body-point`, `body-fullness`, `body-child` (mh_build; the sculptor rows and strings too). `mh_build.drape()`
   pushes a garment's refit outward under a cone (7 cm reach, 0.45 slope) for the bust and chest shapes, so cloth
   spans the cleavage and the fold. `Sculpt.Reroll(rng, previous, male)` folds each sex-marked slider into its range
   (`BySex`) and caps the head shapes by sex. `HandPose` curls the fingers at rest after the animation (a Humanoid
   finger no clip drives keeps the bind pose, flat and spread; the P4.8 note that they rest relaxed was wrong), added
   wherever `ArmClearance` is. Palettes and dye chances in `outfits.ts` from `docs/WARDROBE.md`. Garments under
   garments: every garment vertex carries its nearest body vertex in uv1 (`BaseIndex`, as the body does) and the
   cloth shader clips where a `_CoverMask` (128 x 128, written by `Wardrobe.Cover()` from the outer slots' hide lists:
   legs under top/full/over, top under over/full, feet under legs/full, hands under top/over/full) marks that vertex
   covered: no waistband through a sweater, no boot shaft through a trouser leg. A woman's top at rest is fitted to the
   base less its bust plus the bust's push under the drape's tent (`proxy()`, `_bust_flat`), and the bust shapes
   refit against that, so cloth spans the breasts instead of following the skin between and under them. The years in
   the skin: `FaceSculpt.SkinAge` (set by `LookView` from the body's age) blends the aged bake in without greying the
   hair twice. The showcase and the close-up (`ResidentCloseUp`: whole, torso, side, each hand, face, back, and the idle
   four ways) animate always and never freeze the Animator.
   *As built (step 5, first batch, 2026-10-30):* `GENERATED_GARMENTS` in mh_build cuts ten pieces from MakeHuman's
   helper meshes (the "tights" bodysuit and the "skirt", shaped by every target with the body) by bone family and
   landmark (`generated_setup`: the joints' heights on the unshaped base), each vertex riding its own helper vertex
   (refs of weight 1) and pushed out by the piece's thickness along the rest normals (`fit` wrapped in `proxy`): a
   high-neck thermal base, a sleeveless harness vest, a cropped bomber with a stand collar, a long duster open down
   the front (the skirt helper less its front strip), articulated cargo trousers, a belt rig, shin guards, arm wraps,
   a neck gaiter worn down, a shoulder cape. Baked by `bake_cloth` without a source (dye, weave, patches, wear); they
   hide the body under them by their nearest body vertices (`GEN_NEAR`). The catalogue lists them with
   `generated: true` (the web game has no mesh for them; its asset test skips them). `WARDROBE_ONLY` builds merge
   into the wardrobe manifest, so a piece can be rebuilt alone. Their details are drawn into the bake as boxes in the
   garment's object space (`look['boxes']`, `bake_cloth`: straps and a waist band on the harness vest, a zip, ribbed
   hem and collar band on the bomber, thigh pockets and knee panels on the cargo trousers, a buckle and pouches on the
   belt, the turns of the arm wraps). A dye is a colour, not a tint: `Wardrobe.Dye` sets `_Dyed` and the cloth
   shader takes the dye's own colour lit by the weave's luminance (the undyed bake is a khaki near 0.3 linear), so an
   indigo reads indigo. The boxy tactical vests and the cyborg suit are retired (the riot vest item and the raider's
   authored outfit wear the harness vest). Every tight garment hides the body vertices within 2.5 cm under its
   surface (`GEN_UNDER`), besides what its author deleted (a buttock came through the cargo pants). Still to do in
   step 5: a lit trim for the megacity; hoods and sleeves cut asymmetric; a looser silhouette for the shells (the
   helper is a bodysuit, so the bomber and the duster sit close).
15. **P4.15, people on the best free pipeline (owner's notes 2026-10-30, pass 8, binding; CLAUDE.md §2;
   `docs/PEOPLE_RESEARCH.md`).** The bar is BG3 / CP2077 / KCD2 as far as a phone allows. Steps, each ending with
   the Shale showcase and a close-up sheet of faces: (1) the bake-off, with renders: the MakeHuman base against
   CharMorph's CC-BY/CC0 bases (Reom: 8.4 K vertices, 4K/8K Light and Dark skins, 111 morphs over ancestry, age,
   sex, build and the face's bones, 51 ARKit expressions, 12 brow styles; Antonia; Vitruvian when reachable); the
   winner's data read by our own loader in mh_build (the add-on never runs in the pipeline). (2) the chosen base
   through the pipeline: body, LODs, rig (Humanoid), the hidden-body mask, the wardrobe refitted (the generated
   pieces are cut from the base's own surface, so they carry over; the community garments are refitted by nearest
   surface or retired), the sculptor's sliders mapped to the base's morphs. (3) faces that cohere: per sex and
   ancestry cluster a library of archetypes (feature sets as morph values, authored and checked in renders), each
   person an archetype varied a little, symmetric, no extremes; attractive by proportion, never by deformity;
   eyebrows always (the base's brow styles as cards, painted brows beneath for distance); hair of our own on the
   CC0 alphas with an anisotropic highlight; eyes with cornea refraction. (4) age and life expectancy: the age draw
   per trade and place (median late twenties, few past fifty, sixty old and rare), the skin's age = years plus the
   hardness of the life (wrinkle normals by age, greying earlier, posture), the rich ageing slowly. (5) the skin
   shader: pre-integrated subsurface scattering (a curvature × N·L lookup), dual-lobe specular, a detail normal for
   pores, the sun and grime of the work; cloth sheen; the look (ACES over HDR, grading, bloom, vignette; SSAO on the
   mid tier) in the game and every people capture. (6) evidence: every Shale resident, the faces sheet, the kits,
   the portraits; the device measurement.
   *As built:* step 5's look is in (`Look`, `LookBuild`, `WorldAssets.Look`, HDR on, the skin's wrap light and the
   cloth's sheen, the test scene's rim light). Step 1 done: Reom rendered by our loader (`docs/PEOPLE_RESEARCH.md` §5);
   the MakeHuman topology stays (the wardrobe's fit depends on it; Reom's ancestry and female morphs are weak), Reom's
   skin detail is the skin step's candidate. Step 3 rebuilt by the owner's pass 9 (CLAUDE.md §2, binding): **P4.15a,
   looks from archetypes and real-world regularities.** Core `Faces`: ancestry vectors (nose, lips, lids, brow ridge,
   cheekbones; Farkas 2005), sex vectors, five structures with shares by ancestry and sex, latent robustness, width and
   fullness tied to the body's build and muscle, the years (sooner on a hard life: `Faces.Apparent`), a tight personal
   spread skewed to the striking, blending for two ancestries; the random reroll is gone (creation draws within the
   chosen heritage). Core `Peoples`: per people stature, leg length, hair form, greying onset and pace, men's balding
   rate, beard density, brow density, women's figure shares, bust and seat, a man's frame, central fat (the catalogue
   with sources: `docs/PEOPLE_RESEARCH.md` §6). `Bodies.For` builds everyone from both, with a childhood's food in the
   stature, women lighter than the men of their people, freckles with red hair, recessive light eyes and fair hair in
   two ancestries, beards that grey first and grow red under brown hair. Twenty-one more MakeHuman face targets in the
   bases (`FACE_SHAPES`, measured by `tools/unity/people/face_probe.py`; the brow ridge by alias). SecondFace/Skin:
   the brows drawn in the head frame (six styles measured from the MakeHuman brows, `brow_frame.py`; colour and
   density per person; the baked brows went with the skin's tone and vanished on fair skins), the shaved scalp's
   stubble recoloured to the hair (it was the base's dark brown on everyone), pattern balding in Norwood's order
   (`_Bald`), the skin's years later on darker and East Asian skin (`Looks.SkinYears`). Coily hair of its own (`hairgen.py` v17:
   `sf_coils`, a close crop of tight coils standing out of a matted layer; `sf_cornrows`, thirteen rows braided flat
   from the hairline to the nape). Creation: "your people" first, another face within it, brow styles, a receding
   hairline. Tests: `FacesTests`, `PeoplesTests`. Evidence:
   `PeoplesLineup` (every people, both sexes, 25 and 60, front and profile; balding and brow strips).
### P5 — Camera, touch and UI
1. `CameraService` with Cinemachine 3: an orbit rig around the party leader (§6.F), tactical camera in combat,
   conversation cameras (over-shoulder two-shot, portrait inserts), the photo mode.
2. `InputService`: new Input System actions (touch gestures recognised in code per §6.F.2; gamepad bindings).
3. UI Toolkit screens in `UI/` with one USS theme (no cursive; the field-notebook look): HUD, radial action menu,
   dialogue, notebook (quests, leads, people, letters), map and travel, inventory with the live paper doll,
   barter, camp, combat bar and log, settings, title, character creation and the sculptor. Every screen has a
   PlayMode test that opens it with fixture state and captures it.
4. Safe areas and notches; landscape only; 16 px gutters; text at 1.0 scale readable at 6.1″.

*Order of work (2026-10-29; P5.1–P5.2 were pulled forward as P3 step 25).* Each step ends with its screen opened
from fixture state and captured (`UiTests`, the panel drawn into a texture):
- ~~3a. The foundation~~ (done, below).
- ~~3b. Localization wired (Unity Localization: a `UI` string table, English; screens take their strings from it, content
  text stays content) and the HUD (the objective line, health, the compass, the thumb-reach action cluster)~~ (done,
  below).
- ~~3c. The radial action menu (hold on a person or thing; verbs from content) and the touch rules round it~~ (done,
  below; a tap opens it, per §6.F.2).
- ~~3d. Dialogue panel bound to Core dialogue (the scene stays visible; options as notebook lines; skip heard lines; log)~~
  (done, below).
- ~~3e. Conversation cameras (over-shoulder two-shot, portrait inserts; Cinemachine)~~ (done, below).
- ~~3f. The notebook (leads, quests, people, letters, decisions) as a book~~ (done, below).
- ~~3g. The map and travel (world and local; pins)~~ (the world map done, below; the local map, pins and the travel
  itself follow: the local map as a top-down render of the place round the player, pins on a long press, the journey
  run by `TravelService` in P6.5).
- ~~3h. The pack with the live paper doll, and barter~~ (done, below; item models and icons rendered from them come
  with P6.1's loot, the procedural gear, held weapons and visible chrome on the figure with the P4 follow-ups).
- ~~3i. Character creation and the sculptor (body sliders here)~~ (done, below). Parts: (1) the rules and the screen;
  (2) the look in the shaders: skin tone and undertone, freckles, eye colour, hair colour, a scar and a tattoo drawn
  over the skin; (3) body sliders (build, muscle) and hair choices from the people pipeline (shapes refitted on every
  garment, hair pieces as wardrobe items in a hair slot).
- ~~3j. Title, settings (text size, contrast, controls), saves and pause~~ (done, below).
- 3k. The combat bar and log (with P6). ~~3l. Photo mode and the gamepad~~ (done, below).

*As built (P5.3a, 2026-10-29).* `Game.UI.UIService` (made by `Bootstrap` from the Boot scene's `UIAssets`; wired by
Second Face/Wire the Boot scene, checked by `BuildGuard`): one `UIDocument` on a runtime copy of `UI/Panel.asset`
(scale with screen size from 1280×720, matched by height: on a 6.1″ phone one unit ≈ 0.09 mm, body text 26 ≈ 14 sp,
a touch target 80 ≈ 7 mm), layers `hud` / `screens` / `modal`, a stack of `UIScreen`s (`Open`, `Close` closes the
screens over it too, `Back` asks the top screen; Android back = Escape, the pad's east button), opaque screens hide
the screens and HUD under them (not drawn), `Covers(screenPoint)` for `TouchInput` (a screen that does not pass
touches is a wall to the world). Safe area: `Screen.safeArea` (or `SafeAreaOverride`, normalised) becomes insets in
panel units, applied as padding to every `.sf-safe` element on open and on change. The theme is
`UI/Theme/SecondFace.tss` (Unity's default runtime theme, then `Theme.uss`: palette as USS variables, `.sf-page`,
`.sf-plate`, `.sf-title/.sf-heading/.sf-label/.sf-body/.sf-book/.sf-note/.sf-fine`, `.sf-button` with `--quiet` and
`--plate`, `.sf-modal`, `.sf-card`). Typefaces: Barlow Regular and SemiBold (interface), Literata 12 pt Regular and
Italic and 36 pt SemiBold (notebook; static instances cut from the variable font with fontTools), OFL, in
`UI/Fonts/`; `UIBuild` makes each a static SDF16 atlas of the Latin set (335–350 glyphs, 1024², not CPU-readable,
kept in the build) with a dynamic SDFAA fallback per family (emptied on build). The start card is now a UI Toolkit
`TitleCard` (IMGUI only when no UI assets are wired). `UiTests` draws a specimen, a modal question and an opaque page
into a 1600×720 texture with a left cutout and a gesture bar (`docs/evidence/unity/p5/ui_foundation.jpg`,
`ui_modal.jpg`).

*As built (P5.3b, 2026-10-29).* Localization: `LocalizationBuild` (Second Face/Build localization) makes the project's
Localization Settings (`UI/Localization/`, a config object in EditorBuildSettings; the package adds it to the
preloaded assets at build), the English locale and the `UI` string table (preloaded), its entries exactly the lines of
`UI/Strings/ui.tsv` (key, tab, English); the package's own Addressables groups (`Localization-*`) build with the player
like ours. `Game.UI.Strings`: `Get(key, args)` (String.Format) and `Bind(textElement, key)` (a `LocalizedString` data
binding: follows the language); `Bootstrap` waits on `LocalizationSettings.InitializationOperation` before its first
words. EditMode `UiStringsTests` fails on any key used in `Game/` that is not in the source. The HUD: `Game.UI.Hud`
over `UIService.Hud` (safe-area wrapper with a filler for its absolute pieces) from a `HudState` (place, day and clock,
tracked quest and objective or the quiet line, party members with portrait or initial and banded health, the
objective's bearing): objective plate top left (tap: `ObjectiveTapped`), `Compass` top right (180° strip drawn with
`Painter2D`, letters moved by `translate`, notch, objective pin or an edge arrow when behind; `Heading` each frame
costs no relayout; north is +z), party bottom left, notebook/map/pack bottom right (100-unit plates with vector
`Icons`; `Actions(...)` hides a button with no screen yet). The walkabout shows it live (clock from `TimeService`,
heading from the camera); `BootTests` checks it is up and follows the camera. Captures `ui_hud`, `ui_hud_quiet`.

*As built (P5.3c, 2026-10-29).* `Game.Play.Interactable` (id, title, verbs, closed verbs, `Chosen`): a trigger capsule
of its own, so it blocks neither walking (the NavMesh is built from render meshes) nor physics; `Interactable.Under`
casts through triggers and stops at the first solid collider (a wall hides the person behind it). `TouchInput.Tap`: a tap
on an interactable is `Tapped` (when anyone listens), else the walker goes there. `Game.UI.RadialMenu` (modal, not
opaque): verbs on a 160-unit ring of 104-unit buttons (the first at the top, clockwise; two sit left and right), the
title at the hub (wraps to two lines), a ring line drawn with `Painter2D`, opened by a 0.12 s scale-and-fade transition;
centred on the tapped point and moved as little as needed to stay 12 units inside the safe area; a closed verb is
dimmed and cannot be chosen; a verb's tap closes the ring and reports the verb; a tap elsewhere or back closes it. Verb
labels are `verb.<id>` in the UI table, icons in `Icons` (talk, look, take, use, steal, give, attack; a ring for any
other). The walkabout's townsfolk are interactables named from content (`npcs[<post>].name`) with talk (the walker
walks over, the person turns to them and talks, both look at each other) and look (eyes meet, the person waves); their
conversations open in the dialogue panel (P5.3d). `BootTests` pans the view onto the nearest one in clear view (the
townsfolk stand 25-35 m from the spawn, out of the game camera's frame), taps them and chooses a verb; a tap looks past
the player's own body (`Interactable.Under` skips the walker). Captures
`ui_radial`, `ui_radial_corner`.

*As built (P5.3d, 2026-10-29).* `Game.UI.DialoguePanel` (a screen, not opaque, takes every touch) over Core
`DialogueRunner`: a paper page on the right 46 % (min 560 units; safe-padded on every side but the left,
`UIService.SafeNoLeftClass`), the scene beside it. Head: the speaker's portrait (a `People.Portraits` RT, or the name's
initial) and name. A `ScrollView` (touch-scrolled, no bars) holds the log (each past line and the choice taken, in
pencil), the line (Literata 28; written out at 90 characters a second the first time, whole when heard before; a tap
on the page finishes it, and the passives and choices appear after it), the passives (label and italic text on a slate
rule) and the choices (numbered rows of 72+ units; a check shown up front as a pill, sage when met, rust outline when
not; chosen-before dimmed; locked ones dimmed where the content shows them; exits in italic). The page opens at the
current line (the log is a scroll up). A choice logs and goes to `DialogueRunner.Choose`; at the end the panel closes
and raises `Ended`; back takes the content's way out if there is one. `Bootstrap` installs the typed `Registry` after
loading the content; the walkabout's talk opens the person's content conversation on its own fresh game state
(`Walkabout.Game`), with their portrait. Captures `ui_dialogue`, `ui_dialogue_log`.

*As built (P5.3e, 2026-10-29).* `Game.Play.ConversationCamera`: a `CinemachineCamera` at priority 50 over the game
camera (the brain blends 0.6 s in and out, ease in-out; cuts within the conversation are instant: the one camera is
moved). Shots are worked out from the two heads (humanoid head bone), never authored: `TwoShot` (behind the player's
shoulder, 1.3 m back, 0.6 m aside, FOV 32°, framing the other), `Other` (an insert on the other from 1.5 m on the
player's side, FOV 24°) and `Player` (its reverse). Each is aimed so its subject sits at the middle of the screen's
left `Frame` (54 %, the part the conversation page leaves free) with the eyes on `EyeLine` (62 % up), from the
camera's own aspect. A spot is used only if nothing solid but the two people stands between it and the subject and the
spot itself is free (after `Physics.SyncTransforms`); else the other shoulder, then a higher spot. `End` drops the
priority (the brain blends back) and removes it after the blend. `DialoguePanel` raises `Presented` per node and
`Ended` whenever it closes; `HidesHud` (new on `UIScreen`, default: opaque) hides the HUD during a conversation. The
walkabout opens the shots with the conversation: the two-shot first, then the speaker's insert and the two-shot by
turns. `ConversationCameraTests` stands two of the cast face to face, checks each shot's framing and the move to the
other shoulder when a wall stands in the first spot, and captures each with the page drawn over it
(`docs/evidence/unity/p5/conversation_twoshot.jpg`, `conversation_other.jpg`, `conversation_player.jpg`). Not yet:
depth of field (a tier decision: the Gaussian DOF pass on Mid and up), companions in shot, a shot grammar by tone.

*As built (P5.3f, 2026-10-29).* Core `World.Notebook` (pure, `NotebookTests` on fixtures) turns the game state into
pages of `NoteEntry` (title, status, day, where, closed, pinned, objectives as `NoteItem`s, body paragraphs): quests
through `QuestEngine.Journal` (open first, the pinned one on top, then newest; the current stage's objectives; the
journal newest first; finished and failed ones closed after), `Tracked` (pinned and open, else the newest open), leads
with each conclusion first and the leads it rests on, the people met (newest), the post and the letters sent, the
decisions (newest); wording is left to the screen. `Game.UI.NotebookScreen` (opaque): a book on a dark desk, the
sections as tabs along the top and a close button, the entries on the left page (a tracked mark, the status, place and
day in pencil; closed ones dimmed), the chosen one on the right (Literata title, a track/stop-tracking button for an open
quest, objectives with open and filled rings, the journal); an empty section says so; `At(section, entry)` opens it
there. The words are `notebook.*` in the UI table. The walkabout: conversations run with a `QuestEngine` on the
walkabout's game as their host (so the content's quests start and move, `Update` after each node); the HUD's notebook
button and a tap on its objective open the notebook (at the tracked quest); the HUD shows the tracked quest's title and
its next objective, refreshed when the screens change. Captures `ui_notebook`, `ui_notebook_leads`. Also: the Core test
build (`core.yml`) had stopped compiling with P5.3b (`UiStringsTests` used `UnityEngine.Application`); it finds the
project from the working directory now.

*As built (P5.3g, 2026-10-29).* `MapBake` (Editor, Second Face/Bake the world map) paints the whole world from the
streamed terrain's own generator (`TerrainGen.Natural` on the control and style maps) as a surveyor's sheet,
`UI/Map/world.jpg` (2048×1365, 11.7 m a pixel, north up; JPEG: the paper grain made a 4 MB PNG): a muted colour per
biome taken from four samples round a noise-warped point (the control map's 64 m cells become soft, wandering borders),
snow on the high Teeth, relief shaded from the north-west, contours every 50 m (every 250 m stronger), the sea and its
shore line, the river, the roads (tracks dashed) and the rail line, a paper grain and a worn edge
(`docs/evidence/unity/p5/map_sheet.jpg`). `UIAssets.WorldMap` holds it. `Game.UI.MapScreen` over a `MapModel` (sheet,
layout, known places, here, the player and their heading, a trip planner, an optional travel action): the sheet on the
desk, scaled and moved by transform (no relayout) with one-finger drag (a pointer is captured only once it moves 10
units, so a tap still reaches a place), two-finger pinch about the fingers, the wheel; zoom 1-6, the margin allowed a
quarter of the view in; it opens at zoom 2.2 on the player and follows them through layout changes until moved. Only
known places are marked (a dot and a Literata name with a paper halo, counter-scaled to keep their size), the player
as an arrow along their heading. A tap on a place opens its card: name, region, and the quickest journey there
(`Travel.PlanTrip`) as hours or days on foot or by a line you can ride, or "no known way"; a travel button where a way
exists and the model offers travel. Back closes the card, then the map. The walkabout knows its town and the places its
roads lead to (`Walkabout.Know`); the HUD's map button opens the map there. Captures `ui_map`, `ui_map_card`.

*As built (P5.3h, 2026-10-29).* Core: `Inventory.Wear` (port of the web game's wardrobe rule: the base clothes, worn
armour over or instead of them, the weapon in hand, visible chrome as gear; `Key` changes whenever the outfit would);
`Inventory.Pack` (the sections all / weapons / wear / aid / papers / other, a steady order, the piece an item is
weighed against — the weapon in hand, the armour in its slot — and `Stats` as `StatLine`s with the change against it
and whether it helps); `Barter` gains the price context from the game (`Context`: Barter with tools, the settlement's
standing, a member's rate, the markup, the `price_buy`/`price_sell` perk modifiers the web game never applied) and the
haggle: once a day per merchant, a Barter check (`Checks.SkillCheck`: met always lands, a near miss may) against
`HaggleDc` = 15 + 40 × (markup − 1) + |net| / 25 (at most 15); landed, the day's prices move 4 % at the DC up to 15 % the
player's way; refused, 5 % against (`MerchantState.HaggleDay`, `Haggle`). `PackTests` (4). Game: `UI.ItemArt` draws
every item as ink on paper (63 drawings as SVG path data in a 100-unit box — wash, line, fine line, solid, circles —
parsed once, drawn with `Painter2D`; chosen by the shape in the hand, what armour puts on the body, the ammunition's
kind, the content icon, the category); `ItemGlyph` is the element. `People.Studio` is the portrait studio made shared
(one camera on layer 31, the fixed key/fill/rim and trilight, the world's lights, ambient and fog set aside per render);
`People.Figure` is the live paper doll: a copy of the player's body idling in the studio 3 km under the world, a soft
shadow sprite at its feet, drawn full length (FOV 24°, 576×864, MSAA 4) when the pack opens, after a change of clothes
(again the next frame, once the old garments are gone), while it is dragged round, and every 120 ms for the idle's
breath; `People.Dresser` puts a `Wear` outfit on a `Wardrobe` slot by slot (the outfit's garment where the body's set
has it built, the set's own where not; dyes as tints). `UI.PackScreen` (opaque, on the desk): the figure on the left with
the four worn places over it (head, body, in hand, slung), two pages: the grid of item cells by section (drawing, count,
condition line) and the item's card (drawing, name, kind, the content's words, its figures each against the piece it
would replace in sage or rust, equip / sling / use, take off / hold for a worn one), the load against the carry along
the foot. `UI.BarterScreen` (opaque): their goods on the left page priced, the player's pack on the right priced (dimmed
"won't buy" where they do not deal), the table between with the merchant's portrait across it, the reasons for the
prices, the lines each way (a minus takes one back), the balance, the haggle's check pill, terms and odds before
trying, then haggle, deal, clear, leave; a deal the player cannot pay for, or the merchant cannot, is refused with
the sum short. `ItemCells` holds the shared cell and stat rows. The walkabout gives its player a kit (the Cistern's
issue worn, a pipe in hand, a worn zip gun, rounds, water, bandages, food, salvage, a lamp, 40 Tolls); townsfolk who keep a
stall have a trade verb (the walker goes over, the table opens with their face); the HUD's pack button opens the pack
on the player's body (`WorldAssets.PlayerM`/`PlayerF`). A panel drawing into a texture repaints only what is marked
dirty, so each draw of the figure marks its image (`PackScreen.DrawFigure`). Captures `ui_pack`, `ui_pack_worn`,
`ui_pack_figure` (the figure's own texture), `ui_barter`, `ui_barter_haggle`. A garment worn over another, both fitted
to the bare body, let the one under it show through in patches (the duster's long cardigan over the shirt) until
P4.10's cloth shader (below). Not yet: item models (the drawings stand until P6.1 brings things to pick up; then an icon bake
renders each model like a portrait), the procedural gear (wraps, goggles, plates), the held weapon and visible chrome
on the figure (P4 follow-ups), the full wardrobe of every garment on the player's bases (a duster on the player's body
is the long cardigan and the cargo trousers; the tank top under it is not built yet), dropping things (with loot).

*As built (P5.3i part 1, 2026-10-29).* Core `Stats.Creation` (an origin from the content — attributes, tags, traits,
a face from its seed and a frame — or someone of the player's own; the standard spread or the old rolled start: roll
as often as wanted, keep one, recall it, then move points within the roll's pool, each attribute between the minimum
and the creation maximum; three tags; up to two traits; name; pronouns; `Missing` as keys, `Finish` to a
`PlayerCharacter` at full health) and `Npc.PlayerLook` (body, face values, height, build, muscle, skin, undertone,
freckles, hair and its colour, eyes, scar, tattoo, dyes by wardrobe slot; saved as the character's appearance; anything
else reads as a default look) with `Looks`, the world's palettes (dull hair colours, eye tints, the scars and tattoos,
re-dyed salvage colours). `CreationTests` (3). `Game.UI.CreationScreen` (opaque): the live figure on the left (the
pack's `Figure`, 720×800, a drag turns it; framed on the face from about 9° above while the face is made, the captured
idle carrying the chin a little high), the pages on paper: who (the origins as cards with their words, someone of your
own, a name field, pronouns), face (another face — `Sculpt.Reroll`, at least 1.6 from the last — and an even one; the
nine groups as chips; each slider writes `FaceSculpt` live), body (body type one or two: the player bases; height
±6 % as the body's scale, the camera stepping back with it; the clothes' dyes as swatches per worn slot), attributes
(the pool, roll, keep, recall, standard; − and + per attribute with its words), skills (twelve to tag with their
values; the traits with their words) and begin (who you are, what is missing, begin). Every word is in the UI table
(`create.*`, `face.*`, `attr.*`, `skill.*`). Captures `ui_create_who`, `ui_create_face`, `ui_create_body`,
`ui_create_attributes`, `ui_create_skills`. Seen close up (P4 follow-ups): the braid's front edge shows as a band on
the scalp, the painted brows are patchy at this size, and a dark gap shows between the neck and the sweater's collar.

*As built (P5.3i part 2, 2026-10-29).* The look in the shaders, on a new Look page framed on the face (skin: lighter or
darker, rosier or warmer, freckles; the hair's colour from `Looks.HairColours`; the eyes'; a scar and a tattoo, or
none). `SecondFace/Skin` gains `_Tone` (darker towards a deep brown, lighter as if out of the sun), `_Undertone`,
`_Freckles` (dots across the nose and cheeks, thinning out), `_Scar` and `_Tattoo` (indices into `Looks.Scars` and
`Looks.Tattoos`), drawn procedurally in the head frame of the web game's skin painter: `WardrobeBuild.RestMap` bakes
each base vertex's rest position in that frame (the eyes at (±0.36, 0.1, 0.88) head radii from the centre; z the face's
way) into a 128×128 half-float texture at the texel of its MakeHuman base index (uv1, as the wardrobe mask), the
vertex reads it, and the fragment draws the marks from it (a healed cut: a ragged soft stroke, paler, pinker and
shinier; a burn: a mottled patch; old ink: blue-black, faded), so they are placed once in 3D and stay on the skin
through every face shape and the animation (`player_f_rest.asset`, `player_m_rest.asset`, 256 KB each; head radius
7.9 / 8.5 cm). `SecondFace/Cloth` gains `_Recolour` (a colour keeping the texture's light and dark round its mean,
`_RecolourLum`, measured by `PeopleMaterials.MeanLum` at build) and `_RecolourIris` (only the saturated, dark texels:
the white of the eye is left alone), and the hair rule's reflection and highlight switches; the player's hair and eyes
now use it. `FaceSculpt.HairColour` greys towards ash with `Aged` (the photograph). `People.LookView.Apply` puts a whole
`PlayerLook` on a body through the renderers' property blocks. Captures `ui_create_look`, `ui_create_look_face`. Seen:
recoloured light, the braid's front edge reads as a tight cap (with the hair choices, part 3).

*As built (P5.3i part 3, 2026-10-29).* The body's build and muscle and the choice of hair. `mh_build` gives the player
bases four more shapes, `body-weight-decr/incr` and `body-muscle-decr/incr`: the whole body as MakeHuman's weight or
muscle macro moves from the base's value (0.3, 0.5) 0.3 down or 0.5 up (`macro_delta`: the summed macro targets at the
two values, differenced); every proxy is refitted to them as to the face's shapes, so the garments and the hair carry
them too and follow the body. Core `Sculpt.Body` lists the two sliders (`Sculpt.All`, for `Shapes` and `Weights`;
the reroll and the distance stay on the face) and `Looks.Shape` adds the look's build and muscle to the face's values
for `FaceSculpt`. The hair: each of the generated forms (`sf_crop`, `sf_bun`, `sf_braid`, `sf_matted`) is exported
alone on each base's rig as `<base>__hair_<form>.fbx` with a `hair` slot in the wardrobe manifest; `Wardrobe.Hair(id)`
wears one (null: the base's own; `buzz`: none, the scalp's painted stubble), the base's own hair goes while a piece or
the buzz is worn, a piece goes under a hat like the own hair; `FaceSculpt` recolours a piece like the own hair.
`Looks.Hair` and `Looks.OwnHair` (crop for body two, braid for body one: the look stores null for a base's own).
`sf_matted` (hairgen v16) was made for under a wrap and left a bare crown alone: it now lies pushed back over the scalp
(the shell and 34 locks from the hairline), then hangs with the low locks from the back and sides (4.4 K triangles
under the 6 K cap). The creation screen: build ("leaner or heavier") and muscle ("softer or harder worked") on the
Body page, the five hairs as chips on the Look page; `Figure.Look` puts a look on and re-layers (a hair piece put on
after the figure was layered stayed out of the studio's camera). Captures `ui_create_body`, `ui_create_look`, and per
hair and body `ui_create_hair_<f|m>_<form>` (sheet `docs/evidence/unity/p5/ui_create_hair.jpg`).

*As built (P5.3j, 2026-10-29).* The app now starts at a title and plays a game of the player's own. Core
`Save.Settings` (text scale of 0.9 / 1 / 1.15 / 1.3, high contrast, turn speed 0.5–2 and its direction, difficulty
story / normal / hard as enemy hit and damage modifiers only, combat speed, skip heard lines, tips, autosave; parsed
leniently, every value clamped to an offered one; kept under the `settings` key beside the slots) and
`State.WorldSpot` on `GameState.Spot` (the walker's position and facing, the camera's yaw, pitch and distance; null on
a new game). `Game.Play.Session`: the slots (`auto`, `quick`, `slot1`–`slot3`) as JSON files in
`persistentDataPath/saves` through Core `SaveManager`, a 512×288 JPEG of the game camera per slot (a render request,
no UI in it), the settings with a change event. `Walkabout.Begin(state)` plays a game: the walker is set down at its
spot or the town's spawn once the ground round it is in, in the player's own body (`People.PlayerBody`: the look's
base, their own clothes in creation's dyes under what is equipped, the look at its height; the pack's figure and
creation use the same), and again at once on a load while walking; `Snapshot` writes the spot, the hour and the time
played for a save; `End` leaves the game. `OrbitRig.View` (the camera at a view at once: `Snap` alone resets the yaw to
the rig's goal, so the walkabout's old `Rig.Yaw = yaw + 20` never took), `Follow` and the settings' `TurnSpeed` and
`InvertTurn`. `Bootstrap`: content, then the title over the world coming in (`TitleScreen`: the name on a dark band,
continue with the last save's person, place and day, new game, load, settings; the world's progress under them);
new game is character creation, whose begin starts the game (saved to the auto slot two frames after the walker is set
down, and whenever the app goes to the background); load and continue read a slot and begin it; the HUD's new menu
button and the back gesture on the open world open `PauseScreen` (time stops while it and the screens from it are open:
back to it, save, load, settings, to the title, which saves to the auto slot first); `SavesScreen` (a card per slot
with its picture, the person, place and day, time played and when saved; loading lists the filled slots, saving the
quick slot and the three by hand, a used one after `ConfirmScreen`); `SettingsScreen` (chips on creation's paper:
words, camera, play). Text size: every font size of the theme is a variable (`--fs-16` … `--fs-72`) and a class on
the root (`sf-text-0`…`3`, `UIService.Present`) redefines them all, so a size re-sets every word on screen at once;
`sf-contrast` darkens the soft inks and the plates. Skip heard lines sets `DialoguePanel.HeardWhole`. Tests:
`UiTests.TitleSettingsSavesAndPause` (title, settings applied and kept and read again, load, save to an empty and over
a used slot, pause stops time), `BootTests` through the title and creation (the walker is the person made, dressed;
the auto slot written) and `TheGameSavesLoadsAndPauses` (saved with a picture, walked on, loaded: back within 0.6 m,
the camera as it was, the state the saved one; a save from the pause; to the title and continue). Captures `ui_title`,
`ui_settings`, `ui_settings_large`, `ui_saves_load`, `ui_saves`, `ui_saves_overwrite`, `ui_pause`, and
`walkabout_player.jpg` (the walker in the player's own body). Not yet: the quality tier as a setting (with Adaptive
Performance, P6.7), the tips and the combat settings' effect (with the tips and the fights), remapped keys and the pad
(3l), autosave on entering a place (with places to enter, P6), the camp screen (with P6's systems).

*As built (P5.3l, 2026-10-29).* Photo mode and the gamepad. The people pipeline's expression list named MakeHuman
units that do not exist (`mouth-smile`, `brow-down`, …), so only the blinks, wide eyes and open mouth were baked; it
now names the real ones (squints, brows down, up and inner up, the corner puller and depression of the mouth, pressed
and parted lips, the upper lip raised, the nose's wings) and the player bases carry 20 expression units (89 shapes);
the cast keeps its five until it is next rebuilt. Core `Npc.Expressions`: eight faces as unit weights (still, half a
smile, a grin, hard, wary, worn out, a sneer, a squint against the sun); `People.FaceExpression.Set` puts one on every
renderer carrying the units. `Play.PhotoMode`: time scale 0 and the clock held (the sky re-lit on demand: it refreshes
on game time), the brain on unscaled time, the rig's limits loosened (`OrbitRig.Limit`: pitch 5–85°, 1.2–30 m, 12 m of
pan; `Unlimit` after), a lens of 15–60° (`OrbitRig.FieldOfView`), the look at the chest or the eyes (from the head
bone), the hour, the face, a frame (the screen's, a wide 2.39:1, an upright 4:5, a square); `Take` renders the game
camera at 2560 px across, crops it to the frame and keeps a JPEG (q95) in `persistentDataPath/Photos`, and on Android
hands it to the phone's gallery (MediaStore through JNI; untested off the device); `End` restores the hour, the face,
the camera, the touches and time. `UI.PhotoScreen`: the controls on a narrow plate (scrolling when short), the frame's
crop as dark bands, take, hide (a show button stays), done; touches on the view only move the camera
(`TouchInput.CameraOnly`). Opened from the pause or P. `Play.PadInput` (BUILD_PLAN §6.F): the left stick or WASD walks
the way the camera looks (`Walker.Steer`: the NavMesh agent's velocity, a jog at full tilt, turning that way), the right
stick turns the camera (`OrbitRig.Turn`, at the settings' speed and direction), the triggers or R/F zoom, the bumpers
or Q/E turn the view 90°, south or Space acts on the nearest person or thing ahead (the radial,
`Walkabout.ActNearest`), north/I the pack, west/M the map, view/Tab the notebook, start the pause (and out of it, and
out of photo mode), P photo mode, F5/F9 quicksave and quickload (said on the HUD, `Hud.Note`); with a screen open the
pad is the interface's: `UIService` focuses a screen's first button when a pad is connected, and every button kind has
its own focus colour. Tests: `UiTests.PhotoControlsAndFrames`, `BootTests.PhotoModeAndThePad` (the world stops, the sun
moves with the hour, a face's units set, a picture kept at full width and an upright one cropped to 4:5, all restored;
the stick walks the way the camera looks and stops, the camera turns, a quarter turn, act opens the radial beside
someone, start pauses and unpauses, a virtual pad focuses the pause's first choice, a quicksave said on the HUD).
Evidence `ui_photo.jpg`, `ui_photo_upright.jpg`, `photo_face.jpg`, `photo_upright.jpg` (pictures photo mode kept). Not
yet: remapping keys and buttons (with the settings once there are enough actions to map), depth of field in the photo,
a gallery screen in the game, the cast's expressions (with its next rebuild), faces in conversation (with P6).

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

*As built (P6.1 part 1, 2026-10-29).* The town's things. Core `World.Containers` (port of game.ts): a locked container
takes a Locks check (`Checks.SkillCheck` on `security`, two minutes a try; picked, it stays open by the flag
`unlocked:<place>/<id>` and is worth 10 + half the lock in XP), the first opening fills it from the map's
`ContainerDef` (items and Tolls) into `GameState.Containers["<place>/<id>"]`, where what is left stays; `Move` and
`MoveAll` carry stacks and Tolls between inventories (`ContainersTests`, 2). `Walkabout.Equip` makes the place's
`container` and `talk` markers interactables (open; look) from the map's `Containers` and `Talk`; `Use` walks the
walker over (up to 30 s; out of `Reach`, 2.5 m, it says so) and faces it, then `OpenContainer` (the lock's result said
on the HUD through `Walkabout.Said` → `Hud.Note`) opens `UI.LootScreen` (barter's pages: the container's drawn cells
beside the pack's, a tap moves a whole stack either way, take all, the weight carried) and `LookAt` begins the prop's
conversation (no faces, its name as the speaker). A new radial verb and icon, open. Tests: `UiTests.LootTakesAndPuts`,
`BootTests.TheTownsThingsOpenAndSpeak` (the water crate walked to and emptied and empty the next time; the militia
locker's lock holds against a new character, said on the HUD, two minutes gone; the pumps' conversation). Evidence
`docs/evidence/unity/p6/ui_loot.jpg`, `ui_loot_taken.jpg`. Not yet (part 2): things dropped on the ground and the
search of the fallen (with combat), a share of a stack (a long press), owners and witnesses for what is taken (with
stealth, P6.3), beds, benches and the camp at a fire (the camp screen), doors that lock.

*As built (P6.1 part 2a, 2026-10-29).* The camp. Core `World.Camp` (port of ui/camp.ts): `Rest` (water each time and,
for six hours or more, food, each missing halving the healing; the party heals too), `UntilNext` (by day until seven in
the evening, at night until six in the morning), `Cook` (half an hour), `Mend` (a repair kit, an hour, +35 %), `Hunt`
(Core `Hunting`, by Survival, the land's game and the hour), snares (`SetTraps`, `CheckTraps`; a wire and a scrap; kept
in `WorldState.Traps` under the place's map or, out on the land, under `WildSpot`, the 200 m square they were set in),
`WildGame` (the open land's game by biome, from the wet north at 0.6 to the megacity's ground at 0.05), `Supplies`,
`HealAll` (the content's `heal` event); `CampTests` (3). Core `PlacePlan` now marks every `campfire` and `fire_barrel`
prop with a `fire` marker (its id, or `fire_<x>_<y>`; Shale has four; `PlacePlanTests`), so the place prefabs were rebuilt.
`Walkabout.Equip` makes the fires interactables (verb camp, a flame icon); `OpenCamp(force)` makes camp out of doors
anywhere and indoors only within reach of a fire (`Indoors` from `PlaceInteriors.Inside`, `NearFire`), or anywhere when
forced (a fire, a bed of one's own); in a place its map gives the game, the snares' key and whether a caravan takes
letters (`settlement`), out on the land the biome under the walker (`ControlMap.Sample`). `UI.CampScreen`: a page of
the notebook on the right with the world (the walker at the fire) on the left; time stands still while it is open and
each thing done reads the world clock into the game first and hands it back after (`CampModel.Now`/`Then`: the
`TimeService`, the sky re-lit, the quests updated); rest (an hour, four, a night, until evening or morning), talk to the
party (none yet in the walkabout), hunt and snares, cook, mend, write (the letters `Letters.Available` offers, sent
with `Letters.Send`), each saying what came of it in red under the heading. The walkabout's `QuestEngine` now has an
outer host (`Walkabout.Host`): the content's events reach the world: `camp` (after the conversation closes), `barter`
(with whoever is being talked to), `heal`; the rest go out on `Walkabout.Asked` (the bootstrap opens the map for `map`;
`fight`, `surgery`, `dust`, `reverie` and `goto` wait for their systems). A camp button on the HUD after the pack, the
d-pad's down and K. `Walkabout.Here` (the nearest place) now serves the saves' place names too. Tests:
`UiTests.CampRestsCooksMendsAndWrites`, `UiTests.HudSitsInTheSafeAreaAndIsCaptured` (the camp button),
`BootTests.TheWalkerMakesCamp` (walked to Shale's nearest fire, four hours on the world's clock, camp under the open
sky from the HUD, the rented room's conversation makes camp). Evidence `docs/evidence/unity/p6/ui_camp.jpg`,
`ui_camp_done.jpg`, `ui_camp_write.jpg`, `walkabout_camp.jpg`, `p5/ui_hud.jpg`. Not yet: fires that burn (a flame and
a flickering light at every fire prop, with the props' pass), a camp camera (lower and closer on the walker at the fire),
companions at the fire (with the party, P7).

*As built (P6.1 part 2b, 2026-10-29).* Things on the ground. Core `World.Ground` (port of game.ts's ground piles, in
world metres): a pile is a container in `GameState.Containers` under `ground:<x>_<y>_<z>` (decimetres; saved with the
game), `Drop` puts some of a carried stack in the pile within 1.5 m on the same floor or a new one, `Piles` lists those
with something in them, `Tidy` takes the empty ones away (`GroundTests`: where it lies, joining, a floor apart, saved
and parsed back, emptied). `Play.GroundPiles` lays a bundle where each pile lies (one procedural mesh, a lumpy sack
gathered and tied at the neck, the library's burlap darkened as if oiled and road-dirty, since undyed sacking is the
desert's own colour; settled by a ray on whatever is under it; turned and sized by its key), a tap's take: the
walkabout walks over and the walker stoops (`Walker.PickUp`: the captured pickup, CMU 26_09, a new base-layer state in
the locomotion controller, v6, played from 0.7 s in at 1.4 times; the loot screen opens as the hands reach the ground)
and the pile opens on the loot screen ("On the ground"); emptied, the bundle goes (`LootModel.Done`). The pack drops
(`PackModel.Drop`, `Walkabout.Drop`: at the walker's feet, a little ahead): drop one or drop all; keys and papers are
kept; with no world under the pack (creation), nothing is offered. The controller also holds the sits (sit,
sit_stool, sit_ground) for part 2c. Tests: `GroundTests`, `UiTests.PackDropsWhatIsCarried`,
`BootTests.ThingsDroppedLieOnTheGround` (the kit's water dropped, its bundle at the feet and on the ground, walked back
to, stooped for, taken; the bundle and the pile gone). Evidence `docs/evidence/unity/p6/walkabout_ground.jpg`. Not yet:
a share of a stack by a long press (drop one or all for now), item models instead of the bundle for a single big
thing (with the item models), the search of the fallen (with combat).

*As built (P6.1 part 2c, 2026-10-29).* Sitting. Core `PlacePlan` marks every chair with a `seat` marker (its id or
`seat_<x>_<y>`, the chair's yaw; Shale has eleven; `PlacePlanTests`). `Walkabout.Equip` makes them interactables (verb
sit, a chair icon); `Use` walks the walker to the chair's front (0.75 m out along -z at its yaw, where the furnish kit
puts a seat's front) and `Walker.Sit("sit", seat, yaw + 180)` turns and lowers the body over the seat on the floor the
walker stands on (a place's markers lie at its ground; a room's floor is higher): the agent holds still
(`updatePosition` off), the body moves over 0.6 s on unscaled time as the controller cross-fades to the captured sit,
foot planting is off (the humanoid IK is full-body: feet held to a floor would pull the hips off the seat); any walk
(`GoTo`, `Steer`) gets up first, back to where it sat down from (`Walker.Footing`, also what a save keeps). Camp sits the
walker on the ground (`sit_ground`) facing the fire within reach, the animator on unscaled time while the camp stops the
world, and gets up when camp is broken; a bed of one's own (camp forced indoors with no fire) is not sat by. The
walker's animator now always animates (it was `CullUpdateTransforms`: in batch tests no renderer is ever visible, so a
culled body kept a stale walking pose and every sit measured the same hips height). Tests:
`BootTests.TheWalkerSitsOnAChair` (Shale's eleven chairs; the nearest walked to and sat on: the hips 0.47 m over the
floor, a foot on it, facing out; a walk gets them up where they sat down from), `BootTests.TheWalkerMakesCamp` (sat on the
ground at the fire facing it, hips 0.13 m; up when camp is broken). Evidence `docs/evidence/unity/p6/walkabout_sit.jpg`,
`walkabout_camp.jpg`. Not yet: stools and benches as seats (none in the content yet besides the market bench stall),
lying down in a bed, the townsfolk sitting at their schedules' seats (P6.2), doors that lock (with the door models).

*As built (P6.2 part 1, 2026-10-29).* Shale keeps its hours. Core `Npc.Routine` (port of game.ts updateSchedules):
the placement's own schedule else the person's, the entry in force at an hour (`Schedule.At`, the hour wrapped),
`Hidden` (away, or asleep: gone in at home), `Male(look)` (a beard says a man, else a broad frame) and `Assign` (each
person a cast body of their sex and nearest age, each body once while any of that sex are left; a matching role breaks
near ties). `PlacePlan.TileCentre` puts an entry's map tile in the place's metres. `WorldAssets.Cast` lists the whole
32-person cast (id, prefab, sex, age, role) from `tools/unity/people/briefs/cast.json` (`WorldAssetsBuild`; every cast
prefab in `Prefabs/people`). `Walkabout.Populate` brings every Shale placement whose condition holds (18 in a new game),
each in its assigned body (18 bodies), and hands them to `Play/Townsfolk`: twice a second each person's entry for the
world clock's hour sends their `NavMeshAgent` (radius 0.28, 1.25 m/s) to the entry's `spot` marker or tile; a drinker,
a trader, a worker and a patrol each get their own mix of gestures (`Ambient.Pool`), a patrol takes turns a few metres
about its post; asleep they walk home and go in (out of sight until the routine wakes them, then they come out where
they went in); away they are gone; a clock jump of more than half an hour (a rest, a load) puts everyone where the hour
has them at once. Anyone talked to or traded with is held still (`Townsperson.Held`, set while the conversation
runs). A path that ends short (partial) is not asked again until the routine sends them elsewhere. Doors are 1.3 m (the
kit's 1.1 m leaf scaled to fit: two people pass in a doorway, and a 0.3 m agent clears it with room). The world's
NavMesh now drops every place's own mesh when it comes (`PlaceNav.DropAll`): Shale loads while the walker waits, built
its own mesh, and the two never joined, so no path from the street reached a room (the player could not walk into the
sheriff's office either). Tests: `RoutineTests` (Shale's routines, every spot they name, bodies by sex and age),
`BootTests.ShaleKeepsItsHours` (each person in a body of their sex; a way in from the street to the sheriff's desk;
noon: the sheriff at her desk, the factor at his counter; 23:30: the sheriff gone in to sleep, the factor away, the
barkeep at the bar, 5 of 18 about; at nine the sheriff walks from her patrol to her desk; held, she stays as the hours
turn, released she is off to her evening). Evidence `docs/evidence/unity/p6/walkabout_town_noon.jpg`,
`walkabout_town_night.jpg`. Not yet: the townsfolk sitting at their routines' seats and sleeping in their beds (seats
and beds with owners), the other places' people (part 2: actors as data when far, agents within 120 m, full actors
within 60 m, the cast loaded per region), crowds yielding to the walker, doors that open for whoever walks through.

*As built (P6.2 part 2, 2026-10-29).* The world's people by distance. `Play/PeopleService` (§4.2's `PeopleService`)
hears `PlaceSpawner.Shown` and `Dropping` (new events; `Standing()` lists the places in): each place that comes brings
its people as data (`Resident`: the placement whose condition holds, its map, its cast body by `Routine.Assign`, its
post) and a `Townsfolk` of its own (spots by map: Cistern 9's shelter people keep the shelter's spots). Four times a
second the service looks at everyone: someone without a body whose routine has them about (not asleep, not away)
within `Near` (120 m, flat) of the walker gets one, the nearest first and two a frame at most (an instantiation costs a
few milliseconds on a phone), put where the hour has them; a body beyond `Leave` (140 m) goes and the data stays
(nobody held goes); within `Full` (60 m) a person is seen in full (gestures, gaze, foot planting, low-quality
avoidance), further off only the animator runs, and only while seen (`CullCompletely`). A place taken away takes its
people's bodies and data with it; a game begun or loaded brings every standing place's people again (conditions may
differ). Bodies stand under their place's people group, not the place (a place hides its own surface under the
ground). The walkabout equips each place's things as it comes (containers keyed by the map they belong to), and while a
load sets the walker down far off, the world streams round where they are going (the per-frame focus on the old walker
fought the load's). Tests: `BootTests.PeopleComeAndGoWithTheWalker` (Shale's 18 all stand from the plaza; with `Full`
at 10 m only the near are in full and the far have no gestures; with `Near` 25 m and `Leave` 35 m the far bodies go and
all 18 remain as data, back when the radii are; set down at Cistern 9's mouth 770 m off, Shale stands with none of its
people in the world, the shelter's people stand, each in a body of their sex; set down among them in the shelter, they
are seen in full), `ShaleKeepsItsHours` (now from the plaza). Evidence `docs/evidence/unity/p6/walkabout_people_shelter.jpg`.
Not yet: the cast loaded per region (all 32 bodies are referenced by `WorldAssets`; with more places, Addressables per
region), the people of places not built yet (only Shale and Cistern 9 are), people on the roads between places.

*As built (P6.3 part 1, 2026-10-29).* Stealth on light. Core `World.Stealth`: the light on a body (0..1: the sky's key
light, sun or moon, over the noon sun's 2.5 unless under a roof, the sky's ambient luminance, the lamps in range, each
falling to nothing at its range), the exposure (a sneak shows 0.55, a Stealth of 100 shows 0.6 of an untrained body, a
run 1.25), the sight range at that exposure (2.5 m in the dark to ~25 m in the sun, more with Senses), the noise (still
nothing; a sneak 1.6 m, less with practice; a walk 4.5 m; a run 10 m) and an observer's awareness step (rising while
seen, faster near and at the middle of the eye, half at its edge to 85°, nothing behind; rising while heard; fading
0.12 a second; wary at 0.35, seen at 1.0); `StealthTests`. Game: the locomotion controller (v7) has a `sneak` state, the
captured crouched walk (CMU 136_09: the hips 13 cm lower in the walker) played at `SneakRate` (speed over the clip's
0.85 m/s: still, held in the crouch), to and from the locomotion on the Bool `Sneak`; `Walker.Sneak` goes into it at
the clip's pace (taps and the stick alike). `Play/Watchers` looks five times a second: the light on the walker (the
sky's look; indoors or underground no key light; the place lamps), their exposure and noise, then everyone standing
within 30 m: the angle from where they face, the line of sight (the NavMesh unbroken between them: walls cut it; on
the same floor), their Senses (content `attrs.senses`, else 4); someone wary turns their head to the walker (`Gaze`),
someone who has seen them is told (`Noticed`: while sneaking, the HUD says "Someone has seen you."). The HUD has a sneak
button (lit while sneaking; also Ctrl, and the pad's left stick pressed) and an eye at the top that fills with the most
aware one's awareness, ochre when wary, red when seen. And a fix found here: the world's sun was whatever light
`FindAnyObjectByType` found first, since the portraits' pre-warm the studio's disabled fill light, so the sky turned a
dead light while the Boot scene's own stayed at noon round the clock (every walkabout night was day), and the sky made a
default sun of its own in `Awake` (before the stage handed it one) that was left burning sideways at full strength; the
stage now takes the scene's enabled directional light, never the studio's, and puts out a second one, and the sky makes
its own sun only at its first look if none was handed over (the test checks one sun, the sky's, at the moon's strength
at night). The HUD's capture shows the sneak button and the eye (`docs/evidence/unity/p5/ui_hud.jpg`). Test
`BootTests.TheWalkerSneaksPastInTheDark` (by day walking up in front: light 0.89, seen; the sneak: hips 0.75 → 0.62 m,
the button lit, the eye shown; at night behind them: light 0.12, unaware; in front six metres off: unaware; close in
front: seen, the eye red). Evidence `docs/evidence/unity/p6/walkabout_sneak.jpg` (moonlight). Not yet: shade from walls
and props outdoors by a shadow ray (the places have no colliders: with combat's cover, P6.4), noise by the ground's
surface, sight cones drawn while sneaking, crowds hiding the walker, disguises and papers, pickpocketing and owners and
witnesses for what is taken (part 2), a crouched idle of its own (the sneak's first frame holds for now).

*As built (P6.3 part 2, 2026-10-29).* Owners and witnesses. Core `World.Owners`: a container belongs to whoever keeps
its room (the one who sleeps there first, else who works or trades there, else who is placed there; visitors keep
nothing; in the open, or in a room nobody keeps, nobody's); `Owners.Now` makes it the player's while its content's
`yoursIf` holds (new optional content field, `src/engine/data/types.ts` `ContainerDef.yoursIf`; Shale's back-room
locker is the player's once `shale_room` is set). Shale: the bar's shelf and the back room's locker are the barkeep's,
the militia's locker the sheriff's, the toll crate the factor's, the mender's shelf the mender's, the pump house's shelf
its keeper's, a household crate its household's. Core `World.Theft.Taken`: unseen, the owner finds it gone (a memory,
no suspect, no word); seen, each witness remembers it and trusts the player 10 less, the owner 25 less if they saw
(15 if told), and news about the player goes round the settlement and on along its roads (size by the worth taken),
which `Frontier.Standing` reads. The loot screen says whose a thing is and who can see the player as it opens (anyone
whose awareness has reached seen), and its take-all says steal; closing it with something taken records the theft and
the HUD says who saw. Tests `TheftTests`, `BootTests.ATheftSeenIsATheftKnown` (the barkeep's shelf: unseen, no word and
no blame; seen by her, her trust −25 and the town's standing −7). Not yet: the steal verb on people (pickpocketing),
consequences in person (the owner confronting the player, the militia), the owner's memory read by dialogue.

### P7 — Chapter One on the phone
The opening through the stranger's map, end to end on device, at the standard: every scene, conversation, check
and reward of Chapter One works from the content, saved and resumed.
**The new opening first (owner's note, 2026-10-29, binding; rules in `docs/OPENINGS.md`, design in `story/` §18).**
The player character no longer starts inside the shelter: they have a home in the Reach, a trade and people of their
own. Before the chapter is built on the phone its content is rewritten in `src/content` (and exported): (1) the home
place as a map with its people (looks, routines, functions), the day's chores as quests, each teaching one system for
one person (barter, talk and checks, scavenging and the pack, sneaking, a first fight, mechanics or snares, the camp,
the notebook); (2) the night and the morning after as quests, with the opening's echoing choice; (3) the four origins
reframed as trades of that home, their threads kept; (4) Shale's trace, the letters-home line and the companions'
entries adjusted to match; (5) the old shelter opening's content retired. Tests: a route test per origin through the
opening; the content validator; the Chapter One playtest script. A playtest script (PlayMode, fixture-driven)
runs the whole chapter headless and asserts the quest states; the owner plays it on the phone.

### P8 — Act 1 and the megacity on device
All Act 1 and the existing Act 2 districts: places built from their layouts, the cast dressed and scheduled, the
systems exercised. The headless playtest scripts cover every quest line in `src/content/quests`.

### How the story is written from P9 on (applies to P9–P12)
- **Content stays data in `src/content/`** (typed TS modules, neutral ids), validated by `npm run check` and
  exported to Unity by `npm run export`; the web runtime is not extended (owner: no new web features), so a slice
  that needs a new mechanic adds its schema to the TS content types and the validator, and its runtime only in
  `SecondFace.Core` (rules, with EditMode tests) and `SecondFace.Game` (presentation). The web game will not play
  the new slices; it is not meant to.
- **Story truth stays in `story/`** (spoiler rule, CLAUDE.md §1): each slice's beats are planned in
  `story/STORY_PLAN_SECRET.md` before its content is written; this plan, PROGRESS.md and commit messages name a
  slice by its id and its places only, never by what happens in it.
- **Each slice ends playable on device**: its places built in the one world (P3's `PlaceBuilder`, no new scene per
  place), its cast through the people pipeline (P4: generated variety, the wardrobe and hair rules), a headless
  playtest script per quest line asserting the quest states, the capture set of its places judged by §6.N, and the
  frame time on the Mid tier inside budget. A slice is never "content done, presentation later".
- **Economy and pacing are watched per slice**: each slice records its rewards, prices and playtime estimate in
  the pacing table (P13 sums them); scarcity early, rewarding later (DESIGN §Economy); no time limits of any kind.

### P9 — Names, conversation and characters (U6, U7, U8)
Before any new line of content, so it is written once to these rules.
1. **U6 naming.** A naming bible in `docs/DESIGN_UNITY.md` (how this world names its places, people, factions,
   things and events: found names, worn-down words, no "the [noun]"); a rename pass over existing content, docs and
   UI strings; neutral ids unchanged, so saves, tests and quest states survive. A validator rule rejects names that
   break the bible's mechanical checks (the article-noun pattern, banned words).
2. **U7 conversation system** in `SecondFace.Core.Dialogue`: topic memory (what has been said to whom), topic
   exhaustion (a spent topic closes or changes, it never re-opens the same lines), greetings from state (time,
   weather, news, the last meeting, the companions present, local reputation), companion interjections, rationed
   exposition (one fact per beat, the rest on asking); EditMode tests prove no tree can loop to a line it has
   already shown unless the line is marked as a repeatable service (trade, travel). Then a pass over every existing
   tree in `src/content/dialogue` to the new rules; the validator flags trees that still loop.
3. **U8 characters and relationships.** A motive bible per named character in `story/` (what they want, what they
   fear, what they will not do, what changes them); relationship arcs per companion with stages, approval that
   moves for reasons the player can see, conflicts between companions; romances per genre best practice (opt-in,
   consent-forward, companion-specific, able to fail, never a reward for gifts); the existing companions rewritten to
   their bibles. Tests: each arc reachable and each failure state reachable in the headless playtests.

### P10 — Act 2 completed (B3.11, B3.12, B4, B5)
The rest of the megacity and the Act 2 wilds, slice by slice in this order: **B3.11** (the archive and the court:
the court is a new mechanic, a trial as dialogue with evidence and precedent flags, in Core); **B3.12** (the ruined
outer ring and the races; the megacity end-to-end playtest); **B4** (the arcology and the districts beneath it, the
seventh companion); **B5** (the Act 2 wilds: the flats, the rail corridor, the drowned shore, the mines, the northern
wet, the ashlands, and the act's alliance). The PROGRESS.md Phase B list holds each slice's place list and estimate;
each is one or more P10 steps of the size rule (≤ ~1 hour per commit), ending playable on device as above. The
world's chunk map grows with each slice (one streamed world, no loading screens).

### P11 — Act 3 and the endings (B6)
The final act and the finale, every ending and its modifiers, and the epilogue (illustrated slides at the standard,
rendered in the engine from the world's own places and the player's own face). Every ending reachable from a save
before the point of no return, each covered by a headless playtest script; the endings read the player's choices
across the whole game (flags, local reputations, companions' states), never a global karma.

### P12 — Systemic depth (B7)
What makes the open world dense between the story's beats: ruins templates (procedural interiors from authored
rooms, salvage tables by region), bounty and gig templates (generated from the factions and places, local
reputation as their reward), rare encounters (authored, one-off, region-bound), activities by region (P6/P8's fight
pits, hunting, dives and heists extended to the Act 2 regions); music and ambience per region and state; title art,
menus, credits, settings, tips. Each template is Core data with tests (a generated gig is always completable, its
reward inside the region's band).

### P13 — Release hardening (B8) = v1
Balance: the economy simulation (A2.4) over the whole game, the pacing table summed (the 60-hour single playthrough
checked against it and against the owner's play), difficulty settings. Then the release: save migrations from the
first public build onwards; crash reporting (Cloud Diagnostics); the AAB with asset packs if the APK passes 150 MB;
signing (owner's keystore via secrets); store listing assets; the accessibility pass (text scale, colour-blind
palettes for the combat UI, touch targets); the final profiler pass on the Floor tier; the v1 tag.

---

## 6. Prescriptive specifications for the hard parts

### 6.A World: streaming, terrain, places, Addressables

**A.1 Coordinates and chunks.** World space is metres, Y up, origin at the south-west corner of the 24 × 16 km
world (DESIGN_UNITY §3). Chunks are 512 × 512 m, indexed `(cx, cz)`, 47 × 32 of them. Unity's float precision
is fine for 24 km at the camera's scale (positions ≤ 24 000 → ~2 mm precision); do **not** add floating-origin
shifting in v1 (it complicates saves and NavMesh); re-evaluate only if jitter is seen.

**A.2 Control map (built 2026-10-29).** `python3 tools/unity/world.py [--preview <png>]` reads the content export
(`StreamingAssets/content/{regions,world_map,sites,maps}.json`) and writes `StreamingAssets/world/`:
- `control.bin` (runtime): `'SFCM'`, version 1, width, height, metres per texel (int32 LE), then RGBA uint16 LE per
  texel, rows south → north; 376 × 251 texels, 64 m apart, texel (0,0) at the world origin, the last row and column
  on the far edges. R base height (0..1 → −50..550 m; sea level 0), G roughness, B biome index × 4096, A water.
  Read by Core `ControlMap` (bilinear; the biome is the nearest texel's). `control.png` is the same data as a 16-bit
  RGBA PNG for looking at and editing (hand edits need a PNG → bin step in world.py when the first edit is made).
- The fiction's 700 × 500 km map becomes the world at **32 m per km**, centred in x (x = 800 + 32·km_x,
  z = 32·(500 − km_y)): Shale to Cistern 9 is ~850 m, Shale to Tollhouse ~2.2 km. Regions keep their base height and
  roughness (`LAND` in world.py) and blend over 1.6 km at their borders; borders wander by ~1 km (a smooth domain
  warp) except near places, so every place stands on its own region's ground. The Teeth climb 260 m more inside their
  bounds. A ragged coast and the sea run along the west; the Wet's river runs past the timber town, the dam and the
  river landing (all on its east bank) and along the city's north side to the sea.
- `places.json`: every world-map location and Meridian's districts (placed side by side per `sites.json`):
  centre, size (a web map's layout at 2 m a tile, provisional until `PlaceBuilder`; 160/96/48 m by kind when no map
  is built yet), elevation (base ground + 0.5 m), entry yaw (the first road out), region, biome, map, hidden,
  offshore (the rigs stand in the sea). `roads.json`: roads and tracks from the world map's routes (meandering
  polylines, widths by surface: road 8 m, track 5, rough 3, glass 5, marsh 4, mountain 5), the Line as rail (6 m) and
  the river (110 m). Core `WorldLayout` reads both; `WorldMapTests` check the files (every place on dry ground of
  its own region, places do not overlap, roads start at their places). Game `WorldService` loads all three from
  StreamingAssets (UnityWebRequest inside the APK) and answers the chunks wanted around its focus.

**A.3 Runtime terrain (built 2026-10-29).** Core `TerrainGen` (pure C#, deterministic, run on a worker thread;
`ChunkTerrain.Prepare` wraps it in a `Task`, `ChunkTerrain.Build` makes the `TerrainData` on the main thread with
one `SetHeights` and one `SetAlphamaps`): a chunk is 257² samples, 2 m apart, in metres above sea level. Natural
ground = base height + roughness × 120 m × fbm (6 octaves from 1/900 m) + the relief styles of `style.bin`
(`world.py` writes it on the control grid, blended across region borders: **ridges** 110 m ridged at 1/600 m + 25 m
at 1/130 m; **dunes** 5 m ridged, stretched across the west wind; **mesas** 22 m plateaus with cliff sides where a
slow noise crosses a threshold; **craters**) + ripples (0.6 m × (0.25 + roughness) at 14 m). The spec's flat
"ridged × steep mask" gave the Teeth 63 m of relief per chunk and slopes mostly under 21°, and the Sallow 9 m: hills
and a plate, not mountains and a desert at the iso camera's scale. Roads are levelled across their width to the ground
under their centreline, smoothed over 30 m along it, with a 20 m shoulder (12 m made every cut through 5 m dunes steep enough to paint as cliff; levelling to a straight line between
far-apart points cut walls into the mountains); rivers sink 3 m with an 8 m ramp; the control map's water lowers the
ground 3 m. Two talus passes (38°) over the interior; the edge rows stay exact, so chunks meet without a seam
(tested). Places: `TerrainGen.Pad(place)` = the mean natural ground over the footprint + 0.3 m (never below the sea),
falloff wide enough for ≤ ~35° (24–160 m): a place on a mountainside sits in a cut, not a pit; places.json's
elevation is only the control map's estimate. Measured: heights + paint 350–800 ms a chunk in the editor (a worker
thread; the walker crosses 512 m in minutes); port the inner loops to Burst if the phone measurement (P3.7) or fast
travel needs it.

**Surfaces (built 2026-10-29, step 17).** Paint: Core `TerrainPaint.Paint` returns a chunk's layer keys (≤ 8, most
weight first) and their weights per 2 m texel. Each biome names four library keys by role (base, patches, accent,
steep: `Palettes`) and an accent rule (`AccentRule`: "high" puts the Teeth's accent, snow, above `SnowLine` 330 m with
a noisy edge; otherwise the accent lies in low washes and near water). A point's biome weights come from the control
map at the point (weight 2) and on a jittered ring 48 m out (six samples), so borders are soft and wander instead of
stepping at 64 m; each biome's role weights go to its own keys and a chunk paints with the union of the keys that reach
it: four inside a biome (a fast path skips the ring when no other biome is within reach), more on a border, where the
URP terrain draws layers five to eight in a second pass. The same point paints the same from either chunk: the mean
weight step across a biome-border chunk edge is 0.019 (tested). Patches are 40 m noise shapes with 8 m raggedness on a
narrow transition; steep is slope over ~24°. Layers: `BiomeLayerSet` maps every palette key to its `TerrainLayer`
(`Layer(key)`); `ChunkTerrain.Apply` sets the chunk's layers and one `SetAlphamaps` (an alpha buffer kept per layer
count). Shader: `SecondFace/Terrain/Lit` (`Assets/SecondFace/Shaders/Terrain/`) is URP 17's Terrain/Lit family copied
with two changes in `SFTerrainLitPasses.hlsl`: each layer's albedo is read twice, the second look turned ~37° at 0.43 of
the scale, mixed by a 23 m world noise near the camera and averaged from 40–130 m on (either look alone repeats as a
grid from mid range); and macro variation (albedo × broad 90 m and fine 17 m world-noise patches, in every pass
including the base map's). Height blending is on (`_TERRAIN_BLEND_HEIGHT`, transition 0.25; URP turns it off on chunks
with more than four layers). Re-copy the four files when URP is upgraded. Textures (tools/unity/assets.py): every
terrain albedo has its blotches larger than a quarter tile taken out at build time (`flatten`: linear light, wrapping,
keeps the fine detail and the mean colour; a half-tile blotch repeats as a grid of spots across a field) and the warm
ones are graded (`GRADE`: saturation, value, tint), so the Sallow is pale straw, not orange, and neighbouring layers
differ by little colour. Sources changed in this step: sand `sandy_gravel_02` (was a pink aerial sand with tyre
tracks), snow `snow_03` (the first two had footprints), rock `cliff_side` (layered sandstone; was a mossy green), new
`stony_ground` (`dry_ground_rocks`) as the Teeth's base. Captures (`WorldTerrainTests`): `world_sallow`, `world_teeth`,
`world_shore`, `world_border`, each `_near` (the game camera at 45 m) and `_mid` (180 m). Still to do: triplanar on
cliffs if stretch shows (it does not at the talus angle), and the device cost of the second albedo look (P3.7).

**Road surfaces (built 2026-10-29, step 17b).** Core `RoadStrips` lays strip meshes on a chunk's levelled ground, one
per surface (`SurfaceOf(kind)`: road → `asphalt`, the Line → `gravel`, marsh → `mud`, everything else → `trail`,
`rocky_trail` graded). A way's polyline is cut into ≤ 2 m pieces from its start; a piece belongs to the chunk holding
its midpoint, so neighbouring chunks share the cross-section where a strip crosses their edge (tested) and nothing is
drawn twice. Four vertices across (outer edges at alpha 0), U across and V along in metres (V restarts at a multiple of
240 m in each chunk: every tile length divides it, so a 15 km road keeps its precision), heights from the chunk's own
heightfield + 5 cm. Built on the worker with the chunk (`ChunkTerrain.Prepare` → `Prepared.Roads`); `ApplyRoads` fills
pooled child meshes of the terrain (`road_<surface>`, no shadow casting; `ChunkTerrain.Hide` turns them off with a
pooled terrain). Shader `SecondFace/Road`: URP PBR with main-light shadows and fog, alpha-blended at queue
Geometry+450; the verge is the vertex alpha broken by the texture's height, old asphalt is eaten away in world-noise
patches (`_Decay` 0.45) where the ground shows; vertices are pulled along the view ray by 4 cm + 0.4 % of the distance,
so the terrain's LOD mesh never swallows a strip far off. Materials `Terrain/Road_<key>.mat` are built with the layers
(`TerrainLayerLibrary`, `BiomeLayerSet.Surface(key)`). The road shoulder is 20 m (12 m made every cut through the
Sallow's 5 m dunes steep enough to paint as cliff). Captures `world_road`, `world_track`. Next for roads: wear (ruts,
verge grass, drifted sand) with scatter (P3.4), bridges and the Line's rails as props (P3.5). Holes under interiors: `TerrainData.SetHoles`
when interiors exist (P3.5).

**A.4 Streaming (built 2026-10-29).** Core `StreamingPolicy` decides, Game `WorldStreamer` executes. Load radius 2
(5 × 5 built), prepare radius 3 (ground computed ahead on worker threads, at most 2 at once), a built terrain dropped
beyond 3 (the band between 2 and 3 stops flicker at borders and caps the terrains at 7 × 7 = 49; the first version
dropped at 4, which let a wandering focus keep 81), computed ground forgotten beyond 4. One chunk write a frame,
nearest the focus first; none after a frame slower than 25 ms. **Terrains are pooled and created ahead**
(`WorldStreamer.Prewarm`, one a frame while the title shows: 49 in 2.9 s in the editor): creating a terrain cost
~90 ms against ~10 ms to re-fill a pooled one (`SetHeights` ~6–10 ms, `SetAlphamaps` ~1 ms, the array copies ~3–5 ms),
and re-activating one ~50 ms, so a pooled terrain stays active and only stops drawing (`drawHeightmap`). Neighbours
are stitched after every write (`SetNeighbors`). Measured in the editor (`WorldStreamingTests`: the focus walks four
chunks east from Shale): chunk writes median 10.5 ms, max 18.9 ms; the streamer's worst frame 21.4 ms. Later steps add
scatter (the frame after its terrain), places within 600 m, interiors within 40 m of a door. **Terrain physics:** the
project lacks the built-in Terrain Physics module, so chunk terrains have no collider yet; add
`com.unity.modules.terrainphysics` when raycasts and walking need it (P5/P6) and measure the collider's cooking cost
then (it may need to be limited to the chunks round the player).

**A.5 Places.** A place is a prefab (`Places/<id>.prefab`, Addressable) built by `PlaceBuilder` from the exported
layout: the kit pieces (walls, floors, roofs, props from `Kits/*`), lights, decals, the NavMesh modifier volumes,
the door triggers with interior ids, the spawn/talk/container/trigger markers from `MapDef`. Interiors are
separate prefabs positioned at their world coordinates under the place (walls with the outside culled by a
`RendererOcclusion` flag when the player is inside). The grid/tile data of the web maps is used only as the
layout source (tile → piece rules in `PlaceBuilder`), never at runtime; Core `Grid` is the interior fallback for
pathing when NavMesh is unavailable.

*As built (2026-10-29, step 20).* Core `PlacePlan` reads a map in world terms (pure, tested by `PlacePlanTests` on
Shale and every authored map): metres about the place's centre, x east, z north, 2 m a tile; walls of 1.3 m and more
are buildings (at least `Storey` 3.1 m: the web maps' 2.4–2.8 m were drawn for a tile view), lower ones fences; the
rock rim (the web map's edge) is dropped. Doorways are one-tile gaps (gates two) in a straight wall line, each side
continuing or ending the line; rooms are what a flood from the edge cannot reach past building walls and doorways; a
gap with no room either side, or as wide as the "room" behind it on two opposite sides, is an alley between houses in
a row, not a door (both found on Shale). Runs of wall split where what lies either side changes (a house wall that is
the saloon's for two metres is outer wall, then partition); exterior walls know their outside; windows are placed by a
hash on outer walls, clear of corners and doors; fences run on into a building wall they meet; inside a room a fence is
a cell's bars. Editor `PlaceBuilder` (menu "Second Face/Build places", and in `AddressablesBuild.Prepare`) makes
`Prefabs/places/<id>.prefab`, Addressable at `places/<id>` in `places-<region>`, listed in `World/PlaceSet.asset`
(`PlaceBuilder.Ids`: Shale so far). Buildings are generated, merged per building into a shell (walls with their
openings cut, floor) and a roof (its own child: an interior opens by hiding it, step 21): trims by material (adobe:
thickened base, cap, timber lintels and sills, vigas through the long walls, canales; brick and concrete: copings,
lintels, sills; timber: corner posts, base, frames; scrap and metal: mismatched sheets on a timber frame), flat roofs
inside the parapet as patched panels, tin gables (timber) and lean-tos (scrap) of sheets of varied width, some slipped,
with overhangs, ridge cap and gable boards. Building surfaces draw with `SecondFace/Weathered` (the library's maps
plus grime and damp from the ground, streaks, broad and small patches, sand on top faces; no extra draws).
Fittings are kit prefabs (plank doors, some ajar about their hinge; shutters; roof clutter); fences the frontier
kit's wire fence; props by kind from the frontier, shelter, nature and the new furnishing kit
(`tools/unity/kits/furnish.py`: counter, table, chair, bed, cot, shelf, stove, generator, sandbags, fire barrel, hand
pump, tent, planter, debris, tyres, car hulk, campfire, wagon, blanket); a dressing pass adds what the map does not
place (clutter against outer walls, awnings over street doors, the hall's porch, chairs by doors), clear of doors,
props and markers; streets, rubble and broken concrete are `SecondFace/Road` patches on a 1 m grid with ragged alpha;
the map's lights are realtime points without shadows; its spawns, exits, triggers, spots, talk and container props and
people's posts are `PlaceMarker`s. Game: `PlaceSpawner` (with `WorldStreamer.Places`) instantiates a place by address
on its pad within 600 m of the focus and releases it beyond 800 m; `PlaceNav` builds its NavMesh asynchronously from
the render meshes over the footprint and 12 m (terrain included; doors ignored through `NavMeshModifier`; kit meshes
import readable for it, nature scans stand in as their boxes). Roads stop at a place's edge, fading over 6 m
(`RoadStrips.PlaceFade`): the place's streets are its own. Captures `place_shale_street`, `_square`, `_wide`
(`PlacePlayTests`, which also walks the NavMesh road to road and in through the saloon's door).

**A.6 Day, weather, light.** `TimeService` keeps world minutes; sun elevation by hour and region latitude;
`Light` directional with `shadows.distance` 80 m (Mid), cascades 2; ambient from the sky gradient (trilight);
fog colour and density per region/weather with exponential-squared mode. Point lights realtime ≤ 4 visible,
others emissive-only. No baked lighting in v1 (CI cannot afford bakes; APV revisited after v1 if the Floor tier
needs it).

*As built (2026-10-29, step 18).* Core `Sky` (pure, tested): the sun's path for latitude 34° and a fixed late-spring
declination of 12° (the game keeps days, not seasons: sunrise ~5:27, noon at 68° due south, sunset ~18:32); the clear
look keyed on the sun's elevation (eight keys from deep night to high noon, sRGB hex converted to linear, linear
between keys: easing doubled the rate mid-way and made dawn jump); the one directional light is the sun above −6° and
the moon below (high in the south-west), handing over where its intensity is ~0.1 so the shadows' turn is not seen;
the sun never lights from below 6° (shadows do not run to infinity at sunrise). `SkyLook` holds every number the game
applies and lerps (region borders, weather changes). Core `Weather`: one kind per region per day from the climate
table (the web game's, with its FNV hash, so a region's days match it), in spells of two to three days; most Sallow
days are clear (0.54 measured), never snow; the Teeth snow; the Wet rains. Weather changes the look on top: sun ×,
fog × (clear air 0.0012, 95 % fogged at ~1.4 km, just past the streamed ground's edge; a storm ~20 % at the game
camera's 60 m), cloud cover, the sky towards grey or dust, particles. Game: `TimeService` (a day in 24 real minutes by
default, `SetHour`, paused for captures), `SkyController` (recomputes ten times a second: the look of the regions
round the focus, the focus's own weight 2 and six points 300 m out, the day's weather blended in over the two hours
before dawn; applies the light, trilight ambient, exp² fog, the sky material; `DynamicGI.UpdateEnvironment` every half
game hour, to be measured on the phone), `WeatherLayers` (rain ≤ 4000 stretched streaks, snow, drifting motes, and
broad blown-dust sheets in dust and storms; boxes riding with the focus; colours follow the light), `SkyProfile` and
the editor's `SkyAssets` (Assets/SecondFace/Sky: the sky material, a dot and a streak drawn in code, their materials).
Shaders: `SecondFace/Sky` (procedural skybox: zenith-to-horizon gradient, the fog's colour as a haze band at the
horizon and below it so the streamed ground's edge fades into the sky, the sun's glow and disc, stars and the moon at
night, one cloud layer drifting with the wind; arithmetic only) and `SecondFace/Weather Particle` (unlit, alpha, fog).
Captures (`WorldSkyTests`): `sky_0700`, `sky_1300`, `sky_1900`, `sky_night`, `sky_dust`, `sky_rain` from a low camera
over Shale and `sky_1300_iso` from the game camera. Not yet: wind in the foliage and the clouds' shadows on the ground
(with scatter, P3.4), lightning, puddles and wet ground in rain (a terrain wetness term), the moon's phases.

**A.8 Water (built 2026-10-29, step 22).** The sea lies at `WorldLayout.SeaLevel` (0) wherever the ground is under it;
the Wet's river at its own level within 40 m of its banks. *The river:* `tools/unity/world.py` fades the relief
(roughness and styles) out over 760 → 220 m from the river, so its valley has a floor and the river can fall steadily
(without it the Wet's ±15 m noise left kilometres of dry bed or 20 m gorges). Core `RiverProfile`: the layout's polyline
(points 300 m apart) drawn as a Catmull-Rom curve every 20 m and swung up to ~22 m sideways by slow noise (none at the
ends); half-width breathing −20 %…+25 % over a few hundred metres and narrowing to a stream over the first 900 m; the
level sampled every 10 m from the natural ground under the course, 1.5 m down, a running minimum from the source
(never rising), softened over 150 m only where that lowers it, never below the sea (56 m in the Wet's flat, down to
the sea over ~5 km). `TerrainGen` cuts the bed under it from the nearest course segment (one shape across a bend): a
bowl 2.5 m deep at the centre (less for a stream), 0.3 m under the water at the edge, then an 8 m bank up to the
ground; ground under the edge is raised to it only to contain a river above the sea; the control map's water lowering
(meant for the sea) fades out within 40–100 m of a river. *The sheet:* Core `WorldWater.Build` on the chunk's worker
lays a flat sheet on a 4 m grid over every cell with a corner under water (corners' levels within 0.75 m), each vertex
carrying the depth under it (negative on a shore corner) and the flow (down the river at 0.9 m/s, a slow drift at
sea); open sea deeper than 4 m in 32 m quads (a sea chunk is ~500 triangles, a river chunk 4–8 K, a mouth ~10 K). The
terrain hides the sheet where the ground rises above it, so the shoreline is the ground's own. `WorldWater.Near(...)`
gives a probe for many queries; `WorldScatter` and `WorldDetails` keep props and plants out of any water (and the
details 4 m off a river's polyline). *Shader:* `SecondFace/Water` (Transparent−50, premultiplied, no depth or opaque
texture): murk by the path through the water (depth / view slant; shallow olive-grey to deep teal), two ripple layers
from one tileable normal map (`Terrain/WaterRipples.png`, a sum of whole-number waves made by `TerrainLayerLibrary`),
the first drifting with the flow in two cross-faded phases (flow mapping that never stretches), ripples calmer in the
shallows and fading out far off; the sky by Fresnel through the environment probe the sky controller refreshes, the
sun as a glint, main-light shadows; a thin broken lace of foam where the sea runs up the shore (faint on a river), a
0.12 m fade where the sheet runs under the bank; fog. `Terrain/Water.mat` set in code; `BiomeLayerSet.Water`.
`ChunkTerrain.ApplyWater`: a pooled child `water` of the terrain, hidden with it and under the ground.
Tests: `WorldWaterTests` (EditMode: the level falls and never stands above its ground, river water stays in its
channel, open sea in blocks, a shore chunk, sheets meet across chunk edges, nothing grows in the river, dry land has
none) and `WorldWaterPlayTests` (`world_water_shore`, `_river`, `_falls`, `_mouth`, each near and `_mid`; hidden under
the ground). Not yet: bridges and fords where roads cross the river (a road dips into the water today), the flooded
under-city's water (a place's own sheet with the same material, when the Sink is built, P8), wet sand above the
waterline, planar reflection on Flagship (§6.J), lakes behind the dam.

**A.7 Addressables (skeleton built 2026-10-29).** `Editor/Build/AddressablesBuild.cs`: groups `kits-shelter`,
`kits-frontier`, `kits-trees`, `nature` (PackTogether, LZ4: meshes only) and `materials` (PackSeparately: one
bundle per library material with its own textures, so a piece loads only its surfaces' textures and no texture is
stored twice; the first build without it put 126 MB in the shelter kit's bundle). Entries are the bound prefabs
(`ContentPrefabs.Bound`: `Assets/SecondFace/Prefabs/<group>/<name>.prefab`) at `<group>/<name>`, labelled `kit`,
`tree`, `nature`, `material`. **The bound prefabs and the library materials (`Assets/SecondFace/Materials/Library`)
are committed**: Addressables refers to them by GUID, which must survive a fresh clone; they are rebuilt by code and
a second `Prepare` produces no diff (checked). `ContentBuildProcessor` (a `BuildPlayerProcessor`, callbackOrder 0)
runs `Prepare` before every player build, CI's included, and Addressables (order 1, `BuildWithPlayer`) builds the
bundles into the player (local, StreamingAssets; no remote in v1). Menu/`editor.sh run`:
`SecondFace.EditorTools.AddressablesBuild.Prepare` and `.BuildBundles` (bundles for the active target). Smoke tests
(`AddressablesSmokeTests`, PlayMode): `kits-shelter/wall_straight` instantiates by address with bound materials and
releases; the `tree` label finds the nine trees. Groups to add as the content comes: `places-<region>` (P3.5),
`people-<set>` (P4), `motion`, `ui`, `audio-<region>`. Loading at runtime: `Addressables.InstantiateAsync` with a
handle cache per chunk; release on unload. Library textures are capped at 1K on Android (ASTC 6×6).

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
`importBlendShapes = true`, `materialImportMode = ImportStandard` + `InPrefab` so the slot names survive as
placeholder materials; `PeopleMaterials.Bind(go, dir)` replaces them after instantiating (never in an import
callback, §8). If Unity's auto-mapper misses a bone, set `humanDescription.human` explicitly in the postprocessor
from the fixed name list in `mh_build.py` (`GAME_RIG`), never by hand in the editor.

**B.3 Eyes.** The MakeHuman high-poly eye (`eyes/high-poly`, 1020 faces) is two shells: the eyeball and a cornea
shell over it (490 faces) whose UVs all fall on the 1.3 % of `brown_eye.png` that is transparent. In the engine
the texture's mip levels average that tiny patch with its opaque neighbours, the alpha clip stops removing the
cornea, and the eye renders as a pale blank (seen in the first captures). **Fix in `mh_build.py`, not in Unity:**
when fitting the `eyes` proxy, drop every face whose UV centroid samples alpha < 128 in the eye texture (read
the PNG with `bpy.data.images`, §8), and export the eyeball alone. The eye material then needs no alpha clip:
`PeopleMaterials` sets eyes opaque with smoothness 0.7 (done 2026-10-28). The pupil is a shallow recessed cone:
with Unity's recalculated normals it caught the sky at a grazing angle and rendered as a grey diamond, so people
import Blender's own normals (`ModelImporterNormals.Import`), which also turned the grey-speckled brows and lashes
into dark strands. Verify on `portrait_*` (iris and pupil visible, a soft sheen on the eye). In Cycles previews keep `image.alpha_mode = 'CHANNEL_PACKED'`. Eye
colour = tint on the one brown texture (`_BaseColor`), per `eyes` field.

**B.4 Variance.** Every NPC brief draws: ancestry mix (three weights), age 16–75, muscle/weight/height, 6–10
feature mods from the pool with signs, skin from the region's set, hair per §6.C, wardrobe per role per §6.D,
scars/tattoos as decals on the skin texture (`bake_skin`). Rerolls must change silhouette and face visibly
(UPGRADE directive): enforce a minimum distance in the macro vector between consecutive rerolls.

**B.5 The player and the sculptor.** The player prefab keeps all 69 shapes; the sculptor maps sliders to
incr/decr pairs (slider −1..1 → one of the pair at |v|). The ageing photograph: the same head at age 41+ (apply
the `age` macro delta on the base before the shapes — the tool exports an `_aged` body shape key for the player
only; the portrait camera renders both).

**As built (P4.2a, 2026-10-29).** `tools/unity/people/briefs/player.json`: `player_f` and `player_m` (age 24, a
middle mix of ancestries, 2 K skin, plain re-dyed work clothes, the tied-back bun / a buzz), `sculpt: true` and
`aged: 62`, built to `People/Player/` (about 30 s each). The body carries the 64 sculptor shapes (`FACE_SHAPES`: 29
pairs and 6 head shapes), the expression units and `aged` (the age macros' difference to 62 on the head and neck only,
fading out down the neck, less the head's mean shift, so the older head sits on the same body). **Every proxy is
refitted per shape**: `mh_build` keeps each shape's deltas over all base vertices and fits the proxy again with them
(the garment's scale held at rest: a garment's scale vertices can be anywhere, and a face slider must not resize boots);
a part gets a shape only where it moves more than 0.1 mm, so hair, brows, lashes, eyes and collars follow the face and
boots carry none. This applies to everyone (NPCs' brows and lashes now follow their expressions). Capped LOD0 parts take
their shapes back by nearest vertex (`transfer_shapes`); the player's LOD1 keeps every shape the same way (their face
shows at the game camera); no LOD2 has shapes. Runtime: Core `Npc/Sculpt` (the 35 sliders in nine groups with labels,
`Weights` → every driven shape at 0..100, `Reroll` with six to ten strong features and a minimum distance of 1.6 between
rerolls; tests) and Game `People/FaceSculpt` (values by slider id, `Aged` 0..1, applied to every renderer that carries
the shapes). `Test_Player` (*Build player test scene*) shows each base as built, rerolled twice and aged; captures
`people_sculpt_<f|m>_<face>`; the test checks every shape on the body at LOD0 and LOD1, that brows and eyes follow, and
that a reroll moves the head (13 mm) and not the feet. Open: the aged face is geometry only (MakeHuman's age shapes are
subtle); the photograph also needs the skin aged (a `<id>__skin_aged_d` bake for the portrait camera, P4 step 6). Body
sliders (build, weight, height) are not shapes yet: they need the same refit on every garment (P4 step 3, wardrobe).

**B.6 Weight.** Per person today: 22 MB FBX for six = ~3.7 MB each (fine), but 110 MB of textures for six. Rules:
skin 2 K (player and companions), 1 K for everyone else; cloth and hair cards 1 K; brows/lashes have no texture
(strand geometry); normal maps only on skin and cloth with real relief. Shared garments share one baked texture
per (garment, look), named `<look>__<garment>_d` instead of per person. Target ≤ 8 MB per person, ≤ 4 MB for
extras.

**B.7 Levels of detail (built 2026-10-29, P4.1a).** The bake-off people were 95–141 K triangles each, with no LODs:
strand brows 22–42 K, strand lashes 17 K, a tactical vest 37 K, boots 31 K (six in the walkabout ≈ 700 K a frame on
the phone). `mh_build.py` `lod_chain` before export: **LOD0** (close-ups) keeps the body whole with its face shapes
(18–20 K) and caps the rest: garments 4 K (collapse decimation), brows 3 K, lashes 1.5 K and hair 6 K by *thinning*
(strands and cards are many small islands that collapse cannot merge: whole islands are kept evenly through the mesh);
**LOD1** ~6 K (body 3 K, garments 2.4 K shared by size, hair 0.6 K, eyes 0.2 K, brows 0.5 K, no lashes); **LOD2**
~1.8 K (body 1 K, garments 0.8 K, hair 0.15 K, no eyes, brows or lashes). Copies are made at rest without shape keys,
keeping vertex groups, materials and the armature; objects are named `_LOD0.._LOD2`, which the FBX importer groups into
a `LODGroup`; `PeopleImportPostprocessor` sets the transitions 0.45 / 0.1 / 0.012 of the screen's height (the game
camera's person, 13–44 %, is LOD1). LOD0 is 36–44 K, over the 15 K first planned: the body's 18–20 K carry the face
shapes and only show in close-ups (a conversation's two people); a lower-poly LOD0 body waits on P4.2. The briefs are
data: `tools/unity/people/briefs/*.json` (`BRIEF`, `REL` env), the bake-off's in `bakeoff.json`. The bound person
prefabs are rebuilt after a model changes (*Second Face/Rebuild people prefabs*). Brows painted into the skin (instead
of thinned strands) would read better at LOD1: open.

**B.8 The cast (built 2026-10-29, P4.1b).** `tools/unity/people/briefs/cast.json` holds 32 people, each a role and a
region: the Sallow's labourers, water carrier, raiders, deputy and prospector; the rail corridor's crews and a trader;
the glass flats' salt workers and an elder; the drowned shore's fisher, river trader and runner; the northern wet's
timber, dam and boat people; the Teeth's miner and herder; the Ashlands' scavengers; a Tollmen convoy guard and clerk;
two of the Choir; a mender; Meridian's warden, sinker, crew and one of the Tenured; a rider of the Wheel. Built to
`People/Cast/` (`BRIEF=…/cast.json REL=Assets/SecondFace/People/Cast`, about 12 s a person, `ONLY=id,id` for a few):
LOD0 29–46 K, LOD1 6.1–7.2 K, LOD2 1.8–3.7 K triangles; 6.7 MB a person on disk (FBX 2.7 MB, skin 1 K, garments 1 K,
garment normals shared), within B.6. The brief's `defaults` apply to everyone (`skin_size` 1024); `skin_look.tone`
darkens the skin bake. Three wardrobe guards in `mh_build.py`: `PRINTED` (garments whose own texture carries a print,
logo, lettering or fashion motif bake at least that far towards plain, so only dye, weave and wear show: the wardrobe
rule); `COVERS` (garments with no `delete_verts` hide the body vertices they are fitted to, or the skin pokes through);
a hat needs hair that fits under it (cropped, buzzed or none) or the hair cards stand through the hat. Ten of the cast
stand about Shale in the walkabout (`WorldAssetsBuild.Townsfolk`, bound prefabs by *Rebuild people prefabs*). The lineup
is `Test_Cast` (*Build cast test scene*: rows of eight side by side, each framed alone) and the captures are
`people_cast_1..4` and `people_lod_0..2`. Open: the cast's binaries are committed (215 MB; every full rebuild adds as
much to the history): before the cast grows past ~60, build people in CI from the briefs (cached by the briefs' and
the script's hash) instead of committing them. The lineup leans grey and charcoal: the next brief pass spreads the dyes (rust, ochre,
indigo, faded reds and greens) so a crowd reads as many people at the game camera. **Retired (P4.13 step 6, 2026-10-30):** the per-person
cast models, their prefabs, `Test_Cast` and its builder were deleted (214 MB out of the tree and the app): everyone is
made from the player's two bases with their own measurements (§P4 item 13). `cast.json` stays as a record of the brief
format; a rebuild to `People/Cast` is only ever for comparison, never committed.

### 6.C Hair and grooming (the hair rule in practice)

1. **Allowed proxies from the packs** (CC0 `hair01`): `elvs_unkempt_french_braid` (work braid), `rehmanpolanski_hair_bun_brown` and `elvs_reverse_french_braid_bun`
   (tied back), `o4saken_long01` only under a wrap (not the hood: it pokes through). **Forbidden**: every bob
   (`toigo_*bob*`, `littleright_bobcut_hair`), bangs, `culturalibre_hair_05/06` (swept), `learning_anime_hair`,
   `cortu_strawberry_cloud_hair`, `sonntag78_blond_with_headband`, `elvs_double_mh_braid` (too neat),
   `cortu_short_messy_hair` (its fringe hangs over the eyes in the engine),
   `faydaen_hair_1`. The bake-off mapping to apply now: p1 → `cortu_short_messy_hair`; p2 →
   `elvs_unkempt_french_braid`; p3 → none (balding, §C.2) + beard from the skin, hood removed so the head shows;
   p4 → `rehmanpolanski_hair_bun_brown` (the rich keep it tidy: that is their costume); p5 → buzzed (§C.2); p6 → long hair
   kept under the dust hood (no hair mesh: the hood hides it). Seen in the engine and rejected (2026-10-28):
   `cortu_short_messy_hair` hangs a fringe over the eyes (bangs; p1 got a dense crop painted into the skin
   instead), `o4saken_long01` under the balaclava-like hood pokes through it, and `elvs_reverse_french_braid_bun`
   sweeps a heavy styled fringe across the forehead (keep it for the back-of-head-only variants, or not at all).
   **Seen again at portrait distance (P4.2, 2026-10-29): `elvs_unkempt_french_braid` sweeps the same fringe across
   the forehead from the front, so it is forbidden too; the cast had picked up the rejected ones (eight people) and is
   re-haired: of the cards only `rehmanpolanski_hair_bun_brown` (tied back) stays, everyone else is buzzed, cropped or
   balding in the skin, or wrapped.** One card hair is too few for a world: hair cards of our own for the rule's other
   forms (work braids, rough buns, cropped uneven, matted under a wrap) are a P4 follow-up. Card hair is re-coloured by `bake_hair`
   (`hair_look: W(colour, dust, grey)`, colours in `HAIR_COLOURS`) and ships without normal maps.
   **Hair of our own (P4.7a, 2026-10-29; capture `people_hair`):** `tools/unity/people/hairgen.py` generates four
   styles on the MakeHuman base head as ordinary proxies (`sf_crop`, `sf_bun`, `sf_braid`, `sf_matted`; `.mhclo`,
   `.obj`, `.mhmat`, a 1 K strand atlas), which `mh_build` fits, skins, refits, thins and dyes like any other hair; it
   writes them once per generator version into `HAIRGEN_DIR` (default `~/.cache/second-face/hairgen`). Each style is
   a **shell** (the scalp's own faces, subdivided once, lifted 1–3 mm, the atlas's sheet strands running from the
   hairline toward the style's goal; the hairline fades over 1.2 cm along the scalp with strands starting in clumps
   a few millimetres wide) plus cards for relief: the crop 700 short clumps (narrow at both ends), the bun and braid 70
   flat locks rooted just inside the hairline and a knot wound from locks, the braid a three-strand plait of crossed
   cards and a tail, the matted style 80 heavy locks below a wrap. Vertices are tied to the base as MakeHuman's own
   proxies are (the triangle under them, barycentric weights, an offset), so they follow any head shape and take
   smooth skin weights. Spec: `"hair": "sf_braid"` with the usual `hair_look`, and a `scalp` buzz of the same colour
   under it (the shell's soft hairline shows it). The cast now wears them (two braids, three buns, three crops; one
   found bun kept), the player bases too (braid, crop). Open: longer loose styles under no wrap; strand normal maps.
2. **Shaved, buzzed and balding heads are painted into the skin** (done for p5 and p3, 2026-10-28). The plan once
   said to build a cap mesh from the base mesh's `helper-hair` group: that group is not a cap but 198 loose strips
   from the crown to the chest (used by MakeHuman to fit long hair), so it cannot be used. Instead `mh_build.py`
   gives the person their own copy of the skin texture (`<id>__skin_d`, 2 K, its normal map beside it as
   `<id>__skin_n` when the skin has one) with stubble baked in by `bake_skin` (§C.4): `hair_weight` computes a per-vertex weight
   on the head from a hairline model around the skull (elevation above a threshold that falls from the forehead to
   the temples, the ear tops and the nape; `bald` keeps the horseshoe on the sides and back; ears and face get
   none), stored as a vertex attribute, broken up by a mid noise (ragged hairline) and stippled by a fine one,
   coloured as darkened skin under the hair colour. Spec field: `scalp: W(mode='buzz'|'bald', density, colour,
   recede)`. No extra mesh, no alpha, no overdraw. The thresholds were tuned on the base mesh with a shaded
   four-view preview; re-tune them only against engine portraits.
3. **Headwraps and scarves.** Model once in Blender as proxies on the base head/neck (a wrap: a torus-ish band
   with a knot; a scarf: a loose loop at the neck), exported as garments with `mhclo`-style reference vertices
   (write them with the same fitting code path: pick the nearest base vertex per proxy vertex and store offsets
   in base space). Until modelled, a hood (`culturalibre_hero-heroine_hood_1`) covers long hair.
4. **`bake_hair` and `bake_skin`** (done 2026-10-28 for the six; what was built: `bake_skin` gives every person their
   own 2 K skin, RGBA with the smoothness URP reads in the alpha (skin 0.42, matte where stubble or dirt is, drier
   lips); sun warms and darkens the skin more where it faces up; dirt sits in the creases by Cycles pointiness and in
   faint patches; lips (found from MakeHuman's own lip-volume targets) are chapped and desaturated; beard stubble
   comes from a beard line around the face like the hairline; spec field `skin_look: W(sun, grime, lips, beard,
   beard_colour)`. Scars and tattoos are not built yet.) **P4.9 (2026-10-29):** brows are painted into the skin where
   the brow proxy is tied to it (its reference vertices, softened over 3.5 mm), hairs streaked across the face in the
   hair's colour a shade darker, `skin_look.brows` the density; the strand brows themselves (thinned to the LOD budget
   they drew as black dots at portrait size) are dropped by `PeopleImportPostprocessor` (version 10) from every level; lips are the person's own skin deeper and redder with flakes a shade lighter (a fixed
   pale flake colour went lilac over darker skin); and the sculpted player bases get an aged bake for the photograph,
   `<id>__skin_aged_d`, baked on the aged shape (its folds become creases), with broken forehead lines, crow's feet,
   darker skin round the eyes, age spots where the sun falls, greying brows and stubble, a sallower skin. The Skin
   shader blends to it by `_Aged` (`_AgedMap`, bound by `PeopleMaterials`), which `FaceSculpt.Apply` sets with the aged
   face, so the aged portrait is aged in both shape and skin; and their hair has a greyed bake, `<id>__<hair>_aged_d`,
   which `FaceSculpt.AgedHair` (set by `WardrobeBuild`) swaps in past half aged. Open: the eyebrows' strands for
   close-up conversation cameras, if painted brows read flat there. The original spec, kept for those: hair → desaturate 0.4, darken 0.75, multiply by
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

**As built (P4.3a, 2026-10-29).** The player's bases are built naked (`clothes: []`) with a `wardrobe` in the brief
(`{g, slot, look, hides_hair}` per garment, `outfit` the ones worn at start): `mh_build` exports each garment alone on
the same rig as `People/Player/<base>__<garment>.fbx` (its LODs by its share of a 12 K outfit, its face shapes
refitted) and `<base>.wardrobe.json` (slot, hides the hair, and the MakeHuman base vertices it hides: `delete_verts`,
plus the vertices it is fitted to for `COVERS` or `look.hide`, with the small islands inside closed by `close_holes`).
The body carries each vertex's base index in uv1 as `(i % 128, i / 128)` (exact in half floats), the LOD copies
taking theirs from the nearest LOD0 vertex. **Hiding is a mask, not a mesh edit**: `SecondFace/Skin` (the player's
skin shader: URP PBR with the albedo-alpha smoothness and normal map of the Lit skin, SSAO, fog) reads a 128 × 128 R8
mask at the vertex's texel and clips in every pass (forward, shadow, depth, depth-normals), so no body mesh is copied
(the blend shapes stay shared). Runtime: `WardrobeSet` (per base: garments with slot, hair, hides and the bound
prefab; built by *Second Face/Build player wardrobes* with the base's prefab `Prefabs/people/<base>.prefab` carrying
`FaceSculpt` and `Wardrobe`) and `Wardrobe` (`Wear`, `Equip`, `Unequip`, `Dye`; one garment per slot; a garment's
renderers move onto the person's skeleton by bone name and into the person's `LODGroup` by their `_LODn` suffix; the
mask is rewritten and given to the body's renderers by a property block; hats switch the hair off; the face sculpt is
refreshed). The capture `people_wardrobe_<f|m>`: the outfit; with the long cardigan; with the cardigan and the
knitted hat; the cardigan dyed, the hat on and off. Open: dye is the URP Lit `_BaseColor` (a property block, so the
player's garments leave the SRP batcher: one actor); grime and wear at runtime need the cloth shader (P4 skin/cloth
pass); body sliders (build, weight) as refitted shapes on the body and every garment; NPC outfits merged into one
renderer at bake (they are separate renderers per garment today).

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

**As built (P4.4a, 2026-10-29).** `LocomotionBuild` (version 3, rebuilt in place so the controller's GUID stays): the
base layer's 1D blend on `Speed` over idle, walk_slow, walk, walk_brisk, jog and run at the clips' own speeds, the idle a
nested blend on `Idle` over four captured idles; IK pass on. A `Gesture` layer on `People/UpperBody.mask` (trunk, head,
arms, fingers) with states played by name (talk, talk_b, argue, drink, wave, stretch, yawn, yawn_b), each back to an
empty `none` at its end; the layer weighs **0 at rest** (an empty state on an override layer writes the default pose
over the masked bones) and `Ambient` raises it while a gesture plays. `FootPlant` (Humanoid IK in `OnAnimatorIK`, no
rig): each foot moved by the ground's height under it relative to the person's footing, turned to the slope, the pelvis
lowered by the lower foot's ground; full standing, 0.35 at walking pace (the clips have no contact curves); smoothed.
`Ambient`: each person's own idle by a hash of their name, started at their own point, and a gesture every 7–20 s
while standing (talkers mostly talk and argue). The walker and the walkabout's townsfolk carry both. Test
`PeopleMotionTests` on a 14° slope: two of the same person in step, the bare one's ankles 5.5 cm apart in height over
the ground, the planted one's 1.5 cm; the wave plays on the gesture layer at full weight; capture
`people_motion_slope`. Open: turn-in-place and strafe clips (none captured yet: the agent turns on the spot), foot
contact curves for planting while walking, the gesture layer over walking.

**As built (P4.8, 2026-10-29: the owner saw unnatural arms and body positions).** Three faults, all in how the captures
reached the Humanoid rig, none in the captures: (1) `cmu2fbx.py` split each rotation into the BVH's angles with
Blender's `to_euler('ZXY')`, which is extrinsic, while the BVH channels `Z X Y` are intrinsic (Blender's `'YXZ'`): every
large rotation came out scrambled, the arms worst (they turn ~80° from the capture's T-pose to hang), so walks held the
forearms raised in front and idles reached forward; (2) the clip FBX's default skeleton (each bone's Lcl transform,
from which Unity builds the clip's avatar) was the motion's first frame, so each clip retargeted against its own
reference, a walk against a striding leg; Unity's avatar setup levels the arms but leaves legs and spine as found;
(3) the people's importer reset the avatar's muscle settings to zero (no twist distribution, no stretch). Fixed:
the rotations decomposed as `'YXZ'`; a T-pose keyed at frame 0, outside the baked range, and the scene left there when
the FBX is written (the capture's base pose with the legs turned straight down, its stance is 20° wide, and the feet
kept pointing ahead); the capture's single finger and thumb bones left out (mapped to index and thumb they curled
one finger into a claw; unanimated, Humanoid fingers rest relaxed); people import with Unity's default muscle settings
(twist 0.5, stretch 0.05; importer version 9); the clips reimport (motion importer version 3) and `LocomotionBuild` goes to version 4. The people's own models needed no change: `RigReport` (menu "Report rig
poses") shows Unity's avatar levelling their arms from MakeHuman's A-pose into a true T-pose. Checked by
`PeopleMotionTests.CapturedMotionHoldsHumanPosesWhenBuilt` (three people in two idles, a walk at two phases and a jog,
front and side; standing, both hands hang at the thighs and beside the body; never a hand held up in front), capture
`people_motion_frames`. The heads: the common idle holds its subject's face 16° up (at the capture studio's ceiling);
`Gaze` (Humanoid look-at in the IK pass: the head drawn level ahead, or to a `Target`, head 0.75, body 0.05) keeps faces
within 2° of level in the walk and the idles; the walker and the townsfolk carry it beside `FootPlant`, and a fall stops
it. The slope test now compares each foot with the same person on flat ground (an idle stands with one heel a little
raised): planted, each foot stands at its flat height on 14° (to the millimetre). That needed Foot IK on the locomotion
state (§6.E asked for it; it was off, `LocomotionBuild` version 5): without it the retargeted legs, longer or shorter
than the captured subject's, left the feet 1-2 cm over the floor, so the feet's IK goals (where the capture put them)
sat that far under the animated ankles. Open: the common walk (CMU 07_01) swings the forward arm with the elbow well bent, a subject's style: give people one of
the two captured walks each (and blend a little of the other) for variety.

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

*As built (step 25).* Core `Input.Gestures` (pure, `GesturesTests`): fed the fingers each frame, it reports drag
(after 12 px), tap (< 220 ms, still), double tap (≤ 300 ms, ≤ 40 px), long press (450 ms, once), pinch ratio and
centroid pan (two fingers; such a touch never taps). `Game.Play.TouchInput` reads `Touchscreen.current` (a mouse in
the editor: left = finger, wheel = zoom, right = pan), skips touches that begin on the debug overlay, and drives
`OrbitRig` (Cinemachine 3: `CinemachineCamera` + `CinemachineOrbitalFollow` in world-space binding +
`CinemachineRotationComposer`, a brain on the camera; goals eased over 0.08 s, fling decaying over 0.5 s, the look
target at chest height led by velocity × 0.4 s plus the pan) and the `Walker` (a P2 person on a `NavMeshAgent`,
r 0.3 h 1.8, walk 1.4 m/s, jog 3.2 beyond 22 m; `People/Locomotion.controller`: a 1D blend on Speed over idle,
walk_slow, walk, walk_brisk, jog at their captured speeds, built by `LocomotionBuild`). A tap raycasts the terrain's
collider and goes to the nearest walkable point within 4 m; a double tap on the walker recentres. `WorldNav` builds one
NavMesh 160 × 120 × 160 m round the walker (voxel 0.15 m; terrain, props as boxes, places; the water sheet carries an
ignore modifier) and rebuilds when they come within 40 m of its edge; places build none of their own meanwhile
(`PlaceNav.Disabled`). `Walkabout` sets the walker at Shale's spawn and the other five P2 people (bound prefabs in
`Prefabs/people/`) at its people's posts, idling out of step; the overlay's button lends the camera to the measuring
tour and takes it back. Not yet: long press (waypoint pin), the compass button, UI picking, gamepad, deoccluder,
walking in water is not prevented (the river bed is walkable).

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
- **Terrain**: URP Terrain Lit (at most 4 layers per tile, which URP draws in one pass; height-based blend from the
  mask's B channel), triplanar on slopes > 45° (Shader Graph custom terrain shader after v1 if the stock one shows stretch).
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

### 6.L Card trees (`tools/unity/kits/trees.py`; built 2026-10-28)
**As built (pine).** `blender -b --python tools/unity/kits/trees.py -- [--only pine] [--preview <dir>]`:
- Sapling Tree Gen (extension, §7.1) is enabled with `addon_utils.enable('bl_ext.user_default.sapling_tree_gen')`;
  `bpy.ops.curve.tree_add(**params)` takes the preset (`<ext>/presets/<name>.py`, `ast.literal_eval` after the
  licence comment, keys filtered to the operator's properties) plus the overrides in `SPECIES`. Pine ← `douglas_fir`
  with `levels=2, branches=(0,40,0,0), scale=10, scaleV=2, bevelRes=1, resU=1, curveRes=(10,3,3,2), leaves=18,
  leafDist='6', leafShape='rect', leafDownAngle=25, horzLeaves=False, showLeaves=True`, `leafScale` and
  `leafScaleX` from the card's `card_<name>.json` (metres). The first spec (28 branches, 7 leaves, resU 2) gave
  77 cards and 3,034 triangles, 95 % of them bark: the bark resolution goes to `resU 1` (the cards hide the
  branches) and the count to cards. Result: 1.8–1.9 K triangles per tree, 10.5–14 m tall, seeds 1, 2, 3. (At
  14–19 m the pines filled the iso camera's view with canopy: trees are sized for the camera, not for botany.)
- Bark: Blender 4.5 curves have no `use_uv_as_generated`; a converted Sapling curve carries generated UVs 0..1
  around and 0..1 along each branch. `bark_uvs` rescales per branch (connected part): v = metres along, one wrap
  around = a whole number of 2 m tiles (no seam), so UV units are metres as the library expects. Slot
  `mat_<bark key>` (`bark_pine`).
- Cards: Sapling's `rect` leaf maps u 0.125..0.875 and v 0 at the stem → 1 at the tip; u is stretched to 0..1. The
  cards' normals are bent outwards from the trunk and a little up (`out + 0.35 up`, `normals_split_custom_set`) so
  the crown has a sunlit and a shaded side (bent mostly up, every card lit the same and the crown read flat); `KitImportPostprocessor` imports normals for `Kits/Trees/` (and no colliders, no lightmap UVs). Slot
  `mat_card:<card>`; `MaterialLibrary.Get` routes `card:` and `card_` (the FBX round trip).
- Output: `Kits/Trees/<species>_<seed>_lod0.fbx` + stable metas and `Kits/Trees/trees.json` (the nature manifest's
  schema); `ModelLibrary.Load` merges it, so scatter rules name `pine` like any model.
- Scatter: `Scatter.Teeth` (Core) puts pines where slope < 0.5, height > 0.45 and the clump noise > 0.3, with dead
  wood, boulders, stones and low scrub; `Test_Vegetation` has a second 512 m tile (`TerrainTeeth`, four layers:
  scrub_soil, grass_dry, rock, gravel) east of the Sallow, captured as `vegetation_teeth` from the game camera
  (pitch 50°, 35 m: inside the 60 m shadow distance) just below the densest clump of pines. The library's `forest`
  texture is orange broadleaf litter, not pine needles: P3.2 fetches a needle-litter scan for the Teeth.
- **Cards (`cards.py`, rewritten 2026-10-28):** a branch card is cut from the scan along the crown's densest
  direction out of the trunk (trunk = the densest column of wood faces in the middle third; direction = the 15°
  sector with most foliage in the densest 0.2 m band), faces of other materials deleted (dead wood above all),
  rendered unlit and orthographic, cropped to its alpha, turned root-down in top-down rows, and its colour
  dilated 32 px into the transparent texels so mipmaps fade to foliage, not to black. Existing card metas are kept.

**Fir, broadleaf and LODs (step 9, as built).** Fir ← `douglas_fir` with the conifer overrides, `branches=(0,48,0,0),
scale=8, scaleV=1.5, leaves=22, baseSize=0.18, shape='0'`, card `fir_branch`: a dense column, 2.3–2.4 K triangles,
8.7–10.7 m. Broadleaf ← `small_maple` with `levels=2, branches=(0,22,0,0), segSplits=(0,0.25,0.15,0), scale=6,
leaves=12`, card `broadleaf_cluster` re-baked with its reach capped at 1.5 m (the uncapped 2.5 m card stuck out of
the crown as sheets), bark `bark_brown`: 1.4–1.6 K triangles, 6.6–9.8 m. The maple's own forks (`segSplits`)
cost 90 splines and 3 K bark triangles; 0.25/0.15 keeps a few. **One FBX per tree** (`<species>_<seed>.fbx`)
holds `_LOD0` (the tree), `_LOD1` (the trunk alone, the largest connected part, and every other card: 210–390
triangles) and `_LOD2` (two crossed quads, 4 triangles, showing `tex/card_<species>_<seed>_crown.png`, the tree's own
unlit orthographic render, colour dilated); Unity builds the `LODGroup` from the `_LODn` names and
`KitImportPostprocessor.OnPostprocessModel` sets the switch heights 0.22 / 0.07 / 0.01. `ModelLibrary.IsCardTree`
tells card trees from scanned ones (both say `use: "tree"`). `Test_Trees` (`TreesTestScene`) stands every tree in a
row and each species' three LODs side by side (forced by name in the capture): `trees_lineup`, `trees_iso`,
`trees_lod`; `TreeAssetTests` (PlayMode folder: Unity API) checks three LODs within budget and every slot's texture.

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

### 6.Q Corrections from Unity's documentation (2026-10-28; details and sources in `docs/UNITY_PRACTICES.md`)
- **Tiers by graphics API** (§6.K): Vulkan tiers use Forward+, the GPU Resident Drawer and optionally STP; the GLES3
  tier uses Forward without them (both need compute) and lower density. FXAA for anti-aliasing. Frame rate via
  `Application.targetFrameRate` and Optimized Frame Pacing; Adaptive Performance is built into 6.3 (Android provider).
- **Scatter** (§6.A, §P3.4): GRD batches only MeshRenderers with no MaterialPropertyBlock; static batching and
  per-material GPU instancing off when GRD is on; LOD cross-fade (not animated). No baked occlusion culling.
- **Terrain** (§6.A.3, §6.J): four layers per tile inside a biome, up to eight on a biome border (URP draws layers
  five to eight in a second pass: only border chunks pay it); `SetDetailResolution(res, 16)`; `drawInstanced`; write
  heights once per chunk.
- **Characters** (§6.D, §P4): NPC outfits merge into one SkinnedMeshRenderer at build time (two renderers roughly
  double the cost); only the player keeps separate garments for the wardrobe. Optimize Game Objects; Animator culling
  Cull Completely for ambient NPCs; skinned LODs in a LODGroup.
- **Nature models** (§6.L, §2): glTFast renders with its own shaders, which would have to ship in the build and
  ignore remaps; the baked nature set moves to FBX with library materials (URP Lit, cutout foliage).
- **Streaming** (§6.A.4, §6.A.7): additive loads only; never `activateOnLoad = false`; pair Load/Release; run the
  duplicate-dependency analysis.

## 7. Verification protocol (exact)

### 7.0 The working loop (every step; the editor runs in the session)
Since 2026-10-28 the session runs the same Unity editor as CI (§7.1a). The loop below replaces "push and see what
CI says". It is the main defence against the repeated CI failures of runs 10–16: every one of them would have
shown up locally in minutes.

**Once per session, first thing:**
1. Read `docs/PROGRESS.md`, this file, `docs/UNITY_PRACTICES.md`.
2. `df -h /`: the allowance is about 30 GB (§7.1 budget). With less than 10 GB free, delete rebuildable scratch first.
3. If `/opt/unity/6000.3.27f1/Editor/Unity` is missing: start `tools/unity/editor.sh install` as a **background
   task** (about 10 minutes), and meanwhile re-provision only what the step needs (§7.1). Do not poll it with
   sleep loops; wait for the task's completion notice.
4. `python3 tools/unity/assets.py` if `unity/Assets/External/library.json` is missing (textures are gitignored).
5. `gh run list --repo jyp107991/second-face --limit 3`: note the state of the last CI run. A red run on `main`
   is the first thing to fix.

**Per step:**
1. **Edit** (C#, a Python/Blender tool, a scene builder).
2. **Compile checks** (seconds; §7.2): Core tests, `Game.Check`, `Editor.Check`. Fix before touching the editor.
3. **Asset pipeline**, if the step changes an asset: run the Blender script headless, look at its preview render
   for fit and geometry only (not the look), check the output's size against its budget.
4. **The editor**: `tools/unity/editor.sh test all` as a background task (3–5 minutes once `unity/Library`
   exists; the first import of a fresh clone takes about 12). A step that only touches one capture can run
   `tools/unity/editor.sh test playmode <filter>` (a `-testFilter`, e.g. `ScreenshotTests.People`). Never run two
   editor commands on the project at once (Unity refuses a second instance on the same project).
5. **Read the results**: the pass/fail counts printed by `editor.sh` (a total of 0 is a failure: a filter or
   category that matches nothing "passes") and its `LOG PROBLEM` lines (import and runtime errors without the known
   noise; any line there means the run is not green, whatever the counts say: an avatar that failed to build still
   "passes"); then, pass or fail,
   `grep -n -E 'error CS|^Error|Exception:|NullReference|Failed to' unity/test-results/*.log | grep -v -i licens`
   and read the log around the first hit. A run that "passes" with import errors in the log is not green: an asset that
   failed to import shows up as a wrong capture later.
6. **Read the captures** the step changed: open each PNG in `unity/Screenshots/` with the Read tool and judge it
   against §6.N line by line. If it fails a line, go back to 1. Never describe a capture you have not opened.
7. **Diagnostics** when a capture is wrong and the cause is not obvious: `tools/unity/editor.sh run
   SecondFace.EditorTools.Diagnostics.Report` (extend `Editor/Build/Diagnostics.cs` with what you need to see:
   material names and shaders, root rotations, bounds, importer settings), rather than guessing from the image.
8. **`git status`**: the first import after a change rewrites metas and settings (§8); commit them with the change
   so CI imports exactly what the session verified. Never commit `unity/Library`, `Temp`, `Logs`,
   `unity/Screenshots`, `unity/test-results` or `unity/Assets/External` (all gitignored; check that they stay so).
9. **PROGRESS.md**: tick the step, write the exact next action.
10. **Commit and push** (§0 rule 1). Note the CI run id in PROGRESS.md. At the start of the next step check that
    run (`gh run view <id> --json status,conclusion`); red after a green local loop means the loop missed
    something: write the pitfall in §8 and add the missing check here.

**What CI is for now**: building the APK (the session does not build Android: it would need the Android modules,
several GB), confirming the tests on a clean machine, and the owner's artifacts. It is not a debugger.

### 7.1 Re-provisioning a session's machine (everything below is ephemeral)
Scratch root `S` = the session's scratchpad directory (write every tool's absolute path from it). Provision only
what the step needs; the disk allowance is the binding limit.

| What | Where | Size | Needed for |
|---|---|---|---|
| Unity editor 6000.3.27f1 | `/opt/unity` (`editor.sh install`) | 8.3 GB | every Unity step |
| Project Library | `unity/Library` (first import) | about 4 GB, grows | every Unity step |
| Texture library | `unity/Assets/External` (`assets.py`) | 0.6 GB | every Unity step |
| .NET SDK | `/home/user/.dotnet` (`docs/PORT.md` §3) | 0.6 GB | compile checks |
| Blender 4.5.9 (+ Sapling) | `S/blender` | 1.5 GB | kit, people, motion, nature, tree tools |
| MakeHuman data + packs | `S/mh`, `S/mhc` | 2.1 GB | people steps (delete the downloaded zips after unzipping) |
| Poly Haven scans | `.scans/models` (`models.py`; never inside `unity/Assets`) | 2.2 GB | a nature re-bake only; delete after |
| CMU mocap trials | `S/cmu` | 0.1 GB | motion steps |

Everything a session needs at once stays under about 20 GB. Leave 5 GB free for imports and builds. A full disk
shows as "No space left on device" with little "Used": delete rebuildable items from this table; never the repo.

- .NET SDK: `docs/PORT.md` §3. The compile checks take the editor's own managed DLLs:
  `-p:UnityManaged=/opt/unity/6000.3.27f1/Editor/Data/Managed` (so they run once the editor is installed).
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
- Poly Haven scans: `python3 tools/unity/models.py` (into `.scans/models`, gitignored; `MODELS_DIR` overrides).
  Anything under `unity/Assets` is imported by the editor on every run, so sources never go there.

### 7.1a The real Unity editor in the session (use it before CI, every time)
The owner holds a Unity Personal licence. With `UNITY_EMAIL` and `UNITY_PASSWORD` (the owner's Unity account, the
same values as the GitHub secrets) set in the cloud environment's variables, `tools/unity/editor.sh` runs the same
editor as CI inside the session: `install` (6000.3.27f1 into `/opt/unity`, about 10 minutes and 8.4 GB; the
container has every system library it needs and reaches Unity's servers, verified 2026-10-28), `licence` (Unity's
Licensing Client: `--activate-all --include-personal` with the account, exactly CI's fallback), `test
editmode|playmode|all` (results and logs in `unity/test-results/`, captures in `unity/Screenshots/`, under xvfb
with software OpenGL as in CI), and `run <Class.Method>`. A Personal licence file (`Unity_lic.ulf`) does **not**
work here: it is bound to the machine that made it and Unity's server answers "Machine bindings don't match" (seen
in this session and in every CI run, where GameCI then falls back to the account). Start `tools/unity/editor.sh
install` in the background at the beginning of any session that will touch editor-side code. Rule: **no
editor-side change is pushed until `tools/unity/editor.sh test all` passes locally and the captures have been
looked at** (§7.0). CI then only confirms and builds the APK. Credentials are never printed, echoed into a log,
or committed, and the owner is never asked to paste them into the chat (they go in the environment settings).
The installed editor, the activation and `unity/Library` survive while the session's machine lives (including
an idle pause); a new session starts from a fresh clone and re-installs (§7.0, once per session).
Facts from the cloud-environment docs (2026-10-28): variables are `.env` format, one `KEY=value` per line (a
multi-line value must be quoted, hence base64); a running session reads changed values when its VM next restores
after idling, or a new session reads them at once; a setup script is cached only if it finishes in about five
minutes, so the editor install does not belong in the setup script; the VM has about 30 GB of disk.

### 7.2 Local checks (run before every commit that touches the thing)
```
export PATH=/home/user/.dotnet:$PATH DOTNET_CLI_HOME=/home/user
M=/opt/unity/6000.3.27f1/Editor/Data/Managed
dotnet test core/SecondFace.Core.Tests -nologo -v q                                   # Core (86+ tests)
dotnet build core/Game.Check.csproj  -p:UnityManaged=$M -nologo -v q                  # Game compiles
dotnet build core/Editor.Check.csproj -p:UnityManaged=$M -nologo -v q                 # Editor compiles
npm run check                                                                          # web validator (content)
python3 -c "import ast;ast.parse(open('tools/unity/people/mh_build.py').read())"      # any edited Blender script
tools/unity/editor.sh test all                                                         # the real editor (§7.0)
```
The `dotnet` checks catch compile errors in seconds; only the editor catches import, scene and rendering errors.
Blender scripts are run headless (`blender -b --python <script> -- <args>`); their preview renders check fit and
geometry before the editor import. The look is judged on the engine captures; at the end of a phase copy them
downscaled into `docs/evidence/unity/` with a line in its README.

### 7.3 CI
`android.yml`: *Build APK* (artifact `SecondFace-Android-APK`) and *Unity tests and screenshots* (artifacts
`Unity-test-results`, `Unity-screenshots`). The test job skips the `Heavy` category (`-testCategory "!Heavy"`:
the vegetation scatter is too slow on the CI machine's software renderer; it runs locally). Job caps: 90 minutes
for the build, 40 for the tests. Concurrency cancels an in-progress run on a new push: that is fine when the new
commit supersedes it, but **the Library cache is saved only when a job succeeds**, so after a change to packages,
import settings or post-processors let one run finish green before pushing again (later runs then start from the
cache instead of a 20–30 minute import). Watch a run with `gh run view <id> --json status,conclusion`; read
failures with `gh run view <id> --log-failed`; a GameCI step that fails with HTTP 403 fetching its CLI is
transient: re-run that job once (`gh run rerun <id> --failed`). The required captures per phase: P2 `terrain_*`, `materials_sheet`,
`place_shelter_*`, `place_frontier_*`, `people_lineup`, `portrait_*`, `motion_*`, `vegetation_*`; P3 `world_*`,
`place_*`; P4 `people_*`; P5 every UI screen; P6 `combat_*`, `travel_*`; P7/P8 the playtest scripts' end states.

### 7.4 On device
The owner installs the APK. Development builds show a debug overlay (three-finger tap): ms/frame (CPU/GPU),
draw calls, visible triangles, memory, the loaded chunk count, the tier. Every phase ends with the owner's
numbers from the densest place written into PORT.md §5.
*As built (step 23).* `Game.DebugOverlay` (IMGUI, top-left inside the safe area; three fingers down together or F3
toggles; shown at start in development builds and the editor; in every build until P13 removes it): frame mean and
worst over 2 s, CPU main and render thread and GPU ms (`FrameTimingManager`; `PlayerSettings.enableFrameTimingStats`
on; "n/a" where a driver gives none), draws, batches, set-pass calls, triangles, vertices, system/GC/graphics memory
(`ProfilerRecorder`), the world line (chunks, props, places, the view), tier, API, resolution, device, and the tour's
table. CI builds the APK with `-Development`. Until step 25 the app has no player: after the title card,
`Game.World.MeasureTour` raises the world round Shale (`WorldAssets` on the Boot scene's `Bootstrap`, wired by
*Second Face/Wire the Boot scene*; `BuildGuard` refuses a build whose Boot scene lacks it) and loops four views with
the game camera (FOV 28°, 14–26 m, pitch 40–58°, turning slowly) for 20 s each: the main street, the square from the
widest zoom, inside the saloon (opened), the town's edge over the scrub; each view's frames after 3 s give mean,
95th percentile, worst and mean draws. **The measurement is a screenshot of the overlay after a full lap (~80 s).**
`BootTests` runs the Boot scene end to end in the editor (one short lap).

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
- **`ModelImporter.importMaterials` obsolete**: use `materialImportMode`; for our models `ImportStandard` +
  `InPrefab` (keeps the slot names for the builders to bind).
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
- **PlayMode test hangs for ever in CI** (run 11, 67 minutes without a line): `WaitForEndOfFrame` never
  returns in `-batchmode`. Capture with `yield return null`, then a URP render request
  (`RenderPipeline.SubmitRenderRequest` with `RenderPipeline.StandardRequest`) into a RenderTexture; every
  `[UnityTest]` carries `Timeout(600000)`; the CI jobs have `timeout-minutes`.
- **Test job editor crashes during import** (run 12: `crn_threading_pthreads.cpp(194) sem_wait failed`, then a
  secondary audio crash on shutdown): the Linux editor's Crunch compressor fails in the GameCI container while
  importing crunched package textures. `Editor/Build/CiImportSettings.cs` turns crunch off for every texture in
  batch mode on Linux; the Android build is unaffected (ASTC).
- **PlayMode tests cannot build scenes** (`EditorSceneManager.NewScene` in play mode, run 13): the test class
  implements `IPrebuildSetup` and builds the six scenes before play mode; generated scenes load with
  `EditorSceneManager.LoadSceneAsyncInPlayMode`, additively, unloaded in `[UnityTearDown]` (they are not in the
  build list). A camera-only capture
  (`Camera.Render` to a RenderTexture) does not include UI Toolkit panels: UI captures (P5) render the panel to
  its own RenderTexture through `PanelSettings.targetTexture`.
- **Materials created inside import callbacks** (run 14: "URP Lit shader not found" on a cold import, then
  "AssetDatabase.CreateAsset is restricted during asset importing"): never bind or create materials in
  `OnAssignMaterialModel`. Imports keep slot names on placeholder materials (ImportStandard, InPrefab);
  `MaterialLibrary.Bind(go)` and `PeopleMaterials.Bind(go, dir)` bind after instantiating (builders, prefab bakes).
- **A logged error in `IPrebuildSetup` aborts the whole PlayMode run** ("Multiple unexpected errors", exit code 3,
  no results): `LogAssert.ignoreFailingMessages = true` at the top of `Setup()`; a `TerrainData` needs
  `SetDetailResolution` or it logs "zero detail resolution" as an error.
- **A person's bones vanish on export** (run 14: p4 had no `LeftUpperLeg`): `use_armature_deform_only` drops bones
  that deform nothing, and proxies whose reference vertices were hidden beneath them had no weights at all. Proxy
  weights now come from every base vertex (hidden and helper vertices included), blended over the three references;
  the export keeps every bone.
- **PlayMode run never starts a test** (run 15, 58 minutes idle): the runner opens its init scene before
  `IPrebuildSetup`; a setup step that opens other scenes must restore the runner's scene
  (`EditorSceneManager.GetSceneManagerSetup` / `RestoreSceneManagerSetup`) or play mode starts on a scene with no
  runner. Evidence in the log: `Loaded scene 'Temp/__Backupscenes/0.backup'` followed by nothing.
- **Material slot names lose their colon** (local editor, 2026-10-28): Blender's FBX round trip turns
  `mat_<kind>:<texture>` into `mat_<kind>_<texture>`, so a parser keyed on ':' finds nothing and people render
  untextured grey. `PeopleMaterials.Build` matches the known kinds followed by ':' or '_'.
- **Kit pieces and nature models lay on their sides** (walls flat on the ground, roofs on end, trees upside down
  under the terrain): Blender's FBX exporter keeps the mesh Z-up and adds a compensating 90° rotation on the root;
  every builder that sets `transform.rotation` overwrites it. Unity's `bakeAxisConversion` does not help (the file
  already declares Y-up), although an earlier entry here claimed it did: the frontier captures stayed broken until
  2026-10-28. The fix is on the Blender side: `bake_space_transform=True` in `kitlib.export_fbx` and
  `models_bake.export_variant` writes Y-up mesh data with an identity root (people keep their rig's own handling).
  Check with `Diagnostics.Report`: root rotation (0, 0, 0), height on Y.
- **A partial texture fetch emptied the manifest** (`assets.py --only` once rewrote `library.json` to three
  entries and three scenes silently lost their terrain): the manifest now always lists everything on disk.
- **A Personal licence file only works on the machine that made it** ("Machine bindings don't match", in every CI
  run too, where GameCI falls back to the account): activate with `UNITY_EMAIL` / `UNITY_PASSWORD` through the
  Licensing Client (`--activate-all --include-personal`), as `tools/unity/editor.sh` does.
- **The editor started without `-projectPath` makes the working directory a project** (it created Library/,
  Packages/, ProjectSettings/ at the repository root once): always pass a project path; licence checks use a
  throwaway blank project.
- **The first local import rewrites metas and settings** (import settings applied by post-processors, asset
  version upgrades, metas for folders and sidecar files): commit them, so CI imports exactly what the session
  verified and GUIDs stay stable.
- **CI run cancelled by a push**: concurrency `cancel-in-progress`; wait for the run first.
- **Workflow files would not push** (the token lacked the `workflow` scope): fixed by the owner on 2026-10-28;
  the session now edits `.github/workflows/android.yml` itself and keeps `tools/ci/android.yml` identical.
- **The disk fills up** ("No space left on device" with low "Used"): the allowance (about 30 GB) is spent, not
  the machine broken. Delete what can be rebuilt (§7.1 budget); never start the editor install with less than
  10 GB free.
- **A GameCI step fails with HTTP 403 fetching its CLI**: transient on GitHub's side; re-run the job once.
- **CI ran 0 tests and called it a pass** (run 40663317991): GameCI hands `customParameters` to Unity with their
  quotes, so `-testCategory "!Heavy"` became the category `"!Heavy"` (quotes included), which matches nothing.
  Write `-testCategory !Heavy` unquoted (reproduced locally: quoted 0 tests, unquoted 7 PlayMode tests with the
  Heavy one excluded). The test job now fails when a run executes nothing, and `editor.sh` flags a total of 0.
  Any new CI argument is first tried in the session's editor exactly as CI will pass it.
- **A person renders black and glossy** (p3, local editor): Blender cuts datablock names at 63 characters without a
  word, so a slot `mat_skin:<id>__<long skin name>_d` lost its tail and Unity found no texture (the untextured
  fallback colour is a dark fibre). Keep texture names short (`<id>__skin_d`); `mh_build.slot()` raises on a slot
  name over 63 characters.
- **A UI Toolkit page overflowed its card instead of scrolling** (the pack's stat rows ran under its buttons): flex
  items do not shrink by default in UI Toolkit (Yoga's `flex-shrink` is 0, not the web's 1); a `ScrollView` that should
  take the space left needs `flex-grow: 1; flex-shrink: 1; flex-basis: 0`, and its container `overflow: hidden`.
- **A figure drawn the frame its clothes changed shows the old and the new together**: `Wardrobe` takes garments
  off with `Destroy`, which waits for the frame's end. Draw again the next frame (`PackScreen` schedules it).
- **"Covers more of the frame" is no test of a coat**: a dark dye sits within the backdrop's tolerance. Compare the
  draws before and after a change (`UiTests.Changed`) instead of counting pixels off the backdrop.
- **Every avatar failed and nothing failed** (local editor): after the jaw bone left the rig, the people's `.meta`
  files still held the first import's bone map, so every import logged "Avatar creation failed: Transform 'Jaw' for
  human bone 'Jaw' not found" and the tests passed on fallback framing. The importer now maps the bones afresh on
  every import, and `editor.sh` prints such lines as `LOG PROBLEM` after every run (the old grep missed it because
  the error did not start a line).
- **Every mouth gaped once the people animated**: body clips carry no jaw curves and Humanoid retargeting then poses
  a mapped Jaw open. The rig has no Jaw (merged into Head); speech uses the expression shapes.
- **Portraits framed chests and empty sky**: an animated head moves between aiming and capture (long frames in
  batch mode); the portrait test holds the pose (`Animator.speed = 0`).
- **Five of six people stood in T-pose in the walk captures**: the people scene builder created the animator
  controller once per person at the same asset path; each creation destroyed the controller the previous people
  held. Build shared assets once, before the loop. Test people also animate with `AlwaysAnimate` (captures render by
  request, so no renderer ever counts as visible and culled animators never pose).
- **Alpha thrown away on import** (people textures and foliage cards): the generated texture metas carry
  `alphaUsage: 0` (no alpha; the template was made for terrain textures), so hair cards rendered as solid sheets and
  a skin's smoothness alpha read as 1 (every face wet and glossy). The people and kit importers now set
  `alphaSource = FromInput` themselves; a meta's word is never trusted for an import rule.
- **Grey diamonds in the pupils, grey speckled brows** (local editor): the people importer recalculated normals
  (80° smoothing), which bent them in the eye's recessed pupil and on the strand brows and lashes; at a grazing angle
  they reflected the sky. Diagnosed by rendering the same FBX in Blender (correct) and the eye unlit in Unity
  (correct). People import Blender's normals now. Generated materials are re-configured on every build, so a code
  change to a material reaches the session's cached `.mat` files too.
- **The base mesh's `helper-hair` group is not a scalp cap**: it is 198 loose strips from the crown to the chest.
  Stubble for shaved and balding heads is painted into the person's own skin texture (§6.C.2).
- **`grep -i exception` flags every `Debug.Log`**: in batch mode each log line carries a stack trace through
  `ExecuteEnumerableAndRecordExceptions`. Grep the logs for `error CS|^Error|Exception:|NullReference|Failed to`
  instead.
- **The test job cannot post its check** ("Resource not accessible by integration"): the default `GITHUB_TOKEN`
  is read-only; the test job declares `permissions: contents: read, checks: write`.
- **Black curls in every pine crown** (trees.py preview, 2026-10-28): the branch card itself was wrong, verified
  only as "a card exists". Blender's `image.pixels` rows run bottom-up, so `np.rot90(k=1)` on them turned the card
  clockwise and put the root at the top; and the scan's variant is one object carrying bark, twigs and dead
  branches, so "keep objects with a twig material" kept everything, dead wood included, inside a slab framed on the
  vertex median instead of the trunk. Fix: `cards.py` deletes faces by material, finds the trunk and the densest
  branch direction, crops to the alpha and flips rows to top-down before any numpy image work. Judge a card on a
  light background, its root edge marked, before using it.
- **Dark fringes on cut-out foliage at a distance**: transparent texels rendered by Cycles are black, and mipmaps
  average them into the edges. Dilate the colour into the transparent texels (cards.py does 32 px).
- **Every Addressables group carried its own copy of the textures** (first bundle build, 2026-10-29: 126 MB for the
  shelter kit, 98 MB for the frontier kit): a group bundles the dependencies of its entries. The library materials
  are their own group, one bundle each; kit bundles now hold meshes only (1.1 MB for all kits).
- **`Mobile_RPAsset.asset` changes after a local bundle or player build**: URP rewrites its shader-prefilter fields
  for the active build target (Linux in the session). Revert it (`git checkout -- unity/Assets/Settings/Mobile_RPAsset.asset`)
  rather than commit Linux values over the Android ones.
- **`core/Editor.Check.csproj` cannot see package assemblies** until the editor has opened the project once: it
  references Addressables from `unity/Library/ScriptAssemblies` when present. Run the editor first in a fresh session.
- **An editor test run hangs on a compile error when code is edited during it**: the screenshot tests' setup calls
  `AssetDatabase.Refresh`, which compiled half-written code mid-run (2026-10-29). Never edit files under `unity/`
  while `editor.sh` runs; write docs instead, or stop the run first.
- **Every later editor run waited forever after a killed one**: `editor.sh` held its install lock on fd 9 and the
  Xvfb it started inherited it, so a stray Xvfb kept the lock. `install()` now closes fd 9 before anything starts;
  after killing a run, also kill its `Xvfb` (`pgrep -fa Xvfb`).
- **The compile check passes where the editor fails** on assembly references: `core/Editor.Check.csproj` references
  every assembly, the editor only those in the `.asmdef` (`GPUResidentDrawerMode` lives in
  `Unity.RenderPipelines.GPUDriven.Runtime`). And a name may collide with Unity's (`UnityEngine.Rendering.GraphicsTier`;
  ours is `RenderTier`). The editor run is the judge.
- **Every capture of a test showed the same frame** (2026-10-29): an earlier test's camera, tagged MainCamera, stayed
  in the scene and `Camera.main` found it first. PlayMode test classes that build scenes in code clear their cameras,
  lights, terrains and world objects in a `[UnityTearDown]` (`WorldTerrainTests`). Identical file sizes across
  captures are the tell.
- **A ground texture tiled as a grid of spots from mid range** although the shader mixed two looks: the texture itself
  had a blotch half a tile wide (`aerial_sand`), and footprints or tyre tracks repeat however the UVs turn. Look at
  the albedo tiled 2 × 2 before blaming the shader; `assets.py` flattens terrain albedos (`flatten`), and sources with
  marks are replaced, not fixed.
- **"Shader Unsupported … All subshaders removed" and "dependency … not found"** on the first import of the copied
  terrain shaders are import-order noise (each was imported before the others it names); the shaders compile and
  render on the next import. Check the capture, not the warning.
- **Road strips did not render at all**: their triangles were wound counter-clockwise seen from above, Unity's back
  face, so every strip was culled. Unity's front face is clockwise; `RoadStripsLieOnTheGround…` now checks each
  triangle's facing (cross(b−a, c−a).y > 0).
- **Terrain chunks built without `SetNeighbors`** shade their edges alone and show a line where two meet; the streamer
  stitches, tests that build chunks by hand must too.
- **A terrain detail mesh draws only its first submesh** (step 19c): a scan with stem, twig and leaf materials showed
  bare stems. One material per detail prototype; merge or rebuild the mesh.
- **Upright grass cards vanish from the iso camera** (step 19c): the terrain's own grass mode (and any upright card)
  is a sliver from 50° above. Tilt the cards outwards (a star) or use domes of cards facing out.
- **Scanned bushes read as twigs at game scale** (step 19c): fine-leaved scans are thin and dark once reduced; a
  readable bush from above is a mound with a lit side and a shadow side (domes of leaf cards with spherical normals).
- **Detail distance shorter than the frame** (step 19c): at 75 m the scrub ended in a line across the top of the game
  camera's frame; the frame's top is 90–140 m off. Detail distance 150 m with a dithered fade.
- **Every road ran to a town's centre** (step 20): world.py starts roads at place centres, so the trail strips fanned
  across the town's streets as wedges of gravel. `RoadStrips` stops a way at a place's edge (fade 6 m); routing roads to
  a place's exits is the proper fix.
- **Two houses in a row look like one wall with a gate** (step 20): their walls line up across the alley, and a gap in a
  straight wall line read as a doorway closed the alley into a "room". A doorway needs a room behind it, and gaps as wide
  as the room on two opposite sides are an alley (`PlacePlan.FindRooms`).
- **A runtime NavMesh from render meshes needs readable meshes** (step 20): "Source mesh … does not allow read access"
  (it works in the editor, not in the player). Kit models import readable; non-readable sources stand in as their
  bounding boxes (`PlaceNav`) — never for a porch or an awning, whose box closes the way under it.

- **A river on the natural ground's level dries out or cuts gorges** (step 22): the Wet's relief noise (±15 m over a
  kilometre) under a 110 m river left a falling level kilometres below its banks, or banks under its water. Rivers lie
  on valley floors: `world.py` fades the relief out near the river, then a running-minimum level and a bed cut for it.
- **A river's bank raised to its level stood as a ridge under the sea** (step 22): at the mouth the ground is already
  under the water, and raising the bank to the water's edge drew two pale stripes along the channel. Raise only to
  contain a river above the sea.
- **Batch-mode cameras render only on request** (step 23): in `-batchmode` tests nothing draws between captures, so
  render counters read 0 and frame times are the frame-rate pacing; and a capture taken inside a measured window
  (15 s of software rendering) is one enormous frame. Measure on the phone; capture outside measured windows.
- **Opening a scene in an editor script unloads the assets loaded before it** (step 23): references held in C#
  read as null afterwards (the asset on disk is fine). Read what you need before `EditorSceneManager.OpenScene`.
- **The project uses the Input System only** (`activeInputHandler: 1`): `UnityEngine.Input` throws. Read
  `Touchscreen.current` / `Keyboard.current` (and reference `Unity.InputSystem` in the check projects).
- **Collapse decimation cannot reduce strand or card meshes** (P4.1a): brows of 37 K strands only fell to 25 K;
  each strand is an island. Thin whole islands instead (`mh_build.thin`).
- **mh_build's metas are templates**: a rebuild rewrites every model and texture `.meta` in an older format with the
  same GUID; Unity's own committed metas are the ones to keep (`git checkout` the metas after a rebuild).
- **A model's materials bound in the editor do not reach a runtime instance** (step 25): the P2 people's slots are
  placeholders that `PeopleMaterials.Bind` replaces on scene instances; `Instantiate` of the FBX at runtime stood white.
  Runtime people come from bound prefabs (`WorldAssetsBuild.Person` → `Prefabs/people/`).
- **Cinemachine 3's `BindingMode` lives in `Unity.Cinemachine.TargetTracking`**; `TrackerSettings` is a struct (copy,
  change, assign back).
- **A runtime NavMesh from render meshes walks on water**: the water sheet is a mesh; mark it `NavMeshModifier.
  ignoreFromBuild`.
- **Foam by depth is wide on a gentle beach** (step 22): 0.45 m of depth spans ~13 m of a 1:30 shore, a white strip
  like snow. Foam within ~0.2 m of depth, broken by noise, faint on a river.
- **The bootstrap outlives its scene** (CI run 54): `Bootstrap` and the overlay are `DontDestroyOnLoad`, so a test that
  loads the Boot scene and only unloads the scene leaves the app raising the world; its walkabout then sets the walker
  down in a later test's world on that test's destroyed camera. Every test that boots the app ends with
  `BootTests.Clear()`.
- **The monk robe "hood" garments are the hood alone** (P4.1b): `donitz_monk_robe_hood`, `_hood_down` and `_hood_off`
  are fitted to the head and shoulders only and leave the wearer naked; wear one over `donitz_monk_robe`. Check a
  garment's fitted extent before briefing it (its reference vertices' heights on `base.obj`).
- **Hair cards stand through hats** (P4.1b): a brief with a hat takes cropped, buzzed or no hair.
- **A garment's scale vertices are not local** (P4.2a): MakeHuman fits a proxy with per-axis scales measured between
  two reference vertices that can be on the head even for boots; refitting a proxy for a face shape with those moved
  resized whole garments. Refit with the rest scale.
- **The session's git proxy refuses tag pushes** (step 25): `git push origin play-walkabout` hangs up and GitHub
  has no tag. A playable build is released by running the Android workflow by hand with `release: play-<name>`
  (`workflow_dispatch`); its `release` job runs only after that run's tests and APK passed and creates the tag at the
  run's commit with the release. A pushed `play-*` tag (from a machine that can) still works.
- **The model meta template turns on lightmap UVs** (`generateSecondaryUV: 1`, P4.3a): Unity's unwrap wrote over
  the people's uv1 (the wardrobe's base indices) and split the body from 14.5 K to 21 K vertices. People import with
  it off (`PeopleImportPostprocessor` version 8); `WardrobeBuild` checks every body level's indices are whole.
- **Skin stands through a tight garment where its own list skips it** (P4.3a): a sweater's `delete_verts` and fitted
  vertices left the nipples visible through it. `close_holes` hides a body vertex when 60 % of its neighbours are
  hidden (four rounds): islands fill, the garment's edges barely move. Applied to every person's build.
- **An empty state on an override layer holds the default pose** (P4.4a): the gesture layer at weight 1 resting in
  an empty state (write defaults on) overwrote the masked trunk and arms, and undid the base layer's foot planting.
  Rest the layer at weight 0, states without write defaults, weight up only while a clip plays.
- **Batch-mode frames are a few milliseconds** (P4.4a): a test waiting 25 frames for a 0.25 s fade saw 15 % of it.
  Wait by game time (`Time.time`). And an Animator at speed 0 barely re-evaluates, so its IK hardly runs: compare two
  people in step instead of freezing one.
- **Judge hair from the front at portrait distance** (P4.2a): two braids passed in the lineup (from 7 m) and showed a
  swept fringe in the close-ups. Brief a hair only after seeing it in `people_sculpt_*` or a portrait.
- **A dark triangle under one eye** (P4.7a) was the nose's own shadow: the hair test scene's sun came from the side
  of people facing away from the camera's usual side. Not a mesh fault (Blender and LOD0 forced showed the same);
  test scenes light faces like the cast lineup (sun front left, fill), and a portrait has its own studio light.
- **Generated hair jumped off the scalp in spikes** (P4.7a): the rig's head weights cover the base's helper geometry
  (joint cubes, hair and clothing helpers) and the ears; projecting onto "the nearest head vertex in this direction"
  hit them. Project onto the skull's skin only, without the ears, and blend the radius over the nearest directions.
- **One nearest base vertex plus an offset does not follow a reshaped head** (P4.7a): points between base vertices
  (the subdivided shell) sank under the skin of fuller heads. Tie each vertex to the triangle under it with
  barycentric weights, as MakeHuman's own proxies are.
- **Measure the hair weight once** (P4.7a): re-evaluating `hair_weight` on subdivided points took the ear rule's
  median from a different crowd of points and cut bays into the shell above the ears. Interpolate it from the base.
- **A hairline needs width to look broken** (P4.7a): a fade by hair weight spans ~5 mm, and strand-wide starts in the
  atlas (0.1–0.4 mm on the head) average out, so the shell's edge read as a cut line. Fade over 1.2 cm along the
  scalp, strands starting in clumps a few millimetres wide. And generate no more cards than the budget keeps:
  `thin` dropping 40 % of them at random showed the hairline through the gaps as bald patches.
- **BVH channel order is intrinsic, Blender's euler order extrinsic** (P4.8): channels `Zrotation Xrotation Yrotation`
  mean M = Rz·Rx·Ry, which is `to_euler('YXZ')` in Blender; `to_euler('ZXY')` scrambles every large rotation (the arms
  first). Check a converted clip as a stick figure (front and side) before anything is retargeted.
- **A Humanoid clip retargets against its file's default pose** (P4.8): the FBX exporter writes each bone's current
  pose as its default, and Unity builds the clip's avatar from it; Unity levels the arms of a non-T-pose but not the legs
  or spine. Leave the scene on a keyed T-pose frame outside the baked range when writing a clip.
- **`new HumanDescription()` zeroes the muscle settings** (P4.8): set Unity's defaults (twist 0.5, stretch 0.05) when
  resetting the mapping in an importer.
- **Turn Foot IK on for Humanoid locomotion states** (P4.8): without it feet float (or sink) by the difference between
  the captured and the target leg, and a foot IK goal read in `OnAnimatorIK` is not where the ankle is drawn. Bone
  transforms read in `OnAnimatorIK` hold the last frame's solved pose: never build IK targets from them (it feeds back).
- **Re-layer a figure after every change of look** (P5.3i): the studio camera draws layer 31 only, and a wardrobe piece
  instantiated after `Figure.Layer` (a hair put on by the look) stays on layer 0, unseen. `Figure.Look` re-layers.
- **Judge a hair choice bare-headed** (P5.3i): `sf_matted` was generated for under a wrap (locks below it only) and
  read as a bald crown with strands when chosen alone. A hair offered at creation covers the scalp by itself.
- **A card levelled to face outwards stands up on the crown** (P5.3i): zeroing the facing's height turns a lock lying
  on top of the head edge-on, a fin. Blend from the head's outward to level by height.
- **A macro step from a lean base barely shows** (P5.3i): MakeHuman's heavy and muscled targets start at 0.5, so a body
  at weight 0.3 moved +0.3 only drops part of its thin target. Step further up than down.
- **`OrbitRig.Snap` puts the camera at its goals** (P5.3j): setting `Yaw` and then snapping undoes the yaw. Use `View`.
- **Picture a save a frame or two after the walker is set down** (P5.3j): a render request on the game camera in the
  frame Cinemachine has not placed it yet asserts on an unnormalised rotation.
- **`.sf-safe` grows** (P5.3j): the safe-area class sets `flex-grow: 1`, so a sized band in a row fills the row; give it
  `flex-grow: 0`. Labels inside a `Button` inherit its centred text: align them on their own container.
- **Scale text with USS variables** (P5.3j): custom properties inherit, so a class on the root that redefines every
  size variable re-sets all the words; literal font sizes cannot be scaled (the theme has none now: keep it so).
- **Name MakeHuman's units as they are** (P5.3l): the expression list asked for `mouth-smile`, `brow-down` and others
  that MakeHuman does not have, matched by prefix, so they were skipped without a word. List exact names and count the
  shapes after a build (`blend shapes` in the log).
- **The sky refreshes on game time** (P5.3l): `SkyController` steps on `Time.deltaTime`, so with time stopped a new hour
  shows only after `Apply()`.
- **The default theme's pressed and focused buttons are grey** (P5.3l): a button that stays on screen after it is
  pressed (a chip) keeps the default `:active`/`:focus` background over ours; give every button kind its own colours
  for those states. A wrapped row of chips in a fixed-height column is laid out too short and overlaps what follows:
  scroll the column and keep its children from shrinking.
- **`new Button(Method)` with a method that returns a value** picks the `Background` overload and fails; pass a lambda.
- **A test that adds a virtual pad** needs `Unity.InputSystem` in the test assembly's references.
- **Wait for a walk as long as it takes** (P6.1): a container across the town is more than ten seconds' walk, and a use
  that waited ten seconds opened it from afar. Wait up to 30 s, then check the reach before using anything.
- **A place's markers live in its prefab** (P6.1): a new kind of marker from Core `PlacePlan` reaches the game only
  after `Second Face/Build places` (`PlaceBuilder.Build`, or `editor.sh run SecondFace.EditorTools.PlaceBuilder.Build`);
  commit the rebuilt `Prefabs/places/*.prefab` with the change (their file ids churn on every build, so otherwise
  revert them).
- **Find where a captured clip does its work before playing it** (P6.1): the pickup clip stands still for its first
  second and is upright again long before its six seconds end; probe the hips' height over its frames in Blender
  (`tools`-less: import the FBX, sample `Hips` every few frames) and play the part that matters (an offset in, a speed,
  an exit time), or the walker stands about before and after.
- **Material colours the ground shares vanish on it** (P6.1): undyed burlap on the desert gravel was invisible from the
  game camera; darken or dye whatever lies on the ground.
- **A culled animator keeps a stale pose in batch tests** (P6.1): with `CullUpdateTransforms` the states advance but
  the bones are not written while no renderer is visible, and in `-batchmode` tests none ever is; anything that reads
  the pose (a sit's hips, IK, a portrait) reads the last pose rendered. The player's walker always animates; probes of
  a body in an empty test scene set `AlwaysAnimate` and wait in real time (batch frames are about a millisecond long, so
  a frame count is no wait at all).
- **Time passed by a screen goes through the world's clock** (P6.1): while walking the `TimeService` leads and the game
  state's minutes are only written at a save; read the clock into the state before a rest or a hunt, set it back after,
  and re-light the sky by hand (the screen stops time, so the sky would not turn by itself).
- **Two NavMeshes over the same ground do not join** (P6.2): a place that loads before the world's mesh exists (it
  loads while the walker waits) builds its own, and with both in, a path from the street ends just outside a door
  (`PathPartial`) while a raycast along the same line passes. Drop the places' meshes when the world's comes. To see a
  mesh, write `NavMesh.CalculateTriangulation()` round the spot to a file and draw it: two voxel grids (0.1 m and
  0.15 m vertices) overlapping is the tell.
- **Ask an agent for a path once** (P6.2): `SetDestination` every tick restarts the search (a far or blocked one takes
  many frames, so the agent never moves); ask again only when the target moves, and not while `pathPending`. A partial
  path's search costs the whole reachable mesh: do not repeat it every tick. `ResetPath` on an agent that is not on a
  mesh throws: only call it after a `Warp` that succeeded.
- **A load far off while walking streams round the old walker** (P6.2): the walkabout set the world's focus on the
  walker every frame, so a load's `WaitAround` at the new spot was undone the next frame and the ground there never
  came; keep the focus where the walker is going until they are set down.
- **New UI strings need the localization tables rebuilt** (P6.3): `ui.tsv` is read into the Unity Localization tables
  by `Second Face/Build localization` (`editor.sh run SecondFace.EditorTools.LocalizationBuild.Build`); a PlayMode test
  that runs without it reads "No translation found". Commit the regenerated `UI/Localization/Tables/*.asset`.
- **Pick the sun by kind, not by luck** (P6.3): `FindAnyObjectByType<Light>()` returns disabled lights too, and once
  the portraits' studio was made before the world (its lights off between pictures), the sky drove the studio's fill
  while the scene's own light stayed at noon: every night in the walkabout was day, and nothing failed. Take the enabled
  directional light of the scene, never one on the studio's layer, and check a night capture for night. A component
  that makes a default of something in `Awake` makes it before anyone can hand it one (`AddComponent` runs `Awake`
  at once): make defaults at first use.
- **Nothing but the place goes under a place's root** (P6.2): under the ground the place switches off every renderer
  of its own that is not in an underground building (its surface), and people instantiated under its root went dark
  with it in the shelter. People stand under their place's people group (`people_<place>`).
- **A test keeps a place's people by asking again** (P6.2): a game begun or loaded brings every place's people anew,
  so a `Townsfolk` held from before is an empty, destroyed group; fetch `People.Town(id)` after the load.
- **The local compile checks do not build the PlayMode tests**: a test's missing `using UnityEngine.UIElements` (for
  `Q<T>`) only shows in Unity's own compile; read `playmode.log` for `error CS` when a run writes no results.
- **A macro shape changes the body's height too** (P4.13): MakeHuman's ancestry macros make a body 6.4 % shorter
  (Asian) or 4.3 % taller (African), age to 70 0.6-1.2 % shorter; a person scaled to their stature on top of that
  shape was counted twice (a 165 cm labourer looked like a boy). Every whole-body shape is built at the base's own
  stature (`keep_stature` in mh_build: the shaped body scaled about the ground until its crown is the base's), and a
  person's height is only their `Stature`.
- **An enclosed patch is not always under the cloth** (P4.13): hiding every small patch of body a garment encloses
  hid the bare fingers past a fingerless glove (115-175 vertices each). A patch is hidden only when each of its
  vertices lies within 3 cm of where the garment sits over the body (`cover_points`: its vertices at their weighted
  body vertices). A single-vertex reference in a .mhclo names only that vertex (`ref_vertices`), not vertex 0.
- **The content's `frame` is a sex, not a build** (P4.13): the web game marked men "broad" and women "narrow"; read as
  a build it made every man taller and broader than his draw. `Routine.Male` reads it; `Bodies` ignores it.
- **A garment's hidden list misses what it encloses** (P4.13): a body vertex is hidden when a garment vertex refers to
  it, and a sweater refers to nothing on the nipples (50 vertices each), so a fuller bust pushed skin through the
  cloth. `close_holes` hides every patch of body the garment encloses whole up to 200 vertices (navels 18-30; the
  smallest real opening, a foot, is 1000+). Look at a close capture of the fullest figure after any body change.

- **Fingers flat and spread on everyone (P4.14, the owner's screenshot).** The capture clips carry no finger
  curves, and a Humanoid finger no clip drives keeps the mesh's bind pose (MakeHuman's: straight, spread), not a
  relaxed one; the P4.8 note said otherwise and was never checked at hand size. `HandPose` curls them after the
  animation. Check hands in every people capture at close range.
- **A woman with a man's jaw (P4.14).** `Sculpt.Reroll` drew every slider sex-blind at up to full strength: a square
  head, a full jaw, a wide chin and a thick neck landed on women. The reroll now folds each sex-marked slider into its
  sex's range (`BySex`) and caps the head shapes; `Bodies.For` and the creation pass the sex. A dimorphism rule that
  is not in the random draw is not in the game.
- **Cloth shrink-wrapped to the bust (P4.14).** A garment refitted to a body shape follows the skin into the cleavage
  and the fold under the breast. `drape()` in mh_build pushes the refit outward under a cone (7 cm reach, 0.45
  slope) for the bust and chest shapes, so the cloth spans them. Any shape that makes a hollow needs the same.
- **Retiring a garment can leave a role with no top or legs.** With the chest-pocket shirts gone, the rich men had no
  `top` (the outfits test caught it: `gilded/m/3 legs,feet`); the pilgrims lost their only trousers. Tag a plain
  piece into the role before retiring the last one, and run `npm run check`.
- **A frozen, culled Animator poses people wrongly in tests (P4.14; the owner's "weird arm and hand position").**
  An Animator in its default culling mode writes no bones while no camera sees its renderers (batch mode: the
  captures render on demand), so the first evaluated frame, a blend out of the rest pose with the hands in front of
  the hips, stayed on the body and was frozen by `speed = 0`. Every test that poses a person sets
  `cullingMode = AlwaysAnimate` and captures live; the game's own people (seen by a real camera) were never wrong.
- **The pants through the sweater.** Two garments refitted to the same body intersect where the inner one is bulkier
  (a waistband, a boot shaft); the layer stand-off alone cannot fix it. The cover mask (above) clips the inner garment
  under the outer one, by body vertex; any new garment must carry the `BaseIndex` uv for it.
---
- **Brows that vanish on fair skin (P4.15).** The strand brows are dropped at import (they drew as dots), so the brows
  were only the ones baked into the skin, and SecondFace/Skin's tone lifts a fair skin towards white, brows and all.
  Brows are drawn after the tone now (`BrowAt`, `_Brow0/1`, `_BrowColour`), never baked (`skin_look.brows: 0`). The
  same lift hid the shaved scalp's colour: the bake's stubble is the base's dark brown, recoloured to the person's hair
  by how much it darkens the bare skin (`_BareSkin`, measured on the forehead by `WardrobeBuild.BareSkin`).
- **The disk filled during a Unity import (P4.15).** The session's disk allowance (about 39 GB with the Unity editor)
  ran out while Unity reimported the rebuilt bases: "Creating directory Temp/UnityTempFile-… failed" and "Build asset
  version error" in run.log, the import half done. Free space first (research downloads in the scratchpad; Unity's
  `Library/BuildCache`, 1.2 GB, regenerated by the next player build, only while Unity is closed), then rerun the build.
  Keep 3 GB free before a base rebuild and its import.
- **The skin's head frame lay on its side (P4.15).** `WardrobeBuild.RestMap` assumed the body mesh's own space has Y up;
  a skinned mesh keeps the exporter's axes, and the bases' height runs along -Z there. Every mark drawn in the frame
  (scars, tattoos, freckles, beards, and the new brows: a red-brow diagnostic drew them as a vertical stripe on one
  temple) landed rotated. The frame now takes up from the body's long axis towards the head bone and the face's way
  from the head bone to the eyes (`Diagnostics.HeadFrame` logs the frame at the head's top and nose). Check marks with
  a coloured diagnostic before tuning them; the bare-skin sample had also been taken from the wrong place.
- **Empty metas after a full disk (P4.15b).** The disk-full import of P4.15a left six garment `.meta` files at zero
  bytes ("does not have a valid GUID and its corresponding Asset file will be ignored") and two more garments with a
  broken import artifact ("Unknown error occurred while loading VirtualArtifacts/Primary/<guid>"). Unity skipped them,
  `WardrobeBuild` quietly left them out of the sets, and every woman whose outfit named the fisherman sweater (also
  the women's own starting top, so the Dresser had nothing to fall back on) rendered topless; some men went barefoot.
  An empty meta was even committed. Guards now: `npm run check` fails on any empty `.meta` under `unity/Assets`;
  `WardrobeBuild` logs an error naming every manifest garment that did not load; `WardrobeSetTests` holds each set to
  its manifest; the Dresser takes a stand-in of the same slot for a garment the set lacks. Restore empty metas from
  git (their GUIDs are referenced); a broken artifact is rebuilt only when the importer's inputs change (a forced
  reimport reuses it): change the meta's `userData`, then reimport (`Diagnostics.ReimportPeople` with `SF_REIMPORT`).
- **Every level of detail drawn at once (P4.15b).** A garment's model carries its own LOD group. `Wardrobe.Put` moved
  its renderers onto the person and destroyed the model's root at the frame's end; when that LOD group went, it took
  the renderers out of the person's group, so LOD0, LOD1 and LOD2 all drew from then on: z-fighting blotches on the
  clothes, three times the cloth's draw cost, and the coarse levels' slivers as a fin of cloth beside a leg. Only in
  play mode (the edit-mode builders destroy at once), so an edit-mode probe looked clean. The model's LOD group is now
  destroyed before its renderers join the person's (`AGarmentDrawsOneLevelAtATime` renders a close-up and checks).
- **Decimation that bridges two parts of the cloth (P4.15b).** Blender's collapse decimation at a fixed ratio left
  slivers standing up to 18 cm out of some garments' coarse levels (a trouser's LOD2). `mh_build.decimated` now
  measures each level against the whole surface (each face's centre and edge midpoints to the nearest point, BVH) and
  reduces less until it keeps within 2.5 cm (LOD1), 5 cm (LOD2) or 1 cm (a capped LOD0); the log names every part it
  had to spare. To compare levels in Unity, bake each renderer and bring it into the model's space first: each level
  has its own transform (`Diagnostics.GarmentLods`).
- **A beard on the nose; blond brows on a brown man (P4.15b, the owner's screenshot).** The beard's masks in
  SecondFace/Skin took the nose's tip (y -0.40 in the head frame) for the mouth, so the moustache band and the lips'
  cut-out sat on the nose and the beard grew over it. Landmarks are now measured, not guessed: `Diagnostics.HeadFrame`
  prints the face's relief in the frame (eyes +0.08, nose tip -0.40, nose base -0.51, lips -0.61 to -0.73, chin
  -0.85). The colours: an authored grey (the web game's `hair.color`) was taken as the hair's own colour, so the brows
  were derived from grey and read blond, and the beard was one blended grey tint, warm, that read blond on brown skin.
  Now an authored grey says how grey, not what colour: the brows keep the person's own shade and grey well after the
  head; the beard keeps its pigmented hairs (`BeardBase`) and a share gone white (`BeardGrey`), drawn hair by hair
  (salt and pepper); the palette's greys are neutral. Greying spreads by a personal pace factor (lognormal), so years
  before a people's onset there are only a few grey hairs, and the beard follows the same curve about six years ahead.
- **The hairline: drawn by eye, cut along faces, dropped at a distance (P4.16; the owner: "the hairline looks
  awful").** Three faults. (1) The hair weight's hairline model (`hairgen.hair_weight`, the Skin shader's `Hairline`)
  was drawn by eye; measured against real grooms (the roots of the Defender demo's hairstyles, the 3rd percentile of
  their elevation per 10 degrees of azimuth) it sat up to 18 degrees high at the temples and sideburns and 20 to 30
  degrees high behind the ears, where real hair runs down to the nape's corners: bare bays behind the ears. (2) The
  shell kept or dropped whole faces of the fine scalp, so its edge stepped in 7 mm stairs. (3) At the game camera's
  level (600 triangles) the shell, one island bigger than the whole budget, was dropped by `thin()`, which keeps or
  drops islands whole: from play distance everyone's hair was a dozen loose locks over the painted stubble. Fixes: the
  measured table (`HAIRLINE_AZ`/`HAIRLINE_EL`, the shader's the same; the bake's stubble follows it); the shell cut along
  a smooth, slightly irregular contour of the hair weight (`clip_patch`, `wobble`); hair levels decimate the shell to
  half their budget and thin the rest (`mh_build.layer_down`; budgets 16 K close-up, 1.6 K, 400); the grooms' baby
  hairs and front wisps as fine cards on every drawn-back style (`groom.py`). Check a style's levels by islands
  (largest island and count per level), not by the triangle total alone.
- **A vest that read as bare skin under straps (P4.16b).** The generated harness vest was dyed at runtime like any
  plain cloth, and a dye of peach or white over a garment that tight read as skin, its straps as a harness worn over
  nothing; a chest strap across the bust read as a bra band. Its straps were also blocks of stairs: a generated
  garment kept the body helper's UV layout, where a vest's whole torso was about 60 x 40 pixels of the 1024 bake. Now
  the generated garments' UVs are scaled up to fill the texture (`mh_build.generated_garment`), the vest is waxed
  canvas in its own colour (not dyed; `garments.ts`, `GENERATED_GARMENTS[...]['tint']`) with straps and a waist band
  only. Look at a baked texture whole before judging a garment's drawn details.
- **Offsets by people move the population's mean.** Each people's stature against the Reach's mean must be centred over
  the Reach's shares, or the Reach shrinks (`Bodies.MeanStatureOffset`); a static average over a table declared later in
  the class is null at type initialisation (a property, not a field).
- **Menton taken at the throat (R2).** "The lowest midline point in front of the throat" is the throat's top: the chin's
  underside runs back and down. Every face height and neck girth measured that way was wrong. Fix: on the midline
  section (a mesh cut, densified; the base's midline vertices lie on x = 0, so cut at 0.7 mm), find the throat (the neck
  front's deepest point), the first bulge above it (the chin), and the lowest point of its front 30 % (`measure.py`). Plot
  every new landmark on extreme shapes before trusting a number.
- **A model fitted to one-slider samples fails on people (R2).** Shapes combine nonlinearly (the neck's girth most: it is
  taken under a chin the shapes move); a linear model from ±1 renders was 41 mm off on necks. Fix: refit on every round's
  rendered people with a free offset and ridge towards the one-slider values (weight 5); a looser refit learnt -170 mm a
  unit and the solver drove every woman's neck to its thinnest. Shapes that can be exploited answer only to their own
  measure (the neck's to the neck).
- **Independent 2D and 3D targets fight (R2).** A face height over width drawn from FairFace and one drawn from ANSUR can
  contradict; the solver compromises and both miss. Fix: draw the 2D proportions given those the head's solution sets.
- **A head too tall reads as no neck (R2).** Women's vault was 10 mm too tall (tragion to top 138 mm, ANSUR 126): the chin
  sank to the shoulders. Measure the vault (tragion to top of head) and the head and neck (vertex to suprasternale), not
  only the face.
- **Dotnet test filters did not apply** to the Core test project (every run ran all 209); run the suite in Release
  (`dotnet test -c Release`, 4 min; Debug 14 min since people are solved).
- **Judge hair up close, not in the gate's portrait (R5).** A 512-pixel portrait hid a bald band, a plastic shell and dark
  holes that a 0.95 m close-up shows at once: `PeopleGateTests.HairCloseups` (`SF_HAIR_IDS`; `SF_HAIR_PARTS=1` renders the
  hair alone and the body alone, `SF_HAIR_GREY` forces a share of grey). Isolate before guessing: three plausible causes of
  the grey bun's holes (shadow, scalp through the layer, whole locks one colour) were each fixed and changed nothing; the
  probes showed the holes vanish at grey 1.0 and were the layer's folded UVs.
- **A hair change in `hairgen.py` needs `VERSION` bumped**, or `mh_build` takes the cached hair (one wasted build). A
  hair-only build (`WARDROBE_ONLY=sf_crop,...`) also rewrites every outfit FBX, the wardrobe json's order and the .meta files
  in an older format: revert the outfit FBXs whose size is unchanged and the reordered wardrobe json/asset, and let Unity's
  next import convert the metas back.
- **A per-strand hash on UVs needs the UVs to run across strands everywhere.** The hair layer's u is a triangle wave
  round its flow; where it folds, a 7 mm face spans a few strand columns and a per-column choice paints the whole face.
- **Measure a hair defect's geometry before guessing at its shading (R5).** A square notch at the front of every hairline
  survived two shader and atlas guesses; the generated layer's border edges (edges used by one face) showed an inner row at
  the front, and the hair weight's rule against the face (more than 1 cm in front of the eyes) had zeroed the forehead's
  bulge at the hairline. Rules meant for the face must be bounded to the face.
- **Run a gate on the real people it is built from before trusting it (R3).** Ten checks, each at the 3rd-97th or 5th-95th
  percentile, passed 54 % of real ANSUR soldiers and 36 % of real FairFace faces: a person typical on every count at once
  is rare. Held to it, the solver pulled everyone towards the middle (less variety, more look-alikes). A gate is a joint
  region calibrated to pass a stated share of real people (held out), and `gate.py` prints the real pass rate it holds.
- **A blend of two real faces is not a real face's spread.** w·a + (1−w)·b lies nearer the middle (a 60/40 mix keeps 72 %
  of the spread): scale the blend's difference from the pool's mean back by 1/√(w²+(1−w)²) (`RealFaces.Blend`).
- **A fitted slider's value means different things on different bases.** Real faces fitted on the female base use the
  square-jaw and small-eye sliders where the male base does not; hold dimorphism, ancestry and age in measured
  proportions, never in slider values that real faces set. And never let a frontal photograph set a depth slider (the
  brow ridge, the nose's projection, the mouth forward): fitted, they took up other sliders' share of the outline.
- **Compare with small real groups within their sampling error.** FairFace has 34-91 faces at rest per people and sex: a
  per-people sex difference of half an sd can be noise. Tests hold ours to the real difference within both samples'
  error, and only where the real data establishes a difference (`FacesTests.AsReal`).
- **When fits sit at a slider's end, the basis is short there.** Count the fits pinned at each slider's ends
  (`faces_fit.json`); past a few per cent, extend the slider (`Sculpt.Extended`) and refit, or the people inherit the base.

- **A URP renderer made in code has no post-process data** (`UniversalRendererData.postProcessData` null): its cameras
  silently render without tone mapping, grade, bloom or vignette, whatever the camera and volumes ask. The GLES3 tier was
  made so: every editor and CI capture (the editor renders that tier) and GLES3 phones are ungraded. Assigning the package's
  PostProcessData crashed the editor's software GL driver (a segfault in its draw call, `PeoplesLineup`), so the tier stays
  as it was and the people's gate grades its portraits on readback (`PeopleGateTests.Studio.Grade`); GLES3 phones are an
  open decision for a device. Check `postProcessData` on every renderer asset when a look "does nothing".
- **Compare people with people of the same mix.** A pooled real mean (FairFace's mix of peoples) against ours (another mix)
  hides by-people differences of opposite sign: the eyes' contrast is positive on fair skin and negative on dark skin in
  ours, and the pool read as "no change".

- **A CI cache saved only on success never recovers from a timeout.** The Unity test job's Library cache (`actions/cache`)
  saves in its post step only when the job succeeds; once the project outgrew the job's 40 min, every run imported from the
  same old Library, was cut off before EditMode finished and saved nothing (runs 112-124 "cancelled"). The Library is now
  restored and saved as separate steps, the save `if: always()`, and the limit fits a cold import plus the full suite.
  A run reported "cancelled" is a failure to read, not noise.
- **`cancel-in-progress` and checkpoint pushes never let a long job finish.** The Android workflow cancelled its running
  run on every push to main; the test job takes over an hour and checkpoints are pushed every few minutes, so no test run
  could end. Later pushes now wait (`cancel-in-progress: false`; GitHub keeps only the newest pending run).
- **HLSL that compiles for one target can fail on GL.** A shader local named `texture` (a GLSL built-in) failed the skin
  shader's glcore/GLES compile, and every person in the gate rendered without it (no portraits, 6 tests failed). Avoid
  GLSL names (`texture`, `sample`, `input`, `output`, `filter`) for locals; `ShaderTests.OurShadersCompile` (PlayMode, in
  CI) now fails on any compile error in our shaders.
- **The core's tests belong to .NET, not the editor's Mono.** The first CI run to finish (run 128) took 2 h 19 min, 46 min
  of it EditMode: the pure-C# core's statistical tests (thousands of people drawn) ran about 18 times slower in Unity's Mono
  on the runner than in .NET 9, and three passed their 180 s limit. The Core workflow already runs every EditMode test with
  `dotnet test` in minutes; the Unity job now runs PlayMode only. The UI tests took 2-10 min each there (software
  rendering) against limits of 2-4 min, so they have 15 min each: read a CI run's durations before setting a limit.
- **A photograph meters on the face; a fixed studio does not.** Compared with FairFace, our darkest faces' features
  measured against a skin rendered far darker than photographs show it (L* 19 against 28), which inflates every ratio to
  the skin (the -16 in L* weighs most at the dark end). The gate studio meters each face as a camera (exposure by the
  skin's measured reflectance to the power -0.34, fitted from the real data) before comparing.
- **Skin colour is a measured quantity: calibrate it, don't shape it by eye.** The skin's tone was a curve on the bake (a
  third of its shade at the dark end, lifted most of the way to white at the fair), tuned by look; it put the darkest
  cheeks at L* 25 and the fairest past 70, three times the real luminance ratio between peoples, and the whites of the eyes
  stood out on dark faces like a mask's. A contrast measure taken within each image (eyes against skin) caught it where no
  look did. Skin colour now comes from the dermatology literature's spectrophotometer readings by people (Core
  `SkinColour`, tested per people), one linear multiplier per channel over the balanced bake. Any physical quantity a
  shader fakes (albedo, reflectance, sizes) gets a measured target and a test before it gets a slider.

- **A mask placed on one base is wrong on the other.** Every mask round the mouth (lips' colour, the painted stubble's bare
  lips and chin, the folds) was placed at the women's mouth (-0.67 in the head frame); the men's lower face is longer and
  their mouth sits at -0.75, so men's lip colour lay over the skin above the lip and stubble over the lower lip. Measure a
  landmark on each base (`WardrobeBuild.MouthLine` into `_Mouth`) and place masks from it; never one constant for both.
- **The objective is realistic humans, judged by eye against real photographs; the gate's numbers are guards, never the
  target** (owner, 2026-10-31). Round 39 passed 246 of 252 checks with faces that read as non-human (wide, puffy, the mouth
  jutting and the chin falling back in profile, helmet hair, painted lines) and worse than earlier rounds: dozens of rounds
  tuned ratios and network readings while the people got less human. Every change to people is first set beside real
  photographs of people of the same ancestry, sex and age and judged by eye; a change that reads less human is reverted
  whatever it does to the numbers, and a number may only veto, never justify.
- **Two independent draws of one measure halve its variety.** Each head's measures were drawn from ANSUR II and its face
  from FairFace's real faces independently; where they overlap (the cheeks' breadth, the face's height, the eyes' spacing)
  the solver split the difference and our faces kept 0.57-0.74 of real people's spread there. Draw one given the other
  (`Proportions.Fit`: the face first, the head's measures given the face's, #116), and check a generator's spread against
  real people's (whitened sd near 1), not only its range.
- **Judge a form change under a raking light, not only in the portrait studio.** The `face-years` shape (4.3 mm at most)
  showed clearly on the base head lit from above and the side, and not at all in the studio's soft key and fill; at twice
  its size it turned to lumps. Render a shape key on the bare head under a raking light first (`$scratchpad/fy`), then in
  the studio, and size it there, not by what the soft light hides (PEOPLE_REALISM §16 round 39).

## 9. Open decisions for the owner (spoiler-free; defaults in force until answered)

1. Combat stays turn-based with the §6.G depth (default: yes).
2. Asset licence exceptions beyond CC0/CC-BY/ours (default: none).
3. Music: commissioned later vs CC-licensed library (default: library under CC-BY, credited; swapped later).
4. World scale 24 × 16 km with places at 1:1 and compressed land between (default: yes).
5. Floating origin: not in v1 (default) — revisit only if jitter appears beyond 20 km from the origin.
6. Baked lighting (APV) in v1: no (default); realtime + SSAO + emissive; revisit for the Floor tier after v1.

---

## 10. Hand-off checklist and the next steps to v1, in order

Before the session ends: PROGRESS.md names the step in progress and the exact next action; everything compiles;
`tools/unity/editor.sh test all` green on the last editor-side change; committed and pushed; the CI run id noted;
the machine's re-provisioning needs nothing beyond §7.1.

The order to v1 (the complete game, §1): **finish P2 (steps 8–12) → P3 world (13–24) → P4 people → P5 camera,
touch and UI → P6 systems and combat → P7 Chapter One on the phone → P8 Act 1 and the megacity → P9 names,
conversation, characters → P10 Act 2 completed → P11 Act 3 and the endings → P12 systemic depth → P13 release
hardening.** P4–P13 are listed in §5. Each step below is one commit (a few WIP commits at most) and runs the loop of §7.0.

1. ~~Cards verified~~ (done 2026-10-28).
2. Hair rule on the six people (P2.2: §6.C.1 mapping, `bake_hair`, `bake_scalp`); read `people_lineup`, `portrait_*`.
3. Eyes: drop the cornea faces, opaque eye material (P2.3, §6.B.3); read `portrait_*`.
4. `bake_skin` (sun, creases, lips, stubble) (P2.4); read the portraits.
5. People weight ≤ 8 MB each (P2.5, §6.B.6).
6. ~~Nature models to FBX, one per variant, `nature` materials, glTFast removed~~ (done 2026-10-28).
7. ~~`vegetation_iso` framed inside the terrain; scatter rules extracted with tests~~ (done 2026-10-28: Core
   `Scatter`, `ScatterTests`; the eye-level camera takes the ground height under itself).
8. ~~`trees.py` pine, three seeds (P2.8, §6.L); `vegetation_teeth`~~ (done 2026-10-28: the branch cards re-baked,
   §8 "Black curls").
9. ~~Fir and broadleaf; LOD1/LOD2 and the `LODGroup` (P2.8)~~ (done 2026-10-29: one FBX per tree with `_LOD0/1/2`;
   `Test_Trees`, `TreeAssetTests`; §6.L).
10. ~~Frontier kit pieces upright~~ (done with step 6).
11. ~~Addressables skeleton + the content build step + the PlayMode smoke test (P2.10, §6.A.7)~~ (done 2026-10-29).
12. ~~P2 verdict and evidence (P2.11); the Unity CLI evaluated~~ (done 2026-10-29: candidate A, evidence in
    `docs/evidence/unity/p2/`, verdict in PORT.md §5; the CLI not adopted, UNITY_PRACTICES §8).
13. ~~P3.1 `WorldService` + chunk grid + control map tool (§6.A.1–A.2)~~ (done 2026-10-29).
14. ~~P3.1 runtime terrain (§6.A.3) + the 4-chunk PlayMode test~~ (done 2026-10-29: worker-thread Core generation,
    relief styles, `world_chunks_iso`, `world_chunks_wide`, `world_teeth_chunk`).
15. ~~P3.1 streaming policy (§6.A.4) + pooled terrains~~ (done 2026-10-29: `StreamingPolicy`, `WorldStreamer`, pool
    created ahead; `WorldStreamingTests`).
16. ~~The two URP tiers by graphics API~~ (done 2026-10-29): quality levels "Vulkan" (Mobile_RPAsset: Forward+, the GPU
    Resident Drawer, SRP batcher; BatchRendererGroup variants kept) and "GLES3" (Mobile_GLES_RPAsset: Forward), made in
    code by `ProjectSetup`; `Game.RenderTier` picks by graphics API in `Bootstrap.Awake`; `RenderTierTests`. Android
    defaults to Vulkan; the editor and CI render with GLES3 (their software renderer is no judge of Forward+ and
    compute: the Vulkan tier is judged on the phone, P3.7). STP is left off (render scale 1) until the device pass.
17. ~~P3.2 terrain layers per biome~~ (done 2026-10-29, §6.A.3 "Surfaces"): keyed paint with soft biome borders (≤ 8
    layers on a border, no seam), `SecondFace/Terrain/Lit` (two albedo looks, macro variation, height blend), terrain
    albedos flattened and graded at build time, new sand/snow/rock sources and the Teeth's stony ground;
    `world_sallow`, `world_teeth`, `world_shore`, `world_border` (near and mid; `docs/evidence/unity/p3/`).
17b. ~~Road surfaces~~ (done 2026-10-29, §6.A.3 "Road surfaces"): strip meshes per chunk on the levelled ground, one
    material per surface, `SecondFace/Road`; `world_road`, `world_track`. The shore's dark ditch lines (the control
    map's water lowering the ground along creeks) are water's (step 22).
18. ~~P3.3 `TimeService`, sky, fog, weather~~ (done 2026-10-29, §6.A.6 "As built"): Core `Sky` and `Weather`,
    `TimeService`, `SkyController`, `WeatherLayers`, the procedural sky; captures at 7:00, 13:00, 19:00, night, in dust
    and in rain (`docs/evidence/unity/p3/`).
19. P3.4 scatter, in three parts (one GameObject per stone and shrub would be ~150 K objects over the 5 × 5 chunks:
    no phone carries that):
    19a. ~~Props~~ (done 2026-10-29): Core `WorldScatter` (rules per biome in world terms: altitude, slope, wash,
         clump noise; per chunk from the world seed; clear of roads, rails, rivers and places; spacing per rule; ~400
         props a Sallow chunk, ~670 a Teeth chunk), `ScatterCatalog` (model id → addresses, built by
         `ScatterCatalogBuilder` with the Addressables content), `ScatterSpawner` (Addressables-loaded, pooled, 1.5 ms a
         frame) driven by `WorldStreamer` for the chunks within one of the focus (dropped beyond two); Mesh LODs on the
         scans' import. `world_scatter_sallow` (sparse: the Sallow's cover is scrub and stones, 19b's) and
         `world_scatter_teeth` (pines, firs, boulders); ~3.7–5.9 K props live round the focus. The editor's batchmode
         renders no frames between captures, so its frame time says nothing: P3.7 measures on the phone.
    19b. ~~Small scatter as instanced terrain details~~ (done 2026-10-29): Core `WorldDetails` (eleven prototypes in
         `Keys` order; per 2 m cell an expected count per biome rule from slope, wash, altitude and clump noise, rounded
         by a hash of the cell; nothing on roads, rails, rivers or in places; ~35–65 K a chunk, ~110 ms on the
         worker), `DetailMeshes` (each prototype a scan variant cut to the coarsest Mesh LOD under 400 triangles,
         compacted, library materials with instancing, prefabs in Prefabs/details made Addressable in "details",
         `World/DetailSet.asset`), `DetailSet.Load` (by address, before the first terrain), `ChunkTerrain` (instance
         count scatter mode, detail distance 75 m, only the layers a chunk uses written: ~7 ms a write in the
         editor). The scans' cut-out alpha was lost in Poly Haven's glTF (JPEG base colour): `models.py` now fetches
         the Alpha map (and grass's dried-out colour) and `models_bake.py` composes them; grass, shrubs and rooibos
         re-baked. **Fault carried to 19c:** at their true size the scans' twigs and tufts are thin and straw on straw;
         from the game camera the Sallow still reads bare and the Teeth's tufts vanish.
    19c. ~~Readable low vegetation~~ (done 2026-10-29): bushes are domes of leaf cards made in code
         (`DetailMeshes.BushMesh`: two or three overlapping domes of 28–36 cards, normals out from each dome's heart,
         vertex colour r = occlusion, g = sway), on the tree kit's leaf-cluster and fir-branch cards graded to
         grey-olive and grey-green by `tools/unity/tufts.py` (`Textures/Detail/bush_leaf`, `bush_needle`); grass tufts
         are stars of seven cards tilted 35° (upright cards are slivers from 50°). Both draw with `SecondFace/Foliage`
         (cut out, both faces, a tint per plant by a hash of its position, light through the leaves, wind, a dithered
         fade over the last 25 m of the detail distance, now 150 m). The rooibos scans were thin dark twigs at their
         size, and as three materials only their first submesh drew. Sallow density ~0.5 bushes a 2 m cell inside
         clumps; `world_scatter_sallow`, `_close`, `world_scatter_teeth` (`docs/evidence/unity/p3/`). **Not yet:**
         the ground beyond 150 m (the 200 m view) shows no scrub: a far representation (bush density darkening the
         terrain's macro colour, or impostors) when the camera's zoom range is set (P5).
20. ~~P3.5 `PlaceBuilder` from the exported layout for the first town; lights, NavMesh; `place_shale_street`~~ (done
    2026-10-29, §6.A.5 "As built"). Weathering is in the building shader instead of decal projectors (no extra draws);
    decals for accents (stains, cracks, faction marks) when the device measurement (step 24) shows their cost.
    **Carried:** the town is ~370 renderers and ~680 material slots: the GLES3 tier needs its static props baked into
    merged meshes per material per cell (interactive props kept apart) — measure first (step 24); roads should come in
    at a place's exits (world.py routes them to the centre; they now stop at the edge); lights on at dusk.
21. P3.5 interiors as positioned prefabs with instant open; `place_shelter_hall`.
    21a. ~~Buildings open~~ (done 2026-10-29): each building of a place carries `PlaceBuilding` (footprint, floor,
         height, its roof with what is kept on it, its doors and shutters); `PlaceInteriors` (on the place, given the
         world's focus by `PlaceSpawner`) finds the building the focus is in ten times a second and opens it: roof,
         doors and shutters draw only their shadow (the room keeps its shade; sun falls through its windows), and
         `SecondFace/Weathered` cuts away everything above the floor + 1.2 m in that building's box (globals
         `_SF_CutMin`, `_SF_CutMax`, `_SF_CutHeight`; also in the depth passes, not in the shadow caster), drawing the
         walls' inner faces where a cut opens them as a dark cap (both faces drawn; gables and lean-to sides are now one
         face). `place_shale_saloon`.
    21b. ~~The underground shelter~~ (done 2026-10-29): `PlaceBuilder.Below` names a place's interior map (Cistern 9's
         under its mouth). The surface map's widest exit to it is carved through to the map's south edge; a ramp tunnel
         (`Tunnel`: sloped floor, walls, ceiling, a landing, a portal frame) runs 24 m on and 10 m down to the
         interior's widest exit back; the interior is built there (`Layer` with `below`: one `PlaceBuilding` over all
         its rooms, marked `Underground`, its ceilings and fittings gathered; no windows, no dressing; a slab under the
         whole map). Core `PlacePlan`: an exit to another place opens the wall tiles before and behind it (the vault
         door is drawn as wall); gates up to three tiles; rock and walls two tiles thick are `Masses` (rock drawn as
         boulder scans, thick walls as blocks with a coping; a thick wall used to come out as a lattice). Game:
         `WorldView.Underground` (set by `PlaceInteriors` when the open building is underground) hides the streamed
         terrain with its roads and small scatter (`WorldStreamer`) and the props (`ScatterSpawner.SetVisible`), and the
         place's own surface renderers; `PlaceHole` cuts the terrain over the tunnel's first third
         (`WorldStreamer.SetHoles`, `ChunkTerrain.SetHoles`); `PlaceNav` builds over the shelter too. A walker goes from
         the shelter's commons up the tunnel to the road out (132 m). `place_c9_mouth`, `place_shelter_hall`, `_close`.
         **Next for places:** the bunker front is a plain block (an art pass on concrete fronts, doors in thick walls),
         a lit camera background under the ground (P5), the vault door's state from its flag (P6).
22. ~~P3.6 water~~ (done 2026-10-29, §6.A.8): the sea at sea level wherever the ground is under it, the Wet's river
    on a level that falls to the sea in a bed cut for it (a curved, breathing course; its valley's relief faded out in
    `world.py`), a water sheet per chunk with depth and flow per vertex, `SecondFace/Water`; plants and props keep out
    of the water. `world_water_shore`, `_river`, `_falls`, `_mouth` (`docs/evidence/unity/p3/`). There are no creeks
    in the layout (the "shore's ditch lines" were the river's control-map water before the river had a bed). The
    flooded under-city's water comes with that place (P8).
23. ~~The debug overlay (§7.4) in development builds~~ (done 2026-10-29, §7.4 "As built"): `DebugOverlay` (three-finger
    tap / F3), and the world in the app: `MeasureTour` raises Shale's surroundings after the title card and loops four
    measured views; `WorldAssets` on the Boot scene (`BuildGuard` checks it); frame timing stats on; CI builds with
    `-Development`; `BootTests` runs the Boot scene end to end (`docs/evidence/unity/p3/boot_overlay_editor.txt`).
24. P3.7 device measurement by the owner with the overlay; numbers in PORT.md §5; fix until Mid ≥ 30 fps.
25. ~~P5.1–P5.2 pulled forward: the orbit camera and the touch input on the streamed world, a walking stand-in for the
    player; tag `play-walkabout` (§1) for the owner to install~~ (done 2026-10-29, §6.F "As built (step 25)"): the
    app starts in the walkabout at Shale; `BootTests` walks from the spawn into the saloon (`walkabout_street`,
    `walkabout_saloon`) and runs the tour from the overlay's button. A `play-*` tag builds the APK onto a release page
    (android.yml).
Then P4 from §5, step by step (P5 continues after it from P5.3).
