using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Inventory;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>P6.1: things on the ground: dropped where the player stands, joined to a pile near by, kept with the
    /// game, taken back, and an emptied pile gone.</summary>
    public class GroundTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void ThingsDroppedLieWhereTheyFellAndJoinAPileNearBy()
        {
            var g = States.NewGame("shale", 0, 0);
            var inv = g.Pc.Inventory;
            Inv.AddItem(inv, Inv.MakeItem("c_water", 3));
            Inv.AddItem(inv, Inv.MakeItem("j_scrap", 2));
            var pile = Ground.Drop(g, inv, inv.Items.FindIndex(i => i.Def == "c_water"), 1, -312.46f, 4.02f, 88.91f);
            Assert.That(pile, Is.Not.Null);
            Assert.That(Inv.CountItem(inv, "c_water"), Is.EqualTo(2), "one of the stack");
            Assert.That(Ground.Where(pile.Key, out var x, out var y, out var z), Is.True);
            Assert.That(x, Is.EqualTo(-312.5f).Within(1e-4));
            Assert.That(y, Is.EqualTo(4.0f).Within(1e-4));
            Assert.That(z, Is.EqualTo(88.9f).Within(1e-4));
            // a step away it joins the same pile; a floor below or ten metres off it does not
            var again = Ground.Drop(g, inv, inv.Items.FindIndex(i => i.Def == "j_scrap"), 2, -311.6f, 4.1f, 89.3f);
            Assert.That(again.Key, Is.EqualTo(pile.Key), "joined");
            Assert.That(pile.Inv.Items.Count, Is.EqualTo(2));
            Assert.That(Inv.CountItem(inv, "j_scrap"), Is.EqualTo(0), "the whole stack");
            Assert.That(Ground.Drop(g, inv, 0, 1, -311.6f, 0.5f, 89.3f).Key, Is.Not.EqualTo(pile.Key), "a floor below");
            Assert.That(Ground.Drop(g, inv, 0, 1, -300f, 4f, 89f).Key, Is.Not.EqualTo(pile.Key), "ten metres off");
            Assert.That(Ground.Piles(g).Count, Is.EqualTo(3));
            Assert.That(Ground.Drop(g, inv, 5, 1, 0, 0, 0), Is.Null, "nothing there to drop");
            // kept with the game
            var raw = SaveManager.Serialise(new SaveFile { Version = Migrations.CurrentVersion, Meta = new SaveMeta(), State = g });
            var back = SaveManager.Parse(raw).State;
            Assert.That(Ground.Piles(back).Select(p => p.Key), Is.EquivalentTo(Ground.Piles(g).Select(p => p.Key)));
            // taken back, the emptied pile goes
            Containers.MoveAll(pile.Inv, inv);
            Assert.That(Inv.CountItem(inv, "j_scrap"), Is.EqualTo(2));
            Assert.That(Ground.Piles(g).Count, Is.EqualTo(2), "an empty pile is no pile");
            Assert.That(Ground.Tidy(g), Is.EqualTo(1));
            Assert.That(g.Containers.ContainsKey(pile.Key), Is.False);
            Assert.That(Ground.Where("shale/water_crate", out _, out _, out _), Is.False, "a container is not a pile");
        }
    }
}
