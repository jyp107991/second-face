using System.Collections.Generic;
using System.IO;
using System.Linq;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// P2 bake-off: a 512 m stretch of the Sallow — the terrain layers, quiver trees and dead wood, scrub and boulders
    /// scattered by slope and height from the baked CC0 models (tools/unity/models_bake.py), grass clumps as terrain
    /// detail — under a morning sun. Captured as `vegetation_*`. LOD groups and impostors are P3; this shows the baked
    /// quality at phone budgets and the density the layout rules produce.
    /// </summary>
    public static class VegetationTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Vegetation.unity";

        /// <summary>
        /// The Teeth beside the Sallow (a second 512 m tile to the east): a mountainside rising from the scrub's level, pines
        /// on its upper slopes from the card-tree baker, dead wood, boulders and stones; four terrain layers. Captured as
        /// `vegetation_teeth`. Returns the instances placed.
        /// </summary>
        private static int BuildTeeth(Dictionary<string, LibraryEntry> lib, System.Func<string, GameObject[]> prefabsOf, System.Func<string, Transform> group)
        {
            const int res = 513;
            var data = new TerrainData { heightmapResolution = res, size = new Vector3(512, 180, 512) };
            data.SetDetailResolution(512, 32);
            var heights = new float[res, res];
            for (var y = 0; y < res; y++) for (var x = 0; x < res; x++)
            {
                float u = x / (float)(res - 1), v = y / (float)(res - 1);
                // the rise from the west edge (the scrub's height) to the ridge in the east, folded by spurs and gullies
                var rise = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(u * 1.15f - 0.05f));
                var spurs = Mathf.PerlinNoise(u * 3.2f + 5f, v * 3.2f + 1f) - 0.5f;
                var ridged = 1f - Mathf.Abs(Mathf.PerlinNoise(u * 6f + 2f, v * 6f + 9f) * 2f - 1f);
                var h = 0.13f + 0.62f * rise + 0.12f * spurs * rise + 0.05f * ridged * rise + 0.01f * Mathf.PerlinNoise(u * 40f, v * 40f);
                heights[y, x] = Mathf.Clamp01(h);
            }
            data.SetHeights(0, 0, heights);
            // four layers per tile (BUILD_PLAN §6.A.3). The library's "forest" scan is orange broadleaf litter, not pine
            // needles: dry ground stands in under the pines until P3.2 fetches a needle-litter texture.
            var keys = new[] { "scrub_soil", "grass_dry", "rock", "gravel" }.Where(lib.ContainsKey).ToArray();
            var layers = keys.Select(k =>
            {
                var layer = new TerrainLayer
                {
                    diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "d")),
                    normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "n")),
                    maskMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "mask")),
                    tileSize = Vector2.one * lib[k].Metres,
                };
                var p = $"Assets/SecondFace/Generated/TerrainLayers/teeth_{k}.terrainlayer";
                AssetDatabase.CreateAsset(layer, p);
                return AssetDatabase.LoadAssetAtPath<TerrainLayer>(p);
            }).ToArray();
            data.terrainLayers = layers;
            var ar = data.alphamapResolution;
            var maps = new float[ar, ar, layers.Length];
            for (var y = 0; y < ar; y++) for (var x = 0; x < ar; x++)
            {
                float u = x / (float)(ar - 1), v = y / (float)(ar - 1);
                var h = data.GetInterpolatedHeight(u, v) / data.size.y;
                var slope = data.GetSteepness(u, v) / 90f;
                var n = Mathf.PerlinNoise(u * 9f + 3f, v * 9f + 6f);
                var w = new float[layers.Length];
                int i;
                // litter under the trees' clumps (the scatter's own noise field), dry grass in the clearings and below
                var clump = Mathf.PerlinNoise(u * 11f + 4f, v * 11f + 13f);
                i = System.Array.IndexOf(keys, "scrub_soil"); if (i >= 0) w[i] = Mathf.Clamp01((h - 0.4f) * 6f) * Mathf.Clamp01(1f - slope * 2.2f) * Mathf.Clamp01((clump - 0.3f) * 3f) * (0.6f + 0.4f * n);
                i = System.Array.IndexOf(keys, "grass_dry"); if (i >= 0) w[i] = Mathf.Clamp01(1f - slope * 2.5f) * (Mathf.Clamp01((0.55f - h) * 5f) + Mathf.Clamp01((0.45f - clump) * 3f)) * (0.4f + 0.6f * (1f - n));
                i = System.Array.IndexOf(keys, "rock"); if (i >= 0) w[i] = Mathf.Clamp01((slope - 0.3f) * 4f);
                i = System.Array.IndexOf(keys, "gravel"); if (i >= 0) w[i] = 0.15f + Mathf.Clamp01(1f - slope * 3f) * (1f - n) * 0.35f;
                var sum = w.Sum(); if (sum <= 0) { w[0] = 1; sum = 1; }
                for (var k = 0; k < w.Length; k++) maps[y, x, k] = w[k] / sum;
            }
            data.SetAlphamaps(0, 0, maps);
            AssetDatabase.CreateAsset(data, "Assets/SecondFace/Generated/Test_Vegetation_Teeth.asset");
            var go0 = Terrain.CreateTerrainGameObject(data); go0.name = "TerrainTeeth";
            go0.transform.position = new Vector3(512, 0, 0);
            var terrain = go0.GetComponent<Terrain>(); terrain.heightmapPixelError = 4f; terrain.basemapDistance = 500f;
            GroundSample Ground(float u, float v) => new GroundSample(
                data.GetInterpolatedHeight(u, v) / data.size.y, data.GetSteepness(u, v) / 90f, 0f,
                Mathf.PerlinNoise(u * 11f + 4f, v * 11f + 13f));
            var models = ModelLibrary.Load();
            var rng = new System.Random(11);
            var placed = 0;
            foreach (var rule in Scatter.For("teeth"))
            {
                var prefabs = rule.Models.Where(k => models.TryGetValue(k, out var e) && e.Place != "patch").SelectMany(prefabsOf).ToArray();
                if (prefabs.Length == 0) { Debug.LogWarning($"VegetationTestScene: no models for teeth {rule.Group}"); continue; }
                foreach (var p in Scatter.Place(rule, Ground, prefabs.Length, rng))
                {
                    var go = (GameObject)PrefabUtility.InstantiatePrefab(prefabs[p.Model]);
                    go.transform.SetParent(group("Teeth" + rule.Group));
                    var pos = new Vector3(512 + p.U * data.size.x, 0, p.V * data.size.z); pos.y = terrain.SampleHeight(pos) - 0.05f;
                    go.transform.SetPositionAndRotation(pos, Quaternion.Euler(0, p.Yaw, 0));
                    go.transform.localScale = Vector3.one * p.Scale;
                    go.isStatic = true;
                    placed++;
                }
            }
            Debug.Log($"VegetationTestScene: {placed} instances scattered in the Teeth");
            return placed;
        }

        [MenuItem("Second Face/Build vegetation test scene")]
        public static void Build()
        {
            var lib = TextureLibrary.Load();
            var models = ModelLibrary.Load();
            if (lib.Count == 0 || models.Count == 0) { Debug.LogWarning("VegetationTestScene: libraries missing (tools/unity/assets.py; models_bake.py output is committed)"); return; }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.color = new Color(1f, 0.95f, 0.85f); sun.intensity = 2.3f; sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(38f, 60f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.66f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.66f, 0.6f, 0.5f); RenderSettings.ambientGroundColor = new Color(0.28f, 0.22f, 0.16f);
            RenderSettings.fog = true; RenderSettings.fogMode = FogMode.ExponentialSquared; RenderSettings.fogColor = new Color(0.8f, 0.76f, 0.68f); RenderSettings.fogDensity = 0.0022f;

            // Terrain: the Sallow's mesas and a dry wash.
            const int res = 513;
            var data = new TerrainData { heightmapResolution = res, size = new Vector3(512, 110, 512) };
            data.SetDetailResolution(1024, 32);   // a TerrainData without one logs "zero detail resolution" as an error
            var heights = new float[res, res];
            for (var y = 0; y < res; y++) for (var x = 0; x < res; x++)
            {
                float u = x / (float)(res - 1), v = y / (float)(res - 1);
                var h = 0.2f + 0.1f * Mathf.PerlinNoise(u * 2.6f + 3f, v * 2.6f + 8f) + 0.04f * Mathf.PerlinNoise(u * 9f, v * 9f) + 0.012f * Mathf.PerlinNoise(u * 37f, v * 37f);
                var mesa = Mathf.Clamp01((0.18f - Vector2.Distance(new Vector2(u, v), new Vector2(0.7f, 0.3f))) * 10f);
                h += Mathf.SmoothStep(0, 1, mesa) * 0.3f;
                var wash = Mathf.Exp(-Mathf.Pow((u - 0.35f - 0.1f * Mathf.Sin(v * 6f)) * 9f, 2));
                h -= wash * 0.05f;
                heights[y, x] = Mathf.Clamp01(h);
            }
            data.SetHeights(0, 0, heights);
            var keys = new[] { "scrub_soil", "sand", "rock", "cracked", "gravel" }.Where(lib.ContainsKey).ToArray();
            System.IO.Directory.CreateDirectory("Assets/SecondFace/Generated/TerrainLayers");
            var layers = keys.Select(k =>
            {
                var layer = new TerrainLayer
                {
                    diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "d")),
                    normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "n")),
                    maskMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath(k, "mask")),
                    tileSize = Vector2.one * lib[k].Metres,
                };
                var p = $"Assets/SecondFace/Generated/TerrainLayers/veg_{k}.terrainlayer";
                AssetDatabase.CreateAsset(layer, p);
                return AssetDatabase.LoadAssetAtPath<TerrainLayer>(p);
            }).ToArray();
            data.terrainLayers = layers;
            var ar = data.alphamapResolution;
            var maps = new float[ar, ar, layers.Length];
            for (var y = 0; y < ar; y++) for (var x = 0; x < ar; x++)
            {
                float u = x / (float)(ar - 1), v = y / (float)(ar - 1);
                var h = data.GetInterpolatedHeight(u, v) / data.size.y;
                var slope = data.GetSteepness(u, v) / 90f;
                var n = Mathf.PerlinNoise(u * 8f + 1f, v * 8f + 4f);
                var wash = Mathf.Exp(-Mathf.Pow((u - 0.35f - 0.1f * Mathf.Sin(v * 6f)) * 9f, 2));
                var w = new float[layers.Length];
                int i;
                i = System.Array.IndexOf(keys, "scrub_soil"); if (i >= 0) w[i] = Mathf.Clamp01(1f - slope * 3f) * (0.45f + 0.55f * n);
                i = System.Array.IndexOf(keys, "sand"); if (i >= 0) w[i] = Mathf.Clamp01(1f - slope * 3f) * (1f - n) * 0.8f + wash * 0.6f;
                i = System.Array.IndexOf(keys, "rock"); if (i >= 0) w[i] = Mathf.Clamp01((slope - 0.22f) * 3.5f);
                i = System.Array.IndexOf(keys, "cracked"); if (i >= 0) w[i] = Mathf.Clamp01((h - 0.4f) * 5f) * Mathf.Clamp01(1f - slope * 3f) * n;
                i = System.Array.IndexOf(keys, "gravel"); if (i >= 0) w[i] = wash * 0.8f;
                var sum = w.Sum(); if (sum <= 0) { w[0] = 1; sum = 1; }
                for (var k = 0; k < w.Length; k++) maps[y, x, k] = w[k] / sum;
            }
            data.SetAlphamaps(0, 0, maps);
            AssetDatabase.CreateAsset(data, "Assets/SecondFace/Generated/Test_Vegetation_Terrain.asset");
            var terrainGo = Terrain.CreateTerrainGameObject(data); terrainGo.name = "Terrain";
            var terrain = terrainGo.GetComponent<Terrain>(); terrain.heightmapPixelError = 4f; terrain.basemapDistance = 500f;

            // Scatter: rules by slope, height, wash and noise. Deterministic. Every variant of a model is used, as a prefab
            // with its library materials bound (one bind per variant, not per instance).
            GameObject[] Prefabs(string key) =>
                models.TryGetValue(key, out var entry) ? ModelLibrary.VariantPaths(entry).Select(ContentPrefabs.Bound).Where(p => p != null).ToArray() : new GameObject[0];
            var groups = new Dictionary<string, Transform>();
            Transform Group(string n) { if (!groups.TryGetValue(n, out var t)) { t = new GameObject(n).transform; groups[n] = t; } return t; }
            // The ground as the scatter rules read it (Core Scatter: biome × slope × height × wash × noise).
            GroundSample Ground(float u, float v) => new GroundSample(
                data.GetInterpolatedHeight(u, v) / data.size.y,
                data.GetSteepness(u, v) / 90f,
                Mathf.Exp(-Mathf.Pow((u - 0.35f - 0.1f * Mathf.Sin(v * 6f)) * 9f, 2)),
                Mathf.PerlinNoise(u * 14f + 11f, v * 14f + 2f));
            var rng = new System.Random(7);
            int placed = 0;
            foreach (var rule in Scatter.For("sallow"))
            {
                var prefabs = rule.Models.Where(k => models.TryGetValue(k, out var e) && e.Place != "patch").SelectMany(Prefabs).ToArray();
                if (prefabs.Length == 0) { Debug.LogWarning($"VegetationTestScene: no models for {rule.Group}"); continue; }
                foreach (var p in Scatter.Place(rule, Ground, prefabs.Length, rng))
                {
                    var go = (GameObject)PrefabUtility.InstantiatePrefab(prefabs[p.Model]);
                    go.transform.SetParent(Group(rule.Group));
                    var pos = new Vector3(p.U * data.size.x, 0, p.V * data.size.z); pos.y = terrain.SampleHeight(pos) - 0.03f;
                    go.transform.SetPositionAndRotation(pos, Quaternion.Euler(0, p.Yaw, 0));
                    go.transform.localScale = Vector3.one * p.Scale;
                    go.isStatic = true;
                    placed++;
                }
            }
            // Scanned ground patches (rock beds wider than 6 m) are features, not scatter: a few at the mesa's foot and the wash.
            foreach (var (key, u, v, yaw) in new[] { ("coast_land_rocks_02", 0.62f, 0.36f, 20f), ("coast_land_rocks_02", 0.74f, 0.45f, 140f), ("coast_rocks_01", 0.80f, 0.22f, 75f) })
            {
                var prefab = Prefabs(key).FirstOrDefault(); if (prefab == null) continue;
                var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                go.transform.SetParent(Group("Patches"));
                var pos = new Vector3(u * data.size.x, 0, v * data.size.z); pos.y = terrain.SampleHeight(pos) - 0.15f;
                go.transform.SetPositionAndRotation(pos, Quaternion.Euler(0, yaw, 0)); go.isStatic = true; placed++;
            }
            Debug.Log($"VegetationTestScene: {placed} instances scattered in the Sallow");
            // Grass as terrain detail meshes where the soil is flat and the wash is near.
            var grassKeys = new[] { "grass_medium_01", "grass_medium_02" }.SelectMany(Prefabs).ToArray();
            if (grassKeys.Length > 0)
            {
                data.detailPrototypes = grassKeys.Select(g => new DetailPrototype { prototype = g, usePrototypeMesh = true, renderMode = DetailRenderMode.VertexLit, useInstancing = true, minWidth = 0.6f, maxWidth = 1.2f, minHeight = 0.5f, maxHeight = 1.0f, noiseSpread = 0.3f, healthyColor = Color.white, dryColor = new Color(0.95f, 0.9f, 0.75f) }).ToArray();
                var dr = data.detailResolution;
                for (var k = 0; k < grassKeys.Length; k++)
                {
                    var dmap = new int[dr, dr];
                    for (var y = 0; y < dr; y++) for (var x = 0; x < dr; x++)
                    {
                        float u = x / (float)(dr - 1), v = y / (float)(dr - 1);
                        var slope = data.GetSteepness(u, v) / 90f;
                        var wash = Mathf.Exp(-Mathf.Pow((u - 0.35f - 0.1f * Mathf.Sin(v * 6f)) * 9f, 2));
                        var n = Mathf.PerlinNoise(u * 20f + k * 3f, v * 20f + 7f);
                        var d = slope < 0.3f ? (0.3f + wash * 0.7f) * n * 4f : 0f;
                        dmap[y, x] = Mathf.Clamp(Mathf.RoundToInt(d), 0, 4);
                    }
                    data.SetDetailLayer(0, 0, k, dmap);
                }
                terrain.detailObjectDistance = 120f; terrain.detailObjectDensity = 0.8f;
            }
            placed += BuildTeeth(lib, Prefabs, Group);
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 1500f;
            var focus = new Vector3(190, 0, 200); focus.y = terrain.SampleHeight(focus);
            var rot = Quaternion.Euler(50f, 40f, 0f);
            camGo.transform.rotation = rot; camGo.transform.position = focus - rot * Vector3.forward * 30f;
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
        }
    }
}
