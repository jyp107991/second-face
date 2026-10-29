using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    /// <summary>P6.2: the people's days: whose routine, the entry at an hour, out of sight when away or asleep, sex from
    /// the look, a body each by sex and age.</summary>
    public class RoutineTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void ShaleKeepsItsHours()
        {
            var map = Registry.Maps["shale"];
            var ada = map.Npcs.First(p => p.Def == "npc_sh_01");
            var def = Registry.Npcs["npc_sh_01"];
            Assert.That(Routine.Of(ada, def), Is.SameAs(def.Schedule), "the person's own routine when the placement has none");
            Assert.That(Routine.Now(ada, def, 7).Spot, Is.EqualTo("street_c"));
            Assert.That(Routine.Now(ada, def, 7).Activity, Is.EqualTo("patrol"));
            Assert.That(Routine.Now(ada, def, 12).Spot, Is.EqualTo("sheriff_desk"));
            Assert.That(Routine.Now(ada, def, 23).Activity, Is.EqualTo("sleep"));
            Assert.That(Routine.Hidden(Routine.Now(ada, def, 23)), Is.True, "asleep at home");
            Assert.That(Routine.Hidden(Routine.Now(ada, def, 12)), Is.False);
            Assert.That(Routine.Now(ada, def, 30).Spot, Is.EqualTo("street_c"), "hours past a day wrap");
            var pike = Registry.Npcs["npc_sh_04"];
            Assert.That(Routine.Now(map.Npcs.First(p => p.Def == "npc_sh_04"), pike, 23).Activity, Is.EqualTo("away"));
            // every spot the routine of one of Shale's own (always there) names is one of the map's spots; a visitor
            // (a placement with a condition) may name another map's, and stays where placed
            foreach (var p in map.Npcs.Where(p => p.If == null))
                foreach (var e in Routine.Of(p, Registry.Npcs[p.Def]) ?? new List<Core.Npc.ScheduleEntry>())
                    if (e.Spot != null) Assert.That(map.Spots.ContainsKey(e.Spot), Is.True, $"{p.Def}: {e.Spot}");
            // a tile in the place's own metres, as the plan has it
            var plan = PlacePlan.Build(map);
            Assert.That(PlacePlan.TileCentre(map, 12, 7), Is.EqualTo(plan.Centre(12, 7)));
        }

        [Test]
        public void EachPersonWearsABodyOfTheirSexAndNearestAge()
        {
            Assert.That(Routine.Male(Registry.Npcs["npc_sh_01"].Look), Is.False, "the sheriff, narrow");
            Assert.That(Routine.Male(Registry.Npcs["npc_sh_04"].Look), Is.True, "the factor, broad");
            Assert.That(Routine.Male(Registry.Npcs["npc_sh_20"].Look), Is.True, "a beard says a man, whatever the frame");
            var bodies = new List<CastBody>
            {
                new() { Id = "f30", Male = false, Age = 30 }, new() { Id = "f50", Male = false, Age = 50 },
                new() { Id = "m25", Male = true, Age = 25 }, new() { Id = "m60", Male = true, Age = 60 },
            };
            var people = new List<(string, bool, double, string)> { ("a", false, 48, "guard"), ("b", false, 47, "trader"), ("c", true, 70, "elder"), ("d", true, 66, "elder"), ("e", false, 20, "") };
            var got = Routine.Assign(people, bodies);
            Assert.That(got["a"], Is.EqualTo("f50"), "nearest age");
            Assert.That(got["b"], Is.EqualTo("f30"), "the nearest one left");
            Assert.That(got["c"], Is.EqualTo("m60"));
            Assert.That(got["d"], Is.EqualTo("m25"), "the one left of that sex");
            Assert.That(got["e"], Is.EqualTo("f30"), "then again, the nearest age");
        }
    }
}
