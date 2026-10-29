using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Quest;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>
    /// The notebook's pages from the game state (P5.3f), on fixture definitions: open quests come first, the pinned one at
    /// the top, with their objectives and newest journal line first; finished ones follow, closed; the tracked quest falls
    /// back to the newest open one; leads and conclusions, the people met, the post and the letters sent, and the
    /// decisions (newest first) are listed with their days.
    /// </summary>
    public class NotebookTests
    {
        private static QuestDef Q(string json) => JObject.Parse(json).ToObject<QuestDef>();

        private static Dictionary<string, QuestDef> Defs() => new()
        {
            ["q_water"] = Q(@"{ ""id"": ""q_water"", ""title"": ""Water rights"", ""start"": ""s1"", ""stages"": {
                ""s1"": { ""journal"": ""The ration is short."", ""objectives"": [ { ""id"": ""ask"", ""text"": ""Ask who weighs it"" }, { ""id"": ""look"", ""text"": ""Look at the scale"", ""optional"": true } ] },
                ""s2"": { ""journal"": ""The scale is filed light."", ""objectives"": [ { ""id"": ""tell"", ""text"": ""Tell someone who cares"" } ] } } }"),
            ["q_debt"] = Q(@"{ ""id"": ""q_debt"", ""title"": ""Old debts"", ""start"": ""s1"", ""stages"": { ""s1"": { ""journal"": ""A debt to settle."" } } }"),
            ["q_fence"] = Q(@"{ ""id"": ""q_fence"", ""title"": ""Mend the fence"", ""start"": ""s1"", ""stages"": { ""s1"": { ""journal"": ""The fence is down."" } } }"),
        };

        [Test]
        public void QuestsOpenFirstPinnedOnTop()
        {
            var g = States.NewGame("shale", 0, 0);
            var q = new QuestEngine(Defs(), g);
            q.QuestStart("q_water");
            g.Minutes += 60;
            q.QuestStart("q_debt");
            g.Minutes += 60;
            q.QuestStart("q_fence");
            q.QuestStage("q_water", "s2");
            q.QuestEnd("q_fence", "done");
            Assert.That(Notebook.Tracked(g), Is.EqualTo("q_debt"), "with nothing pinned, the newest open quest is tracked");
            Notebook.Pin(g, "q_water");
            Assert.That(Notebook.Tracked(g), Is.EqualTo("q_water"));
            var pages = Notebook.Quests(g, Defs());
            Assert.That(pages.Select(p => p.Id), Is.EqualTo(new[] { "q_water", "q_debt", "q_fence" }));
            Assert.That(pages[0].Pinned, Is.True);
            Assert.That(pages[2].Closed, Is.True);
            Assert.That(pages[2].Status, Is.EqualTo("done"));
            Assert.That(pages[0].Items.Select(i => i.Text), Is.EqualTo(new[] { "Tell someone who cares" }), "the current stage's objectives");
            Assert.That(pages[0].Body.First(), Is.EqualTo("The scale is filed light."), "the newest journal line first");
            Notebook.Pin(g, "q_fence");
            Assert.That(Notebook.Tracked(g), Is.EqualTo("q_debt"), "a finished quest is not tracked even if pinned");
        }

        [Test]
        public void LeadsPeopleLettersAndDecisions()
        {
            var g = States.NewGame("shale", 0, 0);
            var leads = new Dictionary<string, LeadDef>
            {
                ["l_scale"] = new() { Id = "l_scale", Label = "The scale", Text = "The scale's pan is filed light." },
                ["l_key"] = new() { Id = "l_key", Text = "Only two people hold the key." },
            };
            var conclusions = new Dictionary<string, ConclusionDef> { ["c_short"] = new() { Id = "c_short", Text = "Someone is shorting the ration.", From = { "l_scale", "l_key" } } };
            g.World.Leads.Add("l_scale");
            g.World.Leads.Add("l_key");
            g.World.Conclusions.Add("c_short");
            var page = Notebook.Leads(g, leads, conclusions);
            Assert.That(page[0].Status, Is.EqualTo("conclusion"), "what the leads add up to comes first");
            Assert.That(page.Select(p => p.Title), Is.EquivalentTo(new[] { "Someone is shorting the ration.", "The scale", "Only two people hold the key." }));

            g.World.MetPeople["npc_a"] = new Met { Name = "Teller Vos", Day = 1, Where = "Shale" };
            g.World.MetPeople["npc_b"] = new Met { Name = "Ash Corran", Day = 3, Where = "the road" };
            var people = Notebook.People(g);
            Assert.That(people.Select(p => p.Title), Is.EqualTo(new[] { "Ash Corran", "Teller Vos" }), "the latest met first");
            Assert.That(people[1].Where, Is.EqualTo("Shale"));
            Assert.That(people[1].Day, Is.EqualTo(1));

            g.World.PostBag.Add(new Post { From = "A friend in Shale", Text = "Come back before the rains.", Day = 4, Read = false });
            g.World.Letters.Add(new SentLetter { Id = "letter_home", To = "Home", Day = 2, Arrives = 5 });
            var letters = Notebook.Letters(g, new Dictionary<string, LetterDef> { ["letter_home"] = new() { Id = "letter_home", To = "Home", Text = "All well. Mostly." } });
            Assert.That(letters[0].Status, Is.EqualTo("received"));
            Assert.That(letters[0].Closed, Is.False, "unread post is open");
            Assert.That(letters[1].Status, Is.EqualTo("sent"));
            Assert.That(letters[1].Body, Is.EqualTo(new[] { "All well. Mostly." }));

            g.World.Decisions.Add(new Decision { Id = "d1", Text = "Paid the toll.", Minutes = Clock.StartMinutes });
            g.World.Decisions.Add(new Decision { Id = "d2", Text = "Kept the key.", Minutes = Clock.StartMinutes + 1440 * 2 });
            var decisions = Notebook.Decisions(g);
            Assert.That(decisions.Select(d => d.Title), Is.EqualTo(new[] { "Kept the key.", "Paid the toll." }));
            Assert.That(decisions[0].Day, Is.EqualTo(3));
        }
    }
}
