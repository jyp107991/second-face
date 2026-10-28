using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>
    /// The CI screenshot loop: PlayMode tests that render a scene and write PNGs the workflow uploads as artifacts
    /// (reviewed as the web game's probes were). Each bake-off and each phase adds its own capture here.
    /// </summary>
    public class ScreenshotTests
    {
        /// <summary>Where captures go: unity/Screenshots (ignored by git; CI uploads it).</summary>
        public static string OutDir()
        {
            var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Screenshots"));
            Directory.CreateDirectory(dir);
            return dir;
        }

        /// <summary>Reads back the main camera's frame at the given size and writes a PNG.</summary>
        public static IEnumerator Capture(string name, int width = 1600, int height = 720)
        {
            yield return new WaitForEndOfFrame();
            var cam = Camera.main;
            Assert.That(cam, Is.Not.Null, "no main camera");
            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            var prev = cam.targetTexture;
            cam.targetTexture = rt;
            cam.Render();
            cam.targetTexture = prev;
            var tex = new Texture2D(width, height, TextureFormat.RGB24, false);
            var active = RenderTexture.active;
            RenderTexture.active = rt;
            tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
            tex.Apply();
            RenderTexture.active = active;
            var path = Path.Combine(OutDir(), name + ".png");
            File.WriteAllBytes(path, tex.EncodeToPNG());
            Object.Destroy(tex);
            rt.Release();
            Object.Destroy(rt);
            Debug.Log($"screenshot: {path}");
            Assert.That(File.Exists(path), Is.True);
        }

        [UnityTest]
        public IEnumerator BootSceneRendersAndIsCaptured()
        {
            yield return SceneManager.LoadSceneAsync("Assets/SecondFace/Scenes/Boot.unity", LoadSceneMode.Single);
            // Let the bootstrap load the content and draw its title card.
            for (var i = 0; i < 90; i++) yield return null;
            Assert.That(Camera.main, Is.Not.Null);
            yield return Capture("boot");
        }

        [UnityTest]
        public IEnumerator TerrainTestSceneIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Terrain.unity";
#if UNITY_EDITOR
            if (!File.Exists(path)) UnityEditor.EditorApplication.ExecuteMenuItem("Second Face/Build terrain test scene");
#endif
            if (!File.Exists(path)) { Assert.Ignore("terrain test scene not built (no external library)"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("terrain_iso");
            var cam = Camera.main;
            cam.transform.rotation = Quaternion.Euler(35f, 120f, 0f);
            cam.transform.position = new Vector3(250, 0, 250) + new Vector3(0, Terrain.activeTerrain.SampleHeight(new Vector3(250, 0, 250)), 0) - cam.transform.rotation * Vector3.forward * 40f;
            yield return null;
            yield return Capture("terrain_wide");
        }

        [UnityTest]
        public IEnumerator MaterialSheetIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Materials.unity";
#if UNITY_EDITOR
            if (!File.Exists(path)) UnityEditor.EditorApplication.ExecuteMenuItem("Second Face/Build material sheet scene");
#endif
            if (!File.Exists(path)) { Assert.Ignore("material sheet not built (no external library)"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("materials_sheet", 1920, 1080);
        }

        [UnityTest]
        public IEnumerator ShelterPlaceIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Shelter.unity";
#if UNITY_EDITOR
            if (!File.Exists(path)) UnityEditor.EditorApplication.ExecuteMenuItem("Second Face/Build shelter test scene");
#endif
            if (!File.Exists(path)) { Assert.Ignore("shelter scene not built (kit or library missing)"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("place_shelter_corridor");
            var cam = Camera.main;
            cam.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            cam.transform.position = new Vector3(-16f, 0, 8f) - cam.transform.rotation * Vector3.forward * 24f;
            yield return null;
            yield return Capture("place_shelter_ring");
            cam.transform.rotation = Quaternion.Euler(18f, 180f, 0f);
            cam.transform.position = new Vector3(0, 1.6f, 10f) - cam.transform.rotation * Vector3.forward * 9f;
            yield return null;
            yield return Capture("place_shelter_hatch");
        }
    }
}
