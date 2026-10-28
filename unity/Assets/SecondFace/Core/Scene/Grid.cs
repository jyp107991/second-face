using System;
using System.Collections.Generic;

namespace SecondFace.Core.Scene
{
    /// <summary>A tile position.</summary>
    public readonly struct Cell : IEquatable<Cell>
    {
        public readonly int X, Y;
        public Cell(int x, int y) { X = x; Y = y; }
        public bool Equals(Cell o) => X == o.X && Y == o.Y;
        public override bool Equals(object o) => o is Cell c && Equals(c);
        public override int GetHashCode() => (X * 397) ^ Y;
        public override string ToString() => $"({X},{Y})";
    }

    /// <summary>One tile of a built map: what it was drawn as and what that means for movement, sight and cover.</summary>
    public sealed class GridTile
    {
        public int X, Y;
        public TileDef Def;
        public bool Walkable;
        /// <summary>Blocks line of sight (full walls, tall props).</summary>
        public bool Opaque;
        public string Cover = CoverKind.None;
    }

    public sealed class PathOpts
    {
        /// <summary>Entity whose own tile does not count as occupied (the mover).</summary>
        public string Ignore;
        /// <summary>Bound on the path's cost (e.g. action points).</summary>
        public double? MaxCost;
        /// <summary>Accept a path ending next to an impassable goal (an actor, a container).</summary>
        public bool AdjacentOk;
        /// <summary>Most nodes expanded before giving up (the open world).</summary>
        public long? Budget;
    }

    /// <summary>
    /// The walkability, sight and cover grid of a map (port of scene/grid.ts): built from the layout legend and the
    /// props, with dynamic occupancy by actors; A* over 8-connected tiles and Bresenham line of sight.
    /// </summary>
    public sealed class Grid
    {
        private static readonly Dictionary<string, string> PropBlocks = new()
        {
            ["crate"] = "half", ["barrel"] = "half", ["barrel_rust"] = "half", ["locker"] = "full", ["table"] = "half", ["chair"] = "none",
            ["bed"] = "half", ["terminal"] = "half", ["pipe_h"] = "half", ["lamp_post"] = "none", ["car_wreck"] = "full", ["rock"] = "full",
            ["rock_small"] = "half", ["tire_pile"] = "half", ["tank"] = "full", ["vault_door"] = "full", ["dead_tree"] = "half",
            ["sandbags"] = "half", ["shelf"] = "full", ["stove"] = "half", ["fire_barrel"] = "half", ["campfire"] = "none", ["cactus"] = "half",
            ["sign"] = "none", ["counter"] = "half", ["planter"] = "half", ["machine"] = "full", ["cot"] = "half", ["tent"] = "full",
            ["fence_post"] = "none", ["debris"] = "half", ["pump"] = "half", ["wagon"] = "full", ["horse"] = "half", ["blanket"] = "none",
        };

        /// <summary>Props that occupy their tile (not walkable).</summary>
        private static readonly HashSet<string> PropSolid = BuildSolid();

        private static HashSet<string> BuildSolid()
        {
            var s = new HashSet<string>(PropBlocks.Keys);
            s.Remove("sign"); s.Remove("debris"); s.Remove("blanket");
            return s;
        }

        public readonly int Width;
        public readonly int Height;
        public readonly GridTile[] Tiles;
        /// <summary>Dynamic occupancy (actors): tile index → entity id.</summary>
        public readonly Dictionary<int, string> Occupied = new();

        /// <param name="stripRim">The rock or wall the map was drawn with round its border becomes open ground (an open-world site).</param>
        public Grid(MapDef map, bool stripRim = false)
        {
            Height = map.Layout.Count;
            Width = 0;
            foreach (var r in map.Layout) Width = Math.Max(Width, r.Length);
            Tiles = new GridTile[Width * Height];
            // What a stripped rim becomes: the commonest open floor inside the map (a city district's rim is rubble, not sand).
            var rimFloor = "sand";
            if (stripRim)
            {
                var count = new Dictionary<string, int>();
                foreach (var row in map.Layout)
                    foreach (var ch in row)
                    {
                        if (!map.Legend.TryGetValue(ch.ToString(), out var d) || d == null) continue;
                        if (d.Wall == null && d.Empty != true && d.Floor != null && d.Floor != "water")
                            count[d.Floor] = (count.TryGetValue(d.Floor, out var c) ? c : 0) + 1;
                    }
                var best = 0;
                foreach (var kv in count) if (kv.Value > best) { best = kv.Value; rimFloor = kv.Key; }
            }
            var empty = new TileDef { Empty = true };
            for (var y = 0; y < Height; y++)
            {
                var row = map.Layout[y];
                for (var x = 0; x < Width; x++)
                {
                    var ch = x < row.Length ? row[x].ToString() : " ";
                    if (!map.Legend.TryGetValue(ch, out var def) || def == null) def = empty;
                    if (stripRim && def.Wall != null && (x == 0 || y == 0 || x == Width - 1 || y == Height - 1)) def = new TileDef { Floor = def.Floor ?? rimFloor };
                    Tiles[y * Width + x] = MakeTile(x, y, def);
                }
            }
            if (map.Props != null)
                foreach (var p in map.Props)
                {
                    var t = Get(p.X, p.Y);
                    if (t == null) continue;
                    var cover = PropBlocks.TryGetValue(p.Kind, out var c) ? c : CoverKind.None;
                    if (PropSolid.Contains(p.Kind)) t.Walkable = false;
                    if (cover == CoverKind.Full) t.Opaque = true;
                    t.Cover = CoverKind.Max(t.Cover, cover);
                }
        }

        public static GridTile MakeTile(int x, int y, TileDef def)
        {
            var walkable = def.Empty != true;
            var opaque = false;
            var cover = def.Cover ?? CoverKind.None;
            if (def.Wall != null)
            {
                walkable = false;
                var h = def.WallHeight ?? 2.6;
                var seeThrough = def.Wall == "fence";
                opaque = h >= 1.2 && !seeThrough;
                cover = def.Cover ?? (h >= 1.2 && !seeThrough ? CoverKind.Full : CoverKind.Half);
            }
            if (def.Prop != null)
            {
                var c = PropBlocks.TryGetValue(def.Prop, out var pc) ? pc : CoverKind.None;
                if (PropSolid.Contains(def.Prop)) walkable = false;
                if (c == CoverKind.Full) opaque = true;
                cover = def.Cover ?? CoverKind.Max(cover, c);
            }
            if (def.Blocks.HasValue) walkable = !def.Blocks.Value;
            return new GridTile { X = x, Y = y, Def = def, Walkable = walkable, Opaque = opaque, Cover = cover };
        }

        public int Index(int x, int y) => y * Width + x;

        public bool InBounds(int x, int y) => x >= 0 && y >= 0 && x < Width && y < Height;

        public GridTile Get(int x, int y) => InBounds(x, y) ? Tiles[Index(x, y)] : null;

        public bool Passable(int x, int y, string ignore = null)
        {
            var t = Get(x, y);
            if (t == null || !t.Walkable) return false;
            return !Occupied.TryGetValue(Index(x, y), out var occ) || occ == ignore;
        }

        /// <summary>
        /// A* over 8-connected tiles. Diagonal moves may not cut wall corners. Returns the path excluding the start,
        /// or null. Diagonals cost 1 AP like orthogonal moves (classic iso convention) but are slightly penalised in
        /// pathing so paths look natural.
        /// </summary>
        public List<Cell> FindPath(int sx, int sy, int tx, int ty, PathOpts opts = null)
        {
            opts ??= new PathOpts();
            if (!InBounds(tx, ty)) return null;
            var goalPassable = Passable(tx, ty, opts.Ignore);
            if (!goalPassable && !opts.AdjacentOk) return null;
            var w = Width;
            var start = Index(sx, sy);
            var g = new Dictionary<int, double> { [start] = 0 };
            var came = new Dictionary<int, int>();
            var open = new MinHeap();
            double H(int x, int y)
            {
                int dx = Math.Abs(x - tx), dy = Math.Abs(y - ty);
                return Math.Max(dx, dy) + 0.41 * Math.Min(dx, dy);
            }
            open.Push(start, H(sx, sy));
            var closed = new HashSet<int>();
            var budget = opts.Budget ?? long.MaxValue;
            while (open.Count > 0)
            {
                if (--budget < 0) return null;
                var cur = open.Pop();
                int cx = cur % w, cy = cur / w;
                var atGoal = opts.AdjacentOk && !goalPassable
                    ? Math.Max(Math.Abs(cx - tx), Math.Abs(cy - ty)) <= 1
                    : cx == tx && cy == ty;
                if (atGoal)
                {
                    var path = new List<Cell>();
                    var n = cur;
                    while (n != start) { path.Add(new Cell(n % w, n / w)); n = came[n]; }
                    path.Reverse();
                    return path;
                }
                if (!closed.Add(cur)) continue;
                var gc = g[cur];
                for (var dy = -1; dy <= 1; dy++)
                    for (var dx = -1; dx <= 1; dx++)
                    {
                        if (dx == 0 && dy == 0) continue;
                        int nx = cx + dx, ny = cy + dy;
                        if (!Passable(nx, ny, opts.Ignore)) continue;
                        if (dx != 0 && dy != 0 && (!Passable(cx + dx, cy, opts.Ignore) || !Passable(cx, cy + dy, opts.Ignore))) continue;
                        var ng = gc + (dx != 0 && dy != 0 ? 1.001 : 1);
                        if (opts.MaxCost.HasValue && ng > opts.MaxCost.Value + 0.01) continue;
                        var ni = Index(nx, ny);
                        if (ng < (g.TryGetValue(ni, out var old) ? old : double.PositiveInfinity))
                        {
                            g[ni] = ng;
                            came[ni] = cur;
                            open.Push(ni, ng + H(nx, ny));
                        }
                    }
            }
            return null;
        }

        /// <summary>Bresenham line of sight between tile centres; endpoints excluded.</summary>
        public bool LineOfSight(int ax, int ay, int bx, int by)
        {
            int x = ax, y = ay;
            int dx = Math.Abs(bx - ax), dy = -Math.Abs(by - ay);
            int sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
            var err = dx + dy;
            for (;;)
            {
                if (x == bx && y == by) return true;
                if (!(x == ax && y == ay) && (Get(x, y)?.Opaque ?? false)) return false;
                var e2 = 2 * err;
                if (e2 >= dy) { err += dy; x += sx; }
                if (e2 <= dx) { err += dx; y += sy; }
            }
        }

        /// <summary>Binary min-heap of tile indices by priority.</summary>
        private sealed class MinHeap
        {
            private readonly List<int> _items = new();
            private readonly List<double> _prio = new();
            public int Count => _items.Count;

            public void Push(int item, double p)
            {
                _items.Add(item); _prio.Add(p);
                var i = _items.Count - 1;
                while (i > 0)
                {
                    var parent = (i - 1) >> 1;
                    if (_prio[parent] <= _prio[i]) break;
                    Swap(i, parent); i = parent;
                }
            }

            public int Pop()
            {
                var top = _items[0];
                var last = _items.Count - 1;
                int lastI = _items[last]; double lastP = _prio[last];
                _items.RemoveAt(last); _prio.RemoveAt(last);
                if (_items.Count > 0)
                {
                    _items[0] = lastI; _prio[0] = lastP;
                    var i = 0;
                    for (;;)
                    {
                        int l = 2 * i + 1, r = l + 1, m = i;
                        if (l < _items.Count && _prio[l] < _prio[m]) m = l;
                        if (r < _items.Count && _prio[r] < _prio[m]) m = r;
                        if (m == i) break;
                        Swap(i, m); i = m;
                    }
                }
                return top;
            }

            private void Swap(int a, int b)
            {
                (_items[a], _items[b]) = (_items[b], _items[a]);
                (_prio[a], _prio[b]) = (_prio[b], _prio[a]);
            }
        }
    }
}
