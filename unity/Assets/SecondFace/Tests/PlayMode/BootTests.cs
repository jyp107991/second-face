using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
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
    /// The app as the phone runs it (step 23): the Boot scene loads the content, raises the world round Shale and tours
    /// it with the game camera, measuring each view; the debug overlay shows the frame, the counters, the world and the
    /// tour's table. One lap is run short here (4 s a view); the overlay's text goes to the log and the first view is
    /// captured after the lap (`boot_world`; the overlay itself is IMGUI and not in the camera's capture). In batch mode
    /// cameras render only on request, so the editor's draw counts read 0 and its frames are paced by the frame rate.
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
        public IEnumerator TearDown()
        {
            foreach (var b in Object.FindObjectsByType<Bootstrap>(FindObjectsSortMode.None)) Object.Destroy(b.gameObject);
            if (DebugOverlay.Instance != null) Object.Destroy(DebugOverlay.Instance.gameObject);
            foreach (var s in Object.FindObjectsByType<WorldStreamer>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var t in Object.FindObjectsByType<Terrain>(FindObjectsSortMode.None)) Object.Destroy(t.transform.root.gameObject);
            foreach (var c in Object.FindObjectsByType<Camera>(FindObjectsSortMode.None)) Object.Destroy(c.gameObject);
            foreach (var w in Object.FindObjectsByType<WorldService>(FindObjectsSortMode.None)) Object.Destroy(w.gameObject);
            foreach (var s in Object.FindObjectsByType<SkyController>(FindObjectsSortMode.None)) Object.Destroy(s.gameObject);
            foreach (var l in Object.FindObjectsByType<Light>(FindObjectsSortMode.None)) Object.Destroy(l.gameObject);
            foreach (var name in new[] { "Props", "Places" }) { var go = GameObject.Find(name); if (go != null) Object.Destroy(go); }
            WorldView.SetUnderground(false);
            yield return null;
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator TheAppRaisesTheWorldAndMeasuresIt()
        {
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            Assert.That(boot, Is.Not.Null, "the Boot scene's Bootstrap");
            Assert.That(boot.World, Is.Not.Null, "the Boot scene holds the world assets (Second Face/Wire the Boot scene)");
            Assert.That(boot.World.Complete, Is.True, "every world asset is named");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 300f && (boot.Tour == null || !boot.Tour.Ready)) yield return null;
            Assert.That(boot.Tour, Is.Not.Null, "the content loaded and the tour began");
            Assert.That(boot.Tour.Ready, Is.True, $"the world came in round Shale ({boot.Tour.Status}) after {Time.realtimeSinceStartup - t0:0} s");
            Debug.Log($"BootTests: the world came in after {Time.realtimeSinceStartup - t0:0.0} s");
            var overlay = DebugOverlay.Instance;
            Assert.That(overlay, Is.Not.Null, "the overlay");
            Assert.That(overlay.Visible, Is.True, "shown in a development build (the editor is one)");
            var tour = boot.Tour;
            tour.ViewSeconds = 4f; tour.SettleSeconds = 1f;
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 180f && tour.Laps < 1) yield return null;
            Assert.That(tour.Laps, Is.GreaterThanOrEqualTo(1), "a lap of the tour");
            for (var i = 0; i < 40 && !overlay.Text.Contains("tour lap 1"); i++) yield return null;
            Debug.Log("BootTests: overlay\n" + overlay.Text);
            Assert.That(overlay.Text, Does.Contain("draws "));
            Assert.That(overlay.Text, Does.Contain("chunks "));
            Assert.That(overlay.Text, Does.Contain("tour lap 1"));
            foreach (var view in new[] { "street", "square", "saloon", "edge" })
                Assert.That(overlay.Text.Split('\n').Any(l => l.TrimStart().StartsWith(view) && l.Contains("ms mean")), Is.True, $"the {view} view measured");
            // after the lap (a capture renders for seconds in the editor and would be measured as one frame)
            yield return ScreenshotTests.Capture("boot_world", 1920, 1080);
        }
    }
}
