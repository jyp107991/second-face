using System.Linq;
using SecondFace.Game.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace SecondFace.EditorTools
{
    /// <summary>
    /// P2 bake-off: every card tree (tools/unity/kits/trees.py) on flat ground under the vegetation scene's sun. Row A
    /// stands each species and seed side by side; row B holds the first seed of each species three times, named
    /// lod0_/lod1_/lod2_ so the capture forces that level and the three LODs can be judged side by side. Captured as
    /// `trees_lineup`, `trees_iso` and `trees_lod`.
    /// </summary>
    public static class TreesTestScene
    {
        public const string ScenePath = "Assets/SecondFace/Scenes/Test_Trees.unity";

        [MenuItem("Second Face/Build trees test scene")]
        public static void Build()
        {
            var lib = TextureLibrary.Load();
            var trees = ModelLibrary.Load().Values.Where(e => ModelLibrary.IsCardTree(e)).OrderBy(e => e.Id).ToList();
            if (trees.Count == 0) { Debug.LogWarning("TreesTestScene: no card trees (tools/unity/kits/trees.py)"); return; }
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var sunGo = new GameObject("Sun");
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional; sun.color = new Color(1f, 0.95f, 0.85f); sun.intensity = 2.3f; sun.shadows = LightShadows.Soft;
            sunGo.transform.rotation = Quaternion.Euler(38f, 60f, 0f);
            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.66f, 0.9f); RenderSettings.ambientEquatorColor = new Color(0.66f, 0.6f, 0.5f); RenderSettings.ambientGroundColor = new Color(0.28f, 0.22f, 0.16f);

            // flat ground: one terrain layer of dry soil
            var data = new TerrainData { heightmapResolution = 129, size = new Vector3(240, 10, 160) };
            data.SetDetailResolution(128, 16);
            if (lib.ContainsKey("scrub_soil"))
            {
                System.IO.Directory.CreateDirectory("Assets/SecondFace/Generated/TerrainLayers");
                var layer = new TerrainLayer
                {
                    diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath("scrub_soil", "d")),
                    normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(TextureLibrary.MapPath("scrub_soil", "n")),
                    tileSize = Vector2.one * lib["scrub_soil"].Metres,
                };
                const string lp = "Assets/SecondFace/Generated/TerrainLayers/trees_scrub_soil.terrainlayer";
                AssetDatabase.CreateAsset(layer, lp);
                data.terrainLayers = new[] { AssetDatabase.LoadAssetAtPath<TerrainLayer>(lp) };
            }
            AssetDatabase.CreateAsset(data, "Assets/SecondFace/Generated/Test_Trees_Terrain.asset");
            var ground = Terrain.CreateTerrainGameObject(data); ground.name = "Terrain";
            ground.transform.position = new Vector3(-120, 0, -60);

            // Row A: every species and seed, 8 m apart, centred on x = -60.
            var variants = trees.SelectMany(e => ModelLibrary.VariantPaths(e)).ToList();
            var rowA = new GameObject("RowA").transform;
            for (var i = 0; i < variants.Count; i++)
            {
                var prefab = ContentPrefabs.Bound(variants[i]);
                if (prefab == null) continue;
                var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                go.transform.SetParent(rowA);
                go.transform.position = new Vector3(-60f + (i - (variants.Count - 1) / 2f) * 8f, 0, 0);
            }
            // Row B, beside it (not behind: the cameras look along +z): the first seed of each species at LOD0, LOD1 and LOD2
            // (forced by name in the capture), centred on x = +60.
            var rowB = new GameObject("RowB").transform;
            var firsts = trees.Select(e => ModelLibrary.VariantPaths(e).FirstOrDefault()).Where(p => p != null).ToList();
            var x = 60f - (firsts.Count * 3 - 1) / 2f * 7.5f;
            foreach (var path in firsts)
            {
                var prefab = ContentPrefabs.Bound(path);
                for (var lod = 0; lod < 3; lod++, x += 7.5f)
                {
                    if (prefab == null) continue;
                    var go = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                    go.name = $"lod{lod}_{prefab.name}";
                    go.transform.SetParent(rowB);
                    go.transform.position = new Vector3(x, 0, 0);
                }
            }
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 1000f;
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.62f, 0.72f, 0.86f);
            camGo.transform.rotation = Quaternion.Euler(8f, 0f, 0f);
            camGo.transform.position = new Vector3(-60f, 5f, -58f);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            Debug.Log($"TreesTestScene: {variants.Count} trees in row A, {firsts.Count * 3} in row B");
        }
    }
}
