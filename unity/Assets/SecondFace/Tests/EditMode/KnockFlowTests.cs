using System;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
using SecondFace.Core.Quest;
using SecondFace.Core.State;

namespace SecondFace.Tests
{
    /// <summary>
    /// The opening at Knock on the game's own engine (P7, owner's note D): the exported content played through Core's
    /// dialogue and quest engines as the web game's tests/knock.test.ts plays it there, so what the phone runs reaches the
    /// road for any character (the critical path never gated), and the outriders' fight moves the story on.
    /// </summary>
    public class KnockFlowTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        /// <summary>Plays a conversation choosing the options whose text starts with each prefix, in order.</summary>
        private static string Talk(string id, GameState g, QuestEngine q, params string[] picks)
        {
            Assert.That(Registry.Dialogues.ContainsKey(id), Is.True, id);
            var r = new DialogueRunner(Registry.Dialogues[id], g, q);
            var last = "";
            foreach (var p in picks)
            {
                Assert.That(r.Ended, Is.False, $"{id}: ended before \"{p}\"");
                var v = r.View();
                last = v.Text;
                var o = v.Options.FirstOrDefault(x => x.Text.StartsWith(p, StringComparison.Ordinal));
                Assert.That(o, Is.Not.Null, $"{id}: no option \"{p}\" in [{string.Join(" | ", v.Options.Select(x => x.Text))}] at \"{v.Text.Substring(0, Math.Min(60, v.Text.Length))}\"");
                r.Choose(o.Id);
                q.Update();
            }
            return last;
        }

        private static void Kill(GameState g, string id)
        {
            if (!g.Npcs.TryGetValue(id, out var n)) g.Npcs[id] = n = new NpcSave();
            n.Dead = true;
        }

        private static (GameState g, QuestEngine q) Weakling(string origin = null)
        {
            var g = States.NewGame("cistern9", 9, 20);
            foreach (var k in g.Pc.Sheet.BaseAttrs.Keys.ToList()) g.Pc.Sheet.BaseAttrs[k] = 1;
            if (origin != null) g.Origin = origin;
            g.Minutes = 7 * 60;
            var q = new QuestEngine(Registry.Quests, g);
            q.QuestStart("q_ch1_knock");
            return (g, q);
        }

        private static void HatchDay(GameState g, QuestEngine q)
        {
            Talk("d_kn_maud", g, q, "On my way.");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_kn_wool"), Is.EqualTo(1), "the wool");
            Talk("d_kn_hatch", g, q, "(Put the wool", "Two of water and the medicine", "(Step back.)");
            Assert.That(g.Flags.ContainsKey("kn_hatch_traded"), Is.True);
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_kn_cistern_post"), Is.EqualTo(1), "the post");
            Talk("d_kn_maud", g, q, "What now?", "Rib, then the windpump.");
            Assert.That(g.World.Quests["q_ch1_knock"].Stage, Is.EqualTo("chores"));
        }

        private static void Chores(GameState g, QuestEngine q)
        {
            Talk("d_kn_dace", g, q, "What's the plan?", "Lead on.");
            Talk("d_kn_rib", g, q, "Then share it", "(Back off.)");
            Assert.That(g.Flags.ContainsKey("kn_rib_done"), Is.True);
            Talk("d_kn_corin", g, q, "Let me look at it.", "I'm no use with gears");
            Assert.That(g.Flags.ContainsKey("kn_corin_done"), Is.True);
            Talk("d_kn_maud", g, q, "I'll find her.");
            Assert.That(g.World.Quests["q_ch1_knock"].Stage, Is.EqualTo("linnet"));
        }

        [Test]
        public void AnyoneGetsFromHatchDayToTheRoad()
        {
            var (g, q) = Weakling();
            HatchDay(g, q);
            Chores(g, q);
            Talk("d_kn_buyer", g, q, "She made the deal");
            Assert.That(g.World.Quests["q_ch1_knock"].Stage, Is.EqualTo("evening"));
            Talk("d_kn_maud", g, q, "(Eat in silence.)", "I'll take the lamp.");
            Assert.That(g.Flags.ContainsKey("kn_night"), Is.True);
            Assert.That((g.Minutes % 1440) / 60, Is.EqualTo(22), "the watch at ten");
            Talk("d_kn_stranger", g, q, "(Go to him.)", "Who are you?", "(Look at the photograph.)", "(Search his pack.)", "(Leave him");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_photo"), Is.EqualTo(1), "the photograph");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_notebook"), Is.EqualTo(1), "the notebook");
            Talk("d_kn_maud", g, q, "(Sleep until morning.)");
            Assert.That((g.Minutes % 1440) / 60, Is.EqualTo(7), "morning");
            Assert.That(g.World.Quests["q_ch1_knock"].Status, Is.EqualTo("done"));
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("square"));
            Talk("d_kn_outriders", g, q, "(Hand over the notebook.)", "What due?", "(Go to Maud.)");
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("burned"));
            Talk("d_kn_grille", g, q, "Pell can save her", "(Leave the Grille.)");
            Talk("d_kn_hatch", g, q, "Please.", "(Leave it.)");
            Talk("d_kn_maud", g, q, "They came for the stranger", "I'll come home.", "I'll write.");
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("leave"));
            Assert.That(g.Flags.ContainsKey("kn_free_to_leave"), Is.True);
            g.Flags["c9_left"] = true;
            q.Update();
            Assert.That(g.World.Quests["q_ch1_outriders"].Status, Is.EqualTo("done"));
            Assert.That(g.World.Quests.TryGetValue("q_ch1_shale", out var shale) && shale.Status == "active", Is.True, "Chapter One's trace begins");
        }

        [Test]
        public void FightingTheOutridersMovesTheStoryOn()
        {
            var (g, q) = Weakling();
            q.QuestStart("q_ch1_outriders");
            g.Flags["kn_outriders"] = true;
            Talk("d_kn_outriders", g, q, "(Raise your arm to the rise.)", "(Fight.)");
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("fight"));
            Assert.That(g.Flags.ContainsKey("kn_out_fight"), Is.True, "the fight's flag (outriders hostile, Corin an ally)");
            foreach (var id in new[] { "npc_kn_out_lead", "npc_kn_out_a", "npc_kn_out_b" }) Kill(g, id);
            q.Update();
            Assert.That(g.Flags.ContainsKey("kn_posthouse_burned"), Is.True);
            Assert.That(g.World.Quests["q_ch1_outriders"].Stage, Is.EqualTo("burned"));
        }
    }
}
