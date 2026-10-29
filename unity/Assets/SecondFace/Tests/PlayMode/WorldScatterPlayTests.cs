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
    /// The world's props in the engine (step 19a): the streamer builds the ground round the focus and the spawner puts
    /// the chunks' props on it, loaded by address; captured round Shale and in the Teeth from the game camera and from
    /// mid range (`world_scatter_sallow`, `world_scatter_teeth`, `_mid`), with the props' count and the frame time
    /// printed (the editor's software GL is no judge of a phone: P3.7 measures on the device).
    /// </summary>
    public class WorldScatterPlayTests : IPrebuildSetup
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
            foreach (var s in Object.FindObjectsByType<WorldStreamer>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var s in Object.FindObjectsByType<SkyController>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            var props = GameObject.Find("Props"); if (props != null) Object.Destroy(props);
            yield return null;
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator PropsStandRoundShaleAndInTheTeeth()
        {
#if UNITY_EDITOR
            var layers = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>("Assets/SecondFace/Terrain/BiomeLayers.asset");
            var profile = AssetDatabase.LoadAssetAtPath<SkyProfile>("Assets/SecondFace/Sky/SkyProfile.asset");
            var catalog = AssetDatabase.LoadAssetAtPath<ScatterCatalog>("Assets/SecondFace/World/ScatterCatalog.asset");
            var details = AssetDatabase.LoadAssetAtPath<DetailSet>("Assets/SecondFace/World/DetailSet.asset");
#else
            BiomeLayerSet layers = null; SkyProfile profile = null; ScatterCatalog catalog = null; DetailSet details = null;
#endif
            Assert.That(details, Is.Not.Null, "the detail set (Second Face/Build detail meshes)");
            Assert.That(details.Entries.Length, Is.EqualTo(WorldDetails.Keys.Length), "a prototype for every detail key");
            Assert.That(catalog, Is.Not.Null, "the scatter catalog (Second Face/Build scatter catalog)");
            Assert.That(catalog.Variants("pine"), Is.GreaterThan(0), "the card pines are in the catalog");
            Assert.That(catalog.Variants("quiver_tree_01"), Is.GreaterThan(0), "the scanned quiver trees are in the catalog");
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            var go = new GameObject("Streamer");
            var streamer = go.AddComponent<WorldStreamer>();
            streamer.World = world; streamer.Layers = layers; streamer.Catalog = catalog; streamer.Details = details;
            yield return streamer.Prewarm();
            Assert.That(details.Prototypes, Is.Not.Null.And.Length.EqualTo(WorldDetails.Keys.Length), "the detail prototypes loaded by address");

            var skyGo = new GameObject("Sky");
            var clock = skyGo.AddComponent<TimeService>(); clock.Paused = true; clock.SetHour(10.5);
            var sky = skyGo.AddComponent<SkyController>();
            sky.Clock = clock; sky.World = world; sky.Profile = profile; sky.Force = WeatherKind.Clear;

            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.5f; cam.farClipPlane = 3000f;
            cam.clearFlags = CameraClearFlags.Skybox;

            var shale = world.PlaceCentre("shale");
            yield return Visit(world, streamer, cam, sky, "world_scatter_sallow", new Vector3(shale.x + 260f, 0, shale.z + 140f));
            yield return Visit(world, streamer, cam, sky, "world_scatter_teeth", new Vector3(21000f, 0, 11000f));
        }

        private static IEnumerator Visit(WorldService world, WorldStreamer streamer, Camera cam, SkyController sky, string name, Vector3 at)
        {
            world.Focus = at;
            var (fx, fz) = WorldGrid.ChunkAt(at.x, at.z);
            var t0 = Time.realtimeSinceStartup;
            // the 3 × 3 chunks round the focus built and their props placed
            while (Time.realtimeSinceStartup - t0 < 240f)
            {
                var near = WorldGrid.Around(at.x, at.z, 1).All(c => streamer.IsBuilt(c.cx, c.cz));
                if (near && streamer.Spawner != null && streamer.Spawner.Idle && WorldGrid.Around(at.x, at.z, 1).All(c => streamer.Spawner.IsShown(c.cx, c.cz))) break;
                yield return null;
            }
            Assert.That(streamer.Spawner, Is.Not.Null);
            Assert.That(streamer.Spawner.Idle, Is.True, $"{name}: props still waiting after {Time.realtimeSinceStartup - t0:0} s");
            var terrain = streamer.TerrainAt(fx, fz);
            at.y = terrain.SampleHeight(at) + terrain.transform.position.y;
            world.Focus = at;
            sky.Apply();
            // frame time over 60 frames with everything in place (editor, software GL)
            var f0 = Time.realtimeSinceStartup;
            for (var i = 0; i < 60; i++) yield return null;
            var ms = (Time.realtimeSinceStartup - f0) / 60f * 1000f;
            var detailCount = 0;
            foreach (var c in WorldGrid.Around(at.x, at.z, 1))
            {
                var td = streamer.TerrainAt(c.cx, c.cz).terrainData;
                for (var l = 0; l < td.detailPrototypes.Length; l++) detailCount += td.GetDetailLayer(0, 0, td.detailWidth, td.detailHeight, l).Cast<int>().Sum();
            }
            Debug.Log($"WorldScatterPlayTests: {name}: {streamer.Spawner.LiveCount} props live, {detailCount} details in the 3 × 3 chunks, {streamer.Built.Count} chunks built, mean frame {ms:0.0} ms (editor); spawn took {Time.realtimeSinceStartup - t0:0.0} s; last write {string.Join(", ", ChunkTerrain.LastApplyMs.Select(kv => $"{kv.Key} {kv.Value:0.0}"))}");
            Assert.That(detailCount, Is.GreaterThan(20000), $"{name}: the ground carries its small scatter");
            Assert.That(streamer.Spawner.LiveCount, Is.GreaterThan(300), $"{name}: the land round the focus carries props");
            cam.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
            cam.transform.position = at - cam.transform.rotation * Vector3.forward * 55f;
            yield return null;
            yield return ScreenshotTests.Capture(name, 1920, 1080);
            cam.transform.position = at - cam.transform.rotation * Vector3.forward * 22f;
            yield return null;
            yield return ScreenshotTests.Capture(name + "_close", 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(35f, 30f, 0f);
            cam.transform.position = at - cam.transform.rotation * Vector3.forward * 200f;
            yield return null;
            yield return ScreenshotTests.Capture(name + "_mid", 1920, 1080);
        }
    }
}
