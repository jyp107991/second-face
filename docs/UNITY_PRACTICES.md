# Unity practices for THE SECOND FACE (Unity 6000.3, URP, Android)

**Binding.** Read this after `docs/BUILD_PLAN_V1.md`; where the plan's older text disagrees, this file wins. It was
distilled on 2026-10-28 from Unity's own documentation by three research passes, and from what the session's
editor showed. Each rule names its source. "Unconfirmed" means no official page states it; treat those as our
own findings, not Unity's word.

Source prefixes: **M/** = `https://docs.unity3d.com/6000.3/Documentation/Manual/`, **S/** =
`https://docs.unity3d.com/6000.3/Documentation/ScriptReference/`, **UTF/** =
`https://docs.unity3d.com/Packages/com.unity.test-framework@1.6/`. Use versioned links; unversioned ScriptReference
links now redirect elsewhere.

---

## 1. Driving the editor headless (`tools/unity/editor.sh`, CI)

1. Always pass an absolute `-projectPath`; never start the editor in a directory that is not a project (it made the
   repository root into one once). M/EditorCommandLineArguments.html
2. `-batchmode` suppresses dialogs and exits 1 on a script exception. Gate interactive code with
   `Application.isBatchMode`. S/Application-isBatchMode.html
3. `-nographics` skips the graphics device: use it only for jobs that render nothing (licence checks, imports).
   Rendering jobs (captures, PlayMode tests) run without it, under `xvfb-run` on Linux. M/EditorCommandLineArguments.html
4. `-executeMethod` needs a static method in an Editor assembly. Fail by throwing (exit 1) or `EditorApplication.Exit(n)`.
   Never combine `-quit` with `-runTests`, and never with work that is deferred (delayCall, update, coroutines): call
   `EditorApplication.Exit` yourself instead. M/EditorCommandLineArguments.html, S/EditorApplication.Exit.html
5. Always pass `-logFile <path>` (or `-` for stdout) and `-accept-apiupdate` (the API updater does not run in batch
   mode otherwise). M/EditorCommandLineArguments.html
6. Pass `-buildTarget Android` on any job that imports for the APK, so the first import uses the right platform. The
   session's editor has no Android module installed; it imports for Linux and that is fine for tests and captures.
7. Licence: a Personal licence file (`.ulf`) is bound to the machine that made it ("Machine bindings don't match").
   CI (GameCI) and the session both activate through the account: Unity's Licensing Client `--activate-all
   --include-personal --username --password`. `-serial` and `-returnlicense` are for paid licences only.
   M/ManagingYourUnityLicense.html, https://game.ci/docs/github/activation
8. Test exit codes: 2 = failed tests, 3 = run error. The results XML is the source of truth. UTF/changelog/CHANGELOG.html
9. GameCI: workflow env vars do not reach Unity (use `customParameters`); cache `Library` by platform + content hash
   (the cache saves only when the job succeeds); if a Unity 6 PlayMode run crashes with SIGSEGV, set
   `coverageEnabled: false`. https://game.ci/docs/github/test-runner

## 2. Tests and captures

1. Run with `-runTests -testPlatform EditMode|PlayMode -testResults <xml>`; filter with `-testFilter` /
   `-testCategory` (`;` lists, `!` negates). CI runs `-testCategory "!Heavy"`; the session runs everything. M/test-framework/reference-command-line.html
2. `[UnityTest]` returns IEnumerator; `yield return null` is one frame. **Never `WaitForEndOfFrame`** in tests or
   capture code: in the batch-mode editor it never returns (our CI hung 67 minutes on it). UTF/api/UnityEngine.TestTools.UnityTestAttribute.html
3. `IPrebuildSetup` / `IPostBuildCleanup` run once before the tests are built. Keep them to preparing files and
   assets; wrap Editor APIs in `#if UNITY_EDITOR`; set `LogAssert.ignoreFailingMessages = true` first (a logged error
   there aborts the whole run); restore the scene setup if you open scenes (`EditorSceneManager.GetSceneManagerSetup`
   / `RestoreSceneManagerSetup`) or play mode starts without the test runner. M/test-framework/reference-setup-and-cleanup.html
4. Load test scenes in play mode with `EditorSceneManager.LoadSceneAsyncInPlayMode(path, Additive)`, set the scene
   active (its lighting applies), unload it in `[UnityTearDown]`. Never load `Single` in a test: unloading the runner's
   init scene can leave the runner stuck (Unity issue tracker). S/SceneManagement.EditorSceneManager.LoadSceneInPlayMode.html
5. `[Timeout(ms)]` is enforced (fires only at a yield). Long tests get `[Category("Heavy")]`. UTF/changelog/CHANGELOG.html
6. LogAssert: unexpected Error/Exception logs fail the test unless expected (`LogAssert.Expect`, in order) or ignored.
   Capture tests ignore them (the log is read instead); logic tests must not. UTF/api/UnityEngine.TestTools.LogAssert.html
7. Captures: render the camera with `RenderPipeline.StandardRequest { destination = rt }` +
   `RenderPipeline.SubmitRenderRequest` (synchronous, the documented URP way), then `ReadPixels` + `EncodeToPNG`. Not
   `ScreenCapture`. UI Toolkit screens: give the `PanelSettings` a `targetTexture` and read that.
   M/urp/User-Render-Requests.html, S/UIElements.PanelSettings-targetTexture.html
8. Animator in tests: play by **state** name and check `Animator.HasState` first; `Play` on a missing state only logs
   and nothing moves (our motion captures were identical frames until this).

## 3. Editor scripting

1. Wrap batches in `AssetDatabase.StartAssetEditing` / `StopAssetEditing` inside try/finally (or `AssetEditingScope`).
   Assets created inside the scope are not fully registered until it ends. S/AssetDatabase.StartAssetEditing.html
2. `AssetDatabase.Refresh` imports synchronously but compiles scripts asynchronously, and the domain does not reload
   inside the calling method: generate code in one `-executeMethod` run, use it in the next. M/AssetDatabaseRefreshing.html
3. Change assets through `EditorUtility.SetDirty` / `SerializedObject` / `Undo.RecordObject`, then
   `AssetDatabase.SaveAssets`; save scenes with `EditorSceneManager.SaveScene`. S/EditorUtility.SetDirty.html
4. `[InitializeOnLoad]` runs on every domain reload: never load assets there; use `OnPostprocessAllAssets`.
   S/InitializeOnLoadAttribute.html
5. Scene creation APIs (`NewScene`, `OpenScene`, `SaveScene`) are edit-mode only.

## 4. Import pipeline

1. **Never create, load or save assets inside per-asset import callbacks** (`OnPreprocess*`, `OnPostprocess*Model`,
   `OnAssignMaterialModel`): `CreateAsset` there is non-deterministic and warned against, and the URP shader may not be
   loaded on a cold import. Do database work in static `OnPostprocessAllAssets` (guard against reimport loops) or in
   an editor step (our builders bind with `MaterialLibrary.Bind` / `PeopleMaterials.Bind`). S/AssetDatabase.CreateAsset.html,
   S/AssetPostprocessor.OnPostprocessAllAssets.html
2. **Every AssetPostprocessor overrides `GetVersion()`, and the number is bumped whenever its rules change.**
   Otherwise cached Libraries (CI restores one) keep stale imports. All five of ours do (version 2 on 2026-10-28).
   S/AssetPostprocessor.GetVersion.html
3. Import callbacks must be deterministic and self-contained: no static state, no file writes, no unsorted dictionary
   iteration (Parallel Import runs them in worker processes). Check with `-consistencyCheck`. M/ParallelImport.html,
   M/ImporterConsistency.html
4. Declare dependencies before loading another asset during import (`context.DependsOnArtifact(guid)`,
   `DependsOnSourceAsset`, `[CollectImportedDependencies]`). S/AssetImporters.AssetImportContext.DependsOnArtifact.html
5. To make a model use project materials permanently (prefabs, the shipped game), remap with
   `AssetImporter.AddRemap(new SourceAssetIdentifier(typeof(Material), name), mat)` + `WriteImportSettingsIfDirty` +
   reimport, from an editor step; not `SearchAndRemapMaterials` (it searches globally, which a worker import cannot).
   S/AssetImporter.AddRemap.html
6. `GetPostprocessOrder`: URP's own FBX material preprocessor runs at about −980; ours at 0 run after it.

### FBX from Blender
7. Kits: `bakeAxisConversion = true` (else the root carries a 270° rotation that anything setting
   `transform.rotation` destroys); 1 unit = 1 m with Convert Units on and `globalScale` 1; Blender export
   `axis_forward='-Z'`, `axis_up='Y'`, no `bake_space_transform` (broken with armatures). S/ModelImporter-bakeAxisConversion.html,
   M/models-preparing.html
8. Names: keep node and material names to `[A-Za-z0-9_]`. ':' is an FBX namespace separator; ours arrived as '_'.
   Match on the imported name (unconfirmed by docs; seen in our editor).
9. Humanoids: `animationType = Human` with `avatarSetup = CreateFromThisModel`; for a mapping that never changes, set
   `humanDescription` from code; T-pose, ≥15 bones, ≤4 influences per vertex. S/HumanDescription.html, M/UsingHumanoidChars.html
10. Blend-shape normals need smoothing groups: export with `mesh_smooth_type='FACE'`. M/FBXImporter-Model.html
11. Mobile mesh settings: Read/Write off, Optimize Mesh on, Index Format Auto; **Mesh Compression Off** (it only
    shrinks files, costs load time, can add artifacts; kits switched off 2026-10-28). Use the Player's Vertex
    Compression instead. M/types-of-mesh-data-compression.html

### Textures (Android)
12. ASTC with ETC2 fallback; block size by type is our choice (6×6 albedo and masks, 4×4–5×5 normals: unconfirmed
    practice). Crunch never applies to ASTC. M/texture-choose-format-by-platform.html
13. Normal maps import as `NormalMap`. Data textures (masks, height) **sRGB off and Alpha Is Transparency off**
    (it dilates colour channels and corrupts packed data). M/texture-type-default.html
14. URP Lit mask packing: R metallic, G occlusion, A smoothness, B unused; the same texture in Metallic and Occlusion
    slots. HDRP's mask layout differs; do not reuse it. M/urp/shaders-in-universalrp-channel-packed-texture.html
15. Mipmap streaming: Quality setting on + per-texture Stream Mipmap Levels + LZ4/LZ4HC build compression. Terrain
    textures are excluded.

### glTF (glTFast)
16. glTFast imports with its own shaders (`Shader Graphs/glTF-pbrMetallicRoughness`), not URP Lit; they must be in
    the build (Always Included Shaders or a ShaderVariantCollection) or the props render pink. glTF import ignores
    material remaps. **Decision:** the baked nature models move to FBX with library materials (URP Lit, cutout
    foliage) so they share one material system with kits; until then they are test-scene only.
    https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.20/manual/features.html

## 5. Version control

1. Force Text serialization and Visible Meta Files (both set). Commit `Assets` (every `.meta`, folder metas too),
   `Packages` with `packages-lock.json`, `ProjectSettings`. Ignore `Library`, `Temp`, `Logs`, `UserSettings`, and the
   metas of ignored generated folders. M/upm-conflicts-auto.html
2. A `.meta` holds the GUID and the import settings: losing it or changing its GUID breaks every reference. Our
   generated metas use md5(`second-face:` + path), so paths must not be reused for different assets.
3. After the editor upgrades or first opens the project, commit its rewrites in one separate commit (or run
   `AssetDatabase.ForceReserializeAssets` once and commit that). S/AssetDatabase.ForceReserializeAssets.html

## 6. Rendering and performance (URP, mobile)

1. **Two device tiers by graphics API.** Vulkan tiers: Forward+, SRP Batcher, GPU Resident Drawer (Instanced
   Drawing; BatchRendererGroup Variants = Keep All), optional STP when Render Scale < 1. GLES3 tier: Forward, no GRD,
   no STP (both need compute), lower scatter density. Keep Auto Graphics API (Vulkan first, GLES3 fallback) with a
   Vulkan device filter for bad drivers. M/urp/gpu-resident-drawer.html, M/urp/stp/stp-upscaler.html, M/class-PlayerSettingsAndroid.html
2. GRD draws only MeshRenderers with DOTS-instancing-capable shaders and **no MaterialPropertyBlock** (use material
   variants). Skinned meshes, particles and Terrain are not batched by it. Turn off static batching and per-material
   "Enable GPU Instancing" when GRD is on. LOD cross-fade, not animated cross-fade. M/urp/make-object-compatible-gpu-rendering.html
3. Deferred is out on mobile. Forward: 8 additional lights per object, 32 per camera (16 on GLES 3.0).
   M/urp/rendering-paths-comparison.html, M/urp/lighting/light-limits-in-urp.html
4. Renderer: Depth Priming off; Depth/Opaque Texture only when a feature needs them; Native RenderPass on; FXAA for
   AA; Render Scale below 1 is the main GPU lever (UI stays native). M/urp/configure-for-better-performance.html, M/urp/anti-aliasing.html
5. Shadows: small resolution, short distance, 1–2 cascades; soft shadows off or Low on tiled GPUs; no additional-light
   shadows. SSAO only downsampled, low samples, small radius. M/urp/universalrp-asset.html, M/urp/ssao-renderer-feature-reference.html
6. Post: Volume Update Mode = Via Scripting; Bloom (no high-quality filtering), colour grading, vignette are fine.
7. One URP Asset per Quality level; switch only on loading or menu screens. M/urp/quality/quality-settings-through-code.html
8. No baked occlusion culling (unsuitable for runtime-generated geometry); GPU occlusion only if measured to help.
   Cull tiny objects with Small-Mesh Screen-Percentage. M/OcclusionCulling.html, M/urp/gpu-culling.html
9. Frame rate: Android ignores vSync and defaults to 30; set `Application.targetFrameRate`; turn on Optimized Frame
   Pacing. Adaptive Performance is built into 6.3 with a Basic and an Android (ADPF) provider; scale with its
   Indexer and scalers (resolution, LOD, view distance, frame rate). M/class-PlayerSettingsAndroid.html,
   M/com.unity.adaptiveperformance.html
10. Profile on device: Development Build + Autoconnect Profiler over USB; Memory Profiler snapshots from the player,
    not play mode. M/android-profile-on-an-android-device.html

## 7. Terrain, streaming, characters

1. Terrain tiles: **at most 4 Terrain Layers per tile** (URP draws 4 per pass; more adds passes); `drawInstanced`
   on; `SetNeighbors` on every tile; write heights once per chunk (`SetHeights` rebuilds LOD each call; use
   `SetHeightsDelayLOD` + `SyncHeightmap` for edits); `SetDetailResolution(res, 16)`; detail prototypes
   `useInstancing = true` (VertexLit mode only); turn off Terrain Holes in the URP Asset unless used.
   M/class-TerrainLayer.html, S/TerrainData.SetHeights.html, S/TerrainData.SetDetailResolution.html
2. Streaming: load chunks additively (a `Single` scene load calls `UnloadUnusedAssets` and hitches); never hold a
   scene load with `activateOnLoad = false` (it blocks the Addressables queue); pair every Load with a Release; run
   Analyze "Check Duplicate Bundle Dependencies"; cap integration with `Application.backgroundLoadingPriority`;
   size the async upload buffer to the largest asset. https://docs.unity3d.com/Packages/com.unity.addressables@2.7/manual/LoadingScenes.html
3. Characters: GPU skinning (GPU or GPU Batched; compare on device); **one SkinnedMeshRenderer per character where
   possible** (two roughly double the cost): NPC outfits are merged into one skinned mesh at build time, the player
   keeps separate garments for the wardrobe; ≤4 influences; Optimize Game Objects with only the sockets needed;
   Animator Culling Mode = Cull Completely for ambient NPCs; skinned LODs authored in a LODGroup (Mesh LOD ignores
   skin weights and blend shapes); Skinned Motion Vectors off unless TAA/STP needs them.
   M/ModelingOptimizedCharacters.html, M/MecanimPeformanceandOptimization.html

## 8. Tools for an agent

- **Unity CLI (`unity`, official, 1.0 beta, Oct 2026):** headless `unity test`, `unity run`, `unity command eval`
  (run C#), `unity logs --follow`, and an MCP server; needs the Unity Pipeline package in the project. Promising
  replacement for parts of `editor.sh`; evaluate in a separate step before adopting (beta).
  https://docs.unity.com/en-us/unity-cli/use-unity-cli
- Unity's older MCP server (in `com.unity.ai.assistant`) needs an interactive editor to approve clients: not for us.
- Community MCP servers (CoplayDev/unity-mcp, IvanMurzak/Unity-MCP, CoderGamester/mcp-unity) run inside the editor;
  third-party code, review before any use. Not adopted.

## 9. Where the project stands (2026-10-28)

| Rule | State |
|---|---|
| No asset creation in import callbacks (4.1) | Fixed: builders bind materials |
| `GetVersion` on every post-processor (4.2) | Fixed: all five at 2 |
| Kits `bakeAxisConversion`, no mesh compression (4.7, 4.11) | Fixed |
| Test scenes additive + teardown, render requests, no WaitForEndOfFrame (2.2–2.7) | Fixed |
| CI skips Heavy captures (2.1) | Fixed |
| `-accept-apiupdate` in the runner (1.5) | Fixed |
| Nature models via glTFast shaders (4.16) | To do: move to FBX + library materials (vegetation pass) |
| Test terrains use 5–6 layers (7.1) | To do: ≤4 per tile in the world terrain (P3) |
| URP tiers by API, GRD on Vulkan (6.1) | To do: P3 |
| NPC outfits merged to one skinned mesh (7.3) | To do: P4 |
| Material remaps for shipped prefabs (4.5) | To do: when prefabs are baked (P3/P4) |
