using System.Linq;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>P2 bake-off: every library material on a lit plinth, cubes and spheres in rows, captured as `materials_sheet`.</summary>
    public static class MaterialSheetScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Materials.unity";

        [MenuItem("Second Face/Build material sheet scene")]
        public static void Build()
        {
            var lib = TextureLibrary.Load();
            if (lib.Count == 0) { Debug.LogWarning("MaterialSheetScene: no external library"); return; }
            MaterialLibrary.BuildAll();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.intensity = 2f; sun.color = new Color(1f, 0.97f, 0.9f); sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(52f, -40f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.6f, 0.7f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.55f, 0.5f, 0.45f); RenderSettings.ambientGroundColor = new Color(0.2f, 0.18f, 0.15f);
            var floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.transform.localScale = new Vector3(6, 1, 6);
            floor.GetComponent<Renderer>().sharedMaterial = MaterialLibrary.Get(lib.ContainsKey("concrete") ? "concrete" : lib.Keys.First());
            var keys = lib.Keys.OrderBy(k => lib[k].Use).ThenBy(k => k).ToList();
            const int cols = 8;
            for (var i = 0; i < keys.Count; i++)
            {
                var m = MaterialLibrary.Get(keys[i]);
                if (m == null) continue;
                int c = i % cols, r = i / cols;
                var at = new Vector3(-7f + c * 2f, 0, 6f - r * 2.4f);
                var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
                cube.name = "cube_" + keys[i];
                cube.transform.position = at + new Vector3(0, 0.5f, 0);
                cube.GetComponent<Renderer>().sharedMaterial = m;
                var sphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                sphere.name = "sphere_" + keys[i];
                sphere.transform.position = at + new Vector3(0, 1.55f, 0);
                sphere.transform.localScale = Vector3.one * 0.9f;
                sphere.GetComponent<Renderer>().sharedMaterial = m;
            }
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.1f; cam.farClipPlane = 200f;
            var rot = Quaternion.Euler(42f, 0f, 0f);
            camGo.transform.rotation = rot;
            camGo.transform.position = new Vector3(0, 0.8f, 1.5f) - rot * Vector3.forward * 22f;
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log($"MaterialSheetScene: {keys.Count} materials");
        }
    }
}
