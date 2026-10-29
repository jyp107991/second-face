using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The sea and the river in the streamed world (step 22): the streamer lays each chunk's water sheet with its ground;
    /// captured on the shore by the city, on the river's bank in the Wet and where it falls, and at its mouth, from the
    /// game camera and from mid range (`world_water_shore`, `world_water_river`, `world_water_falls`,
    /// `world_water_mouth`, `_mid`); the sheet is not drawn while the view is under the ground.
    /// </summary>
    public class WorldWaterPlayTests : IPrebuildSetup
    {
        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build terrain layers");
            EditorApplication.ExecuteMenuItem("Second Face/Build sky assets");
            EditorApplication.ExecuteMenuItem("Second Face/Build scatter catalog");
            EditorApplication.ExecuteMenuItem("Second Face/Build detail meshes");
#endif
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            WorldView.SetUnderground(false);
            foreach (var s in Object.FindObjectsByType<WorldStreamer>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var s in Object.FindObjectsByType<SkyController>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            var props = GameObject.Find("Props"); if (props != null) Object.Destroy(props);
            yield return null;
        }

        [UnityTest, Timeout(1200000)]
        public IEnumerator TheSeaAndTheRiverLieInTheWorld()
        {
#if UNITY_EDITOR
            var layers = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>("Assets/SecondFace/Terrain/BiomeLayers.asset");
            var profile = AssetDatabase.LoadAssetAtPath<SkyProfile>("Assets/SecondFace/Sky/SkyProfile.asset");
            var catalog = AssetDatabase.LoadAssetAtPath<ScatterCatalog>("Assets/SecondFace/World/ScatterCatalog.asset");
            var details = AssetDatabase.LoadAssetAtPath<DetailSet>("Assets/SecondFace/World/DetailSet.asset");
#else
            BiomeLayerSet layers = null; SkyProfile profile = null; ScatterCatalog catalog = null; DetailSet details = null;
#endif
            Assert.That(layers.Water, Is.Not.Null, "the water material (Second Face/Build terrain layers)");
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            var go = new GameObject("Streamer");
            var streamer = go.AddComponent<WorldStreamer>();
            streamer.World = world; streamer.Layers = layers; streamer.Catalog = catalog; streamer.Details = details;
            yield return streamer.Prewarm();

            var skyGo = new GameObject("Sky");
            var clock = skyGo.AddComponent<TimeService>(); clock.Paused = true; clock.SetHour(10.5);
            var sky = skyGo.AddComponent<SkyController>();
            sky.Clock = clock; sky.World = world; sky.Profile = profile; sky.Force = WeatherKind.Clear;

            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.5f; cam.farClipPlane = 3000f;
            cam.clearFlags = CameraClearFlags.Skybox;

            // the shore west of the city: the first dry ground from the sea, a little out to sea
            var city = world.Layout.Places["meridian"];
            float sz = city.Centre[1] + 300f, sx = 0f;
            while (world.Gen.Natural(sx, sz) < 0f) sx += 4f;
            yield return Visit(world, streamer, cam, sky, "world_water_shore", new Vector3(sx - 12f, 0, sz));
            // the river: on its bank in the flat of the Wet, where it falls towards the coast, and its mouth
            var river = world.Gen.Rivers[0];
            Vector3 Bank(float s, float off)
            {
                var (x, z) = river.PointAt(s);
                var (x2, z2) = river.PointAt(s + 20f);
                var d = new Vector2(x2 - x, z2 - z).normalized;
                return new Vector3(x - d.y * off, 0, z + d.x * off);
            }
            yield return Visit(world, streamer, cam, sky, "world_water_river", Bank(3000f, river.Half - 8f));
            yield return Visit(world, streamer, cam, sky, "world_water_falls", Bank(7600f, river.Half - 8f));
            yield return Visit(world, streamer, cam, sky, "world_water_mouth", Bank(11400f, 0f));

            // under the ground the sheet is not drawn, and comes back with the surface
            var water = streamer.Built.Select(c => streamer.TerrainAt(c.cx, c.cz).transform.Find(ChunkTerrain.WaterName)).Where(t => t != null)
                .Select(t => t.GetComponent<MeshRenderer>()).Where(r => r.enabled).ToList();
            Assert.That(water, Is.Not.Empty);
            WorldView.SetUnderground(true);
            Assert.That(water.All(r => !r.enabled), Is.True, "water drawn under the ground");
            WorldView.SetUnderground(false);
            Assert.That(water.All(r => r.enabled), Is.True, "water back with the surface");
        }

        private static IEnumerator Visit(WorldService world, WorldStreamer streamer, Camera cam, SkyController sky, string name, Vector3 at)
        {
            world.Focus = at;
            var (fx, fz) = WorldGrid.ChunkAt(at.x, at.z);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 240f)
            {
                var near = WorldGrid.Around(at.x, at.z, 1).All(c => streamer.IsBuilt(c.cx, c.cz));
                if (near && streamer.Spawner != null && streamer.Spawner.Idle && WorldGrid.Around(at.x, at.z, 1).All(c => streamer.Spawner.IsShown(c.cx, c.cz))) break;
                yield return null;
            }
            Assert.That(WorldGrid.Around(at.x, at.z, 1).All(c => streamer.IsBuilt(c.cx, c.cz)), Is.True, $"{name}: ground not built after {Time.realtimeSinceStartup - t0:0} s");
            var terrain = streamer.TerrainAt(fx, fz);
            var sheet = terrain.transform.Find(ChunkTerrain.WaterName);
            Assert.That(sheet != null && sheet.GetComponent<MeshRenderer>().enabled, Is.True, $"{name}: no water on the chunk");
            var mesh = sheet.GetComponent<MeshFilter>().sharedMesh;
            var (level, byRiver, _, _) = world.Water.LevelAt(at.x, at.z);
            at.y = Mathf.Max(level, terrain.SampleHeight(at) + terrain.transform.position.y);
            world.Focus = at;
            sky.Apply();
            for (var i = 0; i < 10; i++) yield return null;
            Debug.Log($"WorldWaterPlayTests: {name}: level {level:0.00} m ({(byRiver ? "river" : "sea")}), sheet {mesh.vertexCount} vertices, {mesh.triangles.Length / 3} triangles; last write {string.Join(", ", ChunkTerrain.LastApplyMs.Select(kv => $"{kv.Key} {kv.Value:0.0}"))}");
            cam.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
            cam.transform.position = at - cam.transform.rotation * Vector3.forward * 55f;
            yield return null;
            yield return ScreenshotTests.Capture(name, 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(35f, 30f, 0f);
            cam.transform.position = at - cam.transform.rotation * Vector3.forward * 220f;
            yield return null;
            yield return ScreenshotTests.Capture(name + "_mid", 1920, 1080);
        }
    }
}
