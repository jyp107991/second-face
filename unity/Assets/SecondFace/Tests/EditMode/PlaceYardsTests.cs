using System;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>The yards' scenes (play-ch1 T43): open ground dressed, the ways people walk and the story's things left clear.</summary>
    public class PlaceYardsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [TestCase("c9_mouth")]
        [TestCase("shale")]
        [TestCase("overpass")]
        public void YardsAreDressedOffTheWays(string mapId)
        {
            var plan = PlacePlan.Build(Registry.Maps[mapId]);
            var a = PlaceYards.For(plan, 7);
            var b = PlaceYards.For(plan, 7);
            Assert.That(a.Count, Is.GreaterThan(4), $"{mapId}: its yards hold some scenes");
            Assert.That(a.Select(v => (v.Kind, v.X, v.Z)), Is.EqualTo(b.Select(v => (v.Kind, v.X, v.Z))), "the same place is dressed the same way");
            Assert.That(a.Select(v => v.Kind).Distinct().Count(), Is.GreaterThan(2), "more than one kind of scene");
            foreach (var v in a)
            {
                foreach (var m in plan.Markers)
                    Assert.That(Math.Sqrt((m.X - v.X) * (m.X - v.X) + (m.Z - v.Z) * (m.Z - v.Z)), Is.GreaterThan(v.Radius + PlaceYards.KeepClear - 1e-3), $"{mapId}: a {v.Kind} on the {m.Kind} {m.Id}");
                foreach (var it in plan.Items)
                    Assert.That(Math.Sqrt((it.X - v.X) * (it.X - v.X) + (it.Z - v.Z) * (it.Z - v.Z)), Is.GreaterThan(v.Radius + PlaceYards.KeepClear - 1e-3), $"{mapId}: a {v.Kind} on the story's {it.Kind}");
                Assert.That(plan.RoomOf((v.X + plan.Width / 2) / PlacePlan.Tile, (plan.Depth / 2 - v.Z) / PlacePlan.Tile), Is.EqualTo(-1), $"{mapId}: a {v.Kind} inside a building");
            }
            for (var i = 0; i < a.Count; i++)
                for (var j = i + 1; j < a.Count; j++)
                    Assert.That(Math.Sqrt((a[i].X - a[j].X) * (a[i].X - a[j].X) + (a[i].Z - a[j].Z) * (a[i].Z - a[j].Z)), Is.GreaterThan(a[i].Radius + a[j].Radius), $"{mapId}: two scenes on each other");
        }
    }
}
