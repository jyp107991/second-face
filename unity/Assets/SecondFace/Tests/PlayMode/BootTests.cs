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
            var tappable = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None);
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
