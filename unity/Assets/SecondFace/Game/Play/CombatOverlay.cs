using System.Collections.Generic;
using SecondFace.Core.Combat;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Rendering;

namespace SecondFace.Game.Play
{
    /// <summary>
    /// The fight's marks on the ground (COMBAT.md B1, B2, B4, B5), read at the overhead camera: the reachable area as two
    /// soft tints (move-and-act cool, dash amber) with a crisp, soft-edged line where each band ends (Core
    /// <see cref="ReachBands"/> over <see cref="Battle.BeginReach"/>'s grid, so the lines are the rules' own AP); the walk's
    /// path coloured by the band it runs through, its end ringed, the held shots it would draw marked where they fire and
    /// its first hazard; a throw's footprint (by kind) and its arc through the air; held shots' cones (or rings, all
    /// round); the pad's cursor. One material (<c>SecondFace/Combat Ground</c>, unlit, vertex alpha; Sprites/Default if
    /// the player lacks it), one mesh per layer (a few draw calls), rebuilt only when what it shows changes, from lists
    /// kept between builds (no allocation per frame). Heights are the ground's own (a ray down through people and
    /// triggers), the NavMesh's where there is none.
    /// </summary>
    public sealed class CombatOverlay : MonoBehaviour
    {
        public const float Lift = 0.05f, Line = 0.08f, Soft = 0.06f, Feather = 0.9f;

        public static readonly Color32 ActFill = new(120, 196, 255, 46), ActLine = new(178, 228, 255, 235);
        public static readonly Color32 DashFill = new(255, 190, 86, 34), DashLine = new(255, 186, 78, 225);
        public static readonly Color32 PathAct = new(214, 238, 255, 240), PathDash = new(255, 200, 96, 240), PathFar = new(236, 92, 70, 225);
        public static readonly Color32 Shot = new(240, 74, 52, 255), Hazard = new(255, 140, 40, 255), Cursor = new(255, 255, 255, 210);
        public static readonly Color32 WatchFill = new(230, 70, 52, 20), WatchEdge = new(236, 84, 60, 120);

        private Material _material;
        private Layer _reach, _path, _area, _watches, _cursor;
        private LineRenderer _arcLine;
        private readonly BandLines _bands = new();
        private readonly List<Vector3> _pts = new();
        private readonly List<Color32> _cols = new();
        private readonly RaycastHit[] _hits = new RaycastHit[8];

        /// <summary>What shows now (the tests read it).</summary>
        public bool ReachShown => _reach != null && _reach.Shown;
        public bool PathShown => _path != null && _path.Shown;
        public bool AreaShown => _area != null && _area.Shown;
        public bool WatchesShown => _watches != null && _watches.Shown;
        public bool CursorShown => _cursor != null && _cursor.Shown;
        /// <summary>The band lines last drawn (the tests read them): move-and-act, dash.</summary>
        public int ActLines => _bands.Act.Count;
        public int DashLines => _bands.Dash.Count;
        public int ReachVertices => _reach != null ? _reach.Vertices : 0;

        private sealed class Layer
        {
            public GameObject Go;
            public Mesh Mesh;
            public MeshRenderer Renderer;
            public readonly List<Vector3> V = new();
            public readonly List<Color32> C = new();
            public readonly List<int> T = new();
            public bool Shown => Go != null && Go.activeSelf && V.Count > 0;
            public int Vertices => V.Count;
            public void Clear() { V.Clear(); C.Clear(); T.Clear(); }
            public void Apply()
            {
                Mesh.Clear();
                Mesh.SetVertices(V);
                Mesh.SetColors(C);
                Mesh.SetTriangles(T, 0, false);
                Mesh.bounds = Bounds();
                Go.SetActive(V.Count > 0);
            }
            private Bounds Bounds()
            {
                if (V.Count == 0) return new Bounds();
                var b = new Bounds(V[0], Vector3.zero);
                for (var i = 1; i < V.Count; i++) b.Encapsulate(V[i]);
                b.Expand(1f);
                return b;
            }
        }

        private void Awake() => Build();

        private void Build()
        {
            if (_material != null) return;
            var shader = Shader.Find("SecondFace/Combat Ground");
            if (shader == null || !shader.isSupported) shader = Shader.Find("Sprites/Default");
            _material = new Material(shader) { name = "combat ground", renderQueue = 2980 };
            _reach = Make("combat reach"); _path = Make("combat path"); _area = Make("combat area"); _watches = Make("combat watches"); _cursor = Make("combat cursor");
            _arcLine = new GameObject("combat arc").AddComponent<LineRenderer>();
            _arcLine.transform.SetParent(transform, false);
            _arcLine.sharedMaterial = _material;
            _arcLine.startWidth = _arcLine.endWidth = 0.05f;
            _arcLine.shadowCastingMode = ShadowCastingMode.Off;
            _arcLine.receiveShadows = false;
            _arcLine.enabled = false;
        }

        private Layer Make(string name)
        {
            var l = new Layer { Go = new GameObject(name) };
            l.Go.transform.SetParent(transform, false);
            l.Mesh = new Mesh { name = name };
            l.Mesh.MarkDynamic();
            l.Go.AddComponent<MeshFilter>().sharedMesh = l.Mesh;
            l.Renderer = l.Go.AddComponent<MeshRenderer>();
            l.Renderer.sharedMaterial = _material;
            l.Renderer.shadowCastingMode = ShadowCastingMode.Off;
            l.Renderer.receiveShadows = false;
            l.Renderer.lightProbeUsage = LightProbeUsage.Off;
            l.Renderer.reflectionProbeUsage = ReflectionProbeUsage.Off;
            l.Go.SetActive(false);
            return l;
        }

        // ---- the ground ----------------------------------------------------------------------------------------------

        /// <summary>The ground's height at a point: the highest solid surface under it within a few metres of the hint (not a
        /// person, not a trigger), else the NavMesh's, else the hint.</summary>
        public float GroundY(float x, float z, float hint)
        {
            var from = new Vector3(x, hint + 3f, z);
            var n = Physics.RaycastNonAlloc(from, Vector3.down, _hits, 8f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            var best = float.NegativeInfinity;
            for (var i = 0; i < n; i++)
            {
                var c = _hits[i].collider;
                if (c == null || c.attachedRigidbody != null) continue;   // (a person's ragdoll bones)
                if (_hits[i].point.y > best) best = _hits[i].point.y;
            }
            if (!float.IsNegativeInfinity(best)) return best + Lift;
            return NavMesh.SamplePosition(new Vector3(x, hint, z), out var hit, 3f, NavMesh.AllAreas) ? hit.position.y + Lift : hint + Lift;
        }

        private Vector3 On(double x, double z, float hint) => new((float)x, GroundY((float)x, (float)z, hint), (float)z);

        // ---- B1: the reachable area ---------------------------------------------------------------------------------

        /// <summary>Draws a unit's reachable area: the tints by node (soft over a metre at each band's edge) and the bands'
        /// lines. <paramref name="hint"/>: the height the unit stands at.</summary>
        public void ShowReach(ReachMap m, float hint)
        {
            Build();
            var l = _reach;
            l.Clear();
            var n = m.GridN;
            if (n >= 2)
            {
                // the nodes: a vertex each, its tint by its metres (a node far outside is left out with its cells)
                var index = new int[n * n];
                for (var k = 0; k < index.Length; k++)
                {
                    var v = m.Grid[k];
                    var act = m.ActAp > 0 ? ReachBands.Weight(v, m.ActMetres, Feather) : 0f;
                    var dash = Mathf.Max(0f, ReachBands.Weight(v, m.DashMetres, Feather) - act);
                    if (act <= 0.001f && dash <= 0.001f) { index[k] = -1; continue; }
                    int i = k % n, j = k / n;
                    index[k] = l.V.Count;
                    l.V.Add(On(m.GridX0 + i * m.GridStep, m.GridZ0 + j * m.GridStep, hint));
                    l.C.Add(Mix(ActFill, act, DashFill, dash));
                }
                // the cells with any tint (a missing corner sits clear at its own place)
                for (var j = 0; j < n - 1; j++)
                    for (var i = 0; i < n - 1; i++)
                    {
                        int a = j * n + i, b = a + 1, c = a + n, d = c + 1;
                        if (index[a] < 0 && index[b] < 0 && index[c] < 0 && index[d] < 0) continue;
                        int ia = Node(m, index, a, hint), ib = Node(m, index, b, hint), ic = Node(m, index, c, hint), id = Node(m, index, d, hint);
                        l.T.Add(ia); l.T.Add(ic); l.T.Add(ib);
                        l.T.Add(ib); l.T.Add(ic); l.T.Add(id);
                    }
            }
            // the lines where the bands end
            ReachBands.Lines(m, _bands);
            foreach (var chain in _bands.Dash) Ribbon(l, chain, hint, DashLine, Line, Soft);
            foreach (var chain in _bands.Act) Ribbon(l, chain, hint, ActLine, Line, Soft);
            l.Apply();
        }

        /// <summary>A node's vertex, adding a clear one for a node outside every band (a cell's edge fades to nothing).</summary>
        private int Node(ReachMap m, int[] index, int k, float hint)
        {
            if (index[k] >= 0) return index[k];
            int i = k % m.GridN, j = k / m.GridN;
            index[k] = _reach.V.Count;
            _reach.V.Add(On(m.GridX0 + i * m.GridStep, m.GridZ0 + j * m.GridStep, hint));
            _reach.C.Add(new Color32(DashFill.r, DashFill.g, DashFill.b, 0));
            return index[k];
        }

        private static Color32 Mix(Color32 a, float wa, Color32 b, float wb)
        {
            var w = Mathf.Max(1e-4f, wa + wb);
            return new Color32((byte)((a.r * wa + b.r * wb) / w), (byte)((a.g * wa + b.g * wb) / w), (byte)((a.b * wa + b.b * wb) / w), (byte)Mathf.Clamp(a.a * wa + b.a * wb, 0f, 255f));
        }

        public void HideReach() { if (_reach != null) { _reach.Clear(); _reach.Apply(); } _bands.Clear(); }

        // ---- B2: the walk's path ------------------------------------------------------------------------------------

        /// <summary>Draws a walk: the path from its corners (on the ground every half metre), white-blue while an attack is
        /// still affordable after, amber where it becomes a dash, red past the AP; its end ringed; a red ring where each held
        /// shot would fire on it; an orange one at its first hazard.</summary>
        public void ShowPath(IReadOnlyList<Vector3> corners, double actMetres, double dashMetres, IReadOnlyList<Vector3> shots, Vector3? hazard, float hint)
        {
            Build();
            var l = _path;
            l.Clear();
            _pts.Clear(); _cols.Clear();
            var walked = 0.0;
            for (var i = 0; i < corners.Count; i++)
            {
                if (i > 0)
                {
                    var a = corners[i - 1]; var b = corners[i];
                    var seg = Vector3.Distance(new Vector3(a.x, 0, a.z), new Vector3(b.x, 0, b.z));
                    var steps = Mathf.Max(1, Mathf.CeilToInt(seg / 0.5f));
                    for (var s = 1; s <= steps; s++)
                    {
                        var p = Vector3.Lerp(a, b, s / (float)steps);
                        var m = walked + seg * s / steps;
                        _pts.Add(new Vector3(p.x, GroundY(p.x, p.z, hint), p.z));
                        _cols.Add(m <= actMetres + 1e-3 ? PathAct : m <= dashMetres + 1e-3 ? PathDash : PathFar);
                    }
                    walked += seg;
                }
                else { _pts.Add(new Vector3(corners[0].x, GroundY(corners[0].x, corners[0].z, hint), corners[0].z)); _cols.Add(PathAct); }
            }
            if (_pts.Count >= 2) Ribbon(l, _pts, _cols, 0.11f, 0.06f);
            if (_pts.Count > 0)
            {
                var end = _pts[_pts.Count - 1];
                Ring(l, end, 0.45f, 0.07f, _cols[_cols.Count - 1], 28, hint);
                Disc(l, end, 0.42f, new Color32(_cols[_cols.Count - 1].r, _cols[_cols.Count - 1].g, _cols[_cols.Count - 1].b, 40), 20, hint);
            }
            if (shots != null) foreach (var s in shots) { Ring(l, s, 0.32f, 0.08f, Shot, 20, hint); Cross(l, s, 0.22f, Shot, hint); }
            if (hazard is { } h) Ring(l, h, 0.38f, 0.08f, Hazard, 20, hint);
            l.Apply();
        }

        public void HidePath() { if (_path != null) { _path.Clear(); _path.Apply(); } }

        // ---- B5: a throw's footprint and its arc ------------------------------------------------------------------------

        /// <summary>Draws where a throw would land: a disc of its radius tinted by its kind with a ring at its edge, the scatter
        /// as a fainter ring, and the arc from the hand through the air.</summary>
        public void ShowArea(Vector3 centre, float radius, float scatter, string kind, IReadOnlyList<Vector3> arc, bool ok, float hint)
        {
            Build();
            var l = _area;
            l.Clear();
            var c = KindColour(kind, ok);
            Disc(l, centre, radius, new Color32(c.r, c.g, c.b, 52), 40, hint);
            Ring(l, centre, radius, 0.08f, c, 48, hint);
            if (scatter > 0.3f) Ring(l, centre, radius + scatter, 0.04f, new Color32(c.r, c.g, c.b, 90), 48, hint);
            l.Apply();
            if (arc != null && arc.Count >= 2)
            {
                _arcLine.positionCount = arc.Count;
                for (var i = 0; i < arc.Count; i++) _arcLine.SetPosition(i, arc[i]);
                _arcLine.startColor = new Color32(255, 246, 228, 220); _arcLine.endColor = new Color32(c.r, c.g, c.b, 230);
                _arcLine.enabled = true;
            }
            else _arcLine.enabled = false;
        }

        public void HideArea()
        {
            if (_area != null) { _area.Clear(); _area.Apply(); }
            if (_arcLine != null) _arcLine.enabled = false;
        }

        /// <summary>A throw's colour by what it does: blast red, fire orange, smoke grey, flash white, chem green, shock blue;
        /// dimmed when it cannot be thrown.</summary>
        public static Color32 KindColour(string kind, bool ok)
        {
            Color32 c = kind switch
            {
                "fire" => new Color32(255, 128, 40, 230), "smoke" => new Color32(200, 200, 196, 220), "flash" => new Color32(255, 250, 220, 230),
                "chem" => new Color32(150, 220, 70, 230), "shock" => new Color32(90, 170, 255, 230), _ => new Color32(240, 70, 52, 230),
            };
            if (!ok) c.a = 110;
            return c;
        }

        // ---- B5: held shots -----------------------------------------------------------------------------------------

        /// <summary>Draws every held shot: a cone (faint fill, a brighter edge) for one aimed one way, a ring at its reach for
        /// one held all round. <paramref name="at"/>: where each holder's body stands.</summary>
        public void ShowWatches(IReadOnlyList<WatchView> watches, System.Func<BattleUnit, Vector3?> at)
        {
            Build();
            var l = _watches;
            l.Clear();
            foreach (var w in watches)
            {
                var p = at(w.Unit);
                if (p == null) continue;
                var o = p.Value;
                var r = (float)w.Range;
                if (w.HalfAngle >= 180) Ring(l, o, r, 0.05f, WatchEdge, 64, o.y);
                else Fan(l, o, new Vector3((float)w.DirX, 0, (float)w.DirZ), (float)w.HalfAngle, r, WatchFill, WatchEdge, o.y);
            }
            l.Apply();
        }

        public void HideWatches() { if (_watches != null) { _watches.Clear(); _watches.Apply(); } }

        // ---- B10: the pad's cursor ------------------------------------------------------------------------------------

        public void ShowCursor(Vector3 at)
        {
            Build();
            var l = _cursor;
            l.Clear();
            Ring(l, at, 0.35f, 0.06f, Cursor, 24, at.y);
            Cross(l, at, 0.12f, Cursor, at.y);
            l.Apply();
        }

        public void HideCursor() { if (_cursor != null) { _cursor.Clear(); _cursor.Apply(); } }

        public void Clear() { HideReach(); HidePath(); HideArea(); HideWatches(); HideCursor(); }

        private void OnDestroy()
        {
            foreach (var l in new[] { _reach, _path, _area, _watches, _cursor }) if (l?.Mesh != null) Destroy(l.Mesh);
            if (_material != null) Destroy(_material);
        }

        // ---- shapes -----------------------------------------------------------------------------------------------------

        private void Ribbon(Layer l, List<(double X, double Z)> chain, float hint, Color32 col, float width, float soft)
        {
            _pts.Clear(); _cols.Clear();
            foreach (var (x, z) in chain) { _pts.Add(On(x, z, hint)); _cols.Add(col); }
            Ribbon(l, _pts, _cols, width, soft);
        }

        /// <summary>A strip along points on the ground: a solid core <paramref name="width"/> wide with a soft edge each side
        /// (alpha to nothing over <paramref name="soft"/>), coloured point by point.</summary>
        private static void Ribbon(Layer l, List<Vector3> pts, List<Color32> cols, float width, float soft)
        {
            var n = pts.Count;
            if (n < 2) return;
            var closed = (pts[0] - pts[n - 1]).sqrMagnitude < 1e-6f;
            var start = l.V.Count;
            for (var i = 0; i < n; i++)
            {
                var prev = i > 0 ? pts[i - 1] : closed ? pts[n - 2] : pts[i];
                var next = i < n - 1 ? pts[i + 1] : closed ? pts[1] : pts[i];
                var t = next - prev; t.y = 0f;
                if (t.sqrMagnitude < 1e-8f) t = Vector3.forward;
                t.Normalize();
                var side = new Vector3(-t.z, 0f, t.x);
                var c = cols[i]; var clear = new Color32(c.r, c.g, c.b, 0);
                var p = pts[i];
                l.V.Add(p - side * (width * 0.5f + soft)); l.C.Add(clear);
                l.V.Add(p - side * (width * 0.5f)); l.C.Add(c);
                l.V.Add(p + side * (width * 0.5f)); l.C.Add(c);
                l.V.Add(p + side * (width * 0.5f + soft)); l.C.Add(clear);
            }
            for (var i = 0; i < n - 1; i++)
            {
                var a = start + i * 4; var b = a + 4;
                for (var k = 0; k < 3; k++)
                {
                    l.T.Add(a + k); l.T.Add(b + k); l.T.Add(a + k + 1);
                    l.T.Add(a + k + 1); l.T.Add(b + k); l.T.Add(b + k + 1);
                }
            }
        }

        private void Ring(Layer l, Vector3 c, float r, float width, Color32 col, int seg, float hint)
        {
            _pts.Clear(); _cols.Clear();
            for (var i = 0; i <= seg; i++)
            {
                var a = i / (float)seg * Mathf.PI * 2f;
                float x = c.x + Mathf.Cos(a) * r, z = c.z + Mathf.Sin(a) * r;
                _pts.Add(new Vector3(x, GroundY(x, z, hint), z));
                _cols.Add(col);
            }
            _pts[seg] = _pts[0];
            Ribbon(l, _pts, _cols, width, width * 0.6f);
        }

        private void Disc(Layer l, Vector3 c, float r, Color32 col, int seg, float hint)
        {
            var centre = l.V.Count;
            l.V.Add(new Vector3(c.x, GroundY(c.x, c.z, hint), c.z)); l.C.Add(col);
            var edge = new Color32(col.r, col.g, col.b, (byte)(col.a / 2));
            for (var i = 0; i < seg; i++)
            {
                var a = i / (float)seg * Mathf.PI * 2f;
                float x = c.x + Mathf.Cos(a) * r, z = c.z + Mathf.Sin(a) * r;
                l.V.Add(new Vector3(x, GroundY(x, z, hint), z)); l.C.Add(edge);
            }
            for (var i = 0; i < seg; i++) { l.T.Add(centre); l.T.Add(centre + 1 + (i + 1) % seg); l.T.Add(centre + 1 + i); }
        }

        private void Fan(Layer l, Vector3 o, Vector3 dir, float halfDeg, float r, Color32 fill, Color32 edge, float hint)
        {
            if (dir.sqrMagnitude < 1e-6f) dir = Vector3.forward;
            var baseAngle = Mathf.Atan2(dir.z, dir.x);
            var half = halfDeg * Mathf.Deg2Rad;
            var seg = Mathf.Max(6, Mathf.CeilToInt(halfDeg / 6f));
            var centre = l.V.Count;
            l.V.Add(new Vector3(o.x, GroundY(o.x, o.z, hint), o.z)); l.C.Add(fill);
            _pts.Clear(); _cols.Clear();
            _pts.Add(l.V[centre]); _cols.Add(edge);
            for (var i = 0; i <= seg; i++)
            {
                var a = baseAngle - half + 2f * half * i / seg;
                float x = o.x + Mathf.Cos(a) * r, z = o.z + Mathf.Sin(a) * r;
                var p = new Vector3(x, GroundY(x, z, hint), z);
                l.V.Add(p); l.C.Add(new Color32(fill.r, fill.g, fill.b, (byte)(fill.a / 3)));
                _pts.Add(p); _cols.Add(edge);
            }
            for (var i = 0; i < seg; i++) { l.T.Add(centre); l.T.Add(centre + 2 + i); l.T.Add(centre + 1 + i); }
            _pts.Add(l.V[centre]); _cols.Add(edge);
            Ribbon(l, _pts, _cols, 0.05f, 0.04f);
        }

        private void Cross(Layer l, Vector3 c, float r, Color32 col, float hint)
        {
            foreach (var (dx, dz) in new[] { (1f, 1f), (1f, -1f) })
            {
                _pts.Clear(); _cols.Clear();
                var a = new Vector3(c.x - dx * r, 0, c.z - dz * r); var b = new Vector3(c.x + dx * r, 0, c.z + dz * r);
                a.y = GroundY(a.x, a.z, hint); b.y = GroundY(b.x, b.z, hint);
                _pts.Add(a); _pts.Add(b); _cols.Add(col); _cols.Add(col);
                Ribbon(l, _pts, _cols, 0.06f, 0.03f);
            }
        }
    }
}
