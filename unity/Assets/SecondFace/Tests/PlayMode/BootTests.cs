using System.Collections;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Save;
using SecondFace.Core.Stats;
using SecondFace.Game;
using SecondFace.Game.People;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;
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
            Bootstrap.MakeSession = null;
            Time.timeScale = 1f;
            WorldView.SetUnderground(false);
            PlaceNav.Disabled = false;
            yield return null;
        }

        /// <summary>The saves of a test's app, apart from the device's (emptied first).</summary>
        public static string SavesDir => Path.Combine(Application.temporaryCachePath, "boot-saves-test");

        private static void Press(UnityEngine.UIElements.Button b)
        {
            Assert.That(b, Is.Not.Null, "the button");
            Assert.That(b.enabledInHierarchy, Is.True, $"{b.name} can be pressed");
            using var e = UnityEngine.UIElements.NavigationSubmitEvent.GetPooled();
            e.target = b;
            b.SendEvent(e);
        }

        /// <summary>Loads the Boot scene, goes from the title through a new game (an origin, a name, begin: P5.3j) and
        /// waits until the walker stands on the NavMesh.</summary>
        private static IEnumerator Boot(System.Action<Bootstrap> done)
        {
            if (Directory.Exists(SavesDir)) Directory.Delete(SavesDir, true);
            Bootstrap.MakeSession = () => new Session(new DirectoryBackend(SavesDir));
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            Assert.That(boot, Is.Not.Null, "the Boot scene's Bootstrap");
            Assert.That(boot.World, Is.Not.Null, "the Boot scene holds the world assets (Second Face/Wire the Boot scene)");
            Assert.That(boot.World.Complete, Is.True, "every world asset is named");
            Assert.That(boot.World.Walker, Is.Not.Null, "the walker");
            Assert.That(boot.World.Locomotion, Is.Not.Null, "the locomotion controller");
            var t0 = Time.realtimeSinceStartup;
            // the title once the content is in: no save yet, so no continue; a new game opens character creation
            while (Time.realtimeSinceStartup - t0 < 120f && boot.Title == null) yield return null;
            Assert.That(boot.Title, Is.Not.Null, "the title opened once the content was in");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(boot.Title.ContinueButton, Is.Null, "nothing to continue on a first start");
            Press(boot.Title.NewButton);
            var creation = boot.UI.Top as CreationScreen;
            Assert.That(creation, Is.Not.Null, "a new game begins with character creation");
            for (var i = 0; i < 3; i++) yield return null;
            Press(creation.Content.Q<UnityEngine.UIElements.Button>("origin-" + Creation.Origins()[0].Id));
            creation.Content.Q<UnityEngine.UIElements.TextField>("name").value = "Ash Corran";
            Assert.That(creation.Finish(), Is.True, "the person is made and the game begins");
            Assert.That(boot.Walkabout.Begun, Is.True);
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
            // the interface (P5.3): the start card has gone and the HUD is over the walkabout, its compass on the camera
            Assert.That(boot.UI, Is.Not.Null, "the Boot scene holds the UI assets (Second Face/Wire the Boot scene)");
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(boot.UI.Top, Is.Null, "the start card closed once the walker was set down");
            Assert.That(boot.Hud, Is.Not.Null, "the HUD is up");
            // the walker is the person made: the player's body, their look, their name; the new game saved itself
            Assert.That(walk.Game.Pc.Sheet.Name, Is.EqualTo("Ash Corran"));
            Assert.That(walk.Walker.GetComponentInChildren<FaceSculpt>(), Is.Not.Null, "the player's own body (the sculptor's shapes on it)");
            Assert.That(walk.Walker.GetComponentInChildren<Wardrobe>().Wearing.Count, Is.GreaterThan(0), "dressed");
            Assert.That(boot.Session.Read(Session.Auto), Is.Not.Null, "the new game is in the auto slot");
            Assert.That(boot.Hud.MenuButton.resolvedStyle.display, Is.EqualTo(UnityEngine.UIElements.DisplayStyle.Flex), "the menu button is shown");
            var fwd = Camera.main.transform.forward;
            Assert.That(Mathf.Abs(Mathf.DeltaAngle(boot.Hud.Compass.Heading, Mathf.Atan2(fwd.x, fwd.z) * Mathf.Rad2Deg)), Is.LessThan(2f), "the compass follows the camera");
            // the notebook under the thumb (P5.3f) opens over the walkabout's game and closes
            Assert.That(boot.Hud.NotebookButton.resolvedStyle.display, Is.EqualTo(UnityEngine.UIElements.DisplayStyle.Flex), "the notebook button is shown");
            var notebook = boot.OpenNotebook(null);
            yield return null;
            Assert.That(boot.UI.Top, Is.SameAs(notebook), "the notebook opened");
            Assert.That(boot.Hud.Root.resolvedStyle.display, Is.EqualTo(UnityEngine.UIElements.DisplayStyle.Flex), "the HUD element stays (its layer hides)");
            notebook.Close();
            yield return null;
            // the map (P5.3g): the walker's town and the places its roads lead to are known and marked
            Assert.That(boot.Interface.WorldMap, Is.Not.Null, "the map's sheet is in the UI assets");
            var map = boot.OpenMap();
            for (var f = 0; f < 3; f++) yield return null;
            Assert.That(boot.UI.Top, Is.SameAs(map), "the map opened");
            Assert.That(map.Marker("shale"), Is.Not.Null, "the town is on it");
            Assert.That(walk.Game.World.KnownLocations.Count, Is.GreaterThan(1), "the places the town's roads lead to are known");
            Assert.That(map.You, Is.Not.Null, "and the walker");
            map.Close();
            yield return null;
            // the pack (P5.3h): the walker's kit, the live figure in the player's body; a stall-keeper's barter table
            Assert.That(boot.World.PlayerM, Is.Not.Null, "the player's body is in the world assets (Second Face/Wire the Boot scene)");
            Assert.That(boot.Hud.PackButton.resolvedStyle.display, Is.EqualTo(UnityEngine.UIElements.DisplayStyle.Flex), "the pack button is shown");
            var pack = boot.OpenPack();
            for (var f = 0; f < 4; f++) yield return null;
            Assert.That(boot.UI.Top, Is.SameAs(pack), "the pack opened");
            Assert.That(walk.Game.Pc.Inventory.EquippedAt("body"), Is.Not.Null, "the walker wears the Cistern's issue");
            Assert.That(pack.Cells.Count, Is.EqualTo(walk.Game.Pc.Inventory.Items.Count), "the kit in the grid");
            Assert.That(pack.Figure, Is.Not.Null, "the live figure");
            Assert.That(pack.Figure.Draws, Is.GreaterThan(0), "drawn");
            pack.Close();
            yield return null;
            Assert.That(pack.Figure, Is.Null, "the figure goes with the pack");
            var stall = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).FirstOrDefault(i => i.Verbs.Contains("trade"));
            Assert.That(stall, Is.Not.Null, "one of the townsfolk keeps a stall");
            Assert.That(walk.OpenTrade(stall), Is.True, $"{stall.Title}'s barter table opens");
            for (var f = 0; f < 3; f++) yield return null;
            Assert.That(walk.Trade.IsOpen, Is.True);
            Assert.That(walk.Trade.Theirs.Count, Is.GreaterThan(0), "their goods are on it");
            walk.Trade.Close();
            yield return null;
            // a tap on one of the townsfolk in view opens the radial over them (P5.3c); a verb closes it
            var view = Camera.main;
            var tappable = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).Where(i => i.Verbs.Contains("talk")).ToArray();   // the townsfolk
            Assert.That(tappable.Length, Is.GreaterThanOrEqualTo(walk.Townsfolk), "every one of the townsfolk can be tapped");
            (Interactable i, Vector2 p) InView() => tappable
                .Select(i => (i, p: (Vector2)view.WorldToScreenPoint(i.transform.position + Vector3.up * 1.2f)))
                .FirstOrDefault(x => x.p.x > 0 && x.p.x < Screen.width && x.p.y > 0 && x.p.y < Screen.height && Interactable.Under(view, x.p, walk.Walker.transform) == x.i);
            var folk = InView();
            var nearest = tappable.OrderBy(i => Vector3.Distance(i.transform.position, walk.Walker.transform.position)).ToList();
            for (var k = 0; folk.i == null && k < nearest.Count; k++)
            {
                // pan the view onto one of them (as two fingers would), nearest first, until one stands in clear view
                walk.Rig.Recentre();
                walk.Rig.PanBy(nearest[k].transform.position - walk.Walker.transform.position);
                walk.Rig.Snap();
                for (var f = 0; f < 3; f++) yield return null;
                folk = InView();
            }
            if (folk.i != null)
            {
                walk.Input.Tap(folk.p);
                Assert.That(boot.UI.Top, Is.TypeOf<SecondFace.Game.UI.RadialMenu>(), $"the radial opened over {folk.i.Title}");
                ((SecondFace.Game.UI.RadialMenu)boot.UI.Top).Choose("look");
                Assert.That(boot.UI.Top, Is.Null, "a verb closes it");
                Debug.Log($"BootTests: tapped {folk.i.Title}; the radial opened over them");
            }
            else
            {
                foreach (var i in nearest.Take(3))
                {
                    var sp = view.WorldToScreenPoint(i.transform.position + Vector3.up * 1.2f);
                    var hits = Physics.RaycastAll(view.ScreenPointToRay(sp), 300f, ~0, QueryTriggerInteraction.Collide)
                        .OrderBy(h => h.distance).Take(5).Select(h => $"{h.collider.name}({(h.collider.isTrigger ? "trigger" : "solid")}, {h.distance:0.0} m)");
                    Debug.Log($"BootTests: {i.Title} at screen {sp} of {Screen.width}x{Screen.height}, {Vector3.Distance(i.transform.position, walk.Walker.transform.position):0.0} m off: {string.Join(", ", hits)}");
                }
                Assert.Fail("none of the townsfolk could be brought into clear view to tap (the log says what the rays met)");
            }
            walk.Rig.Recentre();
            walk.Rig.Snap();
            // their conversation from the content opens in the panel (P5.3d)
            var speaker = tappable.FirstOrDefault(i => SecondFace.Core.Content.Registry.Npcs.TryGetValue(i.Id, out var n) && !string.IsNullOrEmpty(n.Dialogue));
            Assert.That(speaker, Is.Not.Null, "one of the townsfolk has a conversation in the content");
            Assert.That(walk.OpenConversation(speaker), Is.True, $"{speaker.Title}'s conversation opens");
            for (var f = 0; f < 3; f++) yield return null;
            Assert.That(walk.Conversation.IsOpen, Is.True);
            Assert.That(walk.Conversation.View.Options.Count, Is.GreaterThan(0), "it offers choices");
            Assert.That(Object.FindAnyObjectByType<ConversationCamera>(), Is.Not.Null, "the conversation cameras are on");
            boot.UI.CloseAll();
            // the camera blends back to the game view (and the conversation camera goes) before the camera checks below
            yield return new WaitForSeconds(ConversationCamera.Blend + 0.4f);
            Assert.That(Object.FindAnyObjectByType<ConversationCamera>(), Is.Null, "the conversation cameras are gone");
            Assert.That(boot.Hud.Root.resolvedStyle.display, Is.EqualTo(UnityEngine.UIElements.DisplayStyle.Flex), "the HUD is back");
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

        /// <summary>P5.3j: the game saved where it stands (with a picture), moved on, then loaded: the walker is back and the
        /// state is the saved one; the pause stops time; back to the title, whose continue picks the game up again.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheGameSavesLoadsAndPauses()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            for (var i = 0; i < 5; i++) yield return null;
            var meta = boot.Save("slot1");
            Assert.That(meta, Is.Not.Null, "saved");
            Assert.That(meta.Thumb, Is.Not.Empty, "with a picture of the scene");
            Assert.That(meta.Label, Is.EqualTo("Ash Corran"));
            var at = walk.Walker.transform.position;
            var yaw = walk.Rig.Yaw;
            // move on: walk away and change the state
            var away = at + walk.Walker.transform.forward * 6f;
            walk.Walker.GoTo(away);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && walk.Walker.Goal != null) yield return null;
            walk.Game.SetFlag("test_after_save", true);
            Assert.That(Vector3.Distance(walk.Walker.transform.position, at), Is.GreaterThan(2f), "walked on");
            Assert.That(boot.Load("slot1"), Is.True, "loaded");
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && (boot.UI.Top != null || !walk.Ready)) yield return null;
            Assert.That(walk.Ready, Is.True, "set down again");
            Assert.That(walk.Game.Flag("test_after_save"), Is.Null, "the state is the saved one");
            Assert.That(Vector3.Distance(walk.Walker.transform.position, at), Is.LessThan(0.6f), "where it was saved");
            Assert.That(Mathf.Abs(Mathf.DeltaAngle(walk.Rig.Yaw, yaw)), Is.LessThan(1f), "the camera as it was");
            // the pause: time stops; a save from it
            var pause = boot.OpenPause();
            Assert.That(pause, Is.Not.Null);
            yield return null;
            Assert.That(Time.timeScale, Is.EqualTo(0f), "the world stops");
            var saves = boot.OpenSaves(true);
            for (var i = 0; i < 2; i++) yield return null;
            saves.SaveTo("slot2");
            Assert.That(boot.Session.Read("slot2"), Is.Not.Null, "saved from the pause");
            boot.UI.CloseAll();
            Assert.That(Time.timeScale, Is.EqualTo(1f), "the world goes on");
            // back to the title: saved first; continue takes the game up again
            boot.QuitToTitle();
            yield return null;
            Assert.That(walk.Walker, Is.Null, "the walker goes");
            Assert.That(boot.Title, Is.Not.Null);
            Assert.That(boot.Title.ContinueButton, Is.Not.Null, "now there is a game to continue");
            Press(boot.Title.ContinueButton);
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && (boot.UI.Top != null || !walk.Ready)) yield return null;
            Assert.That(walk.Ready, Is.True, "continued");
            Assert.That(walk.Game.Pc.Sheet.Name, Is.EqualTo("Ash Corran"));
            Assert.That(boot.Hud.Root.resolvedStyle.display, Is.EqualTo(UnityEngine.UIElements.DisplayStyle.Flex), "the HUD is back");
        }

        /// <summary>P5.3l: photo mode on the walker (the world stops, the hour and the face change and go back, a picture is
        /// kept and cropped to its frame) and the pad (the left stick walks the way the camera looks, the right turns it,
        /// a bumper turns the view 90°, act opens the radial on someone near, start pauses; with a pad the first choice is
        /// focused).</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator PhotoModeAndThePad()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            for (var i = 0; i < 5; i++) yield return null;
            var minutes = boot.Stage.Clock.Minutes;
            var photo = boot.OpenPhoto();
            Assert.That(photo, Is.Not.Null, "photo mode opens");
            var mode = boot.GetComponent<PhotoMode>();
            Assert.That(Time.timeScale, Is.EqualTo(0f), "the world stops");
            var sun = boot.Stage.Sky.Sun.transform.forward;
            mode.SetHour(18.25f);
            Assert.That(Vector3.Angle(sun, boot.Stage.Sky.Sun.transform.forward), Is.GreaterThan(10f), "the sun moves with the hour while the world is stopped");
            mode.LookAtFace(true);
            mode.SetLens(24f);
            walk.Rig.View(walk.Walker.transform.eulerAngles.y + 180f, 8f, 2.4f);   // in front of them, at eye height
            Assert.That(FaceExpression.Set(walk.Walker.gameObject, "half_smile"), Is.GreaterThan(0), "the face's units are on the body");
            mode.SetFace("half_smile");
            for (var i = 0; i < 4; i++) yield return null;
            var path = photo.TakePicture();
            Assert.That(path, Is.Not.Null, "a picture is kept");
            Assert.That(File.Exists(path), Is.True);
            var pic = new Texture2D(2, 2);
            Assert.That(pic.LoadImage(File.ReadAllBytes(path)), Is.True);
            Assert.That(pic.width, Is.EqualTo(PhotoMode.Width), "at full width");
            File.Copy(path, Path.Combine(ScreenshotTests.OutDir(), "photo_face.jpg"), true);
            mode.SetFrame("portrait");
            mode.LookAtFace(false);
            walk.Rig.View(walk.Walker.transform.eulerAngles.y + 160f, 14f, 4.5f);
            for (var i = 0; i < 4; i++) yield return null;
            var upright = photo.TakePicture();
            Assert.That(pic.LoadImage(File.ReadAllBytes(upright)), Is.True);
            Assert.That(pic.width / (float)pic.height, Is.EqualTo(0.8f).Within(0.01f), "cropped to an upright frame");
            File.Copy(upright, Path.Combine(ScreenshotTests.OutDir(), "photo_upright.jpg"), true);
            Object.Destroy(pic);
            File.Delete(path); File.Delete(upright);
            photo.Close();
            yield return null;
            Assert.That(boot.Photo, Is.Null, "photo mode is done");
            Assert.That(Time.timeScale, Is.EqualTo(1f), "the world goes on");
            Assert.That(boot.Stage.Clock.Minutes, Is.EqualTo(minutes).Within(1.0), "at the hour it was");
            Assert.That(walk.Rig.PitchMin, Is.EqualTo(OrbitRig.MinPitch), "the camera's limits back");

            // the pad: the left stick walks the way the camera looks
            var pad = walk.Pad;
            Assert.That(pad, Is.Not.Null, "the pad's input");
            walk.Rig.View(walk.Rig.Yaw, 50f, 20f);
            var at = walk.Walker.transform.position;
            var camFwd = Camera.main.transform.forward; camFwd.y = 0; camFwd.Normalize();
            for (var i = 0; i < 40; i++) { pad.Next = new PadFrame { Move = new Vector2(0f, 1f) }; yield return null; }
            var moved = walk.Walker.transform.position - at; moved.y = 0;
            Assert.That(moved.magnitude, Is.GreaterThan(0.5f), "walked");
            Assert.That(Vector3.Dot(moved.normalized, camFwd), Is.GreaterThan(0.7f), "the way the camera looks");
            for (var i = 0; i < 10; i++) { pad.Next = new PadFrame(); yield return null; }
            Assert.That(walk.Walker.Steering, Is.False, "and stopped when let go");
            // the right stick turns the camera; a bumper turns the view a quarter
            var yaw = walk.Rig.Yaw;
            for (var i = 0; i < 20; i++) { pad.Next = new PadFrame { Look = new Vector2(1f, 0f) }; yield return null; }
            Assert.That(Mathf.DeltaAngle(yaw, walk.Rig.Yaw), Is.GreaterThan(5f), "turned");
            yaw = walk.Rig.Yaw;
            pad.Next = new PadFrame { TurnRight = true };
            for (var i = 0; i < 60; i++) yield return null;
            Assert.That(Mathf.DeltaAngle(yaw, walk.Rig.Yaw), Is.EqualTo(90f).Within(3f), "a quarter turn");
            // act: the radial over someone near
            var near = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).OrderBy(i => Vector3.Distance(i.transform.position, walk.Walker.transform.position)).First();
            Assert.That(UnityEngine.AI.NavMesh.SamplePosition(near.transform.position + near.transform.forward * 1.5f, out var by, 3f, UnityEngine.AI.NavMesh.AllAreas), Is.True, "ground by them");
            walk.Walker.Agent.Warp(by.position);
            yield return null;
            Assert.That(Vector3.Distance(walk.Walker.transform.position, near.transform.position), Is.LessThan(4f), $"beside {near.Title}");
            pad.Next = new PadFrame { Act = true };
            yield return null;
            Assert.That(boot.UI.Top, Is.TypeOf<RadialMenu>(), "act opens the radial on who is near");
            boot.UI.CloseAll();
            // start pauses, and again goes back
            pad.Next = new PadFrame { Pause = true };
            yield return null;
            Assert.That(boot.UI.Top, Is.TypeOf<PauseScreen>(), "start pauses");
            pad.Next = new PadFrame { Pause = true };
            yield return null;
            Assert.That(boot.UI.Top, Is.Null, "and goes back");
            // a pad present: the pause's first choice has the focus
            var device = UnityEngine.InputSystem.InputSystem.AddDevice<UnityEngine.InputSystem.Gamepad>();
            try
            {
                var pause = boot.OpenPause();
                yield return null;
                Assert.That(pause.Root.panel.focusController.focusedElement, Is.SameAs(pause.Root.Q<Button>("pause-resume")), "the pad starts on the first choice");
                pause.Close();
            }
            finally { UnityEngine.InputSystem.InputSystem.RemoveDevice(device); }
            yield return null;
            // quicksave from the keys or the pad, said on the HUD
            pad.Next = new PadFrame { QuickSave = true };
            yield return null;
            Assert.That(boot.Session.Read("quick"), Is.Not.Null, "quicksaved");
            Assert.That(boot.Hud.NoteText, Is.EqualTo(Strings.Get("hud.saved")));
        }

        /// <summary>P6.1: the town's things: a crate is walked to and opened, its water taken and gone the next time; a
        /// locker's lock holds against a new character (said on the HUD, two minutes gone); a talking prop's
        /// conversation opens.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheTownsThingsOpenAndSpeak()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            Assert.That(walk.Things, Is.GreaterThan(3), "the town's containers and talking props can be used");
            var things = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None);
            var map = SecondFace.Core.Content.Registry.Maps["shale"];
            var crate = things.FirstOrDefault(t => t.Id == "water_crate");
            Assert.That(crate, Is.Not.Null, "the water crate");
            Assert.That(crate.Verbs, Is.EqualTo(new[] { "open" }));
            var t0 = Time.realtimeSinceStartup;
            walk.StartCoroutine(walk.Use(crate, "open", "shale", map));
            while (Time.realtimeSinceStartup - t0 < 30f && (walk.Loot == null || !walk.Loot.IsOpen)) yield return null;
            Assert.That(walk.Loot != null && walk.Loot.IsOpen, Is.True, "walked over and opened");
            Assert.That(Vector3.Distance(walk.Walker.transform.position, crate.transform.position), Is.LessThan(2.5f), "beside it");
            walk.Loot.TakeAll();
            Assert.That(SecondFace.Core.Inventory.Inv.CountItem(walk.Game.Pc.Inventory, "c_dirtywater"), Is.EqualTo(3), "its water taken");
            walk.Loot.Close();
            var again = walk.OpenContainer(crate, "shale", map);
            Assert.That(again.Theirs, Is.Empty, "gone the next time");
            again.Close();
            // a lock beyond a new character
            var locker = things.FirstOrDefault(t => t.Id == "militia_locker");
            Assert.That(locker, Is.Not.Null, "the militia locker");
            string said = null;
            walk.Said += line => said = line;
            var m0 = walk.Game.Minutes;
            Assert.That(walk.OpenContainer(locker, "shale", map), Is.Null, "the lock holds");
            Assert.That(said, Does.StartWith("Locked"));
            Assert.That(walk.Game.Minutes, Is.EqualTo(m0 + 2), "two minutes at it");
            yield return null;
            Assert.That(boot.Hud.NoteText, Is.EqualTo(said), "said on the HUD");
            // a talking prop
            var pump = things.FirstOrDefault(t => t.Id == "pump_a");
            Assert.That(pump, Is.Not.Null, "the pumps");
            Assert.That(walk.LookAt(pump, map), Is.True, "its conversation opens");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(walk.Conversation.IsOpen, Is.True);
            boot.UI.CloseAll();
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
