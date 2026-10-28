using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.State;
using SecondFace.Core.Stats;
using SecondFace.Core.World;
using static SecondFace.Core.World.Logic;

namespace SecondFace.Tests
{
    public class WorldTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void NewsReachesNeighboursAfterTravelTimeAndMaskedDeedsDoNotStick()
        {
            var g = States.NewGame("x", 0, 0);
            Apply(Fx("[{\"news\":{\"tag\":\"saved_deputy\",\"valence\":60,\"size\":9,\"at\":\"shale\"}}]"), g);
            Assert.That(Frontier.Standing(g, "shale"), Is.GreaterThan(0));
            Frontier.SpreadNews(g, Registry.Settlements);
            Assert.That(Frontier.Standing(g, "ninebridge"), Is.EqualTo(0));
            g.Minutes += 1440 * 20;
            Frontier.SpreadNews(g, Registry.Settlements);
            Assert.That(Test(J("{\"heard\":{\"settlement\":\"tollhouse\",\"tag\":\"saved_deputy\"}}"), g), Is.True);
            g.World.Masked = true;
            Apply(Fx("[{\"news\":{\"tag\":\"robbed_caravan\",\"valence\":-80,\"size\":8,\"at\":\"shale\"}}]"), g);
            Assert.That(g.World.News[1].About, Is.EqualTo("masked"));
        }

        [Test]
        public void LeadsBoardLinksTheRightCluesAndWrongLinksCostOnlyTime()
        {
            var g = States.NewGame("x", 0, 0);
            Apply(Fx("[{\"lead\":\"l_walked_west\"},{\"lead\":\"l_sealed_wound\"},{\"lead\":\"l_sigil\"}]"), g);
            var t0 = g.Minutes;
            Assert.That(Frontier.TryConclude(g, new[] { "l_walked_west", "l_sigil" }, Registry.Conclusions), Is.Null);
            Assert.That(g.Minutes, Is.EqualTo(t0 + 10));
            Assert.That(Frontier.TryConclude(g, new[] { "l_walked_west", "l_sealed_wound" }, Registry.Conclusions)?.Id, Is.EqualTo("c_from_a_city"));
            Assert.That(Test(J("{\"concluded\":\"c_from_a_city\"}"), g), Is.True);
        }

        [Test]
        public void ScheduledWorldEventsHappenOnTimeUnlessPrevented()
        {
            var ev = new Dictionary<string, WorldEventDef>
            {
                ["raid"] = new WorldEventDef { Id = "raid", At = new EventAt { Day = 2, Hour = 6 }, PreventedIf = J("{\"flag\":\"warned\"}"), Effects = Fx("[{\"set\":\"shale_burned\"}]"), PreventedEffects = Fx("[{\"set\":\"raid_repelled\"}]") },
            };
            var g = States.NewGame("x", 0, 0);
            Assert.That(Frontier.RunWorldEvents(g, ev), Is.Empty);
            g.Minutes = 1440 + 6 * 60;
            Assert.That(Frontier.RunWorldEvents(g, ev), Is.EqualTo(new[] { "raid" }));
            Assert.That(g.FlagTruthy("shale_burned"), Is.True);
            var h = States.NewGame("x", 0, 0);
            h.SetFlag("warned", true); h.Minutes = 1440 * 3;
            Frontier.RunWorldEvents(h, ev);
            Assert.That(h.FlagTruthy("raid_repelled"), Is.True);
            Assert.That(Test(J("{\"event\":\"raid\",\"is\":\"prevented\"}"), h), Is.True);
        }

        [Test]
        public void EventsThatWaitForThePlayerNeverResolveBehindTheirBack()
        {
            var ev = new Dictionary<string, WorldEventDef>
            {
                ["visit"] = new WorldEventDef { Id = "visit", At = new EventAt { Hour = 9, Where = "shale" }, Effects = Fx("[{\"set\":\"visited\"}]") },
            };
            var g = States.NewGame("cistern9", 0, 0);
            g.Minutes = 10 * 60;
            Frontier.RunWorldEvents(g, ev);
            g.Minutes += 1440 * 5;
            Assert.That(Frontier.RunWorldEvents(g, ev), Is.Empty);
            g.LocationId = "shale";
            Assert.That(Frontier.RunWorldEvents(g, ev), Is.EqualTo(new[] { "visit" }));
        }

        [Test]
        public void JoiningGrantsRankPerksThatAccumulateUpTheLadder()
        {
            var g = States.NewGame("x", 0, 0);
            var F = Registry.Factions;
            var baseSkill = Sheet.Skill(g.Pc.Sheet, "firearms");
            Factions.Enlist(g, F, "shale_militia"); Factions.SyncMembership(g, F);
            Assert.That(Factions.IsMember(g, F, "shale_militia"), Is.True);
            Assert.That(Factions.IsMember(g, F, "shale_militia", "deputy"), Is.False);
            Assert.That(Factions.HasAccess(g, F, "shale_armoury"), Is.True);
            Assert.That(Factions.FactionPriceMul(g, F, "shale_militia"), Is.EqualTo(0.95));
            Factions.SetRank(g, F, "shale_militia", "hand"); Factions.SyncMembership(g, F);
            Assert.That(Sheet.Skill(g.Pc.Sheet, "firearms"), Is.EqualTo(baseSkill + 5));
            Assert.That(Sheet.HasFlag(g.Pc.Sheet, "militia_authority"), Is.True);
            Assert.That(Sheet.HasFlag(g.Pc.Sheet, "frontier_justice"), Is.True);
            Assert.That(Factions.FactionPriceMul(g, F, "shale_militia"), Is.EqualTo(0.9));
        }

        [Test]
        public void ConflictingMembershipsExpelEachOtherGangsAreOneAtATimeCoversDoNot()
        {
            var g = States.NewGame("x", 0, 0);
            var F = Registry.Factions;
            Factions.Enlist(g, F, "shale_militia");
            Assert.That(Factions.Enlist(g, F, "rust_dogs"), Is.EqualTo(new[] { "shale_militia" }));
            Assert.That(g.World.MembershipOf["shale_militia"].Status, Is.EqualTo("expelled"));
            Assert.That(Test(J("{\"member\":\"shale_militia\",\"status\":\"expelled\"}"), g), Is.True);
            Factions.Enlist(g, F, "gilt");
            Assert.That(Factions.Enlist(g, F, "pale"), Is.EqualTo(new[] { "gilt" }));
            var h = States.NewGame("x", 0, 0);
            Factions.Enlist(h, F, "shale_militia");
            Assert.That(Factions.Enlist(h, F, "rust_dogs", null, "shale_militia"), Is.Empty);
            Assert.That(Factions.IsMember(h, F, "shale_militia"), Is.True);
            Factions.SyncMembership(h, F);
            Assert.That(Factions.HasAccess(h, F, "overpass_gate"), Is.True);
            Assert.That(h.Pc.Sheet.FactionFlags, Does.Not.Contain("dog_safe_passage"));
        }

        [Test]
        public void DialogueEffectsAndConditionsDriveMembership()
        {
            var g = States.NewGame("x", 0, 0);
            Apply(Fx("[{\"enlist\":\"tollmen\"}]"), g);
            Assert.That(Test(J("{\"member\":\"tollmen\"}"), g), Is.True);
            Apply(Fx("[{\"promote\":{\"faction\":\"tollmen\",\"rank\":\"factor\"}}]"), g);
            Assert.That(Test(J("{\"member\":\"tollmen\",\"rank\":\"hand\"}"), g), Is.True);
            Assert.That(Sheet.HasFlag(g.Pc.Sheet, "futures_access"), Is.True);
            Apply(Fx("[{\"enlist\":\"choir\"}]"), g);
            Assert.That(Test(J("{\"member\":\"tollmen\"}"), g), Is.False);
            Assert.That(g.World.Decisions.Any(d => d.Id.StartsWith("expelled_tollmen")), Is.True);
            Assert.That(Sheet.HasFlag(g.Pc.Sheet, "futures_access"), Is.False);
            Assert.That(Factions.Expel(g, "choir", "left"), Is.True);
            Assert.That(Test(J("{\"member\":\"choir\",\"status\":\"left\"}"), g), Is.True);
        }

        [Test]
        public void FlagsItemsTimersAndChromeConditions()
        {
            var g = States.NewGame("dev_yard", 1, 1);
            Apply(Fx("[{\"set\":\"met_mags\"},{\"set\":\"debt\",\"value\":40},{\"inc\":\"debt\",\"by\":5},{\"give\":\"a_9mm\",\"count\":3},{\"xp\":10},{\"after\":{\"minutes\":30,\"id\":\"t\",\"effects\":[{\"set\":\"later\"}]}}]"), g);
            Assert.That(Test(J("{\"flag\":\"met_mags\"}"), g), Is.True);
            Assert.That(Test(J("{\"flag\":\"debt\",\"gte\":45,\"lte\":45}"), g), Is.True);
            Assert.That(Test(J("{\"flag\":\"debt\",\"eq\":45}"), g), Is.True);
            Assert.That(Test(J("{\"flag\":\"debt\",\"eq\":\"45\"}"), g), Is.False);
            Assert.That(Test(J("{\"item\":\"a_9mm\",\"count\":3}"), g), Is.True);
            Assert.That(Test(J("{\"not\":{\"item\":\"a_9mm\",\"count\":4}}"), g), Is.True);
            Assert.That(g.Pc.Sheet.Xp, Is.EqualTo(10));
            Assert.That(RunTimers(g), Is.EqualTo(0));
            g.Minutes += 30;
            Assert.That(RunTimers(g), Is.EqualTo(1));
            Assert.That(g.FlagTruthy("later"), Is.True);
            Assert.That(Test(J("{\"chromeSlot\":\"eyes\"}"), g), Is.False);
            Chrome.Install(g.Pc.Sheet, "ch_eye_heat", 0, 100, 5, 0.99);
            g.Pc.Sheet.Drift = 40;
            Assert.That(Test(J("{\"chrome\":\"ch_eye_heat\"}"), g), Is.True);
            Assert.That(Test(J("{\"chromeSlot\":\"eyes\"}"), g), Is.True);
            Assert.That(Test(J("{\"drift\":{\"gte\":25,\"lte\":49}}"), g), Is.True);
            Assert.That(Test(J("{\"hour\":{\"from\":8,\"to\":9}}"), g), Is.True);
        }

        [Test]
        public void LettersScheduleTheirReplies()
        {
            var g = States.NewGame("x", 0, 0);
            var def = new LetterDef { Id = "l1", To = "npc_a", Topic = "news", Text = "…", Days = 3, Reply = new LetterReply { Text = "Reply.", Effects = Fx("[{\"set\":\"replied\"}]") } };
            var defs = new Dictionary<string, LetterDef> { ["l1"] = def };
            Assert.That(Letters.Available(g, defs), Is.Empty);
            g.World.MetPeople["npc_a"] = new Met { Name = "A", Day = 1 };
            Assert.That(Letters.Available(g, defs).Count, Is.EqualTo(1));
            Letters.Send(g, def);
            Assert.That(Letters.UnreadPost(g), Is.EqualTo(0));
            g.Minutes += 3 * 1440;
            RunTimers(g);
            Assert.That(Letters.UnreadPost(g), Is.EqualTo(1));
            Assert.That(g.FlagTruthy("replied"), Is.True);
        }

        [Test]
        public void WorldContentDeserialisesStrictly()
        {
            var db = ContentFixture.Db();
            Assert.That(Registry.Table<FactionDef>(db, "factions", true).Count, Is.GreaterThan(5));
            Assert.That(Registry.Table<SettlementDef>(db, "settlements", true).Count, Is.GreaterThan(5));
            Assert.That(Registry.Table<LeadDef>(db, "leads", true).Count, Is.GreaterThan(5));
            Assert.That(Registry.Table<ConclusionDef>(db, "conclusions", true).Count, Is.GreaterThan(1));
            Assert.That(Registry.Table<WorldEventDef>(db, "world_events", true).Count, Is.GreaterThan(0));
            Assert.That(Registry.Table<LetterDef>(db, "letters", true).Count, Is.GreaterThan(0));
        }
    }
}
