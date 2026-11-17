using System;
using System.Collections.Generic;

namespace SecondFace.Core.Combat
{
    /// <summary>
    /// A battlefield on a 1 m grid (the reference <see cref="IBattleField"/> + <see cref="IBattleGeometry"/>, for tests,
    /// the AI harness and tools): walls (full cover; block sight and walks), low walls (half cover; block walks, not
    /// sight), raised ground (heights; a step of more than a metre is a ledge that blocks walks and gives cover to those
    /// below it against those beyond), ground kinds for the surfaces (scrub, water, metal) and exits. Walks are the
    /// shortest 8-way paths over open cells (no corner cutting), metres as walked; sight is a line over the cells,
    /// blocked by walls and by ground higher than the line. Cell (i, j) spans [i, i+1) × [j, j+1); its centre is a point
    /// a unit can stand on.
    /// </summary>
    public sealed class GridField : IBattleField, IBattleGeometry
    {
        public const byte Open = 0, Low = 1, Wall = 2;
        public readonly int W, H;
        private readonly byte[] _cell;
        private readonly double[] _height;
        private readonly string[] _ground;
        public readonly List<(double X, double Z)> ExitPoints = new();
        public double Darkness;
        public double EyeHeight = 1.5;

        public GridField(int w, int h)
        {
            W = w; H = h;
            _cell = new byte[w * h]; _height = new double[w * h]; _ground = new string[w * h];
        }

        private bool In(int i, int j) => i >= 0 && j >= 0 && i < W && j < H;
        private int Ix(int i, int j) => j * W + i;
        public static int C(double v) => (int)Math.Floor(v);
        public static (double X, double Z) Centre(int i, int j) => (i + 0.5, j + 0.5);

        public byte CellAt(int i, int j) => In(i, j) ? _cell[Ix(i, j)] : Wall;
        public double HeightAt(int i, int j) => In(i, j) ? _height[Ix(i, j)] : 0;

        // ---- building ------------------------------------------------------------------------------------------------

        public GridField Set(int i, int j, byte kind) { if (In(i, j)) _cell[Ix(i, j)] = kind; Changed(); return this; }
        private void Changed() { _floods.Clear(); _from = -1; _dist = null; }
        public GridField Rect(int i0, int j0, int i1, int j1, byte kind) { for (var i = Math.Min(i0, i1); i <= Math.Max(i0, i1); i++) for (var j = Math.Min(j0, j1); j <= Math.Max(j0, j1); j++) Set(i, j, kind); return this; }
        public GridField Raise(int i0, int j0, int i1, int j1, double h) { for (var i = Math.Min(i0, i1); i <= Math.Max(i0, i1); i++) for (var j = Math.Min(j0, j1); j <= Math.Max(j0, j1); j++) if (In(i, j)) _height[Ix(i, j)] = h; Changed(); return this; }
        public GridField Ground(int i0, int j0, int i1, int j1, string g) { for (var i = Math.Min(i0, i1); i <= Math.Max(i0, i1); i++) for (var j = Math.Min(j0, j1); j <= Math.Max(j0, j1); j++) if (In(i, j)) _ground[Ix(i, j)] = g; return this; }
        public GridField Exit(double x, double z) { ExitPoints.Add((x, z)); return this; }

        private bool Walkable(int i, int j) => In(i, j) && _cell[Ix(i, j)] == Open;

        private bool Step(int i, int j, int ni, int nj)
        {
            if (!Walkable(ni, nj)) return false;
            if (Math.Abs(_height[Ix(ni, nj)] - _height[Ix(i, j)]) > 1.01) return false;
            if (ni != i && nj != j && (!Walkable(ni, j) || !Walkable(i, nj))) return false;
            return true;
        }

        // ---- walks: a Dijkstra flood from the unit's cell, kept until it moves ----------------------------------------------

        private int _from = -1;
        private double[] _dist;
        private int[] _prev;
        // (a few floods kept, the latest first: the AI asks from the mover and from its target in turn)
        private readonly List<(int From, double[] Dist, int[] Prev)> _floods = new();

        private void Flood(int si, int sj)
        {
            var s = Ix(si, sj);
            if (_from == s && _dist != null) return;
            for (var f = 0; f < _floods.Count; f++)
                if (_floods[f].From == s) { _from = s; _dist = _floods[f].Dist; _prev = _floods[f].Prev; return; }
            _from = s;
            if (_floods.Count >= 6) { var old = _floods[_floods.Count - 1]; _floods.RemoveAt(_floods.Count - 1); _dist = old.Dist; _prev = old.Prev; }
            else { _dist = new double[W * H]; _prev = new int[W * H]; }
            _floods.Insert(0, (s, _dist, _prev));
            for (var k = 0; k < _dist.Length; k++) { _dist[k] = double.PositiveInfinity; _prev[k] = -1; }
            if (!In(si, sj)) return;
            _dist[s] = 0;
            var open = new SortedSet<(double D, int K)> { (0, s) };
            while (open.Count > 0)
            {
                var (d, k) = open.Min; open.Remove(open.Min);
                if (d > _dist[k]) continue;
                int i = k % W, j = k / W;
                for (var di = -1; di <= 1; di++)
                    for (var dj = -1; dj <= 1; dj++)
                    {
                        if (di == 0 && dj == 0) continue;
                        int ni = i + di, nj = j + dj;
                        if (!Step(i, j, ni, nj)) continue;
                        var nk = Ix(ni, nj);
                        var nd = d + (di != 0 && dj != 0 ? 1.41421356 : 1.0);
                        if (nd < _dist[nk] - 1e-9) { if (!double.IsInfinity(_dist[nk])) open.Remove((_dist[nk], nk)); _dist[nk] = nd; _prev[nk] = k; open.Add((nd, nk)); }
                    }
            }
        }

        public double PathLength(BattleUnit u, double x, double z)
        {
            int si = C(u.PX), sj = C(u.PZ), ti = C(x), tj = C(z);
            if (!Walkable(ti, tj)) return double.PositiveInfinity;
            if (si == ti && sj == tj) return Tactics.Dist(u.PX, u.PZ, x, z);
            Flood(si, sj);
            var d = _dist[Ix(ti, tj)];
            if (double.IsInfinity(d)) return d;
            // (centre to centre; never shorter than the straight line)
            return Math.Max(Tactics.Dist(u.PX, u.PZ, x, z), d);
        }

        public IReadOnlyList<(double X, double Z)> Path(BattleUnit u, double x, double z)
        {
            int si = C(u.PX), sj = C(u.PZ), ti = C(x), tj = C(z);
            if (!Walkable(ti, tj)) return Array.Empty<(double, double)>();
            var pts = new List<(double X, double Z)>();
            if (si == ti && sj == tj) { pts.Add((u.PX, u.PZ)); pts.Add((x, z)); return pts; }
            Flood(si, sj);
            var k = Ix(ti, tj);
            if (double.IsInfinity(_dist[k])) return Array.Empty<(double, double)>();
            var cells = new List<int>();
            for (var c = k; c != -1 && c != _from; c = _prev[c]) cells.Add(c);
            cells.Reverse();
            pts.Add((u.PX, u.PZ));
            for (var n = 0; n < cells.Count - 1; n++) pts.Add(Centre(cells[n] % W, cells[n] / W));
            pts.Add((x, z));
            return pts;
        }

        // ---- sight ------------------------------------------------------------------------------------------------

        public bool SightBetween(double ax, double az, double bx, double bz)
        {
            int ai = C(ax), aj = C(az), bi = C(bx), bj = C(bz);
            if (!In(ai, aj) || !In(bi, bj)) return false;
            double ha = HeightAt(ai, aj) + EyeHeight, hb = HeightAt(bi, bj) + 1.1;
            var len = Tactics.Dist(ax, az, bx, bz);
            if (len < 1e-6) return true;
            var n = Math.Max(1, (int)Math.Ceiling(len / 0.25));
            for (var k = 1; k < n; k++)
            {
                var t = k / (double)n;
                double x = ax + (bx - ax) * t, z = az + (bz - az) * t;
                int i = C(x), j = C(z);
                if ((i == ai && j == aj) || (i == bi && j == bj)) continue;
                if (!In(i, j)) return false;
                if (_cell[Ix(i, j)] == Wall) return false;
                var line = ha + (hb - ha) * t;
                if (_height[Ix(i, j)] > line + 0.05) return false;
            }
            return true;
        }

        public bool LineOfSight(BattleUnit a, BattleUnit b) => SightBetween(a.PX, a.PZ, b.PX, b.PZ);
        public bool LineOfSightFrom(double x, double z, BattleUnit b) => SightBetween(x, z, b.PX, b.PZ);

        // ---- cover --------------------------------------------------------------------------------------------------

        private static readonly (int, int)[] Eight = { (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1) };

        public IReadOnlyList<CoverPiece> CoverAround(double x, double z)
        {
            int i = C(x), j = C(z);
            var l = new List<CoverPiece>();
            if (!In(i, j)) return l;
            var h = _height[Ix(i, j)];
            foreach (var (di, dj) in Eight)
            {
                int ni = i + di, nj = j + dj;
                string lvl = null;
                if (!In(ni, nj)) continue;
                var c = _cell[Ix(ni, nj)];
                var rise = _height[Ix(ni, nj)] - h;
                if (c == Wall || rise >= 1.4) lvl = "full";
                else if (c == Low || rise >= 0.7) lvl = "half";
                if (lvl == null) continue;
                // (a diagonal piece only counts where its neighbours do not already cover that side)
                if (di != 0 && dj != 0 && (CellAt(ni, j) != Open || CellAt(i, nj) != Open)) continue;
                l.Add(new CoverPiece(di, dj, lvl));
            }
            return l;
        }

        public string Cover(BattleUnit att, BattleUnit def) => Tactics.FromPieces(CoverAround(def.PX, def.PZ), att.PX - def.PX, att.PZ - def.PZ, Height(att.PX, att.PZ) - Height(def.PX, def.PZ)).Level;

        public double Height(double x, double z) => HeightAt(C(x), C(z));
        public string GroundAt(double x, double z) { int i = C(x), j = C(z); return In(i, j) ? _ground[Ix(i, j)] : null; }
        public IReadOnlyList<(double X, double Z)> Exits(BattleUnit u) => ExitPoints;
        public CombatContext Context(BattleUnit def) => new() { Darkness = Darkness, Night = Darkness > 0 };

        /// <summary>The open cells within reach: every cell with cover by it, and a two-metre lattice of the rest.</summary>
        public IEnumerable<(double X, double Z)> Candidates(BattleUnit u, double reach)
        {
            int si = C(u.PX), sj = C(u.PZ), r = (int)Math.Ceiling(reach) + 1;
            for (var j = sj - r; j <= sj + r; j++)
                for (var i = si - r; i <= si + r; i++)
                {
                    if (!Walkable(i, j)) continue;
                    var (x, z) = Centre(i, j);
                    if (Tactics.Dist(x, z, u.PX, u.PZ) > reach + 0.01) continue;
                    var covered = CoverAround(x, z).Count > 0;
                    if (covered || ((i & 1) == 0 && (j & 1) == 0)) yield return (x, z);
                }
        }
    }
}
