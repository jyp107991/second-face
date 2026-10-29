using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The CI screenshot loop: PlayMode tests that render a scene and write PNGs the workflow uploads as artifacts
    /// (reviewed as the web game's probes were). Each bake-off and each phase adds its own capture here.
    /// </summary>
    public class ScreenshotTests : IPrebuildSetup
    {
        /// <summary>
        /// The test scenes are built before play mode starts: the builders use EditorSceneManager.NewScene, which
        /// cannot run during play mode (CI run 13). Each builder is tolerant of a missing library (it logs and returns).
        /// </summary>
        public void Setup()
        {
#if UNITY_EDITOR
            LogAssert.ignoreFailingMessages = true;   // a logged error here aborts the whole run as a RunError (run 14)
            // The runner opens its own init scene (it drives the tests) before this step; the builders open scenes of
            // their own, so the setup is restored afterwards or play mode starts on a scene with no runner (run 15 hung).
            var sceneSetup = EditorSceneManager.GetSceneManagerSetup();
            try
            {
            foreach (var item in new[]
            {
                "Second Face/Build terrain test scene", "Second Face/Build material sheet scene", "Second Face/Build shelter test scene",
                "Second Face/Build frontier test scene", "Second Face/Build people test scene", "Second Face/Build vegetation test scene",
                "Second Face/Build trees test scene", "Second Face/Build cast test scene",
            })
            {
                try { EditorApplication.ExecuteMenuItem(item); }
                catch (System.Exception e) { Debug.LogWarning($"{item}: {e.Message}"); }
            }
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            }
            finally
            {
                EditorSceneManager.RestoreSceneManagerSetup(sceneSetup);
            }
#endif
        }

        /// <summary>Captures record what renders; errors are read in the uploaded editor log, not asserted here.</summary>
        [SetUp]
        public void Lenient() { LogAssert.ignoreFailingMessages = true; }

        private static Scene loadedScene;

        /// <summary>
        /// Loads a test scene additively and makes it the active scene (its lighting and render settings apply). Additive
        /// keeps the test runner's own scene loaded: unloading it can leave the runner stuck (Unity issue tracker), and
        /// LoadSceneInPlayMode is how a scene outside the build list is loaded in play mode.
        /// </summary>
        private static IEnumerator LoadTestScene(string path)
        {
#if UNITY_EDITOR
            var op = EditorSceneManager.LoadSceneAsyncInPlayMode(path, new LoadSceneParameters(LoadSceneMode.Additive));
#else
            var op = SceneManager.LoadSceneAsync(path, LoadSceneMode.Additive);
#endif
            while (op != null && !op.isDone) yield return null;
            loadedScene = SceneManager.GetSceneByPath(path);
            if (loadedScene.IsValid()) SceneManager.SetActiveScene(loadedScene);
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator UnloadTestScene()
        {
            if (loadedScene.IsValid() && loadedScene.isLoaded)
            {
                var op = SceneManager.UnloadSceneAsync(loadedScene);
                while (op != null && !op.isDone) yield return null;
            }
            loadedScene = default;
            if (Object.FindAnyObjectByType<SecondFace.Game.Bootstrap>() != null) yield return BootTests.Clear();   // the Boot scene's app outlives it
        }

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
            // Never WaitForEndOfFrame here: in -batchmode no frame end is ever signalled and the test hangs for ever
            // (CI run 11). The camera is rendered on demand into a texture with URP's render request (the documented
            // way; synchronous), falling back to Camera.Render where the pipeline does not support the request.
            yield return null;
            yield return null;
            var cam = Camera.main;
            Assert.That(cam, Is.Not.Null, "no main camera");
            cam.transform.rotation = cam.transform.rotation.normalized;   // URP culling asserts on a drifted quaternion
            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            var request = new RenderPipeline.StandardRequest { destination = rt };
            if (RenderPipeline.SupportsRenderRequest(cam, request)) RenderPipeline.SubmitRenderRequest(cam, request);
            else
            {
                var prev = cam.targetTexture;
                cam.targetTexture = rt;
                cam.Render();
                cam.targetTexture = prev;
            }
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

        [UnityTest, Timeout(600000)]
        public IEnumerator BootSceneRendersAndIsCaptured()
        {
            yield return LoadTestScene("Assets/SecondFace/Scenes/Boot.unity");
            // Let the bootstrap load the content and draw its title card.
            for (var i = 0; i < 90; i++) yield return null;
            Assert.That(Camera.main, Is.Not.Null);
            yield return Capture("boot");
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator TerrainTestSceneIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Terrain.unity";
            if (!File.Exists(path)) { Assert.Ignore("terrain test scene not built (no external library)"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("terrain_iso");
            var cam = Camera.main;
            cam.transform.rotation = Quaternion.Euler(35f, 120f, 0f);
            cam.transform.position = new Vector3(250, 0, 250) + new Vector3(0, Terrain.activeTerrain.SampleHeight(new Vector3(250, 0, 250)), 0) - cam.transform.rotation * Vector3.forward * 40f;
            yield return null;
            yield return Capture("terrain_wide");
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator MaterialSheetIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Materials.unity";
            if (!File.Exists(path)) { Assert.Ignore("material sheet not built (no external library)"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("materials_sheet", 1920, 1080);
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator ShelterPlaceIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Shelter.unity";
            if (!File.Exists(path)) { Assert.Ignore("shelter scene not built (kit or library missing)"); yield break; }
            yield return LoadTestScene(path);
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

        [UnityTest, Timeout(600000)]
        public IEnumerator PeopleLineupAndPortraitsAreCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_People.unity";
            if (!File.Exists(path)) { Assert.Ignore("people scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("people_lineup", 1920, 1080);
            var cam = Camera.main;
            var people = GameObject.Find("People");
            Assert.That(people, Is.Not.Null);
            // Hold the pose: the people animate (idle), and in batch mode the frames between aiming at the head and the
            // capture are long enough for it to move out of frame.
            foreach (var a in people.GetComponentsInChildren<Animator>()) a.speed = 0f;
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

        /// <summary>P4.1: the cast in rows of eight, a capture per row (`people_cast_<row>`), and one person at each of
        /// their three levels of detail from the same framing (`people_lod_<n>`), with each level's triangles logged.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator CastLineupAndLevelsAreCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Cast.unity";
            if (!File.Exists(path)) { Assert.Ignore("cast scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            var cast = GameObject.Find("Cast");
            Assert.That(cast, Is.Not.Null);
            foreach (var a in cast.GetComponentsInChildren<Animator>()) a.speed = 0f;
            var cam = Camera.main;
            var rows = (cast.transform.childCount + 7) / 8;
            for (var r = 0; r < rows; r++)
            {
                cam.transform.position = new Vector3(r * 10f, 1.0f, -7.5f);
                cam.transform.rotation = Quaternion.Euler(2f, 0, 0);
                cam.fieldOfView = 28f;
                yield return null;
                yield return Capture($"people_cast_{r + 1}", 1920, 1080);
            }
            // levels of detail: the first person, framed as the game camera sees a person nearby, each level forced
            var person = cast.transform.GetChild(0);
            var lod = person.GetComponentInChildren<LODGroup>();
            Assert.That(lod, Is.Not.Null, "levels of detail on the cast");
            var lods = lod.GetLODs();
            var focus = person.position + Vector3.up * 1.0f;
            cam.transform.position = focus + new Vector3(0, 1.2f, -3.2f);
            cam.transform.LookAt(focus);
            for (var l = 0; l < lods.Length; l++)
            {
                lod.ForceLOD(l);
                long tris = 0;
                foreach (var r in lods[l].renderers)
                    if (r is SkinnedMeshRenderer s) for (var k = 0; k < s.sharedMesh.subMeshCount; k++) tris += s.sharedMesh.GetIndexCount(k) / 3;
                Debug.Log($"people_lod_{l}: {person.name} LOD{l} {tris} triangles, {lods[l].renderers.Length} renderers");
                yield return null;
                yield return Capture($"people_lod_{l}", 900, 1200);
            }
            lod.ForceLOD(-1);
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator PeopleWalkOnCapturedMotionWhenClipsExist()
        {
            const string path = "Assets/SecondFace/Scenes/Test_People.unity";
            if (!File.Exists(path)) { Assert.Ignore("people scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 5; i++) yield return null;
            var people = GameObject.Find("People");
            var anims = people.GetComponentsInChildren<Animator>().Where(a => a.runtimeAnimatorController != null).ToList();
            if (anims.Count == 0) { Assert.Ignore("no captured motion imported"); yield break; }
            // States are named after the motion files (PeopleTestScene.MotionController); the clips inside them are not,
            // so play by state and check it exists (Play on a missing state only logs and nothing moves).
            var walk = Animator.StringToHash("walk");
            Assert.That(anims.Any(a => a.HasState(0, walk)), Is.True, "no 'walk' state in the people's controller");
            for (var k = 0; k < anims.Count; k++) if (anims[k].HasState(0, walk)) anims[k].Play(walk, 0, k * 0.17f);   // staggered phases
            var cam = Camera.main;
            cam.transform.position = new Vector3(-2.5f, 1.1f, -7.5f); cam.transform.LookAt(new Vector3(0, 0.9f, 0)); cam.fieldOfView = 30f;
            for (var shot = 0; shot < 3; shot++)
            {
                for (var i = 0; i < 12; i++) yield return null;
                yield return Capture("people_motion_" + shot, 1920, 1080);
            }
        }

        [UnityTest, Timeout(600000)]
        public IEnumerator FrontierPlaceIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Frontier.unity";
            if (!File.Exists(path)) { Assert.Ignore("frontier scene not built"); yield break; }
            yield return LoadTestScene(path);
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

        /// <summary>The card trees side by side (trees_lineup, trees_iso) and each species' three LODs forced (trees_lod).</summary>
        [UnityTest, Timeout(300000)]
        public IEnumerator TreesAreCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Trees.unity";
            if (!File.Exists(path)) { Assert.Ignore("trees scene not built"); yield break; }
            yield return LoadTestScene(path);
            foreach (var g in Object.FindObjectsByType<LODGroup>(FindObjectsSortMode.None))
                g.ForceLOD(g.name.StartsWith("lod") ? g.name[3] - '0' : 0);   // row A at full detail, row B at its named level
            for (var i = 0; i < 5; i++) yield return null;
            yield return Capture("trees_lineup", 1920, 1080);
            var cam = Camera.main;
            // the game camera over the middle of row A (pitch 50°, 35 m: inside the shadow distance)
            cam.transform.rotation = Quaternion.Euler(50f, 30f, 0f);
            cam.transform.position = new Vector3(-60f, 0, 0) - cam.transform.rotation * Vector3.forward * 35f;
            yield return null;
            yield return Capture("trees_iso", 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(6f, 0f, 0f);
            cam.transform.position = new Vector3(60f, 5f, -55f);
            yield return null;
            yield return Capture("trees_lod", 1920, 1080);
        }

        /// <summary>Heavy: thousands of props drawn by software rendering take minutes per frame on CI runners; CI skips the
        /// Heavy category (-testCategory "!Heavy"), the session's editor runs it.</summary>
        [UnityTest, Timeout(600000), Category("Heavy")]
        public IEnumerator VegetationIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Vegetation.unity";
            if (!File.Exists(path)) { Assert.Ignore("vegetation scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            yield return Capture("vegetation_iso", 1920, 1080);
            // two tiles now (the Sallow and the Teeth): Terrain.activeTerrain may be either, so each is found by name
            var cam = Camera.main; var t = GameObject.Find("Terrain").GetComponent<Terrain>();
            // Eye height above the ground under the camera, looking down at a point 12 m ahead: placing it from the
            // focus point's height put the camera inside rising ground (a grey wedge in the capture).
            var f = new Vector3(300, 0, 170); f.y = t.SampleHeight(f);
            var eye = f - Quaternion.Euler(0f, -60f, 0f) * Vector3.forward * 12f; eye.y = t.SampleHeight(eye) + 1.7f;
            cam.transform.position = eye; cam.transform.LookAt(f + Vector3.up * 0.4f);
            yield return null;
            yield return Capture("vegetation_eye", 1920, 1080);
            cam.transform.rotation = Quaternion.Euler(35f, 200f, 0f);
            var g = new Vector3(256, 0, 256); g.y = t.SampleHeight(g);
            cam.transform.position = g - cam.transform.rotation * Vector3.forward * 220f;
            yield return null;
            yield return Capture("vegetation_far", 1920, 1080);
            // The Teeth: the densest clump of pines from the game's camera (pitch and distance of vegetation_iso, inside
            // the shadow distance), looking uphill.
            var teeth = GameObject.Find("TerrainTeeth")?.GetComponent<Terrain>();
            Assert.That(teeth, Is.Not.Null, "the Teeth tile is missing from the vegetation scene");
            var pines = GameObject.Find("TeethPines");
            Assert.That(pines, Is.Not.Null, "no pines were scattered in the Teeth");
            var at = new List<Vector3>(); foreach (Transform p in pines.transform) at.Add(p.position);
            var s = at.OrderByDescending(a => at.Count(b => (a - b).sqrMagnitude < 18f * 18f)).First();
            s -= Quaternion.Euler(0f, 70f, 0f) * Vector3.forward * 10f; s.y = teeth.SampleHeight(s);   // just below the clump
            cam.transform.rotation = Quaternion.Euler(50f, 70f, 0f);
            cam.transform.position = s - cam.transform.rotation * Vector3.forward * 35f;
            yield return null;
            yield return Capture("vegetation_teeth", 1920, 1080);
        }
    }
}
