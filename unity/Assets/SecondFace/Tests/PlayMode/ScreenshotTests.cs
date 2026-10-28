using System.Collections;
using System.IO;
using System.Linq;
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
            cam.transform.rotation = Quaternion.Euler(45f, 30f, 0f);
            cam.transform.position = new Vector3(-16f, 0, 8f) - cam.transform.rotation * Vector3.forward * 42f;
            yield return null;
            yield return Capture("place_shelter_ring");
            cam.transform.rotation = Quaternion.Euler(12f, 0f, 0f);
            cam.transform.position = new Vector3(0, 1.4f, 16.5f) - cam.transform.rotation * Vector3.forward * 9f;
            yield return null;
            yield return Capture("place_shelter_hatch");
        }

        [UnityTest]
        public IEnumerator PeopleLineupAndPortraitsAreCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_People.unity";
#if UNITY_EDITOR
            if (!File.Exists(path)) UnityEditor.EditorApplication.ExecuteMenuItem("Second Face/Build people test scene");
#endif
            if (!File.Exists(path)) { Assert.Ignore("people scene not built"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("people_lineup", 1920, 1080);
            var cam = Camera.main;
            var people = GameObject.Find("People");
            Assert.That(people, Is.Not.Null);
            for (var i = 0; i < people.transform.childCount; i++)
            {
                var person = people.transform.GetChild(i);
                var anim = person.GetComponent<Animator>();
                var head = anim != null && anim.isHuman ? anim.GetBoneTransform(HumanBodyBones.Head) : null;
                var focus = head != null ? head.position + new Vector3(0, 0.08f, 0) : person.position + new Vector3(0, 1.6f, 0);
                // Over the shoulder of the viewer: the face from slightly above, 0.7 m away, facing -Z.
                cam.transform.position = focus + new Vector3(0.12f, 0.04f, -0.72f);
                cam.transform.LookAt(focus);
                cam.fieldOfView = 24f;
                yield return null;
                yield return Capture("portrait_" + person.name, 900, 1200);
            }
        }

        [UnityTest]
        public IEnumerator PeopleWalkOnCapturedMotionWhenClipsExist()
        {
            const string path = "Assets/SecondFace/Scenes/Test_People.unity";
            if (!File.Exists(path)) { Assert.Ignore("people scene not built"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 5; i++) yield return null;
            var people = GameObject.Find("People");
            var anims = people.GetComponentsInChildren<Animator>().Where(a => a.runtimeAnimatorController != null).ToList();
            if (anims.Count == 0) { Assert.Ignore("no captured motion imported"); yield break; }
            var hasWalk = anims[0].runtimeAnimatorController.animationClips.Any(c => c.name == "walk");
            foreach (var a in anims) a.Play(hasWalk ? "walk" : anims[0].runtimeAnimatorController.animationClips[0].name, 0, 0f);
            var cam = Camera.main;
            cam.transform.position = new Vector3(-2.5f, 1.1f, -7.5f); cam.transform.LookAt(new Vector3(0, 0.9f, 0)); cam.fieldOfView = 30f;
            for (var shot = 0; shot < 3; shot++)
            {
                for (var i = 0; i < 12; i++) yield return null;
                yield return Capture("people_motion_" + shot, 1920, 1080);
            }
        }

        [UnityTest]
        public IEnumerator FrontierPlaceIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Frontier.unity";
#if UNITY_EDITOR
            if (!File.Exists(path)) UnityEditor.EditorApplication.ExecuteMenuItem("Second Face/Build frontier test scene");
#endif
            if (!File.Exists(path)) { Assert.Ignore("frontier scene not built"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("place_frontier_street", 1920, 1080);
            var cam = Camera.main;
            var t = Terrain.activeTerrain;
            var square = new Vector3(160, t.SampleHeight(new Vector3(160, 0, 128)), 128);
            cam.transform.rotation = Quaternion.Euler(42f, -50f, 0f);
            cam.transform.position = square - cam.transform.rotation * Vector3.forward * 30f;
            yield return null;
            yield return Capture("place_frontier_square", 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(14f, 70f, 0f);
            cam.transform.position = new Vector3(112, t.SampleHeight(new Vector3(112, 0, 126)) + 1.7f, 126) - cam.transform.rotation * Vector3.forward * 6f;
            yield return null;
            yield return Capture("place_frontier_eye", 1920, 1080);
        }

        [UnityTest]
        public IEnumerator VegetationIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Vegetation.unity";
#if UNITY_EDITOR
            if (!File.Exists(path)) UnityEditor.EditorApplication.ExecuteMenuItem("Second Face/Build vegetation test scene");
#endif
            if (!File.Exists(path)) { Assert.Ignore("vegetation scene not built"); yield break; }
            yield return SceneManager.LoadSceneAsync(path, LoadSceneMode.Single);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("vegetation_iso", 1920, 1080);
            var cam = Camera.main; var t = Terrain.activeTerrain;
            cam.transform.rotation = Quaternion.Euler(22f, -60f, 0f);
            var f = new Vector3(300, 0, 170); f.y = t.SampleHeight(f) + 1.6f;
            cam.transform.position = f - cam.transform.rotation * Vector3.forward * 12f;
            yield return null;
            yield return Capture("vegetation_eye", 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(35f, 200f, 0f);
            var g = new Vector3(256, 0, 256); g.y = t.SampleHeight(g);
            cam.transform.position = g - cam.transform.rotation * Vector3.forward * 220f;
            yield return null;
            yield return Capture("vegetation_far", 1920, 1080);
        }
    }
}
