using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The HUD (P5.3b, DESIGN_UNITY §6: minimal): top left, where and when and the tracked quest's next objective (a tap
    /// opens it in the notebook); top right, the <see cref="Compass"/>; bottom left, the party's faces with their health;
    /// bottom right under the thumb, the notebook, the map and the pack. Plates of dark glass over the world, inside the
    /// safe area, in <see cref="UIService.Hud"/> (hidden while an opaque screen is open). <see cref="Show"/> takes the
    /// state; <see cref="Heading"/> turns the compass with the camera every frame without a relayout.
    /// </summary>
    public sealed class Hud
    {
        public VisualElement Root { get; }
        public Compass Compass { get; }
        public VisualElement Objective { get; }
        public VisualElement Party { get; }
        public Button NotebookButton { get; }
        public Button MapButton { get; }
        public Button PackButton { get; }
        /// <summary>The pause (P5.3j), top right under the compass.</summary>
        public Button MenuButton { get; }
        /// <summary>The objective was tapped (the notebook opens at the quest).</summary>
        public event Action ObjectiveTapped;

        private readonly Label _when, _quest, _line, _note;
        private IVisualElementScheduledItem _noteOff;
        private readonly VisualElement _actions;
        private readonly List<Member> _members = new();
        private Action _notebook, _map, _pack, _menu;

        private sealed class Member
        {
            public VisualElement Root, Face, Fill;
            public Label Initial, Name;
        }

        public Hud(UIService ui)
        {
            Root = new VisualElement { name = "hud", pickingMode = PickingMode.Ignore };
            Root.AddToClassList("sf-hud");
            Root.AddToClassList(UIService.SafeClass);
            Root.style.position = Position.Absolute;
            Root.style.left = 0; Root.style.top = 0; Root.style.right = 0; Root.style.bottom = 0;
            // the safe padding moves only children in flow: the absolutely placed pieces sit in a filler
            var area = new VisualElement { name = "hud-area", pickingMode = PickingMode.Ignore };
            area.AddToClassList("sf-hud__area");
            Root.Add(area);

            Objective = new VisualElement { name = "hud-objective" };
            Objective.AddToClassList("sf-plate");
            Objective.AddToClassList("sf-hud__objective");
            Objective.Add(_when = Text("sf-hud__when"));
            Objective.Add(_quest = Text("sf-hud__quest"));
            Objective.Add(_line = Text("sf-hud__line"));
            Objective.RegisterCallback<ClickEvent>(_ => ObjectiveTapped?.Invoke());
            area.Add(Objective);

            Compass = new Compass();
            area.Add(Compass);

            MenuButton = new Button(() => _menu?.Invoke()) { name = "hud-menu" };
            MenuButton.AddToClassList("sf-hud__menu");
            MenuButton.Add(Icons.Make("menu", 34f));
            MenuButton.style.display = DisplayStyle.None;
            area.Add(MenuButton);

            _note = Text("sf-hud__note");
            _note.name = "hud-note";
            _note.AddToClassList("sf-plate");
            _note.style.display = DisplayStyle.None;
            area.Add(_note);

            Party = new VisualElement { name = "hud-party", pickingMode = PickingMode.Ignore };
            Party.AddToClassList("sf-hud__party");
            area.Add(Party);

            _actions = new VisualElement { name = "hud-actions", pickingMode = PickingMode.Ignore };
            _actions.AddToClassList("sf-hud__actions");
            area.Add(_actions);
            NotebookButton = ActionButton("notebook", "hud.notebook", () => _notebook?.Invoke());
            MapButton = ActionButton("map", "hud.map", () => _map?.Invoke());
            PackButton = ActionButton("pack", "hud.pack", () => _pack?.Invoke());

            ui.Hud.Add(Root);
            ui.Pad(Root);
        }

        private static Label Text(string cls)
        {
            var l = new Label { pickingMode = PickingMode.Ignore };
            l.AddToClassList(cls);
            return l;
        }

        private Button ActionButton(string icon, string key, Action clicked)
        {
            var b = new Button(clicked) { name = "hud-" + icon };
            b.AddToClassList("sf-hud__action");
            b.Add(Icons.Make(icon, 40f));
            var label = Text("sf-hud__action-label");
            Strings.Bind(label, key);
            b.Add(label);
            _actions.Add(b);
            return b;
        }

        /// <summary>What the notebook, map and pack buttons do; a null hides its button (the screen is not there yet).</summary>
        public void Actions(Action notebook, Action map, Action pack)
        {
            _notebook = notebook; _map = map; _pack = pack;
            NotebookButton.style.display = notebook != null ? DisplayStyle.Flex : DisplayStyle.None;
            MapButton.style.display = map != null ? DisplayStyle.Flex : DisplayStyle.None;
            PackButton.style.display = pack != null ? DisplayStyle.Flex : DisplayStyle.None;
        }

        /// <summary>A line for a moment at the top (a quicksave made, a load failed).</summary>
        public void Note(string text)
        {
            _note.text = text;
            _note.style.display = DisplayStyle.Flex;
            _noteOff?.Pause();
            _noteOff = _note.schedule.Execute(() => _note.style.display = DisplayStyle.None).StartingIn(2400);
        }

        /// <summary>The line shown now (null when none; tests read it).</summary>
        public string NoteText => _note.style.display == DisplayStyle.None ? null : _note.text;

        /// <summary>What the menu button does (the pause); null hides it.</summary>
        public void Menu(Action menu)
        {
            _menu = menu;
            MenuButton.style.display = menu != null ? DisplayStyle.Flex : DisplayStyle.None;
        }

        /// <summary>Where the camera looks, degrees clockwise from north.</summary>
        public void Heading(float degrees) => Compass.Heading = degrees;

        public void Show(HudState s)
        {
            var when = Strings.Get("hud.when", s.Day, s.Clock);
            _when.text = (string.IsNullOrEmpty(s.Place) ? when : $"{s.Place} · {when}").ToUpperInvariant();
            _quest.text = s.Quest ?? "";
            _quest.style.display = string.IsNullOrEmpty(s.Quest) ? DisplayStyle.None : DisplayStyle.Flex;
            _line.text = string.IsNullOrEmpty(s.Objective) ? Strings.Get("hud.quiet") : s.Objective;
            Compass.Pin = s.Bearing;
            while (_members.Count < s.Party.Count) _members.Add(NewMember());
            for (var i = 0; i < _members.Count; i++)
            {
                var m = _members[i];
                if (i >= s.Party.Count) { m.Root.style.display = DisplayStyle.None; continue; }
                var p = s.Party[i];
                m.Root.style.display = DisplayStyle.Flex;
                m.Name.text = p.Name ?? "";
                m.Root.EnableInClassList("sf-hud__member--leader", p.Leader);
                SetFace(m, p);
                var h = p.Health;
                m.Fill.style.width = Length.Percent(h * 100f);
                m.Fill.EnableInClassList("sf-hud__fill--low", h <= 0.5f && h > 0.25f);
                m.Fill.EnableInClassList("sf-hud__fill--critical", h <= 0.25f);
            }
        }

        /// <summary>The share of a member's bar that is filled (tests read it).</summary>
        public float Filled(int member) => _members[member].Fill.resolvedStyle.width / Mathf.Max(1f, _members[member].Fill.parent.resolvedStyle.width);

        /// <summary>A member's bar's state: "", "low" or "critical".</summary>
        public string Band(int member)
        {
            var f = _members[member].Fill;
            return f.ClassListContains("sf-hud__fill--critical") ? "critical" : f.ClassListContains("sf-hud__fill--low") ? "low" : "";
        }

        private static void SetFace(Member m, HudMember p)
        {
            m.Initial.text = string.IsNullOrEmpty(p.Name) ? "" : p.Name.Substring(0, 1).ToUpperInvariant();
            m.Initial.style.display = p.Portrait == null ? DisplayStyle.Flex : DisplayStyle.None;
            m.Face.style.backgroundImage = p.Portrait switch
            {
                RenderTexture rt => new StyleBackground(Background.FromRenderTexture(rt)),
                Texture2D t => new StyleBackground(t),
                _ => new StyleBackground(StyleKeyword.None),
            };
        }

        private Member NewMember()
        {
            var m = new Member { Root = new VisualElement() };
            m.Root.AddToClassList("sf-hud__member");
            m.Face = new VisualElement { pickingMode = PickingMode.Ignore };
            m.Face.AddToClassList("sf-hud__face");
            m.Initial = Text("sf-hud__initial");
            m.Face.Add(m.Initial);
            m.Root.Add(m.Face);
            m.Name = Text("sf-hud__name");
            m.Root.Add(m.Name);
            var bar = new VisualElement { pickingMode = PickingMode.Ignore };
            bar.AddToClassList("sf-hud__bar");
            m.Fill = new VisualElement { pickingMode = PickingMode.Ignore };
            m.Fill.AddToClassList("sf-hud__fill");
            bar.Add(m.Fill);
            m.Root.Add(bar);
            Party.Add(m.Root);
            return m;
        }
    }
}
