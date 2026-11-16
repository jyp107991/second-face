using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Game;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.TestTools;

namespace SecondFace.Tests
{
    /// <summary>
    /// The opening played as a player plays it (docs/QA.md pass two, the critical path in the engine): from a new game at
    /// home, the walker goes on foot to each person and thing as the day needs them, every conversation is read through its
    /// panel with the choices a player would tap, the clock moves only by the story (supper, the watch, sleep), the stranger
    /// comes by his trigger on the apron, and the morning after ends with the road out open. What Core's KnockFlowTests
    /// proves on the content, this proves in the game: everyone is where the day says, everything is in reach on the
    /// NavMesh, every trigger fires. Captures kn_play_* at the beats.
    /// </summary>
    public class KnockPlaythroughTests
    {
        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
        private static float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }

        private Bootstrap _boot;
        private Walkabout Walk => _boot.Walkabout;
        private readonly List<string> _route = new();

        /// <summary>Walks to within reach of a place, as a tap on the ground there would (fails if it cannot get there).</summary>
        private IEnumerator WalkTo(Vector3 at, string what, float near = 2.2f)
        {
            Assert.That(NavMesh.SamplePosition(at, out var hit, 4f, NavMesh.AllAreas), Is.True, $"{what} is on the NavMesh ({at})");
            var t0 = Time.realtimeSinceStartup;
            var asked = Walk.Walker.GoTo(hit.position);
            Assert.That(asked, Is.True, $"a path to {what}");
            while (Time.realtimeSinceStartup - t0 < 120f && Flat(Walk.Walker.transform.position, hit.position) > near)
            {
                if (Walk.Walker.Goal == null) Walk.Walker.GoTo(hit.position);
                yield return null;
            }
            var d = Flat(Walk.Walker.transform.position, hit.position);
            _route.Add($"{what} in {Time.realtimeSinceStartup - t0:0} s");
            Assert.That(d, Is.LessThanOrEqualTo(near + 0.5f), $"reached {what} (stopped {d:0.0} m off at {Walk.Walker.transform.position})");
        }

        /// <summary>Reads the open conversation, tapping the choices that begin with each prefix in turn.</summary>
        private IEnumerator Read(string id, params string[] picks)
        {
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 30f && (Walk.Conversation == null || !Walk.Conversation.IsOpen)) yield return null;
            Assert.That(Walk.Conversation != null && Walk.Conversation.IsOpen, Is.True, $"{id} opened");
            var panel = Walk.Conversation;
            foreach (var p in picks)
            {
                yield return Wait(0.3f);
                Assert.That(panel.IsOpen, Is.True, $"{id}: closed before \"{p}\"");
                panel.Finish();
                var v = panel.View;
                var o = v.Options.FirstOrDefault(x => x.Text.StartsWith(p, StringComparison.Ordinal) && !x.Locked);
                Assert.That(o, Is.Not.Null, $"{id}: no choice \"{p}\" in [{string.Join(" | ", v.Options.Select(x => x.Text))}] at \"{v.Text.Substring(0, Math.Min(70, v.Text.Length))}\"");
                panel.Choose(o.Id);
            }
            yield return Wait(0.3f);
            if (panel.IsOpen) panel.Close();
            yield return Wait(0.5f);
            Walk.Settle();
        }

        /// <summary>Goes to a person of the opening and talks (they must be standing where the hour puts them).</summary>
        private IEnumerator Talk(string npc, string dialogue, params string[] picks)
        {
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 60f && !Walk.People.StandingPeople.Any(p => p.Def.Id == npc)) yield return null;
            var who = Walk.People.StandingPeople.FirstOrDefault(p => p.Def.Id == npc);
            Assert.That(who, Is.Not.Null, $"{npc} stands at {(_boot.Stage.Clock.Minutes % 1440) / 60.0:0.0} h (standing: {string.Join(", ", Walk.People.StandingPeople.Select(p => p.Def.Id))})");
            yield return WalkTo(who.transform.position, npc, 2.5f);
            Walk.StartCoroutine(Walk.Respond(who.GetComponent<Interactable>(), "talk"));
            yield return Read(dialogue, picks);
        }

        /// <summary>Goes to a thing of the opening's map and uses it.</summary>
        private IEnumerator Use(string thing, string dialogue, params string[] picks)
        {
            var it = UnityEngine.Object.FindObjectsByType<Interactable>(FindObjectsSortMode.None).FirstOrDefault(i => i.Id == thing);
            Assert.That(it, Is.Not.Null, $"{thing} can be used");
            yield return WalkTo(it.transform.position, thing, 2.5f);
            Assert.That(Walk.LookAt(it, Registry.Maps["c9_mouth"]), Is.True, $"{thing} speaks");
            yield return Read(dialogue, picks);
        }

        private IEnumerator Shot(string name)
        {
            Walk.Rig.Follow(Walk.Walker.transform);
            yield return Wait(1.5f);
            yield return ScreenshotTests.CaptureWithUi(name, 1920, 1080);
        }

        [UnityTest, Timeout(3600000)]
        public IEnumerator TheOpeningPlaysThroughOnFoot()
        {
            yield return KnockTests.NewGame(b => _boot = b);
            var g = Walk.Game;
            Assert.That(g.World.Quests.ContainsKey("q_ch1_knock"), Is.True, "hatch day");
            // hatch day: Maud, the hatch, Maud again
            yield return Talk("npc_kn_maud", "d_kn_maud", "On my way.");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_kn_wool"), Is.EqualTo(1), "the wool");
            yield return Use("hatch", "d_kn_hatch", "(Put the wool", "Two of water and the medicine", "(Step back.)");
            Assert.That(g.Flags.ContainsKey("kn_hatch_traded"), Is.True, "traded at the hatch");
            yield return Shot("kn_play_hatch");
            yield return Talk("npc_kn_maud", "d_kn_maud", "What now?", "Rib, then the windpump.");
            Assert.That(g.World.Quests["q_ch1_knock"].Stage, Is.EqualTo("chores"));
            // the chores: Dace and the Rib, Corin at the windpump
            yield return Talk("npc_kn_dace", "d_kn_dace", "What's the plan?", "Lead on.");
            var rib = Registry.Dialogues["d_kn_rib"].Owner;
            yield return Talk(rib, "d_kn_rib", "Then share it", "(Back off.)");
            Assert.That(g.Flags.ContainsKey("kn_rib_done"), Is.True, "the Rib");
            yield return Talk("npc_kn_corin", "d_kn_corin", "Let me look at it.", "I'm no use with gears");
            Assert.That(g.Flags.ContainsKey("kn_corin_done"), Is.True, "the windpump");
            yield return Shot("kn_play_chores");
            yield return Talk("npc_kn_maud", "d_kn_maud", "I'll find her.");
            Assert.That(g.World.Quests["q_ch1_knock"].Stage, Is.EqualTo("linnet"));
            // Linnet's errand: the buyer on the road
            yield return Talk(Registry.Dialogues["d_kn_buyer"].Owner, "d_kn_buyer", "She made the deal");
            Assert.That(g.World.Quests["q_ch1_knock"].Stage, Is.EqualTo("evening"));
            // supper and the watch: the clock goes to ten at night by the story
            yield return Talk("npc_kn_maud", "d_kn_maud", "(Eat in silence.)", "I'll take the lamp.");
            Assert.That(g.Flags.ContainsKey("kn_night"), Is.True, "the watch");
            Assert.That((_boot.Stage.Clock.Minutes % 1440) / 60.0, Is.InRange(21.9, 22.6), "ten at night");
            // the apron: the stranger's trigger
            var apron = _boot.Stage.Marker("cistern9", "spawn", "watch").transform.position;
            yield return WalkTo(apron, "the watch on the apron", 1.5f);
            yield return Read("d_kn_stranger", "(Go to him.)", "Who are you?", "(Look at the photograph.)", "(Search his pack.)", "(Leave him");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_photo"), Is.EqualTo(1), "the photograph");
            yield return Shot("kn_play_night");
            // to bed: the cot sleeps the night through
            yield return Use("pc_bed", "d_kn_bed", "(Sleep until morning.)");
            Assert.That((_boot.Stage.Clock.Minutes % 1440) / 60.0, Is.InRange(6.9, 7.6), "morning");
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("square"));
            // the riders in the square, the Grille, the hatch, Maud: free to leave
            yield return Talk("npc_kn_out_lead", "d_kn_outriders", "(Hand over the notebook.)", "What due?", "(Go to Maud.)");
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("burned"));
            yield return Shot("kn_play_morning");
            yield return Use("grille", "d_kn_grille", "Pell can save her", "(Leave the Grille.)");
            yield return Use("hatch", "d_kn_hatch", "Please.", "(Leave it.)");
            yield return Talk("npc_kn_maud", "d_kn_maud", "They came for the stranger", "I'll come home.", "I'll write.");
            Assert.That(g.Flags.ContainsKey("kn_free_to_leave"), Is.True, "free to leave");
            // the road out
            var road = _boot.Stage.Marker("cistern9", "spawn", "road").transform.position;
            yield return WalkTo(road, "the road out", 3f);
            yield return Shot("kn_play_road");
            Debug.Log("KnockPlaythrough: " + string.Join("; ", _route) + $"; the clock {(_boot.Stage.Clock.Minutes % 1440) / 60.0:0.0} h day {_boot.Stage.Clock.Day}");
        }
    }
}
