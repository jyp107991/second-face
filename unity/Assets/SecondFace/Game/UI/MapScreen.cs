using System;
using System.Collections.Generic;
using SecondFace.Core.World;
using UnityEngine;
using UnityEngine.UIElements;

namespace SecondFace.Game.UI
{
    /// <summary>What the map shows: the sheet, the world's places, which of them are known, where the player is, and how
    /// a journey from here would go.</summary>
    public sealed class MapModel
    {
        /// <summary>The world painted as a map (MapBake: north up, the whole world).</summary>
        public Texture Sheet;
        public WorldLayout Layout;
        /// <summary>The places the player knows (only these are named on the map).</summary>
        public ICollection<string> Known = new HashSet<string>();
        /// <summary>The place the player is at (or last was).</summary>
        public string Here;
        /// <summary>The player in world metres (x, z), and the way they face, degrees clockwise from north.</summary>
        public Vector2? Player;
        public float Heading;
        /// <summary>The quickest journey from here to a place (null: no known way).</summary>
        public Func<string, Trip> Plan;
        /// <summary>Sets out for a place (null: the map offers no travel yet).</summary>
        public Action<string> Travel;
    }

    /// <summary>
    /// The world map (P5.3g, DESIGN_UNITY §6: a map, not a wrist computer): the surveyor's sheet of the whole world
    /// (<c>MapBake</c>) on the desk, dragged with one finger and pinched with two (the wheel on a desk), the places the
    /// player knows marked and named, an arrow where they stand facing the way they face. A tap on a place opens its
    /// card: its name, its region, and the quickest journey there from here in hours or days (Core <see cref="Travel"/>),
    /// with a travel button where travel is offered. Markers keep their size as the sheet zooms.
    /// </summary>
    public sealed class MapScreen : UIScreen
    {
        public const float MaxZoom = 6f;

        private readonly MapModel _m;
        private VisualElement _view, _sheet, _you, _card;
        private Label _cardTitle, _cardRegion, _cardTrip;
        private Button _travel;
        private readonly Dictionary<string, VisualElement> _markers = new();
        private readonly Dictionary<int, Vector2> _pointers = new();
        private float _zoom = 1f, _zoomStart, _pinchStart;
        private float _sw, _sh;   // the sheet's size at zoom 1 (set when the view is laid out)
        private Vector2 _pan, _panStart, _midStart, _downAt;
        private bool _dragging;
        private bool _onPlayer = true;   // follows the player through layout changes until the map is moved

        public MapScreen(MapModel model) => _m = model;

        public float Zoom => _zoom;
        public Vector2 Pan => _pan;
        public string Chosen { get; private set; }
        public VisualElement Sheet => _sheet;
        public VisualElement Card => _card;
        public VisualElement You => _you;
        public Label CardTrip => _cardTrip;
        public Button TravelButton => _travel;
        public VisualElement Marker(string id) => _markers.TryGetValue(id, out var m) ? m : null;

        protected internal override VisualElement Build()
        {
            var root = new VisualElement();
            root.AddToClassList("sf-map");
            var safe = new VisualElement();
            safe.AddToClassList(UIService.SafeClass);
            root.Add(safe);
            var head = new VisualElement();
            head.AddToClassList("sf-map__head");
            var title = new Label();
            title.AddToClassList("sf-map__title");
            Strings.Bind(title, "map.title");
            head.Add(title);
            var spacer = new VisualElement();
            spacer.AddToClassList("sf-grow");
            head.Add(spacer);
            var centre = new Button(Centre) { name = "map-centre" };
            centre.AddToClassList("sf-button");
            centre.AddToClassList("sf-button--quiet");
            centre.AddToClassList("sf-map__headbutton");
            Strings.Bind(centre, "map.centre");
            head.Add(centre);
            var close = new Button(Close) { name = "map-close" };
            close.AddToClassList("sf-button");
            close.AddToClassList("sf-button--quiet");
            close.AddToClassList("sf-map__headbutton");
            Strings.Bind(close, "map.close");
            head.Add(close);
            safe.Add(head);

            _view = new VisualElement { name = "map-view" };
            _view.AddToClassList("sf-map__view");
            safe.Add(_view);
            _sheet = new VisualElement { name = "map-sheet" };
            _sheet.AddToClassList("sf-map__sheet");
            _sheet.style.position = Position.Absolute;
            _sheet.style.transformOrigin = new TransformOrigin(0, 0);
            if (_m.Sheet is Texture2D t) _sheet.style.backgroundImage = new StyleBackground(t);
            _view.Add(_sheet);

            if (_m.Layout != null)
                foreach (var p in _m.Layout.Places.Values)
                {
                    if (!(_m.Known?.Contains(p.Id) ?? false) && p.Id != _m.Here) continue;
                    var id = p.Id;
                    var marker = new Button(() => Choose(id)) { name = "place-" + id };
                    marker.AddToClassList("sf-map__place");
                    marker.EnableInClassList("sf-map__place--here", id == _m.Here);
                    var dot = new VisualElement { pickingMode = PickingMode.Ignore };
                    dot.AddToClassList("sf-map__dot");
                    marker.Add(dot);
                    var name = new Label(p.Name ?? p.Id) { pickingMode = PickingMode.Ignore };
                    name.AddToClassList("sf-map__name");
                    marker.Add(name);
                    Place(marker, p.Centre[0], p.Centre[1]);
                    _sheet.Add(marker);
                    _markers[id] = marker;
                }
            if (_m.Player is { } at)
            {
                _you = new VisualElement { name = "map-you", pickingMode = PickingMode.Ignore };
                _you.AddToClassList("sf-map__you");
                var heading = _m.Heading;
                _you.generateVisualContent += mgc => DrawArrow(mgc, heading);
                Place(_you, at.x, at.y);
                _sheet.Add(_you);
            }

            _card = new VisualElement { name = "map-card" };
            _card.AddToClassList("sf-plate");
            _card.AddToClassList("sf-map__card");
            _cardTitle = new Label();
            _cardTitle.AddToClassList("sf-map__card-title");
            _cardRegion = new Label();
            _cardRegion.AddToClassList("sf-map__card-region");
            _cardTrip = new Label();
            _cardTrip.AddToClassList("sf-map__card-trip");
            _travel = new Button(() => { if (Chosen != null) _m.Travel?.Invoke(Chosen); }) { name = "map-travel" };
            _travel.AddToClassList("sf-button");
            _travel.AddToClassList("sf-map__travel");
            Strings.Bind(_travel, "map.travel");
            _card.Add(_cardTitle);
            _card.Add(_cardRegion);
            _card.Add(_cardTrip);
            _card.Add(_travel);
            _card.style.display = DisplayStyle.None;
            _view.Add(_card);

            _view.RegisterCallback<GeometryChangedEvent>(_ => Fit());
            _view.RegisterCallback<PointerDownEvent>(OnDown);
            _view.RegisterCallback<PointerMoveEvent>(OnMove);
            _view.RegisterCallback<PointerUpEvent>(OnUp);
            _view.RegisterCallback<PointerCancelEvent>(e => _pointers.Remove(e.pointerId));
            _view.RegisterCallback<WheelEvent>(e => ZoomAbout(e.localMousePosition, _zoom * Mathf.Exp(-e.delta.y * 0.08f)));
            return root;
        }

        /// <summary>Puts an element at a world point on the sheet (percent of the sheet, centred on the point).</summary>
        private static void Place(VisualElement e, float x, float z)
        {
            e.style.position = Position.Absolute;
            e.style.left = Length.Percent(x / WorldGrid.Width * 100f);
            e.style.top = Length.Percent((1f - z / WorldGrid.Depth) * 100f);
        }

        private static void DrawArrow(MeshGenerationContext mgc, float heading)
        {
            var p = mgc.painter2D;
            var r = mgc.visualElement.contentRect;
            var c = r.center;
            var rot = Quaternion.Euler(0, 0, heading);   // clockwise from north on a north-up sheet (y grows down)
            Vector2 P(float x, float y) { var v = rot * new Vector3(x, y, 0); return c + new Vector2(v.x, v.y); }
            p.fillColor = new Color(0.63f, 0.25f, 0.16f);
            p.strokeColor = new Color(0.98f, 0.95f, 0.88f);
            p.lineWidth = 2.5f;
            p.BeginPath();
            p.MoveTo(P(0, -16)); p.LineTo(P(11, 12)); p.LineTo(P(0, 6)); p.LineTo(P(-11, 12));
            p.ClosePath();
            p.Fill();
            p.Stroke();
        }

        /// <summary>The sheet's size at zoom 1 (the whole world fits the view) and its placement.</summary>
        private void Fit()
        {
            var w = _view.layout.width;
            var h = _view.layout.height;
            if (float.IsNaN(w) || w <= 0 || h <= 0) return;
            var aspect = WorldGrid.Width / WorldGrid.Depth;
            var s = Mathf.Min(w / aspect, h);
            _sw = s * aspect;
            _sh = s;
            _sheet.style.width = _sw;
            _sheet.style.height = _sh;
            if (_onPlayer && _m.Player is { } at)
            {
                if (_zoom == 1f) _zoom = 2.2f;
                CentreOn(at);
            }
            else Apply();
        }

        /// <summary>The sheet's top-left in the view, from the zoom and the pan (the pan is the offset from centred).</summary>
        private void Apply()
        {
            var vw = _view.layout.width; var vh = _view.layout.height;
            var sw = _sw; var sh = _sh;
            if (sw <= 0) return;
            // keep the sheet over the view, its margin allowed a quarter of the view in (so a place by the edge can be
            // brought to the centre), never dragged away
            var maxX = Mathf.Max(0f, (sw * _zoom - vw) * 0.5f) + vw * 0.25f;
            var maxY = Mathf.Max(0f, (sh * _zoom - vh) * 0.5f) + vh * 0.25f;
            _pan = new Vector2(Mathf.Clamp(_pan.x, -maxX, maxX), Mathf.Clamp(_pan.y, -maxY, maxY));
            var left = (vw - sw * _zoom) * 0.5f + _pan.x;
            var top = (vh - sh * _zoom) * 0.5f + _pan.y;
            _sheet.style.translate = new Translate(left, top);
            _sheet.style.scale = new Scale(new Vector2(_zoom, _zoom));
            var counter = new Scale(new Vector2(1f / _zoom, 1f / _zoom));
            foreach (var m in _markers.Values) m.style.scale = counter;
            if (_you != null) _you.style.scale = counter;
        }

        /// <summary>Where a world point is in the view (panel units).</summary>
        public Vector2 InView(float x, float z)
        {
            var vw = _view.layout.width; var vh = _view.layout.height;
            var sw = _sw; var sh = _sh;
            var left = (vw - sw * _zoom) * 0.5f + _pan.x;
            var top = (vh - sh * _zoom) * 0.5f + _pan.y;
            return _view.worldBound.position + new Vector2(left + x / WorldGrid.Width * sw * _zoom, top + (1f - z / WorldGrid.Depth) * sh * _zoom);
        }

        /// <summary>Pans so a world point is at the view's centre.</summary>
        public void CentreOn(Vector2 world)
        {
            _pan = new Vector2((0.5f - world.x / WorldGrid.Width) * _sw * _zoom, (world.y / WorldGrid.Depth - 0.5f) * _sh * _zoom);
            Apply();
        }

        /// <summary>Back to where the player stands (or the whole world when they are not on it).</summary>
        public void Centre()
        {
            if (_m.Player is { } at) CentreOn(at);
            else { _zoom = 1f; _pan = Vector2.zero; Apply(); }
        }

        /// <summary>Zooms keeping the sheet point under a view point where it is.</summary>
        public void ZoomAbout(Vector2 viewPoint, float zoom)
        {
            _onPlayer = false;
            zoom = Mathf.Clamp(zoom, 1f, MaxZoom);
            var c = new Vector2(_view.layout.width, _view.layout.height) * 0.5f;
            _pan = (viewPoint - c) - (viewPoint - c - _pan) * (zoom / _zoom);
            _zoom = zoom;
            Apply();
        }

        private void OnDown(PointerDownEvent e)
        {
            _pointers[e.pointerId] = e.localPosition;
            _downAt = e.localPosition;
            _dragging = false;
            if (_pointers.Count == 2) StartPinch();
        }

        private void StartPinch()
        {
            var ps = new List<Vector2>(_pointers.Values);
            _pinchStart = Mathf.Max(1f, Vector2.Distance(ps[0], ps[1]));
            _zoomStart = _zoom;
            _midStart = (ps[0] + ps[1]) * 0.5f;
            _panStart = _pan;
            _dragging = true;
        }

        private void OnMove(PointerMoveEvent e)
        {
            if (!_pointers.TryGetValue(e.pointerId, out var last)) return;
            _pointers[e.pointerId] = e.localPosition;
            if (_pointers.Count >= 2)
            {
                var ps = new List<Vector2>(_pointers.Values);
                var zoom = Mathf.Clamp(_zoomStart * Vector2.Distance(ps[0], ps[1]) / _pinchStart, 1f, MaxZoom);
                var mid = (ps[0] + ps[1]) * 0.5f;
                var c = new Vector2(_view.layout.width, _view.layout.height) * 0.5f;
                _pan = (mid - c) - (_midStart - c - _panStart) * (zoom / _zoomStart);
                _zoom = zoom;
                _onPlayer = false;
                Apply();
                return;
            }
            if (!_dragging && Vector2.Distance((Vector2)e.localPosition, _downAt) > 10f)
            {
                _dragging = true;
                _view.CapturePointer(e.pointerId);   // only once it is a drag: a tap still reaches the place it fell on
            }
            if (_dragging) { _onPlayer = false; _pan += (Vector2)e.localPosition - last; Apply(); }
        }

        private void OnUp(PointerUpEvent e)
        {
            _pointers.Remove(e.pointerId);
            if (_view.HasPointerCapture(e.pointerId)) _view.ReleasePointer(e.pointerId);
            if (_pointers.Count < 2) _zoomStart = _zoom;
        }

        /// <summary>Opens a place's card (what its marker does).</summary>
        public void Choose(string id)
        {
            if (_dragging || _m.Layout == null || !_m.Layout.Places.TryGetValue(id, out var p)) return;
            Chosen = id;
            foreach (var kv in _markers) kv.Value.EnableInClassList("sf-map__place--on", kv.Key == id);
            _cardTitle.text = p.Name ?? id;
            _cardRegion.text = (p.Region ?? "").Replace('_', ' ').ToUpperInvariant();
            Trip trip = null;
            if (id == _m.Here) _cardTrip.text = Strings.Get("map.here");
            else
            {
                trip = _m.Plan?.Invoke(id);
                _cardTrip.text = trip == null ? Strings.Get("map.no_way") : Describe(trip);
            }
            _travel.style.display = _m.Travel != null && trip != null ? DisplayStyle.Flex : DisplayStyle.None;
            _card.style.display = DisplayStyle.Flex;
        }

        /// <summary>A journey in words: hours or days, and how (on foot, by a network).</summary>
        public static string Describe(Trip trip)
        {
            var how = trip.Legs.Count > 0 && trip.Legs.TrueForAll(l => l.Ride) ? Strings.Get("map.by_ride") : Strings.Get("map.on_foot");
            var time = trip.Hours < 1 ? Strings.Get("map.under_hour")
                : trip.Hours < 24 ? Strings.Get("map.hours", Mathf.RoundToInt((float)trip.Hours))
                : Strings.Get("map.days", Math.Round(trip.Hours / 24.0, 1));
            return $"{time} {how}";
        }

        protected internal override bool Back()
        {
            if (_card != null && _card.style.display == DisplayStyle.Flex) { _card.style.display = DisplayStyle.None; Chosen = null; return false; }
            return true;
        }
    }
}
