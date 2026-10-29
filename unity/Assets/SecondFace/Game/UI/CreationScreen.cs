using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Game.People;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What character creation works with: the rules' state, the two bodies, the idle, the dice, and what
    /// happens when the player begins.</summary>
    public sealed class CreationModel
    {
        public Creation Creation = Creation.Start();
        public GameObject BodyF, BodyM;
        public RuntimeAnimatorController Idle;
        public Rng Rng = new();
        /// <summary>The player as made and the origin they came from (null when made from scratch).</summary>
        public Action<PlayerCharacter, string> Done;
    }

    /// <summary>
    /// Character creation (P5.3i, DESIGN §4, DESIGN_UNITY §6 "the sculptor is a full screen with the live face"): the
    /// player's body stands on the left under the studio light (framed on the face while the face is made; a drag turns
    /// them), the pages on the right: who (an origin or someone of your own, a name, pronouns), the face (the sculptor's
    /// sliders by feature, another face, an even one), the look (the skin's tone, undertone and freckles, the hair's
    /// colour, the eyes', a scar, a tattoo), the body (body type, height, the clothes' dyes), the attributes
    /// (the standard spread or the rolled start: roll, keep, recall, then move points), skills and traits (three tags, up
    /// to two traits), and begin (what is still missing, then begin). The rules are Core <see cref="Creation"/>.
    /// </summary>
    public sealed class CreationScreen : UIScreen
    {
        public static readonly string[] Pages = { "who", "face", "look", "body", "attributes", "skills", "begin" };

        private readonly CreationModel _m;
        private readonly Dictionary<string, Button> _tabs = new();
        private ScrollView _scroll;
        private VisualElement _page;
        private Image _figureImage;
        private Label _caption;
        private IVisualElementScheduledItem _breath;
        private string _faceGroup = Sculpt.Groups[0];
        private bool _dragging;
        private float _dragX;

        public string Page { get; private set; } = "who";
        public Figure Figure { get; private set; }
        public Creation Creation => _m.Creation;
        public VisualElement Content => _page;
        public Button Tab(string page) => _tabs.TryGetValue(page, out var b) ? b : null;
        public Image FigureImage => _figureImage;

        public CreationScreen(CreationModel model) { _m = model; }

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-creation");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var body = new VisualElement();
            body.AddToClassList("sf-creation__body");
            safe.Add(body);

            var stage = new VisualElement { name = "stage" };
            stage.AddToClassList("sf-creation__stage");
            _figureImage = new Image { name = "figure", scaleMode = ScaleMode.ScaleAndCrop };
            _figureImage.AddToClassList("sf-pack__figure");
            stage.Add(_figureImage);
            _caption = new Label { name = "caption", pickingMode = PickingMode.Ignore };
            _caption.AddToClassList("sf-creation__caption");
            stage.Add(_caption);
            stage.RegisterCallback<PointerDownEvent>(e => { _dragging = true; _dragX = e.position.x; });
            stage.RegisterCallback<PointerMoveEvent>(e =>
            {
                if (!_dragging || Figure == null) return;
                Figure.Yaw += (e.position.x - _dragX) * 0.6f;
                _dragX = e.position.x;
                DrawFigure();
            });
            stage.RegisterCallback<PointerUpEvent>(_ => _dragging = false);
            stage.RegisterCallback<PointerLeaveEvent>(_ => _dragging = false);
            body.Add(stage);

            var paper = new VisualElement();
            paper.AddToClassList("sf-creation__paper");
            var tabs = new VisualElement();
            tabs.AddToClassList("sf-creation__tabs");
            foreach (var p in Pages)
            {
                var page = p;
                var tab = new Button(() => Show(page)) { name = "tab-" + p };
                tab.AddToClassList("sf-creation__tab");
                Strings.Bind(tab, "create." + p);
                tabs.Add(tab);
                _tabs[p] = tab;
            }
            paper.Add(tabs);
            _scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            _scroll.AddToClassList("sf-creation__scroll");
            _page = new VisualElement { name = "page" };
            _scroll.Add(_page);
            paper.Add(_scroll);
            body.Add(paper);
            return root;
        }

        protected internal override void Shown()
        {
            MakeFigure();
            Show(Page);
        }

        protected internal override void Hidden()
        {
            _breath?.Pause();
            _breath = null;
            Figure?.Dispose();
            Figure = null;
        }

        private void MakeFigure()
        {
            Figure?.Dispose();
            var prefab = Creation.Look.Body == "m" ? _m.BodyM : _m.BodyF;
            Figure = Figure.Create(prefab, _m.Idle, 720, 800);   // about the stage's own shape: nothing cropped
            if (Figure == null) return;
            _figureImage.image = Figure.Texture;
            Restyle();
            _breath ??= Root.schedule.Execute(() => { if (!_dragging) DrawFigure(); }).Every(120);
        }

        /// <summary>The figure as the look now stands: the face, the height, the clothes and their dyes.</summary>
        private void Restyle()
        {
            if (Figure == null) return;
            var look = Creation.Look;
            var face = Figure.Face;
            if (face != null) face.Set(look.Face);   // not ?. on a component
            Figure.Scale = 1f + 0.06f * Mathf.Clamp(look.Height, -1f, 1f);
            var outfit = new Outfit { Layers = new List<GarmentLook>() };
            var wardrobe = Figure.Wardrobe;
            if (wardrobe != null && wardrobe.Set != null)
                foreach (var id in wardrobe.Set.Outfit)
                {
                    var g = wardrobe.Set.Find(id);
                    outfit.Layers.Add(new GarmentLook { Name = id, Dye = g != null && look.Dyes.TryGetValue(g.Slot, out var d) && d != 0xffffff ? d : null });
                }
            Figure.Dress(outfit);
            LookView.Apply(Figure.Body, look);
            DrawFigure();
            Root.schedule.Execute(DrawFigure).ExecuteLater(1);
        }

        public void DrawFigure()
        {
            if (Figure == null) return;
            Figure.Draw();
            _figureImage.MarkDirtyRepaint();
        }

        /// <summary>Turns to a page.</summary>
        public void Show(string page)
        {
            Page = page;
            foreach (var kv in _tabs) kv.Value.EnableInClassList("sf-creation__tab--on", kv.Key == page);
            if (Figure != null)
            {
                Figure.Close = page == "face" || page == "look";
                DrawFigure();
            }
            _page.Clear();
            switch (page)
            {
                case "who": Who(); break;
                case "face": Face(); break;
                case "look": LookPage(); break;
                case "body": BodyPage(); break;
                case "attributes": Attributes(); break;
                case "skills": Skills(); break;
                case "begin": Begin(); break;
            }
            _caption.text = string.IsNullOrWhiteSpace(Creation.Sheet.Name) ? "" : Creation.Sheet.Name;
            _scroll.scrollOffset = Vector2.zero;
        }

        private void Refresh() => Show(Page);

        // --- the pieces of a page ------------------------------------------------------------------------------

        private Label Heading(string key, params object[] args)
        {
            var l = new Label(Strings.Get(key, args));
            l.AddToClassList("sf-creation__heading");
            _page.Add(l);
            return l;
        }

        private Label Note(string text)
        {
            var l = new Label(text);
            l.AddToClassList("sf-creation__note");
            _page.Add(l);
            return l;
        }

        private static Button Choice(string text, bool on, Action act, string name = null, string sub = null)
        {
            var b = new Button(act) { name = name };
            b.AddToClassList("sf-creation__choice");
            b.EnableInClassList("sf-creation__choice--on", on);
            var t = new Label(text) { pickingMode = PickingMode.Ignore };
            t.AddToClassList("sf-creation__choice-text");
            b.Add(t);
            if (!string.IsNullOrEmpty(sub))
            {
                var s = new Label(sub) { pickingMode = PickingMode.Ignore };
                s.AddToClassList("sf-creation__choice-sub");
                b.Add(s);
            }
            return b;
        }

        private VisualElement Row(string cls = "sf-creation__row")
        {
            var r = new VisualElement();
            r.AddToClassList(cls);
            _page.Add(r);
            return r;
        }

        private Button Act(VisualElement into, string key, Action act, bool quiet = false, string name = null, params object[] args)
        {
            var b = new Button(act) { name = name ?? key.Replace("create.", "c-") };
            b.AddToClassList("sf-button");
            if (quiet) b.AddToClassList("sf-button--quiet");
            b.AddToClassList("sf-creation__action");
            b.text = Strings.Get(key, args);
            into.Add(b);
            return b;
        }

        private Slider Slider(string label, float min, float max, float value, Action<float> set, string name)
        {
            var row = new VisualElement { name = name };
            row.AddToClassList("sf-creation__slider");
            var l = new Label(label);
            l.AddToClassList("sf-creation__slider-label");
            row.Add(l);
            var s = new Slider(min, max) { value = value };
            s.AddToClassList("sf-creation__slider-bar");
            s.RegisterValueChangedCallback(e => set(e.newValue));
            row.Add(s);
            _page.Add(row);
            return s;
        }

        // --- who ---------------------------------------------------------------------------------------------------

        private void Who()
        {
            Heading("create.origin");
            var grid = Row("sf-creation__cards");
            foreach (var o in Creation.Origins())
            {
                var id = o.Id;
                grid.Add(Choice(o.Name, Creation.Origin == id, () => { Creation.Choose(id); Restyle(); Refresh(); }, "origin-" + id, o.Blurb));
            }
            grid.Add(Choice(Strings.Get("create.own"), Creation.Origin == null, () => { Creation.Custom(); Refresh(); }, "origin-own", Strings.Get("create.own_note")));

            Heading("create.name");
            var field = new TextField { name = "name", value = Creation.Sheet.Name ?? "", maxLength = 28 };
            field.AddToClassList("sf-creation__field");
            field.RegisterValueChangedCallback(e => { Creation.Sheet.Name = e.newValue; _caption.text = e.newValue; });
            _page.Add(field);

            Heading("create.pronouns");
            var row = Row();
            foreach (var p in new[] { "she", "he", "they" })
            {
                var pr = p;
                row.Add(Choice(Strings.Get("create.pronoun." + p), Creation.Pronouns == p, () => { Creation.Pronouns = pr; Refresh(); }, "pronoun-" + p));
            }
        }

        // --- the face ----------------------------------------------------------------------------------------------

        private void Face()
        {
            var actions = Row();
            Act(actions, "create.another_face", () => { Creation.Look.Face = Sculpt.Reroll(_m.Rng, Creation.Look.Face); Restyle(); Refresh(); });
            Act(actions, "create.even_face", () => { Creation.Look.Face = new Dictionary<string, float>(); Restyle(); Refresh(); }, quiet: true);
            var groups = Row("sf-creation__chips");
            foreach (var g in Sculpt.Groups)
            {
                var group = g;
                var chip = Choice(Strings.Get("face.group." + g), _faceGroup == g, () => { _faceGroup = group; Refresh(); }, "group-" + g);
                chip.AddToClassList("sf-creation__chip");
                groups.Add(chip);
            }
            foreach (var s in Sculpt.Sliders.Where(x => x.Group == _faceGroup))
            {
                var slider = s;
                var v = Creation.Look.Face.TryGetValue(s.Id, out var x) ? x : 0f;
                Slider(Strings.Get("face." + s.Id), s.Min, 1f, v, nv =>
                {
                    Creation.Look.Face[slider.Id] = nv;
                    var face = Figure != null ? Figure.Face : null;
                    if (face != null) face.Set(slider.Id, nv);
                    DrawFigure();
                }, "slider-" + s.Id);
            }
        }

        // --- the look ----------------------------------------------------------------------------------------------

        private void LookPage()
        {
            var look = Creation.Look;
            void Show() { if (Figure != null) { LookView.Apply(Figure.Body, look); DrawFigure(); } }
            Heading("create.skin");
            Slider(Strings.Get("create.tone"), -1f, 1f, look.Skin, v => { look.Skin = v; Show(); }, "slider-tone");
            Slider(Strings.Get("create.undertone"), -1f, 1f, look.Undertone, v => { look.Undertone = v; Show(); }, "slider-undertone");
            Slider(Strings.Get("create.freckles"), 0f, 1f, look.Freckles, v => { look.Freckles = v; Show(); }, "slider-freckles");
            Heading("create.hair");
            var hair = Row();
            hair.AddToClassList("sf-creation__swatches");
            foreach (var c in Looks.HairColours)
            {
                var colour = c;
                hair.Add(Swatch($"hair-{c:x6}", LookView.Colour(c), look.HairColour == c, () => { look.HairColour = colour; Show(); Refresh(); }));
            }
            Heading("create.eyes");
            var eyes = Row();
            eyes.AddToClassList("sf-creation__swatches");
            foreach (var (id, rgb) in Looks.Eyes)
            {
                var eye = id;
                eyes.Add(Swatch("eyes-" + id, LookView.Colour(rgb), look.Eyes == id, () => { look.Eyes = eye; Show(); Refresh(); }));
            }
            Heading("create.scar");
            Marks("scar", Looks.Scars, look.Scar, v => { look.Scar = v; Show(); Refresh(); });
            Heading("create.tattoo");
            Marks("tattoo", Looks.Tattoos, look.Tattoo, v => { look.Tattoo = v; Show(); Refresh(); });
        }

        private static Button Swatch(string name, Color colour, bool on, Action act)
        {
            var sw = new Button(act) { name = name };
            sw.AddToClassList("sf-creation__swatch");
            sw.EnableInClassList("sf-creation__swatch--on", on);
            sw.style.backgroundColor = colour;
            return sw;
        }

        private void Marks(string kind, string[] ids, string current, Action<string> set)
        {
            var row = Row("sf-creation__chips");
            var none = Choice(Strings.Get("create.none"), current == null, () => set(null), kind + "-none");
            none.AddToClassList("sf-creation__chip");
            row.Add(none);
            foreach (var id in ids)
            {
                var mark = id;
                var chip = Choice(Strings.Get(kind + "." + id), current == id, () => set(mark), kind + "-" + id);
                chip.AddToClassList("sf-creation__chip");
                row.Add(chip);
            }
        }

        // --- the body ----------------------------------------------------------------------------------------------

        private void BodyPage()
        {
            Heading("create.body_type");
            var row = Row();
            foreach (var b in new[] { "f", "m" })
            {
                var body = b;
                row.Add(Choice(Strings.Get("create.body." + b), Creation.Look.Body == b, () =>
                {
                    if (Creation.Look.Body == body) return;
                    Creation.Look.Body = body;
                    MakeFigure();
                    Refresh();
                }, "body-" + b));
            }
            Slider(Strings.Get("create.height"), -1f, 1f, Creation.Look.Height, v =>
            {
                Creation.Look.Height = v;
                if (Figure != null) { Figure.Scale = 1f + 0.06f * v; DrawFigure(); }
            }, "slider-height");
            Heading("create.clothes");
            var wardrobe = Figure != null ? Figure.Wardrobe : null;
            if (wardrobe == null || wardrobe.Set == null) return;
            foreach (var id in wardrobe.Set.Outfit)
            {
                var g = wardrobe.Set.Find(id);
                if (g == null || g.Slot == "feet") continue;
                var slot = g.Slot;
                var label = new Label(Strings.Get("create.dye." + slot));
                label.AddToClassList("sf-creation__slider-label");
                _page.Add(label);
                var swatches = Row();
                swatches.AddToClassList("sf-creation__swatches");
                var current = Creation.Look.Dyes.TryGetValue(slot, out var c) ? c : 0xffffff;
                foreach (var dye in Looks.Dyes)
                {
                    var colour = dye;
                    var sw = new Button(() => { Creation.Look.Dyes[slot] = colour; Restyle(); Refresh(); }) { name = $"dye-{slot}-{colour:x6}" };
                    sw.AddToClassList("sf-creation__swatch");
                    sw.EnableInClassList("sf-creation__swatch--on", current == colour);
                    sw.EnableInClassList("sf-creation__swatch--none", colour == 0xffffff);
                    sw.style.backgroundColor = colour == 0xffffff ? new Color(0.9f, 0.86f, 0.78f) : Dresser.Colour(colour);
                    swatches.Add(sw);
                }
            }
        }

        // --- the attributes ----------------------------------------------------------------------------------------

        private void Attributes()
        {
            var c = Creation;
            Heading(c.Rolled ? "create.rolled" : "create.standard", c.Pool);
            Note(Strings.Get("create.points_left", c.PointsLeft));
            var actions = Row();
            Act(actions, "create.roll", () => { c.Roll(_m.Rng); Refresh(); });
            var keep = Act(actions, "create.keep", () => { c.Keep(); Refresh(); }, quiet: true);
            keep.SetEnabled(c.Rolled);
            var recall = Act(actions, "create.recall", () => { c.Recall(); Refresh(); }, quiet: true, args: c.Kept?.Pool ?? 0);
            recall.SetEnabled(c.Kept != null);
            var standard = Act(actions, "create.standard_start", () => { c.Standard(); Refresh(); }, quiet: true);
            standard.SetEnabled(c.Rolled);
            foreach (var a in Rules.Attributes)
            {
                var attr = a;
                var row = Row("sf-creation__attr");
                row.name = "attr-" + a;
                var names = new VisualElement();
                names.AddToClassList("sf-creation__attr-names");
                var n = new Label(Strings.Get("attr." + a));
                n.AddToClassList("sf-creation__attr-name");
                names.Add(n);
                var d = new Label(Strings.Get("attr." + a + ".desc"));
                d.AddToClassList("sf-creation__attr-desc");
                names.Add(d);
                row.Add(names);
                var less = new Button(() => { if (c.Lower(attr)) Refresh(); }) { text = "−", name = "lower-" + a };
                less.AddToClassList("sf-button");
                less.AddToClassList("sf-button--quiet");
                less.AddToClassList("sf-creation__step");
                less.SetEnabled(c.Sheet.BaseAttrs[a] > Rules.AttrMin);
                row.Add(less);
                var v = new Label(c.Sheet.BaseAttrs[a].ToString()) { name = "value" };
                v.AddToClassList("sf-creation__attr-value");
                row.Add(v);
                var more = new Button(() => { if (c.Raise(attr)) Refresh(); }) { text = "+", name = "raise-" + a };
                more.AddToClassList("sf-button");
                more.AddToClassList("sf-button--quiet");
                more.AddToClassList("sf-creation__step");
                more.SetEnabled(c.PointsLeft > 0 && c.Sheet.BaseAttrs[a] < Rules.AttrCreationMax);
                row.Add(more);
            }
        }

        // --- skills and traits -------------------------------------------------------------------------------------

        private void Skills()
        {
            var c = Creation;
            Heading("create.tags", c.Sheet.Tagged.Count, Rules.TagCount);
            var grid = Row("sf-creation__cards");
            foreach (var k in Rules.Skills)
            {
                var skill = k;
                var b = Choice(Strings.Get("skill." + k), c.Sheet.Tagged.Contains(k), () => { c.Tag(skill); Refresh(); }, "tag-" + k,
                    Sheet.Skill(c.Sheet, k).ToString());
                b.AddToClassList("sf-creation__choice--small");
                grid.Add(b);
            }
            Heading("create.traits", c.Sheet.Traits.Count, Creation.MaxTraits);
            var traits = Row("sf-creation__cards");
            foreach (var t in Registry.Traits.Values)
            {
                var id = t.Id;
                traits.Add(Choice(t.Name, c.Sheet.Traits.Contains(id), () => { c.Trait(id); Refresh(); }, "trait-" + id, t.Desc));
            }
        }

        // --- begin -------------------------------------------------------------------------------------------------

        private void Begin()
        {
            var c = Creation;
            Heading("create.summary");
            var origin = c.Origin != null ? Creation.Origins().FirstOrDefault(o => o.Id == c.Origin)?.Name : Strings.Get("create.own");
            Note(string.IsNullOrWhiteSpace(c.Sheet.Name) ? Strings.Get("create.unnamed") : $"{c.Sheet.Name.Trim()} · {origin} · {Strings.Get("create.pronoun." + c.Pronouns)}");
            Note(string.Join("  ", Rules.Attributes.Select(a => $"{Strings.Get("attr." + a)} {c.Sheet.BaseAttrs[a]}")));
            if (c.Sheet.Tagged.Count > 0) Note(string.Join(", ", c.Sheet.Tagged.Select(k => Strings.Get("skill." + k))));
            if (c.Sheet.Traits.Count > 0) Note(string.Join(", ", c.Sheet.Traits.Select(t => Registry.Traits.TryGetValue(t, out var d) ? d.Name : t)));
            foreach (var m in c.Missing())
            {
                var l = Note(Strings.Get("create.missing." + m));
                l.AddToClassList("sf-creation__missing");
            }
            var row = Row();
            var begin = Act(row, "create.begin", () => Finish(), name: "begin");
            begin.AddToClassList("sf-creation__begin");
            begin.SetEnabled(c.Ready);
        }

        /// <summary>Makes the player and begins (false while something is missing).</summary>
        public bool Finish()
        {
            var pc = Creation.Finish();
            if (pc == null) { Show("begin"); return false; }
            var origin = Creation.Origin;
            Close();
            _m.Done?.Invoke(pc, origin);
            return true;
        }
    }
}
