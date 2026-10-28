using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Npc;
using SecondFace.Core.Scene;
using SecondFace.Core.Stats;

namespace SecondFace.Tests
{
    public class PartyTests
    {
        private static Grid Map() => new Grid(new MapDef
        {
            Id = "t", Name = "t",
            Layout = new List<string> { ".......", "..###..", ".......", "......." },
            Legend = new Dictionary<string, TileDef> { ["."] = new TileDef { Floor = "sand" }, ["#"] = new TileDef { Wall = "concrete" } },
            Spawns = new List<SpawnDef> { new SpawnDef { Id = "s", X = 0, Y = 0 } },
            Ambience = new AmbienceDef(),
        });

        [Test]
        public void FindsAFreeTileBesideAnOccupiedOne()
        {
            var g = Map();
            g.Occupied[g.Index(3, 2)] = "player";
            Assert.That(Party.FreeTileNear(g, 3, 2, "player"), Is.EqualTo(new Cell(3, 2))); // ignore = the occupant: the tile itself is fine for them
            var u = Party.FreeTileNear(g, 3, 2).Value;
            Assert.That(System.Math.Max(System.Math.Abs(u.X - 3), System.Math.Abs(u.Y - 2)), Is.EqualTo(1));
            Assert.That(g.Passable(u.X, u.Y), Is.True);
        }

        [Test]
        public void FollowsOnlyWhenFarEnoughTrailingBehindTheLeader()
        {
            Assert.That(Party.ShouldFollow(2, false), Is.False);
            Assert.That(Party.ShouldFollow(3, false), Is.True);
            Assert.That(Party.ShouldFollow(3, true), Is.False);
            var g = Map();
            g.Occupied[g.Index(0, 3)] = "c";
            // Leader at (3,3) facing +z (south): the trailing tile is (3,2), behind them.
            var p = Party.FollowPath(g, "c", 0, 3, 3, 3, 0);
            Assert.That(p, Is.Not.Null);
            Assert.That(p[p.Count - 1], Is.EqualTo(new Cell(3, 2)));
        }

        [Test]
        public void ADownedCompanionGetsUpWoundedNeverDead()
        {
            ContentFixture.Db();
            var s = Sheet.Empty("t");
            s.Hp = 0;
            Assert.That(Party.ReviveDowned(s, 100), Is.True);
            Assert.That(s.Hp, Is.GreaterThan(0));
            Assert.That(s.Effects.Any(e => e.Id == "downed" && e.Until == 100 + 1440), Is.True);
            Assert.That(Party.ReviveDowned(s, 100), Is.False);
        }
    }
}
