using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace SecondFace.Tests
{
    /// <summary>
    /// The content's events as the game answers them, at Shale as the phone plays it: each is fired by a choice in a
    /// conversation opened through the game's own dialogue path (a one-line tree whose choice carries the event, the same
    /// panel and runner the content's conversations use), and its result is asserted: a goto sets the player down at the
    /// map's spawn in the place that holds it (the minutes passed); a title card shows its text and goes; a dialogue opens
    /// the next tree once the first has closed; a reverie turns the picture cold while its memory plays and back after;
    /// combat fights whoever has turned; a fight is with the person talked to; a pit bout ends with both standing and pays
    /// by its terms.
    /// </summary>
    public class ContentEventsTests
    {
        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var id in _trees) Registry.Dialogues.Remove(id);
            _trees.Clear();
            foreach (var (def, cond) in _hostileIf) def.HostileIf = cond;
            _hostileIf.Clear();
            yield return BootTests.Clear();
        }

        private readonly List<string> _trees = new();
        private readonly List<(SecondFace.Core.Npc.NpcDef Def, JObject Cond)> _hostileIf = new();

        private static string SavesDir => Path.Combine(Application.temporaryCachePath, "content-events-saves");

        private static IEnumerator Wait(float seconds) { var t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < seconds) yield return null; }
        private static float Flat(Vector3 a, Vector3 b) { a.y = 0; b.y = 0; return Vector3.Distance(a, b); }

        /// <summary>A new game at Shale, from the title through creation, until the walker stands on the NavMesh.</summary>
        private static IEnumerator Boot(System.Action<Bootstrap> done)
        {
            if (Directory.Exists(SavesDir)) Directory.Delete(SavesDir, true);
            Bootstrap.MakeSession = () => new Session(new DirectoryBackend(SavesDir));
            Walkabout.StartAt = "shale";
            if (Object.FindAnyObjectByType<Bootstrap>() != null) yield return BootTests.Clear();
            SceneManager.LoadScene("Boot");
            yield return null;
            var boot = Object.FindAnyObjectByType<Bootstrap>();
            Assert.That(boot, Is.Not.Null, "the Boot scene's Bootstrap");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 120f && boot.Title == null) yield return null;
            Assert.That(boot.Title, Is.Not.Null, "the title");
            for (var i = 0; i < 2; i++) yield return null;
            BootTests.Press(boot.Title.NewButton);
            var creation = boot.UI.Top as CreationScreen;
            Assert.That(creation, Is.Not.Null, "character creation");
            for (var i = 0; i < 3; i++) yield return null;
            BootTests.Press(creation.Content.Q<Button>("origin-" + Creation.Origins()[0].Id));
            creation.Content.Q<TextField>("name").value = "Ash Corran";
            Assert.That(creation.Finish(), Is.True);
            while (Time.realtimeSinceStartup - t0 < 420f && (boot.Walkabout == null || !boot.Walkabout.Ready || !boot.Walkabout.Placed)) yield return null;
            Assert.That(boot.Walkabout.Ready, Is.True, $"set down ({boot.Walkabout.Line()})");
            done(boot);
        }

        /// <summary>Whatever conversation the moment brought (a trigger, someone come to say a word) closed first.</summary>
        private static IEnumerator Quiet(Walkabout walk)
        {
            for (var i = 0; i < 3; i++)
            {
                if (walk.Conversation != null && walk.Conversation.IsOpen) walk.Conversation.Close();
                yield return null;
            }
        }

        /// <summary>A one-line tree whose one choice carries <paramref name="effects"/> and ends the conversation, put in
        /// the content's registry for the test (taken out after).</summary>
        private string Tree(string id, string line, string effects)
        {
            Registry.Dialogues[id] = new DialogueDef
            {
                Id = id,
                Start = new List<StartDef> { new() { Node = "n" } },
                Nodes = new Dictionary<string, NodeDef>
                {
                    ["n"] = new()
                    {
                        Speaker = "narrator", Text = line,
                        Options = new List<OptionDef> { new() { Id = id + ".go", Text = "Go on.", Effects = JArray.Parse(effects), Exit = true } },
                    },
                },
            };
            _trees.Add(id);
            return id;
        }

        /// <summary>Opens a tree as the game opens a conversation with no face, and takes its one choice.</summary>
        private static DialoguePanel Say(Walkabout walk, string tree)
        {
            var panel = walk.OpenTree(tree, "Test");
            Assert.That(panel, Is.Not.Null, $"{tree} opened");
            Assert.That(panel.IsOpen, Is.True);
            panel.Finish();
            panel.Choose(tree + ".go");
            return panel;
        }

        /// <summary>The townsperson standing nearest the walker (a placed person of the content, not travelling with them).</summary>
        private static Townsperson Nearest(Walkabout walk)
        {
            var at = walk.Walker.transform.position;
            return walk.People.StandingPeople
                .Where(p => p.Def != null && !p.Inside && p.GetComponent<Interactable>() != null && !walk.Game.World.Party.Contains(p.Def.Id) && p.Agent != null && p.Agent.enabled)
                .OrderBy(p => Flat(p.transform.position, at)).FirstOrDefault();
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator MovesTitleCardsNextConversationsAndMemories()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);

            // goto: across Shale to a named spawn, ten minutes on
            var east = boot.Stage.Marker("shale", "spawn", "east");
            Assert.That(east, Is.Not.Null, "Shale's east spawn stands");
            var before = boot.Stage.Clock.Minutes;
            var panel = Say(walk, Tree("t_ev_goto", "Off you go.", "[{\"event\":\"goto\",\"data\":{\"location\":\"shale\",\"spawn\":\"east\",\"minutes\":10}}]"));
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 5f && walk.LastMove == null) yield return null;
            Assert.That(panel.IsOpen, Is.False, "the conversation closed for the move");
            Assert.That(walk.LastMove, Is.Not.Null, "the move began");
            Assert.That(walk.LastMove.Place, Is.EqualTo("shale"));
            Assert.That(walk.LastMove.Via, Is.EqualTo("map"));
            yield return null;
            while (Time.realtimeSinceStartup - t0 < 120f && (!walk.Placed || !walk.Ready)) yield return null;
            Assert.That(walk.Placed && walk.Ready, Is.True, "set down again");
            Assert.That(Flat(walk.Walker.transform.position, east.transform.position), Is.LessThan(2.5f), "at the spawn the move named");
            Assert.That(boot.Stage.Clock.Minutes - before, Is.InRange(10.0, 40.0), "the move's minutes passed");
            Assert.That(walk.Game.LocationId, Is.EqualTo("shale"));
            yield return Quiet(walk);

            // goto: to a map that is another place's own (the overpass is the Rust Dogs' place)
            var far = Say(walk, Tree("t_ev_goto2", "Further.", "[{\"event\":\"goto\",\"data\":{\"location\":\"overpass\",\"spawn\":\"from_shale\"}}]"));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 5f && walk.LastMove.Map.Id != "overpass") yield return null;
            Assert.That(walk.LastMove.Place, Is.EqualTo("rustdogs"));
            yield return null;
            while (Time.realtimeSinceStartup - t0 < 300f && (!walk.Placed || !walk.Ready)) yield return null;
            Assert.That(walk.Placed && walk.Ready, Is.True, "set down at the overpass");
            var spawn = boot.Stage.Marker("rustdogs", "spawn", "from_shale");
            Assert.That(spawn, Is.Not.Null, "the overpass's spawn stands");
            Assert.That(Flat(walk.Walker.transform.position, spawn.transform.position), Is.LessThan(2.5f));
            yield return Wait(1f);
            Assert.That(walk.Game.LocationId, Is.EqualTo("rustdogs"), "the game is where the walker stands");
            yield return Quiet(walk);

            // title: the card shows once the conversation has closed, and goes by itself
            Say(walk, Tree("t_ev_title", "A card.", "[{\"event\":\"title\",\"data\":{\"text\":\"PART T\\nTHE TEST\"}}]"));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 3f && walk.Title == null) yield return null;
            Assert.That(walk.Title, Is.Not.Null, "the title card is up");
            Assert.That(walk.Title.IsOpen, Is.True);
            Assert.That(walk.Title.Text, Is.EqualTo("PART T\nTHE TEST"));
            var card = walk.Title;
            while (Time.realtimeSinceStartup - t0 < Walkabout.TitleSeconds + 4f && card.IsOpen) yield return null;
            Assert.That(card.IsOpen, Is.False, "the card went by itself");

            // dialogue: the next tree opens once the first has closed
            Tree("t_ev_next", "The second word.", "[]");
            var first = Say(walk, Tree("t_ev_dialogue", "The first word.", "[{\"event\":\"dialogue\",\"data\":{\"tree\":\"t_ev_next\",\"name\":\"The gate\"}}]"));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 3f && (walk.Conversation == null || walk.Conversation == first)) yield return null;
            Assert.That(first.IsOpen, Is.False, "the first conversation closed");
            Assert.That(walk.Conversation, Is.Not.SameAs(first));
            Assert.That(walk.Conversation.IsOpen, Is.True, "the next is open");
            Assert.That(walk.Conversation.View.Text, Is.EqualTo("The second word."));
            walk.Conversation.Choose("t_ev_next.go");
            yield return null;
            Assert.That(walk.Conversation.IsOpen, Is.False);

            // reverie: the picture turns cold while the memory plays, and comes back after
            Tree("t_ev_memory", "A summer, long ago.", "[]");
            Say(walk, Tree("t_ev_reverie", "Remember.", "[{\"event\":\"reverie\",\"data\":{\"tree\":\"t_ev_memory\",\"name\":\"A Summer\"}}]"));
            t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 3f && !walk.InReverie) yield return null;
            Assert.That(walk.InReverie, Is.True, "a memory is playing");
            var memory = walk.Conversation;
            Assert.That(memory.IsOpen && memory.Reverie, Is.True, "the memory's page is open, cold");
            Assert.That(memory.View.Text, Is.EqualTo("A summer, long ago."));
            yield return Wait(walk.Reverie.FadeSeconds + 0.5f);
            Assert.That(walk.Reverie.Weight, Is.EqualTo(1f).Within(0.01f), "the picture has gone cold");
            Assert.That(walk.Reverie.Volume.enabled, Is.True);
            memory.Choose("t_ev_memory.go");
            yield return Wait(walk.Reverie.FadeSeconds + 0.5f);
            Assert.That(walk.InReverie, Is.False);
            Assert.That(walk.Reverie.Weight, Is.EqualTo(0f).Within(0.01f), "the picture came back");
        }

        [UnityTest, Timeout(1200000)]
        public IEnumerator TheCombatEventFightsWhoeverHasTurned()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            var them = Nearest(walk);
            Assert.That(them, Is.Not.Null, "someone stands near");
            // they turn once a word sets a flag (the content's hostileIf), and the event takes up the fight
            _hostileIf.Add((them.Def, them.Def.HostileIf));
            them.Def.HostileIf = JObject.Parse("{\"flag\":\"t_ev_turned\"}");
            Say(walk, Tree("t_ev_combat", "That does it.", "[{\"set\":\"t_ev_turned\"},{\"event\":\"combat\"}]"));
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && !walk.Combat.Active) yield return null;
            Assert.That(walk.Combat.Active, Is.True, "the fight started");
            Assert.That(walk.Combat.Enemies, Does.Contain(them.Def.Id), "with whoever turned");
            Assert.That(walk.Combat.Bout, Is.Null, "a real fight");
        }

        [UnityTest, Timeout(1200000)]
        public IEnumerator AFightIsWithThePersonTalkedTo()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            var them = Nearest(walk);
            Assert.That(them, Is.Not.Null, "someone stands near");
            Tree("t_ev_fight", "Step outside.", "[{\"event\":\"fight\"}]");
            Assert.That(walk.OpenConversation(them.GetComponent<Interactable>(), "t_ev_fight"), Is.True, "talking to them");
            walk.Conversation.Finish();
            walk.Conversation.Choose("t_ev_fight.go");
            Assert.That(walk.Game.Npcs.TryGetValue(them.Def.Id, out var save) && save.Hostile == true, Is.True, "they turned on the player");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && !walk.Combat.Active) yield return null;
            Assert.That(walk.Conversation.IsOpen, Is.False, "the conversation closed for it");
            Assert.That(walk.Combat.Active, Is.True, "the fight started");
            Assert.That(walk.Combat.Enemies, Does.Contain(them.Def.Id), "with them");
            Assert.That(walk.Combat.Bout, Is.Null, "a real fight");
        }

        [UnityTest, Timeout(1200000)]
        public IEnumerator APitBoutEndsWithBothStandingAndPaysByItsTerms()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            var them = Nearest(walk);
            Assert.That(them, Is.Not.Null, "someone stands near");
            var id = them.Def.Id;
            // (a short bout: they come in nearly spent)
            if (!walk.Game.Npcs.TryGetValue(id, out var save)) walk.Game.Npcs[id] = save = new NpcSave();
            save.Hp = 2;
            Tree("t_ev_pit", "Fists only.", "[{\"event\":\"fight\",\"data\":{\"pit\":{\"win\":[{\"set\":\"t_ev_pit_won\"}],\"lose\":[{\"set\":\"t_ev_pit_lost\"}]}}}]");
            Assert.That(walk.OpenConversation(them.GetComponent<Interactable>(), "t_ev_pit"), Is.True, "talking to them");
            walk.Conversation.Finish();
            walk.Conversation.Choose("t_ev_pit.go");
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && !walk.Combat.Active) yield return null;
            Assert.That(walk.Combat.Active, Is.True, "the bout started");
            Assert.That(walk.Combat.Bout, Is.Not.Null, "a pit bout");
            Assert.That(walk.Combat.Enemies, Is.EqualTo(new[] { id }), "the two of them alone");
            Assert.That(walk.Combat.Allies, Is.EqualTo(new[] { "pc" }));
            Assert.That(save.Hostile, Is.Not.True, "a bout does not make an enemy");
            var defeated = false;
            walk.Defeated += () => defeated = true;
            while (Time.realtimeSinceStartup - t0 < 600f && walk.Combat.Active)
            {
                if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi();
                yield return null;
            }
            Assert.That(walk.Combat.Active, Is.False, "the bout ended");
            while (Time.realtimeSinceStartup - t0 < 620f && walk.Combat.HudUp) yield return null;
            Assert.That(new[] { "won", "lost", "called" }, Does.Contain(walk.Combat.LastBout), "the bout came to an end of its own");
            Assert.That(defeated, Is.False, "a bout lost is not the game lost");
            Assert.That(walk.Begun && walk.Walker != null, Is.True, "the game goes on");
            Assert.That(walk.Game.Npcs[id].Dead, Is.Not.True, "nobody dies in the pit");
            Assert.That(walk.Game.Npcs[id].Hp, Is.GreaterThanOrEqualTo(1), "they are back on their feet");
            Assert.That(walk.Game.Pc.Sheet.Hp, Is.GreaterThanOrEqualTo(1), "so is the player");
            if (walk.Combat.LastBout == "won") Assert.That(walk.Game.Flags.ContainsKey("t_ev_pit_won") && !walk.Game.Flags.ContainsKey("t_ev_pit_lost"), Is.True, "a win pays the win's terms");
            if (walk.Combat.LastBout == "lost") Assert.That(walk.Game.Flags.ContainsKey("t_ev_pit_lost") && !walk.Game.Flags.ContainsKey("t_ev_pit_won"), Is.True, "a loss pays the loss's");
            Debug.Log($"ContentEventsTests: the bout ended {walk.Combat.LastBout}; them {walk.Game.Npcs[id].Hp} hp, the player {walk.Game.Pc.Sheet.Hp}");
        }
    }
}
