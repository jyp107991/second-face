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
                "Second Face/Build trees test scene", "Second Face/Build cast test scene", "Second Face/Build player test scene", "Second Face/Build hair test scene",
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

        /// <summary>P4 step 2: the player's two bases, each as built, with two rerolled faces and aged
        /// (`people_sculpt_<f|m>_<built|reroll_a|reroll_b|aged>`). Every sculptor shape is on the body at LOD0 and LOD1; the face drives the head's proxies too;
        /// a rerolled face moves the head's vertices and leaves the feet where they were.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator PlayerFacesAreSculptedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            var root = GameObject.Find("Players");
            Assert.That(root, Is.Not.Null);
            foreach (var a in root.GetComponentsInChildren<Animator>()) a.speed = 0f;
            var faces = root.GetComponentsInChildren<SecondFace.Game.People.FaceSculpt>().Where(f => !f.name.Contains("_wear_")).ToArray();
            Assert.That(faces.Length, Is.EqualTo(8), "two bases, four faces each");
            var shapes = SecondFace.Core.Npc.Sculpt.Shapes().ToList();
            foreach (var f in faces)
            {
                var bodies = f.Renderers.Where(r => r.name.StartsWith("Body_")).ToList();
                Assert.That(bodies.Select(r => r.name), Is.EquivalentTo(new[] { "Body_LOD0", "Body_LOD1", "Body_LOD2" }), $"{f.name}: the sculpted body at every level");
                var womanOnly = f.name.StartsWith("player_m") ? SecondFace.Core.Npc.Sculpt.Body.Where(b => SecondFace.Core.Npc.Sculpt.WomanOnly(b.Id)).SelectMany(b => new[] { b.Id + "-" + b.Low, b.Id + "-" + b.High }).ToList() : new List<string>();
                foreach (var body in bodies.Where(r => r.name != "Body_LOD2"))
                    Assert.That(shapes.Where(s => body.sharedMesh.GetBlendShapeIndex(s) < 0).Except(womanOnly), Is.Empty, $"{f.name} {body.name}: every sculptor shape");
                // the far level keeps the body's own shapes (P4.13: everyone is made from these bases, seen from afar too)
                var far = bodies.First(r => r.name == "Body_LOD2");
                Assert.That(shapes.Where(s => s.StartsWith("body-") && far.sharedMesh.GetBlendShapeIndex(s) < 0).Except(womanOnly), Is.Empty, $"{f.name}: the body's shapes at LOD2");
                // the brows are painted into the skin (P4.9), so they follow the face with it
                Assert.That(f.Renderers.Any(r => r.name.StartsWith("Eyes_")), Is.True, $"{f.name}: the eyes follow the face");
            }
            // a rerolled face changes the head, not the feet
            var built = faces.First(f => f.name == "player_f_built");
            var rerolled = faces.First(f => f.name == "player_f_reroll_a");
            // baked with scale, in the person's own frame (the renderer's rotation, no translation), y up from the feet
            Vector3[] Baked(SecondFace.Game.People.FaceSculpt f)
            {
                var r = f.Renderers.First(x => x.name == "Body_LOD0"); var m = new Mesh(); r.BakeMesh(m, true);
                var rot = Quaternion.Inverse(f.transform.rotation) * r.transform.rotation;
                return m.vertices.Select(x => rot * x + (r.transform.position - f.transform.position)).ToArray();
            }
            var v0 = Baked(built); var v1 = Baked(rerolled);
            float head = 0, feet = 0;
            for (var i = 0; i < v0.Length; i++)
            {
                var d = (v1[i] - v0[i]).magnitude;
                if (v0[i].y > 1.4f) head = Mathf.Max(head, d); else if (v0[i].y < 0.3f) feet = Mathf.Max(feet, d);
            }
            Debug.Log($"people_sculpt: the reroll moved the head up to {head * 1000f:0.0} mm, the feet {feet * 1000f:0.00} mm");
            Assert.That(head, Is.GreaterThan(0.004f), "the face changed");
            Assert.That(feet, Is.LessThan(0.0005f), "the feet stayed");
            // each face close, from the front and a little to the side (`people_sculpt_<base>_<face>`)
            var cam = Camera.main;
            cam.fieldOfView = 20f;
            foreach (var f in faces)
            {
                var headBone = f.GetComponent<Animator>().GetBoneTransform(HumanBodyBones.Head);
                var at = headBone.position + Vector3.up * 0.06f;
                cam.transform.position = at + f.transform.rotation * new Vector3(0.18f, 0.02f, 0.85f);
                cam.transform.LookAt(at);
                yield return null;
                yield return Capture("people_sculpt_" + f.name.Replace("player_", ""), 640, 720);
            }
        }

        /// <summary>P4 step 3: the wardrobe at runtime. Four of each base in a row: the outfit they start in; with the long
        /// cardigan over it; with the cardigan and the knitted hat (the hair goes); the cardigan dyed, the hat on and off
        /// again (`people_wardrobe_<f|m>`). Every garment's bones are found on the person's skeleton, the garments join the
        /// person's levels of detail, and the skin's mask covers what the outfit hides.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator PlayerWardrobeChangesWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            var root = GameObject.Find("Players");
            Assert.That(root, Is.Not.Null);
            foreach (var a in root.GetComponentsInChildren<Animator>()) a.speed = 0f;
            var cam = Camera.main;
            cam.fieldOfView = 22f;
            int Hidden(SecondFace.Game.People.Wardrobe w) { var n = 0; foreach (var b in w.Mask.GetPixelData<byte>(0)) if (b > 127) n++; return n; }
            for (var b = 0; b < 2; b++)
            {
                var id = b == 0 ? "player_f" : "player_m";
                var people = Enumerable.Range(1, 4).Select(i => GameObject.Find($"{id}_wear_{i}").GetComponent<SecondFace.Game.People.Wardrobe>()).ToArray();
                var set = people[0].Set;
                Assert.That(set, Is.Not.Null, $"{id}: the wardrobe set");
                Assert.That(people[0].Wearing.Values, Is.EquivalentTo(set.Outfit), $"{id}: the outfit on at start");
                var over = set.Garments.First(g => g.Slot == "over").Id;
                var hat = set.Garments.First(g => g.Slot == "head").Id;
                Assert.That(people[1].Equip(over), Is.True);
                people[2].Equip(over); people[2].Equip(hat);
                people[3].Equip(over); people[3].Dye("over", new Color(0.45f, 0.5f, 0.7f)); people[3].Equip(hat);
                Assert.That(people[3].Unequip("head"), Is.True);
                yield return null;
                yield return null;
                foreach (var p in people)
                {
                    var garments = p.GarmentRenderers.ToList();
                    Assert.That(garments.All(r => r.bones.All(x => x != null)), Is.True, $"{p.name}: every garment bone found on the person's skeleton");
                    var lods = p.GetComponent<LODGroup>().GetLODs();
                    for (var l = 0; l < lods.Length; l++)
                        Assert.That(garments.Where(r => r.name.EndsWith($"_LOD{l}")).All(r => lods[l].renderers.Contains(r)), Is.True, $"{p.name}: the garments at LOD{l}");
                    Assert.That(Hidden(p), Is.GreaterThan(1000), $"{p.name}: the outfit hides the skin under it");
                }
                Assert.That(Hidden(people[1]), Is.EqualTo(Hidden(people[0])), "an open cardigan hides nothing more");
                Assert.That(Hidden(people[2]), Is.GreaterThan(Hidden(people[1])), "the hat hides the scalp under it");
                Assert.That(people[3].Wearing.ContainsKey("head"), Is.False, "the hat came off");
                var hair = people[2].GetComponentsInChildren<Renderer>(true).Where(r => r.name.StartsWith("Hair_")).ToList();
                Assert.That(hair.All(r => !r.enabled), Is.True, "under the hat, no hair");
                Assert.That(people[3].GetComponentsInChildren<Renderer>(true).Where(r => r.name.StartsWith("Hair_")).All(r => r.enabled), Is.True, "hat off, hair back");
                Debug.Log($"people_wardrobe_{id}: outfit hides {Hidden(people[0])} base vertices, with the hat {Hidden(people[2])}; LOD0 renderers {people[2].GetComponent<LODGroup>().GetLODs()[0].renderers.Length}");
                cam.transform.position = new Vector3(b * 10f + 5f, 0.95f, -6.2f);
                cam.transform.rotation = Quaternion.Euler(1f, 0, 0);
                yield return null;
                yield return Capture($"people_wardrobe_{id.Replace("player_", "")}", 1920, 1080);
            }
        }

        /// <summary>P4.13 (the owner's notes: bodies as varied as in life, nothing clips): nine women and nine men made by
        /// <see cref="SecondFace.Core.Npc.Bodies"/> on the player's two bases, by trade, means and age, seen from the front
        /// and the side (`people_bodies_<f|m>_<front|side>`). Statures, hips and chests are measured from each body's own
        /// torso as its shapes make it, and the arms stay out of every one of them as they idle.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator BodiesVaryAsInLife()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 5; i++) yield return null;
            var built = GameObject.Find("player_f_built");
            Assert.That(built, Is.Not.Null);
            var controller = built.GetComponent<Animator>().runtimeAnimatorController;
            var women = new[] { ("settler", 24), ("trader", 38), ("street", 19), ("gilded", 45), ("labourer", 31), ("medic", 52), ("guard", 27), ("pilgrim", 63), ("corp", 35) };
            var men = new[] { ("guard", 29), ("trader", 47), ("street", 22), ("gilded", 55), ("labourer", 34), ("raider", 26), ("tech", 41), ("nomad", 60), ("fisher", 38) };
            var cam = Camera.main;
            cam.fieldOfView = 22f;
            for (var b = 0; b < 2; b++)
            {
                var male = b == 1;
                var id = male ? "player_m" : "player_f";
                GameObject prefab = null;
#if UNITY_EDITOR
                prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{id}.prefab");
#endif
                if (prefab == null) { Assert.Ignore("player prefabs not built"); yield break; }
                var who = male ? men : women;
                var row = new List<(GameObject Go, SecondFace.Core.Npc.PlayerLook Look)>();
                var z = 40f + b * 12f;
                for (var i = 0; i < who.Length; i++)
                {
                    var (role, age) = who[i];
                    var look = SecondFace.Core.Npc.Bodies.For($"lineup_{id}_{i}", male, age, role);
                    var go = Object.Instantiate(prefab, new Vector3((i - (who.Length - 1) / 2f) * 0.75f, 0f, z), Quaternion.Euler(0, 180f, 0));
                    go.name = $"{id}_{role}_{age}";
                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                    var anim = go.GetComponent<Animator>();
                    anim.runtimeAnimatorController = controller;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    go.AddComponent<SecondFace.Game.People.ArmClearance>();
                    row.Add((go, look));
                }
                yield return null;
                yield return null;
                foreach (var (go, look) in row)
                {
                    SecondFace.Game.People.LookView.Apply(go, look);
                    go.GetComponent<SecondFace.Game.People.FaceSculpt>().Refresh();
                }
                // the arms against each torso as it is now, idling
                var deepest = 0f;
                var t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 2.5f)
                {
                    yield return null;
                    foreach (var (go, _) in row) deepest = Mathf.Max(deepest, go.GetComponent<SecondFace.Game.People.ArmClearance>().Depth());
                }
                // each body's torso as its shapes make it, in its own frame (scaled to the world)
                var hips = new List<float>(); var chest = new List<float>(); var tall = new List<float>();
                foreach (var (go, look) in row)
                {
                    var p = go.GetComponent<SecondFace.Game.People.TorsoProfile>();
                    Assert.That(p, Is.Not.Null, $"{go.name}: measured");
                    var s = go.transform.localScale.y;
                    p.Sample(0f, out _, out _, out var hx, out _);
                    p.Sample(male ? 0.42f : 0.38f, out _, out _, out _, out var cz);
                    hips.Add(2f * hx * s); chest.Add(2f * cz * s); tall.Add(look.Stature);
                    Debug.Log($"people_bodies: {go.name} {look.Stature:0.0} cm, build {look.Build:+0.00;-0.00}, muscle {look.Muscle:+0.00;-0.00}, belly {look.Shape["body-belly"]:+0.00;-0.00}, hips {2f * hx * s * 100f:0.0} cm wide, chest {2f * cz * s * 100f:0.0} cm deep"
                        + (male ? "" : $", bust {look.Shape["body-bust"]:+0.00;-0.00}, seat {look.Shape["body-seat"]:+0.00;-0.00}"));
                }
                Debug.Log($"people_bodies_{id}: {tall.Min():0} to {tall.Max():0} cm tall; hips {hips.Min() * 100f:0.0} to {hips.Max() * 100f:0.0} cm; chest {chest.Min() * 100f:0.0} to {chest.Max() * 100f:0.0} cm deep; arms at most {deepest * 100f:0.0} cm in");
                Assert.That(tall.Max() - tall.Min(), Is.GreaterThan(male ? 12f : 10f), "short and tall");
                Assert.That(hips.Max() - hips.Min(), Is.GreaterThan(0.03f), "narrow and wide hips");
                Assert.That(chest.Max() - chest.Min(), Is.GreaterThan(0.03f), "flat and full chests");
                Assert.That(deepest, Is.LessThan(0.012f), "arms clear of every body");
                foreach (var a in row.Select(r => r.Go.GetComponent<Animator>())) a.speed = 0f;
                foreach (var g in row.Select(r => r.Go.GetComponent<LODGroup>()).Where(g => g != null)) g.ForceLOD(0);
                // lit from the camera's side (the scene's sun is set for the other captures)
                var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional && l.name == "Sun");
                if (sun != null) sun.transform.rotation = Quaternion.Euler(35f, 20f, 0f);
                cam.transform.position = new Vector3(0f, 0.92f, z - 9.4f);
                cam.transform.rotation = Quaternion.Euler(0.5f, 0, 0);
                yield return null;
                var tag = id.Replace("player_", "");
                yield return Capture($"people_bodies_{tag}_front", 1920, 1000);
                foreach (var (go, _) in row) go.transform.rotation = Quaternion.Euler(0, 270f, 0);
                yield return null;
                yield return Capture($"people_bodies_{tag}_side", 1920, 1000);
                if (male)
                {
                    // the bodies under the shirt (a check that the shapes, not the cloth, make the figure)
                    foreach (var (go, _) in row) go.GetComponent<SecondFace.Game.People.Wardrobe>().Unequip("top");
                    yield return null;
                    yield return Capture($"people_bodies_{tag}_bare", 1920, 1000);
                    foreach (var (go, _) in row) go.GetComponent<SecondFace.Game.People.Wardrobe>().Wear(go.GetComponent<SecondFace.Game.People.Wardrobe>().Set.Outfit);
                    foreach (var (go, look) in row) SecondFace.Game.People.LookView.Apply(go, look);
                    yield return null;
                }
                // close, three-quarters, about the fullest figure
                var full = male ? row.OrderByDescending(r => r.Look.Build).First() : row.OrderByDescending(r => r.Look.Shape["body-bust"]).First();
                foreach (var (go, _) in row) go.transform.rotation = Quaternion.Euler(0, 215f, 0);
                cam.transform.position = new Vector3(full.Go.transform.position.x + 0.4f, 1.15f, z - 3.4f);
                cam.transform.LookAt(new Vector3(full.Go.transform.position.x, 1.05f, z));
                yield return null;
                yield return Capture($"people_bodies_{tag}_close", 1280, 1000);
            }
        }

        /// <summary>P4.13 step 3 (the cast as data): every garment the content dresses people in is built for the bases it
        /// fits, and a crowd of ten women and ten men by trade, each made by <see cref="SecondFace.Core.Npc.Bodies"/>, is
        /// dressed by the content's own outfit rules (`Outfits.DressFor`, `Dresser`): a top and legs or a garment for the
        /// whole body, shoes, and what the trade adds, dyed and weathered on the one texture each garment has
        /// (`people_cast_<f|m>`). The arms stay out of every body.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheCastWearsTheContent()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            UiTests.Content();
            for (var i = 0; i < 5; i++) yield return null;
            var built = GameObject.Find("player_f_built");
            Assert.That(built, Is.Not.Null);
            var controller = built.GetComponent<Animator>().runtimeAnimatorController;
            var roles = SecondFace.Core.Npc.Outfits.Roles;
            var cam = Camera.main;
            cam.fieldOfView = 22f;
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional && l.name == "Sun");
            if (sun != null) sun.transform.rotation = Quaternion.Euler(35f, 20f, 0f);
            for (var b = 0; b < 2; b++)
            {
                var male = b == 1;
                var id = male ? "player_m" : "player_f";
                var fit = male ? "m" : "f";
                GameObject prefab = null;
#if UNITY_EDITOR
                prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{id}.prefab");
#endif
                if (prefab == null) { Assert.Ignore("player prefabs not built"); yield break; }
                var set = prefab.GetComponent<SecondFace.Game.People.Wardrobe>().Set;
                var wanted = SecondFace.Core.Content.Registry.GarmentIds.Where(g => { var f = SecondFace.Core.Content.Registry.Garments[g].Fit; return f == "u" || f == fit; }).ToList();
                var missing = wanted.Where(g => set.Find(g) == null).ToList();
                Debug.Log($"people_cast_{fit}: {wanted.Count - missing.Count} of {wanted.Count} garments built" + (missing.Count > 0 ? "; missing " + string.Join(", ", missing) : ""));
                var row = new List<(GameObject Go, SecondFace.Core.Npc.PlayerLook Look, SecondFace.Core.Npc.Outfit Outfit, string Role)>();
                var z = 70f + b * 12f;
                for (var i = 0; i < 10; i++)
                {
                    var role = roles[(i * 4 + b * 3) % roles.Length];
                    var age = 19 + (i * 13 + b * 5) % 50;
                    var look = SecondFace.Core.Npc.Bodies.For($"crowd_{fit}_{i}", male, age, role);
                    var outfit = SecondFace.Core.Npc.Outfits.DressFor(1000 + i * 31 + b * 7, role, fit);
                    var go = Object.Instantiate(prefab, new Vector3((i - 4.5f) * 0.75f, 0f, z), Quaternion.Euler(0, 180f, 0));
                    go.name = $"{id}_{role}_{age}";
                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                    var anim = go.GetComponent<Animator>();
                    anim.runtimeAnimatorController = controller;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    go.AddComponent<SecondFace.Game.People.ArmClearance>();
                    row.Add((go, look, outfit, role));
                }
                yield return null;
                yield return null;
                foreach (var (go, look, outfit, role) in row)
                {
                    var w = go.GetComponent<SecondFace.Game.People.Wardrobe>();
                    SecondFace.Game.People.Dresser.Dress(w, outfit);
                    SecondFace.Game.People.LookView.Apply(go, look);
                    var wearing = w.Wearing;
                    Debug.Log($"people_cast: {go.name} wears {string.Join(", ", wearing.Select(kv => kv.Key + " " + kv.Value))}");
                    Assert.That(wearing.ContainsKey("full") || (wearing.ContainsKey("top") && wearing.ContainsKey("legs")), Is.True, $"{go.name}: dressed");
                    Assert.That(wearing.ContainsKey("feet"), Is.True, $"{go.name}: shod");
                    Assert.That(!(wearing.ContainsKey("full") && (wearing.ContainsKey("top") || wearing.ContainsKey("legs"))), Is.True, $"{go.name}: a garment for the whole body is the top and the legs");
                }
                var deepest = 0f;
                var t0 = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t0 < 2f)
                {
                    yield return null;
                    foreach (var (go, _, _, _) in row) deepest = Mathf.Max(deepest, go.GetComponent<SecondFace.Game.People.ArmClearance>().Depth());
                }
                Debug.Log($"people_cast_{fit}: arms at most {deepest * 100f:0.0} cm in");
                Assert.That(deepest, Is.LessThan(0.012f), "arms clear of every body");
                foreach (var a in row.Select(r => r.Go.GetComponent<Animator>())) a.speed = 0f;
                foreach (var g in row.Select(r => r.Go.GetComponent<LODGroup>()).Where(g => g != null)) g.ForceLOD(0);
                cam.transform.position = new Vector3(0f, 0.92f, z - 9.8f);
                cam.transform.rotation = Quaternion.Euler(0.5f, 0, 0);
                yield return null;
                yield return Capture($"people_cast_{fit}", 1920, 1000);
                Assert.That(missing, Is.Empty, $"{id}: every garment of its fit built (mh_build wardrobe_content)");
            }
        }

        /// <summary>P4.13 step 6 (the cast as data, in place of the 32 cast models): sixty people of the Reach, thirty women
        /// and thirty men of every trade and age, each made from a base by <see cref="SecondFace.Core.Npc.Bodies"/> and
        /// dressed by the outfit rules, in four rows of fifteen (`people_sixty_<1..4>`); the spread of stature, bust,
        /// seat, shoulders and muscle measured against the targets.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator SixtyOfTheReach()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            UiTests.Content();
            for (var i = 0; i < 5; i++) yield return null;
            var controller = GameObject.Find("player_f_built").GetComponent<Animator>().runtimeAnimatorController;
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional && l.name == "Sun");
            if (sun != null) sun.transform.rotation = Quaternion.Euler(35f, 20f, 0f);
            var cam = Camera.main;
            cam.fieldOfView = 22f;
            var roles = SecondFace.Core.Npc.Outfits.Roles;
            var all = new List<(bool Male, SecondFace.Core.Npc.PlayerLook Look)>();
            for (var row = 0; row < 4; row++)
            {
                var male = row >= 2;
                var id = male ? "player_m" : "player_f";
                GameObject prefab = null;
#if UNITY_EDITOR
                prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{id}.prefab");
#endif
                if (prefab == null) { Assert.Ignore("player prefabs not built"); yield break; }
                var z = 100f + row * 12f;
                var people = new List<GameObject>();
                for (var i = 0; i < 15; i++)
                {
                    var n = row * 15 + i;
                    var role = roles[(n * 7) % roles.Length];
                    var age = 17 + (n * 11) % 56;
                    var look = SecondFace.Core.Npc.Bodies.For($"reach_{n}", male, age, role);
                    all.Add((male, look));
                    var go = Object.Instantiate(prefab, new Vector3((i - 7f) * 0.62f, 0f, z), Quaternion.Euler(0, 180f, 0));
                    go.name = $"reach_{n}_{role}_{age}";
                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                    var anim = go.GetComponent<Animator>();
                    anim.runtimeAnimatorController = controller;
                    anim.applyRootMotion = false;
                    people.Add(go);
                    yield return null;
                    SecondFace.Game.People.Dresser.Dress(go.GetComponent<SecondFace.Game.People.Wardrobe>(), SecondFace.Core.Npc.Outfits.DressFor(2000 + n * 37, role, male ? "m" : "f"));
                    SecondFace.Game.People.LookView.Apply(go, look);
                }
                for (var k = 0; k < 20; k++) yield return null;
                foreach (var a in people.Select(p => p.GetComponent<Animator>())) a.speed = 0f;
                foreach (var g in people.Select(p => p.GetComponent<LODGroup>()).Where(g => g != null)) g.ForceLOD(0);
                cam.transform.position = new Vector3(0f, 0.9f, z - 8.6f);
                cam.transform.rotation = Quaternion.Euler(0.5f, 0, 0);
                yield return null;
                yield return Capture($"people_sixty_{row + 1}", 1920, 900);
            }
            // the spread, against the targets (Bodies: men 175 +- 7.5 cm, women 162 +- 6.5; the bust across its range)
            (double Mean, double Sd) Stat(IEnumerable<double> xs) { var l = xs.ToList(); var m = l.Average(); return (m, System.Math.Sqrt(l.Sum(x => (x - m) * (x - m)) / l.Count)); }
            var men = all.Where(p => p.Male).Select(p => p.Look).ToList();
            var women = all.Where(p => !p.Male).Select(p => p.Look).ToList();
            var (mm, ms) = Stat(men.Select(l => (double)l.Stature));
            var (wm, ws) = Stat(women.Select(l => (double)l.Stature));
            var bust = Stat(women.Select(l => (double)l.Shape["body-bust"]));
            var seat = Stat(women.Select(l => (double)l.Shape["body-seat"]));
            var shoulders = Stat(men.Select(l => (double)l.Shape["body-shoulders"]));
            var muscle = Stat(men.Select(l => (double)l.Muscle));
            Debug.Log($"people_sixty: men {mm:0.0} +- {ms:0.0} cm ({men.Min(l => l.Stature):0}-{men.Max(l => l.Stature):0}), women {wm:0.0} +- {ws:0.0} cm ({women.Min(l => l.Stature):0}-{women.Max(l => l.Stature):0}); "
                + $"bust {bust.Mean:+0.00;-0.00} +- {bust.Sd:0.00}, seat {seat.Mean:+0.00;-0.00} +- {seat.Sd:0.00}; men's shoulders +- {shoulders.Sd:0.00}, muscle +- {muscle.Sd:0.00}");
            Assert.That(mm - wm, Is.InRange(9.0, 17.0), "dimorphism in stature");
            Assert.That(ms, Is.InRange(4.5, 10.5), "men's spread");
            Assert.That(ws, Is.InRange(4.0, 9.5), "women's spread");
            Assert.That(bust.Sd, Is.GreaterThan(0.25), "busts across the range");
            Assert.That(seat.Sd, Is.GreaterThan(0.2), "seats across the range");
            Assert.That(muscle.Sd, Is.GreaterThan(0.25), "soft to hard worked");
        }

        /// <summary>Every resident of Shale as the game makes them (PeopleService: their body and face from Bodies and the
        /// content's look, their outfit the content's own or the rules', the background people from Extras), each full
        /// length (`shale_resident_<nn>`) and the face (`shale_face_<nn>`); a line per person in the log for the contact
        /// sheet's labels.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator ShaleResidentsAsTheyAre()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            UiTests.Content();
            for (var i = 0; i < 5; i++) yield return null;
            var controller = GameObject.Find("player_f_built").GetComponent<Animator>().runtimeAnimatorController;
            foreach (var r in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None)) r.gameObject.SetActive(false);   // the scene's own people out of the way
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional && l.name == "Sun");
            if (sun != null) sun.transform.rotation = Quaternion.Euler(30f, 25f, 0f);
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            Assert.That(F != null && M != null, Is.True, "the bases");
            var game = SecondFace.Core.State.States.NewGame("shale", 0, 0);
            var map = SecondFace.Core.Content.Registry.Maps["shale"];
            var who = new List<(string Id, string Name, string Role, bool Male, double Age, SecondFace.Core.Npc.PlayerLook Look, SecondFace.Core.Npc.Outfit Outfit, string Note)>();
            foreach (var p in map.Npcs)
            {
                if (!SecondFace.Core.Content.Registry.Npcs.TryGetValue(p.Def, out var def)) continue;
                var male = SecondFace.Core.Npc.Routine.Male(def.Look);
                var now = p.If == null || SecondFace.Core.World.Logic.Test(p.If, game);
                who.Add((p.Id ?? def.Id, def.Name, def.Role, male, def.Look?.Age ?? 35, SecondFace.Game.Play.PeopleService.LookOf(def, male), SecondFace.Game.Play.PeopleService.OutfitOf(def, male), now ? "" : "later"));
            }
            foreach (var x in SecondFace.Core.Npc.Extras.Of(map))
                who.Add((x.Def.Id, x.Def.Name, x.Def.Role, x.Male, x.Def.Look.Age ?? 35, x.Look, SecondFace.Core.Npc.Outfits.DressFor(x.Def.Look.Seed, x.Def.Role, x.Male ? "m" : "f", x.Def.Faction), "background"));
            var cam = Camera.main;
            cam.fieldOfView = 24f;
            // SF_SHALE_ONLY (comma-separated indices): just those residents, for a quick look while tuning
            var only = (System.Environment.GetEnvironmentVariable("SF_SHALE_ONLY") ?? "").Split(',', System.StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToHashSet();
            for (var i = 0; i < who.Count; i++)
            {
                if (only.Count > 0 && !only.Contains(i)) continue;
                var w = who[i];
                var at = new Vector3(200f + i * 4f, 0f, 0f);
                var go = Object.Instantiate(w.Male ? M : F, at, Quaternion.Euler(0, 200f, 0));
                go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(w.Look);
                var anim = go.GetComponent<Animator>();
                anim.runtimeAnimatorController = controller;
                anim.applyRootMotion = false;
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;   // else no bones are written in batch mode (see ResidentCloseUp)
                go.AddComponent<SecondFace.Game.People.HandPose>();   // as in the game: hands at rest, arms clear of the body
                go.AddComponent<SecondFace.Game.People.ArmClearance>();
                yield return null;
                var wardrobe = go.GetComponent<SecondFace.Game.People.Wardrobe>();
                SecondFace.Game.People.Dresser.Dress(wardrobe, w.Outfit);
                SecondFace.Game.People.LookView.Apply(go, w.Look);
                for (var k = 0; k < 30; k++) yield return null;
                var lod = go.GetComponent<LODGroup>();
                if (lod != null) lod.ForceLOD(0);
                // framed by stature: the whole person with a hat's worth of room, the tall as whole as the short
                var h = w.Look.Stature / 100f;
                var dist = Mathf.Max(4.2f, (h + 0.32f) / (2f * Mathf.Tan(12f * Mathf.Deg2Rad)));
                cam.transform.position = at + new Vector3(0f, h * 0.55f, -dist);
                cam.transform.LookAt(at + new Vector3(0f, h * 0.5f, 0f));
                yield return null;
                Debug.Log($"shale_resident {i:00}|{w.Id}|{w.Name}|{w.Role}|{(w.Male ? "m" : "f")}|{w.Age:0}|{w.Look.Stature:0}|{w.Note}|{string.Join(", ", wardrobe.Wearing.Where(kv => kv.Key != "hair").Select(kv => kv.Value))}");
                yield return Capture($"shale_resident_{i:00}", 640, 960);
                // and the face, head and shoulders (`shale_face_<nn>`): the archetypes are judged here, not at full length
                var head = anim.GetBoneTransform(HumanBodyBones.Head);
                if (head != null)
                {
                    var face = head.position + new Vector3(0f, 0.06f, 0f);
                    var toward = Vector3.ProjectOnPlane(go.transform.forward, Vector3.up).normalized;
                    cam.transform.position = face + toward * 0.95f + Vector3.up * 0.02f;
                    cam.transform.LookAt(face);
                    yield return null;
                    yield return Capture($"shale_face_{i:00}", 384, 480);
                }
                Object.Destroy(go);
            }
            Assert.That(who.Count, Is.GreaterThanOrEqualTo(25), "Shale's people");
        }

        /// <summary>P4.14: one resident up close, as the game poses them (the idle, the arm clearance, the hands at rest):
        /// the whole figure, the torso and arms from the front and the side, the hands, the face, the back
        /// (`resident_&lt;id&gt;_*`). The owner's screenshot (a square jaw on a woman, flat spread hands, a sleeve the arm
        /// came through) is checked here before any sheet goes out. Logs what is worn against what renders.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator ResidentCloseUp()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            UiTests.Content();
            for (var i = 0; i < 10; i++) yield return null;
            var controller = GameObject.Find("player_f_built").GetComponent<Animator>().runtimeAnimatorController;
            foreach (var r in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None)) r.gameObject.SetActive(false);
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            Assert.That(F != null && M != null, Is.True, "the bases");
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional);
            if (sun != null) sun.transform.rotation = Quaternion.Euler(30f, 25f, 0f);
            var ids = (System.Environment.GetEnvironmentVariable("SF_RESIDENTS") ?? "npc_sh_03,npc_sh_01").Split(',');
            var map = SecondFace.Core.Content.Registry.Maps["shale"];
            var cam = Camera.main;
            var n = 0;
            foreach (var id in ids)
            {
                var p = map.Npcs.FirstOrDefault(x => (x.Id ?? x.Def) == id);
                if (p == null) continue;
                var def = SecondFace.Core.Content.Registry.Npcs[p.Def];
                var male = SecondFace.Core.Npc.Routine.Male(def.Look);
                var look = SecondFace.Game.Play.PeopleService.LookOf(def, male);
                var outfit = SecondFace.Game.Play.PeopleService.OutfitOf(def, male);
                var at = new Vector3(300f + n * 6f, 0f, 0f);
                var go = Object.Instantiate(male ? M : F, at, Quaternion.Euler(0, 180f, 0));
                go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                var anim = go.GetComponent<Animator>();
                anim.runtimeAnimatorController = controller;
                anim.applyRootMotion = false;
                // a culled Animator (the default mode, nothing seen by a camera in batch mode) writes no bones: the first
                // evaluated frame, a blend out of the rest pose, stayed on the body (the owner's "weird arm position")
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                var hands = go.AddComponent<SecondFace.Game.People.HandPose>();
                var clear = go.AddComponent<SecondFace.Game.People.ArmClearance>();
                yield return null;
                var wardrobe = go.GetComponent<SecondFace.Game.People.Wardrobe>();
                SecondFace.Game.People.Dresser.Dress(wardrobe, outfit);
                SecondFace.Game.People.LookView.Apply(go, look);
                for (var k = 0; k < 40; k++) yield return null;
                var lod = go.GetComponent<LODGroup>();
                if (lod != null) lod.ForceLOD(0);
                var rendering = go.GetComponentsInChildren<Renderer>().Where(r => r.enabled && r.gameObject.activeInHierarchy).Select(r => r.name).OrderBy(x => x);
                Debug.Log($"resident {id} {def.Name} {(male ? "m" : "f")} {look.Stature:0} cm hands={hands.Ready} clearance={clear.Turned.x:0.0}/{clear.Turned.y:0.0} face chin-bones={look.Face.GetValueOrDefault("chin-bones"):0.00} neck={look.Face.GetValueOrDefault("neck-scale-horiz"):0.00}\n  wearing: {string.Join(", ", wardrobe.Wearing.Select(kv => kv.Key + "=" + kv.Value))}\n  rendering: {string.Join(", ", rendering)}");
                var head = anim.GetBoneTransform(HumanBodyBones.Head).position;
                var chest = anim.GetBoneTransform(HumanBodyBones.Chest).position;
                var hl = anim.GetBoneTransform(HumanBodyBones.LeftHand).position;
                var hr = anim.GetBoneTransform(HumanBodyBones.RightHand).position;
                var handsAt = (hl + hr) * 0.5f;
                var shots = new (string Name, Vector3 From, Vector3 At, float Fov)[]
                {
                    ("full", at + new Vector3(0f, 1.0f, -4.6f), at + new Vector3(0f, 0.93f, 0f), 24f),
                    ("torso", chest + new Vector3(0f, 0.05f, -2.1f), chest + new Vector3(0f, -0.05f, 0f), 24f),
                    ("side", chest + new Vector3(1.9f, 0.1f, -0.9f), chest + new Vector3(0f, -0.1f, 0f), 24f),
                    ("hands", hl + new Vector3(-0.35f, 0.1f, -0.75f), hl, 16f),
                    ("hands_r", hr + new Vector3(0.45f, 0.05f, -0.6f), hr, 16f),
                    ("face", head + new Vector3(0.25f, 0.05f, -0.9f), head + new Vector3(0f, 0.02f, 0f), 18f),
                    ("back", chest + new Vector3(0f, 0.1f, 2.4f), chest + new Vector3(0f, -0.1f, 0f), 24f),
                };
                foreach (var sh in shots)
                {
                    cam.fieldOfView = sh.Fov;
                    cam.transform.position = sh.From;
                    cam.transform.LookAt(sh.At);
                    yield return null;
                    yield return Capture($"resident_{id}_{sh.Name}", 720, 960);
                }
                // the pose itself: the same person four ways, live (never frozen), after forty frames of the idle: bare
                // (no hands, no clearance), hands at rest only, clearance only, both; with what the clearance sees each
                // ten frames (diagnosis of the owner's "weird arm and hand position")
                var profile = go.GetComponent<SecondFace.Game.People.TorsoProfile>();
                var hips = anim.GetBoneTransform(HumanBodyBones.Hips);
                float HandY(Animator a, Transform h)
                {
                    var hp = a.GetComponent<SecondFace.Game.People.TorsoProfile>(); var hb = a.GetBoneTransform(HumanBodyBones.Hips);
                    if (hp == null || hb == null || h == null) return float.NaN;
                    var rot = hb.rotation * Quaternion.Inverse(hp.HipsRest);
                    return (Quaternion.Inverse(rot) * (h.position - hb.position)).y / Mathf.Max(0.01f, a.transform.lossyScale.y);
                }
                var st = anim.GetCurrentAnimatorStateInfo(0);
                Debug.Log($"  pose: clips={string.Join(",", anim.GetCurrentAnimatorClipInfo(0).Select(c => c.clip.name + ":" + c.weight.ToString("0.00")))} norm={st.normalizedTime:0.00} ready={clear.Ready} depth={clear.Depth():0.000} bottom={(profile != null ? profile.Bottom : 0f):0.000} top={(profile != null ? profile.Bottom + profile.Step * (profile.Bins - 1) : 0f):0.000} handY={HandY(anim, anim.GetBoneTransform(HumanBodyBones.LeftHand)):0.000} hipsY={(hips != null ? hips.position.y - at.y : 0f):0.000}");
                Object.Destroy(go);
                cam.fieldOfView = 24f;
                cam.transform.position = at + new Vector3(0f, 1.0f, -4.6f);
                cam.transform.LookAt(at + new Vector3(0f, 0.93f, 0f));
                foreach (var (nm, withHands, withClear) in new[] { ("bare", false, false), ("hands", true, false), ("clear", false, true), ("both", true, true) })
                {
                    var v = Object.Instantiate(male ? M : F, at, Quaternion.Euler(0, 180f, 0));
                    v.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                    var va = v.GetComponent<Animator>();
                    va.runtimeAnimatorController = controller;
                    va.applyRootMotion = false;
                    va.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    if (withHands) v.AddComponent<SecondFace.Game.People.HandPose>();
                    var vc = withClear ? v.AddComponent<SecondFace.Game.People.ArmClearance>() : null;
                    yield return null;
                    SecondFace.Game.People.Dresser.Dress(v.GetComponent<SecondFace.Game.People.Wardrobe>(), outfit);
                    SecondFace.Game.People.LookView.Apply(v, look);
                    var vl = v.GetComponent<LODGroup>();
                    if (vl != null) vl.ForceLOD(0);
                    var trace = new System.Text.StringBuilder();
                    for (var k = 0; k < 40; k++)
                    {
                        yield return null;
                        if (k % 10 == 9 && vc != null) trace.Append($" f{k + 1}:turned={vc.Turned.x:0.0}/{vc.Turned.y:0.0} depth={vc.Depth():0.000} handY={HandY(va, va.GetBoneTransform(HumanBodyBones.LeftHand)):0.000}");
                    }
                    var vs = va.GetCurrentAnimatorStateInfo(0);
                    Debug.Log($"  pose {nm}: norm={vs.normalizedTime:0.00} clips={string.Join(",", va.GetCurrentAnimatorClipInfo(0).Select(c => c.clip.name + ":" + c.weight.ToString("0.00")))}{trace}");
                    yield return Capture($"resident_{id}_pose_{nm}", 480, 960);
                    Object.Destroy(v);
                }
                // the bind pose: the same person with the animator never run
                var bind = Object.Instantiate(male ? M : F, at, Quaternion.Euler(0, 180f, 0));
                bind.GetComponent<Animator>().enabled = false;
                bind.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                yield return null;
                SecondFace.Game.People.Dresser.Dress(bind.GetComponent<SecondFace.Game.People.Wardrobe>(), outfit);
                SecondFace.Game.People.LookView.Apply(bind, look);
                for (var k = 0; k < 3; k++) yield return null;
                yield return Capture($"resident_{id}_pose_bind", 480, 960);
                Object.Destroy(bind);
                n++;
            }
            Assert.That(n, Is.GreaterThan(0), "a resident rendered");
        }

        /// <summary>P4.14 step 5: the generated pieces (cut from the helper meshes, mh_build GENERATED_GARMENTS) on both
        /// bases, four kits each, live (`kit_&lt;f|m&gt;_&lt;kit&gt;` and `_side`): the base layer with cargo trousers, a
        /// harness vest and a belt; the bomber with shin guards and arm wraps; the duster over the base with the gaiter;
        /// the cape over the base; each dyed from the palettes.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator GeneratedKit()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            UiTests.Content();
            for (var i = 0; i < 10; i++) yield return null;
            var controller = GameObject.Find("player_f_built").GetComponent<Animator>().runtimeAnimatorController;
            foreach (var r in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None)) r.gameObject.SetActive(false);
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            Assert.That(F != null && M != null, Is.True, "the bases");
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional);
            if (sun != null) sun.transform.rotation = Quaternion.Euler(30f, 25f, 0f);
            var kits = new (string Name, string[] Layers, int[] Dyes)[]
            {
                ("base", new[] { "sf_base_highneck", "sf_cargo_articulated", "sf_vest_harness", "sf_belt_rig", "maciekg_leather_boots" }, new[] { 0x2f4a73, 0x5c6b2f, 0x1d1b19, 0, 0 }),
                ("bomber", new[] { "sf_bomber_cropped", "sf_cargo_articulated", "sf_shin_guards", "sf_arm_wraps", "mindfront_shoes_biker_boots_male" }, new[] { 0x8a1c1c, 0x2c2a28, 0, 0x3b4d5c, 0 }),
                ("duster", new[] { "sf_base_highneck", "sf_cargo_articulated", "sf_duster_long", "sf_gaiter_down", "maciekg_leather_boots" }, new[] { 0xb8862b, 0x2f4a73, 0x3a3328, 0x7a2e2e, 0 }),
                ("cape", new[] { "sf_base_highneck", "sf_cargo_articulated", "sf_cape_shoulder", "sf_belt_rig", "punkduck_medieval_boots" }, new[] { 0x5a2d4f, 0x8a3b1e, 0x2f6f6a, 0, 0 }),
            };
            var cam = Camera.main;
            cam.fieldOfView = 24f;
            var n = 0;
            foreach (var male in new[] { false, true })
            {
                foreach (var kit in kits)
                {
                    var id = (male ? "kit_m_" : "kit_f_") + kit.Name;
                    var look = SecondFace.Core.Npc.Bodies.For(id, male, 30, "street");
                    var at = new Vector3(400f + n * 5f, 0f, 0f);
                    var go = Object.Instantiate(male ? M : F, at, Quaternion.Euler(0, 180f, 0));
                    go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                    var anim = go.GetComponent<Animator>();
                    anim.runtimeAnimatorController = controller;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    go.AddComponent<SecondFace.Game.People.HandPose>();
                    go.AddComponent<SecondFace.Game.People.ArmClearance>();
                    yield return null;
                    var outfit = new SecondFace.Core.Npc.Outfit { Layers = new List<SecondFace.Core.Npc.GarmentLook>(), Gear = new List<SecondFace.Core.Npc.GearLook>(), Grime = 0.35, Wear = 0.4 };
                    for (var k = 0; k < kit.Layers.Length; k++)
                    {
                        var gl = new SecondFace.Core.Npc.GarmentLook { Name = kit.Layers[k] };
                        if (kit.Dyes[k] != 0) gl.Dye = kit.Dyes[k];
                        outfit.Layers.Add(gl);
                    }
                    var wardrobe = go.GetComponent<SecondFace.Game.People.Wardrobe>();
                    SecondFace.Game.People.Dresser.Dress(wardrobe, outfit);
                    SecondFace.Game.People.LookView.Apply(go, look);
                    for (var k = 0; k < 30; k++) yield return null;
                    var lod = go.GetComponent<LODGroup>();
                    if (lod != null) lod.ForceLOD(0);
                    Debug.Log($"kit {id}: wearing {string.Join(", ", wardrobe.Wearing.Select(kv => kv.Key + "=" + kv.Value))}");
                    var h = look.Stature / 100f;
                    var dist = Mathf.Max(4.2f, (h + 0.32f) / (2f * Mathf.Tan(12f * Mathf.Deg2Rad)));
                    cam.transform.position = at + new Vector3(0f, h * 0.55f, -dist);
                    cam.transform.LookAt(at + new Vector3(0f, h * 0.5f, 0f));
                    yield return null;
                    yield return Capture(id, 640, 960);
                    cam.transform.position = at + new Vector3(dist * 0.7f, h * 0.55f, -dist * 0.7f);
                    cam.transform.LookAt(at + new Vector3(0f, h * 0.5f, 0f));
                    yield return null;
                    yield return Capture(id + "_side", 640, 960);
                    Object.Destroy(go);
                    n++;
                }
            }
            Assert.That(n, Is.EqualTo(8));
        }

        /// <summary>P4 step 6: portraits in the engine under the studio light, cached; the player's two bases as they are
        /// and aged, and three of the cast, in one sheet (`people_portraits`). The second ask returns the same texture;
        /// the person's layers and the world's lights are as they were after.</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator PortraitsAreRenderedAndKept()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            var people = new List<GameObject> { GameObject.Find("player_f_built"), GameObject.Find("player_m_built") };
            Assert.That(people.All(p => p != null), Is.True, "the player's bases in the scene");
            var keptBefore = SecondFace.Game.People.Portraits.Count;   // other tests' people may still be kept
#if UNITY_EDITOR
            foreach (var id in new string[0])   // the cast models are retired (P4.13); the bases are the people
            {
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/SecondFace/Prefabs/people/{id}.prefab");
                if (prefab == null) continue;
                var p = Object.Instantiate(prefab, new Vector3(30f + people.Count * 2f, 0, 0), Quaternion.Euler(0, 180f, 0));
                p.name = id;
                people.Add(p);
            }
#endif
            for (var i = 0; i < 5; i++) yield return null;
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).First(l => l.type == LightType.Directional && l.gameObject.name == "Sun");
            var layer = people[0].GetComponentInChildren<SkinnedMeshRenderer>().gameObject.layer;
            var asks = new List<(GameObject, string)>();
            foreach (var p in people) asks.Add((p, ""));
            asks.Insert(1, (people[0], "aged")); asks.Insert(3, (people[1], "aged"));
            var watch = System.Diagnostics.Stopwatch.StartNew();
            var rts = asks.Select(a => SecondFace.Game.People.Portraits.Of(a.Item1, a.Item2)).ToList();
            var ms = watch.Elapsed.TotalMilliseconds / rts.Count;
            Assert.That(SecondFace.Game.People.Portraits.Of(people[0]), Is.SameAs(rts[0]), "asked again, the same texture");
            Assert.That(sun.enabled, Is.True, "the world's sun back on");
            Assert.That(people[0].GetComponentInChildren<SkinnedMeshRenderer>().gameObject.layer, Is.EqualTo(layer), "the person's layer back");
            // one sheet, and each portrait more than its background
            var size = SecondFace.Game.People.Portraits.Size;
            var sheet = new Texture2D(size * rts.Count, size, TextureFormat.RGB24, false);
            var active = RenderTexture.active;
            for (var i = 0; i < rts.Count; i++)
            {
                RenderTexture.active = rts[i];
                sheet.ReadPixels(new Rect(0, 0, size, size), i * size, 0);
            }
            RenderTexture.active = active;
            sheet.Apply();
            for (var i = 0; i < rts.Count; i++)
            {
                var px = sheet.GetPixels(i * size + size / 4, size / 4, size / 2, size / 2);
                var mean = new Color(px.Average(c => c.r), px.Average(c => c.g), px.Average(c => c.b));
                var spread = px.Average(c => Mathf.Abs(c.r - mean.r) + Mathf.Abs(c.g - mean.g) + Mathf.Abs(c.b - mean.b));
                Assert.That(spread, Is.GreaterThan(0.02f), $"portrait {i} ({asks[i].Item1.name} {asks[i].Item2}) shows a face");
            }
            File.WriteAllBytes(Path.Combine(OutDir(), "people_portraits.png"), sheet.EncodeToPNG());
            Debug.Log($"people_portraits: {rts.Count} portraits, {ms:0.0} ms each in the editor, {SecondFace.Game.People.Portraits.Count} kept");
            Object.Destroy(sheet);
            foreach (var p in people) SecondFace.Game.People.Portraits.Forget(p);
            Assert.That(SecondFace.Game.People.Portraits.Count, Is.EqualTo(keptBefore), "this test's portraits are forgotten");
            foreach (var p in people.Skip(2)) Object.Destroy(p);
        }

        /// <summary>P4 step 7: the generated hair (hairgen.py) on the hair test people from the front, the side and the back,
        /// one row per person, in one sheet (`people_hair`). Built only where the hair test people are (not in CI).</summary>
        [UnityTest, Timeout(600000)]
        public IEnumerator GeneratedHairIsCapturedWhenBuilt()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Hair.unity";
            if (!File.Exists(path)) { Assert.Ignore("hair test scene not built (the hair test people are local)"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 20; i++) yield return null;
            var root = GameObject.Find("HairTest");
            Assert.That(root, Is.Not.Null);
            var people = Enumerable.Range(0, root.transform.childCount).Select(i => root.transform.GetChild(i).gameObject).ToList();
            foreach (var a in root.GetComponentsInChildren<Animator>()) a.speed = 0f;
            foreach (var p in people) Assert.That(p.GetComponentInChildren<LODGroup>(), Is.Not.Null, $"{p.name}: levels of detail");
            var cam = Camera.main;
            const int w = 300, h = 340;
            var views = new[] { (0.25f, 1f), (1f, 0.1f), (-0.3f, -1f) };   // front, side, back: (x, z) around the head
            var sheet = new Texture2D(w * views.Length, h * people.Count, TextureFormat.RGB24, false);
            var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32);
            for (var p = 0; p < people.Count; p++)
            {
                var anim = people[p].GetComponent<Animator>();
                var head = anim.GetBoneTransform(HumanBodyBones.Head).position + Vector3.up * 0.04f;
                for (var v = 0; v < views.Length; v++)
                {
                    var face = people[p].transform.rotation * new Vector3(views[v].Item1, 0.05f, views[v].Item2).normalized;
                    cam.transform.position = head + face * 1.1f;
                    cam.transform.LookAt(head);
                    var request = new RenderPipeline.StandardRequest { destination = rt };
                    if (RenderPipeline.SupportsRenderRequest(cam, request)) RenderPipeline.SubmitRenderRequest(cam, request);
                    else { cam.targetTexture = rt; cam.Render(); cam.targetTexture = null; }
                    var active = RenderTexture.active;
                    RenderTexture.active = rt;
                    sheet.ReadPixels(new Rect(0, 0, w, h), v * w, (people.Count - 1 - p) * h);
                    RenderTexture.active = active;
                }
                yield return null;
            }
            sheet.Apply();
            File.WriteAllBytes(Path.Combine(OutDir(), "people_hair.png"), sheet.EncodeToPNG());
            Object.Destroy(sheet);
            rt.Release(); Object.Destroy(rt);
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

        /// <summary>P4.15 (owner, pass 9): the Reach's peoples as the generator makes them: every people, a woman and a man,
        /// at 25 and at 60, each from the front three-quarter and in profile (`lineup_&lt;people&gt;_&lt;sex&gt;_&lt;age&gt;_{front,side}`),
        /// then one man's hairline at four stages of balding and the brow styles of both sexes (`lineup_bald_*`,
        /// `lineup_brows_*`). Logs each person's archetype draw: hair, beard, brows, skin, eyes, stature.</summary>
        [UnityTest, Timeout(1200000)]
        public IEnumerator PeoplesLineup()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            var controller = GameObject.Find("player_f_built").GetComponent<Animator>().runtimeAnimatorController;
            foreach (var r in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None)) r.gameObject.SetActive(false);
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            Assert.That(F != null && M != null, Is.True, "the bases");
            var sun = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).FirstOrDefault(l => l.type == LightType.Directional);
            if (sun != null) sun.transform.rotation = Quaternion.Euler(28f, 35f, 0f);
            var cam = Camera.main;
            var at = new Vector3(300f, 0f, 0f);
            IEnumerator Shoot(SecondFace.Core.Npc.PlayerLook look, string name)
            {
                var male = look.Body == "m";
                var go = Object.Instantiate(male ? M : F, at, Quaternion.Euler(0, 180f, 0));
                go.transform.localScale = Vector3.one * SecondFace.Game.People.LookView.Scale(look);
                var anim = go.GetComponent<Animator>();
                anim.runtimeAnimatorController = controller;
                anim.applyRootMotion = false;
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                yield return null;
                var wardrobe = go.GetComponent<SecondFace.Game.People.Wardrobe>();
                SecondFace.Game.People.Dresser.Dress(wardrobe, SecondFace.Game.People.PlayerBody.Own(wardrobe, look));
                SecondFace.Game.People.LookView.Apply(go, look);
                for (var k = 0; k < 30; k++) yield return null;
                var lod = go.GetComponent<LODGroup>();
                if (lod != null) lod.ForceLOD(0);
                yield return null;
                var head = anim.GetBoneTransform(HumanBodyBones.Head).position + new Vector3(0f, 0.06f, 0f);
                cam.fieldOfView = 15f;
                foreach (var (view, from) in new[] { ("front", new Vector3(0.38f, 0.03f, -1.15f)), ("side", new Vector3(1.2f, 0.03f, -0.02f)) })
                {
                    cam.transform.position = head + from;
                    cam.transform.LookAt(head);
                    yield return null;
                    yield return Capture($"{name}_{view}", 384, 480);
                }
                Object.Destroy(go);
                yield return null;
            }
            // resumable (the software GL driver of the headless editor faults now and then, P4.15): with SF_LINEUP_SINCE (unix
            // seconds) a person whose both captures were written since then is skipped, so a rerun finishes the lineup
            long.TryParse(System.Environment.GetEnvironmentVariable("SF_LINEUP_SINCE") ?? "0", out var since);
            bool Done(string name) => since > 0 && new[] { "front", "side" }.All(v =>
            {
                var f = Path.Combine(Application.dataPath, "..", "Screenshots", $"{name}_{v}.png");
                return File.Exists(f) && new System.DateTimeOffset(File.GetLastWriteTimeUtc(f)).ToUnixTimeSeconds() >= since;
            });
            foreach (var (cluster, _) in SecondFace.Core.Npc.Bodies.Clusters)
                foreach (var male in new[] { false, true })
                    foreach (var age in new[] { 25, 60 })
                    {
                        var id = $"lineup_{cluster}_{(male ? "m" : "f")}_{age}";
                        if (Done(id)) continue;
                        var look = SecondFace.Core.Npc.Bodies.For(id, male, age, "settler", SecondFace.Core.Npc.Bodies.Means.Working, cluster);
                        Debug.Log($"lineup|{cluster}|{(male ? "m" : "f")}|{age}|stature={look.Stature:0}|hair={look.Hair}|colour={look.HairColour:x6}|beard={look.Beard}|bald={look.Bald:0.00}|brows={look.Brows}|skin={look.Skin:0.00}|eyes={look.Eyes}|figure={look.Figure}|lips={look.Face["mouth-upperlip-volume"]:0.00}|nose={look.Face["nose-scale-horiz"]:0.00}|depth={look.Face["nose-scale-depth"]:0.00}|fold={look.Face["eye-epicanthus"]:0.00}");
                        yield return Shoot(look, id);
                    }
            // the hairline at four stages, and the brow styles
            var bald = SecondFace.Core.Npc.Bodies.For("lineup_bald", true, 45, "settler", SecondFace.Core.Npc.Bodies.Means.Working, "north_european");
            bald.Hair = "buzz";
            foreach (var b in new[] { 0f, 0.3f, 0.6f, 1f })
            {
                if (Done($"lineup_bald_{b:0.0}")) continue;
                var l = bald.Clone(); l.Bald = b;
                yield return Shoot(l, $"lineup_bald_{b:0.0}");
            }
            foreach (var male in new[] { false, true })
                for (var b = 0; b < 3; b++)
                {
                    if (Done($"lineup_brows_{(male ? "m" : "f")}{b}")) continue;
                    var l = SecondFace.Core.Npc.Bodies.For("lineup_brows_" + (male ? "m" : "f"), male, 30, "settler", SecondFace.Core.Npc.Bodies.Means.Working, "mediterranean");
                    l.Brows = b;
                    yield return Shoot(l, $"lineup_brows_{(male ? "m" : "f")}{b}");
                }
        }
    
        /// <summary>P4.15 diagnostic: one person of each sex, the brows drawn bright red; logs what the skin's property block
        /// holds after the wardrobe has settled (`diag_brows_{f,m}`).</summary>
        [UnityTest, Timeout(300000)]
        public IEnumerator BrowsDiagnostic()
        {
            const string path = "Assets/SecondFace/Scenes/Test_Player.unity";
            if (!File.Exists(path)) { Assert.Ignore("player scene not built"); yield break; }
            yield return LoadTestScene(path);
            for (var i = 0; i < 10; i++) yield return null;
            var controller = GameObject.Find("player_f_built").GetComponent<Animator>().runtimeAnimatorController;
            foreach (var r in Object.FindObjectsByType<Animator>(FindObjectsSortMode.None)) r.gameObject.SetActive(false);
            GameObject F = null, M = null;
#if UNITY_EDITOR
            F = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            M = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
#endif
            var cam = Camera.main;
            foreach (var male in new[] { false, true })
            {
                var look = SecondFace.Core.Npc.Bodies.For("diag", male, 30, "settler", SecondFace.Core.Npc.Bodies.Means.Working, "mediterranean");
                look.BrowColour = 0xff0000;
                var go = Object.Instantiate(male ? M : F, new Vector3(300f, 0f, 0f), Quaternion.Euler(0, 180f, 0));
                Debug.Log($"diag {(male ? "m" : "f")}: instantiated");
                var anim = go.GetComponent<Animator>();
                anim.runtimeAnimatorController = controller;
                anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                yield return null;
                SecondFace.Game.People.LookView.Apply(go, look);
                Debug.Log($"diag {(male ? "m" : "f")}: look applied");
                for (var k = 0; k < 10; k++) yield return null;
                var block = new MaterialPropertyBlock();
                foreach (var r in go.GetComponentsInChildren<SkinnedMeshRenderer>(true).Where(r => r.name.StartsWith("Body_")))
                {
                    r.GetPropertyBlock(block);
                    Debug.Log($"diag {(male ? "m" : "f")} {r.name} shader={r.sharedMaterial.shader.name} tone={block.GetFloat("_Tone")} brow0={block.GetVector("_Brow0")} brow1={block.GetVector("_Brow1")} browColour={block.GetColor("_BrowColour")} rest={(r.sharedMaterial.GetTexture("_RestMap") != null)} bare={r.sharedMaterial.GetColor("_BareSkin")} blendshapes={r.sharedMesh.blendShapeCount}");
                }
                var lod = go.GetComponent<LODGroup>();
                if (lod != null) lod.ForceLOD(0);
                var head = anim.GetBoneTransform(HumanBodyBones.Head).position + new Vector3(0f, 0.06f, 0f);
                cam.fieldOfView = 15f;
                cam.transform.position = head + new Vector3(0.2f, 0.03f, -1.1f);
                cam.transform.LookAt(head);
                yield return null;
                Debug.Log($"diag {(male ? "m" : "f")}: capturing");
                yield return Capture($"diag_brows_{(male ? "m" : "f")}", 512, 512);
                Object.Destroy(go);
                yield return null;
            }
        }
}
}
