using System;
using System.Collections.Generic;

namespace SecondFace.Core.Combat
{
    /// <summary>One metre of ground in a fight (COMBAT.md C5): what lies on it (oil, water, the field's own scrub), what
    /// burns on it, the cloud over it (smoke, chem, steam) and whether current runs through it.</summary>
    public sealed class SurfaceCell
    {
        /// <summary>null (plain), oil, water, scrub, ash (burnt out), metal.</summary>
        public string Ground;
        /// <summary>Rounds a spilt ground lasts (oil, a puddle); 0 = for good (the field's own).</summary>
        public int GroundTtl;
        /// <summary>Rounds of fire left (0 = not burning).</summary>
        public int Fire;
        /// <summary>null, smoke, chem or steam.</summary>
        public string Cloud;
        public int CloudTtl;
        /// <summary>Rounds the current runs (electrified water or metal).</summary>
        public int Shock;
        /// <summary>The field's own ground was looked up (a cell made by a spill keeps its spill).</summary>
        public bool Seeded;
        /// <summary>Who lit, spilt or released what is here (the kills and their XP go to them).</summary>
        public string From;

        public bool Hazard => Fire > 0 || Cloud == "chem" || Shock > 0;
        public bool Empty => Ground == null && Fire == 0 && Cloud == null && Shock == 0;
    }

    /// <summary>
    /// The ground of a fight as a 1 m grid (COMBAT.md C5; BUILD_PLAN §6.G): fire spreads over oil (nearly always) and
    /// dry scrub (often), burns oil away, cannot stand on water; oil slows a walk (twice the AP) and burns; water douses
    /// fire and the burning, and carries a shock through itself; smoke blocks sight and thins; a chem cloud chokes and
    /// bursts into flame when fire reaches it; steam rises where fire meets water. Ticks once a round, deterministic on
    /// the battle's Rng. The field's own ground (scrub, water, metal) is read once per cell from the geometry.
    /// </summary>
    public sealed class SurfaceGrid
    {
        public const double Cell = 1.0;
        public const int FireOnOil = 3, FireOnScrub = 2, FireBare = 2, SmokeRounds = 3, ChemRounds = 3, ShockRounds = 1;
        public const double SpreadOil = 0.9, SpreadScrub = 0.4;

        private readonly Dictionary<long, SurfaceCell> _cells = new();
        /// <summary>The field's own ground at a point (null when the field has none to say).</summary>
        public Func<double, double, string> BaseGround;

        public static int CellOf(double v) => (int)Math.Floor(v / Cell);
        private static long Key(int cx, int cz) => ((long)cx << 32) ^ (uint)cz;
        public static (double X, double Z) Centre(int cx, int cz) => ((cx + 0.5) * Cell, (cz + 0.5) * Cell);

        public int Count => _cells.Count;

        /// <summary>The cell at a point if anything is known of it (null otherwise).</summary>
        public SurfaceCell Peek(double x, double z) => Peek(CellOf(x), CellOf(z));
        public SurfaceCell Peek(int cx, int cz)
        {
            if (_cells.TryGetValue(Key(cx, cz), out var c)) return c;
            if (BaseGround == null) return null;
            var (x, z) = Centre(cx, cz);
            var g = BaseGround(x, z);
            if (g == null) return null;
            c = new SurfaceCell { Ground = g, Seeded = true };
            _cells[Key(cx, cz)] = c;
            return c;
        }

        /// <summary>The cell at a point, made when needed (seeded from the field's ground).</summary>
        public SurfaceCell At(int cx, int cz)
        {
            var c = Peek(cx, cz);
            if (c != null) return c;
            c = new SurfaceCell { Seeded = true };
            _cells[Key(cx, cz)] = c;
            return c;
        }

        public SurfaceCell At(double x, double z) => At(CellOf(x), CellOf(z));

        /// <summary>Every cell whose centre lies within the radius of a point.</summary>
        public IEnumerable<(int CX, int CZ)> Disc(double x, double z, double radius)
        {
            int r = (int)Math.Ceiling(radius / Cell) + 1, cx0 = CellOf(x), cz0 = CellOf(z);
            for (var i = -r; i <= r; i++)
                for (var j = -r; j <= r; j++)
                {
                    var (px, pz) = Centre(cx0 + i, cz0 + j);
                    if (Tactics.Dist(px, pz, x, z) <= Math.Max(radius, Cell * 0.5)) yield return (cx0 + i, cz0 + j);
                }
        }

        public IEnumerable<(int CX, int CZ, SurfaceCell C)> All()
        {
            foreach (var kv in _cells)
            {
                var cx = (int)(kv.Key >> 32); var cz = (int)(uint)kv.Key;
                yield return (cx, cz, kv.Value);
            }
        }

        // ---- making surfaces ------------------------------------------------------------------------------------------

        /// <summary>Spills a ground (oil, water) over a disc.</summary>
        public void Spill(string ground, double x, double z, double radius, int rounds = 0, string from = null)
        {
            foreach (var (cx, cz) in Disc(x, z, radius))
            {
                var c = At(cx, cz);
                if (ground == "water") { c.Fire = 0; if (c.Ground == "oil") c.GroundTtl = 0; }
                c.Ground = ground; c.GroundTtl = rounds; c.From = from ?? c.From;
            }
        }

        /// <summary>Sets fire to a disc (not on water: steam rises instead; a chem cloud bursts).</summary>
        public List<(int CX, int CZ)> Ignite(double x, double z, double radius, string from = null)
        {
            var lit = new List<(int, int)>();
            foreach (var (cx, cz) in Disc(x, z, radius)) if (IgniteCell(cx, cz, FireBare, from)) lit.Add((cx, cz));
            return lit;
        }

        /// <summary>A chem cloud's cells that burst when fire reached them this round (the battle hurts whoever stands
        /// in them).</summary>
        public readonly List<(int CX, int CZ, string From)> Bursts = new();

        private bool IgniteCell(int cx, int cz, int bare, string from)
        {
            var c = At(cx, cz);
            if (c.Ground == "water") { c.Cloud = "steam"; c.CloudTtl = Math.Max(c.CloudTtl, 1); return false; }
            if (c.Ground == "ash") return false;
            if (c.Cloud == "chem") { Bursts.Add((cx, cz, from ?? c.From)); c.Cloud = null; c.CloudTtl = 0; }
            var t = c.Ground == "oil" ? FireOnOil : c.Ground == "scrub" ? FireOnScrub : bare;
            if (c.Fire >= t) return false;
            c.Fire = t; c.From = from ?? c.From;
            if (c.Cloud == "smoke" || c.Cloud == null) { }
            return true;
        }

        /// <summary>Lays a cloud over a disc (smoke, chem).</summary>
        public void Cloud(string kind, double x, double z, double radius, int rounds, string from = null)
        {
            foreach (var (cx, cz) in Disc(x, z, radius))
            {
                var c = At(cx, cz);
                if (kind == "chem" && c.Fire > 0) { Bursts.Add((cx, cz, from)); continue; }
                c.Cloud = kind; c.CloudTtl = Math.Max(c.CloudTtl, rounds); c.From = from ?? c.From;
            }
        }

        /// <summary>A blast clears the smoke and lights oil and chem in its radius.</summary>
        public void Blast(double x, double z, double radius, string from = null)
        {
            foreach (var (cx, cz) in Disc(x, z, radius))
            {
                var c = Peek(cx, cz);
                if (c == null) continue;
                if (c.Cloud == "smoke" || c.Cloud == "steam") { c.Cloud = null; c.CloudTtl = 0; }
                if (c.Ground == "oil" || c.Cloud == "chem") IgniteCell(cx, cz, FireBare, from);
            }
        }

        /// <summary>Current through the water (or metal) connected to a point, up to a reach: every such cell is
        /// electrified for a round. Returns the cells.</summary>
        public List<(int CX, int CZ)> Electrify(double x, double z, double reach = 8, string from = null)
        {
            var hit = new List<(int, int)>();
            int sx = CellOf(x), sz = CellOf(z);
            var start = Peek(sx, sz);
            if (start == null || (start.Ground != "water" && start.Ground != "metal")) return hit;
            var seen = new HashSet<long> { Key(sx, sz) };
            var q = new Queue<(int, int)>(); q.Enqueue((sx, sz));
            while (q.Count > 0)
            {
                var (cx, cz) = q.Dequeue();
                var c = Peek(cx, cz);
                if (c == null || (c.Ground != "water" && c.Ground != "metal")) continue;
                var (px, pz) = Centre(cx, cz);
                if (Tactics.Dist(px, pz, x, z) > reach) continue;
                c.Shock = Math.Max(c.Shock, ShockRounds); c.From = from ?? c.From;
                hit.Add((cx, cz));
                foreach (var (dx, dz) in Four)
                    if (seen.Add(Key(cx + dx, cz + dz))) q.Enqueue((cx + dx, cz + dz));
            }
            return hit;
        }

        private static readonly (int, int)[] Four = { (1, 0), (-1, 0), (0, 1), (0, -1) };
        private static readonly (int, int)[] Eight = { (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1) };

        // ---- the round's tick ---------------------------------------------------------------------------------------------

        /// <summary>A round passes: fire spreads to oil and scrub next to it (and bursts chem), burns down (oil and scrub
        /// burn away to ash), clouds thin, the current stops, spills dry.</summary>
        public void Tick(Rng rng)
        {
            Bursts.Clear();
            var burning = new List<(int CX, int CZ, string From)>();
            foreach (var (cx, cz, c) in All()) if (c.Fire > 0) burning.Add((cx, cz, c.From));
            // (sorted: a dictionary's order is not to be relied on, and the spread rolls dice)
            burning.Sort((a, b) => a.CX != b.CX ? a.CX.CompareTo(b.CX) : a.CZ.CompareTo(b.CZ));
            var toLight = new List<(int, int, string)>();
            foreach (var (cx, cz, from) in burning)
                foreach (var (dx, dz) in Eight)
                {
                    var n = Peek(cx + dx, cz + dz);
                    if (n == null || n.Fire > 0) continue;
                    var p = n.Ground == "oil" ? SpreadOil : n.Ground == "scrub" ? SpreadScrub : n.Cloud == "chem" ? 1.0 : 0;
                    if (p > 0 && rng.Chance(p)) toLight.Add((cx + dx, cz + dz, from));
                }
            foreach (var (cx, cz, c) in All())
            {
                if (c.Fire > 0)
                {
                    c.Fire--;
                    if (c.Fire == 0 && (c.Ground == "oil" || c.Ground == "scrub")) { c.Ground = "ash"; c.GroundTtl = 0; }
                    // (fire under smoke feeds it; fire makes a little smoke of its own on oil)
                }
                if (c.Cloud != null && --c.CloudTtl <= 0) { c.Cloud = null; c.CloudTtl = 0; }
                if (c.Shock > 0) c.Shock--;
                if (c.GroundTtl > 0 && --c.GroundTtl == 0 && c.Ground != "ash") c.Ground = null;
            }
            foreach (var (cx, cz, from) in toLight) IgniteCell(cx, cz, FireBare, from);
        }

        // ---- reading -------------------------------------------------------------------------------------------------

        /// <summary>Whether smoke (or steam) lies along a line between two points, away from both ends (the first and
        /// last metre do not count: a body in a cloud is still seen at arm's length).</summary>
        public bool BlocksSight(double ax, double az, double bx, double bz)
        {
            if (_cells.Count == 0) return false;
            var len = Tactics.Dist(ax, az, bx, bz);
            if (len < 2.0) return false;
            for (var d = 1.0; d <= len - 1.0 + 1e-9; d += 0.5)
            {
                var t = d / len;
                var c = Peek(CellOf(ax + (bx - ax) * t), CellOf(az + (bz - az) * t));
                if (c != null && (c.Cloud == "smoke" || c.Cloud == "steam")) return true;
            }
            return false;
        }

        /// <summary>Whether a point stands in smoke (attacks at it are concealed).</summary>
        public bool InSmoke(double x, double z) { var c = Peek(x, z); return c != null && (c.Cloud == "smoke" || c.Cloud == "steam"); }

        /// <summary>The metres of a walk that cross oil (they cost twice).</summary>
        public double SlowMetres(IReadOnlyList<(double X, double Z)> path)
        {
            if (_cells.Count == 0 || path == null) return 0;
            double slow = 0;
            ForEachStep(path, 0.5, (x, z, step) => { var c = Peek(x, z); if (c != null && c.Ground == "oil") slow += step; return true; });
            return slow;
        }

        /// <summary>The first hazard a walk crosses (fire, chem, current), or null.</summary>
        public SurfaceCell HazardOn(IReadOnlyList<(double X, double Z)> path, bool skipStart = true)
        {
            if (_cells.Count == 0 || path == null) return null;
            SurfaceCell found = null;
            var first = true;
            ForEachStep(path, 0.5, (x, z, step) =>
            {
                if (first && skipStart) { first = false; return true; }
                var c = Peek(x, z);
                if (c != null && c.Hazard) { found = c; return false; }
                return true;
            });
            return found;
        }

        /// <summary>Walks a path in steps (callback: x, z, the step's metres; false stops).</summary>
        public static void ForEachStep(IReadOnlyList<(double X, double Z)> path, double step, Func<double, double, double, bool> f)
        {
            if (path == null || path.Count == 0) return;
            if (!f(path[0].X, path[0].Z, 0)) return;
            for (var i = 1; i < path.Count; i++)
            {
                double ax = path[i - 1].X, az = path[i - 1].Z, bx = path[i].X, bz = path[i].Z;
                var seg = Tactics.Dist(ax, az, bx, bz);
                var n = Math.Max(1, (int)Math.Ceiling(seg / step));
                for (var k = 1; k <= n; k++)
                {
                    var t = k / (double)n;
                    if (!f(ax + (bx - ax) * t, az + (bz - az) * t, seg / n)) return;
                }
            }
        }

        // ---- saving ----------------------------------------------------------------------------------------------------

        public List<SurfaceSave> Save()
        {
            var l = new List<SurfaceSave>();
            foreach (var (cx, cz, c) in All())
                if (!c.Empty && !(c.Seeded && c.Fire == 0 && c.Cloud == null && c.Shock == 0 && c.GroundTtl == 0 && c.Ground != "oil" && c.Ground != "ash"))
                    l.Add(new SurfaceSave { X = cx, Z = cz, Ground = c.Ground, GroundTtl = c.GroundTtl, Fire = c.Fire, Cloud = c.Cloud, CloudTtl = c.CloudTtl, Shock = c.Shock, From = c.From });
            l.Sort((a, b) => a.X != b.X ? a.X.CompareTo(b.X) : a.Z.CompareTo(b.Z));
            return l;
        }

        public void Load(IEnumerable<SurfaceSave> cells)
        {
            _cells.Clear();
            if (cells == null) return;
            foreach (var s in cells)
                _cells[Key(s.X, s.Z)] = new SurfaceCell { Ground = s.Ground, GroundTtl = s.GroundTtl, Fire = s.Fire, Cloud = s.Cloud, CloudTtl = s.CloudTtl, Shock = s.Shock, From = s.From, Seeded = true };
        }
    }

    /// <summary>A surface cell as saved.</summary>
    public sealed class SurfaceSave
    {
        public int X, Z;
        public string Ground; public int GroundTtl; public int Fire; public string Cloud; public int CloudTtl; public int Shock; public string From;
    }

    /// <summary>
    /// Something on the field that goes up (COMBAT.md C5; DESIGN_UNITY §5.2: barrels, pipes, generators, vehicles): it
    /// can be shot at, takes blast and fire, and at no health bursts: a fuel drum in a fireball over spilt burning fuel, a
    /// chem drum in a choking cloud, a generator in a blast and current through the water about it.
    /// </summary>
    public sealed class BattleProp
    {
        public string Id;
        /// <summary>fuel, chem, generator (or anything else: a plain blast).</summary>
        public string Kind;
        public double X, Z;
        public int Hp = 10;
        public bool Destroyed;
        public double Radius => Kind == "generator" ? 2.5 : 3.0;
        public int[] Dmg => Kind == "chem" ? new[] { 6, 12 } : Kind == "generator" ? new[] { 10, 20 } : new[] { 15, 30 };
    }
}
