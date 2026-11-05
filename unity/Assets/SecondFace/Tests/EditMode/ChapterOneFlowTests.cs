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
    /// Chapter One after Knock on the game's own engine (P7): the trace in Shale and the paper at the overpass, played
    /// through Core's dialogue and quest engines on the exported content as the web game's tests/ch1.test.ts plays them,
    /// from the outriders' end (the road taken) to the stranger's map in hand.
    /// </summary>
    public class ChapterOneFlowTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static void Talk(string id, GameState g, QuestEngine q, params string[] picks)
        {
            Assert.That(Registry.Dialogues.ContainsKey(id), Is.True, id);
            var r = new DialogueRunner(Registry.Dialogues[id], g, q);
            foreach (var p in picks)
            {
                Assert.That(r.Ended, Is.False, $"{id}: ended before \"{p}\"");
                var v = r.View();
                var o = v.Options.FirstOrDefault(x => x.Text.StartsWith(p, StringComparison.Ordinal));
                Assert.That(o, Is.Not.Null, $"{id}: no option \"{p}\" in [{string.Join(" | ", v.Options.Select(x => x.Text))}]");
                r.Choose(o.Id);
                q.Update();
            }
        }

        private static (GameState g, QuestEngine q) OnTheRoad()
        {
            var g = States.NewGame("cistern9", 9, 20);
            var q = new QuestEngine(Registry.Quests, g);
            q.QuestStart("q_ch1_outriders");
            q.QuestStage("q_ch1_outriders", "leave");
            g.Flags["c9_left"] = true;
            q.Update();
            Assert.That(g.World.Quests["q_ch1_outriders"].Status, Is.EqualTo("done"), "Knock left behind");
            Assert.That(g.World.Quests["q_ch1_shale"].Stage, Is.EqualTo("road"), "the trace begins on the road");
            return (g, q);
        }

        [Test]
        public void TheSheriffSendsYouToTheOverpass()
        {
            var (g, q) = OnTheRoad();
            g.Flags["visited_shale"] = true;
            Talk("d_sh_ada", g, q, "The salt cut.", "Did he say his name?", "Thanks.", "Understood.");
            Assert.That(g.World.Quests["q_ch1_shale"].Stage, Is.EqualTo("overpass"));
            g.Flags["visited_overpass"] = true;
            q.Update();
            Assert.That(g.World.Quests["q_ch1_shale"].Status, Is.EqualTo("done"));
            Assert.That(g.World.Quests["q_ch1_map"].Stage, Is.EqualTo("camp"), "the paper's quest begins at the camp");
        }

        [Test]
        public void KesslerSellsThePaper()
        {
            var (g, q) = OnTheRoad();
            q.QuestStart("q_ch1_map");
            g.Pc.Inventory.Tolls = 100;
            Talk("d_rd_kessler", g, q, "Both. I'm from the salt cut", "Fair. Tell me about the paper.", "Name a price.", "(Pay. 80 Tolls)", "(Put it away.)");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "k_map"), Is.EqualTo(1), "the stranger's map");
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(20));
            Assert.That(g.World.Quests["q_ch1_map"].Status, Is.EqualTo("done"));
        }

        [Test]
        public void WrenStealsItAtNightAndJoins()
        {
            var (g, q) = OnTheRoad();
            q.QuestStart("q_ch1_map");
            g.World.Knowledge.Add("kessler_has_map");
            Talk("d_rd_wren", g, q, "What did he say?", "More.", "The paper. I want it.", "Deal.", "(Nod.)");
            Assert.That(g.Flags.ContainsKey("wren_deal"), Is.True);
            g.Minutes = 23 * 60;
            Talk("d_rd_wren", g, q, "Let's go.");
            Assert.That(g.Flags.ContainsKey("have_map"), Is.True);
            Assert.That(g.World.Party, Does.Contain("npc_rd_03"), "Wren joins");
        }
    }
}
