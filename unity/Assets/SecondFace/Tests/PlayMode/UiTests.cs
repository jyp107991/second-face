using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Quest;
using SecondFace.Core.State;
using SecondFace.Core.World;
using SecondFace.Game.UI;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UIElements;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace SecondFace.Tests
{
    /// <summary>
    /// The interface's foundation (P5 step 3): the panel draws into a texture (a camera render does not include UI
    /// Toolkit, BUILD_PLAN §8) at a 20:9 phone's shape with its cutout on the left and its gesture bar along the bottom.
    /// A specimen of the theme (the notebook page in both faces, buttons, the HUD's plate over a stand-in for the world)
    /// is captured (`ui_foundation`); the panel scales by height, the safe area pads what must stay clear, each class
    /// resolves to its face, a finger on a control is the interface's and one on the bare world is not; a modal question
    /// takes every touch and the back gesture closes it (`ui_modal`); an opaque page hides the screens and the HUD under it
    /// (`ui_page`), and closing the bottom screen closes those over it. The HUD (P5.3b) keeps every plate inside the safe
    /// area, bands the party's health, turns the compass with the camera and quiets its line when nothing is tracked
    /// (`ui_hud`); its words come from the UI string table. The radial (P5.3c) rings the tapped point with its verbs, dims
    /// one that is closed, takes every touch, reports the verb chosen and closes; tapped by the corner it moves inside the
    /// safe area whole (`ui_radial`, `ui_radial_corner`). A conversation (P5.3d) writes its line out, then shows the
    /// passives and the choices with their checks up front, locked ones dimmed; a choice logs the line and goes on; the
    /// end closes it; heard lines show whole and chosen choices dim; back takes the way out (`ui_dialogue`,
    /// `ui_dialogue_log`). The notebook (P5.3f) lists open quests first and finished ones after, writes the chosen one out
    /// with its objectives and journal, tracks a quest to the top, and turns to the leads, people, letters and decisions;
    /// an empty section says so (`ui_notebook`, `ui_notebook_leads`).
    /// </summary>
    public class UiTests : IPrebuildSetup
    {
        public const string AssetPath = "Assets/SecondFace/UI/UIAssets.asset";

        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build UI assets");
            EditorApplication.ExecuteMenuItem("Second Face/Build localization");
#endif
        }

        private UIService _ui;
        private RenderTexture _rt;

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            if (_ui != null) Object.Destroy(_ui.gameObject);
            if (_rt != null) { _rt.Release(); Object.Destroy(_rt); }
            yield return null;
        }

        public static UIAssets Assets()
        {
#if UNITY_EDITOR
            return AssetDatabase.LoadAssetAtPath<UIAssets>(AssetPath);
#else
            return null;
#endif
        }

        /// <summary>An interface drawing into a texture of the given size.</summary>
        public static UIService Offscreen(int width, int height, out RenderTexture rt)
        {
            var assets = Assets();
            Assert.That(assets != null && assets.Complete, Is.True, $"{AssetPath} is missing or incomplete (Second Face/Build UI assets)");
            rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            rt.Create();
            return UIService.Create(assets, null, rt);
        }

        /// <summary>Writes the texture the panel draws into as a PNG; returns the share of pixels drawn.</summary>
        public static float Save(RenderTexture rt, string name)
        {
            var tex = new Texture2D(rt.width, rt.height, TextureFormat.RGBA32, false);
            var active = RenderTexture.active;
            RenderTexture.active = rt;
            tex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
            tex.Apply();
            RenderTexture.active = active;
            var drawn = 0;
            var px = tex.GetPixels32();
            foreach (var p in px) if (p.a > 8) drawn++;
            var path = Path.Combine(ScreenshotTests.OutDir(), name + ".png");
            File.WriteAllBytes(path, tex.EncodeToPNG());
            Object.Destroy(tex);
            Debug.Log($"screenshot: {path} ({drawn * 100f / px.Length:0}% drawn)");
            return drawn / (float)px.Length;
        }

        private static string FontOf(VisualElement e) => e.resolvedStyle.unityFontDefinition.fontAsset?.name;

        [UnityTest, Timeout(120000)]
        public IEnumerator FoundationIsThemedSafeAndCaptured()
        {
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);   // cutout on the left, gesture bar below
            // a stand-in for the world under everything, and the HUD's objective over it
            var world = new VisualElement { pickingMode = PickingMode.Ignore };
            world.style.position = Position.Absolute;
            world.style.left = 0; world.style.top = 0; world.style.right = 0; world.style.bottom = 0;
            world.style.backgroundColor = new Color(0.80f, 0.66f, 0.45f);
            _ui.Root.Insert(0, world);
            var hud = new VisualElement { pickingMode = PickingMode.Ignore };
            hud.AddToClassList(UIService.SafeClass);
            hud.style.position = Position.Absolute;
            hud.style.left = 0; hud.style.top = 0; hud.style.right = 0; hud.style.bottom = 0;
            // padding does not move absolutely placed children (they sit against the padding edge): they go in a filler
            var area = new VisualElement { pickingMode = PickingMode.Ignore };
            area.style.flexGrow = 1;
            hud.Add(area);
            var objective = new VisualElement();
            objective.AddToClassList("sf-plate");
            objective.style.position = Position.Absolute;
            objective.style.right = 24; objective.style.top = 24;
            objective.Add(Text("sf-label", "SHALE"));
            objective.Add(Text("sf-body", "Ask at the water tower who weighs the ration"));
            area.Add(objective);
            var notebook = new Button { text = "NOTEBOOK" };
            notebook.AddToClassList("sf-button");
            notebook.AddToClassList("sf-button--plate");
            notebook.style.position = Position.Absolute;
            notebook.style.right = 24; notebook.style.bottom = 24;
            area.Add(notebook);
            _ui.Hud.Add(hud);

            var specimen = _ui.Open(new Specimen());
            for (var i = 0; i < 5; i++) yield return null;
            var w = _ui.Root.layout.width;
            var h = _ui.Root.layout.height;
            Assert.That(h, Is.EqualTo(720f).Within(1f), "the panel scales by height from 1280×720");
            Assert.That(w, Is.EqualTo(1600f).Within(1f));
            Assert.That(_ui.Insets.x, Is.EqualTo(0.05f * w).Within(0.5f), "the cutout's inset");
            Assert.That(_ui.Insets.w, Is.EqualTo(0.04f * h).Within(0.5f), "the gesture bar's inset");
            Assert.That(specimen.Content.worldBound.xMin, Is.GreaterThanOrEqualTo(_ui.Insets.x), "the page's text clears the cutout");
            Assert.That(objective.worldBound.xMax, Is.LessThanOrEqualTo(w), "the HUD stays on screen");
            Assert.That(notebook.worldBound.yMax, Is.LessThanOrEqualTo(h - _ui.Insets.w), "the HUD clears the gesture bar");
            Assert.That(FontOf(specimen.Body), Is.EqualTo("Barlow-Regular"));
            Assert.That(FontOf(specimen.Book), Is.EqualTo("Literata-Regular"));
            Assert.That(FontOf(specimen.Note), Is.EqualTo("Literata-Italic"));
            Assert.That(FontOf(specimen.Title), Is.EqualTo("Literata-SemiBold"));
            Assert.That(FontOf(specimen.Ask), Is.EqualTo("Barlow-SemiBold"));
            Assert.That(specimen.Ask.layout.height, Is.GreaterThanOrEqualTo(80f), "a touch target is at least 80 units (about 7 mm)");
            Assert.That(_ui.CoversPanel(specimen.Ask.worldBound.center), Is.True, "a finger on a button is the interface's");
            Assert.That(_ui.CoversPanel(notebook.worldBound.center), Is.True, "a finger on the HUD is the interface's");
            Assert.That(_ui.CoversPanel(new Vector2(w * 0.75f, h * 0.5f)), Is.False, "a finger on the bare world is the world's");
            Assert.That(Save(_rt, "ui_foundation"), Is.GreaterThan(0.95f), "the panel drew into its texture");

            var question = _ui.Open(new Question());
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(_ui.Top, Is.SameAs(question));
            Assert.That(_ui.CoversPanel(new Vector2(w * 0.75f, h * 0.5f)), Is.True, "a question takes every touch");
            Save(_rt, "ui_modal");
            Assert.That(_ui.Back(), Is.True);
            Assert.That(_ui.Top, Is.SameAs(specimen), "back closes the question");

            var page = _ui.Open(new Page());
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(specimen.Root.resolvedStyle.display, Is.EqualTo(DisplayStyle.None), "an opaque page hides the screen under it");
            Assert.That(_ui.Hud.resolvedStyle.display, Is.EqualTo(DisplayStyle.None), "and the HUD");
            Save(_rt, "ui_page");
            _ui.Close(specimen);
            yield return null;
            Assert.That(_ui.Stack.Count, Is.EqualTo(0), "closing a screen closes those opened over it");
            Assert.That(page.IsOpen, Is.False);
            Assert.That(_ui.Hud.resolvedStyle.display, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(_ui.Back(), Is.False, "back with nothing open is not the interface's");
        }

        /// <summary>A flat stand-in for the world under the interface.</summary>
        private static VisualElement World()
        {
            var world = new VisualElement { pickingMode = PickingMode.Ignore };
            world.style.position = Position.Absolute;
            world.style.left = 0; world.style.top = 0; world.style.right = 0; world.style.bottom = 0;
            world.style.backgroundColor = new Color(0.80f, 0.66f, 0.45f);
            return world;
        }

        /// <summary>A stand-in portrait: a warm vertical gradient.</summary>
        private static Texture2D Face(int size)
        {
            var t = new Texture2D(size, size, TextureFormat.RGBA32, false);
            for (var y = 0; y < size; y++)
            for (var x = 0; x < size; x++)
                t.SetPixel(x, y, Color.Lerp(new Color(0.25f, 0.18f, 0.14f), new Color(0.72f, 0.55f, 0.42f), y / (float)size));
            t.Apply();
            return t;
        }

        [UnityTest, Timeout(120000)]
        public IEnumerator HudSitsInTheSafeAreaAndIsCaptured()
        {
            Assert.That(Strings.Get("hud.map"), Is.EqualTo("Map"), "the UI string table is built and loads");
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            _ui.Root.Insert(0, World());
            var hud = new Hud(_ui);
            hud.Actions(() => { }, () => { }, () => { });
            var face = Face(128);
            hud.Show(new HudState
            {
                Place = "Shale", Day = 2, Clock = "14:20", Quest = "Water rights",
                Objective = "Ask at the water tower who weighs the ration", Bearing = 40f,
                Party =
                {
                    new HudMember { Name = "Ash", Hp = 34, MaxHp = 40, Leader = true, Portrait = face },
                    new HudMember { Name = "Pell", Hp = 12, MaxHp = 30 },
                    new HudMember { Name = "Oro", Hp = 4, MaxHp = 28 },
                },
            });
            hud.Heading(20f);
            for (var i = 0; i < 6; i++) yield return null;
            var w = _ui.Root.layout.width;
            var h = _ui.Root.layout.height;
            var inset = _ui.Insets;
            Assert.That(hud.Objective.worldBound.xMin, Is.GreaterThanOrEqualTo(inset.x), "the objective clears the cutout");
            Assert.That(hud.Compass.worldBound.xMax, Is.LessThanOrEqualTo(w - inset.z));
            Assert.That(hud.Compass.worldBound.xMin, Is.GreaterThan(hud.Objective.worldBound.xMax), "the compass and the objective do not overlap");
            Assert.That(hud.Party.worldBound.yMax, Is.LessThanOrEqualTo(h - inset.w), "the party clears the gesture bar");
            Assert.That(hud.MapButton.worldBound.yMax, Is.LessThanOrEqualTo(h - inset.w), "the actions clear the gesture bar");
            Assert.That(hud.MapButton.worldBound.height, Is.GreaterThanOrEqualTo(80f), "an action is a thumb's target");
            Assert.That(hud.Party.worldBound.xMax, Is.LessThan(hud.NotebookButton.worldBound.xMin), "the party and the actions do not overlap");
            Assert.That(hud.Filled(0), Is.EqualTo(34f / 40f).Within(0.02f));
            Assert.That(hud.Band(0), Is.EqualTo(""));
            Assert.That(hud.Band(1), Is.EqualTo("low"));
            Assert.That(hud.Band(2), Is.EqualTo("critical"));
            Assert.That(hud.Compass.Shows(0), Is.True, "north is ahead");
            Assert.That(hud.Compass.Shows(2), Is.False, "south is behind");
            Assert.That(_ui.CoversPanel(hud.MapButton.worldBound.center), Is.True);
            Assert.That(_ui.CoversPanel(new Vector2(w * 0.5f, h * 0.5f)), Is.False, "the middle of the screen is the world's");
            Assert.That(hud.NotebookButton.Q<Label>().text, Is.EqualTo("Notebook"), "the button's word is bound to the table");
            Assert.That(Save(_rt, "ui_hud"), Is.GreaterThan(0.95f));

            hud.Heading(200f);
            hud.Actions(null, () => { }, null);
            hud.Show(new HudState { Day = 1, Clock = "08:00", Party = { new HudMember { Name = "Ash", Hp = 40, MaxHp = 40, Leader = true } } });
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(hud.Compass.Shows(2), Is.True, "turned round, south is ahead");
            Assert.That(hud.Compass.Shows(0), Is.False);
            Assert.That(hud.Root.Q<Label>(className: "sf-hud__line").text, Is.EqualTo(Strings.Get("hud.quiet")), "nothing tracked: the quiet line");
            Assert.That(hud.NotebookButton.resolvedStyle.display, Is.EqualTo(DisplayStyle.None), "an action with no screen yet is hidden");
            Assert.That(hud.Party.Children().Count(c => c.resolvedStyle.display == DisplayStyle.Flex), Is.EqualTo(1));
            Save(_rt, "ui_hud_quiet");
            Object.Destroy(face);
        }

        [UnityTest, Timeout(120000)]
        public IEnumerator RadialRingsThePointInsideTheSafeArea()
        {
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            _ui.Root.Insert(0, World());
            string chosen = null;
            var verbs = new[] { new RadialVerb("talk"), new RadialVerb("look"), new RadialVerb("take"), new RadialVerb("steal", false), new RadialVerb("give") };
            var radial = _ui.Open(new RadialMenu(new Vector2(800f, 360f), "Someone from the town", verbs, v => chosen = v));
            yield return new WaitForSecondsRealtime(0.4f);
            for (var i = 0; i < 3; i++) yield return null;
            var w = _ui.Root.layout.width;
            var h = _ui.Root.layout.height;
            var inset = _ui.Insets;
            Assert.That(Vector2.Distance(radial.Centre, new Vector2(800f, 360f)), Is.LessThan(0.5f), "the ring is centred on the point");
            foreach (var v in verbs)
            {
                var b = radial.VerbButton(v.Id);
                Assert.That(b, Is.Not.Null, v.Id);
                Assert.That(Vector2.Distance(b.worldBound.center, radial.Centre), Is.EqualTo(RadialMenu.Radius).Within(2f), $"{v.Id} sits on the ring (the ring has grown open)");
                Assert.That(b.worldBound.height, Is.GreaterThanOrEqualTo(80f), "a thumb's target");
            }
            Assert.That(radial.VerbButton("talk").worldBound.center.y, Is.LessThan(radial.Centre.y - RadialMenu.Radius + 2f), "the first verb at the top");
            Assert.That(radial.VerbButton("steal").enabledSelf, Is.False, "a closed verb is dimmed");
            Assert.That(radial.VerbButton("look").Q<Label>().text, Is.EqualTo("Look"));
            Assert.That(_ui.CoversPanel(new Vector2(120f, 120f)), Is.True, "the ring takes every touch while open");
            Assert.That(Save(_rt, "ui_radial"), Is.GreaterThan(0.95f));
            radial.Choose("steal");
            Assert.That(chosen, Is.Null, "a closed verb cannot be chosen");
            Assert.That(radial.IsOpen, Is.True);
            radial.Choose("look");
            Assert.That(chosen, Is.EqualTo("look"));
            Assert.That(radial.IsOpen, Is.False, "choosing closes the ring");
            Assert.That(_ui.Top, Is.Null);

            var corner = _ui.Open(new RadialMenu(new Vector2(1590f, 715f), "A crate", new[] { new RadialVerb("take"), new RadialVerb("look") }, v => chosen = v));
            yield return new WaitForSecondsRealtime(0.4f);
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(corner.Centre.x, Is.LessThanOrEqualTo(w - inset.z - RadialMenu.Extent - RadialMenu.Margin + 0.5f), "moved in from the edge");
            Assert.That(corner.Centre.y, Is.LessThanOrEqualTo(h - inset.w - RadialMenu.Extent - RadialMenu.Margin + 0.5f), "moved up off the gesture bar");
            var take = corner.VerbButton("take");
            var look = corner.VerbButton("look");
            Assert.That(take.worldBound.center.x, Is.LessThan(corner.Centre.x - RadialMenu.Radius + 2f), "two verbs sit left and right");
            Assert.That(look.worldBound.center.x, Is.GreaterThan(corner.Centre.x + RadialMenu.Radius - 2f));
            Assert.That(take.worldBound.center.y, Is.EqualTo(corner.Centre.y).Within(2f));
            Assert.That(look.worldBound.xMax, Is.LessThanOrEqualTo(w - inset.z - RadialMenu.Margin + 0.5f));
            Assert.That(look.worldBound.yMax, Is.LessThanOrEqualTo(h - inset.w));
            Save(_rt, "ui_radial_corner");
            Assert.That(_ui.Back(), Is.True);
            Assert.That(corner.IsOpen, Is.False, "back closes the ring");
        }

        /// <summary>A conversation fixture: a line with the player's name, a passive, a plain choice, a check the fixture
        /// meets, one it does not, a locked one shown, a way out; a second node; a fail node.</summary>
        public const string Talk = @"{
  ""id"": ""d_test"", ""owner"": ""npc_test"",
  ""start"": [ { ""node"": ""a"" } ],
  ""nodes"": {
    ""a"": { ""text"": ""Water's by the cup here, {name}. You paying, or asking?"",
      ""passives"": [ { ""label"": ""insight"", ""text"": ""The scale's pan has been filed light on one side."" } ],
      ""options"": [
        { ""id"": ""ask"", ""text"": ""Who weighs it?"", ""next"": ""b"" },
        { ""id"": ""calm"", ""text"": ""Fair weight, or none at all."", ""check"": { ""skill"": ""speech"", ""dc"": 10 }, ""next"": ""b"", ""fail"": ""c"" },
        { ""id"": ""hard"", ""text"": ""Open the cistern. Now."", ""check"": { ""skill"": ""barter"", ""dc"": 95 }, ""next"": ""b"", ""fail"": ""c"" },
        { ""id"": ""pass"", ""text"": ""Show the warden's pass."", ""if"": { ""flag"": ""has_pass"" }, ""showLocked"": true, ""next"": ""b"" },
        { ""id"": ""bye"", ""text"": ""Another time."", ""exit"": true } ] },
    ""b"": { ""text"": ""The Tollmen weigh it. Who else would."", ""options"": [ { ""id"": ""thanks"", ""text"": ""Thanks."", ""exit"": true } ] },
    ""c"": { ""text"": ""No."", ""options"": [ { ""id"": ""fine"", ""text"": ""Fine."", ""exit"": true } ] }
  } }";

        [UnityTest, Timeout(120000)]
        public IEnumerator ConversationReadsAndChooses()
        {
            var def = JObject.Parse(Talk).ToObject<DialogueDef>();
            var g = States.NewGame("shale", 0, 0);
            g.Pc.Sheet.Name = "Ash";
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            _ui.Root.Insert(0, World());
            var face = Face(128);
            var ended = 0;
            var panel = _ui.Open(new DialoguePanel(new DialogueRunner(def, g), id => id == "npc_test" ? "Teller Vos" : id, id => id == "npc_test" ? face : null) { CharsPerSecond = 20f });
            panel.Ended += () => ended++;
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(panel.Revealing, Is.True, "a new line is written out");
            Assert.That(panel.Options.resolvedStyle.display, Is.EqualTo(DisplayStyle.None), "the choices wait for the line");
            panel.Finish();
            for (var i = 0; i < 3; i++) yield return null;
            var w = _ui.Root.layout.width;
            var h = _ui.Root.layout.height;
            var inset = _ui.Insets;
            Assert.That(panel.Line.text, Does.Contain("Ash"), "the player's name in the line");
            Assert.That(panel.View.Options.Count, Is.EqualTo(5));
            Assert.That(panel.Options.childCount, Is.EqualTo(5));
            Assert.That(panel.Options.Q<Button>("option-pass").enabledSelf, Is.False, "a locked choice is shown dimmed");
            var calm = panel.View.Options.Find(o => o.Id == "calm");
            var hard = panel.View.Options.Find(o => o.Id == "hard");
            Assert.That(calm.CheckMet, Is.True);
            Assert.That(hard.CheckMet, Is.False);
            Assert.That(panel.Options.Q<Button>("option-hard").Q<Label>(className: "sf-dialogue__check").ClassListContains("sf-dialogue__check--unmet"), Is.True, "an unmet check shows so up front");
            Assert.That(panel.Root.Q(className: "sf-dialogue__passive"), Is.Not.Null, "the passive is shown");
            var page = panel.Root.Q("dialogue-page");
            Assert.That(page.worldBound.xMin, Is.GreaterThan(w * 0.45f), "the page sits at the right, the scene beside it");
            Assert.That(page.worldBound.xMax, Is.EqualTo(w).Within(1f));
            Assert.That(panel.Scroll.worldBound.yMax, Is.LessThanOrEqualTo(h - inset.w + 0.5f), "the page's reading area clears the gesture bar");
            Assert.That(_ui.CoversPanel(new Vector2(w * 0.25f, h * 0.5f)), Is.True, "the scene takes no touches during a conversation");
            Assert.That(panel.Options.Q<Button>("option-ask").worldBound.height, Is.GreaterThanOrEqualTo(72f), "a choice is a thumb's target");
            Assert.That(panel.Line.worldBound.yMin, Is.GreaterThanOrEqualTo(panel.Scroll.worldBound.yMin - 0.5f), "the line is read from its start");
            Assert.That(Save(_rt, "ui_dialogue"), Is.GreaterThan(0.95f));

            panel.Choose("ask");
            panel.Finish();
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(panel.Log.childCount, Is.EqualTo(2), "the line and the choice went to the log");
            Assert.That(panel.Line.worldBound.yMin, Is.GreaterThanOrEqualTo(panel.Scroll.worldBound.yMin - 0.5f), "the new line is read from its start");
            Assert.That(panel.Line.text, Does.Contain("Tollmen"));
            Save(_rt, "ui_dialogue_log");
            panel.Choose("thanks");
            Assert.That(ended, Is.EqualTo(1), "the conversation ended");
            Assert.That(panel.IsOpen, Is.False);

            var again = _ui.Open(new DialoguePanel(new DialogueRunner(def, g), id => "Teller Vos") { CharsPerSecond = 20f });
            yield return null;
            Assert.That(again.Revealing, Is.False, "a line heard before is shown whole");
            Assert.That(again.Options.Q<Button>("option-ask").ClassListContains("sf-dialogue__option--seen"), Is.True, "a choice made before is dimmed");
            Assert.That(_ui.Back(), Is.True);
            Assert.That(again.IsOpen, Is.False, "back takes the way out");
            Object.Destroy(face);
        }

        private static QuestDef Quest(string json) => JObject.Parse(json).ToObject<QuestDef>();

        [UnityTest, Timeout(120000)]
        public IEnumerator NotebookShowsItsPagesAndTracks()
        {
            var defs = new Dictionary<string, QuestDef>
            {
                ["q_water"] = Quest(@"{ ""id"": ""q_water"", ""title"": ""Water rights"", ""start"": ""s1"", ""stages"": {
                    ""s1"": { ""journal"": ""The ration at the tower is short, and everyone blames someone else."", ""objectives"": [ { ""id"": ""ask"", ""text"": ""Ask who weighs it"" } ] },
                    ""s2"": { ""journal"": ""The scale's pan is filed light. Whoever holds the key knows."", ""objectives"": [ { ""id"": ""key"", ""text"": ""Find out who holds the key"" }, { ""id"": ""look"", ""text"": ""Look at the ledger"", ""optional"": true } ] } } }"),
                ["q_debt"] = Quest(@"{ ""id"": ""q_debt"", ""title"": ""Old debts"", ""start"": ""s1"", ""stages"": { ""s1"": { ""journal"": ""A debt to settle at the saloon."", ""objectives"": [ { ""id"": ""pay"", ""text"": ""Pay what is owed, or argue it down"" } ] } } }"),
                ["q_fence"] = Quest(@"{ ""id"": ""q_fence"", ""title"": ""Mend the fence"", ""start"": ""s1"", ""stages"": { ""s1"": { ""journal"": ""The fence is down at the goat pen."" } } }"),
            };
            var g = States.NewGame("shale", 0, 0);
            var q = new QuestEngine(defs, g);
            q.QuestStart("q_water");
            g.Minutes += 60;
            q.QuestStart("q_debt");
            g.Minutes += 60;
            q.QuestStart("q_fence");
            q.QuestStage("q_water", "s2");
            q.QuestEnd("q_fence", "done");
            var leads = new Dictionary<string, LeadDef>
            {
                ["l_scale"] = new() { Id = "l_scale", Label = "The scale", Text = "The scale's pan is filed light on one side." },
                ["l_key"] = new() { Id = "l_key", Label = "The key", Text = "Only two people hold the key to the tower." },
            };
            var conclusions = new Dictionary<string, ConclusionDef> { ["c_short"] = new() { Id = "c_short", Text = "Someone with a key is shorting the ration.", From = { "l_scale", "l_key" } } };
            g.World.Leads.Add("l_scale"); g.World.Leads.Add("l_key"); g.World.Conclusions.Add("c_short");
            g.World.MetPeople["npc_a"] = new Met { Name = "Teller Vos", Day = 1, Where = "Shale" };
            g.World.MetPeople["npc_b"] = new Met { Name = "Ash Corran", Day = 2, Where = "the north road" };
            g.World.PostBag.Add(new Post { From = "A friend in Shale", Text = "Come back before the rains.", Day = 2 });
            g.World.Decisions.Add(new Decision { Id = "d1", Text = "Paid the toll at the bridge.", Minutes = Clock.StartMinutes });

            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var nb = _ui.Open(new NotebookScreen(g, defs, leads, conclusions));
            for (var i = 0; i < 4; i++) yield return null;
            var inset = _ui.Insets;
            Assert.That(nb.Entries.Select(e => e.Id), Is.EqualTo(new[] { "q_debt", "q_water", "q_fence" }), "open quests first, the newest on top; finished after");
            Assert.That(nb.Selected, Is.EqualTo("q_debt"), "the first entry is written out");
            Assert.That(nb.List.worldBound.xMin, Is.GreaterThanOrEqualTo(inset.x), "the book clears the cutout");
            Assert.That(nb.Tab("quests").ClassListContains("sf-notebook__tab--on"), Is.True);
            nb.Select("q_water");
            yield return null;
            Assert.That(nb.Detail.Query(className: "sf-notebook__item").ToList().Count, Is.EqualTo(2), "the current stage's objectives");
            Assert.That(nb.TrackButton, Is.Not.Null, "an open quest can be tracked");
            nb.Track("q_water");
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(g.World.Pinned, Is.EqualTo("q_water"));
            Assert.That(nb.Entries[0].Id, Is.EqualTo("q_water"), "the tracked quest on top");
            Assert.That(nb.Selected, Is.EqualTo("q_water"));
            Assert.That(Notebook.Tracked(g), Is.EqualTo("q_water"));
            Assert.That(Save(_rt, "ui_notebook"), Is.GreaterThan(0.95f));

            nb.Show("leads");
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(nb.Entries.Count, Is.EqualTo(3));
            Assert.That(nb.Entries[0].Status, Is.EqualTo("conclusion"), "what the leads add up to comes first");
            Save(_rt, "ui_notebook_leads");
            nb.Show("people");
            Assert.That(nb.Entries.Select(e => e.Title), Is.EqualTo(new[] { "Ash Corran", "Teller Vos" }));
            nb.Show("letters");
            Assert.That(nb.Entries.Count, Is.EqualTo(1));
            nb.Show("decisions");
            Assert.That(nb.Entries.Count, Is.EqualTo(1));
            Assert.That(_ui.Back(), Is.True);
            Assert.That(nb.IsOpen, Is.False, "back closes the notebook");

            var empty = _ui.Open(new NotebookScreen(States.NewGame("shale", 0, 0), defs).At("letters"));
            yield return null;
            Assert.That(empty.List.Q(className: "sf-notebook__empty"), Is.Not.Null, "an empty section says so");
            empty.Close();
        }

        private static Label Text(string cls, string text)
        {
            var l = new Label(text);
            l.AddToClassList(cls);
            return l;
        }

        private static Button Button(string text, params string[] classes)
        {
            var b = new Button { text = text };
            b.AddToClassList("sf-button");
            foreach (var c in classes) b.AddToClassList(c);
            return b;
        }

        /// <summary>The theme's specimen: the notebook's page on the left, the world (passing touches) on the right.</summary>
        private sealed class Specimen : UIScreen
        {
            public VisualElement Content;
            public Label Title, Body, Book, Note;
            public Button Ask;
            public override bool Opaque => false;
            public override bool PassesTouches => true;

            protected override VisualElement Build()
            {
                var root = new VisualElement { pickingMode = PickingMode.Ignore };
                root.style.flexDirection = FlexDirection.Row;
                var page = new VisualElement();
                page.AddToClassList("sf-page");
                page.style.width = Length.Percent(52);
                var safe = new VisualElement();
                safe.AddToClassList(UIService.SafeClass);
                page.Add(safe);
                Content = new VisualElement();
                Content.AddToClassList("sf-edge");
                safe.Add(Content);
                Content.Add(Text("sf-label", "NOTEBOOK · THE SECOND DAY"));
                Content.Add(Title = Text("sf-title", "Shale, under the water tower"));
                Content.Add(Book = Text("sf-book", "Water here is rationed by the cup. The Tollmen weigh it, the Choir blesses it, and nobody in Shale trusts either of them with the key."));
                Content.Add(Note = Text("sf-note", "Ask at the saloon after dark, when the scales are locked away."));
                var rule = new VisualElement();
                rule.AddToClassList("sf-rule");
                Content.Add(rule);
                Content.Add(Body = Text("sf-body", "Barlow for the interface, Literata for the notebook."));
                Content.Add(Text("sf-fine", "0123456789 · “quotes” ‘single’ — dash … ellipsis → ½ ± · éàüßøłžő"));
                var row = new VisualElement();
                row.AddToClassList("sf-row");
                row.style.marginTop = 16;
                row.Add(Ask = Button("ASK ABOUT THE KEY"));
                Ask.style.marginRight = 16;
                row.Add(Button("LEAVE", "sf-button--quiet"));
                Content.Add(row);
                root.Add(page);
                return root;
            }
        }

        /// <summary>A modal question.</summary>
        private sealed class Question : UIScreen
        {
            public override UILayer Layer => UILayer.Modal;
            public override bool Opaque => false;

            protected override VisualElement Build()
            {
                var root = new VisualElement();
                root.AddToClassList("sf-modal");
                var card = new VisualElement();
                card.AddToClassList("sf-card");
                card.Add(Text("sf-heading", "Pay the toll?"));
                card.Add(Text("sf-book", "Twelve scrip for the road north. The tollman counts it twice."));
                var row = new VisualElement();
                row.AddToClassList("sf-row");
                row.style.marginTop = 20;
                var pay = Button("PAY");
                pay.style.marginRight = 16;
                row.Add(pay);
                row.Add(Button("TURN BACK", "sf-button--quiet"));
                card.Add(row);
                root.Add(card);
                return root;
            }
        }

        /// <summary>An opaque page (the notebook will be one).</summary>
        private sealed class Page : UIScreen
        {
            protected override VisualElement Build()
            {
                var root = new VisualElement();
                root.AddToClassList("sf-page");
                var safe = new VisualElement();
                safe.AddToClassList(UIService.SafeClass);
                root.Add(safe);
                var inner = new VisualElement();
                inner.AddToClassList("sf-edge");
                safe.Add(inner);
                inner.Add(Text("sf-title", "Leads"));
                inner.Add(Text("sf-book", "A full page covers the world: nothing under it is drawn, the HUD included."));
                return root;
            }
        }
    }
}
