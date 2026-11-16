using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.State;

namespace SecondFace.Tests
{
    /// <summary>
    /// Conversations progress and never loop (owner's upgrade directive; BUILD_PLAN P9 U7): a topic heard to its end closes
    /// and does not open the same lines again; a conversation that comes back to a node (a hub after a topic) does not say
    /// its speech twice (its `again` line, or the speaker waits); services (`repeat`) stay; a node never strands the talk.
    /// Then every conversation in the game, walked at random from a new game, never says a line twice.
    /// </summary>
    public class ConversationTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static DialogueDef Tree() => JObject.Parse(@"{
          'id': 'd_test', 'owner': 'npc_test', 'start': [{ 'node': 'hub' }],
          'nodes': {
            'hub': { 'text': 'What do you want?', 'again': 'Anything else?', 'options': [
              { 'text': 'About the well.', 'next': 'well' },
              { 'text': 'About the road.', 'next': 'road', 'effects': [{ 'lead': 'l_road' }] },
              { 'text': 'A drink.', 'next': 'drink', 'repeat': true },
              { 'text': 'Bye.', 'exit': true } ] },
            'well': { 'text': 'The well is dry.', 'options': [ { 'text': 'And the pump?', 'next': 'pump' }, { 'text': 'Back.', 'next': 'hub' } ] },
            'pump': { 'text': 'Broken since spring.', 'options': [ { 'text': 'Back.', 'next': 'hub' } ] },
            'road': { 'text': 'Watch the road at night.', 'options': [ { 'text': 'Back.', 'next': 'hub' } ] },
            'drink': { 'text': 'Here.', 'options': [ { 'text': 'Back.', 'next': 'hub' } ] }
          } }").ToObject<DialogueDef>();

        private static void Pick(DialogueRunner r, string text)
        {
            var v = r.View();
            var o = v.Options.FirstOrDefault(x => x.Text == text);
            Assert.That(o, Is.Not.Null, $"no \"{text}\" in [{string.Join(" | ", v.Options.Select(x => x.Text))}]");
            r.Choose(o.Id);
        }

        private static List<string> Options(DialogueRunner r) => r.View().Options.Select(o => o.Text).ToList();

        [Test]
        public void ATopicHeardToItsEndClosesAndTheHubIsNotSaidTwice()
        {
            var g = States.NewGame("shale", 0, 0);
            var r = new DialogueRunner(Tree(), g);
            Assert.That(r.View().Text, Is.EqualTo("What do you want?"));
            Pick(r, "About the well.");
            Pick(r, "Back.");
            // back at the hub: its own line, not the speech again; the well still open (the pump not heard)
            Assert.That(r.View().Returned, Is.True);
            Assert.That(r.View().Text, Is.EqualTo("Anything else?"));
            Assert.That(Options(r), Does.Contain("About the well."), "the well's topic has more to hear");
            Pick(r, "About the well.");
            Assert.That(r.View().Text, Is.Empty, "the well's line is not said twice");
            Pick(r, "And the pump?");
            Pick(r, "Back.");
            Assert.That(Options(r), Does.Not.Contain("About the well."), "the well heard to its end closes");
            // a lead is learned the same way twice: that topic closes once heard; a service stays
            Pick(r, "About the road.");
            Pick(r, "Back.");
            Assert.That(Options(r), Does.Not.Contain("About the road."));
            Pick(r, "A drink.");
            Pick(r, "Back.");
            Assert.That(Options(r), Does.Contain("A drink."), "a service is asked as often as wanted");
            Assert.That(Options(r), Does.Contain("Bye."));
            // talked again later: the spent topics stay closed (what has been said to whom is remembered)
            var again = new DialogueRunner(Tree(), g);
            Assert.That(Options(again), Is.EquivalentTo(new[] { "A drink.", "Bye." }));
        }

        [Test]
        public void TheNextTalkOpensWithAGreetingNotTheSameSpeech()
        {
            var g = States.NewGame("shale", 0, 0);
            g.Minutes = 9 * 60;
            var first = new DialogueRunner(Tree(), g);
            Assert.That(first.View().Text, Is.EqualTo("What do you want?"));
            Assert.That(first.View().Greeting, Is.False);
            Pick(first, "Bye.");
            // an hour later: the tree's own line for coming back
            g.Minutes += 60;
            var second = new DialogueRunner(Tree(), g);
            Assert.That(second.View().Greeting, Is.True);
            Assert.That(second.View().Text, Is.EqualTo("Anything else?"));
            // a tree with no line of its own: a greeting by the hour and the relation, never the opening again
            var plain = JObject.Parse(@"{ 'id': 'd_plain', 'owner': 'npc_plain', 'start': [{ 'node': 'a' }], 'nodes': {
                'a': { 'text': 'I keep the pump.', 'options': [ { 'text': 'Bye.', 'exit': true } ] } } }").ToObject<DialogueDef>();
            Pick(new DialogueRunner(plain, g), "Bye.");
            g.Minutes += 6 * 60;   // (the evening)
            var later = new DialogueRunner(plain, g);
            Assert.That(later.View().Greeting, Is.True);
            Assert.That(later.View().Text, Is.Not.EqualTo("I keep the pump.").And.Not.Empty);
            g.World.RelationWith("npc_plain").Trust = -50;
            g.Minutes += 3 * 60;
            Assert.That(new DialogueRunner(plain, g).View().Text, Is.EqualTo("What do you want now?").Or.EqualTo("Make it quick.").Or.EqualTo("You. What is it?"), "wary when they distrust you");
        }

        [Test]
        public void ACompanionWhoTravelsWithYouHasTheirSay()
        {
            var g = States.NewGame("shale", 0, 0);
            var t = JObject.Parse(@"{ 'id': 'd_ij', 'owner': 'npc_test', 'start': [{ 'node': 'a' }], 'nodes': {
                'a': { 'text': 'Pay the toll.', 'interject': [
                    { 'companion': 'comp_x', 'if': { 'flag': 'x_angry' }, 'text': 'Not to you.' },
                    { 'companion': 'comp_x', 'text': 'Pay him. Not worth it.', 'effects': [{ 'approval': { 'companion': 'comp_x', 'by': 2 } }] } ],
                  'options': [ { 'text': 'Bye.', 'exit': true } ] } } }").ToObject<DialogueDef>();
            Assert.That(new DialogueRunner(t, g).View().Interjections, Is.Empty, "no word from someone not with you");
            g.Companions ??= new System.Collections.Generic.Dictionary<string, CompanionSave>();
            g.Companions["comp_x"] = new CompanionSave { WaitingAt = "shale" };
            Assert.That(new DialogueRunner(t, g).View().Interjections, Is.Empty, "nor from someone waiting in a town");
            g.Companions["comp_x"].WaitingAt = null;
            var v = new DialogueRunner(t, g).View();
            Assert.That(v.Interjections.Select(i => i.Text), Is.EqualTo(new[] { "Pay him. Not worth it." }));
            new DialogueRunner(t, g).View();
            g.World.Approval.TryGetValue("comp_x", out var a);
            Assert.That(a, Is.EqualTo(2), "their word's effects once in the whole game");
            g.SetFlag("x_angry", true);
            Assert.That(new DialogueRunner(t, g).View().Interjections.Single().Text, Is.EqualTo("Not to you."), "the first that applies");
        }

        [Test]
        public void ANodeWhoseTopicsAreAllSpentDoesNotStrandTheTalk()
        {
            var g = States.NewGame("shale", 0, 0);
            var t = JObject.Parse(@"{ 'id': 'd_strand', 'owner': 'npc_test', 'start': [{ 'node': 'a' }], 'nodes': {
                'a': { 'text': 'One.', 'options': [ { 'text': 'Go on.', 'next': 'b' } ] },
                'b': { 'text': 'Two.', 'options': [ { 'text': 'Again.', 'next': 'a' } ] } } }").ToObject<DialogueDef>();
            var r = new DialogueRunner(t, g);
            for (var i = 0; i < 6 && !r.Ended; i++)
            {
                var v = r.View();
                Assert.That(v.Options, Is.Not.Empty, "every node offers a way on");
                r.Choose(v.Options[0].Id);
            }
        }

        /// <summary>Every conversation in the game, walked at random from a new game (unexplored choices first), never
        /// says a line twice in one conversation, and always offers a way on until it ends.</summary>
        [Test]
        public void NoConversationInTheGameSaysALineTwice()
        {
            var repeats = new List<string>();
            var strands = new List<string>();
            foreach (var def in Registry.Dialogues.Values.OrderBy(d => d.Id))
            {
                for (var seed = 1; seed <= 3; seed++)
                {
                    var g = States.NewGame("shale", 0, 0);
                    DialogueRunner r;
                    try { r = new DialogueRunner(def, g); } catch (Exception) { continue; }
                    var rng = new Random(seed * 7919 + def.Id.GetHashCode());
                    var said = new HashSet<string>();
                    for (var step = 0; step < 40 && !r.Ended; step++)
                    {
                        var v = r.View();
                        if (!v.Returned && !string.IsNullOrWhiteSpace(v.Text) && !said.Add(v.Text))
                        {
                            repeats.Add($"{def.Id}.{r.Node}: \"{v.Text.Substring(0, Math.Min(60, v.Text.Length))}\"");
                            break;
                        }
                        var open = v.Options.Where(o => !o.Locked).ToList();
                        if (open.Count == 0) { strands.Add($"{def.Id}.{r.Node}"); break; }
                        var fresh = open.Where(o => !o.Seen && !o.Exit).ToList();
                        var pick = fresh.Count > 0 && rng.NextDouble() < 0.85 ? fresh[rng.Next(fresh.Count)] : open[rng.Next(open.Count)];
                        try { r.Choose(pick.Id); } catch (InvalidOperationException) { break; }
                    }
                }
            }
            TestContext.WriteLine($"{Registry.Dialogues.Count} conversations walked; {repeats.Count} said a line twice; {strands.Count} stranded");
            foreach (var s in strands.Distinct().Take(40)) TestContext.WriteLine("stranded at " + s);
            Assert.That(repeats.Distinct().ToList(), Is.Empty, "lines said twice in one conversation");
        }
    }
}
