using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// Runs when the editor loads the project (also in CI batch mode, before the build). Makes the project
    /// self-assembling: the Boot scene, the URP asset and the player settings are created or corrected in code, so
    /// no hand-written scene or settings YAML has to be right by itself.
    /// </summary>
    [InitializeOnLoad]
    public static class ProjectSetup
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Boot.unity";
        private const string PipelineDir = "Assets/Settings";
        private const string PipelinePath = PipelineDir + "/Mobile_RPAsset.asset";
        private const string RendererPath = PipelineDir + "/Mobile_Renderer.asset";

        static ProjectSetup()
        {
            // Defer until the asset database is ready. In batch mode (CI) delayCall never fires before -executeMethod,
            // so the Boot scene, the URP asset and the build settings are committed assets and BuildGuard checks the
            // player settings at build time instead.
            EditorApplication.delayCall += EnsureAll;
        }

        [MenuItem("Second Face/Set up project")]
        public static void EnsureAll()
        {
            EnsurePipeline();
            EnsurePlayerSettings();
            EnsureBootScene();
        }

        private const string GlesPipelinePath = PipelineDir + "/Mobile_GLES_RPAsset.asset";
        private const string GlesRendererPath = PipelineDir + "/Mobile_GLES_Renderer.asset";
        private const string PostProcessDataPath = "Packages/com.unity.render-pipelines.universal/Runtime/Data/PostProcessData.asset";

        /// <summary>
        /// The two rendering tiers (BUILD_PLAN §6.Q): quality level "Vulkan" on Mobile_RPAsset (Forward+, the GPU Resident
        /// Drawer, SRP batcher) and "GLES3" on Mobile_GLES_RPAsset (Forward); RenderTier picks one at boot by graphics API.
        /// The editor and CI render with GLES3: their software renderer is no judge of Forward+ and compute, which the phone
        /// measures (P3.7). The resident drawer needs the BatchRendererGroup shader variants kept.
        /// </summary>
        private static void EnsurePipeline()
        {
            var vulkan = EnsureTier(PipelinePath, RendererPath, RenderingMode.ForwardPlus, GPUResidentDrawerMode.InstancedDrawing);
            var gles = EnsureTier(GlesPipelinePath, GlesRendererPath, RenderingMode.Forward, GPUResidentDrawerMode.Disabled);
            if (GraphicsSettings.defaultRenderPipeline != vulkan) GraphicsSettings.defaultRenderPipeline = vulkan;
            KeepBatchRendererGroupVariants();
            EnsureQualityLevels(vulkan, gles);
            AssetDatabase.SaveAssets();
        }

        /// <summary>The resident drawer draws through BatchRendererGroup, whose shader variants Unity strips by default
        /// unless Entities Graphics is installed. The setting is read-only in the API, so its serialized field is set to the
        /// enum's KeepAll value (found by name, not by a guessed number).</summary>
        private static void KeepBatchRendererGroupVariants()
        {
            var prop = typeof(UnityEditor.Rendering.EditorGraphicsSettings).GetProperty("batchRendererGroupShaderStrippingMode");
            if (prop == null) { Debug.LogWarning("Second Face: no BatchRendererGroup stripping setting in this editor"); return; }
            var keepAll = System.Convert.ToInt32(System.Enum.Parse(prop.PropertyType, "KeepAll"));
            if (System.Convert.ToInt32(prop.GetValue(null)) == keepAll) return;
            var gs = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset").FirstOrDefault();
            if (gs == null) return;
            var so = new SerializedObject(gs);
            var field = so.FindProperty("m_BrgStripping");
            if (field == null) { Debug.LogWarning("Second Face: m_BrgStripping not found in GraphicsSettings"); return; }
            field.intValue = keepAll;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static UniversalRenderPipelineAsset EnsureTier(string path, string rendererPath, RenderingMode mode, GPUResidentDrawerMode drawer)
        {
            Directory.CreateDirectory(PipelineDir);
            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rendererPath);
            if (renderer == null) { renderer = ScriptableObject.CreateInstance<UniversalRendererData>(); AssetDatabase.CreateAsset(renderer, rendererPath); }
            if (renderer.renderingMode != mode) { renderer.renderingMode = mode; EditorUtility.SetDirty(renderer); }
            // post-processing (the look: ACES, grading, bloom, vignette) needs the renderer's post data, and a renderer made
            // in code has none: the GLES3 tier (the editor's, CI's and older phones') rendered without the look, and every
            // capture and the people's gate portraits were ungraded (R4, docs/PEOPLE_REALISM.md §14)
            if (renderer.postProcessData == null)
            {
                renderer.postProcessData = AssetDatabase.LoadAssetAtPath<PostProcessData>(PostProcessDataPath);
                if (renderer.postProcessData != null) EditorUtility.SetDirty(renderer);
                else Debug.LogWarning($"Second Face: no post-process data at {PostProcessDataPath}");
            }
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                pipeline.supportsHDR = false;
                pipeline.msaaSampleCount = 1;
                pipeline.renderScale = 1f;
                pipeline.shadowDistance = 60f;
                pipeline.shadowCascadeCount = 1;
                pipeline.supportsCameraDepthTexture = true;
                AssetDatabase.CreateAsset(pipeline, path);
                Debug.Log($"Second Face: created {path}");
            }
            if (pipeline.gpuResidentDrawerMode != drawer) { pipeline.gpuResidentDrawerMode = drawer; EditorUtility.SetDirty(pipeline); }
            if (!pipeline.useSRPBatcher) { pipeline.useSRPBatcher = true; EditorUtility.SetDirty(pipeline); }
            return pipeline;
        }

        /// <summary>Quality levels exactly "Vulkan" (Android's default) and "GLES3" (the editor's and the fallback), each on
        /// its pipeline asset. Written through the settings' serialized form: there is no API to name or add levels.</summary>
        private static void EnsureQualityLevels(UniversalRenderPipelineAsset vulkan, UniversalRenderPipelineAsset gles)
        {
            var qs = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/QualitySettings.asset").FirstOrDefault();
            if (qs == null) return;
            var so = new SerializedObject(qs);
            var levels = so.FindProperty("m_QualitySettings");
            if (levels.arraySize < 2) levels.arraySize = 2;
            while (levels.arraySize > 2) levels.DeleteArrayElementAtIndex(levels.arraySize - 1);
            void Set(int i, string name, UniversalRenderPipelineAsset rp)
            {
                var l = levels.GetArrayElementAtIndex(i);
                l.FindPropertyRelative("name").stringValue = name;
                l.FindPropertyRelative("customRenderPipeline").objectReferenceValue = rp;
            }
            Set(0, SecondFace.Game.RenderTier.Vulkan, vulkan);
            Set(1, SecondFace.Game.RenderTier.Gles, gles);
            so.FindProperty("m_CurrentQuality").intValue = 1;
            var defaults = so.FindProperty("m_PerPlatformDefaultQuality");
            for (var i = 0; i < defaults.arraySize; i++)
            {
                var e = defaults.GetArrayElementAtIndex(i);
                e.FindPropertyRelative("second").intValue = e.FindPropertyRelative("first").stringValue == "Android" ? 0 : 1;
            }
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        public static void EnsurePlayerSettings()
        {
            PlayerSettings.productName = "The Second Face";
            PlayerSettings.companyName = "Second Face";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.statusBarHidden = true;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.enableFrameTimingStats = true;   // CPU and GPU frame times for the debug overlay (§7.4)
            PlayerSettings.Android.startInFullscreen = true;
            PlayerSettings.Android.renderOutsideSafeArea = true;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.forceSDCardPermission = false;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            if (string.IsNullOrEmpty(PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.Android)) || PlayerSettings.GetApplicationIdentifier(NamedBuildTarget.Android).StartsWith("com.DefaultCompany"))
                PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.secondface.game");
        }

        private static void EnsureBootScene()
        {
            if (File.Exists(ScenePath))
            {
                EnsureInBuild();
                return;
            }
            Directory.CreateDirectory(Path.GetDirectoryName(ScenePath));
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.08f, 0.07f, 0.06f);
            cam.orthographic = true;
            cam.orthographicSize = 6f;
            camGo.transform.position = new Vector3(10, 10, -10);
            camGo.transform.rotation = Quaternion.Euler(35.264f, 45f, 0f);
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.95f, 0.85f);
            sun.intensity = 1.6f;
            sunGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var boot = new GameObject("Bootstrap");
            boot.AddComponent<SecondFace.Game.Bootstrap>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EnsureInBuild();
            Debug.Log("Second Face: created the Boot scene");
        }

        private static void EnsureInBuild()
        {
            if (EditorBuildSettings.scenes.Any(s => s.path == ScenePath && s.enabled)) return;
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }
    }

    /// <summary>Before any player build: the committed player settings are re-asserted (landscape, immersive, IL2CPP, ARM64),
    /// the Boot scene must be in the build and hold the world's assets (else the app shows only its title card) and the
    /// interface's.</summary>
    public sealed class BuildGuard : UnityEditor.Build.IPreprocessBuildWithReport
    {
        public int callbackOrder => -1000;

        public void OnPreprocessBuild(UnityEditor.Build.Reporting.BuildReport report)
        {
            ProjectSetup.EnsurePlayerSettings();
            if (!EditorBuildSettings.scenes.Any(sc => sc.enabled && sc.path.EndsWith("Boot.unity")))
                throw new BuildFailedException("The Boot scene is not in the build settings (ProjectSettings/EditorBuildSettings.asset)");
            var world = AssetDatabase.AssetPathToGUID(WorldAssetsBuild.AssetPath);
            if (string.IsNullOrEmpty(world) || !File.ReadAllText(ProjectSetup.ScenePath).Contains(world))
                throw new BuildFailedException($"The Boot scene does not hold {WorldAssetsBuild.AssetPath} (Second Face/Wire the Boot scene)");
            var ui = AssetDatabase.AssetPathToGUID(UIBuild.AssetPath);
            if (string.IsNullOrEmpty(ui) || !File.ReadAllText(ProjectSetup.ScenePath).Contains(ui))
                throw new BuildFailedException($"The Boot scene does not hold {UIBuild.AssetPath} (Second Face/Wire the Boot scene)");
        }
    }
}
