using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Npc;
using SecondFace.Core.Save;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>
    /// The runtime rules the last act's content leans on (Core; Game <c>Walkabout</c>, <c>Combat</c>, <c>Triggers</c>,
    /// <c>PlaceDressing</c>, <c>EpilogueScreen</c> act on them), checked on the exported content: a fight's end writes the
    /// fallen under their placements and a lost fight's distinct <c>beaten</c> outcomes, so the map's triggers the end made
    /// true are due at once; the story's named save holds the game as it stood when it was asked for; the light turns over
    /// a jump of the clock and under smoke; a place's dressing stands on flags the story writes, at markers its maps have;
    /// the closing pages name real stills, turn in place to the credits and resume; the credits roll from the shipped
    /// document.
    /// </summary>
    public class StoryRuntimeTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static GameState NewGame() => States.NewGame("shale", 0, 0);
        private static List<string> Due(string map, GameState g) => FightAftermath.Due(Registry.Maps[map], g).Select(t => t.Id).ToList();
        private static bool Holds(string cond, GameState g) => Logic.Test(JObject.Parse(cond), g);
        /// <summary>A token and everything under it.</summary>
        private static IEnumerable<JToken> All(JToken t) => t is JContainer c ? c.DescendantsAndSelf() : t != null ? new[] { t } : Enumerable.Empty<JToken>();

        /// <summary>A host that keeps the events the content fires, and what the game held at each.</summary>
        private sealed class Recorder : LogicHost
        {
            private readonly GameState _g;
            public readonly List<(string Name, JToken Data, string State)> Events = new();
            public Recorder(GameState g) { _g = g; }
            public override void Event(string name, JToken data) => Events.Add((name, data, Newtonsoft.Json.JsonConvert.SerializeObject(_g)));
        }

        // ---------------------------------------------------------------- after a fight

        [Test]
        public void ALostFightAppliesEachDistinctBeatenOutcomeOnceAndItsAfterTriggerIsDue()
        {
            var wardens = new[] { "npc_a3_g19", "npc_a3_g20", "npc_a3_g21", "npc_a3_g22" };
            foreach (var id in wardens) Assert.That(Registry.Npcs.ContainsKey(id), Is.True, id);
            var outcomes = FightAftermath.Beaten(wardens.Select(id => Registry.Npcs[id]));
            Assert.That(outcomes.Count, Is.EqualTo(1), "four wardens carrying the same outcome: it applies once");
            var g = NewGame();
            g.SetFlag("a3_vault_fight", true);
            Assert.That(Due("md_vault", g), Does.Not.Contain("a3_vault_after"), "not while the fight is on");
            foreach (var e in outcomes) Logic.Apply(e, g);
            Assert.That(Due("md_vault", g), Does.Contain("a3_vault_after"), "lost forward: the after-trigger is due at once");
            // nobody's content says what follows: no outcome (a lost fight ends the game)
            Assert.That(FightAftermath.Beaten(new[] { new NpcDef { Id = "t_nobody" }, null }), Is.Empty);
            Assert.That(FightAftermath.Beaten(null), Is.Empty);
            // two different outcomes both apply, in order
            var a = new NpcDef { Id = "t_a", Beaten = JArray.Parse("[{\"set\":\"t_a\"}]") };
            var b = new NpcDef { Id = "t_b", Beaten = JArray.Parse("[{\"set\":\"t_b\"}]") };
            Assert.That(FightAftermath.Beaten(new[] { a, b, a }).Count, Is.EqualTo(2));
            Assert.That(FightAftermath.HurtHp(40), Is.EqualTo(10));
            Assert.That(FightAftermath.HurtHp(3), Is.EqualTo(1), "never down to nothing");
            // every outcome in the content is a list of effects the game can apply
            foreach (var d in Registry.Npcs.Values.Where(n => n.Beaten != null))
            {
                Assert.That(d.Beaten.Count, Is.GreaterThan(0), d.Id);
                Assert.DoesNotThrow(() => Logic.Apply(d.Beaten, NewGame()), d.Id);
            }
        }

        [Test]
        public void AFallenFighterIsDeadUnderTheirPlacementSoTheAfterTriggersAreDue()
        {
            var g = NewGame();
            g.SetFlag("a3_crates_fight", true);
            Assert.That(Due("md_spire", g), Does.Not.Contain("a3_crates_after"));
            FightAftermath.Fell(g, "npc_a3_u2", "npc_a3_u2_crates");
            Assert.That(Holds("{\"dead\":\"npc_a3_u2_crates\"}", g), Is.True, "dead under the placement the content names");
            Assert.That(Holds("{\"dead\":\"npc_a3_u2\"}", g), Is.True, "and under their definition (the game's other reads)");
            Assert.That(Due("md_spire", g), Does.Contain("a3_crates_after"), "due at once where the player stands");
            var t = Registry.Maps["md_spire"].Triggers.Find(x => x.Id == "a3_crates_after");
            FightAftermath.Mark("md_spire", t, g);
            Assert.That(Due("md_spire", g), Does.Not.Contain("a3_crates_after"), "fired once");
            // the other fights on the close: all of them down, or their beaten outcome
            var sky = NewGame();
            sky.SetFlag("a3_sky_fight", true);
            foreach (var id in new[] { "npc_a3_g23", "npc_a3_g24", "npc_a3_g25" }) FightAftermath.Fell(sky, id, id);
            Assert.That(Due("md_spire", sky), Does.Contain("a3_sky_after"));
            var lost = NewGame();
            lost.SetFlag("a3_sky_fight", true);
            foreach (var e in FightAftermath.Beaten(new[] { Registry.Npcs["npc_a3_g23"] })) Logic.Apply(e, lost);
            Assert.That(Due("md_spire", lost), Does.Contain("a3_sky_after"));
            var steps = NewGame();
            steps.SetFlag("a3_blade_fight", true);
            FightAftermath.Fell(steps, "npc_a3_u2", "npc_a3_u2_steps");
            Assert.That(Due("md_spire", steps), Does.Contain("a3_blade_after"));
        }

        [Test]
        public void EveryDeathTheMapsTriggersWaitOnNamesSomeoneTheGameCanKill()
        {
            // a trigger waiting on `dead: X` fires only if X is a person's definition or a placement's id (the fallen are
            // written under both)
            var placements = new HashSet<string>(Registry.Maps.Values.SelectMany(m => m.Npcs ?? new List<NpcPlacement>()).Select(p => p.Id ?? p.Def));
            var bad = new List<string>();
            var n = 0;
            foreach (var map in Registry.Maps.Values)
                foreach (var t in map.Triggers ?? new List<TriggerDef>())
                    foreach (var dead in All(t.If).OfType<JProperty>().Where(p => p.Name == "dead"))
                    {
                        n++;
                        var id = (string)dead.Value;
                        if (!Registry.Npcs.ContainsKey(id) && !placements.Contains(id)) bad.Add($"{map.Id}.{t.Id}: {id}");
                    }
            Assert.That(n, Is.GreaterThan(3), "the triggers that wait on a fight were found");
            Assert.That(bad, Is.Empty, string.Join("\n", bad));
        }

        // ---------------------------------------------------------------- the story's named save

        [Test]
        public void TheStorysSaveHoldsTheGameAsItStoodWhenAskedAndIsOfferedFirst()
        {
            // every save event of the content names a slot the game keeps, under a name
            var db = ContentFixture.Db();
            var saves = All(db.Table("dialogues")).OfType<JObject>().Where(o => (string)o["event"] == "save").ToList();
            Assert.That(saves, Is.Not.Empty, "the content keeps a save");
            foreach (var e in saves)
            {
                var named = NamedSave.From(e["data"]);
                Assert.That(named, Is.Not.Null, $"a slot the game keeps: {e}");
                Assert.That(named.Label, Is.Not.Empty);
            }
            Assert.That(NamedSave.From(JObject.Parse("{\"slot\":\"auto\"}")), Is.Null, "never a slot written by hand or by the game");
            Assert.That(NamedSave.From(null), Is.Null);
            // the choice that asks for it: what it holds is the game before the effects listed after the save
            var option = All(db.Table("dialogues")).OfType<JObject>()
                .First(o => o["effects"] is JArray fx && fx.OfType<JObject>().Any(x => (string)x["event"] == "save"));
            var effects = (JArray)option["effects"];
            var g = NewGame();
            var rec = new Recorder(g);
            Logic.Apply(effects, g, rec);
            var at = rec.Events.First(x => x.Name == "save");
            var kept = JObject.Parse(at.State);
            var later = effects.SkipWhile(x => (string)x["event"] != "save").OfType<JObject>().Where(x => x["set"] != null).Select(x => (string)x["set"]).ToList();
            Assert.That(later, Is.Not.Empty, "the choice changes the game after it saves");
            foreach (var flag in later)
            {
                Assert.That(g.Flags.ContainsKey(flag), Is.True, flag);
                Assert.That(kept["Flags"]?[flag], Is.Null, $"{flag} is not in the kept save");
            }
            // kept beside the others, listed first to load, never offered to save over by hand
            var m = new SaveManager(new MemoryBackend());
            m.Write("auto", new SaveMeta { Label = "A" }, NewGame()).GetAwaiter().GetResult();
            System.Threading.Thread.Sleep(5);
            m.Write("steps", new SaveMeta { Label = "A", Title = (string)saves[0]["data"]["label"] }, NewGame()).GetAwaiter().GetResult();
            System.Threading.Thread.Sleep(5);
            m.Write("slot2", new SaveMeta { Label = "A" }, NewGame()).GetAwaiter().GetResult();
            var filled = m.List().GetAwaiter().GetResult();
            Assert.That(filled.ContainsKey("steps"), Is.True);
            Assert.That(filled["steps"].Title, Is.EqualTo((string)saves[0]["data"]["label"]), "under the content's name");
            Assert.That(SaveManager.LoadOrder(filled), Is.EqualTo(new[] { "steps", "auto", "slot2" }));
            Assert.That(m.Latest().GetAwaiter().GetResult().Slot, Is.EqualTo("slot2"), "continue is still the newest");
            Assert.That(SaveManager.IsNamed("steps") && !SaveManager.IsNamed("slot1"), Is.True);
        }

        // ---------------------------------------------------------------- the light

        [Test]
        public void TheLightTurnsOverAJumpOfTheClockAndDarkensUnderSmoke()
        {
            Assert.That(SkyTurn.Seconds(600, 600.5), Is.EqualTo(0f), "under a minute: no turn");
            Assert.That(SkyTurn.Seconds(600, 660), Is.InRange(0.9f, 1.1f), "an hour: about a second");
            Assert.That(SkyTurn.Seconds(1200, 2700), Is.EqualTo(2f), "a night: two");
            Assert.That(SkyTurn.Seconds(660, 600), Is.EqualTo(SkyTurn.Seconds(600, 660)));
            var dusk = Sky.At(18.6, WeatherKind.Clear);
            var night = Sky.At(22, WeatherKind.Clear);
            var start = SkyTurn.Blend(dusk, night, 0f);
            var end = SkyTurn.Blend(dusk, night, 1f);
            var mid = SkyTurn.Blend(dusk, night, 0.5f);
            Assert.That(start.LightIntensity, Is.EqualTo(dusk.LightIntensity).Within(1e-4f));
            Assert.That(end.LightIntensity, Is.EqualTo(night.LightIntensity).Within(1e-4f));
            Assert.That(mid.LightIntensity, Is.InRange(Math.Min(dusk.LightIntensity, night.LightIntensity), Math.Max(dusk.LightIntensity, night.LightIntensity)));
            Assert.That(end.SunY, Is.EqualTo(night.SunY).Within(1e-3f), "the sun turned with it");
            Assert.That(Math.Sqrt(mid.SunX * mid.SunX + mid.SunY * mid.SunY + mid.SunZ * mid.SunZ), Is.EqualTo(1.0).Within(1e-3));
            // the named lights of a still
            Assert.That(SkyTurn.HourOf("dawn"), Is.LessThan(SkyTurn.HourOf("day")));
            Assert.That(SkyTurn.HourOf("dusk"), Is.LessThan(SkyTurn.HourOf("night")));
            Assert.That(SkyTurn.HourOf("noonish"), Is.Null);
            Assert.That(SkyTurn.WeatherOf("dust"), Is.EqualTo(WeatherKind.Dust));
            Assert.That(SkyTurn.WeatherOf("ash"), Is.Null);
            // smoke: nothing at 0; dimmer, browner, thicker air, no stars at 1
            var day = Sky.At(13, WeatherKind.Clear);
            var none = SkyTurn.Smoke(day, 0f);
            Assert.That(none.LightIntensity, Is.EqualTo(day.LightIntensity));
            Assert.That(none.Fog.MaxDiff(day.Fog), Is.LessThan(1e-5f));
            var smoke = SkyTurn.Smoke(day, 1f);
            Assert.That(smoke.LightIntensity, Is.LessThan(day.LightIntensity * 0.7f));
            Assert.That(smoke.FogDensity, Is.GreaterThan(day.FogDensity * 2f));
            Assert.That(smoke.Fog.R, Is.GreaterThan(smoke.Fog.B), "the air goes brown");
            Assert.That(SkyTurn.Smoke(Sky.At(23, WeatherKind.Clear), 1f).Stars, Is.EqualTo(0f));
            Assert.That(day.LightIntensity, Is.EqualTo(Sky.At(13, WeatherKind.Clear).LightIntensity), "the look given is not changed");
        }

        // ---------------------------------------------------------------- a place's dressing by the story

        /// <summary>The flags the content writes anywhere (an effect's <c>set</c>).</summary>
        private static HashSet<string> Written()
        {
            var db = ContentFixture.Db();
            var set = new HashSet<string>();
            foreach (var table in new[] { "dialogues", "quests", "maps", "npcs", "world_events", "road_encounters", "letters" })
                foreach (var o in All(db.Table(table)).OfType<JObject>())
                    if (o["set"] is JValue v && v.Type == JTokenType.String) set.Add((string)v);
            return set;
        }

        private static IEnumerable<string> FlagsOf(JToken cond) =>
            All(cond).OfType<JProperty>().Where(p => p.Name == "flag").Select(p => (string)p.Value);

        [Test]
        public void TheDressingStandsOnFlagsTheStoryWritesAtMarkersItsMapsHave()
        {
            var groups = Registry.Dressing;
            Assert.That(groups.Count, Is.GreaterThanOrEqualTo(5), "the dressing registry is shipped and loaded");
            var written = Written();
            var bad = new List<string>();
            foreach (var (id, d) in groups)
            {
                Assert.That(d.If, Is.Not.Null, $"{id}: stands only on the story's word");
                foreach (var flag in FlagsOf(d.If)) if (!written.Contains(flag)) bad.Add($"{id}: {flag} is never written by the content");
                Assert.That((d.Props?.Count ?? 0) > 0 || d.CityDark == true || (d.Smoke ?? 0) > 0, Is.True, $"{id}: does something");
                if (d.CityDark == true || d.Smoke != null) Assert.That(d.Settlement, Is.Not.Empty, $"{id}: over a settlement");
                foreach (var p in d.Props ?? new List<DressingProp>())
                {
                    if (!Dressing.Kinds.Contains(p.Kind)) bad.Add($"{id}: no stand-in for {p.Kind}");
                    if (!Registry.Maps.TryGetValue(p.Map ?? "", out var map)) { bad.Add($"{id}: no map {p.Map}"); continue; }
                    var anchors = new HashSet<string>();
                    foreach (var k in map.Spots?.Keys ?? Enumerable.Empty<string>()) anchors.Add(k);
                    foreach (var s in map.Spawns ?? new List<SpawnDef>()) anchors.Add(s.Id);
                    foreach (var k in map.Talk?.Keys ?? Enumerable.Empty<string>()) anchors.Add(k);
                    foreach (var k in map.Containers?.Keys ?? Enumerable.Empty<string>()) anchors.Add(k);
                    foreach (var t in map.Triggers ?? new List<TriggerDef>()) anchors.Add(t.Id);
                    if (!anchors.Contains(p.Anchor)) bad.Add($"{id}: {p.Map} has no marker {p.Anchor}");
                }
            }
            Assert.That(bad, Is.Empty, string.Join("\n", bad));
            // nothing stands in a game begun; each group on its own flags
            var g = NewGame();
            Assert.That(Dressing.Active(groups, g), Is.Empty, "a game begun is dressed as the places are built");
            foreach (var (id, d) in groups)
            {
                var only = new Dictionary<string, DressingDef> { [id] = d };
                var h = NewGame();
                foreach (var c in All(d.If).OfType<JObject>().Where(o => o["flag"] != null))
                    h.SetFlag((string)c["flag"], c["eq"] is JValue eq ? eq.Value : true);
                Assert.That(Dressing.Active(only, h), Is.EqualTo(new[] { id }), $"{id} stands on its flags");
                var (dark, smoke) = Dressing.Over(only, new[] { id }, d.Settlement);
                Assert.That(dark, Is.EqualTo(d.CityDark == true), id);
                Assert.That(smoke, Is.EqualTo(d.Smoke ?? 0f), id);
                Assert.That(Dressing.Over(only, new[] { id }, "t_elsewhere"), Is.EqualTo((false, 0f)), "only over its own settlement");
            }
            // a row of things
            var row = Dressing.Layout(new DressingProp { X = 1, Z = 2, Yaw = 30, Count = 3, Step = new[] { 2f, 0.5f } });
            Assert.That(row, Is.EqualTo(new[] { (1f, 2f, 30f), (3f, 2.5f, 30f), (5f, 3f, 30f) }));
            Assert.That(Dressing.Layout(new DressingProp()).Count, Is.EqualTo(1));
        }

        // ---------------------------------------------------------------- the closing pages and the credits

        [Test]
        public void TheClosingPagesNameRealStillsAndEveryWayOnTurnsInPlaceOrRollsTheCredits()
        {
            Assert.That(Registry.Dialogues.TryGetValue(Epilogue.Tree, out var tree), Is.True, "the closing pages are exported");
            var bad = new List<string>();
            var slides = 0;
            foreach (var (id, node) in tree.Nodes)
            {
                foreach (var e in (node.Effects ?? new JArray()).OfType<JObject>().Where(x => (string)x["event"] == "slide"))
                {
                    slides++;
                    var s = SlideData.From(e["data"]);
                    if (s == null) { bad.Add($"{id}: a still with no place"); continue; }
                    if (!Registry.Maps.TryGetValue(s.Place, out var map)) { bad.Add($"{id}: no map {s.Place}"); continue; }
                    var spots = new HashSet<string>(map.Spots?.Keys ?? Enumerable.Empty<string>());
                    foreach (var sp in map.Spawns ?? new List<SpawnDef>()) spots.Add(sp.Id);
                    foreach (var k in map.Talk?.Keys ?? Enumerable.Empty<string>()) spots.Add(k);
                    if (!spots.Contains(s.Spot)) bad.Add($"{id}: {s.Place} has no spot {s.Spot}");
                    if (s.Light != null && s.Hour == null) bad.Add($"{id}: no hour for the light {s.Light}");
                    if (s.Weather != null && SkyTurn.WeatherOf(s.Weather) == null) bad.Add($"{id}: no weather {s.Weather}");
                    foreach (var (npc, _) in s.People) if (!Registry.Npcs.ContainsKey(npc)) bad.Add($"{id}: no person {npc}");
                    if (s.PcWith != null && !Registry.Npcs.ContainsKey(s.PcWith)) bad.Add($"{id}: no person {s.PcWith}");
                }
                foreach (var o in node.Options)
                    if (o.Exit != true || !(Epilogue.Reopens(o.Effects, Epilogue.Tree) || Epilogue.RollsCredits(o.Effects) || id == "unended"))
                        bad.Add($"{id}: '{o.Text}' neither turns the page nor rolls the credits");
            }
            Assert.That(slides, Is.GreaterThan(20), "a still for every page");
            Assert.That(bad, Is.Empty, string.Join("\n", bad));
        }

        [Test]
        public void TheClosingPagesPlayPageByPageToTheCreditsAndAnInterruptedOneResumes()
        {
            var tree = Registry.Dialogues[Epilogue.Tree];
            var g = NewGame();
            Assert.That(new DialogueRunner(tree, g).Node, Is.EqualTo("unended"), "not before an end");
            g.SetFlag("a3_end", "plan");
            g.SetFlag("a3_sash", "worn");
            g.Flags[Epilogue.OpenFlag] = true;   // (the game marks it as the pages open)
            var rec = new Recorder(g);
            var pages = new List<string>();
            var rolled = false;
            string resumes = null;
            for (var i = 0; i < 60 && !rolled; i++)
            {
                // each page a runner on the tree as the game stands: its start list routes to the page due
                var r = new DialogueRunner(tree, g, new HostOf(rec));
                Assert.That(r.Ended, Is.False);
                if (resumes != null) Assert.That(r.Node, Is.EqualTo(resumes), "a load at the page turned opens on the page that follows");
                pages.Add(r.Node);
                var view = r.View();
                var next = view.Options.FirstOrDefault(o => !o.Locked && o.Text.StartsWith("(Next", StringComparison.Ordinal));
                var way = next ?? view.Options.First(o => !o.Locked);
                var before = rec.Events.Count;
                r.Choose(way.Id);
                Assert.That(r.Ended, Is.True, "every way on ends the runner: the page turns by opening the tree again");
                rolled = rec.Events.Skip(before).Any(x => x.Name == "credits");
                if (rolled) break;
                Assert.That(rec.Events.Skip(before).Any(x => x.Name == "dialogue" && (string)x.Data?["tree"] == Epilogue.Tree), Is.True, $"{pages.Last()}: turns in place");
                // the game keeps a save at each page turned: loaded, it is still in its closing pages, at the next one
                var loaded = SaveManager.Parse(SaveManager.Serialise(new SaveFile { Version = Migrations.CurrentVersion, Meta = new SaveMeta(), State = g })).State;
                Assert.That(Epilogue.Resumes(loaded), Is.True, "a load opens the closing pages again");
                resumes = new DialogueRunner(tree, loaded).Node;
            }
            Assert.That(rolled, Is.True, $"the credits rolled after {pages.Count} pages");
            Assert.That(pages.Count, Is.GreaterThan(3));
            Assert.That(pages.Last(), Is.EqualTo("end"));
            Assert.That(pages.Distinct().Count(), Is.EqualTo(pages.Count), "no page shown twice");
            Assert.That(rec.Events.Count(x => x.Name == "slide"), Is.EqualTo(pages.Count - 1), "a still for every page but the last");
            Assert.That(SlideData.From(rec.Events.First(x => x.Name == "slide").Data).Present(g), Is.Not.Null);
        }

        /// <summary>A dialogue host over a recorder.</summary>
        private sealed class HostOf : DialogueHost
        {
            private readonly Recorder _r;
            public HostOf(Recorder r) { _r = r; }
            public override void Event(string name, JToken data) => _r.Event(name, data);
        }

        /// <summary>The project's Assets/SecondFace, found up from the working directory.</summary>
        private static string Root()
        {
            for (var d = new DirectoryInfo(Directory.GetCurrentDirectory()); d != null; d = d.Parent)
                foreach (var c in new[] { Path.Combine(d.FullName, "Assets", "SecondFace"), Path.Combine(d.FullName, "unity", "Assets", "SecondFace") })
                    if (Directory.Exists(Path.Combine(c, "Game", "Resources"))) return c;
            throw new DirectoryNotFoundException("Assets/SecondFace (from " + Directory.GetCurrentDirectory() + ")");
        }

        [Test]
        public void TheCreditsRollFromTheShippedDocument()
        {
            var roll = Credits.Parse("intro line\n# Head **one**\nA paragraph\nwrapped over two lines with a [link](http://x).\n\n- an `item`\n- another\n## Two\n<!-- a note -->\ntext");
            Assert.That(roll.Select(s => s.Heading), Is.EqualTo(new[] { "", "Head one", "Two" }));
            Assert.That(roll[0].Lines, Is.EqualTo(new[] { "intro line" }));
            Assert.That(roll[1].Lines, Is.EqualTo(new[] { "A paragraph wrapped over two lines with a link.", "an item", "another" }));
            Assert.That(roll[2].Lines, Is.EqualTo(new[] { "text" }));
            Assert.That(Credits.Plain("**CC BY 4.0** by `x`"), Is.EqualTo("CC BY 4.0 by x"));
            // the shipped document: Resources/credits.txt, the same as docs/CREDITS.md where the repository has it
            var root = Root();
            var shipped = Path.Combine(root, "Game", "Resources", "credits.txt");
            Assert.That(File.Exists(shipped), Is.True, shipped);
            var text = File.ReadAllText(shipped);
            var sections = Credits.Parse(text);
            Assert.That(sections.Count, Is.GreaterThan(5));
            Assert.That(sections.SelectMany(s => s.Lines).Any(l => Regex.IsMatch(l, @"\*\*|`|\]\(")), Is.False, "no markdown left");
            var docs = Path.GetFullPath(Path.Combine(root, "..", "..", "..", "docs", "CREDITS.md"));
            if (File.Exists(docs)) Assert.That(text, Is.EqualTo(File.ReadAllText(docs)), "Game/Resources/credits.txt is docs/CREDITS.md (copy it over when the credits change)");
        }
    }
}
