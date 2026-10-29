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
- **The boot capture lacks the UI**: a camera render does not include UI Toolkit; P5 captures render the panel
  through `PanelSettings.targetTexture` (§8).
- **The captured walk holds the forearms raised in front** on every person (`people_motion_*`): a retarget fault,
  likely the rest pose of the converted clips against the game rig's (check `cmu2fbx.py`'s reference pose and the
  Humanoid muscle settings); fix with P4.4 locomotion at the latest.
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
1. **Built (P4.1, 2026-10-29; §6.B.7–B.8; captures `people_cast_1..4`, `people_lod_0..2`).** The full pipeline to `People/Cast/`: a `people.json` brief per role and region (body, face, ancestry mix,
   lifestyle, skin, hair, wardrobe) → `mh_build.py` builds all; LOD1 (6 K) and LOD2 (2 K) by Blender decimate
   with the same rig; `LODGroup` set by the postprocessor. Budget ≤ 8 MB per person, ≤ 15 K triangles LOD0.
2. The player prefab with all face shapes; the sculptor UI binds to blend-shape weights (§6.B.5).
3. Wardrobe runtime (§6.D, §6.Q): the player's garments are separate skinned meshes on the shared rig, swapped on
   equip; every NPC's outfit is merged into one SkinnedMeshRenderer when the NPC prefab is baked (two renderers
   roughly double the skinning cost). Dye and grime are material parameters, not textures.
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
indigo, faded reds and greens) so a crowd reads as many people at the game camera.

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
   sweeps a heavy styled fringe across the forehead (keep it for the back-of-head-only variants, or not at all). Card hair is re-coloured by `bake_hair`
   (`hair_look: W(colour, dust, grey)`, colours in `HAIR_COLOURS`) and ships without normal maps.
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
   beard_colour)`. Scars and tattoos are not built yet.) The original spec, kept for those: hair → desaturate 0.4, darken 0.75, multiply by
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

---

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
