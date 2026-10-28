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
    }
}
