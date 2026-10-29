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
            var about = walk.People != null ? walk.People.Residents.Count(r => r.Person != null && r.Person.gameObject.activeSelf) : walk.Townsfolk;
            Assert.That(tappable.Length, Is.GreaterThanOrEqualTo(about), "every one of the townsfolk about can be tapped");
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

        /// <summary>P6.1: the town's fires are somewhere to camp: the walker goes to one, the camp's page opens and a rest
        /// moves the world's clock (and the sky); out of doors the HUD's camp makes camp where they stand; the rented
        /// room's conversation makes camp (the content's camp event, after the conversation closes).</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheWalkerMakesCamp()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            var g = walk.Game;
            var map = SecondFace.Core.Content.Registry.Maps["shale"];
            var things = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None);
            var fires = things.Where(t => t.Verbs.Contains("camp")).ToList();
            Assert.That(fires.Count, Is.EqualTo(4), "Shale's four fires");
            var at = walk.Walker.transform.position;
            var fire = fires.OrderBy(f => Vector3.Distance(f.transform.position, at)).First();
            g.Pc.Sheet.Hp = 3;
            var t0 = Time.realtimeSinceStartup;
            walk.StartCoroutine(walk.Use(fire, "camp", "shale", map));
            while (Time.realtimeSinceStartup - t0 < 40f && (walk.Camping == null || !walk.Camping.IsOpen)) yield return null;
            Assert.That(walk.Camping != null && walk.Camping.IsOpen, Is.True, "walked to the fire and made camp");
            var near = walk.Walker.transform.position - fire.transform.position;
            near.y = 0f;
            Assert.That(near.magnitude, Is.LessThan(Walkabout.Reach), "at the fire");
            Assert.That(Time.timeScale, Is.EqualTo(0f), "the world waits");
            var clock = boot.Stage.Clock;
            var m0 = clock.Minutes;
            walk.Camping.Rest(4);
            Assert.That(clock.Minutes, Is.EqualTo(m0 + 240).Within(0.01), "four hours on the world's clock");
            Assert.That(g.Pc.Sheet.Hp, Is.GreaterThan(3), "rested");
            Assert.That(walk.Camping.Said, Does.StartWith("You rest 4 hours"));
            // sitting on the ground by it, facing it (the world is stopped; the body is not)
            var t1 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t1 < 1.5f) yield return null;
            Assert.That(walk.Walker.Seated, Is.True, "sat down at the fire");
            Assert.That(walk.Walker.Animator.GetCurrentAnimatorStateInfo(0).IsName("sit_ground"), Is.True);
            var toFire = fire.transform.position - walk.Walker.transform.position;
            toFire.y = 0f;
            Assert.That(Vector3.Angle(walk.Walker.transform.forward, toFire), Is.LessThan(20f), "facing the fire");
            var hipsAt = walk.Walker.Animator.GetBoneTransform(HumanBodyBones.Hips).position.y - walk.Walker.transform.position.y;
            Debug.Log($"BootTests: seated on the ground, hips {hipsAt:0.00} m up");
            Assert.That(hipsAt, Is.LessThan(0.45f), "on the ground");
            walk.Rig.View(walk.Rig.Yaw, 30f, 6f);
            for (var i = 0; i < 20; i++) yield return null;
            yield return ScreenshotTests.Capture("walkabout_camp", 1920, 1080);
            walk.Camping.Close();
            Assert.That(Time.timeScale, Is.EqualTo(1f), "the world moves again");
            Assert.That(walk.Walker.Seated, Is.False, "up again when camp is broken");
            // out of doors the HUD's camp makes camp where the walker stands
            Assert.That(walk.Indoors(), Is.False);
            Assert.That(boot.Hud.CampButton.resolvedStyle.display, Is.EqualTo(DisplayStyle.Flex), "the HUD's camp");
            var open = walk.OpenCamp();
            Assert.That(open != null && open.IsOpen, Is.True, "camp under the open sky");
            open.Close();
            // the rented room: its conversation makes camp
            g.SetFlag("shale_room", true);
            var bed = things.FirstOrDefault(t => t.Id == "room_bed");
            Assert.That(bed, Is.Not.Null, "the back room's bed");
            Assert.That(walk.LookAt(bed, map), Is.True);
            for (var i = 0; i < 2; i++) yield return null;
            var panel = walk.Conversation;
            var rest = panel.View.Options.FirstOrDefault(o => o.Text.StartsWith("(Rest"));
            Assert.That(rest, Is.Not.Null, "the room is yours");
            panel.Choose(rest.Id);
            for (var i = 0; i < 10 && (walk.Camping == null || !walk.Camping.IsOpen); i++) yield return null;
            Assert.That(walk.Camping != null && walk.Camping.IsOpen, Is.True, "the room's conversation makes camp");
            Assert.That(panel.IsOpen, Is.False, "the conversation closed first");
            walk.Camping.Close();
            boot.UI.CloseAll();
        }

        /// <summary>P6.1: what is dropped lies on the ground in a bundle at the walker's feet; tapped, the walker goes over,
        /// stoops, and its things lie beside the pack; emptied, the bundle goes; a pile is kept with the game.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator ThingsDroppedLieOnTheGround()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            var g = walk.Game;
            var inv = g.Pc.Inventory;
            var water = SecondFace.Core.Inventory.Inv.CountItem(inv, "c_water");
            Assert.That(water, Is.GreaterThan(0), "the kit's water");
            var pile = walk.Drop(inv.Items.FindIndex(i => i.Def == "c_water"), 1);
            Assert.That(pile, Is.Not.Null, "dropped");
            Assert.That(walk.Piles.Count, Is.EqualTo(1), "its bundle");
            var bundle = walk.Piles.Of(pile.Key);
            Assert.That(bundle, Is.Not.Null);
            var flat = bundle.transform.position - walk.Walker.transform.position;
            flat.y = 0f;
            Assert.That(flat.magnitude, Is.LessThan(1f), "at the walker's feet");
            Assert.That(Mathf.Abs(bundle.transform.position.y - walk.Walker.transform.position.y), Is.LessThan(0.5f), "on the ground");
            // walk a little off and look back at it (closer, for the evidence), then take it back
            var away = walk.Walker.transform.position + walk.Walker.transform.right * 3f;
            walk.Walker.GoTo(away);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f && walk.Walker.Goal != null) yield return null;
            var look = bundle.transform.position - walk.Walker.transform.position;
            walk.Rig.View(Mathf.Atan2(look.x, look.z) * Mathf.Rad2Deg + 25f, 36f, 5f);
            for (var i = 0; i < 30; i++) yield return null;
            yield return ScreenshotTests.Capture("walkabout_ground", 1920, 1080);
            var thing = bundle.GetComponent<Interactable>();
            Assert.That(thing.Verbs, Is.EqualTo(new[] { "take" }));
            walk.StartCoroutine(walk.Use(thing, "take", null, null));
            var stooped = false;
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && (walk.Loot == null || !walk.Loot.IsOpen))
            {
                if (walk.Walker.Animator.GetCurrentAnimatorStateInfo(0).IsName("pickup")) stooped = true;
                yield return null;
            }
            Assert.That(walk.Loot != null && walk.Loot.IsOpen, Is.True, "walked over and opened");
            Assert.That(stooped, Is.True, "stooped for it");
            Assert.That(walk.Loot.Root.Q<Label>("container").text, Is.EqualTo("On the ground"));
            walk.Loot.TakeAll();
            Assert.That(SecondFace.Core.Inventory.Inv.CountItem(inv, "c_water"), Is.EqualTo(water), "the water back");
            walk.Loot.Close();
            yield return null;
            Assert.That(walk.Piles.Count, Is.EqualTo(0), "the emptied bundle goes");
            Assert.That(g.Containers.ContainsKey(pile.Key), Is.False, "and its pile");
            boot.UI.CloseAll();
        }

        /// <summary>P6.1: a chair is somewhere to sit: the walker goes to its front, turns and sits with the hips on the
        /// seat, and gets up to walk again.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheWalkerSitsOnAChair()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            var seats = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).Where(t => t.Verbs.Contains("sit")).ToList();
            Assert.That(seats.Count, Is.EqualTo(11), "Shale's chairs");
            var at = walk.Walker.transform.position;
            var chair = seats.OrderBy(c => Vector3.Distance(c.transform.position, at)).First();
            walk.StartCoroutine(walk.Use(chair, "sit", "shale", SecondFace.Core.Content.Registry.Maps["shale"]));
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 40f && !walk.Walker.Seated) yield return null;
            Assert.That(walk.Walker.Seated, Is.True, "walked to the chair and sat");
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 1.5f) yield return null;
            Assert.That(walk.Walker.Animator.GetCurrentAnimatorStateInfo(0).IsName("sit"), Is.True);
            var outward = chair.transform.rotation * Vector3.back;
            Assert.That(Vector3.Angle(walk.Walker.transform.forward, outward), Is.LessThan(10f), "facing out of the chair");
            var flat = walk.Walker.transform.position - chair.transform.position;
            flat.y = 0f;
            Assert.That(flat.magnitude, Is.LessThan(0.2f), "over the seat");
            var floorY = walk.Walker.transform.position.y;
            var hips = walk.Walker.Animator.GetBoneTransform(HumanBodyBones.Hips).position.y - floorY;
            var foot = walk.Walker.Animator.GetBoneTransform(HumanBodyBones.LeftFoot).position.y - floorY;
            Debug.Log($"BootTests: seated on a chair, hips {hips:0.00} m over the floor, a foot {foot:0.00}");
            Assert.That(hips, Is.InRange(0.38f, 0.62f), "on the seat (0.48 m), not under it or over it");
            Assert.That(foot, Is.LessThan(0.16f), "the feet on the floor");
            var look = walk.Walker.transform.forward;
            walk.Rig.View(Mathf.Atan2(look.x, look.z) * Mathf.Rad2Deg + 150f, 28f, 4.5f);
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 1f) yield return null;
            yield return ScreenshotTests.Capture("walkabout_sit", 1920, 1080);
            // a walk gets them up first
            var footing = walk.Walker.Footing;
            Assert.That(walk.Walker.GoTo(footing + outward * 3f), Is.True);
            Assert.That(walk.Walker.Seated, Is.False, "up");
            Assert.That(Vector3.Distance(walk.Walker.transform.position, footing), Is.LessThan(0.3f), "where they sat down from");
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f && walk.Walker.Goal != null) yield return null;
            Assert.That(walk.Walker.Goal, Is.Null, "and walks");
        }

        /// <summary>P6.2: Shale keeps its hours: its people each in a body of their sex, the sheriff at her desk at noon and
        /// gone in to sleep at night, the factor away, the barkeep still at the bar; between posts they walk; one talked to
        /// stays put.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator ShaleKeepsItsHours()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            Assert.That(walk.People, Is.Not.Null, "the world's people");
            var town = walk.People.Town("shale");
            Assert.That(town, Is.Not.Null, "the town's people keep routines");
            float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }
            Vector3 Spot(string id) => boot.Stage.Marker("shale", "spot", id).transform.position;
            // from the plaza the whole town is within reach: everyone about stands in the world
            UnityEngine.AI.NavMesh.SamplePosition(Spot("plaza"), out var plaza, 3f, UnityEngine.AI.NavMesh.AllAreas);
            walk.Walker.Agent.Warp(plaza.position);
            boot.Stage.Clock.SetHour(12);
            var residents = walk.People.ResidentsOf("shale");
            var w0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - w0 < 10f) yield return null;
            Assert.That(residents.Count, Is.GreaterThanOrEqualTo(15), "Shale's people");
            Assert.That(town.People.Count, Is.GreaterThanOrEqualTo(10), "those about stand in the world");
            var cast = boot.World.Cast.ToDictionary(c => c.Id);
            foreach (var p in town.People)
                Assert.That(cast[p.Body].Male, Is.EqualTo(SecondFace.Core.Npc.Routine.Male(p.Def.Look)), $"{p.Id} in a body of their sex");
            Debug.Log($"BootTests: {residents.Count} people, {town.People.Count} standing, {town.People.Select(p => p.Body).Distinct().Count()} bodies");
            // one mesh over the town: a way from the street in through the sheriff's door (a place's own mesh built before
            // the world's would leave its interiors an island)
            var way = new UnityEngine.AI.NavMeshPath();
            UnityEngine.AI.NavMesh.CalculatePath(walk.Walker.transform.position, Spot("sheriff_desk"), UnityEngine.AI.NavMesh.AllAreas, way);
            Assert.That(way.status, Is.EqualTo(UnityEngine.AI.NavMeshPathStatus.PathComplete), "a way in to the sheriff's desk");
            var street = boot.Stage.Marker("shale", "spawn").transform.position;
            // the walker stands in a room (its roof and upper walls open) and looks down at whoever keeps it
            IEnumerator Visit(Vector3 spot, string capture)
            {
                var near = spot + (street - spot).normalized * 1.8f;
                UnityEngine.AI.NavMesh.SamplePosition(near, out var h, 3f, UnityEngine.AI.NavMesh.AllAreas);
                walk.Walker.Agent.Warp(h.position);
                walk.Rig.Follow(walk.Walker.transform);
                walk.Rig.View(Mathf.Atan2(spot.x - h.position.x, spot.z - h.position.z) * Mathf.Rad2Deg, 55f, 10f);
                if (boot.Stage.Sky != null) boot.Stage.Sky.Apply();
                var t = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t < 1.5f) yield return null;
                yield return ScreenshotTests.Capture(capture, 1920, 1080);
            }
            var ada = town.Of("npc_sh_01");
            var pike = town.Of("npc_sh_04");
            var mags = town.Of("npc_sh_03");
            Assert.That(ada != null && pike != null && mags != null, Is.True, "the sheriff, the factor, the barkeep");
            // noon
            town.Step(12, true);
            for (var i = 0; i < 5; i++) yield return null;
            Assert.That(ada.gameObject.activeSelf, Is.True);
            Assert.That(Flat(ada.transform.position, Spot("sheriff_desk")), Is.LessThan(1.5f), "the sheriff at her desk");
            Assert.That(Flat(pike.transform.position, Spot("toll_counter")), Is.LessThan(1.5f), "the factor at his counter");
            yield return Visit(Spot("sheriff_desk"), "walkabout_town_noon");
            // night
            boot.Stage.Clock.SetHour(23.5);
            town.Step(23.5, true);
            for (var i = 0; i < 5; i++) yield return null;
            Assert.That(ada.gameObject.activeSelf, Is.False, "gone in to sleep");
            Assert.That(pike.gameObject.activeSelf, Is.False, "away");
            Assert.That(mags.gameObject.activeSelf, Is.True, "the bar keeps late hours");
            Assert.That(Flat(mags.transform.position, Spot("bar")), Is.LessThan(1.5f));
            var awake = town.People.Count(p => p.gameObject.activeSelf);
            Debug.Log($"BootTests: at 23:30 {awake} of {town.People.Count} about");
            yield return Visit(Spot("bar"), "walkabout_town_night");
            // between posts they walk: the sheriff from her patrol to her desk as nine strikes
            boot.Stage.Clock.SetHour(8.9);
            town.Step(8.9, true);
            for (var i = 0; i < 5; i++) yield return null;
            Assert.That(Flat(ada.transform.position, Spot("street_c")), Is.LessThan(8f), "on her patrol");
            boot.Stage.Clock.SetHour(9.05);
            town.Step(9.05, false);
            var t0 = Time.realtimeSinceStartup;
            var moved = false;
            var start = ada.transform.position;
            while (Time.realtimeSinceStartup - t0 < 60f && Flat(ada.transform.position, Spot("sheriff_desk")) > 1.5f)
            {
                if (Flat(ada.transform.position, start) > 1f) moved = true;
                town.Step(9.05, false);
                yield return null;
            }
            Assert.That(moved, Is.True, "she walked");
            Assert.That(Flat(ada.transform.position, Spot("sheriff_desk")), Is.LessThan(1.5f), "to her desk");
            // held: talked to, she stays as the hours turn
            ada.Held = true;
            var at = ada.transform.position;
            boot.Stage.Clock.SetHour(20);
            town.Step(20, true);
            for (var i = 0; i < 5; i++) yield return null;
            Assert.That(Flat(ada.transform.position, at), Is.LessThan(0.2f), "held where she is");
            ada.Held = false;
            town.Step(20, true);
            Assert.That(Flat(ada.transform.position, Spot("saloon_table")), Is.LessThan(1.5f), "then off to her evening");
        }

        /// <summary>P6.2 part 2: the world's people come and go with the walker: bodies near, data far; seen in full only
        /// close by; another place's people stand when the walker comes to it, and the town left behind goes with its
        /// people.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator PeopleComeAndGoWithTheWalker()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            var people = walk.People;
            Assert.That(people, Is.Not.Null);
            var town = people.Town("shale");
            Assert.That(town, Is.Not.Null, "Shale stands, and its people with it");
            float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }
            IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
            var plaza = boot.Stage.Marker("shale", "spot", "plaza").transform.position;
            UnityEngine.AI.NavMesh.SamplePosition(plaza, out var hit, 3f, UnityEngine.AI.NavMesh.AllAreas);
            walk.Walker.Agent.Warp(hit.position);
            boot.Stage.Clock.SetHour(12);
            yield return Wait(4f);
            var residents = people.ResidentsOf("shale").Count;
            var standing = town.People.Count;
            Assert.That(standing, Is.GreaterThanOrEqualTo(10), "those about stand in the world");
            // seen in full only close by (gestures, gaze, feet planted)
            people.Full = 10f;
            yield return Wait(1f);
            var me = walk.Walker.transform.position;
            foreach (var p in town.People)
            {
                var d = Flat(p.transform.position, me);
                if (d < 8.5f) Assert.That(p.Full, Is.True, $"{p.Id} at {d:0.0} m in full");
                if (d > 11.5f) Assert.That(p.Full, Is.False, $"{p.Id} at {d:0.0} m not in full");
                if (!p.Full && p.Animator != null) Assert.That(p.Animator.GetComponent<Ambient>().enabled, Is.False, "no gestures far off");
            }
            Assert.That(town.People.Any(p => !p.Full), Is.True, "someone further off");
            // beyond reach the bodies go and the people stay as data
            people.Near = 25f; people.Leave = 35f;
            yield return Wait(1.5f);
            Assert.That(town.People.Count, Is.LessThan(standing), "the far ones' bodies gone");
            foreach (var p in town.People)
                Assert.That(Flat(p.transform.position, walk.Walker.transform.position), Is.LessThan(37f), $"{p.Id} near");
            Assert.That(people.ResidentsOf("shale").Count, Is.EqualTo(residents), "everyone still there as data");
            Assert.That(people.ResidentsOf("shale").Count(r => r.Person != null), Is.EqualTo(town.People.Count));
            people.Near = 120f; people.Leave = 140f; people.Full = 60f;
            yield return Wait(4f);
            Assert.That(town.People.Count, Is.GreaterThanOrEqualTo(standing - 1), "and they come back where the hour has them");
            Debug.Log($"BootTests: Shale {residents} people, {standing} standing; near 25 m: some gone, back again {town.People.Count}");
            // another place: set down at Cistern 9's mouth, its people stand; Shale (770 m off, still standing) keeps its
            // people as data, none of them in the world
            var mouth = boot.Stage.World.PlaceCentre("cistern9");
            walk.Game.Spot = new SecondFace.Core.State.WorldSpot { X = mouth.x, Y = mouth.y, Z = mouth.z, CamYaw = 30f, CamPitch = 50f, CamDistance = 20f };
            walk.Begin(walk.Game);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && (people.Town("cistern9") == null || people.Town("cistern9").People.Count == 0)) yield return null;
            yield return Wait(1f);
            Debug.Log($"BootTests: at Cistern 9 after {Time.realtimeSinceStartup - t0:0.0} s; {walk.Line()}");
            if (people.Town("shale") != null)
            {
                Assert.That(people.Town("shale").People.Count, Is.EqualTo(0), "Shale's people far off: none stands");
                Assert.That(people.ResidentsOf("shale").Count, Is.EqualTo(residents), "but all are there as data");
            }
            var shelter = people.Town("cistern9");
            Assert.That(shelter, Is.Not.Null, "Cistern 9 stands");
            Assert.That(people.ResidentsOf("cistern9").Count, Is.GreaterThanOrEqualTo(5), "the shelter's people");
            Assert.That(shelter.People.Count, Is.GreaterThanOrEqualTo(1), "near enough to stand");
            var cast = boot.World.Cast.ToDictionary(c => c.Id);
            foreach (var p in shelter.People)
                Assert.That(cast[p.Body].Male, Is.EqualTo(SecondFace.Core.Npc.Routine.Male(p.Def.Look)), $"{p.Id} in a body of their sex");
            // down in the shelter among them
            var one = shelter.People.OrderBy(p => p.Id).First();
            var at = one.transform.position + one.transform.forward * 1.6f;
            walk.Game.Spot = new SecondFace.Core.State.WorldSpot { X = at.x, Y = one.transform.position.y, Z = at.z, Yaw = one.transform.eulerAngles.y + 180f, CamYaw = one.transform.eulerAngles.y + 200f, CamPitch = 45f, CamDistance = 9f };
            var before = walk.Walker;
            walk.Begin(walk.Game);   // as a load does: the people are brought again for the game
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && (walk.Walker == before || !walk.Ready)) yield return null;
            Assert.That(walk.Walker != before && walk.Ready, Is.True, "set down in the shelter");
            yield return Wait(3f);
            shelter = people.Town("cistern9");
            Assert.That(shelter.People.Count(p => p.Full), Is.GreaterThanOrEqualTo(1), "seen in full close by");
            Debug.Log($"BootTests: in the shelter {shelter.People.Count} standing of {people.ResidentsOf("cistern9").Count}; {walk.Line()}");
            // beside the nearest of them, looking past the walker at them
            var near = shelter.People.Where(p => p.gameObject.activeSelf).OrderBy(p => Flat(p.transform.position, walk.Walker.transform.position)).First();
            UnityEngine.AI.NavMesh.SamplePosition(near.transform.position + near.transform.forward * 1.8f, out var by, 2f, UnityEngine.AI.NavMesh.AllAreas);
            walk.Walker.Agent.Warp(by.position);
            var look = near.transform.position - by.position;
            walk.Rig.Follow(walk.Walker.transform);
            walk.Rig.View(Mathf.Atan2(look.x, look.z) * Mathf.Rad2Deg + 25f, 40f, 6f);
            yield return Wait(1.5f);
            yield return ScreenshotTests.Capture("walkabout_people_shelter", 1920, 1080);
        }

        /// <summary>P6.3: stealth on light: walking up to someone by day they see you; in a sneak (crouched, the captured
        /// motion) behind them at night they do not, nor in front of them a few metres off in the dark; close in front they
        /// do. The HUD's sneak button is lit and its eye fills.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TheWalkerSneaksPastInTheDark()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            var watch = walk.Watch;
            Assert.That(watch, Is.Not.Null, "the people about watch");
            float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }
            IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
            var town = walk.People.Town("shale");
            var plaza = boot.Stage.Marker("shale", "spot", "plaza").transform.position;
            UnityEngine.AI.NavMesh.SamplePosition(plaza, out var hit, 3f, UnityEngine.AI.NavMesh.AllAreas);
            walk.Walker.Agent.Warp(hit.position);
            boot.Stage.Clock.SetHour(12);
            boot.Stage.Sky.Apply();
            yield return Wait(4f);
            // someone standing with open ground six metres before and behind them
            Vector3 Spot(Vector3 from, Vector3 to) =>
                UnityEngine.AI.NavMesh.SamplePosition(to, out var h, 1f, UnityEngine.AI.NavMesh.AllAreas) && !UnityEngine.AI.NavMesh.Raycast(from, h.position, out _, UnityEngine.AI.NavMesh.AllAreas)
                    ? h.position : Vector3.positiveInfinity;
            Townsperson who = null;
            Vector3 front = default, back = default, close = default;
            foreach (var p in town.People.Where(x => x.gameObject.activeSelf).OrderBy(x => Flat(x.transform.position, walk.Walker.transform.position)))
            {
                var f = p.transform.forward; f.y = 0; f.Normalize();
                front = Spot(p.transform.position, p.transform.position + f * 6f);
                back = Spot(p.transform.position, p.transform.position - f * 6f);
                close = Spot(p.transform.position, p.transform.position + f * 1.5f);
                if (float.IsInfinity(front.x) || float.IsInfinity(back.x) || float.IsInfinity(close.x)) continue;
                who = p;
                break;
            }
            Assert.That(who, Is.Not.Null, "someone with open ground about them");
            who.Held = true;   // their routine waits: they stand where they are, facing as they do
            if (who.Agent.isOnNavMesh) who.Agent.ResetPath();
            Debug.Log($"BootTests: watched by {who.Id} at {who.transform.position}");
            IEnumerator Stand(Vector3 at, float seconds)
            {
                walk.Walker.Agent.Warp(at);
                watch.Calm();
                var t = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t < seconds && who.Awareness < SecondFace.Core.World.Stealth.Noticed) yield return null;
            }
            // by day, walking up in front of them: seen
            yield return Stand(front, 4f);
            Debug.Log($"BootTests: noon in front: light {watch.Light:0.00}, exposure {watch.Exposure:0.00}, awareness {who.Awareness:0.00}");
            Assert.That(who.Awareness, Is.GreaterThanOrEqualTo(SecondFace.Core.World.Stealth.Noticed), "seen walking up by day");
            // the sneak: crouched in the captured motion
            var hips = walk.Walker.Animator.GetBoneTransform(HumanBodyBones.Hips);
            var standing = hips.position.y - walk.Walker.transform.position.y;
            walk.ToggleSneak();
            yield return Wait(1.2f);
            Assert.That(walk.Walker.Sneaking, Is.True);
            Assert.That(walk.Walker.Animator.GetCurrentAnimatorStateInfo(0).IsName("sneak"), Is.True, "in the sneak");
            var crouched = hips.position.y - walk.Walker.transform.position.y;
            Debug.Log($"BootTests: hips {standing:0.00} m standing, {crouched:0.00} m in the sneak");
            Assert.That(crouched, Is.LessThan(standing - 0.07f), "crouched");
            Assert.That(boot.Hud.SneakButton.ClassListContains("sf-hud__action--on"), Is.True, "the sneak button lit");
            Assert.That(boot.Hud.Eye.style.display.value, Is.EqualTo(DisplayStyle.Flex), "the eye shown");
            // at night, behind them: unseen
            boot.Stage.Clock.SetHour(23.5);
            boot.Stage.Sky.Apply();
            yield return Stand(back, 4f);
            Debug.Log($"BootTests: night behind: light {watch.Light:0.00}, awareness {who.Awareness:0.00}");
            Assert.That(who.Awareness, Is.LessThan(SecondFace.Core.World.Stealth.Suspicious), "unseen behind them at night");
            // in front of them, six metres off: unseen unless a lamp lights the walker
            yield return Stand(front, 4f);
            Debug.Log($"BootTests: night in front: light {watch.Light:0.00}, exposure {watch.Exposure:0.00}, awareness {who.Awareness:0.00}");
            if (watch.Light < 0.25) Assert.That(who.Awareness, Is.LessThan(SecondFace.Core.World.Stealth.Noticed), "unseen in the dark six metres off");
            // close in front: seen, and the eye says so
            yield return Stand(close, 5f);
            Debug.Log($"BootTests: night close: light {watch.Light:0.00}, awareness {who.Awareness:0.00}");
            Assert.That(who.Awareness, Is.GreaterThanOrEqualTo(SecondFace.Core.World.Stealth.Noticed), "seen close in front");
            yield return null;
            Assert.That(boot.Hud.Eye.ClassListContains("sf-hud__eye--seen"), Is.True, "the eye says so");
            var look = who.transform.position - walk.Walker.transform.position;
            walk.Rig.View(Mathf.Atan2(look.x, look.z) * Mathf.Rad2Deg + 35f, 30f, 5f);
            yield return Wait(1f);
            var suns = Object.FindObjectsByType<Light>(FindObjectsSortMode.None).Where(l => l.type == LightType.Directional && l.isActiveAndEnabled).ToList();
            Assert.That(suns.Count, Is.EqualTo(1), "one sun (or moon) lights the world: " + string.Join(", ", suns.Select(l => l.name)));
            Assert.That(suns[0], Is.SameAs(boot.Stage.Sky.Sun), "and the sky turns it");
            Assert.That(suns[0].intensity, Is.LessThan(0.5f), "at night, the moon's");
            yield return ScreenshotTests.Capture("walkabout_sneak", 1920, 1080);
            walk.ToggleSneak();
            who.Held = false;
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
