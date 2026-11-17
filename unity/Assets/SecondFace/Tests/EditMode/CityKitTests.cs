using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>
    /// The megacity kit (Core <see cref="CityKit"/>, PlaceBuilder's Meridian districts): each district reads differently, the
    /// same map always gives the same city, the streets keep 2–5 storeys and tall things see through or stand beyond the
    /// place, the skyline never doubles between districts, nothing stands in a doorway, on a post or low over a way, an
    /// entered building's every piece lies in its cutaway, every post stays reachable on foot, and a view keeps to the
    /// phone's draw budget.
    /// </summary>
    public class CityKitTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        /// <summary>The districts placed in the world, as places.json places them (world metres: centre, size).</summary>
        private static readonly (string Place, string Map, CityKit.Area Area)[] Districts =
        {
            ("meridian", "md_precinct", new CityKit.Area("meridian", 3840, 5120, 144, 120)),
            ("site_md_market", "md_market", new CityKit.Area("site_md_market", 3984, 5120, 144, 112)),
            ("site_md_lantern", "md_lantern", new CityKit.Area("site_md_lantern", 4128, 5120, 144, 112)),
            ("site_md_bridgeward", "md_bridgeward", new CityKit.Area("site_md_bridgeward", 4272, 5120, 144, 112)),
            ("site_md_stacks", "md_stacks", new CityKit.Area("site_md_stacks", 3984, 5016, 128, 96)),
        };

        private static CityKit.Area[] Areas => Districts.Select(d => d.Area).ToArray();

        private static (PlacePlan Plan, CityKit.City City) Build(string mapId, int? seed = null)
        {
            var map = Registry.Maps[mapId];
            var plan = PlacePlan.Build(CityKit.Prepare(map));
            var d = Districts.FirstOrDefault(x => x.Map == mapId);
            var city = CityKit.Build(plan, map, CityKit.StyleFor(mapId), seed ?? (int)(map.Seed ?? 1), d.Area, Areas, Areas);
            return (plan, city);
        }

        private static IEnumerable<string> Maps => Districts.Select(d => d.Map);

        [Test]
        public void EachDistrictReadsDifferently()
        {
            foreach (var id in new[] { "shale", "c9_mouth", "overpass", "ninebridge", "sump" })
                Assert.That(CityKit.StyleFor(id), Is.Null, $"{id} is the frontier's");
            var styles = Maps.Select(CityKit.StyleFor).ToList();
            Assert.That(styles.All(s => s != null), Is.True, "every Meridian district has a style");
            Assert.That(styles.Select(s => s.Id).Distinct().Count(), Is.EqualTo(styles.Count), "one style each");
            foreach (var id in new[] { "md_sink", "md_crown", "md_stacks_9", "md_stacks_roof" }) Assert.That(CityKit.StyleFor(id), Is.Not.Null, id);
            // their looks differ: palette, light, height, wear
            for (var a = 0; a < styles.Count; a++)
                for (var b = a + 1; b < styles.Count; b++)
                {
                    var sa = styles[a]; var sb = styles[b];
                    var paletteA = sa.Facades.Select(f => f.Tint.ToString()).ToHashSet();
                    var shared = sb.Facades.Count(f => paletteA.Contains(f.Tint.ToString()));
                    Assert.That(shared, Is.LessThan(Math.Min(sa.Facades.Length, sb.Facades.Length) / 2 + 1), $"{sa.Id} and {sb.Id} share their colours");
                    var differences = 0;
                    if (sa.StoreysMin != sb.StoreysMin || sa.StoreysMax != sb.StoreysMax) differences++;
                    if (Math.Abs(sa.Grime - sb.Grime) > 0.1f) differences++;
                    if (Math.Abs(sa.Blade - sb.Blade) > 0.2f || Math.Abs(sa.Strip - sb.Strip) > 0.2f) differences++;
                    if (Math.Abs(sa.Shanty - sb.Shanty) > 0.15f || Math.Abs(sa.Garden - sb.Garden) > 0.15f) differences++;
                    if (sa.TowerKind != sb.TowerKind) differences++;
                    Assert.That(differences, Is.GreaterThanOrEqualTo(2), $"{sa.Id} and {sb.Id} read alike");
                }
            // and as built: the night districts glow more than the orderly ones
            var lantern = Build("md_lantern").City; var precinct = Build("md_precinct").City; var bridgeward = Build("md_bridgeward").City;
            // (signs and neon per metre of the buildings' outer walls)
            float Neon(PlacePlan plan, CityKit.City c)
            {
                var walls = plan.Walls.Where(w => w.Exterior && w.Room >= 0 && c.BlockOf(w.Room) is { Shack: false }).Sum(w => w.Length);
                return c.Pieces.Count(p => p.Cell >= 0 && p.Key == "light" && (p.Pattern == CityKit.Pattern.Tube || p.Pattern == CityKit.Pattern.Sign)) / Math.Max(1f, walls);
            }
            var lp = Build("md_lantern").Plan; var pp = Build("md_precinct").Plan;
            Console.WriteLine($"neon a metre: Lantern Row {Neon(lp, lantern):0.00}, the Precinct {Neon(pp, precinct):0.00}");
            Assert.That(Neon(lp, lantern), Is.GreaterThan(Neon(pp, precinct) * 1.5f), "Lantern Row glows more than the Precinct");
            Assert.That(bridgeward.Blocks.Average(b => b.Top), Is.LessThan(precinct.Blocks.Average(b => b.Top)), "Bridgeward is lower than the Precinct");
        }

        [Test]
        public void TheSameMapBuildsTheSameCity()
        {
            foreach (var id in Maps)
            {
                var a = Build(id).City; var b = Build(id).City;
                Assert.That(a.Pieces.Count, Is.EqualTo(b.Pieces.Count), id);
                for (var k = 0; k < a.Pieces.Count; k++)
                {
                    var p = a.Pieces[k]; var q = b.Pieces[k];
                    Assert.That((p.Key, p.X, p.Y, p.Z, p.SX, p.SY, p.SZ, p.Yaw, p.Pitch, p.Pattern, p.Cell), Is.EqualTo((q.Key, q.X, q.Y, q.Z, q.SX, q.SY, q.SZ, q.Yaw, q.Pitch, q.Pattern, q.Cell)), $"{id}: piece {k}");
                }
                Assert.That(a.Towers.Select(t => (t.X, t.Z, t.Height)), Is.EqualTo(b.Towers.Select(t => (t.X, t.Z, t.Height))), $"{id}: the skyline");
                var other = Build(id, 4242).City;
                var same = other.Pieces.Count == a.Pieces.Count && other.Pieces.Zip(a.Pieces, (p, q) => p.X == q.X && p.Y == q.Y && p.Key == q.Key).All(x => x);
                Assert.That(same, Is.False, $"{id}: another seed raises another city");
            }
        }

        [Test]
        public void TheStreetsKeepTwoToFiveStoreys()
        {
            foreach (var id in Maps)
            {
                var (plan, city) = Build(id);
                foreach (var b in city.Blocks)
                {
                    var room = plan.Rooms[b.Room];
                    if (b.Shack) Assert.That(b.Storeys, Is.InRange(1, 2), $"{id}: a shack of {b.Storeys} storeys");
                    else Assert.That(b.Storeys, Is.InRange(2, 5), $"{id}: room {b.Room} ({room.Wall}) of {b.Storeys} storeys");
                    Assert.That(b.Top, Is.LessThanOrEqualTo(room.Height + 4 * CityKit.Storey + 0.01f), $"{id}: room {b.Room} too tall to walk among");
                }
                Assert.That(city.Blocks.Count(b => !b.Shack && b.Roof != "open"), Is.GreaterThan(0), $"{id}: some real buildings");
            }
        }

        /// <summary>Every piece is drawn with the city's material (the see-through round the player: SecondFace/City);
        /// anything taller than a street building stands either in the place with it, or beyond every place as backdrop.</summary>
        [Test]
        public void TallThingsSeeThroughOrStandBeyond()
        {
            foreach (var (place, id, area) in Districts)
            {
                var (plan, city) = Build(id);
                Assert.That(city.Pieces.All(p => CityKit.Keys.Contains(p.Key) && (p.TopKey == null || CityKit.Keys.Contains(p.TopKey))), Is.True, $"{id}: a piece of a material the city does not draw");
                foreach (var b in city.Blocks.Where(b => b.Crest > CityKit.RevealAbove)) Assert.That(b.Reveal, Is.True);
                Assert.That(city.Towers.Count, Is.GreaterThan(5), $"{id}: a skyline");
                foreach (var t in city.Towers)
                {
                    // the tower in world metres, clear of every district and the margin round it (the place's NavMesh volume
                    // reaches 12 m past its footprint)
                    float wx = area.X + t.X, wz = area.Z + t.Z;
                    foreach (var a in Areas)
                    {
                        var dx = Math.Abs(wx - a.X) - (a.W / 2 + t.W / 2); var dz = Math.Abs(wz - a.Z) - (a.D / 2 + t.D / 2);
                        Assert.That(dx >= CityKit.TowerMargin - 0.01f || dz >= CityKit.TowerMargin - 0.01f, Is.True, $"{id}: a tower at ({wx:0}, {wz:0}) stands in {a.Id}");
                    }
                    Assert.That(Math.Abs(t.X) - t.W / 2 > plan.Width / 2 + 12f || Math.Abs(t.Z) - t.D / 2 > plan.Depth / 2 + 12f, Is.True, $"{id}: a tower in the place's NavMesh volume");
                }
                // nothing in the place outgrows the backdrop's foot: the tallest piece inside stays a street's height or a
                // megablock's, and only megablocks pass 20 m
                foreach (var p in city.Pieces.Where(p => p.Cell >= 0))
                {
                    var bb = p.Bounds();
                    if (bb.Y1 > 21f) Assert.That(city.Masses.Any(m => m.Kind == "megablock"), Is.True, $"{id}: a {p.Key} piece {bb.Y1:0.0} m tall at ({p.X:0}, {p.Z:0})");
                }
            }
        }

        [Test]
        public void NoTwoDistrictsBuildTheSameTower()
        {
            var seen = new Dictionary<long, string>();
            foreach (var (_, id, _) in Districts)
                foreach (var t in Build(id).City.Towers)
                {
                    Assert.That(seen.ContainsKey(t.CellKey), Is.False, $"{id} builds {(seen.TryGetValue(t.CellKey, out var o) ? o : "")}'s tower");
                    seen[t.CellKey] = id;
                }
            Assert.That(seen.Count, Is.GreaterThan(60), "the city has a skyline round it");
        }

        /// <summary>No piece stands in a doorway's clear way (its width, the door's height over the floor, a step either
        /// side of the wall), on a person's post or a thing the story uses, or in an exit.</summary>
        [Test]
        public void NothingStandsInADoorwayOrOnAPost()
        {
            foreach (var id in Maps)
            {
                var (plan, city) = Build(id);
                var solid = city.Pieces.Where(p => p.Cell >= 0).Select(p => (p, b: p.Bounds())).Where(x => x.b.Y1 > 0.36f && x.b.Y0 < 1.9f).ToList();
                foreach (var w in plan.Walls)
                {
                    var len = w.Length;
                    if (len < 1e-3f) continue;
                    float ux = (w.Bx - w.Ax) / len, uz = (w.Bz - w.Az) / len;
                    var room = w.Room >= 0 ? plan.Rooms[w.Room] : null;
                    foreach (var o in w.Openings.Where(o => o.Kind != PlacePlan.OpeningKind.Window))
                    {
                        float cx = w.Ax + ux * o.At, cz = w.Az + uz * o.At;
                        var half = o.Width / 2 - 0.02f;
                        // the clear way: across the wall a metre each side, the door's width along it
                        float x0 = cx - Math.Abs(ux) * half - Math.Abs(uz) * 0.9f, x1 = cx + Math.Abs(ux) * half + Math.Abs(uz) * 0.9f;
                        float z0 = cz - Math.Abs(uz) * half - Math.Abs(ux) * 0.9f, z1 = cz + Math.Abs(uz) * half + Math.Abs(ux) * 0.9f;
                        var top = Math.Min(1.9f, o.Top + CityKit.FloorTop(room) - 0.05f);
                        foreach (var (p, b) in solid)
                            if (b.X0 < x1 && b.X1 > x0 && b.Z0 < z1 && b.Z1 > z0 && b.Y0 < top)
                                Assert.Fail($"{id}: a {p.Key} piece at ({p.X:0.0}, {p.Y:0.0}, {p.Z:0.0}) in the doorway at ({cx:0.0}, {cz:0.0})");
                    }
                }
                foreach (var m in plan.Markers)
                {
                    if (m.Kind == "trigger") continue;
                    if (m.Kind == "exit")
                    {
                        // (what the kit adds on the open ground of an exit; the map's own walls and props stand where they stand)
                        foreach (var (p, b) in solid)
                            if (b.X0 < m.X + m.W / 2 - 0.3f && b.X1 > m.X - m.W / 2 + 0.3f && b.Z0 < m.Z + m.D / 2 - 0.3f && b.Z1 > m.Z - m.D / 2 + 0.3f && p.Building < 0 && p.Item < 0 && OnStreet(plan, city, p.X, p.Z))
                                Assert.Fail($"{id}: a {p.Key} piece at ({p.X:0.0}, {p.Z:0.0}) in the {m.Kind} {m.Id}");
                        continue;
                    }
                    if (m.Kind is not ("npc" or "spawn" or "spot" or "seat")) continue;
                    foreach (var (p, b) in solid)
                        if (b.X0 < m.X + 0.35f && b.X1 > m.X - 0.35f && b.Z0 < m.Z + 0.35f && b.Z1 > m.Z - 0.35f && p.Building < 0 && p.Item < 0)
                            Assert.Fail($"{id}: a {p.Key} piece at ({p.X:0.0}, {p.Z:0.0}) on the {m.Kind} {m.Id}");
                }
            }
        }

        private static bool OnStreet(PlacePlan plan, CityKit.City city, float x, float z)
        {
            int i = (int)Math.Floor((x + plan.Width / 2) / PlacePlan.Tile), j = (int)Math.Floor((plan.Depth / 2 - z) / PlacePlan.Tile);
            if (i < 0 || j < 0 || i >= plan.Columns || j >= plan.Rows) return false;
            var k = j * plan.Columns + i;
            return plan.Ground[k] != null && plan.RoomAt[k] < 0 && !city.Wet[k];
        }

        [Test]
        public void NothingHangsLowOverAWay()
        {
            foreach (var id in Maps)
            {
                var (plan, city) = Build(id);
                foreach (var p in city.Pieces.Where(p => p.Hung))
                {
                    var b = p.Bounds();
                    var cable = p.SZ > 0.5f && p.SX < 0.05f && p.SY < 0.05f;
                    Assert.That(b.Y0, Is.GreaterThanOrEqualTo((cable ? CityKit.CableClear : CityKit.StreetClear) - 0.06f), $"{id}: a hung {p.Key} at ({p.X:0.0}, {p.Z:0.0}) down to {b.Y0:0.00} m");
                }
                // and nothing on a facade stands further out than the cutaway reaches
                foreach (var p in city.Pieces.Where(p => p.Building >= 0))
                {
                    var r = plan.Rooms[p.Building];
                    var b = p.Bounds();
                    var m = CityKit.CutMargin + 0.05f;
                    Assert.That(b.X0 >= r.X0 - m && b.X1 <= r.X1 + m && b.Z0 >= r.Z0 - m && b.Z1 <= r.Z1 + m, Is.True,
                        $"{id}: a {p.Key} of room {p.Building} at ({p.X:0.0}, {p.Y:0.0}, {p.Z:0.0}) outside its cutaway ({r.X0:0}..{r.X1:0}, {r.Z0:0}..{r.Z1:0})");
                    Assert.That(b.Y1, Is.LessThanOrEqualTo(city.OpenHeight(p.Building) + 1.5f + 4f + 0.01f), $"{id}: a {p.Key} of room {p.Building} above its cutaway");
                }
            }
        }

        /// <summary>The ground on foot (a 0.5 m grid, every piece that stands between knee and head height a wall, grown by
        /// a person's radius; water and voids open but for their bridges): every person's post and every thing the
        /// story uses that the arrival reaches on the map's own grid is reached among the city's pieces too.</summary>
        [Test]
        public void EveryPostStaysReachableOnFoot()
        {
            foreach (var id in Maps)
            {
                var map = Registry.Maps[id];
                var (plan, city) = Build(id);
                const float g = 0.5f;
                int nx = (int)(plan.Width / g), nz = (int)(plan.Depth / g);
                var blocked = new bool[nx * nz];
                int Ix(float x) => (int)Math.Floor((x + plan.Width / 2) / g);
                int Iz(float z) => (int)Math.Floor((z + plan.Depth / 2) / g);
                foreach (var p in city.Pieces.Where(p => p.Cell >= 0))
                {
                    var b = p.Bounds();
                    if (b.Y1 < 0.4f || b.Y0 > 1.7f) continue;
                    if (b.Y1 < 0.05f) continue;
                    for (var i = Math.Max(0, Ix(b.X0 - 0.25f)); i <= Math.Min(nx - 1, Ix(b.X1 + 0.25f - 1e-3f)); i++)
                        for (var j = Math.Max(0, Iz(b.Z0 - 0.25f)); j <= Math.Min(nz - 1, Iz(b.Z1 + 0.25f - 1e-3f)); j++)
                        {
                            // (a cell is blocked when its middle lies in the grown box)
                            float cx = (i + 0.5f) * g - plan.Width / 2, cz = (j + 0.5f) * g - plan.Depth / 2;
                            if (cx > b.X0 - 0.25f && cx < b.X1 + 0.25f && cz > b.Z0 - 0.25f && cz < b.Z1 + 0.25f) blocked[j * nx + i] = true;
                        }
                }
                // water and drops: only their bridges carry a walker
                for (var k = 0; k < plan.Columns * plan.Rows; k++)
                {
                    if (!city.Wet[k]) continue;
                    var (cx, cz) = plan.Centre(k % plan.Columns, k / plan.Columns);
                    for (var i = Ix(cx - 0.99f); i <= Ix(cx + 0.99f); i++)
                        for (var j = Iz(cz - 0.99f); j <= Iz(cz + 0.99f); j++)
                            if (i >= 0 && j >= 0 && i < nx && j < nz) blocked[j * nx + i] = true;
                }
                // the map's own blocking props and tiles as the bare grid sees them
                var open = new bool[nx * nz];
                for (var j = 0; j < nz; j++)
                    for (var i = 0; i < nx; i++)
                    {
                        float x = (i + 0.5f) * g - plan.Width / 2, z = (j + 0.5f) * g - plan.Depth / 2;
                        int ti = (int)Math.Floor((x + plan.Width / 2) / PlacePlan.Tile), tj = (int)Math.Floor((plan.Depth / 2 - z) / PlacePlan.Tile);
                        var d = tj < map.Layout.Count && ti < map.Layout[tj].Length && map.Legend.TryGetValue(map.Layout[tj][ti].ToString(), out var t) ? t : null;
                        // walls, rooms and streets alike: the pieces say where a wall stands (a wall tile is two metres, its wall
                        // a third of one, and people walk beside it); empty tiles, blocking tiles and props are closed
                        var tileOpen = d != null && d.Empty != true && d.Blocks != true && (d.Prop == null || d.Blocks == false);
                        open[j * nx + i] = tileOpen && !blocked[j * nx + i];
                    }
                var spawn = map.Spawns.FirstOrDefault(s => s.Id == "start") ?? map.Spawns.First();
                var (sx, sz) = plan.Centre(spawn.X, spawn.Y);
                var seen = Flood(open, nx, nz, Ix(sx), Iz(sz));
                bool Near(float x, float z, float r)
                {
                    for (var i = Ix(x - r); i <= Ix(x + r); i++)
                        for (var j = Iz(z - r); j <= Iz(z + r); j++)
                            if (i >= 0 && j >= 0 && i < nx && j < nz && seen[j * nx + i]) return true;
                    return false;
                }
                // what the bare map reaches (PlaceYardsTests' grid): a post not reached there is the map's, not the city's
                var bare = BareReach(map, plan, spawn.X, spawn.Y);
                var cut = new List<string>();
                foreach (var m in plan.Markers.Where(m => m.Kind is "npc" or "talk" or "container"))
                {
                    int ti = (int)Math.Floor((m.X + plan.Width / 2) / PlacePlan.Tile), tj = (int)Math.Floor((plan.Depth / 2 - m.Z) / PlacePlan.Tile);
                    if (!BareNear(bare, plan, ti, tj)) continue;
                    if (!Near(m.X, m.Z, 1.6f)) cut.Add($"{m.Kind} {m.Id} at ({m.X:0.0}, {m.Z:0.0})");
                }
                Console.WriteLine($"{id}: {plan.Markers.Count(m => m.Kind is "npc" or "talk" or "container")} posts and things; cut off by the city: {(cut.Count == 0 ? "none" : string.Join("; ", cut))}");
                Assert.That(cut, Is.Empty, $"{id}: posts the city cuts off");
            }
        }

        private static bool[] Flood(bool[] open, int nx, int nz, int si, int sj)
        {
            var seen = new bool[nx * nz];
            var q = new Queue<int>();
            // start at the nearest open cell to the arrival
            var best = -1; var bd = int.MaxValue;
            for (var j = Math.Max(0, sj - 6); j <= Math.Min(nz - 1, sj + 6); j++)
                for (var i = Math.Max(0, si - 6); i <= Math.Min(nx - 1, si + 6); i++)
                    if (open[j * nx + i] && (i - si) * (i - si) + (j - sj) * (j - sj) < bd) { bd = (i - si) * (i - si) + (j - sj) * (j - sj); best = j * nx + i; }
            if (best < 0) return seen;
            seen[best] = true; q.Enqueue(best);
            while (q.Count > 0)
            {
                var k = q.Dequeue(); int ci = k % nx, cj = k / nx;
                foreach (var (di, dj) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                {
                    int a = ci + di, b = cj + dj;
                    if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
                    var kk = b * nx + a;
                    if (seen[kk] || !open[kk]) continue;
                    seen[kk] = true; q.Enqueue(kk);
                }
            }
            return seen;
        }

        private static bool[] BareReach(Core.Scene.MapDef map, PlacePlan plan, int si, int sj)
        {
            int n = plan.Columns, m = plan.Rows;
            var open = new bool[n * m];
            for (var j = 0; j < m && j < map.Layout.Count; j++)
                for (var i = 0; i < n && i < map.Layout[j].Length; i++)
                {
                    var d = map.Legend != null && map.Legend.TryGetValue(map.Layout[j][i].ToString(), out var t) ? t : null;
                    open[j * n + i] = d != null && d.Empty != true && d.Wall == null && d.Blocks != true && (d.Prop == null || d.Blocks == false);
                }
            var seen = new bool[n * m];
            var q = new Queue<int>();
            if (si < 0 || sj < 0 || si >= n || sj >= m) return seen;
            seen[sj * n + si] = true; q.Enqueue(sj * n + si);
            while (q.Count > 0)
            {
                var k = q.Dequeue(); int ci = k % n, cj = k / n;
                foreach (var (di, dj) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
                {
                    int a = ci + di, b = cj + dj;
                    if (a < 0 || b < 0 || a >= n || b >= m) continue;
                    var kk = b * n + a;
                    if (seen[kk] || !open[kk]) continue;
                    seen[kk] = true; q.Enqueue(kk);
                }
            }
            return seen;
        }

        private static bool BareNear(bool[] r, PlacePlan plan, int i, int j)
        {
            for (var dj = -1; dj <= 1; dj++)
                for (var di = -1; di <= 1; di++)
                {
                    int a = i + di, b = j + dj;
                    if (a >= 0 && b >= 0 && a < plan.Columns && b < plan.Rows && r[b * plan.Columns + a]) return true;
                }
            return false;
        }

        [Test]
        public void AViewKeepsToThePhonesBudget()
        {
            foreach (var id in Maps)
            {
                var (_, city) = Build(id);
                var draws = CityKit.EstimateDraws(city);
                var tris = city.Pieces.Where(p => p.Cell >= 0).GroupBy(p => p.Cell).Select(g => g.Sum(Tris)).DefaultIfEmpty(0).Max();
                Console.WriteLine($"{id}: {city.Pieces.Count} pieces, {city.Towers.Count} towers, worst view {draws} draws, worst cell {tris} triangles");
                Assert.That(draws, Is.LessThanOrEqualTo(CityKit.DrawBudget), $"{id}: a view costs {draws} draws");
                Assert.That(tris, Is.LessThan(16000), $"{id}: a cell of {tris} triangles");
                Assert.That(city.Pieces.Select(p => p.Key).Distinct().Count(), Is.LessThanOrEqualTo(CityKit.Keys.Length));
            }
        }

        private static int Tris(CityKit.Piece p) => p.Shape == CityKit.Shape.Quad ? 2 : p.Shape == CityKit.Shape.Prism ? p.Sides * 2 + (p.Sides - 2) : p.Bottom ? 12 : 10;

        [Test]
        public void TheBorderIsTheMapsEdgeNotARoom()
        {
            // the Stacks are walled all round: read as authored they are one room of two thousand tiles
            var stacks = Registry.Maps["md_stacks"];
            Assert.That(PlacePlan.Build(stacks).Rooms.Max(r => r.Tiles), Is.GreaterThan(1000), "(the map as authored)");
            var plan = PlacePlan.Build(CityKit.Prepare(stacks));
            Assert.That(plan.Rooms.Count == 0 || plan.Rooms.Max(r => r.Tiles) < 300, Is.True, "the Stacks' ground is open, not a room");
            Assert.That(plan.Masses.Count(m => Math.Min(m.X1 - m.X0, m.Z1 - m.Z0) > 4.5f), Is.GreaterThan(1), "its megablocks stay whole to the edge");
            foreach (var id in new[] { "shale", "c9_mouth", "ninebridge" }) Assert.That(CityKit.Prepare(Registry.Maps[id]), Is.SameAs(Registry.Maps[id]), $"{id} is read as it is");
            // the markers do not move
            foreach (var id in Maps)
            {
                var a = PlacePlan.Build(Registry.Maps[id]).Markers.Select(m => (m.Kind, m.Id, m.X, m.Z)).ToList();
                var b = PlacePlan.Build(CityKit.Prepare(Registry.Maps[id])).Markers.Select(m => (m.Kind, m.Id, m.X, m.Z)).ToList();
                Assert.That(b, Is.EqualTo(a), id);
            }
        }

        [Test]
        public void TheCanalIsCutAndBridged()
        {
            var (plan, city) = Build("md_lantern");
            Assert.That(city.Pools.Count, Is.GreaterThan(0), "the canal");
            Assert.That(city.Bridge.Count(x => x), Is.GreaterThanOrEqualTo(8), "its bridges");
            for (var k = 0; k < plan.Columns * plan.Rows; k++)
            {
                if (!city.Wet[k] && !city.Bridge[k]) continue;
                var (x, z) = plan.Centre(k % plan.Columns, k / plan.Columns);
                Assert.That(city.Pools.Any(p => x > p.X0 && x < p.X1 && z > p.Z0 && z < p.Z1), Is.True, $"a wet tile at ({x}, {z}) outside the cut");
            }
            foreach (var p in city.Pools) Assert.That(p.Level, Is.GreaterThan(p.Floor), "water over the channel's floor");
            foreach (var m in plan.Markers.Where(m => m.W == 0))
            {
                int i = (int)Math.Floor((m.X + plan.Width / 2) / PlacePlan.Tile), j = (int)Math.Floor((plan.Depth / 2 - m.Z) / PlacePlan.Tile);
                if (!city.Wet[j * plan.Columns + i]) continue;
                // a thing out on the water (the boat) has a pier to it
                Assert.That(m.Kind == "talk" || m.Kind == "container", Is.True, $"the {m.Kind} {m.Id} in the water");
                var pier = new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }.Any(d => city.Bridge[(j + d.Item2) * plan.Columns + i + d.Item1]);
                Assert.That(pier, Is.True, $"the {m.Kind} {m.Id} out on the water with no pier to it");
            }
            var boat = plan.Items.FindIndex(it => it.Id == "lr_boat");
            Assert.That(city.Afloat, Does.Contain(boat), "the boat floats (the kit makes it)");
        }

        [Test]
        public void TheWallAndTheMegablocksStandTall()
        {
            var precinct = Build("md_precinct").City;
            Assert.That(precinct.Masses.Count(m => m.Kind == "wall" && m.Height >= 9f), Is.EqualTo(2), "the Precinct's Wall, both sides of its gate");
            var stacks = Build("md_stacks").City;
            Assert.That(stacks.Masses.Where(m => m.Kind == "megablock").Select(m => m.Height).DefaultIfEmpty(0).Min(), Is.GreaterThan(20f), "the Stacks' megablocks");
            Assert.That(stacks.Masses.All(m => m.Reveal), Is.True);
        }

        /// <summary>The skyline from the world's own layout, when its files are here (they are not in every checkout).</summary>
        [Test]
        public void TheDistrictsAreWherePlacesPutThem()
        {
            var dir = ContentFixture.ContentDir();
            var world = Path.Combine(Path.GetDirectoryName(dir) ?? dir, "world", "places.json");
            if (!File.Exists(world)) Assert.Ignore("no world layout in this checkout");
            var layout = WorldLayout.Read(File.ReadAllText(world), File.ReadAllText(Path.Combine(Path.GetDirectoryName(world), "roads.json")));
            foreach (var (place, map, area) in Districts)
            {
                Assert.That(layout.Places.TryGetValue(place, out var p), Is.True, place);
                Assert.That(p.Map, Is.EqualTo(map), place);
                Assert.That((p.Centre[0], p.Centre[1], p.Size[0], p.Size[1]), Is.EqualTo((area.X, area.Z, area.W, area.D)), $"{place} moved: update CityKitTests.Districts");
            }
        }
    }
}
