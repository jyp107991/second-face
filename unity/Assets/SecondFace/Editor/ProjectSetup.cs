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
        private const string ScenePath = "Assets/SecondFace/Scenes/Boot.unity";
        private const string PipelineDir = "Assets/Settings";
        private const string PipelinePath = PipelineDir + "/Mobile_RPAsset.asset";
        private const string RendererPath = PipelineDir + "/Mobile_Renderer.asset";

        static ProjectSetup()
        {
            // Defer until the asset database is ready.
            EditorApplication.delayCall += EnsureAll;
        }

        [MenuItem("Second Face/Set up project")]
        public static void EnsureAll()
        {
            EnsurePipeline();
            EnsurePlayerSettings();
            EnsureBootScene();
        }

        private static void EnsurePipeline()
        {
            var existing = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (existing != null)
            {
                if (GraphicsSettings.defaultRenderPipeline != existing) { GraphicsSettings.defaultRenderPipeline = existing; AssetDatabase.SaveAssets(); }
                return;
            }
            Directory.CreateDirectory(PipelineDir);
            var renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
            AssetDatabase.CreateAsset(renderer, RendererPath);
            var pipeline = UniversalRenderPipelineAsset.Create(renderer);
            pipeline.supportsHDR = false;
            pipeline.msaaSampleCount = 1;
            pipeline.renderScale = 1f;
            pipeline.shadowDistance = 60f;
            pipeline.shadowCascadeCount = 1;
            pipeline.supportsCameraDepthTexture = true;
            AssetDatabase.CreateAsset(pipeline, PipelinePath);
            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline;
            AssetDatabase.SaveAssets();
            Debug.Log("Second Face: created the mobile URP asset");
        }

        private static void EnsurePlayerSettings()
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
}
