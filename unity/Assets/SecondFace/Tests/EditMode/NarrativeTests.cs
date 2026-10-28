using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Quest;
using SecondFace.Core.State;
using SecondFace.Core.World;
using static SecondFace.Core.World.Logic;

namespace SecondFace.Tests
{
    public class NarrativeTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static QuestDef Quest() => JObject.Parse(@"{""id"":""q_test"",""title"":""Test"",""act"":""ch1"",""start"":""find"",""xp"":100,
            ""stages"":{
              ""find"":{""journal"":""Find the key."",""objectives"":[{""id"":""key"",""text"":""Get the key"",""done"":{""item"":""c_splint""}}],""next"":[{""if"":{""item"":""c_splint""},""stage"":""open""}]},
              ""open"":{""journal"":""Open the door."",""next"":[{""if"":{""flag"":""door_open""},""stage"":""won""}]},
              ""won"":{""journal"":""Done."",""end"":""done""}}}").ToObject<QuestDef>(Registry.Strict);

        private static DialogueDef Talk() => JObject.Parse(@"{""id"":""d_test"",""owner"":""npc_a"",
            ""start"":[{""if"":{""flag"":""met""},""node"":""again""},{""node"":""hello""}],
            ""nodes"":{
              ""hello"":{""text"":""Hello, {name}. {They} look tired."",""effects"":[{""set"":""met""}],
                ""passives"":[{""attr"":""senses"",""dc"":1,""text"":""Their hand never leaves the knife.""}],
                ""options"":[
                  {""id"":""ask"",""text"":""Who are you?"",""next"":""hello"",""once"":true,""effects"":[{""learn"":""who_a""}]},
                  {""id"":""persuade"",""text"":""Give me the key."",""check"":{""skill"":""speech"",""dc"":90,""mods"":[{""if"":{""knows"":""who_a""},""dc"":-80,""why"":""you know who they are""}]},""effects"":[{""quest"":""q_test"",""start"":true},{""give"":""c_bandage""}],""next"":""yes"",""fail"":""no""},
                  {""id"":""bye"",""text"":""Bye."",""exit"":true}]},
              ""yes"":{""text"":""Fine. Take it."",""options"":[{""text"":""Thanks."",""exit"":true}]},
              ""no"":{""text"":""No."",""effects"":[{""trust"":{""npc"":""npc_a"",""by"":-10}}],""options"":[{""text"":""Fine."",""exit"":true}]},
              ""again"":{""text"":""You again."",""options"":[{""text"":""Me again."",""exit"":true}]}}}").ToObject<DialogueDef>(Registry.Strict);

        [Test]
        public void ConditionsAndEffectsEvaluateFlagsKnowledgeRelationsAndTimers()
        {
            var g = States.NewGame("x", 0, 0);
            Apply(Fx("[{\"set\":\"a\"},{\"inc\":\"n\",\"by\":2},{\"learn\":\"secret\"},{\"trust\":{\"npc\":\"b\",\"by\":30}},{\"rep\":{\"faction\":\"f\",\"fear\":20}}]"), g);
            Assert.That(Test(J("{\"all\":[{\"flag\":\"a\"},{\"flag\":\"n\",\"gte\":2},{\"knows\":\"secret\"},{\"trust\":{\"npc\":\"b\",\"gte\":30}},{\"rep\":{\"faction\":\"f\",\"fear\":20}}]}"), g), Is.True);
            Assert.That(Test(J("{\"not\":{\"knows\":\"other\"}}"), g), Is.True);
            Apply(Fx("[{\"after\":{\"minutes\":60,\"id\":\"t\",\"effects\":[{\"set\":\"later\"}]}}]"), g);
            Assert.That(RunTimers(g), Is.EqualTo(0));
            g.Minutes += 61;
            Assert.That(RunTimers(g), Is.EqualTo(1));
            Assert.That(g.FlagTruthy("later"), Is.True);
        }

        [Test]
        public void DialogueShowsChecksUpFrontBranchesOnFailureAndRemembers()
        {
            var g = States.NewGame("x", 0, 0);
            g.Pc.Sheet.Name = "Ash"; g.Pc.Pronouns = "she";
            var engine = new QuestEngine(new Dictionary<string, QuestDef> { ["q_test"] = Quest() }, g);
            var talk = Talk();
            var d = new DialogueRunner(talk, g, engine);
            var v = d.View();
            Assert.That(v.Text, Is.EqualTo("Hello, Ash. She look tired."));
            Assert.That(v.Passives[0].Label, Is.EqualTo("SENSES"));
            var p = v.Options.First(o => o.Id == "persuade");
            Assert.That(p.CheckLabel, Is.EqualTo("Speech 90"));
            Assert.That(p.CheckMet, Is.False);
            d.Choose("ask");
            var p2 = d.View().Options.First(o => o.Id == "persuade");
            Assert.That(p2.CheckLabel, Is.EqualTo("Speech 10"));
            Assert.That(p2.CheckNotes[0], Does.Contain("you know who they are"));
            Assert.That(d.View().Options.Any(o => o.Id == "ask"), Is.False);
            Assert.That(d.Choose("persuade"), Is.True);
            Assert.That(g.World.Quests["q_test"].Stage, Is.EqualTo("find"));
            d = new DialogueRunner(talk, g, engine);
            Assert.That(d.View().Text, Is.EqualTo("You again."));
        }

        [Test]
        public void FailureLeadsToItsOwnBranch()
        {
            var g = States.NewGame("x", 0, 0);
            var d = new DialogueRunner(Talk(), g);
            Assert.That(d.Choose("persuade"), Is.False);
            Assert.That(d.View().Text, Is.EqualTo("No."));
            Assert.That(g.World.Relations["npc_a"].Trust, Is.EqualTo(-10));
        }

        [Test]
        public void QuestsAdvanceOnWorldStateByAnyMethodAndGrantXp()
        {
            var g = States.NewGame("x", 0, 0);
            var q = new QuestEngine(new Dictionary<string, QuestDef> { ["q_test"] = Quest() }, g);
            q.QuestStart("q_test");
            Apply(Fx("[{\"give\":\"c_splint\"}]"), g);
            q.Update();
            Assert.That(g.World.Quests["q_test"].Stage, Is.EqualTo("open"));
            var xp = g.Pc.Sheet.Xp;
            g.SetFlag("door_open", true);
            q.Update();
            Assert.That(g.World.Quests["q_test"].Status, Is.EqualTo("done"));
            Assert.That(g.Pc.Sheet.Xp, Is.EqualTo(xp + 100));
            Assert.That(q.Journal()[0].Log, Is.EqualTo(new[] { "Find the key.", "Open the door.", "Done." }));
        }

        [Test]
        public void EveryAuthoredDialogueAndQuestDeserialisesStrictlyAndTheirStartsResolve()
        {
            var db = ContentFixture.Db();
            var dialogues = Registry.Table<DialogueDef>(db, "dialogues", true);
            var quests = Registry.Table<QuestDef>(db, "quests", true);
            Assert.That(dialogues.Count, Is.GreaterThan(300));
            Assert.That(quests.Count, Is.GreaterThan(50));
            foreach (var d in dialogues.Values)
            {
                foreach (var s in d.Start) Assert.That(d.Nodes, Does.ContainKey(s.Node), $"{d.Id} start {s.Node}");
                foreach (var n in d.Nodes.Values) foreach (var o in n.Options)
                {
                    if (o.Next != null) Assert.That(d.Nodes, Does.ContainKey(o.Next), $"{d.Id} next {o.Next}");
                    if (o.Fail != null) Assert.That(d.Nodes, Does.ContainKey(o.Fail), $"{d.Id} fail {o.Fail}");
                }
            }
            foreach (var q in quests.Values)
            {
                Assert.That(q.Stages, Does.ContainKey(q.Start), $"{q.Id} start");
                foreach (var s in q.Stages.Values) if (s.Next != null) foreach (var t in s.Next) Assert.That(q.Stages, Does.ContainKey(t.Stage), $"{q.Id} → {t.Stage}");
            }
        }

        [Test]
        public void EveryAuthoredConversationOpensOnAFreshGame()
        {
            // Every tree renders a first node for a new character without throwing (conditions, effects, text variants).
            var dialogues = Registry.Dialogues;
            int opened = 0;
            foreach (var d in dialogues.Values)
            {
                var g = States.NewGame("cistern9", 1, 1);
                var engine = new QuestEngine(Registry.Quests, g);
                var r = new DialogueRunner(d, g, engine);
                if (r.Ended) continue;
                var v = r.View();
                Assert.That(v.Text, Is.Not.Null, d.Id);
                opened++;
            }
            Assert.That(opened, Is.GreaterThan(250));
        }
    }
}
