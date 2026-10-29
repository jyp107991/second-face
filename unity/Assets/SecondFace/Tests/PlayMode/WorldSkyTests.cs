using System.Collections;
using System.Collections.Generic;
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
    /// The day and the weather in the engine (BUILD_PLAN §6.A.6, step 18): the four chunks round Shale under the
    /// SkyController at 7:00, 13:00, 19:00 and midnight, and at 13:00 in dust and in rain, from a low camera that shows
    /// the sky (`sky_0700`, `sky_1300`, `sky_1900`, `sky_night`, `sky_dust`, `sky_rain`) and once from the game camera
    /// (`sky_1300_iso`). Checks that the light follows the clock and the weather.
    /// </summary>
    public class WorldSkyTests : IPrebuildSetup
    {
        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build terrain layers");
            EditorApplication.ExecuteMenuItem("Second Face/Build sky assets");
#endif
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) Object.Destroy(l.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var s in Object.FindObjectsByType<SkyController>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            yield return null;
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator TheDayAndTheWeatherOverShale()
        {
#if UNITY_EDITOR
            var layers = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>("Assets/SecondFace/Terrain/BiomeLayers.asset");
            var profile = AssetDatabase.LoadAssetAtPath<SkyProfile>("Assets/SecondFace/Sky/SkyProfile.asset");
#else
            BiomeLayerSet layers = null; SkyProfile profile = null;
#endif
            Assert.That(profile, Is.Not.Null, "the sky profile (Second Face/Build sky assets)");
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            var shale = world.PlaceCentre("shale");
            world.Focus = shale;
            var (ox, oz) = WorldGrid.ChunkAt(shale.x - 256, shale.z - 256);
            var root = new GameObject("Chunks").transform;
            var terrains = new List<Terrain>();
            foreach (var c in new[] { (ox, oz), (ox + 1, oz), (ox, oz + 1), (ox + 1, oz + 1) })
            {
                var task = ChunkTerrain.Prepare(world, c.Item1, c.Item2);
                while (!task.IsCompleted) yield return null;
                Assert.That(task.Exception, Is.Null, task.Exception?.ToString());
                terrains.Add(ChunkTerrain.Build(task.Result, layers, root));
            }
            terrains[0].SetNeighbors(null, terrains[2], terrains[1], null);
            terrains[1].SetNeighbors(terrains[0], terrains[3], null, null);
            terrains[2].SetNeighbors(null, null, terrains[3], terrains[0]);
            terrains[3].SetNeighbors(terrains[2], null, null, terrains[1]);

            var go = new GameObject("Sky");
            var clock = go.AddComponent<TimeService>();
            clock.Paused = true;
            var sky = go.AddComponent<SkyController>();
            sky.Clock = clock; sky.World = world; sky.Profile = profile;

            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 40f; cam.nearClipPlane = 0.5f; cam.farClipPlane = 4000f;
            cam.clearFlags = CameraClearFlags.Skybox;
            void Low() { cam.transform.rotation = Quaternion.Euler(9f, 205f, 0f); cam.transform.position = shale + new Vector3(0, 24, 0) - cam.transform.rotation * Vector3.forward * 120f; }
            void Iso() { cam.transform.rotation = Quaternion.Euler(50f, 30f, 0f); cam.transform.position = shale - cam.transform.rotation * Vector3.forward * 55f; }

            var looks = new Dictionary<string, SkyLook>();
            IEnumerator Shot(string name, double hour, WeatherKind weather, bool iso = false)
            {
                clock.SetHour(hour);
                sky.Force = weather;
                sky.Apply();
                go.GetComponent<WeatherLayers>().Prewarm(12f);
                looks[name] = sky.Look;
                if (iso) Iso(); else Low();
                yield return null;
                yield return ScreenshotTests.Capture(name, 1920, 1080);
            }
            yield return Shot("sky_0700", 7, WeatherKind.Clear);
            yield return Shot("sky_1300", 13, WeatherKind.Clear);
            yield return Shot("sky_1900", 18.75, WeatherKind.Clear);
            yield return Shot("sky_night", 0, WeatherKind.Clear);
            yield return Shot("sky_dust", 13, WeatherKind.Dust);
            yield return Shot("sky_rain", 13, WeatherKind.Rain);
            yield return Shot("sky_1300_iso", 13, WeatherKind.Clear, iso: true);

            Assert.That(looks["sky_1300"].LightIntensity, Is.GreaterThan(looks["sky_0700"].LightIntensity));
            Assert.That(looks["sky_night"].LightIntensity, Is.LessThan(looks["sky_1900"].LightIntensity + 1f));
            Assert.That(looks["sky_dust"].FogDensity, Is.GreaterThan(looks["sky_1300"].FogDensity * 3));
            Assert.That(RenderSettings.skybox, Is.Not.Null);
            Assert.That(RenderSettings.sun, Is.EqualTo(sky.Sun));
            // the clock drives the look when no weather is forced: Shale's region today
            sky.Force = null; clock.SetHour(10); sky.Apply();
            Debug.Log($"WorldSkyTests: Shale on day {clock.Day} at 10:00 is {Weather.For("sallow", clock.Day)}; light {sky.Look.LightIntensity:0.00}, fog {sky.Look.FogDensity:0.0000}");
        }
    }
}
