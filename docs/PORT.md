# The Unity port — plan, conventions, how to work

Owner decision (2026-10-28): the game ships as an installable app, full screen without a browser bar, landscape,
Android first; the engine is **Unity 6.3 LTS (6000.3) with the Universal Render Pipeline**. This document is the
plan and the working rules for the port. It overrides the content roadmap until the port reaches parity with the
web game (then content building resumes at B3.11, in Unity).

## 1. What moves, what stays

- **Content data stays the source of truth** in `src/content/` (TypeScript data modules: maps, NPCs, dialogues,
  quests, items, rules, world). `npm run validate` keeps validating it. `tools/port/export.ts` exports every
  registry to JSON under `unity/Assets/StreamingAssets/content/`; the Unity game loads those. Content authors keep
  editing TypeScript; a content change is: edit → `npm run check` → `npm run export` → commit both.
- **Assets are re-judged for quality, not copied by default** (owner, 2026-10-28: no anchoring on the web game's
  graphics; maximise what a 2026 Android phone runs smoothly; remake what must be remade). What survives is what
  meets the bar: the CC0 source libraries (Poly Haven models and PBR sets, MakeHuman bodies and clothes, the CMU
  motion) are re-imported from their originals at the resolution and detail Unity's pipeline can carry (ASTC
  textures at 1–2 K where it shows, LOD groups instead of hand-decimated meshes, real trees with LODs and
  impostors only at distance), through URP's lit shading, shadows, SSAO, bloom, colour grading and post. The
  web-era downsizes (512 px atlases, 2 k-triangle trees as billboards, painted-on cloth) are not carried over.
  The visual bar for each phase is set in P2/P3 below.
- **Engine code is rewritten in C#**, in the same shape as the TypeScript engine, module by module, each with its
  tests. The web engine (`src/engine/`) is frozen: it is the reference for every behaviour and the visual bar
  (`docs/UPGRADE.md` U1–U4.1 evidence), not a place for new features.
- **Story and docs** are unchanged. The spoiler rule applies to the Unity project exactly as to the web one.

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

## 4. Phases (each ends with a CI-built APK the owner can install)

- **P0 Foundation** — project skeleton, packages, Android settings (landscape, immersive), assemblies, content
  export, local compile/test loop, CI workflow, a Boot scene that shows the title screen on the phone.
- **P1 Core** — the pure-C# engine: content model and loader; `Rng`; character sheet, skills, perks, traits,
  origins, chrome; items, inventory, equipment, economy; dialogue engine (conditions, effects, memory); quests,
  flags, leads, conclusions, decisions; reputation, news, factions; schedules, world events (no time limits:
  scheduled events wait for the player), journeys and timetables; saves and migrations. Tests ported from
  `tests/*.test.ts`.
- **P2 World** — heightfield and regions, ways, chunk streaming, the ground shader, water, sky and weather,
  vegetation, props, places built from map data, buildings/roofs, lights. Visual bar: a modern isometric RPG on a
  2026 phone (DOS2-class): URP lit PBR with 1–2 K ASTC texture sets, height-blended terrain layers with
  tessellation-free parallax where it reads, real tree meshes with LOD groups (impostors only beyond ~80 m),
  dense grass and scrub through GPU instancing with wind, physically plausible water (depth fog, refraction,
  foam), volumetric-looking fog and sky, cascaded shadows at medium, SSAO and bloom, at 60 fps on a 2024–26
  flagship and 30+ on a mid-range phone with dynamic resolution. Measured on device, not assumed.
- **P3 People** — the MakeHuman figure (shape evaluation, skinned meshes, skin compositing, proxies, hair),
  the captured-motion clip player with direction retargeting, portraits, outfits, gear, weapons, bionics.
  Visual bar: skin with subsurface scattering (URP's lit shader with a skin profile or a custom one), 2 K face
  and body maps composited at import, cloth with real weave normal/roughness maps, hair as cards with
  anisotropic shading, blend-shape faces, captured motion blended through Unity's animation system, LOD groups
  per figure, and a crowd budget that keeps the scene smooth.
- **P4 Camera, touch and UI** — iso camera (one-finger turn, pinch, tap-to-move; U5), radial menu, HUD, the
  notebook, the map and travel, dialogue view with portraits, combat UI, menus, settings, character creation.
- **P5 Gameplay and parity** — actors and pathing, NPC schedules and crowds, encounters and combat, interactions
  and loot, journeys and vehicles, audio; Chapter One and Act 1 playable on the phone; performance pass on
  device (the U2c list); then U6–U8 and B3.11 continue in Unity.

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
