using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.Inventory;
using SecondFace.Core.Scene;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>P6.1: containers in places (locks, the first filling, taking and putting back).</summary>
    public class ContainersTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static ContainerDef Def(int? lockDc, params (string id, int n)[] items)
        {
            var d = new ContainerDef { Name = "Shelf", Items = new List<JArray>(), Lock = lockDc, Tolls = 7 };
            foreach (var (id, n) in items) d.Items.Add(new JArray(id, n));
            return d;
        }

        [Test]
        public void TheFirstOpeningFillsItAndItKeepsWhatIsLeft()
        {
            var g = States.NewGame("shale", 0, 0);
            var def = Def(null, ("c_water", 2), ("j_scrap", 3));
            var o = Containers.Open(g, "shale", "shelf", def, new Rng(1));
            Assert.That(o.Open, Is.True);
            Assert.That(o.Check, Is.Null, "no lock, no check");
            Assert.That(o.Inv.Items.Count, Is.EqualTo(2));
            Assert.That(o.Inv.Tolls, Is.EqualTo(7));
            Assert.That(Containers.Move(o.Inv, 0, g.Pc.Inventory, 1), Is.True, "one water taken");
            Assert.That(Inv.CountItem(g.Pc.Inventory, "c_water"), Is.EqualTo(1));
            var again = Containers.Open(g, "shale", "shelf", def, new Rng(1));
            Assert.That(again.Inv, Is.SameAs(o.Inv), "the same contents (kept in the game)");
            Assert.That(Inv.CountItem(again.Inv, "c_water"), Is.EqualTo(1), "not filled again");
            Assert.That(Containers.MoveAll(again.Inv, g.Pc.Inventory), Is.EqualTo(2));
            Assert.That(again.Inv.Items, Is.Empty);
            Assert.That(g.Pc.Inventory.Tolls, Is.EqualTo(7), "the Tolls too");
            Assert.That(g.Containers.ContainsKey(Containers.Key("shale", "shelf")), Is.True);
        }

        [Test]
        public void ALockTakesLocksAndOncePickedStaysOpen()
        {
            var g = States.NewGame("shale", 0, 0);
            var hard = Def(95, ("a_38", 10));
            var m0 = g.Minutes;
            var o = Containers.Open(g, "shale", "locker", hard, new Rng(2));
            Assert.That(o.Open, Is.False, "far beyond a new character's Locks");
            Assert.That(o.Check, Is.Not.Null);
            Assert.That(o.Check.Value.Dc, Is.EqualTo(95));
            Assert.That(g.Minutes, Is.EqualTo(m0 + 2), "a try takes two minutes");
            Assert.That(Containers.Locked(g, "shale", "locker", hard), Is.True);
            Assert.That(g.Containers.ContainsKey(Containers.Key("shale", "locker")), Is.False, "nothing seen");
            // an easy one: picked, the XP, and it stays open without another check
            var easy = Def(5, ("a_38", 10));
            var xp0 = g.Pc.Sheet.Xp;
            var p = Containers.Open(g, "shale", "crate", easy, new Rng(3));
            Assert.That(p.Open && p.Picked, Is.True);
            Assert.That(p.Xp, Is.EqualTo(10 + 3), "10 + half the lock, rounded up at a half");
            Assert.That(g.Pc.Sheet.Xp, Is.EqualTo(xp0 + p.Xp));
            Assert.That(Containers.Locked(g, "shale", "crate", easy), Is.False);
            var q = Containers.Open(g, "shale", "crate", easy, new Rng(4));
            Assert.That(q.Check, Is.Null, "no second check");
            Assert.That(q.Picked, Is.False);
        }
    }
}
