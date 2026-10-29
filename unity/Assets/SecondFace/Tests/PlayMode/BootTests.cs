using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The app as the phone runs it, from the Boot scene: the content loads, the world comes in round Shale and the
    /// player's stand-in is set down at its spawn (step 25): the NavMesh is built round them, a tap sends them walking,
    /// they walk into the saloon (which opens), the camera follows and answers orbit and pinch, and the P2 people stand
    /// about the town (`walkabout_street`, `walkabout_saloon`). The overlay's button runs the measuring tour (step 23;
    /// one short lap, its table logged) and walks again. The overlay itself is IMGUI and not in the camera's captures; in
    /// batch mode cameras render only on request, so the editor's draw counts read 0.
    /// </summary>
    public class BootTests : IPrebuildSetup
    {
        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build terrain layers");
            EditorApplication.ExecuteMenuItem("Second Face/Build sky assets");
            EditorApplication.ExecuteMenuItem("Second Face/Build scatter catalog");
            EditorApplication.ExecuteMenuItem("Second Face/Build detail meshes");
            EditorApplication.ExecuteMenuItem("Second Face/Build places");
            EditorApplication.ExecuteMenuItem("Second Face/Build world assets");
#endif
        }

        [UnityTearDown]
        public IEnumerator TearDown() => Clear();

        /// <summary>Everything the app made, gone: the bootstrap and the overlay outlive scenes (DontDestroyOnLoad), and a
        /// walkabout left running sets its walker down in a later test's world on a camera that test destroys (CI run 54).</summary>
        public static IEnumerator Clear()
        {
            foreach (var b in Object.FindObjectsByType<Bootstrap>(FindObjectsSortMode.None)) Object.Destroy(b.gameObject);
            if (DebugOverlay.Instance != null) Object.Destroy(DebugOverlay.Instance.gameObject);
            foreach (var w in Object.FindObjectsByType<Walker>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var r in Object.FindObjectsByType<OrbitRig>(FindObjectsSortMode.None)) Object.Destroy(r.gameObject);
            foreach (var s in Object.FindObjectsByType<WorldStreamer>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var s in Object.FindObjectsByType<SkyController>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) Object.Destroy(l.gameObject);
            foreach (var name in new[] { "Props", "Places" }) { var go = GameObject.Find(name); if (go != null) Object.Destroy(go); }
            WorldView.SetUnderground(false);
            PlaceNav.Disabled = false;
            yield return null;
        }

        /// <summary>Loads the Boot scene and waits until the walker stands on the NavMesh.</summary>
        private static IEnumerator Boot(System.Action<Bootstrap> done)
        {
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            Assert.That(boot, Is.Not.Null, "the Boot scene's Bootstrap");
            Assert.That(boot.World, Is.Not.Null, "the Boot scene holds the world assets (Second Face/Wire the Boot scene)");
            Assert.That(boot.World.Complete, Is.True, "every world asset is named");
            Assert.That(boot.World.Walker, Is.Not.Null, "the walker");
            Assert.That(boot.World.Locomotion, Is.Not.Null, "the locomotion controller");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 360f && (boot.Walkabout == null || !boot.Walkabout.Ready)) yield return null;
            Assert.That(boot.Walkabout, Is.Not.Null, "the content loaded and the walkabout began");
            Assert.That(boot.Walkabout.Ready, Is.True, $"the walker stands on the NavMesh ({boot.Walkabout.Line()}) after {Time.realtimeSinceStartup - t0:0} s");
            Debug.Log($"BootTests: walker on the NavMesh after {Time.realtimeSinceStartup - t0:0.0} s; {boot.Walkabout.Line()}");
            done(boot);
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator TheAppSetsTheWalkerDownAndTheyWalk()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            Assert.That(walk.Townsfolk, Is.GreaterThanOrEqualTo(5), "people stand about the town");
            // levels of detail (P4.1): the game camera's person is LOD1, about 6 K triangles (they were 95-141 K whole)
            var lod = walk.Walker.GetComponentInChildren<LODGroup>();
            Assert.That(lod, Is.Not.Null, "the walker's levels of detail");
            var lods = lod.GetLODs();
            Assert.That(lods.Length, Is.EqualTo(3), "LOD0 close-up, LOD1 game camera, LOD2 far");
            long Tris(LOD l) => l.renderers.OfType<SkinnedMeshRenderer>().Sum(r => { long n = 0; for (var i = 0; i < r.sharedMesh.subMeshCount; i++) n += r.sharedMesh.GetIndexCount(i) / 3; return n; });
            Debug.Log($"BootTests: walker LOD triangles {string.Join(" / ", lods.Select(Tris))}, transitions {string.Join(" / ", lods.Select(l => l.screenRelativeTransitionHeight.ToString("0.###")))}");
            Assert.That(Tris(lods[1]), Is.LessThan(8000), "LOD1 within the game camera's budget");
            Assert.That(Tris(lods[2]), Is.LessThan(3000), "LOD2 within the far budget");
            Assert.That(lods.All(l => l.renderers.All(r => r.sharedMaterials.All(m => m != null && m.name.Contains("_")))), Is.True, "every level's materials bound");
            var cam = boot.Stage.Camera;
            for (var i = 0; i < 5; i++) yield return null;
            var d0 = Vector3.Distance(cam.transform.position, walk.Rig.Target.position);
            Assert.That(d0, Is.InRange(OrbitRig.MinDistance - 0.5f, OrbitRig.MaxDistance + 0.5f), "the camera at the game camera's distance");
            yield return ScreenshotTests.Capture("walkabout_street", 1920, 1080);

            // a tap on the ground ahead sends them walking
            var ahead = walk.Walker.transform.position + walk.Walker.transform.forward * 8f;
            var screen = cam.WorldToScreenPoint(ahead);
            Assert.That(walk.Input.Send(screen.x, screen.y), Is.True, "a tap on the ground sends the walker");
            yield return null;
            Assert.That(walk.Walker.Goal, Is.Not.Null);

            // into the saloon: the path through its door, the building opens round them
            var bar = boot.Stage.Marker("shale", "spot", "bar");
            Assert.That(bar, Is.Not.Null, "the bar's spot");
            Assert.That(walk.Walker.GoTo(bar.transform.position), Is.True, "a way to the bar");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && walk.Walker.Agent.pathPending) yield return null;
            Assert.That(walk.Walker.Agent.pathStatus, Is.EqualTo(UnityEngine.AI.NavMeshPathStatus.PathComplete), "a whole path to the bar");
            while (Time.realtimeSinceStartup - t0 < 180f && walk.Walker.Goal != null) yield return null;
            var left = Vector3.Distance(walk.Walker.transform.position, bar.transform.position);
            Debug.Log($"BootTests: walked to the bar in {Time.realtimeSinceStartup - t0:0.0} s, {left:0.00} m off; {walk.Line()}");
            Assert.That(left, Is.LessThan(1.5f), "at the bar");
            var interiors = boot.Stage.Streamer.PlaceSpawner.Instance("shale").GetComponent<PlaceInteriors>();
            for (var i = 0; i < 10; i++) yield return null;
            Assert.That(interiors.Inside, Is.Not.Null, "the saloon opened round the walker");

            // the camera answers: orbit and pinch
            walk.Rig.Orbit(200f, -40f, 0.016f); walk.Rig.Release();
            walk.Rig.Zoom(1.6f);
            for (var i = 0; i < 60; i++) yield return null;
            Assert.That(walk.Rig.Distance, Is.LessThan(d0 - 2f), "pinched closer");
            Assert.That(walk.Rig.Pitch, Is.InRange(OrbitRig.MinPitch, OrbitRig.MaxPitch));
            yield return ScreenshotTests.Capture("walkabout_saloon", 1920, 1080);
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator TheOverlaysButtonRunsTheMeasuringTour()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var overlay = DebugOverlay.Instance;
            Assert.That(overlay, Is.Not.Null, "the overlay");
            Assert.That(overlay.Visible, Is.True, "shown in a development build (the editor is one)");
            Assert.That(overlay.Button, Is.Not.Null, "the tour's button");
            overlay.Button();
            Assert.That(boot.Tour, Is.Not.Null, "the tour runs");
            var tour = boot.Tour;
            tour.ViewSeconds = 4f; tour.SettleSeconds = 1f;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 240f && tour.Laps < 1) yield return null;
            Assert.That(tour.Laps, Is.GreaterThanOrEqualTo(1), "a lap of the tour");
            for (var i = 0; i < 40 && !overlay.Text.Contains("tour lap 1"); i++) yield return null;
            Debug.Log("BootTests: overlay\n" + overlay.Text);
            Assert.That(overlay.Text, Does.Contain("draws "));
            Assert.That(overlay.Text, Does.Contain("chunks "));
            foreach (var view in new[] { "street", "square", "saloon", "edge" })
                Assert.That(overlay.Text.Split('\n').Any(l => l.TrimStart().StartsWith(view) && l.Contains("ms mean")), Is.True, $"the {view} view measured");
            overlay.Button();
            Assert.That(boot.Tour, Is.Null, "walking again");
            Assert.That(boot.Walkabout.Paused, Is.False);
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(overlay.Text, Does.Contain("tour lap"), "the last lap's table stays on the overlay");
        }
    }
}
