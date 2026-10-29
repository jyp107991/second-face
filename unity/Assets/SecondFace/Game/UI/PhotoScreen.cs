using System;
using SecondFace.Core.Npc;
using SecondFace.Game.Play;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// Photo mode's controls (P5.3l): a narrow plate down the left over the stopped world (the hour, the face, the lens,
    /// body or face, the frame), and under the thumb: take, hide the controls, done. The frame shows as dark bands over
    /// the view where the picture will be cropped. Touches on the open view turn, pinch and pan the camera (nothing
    /// walks); the back gesture is done. A picture taken says so for a moment.
    /// </summary>
    public sealed class PhotoScreen : UIScreen
    {
        private readonly PhotoMode _mode;
        private readonly Action _done;
        private VisualElement _panel, _body, _bands, _shown;
        private Label _hour, _note;
        private IVisualElementScheduledItem _noteOff;

        public PhotoScreen(PhotoMode mode, Action done) { _mode = mode; _done = done; }

        public override bool Opaque => false;
        public override bool HidesHud => true;
        public override bool PassesTouches => true;

        /// <summary>The controls are hidden (only the show button and the frame stay).</summary>
        public bool ControlsHidden { get; private set; }

        protected internal override VisualElement Build()
        {
            var root = new VisualElement { pickingMode = PickingMode.Ignore };
            root.AddToClassList("sf-photo");
            _bands = new VisualElement { name = "photo-bands", pickingMode = PickingMode.Ignore };
            _bands.AddToClassList("sf-photo__bands");
            root.Add(_bands);
            _bands.RegisterCallback<GeometryChangedEvent>(_ => Bands());

            var safe = new VisualElement { pickingMode = PickingMode.Ignore };
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList("sf-photo__safe");
            root.Add(safe);
            _panel = new VisualElement { name = "photo-panel" };
            _panel.AddToClassList("sf-plate");
            _panel.AddToClassList("sf-photo__panel");
            safe.Add(_panel);
            var title = new Label(Strings.Get("photo.title"));
            title.AddToClassList("sf-photo__title");
            _panel.Add(title);
            // the controls scroll inside the plate when the screen is short (a wrapped row of chips in a fixed-height
            // column is laid out too short and overlaps what follows)
            var scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
            };
            scroll.AddToClassList("sf-photo__scroll");
            _panel.Add(scroll);
            _body = scroll.contentContainer;

            Heading("photo.hour");
            _hour = new Label();
            _hour.AddToClassList("sf-photo__value");
            var hour = new Slider(0f, 24f) { name = "photo-hour", value = _mode.Hour };
            hour.AddToClassList("sf-photo__slider");
            hour.RegisterValueChangedCallback(e => { _mode.SetHour(e.newValue); ShowHour(); });
            var hourRow = new VisualElement();
            hourRow.AddToClassList("sf-photo__row");
            hourRow.Add(hour);
            hourRow.Add(_hour);
            _body.Add(hourRow);
            ShowHour();

            Heading("photo.face");
            var faces = Chips();
            foreach (var f in Expressions.Names)
            {
                var face = f;
                faces.Add(Chip("face-" + f, Strings.Get("photo.face_" + f), () => _mode.Face == face, () => _mode.SetFace(face)));
            }

            Heading("photo.lens");
            var lens = new Slider(PhotoMode.LensMin, PhotoMode.LensMax) { name = "photo-lens", value = _mode.Lens };
            lens.AddToClassList("sf-photo__slider");
            lens.RegisterValueChangedCallback(e => _mode.SetLens(e.newValue));
            _body.Add(lens);

            Heading("photo.look_at");
            var look = Chips();
            look.Add(Chip("look-body", Strings.Get("photo.body"), () => !_mode.OnFace, () => _mode.LookAtFace(false)));
            look.Add(Chip("look-face", Strings.Get("photo.face_close"), () => _mode.OnFace, () => _mode.LookAtFace(true)));

            Heading("photo.frame");
            var frames = Chips();
            foreach (var f in PhotoMode.Frames)
            {
                var frame = f;
                frames.Add(Chip("frame-" + f, Strings.Get("photo.frame_" + f), () => _mode.Frame == frame, () => { _mode.SetFrame(frame); Bands(); }));
            }

            var actions = new VisualElement { name = "photo-actions" };
            actions.AddToClassList("sf-photo__actions");
            safe.Add(actions);
            var take = new Button(() => TakePicture()) { name = "photo-take", text = Strings.Get("photo.take") };
            take.AddToClassList("sf-photo__take");
            actions.Add(take);
            var hide = new Button(() => Hide(true)) { name = "photo-hide", text = Strings.Get("photo.hide") };
            hide.AddToClassList("sf-photo__small");
            actions.Add(hide);
            var done = new Button(Done) { name = "photo-done", text = Strings.Get("photo.done") };
            done.AddToClassList("sf-photo__small");
            actions.Add(done);

            _shown = new Button(() => Hide(false)) { name = "photo-show", text = Strings.Get("photo.show") };
            _shown.AddToClassList("sf-photo__small");
            _shown.AddToClassList("sf-photo__show");
            _shown.style.display = DisplayStyle.None;
            safe.Add(_shown);

            _note = new Label { name = "photo-note", pickingMode = PickingMode.Ignore };
            _note.AddToClassList("sf-photo__note");
            _note.style.display = DisplayStyle.None;
            root.Add(_note);
            return root;
        }

        private void Heading(string key)
        {
            var l = new Label(Strings.Get(key).ToUpperInvariant());
            l.AddToClassList("sf-photo__heading");
            _body.Add(l);
        }

        private VisualElement Chips()
        {
            var c = new VisualElement();
            c.AddToClassList("sf-photo__chips");
            _body.Add(c);
            return c;
        }

        private Button Chip(string name, string text, Func<bool> on, Action act)
        {
            var b = new Button(() => { act(); Refresh(); }) { name = name, text = text };
            b.AddToClassList("sf-photo__chip");
            b.userData = on;
            b.EnableInClassList("sf-photo__chip--on", on());
            return b;
        }

        /// <summary>Marks the chips chosen now.</summary>
        private void Refresh()
        {
            _panel.Query<Button>(className: "sf-photo__chip").ForEach(b =>
            {
                if (b.userData is Func<bool> on) b.EnableInClassList("sf-photo__chip--on", on());
            });
        }

        private void ShowHour()
        {
            var h = _mode.Hour;
            _hour.text = $"{(int)h:00}:{(int)(h % 1f * 60f):00}";
        }

        /// <summary>The dark bands outside the frame's crop.</summary>
        private void Bands()
        {
            _bands.Clear();
            var w = _bands.resolvedStyle.width;
            var h = _bands.resolvedStyle.height;
            if (float.IsNaN(w) || float.IsNaN(h) || w <= 0 || h <= 0) return;
            var screen = w / h;
            var aspect = PhotoMode.Aspect(_mode.Frame, screen);
            if (Mathf.Abs(aspect - screen) < 0.01f) return;
            if (aspect > screen)
            {
                var band = (h - w / aspect) / 2f;
                _bands.Add(Band(0, 0, w, band));
                _bands.Add(Band(0, h - band, w, band));
            }
            else
            {
                var band = (w - h * aspect) / 2f;
                _bands.Add(Band(0, 0, band, h));
                _bands.Add(Band(w - band, 0, band, h));
            }
        }

        private static VisualElement Band(float x, float y, float w, float h)
        {
            var e = new VisualElement { pickingMode = PickingMode.Ignore };
            e.AddToClassList("sf-photo__band");
            e.style.left = x; e.style.top = y; e.style.width = w; e.style.height = h;
            return e;
        }

        public void Hide(bool hide)
        {
            ControlsHidden = hide;
            _panel.style.display = hide ? DisplayStyle.None : DisplayStyle.Flex;
            Root.Q("photo-actions").style.display = hide ? DisplayStyle.None : DisplayStyle.Flex;
            _shown.style.display = hide ? DisplayStyle.Flex : DisplayStyle.None;
        }

        /// <summary>Takes the picture (the controls are not in it: it is the game camera's) and says where it went.</summary>
        public string TakePicture()
        {
            var path = _mode.Take();
            Note(Strings.Get(path != null ? "photo.taken" : "photo.not_taken"));
            return path;
        }

        private void Note(string text)
        {
            _note.text = text;
            _note.style.display = DisplayStyle.Flex;
            _noteOff?.Pause();
            _noteOff = _note.schedule.Execute(() => _note.style.display = DisplayStyle.None).StartingIn(2200);
        }

        private void Done()
        {
            Close();
        }

        protected internal override void Hidden() => _done?.Invoke();
    }
}
