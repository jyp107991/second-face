using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// P2 bake-off: a lit shelter corridor assembled from the shelter kit (Kits/Shelter) — a ring-wall hall with a
    /// hatch, a straight corridor with doorways, pipes, grates, bunks and a hydroponics bay, lit by fixtures and a
    /// red emergency lamp. Captured as `place_shelter` by the PlayMode screenshot tests.
    /// </summary>
    public static class ShelterTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Shelter.unity";
        private const string Kit = "Assets/SecondFace/Kits/Shelter/";

        private static GameObject Place(string piece, Vector3 at, float yaw = 0f, Transform parent = null)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Kit + piece + ".fbx");
            if (prefab == null) { Debug.LogWarning($"ShelterTestScene: missing kit piece {piece}"); return null; }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            go.transform.SetParent(parent);
            go.transform.position = at;
            go.transform.rotation = Quaternion.Euler(0, yaw, 0);
            go.isStatic = true;
            return go;
        }

        private static Light PointLight(Vector3 at, Color color, float intensity, float range, Transform parent)
        {
            var go = new GameObject("Light");
            go.transform.SetParent(parent);
            go.transform.position = at;
            var l = go.AddComponent<Light>();
            l.type = LightType.Point; l.color = color; l.intensity = intensity; l.range = range; l.shadows = LightShadows.Soft;
            return l;
        }

        [MenuItem("Second Face/Build shelter test scene")]
        public static void Build()
        {
            if (!File.Exists(Kit + "wall_straight.fbx")) { Debug.LogWarning("ShelterTestScene: kit not built (tools/unity/kits/shelter.py)"); return; }
            MaterialLibrary.BuildAll();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.035f, 0.04f, 0.05f);
            RenderSettings.fog = true; RenderSettings.fogMode = FogMode.ExponentialSquared; RenderSettings.fogColor = new Color(0.03f, 0.035f, 0.04f); RenderSettings.fogDensity = 0.015f;
            var root = new GameObject("Shelter").transform;
            // Ceilings live under their own parent, inactive: the camera looks in from above and the roof-lift cutaway
            // (DESIGN_UNITY §2) is a P5 feature; the pieces are placed so the real place can switch them on.
            var ceilings = new GameObject("Ceilings").transform; ceilings.SetParent(root);
            var warm = new Color(1f, 0.86f, 0.62f);

            // Corridor: 5 bays of 4 m along +Z, walls both sides, ceiling, pipes along the left wall.
            for (var i = 0; i < 5; i++)
            {
                var z = i * 4f;
                Place("floor_slab", new Vector3(0, 0, z), 0, root);
                Place("ceiling_slab", new Vector3(0, 0, z), 0, ceilings);
                Place(i == 2 ? "wall_doorway" : "wall_straight", new Vector3(-2f, 0, z), 90f, root);
                Place(i == 1 ? "wall_doorway" : "wall_straight", new Vector3(2f, 0, z), -90f, root);
                Place("pipe_straight", new Vector3(-1.7f, 2.6f, z), 90f, root);
                if (i % 2 == 0) { Place("light_fixture", new Vector3(0, 0, z), 90f, root); PointLight(new Vector3(0, 2.9f, z), warm, 14f, 9f, root); }
                if (i == 3) Place("grate_floor", new Vector3(0, 0.0f, z), 0, root);
            }
            Place("crate", new Vector3(1.3f, 0, 3.2f), 20f, root);
            Place("crate", new Vector3(1.4f, 0, 4.1f), -10f, root);
            Place("barrel", new Vector3(-1.4f, 0, 7.5f), 0, root);
            Place("locker", new Vector3(1.6f, 0, 14.6f), -90f, root);
            Place("terminal", new Vector3(-1.4f, 0, 11.2f), 90f, root);
            // The hatch closes the far end; an emergency lamp above it.
            Place("wall_straight", new Vector3(0, 0, 18f), 0, root);
            Place("hatch_door", new Vector3(0, 0, 17.6f), 0, root);
            var red = PointLight(new Vector3(0, 2.8f, 16.8f), new Color(1f, 0.25f, 0.18f), 8f, 7f, root);
            red.name = "Emergency";
            // Side room through the doorway at bay 1 (+X): bunks.
            var room = new GameObject("Bunks").transform; room.SetParent(root);
            for (var i = 0; i < 2; i++)
            {
                Place("floor_slab", new Vector3(6f, 0, 4f + i * 4f), 0, room);
                Place("ceiling_slab", new Vector3(6f, 0, 4f + i * 4f), 0, ceilings);
                Place("wall_straight", new Vector3(8f, 0, 4f + i * 4f), -90f, room);
            }
            Place("wall_straight", new Vector3(6f, 0, 2f), 0, room);
            Place("wall_straight", new Vector3(6f, 0, 10f), 0, room);
            Place("wall_straight", new Vector3(4f, 0, 8f), 90f, room);
            Place("bunk", new Vector3(7.3f, 0, 3.2f), 0, room);
            Place("bunk", new Vector3(7.3f, 0, 5.6f), 0, room);
            Place("bunk", new Vector3(7.3f, 0, 8.3f), 0, room);
            PointLight(new Vector3(6f, 2.9f, 6f), warm, 10f, 8f, room);
            // The ring hall through the doorway at bay 2 (-X): a 12 m cistern ring, a hydroponics bay, a stair.
            var hall = new GameObject("Ring").transform; hall.SetParent(root);
            var centre = new Vector3(-16f, 0, 8f);
            for (var i = 0; i < 16; i++)
            {
                var yaw = i * 22.5f;
                if (i == 0) continue; // the opening towards the corridor
                Place("wall_ring", centre, yaw, hall);
            }
            for (var x = -5; x <= 5; x++)
                for (var z = -5; z <= 5; z++)
                    if (new Vector2(x, z).magnitude <= 3.1f) Place("floor_slab", centre + new Vector3(x * 4f, 0, z * 4f), 0, hall);
            for (var i = 0; i < 6; i++) Place("pillar", centre + Quaternion.Euler(0, i * 60f, 0) * new Vector3(7f, 0, 0), 0, hall);
            for (var i = 0; i < 3; i++) Place("hydro_trough", centre + new Vector3(-4f + i * 3.4f, 0, 5.5f), 0, hall);
            Place("stair", centre + new Vector3(6f, 0, -6f), 0, hall);
            for (var i = 0; i < 4; i++) PointLight(centre + Quaternion.Euler(0, 45f + i * 90f, 0) * new Vector3(6f, 3.0f, 0), warm, 18f, 12f, hall);
            PointLight(centre + new Vector3(0, 2.2f, 5.5f), new Color(0.75f, 0.9f, 1f), 12f, 7f, hall).name = "GrowLamp";

            ceilings.gameObject.SetActive(false);
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.2f; cam.farClipPlane = 300f;
            var rot = Quaternion.Euler(50f, -35f, 0f);
            camGo.transform.rotation = rot;
            camGo.transform.position = new Vector3(0, 0, 8f) - rot * Vector3.forward * 16f;
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log("ShelterTestScene: built");
        }
    }
}
