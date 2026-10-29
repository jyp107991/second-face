using System;
using SecondFace.Core.Dialogue;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The conversation panel (P5.3d, DESIGN_UNITY §2 and §5.3, BUILD_PLAN §6.H): a page at the right of the screen, the
    /// scene still in view beside it. At its head the speaker's live portrait and name; then the conversation so far (the
    /// log, read by scrolling up), the line (written out quickly the first time, whole when heard before; a tap finishes
    /// it), what the player's skills notice (passives), and the choices: each with its check shown up front (met or not),
    /// dimmed once chosen before, locked ones shown where the content asks. A choice goes to Core
    /// <see cref="DialogueRunner"/>; when the conversation ends the panel closes and <see cref="Ended"/> is raised.
    /// </summary>
    public sealed class DialoguePanel : UIScreen
    {
        /// <summary>How fast a line is written out, characters per second.</summary>
        public float CharsPerSecond = 90f;

        public event Action Ended;

        private readonly DialogueRunner _runner;
        private readonly Func<string, string> _nameOf;
        private readonly Func<string, Texture> _portraitOf;
        private ScrollView _scroll;
        private VisualElement _log, _passives, _options, _face;
        private Label _speaker, _line, _initial;
        private string _full = "";
        private float _shown;
        private IVisualElementScheduledItem _reveal;
        private NodeView _view;

        public override bool Opaque => false;

        /// <param name="nameOf">A speaker id's name (the content's NPC name).</param>
        /// <param name="portraitOf">A speaker id's portrait (People.Portraits), or null.</param>
        public DialoguePanel(DialogueRunner runner, Func<string, string> nameOf = null, Func<string, Texture> portraitOf = null)
        {
            _runner = runner;
            _nameOf = nameOf ?? (id => id);
            _portraitOf = portraitOf ?? (_ => null);
        }

        public NodeView View => _view;
        /// <summary>The line is still being written out.</summary>
        public bool Revealing => _reveal != null && _reveal.isActive;
        public VisualElement Options => _options;
        public VisualElement Log => _log;
        public Label Line => _line;
        public ScrollView Scroll => _scroll;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-dialogue");
            var page = new VisualElement { name = "dialogue-page" };
            page.AddToClassList("sf-dialogue__page");
            page.RegisterCallback<PointerDownEvent>(_ => { if (Revealing) Finish(); });
            root.Add(page);
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList(UIService.SafeNoLeftClass);
            page.Add(safe);

            var head = new VisualElement();
            head.AddToClassList("sf-dialogue__head");
            _face = new VisualElement { pickingMode = PickingMode.Ignore };
            _face.AddToClassList("sf-dialogue__face");
            _initial = new Label { pickingMode = PickingMode.Ignore };
            _initial.AddToClassList("sf-dialogue__initial");
            _face.Add(_initial);
            head.Add(_face);
            _speaker = new Label { pickingMode = PickingMode.Ignore };
            _speaker.AddToClassList("sf-dialogue__speaker");
            head.Add(_speaker);
            safe.Add(head);

            _scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            _scroll.AddToClassList("sf-dialogue__scroll");
            safe.Add(_scroll);
            _log = new VisualElement { name = "dialogue-log" };
            _log.AddToClassList("sf-dialogue__log");
            _scroll.Add(_log);
            _line = new Label { name = "dialogue-line" };
            _line.AddToClassList("sf-dialogue__line");
            _scroll.Add(_line);
            _passives = new VisualElement();
            _passives.AddToClassList("sf-dialogue__passives");
            _scroll.Add(_passives);
            _options = new VisualElement { name = "dialogue-options" };
            _options.AddToClassList("sf-dialogue__options");
            _scroll.Add(_options);
            return root;
        }

        protected internal override void Shown() => Present();

        protected internal override void Hidden() => _reveal?.Pause();

        /// <summary>Back leaves the conversation only where the content offers a way out (an exit choice).</summary>
        protected internal override bool Back()
        {
            if (Revealing) { Finish(); return false; }
            if (_view == null) return true;
            foreach (var o in _view.Options)
                if (o.Exit && !o.Locked) { Choose(o.Id); return false; }
            return false;
        }

        /// <summary>Shows the runner's current node (or closes when the conversation has ended).</summary>
        private void Present()
        {
            _view = _runner.View();
            if (_view == null) { End(); return; }
            var speaker = _view.Speaker ?? "";
            var name = _nameOf(speaker) ?? speaker;
            _speaker.text = name;
            var face = _portraitOf(speaker);
            _initial.text = string.IsNullOrEmpty(name) ? "" : name.Substring(0, 1).ToUpperInvariant();
            _initial.style.display = face == null ? DisplayStyle.Flex : DisplayStyle.None;
            _face.style.backgroundImage = face switch
            {
                RenderTexture rt => new StyleBackground(Background.FromRenderTexture(rt)),
                Texture2D t => new StyleBackground(t),
                _ => new StyleBackground(StyleKeyword.None),
            };

            _passives.Clear();
            foreach (var p in _view.Passives)
            {
                var row = new VisualElement();
                row.AddToClassList("sf-dialogue__passive");
                var label = new Label(p.Label);
                label.AddToClassList("sf-dialogue__passive-label");
                var text = new Label(p.Text);
                text.AddToClassList("sf-dialogue__passive-text");
                row.Add(label);
                row.Add(text);
                _passives.Add(row);
            }

            _options.Clear();
            var n = 0;
            foreach (var o in _view.Options)
            {
                var opt = o;
                var b = new Button(() => Choose(opt.Id)) { name = "option-" + opt.Id };
                b.AddToClassList("sf-dialogue__option");
                b.EnableInClassList("sf-dialogue__option--seen", opt.Seen);
                b.EnableInClassList("sf-dialogue__option--exit", opt.Exit);
                b.SetEnabled(!opt.Locked);
                var number = new Label($"{++n}.") { pickingMode = PickingMode.Ignore };
                number.AddToClassList("sf-dialogue__number");
                b.Add(number);
                if (!string.IsNullOrEmpty(opt.CheckLabel))
                {
                    var pill = new Label(opt.CheckLabel.ToUpperInvariant()) { pickingMode = PickingMode.Ignore };
                    pill.AddToClassList("sf-dialogue__check");
                    pill.EnableInClassList("sf-dialogue__check--unmet", !opt.CheckMet);
                    b.Add(pill);
                }
                var text = new Label(opt.Text) { pickingMode = PickingMode.Ignore };
                text.AddToClassList("sf-dialogue__option-text");
                b.Add(text);
                _options.Add(b);
            }

            _full = _view.Text ?? "";
            if (_view.Seen || CharsPerSecond <= 0f) Finish();
            else
            {
                _shown = 0f;
                _line.text = "";
                _passives.style.display = DisplayStyle.None;
                _options.style.display = DisplayStyle.None;
                _reveal ??= Root.schedule.Execute(Tick).Every(16);
                _reveal.Resume();
            }
            ScrollToLine();
        }

        private void Tick(TimerState t)
        {
            _shown += CharsPerSecond * Math.Max(t.deltaTime, 1L) / 1000f;
            if (_shown >= _full.Length) { Finish(); return; }
            _line.text = _full.Substring(0, (int)_shown);
        }

        /// <summary>Writes the whole line and shows the passives and choices.</summary>
        public void Finish()
        {
            _reveal?.Pause();
            _line.text = _full;
            _passives.style.display = DisplayStyle.Flex;
            _options.style.display = DisplayStyle.Flex;
            ScrollToLine();
        }

        /// <summary>Takes a choice (what its button does): the line and the choice go to the log, then the next node.</summary>
        public void Choose(string optionId)
        {
            if (_view == null) return;
            var o = _view.Options.Find(x => x.Id == optionId);
            if (o == null || o.Locked) return;
            if (Revealing) Finish();
            Append($"{_speaker.text}: {_full}", "sf-dialogue__logged-line");
            Append("— " + o.Text, "sf-dialogue__logged-choice");
            _runner.Choose(optionId);
            Present();
        }

        private void Append(string text, string cls)
        {
            var l = new Label(text);
            l.AddToClassList(cls);
            _log.Add(l);
        }

        /// <summary>Brings the current line to the top of the page (the log above it is a scroll up; the choices follow it).</summary>
        private void ScrollToLine() => _scroll.schedule.Execute(() => _scroll.scrollOffset = new Vector2(0, Mathf.Max(0f, _line.layout.y - 8f))).ExecuteLater(30);

        private void End()
        {
            _reveal?.Pause();
            Close();
            Ended?.Invoke();
        }
    }
}
