using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.World;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The first town in the streamed world (step 20): the streamer builds the ground round Shale and the place spawner
    /// puts its prefab (PlaceBuilder) on its pad by address: fourteen buildings with shells and roofs, its props, lights
    /// and markers; its NavMesh builds and carries a walker from road to road and in through the saloon's door; inside
    /// the saloon its roof hides and its walls are cut away (`place_shale_saloon`). Captured from the game camera over the main street (`place_shale_street`), at the pumps
    /// (`place_shale_square`) and wide (`place_shale_wide`) in the afternoon.
    /// </summary>
    public class PlacePlayTests : IPrebuildSetup
    {
        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build terrain layers");
            EditorApplication.ExecuteMenuItem("Second Face/Build sky assets");
            EditorApplication.ExecuteMenuItem("Second Face/Build scatter catalog");
            EditorApplication.ExecuteMenuItem("Second Face/Build detail meshes");
            EditorApplication.ExecuteMenuItem("Second Face/Build places");
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
            foreach (var name in new[] { "Props", "Places" }) { var go = GameObject.Find(name); if (go != null) Object.Destroy(go); }
            yield return null;
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator ShaleStandsOnItsPadInTheStreamedWorld()
        {
#if UNITY_EDITOR
            var layers = AssetDatabase.LoadAssetAtPath<BiomeLayerSet>("Assets/SecondFace/Terrain/BiomeLayers.asset");
            var profile = AssetDatabase.LoadAssetAtPath<SkyProfile>("Assets/SecondFace/Sky/SkyProfile.asset");
            var catalog = AssetDatabase.LoadAssetAtPath<ScatterCatalog>("Assets/SecondFace/World/ScatterCatalog.asset");
            var details = AssetDatabase.LoadAssetAtPath<DetailSet>("Assets/SecondFace/World/DetailSet.asset");
            var places = AssetDatabase.LoadAssetAtPath<PlaceSet>("Assets/SecondFace/World/PlaceSet.asset");
#else
            BiomeLayerSet layers = null; SkyProfile profile = null; ScatterCatalog catalog = null; DetailSet details = null; PlaceSet places = null;
#endif
            Assert.That(places, Is.Not.Null, "the place set (Second Face/Build places)");
            Assert.That(places.AddressOf("shale"), Is.EqualTo("places/shale"));
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
            Assert.That(world.Ready, Is.True, world.Error);
            var streamer = new GameObject("Streamer").AddComponent<WorldStreamer>();
            streamer.World = world; streamer.Layers = layers; streamer.Catalog = catalog; streamer.Details = details; streamer.Places = places;
            yield return streamer.Prewarm();

            var skyGo = new GameObject("Sky");
            var clock = skyGo.AddComponent<TimeService>(); clock.Paused = true; clock.SetHour(15.5);
            var sky = skyGo.AddComponent<SkyController>();
            sky.Clock = clock; sky.World = world; sky.Profile = profile; sky.Force = WeatherKind.Clear;

            var cam = new GameObject("Main Camera").AddComponent<Camera>();
            cam.tag = "MainCamera"; cam.fieldOfView = 35f; cam.nearClipPlane = 0.3f; cam.farClipPlane = 3000f;
            cam.clearFlags = CameraClearFlags.Skybox;

            var centre = world.PlaceCentre("shale");
            world.Focus = centre;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 300f)
            {
                var ground = WorldGrid.Around(centre.x, centre.z, 1).All(c => streamer.IsBuilt(c.cx, c.cz));
                if (ground && streamer.PlaceSpawner != null && streamer.PlaceSpawner.IsShown("shale") && streamer.Spawner != null && streamer.Spawner.Idle) break;
                yield return null;
            }
            Assert.That(streamer.PlaceSpawner, Is.Not.Null, "the streamer made a place spawner");
            var shale = streamer.PlaceSpawner.Instance("shale");
            Assert.That(shale, Is.Not.Null, $"Shale was not placed after {Time.realtimeSinceStartup - t0:0} s");
            // on its pad: the terrain under the centre at the place's level
            var (fx, fz) = WorldGrid.ChunkAt(centre.x, centre.z);
            var terrain = streamer.TerrainAt(fx, fz);
            var ground0 = terrain.SampleHeight(centre) + terrain.transform.position.y;
            Assert.That(Mathf.Abs(shale.transform.position.y - ground0), Is.LessThan(0.3f), $"Shale at {shale.transform.position.y:0.00}, the ground at {ground0:0.00}");
            var buildings = shale.transform.Find("buildings");
            Assert.That(buildings.childCount, Is.EqualTo(14), "fourteen buildings");
            foreach (Transform b in buildings)
            {
                Assert.That(b.Find("shell")?.GetComponent<MeshRenderer>(), Is.Not.Null, $"{b.name} has a shell");
                Assert.That(b.Find("roof")?.GetComponent<MeshRenderer>(), Is.Not.Null, $"{b.name} has a roof");
                Assert.That(b.Find("shell").GetComponent<MeshRenderer>().sharedMaterials.All(m => m != null), $"{b.name}'s materials bound");
            }
            var renderers = shale.GetComponentsInChildren<Renderer>();
            var lights = shale.GetComponentsInChildren<Light>();
            var markers = shale.GetComponentsInChildren<PlaceMarker>();
            Assert.That(shale.transform.Find("props").childCount, Is.GreaterThan(120), "the props stand");
            Assert.That(lights.Length, Is.EqualTo(8));
            Assert.That(markers.Any(m => m.Kind == "spawn" && m.Id == "start"));
            // its NavMesh: across the town from road to road, and in through the saloon's door to the bar
            var nav = shale.GetComponent<PlaceNav>();
            Assert.That(nav, Is.Not.Null, "the place builds its NavMesh");
            var n0 = Time.realtimeSinceStartup;
            while (!nav.Ready && Time.realtimeSinceStartup - n0 < 120f) yield return null;
            Assert.That(nav.Ready, Is.True, "the NavMesh built");
            var navMs = (Time.realtimeSinceStartup - n0) * 1000f;
            Vector3 At(string kind, string id) => markers.Single(m => m.Kind == kind && m.Id == id).transform.position;
            foreach (var (from, to, what) in new[] { (At("spawn", "west"), At("spawn", "east"), "west road to east road"), (At("spawn", "start"), At("spot", "bar"), "the street to the bar") })
            {
                Assert.That(NavMesh.SamplePosition(from, out var a, 3f, NavMesh.AllAreas), Is.True, $"{what}: on the NavMesh at the start");
                Assert.That(NavMesh.SamplePosition(to, out var b, 3f, NavMesh.AllAreas), Is.True, $"{what}: on the NavMesh at the end");
                var path = new NavMeshPath();
                NavMesh.CalculatePath(a.position, b.position, NavMesh.AllAreas, path);
                Assert.That(path.status, Is.EqualTo(NavMeshPathStatus.PathComplete),
                    $"{what}: from {a.position} towards {b.position}, stopped at {(path.corners.Length > 0 ? path.corners[^1] : a.position)}");
                var length = 0f; for (var i = 1; i < path.corners.Length; i++) length += Vector3.Distance(path.corners[i - 1], path.corners[i]);
                Debug.Log($"PlacePlayTests: {what}: {length:0} m in {path.corners.Length} corners");
            }
            Debug.Log($"PlacePlayTests: NavMesh built in {navMs:0} ms");
            Debug.Log($"PlacePlayTests: shale placed in {Time.realtimeSinceStartup - t0:0.0} s: {renderers.Length} renderers, " +
                $"{renderers.Sum(r => r.sharedMaterials.Length)} material slots, {lights.Length} lights, {markers.Length} markers");

            sky.Apply();
            for (var i = 0; i < 10; i++) yield return null;
            // over the main street, looking north-east across it to the pumps
            yield return Shot(cam, centre + new Vector3(-6f, 0, 4f), 50f, 35f, 34f, "place_shale_street");
            yield return Shot(cam, centre + new Vector3(1f, 0, 12f), 50f, 215f, 20f, "place_shale_square");
            yield return Shot(cam, centre + new Vector3(0, 0, -4f), 52f, 30f, 95f, "place_shale_wide");

            // in the saloon (step 21): its roof, doors and shutters stop drawing and its walls are cut away
            var interiors = shale.GetComponent<PlaceInteriors>();
            Assert.That(interiors, Is.Not.Null, "the place opens its buildings");
            Assert.That(interiors.World, Is.EqualTo(world), "the spawner gave it the world's focus");
            var bar = At("spot", "bar");
            world.Focus = bar;
            interiors.Refresh();
            Assert.That(interiors.Inside, Is.Not.Null, "the bar is inside a building");
            Assert.That(interiors.Inside.name, Does.EndWith("_wood"), "the timber saloon");
            var hidden = interiors.Inside.Roof.GetComponentsInChildren<Renderer>().Concat(interiors.Inside.Fittings.GetComponentsInChildren<Renderer>()).ToList();
            Assert.That(hidden.Count, Is.GreaterThan(0));
            Assert.That(hidden.All(r => r.shadowCastingMode == UnityEngine.Rendering.ShadowCastingMode.ShadowsOnly), "the roof and the doors draw only their shadow");
            yield return Shot(cam, bar + new Vector3(4f, 0, -2f), 55f, 25f, 24f, "place_shale_saloon");
            world.Focus = centre;
            interiors.Refresh();
            Assert.That(interiors.Inside, Is.Null, "back in the street");
            Assert.That(hidden.All(r => r.shadowCastingMode == UnityEngine.Rendering.ShadowCastingMode.On), "the saloon closes again");
        }

        private static IEnumerator Shot(Camera cam, Vector3 at, float pitch, float yaw, float distance, string name)
        {
            cam.transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
            cam.transform.position = at - cam.transform.rotation * Vector3.forward * distance;
            yield return null;
            yield return ScreenshotTests.Capture(name, 1920, 1080);
        }
    }
}
