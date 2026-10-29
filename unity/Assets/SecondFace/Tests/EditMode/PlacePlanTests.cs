using System;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Scene;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>A place's layout read in world terms (step 20): Shale's buildings become rooms closed by walls with doors
    /// and windows, its fences keep their gates, the rock rim is gone, and every prop, light and marker lands inside the
    /// place, in the room it was drawn in; every authored map reads.</summary>
    public class PlacePlanTests
    {
        private static JObject _maps;

        private static MapDef Map(string id)
        {
            _maps ??= JObject.Parse(File.ReadAllText(Find("unity/Assets/StreamingAssets/content/maps.json")));
            return _maps[id].ToObject<MapDef>();
        }

        [Test]
        public void ShalesBuildingsAreRoomsWithDoorsAndWindows()
        {
            var plan = PlacePlan.Build(Map("shale"));
            Assert.That((plan.Columns, plan.Rows), Is.EqualTo((64, 52)));
            Assert.That((plan.Width, plan.Depth), Is.EqualTo((128f, 104f)));
            // eight houses of adobe, the saloon, two scrap sheds, the brick lock-up, the concrete hall
            Assert.That(plan.Rooms.Count, Is.EqualTo(14), string.Join("; ", plan.Rooms.Select(r => $"{r.Wall} {r.Width}x{r.Depth}")));
            Assert.That(plan.Rooms.All(r => r.Rectangular), "every room is a rectangle");
            Assert.That(plan.Rooms.Count(r => r.Wall == "adobe"), Is.EqualTo(9));
            Assert.That(plan.Rooms.All(r => r.Height >= PlacePlan.Storey), "a storey at least under every roof");
            foreach (var room in plan.Rooms)
            {
                var walls = plan.Walls.Where(w => w.Room == room.Index).ToList();
                Assert.That(walls.Count(w => w.Exterior), Is.GreaterThanOrEqualTo(4), $"room {room.Index} ({room.Wall}) is closed on four sides");
                Assert.That(walls.SelectMany(w => w.Openings).Count(o => o.Kind == PlacePlan.OpeningKind.Door), Is.GreaterThanOrEqualTo(1), $"room {room.Index} ({room.Wall}) has a door");
            }
            Assert.That(plan.Walls.SelectMany(w => w.Openings).Count(o => o.Kind == PlacePlan.OpeningKind.Window), Is.GreaterThan(10), "windows on the outer walls");
            Assert.That(plan.Walls.Any(w => w.Kind == "rock"), Is.False, "the rock rim (the web map's edge) is dropped");
            Assert.That(plan.Walls.Where(w => !w.Exterior && w.Room >= 0).Count(), Is.GreaterThanOrEqualTo(1), "the saloon's partition");
            // openings sit inside their wall and clear of its ends
            foreach (var w in plan.Walls)
                foreach (var o in w.Openings)
                    Assert.That(o.At - o.Width / 2 >= -0.01f && o.At + o.Width / 2 <= w.Length + 0.01f, $"{w.Kind} wall {w.Length} m: opening at {o.At}");
        }

        [Test]
        public void ShalesFencesKeepTheirGatesAndTheLockUpItsCell()
        {
            var plan = PlacePlan.Build(Map("shale"));
            Assert.That(plan.Fences.Count, Is.GreaterThanOrEqualTo(8));
            Assert.That(plan.Fences.Sum(f => f.Gates.Count), Is.GreaterThanOrEqualTo(3), "the corral's gate, the yard's two gates");
            var lockUp = plan.Rooms.Single(r => r.Wall == "brick");
            Assert.That(plan.Fences.Count(f => f.Room == lockUp.Index), Is.GreaterThanOrEqualTo(2), "the cell's bars inside the lock-up");
            Assert.That(plan.Fences.Where(f => f.Room == lockUp.Index).Sum(f => f.Gates.Count), Is.EqualTo(1), "the cell's door");
        }

        [Test]
        public void ShalesThingsLandInsideThePlaceAndInTheirRooms()
        {
            var map = Map("shale");
            var plan = PlacePlan.Build(map);
            Assert.That(plan.Items.Count, Is.EqualTo(map.Props.Count));
            Assert.That(plan.Lamps.Count, Is.EqualTo(map.Lights.Count));
            foreach (var i in plan.Items)
                Assert.That(Math.Abs(i.X) <= plan.Width / 2 && Math.Abs(i.Z) <= plan.Depth / 2, $"{i.Kind} at {i.X}, {i.Z}");
            // the bar's counters stand in the saloon (other counters are stalls in the street), the pumps in the open
            var saloon = plan.Rooms.Single(r => r.Wall == "wood");
            Assert.That(map.Props.Where(p => p.Kind == "counter" && p.Y == 13 && p.X >= 9 && p.X <= 14).Count(), Is.GreaterThanOrEqualTo(3));
            Assert.That(plan.Items.Where(i => i.Kind == "counter" && i.Z == plan.Centre(0, 13).Z && i.X < -30).All(i => i.Room == saloon.Index), "the bar in the saloon");
            Assert.That(plan.Items.Where(i => i.Kind == "pump").All(i => i.Room == -1), "pumps outside");
            Assert.That(plan.Items.Single(i => i.Id == "pump_a").Yaw, Is.EqualTo(0f));
            // north is +z: the top row of the map is the place's north edge
            var (x0, z0) = plan.Centre(0, 0);
            Assert.That((x0, z0), Is.EqualTo((-63f, 51f)));
            Assert.That(plan.Markers.Any(m => m.Kind == "spawn" && m.Id == "start"));
            Assert.That(plan.Markers.Count(m => m.Kind == "talk"), Is.EqualTo(map.Talk.Count(t => map.Props.Any(p => p.Id == t.Key))));
            Assert.That(plan.Markers.Any(m => m.Kind == "container" && m.Id == "bar_shelf"));
            // a fire is somewhere to camp: one marker each, named by its id or where it stands, on the fire
            var fires = plan.Markers.Where(m => m.Kind == "fire").ToList();
            Assert.That(fires.Count, Is.EqualTo(map.Props.Count(p => Camp.IsFire(p.Kind))).And.EqualTo(4));
            Assert.That(fires.Select(f => f.Id).Distinct().Count(), Is.EqualTo(fires.Count));
            Assert.That(fires.All(f => plan.Items.Any(i => Camp.IsFire(i.Kind) && i.X == f.X && i.Z == f.Z)));
            // a chair is somewhere to sit, turned as the chair is
            var seats = plan.Markers.Where(m => m.Kind == "seat").ToList();
            Assert.That(seats.Count, Is.EqualTo(map.Props.Count(p => p.Kind == "chair")).And.EqualTo(11));
            Assert.That(seats.All(s => plan.Items.Any(i => i.Kind == "chair" && i.X == s.X && i.Z == s.Z && i.Yaw == s.Yaw)));
            // the ground outside: the street is dirt, the rooms have none
            Assert.That(plan.Ground.Count(gd => gd == "dirt"), Is.GreaterThan(200));
            Assert.That(Enumerable.Range(0, plan.Ground.Length).Where(k => plan.RoomAt[k] >= 0).All(k => plan.Ground[k] == null));
        }

        /// <summary>Rock is a mass, never a wall; walls two tiles thick are blocks, not lattices; an exit to another place
        /// goes through the wall beside it (the shelter's vault door is drawn as wall in its map).</summary>
        [Test]
        public void RockAndThickWallsAreMassesAndExitsOpenTheirWalls()
        {
            var mouth = PlacePlan.Build(Map("c9_mouth"));
            Assert.That(mouth.Walls.Any(w => w.Kind == "rock"), Is.False, "no rock walls");
            Assert.That(mouth.Masses.Count(m => m.Kind == "rock"), Is.GreaterThan(0), "the rock round the mouth");
            Assert.That(mouth.Masses.Any(m => m.Kind == "concrete"), Is.True, "the bunker front, two tiles thick, is a block");
            var shelter = PlacePlan.Build(Map("cistern9"));
            Assert.That(shelter.Masses.Any(m => m.Kind == "concrete"), Is.True, "the shelter's thick walls are blocks");
            // the great door: the three tiles of its wall (row 0, from x = 5) are open
            var (x, z) = shelter.Centre(6, 0);
            Assert.That(shelter.Walls.Concat<object>(shelter.Masses).Count(), Is.GreaterThan(0));
            Assert.That(shelter.Masses.Any(m => x > m.X0 && x < m.X1 && z > m.Z0 && z < m.Z1), Is.False, "nothing solid in the great door");
            Assert.That(shelter.Walls.Any(w => Math.Abs(w.Az - z) < 0.01f && Math.Abs(w.Bz - z) < 0.01f && x > Math.Min(w.Ax, w.Bx) && x < Math.Max(w.Ax, w.Bx)
                && !w.Openings.Any(o => Math.Abs(Math.Min(w.Ax, w.Bx) + o.At - x) < o.Width / 2)), Is.False, "no wall across the great door");
        }

        [Test]
        public void EveryAuthoredMapReads()
        {
            _maps ??= JObject.Parse(File.ReadAllText(Find("unity/Assets/StreamingAssets/content/maps.json")));
            foreach (var p in _maps.Properties())
            {
                var map = p.Value.ToObject<MapDef>();
                var plan = PlacePlan.Build(map);
                Assert.That(plan.Items.Count, Is.EqualTo(map.Props?.Count ?? 0).Or.GreaterThan(map.Props?.Count ?? 0), p.Name);
                foreach (var w in plan.Walls)
                    Assert.That(w.Length >= 0 && w.Height > 0, $"{p.Name}: a {w.Kind} wall");
                TestContext.WriteLine($"{p.Name}: {plan.Rooms.Count} rooms ({plan.Rooms.Count(r => !r.Rectangular)} not rectangular), {plan.Walls.Count} walls, {plan.Masses.Count} masses, " +
                    $"{plan.Walls.SelectMany(w => w.Openings).Count(o => o.Kind == PlacePlan.OpeningKind.Door)} doors, {plan.Fences.Count} fences, {plan.Items.Count} props");
            }
        }

        private static string Find(string repoRel)
        {
            foreach (var start in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
                for (var dir = new DirectoryInfo(start); dir != null; dir = dir.Parent)
                    foreach (var rel in new[] { repoRel, repoRel.StartsWith("unity/") ? repoRel.Substring("unity/".Length) : "../" + repoRel })
                    {
                        var path = Path.Combine(dir.FullName, rel);
                        if (File.Exists(path)) return path;
                    }
            throw new FileNotFoundException($"{repoRel} not found (npm run export writes it)");
        }
    }
}
