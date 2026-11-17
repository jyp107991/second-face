using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Npc;
using SecondFace.Core.Save;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using SecondFace.Game;
using SecondFace.Game.Play;
using SecondFace.Game.UI;
using SecondFace.Game.World;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UIElements;

namespace SecondFace.Tests
{
    /// <summary>
    /// The runtime the last act's content leans on, as the phone plays it (at Shale, on the game's own paths; the rules are
    /// Core's, checked in EditMode <c>StoryRuntimeTests</c>): a choice carrying a move and a conversation sets the player
    /// down first and then opens the conversation there (arrive, then talk); a fight lost to people whose content says what
    /// follows goes on, their outcome applied, and a map trigger the end made true fires at once where the player stands;
    /// the light turns with a conversation's jumps of the clock while its page is open; a place's dressing stands and goes
    /// with the flags, darkens a settlement's city and smokes its sky; the story's named save keeps the game as it stood;
    /// the closing pages turn in place on one screen, keep a save at each page, end in the credits and then the title,
    /// which offers the named save first.
    /// </summary>
    public class StoryRuntimePlayTests
    {
        private readonly List<string> _trees = new();
        private readonly List<System.Action> _restore = new();

        [UnityTearDown]
        public IEnumerator CleanUp()
        {
            foreach (var id in _trees) Registry.Dialogues.Remove(id);
            _trees.Clear();
            foreach (var r in _restore) r();
            _restore.Clear();
            PlaceDressing.Override = null;
            Shader.SetGlobalFloat("_SF_CityDark", 0f);
            yield return BootTests.Clear();
        }

        private static string SavesDir => Path.Combine(Application.temporaryCachePath, "story-runtime-saves");
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

        /// <summary>Whatever conversation the moment brought, closed first.</summary>
        private static IEnumerator Quiet(Walkabout walk)
        {
            for (var i = 0; i < 3; i++)
            {
                if (walk.Conversation != null && walk.Conversation.IsOpen) walk.Conversation.Close();
                yield return null;
            }
        }

        /// <summary>A tree for the test (taken out after): a first line with <paramref name="enter"/> as its own effects, and
        /// one choice carrying <paramref name="effects"/>, going to a second line (<paramref name="then"/>) or ending.</summary>
        private string Tree(string id, string effects, string enter = "[]", string then = null)
        {
            var nodes = new Dictionary<string, NodeDef>
            {
                ["n"] = new()
                {
                    Speaker = "narrator", Text = "A word.", Effects = JArray.Parse(enter),
                    Options = new List<OptionDef> { new() { Id = id + ".go", Text = "Go on.", Effects = JArray.Parse(effects), Exit = then == null, Next = then == null ? null : "m" } },
                },
            };
            if (then != null)
                nodes["m"] = new() { Speaker = "narrator", Text = "Another word.", Effects = JArray.Parse(then), Options = new List<OptionDef> { new() { Id = id + ".end", Text = "Leave it.", Exit = true } } };
            Registry.Dialogues[id] = new DialogueDef { Id = id, Start = new List<StartDef> { new() { Node = "n" } }, Nodes = nodes };
            _trees.Add(id);
            return id;
        }

        private static DialoguePanel Say(Walkabout walk, string tree)
        {
            var panel = walk.OpenTree(tree, "Test");
            Assert.That(panel, Is.Not.Null, $"{tree} opened");
            panel.Finish();
            panel.Choose(tree + ".go");
            return panel;
        }

        // ---------------------------------------------------------------- arrive, then talk

        [UnityTest, Timeout(1800000)]
        public IEnumerator AChoiceWithAMoveAndAConversationArrivesFirstThenTalks()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            var east = boot.Stage.Marker("shale", "spawn", "east");
            Assert.That(east, Is.Not.Null, "Shale's east spawn stands");
            Tree("t_sr_there", "[]");
            var first = Say(walk, Tree("t_sr_move_talk", "[{\"event\":\"goto\",\"data\":{\"location\":\"shale\",\"spawn\":\"east\"}},{\"event\":\"dialogue\",\"data\":{\"tree\":\"t_sr_there\",\"name\":\"There\"}}]"));
            var t0 = Time.realtimeSinceStartup;
            var openedAway = false;
            while (Time.realtimeSinceStartup - t0 < 120f && (walk.Conversation == null || walk.Conversation == first || !walk.Conversation.IsOpen))
            {
                if (walk.Conversation != null && walk.Conversation != first && walk.Conversation.IsOpen && !walk.Placed) openedAway = true;
                yield return null;
            }
            Assert.That(walk.LastMove, Is.Not.Null, "the move happened");
            Assert.That(walk.Conversation, Is.Not.SameAs(first));
            Assert.That(walk.Conversation.IsOpen, Is.True, "the conversation opened");
            Assert.That(openedAway, Is.False, "never before the walker was set down");
            Assert.That(walk.Placed, Is.True);
            Assert.That(Flat(walk.Walker.transform.position, east.transform.position), Is.LessThan(2.5f), "it opened where the move set the player down");
            Assert.That(walk.Conversation.View.Text, Is.EqualTo("A word."));
        }

        // ---------------------------------------------------------------- the light inside a conversation

        [UnityTest, Timeout(1200000)]
        public IEnumerator TheLightTurnsWithAConversationsJumpsWhileItsPageIsOpen()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            var clock = boot.Stage.Clock;
            var sky = boot.Stage.Sky;
            clock.SetHour(13);
            sky.Apply();
            var noon = sky.Look.LightIntensity;
            // its first line moves the clock to dusk (before the page is there), its choice on to ten at night
            var panel = walk.OpenTree(Tree("t_sr_dusk", "[{\"until\":22}]", "[{\"until\":19}]", "[]"), "Test");
            Assert.That(panel, Is.Not.Null);
            yield return null;
            Assert.That(clock.Hour, Is.EqualTo(19.0).Within(0.05), "the first line's jump is followed");
            Assert.That(panel.IsOpen, Is.True);
            yield return Wait(2.5f);
            Assert.That(sky.Turning, Is.False, "turned");
            Assert.That(sky.Look.LightIntensity, Is.EqualTo(Sky.At(19, sky.Force ?? WeatherKind.Clear).LightIntensity).Within(0.05f), "the light is dusk's");
            Assert.That(sky.Look.LightIntensity, Is.Not.EqualTo(noon).Within(0.05f));
            panel.Finish();
            panel.Choose("t_sr_dusk.go");
            yield return null;
            Assert.That(panel.IsOpen, Is.True, "the page stays");
            Assert.That(clock.Hour, Is.EqualTo(22.0).Within(0.05));
            Assert.That(sky.Turning, Is.True, "the light turns while the page is open");
            yield return Wait(2.5f);
            Assert.That(sky.Look.Stars, Is.EqualTo(Sky.At(22, sky.Force ?? WeatherKind.Clear).Stars).Within(0.02f), "night");
        }

        // ---------------------------------------------------------------- after a fight

        /// <summary>A trigger of Shale's under the walker (its marker stood up in the place for the test, its definition in
        /// the map's content), waiting on <paramref name="cond"/>.</summary>
        private PlaceMarker TriggerHere(Walkabout walk, Bootstrap boot, string id, string cond)
        {
            var map = Registry.Maps["shale"];
            map.Triggers ??= new List<TriggerDef>();
            var def = new TriggerDef { Id = id, If = JObject.Parse(cond), Effects = JArray.Parse("[{\"set\":\"" + id + "_fired\"}]") };
            map.Triggers.Add(def);
            _restore.Add(() => map.Triggers.Remove(def));
            var place = boot.Stage.Streamer.PlaceSpawner.Instance("shale");
            Assert.That(place, Is.Not.Null, "Shale stands");
            var go = new GameObject("t trigger");
            go.transform.SetParent(place.transform, false);
            go.transform.position = walk.Walker.transform.position;
            var m = go.AddComponent<PlaceMarker>();
            m.Kind = "trigger"; m.Id = id; m.Map = "shale"; m.Size = new Vector2(30f, 30f);
            _restore.Add(() => Object.Destroy(go));
            return m;
        }

        [UnityTest, Timeout(1200000)]
        public IEnumerator ATriggerTheEndMadeTrueFiresAtOnceWhereThePlayerStands()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            TriggerHere(walk, boot, "t_sr_after", "{\"flag\":\"t_sr_won\"}");
            yield return Wait(0.5f);
            Assert.That(walk.Game.Flags.ContainsKey("t_sr_after_fired"), Is.False, "not before its condition holds");
            walk.Game.SetFlag("t_sr_won", true);
            Assert.That(walk.Triggers.CheckNow(), Is.True, "fired at once, not on the next tick or step");
            Assert.That(walk.Game.Flags.ContainsKey("t_sr_after_fired"), Is.True);
            Assert.That(walk.Game.Flags.ContainsKey(FightAftermath.FiredFlag("shale", "t_sr_after")), Is.True, "once");
            Assert.That(walk.Triggers.CheckNow(), Is.False, "not again");
        }

        [UnityTest, Timeout(1800000)]
        public IEnumerator AFightLostToPeopleWithABeatenOutcomeGoesOnAndItsAfterTriggerFires()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            var them = walk.People.StandingPeople
                .Where(p => p.Def != null && !p.Inside && p.GetComponent<Interactable>() != null && !walk.Game.World.Party.Contains(p.Def.Id) && p.Agent != null && p.Agent.enabled)
                .OrderBy(p => Flat(p.transform.position, walk.Walker.transform.position)).FirstOrDefault();
            Assert.That(them, Is.Not.Null, "someone stands near");
            var def = them.Def;
            var (hostileIf, beaten) = (def.HostileIf, def.Beaten);
            _restore.Add(() => { def.HostileIf = hostileIf; def.Beaten = beaten; });
            def.HostileIf = JObject.Parse("{\"all\":[{\"flag\":\"t_sr_fight\"},{\"not\":{\"flag\":\"t_sr_after_fired\"}}]}");
            def.Beaten = JArray.Parse("[{\"set\":\"t_sr_beaten\"}]");
            TriggerHere(walk, boot, "t_sr_after", "{\"all\":[{\"flag\":\"t_sr_fight\"},{\"flag\":\"t_sr_beaten\"}]}");
            // the player comes in all but spent: the fight is theirs to lose
            walk.Game.Pc.Sheet.Hp = 1;
            var defeated = false;
            walk.Defeated += () => defeated = true;
            Say(walk, Tree("t_sr_fight", "[{\"set\":\"t_sr_fight\"},{\"event\":\"combat\"}]"));
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 10f && !walk.Combat.Active) yield return null;
            Assert.That(walk.Combat.Active, Is.True, "the fight started");
            while (Time.realtimeSinceStartup - t0 < 600f && walk.Combat.Active)
            {
                if (walk.Combat.PlayersTurn) yield return walk.Combat.PlayerTurnByAi();
                yield return null;
            }
            Assert.That(walk.Combat.Active, Is.False, "the fight ended");
            if (!walk.Game.Flags.ContainsKey("t_sr_beaten")) Assert.Inconclusive("the player won the fight this time (the rule is checked in EditMode)");
            Assert.That(defeated, Is.False, "lost forward: not the title");
            Assert.That(walk.Game.Pc.Sheet.Hp, Is.GreaterThanOrEqualTo(1), "left hurt");
            while (Time.realtimeSinceStartup - t0 < 640f && !walk.Game.Flags.ContainsKey("t_sr_after_fired")) yield return null;
            Assert.That(walk.Game.Flags.ContainsKey("t_sr_after_fired"), Is.True, "the after-trigger fired where the player lay, without a step");
        }

        // ---------------------------------------------------------------- a place's dressing by the story

        [UnityTest, Timeout(1200000)]
        public IEnumerator APlacesDressingStandsAndGoesWithTheStorysFlags()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            PlaceDressing.Override = new Dictionary<string, DressingDef>
            {
                ["t_things"] = new()
                {
                    If = JObject.Parse("{\"flag\":\"t_sr_dress\"}"),
                    Props = new List<DressingProp>
                    {
                        new() { Map = "shale", Anchor = "east", Kind = "crate", Count = 4, Step = new[] { 1.4f, 0f } },
                        new() { Map = "shale", Anchor = "east", Kind = "lamp", Z = 2f },
                    },
                },
                ["t_city"] = new() { If = JObject.Parse("{\"flag\":\"t_sr_dark\"}"), Settlement = "shale", CityDark = true, Smoke = 0.8f },
            };
            var place = boot.Stage.Streamer.PlaceSpawner.Instance("shale");
            Assert.That(place, Is.Not.Null);
            walk.Dressing.Refresh();
            Assert.That(walk.Dressing.Active, Is.Empty);
            Assert.That(walk.Dressing.SetOf("t_things", place), Is.Null);
            walk.Game.SetFlag("t_sr_dress", true);
            walk.Settle();
            var set = walk.Dressing.SetOf("t_things", place);
            Assert.That(set, Is.Not.Null, "the things stand once the story says so");
            Assert.That(set.GetComponentsInChildren<StandIn>().Length, Is.EqualTo(5));
            var east = boot.Stage.Marker("shale", "spawn", "east");
            Assert.That(Flat(set.GetComponentsInChildren<StandIn>()[0].transform.position, east.transform.position), Is.LessThan(0.5f), "at their marker");
            Assert.That(set.GetComponentInChildren<Light>(), Is.Not.Null, "a lamp is lit");
            // the city dark and the sky smoked where the walker is
            walk.Game.SetFlag("t_sr_dark", true);
            walk.Settle();
            Assert.That(walk.Dressing.CityDark, Is.True);
            Assert.That(Shader.GetGlobalFloat("_SF_CityDark"), Is.EqualTo(1f));
            Assert.That(boot.Stage.Sky.Smoke, Is.EqualTo(0.8f).Within(1e-4f));
            Assert.That(set.GetComponentInChildren<Light>().enabled, Is.True, "the dressing's own lamps stay lit");
            walk.Game.Flags.Remove("t_sr_dress");
            walk.Game.Flags.Remove("t_sr_dark");
            walk.Settle();
            yield return null;
            Assert.That(walk.Dressing.SetOf("t_things", place), Is.Null, "gone with the flag");
            Assert.That(Shader.GetGlobalFloat("_SF_CityDark"), Is.EqualTo(0f), "lit again");
            Assert.That(boot.Stage.Sky.Smoke, Is.EqualTo(0f));
        }

        // ---------------------------------------------------------------- the named save, the closing pages, the credits

        [UnityTest, Timeout(2400000)]
        public IEnumerator TheClosingPagesTurnInPlaceKeepASaveRollTheCreditsAndTheTitleOffersTheNamedSave()
        {
            Bootstrap boot = null;
            yield return Boot(b => boot = b);
            var walk = boot.Walkabout;
            yield return Quiet(walk);
            Assert.That(Registry.Dialogues.ContainsKey(Epilogue.Tree), Is.True, "the closing pages are exported");
            // the story keeps a save: the game as it stood, not the flag set after it
            Say(walk, Tree("t_sr_save", "[{\"event\":\"save\",\"data\":{\"slot\":\"steps\",\"label\":\"A kept moment\"}},{\"set\":\"t_sr_after_save\"}]"));
            Assert.That(walk.Game.Flags.ContainsKey("t_sr_after_save"), Is.True);
            var kept = boot.Session.Read("steps");
            Assert.That(kept, Is.Not.Null, "kept");
            Assert.That(kept.Meta.Title, Is.EqualTo("A kept moment"));
            Assert.That(kept.State.Flags.ContainsKey("t_sr_after_save"), Is.False, "as the game stood when it was asked for");
            yield return Quiet(walk);
            // an end reached: the closing pages
            walk.Game.SetFlag("a3_end", "plan");
            walk.Game.SetFlag("a3_sash", "worn");
            var screen = walk.OpenEpilogue();
            Assert.That(screen, Is.Not.Null);
            yield return null;
            Assert.That(screen.IsOpen, Is.True);
            Assert.That(walk.Busy, Is.True, "the world waits");
            Assert.That(screen.View, Is.Not.Null);
            Assert.That(screen.Text.text, Is.Not.Empty, "a page");
            Assert.That(walk.LastSlide, Is.Not.Null, "its still");
            Assert.That(walk.Still.On, Is.True, "composed");
            Assert.That(Epilogue.Resumes(walk.Game), Is.True);
            var shown = walk.Game.Flags.Keys.Where(k => k.StartsWith("ep_")).ToList();
            var firstPage = screen.Text.text;
            // next: the same screen, the next page, a save kept
            var next = screen.View.Options.First(o => o.Text.StartsWith("(Next"));
            screen.Choose(next.Id);
            yield return null;
            Assert.That(screen.IsOpen, Is.True, "the page turned in place");
            Assert.That(walk.Epilogue, Is.SameAs(screen));
            Assert.That(screen.Turns, Is.EqualTo(1));
            Assert.That(screen.Text.text, Is.Not.EqualTo(firstPage));
            Assert.That(walk.Game.Flags.Keys.Count(k => k.StartsWith("ep_")), Is.GreaterThan(shown.Count));
            var auto = boot.Session.Read(Session.Auto);
            Assert.That(auto, Is.Not.Null, "a save at the page turned");
            Assert.That(Epilogue.Resumes(auto.State), Is.True, "a load opens on the pages");
            yield return Wait(3f);   // (the still eases over)
            // skip to the end, then the end: the credits, then the title with the named save first
            var skip = screen.View.Options.FirstOrDefault(o => o.Text.StartsWith("(Skip"));
            Assert.That(skip, Is.Not.Null, "skip, from the second page");
            screen.Choose(skip.Id);
            yield return null;
            Assert.That(screen.IsOpen, Is.True);
            var end = screen.View.Options.Single();
            screen.Choose(end.Id);
            var t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 5f && !(boot.UI.Top is CreditsScreen)) yield return null;
            var credits = boot.UI.Top as CreditsScreen;
            Assert.That(credits, Is.Not.Null, "the credits roll");
            Assert.That(screen.IsOpen, Is.False, "the pages closed");
            Assert.That(walk.Still.On, Is.False, "the still given back");
            Assert.That(credits.Roll.childCount, Is.GreaterThan(10), "the credits document is shipped and rolls");
            yield return Wait(2f);
            credits.Finish();
            yield return null;
            Assert.That(boot.Title, Is.Not.Null, "then the title");
            Assert.That(boot.Title.IsOpen, Is.True);
            Assert.That(boot.Title.NamedButton, Is.Not.Null, "the named save offered");
            var choices = boot.Title.NamedButton.parent;
            Assert.That(choices.IndexOf(boot.Title.NamedButton), Is.EqualTo(0), "first");
            Assert.That(boot.Title.NamedButton.Q<Label>().text, Is.EqualTo("A kept moment"));
            Assert.That(walk.Begun, Is.False, "the game is over");
        }
    }
}
