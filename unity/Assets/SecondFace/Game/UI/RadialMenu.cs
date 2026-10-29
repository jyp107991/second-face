using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>One verb on the radial: its id (content's verb), whether it can be done now.</summary>
    public readonly struct RadialVerb
    {
        public readonly string Id;
        public readonly bool Open;
        public RadialVerb(string id, bool open = true) { Id = id; Open = open; }
    }

    /// <summary>
    /// The radial action menu (P5.3c, BUILD_PLAN §6.F.2, DESIGN_UNITY §5.1): opened where a person or thing was tapped,
    /// its verbs on a ring round the point (the first at the top, clockwise; two sit left and right), its name at the
    /// hub. The ring is moved, never cut, to stay inside the safe area. A verb's tap chooses it and closes the ring; a
    /// tap anywhere else, or back, closes it. A verb that cannot be done now shows dimmed. Labels and icons by verb id
    /// (<c>verb.&lt;id&gt;</c> in the UI table, <see cref="Icons"/>).
    /// </summary>
    public sealed class RadialMenu : UIScreen
    {
        /// <summary>The ring's radius, a verb button's diameter and the room kept to the safe area's edge, panel units.</summary>
        public const float Radius = 160f, Button = 104f, Margin = 12f;
        public const float Extent = Radius + Button * 0.5f;

        private readonly Vector2 _at;
        private readonly string _title;
        private readonly IReadOnlyList<RadialVerb> _verbs;
        private readonly Action<string> _chosen;
        private readonly Dictionary<string, Button> _buttons = new();
        private VisualElement _ring;

        public override UILayer Layer => UILayer.Modal;
        public override bool Opaque => false;

        /// <summary>A ring at a panel point (<see cref="UIService.ToPanel"/>), titled, with its verbs; chosen gets the verb.</summary>
        public RadialMenu(Vector2 panelPoint, string title, IReadOnlyList<RadialVerb> verbs, Action<string> chosen)
        {
            _at = panelPoint;
            _title = title;
            _verbs = verbs;
            _chosen = chosen;
        }

        /// <summary>Where the ring's centre ended up (moved inside the safe area), panel units.</summary>
        public Vector2 Centre { get; private set; }
        public VisualElement Ring => _ring;
        public Button VerbButton(string id) => _buttons.TryGetValue(id, out var b) ? b : null;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-radial");
            root.RegisterCallback<PointerDownEvent>(e => { if (e.target == root) Close(); });
            _ring = new VisualElement { pickingMode = PickingMode.Ignore };
            _ring.AddToClassList("sf-radial__ring");
            _ring.style.width = Extent * 2f;
            _ring.style.height = Extent * 2f;
            _ring.generateVisualContent += DrawRing;
            root.Add(_ring);

            var n = Mathf.Max(1, _verbs.Count);
            var start = n == 2 ? 180f : -90f;
            for (var i = 0; i < _verbs.Count; i++)
            {
                var v = _verbs[i];
                var a = (start + 360f * i / n) * Mathf.Deg2Rad;
                var b = new Button(() => Choose(v.Id)) { name = "verb-" + v.Id };
                b.AddToClassList("sf-radial__verb");
                b.style.left = Extent + Mathf.Cos(a) * Radius - Button * 0.5f;
                b.style.top = Extent + Mathf.Sin(a) * Radius - Button * 0.5f;
                b.SetEnabled(v.Open);
                b.Add(Icons.Make(v.Id, 40f));
                var label = new Label { pickingMode = PickingMode.Ignore };
                label.AddToClassList("sf-radial__verb-label");
                Strings.Bind(label, "verb." + v.Id);
                b.Add(label);
                _ring.Add(b);
                _buttons[v.Id] = b;
            }

            var hub = new VisualElement { pickingMode = PickingMode.Ignore };
            hub.AddToClassList("sf-radial__hub");
            var title = new Label(_title ?? "") { pickingMode = PickingMode.Ignore };
            title.AddToClassList("sf-radial__title");
            hub.Add(title);
            _ring.Add(hub);
            hub.RegisterCallback<GeometryChangedEvent>(_ =>
            {
                hub.style.left = Extent - hub.resolvedStyle.width * 0.5f;
                hub.style.top = Extent - hub.resolvedStyle.height * 0.5f;
            });
            return root;
        }

        protected internal override void Shown()
        {
            Place();
            UI.InsetsChanged += OnInsets;
            // the ring grows open (a USS transition on the class)
            Root.schedule.Execute(() => Root.AddToClassList("sf-radial--open"));
        }

        protected internal override void Hidden() => UI.InsetsChanged -= OnInsets;

        private void OnInsets(Vector4 _) => Place();

        /// <summary>Centres the ring on the point, moved as little as needed to keep it inside the safe area.</summary>
        private void Place()
        {
            var size = new Vector2(UI.Root.layout.width, UI.Root.layout.height);
            if (float.IsNaN(size.x) || size.x <= 0)
            {
                Root.schedule.Execute(Place);   // not laid out yet
                return;
            }
            var i = UI.Insets;
            var e = Extent + Margin;
            var x = Mathf.Clamp(_at.x, i.x + e, Mathf.Max(i.x + e, size.x - i.z - e));
            var y = Mathf.Clamp(_at.y, i.y + e, Mathf.Max(i.y + e, size.y - i.w - e));
            Centre = new Vector2(x, y);
            _ring.style.left = x - Extent;
            _ring.style.top = y - Extent;
        }

        /// <summary>Chooses a verb (what its button does): closes the ring, then reports it. A closed verb does nothing.</summary>
        public void Choose(string id)
        {
            if (!_buttons.TryGetValue(id, out var b) || !b.enabledSelf) return;
            Close();
            _chosen?.Invoke(id);
        }

        private void DrawRing(MeshGenerationContext mgc)
        {
            var p = mgc.painter2D;
            p.strokeColor = new Color(0.08f, 0.07f, 0.06f, 0.45f);
            p.lineWidth = 8f;
            p.BeginPath();
            p.Arc(new Vector2(Extent, Extent), Radius, 0f, 360f);
            p.Stroke();
        }
    }
}
