using System;
using System.Globalization;
using SecondFace.Core.Save;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The settings (P5.3j, DESIGN_UNITY §5.8): one page on the desk, in three parts: the words (four sizes, high
    /// contrast), the camera (how far a drag turns it, which way) and play (difficulty, which touches enemy aim and damage
    /// only, and combat speed, both read by the fights; skipping lines already heard; autosaves; the one-time tips' switch
    /// comes with the tips). Every choice takes at once and is kept (the
    /// owner of <see cref="Settings"/> applies them: a bigger size re-sets every word on screen, this page too).
    /// </summary>
    public sealed class SettingsScreen : UIScreen
    {
        private readonly Func<Settings> _get;
        private readonly Action<Action<Settings>> _change;
        private ScrollView _scroll;
        private VisualElement _page;

        /// <param name="get">The settings now.</param>
        /// <param name="change">Changes them (kept and applied by the owner).</param>
        public SettingsScreen(Func<Settings> get, Action<Action<Settings>> change) { _get = get; _change = change; }

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-creation");
            root.AddToClassList("sf-menu");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var body = new VisualElement();
            body.AddToClassList("sf-menu__body");
            safe.Add(body);
            var paper = new VisualElement();
            paper.AddToClassList("sf-creation__paper");
            body.Add(paper);
            paper.Add(Head(Strings.Get("settings.title"), Close));
            _scroll = new ScrollView(ScrollViewMode.Vertical)
            {
                verticalScrollerVisibility = ScrollerVisibility.Hidden,
                horizontalScrollerVisibility = ScrollerVisibility.Hidden,
            };
            _scroll.AddToClassList("sf-creation__scroll");
            paper.Add(_scroll);
            _page = _scroll.contentContainer;
            Fill();
            return root;
        }

        /// <summary>A paper page's head: its title and the way back.</summary>
        public static VisualElement Head(string title, Action back)
        {
            var head = new VisualElement();
            head.AddToClassList("sf-menu__head");
            var t = new Label(title);
            t.AddToClassList("sf-menu__title");
            head.Add(t);
            var b = new Button(back) { name = "menu-back", text = Strings.Get("menu.back") };
            b.AddToClassList("sf-button");
            b.AddToClassList("sf-button--quiet");
            head.Add(b);
            return head;
        }

        private void Fill()
        {
            _page.Clear();
            var s = _get();
            Heading("settings.words");
            Chips("settings.text_size", Settings.TextScales, s.TextScale, v => Strings.Get("settings.text_" + Array.IndexOf(Settings.TextScales, v)), v => _change(x => x.TextScale = v), "text");
            Toggle("settings.contrast", s.HighContrast, v => _change(x => x.HighContrast = v), "contrast");
            Heading("settings.camera");
            Chips("settings.turn_speed", TurnSpeeds, s.TurnSpeed, v => v.ToString("0.##", CultureInfo.InvariantCulture) + "×", v => _change(x => x.TurnSpeed = v), "turn");
            Toggle("settings.invert_turn", s.InvertTurn, v => _change(x => x.InvertTurn = v), "invert", "settings.turn_reversed", "settings.turn_natural");
            Heading("settings.play");
            Chips("settings.difficulty", Settings.Difficulties, s.Difficulty, v => Strings.Get("settings.difficulty_" + v), v => _change(x => x.Difficulty = v), "difficulty");
            Note(Strings.Get("settings.difficulty_note"));
            Chips("settings.combat_speed", Settings.CombatSpeeds, s.CombatSpeed, v => v.ToString("0.#", CultureInfo.InvariantCulture) + "×", v => _change(x => x.CombatSpeed = v), "combat");
            Toggle("settings.skip_seen", s.SkipSeen, v => _change(x => x.SkipSeen = v), "skip");
            Toggle("settings.autosave", s.Autosave, v => _change(x => x.Autosave = v), "autosave");
        }

        /// <summary>The turn speeds offered (Core clamps 0.5..2).</summary>
        public static readonly float[] TurnSpeeds = { 0.5f, 0.75f, 1f, 1.5f, 2f };

        /// <summary>The page shows the settings as they are now (after a change from here or elsewhere).</summary>
        public void Refresh()
        {
            if (_page == null) return;
            var at = _scroll.scrollOffset;
            Fill();
            _scroll.schedule.Execute(() => _scroll.scrollOffset = at);
        }

        private void Heading(string key)
        {
            var l = new Label(Strings.Get(key).ToUpperInvariant());
            l.AddToClassList("sf-creation__heading");
            _page.Add(l);
        }

        private void Note(string text)
        {
            var l = new Label(text);
            l.AddToClassList("sf-creation__note");
            _page.Add(l);
        }

        private VisualElement Line(string key)
        {
            var row = new VisualElement();
            row.AddToClassList("sf-menu__line");
            var l = new Label(Strings.Get(key));
            l.AddToClassList("sf-menu__label");
            row.Add(l);
            var chips = new VisualElement();
            chips.AddToClassList("sf-creation__chips");
            chips.AddToClassList("sf-menu__chips");
            row.Add(chips);
            _page.Add(row);
            return chips;
        }

        private void Chips<T>(string key, T[] options, T now, Func<T, string> label, Action<T> set, string name)
        {
            var chips = Line(key);
            foreach (var o in options)
            {
                var v = o;
                var id = Convert.ToString(v, CultureInfo.InvariantCulture);
                chips.Add(Chip(label(v), Equals(v, now), () => { set(v); Refresh(); }, $"{name}-{id}"));
            }
        }

        private void Toggle(string key, bool on, Action<bool> set, string name, string onKey = "settings.on", string offKey = "settings.off")
        {
            var chips = Line(key);
            chips.Add(Chip(Strings.Get(offKey), !on, () => { set(false); Refresh(); }, name + "-off"));
            chips.Add(Chip(Strings.Get(onKey), on, () => { set(true); Refresh(); }, name + "-on"));
        }

        private static Button Chip(string text, bool on, Action act, string name)
        {
            var b = new Button(act) { name = name };
            b.AddToClassList("sf-creation__choice");
            b.AddToClassList("sf-creation__chip");
            b.EnableInClassList("sf-creation__choice--on", on);
            var t = new Label(text) { pickingMode = PickingMode.Ignore };
            t.AddToClassList("sf-creation__choice-text");
            b.Add(t);
            return b;
        }
    }
}
