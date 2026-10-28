using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core;
using SecondFace.Core.Content;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class RoadsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static TripLeg Leg(string from, string to, double risk = 0.5) => new TripLeg { From = from, To = to, Mode = "foot", Hours = 20, Risk = risk };

        [Test]
        public void EncountersFitThePlaceTheHourAndWhatHasBeenDone()
        {
            var g = States.NewGame("c9", 0, 0);
            g.Minutes = 10 * 1440 + 12 * 60;
            List<string> Ids() => Roads.Eligible(g, Registry.WorldMap, Leg("shale", "drywells"), Registry.RoadEncounters).Select(e => e.Id).ToList();
            Assert.That(Ids(), Does.Contain("re_salt_wind"));
            Assert.That(Ids(), Does.Contain("re_kite"));
            Assert.That(Ids(), Does.Not.Contain("re_patrol"));
            Assert.That(Ids(), Does.Not.Contain("re_scouts"));
            Assert.That(Ids(), Does.Not.Contain("re_walker"));
            g.SetFlag("th_passed", true); g.World.Knowledge.Add("overpass_dogs");
            Assert.That(Ids(), Does.Contain("re_patrol"));
            Assert.That(Ids(), Does.Contain("re_scouts"));
            g.SetFlag("ch1_done", true);
            Assert.That(Ids(), Does.Not.Contain("re_walker"));
            g.Minutes = 10 * 1440 + 23 * 60;
            Assert.That(Ids(), Does.Contain("re_walker"));
            Assert.That(Ids(), Does.Not.Contain("re_kite"));
            g.World.RoadSeen.Add("re_walker");
            Assert.That(Ids(), Does.Not.Contain("re_walker"));
        }

        [Test]
        public void RollsAgainstTheLegsRiskAndPicksByWeight()
        {
            var g = States.NewGame("c9", 0, 0);
            g.Minutes = 10 * 1440 + 12 * 60;
            Assert.That(Roads.Roll(g, Registry.WorldMap, Leg("shale", "drywells", 0), Registry.RoadEncounters, new Rng(1)), Is.Null);
            var picks = new HashSet<string>();
            var rng = new Rng(7);
            for (int i = 0; i < 200; i++) { var e = Roads.Roll(g, Registry.WorldMap, Leg("shale", "drywells", 1), Registry.RoadEncounters, rng); if (e != null) picks.Add(e.Id); }
            Assert.That(picks.Count, Is.GreaterThan(3));
            foreach (var id in picks) Assert.That(Registry.RoadEncounters.ContainsKey(id), Is.True);
        }

        [Test]
        public void EveryEncounterWithAMapNamesSpotsTheRoadsideMapsHaveAndADialogue()
        {
            var db = ContentFixture.Db();
            foreach (var e in Registry.RoadEncounters.Values)
            {
                if (e.Map == null) { Assert.That(string.IsNullOrEmpty(e.Text), Is.False, e.Id); continue; }
                var m = db.Entry("maps", e.Map);
                Assert.That(m, Is.Not.Null, $"{e.Id}: map {e.Map}");
                Assert.That(Registry.Dialogues.ContainsKey(e.Dialogue), Is.True, $"{e.Id}: dialogue");
                foreach (var n in e.Npcs ?? new List<EncounterNpc>())
                {
                    Assert.That(db.Entry("npcs", n.Def), Is.Not.Null, $"{e.Id}: npc {n.Def}");
                    Assert.That(m["spots"]?[n.Spot], Is.Not.Null, $"{e.Id}: spot {n.Spot}");
                }
            }
        }

        [Test]
        public void AHiddenPlaceNearTheWayIsFoundWithEnoughSurvival()
        {
            var g = States.NewGame("c9", 0, 0);
            bool Unknown(string _) => false;
            g.Pc.Sheet.SkillBought["survival"] = 0;
            foreach (var k in Rules.Attributes) g.Pc.Sheet.BaseAttrs[k] = 1;
            var low = Roads.DiscoveriesOnLeg(g, Registry.WorldMap, Leg("shale", "cistern9"), Unknown);
            g.Pc.Sheet.SkillBought["survival"] = 90;
            var high = Roads.DiscoveriesOnLeg(g, Registry.WorldMap, Leg("shale", "cistern9"), Unknown);
            Assert.That(high.Select(d => d.Id), Does.Contain("lm_sallow_01"));
            Assert.That(low.Select(d => d.Id), Does.Not.Contain("lm_sallow_01"));
            Assert.That(high[0].Km, Is.GreaterThan(10));
            Assert.That(Roads.DiscoveriesOnLeg(g, Registry.WorldMap, Leg("shale", "cistern9"), id => id == "lm_sallow_01").Select(d => d.Id), Does.Not.Contain("lm_sallow_01"));
            Assert.That(Roads.DiscoveriesOnLeg(g, Registry.WorldMap, Leg("tollhouse", "signalhill"), Unknown).Select(d => d.Id), Does.Not.Contain("lm_sallow_01"));
        }

        [Test]
        public void HuntingAndTrapsFollowSurvivalAndTime()
        {
            var s = Sheet.Empty();
            s.SkillBought["survival"] = 60;
            var o = Hunting.Hunt(s, 0.8, new Rng(3), 6);
            Assert.That(o.Meat, Is.GreaterThan(0));
            s.SkillBought["survival"] = 0;
            foreach (var k in Rules.Attributes) s.BaseAttrs[k] = 1;
            Assert.That(Hunting.Hunt(s, 0.1, new Rng(3), 12).Meat, Is.EqualTo(0));
            var line = new TrapLine { MapId = "m", SetAt = 0, Count = 3 };
            Assert.That(Hunting.TrapYield(line, 60 * 4, 1, s), Is.EqualTo(0));
            Assert.That(Hunting.TrapYield(line, 60 * 30, 1, s), Is.GreaterThan(0));
        }
    }
}
