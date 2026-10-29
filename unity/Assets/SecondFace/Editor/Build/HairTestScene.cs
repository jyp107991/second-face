using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace SecondFace.EditorTools
{
    /// <summary>P4 step 7: the hair test people (People/HairTest, built by mh_build.py from briefs/hairtest.json; not
    /// committed) in a row with their materials bound and idling, for the capture of the generated hair from the front, the
    /// side and the back (ScreenshotTests: `people_hair`). Lit like the cast lineup: the sun from the front left, a cool
    /// fill, the people facing it (a sun from the side cast the nose's shadow over the cheek as a hard dark triangle).</summary>
    public static class HairTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Hair.unity";
        public const string Dir = "Assets/SecondFace/People/HairTest";

        [MenuItem("Second Face/Build hair test scene")]
        public static void Build()
        {
            var models = Directory.Exists(Dir) ? Directory.GetFiles(Dir, "*.fbx").OrderBy(p => p).ToArray() : new string[0];
            if (models.Length == 0) { Debug.LogWarning("HairTestScene: no hair test people (BRIEF=briefs/hairtest.json mh_build.py)"); return; }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.6f; sun.color = new Color(1f, 0.95f, 0.88f); sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(38f, 150f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.6f, 0.7f); RenderSettings.ambientEquatorColor = new Color(0.5f, 0.47f, 0.43f); RenderSettings.ambientGroundColor = new Color(0.25f, 0.22f, 0.19f);
            var fill = new GameObject("Fill").AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.45f; fill.color = new Color(0.8f, 0.86f, 1f); fill.shadows = LightShadows.None;
            fill.transform.rotation = Quaternion.Euler(20f, -40f, 0f);
            var locomotion = LocomotionBuild.Build();
            var root = new GameObject("HairTest").transform;
            for (var i = 0; i < models.Length; i++)
            {
                var go = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(models[i].Replace('\\', '/')));
                PeopleMaterials.Bind(go, Dir);
                go.name = Path.GetFileNameWithoutExtension(models[i]);
                go.transform.SetParent(root);
                go.transform.position = new Vector3(i * 3f, 0, 0);
                go.transform.rotation = Quaternion.Euler(0, 180f, 0);   // facing the sun, as the cast lineup
                var anim = go.GetComponent<Animator>();
                if (anim != null) { anim.runtimeAnimatorController = locomotion; anim.applyRootMotion = false; anim.cullingMode = AnimatorCullingMode.AlwaysAnimate; }
            }
            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 20f; cam.nearClipPlane = 0.05f;
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.36f, 0.33f, 0.29f);
            EditorSceneManager.SaveScene(scene, ScenePath);
            Debug.Log($"HairTestScene: {models.Length} people");
        }
    }
}
