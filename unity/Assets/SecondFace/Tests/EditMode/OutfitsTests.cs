using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using NUnit.Framework;
using SecondFace.Core.Content;
using SecondFace.Core.Npc;

namespace SecondFace.Tests
{
    public class OutfitsTests
    {
        [SetUp] public void Load() => ContentFixture.Db();

        [Test]
        public void DressesEveryRoleAndFitCompletelyFromCataloguedGarments()
        {
            foreach (var role in Outfits.Roles)
                foreach (var fit in new[] { "m", "f" })
                    for (var seed = 1; seed <= 40; seed++)
                    {
                        var o = Outfits.DressFor(seed, role, fit);
                        var slots = o.Layers.Select(g => Garments.Def(g.Name)?.Slot).ToList();
                        Assert.That(slots, Does.Not.Contain(null), $"{role}/{fit}/{seed}");
                        Assert.That(slots, Does.Contain("feet"));
                        Assert.That(slots.Contains("full") || (slots.Contains("top") && slots.Contains("legs")), Is.True, $"{role}/{fit}/{seed} {string.Join(",", slots)}");
                        foreach (var g in o.Layers) Assert.That(new[] { "u", fit }, Does.Contain(Garments.Def(g.Name).Fit));
                        Assert.That(new HashSet<string>(slots).Count, Is.EqualTo(slots.Count));
                    }
        }

        [Test]
        public void IsDeterministicPerSeedAndVariesAcrossSeeds()
        {
            Assert.That(JsonConvert.SerializeObject(Outfits.DressFor(7, "raider", "m")), Is.EqualTo(JsonConvert.SerializeObject(Outfits.DressFor(7, "raider", "m"))));
            var looks = new HashSet<string>();
            for (var i = 0; i < 30; i++) looks.Add(JsonConvert.SerializeObject(Outfits.DressFor(i, "settler", "f").Layers));
            Assert.That(looks.Count, Is.GreaterThan(25));
        }

        [Test]
        public void GildedPeopleAreCleanDriftersAreFilthy()
        {
            for (var s = 0; s < 20; s++)
            {
                Assert.That(Outfits.DressFor(s, "gilded", "f").Grime, Is.EqualTo(0));
                Assert.That(Outfits.DressFor(s, "drifter", "m").Grime, Is.GreaterThan(0.6));
            }
        }

        [Test]
        public void HelmetsHideHairCapsCropIt()
        {
            Assert.That(Outfits.HairMode(new Outfit { Layers = new List<GarmentLook> { new GarmentLook { Name = "mindfront_sherpa_hat" } } }), Is.EqualTo("hide"));   // a fur hat over the ears (the hoods are retired: they hid the face)
            Assert.That(Outfits.HairMode(new Outfit { Layers = new List<GarmentLook> { new GarmentLook { Name = "jujube_newsboy_cap" }, new GarmentLook { Name = "cortu_cargo_pants" } } }), Is.EqualTo("crop"));
            Assert.That(Outfits.HairMode(new Outfit { Layers = new List<GarmentLook> { new GarmentLook { Name = "cortu_cargo_pants" } } }), Is.Null);
            Assert.That(Outfits.HairMode(new Outfit { Gear = new List<GearLook> { new GearLook { Kind = "headwrap" } } }), Is.EqualTo("hide"));
        }

        [Test]
        public void FactionLooksAddAMarkerPieceAndRecolourAndGearNeverDoublesUpARegion()
        {
            var marked = 0;
            var markerColor = Registry.FactionLooks["rust_dogs"].Marker.Color;
            for (var s = 0; s < 30; s++)
            {
                var o = Outfits.DressFor(s, "raider", "m", "rust_dogs");
                if (o.Gear.Any(g => g.Kind == "armband" && g.Color == markerColor)) marked++;
                var regions = o.Gear.Select(g => g.Kind == "goggles_up" ? "goggles" : g.Kind == "respirator" ? "bandana" : g.Kind).ToList();
                Assert.That(new HashSet<string>(regions).Count, Is.EqualTo(regions.Count));
            }
            Assert.That(marked, Is.GreaterThan(12));
        }

        [Test]
        public void TheCatalogueAndRolesDeserialiseStrictly()
        {
            var db = ContentFixture.Db();
            var garments = Registry.Table<GarmentDef>(db, "garments", strict: true);
            Assert.That(garments.Count, Is.GreaterThan(85), "the catalogue less the retired pieces (P4.14: nothing that hides a face)");
            foreach (var g in garments.Values) Assert.That(Garments.Slots, Does.Contain(g.Slot));
            var roles = ((Newtonsoft.Json.Linq.JObject)db.Table("outfits"))["roles"].ToObject<Dictionary<string, RoleDef>>(Registry.Strict);
            Assert.That(roles.Keys, Is.EquivalentTo(Outfits.Roles));
            var looks = ((Newtonsoft.Json.Linq.JObject)db.Table("outfits"))["factions"].ToObject<Dictionary<string, FactionLook>>(Registry.Strict);
            Assert.That(looks.Count, Is.GreaterThan(10));
        }
    }
}
