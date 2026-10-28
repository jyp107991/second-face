using System.IO;
using System.Linq;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// P2 bake-off: a well town's main street from the frontier kit on a terrain patch — adobe houses with tin roofs
    /// and porches, scrap sheds, the well in the square, a windpump and tank, fences, awnings, lamps, a few of the
    /// bake-off people standing about — under a late sun. Captured as `place_frontier_*`.
    /// </summary>
    public static class FrontierTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Frontier.unity";
        private const string Kit = "Assets/SecondFace/Kits/Frontier/";
        private const string People = "Assets/SecondFace/People/Bakeoff";

        private static GameObject Place(string piece, Vector3 at, float yaw, Transform parent, Terrain t = null)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(Kit + piece + ".fbx");
            if (prefab == null) { Debug.LogWarning($"FrontierTestScene: missing {piece}"); return null; }
            var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            go.transform.SetParent(parent);
            if (t != null) at.y += t.SampleHeight(at);
            go.transform.position = at;
            go.transform.rotation = Quaternion.Euler(0, yaw, 0);
            go.isStatic = true;
            return go;
        }

        /// <summary>A 4 x 8 m adobe house: two wall bays per long side, door on the street, a window round the back, flat tin roof, porch.</summary>
        private static void House(Vector3 at, float yaw, Transform parent, Terrain t, bool porch, bool scrap = false)
        {
            var h = new GameObject("House").transform; h.SetParent(parent);
            var rot = Quaternion.Euler(0, yaw, 0);
            Vector3 L(float x, float z) => at + rot * new Vector3(x, 0, z);
            var wall = scrap ? "scrap_wall" : "adobe_wall";
            // front (street side, -z): door bay and a window bay
            Place(scrap ? "scrap_wall" : "adobe_wall_door", L(-2f, -2f), yaw, h, t);
            Place(scrap ? "scrap_wall" : "adobe_wall_window", L(2f, -2f), yaw, h, t);
            // back (+z)
            Place(wall, L(-2f, 2f), yaw + 180f, h, t); Place(scrap ? "scrap_wall" : "adobe_wall_window", L(2f, 2f), yaw + 180f, h, t);
            // sides
            Place(wall, L(-4f, 0f), yaw + 90f, h, t); Place(wall, L(4f, 0f), yaw - 90f, h, t);
            // roof: two 4 m slabs
            Place(scrap ? "tin_roof_lean" : "tin_roof_flat", L(-2f, 0f), yaw, h, t); Place(scrap ? "tin_roof_lean" : "tin_roof_flat", L(2f, 0f), yaw, h, t);
            if (!scrap) Place("plank_door", L(-2f, -2.03f), yaw, h, t);
            if (porch) Place("porch", L(-2f, -3.1f), yaw, h, t);
        }

        [MenuItem("Second Face/Build frontier test scene")]
        public static void Build()
        {
            if (!File.Exists(Kit + "adobe_wall.fbx")) { Debug.LogWarning("FrontierTestScene: kit not built (tools/unity/kits/frontier.py)"); return; }
            var lib = TextureLibrary.Load();
            MaterialLibrary.BuildAll();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Late afternoon sun, warm, long shadows; a clear sky.
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.color = new Color(1f, 0.88f, 0.7f); sun.intensity = 2.4f; sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(28f, 215f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.5f, 0.62f, 0.88f); RenderSettings.ambientEquatorColor = new Color(0.72f, 0.6f, 0.46f); RenderSettings.ambientGroundColor = new Color(0.3f, 0.22f, 0.15f);
            RenderSettings.fog = true; RenderSettings.fogMode = FogMode.ExponentialSquared; RenderSettings.fogColor = new Color(0.85f, 0.78f, 0.66f); RenderSettings.fogDensity = 0.004f;

            // Terrain: 256 m, nearly flat with a gentle rise, scrub soil with sand.
            const int res = 257;
            var data = new TerrainData { heightmapResolution = res, size = new Vector3(256, 40, 256) };
            var heights = new float[res, res];
            for (var y = 0; y < res; y++) for (var x = 0; x < res; x++)
            {
                float u = x / (float)(res - 1), v = y / (float)(res - 1);
                heights[y, x] = 0.2f + 0.02f * Mathf.PerlinNoise(u * 6f + 1f, v * 6f + 9f) + 0.006f * Mathf.PerlinNoise(u * 30f, v * 30f) + 0.03f * Mathf.Clamp01((v - 0.75f) * 4f);
            }
            data.SetHeights(0, 0, heights);
            var keys = new[] { "scrub_soil", "sand", "gravel", "rubble" }.Where(lib.ContainsKey).ToArray();
            Directory.CreateDirectory("Assets/SecondFace/Generated/TerrainLayers");
            var layers = keys.Select(k =>
            {
                var layer = new TerrainLayer
                {
                    diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "d")),
                    normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "n")),
                    maskMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "mask")),
                    tileSize = Vector2.one * lib[k].Metres,
                };
                var p = $"Assets/SecondFace/Generated/TerrainLayers/frontier_{k}.terrainlayer";
                AssetDatabase.CreateAsset(layer, p);
                return AssetDatabase.LoadAssetAtPath<TerrainLayer>(p);
            }).ToArray();
            data.terrainLayers = layers;
            var ar = data.alphamapResolution;
            var maps = new float[ar, ar, layers.Length];
            for (var y = 0; y < ar; y++) for (var x = 0; x < ar; x++)
            {
                float u = x / (float)(ar - 1), v = y / (float)(ar - 1);
                var n = Mathf.PerlinNoise(u * 12f + 2f, v * 12f + 5f);
                // the street runs along x at z = 128 (v = 0.5): packed gravel there, soil and sand elsewhere
                var street = Mathf.Clamp01(1f - Mathf.Abs(v - 0.5f) * 40f);
                var w = new float[layers.Length];
                int i;
                i = System.Array.IndexOf(keys, "scrub_soil"); if (i >= 0) w[i] = (1f - street) * (0.4f + 0.6f * n);
                i = System.Array.IndexOf(keys, "sand"); if (i >= 0) w[i] = (1f - street) * (1f - n) * 0.8f;
                i = System.Array.IndexOf(keys, "gravel"); if (i >= 0) w[i] = street;
                i = System.Array.IndexOf(keys, "rubble"); if (i >= 0) w[i] = Mathf.Clamp01(Mathf.PerlinNoise(u * 25f, v * 25f) - 0.75f) * 3f;
                var sum = w.Sum(); if (sum <= 0) { w[0] = 1; sum = 1; }
                for (var k = 0; k < w.Length; k++) maps[y, x, k] = w[k] / sum;
            }
            data.SetAlphamaps(0, 0, maps);
            AssetDatabase.CreateAsset(data, "Assets/SecondFace/Generated/Test_Frontier_Terrain.asset");
            var terrainGo = Terrain.CreateTerrainGameObject(data); terrainGo.name = "Terrain";
            var terrain = terrainGo.GetComponent<Terrain>(); terrain.heightmapPixelError = 3f;

            var town = new GameObject("Shale").transform;
            // The street along x at z = 128; houses face it from both sides.
            float sz = 128f;
            House(new Vector3(104, 0, sz + 8f), 0f, town, terrain, true);
            House(new Vector3(116, 0, sz + 9f), 0f, town, terrain, true);
            House(new Vector3(130, 0, sz + 8.5f), 0f, town, terrain, false, scrap: true);
            House(new Vector3(146, 0, sz + 8f), 0f, town, terrain, true);
            House(new Vector3(108, 0, sz - 8f), 180f, town, terrain, false);
            House(new Vector3(124, 0, sz - 9f), 180f, town, terrain, true);
            House(new Vector3(142, 0, sz - 8.5f), 180f, town, terrain, false, scrap: true);
            // The square at the east end: the well, the pump, the tank, a market bench under an awning.
            Place("well", new Vector3(160, 0, sz), 0, town, terrain);
            Place("windpump", new Vector3(172, 0, sz + 14f), 0, town, terrain);
            Place("water_tank", new Vector3(168, 0, sz + 10f), 0, town, terrain);
            Place("awning", new Vector3(156, 0, sz - 6f), 0, town, terrain); Place("market_bench", new Vector3(156, 0, sz - 7.2f), 0, town, terrain);
            Place("crate_stack", new Vector3(152, 0, sz - 9f), 25f, town, terrain);
            for (var i = 0; i < 3; i++) Place("barrel_rust", new Vector3(119.5f + i * 0.8f, 0, sz + 4.6f), i * 40f, town, terrain);
            Place("sign_post", new Vector3(100, 0, sz - 3f), -20f, town, terrain);
            for (var x = 100; x <= 170; x += 14) Place("lamp_post", new Vector3(x, 0, sz - 4.5f), 0, town, terrain);
            for (var i = 0; i < 8; i++) Place("fence_wire", new Vector3(96f + i * 2f, 0, sz + 16f), 0, town, terrain);
            for (var i = 0; i < 6; i++) Place("fence_wire", new Vector3(136f + i * 2f, 0, sz - 16f), 0, town, terrain);
            // People from the bake-off, if any, in the street.
            var people = Directory.Exists(People) ? Directory.GetFiles(People, "*.fbx").OrderBy(p => p).ToArray() : new string[0];
            var ctl = people.Length > 0 ? PeopleTestScene.MotionController() : null;
            var spots = new[] { (new Vector3(118f, 0, sz - 1f), 160f), (new Vector3(126f, 0, sz + 2f), -40f), (new Vector3(158f, 0, sz + 1.5f), 90f), (new Vector3(150f, 0, sz - 2f), 20f), (new Vector3(110f, 0, sz + 3f), 200f), (new Vector3(161f, 0, sz - 3f), -120f) };
            for (var i = 0; i < people.Length && i < spots.Length; i++)
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(people[i].Replace('\\', '/'));
                if (prefab == null) continue;
                var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                go.transform.SetParent(town);
                var at = spots[i].Item1; at.y = terrain.SampleHeight(at);
                go.transform.position = at; go.transform.rotation = Quaternion.Euler(0, spots[i].Item2, 0);
                var anim = go.GetComponent<Animator>();
                if (anim != null && ctl != null) { anim.runtimeAnimatorController = ctl; anim.applyRootMotion = false; }
            }

            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 800f;
            var focus = new Vector3(126, terrain.SampleHeight(new Vector3(126, 0, sz)), sz);
            var rot = Quaternion.Euler(50f, 35f, 0f);
            camGo.transform.rotation = rot; camGo.transform.position = focus - rot * Vector3.forward * 26f;
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log("FrontierTestScene: built");
        }
    }
}
