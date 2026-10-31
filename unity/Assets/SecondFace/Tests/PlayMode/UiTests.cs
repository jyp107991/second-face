using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Dialogue;
using SecondFace.Core.Inventory;
using SecondFace.Core.Npc;
using SecondFace.Core.Quest;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using SecondFace.Game.People;
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
    /// an empty section says so (`ui_notebook`, `ui_notebook_leads`). The map (P5.3g) opens on the player over the baked
    /// sheet, names only the known places, opens a place's card with the journey there, offers travel only where a way
    /// exists, keeps its zoom within bounds, and back closes the card before the map (`ui_map`, `ui_map_card`). The pack
    /// (P5.3h) lists every carried item as its own drawing, the worn ones in their places round the live figure; an item's
    /// card weighs it against what is in hand; equipping the duster puts its coat on the figure and its figures on the
    /// sheet; aid heals; taking off undresses; the figure goes with the pack (`ui_pack`, `ui_pack_worn`, and the figure's own texture
    /// `ui_pack_figure`). Barter (P5.3h)
    /// prices both sides, dims what the merchant will not buy, puts things on the table each way, shows the haggle's
    /// check, terms and odds up front, haggles once a day (a met check moves the deal the player's way), closes a deal the
    /// player can pay for and refuses one they cannot (`ui_barter`, `ui_barter_haggle`). Creation (P5.3i) offers the
    /// origins, takes a name and pronouns, frames the face while the sculptor's sliders and another face change it, swaps
    /// the body, dyes the clothes, sets the height, rolls, keeps and recalls the attributes and moves a point, tags and
    /// takes traits, and begins with the player made (`ui_create_who`, `_face`, `_body`, `_attributes`, `_skills`); the
    /// look darkens the skin, cuts a scar, inks a tattoo and recolours the hair and eyes on the figure (`ui_create_look`,
    /// and the face alone `ui_create_look_face`).
    /// </summary>
    // (each test 15 min at most: on CI's software renderer they take 2-10 min, past the 2-4 min they were given; run 128)
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

        [UnityTest, Timeout(900000)]
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

        [UnityTest, Timeout(900000)]
        public IEnumerator HudSitsInTheSafeAreaAndIsCaptured()
        {
            Assert.That(Strings.Get("hud.map"), Is.EqualTo("Map"), "the UI string table is built and loads");
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            _ui.Root.Insert(0, World());
            var hud = new Hud(_ui);
            hud.Actions(() => { }, () => { }, () => { }, () => { }, () => { });
            hud.Watched(true, 0.5);   // sneaking, and someone is wary
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
            Assert.That(hud.CampButton.Q<Label>().text, Is.EqualTo("Camp"), "camp beside the pack");
            Assert.That(hud.CampButton.worldBound.xMin, Is.GreaterThanOrEqualTo(hud.PackButton.worldBound.xMax), "after it");
            // the sneak (P6.3): its button after the camp, lit while sneaking; the eye at the top clear of the rest
            Assert.That(hud.SneakButton.Q<Label>().text, Is.EqualTo("Sneak"));
            Assert.That(hud.SneakButton.worldBound.xMin, Is.GreaterThanOrEqualTo(hud.CampButton.worldBound.xMax), "after the camp");
            Assert.That(hud.SneakButton.worldBound.xMax, Is.LessThanOrEqualTo(w - inset.z), "inside the safe area");
            Assert.That(hud.SneakButton.ClassListContains("sf-hud__action--on"), Is.True, "lit while sneaking");
            Assert.That(hud.Eye.resolvedStyle.display, Is.EqualTo(DisplayStyle.Flex), "the eye while sneaking");
            Assert.That(hud.Eye.ClassListContains("sf-hud__eye--wary"), Is.True, "wary");
            Assert.That(hud.Eye.worldBound.xMin, Is.GreaterThan(hud.Objective.worldBound.xMax), "clear of the objective");
            Assert.That(hud.Eye.worldBound.xMax, Is.LessThan(hud.Compass.worldBound.xMin), "and of the compass");
            Assert.That(Save(_rt, "ui_hud"), Is.GreaterThan(0.95f));

            hud.Heading(200f);
            hud.Actions(null, () => { }, null);
            hud.Watched(false, 0);
            hud.Show(new HudState { Day = 1, Clock = "08:00", Party = { new HudMember { Name = "Ash", Hp = 40, MaxHp = 40, Leader = true } } });
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(hud.Compass.Shows(2), Is.True, "turned round, south is ahead");
            Assert.That(hud.Compass.Shows(0), Is.False);
            Assert.That(hud.Root.Q<Label>(className: "sf-hud__line").text, Is.EqualTo(Strings.Get("hud.quiet")), "nothing tracked: the quiet line");
            Assert.That(hud.NotebookButton.resolvedStyle.display, Is.EqualTo(DisplayStyle.None), "an action with no screen yet is hidden");
            Assert.That(hud.Eye.resolvedStyle.display, Is.EqualTo(DisplayStyle.None), "no eye walking with nobody wary");
            Assert.That(hud.Party.Children().Count(c => c.resolvedStyle.display == DisplayStyle.Flex), Is.EqualTo(1));
            Save(_rt, "ui_hud_quiet");
            Object.Destroy(face);
        }

        [UnityTest, Timeout(900000)]
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

        [UnityTest, Timeout(900000)]
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

        [UnityTest, Timeout(900000)]
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

        [UnityTest, Timeout(900000)]
        public IEnumerator MapShowsKnownPlacesAndJourneys()
        {
            var assets = Assets();
            Assert.That(assets.WorldMap, Is.Not.Null, "the map's sheet (Second Face/Bake the world map, then Build UI assets)");
            string World(string f) => File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "world", f));
            var layout = WorldLayout.Read(World("places.json"), World("roads.json"));
            var shale = layout.Places["shale"];
            var known = new HashSet<string> { "shale", "cistern9" };
            var stranger = layout.Places.Keys.First(id => !known.Contains(id));
            string travelled = null;
            var player = new Vector2(shale.Centre[0] + 40f, shale.Centre[1] - 20f);
            var model = new MapModel
            {
                Sheet = assets.WorldMap, Layout = layout, Known = known, Here = "shale", Player = player, Heading = 60f,
                Plan = to => to == "cistern9" ? new Trip { Hours = 6, Legs = { new TripLeg { From = "shale", To = "cistern9", Mode = "foot", Hours = 6 } } } : null,
                Travel = id => travelled = id,
            };
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var map = _ui.Open(new MapScreen(model));
            for (var i = 0; i < 6; i++) yield return null;
            Assert.That(map.Marker("shale"), Is.Not.Null);
            Assert.That(map.Marker("cistern9"), Is.Not.Null);
            Assert.That(map.Marker(stranger), Is.Null, "a place not yet known is not named");
            Assert.That(map.You, Is.Not.Null, "the player is marked");
            Assert.That(map.Zoom, Is.GreaterThan(1.5f), "it opens close in, on the player");
            var view = map.Sheet.parent.worldBound;
            Assert.That(Vector2.Distance(map.InView(player.x, player.y), view.center), Is.LessThan(4f), "centred on the player");
            Assert.That(view.xMin, Is.GreaterThanOrEqualTo(_ui.Insets.x), "the map clears the cutout");
            Assert.That(Save(_rt, "ui_map"), Is.GreaterThan(0.95f));

            map.Choose("cistern9");
            yield return null;
            Assert.That(map.Card.resolvedStyle.display, Is.EqualTo(DisplayStyle.Flex));
            Assert.That(map.CardTrip.text, Is.EqualTo("About 6 hours on foot"));
            Assert.That(map.TravelButton.resolvedStyle.display, Is.EqualTo(DisplayStyle.Flex), "a way there: travel is offered");
            Save(_rt, "ui_map_card");
            map.Choose("shale");
            yield return null;
            Assert.That(map.CardTrip.text, Is.EqualTo("You are here."));
            Assert.That(map.TravelButton.resolvedStyle.display, Is.EqualTo(DisplayStyle.None));
            map.ZoomAbout(view.size * 0.5f, 100f);
            Assert.That(map.Zoom, Is.EqualTo(MapScreen.MaxZoom));
            map.ZoomAbout(view.size * 0.5f, 0.1f);
            Assert.That(map.Zoom, Is.EqualTo(1f));
            Assert.That(_ui.Back(), Is.True);
            Assert.That(map.IsOpen, Is.True, "back closes the card first");
            Assert.That(_ui.Back(), Is.True);
            Assert.That(map.IsOpen, Is.False);
            Assert.That(travelled, Is.Null);
        }

        /// <summary>The exported content in the registry (the pack and barter read items and merchants from it).</summary>
        public static void Content()
        {
            if (Registry.Items.Count > 0) return;
            var db = new ContentDb();
            foreach (var name in ContentDb.Registries)
                db.Load(name, File.ReadAllText(Path.Combine(Application.streamingAssetsPath, "content", name + ".json")));
            Registry.Load(db);
        }

        /// <summary>A player with a kit: a pipe in hand, a worn pistol, a duster and a hood, rounds, aid, salvage.</summary>
        public static GameState Kitted()
        {
            Content();
            var g = States.NewGame("shale", 0, 0);
            g.Pc.Sheet = Sheet.Empty();
            var inv = g.Pc.Inventory;
            foreach (var (id, n) in new[] { ("w_pipe", 1), ("w_pistol9", 1), ("r_duster", 1), ("r_hood", 1), ("a_9mm", 14), ("c_bandage", 3), ("c_water", 2), ("j_scrap", 4), ("j_wiring", 2), ("t_picks", 1), ("k_ring", 1) })
                Inv.AddItem(inv, Inv.MakeItem(id, n));
            inv.Tolls = 37;
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "w_pipe"));
            inv.Items.Find(i => i.Def == "w_pistol9").Cond = 0.62;
            g.Pc.Sheet.Hp = 9;
            return g;
        }

        private static Color[] Pixels(RenderTexture rt)
        {
            var tex = new Texture2D(rt.width, rt.height, TextureFormat.RGBA32, false);
            var active = RenderTexture.active;
            RenderTexture.active = rt;
            tex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
            tex.Apply();
            RenderTexture.active = active;
            var px = tex.GetPixels();
            Object.Destroy(tex);
            return px;
        }

        /// <summary>The share of pixels that differ between two draws.</summary>
        private static float Changed(Color[] a, Color[] b)
        {
            var n = 0;
            for (var i = 0; i < a.Length; i++) if (Mathf.Abs(a[i].r - b[i].r) + Mathf.Abs(a[i].g - b[i].g) + Mathf.Abs(a[i].b - b[i].b) > 0.1f) n++;
            return n / (float)a.Length;
        }

        /// <summary>The share of a figure's texture that is not the studio's backdrop.</summary>
        private static float Drawn(RenderTexture rt, Color backdrop)
        {
            var px = Pixels(rt);
            var n = 0;
            foreach (var p in px) if (Mathf.Abs(p.r - backdrop.r) + Mathf.Abs(p.g - backdrop.g) + Mathf.Abs(p.b - backdrop.b) > 0.12f) n++;
            return n / (float)px.Length;
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator PackShowsTheFigureAndEquips()
        {
            var g = Kitted();
            var inv = g.Pc.Inventory;
#if UNITY_EDITOR
            var body = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
            var idle = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject body = null; RuntimeAnimatorController idle = null;
#endif
            Assert.That(body, Is.Not.Null, "the player base (Second Face/Build player wardrobes)");
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var pack = _ui.Open(new PackScreen(new PackModel { Game = g, Body = body, Idle = idle, Fit = "m" }));
            for (var i = 0; i < 8; i++) yield return null;
            Assert.That(pack.Cells.Count, Is.EqualTo(inv.Items.Count), "every carried item in the grid; the worn ones in their places");
            Assert.That(pack.Slot("primary").Q<ItemGlyph>().Key, Is.EqualTo("pipe"));
            Assert.That(pack.Slot("body").ClassListContains("sf-cell--empty"), Is.True);
            Assert.That(pack.Cells.Select(c => c.Q<ItemGlyph>().Key).Distinct().Count(), Is.EqualTo(pack.Cells.Count), "each item drawn as itself");
            Assert.That(pack.Figure, Is.Not.Null);
            Assert.That(pack.FigureImage.image, Is.EqualTo(pack.Figure.Texture));
            Assert.That(Drawn(pack.Figure.Texture, Figure.Backdrop), Is.GreaterThan(0.06f), "the figure is drawn");
            Assert.That(pack.Meter.text, Does.StartWith("Carrying"));

            var pistol = inv.Items.FindIndex(i => i.Def == "w_pistol9");
            pack.Select(pistol);
            yield return null;
            Assert.That(pack.Card.Q<Label>("against").text, Does.Contain("Lead Pipe"), "compared with the weapon in hand");
            Assert.That(pack.Card.Q("stat-damage").Q<Label>("delta").ClassListContains("sf-stat__delta--better"), Is.True);
            Assert.That(pack.Card.Q("stat-condition"), Is.Not.Null);
            Assert.That(pack.Actions.Q<Button>("act-equip"), Is.Not.Null);
            for (var i = 0; i < 4; i++) yield return null;
            Assert.That(Save(_rt, "ui_pack"), Is.GreaterThan(0.95f));

            var bare = Pixels(pack.Figure.Texture);
            Assert.That(pack.Equip(inv.Items.FindIndex(i => i.Def == "r_duster")), Is.True);
            var draws = pack.Figure.Draws;
            for (var t = 0f; t < 3f && pack.Figure.Draws <= draws; t += Time.unscaledDeltaTime) yield return null;
            Assert.That(pack.Figure.Draws, Is.GreaterThan(draws), "drawn again after the change of clothes");
            Assert.That(inv.EquippedAt("body").Def, Is.EqualTo("r_duster"));
            Assert.That(Sheet.Derived(g.Pc.Sheet).Dt, Is.EqualTo(2), "the gear's figures count at once");
            Assert.That(pack.Figure.Wardrobe.Wearing.Values, Does.Contain("mindfront_cardigan_long_open_front"), "the duster shows on the figure");
            Assert.That(pack.SelectedSlot, Is.EqualTo("body"));
            Assert.That(pack.Actions.Q<Button>("act-unequip"), Is.Not.Null);
            Assert.That(Changed(bare, Pixels(pack.Figure.Texture)), Is.GreaterThan(0.02f), "the coat shows on the figure");
            pack.Figure.Yaw = 25f;
            pack.DrawFigure();
            for (var i = 0; i < 2; i++) yield return null;
            Save(_rt, "ui_pack_worn");
            Save(pack.Figure.Texture, "ui_pack_figure");

            pack.Show("aid");
            yield return null;
            Assert.That(pack.Cells.Count, Is.EqualTo(2));
            var hp = g.Pc.Sheet.Hp;
            Assert.That(pack.Use(inv.Items.FindIndex(i => i.Def == "c_bandage")), Is.True);
            Assert.That(g.Pc.Sheet.Hp, Is.GreaterThan(hp));
            Assert.That(Inv.CountItem(inv, "c_bandage"), Is.EqualTo(2));
            Assert.That(pack.Message.text, Does.Contain("health back"));
            Assert.That(pack.Unequip("body"), Is.True);
            Assert.That(inv.EquippedAt("body"), Is.Null);
            Assert.That(pack.Figure.Wardrobe.Wearing.Values, Does.Not.Contain("mindfront_cardigan_long_open_front"));

            var figure = pack.Figure;
            Assert.That(_ui.Back(), Is.True);
            Assert.That(pack.IsOpen, Is.False);
            Assert.That(figure.Body == null && figure.Texture == null, Is.True, "the figure goes with the pack");
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator BarterDealsAndHaggles()
        {
            var g = Kitted();
            g.Pc.Sheet.SkillBought["barter"] = 25;
            var inv = g.Pc.Inventory;
            var npc = Registry.Npcs["npc_sh_03"];
            GameObject person = null;
#if UNITY_EDITOR
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/p2_settler_f.prefab");
            var idle = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
            if (prefab != null)
            {
                person = Object.Instantiate(prefab, new Vector3(0f, -1000f, 0f), Quaternion.identity);
                var anim = person.GetComponentInChildren<Animator>();
                if (anim != null) { anim.runtimeAnimatorController = idle; anim.Update(0f); }
            }
#endif
            yield return null;
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var screen = _ui.Open(new BarterScreen(new BarterModel
            {
                Game = g, MerchantId = "npc_sh_03", Def = npc.Merchant, Name = npc.Name, Settlement = "shale",
                Face = person != null ? Portraits.Of(person) : null, Rng = new SecondFace.Core.Rng(11),
            }));
            for (var i = 0; i < 6; i++) yield return null;
            var ms = screen.State;
            Assert.That(screen.Theirs.Count, Is.EqualTo(ms.Inv.Items.Count), "their stock, each with its price");
            Assert.That(screen.Yours.Count, Is.EqualTo(inv.Items.Count));
            var picks = inv.Items.FindIndex(i => i.Def == "t_picks");
            Assert.That(screen.Yours[picks].ClassListContains("sf-cell--dim"), Is.True, "they do not deal in tools");
            screen.Sell(picks);
            Assert.That(screen.Deal.Sell, Is.Empty);
            Assert.That(screen.Message.text, Is.EqualTo("They don't deal in that."));

            var water = ms.Inv.Items.FindIndex(i => i.Def == "c_water");
            screen.Buy(water);
            screen.Buy(water);
            var scrap = inv.Items.FindIndex(i => i.Def == "j_scrap");
            screen.Sell(scrap);
            screen.Sell(scrap);
            yield return null;
            var t = screen.Totals;
            Assert.That(t.Net, Is.GreaterThan(0));
            Assert.That(screen.Balance.text, Is.EqualTo($"You pay {t.Net} Tolls"));
            Assert.That(screen.Lines.childCount, Is.EqualTo(2), "a line each way");
            Assert.That(screen.Theirs[water].ClassListContains("sf-cell--on"), Is.True);
            var offer = screen.Offer;
            Assert.That(offer.Open, Is.True);
            Assert.That(offer.Skill, Is.GreaterThanOrEqualTo(offer.Dc), "a trained trader meets a small deal's DC");
            Assert.That(screen.Pill.text, Is.EqualTo($"BARTER {offer.Skill} / {offer.Dc}"));
            Assert.That(screen.Pill.ClassListContains("sf-barter__pill--unmet"), Is.False);
            Assert.That(screen.Terms.text, Does.EndWith("They will agree."));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(Save(_rt, "ui_barter"), Is.GreaterThan(0.95f));

            Assert.That(screen.Haggle(), Is.True);
            Assert.That(ms.HaggleDay, Is.EqualTo(screen.Day));
            Assert.That(screen.Totals.Net, Is.LessThan(t.Net), "the haggle moves the deal the player's way");
            Assert.That(screen.HaggleButton.enabledSelf, Is.False, "once a day");
            Assert.That(screen.Message.text, Does.StartWith("They come down"));
            yield return null;
            Save(_rt, "ui_barter_haggle");

            var net = screen.Totals.Net;
            var tolls = inv.Tolls;
            Assert.That(screen.Strike(), Is.True);
            Assert.That(inv.Tolls, Is.EqualTo(tolls - net));
            Assert.That(Inv.CountItem(inv, "c_water"), Is.EqualTo(4));
            Assert.That(Inv.CountItem(inv, "j_scrap"), Is.EqualTo(2));
            Assert.That(screen.Deal.Buy, Is.Empty);
            for (var i = 0; i < ms.Inv.Items.Count; i++) screen.Buy(i, 99);
            Assert.That(screen.Totals.Net, Is.GreaterThan(inv.Tolls));
            Assert.That(screen.Strike(), Is.False, "too dear");
            Assert.That(screen.Message.text, Does.StartWith("You are"));
            Assert.That(_ui.Back(), Is.True);
            Assert.That(screen.IsOpen, Is.False);
            if (person != null) Object.Destroy(person);
        }

        /// <summary>Presses a button as the pad's submit would (the button's own click).</summary>
        private static void Press(Button b)
        {
            Assert.That(b, Is.Not.Null, "the button");
            Assert.That(b.enabledInHierarchy, Is.True, $"{b.name} can be pressed");
            using var e = NavigationSubmitEvent.GetPooled();
            e.target = b;
            b.SendEvent(e);
        }

        [UnityTest, Timeout(900000)]
        public IEnumerator CreationMakesAPlayer()
        {
            Content();
#if UNITY_EDITOR
            var bodyF = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_f.prefab");
            var bodyM = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/SecondFace/Prefabs/people/player_m.prefab");
            var idle = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>("Assets/SecondFace/People/Locomotion.controller");
#else
            GameObject bodyF = null, bodyM = null; RuntimeAnimatorController idle = null;
#endif
            PlayerCharacter made = null;
            string madeOrigin = "-";
            var model = new CreationModel { BodyF = bodyF, BodyM = bodyM, Idle = idle, Rng = new SecondFace.Core.Rng(3), Done = (pc, o) => { made = pc; madeOrigin = o; } };
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var screen = _ui.Open(new CreationScreen(model));
            for (var i = 0; i < 6; i++) yield return null;
            Assert.That(screen.Figure, Is.Not.Null, "the live figure");
            Assert.That(screen.Figure.Body.name, Does.Contain("player_f"));
            var origins = Creation.Origins();
            Assert.That(screen.Content.Query<Button>(className: "sf-creation__choice").ToList().Count(b => b.name.StartsWith("origin-")), Is.EqualTo(origins.Count + 1), "the origins and someone of your own");
            Press(screen.Content.Q<Button>("origin-" + origins[2].Id));
            Assert.That(screen.Creation.Origin, Is.EqualTo(origins[2].Id));
            screen.Content.Q<TextField>("name").value = "Ash Corran";
            Assert.That(screen.Creation.Sheet.Name, Is.EqualTo("Ash Corran"));
            Press(screen.Content.Q<Button>("pronoun-she"));
            Assert.That(screen.Creation.Pronouns, Is.EqualTo("she"));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(Save(_rt, "ui_create_who"), Is.GreaterThan(0.95f));

            screen.Show("face");
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(screen.Figure.Close, Is.True, "the face fills the frame");
            var before = Pixels(screen.Figure.Texture);
            var sliders = screen.Content.Query<Slider>().ToList();
            Assert.That(sliders.Count, Is.EqualTo(Sculpt.Sliders.Count(x => x.Group == "head")));
            screen.Content.Q("slider-head-scale-horiz").Q<Slider>().value = 1f;
            screen.Content.Q("slider-head-fat").Q<Slider>().value = -1f;
            Assert.That(screen.Creation.Look.Face["head-scale-horiz"], Is.EqualTo(1f));
            Assert.That(screen.Figure.Face.Values["head-scale-horiz"], Is.EqualTo(1f), "the slider moves the face");
            Press(screen.Content.Q<Button>("group-nose"));
            Assert.That(screen.Content.Query<Slider>().ToList().Count, Is.EqualTo(Sculpt.Sliders.Count(x => x.Group == "nose")));
            var face = new Dictionary<string, float>(screen.Creation.Look.Face);
            Press(screen.Content.Q<Button>("c-another_face"));
            Assert.That(Sculpt.Distance(face, screen.Creation.Look.Face), Is.GreaterThanOrEqualTo(Faces.RedrawDistance), "another face, a different one");
            for (var i = 0; i < 3; i++) yield return null;
            screen.DrawFigure();
            yield return null;
            Assert.That(Changed(before, Pixels(screen.Figure.Texture)), Is.GreaterThan(0.02f), "the face changed on the figure");
            Save(_rt, "ui_create_face");

            screen.Show("look");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(screen.Figure.Close, Is.True);
            var plain = Pixels(screen.Figure.Texture);
            screen.Content.Q("slider-tone").Q<Slider>().value = 0.55f;
            Press(screen.Content.Q<Button>("scar-cheek_slash"));
            Press(screen.Content.Q<Button>("tattoo-tally_cheek"));
            Press(screen.Content.Q<Button>("hair-" + Looks.HairColours[4].ToString("x6")));
            Press(screen.Content.Q<Button>("eyes-blue"));
            Press(screen.Content.Q<Button>("hair-sf_matted"));
            var wardrobe = screen.Figure.Wardrobe;
            Assert.That(wardrobe.Wearing.TryGetValue("hair", out var piece) && piece == "sf_matted", Is.True, "the matted hair is worn");
            Assert.That(screen.Figure.Body.GetComponentsInChildren<Renderer>(true).Where(r => r.name.StartsWith("Hair_")).All(r => !r.enabled), Is.True, "the body's own hair goes");
            Assert.That(screen.Figure.Body.GetComponentsInChildren<Renderer>(true).All(r => r.gameObject.layer == Studio.Layer), Is.True,
                "the hair piece is on the studio's layer (drawn in the figure)");
            var look = screen.Creation.Look;
            Assert.That(look.Scar, Is.EqualTo("cheek_slash"));
            Assert.That(look.Tattoo, Is.EqualTo("tally_cheek"));
            Assert.That(look.Eyes, Is.EqualTo("blue"));
            var skin = screen.Figure.Body.GetComponentsInChildren<SkinnedMeshRenderer>(true).First(r => r.name == "Body_LOD0");
            var block = new MaterialPropertyBlock();
            skin.GetPropertyBlock(block);
            Assert.That(block.GetFloat("_Scar"), Is.EqualTo(System.Array.IndexOf(Looks.Scars, "cheek_slash")), "the scar reaches the skin");
            Assert.That(skin.sharedMaterial.GetTexture("_RestMap"), Is.Not.Null, "the head frame is baked (Second Face/Build player wardrobes)");
            for (var i = 0; i < 2; i++) yield return null;
            screen.DrawFigure();
            yield return null;
            Assert.That(Changed(plain, Pixels(screen.Figure.Texture)), Is.GreaterThan(0.05f), "skin, hair, eyes and marks on the figure");
            Save(_rt, "ui_create_look");
            Save(screen.Figure.Texture, "ui_create_look_face");
            // every hair on the first body (evidence; each drawn in the close-up)
            foreach (var h in Looks.Hair)
            {
                Press(screen.Content.Q<Button>("hair-" + h));
                for (var i = 0; i < 2; i++) yield return null;
                screen.DrawFigure();
                yield return null;
                Save(screen.Figure.Texture, "ui_create_hair_f_" + h);
            }
            Press(screen.Content.Q<Button>("hair-sf_matted"));

            screen.Show("body");
            Press(screen.Content.Q<Button>("body-m"));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(screen.Figure.Body.name, Does.Contain("player_m"), "the other body");
            Assert.That(screen.Figure.Face.Values.Count, Is.GreaterThan(0), "the face carried over");
            Assert.That(screen.Figure.Wardrobe.Wearing.TryGetValue("hair", out var carried) && carried == "sf_matted", Is.True, "the hair carried over");
            screen.Show("look");
            foreach (var h in Looks.Hair)
            {
                Press(screen.Content.Q<Button>("hair-" + h));
                for (var i = 0; i < 2; i++) yield return null;
                screen.DrawFigure();
                yield return null;
                Save(screen.Figure.Texture, "ui_create_hair_m_" + h);
            }
            Press(screen.Content.Q<Button>("hair-sf_matted"));
            screen.Show("body");
            for (var i = 0; i < 2; i++) yield return null;
            var dye = screen.Content.Query<Button>(className: "sf-creation__swatch").ToList().First(b => b.name.StartsWith("dye-top-") && !b.name.EndsWith("ffffff"));
            Press(dye);
            Assert.That(screen.Creation.Look.Dyes.ContainsKey("top"), Is.True);
            screen.Content.Q("slider-height").Q<Slider>().value = 0.8f;
            Assert.That(screen.Figure.Scale, Is.GreaterThan(1.04f));
            var slim = Pixels(screen.Figure.Texture);
            screen.Content.Q("slider-build").Q<Slider>().value = 1f;
            screen.Content.Q("slider-muscle").Q<Slider>().value = 0.8f;
            Assert.That(screen.Figure.Face.Values["body-weight"], Is.EqualTo(1f), "the build reaches the body's shapes");
            for (var i = 0; i < 2; i++) yield return null;
            screen.DrawFigure();
            yield return null;
            Assert.That(Changed(slim, Pixels(screen.Figure.Texture)), Is.GreaterThan(0.01f), "a heavier body, clothes and all");
            for (var i = 0; i < 3; i++) yield return null;
            Save(_rt, "ui_create_body");

            screen.Show("attributes");
            Press(screen.Content.Q<Button>("c-roll"));
            Assert.That(screen.Creation.Rolled, Is.True);
            Press(screen.Content.Q<Button>("c-keep"));
            Press(screen.Content.Q<Button>("c-roll"));
            Press(screen.Content.Q<Button>("c-recall"));
            Assert.That(screen.Creation.Pool, Is.EqualTo(screen.Creation.Kept.Value.Pool));
            var lowered = Rules.Attributes.First(a => screen.Creation.Sheet.BaseAttrs[a] > Rules.AttrMin);
            Press(screen.Content.Q<Button>("lower-" + lowered));
            Assert.That(screen.Creation.PointsLeft, Is.EqualTo(1));
            for (var i = 0; i < 3; i++) yield return null;
            Save(_rt, "ui_create_attributes");
            Press(screen.Content.Q<Button>("raise-" + lowered));

            screen.Show("skills");
            Assert.That(screen.Content.Query<Button>().ToList().Count(b => b.name.StartsWith("tag-")), Is.EqualTo(Rules.Skills.Length));
            for (var i = 0; i < 3; i++) yield return null;
            Save(_rt, "ui_create_skills");

            screen.Show("begin");
            Assert.That(screen.Creation.Ready, Is.True, string.Join(", ", screen.Creation.Missing()));
            Press(screen.Content.Q<Button>("begin"));
            Assert.That(made, Is.Not.Null, "the player was made");
            Assert.That(made.Sheet.Name, Is.EqualTo("Ash Corran"));
            Assert.That(madeOrigin, Is.Null, "points moved by hand: someone of their own");
            Assert.That(PlayerLook.From(made.Appearance).Body, Is.EqualTo("m"));
            Assert.That(screen.IsOpen, Is.False);
            Assert.That(screen.Figure, Is.Null);
        }

        /// <summary>P5.3j: the title (continue with the last save, new game, load, settings), the settings (a text size
        /// re-sets every word, contrast, the camera's turn; kept beside the saves), the saves (cards with their pictures;
        /// load one; save to an empty slot, and over a used one after asking) and the pause (time stops while it is open).</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator TitleSettingsSavesAndPause()
        {
            var dir = Path.Combine(Application.temporaryCachePath, "ui-saves-test");
            if (Directory.Exists(dir)) Directory.Delete(dir, true);
            var session = new SecondFace.Game.Play.Session(new SecondFace.Core.Save.DirectoryBackend(dir));
            var picture = new Texture2D(64, 36, TextureFormat.RGB24, false);
            var px = new Color[64 * 36];
            for (var i = 0; i < px.Length; i++) px[i] = Color.Lerp(new Color(0.55f, 0.45f, 0.3f), new Color(0.75f, 0.8f, 0.85f), (i / 64) / 36f);
            picture.SetPixels(px);
            picture.Apply();
            var thumb = System.Convert.ToBase64String(picture.EncodeToJPG(80));
            Object.Destroy(picture);
            var state = States.NewGame("shale", 0, 0);
            state.Pc.Sheet.Name = "Ash Corran";
            state.Minutes = 2 * 1440 + 14 * 60 + 20;
            state.PlaytimeSec = 2 * 3600 + 12 * 60;
            session.Write("auto", state, new SecondFace.Core.Save.SaveMeta { Label = "Ash Corran", LocationId = "shale", LocationName = "Shale", Minutes = state.Minutes, PlaytimeSec = state.PlaytimeSec, Thumb = thumb });
            session.Write("slot1", state, new SecondFace.Core.Save.SaveMeta { Label = "Ash Corran", LocationId = "shale", LocationName = "Shale", Minutes = state.Minutes - 300, PlaytimeSec = state.PlaytimeSec - 900, Thumb = thumb });
            Assert.That(session.List().Keys, Is.EquivalentTo(new[] { "auto", "slot1" }));

            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            _ui.Root.Insert(0, World());
            session.SettingsChanged += s => _ui.Present(System.Array.IndexOf(SecondFace.Core.Save.Settings.TextScales, s.TextScale), s.HighContrast);
            // the title
            var chose = "";
            var latest = session.Latest();
            var title = _ui.Open(new TitleScreen(new TitleModel
            {
                Latest = latest, AnySave = true, Status = () => "RAISING THE WORLD… 12 chunks",
                Continue = () => chose = "continue", NewGame = () => chose = "new", Load = () => chose = "load", Settings = () => chose = "settings",
            }));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(latest, Is.Not.Null, "the last written");
            Assert.That(title.ContinueButton, Is.Not.Null, "continue, with a save to continue");
            Assert.That(title.ContinueButton.Q<Label>(className: "sf-start__choice-sub").text, Does.Contain("Ash Corran").And.Contain("Shale"));
            Press(title.ContinueButton);
            Assert.That(chose, Is.EqualTo("continue"));
            Press(title.NewButton);
            Assert.That(chose, Is.EqualTo("new"));
            Assert.That(title.Root.Q<Label>("title-status").text, Does.Contain("RAISING"));
            Assert.That(Save(_rt, "ui_title"), Is.GreaterThan(0.95f));
            Assert.That(_ui.Back(), Is.True);
            Assert.That(title.IsOpen, Is.True, "the back gesture leaves the title");

            // the settings: a larger size re-sets the words; contrast; the camera; kept beside the saves
            var settings = _ui.Open(new SettingsScreen(() => session.Settings, edit => session.Change(edit)));
            for (var i = 0; i < 3; i++) yield return null;
            var heading = settings.Root.Q<Label>(className: "sf-menu__title");
            var size = heading.resolvedStyle.fontSize;
            Press(settings.Root.Q<Button>("text-1.3"));
            Press(settings.Root.Q<Button>("contrast-on"));
            Press(settings.Root.Q<Button>("turn-1.5"));
            Press(settings.Root.Q<Button>("invert-on"));
            Press(settings.Root.Q<Button>("difficulty-story"));
            for (var i = 0; i < 3; i++) yield return null;
            heading = settings.Root.Q<Label>(className: "sf-menu__title");
            Assert.That(heading.resolvedStyle.fontSize, Is.EqualTo(size * 1.3f).Within(1f), "the words are larger");
            Assert.That(_ui.Root.ClassListContains("sf-contrast"), Is.True);
            Assert.That(settings.Root.Q<Button>("text-1.3").ClassListContains("sf-creation__choice--on"), Is.True, "the page shows what is chosen");
            var kept = SecondFace.Core.Save.Settings.Parse(System.IO.File.ReadAllText(Path.Combine(dir, "settings.json")));
            Assert.That((kept.TextScale, kept.HighContrast, kept.TurnSpeed, kept.InvertTurn, kept.Difficulty), Is.EqualTo((1.3f, true, 1.5f, true, "story")), "kept");
            Assert.That(new SecondFace.Game.Play.Session(new SecondFace.Core.Save.DirectoryBackend(dir)).Settings.TextScale, Is.EqualTo(1.3f), "and read again");
            Assert.That(Save(_rt, "ui_settings_large"), Is.GreaterThan(0.95f));
            Press(settings.Root.Q<Button>("text-1"));
            Press(settings.Root.Q<Button>("contrast-off"));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(settings.Root.Q<Label>(className: "sf-menu__title").resolvedStyle.fontSize, Is.EqualTo(size).Within(0.5f), "and back");
            Assert.That(Save(_rt, "ui_settings"), Is.GreaterThan(0.95f));
            settings.Close();

            // the saves: loading lists the filled slots, the autosave first
            string loaded = null;
            var saved = new List<string>();
            SecondFace.Core.Save.SaveMeta SaveNow(string slot)
            {
                saved.Add(slot);
                return session.Write(slot, state, new SecondFace.Core.Save.SaveMeta { Label = "Ash Corran", LocationName = "Shale", Minutes = state.Minutes + 60, PlaytimeSec = state.PlaytimeSec + 600, Thumb = thumb }).Meta;
            }
            var load = _ui.Open(new SavesScreen(new SavesModel { Session = session, Saving = false, Load = slot => loaded = slot, Save = SaveNow }));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(load.Cards.Keys, Is.EqualTo(new[] { "auto", "slot1" }));
            Assert.That(load.Cards["auto"].Q<Image>().image, Is.Not.Null, "the slot's picture");
            Assert.That(Save(_rt, "ui_saves_load"), Is.GreaterThan(0.95f));
            Press(load.Cards["slot1"]);
            Assert.That(loaded, Is.EqualTo("slot1"));
            load.Close();
            // saving: the quick slot and three by hand; an empty one at once, a used one after asking
            var save = _ui.Open(new SavesScreen(new SavesModel { Session = session, Saving = true, Load = slot => loaded = slot, Save = SaveNow }));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(save.Cards.Keys, Is.EqualTo(new[] { "quick", "slot1", "slot2", "slot3" }));
            Press(save.Cards["slot2"]);
            Assert.That(saved, Is.EqualTo(new[] { "slot2" }), "an empty slot saves at once");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(save.Cards["slot2"].ClassListContains("sf-saves__card--empty"), Is.False, "and shows what it holds");
            Press(save.Cards["slot1"]);
            Assert.That(_ui.Top, Is.InstanceOf<ConfirmScreen>(), "a used one asks first");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(Save(_rt, "ui_saves_overwrite"), Is.GreaterThan(0.95f));
            Press(_ui.Top.Root.Q<Button>("confirm-yes"));
            Assert.That(saved, Is.EqualTo(new[] { "slot2", "slot1" }));
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(Save(_rt, "ui_saves"), Is.GreaterThan(0.95f));
            save.Close();
            title.Close();

            // the pause: time stops while it is open
            var paused = _ui.Open(new PauseScreen(new PauseModel { Line = TitleScreen.Describe(session.Latest()), Save = () => { }, Load = () => { }, Settings = () => { }, Quit = () => chose = "quit" }));
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(Time.timeScale, Is.EqualTo(0f), "the world stops");
            Assert.That(Save(_rt, "ui_pause"), Is.GreaterThan(0.95f));
            Press(paused.Root.Q<Button>("pause-quit"));
            Assert.That(chose, Is.EqualTo("quit"));
            Press(paused.Root.Q<Button>("pause-resume"));
            Assert.That(paused.IsOpen, Is.False);
            Assert.That(Time.timeScale, Is.EqualTo(1f), "and goes on");
            Directory.Delete(dir, true);
        }

        /// <summary>P5.3l: photo mode's controls (hour, face, lens, look at, frame) over the view, the frame's bands, hide and
        /// show, a picture that could not be taken saying so.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator PhotoControlsAndFrames()
        {
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            _ui.Root.Insert(0, World());
            var host = new GameObject("photo mode (no game)");
            var mode = host.AddComponent<SecondFace.Game.Play.PhotoMode>();
            var closed = false;
            var screen = _ui.Open(new PhotoScreen(mode, () => closed = true));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(screen.Root.Query<Button>(className: "sf-photo__chip").ToList().Count(b => b.name.StartsWith("face-")), Is.EqualTo(Expressions.Names.Length));
            screen.Root.Q<Slider>("photo-hour").value = 18.5f;
            Assert.That(mode.Hour, Is.EqualTo(18.5f).Within(0.01f));
            Press(screen.Root.Q<Button>("face-half_smile"));
            Assert.That(mode.Face, Is.EqualTo("half_smile"));
            Assert.That(screen.Root.Q<Button>("face-half_smile").ClassListContains("sf-photo__chip--on"), Is.True);
            Press(screen.Root.Q<Button>("look-face"));
            Assert.That(mode.OnFace, Is.True);
            screen.Root.Q<Slider>("photo-lens").value = 40f;
            Assert.That(mode.Lens, Is.EqualTo(40f).Within(0.01f));
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(Save(_rt, "ui_photo"), Is.GreaterThan(0.95f));
            Press(screen.Root.Q<Button>("frame-wide"));
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(screen.Root.Q("photo-bands").childCount, Is.EqualTo(2), "bands above and below a wide frame");
            Press(screen.Root.Q<Button>("frame-portrait"));
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(screen.Root.Q("photo-bands").childCount, Is.EqualTo(2), "and beside an upright one");
            Assert.That(Save(_rt, "ui_photo_upright"), Is.GreaterThan(0.95f));
            Assert.That(screen.TakePicture(), Is.Null, "no camera here: no picture");
            Assert.That(screen.Root.Q<Label>("photo-note").text, Is.EqualTo(Strings.Get("photo.not_taken")));
            Press(screen.Root.Q<Button>("photo-hide"));
            Assert.That(screen.ControlsHidden, Is.True);
            Assert.That(screen.Root.Q("photo-panel").style.display.value, Is.EqualTo(DisplayStyle.None));
            Press(screen.Root.Q<Button>("photo-show"));
            Assert.That(screen.ControlsHidden, Is.False);
            Press(screen.Root.Q<Button>("photo-done"));
            Assert.That(closed, Is.True, "done closes photo mode");
            Object.Destroy(host);
        }

        /// <summary>P6.1: a container opened: its things beside the pack, a tap takes a stack and puts one back, take all
        /// empties it (the Tolls too), the weight carried under the pack.</summary>
        [UnityTest, Timeout(900000)]
        public IEnumerator LootTakesAndPuts()
        {
            var g = Kitted();
            var crate = new Inventory();
            foreach (var (id, n) in new[] { ("c_jerky", 2), ("c_water", 2), ("a_9mm", 8), ("j_cloth", 3) }) Inv.AddItem(crate, Inv.MakeItem(id, n));
            crate.Tolls = 12;
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var loot = _ui.Open(new LootScreen(new LootModel { Name = "Caravan Crate", Container = crate, Pc = g.Pc }));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(loot.Theirs.Count, Is.EqualTo(4));
            var carried = g.Pc.Inventory.Items.Count;
            Assert.That(loot.Yours.Count, Is.EqualTo(carried));
            Assert.That(loot.Root.Q<Label>("weight").text, Does.Contain("kg"));
            Assert.That(Save(_rt, "ui_loot"), Is.GreaterThan(0.95f));
            Press(loot.Theirs[0]);
            Assert.That(Inv.CountItem(g.Pc.Inventory, "c_jerky"), Is.EqualTo(2), "a tap takes the stack");
            Assert.That(loot.Theirs.Count, Is.EqualTo(3));
            Press(loot.Yours[loot.Yours.Count - 1]);
            Assert.That(crate.Items.Count, Is.EqualTo(4), "and a tap in the pack puts one back");
            Press(loot.Root.Q<Button>("take-all"));
            Assert.That(crate.Items, Is.Empty, "take all");
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(37 + 12), "the Tolls too");
            Assert.That(loot.Root.Q<Button>("take-all").enabledSelf, Is.False, "nothing left to take");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(Save(_rt, "ui_loot_taken"), Is.GreaterThan(0.95f));
            Press(loot.Root.Q<Button>("done"));
            Assert.That(loot.IsOpen, Is.False);
        }

        /// <summary>P6.1: the pack drops what is carried on the ground (one, or the whole stack), says so, and keeps keys
        /// and papers; with no world under it, nothing is offered.</summary>
        [UnityTest]
        public IEnumerator PackDropsWhatIsCarried()
        {
            var g = Kitted();
            var inv = g.Pc.Inventory;
            Inv.AddItem(inv, Inv.MakeItem("k_ring", 1));
            var dropped = new List<(int, int)>();
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var pack = _ui.Open(new PackScreen(new PackModel
            {
                Game = g, Fit = "m",
                Drop = (i, n) => { dropped.Add((i, n)); return Ground.Drop(g, inv, i, n, 10f, 0f, 10f) != null; },
            }));
            for (var i = 0; i < 3; i++) yield return null;
            pack.Select(inv.Items.FindIndex(i => i.Def == "c_bandage"));
            yield return null;
            Assert.That(pack.Actions.Q<Button>("act-drop"), Is.Not.Null, "drop one");
            Assert.That(pack.Actions.Q<Button>("act-drop_all"), Is.Not.Null, "and the whole stack");
            Press(pack.Actions.Q<Button>("act-drop"));
            Assert.That(Inv.CountItem(inv, "c_bandage"), Is.EqualTo(2));
            Assert.That(pack.Message.text, Does.EndWith("left on the ground."));
            Assert.That(pack.Chosen?.Def, Is.EqualTo("c_bandage"), "the rest of the stack still chosen");
            Press(pack.Actions.Q<Button>("act-drop_all"));
            Assert.That(Inv.CountItem(inv, "c_bandage"), Is.EqualTo(0));
            Assert.That(Ground.Piles(g).Single().Inv.Items.Single().Qty, Is.EqualTo(3), "into one pile");
            Assert.That(dropped.Count, Is.EqualTo(2));
            pack.Select(inv.Items.FindIndex(i => i.Def == "k_ring"));
            yield return null;
            Assert.That(pack.Actions.Q<Button>("act-drop"), Is.Null, "a key is kept");
            pack.Close();
            var plain = _ui.Open(new PackScreen(new PackModel { Game = g, Fit = "m" }));
            yield return null;
            plain.Select(inv.Items.FindIndex(i => i.Def == "c_water"));
            yield return null;
            Assert.That(plain.Actions.Q<Button>("act-drop"), Is.Null, "no ground under it, no drop");
            plain.Close();
        }

        /// <summary>P6.1: the camp's page: rest, hunt and snares, cook, mend, write (in a town), each saying what came of it
        /// and passing the game's time; the world waits while it is open.</summary>
        [UnityTest]
        public IEnumerator CampRestsCooksMendsAndWrites()
        {
            var g = Kitted();
            var inv = g.Pc.Inventory;
            foreach (var (id, n) in new[] { ("c_meat", 2), ("t_repair", 1), ("c_jerky", 1) }) Inv.AddItem(inv, Inv.MakeItem(id, n));
            Inv.Equip(inv, inv.Items.FindIndex(i => i.Def == "r_duster"));
            inv.EquippedAt("body").Cond = 0.5;
            g.Pc.Sheet.Hp = 4;
            g.World.MetPeople["npc_c9_01"] = new Met { Name = "Ines", Day = 1, Where = "cistern9" };
            g.SetFlag("visited_shale", true);
            _ui = Offscreen(1600, 720, out _rt);
            _ui.SafeAreaOverride = new Rect(0.05f, 0.04f, 0.95f, 0.96f);
            var camp = _ui.Open(new CampScreen(new CampModel { Game = g, Where = "Shale", Abundance = 0.5, TrapsAt = "shale", Town = true }));
            for (var i = 0; i < 3; i++) yield return null;
            Assert.That(Time.timeScale, Is.EqualTo(0f), "the world waits while camp is made");
            foreach (var name in new[] { "rest-1", "rest-4", "rest-8", "rest-until", "hunt", "traps-set", "cook", "mend-body", "write", "camp-break" })
                Assert.That(camp.Root.Q<Button>(name), Is.Not.Null, name);
            Assert.That(camp.Root.Q<Label>("camp-health").text, Does.Contain("Health 4 of"));
            Assert.That(camp.Root.Q<Button>("rest-until").text, Is.EqualTo("Until evening (11 h)"), "by day, until the evening");
            Assert.That(Save(_rt, "ui_camp"), Is.GreaterThan(0.95f));
            var m0 = g.Minutes;
            Press(camp.Root.Q<Button>("rest-8"));
            Assert.That(g.Minutes, Is.EqualTo(m0 + 480), "a night");
            Assert.That(g.Pc.Sheet.Hp, Is.GreaterThan(4));
            Assert.That(camp.Said, Does.StartWith("You rest 8 hours"));
            Press(camp.Root.Q<Button>("cook"));
            Assert.That(Inv.CountItem(inv, "c_meat"), Is.EqualTo(0), "the meat cooked");
            Assert.That(camp.Said, Is.EqualTo("You cook what you have."));
            Press(camp.Root.Q<Button>("mend-body"));
            Assert.That(inv.EquippedAt("body").Cond, Is.EqualTo(0.85).Within(1e-6), "mended");
            Assert.That(camp.Root.Q<Button>("mend-body"), Is.Null, "no kit left to mend with");
            Press(camp.Root.Q<Button>("traps-set"));
            Assert.That(Camp.Traps(g, "shale"), Is.Not.Null, "the snares out");
            Assert.That(camp.Root.Q<Button>("traps-check"), Is.Not.Null, "and to be checked");
            for (var i = 0; i < 2; i++) yield return null;
            Assert.That(Save(_rt, "ui_camp_done"), Is.GreaterThan(0.95f));
            Press(camp.Root.Q<Button>("write"));
            for (var i = 0; i < 2; i++) yield return null;
            var letter = camp.Root.Q<Button>("letter-let_ines_shale");
            Assert.That(letter, Is.Not.Null, "a letter to someone met");
            Assert.That(Save(_rt, "ui_camp_write"), Is.GreaterThan(0.95f));
            Press(letter);
            Assert.That(g.World.Letters.Any(l => l.Id == "let_ines_shale"), Is.True, "sent");
            Assert.That(camp.Said, Does.StartWith("Your letter to"));
            Assert.That(camp.Root.Q<Button>("rest-8"), Is.Not.Null, "back to the camp's page");
            Press(camp.Root.Q<Button>("camp-break"));
            Assert.That(camp.IsOpen, Is.False);
            Assert.That(Time.timeScale, Is.EqualTo(1f), "the world moves again");
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
