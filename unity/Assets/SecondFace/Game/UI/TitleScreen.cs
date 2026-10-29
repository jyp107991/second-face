using System;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the title offers (P5.3j): the last save to continue (none: no continue), and what each choice does.</summary>
    public sealed class TitleModel
    {
        public SaveMeta Latest;
        /// <summary>Whether there is any save to load.</summary>
        public bool AnySave;
        /// <summary>What the world is doing while it comes in (null once it is in).</summary>
        public Func<string> Status;
        public Action Continue, NewGame, Load, Settings;
    }

    /// <summary>
    /// The title (P5.3j, DESIGN_UNITY §6 "menus and settings are plain"): the name in the book face on a dark band down
    /// the left, the world coming in behind it, and four choices under the thumb: continue (the last save, its person,
    /// place and day), a new game (character creation), load, settings. While the world is still coming in, a line under
    /// them says so; a game chosen meanwhile begins when it is in.
    /// </summary>
    public sealed class TitleScreen : UIScreen
    {
        private readonly TitleModel _m;
        private Label _status;
        private IVisualElementScheduledItem _tick;

        public TitleScreen(TitleModel model) { _m = model; }

        public override bool Opaque => false;
        public override bool HidesHud => true;

        public Button ContinueButton { get; private set; }
        public Button NewButton { get; private set; }
        public Button LoadButton { get; private set; }
        public Button SettingsButton { get; private set; }

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-start");
            var band = new VisualElement();
            band.AddToClassList("sf-start__band");
            band.AddToClassList(UIService.SafeClass);
            band.AddToClassList(UIService.SafeNoRightClass);
            root.Add(band);
            var name = new Label();
            Strings.Bind(name, "title.name");
            name.AddToClassList("sf-start__name");
            band.Add(name);
            var rule = new VisualElement();
            rule.AddToClassList("sf-start__rule");
            band.Add(rule);
            var choices = new VisualElement();
            choices.AddToClassList("sf-start__choices");
            band.Add(choices);
            if (_m.Latest != null)
            {
                ContinueButton = Choice(choices, "title-continue", "title.continue", () => _m.Continue?.Invoke());
                var sub = new Label(Describe(_m.Latest)) { pickingMode = PickingMode.Ignore };
                sub.AddToClassList("sf-start__choice-sub");
                ContinueButton.Add(sub);
            }
            NewButton = Choice(choices, "title-new", "title.new", () => _m.NewGame?.Invoke());
            LoadButton = Choice(choices, "title-load", "title.load", () => _m.Load?.Invoke());
            LoadButton.SetEnabled(_m.AnySave);
            SettingsButton = Choice(choices, "title-settings", "title.settings", () => _m.Settings?.Invoke());
            _status = new Label { name = "title-status", pickingMode = PickingMode.Ignore };
            _status.AddToClassList("sf-start__status");
            band.Add(_status);
            return root;
        }

        private static Button Choice(VisualElement into, string name, string key, Action act)
        {
            var b = new Button(act) { name = name };
            b.AddToClassList("sf-start__choice");
            var t = new Label(Strings.Get(key)) { pickingMode = PickingMode.Ignore };
            t.AddToClassList("sf-start__choice-text");
            b.Add(t);
            into.Add(b);
            return b;
        }

        /// <summary>A save in a line: who, where, which day and hour.</summary>
        public static string Describe(SaveMeta m)
        {
            if (m == null) return "";
            var when = Strings.Get("hud.when", Clock.DayOf(m.Minutes), $"{(int)Clock.HourOf(m.Minutes):00}:{(int)(m.Minutes % 60):00}");
            var who = string.IsNullOrEmpty(m.Label) ? "" : m.Label + " · ";
            var where = string.IsNullOrEmpty(m.LocationName) ? "" : m.LocationName + " · ";
            return who + where + when;
        }

        protected internal override void Shown()
        {
            Tick();
            _tick = Root.schedule.Execute(Tick).Every(400);
        }

        protected internal override void Hidden()
        {
            _tick?.Pause();
            _tick = null;
        }

        private void Tick()
        {
            var s = _m.Status?.Invoke();
            _status.text = s ?? "";
            _status.style.display = string.IsNullOrEmpty(s) ? DisplayStyle.None : DisplayStyle.Flex;
        }

        /// <summary>The title is where the back gesture ends: it stays.</summary>
        protected internal override bool Back() => false;
    }
}
