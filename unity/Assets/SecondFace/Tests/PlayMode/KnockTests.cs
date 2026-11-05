using System.Collections;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using SecondFace.Core.Save;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace SecondFace.Tests
{
    /// <summary>
    /// The opening on the phone (P7, owner's note D): a new game begins at home in Knock on hatch day, at seven, with the
    /// day's quest; Knock's people stand there as Rocketbox people in their re-dyed clothes; a conversation runs from the
    /// content; the night's watch moves the clock; a trigger brings the stranger's conversation; choosing to fight starts a
    /// turn-based fight that ends with the dead written into the game. Captures: knock_square, knock_maud, knock_night,
    /// knock_fight.
    /// </summary>
    public class KnockTests
    {
        private static string SavesDir => Path.Combine(Application.temporaryCachePath, "knock-tests-saves");

        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
        private static float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }

        internal static IEnumerator NewGame(System.Action<Bootstrap> done, bool Capture = false)
        {
            if (Directory.Exists(SavesDir)) Directory.Delete(SavesDir, true);
            Bootstrap.MakeSession = () => new Session(new DirectoryBackend(SavesDir));
            Walkabout.StartAt = Walkabout.StartPlace;
            if (Object.FindAnyObjectByType<Bootstrap>() != null) yield return BootTests.Clear();
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            Assert.That(boot, Is.Not.Null);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && boot.Title == null) yield return null;
            Assert.That(boot.Title, Is.Not.Null, "the title");
            for (var i = 0; i < 2; i++) yield return null;
            BootTests.Press(boot.Title.NewButton);
            var creation = boot.UI.Top as CreationScreen;
            Assert.That(creation, Is.Not.Null, "character creation");
            for (var i = 0; i < 3; i++) yield return null;
            BootTests.Press(creation.Content.Q<UnityEngine.UIElements.Button>("origin-" + SecondFace.Core.Stats.Creation.Origins()[2].Id));
            creation.Content.Q<UnityEngine.UIElements.TextField>("name").value = "Wren Ashby";
            if (Capture)
            {
                // the player is one of the world's own people (a Rocketbox person), their face sculpted, their clothes dyed
                BootTests.Press(creation.Root.Q<UnityEngine.UIElements.Button>("tab-face"));
                for (var i = 0; i < 6; i++) yield return null;
                yield return ScreenshotTests.CaptureWithUi("knock_create_face", 1920, 1080);
                var next = creation.Root.Q<UnityEngine.UIElements.Button>("person-next");
                if (next != null) { BootTests.Press(next); for (var i = 0; i < 6; i++) yield return null; yield return ScreenshotTests.CaptureWithUi("knock_create_face_next", 1920, 1080); }
                BootTests.Press(creation.Root.Q<UnityEngine.UIElements.Button>("tab-body"));
                for (var i = 0; i < 6; i++) yield return null;
                yield return ScreenshotTests.CaptureWithUi("knock_create_body", 1920, 1080);
            }
            Assert.That(creation.Finish(), Is.True);
            while (Time.realtimeSinceStartup - t0 < 420f && (boot.Walkabout == null || !boot.Walkabout.Ready)) yield return null;
            Assert.That(boot.Walkabout.Ready, Is.True, $"set down ({boot.Walkabout.Line()})");
            done(boot);
        }

        [UnityTest, Timeout(1200000)]
        public IEnumerator TheOpeningPlaysAtHome()
        {
            Bootstrap boot = null;
            yield return NewGame(b => boot = b, Capture: true);
            var walk = boot.Walkabout;
            var g = walk.Game;
            Assert.That(SecondFace.Game.People.PlayerBody.Look(g.Pc).Rb, Is.Not.Null, "the player is one of Rocketbox's people");
            // home: the place above the Cistern's door, inside Maud's house, at seven on hatch day, the day's quest begun
            Assert.That(g.LocationId, Is.EqualTo("cistern9"));
            var home = boot.Stage.Marker("cistern9", "spawn", "home");
            Assert.That(home, Is.Not.Null, "the home spawn");
            Assert.That(Flat(walk.Walker.transform.position, home.transform.position), Is.LessThan(3f), "set down at home");
            Assert.That(g.World.Quests.ContainsKey("q_ch1_knock"), Is.True, "hatch day's quest");
            var hour = (boot.Stage.Clock.Minutes % 1440) / 60.0;
            Assert.That(hour, Is.InRange(6.9, 7.6), "seven in the morning");
            // Knock's people stand, as Rocketbox people
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && !walk.People.StandingPeople.Any(p => p.Def.Id == "npc_kn_maud")) yield return null;
            var town = walk.People.Town("cistern9");
            Assert.That(town, Is.Not.Null, "Knock stands");
            var maud = walk.People.StandingPeople.FirstOrDefault(p => p.Def.Id == "npc_kn_maud");
            Assert.That(maud, Is.Not.Null, $"Maud is home (standing: {string.Join(", ", walk.People.StandingPeople.Select(p => p.Id))}; Maud as data: {walk.People.Resident("npc_kn_maud")?.Post})");
            var residents = walk.People.ResidentsOf("cistern9");
            Assert.That(residents.Count(r => r.Rb != null), Is.GreaterThanOrEqualTo(residents.Count(r => r.Def.Look == null || (r.Def.Look.Age ?? 35) >= 16) - 2), "the grown are Rocketbox people");
            Assert.That(residents.Where(r => r.Rb != null).Select(r => r.Rb.Id).Distinct().Count(), Is.EqualTo(residents.Count(r => r.Rb != null)), "no two the same person");
            Debug.Log("KnockTests: " + string.Join(", ", residents.Where(r => r.Rb != null).Select(r => $"{r.Id}={r.Rb.Id}")));
            // the square by day, from above the lane
            var square = boot.Stage.Marker("cistern9", "spot", "maud_square").transform.position;
            NavMesh.SamplePosition(square, out var sq, 4f, NavMesh.AllAreas);
            walk.Walker.Agent.Warp(sq.position);
            walk.Rig.Follow(walk.Walker.transform);
            walk.Rig.View(200f, 48f, 16f);
            boot.Stage.Clock.SetHour(9);
            yield return Wait(3f);
            yield return ScreenshotTests.CaptureWithUi("knock_square", 1920, 1080);
            // a conversation from the content: Maud's morning
            var it = maud.GetComponent<Interactable>();
            Assert.That(it, Is.Not.Null);
            walk.StartCoroutine(walk.Respond(it, "talk"));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 20f && (walk.Conversation == null || !walk.Conversation.IsOpen)) yield return null;
            Assert.That(walk.Conversation != null && walk.Conversation.IsOpen, Is.True, "Maud talks");
            yield return Wait(1.5f);
            yield return ScreenshotTests.CaptureWithUi("knock_maud", 1920, 1080);
            yield return Wait(1.2f);
            yield return ScreenshotTests.CaptureWithUi("knock_maud_b", 1920, 1080);   // (her idle in motion: a held pose would show twice)
            walk.Conversation.Close();
            yield return Wait(1f);
            Assert.That(g.Flags.ContainsKey("kn_maud_woke"), Is.True, "her first line's effects ran");
            // a chore's thing: the drop-hatch beside the Cistern's door talks (MOTHER's side of hatch day)
            var hatch = Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).FirstOrDefault(i => i.Id == "hatch");
            Assert.That(hatch, Is.Not.Null, "the hatch can be used");
            Assert.That(walk.LookAt(hatch, SecondFace.Core.Content.Registry.Maps["c9_mouth"]), Is.True, "the hatch talks");
            yield return Wait(1.5f);
            yield return ScreenshotTests.CaptureWithUi("knock_hatch", 1920, 1080);
            walk.Conversation.Close();
            yield return Wait(0.5f);
            // the watch: the clock moves to ten at night, the stranger is placed, the trigger at the apron brings his talk
            SecondFace.Core.World.Logic.Apply(Newtonsoft.Json.Linq.JArray.Parse("[{\"until\": 22}, {\"set\": \"kn_night\"}]"), g);
            boot.Stage.Clock.Minutes = g.Minutes;
            walk.Settle();
            yield return Wait(2f);
            Assert.That((boot.Stage.Clock.Minutes % 1440) / 60.0, Is.InRange(21.9, 22.5), "ten at night");
            var apron = boot.Stage.Marker("cistern9", "spawn", "watch").transform.position;
            NavMesh.SamplePosition(apron, out var ap, 4f, NavMesh.AllAreas);
            walk.Walker.Agent.Warp(ap.position + Vector3.forward * 4f);
            walk.Walker.GoTo(ap.position);
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && (walk.Conversation == null || !walk.Conversation.IsOpen)) yield return null;
            Assert.That(walk.Conversation != null && walk.Conversation.IsOpen, Is.True, "the stranger's conversation opened on the apron");
            var stranger = walk.People.StandingPeople.FirstOrDefault(p => p.Def.Id == "npc_kn_stranger");
            Assert.That(stranger, Is.Not.Null, "the stranger stands");
            var sr = walk.People.ResidentsOf("cistern9").FirstOrDefault(r => r.Def.Id == "npc_kn_stranger");
            Assert.That(sr?.Rb?.Male, Is.True, $"the stranger is a man ({sr?.Rb?.Id})");
            yield return Wait(1.5f);
            yield return ScreenshotTests.CaptureWithUi("knock_night", 1920, 1080);
            walk.Conversation.Close();
            yield return Wait(1f);
            // a fight: the outriders in the square in the morning, and the choice to fight
            boot.Stage.Clock.SetHour(8);
            g.Flags["kn_stranger_dead"] = true;
            g.Flags["kn_outriders"] = true;
            g.Flags["trg.c9_mouth.outriders_seen"] = true;   // (the test starts the fight itself)
            walk.Walker.Agent.Warp(sq.position);
            walk.Settle();
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && !walk.People.StandingPeople.Any(p => p.Def.Id == "npc_kn_out_lead")) yield return null;
            Assert.That(walk.People.StandingPeople.Any(p => p.Def.Id == "npc_kn_out_lead"), Is.True, "the outriders stand in the square");
            g.Flags["kn_out_fight"] = true;
            walk.Settle();
            yield return Wait(1f);
            Assert.That(walk.Combat.Active, Is.True, "the fight began");
            var lead = walk.People.StandingPeople.First(p => p.Def.Id == "npc_kn_out_lead").transform;
            walk.Rig.Follow(lead);
            walk.Rig.View(200f, 45f, 14f);
            yield return Wait(2.5f);
            yield return ScreenshotTests.CaptureWithUi("knock_fight", 1920, 1080);
            // the player fights as the allies' AI would (a fair, unskilled player), beside Corin, until the fight ends
            t0 = Time.realtimeSinceStartup;
            var turns = 0;
            while (Time.realtimeSinceStartup - t0 < 600f && walk.Combat.Active)
            {
                if (walk.Combat.PlayersTurn) { turns++; yield return walk.Combat.PlayerTurnByAi(); }
                if (turns == 2) { yield return ScreenshotTests.CaptureWithUi("knock_fight_turn", 1920, 1080); turns++; }
                yield return null;
            }
            Debug.Log($"KnockTests: the fight {(walk.Combat.Active ? "still on" : "ended")}; dead: {string.Join(",", g.Npcs.Where(n => n.Value.Dead == true).Select(n => n.Key))}; pc hp {g.Pc.Sheet.Hp}");
            Assert.That(walk.Combat.Active, Is.False, "the fight ended");
        }
    }
}
