using System;
using System.Collections.Generic;
using System.Linq;
using SecondFace.Core.Scene;

namespace SecondFace.Core.World
{
    /// <summary>
    /// The megacity kit (Meridian's districts; docs/DESIGN_UNITY.md §3 "the megacity", WORLD §3.1): a district's map read by
    /// <see cref="PlacePlan"/> is raised into a city block by block, as plain pieces the editor's PlaceBuilder merges into
    /// meshes. Pure and seeded by the map: the same map always gives the same city.
    ///
    /// What it makes: each room of the map becomes a building of <see cref="Style.StoreysMin"/>–<see cref="Style.StoreysMax"/>
    /// storeys (the ground storey is the map's room, the one the player walks into; the storeys above are facade: window
    /// bays with frames, sills and lit panes, shutters, balconies, AC units, laundry, blade signs, screens, neon strips,
    /// downpipes, a parapet), its roof dressed (AC plant, tanks, vents, antennas, dishes, solar, billboards, stacked
    /// shanties, gardens, a dome); thick walls of the map (two tiles and more) become megablocks or the city's Wall; the
    /// map's border walls become the backs of the buildings beyond; cables and strings of bulbs hang across the streets;
    /// lamp posts and signs of the map become city street lights and lightboxes; streets get kerbs, the walls vending
    /// machines, bins, crates and awnings; water and voids are cut into the ground as canals and drops with bridges; and
    /// beyond the district's edge the skyline's towers stand as backdrop (world-anchored, each owned by the nearest
    /// district, so neighbouring districts never build the same one).
    ///
    /// How it stays playable from the overhead camera: the streets the player walks keep their buildings at 2–5 storeys,
    /// a building opens when entered (the cutaway reaches <see cref="CutMargin"/> past its walls, so nothing on a facade
    /// stands out further: <see cref="MaxProject"/>), every piece is drawn with the city's see-through (anything between
    /// the camera and the player dissolves round them: the SecondFace/City shader and Game PlaceReveal), and the towers
    /// stand only beyond every place's footprint (<see cref="TowerMargin"/>). Nothing hangs over a way lower than
    /// <see cref="StreetClear"/>, cables no lower than <see cref="CableClear"/>, and no piece stands in a doorway.
    /// </summary>
    public static class CityKit
    {
        /// <summary>An upper storey, floor to floor (m); also the grid's storey on megablocks and towers.</summary>
        public const float Storey = 3.2f;
        public const float Parapet = 0.9f;
        /// <summary>Anything whose top stands higher than this inside a place is drawn with the see-through.</summary>
        public const float RevealAbove = 6f;
        /// <summary>The cutaway of an entered building reaches this far past its walls (SecondFace/City).</summary>
        public const float CutMargin = 1.3f;
        /// <summary>The most anything on a facade stands out from its wall (inside the cutaway's reach).</summary>
        public const float MaxProject = 1.2f;
        /// <summary>The least clear height under anything hung over a way (awnings, signs, balconies).</summary>
        public const float StreetClear = 2.3f;
        /// <summary>The lowest a cable sags over a street.</summary>
        public const float CableClear = 4.6f;
        /// <summary>The merge cell (m): one mesh per cell, so a phone's camera draws a few cells, not the district.</summary>
        public const float Cell = 48f;
        /// <summary>The skyline: towers on a world grid of this pitch, from this far beyond any place's footprint out to
        /// <see cref="Backdrop"/> beyond the district's edge.</summary>
        public const float TowerCell = 30f, TowerMargin = 14f, Backdrop = 170f;
        public const int TowerSectors = 8;
        /// <summary>Towers nearer the district's edge than this are its near ring (a group of their own, so the far ring
        /// culls away from the game camera, which sees about 40 m of ground).</summary>
        public const float NearRing = 50f;
        /// <summary>The draws a view may cost (BUILD_PLAN §6.K: ≤ 150 per frame on Mid, before the resident drawer).</summary>
        public const int DrawBudget = 150;
        /// <summary>The procedural window grid on megablocks and towers: a bay's width; its storey is <see cref="Storey"/>.</summary>
        public const float GridBay = 2.4f;
        /// <summary>How much ground a view takes for the draw estimate (m square): the game camera at its widest and
        /// lowest (26 m, 35°, a 28° lens on a 20:9 screen) sees about 46 m across and 39 m out.</summary>
        public const float View = 48f;

        public enum Pattern { None = -1, Tube = 0, Sign = 1, Screen = 2, Pane = 3, Grid = 4 }
        public enum Shape { Box, Quad, Prism }

        /// <summary>One piece of the city: a box (or a single face, or an upright prism) of a material, centred at X, Y, Z
        /// (place metres), SX along its own x, SY up, SZ along its own z, turned by <see cref="Pitch"/> about its own x and
        /// then <see cref="Yaw"/> about y (degrees, as Unity's Euler(pitch, yaw, 0)). A facade piece's own z is its wall's
        /// outside. <see cref="Tint"/> multiplies the material's colour (sRGB); <see cref="A"/> is the grime (0 clean, 0.5 as
        /// the material, 1 twice) on surfaces, the share lit at night on panes and grids. <see cref="Pattern"/> is for the
        /// light material: a tube, a sign's glyphs, a screen, a window pane, a window grid. A quad is its +z face only.</summary>
        public sealed class Piece
        {
            public string Key;
            public string TopKey;
            public float X, Y, Z, SX, SY, SZ, Yaw, Pitch;
            public Rgb Tint = White;
            public float A = 0.5f;
            public Pattern Pattern = Pattern.None;
            /// <summary>The pattern's own number: a grid's pane share; a pane's light falls from top to bottom.</summary>
            public float P = 0.7f;
            public Shape Shape;
            public int Sides = 8;
            public bool Bottom;
            /// <summary>The merge cell (≥ 0 in the place), or a backdrop sector (−1 − sector).</summary>
            public int Cell;
            /// <summary>The room whose building it belongs to (−1 none).</summary>
            public int Building = -1;
            /// <summary>Hung over a way (an awning, a sign, a balcony, a cable, laundry): it must clear the street.</summary>
            public bool Hung;
            /// <summary>The map's prop it stands for (a street light, a lightbox, a boat: the plan's item), −1 none.</summary>
            public int Item = -1;
            public float Y0 => Y - SY / 2;
            public float Y1 => Y + SY / 2;

            /// <summary>Its box in place metres, turned (min x, y, z; max x, y, z).</summary>
            public (float X0, float Y0, float Z0, float X1, float Y1, float Z1) Bounds()
            {
                float cp = (float)Math.Cos(Pitch * Math.PI / 180), sp = (float)Math.Sin(Pitch * Math.PI / 180);
                float cy = (float)Math.Cos(Yaw * Math.PI / 180), sy = (float)Math.Sin(Yaw * Math.PI / 180);
                float x0 = float.MaxValue, y0 = float.MaxValue, z0 = float.MaxValue, x1 = float.MinValue, y1 = float.MinValue, z1 = float.MinValue;
                for (var k = 0; k < 8; k++)
                {
                    float lx = ((k & 1) == 0 ? -0.5f : 0.5f) * SX, ly = ((k & 2) == 0 ? -0.5f : 0.5f) * SY, lz = ((k & 4) == 0 ? -0.5f : 0.5f) * SZ;
                    // pitch about x (Unity: +pitch takes +z down), then yaw about y (+yaw takes +z to +x)
                    float py = ly * cp - lz * sp, pz = ly * sp + lz * cp;
                    float wx = lx * cy + pz * sy, wz = -lx * sy + pz * cy;
                    x0 = Math.Min(x0, X + wx); x1 = Math.Max(x1, X + wx);
                    y0 = Math.Min(y0, Y + py); y1 = Math.Max(y1, Y + py);
                    z0 = Math.Min(z0, Z + wz); z1 = Math.Max(z1, Z + wz);
                }
                return (x0, y0, z0, x1, y1, z1);
            }
        }

        /// <summary>A street building over a room of the map.</summary>
        public sealed class Block
        {
            public int Room;
            public int Storeys;
            /// <summary>The ground storey's wall top over the street (the map's), and the building's wall top.</summary>
            public float Ground, Top;
            /// <summary>The highest thing on it (the parapet, what stands on its roof).</summary>
            public float Crest;
            /// <summary>parapet, shanties, garden, tanks, billboard, dome, open (a roofless court), shack.</summary>
            public string Roof;
            public string Body;
            public Rgb Tint;
            public bool Shack;
            public bool Reveal => Crest > RevealAbove;
        }

        /// <summary>A thick wall of the map raised: a megablock, the city's Wall, a pillar.</summary>
        public sealed class MassBlock
        {
            public int Mass;
            public string Kind;
            public float Height, Crest;
            public bool Reveal => Crest > RevealAbove;
        }

        /// <summary>A backdrop tower (place metres; its footprint W × D about X, Z).</summary>
        public sealed class Tower
        {
            public float X, Z, W, D, Height;
            public string Kind;
            public int Sector;
            public long CellKey;
        }

        /// <summary>Water or a drop cut into the ground (place metres): the terrain is cut away over it, a channel stands
        /// in it, a sheet of water at <see cref="Level"/>; bridges over it are decks.</summary>
        public sealed class Pool
        {
            public float X0, Z0, X1, Z1, Level, Floor;
            public bool Void;
        }

        /// <summary>A kit prop to put (the editor maps its kind to a model): dressing the kit's pieces do not make.</summary>
        public sealed class Prop
        {
            public string Kind;
            public float X, Y, Z, Yaw;
            public int Building = -1;
        }

        /// <summary>A district or a place in world metres: its centre and size.</summary>
        public sealed class Area
        {
            public string Id;
            public float X, Z, W, D;
            public Area(string id, float x, float z, float w, float d) { Id = id; X = x; Z = z; W = w; D = d; }
            public float Distance(float x, float z)
            {
                float dx = Math.Max(0, Math.Abs(x - X) - W / 2), dz = Math.Max(0, Math.Abs(z - Z) - D / 2);
                return (float)Math.Sqrt(dx * dx + dz * dz);
            }
        }

        /// <summary>A road, rail or river the skyline keeps clear of (world metres, its half width).</summary>
        public readonly struct Way
        {
            public readonly float Ax, Az, Bx, Bz, Half;
            public Way(float ax, float az, float bx, float bz, float half) { Ax = ax; Az = az; Bx = bx; Bz = bz; Half = half; }
        }

        /// <summary>A district built: its style, buildings, pieces, towers, pools, props and yards.</summary>
        public sealed class City
        {
            public Style Style;
            public PlacePlan Plan;
            public int CellsX, CellsZ;
            public readonly List<Block> Blocks = new();
            public readonly List<MassBlock> Masses = new();
            public readonly List<Piece> Pieces = new();
            public readonly List<Tower> Towers = new();
            public readonly List<Pool> Pools = new();
            public readonly List<Prop> Props = new();
            public List<PlaceYards.Vignette> Yards = new();
            /// <summary>The map's props the kit makes itself afloat (a boat), and the height others are put at (a wreck half
            /// under the water), by their index in the plan's items.</summary>
            public readonly HashSet<int> Afloat = new();
            public readonly Dictionary<int, float> ItemY = new();
            /// <summary>The bridges' tiles (walkable decks over a pool), row-major.</summary>
            public bool[] Bridge;
            /// <summary>The pools' tiles (water and voids), row-major.</summary>
            public bool[] Wet;

            public int CellOf(float x, float z)
            {
                var i = Math.Clamp((int)Math.Floor((x + Plan.Width / 2) / Cell), 0, CellsX - 1);
                var j = Math.Clamp((int)Math.Floor((z + Plan.Depth / 2) / Cell), 0, CellsZ - 1);
                return j * CellsX + i;
            }

            /// <summary>The building over a room (null for none).</summary>
            public Block BlockOf(int room) => Blocks.FirstOrDefault(b => b.Room == room);

            /// <summary>The height a room's cutaway box must reach (its PlaceBuilding.Height): the box is cut up to 5.5 m over
            /// it, so the parapet and whatever stands on the roof go with the walls.</summary>
            public float OpenHeight(int room)
            {
                var b = BlockOf(room);
                if (b == null) return Plan.Rooms[room].Height + 0.5f;
                return Math.Max(b.Top + Parapet, b.Crest - 5f);
            }
        }

        // --- the styles ------------------------------------------------------------------------------------------------

        public static readonly Rgb White = new(1, 1, 1);
        private static Rgb C(int hex) => new(((hex >> 16) & 255) / 255f, ((hex >> 8) & 255) / 255f, (hex & 255) / 255f);

        /// <summary>A district's look: its buildings' height, palette and wear, how its facades and roofs are dressed, its
        /// light, its streets, its skyline.</summary>
        public sealed class Style
        {
            public string Id;
            public int StoreysMin = 2, StoreysMax = 4;
            public float BayPitch = 2.6f, BayJitter, Window = 1.2f;
            public (string Key, Rgb Tint)[] Facades;
            public string TrimKey = "steel";
            public Rgb Trim = C(0x55585c);
            public Rgb Interior = C(0xd8d2c4);
            public float Grime = 0.5f;
            public Rgb[] Neon, Rooms, Canvas;
            public float Lit = 0.5f, ShopLit = 0.7f;
            public float Balcony, Ac, Shutter, Blank, Laundry, Patch, Cornice;
            public float Blade, Screen, Fascia, Strip, Crown, Awning, Pipe, Conduit;
            public float Cables;
            public bool Festoon;
            public float Shanty, Garden, Tanks, Billboard, Antenna, Dish, Solar, Dome, Stair = 0.5f;
            public float MegaMin = 18f, MegaMax = 26f, WallHeight = 8f;
            public int RimStoreys = 2;
            public float TowerMin = 30f, TowerMax = 80f, TowerDensity = 0.75f;
            public string TowerKind = "office";
            /// <summary>The side beyond the city's Wall (−1 west, +1 east, 0 none): the towers there are the dead ring's.</summary>
            public int DeadSide;
            public float Vending, Bins, Crates;
            public float Lamp = 5.6f;
            public Rgb LampLight = C(0xffb46a);
            public (string Kind, double Weight)[] YardWeights = Array.Empty<(string, double)>();
            public int YardsMax = 10;
        }

        public static readonly Style Precinct = new()
        {
            // the Ledger's orderly middle: grey, clean-lined, regular; civic screens and cool light; tidy roofs
            Id = "precinct", StoreysMin = 3, StoreysMax = 5, BayPitch = 2.7f, BayJitter = 0f, Window = 1.3f,
            Facades = new[] { ("concrete", C(0xe6e4de)), ("painted", C(0xb8c4cc)), ("painted", C(0xe9e4d6)), ("concrete", C(0xcfd3d4)), ("painted", C(0xb9c6b3)), ("brick", C(0xd9c9bc)) },
            Trim = C(0x4c5866), Interior = C(0xe8e6e0), Grime = 0.3f,
            Neon = new[] { C(0xd8f0ff), C(0x5fe4ff), C(0x9fc8ff) }, Rooms = new[] { C(0xfff1d6), C(0xdfeaff), C(0xf6fbff) },
            Canvas = new[] { C(0x5a6f86), C(0x8b9aa6) },
            Lit = 0.55f, ShopLit = 0.85f, Balcony = 0.04f, Ac = 0.12f, Shutter = 0.12f, Blank = 0.02f, Laundry = 0f, Patch = 0.02f, Cornice = 1f,
            Blade = 0.15f, Screen = 0.3f, Fascia = 0.5f, Strip = 0.35f, Crown = 0.4f, Awning = 0.1f, Pipe = 0.5f, Conduit = 0.1f,
            Cables = 0.15f, Shanty = 0f, Garden = 0.05f, Tanks = 0.3f, Billboard = 0.1f, Antenna = 0.6f, Dish = 0.4f, Solar = 0.35f,
            WallHeight = 10f, RimStoreys = 3, TowerMin = 40f, TowerMax = 110f, TowerDensity = 0.85f, TowerKind = "office", DeadSide = -1,
            Vending = 0.12f, Bins = 0.15f, Crates = 0.03f, Lamp = 6.2f, LampLight = C(0xe8f2ff),
            YardWeights = new[] { ("rest", 1.0), ("stores", 0.4), ("cookfire", 0.4), ("junk", 0.3) }, YardsMax = 8,
        };

        public static readonly Style Market = new()
        {
            // the bazaar in a dead mall: faded colour, brick and patchwork, signs everywhere, awnings, cables, plant on every roof
            Id = "market", StoreysMin = 2, StoreysMax = 4, BayPitch = 2.5f, BayJitter = 0.25f, Window = 1.1f,
            Facades = new[] { ("brick", C(0xc98f72)), ("painted", C(0x6fa8a0)), ("painted", C(0xd9b25a)), ("painted", C(0xd98c72)), ("brick", C(0xb07055)), ("painted", C(0x88a8c8)), ("painted", C(0xe8dcc0)), ("concrete", C(0xd6cbb8)) },
            Trim = C(0x5c4a3c), Interior = C(0xdccbb0), Grime = 0.55f,
            Neon = new[] { C(0xffb040), C(0xff5c9a), C(0x5cff8a), C(0xfff0c0), C(0x40c8ff) }, Rooms = new[] { C(0xffd8a0), C(0xffe6c0), C(0xfff4dc) },
            Canvas = new[] { C(0xd8642c), C(0x2f6ea8), C(0x3f8a4a), C(0xc23a32), C(0xe2b43a), C(0x7a4a8a) },
            Lit = 0.5f, ShopLit = 0.8f, Balcony = 0.12f, Ac = 0.25f, Shutter = 0.18f, Blank = 0.06f, Laundry = 0.2f, Patch = 0.15f, Cornice = 0.5f,
            Blade = 0.6f, Screen = 0.12f, Fascia = 0.7f, Strip = 0.35f, Crown = 0.15f, Awning = 0.6f, Pipe = 0.4f, Conduit = 0.4f,
            Cables = 0.8f, Shanty = 0.25f, Garden = 0.1f, Tanks = 0.45f, Billboard = 0.2f, Antenna = 0.4f, Dish = 0.4f, Solar = 0.1f,
            RimStoreys = 2, TowerMin = 30f, TowerMax = 90f, TowerDensity = 0.8f, TowerKind = "tenement",
            Vending = 0.2f, Bins = 0.2f, Crates = 0.25f, Lamp = 5.4f, LampLight = C(0xffb060),
            YardWeights = new[] { ("stores", 2.0), ("stove", 1.5), ("rest", 1.0), ("junk", 0.6), ("generator", 0.6), ("water", 0.3) }, YardsMax = 12,
        };

        public static readonly Style Lantern = new()
        {
            // the pleasure district on the canal: deep colours under neon, blade signs on every front, festoons, screens
            Id = "lantern", StoreysMin = 3, StoreysMax = 5, BayPitch = 2.4f, BayJitter = 0.1f, Window = 1.1f,
            Facades = new[] { ("brick", C(0xa0524a)), ("painted", C(0x7a3a48)), ("painted", C(0x5a4a78)), ("painted", C(0x3c6466)), ("brick", C(0x8a6a5a)), ("painted", C(0xb07888)), ("concrete", C(0x9a948c)) },
            Trim = C(0x2c2a30), Interior = C(0xc8a898), Grime = 0.5f,
            Neon = new[] { C(0xff2a8a), C(0x20e8ff), C(0xa040ff), C(0xff3a20), C(0xffc040), C(0x40ff9a) }, Rooms = new[] { C(0xff9a7a), C(0xffc8a0), C(0xd8a0ff) },
            Canvas = new[] { C(0x8a1e3a), C(0x2a2a5a), C(0xc23a6a), C(0x1e5a5a) },
            Lit = 0.6f, ShopLit = 0.9f, Balcony = 0.15f, Ac = 0.2f, Shutter = 0.15f, Blank = 0.04f, Laundry = 0.08f, Patch = 0.08f, Cornice = 0.7f,
            Blade = 0.9f, Screen = 0.35f, Fascia = 0.9f, Strip = 0.8f, Crown = 0.6f, Awning = 0.5f, Pipe = 0.3f, Conduit = 0.3f,
            Cables = 0.7f, Festoon = true, Shanty = 0.08f, Garden = 0.05f, Tanks = 0.3f, Billboard = 0.45f, Antenna = 0.3f, Dish = 0.25f, Solar = 0f,
            RimStoreys = 3, TowerMin = 35f, TowerMax = 100f, TowerDensity = 0.8f, TowerKind = "neon",
            Vending = 0.3f, Bins = 0.2f, Crates = 0.12f, Lamp = 5.4f, LampLight = C(0xff9ad0),
            YardWeights = new[] { ("rest", 1.5), ("stove", 1.0), ("stores", 0.6), ("generator", 0.5) }, YardsMax = 9,
        };

        public static readonly Style Stacks = new()
        {
            // the megablocks: patched concrete walls of windows rising round the courts, balconies closed in with scrap,
            // dishes and laundry, gardens and shacks on the roofs
            Id = "stacks", StoreysMin = 2, StoreysMax = 3, BayPitch = 2.0f, BayJitter = 0.15f, Window = 1.0f,
            Facades = new[] { ("concrete", C(0xd4cec4)), ("painted", C(0xe0d29a)), ("painted", C(0xa8c4a0)), ("painted", C(0x9cb4cc)), ("painted", C(0xd8a898)), ("concrete", C(0xc0b8ac)) },
            Trim = C(0x5a5650), Interior = C(0xd4ccbc), Grime = 0.65f,
            Neon = new[] { C(0x60ff90), C(0xffb040), C(0x60c0ff) }, Rooms = new[] { C(0xffd8a0), C(0xfff0d0), C(0xd8f0ff) },
            Canvas = new[] { C(0xc8503a), C(0x3a70b0), C(0xe0c040), C(0x4a9a5a), C(0xe8e0d0), C(0xb04a8a) },
            Lit = 0.65f, ShopLit = 0.6f, Balcony = 0.3f, Ac = 0.3f, Shutter = 0.12f, Blank = 0.08f, Laundry = 0.35f, Patch = 0.3f, Cornice = 0.2f,
            Blade = 0.25f, Screen = 0.05f, Fascia = 0.4f, Strip = 0.1f, Crown = 0.1f, Awning = 0.35f, Pipe = 0.5f, Conduit = 0.5f,
            Cables = 1.0f, Shanty = 0.45f, Garden = 0.45f, Tanks = 0.5f, Billboard = 0.05f, Antenna = 0.5f, Dish = 0.7f, Solar = 0.15f,
            MegaMin = 22f, MegaMax = 28f, RimStoreys = 3, TowerMin = 40f, TowerMax = 75f, TowerDensity = 0.9f, TowerKind = "megablock",
            Vending = 0.1f, Bins = 0.3f, Crates = 0.3f, Lamp = 5.2f, LampLight = C(0xffc070),
            YardWeights = new[] { ("garden", 1.5), ("rest", 1.0), ("cookfire", 0.6), ("water", 0.6), ("junk", 0.5), ("workbench", 0.5), ("generator", 0.5) }, YardsMax = 10,
        };

        public static readonly Style Bridgeward = new()
        {
            // gang turf at the broken bridge: low, stained, burnt and patched, loud blocks of paint, shacks on the roofs,
            // harsh red and amber light, wrecks and junk
            Id = "bridgeward", StoreysMin = 2, StoreysMax = 3, BayPitch = 2.8f, BayJitter = 0.35f, Window = 1.1f,
            Facades = new[] { ("concrete", C(0xb8ada0)), ("brick", C(0xa47462)), ("painted", C(0xc84a3a)), ("painted", C(0xd8b040)), ("concrete", C(0x9a9288)), ("painted", C(0x4a8a6a)), ("painted", C(0x30302e)) },
            Trim = C(0x3a3430), Interior = C(0xb8aa98), Grime = 0.85f,
            Neon = new[] { C(0xff2a1a), C(0xffa020), C(0xff5a3a) }, Rooms = new[] { C(0xffb070), C(0xff9050) },
            Canvas = new[] { C(0x6a5a40), C(0x8a3a2a), C(0x4a5a3a) },
            Lit = 0.3f, ShopLit = 0.55f, Balcony = 0.08f, Ac = 0.1f, Shutter = 0.3f, Blank = 0.18f, Laundry = 0.1f, Patch = 0.35f, Cornice = 0.1f,
            Blade = 0.3f, Screen = 0.05f, Fascia = 0.3f, Strip = 0.2f, Crown = 0.05f, Awning = 0.2f, Pipe = 0.3f, Conduit = 0.6f,
            Cables = 0.9f, Shanty = 0.5f, Garden = 0.05f, Tanks = 0.4f, Billboard = 0.1f, Antenna = 0.5f, Dish = 0.3f, Solar = 0f,
            RimStoreys = 2, TowerMin = 25f, TowerMax = 70f, TowerDensity = 0.7f, TowerKind = "derelict",
            Vending = 0.05f, Bins = 0.2f, Crates = 0.35f, Lamp = 5f, LampLight = C(0xff9a40),
            YardWeights = new[] { ("junk", 2.0), ("workbench", 1.5), ("cookfire", 1.0), ("generator", 1.0), ("stores", 0.5) }, YardsMax = 12,
        };

        public static readonly Style Sink = new()
        {
            Id = "sink", StoreysMin = 1, StoreysMax = 2, BayPitch = 2.4f, BayJitter = 0.4f, Window = 1.0f,
            Facades = new[] { ("concrete", C(0x9a948a)), ("brick", C(0x8a6a58)), ("painted", C(0x6a8a80)), ("concrete", C(0x8a8478)) },
            Trim = C(0x3a3430), Interior = C(0xa89a88), Grime = 0.95f,
            Neon = new[] { C(0xffa040), C(0x60ff90), C(0xff4a6a) }, Rooms = new[] { C(0xffb060) }, Canvas = new[] { C(0x5a5040), C(0x3a4a5a) },
            Lit = 0.4f, ShopLit = 0.5f, Balcony = 0.05f, Ac = 0.05f, Shutter = 0.3f, Blank = 0.2f, Laundry = 0.3f, Patch = 0.4f,
            Blade = 0.3f, Fascia = 0.3f, Strip = 0.15f, Awning = 0.3f, Pipe = 0.6f, Conduit = 0.8f, Cables = 1.2f, Festoon = true,
            Shanty = 0.7f, Tanks = 0.3f, Antenna = 0.2f, MegaMin = 7f, MegaMax = 9f, WallHeight = 7f, RimStoreys = 2,
            TowerMin = 25f, TowerMax = 60f, TowerKind = "derelict", Bins = 0.3f, Crates = 0.4f, Lamp = 4.4f,
            YardWeights = new[] { ("cookfire", 1.5), ("junk", 1.5), ("water", 1.0), ("stove", 1.0) },
        };

        public static readonly Style Crown = new()
        {
            // the Tenured's terraces: clean white and stone, glass, warm gold light, gardens and domes; no grime, no cables
            Id = "crown", StoreysMin = 2, StoreysMax = 4, BayPitch = 3.2f, BayJitter = 0f, Window = 2.2f,
            Facades = new[] { ("painted", C(0xf4f1ea)), ("painted", C(0xece2cc)), ("concrete", C(0xe8e2d6)), ("painted", C(0xdcd8cc)) },
            Trim = C(0xc8b07a), Interior = C(0xf6f2ea), Grime = 0f,
            Neon = new[] { C(0xffe0a0), C(0xfff4e0) }, Rooms = new[] { C(0xffe8c0), C(0xfff6e6) }, Canvas = new[] { C(0xf0ece0), C(0x3a5a4a) },
            Lit = 0.7f, ShopLit = 0.95f, Balcony = 0.35f, Ac = 0f, Shutter = 0f, Cornice = 1f,
            Fascia = 0.2f, Strip = 0.6f, Crown = 0.8f, Awning = 0.3f, Cables = 0f, Garden = 0.7f, Solar = 0.2f, Dome = 0.5f, Antenna = 0.05f,
            RimStoreys = 2, TowerMin = 60f, TowerMax = 140f, TowerDensity = 0.7f, TowerKind = "glass", Lamp = 5f, LampLight = C(0xfff0d0),
            YardWeights = new[] { ("garden", 2.0), ("rest", 1.5) },
        };

        public static readonly Style Spire = new()
        {
            Id = "spire", StoreysMin = 3, StoreysMax = 5, BayPitch = 3.0f, Window = 1.8f,
            Facades = new[] { ("concrete", C(0xdcd8d0)), ("painted", C(0xc8ccd0)), ("painted", C(0xe8e4dc)) },
            Trim = C(0x6a7480), Interior = C(0xeceae4), Grime = 0.15f,
            Neon = new[] { C(0xbfe8ff), C(0xffe8c0) }, Rooms = new[] { C(0xf0f4ff), C(0xfff0d8) }, Canvas = new[] { C(0x6a7a8a) },
            Lit = 0.6f, ShopLit = 0.9f, Balcony = 0.1f, Ac = 0.05f, Cornice = 1f, Screen = 0.2f, Fascia = 0.3f, Strip = 0.5f, Crown = 0.7f,
            Cables = 0.05f, Garden = 0.3f, Solar = 0.3f, Antenna = 0.4f, Dish = 0.3f,
            RimStoreys = 3, TowerMin = 70f, TowerMax = 160f, TowerKind = "glass",
            YardWeights = new[] { ("rest", 1.0) },
        };

        public static readonly Style Ring = new()
        {
            // the dead ring beyond the Wall: ruins, no light but fires
            Id = "ring", StoreysMin = 1, StoreysMax = 3, BayPitch = 2.8f, BayJitter = 0.3f, Window = 1.2f,
            Facades = new[] { ("concrete", C(0xa09a90)), ("brick", C(0x8a6a58)), ("concrete", C(0x8a8680)) },
            Trim = C(0x3a3632), Interior = C(0x9a9080), Grime = 1f,
            Neon = new[] { C(0xff8a30) }, Rooms = new[] { C(0xff9040) }, Canvas = new[] { C(0x5a5040) },
            Lit = 0.06f, ShopLit = 0.1f, Shutter = 0.2f, Blank = 0.35f, Patch = 0.3f, Pipe = 0.2f, Shanty = 0.2f,
            RimStoreys = 2, TowerMin = 30f, TowerMax = 80f, TowerKind = "derelict", Crates = 0.3f, Lamp = 4.4f,
            YardWeights = new[] { ("cookfire", 1.5), ("junk", 1.5), ("water", 0.5) },
        };

        public static readonly Style Docks = new()
        {
            Id = "docks", StoreysMin = 1, StoreysMax = 3, BayPitch = 3.2f, BayJitter = 0.2f, Window = 1.4f,
            Facades = new[] { ("metal", C(0x4a7a9a)), ("metal", C(0xb85a3a)), ("concrete", C(0xbab2a4)), ("metal", C(0x5a8a5a)), ("brick", C(0x9a6a52)) },
            Trim = C(0x3a3a38), Interior = C(0xb8b0a0), Grime = 0.7f,
            Neon = new[] { C(0xffa040), C(0xffd080) }, Rooms = new[] { C(0xffc080) }, Canvas = new[] { C(0x4a6a8a), C(0xb05a30) },
            Lit = 0.35f, ShopLit = 0.6f, Shutter = 0.3f, Blank = 0.2f, Ac = 0.1f, Fascia = 0.4f, Strip = 0.2f, Pipe = 0.5f, Conduit = 0.4f,
            Cables = 0.4f, Tanks = 0.5f, Antenna = 0.3f, RimStoreys = 2, TowerMin = 25f, TowerMax = 60f, TowerKind = "tenement",
            Crates = 0.5f, Bins = 0.2f, Lamp = 7f, LampLight = C(0xffa040),
            YardWeights = new[] { ("stores", 2.0), ("junk", 1.0), ("workbench", 1.0) },
        };

        public static IReadOnlyList<Style> Styles => new[] { Precinct, Market, Lantern, Stacks, Bridgeward, Sink, Crown, Spire, Ring, Docks };

        /// <summary>A map's district style: Meridian's maps (md_*) by their district, null for any other map (the
        /// frontier kit builds it).</summary>
        public static Style StyleFor(string mapId)
        {
            if (mapId == null || !mapId.StartsWith("md_")) return null;
            var d = mapId.Substring(3);
            if (d.StartsWith("precinct")) return Precinct;
            if (d.StartsWith("market")) return Market;
            if (d.StartsWith("lantern")) return Lantern;
            if (d.StartsWith("stacks")) return Stacks;
            if (d.StartsWith("bridgeward")) return Bridgeward;
            if (d.StartsWith("sink")) return Sink;
            if (d.StartsWith("crown")) return Crown;
            if (d.StartsWith("spire")) return Spire;
            if (d.StartsWith("ring")) return Ring;
            if (d.StartsWith("docks")) return Docks;
            return Market;
        }

        // --- building a district ---------------------------------------------------------------------------------------

        /// <summary>Raises a district from its plan. <paramref name="self"/> and <paramref name="city"/> (world metres) place
        /// its skyline among its neighbours' (none without them); <paramref name="keepOut"/> are every place's footprints
        /// the towers keep clear of, <paramref name="ways"/> the roads and rails they keep clear of.</summary>
        public static City Build(PlacePlan plan, MapDef map, Style style, int seed, Area self = null, IReadOnlyList<Area> city = null,
            IReadOnlyList<Area> keepOut = null, IReadOnlyList<Way> ways = null)
        {
            var c = new City
            {
                Style = style, Plan = plan,
                CellsX = Math.Max(1, (int)Math.Ceiling(plan.Width / Cell)), CellsZ = Math.Max(1, (int)Math.Ceiling(plan.Depth / Cell)),
            };
            var m = new Maker(c, map, seed);
            m.Run();
            if (self != null) Towers(c, self, city ?? new[] { self }, keepOut ?? Array.Empty<Area>(), ways ?? Array.Empty<Way>(), seed);
            foreach (var p in c.Pieces) Fold(p);
            return c;
        }

        /// <summary>The border wall tiles a district takes as its map's edge, row-major: a district's maps are walled round
        /// (the web game's edge), and walls all round would close the whole district into one room. A border wall that
        /// backs a thick wall of its own kind (a megablock reaching the edge) stays.</summary>
        public static bool[] RimTiles(MapDef map)
        {
            int rows = map.Layout.Count, cols = map.Layout.Max(r => r.Length);
            var rim = new bool[rows * cols];
            TileDef At(int i, int j) => i >= 0 && j >= 0 && j < rows && i < map.Layout[j].Length && map.Legend != null && map.Legend.TryGetValue(map.Layout[j][i].ToString(), out var d) ? d : null;
            bool Wall(TileDef d) => d?.Wall != null && d.Wall != "rock" && (d.WallHeight ?? 2.6) >= PlacePlan.FenceHeight;
            for (var j = 0; j < rows; j++)
                for (var i = 0; i < cols; i++)
                {
                    if (i != 0 && j != 0 && i != cols - 1 && j != rows - 1) continue;
                    var d = At(i, j);
                    if (!Wall(d)) continue;
                    int ii = Math.Clamp(i, 1, cols - 2), jj = Math.Clamp(j, 1, rows - 2);
                    var inner = At(ii, jj);
                    if (Wall(inner) && inner.Wall == d.Wall)
                    {
                        // backs a thick wall only where the wall behind runs on along the border (a megablock), not a
                        // building's wall meeting the edge end on
                        var along = i == 0 || i == cols - 1 ? (At(ii, jj - 1), At(ii, jj + 1)) : (At(ii - 1, jj), At(ii + 1, jj));
                        if (Wall(along.Item1) && Wall(along.Item2)) continue;
                    }
                    rim[j * cols + i] = true;
                }
            return rim;
        }

        /// <summary>A district's map as its plan reads it (<see cref="PlacePlan.Build"/>): its border walls
        /// (<see cref="RimTiles"/>) turned into the rock rim the plan takes as the edge, each on its inner neighbour's
        /// ground. The city raises the border itself, from the map as authored. Other maps are returned as they are.</summary>
        public static MapDef Prepare(MapDef map)
        {
            if (StyleFor(map?.Id) == null || map.Layout == null || map.Layout.Count == 0) return map;
            var rim = RimTiles(map);
            if (!rim.Any(x => x)) return map;
            int rows = map.Layout.Count, cols = map.Layout.Max(r => r.Length);
            var copy = (MapDef)typeof(object).GetMethod("MemberwiseClone", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic).Invoke(map, null);
            copy.Legend = new Dictionary<string, TileDef>(map.Legend);
            var byFloor = new Dictionary<string, char>();
            var next = '\u2460';
            var layout = new List<string>();
            for (var j = 0; j < rows; j++)
            {
                var row = map.Layout[j].ToCharArray();
                for (var i = 0; i < row.Length; i++)
                {
                    if (!rim[j * cols + i]) continue;
                    int ii = Math.Clamp(i, 1, cols - 2), jj = Math.Clamp(j, 1, rows - 2);
                    var inner = jj < rows && ii < map.Layout[jj].Length && map.Legend.TryGetValue(map.Layout[jj][ii].ToString(), out var d) ? d : null;
                    var floor = inner?.Wall == null && inner?.Empty != true ? inner?.Floor ?? "concrete" : "concrete";
                    if (!byFloor.TryGetValue(floor, out var ch))
                    {
                        while (copy.Legend.ContainsKey(next.ToString())) next++;
                        ch = next++;
                        byFloor[floor] = ch;
                        copy.Legend[ch.ToString()] = new TileDef { Wall = "rock", Floor = floor, WallHeight = 3 };
                    }
                    row[i] = ch;
                }
                layout.Add(new string(row));
            }
            copy.Layout = layout;
            return copy;
        }

        /// <summary>The materials the city draws with (the editor's library keys for each are in PlaceBuilder): every merge
        /// cell's mesh has one draw per material it uses, so near-twins are folded into one with a tint.</summary>
        public static readonly string[] Keys = { "concrete", "painted", "brick", "metal", "tin", "scrap", "canvas", "planks", "grate", "tiles", "soil", "light" };

        private static readonly Rgb Rust = new(0.72f, 0.42f, 0.26f), Steel = new(0.62f, 0.62f, 0.6f);

        /// <summary>Folds a piece's material into <see cref="Keys"/>: rust is tin rusted, bare steel is metal darkened, the
        /// floor slab is concrete, boards are planks, deck plate is metal.</summary>
        private static void Fold(Piece p)
        {
            (string, Rgb) F(string key, Rgb tint) => key switch
            {
                "rust" => ("tin", tint * Rust),
                "steel" => ("metal", tint * Steel),
                "slab" => ("concrete", tint),
                "wood" => ("planks", tint),
                "plate" => ("metal", tint * new Rgb(0.8f, 0.8f, 0.78f)),
                _ => (key, tint),
            };
            (p.Key, p.Tint) = F(p.Key, p.Tint);
            if (p.TopKey != null) p.TopKey = F(p.TopKey, White).Item1;
        }

        /// <summary>The floor's top in a room (as PlaceBuilder's: a slab a step up from the street, boards higher).</summary>
        public static float FloorTop(PlacePlan.Room room) => room == null ? 0f : room.Floor == "wood" ? 0.3f : 0.15f;

        /// <summary>A wall's thickness in the city (m).</summary>
        public static float Thickness(string kind) => kind switch
        {
            "concrete" => 0.3f, "brick" => 0.3f, "adobe" => 0.4f, "wood" => 0.18f, "metal" => 0.1f, _ => 0.06f,
        };

        /// <summary>A deterministic hash of the seed and three numbers to [0, 1).</summary>
        public static float Hash(int seed, int a, int b = 0, int c = 0)
        {
            unchecked
            {
                var h = (uint)seed * 374761393u + (uint)a * 668265263u + (uint)b * 2246822519u + (uint)c * 3266489917u;
                h = (h ^ (h >> 13)) * 1274126177u;
                h ^= h >> 16;
                return (h & 0xffffff) / 16777216f;
            }
        }

        /// <summary>The u (metres) a face's texture runs along at a point: what the editor's mesh projection gives (a face
        /// looking along ±x runs along z, one along ±z along −x), so details can sit on a grid's bays.</summary>
        public static float FaceU(float nx, float nz, float x, float z) =>
            Math.Abs(nx) >= Math.Abs(nz) ? z * Math.Sign(nx) : -x * Math.Sign(nz);

        // --- the skyline -------------------------------------------------------------------------------------------------

        /// <summary>The backdrop towers a district owns: on a world grid round the city, from <see cref="TowerMargin"/>
        /// beyond every place out to <see cref="Backdrop"/> beyond this district, each cell owned by the nearest district of
        /// the city (rectangle distance; the first by id on a tie), clear of roads and rails; taller further out, a few
        /// landmarks; the dead ring's beyond the Wall.</summary>
        public static void Towers(City c, Area self, IReadOnlyList<Area> city, IReadOnlyList<Area> keepOut, IReadOnlyList<Way> ways, int seed)
        {
            var s = c.Style;
            const int worldSeed = 1909;   // one skyline for the whole city: every district reads the same cells
            int gx0 = (int)Math.Floor((self.X - self.W / 2 - Backdrop) / TowerCell), gx1 = (int)Math.Floor((self.X + self.W / 2 + Backdrop) / TowerCell);
            int gz0 = (int)Math.Floor((self.Z - self.D / 2 - Backdrop) / TowerCell), gz1 = (int)Math.Floor((self.Z + self.D / 2 + Backdrop) / TowerCell);
            var all = city.Concat(keepOut).ToList();
            float cityW = city.Min(a => a.X - a.W / 2), cityE = city.Max(a => a.X + a.W / 2);
            for (var gz = gz0; gz <= gz1; gz++)
                for (var gx = gx0; gx <= gx1; gx++)
                {
                    float cx = (gx + 0.5f) * TowerCell, cz = (gz + 0.5f) * TowerCell;
                    var dSelf = self.Distance(cx, cz);
                    if (dSelf > Backdrop) continue;
                    // the nearest district owns the cell
                    Area owner = null; var best = float.MaxValue;
                    foreach (var a in city.OrderBy(a => a.Id, StringComparer.Ordinal))
                    {
                        var d = a.Distance(cx, cz);
                        if (d < best - 1e-3f) { best = d; owner = a; }
                    }
                    if (owner == null || owner.Id != self.Id) continue;
                    var h0 = Hash(worldSeed, gx, gz, 1);
                    // a few cells stay low or open: courts, yards, plazas between the towers
                    var dense = Math.Min(0.97f, s.TowerDensity + Math.Min(0.15f, dSelf / 600f));
                    if (h0 > dense) continue;
                    var w = 12f + Hash(worldSeed, gx, gz, 2) * (TowerCell - 18f);
                    var dd = 12f + Hash(worldSeed, gx, gz, 3) * (TowerCell - 18f);
                    var jx = (Hash(worldSeed, gx, gz, 4) - 0.5f) * (TowerCell - 4f - w);
                    var jz = (Hash(worldSeed, gx, gz, 5) - 0.5f) * (TowerCell - 4f - dd);
                    float tx = cx + jx, tz = cz + jz;
                    // its footprint clear of every place (and its margin), of the roads and rails
                    var clear = true;
                    foreach (var a in all)
                    {
                        float dx = Math.Abs(tx - a.X) - (a.W / 2 + w / 2), dz = Math.Abs(tz - a.Z) - (a.D / 2 + dd / 2);
                        if (dx < TowerMargin && dz < TowerMargin) { clear = false; break; }
                    }
                    if (!clear) continue;
                    var reach = (float)Math.Sqrt(w * w + dd * dd) / 2;
                    foreach (var way in ways)
                        if (SegDist(tx, tz, way.Ax, way.Az, way.Bx, way.Bz) < way.Half + 6f + reach) { clear = false; break; }
                    if (!clear) continue;
                    // taller further out; a landmark now and then
                    var far = Math.Clamp((dSelf - TowerMargin) / (Backdrop - TowerMargin), 0f, 1f);
                    var lo = s.TowerMin * (0.5f + 0.5f * far);
                    var hi = s.TowerMin + (s.TowerMax - s.TowerMin) * (0.35f + 0.65f * far);
                    var height = lo + Hash(worldSeed, gx, gz, 6) * (hi - lo);
                    if (Hash(worldSeed, gx, gz, 7) < 0.05f && far > 0.4f) height = s.TowerMax * 1.35f;
                    var kind = s.TowerKind;
                    if ((s.DeadSide < 0 && tx < cityW) || (s.DeadSide > 0 && tx > cityE)) { kind = "derelict"; height *= 0.7f; }
                    var lx = tx - self.X; var lz = tz - self.Z;
                    var ang = Math.Atan2(lz, lx);
                    var sector = (int)Math.Floor((ang + Math.PI) / (2 * Math.PI) * TowerSectors) % TowerSectors + (dSelf > NearRing ? TowerSectors : 0);
                    c.Towers.Add(new Tower { X = lx, Z = lz, W = w, D = dd, Height = height, Kind = kind, Sector = sector, CellKey = ((long)gx << 32) ^ (uint)gz });
                }
            var maker = new Maker(c, null, seed);
            foreach (var t in c.Towers) maker.TowerPieces(t);
        }

        internal static float SegDist(float px, float pz, float ax, float az, float bx, float bz)
        {
            float dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
            var t = l2 < 1e-6f ? 0f : Math.Clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0f, 1f);
            float qx = ax + dx * t - px, qz = az + dz * t - pz;
            return (float)Math.Sqrt(qx * qx + qz * qz);
        }

        // --- the draw estimate -----------------------------------------------------------------------------------------

        /// <summary>The draws the worst view of the district costs (the game camera at its widest sees about
        /// <see cref="View"/> m square of ground and the skyline behind): every merge cell under the view by its materials,
        /// the ground's surfaces, the water, the skyline's sectors in front, and the kit props in the view (one and a half
        /// each: the kits' models carry one or two materials).</summary>
        public static int EstimateDraws(City c, int propsPerItem = 3)
        {
            var plan = c.Plan;
            var keys = new HashSet<string>[c.CellsX * c.CellsZ];
            for (var k = 0; k < keys.Length; k++) keys[k] = new HashSet<string>();
            var sectorKeys = new HashSet<string>[TowerSectors * 2];
            for (var k = 0; k < sectorKeys.Length; k++) sectorKeys[k] = new HashSet<string>();
            foreach (var p in c.Pieces)
            {
                var set = p.Cell >= 0 ? keys[p.Cell] : sectorKeys[-1 - p.Cell];
                set.Add(p.Key);
                if (p.TopKey != null) set.Add(p.TopKey);
            }
            var surfaces = plan.Ground.Where(g => g != null && g != "water").Distinct().Count();
            var props = plan.Items.Where(i => !Overrides.Contains(i.Kind)).Select(i => (i.X, i.Z)).Concat(c.Props.Select(p => (p.X, p.Z)))
                .Concat(c.Yards.Select(v => (v.X, v.Z))).ToList();
            var yardSet = new HashSet<(float, float)>(c.Yards.Select(v => (v.X, v.Z)));
            var worst = 0;
            for (var z = -plan.Depth / 2; z <= plan.Depth / 2; z += 8f)
                for (var x = -plan.Width / 2; x <= plan.Width / 2; x += 8f)
                {
                    float x0 = x - View / 2, x1 = x + View / 2, z0 = z - View / 2, z1 = z + View / 2;
                    var draws = surfaces + (c.Pools.Count > 0 ? 2 : 0);
                    for (var j = 0; j < c.CellsZ; j++)
                        for (var i = 0; i < c.CellsX; i++)
                        {
                            float cx0 = i * Cell - plan.Width / 2, cz0 = j * Cell - plan.Depth / 2;
                            if (cx0 > x1 || cx0 + Cell < x0 || cz0 > z1 || cz0 + Cell < z0) continue;
                            draws += keys[j * c.CellsX + i].Count;
                        }
                    // the skyline: three of its near ring's groups and one far
                    draws += sectorKeys.Take(TowerSectors).Select(k => k.Count).OrderByDescending(n => n).Take(3).Sum()
                        + sectorKeys.Skip(TowerSectors).Select(k => k.Count).DefaultIfEmpty(0).Max();
                    foreach (var (px, pz) in props)
                    {
                        if (px < x0 || px > x1 || pz < z0 || pz > z1) continue;
                        draws += yardSet.Contains((px, pz)) ? propsPerItem * 2 : 1;
                    }
                    worst = Math.Max(worst, draws);
                }
            return worst;
        }

        /// <summary>Map props the city makes itself (street lights, lightboxes) instead of the frontier kit's.</summary>
        public static readonly HashSet<string> Overrides = new() { "lamp_post", "sign" };

        // --- the maker ---------------------------------------------------------------------------------------------------

        private sealed partial class Maker
        {
            private readonly City _c;
            private readonly PlacePlan _p;
            private readonly MapDef _map;
            private readonly Style _s;
            private readonly int _seed;
            private int _building = -1;

            public Maker(City c, MapDef map, int seed) { _c = c; _p = c.Plan; _map = map; _s = c.Style; _seed = seed; }

            private float H(int a, int b = 0, int c = 0) => Hash(_seed, a, b, c);

            // a wall's frame: from A along U, its outside N, turned to face N
            private readonly struct Frame
            {
                public readonly float Ax, Az, Ux, Uz, Nx, Nz, Len, Yaw;
                public Frame(float ax, float az, float bx, float bz, float nx, float nz)
                {
                    Ax = ax; Az = az;
                    var dx = bx - ax; var dz = bz - az;
                    Len = (float)Math.Sqrt(dx * dx + dz * dz);
                    if (Len < 1e-4f) { Ux = 1; Uz = 0; } else { Ux = dx / Len; Uz = dz / Len; }
                    if (Math.Abs(nx) + Math.Abs(nz) < 1e-4f) { nx = Uz; nz = -Ux; }
                    Nx = nx; Nz = nz;
                    Yaw = (float)(Math.Atan2(nx, nz) * 180 / Math.PI);
                }
                public (float X, float Z) At(float s, float off) => (Ax + Ux * s + Nx * off, Az + Uz * s + Nz * off);
            }

            private int _item = -1;

            private Piece Add(Piece p)
            {
                p.Cell = _c.CellOf(p.X, p.Z);
                p.Building = _building;
                p.Item = _item;
                _c.Pieces.Add(p);
                return p;
            }

            /// <summary>A piece on a wall's frame: from s0 to s1 along it, y0 to y1 up, <paramref name="depth"/> thick, its
            /// middle <paramref name="off"/> out from the wall's centreline.</summary>
            private Piece On(Frame f, float s0, float s1, float y0, float y1, float off, float depth, string key, Rgb tint, float a = -1)
            {
                if (s1 - s0 < 0.01f || y1 - y0 < 0.01f) return null;
                var (x, z) = f.At((s0 + s1) / 2, off);
                return Add(new Piece { Key = key, X = x, Y = (y0 + y1) / 2, Z = z, SX = s1 - s0, SY = y1 - y0, SZ = depth, Yaw = f.Yaw, Tint = tint, A = a < 0 ? _s.Grime : a });
            }

            private Piece Light(Frame f, float s0, float s1, float y0, float y1, float off, float depth, Pattern pattern, Rgb tint, float a = 1f, float p = 0.7f)
            {
                var piece = On(f, s0, s1, y0, y1, off, depth, "light", tint, a);
                if (piece == null) return null;
                piece.Pattern = pattern; piece.P = p;
                if (depth < 0.001f) piece.Shape = Shape.Quad;
                return piece;
            }

            private Piece Free(string key, float x, float y, float z, float sx, float sy, float sz, float yaw, Rgb tint, float a = -1, float pitch = 0)
                => Add(new Piece { Key = key, X = x, Y = y, Z = z, SX = sx, SY = sy, SZ = sz, Yaw = yaw, Pitch = pitch, Tint = tint, A = a < 0 ? _s.Grime : a });

            private Piece Prism(string key, float x, float y0, float z, float d, float h, Rgb tint, int sides = 8, float a = -1)
            {
                var p = Free(key, x, y0 + h / 2, z, d, h, d, 0, tint, a);
                p.Shape = Shape.Prism; p.Sides = sides;
                return p;
            }

            private T Pick<T>(IReadOnlyList<T> list, float u) => list[Math.Min(list.Count - 1, (int)(u * list.Count))];

            // what lies at a point: the tile's ground (null under a wall or a room), its room
            private (int I, int J) TileAt(float x, float z) => ((int)Math.Floor((x + _p.Width / 2) / PlacePlan.Tile), (int)Math.Floor((_p.Depth / 2 - z) / PlacePlan.Tile));
            private bool In(int i, int j) => i >= 0 && j >= 0 && i < _p.Columns && j < _p.Rows;
            private string GroundAt(float x, float z) { var (i, j) = TileAt(x, z); return In(i, j) ? _p.Ground[j * _p.Columns + i] : null; }
            private bool Street(float x, float z)
            {
                var (i, j) = TileAt(x, z);
                if (!In(i, j)) return false;
                var k = j * _p.Columns + i;
                var g = _p.Ground[k];
                return g != null && g != "water" && _p.RoomAt[k] < 0 && (_c.Wet == null || !_c.Wet[k]);
            }
            private bool Open(float x, float z)
            {
                var (i, j) = TileAt(x, z);
                if (!In(i, j)) return true;
                var k = j * _p.Columns + i;
                return _p.Ground[k] != null || _p.RoomAt[k] >= 0 || IsEmpty(i, j);
            }
            private bool IsEmpty(int i, int j)
            {
                if (_map?.Layout == null || j >= _map.Layout.Count || i >= _map.Layout[j].Length) return false;
                return _map.Legend != null && _map.Legend.TryGetValue(_map.Layout[j][i].ToString(), out var d) && d?.Empty == true;
            }

            public void Run()
            {
                Pools();
                Massing();
                for (var w = 0; w < _p.Walls.Count; w++) Wall(_p.Walls[w], w, false);
                Rims();
                foreach (var b in _c.Blocks) { _building = b.Room; Roof(b); _building = -1; }
                for (var k = 0; k < _p.Masses.Count; k++) Mass(k);
                foreach (var f in _p.Fences) Fence(f);
                foreach (var room in _p.Rooms) { _building = room.Index; Floor(room); _building = -1; }
                Kerbs();
                Furniture();
                Cables();
                Dressing();
                YardScenes();
            }

            // --- massing ---------------------------------------------------------------------------------------------

            private void Massing()
            {
                foreach (var room in _p.Rooms)
                {
                    var r = room.Index;
                    var shack = room.Wall == "metal" || room.Wall == "scrap";
                    int storeys;
                    if (shack) storeys = room.Tiles < 40 && H(10, r) < 0.35f ? Math.Min(2, Math.Max(1, _s.StoreysMax)) : 1;
                    else storeys = _s.StoreysMin + (int)(H(11, r) * (_s.StoreysMax - _s.StoreysMin + 1));
                    if (!shack && room.Tiles < 10) storeys = Math.Min(storeys, 3);
                    storeys = Math.Clamp(storeys, 1, 5);
                    var roof = room.Roof == "none" ? "open" : shack ? "shack" : "parapet";
                    var (body, tint) = Pick(_s.Facades, H(12, r));
                    if (room.Wall == "brick" && _s.Facades.Any(f => f.Key == "brick")) (body, tint) = Pick(_s.Facades.Where(f => f.Key == "brick").ToList(), H(13, r));
                    var ground = Math.Max(room.Height, PlacePlan.Storey);
                    var top = ground + (storeys - 1) * Storey;
                    if (roof == "open") { top = ground + Storey; storeys = 2; }
                    if (roof == "parapet")
                    {
                        var area = room.Width * room.Depth;
                        var u = H(14, r);
                        if (u < _s.Dome && area > 140f) roof = "dome";
                        else if ((u -= _s.Dome) < _s.Shanty) roof = "shanties";
                        else if ((u -= _s.Shanty) < _s.Garden) roof = "garden";
                        else if ((u -= _s.Garden) < _s.Billboard) roof = "billboard";
                        else if ((u -= _s.Billboard) < _s.Tanks) roof = "tanks";
                    }
                    var crest = top + (roof == "shack" ? 0.4f : Parapet);
                    _c.Blocks.Add(new Block { Room = r, Storeys = storeys, Ground = ground, Top = top, Crest = crest, Roof = roof, Body = shack ? room.Wall : body, Tint = tint, Shack = shack });
                }
            }

            // --- walls -----------------------------------------------------------------------------------------------

            /// <summary>The room either side of a wall at its middle (A: the left of A→B, B the right), −1 outside or wall.</summary>
            private (int A, int B) Sides(PlacePlan.Wall w)
            {
                var f = new Frame(w.Ax, w.Az, w.Bx, w.Bz, 0, 0);
                var (mx, mz) = f.At(f.Len / 2, 0);
                int Room(float x, float z) { var (i, j) = TileAt(x, z); return In(i, j) ? _p.RoomAt[j * _p.Columns + i] : -1; }
                return (Room(mx - f.Nx * PlacePlan.Tile, mz - f.Nz * PlacePlan.Tile), Room(mx + f.Nx * PlacePlan.Tile, mz + f.Nz * PlacePlan.Tile));
            }

            private static string WallKey(string kind) => kind switch
            {
                "concrete" => "concrete", "brick" => "brick", "metal" => "metal", "wood" => "planks", "adobe" => "painted", _ => "scrap",
            };

            /// <summary>The map's border as authored (<see cref="RimTiles"/>), raised as the backs of the buildings beyond,
            /// facing in: runs along each side, a wall each.</summary>
            private void Rims()
            {
                if (_map?.Layout == null) return;
                var rim = RimTiles(_map);
                int rows = _map.Layout.Count, cols = _map.Layout.Max(r => r.Length);
                TileDef At(int i, int j) => _map.Legend.TryGetValue(_map.Layout[j][i].ToString(), out var d) ? d : null;
                var salt = 5000;
                foreach (var side in new[] { 0, 1, 2, 3 })
                {
                    var n = side < 2 ? cols : rows;
                    var k = 0;
                    while (k < n)
                    {
                        (int I, int J) T(int q) => side switch { 0 => (q, 0), 1 => (q, rows - 1), 2 => (0, q), _ => (cols - 1, q) };
                        bool R(int q) { var (i, j) = T(q); return i < _map.Layout[j].Length && rim[j * cols + i]; }
                        if (!R(k)) { k++; continue; }
                        var e = k;
                        while (e + 1 < n && R(e + 1)) e++;
                        var kinds = Enumerable.Range(k, e - k + 1).Select(q => At(T(q).I, T(q).J)).ToList();
                        var (ax, az) = _p.Centre(T(k).I, T(k).J); var (bx, bz) = _p.Centre(T(e).I, T(e).J);
                        if (e > k)
                        {
                            var w = new PlacePlan.Wall
                            {
                                Kind = kinds.GroupBy(d => d.Wall).OrderByDescending(g => g.Count()).First().Key,
                                Height = (float)Math.Max(PlacePlan.Storey, kinds.Max(d => d.WallHeight ?? 2.6)),
                                Ax = ax, Az = az, Bx = bx, Bz = bz,
                            };
                            Wall(w, salt++, true);
                        }
                        k = e + 1;
                    }
                }
            }

            private void Wall(PlacePlan.Wall w, int wi, bool rim)
            {
                var room = w.Room >= 0 ? _p.Rooms[w.Room] : null;
                var block = room != null ? _c.BlockOf(room.Index) : null;
                var t = Thickness(w.Kind);
                var exterior = w.Exterior && block != null;
                Frame f;
                if (rim)
                {
                    // the map's border: the backs of the buildings beyond, facing in
                    var mx = (w.Ax + w.Bx) / 2; var mz = (w.Az + w.Bz) / 2;
                    float nx = 0, nz = 0;
                    if (Math.Abs(w.Ax - w.Bx) < 0.01f) nx = mx > 0 ? -1 : 1; else nz = mz > 0 ? -1 : 1;
                    f = new Frame(w.Ax, w.Az, w.Bx, w.Bz, nx, nz);
                }
                else f = new Frame(w.Ax, w.Az, w.Bx, w.Bz, w.OutX, w.OutZ);
                _building = exterior ? room.Index : -1;
                var len = f.Len;
                var h = w.Height;
                var lift = FloorTop(room);
                var openings = w.Openings.OrderBy(o => o.At).Select(o => new PlacePlan.Opening
                {
                    Kind = o.Kind, At = o.At, Width = o.Width,
                    Sill = o.Sill + lift, Top = o.Kind == PlacePlan.OpeningKind.Gate ? o.Top : o.Top + lift,
                }).ToList();
                if (w.Kind == "fence") { _building = room?.Index ?? -1; Grating(f, w, openings, room); _building = -1; return; }
                var shack = w.Kind == "metal" || w.Kind == "scrap";
                var key = exterior && !shack ? block.Body : WallKey(w.Kind);
                var tint = exterior && !shack ? block.Tint : rim ? Pick(_s.Facades, H(20, wi)).Tint : shack ? White : _s.Interior;
                if (rim) key = Pick(_s.Facades, H(20, wi)).Key;
                var top = exterior ? block.Top : h;
                var party = false;
                string partyKey = null; var partyTint = White;
                if (!w.Exterior && w.Room >= 0)
                {
                    // a wall between two buildings stands to the taller one's top, plain
                    var (sa, sb) = Sides(w);
                    var ba = sa >= 0 ? _c.BlockOf(sa) : null; var bb = sb >= 0 ? _c.BlockOf(sb) : null;
                    if (ba != null && bb != null && sa != sb)
                    {
                        party = true;
                        top = Math.Max(ba.Top, bb.Top);
                        partyKey = (ba.Top >= bb.Top ? ba : bb).Body;
                        partyTint = (ba.Top >= bb.Top ? ba : bb).Tint;
                        if (partyKey == "metal" || partyKey == "scrap") { partyKey = "concrete"; partyTint = _s.Interior; }
                        _building = ba.Top >= bb.Top ? sa : sb;
                    }
                }

                // the ground storey, openings cut: outside skin in the building's colour, inside skin plain
                void Body(float s0, float s1, float y0, float y1)
                {
                    if (s1 - s0 < 0.01f || y1 - y0 < 0.01f) return;
                    if (shack)
                    {
                        // mismatched sheets a metre wide, ragged on top
                        var sheets = new[] { "scrap", "tin", "rust", w.Kind == "metal" ? "metal" : "scrap" };
                        for (var s = s0; s < s1 - 0.01f; s += 1f)
                        {
                            var e = Math.Min(s1, s + 1f);
                            var k = (int)(H(21, wi, (int)(s * 10)) * sheets.Length);
                            var ragged = y1 >= h - 0.01f && (block == null || block.Storeys == 1) ? (H(22, wi, (int)(s * 10)) - 0.7f) * 0.25f : 0f;
                            var sheetTint = w.Kind == "metal" ? Pick(_s.Facades, H(23, wi, (int)(s * 10))).Tint : White;
                            On(f, s, e, y0, y1 + ragged, (H(24, wi, (int)(s * 10)) - 0.5f) * 0.05f, 0.05f, sheets[k], sheets[k] == "metal" ? sheetTint : White);
                        }
                        return;
                    }
                    if (exterior || rim)
                    {
                        On(f, s0, s1, y0, y1, t / 4, t / 2, key, tint);
                        On(f, s0, s1, y0, y1, -t / 4, t / 2, rim ? key : "painted", rim ? tint : _s.Interior, 0.2f);
                    }
                    else On(f, s0, s1, y0, y1, 0, t, key, tint);
                }
                var cur = -t / 2;
                foreach (var o in openings)
                {
                    float l = o.At - o.Width / 2, r = o.At + o.Width / 2;
                    Body(cur, l, 0, h);
                    Body(l, r, o.Top, h);
                    if (o.Kind == PlacePlan.OpeningKind.Window) Body(l, r, 0, o.Sill);
                    cur = r;
                }
                Body(cur, len + t / 2, 0, h);
                if (shack)
                {
                    // the frame: a steel post every two metres (never in a doorway) and either side of a door
                    bool InDoor(float at) => openings.Any(o => o.Kind != PlacePlan.OpeningKind.Window && Math.Abs(o.At - at) < o.Width / 2 + 0.12f);
                    for (var s = 0f; s <= len + 0.01f; s += 2f) if (!InDoor(s)) On(f, s - 0.04f, s + 0.04f, 0, h, -0.07f, 0.08f, "steel", _s.Trim);
                    foreach (var o in openings.Where(o => o.Kind != PlacePlan.OpeningKind.Window))
                        foreach (var side in new[] { -1f, 1f })
                        {
                            var at = o.At + side * (o.Width / 2 + 0.06f);
                            if (at > 0.05f && at < len - 0.05f) On(f, at - 0.04f, at + 0.04f, 0, h, -0.07f, 0.08f, "steel", _s.Trim);
                        }
                    On(f, -t / 2, len + t / 2, h - 0.1f, h, -0.07f, 0.08f, "steel", _s.Trim);
                }

                // the storeys above, on the outside of a building and the city's border
                if ((exterior && block.Storeys > 1 && !block.Shack) || (exterior && block.Roof == "open"))
                    Upper(f, wi, t, h, block.Top, key, tint, block, false);
                else if (exterior && block.Shack && block.Storeys > 1)
                    ShackUpper(f, wi, h, block);
                else if (rim && h >= 3.5f && RimFacing(f))
                    Upper(f, wi, t, h, h + (_s.RimStoreys - 1) * Storey, key, tint, null, true);
                else if (party && top > h + 0.05f)
                    On(f, -t / 2, len + t / 2, h, top + Parapet, 0, t, partyKey, partyTint);
                else if (exterior && !block.Shack && block.Storeys == 1)
                    Parapets(f, wi, t, block.Top, key, tint, true);

                if (!(exterior || rim)) { _building = -1; return; }
                // the ground storey's outside: a plinth, frames and panes, shutter boxes over doors, a sign over the
                // door, an awning, a cornice
                var street = Street(f.At(len / 2, 3f).X, f.At(len / 2, 3f).Z);
                if (!shack) On(f, -t / 2 - 0.02f, len + t / 2 + 0.02f, 0, 0.32f, t / 2 + 0.02f, 0.06f, "concrete", Darker(tint, 0.75f));
                if (rim && RimFacing(f))
                    for (var s = 1f; s + 2.4f <= len - 0.5f; s += 3.4f)
                    {
                        var u = H(39, wi, (int)(s * 10));
                        if (u < 0.45f) Light(f, s, s + 2.4f, 0.4f, Math.Min(h - 0.5f, 2.6f), t / 2 + 0.02f, 0f, Pattern.Pane, Pick(_s.Rooms, u), u < 0.45f * _s.ShopLit ? 1f : 0.1f);
                        else if (u < 0.9f) On(f, s, s + 2.4f, 0.32f, Math.Min(h - 0.5f, 2.6f), t / 2 + 0.03f, 0.04f, "metal", Pick(_s.Facades, u).Tint);
                    }
                for (var k = 0; k < openings.Count; k++)
                {
                    var o = openings[k];
                    float l = o.At - o.Width / 2, r = o.At + o.Width / 2;
                    if (o.Kind == PlacePlan.OpeningKind.Window)
                    {
                        var lit = H(30, wi, k) < _s.ShopLit ? 1f : 0.15f;
                        Light(f, l, r, o.Sill, o.Top, t / 2 - 0.08f, 0f, Pattern.Pane, Pick(_s.Rooms, H(31, wi, k)), lit);
                        On(f, l - 0.06f, r + 0.06f, o.Sill - 0.06f, o.Sill, t / 2 + 0.03f, 0.1f, _s.TrimKey, _s.Trim);
                        On(f, l - 0.06f, r + 0.06f, o.Top, o.Top + 0.08f, t / 2 + 0.01f, 0.06f, _s.TrimKey, _s.Trim);
                    }
                    else
                    {
                        // a steel frame and the shutter's box over the doorway, beside and above it, never in it
                        On(f, l - 0.08f, l, 0, o.Top, t / 2 + 0.02f, 0.08f, _s.TrimKey, _s.Trim);
                        On(f, r, r + 0.08f, 0, o.Top, t / 2 + 0.02f, 0.08f, _s.TrimKey, _s.Trim);
                        if (o.Top + 0.32f < h - 0.05f) On(f, l - 0.1f, r + 0.1f, o.Top, o.Top + 0.3f, t / 2 + 0.12f, 0.24f, "metal", _s.Trim);
                        if (street && o.Kind == PlacePlan.OpeningKind.Door && !shack)
                        {
                            var fy0 = Math.Max(o.Top + 0.38f, StreetClear); var fy1 = Math.Min(fy0 + 0.6f, h - 0.12f);
                            if (H(32, wi, k) < _s.Fascia && fy1 - fy0 > 0.3f)
                                Light(f, l - 0.5f, r + 0.5f, fy0, fy1, t / 2 + 0.08f, 0.12f, Pattern.Sign, Pick(_s.Neon, H(33, wi, k))).Hung = true;
                            else if (H(34, wi, k) < _s.Awning) Awning(f, o.At, Math.Min(o.Width + 1.4f, len - 0.4f), Math.Max(o.Top + 0.55f, StreetClear + 0.32f), t, wi * 31 + k);
                        }
                    }
                }
                if (block != null && block.Storeys > 1 && H(35, wi) < _s.Cornice) On(f, -t / 2 - 0.06f, len + t / 2 + 0.06f, h - 0.04f, h + 0.16f, t / 2 + 0.05f, 0.1f, "concrete", Darker(tint, 0.9f));
                if (street && !shack && H(36, wi) < _s.Strip && len > 3f) Light(f, 0.2f, len - 0.2f, h + 0.18f, h + 0.24f, t / 2 + 0.1f, 0.05f, Pattern.Tube, Pick(_s.Neon, H(37, wi)));
                if (H(38, wi) < _s.Conduit && len > 4f) On(f, 0.3f, len - 0.3f, h - 0.5f, h - 0.44f, t / 2 + 0.04f, 0.06f, "steel", C(0x3a3a3a));
                _building = -1;
            }

            /// <summary>A wall of bars (a cell's, a cage's): grating panels from the floor to its top between steel posts, its
            /// doors left open.</summary>
            private void Grating(Frame f, PlacePlan.Wall w, List<PlacePlan.Opening> openings, PlacePlan.Room room)
            {
                var floor = FloorTop(room);
                var top = w.Height;
                bool InDoor(float s0, float s1) => openings.Any(o => o.Kind != PlacePlan.OpeningKind.Window && s1 > o.At - o.Width / 2 && s0 < o.At + o.Width / 2);
                for (var s = -0.1f; s < f.Len + 0.1f - 0.01f; s += 1.5f)
                {
                    var e = Math.Min(f.Len + 0.1f, s + 1.5f);
                    if (InDoor(s, e))
                    {
                        // round a door: the panel over it and either side
                        foreach (var o in openings.Where(o => o.Kind != PlacePlan.OpeningKind.Window && e > o.At - o.Width / 2 && s < o.At + o.Width / 2))
                        {
                            On(f, s, o.At - o.Width / 2 - 0.05f, floor, top, 0, 0.03f, "grate", C(0x8a8a86), 0.4f);
                            On(f, o.At + o.Width / 2 + 0.05f, e, floor, top, 0, 0.03f, "grate", C(0x8a8a86), 0.4f);
                            On(f, o.At - o.Width / 2, o.At + o.Width / 2, o.Top, top, 0, 0.03f, "grate", C(0x8a8a86), 0.4f);
                        }
                        continue;
                    }
                    On(f, s, e, floor, top, 0, 0.03f, "grate", C(0x8a8a86), 0.4f);
                }
                for (var s = 0f; s <= f.Len + 0.01f; s += 1.5f)
                    if (!InDoor(s - 0.05f, s + 0.05f)) On(f, s - 0.04f, s + 0.04f, 0, top, 0, 0.08f, "steel", C(0x4a4a48), 0.4f);
                On(f, -0.1f, f.Len + 0.1f, top - 0.06f, top, 0, 0.08f, "steel", C(0x4a4a48), 0.4f);
            }

            /// <summary>A border wall faces in onto open ground (not onto a mass or a building behind it).</summary>
            private bool RimFacing(Frame f)
            {
                var open = 0; var n = 0;
                for (var s = 1f; s < f.Len; s += PlacePlan.Tile)
                {
                    var (x, z) = f.At(s, PlacePlan.Tile);
                    n++;
                    if (Street(x, z)) open++;
                }
                return n > 0 && open * 2 >= n;
            }

            private static Rgb Darker(Rgb c, float k) => new(c.R * k, c.G * k, c.B * k);

            /// <summary>An awning over a doorway: canvas sloping out and down, its low edge over <see cref="StreetClear"/>.</summary>
            private void Awning(Frame f, float at, float width, float y, float t, int salt)
            {
                const float depth = 1.15f, pitch = 16f;
                var drop = depth * (float)Math.Sin(pitch * Math.PI / 180);
                if (y - drop < StreetClear) y = StreetClear + drop;
                var (x, z) = f.At(at, t / 2 + depth / 2 * (float)Math.Cos(pitch * Math.PI / 180));
                var tint = Pick(_s.Canvas, H(40, salt));
                var aw = Free("canvas", x, y - drop / 2, z, width, 0.03f, depth, f.Yaw, tint, 0.4f, pitch);
                aw.Bottom = true; aw.Hung = true;
                // its frame: two arms from the wall
                foreach (var side in new[] { -1f, 1f })
                {
                    var (ax, az) = f.At(at + side * (width / 2 - 0.05f), t / 2 + depth / 2);
                    Free("steel", ax, y - drop / 2 - 0.05f, az, 0.03f, 0.03f, depth, f.Yaw, _s.Trim, 0.4f, pitch);
                }
            }

            /// <summary>The storeys above the ground storey on an outer wall: bays of windows (frames, sills, lit panes),
            /// shutters, balconies, AC units, laundry, blank and patched bays; blade signs, a screen, neon strips, a
            /// downpipe; the parapet. <paramref name="rim"/>: the map's border, the backs of buildings beyond.</summary>
            private void Upper(Frame f, int wi, float t, float ground, float top, string key, Rgb tint, Block block, bool rim)
            {
                var len = f.Len;
                var storeys = Math.Max(1, (int)Math.Round((top - ground) / Storey));
                var open = block != null && block.Roof == "open";
                var street = !rim && Street(f.At(len / 2, 3f).X, f.At(len / 2, 3f).Z);
                // bays: aligned up the wall, a little irregular in the poorer districts
                var pitch = _s.BayPitch;
                var n = Math.Max(0, (int)Math.Floor((len - 1.0f) / pitch));
                var bays = new List<(float At, float W)>();
                var start = (len - n * pitch) / 2 + pitch / 2;
                for (var k = 0; k < n; k++)
                {
                    var at = start + k * pitch + (H(50, wi, k) - 0.5f) * _s.BayJitter * pitch * 0.4f;
                    var bw = Math.Min(pitch - 0.5f, _s.Window * (0.85f + 0.3f * H(51, wi, k)));
                    bays.Add((at, bw));
                }
                // a blade sign's column between two bays (or at the wall's end), a screen over four bays
                var sign = -1;
                if (street && !open && n >= 2 && H(52, wi) < _s.Blade) sign = 1 + (int)(H(53, wi) * (n - 1));
                var screen = -1;
                if (street && !open && n >= 4 && storeys >= 2 && H(54, wi) < _s.Screen) screen = (int)(H(55, wi) * (n - 2));
                for (var st = 0; st < storeys; st++)
                {
                    var y0 = ground + st * Storey;
                    var y1 = Math.Min(top, y0 + Storey);
                    if (y1 - y0 < 0.5f) continue;
                    var sill = y0 + 0.9f; var head = y0 + 2.35f;
                    if (y1 - y0 < 1.6f) { On(f, -t / 2, len + t / 2, y0, y1, 0, t, key, tint); continue; }
                    // what each bay is on this storey
                    var kinds = new string[n];
                    for (var k = 0; k < n; k++)
                    {
                        var u = H(56, wi * 7 + st, k);
                        string kind = "window";
                        if (screen >= 0 && k >= screen && k < screen + 2 && st < 2) kind = "screen";
                        else if ((u -= _s.Blank) < 0) kind = "blank";
                        else if ((u -= _s.Shutter) < 0) kind = "shutter";
                        else if ((u -= _s.Balcony) < 0 && !rim && !open && (sign < 0 || (k != sign && k != sign - 1))) kind = "balcony";
                        else if ((u -= _s.Ac) < 0) kind = "ac";
                        kinds[k] = kind;
                    }
                    // the wall: bands under the sills (not under a balcony's door) and over the heads, piers between the bays
                    head = Math.Min(head, y1 - 0.25f);
                    if (head - sill < 0.6f) { On(f, -t / 2, len + t / 2, y0, y1, 0, t, key, tint); continue; }
                    var under = -t / 2;
                    for (var k = 0; k < n; k++)
                    {
                        if (kinds[k] != "balcony") continue;
                        var (at, bw) = bays[k];
                        On(f, under, at - bw / 2, y0, sill, 0, t, key, tint);
                        under = at + bw / 2;
                    }
                    On(f, under, len + t / 2, y0, sill, 0, t, key, tint);
                    On(f, -t / 2, len + t / 2, head, y1, 0, t, key, tint);
                    var cur = -t / 2;
                    for (var k = 0; k < n; k++)
                    {
                        var (at, bw) = bays[k];
                        var kind = kinds[k];
                        float l = at - bw / 2, r = at + bw / 2;
                        if (kind == "blank" || kind == "screen") continue;
                        On(f, cur, l, sill, head, 0, t, key, tint);
                        cur = r;
                    }
                    On(f, cur, len + t / 2, sill, head, 0, t, key, tint);
                    for (var k = 0; k < n; k++)
                    {
                        var (at, bw) = bays[k];
                        float l = at - bw / 2, r = at + bw / 2;
                        var kind = kinds[k];
                        var room = Pick(_s.Rooms, H(57, wi * 7 + st, k));
                        var lit = H(58, wi * 7 + st, k) < _s.Lit ? 1f : 0f;
                        switch (kind)
                        {
                            case "blank":
                                // a bricked-up bay, a patch in another colour
                                On(f, l - 0.02f, r + 0.02f, sill, head, 0, t, key, H(59, wi * 7 + st, k) < _s.Patch * 2 ? Pick(_s.Facades, H(60, wi, k)).Tint : tint);
                                break;
                            case "screen":
                                if (k == screen && st == 0)
                                {
                                    var (sa, sw) = bays[k]; var (sb, bw2) = bays[Math.Min(n - 1, k + 1)];
                                    float s0 = sa - sw / 2 - 0.2f, s1 = sb + bw2 / 2 + 0.2f;
                                    var sy1 = Math.Min(top - 0.3f, y0 + Storey * 2 - 0.3f);
                                    On(f, s0, s1, sill, sy1, 0, t, key, tint);
                                    On(f, s0 - 0.08f, s1 + 0.08f, sill - 0.08f, sy1 + 0.08f, t / 2 + 0.05f, 0.1f, "steel", C(0x202224));
                                    Light(f, s0, s1, sill, sy1, t / 2 + 0.11f, 0f, Pattern.Screen, Pick(_s.Neon, H(61, wi)));
                                }
                                break;
                            case "shutter":
                                On(f, l, r, sill, head, t / 2 - 0.06f, 0.04f, "metal", Pick(_s.Facades, H(62, wi, k)).Tint);
                                On(f, l - 0.05f, r + 0.05f, sill - 0.05f, sill, t / 2 + 0.03f, 0.1f, _s.TrimKey, _s.Trim);
                                break;
                            default:
                            {
                                var bottom = kind == "balcony" ? y0 + 0.05f : sill;
                                if (open) Light(f, l, r, bottom, head, 0f, 0.04f, Pattern.Pane, room, lit * 0.6f);
                                else Light(f, l, r, bottom, head, t / 2 - 0.1f, 0f, Pattern.Pane, room, lit);
                                // the sill
                                On(f, l - 0.06f, r + 0.06f, bottom - 0.05f, bottom, t / 2 + 0.03f, 0.1f, _s.TrimKey, _s.Trim);
                                if (kind == "balcony") Balcony(f, at, bw, y0, t, wi * 31 + st * 7 + k);
                                if (kind == "ac") On(f, at - 0.38f, at + 0.38f, sill - 0.62f, sill - 0.12f, t / 2 + 0.24f, 0.46f, "metal", C(0xd8d6d0));
                                if (kind == "window" && H(63, wi * 7 + st, k) < _s.Laundry * 0.5f) Laundry(f, at, bw + 0.6f, sill - 0.1f, t, wi * 37 + st * 5 + k);
                                break;
                            }
                        }
                    }
                    if (st > 0 && H(64, wi, st) < _s.Cornice * 0.5f)
                        On(f, -t / 2 - 0.04f, len + t / 2 + 0.04f, y0 - 0.05f, y0 + 0.08f, t / 2 + 0.04f, 0.08f, "concrete", Darker(tint, 0.9f));
                }
                // a blade sign hung between two bays, up two storeys
                if (sign >= 1)
                {
                    var at = (bays[sign - 1].At + bays[sign].At) / 2;
                    var y0 = ground + 0.4f; var y1 = Math.Min(top - 0.2f, y0 + Math.Min(7f, 2.2f + H(65, wi) * 4.5f));
                    if (y1 - y0 > 1.2f)
                    {
                        var (x, z) = f.At(at, t / 2 + 0.55f);
                        var tint2 = Pick(_s.Neon, H(66, wi));
                        // edge-on to the street (its own x out from the wall): the light both sides, a dark case round it
                        Free("steel", x, (y0 + y1) / 2, z, 0.9f, y1 - y0 + 0.12f, 0.1f, f.Yaw + 90f, C(0x202020), 0.3f);
                        var face = Free("light", x, (y0 + y1) / 2, z, 0.82f, y1 - y0, 0.16f, f.Yaw + 90f, tint2, 1f);
                        face.Pattern = Pattern.Sign; face.Hung = true;
                        foreach (var y in new[] { y0 + 0.3f, y1 - 0.3f }) On(f, at - 0.04f, at + 0.04f, y - 0.04f, y + 0.04f, t / 2 + 0.05f, 0.12f, "steel", _s.Trim);
                    }
                }
                // neon up the corners, a downpipe at one end
                if (!rim && street && H(67, wi) < _s.Strip * 0.6f)
                    foreach (var s in new[] { 0.05f, len - 0.05f })
                        Light(f, s - 0.03f, s + 0.03f, ground + 0.2f, top, t / 2 + 0.06f, 0.06f, Pattern.Tube, Pick(_s.Neon, H(68, wi)));
                if (H(69, wi) < _s.Pipe && len > 2f)
                {
                    var s = H(70, wi) < 0.5f ? 0.25f : len - 0.25f;
                    var (x, z) = f.At(s, t / 2 + 0.1f);
                    Prism("steel", x, 0f, z, 0.12f, top, C(0x6a6a66), 6);
                }
                // the parapet, its coping, a lit strip along the top
                Parapets(f, wi, t, top, key, tint, !rim);
            }

            /// <summary>A parapet along a wall's top, its coping, a lit strip along it in the districts that have them.</summary>
            private void Parapets(Frame f, int wi, float t, float top, string key, Rgb tint, bool lit)
            {
                var len = f.Len;
                On(f, -t / 2, len + t / 2, top, top + Parapet, t / 2 - 0.12f, 0.24f, key, tint);
                On(f, -t / 2 - 0.03f, len + t / 2 + 0.03f, top + Parapet, top + Parapet + 0.06f, t / 2 - 0.12f, 0.32f, "concrete", Darker(tint, 0.85f), 0.3f);
                if (lit && H(71, wi) < _s.Crown && len > 3f)
                    Light(f, 0.1f, len - 0.1f, top + Parapet - 0.16f, top + Parapet - 0.1f, t / 2 + 0.01f, 0.05f, Pattern.Tube, Pick(_s.Neon, H(72, wi)));
            }

            private void Balcony(Frame f, float at, float bw, float y0, float t, int salt)
            {
                const float depth = 1.05f;
                var w = bw + 0.7f;
                var poor = _s.Grime > 0.5f;
                var slabPiece = On(f, at - w / 2, at + w / 2, y0 - 0.12f, y0 + 0.04f, t / 2 + depth / 2, depth, "concrete", Darker(_s.Interior, 0.9f));
                slabPiece.Bottom = true; slabPiece.Hung = true;
                var u = H(80, salt);
                if (poor && u < 0.35f)
                {
                    // closed in with sheet, a window in it
                    On(f, at - w / 2, at + w / 2, y0 + 0.04f, y0 + 1.0f, t / 2 + depth - 0.03f, 0.04f, Pick(new[] { "tin", "scrap", "rust" }, H(81, salt)), White);
                    Light(f, at - bw / 2, at + bw / 2, y0 + 1.0f, y0 + 2.2f, t / 2 + depth - 0.03f, 0f, Pattern.Pane, Pick(_s.Rooms, H(82, salt)), H(83, salt) < _s.Lit ? 0.8f : 0f);
                    On(f, at - w / 2, at + w / 2, y0 + 2.2f, y0 + 2.4f, t / 2 + depth / 2, depth, "tin", White).Bottom = true;
                    return;
                }
                // a rail: solid on the poorer, glass on the Crown and the Precinct, a top rail
                if (_s.Grime < 0.35f) Light(f, at - w / 2, at + w / 2, y0 + 0.04f, y0 + 1.0f, t / 2 + depth - 0.02f, 0.03f, Pattern.Pane, White, 0f);
                else On(f, at - w / 2, at + w / 2, y0 + 0.04f, y0 + 0.95f, t / 2 + depth - 0.03f, 0.05f, poor ? Pick(new[] { "metal", "scrap", "concrete" }, H(84, salt)) : "metal", poor ? Pick(_s.Facades, H(85, salt)).Tint : _s.Trim);
                On(f, at - w / 2, at + w / 2, y0 + 0.98f, y0 + 1.04f, t / 2 + depth - 0.02f, 0.06f, _s.TrimKey, _s.Trim);
                if (H(86, salt) < _s.Laundry) Laundry(f, at, w, y0 + 1.9f, t + depth * 1.4f, salt);
                if (H(87, salt) < 0.3f) Prism("steel", f.At(at - w / 2 + 0.3f, t / 2 + 0.4f).X, y0 + 0.04f, f.At(at - w / 2 + 0.3f, t / 2 + 0.4f).Z, 0.35f, 0.5f, Pick(_s.Canvas, H(88, salt)), 6);
            }

            /// <summary>A washing line along the wall with a few things hung on it.</summary>
            private void Laundry(Frame f, float at, float w, float y, float off, int salt)
            {
                var o = Math.Min(MaxProject - 0.05f, off / 2 + 0.35f);
                On(f, at - w / 2, at + w / 2, y - 0.01f, y + 0.01f, o, 0.015f, "steel", C(0x2a2a2a), 0.3f).Hung = true;
                var n = 2 + (int)(H(90, salt) * 3);
                for (var k = 0; k < n; k++)
                {
                    var s = at - w / 2 + (k + 0.5f) * w / n + (H(91, salt, k) - 0.5f) * 0.2f;
                    var cw = 0.3f + H(92, salt, k) * 0.35f; var ch = 0.35f + H(93, salt, k) * 0.45f;
                    On(f, s - cw / 2, s + cw / 2, y - ch, y, o, 0.02f, "canvas", Pick(_s.Canvas, H(94, salt, k)), 0.3f).Hung = true;
                }
            }

            /// <summary>A shack's second storey: a box of sheet stacked on it, a little off its walls (once per building, from
            /// its first outer wall).</summary>
            private readonly HashSet<int> _stacked = new();
            private void ShackUpper(Frame f, int wi, float h, Block b)
            {
                if (!_stacked.Add(b.Room)) return;
                var room = _p.Rooms[b.Room];
                var inset = 0.3f + H(100, b.Room) * 0.6f;
                float x0 = room.X0 + inset, x1 = room.X1 - inset * 0.5f, z0 = room.Z0 + inset * 0.7f, z1 = room.Z1 - inset;
                if (x1 - x0 < 2f || z1 - z0 < 2f) return;
                var top = h + 2.5f;
                b.Top = top; b.Crest = top + 0.5f;
                var sheets = new[] { "tin", "scrap", "rust", "metal", "planks" };
                // its walls of sheet, its tin roof, a lit window, a ladder down
                foreach (var (ax, az, bx, bz, nx, nz) in new[] { (x0, z1, x1, z1, 0f, 1f), (x1, z0, x0, z0, 0f, -1f), (x0, z0, x0, z1, -1f, 0f), (x1, z1, x1, z0, 1f, 0f) })
                {
                    var g = new Frame(ax, az, bx, bz, nx, nz);
                    for (var s = 0f; s < g.Len - 0.01f; s += 1.1f)
                    {
                        var e = Math.Min(g.Len, s + 1.1f);
                        var k = (int)(H(101, b.Room, (int)(s * 10) + (int)(nx * 100 + nz * 1000)) * sheets.Length);
                        On(g, s, e, h, top + (H(102, b.Room, (int)(s * 10)) - 0.5f) * 0.15f, 0, 0.05f, sheets[k], sheets[k] == "metal" ? Pick(_s.Facades, H(103, b.Room, k)).Tint : White);
                    }
                    if (g.Len > 2.4f) Light(g, g.Len / 2 - 0.45f, g.Len / 2 + 0.45f, h + 1.0f, h + 1.8f, 0.04f, 0f, Pattern.Pane, Pick(_s.Rooms, H(104, b.Room)), H(105, b.Room) < _s.Lit ? 1f : 0f);
                }
                Free("tin", (x0 + x1) / 2, top + 0.15f, (z0 + z1) / 2, x1 - x0 + 0.5f, 0.04f, z1 - z0 + 0.5f, 0, White, -1, 6f);
                // its floor over the shack below
                Free("plate", (x0 + x1) / 2, h + 0.03f, (z0 + z1) / 2, room.Width, 0.06f, room.Depth, 0, White);
            }

            // --- roofs -----------------------------------------------------------------------------------------------

            /// <summary>The roof's rectangles: the room's box for a rectangular room, else its tiles' rows (each run reaching
            /// the walls' centrelines).</summary>
            private List<(float X0, float Z0, float X1, float Z1)> RoofRects(PlacePlan.Room room)
            {
                if (room.Rectangular) return new List<(float, float, float, float)> { (room.X0, room.Z0, room.X1, room.Z1) };
                var rects = new List<(float, float, float, float)>();
                for (var j = 0; j < _p.Rows; j++)
                {
                    var i = 0;
                    while (i < _p.Columns)
                    {
                        if (_p.RoomAt[j * _p.Columns + i] != room.Index) { i++; continue; }
                        var e = i;
                        while (e + 1 < _p.Columns && _p.RoomAt[j * _p.Columns + e + 1] == room.Index) e++;
                        var (ax, az) = _p.Centre(i, j); var (bx, _) = _p.Centre(e, j);
                        float x0 = ax - PlacePlan.Tile / 2, x1 = bx + PlacePlan.Tile / 2, z0 = az - PlacePlan.Tile / 2, z1 = az + PlacePlan.Tile / 2;
                        // reach the walls' centrelines where a wall closes the run
                        if (!In(i - 1, j) || _p.Ground[j * _p.Columns + i - 1] == null && _p.RoomAt[j * _p.Columns + i - 1] < 0) x0 -= PlacePlan.Tile;
                        if (!In(e + 1, j) || _p.Ground[j * _p.Columns + e + 1] == null && _p.RoomAt[j * _p.Columns + e + 1] < 0) x1 += PlacePlan.Tile;
                        if (In(i, j - 1) && _p.RoomAt[(j - 1) * _p.Columns + i] != room.Index) z1 += PlacePlan.Tile;
                        if (In(i, j + 1) && _p.RoomAt[(j + 1) * _p.Columns + i] != room.Index) z0 -= PlacePlan.Tile;
                        rects.Add((x0, z0, x1, z1));
                        i = e + 1;
                    }
                }
                return rects;
            }

            private void Roof(Block b)
            {
                var room = _p.Rooms[b.Room];
                if (b.Roof == "open" || b.Shack && b.Storeys > 1) return;
                var t = Thickness(room.Wall);
                if (b.Shack)
                {
                    // a shack's tin lean-to over its walls; a shed's in bays (a sawtooth), each rising a little over its width
                    var bays = Math.Max(1, (int)Math.Ceiling(room.Depth / 6f));
                    var bay = room.Depth / bays;
                    var rise = bay * (float)Math.Tan(7 * Math.PI / 180);
                    for (var k = 0; k < bays; k++)
                    {
                        var z = room.Z0 + (k + 0.5f) * bay;
                        Free(k % 3 == 2 ? "rust" : "tin", (room.X0 + room.X1) / 2, b.Top + 0.12f + rise / 2, z, room.Width + 0.5f, 0.04f, bay / (float)Math.Cos(7 * Math.PI / 180) + 0.15f, 0, White, -1, -7f).Bottom = true;
                        if (bays > 1 && k < bays - 1)
                            Free("light", (room.X0 + room.X1) / 2, b.Top + 0.12f + rise / 2, room.Z0 + (k + 1) * bay + 0.02f, room.Width, rise, 0f, 0f, C(0xd8e4e8), 0f).Pattern = Pattern.Pane;
                    }
                    b.Crest = b.Top + 0.2f + rise;
                    return;
                }
                var slab = b.Top - 0.05f;
                foreach (var (x0, z0, x1, z1) in RoofRects(room))
                    Free("slab", (x0 + x1) / 2, slab - 0.1f, (z0 + z1) / 2, x1 - x0 - t * 0.5f, 0.2f, z1 - z0 - t * 0.5f, 0, Darker(_s.Interior, 0.8f), Math.Min(1f, _s.Grime + 0.2f));
                // a non-rectangular room's roof furniture keeps to its biggest rectangle
                var rect = RoofRects(room).OrderByDescending(r => (r.X1 - r.X0) * (r.Z1 - r.Z0)).First();
                float ix0 = rect.X0 + t + 0.5f, ix1 = rect.X1 - t - 0.5f, iz0 = rect.Z0 + t + 0.5f, iz1 = rect.Z1 - t - 0.5f;
                if (ix1 - ix0 < 1.5f || iz1 - iz0 < 1.5f) return;
                var crest = b.Top + Parapet;
                var r = b.Room;
                var taken = new List<(float X0, float Z0, float X1, float Z1)>();
                bool Spot(float w, float d, int salt, out float x, out float z)
                {
                    for (var k = 0; k < 8; k++)
                    {
                        x = ix0 + w / 2 + H(110, r, salt * 8 + k) * Math.Max(0, ix1 - ix0 - w);
                        z = iz0 + d / 2 + H(111, r, salt * 8 + k) * Math.Max(0, iz1 - iz0 - d);
                        if (w > ix1 - ix0 || d > iz1 - iz0) break;
                        float ax = x - w / 2 - 0.4f, bx = x + w / 2 + 0.4f, az = z - d / 2 - 0.4f, bz = z + d / 2 + 0.4f;
                        if (taken.Any(q => ax < q.X1 && bx > q.X0 && az < q.Z1 && bz > q.Z0)) continue;
                        taken.Add((ax, az, bx, bz));
                        return true;
                    }
                    x = z = 0; return false;
                }
                var area = (ix1 - ix0) * (iz1 - iz0);
                // the stair's hut
                if (H(112, r) < _s.Stair && area > 20f && Spot(2.4f, 2.2f, 1, out var hx, out var hz))
                {
                    Free(b.Body, hx, slab + 1.25f, hz, 2.4f, 2.5f, 2.2f, 0, b.Tint);
                    Free("slab", hx, slab + 2.55f, hz, 2.6f, 0.1f, 2.4f, 0, Darker(_s.Interior, 0.8f));
                    Free("metal", hx, slab + 1.0f, hz + 1.11f, 0.9f, 2.0f, 0.04f, 0, _s.Trim);
                    crest = Math.Max(crest, slab + 2.6f);
                }
                switch (b.Roof)
                {
                    case "shanties":
                    {
                        var n = 1 + (int)(H(113, r) * Math.Min(3, area / 25f));
                        for (var k = 0; k < n; k++)
                        {
                            var w = 2.2f + H(114, r, k) * 1.4f; var d = 2.0f + H(115, r, k) * 1.2f;
                            if (!Spot(w, d, 10 + k, out var x, out var z)) continue;
                            var levels = H(116, r, k) < 0.35f ? 2 : 1;
                            for (var lv = 0; lv < levels; lv++)
                            {
                                var y0 = slab + lv * 2.4f;
                                var sw = w * (lv == 0 ? 1 : 0.8f); var sd = d * (lv == 0 ? 1 : 0.8f);
                                var sheets = new[] { "tin", "scrap", "rust", "planks", "metal" };
                                var key = sheets[(int)(H(117, r, k * 3 + lv) * sheets.Length)];
                                Free(key, x, y0 + 1.15f, z, sw, 2.3f, sd, 0, key == "metal" ? Pick(_s.Facades, H(119, r, k)).Tint : White);
                                Free("tin", x, y0 + 2.38f, z, sw + 0.4f, 0.04f, sd + 0.4f, 0, White, -1, 6f + lv * 3f).Bottom = true;
                                // a lit window and a door on the side the hash faces
                                var side = H(120, r, k) < 0.5f ? 1f : -1f;
                                var pane = Free("light", x, y0 + 1.4f, z + side * (sd / 2 + 0.01f), 0.6f, 0.5f, 0f, side > 0 ? 0 : 180, Pick(_s.Rooms, H(121, r, k)), H(122, r, k) < _s.Lit ? 1f : 0f);
                                pane.Pattern = Pattern.Pane; pane.Shape = Shape.Quad;
                                crest = Math.Max(crest, y0 + 2.5f);
                            }
                        }
                        break;
                    }
                    case "garden":
                    {
                        // planters in rows, green in them, a water butt
                        var rows = Math.Max(1, (int)((iz1 - iz0) / 1.8f));
                        for (var k = 0; k < rows; k++)
                        {
                            var z = iz0 + 0.6f + k * 1.8f;
                            var w = Math.Min(ix1 - ix0 - 0.6f, 4f + H(123, r, k) * 6f);
                            if (z > iz1 - 0.4f || w < 1f) continue;
                            var x = ix0 + 0.3f + w / 2;
                            Free("planks", x, slab + 0.2f, z, w, 0.4f, 0.9f, 0, White);
                            Free("soil", x, slab + 0.42f, z, w - 0.1f, 0.06f, 0.8f, 0, C(0x8aa060), 0.2f);
                            taken.Add((x - w / 2, z - 0.5f, x + w / 2, z + 0.5f));
                            if (k % 2 == 0) _c.Props.Add(new Prop { Kind = "shrub", X = x + (H(124, r, k) - 0.5f) * w * 0.6f, Y = slab + 0.45f, Z = z, Yaw = H(125, r, k) * 360f, Building = r });
                        }
                        if (Spot(0.9f, 0.9f, 30, out var tx, out var tz)) Prism("painted", tx, slab, tz, 0.8f, 1.0f, C(0x3a6aa0), 8);
                        break;
                    }
                    case "dome":
                    {
                        // a glass dome on a ring, its ribs
                        var d = Math.Min(ix1 - ix0, iz1 - iz0) * 0.85f;
                        float cx = (ix0 + ix1) / 2, cz = (iz0 + iz1) / 2;
                        Prism("concrete", cx, slab, cz, d + 0.4f, 0.4f, b.Tint, 16, 0.1f);
                        var rings = 5;
                        for (var k = 0; k < rings; k++)
                        {
                            var a0 = k / (float)rings * Math.PI / 2; var a1 = (k + 1) / (float)rings * Math.PI / 2;
                            var rr = (float)Math.Cos((a0 + a1) / 2) * d / 2;
                            var y0 = slab + 0.4f + (float)Math.Sin(a0) * d / 2; var y1 = slab + 0.4f + (float)Math.Sin(a1) * d / 2;
                            var p = Prism("light", cx, y0, cz, rr * 2, y1 - y0, C(0xe8f4ff), 16, 0.6f);
                            p.Pattern = Pattern.Pane;
                        }
                        crest = Math.Max(crest, slab + 0.4f + d / 2);
                        taken.Add((ix0, iz0, ix1, iz1));
                        break;
                    }
                    case "billboard":
                    {
                        // a lit board on the roof's street edge, on two legs, facing the street
                        var faces = new List<(float Ax, float Az, float Bx, float Bz, float Nx, float Nz)>
                        {
                            (ix0, iz1, ix1, iz1, 0, 1), (ix1, iz0, ix0, iz0, 0, -1), (ix0, iz0, ix0, iz1, -1, 0), (ix1, iz1, ix1, iz0, 1, 0),
                        };
                        var best = faces.OrderByDescending(e => Street((e.Ax + e.Bx) / 2 + e.Nx * 6, (e.Az + e.Bz) / 2 + e.Nz * 6) ? 1 : 0)
                            .ThenByDescending(e => Math.Abs(e.Bx - e.Ax) + Math.Abs(e.Bz - e.Az)).First();
                        var g = new Frame(best.Ax, best.Az, best.Bx, best.Bz, best.Nx, best.Nz);
                        var bw = Math.Min(g.Len - 0.4f, 4f + H(126, r) * 3f); var bh = 2.2f + H(127, r) * 1.6f;
                        if (bw > 2f)
                        {
                            var mid = g.Len / 2;
                            foreach (var side in new[] { -1f, 1f }) On(g, mid + side * bw * 0.35f - 0.06f, mid + side * bw * 0.35f + 0.06f, slab, slab + 1.0f + bh, -0.3f, 0.12f, "steel", _s.Trim);
                            On(g, mid - bw / 2 - 0.1f, mid + bw / 2 + 0.1f, slab + 0.9f, slab + 1.1f + bh, -0.2f, 0.12f, "steel", C(0x202224));
                            Light(g, mid - bw / 2, mid + bw / 2, slab + 1.0f, slab + 1.0f + bh, -0.13f, 0f, H(128, r) < 0.5f ? Pattern.Screen : Pattern.Sign, Pick(_s.Neon, H(129, r)));
                            crest = Math.Max(crest, slab + 1.1f + bh);
                            taken.Add((Math.Min(best.Ax, best.Bx) - 0.5f, Math.Min(best.Az, best.Bz) - 1f, Math.Max(best.Ax, best.Bx) + 0.5f, Math.Max(best.Az, best.Bz) + 1f));
                        }
                        break;
                    }
                }
                // the plant every roof carries, by the district
                var acs = (int)Math.Round(area / 30f * (_s.Ac + 0.15f));
                for (var k = 0; k < Math.Min(acs, 6); k++)
                    if (Spot(1.2f, 0.9f, 40 + k, out var ax, out var az))
                    {
                        Free("metal", ax, slab + 0.42f, az, 1.1f, 0.84f, 0.8f, (float)Math.Round(H(130, r, k)) * 90f, C(0xd8d8d2));
                        Prism("steel", ax, slab + 0.84f, az, 0.6f, 0.04f, C(0x2a2a2a), 8, 0.3f);
                    }
                if ((b.Roof == "tanks" || H(131, r) < _s.Tanks * 0.5f) && Spot(2.2f, 2.2f, 50, out var wx, out var wz))
                {
                    var d = 1.5f + H(132, r) * 0.7f; var th = 1.6f + H(133, r) * 1.0f;
                    foreach (var (dx, dz) in new[] { (-0.5f, -0.5f), (0.5f, -0.5f), (-0.5f, 0.5f), (0.5f, 0.5f) })
                        Free("steel", wx + dx * d * 0.8f, slab + 0.5f, wz + dz * d * 0.8f, 0.1f, 1.0f, 0.1f, 0, _s.Trim);
                    Prism(H(134, r) < 0.5f ? "rust" : "painted", wx, slab + 1.0f, wz, d, th, H(134, r) < 0.5f ? White : Pick(_s.Facades, H(135, r)).Tint, 10);
                    crest = Math.Max(crest, slab + 1.0f + th);
                }
                if (H(136, r) < _s.Antenna && Spot(0.6f, 0.6f, 60, out var nx2, out var nz2))
                {
                    var ah = 3f + H(137, r) * 2f;
                    Free("steel", nx2, slab + ah / 2, nz2, 0.08f, ah, 0.08f, 0, C(0x4a4a4a));
                    for (var k = 1; k <= 3; k++) Free("steel", nx2, slab + ah * k / 4f, nz2, 1.2f - k * 0.25f, 0.04f, 0.04f, H(138, r) * 180f, C(0x4a4a4a));
                    var tip = Free("light", nx2, slab + ah + 0.05f, nz2, 0.12f, 0.12f, 0.12f, 0, C(0xff2020), 1f);
                    tip.Pattern = Pattern.Tube;
                    crest = Math.Max(crest, slab + ah + 0.1f);
                }
                if (H(139, r) < _s.Dish && Spot(1.2f, 1.2f, 70, out var dx2, out var dz2))
                {
                    Free("steel", dx2, slab + 0.5f, dz2, 0.08f, 1.0f, 0.08f, 0, C(0x5a5a5a));
                    var dish = Prism("painted", dx2, slab + 0.9f, dz2, 1.0f, 0.12f, C(0xe0e0dc), 10, 0.4f);
                    dish.Pitch = 50f; dish.Yaw = H(140, r) * 360f;
                }
                if (H(141, r) < _s.Solar)
                    for (var k = 0; k < 3; k++)
                        if (Spot(1.7f, 1.1f, 80 + k, out var sx, out var sz))
                        {
                            var panel = Free("light", sx, slab + 0.5f, sz, 1.6f, 0.04f, 1.0f, 180f, C(0x1a2a4a), 0f, 25f);
                            panel.Pattern = Pattern.Pane; panel.Bottom = false;
                            Free("steel", sx, slab + 0.22f, sz, 1.4f, 0.44f, 0.06f, 0, _s.Trim);
                        }
                for (var k = 0; k < 2; k++)
                    if (H(142, r, k) < 0.5f && Spot(0.4f, 0.4f, 90 + k, out var vx, out var vz)) Prism("steel", vx, slab, vz, 0.3f, 0.7f + H(143, r, k) * 0.6f, C(0x6a6a66), 6);
                b.Crest = Math.Max(b.Crest, crest);
            }

            // --- floors, fences, masses --------------------------------------------------------------------------------

            private void Floor(PlacePlan.Room room)
            {
                var top = FloorTop(room);
                var key = room.Floor switch { "wood" => "wood", "concrete" => "slab", "metal" => "plate", "tile" => "tiles", "grate" => "grate", _ => "slab" };
                Free(key, (room.X0 + room.X1) / 2, (top - 0.1f) / 2, (room.Z0 + room.Z1) / 2, room.Width, top + 0.1f, room.Depth, 0, White, 0.25f);
            }

            private void Fence(PlacePlan.Fence fence)
            {
                var f = new Frame(fence.Ax, fence.Az, fence.Bx, fence.Bz, 0, 0);
                var len = f.Len;
                var h = Math.Max(0.9f, fence.Height);
                var room = fence.Room >= 0 ? _p.Rooms[fence.Room] : null;
                if (room != null)
                {
                    // a cell's bars from the floor to under the ceiling
                    _building = room.Index;
                    var floor = FloorTop(room);
                    var barTop = room.Height - 0.4f;
                    for (var s = 0.06f; s <= len - 0.06f + 0.001f; s += 0.14f)
                    {
                        if (fence.Gates.Any(g => Math.Abs(g.At - s) < 0.5f)) continue;
                        On(f, s - 0.015f, s + 0.015f, floor, barTop, 0, 0.03f, "steel", C(0x4a4a48), 0.4f);
                    }
                    foreach (var y in new[] { floor + 0.1f, 1.2f, barTop - 0.05f }) On(f, 0, len, y - 0.025f, y + 0.025f, 0, 0.04f, "steel", C(0x4a4a48), 0.4f);
                    _building = -1;
                    return;
                }
                bool InGate(float s0, float s1) => fence.Gates.Any(g => s1 > g.At - g.Width / 2 && s0 < g.At + g.Width / 2);
                if (fence.Kind == "concrete" || fence.Kind == "brick")
                {
                    // a low wall (a parapet, a kerb wall), its coping
                    for (var s = 0f; s < len + 0.01f; s += 1f)
                    {
                        var e = Math.Min(len, s + 1f);
                        if (InGate(s, e)) continue;
                        On(f, s - (s == 0 ? 0.15f : 0), e + (e >= len ? 0.15f : 0), 0, fence.Height, 0, 0.3f, "concrete", Pick(_s.Facades, 0.2f).Tint);
                    }
                    return;
                }
                // a steel mesh fence: grating panels between posts, gates left open
                for (var s = 0f; s < len - 0.01f; s += 2f)
                {
                    var e = Math.Min(len, s + 2f);
                    if (InGate(s, e)) continue;
                    On(f, s + 0.05f, e - 0.05f, 0.05f, h - 0.05f, 0, 0.03f, "grate", C(0x9a9a94), 0.4f);
                }
                for (var s = 0f; s <= len + 0.01f; s += 2f)
                    if (!fence.Gates.Any(g => Math.Abs(g.At - s) < g.Width / 2)) On(f, s - 0.04f, s + 0.04f, 0, h + 0.05f, 0, 0.08f, "steel", _s.Trim);
                foreach (var g in fence.Gates)
                    foreach (var side in new[] { -1f, 1f }) On(f, g.At + side * g.Width / 2 - 0.05f, g.At + side * g.Width / 2 + 0.05f, 0, h + 0.15f, 0, 0.1f, "steel", _s.Trim);
            }

            /// <summary>A thick wall raised: a megablock (both sides 6 m and more), the city's Wall (a long thin one), a pillar.</summary>
            private void Mass(int k)
            {
                var m = _p.Masses[k];
                if (m.Kind == "rock") return;
                float w = m.X1 - m.X0, d = m.Z1 - m.Z0;
                var thin = Math.Min(w, d) <= 4.5f;
                var kind = !thin ? "megablock" : Math.Max(w, d) > 12f ? "wall" : "pillar";
                var heightOf = k;
                if (thin && _s.MegaMin > 12f)
                {
                    // a thin run of a megablock's ring (where the plan's rectangles split it) is megablock, to its height
                    for (var q = 0; q < _p.Masses.Count; q++)
                    {
                        var o = _p.Masses[q];
                        if (q == k || o.Kind != m.Kind || Math.Min(o.X1 - o.X0, o.Z1 - o.Z0) <= 4.5f) continue;
                        var touch = m.X0 <= o.X1 + 0.01f && m.X1 >= o.X0 - 0.01f && m.Z0 <= o.Z1 + 0.01f && m.Z1 >= o.Z0 - 0.01f;
                        if (touch) { kind = "megablock"; heightOf = q; break; }
                    }
                }
                var height = kind switch
                {
                    "megablock" => _s.MegaMin + H(150, heightOf) * (_s.MegaMax - _s.MegaMin),
                    "wall" => Math.Max(m.Height, _s.WallHeight),
                    _ => m.Height + Storey,
                };
                if (kind == "megablock") height = (float)Math.Round(height / Storey) * Storey + 0.4f;
                var (key, tint) = Pick(_s.Facades.Where(f => f.Key != "brick").DefaultIfEmpty(_s.Facades[0]).ToList(), H(151, k));
                // a thick corner or join in a building's walls stands with the building (its facade's colour, to its top)
                var with = thin && kind != "megablock" ? _c.Blocks.Where(b => !b.Shack && Within(m, _p.Rooms[b.Room])).OrderByDescending(b => b.Top).FirstOrDefault() : null;
                if (with != null)
                {
                    kind = "join";
                    height = with.Top + Parapet;
                    if (with.Roof == "open") height = with.Top + Parapet;
                    key = with.Body; tint = with.Tint;
                    _building = with.Room;
                }
                var mb = new MassBlock { Mass = k, Kind = kind, Height = height, Crest = height + (kind == "join" ? 0.06f : Parapet) };
                _c.Masses.Add(mb);
                float cx = (m.X0 + m.X1) / 2, cz = (m.Z0 + m.Z1) / 2;
                if (kind == "join")
                {
                    Free(key, cx, height / 2, cz, w, height, d, 0, tint);
                    Free("concrete", cx, height + 0.03f, cz, w + 0.06f, 0.06f, d + 0.06f, 0, Darker(tint, 0.85f), 0.3f);
                    _building = -1;
                    return;
                }
                // the faces, each run along it that looks onto open ground
                var faces = new[] { (m.X0, m.Z1, m.X1, m.Z1, 0f, 1f), (m.X1, m.Z0, m.X0, m.Z0, 0f, -1f), (m.X0, m.Z0, m.X0, m.Z1, -1f, 0f), (m.X1, m.Z1, m.X1, m.Z0, 1f, 0f) };
                if (kind == "megablock")
                {
                    // the street storey solid, the rest a window grid over a body, the top a slab
                    Free(key, cx, Storey / 2, cz, w, Storey, d, 0, tint);
                    var grid = Free("light", cx, (Storey + height) / 2, cz, w, height - Storey, d, 0, tint, _s.Lit);
                    grid.Pattern = Pattern.Grid; grid.P = 0.55f; grid.TopKey = "slab";
                    foreach (var (ax, az, bx, bz, nx, nz) in faces)
                    {
                        var f = new Frame(ax, az, bx, bz, nx, nz);
                        foreach (var (s0, s1) in Exposed(f)) MegaFace(f, s0, s1, height, key, tint, k * 4 + (int)(nx + 2 * nz + 3));
                        On(f, -0.1f, f.Len + 0.1f, height, height + Parapet, -0.12f, 0.24f, key, tint);
                    }
                    MegaRoof(m, height, k, tint);
                    return;
                }
                Free(key, cx, height / 2, cz, w, height, d, 0, tint);
                Free("concrete", cx, height + 0.04f, cz, w + 0.08f, 0.08f, d + 0.08f, 0, Darker(tint, 0.85f), 0.3f);
                if (kind == "wall")
                {
                    // the Wall: a walk along its top behind parapets, buttresses on the outside, lamps on the inside, cameras
                    foreach (var (ax, az, bx, bz, nx, nz) in faces)
                    {
                        var f = new Frame(ax, az, bx, bz, nx, nz);
                        if (f.Len < 6f) { On(f, -0.05f, f.Len + 0.05f, height, height + 1.6f, -0.45f, 0.9f, key, Darker(tint, 0.95f)); continue; }
                        On(f, 0, f.Len, height, height + 1.1f, -0.15f, 0.3f, key, tint);
                        var open = Exposed(f).Sum(e => e.S1 - e.S0) > f.Len * 0.5f;
                        // buttresses on the side away from the city (where the map has a side beyond the Wall)
                        var outside = _s.DeadSide != 0 && Math.Sign(f.Nx) == _s.DeadSide;
                        for (var s = 4f; s < f.Len - 2f; s += 8f)
                        {
                            var (tx, tz) = f.At(s, 0.4f);
                            if (open && outside && H(152, k, (int)s) < 0.6f && !InArea(tx, tz, 1.2f)) On(f, s - 0.5f, s + 0.5f, 0, height * 0.8f, 0.4f, 0.8f, key, Darker(tint, 0.92f));
                            if (open && (int)(s / 8) % 2 == 0) Light(f, s - 0.4f, s + 0.4f, height - 2.2f, height - 2.1f, 0.12f, 0.1f, Pattern.Tube, _s.Neon[0]);
                            if ((int)(s / 8) % 3 == 1) { var (x, z) = f.At(s, -0.1f); Free("metal", x, height + 1.5f, z, 0.25f, 0.2f, 0.4f, f.Yaw, C(0xe0e0dc)); }
                        }
                    }
                    mb.Crest = height + 1.7f;
                }
            }

            /// <summary>A mass in a room's walls: inside the room's box on its walls' centrelines grown by most of a tile.</summary>
            private static bool Within(PlacePlan.Mass m, PlacePlan.Room r)
            {
                const float e = PlacePlan.Tile * 0.75f;
                return m.X0 >= r.X0 - e && m.X1 <= r.X1 + e && m.Z0 >= r.Z0 - e && m.Z1 <= r.Z1 + e;
            }

            /// <summary>A point in (or within <paramref name="r"/> of) an exit or a trigger of the map.</summary>
            private bool InArea(float x, float z, float r) =>
                _p.Markers.Any(m => (m.Kind == "exit" || m.Kind == "trigger") && Math.Abs(x - m.X) < m.W / 2 + r && Math.Abs(z - m.Z) < m.D / 2 + r);

            /// <summary>The runs of a mass's face that look onto open ground (or out of the map).</summary>
            private List<(float S0, float S1)> Exposed(Frame f)
            {
                var runs = new List<(float, float)>();
                float? start = null;
                for (var s = PlacePlan.Tile / 2; s < f.Len; s += PlacePlan.Tile)
                {
                    var (x, z) = f.At(s, PlacePlan.Tile * 0.75f);
                    var open = Open(x, z);
                    if (open && start == null) start = s - PlacePlan.Tile / 2;
                    if (!open && start != null) { runs.Add((start.Value, s - PlacePlan.Tile / 2)); start = null; }
                }
                if (start != null) runs.Add((start.Value, f.Len));
                return runs;
            }

            /// <summary>A megablock's face: the street storey's shopfronts and shutters, and on the grid's bays above the
            /// things people hang out of a block: balconies closed in with sheet, AC units, laundry, dishes, a sign.</summary>
            private void MegaFace(Frame f, float s0, float s1, float height, string key, Rgb tint, int salt)
            {
                // the street storey: lit fronts and shutters every three metres, a band over them
                for (var s = s0 + 0.5f; s + 2.4f <= s1 - 0.3f; s += 3f)
                {
                    var u = H(160, salt, (int)(s * 10));
                    if (u < 0.55f) Light(f, s, s + 2.4f, 0.3f, 2.5f, 0.02f, 0f, Pattern.Pane, Pick(_s.Rooms, H(161, salt, (int)s)), H(162, salt, (int)s) < _s.ShopLit ? 1f : 0.1f);
                    else On(f, s, s + 2.4f, 0.1f, 2.5f, 0.03f, 0.04f, "metal", Pick(_s.Facades, H(163, salt, (int)s)).Tint);
                    if (u < 0.3f && H(164, salt, (int)s) < _s.Fascia) Light(f, s, s + 2.4f, 2.6f, 3.0f, 0.08f, 0.1f, Pattern.Sign, Pick(_s.Neon, H(165, salt, (int)s)));
                }
                On(f, s0, s1, Storey - 0.15f, Storey + 0.05f, 0.06f, 0.12f, "concrete", Darker(tint, 0.85f));
                // the grid's bays: their middles where the editor's texture projection puts them
                var storeys = (int)((height - Storey) / Storey);
                var (x0, z0) = f.At(0, 0);
                var u0 = FaceU(f.Nx, f.Nz, x0, z0);
                var du = FaceU(f.Nx, f.Nz, x0 + f.Ux, z0 + f.Uz) - u0;   // ±1: the texture's u along the wall
                for (var st = 1; st <= storeys; st++)
                {
                    var y0 = st * Storey;
                    if (y0 + Storey > height - 0.2f) break;
                    var kStart = (int)Math.Ceiling(Math.Min(u0 + du * s0, u0 + du * s1) / GridBay);
                    var kEnd = (int)Math.Floor(Math.Max(u0 + du * s0, u0 + du * s1) / GridBay) - 1;
                    for (var kk = kStart; kk <= kEnd; kk++)
                    {
                        var uc = (kk + 0.5f) * GridBay;
                        var s = (uc - u0) / du;
                        if (s < s0 + 0.6f || s > s1 - 0.6f) continue;
                        var v = H(166, salt * 131 + st, kk);
                        if (v < _s.Balcony * 0.6f)
                        {
                            // closed in: a box of sheet with a window, or open with a rail
                            On(f, s - 1.1f, s + 1.1f, y0 - 0.1f, y0 + 0.05f, 0.5f, 1.0f, "concrete", Darker(_s.Interior, 0.8f)).Bottom = true;
                            if (H(167, salt, kk * 31 + st) < 0.5f)
                            {
                                On(f, s - 1.1f, s + 1.1f, y0 + 0.05f, y0 + 2.4f, 0.98f, 0.04f, Pick(new[] { "tin", "scrap", "rust", "metal" }, H(168, salt, kk * 7 + st)), Pick(_s.Facades, H(169, salt, kk + st)).Tint);
                                Light(f, s - 0.5f, s + 0.5f, y0 + 1.1f, y0 + 2.0f, 1.01f, 0f, Pattern.Pane, Pick(_s.Rooms, H(170, salt, kk)), H(171, salt, kk * 5 + st) < _s.Lit ? 1f : 0f);
                                On(f, s - 1.15f, s + 1.15f, y0 + 2.4f, y0 + 2.48f, 0.5f, 1.05f, "tin", White).Bottom = true;
                            }
                            else
                            {
                                On(f, s - 1.1f, s + 1.1f, y0 + 0.05f, y0 + 0.95f, 0.98f, 0.04f, "metal", _s.Trim);
                                if (H(172, salt, kk + st * 3) < _s.Laundry) Laundry(f, s, 2.0f, y0 + 1.9f, 1.6f, salt * 17 + kk * 3 + st);
                            }
                        }
                        else if ((v -= _s.Balcony * 0.6f) < _s.Ac * 0.5f)
                            On(f, s - 0.38f, s + 0.38f, y0 + 0.25f, y0 + 0.75f, 0.24f, 0.46f, "metal", C(0xd8d6d0));
                        else if ((v -= _s.Ac * 0.5f) < _s.Dish * 0.08f)
                        {
                            var (dx, dz) = f.At(s, 0.45f);
                            var dish = Prism("painted", dx, y0 + 1.6f, dz, 0.8f, 0.1f, C(0xe0e0dc), 10, 0.4f);
                            dish.Pitch = 70f; dish.Yaw = f.Yaw;
                        }
                        else if ((v -= _s.Dish * 0.08f) < _s.Laundry * 0.15f)
                            Laundry(f, s, 2.0f, y0 + 1.0f, 0.3f, salt * 23 + kk * 5 + st);
                    }
                }
                // a downpipe or two, a sign up the corner
                for (var s = s0 + 6f; s < s1 - 2f; s += 18f)
                {
                    var (px, pz) = f.At(s, 0.1f);
                    Prism("steel", px, 0f, pz, 0.14f, height, C(0x6a6a66), 6);
                }
                if (s1 - s0 > 8f && H(173, salt) < _s.Blade)
                {
                    var s = s0 + 1.0f;
                    var y0 = Storey + 0.3f; var y1 = Math.Min(height - 1f, y0 + 6f + H(174, salt) * 6f);
                    var (x, z) = f.At(s, 0.6f);
                    Free("steel", x, (y0 + y1) / 2, z, 1.0f, y1 - y0 + 0.12f, 0.1f, f.Yaw + 90f, C(0x202020), 0.3f);
                    var face = Free("light", x, (y0 + y1) / 2, z, 0.92f, y1 - y0, 0.16f, f.Yaw + 90f, Pick(_s.Neon, H(175, salt)), 1f);
                    face.Pattern = Pattern.Sign;
                }
            }

            private void MegaRoof(PlacePlan.Mass m, float height, int k, Rgb tint)
            {
                var slab = height;
                var taken = new List<(float, float, float, float)>();
                float ix0 = m.X0 + 1f, ix1 = m.X1 - 1f, iz0 = m.Z0 + 1f, iz1 = m.Z1 - 1f;
                if (ix1 - ix0 < 2f || iz1 - iz0 < 2f) return;
                var n = (int)((ix1 - ix0) * (iz1 - iz0) / 40f);
                for (var q = 0; q < Math.Min(n, 14); q++)
                {
                    var x = ix0 + 1.5f + H(180, k, q) * Math.Max(0, ix1 - ix0 - 3f);
                    var z = iz0 + 1.5f + H(181, k, q) * Math.Max(0, iz1 - iz0 - 3f);
                    if (taken.Any(t => Math.Abs(t.Item1 - x) < 3f && Math.Abs(t.Item2 - z) < 3f)) continue;
                    taken.Add((x, z, 0, 0));
                    var u = H(182, k, q);
                    if (u < _s.Shanty)
                    {
                        var key = new[] { "tin", "scrap", "rust", "planks" }[(int)(H(183, k, q) * 4)];
                        Free(key, x, slab + 1.15f, z, 2.4f, 2.3f, 2.0f, 0, White);
                        Free("tin", x, slab + 2.38f, z, 2.8f, 0.04f, 2.4f, 0, White, -1, 6f).Bottom = true;
                        var pane = Free("light", x, slab + 1.4f, z + 1.01f, 0.6f, 0.5f, 0f, 0, Pick(_s.Rooms, H(185, k, q)), H(186, k, q) < _s.Lit ? 1f : 0f);
                        pane.Pattern = Pattern.Pane; pane.Shape = Shape.Quad;
                    }
                    else if ((u -= _s.Shanty) < _s.Garden)
                    {
                        Free("planks", x, slab + 0.2f, z, 3f, 0.4f, 1f, 0, White);
                        Free("soil", x, slab + 0.42f, z, 2.9f, 0.06f, 0.9f, 0, C(0x8aa060), 0.2f);
                    }
                    else if ((u -= _s.Garden) < _s.Tanks)
                        Prism("rust", x, slab, z, 1.8f, 2.2f, White, 10);
                    else if ((u -= _s.Tanks) < _s.Dish)
                    {
                        Free("steel", x, slab + 0.5f, z, 0.08f, 1.0f, 0.08f, 0, C(0x5a5a5a));
                        var dish = Prism("painted", x, slab + 0.9f, z, 1.2f, 0.12f, C(0xe0e0dc), 10, 0.4f);
                        dish.Pitch = 50f; dish.Yaw = H(187, k, q) * 360f;
                    }
                    else
                    {
                        Free("metal", x, slab + 0.42f, z, 1.1f, 0.84f, 0.8f, 0, C(0xd8d8d2));
                        Prism("steel", x, slab + 0.84f, z, 0.6f, 0.04f, C(0x2a2a2a), 8, 0.3f);
                    }
                }
                // an antenna mast with a light, for the skyline
                var (ax, az) = ((m.X0 + m.X1) / 2 + (H(188, k) - 0.5f) * (m.X1 - m.X0) * 0.6f, (m.Z0 + m.Z1) / 2 + (H(189, k) - 0.5f) * (m.Z1 - m.Z0) * 0.6f);
                var ah = 5f + H(190, k) * 6f;
                Free("steel", ax, slab + ah / 2, az, 0.12f, ah, 0.12f, 0, C(0x4a4a4a));
                var tip = Free("light", ax, slab + ah, az, 0.16f, 0.16f, 0.16f, 0, C(0xff2020), 1f);
                tip.Pattern = Pattern.Tube;
                foreach (var mb in _c.Masses.Where(mm => mm.Mass == k)) mb.Crest = Math.Max(mb.Crest, slab + ah);
            }

            // --- the street --------------------------------------------------------------------------------------------

            /// <summary>Water and voids cut into the ground: their tiles, the bridges over them (a walkable run two tiles wide
            /// or less with water at both ends), in rectangles; channel walls where they meet the ground, a coping and a
            /// rail along every edge people walk beside, decks under the bridges.</summary>
            private void Pools()
            {
                int n = _p.Columns, mrows = _p.Rows;
                var wet = new bool[n * mrows]; var empty = new bool[n * mrows];
                for (var j = 0; j < mrows; j++)
                    for (var i = 0; i < n; i++)
                    {
                        var k = j * n + i;
                        if (_p.RoomAt[k] >= 0) continue;
                        if (_p.Ground[k] == "water") wet[k] = true;
                        else if (_p.Ground[k] == null && IsEmpty(i, j)) { wet[k] = true; empty[k] = true; }
                    }
                var bridge = new bool[n * mrows];
                bool Walk(int i, int j) => i >= 0 && j >= 0 && i < n && j < mrows && !wet[j * n + i] && _p.Ground[j * n + i] != null && _p.RoomAt[j * n + i] < 0;
                bool Wet(int i, int j) => i >= 0 && j >= 0 && i < n && j < mrows && wet[j * n + i];
                for (var j = 0; j < mrows; j++)
                    for (var i = 0; i < n; i++)
                    {
                        if (!Walk(i, j)) continue;
                        foreach (var (di, dj) in new[] { (1, 0), (0, 1) })
                        {
                            int a = i, b = i;
                            int aj = j, bj = j;
                            while (Walk(a - di, aj - dj)) { a -= di; aj -= dj; }
                            while (Walk(b + di, bj + dj)) { b += di; bj += dj; }
                            var run = di == 1 ? b - a + 1 : bj - aj + 1;
                            if (run <= 3 && Wet(a - di, aj - dj) && Wet(b + di, bj + dj)) bridge[j * n + i] = true;
                        }
                    }
                // a thing the story uses out on the water (a boat at its mooring) gets a pier from the nearest bank
                foreach (var mk in _p.Markers.Where(mk => mk.Kind is "talk" or "container" or "npc"))
                {
                    var (mi, mj) = TileAt(mk.X, mk.Z);
                    if (!Wet(mi, mj)) continue;
                    (int di, int dj, int len)? best = null;
                    foreach (var (di, dj) in new[] { (0, -1), (0, 1), (-1, 0), (1, 0) })
                    {
                        var q = 1;
                        while (q < 12 && Wet(mi + di * q, mj + dj * q)) q++;
                        if (q < 12 && Walk(mi + di * q, mj + dj * q) && (best == null || q < best.Value.len)) best = (di, dj, q);
                    }
                    if (best is not { } b) continue;
                    for (var q = 1; q < b.len; q++) { var k = (mj + b.dj * q) * n + mi + b.di * q; wet[k] = false; bridge[k] = true; }
                }
                _c.Wet = wet; _c.Bridge = bridge;
                // what the map puts on the water floats there (a boat) or lies half under it (a wreck)
                for (var k = 0; k < _p.Items.Count; k++)
                {
                    var it = _p.Items[k];
                    var (ii, jj) = TileAt(it.X, it.Z);
                    if (!Wet(ii, jj)) continue;
                    var level = empty[jj * n + ii] ? -4.5f : -0.8f;
                    if (it.Kind == "wagon") { _c.Afloat.Add(k); _item = k; Boat(it, level); _item = -1; }
                    else _c.ItemY[k] = level - 0.5f;
                }
                if (!wet.Any(x => x)) return;
                // rectangles over wet and bridge tiles, greedily
                var cut = new bool[n * mrows];
                for (var k = 0; k < cut.Length; k++) cut[k] = wet[k] || bridge[k];
                var done = new bool[n * mrows];
                for (var j = 0; j < mrows; j++)
                    for (var i = 0; i < n; i++)
                    {
                        var k = j * n + i;
                        if (!cut[k] || done[k]) continue;
                        var isVoid = empty[k];
                        var i1 = i;
                        while (i1 + 1 < n && cut[j * n + i1 + 1] && !done[j * n + i1 + 1] && empty[j * n + i1 + 1] == isVoid) i1++;
                        var j1 = j;
                        while (j1 + 1 < mrows)
                        {
                            var row = true;
                            for (var x = i; x <= i1 && row; x++) row = cut[(j1 + 1) * n + x] && !done[(j1 + 1) * n + x] && empty[(j1 + 1) * n + x] == isVoid;
                            if (!row) break;
                            j1++;
                        }
                        for (var y = j; y <= j1; y++) for (var x = i; x <= i1; x++) done[y * n + x] = true;
                        var (ax, az) = _p.Centre(i - 0.5, j - 0.5); var (bx, bz) = _p.Centre(i1 + 0.5, j1 + 0.5);
                        _c.Pools.Add(new Pool { X0 = ax, X1 = bx, Z0 = bz, Z1 = az, Void = isVoid, Level = isVoid ? -4.5f : -0.8f, Floor = isVoid ? -6f : -2.2f });
                    }
                // the channel's walls where a cut tile meets uncut ground, a coping and a rail where people walk beside water
                var rails = new List<Edge>();
                for (var j = 0; j < mrows; j++)
                    for (var i = 0; i < n; i++)
                    {
                        var k = j * n + i;
                        if (!cut[k]) continue;
                        var (cx, cz) = _p.Centre(i, j);
                        var floor = empty[k] ? -6f : -2.2f;
                        foreach (var (di, dj, nx, nz) in new[] { (1, 0, 1f, 0f), (-1, 0, -1f, 0f), (0, 1, 0f, -1f), (0, -1, 0f, 1f) })
                        {
                            int a = i + di, b = j + dj;
                            var inside = a >= 0 && b >= 0 && a < n && b < mrows;
                            var other = inside ? b * n + a : -1;
                            if (inside && cut[other])
                            {
                                // a bridge's side over water: girders under its deck and a rail along it
                                if (bridge[k] && wet[other]) rails.Add(Math.Abs(nx) > 0.5f ? new Edge(true, cx + nx * (PlacePlan.Tile / 2 - 0.1f), cz, (int)nx) : new Edge(false, cz + nz * (PlacePlan.Tile / 2 - 0.1f), cx, (int)nz));
                                continue;
                            }
                            // the channel's wall along this edge, its face toward the water
                            var ex = cx + nx * PlacePlan.Tile / 2; var ez = cz + nz * PlacePlan.Tile / 2;
                            var along = Math.Abs(nx) > 0.5f;
                            Free("concrete", ex + nx * 0.15f, (floor + 0.02f) / 2, ez + nz * 0.15f, along ? 0.3f : PlacePlan.Tile + 0.3f, -floor + 0.02f, along ? PlacePlan.Tile + 0.3f : 0.3f, 0, C(0x9a968c), 0.8f);
                            if (bridge[k]) continue;
                            // the coping and, where people walk, a rail
                            if (inside && Walk(a, b))
                            {
                                Free("concrete", ex + nx * 0.2f, 0.06f, ez + nz * 0.2f, along ? 0.4f : PlacePlan.Tile, 0.12f, along ? PlacePlan.Tile : 0.4f, 0, C(0xc8c4b8), 0.5f);
                                rails.Add(along ? new Edge(true, ex + nx * 0.25f, cz, -(int)nx) : new Edge(false, ez + nz * 0.25f, cx, -(int)nz));
                            }
                        }
                        if (bridge[k])
                        {
                            // the deck, flush with the street, a girder under it
                            Free("grate", cx, -0.13f, cz, PlacePlan.Tile, 0.26f, PlacePlan.Tile, 0, C(0x8a8a84), 0.5f);
                            Free("steel", cx, -0.5f, cz, PlacePlan.Tile * 0.9f, 0.5f, 0.3f, 0, _s.Trim).Bottom = true;
                        }
                        else Free("slab", cx, floor - 0.1f, cz, PlacePlan.Tile, 0.2f, PlacePlan.Tile, 0, C(0x6a665e), 1f);
                    }
                Rails(rails);
            }

            /// <summary>A boat at its mooring on the water: a hull of boards, a cabin under canvas, a lamp.</summary>
            private void Boat(PlacePlan.Item it, float level)
            {
                var yaw = it.Yaw + 90f;
                var rad = yaw * Math.PI / 180;
                float fx = (float)Math.Sin(rad), fz = (float)Math.Cos(rad);
                var hull = Pick(_s.Canvas, H(250, (int)(it.X * 10), (int)(it.Z * 10)));
                Free("planks", it.X, level + 0.1f, it.Z, 1.8f, 0.6f, 4.6f, yaw, White, 0.6f);
                Free("painted", it.X, level + 0.42f, it.Z, 1.9f, 0.1f, 4.7f, yaw, hull, 0.5f);
                Free("planks", it.X + fx * 2.55f, level + 0.2f, it.Z + fz * 2.55f, 1.0f, 0.5f, 0.7f, yaw, White, 0.6f);
                Free("planks", it.X - fx * 0.4f, level + 1.0f, it.Z - fz * 0.4f, 1.5f, 1.1f, 2.0f, yaw, White, 0.5f);
                var roof = Free("canvas", it.X - fx * 0.4f, level + 1.6f, it.Z - fz * 0.4f, 1.8f, 0.04f, 2.4f, yaw, Pick(_s.Canvas, H(251, (int)it.X)), 0.4f);
                roof.Bottom = true;
                var lamp = Free("light", it.X + fx * 1.4f, level + 1.3f, it.Z + fz * 1.4f, 0.14f, 0.2f, 0.14f, 0, C(0xffc070), 1f);
                lamp.Pattern = Pattern.Tube;
                Free("metal", it.X + fx * 1.4f, level + 0.85f, it.Z + fz * 1.4f, 0.05f, 0.9f, 0.05f, 0, C(0x3a3a3a));
            }

            /// <summary>Rails along runs of edges: a top rail and a mid rail, a post every two metres.</summary>
            private void Rails(List<Edge> edges)
            {
                foreach (var (alongZ, line, a0, a1, _) in Runs(edges))
                {
                    float mid = (a0 + a1) / 2, len = a1 - a0;
                    foreach (var (y, h) in new[] { (1.0f, 0.06f), (0.55f, 0.04f) })
                        if (alongZ) Free("steel", line, y, mid, 0.05f, h, len, 0, _s.Trim, 0.4f);
                        else Free("steel", mid, y, line, len, h, 0.05f, 0, _s.Trim, 0.4f);
                    for (var a = a0 + 0.05f; a <= a1 + 0.01f; a += Math.Max(1.6f, (a1 - a0 - 0.1f) / Math.Max(1, (int)Math.Round((a1 - a0) / 2f))))
                        if (alongZ) Free("steel", line, 0.52f, Math.Min(a, a1 - 0.05f), 0.06f, 1.04f, 0.06f, 0, _s.Trim, 0.4f);
                        else Free("steel", Math.Min(a, a1 - 0.05f), 0.52f, line, 0.06f, 1.04f, 0.06f, 0, _s.Trim, 0.4f);
                }
            }

            /// <summary>Kerbs where a road meets a pavement, plaza or deck, in runs.</summary>
            private void Kerbs()
            {
                int n = _p.Columns, mrows = _p.Rows;
                bool Road(int i, int j) => i >= 0 && j >= 0 && i < n && j < mrows && _p.Ground[j * n + i] == "asphalt";
                bool Pave(int i, int j) => i >= 0 && j >= 0 && i < n && j < mrows && _p.RoomAt[j * n + i] < 0 && _p.Ground[j * n + i] is "concrete" or "tile" or "metal" or "wood" or "grate" && !_c.Wet[j * n + i] && !_c.Bridge[j * n + i];
                var edges = new List<Edge>();
                for (var j = 0; j < mrows; j++)
                    for (var i = 0; i < n; i++)
                    {
                        if (!Pave(i, j)) continue;
                        var (cx, cz) = _p.Centre(i, j);
                        if (Road(i + 1, j)) edges.Add(new Edge(true, cx + PlacePlan.Tile / 2 - 0.13f, cz, 1));
                        if (Road(i - 1, j)) edges.Add(new Edge(true, cx - PlacePlan.Tile / 2 + 0.13f, cz, -1));
                        if (Road(i, j - 1)) edges.Add(new Edge(false, cz + PlacePlan.Tile / 2 - 0.13f, cx, 1));
                        if (Road(i, j + 1)) edges.Add(new Edge(false, cz - PlacePlan.Tile / 2 + 0.13f, cx, -1));
                    }
                foreach (var (alongZ, line, a0, a1, _) in Runs(edges))
                {
                    float mid = (a0 + a1) / 2, len = a1 - a0;
                    if (alongZ) Free("slab", line, 0.07f, mid, 0.26f, 0.14f, len, 0, C(0xc8c4bc), 0.6f);
                    else Free("slab", mid, 0.07f, line, len, 0.14f, 0.26f, 0, C(0xc8c4bc), 0.6f);
                }
            }

            /// <summary>A tile's edge: along z (at x = <see cref="Line"/>) or along x (at z = Line), the tile's middle along it.</summary>
            private readonly struct Edge
            {
                public readonly bool AlongZ;
                public readonly float Line, At;
                public readonly int Facing;
                public Edge(bool alongZ, float line, float at, int facing) { AlongZ = alongZ; Line = line; At = at; Facing = facing; }
            }

            /// <summary>Tile edges merged into runs: (along z, the line, from, to, facing).</summary>
            private static IEnumerable<(bool AlongZ, float Line, float A0, float A1, int Facing)> Runs(List<Edge> edges)
            {
                foreach (var g in edges.GroupBy(e => (e.AlongZ, (int)Math.Round(e.Line * 100), e.Facing)).OrderBy(g => g.Key.AlongZ).ThenBy(g => g.Key.Item2).ThenBy(g => g.Key.Facing))
                {
                    var ats = g.Select(e => e.At).OrderBy(a => a).ToList();
                    var line = g.First().Line;
                    var s0 = ats[0]; var prev = ats[0];
                    for (var k = 1; k <= ats.Count; k++)
                    {
                        if (k < ats.Count && ats[k] - prev < PlacePlan.Tile * 1.01f) { prev = ats[k]; continue; }
                        yield return (g.Key.AlongZ, line, s0 - PlacePlan.Tile / 2, prev + PlacePlan.Tile / 2, g.Key.Facing);
                        if (k < ats.Count) { s0 = ats[k]; prev = ats[k]; }
                    }
                }
            }

            /// <summary>The map's lamp posts as the city's street lights (a steel pole, an arm out over the way, a lit head),
            /// its signs as lightboxes on posts.</summary>
            private void Furniture()
            {
                for (var k = 0; k < _p.Items.Count; k++)
                {
                    var it = _p.Items[k];
                    if (!Overrides.Contains(it.Kind)) continue;
                    var y = it.Room >= 0 ? FloorTop(_p.Rooms[it.Room]) : 0f;
                    _building = it.Room;
                    _item = k;
                    if (it.Kind == "lamp_post")
                    {
                        // the arm points away from the nearest wall
                        var yaw = ArmYaw(it.X, it.Z);
                        var h = _s.Lamp;
                        Prism("steel", it.X, y, it.Z, 0.16f, h, C(0x4a4c50), 8, 0.4f);
                        Prism("steel", it.X, y, it.Z, 0.3f, 0.5f, C(0x3a3c40), 8, 0.6f);
                        var rad = yaw * Math.PI / 180;
                        float ax = it.X + (float)Math.Sin(rad) * 0.7f, az = it.Z + (float)Math.Cos(rad) * 0.7f;
                        Free("steel", ax, y + h - 0.05f, az, 0.08f, 0.08f, 1.4f, yaw, C(0x4a4c50), 0.4f);
                        float hx = it.X + (float)Math.Sin(rad) * 1.35f, hz = it.Z + (float)Math.Cos(rad) * 1.35f;
                        Free("metal", hx, y + h - 0.05f, hz, 0.36f, 0.14f, 0.6f, yaw, C(0x3a3c40), 0.4f);
                        var lamp = Free("light", hx, y + h - 0.14f, hz, 0.3f, 0.03f, 0.5f, yaw, _s.LampLight, 1f);
                        lamp.Pattern = Pattern.Tube; lamp.Bottom = true;
                    }
                    else
                    {
                        // a lightbox on a post, turned as the map turns the sign
                        Prism("steel", it.X, y, it.Z, 0.1f, 2.4f, C(0x4a4c50), 6, 0.4f);
                        var box = Free("light", it.X, y + 2.75f, it.Z, 1.0f, 0.62f, 0.16f, it.Yaw, Pick(_s.Neon, H(200, k)), 1f);
                        box.Pattern = Pattern.Sign;
                        Free("steel", it.X, y + 2.75f, it.Z, 1.08f, 0.7f, 0.12f, it.Yaw, C(0x202224), 0.3f);
                    }
                    _building = -1;
                    _item = -1;
                }
            }

            private float ArmYaw(float x, float z)
            {
                var best = float.MaxValue; var yaw = 0f;
                for (var a = 0; a < 8; a++)
                {
                    var rad = a * Math.PI / 4;
                    for (var r = 1f; r <= 8f; r += 1f)
                    {
                        var px = x + (float)Math.Sin(rad) * r; var pz = z + (float)Math.Cos(rad) * r;
                        if (!Street(px, pz)) { if (r < best) { best = r; yaw = a * 45f + 180f; } break; }
                    }
                }
                return best == float.MaxValue ? 0f : yaw;
            }

            /// <summary>Cables hung across the streets between facing facades (strings of bulbs in the night districts),
            /// never lower than <see cref="CableClear"/>.</summary>
            private void Cables()
            {
                if (_s.Cables <= 0) return;
                // the faces cables can hang from: outer walls of buildings two storeys and more, with their tops
                var faces = new List<(Frame F, float Top, int Owner)>();
                foreach (var w in _p.Walls)
                {
                    if (!w.Exterior || w.Room < 0) continue;
                    var b = _c.BlockOf(w.Room);
                    if (b == null || b.Top < CableClear + 1.2f) continue;
                    faces.Add((new Frame(w.Ax, w.Az, w.Bx, w.Bz, w.OutX, w.OutZ), b.Top, w.Room));
                }
                foreach (var mb in _c.Masses.Where(x => x.Kind == "megablock"))
                {
                    var m = _p.Masses[mb.Mass];
                    foreach (var (ax, az, bx, bz, nx, nz) in new[] { (m.X0, m.Z1, m.X1, m.Z1, 0f, 1f), (m.X1, m.Z0, m.X0, m.Z0, 0f, -1f), (m.X0, m.Z0, m.X0, m.Z1, -1f, 0f), (m.X1, m.Z1, m.X1, m.Z0, 1f, 0f) })
                        faces.Add((new Frame(ax, az, bx, bz, nx, nz), Math.Min(mb.Height, 12f), -100 - mb.Mass));
                }
                var made = 0;
                for (var a = 0; a < faces.Count; a++)
                    for (var b = a + 1; b < faces.Count; b++)
                    {
                        var (fa, ta, oa) = faces[a]; var (fb, tb, ob) = faces[b];
                        if (oa == ob) continue;
                        if (Math.Abs(fa.Nx + fb.Nx) > 0.01f || Math.Abs(fa.Nz + fb.Nz) > 0.01f) continue;
                        // the gap: b in front of a
                        var gap = (fb.Ax - fa.Ax) * fa.Nx + (fb.Az - fa.Az) * fa.Nz;
                        if (gap < 5f || gap > 22f) continue;
                        // the overlap along a's run
                        float bs0 = (fb.Ax - fa.Ax) * fa.Ux + (fb.Az - fa.Az) * fa.Uz;
                        float bs1 = bs0 + fb.Len * (fb.Ux * fa.Ux + fb.Uz * fa.Uz);
                        float o0 = Math.Max(0.5f, Math.Min(bs0, bs1)), o1 = Math.Min(fa.Len - 0.5f, Math.Max(bs0, bs1));
                        if (o1 - o0 < 1.5f) continue;
                        // open ground between them
                        var (mx, mz) = fa.At((o0 + o1) / 2, gap / 2);
                        if (!Street(mx, mz)) continue;
                        var count = (int)Math.Round(_s.Cables * (o1 - o0) / 6f * (0.6f + H(210, a, b)));
                        for (var k = 0; k < count && made < 90; k++)
                        {
                            var s = o0 + H(211, a * 97 + b, k) * (o1 - o0);
                            var sag = gap * (0.03f + 0.05f * H(212, a * 97 + b, k));
                            var low = CableClear + sag + 0.3f;
                            var y0 = Math.Min(ta - 0.4f, low + H(213, a * 97 + b, k) * Math.Max(0, ta - 0.4f - low));
                            var y1 = Math.Min(tb - 0.4f, low + H(214, a * 97 + b, k) * Math.Max(0, tb - 0.4f - low));
                            if (y0 < low - 0.01f || y1 < low - 0.01f) continue;
                            var (x0, z0) = fa.At(s, 0.2f);
                            var (x1, z1) = fa.At(s + (H(215, a * 97 + b, k) - 0.5f) * 3f, gap - 0.2f);
                            var festoon = _s.Festoon && H(216, a * 97 + b, k) < 0.45f;
                            Cable(x0, y0, z0, x1, y1, z1, sag, festoon, a * 97 + b + k);
                            made++;
                        }
                    }
            }

            private void Cable(float x0, float y0, float z0, float x1, float y1, float z1, float sag, bool festoon, int salt)
            {
                const int segs = 6;
                (float X, float Y, float Z) P(float t) => (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 4 * sag * t * (1 - t), z0 + (z1 - z0) * t);
                var tint = festoon ? C(0x2a2a2a) : Pick(new[] { C(0x1e1e1e), C(0x2a2a2a), C(0x3a3020) }, H(220, salt));
                for (var k = 0; k < segs; k++)
                {
                    var a = P(k / (float)segs); var b = P((k + 1) / (float)segs);
                    float dx = b.X - a.X, dy = b.Y - a.Y, dz = b.Z - a.Z;
                    var hor = (float)Math.Sqrt(dx * dx + dz * dz);
                    var len = (float)Math.Sqrt(hor * hor + dy * dy);
                    var yaw = (float)(Math.Atan2(dx, dz) * 180 / Math.PI);
                    var pitch = (float)(-Math.Atan2(dy, hor) * 180 / Math.PI);
                    Free("steel", (a.X + b.X) / 2, (a.Y + b.Y) / 2, (a.Z + b.Z) / 2, 0.035f, 0.035f, len + 0.02f, yaw, tint, 0.2f, pitch).Hung = true;
                }
                if (!festoon) return;
                var colours = _s.Neon.Length > 0 ? _s.Neon : new[] { C(0xffd080) };
                var total = (float)Math.Sqrt((x1 - x0) * (x1 - x0) + (z1 - z0) * (z1 - z0));
                var n = (int)(total / 1.1f);
                var warm = H(221, salt) < 0.6f;
                for (var k = 1; k < n; k++)
                {
                    var p = P(k / (float)n);
                    var bulb = Free("light", p.X, p.Y - 0.08f, p.Z, 0.09f, 0.11f, 0.09f, 0, warm ? C(0xffc070) : colours[k % colours.Length], 1f);
                    bulb.Pattern = Pattern.Tube; bulb.Bottom = true; bulb.Hung = true;
                }
            }

            /// <summary>Against the outer walls, off the doors and the story's things: vending machines, bins, crates, power
            /// boxes with their conduit up the wall.</summary>
            private void Dressing()
            {
                var taken = _p.Items.Select(i => (i.X, i.Z)).Concat(_p.Markers.Where(m => m.W == 0).Select(m => (m.X, m.Z))).ToList();
                bool Clear(float x, float z, float r) => taken.All(q => (q.Item1 - x) * (q.Item1 - x) + (q.Item2 - z) * (q.Item2 - z) > r * r);
                for (var wi = 0; wi < _p.Walls.Count; wi++)
                {
                    var w = _p.Walls[wi];
                    if (!w.Exterior || w.Room < 0) continue;
                    var f = new Frame(w.Ax, w.Az, w.Bx, w.Bz, w.OutX, w.OutZ);
                    if (f.Len < 2.5f) continue;
                    var t = Thickness(w.Kind);
                    for (var s = 1.0f; s <= f.Len - 1.0f; s += 1.7f)
                    {
                        if (w.Openings.Any(o => o.Kind != PlacePlan.OpeningKind.Window && Math.Abs(o.At - s) < o.Width / 2 + 1.1f)) continue;
                        var u = H(230, wi, (int)(s * 10));
                        string what = null;
                        if ((u -= _s.Vending * 0.35f) < 0) what = "vending";
                        else if ((u -= _s.Bins * 0.35f) < 0) what = "bin";
                        else if ((u -= _s.Crates * 0.35f) < 0) what = "crates";
                        else if ((u -= _s.Conduit * 0.12f) < 0) what = "box";
                        if (what == null) continue;
                        var depth = what == "vending" ? 0.8f : what == "box" ? 0.25f : 0.6f;
                        var (x, z) = f.At(s, t / 2 + depth / 2 + 0.05f);
                        if (!Street(x, z) || !Street(f.At(s, t / 2 + 1.6f).X, f.At(s, t / 2 + 1.6f).Z) || !Clear(x, z, 1.2f)) continue;
                        taken.Add((x, z));
                        switch (what)
                        {
                            case "vending":
                                Free("painted", x, 0.95f, z, 0.9f, 1.9f, depth, f.Yaw, Pick(_s.Facades, H(231, wi, (int)s)).Tint, 0.4f);
                                Light(f, s - 0.36f, s + 0.36f, 0.9f, 1.75f, t / 2 + depth + 0.06f, 0f, Pattern.Screen, Pick(_s.Neon, H(232, wi, (int)s)));
                                Light(f, s - 0.36f, s + 0.36f, 0.45f, 0.75f, t / 2 + depth + 0.06f, 0f, Pattern.Pane, C(0xfff0d8), 1f);
                                break;
                            case "bin":
                                Prism("steel", x, 0f, z, 0.55f, 0.9f, Pick(new[] { C(0x4a6a4a), C(0x5a5a58), C(0x3a4a6a) }, H(233, wi, (int)s)), 8);
                                if (H(234, wi, (int)s) < 0.5f) _c.Props.Add(new Prop { Kind = "bag", X = x + 0.5f * f.Ux, Z = z + 0.5f * f.Uz, Yaw = H(235, wi, (int)s) * 360f });
                                break;
                            case "crates":
                                for (var q = 0; q < 2 + (int)(H(236, wi, (int)s) * 3); q++)
                                {
                                    var ox = (H(237, wi, (int)s * 7 + q) - 0.5f) * 0.6f;
                                    var lvl = q / 2;
                                    var (cx, cz) = f.At(s + ox, t / 2 + 0.35f);
                                    Free(q % 3 == 0 ? "planks" : "painted", cx, 0.2f + lvl * 0.4f, cz, 0.55f, 0.38f, 0.42f, f.Yaw + (H(238, wi, q) - 0.5f) * 20f, q % 3 == 0 ? White : Pick(_s.Canvas, H(239, wi, q)), 0.5f);
                                }
                                break;
                            case "box":
                                Free("metal", x, 1.3f, z, 0.6f, 0.8f, depth, f.Yaw, C(0x8a9088));
                                On(f, s - 0.04f, s + 0.04f, 1.7f, Math.Max(2f, w.Height - 0.3f), t / 2 + 0.06f, 0.08f, "steel", C(0x5a5a58));
                                break;
                        }
                    }
                }
            }

            /// <summary>The yards' scenes, by the district's weights (the editor builds their props); a canopy over the market
            /// stalls and the street kitchens.</summary>
            private void YardScenes()
            {
                if (_s.YardWeights.Length == 0) return;
                var weights = _s.YardWeights.ToDictionary(w => w.Kind, w => w.Weight);
                var scenes = PlaceYards.For(_p, _seed * 7 + 13, k => weights.TryGetValue(k, out var v) ? v : 0.0);
                // (never in an exit's way)
                _c.Yards = scenes.Where(v => weights.ContainsKey(v.Kind) && !_p.Markers.Any(m => m.Kind == "exit" && Math.Abs(v.X - m.X) < m.W / 2 + v.Radius + 0.5f && Math.Abs(v.Z - m.Z) < m.D / 2 + v.Radius + 0.5f))
                    .Take(_s.YardsMax).ToList();
                foreach (var v in _c.Yards)
                {
                    if (v.Kind != "stores" && v.Kind != "stove") continue;
                    var tint = Pick(_s.Canvas, H(240, (int)(v.X * 10), (int)(v.Z * 10)));
                    var w = v.Radius * 1.7f;
                    foreach (var (dx, dz) in new[] { (-1f, -1f), (1f, -1f), (-1f, 1f), (1f, 1f) })
                    {
                        var rad = v.Yaw * Math.PI / 180;
                        float lx = dx * w / 2, lz = dz * w / 2;
                        float px = v.X + lx * (float)Math.Cos(rad) + lz * (float)Math.Sin(rad), pz = v.Z - lx * (float)Math.Sin(rad) + lz * (float)Math.Cos(rad);
                        Free("steel", px, 1.3f, pz, 0.05f, 2.6f, 0.05f, 0, _s.Trim, 0.4f);
                    }
                    var canopy = Free("canvas", v.X, 2.6f, v.Z, w + 0.3f, 0.03f, w + 0.3f, v.Yaw, tint, 0.4f, 5f);
                    canopy.Bottom = true; canopy.Hung = true;
                }
            }

            // --- the skyline's towers ------------------------------------------------------------------------------------

            /// <summary>A tower's pieces in its sector: tiers set back as they rise, each a window grid over a body with a
            /// slab on top; a lit crown and a mast with a light; a billboard now and then; a derelict tower's top broken.</summary>
            public void TowerPieces(Tower t)
            {
                var cell = -1 - t.Sector;
                var hs = (int)(t.CellKey & 0x7fffffff) ^ (int)(t.CellKey >> 32);
                float Th(int a) => Hash(1909, hs, a, 77);
                var derelict = t.Kind == "derelict";
                var tiers = t.Height > 60f ? 3 : t.Height > 35f ? 2 : 1;
                float w = t.W, d = t.D, y = -2f;
                var tint = t.Kind switch
                {
                    "glass" => Pick(new[] { C(0xb8c8d8), C(0xd8dce0), C(0xc8d0c8) }, Th(1)),
                    "derelict" => Pick(new[] { C(0x9a948a), C(0x8a8478), C(0xa89a88) }, Th(1)),
                    "megablock" => Pick(_s.Facades, Th(1)).Tint,
                    _ => Pick(_s.Facades.Select(f => f.Tint).Concat(new[] { C(0xc8ccd0) }).ToList(), Th(1)),
                };
                var lit = derelict ? 0.06f : t.Kind == "glass" ? 0.7f : _s.Lit;
                var pane = t.Kind == "glass" ? 0.85f : t.Kind == "megablock" ? 0.5f : 0.68f;
                for (var k = 0; k < tiers; k++)
                {
                    var top = k == tiers - 1 ? t.Height : y + (t.Height + 2f) * (k == 0 ? 0.55f + Th(2) * 0.2f : 0.25f);
                    if (top - y < 4f) top = y + 4f;
                    var g = Add(new Piece { Key = "light", TopKey = "slab", X = t.X, Y = (y + top) / 2, Z = t.Z, SX = w, SY = top - y, SZ = d, Tint = tint, A = lit, Pattern = Pattern.Grid, P = pane });
                    g.Cell = cell; g.Building = -1;
                    y = top;
                    if (k < tiers - 1) { var back = 1.5f + Th(3 + k) * 2.5f; w = Math.Max(6f, w - back * 2); d = Math.Max(6f, d - back * 2); }
                }
                if (derelict)
                {
                    // a broken top: stubs of the last storey, bare frame
                    for (var q = 0; q < 4; q++)
                    {
                        var sx = (Th(10 + q) - 0.5f) * (w - 2f); var sz = (Th(20 + q) - 0.5f) * (d - 2f);
                        var sh = 1f + Th(30 + q) * 4f;
                        var p = Add(new Piece { Key = "concrete", X = t.X + sx, Y = y + sh / 2, Z = t.Z + sz, SX = 1.5f + Th(40 + q) * 3f, SY = sh, SZ = 1.2f + Th(50 + q) * 2f, Tint = tint, A = 1f });
                        p.Cell = cell;
                    }
                    for (var q = 0; q < 3; q++)
                    {
                        var p = Add(new Piece { Key = "steel", X = t.X + (Th(60 + q) - 0.5f) * w, Y = y + 2.5f, Z = t.Z + (Th(70 + q) - 0.5f) * d, SX = 0.25f, SY = 5f, SZ = 0.25f, Tint = C(0x5a4a3a), A = 1f, Pitch = (Th(80 + q) - 0.5f) * 30f });
                        p.Cell = cell;
                    }
                    return;
                }
                // the crown: a lit band round the top, a mast
                var neon = Pick(_s.Neon, Th(90));
                if (Th(91) < 0.7f)
                    foreach (var (dx, dz, sx, sz) in new[] { (0f, d / 2, w, 0.1f), (0f, -d / 2, w, 0.1f), (w / 2, 0f, 0.1f, d), (-w / 2, 0f, 0.1f, d) })
                    {
                        var p = Add(new Piece { Key = "light", X = t.X + dx, Y = y - 0.6f, Z = t.Z + dz, SX = sx + 0.1f, SY = 0.25f, SZ = sz + 0.1f, Tint = neon, A = 1f, Pattern = Pattern.Tube });
                        p.Cell = cell;
                    }
                if (Th(92) < 0.6f)
                {
                    var mh = 6f + Th(93) * 14f;
                    var mast = Add(new Piece { Key = "steel", X = t.X, Y = y + mh / 2, Z = t.Z, SX = 0.35f, SY = mh, SZ = 0.35f, Tint = C(0x5a5a5a), A = 0.5f });
                    mast.Cell = cell;
                    var tip = Add(new Piece { Key = "light", X = t.X, Y = y + mh, Z = t.Z, SX = 0.4f, SY = 0.4f, SZ = 0.4f, Tint = C(0xff2020), A = 1f, Pattern = Pattern.Tube });
                    tip.Cell = cell;
                }
                // a billboard facing the district, high up
                if (Th(94) < _s.Billboard + 0.15f && t.Height > 30f)
                {
                    var toX = -t.X; var toZ = -t.Z;
                    var yaw = Math.Abs(toX) > Math.Abs(toZ) ? (toX > 0 ? 90f : -90f) : (toZ > 0 ? 0f : 180f);
                    var faceW = Math.Abs(toX) > Math.Abs(toZ) ? d : w;
                    var bw = faceW * 0.7f; var bh = Math.Min(12f, t.Height * 0.18f);
                    var by = t.Height * (0.55f + Th(95) * 0.25f);
                    var off = (Math.Abs(toX) > Math.Abs(toZ) ? w : d) / 2 + 0.3f;
                    var ox = Math.Abs(toX) > Math.Abs(toZ) ? Math.Sign(toX) * off : 0f;
                    var oz = Math.Abs(toX) > Math.Abs(toZ) ? 0f : Math.Sign(toZ) * off;
                    if (by + bh / 2 < t.Height)
                    {
                        var b = Add(new Piece { Key = "light", X = t.X + ox, Y = by, Z = t.Z + oz, SX = bw, SY = bh, SZ = 0.2f, Yaw = yaw, Tint = Pick(_s.Neon, Th(96)), A = 1f, Pattern = Th(97) < 0.5f ? Pattern.Screen : Pattern.Sign });
                        b.Cell = cell;
                    }
                }
            }
        }
    }
}
