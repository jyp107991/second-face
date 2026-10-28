using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>P2 people bake-off: the exported people in a line under the sun, captured as a lineup and as portraits.</summary>
    public static class PeopleTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_People.unity";
        public const string Dir = "Assets/SecondFace/People/Bakeoff";

        private const string ControllerPath = "Assets/SecondFace/Generated/People_Bakeoff.controller";

        /// <summary>A controller with one state per captured clip (idle first), so a test can play any of them by name.</summary>
        public static RuntimeAnimatorController MotionController()
        {
            var clips = Directory.Exists("Assets/SecondFace/Motion") ? Directory.GetFiles("Assets/SecondFace/Motion", "*.fbx").OrderBy(p => p).ToArray() : new string[0];
            if (clips.Length == 0) return null;
            Directory.CreateDirectory("Assets/SecondFace/Generated");
            var ctl = UnityEditor.Animations.AnimatorController.CreateAnimatorControllerAtPath(ControllerPath);
            var sm = ctl.layers[0].stateMachine;
            UnityEditor.Animations.AnimatorState first = null;
            foreach (var path in clips)
            {
                var clip = AssetDatabase.LoadAllAssetsAtPath(path.Replace('\\', '/')).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview"));
                if (clip == null) continue;
                var st = sm.AddState(Path.GetFileNameWithoutExtension(path));
                st.motion = clip;
                if (first == null || st.name == "idle") first = st;
            }
            if (first != null) sm.defaultState = first;
            AssetDatabase.SaveAssets();
            return ctl;
        }

        [MenuItem("Second Face/Build people test scene")]
        public static void Build()
        {
            var models = Directory.Exists(Dir) ? Directory.GetFiles(Dir, "*.fbx").OrderBy(p => p).ToArray() : new string[0];
            if (models.Length == 0) { Debug.LogWarning("PeopleTestScene: no people (tools/unity/people/mh_build.py)"); return; }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 1.9f; sun.color = new Color(1f, 0.95f, 0.86f); sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(38f, 150f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.62f, 0.7f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.6f, 0.56f, 0.5f); RenderSettings.ambientGroundColor = new Color(0.28f, 0.24f, 0.2f);
            var fillGo = new GameObject("Fill");
            var fill = fillGo.AddComponent<Light>();
            fill.type = LightType.Directional; fill.intensity = 0.45f; fill.color = new Color(0.8f, 0.86f, 1f); fill.shadows = LightShadows.None;
            fillGo.transform.rotation = Quaternion.Euler(20f, -40f, 0f);
            var floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.transform.localScale = new Vector3(4, 1, 4);
            var fm = MaterialLibrary.Get("scrub_soil") ?? MaterialLibrary.Get("sand");
            if (fm != null) floor.GetComponent<Renderer>().sharedMaterial = fm;
            var people = new GameObject("People").transform;
            // One controller for everyone: building it per person recreated the asset at the same path, which destroyed
            // the one the previous people held, and five of six stood in T-pose in the walk captures.
            var motion = MotionController();
            for (var i = 0; i < models.Length; i++)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(models[i].Replace('\\', '/'));
                if (prefab == null) continue;
                var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                PeopleMaterials.Bind(go, Path.GetDirectoryName(models[i]).Replace('\\', '/'));
                go.name = Path.GetFileNameWithoutExtension(models[i]);
                go.transform.SetParent(people);
                go.transform.position = new Vector3((i - (models.Length - 1) / 2f) * 1.1f, 0, 0);
                go.transform.rotation = Quaternion.Euler(0, 180f, 0);   // face the camera at -Z
                var anim = go.GetComponent<Animator>();
                if (anim != null)
                {
                    if (motion != null) anim.runtimeAnimatorController = motion;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // captures render by request, so nothing is "visible"
                }
            }
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 28f; cam.nearClipPlane = 0.05f; cam.farClipPlane = 100f;
            camGo.transform.position = new Vector3(0, 1.0f, -8.5f);
            camGo.transform.rotation = Quaternion.Euler(2f, 0, 0);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log($"PeopleTestScene: {models.Length} people");
        }
    }
}
