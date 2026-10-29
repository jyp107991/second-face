using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>P6.3: whose things are whose, and what a theft costs when it is seen.</summary>
    public class TheftTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void ContainersBelongToWhoeverKeepsTheirRoom()
        {
            var map = Registry.Maps["shale"];
            var plan = PlacePlan.Build(map);
            var owners = Owners.Of(map, plan);
            TestContext.WriteLine(string.Join(", ", owners.Select(kv => $"{kv.Key}: {kv.Value}")));
            var residents = map.Npcs.Where(p => p.If == null).Select(p => p.Def).ToHashSet();
            Assert.That(owners.Count, Is.GreaterThanOrEqualTo(3), "the town's rooms have keepers");
            foreach (var (id, who) in owners) Assert.That(residents.Contains(who), Is.True, $"{id}: {who} lives here");
            Assert.That(owners["bar_shelf"], Is.EqualTo("npc_sh_03"), "the bar's shelf is the barkeep's");
            Assert.That(owners["militia_locker"], Is.EqualTo("npc_sh_01"), "the militia's locker the sheriff's");
            var g = States.NewGame("shale", 0, 0);
            Assert.That(Owners.Now(g, map, "room_locker", owners), Is.EqualTo("npc_sh_03"), "the back room's locker is the barkeep's");
            g.SetFlag("shale_room", true);
            Assert.That(Owners.Now(g, map, "room_locker", owners), Is.Null, "until the room is rented: then it is yours");
            Assert.That(plan.Markers.Any(m => m.Kind == "container" && !owners.ContainsKey(m.Id)), Is.True, "some things are nobody's");
        }

        [Test]
        public void ASeenTheftCostsTrustAndTravels()
        {
            var g = States.NewGame("shale", 0, 0);
            Assert.That(Theft.Taken(g, "shale", "Shale", "npc_sh_03", new List<string>(), 40), Is.Null, "unseen: no word of it");
            Assert.That(g.World.Memories["npc_sh_03"].Single().Tag, Is.EqualTo("robbed"), "the owner finds it gone");
            Assert.That(g.World.Relations.ContainsKey("npc_sh_03"), Is.False, "and blames nobody yet");
            Assert.That(Frontier.Standing(g, "shale"), Is.EqualTo(0));

            var news = Theft.Taken(g, "shale", "Shale", "npc_sh_03", new List<string> { "npc_sh_10" }, 60);
            Assert.That(news, Is.Not.Null);
            Assert.That(news.About, Is.EqualTo("player"));
            Assert.That(g.World.Memories["npc_sh_10"].Any(m => m.Tag == "saw_theft"), Is.True, "the witness remembers");
            Assert.That(g.World.Relations["npc_sh_10"].Trust, Is.EqualTo(Theft.WitnessTrust));
            Assert.That(g.World.Memories["npc_sh_03"].Any(m => m.Tag == "robbed_by_player" && m.Source == "told"), Is.True, "the owner is told");
            Assert.That(g.World.Relations["npc_sh_03"].Trust, Is.EqualTo(Theft.OwnerToldTrust));
            Assert.That(Frontier.Standing(g, "shale"), Is.LessThan(0), "the town thinks less of the player");

            var before = Frontier.Standing(g, "shale");
            Theft.Taken(g, "shale", "Shale", "npc_sh_03", new List<string> { "npc_sh_03" }, 200);
            Assert.That(g.World.Relations["npc_sh_03"].Trust, Is.EqualTo(Theft.OwnerToldTrust + Theft.OwnerSawTrust), "seen by the owner: worse");
            Assert.That(Frontier.Standing(g, "shale"), Is.LessThan(before), "a bigger take, a bigger story");
        }
    }
}
