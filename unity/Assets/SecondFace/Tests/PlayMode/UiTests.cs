using System.Collections;
using System.IO;
using NUnit.Framework;
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
    /// (`ui_page`), and closing the bottom screen closes those over it.
    /// </summary>
    public class UiTests : IPrebuildSetup
    {
        public const string AssetPath = "Assets/SecondFace/UI/UIAssets.asset";

        public void Setup()
        {
#if UNITY_EDITOR
            EditorApplication.ExecuteMenuItem("Second Face/Build UI assets");
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
