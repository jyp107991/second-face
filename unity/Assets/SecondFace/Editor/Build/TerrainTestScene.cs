using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// P2 bake-off scene: a 512 m Unity Terrain from noise with the region terrain layers of the fetched library, a sun,
    /// sky and a camera on the iso rig's default framing. Built in code (the session has no editor; CI does), saved
    /// as Assets/SecondFace/Scenes/Test_Terrain.unity and captured by the PlayMode screenshot tests.
    /// </summary>
    public static class TerrainTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Terrain.unity";
        private const string LayerDir = "Assets/SecondFace/Generated/TerrainLayers";

        [MenuItem("Second Face/Build terrain test scene")]
        public static void Build()
        {
            var lib = TextureLibrary.Load();
            if (lib.Count == 0) { Debug.LogWarning("TerrainTestScene: no external library (run tools/unity/assets.py)"); return; }
            Directory.CreateDirectory(LayerDir);
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Sun and sky.
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.96f, 0.88f);
            sun.intensity = 2.2f;
            sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(48f, -35f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.65f, 0.85f);
            RenderSettings.ambientEquatorColor = new Color(0.6f, 0.55f, 0.45f);
            RenderSettings.ambientGroundColor = new Color(0.25f, 0.2f, 0.15f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogColor = new Color(0.78f, 0.74f, 0.66f);
            RenderSettings.fogDensity = 0.0025f;

            // Terrain: 512 m, 128 m tall, noise with a dry basin, a mesa and a road cut.
            const int res = 513;
            var data = new TerrainData { heightmapResolution = res, size = new Vector3(512, 128, 512) };
            data.SetDetailResolution(1024, 32);   // a TerrainData without one logs "zero detail resolution" as an error
            var heights = new float[res, res];
            for (var y = 0; y < res; y++)
                for (var x = 0; x < res; x++)
                {
                    float u = x / (float)(res - 1), v = y / (float)(res - 1);
                    var h = 0.18f + 0.12f * Mathf.PerlinNoise(u * 3.1f + 7.3f, v * 3.1f + 2.1f) + 0.05f * Mathf.PerlinNoise(u * 11f, v * 11f) + 0.015f * Mathf.PerlinNoise(u * 41f, v * 41f);
                    var mesa = Mathf.Clamp01((0.22f - Vector2.Distance(new Vector2(u, v), new Vector2(0.68f, 0.62f))) * 9f);
                    h += mesa * 0.28f;
                    var basin = Mathf.Clamp01((0.2f - Vector2.Distance(new Vector2(u, v), new Vector2(0.3f, 0.35f))) * 6f);
                    h -= basin * 0.07f;
                    heights[y, x] = Mathf.Clamp01(h);
                }
            data.SetHeights(0, 0, heights);

            // Layers from the library (the Sallow set), splatted by height and slope.
            var keys = new[] { "sand", "scrub_soil", "salt", "rock", "cracked", "rubble" }.Where(lib.ContainsKey).ToArray();
            var layers = new List<TerrainLayer>();
            foreach (var key in keys)
            {
                var layer = new TerrainLayer
                {
                    diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "d")),
                    normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "n")),
                    maskMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(key, "mask")),
                    tileSize = Vector2.one * lib[key].Metres,
                    normalScale = 1f,
                };
                if (key == "salt") layer.diffuseRemapMax = new Vector4(1.15f, 1.12f, 1.05f, 1f);
                var path = $"{LayerDir}/{key}.terrainlayer";
                AssetDatabase.CreateAsset(layer, path);
                layers.Add(AssetDatabase.LoadAssetAtPath<TerrainLayer>(path));
            }
            data.terrainLayers = layers.ToArray();
            var ar = data.alphamapResolution;
            var maps = new float[ar, ar, layers.Count];
            for (var y = 0; y < ar; y++)
                for (var x = 0; x < ar; x++)
                {
                    float u = x / (float)(ar - 1), v = y / (float)(ar - 1);
                    var h = data.GetInterpolatedHeight(u, v) / data.size.y;
                    var slope = data.GetSteepness(u, v) / 90f;
                    var n = Mathf.PerlinNoise(u * 9f + 3f, v * 9f + 1f);
                    var w = new float[layers.Count];
                    int i;
                    i = System.Array.IndexOf(keys, "sand"); if (i >= 0) w[i] = Mathf.Clamp01(1f - slope * 3f) * (0.5f + 0.5f * n);
                    i = System.Array.IndexOf(keys, "scrub_soil"); if (i >= 0) w[i] = Mathf.Clamp01(1f - slope * 2f) * (1f - n) * 0.9f;
                    i = System.Array.IndexOf(keys, "salt"); if (i >= 0) w[i] = Mathf.Clamp01((0.2f - h) * 12f) * Mathf.Clamp01(1f - slope * 6f);
                    i = System.Array.IndexOf(keys, "rock"); if (i >= 0) w[i] = Mathf.Clamp01((slope - 0.25f) * 3f);
                    i = System.Array.IndexOf(keys, "cracked"); if (i >= 0) w[i] = Mathf.Clamp01((h - 0.32f) * 6f) * Mathf.Clamp01(1f - slope * 3f) * n;
                    i = System.Array.IndexOf(keys, "rubble"); if (i >= 0) w[i] = Mathf.Clamp01(Mathf.PerlinNoise(u * 23f, v * 23f) - 0.72f) * 4f;
                    var sum = w.Sum();
                    if (sum <= 0) { w[0] = 1; sum = 1; }
                    for (var k = 0; k < w.Length; k++) maps[y, x, k] = w[k] / sum;
                }
            data.SetAlphamaps(0, 0, maps);
            AssetDatabase.CreateAsset(data, "Assets/SecondFace/Generated/Test_Terrain.asset");
            var terrainGo = Terrain.CreateTerrainGameObject(data);
            terrainGo.name = "Terrain";
            var terrain = terrainGo.GetComponent<Terrain>();
            terrain.heightmapPixelError = 4f;
            terrain.basemapDistance = 400f;

            // A few primitives so scale and shadows read: a tower, crates, a wall.
            var rocks = new GameObject("Blocks");
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(lib.ContainsKey("concrete_wall") ? "concrete_wall" : keys[0], "d"));
            mat.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(lib.ContainsKey("concrete_wall") ? "concrete_wall" : keys[0], "n")));
            mat.EnableKeyword("_NORMALMAP");
            AssetDatabase.CreateAsset(mat, "Assets/SecondFace/Generated/Test_Block.mat");
            void Block(Vector3 size, Vector3 at)
            {
                var b = GameObject.CreatePrimitive(PrimitiveType.Cube);
                b.transform.SetParent(rocks.transform);
                b.transform.localScale = size;
                var ground = terrain.SampleHeight(at) + size.y / 2f;
                b.transform.position = new Vector3(at.x, ground, at.z);
                b.GetComponent<Renderer>().sharedMaterial = mat;
            }
            Block(new Vector3(6, 14, 6), new Vector3(250, 0, 250));
            Block(new Vector3(1.2f, 1.2f, 1.2f), new Vector3(243, 0, 246));
            Block(new Vector3(1.2f, 1.2f, 1.2f), new Vector3(244.5f, 0, 247));
            Block(new Vector3(18, 2.6f, 0.4f), new Vector3(258, 0, 240));

            // Camera on the iso framing of DESIGN_UNITY §2: 50° pitch, 35° fov, 14 m out.
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.fieldOfView = 35f;
            cam.nearClipPlane = 0.3f;
            cam.farClipPlane = 1500f;
            var focus = new Vector3(250, terrain.SampleHeight(new Vector3(250, 0, 250)), 250);
            var rot = Quaternion.Euler(50f, 35f, 0f);
            camGo.transform.rotation = rot;
            camGo.transform.position = focus - rot * Vector3.forward * 22f;

            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log($"TerrainTestScene: built {ScenePath} with {layers.Count} layers");
        }
    }
}
