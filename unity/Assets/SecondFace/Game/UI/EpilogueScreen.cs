using System;
using SecondFace.Core.Dialogue;
using SecondFace.Core.World;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the closing pages work on: a runner on their tree as the game stands (one per page: the tree's start
    /// list routes to the page due), the still the page asked for, and what turning a page does.</summary>
    public sealed class EpilogueModel
    {
        /// <summary>A runner on the tree, at the page due now.</summary>
        public Func<DialogueRunner> Open;
        /// <summary>The still the page just entered asked for (null: none yet).</summary>
        public Func<SlideData> Slide;
        /// <summary>Composes a page's still beside it.</summary>
        public Action<SlideData> Compose;
        /// <summary>A page was turned (the game keeps a save).</summary>
        public Action Turned;
        /// <summary>A speaker's name (the closing pages are the narrator's: none).</summary>
        public Func<string, string> Name;
    }

    /// <summary>
    /// The closing pages (Core <see cref="Epilogue"/>, BUILD_PLAN P11): one page of text at a time on a band of paper at the
    /// right, its still composed in the world beside it (Game <c>SlideStill</c>), the page's short lines under it, and the
    /// way on: next, skip to the end (from the second page) or, on the last page, the end. Turning a page asks for the
    /// same tree again: the screen stays and opens the tree in place at the page now due (no flicker of the world between
    /// pages), the game keeps a save, so a load opens on that page. Back turns the page; it never rolls the credits.
    /// </summary>
    public sealed class EpilogueScreen : UIScreen
    {
        private readonly EpilogueModel _m;
        private DialogueRunner _runner;
        private NodeView _view;
        private VisualElement _page, _lines, _options;
        private Label _speaker, _text;

        public EpilogueScreen(EpilogueModel model) { _m = model; }

        public override bool Opaque => false;
        public override bool HidesHud => true;

        /// <summary>The closing pages have closed (the credits roll, or the game left).</summary>
        public event Action Ended;
        /// <summary>Set by the game while a choice runs: its effects asked for the same tree again (a page turned).</summary>
        public bool TurnAsked { get; set; }
        /// <summary>The page shown now.</summary>
        public NodeView View => _view;
        /// <summary>Pages turned since the screen opened.</summary>
        public int Turns { get; private set; }
        public VisualElement Options => _options;
        public Label Text => _text;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-epilogue");
            _page = new VisualElement { name = "epilogue-page" };
            _page.AddToClassList("sf-epilogue__page");
            root.Add(_page);
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            safe.AddToClassList(UIService.SafeNoLeftClass);
            _page.Add(safe);
            _speaker = new Label { pickingMode = PickingMode.Ignore };
            _speaker.AddToClassList("sf-epilogue__speaker");
            safe.Add(_speaker);
            var scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
                touchScrollBehavior = ScrollView.TouchScrollBehavior.Clamped,
            };
            scroll.AddToClassList("sf-epilogue__scroll");
            safe.Add(scroll);
            _text = new Label { name = "epilogue-text" };
            _text.AddToClassList("sf-epilogue__text");
            scroll.Add(_text);
            _lines = new VisualElement();
            _lines.AddToClassList("sf-epilogue__lines");
            scroll.Add(_lines);
            _options = new VisualElement { name = "epilogue-options" };
            _options.AddToClassList("sf-epilogue__options");
            safe.Add(_options);
            return root;
        }

        protected internal override void Shown() => Open();

        protected internal override void Hidden() => Ended?.Invoke();

        /// <summary>Back turns the page (the first way on that is not the end); on the last page it waits.</summary>
        protected internal override bool Back()
        {
            if (_view == null) return true;
            foreach (var o in _view.Options)
                if (o.Exit && !o.Locked && !Epilogue.RollsCredits(OptionEffects(o.Id))) { Choose(o.Id); break; }
            return false;
        }

        /// <summary>Opens the tree at the page due now.</summary>
        private void Open()
        {
            _runner = _m.Open?.Invoke();
            Present();
        }

        private void Present()
        {
            _view = _runner?.View();
            if (_view == null) { Close(); return; }
            var name = _m.Name?.Invoke(_view.Speaker ?? "") ?? "";
            _speaker.text = name;
            _speaker.style.display = string.IsNullOrEmpty(name) ? DisplayStyle.None : DisplayStyle.Flex;
            _text.text = _view.Text ?? "";
            _lines.Clear();
            foreach (var p in _view.Passives)
            {
                var row = new VisualElement();
                row.AddToClassList("sf-epilogue__line");
                var label = new Label(p.Label) { pickingMode = PickingMode.Ignore };
                label.AddToClassList("sf-epilogue__line-label");
                var text = new Label(p.Text) { pickingMode = PickingMode.Ignore };
                text.AddToClassList("sf-epilogue__line-text");
                row.Add(label);
                row.Add(text);
                _lines.Add(row);
            }
            _options.Clear();
            foreach (var o in _view.Options)
            {
                var opt = o;
                var b = new Button(() => Choose(opt.Id)) { name = "epilogue-option-" + _options.childCount };
                b.AddToClassList("sf-epilogue__option");
                b.SetEnabled(!opt.Locked);
                var t = new Label(opt.Text) { pickingMode = PickingMode.Ignore };
                t.AddToClassList("sf-epilogue__option-text");
                b.Add(t);
                _options.Add(b);
            }
            // the page fades in over its still
            _page.RemoveFromClassList("sf-epilogue__page--shown");
            _page.schedule.Execute(() => _page.AddToClassList("sf-epilogue__page--shown")).ExecuteLater(30);
            _m.Compose?.Invoke(_m.Slide?.Invoke());
        }

        /// <summary>Takes a way on: the next page (the tree opened again in place), the end, or a page of the same tree.</summary>
        public void Choose(string optionId)
        {
            if (_runner == null || _view == null) return;
            var o = _view.Options.Find(x => x.Id == optionId);
            if (o == null || o.Locked) return;
            TurnAsked = false;
            var credits = Epilogue.RollsCredits(OptionEffects(optionId));
            _runner.Choose(optionId);
            if (!IsOpen || credits) return;   // (the credits close the pages as they roll)
            if (_runner.Ended)
            {
                if (!TurnAsked) { Close(); return; }
                TurnAsked = false;
                Turns++;
                _m.Turned?.Invoke();
                Open();
                return;
            }
            Present();
        }

        /// <summary>The way on as the content wrote it (its effects), on the page shown.</summary>
        private Newtonsoft.Json.Linq.JArray OptionEffects(string optionId)
        {
            if (_runner == null || !_runner.Def.Nodes.TryGetValue(_runner.Node ?? "", out var node)) return null;
            for (var i = 0; i < node.Options.Count; i++)
                if ((node.Options[i].Id ?? $"{_runner.Def.Id}.{_runner.Node}.{i}") == optionId) return node.Options[i].Effects;
            return null;
        }
    }
}
