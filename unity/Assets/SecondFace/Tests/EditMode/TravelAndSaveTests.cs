using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Save;
using SecondFace.Core.State;
using SecondFace.Core.World;

namespace SecondFace.Tests
{
    public class TravelAndSaveTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        private static WorldMap M => Registry.WorldMap;
        private static TravelOptions Opts(System.Action<TravelOptions> f = null) { var o = new TravelOptions(); f?.Invoke(o); return o; }

        [Test]
        public void WalkingTakesDaysWithNightsVehiclesFasterOnRoadsAndStoppedByMountains()
        {
            var road = M.Routes.First(r => r.A == "tollhouse" && r.B == "ninebridge");
            var foot = Travel.OverlandHours(M, road, "foot").Value; var car = Travel.OverlandHours(M, road, "vehicle").Value;
            Assert.That(Travel.RouteKm(M, road), Is.GreaterThan(100));
            Assert.That(foot, Is.GreaterThan(24));
            Assert.That(car, Is.LessThan(foot / 4));
            var pass = M.Routes.First(r => r.Terrain == "mountain");
            Assert.That(Travel.OverlandHours(M, pass, "vehicle"), Is.Null);
        }

        [Test]
        public void TimetablesWaitForTheNextDeparture()
        {
            var line = M.Networks["net_line"];
            Assert.That(Travel.WaitForDeparture(line, 7), Is.EqualTo(0));
            Assert.That(Travel.WaitForDeparture(line, 8), Is.EqualTo(23));
            Assert.That(Travel.WaitForDeparture(line, 5), Is.EqualTo(2));
        }

        [Test]
        public void PlansOnFootByDefaultAndUsesNetworksWhenQuicker()
        {
            var walk = Travel.PlanTrip(M, "shale", "meridian", Opts());
            Assert.That(walk.Legs.All(l => l.Mode == "foot"), Is.True);
            var ride = Travel.PlanTrip(M, "shale", "meridian", Opts(o => o.Networks.Add("net_caravan")));
            Assert.That(ride.Hours, Is.LessThanOrEqualTo(walk.Hours));
            var bike = Travel.PlanTrip(M, "shale", "meridian", Opts(o => o.Modes.Add("vehicle")));
            Assert.That(bike.Hours, Is.LessThan(walk.Hours / 3));
        }

        [Test]
        public void FastTravelOnlyOnNetworksYouCanRideCostsMoneyAndTakesTime()
        {
            Assert.That(Travel.FastTravel(M, "shale", "meridian", Opts()), Is.Null);
            var t = Travel.FastTravel(M, "shale", "meridian", Opts(o => o.Networks.Add("net_caravan")));
            Assert.That(t.Fast, Is.True);
            Assert.That(t.Fare, Is.GreaterThan(0));
            Assert.That(t.Hours, Is.GreaterThan(24));
            Assert.That(Travel.FastTravel(M, "meridian", "cistern9", Opts(o => o.Networks.AddRange(new[] { "net_caravan", "net_line", "net_barge" }))), Is.Null);
        }

        [Test]
        public void HiddenPlacesAreOffThePlannerUntilKnown()
        {
            Assert.That(Travel.PlanTrip(M, "shale", "lm_sallow_01", Opts()), Is.Null);
            Assert.That(Travel.PlanTrip(M, "shale", "lm_sallow_01", Opts(o => o.Known = id => id == "lm_sallow_01")), Is.Not.Null);
        }

        [Test]
        public void WalkingDiscoversMoreThanDriving()
        {
            TripLeg Leg(string by) => new TripLeg { From = "shale", To = "drywells", Mode = by, Hours = 1 };
            Assert.That(Travel.DiscoveriesAlong(M, Leg("foot"), _ => 0.1).Count, Is.GreaterThan(Travel.DiscoveriesAlong(M, Leg("vehicle"), _ => 0.1).Count));
        }

        [Test]
        public void MovingCampsStandAtTheirStopByDay()
        {
            var wheel = M.Locations.Values.FirstOrDefault(l => l.Moves != null);
            Assert.That(wheel, Is.Not.Null);
            var near1 = Travel.PlaceMoving(M, 0)[wheel.Id];
            var (x1, y1) = (wheel.X, wheel.Y);
            Travel.PlaceMoving(M, wheel.Moves.Days * 1);
            Assert.That((wheel.X, wheel.Y), Is.Not.EqualTo((x1, y1)));
            Travel.PlaceMoving(M, wheel.Moves.Days * wheel.Moves.Route.Count);
            Assert.That((wheel.X, wheel.Y), Is.EqualTo((x1, y1)));
            Assert.That(near1, Is.Not.Null);
        }

        [Test]
        public async Task SavesRoundTripStateAndListSlots()
        {
            var sm = new SaveManager(new MemoryBackend());
            var st = States.NewGame("dev_yard", 3, 4);
            st.SetFlag("test", 5);
            st.World.Knowledge.Add("k");
            st.World.Quests["q"] = new QuestState { Stage = "s", Status = "active", StartedAt = 1, Log = { "a" } };
            await sm.Write("slot1", new SaveMeta { Label = "x", LocationId = "dev_yard", LocationName = "Yard", Minutes = st.Minutes, PlaytimeSec = 1 }, st);
            var back = await sm.Read("slot1");
            Assert.That(JToken.DeepEquals(JToken.FromObject(back.State, Newtonsoft.Json.JsonSerializer.Create(SaveManager.Json)), JToken.FromObject(st, Newtonsoft.Json.JsonSerializer.Create(SaveManager.Json))), Is.True);
            Assert.That(back.State.FlagNumber("test"), Is.EqualTo(5));
            Assert.That(back.State.World.Knowledge, Does.Contain("k"));
            Assert.That((await sm.List()).Keys, Is.EqualTo(new[] { "slot1" }));
            Assert.That((await sm.Latest()).Slot, Is.EqualTo("slot1"));
        }

        [Test]
        public async Task SavesKeepTheWorldSpotAndSettingsSitBesideTheSlots()
        {
            var backend = new MemoryBackend();
            var sm = new SaveManager(backend);
            var st = States.NewGame("shale", 0, 0);
            Assert.That(st.Spot, Is.Null, "a new game starts at the place's spawn");
            st.Spot = new WorldSpot { X = 12.5f, Y = 3.25f, Z = -40f, Yaw = 90f, CamYaw = 110f, CamPitch = 50f, CamDistance = 18f };
            await sm.Write("quick", new SaveMeta { Label = "Ash", LocationId = "shale", LocationName = "Shale", Minutes = st.Minutes }, st);
            var back = await sm.Read("quick");
            Assert.That(back.State.Spot.X, Is.EqualTo(12.5f));
            Assert.That(back.State.Spot.CamDistance, Is.EqualTo(18f));
            // the settings are kept in the same place under their own key, and are not a slot
            var set = new Settings { TextScale = 1.3f, HighContrast = true, Difficulty = "story", TurnSpeed = 1.5f, InvertTurn = true };
            await set.Store(backend);
            Assert.That((await sm.List()).Keys, Is.EqualTo(new[] { "quick" }));
            var read = await Settings.Load(backend);
            Assert.That(read.TextScale, Is.EqualTo(1.3f));
            Assert.That(read.HighContrast && read.InvertTurn, Is.True);
            Assert.That(read.Mods, Is.EqualTo((-15, 0.6)));
            Assert.That(read.TurnSpeed, Is.EqualTo(1.5f));
        }

        [Test]
        public void SettingsReadAnythingAsSomethingInRange()
        {
            var d = new Settings();
            Assert.That(Settings.Parse(null).ToJson(), Is.EqualTo(d.ToJson()));
            Assert.That(Settings.Parse("not json").ToJson(), Is.EqualTo(d.ToJson()));
            Assert.That(Settings.Parse("[1,2]").ToJson(), Is.EqualTo(d.ToJson()));
            var s = Settings.Parse("{\"textScale\": 1.2, \"turnSpeed\": 9, \"difficulty\": \"nightmare\", \"combatSpeed\": 1.4, \"future\": true}");
            Assert.That(s.TextScale, Is.EqualTo(1.15f), "the nearest offered size");
            Assert.That(s.TurnSpeed, Is.EqualTo(2f), "clamped");
            Assert.That(s.Difficulty, Is.EqualTo("normal"));
            Assert.That(s.CombatSpeed, Is.EqualTo(1.5f));
            Assert.That(Settings.DifficultyMods("hard"), Is.EqualTo((8, 1.25)));
        }

        [Test]
        public void SavesRejectGarbageAndFutureVersions()
        {
            Assert.Throws<InvalidDataException>(() => SaveManager.Parse("nope"));
            Assert.That(Assert.Throws<InvalidDataException>(() => SaveManager.Parse("{\"Version\":" + (Migrations.CurrentVersion + 1) + "}")).Message, Does.Contain("newer"));
            var s = JObject.Parse("{\"Version\":" + Migrations.CurrentVersion + ",\"a\":1}");
            Assert.That(JToken.DeepEquals(Migrations.Migrate(s), s), Is.True);
        }

        [Test]
        public void WorldMapContentDeserialisesStrictly()
        {
            var db = ContentFixture.Db();
            var m = db.Table("world_map").ToObject<WorldMap>(Registry.Strict);
            Assert.That(m.Locations.Count, Is.GreaterThan(20));
            Assert.That(m.Routes.Count, Is.GreaterThan(20));
            Assert.That(m.Networks.Count, Is.GreaterThan(2));
            Assert.That(Registry.Table<RegionDef>(db, "regions", true).Count, Is.EqualTo(8));
        }
    }
}
