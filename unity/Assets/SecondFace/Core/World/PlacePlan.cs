using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Scene;

namespace SecondFace.Core.World
{
    /// <summary>
    /// A place's layout in world terms (BUILD_PLAN §6.A.5, step 20): an authored map's rows of legend characters read as
    /// building walls with their doorways and windows, the rooms they close (roof and floor), fences and their gates, the
    /// ground's surface outside, and the props, lights and markers, in metres about the place's centre (x east, z north;
    /// a tile is <see cref="Tile"/> m; a quarter turn of a prop is −90° of yaw). Pure: the editor's PlaceBuilder makes the
    /// place's prefab from it and tests check it. The map's rock rim (the web map's edge) is dropped: the place stands
    /// open in the world.
    /// </summary>
    public sealed class PlacePlan
    {
        public const float Tile = 2f;
        /// <summary>The least a building's wall stands: a storey with a 2.1 m door and its lintel under the roof (the web
        /// maps' 2.4–2.8 m walls were drawn for a tile view).</summary>
        public const float Storey = 3.1f;
        /// <summary>Walls lower than this are fences: they close no room and block neither sight nor flood.</summary>
        public const float FenceHeight = 1.3f;
        /// <summary>Door and gate openings, metres (a gate of n tiles is n × 2 − 1.2 m wide, a three-tile gate 0.6 m taller).
        /// A door is 1.3 m (P6.2, from 1.1): the town's people walk in and out of every building, and the NavMesh is eroded
        /// by a person's radius from each jamb.</summary>
        public const float DoorWidth = 1.3f, DoorHeight = 2.1f, GateHeight = 2.6f;
        /// <summary>The width the kit's door leaf was made for (it is stretched to the doorway).</summary>
        public const float KitDoorWidth = 1.1f;

        public enum OpeningKind { Door, Gate, Window }

        public sealed class Opening
        {
            public OpeningKind Kind;
            /// <summary>The opening's centre, metres along its wall from A.</summary>
            public float At;
            public float Width, Sill, Top;
        }

        /// <summary>A straight wall on its centreline from A to B (the centres of its end tiles).</summary>
        public sealed class Wall
        {
            public string Kind;
            public float Height;
            public float Ax, Az, Bx, Bz;
            /// <summary>The room it closes (−1: free-standing, or between rooms).</summary>
            public int Room = -1;
            /// <summary>Unit vector to the outside, (0, 0) for a partition or a free-standing wall.</summary>
            public float OutX, OutZ;
            public readonly List<Opening> Openings = new();
            public float Length => (float)Math.Sqrt((Bx - Ax) * (Bx - Ax) + (Bz - Az) * (Bz - Az));
            public bool Exterior => OutX != 0 || OutZ != 0;
        }

        /// <summary>A closed region of floor: a building's inside, under one roof.</summary>
        public sealed class Room
        {
            public int Index;
            public string Wall, Floor, Roof;
            public float Height;
            /// <summary>The rectangle on its walls' centrelines.</summary>
            public float X0, Z0, X1, Z1;
            public int Tiles;
            public bool Rectangular;
            public float Width => X1 - X0;
            public float Depth => Z1 - Z0;
        }

        /// <summary>A fence on its centreline, with its gates (as openings), run on into a building's wall it meets; inside
        /// a room it is a cage's bars.</summary>
        public sealed class Fence
        {
            public string Kind;
            public float Height;
            public float Ax, Az, Bx, Bz;
            public int Room = -1;
            public readonly List<Opening> Gates = new();
            public float Length => (float)Math.Sqrt((Bx - Ax) * (Bx - Ax) + (Bz - Az) * (Bz - Az));
        }

        /// <summary>A solid block of wall: rock (always), or a building wall two tiles or more thick (a bunker's front, a
        /// shelter's walls between rooms), as a rectangle on its tiles' outer edges.</summary>
        public sealed class Mass
        {
            public string Kind;
            public float Height;
            public float X0, Z0, X1, Z1;
        }

        public sealed class Item
        {
            public string Kind, Id;
            public float X, Z, Yaw, Scale = 1f;
            public int Room = -1;
        }

        public sealed class Lamp
        {
            public float X, Z, Height, Intensity, Range, Flicker;
            public int Color;
            public int Room = -1;
        }

        /// <summary>A named point or area the game uses: spawn, exit, trigger, spot, talk, container, npc.</summary>
        public sealed class Marker
        {
            public string Kind, Id, Ref;
            public float X, Z, W, D, Yaw;
        }

        public string Id;
        public int Columns, Rows;
        public float Width => Columns * Tile;
        public float Depth => Rows * Tile;
        public readonly List<Wall> Walls = new();
        public readonly List<Room> Rooms = new();
        public readonly List<Fence> Fences = new();
        public readonly List<Mass> Masses = new();
        public readonly List<Item> Items = new();
        public readonly List<Lamp> Lamps = new();
        public readonly List<Marker> Markers = new();
        /// <summary>The ground's surface per tile, row-major from the north-west (Columns × Rows): the legend's floor outside
        /// the rooms and on their thresholds ("sand", "dirt", "rubble", "concrete", …), null under a room or a wall.</summary>
        public string[] Ground;
        /// <summary>The room per tile (−1 outside), row-major from the north-west.</summary>
        public int[] RoomAt;

        /// <summary>A tile's centre in place metres.</summary>
        public (float X, float Z) Centre(double i, double j) => ((float)((i + 0.5) * Tile - Width / 2), (float)(Depth / 2 - (j + 0.5) * Tile));

        /// <summary>A map tile's centre in its place's own metres (what <see cref="Centre"/> gives, without building the
        /// plan): for a routine's tile, a script's point.</summary>
        public static (float X, float Z) TileCentre(MapDef map, double i, double j)
        {
            var rows = map.Layout.Count;
            var cols = map.Layout.Max(r => r.Length);
            return ((float)((i + 0.5) * Tile - cols * Tile / 2), (float)(rows * Tile / 2 - (j + 0.5) * Tile));
        }

        public int RoomOf(double i, double j)
        {
            int ii = (int)Math.Floor(i), jj = (int)Math.Floor(j);
            return ii < 0 || jj < 0 || ii >= Columns || jj >= Rows ? -1 : RoomAt[jj * Columns + ii];
        }

        // --- reading a map ---------------------------------------------------------------------------------------------

        private enum Cell { Open, High, Low }

        private sealed class Grid
        {
            public int N, M;
            public TileDef[] Defs;
            public Cell[] Cells;
            public string[] Kinds;
            public float[] Heights;
            /// <summary>Doorways and gates in building walls (closed to the flood that finds rooms).</summary>
            public bool[] Threshold;
            /// <summary>Wall tiles drawn as solid masses, not wall runs (rock; walls two tiles thick).</summary>
            public bool[] Solid;
            public bool In(int i, int j) => i >= 0 && j >= 0 && i < N && j < M;
            public Cell At(int i, int j) => In(i, j) ? Cells[j * N + i] : Cell.Open;
            public string Kind(int i, int j) => In(i, j) ? Kinds[j * N + i] : null;
        }

        /// <summary>Reads a map. <paramref name="seed"/> picks the windows (the map's own seed when 0).</summary>
        public static PlacePlan Build(MapDef map, int seed = 0)
        {
            if (map?.Layout == null || map.Layout.Count == 0) throw new ArgumentException("a map with a layout");
            var plan = new PlacePlan { Id = map.Id, Rows = map.Layout.Count, Columns = map.Layout.Max(r => r.Length) };
            if (seed == 0) seed = (int)(map.Seed ?? 1909);
            var g = Read(map, plan.Columns, plan.Rows);
            var doorways = Doorways(g, Cell.High);
            var gates = Doorways(g, Cell.Low);
            FindRooms(plan, g, doorways);
            FindMasses(plan, g);
            Runs(plan, g, Cell.High, doorways);
            Runs(plan, g, Cell.Low, gates);
            Windows(plan, seed);
            GroundOf(plan, g);
            Things(plan, map);
            return plan;
        }

        private static Grid Read(MapDef map, int n, int m)
        {
            var g = new Grid { N = n, M = m, Defs = new TileDef[n * m], Cells = new Cell[n * m], Kinds = new string[n * m], Heights = new float[n * m] };
            for (var j = 0; j < m; j++)
            {
                var row = map.Layout[j];
                for (var i = 0; i < n; i++)
                {
                    var ch = i < row.Length ? row[i].ToString() : " ";
                    TileDef d = null;
                    map.Legend?.TryGetValue(ch, out d);
                    g.Defs[j * n + i] = d;
                    if (d?.Wall == null) continue;
                    // the rock rim is the web map's edge, not a wall
                    if (d.Wall == "rock" && (i == 0 || j == 0 || i == n - 1 || j == m - 1)) continue;
                    var h = (float)(d.WallHeight ?? 2.6);
                    g.Kinds[j * n + i] = d.Wall;
                    g.Cells[j * n + i] = h < FenceHeight ? Cell.Low : Cell.High;
                    g.Heights[j * n + i] = h < FenceHeight ? h : Math.Max(h, Storey);
                }
            }
            // an exit to another place goes through the wall beside it (a shelter's vault door is drawn as wall): the
            // wall tiles before and behind an exit across its narrow side open
            foreach (var e in map.Exits ?? new List<ExitDef>())
            {
                if (e.To?.Location == null || e.To.WorldMap == true) continue;
                int w = e.W ?? 1, h = e.H ?? 1;
                var across = w >= h;
                for (var k = 0; k < (across ? w : h); k++)
                    foreach (var side in new[] { -1, across ? h : w })
                    {
                        int i = across ? e.X + k : e.X + side, j = across ? e.Y + side : e.Y + k;
                        if (g.In(i, j) && g.Cells[j * n + i] == Cell.High) g.Cells[j * n + i] = Cell.Open;
                    }
            }
            return g;
        }

        /// <summary>The openings in walls of a class: a gap of one tile (a door) or two or three (a gate) in a straight line of
        /// wall, each side of it either continuing the line or ending it (two parallel walls a tile apart are a passage,
        /// not a doorway). Value: (width in tiles, the wall kind either side, horizontal).</summary>
        private static Dictionary<int, (int Tiles, string Kind, bool Horizontal)> Doorways(Grid g, Cell cls)
        {
            var found = new Dictionary<int, (int, string, bool)>();
            bool W(int i, int j) => g.At(i, j) == cls;
            // a wall tile that is not the middle of a run across the gap's line
            bool EndsAcross(int i, int j, bool horizontal) => horizontal ? !(W(i, j - 1) && W(i, j + 1)) : !(W(i - 1, j) && W(i + 1, j));
            for (var j = 0; j < g.M; j++)
                for (var i = 0; i < g.N; i++)
                {
                    if (g.At(i, j) != Cell.Open) continue;
                    foreach (var horizontal in new[] { true, false })
                    {
                        int di = horizontal ? 1 : 0, dj = horizontal ? 0 : 1;
                        // no wall across the gap itself
                        if (W(i - dj, j - di) || W(i + dj, j + di)) continue;
                        for (var width = 1; width <= 3; width++)
                        {
                            int ai = i - di, aj = j - dj, bi = i + di * width, bj = j + dj * width;
                            var open = true;
                            for (var k = 1; k < width && open; k++)
                            {
                                int ki = i + di * k, kj = j + dj * k;
                                open = g.At(ki, kj) == Cell.Open && !W(ki - dj, kj - di) && !W(ki + dj, kj + di);
                            }
                            if (!open) continue;
                            if (!W(ai, aj) || !W(bi, bj) || g.Kind(ai, aj) != g.Kind(bi, bj)) continue;
                            var aOk = W(ai - di, aj - dj) || EndsAcross(ai, aj, horizontal);
                            var bOk = W(bi + di, bj + dj) || EndsAcross(bi, bj, horizontal);
                            if (!aOk || !bOk) continue;
                            for (var k = 0; k < width; k++) found[(j + dj * k) * g.N + i + di * k] = (width, g.Kind(ai, aj), horizontal);
                            break;
                        }
                    }
                }
            return found;
        }

        /// <summary>The rooms: open tiles that a flood from the edge cannot reach past building walls and their doorways.
        /// A gap with no room on either side, or as wide as the "room" behind it on two opposite sides (an alley: houses in
        /// a row line their walls up across the passage), is no doorway: it is opened and the rooms found again.</summary>
        private static void FindRooms(PlacePlan plan, Grid g, Dictionary<int, (int Tiles, string Kind, bool Horizontal)> doorways)
        {
            int n = g.N, m = g.M;
            for (var pass = 0; ; pass++)
            {
                g.Threshold = new bool[n * m];
                foreach (var k in doorways.Keys) g.Threshold[k] = true;
                var (region, boxes) = Flood(g);
                // per region, the doorways as wide as its side, by the side they are on (0 north, 1 south, 2 west, 3 east)
                var full = new Dictionary<int, List<(int Side, int Key)>>();
                foreach (var (k, d) in doorways)
                {
                    int i = k % n, j = k / n;
                    var sides = d.Horizontal ? new[] { (i, j + 1, 0), (i, j - 1, 1) } : new[] { (i + 1, j, 2), (i - 1, j, 3) };
                    foreach (var (ni, nj, side) in sides)
                    {
                        if (!g.In(ni, nj)) continue;
                        var r = region[nj * n + ni];
                        if (r < 0) continue;
                        var (i0, i1, j0, j1) = boxes[r];
                        if ((d.Horizontal ? i1 - i0 + 1 : j1 - j0 + 1) > d.Tiles) continue;
                        if (!full.TryGetValue(r, out var list)) full[r] = list = new List<(int, int)>();
                        list.Add((side, k));
                    }
                }
                // an alley: such gaps on two opposite sides (a passage between buildings whose walls line up); and a gap
                // with no room either side (between two buildings in a row)
                var false_ = new List<int>();
                foreach (var (k, d) in doorways)
                {
                    int i = k % n, j = k / n;
                    var across = d.Horizontal ? new[] { (i, j - 1), (i, j + 1) } : new[] { (i - 1, j), (i + 1, j) };
                    if (!across.Any(t => g.In(t.Item1, t.Item2) && region[t.Item2 * n + t.Item1] >= 0)) false_.Add(k);
                }
                foreach (var (r, list) in full)
                {
                    var on = list.Select(e => e.Side).ToHashSet();
                    if ((on.Contains(0) && on.Contains(1)) || (on.Contains(2) && on.Contains(3))) false_.AddRange(list.Select(e => e.Key));
                }
                if (false_.Count == 0 || pass == 3) { MakeRooms(plan, g, region, boxes); return; }
                foreach (var k in false_) doorways.Remove(k);
            }
        }

        /// <summary>Floods from the edge: per tile −1 outside (or a wall or threshold), else its room; and each room's box
        /// in tiles (i0, i1, j0, j1).</summary>
        private static (int[] Region, List<(int I0, int I1, int J0, int J1)> Boxes) Flood(Grid g)
        {
            int n = g.N, m = g.M;
            var region = Enumerable.Repeat(-2, n * m).ToArray();   // −2 unvisited, −1 outside, ≥ 0 room
            var boxes = new List<(int, int, int, int)>();
            bool Blocks(int k) => g.Cells[k] == Cell.High || g.Threshold[k];
            void Fill(int start, int id)
            {
                var stack = new Stack<int>(); stack.Push(start); region[start] = id;
                int i0 = int.MaxValue, i1 = -1, j0 = int.MaxValue, j1 = -1;
                while (stack.Count > 0)
                {
                    var k = stack.Pop();
                    int i = k % n, j = k / n;
                    i0 = Math.Min(i0, i); i1 = Math.Max(i1, i); j0 = Math.Min(j0, j); j1 = Math.Max(j1, j);
                    foreach (var (di, dj) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                    {
                        int ni = i + di, nj = j + dj;
                        if (ni < 0 || nj < 0 || ni >= n || nj >= m) continue;
                        var nk = nj * n + ni;
                        if (region[nk] != -2 || Blocks(nk)) continue;
                        region[nk] = id; stack.Push(nk);
                    }
                }
                if (id >= 0) boxes.Add((i0, i1, j0, j1));
            }
            for (var k = 0; k < n * m; k++)
            {
                int i = k % n, j = k / n;
                if ((i == 0 || j == 0 || i == n - 1 || j == m - 1) && region[k] == -2 && !Blocks(k)) Fill(k, -1);
            }
            for (var k = 0; k < n * m; k++)
                if (region[k] == -2 && !Blocks(k)) Fill(k, boxes.Count);
            for (var k = 0; k < n * m; k++) if (region[k] == -2) region[k] = -1;
            return (region, boxes);
        }

        /// <summary>The rooms from the flood: their walls' kind and height, a roof named on them, the commonest floor,
        /// the rectangle on the walls' centrelines (rectangular when nothing but the room and its partitions lies in it).</summary>
        private static void MakeRooms(PlacePlan plan, Grid g, int[] region, List<(int I0, int I1, int J0, int J1)> boxes)
        {
            int n = g.N;
            for (var id = 0; id < boxes.Count; id++)
            {
                var (i0, i1, j0, j1) = boxes[id];
                var kinds = new Dictionary<string, int>(); float height = 0; string roof = null;
                var floors = new Dictionary<string, int>();
                int tiles = 0; var rectangular = true;
                for (var j = j0; j <= j1; j++)
                    for (var i = i0; i <= i1; i++)
                    {
                        var k = j * n + i;
                        if (region[k] != id) { if (g.Cells[k] != Cell.High) rectangular = false; continue; }
                        tiles++;
                        var f = g.Defs[k]?.Floor;
                        if (f != null) floors[f] = floors.TryGetValue(f, out var fc) ? fc + 1 : 1;
                        foreach (var (di, dj) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                        {
                            int ni = i + di, nj = j + dj;
                            if (g.At(ni, nj) != Cell.High) continue;
                            var nk = nj * n + ni;
                            kinds[g.Kinds[nk]] = kinds.TryGetValue(g.Kinds[nk], out var c) ? c + 1 : 1;
                            height = Math.Max(height, g.Heights[nk]);
                            roof ??= g.Defs[nk]?.Roof;
                        }
                    }
                var (x0, z1) = plan.Centre(i0 - 1, j0 - 1);
                var (x1, z0) = plan.Centre(i1 + 1, j1 + 1);
                var wall = kinds.Count > 0 ? kinds.OrderByDescending(kv => kv.Value).First().Key : "adobe";
                plan.Rooms.Add(new Room
                {
                    Index = id, Wall = wall, Floor = floors.Count > 0 ? floors.OrderByDescending(kv => kv.Value).First().Key : "dirt",
                    Roof = roof ?? DefaultRoof(wall), Height = height > 0 ? height : Storey,
                    X0 = x0, X1 = x1, Z0 = z0, Z1 = z1, Tiles = tiles, Rectangular = rectangular,
                });
            }
            plan.RoomAt = region.Select(r => r >= 0 ? r : -1).ToArray();
        }

        /// <summary>Solid masses: every rock tile, and building-wall tiles in a 2 × 2 block of building wall (a wall two
        /// tiles thick would otherwise be drawn as a lattice of thin walls); merged greedily into rectangles by kind.</summary>
        private static void FindMasses(PlacePlan plan, Grid g)
        {
            int n = g.N, m = g.M;
            g.Solid = new bool[n * m];
            bool High(int i, int j) => g.At(i, j) == Cell.High;
            for (var j = 0; j < m; j++)
                for (var i = 0; i < n; i++)
                {
                    if (!High(i, j)) continue;
                    if (g.Kind(i, j) == "rock") { g.Solid[j * n + i] = true; continue; }
                    foreach (var (di, dj) in new[] { (0, 0), (-1, 0), (0, -1), (-1, -1) })
                        if (High(i + di, j + dj) && High(i + di + 1, j + dj) && High(i + di, j + dj + 1) && High(i + di + 1, j + dj + 1)) { g.Solid[j * n + i] = true; break; }
                }
            var done = new bool[n * m];
            for (var j = 0; j < m; j++)
                for (var i = 0; i < n; i++)
                {
                    var k = j * n + i;
                    if (!g.Solid[k] || done[k]) continue;
                    var kind = g.Kinds[k];
                    var i1 = i;
                    while (i1 + 1 < n && g.Solid[j * n + i1 + 1] && !done[j * n + i1 + 1] && g.Kinds[j * n + i1 + 1] == kind) i1++;
                    var j1 = j;
                    while (j1 + 1 < m)
                    {
                        var row = true;
                        for (var x = i; x <= i1 && row; x++) row = g.Solid[(j1 + 1) * n + x] && !done[(j1 + 1) * n + x] && g.Kinds[(j1 + 1) * n + x] == kind;
                        if (!row) break;
                        j1++;
                    }
                    float height = 0;
                    for (var y = j; y <= j1; y++)
                        for (var x = i; x <= i1; x++) { done[y * n + x] = true; height = Math.Max(height, g.Heights[y * n + x]); }
                    var (x0, z1) = plan.Centre(i - 0.5, j - 0.5);
                    var (x1, z0) = plan.Centre(i1 + 0.5, j1 + 0.5);
                    plan.Masses.Add(new Mass { Kind = kind, Height = height, X0 = x0, X1 = x1, Z0 = z0, Z1 = z1 });
                }
        }

        private static string DefaultRoof(string wall) => wall switch
        {
            "adobe" or "brick" or "concrete" => "flat",
            _ => "tin",
        };

        /// <summary>Straight runs of a wall class: horizontal ones along the rows, vertical ones down the columns, a
        /// doorway in the line joining its two sides as an opening; a lone tile is a pillar.</summary>
        private static void Runs(PlacePlan plan, Grid g, Cell cls, Dictionary<int, (int Tiles, string Kind, bool Horizontal)> openings)
        {
            int n = g.N, m = g.M;
            var used = new HashSet<int>();
            bool Part(int i, int j, bool horizontal, string kind) =>
                g.In(i, j) && ((g.At(i, j) == cls && g.Kind(i, j) == kind && !g.Solid[j * n + i]) || (openings.TryGetValue(j * n + i, out var o) && o.Horizontal == horizontal && o.Kind == kind));
            foreach (var horizontal in new[] { true, false })
            {
                int outer = horizontal ? m : n, inner = horizontal ? n : m;
                for (var a = 0; a < outer; a++)
                {
                    var b = 0;
                    while (b < inner)
                    {
                        int i = horizontal ? b : a, j = horizontal ? a : b;
                        if (g.At(i, j) != cls || g.Solid[j * n + i]) { b++; continue; }
                        var kind = g.Kind(i, j);
                        var end = b;
                        while (end + 1 < inner && Part(horizontal ? end + 1 : a, horizontal ? a : end + 1, horizontal, kind)) end++;
                        // a run cannot end on an opening
                        while (end > b && (g.At(horizontal ? end : a, horizontal ? a : end) != cls || g.Solid[(horizontal ? a : end) * n + (horizontal ? end : a)])) end--;
                        if (end > b) Emit(plan, g, cls, openings, horizontal, a, b, end, kind, used);
                        b = end + 1;
                    }
                }
            }
            // pillars: wall tiles in no run
            for (var k = 0; k < n * m; k++)
                if (g.Cells[k] == cls && !g.Solid[k] && !used.Contains(k)) Emit(plan, g, cls, openings, true, k / n, k % n, k % n, g.Kinds[k], used);
        }

        /// <summary>A run of wall tiles from <paramref name="from"/> to <paramref name="to"/> on a row (or column) as walls:
        /// split where what lies either side changes (a house's wall that is a neighbour's for part of its length is
        /// outer wall there and a partition here), each stretch with the openings that fall in it.</summary>
        private static void Emit(PlacePlan plan, Grid g, Cell cls, Dictionary<int, (int Tiles, string Kind, bool Horizontal)> openings, bool horizontal, int line, int from, int to, string kind, HashSet<int> used)
        {
            int n = g.N, len = to - from + 1;
            (int i, int j) T(int s) => horizontal ? (s, line) : (line, s);
            // what lies either side of each tile: a room, −1 outside, null a wall or threshold (taken from its neighbours)
            int? Side(int i, int j) => !g.In(i, j) ? -1 : g.At(i, j) != Cell.Open || g.Threshold[j * n + i] ? null : plan.RoomOf(i, j);
            var sa = new int?[len]; var sb = new int?[len];
            float height = 0;
            for (var s = from; s <= to; s++)
            {
                var (i, j) = T(s);
                // A: north (the row above) of a horizontal run, west of a vertical one
                sa[s - from] = horizontal ? Side(i, j - 1) : Side(i - 1, j);
                sb[s - from] = horizontal ? Side(i, j + 1) : Side(i + 1, j);
                var k = j * n + i;
                if (g.Cells[k] == cls) { used.Add(k); height = Math.Max(height, g.Heights[k]); }
            }
            Fill(sa); Fill(sb);
            var start = 0;
            for (var e = 1; e <= len; e++)
            {
                if (e < len && sa[e] == sa[start] && sb[e] == sb[start]) continue;
                Stretch(start, e - 1, sa[start] ?? -1, sb[start] ?? -1);
                start = e;
            }

            void Stretch(int p0, int p1, int roomA, int roomB)
            {
                // a stretch ends on its end tiles' centres where the run ends, and half a tile on where it goes on
                var (ax, az) = plan.Centre(T(from + p0).i, T(from + p0).j);
                var (bx, bz) = plan.Centre(T(from + p1).i, T(from + p1).j);
                float dx = horizontal ? Tile / 2 : 0, dz = horizontal ? 0 : -Tile / 2;
                if (p0 > 0) { ax -= dx; az -= dz; }
                if (p1 < len - 1) { bx += dx; bz += dz; }
                var startOffset = p0 * Tile - (p0 > 0 ? Tile / 2 : 0);
                var gaps = new List<Opening>();
                for (var s = from + p0; s <= from + p1; s++)
                {
                    var (i, j) = T(s);
                    var k = j * n + i;
                    if (g.Cells[k] == cls || !openings.TryGetValue(k, out var o)) continue;
                    // a gate spans two tiles: placed from its first
                    var (pi, pj) = T(s - 1);
                    if (s > from && openings.ContainsKey(pj * n + pi)) continue;
                    var at = (s - from + (o.Tiles - 1) / 2f) * Tile - startOffset;
                    gaps.Add(o.Tiles == 1
                        ? new Opening { Kind = OpeningKind.Door, At = at, Width = DoorWidth, Top = DoorHeight }
                        : new Opening { Kind = OpeningKind.Gate, At = at, Width = o.Tiles * Tile - 1.2f, Top = GateHeight + (o.Tiles - 2) * 0.6f });
                }
                if (cls == Cell.Low)
                {
                    // a fence that meets a building's wall runs into it (to the wall's centreline)
                    float ux = horizontal ? 1 : 0, uz = horizontal ? 0 : -1;
                    var (ei, ej) = T(from - 1);
                    if (p0 == 0 && g.At(ei, ej) == Cell.High) { ax -= ux * Tile; az -= uz * Tile; foreach (var o in gaps) o.At += Tile; }
                    (ei, ej) = T(to + 1);
                    if (p1 == len - 1 && g.At(ei, ej) == Cell.High) { bx += ux * Tile; bz += uz * Tile; }
                    var f = new Fence { Kind = kind, Height = height, Ax = ax, Az = az, Bx = bx, Bz = bz, Room = roomA >= 0 && roomA == roomB ? roomA : -1 };
                    f.Gates.AddRange(gaps);
                    plan.Fences.Add(f);
                    return;
                }
                var w = new Wall { Kind = kind, Height = height, Ax = ax, Az = az, Bx = bx, Bz = bz };
                w.Openings.AddRange(gaps);
                // the outside: north (+z) or west (−x) on the A side
                if (roomA < 0 && roomB >= 0) { w.Room = roomB; (w.OutX, w.OutZ) = horizontal ? (0f, 1f) : (-1f, 0f); }
                else if (roomB < 0 && roomA >= 0) { w.Room = roomA; (w.OutX, w.OutZ) = horizontal ? (0f, -1f) : (1f, 0f); }
                else if (roomA >= 0) w.Room = Math.Min(roomA, roomB);
                plan.Walls.Add(w);
            }
        }

        /// <summary>Unknown sides (a wall or a threshold beside the run) take the nearest known value, before them first.</summary>
        private static void Fill(int?[] side)
        {
            int? last = null;
            for (var k = 0; k < side.Length; k++) { if (side[k] != null) last = side[k]; else side[k] = last; }
            last = null;
            for (var k = side.Length - 1; k >= 0; k--) { if (side[k] != null) last = side[k]; else if (last != null) side[k] = last; }
        }

        /// <summary>Windows on the outer walls of rooms: a place every 3 m along the wall, kept clear of its ends (corners)
        /// and of its doors, filled by a hash of the seed with a chance and a size by the wall's kind.</summary>
        private static void Windows(PlacePlan plan, int seed)
        {
            for (var w = 0; w < plan.Walls.Count; w++)
            {
                var wall = plan.Walls[w];
                if (!wall.Exterior || wall.Room < 0) continue;
                var (chance, width, sill, top) = WindowOf(wall.Kind);
                if (chance <= 0) continue;
                var length = wall.Length;
                for (var at = 1.5f; at <= length - 1.4f; at += 3f)
                {
                    if (wall.Openings.Any(o => Math.Abs(o.At - at) < o.Width / 2 + width / 2 + 0.6f)) continue;
                    if (Hash(seed, w, (int)(at * 10)) >= chance) continue;
                    wall.Openings.Add(new Opening { Kind = OpeningKind.Window, At = at, Width = width, Sill = sill, Top = top });
                }
                wall.Openings.Sort((a, b) => a.At.CompareTo(b.At));
            }
        }

        private static (float Chance, float Width, float Sill, float Top) WindowOf(string kind) => kind switch
        {
            "adobe" => (0.55f, 0.8f, 1.1f, 1.9f),
            "brick" => (0.7f, 1.0f, 0.9f, 2.0f),
            "wood" => (0.6f, 0.9f, 1.0f, 1.9f),
            "concrete" => (0.6f, 1.2f, 1.0f, 2.0f),
            "scrap" => (0.3f, 0.7f, 1.2f, 1.8f),
            "metal" => (0.2f, 0.6f, 1.3f, 1.8f),
            _ => (0f, 0f, 0f, 0f),
        };

        private static void GroundOf(PlacePlan plan, Grid g)
        {
            var n = g.N;
            plan.Ground = new string[n * g.M];
            for (var k = 0; k < n * g.M; k++)
            {
                if (g.Cells[k] == Cell.High || plan.RoomAt[k] >= 0) continue;
                var d = g.Defs[k];
                plan.Ground[k] = d?.Empty == true ? null : d?.Floor ?? "sand";
            }
        }

        private static void Things(PlacePlan plan, MapDef map)
        {
            var byId = new Dictionary<string, Item>();
            void Add(string kind, string id, double x, double y, double? rot, bool rad, double? scale)
            {
                var (cx, cz) = plan.Centre(x, y);
                var yaw = rot == null ? 0f : rad ? (float)(-rot.Value * 180 / Math.PI) : (float)(-rot.Value * 90);
                var item = new Item { Kind = kind, Id = id, X = cx, Z = cz, Yaw = yaw, Scale = (float)(scale ?? 1), Room = plan.RoomOf(x, y) };
                plan.Items.Add(item);
                if (id != null) byId[id] = item;
                // a fire is somewhere to camp (P6.1): one without an id is named by where it stands
                if (Camp.IsFire(kind))
                    plan.Markers.Add(new Marker { Kind = "fire", Id = id ?? $"fire_{Num.RoundInt(x)}_{Num.RoundInt(y)}", X = cx, Z = cz, Yaw = yaw });
                // and a chair somewhere to sit (its front, where the sitter faces, is -z at its yaw)
                if (kind == "chair")
                    plan.Markers.Add(new Marker { Kind = "seat", Id = id ?? $"seat_{Num.RoundInt(x)}_{Num.RoundInt(y)}", X = cx, Z = cz, Yaw = yaw, Ref = kind });
            }
            foreach (var p in map.Props ?? new List<Scene.PropPlacement>()) Add(p.Kind, p.Id, p.X, p.Y, p.Rot, p.Rad == true, p.Scale);
            for (var j = 0; j < plan.Rows; j++)
            {
                var row = map.Layout[j];
                for (var i = 0; i < row.Length; i++)
                    if (map.Legend != null && map.Legend.TryGetValue(row[i].ToString(), out var d) && d?.Prop != null) Add(d.Prop, null, i, j, d.PropRot, false, null);
            }
            foreach (var l in map.Lights ?? new List<LightDef>())
            {
                var (x, z) = plan.Centre(l.X, l.Y);
                plan.Lamps.Add(new Lamp { X = x, Z = z, Height = (float)(l.Height ?? 2.4), Color = l.Color, Intensity = (float)l.Intensity, Range = (float)l.Range, Flicker = (float)(l.Flicker ?? 0), Room = plan.RoomOf(l.X, l.Y) });
            }
            void Point(string kind, string id, double x, double y, double? facing = null, string reference = null)
            {
                var (cx, cz) = plan.Centre(x, y);
                plan.Markers.Add(new Marker { Kind = kind, Id = id, Ref = reference, X = cx, Z = cz, Yaw = facing == null ? 0f : (float)(-facing.Value * 90) });
            }
            void Area(string kind, string id, int x, int y, int w, int h, string reference = null)
            {
                var (cx, cz) = plan.Centre(x + (w - 1) / 2.0, y + (h - 1) / 2.0);
                plan.Markers.Add(new Marker { Kind = kind, Id = id, Ref = reference, X = cx, Z = cz, W = w * Tile, D = h * Tile });
            }
            foreach (var s in map.Spawns ?? new List<SpawnDef>()) Point("spawn", s.Id, s.X, s.Y, s.Facing);
            foreach (var e in map.Exits ?? new List<ExitDef>()) Area("exit", e.Label, e.X, e.Y, e.W ?? 1, e.H ?? 1, e.To?.Location);
            foreach (var t in map.Triggers ?? new List<TriggerDef>()) Area("trigger", t.Id, t.X, t.Y, t.W ?? 1, t.H ?? 1);
            foreach (var (id, t) in map.Spots ?? new Dictionary<string, Npc.Tile>()) Point("spot", id, t.X, t.Y);
            foreach (var p in map.Npcs ?? new List<NpcPlacement>()) Point("npc", p.Id ?? p.Def, p.X, p.Y, p.Facing, p.Def);
            foreach (var id in (map.Talk?.Keys ?? Enumerable.Empty<string>()).Concat(map.Containers?.Keys ?? Enumerable.Empty<string>()))
                if (byId.TryGetValue(id, out var item))
                    plan.Markers.Add(new Marker { Kind = map.Talk != null && map.Talk.ContainsKey(id) ? "talk" : "container", Id = id, X = item.X, Z = item.Z, Yaw = item.Yaw });
        }

        private static float Hash(int seed, int a, int b)
        {
            unchecked
            {
                var h = (uint)seed * 374761393u + (uint)a * 668265263u + (uint)b * 2246822519u;
                h = (h ^ (h >> 13)) * 1274126177u;
                h ^= h >> 16;
                return (h & 0xffffff) / 16777216f;
            }
        }
    }
}
