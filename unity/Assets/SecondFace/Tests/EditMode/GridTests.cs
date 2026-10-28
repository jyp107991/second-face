using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Scene;

namespace SecondFace.Tests
{
    public class GridTests
    {
        private static MapDef Map() => new MapDef
        {
            Id = "t", Name = "t",
            Layout = new List<string> { ".....", ".###.", "....." },
            Legend = new Dictionary<string, TileDef> { ["."] = new TileDef { Floor = "sand" }, ["#"] = new TileDef { Wall = "concrete" } },
            Spawns = new List<SpawnDef> { new SpawnDef { Id = "s", X = 0, Y = 0 } },
            Ambience = new AmbienceDef(),
        };

        [Test]
        public void PathsAroundWalls()
        {
            var g = new Grid(Map());
            var p = g.FindPath(0, 1, 4, 1);
            Assert.That(p, Is.Not.Null);
            Assert.That(p[p.Count - 1], Is.EqualTo(new Cell(4, 1)));
            foreach (var s in p) Assert.That(g.Get(s.X, s.Y).Walkable, Is.True);
        }

        [Test]
        public void RespectsMaxCost()
        {
            var g = new Grid(Map());
            Assert.That(g.FindPath(0, 1, 4, 1, new PathOpts { MaxCost = 3 }), Is.Null);
            Assert.That(g.FindPath(0, 1, 4, 1, new PathOpts { MaxCost = 6 }), Is.Not.Null);
        }

        [Test]
        public void BlocksLineOfSightThroughWalls()
        {
            var g = new Grid(Map());
            Assert.That(g.LineOfSight(2, 0, 2, 2), Is.False);
            Assert.That(g.LineOfSight(0, 0, 4, 0), Is.True);
        }

        [Test]
        public void TreatsOccupiedTilesAsBlocked()
        {
            var g = new Grid(Map());
            g.Occupied[g.Index(1, 0)] = "npc";
            Assert.That(g.Passable(1, 0), Is.False);
            Assert.That(g.Passable(1, 0, "npc"), Is.True);
            // A path may end next to an occupied goal when asked.
            Assert.That(g.FindPath(0, 0, 1, 0), Is.Null);
            var p = g.FindPath(3, 0, 1, 0, new PathOpts { AdjacentOk = true });
            Assert.That(p, Is.Not.Null);
            Assert.That(p[p.Count - 1], Is.EqualTo(new Cell(2, 0)));
        }

        [Test]
        public void DiagonalsDoNotCutWallCorners()
        {
            var g = new Grid(Map());
            // From (0,0) to (1,1) is a wall; (0,2) is reachable only round the wall's west end.
            var p = g.FindPath(0, 0, 0, 2);
            Assert.That(p, Is.Not.Null);
            Assert.That(p.Select(c => (c.X, c.Y)), Does.Contain((0, 1)));
        }

        [Test]
        public void LowWallsAndFencesGiveCoverWithoutBlockingSight()
        {
            var low = Grid.MakeTile(0, 0, new TileDef { Wall = "concrete", WallHeight = 1.0 });
            Assert.That(low.Walkable, Is.False);
            Assert.That(low.Opaque, Is.False);
            Assert.That(low.Cover, Is.EqualTo(CoverKind.Half));
            var fence = Grid.MakeTile(0, 0, new TileDef { Wall = "fence" });
            Assert.That(fence.Opaque, Is.False);
            var crate = Grid.MakeTile(0, 0, new TileDef { Floor = "sand", Prop = "crate" });
            Assert.That(crate.Walkable, Is.False);
            Assert.That(crate.Cover, Is.EqualTo(CoverKind.Half));
            var sign = Grid.MakeTile(0, 0, new TileDef { Floor = "sand", Prop = "sign" });
            Assert.That(sign.Walkable, Is.True);
            var forced = Grid.MakeTile(0, 0, new TileDef { Floor = "sand", Prop = "crate", Blocks = false });
            Assert.That(forced.Walkable, Is.True);
        }

        [Test]
        public void StrippingTheRimOpensTheBorderAsTheCommonestFloor()
        {
            var m = Map();
            m.Layout = new List<string> { "#####", "#rrr#", "#r.r#", "#####" };
            m.Legend["r"] = new TileDef { Floor = "rubble" };
            var g = new Grid(m, stripRim: true);
            Assert.That(g.Get(0, 0).Walkable, Is.True);
            Assert.That(g.Get(0, 0).Def.Floor, Is.EqualTo("rubble"));
            Assert.That(new Grid(m).Get(0, 0).Walkable, Is.False);
        }

        [Test]
        public void EveryAuthoredMapDeserialisesStrictlyAndBuildsAGrid()
        {
            var db = ContentFixture.Db();
            var maps = Registry.Table<MapDef>(db, "maps", strict: true);
            Assert.That(maps.Count, Is.GreaterThan(20));
            foreach (var m in maps.Values)
            {
                var g = new Grid(m);
                Assert.That(g.Width * g.Height, Is.EqualTo(g.Tiles.Length), m.Id);
                foreach (var s in m.Spawns) Assert.That(g.Get(s.X, s.Y)?.Walkable, Is.True, $"{m.Id} spawn {s.Id}");
                foreach (var kv in m.Spots ?? new Dictionary<string, Core.Npc.Tile>()) Assert.That(g.InBounds(kv.Value.X, kv.Value.Y), Is.True, $"{m.Id} spot {kv.Key}");
                foreach (var e in m.Exits ?? new List<ExitDef>()) Assert.That(e.To.WorldMap == true || (e.To.Location != null && maps.ContainsKey(e.To.Location)), Is.True, $"{m.Id} exit to {e.To.Location}");
            }
            // The first map's spawns are mutually reachable on foot.
            var c9 = new Grid(maps["cistern9"]);
            var a = maps["cistern9"].Spawns[0];
            foreach (var s in maps["cistern9"].Spawns.Skip(1))
                Assert.That(c9.FindPath(a.X, a.Y, s.X, s.Y, new PathOpts { AdjacentOk = true }), Is.Not.Null, s.Id);
        }
    }
}
