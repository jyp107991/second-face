using System.Collections;
using System.Linq;
using NUnit.Framework;
using SecondFace.Game;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>
    /// Chapter One after Knock on the phone (P7): from the morning the player may leave, the road to Shale by the map
    /// (the hours pass, the walker set down in the town), Shale reached (its "visited" is what the trace waits for), the
    /// sheriff at her desk and talking; the overpass by the map, the Rust Dogs' camp standing with Kessler in it, and the
    /// stranger's map bought from him ends the paper's quest. Captures ch1_shale, ch1_sheriff, ch1_overpass, ch1_kessler.
    /// </summary>
    public class ChapterOneTests
    {
        /// <summary>The game this test booted, gone after it (left running, its world NavMesh turned every later test's
        /// places' own off: PlacePlayTests failed after it, 2026-11-16).</summary>
        [UnityTearDown]
        public IEnumerator CleanUp() => BootTests.Clear();

        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }

        private static IEnumerator SetDown(Bootstrap boot, string place)
        {
            var t0 = Time.realtimeSinceStartup;
            bool There() => boot.Walkabout != null && boot.Walkabout.Ready && boot.Walkabout.Placed && boot.Stage.World.Layout.Places.TryGetValue(place, out var info)
                            && info.Contains(boot.Walkabout.Walker.transform.position.x, boot.Walkabout.Walker.transform.position.z, 4f);
            while (Time.realtimeSinceStartup - t0 < 300f && !There()) yield return null;
            Assert.That(There(), Is.True, $"set down at {place} ({boot.Walkabout.Line()}, at {boot.Walkabout.Walker?.transform.position})");
            yield return Wait(2f);
            boot.Walkabout.Visit();
            var at = boot.Walkabout.Walker.transform.position;
            var info = boot.Stage.World.Layout.Places.TryGetValue(place, out var pi) ? pi : null;
            Debug.Log($"ChapterOne: set down at {at} in {place} (centre {(info != null ? info.Centre[0] + "," + info.Centre[1] : "-")} size {(info != null ? info.Size[0] + "x" + info.Size[1] : "-")}); in: {string.Join(",", boot.Stage.World.Layout.Places.Values.Where(p => p.Centre != null && p.Contains(at.x, at.z, 4f)).Select(p => p.Id))}; visited: {string.Join(",", boot.Walkabout.Game.Flags.Keys.Where(k => k.StartsWith("visited_")))}");
        }

        /// <summary>Sets out as a player would: whatever conversation the moment brought (a trigger, someone come to say a word)
        /// read to its end first, then the map's trip (on CI's slower frames a trigger's talk was open when the test set out,
        /// the trip was refused as busy, and the walker stayed in Knock, 2026-11-16).</summary>
        private static IEnumerator SetOut(Bootstrap boot, string here, string to)
        {
            var walk = boot.Walkabout;
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f)
            {
                yield return Wait(1f);
                if (walk.Conversation != null && walk.Conversation.IsOpen) { walk.Conversation.Close(); continue; }
                if (!walk.Busy) break;
            }
            Assert.That(walk.Busy, Is.False, "free to set out");
            boot.TravelTo(here, to);
            Assert.That(walk.Game.LocationId, Is.EqualTo(to), $"set out for {to}");
        }

        private static IEnumerator Talk(Walkabout walk, string npc, string capture)
        {
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && !walk.People.StandingPeople.Any(p => p.Def.Id == npc)) yield return null;
            var who = walk.People.StandingPeople.FirstOrDefault(p => p.Def.Id == npc);
            Assert.That(who, Is.Not.Null, $"{npc} stands (standing: {string.Join(", ", walk.People.StandingPeople.Select(p => p.Id))})");
            walk.StartCoroutine(walk.Respond(who.GetComponent<Interactable>(), "talk"));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && (walk.Conversation == null || !walk.Conversation.IsOpen)) yield return null;
            Assert.That(walk.Conversation != null && walk.Conversation.IsOpen, Is.True, $"{npc} talks");
            yield return Wait(1.5f);
            yield return ScreenshotTests.CaptureWithUi(capture, 1920, 1080);
            walk.Conversation.Close();
            yield return Wait(0.5f);
        }

        /// <summary>An arrival as the player sees it (play-ch1 T43): the walker faces where the place's life is, and the
        /// game's own view (not a test's) is captured.</summary>
        private static IEnumerator Arrival(Bootstrap boot, string place, string capture)
        {
            var walk = boot.Walkabout;
            var heart = boot.Stage.Heart(place);
            Assert.That(heart.HasValue, Is.True, $"{place} has people and things to face");
            var to = heart.Value - walk.Walker.transform.position; to.y = 0f;
            var off = Vector3.Angle(walk.Walker.transform.forward, to);
            Assert.That(to.magnitude < 4f || off < 60f, Is.True, $"arriving at {place}, the walker faces the place ({off:0}° off, {to.magnitude:0} m away)");
            yield return Wait(2f);
            yield return ScreenshotTests.CaptureWithUi(capture, 1920, 1080);
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator TheRoadToThePaper()
        {
            Bootstrap boot = null;
            yield return KnockTests.NewGame(b => boot = b);
            var walk = boot.Walkabout;
            var g = walk.Game;
            // the morning Maud lets the player go
            walk.Quests.QuestStart("q_ch1_outriders");
            walk.Quests.QuestStage("q_ch1_outriders", "leave");
            walk.Settle();
            Assert.That(g.Flags.ContainsKey("kn_free_to_leave"), Is.True, "free to leave");
            // the road to Shale
            yield return SetOut(boot, "cistern9", "shale");
            yield return SetDown(boot, "shale");
            g = walk.Game;
            Assert.That(g.Flags.ContainsKey("visited_shale"), Is.True, "Shale reached");
            Assert.That(g.World.Quests.TryGetValue("q_ch1_shale", out var trace) && trace.Status == "active", Is.True, "the trace is on");
            yield return Arrival(boot, "shale", "ch1_shale_arrival");
            boot.Stage.Clock.SetHour(11);
            walk.Rig.Follow(walk.Walker.transform);
            walk.Rig.View(30f, 50f, 22f);
            yield return Wait(3f);
            yield return ScreenshotTests.CaptureWithUi("ch1_shale", 1920, 1080);
            yield return Talk(walk, "npc_sh_01", "ch1_sheriff");
            g.World.Knowledge.Add("ada_saw_stranger");
            walk.Settle();
            Assert.That(g.World.Quests["q_ch1_shale"].Stage, Is.EqualTo("overpass"), "the sheriff's word sends you to the overpass");
            // the overpass
            yield return SetOut(boot, "shale", "rustdogs");
            yield return SetDown(boot, "rustdogs");
            g = walk.Game;
            Assert.That(g.Flags.ContainsKey("visited_overpass"), Is.True, "the overpass reached");
            Assert.That(g.World.Quests["q_ch1_shale"].Status, Is.EqualTo("done"));
            yield return Arrival(boot, "rustdogs", "ch1_overpass_arrival");
            Assert.That(g.World.Quests.TryGetValue("q_ch1_map", out var paper) && paper.Status == "active", Is.True, "the paper's quest");
            boot.Stage.Clock.SetHour(16);
            walk.Rig.Follow(walk.Walker.transform);
            walk.Rig.View(210f, 50f, 24f);
            yield return Wait(3f);
            yield return ScreenshotTests.CaptureWithUi("ch1_overpass", 1920, 1080);
            yield return Talk(walk, "npc_rd_01", "ch1_kessler");
            // bought, as Core's ChapterOneFlowTests plays Kessler's conversation
            g.Flags["have_map"] = true;
            walk.Settle();
            Assert.That(g.World.Quests["q_ch1_map"].Status, Is.EqualTo("done"), "the stranger's map in hand ends the paper's quest");
        }
    }
}
