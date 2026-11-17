using System;
using System.Collections.Generic;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>
    /// The credits (after the closing pages' last word): the game's name, then the credits document (Core
    /// <see cref="Credits"/>: docs/CREDITS.md, shipped as the text asset <c>Resources/credits</c>) rolling up slowly over a
    /// dark field, then a last line; a tap or the back gesture ends it at any time, and so does the roll's own end. Then
    /// whatever runs the game takes the player to the title (<see cref="Done"/>).
    /// </summary>
    public sealed class CreditsScreen : UIScreen
    {
        /// <summary>How fast the roll climbs, pixels a second at the reference resolution.</summary>
        public float Speed = 42f;

        private readonly List<Credits.Section> _sections;
        private readonly Action _done;
        private VisualElement _roll, _field;
        private IVisualElementScheduledItem _tick;
        private float _offset;
        private bool _finished;

        public CreditsScreen(List<Credits.Section> sections, Action done)
        {
            _sections = sections ?? new List<Credits.Section>();
            _done = done;
        }

        /// <summary>The credits' text asset (null when it is not shipped: the roll then shows the name alone).</summary>
        public static List<Credits.Section> Shipped()
        {
            var asset = Resources.Load<TextAsset>("credits");
            return asset != null ? Credits.Parse(asset.text) : new List<Credits.Section>();
        }

        public override bool Opaque => true;

        /// <summary>The roll (tests read it).</summary>
        public VisualElement Roll => _roll;
        /// <summary>The roll has ended (by itself or by a tap).</summary>
        public bool Finished => _finished;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-credits");
            _field = new VisualElement();
            _field.AddToClassList("sf-credits__field");
            _field.RegisterCallback<PointerDownEvent>(_ => Finish());
            root.Add(_field);
            _roll = new VisualElement { name = "credits-roll", pickingMode = PickingMode.Ignore };
            _roll.AddToClassList("sf-credits__roll");
            _field.Add(_roll);
            var name = new Label { pickingMode = PickingMode.Ignore };
            Strings.Bind(name, "title.name");
            name.AddToClassList("sf-credits__name");
            _roll.Add(name);
            foreach (var s in _sections)
            {
                if (!string.IsNullOrEmpty(s.Heading))
                {
                    var h = new Label(s.Heading.ToUpperInvariant()) { pickingMode = PickingMode.Ignore };
                    h.AddToClassList("sf-credits__heading");
                    _roll.Add(h);
                }
                foreach (var line in s.Lines)
                {
                    var l = new Label(line) { pickingMode = PickingMode.Ignore };
                    l.AddToClassList("sf-credits__line");
                    _roll.Add(l);
                }
            }
            var last = new Label(Strings.Get("credits.thanks")) { pickingMode = PickingMode.Ignore };
            last.AddToClassList("sf-credits__last");
            _roll.Add(last);
            var skip = new Label(Strings.Get("credits.skip")) { pickingMode = PickingMode.Ignore };
            skip.AddToClassList("sf-credits__skip");
            root.Add(skip);
            return root;
        }

        protected internal override void Shown()
        {
            _offset = 0f;
            _tick = Root.schedule.Execute(t => Tick(t.deltaTime)).Every(16);
        }

        protected internal override void Hidden()
        {
            _tick?.Pause();
            _tick = null;
        }

        private void Tick(long ms)
        {
            if (_finished || _roll == null || _field == null) return;
            var fieldH = _field.layout.height;
            if (float.IsNaN(fieldH) || fieldH <= 0f) return;
            _offset += Speed * Mathf.Max(ms, 1L) / 1000f;
            // from below the field to above it
            _roll.style.translate = new Translate(0f, fieldH - _offset);
            var rollH = _roll.layout.height;
            if (!float.IsNaN(rollH) && _offset > fieldH + rollH) Finish();
        }

        /// <summary>The roll ends (a tap, the back gesture, or its own end): the title follows.</summary>
        public void Finish()
        {
            if (_finished) return;
            _finished = true;
            _tick?.Pause();
            Close();
            _done?.Invoke();
        }

        protected internal override bool Back()
        {
            Finish();
            return false;
        }
    }
}
