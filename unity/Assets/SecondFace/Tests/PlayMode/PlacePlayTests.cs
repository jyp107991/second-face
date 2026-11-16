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

        /// <summary>Starts clean: a game a test before left running holds the places' own NavMesh off (WorldNav).</summary>
        [UnitySetUp]
        public IEnumerator Clean() => BootTests.Clear();

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            foreach (var s in Object.FindObjectsByType<WorldStreamer>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var s in Object.FindObjectsByType<SkyController>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var name in new[] { "Props", "Places" }) { var go = GameObject.Find(name); if (go != null) Object.Destroy(go); }
            foreach (var w in Object.FindObjectsByType<WorldNav>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            WorldView.SetUnderground(false);
            yield return null;
            PlaceNav.Disabled = false;
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
                if (!NavMesh.SamplePosition(from, out var probe, 3f, NavMesh.AllAreas))
                {
                    var near = NavMesh.SamplePosition(from, out var far, 30f, NavMesh.AllAreas) ? $"{Vector3.Distance(from, far.position):0.0} m off at {far.position}" : "none in 30 m";
                    var under = Physics.Raycast(from + Vector3.up * 5f, Vector3.down, out var hitDown, 20f) ? $"{hitDown.collider.name} at {hitDown.point.y:0.00}" : "nothing";
                    Debug.Log($"PlacePlayTests: {what}: the start {from} (ground {under}); the nearest NavMesh {near}");
                }
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

        /// <summary>Every place built after the first three (P8: the Sallow and the Glass Flats), as Shale is checked: on its
        /// pad in the streamed world, its NavMesh built, every person's post and every thing the story uses reached on foot
        /// from where the player arrives; captured wide and as an arrival (`place_<id>_wide`, `place_<id>_arrival`).</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator EachPlaceStandsAndIsWalkable([Values("tollhouse", "signalhill", "drywells", "orchard", "wheel", "lm_sallow_01", "lm_sallow_02", "ninebridge", "openfield", "sump")] string id)
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
            Assert.That(places?.AddressOf(id), Is.EqualTo("places/" + id), $"{id} is in the place set");
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

            var centre = world.PlaceCentre(id);
            world.Focus = centre;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 300f)
            {
                var ground = WorldGrid.Around(centre.x, centre.z, 1).All(c => streamer.IsBuilt(c.cx, c.cz));
                if (ground && streamer.PlaceSpawner != null && streamer.PlaceSpawner.IsShown(id) && streamer.Spawner != null && streamer.Spawner.Idle) break;
                yield return null;
            }
            var place = streamer.PlaceSpawner?.Instance(id);
            Assert.That(place, Is.Not.Null, $"{id} was not placed after {Time.realtimeSinceStartup - t0:0} s");
            var (fx, fz) = WorldGrid.ChunkAt(centre.x, centre.z);
            var terrain = streamer.TerrainAt(fx, fz);
            var ground0 = terrain.SampleHeight(centre) + terrain.transform.position.y;
            Assert.That(Mathf.Abs(place.transform.position.y - ground0), Is.LessThan(0.3f), $"{id} at {place.transform.position.y:0.00}, the ground at {ground0:0.00}");
            var markers = place.GetComponentsInChildren<PlaceMarker>();
            var nav = place.GetComponent<PlaceNav>();
            Assert.That(nav, Is.Not.Null, "the place carries its NavMesh volume");
            // the NavMesh as the game builds it (WorldNav round the walker), once all the ground under the place is in: a
            // mesh built while a chunk was still coming left that ground out (the places' own, built at Start, had holes
            // the size of a chunk, 2026-11-16)
            var area = new Bounds(place.transform.TransformPoint(nav.Centre), nav.Size);
            var g0 = Time.realtimeSinceStartup;
            bool AllGround()
            {
                for (var x = area.min.x; x <= area.max.x + 1f; x += 16f)
                    for (var z = area.min.z; z <= area.max.z + 1f; z += 16f)
                    {
                        var (cx, cz) = WorldGrid.ChunkAt(Mathf.Min(x, area.max.x), Mathf.Min(z, area.max.z));
                        if (!streamer.IsBuilt(cx, cz)) return false;
                    }
                return true;
            }
            while (!AllGround() && Time.realtimeSinceStartup - g0 < 120f) yield return null;
            Assert.That(AllGround(), Is.True, $"{id}: the ground under the place built");
            var worldNav = new GameObject("WorldNav").AddComponent<WorldNav>();
            worldNav.Size = Mathf.Max(area.size.x, area.size.z) + 24f;
            worldNav.Target = new GameObject("NavCentre").transform;
            worldNav.Target.position = area.center;
            worldNav.Target.SetParent(worldNav.transform, true);
            var n0 = Time.realtimeSinceStartup;
            while (!worldNav.Ready && Time.realtimeSinceStartup - n0 < 120f) yield return null;
            Assert.That(worldNav.Ready, Is.True, "the NavMesh built");
            // from where the player arrives to every post and every thing the story uses (a surface map's own; the map
            // below a place, the Sump's shelter, is reached through its tunnel)
            var arrive = markers.FirstOrDefault(m => m.Kind == "spawn" && m.Id == "start") ?? markers.FirstOrDefault(m => m.Kind == "spawn");
            Assert.That(arrive, Is.Not.Null, $"{id} has a spawn");
            Assert.That(NavMesh.SamplePosition(arrive.transform.position, out var a, 3f, NavMesh.AllAreas), Is.True, $"{id}: the arrival {arrive.Id} is on the NavMesh");
            var unreached = new System.Collections.Generic.List<string>();
            var unreachedAt = new System.Collections.Generic.List<Vector3>();
            var reached = 0;
            foreach (var m in markers.Where(m => (m.Kind == "npc" || m.Kind == "talk" || m.Kind == "container") && m.Map == arrive.Map))
            {
                // (a person's post or a thing stands in or on its tile: reached when the walker gets within 2.5 m)
                // (a person stands on the post; a thing is reached from the ground beside it, not its top)
                var bFound = false; var b = default(NavMeshHit);
                var ground = m.transform.position.y;
                foreach (var r in m.Kind == "npc" ? new[] { 0f, 0.8f } : new[] { 0.9f, 1.4f, 2.0f })
                    for (var k = 0; k < (r == 0f ? 1 : 12) && !bFound; k++)
                    {
                        var q = m.transform.position + Quaternion.Euler(0f, k * 30f, 0f) * Vector3.forward * r;
                        if (NavMesh.SamplePosition(q, out var h, 1.2f, NavMesh.AllAreas) && Mathf.Abs(h.position.y - ground) < 0.8f) { b = h; bFound = true; }
                    }
                if (!bFound) { unreached.Add($"{m.Kind} {m.Id} (no ground beside it)"); unreachedAt.Add(m.transform.position); continue; }
                var path = new NavMeshPath();
                NavMesh.CalculatePath(a.position, b.position, NavMesh.AllAreas, path);
                if (path.status != NavMeshPathStatus.PathComplete) { unreached.Add($"{m.Kind} {m.Id} (path stops at {(path.corners.Length > 0 ? path.corners[^1] : a.position)})"); unreachedAt.Add(m.transform.position); }
                else reached++;
            }
            Debug.Log($"PlacePlayTests: {id}: {reached} posts and things reached on foot from {arrive.Id}; unreached: {(unreached.Count == 0 ? "none" : string.Join("; ", unreached))}");
            NavPicture(place.transform, nav, arrive.transform.position, markers, unreachedAt, $"place_{id}_nav");
            // what stands between: for each post not reached, the terrain under it, the place's base, and the nearest
            // NavMesh within 10 m (its height and distance)
            foreach (var u in unreachedAt)
            {
                var (ux, uz) = WorldGrid.ChunkAt(u.x, u.z);
                var ut = streamer.TerrainAt(ux, uz);
                var th = ut != null ? ut.SampleHeight(u) + ut.transform.position.y : float.NaN;
                var near = NavMesh.SamplePosition(u, out var nh, 10f, NavMesh.AllAreas) ? $"{nh.position.y:0.00} at {Vector3.Distance(new Vector3(u.x, 0, u.z), new Vector3(nh.position.x, 0, nh.position.z)):0.0} m" : "none in 10 m";
                var hit = Physics.Raycast(u + Vector3.up * 6f, Vector3.down, out var rh, 12f) ? $"{rh.collider.name} at {rh.point.y:0.00}" : "no collider";
                Debug.Log($"PlacePlayTests: {id}: unreached at {u}: terrain {th:0.00}, place base {place.transform.position.y:0.00}, under it {hit}, nearest NavMesh {near}");
            }
            Assert.That(unreached, Is.Empty, $"{id}: not reached on foot from {arrive.Id}");
            sky.Apply();
            for (var i = 0; i < 10; i++) yield return null;
            yield return Shot(cam, centre, 52f, 30f, 80f, $"place_{id}_wide");
            // the arrival as the game shows it: the camera behind the walker, looking where the place's life is
            var heart = markers.Where(m => m.Kind == "npc" || m.Kind == "talk" || m.Kind == "container").Select(m => m.transform.position).DefaultIfEmpty(centre).Aggregate(Vector3.zero, (s2, p2) => s2 + p2);
            var count = Mathf.Max(1, markers.Count(m => m.Kind == "npc" || m.Kind == "talk" || m.Kind == "container"));
            var to = heart / count - arrive.transform.position; to.y = 0f;
            var yaw = to.sqrMagnitude > 16f ? Mathf.Atan2(to.x, to.z) * Mathf.Rad2Deg : arrive.transform.eulerAngles.y;
            yield return Shot(cam, arrive.transform.position, 50f, yaw + 20f, 22f, $"place_{id}_arrival");
        }

        /// <summary>The shelter under its mouth (step 21b): Cistern 9's rooms ten metres down a ramp tunnel from the door in
        /// the mouth's wall; standing in its commons opens it whole and takes the surface away, and a walker goes from the
        /// commons up the tunnel to the road out.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheShelterOpensUnderItsMouth()
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
            Assert.That(places.AddressOf("cistern9"), Is.EqualTo("places/cistern9"));
            var world = new GameObject("World").AddComponent<WorldService>();
            yield return world.Load();
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

            var mouth = world.PlaceCentre("cistern9");
            world.Focus = mouth;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 300f)
            {
                if (WorldGrid.Around(mouth.x, mouth.z, 1).All(c => streamer.IsBuilt(c.cx, c.cz)) && streamer.PlaceSpawner != null && streamer.PlaceSpawner.IsShown("cistern9")) break;
                yield return null;
            }
            var place = streamer.PlaceSpawner.Instance("cistern9");
            Assert.That(place, Is.Not.Null, "Cistern 9 was not placed");
            var below = place.transform.Find("below");
            var markers = place.GetComponentsInChildren<PlaceMarker>();
            Vector3 At(string map, string kind, string id) => markers.Single(m => m.Map == map && m.Kind == kind && m.Id == id).transform.position;
            if (below == null)
            {
                // (the new opening, owner's note D: the mouth is Knock, the hamlet above the Cistern's door, and the door is
                // sealed: the content has no way down, so nothing is built under it. Knock stands, and its home and the road out
                // are joined on its NavMesh.)
                var maps = Newtonsoft.Json.Linq.JObject.Parse(System.IO.File.ReadAllText(System.IO.Path.Combine(Application.streamingAssetsPath, "content", "maps.json")));
                var down = (maps["c9_mouth"]?["exits"] as Newtonsoft.Json.Linq.JArray)?.Any(e => (string)e["to"]?["location"] == "cistern9") ?? false;
                Assert.That(down, Is.False, "no shelter under the mouth although the content has a way down to it");
                sky.Apply();
                for (var i = 0; i < 10; i++) yield return null;
                yield return Shot(cam, mouth + new Vector3(0, 0, -6f), 50f, 20f, 48f, "place_c9_mouth");
                var nav0 = place.GetComponent<PlaceNav>();
                var m0 = Time.realtimeSinceStartup;
                while (!nav0.Ready && Time.realtimeSinceStartup - m0 < 120f) yield return null;
                Assert.That(nav0.Ready, Is.True, "the NavMesh built");
                Assert.That(NavMesh.SamplePosition(At("c9_mouth", "spawn", "home"), out var h0, 3f, NavMesh.AllAreas), Is.True, "home is on the NavMesh");
                Assert.That(NavMesh.SamplePosition(At("c9_mouth", "spawn", "road"), out var r0, 3f, NavMesh.AllAreas), Is.True, "the road out is on the NavMesh");
                var p0 = new NavMeshPath();
                NavMesh.CalculatePath(h0.position, r0.position, NavMesh.AllAreas, p0);
                Assert.That(p0.status, Is.EqualTo(NavMeshPathStatus.PathComplete), "home to the road out");
                yield break;
            }
            Assert.That(below.position.y, Is.LessThan(mouth.y - 8f), "ten metres down");
            Assert.That(place.transform.Find("tunnel"), Is.Not.Null, "the tunnel down to it");
            sky.Apply();
            for (var i = 0; i < 10; i++) yield return null;
            yield return Shot(cam, mouth + new Vector3(0, 0, -6f), 50f, 20f, 48f, "place_c9_mouth");

            // the walk out: from the commons up the tunnel and through the mouth to the road north
            var nav = place.GetComponent<PlaceNav>();
            var n0 = Time.realtimeSinceStartup;
            while (!nav.Ready && Time.realtimeSinceStartup - n0 < 120f) yield return null;
            Assert.That(nav.Ready, Is.True, "the NavMesh built");
            var commons = At("cistern9", "spot", "commons_a");
            var road = At("c9_mouth", "spawn", "road");
            Assert.That(NavMesh.SamplePosition(commons, out var a, 3f, NavMesh.AllAreas), Is.True, "the commons is on the NavMesh");
            Assert.That(NavMesh.SamplePosition(road, out var b, 3f, NavMesh.AllAreas), Is.True, "the road out is on the NavMesh");
            var path = new NavMeshPath();
            NavMesh.CalculatePath(a.position, b.position, NavMesh.AllAreas, path);
            Assert.That(path.status, Is.EqualTo(NavMeshPathStatus.PathComplete), $"commons to the road: stopped at {(path.corners.Length > 0 ? path.corners[^1] : a.position)} of {b.position}");
            var length = 0f; for (var i = 1; i < path.corners.Length; i++) length += Vector3.Distance(path.corners[i - 1], path.corners[i]);
            Debug.Log($"PlacePlayTests: the commons to the road out: {length:0} m in {path.corners.Length} corners");

            // below: the shelter opens whole and the surface goes
            var interiors = place.GetComponent<PlaceInteriors>();
            world.Focus = commons;
            interiors.Refresh();
            Assert.That(interiors.Inside != null && interiors.Inside.Underground, Is.True, "in the shelter");
            Assert.That(WorldView.Underground, Is.True, "the world view is below");
            Assert.That(streamer.TerrainAt(WorldGrid.ChunkAt(mouth.x, mouth.z).cx, WorldGrid.ChunkAt(mouth.x, mouth.z).cz).drawHeightmap, Is.False, "the terrain is not drawn");
            cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black;
            yield return Shot(cam, commons, 55f, 25f, 40f, "place_shelter_hall");
            yield return Shot(cam, commons + new Vector3(-6f, 0, 6f), 55f, 25f, 22f, "place_shelter_hall_close");
            world.Focus = mouth;
            interiors.Refresh();
            Assert.That(WorldView.Underground, Is.False, "back on the surface");
            Assert.That(streamer.TerrainAt(WorldGrid.ChunkAt(mouth.x, mouth.z).cx, WorldGrid.ChunkAt(mouth.x, mouth.z).cz).drawHeightmap, Is.True, "the terrain is back");
        }

        /// <summary>The place's NavMesh from above (for reading where a way breaks): walkable ground grey, shaded by height,
        /// the arrival green, the posts reached blue, those not reached red; saved beside the captures.</summary>
        private static void NavPicture(Transform place, PlaceNav nav, Vector3 arrive, PlaceMarker[] markers, System.Collections.Generic.List<Vector3> unreached, string name)
        {
            const int Px = 768;
            var centre = place.TransformPoint(nav.Centre); var half = Mathf.Max(nav.Size.x, nav.Size.z) / 2f;
            var tex = new Texture2D(Px, Px, TextureFormat.RGB24, false);
            var px = new Color32[Px * Px];
            for (var i = 0; i < px.Length; i++) px[i] = new Color32(24, 20, 18, 255);
            var tri = NavMesh.CalculateTriangulation();
            float lo = float.MaxValue, hi = float.MinValue;
            foreach (var v in tri.vertices) { lo = Mathf.Min(lo, v.y); hi = Mathf.Max(hi, v.y); }
            Vector2 P(Vector3 w) => new Vector2((w.x - centre.x + half) / (2 * half) * Px, (w.z - centre.z + half) / (2 * half) * Px);
            for (var t = 0; t < tri.indices.Length; t += 3)
            {
                Vector3 A = tri.vertices[tri.indices[t]], B = tri.vertices[tri.indices[t + 1]], C = tri.vertices[tri.indices[t + 2]];
                Vector2 a = P(A), b = P(B), c = P(C);
                int x0 = Mathf.Max(0, (int)Mathf.Min(a.x, Mathf.Min(b.x, c.x))), x1 = Mathf.Min(Px - 1, (int)Mathf.Max(a.x, Mathf.Max(b.x, c.x)) + 1);
                int y0 = Mathf.Max(0, (int)Mathf.Min(a.y, Mathf.Min(b.y, c.y))), y1 = Mathf.Min(Px - 1, (int)Mathf.Max(a.y, Mathf.Max(b.y, c.y)) + 1);
                var shade = (byte)(90 + 140 * Mathf.InverseLerp(lo, hi + 1e-3f, (A.y + B.y + C.y) / 3f));
                var area = tri.areas[t / 3];
                for (var y = y0; y <= y1; y++)
                    for (var x = x0; x <= x1; x++)
                    {
                        var p = new Vector2(x + 0.5f, y + 0.5f);
                        float d1 = (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y), d2 = (p.x - c.x) * (b.y - c.y) - (b.x - c.x) * (p.y - c.y), d3 = (p.x - a.x) * (c.y - a.y) - (c.x - a.x) * (p.y - a.y);
                        var neg = d1 < 0 || d2 < 0 || d3 < 0; var pos = d1 > 0 || d2 > 0 || d3 > 0;
                        if (!(neg && pos)) px[y * Px + x] = new Color32(shade, shade, (byte)(area == 0 ? shade : 60), 255);
                    }
            }
            void Dot(Vector3 w, Color32 col, int r)
            {
                var q = P(w);
                for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) { int a = (int)q.x + x, b = (int)q.y + y; if (a >= 0 && b >= 0 && a < Px && b < Px && x * x + y * y <= r * r) px[b * Px + a] = col; }
            }
            foreach (var m in markers) if (m.Kind == "npc" || m.Kind == "talk" || m.Kind == "container") Dot(m.transform.position, new Color32(70, 120, 255, 255), 4);
            foreach (var u in unreached) Dot(u, new Color32(255, 40, 40, 255), 6);
            Dot(arrive, new Color32(40, 230, 60, 255), 7);
            tex.SetPixels32(px); tex.Apply();
            var dir = System.IO.Path.GetFullPath(System.IO.Path.Combine(Application.dataPath, "..", "Screenshots"));
            System.IO.Directory.CreateDirectory(dir);
            System.IO.File.WriteAllBytes(System.IO.Path.Combine(dir, name + ".png"), tex.EncodeToPNG());
            Object.Destroy(tex);
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
