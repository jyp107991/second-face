using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>P4.1: the cast (People/Cast, built by mh_build.py from briefs/cast.json) standing in rows of eight under
    /// the sun, each with their materials bound and idling on the locomotion controller, for the lineup captures and the
    /// levels-of-detail check (ScreenshotTests: `people_cast_<row>`, `people_lod_<n>`).</summary>
    public static class CastTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Cast.unity";
        public const string Dir = "Assets/SecondFace/People/Cast";
        public const int PerRow = 8;
        public const float Spacing = 0.8f, RowGap = 10f;   // a row's x offset: each row framed alone

        [MenuItem("Second Face/Build cast test scene")]
        public static void Build()
        {
            var models = Directory.Exists(Dir) ? Directory.GetFiles(Dir, "*.fbx").OrderBy(p => p).ToArray() : new string[0];
            if (models.Length == 0) { Debug.LogWarning("CastTestScene: no cast (BRIEF=briefs/cast.json mh_build.py)"); return; }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.9f; sun.color = new Color(1f, 0.95f, 0.86f); sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(38f, 150f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.62f, 0.7f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.6f, 0.56f, 0.5f); RenderSettings.ambientGroundColor = new Color(0.28f, 0.24f, 0.2f);
            var fill = new GameObject("Fill").AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.45f; fill.color = new Color(0.8f, 0.86f, 1f); fill.shadows = LightShadows.None;
            fill.transform.rotation = Quaternion.Euler(20f, -40f, 0f);
            var floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.transform.localScale = new Vector3(8, 1, 4);
            floor.transform.position = new Vector3(RowGap * 1.5f, 0, 5f);
            var fm = MaterialLibrary.Get("scrub_soil") ?? MaterialLibrary.Get("sand");
            if (fm != null) floor.GetComponent<Renderer>().sharedMaterial = fm;
            var locomotion = LocomotionBuild.Build();
            var people = new GameObject("Cast").transform;
            for (var i = 0; i < models.Length; i++)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(models[i].Replace('\\', '/'));
                if (prefab == null) continue;
                var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                PeopleMaterials.Bind(go, Dir);
                go.name = Path.GetFileNameWithoutExtension(models[i]);
                go.transform.SetParent(people);
                int row = i / PerRow, col = i % PerRow;
                go.transform.position = new Vector3(row * RowGap + (col - (PerRow - 1) / 2f) * Spacing, 0, 0);   // rows side by side
                go.transform.rotation = Quaternion.Euler(0, 180f, 0);   // facing the camera at -Z
                var anim = go.GetComponent<Animator>();
                if (anim != null)
                {
                    anim.runtimeAnimatorController = locomotion;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // captures render by request, so nothing is "visible"
                }
            }
            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 28f; cam.nearClipPlane = 0.05f; cam.farClipPlane = 200f;
            cam.transform.position = new Vector3(0, 1.0f, -7.5f);
            cam.transform.rotation = Quaternion.Euler(2f, 0, 0);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log($"CastTestScene: {models.Length} people");
        }
    }
}
